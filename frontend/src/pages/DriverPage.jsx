import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bus, Play, Square, Users, AlertTriangle, PhoneCall,
  Navigation, Clock, Map, CheckCircle, Radio,
  LogOut, Plus, Minus, ChevronDown, BarChart2,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import CapacityBadge from '../components/ui/CapacityBadge';
import QRGenerator from '../components/QRGenerator';
import api from '../services/api';
import toast from 'react-hot-toast';

// ── GPS ACCURACY BADGE ───────────────────────────────────────────────────────
const AccuracyBadge = ({ accuracy }) => {
  if (!accuracy) return null;
  const good = accuracy < 20;
  const ok = accuracy < 50;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        background: good ? 'rgba(16,185,129,0.12)' : ok ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
        color: good ? '#34D399' : ok ? '#FBBF24' : '#F87171',
        border: `1px solid ${good ? 'rgba(16,185,129,0.3)' : ok ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}>
      GPS ±{Math.round(accuracy)}m
    </span>
  );
};

// ── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color = 'var(--brand)' }) => (
  <div className="rounded-xl p-4 flex flex-col gap-1"
    style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
    <div className="flex items-center gap-2 mb-1">
      <Icon size={15} style={{ color }} />
      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
    </div>
    <div className="font-display font-bold text-2xl" style={{ color: 'var(--text-1)' }}>
      {value}
    </div>
  </div>
);

// ── DELAY MODAL ──────────────────────────────────────────────────────────────
const DelayModal = ({ onConfirm, onClose }) => {
  const [minutes, setMinutes] = useState(10);
  const [msg, setMsg] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-1)' }}>
          Report Delay
        </h3>
        <div className="mb-4">
          <label className="label">Estimated delay (minutes)</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setMinutes(m => Math.max(5, m - 5))} className="btn-secondary btn-icon">
              <Minus size={14} />
            </button>
            <span className="font-bold text-2xl flex-1 text-center"
              style={{ color: 'var(--text-1)' }}>{minutes}</span>
            <button onClick={() => setMinutes(m => m + 5)} className="btn-secondary btn-icon">
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="mb-5">
          <label className="label">Message to students <span style={{ color: 'var(--text-4)' }}>(optional)</span></label>
          <input className="input" placeholder="Reason for delay..."
            value={msg} onChange={e => setMsg(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onConfirm(minutes, msg)} className="btn-primary flex-1">
            Send to students
          </button>
        </div>
      </div>
    </div>
  );
};

// ── EMERGENCY MODAL ──────────────────────────────────────────────────────────
const EmergencyModal = ({ onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.85)' }}>
    <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
      style={{ background: '#1A0A0A', border: '2px solid #EF4444' }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(239,68,68,0.2)', border: '2px solid #EF4444' }}>
        <PhoneCall size={28} style={{ color: '#EF4444' }} />
      </div>
      <h3 className="font-display font-bold text-xl text-center mb-2" style={{ color: '#F87171' }}>
        Emergency SOS
      </h3>
      <p className="text-sm text-center mb-6" style={{ color: 'var(--text-3)' }}>
        This will immediately alert your transport admin with your current GPS location.
        Use only in genuine emergencies.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button onClick={onConfirm} className="btn-danger flex-1 font-bold">
          🆘 Send SOS
        </button>
      </div>
    </div>
  </div>
);

// ── MAIN DRIVER PAGE ─────────────────────────────────────────────────────────
const DriverPage = () => {
  const { user, logout } = useAuthStore();
  const { emitLocation, emitPassengerCount, emitDelay, emitEmergency, emitStartTrip, emitEndTrip, joinOrganization } = useSocket();

  // Trip state
  const [isOnTrip, setIsOnTrip] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [shuttles, setShuttles] = useState([]);
  const [selectedShuttle, setSelectedShuttle] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // GPS state
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsPos, setGpsPos] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Passenger count
  const [passengerCount, setPassengerCount] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(30);

  // Trip stats
  const [tripDuration, setTripDuration] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);

  // UI state
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showShuttleSelect, setShowShuttleSelect] = useState(false);

  const gpsWatchRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const latestPosRef = useRef(null);

  // Join organization WebSocket room so driver receives/sends real-time data
  useEffect(() => {
    if (user?.organizationId) {
      joinOrganization();
    }
  }, [user?.organizationId]);

  // Load driver's data
  useEffect(() => {
    const load = async () => {
      try {
        const [shuttleRes, routeRes, tripRes] = await Promise.all([
          api.get('/shuttles'),
          api.get('/routes?activeOnly=true'),
          api.get('/driver/current-trip'),
        ]);
        setShuttles(shuttleRes.data.data || []);
        setRoutes(routeRes.data.data || []);

        if (tripRes.data.data) {
          const trip = tripRes.data.data;
          setCurrentTrip(trip);
          setIsOnTrip(true);
          setSelectedShuttle(trip.shuttleId);
          setSelectedRoute(trip.routeId);
          setMaxCapacity(trip.shuttleId?.capacity || 30);
          // Resume GPS
          startGPS(trip);
          setTripStartTime(new Date(trip.startTime));
        } else {
          // Pre-select assigned shuttle
          const driver = user;
          if (driver.assignedShuttleId) {
            const assigned = shuttleRes.data.data.find(s =>
              s._id === (driver.assignedShuttleId?._id || driver.assignedShuttleId)
            );
            if (assigned) {
              setSelectedShuttle(assigned);
              setMaxCapacity(assigned.capacity || 30);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  // Trip duration timer
  useEffect(() => {
    if (isOnTrip && tripStartTime) {
      durationIntervalRef.current = setInterval(() => {
        setTripDuration(Math.floor((Date.now() - tripStartTime.getTime()) / 60000));
      }, 10000);
    }
    return () => clearInterval(durationIntervalRef.current);
  }, [isOnTrip, tripStartTime]);

  // ── GPS ────────────────────────────────────────────────────────────────────
  const startGPS = useCallback((trip) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported on this device');
      return;
    }

    setGpsActive(true);

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          heading: pos.coords.heading || 0,
          accuracy: pos.coords.accuracy,
        };
        setGpsPos(position);
        setGpsAccuracy(pos.coords.accuracy);
        setLastUpdate(new Date());
        latestPosRef.current = position;
      },
      (err) => {
        console.warn('GPS error:', err);
        toast.error('GPS signal lost. Please check location permissions.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    locationIntervalRef.current = setInterval(() => {
      if (!latestPosRef.current || !trip?.shuttleId?._id && !selectedShuttle?._id) return;
      const sid = trip?.shuttleId?._id || selectedShuttle?._id;
      emitLocation({
        lat: latestPosRef.current.lat,
        lng: latestPosRef.current.lng,
        speed: latestPosRef.current.speed,
        heading: latestPosRef.current.heading,
        passengerCount,
        shuttleId: sid,
      });
    }, 3000);
  }, [emitLocation, selectedShuttle, passengerCount]);

  const stopGPS = useCallback(() => {
    if (gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current);
    clearInterval(locationIntervalRef.current);
    setGpsActive(false);
    setGpsPos(null);
    latestPosRef.current = null;
  }, []);

  // Update emit with latest passenger count
  useEffect(() => {
    if (!isOnTrip || !currentTrip) return;
    const sid = currentTrip?.shuttleId?._id || selectedShuttle?._id;
    if (sid) emitPassengerCount(sid, passengerCount);
  }, [passengerCount, isOnTrip]);

  // ── START TRIP ─────────────────────────────────────────────────────────────
  const handleStartTrip = async () => {
    if (!selectedShuttle) {
      toast.error('Please select a shuttle first');
      return;
    }
    setIsStarting(true);
    try {
      const { data } = await api.post('/driver/start-trip', {
        shuttleId: selectedShuttle._id,
        routeId: selectedRoute?._id || null,
      });

      const trip = {
        _id: data.data.tripId,
        shuttleId: selectedShuttle,
        routeId: selectedRoute,
      };

      setCurrentTrip(trip);
      setIsOnTrip(true);
      setTripStartTime(new Date());
      setPassengerCount(0);

      emitStartTrip(data.data.tripId, selectedShuttle._id, selectedRoute?._id);
      startGPS(trip);

      toast.success('Trip started! GPS is now sharing your location.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start trip');
    } finally {
      setIsStarting(false);
    }
  };

  // ── END TRIP ───────────────────────────────────────────────────────────────
  const handleEndTrip = async () => {
    if (!currentTrip) return;
    setIsEnding(true);
    try {
      await api.post('/driver/end-trip', {
        tripId: currentTrip._id,
        shuttleId: currentTrip.shuttleId?._id || currentTrip.shuttleId,
      });

      const sid = currentTrip.shuttleId?._id || currentTrip.shuttleId;
      emitEndTrip(sid, currentTrip._id);
      stopGPS();

      setIsOnTrip(false);
      setCurrentTrip(null);
      setPassengerCount(0);
      setTripDuration(0);
      setTripStartTime(null);

      toast.success('Trip ended. Good work!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not end trip');
    } finally {
      setIsEnding(false);
    }
  };

  // ── DELAY ──────────────────────────────────────────────────────────────────
  const handleDelay = (minutes, message) => {
    const sid = currentTrip?.shuttleId?._id || currentTrip?.shuttleId;
    const rid = currentTrip?.routeId?._id || currentTrip?.routeId;
    emitDelay(sid, rid, minutes,
      message || `Route is delayed by approximately ${minutes} minutes`);
    setShowDelayModal(false);
    toast.success('Delay reported. Students have been notified.');
  };

  // ── EMERGENCY ──────────────────────────────────────────────────────────────
  const handleEmergency = () => {
    const sid = currentTrip?.shuttleId?._id || currentTrip?.shuttleId;
    const pos = latestPosRef.current;
    emitEmergency(sid, pos?.lat, pos?.lng);
    setShowEmergencyModal(false);
    toast.error('🆘 Emergency alert sent to admin!', { duration: 8000 });
  };

  // ── PASSENGER COUNT ────────────────────────────────────────────────────────
  const changeCount = (delta) => {
    setPassengerCount(prev => Math.max(0, Math.min(maxCapacity, prev + delta)));
  };

  const shuttleName = currentTrip?.shuttleId?.name || selectedShuttle?.name || 'No shuttle selected';
  const routeName = currentTrip?.routeId?.name || selectedRoute?.name || 'No route';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy)' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: isOnTrip ? 'var(--brand)' : 'var(--surface-3)', border: '1px solid var(--border)' }}>
            <Bus size={18} style={{ color: isOnTrip ? 'white' : 'var(--text-3)' }} />
          </div>
          <div>
            <p className="font-display font-bold text-base leading-none" style={{ color: 'var(--text-1)' }}>
              Driver Portal
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              {user?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gpsActive && <AccuracyBadge accuracy={gpsAccuracy} />}
          {isOnTrip && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1.5"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>
              <span className="status-dot-green" />
              LIVE
            </span>
          )}
          <button onClick={logout} className="btn-ghost btn-icon" title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 max-w-lg mx-auto w-full space-y-5">

        {/* ── PRE-TRIP: SHUTTLE SELECTOR ─────────────────────────────────── */}
        {!isOnTrip && (
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="font-display font-semibold text-base mb-4" style={{ color: 'var(--text-1)' }}>
              Select Shuttle & Route
            </p>

            {/* Shuttle picker */}
            <div className="mb-3">
              <label className="label">Shuttle</label>
              <div className="relative">
                <button
                  onClick={() => setShowShuttleSelect(v => !v)}
                  className="input w-full text-left flex items-center justify-between">
                  <span style={{ color: selectedShuttle ? 'var(--text-1)' : 'var(--text-4)' }}>
                    {selectedShuttle
                      ? `${selectedShuttle.name} · ${selectedShuttle.plateNumber}`
                      : 'Choose a shuttle...'}
                  </span>
                  <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />
                </button>
                {showShuttleSelect && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                    style={{ background: 'var(--surface-3)', border: '1px solid var(--border-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {shuttles.filter(s => s.status !== 'retired').map(s => (
                      <button key={s._id} onClick={() => {
                        setSelectedShuttle(s);
                        setMaxCapacity(s.capacity || 30);
                        setShowShuttleSelect(false);
                      }}
                        className="w-full text-left px-4 py-3 text-sm hover:transition-colors"
                        style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-1)' }}
                        onMouseEnter={e => e.target.style.background = 'var(--surface-4)'}
                        onMouseLeave={e => e.target.style.background = 'transparent'}>
                        <span className="font-medium">{s.name}</span>
                        <span style={{ color: 'var(--text-3)' }}> · {s.plateNumber}</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--text-4)' }}>
                          Cap: {s.capacity}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Route picker */}
            <div className="mb-5">
              <label className="label">Route <span style={{ color: 'var(--text-4)' }}>(optional)</span></label>
              <select className="input"
                value={selectedRoute?._id || ''}
                onChange={e => setSelectedRoute(routes.find(r => r._id === e.target.value) || null)}>
                <option value="">No specific route</option>
                {routes.map(r => (
                  <option key={r._id} value={r._id}>{r.name} ({r.shortCode})</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartTrip}
              disabled={isStarting || !selectedShuttle}
              className="btn-primary btn-lg w-full">
              {isStarting
                ? <><span className="dot-loader"><span /><span /><span /></span> Starting...</>
                : <><Play size={18} /> Start Trip & Share Location</>}
            </button>
          </div>
        )}

        {/* ── ON TRIP: STATUS CARD ────────────────────────────────────────── */}
        {isOnTrip && (
          <>
            {/* Trip info */}
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--brand)', boxShadow: '0 0 0 1px rgba(26,86,219,0.2)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--brand)' }}>Active Trip</p>
                  <p className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
                    {shuttleName}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>{routeName}</p>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-2xl" style={{ color: 'var(--brand)' }}>
                    {tripDuration}m
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-4)' }}>duration</div>
                </div>
              </div>

              {/* GPS status */}
              <div className="flex items-center gap-2 text-sm mb-4">
                {gpsActive ? (
                  <>
                    <div className="relative flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-50" />
                    </div>
                    <span style={{ color: '#34D399' }}>GPS broadcasting</span>
                    {lastUpdate && (
                      <span className="ml-auto text-xs" style={{ color: 'var(--text-4)' }}>
                        Updated {Math.round((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                    <span style={{ color: '#F87171' }}>GPS not active</span>
                  </>
                )}
              </div>

              {/* GPS coords */}
              {gpsPos && (
                <div className="rounded-xl px-3 py-2 text-xs font-mono mb-4 flex items-center gap-2"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                  <Navigation size={12} style={{ color: 'var(--brand)' }} />
                  {gpsPos.lat.toFixed(5)}, {gpsPos.lng.toFixed(5)}
                  {gpsPos.speed > 0 && (
                    <span className="ml-auto" style={{ color: 'var(--text-2)' }}>
                      {Math.round(gpsPos.speed)} km/h
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard icon={Clock} label="Duration" value={`${tripDuration}m`} />
                <StatCard icon={Navigation} label="Speed"
                  value={gpsPos?.speed ? `${Math.round(gpsPos.speed)}` : '0'}
                  color="#10B981" />
                <StatCard icon={BarChart2} label="Capacity"
                  value={`${passengerCount}/${maxCapacity}`}
                  color="#D97706" />
              </div>
            </div>

            {/* ── PASSENGER COUNTER ──────────────────────────────────────── */}
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="font-semibold text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                Passenger Count
              </p>
              <CapacityBadge current={passengerCount} total={maxCapacity} />
              <div className="flex items-center gap-4 mt-5">
                <button
                  onClick={() => changeCount(-1)}
                  disabled={passengerCount <= 0}
                  className="btn-secondary flex-1 py-4 text-2xl font-bold"
                  style={{ borderRadius: '14px' }}>
                  −
                </button>
                <div className="flex flex-col items-center gap-0.5 min-w-[80px]">
                  <span className="font-display font-bold text-5xl leading-none"
                    style={{ color: 'var(--text-1)' }}>{passengerCount}</span>
                  <span className="text-xs" style={{ color: 'var(--text-4)' }}>on board</span>
                </div>
                <button
                  onClick={() => changeCount(1)}
                  disabled={passengerCount >= maxCapacity}
                  className="btn-primary flex-1 py-4 text-2xl font-bold"
                  style={{ borderRadius: '14px' }}>
                  +
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[5, 10, 15].map(n => (
                  <button key={n} onClick={() => setPassengerCount(Math.min(maxCapacity, n))}
                    className="btn-secondary text-sm py-2">
                    Set {n}
                  </button>
                ))}
              </div>
            </div>

            {/* ── ACTIONS ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowDelayModal(true)}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all"
                style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,6,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,6,0.08)'}>
                <AlertTriangle size={24} style={{ color: '#D97706' }} />
                <span className="text-sm font-medium" style={{ color: '#FBBF24' }}>Report Delay</span>
              </button>

              <button onClick={() => setShowEmergencyModal(true)}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                <PhoneCall size={24} style={{ color: '#EF4444' }} />
                <span className="text-sm font-medium" style={{ color: '#F87171' }}>Emergency SOS</span>
              </button>
            </div>

            {/* ── QR CHECK-IN ─────────────────────────────────────────── */}
            <QRGenerator
              tripId={currentTrip?._id}
              shuttleId={currentTrip?.shuttleId?._id || currentTrip?.shuttleId}
              isActive={isOnTrip}
            />

            {/* ── END TRIP ──────────────────────────────────────────────── */}
            <button
              onClick={handleEndTrip}
              disabled={isEnding}
              className="btn-danger btn-lg w-full rounded-2xl">
              {isEnding
                ? <><span className="dot-loader"><span /><span /><span /></span> Ending...</>
                : <><Square size={18} /> End Trip</>}
            </button>
          </>
        )}

        {/* ── DRIVER INFO CARD ─────────────────────────────────────────────── */}
        {!isOnTrip && selectedShuttle && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-4)' }}>Selected Shuttle</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(26,86,219,0.12)', border: '1px solid rgba(26,86,219,0.3)' }}>
                <Bus size={20} style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                  {selectedShuttle.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {selectedShuttle.plateNumber} · Capacity: {selectedShuttle.capacity}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDelayModal && (
        <DelayModal
          onConfirm={handleDelay}
          onClose={() => setShowDelayModal(false)}
        />
      )}
      {showEmergencyModal && (
        <EmergencyModal
          onConfirm={handleEmergency}
          onClose={() => setShowEmergencyModal(false)}
        />
      )}
    </div>
  );
};

export default DriverPage;