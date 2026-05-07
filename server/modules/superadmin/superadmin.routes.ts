import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import * as superadmin from './superadmin.controller';

const router = express.Router();

router.use(protect, restrictTo('superadmin'));

router.get('/stats', superadmin.getPlatformStats);
router.get('/analytics', superadmin.getGlobalAnalytics);
router.get('/organizations', superadmin.getOrganizations);
router.post('/organizations', superadmin.createOrganization);
router.patch('/organizations/:id', superadmin.updateOrganization);

export default router;
