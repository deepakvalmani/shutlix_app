import { Response, NextFunction } from 'express';
import { Route, Stop } from '../../models/Route';
import { Shuttle, Schedule } from '../../models/index';
import * as redis from '../../config/redis';
import { ApiResponse } from '../../utils/apiResponse';

export const getLiveShuttles = async (req: any, res: Response, next: NextFunction) => {
  try {
    const positions = await redis.getAllPositions();
    const orgPositions = positions.filter((p: any) => p.organizationId?.toString() === req.user.organizationId?.toString());
    return ApiResponse.success(res, orgPositions);
  } catch (err) { next(err); }
};

export const getRoutes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const routes = await Route.find({ 
      organizationId: req.user.organizationId, 
      isActive: true 
    }).populate('stops.stopId').sort({ name: 1 }).lean();
    return ApiResponse.success(res, routes);
  } catch (err) { next(err); }
};

export const getStops = async (req: any, res: Response, next: NextFunction) => {
  try {
    const stops = await Stop.find({ 
      organizationId: req.user.organizationId, 
      isActive: true 
    }).sort({ name: 1 }).lean();
    return ApiResponse.success(res, stops);
  } catch (err) { next(err); }
};

export const getSchedules = async (req: any, res: Response, next: NextFunction) => {
  try {
    const schedules = await Schedule.find({ 
      organizationId: req.user.organizationId, 
      isActive: true 
    })
      .populate('routeId', 'name shortCode color')
      .populate({
        path: 'shuttleId',
        populate: { path: 'currentDriverId', select: 'name avatar phone' }
      }).lean();
    return ApiResponse.success(res, schedules);
  } catch (err) { next(err); }
};
