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
