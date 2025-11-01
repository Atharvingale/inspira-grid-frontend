import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';

// GET /api/projects/:id/team - Get project team members
export const GET = withAuth(async (_request: NextRequest, _user, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const projectId = params.id;
    
    const project = await ProjectModel.getById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Return team members with owner info
    const teamMembers = [
      {
        userId: project.ownerId,
        name: project.ownerName,
        email: project.ownerEmail,
        role: 'owner',
        joinedAt: project.createdAt
      },
      ...(project.teamMembers || [])
    ];

    return NextResponse.json({ teamMembers });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members', message: error.message },
      { status: 500 }
    );
  }
});

// POST /api/projects/:id/team - Add team member
export const POST = withAuth(async (request: NextRequest, _user, context: { params: Promise<{ id: string }> }) => {
  const user = _user;
  try {
    const params = await context.params;
    const projectId = params.id;
    const body = await request.json();
    const { userId, role = 'member' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get project and verify ownership
    const project = await ProjectModel.getById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== user.uid) {
      return NextResponse.json(
        { error: 'Only project owner can add team members' },
        { status: 403 }
      );
    }

    // Check if team is full
    const currentTeamSize = (project.teamMembers?.length || 0) + 1; // +1 for owner
    if (currentTeamSize >= project.teamSize) {
      return NextResponse.json(
        { error: 'Team is full' },
        { status: 400 }
      );
    }

    // Add team member
    const _updatedProject = await ProjectModel.addTeamMember(projectId, userId, role);
    
    return NextResponse.json({ 
      message: 'Team member added successfully',
      teamMember: {
        userId,
        role,
        joinedAt: new Date()
      }
    });
  } catch (error: any) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member', message: error.message },
      { status: 500 }
    );
  }
});
