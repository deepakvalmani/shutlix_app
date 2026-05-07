import { useEffect, useCallback, useMemo, useState } from 'react';
import { getSocket } from '../services/socket';
import useAuthStore from '../store/authStore';
import useShuttleStore from '../store/shuttleStore';
import toast from 'react-hot-toast';

export { getSocket } from '../services/socket';

const useSocket = () => {
  const { user } = useAuthStore();
  const { updateLiveShuttle } = useShuttleStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const joinOrganization = useCallback(() => {
    const socket = getSocket();
    if (user?.organizationId) {
      socket.emit('join:organization', { organizationId: user.organizationId });
    }
  }, [user]);

  const emitLocation = useCallback((data: any) => {
    getSocket().emit('driver:location', data);
  }, []);

  const emitPassengerCount = useCallback((shuttleId: string, count: number) => {
    getSocket().emit('shuttle:passengers', { shuttleId, count });
  }, []);

  const emitDelay = useCallback((shuttleId: string, routeId: string, minutes: number, message: string) => {
    getSocket().emit('shuttle:delay', { shuttleId, routeId, minutes, message });
  }, []);

  const emitEmergency = useCallback((shuttleId: string, lat?: number, lng?: number) => {
    getSocket().emit('shuttle:emergency', { shuttleId, lat, lng });
  }, []);

  const emitStartTrip = useCallback((tripId: string, shuttleId: string, routeId: string) => {
    getSocket().emit('driver:startTrip', { tripId, shuttleId, routeId });
  }, []);

  const emitEndTrip = useCallback((shuttleId: string, tripId: string) => {
    getSocket().emit('driver:endTrip', { shuttleId, tripId });
  }, []);

  const emitAdminBroadcast = useCallback((organizationId: string, message: string, type: string) => {
    getSocket().emit('admin:broadcast', { organizationId, message, type });
  }, []);

  const emitGeofenceCheck = useCallback((lat: number, lng: number, shuttleId: string) => {
    getSocket().emit('geofence:check', { lat, lng, shuttleId });
  }, []);

  const emitMessage = useCallback((organizationId: string, content: string, conversationId?: string) => {
    getSocket().emit('message:send', { organizationId, content, conversationId });
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    getSocket().emit('chat:join', { conversationId });
  }, []);

  useEffect(() => {
    const socket = getSocket();
    
    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      joinOrganization();
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setIsReconnecting(true);
    };

    const onConnectError = () => {
      setIsConnected(false);
      setIsReconnecting(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    
    // Set initial state
    setIsConnected(socket.connected);

    socket.on('shuttle:position', (data) => {
      updateLiveShuttle(data);
    });

    socket.on('shuttle:allPositions', (shuttles: any[]) => {
      shuttles.forEach(s => updateLiveShuttle(s));
    });

    socket.on('shuttle:offline', ({ shuttleId }: { shuttleId: string }) => {
      useShuttleStore.getState().removeLiveShuttle?.(shuttleId);
    });

    socket.on('shuttle:delay', ({ shuttleId, message, minutes }: any) => {
      toast.error(`Delay Alert: Shuttle ${shuttleId} is ${minutes} mins late. ${message}`, { duration: 5000 });
    });

    socket.on('shuttle:emergency', ({ shuttleId }: any) => {
      toast.error(`🚨 EMERGENCY: Shuttle ${shuttleId} has reported an incident!`, { duration: 10000 });
    });

    socket.on('geofence:enter', ({ stopName, shuttleId }: any) => {
      toast(`Bus ${shuttleId} has arrived at ${stopName}`, { icon: '🚌' });
    });

    socket.on('admin:announcement', ({ message, type }: any) => {
        if (type === 'danger') {
            toast.error(message, { duration: 6000 });
        } else if (type === 'success') {
            toast.success(message, { duration: 6000 });
        } else {
            toast(message, { duration: 6000 });
        }
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('shuttle:position');
      socket.off('shuttle:allPositions');
      socket.off('shuttle:offline');
      socket.off('shuttle:delay');
      socket.off('shuttle:emergency');
      socket.off('geofence:enter');
      socket.off('admin:announcement');
    };
  }, [updateLiveShuttle]);

  return useMemo(() => ({
    isConnected,
    isReconnecting,
    joinOrganization,
    emitLocation,
    emitPassengerCount,
    emitDelay,
    emitEmergency,
    emitStartTrip,
    emitEndTrip,
    emitAdminBroadcast,
    emitGeofenceCheck,
    emitMessage,
    joinConversation,
  }), [
    isConnected,
    isReconnecting,
    joinOrganization,
    emitLocation,
    emitPassengerCount,
    emitDelay,
    emitEmergency,
    emitStartTrip, 
    emitEndTrip, 
    emitAdminBroadcast,
    emitGeofenceCheck, 
    emitMessage, 
    joinConversation
  ]);
};

export default useSocket;
