import { motion } from 'motion/react';
import { LogOut, X, Moon, Sun, Bell, Shield, Info, Smartphone } from 'lucide-react';
import useAuthStore from '../../store/authStore';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isNightMode: boolean;
  onToggleNightMode: () => void;
}

export const SettingsSheet = ({ isOpen, onClose, isNightMode, onToggleNightMode }: SettingsSheetProps) => {
  const { logout, user } = useAuthStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="relative w-full max-w-lg glass-heavy rounded-t-[32px] sm:rounded-[32px] h-[90vh] sm:h-auto overflow-hidden border border-white/10 shadow-2xl flex flex-col"
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <h2 className="text-xl font-display font-black text-white uppercase tracking-tight">Driver Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* User Profile Summary */}
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-brand font-display font-black text-2xl uppercase">
              {user?.name?.charAt(0) || 'D'}
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-none mb-1">{user?.name}</h3>
              <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{user?.role} Portal</p>
            </div>
          </div>

          {/* Preferences Section */}
          <div>
            <h4 className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] mb-4 px-2">Interface</h4>
            <div className="space-y-2">
              <button 
                onClick={onToggleNightMode}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    {isNightMode ? <Moon size={16} /> : <Sun size={16} />}
                  </div>
                  <span className="text-sm font-bold text-white/80">Navigation Dark Mode</span>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all relative ${isNightMode ? 'bg-brand' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isNightMode ? 'right-1' : 'left-1'}`} />
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                    <Bell size={16} />
                  </div>
                  <span className="text-sm font-bold text-white/80">Push Notifications</span>
                </div>
                <div className="w-10 h-5 bg-brand rounded-full relative">
                  <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white" />
                </div>
              </button>
            </div>
          </div>

          {/* Device & Security Section */}
          <div>
            <h4 className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em] mb-4 px-2">App & Security</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Smartphone size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/80">App Version</p>
                    <p className="text-[10px] text-white/30 font-bold">Build 2.4.0 (Stable)</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Shield size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/80">Security Protocol</p>
                    <p className="text-[10px] text-white/30 font-bold">256-bit AES Encryption</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5">
          <button 
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-all border border-red-500/20"
          >
            <LogOut size={16} />
            Terminate Session
          </button>
        </div>
      </motion.div>
    </div>
  );
};
