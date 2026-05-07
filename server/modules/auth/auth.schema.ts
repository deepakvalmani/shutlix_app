import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name too short'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 chars').regex(/[A-Z]/, 'Password must have 1 upper').regex(/[0-9]/, 'Password must have 1 number'),
    role: z.enum(['student', 'driver', 'admin', 'superadmin']),
    organizationId: z.string(),
    studentId: z.string().optional(),
    licenseNumber: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password required'),
    organizationCode: z.string().optional(),
  }),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  }),
});

export const sendOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});
