import { Response, NextFunction } from 'express';
import { Booking, Trip, Shuttle } from '../../models/index';
import { sendPushNotification } from '../../utils/notifications';
import { ApiResponse } from '../../utils/apiResponse';

export const createBooking = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { routeId, scheduledTime, pickupStopId, dropoffStopId, shuttleId, tripId } = req.body;
        
        if (tripId) {
            const trip = await Trip.findOne({ _id: tripId, organizationId: req.user.organizationId });
            if (!trip) return ApiResponse.error(res, 'Invalid Trip', 400);
            if (trip.routeId?.toString() !== routeId) {
                return ApiResponse.error(res, 'Trip/Route mismatch', 400);
            }
        }

        const booking = await Booking.create({
            organizationId: req.user.organizationId,
            studentId: req.user._id,
            routeId,
            scheduledTime,
            pickupStopId,
            dropoffStopId,
            shuttleId,
            tripId,
            status: 'confirmed'
        });

        if (shuttleId) {
            const shuttle = await Shuttle.findOne({ _id: shuttleId, organizationId: req.user.organizationId });
            if (shuttle && shuttle.currentDriverId) {
                await sendPushNotification(shuttle.currentDriverId.toString(), {
                    title: '🎫 New Booking!',
                    body: `${req.user.name} just booked a seat.`,
                    data: { url: '/driver', type: 'booking' }
                });
            }
        }

        return ApiResponse.success(res, booking, 'Booking created', 201);
    } catch (err) { next(err); }
};

export const getMyBookings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const bookings = await Booking.find({ 
      studentId: req.user._id, 
      organizationId: req.user.organizationId 
    }).populate('routeId shuttleId pickupStopId dropoffStopId').sort({ scheduledTime: -1 }).lean();
    return ApiResponse.success(res, bookings);
  } catch (err) { next(err); }
};
