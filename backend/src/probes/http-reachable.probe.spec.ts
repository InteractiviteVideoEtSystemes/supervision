import axios from 'axios';
import { HttpReachableProbe } from './http-reachable.probe';

jest.mock('axios');

describe('HttpReachableProbe', () => {
  const axiosGetMock = jest.mocked(axios.get);
  const config = { url: 'http://core-api.example.com/health' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns up for HTTP 200', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: {} } as any);
    const probe = new HttpReachableProbe('core_api', config);
    const results = await probe.check();
    expect(results).toHaveLength(1);
    expect(results[0].componentCode).toBe('core_api');
    expect(results[0].status).toBe('up');
  });

  it('returns up for HTTP 503 (any HTTP response means up)', async () => {
    axiosGetMock.mockResolvedValue({ status: 503, data: 'Service Unavailable' } as any);
    const probe = new HttpReachableProbe('core_api', config);
    const [result] = await probe.check();
    expect(result.status).toBe('up');
  });

  it('returns up for HTTP 4xx', async () => {
    axiosGetMock.mockResolvedValue({ status: 404, data: 'Not Found' } as any);
    const probe = new HttpReachableProbe('core_api', config);
    const [result] = await probe.check();
    expect(result.status).toBe('up');
  });

  it('ignores isServiceApiUp=false in the response body and still returns up', async () => {
    axiosGetMock.mockResolvedValue({
      status: 200,
      data: { isServiceApiUp: false, isDatabaseUp: false },
    } as any);
    const probe = new HttpReachableProbe('core_api', config);
    const [result] = await probe.check();
    expect(result.status).toBe('up');
  });

  it('returns down on network error (no response)', async () => {
    axiosGetMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const probe = new HttpReachableProbe('core_api', config);
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('returns down on connection timeout', async () => {
    axiosGetMock.mockRejectedValue(new Error('timeout of 10000ms exceeded'));
    const probe = new HttpReachableProbe('core_api', config);
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('never returns unknown — only up or down', async () => {
    // Network error path
    axiosGetMock.mockRejectedValue(new Error('network error'));
    const probe = new HttpReachableProbe('core_api', config);
    const [errorResult] = await probe.check();
    expect(errorResult.status).not.toBe('unknown');

    // HTTP response path
    axiosGetMock.mockResolvedValue({ status: 500, data: '' } as any);
    const [responseResult] = await probe.check();
    expect(responseResult.status).not.toBe('unknown');
  });

  it('includes the raw HTTP status in rawPayload when up', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: { ok: true } } as any);
    const probe = new HttpReachableProbe('core_api', config);
    const [result] = await probe.check();
    expect((result.rawPayload as any).status).toBe(200);
  });
});
