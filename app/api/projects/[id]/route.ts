import { NextRequest, NextResponse } from 'next/server';
import { withAuth, optionalAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const project = await ProjectModel.getById(id);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Add user-specific info if authenticated
    const user = await optionalAuth(request);
    if (user) {
      const hasApplied = await ApplicationModel.hasApplied(user.uid, project.id);
      project.hasApplied = hasApplied;
      project.isOwner = project.ownerId === user.uid;
      project.isTeamMember = project.teamMembers?.some((member: any) => member.userId === user.uid);
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project', message: error.message }, { status: 500 });
  }
}

// PUT /api/projects/[id]
export const PUT = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;
    const body = await request.json();

    const project = await ProjectModel.getById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== user.uid) {
      return NextResponse.json({ error: 'Only project owner can update this project' }, { status: 403 });
    }

    const updates: any = {};
    const allowedFields = ['title', 'description', 'category', 'skillsRequired', 'teamSize', 'duration', 'budget', 'status'];
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    const updatedProject = await ProjectModel.update(id, updates);
    
    return NextResponse.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project', message: error.message }, { status: 500 });
  }
});

// DELETE /api/projects/[id]
export const DELETE = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const { id } = params;

    const project = await ProjectModel.getById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.ownerId !== user.uid && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only project owner or admin can delete this project' }, { status: 403 });
    }

    await ProjectModel.delete(id);
    
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project', message: error.message }, { status: 500 });
  }
});
