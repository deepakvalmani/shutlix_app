import express from 'express';
import { protect } from '../../middleware/auth';
import { validateOrg } from '../../middleware/tenant';
import * as tracking from './tracking.controller';

const router = express.Router();

router.use(protect, validateOrg);

router.get('/live', tracking.getLiveTracking);
router.get('/history', tracking.getTripHistory);

export default router;
