import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { triggerPusherEvent } from '@/lib/pusher';
import { initAdmin, getFirestore } from '@/lib/firebase-admin';

// GET /api/conversations - Get all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const user = await validateFirebaseToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    initAdmin();
    const db = getFirestore();

    // Get conversations where user is a participant
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef
      .where('participantIds', 'array-contains', user.uid)
      .orderBy('updatedAt', 'desc')
      .get();

    const conversations = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get participant details
        const participantPromises = data.participantIds.map(async (id: string) => {
          const userDoc = await db.collection('users').doc(id).get();
          const userData = userDoc.data();
          return {
            id,
            name: userData?.displayName || userData?.name || 'Unknown',
            email: userData?.email || '',
            photoURL: userData?.photoURL || userData?.profilePicture || null,
            isOnline: userData?.isOnline || false,
            lastSeen: userData?.lastSeen || null
          };
        });

        const participants = await Promise.all(participantPromises);

        // Get last message
        let lastMessage = null;
        if (data.lastMessageId) {
          const msgDoc = await db.collection('conversations').doc(doc.id).collection('messages').doc(data.lastMessageId).get();
          if (msgDoc.exists) {
            const msgData = msgDoc.data();
            lastMessage = {
              id: msgDoc.id,
              ...msgData,
              timestamp: msgData?.timestamp?.toDate() || new Date()
            };
          }
        }

        return {
          id: doc.id,
          name: data.name || null,
          participants,
          type: data.type || 'direct',
          projectId: data.projectId || null,
          projectTitle: data.projectTitle || null,
          lastMessage,
          unreadCount: data.unreadCounts?.[user.uid] || 0,
          isTyping: data.typingUsers || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isArchived: data.archivedBy?.includes(user.uid) || false,
          isMuted: data.mutedBy?.includes(user.uid) || false
        };
      })
    );

    return NextResponse.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('[conversations/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch conversations', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await validateFirebaseToken(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { participantIds, type, name, projectId, projectTitle } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'participantIds is required' },
        { status: 400 }
      );
    }

    initAdmin();
    const db = getFirestore();

    // Add current user to participants if not included
    const allParticipantIds = Array.from(new Set([user.uid, ...participantIds]));

    // Check if conversation already exists (for direct messages)
    if (type === 'direct' && allParticipantIds.length === 2) {
      const existingConversations = await db.collection('conversations')
        .where('type', '==', 'direct')
        .where('participantIds', 'array-contains', user.uid)
        .get();

      for (const doc of existingConversations.docs) {
        const data = doc.data();
        const otherParticipantId = allParticipantIds.find(id => id !== user.uid);
        if (data.participantIds.includes(otherParticipantId)) {
          // Conversation already exists
          const participants = await Promise.all(
            data.participantIds.map(async (id: string) => {
              const userDoc = await db.collection('users').doc(id).get();
              const userData = userDoc.data();
              return {
                id,
                name: userData?.displayName || userData?.name || 'Unknown',
                email: userData?.email || '',
                photoURL: userData?.photoURL || userData?.profilePicture || null,
                isOnline: userData?.isOnline || false
              };
            })
          );

          return NextResponse.json({
            success: true,
            conversation: {
              id: doc.id,
              ...data,
              participants,
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate()
            }
          });
        }
      }
    }

    // Create new conversation
    const conversationData = {
      name: name || null,
      participantIds: allParticipantIds,
      type: type || 'direct',
      projectId: projectId || null,
      projectTitle: projectTitle || null,
      lastMessageId: null,
      unreadCounts: Object.fromEntries(allParticipantIds.map(id => [id, 0])),
      typingUsers: [],
      archivedBy: [],
      mutedBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const conversationRef = await db.collection('conversations').add(conversationData);

    // Get participant details
    const participants = await Promise.all(
      allParticipantIds.map(async (id: string) => {
        const userDoc = await db.collection('users').doc(id).get();
        const userData = userDoc.data();
        return {
          id,
          name: userData?.displayName || userData?.name || 'Unknown',
          email: userData?.email || '',
          photoURL: userData?.photoURL || userData?.profilePicture || null,
          isOnline: userData?.isOnline || false
        };
      })
    );

    const conversation = {
      id: conversationRef.id,
      ...conversationData,
      participants,
      unreadCount: 0
    };

    // Trigger Pusher event for all participants
    for (const participantId of allParticipantIds) {
      await triggerPusherEvent(
        `private-user-${participantId}`,
        'conversation:new',
        conversation
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('[conversations/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to create conversation', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
}
