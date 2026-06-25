import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../hooks/useAuth';

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

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /admin/login when the user is not authenticated', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false, loading: false }));

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <div>Admin Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders children when the user is authenticated', () => {
    mockUseAuth.mockReturnValue(
      makeAuthValue({
        isAuthenticated: true,
        user: { id: 1, username: 'admin' },
        loading: false,
      }),
    );

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('shows a loading indicator while authentication is being checked', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false, loading: true }));

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Checking authentication/)).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('does not redirect while loading (waits for auth check to complete)', () => {
    mockUseAuth.mockReturnValue(makeAuthValue({ isAuthenticated: false, loading: true }));

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <div>Admin Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Should show loading, not login page
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.getByText(/Checking authentication/)).toBeInTheDocument();
  });
});
