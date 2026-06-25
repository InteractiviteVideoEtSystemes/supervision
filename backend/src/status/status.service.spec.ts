import { NotFoundException } from '@nestjs/common';
import { StatusService } from './status.service';

function makeQueryBuilder(rows: object[]) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
}

describe('StatusService.getHistory — rawPayload visibility (AISB-109)', () => {
  const mockComponent = { id: 1, code: 'database', label: 'Database' };

  const historyRow = {
    id: '42',
    status: 'up' as const,
    changedAt: new Date('2026-06-25T10:00:00.000Z'),
    rawPayload: { httpStatus: 200, url: 'https://example.com' },
  };

  function makeService(componentResult: object | null, historyRows: object[]) {
    const componentRepo = {
      findOne: jest.fn().mockResolvedValue(componentResult),
    };
    const statusHistoryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(makeQueryBuilder(historyRows)),
    };
    return new StatusService(
      {} as any, // environmentRepository — not exercised here
      componentRepo as any,
      statusHistoryRepo as any,
      {} as any, // globalStatusHistoryRepository — not exercised here
    );
  }

  it('omits rawPayload from every transition when includeRawPayload=false', async () => {
    const service = makeService(mockComponent, [historyRow]);
    const result = await service.getHistory(1, undefined, undefined, false);
    expect(result.history).toHaveLength(1);
    // The field must be completely absent, not just undefined
    expect('rawPayload' in result.history[0]).toBe(false);
  });

  it('includes rawPayload in every transition when includeRawPayload=true', async () => {
    const service = makeService(mockComponent, [historyRow]);
    const result = await service.getHistory(1, undefined, undefined, true);
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toHaveProperty('rawPayload');
    expect((result.history[0] as { rawPayload: unknown }).rawPayload).toEqual(
      historyRow.rawPayload,
    );
  });

  it('defaults to excluding rawPayload when no flag argument is passed', async () => {
    const service = makeService(mockComponent, [historyRow]);
    const result = await service.getHistory(1);
    expect('rawPayload' in result.history[0]).toBe(false);
  });

  it('rawPayload toggle does NOT affect the other fields (id, status, changedAt always present)', async () => {
    const service = makeService(mockComponent, [historyRow]);
    const anon = await service.getHistory(1, undefined, undefined, false);
    const admin = await service.getHistory(1, undefined, undefined, true);

    for (const item of [anon.history[0], admin.history[0]]) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('changedAt');
    }

    // Only admin variant carries rawPayload
    expect('rawPayload' in anon.history[0]).toBe(false);
    expect('rawPayload' in admin.history[0]).toBe(true);
  });

  it('throws NotFoundException when the component does not exist', async () => {
    const service = makeService(null, []);
    await expect(service.getHistory(999)).rejects.toThrow(NotFoundException);
  });

  it('returns correct component metadata alongside the history', async () => {
    const service = makeService(mockComponent, [historyRow]);
    const result = await service.getHistory(1, undefined, undefined, false);
    expect(result.component).toEqual({ id: 1, code: 'database', label: 'Database' });
  });

  it('returns an empty history array when no rows match', async () => {
    const service = makeService(mockComponent, []);
    const result = await service.getHistory(1, undefined, undefined, true);
    expect(result.history).toHaveLength(0);
  });
});

// ─── buildStatusResponse — checkedAt derivation (AISB-120) ──────────────────

