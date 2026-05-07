import { Request, Response } from 'express';
import { Trip, Shuttle, Route, User, Booking, Rating, Schedule, Stop } from '../../models/index';

export const getHistory = async (req: any, res: Response) => {
  try {
    const bookings = await Booking.find({ studentId: req.user._id })
      .populate('routeId')
      .populate('shuttleId')
      .populate('pickupStopId')
      .populate('dropoffStopId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: bookings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBookings = async (req: any, res: Response) => {
  try {
    const bookings = await Booking.find({ studentId: req.user._id, status: { $in: ['pending', 'confirmed'] } })
      .populate('routeId')
      .populate('shuttleId')
      .populate('pickupStopId')
      .populate('dropoffStopId');
    
    res.json({ success: true, data: bookings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitRating = async (req: any, res: Response) => {
  try {
    const { tripId, driverId, rating, comment } = req.body;
    
    const newRating = await Rating.create({
      organizationId: req.user.organizationId,
      studentId: req.user._id,
      tripId,
      driverId,
      rating,
      comment
    });

    res.json({ success: true, data: newRating });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStats = async (req: any, res: Response) => {
  try {
    const [totalBookings, pendingBookings] = await Promise.all([
      Booking.countDocuments({ studentId: req.user._id }),
      Booking.countDocuments({ studentId: req.user._id, status: 'pending' })
    ]);
    
    res.json({ 
      success: true, 
      data: { 
        totalBookings, 
        pendingBookings,
        tripsTaken: totalBookings - pendingBookings 
      } 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getDrivers = async (req: any, res: Response) => {
  try {
    const drivers = await User.find({ organizationId: req.user.organizationId, role: 'driver' })
      .select('name email avatar');
    res.json({ success: true, data: drivers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRoutes = async (req: any, res: Response) => {
  try {
    const routes = await Route.find({ organizationId: req.user.organizationId }).populate('stops.stopId');
    res.json({ success: true, data: routes });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStops = async (req: any, res: Response) => {
  try {
    const stops = await Stop.find({ organizationId: req.user.organizationId });
    res.json({ success: true, data: stops });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSchedules = async (req: any, res: Response) => {
  try {
    const schedules = await Schedule.find({ organizationId: req.user.organizationId })
      .populate('routeId')
      .populate('shuttleId');
    res.json({ success: true, data: schedules });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getShuttles = async (req: any, res: Response) => {
  try {
    const shuttles = await Shuttle.find({ organizationId: req.user.organizationId });
    res.json({ success: true, data: shuttles });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

