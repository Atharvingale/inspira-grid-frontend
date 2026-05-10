import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/:id/stats - Get project statistics
export const GET = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const projectId = params.id;
    
    // Get project
    const project = await ProjectModel.getById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user has access (owner or team member)
    const isOwner = project.ownerId === user.uid;
    const isTeamMember = project.teamMembers?.some((member: any) => 
      member.userId === user.uid || member.uid === user.uid
    );

    if (!isOwner && !isTeamMember) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get applications
    const applications = await ApplicationModel.getByProject(projectId);
    
    const totalApplications = applications.length;
    const pendingApplications = applications.filter((app: any) => app.status === 'pending').length;
    const acceptedApplications = applications.filter((app: any) => app.status === 'accepted').length;
    const rejectedApplications = applications.filter((app: any) => app.status === 'rejected').length;

    const teamMembers = (project.teamMembers?.length || 0) + 1; // +1 for owner
    const spotsRemaining = project.teamSize - teamMembers;
    
    // Calculate completion percentage based on team size
    const completionPercentage = Math.round((teamMembers / project.teamSize) * 100);

    return NextResponse.json({
      totalApplications,
      pendingApplications,
      acceptedApplications,
      rejectedApplications,
      teamMembers,
      spotsRemaining,
      completionPercentage,
      maxTeamSize: project.teamSize
    });
  } catch (error) {
    console.error('[projects/[id]/stats/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch project statistics', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
