import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface Notification {
  id: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    fetchNotifications();
    subscribeToNotifications();
  }, [userProfile]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userProfile!.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setNotifications(data);
  };

  const subscribeToNotifications = () => {
    const subscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userProfile!.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  };

  const markAsRead = async () => {
    if (!userProfile) return;
    
    // Optimistic update
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  };

  const toggleOpen = () => {
    if (!isOpen) {
      markAsRead();
    }
    setIsOpen(!isOpen);
  };

  const close = () => setIsOpen(false);

  return {
    notifications,
    isOpen,
    unreadCount: notifications.filter(n => !n.is_read).length,
    toggleOpen,
    close,
    setIsOpen
  };
};
