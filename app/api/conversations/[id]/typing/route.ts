import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { triggerPusherEvent } from '@/lib/pusher';

// POST /api/conversations/[id]/typing - Update typing indicator
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateFirebaseToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || (action !== 'start' && action !== 'stop')) {
      return NextResponse.json(
        { error: 'Valid action (start/stop) is required' },
        { status: 400 }
      );
    }

    // TODO: Get actual conversation participants
    const participantIds = [user.uid]; // Mock

    const eventName = action === 'start' ? 'typing:start' : 'typing:stop';
    const eventData = action === 'start'
      ? {
          conversationId,
          userId: user.uid,
          userName: user.displayName || 'Unknown User'
        }
      : {
          conversationId,
          userId: user.uid
        };

    // Trigger Pusher event for all participants except the sender
    for (const participantId of participantIds) {
      if (participantId !== user.uid) {
        await triggerPusherEvent(
          `private-user-${participantId}`,
          eventName,
          eventData
        );
      }
    }

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    console.error('Error updating typing indicator:', error);
    return NextResponse.json(
      { error: 'Failed to update typing indicator', message: error.message },
      { status: 500 }
    );
  }
}
