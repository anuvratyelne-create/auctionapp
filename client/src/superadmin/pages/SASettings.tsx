import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSuperAdminStore } from '../stores/superAdminStore';
import { saApi } from '../utils/saApi';

export default function SASettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { superAdmin, logout } = useSuperAdminStore();
  const navigate = useNavigate();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    try {
      await saApi.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/system-health');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-mono text-gray-300">Settings</h1>
            <p className="text-gray-500 text-sm">System owner account settings</p>
          </div>
          <Link to="/system-health/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Account Info */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Account Information</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-500 text-sm">Name</label>
                <p className="text-white">{superAdmin?.name}</p>
              </div>
              <div>
                <label className="text-gray-500 text-sm">Email</label>
                <p className="text-white">{superAdmin?.email}</p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Change Password</h2>

            {message && (
              <div
                className={`mb-4 px-4 py-3 rounded ${
                  message.type === 'success'
                    ? 'bg-green-900/50 border border-green-500 text-green-300'
                    : 'bg-red-900/50 border border-red-500 text-red-300'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Logout */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Session</h2>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Security Note */}
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded">
            <p className="text-gray-500 text-sm">
              <strong className="text-gray-400">Security:</strong> This account has full system access.
              Keep your credentials secure and never share them.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
