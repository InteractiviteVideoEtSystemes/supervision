import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { ComponentCard } from '../components/ComponentCard';
import { StatusBanner } from '../components/StatusBanner';
import { useWebSocket } from '../hooks/useWebSocket';
import type { EnvironmentSummary, StatusResponse } from '../types';

export const Dashboard = () => {
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('preprod');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        const items = await apiClient.getEnvironments();
        setEnvironments(items);
        if (items.length > 0) {
          setSelectedEnv((current) => current || items[0].code);
        }
      } catch {
        setError('Unable to load environments.');
      }
    };

    void loadEnvironments();
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getStatus(selectedEnv);
      setStatus(response);
      setError(null);
    } catch {
      setError('Unable to load status.');
    } finally {
      setLoading(false);
    }
  }, [selectedEnv]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleStatusUpdate = useCallback((payload: StatusResponse) => {
    setStatus(payload);
    setError(null);
    setLoading(false);
  }, []);

  const handleFallbackPoll = useCallback(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const connected = useWebSocket(
    selectedEnv,
    handleStatusUpdate,
    handleFallbackPoll,
  );

  return (
    <section className="stack">
      <div className="toolbar">
        <label>
          Environment
          <select value={selectedEnv} onChange={(event) => setSelectedEnv(event.target.value)}>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.code}>
                {environment.label}
              </option>
            ))}
          </select>
        </label>
        <span className={`connection-pill ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? 'Live updates connected' : 'Polling fallback'}
        </span>
      </div>

      {status && (
        <StatusBanner
          environment={status.environment}
          globalStatus={status.global}
          checkedAt={status.checkedAt}
        />
      )}

      {loading && <div className="panel">Loading status…</div>}
      {error && <div className="panel error">{error}</div>}

      <div className="card-grid">
        {status?.components.map((component) => (
          <ComponentCard key={component.id} component={component} environment={selectedEnv} />
        ))}
      </div>
    </section>
  );
};
