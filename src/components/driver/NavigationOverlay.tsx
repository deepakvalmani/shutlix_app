import { motion } from 'motion/react';
import { Navigation, Clock, MapPin, Zap, Compass } from 'lucide-react';

interface NavigationOverlayProps {
  nextStop?: any;
  eta: number | null;
  distance: number | null;
  speed: number;
}

export const NavigationOverlay = ({ nextStop, eta, distance, speed }: NavigationOverlayProps) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] pointer-events-none space-y-3">
      {/* Primary HUD */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-heavy rounded-3xl p-4 shadow-2xl border border-brand/20 flex items-center justify-between pointer-events-auto max-w-lg mx-auto"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-brand/20 flex flex-col items-center justify-center text-brand border border-brand/30">
            <span className="text-xl font-display font-black leading-none">{speed}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">km/h</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              <p className="text-[10px] font-black uppercase text-brand tracking-[0.2em] leading-none">Approaching</p>
            </div>
            <h2 className="text-sm font-black text-white truncate leading-tight uppercase tracking-wide">
              {nextStop?.name || 'Navigating...'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-6 pl-6 border-l border-white/10 shrink-0">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 mb-1 opacity-40">
              <Clock size={10} />
              <span className="text-[10px] font-bold uppercase tracking-widest">ETA</span>
            </div>
            <p className="text-base font-display font-black text-brand leading-none">
              {eta || '--'}<span className="text-[10px] ml-0.5 opacity-60">min</span>
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 mb-1 opacity-40">
              <Navigation size={10} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Dist</span>
            </div>
            <p className="text-base font-display font-black text-white leading-none">
              {distance || '--'}<span className="text-[10px] ml-0.5 opacity-60">km</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Speed & Direction Secondary HUD */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-fit bg-zinc-950/40 backdrop-blur-md rounded-2xl p-2.5 px-4 border border-white/5 flex items-center gap-4 pointer-events-auto"
      >
        <div className="flex items-center gap-2">
          <Compass size={14} className="text-brand" />
          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">North Way</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Optimized Route</span>
        </div>
      </motion.div>
    </div>
  );
};
