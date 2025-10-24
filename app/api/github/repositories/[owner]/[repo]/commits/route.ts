import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/github/repositories/:owner/:repo/commits
export const GET = withAuth(async (request: NextRequest, user, { params }: { params: { owner: string; repo: string } }) => {
  try {
    initAdmin();
    const db = getFirestore();
    
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
    const perPage = searchParams.get('per_page') || '30';
    const page = searchParams.get('page') || '1';

    // Fetch commits from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`,
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

    const commits = await response.json();

    return NextResponse.json({
      success: true,
      data: commits
    });
  } catch (error: any) {
    console.error('Error fetching repository commits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commits', message: error.message },
      { status: 500 }
    );
  }
});
