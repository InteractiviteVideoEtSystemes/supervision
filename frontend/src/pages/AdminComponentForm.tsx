import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { ComponentPayload, Criticality, EnvironmentSummary } from '../types';

type FormState = {
  environmentId: number;
  code: string;
  label: string;
  criticality: Criticality;
  probeType: string;
  probeConfig: string;
  intervalSeconds: number;
  enabled: boolean;
};

const defaultFormState: FormState = {
  environmentId: 0,
  code: '',
  label: '',
  criticality: 'critical',
  probeType: 'http-status',
  probeConfig: '{\n  "url": "",\n  "timeout_ms": 10000\n}',
  intervalSeconds: 60,
  enabled: true,
};

export const AdminComponentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const environmentCode = useMemo(
    () => new URLSearchParams(location.search).get('env') ?? 'preprod',
    [location.search],
  );
  const isEdit = Boolean(id);

  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const environmentItems = await apiClient.getEnvironments();
        setEnvironments(environmentItems);
        const defaultEnvironment =
          environmentItems.find((environment) => environment.code === environmentCode) ??
          environmentItems[0];

        setFormState((current) => ({
          ...current,
          environmentId: current.environmentId || defaultEnvironment?.id || 0,
        }));

        if (isEdit && id) {
          const components = await apiClient.getComponents(environmentCode);
          const component = components.find((item) => item.id === Number(id));
          if (!component) {
            setError('Component not found.');
            return;
          }

          setFormState({
            environmentId: component.environmentId,
            code: component.code,
            label: component.label,
            criticality: component.criticality,
            probeType: component.probeType,
            probeConfig: JSON.stringify(component.probeConfig, null, 2),
            intervalSeconds: component.intervalSeconds,
            enabled: component.enabled,
          });
        }
      } catch {
        setError('Unable to load form data.');
      }
    };

    void load();
  }, [environmentCode, id, isEdit]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: ComponentPayload = {
        environmentId: formState.environmentId,
        code: formState.code,
        label: formState.label,
        criticality: formState.criticality,
        probeType: formState.probeType,
        probeConfig: JSON.parse(formState.probeConfig),
        intervalSeconds: formState.intervalSeconds,
        enabled: formState.enabled,
      };

      if (isEdit && id) {
        await apiClient.updateComponent(Number(id), payload);
      } else {
        await apiClient.createComponent(payload);
      }

      const selectedEnvironment =
        environments.find((environment) => environment.id === formState.environmentId)?.code ??
        environmentCode;
      navigate(`/admin?env=${selectedEnvironment}`);
    } catch {
      setError('Unable to save component. Check the JSON configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="stack">
      <div className="page-heading">
        <div>
          <h2>{isEdit ? 'Edit component' : 'Create component'}</h2>
          <p className="subtitle">
            <Link to="/admin">← Back to admin dashboard</Link>
          </p>
        </div>
      </div>

      <form className="form-panel stack" onSubmit={handleSubmit}>
        <label>
          Environment
          <select
            value={formState.environmentId}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                environmentId: Number(event.target.value),
              }))
            }
          >
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Code
          <input
            value={formState.code}
            onChange={(event) =>
              setFormState((current) => ({ ...current, code: event.target.value }))
            }
          />
        </label>

        <label>
          Label
          <input
            value={formState.label}
            onChange={(event) =>
              setFormState((current) => ({ ...current, label: event.target.value }))
            }
          />
        </label>

        <label>
          Criticality
          <select
            value={formState.criticality}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                criticality: event.target.value as Criticality,
              }))
            }
          >
            <option value="critical">critical</option>
            <option value="degraded">degraded</option>
          </select>
        </label>

        <label>
          Probe type
          <input
            value={formState.probeType}
            onChange={(event) =>
              setFormState((current) => ({ ...current, probeType: event.target.value }))
            }
          />
        </label>

        <label>
          Probe config (JSON)
          <textarea
            rows={10}
            value={formState.probeConfig}
            onChange={(event) =>
              setFormState((current) => ({ ...current, probeConfig: event.target.value }))
            }
          />
        </label>

        <label>
          Interval (seconds)
          <input
            type="number"
            min={5}
            value={formState.intervalSeconds}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                intervalSeconds: Number(event.target.value),
              }))
            }
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={formState.enabled}
            onChange={(event) =>
              setFormState((current) => ({ ...current, enabled: event.target.checked }))
            }
          />
          Enabled
        </label>

        {error && <div className="error-text">{error}</div>}

        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save component'}
          </button>
        </div>
      </form>
    </section>
  );
};
