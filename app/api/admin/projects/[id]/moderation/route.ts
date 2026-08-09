import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { withAdmin } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// PATCH /api/admin/projects/:id/moderation — approve or hide a project with an immutable audit record.
export const PATCH = withAdmin(async (request: NextRequest, admin, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id: projectId } = await context.params;
    const { moderationStatus, reason = '' } = await request.json();
    if (!['approved', 'hidden', 'pending'].includes(moderationStatus)) return NextResponse.json({ success: false, error: 'Invalid moderation status' }, { status: 400 });
    initAdmin();
    const db = getFirestore();
    const projectRef = db.collection('projects').doc(projectId);
    if (!(await projectRef.get()).exists) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    const auditRef = db.collection('auditLogs').doc();
    const batch = db.batch();
    batch.update(projectRef, { moderationStatus, moderationReason: reason, moderatedBy: admin.uid, moderatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    batch.set(auditRef, { actorId: admin.uid, targetId: projectId, targetType: 'project', action: `project_${moderationStatus}`, reason, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return NextResponse.json({ success: true, data: { projectId, moderationStatus } });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Project moderation failed' }, { status: 500 }); }
});
