import { Response, NextFunction } from 'express';
import { Trip, Shuttle } from '../../models/index';
import * as redis from '../../config/redis';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../types/auth';

export const getLiveTracking = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const orgId = req.user?.organizationId;
        const shuttles = await Shuttle.find({ organizationId: orgId, isActive: true })
            .populate('currentDriverId', 'name avatar');

        const liveData = await Promise.all(shuttles.map(async (shuttle) => {
            const pos = await redis.get(`shuttle:${shuttle._id}:pos`);
            const parsedPos = pos ? JSON.parse(pos) : null;
            
            return {
                _id: shuttle._id,
                name: shuttle.name,
                plateNumber: shuttle.plateNumber,
                status: shuttle.status,
                driver: shuttle.currentDriverId,
                location: parsedPos,
                lastSeen: parsedPos?.timestamp || null
            };
        }));

        return ApiResponse.success(res, liveData);
    } catch (err) { next(err); }
};

export const getTripHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { shuttleId, startDate, endDate } = req.query;
        const orgId = req.user?.organizationId;

        const query: any = { organizationId: orgId };
        if (shuttleId) query.shuttleId = shuttleId;
        if (startDate || endDate) {
            query.startTime = {};
            if (startDate) query.startTime.$gte = new Date(startDate as string);
            if (endDate) query.startTime.$lte = new Date(endDate as string);
        }

        const trips = await Trip.find(query)
            .populate('shuttleId', 'name plateNumber')
            .populate('driverId', 'name')
            .sort({ startTime: -1 })
            .limit(100);

        return ApiResponse.success(res, trips);
    } catch (err) { next(err); }
};
