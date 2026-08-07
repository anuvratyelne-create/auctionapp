import { useState } from 'react';
import { Link } from 'react-router-dom';
import { saApi } from '../utils/saApi';

export default function ExportData() {
  const [exporting, setExporting] = useState(false);
  const [exportData, setExportData] = useState<object | null>(null);
  const [message, setMessage] = useState('');

  const handleExportAll = async () => {
    setExporting(true);
    setMessage('');
    try {
      const data = await saApi.exportAll();
      setExportData(data);
      setMessage('Data exported successfully. You can now download it.');
    } catch (error) {
      setMessage('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const downloadJSON = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auctionapp_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSummary = () => {
    if (!exportData || !(exportData as { data?: object }).data) return null;
    const data = (exportData as { data: Record<string, unknown[]> }).data;
    return {
      users: data.users?.length || 0,
      admins: data.admins?.length || 0,
      tournaments: data.tournaments?.length || 0,
      teams: data.teams?.length || 0,
      players: data.players?.length || 0,
      financial: data.financial?.length || 0,
    };
  };

  const summary = getSummary();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-mono text-gray-300">Export Data</h1>
            <p className="text-gray-500 text-sm">Download complete system data</p>
          </div>
          <Link to="/system-health/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Export Card */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Full System Export</h2>
            <p className="text-gray-400 mb-6">
              Export all data from the system including users, admins, tournaments, teams, players,
              and financial records. The export will be in JSON format.
            </p>

            <div className="bg-gray-700/50 rounded p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-2">This export includes:</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• All user accounts (passwords excluded)</li>
                <li>• All admin accounts (passwords excluded)</li>
                <li>• All tournaments with settings</li>
                <li>• All teams with budgets and rosters</li>
                <li>• All players with status and prices</li>
                <li>• All financial records</li>
              </ul>
            </div>

            <button
              onClick={handleExportAll}
              disabled={exporting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Generate Export'}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 px-4 py-3 rounded ${
                message.includes('success')
                  ? 'bg-green-900/50 border border-green-500 text-green-300'
                  : 'bg-red-900/50 border border-red-500 text-red-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Export Summary & Download */}
          {exportData && summary && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-gray-300 mb-4">Export Summary</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-xs">Users</p>
                  <p className="text-xl font-bold text-white">{summary.users}</p>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-xs">Admins</p>
                  <p className="text-xl font-bold text-orange-400">{summary.admins}</p>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-xs">Tournaments</p>
                  <p className="text-xl font-bold text-blue-400">{summary.tournaments}</p>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-xs">Teams</p>
                  <p className="text-xl font-bold text-purple-400">{summary.teams}</p>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-xs">Players</p>
                  <p className="text-xl font-bold text-green-400">{summary.players}</p>
                </div>
                <div className="bg-gray-700/50 rounded p-3">
                  <p className="text-gray-400 text-xs">Financial Records</p>
                  <p className="text-xl font-bold text-yellow-400">{summary.financial}</p>
                </div>
              </div>

              <button
                onClick={downloadJSON}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded transition-colors"
              >
                Download JSON File
              </button>
            </div>
          )}

          {/* Warning */}
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded">
            <p className="text-yellow-400 text-sm">
              <strong>Security Note:</strong> This export contains sensitive business data. Store it
              securely and do not share with unauthorized parties.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
