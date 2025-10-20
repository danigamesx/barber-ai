
import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../App';
import * as api from '../api';
import { subscribeUserToPush } from '../utils/push';
import Button from './Button';

const NotificationPermissionManager: React.FC = () => {
    const { user, patchUser } = useContext(AppContext);
    const [permission, setPermission] = useState(Notification.permission);
    
    useEffect(() => {
        setPermission(Notification.permission);
    }, []);

    const handleRequestPermission = async () => {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted' && user) {
            const subscription = await subscribeUserToPush();
            if (subscription) {
                const currentSubs = (user.push_subscriptions as PushSubscriptionJSON[] || []);
                // Avoid duplicates
                if (!currentSubs.some(s => s.endpoint === subscription.endpoint)) {
                    const updatedSubs = [...currentSubs, subscription.toJSON()];
                    try {
                        const updatedUser = await api.updateUserProfile(user.id, { push_subscriptions: updatedSubs as any });
                        patchUser(updatedUser);
                    } catch(e) {
                        console.error("Failed to save push subscription", e);
                    }
                }
            }
        }
    };
    
    // Do not show if permission is already granted or denied, or if notifications are not supported.
    if (permission !== 'default' || !('Notification' in window)) {
        return null;
    }
    
    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-brand-secondary p-4 rounded-lg shadow-lg z-50">
            <p className="text-sm text-center mb-3">Ative as notificações para receber lembretes dos seus agendamentos!</p>
            <Button onClick={handleRequestPermission} className="w-full py-2 text-sm">Ativar Notificações</Button>
        </div>
    );
};

export default NotificationPermissionManager;
