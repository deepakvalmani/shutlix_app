import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Shield, Radio, X } from 'lucide-react';

interface EmergencyButtonProps {
  onSOS: () => void;
  isSOSActive: boolean;
  userLoc: [number, number] | null;
}

export const EmergencyButton = ({ onSOS, isSOSActive, userLoc }: EmergencyButtonProps) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSOSConfirm = () => {
    onSOS();
    setShowConfirm(false);
  };

  return (
    <>
      <motion.button 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowConfirm(true)}
        className="fixed bottom-24 right-6 z-[2000] w-16 h-16 rounded-full shadow-[0_0_40px_rgba(239,68,68,0.5)] flex items-center justify-center transition-all border-4 border-white md:bottom-32 bg-red-500 overflow-hidden"
      >
        <AlertTriangle size={32} color="white" className={isSOSActive ? 'animate-pulse' : ''} />
        <motion.div 
           animate={isSOSActive ? { opacity: [0.1, 0.4, 0.1] } : {}}
           transition={{ duration: 1, repeat: Infinity }}
           className="absolute inset-0 bg-white opacity-0" 
        />
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[3001] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ y: 100, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 100, scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm glass-heavy rounded-[32px] p-8 border border-red-500/30 shadow-2xl text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-6">
                <Shield size={32} />
              </div>
              
              <h3 className="text-2xl font-display font-black text-white mb-2 uppercase italic tracking-tighter">
                Emergency Alert
              </h3>
              <p className="text-zinc-400 text-sm mb-8">
                Confirming this will immediately alert dispatch and stream your real-time coordinates.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-white/40 uppercase tracking-widest text-[10px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSOSConfirm}
                  className="py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-black text-white uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20"
                >
                  Send SOS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SOS Active Overlay */}
      <AnimatePresence>
        {isSOSActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3002] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600 via-transparent to-transparent animate-pulse" />
            </div>

            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative z-10 space-y-8"
            >
              <div className="w-24 h-24 rounded-full bg-red-600/20 flex items-center justify-center text-red-600 animate-pulse mx-auto">
                <AlertTriangle size={48} />
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl font-display font-black text-white uppercase italic tracking-tighter leading-none">
                  SOS <span className="text-red-500">Transmitting</span>
                </h2>
                <div className="flex items-center justify-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                  <Radio size={12} />
                  Dispatch Notified
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 font-mono text-[10px] text-white/40">
                LOC: {userLoc?.[0].toFixed(6)}, {userLoc?.[1].toFixed(6)}
              </div>

              <button 
                onClick={onSOS}
                className="w-full py-5 bg-white text-zinc-950 font-black uppercase tracking-widest text-[10px] rounded-2xl"
              >
                Cancel SOS
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
