import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import NotificationModel from '@/lib/models/Notification';

// GET /api/notifications - Get all notifications for the authenticated user
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');

    const options = {
      limit: parseInt(limit.toString()),
      orderBy: 'createdAt',
      orderDirection: 'desc'
    } as any;

    if (isRead !== null) {
      options.isRead = isRead === 'true';
    }

    if (type) {
      options.type = type;
    }

    const notifications = await NotificationModel.getNotificationsWithDetails(user.uid, options);
    
    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('[notifications/route.ts]', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching notifications',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});
