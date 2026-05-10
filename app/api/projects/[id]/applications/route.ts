import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/projects/:id/applications
export const GET = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // Get project to verify ownership
    const projectDoc = await db.collection('projects').doc(id).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    const isProjectOwner = projectData?.owner?.id === user.uid || projectData?.ownerId === user.uid;
    const isTeamMember = projectData?.team?.some((member: any) => member.userId === user.uid);

    if (!isProjectOwner && !isTeamMember) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view project applications' },
        { status: 403 }
      );
    }

    // Build query
    let query: any = db.collection('applications').where('projectId', '==', id);
    
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('[projects/[id]/applications/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch applications', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
