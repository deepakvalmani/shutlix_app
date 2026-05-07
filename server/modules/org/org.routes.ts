import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import * as org from './org.controller';

const router = express.Router();

router.use(protect);

router.get('/me', org.getMyOrg);
router.patch('/me', restrictTo('admin', 'superadmin'), org.updateMyOrg);

// Super Admin only
router.post('/', restrictTo('superadmin'), org.createOrganization);

export default router;
