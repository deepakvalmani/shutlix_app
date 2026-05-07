// frontend/src/pages/StopManagerPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, MapPin, Edit2, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0d2137' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8baec8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a3352' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#051018' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const FACILITIES = ['shelter', 'bench', 'lighting', 'accessibility', 'cctv'];

const StopManagerPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const [stops, setStops] = useState([]);
  const [editingStop, setEditingStop] = useState(null); // null | stop object | 'new'
  const [pendingPin, setPendingPin] = useState(null);   // { lat, lng } from map click
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', facilities: [] });

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (!window.google?.maps) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 24.9056, lng: 67.0822 },
      zoom: 15,
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    // Click on map to place a new stop
    map.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setPendingPin({ lat, lng });
      setEditingStop('new');
      setForm({ name: '', description: '', facilities: [] });
    });

    mapInstanceRef.current = map;
  }, []);

  // Load stops
  useEffect(() => {
    api.get('/routes/stops')
      .then(r => setStops(r.data.data || []))
      .catch(() => toast.error('Failed to load stops'));
  }, []);

  // Draw markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear old
    Object.values(markersRef.current).forEach(m => m.setMap(null));
    markersRef.current = {};

    stops.forEach((stop, idx) => {
      if (!stop.lat || !stop.lng) return;
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapInstanceRef.current,
        title: stop.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
              <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24S32 28 32 16C32 7.16 24.84 0 16 0z" fill="#D97706"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="700" fill="#D97706">${idx + 1}</text>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(28, 36),
          anchor: new window.google.maps.Point(14, 36),
        },
      });

      marker.addListener('click', () => {
        setEditingStop(stop);
        setForm({ name: stop.name, description: stop.description || '', facilities: stop.facilities || [] });
        setPendingPin({ lat: stop.lat, lng: stop.lng });
        mapInstanceRef.current.panTo({ lat: stop.lat, lng: stop.lng });
      });

      markersRef.current[stop._id] = marker;
    });
  }, [stops]);

  const toggleFacility = (f) => {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(f)
        ? prev.facilities.filter(x => x !== f)
        : [...prev.facilities, f],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Stop name is required'); return; }
    if (!pendingPin) { toast.error('Click on the map to place the stop'); return; }
    setIsSaving(true);
    try {
      const payload = { ...form, lat: pendingPin.lat, lng: pendingPin.lng };
      if (editingStop && editingStop !== 'new') {
        const res = await api.patch(`/routes/stops/${editingStop._id}`, payload);
        setStops(prev => prev.map(s => s._id === editingStop._id ? res.data.data : s));
        toast.success('Stop updated');
      } else {
        const res = await api.post('/routes/stops', payload);
        setStops(prev => [...prev, res.data.data]);
        toast.success('Stop created');
      }
      setEditingStop(null);
      setPendingPin(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (stopId) => {
    if (!confirm('Delete this stop? It will be removed from all routes.')) return;
    try {
      await api.delete(`/routes/stops/${stopId}`);
      setStops(prev => prev.filter(s => s._id !== stopId));
      if (editingStop?._id === stopId) { setEditingStop(null); setPendingPin(null); }
      toast.success('Stop deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy)' }}>
      <div className="flex-shrink-0 px-5 py-4 flex items-center gap-4"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/admin')} className="btn-ghost btn-icon">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
            Stop Manager
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Click anywhere on the map to add a new stop
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 overflow-y-auto"
          style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>

          {/* Edit form */}
          {editingStop && (
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                  {editingStop === 'new' ? 'New Stop' : 'Edit Stop'}
                </p>
                <button onClick={() => { setEditingStop(null); setPendingPin(null); }}
                  className="btn-ghost btn-icon"><X size={14} /></button>
              </div>

              {pendingPin && (
                <div className="text-xs mb-3 px-2 py-1.5 rounded-lg font-mono"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                  📍 {pendingPin.lat.toFixed(5)}, {pendingPin.lng.toFixed(5)}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="label">Stop name *</label>
                  <input className="input" placeholder="e.g. Main Gate"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" placeholder="Optional description"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Facilities</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FACILITIES.map(f => (
                      <button key={f} onClick={() => toggleFacility(f)}
                        className="text-xs px-2 py-1 rounded-lg capitalize transition-all"
                        style={{
                          background: form.facilities.includes(f) ? 'rgba(26,86,219,0.2)' : 'var(--surface-3)',
                          border: `1px solid ${form.facilities.includes(f) ? 'var(--brand)' : 'var(--border)'}`,
                          color: form.facilities.includes(f) ? 'var(--brand)' : 'var(--text-3)',
                        }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  {editingStop !== 'new' && (
                    <button onClick={() => handleDelete(editingStop._id)}
                      className="btn-danger btn-sm flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1 btn-sm gap-1.5">
                    {isSaving ? <span className="dot-loader"><span /><span /><span /></span>
                      : <><Save size={13} /> Save</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stops list */}
          <div className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
              style={{ color: 'var(--text-4)' }}>
              All Stops ({stops.length})
            </p>
            {stops.map((stop, idx) => (
              <button key={stop._id} onClick={() => {
                setEditingStop(stop);
                setForm({ name: stop.name, description: stop.description || '', facilities: stop.facilities || [] });
                setPendingPin({ lat: stop.lat, lng: stop.lng });
                mapInstanceRef.current?.panTo({ lat: stop.lat, lng: stop.lng });
              }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 transition-all"
                style={{
                  background: editingStop?._id === stop._id ? 'rgba(26,86,219,0.15)' : 'var(--surface-3)',
                  border: `1px solid ${editingStop?._id === stop._id ? 'var(--brand)' : 'transparent'}`,
                }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: '#D97706', color: '#fff', fontSize: '9px' }}>{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{stop.name}</p>
                  {stop.facilities?.length > 0 && (
                    <p className="text-xs capitalize truncate" style={{ color: 'var(--text-4)' }}>
                      {stop.facilities.join(', ')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="glass rounded-xl px-4 py-2 text-xs" style={{ color: 'var(--text-2)' }}>
              Click map to place stop · Click marker to edit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StopManagerPage;