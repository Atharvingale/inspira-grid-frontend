import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import NotificationModel from '@/lib/models/Notification';

// GET /api/notifications/[id] - Get notification by ID
export const GET = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

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

    // Check if the notification belongs to the authenticated user
    if (notification.userId !== user.uid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Access denied'
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification
    });
  } catch (error: any) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching notification',
        error: error.message
      },
      { status: 500 }
    );
  }
});

// DELETE /api/notifications/[id] - Delete notification
export const DELETE = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
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

    await NotificationModel.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error deleting notification',
        error: error.message
      },
      { status: 500 }
    );
  }
});
