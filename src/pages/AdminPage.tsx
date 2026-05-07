import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { useApi } from '../services/swr';
import {
  Bus, Users, Map as MapIcon, BarChart2, LogOut, Plus, Edit2, Layers,
  Navigation, TrendingUp, Radio, RefreshCw,
  MapPin, X, Send, Activity, Wrench, Route, CheckCircle,
  Building2, Copy, MessageSquare, Compass, Search, ChevronLeft, ChevronDown,
  Loader2, Clock, Shield, AlertTriangle, Settings, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useSocket, { getSocket } from '../hooks/useSocket';
import ThemeToggle from '../components/ui/ThemeToggle';
import useLeafletMap from '../hooks/useLeafletMap';
import { CapacityBadge, Avatar, BusLogo, PageHeader } from '../components/ui/index';
import ShuttleFormModal from '../components/ShuttleFormModal';
import MaintenanceModal from '../components/MaintenanceModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import MapSearchBar from '../components/MapSearchBar';
import { reverseGeocode } from '../services/nominatim';
import AuditLogPanel from '../components/admin/AuditLogPanel';
import BillingPanel from '../components/admin/BillingPanel';
import ChatPanel from '../components/admin/ChatPanel';

// ─── STAT TILE ────────────────────────────────────────────
const StatTile = ({ icon: Icon, label, value, sub, color = 'var(--brand)', loading, trend }: any) => (
  <motion.div 
    whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
    className="glass-md rounded-[2rem] p-6 relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white opacity-[0.03] rounded-bl-[4rem]" />
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={22} style={{ color }} />
      </div>
      {trend && (
        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${trend > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
      {loading && <div className="skeleton w-12 h-6 rounded-lg" />}
    </div>
    <div className="relative">
      {loading ? (
        <div className="skeleton w-24 h-10 rounded-lg mb-2" />
      ) : (
        <div className="font-display font-bold text-3xl mb-1 tracking-tight" style={{ color: 'var(--text-1)' }}>
          {value ?? '—'}
        </div>
      )}
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1" style={{ color: 'var(--text-1)' }}>{label}</div>
      {sub && <div className="text-[10px] font-medium opacity-60 flex items-center gap-1" style={{ color: 'var(--text-2)' }}><Activity size={10}/> {sub}</div>}
    </div>
  </motion.div>
);

// ─── BAR CHART ────────────────────────────────────────────
const BarChart = ({ data, color = 'var(--brand)' }: any) => {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-32 text-xs font-bold uppercase tracking-widest opacity-20">
      Wait for data sync...
    </div>
  );
  const max = Math.max(...data.map((d: any) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-40 w-full px-2">
      {data.map((d: any, i: number) => (
        <div key={d._id || d.id || d.date || d.name || i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-help">
          <div className="relative w-full h-full flex flex-col justify-end">
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: `${(d.count/max*100).toFixed(0)}%` }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="w-full rounded-t-xl transition-all duration-300 relative"
              style={{ background: `linear-gradient(to top, ${color}AA, ${color})`, minHeight: 6 }}
            >
               <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity rounded-t-xl" />
            </motion.div>
            {d.count > 0 && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl pointer-events-none z-10"
                style={{ background: 'var(--glass-3)', color: 'var(--text-1)', border: '1px solid var(--border-1)', whiteSpace: 'nowrap' }}>
                {d.count} UNITS
              </div>
            )}
          </div>
          <span className="font-sans font-bold opacity-30 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-1)', fontSize: 9 }}>{d.date?.slice(5) || d.name?.slice(0,5)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── BROADCAST MODAL ─────────────────────────────────────
const BroadcastModal = ({ onSend, onClose }: any) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const types = [['info','ℹ️ Info','#60A5FA'],['warning','⚠️ Warning','#FBBF24'],['danger','🚨 Alert','#F87171'],['success','✅ Good news','#34D399']];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-heavy w-full max-w-md rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>📢 Broadcast to all</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16}/></button>
        </div>
        <div className="flex gap-2 mb-4">
          {types.map(([v,l,c]) => (
            <button key={v} onClick={() => setType(v)}
              className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: type===v?`${c}22`:'var(--glass-2)', border:`1px solid ${type===v?c:'var(--border-1)'}`, color: type===v?c:'var(--text-3)' }}>
              {l}
            </button>
          ))}
        </div>
        <textarea className="input resize-none mb-5" rows={3}
          placeholder="Write your announcement to all students and drivers..."
          value={message} onChange={e => setMessage(e.target.value)}
          autoFocus />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => message.trim() && onSend(message, type)}
            disabled={!message.trim()} className="btn-primary flex-1 gap-2">
            <Send size={15}/> Send to all
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ASSIGN MODAL ─────────────────────────────────────────
const AssignModal = ({ driver, routes, shuttles, onSave, onClose }: any) => {
  const [routeId, setRouteId] = useState(driver.assignedRouteId?._id || driver.assignedRouteId || '');
  const [shuttleId, setShuttleId] = useState(driver.assignedShuttleId?._id || driver.assignedShuttleId || '');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/drivers/${driver._id}/assign`, { routeId: routeId||null, shuttleId: shuttleId||null });
      toast.success(`${driver.name} assigned successfully`);
      onSave(); onClose();
    } catch { toast.error('Assignment failed'); setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-heavy w-full max-w-md rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>Assign Driver</h3>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16}/></button>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl" style={{ background: 'var(--glass-2)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand), #818CF8)' }}>
            {driver.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{driver.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{driver.email}</p>
          </div>
        </div>
        <div className="space-y-4 mb-5">
          <div><label className="label">Route</label>
            <select className="input" value={routeId} onChange={e => setRouteId(e.target.value)}>
              <option value="">No route assigned</option>
              {routes.map((r: any, idx: number) => <option key={`${r._id}-${idx}`} value={r._id}>{r.name} ({r.shortCode})</option>)}
            </select>
          </div>
          <div><label className="label">Shuttle</label>
            <select className="input" value={shuttleId} onChange={e => setShuttleId(e.target.value)}>
              <option value="">No shuttle assigned</option>
              {shuttles.filter((s: any) => s.status !== 'retired').map((s: any) => (
                <option key={s._id} value={s._id}>{s.name} · {s.plateNumber} (Cap: {s.capacity})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <span className="loader"><span/><span/><span/></span> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ORG PANEL ────────────────────────────────────────────
const OrgPanel = ({ org, onRegenerate }: any) => {
  const [copied, setCopied] = useState(false);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code?size=200x200&data=${encodeURIComponent(org.qrUrl||'')}&color=F9FAFB&bgcolor=0d1c37&margin=2`;
  const copyCode = () => {
    navigator.clipboard.writeText(org.code);
    setCopied(true); toast.success('Code copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-4">
      <div className="glass-md rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)' }}>
            <Building2 size={22} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>{org.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{org.shortName} · {org.plan?.toUpperCase()} plan</p>
          </div>
        </div>
        {org.address && <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>📍 {org.address}</p>}
        {org.contactEmail && <p className="text-xs" style={{ color: 'var(--text-3)' }}>✉️ {org.contactEmail}</p>}
      </div>

      <div className="glass-md rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>
          Organisation Code
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
          Share this code with drivers and members so they can join when registering.
        </p>
        <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl"
          style={{ background: 'var(--glass-2)', border: '1px solid var(--border-2)' }}>
          <span className="font-mono font-bold text-3xl tracking-widest flex-1" style={{ color: 'var(--brand)' }}>
            {org.code}
          </span>
          <button onClick={copyCode} className="btn-ghost btn-icon" title="Copy">
            {copied ? <CheckCircle size={18} style={{ color: '#10B981' }} /> : <Copy size={18} />}
          </button>
        </div>
        {org.qrUrl && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl p-4" style={{ background: '#0d1c37', border: '1px solid var(--border-1)' }}>
              <img src={qrUrl} alt="Org QR" width={160} height={160} style={{ borderRadius: 8, display: 'block' }} />
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
              Students scan → org auto-filled on registration
            </p>
            <button onClick={onRegenerate} className="btn-secondary btn-sm w-full">
              🔄 Regenerate Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── STOP MODAL ───────────────────────────────────────────
const StopModal = ({ stop, pickMode, onEnterPickMode, onExitPickMode, onSearch, onClose, onSaved, onUpdateMarker }: any) => {
  const [formData, setFormData] = useState({
    name: stop?.name || '',
    lat: stop?.lat || 24.8607,
    lng: stop?.lng || 67.0011,
    isHub: stop?.isHub || false,
    isActive: stop?.isActive ?? true
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickedAddress, setPickedAddress] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  useEffect(() => {
     if (stop?.lat && stop?.lng) {
         setFormData(prev => ({ ...prev, lat: stop.lat, lng: stop.lng }));
     }
  }, [stop?.lat, stop?.lng]);

  useEffect(() => {
    const updateAddress = async () => {
      if (pickMode === 'stop') {
        setIsReverseGeocoding(true);
        try {
          const res = await reverseGeocode(formData.lat, formData.lng);
          setPickedAddress(res.label);
        } catch (err) {
          console.error("Reverse geocode failed", err);
        } finally {
          setIsReverseGeocoding(false);
        }
      }
    };

    const timer = setTimeout(updateAddress, 500);
    return () => clearTimeout(timer);
  }, [formData.lat, formData.lng, pickMode]);

  useEffect(() => {
     if (pickMode === 'stop') {
         onUpdateMarker(formData.lat, formData.lng, pickedAddress);
     }
  }, [formData.lat, formData.lng, pickedAddress, pickMode, onUpdateMarker]);

  const handleSave = async () => {
    if (!formData.name) return toast.error('Name required');
    setSaving(true);
    try {
      const res = stop?._id 
        ? await api.patch(`/admin/stops/${stop._id}`, formData)
        : await api.post('/admin/stops', formData);
      onSaved(res.data.data);
      toast.success('Stop saved');
    } catch { toast.error('Failed to save stop'); }
    finally { setSaving(false); }
  };

  const startPicking = () => {
      onEnterPickMode();
  };

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(searchQuery);
  };

  if (pickMode === 'stop') {
      return (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm">
             <div className="glass-heavy rounded-3xl p-6 shadow-2xl border border-brand/30 animate-scale-up">
                 <div className="flex items-center justify-between mb-4">
                     <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>📍 Pick Stop Location</h3>
                     <button onClick={onExitPickMode} className="btn-ghost btn-icon"><X size={16}/></button>
                 </div>
                 <form onSubmit={handleSearch} className="relative mb-4">
                     <input className="input pr-10 pl-10" placeholder="Search area..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4" size={16} />
                     <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost p-1.5"><Compass size={16} /></button>
                 </form>
                 <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-glass-1 border border-border-1">
                     <Compass size={16} className="text-brand" />
                     <div className="flex-1">
                         <p className="text-[10px] uppercase font-bold text-text-4 leading-none mb-1">Current Selection</p>
                         <p className="text-xs font-mono font-medium truncate">{formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}</p>
                         {isReverseGeocoding ? (
                           <p className="text-[10px] text-text-3 font-medium flex items-center gap-1">
                             <Loader2 size={10} className="animate-spin" /> Identifying location...
                           </p>
                         ) : pickedAddress && (
                            <p className="text-[10px] text-text-2 font-medium line-clamp-1 mt-1">📍 {pickedAddress}</p>
                         )}
                     </div>
                 </div>
                 <p className="text-[10px] text-center mb-4 text-brand font-bold uppercase tracking-widest animate-pulse">
                    Tip: Drag the pin on the map for precision
                 </p>
                 <button onClick={onExitPickMode} className="btn-primary w-full gap-2">
                     <CheckCircle size={16}/> Confirm Location
                 </button>
             </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-glass-3 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-border-1">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
               {stop?._id ? 'Edit Stop' : 'Add New Stop'}
            </h2>
            <button onClick={onClose} className="btn-ghost btn-icon"><X size={20}/></button>
        </div>
        <div className="space-y-4 mb-8">
          <div>
            <label className="label">Stop Name</label>
            <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Main Gate" />
          </div>
          
          <div className="p-4 rounded-2xl bg-glass-1 border border-dashed border-border-1">
              <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Location Coordinates</label>
                  <button onClick={startPicking} className="btn-ghost btn-sm text-brand gap-2">
                      <MapIcon size={14}/> Pick on Map
                  </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-text-4 mb-1 block">Latitude</label>
                    <input type="number" step="0.0001" className="input bg-transparent" value={formData.lat} onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-text-4 mb-1 block">Longitude</label>
                    <input type="number" step="0.0001" className="input bg-transparent" value={formData.lng} onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) })} />
                  </div>
              </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" checked={formData.isHub} onChange={e => setFormData({ ...formData, isHub: e.target.checked })} className="w-5 h-5 rounded-lg accent-brand" />
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Mark as Central Hub</span>
          </label>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="animate-spin" size={18}/> : 'Save Stop'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ROUTE MODAL ──────────────────────────────────────────
const RouteModal = ({ route, stops, getRoadRoute, onClose, onSaved }: any) => {
  const [formData, setFormData] = useState({
    name: route?.name || '',
    shortCode: route?.shortCode || '',
    color: route?.color || '#1A56DB',
    stops: route?.stops?.map((s:any) => s.stopId || s._id || s) || [],
    path: route?.path || [],
    isCircular: route?.isCircular || false,
    isActive: route?.isActive ?? true
  });
  const [saving, setSaving] = useState(false);
  const [calculatingPath, setCalculatingPath] = useState(false);

  useEffect(() => {
     const calculatePath = async () => {
        if (formData.stops.length < 2) {
            setFormData(prev => ({ ...prev, path: [] }));
            return;
        }
        setCalculatingPath(true);
        const selectedStops = formData.stops
            .map((id: string) => stops.find((s: any) => s._id === id))
            .filter(Boolean);
        
        if (selectedStops.length >= 2) {
            try {
                const roadPath = await getRoadRoute(selectedStops);
                if (roadPath) {
                    setFormData(prev => ({ ...prev, path: roadPath }));
                } else {
                    // Fallback to straight lines if road path fails
                    const straightPath = selectedStops.map((s: any) => [s.lat, s.lng]);
                    setFormData(prev => ({ ...prev, path: straightPath }));
                }
            } catch (err) {
                const straightPath = selectedStops.map((s: any) => [s.lat, s.lng]);
                setFormData(prev => ({ ...prev, path: straightPath }));
            }
        }
        setCalculatingPath(false);
     };

     calculatePath();
  }, [formData.stops, stops]);

  const handleSave = async () => {
    if (!formData.name || !formData.shortCode) return toast.error('Name and Code required');
    if (formData.stops.length < 2) return toast.error('At least 2 stops required');
    
    setSaving(true);
    try {
      const payload = {
          ...formData,
          stops: formData.stops.map((id: string, index: number) => ({
              stopId: id,
              order: index + 1
          }))
      };
      const res = route?._id 
        ? await api.patch(`/admin/routes/${route._id}`, payload)
        : await api.post('/admin/routes', payload);
      onSaved(res.data.data);
      toast.success('Route saved with road-based path');
    } catch { toast.error('Failed to save route'); }
    finally { setSaving(false); }
  };

  const toggleStop = (stopId: string) => {
      const isSelected = formData.stops.includes(stopId);
      setFormData({
          ...formData,
          stops: isSelected 
            ? formData.stops.filter((id: string) => id !== stopId)
            : [...formData.stops, stopId]
      });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-glass-3 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-border-1 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-1)' }}>
               {route?._id ? 'Edit Route' : 'Create Route'}
            </h2>
            <button onClick={onClose} className="btn-ghost btn-icon"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="label">Route Name</label>
                <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Campus Express" />
            </div>
            <div>
                <label className="label">Short Code</label>
                <input className="input" value={formData.shortCode} onChange={e => setFormData({ ...formData, shortCode: e.target.value })} placeholder="e.g. C1" />
            </div>
          </div>
          <div>
            <label className="label">Route Theme Color</label>
            <div className="flex gap-2">
                {['#1A56DB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(c => (
                    <button key={c} onClick={() => setFormData({ ...formData, color: c })} className={`w-8 h-8 rounded-full border-2 ${formData.color===c ? 'border-brand' : 'border-transparent'}`} style={{ background: c }} />
                ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Select Stops ({formData.stops.length})</label>
                {calculatingPath && <span className="flex items-center gap-1.5 text-[10px] text-brand bg-brand/10 px-2 py-0.5 rounded-full font-bold animate-pulse"><Compass size={10}/> Calculating path...</span>}
            </div>
            <p className="text-[10px] text-text-4 mb-3 uppercase tracking-wider font-bold">Select in sequence for road calculation</p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-1">
                {stops.map((s:any) => (
                    <button key={s._id} onClick={() => toggleStop(s._id)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${formData.stops.includes(s._id) ? 'bg-brand/10 border-brand/30' : 'bg-glass-1 border-border-1'}`}>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${formData.stops.includes(s._id) ? 'bg-brand border-brand' : 'border-border-1'}`}>
                            {formData.stops.includes(s._id) ? <CheckCircle size={12} color="white" /> : <span className="text-[10px]">{stops.indexOf(s)+1}</span>}
                        </div>
                        <div className="flex-1 text-left">
                            <span className="text-xs font-medium block">{s.name}</span>
                            {formData.stops.indexOf(s._id) !== -1 && (
                                <span className="text-[10px] text-brand font-bold uppercase">Sequence: #{formData.stops.indexOf(s._id) + 1}</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
          </div>
          {formData.path.length > 0 && (
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                      <Navigation size={16} />
                  </div>
                  <div>
                      <p className="text-xs font-bold text-green-500 uppercase leading-none mb-1">Road Path Generated</p>
                      <p className="text-[10px] text-text-3">{formData.path.length} path points calculated via OSRM</p>
                  </div>
              </div>
          )}
        </div>
        <div className="flex gap-3 pt-4 border-t border-border-1">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || calculatingPath} className="btn-primary flex-1">
            {saving ? <Loader2 className="animate-spin" size={18}/> : 'Save Route'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── SCHEDULE MODAL ───────────────────────────────────────
const ScheduleModal = ({ schedule, routes, shuttles, onClose, onSaved }: any) => {
    const [formData, setFormData] = useState({
        routeId: schedule?.routeId?._id || schedule?.routeId || '',
        shuttleId: schedule?.shuttleId?._id || schedule?.shuttleId || '',
        departureTime: schedule?.departureTime || '08:00',
        availableSeats: schedule?.availableSeats || 30
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!formData.routeId || !formData.departureTime) return toast.error('Route and time required');
        setSaving(true);
        try {
            const res = schedule?._id 
                ? await api.patch(`/admin/schedules/${schedule._id}`, formData)
                : await api.post('/admin/schedules', formData);
            onSaved(res.data.data);
            toast.success('Schedule saved');
        } catch { toast.error('Failed to save schedule'); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-glass-3 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-border-1">
                <h2 className="text-xl font-display font-bold mb-6" style={{ color: 'var(--text-1)' }}>
                    {schedule?._id ? 'Edit Schedule' : 'Create Schedule'}
                </h2>
                <div className="space-y-4 mb-8">
                    <div>
                        <label className="label">Route</label>
                        <select className="input" value={formData.routeId} onChange={e => setFormData({ ...formData, routeId: e.target.value })}>
                            <option value="">Select Route</option>
                            {routes.map((r: any, idx: number) => <option key={`${r._id}-${idx}`} value={r._id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Shuttle (Optional)</label>
                        <select className="input" value={formData.shuttleId} onChange={e => setFormData({ ...formData, shuttleId: e.target.value })}>
                            <option value="">Select Shuttle</option>
                            {shuttles.map((s: any, idx: number) => <option key={`${s._id}-${idx}`} value={s._id}>{s.name} ({s.plateNumber})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Departure Time</label>
                            <input type="time" className="input" value={formData.departureTime} onChange={e => setFormData({ ...formData, departureTime: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Total Capacity</label>
                            <input type="number" className="input" value={formData.availableSeats} onChange={e => setFormData({ ...formData, availableSeats: parseInt(e.target.value) })} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                        {saving ? <Loader2 className="animate-spin" size={18}/> : 'Save Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MAP_DEFAULT_CENTER = { lat: 24.9440, lng: 67.1145 };
const MAP_DEFAULT_ZOOM = 14;

const AdminPage = () => {
  const { user, logout } = useAuthStore();
  const { 
    liveShuttles, routes, stops, 
    fetchAdminRoutes: fetchRoutes, 
    fetchAdminStops: fetchStops, 
    getLiveShuttlesArray 
  } = useShuttleStore();
  const { emitAdminBroadcast, joinOrganization } = useSocket();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(new Date());
  const [studentSearch, setStudentSearch] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [lastClickedCoords, setLastClickedCoords] = useState<{lat: number, lng: number} | null>(null);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [shuttleModal, setShuttleModal] = useState<any>(null);
  const [maintenanceModal, setMaintenanceModal] = useState<any>(null);
  const [assignModal, setAssignModal] = useState<any>(null);
  const [routeModal, setRouteModal] = useState<any>(null);
  const [stopModal, setStopModal] = useState<any>(null);
  const [scheduleModal, setScheduleModal] = useState<any>(null);
  const [pickMode, setPickMode] = useState<'stop' | null>(null);

  // SWR Hooks
  const { data: dashboard, isLoading: dashLoading } = useApi('/admin/dashboard');
  const { data: drivers = [], mutate: mutateDrivers } = useApi('/admin/drivers');
  const { data: analytics } = useApi('/admin/analytics?days=7');
  const { data: shuttleList = [], mutate: mutateShuttles } = useApi('/admin/shuttles');
  const { data: org } = useApi('/admin/organisation');
  const { data: students = [] } = useApi('/admin/students');
  const { data: adminSchedules = [] } = useApi('/admin/schedules');
  const { data: lostFoundItems = [] } = useApi('/lost-found');

  const updatePickMarkerRef = useRef<any>(null);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (pickMode === 'stop') {
        updatePickMarkerRef.current?.(lat, lng);
        if (stopModal) {
            setStopModal((prev: any) => ({ ...prev, lat, lng }));
        }
    } else if (activeTab === 'map') {
        setLastClickedCoords({ lat, lng });
        updatePickMarkerRef.current?.(lat, lng);
    }
  }, [pickMode, stopModal, activeTab]);

  const mapRoutes = useMemo(() => activeTab === 'map' ? routes : [], [activeTab, routes]);
  const mapStops = useMemo(() => (activeTab === 'map' || pickMode === 'stop') ? stops : [], [activeTab, pickMode, stops]);

  const { mapInstance, fitAllShuttles, panToLocation, setTileLayer, searchPlace, updatePickMarker, clearPickMarker, getRoadRoute, centerOnUser } = useLeafletMap({
    mapRef: (activeTab === 'map' || pickMode === 'stop') ? mapRef : emptyRef,
    center: MAP_DEFAULT_CENTER,
    zoom: MAP_DEFAULT_ZOOM,
    liveShuttles: activeTab === 'map' ? liveShuttles : {},
    stops: mapStops,
    routes: mapRoutes,
    userLocation: null,
    onShuttleClick: () => {},
    onStopClick: () => {},
    onMapClick: handleMapClick,
  });

  // Handle map resizing when tab or sidebar changes
  useEffect(() => {
    if (mapInstance) {
        const timer = setTimeout(() => {
            mapInstance.invalidateSize();
        }, 500); // Increased timeout to ensure AnimatePresence transitions complete
        return () => clearTimeout(timer);
    }
  }, [mapInstance, activeTab]);

  // Initial fit when switching to map tab
  useEffect(() => {
    if (activeTab === 'map' && mapInstance) {
        fitAllShuttles();
    }
  }, [activeTab, mapInstance, fitAllShuttles]);

  updatePickMarkerRef.current = updatePickMarker;

  const handleSearchAndPin = async (q: string) => {
      const res = await searchPlace(q);
      if (res && pickMode === 'stop') {
          updatePickMarker(res.lat, res.lng);
          if (stopModal) {
              setStopModal((p: any) => ({ ...p, lat: res.lat, lng: res.lng }));
          }
      }
  };

  const handleLostFound = () => {
      mutate('/lost-found');
  };

  const isLoading = dashLoading && !dashboard;

  const refreshAll = useCallback(() => {
    mutate('/admin/dashboard');
    mutate('/admin/drivers');
    mutate('/admin/analytics?days=7');
    mutate('/admin/shuttles');
    mutate('/admin/organisation');
    mutate('/admin/students');
    mutate('/admin/schedules');
    mutate('/lost-found');
    fetchRoutes();
    fetchStops();
    setLastRefresh(new Date());
  }, [fetchRoutes, fetchStops]);

  useEffect(() => {
    const socket = getSocket();
    
    const handleEmergency = (data: any) => {
      setActiveTab('map');
      setNotifications(prev => [{ ...data, type: 'emergency', id: Date.now() + Math.random(), timestamp: Date.now() }, ...prev].slice(0, 50));
      toast.error(`🚨 EMERGENCY reported: Shuttle ${data.shuttleId?.slice(-4).toUpperCase() || 'UNKNOWN'}`, {
          duration: Infinity,
          position: 'top-center',
          style: { background: '#ef4444', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', padding: '24px', borderRadius: '16px', boxShadow: '0 0 40px rgba(239,68,68,0.4)' },
          icon: '🆘'
      });
      // Delay slightly to allow map tab transitions/init
      setTimeout(() => {
        if (data.lat && data.lng) panToLocation(data.lat, data.lng, 17);
      }, 500);
    };

    const handleGeofence = (data: any, eventType: 'enter' | 'exit') => {
       setNotifications(prev => [{ 
         ...data, 
         type: 'geofence', 
         eventType, 
         id: Date.now() + Math.random(), 
         timestamp: Date.now() 
       }, ...prev].slice(0, 50));
    };

    const handleAnnouncement = (data: any) => {
       setNotifications(prev => [{ 
         ...data, 
         type: 'broadcast', 
         id: Date.now() + Math.random(), 
         timestamp: Date.now() 
       }, ...prev].slice(0, 50));
    };

    const handleLostFound = () => {
        mutate('/lost-found');
    };

    socket.on('shuttle:emergency', handleEmergency);
    socket.on('geofence:enter', (data) => handleGeofence(data, 'enter'));
    socket.on('geofence:exit', (data) => handleGeofence(data, 'exit'));
    socket.on('admin:announcement', handleAnnouncement);
    socket.on('lost-found:new', handleLostFound);
    socket.on('lost-found:update', handleLostFound);

    return () => {
      socket.off('shuttle:emergency', handleEmergency);
      socket.off('geofence:enter');
      socket.off('geofence:exit');
      socket.off('admin:announcement', handleAnnouncement);
      socket.off('lost-found:new', handleLostFound);
      socket.off('lost-found:update', handleLostFound);
    };
  }, [panToLocation]);

  useEffect(() => {
    fetchRoutes();
    fetchStops();
    joinOrganization();
  }, [fetchRoutes, fetchStops, joinOrganization]); 

  const handleBroadcast = async (message: string, type: string) => {
    try {
      await api.post('/admin/broadcast', { message, type });
      emitAdminBroadcast(user.organizationId, message, type);
      setShowBroadcast(false);
      toast.success('Broadcast sent to all members!');
    } catch { toast.error('Broadcast failed'); }
  };

  const handleRegenOrgCode = async () => {
    if (!confirm('Regenerate org code? The old code stops working immediately.')) return;
    try {
      await api.post('/auth/regenerate-org-code');
      mutate('/admin/organisation');
      toast.success('New org code generated');
    } catch { toast.error('Failed'); }
  };

  const handleShuttleSaved = (saved: any) => {
    mutateShuttles();
    setShuttleModal(null);
  };

  const liveArr = getLiveShuttlesArray();
  const filteredStudents = students.filter((s: any) =>
    !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const TABS = [
    { key: 'overview', icon: Activity, label: 'Overview' },
    { key: 'fleet',    icon: Bus,      label: 'Fleet' },
    { key: 'routes',   icon: Route,    label: 'Routes' },
    { key: 'stops',    icon: MapPin,   label: 'Stops' },
    { key: 'schedules',icon: Clock,    label: 'Schedules' },
    { key: 'drivers',  icon: Users,    label: 'Drivers' },
    { key: 'students', icon: Users,    label: 'Members' },
    { key: 'analytics',icon: BarChart2,label: 'Analytics' },
    { key: 'chat',     icon: MessageSquare, label: 'Communications' },
    { key: 'map',      icon: MapIcon,  label: 'Live Map' },
    { key: 'lost-found', icon: Search, label: 'Lost+Found' },
    { key: 'audit-logs', icon: Shield,  label: 'Audit Logs' },
    { key: 'billing',   icon: Building2,label: 'Billing' },
    { key: 'org',      icon: Building2,label: 'Org' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Modern Sidebar */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="hidden md:flex flex-col flex-shrink-0 w-64 glass-heavy border-r border-border-1 relative z-30 overflow-y-auto custom-scrollbar"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-brand to-indigo-600 shadow-lg shadow-brand/40">
                <BusLogo size={20} />
              </div>
              <div>
                <p className="font-display font-bold text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>SHUTLIX</p>
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest leading-none">Management</p>
              </div>
            </div>

            <nav className="space-y-1">
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">Core Modules</p>
              {TABS.slice(0, 5).map(({ key, icon: Icon, label }) => (
                <button 
                  key={key} 
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative group ${activeTab === key ? 'text-brand' : 'text-text-4 hover:text-text-1 hover:bg-white/5'}`}
                >
                  <Icon size={18} className={activeTab === key ? 'text-brand' : 'opacity-40 group-hover:opacity-100'} />
                  {label}
                  {activeTab === key && (
                    <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-brand rounded-r-full" />
                  )}
                </button>
              ))}

              <p className="px-4 text-[10px] font-bold uppercase tracking-widest opacity-40 mt-8 mb-3">Operations</p>
              {TABS.slice(5, 10).map(({ key, icon: Icon, label }) => (
                <button 
                  key={key} 
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative group ${activeTab === key ? 'text-brand' : 'text-text-4 hover:text-text-1 hover:bg-white/5'}`}
                >
                  <Icon size={18} className={activeTab === key ? 'text-brand' : 'opacity-40 group-hover:opacity-100'} />
                  {label}
                  {activeTab === key && (
                    <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-brand rounded-r-full" />
                  )}
                </button>
              ))}

              <p className="px-4 text-[10px] font-bold uppercase tracking-widest opacity-40 mt-8 mb-3">System</p>
              {TABS.slice(10).map(({ key, icon: Icon, label }) => (
                <button 
                  key={key} 
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all relative group ${activeTab === key ? 'text-brand' : 'text-text-4 hover:text-text-1 hover:bg-white/5'}`}
                >
                  <Icon size={18} className={activeTab === key ? 'text-brand' : 'opacity-40 group-hover:opacity-100'} />
                  {label}
                  {activeTab === key && (
                    <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-6 bg-brand rounded-r-full" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t border-border-1">
             <div className="glass-md p-4 rounded-3xl flex items-center gap-3 mb-4">
                <Avatar user={user} size={32} />
                <div className="flex-1 min-w-0">
                   <p className="text-xs font-black truncate" style={{ color: 'var(--text-1)' }}>{user?.name}</p>
                   <p className="text-[10px] font-bold opacity-40 uppercase truncate">Administrator</p>
                </div>
             </div>
             <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all">
                <LogOut size={16} /> Termination
             </button>
          </div>
        </motion.aside>

        <div className="flex-1 flex flex-col min-w-0">
           {/* Top Bar Refinement */}
           <header className="h-16 glass-md border-b border-border-1 px-8 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-6 flex-1">
                 <div className="relative w-full max-w-md hidden lg:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    <input 
                      className="w-full h-11 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold focus:border-brand/40 outline-none transition-all" 
                      placeholder="Search shuttles, routes or logs..."
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    {liveArr.length > 0 && (
                      <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                         <span className="text-[10px] font-bold uppercase tracking-widest text-green-500">{liveArr.length} ACTIVE SHUTTLES</span>
                      </div>
                    )}
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <button onClick={refreshAll} className="w-10 h-10 rounded-xl glass-md flex items-center justify-center hover:bg-white/5 transition-all">
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                 </button>
                 <button onClick={() => setShowBroadcast(true)} className="px-4 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all flex items-center gap-2">
                    <Radio size={14} /> Broadcast
                 </button>
                 <ThemeToggle />
                 <div className="w-px h-6 bg-border-1 mx-2" />
                 <button onClick={() => setShowNotificationCenter(!showNotificationCenter)} className="relative w-10 h-10 rounded-xl glass-md flex items-center justify-center">
                    <Bell size={16} />
                    {notifications.some(n => !n.read) && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-base" />}
                 </button>
              </div>
           </header>

           <div className={`flex-1 ${activeTab === 'map' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'} bg-bg-base/30`}>
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={`p-6 ${activeTab === 'map' ? 'flex-1 flex flex-col min-h-0' : ''}`}
                >
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="flex items-end justify-between">
                         <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-brand mb-1">Dashboard</p>
                            <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--text-1)' }}>Fleet Overview</h1>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Local Time</p>
                            <p className="text-xs font-bold">{new Date().toLocaleTimeString()}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatTile icon={Bus} label="Active Fleet" value={liveArr.length} color="#2563EB" trend={12} sub="Shuttles on-route" loading={false} />
                        <StatTile icon={Users} label="Total Members" value={dashboard?.totalStudents} color="#10B981" trend={5} sub="Registered users" loading={isLoading} />
                        <StatTile icon={Activity} label="Today's Trips" value={dashboard?.tripsToday} color="#D97706" trend={-2} sub="Completed trips" loading={isLoading} />
                        <StatTile icon={Route} label="Active Routes" value={dashboard?.totalRoutes ?? routes.length} color="#8B5CF6" trend={0} sub="Network coverage" loading={isLoading} />
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                         <div className="xl:col-span-2 space-y-8">
                            {liveArr.length > 0 && (
                              <section className="glass-md rounded-[2.5rem] p-6 border border-border-1">
                                <div className="flex items-center justify-between mb-6">
                                  <div>
                                     <h3 className="font-display font-bold text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>Real-time Fleet Status</h3>
                                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Live sync from {liveArr.length} shuttles</p>
                                  </div>
                                  <button onClick={() => setActiveTab('map')} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                    View Full Map
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {liveArr.map(s => {
                                    const route = routes.find(r => r._id === s.routeId);
                                    return (
                                      <motion.div 
                                        layoutId={`fleet-${s.shuttleId}`}
                                        key={s.shuttleId} 
                                        className="relative p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-brand/30 transition-all group overflow-hidden"
                                      >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-brand/5 blur-2xl group-hover:bg-brand/10 transition-colors" />
                                        <div className="flex items-center gap-4 relative z-10">
                                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: `${route?.color||'#1A56DB'}15`, border: `1px solid ${route?.color||'#1A56DB'}30` }}>
                                            <span className="font-display font-bold text-sm" style={{ color: route?.color||'var(--brand)' }}>
                                              {route?.shortCode||'?'}
                                            </span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate" style={{ color: 'var(--text-1)' }}>
                                              {route?.name||'Unknown route'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[10px] font-medium opacity-50 uppercase tracking-tight">Speed: {s.speed ? Math.round(s.speed)+' km/h' : 'Stationary'}</span>
                                            </div>
                                          </div>
                                          <div className="flex-shrink-0 text-right">
                                             <div className="text-[10px] font-bold text-brand mb-1 tracking-widest uppercase">{Math.round((s.passengerCount / (s.capacity || 30)) * 100)}% LOAD</div>
                                             <div className="w-20 bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                                                <motion.div 
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${(s.passengerCount / (s.capacity || 30)) * 100}%` }}
                                                  className="h-full rounded-full" 
                                                  style={{ background: route?.color || 'var(--brand)' }} 
                                                />
                                             </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </section>
                            )}

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                               {[
                                 { label: 'Fleet Management', icon: Bus, action: () => { setActiveTab('fleet'); setShuttleModal('new'); }, color: '#2563EB' },
                                 { label: 'Routes', icon: Route, action: () => { setActiveTab('routes'); setRouteModal('new'); }, color: '#8B5CF6' },
                                 { label: 'Stops', icon: MapPin, action: () => { setActiveTab('stops'); setStopModal('new'); }, color: '#D97706' },
                                 { label: 'Broadcast Message', icon: Bell, action: () => setShowBroadcast(true), color: '#10B981' },
                               ].map(({ label, icon: Icon, action, color }) => (
                                 <button key={label} onClick={action}
                                   className="glass-md rounded-3xl p-6 flex flex-col items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 border border-border-1 active:scale-95">
                                   <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                                     style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                                     <Icon size={24} style={{ color }} />
                                   </div>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: 'var(--text-2)' }}>{label}</span>
                                 </button>
                               ))}
                            </div>
                         </div>

                         <div className="space-y-8">
                            {analytics && (
                              <section className="glass-md rounded-[2.5rem] p-6 border border-border-1">
                                <div className="mb-6">
                                   <h3 className="font-display font-black text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>Ridership Telemetry</h3>
                                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Past 7 days activity signature</p>
                                </div>
                                <BarChart data={analytics.ridership} color="var(--brand)" />
                              </section>
                            )}
                            
                            <section className="glass-md rounded-[2.5rem] p-6 border border-border-1">
                               <div className="flex items-center justify-between mb-6">
                                  <h3 className="font-display font-black text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>System Messages</h3>
                                  <button onClick={() => setNotifications([])} className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Clear All</button>
                               </div>
                               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                  {notifications.length > 0 ? notifications.map((n: any) => (
                                    <div key={n.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4">
                                       <div className={`p-2 h-fit rounded-xl ${n.type === 'emergency' ? 'bg-red-500/20 text-red-500' : 'bg-brand/20 text-brand'}`}>
                                          {n.type === 'emergency' ? <AlertTriangle size={16} /> : <Bell size={16} />}
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest mb-1">{n.type} Signal</p>
                                          <p className="text-xs font-bold mb-2 leading-snug opacity-80">{n.message || (n.type === 'emergency' ? `Emergency at shuttle ${n.shuttleId?.slice(-6)}` : 'System Update')}</p>
                                          <p className="text-[10px] font-mono opacity-30">{new Date(n.timestamp).toLocaleTimeString()}</p>
                                       </div>
                                    </div>
                                  )) : (
                                    <div className="text-center py-12">
                                       <Activity className="mx-auto opacity-10 mb-2" size={40} />
                                       <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Monitoring passive channels...</p>
                                    </div>
                                  )}
                               </div>
                            </section>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'fleet' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Fleet Management</p>
                          <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Unit Telemetry</h1>
                        </div>
                        <button onClick={() => setShuttleModal('new')} className="px-6 py-3 rounded-2xl bg-brand text-white text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2">
                          <Plus size={16}/> Deploy Unit
                        </button>
                      </div>

                      <div className="grid gap-6">
                        {shuttleList.length === 0 ? (
                          <div className="glass-md rounded-[2.5rem] py-24 text-center border-2 border-dashed border-border-1">
                             <Bus size={48} className="mx-auto opacity-10 mb-4" />
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No units deployed in sector</p>
                          </div>
                        ) : (
                          shuttleList.map((shuttle: any) => {
                            const live = Object.values(liveShuttles).find((s: any) => s.shuttleId === shuttle._id);
                            const statusColor = live ? '#10B981' : shuttle.status === 'maintenance' ? '#F59E0B' : shuttle.status === 'retired' ? '#EF4444' : 'var(--text-4)';
                            return (
                              <div key={shuttle._id} className="glass-md rounded-3xl p-6 border border-border-1 hover:border-brand/30 transition-all group">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                                      style={{ background: live ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${live ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)'}` }}>
                                      {shuttle.shortCode ? (
                                        <span className="font-display font-black text-xl" style={{ color: statusColor }}>{shuttle.shortCode}</span>
                                      ) : (
                                        <Bus size={28} style={{ color: statusColor }} />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-3 mb-1">
                                         <h3 className="font-display font-black text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>{shuttle.name}</h3>
                                         <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${live ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/40'}`}>
                                            {live ? 'ACTIVE' : shuttle.status.toUpperCase()}
                                         </span>
                                      </div>
                                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                        PN: {shuttle.plateNumber} • CAP: {shuttle.capacity} • {shuttle.make || 'GENERIC'} {shuttle.model || 'UNIT'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {live && (
                                       <div className="hidden lg:block text-right mr-6">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Live Occupancy</p>
                                          <div className="flex items-center gap-2">
                                             <div className="w-32 bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                                                <div className="h-full bg-brand rounded-full" style={{ width: `${(live.passengerCount / shuttle.capacity) * 100}%` }} />
                                             </div>
                                             <span className="text-[10px] font-black italic">{live.passengerCount} / {shuttle.capacity}</span>
                                          </div>
                                       </div>
                                    )}
                                    <button onClick={() => setShuttleModal(shuttle)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-brand/10 hover:text-brand transition-all flex items-center justify-center">
                                      <Edit2 size={16}/>
                                    </button>
                                    <button onClick={() => setMaintenanceModal(shuttle)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-orange-500/10 hover:text-orange-500 transition-all flex items-center justify-center">
                                      <Wrench size={16}/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'routes' && (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Infrastructure</p>
                          <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Route Architect</h1>
                        </div>
                        <button onClick={() => setRouteModal('new')} className="px-6 py-3 rounded-2xl bg-brand text-white text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2">
                          <Plus size={16}/> Create Path
                        </button>
                      </div>

                      <div className="grid gap-6">
                        {routes.length === 0 ? (
                          <div className="glass-md rounded-[2.5rem] py-24 text-center border-2 border-dashed border-border-1">
                             <Route size={48} className="mx-auto opacity-10 mb-4" />
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No routes defined in registry</p>
                          </div>
                        ) : (
                          routes.map(route => (
                            <div key={route._id} className="glass-md rounded-3xl p-6 border border-border-1 hover:border-brand/30 transition-all group relative overflow-hidden">
                               <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: route.color || 'var(--brand)' }} />
                               <div className="flex items-center justify-between relative z-10 pl-2">
                                  <div className="flex items-center gap-6">
                                     <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                                          style={{ background: `${route.color || '#2563EB'}15`, border: `1px solid ${route.color || '#2563EB'}30` }}>
                                         <span className="font-display font-black text-sm uppercase" style={{ color: route.color || 'var(--brand)' }}>
                                            {route.shortCode || 'RX'}
                                         </span>
                                     </div>
                                     <div>
                                        <div className="flex items-center gap-3 mb-1">
                                           <h3 className="font-display font-black text-lg tracking-tight" style={{ color: 'var(--text-1)' }}>{route.name}</h3>
                                           {route.isCircular && (
                                              <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-tighter">CIRCULAR</span>
                                           )}
                                        </div>
                                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                          {route.stops?.length || 0} STOPS DEFINED • STATUS: {route.isActive ? 'OPERATIONAL' : 'OFFLINE'}
                                        </p>
                                     </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                     <button onClick={() => setRouteModal(route)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-brand text-[10px] font-black uppercase tracking-widest transition-all">
                                        Configure
                                     </button>
                                  </div>
                               </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'schedules' && (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Operations</p>
                          <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Timing Registry</h1>
                        </div>
                        <button onClick={() => setScheduleModal('new')} className="px-6 py-3 rounded-2xl bg-brand text-white text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2">
                          <Plus size={16}/> Add Session
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {adminSchedules.length === 0 ? (
                           <div className="col-span-full glass-md rounded-[2.5rem] py-24 text-center border-2 border-dashed border-border-1">
                             <Clock size={48} className="mx-auto opacity-10 mb-4" />
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No timing records found</p>
                          </div>
                        ) : (
                          adminSchedules.map((s: any) => (
                            <div key={s._id} className="glass-md rounded-3xl p-6 border border-border-1 flex items-center justify-between group hover:border-brand/30 transition-all">
                              <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 group-hover:scale-105 transition-transform">
                                  <Clock size={28}/>
                                </div>
                                <div>
                                  <p className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>{s.departureTime}</p>
                                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                                    {s.routeId?.name} • {s.shuttleId?.name || 'GENERIC UNIT'}
                                  </p>
                                </div>
                              </div>
                              <button onClick={() => setScheduleModal(s)} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-brand/10 hover:text-brand transition-all flex items-center justify-center">
                                <Edit2 size={18}/>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'map' && (
                    <div className="w-full flex-1 relative overflow-hidden rounded-[2.5rem] border border-border-1 shadow-2xl min-h-[500px] bg-zinc-100 dark:bg-zinc-900">
                        <div ref={mapRef} className="w-full h-full z-0" />

                        {lastClickedCoords && !pickMode && (
                            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                                <motion.button 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => {
                                        setStopModal('new');
                                        setPickMode(null);
                                        setLastClickedCoords(null);
                                        setStopModal({ lat: lastClickedCoords.lat, lng: lastClickedCoords.lng });
                                    }}
                                    className="pointer-events-auto glass-heavy border-brand border px-8 py-4 rounded-full text-brand font-black uppercase tracking-widest text-xs shadow-2xl flex items-center gap-3 hover:bg-brand hover:text-white transition-all scale-110 active:scale-95"
                                >
                                    <Plus size={18} /> Create Stop Here
                                </motion.button>
                            </div>
                        )}
                        
                        <div className="absolute top-6 left-6 right-6 z-10 flex flex-col md:flex-row gap-4 pointer-events-none">
                            <div className="max-w-md w-full pointer-events-auto">
                                <MapSearchBar onSearch={searchPlace} onSelectResult={(res) => panToLocation(res.lat, res.lng, 17)} />
                            </div>
                            
                            <div className="flex gap-2 pointer-events-auto">
                                <div className="relative group">
                                    <button 
                                        className="glass-heavy px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3 border border-white/5 shadow-xl"
                                    >
                                        <Layers size={14} className="text-brand" />
                                        <span>Map Vision</span>
                                        <ChevronDown size={14} className="opacity-40" />
                                    </button>
                                    
                                    <div className="absolute top-full left-0 mt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all z-30">
                                        <div className="glass-heavy border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[180px] overflow-hidden">
                                            {[
                                                { id: 'cartoVoyager', label: 'Light Map', icon: MapIcon },
                                                { id: 'cartoDark', label: 'Terminal x Ray', icon: Activity },
                                                { id: 'esriSatellite', label: 'Orbital Scan', icon: Layers }
                                            ].map(style => (
                                                <button 
                                                    key={style.id}
                                                    onClick={() => setTileLayer(style.id as any)} 
                                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all text-left"
                                                >
                                                    <style.icon size={14} />
                                                    {style.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-3">
                           <button onClick={() => centerOnUser()} className="w-14 h-14 glass-heavy text-brand rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all border border-brand/20 flex items-center justify-center">
                                <Compass size={28} />
                            </button>
                           <button onClick={() => fitAllShuttles()} className="w-14 h-14 bg-brand text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
                                <Navigation size={28} />
                            </button>
                        </div>
                    </div>
                  )}

                  {activeTab === 'drivers' && (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Human Intelligence</p>
                           <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Deployment Staff</h1>
                        </div>
                        <div className="px-4 py-2 rounded-2xl glass-md border border-border-1 flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-widest">{drivers.length} ACTIVE OPERATORS</span>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         {drivers.map((driver: any) => {
                            const isOnline = Object.values(liveShuttles).some((s: any) => s.driverId === driver._id);
                            return (
                                <div key={driver._id} className="group glass-md rounded-[2.5rem] p-7 border border-border-1 hover:border-brand/30 transition-all flex flex-col h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl rounded-full" />
                                    
                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                              <Avatar user={driver} size={48} />
                                                 <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-bg-base ${isOnline ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-gray-400 opacity-50'}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-display font-black text-xl truncate tracking-tight leading-none mb-1" style={{ color: 'var(--text-1)' }}>{driver.name}</h3>
                                                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">OPERATOR ID: {driver._id.slice(-6).toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setAssignModal(driver)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-brand/10 hover:text-brand flex items-center justify-center transition-all border border-white/5">
                                            <Settings size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4 mb-8 flex-1">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">Deployed Unit</p>
                                            {driver.assignedShuttleId ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                                                        <Bus size={18} className="text-brand" />
                                                    </div>
                                                    <span className="text-xs font-black italic tracking-tight">{shuttleList.find((s: any) => s._id === (driver.assignedShuttleId?._id || driver.assignedShuttleId))?.name || 'Assigned Shuttle'}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 opacity-20">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <X size={18} />
                                                    </div>
                                                    <span className="text-xs font-bold italic">Standby Mode</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                            <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">Primary Route</p>
                                            {driver.assignedRouteId ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                                        <MapIcon size={18} className="text-violet-500" />
                                                    </div>
                                                    <span className="text-xs font-black italic tracking-tight">Route {driver.assignedRouteId.shortCode || '??'}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 opacity-20">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <X size={18} />
                                                    </div>
                                                    <span className="text-xs font-bold italic">Unassigned Path</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setAssignModal(driver)}
                                        className="w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white hover:border-brand hover:shadow-xl transition-all active:scale-95"
                                    >
                                        Reconfigure Assignment
                                    </button>
                                </div>
                            );
                         })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'students' && (
                    <div className="space-y-6">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">User Registry</p>
                           <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Registered Members</h1>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                            <input 
                              className="w-full md:w-80 h-12 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold focus:border-brand/40 outline-none transition-all" 
                              placeholder="Search by name, email or ID..."
                              value={studentSearch} 
                              onChange={e => setStudentSearch(e.target.value)}
                            />
                        </div>
                      </div>

                      <div className="glass-md rounded-[2.5rem] overflow-hidden border border-border-1">
                         <div className="overflow-x-auto">
                            <table className="w-full text-left">
                               <thead>
                                  <tr className="border-b border-white/5 bg-white/5">
                                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Ident Profile</th>
                                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Access Level</th>
                                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Status</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {filteredStudents.length === 0 ? (
                                    <tr>
                                       <td colSpan={3} className="px-8 py-20 text-center">
                                          <p className="text-[10px] font-black uppercase tracking-widest opacity-20 italic">No matching records decrypted</p>
                                       </td>
                                    </tr>
                                  ) : filteredStudents.map((student: any) => (
                                    <tr key={student._id || student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                       <td className="px-8 py-5">
                                          <div className="flex items-center gap-4">
                                             <Avatar user={student} size={32} />
                                             <div>
                                                <p className="text-xs font-black italic leading-tight" style={{ color: 'var(--text-1)' }}>{student.name}</p>
                                                <p className="text-[10px] font-bold opacity-40 tracking-tight">{student.email}</p>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-8 py-5">
                                          <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-md uppercase tracking-widest border border-indigo-500/20">MEMBER_STUDENT</span>
                                       </td>
                                       <td className="px-8 py-5 text-right">
                                          <span className="text-[10px] font-black italic text-green-500 uppercase tracking-tighter shadow-sm shadow-green-500/20">VERIFIED</span>
                                       </td>
                                    </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'chat' && (
                    <ChatPanel />
                  )}

                  {activeTab === 'analytics' && (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Intelligence Report</p>
                           <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Performance Analytics</h1>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-right">
                              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest text-[9px]">Last Synced</p>
                              <p className="text-xs font-black italic">JUST NOW</p>
                           </div>
                        </div>
                      </div>

                       <div className="grid lg:grid-cols-2 gap-8">
                          <div className="glass-md rounded-[2.5rem] p-8 border border-border-1 relative overflow-hidden group">
                              <div className="flex items-center justify-between mb-8">
                                 <h3 className="text-sm font-black uppercase tracking-widest opacity-40">Weekly Payload Frequency</h3>
                                 <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                                    <TrendingUp size={18} />
                                 </div>
                              </div>
                              <BarChart data={analytics?.ridership} color="var(--brand)" />
                          </div>

                          <div className="glass-md rounded-[2.5rem] p-8 border border-border-1">
                              <h3 className="text-sm font-black uppercase tracking-widest opacity-40 mb-8">Network Sector Performance</h3>
                              <div className="space-y-6">
                                  {analytics?.routeStats?.map((s:any) => (
                                      <div key={s.name} className="space-y-2">
                                          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                                              <span className="opacity-60">{s.name}</span>
                                              <span className="text-brand italic">{s.count} TRIPS</span>
                                          </div>
                                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                              <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(s.count/Math.max(...analytics.routeStats.map((x: any) => x.count), 1) * 100)}%` }}
                                                className="h-full bg-brand rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)]" 
                                              />
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'stops' && (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Infrastructure Grid</p>
                           <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Deployment Hubs</h1>
                        </div>
                        <div className="flex items-center gap-3">
                           <button onClick={() => setActiveTab('map')} className="glass-md px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-border-1 hover:border-brand/40 transition-all">
                              <MapIcon size={14} className="text-brand"/> Interlink View
                           </button>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         {stops.map((stop: any) => (
                            <div key={stop._id} className="group glass-md rounded-[2.5rem] p-6 border border-border-1 hover:border-brand/30 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full" />
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 group-hover:scale-110 transition-transform">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-display font-black text-xl truncate tracking-tight leading-none mb-1" style={{ color: 'var(--text-1)' }}>{stop.name}</h3>
                                        <p className="text-[10px] font-mono font-black opacity-30 tracking-tight">{stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}</p>
                                    </div>
                                    <button onClick={() => setStopModal(stop)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all border border-white/5">
                                        <Edit2 size={16}/>
                                    </button>
                                </div>
                                <div className="mt-6 flex items-center gap-2">
                                   <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded ${stop.isHub ? 'bg-orange-500 text-white' : 'bg-white/10 opacity-40'}`}>
                                      {stop.isHub ? 'PRIMARY HUB' : 'TRANSIT POINT'}
                                   </span>
                                </div>
                            </div>
                         ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'org' && (
                    <div className="max-w-xl">
                      <div className="mb-6">
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Corporate Identity</p>
                         <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Organisation Profile</h1>
                      </div>
                      {org
                        ? <OrgPanel org={org} onRegenerate={handleRegenOrgCode} />
                        : <div className="flex justify-center py-20 bg-white/5 rounded-[2.5rem] border border-white/5"><Loader2 className="animate-spin text-brand" size={32}/></div>
                      }
                    </div>
                  )}

                  {activeTab === 'lost-found' && (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                           <div>
                               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand mb-1">Asset Recovery</p>
                               <h1 className="font-display font-black text-2xl tracking-tighter" style={{ color: 'var(--text-1)' }}>Lost & Found Logistics</h1>
                           </div>
                           <button onClick={() => mutate('/lost-found')} className="w-12 h-12 glass-md rounded-2xl flex items-center justify-center text-brand hover:bg-brand hover:text-white transition-all shadow-lg active:scale-95">
                              <RefreshCw size={20} />
                           </button>
                       </div>
                       
                       <div className="grid gap-6">
                           {lostFoundItems.map((item: any) => (
                               <motion.div 
                                 initial={{ opacity: 0, x: -20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 key={item._id} 
                                 className="group glass-md p-6 rounded-[2.5rem] border border-border-1 flex flex-col md:flex-row items-center gap-6 hover:border-brand/30 transition-all"
                               >
                                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border ${item.type === 'lost' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                       {item.type === 'lost' ? <Search size={28}/> : <CheckCircle size={28}/>}
                                   </div>
                                   <div className="flex-1 text-center md:text-left">
                                       <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                           <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/10 w-fit mx-auto md:mx-0">{item.category}</span>
                                           <h3 className="font-display font-black text-xl italic tracking-tight" style={{ color: 'var(--text-1)' }}>{item.item}</h3>
                                       </div>
                                       <p className="text-xs opacity-50 font-bold leading-relaxed line-clamp-2 mb-2">{item.description}</p>
                                       <div className="flex items-center justify-center md:justify-start gap-2">
                                          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10">
                                             <Avatar user={item.reportedBy} size={24} />
                                          </div>
                                          <p className="text-[10px] font-black uppercase tracking-tighter opacity-40">REPORTED BY: {item.reportedBy?.name || 'ANONYMOUS'}</p>
                                       </div>
                                   </div>
                                   <div className="flex flex-col items-center md:items-end gap-3 min-w-[140px]">
                                       <div className="relative group/select w-full">
                                          <select 
                                            className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest appearance-none outline-none focus:border-brand/40 transition-all cursor-pointer text-center md:text-left"
                                            value={item.status}
                                            onChange={async (e) => {
                                                try {
                                                    await api.patch(`/lost-found/${item._id}`, { status: e.target.value });
                                                    toast.success('Inventory state updated');
                                                    mutate('/lost-found');
                                                } catch (err) { toast.error('State sync failed'); }
                                            }}
                                          >
                                              <option value="reported">Reported</option>
                                              <option value="found">In Possession</option>
                                              <option value="claimed">Claim Authenticated</option>
                                              <option value="returned">Object Restored</option>
                                          </select>
                                       </div>
                                       <p className="text-[10px] font-mono font-black opacity-30 italic">{new Date(item.createdAt).toLocaleDateString()} @ {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                   </div>
                               </motion.div>
                           ))}
                           {lostFoundItems.length === 0 && (
                               <div className="py-32 text-center glass-md rounded-[3rem] border-2 border-dashed border-border-1 flex flex-col items-center">
                                   <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-6">
                                      <Search size={40} />
                                   </div>
                                   <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Zero active assets in registry</p>
                               </div>
                           )}
                       </div>
                    </div>
                  )}
                  
                  {activeTab === 'audit-logs' && <AuditLogPanel />}
                  {activeTab === 'billing' && <BillingPanel org={org} shuttleCount={shuttleList.length} />}
                </motion.div>
              </AnimatePresence>
           </div>
        </div>
      </div>

      {showBroadcast && <BroadcastModal onSend={handleBroadcast} onClose={() => setShowBroadcast(false)} />}
      {shuttleModal !== null && (
        <ShuttleFormModal
          shuttle={shuttleModal === 'new' ? null : shuttleModal}
          drivers={drivers}
          routes={routes}
          onSave={handleShuttleSaved}
          onClose={() => setShuttleModal(null)}
        />
      )}
      {maintenanceModal && (
        <MaintenanceModal shuttle={maintenanceModal} onClose={() => setMaintenanceModal(null)} onSaved={refreshAll} />
      )}
      {assignModal && (
        <AssignModal
          driver={assignModal}
          routes={routes}
          shuttles={shuttleList}
          onSave={refreshAll}
          onClose={() => setAssignModal(null)}
        />
      )}
      {stopModal && (
          <StopModal
            stop={stopModal === 'new' ? null : stopModal}
            pickMode={pickMode}
            onEnterPickMode={() => { setPickMode('stop'); setActiveTab('map'); }}
            onExitPickMode={() => { setPickMode(null); clearPickMarker(); }}
            onSearch={handleSearchAndPin}
            onClose={() => { setStopModal(null); setPickMode(null); clearPickMarker(); }}
            onSaved={(s: any) => { fetchStops(); refreshAll(); setStopModal(null); setPickMode(null); clearPickMarker(); }}
            onUpdateMarker={updatePickMarker}
          />
      )}
      {routeModal && (
          <RouteModal
            route={routeModal === 'new' ? null : routeModal}
            stops={stops}
            getRoadRoute={getRoadRoute}
            onClose={() => setRouteModal(null)}
            onSaved={(r: any) => { fetchRoutes(); refreshAll(); setRouteModal(null); }}
          />
      )}
      {scheduleModal && (
          <ScheduleModal
            schedule={scheduleModal === 'new' ? null : scheduleModal}
            routes={routes}
            shuttles={shuttleList}
            onClose={() => setScheduleModal(null)}
            onSaved={() => { refreshAll(); setScheduleModal(null); }}
          />
      )}

      <AnimatePresence>
        {showNotificationCenter && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowNotificationCenter(false)}
               className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
            />
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-sm glass-heavy shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[100] border-l border-white/10 flex flex-col"
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
                    <div>
                        <h3 className="font-display font-black text-lg uppercase tracking-tighter" style={{ color: 'var(--text-1)' }}>Mission Control</h3>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mt-0.5">Real-time Intelligence History</p>
                    </div>
                    <button onClick={() => setShowNotificationCenter(false)} className="btn-ghost btn-icon">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                            <Activity size={48} className="mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">System Silent</p>
                            <p className="text-[10px] mt-2 font-bold">No operational events recorded</p>
                        </div>
                    ) : (
                        notifications.map((n) => {
                            const isEmergency = n.type === 'emergency';
                            const isBroadcast = n.type === 'broadcast';
                            const isGeofence = n.type === 'geofence';

                            return (
                                <motion.div 
                                    key={n.id} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => {
                                        if (n.lat && n.lng) {
                                            setActiveTab('map');
                                            setTimeout(() => panToLocation(n.lat, n.lng, 17), 100);
                                        }
                                    }}
                                    className={`group relative p-5 rounded-[2rem] border transition-all cursor-pointer ${
                                        isEmergency 
                                            ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                                            : isBroadcast
                                                ? 'bg-brand/10 border-brand/40 shadow-[0_0_15_rgba(37,99,235,0.1)]'
                                                : 'bg-glass-2 border-border-1 hover:border-brand/30'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                                            isEmergency ? 'bg-red-500 text-white animate-pulse' : 
                                            isBroadcast ? 'bg-brand text-white' : 
                                            'bg-glass-1 text-brand'
                                        }`}>
                                            {isEmergency ? <AlertTriangle size={18} /> : 
                                             isBroadcast ? <Radio size={18} /> : 
                                             isGeofence && n.eventType === 'enter' ? <CheckCircle size={18} /> : 
                                             <Navigation size={18} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${
                                                    isEmergency ? 'text-red-500' : isBroadcast ? 'text-brand' : 'opacity-40'
                                                }`}>
                                                    {isEmergency ? 'Critical SOS' : 
                                                     isBroadcast ? 'Admin Broadcast' : 
                                                     isGeofence ? `Geofence ${n.eventType.toUpperCase()}` : 
                                                     'System Update'}
                                                </p>
                                                <p className="text-[9px] font-mono opacity-30">
                                                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </p>
                                            </div>
                                            <p className="text-xs font-black italic" style={{ color: 'var(--text-1)' }}>
                                                {isEmergency 
                                                    ? `Emergency signal from Shuttle ${n.shuttleId.slice(-4).toUpperCase()}`
                                                    : isBroadcast
                                                        ? n.message
                                                        : isGeofence
                                                            ? `Shuttle ${n.shuttleId.slice(-4).toUpperCase()} ${n.eventType === 'enter' ? 'arrived at' : 'departed from'} ${n.stopName || 'Target Zone'}`
                                                            : n.message || 'Operational event recorded'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {n.lat && n.lng && (
                                        <div className="mt-3 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <MapPin size={10} className="text-brand" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">Jump to Map</span>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
                    <button 
                        onClick={() => {
                           setNotifications(prev => prev.map(n => ({...n, read: true})));
                           setShowNotificationCenter(false);
                        }}
                        className="btn-secondary flex-1 text-[10px] font-black uppercase tracking-widest"
                    >
                        Mark Read
                    </button>
                    <button 
                        onClick={() => {
                            if (confirm('Wipe mission logs?')) setNotifications([]);
                        }}
                        className="btn-ghost flex-1 text-red-500 text-[10px] font-black uppercase tracking-widest"
                    >
                        Clear History
                    </button>
                </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
