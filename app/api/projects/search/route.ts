import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/search - Search projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const skills = searchParams.get('skills');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';

    const filters: any = {
      category,
      status,
      orderBy,
      orderDirection,
      limit: 100 // Get more for search then paginate
    };

    if (skills) {
      filters.skills = skills.split(',');
    }

    const projects = await ProjectModel.search(search, filters);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProjects = projects.slice(startIndex, endIndex);

    // Add user-specific info if authenticated
    const user = await optionalAuth(request);
    if (user) {
      for (const project of paginatedProjects) {
        const hasApplied = await ApplicationModel.hasApplied(user.uid, project.id);
        project.hasApplied = hasApplied;
        project.isOwner = project.ownerId === user.uid;
        project.isTeamMember = project.teamMembers?.some((member: any) => 
          member.userId === user.uid || member.uid === user.uid
        );
      }
    }

    return NextResponse.json({
      projects: paginatedProjects,
      pagination: {
        currentPage: page,
        totalProjects: projects.length,
        totalPages: Math.ceil(projects.length / limit),
        hasNext: endIndex < projects.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error: any) {
    console.error('Error searching projects:', error);
    return NextResponse.json(
      { error: 'Failed to search projects', message: error.message },
      { status: 500 }
    );
  }
}
