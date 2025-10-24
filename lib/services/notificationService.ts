import { BaseService } from './baseService';
import type {
  Notification,
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

/**
 * Notification service for handling all notification-related API operations
 */
class NotificationService extends BaseService {
  constructor() {
    super('/api');
  }

  /**
   * Get notifications for current user
   */
  async getNotifications(
    isRead?: boolean,
    type?: string,
    limit: number = 20
  ): Promise<ApiResponse<{ data: Notification[]; count: number }>> {
    const params = new URLSearchParams();
    if (isRead !== undefined) params.append('isRead', isRead.toString());
    if (type) params.append('type', type);
    if (limit) params.append('limit', limit.toString());
    
    const endpoint = `/notifications${params.toString() ? '?' + params.toString() : ''}`;
    return this.get<{ data: Notification[]; count: number }>(endpoint);
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string): Promise<ApiResponse<Notification>> {
    return this.get<Notification>(`/notifications/${notificationId}`);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
    return this.patch<Notification>(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<{ updatedCount: number }>> {
    return this.patch<{ updatedCount: number }>('/notifications/read-all');
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<ApiResponse<{ updatedCount: number }>> {
    return this.patch<{ updatedCount: number }>('/notifications/bulk-read', {
      notificationIds,
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/notifications/${notificationId}`);
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultipleNotifications(notificationIds: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    return this.post<{ deletedCount: number }>('/notifications/bulk-delete', {
      notificationIds,
    });
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<ApiResponse<{ deletedCount: number }>> {
    return this.delete<{ deletedCount: number }>('/notifications');
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<ApiResponse<{ data: { count: number } }>> {
    return this.get<{ data: { count: number } }>('/notifications/count/unread');
  }

  /**
   * Get notification counts by type
   */
  async getCountsByType(): Promise<ApiResponse<{
    application: number;
    project_update: number;
    team_invite: number;
    message: number;
    system: number;
    total: number;
  }>> {
    return this.get('/notifications/counts-by-type');
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResponse<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    inAppNotifications: boolean;
    applicationUpdates: boolean;
    projectUpdates: boolean;
    teamInvites: boolean;
    messages: boolean;
    systemUpdates: boolean;
    marketingEmails: boolean;
    weeklyDigest: boolean;
  }>> {
    return this.get('/notifications/preferences');
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    inAppNotifications?: boolean;
    applicationUpdates?: boolean;
    projectUpdates?: boolean;
    teamInvites?: boolean;
    messages?: boolean;
    systemUpdates?: boolean;
    marketingEmails?: boolean;
    weeklyDigest?: boolean;
  }): Promise<ApiResponse<{
    emailNotifications: boolean;
    pushNotifications: boolean;
    inAppNotifications: boolean;
    applicationUpdates: boolean;
    projectUpdates: boolean;
    teamInvites: boolean;
    messages: boolean;
    systemUpdates: boolean;
    marketingEmails: boolean;
    weeklyDigest: boolean;
  }>> {
    return this.patch('/notifications/preferences', preferences);
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/notifications/subscribe-push', {
      subscription,
    });
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>('/notifications/push-subscription');
  }

  /**
   * Test push notification
   */
  async testPushNotification(): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>('/notifications/test-push');
  }

  /**
   * Snooze notifications for a specified duration
   */
  async snoozeNotifications(duration: number): Promise<ApiResponse<{ snoozedUntil: Date }>> {
    return this.post<{ snoozedUntil: Date }>('/notifications/snooze', {
      duration, // in minutes
    });
  }

  /**
   * Unsnooze notifications
   */
  async unsnoozeNotifications(): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>('/notifications/snooze');
  }

  /**
   * Get notification templates (for admin)
   */
  async getNotificationTemplates(): Promise<ApiResponse<Array<{
    id: string;
    type: string;
    subject: string;
    bodyTemplate: string;
    variables: string[];
    isActive: boolean;
  }>>> {
    return this.get('/notifications/templates');
  }

  /**
   * Create custom notification (for admin/system use)
   */
  async createNotification(data: {
    userId: string;
    type: 'application' | 'project_update' | 'team_invite' | 'message' | 'system';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<ApiResponse<Notification>> {
    return this.post<Notification>('/notifications/create', data);
  }

  /**
   * Send bulk notifications (for admin use)
   */
  async sendBulkNotifications(data: {
    userIds: string[];
    type: 'application' | 'project_update' | 'team_invite' | 'message' | 'system';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<ApiResponse<{ sentCount: number; failedCount: number }>> {
    return this.post('/notifications/bulk-send', data);
  }

  /**
   * Get notification statistics (for user analytics)
   */
  async getNotificationStats(): Promise<ApiResponse<{
    totalReceived: number;
    totalRead: number;
    readRate: number;
    byType: Record<string, number>;
    byMonth: Array<{ month: string; count: number }>;
    averageResponseTime: number; // time to read in minutes
  }>> {
    return this.get('/notifications/stats');
  }

  /**
   * Archive old notifications
   */
  async archiveOldNotifications(olderThanDays: number = 30): Promise<ApiResponse<{ archivedCount: number }>> {
    return this.post<{ archivedCount: number }>('/notifications/archive-old', {
      olderThanDays,
    });
  }

  /**
   * Get archived notifications
   */
  async getArchivedNotifications(
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    const endpoint = this.buildEndpoint('/notifications/archived', pagination);
    return this.get<PaginatedResponse<Notification>>(endpoint);
  }

  /**
   * Restore archived notification
   */
  async restoreNotification(notificationId: string): Promise<ApiResponse<Notification>> {
    return this.patch<Notification>(`/notifications/${notificationId}/restore`);
  }

  /**
   * Export notifications data
   */
  async exportNotifications(format: 'json' | 'csv' = 'json'): Promise<ApiResponse<{ downloadUrl: string }>> {
    return this.get(`/notifications/export?format=${format}`);
  }

  /**
   * Get real-time notification feed (Server-Sent Events)
   */
  async getNotificationStream(): Promise<EventSource> {
    // Get auth headers for SSE connection
    const headers = await import('@/lib/api').then(m => m.authHeaders());
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${baseUrl}/api/notifications/stream/realtime`;
    
    // For SSE with auth, we need to pass the token as a query parameter
    // since EventSource doesn't support custom headers
    const authToken = headers.Authorization?.replace('Bearer ', '');
    const urlWithAuth = authToken ? `${url}?token=${authToken}` : url;
    
    return new EventSource(urlWithAuth);
  }

  /**
   * Get notification digest (summary for email)
   */
  async getNotificationDigest(
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<ApiResponse<{
    period: string;
    totalNotifications: number;
    unreadCount: number;
    highlights: Array<{
      type: string;
      count: number;
      latestMessage: string;
    }>;
    topProjects: Array<{
      projectId: string;
      projectTitle: string;
      notificationCount: number;
    }>;
  }>> {
    return this.get(`/notifications/digest?period=${period}`);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();