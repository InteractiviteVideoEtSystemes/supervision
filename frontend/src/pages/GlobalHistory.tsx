import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { GlobalStatusTimeline } from '../components/GlobalStatusTimeline';
import type { EnvironmentSummary, GlobalHistoryResponse } from '../types';

export const GlobalHistory = () => {
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('preprod');
  const [history, setHistory] = useState<GlobalHistoryResponse | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        const items = await apiClient.getEnvironments();
        setEnvironments(items);
      } catch {
        setError('Unable to load environments.');
      }
    };

    void loadEnvironments();
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const response = await apiClient.getGlobalHistory(
        selectedEnv,
        from || undefined,
        to || undefined,
      );
      setHistory(response);
      setError(null);
    } catch {
      setError('Unable to load global history.');
    }
  }, [from, selectedEnv, to]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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
      </div>

      {error && <div className="panel error">{error}</div>}

      <GlobalStatusTimeline
        items={history?.history ?? []}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onApply={() => void loadHistory()}
      />
    </section>
  );
};
