import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { StatusController } from '../status/status.controller';
import { StatusService } from '../status/status.service';

const TEST_JWT_SECRET = 'test-optional-jwt-secret-for-integration';

const HISTORY_ITEM_WITH_PAYLOAD = {
  id: '1',
  status: 'up',
  changedAt: '2026-06-25T10:00:00.000Z',
  rawPayload: { httpStatus: 200, url: 'https://example.com' },
};

const HISTORY_ITEM_WITHOUT_PAYLOAD = {
  id: '1',
  status: 'up',
  changedAt: '2026-06-25T10:00:00.000Z',
};

// ─── Unit tests for handleRequest ────────────────────────────────────────────

describe('OptionalJwtAuthGuard.handleRequest', () => {
  const guard = new OptionalJwtAuthGuard();

  it('returns the user object when authentication succeeds', () => {
    const user = { sub: 1, username: 'admin' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });

  it('returns undefined (does NOT throw) when no user is present — anonymous requests must pass', () => {
    expect(guard.handleRequest(null, null)).toBeUndefined();
    expect(guard.handleRequest(null, undefined)).toBeUndefined();
  });

  it('returns undefined (does NOT throw) on an auth error — unlike JwtAuthGuard which throws', () => {
    const error = new Error('JWT expired');
    expect(() => guard.handleRequest(error, null)).not.toThrow();
    expect(guard.handleRequest(error, null)).toBeUndefined();
  });
});

// ─── Integration: GET /components/:id/history (anonymous vs. authenticated) ──

function buildMockStatusService() {
  return {
    getStatus: jest.fn().mockResolvedValue([]),
    getComponents: jest.fn().mockResolvedValue([]),
    getHistory: jest
      .fn()
      .mockImplementation(
        (_id: number, _from?: string, _to?: string, includeRawPayload = false) =>
          Promise.resolve({
            component: { id: 1, code: 'database', label: 'Database' },
            history: [
              includeRawPayload ? HISTORY_ITEM_WITH_PAYLOAD : HISTORY_ITEM_WITHOUT_PAYLOAD,
            ],
          }),
      ),
    getGlobalHistory: jest.fn().mockResolvedValue([]),
  };
}

describe('OptionalJwtAuthGuard (integration with StatusController)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockStatusService: ReturnType<typeof buildMockStatusService>;

  beforeAll(async () => {
    mockStatusService = buildMockStatusService();

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [StatusController],
      providers: [
        OptionalJwtAuthGuard,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'jwtSecret') return TEST_JWT_SECRET;
              return undefined;
            }),
          },
        },
        {
          provide: StatusService,
          useValue: mockStatusService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    jwtService = moduleRef.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('anonymous requests', () => {
    it('does NOT return HTTP 401 for anonymous GET /components/:id/history', async () => {
      await request(app.getHttpServer()).get('/components/1/history').expect(200);
    });

    it('response does NOT include rawPayload in history transitions for anonymous', async () => {
      const res = await request(app.getHttpServer())
        .get('/components/1/history')
        .expect(200);
      expect(res.body.history[0]).not.toHaveProperty('rawPayload');
    });

    it('a second anonymous call still returns no rawPayload (regression guard)', async () => {
      const res = await request(app.getHttpServer())
        .get('/components/1/history')
        .expect(200);
      expect(res.body.history[0]).not.toHaveProperty('rawPayload');
    });
  });

  describe('authenticated requests (Bearer token)', () => {
    it('returns HTTP 200 with a valid Bearer token', async () => {
      const token = await jwtService.signAsync({ sub: 1, username: 'admin' });
      await request(app.getHttpServer())
        .get('/components/1/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('response INCLUDES rawPayload for authenticated admin (Bearer)', async () => {
      const token = await jwtService.signAsync({ sub: 1, username: 'admin' });
      const res = await request(app.getHttpServer())
        .get('/components/1/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.history[0]).toHaveProperty('rawPayload');
      expect(res.body.history[0].rawPayload).toHaveProperty('httpStatus', 200);
    });

    it('does NOT accept an invalid/expired Bearer token as authenticated (still returns 200 but without rawPayload)', async () => {
      // An invalid token should be treated as anonymous by the OptionalJwtAuthGuard
      const res = await request(app.getHttpServer())
        .get('/components/1/history')
        .set('Authorization', 'Bearer this.is.not.valid')
        .expect(200);
      // Guard must not 401; it falls back to anonymous
      expect(res.body.history[0]).not.toHaveProperty('rawPayload');
    });
  });

  describe('authenticated requests (supervision_token cookie)', () => {
    it('returns HTTP 200 with a valid supervision_token cookie', async () => {
      const token = await jwtService.signAsync({ sub: 1, username: 'admin' });
      await request(app.getHttpServer())
        .get('/components/1/history')
        .set('Cookie', `supervision_token=${token}`)
        .expect(200);
    });

    it('response INCLUDES rawPayload when authenticated via supervision_token cookie', async () => {
      const token = await jwtService.signAsync({ sub: 1, username: 'admin' });
      const res = await request(app.getHttpServer())
        .get('/components/1/history')
        .set('Cookie', `supervision_token=${token}`)
        .expect(200);
      expect(res.body.history[0]).toHaveProperty('rawPayload');
    });
  });
});
