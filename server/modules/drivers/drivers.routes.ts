import express from 'express';
import { protect, restrictTo } from '../../middleware/auth';
import { validateOrg } from '../../middleware/tenant';
import * as driver from './drivers.controller';

const router = express.Router();

router.use(protect, validateOrg, restrictTo('driver'));

router.get('/current-trip', driver.getCurrentTrip);
router.get('/assigned-shuttle', driver.getAssignedShuttle);
router.get('/shuttles', driver.getShuttles);
router.get('/my-routes', driver.getMyRoutes);
router.get('/stops', driver.getStops);
router.post('/start-trip', driver.startTrip);
router.post('/end-trip', driver.endTrip);
router.post('/sos', driver.sendSOS);

export default router;
