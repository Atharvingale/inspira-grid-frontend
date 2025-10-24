"use client";

import { useState, useEffect } from 'react';
import { useNotifications } from '@/lib/NotificationContext';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Trash2, 
  Check, 
  CheckCheck,
  Filter,
  UserPlus,
  CheckCircle,
  XCircle,
  Folder,
  Users,
  MessageSquare,
  Settings,
  Calendar,
  RefreshCw
} from 'lucide-react';

const notificationIcons = {
  'application_received': UserPlus,
  'application_accepted': CheckCircle,
  'application_rejected': XCircle,
  'project_update': Folder,
  'new_team_member': Users,
  'project_completed': CheckCircle,
  'message': MessageSquare,
  'system': Settings
};

const notificationColors = {
  'application_received': 'text-blue-400 bg-blue-400/10',
  'application_accepted': 'text-green-400 bg-green-400/10',
  'application_rejected': 'text-red-400 bg-red-400/10',
  'project_update': 'text-purple-400 bg-purple-400/10',
  'new_team_member': 'text-green-400 bg-green-400/10',
  'project_completed': 'text-green-400 bg-green-400/10',
  'message': 'text-blue-400 bg-blue-400/10',
  'system': 'text-gray-400 bg-gray-400/10'
};

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
    hasUnreadNotifications
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    // Refresh notifications when component mounts
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter(notification => {
    const matchesReadFilter = filter === 'all' || 
      (filter === 'unread' && !notification.isRead) ||
      (filter === 'read' && notification.isRead);
    
    const matchesTypeFilter = !typeFilter || notification.type === typeFilter;
    
    return matchesReadFilter && matchesTypeFilter;
  });

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const formatTime = (notification: any) => {
    if (notification.timeAgo) return notification.timeAgo;
    if (notification.formattedTime) return notification.formattedTime;
    if (notification.createdAt && notification.createdAt._seconds) {
      return new Date(notification.createdAt._seconds * 1000).toLocaleDateString();
    }
    return 'Just now';
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-dark p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mx-auto mb-4" />
            <p className="text-text-tertiary">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-text-primary flex items-center">
                <Bell className="w-8 h-8 mr-3 text-brand-primary" />
                Notifications
              </h1>
              <p className="text-text-tertiary mt-2">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            
            {hasUnreadNotifications && (
              <motion.button
                onClick={handleMarkAllAsRead}
                className="flex items-center px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </motion.button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-tertiary">Filter:</span>
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
            
            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter(e.target.value || null)}
              className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            >
              <option value="">All Types</option>
              <option value="application_received">Application Received</option>
              <option value="application_accepted">Application Accepted</option>
              <option value="application_rejected">Application Rejected</option>
              <option value="project_update">Project Updates</option>
              <option value="new_team_member">New Team Member</option>
              <option value="message">Messages</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-secondary mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-text-tertiary">
                {filter === 'unread' 
                  ? 'All caught up! Check back later for new updates.'
                  : 'We\'ll notify you when something happens'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification, index) => {
              const IconComponent = notificationIcons[notification.type] || Bell;
              const iconClasses = notificationColors[notification.type] || 'text-gray-400 bg-gray-400/10';
              
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-dark-card border ${
                    !notification.isRead ? 'border-brand-primary/30 bg-brand-primary/5' : 'border-dark-border'
                  } rounded-xl p-6 relative hover:bg-white/5 transition-all`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-xl ${iconClasses} flex-shrink-0`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-text-primary mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-text-secondary text-sm leading-relaxed">
                            {notification.message}
                          </p>
                          
                          {/* Additional data */}
                          {notification.data?.projectTitle && (
                            <p className="text-text-muted text-xs mt-2">
                              Project: {notification.data.projectTitle}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-3 text-xs text-text-muted">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatTime(notification)}
                            </span>
                            {!notification.isRead && (
                              <span className="bg-brand-primary/20 text-brand-primary px-2 py-1 rounded-lg">
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <motion.button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-2 text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </motion.button>
                          )}
                          
                          <motion.button
                            onClick={() => handleDelete(notification.id)}
                            className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title="Delete notification"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}