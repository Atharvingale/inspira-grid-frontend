import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/github/repositories/:owner/:repo/issues
export const GET = withAuth(async (request: NextRequest, user, context: { params: Promise<{ owner: string; repo: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    const params = await context.params;
    const { owner, repo } = params;
    
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

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'GitHub account not connected' },
        { status: 404 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state') || 'open';
    const perPage = searchParams.get('per_page') || '30';
    const page = searchParams.get('page') || '1';

    // Fetch issues from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: 'Repository not found' },
          { status: 404 }
        );
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const issues = await response.json();

    return NextResponse.json({
      success: true,
      data: issues
    });
  } catch (error: any) {
    console.error('Error fetching repository issues:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch issues', message: error.message },
      { status: 500 }
    );
  }
});
