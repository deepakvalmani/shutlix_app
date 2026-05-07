import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import * as checkin from './checkin.controller';

const router = express.Router();

router.post('/generate', protect, restrictTo('driver'), checkin.generateToken);
router.post('/scan', protect, restrictTo('student'), checkin.scanToken);

export default router;
