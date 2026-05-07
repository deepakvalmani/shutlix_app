import { Response, NextFunction } from 'express';
import { LostAndFound } from '../../models/LostAndFound';
import { ApiResponse } from '../../utils/apiResponse';

export const getItems = async (req: any, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = 50; // Increased limit for better visibility
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            LostAndFound.find({ organizationId: req.user.organizationId })
                .populate('reportedBy', 'name avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            LostAndFound.countDocuments({ organizationId: req.user.organizationId })
        ]);
        return ApiResponse.paginate(res, items, { page, limit, total });
    } catch (err) { next(err); }
};

export const reportItem = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { shuttleId, ...rest } = req.body;
        const newItem = await LostAndFound.create({
            ...rest,
            shuttleId: shuttleId === '' ? undefined : shuttleId,
            organizationId: req.user.organizationId,
            reportedBy: req.user._id
        });
        return ApiResponse.success(res, newItem, 'Item reported', 201);
    } catch (err) { next(err); }
};

export const updateStatus = async (req: any, res: Response, next: NextFunction) => {
    try {
        const item = await LostAndFound.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            { status: req.body.status },
            { new: true }
        );
        if (!item) return ApiResponse.error(res, 'Item not found', 404);
        return ApiResponse.success(res, item, 'Status updated');
    } catch (err) { next(err); }
};
