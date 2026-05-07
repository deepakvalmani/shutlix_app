import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bus, MapPin, Clock, Navigation, Bell, BellOff,
  Star, ChevronRight, Wifi, WifiOff, LogOut,
  List, Map, History, Locate, RefreshCw, X, Route, UserCircle, Search,
} from 'lucide-react';
import { formatETA, estimateETA, haversineDistance, formatDistance } from '../services/maps';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useGoogleMap from '../hooks/useGoogleMap';
import CapacityBadge from '../components/ui/CapacityBadge';
import RatingModal from '../components/RatingModal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ── SHUTTLE CARD ─────────────────────────────────────────────────────────────
const ShuttleCard = ({ shuttle, route, isSelected, onClick, userLocation }) => {
  const eta = userLocation
    ? estimateETA(shuttle.lat, shuttle.lng, userLocation.lat, userLocation.lng)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all duration-150"
      style={{
        background: isSelected ? 'rgba(26,86,219,0.15)' : 'var(--surface-3)',
        border: `1px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`,
        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Colored route dot */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: route?.color ? `${route.color}22` : 'var(--surface-4)', border: `1px solid ${route?.color || 'var(--border)'}33` }}>
            <Bus size={18} style={{ color: route?.color || 'var(--brand)' }} />
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
              {route?.name || `Shuttle ${shuttle.shuttleId?.slice(-4)}`}
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
              <span className="status-dot-green" />
              Live tracking
            </div>
          </div>
        </div>
        {eta && (
          <div className="text-right flex-shrink-0">
            <div className="font-bold text-lg leading-none" style={{ color: 'var(--brand)' }}>{eta}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>min away</div>
          </div>
        )}
      </div>

      <CapacityBadge
        current={shuttle.passengerCount || 0}
        total={shuttle.capacity || 30}
        size="sm"
      />

      <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
        <span className="flex items-center gap-1">
          <Navigation size={11} />
          {shuttle.speed ? `${Math.round(shuttle.speed)} km/h` : 'Stopped'}
        </span>
        {userLocation && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {formatDistance(haversineDistance(shuttle.lat, shuttle.lng, userLocation.lat, userLocation.lng))}
          </span>
        )}
      </div>
    </button>
  );
};

