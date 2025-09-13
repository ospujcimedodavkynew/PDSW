import React from 'react';
import NotificationCenter from './NotificationCenter';
import type { Notification, Page } from '../types';

interface HeaderProps {
    title: string;
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onNotificationClick: (notification: Notification) => void;
}

const Header: React.FC<HeaderProps> = ({ title, notifications, onMarkAsRead, onMarkAllAsRead, onNotificationClick }) => {
    return (
        <header className="bg-white shadow-sm p-4 flex justify-between items-center flex-shrink-0 z-10 border-b">
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <div className="flex items-center">
                <NotificationCenter
                    notifications={notifications}
                    onMarkAsRead={onMarkAsRead}
                    onMarkAllAsRead={onMarkAllAsRead}
                    onNotificationClick={onNotificationClick}
                />
            </div>
        </header>
    );
};

export default Header;
