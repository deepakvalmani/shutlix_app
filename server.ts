import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import configurations
import connectDB from './server/config/db.ts';
import { connectRedis } from './server/config/redis.ts';
import { initSocket } from './server/config/socket.ts';

// Import modular routes
import authRoutes from './server/modules/auth/auth.routes.ts';
import orgRoutes from './server/modules/org/org.routes.ts';
import trackingRoutes from './server/modules/tracking/tracking.routes.ts';
import studentRoutes from './server/modules/students/students.routes.ts';
import driverRoutes from './server/modules/drivers/drivers.routes.ts';
import chatRoutes from './server/modules/chat/chat.routes.ts';
import notificationRoutes from './server/modules/notifications/notifications.routes.ts';
import analyticsRoutes from './server/modules/analytics/analytics.routes.ts';
import billingRoutes from './server/modules/billing/billing.routes.ts';
import sharedRoutes from './server/modules/shared/shared.routes.ts';
import bookingRoutes from './server/modules/booking/booking.routes.ts';
import lostFoundRoutes from './server/modules/lost-found/lost-found.routes.ts';
import adminRoutes from './server/modules/admin/admin.routes.ts'; 
import superadminRoutes from './server/modules/superadmin/superadmin.routes.ts';
import checkinRoutes from './server/modules/students/checkin.routes.ts';

const app = express();
const server = http.createServer(app);

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

connectRedis();

app.set('trust proxy', 1);

// Middleware Hardening
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Required for Vite/iframe compatibility
}));
app.use(cors({
  origin: true, 
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Try again in an hour.' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// API Routes v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/org', orgRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use(['/api/v1/students', '/api/v1/student'], studentRoutes);
app.use(['/api/v1/drivers', '/api/v1/driver'], driverRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/shared', sharedRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/lost-found', lostFoundRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/superadmin', superadminRoutes);
app.use('/api/v1/checkin', checkinRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ShutliX API v1 running',
    time: new Date().toISOString(),
  });
});

// Socket.IO
initSocket(server);

// Vite middleware for development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const setupVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  };
  setupVite();
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Global Error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.toString() : undefined,
  });
});

// Start server if main module
if (import.meta.url === `file://${__filename}`) {
  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚌 ShutliX v2 running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
