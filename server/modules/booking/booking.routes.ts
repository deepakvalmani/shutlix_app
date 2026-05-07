import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import { validateOrg } from '../../middleware/tenant';
import { validate } from '../../middleware/validate';
import { createBookingSchema } from './booking.schema';
import * as booking from './booking.controller';

const router = express.Router();

router.use(protect, validateOrg);

router.post('/', restrictTo('student'), validate(createBookingSchema), booking.createBooking);
router.get('/my', restrictTo('student'), booking.getMyBookings);

export default router;
