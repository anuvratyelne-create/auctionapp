import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Pause,
  Trash2,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Trophy,
  Clock,
  ExternalLink
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../utils/adminApi';

interface Tournament {
  id: string;
  name: string;
  share_code: string;
  status: string;
  approval_status: string;
  sports_type: string;
  total_points: number;
  created_at: string;
  owner?: { id: string; name: string; email: string };
  team_count: number;
  player_count: number;
  admin_notes?: string;
}

function TournamentDetailsModal({
  tournament,
  onClose,
  onApprove,
  onReject,
  onChangeStatus,
  onDelete
}: {
  tournament: Tournament;
  onClose: () => void;
  onApprove: (notes?: string) => void;
  onReject: (notes?: string) => void;
  onChangeStatus: (status: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(tournament.admin_notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusColors: Record<string, string> = {
    setup: 'bg-slate-500/20 text-slate-400',
    live: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-amber-500/20 text-amber-400',
    completed: 'bg-blue-500/20 text-blue-400',
  };

  const approvalColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Tournament Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white">{tournament.name}</h3>
              <p className="text-slate-500 font-mono">{tournament.share_code}</p>
              <div className="flex gap-2 mt-2">
                <span className={`px-2 py-1 text-xs rounded-full ${statusColors[tournament.status]}`}>
                  {tournament.status}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${approvalColors[tournament.approval_status]}`}>
                  {tournament.approval_status}
                </span>
              </div>
            </div>
            <a
              href={`/live/${tournament.share_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <ExternalLink size={20} />
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-rose-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{tournament.team_count}</p>
              <p className="text-sm text-slate-500">Teams</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{tournament.player_count}</p>
              <p className="text-sm text-slate-500">Players</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{tournament.total_points.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Budget</p>
            </div>
          </div>

          {/* Owner Info */}
          {tournament.owner && (
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Tournament Owner</h4>
              <p className="text-white font-medium">{tournament.owner.name || 'N/A'}</p>
              <p className="text-sm text-slate-500">{tournament.owner.email}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Admin Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              placeholder="Add notes about this tournament..."
            />
          </div>

          {/* Actions */}
          <div className="border-t border-slate-800 pt-6 space-y-4">
            {/* Approval Actions */}
            {tournament.approval_status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(notes)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  <CheckCircle size={18} />
                  Approve Tournament
                </button>
                <button
                  onClick={() => onReject(notes)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl"
                >
                  <XCircle size={18} />
                  Reject Tournament
                </button>
              </div>
            )}

            {/* Status Actions */}
            {showDeleteConfirm ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 font-medium">Are you sure you want to delete this tournament?</p>
                <p className="text-sm text-slate-400 mt-1">This will delete all teams, players, and bids. This action cannot be undone.</p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={onDelete}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                  >
                    Yes, Delete Tournament
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
                {tournament.status === 'live' && (
                  <button
                    onClick={() => onChangeStatus('paused')}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                  >
                    <Pause size={18} />
                    Force Pause
                  </button>
                )}
                {tournament.status === 'paused' && (
                  <button
                    onClick={() => onChangeStatus('live')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                  >
                    <CheckCircle size={18} />
                    Resume
                  </button>
                )}
                <button
                  onClick={() => onChangeStatus('completed')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                >
                  <CheckCircle size={18} />
                  Mark Complete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TournamentManagement() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getTournaments({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        approval_status: approvalFilter || undefined,
      });
      setTournaments(response.tournaments);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, approvalFilter]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTournaments();
  };

  const handleApprove = async (tournamentId: string, notes?: string) => {
    try {
      await adminApi.approveTournament(tournamentId, 'approved', notes);
      loadTournaments();
      setSelectedTournament(null);
    } catch (error) {
      console.error('Failed to approve tournament:', error);
    }
  };

  const handleReject = async (tournamentId: string, notes?: string) => {
    try {
      await adminApi.approveTournament(tournamentId, 'rejected', notes);
      loadTournaments();
      setSelectedTournament(null);
    } catch (error) {
      console.error('Failed to reject tournament:', error);
    }
  };

  const handleChangeStatus = async (tournamentId: string, status: string) => {
    try {
      if (status === 'paused') {
        await adminApi.forcePauseTournament(tournamentId);
      } else {
        await adminApi.updateTournamentStatus(tournamentId, status);
      }
      loadTournaments();
      setSelectedTournament(null);
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  const handleDelete = async (tournamentId: string) => {
    try {
      await adminApi.deleteTournament(tournamentId);
      loadTournaments();
      setSelectedTournament(null);
    } catch (error) {
      console.error('Failed to delete tournament:', error);
    }
  };

  const statusColors: Record<string, string> = {
    setup: 'bg-slate-500/20 text-slate-400',
    live: 'bg-emerald-500/20 text-emerald-400',
    paused: 'bg-amber-500/20 text-amber-400',
    completed: 'bg-blue-500/20 text-blue-400',
  };

  const approvalColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
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
            placeholder="Search by name or share code..."
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
            <option value="setup">Setup</option>
            <option value="live">Live</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={approvalFilter}
            onChange={(e) => {
              setApprovalFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
          >
            <option value="">All Approval</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Tournament</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Owner</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Approval</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Teams/Players</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Created</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : tournaments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No tournaments found
                  </td>
                </tr>
              ) : (
                tournaments.map((tournament) => (
                  <tr key={tournament.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{tournament.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{tournament.share_code}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-300 text-sm">{tournament.owner?.name || 'N/A'}</p>
                      <p className="text-slate-500 text-xs">{tournament.owner?.email || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[tournament.status]}`}>
                        {tournament.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${approvalColors[tournament.approval_status]}`}>
                        {tournament.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {tournament.team_count} / {tournament.player_count}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(tournament.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedTournament(tournament)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      >
                        <Eye size={18} />
                      </button>
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

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <TournamentDetailsModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onApprove={(notes) => handleApprove(selectedTournament.id, notes)}
          onReject={(notes) => handleReject(selectedTournament.id, notes)}
          onChangeStatus={(status) => handleChangeStatus(selectedTournament.id, status)}
          onDelete={() => handleDelete(selectedTournament.id)}
        />
      )}
    </AdminLayout>
  );
}
