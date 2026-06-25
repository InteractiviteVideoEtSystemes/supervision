import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { ComponentDefinition, EnvironmentSummary } from '../types';

export const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('preprod');
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
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

  const loadComponents = useCallback(async () => {
    try {
      const items = await apiClient.getComponents(selectedEnv);
      setComponents(items);
      setError(null);
    } catch {
      setError('Unable to load components.');
    }
  }, [selectedEnv]);

  useEffect(() => {
    void loadComponents();
  }, [loadComponents]);

  const handleDelete = async (componentId: number) => {
    const confirmed = window.confirm('Delete this component?');
    if (!confirmed) {
      return;
    }

    await apiClient.deleteComponent(componentId);
    await loadComponents();
  };

  return (
    <section className="stack">
      <div className="page-heading">
        <div>
          <h2>Admin dashboard</h2>
          <p className="subtitle">Signed in as {user?.username}</p>
        </div>
        <div className="actions">
          <Link className="button-link" to={`/admin/components/new?env=${selectedEnv}`}>
            Add component
          </Link>
          <Link className="button-link" to="/admin/password">
            Change password
          </Link>
          <button onClick={() => void logout()}>Logout</button>
        </div>
      </div>

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

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Label</th>
              <th>Criticality</th>
              <th>Probe</th>
              <th>Interval</th>
              <th>Enabled</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {components.map((component) => (
              <tr key={component.id}>
                <td>{component.code}</td>
                <td>{component.label}</td>
                <td>{component.criticality}</td>
                <td>{component.probeType}</td>
                <td>{component.intervalSeconds}s</td>
                <td>{component.enabled ? 'Yes' : 'No'}</td>
                <td className="actions">
                  <Link to={`/admin/components/${component.id}/edit?env=${selectedEnv}`}>Edit</Link>
                  <button className="link-button danger" onClick={() => void handleDelete(component.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
