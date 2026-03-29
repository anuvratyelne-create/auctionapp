import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'gold' | 'success' | 'danger' | 'purple' | 'blue';
  trend?: {
    value: number;
    label: string;
  };
  animate?: boolean;
}

const variantStyles = {
  default: {
    gradient: 'from-slate-800/80 to-slate-900/80',
    border: 'border-slate-700/50',
    iconBg: 'from-primary-600 to-primary-800',
    valueColor: 'text-white',
    glow: '',
  },
  gold: {
    gradient: 'from-amber-900/30 to-amber-950/30',
    border: 'border-amber-500/30',
    iconBg: 'from-amber-500 to-amber-700',
    valueColor: 'text-amber-400',
    glow: 'shadow-gold',
  },
  success: {
    gradient: 'from-emerald-900/30 to-emerald-950/30',
    border: 'border-emerald-500/30',
    iconBg: 'from-emerald-500 to-emerald-700',
    valueColor: 'text-emerald-400',
    glow: 'shadow-success',
  },
  danger: {
    gradient: 'from-red-900/30 to-red-950/30',
    border: 'border-red-500/30',
    iconBg: 'from-red-500 to-red-700',
    valueColor: 'text-red-400',
    glow: '',
  },
  purple: {
    gradient: 'from-purple-900/30 to-purple-950/30',
    border: 'border-purple-500/30',
    iconBg: 'from-purple-500 to-purple-700',
    valueColor: 'text-purple-400',
    glow: '',
  },
  blue: {
    gradient: 'from-blue-900/30 to-blue-950/30',
    border: 'border-blue-500/30',
    iconBg: 'from-blue-500 to-blue-700',
    valueColor: 'text-blue-400',
    glow: 'shadow-glow-sm',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  animate = true,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border ${styles.border}
        bg-gradient-to-br ${styles.gradient}
        backdrop-blur-sm p-5
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-card-hover
        ${styles.glow}
        ${animate ? 'animate-fade-in' : ''}
      `}
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">{title}</p>
          {Icon && (
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${styles.iconBg} shadow-lg`}>
              <Icon size={20} className="text-white" />
            </div>
          )}
        </div>

        <p className={`text-3xl font-bold ${styles.valueColor} tracking-tight`}>
          {value}
        </p>

        {subtitle && (
          <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
        )}

        {trend && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
            <span
              className={`
                text-sm font-semibold px-2 py-0.5 rounded-full
                ${trend.value >= 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
                }
              `}
            >
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-slate-500">{trend.label}</span>
          </div>
        )}
      </div>

      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
}
