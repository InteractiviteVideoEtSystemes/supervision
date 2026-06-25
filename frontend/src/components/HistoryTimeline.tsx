import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { ComponentHistoryItem } from '../types';

const statusColor: Record<ComponentHistoryItem['status'], string> = {
  up: '#22c55e',
  down: '#ef4444',
  unknown: '#f97316',
};

function formatDateTime(d: Date | string): string {
  const dt = new Date(d as string);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
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

      {segments.length > 0 && (
        <div className="history-time-axis" aria-hidden="false">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className="history-time-axis-cell"
              style={{ width: `${(segment.duration / totalDuration) * 100}%` }}
            >
              <span className="history-time-axis-label">{formatDateTime(segment.changedAt)}</span>
            </div>
          ))}
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
    </section>
  );
};
