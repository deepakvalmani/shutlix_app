import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, X, QrCode, RefreshCw, AlertCircle, Clock, 
  ChevronRight, AlertTriangle 
} from 'lucide-react';
import QRGenerator from '../QRGenerator';

interface ShiftSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export const ShiftSummaryModal = ({ isOpen, onClose, data }: ShiftSummaryModalProps) => (
  <AnimatePresence>
    {isOpen && data && (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          className="glass-heavy w-full max-w-md rounded-[3rem] p-8 space-y-8 overflow-hidden relative border border-white/10"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-green-500" />
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mx-auto mb-4">
              <Check size={32} strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic">Route Completed</h2>
            <p className="text-[10px] font-black uppercase text-green-500 tracking-widest leading-none">Safe operations confirmed</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Total Distance</p>
              <p className="text-xl font-bold">{data.distance.toFixed(1)} <span className="text-xs opacity-40">KM</span></p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Time on Road</p>
              <p className="text-xl font-bold">{data.time} <span className="text-xs opacity-40">MIN</span></p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Submit Report
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  shuttleId?: string;
  isActive: boolean;
  shuttleName?: string;
}

export const QRModal = ({ isOpen, onClose, tripId, shuttleId, isActive, shuttleName }: QRModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[4100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="glass-heavy w-full max-w-sm rounded-[3rem] p-8 space-y-8 overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-brand" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                <QrCode size={24} />
              </div>
              <div>
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter">Passenger QR</h3>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><X size={20}/></button>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center">
            <QRGenerator tripId={tripId} shuttleId={shuttleId} isActive={isActive} />
          </div>

          <p className="text-[10px] text-center opacity-40 font-medium px-4">
            Display this to passengers for secure boarding verification on {shuttleName || 'this vehicle'}.
          </p>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-white text-zinc-950 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
          >
            Close Portal
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: string;
  setReport: (val: string) => void;
  onSubmit: () => void;
}

export const IncidentModal = ({ isOpen, onClose, report, setReport, onSubmit }: IncidentModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[4200] bg-black/80 backdrop-blur-md flex items-end justify-center p-4"
      >
        <motion.div 
          initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
          className="glass-heavy w-full max-w-sm rounded-[2.5rem] p-6 space-y-6 overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <h3 className="font-display font-black text-xl uppercase tracking-tight">Report Incident</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {['Traffic', 'Road Block', 'Medical', 'Mechanical'].map(type => (
              <button 
                key={type}
                onClick={() => setReport(type)}
                className={`p-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                  report === type ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <textarea 
            value={report}
            onChange={e => setReport(e.target.value)}
            placeholder="Additional details..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white min-h-[100px] outline-none focus:border-orange-500 transition-all"
          />

          <button 
            onClick={onSubmit}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-500/20"
          >
            Transmit Report
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
