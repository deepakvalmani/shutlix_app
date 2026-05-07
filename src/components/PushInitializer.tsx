import React, { useEffect } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import useAuthStore from '../store/authStore';

export const PushInitializer: React.FC = () => {
    const { isAuthenticated } = useAuthStore();
    const { isSubscribed, subscribeUser } = usePushNotifications();

    useEffect(() => {
        // Automatically attempt to subscribe if authenticated and not yet subscribed
        // (This only works if permission was already granted previously)
        if (isAuthenticated && !isSubscribed) {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                subscribeUser();
            }
        }
    }, [isAuthenticated, isSubscribed, subscribeUser]);

    return null;
};
