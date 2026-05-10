import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ApplicationModel from '@/lib/models/Application';

// GET /api/applications/me/stats - Get user's application statistics
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const applications = await ApplicationModel.getByUser(user.uid);
    
    const total = applications.length;
    const pending = applications.filter((app: any) => app.status === 'pending').length;
    const accepted = applications.filter((app: any) => app.status === 'accepted').length;
    const rejected = applications.filter((app: any) => app.status === 'rejected').length;
    
    const successRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    
    // Calculate average response time (in hours)
    let totalResponseTime = 0;
    let responsesCount = 0;
    
    applications.forEach((app: any) => {
      if ((app.status === 'accepted' || app.status === 'rejected') && app.reviewedAt && app.createdAt) {
        const createdTime = app.createdAt.seconds ? app.createdAt.seconds * 1000 : new Date(app.createdAt).getTime();
        const reviewedTime = app.reviewedAt.seconds ? app.reviewedAt.seconds * 1000 : new Date(app.reviewedAt).getTime();
        const responseTime = (reviewedTime - createdTime) / (1000 * 60 * 60); // Convert to hours
        totalResponseTime += responseTime;
        responsesCount++;
      }
    });
    
    const averageResponseTime = responsesCount > 0 ? Math.round(totalResponseTime / responsesCount) : 0;
    
    return NextResponse.json({
      total,
      pending,
      accepted,
      rejected,
      successRate,
      averageResponseTime
    });
  } catch (error) {
    console.error('[applications/me/stats/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch application statistics', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
