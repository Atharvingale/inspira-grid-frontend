import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ApplicationModel from '@/lib/models/Application';
import ProjectModel from '@/lib/models/Project';

// GET /api/applications/me - Get current user's applications
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
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
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedApplications = applicationsWithProjects.slice(startIndex, endIndex);
    
    return NextResponse.json({ 
      data: paginatedApplications,
      pagination: {
        currentPage: page,
        totalItems: applicationsWithProjects.length,
        totalPages: Math.ceil(applicationsWithProjects.length / limit),
        hasNext: endIndex < applicationsWithProjects.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching user applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications', message: error.message },
      { status: 500 }
    );
  }
});
