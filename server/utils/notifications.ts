import webpush from 'web-push';
import { NotificationSubscription } from '../models/index';
import dotenv from 'dotenv';

dotenv.config();

const publicKey = process.env.VAPID_PUBLIC_KEY || 'BIAfueLwXvWGlgJlxKvcQGlL6R2wmFod66g0O2H0E8CLUeBY5zgGU1ElH0CTI1fCueI9six1lBr9pVQFKeOjQ0Y';
const privateKey = process.env.VAPID_PRIVATE_KEY || '479X_RfRJj5OGjgPeEeGBV6rWzQoOBezCnrY0GIzKgc';
const email = process.env.VAPID_EMAIL || 'admin@shuttlix.com';

webpush.setVapidDetails(
  `mailto:${email}`,
  publicKey,
  privateKey
);

export const sendPushNotification = async (userId: string, payload: { title: string; body: string; icon?: string; data?: any }) => {
  try {
    const subscriptions = await NotificationSubscription.find({ userId });
    
    const sendPromises = subscriptions.map(async (subDoc) => {
      try {
        await webpush.sendNotification(
          subDoc.subscription as any,
          JSON.stringify(payload)
        );
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or no longer valid
          await NotificationSubscription.findByIdAndDelete(subDoc._id);
        } else {
          console.error('Error sending push notification:', error);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Failed to process push notifications for user:', userId, error);
  }
};

export const broadcastPushNotification = async (userIds: string[], payload: { title: string; body: string; icon?: string; data?: any }) => {
    const promises = userIds.map(id => sendPushNotification(id, payload));
    await Promise.all(promises);
};

export const broadcastToOrg = async (organizationId: string, payload: { title: string; body: string; icon?: string; data?: any }) => {
    try {
        const { User } = await import('../models/User');
        const userIds = await User.find({ organizationId }).distinct('_id');
        
        const subscriptions = await NotificationSubscription.find({ userId: { $in: userIds } });
        
        const sendPromises = subscriptions.map(async (subDoc) => {
            try {
                await webpush.sendNotification(
                    subDoc.subscription as any,
                    JSON.stringify(payload)
                );
            } catch (error: any) {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await NotificationSubscription.findByIdAndDelete(subDoc._id);
                }
            }
        });

        await Promise.all(sendPromises);
    } catch (err) {
        console.error('Org broadcast failed:', err);
    }
};
