import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSuperAdminStore } from '../stores/superAdminStore';
import { saApi } from '../utils/saApi';

interface DashboardStats {
  counts: {
    users: number;
    admins: number;
    tournaments: number;
    players: number;
  };
  financial: {
    totalRevenue: number;
    currency: string;
  };
  recentAdminLogins: Array<{
    id: string;
    email: string;
    name: string;
    last_login: string;
  }>;
  tournamentStats: {
    setup: number;
    live: number;
    paused: number;
    completed: number;
  };
}

export default function SADashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { superAdmin, logout } = useSuperAdminStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await saApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/system-health');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading system data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-mono text-gray-300">System Monitor</h1>
            <p className="text-gray-500 text-sm">Welcome, {superAdmin?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/system-health/settings"
              className="text-gray-400 hover:text-white text-sm"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-400 text-sm"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800/50 border-b border-gray-700 px-6 py-3">
        <div className="flex gap-6">
          <Link to="/system-health/dashboard" className="text-blue-400 text-sm">
            Overview
          </Link>
          <Link to="/system-health/admins" className="text-gray-400 hover:text-white text-sm">
            Admin Control
          </Link>
          <Link to="/system-health/tournaments" className="text-gray-400 hover:text-white text-sm">
            All Tournaments
          </Link>
          <Link to="/system-health/financial" className="text-gray-400 hover:text-white text-sm">
            Financial
          </Link>
          <Link to="/system-health/logs" className="text-gray-400 hover:text-white text-sm">
            Audit Logs
          </Link>
          <Link to="/system-health/export" className="text-gray-400 hover:text-white text-sm">
            Export Data
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-white mt-2">{stats?.counts.users || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Active Admins</p>
            <p className="text-3xl font-bold text-orange-400 mt-2">{stats?.counts.admins || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Tournaments</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{stats?.counts.tournaments || 0}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-green-400 mt-2">
              {formatCurrency(stats?.financial.totalRevenue || 0)}
            </p>
          </div>
        </div>

        {/* Tournament Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Tournament Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Setup (Draft)</span>
                <span className="text-yellow-400 font-semibold">{stats?.tournamentStats?.setup || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Live</span>
                <span className="text-green-400 font-semibold">{stats?.tournamentStats?.live || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Paused</span>
                <span className="text-orange-400 font-semibold">{stats?.tournamentStats?.paused || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Completed</span>
                <span className="text-blue-400 font-semibold">{stats?.tournamentStats?.completed || 0}</span>
              </div>
            </div>
          </div>

          {/* Recent Admin Activity */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Recent Admin Logins</h2>
            <div className="space-y-3">
              {stats?.recentAdminLogins?.length === 0 && (
                <p className="text-gray-500">No admin logins recorded</p>
              )}
              {stats?.recentAdminLogins?.map((admin) => (
                <div key={admin.id} className="flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm">{admin.name}</p>
                    <p className="text-gray-500 text-xs">{admin.email}</p>
                  </div>
                  <span className="text-gray-400 text-xs">{formatDate(admin.last_login)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/system-health/admins"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm"
            >
              Manage Admins
            </Link>
            <Link
              to="/system-health/financial"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              View Financial Data
            </Link>
            <Link
              to="/system-health/logs"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              View All Logs
            </Link>
            <Link
              to="/system-health/export"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
            >
              Export All Data
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
