import React from 'react';
import type { Notification } from '../hooks/useNotifications';

interface Props {
  notification: Notification;
  onClick: () => void;
}

export const NotificationItem: React.FC<Props> = ({ notification, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`p-3 text-sm border-l-2 transition-all ${notification.is_read
        ? 'text-zinc-300 border-transparent hover:bg-white/5'
        : 'text-white bg-white/10 border-white hover:bg-white/20'
        } ${notification.link ? 'cursor-pointer' : ''}`}
    >
      <span className="font-body text-base">{notification.message}</span>
      <div className="text-xs text-zinc-400 mt-1 font-mono opacity-100">
        {new Date(notification.created_at).toLocaleString()}
      </div>
    </div>
  );
};
