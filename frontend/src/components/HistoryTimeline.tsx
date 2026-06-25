import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { ComponentHistoryItem } from '../types';

const statusColor: Record<ComponentHistoryItem['status'], string> = {
  up: '#22c55e',
  down: '#ef4444',
  unknown: '#f97316',
};

const statusChipClass: Record<ComponentHistoryItem['status'], string> = {
  up: 'status-green',
  down: 'status-red',
  unknown: 'status-orange',
};

const statusIcon: Record<ComponentHistoryItem['status'], string> = {
  up: '✓',
  down: '✗',
  unknown: '⚠',
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

type TooltipState = { payload: unknown; x: number; y: number } | null;

type Props = {
  items: ComponentHistoryItem[];
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
};

export const HistoryTimeline = ({ items, from, to, onFromChange, onToChange, onApply }: Props) => {
  const { isAuthenticated } = useAuth();
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  // Sort chronologically oldest → newest for left-to-right display
  const sorted = [...items].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );

  const now = Date.now();
  const segments = sorted.map((item, i) => {
    const start = new Date(item.changedAt).getTime();
    const end =
      i < sorted.length - 1 ? new Date(sorted[i + 1].changedAt).getTime() : now;
    return { ...item, duration: Math.max(end - start, 1) };
  });

  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

  return (
    <section className="panel stack">
      <div className="toolbar">
        <label>
          From
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="datetime-local"
            value={to}
            onChange={(event) => onToChange(event.target.value)}
          />
        </label>
        <button onClick={onApply}>Apply filters</button>
      </div>

      {segments.length === 0 ? (
        <div className="muted">No transitions found.</div>
      ) : (
        <div className="history-bar-graph" role="img" aria-label="Status history bar graph">
          {segments.map((segment) => {
            const showTooltip = isAuthenticated && segment.rawPayload !== undefined;
            return (
              <div
                key={segment.id}
                className="history-bar-segment"
                style={{
                  width: `${(segment.duration / totalDuration) * 100}%`,
                  backgroundColor: statusColor[segment.status],
                }}
                title={`${segment.status} — ${new Date(segment.changedAt).toLocaleString()}`}
                onMouseEnter={
                  showTooltip
                    ? (e) =>
                        setTooltip({
                          payload: segment.rawPayload,
                          x: e.clientX,
                          y: e.clientY,
                        })
                    : undefined
                }
                onMouseMove={
                  showTooltip
                    ? (e) =>
                        setTooltip({
                          payload: segment.rawPayload,
                          x: e.clientX,
                          y: e.clientY,
                        })
                    : undefined
                }
                onMouseLeave={showTooltip ? () => setTooltip(null) : undefined}
              />
            );
          })}
        </div>
      )}

      {tooltip && (
        <div
          className="history-bar-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <pre>{JSON.stringify(tooltip.payload, null, 2)}</pre>
        </div>
      )}

      <ul className="timeline">
        {segments.length === 0 ? (
          <li className="timeline-item muted">No status changes in this range.</li>
        ) : (
          [...segments].reverse().map((segment) => (
            <li key={segment.id} className="timeline-item">
              <div className={`status-chip ${statusChipClass[segment.status]}`}>
                <span aria-hidden="true">{statusIcon[segment.status]}</span> {segment.status}
              </div>
              <div>{new Date(segment.changedAt).toLocaleString()}</div>
              <div className="muted">{formatDuration(segment.duration)}</div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
};
