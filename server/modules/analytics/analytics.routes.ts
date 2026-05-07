import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import * as analytics from './analytics.controller';

const router = express.Router();

router.use(protect, restrictTo('admin', 'superadmin'));

router.get('/dashboard-stats', analytics.getDashboardStats);
router.get('/fleet-utilization', analytics.getFleetUtilization);

export default router;
