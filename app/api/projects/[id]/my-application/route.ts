import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/:id/my-application - Check if user has applied to project
export const GET = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    const params = await context.params;
    const projectId = params.id;
    
    // Check if user has already applied
    const hasApplied = await ApplicationModel.hasApplied(user.uid, projectId);
    
    if (!hasApplied) {
      return NextResponse.json({
        exists: false,
        application: null
      });
    }
    
    // If applied, get the application details
    const applications = await ApplicationModel.getByUser(user.uid);
    const application = applications.find((app: any) => app.projectId === projectId);
    
    return NextResponse.json({
      exists: true,
      application
    });
  } catch (error) {
    console.error('[projects/[id]/my-application/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to check application', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
