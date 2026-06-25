export type ComponentStatus = 'up' | 'down' | 'unknown';

export interface ProbeResult {
  componentCode: string;
  status: ComponentStatus;
  rawPayload?: unknown;
}

export interface Probe {
  check(): Promise<ProbeResult[]>;
}

export interface ProbeConfig {
  url: string;
  timeout_ms?: number;
  field?: string;
  expected_status?: number;
}
