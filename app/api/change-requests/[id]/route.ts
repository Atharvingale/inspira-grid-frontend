import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// PATCH /api/change-requests/:id - Approve or reject a change request
export const PATCH = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { id: changeRequestId } = params;
    const body = await request.json();
    const { action, reviewNote } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get change request
    const changeRequestDoc = await db.collection('changeRequests').doc(changeRequestId).get();
    if (!changeRequestDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Change request not found' },
        { status: 404 }
      );
    }

    const changeRequestData = changeRequestDoc.data();

    if (changeRequestData?.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'This change request has already been reviewed' },
        { status: 400 }
      );
    }

    // Get project to verify ownership
    const projectDoc = await db.collection('projects').doc(changeRequestData?.projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    const isProjectOwner = projectData?.ownerId === user.uid;

    if (!isProjectOwner) {
      return NextResponse.json(
        { success: false, error: 'Only project owner can review change requests' },
        { status: 403 }
      );
    }

    // Get reviewer profile
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update change request
    await db.collection('changeRequests').doc(changeRequestId).update({
      status: newStatus,
      reviewedBy: user.uid,
      reviewedByName: userData?.displayName || user.email || 'Project Owner',
      reviewedAt: FieldValue.serverTimestamp(),
      reviewNote: reviewNote || '',
      updatedAt: FieldValue.serverTimestamp()
    });

    // If approved, apply changes to project
    if (action === 'approve') {
      const changes = changeRequestData?.changes || {};
      const updateData: any = {
        ...changes,
        updatedAt: FieldValue.serverTimestamp()
      };

      await db.collection('projects').doc(changeRequestData?.projectId).update(updateData);
    }

    // Create notification for requester
    const notificationRef = db.collection('notifications').doc();
    await notificationRef.set({
      id: notificationRef.id,
      userId: changeRequestData?.requestedBy,
      title: action === 'approve' ? 'Change Request Approved' : 'Change Request Rejected',
      message: `Your change request for ${projectData?.title} has been ${newStatus}`,
      type: 'project_update',
      isRead: false,
      actionUrl: `/dashboard/projects/${changeRequestData?.projectId}`,
      metadata: {
        projectId: changeRequestData?.projectId,
        changeRequestId
      },
      createdAt: FieldValue.serverTimestamp()
    });

    const updatedChangeRequest = await db.collection('changeRequests').doc(changeRequestId).get();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedChangeRequest.id,
        ...updatedChangeRequest.data()
      }
    });
  } catch (error: any) {
    console.error('Error reviewing change request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to review change request', message: error.message },
      { status: 500 }
    );
  }
});

// DELETE /api/change-requests/:id - Delete/withdraw a change request
export const DELETE = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { id: changeRequestId } = params;

    // Get change request
    const changeRequestDoc = await db.collection('changeRequests').doc(changeRequestId).get();
    if (!changeRequestDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Change request not found' },
        { status: 404 }
      );
    }

    const changeRequestData = changeRequestDoc.data();

    // Only the requester can delete their own pending change request
    if (changeRequestData?.requestedBy !== user.uid) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own change requests' },
        { status: 403 }
      );
    }

    if (changeRequestData?.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending change requests can be deleted' },
        { status: 400 }
      );
    }

    await db.collection('changeRequests').doc(changeRequestId).delete();

    return NextResponse.json({
      success: true,
      message: 'Change request deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting change request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete change request', message: error.message },
      { status: 500 }
    );
  }
});
