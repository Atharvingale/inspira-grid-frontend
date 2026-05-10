import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/user/team-projects - Get projects where user is a team member
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';

    // Get all projects where user is a team member
    const allProjects = await ProjectModel.getAll({
      orderBy,
      orderDirection
    });

    // Filter projects where user is a team member (but not owner)
    let teamProjects = allProjects.filter((project: any) => {
      const isTeamMember = project.teamMembers?.some((member: any) => 
        member.userId === user.uid || member.uid === user.uid
      );
      const isNotOwner = project.ownerId !== user.uid;
      return isTeamMember && isNotOwner;
    });

    // Apply additional filters
    if (status) {
      teamProjects = teamProjects.filter((p: any) => p.status === status);
    }

    if (category) {
      teamProjects = teamProjects.filter((p: any) => p.category === category);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      teamProjects = teamProjects.filter((p: any) => 
        p.title?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    if (limit) {
      teamProjects = teamProjects.slice(0, parseInt(limit));
    }

    // Add application count and user-specific info
    for (const project of teamProjects) {
      const applications = await ApplicationModel.getByProject(project.id);
      project.applicationCount = applications.length;
      project.isOwner = false;
      project.isTeamMember = true;
    }

    return NextResponse.json({ projects: teamProjects });
  } catch (error) {
    console.error('[projects/user/team-projects/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch team projects', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
