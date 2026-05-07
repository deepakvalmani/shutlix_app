import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['student', 'driver', 'admin', 'superadmin'], default: 'student' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, default: null, select: false },
  refreshToken: { type: String, select: false },
  passwordChangedAt: Date,
  studentId: { type: String, trim: true },
  licenseNumber: { type: String, trim: true },
  isOnboarded: { type: Boolean, default: false },
  assignedShuttleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shuttle' },
  assignedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  favStops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
  isOnDuty: { type: Boolean, default: false },
  avgRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function (this: any) {
  if (!this.isModified('password')) return;
  console.log(`Hashing password for user: ${this.email}`);
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.index({ name: 'text', email: 'text' });
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ organizationId: 1, isActive: 1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
