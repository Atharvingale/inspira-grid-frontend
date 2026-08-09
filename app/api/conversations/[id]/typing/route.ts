import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { triggerPusherEvent } from '@/lib/pusher';

export const POST = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: conversationId } = await context.params;
    const { isTyping } = await request.json();
    if (typeof isTyping !== 'boolean') return NextResponse.json({ success: false, error: 'isTyping must be a boolean' }, { status: 400 });
    initAdmin();
    const conversation = await getFirestore().collection('conversations').doc(conversationId).get();
    if (!conversation.exists) return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    const participants: string[] = conversation.data()?.participantIds || [];
    if (!participants.includes(user.uid)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    await Promise.all(participants.filter((id) => id !== user.uid).map((id) => triggerPusherEvent(`private-user-${id}`, 'conversation:typing', { conversationId, userId: user.uid, isTyping })));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Typing update failed' }, { status: 500 });
  }
});
