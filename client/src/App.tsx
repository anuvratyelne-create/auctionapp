import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { api } from './utils/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LiveView from './pages/LiveView';
import SummaryView from './pages/SummaryView';
import OverlayView from './pages/OverlayView';
import TopPlayers from './pages/TopPlayers';
import PlayerRegister from './pages/PlayerRegister';

// Admin Panel imports
import AdminLogin from './admin/pages/AdminLogin';
import AdminDashboard from './admin/pages/AdminDashboard';
import UserManagement from './admin/pages/UserManagement';
import TournamentManagement from './admin/pages/TournamentManagement';
import AuctionControl from './admin/pages/AuctionControl';
import AuditLogs from './admin/pages/AuditLogs';
import SystemSettings from './admin/pages/SystemSettings';
import { useAdminStore } from './admin/stores/adminStore';
import { adminApi } from './admin/utils/adminApi';

// Admin Protected Route
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAdminStore();
  const [isReady, setIsReady] = useState(false);
  const [hasStoredAuth, setHasStoredAuth] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.token && parsed?.state?.isAuthenticated) {
          setHasStoredAuth(true);
          adminApi.setToken(parsed.state.token);
        }
      }
    } catch (e) {
      console.error('Error reading admin auth:', e);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (token) {
      adminApi.setToken(token);
    }
  }, [token]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated && !hasStoredAuth) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [hasStoredAuth, setHasStoredAuth] = useState(false);

  useEffect(() => {
    // Check localStorage directly - faster than waiting for zustand rehydration
    try {
      const stored = localStorage.getItem('auction-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.token && parsed?.state?.isAuthenticated) {
          setHasStoredAuth(true);
          api.setToken(parsed.state.token);
        }
      }
    } catch (e) {
      console.error('Error reading auth:', e);
    }
    setIsReady(true);
  }, []);

  // Also update when zustand state changes
  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
  }, [token]);

  // Show loading spinner while checking
  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Allow access if either zustand OR localStorage says authenticated
  if (!isAuthenticated && !hasStoredAuth) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { token } = useAuthStore();

  // Set token immediately on app load (not just in useEffect)
  if (token) {
    api.setToken(token);
  }

  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
  }, [token]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/manage/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/top-players"
        element={
          <ProtectedRoute>
            <TopPlayers />
          </ProtectedRoute>
        }
      />
      <Route path="/live/:shareCode" element={<LiveView />} />
      <Route path="/summary/:shareCode" element={<SummaryView />} />
      <Route path="/overlay/:shareCode" element={<OverlayView />} />
      <Route path="/register/:shareCode" element={<PlayerRegister />} />
      <Route path="/" element={<Navigate to="/manage" replace />} />

      {/* Admin Panel Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminProtectedRoute>
            <UserManagement />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/tournaments"
        element={
          <AdminProtectedRoute>
            <TournamentManagement />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/auctions"
        element={
          <AdminProtectedRoute>
            <AuctionControl />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <AdminProtectedRoute>
            <AuditLogs />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminProtectedRoute>
            <SystemSettings />
          </AdminProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
