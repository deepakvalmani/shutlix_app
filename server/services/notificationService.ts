import { getIO } from '../config/socket';
import { broadcastToOrg, broadcastPushNotification } from '../utils/notifications';
import { User } from '../models/User';

export class NotificationService {
  static async sendAnnouncement(orgId: string, { message, type }: any) {
    try {
      getIO().to(`org:${orgId}`).emit('admin:announcement', {
        message, type, timestamp: Date.now(),
      });

      await broadcastToOrg(orgId, {
        title: `📢 Announcement: ${type.toUpperCase()}`,
        body: message,
        icon: '/icons/broadcast-icon.png',
        data: { url: '/', type: 'broadcast' }
      });
    } catch (err) {
      console.error('NotificationService.sendAnnouncement failed:', err);
    }
  }

  static async sendSOS(orgId: string, { driverName, driverId, shuttleId, lat, lng, emergencyId }: any) {
    try {
      const io = getIO();
      io.to(`org:${orgId}`).emit('shuttle:emergency', {
        emergencyId, shuttleId, lat, lng, timestamp: Date.now(), driverId
      });

      const admins = await User.find({ 
        organizationId: orgId, 
        role: { $in: ['admin', 'superadmin'] } 
      });
      const adminIds = admins.map(a => a._id.toString());
      
      await broadcastPushNotification(adminIds, {
        title: '❗ SOS EMERGENCY ALERT',
        body: `Emergency reported by driver ${driverName}. Click to view location.`,
        icon: '/icons/emergency-icon.png',
        data: { url: '/admin', type: 'emergency' }
      });
    } catch (err) {
      console.error('NotificationService.sendSOS failed:', err);
    }
  }
}
