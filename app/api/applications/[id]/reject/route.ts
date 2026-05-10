import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// PATCH /api/applications/:id/reject
export const PATCH = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { rejectionMessage } = body;

    // Get application
    const applicationDoc = await db.collection('applications').doc(id).get();
    if (!applicationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();

    // Get project to verify ownership
    const projectDoc = await db.collection('projects').doc(applicationData?.projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    const isProjectOwner = projectData?.owner?.id === user.uid || projectData?.ownerId === user.uid;

    if (!isProjectOwner) {
      return NextResponse.json(
        { success: false, error: 'Only project owner can reject applications' },
        { status: 403 }
      );
    }

    // Update application
    await db.collection('applications').doc(id).update({
      status: 'rejected',
      reviewMessage: rejectionMessage || 'Your application was not accepted at this time.',
      reviewedBy: user.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    const updatedApplication = await db.collection('applications').doc(id).get();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedApplication.id,
        ...updatedApplication.data()
      }
    });
  } catch (error) {
    console.error('[applications/[id]/reject/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to reject application', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
