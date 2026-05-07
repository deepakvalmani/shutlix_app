import express from 'express';
import * as auth from './auth.controller';
import { validate } from '../../middleware/validate';
import { protect } from '../../middleware/auth';
import { registerSchema, loginSchema, sendOTPSchema } from './auth.schema';

const router = express.Router();

router.get('/me', protect, auth.getMe);
router.post('/logout', protect, auth.logout);
router.post('/register', validate(registerSchema), auth.register);
router.post('/login', validate(loginSchema), auth.login);
router.post('/refresh', auth.refreshToken);
router.post('/send-otp', validate(sendOTPSchema), auth.sendOTP);
router.post('/verify-otp', auth.verifyOTP);
router.get('/org-lookup', auth.orgLookup);

export default router;
