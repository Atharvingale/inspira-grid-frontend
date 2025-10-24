import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import NotificationModel from '@/lib/models/Notification';

// GET /api/notifications/count/unread - Get unread notifications count
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const result = await NotificationModel.getUnreadCount(user.uid);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error getting unread count',
        error: error.message
      },
      { status: 500 }
    );
  }
});
