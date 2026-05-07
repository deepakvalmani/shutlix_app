import { z } from 'zod';

export const createBookingSchema = z.object({
  body: z.object({
    routeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Route ID'),
    scheduledTime: z.string().datetime(),
    pickupStopId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Stop ID'),
    dropoffStopId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Stop ID'),
    shuttleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Shuttle ID').optional(),
    tripId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Trip ID').optional(),
  }),
});
