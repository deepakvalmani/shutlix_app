import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  shortName: { type: String, trim: true, uppercase: true },
  code: {
    type: String, required: true, unique: true,
    uppercase: true, trim: true,
  },
  logo: String,
  plan: {
    type: String,
    enum: ['pilot', 'starter', 'growth', 'enterprise'],
    default: 'pilot',
  },
  isActive: { type: Boolean, default: true },
  mapCenter: {
    lat: { type: Number, default: 24.9056 },
    lng: { type: Number, default: 67.0822 },
  },
  defaultZoom: { type: Number, default: 15 },
  contactEmail: String,
  contactPhone: String,
  address:      String,
  timezone:     { type: String, default: 'Asia/Karachi' },
  settings: {
    allowGuestTracking: { type: Boolean, default: true },
    enableQRCheckIn:    { type: Boolean, default: true },
    enableRatings:      { type: Boolean, default: true },
    maxShuttles:        { type: Number,  default: 10 },
  },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  subscriptionStatus: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'incomplete', 'trialing'],
    default: 'active' // Default to active for simplicity in this demo, usually trialing
  },
  currentPeriodEnd: Date,
}, { timestamps: true });

export const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
