import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { ApiResponse } from '../utils/apiResponse';
import { AuthRequest, UserRole } from '../types/auth';
import { getRedisClient } from '../config/redis';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 4,
  admin: 3,
  driver: 2,
  student: 1
};

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    
    // 1. Extract Token
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    // 2. Strict Token Presence Check
    if (!token || typeof token !== 'string' || !token.trim()) {
      return ApiResponse.error(res, 'You are not logged in. Please log in to get access.', 401);
    }

    // 3. Redis Blacklist Check (Logout protection)
    const redis = getRedisClient();
    if (redis) {
      const isBlacklisted = await redis.get(`bl_${token}`);
      if (isBlacklisted) {
        return ApiResponse.error(res, 'Token is no longer valid. Please log in again.', 401);
      }
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');

    // 4. Verify JWT with specific error handling
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, 'Your session has expired. Please log in again.', 401);
      }
      if (err.name === 'JsonWebTokenError') {
        return ApiResponse.error(res, 'Invalid token signature. Please log in again.', 401);
      }
      return ApiResponse.error(res, 'Authentication failed. Please log in again.', 401);
    }

    // 5. Optimized DB Lookup
    // Removed populate, selecting only essential fields for security & performance
    const user = await User.findById(decoded.id).select('_id role organizationId email isActive lockUntil');
    
    if (!user) {
      return ApiResponse.error(res, 'The user belonging to this token no longer exists.', 401);
    }

    // 6. Security Enforcement (Account status)
    if (!user.isActive) {
      return ApiResponse.error(res, 'This account is deactivated. Please contact support.', 401);
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
        return ApiResponse.error(res, 'Too many failed login attempts. Account is temporarily locked.', 403);
    }

    // 7. Inject Authenticated User
    req.user = user as any;
    next();
  } catch (err: any) {
    console.error('Protect Middleware Error:', err);
    return ApiResponse.error(res, 'Server error during authentication', 500);
  }
};

export const restrictTo = (...roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Authorization required', 401);
  }

  const hasPermission = roles.some(role => {
    // Current role matches or is a superadmin
    if (req.user!.role === 'superadmin') return true;
    return req.user!.role === role;
  });

  if (!hasPermission) {
    console.warn(`🔒 SECURITY VIOLATION: User ${req.user._id} with role ${req.user.role} attempted to access route restricted to [${roles.join(', ')}]`);
    return ApiResponse.error(res, `Required permission level not met. Required: ${roles.join(', ')}`, 403);
  }

  next();
};
