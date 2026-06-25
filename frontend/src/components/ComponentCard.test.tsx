import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComponentCard } from './ComponentCard';
import type { StatusComponentSummary } from '../types';

function renderCard(component: StatusComponentSummary, environment = 'preprod') {
  return render(
    <MemoryRouter>
      <ComponentCard component={component} environment={environment} />
    </MemoryRouter>,
  );
}

const base: StatusComponentSummary = {
  id: 1,
  code: 'database',
  label: 'Database',
  status: 'up',
  lastChangedAt: '2026-06-25T10:00:00.000Z',
};

describe('ComponentCard', () => {
  // ── Status color class ────────────────────────────────────────────────────

  it('renders with green CSS class for up status', () => {
    const { container } = renderCard({ ...base, status: 'up' });
    expect(container.querySelector('.status-green')).not.toBeNull();
    expect(container.querySelector('.status-red')).toBeNull();
    expect(container.querySelector('.status-orange')).toBeNull();
  });

  it('renders with red CSS class for down status', () => {
    const { container } = renderCard({ ...base, status: 'down' });
    expect(container.querySelector('.status-red')).not.toBeNull();
    expect(container.querySelector('.status-green')).toBeNull();
    expect(container.querySelector('.status-orange')).toBeNull();
  });

  it('renders with orange CSS class for unknown status', () => {
    const { container } = renderCard({ ...base, status: 'unknown' });
    expect(container.querySelector('.status-orange')).not.toBeNull();
    expect(container.querySelector('.status-green')).toBeNull();
    expect(container.querySelector('.status-red')).toBeNull();
  });

  // ── Label-only content ────────────────────────────────────────────────────

  it('shows the component label', () => {
    renderCard(base);
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('does NOT show status text "Up" / "Down" / "Unknown"', () => {
    renderCard({ ...base, status: 'up' });
    expect(screen.queryByText(/^up$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^down$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^unknown$/i)).not.toBeInTheDocument();
  });

  it('does NOT show the component code (only the label is displayed)', () => {
    // code = 'database', label = 'Database' — the lowercase code must not appear
    const { container } = renderCard(base);
    // Only the <h3> with the label should be in the card; no raw code text
    expect(container.textContent).not.toContain('database'); // lowercase code
    expect(container.textContent).toContain('Database'); // label is fine
  });

  it('does NOT show a "Last transition" or date field', () => {
    renderCard(base);
    expect(screen.queryByText(/last transition/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
  });

  it('does NOT show a separate "View history" link or text', () => {
    renderCard(base);
    expect(screen.queryByText(/view history/i)).not.toBeInTheDocument();
  });

  // ── Whole-card link ───────────────────────────────────────────────────────

  it('the entire card is a single link — no extra links', () => {
    renderCard(base);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
  });

  it('the card link points to /history/:id with the env query param', () => {
    renderCard(base);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/history/1?env=preprod');
  });

  it('the link href encodes the correct component id', () => {
    renderCard({ ...base, id: 42 });
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('/history/42');
  });

  it('the link href encodes the environment name passed as prop', () => {
    renderCard(base, 'production');
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('env=production');
  });

  it('the label text node is inside the link (clicking the label also navigates)', () => {
    renderCard(base);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('Database');
  });
});
