import { EventEmitter } from 'events';
import { NotificationService } from './notificationService';

class SystemEvents extends EventEmitter {}
export const systemEvents = new SystemEvents();

// Listeners for system-wide events
systemEvents.on('trip:started', async (data) => {
    // e.g. Notify interested parties
});

systemEvents.on('trip:emergency', async (data) => {
    await NotificationService.sendSOS(data.orgId, {
        driverName: data.driverName,
        driverId: data.driverId,
        shuttleId: data.shuttleId,
        lat: data.lat,
        lng: data.lng,
        emergencyId: data.emergencyId
    });
});
