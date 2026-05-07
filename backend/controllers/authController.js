const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { setOTP, getOTP, deleteOTP } = require('../config/redis');
const sendEmail = require('../utils/email');

// ─── OTP ────────────────────────────────────────────────
exports.sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const otp = crypto.randomInt(100000, 999999).toString();
    await setOTP(email, otp, 300);
    await sendEmail({
      to: email,
      subject: 'Your ShutlliX verification code',
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
    });
    res.json({ success: true, message: 'OTP sent' });
  } catch (err) { next(err); }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const stored = await getOTP(email);
    if (!stored || stored !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    await deleteOTP(email);
    const tempToken = crypto.randomBytes(32).toString('hex');
    await setOTP(`temp:${email}`, tempToken, 600);
    res.json({ success: true, tempToken });
  } catch (err) { next(err); }
};

// ─── TOKEN HELPERS ──────────────────────────────────────
const signAccessToken = (userId, role, organizationId) => {
  return jwt.sign(
    { id: userId, role, organizationId: organizationId?.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const sendTokenResponse = async (user, statusCode, res) => {
  const accessToken = signAccessToken(user._id, user.role, user.organizationId);
  const refreshToken = signRefreshToken(user._id);
  user.refreshToken = refreshToken;
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });
  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toPublicJSON(),
  });
};

// ─── REGISTER ───────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, organizationId, studentId, licenseNumber, tempToken } = req.body;

    if (!tempToken) {
      return res.status(400).json({ success: false, message: 'Verification required' });
    }
    const storedToken = await getOTP(`temp:${email}`);
    if (!storedToken || storedToken !== tempToken) {
      return res.status(400).json({ success: false, message: 'Invalid verification' });
    }
    await deleteOTP(`temp:${email}`);

    const organization = await Organization.findById(organizationId);
    if (!organization || !organization.isActive) {
      return res.status(404).json({ success: false, message: 'Organization not found or inactive.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      organizationId,
      studentId: role === 'student' ? studentId : undefined,
      licenseNumber: role === 'driver' ? licenseNumber : undefined,
    });

    await sendTokenResponse(user, 201, res);
  } catch (err) { next(err); }
};

// ─── LOGIN ──────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, organizationCode } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshToken').populate('organizationId');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      if (!organizationCode) {
        return res.status(400).json({ success: false, message: 'Organization code required for admin login.' });
      }
      const org = await Organization.findById(user.organizationId);
      if (!org || org.code !== organizationCode) {
        return res.status(401).json({ success: false, message: 'Invalid organization code.' });
      }
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact your organization admin.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    await sendTokenResponse(user, 200, res);
  } catch (err) { next(err); }
};

// ─── REFRESH TOKEN ──────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findOne({ _id: decoded.id }).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newAccessToken = signAccessToken(user._id, user.role, user.organizationId);
    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) { next(err); }
};

// ─── LOGOUT ─────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) { next(err); }
};

// ─── GET CURRENT USER ───────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
};

// ─── UPDATE PROFILE ─────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'profilePicture', 'notificationPreferences'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) { next(err); }
};

// ─── CHANGE PASSWORD ────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    await sendTokenResponse(user, 200, res);
  } catch (err) { next(err); }
};

// ─── UPDATE FCM TOKEN ───────────────────────────────────
exports.updateFCMToken = async (req, res, next) => {
  try {
    const { token, device } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required.' });

    const user = await User.findById(req.user._id);
    user.fcmTokens = user.fcmTokens.filter(t => t.device !== device);
    user.fcmTokens.push({ token, device: device || 'web', updatedAt: new Date() });
    if (user.fcmTokens.length > 5) user.fcmTokens = user.fcmTokens.slice(-5);
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'FCM token updated.' });
  } catch (err) { next(err); }
};