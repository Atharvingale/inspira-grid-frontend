import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

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

    // Get current user from Firebase Auth on the client side
    // Pusher auth happens from the browser, so we need to validate differently
    // For now, authorize all requests (in production, implement proper validation)
    
    // Try to get user info from Authorization header if present
    const authHeader = request.headers.get('authorization');
    let userId = 'anonymous';
    let userName = 'Anonymous User';
    let userEmail = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        // In a production app, verify this token properly
        // For now, we'll decode it client-side in the Pusher config
        userId = 'authenticated-user';
      } catch (error) {
        console.warn('Could not decode auth token for Pusher:', error);
      }
    }

    // Authorize the user for private/presence channels
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: userId,
      user_info: {
        name: userName,
        email: userEmail,
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
