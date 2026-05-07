import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Navigation, MapPin, Users, Radio, AlertTriangle, Play, Square,
  Clock, Map as MapIcon, Settings, LogOut, ChevronRight, MessageCircle, MoreVertical,
  Menu, Bell, QrCode, Share2, Layers, Compass, Zap, ChevronLeft, ChevronDown, RefreshCw,
  Search, ShieldCheck, Check, Info, FileText, Shield, Truck, AlertCircle,
  Mic, Moon, Battery, Droplets, BarChart3, ListChecks, X, LayoutDashboard,
  Power
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import useSocket from '../hooks/useSocket';
import useLeafletMap from '../hooks/useLeafletMap';
import { CapacityBadge, Avatar, BusLogo, PageHeader } from '../components/ui/index';
import QRGenerator from '../components/QRGenerator';
import ThemeToggle from '../components/ui/ThemeToggle';
import api from '../services/api';
import toast from 'react-hot-toast';
import MapSearchBar from '../components/MapSearchBar';

// New Driver Components
import {
  StatusHeader,
  ControlPanel,
  StopsBottomSheet,
  NavigationOverlay,
  EmergencyButton,
  MapView,
  SettingsSheet
} from '../components/driver';

const DRIVER_MAP_CENTER = { lat: 24.9440, lng: 67.1145 };
const DRIVER_MAP_ZOOM = 16;

