import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface UseLeafletMapProps {
  mapRef: React.RefObject<HTMLDivElement | null>;
  center: { lat: number; lng: number };
  zoom: number;
  liveShuttles?: Record<string, any>;
  stops?: any[];
  routes?: any[];
  visibleRouteIds?: string[];
  onShuttleClick?: (shuttle: any) => void;
  onStopClick?: (stop: any) => void;
  onMapClick?: (lat: number, lng: number) => void;
  userLocation?: [number, number] | null;
  userRole?: string;
  userHeading?: number;
  followMode?: boolean | string; // true (user) | string (shuttleId)
}

const TILE_LAYERS: Record<string, string> = {
  cartoDark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  cartoLight: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  cartoVoyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  esriSatellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  labels: 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
};

const getSegmentHeading = (p1: [number, number], p2: [number, number]) => {
  const lat1 = p1[0] * Math.PI / 180;
  const lon1 = p1[1] * Math.PI / 180;
  const lat2 = p2[0] * Math.PI / 180;
  const lon2 = p2[1] * Math.PI / 180;
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};

const useLeafletMap = ({
  mapRef,
  center,
  zoom,
  liveShuttles = {},
  stops = [],
  routes = [],
  visibleRouteIds = [],
  onShuttleClick,
  onStopClick,
  onMapClick,
  userLocation = null,
  userRole = 'student',
  userHeading = 0,
  followMode = false
}: UseLeafletMapProps) => {
  const [mapInstance, setMapInstance] = React.useState<L.Map | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const shuttleMarkers = useRef<Record<string, L.Marker>>({});
  const stopMarkers = useRef<Record<string, L.Marker>>({});
  const routePaths = useRef<Record<string, L.Polyline>>({});
  const pickMarker = useRef<L.Marker | null>(null);
  const userMarker = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const currentTileStyle = useRef<string>('esriSatellite');

  const setTileLayer = useCallback((style: string) => {
      if (mapInstanceRef.current && TILE_LAYERS[style]) {
          currentTileStyle.current = style;
          if (tileLayerRef.current) {
              tileLayerRef.current.setUrl(TILE_LAYERS[style]);
          }

          // Toggle labels for satellite mode
          if (style === 'esriSatellite') {
              if (!labelsLayerRef.current) {
                  labelsLayerRef.current = L.tileLayer(TILE_LAYERS.labels, { zIndex: 1000 }).addTo(mapInstanceRef.current);
              }
          } else {
              if (labelsLayerRef.current) {
                  labelsLayerRef.current.remove();
                  labelsLayerRef.current = null;
              }
          }
      }
  }, []);

  // ─── THEME SYNC ──────────────────────────────────────────
  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (currentTileStyle.current !== 'esriSatellite') {
        setTileLayer(isDark ? 'cartoDark' : 'cartoVoyager');
      }
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [setTileLayer]);

  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false,
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    currentTileStyle.current = 'esriSatellite';
    tileLayerRef.current = L.tileLayer(TILE_LAYERS[currentTileStyle.current], {
      attribution: '&copy; Esri &copy; OpenStreetMap',
    }).addTo(map);

    // Add labels for satellite mode
    if (!labelsLayerRef.current) {
        labelsLayerRef.current = L.tileLayer(TILE_LAYERS.labels, { zIndex: 1000 }).addTo(map);
    }

    mapInstanceRef.current = map;
    setMapInstance(map);

    // Ensure map is correctly sized even if initialized in hidden tab or during animation
    setTimeout(() => {
      map.invalidateSize();
    }, 400);

  }, [center, zoom, mapRef, onMapClick]);

  useEffect(() => {
    // Standard initial attempt
    initMap();

    // Re-check for container mounting (handling AnimatePresence/motion delays)
    let retries = 0;
    const interval = setInterval(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        initMap();
        if (mapInstanceRef.current) clearInterval(interval);
      }
      retries++;
      if (retries >= 10) clearInterval(interval);
    }, 100);

    return () => {
      clearInterval(interval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapInstance(null);
      }
    };
  }, [initMap, mapRef]);

  // ─── USER LOCATION ──────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    const isDriver = userRole === 'driver';
    
    let iconHtml = `<div class="user-pulse"></div>`;
    let iconSize: [number, number] = [20, 20];
    let iconAnchor: [number, number] = [10, 10];

    if (isDriver) {
        iconSize = [44, 44];
        iconAnchor = [22, 22];
        iconHtml = `
            <div class="shuttle-marker-container">
            <div class="shuttle-marker-glow" style="background: #3B82F6AA"></div>
            <div class="shuttle-marker-icon shadow-xl" style="background:#3B82F6; border-radius: 50%; width: 40px; height: 40px; border: 2px solid white; display: flex; align-items: center; justify-content: center; transform: rotate(${userHeading}deg);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
            </div>
            <div class="shuttle-pulse active" style="width: 44px; height: 44px;"></div>
            </div>
        `;
    }

    const icon = L.divIcon({
      className: '',
      html: iconHtml,
      iconSize,
      iconAnchor
    });

    // Add CSS for smooth transitions if not present
    if (!document.getElementById('map-marker-transitions')) {
        const style = document.createElement('style');
        style.id = 'map-marker-transitions';
        style.innerHTML = `
            .leaflet-marker-icon { transition: opacity 0.3s ease; }
            .shuttle-marker-container { transition: opacity 0.3s ease; position: relative; }
            .user-pulse { transition: opacity 0.3s ease; }
            .shuttle-status-indicator {
                transition: background-color 0.3s ease;
                box-shadow: 0 0 5px rgba(0,0,0,0.3);
            }
            .shuttle-marker-container.shuttle-maintenance .shuttle-marker-icon {
                border-color: #f59e0b;
            }
            .shuttle-offline .shuttle-marker-icon {
                filter: grayscale(1) opacity(0.6);
            }
        `;
        document.head.appendChild(style);
    }

    // Add animation styles for routes
    if (!document.getElementById('map-route-animations')) {
        const style = document.createElement('style');
        style.id = 'map-route-animations';
        style.innerHTML = `
            @keyframes dashArray {
                from { stroke-dashoffset: 40; }
                to { stroke-dashoffset: 0; }
            }
            @keyframes arrowFlow {
                0% { opacity: 0.4; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.1); }
                100% { opacity: 0.4; transform: scale(0.8); }
            }
            .route-path-animated {
                stroke-dasharray: 12, 12;
                animation: dashArray 1.5s linear infinite;
            }
            .route-arrow-container {
                animation: arrowFlow 2s ease-in-out infinite;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .stop-marker {
                width: 12px;
                height: 12px;
                background: white;
                border: 3px solid var(--brand);
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(0,0,0,0.3), 0 0 0 4px rgba(255,255,255,0.2);
                transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .stop-marker:hover {
                transform: scale(1.4);
                background: var(--brand);
                border-color: white;
                z-index: 500;
            }
            .pick-marker-tooltip {
                background: var(--brand);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 11px;
                padding: 4px 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .pick-marker-tooltip::before {
                border-top-color: var(--brand) !important;
            }
        `;
        document.head.appendChild(style);
    }

    if (userMarker.current) {
      userMarker.current.setLatLng(userLocation);
      userMarker.current.setIcon(icon);
      
      // Responsive Follow Mode (User)
      if (followMode === true && mapInstanceRef.current) {
          mapInstanceRef.current.panTo(userLocation, { animate: true, duration: 1 });
      }
    } else {
      userMarker.current = L.marker(userLocation, { icon, zIndexOffset: 2000 }).addTo(mapInstanceRef.current);
    }
  }, [userLocation, userRole, userHeading, followMode]);

  // ─── STOPS & ROUTES ─────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear old routes
    Object.values(routePaths.current).forEach(p => (p as L.Polyline).remove());
    routePaths.current = {};

    // Draw active routes
    routes.forEach(route => {
        // If visibleRouteIds is provided (even if empty), we only show what's in it.
        // If it's undefined, we show all (fallback).
        const isVisible = visibleRouteIds === undefined || visibleRouteIds.includes(route._id);
        if (!isVisible) return;

        let coords: L.LatLngExpression[] = [];
        
        // Use persisted road path if available, else fall back to straight lines between stops
        if (route.path && route.path.length > 0) {
            coords = route.path.map((p: any) => {
                // Handle different path formats: [lat, lng], {lat, lng}, or [lng, lat] (if it came raw from OSRM)
                let lat, lng;
                if (Array.isArray(p)) {
                   lat = p[0];
                   lng = p[1];
                } else if (p.lat !== undefined) {
                   lat = p.lat;
                   lng = p.lng;
                }
                return [parseFloat(lat), parseFloat(lng)] as L.LatLngExpression;
            }).filter((c: any) => !isNaN(c[0] as number) && !isNaN(c[1] as number));
        } else {
            const stopIds = (route.stops || []).map((s: any) => (s.stopId?._id || s.stopId || s._id || s));
            coords = stopIds
                .map((id: string) => {
                    if (!id) return null;
                    const stId = typeof id === 'object' ? (id as any)._id : id;
                    const st = stops.find(st => st._id === stId || st._id === id);
                    if (!st) return null;
                    return [parseFloat(st.lat), parseFloat(st.lng)] as L.LatLngExpression;
                })
                .filter(Boolean) as L.LatLngExpression[];
            
            // If it's a straight line fallback, we should still show something
            if (coords.length > 0) {
                console.log(`📍 Drawing straight-line fallback for route ${route.name} with ${coords.length} points`);
            }
        }
        
        if (coords.length >= 2) {
            const routeId = route._id || Math.random().toString();
            // Triple layer for ultra-visible glow route
            const shadowPoly = L.polyline(coords, {
                color: route.color || '#3B82F6',
                weight: 18,
                opacity: 0.1,
                lineJoin: 'round',
                smoothFactor: 2
            }).addTo(mapInstanceRef.current!);
            
            const outerPoly = L.polyline(coords, {
                color: route.color || '#3B82F6',
                weight: 10,
                opacity: 0.45,
                lineJoin: 'round',
                smoothFactor: 1.5
            }).addTo(mapInstanceRef.current!);

            const innerPoly = L.polyline(coords, {
                color: 'white',
                weight: 4,
                opacity: 1,
                lineJoin: 'round',
                smoothFactor: 1,
                className: isVisible ? 'route-path-animated' : ''
            }).addTo(mapInstanceRef.current!);

            // Add directional arrows that flow along the route for a "live" system feel
            const pathPoints = coords as [number, number][];
            const arrowInterval = Math.max(3, Math.floor(pathPoints.length / 8)); // increased density
            
            for (let i = 0; i < pathPoints.length - 1; i += arrowInterval) {
                const current = pathPoints[i];
                const next = pathPoints[i + 1];
                const segmentHeading = getSegmentHeading(current, next);

                const arrow = L.marker(current, {
                    icon: L.divIcon({
                        className: 'route-arrow-marker',
                        html: `<div class="route-arrow-container" style="transform: rotate(${segmentHeading}deg); color: ${route.color || '#3B82F6'};">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L2 22l10-4 10 4z" />
                                    </svg>
                               </div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    }),
                    zIndexOffset: 1200
                }).addTo(mapInstanceRef.current!);
                routePaths.current[`${routeId}-arrow-${i}`] = arrow as any;
            }
            
            routePaths.current[`${routeId}-shadow`] = shadowPoly;
            routePaths.current[`${routeId}-outer`] = outerPoly;
            routePaths.current[routeId] = innerPoly;

            // Auto-fit bounds if we just activated a single specific route (typical for driver)
            if (visibleRouteIds && visibleRouteIds.length === 1 && mapInstanceRef.current) {
                try {
                    const bounds = innerPoly.getBounds();
                    if (bounds.isValid()) {
                        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                    }
                } catch (e) {
                    console.warn("Failed to fit bounds:", e);
                }
            }
        }
    });

    // Draw stops
    const currentStopIds = new Set(stops.map(s => s._id));
    Object.keys(stopMarkers.current).forEach(id => {
      if (!currentStopIds.has(id)) {
        stopMarkers.current[id].remove();
        delete stopMarkers.current[id];
      }
    });

    stops.forEach((stop, index) => {
      if (stopMarkers.current[stop._id]) return;
      
      const isDriver = userRole === 'driver';
      const stopHtml = isDriver 
        ? `<div class="stop-marker-driver flex items-center justify-center font-black text-[10px] text-white bg-brand rounded-full border-2 border-white shadow-lg" style="width: 24px; height: 24px;">${index + 1}</div>`
        : `<div class="stop-marker"></div>`;

      const marker = L.marker([stop.lat, stop.lng], { 
        icon: L.divIcon({
            className: '',
            html: stopHtml,
            iconSize: isDriver ? [24, 24] : [16, 16],
            iconAnchor: isDriver ? [12, 12] : [8, 8]
        })
      })
        .addTo(mapInstanceRef.current!)
        .on('click', () => onStopClick?.(stop));
      
      marker.bindPopup(`<b>Stop ${index + 1}: ${stop.name}</b>`);
      stopMarkers.current[stop._id] = marker;
    });
  }, [stops, routes, onStopClick, visibleRouteIds]);

  // ─── LIVE SHUTTLES ──────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const currentIds = new Set(Object.keys(liveShuttles));

    Object.keys(shuttleMarkers.current).forEach(id => {
      if (!currentIds.has(id)) {
        shuttleMarkers.current[id].remove();
        delete shuttleMarkers.current[id];
      }
    });

    Object.entries(liveShuttles).forEach(([id, shuttle]) => {
      const route = routes.find(r => r._id === shuttle.routeId);
      const color = route?.color || '#3B82F6';
      const label = route?.shortCode || 'S';
      
      // Determine status-based styling
      // If shuttle.isOnline is false, it's offline.
      // Otherwise, we use shuttle.status (active, idle, maintenance)
      const isOffline = shuttle.isOnline === false;
      const status = isOffline ? 'offline' : (shuttle.status || 'idle');
      
      let markerColor = color;
      let markerIcon = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        </svg>
      `;
      let innerGlow = `${color}44`;
      let showPulse = true;
      let opacity = 1;

      if (status === 'offline') {
        markerColor = '#94a3b8'; // Slate 400
        innerGlow = 'transparent';
        showPulse = false;
        opacity = 0.7;
      } else if (status === 'maintenance') {
        markerColor = '#f59e0b'; // Amber 500
        markerIcon = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>
          </svg>
        `;
        innerGlow = '#f59e0b44';
        showPulse = false;
      } else if (status === 'idle') {
        markerColor = '#64748b'; // Slate 500
        innerGlow = '#64748b22';
        showPulse = false;
      } 
      // 'active' uses default color and pulse

      const iconHtml = `
        <div class="shuttle-marker-container shuttle-${status}" style="opacity: ${opacity};">
          <div class="shuttle-marker-glow" style="background: ${innerGlow}"></div>
          <div class="shuttle-marker-icon shadow-lg" style="background:${markerColor}; border-radius: 50%; width: 36px; height: 36px; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; transform: rotate(${shuttle.heading || 0}deg);">
              ${markerIcon}
          </div>
          <div class="shuttle-label-badge" style="background: ${markerColor}; border: 1.5px solid white; padding: 1px 6px;">${label}</div>
          ${showPulse ? '<div class="shuttle-pulse"></div>' : ''}
          <div class="shuttle-status-indicator" style="background: ${markerColor}; position: absolute; bottom: -4px; right: -4px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: '',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (shuttleMarkers.current[id]) {
        shuttleMarkers.current[id].setLatLng([shuttle.lat, shuttle.lng]);
        shuttleMarkers.current[id].setIcon(icon);

        // Responsive Follow Mode (Shuttle)
        if (followMode === id && mapInstanceRef.current) {
            mapInstanceRef.current.panTo([shuttle.lat, shuttle.lng], { animate: true, duration: 1 });
        }
      } else {
        const marker = L.marker([shuttle.lat, shuttle.lng], { icon, zIndexOffset: 1500 })
          .addTo(mapInstanceRef.current!)
          .on('click', () => onShuttleClick?.(shuttle));
        shuttleMarkers.current[id] = marker;
      }
    });
  }, [liveShuttles, routes, onShuttleClick]);

  const panToShuttle = useCallback((shuttle: any) => {
    if (mapInstanceRef.current && shuttle.lat) {
        mapInstanceRef.current.setView([shuttle.lat, shuttle.lng], 17, { animate: true, duration: 1 });
    }
  }, []);

  const panToLocation = useCallback((lat: number, lng: number, zoomValue?: number) => {
      if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], zoomValue || mapInstanceRef.current.getZoom(), { animate: true });
      }
  }, []);

  const fitAllShuttles = useCallback(() => {
      const markers = Object.values(shuttleMarkers.current);
      if (markers.length > 0 && mapInstanceRef.current) {
          const group = L.featureGroup(markers as L.Layer[]);
          mapInstanceRef.current.fitBounds(group.getBounds().pad(0.3), { animate: true });
      }
  }, []);

  const toggleFullscreen = useCallback(() => {
      if (!mapRef.current) return;
      if (document.fullscreenElement) {
          document.exitFullscreen();
      } else {
          mapRef.current.requestFullscreen();
      }
  }, [mapRef]);

  const searchPlace = useCallback(async (query: string) => {
    if (!query) return;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
        const data = await res.json();
        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            panToLocation(parseFloat(lat), parseFloat(lon), 16);
            return { lat: parseFloat(lat), lng: parseFloat(lon), name: data[0].display_name };
        }
    } catch (err) {
        console.error("Search failed:", err);
    }
    return null;
  }, [panToLocation]);

  const getRoadRoute = useCallback(async (points: {lat: number, lng: number}[]) => {
      if (points.length < 2) return null;
      try {
          // OSRM expects [lng,lat]. Using 'full' overview and GeoJSON for maximum road accuracy.
          const coordsString = points.map(p => `${p.lng},${p.lat}`).join(';');
          const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&continue_straight=true&steps=false`;
          
          const res = await fetch(url);
          if (!res.ok) throw new Error(`OSRM HTTP error: ${res.status}`);
          
          const data = await res.json();
          if (data && data.code === 'Ok' && data.routes?.length > 0) {
              const roadCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]); // [lat, lng]
              console.log(`Successfully fetched road route with ${roadCoords.length} path points.`);
              return roadCoords;
          } else {
              console.warn("OSRM returned non-OK code:", data?.code);
          }
      } catch (err) {
          console.error("Road routing failed:", err);
      }
      return null;
  }, []);

  const updatePickMarker = useCallback((lat: number, lng: number, label?: string) => {
      if (!mapInstanceRef.current) return;
      if (pickMarker.current) {
          pickMarker.current.setLatLng([lat, lng]);
      } else {
          const icon = L.divIcon({
              className: '',
              html: `<div class="w-8 h-8 bg-brand rounded-full border-4 border-white shadow-xl animate-bounce flex items-center justify-center">
                       <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
          });
          pickMarker.current = L.marker([lat, lng], { 
              icon, 
              zIndexOffset: 2000,
              draggable: true
          }).addTo(mapInstanceRef.current);

          pickMarker.current.on('dragend', (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              if (onMapClick) onMapClick(position.lat, position.lng);
          });
      }

      if (label) {
          pickMarker.current.bindTooltip(label, { 
              permanent: true, 
              direction: 'top', 
              offset: [0, -20],
              className: 'pick-marker-tooltip'
          }).openTooltip();
      } else {
          pickMarker.current.unbindTooltip();
      }

      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom());
  }, [onMapClick]);

  const clearPickMarker = useCallback(() => {
      if (pickMarker.current) {
          pickMarker.current.remove();
          pickMarker.current = null;
      }
  }, []);

  const centerOnUser = useCallback(() => {
      if (userLocation && mapInstanceRef.current) {
          mapInstanceRef.current.setView(userLocation, 16);
      }
  }, [userLocation]);

  return { 
      mapInstance, 
      panToShuttle, 
      panToLocation, 
      fitAllShuttles, 
      toggleFullscreen,
      setTileLayer,
      searchPlace,
      getRoadRoute,
      updatePickMarker,
      clearPickMarker,
      centerOnUser
  };
};

export default useLeafletMap;
