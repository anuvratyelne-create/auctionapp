import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Filter,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Shield
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../utils/adminApi';

interface AuthLog {
  id: string;
  user_id: string;
  action: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: { id: string; name: string; email: string };
}

interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
  admin?: { id: string; name: string; email: string };
}

type LogType = 'admin' | 'auth';

export default function AuditLogs() {
  const [logType, setLogType] = useState<LogType>('admin');
  const [logs, setLogs] = useState<(AuthLog | AdminLog)[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (logType === 'admin') {
        const response = await adminApi.getAdminLogs({
          page,
          limit: 50,
          action: actionFilter || undefined,
          target_type: targetTypeFilter || undefined,
        });
        setLogs(response.logs);
        setTotalPages(response.pagination.totalPages);
      } else {
        const response = await adminApi.getAuthLogs({
          page,
          limit: 50,
          action: actionFilter || undefined,
        });
        setLogs(response.logs);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  }, [logType, page, actionFilter, targetTypeFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportLogs(logType, 30);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${logType}_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const formatAction = (action: string): { label: string; color: string } => {
    const actionMap: Record<string, { label: string; color: string }> = {
      login: { label: 'Login', color: 'bg-emerald-500/20 text-emerald-400' },
      logout: { label: 'Logout', color: 'bg-slate-500/20 text-slate-400' },
      failed_login: { label: 'Failed Login', color: 'bg-red-500/20 text-red-400' },
      user_suspended: { label: 'User Suspended', color: 'bg-amber-500/20 text-amber-400' },
      user_activated: { label: 'User Activated', color: 'bg-emerald-500/20 text-emerald-400' },
      user_deleted: { label: 'User Deleted', color: 'bg-red-500/20 text-red-400' },
      user_password_reset: { label: 'Password Reset', color: 'bg-blue-500/20 text-blue-400' },
      tournament_approved: { label: 'Tournament Approved', color: 'bg-emerald-500/20 text-emerald-400' },
      tournament_rejected: { label: 'Tournament Rejected', color: 'bg-red-500/20 text-red-400' },
      tournament_deleted: { label: 'Tournament Deleted', color: 'bg-red-500/20 text-red-400' },
      tournament_force_paused: { label: 'Tournament Paused', color: 'bg-amber-500/20 text-amber-400' },
      tournament_status_changed: { label: 'Status Changed', color: 'bg-blue-500/20 text-blue-400' },
      auction_force_stopped: { label: 'Auction Stopped', color: 'bg-red-500/20 text-red-400' },
      auction_undo_sale: { label: 'Sale Undone', color: 'bg-amber-500/20 text-amber-400' },
      player_reset: { label: 'Player Reset', color: 'bg-blue-500/20 text-blue-400' },
      setting_updated: { label: 'Setting Updated', color: 'bg-blue-500/20 text-blue-400' },
      maintenance_enabled: { label: 'Maintenance On', color: 'bg-amber-500/20 text-amber-400' },
      maintenance_disabled: { label: 'Maintenance Off', color: 'bg-emerald-500/20 text-emerald-400' },
      logs_exported: { label: 'Logs Exported', color: 'bg-blue-500/20 text-blue-400' },
    };

    return actionMap[action] || { label: action, color: 'bg-slate-500/20 text-slate-400' };
  };

  const adminActions = [
    'login', 'logout', 'user_suspended', 'user_activated', 'user_deleted',
    'user_password_reset', 'tournament_approved', 'tournament_rejected',
    'tournament_deleted', 'tournament_force_paused', 'tournament_status_changed',
    'auction_force_stopped', 'auction_undo_sale', 'player_reset',
    'setting_updated', 'maintenance_enabled', 'maintenance_disabled'
  ];

  const authActions = ['login', 'logout', 'failed_login', 'switch_tournament'];

  const targetTypes = ['user', 'tournament', 'auction', 'system'];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-slate-400 mt-1">View all system and authentication logs</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Download size={18} />
          )}
          Export CSV
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="mb-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLogType('admin');
              setPage(1);
              setActionFilter('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              logType === 'admin'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Shield size={18} />
            Admin Logs
          </button>
          <button
            onClick={() => {
              setLogType('auth');
              setPage(1);
              setActionFilter('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              logType === 'auth'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <User size={18} />
            Auth Logs
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Filter size={18} className="text-slate-500" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500"
          >
            <option value="">All Actions</option>
            {(logType === 'admin' ? adminActions : authActions).map(action => (
              <option key={action} value={action}>{formatAction(action).label}</option>
            ))}
          </select>

          {logType === 'admin' && (
            <select
              value={targetTypeFilter}
              onChange={(e) => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-rose-500"
            >
              <option value="">All Targets</option>
              {targetTypes.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Timestamp</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">
                  {logType === 'admin' ? 'Admin' : 'User'}
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Action</th>
                {logType === 'admin' && (
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Target</th>
                )}
                {logType === 'auth' && (
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                )}
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    No logs found
                  </td>
                </tr>
              ) : logType === 'admin' ? (
                (logs as AdminLog[]).map((log) => {
                  const { label, color } = formatAction(log.action);
                  return (
                    <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock size={14} className="text-slate-500" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{log.admin?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{log.admin?.email || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {log.target_type && (
                          <span className="capitalize">{log.target_type}</span>
                        )}
                        {log.target_id && (
                          <span className="text-xs text-slate-600 ml-2">
                            {log.target_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                (logs as AuthLog[]).map((log) => {
                  const { label, color } = formatAction(log.action);
                  return (
                    <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock size={14} className="text-slate-500" />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{log.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{log.user?.email || ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          log.success
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  );
                })
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
    </AdminLayout>
  );
}
