import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'student' | 'driver' | 'admin' | 'superadmin';

export interface AuthUser {
  _id: Types.ObjectId;
  role: UserRole;
  organizationId: Types.ObjectId;
  email: string;
  isActive: boolean;
  lockUntil?: Date | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