describe('StatusService.buildStatusResponse — checkedAt derivation (AISB-120)', () => {
  const ENV_ID = 42;
  const ENV_CODE = 'prod';
  const environment = { id: ENV_ID, code: ENV_CODE, label: 'Production', enabled: true };

  // OLD: a status transition that happened many days ago
  const OLD_TRANSITION = new Date('2026-06-10T08:00:00.000Z');
  // RECENT: the last probe run, more recent than the transition
  const RECENT_CHECK_A = new Date('2026-06-25T14:00:00.000Z');
  const RECENT_CHECK_B = new Date('2026-06-25T15:30:00.000Z'); // later than A

  function makeStatusServiceForGetStatus(
    components: object[],
    latestHistory: object | null,
    latestGlobal: object | null,
  ): StatusService {
    return new StatusService(
      { findOne: jest.fn().mockResolvedValue(environment) } as any,
      { find: jest.fn().mockResolvedValue(components) } as any,
      { findOne: jest.fn().mockResolvedValue(latestHistory) } as any,
      { findOne: jest.fn().mockResolvedValue(latestGlobal) } as any,
    );
  }

  it('uses MAX lastCheckedAt not lastChangedAt as checkedAt — core regression guard', async () => {
    // Component has a RECENT lastCheckedAt but an OLD status transition (changedAt).
    // checkedAt must reflect the recent poll, not the old transition.
    const components = [
      {
        id: 1,
        code: 'api',
        label: 'API',
        criticality: 'critical',
        lastCheckedAt: RECENT_CHECK_A,
        enabled: true,
      },
    ];
    const latestHistory = { status: 'up', changedAt: OLD_TRANSITION };
    const latestGlobal = { status: 'green', changedAt: OLD_TRANSITION };

    const service = makeStatusServiceForGetStatus(components, latestHistory, latestGlobal);
    const result = await service.getStatusByEnvironmentId(ENV_ID);

    // Must equal the recent poll time
    expect(result.checkedAt).toBe(RECENT_CHECK_A.toISOString());
    // Must NOT equal the old transition time — this would catch a revert to lastChangedAt
    expect(result.checkedAt).not.toBe(OLD_TRANSITION.toISOString());
  });

  it('returns the maximum lastCheckedAt across multiple components', async () => {
    const components = [
      {
        id: 1,
        code: 'api',
        label: 'API',
        criticality: 'critical',
        lastCheckedAt: RECENT_CHECK_A,
        enabled: true,
      },
      {
        id: 2,
        code: 'db',
        label: 'DB',
        criticality: 'critical',
        lastCheckedAt: RECENT_CHECK_B, // LATER — should be chosen
        enabled: true,
      },
    ];
    const latestHistory = { status: 'up', changedAt: OLD_TRANSITION };
    const latestGlobal = { status: 'green', changedAt: OLD_TRANSITION };

    const service = makeStatusServiceForGetStatus(components, latestHistory, latestGlobal);
    const result = await service.getStatusByEnvironmentId(ENV_ID);

    expect(result.checkedAt).toBe(RECENT_CHECK_B.toISOString());
    expect(result.checkedAt).not.toBe(RECENT_CHECK_A.toISOString());
  });

  it('falls back to latestGlobal.changedAt when no component has lastCheckedAt', async () => {
    const GLOBAL_TIME = new Date('2026-06-24T12:00:00.000Z');
    const components = [
      {
        id: 1,
        code: 'api',
        label: 'API',
        criticality: 'critical',
        lastCheckedAt: null, // never polled yet
        enabled: true,
      },
    ];
    const latestHistory = { status: 'up', changedAt: OLD_TRANSITION };
    const latestGlobal = { status: 'green', changedAt: GLOBAL_TIME };

    const service = makeStatusServiceForGetStatus(components, latestHistory, latestGlobal);
    const result = await service.getStatusByEnvironmentId(ENV_ID);

    expect(result.checkedAt).toBe(GLOBAL_TIME.toISOString());
  });

  it('falls back to a valid ISO timestamp ≈ now when no components and no global exist', async () => {
    const before = Date.now();
    const service = makeStatusServiceForGetStatus([], null, null);
    const result = await service.getStatusByEnvironmentId(ENV_ID);
    const after = Date.now();

    const checkedAtMs = new Date(result.checkedAt).getTime();
    expect(Number.isNaN(checkedAtMs)).toBe(false);
    expect(checkedAtMs).toBeGreaterThanOrEqual(before);
    expect(checkedAtMs).toBeLessThanOrEqual(after);
  });
});
