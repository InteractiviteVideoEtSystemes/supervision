import { render, screen } from '@testing-library/react';
import { StatusBanner } from './StatusBanner';

describe('StatusBanner', () => {
  const baseProps = {
    environment: 'preprod',
    checkedAt: '2026-06-25T12:00:00.000Z',
  };

  it('renders green status with correct label, icon and CSS class', () => {
    const { container } = render(<StatusBanner {...baseProps} globalStatus="green" />);
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
    expect(container.querySelector('.status-green')).not.toBeNull();
    // The ✓ icon is present (aria-hidden span)
    expect(container.querySelector('.status-icon')).toHaveTextContent('✓');
  });

  it('renders orange status with correct label, icon and CSS class', () => {
    const { container } = render(<StatusBanner {...baseProps} globalStatus="orange" />);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(container.querySelector('.status-orange')).not.toBeNull();
    expect(container.querySelector('.status-icon')).toHaveTextContent('⚠');
  });

  it('renders red status with correct label, icon and CSS class', () => {
    const { container } = render(<StatusBanner {...baseProps} globalStatus="red" />);
    expect(screen.getByText('Outage')).toBeInTheDocument();
    expect(container.querySelector('.status-red')).not.toBeNull();
    expect(container.querySelector('.status-icon')).toHaveTextContent('✗');
  });

  it('displays the environment name', () => {
    render(<StatusBanner {...baseProps} globalStatus="green" />);
    expect(screen.getByText(/preprod/)).toBeInTheDocument();
  });

  it('three statuses produce three distinct CSS classes (no cross-contamination)', () => {
    const { container: greenContainer } = render(
      <StatusBanner {...baseProps} globalStatus="green" />,
    );
    const { container: redContainer } = render(
      <StatusBanner {...baseProps} globalStatus="red" />,
    );

    expect(greenContainer.querySelector('.status-green')).not.toBeNull();
    expect(greenContainer.querySelector('.status-red')).toBeNull();
    expect(redContainer.querySelector('.status-red')).not.toBeNull();
    expect(redContainer.querySelector('.status-green')).toBeNull();
  });
});