// ── STOP CARD ────────────────────────────────────────────────────────────────
const StopCard = ({ stop, liveShuttles, routes, onClick }) => {
  // Find shuttles near this stop
  const nearbyShuttles = Object.values(liveShuttles).map(s => ({
    ...s,
    eta: estimateETA(s.lat, s.lng, stop.lat, stop.lng),
    route: routes.find(r => r._id === s.routeId),
  })).sort((a, b) => a.eta - b.eta).slice(0, 3);

  return (
    <button onClick={onClick} className="w-full text-left rounded-xl p-3.5 transition-all"
      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <MapPin size={14} style={{ color: '#D97706' }} />
        </div>
        <span className="font-medium text-sm" style={{ color: 'var(--text-1)' }}>{stop.name}</span>
      </div>
      {nearbyShuttles.length > 0 ? (
        <div className="space-y-1">
          {nearbyShuttles.map(s => (
            <div key={s.shuttleId} className="flex items-center justify-between text-xs"
              style={{ color: 'var(--text-3)' }}>
              <span style={{ color: s.route?.color || 'var(--brand)' }}>
                {s.route?.shortCode || 'BUS'}
              </span>
              <span className="font-medium" style={{ color: 'var(--text-2)' }}>
                {formatETA(s.eta)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-4)' }}>No active shuttles</p>
      )}
    </button>
  );
};

// ── RIDE HISTORY ITEM ────────────────────────────────────────────────────────
const HistoryItem = ({ trip }) => {
  const date = new Date(trip.startTime);
  return (
    <div className="flex items-center gap-3 py-3"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
        <Bus size={16} style={{ color: trip.routeId?.color || 'var(--brand)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
          {trip.routeId?.name || 'Unknown Route'}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
          {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-3)' }}>
        {trip.peakPassengerCount > 0 && `${trip.peakPassengerCount} boarded`}
      </div>
    </div>
  );
};

// ── MAIN STUDENT PAGE ─────────────────────────────────────────────────────────
const StudentPage = () => {
  const { user, logout } = useAuthStore();
  const { liveShuttles, routes, stops, fetchRoutes, fetchStops,
    selectedShuttle, selectShuttle, getLiveShuttlesArray } = useShuttleStore();

  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shuttles');
  const [userLocation, setUserLocation] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [ratingTrip, setRatingTrip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { panToShuttle, panToLocation, fitAllShuttles } = useGoogleMap({
    mapRef,
    center: { lat: user?.organizationId ? 24.9056 : 24.9056, lng: 67.0822 },
    zoom: 15,
    liveShuttles,
    stops,
    routes,
    onShuttleClick: (s) => selectShuttle(s),
    onStopClick: (stop) => panToLocation(stop.lat, stop.lng, 17),
  });

  // Load routes + stops on mount
  useEffect(() => {
    fetchRoutes();
    fetchStops();
  }, []);

  // Get user's location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  // Load ride history when tab selected
  useEffect(() => {
    if (activeTab !== 'history' || rideHistory.length) return;
    setIsLoadingHistory(true);
    api.get('/student/history')
      .then(r => setRideHistory(r.data.data || []))
      .catch(() => toast.error('Could not load history'))
      .finally(() => setIsLoadingHistory(false));
  }, [activeTab]);

  const handleShuttleClick = useCallback((shuttle) => {
    selectShuttle(shuttle);
    panToShuttle(shuttle.shuttleId);
    setShowMap(true);
  }, [panToShuttle, selectShuttle]);

  // ── SEARCH HANDLER ──────────────────────────────────────────────────────
  const searchTimerRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const geocoderRef = useRef(null);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const q = query.toLowerCase();
    const localResults = [];

    // 1. Live shuttles
    getLiveShuttlesArray().forEach(shuttle => {
      const route = routes.find(r => r._id === shuttle.routeId);
      if (
        route?.name?.toLowerCase().includes(q) ||
        route?.shortCode?.toLowerCase().includes(q)
      ) {
        localResults.push({
          type: 'shuttle',
          id: shuttle.shuttleId,
          label: route?.name || 'Live Shuttle',
          sub: `Live · ${shuttle.passengerCount || 0} passengers · ${shuttle.speed ? Math.round(shuttle.speed) + ' km/h' : 'Stopped'}`,
          color: route?.color || '#1A56DB',
          action: () => { handleShuttleClick(shuttle); setShowSearchResults(false); setSearchQuery(''); },
        });
      }
    });

    // 2. Stops
    stops.forEach(stop => {
      if (stop.name?.toLowerCase().includes(q)) {
        localResults.push({
          type: 'stop',
          id: stop._id,
          label: stop.name,
          sub: 'Bus stop',
          color: '#D97706',
          action: () => { panToLocation(stop.lat, stop.lng, 17); setShowSearchResults(false); setSearchQuery(''); },
        });
      }
    });

    // 3. Routes
    routes.forEach(route => {
      if (route.name?.toLowerCase().includes(q) || route.shortCode?.toLowerCase().includes(q)) {
        localResults.push({
          type: 'route',
          id: route._id,
          label: route.name,
          sub: `Route ${route.shortCode} · ${route.stops?.length || 0} stops`,
          color: route.color || '#1A56DB',
          action: () => {
            const firstStop = route.stops?.[0]?.stopId;
            if (firstStop?.lat) panToLocation(firstStop.lat, firstStop.lng, 15);
            setShowSearchResults(false);
            setSearchQuery('');
          },
        });
      }
    });

    setSearchResults(localResults);
    setShowSearchResults(true);

    // 4. Google Maps Places autocomplete (debounced 400ms)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) return;

    searchTimerRef.current = setTimeout(() => {
      if (!window.google?.maps) return;

      // Use Places Autocomplete if available
      if (window.google.maps.places?.AutocompleteService) {
        if (!autocompleteServiceRef.current) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        }
        if (!geocoderRef.current) {
          geocoderRef.current = new window.google.maps.Geocoder();
        }

        autocompleteServiceRef.current.getPlacePredictions(
          { input: query },
          (predictions, status) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
              // Fallback: use Geocoder directly
              geocoderRef.current.geocode({ address: query }, (results, geoStatus) => {
                if (geoStatus === 'OK' && results?.length) {
                  const geoResults = results.slice(0, 3).map((r, i) => ({
                    type: 'place',
                    id: `geo-${i}`,
                    label: r.address_components[0]?.long_name || r.formatted_address,
                    sub: r.formatted_address,
                    color: '#10B981',
                    action: () => {
                      const loc = r.geometry.location;
                      panToLocation(loc.lat(), loc.lng(), 16);
                      setShowSearchResults(false);
                      setSearchQuery(r.formatted_address);
                    },
                  }));
                  setSearchResults(prev => [...prev.filter(r => r.type !== 'place'), ...geoResults]);
                }
              });
              return;
            }

            const placeResults = predictions.slice(0, 5).map(pred => ({
              type: 'place',
              id: pred.place_id,
              label: pred.structured_formatting?.main_text || pred.description,
              sub: pred.structured_formatting?.secondary_text || pred.description,
              color: '#10B981',
              action: () => {
                geocoderRef.current.geocode({ placeId: pred.place_id }, (geoResults, geoStatus) => {
                  if (geoStatus === 'OK' && geoResults[0]) {
                    const loc = geoResults[0].geometry.location;
                    panToLocation(loc.lat(), loc.lng(), 16);
                  }
                });
                setShowSearchResults(false);
                setSearchQuery(pred.description);
              },
            }));

            setSearchResults(prev => [...prev.filter(r => r.type !== 'place'), ...placeResults]);
          }
        );
      } else {
        // No Places API — use Geocoder directly (still works for any address)
        if (!geocoderRef.current) geocoderRef.current = new window.google.maps.Geocoder();
        geocoderRef.current.geocode({ address: query }, (results, geoStatus) => {
          if (geoStatus === 'OK' && results?.length) {
            const geoResults = results.slice(0, 3).map((r, i) => ({
              type: 'place',
              id: `geo-${i}`,
              label: r.address_components[0]?.long_name || r.formatted_address,
              sub: r.formatted_address,
              color: '#10B981',
              action: () => {
                const loc = r.geometry.location;
                panToLocation(loc.lat(), loc.lng(), 16);
                setShowSearchResults(false);
                setSearchQuery(r.formatted_address);
              },
            }));
            setSearchResults(prev => [...prev.filter(r => r.type !== 'place'), ...geoResults]);
          }
        });
      }
    }, 400);
  }, [routes, stops, getLiveShuttlesArray, handleShuttleClick, panToLocation]);

  const shuttlesArray = getLiveShuttlesArray();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--navy)' }}>

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <div
        className={`flex flex-col flex-shrink-0 h-full overflow-hidden
          ${showMap ? 'hidden lg:flex' : 'flex'} w-full lg:w-[340px]`}
        style={{ background: 'var(--surface-2)', borderRight: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--brand)' }}>
                <Bus size={16} color="white" />
              </div>
              <span className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>
                ShutlliX
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={fitAllShuttles}
                className="btn-ghost btn-icon" title="Fit all shuttles">
                <Locate size={16} />
              </button>
              <button onClick={() => navigate('/profile')}
                className="btn-ghost btn-icon" title="Profile">
                <UserCircle size={16} />
              </button>
              <button onClick={logout} className="btn-ghost btn-icon" title="Logout">
                <LogOut size={15} />
              </button>
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>
            Welcome, {user?.name?.split(' ')[0]} · Student
          </p>
        </div>

        {/* Live badge */}
        <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 text-sm">
            {shuttlesArray.length > 0 ? (
              <>
                <span className="status-dot-green" />
                <span style={{ color: 'var(--text-2)' }}>
                  <span className="font-semibold" style={{ color: '#10B981' }}>
                    {shuttlesArray.length}
                  </span> shuttle{shuttlesArray.length !== 1 ? 's' : ''} live
                </span>
              </>
            ) : (
              <>
                <span className="status-dot-gray" />
                <span style={{ color: 'var(--text-3)' }}>No active shuttles</span>
              </>
            )}
          </div>
          <button onClick={() => { fetchRoutes(); fetchStops(); }}
            className="btn-ghost btn-icon" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Announcement banner */}
        {announcement && (
          <div className="flex-shrink-0 mx-4 mt-3 px-3 py-2.5 rounded-xl text-sm flex items-start gap-2 animate-slide-down"
            style={{ background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.3)', color: '#FBBF24' }}>
            <Bell size={14} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1 text-xs leading-relaxed">{announcement}</span>
            <button onClick={() => setAnnouncement(null)}><X size={13} /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-1 p-3"
          style={{ borderBottom: '1px solid var(--border)' }}>
          {[
            { key: 'shuttles', icon: Bus, label: 'Shuttles' },
            { key: 'stops', icon: MapPin, label: 'Stops' },
            { key: 'history', icon: History, label: 'History' },
          ].map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeTab === key ? 'var(--brand)' : 'transparent',
                color: activeTab === key ? 'white' : 'var(--text-3)',
              }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* SHUTTLES TAB */}
          {activeTab === 'shuttles' && (
            <>
              {shuttlesArray.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--surface-3)' }}>
                    <Bus size={28} style={{ color: 'var(--text-4)' }} />
                  </div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-2)' }}>
                    No shuttles running
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Shuttles will appear here when drivers start their trips
                  </p>
                </div>
              ) : (
                shuttlesArray.map(shuttle => (
                  <ShuttleCard
                    key={shuttle.shuttleId}
                    shuttle={shuttle}
                    route={routes.find(r => r._id === shuttle.routeId)}
                    isSelected={selectedShuttle?.shuttleId === shuttle.shuttleId}
                    onClick={() => handleShuttleClick(shuttle)}
                    userLocation={userLocation}
                  />
                ))
              )}

              {/* Routes overview */}
              {routes.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--text-4)' }}>Active Routes</p>
                  <div className="space-y-2">
                    {routes.map(route => (
                      <div key={route._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: route.color || 'var(--brand)' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                            {route.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                            {route.stops?.length || 0} stops
                            {route.estimatedTotalMinutes && ` · ~${route.estimatedTotalMinutes} min`}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: `${route.color || '#1A56DB'}22`, color: route.color || 'var(--brand)' }}>
                          {route.shortCode}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STOPS TAB */}
          {activeTab === 'stops' && (
            <>
              {stops.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <MapPin size={28} style={{ color: 'var(--text-4)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No stops found</p>
                </div>
              ) : (
                stops.map(stop => (
                  <StopCard
                    key={stop._id}
                    stop={stop}
                    liveShuttles={liveShuttles}
                    routes={routes}
                    onClick={() => panToLocation(stop.lat, stop.lng, 17)}
                  />
                ))
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <>
              {isLoadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="dot-loader"><span /><span /><span /></div>
                </div>
              ) : rideHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <History size={28} style={{ color: 'var(--text-4)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No ride history yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                    Your completed journeys will appear here
                  </p>
                </div>
              ) : (
                rideHistory.map(trip => (
                  <div key={trip._id}>
                    <HistoryItem trip={trip} />
                    <button onClick={() => setRatingTrip(trip)}
                      className="w-full text-xs py-1.5 mb-2 rounded-lg"
                      style={{ color: 'var(--brand)', background: 'rgba(26,86,219,0.07)' }}>
                      ★ Rate this ride
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Mobile map toggle */}
        <div className="flex-shrink-0 p-4 lg:hidden"
          style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setShowMap(true)} className="btn-primary w-full">
            <Map size={16} /> View Map
          </button>
        </div>
      </div>

      {/* ── MAP AREA ─────────────────────────────────────────────────────── */}
      <div className={`flex-1 relative ${showMap ? 'flex' : 'hidden lg:flex'} flex-col`}>

        {/* Mobile back to list */}
        <div className="absolute top-4 left-4 z-10 lg:hidden">
          <button onClick={() => setShowMap(false)}
            className="glass btn flex items-center gap-2 text-sm py-2 px-3">
            <List size={15} /> List
          </button>
        </div>

        {/* ── SEARCH BAR ──────────────────────────────────────────────────── */}
        <div className="absolute top-4 z-20 lg:left-1/2 lg:-translate-x-1/2 left-20 right-4 lg:right-auto lg:w-96">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-3)' }} />
            <input
              type="text"
              value={searchQuery}
              placeholder="Search shuttles, stops, routes, places..."
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  if (!geocoderRef.current && window.google?.maps) {
                    geocoderRef.current = new window.google.maps.Geocoder();
                  }
                  if (geocoderRef.current) {
                    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
                      if (status === 'OK' && results[0]) {
                        const loc = results[0].geometry.location;
                        panToLocation(loc.lat(), loc.lng(), 16);
                        setShowSearchResults(false);
                        setSearchQuery(results[0].formatted_address || searchQuery);
                      }
                    });
                  }
                }
                if (e.key === 'Escape') {
                  setShowSearchResults(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }
              }}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                color: 'var(--text-1)',
                outline: 'none',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-1.5 rounded-xl overflow-hidden animate-slide-down"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-md)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                maxHeight: 320,
                overflowY: 'auto',
              }}>
              {/* Group by type */}
              {['shuttle', 'stop', 'route', 'place'].map(type => {
                const group = searchResults.filter(r => r.type === type);
                if (!group.length) return null;
                const groupLabels = { shuttle: 'Live Shuttles', stop: 'Stops', route: 'Routes', place: 'Google Maps' };
                const groupIcons = { shuttle: '🚌', stop: '📍', route: '🗺', place: '🔍' };
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-4)' }}>
                      {groupIcons[type]} {groupLabels[type]}
                    </div>
                    {group.map(result => (
                      <button
                        key={result.id}
                        onClick={result.action}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                        style={{ borderBottom: '1px solid var(--border)', background: 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background: `${result.color}22`, border: `1px solid ${result.color}44` }}>
                          {result.type === 'shuttle' && <Bus size={13} style={{ color: result.color }} />}
                          {result.type === 'stop' && <MapPin size={13} style={{ color: result.color }} />}
                          {result.type === 'route' && <Route size={13} style={{ color: result.color }} />}
                          {result.type === 'place' && <Search size={13} style={{ color: result.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>
                            {result.label}
                          </div>
                          <div className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
                            {result.sub}
                          </div>
                        </div>
                        <ChevronRight size={13} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* No results */}
          {showSearchResults && searchResults.length === 0 && searchQuery.length > 1 && (
            <div className="mt-1.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--text-3)' }}>
              No results for "{searchQuery}"
            </div>
          )}
        </div>

        {/* Selected shuttle overlay */}
        {selectedShuttle && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bus size={18} style={{ color: 'var(--brand)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                    {routes.find(r => r._id === selectedShuttle.routeId)?.name || 'Shuttle'}
                  </span>
                </div>
                <button onClick={() => selectShuttle(null)} className="btn-ghost btn-icon">
                  <X size={14} />
                </button>
              </div>
              <CapacityBadge
                current={selectedShuttle.passengerCount || 0}
                total={selectedShuttle.capacity || 30}
              />
              <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-3)' }}>
                <span className="flex items-center gap-1">
                  <Navigation size={12} />
                  {selectedShuttle.speed ? `${Math.round(selectedShuttle.speed)} km/h` : 'Stopped'}
                </span>
                {userLocation && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    ETA: {estimateETA(selectedShuttle.lat, selectedShuttle.lng, userLocation.lat, userLocation.lng)} min
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-emerald-400">
                  <span className="status-dot-green" /> Live
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No shuttles overlay */}
        {shuttlesArray.length === 0 && (
          <div className="absolute top-4 right-4 z-10">
            <div className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2"
              style={{ color: 'var(--text-3)' }}>
              <WifiOff size={13} />
              No active shuttles
            </div>
          </div>
        )}

        {/* Shuttle count badge */}
        {shuttlesArray.length > 0 && (
          <div className="absolute bottom-24 right-4 z-10">
            <div className="glass rounded-xl px-3 py-2 text-xs flex items-center gap-2"
              style={{ color: 'var(--text-2)' }}>
              <span className="status-dot-green" />
              {shuttlesArray.length} live
            </div>
          </div>
        )}

        {/* The actual map */}
        <div ref={mapRef} className="w-full h-full" onClick={() => setShowSearchResults(false)} />
      </div>

      {/* Rating Modal */}
      {ratingTrip && (
        <RatingModal
          trip={ratingTrip}
          onClose={() => setRatingTrip(null)}
          onSubmitted={() => setRatingTrip(null)}
        />
      )}
    </div>
  );
};

export default StudentPage;