import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { validateFirebaseToken } from '@/lib/middleware/auth';

// POST /api/pusher/auth - Authenticate Pusher private/presence channels
export async function POST(request: NextRequest) {
  try {
    // Pusher sends socket_id and channel_name in the body
    const body = await request.text();
    const params = new URLSearchParams(body);
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      console.error('Pusher auth missing params:', { socketId, channelName });
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    const user = await validateFirebaseToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Only a user's own private channel may be authorized from this endpoint.
    const expectedChannel = `private-user-${user.uid}`;
    if (channelName !== expectedChannel) {
      return NextResponse.json({ success: false, error: 'Channel access denied' }, { status: 403 });
    }

    // Authorize the user for private/presence channels
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: user.uid,
      user_info: {
        name: user.displayName || 'Inspira Grid user',
        email: user.email || '',
      },
    });

    return NextResponse.json(authResponse);
  } catch (error: any) {
    console.error('Pusher auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', message: error.message },
      { status: 500 }
    );
  }
}
