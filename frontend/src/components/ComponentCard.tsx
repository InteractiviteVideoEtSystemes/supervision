import { Link } from 'react-router-dom';
import type { StatusComponentSummary } from '../types';

const statusClassName = {
  up: 'status-green',
  down: 'status-red',
  unknown: 'status-orange',
} as const;

type Props = {
  component: StatusComponentSummary;
  environment: string;
};

export const ComponentCard = ({ component, environment }: Props) => {
  return (
    <Link
      to={`/history/${component.id}?env=${environment}`}
      className={`component-card ${statusClassName[component.status]}`}
    >
      <h3>{component.label}</h3>
    </Link>
  );
};
