const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Shuttle = require('../models/Shuttle');
const Trip = require('../models/Trip');
const { Route, Stop } = require('../models/Route');
const Organization = require('../models/Organization');
const Rating = require('../models/Rating');
const { getAllActiveShuttles } = require('../config/redis');
const { getIO } = require('../config/socket');

router.use(protect, restrictTo('admin', 'superadmin'));

// ─── DASHBOARD OVERVIEW ───────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [
      activeShuttles,
      totalStudents,
      totalDrivers,
      totalShuttles,
      totalRoutes,
      tripsToday,
      livePositions,
    ] = await Promise.all([
      Shuttle.countDocuments({ organizationId, status: 'active' }),
      User.countDocuments({ organizationId, role: 'student', isActive: true }),
      User.countDocuments({ organizationId, role: 'driver', isActive: true }),
      Shuttle.countDocuments({ organizationId }),
      Route.countDocuments({ organizationId, isActive: true }),
      Trip.countDocuments({ organizationId, startTime: { $gte: today } }),
      getAllActiveShuttles(),
    ]);

    const orgLiveCount = livePositions.filter(p => p.organizationId === organizationId?.toString()).length;

    res.json({
      success: true,
      data: {
        liveShuttles: orgLiveCount,
        activeShuttles,
        totalStudents,
        totalDrivers,
        totalShuttles,
        totalRoutes,
        tripsToday,
      },
    });
  } catch (err) { next(err); }
});

// ─── FLEET MANAGEMENT ─────────────────────────────────────
router.get('/shuttles', async (req, res, next) => {
  try {
    const shuttles = await Shuttle.find({ organizationId: req.user.organizationId })
      .populate('currentDriverId', 'name email')
      .populate('assignedRouteId', 'name shortCode color');
    res.json({ success: true, data: shuttles });
  } catch (err) { next(err); }
});

router.post('/shuttles', async (req, res, next) => {
  try {
    const shuttle = await Shuttle.create({ ...req.body, organizationId: req.user.organizationId });
    res.status(201).json({ success: true, data: shuttle });
  } catch (err) { next(err); }
});

router.patch('/shuttles/:id', async (req, res, next) => {
  try {
    const shuttle = await Shuttle.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!shuttle) return res.status(404).json({ success: false, message: 'Shuttle not found' });
    res.json({ success: true, data: shuttle });
  } catch (err) { next(err); }
});

// ─── DRIVER MANAGEMENT ────────────────────────────────────
router.get('/drivers', async (req, res, next) => {
  try {
    const drivers = await User.find({ organizationId: req.user.organizationId, role: 'driver' })
      .populate('assignedShuttleId', 'name plateNumber')
      .populate('currentTripId');
    res.json({ success: true, data: drivers });
  } catch (err) { next(err); }
});

router.patch('/drivers/:id', async (req, res, next) => {
  try {
    const allowed = ['isActive', 'assignedShuttleId', 'name'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId, role: 'driver' },
      updates,
      { new: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver.toPublicJSON() });
  } catch (err) { next(err); }
});

// ─── ANALYTICS ────────────────────────────────────────────
router.get('/analytics', async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trips = await Trip.find({
      organizationId,
      startTime: { $gte: since },
      status: 'completed',
    }).populate('routeId', 'name shortCode');

    // Ridership by day
    const byDay = {};
    trips.forEach(trip => {
      const day = trip.startTime.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + (trip.peakPassengerCount || 0);
    });

    // Trips by route
    const byRoute = {};
    trips.forEach(trip => {
      const key = trip.routeId?.name || 'Unknown';
      byRoute[key] = (byRoute[key] || 0) + 1;
    });

    // Average rating
    const ratings = await Rating.find({ organizationId, createdAt: { $gte: since } });
    const avgRating = ratings.length
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
      : null;

    res.json({
      success: true,
      data: {
        totalTrips: trips.length,
        ridership: Object.entries(byDay).map(([date, count]) => ({ date, count })),
        tripsByRoute: Object.entries(byRoute).map(([name, count]) => ({ name, count })),
        avgRating,
        totalRatings: ratings.length,
      },
    });
  } catch (err) { next(err); }
});

// ─── EMERGENCY BROADCAST ──────────────────────────────────
router.post('/broadcast', async (req, res, next) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const io = getIO();
    io.to(`organization:${req.user.organizationId}`).emit('admin:announcement', {
      message,
      type: type || 'info',
      timestamp: Date.now(),
    });

    res.json({ success: true, message: 'Broadcast sent' });
  } catch (err) { next(err); }
});

// ─── STUDENTS LIST ────────────────────────────────────────
router.get('/students', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const search = req.query.search;

    const query = { organizationId: req.user.organizationId, role: 'student' };
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const students = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);
    res.json({ success: true, data: students.map(s => s.toPublicJSON()), pagination: { page, limit, total } });
  } catch (err) { next(err); }
});

module.exports = router;