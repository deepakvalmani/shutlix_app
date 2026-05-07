import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, CheckCircle, Loader2, ChevronRight, ArrowRight, Bus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import useShuttleStore from '../store/shuttleStore';
import { motion, AnimatePresence } from 'motion/react';

interface BookingModalProps {
  route: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingModal({ route, onClose, onSuccess }: BookingModalProps) {
  const { stops, schedules } = useShuttleStore();
  const [step, setStep] = useState(1);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [pickupStopId, setPickupStopId] = useState('');
  const [dropoffStopId, setDropoffStopId] = useState('');
  const [loading, setLoading] = useState(false);

  const routeSchedules = useMemo(() => {
    return schedules.filter((s: any) => s.routeId?._id === route._id || s.routeId === route._id);
  }, [schedules, route]);

  const routeStops = useMemo(() => {
    if (!route.stops) return [];
    return route.stops.map((stopRef: any) => {
        const stopId = typeof stopRef === 'string' ? stopRef : stopRef.stopId;
        return stops.find((s: any) => s._id === stopId);
    }).filter(Boolean);
  }, [route, stops]);

  const selectedSchedule = useMemo(() => 
    routeSchedules.find((s: any) => s._id === selectedScheduleId),
  [routeSchedules, selectedScheduleId]);

  const selectedPickup = useMemo(() => 
    routeStops.find((s: any) => s._id === pickupStopId),
  [routeStops, pickupStopId]);

  const selectedDropoff = useMemo(() => 
    routeStops.find((s: any) => s._id === dropoffStopId),
  [routeStops, dropoffStopId]);

  const handleNext = () => {
    if (!selectedScheduleId || !pickupStopId || !dropoffStopId) {
      return toast.error('Please select all details');
    }
    if (pickupStopId === dropoffStopId) {
        return toast.error('Pickup and Drop-off stops must be different');
    }
    setStep(2);
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      // Calculate next occurrence of this schedule's time
      const [hours, minutes] = selectedSchedule.departureTime.split(':').map(Number);
      const now = new Date();
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow (simplified logic)
      if (scheduledDate < now) {
          scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      await api.post('/student/bookings', {
        routeId: route._id,
        scheduledTime: scheduledDate,
        pickupStopId,
        dropoffStopId,
        shuttleId: selectedSchedule.shuttleId?._id || selectedSchedule.shuttleId
      });
      toast.success('Seat booked successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to book seat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-glass-3 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-border-1"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
              {step === 1 ? 'Book Your Seat' : 'Confirm Selection'}
            </h2>
            <p className="text-xs opacity-50">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-glass-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div 
                key="step1" 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="p-3 rounded-2xl bg-brand/5 border border-brand/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                            <Bus size={20} className="text-brand" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-brand">Route</p>
                            <p className="text-sm font-bold">{route.name}</p>
                        </div>
                    </div>
                </div>

                <div>
                  <label className="label mb-2 flex items-center gap-2">
                    <Clock size={14} className="text-brand" /> Available Schedules
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto no-scrollbar">
                    {routeSchedules.length === 0 ? (
                        <p className="text-xs italic opacity-40 p-4 text-center">No schedules available for this route</p>
                    ) : routeSchedules.map((s: any) => (
                        <button
                          key={s._id}
                          onClick={() => setSelectedScheduleId(s._id)}
                          className={`w-full p-3 rounded-xl border text-left transition-all ${
                            selectedScheduleId === s._id 
                              ? 'bg-brand/10 border-brand' 
                              : 'bg-glass-1 border-white/5 hover:bg-glass-2'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{s.departureTime}</span>
                            <span className="text-[10px] opacity-60">
                                {s.shuttleId?.plateNumber || 'TBD'}
                            </span>
                          </div>
                        </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label mb-2 flex items-center gap-2">
                        <MapPin size={14} className="text-green-500" /> Pickup
                    </label>
                    <select 
                      className="input text-sm" 
                      value={pickupStopId} 
                      onChange={e => setPickupStopId(e.target.value)}
                    >
                      <option value="">Where from?</option>
                      {routeStops.map((s: any) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label mb-2 flex items-center gap-2">
                        <MapPin size={14} className="text-red-500" /> Drop-off
                    </label>
                    <select 
                      className="input text-sm" 
                      value={dropoffStopId} 
                      onChange={e => setDropoffStopId(e.target.value)}
                    >
                      <option value="">Where to?</option>
                      {routeStops.map((s: any) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleNext}
                  className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 group"
                >
                  Confirm Details <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                    <div className="flex items-center justify-center py-4">
                        <div className="w-16 h-16 rounded-3xl bg-brand/10 flex items-center justify-center">
                            <Calendar size={32} className="text-brand" />
                        </div>
                    </div>

                    <div className="bg-glass-2 rounded-2xl p-5 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                            <span className="text-xs opacity-50 uppercase font-bold tracking-tighter">Departure Time</span>
                            <span className="font-bold text-brand">{selectedSchedule?.departureTime}</span>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center gap-1 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <div className="w-0.5 h-6 bg-white/10" />
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] opacity-40 uppercase font-bold">Pickup</p>
                                        <p className="text-sm font-semibold">{selectedPickup?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] opacity-40 uppercase font-bold">Drop-off</p>
                                        <p className="text-sm font-semibold">{selectedDropoff?.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                            <span className="text-xs opacity-50 uppercase font-bold">Estimated ETA</span>
                            <span className="text-xs font-bold">-- mins</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button onClick={() => setStep(1)} className="flex-1 btn-secondary py-3">Back</button>
                  <button 
                    onClick={handleBook} 
                    disabled={loading}
                    className="flex-[2] btn-primary py-3 gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    Final Confirmation
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
