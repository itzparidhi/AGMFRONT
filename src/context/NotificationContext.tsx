import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import type { Review } from '../types';

interface NotificationContextType {
  notifications: string[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'PE') return;

    const subscription = supabase
      .channel('public:reviews')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews' }, (payload) => {
        const newReview = payload.new as Review;
        // Note: payload.old might be empty if replica identity is not set to full.
        // But we can check if newReview has false.
        
        if (newReview.pm_vote === false) {
           addNotification('PM rejected a version.');
        }
        if (newReview.cd_vote === false) {
           addNotification('CD rejected a version.');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [userProfile]);

  const addNotification = (msg: string) => {
    // Simple debounce or check to avoid duplicates if needed, but for now just add
    setNotifications(prev => [...prev, msg]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {notifications.map((msg, i) => (
          <div key={i} className="bg-red-600 text-white px-4 py-2 rounded shadow-lg">
            {msg}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
