import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { triggerPusherEvent } from '@/lib/pusher';

// POST /api/messages/send
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { conversationId, message, messageType = 'text' } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'conversationId and message are required' },
        { status: 400 }
      );
    }

    if (message.length < 1 || message.length > 1000) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Message must be 1-1000 characters' },
        { status: 400 }
      );
    }

    initAdmin();
    const db = getFirestore();
    
    // Check conversation access
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    if (!conversationData?.participantIds?.includes(user.uid)) {
      return NextResponse.json({ error: 'Access denied to this conversation' }, { status: 403 });
    }

    // Create message
    const messageRef = db.collection('messages').doc();
    const messageData = {
      id: messageRef.id,
      conversationId,
      senderId: user.uid,
      senderName: user.displayName || user.email?.split('@')[0] || 'User',
      message: message.trim(),
      messageType,
      readBy: [user.uid],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await messageRef.set(messageData);

    // Update conversation's last message
    await db.collection('conversations').doc(conversationId).update({
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessage: message.trim(),
      lastMessageSender: user.displayName || 'User',
    });

    // Trigger Pusher event for real-time delivery
    try {
      await triggerPusherEvent(`private-conversation-${conversationId}`, 'new-message', {
        ...messageData,
        createdAt: new Date().toISOString(),
      });
    } catch (pusherError) {
    console.error('[messages/send/route.ts]', pusherError);

      // Don't fail the request if Pusher fails
    }

    return NextResponse.json({
      message: 'Message sent successfully',
      data: {
        ...messageData,
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[messages/send/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to send message', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
