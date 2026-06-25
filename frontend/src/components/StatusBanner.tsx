import { Link } from 'react-router-dom';
import type { GlobalStatus } from '../types';

const globalStatusConfig: Record<
  GlobalStatus,
  { label: string; icon: string; className: string }
> = {
  green: {
    label: 'All Systems Operational',
    icon: '✓',
    className: 'status-green',
  },
  orange: {
    label: 'Degraded',
    icon: '⚠',
    className: 'status-orange',
  },
  red: {
    label: 'Outage',
    icon: '✗',
    className: 'status-red',
  },
};

type Props = {
  environment: string;
  globalStatus: GlobalStatus;
  checkedAt: string;
};

export const StatusBanner = ({ environment, globalStatus, checkedAt }: Props) => {
  const config = globalStatusConfig[globalStatus];

  return (
    <Link to="/global-history" className={`status-banner ${config.className}`}>
      <div className="status-banner-main">
        <span className="status-icon" aria-hidden="true">
          {config.icon}
        </span>
        <div>
          <strong>{config.label}</strong>
          <div className="muted">Environment: {environment}</div>
        </div>
      </div>
      <span className="muted">Checked at {new Date(checkedAt).toLocaleString()}</span>
    </Link>
  );
};
