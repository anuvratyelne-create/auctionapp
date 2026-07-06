import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Ban,
  CheckCircle,
  Key,
  Trash2,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Trophy,
  Pencil,
  Save
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../utils/adminApi';

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  state?: string;
  city?: string;
  created_at: string;
  last_login?: string;
  suspended_at?: string;
  suspension_reason?: string;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  share_code: string;
  created_at: string;
}

function UserDetailsModal({
  user,
  onClose,
  onStatusChange,
  onResetPassword,
  onDelete,
  onUpdate
}: {
  user: User;
  onClose: () => void;
  onStatusChange: (status: 'active' | 'suspended', reason?: string) => void;
  onResetPassword: (password: string) => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<User>) => Promise<void>;
}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name || '',
    email: user.email || '',
    mobile: user.mobile || '',
    state: user.state || '',
    city: user.city || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await onUpdate(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, [user.id]);

  const loadTournaments = async () => {
    try {
      const data = await adminApi.getUserTournaments(user.id);
      setTournaments(data);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSuspended = !!user.suspended_at;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">User Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <Pencil size={16} />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">Mobile</label>
                  <input
                    type="text"
                    value={editData.mobile}
                    onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">State</label>
                  <input
                    type="text"
                    value={editData.state}
                    onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-slate-500 mb-1 block">City</label>
                  <input
                    type="text"
                    value={editData.city}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      name: user.name || '',
                      email: user.email || '',
                      mobile: user.mobile || '',
                      state: user.state || '',
                      city: user.city || '',
                    });
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500">Name</label>
                <p className="text-white font-medium">{user.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">Email</label>
                <p className="text-white font-medium">{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">Mobile</label>
                <p className="text-white font-medium">{user.mobile}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">Location</label>
                <p className="text-white font-medium">{user.city || '-'}, {user.state || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500">Registered</label>
                <p className="text-white font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-slate-500">Last Login</label>
                <p className="text-white font-medium">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          )}

          {/* Status */}
          {isSuspended && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 font-medium">Account Suspended</p>
              <p className="text-sm text-slate-400 mt-1">{user.suspension_reason}</p>
            </div>
          )}

          {/* Tournaments */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              Tournaments ({tournaments.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
              </div>
            ) : tournaments.length === 0 ? (
              <p className="text-slate-500 text-sm">No tournaments created</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tournaments.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.share_code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      t.status === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                      t.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-slate-800 pt-6 space-y-4">
            {/* Suspend/Activate */}
            {showSuspendForm ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Reason for suspension"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onStatusChange('suspended', suspendReason);
                      setShowSuspendForm(false);
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                  >
                    Confirm Suspend
                  </button>
                  <button
                    onClick={() => setShowSuspendForm(false)}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : showResetPassword ? (
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newPassword.length >= 6) {
                        onResetPassword(newPassword);
                        setShowResetPassword(false);
                        setNewPassword('');
                      }
                    }}
                    disabled={newPassword.length < 6}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => {
                      setShowResetPassword(false);
                      setNewPassword('');
                    }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : showDeleteConfirm ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 font-medium">Are you sure you want to delete this user?</p>
                <p className="text-sm text-slate-400 mt-1">This will delete all their tournaments and data. This action cannot be undone.</p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={onDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                  >
                    Yes, Delete User
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {isSuspended ? (
                  <button
                    onClick={() => onStatusChange('active')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                  >
                    <CheckCircle size={18} />
                    Activate Account
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSuspendForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                  >
                    <Ban size={18} />
                    Suspend Account
                  </button>
                )}
                <button
                  onClick={() => setShowResetPassword(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  <Key size={18} />
                  Reset Password
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  <Trash2 size={18} />
                  Delete User
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getUsers({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleStatusChange = async (userId: string, status: 'active' | 'suspended', reason?: string) => {
    try {
      await adminApi.updateUserStatus(userId, status, reason);
      loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      await adminApi.resetUserPassword(userId, newPassword);
      alert('Password reset successfully');
      setSelectedUser(null);
    } catch (error: any) {
      alert(error.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      loadUsers();
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      await adminApi.updateUser(userId, updates);
      loadUsers();
      // Update the selected user with new data
      setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      alert(error.message || 'Failed to update user');
      throw error;
    }
  };

  return (
    <AdminLayout>
      {/* Search & Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or mobile..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">User</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Contact</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Location</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Registered</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{user.name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{user.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 text-sm">{user.email}</p>
                      <p className="text-slate-500 text-xs">{user.mobile}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {user.city || '-'}, {user.state || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.suspended_at
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {user.suspended_at ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {actionMenuUser === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setActionMenuUser(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setActionMenuUser(null);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700"
                              >
                                <Eye size={16} />
                                View Details
                              </button>
                              {user.suspended_at ? (
                                <button
                                  onClick={() => {
                                    handleStatusChange(user.id, 'active');
                                    setActionMenuUser(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-emerald-400 hover:bg-slate-700"
                                >
                                  <CheckCircle size={16} />
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setActionMenuUser(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-left text-amber-400 hover:bg-slate-700"
                                >
                                  <Ban size={16} />
                                  Suspend
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusChange={(status, reason) => handleStatusChange(selectedUser.id, status, reason)}
          onResetPassword={(password) => handleResetPassword(selectedUser.id, password)}
          onDelete={() => handleDeleteUser(selectedUser.id)}
          onUpdate={(updates) => handleUpdateUser(selectedUser.id, updates)}
        />
      )}
    </AdminLayout>
  );
}
