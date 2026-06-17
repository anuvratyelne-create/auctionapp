import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Trophy,
  Gavel,
  TrendingUp,
  DollarSign,
  Clock,
  MapPin,
  ArrowRight,
  Loader2
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../utils/adminApi';

interface OverviewStats {
  users: { total: number; today: number; week: number; month: number };
  tournaments: { total: number; pending: number; active: number };
  auctions: { playersSold: number; totalBidValue: number };
}

interface LocationStats {
  states: Array<{ name: string; count: number }>;
  cities: Array<{ name: string; count: number }>;
}

interface TrendData {
  date: string;
  count: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  subLabel,
  color,
  onClick
}: {
  icon: any;
  label: string;
  value: number | string;
  subValue?: number | string;
  subLabel?: string;
  color: 'rose' | 'emerald' | 'blue' | 'amber';
  onClick?: () => void;
}) {
  const colors = {
    rose: 'from-rose-500 to-red-600 text-rose-400',
    emerald: 'from-emerald-500 to-green-600 text-emerald-400',
    blue: 'from-blue-500 to-indigo-600 text-blue-400',
    amber: 'from-amber-500 to-orange-600 text-amber-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 ${
        onClick ? 'cursor-pointer hover:border-slate-700 transition-colors' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color].split(' ').slice(0, 2).join(' ')} flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        {onClick && <ArrowRight size={20} className="text-slate-600" />}
      </div>
      <p className="mt-4 text-slate-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color].split(' ')[2]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subValue !== undefined && (
        <p className="text-sm text-slate-500 mt-1">
          <span className="text-emerald-400">+{subValue}</span> {subLabel}
        </p>
      )}
    </div>
  );
}

function TrendChart({ data, label }: { data: TrendData[]; label: string }) {
  if (!data.length) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const recentData = data.slice(-14); // Last 14 days

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{label}</h3>
      <div className="flex items-end gap-1 h-32">
        {recentData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-gradient-to-t from-rose-500 to-red-400 rounded-t"
              style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
            />
            {i % 2 === 0 && (
              <span className="text-[10px] text-slate-600">{d.date.slice(5)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  const maxCount = Math.max(...items.map(i => i.count), 1);

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <MapPin size={18} className="text-rose-400" />
        {title}
      </h3>
      <div className="space-y-3">
        {items.slice(0, 5).map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">{item.name || 'Unknown'}</span>
              <span className="text-slate-500">{item.count}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-500 text-sm">No data available</p>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [locations, setLocations] = useState<LocationStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, trendsData, locationData] = await Promise.all([
        adminApi.getOverviewStats(),
        adminApi.getUserTrends(30),
        adminApi.getLocationStats(),
      ]);
      setStats(overviewData);
      setTrends(trendsData);
      setLocations(locationData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.users.total || 0}
          subValue={stats?.users.today || 0}
          subLabel="today"
          color="rose"
          onClick={() => navigate('/admin/users')}
        />
        <StatCard
          icon={Trophy}
          label="Total Tournaments"
          value={stats?.tournaments.total || 0}
          subValue={stats?.tournaments.pending || 0}
          subLabel="pending approval"
          color="amber"
          onClick={() => navigate('/admin/tournaments')}
        />
        <StatCard
          icon={Gavel}
          label="Active Auctions"
          value={stats?.tournaments.active || 0}
          color="emerald"
          onClick={() => navigate('/admin/auctions')}
        />
        <StatCard
          icon={DollarSign}
          label="Total Bid Value"
          value={stats?.auctions.totalBidValue.toLocaleString() || 0}
          subValue={stats?.auctions.playersSold || 0}
          subLabel="players sold"
          color="blue"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={TrendingUp}
          label="New Users This Week"
          value={stats?.users.week || 0}
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="New Users This Month"
          value={stats?.users.month || 0}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Pending Approvals"
          value={stats?.tournaments.pending || 0}
          color="amber"
          onClick={() => navigate('/admin/tournaments?status=pending')}
        />
      </div>

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrendChart data={trends} label="User Registrations (Last 14 Days)" />
        </div>
        <div className="space-y-6">
          <LocationList title="Top States" items={locations?.states || []} />
          <LocationList title="Top Cities" items={locations?.cities || []} />
        </div>
      </div>
    </AdminLayout>
  );
}
