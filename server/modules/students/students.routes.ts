import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import { validateOrg } from '../../middleware/tenant';
import * as student from './students.controller';

const router = express.Router();

router.use(protect, validateOrg, restrictTo('student'));

router.get('/history', student.getHistory);
router.get('/bookings', student.getBookings);
router.post('/rate', student.submitRating);
router.get('/stats', student.getStats);
router.get('/drivers', student.getDrivers);
router.get('/routes', student.getRoutes);
router.get('/stops', student.getStops);
router.get('/schedules', student.getSchedules);
router.get('/shuttles', student.getShuttles);

export default router;
