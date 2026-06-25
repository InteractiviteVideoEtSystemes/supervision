import axios from 'axios';
import { Probe, ProbeConfig, ProbeResult } from './probe.interface';

const CACHE_TTL_MS = 5000;

type CachedResponse = {
  expiresAt: number;
  promise?: Promise<{ hasResponse: boolean; payload?: unknown }>;
  hasResponse?: boolean;
  payload?: unknown;
};

export class CoreApiHealthProbe implements Probe {
  private static readonly responseCache = new Map<string, CachedResponse>();

  constructor(
    private readonly componentCode: string,
    private readonly config: ProbeConfig,
  ) {}

  async check(): Promise<ProbeResult[]> {
    const response = await this.getCachedResponse();

    if (!response.hasResponse) {
      return [
        {
          componentCode: this.componentCode,
          status: 'unknown',
        },
      ];
    }

    const payload = response.payload;
    const rawValue =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)[String(this.config.field ?? '')]
        : undefined;

    let status: ProbeResult['status'] = 'unknown';
    if (typeof rawValue === 'boolean') {
      status = rawValue ? 'up' : 'down';
    }

    return [
      {
        componentCode: this.componentCode,
        status,
        rawPayload: payload,
      },
    ];
  }

  private async getCachedResponse(): Promise<{ hasResponse: boolean; payload?: unknown }> {
    const url = this.config.url;
    const now = Date.now();
    const cached = CoreApiHealthProbe.responseCache.get(url);

    if (cached && cached.expiresAt > now) {
      if (cached.promise) {
        return cached.promise;
      }

      return {
        hasResponse: cached.hasResponse ?? false,
        payload: cached.payload,
      };
    }

    const requestPromise: Promise<{ hasResponse: boolean; payload?: unknown }> = axios
      .get(url, {
        timeout: Number(this.config.timeout_ms ?? 10000),
        validateStatus: () => true,
      })
      .then((response) => ({
        hasResponse: true,
        payload: response.data,
      }))
      .catch(() => ({
        hasResponse: false,
      }));

    CoreApiHealthProbe.responseCache.set(url, {
      expiresAt: now + CACHE_TTL_MS,
      promise: requestPromise,
    });

    const result = await requestPromise;
    CoreApiHealthProbe.responseCache.set(url, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      hasResponse: result.hasResponse,
      payload: result.payload,
    });

    return result;
  }
}
