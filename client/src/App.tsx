import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();

  // Set token immediately
  if (token) {
    api.setToken(token);
  }

  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
  }, [token]);

  if (!isAuthenticated) {
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
    </Routes>
  );
}

export default App;
