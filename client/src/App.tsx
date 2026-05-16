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
    </Routes>
  );
}

export default App;
