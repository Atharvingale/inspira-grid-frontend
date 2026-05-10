import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore } from '@/lib/firebase-admin';

// GET /api/projects/favorites - Get user's favorite projects
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const db = getFirestore();
    
    // Get user's favorites from a favorites collection
    const favoritesSnapshot = await db
      .collection('favorites')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const projectIds = favoritesSnapshot.docs.map(doc => doc.data().projectId);

    if (projectIds.length === 0) {
      return NextResponse.json({
        projects: [],
        pagination: {
          currentPage: page,
          totalProjects: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    // Fetch project details (Firestore limits 'in' queries to 10 items)
    const chunkSize = 10;
    const projects: any[] = [];
    
    for (let i = 0; i < projectIds.length; i += chunkSize) {
      const chunk = projectIds.slice(i, i + chunkSize);
      const projectsSnapshot = await db
        .collection('projects')
        .where('__name__', 'in', chunk)
        .get();
      
      projectsSnapshot.docs.forEach(doc => {
        projects.push({ id: doc.id, ...doc.data() });
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProjects = projects.slice(startIndex, endIndex);

    return NextResponse.json({
      projects: paginatedProjects,
      pagination: {
        currentPage: page,
        totalProjects: projects.length,
        totalPages: Math.ceil(projects.length / limit),
        hasNext: endIndex < projects.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('[projects/favorites/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch favorites', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
