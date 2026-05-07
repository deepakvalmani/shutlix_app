import { motion } from 'motion/react';
import { MapPin, Navigation, Clock, CheckCircle2, Circle } from 'lucide-react';

interface StopsBottomSheetProps {
  stops: any[];
  nextStop?: any;
  userLoc?: [number, number];
  isActive: boolean;
}

export const StopsBottomSheet = ({ stops, nextStop, isActive }: StopsBottomSheetProps) => {
  // Simple check for completed vs upcoming stops would go here
  // For now we highlight current/next
  
  if (!isActive) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase text-white/40 tracking-[0.2em] px-2 flex items-center gap-2">
          <Navigation size={12} />
          Route Manifest
        </h3>
        <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
          {stops.length} Stops
        </span>
      </div>

      <div className="space-y-2">
        {stops.map((stop, idx) => {
          const isNext = stop._id === nextStop?._id;
          const isCompleted = false; // In a real app we'd track this

          return (
            <motion.div
              key={stop._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-2xl border transition-all ${
                isNext 
                  ? 'bg-brand/10 border-brand/30 shadow-lg shadow-brand/5' 
                  : 'bg-white/5 border-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isNext ? 'bg-brand text-white border-white/20' : 'bg-transparent text-white/30 border-white/10'
                }`}>
                  {isCompleted ? <CheckCircle2 size={16} /> : isNext ? <Navigation size={14} className="fill-current" /> : <Circle size={12} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold truncate ${isNext ? 'text-white' : 'text-white/60'}`}>
                      {stop.name}
                    </p>
                    {isNext && (
                      <span className="text-[10px] font-black uppercase text-brand tracking-tighter bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20">
                        NEXT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-medium text-white/30 truncate">
                      {stop.address?.split(',')[0] || 'Scheduled Stop'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-white/20" />
                      <span className="text-[10px] font-bold text-white/40">--:--</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
