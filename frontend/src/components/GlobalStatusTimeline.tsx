import type { GlobalHistoryItem } from '../types';

const globalStatusConfig = {
  green: { text: 'All Systems Operational', icon: '✓', className: 'status-green' },
  orange: { text: 'Degraded', icon: '⚠', className: 'status-orange' },
  red: { text: 'Outage', icon: '✗', className: 'status-red' },
} as const;

type Props = {
  items: GlobalHistoryItem[];
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
};

export const GlobalStatusTimeline = ({
  items,
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
}: Props) => {
  return (
    <section className="panel stack">
      <div className="toolbar">
        <label>
          From
          <input type="datetime-local" value={from} onChange={(event) => onFromChange(event.target.value)} />
        </label>
        <label>
          To
          <input type="datetime-local" value={to} onChange={(event) => onToChange(event.target.value)} />
        </label>
        <button onClick={onApply}>Apply filters</button>
      </div>

      <ul className="timeline">
        {items.length === 0 && <li className="timeline-item muted">No global transitions found.</li>}
        {items.map((item) => {
          const config = globalStatusConfig[item.status];
          return (
            <li key={item.id} className="timeline-item">
              <div className={`status-chip ${config.className}`}>
                <span aria-hidden="true">{config.icon}</span> {config.text}
              </div>
              <div>{new Date(item.changedAt).toLocaleString()}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
