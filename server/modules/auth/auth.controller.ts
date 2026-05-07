import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../../models/User';
import { Organization } from '../../models/Organization';
import * as redis from '../../config/redis';
import { sendEmail, otpTemplate } from '../../utils/email';
import { ApiResponse } from '../../utils/apiResponse';
import { logAudit } from '../../utils/audit';
import { AuthRequest } from '../../types/auth';

const signToken = (id: string, role: string, orgId: any) => {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ id, role, organizationId: orgId }, secret, { expiresIn: '1h' });
};

const signRefreshToken = (id: string) => {
  const secret = process.env.JWT_REFRESH_SECRET!;
  return jwt.sign({ id }, secret, { expiresIn: '7d' });
};

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, organizationId, studentId, licenseNumber } = req.body;
    
    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) return ApiResponse.error(res, 'User already exists', 400);

    const user = await User.create({
      name, email, password, role, organizationId, studentId, licenseNumber, 
      isVerified: true // Assume verified if they could call this (or verify after)
    });

    const accessToken = signToken(user._id.toString(), user.role, user.organizationId);
    const refreshToken = signRefreshToken(user._id.toString());

    await User.findByIdAndUpdate(user._id, { refreshToken: hashToken(refreshToken) });

    return ApiResponse.success(res, { accessToken, refreshToken, user: { _id: user._id, name, email, role, organizationId } }, 'Registered', 201);
  } catch (err) { next(err); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, organizationCode } = req.body;
    console.log(`Login attempt for: ${email}`);
    
    const user: any = await User.findOne({ email }).select('+password +lockUntil +loginAttempts').populate('organizationId');
    if (!user) {
      console.log(`Login failed: User ${email} not found`);
      return ApiResponse.error(res, 'Invalid credentials', 401);
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      console.log(`Login failed: Account ${email} is locked`);
      return ApiResponse.error(res, 'Account locked. Try again in 15 mins.', 403);
    }

    const isMatch = await user.comparePassword(password);
    console.log(`Password match for ${email}: ${isMatch} (Candidate length: ${password?.length}, Hash length: ${user.password?.length})`);
    
    if (!isMatch) {
      console.log(`Login failed: Invalid password for ${email}. Double check your spelling and casing.`);
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) user.lockUntil = Date.now() + 15 * 60 * 1000;
      await user.save();
      return ApiResponse.error(res, 'Invalid credentials', 401);
    }

    if (organizationCode && user.organizationId?.code !== organizationCode.toUpperCase()) {
      return ApiResponse.error(res, 'Invalid organization code', 401);
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    
    const accessToken = signToken(user._id.toString(), user.role, user.organizationId?._id);
    const refreshToken = signRefreshToken(user._id.toString());
    
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    await logAudit({
      organizationId: user.organizationId?._id,
      userId: user._id,
      action: 'LOGIN',
      module: 'AUTH',
      req
    });

    console.log(`Login successful for: ${email} (Role: ${user.role})`);
    return ApiResponse.success(res, { accessToken, refreshToken, user: { _id: user._id, name: user.name, role: user.role, organizationId: user.organizationId?._id } });
  } catch (err) { next(err); }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return ApiResponse.error(res, 'No refresh token', 401);

    const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    const user = await User.findOne({ _id: decoded.id, refreshToken: hashToken(refreshToken) });
    
    if (!user) return ApiResponse.error(res, 'Invalid session', 401);

    const accessToken = signToken(user._id.toString(), user.role, user.organizationId);
    return ApiResponse.success(res, { accessToken });
  } catch (err) { 
    return ApiResponse.error(res, 'Invalid refresh token', 401);
  }
};

export const sendOTP = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const lastSent = await redis.get(`otp_sent:${email}`);
      if (lastSent) return ApiResponse.error(res, 'Please wait 60s before requesting again', 429);

      const otp = crypto.randomInt(100000, 999999).toString();
      await redis.set(`otp:${email}`, otp, 300);
      await redis.set(`otp_sent:${email}`, 'true', 60);

      await sendEmail({ to: email, subject: 'Verification Code', html: otpTemplate(otp, 'verify') });
      return ApiResponse.success(res, null, 'OTP sent');
    } catch (err) { next(err); }
};

export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const stored = await redis.get(`otp:${email}`);
    if (!stored || stored !== otp) return ApiResponse.error(res, 'Invalid or expired OTP', 400);

    const tempToken = crypto.randomBytes(32).toString('hex');
    await redis.set(`tempToken:${tempToken}`, email, 1800);
    await redis.del(`otp:${email}`);

    return ApiResponse.success(res, { tempToken }, 'Verified');
  } catch (err) { next(err); }
};

export const orgLookup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code }: any = req.query;
    if (!code) return ApiResponse.error(res, 'Code required', 400);
    const org = await Organization.findOne({ code: code.toUpperCase() });
    if (!org) return ApiResponse.error(res, 'Organization not found', 404);
    return ApiResponse.success(res, org);
  } catch (err) { next(err); }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!._id).populate('organizationId').lean();
    if (!user) return ApiResponse.error(res, 'User not found', 404);
    return ApiResponse.success(res, user);
  } catch (err) { next(err); }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.jwt;
    
    if (token) {
        // Blacklist token for its remaining life (or default 1h)
        await redis.set(`bl_${token}`, 'true', 3600);
    }

    // Also clear refresh token from DB
    if (req.user) {
        await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    }

    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
};
