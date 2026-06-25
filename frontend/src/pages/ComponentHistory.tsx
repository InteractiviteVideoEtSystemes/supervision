import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { HistoryTimeline } from '../components/HistoryTimeline';
import type { ComponentDefinition, ComponentHistoryResponse } from '../types';

export const ComponentHistory = () => {
  const { componentId } = useParams();
  const location = useLocation();
  const environment = useMemo(
    () => new URLSearchParams(location.search).get('env') ?? 'preprod',
    [location.search],
  );
  const numericComponentId = Number(componentId);

  const [component, setComponent] = useState<ComponentDefinition | null>(null);
  const [history, setHistory] = useState<ComponentHistoryResponse | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        const components = await apiClient.getComponents(environment);
        setComponent(components.find((item) => item.id === numericComponentId) ?? null);
      } catch {
        setError('Unable to load component details.');
      }
    };

    if (!Number.isNaN(numericComponentId)) {
      void loadComponent();
    }
  }, [environment, numericComponentId]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await apiClient.getComponentHistory(
        numericComponentId,
        from || undefined,
        to || undefined,
      );
      setHistory(response);
      setError(null);
    } catch {
      setError('Unable to load component history.');
    }
  }, [from, numericComponentId, to]);

  useEffect(() => {
    if (!Number.isNaN(numericComponentId)) {
      void loadHistory();
    }
  }, [loadHistory, numericComponentId]);

  return (
    <section className="stack">
      <div className="page-heading">
        <div>
          <h2>{component?.label ?? history?.component.label ?? 'Component history'}</h2>
          <p className="subtitle">
            <Link to="/">← Back to dashboard</Link>
          </p>
        </div>
      </div>

      {error && <div className="panel error">{error}</div>}

      <HistoryTimeline
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
