import express from 'express';
import { protect } from '../../middleware/auth';
import { NotificationSubscription } from '../../models/index';

const router = express.Router();

router.post('/subscribe', protect, async (req: any, res: any) => {
  try {
    const { subscription, userAgent, platform } = req.body;
    
    // Check if subscription already exists for this user and endpoint
    const existing = await NotificationSubscription.findOne({ 
        userId: req.user.id, 
        'subscription.endpoint': subscription.endpoint 
    });

    if (existing) {
        existing.subscription = subscription;
        existing.userAgent = userAgent;
        existing.platform = platform;
        await existing.save();
        return res.json({ success: true, message: 'Subscription updated' });
    }

    await NotificationSubscription.create({
      userId: req.user.id,
      subscription,
      userAgent,
      platform
    });

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Subscription failed:', err);
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
});

router.post('/unsubscribe', protect, async (req: any, res: any) => {
    try {
        const { endpoint } = req.body;
        await NotificationSubscription.deleteOne({ userId: req.user.id, 'subscription.endpoint': endpoint });
        res.json({ success: true, message: 'Unsubscribed' });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

export default router;
