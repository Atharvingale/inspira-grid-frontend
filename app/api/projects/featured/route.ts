import { NextRequest, NextResponse } from 'next/server';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';

// GET /api/projects/featured - Get featured projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6');

    // Get approved projects sorted by application count (popularity)
    const projects = await ProjectModel.getAll({
      status: 'approved',
      orderBy: 'createdAt',
      orderDirection: 'desc',
      limit: 50 // Get more to filter from
    });

    // Calculate featured score for each project
    const projectsWithScores = await Promise.all(
      projects.map(async (project: any) => {
        const applications = await ApplicationModel.getByProject(project.id);
        const applicationCount = applications.length;
        
        // Featured score based on:
        // - Application count (popularity)
        // - Recency (newer projects get boost)
        // - Team size (larger teams = more active)
        const createdDate = project.createdAt?.seconds 
          ? new Date(project.createdAt.seconds * 1000)
          : new Date(project.createdAt);
        const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        const recencyScore = Math.max(0, 30 - daysSinceCreation); // Boost for projects < 30 days old
        
        const featuredScore = (applicationCount * 10) + recencyScore + (project.teamSize * 2);
        
        return {
          ...project,
          applicationCount,
          featuredScore
        };
      })
    );

    // Sort by featured score and return top N
    const featuredProjects = projectsWithScores
      .sort((a, b) => b.featuredScore - a.featuredScore)
      .slice(0, limit);

    return NextResponse.json({ projects: featuredProjects });
  } catch (error) {
    console.error('[projects/featured/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch featured projects', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
}
