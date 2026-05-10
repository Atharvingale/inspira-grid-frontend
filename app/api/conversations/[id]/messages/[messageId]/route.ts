import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { triggerPusherEvent } from '@/lib/pusher';
import { initAdmin, getFirestore } from '@/lib/firebase-admin';

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

      initAdmin();
      const db = getFirestore();
      const messageRef = db.collection('conversations').doc(conversationId).collection('messages').doc(messageId);
      const messageDoc = await messageRef.get();

      if (!messageDoc.exists) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      if (messageDoc.data()?.senderId !== user.uid) {
        return NextResponse.json({ error: 'Unauthorized to edit this message' }, { status: 403 });
      }

      await messageRef.update({
        content,
        edited: true,
        editedAt: new Date()
      });

      message = {
        id: messageId,
        ...messageDoc.data(),
        content,
        edited: true,
        editedAt: new Date(),
        timestamp: messageDoc.data()?.timestamp?.toDate() || new Date()
      };
    } else if (action === 'addReaction' || action === 'removeReaction') {
      if (!emoji) {
        return NextResponse.json(
          { error: 'Emoji is required for reactions' },
          { status: 400 }
        );
      }

      initAdmin();
      const db = getFirestore();
      const messageRef = db.collection('conversations').doc(conversationId).collection('messages').doc(messageId);
      const messageDoc = await messageRef.get();

      if (!messageDoc.exists) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      const currentReactions = messageDoc.data()?.reactions || [];
      let updatedReactions = [...currentReactions];

      if (action === 'addReaction') {
        const existingReactionIndex = updatedReactions.findIndex((r: any) => r.emoji === emoji);
        if (existingReactionIndex >= 0) {
          if (!updatedReactions[existingReactionIndex].users.includes(user.uid)) {
            updatedReactions[existingReactionIndex].users.push(user.uid);
            updatedReactions[existingReactionIndex].count += 1;
          }
        } else {
          updatedReactions.push({
            emoji,
            users: [user.uid],
            count: 1
          });
        }
      } else if (action === 'removeReaction') {
        const existingReactionIndex = updatedReactions.findIndex((r: any) => r.emoji === emoji);
        if (existingReactionIndex >= 0) {
          updatedReactions[existingReactionIndex].users = updatedReactions[existingReactionIndex].users.filter((uid: string) => uid !== user.uid);
          updatedReactions[existingReactionIndex].count -= 1;
          if (updatedReactions[existingReactionIndex].count <= 0) {
            updatedReactions.splice(existingReactionIndex, 1);
          }
        }
      }

      await messageRef.update({
        reactions: updatedReactions
      });

      message = {
        id: messageId,
        ...messageDoc.data(),
        reactions: updatedReactions,
        timestamp: messageDoc.data()?.timestamp?.toDate() || new Date()
      };

      eventName = action === 'addReaction' ? 'reaction:added' : 'reaction:removed';
    }

    initAdmin();
    const db = getFirestore();
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    const participantIds = convDoc.data()?.participantIds || [user.uid];

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

    initAdmin();
    const db = getFirestore();

    const messageRef = db.collection('conversations').doc(conversationId).collection('messages').doc(messageId);
    const messageDoc = await messageRef.get();

    if (!messageDoc.exists) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (messageDoc.data()?.senderId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized to delete this message' }, { status: 403 });
    }

    // Soft delete
    await messageRef.update({
      isDeleted: true,
      content: 'Message unsent',
      deletedAt: new Date(),
      fileUrl: null // Remove attachments if any
    });

    const message = {
      id: messageId,
      conversationId,
      isDeleted: true,
      content: 'Message unsent',
      deletedAt: new Date()
    };

    const convDoc = await db.collection('conversations').doc(conversationId).get();
    const participantIds = convDoc.data()?.participantIds || [user.uid];

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
