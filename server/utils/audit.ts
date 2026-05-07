import { AuditLog } from '../models/index';
export const logAudit = async (payload: {
  organizationId: any,
  userId: any,
  action: string,
  module: string,
  details?: any,
  req?: any
}) => {
  try {
    await AuditLog.create({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: payload.action,
      module: payload.module,
      details: payload.details,
      ipAddress: payload.req?.ip,
      userAgent: payload.req?.get('User-Agent')
    });
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};
