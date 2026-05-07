import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const routeSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  shortCode: { type: String, uppercase: true },
  color: { type: String, default: '#2563EB' },
  stops: [{
    stopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
    order: { type: Number, required: true },
  }],
  path: {
    type: [[Number]], // Array of [lat, lng]
    default: []
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Stop = mongoose.models.Stop || mongoose.model('Stop', stopSchema);

routeSchema.index({ organizationId: 1, name: 1 }, { unique: true });
routeSchema.index({ organizationId: 1, isActive: 1 });

export const Route = mongoose.models.Route || mongoose.model('Route', routeSchema);
