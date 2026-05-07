import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { useApi } from '../services/swr';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useSocket, { getSocket } from '../hooks/useSocket';
import useLeafletMap from '../hooks/useLeafletMap';
import { CapacityBadge, Avatar, BusLogo, PageHeader } from '../components/ui/index';
import { usePushNotifications } from '../hooks/usePushNotifications';
import ThemeToggle from '../components/ui/ThemeToggle';
import RatingModal from '../components/RatingModal';
import BookingModal from '../components/BookingModal';
import { formatDistance, haversineDistance, estimateETA } from '../services/maps';
import toast from 'react-hot-toast';
import MapSearchBar from '../components/MapSearchBar';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api';
import { 
  Home as HomeIcon, Map as MapIcon, Calendar, Clock, 
  User as UserIcon, BookMarked, Settings, MessageCircle,
  Bell, QrCode, Search, Navigation, Info, Bus, Radio,
  Layers, Star, RefreshCw, X, ChevronRight, TrendingUp,
  AlertCircle, Phone, Menu, Filter, Compass, Send,
  Activity, CheckCircle, ChevronLeft, MapPin, List, Eye
} from 'lucide-react';


// ─── SHUTTLE LIST CARD ───────────────────────────────────
const ShuttleCard = ({ shuttle, route, distance, eta, onClick, isSelected }: any) => {
  const occupancy = (shuttle.passengerCount || 0) / (shuttle.capacity || 30);
  const comfort = occupancy > 0.8 ? { icon: '🚫', label: 'Near Capacity', color: 'text-red-500' } :
                  occupancy > 0.5 ? { icon: '🧍', label: 'Standing Room Only', color: 'text-yellow-500' } :
                  { icon: '🛋️', label: 'Plenty of Seats', color: 'text-green-500' };

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick(shuttle)}
      className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group"
      style={{
        background: isSelected ? 'rgba(37,99,235,0.12)' : 'var(--glass-2)',
        border: `1px solid ${isSelected ? 'var(--brand)' : 'var(--border-1)'}`,
        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
        style={{
          background: `${route?.color || '#1A56DB'}20`,
          border: `1px solid ${route?.color || '#1A56DB'}40`
        }}>
        <Bus size={20} style={{ color: route?.color || '#1A56DB' }} />
        <span className="text-[10px] font-bold" style={{ color: route?.color || '#1A56DB' }}>
          {route?.shortCode || 'S'}
        </span>
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
            {route?.name || 'In Transit'}
          </span>
          <span className="text-[11px] font-medium" style={{ color: 'var(--brand-light)' }}>
            {eta} mins
          </span>
        </div>
        <div className="flex items-center gap-2">
           <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight ${comfort.color}`}>
              <span>{comfort.icon}</span>
              <span className="opacity-80">{comfort.label}</span>
           </div>
           <span className="w-0.5 h-0.5 rounded-full bg-text-4" />
           <span className="text-[10px] font-bold opacity-40 uppercase">{distance}</span>
        </div>
      </div>

      <div className="w-18 flex-shrink-0">
        <CapacityBadge current={shuttle.passengerCount || 0} total={shuttle.capacity || 30} size="sm" showBar={false} />
      </div>
    </motion.button>
  );
};

const INITIAL_CENTER = { lat: 24.9440, lng: 67.1145 };
const INITIAL_ZOOM = 14;

const StudentPage = () => {
  const { user, logout } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSubscribed, permissionStatus, subscribeUser } = usePushNotifications();
  
  const activeTab = searchParams.get('tab') || 'home';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const { 
    liveShuttles, routes, stops, bookings, schedules,
    fetchRoutes, fetchStops, fetchBookings, fetchSchedules,
    getLiveShuttlesArray, selectedShuttle: selectedShuttleFromStore, selectShuttle 
  } = useShuttleStore();

  const { data: drivers = [] } = useApi('/student/drivers');
  const { data: lostFoundItems = [] } = useApi('/lost-found');
  const { data: stats = { carbonSaved: 0, totalRides: 0, weeklyRides: 0 } } = useApi('/student/stats');

  const selectedShuttle = useMemo(() => {
    if (!selectedShuttleFromStore) return null;
    const id = selectedShuttleFromStore.shuttleId || selectedShuttleFromStore._id;
    return liveShuttles[id] || selectedShuttleFromStore;
  }, [selectedShuttleFromStore, liveShuttles]);

  const { joinOrganization } = useSocket();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);

  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  const [query, setQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [ratingTrip, setRatingTrip] = useState<any>(null);
  const [bookingRoute, setBookingRoute] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedStopForArrivals, setSelectedStopForArrivals] = useState<any>(null);
  const [showLostReport, setShowLostReport] = useState(false);
  const [lfType, setLfType] = useState<'all' | 'found' | 'my'>('all');
  const [lfLoading, setLfLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const handleShuttleClick = useCallback((s: any) => {
    selectShuttle(s);
    setIsTracking(true);
  }, [selectShuttle]);
  const handleStopClick = useCallback((s: any) => {
    setSelectedStopForArrivals(s);
    setActiveTab('arrivals');
  }, []);

  const visibleRouteIds = useMemo(() => 
    selectedShuttle?.routeId ? [selectedShuttle.routeId] : [], 
    [selectedShuttle?.routeId]
  );

  const { panToShuttle, fitAllShuttles, setTileLayer, panToLocation, searchPlace, centerOnUser } = useLeafletMap({
    mapRef,
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    liveShuttles,
    stops,
    routes,
    visibleRouteIds,
    userLocation: userLoc,
    onShuttleClick: handleShuttleClick,
    onStopClick: handleStopClick,
    followMode: isTracking ? (selectedShuttle?.shuttleId || selectedShuttle?._id) : false
  });

  const loadData = useCallback(() => {
    fetchRoutes();
    fetchStops();
    fetchBookings();
    fetchSchedules();
    joinOrganization();
  }, [fetchRoutes, fetchStops, fetchBookings, fetchSchedules, joinOrganization]);

  const handleReportItem = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLfLoading(true);
      const formData = new FormData(e.currentTarget);
      const payload = {
          item: formData.get('item'),
          description: formData.get('description'),
          shuttleId: formData.get('shuttleId'),
          type: formData.get('type'),
          location: formData.get('location'),
      };

      try {
          await api.post('/lost-found', payload);
          toast.success('Report submitted');
          setShowLostReport(false);
          mutate('/lost-found');
      } catch (err) {
          toast.error('Failed to submit report');
      } finally {
          setLfLoading(false);
      }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    
    const handleLostFoundRefresh = () => {
        mutate('/lost-found');
    };

    socket.on('lost-found:new', handleLostFoundRefresh);
    socket.on('lost-found:update', handleLostFoundRefresh);

    let watchId: number;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(p => setUserLoc([p.coords.latitude, p.coords.longitude]));
    }
    const interval = setInterval(loadData, 30000);
    return () => {
        clearInterval(interval);
        if (watchId) navigator.geolocation.clearWatch(watchId);
        socket.off('lost-found:new', handleLostFoundRefresh);
        socket.off('lost-found:update', handleLostFoundRefresh);
    };
  }, [loadData]);

  const liveArr = useMemo(() => getLiveShuttlesArray(), [liveShuttles]);

  const sortedShuttles = useMemo(() => {
    return liveArr
      .filter(s => s && s.lat && s.lng) // Defensive check against malformed data
      .map(s => {
        const route = routes.find(r => r._id === s.routeId);
        const distVal = userLoc ? haversineDistance(userLoc[0], userLoc[1], s.lat, s.lng) : 0;
        return {
          ...s,
          route,
          distanceVal: distVal,
          distanceStr: formatDistance(distVal),
          eta: estimateETA(userLoc?.[0]||24.9, userLoc?.[1]||67.0, s.lat, s.lng, s.speed || 25)
        };
      })
      .filter(s => !selectedRoute || s.routeId === selectedRoute)
      .filter(s => !query || s.route?.name?.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.distanceVal - b.distanceVal);
  }, [liveArr, routes, userLoc, selectedRoute, query]);

  const handleShuttleSelect = (s: any) => {
    selectShuttle(s);
    panToShuttle(s);
    if (window.innerWidth < 768) setActiveTab('map');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* ── HEADER ── */}
      <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between z-20"
        style={{ background: 'var(--glass-3)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (selectedShuttle) {
                  selectShuttle(null);
                } else if (activeTab !== 'home') {
                  setActiveTab('home');
                } else {
                  navigate(-1);
                }
              }} 
              className="p-2 hover:bg-glass-2 rounded-xl transition-colors text-text-1"
            >
                <ChevronLeft size={20} />
            </button>
            <div>
                <p className="font-display font-black text-lg leading-none tracking-tight" style={{ color: 'var(--text-1)' }}>
                  {activeTab === 'home' ? 'Student Portal' : activeTab === 'map' ? 'Live Track' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-black opacity-40">
                  {user?.organizationId?.shortName || user?.organizationName || 'ShutliX Transit'}
                </p>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => navigate('/chat')} className="btn-ghost btn-icon">
             <MessageCircle size={18} />
          </button>
          <button onClick={() => navigate('/profile')} className="btn-ghost p-0.5 rounded-full">
            <Avatar user={user} size={30} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* ── SIDEBAR / TABS ── */}
        <div className={`
          flex-shrink-0 w-full md:w-[380px] h-full flex flex-col z-10 transition-transform duration-300
          ${activeTab !== 'map' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          absolute md:relative
        `} style={{ background: 'var(--bg-base)', borderRight: '1px solid var(--border-1)' }}>

          <div className="px-4 py-3 border-b border-border-1 overflow-x-auto no-scrollbar flex gap-1.5 bg-glass-1">
              {[
                  { id: 'home', icon: HomeIcon, label: 'Home' },
                  { id: 'map', icon: MapIcon, label: 'Explore' },
                  { id: 'shuttles', icon: Bus, label: 'Live' },
                  { id: 'arrivals', icon: Clock, label: 'Arrivals' },
                  { id: 'bookings', icon: BookMarked, label: 'My Rides' },
                  { id: 'routes', icon: List, label: 'Routes' },
                  { id: 'lost+found', icon: Search, label: 'Lost & Found' }
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all whitespace-nowrap
                      ${activeTab === tab.id 
                        ? 'bg-brand text-white shadow-lg shadow-brand/20 scale-105' 
                        : 'hover:bg-glass-2 opacity-60 hover:opacity-100'}
                    `}
                  >
                    <tab.icon size={14} />
                    <span>{tab.label}</span>
                  </button>
              ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
             {/* Notification Permission Banner */}
             {!isSubscribed && permissionStatus !== 'denied' && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-3xl bg-brand/10 border border-brand/20 flex items-center gap-4 relative overflow-hidden group cursor-pointer"
                    onClick={subscribeUser}
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
                    <div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Bell size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] font-black uppercase tracking-tight text-brand">Enable Alerts</p>
                        <p className="text-[10px] font-bold opacity-60">Get notified when your shuttle arrives.</p>
                    </div>
                    <ChevronRight size={16} className="text-brand opacity-40 group-hover:translate-x-1 transition-transform" />
                </motion.div>
             )}

             <AnimatePresence mode="wait">
                {activeTab === 'home' && (
                  <motion.div 
                    key="home" 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    className="space-y-6"
                  >
                    {/* Welcome Section */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Good Day, {user?.name?.split(' ')[0]}</p>
                      <h2 className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-1)' }}>Where are we heading?</h2>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setActiveTab('shuttles')} className="p-4 rounded-3xl bg-glass-2 border border-border-1 hover:bg-brand hover:text-white transition-all group text-left">
                          <Bus size={20} className="text-brand group-hover:text-white mb-3" />
                          <p className="text-sm font-black italic">Find Shuttle</p>
                          <p className="text-[9px] font-bold opacity-40 group-hover:opacity-60 uppercase mt-1">Live tracking</p>
                       </button>
                       <button onClick={() => setShowQRModal(true)} className="p-4 rounded-3xl bg-glass-2 border border-border-1 hover:bg-brand hover:text-white transition-all group text-left">
                          <QrCode size={20} className="text-brand group-hover:text-white mb-3" />
                          <p className="text-sm font-black italic">Quick Board</p>
                          <p className="text-[9px] font-bold opacity-40 group-hover:opacity-60 uppercase mt-1">Scan to ride</p>
                       </button>
                    </div>

                    {/* Nearby Highlights */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Nearby & Live</h3>
                            <button onClick={() => setActiveTab('shuttles')} className="text-[10px] font-bold text-brand uppercase tracking-tight hover:underline">View All</button>
                        </div>
                        <div className="space-y-2">
                            {sortedShuttles.slice(0, 3).map(s => (
                                <ShuttleCard key={s.shuttleId} shuttle={s} route={s.route} distance={s.distanceStr} eta={s.eta} onClick={handleShuttleSelect} />
                            ))}
                            {sortedShuttles.length === 0 && (
                              <div className="py-8 text-center glass-heavy rounded-3xl border border-dashed border-border-1">
                                <Activity size={24} className="mx-auto mb-2 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No shuttles active nearby</p>
                              </div>
                            )}
                        </div>
                    </div>

                    {/* Announcements / Status */}
                    <div className="p-4 rounded-3xl bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-yellow-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                                <AlertCircle size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-tight text-yellow-600 dark:text-yellow-400">Campus Update</p>
                                <p className="text-[11px] font-bold opacity-80 mt-1">Route B-02 is experiencing minor delays due to main gate construction.</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-4 rounded-3xl bg-green-500/5 border border-green-500/10">
                          <TrendingUp size={16} className="text-green-500 mb-2" />
                          <p className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-1">Carbon Saved</p>
                          <p className="text-xl font-black italic text-green-600">{stats.carbonSaved}<span className="text-[10px] opacity-40 ml-1">kg</span></p>
                       </div>
                       <div className="p-4 rounded-3xl bg-brand/5 border border-brand/10">
                          <Calendar size={16} className="text-brand mb-2" />
                          <p className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-1">Weekly Rides</p>
                          <p className="text-xl font-black italic text-brand">{stats.weeklyRides}</p>
                       </div>
                    </div>
                  </motion.div>
                )}
                {activeTab === 'shuttles' && (
                    <motion.div key="shuttles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="relative">
                            <input className="input pl-10" placeholder="Search routes..." value={query} onChange={e => setQuery(e.target.value)} />
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                        </div>
                        <div className="space-y-3">
                            {sortedShuttles.map(s => (
                                <ShuttleCard key={s.shuttleId} shuttle={s} route={s.route} distance={s.distanceStr} eta={s.eta} isSelected={selectedShuttle?.shuttleId === s.shuttleId} onClick={handleShuttleSelect} />
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'routes' && (
                    <motion.div key="routes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        {routes.map(r => (
                            <div key={r._id} className="glass-md p-4 rounded-2xl border border-border-1">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand text-white">{r.shortCode}</span>
                                        <h4 className="font-bold text-sm">{r.name}</h4>
                                    </div>
                                    <button onClick={() => setBookingRoute(r)} className="btn-primary text-[10px] px-3 py-1">Book Seat</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {r.stops?.slice(0, 3).map((s:any, idx:number) => (
                                        <span key={idx} className="text-[10px] bg-glass-1 px-2 py-1 rounded-lg opacity-60">
                                            {s.name || 'Stop'}
                                        </span>
                                    ))}
                                    {r.stops?.length > 3 && <span className="text-[10px] opacity-40">+{r.stops.length - 3} more</span>}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {activeTab === 'arrivals' && (
                    <motion.div key="arrivals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="p-5 rounded-[2rem] bg-brand text-white shadow-xl shadow-brand/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                            <div className="flex items-center gap-4 relative z-10">
                                {selectedStopForArrivals && (
                                    <button 
                                      onClick={() => setSelectedStopForArrivals(null)}
                                      className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                                    >
                                        <ChevronLeft size={20}/>
                                    </button>
                                )}
                                <div className="p-2.5 rounded-2xl bg-white/20"><Navigation size={22}/></div>
                                <div>
                                    <h3 className="font-black text-lg italic tracking-tight leading-none mb-1">
                                        {selectedStopForArrivals?.name || 'Live Arrivals'}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Boarding Board</p>
                                </div>
                            </div>
                        </div>

                        {!selectedStopForArrivals ? (
                            <div className="py-12 text-center space-y-4">
                                <div className="w-16 h-16 bg-glass-1 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MapPin size={32} className="text-brand opacity-20" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Identify Your Location</p>
                                <p className="text-sm font-bold opacity-60 max-w-[200px] mx-auto">Select any stop on the map to see real-time arrival estimates</p>
                                <button onClick={() => setActiveTab('map')} className="btn-primary text-[10px] px-6 py-2 rounded-xl font-black uppercase tracking-widest">Open Map</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {liveArr
                                  .map(s => {
                                      const route = routes.find(r => r._id === s.routeId);
                                      const distanceVal = haversineDistance(selectedStopForArrivals.lat, selectedStopForArrivals.lng, s.lat, s.lng);
                                      return { ...s, route, distanceVal, eta: estimateETA(selectedStopForArrivals.lat, selectedStopForArrivals.lng, s.lat, s.lng, s.speed || 25) };
                                  })
                                  .filter(s => s.distanceVal < 5) // Within 5km
                                  .sort((a,b) => a.distanceVal - b.distanceVal)
                                  .map(s => (
                                    <button 
                                      key={s.shuttleId} 
                                      onClick={() => handleShuttleSelect(s)}
                                      className="w-full p-4 glass-heavy rounded-3xl border border-border-1 flex items-center gap-4 hover:scale-[1.02] transition-all"
                                    >
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner" style={{ background: (s.route?.color || '#1A56DB') + '20', color: s.route?.color || '#1A56DB' }}>
                                            {s.route?.shortCode || 'S'}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-black italic tracking-tight">{s.route?.name || 'Inbound Shuttle'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                               <p className="text-[9px] opacity-40 font-black uppercase tracking-widest leading-none">{s.plateNumber}</p>
                                               <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" title="Live Update" />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-brand leading-none">{s.eta}</p>
                                            <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">MIN</p>
                                        </div>
                                    </button>
                                  ))
                                }
                                {liveArr.length === 0 && (
                                   <div className="py-20 text-center opacity-20">
                                       <Clock size={40} className="mx-auto mb-4" />
                                       <p className="text-[10px] font-black uppercase tracking-widest">No shuttles currently inbound</p>
                                   </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'analytics' && (
                    <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 glass-heavy rounded-3xl border border-border-1">
                                <TrendingUp size={20} className="text-brand mb-3" />
                                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Impact</p>
                                <p className="text-2xl font-black italic">14.2<span className="text-xs non-italic opacity-40 ml-1">kg CO₂</span></p>
                                <p className="text-[9px] font-bold opacity-40 mt-1">Saved vs Private Car</p>
                            </div>
                            <div className="p-5 glass-heavy rounded-3xl border border-border-1">
                                <Bus size={20} className="text-green-500 mb-3" />
                                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Rides</p>
                                <p className="text-2xl font-black italic">{bookings.length}</p>
                                <p className="text-[9px] font-bold opacity-40 mt-1">Total Trips Taken</p>
                            </div>
                        </div>

                        <div className="p-6 glass-heavy rounded-[2.5rem] border border-border-1">
                            <h4 className="text-xs font-black uppercase tracking-widest mb-4">Route Popularity</h4>
                            <div className="space-y-4">
                                {[
                                    { label: 'Morning Peak', value: 85, color: 'bg-red-500' },
                                    { label: 'Afternoon', value: 45, color: 'bg-brand' },
                                    { label: 'Evening', value: 65, color: 'bg-orange-500' }
                                ].map(h => (
                                    <div key={h.label}>
                                        <div className="flex justify-between text-[9px] font-bold uppercase mb-1">
                                            <span>{h.label}</span>
                                            <span className="opacity-40">{h.value}% Load</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-glass-1 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${h.value}%` }} className={`h-full ${h.color} rounded-full`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'lost+found' && (
                    <motion.div key="lostfound" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                         <div className="flex bg-glass-1 p-1 rounded-2xl border border-border-1 gap-1">
                             <button 
                                onClick={() => setLfType('all')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${lfType === 'all' ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'opacity-40'}`}
                             >
                                 All
                             </button>
                             <button 
                                onClick={() => setLfType('found')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${lfType === 'found' ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'opacity-40'}`}
                             >
                                 Found
                             </button>
                             <button 
                                onClick={() => setLfType('my')}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${lfType === 'my' ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'opacity-40'}`}
                             >
                                 My Reports
                             </button>
                         </div>

                         <button 
                            onClick={() => setShowLostReport(true)}
                            className="w-full py-3 rounded-2xl bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand hover:text-white transition-all"
                         >
                            + Report New Item
                         </button>

                         {(() => {
                             const filtered = lostFoundItems.filter((i: any) => {
                                 if (lfType === 'all') return true;
                                 if (lfType === 'found') return i.type === 'found';
                                 if (lfType === 'my') return i.reportedBy?._id === user?._id;
                                 return true;
                             });

                             if (filtered.length === 0) {
                                 return (
                                     <div className="py-20 text-center opacity-20">
                                         <Info size={40} className="mx-auto mb-4" />
                                         <p className="text-[10px] font-black uppercase tracking-widest">No Items Recorded</p>
                                     </div>
                                 );
                             }

                             return filtered.map((i: any) => (
                                 <div key={i._id} className="p-4 glass-heavy rounded-2xl border border-border-1 flex items-center gap-4">
                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i.type === 'found' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                         <Info size={20}/>
                                     </div>
                                     <div className="flex-1">
                                         <p className="text-xs font-black italic">
                                             {i.item}
                                             {i.reportedBy?._id === user?._id && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-brand/10 text-brand text-[8px] uppercase font-black not-italic">You</span>}
                                         </p>
                                         <p className="text-[9px] font-bold opacity-40 uppercase">
                                             {i.shuttleId ? `Shuttle: ${i.shuttleId} • ` : ''}
                                             {new Date(i.createdAt).toLocaleDateString()}
                                         </p>
                                         <p className="text-[10px] opacity-60 mt-1">{i.description}</p>
                                     </div>
                                     <div className="text-right">
                                         <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                                             i.status === 'claimed' ? 'bg-green-500 text-white' : 'bg-glass-1 opacity-50'
                                         }`}>
                                             {i.status}
                                         </span>
                                     </div>
                                 </div>
                             ));
                         })()}
                    </motion.div>
                )}

                {activeTab === 'bookings' && (
                    <motion.div key="bookings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                        {bookings.map((b: any) => (
                            <div key={b._id} className="glass-md p-4 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 px-3 py-1 bg-brand text-white text-[10px] font-bold rounded-bl-xl capitalize">{b.status}</div>
                                <div className="flex items-center gap-3 mb-3">
                                    <BookMarked size={18} className="text-brand" />
                                    <div>
                                        <p className="font-bold text-sm">{b.routeId?.name}</p>
                                        <p className="text-[10px] opacity-60">{new Date(b.scheduledTime).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-medium p-2 bg-glass-1 rounded-xl">
                                    <MapPin size={12} className="text-brand" />
                                    <span>{b.pickupStopId?.name}</span>
                                    <ChevronRight size={10} />
                                    <span>{b.dropoffStopId?.name}</span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}

                {activeTab === 'drivers' && (
                    <motion.div key="drivers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-3">
                         {drivers.map((d: any) => (
                            <div key={d._id} className="glass-md p-3 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar user={d} size={40} />
                                    <div>
                                        <p className="font-bold text-sm">{d.name}</p>
                                        <div className="flex items-center gap-1 opacity-60">
                                            <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                            <span className="text-[10px]">4.8 Driver</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="btn-icon bg-blue-500/10 text-blue-500" onClick={() => window.open(`tel:${d.phone}`)}><Phone size={14}/></button>
                            </div>
                         ))}
                    </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>

        {/* ── MAP ── */}
        <div className={`flex-1 h-full relative ${activeTab !== 'map' ? 'hidden md:block' : 'block'}`}>
          <div ref={mapRef} className="w-full h-full z-0" />
          
          {/* Map Controls */}
          <div className="absolute right-6 bottom-40 md:bottom-10 z-20 flex flex-col gap-3">
            <button 
              onClick={() => {
                setIsTracking(!isTracking);
                if (!isTracking) toast.success('Tracking enabled');
              }} 
              className={`w-14 h-14 rounded-2xl shadow-2xl border-4 flex items-center justify-center active:scale-95 transition-all
                ${isTracking ? 'bg-brand text-white border-brand/20' : 'bg-white dark:bg-zinc-800 text-brand border-white dark:border-zinc-700'}
              `}
              title="Track Shuttle"
            >
              <Radio size={24} className={isTracking ? 'animate-pulse' : ''} />
            </button>
            <button 
              onClick={() => {
                  setIsTracking(false);
                  centerOnUser();
              }} 
              className="w-14 h-14 bg-white dark:bg-zinc-800 text-brand rounded-2xl shadow-2xl border-4 border-white dark:border-zinc-700 flex items-center justify-center active:scale-95 transition-all"
              title="Center on me"
            >
              <Navigation size={24} className="fill-current -rotate-45" />
            </button>
          </div>

          {/* Map Overlays */}
          <div className="absolute top-4 left-4 right-4 z-10 space-y-3 pointer-events-none">
            <div className="max-w-md pointer-events-auto">
                <MapSearchBar onSearch={searchPlace} onSelectResult={(res) => panToLocation(res.lat, res.lng, 17)} />
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
                 <button 
                  onClick={() => setTileLayer('cartoVoyager')} 
                  className="glass-heavy px-4 py-2 rounded-2xl text-[10px] font-bold tracking-widest hover:bg-glass-3 transition-all flex items-center gap-2 border border-white/20"
                 >
                    <MapIcon size={14} className="text-brand" /> VOYAGER
                 </button>
                 <button 
                  onClick={() => setTileLayer('esriSatellite')} 
                  className="glass-heavy px-4 py-2 rounded-2xl text-[10px] font-bold tracking-widest hover:bg-glass-3 transition-all flex items-center gap-2 border border-white/20"
                 >
                    <Layers size={14} className="text-brand" /> SATELLITE
                 </button>
                 <button 
                  onClick={() => userLoc && panToLocation(userLoc[0], userLoc[1], 17)} 
                  className="glass-heavy ml-auto px-4 py-2 rounded-2xl text-[10px] font-bold tracking-widest text-brand hover:bg-glass-3 transition-all flex items-center gap-2 border border-brand/20"
                 >
                    <Compass size={14} /> LOCATE
                 </button>
            </div>
          </div>

          {/* Selected Shuttle Info Overlay */}
          <AnimatePresence>
            {selectedShuttle && (
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[420px] z-20"
              >
                <div className="glass-heavy p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden relative group">
                  {/* Decorative Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-50" />
                  
                  <div className="relative flex flex-col gap-5">
                    {/* Header: Route Info & Close */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-500">
             <Bus size={28} className="text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-black/20 rounded-full animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                             <h4 className="font-black text-lg italic tracking-tight leading-none" style={{ color: 'var(--text-1)' }}>
                               {routes.find(r => r._id === selectedShuttle.routeId)?.name || 'LIVE SHUTTLE'}
                             </h4>
                             <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-brand/10 text-brand uppercase tracking-widest">
                               {routes.find(r => r._id === selectedShuttle.routeId)?.shortCode || 'BUS'}
                             </span>
                          </div>
                          <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">Vehicle {selectedShuttle.plateNumber || 'ID-ALPHA'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => selectShuttle(null)} 
                        className="w-10 h-10 rounded-full bg-glass-1 hover:bg-glass-2 flex items-center justify-center transition-all active:scale-90"
                      >
                        <X size={18} className="opacity-40" />
                      </button>
                    </div>

                    {/* ETA Primary Display */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-3xl bg-brand/5 border border-brand/10 flex flex-col items-center justify-center text-center">
                            <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Estimated Arrival</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black italic text-brand">
                                  {selectedShuttle.eta ?? estimateETA(userLoc?.[0]||24, userLoc?.[1]||67, selectedShuttle.lat, selectedShuttle.lng, selectedShuttle.speed||25)}
                                </span>
                                <span className="text-xs font-black opacity-40">MINS</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-3xl bg-glass-1 border border-border-1 flex flex-col items-center justify-center text-center">
                            <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Live Telemetry</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black italic">{Math.round(selectedShuttle.speed || 0)}</span>
                                <span className="text-[10px] font-black opacity-40">KM/H</span>
                                <span className="mx-1 opacity-20">•</span>
                                <span className="text-xl font-black italic">
                                  {selectedShuttle.distanceRemaining 
                                    ? formatDistance(selectedShuttle.distanceRemaining) 
                                    : formatDistance(haversineDistance(userLoc?.[0]||selectedShuttle.lat, userLoc?.[1]||selectedShuttle.lng, selectedShuttle.lat, selectedShuttle.lng))
                                  }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                             <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Passenger Load</p>
                             <p className="text-[10px] font-black uppercase tracking-tight">
                               <span className={selectedShuttle.passengerCount > (selectedShuttle.capacity * 0.8) ? 'text-red-500' : 'text-brand'}>
                                 {selectedShuttle.passengerCount || 0}
                               </span> / {selectedShuttle.capacity || 30}
                             </p>
                        </div>
                        <div className="h-2 w-full bg-glass-1 rounded-full overflow-hidden border border-border-1">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, ((selectedShuttle.passengerCount || 0) / (selectedShuttle.capacity || 30)) * 100)}%` }}
                               className={`h-full rounded-full ${selectedShuttle.passengerCount > (selectedShuttle.capacity * 0.8) ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-brand'}`} 
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-2">
                      <button 
                        className="flex-3 btn-primary h-12 rounded-[1.25rem] gap-2 text-[10px] font-black uppercase tracking-[0.2em] relative overflow-hidden group/btn" 
                        onClick={() => {
                            const link = `${window.location.origin}/trip/live/${selectedShuttle.shuttleId}`;
                            navigator.clipboard.writeText(link);
                            toast.success('SafeWalk link active & copied');
                        }}
                      >
                        <Send size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" /> 
                        SafeWalk Share
                      </button>
                      <button 
                        className="flex-1 btn-secondary h-12 rounded-[1.25rem] flex items-center justify-center" 
                        onClick={() => {
                            const report = confirm('Report busy shuttle?');
                            if (report) toast.success('Status reported');
                        }}
                      >
                        <Activity size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating QR Boarding Pass */}
      <motion.button 
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         onClick={() => setShowQRModal(true)}
         className="fixed right-6 bottom-24 md:bottom-10 z-40 w-14 h-14 bg-brand text-white rounded-2xl shadow-[0_15px_30px_rgba(37,99,235,0.4)] border-4 border-white dark:border-zinc-800 flex items-center justify-center group"
      >
          <QrCode size={24} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-800" />
      </motion.button>

      {/* QR Modal */}
      <AnimatePresence>
          {showQRModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full max-w-sm glass-heavy rounded-[3rem] p-8 border border-white/10 shadow-2xl overflow-hidden relative"
                >
                    <button onClick={() => setShowQRModal(false)} className="absolute top-6 right-6 p-2 glass-md rounded-xl hover:bg-glass-2"><X size={20}/></button>
                    
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-brand/20 text-brand rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <BusLogo size={32} />
                        </div>
                        <h3 className="font-display font-black text-2xl uppercase tracking-tighter" style={{ color: 'var(--text-1)' }}>Boarding Pass</h3>
                        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">Institutional Transit Key</p>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] aspect-square flex items-center justify-center mb-8 shadow-inner border-8 border-bg-base">
                        <QrCode size={180} className="text-black" />
                    </div>

                    <div className="p-5 rounded-[2rem] bg-glass-1 border border-border-1 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-left">
                                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest leading-none mb-1">Student</p>
                                <p className="font-black italic text-sm">{user?.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest leading-none mb-1">Pass Status</p>
                                <div className="flex items-center gap-1 justify-end">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span className="text-[10px] font-black text-green-500 uppercase">Active</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest leading-none mb-1">Organization</p>
                            <p className="font-black uppercase text-xs text-brand">{user?.organizationId?.name || 'Academic Institution'}</p>
                        </div>
                    </div>

                    <p className="text-[10px] font-bold text-center opacity-40 uppercase tracking-widest">
                        Scan at shuttle entrance to board
                    </p>
                </motion.div>
            </div>
          )}
      </AnimatePresence>

      {/* ── MOBILE NAV ── */}
      <nav className="md:hidden flex-shrink-0 flex items-center justify-around py-3 pb-8 z-30"
        style={{ background: 'var(--glass-3)', borderTop: '1px solid var(--border-1)', backdropFilter: 'blur(30px)' }}>
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-brand scale-110' : 'text-text-4'}`}>
          <HomeIcon size={20} className={activeTab === 'home' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-tight">Home</span>
        </button>
        <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-brand scale-110' : 'text-text-4'}`}>
          <MapIcon size={20} className={activeTab === 'map' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-tight">Map</span>
        </button>
        <button 
          onClick={() => setShowQRModal(true)} 
          className="w-14 h-14 flex items-center justify-center rounded-2xl -mt-10 shadow-[0_10px_30px_rgba(37,99,235,0.4)] border-4 border-bg-base transition-transform active:scale-95"
          style={{ background: 'var(--brand)', color: 'white' }}
        >
          <QrCode size={24} />
        </button>
        <button onClick={() => setActiveTab('shuttles')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'shuttles' ? 'text-brand scale-110' : 'text-text-4'}`}>
          <Bus size={20} className={activeTab === 'shuttles' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-tight">Live</span>
        </button>
        <button onClick={() => setActiveTab('bookings')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'bookings' ? 'text-brand scale-110' : 'text-text-4'}`}>
          <BookMarked size={20} className={activeTab === 'bookings' ? 'fill-current' : ''} />
          <span className="text-[10px] font-black uppercase tracking-tight">Rides</span>
        </button>
      </nav>

      {ratingTrip && (
        <RatingModal trip={ratingTrip} onClose={() => setRatingTrip(null)} />
      )}

      {bookingRoute && (
          <BookingModal 
            route={bookingRoute} 
            onClose={() => setBookingRoute(null)} 
            onSuccess={() => fetchBookings()} 
          />
      )}

      {/* Lost and Found Report Modal */}
      <AnimatePresence>
          {showLostReport && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-glass-3 rounded-[2.5rem] w-full max-w-md p-6 border border-border-1 shadow-2xl"
                >
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                                <Info size={20} />
                            </div>
                            <h2 className="text-xl font-display font-black tracking-tight">Report Item</h2>
                        </div>
                        <button onClick={() => setShowLostReport(false)} className="btn-ghost btn-icon"><X size={20}/></button>
                    </div>

                    <form onSubmit={handleReportItem} className="space-y-6">
                        <div>
                            <label className="label">What did you lose/find?</label>
                            <input name="item" className="input" placeholder="e.g. Black iPhone 13, Leather Wallet" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Status Type</label>
                                <select name="type" className="input">
                                    <option value="lost">Lost Item</option>
                                    <option value="found">Found Item</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Shuttle ID</label>
                                <input name="shuttleId" className="input" placeholder="e.g. B-01 (Optional)" />
                            </div>
                        </div>
                        <div>
                            <label className="label">Specific Location</label>
                            <input name="location" className="input" placeholder="e.g. Back row, near window" />
                        </div>
                        <div>
                            <label className="label">Detailed Description</label>
                            <textarea name="description" className="input h-24 resize-none" placeholder="Provide any identifying features..."></textarea>
                        </div>
                        <button type="submit" disabled={lfLoading} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-2xl">
                            {lfLoading ? <span className="loader"><span/><span/><span/></span> : 'Submit Report'}
                        </button>
                    </form>
                </motion.div>
            </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default StudentPage;
