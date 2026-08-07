import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { saApi } from '../utils/saApi';

interface AdminLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: object;
  ip_address: string;
  created_at: string;
  admin?: { name: string; email: string };
}

interface AuthLog {
  id: string;
  action: string;
  success: boolean;
  ip_address: string;
  created_at: string;
  user?: { name: string; email: string };
}

type LogTab = 'admin' | 'auth' | 'super';

export default function AuditLogs() {
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [superLogs, setSuperLogs] = useState<AdminLog[]>([]);
  const [activeTab, setActiveTab] = useState<LogTab>('admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const [admin, auth, superAdmin] = await Promise.all([
        saApi.getAdminLogs(),
        saApi.getAuthLogs(),
        saApi.getSuperLogs(),
      ]);
      setAdminLogs(admin);
      setAuthLogs(auth);
      setSuperLogs(superAdmin);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN');
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('suspend')) return 'text-red-400';
    if (action.includes('create') || action.includes('add')) return 'text-green-400';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-400';
    if (action.includes('login')) return 'text-purple-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-mono text-gray-300">Audit Logs</h1>
            <p className="text-gray-500 text-sm">Complete activity history</p>
          </div>
          <Link to="/system-health/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800/50 border-b border-gray-700 px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'admin'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Admin Actions ({adminLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('auth')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'auth'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Auth Logs ({authLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('super')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'super'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            System Logs ({superLogs.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6">
        {/* Admin Actions Tab */}
        {activeTab === 'admin' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-gray-300">Admin Activity Log</h2>
              <p className="text-gray-500 text-sm">All actions performed by regular admins</p>
            </div>
            {adminLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No admin logs found</div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {adminLogs.map((log) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-700/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          by {log.admin?.name || 'Unknown'} ({log.admin?.email})
                        </p>
                        {log.target_type && (
                          <p className="text-gray-500 text-xs mt-1">
                            Target: {log.target_type} {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">{formatDate(log.created_at)}</p>
                        <p className="text-gray-600 text-xs mt-1">{log.ip_address}</p>
                      </div>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre className="mt-2 text-xs text-gray-500 bg-gray-700/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Auth Logs Tab */}
        {activeTab === 'auth' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-gray-300">Authentication Log</h2>
              <p className="text-gray-500 text-sm">All login/logout activity</p>
            </div>
            {authLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No auth logs found</div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {authLogs.map((log) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-700/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${log.success ? 'text-green-400' : 'text-red-400'}`}>
                          {log.action.toUpperCase()} - {log.success ? 'SUCCESS' : 'FAILED'}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                          {log.user?.name || 'Unknown'} ({log.user?.email || 'N/A'})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">{formatDate(log.created_at)}</p>
                        <p className="text-gray-600 text-xs mt-1">{log.ip_address}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Super Admin Logs Tab */}
        {activeTab === 'super' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-gray-300">System Owner Activity</h2>
              <p className="text-gray-500 text-sm">Your activity log (hidden from admins)</p>
            </div>
            {superLogs.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No system logs found</div>
            ) : (
              <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                {superLogs.map((log) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-700/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={`font-medium ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        {log.target_type && (
                          <p className="text-gray-500 text-xs mt-1">
                            Target: {log.target_type} {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ''}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">{formatDate(log.created_at)}</p>
                        <p className="text-gray-600 text-xs mt-1">{log.ip_address}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
