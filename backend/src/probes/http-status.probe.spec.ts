import axios from 'axios';
import { HttpStatusProbe } from './http-status.probe';

jest.mock('axios');

describe('HttpStatusProbe', () => {
  const axiosGetMock = jest.mocked(axios.get);
  const config = { url: 'http://connect.example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns up for HTTP 200 (the only status that means up)', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: 'OK' } as any);
    const probe = new HttpStatusProbe('connect', config);
    const [result] = await probe.check();
    expect(result.status).toBe('up');
    expect(result.componentCode).toBe('connect');
  });

  it('returns down for HTTP 503', async () => {
    axiosGetMock.mockResolvedValue({ status: 503, data: '' } as any);
    const probe = new HttpStatusProbe('connect', config);
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('returns down for HTTP 4xx', async () => {
    axiosGetMock.mockResolvedValue({ status: 401, data: '' } as any);
    const probe = new HttpStatusProbe('connect', config);
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('returns down for HTTP 201 (only 200 = up by default)', async () => {
    axiosGetMock.mockResolvedValue({ status: 201, data: '' } as any);
    const probe = new HttpStatusProbe('connect', config);
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('returns down on network error', async () => {
    axiosGetMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const probe = new HttpStatusProbe('connect', config);
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('returns down on timeout', async () => {
    axiosGetMock.mockRejectedValue(new Error('timeout exceeded'));
    const probe = new HttpStatusProbe('connect', config);
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('uses expected_status when configured: matching status → up', async () => {
    axiosGetMock.mockResolvedValue({ status: 201, data: '' } as any);
    const probe = new HttpStatusProbe('connect', {
      url: 'http://connect.example.com',
      expected_status: 201,
    });
    const [result] = await probe.check();
    expect(result.status).toBe('up');
  });

  it('uses expected_status when configured: non-matching status → down', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: '' } as any);
    const probe = new HttpStatusProbe('connect', {
      url: 'http://connect.example.com',
      expected_status: 201,
    });
    const [result] = await probe.check();
    expect(result.status).toBe('down');
  });

  it('includes raw HTTP status in rawPayload', async () => {
    axiosGetMock.mockResolvedValue({ status: 200, data: 'body' } as any);
    const probe = new HttpStatusProbe('connect', config);
    const [result] = await probe.check();
    expect((result.rawPayload as any).status).toBe(200);
  });
});
