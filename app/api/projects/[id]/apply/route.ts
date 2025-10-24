import { NextRequest, NextResponse } from 'next/server';
import { withCompleteProfile } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';
import NotificationModel from '@/lib/models/Notification';

// POST /api/projects/[id]/apply
export const POST = withCompleteProfile(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();

    if (!body.message || body.message.length < 10 || body.message.length > 500) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Application message must be 10-500 characters' },
        { status: 400 }
      );
    }

    const project = await ProjectModel.getById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.status !== 'open') {
      return NextResponse.json({ error: 'Can only apply to open projects' }, { status: 400 });
    }

    if (project.ownerId === user.uid) {
      return NextResponse.json({ error: 'Cannot apply to your own project' }, { status: 400 });
    }

    const hasApplied = await ApplicationModel.hasApplied(user.uid, project.id);
    if (hasApplied) {
      return NextResponse.json({ error: 'You have already applied to this project' }, { status: 400 });
    }

    const isTeamMember = project.teamMembers?.some((member: any) => member.userId === user.uid);
    if (isTeamMember) {
      return NextResponse.json({ error: 'You are already a member of this project' }, { status: 400 });
    }

    const applicationData = {
      projectId: project.id,
      projectTitle: project.title,
      applicantId: user.uid,
      applicantName: user.displayName,
      applicantEmail: user.email,
      message: body.message,
      skills: user.skills || []
    };

    const application = await ApplicationModel.create(applicationData);
    
    // Create notification for project owner
    try {
      await NotificationModel.createApplicationNotification('application_received', {
        userId: project.ownerId,
        title: 'New Application Received',
        message: `${user.displayName} has applied to your project "${project.title}".`,
        applicationId: application.id,
        projectId: project.id,
        projectTitle: project.title,
        applicantName: user.displayName,
        additionalData: {
          applicantEmail: user.email,
          applicationMessage: body.message,
          appliedAt: new Date().toISOString()
        }
      });
    } catch (notificationError) {
      console.error('Error creating application notification:', notificationError);
    }
    
    return NextResponse.json({
      message: 'Application submitted successfully',
      application
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error applying to project:', error);
    return NextResponse.json({ error: 'Failed to apply to project', message: error.message }, { status: 500 });
  }
});
