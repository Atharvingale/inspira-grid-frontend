import { getFirestore } from '../firebase-admin';
import { initAdmin } from '../firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface EnrichedNotification extends NotificationData {
  id: string;
  timeAgo?: string;
  formattedTime?: string;
  icon?: string;
  color?: string;
}

class NotificationModel {
  private get collection() {
    initAdmin();
    const db = getFirestore();
    return db.collection('notifications');
  }

  // Create a new notification
  async create(notificationData: NotificationData) {
    try {
      const docRef = this.collection.doc();
      const notification = {
        id: docRef.id,
        ...notificationData,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await docRef.set(notification);
      return { id: docRef.id, ...notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notification by ID
  async getById(notificationId: string) {
    try {
      const doc = await this.collection.doc(notificationId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting notification:', error);
      throw error;
    }
  }

  // Get notifications by user
  async getByUser(userId: string, options: any = {}) {
    try {
      const { limit = 20, isRead, type, orderBy = 'createdAt', orderDirection = 'desc' } = options;

      let query: any = this.collection.where('userId', '==', userId);

      if (isRead !== undefined) {
        query = query.where('isRead', '==', isRead);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      query = query.orderBy(orderBy, orderDirection).limit(limit);

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      await this.collection.doc(notificationId).update({
        isRead: true,
        readAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      return this.getById(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      initAdmin();
      const db = getFirestore();
      const batch = db.batch();
      
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();

      let updatedCount = 0;
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
        updatedCount++;
      });

      await batch.commit();
      return { updatedCount };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async delete(notificationId: string) {
    try {
      await this.collection.doc(notificationId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get unread count for user
  async getUnreadCount(userId: string) {
    try {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();

      return { count: snapshot.size };
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Create application-related notification
  async createApplicationNotification(type: string, data: any) {
    const notificationData: NotificationData = {
      userId: data.userId,
      type: type,
      title: data.title,
      message: data.message,
      data: {
        applicationId: data.applicationId,
        projectId: data.projectId,
        projectTitle: data.projectTitle,
        applicantName: data.applicantName,
        ...data.additionalData
      }
    };

    return this.create(notificationData);
  }

  // Create project-related notification
  async createProjectNotification(type: string, data: any) {
    const notificationData: NotificationData = {
      userId: data.userId,
      type: type,
      title: data.title,
      message: data.message,
      data: {
        projectId: data.projectId,
        projectTitle: data.projectTitle,
        updateType: data.updateType,
        ...data.additionalData
      }
    };

    return this.create(notificationData);
  }

  // Get notifications with rich data
  async getNotificationsWithDetails(userId: string, options: any = {}): Promise<EnrichedNotification[]> {
    try {
      const notifications = await this.getByUser(userId, options);
      
      // Enrich notifications with additional data
      const enrichedNotifications = await Promise.all(
        notifications.map(async (notification: any) => {
          const enrichedNotification: any = { ...notification };

          // Add time formatting
          if (notification.createdAt && notification.createdAt._seconds) {
            enrichedNotification.timeAgo = this.getTimeAgo(new Date(notification.createdAt._seconds * 1000));
            enrichedNotification.formattedTime = new Date(notification.createdAt._seconds * 1000).toLocaleString();
          }

          // Add type-specific icons and colors
          enrichedNotification.icon = this.getNotificationIcon(notification.type);
          enrichedNotification.color = this.getNotificationColor(notification.type);

          return enrichedNotification;
        })
      );

      return enrichedNotifications;
    } catch (error) {
      console.error('Error getting notifications with details:', error);
      throw error;
    }
  }

  // Helper function to get time ago format
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const timeRanges: [number, string][] = [
      [31536000, 'year'],
      [2592000, 'month'],
      [86400, 'day'],
      [3600, 'hour'],
      [60, 'minute']
    ];

    for (const [seconds, unit] of timeRanges) {
      const interval = Math.floor(diffInSeconds / seconds);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }

    return 'Just now';
  }

  // Get notification icon based on type
  private getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'application_received': 'user-plus',
      'application_accepted': 'check-circle',
      'application_rejected': 'x-circle',
      'project_update': 'folder',
      'new_team_member': 'users',
      'project_completed': 'check-square',
      'message': 'message-circle',
      'system': 'bell'
    };

    return icons[type] || 'bell';
  }

  // Get notification color based on type
  private getNotificationColor(type: string): string {
    const colors: Record<string, string> = {
      'application_received': 'blue',
      'application_accepted': 'green',
      'application_rejected': 'red',
      'project_update': 'purple',
      'new_team_member': 'green',
      'project_completed': 'green',
      'message': 'blue',
      'system': 'gray'
    };

    return colors[type] || 'gray';
  }
}

export default new NotificationModel();
