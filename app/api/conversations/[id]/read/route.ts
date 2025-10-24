import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { initAdmin, getFirestore } from '@/lib/firebase-admin';
import { triggerPusherEvent } from '@/lib/pusher';

// POST /api/conversations/[id]/read - Mark all messages in conversation as read
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

    initAdmin();
    const db = getFirestore();

    // Verify user is participant
    const convDoc = await db.collection('conversations').doc(conversationId).get();
    if (!convDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const convData = convDoc.data();
    if (!convData?.participantIds.includes(user.uid)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all unread messages in this conversation (messages not sent by current user)
    const messagesSnapshot = await db.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .where('senderId', '!=', user.uid)
      .get();

    const batch = db.batch();
    const updatedMessages: string[] = [];

    messagesSnapshot.docs.forEach(doc => {
      const messageData = doc.data();
      const readBy = messageData.readBy || [];
      
      // Only update if user hasn't read this message yet
      if (!readBy.includes(user.uid)) {
        batch.update(doc.ref, {
          readBy: [...readBy, user.uid]
        });
        updatedMessages.push(doc.id);
      }
    });

    // Commit batch update
    if (updatedMessages.length > 0) {
      await batch.commit();
    }

    // Update conversation's unread count
    const currentUnreadCounts = convData.unreadCounts || {};
    currentUnreadCounts[user.uid] = 0;
    
    await db.collection('conversations').doc(conversationId).update({
      unreadCounts: currentUnreadCounts
    });

    // Trigger Pusher event to notify other participants that messages were read
    if (updatedMessages.length > 0) {
      for (const participantId of convData.participantIds) {
        if (participantId !== user.uid) {
          await triggerPusherEvent(
            `private-user-${participantId}`,
            'messages:read',
            {
              conversationId,
              userId: user.uid,
              messageIds: updatedMessages,
              timestamp: new Date()
            }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      markedAsRead: updatedMessages.length
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read', message: error.message },
      { status: 500 }
    );
  }
}
