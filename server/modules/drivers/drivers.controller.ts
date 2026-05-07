import { Request, Response } from 'express';
import { Trip, Shuttle, Route, User, Emergency, Stop } from '../../models/index';

export const getCurrentTrip = async (req: any, res: Response) => {
  try {
    const trip = await Trip.findOne({ driverId: req.user._id, status: 'active' })
      .populate('shuttleId')
      .populate('routeId');
    
    res.json({ success: true, data: trip });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAssignedShuttle = async (req: any, res: Response) => {
  try {
    const shuttle = await Shuttle.findOne({ currentDriverId: req.user._id, isOnline: true });
    res.json({ success: true, data: shuttle });
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

export const getMyRoutes = async (req: any, res: Response) => {
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

export const startTrip = async (req: any, res: Response) => {
  try {
    const { shuttleId, routeId } = req.body;
    
    // Deactivate any existing active trip
    await Trip.updateMany(
      { driverId: req.user._id, status: 'active' },
      { status: 'cancelled', endTime: new Date() }
    );

    const trip = await Trip.create({
      organizationId: req.user.organizationId,
      shuttleId,
      driverId: req.user._id,
      routeId,
      status: 'active',
      startTime: new Date()
    });

    await Shuttle.findByIdAndUpdate(shuttleId, { 
      currentDriverId: req.user._id,
      isOnline: true,
      status: 'active'
    });

    res.json({ success: true, data: trip });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const endTrip = async (req: any, res: Response) => {
  try {
    const { tripId } = req.body;
    const trip = await Trip.findByIdAndUpdate(tripId, {
      status: 'completed',
      endTime: new Date()
    }, { new: true });

    if (trip) {
      await Shuttle.findByIdAndUpdate(trip.shuttleId, {
        status: 'idle',
        isOnline: false,
        currentDriverId: null
      });
    }

    res.json({ success: true, data: trip });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendSOS = async (req: any, res: Response) => {
  try {
    const { shuttleId, lat, lng } = req.body;
    
    const emergency = await Emergency.create({
      organizationId: req.user.organizationId,
      shuttleId,
      driverId: req.user._id,
      location: { lat, lng },
      status: 'active'
    });

    // Also update any active trip to 'emergency' status
    await Trip.findOneAndUpdate(
      { driverId: req.user._id, status: 'active' },
      { status: 'emergency' }
    );

    res.json({ success: true, data: emergency });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

