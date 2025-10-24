import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/user/my-projects - Get projects owned by the current user
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';

    const filters: any = {
      ownerId: user.uid,
      orderBy,
      orderDirection
    };

    if (status) {
      filters.status = status;
    }

    if (category) {
      filters.category = category;
    }

    if (limit) {
      filters.limit = parseInt(limit);
    }

    let projects;
    if (search) {
      projects = await ProjectModel.search(search, filters);
    } else {
      projects = await ProjectModel.getAll(filters);
    }

    // Add application count and user-specific info
    for (const project of projects) {
      const applications = await ApplicationModel.getByProject(project.id);
      project.applicationCount = applications.length;
      project.isOwner = true;
      project.isTeamMember = false;
    }

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', message: error.message },
      { status: 500 }
    );
  }
});
