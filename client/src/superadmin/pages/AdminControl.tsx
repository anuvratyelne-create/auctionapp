import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { saApi } from '../utils/saApi';

interface Admin {
  id: string;
  email: string;
  name: string;
  status: string;
  last_login: string;
  created_at: string;
}

export default function AdminControl() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await saApi.getAdmins();
      setAdmins(data);
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Suspend this admin? They will lose access immediately.')) return;
    setActionLoading(id);
    try {
      await saApi.suspendAdmin(id, 'Suspended by system owner');
      await loadAdmins();
      setMessage({ type: 'success', text: 'Admin suspended successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to suspend admin' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    setActionLoading(id);
    try {
      await saApi.activateAdmin(id);
      await loadAdmins();
      setMessage({ type: 'success', text: 'Admin activated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to activate admin' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('DELETE this admin permanently? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All their access will be removed.')) return;
    setActionLoading(id);
    try {
      await saApi.deleteAdmin(id);
      await loadAdmins();
      setMessage({ type: 'success', text: 'Admin deleted successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete admin' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!showPasswordModal || !newPassword) return;
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setActionLoading(showPasswordModal);
    try {
      await saApi.resetAdminPassword(showPasswordModal, newPassword);
      setShowPasswordModal(null);
      setNewPassword('');
      setMessage({ type: 'success', text: 'Password reset successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset password' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading admins...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-mono text-gray-300">Admin Control Panel</h1>
            <p className="text-gray-500 text-sm">Manage all administrator accounts</p>
          </div>
          <Link to="/system-health/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded ${
              message.type === 'success'
                ? 'bg-green-900/50 border border-green-500 text-green-300'
                : 'bg-red-900/50 border border-red-500 text-red-300'
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="float-right text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Admin Count */}
        <div className="mb-6">
          <p className="text-gray-400">
            Total Admins: <span className="text-orange-400 font-bold">{admins.length}</span>
          </p>
        </div>

        {/* Admin Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Admin</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Status</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Last Login</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Created</th>
                <th className="text-right px-6 py-4 text-gray-400 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{admin.name}</p>
                    <p className="text-gray-500 text-sm">{admin.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        admin.status === 'active'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {admin.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(admin.last_login)}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(admin.created_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {admin.status === 'active' ? (
                        <button
                          onClick={() => handleSuspend(admin.id)}
                          disabled={actionLoading === admin.id}
                          className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm disabled:opacity-50"
                        >
                          {actionLoading === admin.id ? '...' : 'Suspend'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(admin.id)}
                          disabled={actionLoading === admin.id}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                        >
                          {actionLoading === admin.id ? '...' : 'Activate'}
                        </button>
                      )}
                      <button
                        onClick={() => setShowPasswordModal(admin.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Reset Pwd
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
                        disabled={actionLoading === admin.id}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Reset Admin Password</h3>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 chars)"
              className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-3 text-white mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={actionLoading === showPasswordModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {actionLoading === showPasswordModal ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
