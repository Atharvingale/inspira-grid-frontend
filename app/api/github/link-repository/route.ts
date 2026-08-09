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
    
    const isOwner = projectData?.owner?.id === user.uid || projectData?.ownerId === user.uid;
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Only the project owner can link a repository' },
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
  } catch (error: any) {
    console.error('Error linking repository:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link repository', message: error.message },
      { status: 500 }
    );
  }
});
