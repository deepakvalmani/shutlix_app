import { motion } from 'motion/react';
import { Play, Square, Pause, Users, MapPin, Truck } from 'lucide-react';

interface ControlPanelProps {
  isActive: boolean;
  isLoading: boolean;
  passengerCount: number;
  onToggleTrip: () => void;
  onUpdatePassengers: (delta: number) => void;
  selectedShuttle?: any;
  selectedRoute?: any;
}

export const ControlPanel = ({
  isActive,
  isLoading,
  passengerCount,
  onToggleTrip,
  onUpdatePassengers,
  selectedShuttle,
  selectedRoute
}: ControlPanelProps) => {
  return (
    <div className="space-y-4">
      {/* Shuttle Info Card */}
      <div className="glass-heavy rounded-3xl p-5 border border-white/10 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Truck size={80} />
        </div>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
            <Truck size={28} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-brand tracking-[0.2em] mb-1">Assigned Vehicle</p>
            <h3 className="text-xl font-display font-black text-white leading-none">
              {selectedShuttle?.name || 'No Vehicle'}
            </h3>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-wider font-bold">
              {selectedShuttle?.licensePlate || '--- ---'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2 text-white/40">
              <MapPin size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Route</span>
            </div>
            <p className="text-sm font-black text-white truncate">
              {selectedRoute?.name || 'Not active'}
            </p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2 text-white/40">
              <Users size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Capacity</span>
            </div>
            <p className="text-sm font-black text-white">
              {selectedShuttle?.capacity || 0} Seats
            </p>
          </div>
        </div>
      </div>

      {/* Main Action Button */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onToggleTrip}
        disabled={isLoading}
        className={`w-full py-5 rounded-3xl flex items-center justify-center gap-3 font-display font-black text-lg uppercase tracking-wider shadow-2xl transition-all relative overflow-hidden ${
          isActive 
            ? 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-600' 
            : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
        } ${isLoading ? 'opacity-80 pointer-events-none' : ''}`}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isActive ? (
          <>
            <Square size={22} fill="white" />
            End Current Trip
          </>
        ) : (
          <>
            <Play size={22} fill="white" />
            Start New Duty
          </>
        )}
      </motion.button>

      {/* Passenger Control (Only active during trip) */}
      {isActive && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-heavy rounded-3xl p-5 border border-white/10 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Occupancy</p>
                <p className="text-xs font-bold text-white/60">Manage boardings</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-black text-white">{passengerCount}</p>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Active</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onUpdatePassengers(-1)}
              className="py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 flex items-center justify-center font-black text-xl text-white/70"
            >
              -
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onUpdatePassengers(1)}
              className="py-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 flex items-center justify-center font-black text-xl text-white"
            >
              +
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
