import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/github/repositories/search
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    // Get user's GitHub access token
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const accessToken = userData?.githubAccessToken;
    const githubUsername = userData?.githubProfile?.login;

    if (!accessToken || !githubUsername) {
      return NextResponse.json(
        { success: false, error: 'GitHub account not connected' },
        { status: 404 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = searchParams.get('limit') || '30';
    const sort = searchParams.get('sort') || 'updated';

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search repositories using GitHub API
    const searchQuery = `${query}+user:${githubUsername}`;
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=${limit}&sort=${sort}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const searchResults = await response.json();

    return NextResponse.json({
      success: true,
      data: searchResults.items || []
    });
  } catch (error) {
    console.error('[github/repositories/search/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to search repositories', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
