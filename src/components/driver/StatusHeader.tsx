import { motion } from 'motion/react';
import { Wifi, WifiOff, Menu, MessageCircle, Moon, Sun, Zap } from 'lucide-react';
import { BusLogo } from '../ui/index';
import useAuthStore from '../../store/authStore';

interface StatusHeaderProps {
  isConnected: boolean;
  isReconnecting: boolean;
  isActive: boolean;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  onOpenMenu: () => void;
  onOpenChat: () => void;
}

export const StatusHeader = ({
  isConnected,
  isReconnecting,
  isActive,
  isNightMode,
  onToggleNightMode,
  onOpenMenu,
  onOpenChat
}: StatusHeaderProps) => {
  const { user } = useAuthStore();

  return (
    <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between z-40 relative glass-heavy border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand/10 rounded-xl">
          <BusLogo className="w-6 h-6 text-brand" />
        </div>
        <div>
          <h1 className="font-display font-bold text-base leading-none uppercase tracking-tight flex items-center gap-1.5">
            ShutliX <span className="text-brand">DRV</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
            }`}>
              <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
              {isActive ? 'Duty On' : 'Duty Off'}
            </div>
            
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              isReconnecting ? 'bg-amber-500/10 text-amber-500' : 
              isConnected ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {isReconnecting ? <Wifi className="w-2.5 h-2.5 animate-pulse" /> : 
               isConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {isReconnecting ? 'Sync' : isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onToggleNightMode}
          className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
        >
          {isNightMode ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenChat}
          className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors relative"
        >
          <MessageCircle size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full border-2 border-zinc-950" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenMenu}
          className="p-2.5 bg-brand text-white rounded-xl shadow-lg shadow-brand/20"
        >
          <Menu size={18} />
        </motion.button>
      </div>
    </header>
  );
};
