import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const VAPID_PUBLIC_KEY = 'BN-iIByEi3QCMi5OIvoDhe7wd2dt-cwoHekBoeUUIqnggY6bj9IE0vwdIUwIZnD11zk_DmtiNbbzTZyVzU3dOKU';

// Helper to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default' as NotificationPermission
    );

    const subscribeUser = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error('Push notifications not supported on this browser');
            return;
        }

        try {
            // Explicitly request permission if not already handled
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                setPermissionStatus(permission);
                if (permission !== 'granted') {
                    toast.error('Permission denied for notifications');
                    return;
                }
            } else if (Notification.permission === 'denied') {
                toast.error('Notifications are blocked in browser settings');
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            
            // Check existing subscription
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }

            await api.post('/notifications/subscribe', {
                subscription,
                userAgent: navigator.userAgent,
                platform: (navigator as any).platform || 'unknown'
            });

            setIsSubscribed(true);
            setPermissionStatus('granted');
            toast.success('Notifications enabled');
        } catch (err) {
            console.error('Subscription error:', err);
            toast.error('Failed to enable notifications');
        }
    };

    const unsubscribeUser = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();
                await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
            }

            setIsSubscribed(false);
            toast.success('Notifications disabled');
        } catch (err) {
            console.error('Unsubscribe error:', err);
        }
    };

    useEffect(() => {
        const checkSubscription = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            }
        };
        checkSubscription();
    }, []);

    return { isSubscribed, permissionStatus, subscribeUser, unsubscribeUser };
};
