import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., 'CREATE_SHUTTLE', 'ASSIGN_DRIVER'
  module: { type: String, required: true }, // e.g., 'FLEET', 'AUTH', 'BILLING'
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
