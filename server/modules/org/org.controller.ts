import { Response, NextFunction } from 'express';
import { Organization } from '../../models/Organization';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../types/auth';

export const getMyOrg = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const org = await Organization.findById(req.user?.organizationId);
        if (!org) return ApiResponse.error(res, 'Organization not found', 404);
        return ApiResponse.success(res, org);
    } catch (err) { next(err); }
};

export const updateMyOrg = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, contactEmail, contactPhone, address, settings, mapCenter, defaultZoom } = req.body;
        
        const org = await Organization.findByIdAndUpdate(
            req.user?.organizationId,
            { name, contactEmail, contactPhone, address, settings, mapCenter, defaultZoom },
            { new: true, runValidators: true }
        );

        if (!org) return ApiResponse.error(res, 'Organization not found', 404);
        return ApiResponse.success(res, org, 'Organization updated');
    } catch (err) { next(err); }
};

// Admin only: create org (Super Admin level usually)
export const createOrganization = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, code, shortName } = req.body;
        const exists = await Organization.findOne({ code: code.toUpperCase() });
        if (exists) return ApiResponse.error(res, 'Organization code already exists', 400);

        const org = await Organization.create({ name, code: code.toUpperCase(), shortName });
        return ApiResponse.success(res, org, 'Organization created', 201);
    } catch (err) { next(err); }
};
