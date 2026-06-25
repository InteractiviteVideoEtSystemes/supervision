import axios from 'axios';
import { CoreApiHealthProbe } from './core-api-health.probe';

jest.mock('axios');

describe('CoreApiHealthProbe', () => {
  const axiosGetMock = jest.mocked(axios.get);
  const url = 'http://core-api.example.com/health';

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the static response cache so each test starts fresh.
    (CoreApiHealthProbe as any).responseCache.clear();
  });

  it('returns up when the configured boolean field is true', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: { isDatabaseUp: true } } as any);
    const probe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('up');
    expect(result.componentCode).toBe('database');
  });

  it('returns down when the configured boolean field is false', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: { isLdapUp: false } } as any);
    const probe = new CoreApiHealthProbe('ldap', { url, field: 'isLdapUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('returns unknown when there is no HTTP response (network error)', async () => {
    axiosGetMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const probe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when the configured field is missing from the response', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: {} } as any);
    const probe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when the field value is not a boolean (e.g. a string)', async () => {
    axiosGetMock.mockResolvedValue({
      status: 200,
      data: { isDatabaseUp: 'yes' },
    } as any);
    const probe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when the field value is a number', async () => {
    axiosGetMock.mockResolvedValue({
      status: 200,
      data: { isCtiUp: 1 },
    } as any);
    const probe = new CoreApiHealthProbe('cti', { url, field: 'isCtiUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('unknown');
  });

  it('derives multiple component statuses from a single HTTP call (shared cache)', async () => {
    axiosGetMock.mockResolvedValue({
      status: 200,
      data: { isDatabaseUp: true, isLdapUp: false, isStatisticsUp: true },
    } as any);

    const dbProbe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const ldapProbe = new CoreApiHealthProbe('ldap', { url, field: 'isLdapUp' });
    const statsProbe = new CoreApiHealthProbe('statistics', { url, field: 'isStatisticsUp' });

    const [dbResult] = await dbProbe.check();
    const [ldapResult] = await ldapProbe.check();
    const [statsResult] = await statsProbe.check();

    expect(dbResult.status).toBe('up');
    expect(ldapResult.status).toBe('down');
    expect(statsResult.status).toBe('up');

    // All three components resolved from a single HTTP call.
    expect(axiosGetMock).toHaveBeenCalledTimes(1);
  });

  it('treats a 503 response as having received a response (hasResponse=true)', async () => {
    // The probe receives the body but field may be missing → unknown (not down).
    axiosGetMock.mockResolvedValue({ status: 503, data: {} } as any);
    const probe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const [result] = await probe.check();
    // Body is `{}`, field is missing → unknown (not down, because we got a response)
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when the body is null', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: null } as any);
    const probe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('unknown');
  });

  it('returns unknown when the body is a plain string', async () => {
    axiosGetMock.mockResolvedValue({ status: 503, data: 'Service Unavailable' } as any);
    const probe = new CoreApiHealthProbe('database', { url, field: 'isDatabaseUp' });
    const [result] = await probe.check();
    expect(result.status).toBe('unknown');
  });
});
