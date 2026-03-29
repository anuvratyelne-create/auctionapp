import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, X, TrendingDown } from 'lucide-react';
import { Team } from '../../types';

interface BudgetAlert {
  id: string;
  team: Team;
  level: 'warning' | 'critical';
  percentage: number;
  timestamp: number;
}

interface BudgetAlertsProps {
  teams: Team[];
  totalBudget: number;
  currentBiddingTeam?: Team | null; // The team that just placed a bid
}

export default function BudgetAlerts({ teams, totalBudget, currentBiddingTeam }: BudgetAlertsProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [shownAlerts, setShownAlerts] = useState<Set<string>>(new Set()); // Track which alerts we've shown
  const lastBiddingTeamId = useRef<string | null>(null);

  // Check budget only when a team places a bid
  useEffect(() => {
    if (!currentBiddingTeam) return;

    // Only trigger when a new team bids (not the same team repeatedly)
    if (lastBiddingTeamId.current === currentBiddingTeam.id) return;
    lastBiddingTeamId.current = currentBiddingTeam.id;

    // Find the updated team data from teams array
    const teamData = teams.find(t => t.id === currentBiddingTeam.id);
    if (!teamData) return;

    const remainingBudget = teamData.remaining_budget || (totalBudget - (teamData.spent_points || 0));
    const percentage = (remainingBudget / totalBudget) * 100;

    // Generate unique keys for alert levels
    const criticalKey = `${teamData.id}-critical`;
    const warningKey = `${teamData.id}-warning`;

    let alertToShow: BudgetAlert | null = null;

    if (percentage <= 10 && !shownAlerts.has(criticalKey)) {
      alertToShow = {
        id: criticalKey,
        team: teamData,
        level: 'critical',
        percentage: Math.round(percentage),
        timestamp: Date.now()
      };
      setShownAlerts(prev => new Set(prev).add(criticalKey));
    } else if (percentage <= 20 && percentage > 10 && !shownAlerts.has(warningKey)) {
      alertToShow = {
        id: warningKey,
        team: teamData,
        level: 'warning',
        percentage: Math.round(percentage),
        timestamp: Date.now()
      };
      setShownAlerts(prev => new Set(prev).add(warningKey));
    }

    if (alertToShow) {
      setAlerts(prev => [...prev, alertToShow!]);
    }
  }, [currentBiddingTeam, teams, totalBudget, shownAlerts]);

  // Auto-dismiss alerts after 8 seconds
  useEffect(() => {
    if (alerts.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setAlerts(prev => prev.filter(alert => now - alert.timestamp < 8000));
    }, 1000);

    return () => clearInterval(timer);
  }, [alerts.length]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {alerts.map(alert => {
        const timeRemaining = Math.max(0, 8000 - (Date.now() - alert.timestamp));
        const progressWidth = (timeRemaining / 8000) * 100;

        return (
          <div
            key={alert.id}
            className={`
              relative overflow-hidden rounded-xl p-4 shadow-2xl backdrop-blur-md
              border-2 transform transition-all duration-300
              ${alert.level === 'critical'
                ? 'bg-gradient-to-br from-red-900/95 to-red-800/95 border-red-500'
                : 'bg-gradient-to-br from-amber-900/95 to-amber-800/95 border-amber-500'
              }
            `}
            style={{
              animation: 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {/* Progress bar for auto-dismiss */}
            <div
              className={`absolute bottom-0 left-0 h-1.5 transition-all ${
                alert.level === 'critical' ? 'bg-red-400' : 'bg-amber-400'
              }`}
              style={{
                width: `${progressWidth}%`,
                transition: 'width 1s linear'
              }}
            />

            <div className="flex items-start gap-3">
              {/* Team Logo */}
              <div className={`p-2 rounded-xl ${
                alert.level === 'critical'
                  ? 'bg-red-500/30 ring-2 ring-red-500/50'
                  : 'bg-amber-500/30 ring-2 ring-amber-500/50'
              }`}>
                {alert.team.logo_url ? (
                  <img
                    src={alert.team.logo_url}
                    alt={alert.team.short_name}
                    className="w-8 h-8 rounded object-contain"
                  />
                ) : (
                  alert.level === 'critical' ? (
                    <AlertTriangle size={24} className="text-red-400" />
                  ) : (
                    <TrendingDown size={24} className="text-amber-400" />
                  )
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-lg">{alert.team.short_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    alert.level === 'critical'
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {alert.level === 'critical' ? 'CRITICAL' : 'WARNING'}
                  </span>
                </div>
                <p className="text-sm text-white font-medium">
                  {alert.level === 'critical'
                    ? `Only ${alert.percentage}% budget remaining!`
                    : `Low budget alert: ${alert.percentage}% left`
                  }
                </p>
                <p className="text-xs text-white/70 mt-1 font-mono">
                  ₹{alert.team.remaining_budget?.toLocaleString('en-IN')} available
                </p>
              </div>

              {/* Close button */}
              <button
                onClick={() => dismissAlert(alert.id)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={18} className="text-white/80" />
              </button>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(120%) scale(0.8);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
