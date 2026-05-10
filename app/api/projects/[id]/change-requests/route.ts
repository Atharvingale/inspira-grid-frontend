import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/projects/:id/change-requests - Create a change request
export const POST = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { id: projectId } = params;
    const body = await request.json();
    const { changes, description, changeType } = body;

    console.log('[Change Request] User ID:', user.uid);
    console.log('[Change Request] Project ID:', projectId);

    if (!changes || !description) {
      return NextResponse.json(
        { success: false, error: 'changes and description are required' },
        { status: 400 }
      );
    }

    // Get project to verify membership
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      console.log('[Change Request] Project not found');
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    const isOwner = projectData?.ownerId === user.uid;
    const isTeamMember = projectData?.team?.some((member: any) => member.userId === user.uid);

    console.log('[Change Request] Project Owner ID:', projectData?.ownerId);
    console.log('[Change Request] Is Owner:', isOwner);
    console.log('[Change Request] Team:', projectData?.team);
    console.log('[Change Request] Is Team Member:', isTeamMember);

    if (!isTeamMember) {
      console.log('[Change Request] Authorization failed: User is not a team member');
      return NextResponse.json(
        { success: false, error: 'Only team members can create change requests' },
        { status: 403 }
      );
    }

    // Get user profile for additional details
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    // Create change request
    const changeRequestRef = db.collection('changeRequests').doc();
    const changeRequest = {
      id: changeRequestRef.id,
      projectId,
      projectTitle: projectData?.title,
      requestedBy: user.uid,
      requestedByName: userData?.displayName || user.email || 'Unknown',
      requestedByEmail: user.email,
      changeType: changeType || 'project_details',
      changes,
      description,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    await changeRequestRef.set(changeRequest);

    // Create notification for project owner
    const notificationRef = db.collection('notifications').doc();
    await notificationRef.set({
      id: notificationRef.id,
      userId: projectData?.ownerId,
      title: 'New Change Request',
      message: `${userData?.displayName || user.email} proposed changes to ${projectData?.title}`,
      type: 'project_update',
      isRead: false,
      actionUrl: `/dashboard/projects/${projectId}?tab=change-requests`,
      metadata: {
        projectId,
        changeRequestId: changeRequestRef.id
      },
      createdAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      data: {
        id: changeRequestRef.id,
        ...changeRequest
      }
    });
  } catch (error) {
    console.error('[projects/[id]/change-requests/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create change request', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});

// GET /api/projects/:id/change-requests - Get change requests for a project
export const GET = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { id: projectId } = params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Get project to verify access
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    const isOwner = projectData?.ownerId === user.uid;
    const isTeamMember = projectData?.team?.some((member: any) => member.userId === user.uid);

    if (!isOwner && !isTeamMember) {
      return NextResponse.json(
        { success: false, error: 'Only project owner and team members can view change requests' },
        { status: 403 }
      );
    }

    // Query change requests
    let query: any = db.collection('changeRequests')
      .where('projectId', '==', projectId);

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const changeRequests = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      data: changeRequests
    });
  } catch (error) {
    console.error('[projects/[id]/change-requests/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to fetch change requests', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
