import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// PATCH /api/applications/:id/accept
export const PATCH = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { id } = params;
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    const { role, welcomeMessage } = body;

    // Get application
    const applicationDoc = await db.collection('applications').doc(id).get();
    if (!applicationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    const applicationData = applicationDoc.data();

    if (!applicationData?.projectId) {
      return NextResponse.json({ success: false, error: 'Application has no associated project' }, { status: 400 });
    }

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
        { success: false, error: 'Only project owner can accept applications' },
        { status: 403 }
      );
    }

    if (applicationData.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Application is already ${applicationData.status}` },
        { status: 409 }
      );
    }

    // Use a batch write for atomicity
    const batch = db.batch();
    
    // Update application
    const appRef = db.collection('applications').doc(id);
    batch.update(appRef, {
      status: 'accepted',
      reviewMessage: welcomeMessage || 'Your application has been accepted!',
      reviewedBy: user.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Add user to project team
    const projectRef = db.collection('projects').doc(applicationData.projectId);
    batch.update(projectRef, {
      team: FieldValue.arrayUnion({
        userId: applicationData?.applicantId,
        name: applicationData?.applicantName,
        email: applicationData?.applicantEmail,
        role: role || 'member',
        joinedAt: new Date().toISOString()
      }),
      updatedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    const updatedApplication = await db.collection('applications').doc(id).get();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedApplication.id,
        ...updatedApplication.data()
      }
    });
  } catch (error) {
    console.error('[applications/[id]/accept/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to accept application', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
