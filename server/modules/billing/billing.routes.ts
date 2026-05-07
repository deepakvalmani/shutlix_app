import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import * as billing from './billing.controller';

const router = express.Router();

// Public webhook
router.post('/webhook', express.raw({ type: 'application/json' }), billing.handleWebhook);

// Protected routes
router.use(protect, restrictTo('admin', 'superadmin'));

router.post('/create-checkout-session', billing.createCheckoutSession);
router.post('/create-portal-session', billing.createPortalSession);

export default router;
