import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus, Users, Map, BarChart2, LogOut, Plus, Edit2,
  Navigation, TrendingUp, AlertTriangle, Radio, RefreshCw,
  MapPin, X, Send, Activity, Layers, Wrench, Route,
  CheckCircle, XCircle, ChevronRight, QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useSocket from '../hooks/useSocket';
import useGoogleMap from '../hooks/useGoogleMap';
import CapacityBadge from '../components/ui/CapacityBadge';
import ShuttleFormModal from '../components/ShuttleFormModal';
import MaintenanceModal from '../components/MaintenanceModal';
import api from '../services/api';
import toast from 'react-hot-toast';

// ── STAT TILE ────────────────────────────────────────────────────────────────
const StatTile = ({ icon: Icon, label, value, sub, color = 'var(--brand)' }) => (
  <div className="rounded-2xl p-5"
    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
        <Icon size={20} style={{ color }} />
      </div>
    </div>
    <div className="font-display font-bold text-3xl mb-0.5" style={{ color: 'var(--text-1)' }}>
      {value ?? '—'}
    </div>
    <div className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</div>
    {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{sub}</div>}
  </div>
);

// ── LIVE SHUTTLE ROW ─────────────────────────────────────────────────────────
const LiveShuttleRow = ({ shuttle, routes, onLocate }) => {
  const route = routes.find(r => r._id === shuttle.routeId);
  const timeSince = shuttle.receivedAt
    ? Math.round((Date.now() - shuttle.receivedAt) / 1000) : null;
  const isStale = timeSince > 30;
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isStale ? 'var(--surface-4)' : `${route?.color || '#1A56DB'}22` }}>
        <Bus size={15} style={{ color: isStale ? 'var(--text-4)' : (route?.color || 'var(--brand)') }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
            {route?.name || `Shuttle ${shuttle.shuttleId?.slice(-4)}`}
          </span>
          <span className={isStale ? 'status-dot-amber' : 'status-dot-green'} />
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-3)' }}>
          <span>{shuttle.passengerCount || 0} pax</span>
          <span>{shuttle.speed ? `${Math.round(shuttle.speed)} km/h` : 'Stopped'}</span>
          {timeSince && <span>{timeSince}s ago</span>}
        </div>
      </div>
      <div className="w-28 flex-shrink-0">
        <CapacityBadge current={shuttle.passengerCount || 0} total={shuttle.capacity || 30} size="sm" />
      </div>
      <button onClick={() => onLocate(shuttle)} className="btn-ghost btn-icon flex-shrink-0">
        <Navigation size={14} />
      </button>
    </div>
  );
};

