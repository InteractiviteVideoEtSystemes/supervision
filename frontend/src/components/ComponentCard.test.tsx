import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ComponentCard } from './ComponentCard';
import type { StatusComponentSummary } from '../types';

function renderCard(component: StatusComponentSummary) {
  return render(
    <MemoryRouter>
      <ComponentCard component={component} environment="preprod" />
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
  it('renders up status with correct text, icon and green CSS class', () => {
    const { container } = renderCard({ ...base, status: 'up' });
    expect(screen.getByText('Up')).toBeInTheDocument();
    expect(container.querySelector('.status-green')).not.toBeNull();
    expect(container.querySelector('.status-red')).toBeNull();
    expect(container.querySelector('.status-orange')).toBeNull();
  });

  it('renders down status with correct text, icon and red CSS class', () => {
    const { container } = renderCard({ ...base, status: 'down' });
    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(container.querySelector('.status-red')).not.toBeNull();
    expect(container.querySelector('.status-green')).toBeNull();
  });

  it('renders unknown status with correct text and orange CSS class', () => {
    const { container } = renderCard({ ...base, status: 'unknown' });
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(container.querySelector('.status-orange')).not.toBeNull();
    expect(container.querySelector('.status-green')).toBeNull();
  });

  it('shows "Never" when lastChangedAt is null', () => {
    renderCard({ ...base, lastChangedAt: null });
    expect(screen.getByText(/Never/)).toBeInTheDocument();
  });

  it('shows the component label prominently', () => {
    renderCard(base);
    expect(screen.getByText('Database')).toBeInTheDocument();
  });

  it('shows the component code', () => {
    renderCard(base);
    expect(screen.getByText('database')).toBeInTheDocument();
  });

  it('includes a link to the component history page', () => {
    renderCard(base);
    const link = screen.getByRole('link', { name: /view history/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('/history/1');
  });
});
