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

  // ── Timeline list (AISB-121) ──────────────────────────────────────────────

  describe('timeline list (AISB-121)', () => {
    // Non-uniform fixture: 4 transitions producing four distinct duration strings.
    // Segments (ascending = bar order, component sorts oldest-first):
    //   t1→t2: 08:00→08:45 = 45 min   → "45m"
    //   t2→t3: 08:45→10:45 = 2 h      → "2h"
    //   t3→t4: 10:45→12:00 = 1 h 15 m → "1h 15m"
    //   t4→now: 12:00→12:30 = 30 min  → "30m"  (fake clock pinned at 12:30Z)
    const timelineItems: ComponentHistoryItem[] = [
      { id: 't1', status: 'up',      changedAt: '2026-06-25T08:00:00.000Z' },
      { id: 't2', status: 'down',    changedAt: '2026-06-25T08:45:00.000Z' },
      { id: 't3', status: 'up',      changedAt: '2026-06-25T10:45:00.000Z' },
      { id: 't4', status: 'unknown', changedAt: '2026-06-25T12:00:00.000Z' },
    ];
    const FAKE_NOW = new Date('2026-06-25T12:30:00.000Z');

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // AC1 – coexistence: timeline list and bar graph both render with same item count
    it('renders one li.timeline-item per transition AND bar segments coexist (both length 3)', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      expect(container.querySelectorAll('ul.timeline li.timeline-item')).toHaveLength(3);
      expect(container.querySelectorAll('.history-bar-segment')).toHaveLength(3);
    });

    // AC3 – reverse-chronological order; FAILS if list is rendered oldest-first
    it('first li.timeline-item is the NEWEST transition (unknown@12:00, status-orange); last is oldest (up@08:00, status-green)', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      const lis = container.querySelectorAll('ul.timeline li.timeline-item');
      // Newest at index 0
      expect(lis[0].querySelector('.status-chip')?.classList).toContain('status-orange');
      expect(lis[0].textContent).toContain('unknown');
      // Oldest at index 2
      expect(lis[2].querySelector('.status-chip')?.classList).toContain('status-green');
      expect(lis[2].textContent).toContain('up');
      // Explicit guard: oldest-first would invert these — assert the opposite is false
      expect(lis[0].querySelector('.status-chip')?.classList).not.toContain('status-green');
      expect(lis[2].querySelector('.status-chip')?.classList).not.toContain('status-orange');
    });

    // AC3 – ordering is stable even when input arrives in DESC order (as from the backend)
    it('maintains newest-first list order regardless of input order (DESC input)', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const descItems = [items[2], items[1], items[0]]; // newest → oldest
      const { container } = render(<HistoryTimeline {...baseProps} items={descItems} />);
      const lis = container.querySelectorAll('ul.timeline li.timeline-item');
      expect(lis[0].querySelector('.status-chip')?.classList).toContain('status-orange'); // unknown
      expect(lis[2].querySelector('.status-chip')?.classList).toContain('status-green'); // up
    });

    // AC2 – correct chip CSS class per status (all three mapped in the list)
    it('maps up→status-green, down→status-red, unknown→status-orange within the list', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      const lis = Array.from(container.querySelectorAll('ul.timeline li.timeline-item'));
      // reversed: [0]=unknown→orange, [1]=down→red, [2]=up→green
      expect(lis[0].querySelector('.status-chip')?.classList).toContain('status-orange');
      expect(lis[1].querySelector('.status-chip')?.classList).toContain('status-red');
      expect(lis[2].querySelector('.status-chip')?.classList).toContain('status-green');
    });

    // AC4 – non-uniform durations; a buggy constant-"2h" impl would fail 3 of 4 assertions
    it('shows distinct non-uniform formatted durations per row with deterministic clock', () => {
      vi.useFakeTimers();
      vi.setSystemTime(FAKE_NOW); // 2026-06-25T12:30Z
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={timelineItems} />);
      const lis = container.querySelectorAll('ul.timeline li.timeline-item');
      // Newest-first: t4 → t3 → t2 → t1
      expect(lis[0].querySelector('.muted')?.textContent).toBe('30m');    // t4: 12:00→12:30
      expect(lis[1].querySelector('.muted')?.textContent).toBe('1h 15m'); // t3: 10:45→12:00
      expect(lis[2].querySelector('.muted')?.textContent).toBe('2h');     // t2: 08:45→10:45
      expect(lis[3].querySelector('.muted')?.textContent).toBe('45m');    // t1: 08:00→08:45
    });

    // AC2 – each row shows its own exact toLocaleString() timestamp in position order
    it('each li.timeline-item shows the exact toLocaleString() timestamp matched to its changedAt', () => {
      vi.useFakeTimers();
      vi.setSystemTime(FAKE_NOW);
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={timelineItems} />);
      const lis = container.querySelectorAll('ul.timeline li.timeline-item');
      // Newest-first: lis[0]=t4, lis[1]=t3, lis[2]=t2, lis[3]=t1
      expect(lis[0].textContent).toContain(new Date(timelineItems[3].changedAt).toLocaleString());
      expect(lis[1].textContent).toContain(new Date(timelineItems[2].changedAt).toLocaleString());
      expect(lis[2].textContent).toContain(new Date(timelineItems[1].changedAt).toLocaleString());
      expect(lis[3].textContent).toContain(new Date(timelineItems[0].changedAt).toLocaleString());
    });

    // AC5 – empty state uses distinct copy from bar graph; ul.timeline must not bleed bar-graph text
    it('shows "No status changes in this range." in ul.timeline when items is empty', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={[]} />);
      const timeline = container.querySelector('ul.timeline');
      expect(timeline?.textContent).toContain('No status changes in this range.');
      expect(timeline?.textContent).not.toContain('No transitions found.');
      // Bar graph still renders its own empty-state message outside the timeline subtree
      expect(screen.getByText('No transitions found.')).toBeInTheDocument();
    });

    it('does NOT show data li.timeline-item entries when items is empty (only the muted empty-state li)', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={[]} />);
      // The empty-state message is rendered as a li.timeline-item.muted; exclude it
      expect(
        container.querySelectorAll('ul.timeline li.timeline-item:not(.muted)'),
      ).toHaveLength(0);
    });

    // AC6 – no rawPayload leakage in ul.timeline (admin authenticated)
    it('ul.timeline subtree text does NOT contain rawPayload keys/values when admin is authenticated', () => {
      mockUseAuth.mockReturnValue(
        makeAuthValue({ isAuthenticated: true, user: { id: 1, username: 'admin' } }),
      );
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      const timelineText = container.querySelector('ul.timeline')?.textContent ?? '';
      expect(timelineText).not.toContain('httpStatus');
      expect(timelineText).not.toContain('Service unavailable');
      expect(timelineText).not.toContain('example.com');
    });

    // AC6 – rawPayload is absent from the list even for anonymous users
    it('ul.timeline subtree text does NOT contain rawPayload values for anonymous users', () => {
      mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false }));
      const { container } = render(<HistoryTimeline {...baseProps} items={items} />);
      const timelineText = container.querySelector('ul.timeline')?.textContent ?? '';
      expect(timelineText).not.toContain('httpStatus');
      expect(timelineText).not.toContain('503');
      expect(timelineText).not.toContain('Service unavailable');
      expect(timelineText).not.toContain('example.com');
    });
  });
});
