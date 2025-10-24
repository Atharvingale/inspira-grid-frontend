import { NextRequest, NextResponse } from 'next/server';
import { withCompleteProfile, optionalAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects - Get all projects with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const skills = searchParams.get('skills');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';

    const filters: any = {
      category,
      limit: parseInt(limit.toString()),
      orderBy,
      orderDirection
    };

    if (status) {
      filters.status = status;
    }

    if (skills) {
      filters.skills = Array.isArray(skills) ? skills : skills.split(',');
    }

    let projects;
    if (search) {
      projects = await ProjectModel.search(search, filters);
    } else {
      projects = await ProjectModel.getAll(filters);
    }

    // Add pagination
    const startIndex = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
    const endIndex = startIndex + parseInt(limit.toString());
    const paginatedProjects = projects.slice(startIndex, endIndex);

    // Add user-specific info if authenticated
    const user = await optionalAuth(request);
    if (user) {
      for (const project of paginatedProjects) {
        const hasApplied = await ApplicationModel.hasApplied(user.uid, project.id);
        project.hasApplied = hasApplied;
        project.isOwner = project.ownerId === user.uid;
        project.isTeamMember = project.teamMembers?.some((member: any) => member.userId === user.uid);
      }
    }

    return NextResponse.json({
      projects: paginatedProjects,
      pagination: {
        currentPage: parseInt(page.toString()),
        totalProjects: projects.length,
        totalPages: Math.ceil(projects.length / parseInt(limit.toString())),
        hasNext: endIndex < projects.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export const POST = withCompleteProfile(async (request: NextRequest, user) => {
  try {
    const body = await request.json();

    // Validation
    if (!body.title || body.title.length < 3 || body.title.length > 100) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Title must be 3-100 characters' },
        { status: 400 }
      );
    }

    if (!body.description || body.description.length < 10 || body.description.length > 2000) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Description must be 10-2000 characters' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Category is required' },
        { status: 400 }
      );
    }

    if (!body.skillsRequired || !Array.isArray(body.skillsRequired) || body.skillsRequired.length === 0) {
      return NextResponse.json(
        { error: 'Validation failed', message: '1-10 skills are required' },
        { status: 400 }
      );
    }

    if (!body.teamSize || body.teamSize < 2 || body.teamSize > 20) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Team size must be 2-20 members' },
        { status: 400 }
      );
    }

    const projectData = {
      title: body.title,
      description: body.description,
      category: body.category,
      skillsRequired: body.skillsRequired,
      teamSize: parseInt(body.teamSize),
      duration: body.duration,
      budget: body.budget,
      ownerId: user.uid,
      ownerName: user.displayName,
      ownerEmail: user.email
    };

    const project = await ProjectModel.create(projectData);
    
    return NextResponse.json({
      message: 'Project created successfully',
      project
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        error: 'Failed to create project',
        message: error.message
      },
      { status: 500 }
    );
  }
});
