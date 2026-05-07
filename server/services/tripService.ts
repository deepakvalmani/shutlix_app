import { Trip, Shuttle, User } from '../models/index';
import { getIO } from '../config/socket';

export class TripService {
  static async startTrip({ orgId, driverId, shuttleId, routeId }: any) {
    const existing = await Trip.findOne({ driverId, status: 'active' });
    if (existing) throw new Error('Trip already active');

    // Scoped shuttle check
    const shuttle = await Shuttle.findOneAndUpdate(
        { _id: shuttleId, organizationId: orgId },
        { isOnline: true, status: 'active' },
        { new: true }
    );
    if (!shuttle) throw new Error('Shuttle not found or access denied');

    const trip = await Trip.create({
      organizationId: orgId,
      shuttleId,
      routeId: routeId || null,
      driverId,
      status: 'active',
    });

    await User.findOneAndUpdate({ _id: driverId }, { isOnDuty: true });

    return trip;
  }

  static async endTrip({ orgId, driverId, tripId, shuttleId }: any) {
    const trip = await Trip.findOneAndUpdate(
      { _id: tripId, driverId, organizationId: orgId, status: 'active' },
      { status: 'completed', endTime: new Date() },
      { new: true }
    );
    if (!trip) throw new Error('Trip not found or already ended');

    await User.findOneAndUpdate({ _id: driverId }, { isOnDuty: false });
    
    if (shuttleId) {
        await Shuttle.findOneAndUpdate(
            { _id: shuttleId, organizationId: orgId }, 
            { isOnline: false, status: 'idle' }
        );
    }

    return trip;
  }
}
