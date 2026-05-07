import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { Organization } from '../../models/Organization';
import { ApiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../types/auth';

let stripeClient: Stripe | null = null;

const getStripe = () => {
    if (!stripeClient) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            console.warn('STRIPE_SECRET_KEY not set. Stripe functionality will fail.');
            return null;
        }
        stripeClient = new Stripe(key, {
            apiVersion: '2025-01-27' as any,
        });
    }
    return stripeClient;
};

export const createCheckoutSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stripe = getStripe();
        if (!stripe) return ApiResponse.error(res, 'Payments not configured', 503);

        const { priceId } = req.body;
        const user = req.user;
        
        if (!user?.organizationId) return ApiResponse.error(res, 'Organization required', 400);

        const org = await Organization.findById(user.organizationId);
        if (!org) return ApiResponse.error(res, 'Organization not found', 404);

        let customerId = org.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: org.name,
                metadata: { orgId: org._id.toString() }
            });
            customerId = customer.id;
            org.stripeCustomerId = customerId;
            await org.save();
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${req.headers.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/billing/cancel`,
            subscription_data: {
                metadata: { orgId: org._id.toString() }
            },
        });

        return ApiResponse.success(res, { url: session.url });
    } catch (err) { next(err); }
};

export const createPortalSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stripe = getStripe();
        if (!stripe) return ApiResponse.error(res, 'Payments not configured', 503);

        const org = await Organization.findById(req.user?.organizationId);
        if (!org?.stripeCustomerId) return ApiResponse.error(res, 'No subscription found', 404);

        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripeCustomerId,
            return_url: `${req.headers.origin}/admin/billing`,
        });

        return ApiResponse.success(res, { url: session.url });
    } catch (err) { next(err); }
};

export const handleWebhook = async (req: Request, res: Response) => {
    const stripe = getStripe();
    if (!stripe) return res.sendStatus(503);

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            const sub = event.data.object as Stripe.Subscription;
            const orgId = sub.metadata.orgId;
            if (orgId) {
                await Organization.findByIdAndUpdate(orgId, {
                    subscriptionStatus: sub.status,
                    currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
                    stripeSubscriptionId: sub.id
                });
            }
            break;
    }

    res.json({ received: true });
};
