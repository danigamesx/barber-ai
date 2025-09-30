import React, { useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../../App';
import { ClientNotification } from '../../types';

const ClientNotificationsScreen: React.FC = () => {
    const { user, markNotificationsAsRead } = useContext(AppContext);

    // Marcar todas as notificações como lidas ao visitar a tela
    useEffect(() => {
        const notifications = user?.notifications as ClientNotification[] | undefined;
        const unreadIds = (notifications || []).filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
            markNotificationsAsRead(unreadIds);
        }
    }, [user?.notifications, markNotificationsAsRead]);

    const sortedNotifications = useMemo(() => {
        const notifications = user?.notifications as ClientNotification[] | undefined;
        return [...(notifications || [])].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    }, [user?.notifications]);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-6 text-brand-light">Notificações</h1>

            <div className="space-y-4">
                {sortedNotifications.length > 0 ? (
                    sortedNotifications.map(notification => (
                        <div key={notification.id} className="bg-brand-secondary p-4 rounded-lg">
                            <p className="text-xs text-gray-400">{notification.barbershopName}</p>
                            <h2 className="font-bold text-lg text-brand-primary mt-1">{notification.title}</h2>
                            <p className="text-gray-300 mt-2 text-sm">{notification.message}</p>
                            <p className="text-xs text-gray-500 text-right mt-3">
                                {new Date(notification.receivedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-400">Você não tem nenhuma notificação.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientNotificationsScreen;