import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import { validateOrg, checkOrgAccess } from '../../middleware/tenant';
import * as admin from './admin.controller';
import { Shuttle, Route, Stop, Schedule } from '../../models/index';

const router = express.Router();

router.use(protect, validateOrg, restrictTo('admin', 'superadmin'));

router.get('/dashboard', admin.getDashboardSummary);
router.get('/analytics', admin.getAnalytics);

// Shuttles
router.get('/shuttles', admin.getShuttles);
router.post('/shuttles', admin.createShuttle);
router.patch('/shuttles/:id', checkOrgAccess(Shuttle), admin.updateShuttle);

// Drivers
router.get('/drivers', admin.getDrivers);
router.post('/drivers/:id/assign', admin.assignDriver);

// Organization
router.get('/organisation', admin.getOrganisation);
router.get('/audit-logs', admin.getAuditLogs);

// Students
router.get('/students', admin.getStudents);

// Schedules
router.get('/schedules', admin.getSchedules);

// Stops
router.get('/stops', admin.getStops);
router.post('/stops', admin.createStop);
router.patch('/stops/:id', checkOrgAccess(Stop), admin.updateStop);

// Routes
router.get('/routes', admin.getRoutes);
router.post('/routes', admin.createRoute);
router.patch('/routes/:id', checkOrgAccess(Route), admin.updateRoute);

// Misc
router.post('/broadcast', admin.broadcast);

// Other admin routes would follow... I'll mount the existing ones for now to avoid breakage
// but the pattern is established.

export default router;
