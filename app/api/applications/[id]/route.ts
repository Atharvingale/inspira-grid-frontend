import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ApplicationModel from '@/lib/models/Application';
import ProjectModel from '@/lib/models/Project';

// GET /api/applications/[id]
export const GET = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    const application = await ApplicationModel.getById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const project = await ProjectModel.getById(application.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Associated project not found' }, { status: 404 });
    }

    const isOwner = application.applicantId === user.uid;
    const isProjectOwner = project.ownerId === user.uid;

    if (!isOwner && !isProjectOwner && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to view this application' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ...application,
      projectDetails: {
        title: project.title,
        description: project.description,
        category: project.category,
        ownerName: project.ownerName
      }
    });
  } catch (error: any) {
    console.error('Error fetching application:', error);
    return NextResponse.json({ error: 'Failed to fetch application', message: error.message }, { status: 500 });
  }
});

// PUT /api/applications/[id] - Update application
export const PUT = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    const application = await ApplicationModel.getById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.applicantId !== user.uid) {
      return NextResponse.json(
        { error: 'You can only update your own applications' },
        { status: 403 }
      );
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot update application that has already been reviewed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates = {
      ...body,
      updatedAt: new Date()
    };

    await ApplicationModel.update(id, updates);
    const updatedApplication = await ApplicationModel.getById(id);
    
    return NextResponse.json(updatedApplication);
  } catch (error: any) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: 'Failed to update application', message: error.message }, { status: 500 });
  }
});

// DELETE /api/applications/[id]
export const DELETE = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    const application = await ApplicationModel.getById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.applicantId !== user.uid) {
      return NextResponse.json(
        { error: 'You can only withdraw your own applications' },
        { status: 403 }
      );
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot withdraw application that has already been reviewed' },
        { status: 400 }
      );
    }

    await ApplicationModel.delete(id);
    
    return NextResponse.json({ message: 'Application withdrawn successfully' });
  } catch (error: any) {
    console.error('Error withdrawing application:', error);
    return NextResponse.json({ error: 'Failed to withdraw application', message: error.message }, { status: 500 });
  }
});
