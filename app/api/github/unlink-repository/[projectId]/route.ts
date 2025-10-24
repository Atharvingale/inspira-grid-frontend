import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// DELETE /api/github/unlink-repository/:projectId
export const DELETE = withAuth(async (request: NextRequest, user, { params }: { params: { projectId: string } }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const { projectId } = params;

    // Verify the project exists and user has permission
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    
    // Check if user is owner or team member with permission
    const isOwner = projectData?.owner?.id === user.uid;
    const isTeamMember = projectData?.team?.some((member: any) => member.userId === user.uid);
    
    if (!isOwner && !isTeamMember) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to unlink repository from this project' },
        { status: 403 }
      );
    }

    // Unlink the repository
    await db.collection('projects').doc(projectId).update({
      githubRepository: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    });

    // Get updated project
    const updatedProject = await db.collection('projects').doc(projectId).get();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Repository unlinked successfully',
        project: {
          id: updatedProject.id,
          ...updatedProject.data()
        }
      }
    });
  } catch (error: any) {
    console.error('Error unlinking repository:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unlink repository', message: error.message },
      { status: 500 }
    );
  }
});
