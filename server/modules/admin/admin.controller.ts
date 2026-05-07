import { Response, NextFunction } from 'express';
import { Shuttle, Trip, Rating, Booking, Schedule, Geofence, User, Organization, AuditLog } from '../../models/index';
import { Route, Stop } from '../../models/Route';
import { ApiResponse } from '../../utils/apiResponse';
import mongoose from 'mongoose';

export const getAuditLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    const logs = await AuditLog.find({ organizationId: req.user.organizationId })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip));
    return ApiResponse.success(res, logs);
  } catch (err) { next(err); }
};

export const getDashboardSummary = async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.organizationId;
    const [shuttleCount, driverCount, studentCount, activeTrips] = await Promise.all([
      Shuttle.countDocuments({ organizationId: orgId }),
      User.countDocuments({ organizationId: orgId, role: 'driver' }),
      User.countDocuments({ organizationId: orgId, role: 'student' }),
      Trip.countDocuments({ organizationId: orgId, status: 'active' })
    ]);

    return ApiResponse.success(res, {
      shuttles: shuttleCount,
      drivers: driverCount,
      students: studentCount,
      activeTrips,
      alerts: 0
    });
  } catch (err) { next(err); }
};

export const getAnalytics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user.organizationId;
    
    // Aggregation for ridership by day for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);

    const ridership = await Booking.aggregate([
      { 
        $match: { 
          organizationId: new mongoose.Types.ObjectId(orgId),
          scheduledTime: { $gte: sevenDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledTime" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } }
    ]);

    return ApiResponse.success(res, { ridership });
  } catch (err) { next(err); }
};

export const createShuttle = async (req: any, res: Response, next: NextFunction) => {
  try {
    const shuttle = await Shuttle.create({ ...req.body, organizationId: req.user.organizationId });
    return ApiResponse.success(res, shuttle, 'Shuttle created', 201);
  } catch (err) { next(err); }
};

export const updateShuttle = async (req: any, res: Response, next: NextFunction) => {
  try {
    const shuttle = await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    if (!shuttle) return ApiResponse.error(res, 'Shuttle not found', 404);
    return ApiResponse.success(res, shuttle);
  } catch (err) { next(err); }
};

export const getShuttles = async (req: any, res: Response, next: NextFunction) => {
  try {
    const shuttles = await Shuttle.find({ organizationId: req.user.organizationId });
    return ApiResponse.success(res, shuttles);
  } catch (err) { next(err); }
};

export const getDrivers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const drivers = await User.find({ organizationId: req.user.organizationId, role: 'driver' })
      .populate('assignedRouteId assignedShuttleId');
    return ApiResponse.success(res, drivers);
  } catch (err) { next(err); }
};

export const getStudents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const students = await User.find({ organizationId: req.user.organizationId, role: 'student' });
    return ApiResponse.success(res, students);
  } catch (err) { next(err); }
};

export const getOrganisation = async (req: any, res: Response, next: NextFunction) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    return ApiResponse.success(res, org);
  } catch (err) { next(err); }
};

export const getSchedules = async (req: any, res: Response, next: NextFunction) => {
  try {
    const schedules = await Schedule.find({ organizationId: req.user.organizationId })
      .populate('routeId shuttleId');
    return ApiResponse.success(res, schedules);
  } catch (err) { next(err); }
};

export const broadcast = async (req: any, res: Response, next: NextFunction) => {
  try {
    // Logic to store broadcast if needed, otherwise just return success 
    // as socket handles the real-time part
    return ApiResponse.success(res, null, 'Broadcast sent');
  } catch (err) { next(err); }
};

export const getStops = async (req: any, res: Response, next: NextFunction) => {
  try {
    const stops = await Stop.find({ organizationId: req.user.organizationId });
    return ApiResponse.success(res, stops);
  } catch (err) { next(err); }
};

export const createStop = async (req: any, res: Response, next: NextFunction) => {
  try {
    const stop = await Stop.create({ ...req.body, organizationId: req.user.organizationId });
    return ApiResponse.success(res, stop, 'Stop created', 201);
  } catch (err) { next(err); }
};

export const updateStop = async (req: any, res: Response, next: NextFunction) => {
  try {
    const stop = await Stop.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    return ApiResponse.success(res, stop);
  } catch (err) { next(err); }
};

export const getRoutes = async (req: any, res: Response, next: NextFunction) => {
  try {
    const routes = await Route.find({ organizationId: req.user.organizationId }).populate('stops.stopId');
    return ApiResponse.success(res, routes);
  } catch (err) { next(err); }
};

export const createRoute = async (req: any, res: Response, next: NextFunction) => {
  try {
    const route = await Route.create({ ...req.body, organizationId: req.user.organizationId });
    return ApiResponse.success(res, route, 'Route created', 201);
  } catch (err) { next(err); }
};

export const updateRoute = async (req: any, res: Response, next: NextFunction) => {
  try {
    const route = await Route.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    return ApiResponse.success(res, route);
  } catch (err) { next(err); }
};

export const assignDriver = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { routeId, shuttleId } = req.body;
    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId, role: 'driver' },
      { assignedRouteId: routeId, assignedShuttleId: shuttleId },
      { new: true }
    );
    if (!driver) return ApiResponse.error(res, 'Driver not found', 404);
    return ApiResponse.success(res, driver, 'Driver assigned');
  } catch (err) { next(err); }
};
