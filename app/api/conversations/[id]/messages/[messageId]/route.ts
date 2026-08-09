import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { triggerPusherEvent } from '@/lib/pusher';

async function loadAuthorizedMessage(conversationId: string, messageId: string, uid: string) {
  initAdmin();
  const db = getFirestore();
  const conversationRef = db.collection('conversations').doc(conversationId);
  const [conversationDoc, messageDoc] = await Promise.all([
    conversationRef.get(), conversationRef.collection('messages').doc(messageId).get(),
  ]);
  if (!conversationDoc.exists) throw new Error('CONVERSATION_NOT_FOUND');
  const conversation = conversationDoc.data()!;
  if (!Array.isArray(conversation.participantIds) || !conversation.participantIds.includes(uid)) throw new Error('FORBIDDEN');
  if (!messageDoc.exists) throw new Error('MESSAGE_NOT_FOUND');
  return { db, conversation, messageRef: messageDoc.ref, message: messageDoc.data()! };
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : 'REQUEST_FAILED';
  const status = code.includes('NOT_FOUND') ? 404 : code === 'FORBIDDEN' ? 403 : 400;
  return NextResponse.json({ success: false, error: code }, { status });
}

// PATCH supports either editing the sender's text or adding/removing the current user's reaction.
export const PATCH = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string; messageId: string }> }) => {
  try {
    const { id: conversationId, messageId } = await context.params;
    const body = await request.json();
    const { conversation, messageRef, message } = await loadAuthorizedMessage(conversationId, messageId, user.uid);
    if (typeof body.content === 'string') {
      if (message.senderId !== user.uid || message.isDeleted) return failure(new Error('FORBIDDEN'));
      const content = body.content.trim();
      if (!content || content.length > 4000) return failure(new Error('INVALID_CONTENT'));
      await messageRef.update({ content, edited: true, editedAt: FieldValue.serverTimestamp() });
    } else if (typeof body.reaction === 'string') {
      const reaction = body.reaction.trim().slice(0, 32);
      if (!reaction) return failure(new Error('INVALID_REACTION'));
      const reactions = Array.isArray(message.reactions) ? message.reactions : [];
      const withoutOwn = reactions.filter((item: { userId: string }) => item.userId !== user.uid);
      const next = body.removeReaction ? withoutOwn : [...withoutOwn, { emoji: reaction, userId: user.uid, userName: user.displayName || 'User' }];
      await messageRef.update({ reactions: next, updatedAt: FieldValue.serverTimestamp() });
    } else {
      return failure(new Error('INVALID_REQUEST'));
    }
    await Promise.all(conversation.participantIds.map((participantId: string) => triggerPusherEvent(`private-user-${participantId}`, 'message:updated', { conversationId, messageId })));
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
});

// DELETE is a soft delete and is restricted to the sender or an administrator.
export const DELETE = withAuth(async (_request: NextRequest, user, context: { params: Promise<{ id: string; messageId: string }> }) => {
  try {
    const { id: conversationId, messageId } = await context.params;
    const { conversation, messageRef, message } = await loadAuthorizedMessage(conversationId, messageId, user.uid);
    if (message.senderId !== user.uid && user.role !== 'admin') return failure(new Error('FORBIDDEN'));
    await messageRef.update({ content: '', fileUrl: null, fileName: null, isDeleted: true, deletedAt: FieldValue.serverTimestamp(), deletedBy: user.uid });
    await Promise.all(conversation.participantIds.map((participantId: string) => triggerPusherEvent(`private-user-${participantId}`, 'message:deleted', { conversationId, messageId })));
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
});
