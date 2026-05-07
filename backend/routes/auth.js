const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/send-otp', body('email').isEmail(), authController.sendOTP);
router.post('/verify-otp', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
], authController.verifyOTP);

router.post('/register', [
  body('name').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('role').isIn(['student', 'driver']),
  body('organizationId').notEmpty(),
], authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

router.post('/refresh', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.patch('/update-profile', protect, authController.updateProfile);
router.patch('/change-password', protect, authController.changePassword);
router.post('/fcm-token', protect, authController.updateFCMToken);

module.exports = router;