import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminPasswordChange } from './pages/AdminPasswordChange';
import { AdminComponentForm } from './pages/AdminComponentForm';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { ComponentHistory } from './pages/ComponentHistory';
import { Dashboard } from './pages/Dashboard';
import { GlobalHistory } from './pages/GlobalHistory';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <header className="topbar">
            <div className="brand">
              <img className="brand-logo" src="/elioz-logo.png" alt="Elioz" />
              <div>
                <h1>Supervision UI</h1>
                <p className="subtitle">Realtime environment monitoring</p>
              </div>
            </div>
            <nav className="topnav">
              <NavLink to="/">Dashboard</NavLink>
              <NavLink to="/global-history">Global history</NavLink>
              <NavLink to="/admin">Admin</NavLink>
            </nav>
          </header>
          <main className="page-container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/history/:componentId" element={<ComponentHistory />} />
              <Route path="/global-history" element={<GlobalHistory />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/components/new"
                element={
                  <ProtectedRoute>
                    <AdminComponentForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/components/:id/edit"
                element={
                  <ProtectedRoute>
                    <AdminComponentForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/password"
                element={
                  <ProtectedRoute>
                    <AdminPasswordChange />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
