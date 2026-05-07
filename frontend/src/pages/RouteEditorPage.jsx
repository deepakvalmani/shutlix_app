// frontend/src/pages/RouteEditorPage.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  MapPin, Palette, Clock, Bus, ChevronUp, ChevronDown,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROUTE_COLORS = [
  '#1A56DB', '#D97706', '#10B981', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0d2137' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d2137' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8baec8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a3352' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5a85a8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#051018' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const RouteEditorPage = () => {
  const { routeId } = useParams(); // undefined = new route
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const stopMarkersRef = useRef([]);   // all campus stop markers (gray)
  const routeMarkersRef = useRef([]);  // selected stop markers (colored)
  const polylineRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    shortCode: '',
    color: '#1A56DB',
    isCircular: false,
    notes: '',
  });
  const [schedule, setSchedule] = useState([{
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '08:00',
    endTime: '20:00',
    frequency: 20,
  }]);
  const [selectedStops, setSelectedStops] = useState([]); // ordered list of stop objects
  const [allStops, setAllStops] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── INIT MAP ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.google?.maps) return;

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 24.9056, lng: 67.0822 },
      zoom: 15,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });
  }, []);

  // ── LOAD DATA ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const stopsRes = await api.get('/routes/stops');
        setAllStops(stopsRes.data.data || []);

        if (routeId) {
          const routeRes = await api.get(`/routes/${routeId}`);
          const route = routeRes.data.data;
          setForm({
            name: route.name || '',
            shortCode: route.shortCode || '',
            color: route.color || '#1A56DB',
            isCircular: route.isCircular || false,
            notes: route.notes || '',
          });
          if (route.schedule?.length) setSchedule(route.schedule);

          // Build ordered stops from route.stops
          const ordered = [...(route.stops || [])]
            .sort((a, b) => a.order - b.order)
            .map(s => s.stopId)
            .filter(Boolean);
          setSelectedStops(ordered);
        }
      } catch (err) {
        toast.error('Failed to load route data');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [routeId]);

  // ── DRAW STOPS ON MAP ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps || !allStops.length) return;

    // Clear existing markers
    stopMarkersRef.current.forEach(m => m.setMap(null));
    stopMarkersRef.current = [];

    allStops.forEach(stop => {
      if (!stop.lat || !stop.lng) return;
      const isSelected = selectedStops.some(s => s._id === stop._id);
      const orderIdx = selectedStops.findIndex(s => s._id === stop._id);

      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapInstanceRef.current,
        title: stop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 8,
          fillColor: isSelected ? form.color : '#6B7280',
          fillOpacity: 1,
          strokeColor: isSelected ? '#ffffff' : '#374151',
          strokeWeight: 2,
        },
        label: isSelected && orderIdx >= 0 ? {
          text: String(orderIdx + 1),
          color: '#ffffff',
          fontSize: '10px',
          fontWeight: 'bold',
        } : undefined,
        zIndex: isSelected ? 10 : 5,
      });

      marker.addListener('click', () => toggleStop(stop));

      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family:Inter,sans-serif;color:#0d2137;padding:4px 2px">
          <strong style="font-size:13px">${stop.name}</strong>
          <p style="font-size:11px;margin:2px 0 0;color:#6b7280">
            ${isSelected ? `Stop #${orderIdx + 1} — click to remove` : 'Click to add to route'}
          </p>
        </div>`,
      });
      marker.addListener('mouseover', () => infoWindow.open(mapInstanceRef.current, marker));
      marker.addListener('mouseout', () => infoWindow.close());

      stopMarkersRef.current.push(marker);
    });
  }, [allStops, selectedStops, form.color]);

  // ── DRAW ROUTE POLYLINE ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    if (polylineRef.current) polylineRef.current.setMap(null);

    if (selectedStops.length < 2) return;

    const path = selectedStops
      .filter(s => s.lat && s.lng)
      .map(s => ({ lat: s.lat, lng: s.lng }));

    if (form.isCircular && path.length > 2) path.push(path[0]);

    polylineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: form.color,
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstanceRef.current,
    });
  }, [selectedStops, form.color, form.isCircular]);

  // ── TOGGLE STOP ─────────────────────────────────────────────────────────────
  const toggleStop = useCallback((stop) => {
    setSelectedStops(prev => {
      const exists = prev.some(s => s._id === stop._id);
      if (exists) return prev.filter(s => s._id !== stop._id);
      return [...prev, stop];
    });
  }, []);

  const moveStop = (index, dir) => {
    setSelectedStops(prev => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const removeStop = (stopId) => {
    setSelectedStops(prev => prev.filter(s => s._id !== stopId));
  };

  // ── SCHEDULE ────────────────────────────────────────────────────────────────
  const updateSchedule = (idx, field, value) => {
    setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const toggleScheduleDay = (schedIdx, day) => {
    setSchedule(prev => prev.map((s, i) => {
      if (i !== schedIdx) return s;
      const days = s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day];
      return { ...s, days };
    }));
  };

  // ── SAVE ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Route name is required'); return; }
    if (selectedStops.length < 2) { toast.error('Add at least 2 stops'); return; }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        stops: selectedStops.map((stop, idx) => ({
          stopId: stop._id,
          order: idx + 1,
          estimatedMinutesFromStart: idx * 3,
        })),
        pathCoordinates: selectedStops.map(s => ({ lat: s.lat, lng: s.lng })),
        schedule,
        isActive: true,
      };

      if (routeId) {
        await api.patch(`/routes/${routeId}`, payload);
        toast.success('Route updated successfully');
      } else {
        await api.post('/routes', payload);
        toast.success('Route created successfully');
      }
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy)' }}>

      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 flex items-center gap-4"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/admin')} className="btn-ghost btn-icon">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
            {routeId ? 'Edit Route' : 'New Route'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Click stops on the map to add them to the route
          </p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary gap-2">
          {isSaving
            ? <span className="dot-loader"><span /><span /><span /></span>
            : <><Save size={15} /> Save Route</>}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — form */}
        <div className="w-80 flex-shrink-0 overflow-y-auto p-4 space-y-4"
          style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="dot-loader"><span /><span /><span /></div>
            </div>
          ) : (
            <>
              {/* Basic info */}
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'var(--text-4)' }}>Route Details</p>

                <div className="space-y-3">
                  <div>
                    <label className="label">Route name *</label>
                    <input className="input" placeholder="e.g. Main Campus Loop"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Short code</label>
                    <input className="input uppercase" placeholder="e.g. A, B, RED"
                      maxLength={6} value={form.shortCode}
                      onChange={e => setForm(f => ({ ...f, shortCode: e.target.value.toUpperCase() }))} />
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="label">Route color</label>
                    <div className="flex flex-wrap gap-2">
                      {ROUTE_COLORS.map(c => (
                        <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                          className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                          style={{
                            background: c,
                            border: form.color === c ? '2px solid white' : '2px solid transparent',
                            boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                          }} />
                      ))}
                      <input type="color" value={form.color}
                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer"
                        style={{ background: 'var(--surface-4)', border: '1px solid var(--border)' }}
                        title="Custom color" />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isCircular}
                      onChange={e => setForm(f => ({ ...f, isCircular: e.target.checked }))}
                      className="w-4 h-4 rounded accent-blue-500" />
                    <span className="text-sm" style={{ color: 'var(--text-2)' }}>Circular route (loops back)</span>
                  </label>

                  <div>
                    <label className="label">Notes</label>
                    <textarea className="input resize-none" rows={2}
                      placeholder="Optional notes about this route..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Selected stops */}
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-4)' }}>
                    Stops ({selectedStops.length})
                  </p>
                  {selectedStops.length < 2 && (
                    <span className="text-xs" style={{ color: '#F87171' }}>Min. 2 required</span>
                  )}
                </div>

                {selectedStops.length === 0 ? (
                  <div className="text-center py-6">
                    <MapPin size={28} style={{ color: 'var(--text-4)' }} className="mx-auto mb-2" />
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Click stops on the map to add them here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedStops.map((stop, idx) => (
                      <div key={stop._id} className="flex items-center gap-2 px-2 py-2 rounded-lg"
                        style={{ background: 'var(--surface-2)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: form.color, color: '#fff', fontSize: '10px' }}>
                          {idx + 1}
                        </div>
                        <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-2)' }}>
                          {stop.name}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveStop(idx, -1)} disabled={idx === 0}
                            className="btn-ghost btn-icon p-0.5" style={{ opacity: idx === 0 ? 0.3 : 1 }}>
                            <ChevronUp size={12} />
                          </button>
                          <button onClick={() => moveStop(idx, 1)} disabled={idx === selectedStops.length - 1}
                            className="btn-ghost btn-icon p-0.5"
                            style={{ opacity: idx === selectedStops.length - 1 ? 0.3 : 1 }}>
                            <ChevronDown size={12} />
                          </button>
                          <button onClick={() => removeStop(stop._id)} className="btn-ghost btn-icon p-0.5"
                            style={{ color: '#EF4444' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {form.isCircular && selectedStops.length > 0 && (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg opacity-50"
                        style={{ background: 'var(--surface-2)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: form.color, color: '#fff', fontSize: '9px' }}>↩</div>
                        <span className="text-xs" style={{ color: 'var(--text-4)' }}>
                          Returns to {selectedStops[0]?.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="rounded-xl p-4" style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'var(--text-4)' }}>Schedule</p>

                {schedule.map((sched, idx) => (
                  <div key={idx} className="space-y-3">
                    {/* Days */}
                    <div>
                      <label className="label">Operating days</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map(day => (
                          <button key={day} onClick={() => toggleScheduleDay(idx, day)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: sched.days.includes(day) ? form.color : 'var(--surface-4)',
                              color: sched.days.includes(day) ? '#fff' : 'var(--text-3)',
                            }}>
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">Start time</label>
                        <input type="time" className="input" value={sched.startTime}
                          onChange={e => updateSchedule(idx, 'startTime', e.target.value)} />
                      </div>
                      <div>
                        <label className="label">End time</label>
                        <input type="time" className="input" value={sched.endTime}
                          onChange={e => updateSchedule(idx, 'endTime', e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <label className="label">Frequency (minutes between buses)</label>
                      <input type="number" className="input" min={5} max={120} step={5}
                        value={sched.frequency}
                        onChange={e => updateSchedule(idx, 'frequency', parseInt(e.target.value))} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          {/* Instructions overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="glass rounded-xl px-4 py-2 text-xs text-center"
              style={{ color: 'var(--text-2)' }}>
              Click any stop marker to add/remove from route · Gray = available · Colored = selected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteEditorPage;