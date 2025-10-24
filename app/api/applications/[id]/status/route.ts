import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ApplicationModel from '@/lib/models/Application';
import ProjectModel from '@/lib/models/Project';
import NotificationModel from '@/lib/models/Notification';

// PATCH /api/applications/[id]/status
export const PATCH = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();

    if (!['accepted', 'rejected'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Status must be accepted or rejected' },
        { status: 400 }
      );
    }

    const application = await ApplicationModel.getById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Application has already been reviewed' }, { status: 400 });
    }

    const project = await ProjectModel.getById(application.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Associated project not found' }, { status: 404 });
    }

    if (project.ownerId !== user.uid) {
      return NextResponse.json(
        { error: 'Only project owner can review applications' },
        { status: 403 }
      );
    }

    const updatedApplication = await ApplicationModel.updateStatus(
      id,
      body.status,
      user.uid,
      body.reviewNote
    );

    // Create notification for the applicant
    try {
      const notificationType = body.status === 'accepted' ? 'application_accepted' : 'application_rejected';
      await NotificationModel.createApplicationNotification(notificationType, {
        userId: application.applicantId,
        title: `Application ${body.status === 'accepted' ? 'Accepted' : 'Rejected'}`,
        message: `Your application for "${project.title}" has been ${body.status}.${body.reviewNote ? ' Review note: ' + body.reviewNote : ''}`,
        applicationId: id,
        projectId: application.projectId,
        projectTitle: project.title,
        applicantName: application.applicantName,
        additionalData: {
          reviewNote: body.reviewNote,
          reviewedBy: user.uid,
          reviewedAt: new Date().toISOString()
        }
      });
    } catch (notificationError) {
      console.error('Error creating application status notification:', notificationError);
    }

    return NextResponse.json({
      message: `Application ${body.status} successfully`,
      application: updatedApplication
    });
  } catch (error: any) {
    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: 'Failed to update application status', message: error.message },
      { status: 500 }
    );
  }
});
