import { EvaluatorService } from './evaluator.service';
import { Component, ComponentCriticality } from '../entities/component.entity';
import { ComponentStatus } from '../probes/probe.interface';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeComponent(code: string, criticality: ComponentCriticality): Component {
  return {
    id: Math.floor(Math.random() * 1000),
    code,
    criticality,
    label: code,
    environmentId: 1,
    enabled: true,
    probeType: 'http-reachable',
    probeConfig: {},
    intervalSeconds: 60,
    environment: {} as any,
    statusHistory: [],
  };
}

function makeService(
  mockComponentRepo: object = {},
  mockStatusHistoryRepo: object = {},
  mockGlobalStatusHistoryRepo: object = {},
): EvaluatorService {
  return new EvaluatorService(
    mockComponentRepo as any,
    mockStatusHistoryRepo as any,
    mockGlobalStatusHistoryRepo as any,
    {} as any, // StatusService — not needed for these unit tests
    {} as any, // StatusGateway — not needed for these unit tests
  );
}

// ─── computeGlobalStatus (pure function) ────────────────────────────────────

describe('EvaluatorService.computeGlobalStatus', () => {
  const service = makeService();

  it('returns green when all components are up', () => {
    const components = [
      makeComponent('core_api', 'critical'),
      makeComponent('database', 'critical'),
      makeComponent('connect', 'degraded'),
    ];
    const statuses = new Map<string, ComponentStatus>([
      ['core_api', 'up'],
      ['database', 'up'],
      ['connect', 'up'],
    ]);
    expect(service.computeGlobalStatus(components, statuses)).toBe('green');
  });

  it('returns red when a critical component is down', () => {
    const components = [
      makeComponent('database', 'critical'),
      makeComponent('connect', 'degraded'),
    ];
    const statuses = new Map<string, ComponentStatus>([
      ['database', 'down'],
      ['connect', 'up'],
    ]);
    expect(service.computeGlobalStatus(components, statuses)).toBe('red');
  });

  it('returns red when a critical component is unknown', () => {
    const components = [makeComponent('ldap', 'critical')];
    const statuses = new Map<string, ComponentStatus>([['ldap', 'unknown']]);
    expect(service.computeGlobalStatus(components, statuses)).toBe('red');
  });

  it('returns orange when all critical are up but a degraded component is down', () => {
    const components = [
      makeComponent('core_api', 'critical'),
      makeComponent('statistics', 'degraded'),
    ];
    const statuses = new Map<string, ComponentStatus>([
      ['core_api', 'up'],
      ['statistics', 'down'],
    ]);
    expect(service.computeGlobalStatus(components, statuses)).toBe('orange');
  });

  it('returns orange when all critical are up but a degraded component is unknown', () => {
    const components = [
      makeComponent('core_api', 'critical'),
      makeComponent('video_messaging', 'degraded'),
    ];
    const statuses = new Map<string, ComponentStatus>([
      ['core_api', 'up'],
      ['video_messaging', 'unknown'],
    ]);
    expect(service.computeGlobalStatus(components, statuses)).toBe('orange');
  });

  it('red takes precedence over orange (critical down + degraded down)', () => {
    const components = [
      makeComponent('core_api', 'critical'),
      makeComponent('statistics', 'degraded'),
    ];
    const statuses = new Map<string, ComponentStatus>([
      ['core_api', 'down'],
      ['statistics', 'down'],
    ]);
    expect(service.computeGlobalStatus(components, statuses)).toBe('red');
  });

  it('returns green when there are no components', () => {
    expect(service.computeGlobalStatus([], new Map())).toBe('green');
  });

  it('returns green when there are only degraded components and all are up', () => {
    const components = [makeComponent('connect', 'degraded')];
    const statuses = new Map<string, ComponentStatus>([['connect', 'up']]);
    expect(service.computeGlobalStatus(components, statuses)).toBe('green');
  });
});

// ─── persistResult (transitions-only rule) ──────────────────────────────────