const calculateHeading = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const DriverPage = () => {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();

  // Remove Onboarding Check as requested
  /*
  useEffect(() => {
    if (user && user.role === 'driver' && !user.isOnboarded) {
      navigate('/driver/onboarding', { replace: true });
    }
  }, [user, navigate]);
  */

  const { liveShuttles } = useShuttleStore();
  const { 
    emitLocation, 
    emitPassengerCount, 
    emitDelay, 
    emitEmergency, 
    emitStartTrip, 
    emitEndTrip, 
    joinOrganization, 
    emitGeofenceCheck,
    isConnected,
    isReconnecting
  } = useSocket();
  const mapRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);

  const [isActive, setIsActive] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [passengerCount, setPassengerCount] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState(user?.assignedRouteId?._id || user?.assignedRouteId || '');
  const [selectedShuttleId, setSelectedShuttleId] = useState(user?.assignedShuttleId?._id || user?.assignedShuttleId || '');
  const [shuttles, setShuttles] = useState<any[]>([]);
  const [localRoutes, setLocalRoutes] = useState<any[]>([]);
  const [localStops, setLocalStops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('drive'); // drive | cargo | profile
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [isStatsMinimized, setIsStatsMinimized] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [heading, setHeading] = useState(0);
  const [isPathLoading, setIsPathLoading] = useState(false);

  const selectedRoute = localRoutes.find(r => r._id === selectedRouteId);
  const selectedShuttle = shuttles.find((s:any) => s._id === selectedShuttleId);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  const [eta, setEta] = useState<number | null>(null);
  const [distanceRemaining, setDistanceRemaining] = useState<number | null>(null);
  const [userLocData, setUserLocData] = useState<any>(null);
  const [detailedPath, setDetailedPath] = useState<any[]>([]);
  const lastUpdateRef = useRef<{ lat: number, lng: number, time: number } | null>(null);
  const lastEmitTimeRef = useRef<number>(0);

  // --- NEW LOGISTICS STATES ---
  const [safetyScore, setSafetyScore] = useState(98);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [onboardedStudents, setOnboardedStudents] = useState<string[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [isNightMode, setIsNightMode] = useState(false);
  const [maintenanceReport, setMaintenanceReport] = useState('');
  const [incidentReport, setIncidentReport] = useState('');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(92);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [shiftData, setShiftData] = useState({ distance: 0, time: 0, rating: 4.9, passengers: 0, startTime: Date.now() });
  const [lastShiftData, setLastShiftData] = useState<any>(null);
  const [nextStopVoice, setNextStopVoice] = useState(true);
  const [showLostReport, setShowLostReport] = useState(false);
  const [lostReportData, setLostReportData] = useState({ item: '', description: '', category: 'other' });

  const handleLostFoundReport = async () => {
    if (!lostReportData.item) return toast.error('Item name is required');
    setIsLoading(true);
    try {
      await api.post('/lost-found', {
        ...lostReportData,
        shuttleId: selectedShuttleId,
        type: 'found',
        location: selectedShuttle?.name || 'In Shuttle'
      });
      toast.success('Found item reported successfully');
      setShowLostReport(false);
      setLostReportData({ item: '', description: '', category: 'other' });
    } catch { toast.error('Failed to report item'); }
    finally { setIsLoading(false); }
  };

  // --- SETTINGS & PROFILE STATES ---
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedPhone, setEditedPhone] = useState(user?.phone || '');
  const [leaveDates, setLeaveDates] = useState({ start: '', end: '', reason: '' });
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- HAPTIC FEEDBACK HELPER ---
  const triggerHaptic = useCallback((type: 'success' | 'warning' | 'error' = 'success') => {
    if ('vibrate' in navigator) {
      if (type === 'error') navigator.vibrate([100, 50, 100]);
      else if (type === 'warning') navigator.vibrate(200);
      else navigator.vibrate(50);
    }
  }, []);

  // Use Speech Synthesis for Announcements
  const announceNextStop = useCallback((stopName: string) => {
    if (!nextStopVoice) return;
    const utterance = new SpeechSynthesisUtterance(`Next stop is ${stopName}`);
    window.speechSynthesis.speak(utterance);
  }, [nextStopVoice]);

  const filteredStops = useMemo(() => {
    if (!selectedRouteId) return [];
    const route = localRoutes.find(r => r._id === selectedRouteId);
    if (!route) return [];
    
    // Return stops in the exact order they appear in the route
    const routeStops = (route.stops || [])
        .map((rs: any) => {
            const id = rs.stopId?._id || rs.stopId || rs._id || rs;
            return localStops.find(s => s._id === id);
        })
        .filter(Boolean);

    return routeStops.length > 0 ? routeStops : [];
  }, [localStops, localRoutes, selectedRouteId]);

  const filteredRoutes = useMemo(() => {
    if (!selectedRouteId) return [];
    return localRoutes.filter(r => r._id === selectedRouteId).map(r => ({
        ...r,
        path: detailedPath.length > 0 ? detailedPath : r.path,
        heading: isActive ? heading : 0
    }));
  }, [isActive, localRoutes, selectedRouteId, detailedPath, heading]);

  const visibleRouteIds = useMemo(() => 
    selectedRouteId ? [selectedRouteId as string] : [], 
    [selectedRouteId]
  );

  const { panToLocation, setTileLayer, fitAllShuttles, searchPlace, getRoadRoute, centerOnUser, mapInstance } = useLeafletMap({
      mapRef,
      center: DRIVER_MAP_CENTER,
      zoom: DRIVER_MAP_ZOOM,
      liveShuttles,
      stops: filteredStops,
      routes: filteredRoutes,
      visibleRouteIds,
      userLocation: userLoc,
      userRole: 'driver',
      userHeading: heading,
      followMode: isActive && !isHudMinimized ? true : false
  });

  // Auto-Zoom Comfort Logic
  useEffect(() => {
    if (!isActive || !userLocData || !mapRef.current) return;
    const speed = (userLocData.speed || 0) * 3.6;
    let targetZoom = 16;
    if (speed > 60) targetZoom = 14;
    else if (speed > 40) targetZoom = 15;
    else if (speed < 5) targetZoom = 17;
    
    // We don't force setView here to avoid fighting with followMode, 
    // but the hook can be updated to handle dynamic zoom if we wanted.
    // For now, let's keep it simple.
  }, [isActive, userLocData]);

    // Get detailed road path when trip starts
    const fetchPath = useCallback(async () => {
        if (!selectedRouteId) return;
        const route = localRoutes.find(r => r._id === selectedRouteId);
        if (!route || !route.stops || route.stops.length < 2) return;

        // CRITICAL FIX: Use pre-calculated road path if available in database
        if (route.path && route.path.length > 0) {
            setDetailedPath(route.path);
            return;
        }

        setIsPathLoading(true);
        const stopCoords = route.stops
            .map((s: any) => {
                const id = s.stopId?._id || s.stopId || s._id || s;
                return localStops.find(st => st._id === id);
            })
            .filter(Boolean)
            .map((s: any) => ({ lat: s.lat, lng: s.lng }));

        if (stopCoords.length >= 2) {
            try {
                // Try to get road route. Retry once if it fails to ensure realism.
                let path = await getRoadRoute(stopCoords);
                if (!path) {
                    console.log("Retrying road path fetch...");
                    path = await getRoadRoute(stopCoords);
                }

                if (path && path.length > 0) {
                    setDetailedPath(path);
                    toast.success('Road-based navigation ready', { id: 'path-ready' });
                } else {
                    toast.error('Falling back to direct stops. Please check connection.', { id: 'path-fail' });
                }
            } catch (err) {
                console.error("Path fetch error:", err);
            }
        }
        setIsPathLoading(false);
    }, [selectedRouteId, localRoutes, localStops, getRoadRoute]);

    useEffect(() => {
        if (mapRef.current && mapInstance) {
            // Force leaflet to recalculate size when panel state changes or tab switches
            setTimeout(() => {
                mapInstance.invalidateSize();
            }, 100);
        }
    }, [isPanelMinimized, activeTab, mapInstance]);

    useEffect(() => {
        if (isActive) {
            fetchPath();
        } else {
            setDetailedPath([]);
        }
    }, [isActive, fetchPath]);

  const fetchShuttles = useCallback(async () => {
    try {
        const { data } = await api.get('/driver/shuttles');
        // Deduplicate shuttles by _id to prevent double listings and duplicate key warnings
        const uniqueShuttles = (data.data || []).reduce((acc: any[], curr: any) => {
            if (!acc.find(s => s._id === curr._id)) acc.push(curr);
            return acc;
        }, []);
        setShuttles(uniqueShuttles);
    } catch (err) {}
  }, []);

  const fetchDriverRoutes = useCallback(async () => {
    try {
        const { data } = await api.get('/driver/my-routes');
        setLocalRoutes(data.data || []);
    } catch (err) {}
  }, []);

  const fetchDriverStops = useCallback(async () => {
    try {
        const { data } = await api.get('/driver/stops');
        setLocalStops(data.data || []);
    } catch (err) {}
  }, []);

  const fetchCurrentTrip = useCallback(async () => {
    try {
        const { data } = await api.get('/driver/current-trip');
        if (data.data) {
            setCurrentTrip(data.data);
            setSelectedShuttleId(data.data.shuttleId?._id || data.data.shuttleId);
            setSelectedRouteId(data.data.routeId?._id || data.data.routeId);
            setIsActive(true);
            toast.success('Restored active trip', { id: 'restore-trip' });
        }
    } catch (err) {}
  }, []);

  const loadData = useCallback(() => {
    fetchDriverRoutes();
    fetchDriverStops();
    fetchShuttles();
    fetchCurrentTrip();
    joinOrganization();
  }, [fetchDriverRoutes, fetchDriverStops, fetchShuttles, fetchCurrentTrip, joinOrganization]);

  useEffect(() => {
    loadData();
  }, [loadData]);

    // Initial Position fetch (when not active)
    useEffect(() => {
        if (!isActive && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(p => setUserLoc([p.coords.latitude, p.coords.longitude]));
        }
    }, [isActive]);

    // Logic to find the "Next Stop" based on proximity
    const nextStop = useMemo(() => {
        if (!userLoc || !filteredStops.length) return filteredStops[0];
        
        // Find the first stop that we haven't reached yet (e.g., > 100m away)
        // or just the closest one overall if we want simple HUD
        const dists = filteredStops.map((s: any) => ({
            stop: s,
            dist: calculateDistance(userLoc[0], userLoc[1], s.lat, s.lng)
        }));
        
        // A simple approach: find the closest stop. 
        // A better approach: find the first stop in sequence that is further than 150m.
        const upcoming = dists.find((d: any) => d.dist > 0.15); // more than 150m away
        return upcoming?.stop || filteredStops[filteredStops.length - 1];
    }, [userLoc, filteredStops]);

    // Auto-announce next stop when approaching
    useEffect(() => {
        if (!nextStop || !isActive || !nextStopVoice) return;
        const dist = calculateDistance(userLoc?.[0] || 0, userLoc?.[1] || 0, nextStop.lat, nextStop.lng);
        
        // If within 300m and haven't announced this stop recently
        if (dist < 0.3 && (window as any).lastAnnouncedStop !== nextStop._id) {
            announceNextStop(nextStop.name);
            (window as any).lastAnnouncedStop = nextStop._id;
        }
    }, [userLoc, nextStop, isActive, nextStopVoice, announceNextStop]);

    const isActiveRef = useRef(isActive);
    const passengerCountRef = useRef(passengerCount);
    const shuttleIdRef = useRef(selectedShuttleId);
    const routeIdRef = useRef(selectedRouteId);

    useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
    useEffect(() => { passengerCountRef.current = passengerCount; }, [passengerCount]);
    useEffect(() => { shuttleIdRef.current = selectedShuttleId; }, [selectedShuttleId]);
    useEffect(() => { routeIdRef.current = selectedRouteId; }, [selectedRouteId]);

    const sendUpdate = useCallback((pos: GeolocationPosition | any) => {
        const { latitude: lat, longitude: lng, speed, heading: h } = pos.coords;
        const now = Date.now();
        
        // THROWBACK: Throttle location updates to every 3 seconds for better performance & battery
        if (isActiveRef.current && (now - lastEmitTimeRef.current < 3000)) {
            return;
        }
        lastEmitTimeRef.current = now;
        
        let speedValue = (speed !== null && speed !== undefined) ? speed * 3.6 : 0;

        // Fallback speed calculation if native GPS speed is missing
        if ((speed === null || speed === undefined || speed === 0) && lastUpdateRef.current) {
             const d = calculateDistance(lastUpdateRef.current.lat, lastUpdateRef.current.lng, lat, lng);
             const t = (now - lastUpdateRef.current.time) / 1000 / 3600; // in hours
             if (t > 0.0001 && d > 0.005) { // Threshold increased to 5 meters to prevent jitter
                 const calcSpeed = d / t;
                 if (calcSpeed < 120) speedValue = calcSpeed;
             } else if (d <= 0.005) {
                 speedValue = 0; // Stationary
             }
        }
        
        const roundedSpeed = Math.round(speedValue);
        setCurrentSpeed(roundedSpeed);

        // SPEED ALERT TRIGGER
        if (speedValue > 80) triggerHaptic('warning');
        
        if (lastUpdateRef.current) {
            const drift = calculateDistance(lastUpdateRef.current.lat, lastUpdateRef.current.lng, lat, lng);
            if (drift < 0.005 && speedValue < 2) {
                // If moved less than 5m and speed is very low, treat as stationary
                // and skip emitting to prevent jittery movement on maps
                return;
            }
        }

        lastUpdateRef.current = { lat, lng, time: now };
        setHeading(h || 0);
        setUserLoc([lat, lng]);
        setUserLocData(pos.coords);

        let currentEta: number | undefined;
        let currentDist: number | undefined;

        const active = isActiveRef.current;
        const sId = shuttleIdRef.current;
        const rId = routeIdRef.current;
        const pCount = passengerCountRef.current;

        if (active && rId) {
            const route = localRoutes.find(r => r._id === rId);
            if (route && route.stops?.length > 0) {
                const lastItem = route.stops[route.stops.length - 1];
                const lastStopId = lastItem.stopId?._id || lastItem.stopId || lastItem._id || lastItem;
                const destStop = localStops.find(s => s._id === lastStopId);
                if (destStop) {
                    const dist = calculateDistance(lat, lng, destStop.lat, destStop.lng);
                    currentDist = parseFloat(dist.toFixed(1));
                    setDistanceRemaining(currentDist);
                    const estSpeed = speedValue > 5 ? speedValue : 25; 
                    currentEta = Math.round((dist / estSpeed) * 60);
                    setEta(currentEta);
                }
            }
        }

        emitLocation({
            shuttleId: sId,
            routeId: rId,
            lat,
            lng,
            speed: roundedSpeed,
            heading: h || 0,
            passengerCount: pCount,
            eta: currentEta,
            distance: currentDist,
            status: active ? 'active' : (selectedShuttle?.status || 'idle')
        });
        
        if (sId) emitGeofenceCheck(lat, lng, sId);
    }, [localRoutes, localStops, emitLocation, emitGeofenceCheck, triggerHaptic]);

    // GPS Tracking Loop
    useEffect(() => {
        if (!isActive) return;

        let watchId: number;
        if ("geolocation" in navigator) {
            watchId = navigator.geolocation.watchPosition(sendUpdate, (err) => toast.error('GPS: ' + err.message), {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 5000
            });
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isActive, sendUpdate]);



  const toggleTrip = async () => {
    if (isActive) {
        // End Trip
        setIsLoading(true);
        try {
            const tripStartTime = currentTrip?.startTime || Date.now();
            const durationMinutes = Math.round((Date.now() - new Date(tripStartTime).getTime()) / 60000);
            
            await api.post('/driver/end-trip', { tripId: currentTrip?._id });
            emitEndTrip(selectedShuttleId, currentTrip?._id);
            
            const summary = {
                distance: distanceRemaining ? Math.abs(15 - distanceRemaining) : 12.5, // Mock distance logic for now
                time: durationMinutes > 0 ? durationMinutes : 45,
                rating: 4.9,
                passengers: passengerCount,
                endTime: new Date().toLocaleTimeString()
            };
            
            setLastShiftData(summary);
            setShowShiftSummary(true);
            setIsActive(false);
            setIsPanelMinimized(false);
            setCurrentTrip(null);
            setDetailedPath([]);
            setPassengerCount(0);
            triggerHaptic('success');
            
            // Map Comfort: Fit shuttles after trip
            setTimeout(() => fitAllShuttles(), 500);
        } catch { toast.error('Failed to end trip'); }
        finally { setIsLoading(false); }
    } else {
        // Start Trip
        if (!selectedShuttleId || !selectedRouteId) {
            toast.error('Please assign a vehicle and route');
            return;
        }
        setIsLoading(true);
        try {
            const { data } = await api.post('/driver/start-trip', {
                shuttleId: selectedShuttleId,
                routeId: selectedRouteId
            });
            setCurrentTrip(data.data);
            emitStartTrip(data.data._id, selectedShuttleId, selectedRouteId);
            setIsActive(true);
            setIsPanelMinimized(true);
            toast.success('Drive active! Your location is being shared.');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start trip');
        } finally { setIsLoading(false); }
    }
  };

  const updatePassengers = (delta: number) => {
      const newVal = Math.max(0, passengerCount + delta);
      setPassengerCount(newVal);
      if (isActive) emitPassengerCount(selectedShuttleId, newVal);
  };

  const handleSOSConfirm = () => {
      // Allow SOS even if trip is not active, but we need location and shuttle
      if (!userLoc) {
          toast.error('Establishing GPS lock...', { id: 'gps-error' });
          navigator.geolocation.getCurrentPosition((p) => {
              setUserLoc([p.coords.latitude, p.coords.longitude]);
              toast.success('GPS Lock acquired. Try SOS again.');
          });
          return;
      }
      if (!selectedShuttleId) {
          toast.error('Please assign a vehicle to enable SOS reporting', { id: 'shuttle-error' });
          return;
      }
      
      setShowSOSConfirm(false);
      setIsSOSActive(true); 
      triggerHaptic('error');
      
      // 1. Emit via socket (immediate)
      emitEmergency(selectedShuttleId, userLoc[0], userLoc[1]);
      
      // 2. Clear backup via API (indestructible)
      api.post('/driver/sos', { 
          shuttleId: selectedShuttleId, 
          lat: userLoc[0], 
          lng: userLoc[1] 
      }).then(() => {
          toast.error('DISPATCH RECEIVED SOS', { icon: '🚨' });
      }).catch(() => {
          console.error("SOS API Fail (Socket fallback handled it)");
      });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <AnimatePresence>
        {isSOSActive && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[3000] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center overflow-hidden"
            >
                {/* Professional Emergency Backdrop */}
                <div className="absolute inset-0 opacity-20">
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600 via-transparent to-transparent animate-pulse" />
                     <div className="h-full w-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                </div>

                <motion.div 
                    initial={{ scale: 0.5, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="relative z-10 space-y-8"
                >
                    <div className="relative inline-block">
                        <div className="w-32 h-32 rounded-full bg-red-600/20 flex items-center justify-center text-red-600 animate-pulse">
                            <Shield className="w-16 h-16" strokeWidth={1.5} />
                        </div>
                        <div className="absolute inset-0 rounded-full border-4 border-red-600/30 animate-ping" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-5xl font-display font-black text-white uppercase italic tracking-tighter leading-none">
                            Emergency <span className="text-red-500">Active</span>
                        </h2>
                        <div className="flex flex-col items-center gap-2">
                             <div className="flex items-center gap-3 bg-red-600/10 px-4 py-2 rounded-xl border border-red-600/30">
                                <Radio size={16} className="text-red-500 animate-pulse" />
                                <span className="text-xs font-black text-red-500 uppercase tracking-widest">Control Center Notified</span>
                             </div>
                             <p className="text-zinc-400 text-sm max-w-sm font-medium">
                                Your precise coordinates are being streamed to dispatch. Stay calm and follow authorized safety protocols.
                             </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-left">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Latitude</p>
                            <p className="text-white font-mono">{userLoc?.[0].toFixed(6)}</p>
                        </div>
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 text-left">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Longitude</p>
                            <p className="text-white font-mono">{userLoc?.[1].toFixed(6)}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            setIsSOSActive(false);
                            triggerHaptic('success');
                        }} 
                        className="w-full max-w-xs py-5 bg-white text-zinc-950 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl active:scale-95 transition-all mt-12 hover:bg-zinc-200"
                    >
                        Deactivate Alert
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Confirmation Modal */}
      <AnimatePresence>
        {showSOSConfirm && (
          <div className="fixed inset-0 z-[3001] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm glass-heavy border border-red-500/30 rounded-[2rem] p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-6">
                <AlertCircle size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-2">Emergency Hub</h3>
              <p className="text-sm text-text-4 font-medium mb-8 leading-relaxed">
                Confirm sending an emergency alert to dispatch? This will broadcast your location to all authorities.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleSOSConfirm}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 transition-all font-sans"
                >
                  Confirm Emergency SOS
                </button>
                <button
                  onClick={() => setShowSOSConfirm(false)}
                  className="w-full py-4 bg-glass-2 hover:bg-glass-3 text-text-2 font-black uppercase tracking-widest text-xs rounded-2xl active:scale-95 transition-all font-sans"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header logic ... */}
      <header className="flex-shrink-0 px-4 py-3 flex items-center justify-between z-40 relative"
        style={{ background: 'var(--glass-3)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-1)' }}>
        <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <BusLogo />
            </div>
            <div>
                <p className="font-display font-bold text-lg leading-none uppercase tracking-tight" style={{ color: 'var(--text-1)' }}>ShutliX <span className="text-brand">DRV</span></p>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: isActive ? '#10B981' : 'var(--text-4)' }}>
                    {isActive ? '• Active Duty' : '• Off Duty'}
                </p>
            </div>
        </div>

        {/* Desktop Tab Switcher simplified to boxy design */}
        <div className="hidden md:block relative">
             <button 
                onClick={() => setShowTabMenu(!showTabMenu)}
                className="flex items-center gap-2 bg-glass-1 p-2 px-3 rounded-xl border border-white/10 shadow-sm hover:bg-glass-2 transition-all group"
             >
                <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center text-brand">
                    {activeTab === 'drive' && <LayoutDashboard size={14} />}
                    {activeTab === 'cargo' && <Zap size={14} />}
                    {activeTab === 'profile' && <Settings size={14} />}
                </div>
                <div className="text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 leading-none mb-0.5">Control Mode</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-1">
                        {activeTab === 'drive' && 'Map & Drive'}
                        {activeTab === 'cargo' && 'Utility Hub'}
                        {activeTab === 'profile' && 'Settings'}
                    </p>
                </div>
                <ChevronDown size={14} className={`ml-1 opacity-40 transition-transform ${showTabMenu ? 'rotate-180' : ''}`} />
             </button>

             <AnimatePresence>
                {showTabMenu && (
                    <>
                        <div 
                            className="fixed inset-0 z-[1010]" 
                            onClick={() => setShowTabMenu(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 z-[1011] glass-heavy border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[200px]"
                        >
                            <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest opacity-40">Switch Mode</p>
                            {[
                                { id: 'drive', label: 'Map & Drive', icon: LayoutDashboard },
                                { id: 'cargo', label: 'Utility Hub', icon: Zap },
                                { id: 'profile', label: 'Settings', icon: Settings },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any);
                                        setShowTabMenu(false);
                                    }}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'hover:bg-white/5 text-text-2 hover:opacity-100'}`}
                                >
                                    <tab.icon size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                                    {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
             </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
                setIsNightMode(!isNightMode);
                triggerHaptic();
            }} 
            className="btn-ghost btn-icon"
          >
             {isNightMode ? <Moon size={18} className="text-brand" /> : <Zap size={18} />}
          </button>
          <ThemeToggle />
          <button onClick={() => navigate('/chat')} className="btn-ghost btn-icon relative">
             <MessageCircle size={18} />
             <div className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border-2 border-white dark:border-zinc-900" />
          </button>
        </div>
      </header>

      {/* Persistent SOS Button (Global Floating) - Available as soon as shuttle is assigned */}
      <AnimatePresence>
        {selectedShuttleId && (
            <motion.button 
               initial={{ scale: 0, rotate: -45 }}
               animate={{ scale: 1, rotate: 0 }}
               exit={{ scale: 0 }}
               onClick={() => {
                 setShowSOSConfirm(true);
                 triggerHaptic('warning');
               }}
               className={`fixed bottom-28 right-6 z-[2000] w-16 h-16 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center transition-all active:scale-90 border-4 border-white md:bottom-32
                 ${isSOSActive ? 'bg-orange-500 animate-bounce' : 'bg-red-500'}
               `}
            >
                <AlertTriangle size={32} color="white" />
                <div className="absolute -top-1 -right-1 bg-white text-red-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-500 shadow-sm">SOS</div>
            </motion.button>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Mobile Navigation HUD - Only show when trip active and panel hidden */}
        <AnimatePresence>
          {isActive && isPanelMinimized && (
            <motion.div 
               initial={{ y: -100 }}
               animate={{ y: 0 }}
               exit={{ y: -100 }}
               className="absolute top-20 left-0 right-0 z-[1000] p-4 pointer-events-none md:hidden"
            >
               <div className="glass-heavy rounded-2xl p-4 shadow-2xl border border-brand/20 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand">
                            <Zap className="animate-pulse" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-brand tracking-widest">Next Stop</p>
                            <p className="text-xs font-bold truncate max-w-[100px]">{nextStop?.name || 'In Transit'}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="text-right">
                            <p className="text-[10px] opacity-40 uppercase font-bold">ETA</p>
                            <p className="text-sm font-black text-brand">{eta || '--'}m</p>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="text-right">
                            <p className="text-[10px] opacity-40 uppercase font-bold">Dist</p>
                            <p className="text-sm font-black text-brand">{distanceRemaining || '--'}km</p>
                        </div>
                    </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`
          flex-shrink-0 w-full md:w-96 flex flex-col h-full z-[1001] transition-all duration-500
          ${activeTab === 'drive' ? 'block' : 'hidden'}
          ${activeTab === 'drive' ? 'bg-zinc-950/60 backdrop-blur-xl md:bg-transparent absolute md:relative inset-0 md:inset-auto' : ''}
          ${isPanelMinimized ? '-translate-x-full opacity-0 pointer-events-none md:w-0 md:p-0 overflow-hidden' : 'translate-x-0 opacity-100 p-4 pt-4 md:pt-4 overflow-y-auto space-y-4'}
        `}>
          {/* Panel Close/Minimize Button */}
          <button 
             onClick={() => setIsPanelMinimized(true)}
             className="absolute top-4 right-4 z-[1002] w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all border border-white/5 active:scale-95"
             title="Minimize Controls"
          >
             <X size={20} className="text-white/60" />
          </button>

          {/* Status & Toggle */}
          <AnimatePresence>
              {showShiftSummary && lastShiftData && (
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
                                  <p className="text-xl font-bold">{lastShiftData.distance.toFixed(1)} <span className="text-xs opacity-40">KM</span></p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                  <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Time on Road</p>
                                  <p className="text-xl font-bold">{lastShiftData.time} <span className="text-xs opacity-40">MIN</span></p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                  <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Passengers</p>
                                  <p className="text-xl font-bold">{lastShiftData.passengers}</p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                  <p className="text-[10px] font-bold opacity-30 uppercase mb-1">Safety Rating</p>
                                  <div className="flex items-center gap-1">
                                      <p className="text-xl font-bold">{lastShiftData.rating}</p>
                                      <BarChart3 size={14} className="text-green-500" />
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-3">
                              <button 
                                  onClick={() => setShowShiftSummary(false)}
                                  className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
                              >
                                  Submit Report
                              </button>
                              <button 
                                  onClick={() => setShowShiftSummary(false)}
                                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
                              >
                                  Dismiss Summary
                              </button>
                          </div>
                      </motion.div>
                  </motion.div>
              )}
          </AnimatePresence>

          <div className="glass-md rounded-2xl p-5" style={{ background: isActive ? 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, transparent 100%)' : '' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                 <span className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>{isActive ? 'Live' : 'Ready'}</span>
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>{new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit'})}</p>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                  <label className="label text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">Route Assignment</label>
                  <select 
                    disabled={isActive} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all outline-none font-bold text-sm" 
                    value={selectedRouteId} 
                    onChange={e => setSelectedRouteId(e.target.value)}
                  >
                    <option value="">Select Route...</option>
                    {localRoutes.map((r, idx) => <option key={`${r._id}-${idx}`} value={r._id}>{r.name} ({r.shortCode})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-[10px] font-black uppercase tracking-widest opacity-40 mb-1.5 block">Vehicle Assignment</label>
                  <select 
                    disabled={isActive} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all outline-none font-bold text-sm" 
                    value={selectedShuttleId} 
                    onChange={e => setSelectedShuttleId(e.target.value)}
                  >
                    <option value="">Select Vehicle...</option>
                    {shuttles.map((s:any, idx: number) => <option key={`${s._id}-${idx}`} value={s._id}>{s.name} · {s.plateNumber}</option>)}
                  </select>
                </div>
            </div>

            <button
              onClick={toggleTrip}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg
                ${isActive ? 'bg-red-500/10 border border-red-500/30 text-red-500' : 'bg-indigo-600 text-white'}
              `}
            >
              {isLoading ? <span className="loader"><span/><span/><span/></span> : (
                isActive ? <><Square size={20} fill="currentColor"/> END TRIP</> : <><Play size={20} fill="currentColor"/> START TRIP</>
              )}
            </button>
          </div>

          {/* Passenger Control & Manifest (Feature 2 & 11) */}
          <div className="glass-md rounded-2xl p-5 space-y-6">
            <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-4)' }}>
                    <Users size={14}/> Manifest
                  </h3>
                  <div className="flex items-center gap-1">
                      <button onClick={() => announceNextStop(nextStop?.name || '')} title="Announce Next Stop" className="p-2 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors">
                          <Mic size={14} />
                      </button>
                      <button onClick={() => setShowIncidentModal(true)} title="Report Incident" className="p-2 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors">
                          <AlertCircle size={14} />
                      </button>
                      <button onClick={() => setShowLostReport(true)} title="Report Lost Item" className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors">
                          <Search size={14} />
                      </button>
                  </div>
            </div>

            <div className={`flex items-center justify-between gap-6 ${!isActive ? 'opacity-40 pointer-events-none' : ''}`}>
               <button 
                  id="passenger-decrease"
                  disabled={passengerCount <= 0 || !isActive} 
                  onClick={() => updatePassengers(-1)}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center bg-zinc-900 border border-white/5 shadow-[0_8px_16px_rgba(0,0,0,0.3)] active:shadow-inner active:translate-y-0.5 active:scale-95 transition-all group"
               >
                  <span className="text-3xl font-black text-white/40 group-hover:text-white transition-colors">-</span>
               </button>
               <div className="text-center flex-1">
                 <motion.span 
                   key={passengerCount}
                   initial={{ scale: 1.2, color: '#3b82f6' }}
                   animate={{ scale: 1, color: 'var(--text-1)' }}
                   className="text-4xl font-display font-black block tracking-tighter"
                 >
                    {passengerCount}
                 </motion.span>
                 <p className="text-[10px] mt-1 font-black uppercase tracking-[0.2em] opacity-40">Passengers</p>
               </div>
               <button 
                  id="passenger-increase"
                  disabled={!isActive} 
                  onClick={() => updatePassengers(1)}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand shadow-[0_8px_20px_rgba(37,99,235,0.4)] border border-white/20 active:shadow-inner active:translate-y-0.5 active:scale-95 transition-all group"
               >
                  <span className="text-3xl font-black text-white">+</span>
               </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-border-1">
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Upcoming Stops</p>
                <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                    {filteredStops.slice(0, 3).map((stop: any, idx: number) => (
                        <div key={`${stop._id}-${idx}`} className={`flex items-center justify-between p-2 rounded-lg ${stop._id === nextStop?._id ? 'bg-brand/10 border border-brand/20' : 'bg-glass-1'}`}>
                            <div className="flex items-baseline gap-2 overflow-hidden">
                                <span className={`text-[10px] font-bold ${stop._id === nextStop?._id ? 'text-brand' : 'opacity-30'}`}>{idx + 1}</span>
                                <p className={`text-xs font-bold truncate ${stop._id === nextStop?._id ? 'text-brand' : 'opacity-60'}`}>{stop.name}</p>
                            </div>
                            {stop._id === nextStop?._id && <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />}
                        </div>
                    ))}
                    {filteredStops.length > 3 && <p className="text-center text-[9px] font-bold opacity-30 italic">+{filteredStops.length - 3} more waypoints</p>}
                </div>
            </div>
          </div>

          {/* Tools & Chat */}
          <div className="grid grid-cols-2 gap-3 pb-8">
            <button
               onClick={() => setShowQRModal(true)}
               className="glass-md p-4 rounded-2xl flex flex-col items-center gap-2 group active:scale-95 transition-all text-brand"
            >
               <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <QrCode size={20} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest">Show QR</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="glass-md p-4 rounded-[1.5rem] flex flex-col items-center gap-2 group active:scale-95 transition-all">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <MessageCircle size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
            </button>
          </div>
        </div>

        {/* Map View */}
        <div className={`flex-1 relative h-full w-full ${activeTab === 'drive' ? 'block' : 'hidden'}`} style={{ zIndex: 1 }}>
            <div ref={mapRef} className="absolute inset-0 z-0 bg-zinc-950" />
            
            {/* Restore Panel Button (Floating) */}
            <AnimatePresence>
                {isPanelMinimized && activeTab === 'drive' && (
                    <motion.button 
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        onClick={() => setIsPanelMinimized(false)}
                        className="absolute top-4 left-4 z-[1005] flex items-center gap-3 bg-brand text-white px-5 py-4 rounded-3xl shadow-[0_20px_40px_rgba(37,99,235,0.4)] border-2 border-white/20 active:scale-95 transition-all group pointer-events-auto"
                    >
                        <LayoutDashboard size={20} className="group-hover:rotate-12 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-wider">Open Controls</span>
                    </motion.button>
                )}
            </AnimatePresence>
            
            {/* Map Controls */}
            <div className="absolute right-6 bottom-32 md:bottom-10 z-[100] flex flex-col gap-3">
              <button 
                onClick={() => centerOnUser()} 
                className="w-14 h-14 bg-white dark:bg-zinc-900 text-brand rounded-2xl shadow-xl border-2 border-white/10 flex items-center justify-center group active:scale-95 transition-all"
                title="Center on my position"
              >
                  <Navigation size={24} className="fill-current -rotate-45" />
              </button>
            </div>

            <div className="absolute top-4 left-4 right-4 z-10 space-y-3 pointer-events-none">
                <div className="max-w-md pointer-events-auto">
                    <MapSearchBar onSearch={searchPlace} />
                </div>
                
                <div className="flex gap-2 pointer-events-auto">
                     <button onClick={() => setTileLayer('cartoDark')} className="glass-md px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-glass-3 transition-all">DARK</button>
                     <button onClick={() => setTileLayer('esriSatellite')} className="glass-md px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-glass-3 transition-all">SATELLITE</button>
                     <button onClick={() => userLoc && panToLocation(userLoc[0], userLoc[1], 17)} className="glass-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-brand hover:bg-glass-3 transition-all">MY LOCATION</button>
                </div>
            </div>

            <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
                 <button onClick={() => fitAllShuttles()} className="p-4 bg-brand text-white rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all">
                    <Navigation size={24} />
                 </button>
            </div>

            {/* Trip Stats Overlay (Minimizeable) */}
            {isActive && (
                <div className={`absolute top-4 left-4 right-4 md:left-auto md:w-80 z-[110] pointer-events-none transition-all duration-500 ${isPanelMinimized ? 'md:right-4' : 'md:right-4'}`}>
                    <motion.div 
                        initial={false}
                        animate={{ height: isStatsMinimized ? 72 : 'auto' }}
                        className="glass-heavy rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 pointer-events-auto overflow-hidden" 
                        style={{ background: 'rgba(var(--bg-rgb, 15, 23, 42), 0.95)' }}
                    >
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                                        <Zap className="animate-pulse" size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] font-black text-brand uppercase tracking-widest leading-none mb-1">Live Telemetry</p>
                                        <p className="font-bold text-sm truncate max-w-[140px]" style={{ color: 'var(--text-1)' }}>{nextStop?.name || 'In Transit'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right mr-1">
                                        <p className="text-[10px] font-bold uppercase opacity-30 leading-none mb-1">ETA</p>
                                        <p className="text-xl font-display font-black text-brand uppercase leading-none">{eta || '--'}<span className="text-xs ml-0.5">m</span></p>
                                    </div>
                                    <button 
                                        onClick={() => setIsStatsMinimized(!isStatsMinimized)}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                                    >
                                        {isStatsMinimized ? <ChevronRight size={18} className="rotate-90 opacity-60" /> : <ChevronLeft size={18} className="rotate-90 opacity-60" />}
                                    </button>
                                </div>
                            </div>
                            
                            <AnimatePresence>
                                {!isStatsMinimized && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5"
                                    >
                                         <div className="text-center">
                                             <p className="text-[9px] font-black uppercase opacity-30 mb-1">Speed</p>
                                             <div className="flex items-baseline justify-center">
                                                 <p className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{currentSpeed}</p>
                                                 <span className="text-[8px] font-bold ml-1 opacity-40">KM/H</span>
                                             </div>
                                         </div>
                                         <div className="text-center border-x border-white/5">
                                             <p className="text-[9px] font-black uppercase opacity-30 mb-1">Remain</p>
                                             <div className="flex items-baseline justify-center">
                                                 <p className="text-lg font-black" style={{ color: 'var(--text-1)' }}>{distanceRemaining || '--'}</p>
                                                 <span className="text-[8px] font-bold ml-1 opacity-40">KM</span>
                                             </div>
                                         </div>
                                         <div className="text-center">
                                             <p className="text-[9px] font-black uppercase opacity-30 mb-1">Load</p>
                                             <div className="flex items-baseline justify-center">
                                                 <p className="text-lg font-black text-brand">{passengerCount}</p>
                                                 <Users size={10} className="ml-1 opacity-40" />
                                             </div>
                                         </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
            
            {/* Quick Access Menu (Mobile Floating) - Hidden as it is overlapping with new restore button */}
        </div>

        {/* Check-in Tab */}
        {activeTab === 'cargo' && (
             <div className="absolute inset-0 z-50 p-6 overflow-y-auto space-y-6 bg-base animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {/* Back Button for Navigation */}
                 <div className="flex items-center gap-4 mb-4">
                    <button 
                        onClick={() => setActiveTab('drive')}
                        className="p-3 bg-glass-1 hover:bg-glass-2 rounded-2xl transition-all border border-border-1 text-text-1 group"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h2 className="font-display font-black text-2xl uppercase tracking-tight" style={{ color: 'var(--text-1)' }}>Utility Hub</h2>
                        <p className="text-[10px] font-black uppercase text-brand tracking-widest">Operation Control</p>
                    </div>
                 </div>

                 <AnimatePresence>
                     {lastShiftData && (
                         <motion.button
                             initial={{ opacity: 0, y: -20 }}
                             animate={{ opacity: 1, y: 0 }}
                             onClick={() => setShowShiftSummary(true)}
                             className="w-full p-6 glass-md border border-brand/20 rounded-3xl flex items-center justify-between group bg-brand/5 active:scale-95 transition-all mb-4"
                         >
                             <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                                     <FileText size={24} />
                                 </div>
                                 <div className="text-left">
                                     <p className="text-sm font-bold">Latest Trip Report</p>
                                     <p className="text-[10px] opacity-40 uppercase tracking-widest">Completed at {lastShiftData.endTime}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="text-right hidden sm:block">
                                     <p className="text-[10px] font-bold opacity-30 uppercase tracking-tighter">Rating</p>
                                     <p className="text-sm font-black text-green-500">4.9 ★</p>
                                 </div>
                                 <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 transition-all" />
                             </div>
                         </motion.button>
                     )}
                 </AnimatePresence>

                 <div className="flex items-center justify-between">
                    <h2 className="font-display font-black text-xl uppercase tracking-tight" style={{ color: 'var(--text-1)' }}>Utility Hub</h2>
                    <div className="px-3 py-1 rounded-full bg-brand/10 text-brand text-[10px] font-black uppercase tracking-widest">
                       Driver Operations
                    </div>
                 </div>
                 
                 <QRGenerator tripId={currentTrip?._id} shuttleId={selectedShuttleId} isActive={isActive} />
                 
                 <div className="glass-md rounded-[2rem] p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                           <RefreshCw size={16} className="animate-spin-slow" />
                        </div>
                        <h3 className="font-bold text-sm">Session Telemetry</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-3xl bg-glass-2 border border-border-1">
                            <p className="text-[10px] font-bold opacity-40 uppercase mb-1">Time on Duty</p>
                            <p className="font-mono font-bold text-lg text-brand">01:24:05</p>
                        </div>
                        <div className="p-4 rounded-3xl bg-glass-2 border border-border-1">
                            <p className="text-[10px] font-bold opacity-40 uppercase mb-1">Avg. Speed</p>
                            <p className="font-mono font-bold text-lg text-brand">32 <span className="text-[10px]">km/h</span></p>
                        </div>
                    </div>
                 </div>
             </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'profile' && (
             <div className="absolute inset-0 z-50 p-6 overflow-y-auto space-y-8 bg-base animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
                 <div className="w-full max-w-lg space-y-8">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setActiveTab('drive')}
                                className="p-3 bg-glass-1 hover:bg-glass-2 rounded-2xl transition-all border border-border-1 text-text-1 group"
                            >
                                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                            <div>
                                <h2 className="font-display font-black text-2xl uppercase tracking-tighter" style={{ color: 'var(--text-1)' }}>Settings</h2>
                                <p className="text-[10px] font-bold uppercase opacity-40">Preferences & Profile Control</p>
                            </div>
                         </div>
                        <div className="px-3 py-1 rounded-full bg-brand/10 text-brand text-[8px] font-black uppercase tracking-[0.2em]">
                           Verified Driver
                        </div>
                     </div>

                     <div className="flex flex-col items-center text-center pb-6 border-b border-white/5">
                        <div className="relative mb-4">
                            <Avatar user={user} size={100} />
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 border-4 border-[var(--bg-base)] flex items-center justify-center text-white">
                               <Check size={14} />
                            </div>
                        </div>
                        
                        {isEditingProfile ? (
                            <div className="w-full max-w-xs space-y-3">
                                <input 
                                    value={editedName} 
                                    onChange={e => setEditedName(e.target.value)} 
                                    className="input text-center font-bold" 
                                    placeholder="Full Name"
                                />
                                <input 
                                    value={editedPhone} 
                                    onChange={e => setEditedPhone(e.target.value)} 
                                    className="input text-center" 
                                    placeholder="Phone Number"
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={async () => {
                                            try {
                                                const { data } = await api.patch('/auth/me/profile', { name: editedName, phone: editedPhone });
                                                updateUser(data.data);
                                                toast.success('Settings synchronized');
                                                setIsEditingProfile(false);
                                            } catch (err: any) {
                                                toast.error(err.response?.data?.message || 'Failed to update');
                                            }
                                        }}
                                        className="flex-1 py-3 bg-brand text-white rounded-xl text-[10px] font-black uppercase"
                                    >
                                        Apply Config
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setEditedName(user?.name || '');
                                            setEditedPhone(user?.phone || '');
                                            setIsEditingProfile(false);
                                        }}
                                        className="flex-1 py-3 bg-white/10 rounded-xl text-[10px] font-black uppercase"
                                    >
                                        Revert
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-display font-black" style={{ color: 'var(--text-1)' }}>{user?.name}</h2>
                                <p className="text-sm opacity-50 font-medium">{user?.phone || user?.email}</p>
                     <div className="flex gap-2 mt-4">
                        <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="px-6 py-2.5 rounded-full bg-brand/10 border border-brand/20 text-[10px] font-black uppercase tracking-widest text-brand hover:bg-brand/20 transition-all font-sans"
                        >
                            Configure Profile
                        </button>
                        <button 
                            onClick={() => {
                                logout();
                                navigate('/login');
                                toast.success('Logged out successfully');
                            }}
                            className="px-6 py-2.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all flex items-center gap-2 font-sans"
                        >
                            <LogOut size={12} /> Exit
                        </button>
                    </div>
                            </>
                        )}
                     </div>

                     <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Work Management</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button 
                                onClick={() => setShowLeaveModal(true)}
                                className="glass-md p-5 rounded-3xl flex items-center justify-between group active:scale-[0.98] transition-all"
                            >
                               <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                                       <Clock size={24} />
                                   </div>
                                   <div className="text-left">
                                       <p className="text-sm font-bold">Request Leave</p>
                                       <p className="text-[10px] opacity-40">Submit time-off requests</p>
                                   </div>
                               </div>
                               <ChevronRight size={16} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </button>

                            <div className="glass-md p-5 rounded-3xl flex items-center justify-between opacity-60">
                               <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                       <ListChecks size={24} />
                                   </div>
                                   <div className="text-left">
                                       <p className="text-sm font-bold">Shift Logs</p>
                                       <p className="text-[10px] opacity-40">Previous duty records</p>
                                   </div>
                               </div>
                               <ChevronRight size={16} className="opacity-20" />
                            </div>
                        </div>
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Preferred Configuration</h3>
                        <div className="glass-md rounded-[2.5rem] p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                                        <Bell size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Emergency Vibration</p>
                                        <p className="text-[10px] opacity-50">Local tactile response for SOS</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                                        <Zap size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Voice Guidance</p>
                                        <p className="text-[10px] opacity-50">Audible stop announcements</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={nextStopVoice} onChange={e => setNextStopVoice(e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                                </label>
                            </div>
                        </div>
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Vehicle Status</h3>
                        <div className="glass-md rounded-[2.5rem] p-6 space-y-4">
                            <p className="text-xs font-medium opacity-60">Report mechanical issues directly to the Fleet Manager.</p>
                            <textarea 
                                value={maintenanceReport}
                                onChange={(e) => setMaintenanceReport(e.target.value)}
                                className="input min-h-[100px] resize-none text-sm p-4 bg-white/5" 
                                placeholder="e.g. Brake squealing, AC weak, Tire pressure low..." 
                            />
                            <button 
                                onClick={() => {
                                    if (!maintenanceReport.trim()) return toast.error('Please describe the issue');
                                    toast.success('Report submitted to Fleet Manager');
                                    setMaintenanceReport('');
                                    triggerHaptic();
                                }}
                                className="w-full py-4 rounded-2xl bg-brand text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl"
                            >
                                <Truck size={16} /> Submit Maintenance Report
                            </button>
                        </div>
                     </section>

                     <section className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Account & Safety</h3>
                        <div className="glass-md rounded-[2.5rem] p-4 space-y-3">
                            <button 
                                onClick={() => { logout(); navigate('/login'); }}
                                className="w-full py-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-between px-6"
                            >
                                <div className="flex items-center gap-4">
                                    <LogOut size={20} className="text-blue-500" />
                                    <span className="text-sm font-bold">Logout Session</span>
                                </div>
                                <ChevronRight size={18} className="opacity-20" />
                            </button>
                            
                            <button 
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full py-5 rounded-3xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all flex items-center justify-between px-6"
                            >
                                <div className="flex items-center gap-4">
                                    <AlertTriangle size={20} className="text-red-500" />
                                    <span className="text-sm font-bold text-red-500">Permanent Account Deletion</span>
                                </div>
                                <ChevronRight size={18} className="opacity-20 text-red-500" />
                            </button>
                        </div>
                     </section>

                     <div className="py-20 text-center opacity-30">
                        <p className="text-[11px] font-black uppercase tracking-[0.5em]">ShutliX Logistics v2.1.0</p>
                        <p className="text-[9px] mt-2 font-bold uppercase tracking-widest">Enterprise Edition</p>
                     </div>
                 </div>
             </div>
         )}
      </main>
      
      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
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
                                <p className="text-[10px] font-black uppercase text-brand tracking-widest leading-none">Vehicle Check-in</p>
                            </div>
                        </div>
                        <button onClick={() => setShowQRModal(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all"><X size={20}/></button>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center">
                        <QRGenerator tripId={currentTrip?._id} shuttleId={selectedShuttleId} isActive={isActive} />
                    </div>

                    <div className="space-y-4">
                        <div className="bg-glass-2 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-[10px] font-bold opacity-40 uppercase mb-1">Assigned Vehicle</p>
                            <p className="font-bold text-sm">{selectedShuttle?.name || 'N/A'}</p>
                        </div>
                        <p className="text-[10px] text-center opacity-40 font-medium px-4">
                            Students must scan this code to confirm their boarding status for this specific trip session.
                        </p>
                    </div>

                    <button 
                        onClick={() => setShowQRModal(false)}
                        className="w-full py-4 bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
                    >
                        Close Portal
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLostReport && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2200] bg-black/80 backdrop-blur-md flex items-end justify-center p-4"
            >
                <motion.div 
                    initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                    className="glass-heavy w-full max-w-sm rounded-[2.5rem] p-6 space-y-6 overflow-hidden"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-display font-black text-2xl uppercase italic tracking-tighter text-white">Found Item</h3>
                            <p className="text-[10px] font-black uppercase text-brand tracking-widest leading-none">Lost & Found Registry</p>
                        </div>
                        <button onClick={() => setShowLostReport(false)} className="p-2 bg-white/5 rounded-full text-white/50"><X size={20}/></button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase opacity-40 ml-1 text-white">What did you find?</label>
                            <input 
                                type="text" 
                                value={lostReportData.item}
                                onChange={e => setLostReportData({...lostReportData, item: e.target.value})}
                                placeholder="e.g. Blue Nike Backpack"
                                className="input bg-white/5 border-white/10 text-white" 
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase opacity-40 ml-1 text-white">Description</label>
                            <textarea 
                                value={lostReportData.description}
                                onChange={e => setLostReportData({...lostReportData, description: e.target.value})}
                                placeholder="Details (e.g. Seat 12, contains a laptop)"
                                className="input min-h-[80px] bg-white/5 border-white/10 text-white" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {['electronics', 'bags', 'wallet', 'clothing', 'other'].map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setLostReportData({...lostReportData, category: cat})}
                                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${lostReportData.category === cat ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' : 'bg-white/5 border-white/10 text-white/40'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleLostFoundReport}
                        disabled={isLoading}
                        className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={16} /> : 'Sync with Registry'}
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Incident Report Modal (Feature 3) */}
      <AnimatePresence>
        {showIncidentModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2200] bg-black/80 backdrop-blur-md flex items-end justify-center p-4"
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
                        <button onClick={() => setShowIncidentModal(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {['Traffic Jam', 'Road Closure', 'Medical', 'Mechanical'].map(type => (
                            <button 
                                key={type}
                                onClick={() => setIncidentReport(type)}
                                className={`p-4 rounded-2xl border transition-all text-xs font-bold text-center ${incidentReport === type ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <textarea 
                        value={incidentReport}
                        onChange={e => setIncidentReport(e.target.value)}
                        placeholder="Additional details..."
                        className="input min-h-[80px] bg-white/5 border-white/10"
                    />

                    <button 
                        onClick={() => {
                            if (!incidentReport.trim()) return toast.error('Please describe the situation');
                            toast.success('Incident reported to Control Center');
                            setShowIncidentModal(false);
                            setIncidentReport('');
                        }}
                        className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
                    >
                        Transmit Report
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Shift Summary Modal */}
      <AnimatePresence>
        {showShiftSummary && (
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }}
                    className="glass-heavy w-full max-w-[280px] rounded-[2.5rem] p-6 text-center space-y-4"
                >
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mx-auto">
                        <Check size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="text-xl font-display font-black text-white uppercase italic tracking-tight">Trip Summary</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-[8px] font-black text-white/40 uppercase">Distance</p>
                            <p className="text-lg font-display font-black text-white">{shiftData.distance}km</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                            <p className="text-[8px] font-black text-white/40 uppercase">Duration</p>
                            <p className="text-lg font-display font-black text-white">{shiftData.time}m</p>
                        </div>
                    </div>
                    <div className="py-3 px-4 rounded-xl bg-brand font-black text-white shadow-lg shadow-brand/20">
                        <div className="flex items-center justify-center gap-2">
                             <Zap size={12} fill="currentColor" />
                             <span className="text-[10px] tracking-widest uppercase">{shiftData.rating} Performance</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowShiftSummary(false)}
                        className="w-full py-3 rounded-xl bg-white text-zinc-950 font-black uppercase text-[10px] tracking-widest"
                    >
                        Dismiss
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Request Leave Modal */}
      <AnimatePresence>
        {showLeaveModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2400] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            >
                <motion.div 
                    initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                    className="glass-heavy w-full max-w-sm rounded-[2.5rem] p-6 space-y-6"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="font-display font-black text-xl uppercase tracking-tight">Request Leave</h3>
                        <button onClick={() => setShowLeaveModal(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-40 ml-1">Start Date</label>
                                <input 
                                    type="date" 
                                    className="input mt-1" 
                                    value={leaveDates.start}
                                    onChange={e => setLeaveDates({...leaveDates, start: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase opacity-40 ml-1">End Date</label>
                                <input 
                                    type="date" 
                                    className="input mt-1"
                                    value={leaveDates.end}
                                    onChange={e => setLeaveDates({...leaveDates, end: e.target.value})}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-40 ml-1">Reason</label>
                            <textarea 
                                className="input mt-1 min-h-[80px]" 
                                placeholder="State reason (e.g. Medical, Family...)"
                                value={leaveDates.reason}
                                onChange={e => setLeaveDates({...leaveDates, reason: e.target.value})}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={() => {
                            if (!leaveDates.start || !leaveDates.end || !leaveDates.reason) return toast.error('Fill all fields');
                            toast.success('Leave request submitted to HR');
                            setShowLeaveModal(false);
                            setLeaveDates({ start: '', end: '', reason: '' });
                        }}
                        className="w-full py-4 bg-brand text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
                    >
                        Submit Request
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2500] bg-red-950/90 backdrop-blur-xl flex items-center justify-center p-6"
            >
                <div className="text-center space-y-8 max-w-sm">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 mx-auto animate-pulse">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-display font-black text-white uppercase italic tracking-tighter">Permanent Deletion</h2>
                        <p className="text-white/60 text-sm">All trip logs, verification documents, and earnings history will be erased. This action is irreversible.</p>
                    </div>
                    <div className="space-y-3">
                        <button 
                            onClick={async () => {
                                setIsLoading(true);
                                try {
                                    await api.delete('/user/account');
                                    toast.success('Account deleted successfully');
                                    logout();
                                    navigate('/register');
                                } catch (err) {
                                    toast.error('Deletion failed. Contact support.');
                                } finally { setIsLoading(false); }
                            }}
                            className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95"
                        >
                            Confirm Deletion
                        </button>
                        <button 
                            onClick={() => setShowDeleteConfirm(false)}
                            className="w-full py-5 bg-white/10 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      <nav className="md:hidden flex-shrink-0 flex items-center justify-around py-3 z-30"
        style={{ background: 'var(--glass-3)', borderTop: '1px solid var(--border-1)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => setActiveTab('drive')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'drive' ? 'text-brand scale-110' : 'text-text-4 opacity-50'}`}
            style={{ color: activeTab === 'drive' ? 'var(--brand)' : 'var(--text-4)' }}>
          <MapIcon size={20} className={activeTab === 'drive' ? 'fill-current' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Drive & Map</span>
        </button>
        <button onClick={() => setActiveTab('cargo')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'cargo' ? 'text-brand scale-110' : 'text-text-4 opacity-50'}`}
            style={{ color: activeTab === 'cargo' ? 'var(--brand)' : 'var(--text-4)' }}>
          <ListChecks size={20} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Utility</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-brand scale-110' : 'text-text-4 opacity-50'}`}
            style={{ color: activeTab === 'profile' ? 'var(--brand)' : 'var(--text-4)' }}>
          <Settings size={20} className={activeTab === 'profile' ? 'fill-current' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default DriverPage;
