import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Trip } from '../../models/index';
import { getRedisClient } from '../../config/redis';
import { getIO } from '../../config/socket';

/**
 * Driver generates a QR token valid for 60 seconds
 */
export const generateToken = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { tripId, shuttleId } = req.body;
    if (!tripId || !shuttleId) {
      return res.status(400).json({ success: false, message: 'tripId and shuttleId required' });
    }

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user._id, status: 'active' });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Active trip not found' });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 60 * 1000;

    const redis = getRedisClient();
    if (redis) {
      await redis.setex(
        `checkin:${token}`,
        65,
        JSON.stringify({ 
          tripId, 
          shuttleId, 
          driverId: req.user._id.toString(), 
          organizationId: req.user.organizationId.toString(),
          expiresAt 
        })
      );
    }

    res.json({
      success: true,
      data: { token, expiresAt, refreshIn: 60 },
    });
  } catch (err) { next(err); }
};

/**
 * Student scans the QR token
 */
export const scanToken = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const redis = getRedisClient();
    if (!redis) return res.status(503).json({ success: false, message: 'Check-in service unavailable' });

    const raw = await redis.get(`checkin:${token}`);
    if (!raw) {
      return res.status(400).json({ 
        success: false, 
        message: 'QR code expired or invalid. Ask the driver to refresh.' 
      });
    }

    const checkinData = JSON.parse(raw);
    if (Date.now() > checkinData.expiresAt) {
      return res.status(400).json({ success: false, message: 'QR code expired' });
    }

    // Verify same organization
    if (checkinData.organizationId !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot check-in to a different organization' });
    }

    // Process check-in
    await Trip.findOneAndUpdate(
      { _id: checkinData.tripId, organizationId: req.user.organizationId },
      { $inc: { totalBoardings: 1 } }
    );

    // One-time use token: delete after successful scan
    await redis.del(`checkin:${token}`);

    // Notify organization via Socket.IO
    try {
      const io = getIO();
      io.to(`org:${checkinData.organizationId}`).emit('shuttle:checkin', {
        shuttleId: checkinData.shuttleId,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error('Check-in socket emit failed:', e);
    }

    res.json({
      success: true,
      message: 'Boarding confirmed!',
      data: { shuttleId: checkinData.shuttleId }
    });
  } catch (err) { next(err); }
};
