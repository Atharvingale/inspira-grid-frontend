import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import NotificationModel from '@/lib/models/Notification';

// PATCH /api/notifications/[id]/read - Mark notification as read
export const PATCH = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const { id } = params;

    // First check if notification exists and belongs to user
    const notification = await NotificationModel.getById(id);
    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: 'Notification not found'
        },
        { status: 404 }
      );
    }

    if (notification.userId !== user.uid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Access denied'
        },
        { status: 403 }
      );
    }

    const updatedNotification = await NotificationModel.markAsRead(id);
    
    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
      data: updatedNotification
    });
  } catch (error) {
    console.error('[notifications/[id]/read/route.ts]', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error marking notification as read',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});
