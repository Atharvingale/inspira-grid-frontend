import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';

// DELETE /api/projects/:id/team/:memberId - Remove team member
export const DELETE = withAuth(async (request: NextRequest, user, { params }: { params: { id: string; memberId: string } }) => {
  try {
    const { id: projectId, memberId } = params;

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
        { error: 'Only project owner can remove team members' },
        { status: 403 }
      );
    }

    // Cannot remove owner
    if (memberId === project.ownerId) {
      return NextResponse.json(
        { error: 'Cannot remove project owner' },
        { status: 400 }
      );
    }

    // Remove team member
    await ProjectModel.removeTeamMember(projectId, memberId);
    
    return NextResponse.json({ 
      message: 'Team member removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member', message: error.message },
      { status: 500 }
    );
  }
});

// PATCH /api/projects/:id/team/:memberId - Update team member role
export const PATCH = withAuth(async (request: NextRequest, user, { params }: { params: { id: string; memberId: string } }) => {
  try {
    const { id: projectId, memberId } = params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: 'role is required' },
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
        { error: 'Only project owner can update team member roles' },
        { status: 403 }
      );
    }

    // Cannot change owner role
    if (memberId === project.ownerId) {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    // Update team member role
    const updatedProject = await ProjectModel.getById(projectId);
    const teamMember = updatedProject?.teamMembers?.find((m: any) => m.userId === memberId);

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    teamMember.role = role;
    await ProjectModel.update(projectId, { teamMembers: updatedProject.teamMembers });
    
    return NextResponse.json({ 
      message: 'Team member role updated successfully',
      teamMember
    });
  } catch (error: any) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member', message: error.message },
      { status: 500 }
    );
  }
});
