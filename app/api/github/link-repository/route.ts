import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/github/link-repository
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const body = await request.json();
    const { projectId, repositoryUrl, repositoryName, description } = body;

    if (!projectId || !repositoryUrl || !repositoryName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the project exists and user has permission
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectDoc.data();
    
    // Check if user is owner or team member
    const isOwner = projectData?.owner?.id === user.uid;
    const isTeamMember = projectData?.team?.some((member: any) => member.userId === user.uid);
    
    if (!isOwner && !isTeamMember) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to link repository to this project' },
        { status: 403 }
      );
    }

    // Link the repository
    await db.collection('projects').doc(projectId).update({
      githubRepository: {
        url: repositoryUrl,
        name: repositoryName,
        description: description || '',
        linkedAt: FieldValue.serverTimestamp(),
        linkedBy: user.uid
      },
      updatedAt: FieldValue.serverTimestamp()
    });

    // Get updated project
    const updatedProject = await db.collection('projects').doc(projectId).get();

    return NextResponse.json({
      success: true,
      data: {
        message: 'Repository linked successfully',
        project: {
          id: updatedProject.id,
          ...updatedProject.data()
        }
      }
    });
  } catch (error) {
    console.error('[github/link-repository/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to link repository', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
