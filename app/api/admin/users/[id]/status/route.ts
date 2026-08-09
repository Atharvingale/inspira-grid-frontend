import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { withAdmin } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// PATCH /api/admin/users/:id/status — suspend or restore a user and record the action.
export const PATCH = withAdmin(async (request: NextRequest, admin, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: targetId } = await context.params;
    const { suspended, reason = '' } = await request.json();
    if (typeof suspended !== 'boolean') return NextResponse.json({ success: false, error: 'suspended must be a boolean' }, { status: 400 });
    if (targetId === admin.uid) return NextResponse.json({ success: false, error: 'Administrators cannot suspend themselves' }, { status: 400 });
    initAdmin();
    const db = getFirestore();
    const userRef = db.collection('users').doc(targetId);
    if (!(await userRef.get()).exists) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    const auditRef = db.collection('auditLogs').doc();
    const batch = db.batch();
    batch.update(userRef, { suspended, suspendedReason: reason, suspendedAt: FieldValue.serverTimestamp(), suspendedBy: admin.uid, updatedAt: FieldValue.serverTimestamp() });
    batch.set(auditRef, { actorId: admin.uid, targetId, targetType: 'user', action: suspended ? 'suspend' : 'restore', reason, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return NextResponse.json({ success: true, data: { userId: targetId, suspended } });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'User moderation failed' }, { status: 500 }); }
});