describe('EvaluatorService.persistResult', () => {
  const component = makeComponent('database', 'critical');

  function makeStatusHistoryRepo(latestStatus: string | null) {
    return {
      findOne: jest.fn().mockResolvedValue(
        latestStatus !== null ? { status: latestStatus } : null,
      ),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((data: unknown) => data),
    };
  }

  it('inserts a new row and returns true when there is no previous status', async () => {
    const repo = makeStatusHistoryRepo(null);
    const service = makeService({}, repo);
    const changed = await service.persistResult(
      { componentCode: 'database', status: 'up' },
      component,
    );
    expect(changed).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('inserts a new row and returns true when status changes', async () => {
    const repo = makeStatusHistoryRepo('up');
    const service = makeService({}, repo);
    const changed = await service.persistResult(
      { componentCode: 'database', status: 'down' },
      component,
    );
    expect(changed).toBe(true);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('skips insert and returns false when status is unchanged (same as latest)', async () => {
    const repo = makeStatusHistoryRepo('up');
    const service = makeService({}, repo);
    const changed = await service.persistResult(
      { componentCode: 'database', status: 'up' },
      component,
    );
    expect(changed).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('does not create a duplicate row for a second consecutive identical status', async () => {
    const repo = makeStatusHistoryRepo('down');
    const service = makeService({}, repo);

    const first = await service.persistResult(
      { componentCode: 'database', status: 'down' },
      component,
    );
    const second = await service.persistResult(
      { componentCode: 'database', status: 'down' },
      component,
    );

    expect(first).toBe(false);
    expect(second).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

// ─── computeAndPersistGlobal (global transitions-only rule) ─────────────────

describe('EvaluatorService.computeAndPersistGlobal', () => {
  const environmentId = 1;

  function makeRepos(
    components: Component[],
    componentLatestStatus: string | null,
    globalLatestStatus: string | null,
  ) {
    const componentRepo = {
      find: jest.fn().mockResolvedValue(components),
    };
    const statusHistoryRepo = {
      findOne: jest.fn().mockResolvedValue(
        componentLatestStatus !== null ? { status: componentLatestStatus } : null,
      ),
    };
    const globalStatusHistoryRepo = {
      findOne: jest.fn().mockResolvedValue(
        globalLatestStatus !== null ? { status: globalLatestStatus } : null,
      ),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((data: unknown) => data),
    };
    return { componentRepo, statusHistoryRepo, globalStatusHistoryRepo };
  }

  it('inserts a global status row and returns true on first run (no previous)', async () => {
    const components = [makeComponent('core_api', 'critical')];
    const { componentRepo, statusHistoryRepo, globalStatusHistoryRepo } = makeRepos(
      components,
      'up',
      null, // no previous global status
    );
    const service = makeService(componentRepo, statusHistoryRepo, globalStatusHistoryRepo);
    const changed = await service.computeAndPersistGlobal(environmentId);
    expect(changed).toBe(true);
    expect(globalStatusHistoryRepo.save).toHaveBeenCalledTimes(1);
  });

  it('skips insert and returns false when global status has not changed', async () => {
    // All critical up → global = 'green'; previous is also 'green'
    const components = [makeComponent('core_api', 'critical')];
    const { componentRepo, statusHistoryRepo, globalStatusHistoryRepo } = makeRepos(
      components,
      'up',
      'green',
    );
    const service = makeService(componentRepo, statusHistoryRepo, globalStatusHistoryRepo);
    const changed = await service.computeAndPersistGlobal(environmentId);
    expect(changed).toBe(false);
    expect(globalStatusHistoryRepo.save).not.toHaveBeenCalled();
  });

  it('inserts and returns true when global status changes (green → red)', async () => {
    // Critical component is now down → global = 'red'; previous was 'green'
    const components = [makeComponent('core_api', 'critical')];
    const { componentRepo, statusHistoryRepo, globalStatusHistoryRepo } = makeRepos(
      components,
      'down',
      'green',
    );
    const service = makeService(componentRepo, statusHistoryRepo, globalStatusHistoryRepo);
    const changed = await service.computeAndPersistGlobal(environmentId);
    expect(changed).toBe(true);
    expect(globalStatusHistoryRepo.save).toHaveBeenCalledTimes(1);
  });
});
