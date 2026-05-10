import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { triggerPusherEvent } from '@/lib/pusher';

// PATCH /api/conversations/[id]/messages/[messageId] - Edit message or add/remove reaction
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await validateFirebaseToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: conversationId, messageId } = await params;
    const body = await request.json();
    const { action, content, emoji } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    let message;
    let eventName = 'message:updated';

    if (action === 'edit') {
      if (!content) {
        return NextResponse.json(
          { error: 'Content is required for editing' },
          { status: 400 }
        );
      }

      // TODO: Implement Firebase message update
      message = {
        id: messageId,
        conversationId,
        content,
        edited: true,
        editedAt: new Date()
      };
    } else if (action === 'addReaction' || action === 'removeReaction') {
      if (!emoji) {
        return NextResponse.json(
          { error: 'Emoji is required for reactions' },
          { status: 400 }
        );
      }

      // TODO: Implement Firebase reaction update
      message = {
        id: messageId,
        conversationId,
        reactions: [] // Should contain updated reactions
      };

      eventName = action === 'addReaction' ? 'reaction:added' : 'reaction:removed';
    }

    // TODO: Get actual conversation participants
    const participantIds = [user.uid];

    // Trigger Pusher event
    for (const participantId of participantIds) {
      await triggerPusherEvent(
        `private-user-${participantId}`,
        eventName,
        action === 'addReaction' || action === 'removeReaction'
          ? { conversationId, messageId, emoji, userId: user.uid }
          : message
      );
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('[conversations/[id]/messages/[messageId]/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to update message', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id]/messages/[messageId] - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await validateFirebaseToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: conversationId, messageId } = await params;

    // TODO: Implement Firebase message deletion (soft delete)
    const message = {
      id: messageId,
      conversationId,
      isDeleted: true,
      content: 'Message deleted',
      deletedAt: new Date()
    };

    // TODO: Get actual conversation participants
    const participantIds = [user.uid];

    // Trigger Pusher event
    for (const participantId of participantIds) {
      await triggerPusherEvent(
        `private-user-${participantId}`,
        'message:deleted',
        { conversationId, messageId }
      );
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('[conversations/[id]/messages/[messageId]/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to delete message', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
}
