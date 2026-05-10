import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import NotificationModel from '@/lib/models/Notification';

// PATCH /api/notifications/read-all - Mark all notifications as read
export const PATCH = withAuth(async (request: NextRequest, user) => {
  try {
    const result = await NotificationModel.markAllAsRead(user.uid);
    
    return NextResponse.json({
      success: true,
      message: `${result.updatedCount} notifications marked as read`,
      data: result
    });
  } catch (error) {
    console.error('[notifications/read-all/route.ts]', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error marking all notifications as read',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});
