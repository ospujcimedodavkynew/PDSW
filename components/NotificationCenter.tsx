import React, { useState, useMemo } from 'react';
import { Bell, Check, Info, AlertTriangle } from 'lucide-react';
import type { Notification, Page } from '../types';

interface NotificationCenterProps {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onNotificationClick: (notification: Notification) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onMarkAsRead, onMarkAllAsRead, onNotificationClick }) => {
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    const timeSince = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " r";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " m";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " min";
        return "právě teď";
    };

    const handleItemClick = (notification: Notification) => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
        onNotificationClick(notification);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center ring-2 ring-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
                    <div className="p-3 flex justify-between items-center border-b">
                        <h3 className="font-semibold text-gray-800">Upozornění</h3>
                        <button
                            onClick={onMarkAllAsRead}
                            disabled={unreadCount === 0}
                            className="text-sm text-primary hover:underline disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                        >
                            <Check className="w-4 h-4 mr-1"/> Označit vše jako přečtené
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleItemClick(n)}
                                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer flex items-start ${!n.isRead ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="mr-3 mt-1">
                                        {n.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-500" /> : <Info className="w-5 h-5 text-blue-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-800">{n.message}</p>
                                        <p className="text-xs text-gray-500 mt-1">{timeSince(n.createdAt)}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 p-6">Nemáte žádná nová upozornění.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
