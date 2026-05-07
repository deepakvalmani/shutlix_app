import express from 'express';
import { protect } from '../../middleware/auth';
import { validateOrg } from '../../middleware/tenant';
import * as shared from './shared.controller';

const router = express.Router();

// Shared routes accessible by any authenticated user in the org
router.use(protect, validateOrg);

router.get('/live-shuttles', shared.getLiveShuttles);
router.get('/routes', shared.getRoutes);
router.get('/stops', shared.getStops);
router.get('/schedules', shared.getSchedules);

export default router;
