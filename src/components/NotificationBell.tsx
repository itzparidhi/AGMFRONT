import React, { useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, isOpen, unreadCount, toggleOpen, close } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [close]);

  const handleItemClick = (link?: string) => {
    if (link) {
      navigate(link);
      close();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-xs flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 glass-panel z-50 max-h-96 overflow-y-auto rounded-2xl">
          <div className="p-3 border-b border-white/10 font-bold text-sm text-white font-subheading tracking-wider bg-white/5 backdrop-blur-md">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onClick={() => handleItemClick(n.link)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
