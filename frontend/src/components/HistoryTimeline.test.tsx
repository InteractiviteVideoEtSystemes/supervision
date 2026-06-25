import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { HistoryTimeline } from './HistoryTimeline';
import { useAuth } from '../hooks/useAuth';
import type { ComponentHistoryItem } from '../types';

vi.mock('../hooks/useAuth');

const mockUseAuth = vi.mocked(useAuth);

function makeAuthValue(overrides: Partial<ReturnType<typeof useAuth>>) {
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    ...overrides,
  };
}

const baseProps = {
  from: '2026-06-25T00:00',
  to: '2026-06-25T23:59',
  onFromChange: vi.fn(),
  onToChange: vi.fn(),
  onApply: vi.fn(),
};

// Three transitions with distinct statuses; the first two carry rawPayload, the third does not.
const items: ComponentHistoryItem[] = [
  {
    id: '1',
    status: 'up',
    changedAt: '2026-06-25T08:00:00.000Z',
    rawPayload: { httpStatus: 200, url: 'https://example.com' },
  },
  {
    id: '2',
    status: 'down',
    changedAt: '2026-06-25T10:00:00.000Z',
    rawPayload: { httpStatus: 503, error: 'Service unavailable' },
  },
  {
    id: '3',
    status: 'unknown',
    changedAt: '2026-06-25T12:00:00.000Z',
    // no rawPayload intentionally
  },
];

