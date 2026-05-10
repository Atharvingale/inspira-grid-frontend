import { NextRequest, NextResponse } from 'next/server';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/trending - Get trending projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'week'; // day, week, month
    const limit = parseInt(searchParams.get('limit') || '10');

    // Calculate date threshold based on timeframe
    const now = new Date();
    let thresholdDate: Date;
    
    switch (timeframe) {
      case 'day':
        thresholdDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        thresholdDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'week':
      default:
        thresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get recent projects
    const projects = await ProjectModel.getAll({
      status: 'approved',
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: 100
    });

    // Filter projects within timeframe and calculate trending score
    const trendingProjects = await Promise.all(
      projects
        .filter((project: any) => {
          const createdDate = project.createdAt?.seconds 
            ? new Date(project.createdAt.seconds * 1000)
            : new Date(project.createdAt);
          return createdDate >= thresholdDate;
        })
        .map(async (project: any) => {
          const applications = await ApplicationModel.getByProject(project.id);
          
          // Filter applications within timeframe
          const recentApplications = applications.filter((app: any) => {
            const appDate = app.createdAt?.seconds 
              ? new Date(app.createdAt.seconds * 1000)
              : new Date(app.createdAt);
            return appDate >= thresholdDate;
          });
          
          // Trending score based on:
          // - Recent applications (momentum)
          // - Total applications (popularity)
          // - Current team size vs max team size (urgency)
          const currentTeamSize = project.teamMembers?.length || 1;
          const spotsRemaining = project.teamSize - currentTeamSize;
          const urgencyScore = spotsRemaining > 0 ? spotsRemaining * 5 : 0;
          
          const trendingScore = (recentApplications.length * 15) + 
                                (applications.length * 5) + 
                                urgencyScore;
          
          return {
            ...project,
            applicationCount: applications.length,
            recentApplicationCount: recentApplications.length,
            spotsRemaining,
            trendingScore
          };
        })
    );

    // Sort by trending score and return top N
    const topTrending = trendingProjects
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return NextResponse.json({ projects: topTrending });
  } catch (error) {
    console.error('[projects/trending/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch trending projects', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
}
