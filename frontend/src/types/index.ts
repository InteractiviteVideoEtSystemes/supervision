export type ComponentStatus = 'up' | 'down' | 'unknown';
export type GlobalStatus = 'green' | 'orange' | 'red';
export type Criticality = 'critical' | 'degraded';

export interface EnvironmentSummary {
  id: number;
  code: string;
  label: string;
  enabled: boolean;
}

export interface StatusComponentSummary {
  id: number;
  code: string;
  label: string;
  status: ComponentStatus;
  lastChangedAt: string | null;
}

export interface StatusResponse {
  environment: string;
  global: GlobalStatus;
  checkedAt: string;
  components: StatusComponentSummary[];
}

export interface ComponentDefinition {
  id: number;
  environmentId: number;
  environmentCode: string;
  code: string;
  label: string;
  criticality: Criticality;
  probeType: string;
  probeConfig: Record<string, unknown>;
  intervalSeconds: number;
  enabled: boolean;
}

export interface ComponentHistoryItem {
  id: string;
  status: ComponentStatus;
  changedAt: string;
  rawPayload?: unknown;
}

export interface ComponentHistoryResponse {
  component: {
    id: number;
    code: string;
    label: string;
  };
  history: ComponentHistoryItem[];
}

export interface GlobalHistoryItem {
  id: string;
  status: GlobalStatus;
  changedAt: string;
}

export interface GlobalHistoryResponse {
  environment: string;
  history: GlobalHistoryItem[];
}

export interface AdminUser {
  id: number;
  username: string;
}

export interface LoginResponse {
  user: AdminUser;
  expiresIn: number;
  frontendUrl?: string;
}

export interface ComponentPayload {
  environmentId: number;
  code: string;
  label: string;
  criticality: Criticality;
  probeType: string;
  probeConfig: Record<string, unknown>;
  intervalSeconds: number;
  enabled: boolean;
}
