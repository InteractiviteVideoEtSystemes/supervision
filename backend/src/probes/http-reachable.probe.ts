import axios from 'axios';
import { Probe, ProbeConfig, ProbeResult } from './probe.interface';

export class HttpReachableProbe implements Probe {
  constructor(
    private readonly componentCode: string,
    private readonly config: ProbeConfig,
  ) {}

  async check(): Promise<ProbeResult[]> {
    try {
      const response = await axios.get(this.config.url, {
        timeout: Number(this.config.timeout_ms ?? 10000),
        validateStatus: () => true,
      });

      return [
        {
          componentCode: this.componentCode,
          status: 'up',
          rawPayload: {
            status: response.status,
            body: response.data,
          },
        },
      ];
    } catch (error) {
      return [
        {
          componentCode: this.componentCode,
          status: 'down',
          rawPayload: {
            error: error instanceof Error ? error.message : 'Request failed',
          },
        },
      ];
    }
  }
}
