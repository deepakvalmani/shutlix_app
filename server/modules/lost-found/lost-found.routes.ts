import express from 'express';
import { protect } from '../../middleware/auth';
import { validateOrg } from '../../middleware/tenant';
import * as lostFound from './lost-found.controller';

const router = express.Router();

router.use(protect, validateOrg);

router.get('/', lostFound.getItems);
router.post('/', lostFound.reportItem);
router.patch('/:id', lostFound.updateStatus);

export default router;
