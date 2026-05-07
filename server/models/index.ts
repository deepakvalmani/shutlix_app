import mongoose from 'mongoose';

const shuttleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  plateNumber: { type: String, required: true },
  capacity: { type: Number, required: true },
  status: { type: String, enum: ['active', 'idle', 'maintenance', 'retired'], default: 'idle' },
  isOnline: { type: Boolean, default: false },
  currentDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const tripSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  shuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'emergency'], default: 'active' },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  etaMinutes: Number,
  distanceRemainingKm: Number,
  currentLat: Number,
  currentLng: Number,
}, { timestamps: true });

tripSchema.index({ organizationId: 1, status: 1 });
tripSchema.index({ driverId: 1, status: 1 }, { 
  unique: true, 
  partialFilterExpression: { status: 'active' } 
});

const ratingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
}, { timestamps: true });

ratingSchema.index({ organizationId: 1 });
ratingSchema.index({ tripId: 1 });

const geofenceSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  stopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  center: { lat: Number, lng: Number },
  radiusMeters: { type: Number, default: 100 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

geofenceSchema.index({ organizationId: 1, isActive: 1 });

const bookingSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  shuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle' },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  seatNumber: String,
  pickupStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop' },
  dropoffStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop' },
  scheduledTime: Date,
}, { timestamps: true });

bookingSchema.index({ organizationId: 1, status: 1 });
bookingSchema.index({ studentId: 1, scheduledTime: -1 });
bookingSchema.index({ tripId: 1 });

const scheduleSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  shuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle' },
  daysOfWeek: [Number], // 0-6
  departureTime: String, // HH:mm
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

import { Stop, Route } from './Route';
import { User } from './User';
import { Organization } from './Organization';
import { AuditLog } from './AuditLog';

export { Stop, Route, User, Organization, AuditLog };
export const Shuttle = mongoose.models.Shuttle || mongoose.model('Shuttle', shuttleSchema);
export const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema);
export const Rating = mongoose.models.Rating || mongoose.model('Rating', ratingSchema);
export const Geofence = mongoose.models.Geofence || mongoose.model('Geofence', geofenceSchema);
export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
export const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

export const Emergency = mongoose.models.Emergency || mongoose.model('Emergency', new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  shuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: { type: String, enum: ['active', 'resolved'], default: 'active' },
  resolvedAt: { type: Date },
}, { timestamps: true }));

export const NotificationSubscription = mongoose.models.NotificationSubscription || mongoose.model('NotificationSubscription', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  },
  userAgent: String,
  platform: String,
}, { timestamps: true }));
