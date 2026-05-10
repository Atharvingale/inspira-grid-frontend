import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/applications - Create new application
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const body = await request.json();
    const { projectId, message, skills, portfolioUrl, githubUsername } = body;

    if (!projectId || !message || !skills) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if project exists
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();

    // Check if user already applied
    const existingApplication = await db.collection('applications')
      .where('projectId', '==', projectId)
      .where('applicantId', '==', user.uid)
      .get();

    if (!existingApplication.empty) {
      return NextResponse.json(
        { success: false, error: 'You have already applied to this project' },
        { status: 400 }
      );
    }

    // Create application
    const applicationData = {
      projectId,
      applicantId: user.uid,
      applicantName: user.displayName || user.email,
      applicantEmail: user.email,
      message,
      skills,
      portfolioUrl: portfolioUrl || null,
      githubUsername: githubUsername || null,
      status: 'pending',
      projectTitle: projectData?.title || '',
      projectOwnerId: projectData?.owner?.id || projectData?.ownerId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const applicationRef = await db.collection('applications').add(applicationData);
    const newApplication = await applicationRef.get();

    return NextResponse.json({
      success: true,
      data: {
        id: newApplication.id,
        ...newApplication.data()
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[applications/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create application', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
