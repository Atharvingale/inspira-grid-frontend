import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { triggerPusherEvent } from '@/lib/pusher';
import { initAdmin, getFirestore } from '@/lib/firebase-admin';

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(
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

    // Get messages
    const messagesSnapshot = await db.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }));

    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', message: error.message },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Send a message
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
    const { content, type, replyTo, fileUrl, fileName, fileSize } = body;

    if (!content && !fileUrl) {
      return NextResponse.json(
        { error: 'Message content or file is required' },
        { status: 400 }
      );
    }

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

    // Get user details
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    
    console.log('User data for message:', {
      uid: user.uid,
      photoURL: userData?.photoURL,
      profilePicture: userData?.profilePicture,
      firebasePhotoURL: user.photoURL
    });

    // Create message
    const messageData = {
      conversationId,
      content: content || '',
      senderId: user.uid,
      senderName: userData?.displayName || userData?.name || user.displayName || 'Unknown User',
      senderPhoto: userData?.photoURL || userData?.profilePicture || user.photoURL || null,
      timestamp: new Date(),
      type: type || 'text',
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      reactions: [],
      replyTo: replyTo || null,
      edited: false,
      isDeleted: false
    };

    const messageRef = await db.collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .add(messageData);

    // Update conversation's last message and increment unread counts for other participants
    const currentUnreadCounts = convData.unreadCounts || {};
    const updatedUnreadCounts: { [key: string]: number } = {};
    
    // Increment unread count for all participants except the sender
    for (const participantId of convData.participantIds) {
      if (participantId === user.uid) {
        updatedUnreadCounts[participantId] = 0; // Sender has 0 unread
      } else {
        updatedUnreadCounts[participantId] = (currentUnreadCounts[participantId] || 0) + 1;
      }
    }
    
    await db.collection('conversations').doc(conversationId).update({
      lastMessageId: messageRef.id,
      updatedAt: new Date(),
      unreadCounts: updatedUnreadCounts
    });

    const message = {
      id: messageRef.id,
      ...messageData
    };

    // Get updated conversation data for Pusher
    const updatedConvDoc = await db.collection('conversations').doc(conversationId).get();
    const updatedConvData = updatedConvDoc.data();
    
    // Trigger Pusher event for all participants in the conversation
    for (const participantId of convData.participantIds) {
      // Send new message event
      await triggerPusherEvent(
        `private-user-${participantId}`,
        'message:new',
        message
      );
      
      // Send conversation update event to update unread counts
      await triggerPusherEvent(
        `private-user-${participantId}`,
        'conversation:updated',
        {
          id: conversationId,
          unreadCount: updatedUnreadCounts[participantId] || 0,
          lastMessage: message,
          updatedAt: new Date()
        }
      );
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', message: error.message },
      { status: 500 }
    );
  }
}