// ── DRIVER ROW ───────────────────────────────────────────────────────────────
const DriverRow = ({ driver, onToggleActive }) => (
  <div className="flex items-center gap-3 py-3 px-4 rounded-xl"
    style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
      style={{ background: 'var(--surface-4)', color: 'var(--brand)' }}>
      {driver.name?.charAt(0)?.toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{driver.name}</p>
      <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{driver.email}</p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className={driver.isOnDuty ? 'badge-green text-xs' : 'badge-gray text-xs'}>
        {driver.isOnDuty ? 'On Duty' : 'Off Duty'}
      </span>
      <button onClick={() => onToggleActive(driver._id, !driver.isActive)}
        title={driver.isActive ? 'Deactivate' : 'Activate'} className="btn-ghost btn-icon">
        {driver.isActive
          ? <CheckCircle size={16} style={{ color: '#10B981' }} />
          : <XCircle size={16} style={{ color: '#EF4444' }} />}
      </button>
    </div>
  </div>
);

// ── BROADCAST MODAL ──────────────────────────────────────────────────────────
const BroadcastModal = ({ onSend, onClose }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-slide-up"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
        <h3 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-1)' }}>
          Broadcast Message
        </h3>
        <div className="mb-4">
          <label className="label">Type</label>
          <div className="flex gap-2">
            {[
              { v: 'info', label: 'Info', color: '#60A5FA' },
              { v: 'warning', label: 'Warning', color: '#FBBF24' },
              { v: 'danger', label: 'Alert', color: '#F87171' },
              { v: 'success', label: 'Good news', color: '#34D399' },
            ].map(({ v, label, color }) => (
              <button key={v} onClick={() => setType(v)}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: type === v ? `${color}22` : 'var(--surface-3)',
                  border: `1px solid ${type === v ? color : 'var(--border)'}`,
                  color: type === v ? color : 'var(--text-3)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="label">Message to all students & drivers</label>
          <textarea className="input resize-none" rows={3}
            placeholder="Write your announcement..."
            value={message} onChange={e => setMessage(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => message.trim() && onSend(message, type)}
            disabled={!message.trim()} className="btn-primary flex-1 gap-2">
            <Send size={15} /> Broadcast
          </button>
        </div>
      </div>
    </div>
  );
};

// ── SIMPLE BAR CHART ─────────────────────────────────────────────────────────
const BarChart = ({ data, color = '#1A56DB' }) => {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-32 text-sm"
      style={{ color: 'var(--text-4)' }}>No data yet</div>
  );
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div className="w-full rounded-t-sm transition-all duration-500"
            style={{ height: `${(d.count / max) * 100}%`, background: color, opacity: 0.85, minHeight: 4 }} />
          <span style={{ color: 'var(--text-4)', fontSize: '9px' }}>
            {d.date?.slice(5) || d.name?.slice(0, 5)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── MAIN ADMIN PAGE ──────────────────────────────────────────────────────────
const AdminPage = () => {
  const { user, logout } = useAuthStore();
  const { liveShuttles, routes, stops, fetchRoutes, fetchStops, getLiveShuttlesArray } = useShuttleStore();
  const { emitAdminBroadcast } = useSocket();
  const navigate = useNavigate();

  const mapRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [shuttleList, setShuttleList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showOrgQR, setShowOrgQR] = useState(false);

  // Modals
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [shuttleModal, setShuttleModal] = useState(null);   // null | 'new' | shuttleObj
  const [maintenanceModal, setMaintenanceModal] = useState(null); // null | shuttleObj

  const { panToLocation, fitAllShuttles } = useGoogleMap({
    mapRef,
    center: { lat: 24.9056, lng: 67.0822 },
    zoom: 14,
    liveShuttles,
    stops,
    routes,
    onShuttleClick: () => {},
    onStopClick: () => {},
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashRes, driversRes, analyticsRes, shuttlesRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/drivers'),
        api.get('/admin/analytics?days=7'),
        api.get('/admin/shuttles'),
      ]);
      setDashboard(dashRes.data.data);
      setDrivers(driversRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
      setShuttleList(shuttlesRes.data.data || []);
      setLastRefresh(new Date());
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
    fetchStops();
    load();
  }, []);

  const handleBroadcast = async (message, type) => {
    try {
      await api.post('/admin/broadcast', { message, type });
      emitAdminBroadcast(user.organizationId, message, type);
      setShowBroadcast(false);
      toast.success('Broadcast sent to all users');
    } catch { toast.error('Broadcast failed'); }
  };

  const handleToggleDriver = async (driverId, isActive) => {
    try {
      await api.patch(`/admin/drivers/${driverId}`, { isActive });
      setDrivers(prev => prev.map(d => d._id === driverId ? { ...d, isActive } : d));
      toast.success(`Driver ${isActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update driver'); }
  };

  const handleShuttleSaved = (saved) => {
    setShuttleList(prev => {
      const exists = prev.find(s => s._id === saved._id);
      return exists ? prev.map(s => s._id === saved._id ? saved : s) : [...prev, saved];
    });
    setShuttleModal(null);
  };

  const handleShuttleStatusChange = async (shuttleId, status) => {
    try {
      await api.patch(`/admin/shuttles/${shuttleId}`, { status });
      setShuttleList(prev => prev.map(s => s._id === shuttleId ? { ...s, status } : s));
    } catch { toast.error('Failed to update status'); }
  };

  const liveArr = getLiveShuttlesArray();

  const TABS = [
    { key: 'overview', icon: Activity, label: 'Overview' },
    { key: 'fleet',    icon: Bus,      label: 'Fleet' },
    { key: 'routes',   icon: Route,    label: 'Routes' },
    { key: 'drivers',  icon: Users,    label: 'Drivers' },
    { key: 'analytics',icon: BarChart2,label: 'Analytics' },
    { key: 'map',      icon: Map,      label: 'Live Map' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--navy)' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--brand)' }}>
            <Layers size={18} color="white" />
          </div>
          <div>
            <p className="font-display font-bold text-base leading-none" style={{ color: 'var(--text-1)' }}>
              Admin Dashboard
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs hidden sm:block" style={{ color: 'var(--text-4)' }}>
              {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={load} className="btn-ghost btn-icon" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowBroadcast(true)}
            className="btn-secondary text-sm flex items-center gap-2 py-2 px-3">
            <Radio size={14} /> Broadcast
          </button>
          <button onClick={() => setShowOrgQR(true)}
            className="btn-secondary btn-sm gap-1.5">
            <QrCode size={14} /> Organization QR
          </button>
          <button onClick={logout} className="btn-ghost btn-icon"><LogOut size={15} /></button>
        </div>
      </div>

      {/* Live count bar */}
      {liveArr.length > 0 && (
        <div className="flex-shrink-0 px-6 py-2 flex items-center gap-3 text-sm"
          style={{ background: 'rgba(26,86,219,0.08)', borderBottom: '1px solid rgba(26,86,219,0.2)' }}>
          <span className="status-dot-green" />
          <span style={{ color: 'var(--brand)' }}>
            <strong>{liveArr.length}</strong> shuttle{liveArr.length !== 1 ? 's' : ''} live right now
          </span>
          <button onClick={() => { setActiveTab('map'); setTimeout(fitAllShuttles, 100); }}
            className="ml-auto text-xs btn-ghost py-1 px-2">
            View on map →
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR NAV ────────────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col flex-shrink-0 py-4"
          style={{ width: 200, background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}>
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex items-center gap-3 mx-3 mb-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === key ? 'rgba(26,86,219,0.15)' : 'transparent',
                color: activeTab === key ? 'var(--brand)' : 'var(--text-3)',
                border: activeTab === key ? '1px solid rgba(26,86,219,0.3)' : '1px solid transparent',
              }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── MOBILE BOTTOM TAB BAR ───────────────────────────────────────── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex"
          style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs"
              style={{ color: activeTab === key ? 'var(--brand)' : 'var(--text-4)' }}>
              <Icon size={17} /> {label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="dot-loader"><span /><span /><span /></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={Bus} label="Live Shuttles"
                      value={liveArr.length} color="#1A56DB" sub="Right now" />
                    <StatTile icon={Users} label="Students"
                      value={dashboard?.totalStudents} color="#10B981" sub="Registered" />
                    <StatTile icon={Activity} label="Trips Today"
                      value={dashboard?.tripsToday} color="#D97706" sub="Completed" />
                    <StatTile icon={Route} label="Active Routes"
                      value={dashboard?.totalRoutes ?? routes.length} color="#8B5CF6" sub="Running" />
                  </div>
                  {liveArr.length > 0 && (
                    <div>
                      <h3 className="font-display font-semibold text-base mb-3"
                        style={{ color: 'var(--text-1)' }}>Live Fleet</h3>
                      <div className="space-y-2">
                        {liveArr.map(s => (
                          <LiveShuttleRow key={s.shuttleId} shuttle={s} routes={routes}
                            onLocate={s => { setActiveTab('map'); panToLocation(s.lat, s.lng, 17); }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {analytics && (
                    <div>
                      <h3 className="font-display font-semibold text-base mb-3"
                        style={{ color: 'var(--text-1)' }}>Ridership (7 days)</h3>
                      <div className="rounded-2xl p-5"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <BarChart data={analytics.ridership} color="#1A56DB" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* FLEET */}
          {activeTab === 'fleet' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>
                  Fleet Management
                </h2>
                <button onClick={() => setShuttleModal('new')}
                  className="btn-primary btn-sm gap-1.5">
                  <Plus size={14} /> Add Shuttle
                </button>
              </div>

              {shuttleList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Bus size={32} style={{ color: 'var(--text-4)' }} />
                  <p style={{ color: 'var(--text-3)' }}>No shuttles yet. Add one above.</p>
                </div>
              ) : (
                shuttleList.map(shuttle => {
                  const liveData = liveShuttles[shuttle._id];
                  return (
                    <div key={shuttle._id} className="rounded-2xl p-4"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: liveData ? 'rgba(16,185,129,0.12)' : 'var(--surface-3)', border: `1px solid ${liveData ? 'rgba(16,185,129,0.3)' : 'var(--border)'}` }}>
                            <Bus size={18} style={{ color: liveData ? '#10B981' : 'var(--text-4)' }} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                              {shuttle.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                              {shuttle.plateNumber} · {shuttle.make} {shuttle.model} · Cap: {shuttle.capacity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {liveData ? <span className="badge-green text-xs">Live</span>
                            : shuttle.status === 'maintenance' ? <span className="badge-yellow text-xs">Maintenance</span>
                            : shuttle.status === 'retired' ? <span className="badge-red text-xs">Retired</span>
                            : <span className="badge-gray text-xs">Idle</span>}
                          <select value={shuttle.status}
                            onChange={e => handleShuttleStatusChange(shuttle._id, e.target.value)}
                            className="input py-1 px-2 text-xs" style={{ width: 'auto' }}>
                            <option value="idle">Idle</option>
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="retired">Retired</option>
                          </select>
                          <button onClick={() => setShuttleModal(shuttle)}
                            className="btn-ghost btn-icon" title="Edit">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setMaintenanceModal(shuttle)}
                            className="btn-ghost btn-icon" title="Log maintenance">
                            <Wrench size={14} style={{ color: '#D97706' }} />
                          </button>
                        </div>
                      </div>
                      {liveData && (
                        <CapacityBadge current={liveData.passengerCount || 0}
                          total={shuttle.capacity} size="sm" />
                      )}
                      {shuttle.currentDriverId?.name && (
                        <p className="text-xs mt-2" style={{ color: 'var(--text-4)' }}>
                          Driver: {shuttle.currentDriverId.name}
                        </p>
                      )}
                      {shuttle.maintenanceAlert && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs"
                          style={{ color: '#FBBF24' }}>
                          <AlertTriangle size={12} /> Maintenance due
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ROUTES */}
          {activeTab === 'routes' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>
                  Routes & Stops
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => navigate('/admin/stops')}
                    className="btn-secondary btn-sm gap-1.5">
                    <MapPin size={14} /> Manage Stops
                  </button>
                  <button onClick={() => navigate('/admin/routes/new')}
                    className="btn-primary btn-sm gap-1.5">
                    <Plus size={14} /> New Route
                  </button>
                </div>
              </div>

              {routes.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Route size={32} style={{ color: 'var(--text-4)' }} />
                  <p style={{ color: 'var(--text-3)' }}>No routes yet.</p>
                  <button onClick={() => navigate('/admin/routes/new')} className="btn-primary">
                    Create first route
                  </button>
                </div>
              ) : (
                routes.map(route => (
                  <div key={route._id} className="rounded-2xl p-4"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-10 rounded-full flex-shrink-0"
                          style={{ background: route.color || 'var(--brand)' }} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                              {route.name}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                              style={{ background: `${route.color || '#1A56DB'}22`, color: route.color || 'var(--brand)' }}>
                              {route.shortCode}
                            </span>
                            {route.isCircular && (
                              <span className="text-xs" style={{ color: 'var(--text-4)' }}>↩ circular</span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {route.stops?.length || 0} stops
                            {route.estimatedTotalMinutes ? ` · ~${route.estimatedTotalMinutes} min` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={route.isActive ? 'badge-green text-xs' : 'badge-gray text-xs'}>
                          {route.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button onClick={() => navigate(`/admin/routes/${route._id}/edit`)}
                          className="btn-ghost btn-icon" title="Edit route">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* DRIVERS */}
          {activeTab === 'drivers' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>
                  Driver Management
                </h2>
                <span className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {drivers.filter(d => d.isOnDuty).length} on duty
                </span>
              </div>
              {drivers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Users size={32} style={{ color: 'var(--text-4)' }} />
                  <p style={{ color: 'var(--text-3)' }}>No drivers registered yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {drivers.map(driver => (
                    <DriverRow key={driver._id} driver={driver}
                      onToggleActive={handleToggleDriver} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="p-6 space-y-6">
              <h2 className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>
                Analytics
              </h2>
              {!analytics ? (
                <div className="flex justify-center py-12">
                  <div className="dot-loader"><span /><span /><span /></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={TrendingUp} label="Total Trips"
                      value={analytics.totalTrips} color="#1A56DB" sub="Last 7 days" />
                    <StatTile icon={Activity} label="Avg Rating"
                      value={analytics.avgRating ? `${analytics.avgRating}★` : 'N/A'}
                      color="#D97706" sub={`${analytics.totalRatings} reviews`} />
                    <StatTile icon={Route} label="Routes Active"
                      value={routes.length} color="#10B981" />
                    <StatTile icon={Bus} label="Fleet Size"
                      value={shuttleList.length} color="#8B5CF6" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="rounded-2xl p-5"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                        Daily Ridership (7 days)
                      </h3>
                      <BarChart data={analytics.ridership} color="#1A56DB" />
                    </div>
                    <div className="rounded-2xl p-5"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                        Trips by Route
                      </h3>
                      <BarChart data={analytics.tripsByRoute} color="#D97706" />
                    </div>
                  </div>
                  <div className="rounded-2xl p-5"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                      Route Overview
                    </h3>
                    {routes.map(route => (
                      <div key={route._id} className="flex items-center gap-3 py-2.5"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: route.color || 'var(--brand)' }} />
                        <span className="flex-1 text-sm" style={{ color: 'var(--text-1)' }}>
                          {route.name}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {route.stops?.length || 0} stops
                        </span>
                        <span className={route.isActive ? 'badge-green text-xs' : 'badge-gray text-xs'}>
                          {route.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* LIVE MAP */}
          {activeTab === 'map' && (
            <div className="relative" style={{ height: 'calc(100vh - 120px)' }}>
              <div ref={mapRef} className="w-full h-full" />
              <div className="absolute top-4 left-4 z-10">
                <div className="glass rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Live Fleet</p>
                  {liveArr.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-4)' }}>No active shuttles</p>
                  ) : (
                    liveArr.map(s => (
                      <div key={s.shuttleId} className="flex items-center gap-2 text-xs"
                        style={{ color: 'var(--text-3)' }}>
                        <span className="status-dot-green" />
                        <span>{routes.find(r => r._id === s.routeId)?.shortCode || 'BUS'}</span>
                        <span style={{ color: 'var(--text-4)' }}>·</span>
                        <span>{s.passengerCount || 0} pax</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="absolute top-4 right-4 z-10">
                <button onClick={fitAllShuttles} className="glass btn btn-sm gap-2">
                  <Navigation size={13} /> Fit all
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {showBroadcast && (
        <BroadcastModal onSend={handleBroadcast} onClose={() => setShowBroadcast(false)} />
      )}

      {showOrgQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
            <h3 className="font-display font-bold text-lg mb-4" style={{ color: 'var(--text-1)' }}>
              Join Organization QR
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
              Students and drivers can scan this to pre‑fill registration.
            </p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={`${window.location.origin}/register?org=${user?.organizationId}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#0D2137"
                level="H"
              />
            </div>
            <button onClick={() => setShowOrgQR(false)} className="btn-secondary w-full">
              Close
            </button>
          </div>
        </div>
      )}

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
        <MaintenanceModal
          shuttle={maintenanceModal}
          onClose={() => setMaintenanceModal(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
};

export default AdminPage;