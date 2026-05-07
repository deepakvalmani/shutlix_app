import { Response, NextFunction } from 'express';
import { Trip, Booking, Rating } from '../../models/index';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../types/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const orgId = req.user?.organizationId;
        const now = new Date();
        const startOfDay = new Date(now.setHours(0,0,0,0));

        const [tripsCount, bookingsCount, avgRating] = await Promise.all([
            Trip.countDocuments({ organizationId: orgId, startTime: { $gte: startOfDay } }),
            Booking.countDocuments({ organizationId: orgId, date: { $gte: startOfDay } }),
            Rating.aggregate([
                { $match: { organizationId: orgId } },
                { $group: { _id: null, avg: { $avg: '$rating' } } }
            ])
        ]);

        return ApiResponse.success(res, {
            todayTrips: tripsCount,
            todayBookings: bookingsCount,
            averageRating: avgRating[0]?.avg || 0,
            activeUsers: 42 // Mock or get from Redis if tracking online
        });
    } catch (err) { next(err); }
};

export const getFleetUtilization = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Analytics logic for fleet usage
        return ApiResponse.success(res, [
            { day: 'Mon', value: 85 },
            { day: 'Tue', value: 92 },
            { day: 'Wed', value: 88 },
            { day: 'Thu', value: 95 },
            { day: 'Fri', value: 78 },
        ]);
    } catch (err) { next(err); }
};
