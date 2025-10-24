import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ApplicationModel from '@/lib/models/Application';
import ProjectModel from '@/lib/models/Project';

// GET /api/applications/my-applications
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const applications = await ApplicationModel.getByUser(user.uid, status);
    
    // Get project details for each application
    const applicationsWithProjects = await Promise.all(
      applications.map(async (app: any) => {
        const project = await ProjectModel.getById(app.projectId);
        return {
          ...app,
          projectDetails: project ? {
            title: project.title,
            description: project.description,
            category: project.category,
            status: project.status,
            ownerName: project.ownerName
          } : null
        };
      })
    );
    
    return NextResponse.json({ applications: applicationsWithProjects });
  } catch (error: any) {
    console.error('Error fetching user applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications', message: error.message },
      { status: 500 }
    );
  }
});
