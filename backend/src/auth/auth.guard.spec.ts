import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { AdminController } from '../admin/admin.controller';
import { StatusController } from '../status/status.controller';
import { AuthService } from './auth.service';
import { StatusService } from '../status/status.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';

const TEST_JWT_SECRET = 'test-jwt-secret-for-guard-integration';

describe('JwtAuthGuard (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [AdminController, StatusController],
      providers: [
        JwtAuthGuard,
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
          provide: AuthService,
          useValue: {
            changePassword: jest.fn().mockResolvedValue({ success: true }),
            me: jest.fn().mockResolvedValue({ id: 1, username: 'admin' }),
            login: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: StatusService,
          useValue: {
            getStatus: jest.fn().mockResolvedValue([]),
            getComponents: jest.fn().mockResolvedValue([]),
            getHistory: jest.fn().mockResolvedValue([]),
            getGlobalHistory: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /admin/password without auth token → HTTP 401', async () => {
    // Removing @UseGuards(JwtAuthGuard) from AdminController would break this test.
    await request(app.getHttpServer())
      .post('/admin/password')
      .send({ currentPassword: 'old', newPassword: 'newpass123' })
      .expect(401);
  });

  it('GET /health without auth token → HTTP 200 (public route, guard not applied)', async () => {
    // StatusController.getHealth has no guard; this must not be blocked by auth.
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });
});
