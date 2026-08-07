import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { saApi } from '../utils/saApi';

interface Tournament {
  id: string;
  name: string;
  share_code: string;
  status: string;
  sports_type: string;
  total_points: number;
  approval_status: string;
  created_at: string;
  auction_date: string;
  teams: { count: number }[];
  players: { count: number }[];
}

export default function AllTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<object | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await saApi.getTournaments();
      setTournaments(data);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const data = await saApi.getTournament(id);
      setSelectedTournament(data);
    } catch (error) {
      console.error('Failed to load tournament details:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-900/50 text-green-400';
      case 'completed':
        return 'bg-blue-900/50 text-blue-400';
      case 'paused':
        return 'bg-yellow-900/50 text-yellow-400';
      default:
        return 'bg-gray-700 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading tournaments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-mono text-gray-300">All Tournaments</h1>
            <p className="text-gray-500 text-sm">Complete tournament overview</p>
          </div>
          <Link to="/system-health/dashboard" className="text-gray-400 hover:text-white text-sm">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{tournaments.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Live</p>
            <p className="text-2xl font-bold text-green-400">
              {tournaments.filter((t) => t.status === 'live').length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Completed</p>
            <p className="text-2xl font-bold text-blue-400">
              {tournaments.filter((t) => t.status === 'completed').length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Setup</p>
            <p className="text-2xl font-bold text-yellow-400">
              {tournaments.filter((t) => t.status === 'setup').length}
            </p>
          </div>
        </div>

        {/* Tournament Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {tournaments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No tournaments found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Tournament</th>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Code</th>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Status</th>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Sport</th>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Budget</th>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Teams</th>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Players</th>
                  <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Created</th>
                  <th className="text-right px-6 py-4 text-gray-400 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {tournaments.map((tournament) => (
                  <tr key={tournament.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{tournament.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-purple-400 bg-gray-700 px-2 py-1 rounded text-sm">
                        {tournament.share_code}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tournament.status)}`}>
                        {tournament.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 capitalize">{tournament.sports_type}</td>
                    <td className="px-6 py-4 text-gray-400">{formatCurrency(tournament.total_points)}</td>
                    <td className="px-6 py-4 text-gray-400">{tournament.teams?.[0]?.count || 0}</td>
                    <td className="px-6 py-4 text-gray-400">{tournament.players?.[0]?.count || 0}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(tournament.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => viewDetails(tournament.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Tournament Detail Modal */}
      {selectedTournament && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Tournament Details</h3>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <pre className="text-sm text-gray-300 bg-gray-700/50 p-4 rounded overflow-x-auto">
                {JSON.stringify(selectedTournament, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
