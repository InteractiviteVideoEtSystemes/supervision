import type { ComponentHistoryItem } from '../types';

const statusConfig = {
  up: { text: 'Up', icon: '✓', className: 'status-green' },
  down: { text: 'Down', icon: '✗', className: 'status-red' },
  unknown: { text: 'Unknown', icon: '?', className: 'status-orange' },
} as const;

type Props = {
  items: ComponentHistoryItem[];
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
};

export const HistoryTimeline = ({ items, from, to, onFromChange, onToChange, onApply }: Props) => {
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
        {items.length === 0 && <li className="timeline-item muted">No transitions found.</li>}
        {items.map((item) => {
          const config = statusConfig[item.status];
          return (
            <li key={item.id} className="timeline-item">
              <div className={`status-chip ${config.className}`}>
                <span aria-hidden="true">{config.icon}</span> {config.text}
              </div>
              <div>{new Date(item.changedAt).toLocaleString()}</div>
              {item.rawPayload !== undefined && (
                <pre className="payload-preview">{JSON.stringify(item.rawPayload, null, 2)}</pre>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
