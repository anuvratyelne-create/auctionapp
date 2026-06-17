import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { socketClient } from '../../socket/client';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    const unsubscribe = socketClient.onConnectionStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi size={14} />,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          borderColor: 'border-emerald-500/30',
          label: 'Connected',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: <Loader2 size={14} className="animate-spin" />,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/20',
          borderColor: 'border-amber-500/30',
          label: 'Connecting...',
          pulse: true,
        };
      case 'error':
        return {
          icon: <WifiOff size={14} />,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          label: 'Connection Error',
          pulse: true,
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff size={14} />,
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/20',
          borderColor: 'border-slate-500/30',
          label: 'Disconnected',
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
        ${config.bgColor} ${config.borderColor} border
        ${config.pulse ? 'animate-pulse' : ''}
        transition-all duration-300
      `}
      title={config.label}
    >
      <span className={config.color}>{config.icon}</span>
      <span className={`${config.color} hidden sm:inline`}>{config.label}</span>
    </div>
  );
}
