"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from './services/notificationService';
import { getPusherClient } from './pusher';
import type PusherClient from 'pusher-js';
import type { Channel } from 'pusher-js';

// Enhanced notification interface matching our backend
interface NotificationData {
  id: string;
  userId: string;
  type: 'application_received' | 'application_accepted' | 'application_rejected' | 'project_update' | 'new_team_member' | 'project_completed' | 'message' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  data?: {
    applicationId?: string;
    projectId?: string;
    projectTitle?: string;
    applicantName?: string;
    reviewNote?: string;
    updateType?: string;
    [key: string]: any;
  };
  // Enhanced fields from backend
  timeAgo?: string;
  formattedTime?: string;
  icon?: string;
  color?: string;
}

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: (isRead?: boolean, type?: string, limit?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearError: () => void;
  
  // Real-time functionality
  setupRealTimeUpdates: () => void;
  cleanupRealTimeUpdates: () => void;
  
  // Utility
  getNotificationsByType: (type: string) => NotificationData[];
  hasUnreadNotifications: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pusherClient, setPusherClient] = useState<PusherClient | null>(null);
  const [userChannel, setUserChannel] = useState<Channel | null>(null);
  
  const { currentUser } = useAuth();

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (isRead?: boolean, type?: string, limit: number = 20) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await notificationService.getNotifications(isRead, type, limit);
      
      if (response.success && response.data) {
        setNotifications((response.data.data || []) as unknown as NotificationData[]);
        
        // Update unread count if fetching all notifications
        if (isRead === undefined) {
          const unread = (response.data.data || []).filter(n => !n.isRead).length;
          setUnreadCount(unread);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch unread count separately for better performance
  const fetchUnreadCount = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.data.count);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [currentUser]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser) return;
    
    try {
      const response = await notificationService.markAsRead(notificationId);
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true } 
              : notif
          )
        );
        
        // Decrease unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, [currentUser]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const response = await notificationService.markAllAsRead();
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, [currentUser]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!currentUser) return;
    
    try {
      const response = await notificationService.deleteNotification(notificationId);
      
      if (response.success) {
        // Find the notification being deleted
        const deletedNotification = notifications.find(n => n.id === notificationId);
        
        // Update local state
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        
        // Decrease unread count if the deleted notification was unread
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  }, [currentUser, notifications]);

  // Setup real-time updates via Pusher
  const setupRealTimeUpdates = useCallback(async () => {
    if (!currentUser || pusherClient) return;
    
    try {
      const client = getPusherClient();
      if (!client) {
        console.warn('Pusher client not available');
        return;
      }
      
      setPusherClient(client);
      
      // Subscribe to user's private channel for notifications
      const channel = client.subscribe(`private-user-${currentUser.uid}`);
      setUserChannel(channel);
      
      // Handle connection state
      client.connection.bind('connected', () => {
      });
      
      client.connection.bind('error', (err: any) => {
        console.error('Pusher connection error:', err);
      });
      
      // Listen for new notifications
      channel.bind('new-notification', (data: NotificationData) => {
        console.log('📬 New notification received:', data);
        setNotifications(prev => [data, ...prev]);
        if (!data.isRead) {
          setUnreadCount(prev => prev + 1);
        }
      });
      
      // Listen for notification updates (mark as read, etc.)
      channel.bind('notification-updated', (data: { id: string; isRead: boolean }) => {
        console.log('🔄 Notification updated:', data);
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === data.id ? { ...notif, isRead: data.isRead } : notif
          )
        );
        if (data.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      });
      
      // Listen for notification deletion
      channel.bind('notification-deleted', (data: { id: string }) => {
        console.log('🗑️ Notification deleted:', data);
        const deletedNotif = notifications.find(n => n.id === data.id);
        setNotifications(prev => prev.filter(notif => notif.id !== data.id));
        if (deletedNotif && !deletedNotif.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      });
      
      // Listen for bulk updates (mark all as read)
      channel.bind('notifications-bulk-update', (data: { action: string }) => {
        console.log('📝 Bulk notification update:', data);
        if (data.action === 'mark-all-read') {
          setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
          setUnreadCount(0);
        }
      });
      
    } catch (err) {
      console.error('Error setting up Pusher real-time updates:', err);
    }
  }, [currentUser, pusherClient, notifications]);

  // Cleanup real-time updates
  const cleanupRealTimeUpdates = useCallback(() => {
    if (userChannel) {
      userChannel.unbind_all();
      userChannel.unsubscribe();
      setUserChannel(null);
    }
    if (pusherClient) {
      pusherClient.disconnect();
      setPusherClient(null);
      console.log('📡 Pusher disconnected');
    }
  }, [userChannel, pusherClient]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(notif => notif.type === type);
  }, [notifications]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      fetchUnreadCount();
      setupRealTimeUpdates();
    } else {
      // Clear state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      cleanupRealTimeUpdates();
    }

    return () => {
      cleanupRealTimeUpdates();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRealTimeUpdates();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearError,
    setupRealTimeUpdates,
    cleanupRealTimeUpdates,
    getNotificationsByType,
    hasUnreadNotifications: unreadCount > 0,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Legacy compatibility with socket context interface
export const useSocket = () => {
  const notificationContext = useNotifications();
  
  // Return a compatible interface for components expecting socket context
  return {
    notifications: notificationContext.notifications.map(notif => ({
      id: notif.id,
      message: notif.message,
      time: notif.timeAgo || notif.formattedTime || 'Just now',
      read: notif.isRead,
      type: notif.type as any
    })),
    socket: null,
    isConnected: true, // Always true for REST API
    onlineUsers: new Set<string>(),
    joinTeamRoom: () => {},
    leaveTeamRoom: () => {},
    joinProjectRoom: () => {},
    leaveProjectRoom: () => {},
    joinConversationRoom: () => {},
    leaveConversationRoom: () => {},
    joinCollaboration: () => {},
    leaveCollaboration: () => {},
    broadcastCollaborationEvent: () => {},
    sendMessage: () => {},
    startTyping: () => {},
    stopTyping: () => {},
    markNotificationAsRead: notificationContext.markAsRead,
    clearAllNotifications: notificationContext.markAllAsRead,
    isUserOnline: () => false,
    emit: () => {},
    on: () => {},
    off: () => {}
  };
};
