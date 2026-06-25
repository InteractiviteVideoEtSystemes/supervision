import { Link } from 'react-router-dom';
import type { StatusComponentSummary } from '../types';

const statusConfig = {
  up: { text: 'Up', icon: '✓', className: 'status-green' },
  down: { text: 'Down', icon: '✗', className: 'status-red' },
  unknown: { text: 'Unknown', icon: '?', className: 'status-orange' },
} as const;

type Props = {
  component: StatusComponentSummary;
  environment: string;
};

export const ComponentCard = ({ component, environment }: Props) => {
  const config = statusConfig[component.status];

  return (
    <article className={`component-card ${config.className}`}>
      <div className="component-card-header">
        <h3>{component.label}</h3>
        <span className="status-chip">
          <span aria-hidden="true">{config.icon}</span> {config.text}
        </span>
      </div>
      <div className="muted">{component.code}</div>
      <div className="muted">
        Last transition:{' '}
        {component.lastChangedAt ? new Date(component.lastChangedAt).toLocaleString() : 'Never'}
      </div>
      <Link to={`/history/${component.id}?env=${environment}`}>View history</Link>
    </article>
  );
};
