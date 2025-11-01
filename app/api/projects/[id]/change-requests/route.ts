import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/projects/:id/change-requests - Create a change request
export const POST = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const { id: projectId } = params;
    const body = await request.json();
    const { changes, description, changeType } = body;

    if (!changes || !description) {
      return NextResponse.json(
        { success: false, error: 'changes and description are required' },
        { status: 400 }
      );
    }

    // Get project to verify membership
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
        { success: false, error: 'Only project owner and team members can create change requests' },
        { status: 403 }
      );
    }

    // Owners can directly edit without change requests (optional logic)
    if (isOwner) {
      return NextResponse.json(
        { success: false, error: 'Project owners can directly edit the project' },
        { status: 400 }
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
  } catch (error: any) {
    console.error('Error creating change request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create change request', message: error.message },
      { status: 500 }
    );
  }
});

// GET /api/projects/:id/change-requests - Get change requests for a project
export const GET = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
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
  } catch (error: any) {
    console.error('Error fetching change requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch change requests', message: error.message },
      { status: 500 }
    );
  }
});