describe('HistoryTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Bar graph rendering ────────────────────────────────────────────────────

  describe('bar graph segments (AISB-109)', () => {
    it('renders one bar segment per history item', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      const segments = container.querySelectorAll('.history-bar-segment');
      expect(segments).toHaveLength(3);
    });

    it('the bar graph container has an accessible role and label', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      render(<HistoryTimeline {...baseProps} items={items} />);
      expect(screen.getByRole('img', { name: /status history/i })).toBeInTheDocument();
    });

    it('applies green background color for an "up" segment', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[0]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      // #22c55e → rgb(34, 197, 94) after CSS normalisation in jsdom
      expect(segment.style.backgroundColor).toMatch(/22c55e|rgb\(34,\s*197,\s*94\)/i);
    });

    it('applies red background color for a "down" segment', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[1]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      // #ef4444 → rgb(239, 68, 68)
      expect(segment.style.backgroundColor).toMatch(/ef4444|rgb\(239,\s*68,\s*68\)/i);
    });

    it('applies orange background color for an "unknown" segment', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[2]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      // #f97316 → rgb(249, 115, 22)
      expect(segment.style.backgroundColor).toMatch(/f97316|rgb\(249,\s*115,\s*22\)/i);
    });

    it('three segments with distinct statuses produce three distinct background colors', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      const segments = Array.from(
        container.querySelectorAll('.history-bar-segment'),
      ) as HTMLElement[];
      const colors = segments.map((s) => s.style.backgroundColor);
      expect(new Set(colors).size).toBe(3);
    });

    it('renders segments oldest-first even when items arrive newest-first (backend DESC order)', () => {
      // The backend returns history ordered by changed_at DESC (newest first).
      // The component must re-sort so the bar graph reads left-to-right chronologically.
      mockUseAuth.mockReturnValue(
        makeAuthValue({ isAuthenticated: true, user: { id: 1, username: 'admin' } }),
      );
      // newest → oldest, as delivered by GET /api/components/:id/history
      const descItems = [items[2], items[1], items[0]];
      const { container } = render(
        <HistoryTimeline {...baseProps} items={descItems} />,
      );
      const segments = Array.from(
        container.querySelectorAll('.history-bar-segment'),
      ) as HTMLElement[];

      // First rendered segment must be the OLDEST transition (items[0], "up").
      expect(segments[0].style.backgroundColor).toMatch(/22c55e|rgb\(34,\s*197,\s*94\)/i);
      // Hovering it as admin must reveal the oldest item's rawPayload, proving order.
      fireEvent.mouseEnter(segments[0]);
      expect(container.querySelector('.history-bar-tooltip')?.textContent).toContain(
        'example.com',
      );
      // Last rendered segment must be the NEWEST transition (items[2], "unknown").
      expect(segments[2].style.backgroundColor).toMatch(/f97316|rgb\(249,\s*115,\s*22\)/i);
    });

    it('shows "No transitions found." when items is empty', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      render(<HistoryTimeline {...baseProps} items={[]} />);
      expect(screen.getByText('No transitions found.')).toBeInTheDocument();
    });
  });

  // ── Tooltip for authenticated users (AISB-109) ────────────────────────────

  describe('rawPayload tooltip — authenticated admin', () => {
    it('shows a tooltip containing the rawPayload JSON when admin hovers a segment', () => {
      mockUseAuth.mockReturnValue(
        makeAuthValue({ isAuthenticated: true, user: { id: 1, username: 'admin' } }),
      );
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[0]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      fireEvent.mouseEnter(segment);

      const tooltip = container.querySelector('.history-bar-tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain('httpStatus');
      expect(tooltip?.textContent).toContain('200');
    });

    it('tooltip contains recognisable key/value from the rawPayload', () => {
      mockUseAuth.mockReturnValue(
        makeAuthValue({ isAuthenticated: true, user: { id: 1, username: 'admin' } }),
      );
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[1]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      fireEvent.mouseEnter(segment);

      const tooltip = container.querySelector('.history-bar-tooltip');
      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain('503');
      expect(tooltip?.textContent).toContain('Service unavailable');
    });

    it('tooltip disappears when the mouse leaves the segment', () => {
      mockUseAuth.mockReturnValue(
        makeAuthValue({ isAuthenticated: true, user: { id: 1, username: 'admin' } }),
      );
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[0]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      fireEvent.mouseEnter(segment);
      expect(container.querySelector('.history-bar-tooltip')).not.toBeNull();

      fireEvent.mouseLeave(segment);
      expect(container.querySelector('.history-bar-tooltip')).toBeNull();
    });

    it('tooltip updates when mouse moves to a different segment', () => {
      mockUseAuth.mockReturnValue(
        makeAuthValue({ isAuthenticated: true, user: { id: 1, username: 'admin' } }),
      );
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[0], items[1]]} />,
      );
      const [seg1, seg2] = Array.from(
        container.querySelectorAll('.history-bar-segment'),
      ) as HTMLElement[];

      fireEvent.mouseEnter(seg1);
      expect(container.querySelector('.history-bar-tooltip')?.textContent).toContain(
        'example.com',
      );

      fireEvent.mouseLeave(seg1);
      fireEvent.mouseEnter(seg2);
      expect(container.querySelector('.history-bar-tooltip')?.textContent).toContain(
        'Service unavailable',
      );
    });
  });

  // ── Tooltip suppressed for anonymous users (AISB-109) ────────────────────

  describe('rawPayload tooltip — anonymous user', () => {
    it('does NOT show a tooltip when the user is NOT authenticated, even if rawPayload is present', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(
        <HistoryTimeline {...baseProps} items={[items[0]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      fireEvent.mouseEnter(segment);

      expect(container.querySelector('.history-bar-tooltip')).toBeNull();
    });

    it('raw JSON content is never visible to anonymous users on any segment', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      const segments = Array.from(
        container.querySelectorAll('.history-bar-segment'),
      ) as HTMLElement[];

      for (const segment of segments) {
        fireEvent.mouseEnter(segment);
        expect(container.querySelector('.history-bar-tooltip')).toBeNull();
      }
    });
  });

  // ── Tooltip suppressed when rawPayload absent (AISB-109) ─────────────────

  describe('rawPayload tooltip — authenticated admin, segment without rawPayload', () => {
    it('does NOT show a tooltip when authenticated but the segment has no rawPayload', () => {
      mockUseAuth.mockReturnValue(
        makeAuthValue({ isAuthenticated: true, user: { id: 1, username: 'admin' } }),
      );
      const { container } = render(
        // items[2] has no rawPayload
        <HistoryTimeline {...baseProps} items={[items[2]]} />,
      );
      const segment = container.querySelector('.history-bar-segment') as HTMLElement;
      fireEvent.mouseEnter(segment);

      expect(container.querySelector('.history-bar-tooltip')).toBeNull();
    });
  });
});
