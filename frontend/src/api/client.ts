import axios from 'axios';
import type {
  ComponentDefinition,
  ComponentHistoryResponse,
  ComponentPayload,
  EnvironmentSummary,
  GlobalHistoryResponse,
  LoginResponse,
  StatusResponse,
  AdminUser,
} from '../types';

const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? '';
export const apiBaseUrl = rawBaseUrl.replace(/\/$/, '');

const client = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

const buildQuery = (params: Record<string, string | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const apiClient = {
  async getEnvironments() {
    const { data } = await client.get<EnvironmentSummary[]>('/api/environments');
    return data;
  },

  async getStatus(environment: string) {
    const { data } = await client.get<StatusResponse>(`/api/status?env=${environment}`);
    return data;
  },

  async getComponents(environment: string) {
    const { data } = await client.get<ComponentDefinition[]>(`/api/components?env=${environment}`);
    return data;
  },

  async getComponentHistory(componentId: number, from?: string, to?: string) {
    const query = buildQuery({ from, to });
    const { data } = await client.get<ComponentHistoryResponse>(
      `/api/components/${componentId}/history${query}`,
    );
    return data;
  },

  async getGlobalHistory(environment: string, from?: string, to?: string) {
    const query = buildQuery({ env: environment, from, to });
    const { data } = await client.get<GlobalHistoryResponse>(`/api/global-status/history${query}`);
    return data;
  },

  async login(username: string, password: string) {
    const { data } = await client.post<LoginResponse>('/api/auth/login', {
      username,
      password,
    });
    return data;
  },

  async logout() {
    await client.post('/api/auth/logout');
  },

  async me() {
    const { data } = await client.get<AdminUser>('/api/auth/me');
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    await client.post('/api/admin/password', {
      currentPassword,
      newPassword,
    });
  },

  async createComponent(payload: ComponentPayload) {
    const { data } = await client.post<ComponentDefinition>('/api/components', payload);
    return data;
  },

  async updateComponent(componentId: number, payload: Partial<ComponentPayload>) {
    const { data } = await client.put<ComponentDefinition>(`/api/components/${componentId}`, payload);
    return data;
  },

  async deleteComponent(componentId: number) {
    await client.delete(`/api/components/${componentId}`);
  },
};
