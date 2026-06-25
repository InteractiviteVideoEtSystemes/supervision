import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusBanner } from './StatusBanner';

function renderBanner(props: Parameters<typeof StatusBanner>[0]) {
  return render(
    <MemoryRouter>
      <StatusBanner {...props} />
    </MemoryRouter>,
  );
}

describe('StatusBanner', () => {
  const baseProps = {
    environment: 'preprod',
    checkedAt: '2026-06-25T12:00:00.000Z',
  };

  it('renders green status with correct label, icon and CSS class', () => {
    const { container } = renderBanner({ ...baseProps, globalStatus: 'green' });
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
    expect(container.querySelector('.status-green')).not.toBeNull();
    // The ✓ icon is present (aria-hidden span)
    expect(container.querySelector('.status-icon')).toHaveTextContent('✓');
  });

  it('renders orange status with correct label, icon and CSS class', () => {
    const { container } = renderBanner({ ...baseProps, globalStatus: 'orange' });
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(container.querySelector('.status-orange')).not.toBeNull();
    expect(container.querySelector('.status-icon')).toHaveTextContent('⚠');
  });

  it('renders red status with correct label, icon and CSS class', () => {
    const { container } = renderBanner({ ...baseProps, globalStatus: 'red' });
    expect(screen.getByText('Outage')).toBeInTheDocument();
    expect(container.querySelector('.status-red')).not.toBeNull();
    expect(container.querySelector('.status-icon')).toHaveTextContent('✗');
  });

  it('displays the environment name', () => {
    renderBanner({ ...baseProps, globalStatus: 'green' });
    expect(screen.getByText(/preprod/)).toBeInTheDocument();
  });

  it('three statuses produce three distinct CSS classes (no cross-contamination)', () => {
    const { container: greenContainer } = renderBanner({ ...baseProps, globalStatus: 'green' });
    const { container: redContainer } = renderBanner({ ...baseProps, globalStatus: 'red' });

    expect(greenContainer.querySelector('.status-green')).not.toBeNull();
    expect(greenContainer.querySelector('.status-red')).toBeNull();
    expect(redContainer.querySelector('.status-red')).not.toBeNull();
    expect(redContainer.querySelector('.status-green')).toBeNull();
  });

  it('banner is a link to /global-history', () => {
    renderBanner({ ...baseProps, globalStatus: 'green' });
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/global-history');
  });
});
