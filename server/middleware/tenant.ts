import { Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import { AuthRequest } from '../types/auth';

/**
 * Ensures the user belongs to the organization they are trying to access.
 * This is a global multi-tenant guard.
 */
export const validateOrg = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.organizationId) {
    if (req.user?.role === 'superadmin') return next();
    return ApiResponse.error(res, 'Organization context missing', 403);
  }
  next();
};

/**
 * Middleware to ensure the resource belongs to the current user's organization.
 * Used for dynamic parameters like :id
 */
export const checkOrgAccess = (model: any) => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params.id;
    if (!resourceId) return next();

    // Superadmins bypass org checks
    if (req.user?.role === 'superadmin') {
        const resource = await model.findById(resourceId);
        if (!resource) return ApiResponse.error(res, 'Resource not found', 404);
        (req as any).resource = resource;
        return next();
    }

    const resource = await model.findOne({ 
      _id: resourceId, 
      organizationId: req.user?.organizationId 
    });

    if (!resource) {
      return ApiResponse.error(res, 'Resource not found or access denied', 404);
    }

    (req as any).resource = resource; // Attach to request for later use
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Ensures the user is the owner of the resource.
 */
export const checkOwnership = (ownerField: string = 'userId') => (req: AuthRequest, res: Response, next: NextFunction) => {
  const resource = (req as any).resource;
  if (!resource) return ApiResponse.error(res, 'Resource verification failed', 500);

  const ownerId = resource[ownerField]?.toString();
  const userId = req.user?._id.toString();

  if (ownerId !== userId && !['admin', 'superadmin'].includes(req.user?.role || '')) {
    return ApiResponse.error(res, 'You do not own this resource', 403);
  }

  next();
};
