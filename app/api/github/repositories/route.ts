import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/github/repositories
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

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'GitHub account not connected' },
        { status: 404 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '30';
    const sort = searchParams.get('sort') || 'updated';
    const type = searchParams.get('type') || 'owner';

    // Fetch repositories from GitHub API
    const response = await fetch(
      `https://api.github.com/user/repos?per_page=${limit}&sort=${sort}&type=${type}`,
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

    const repositories = await response.json();

    return NextResponse.json({
      success: true,
      data: repositories
    });
  } catch (error: any) {
    console.error('Error fetching GitHub repositories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repositories', message: error.message },
      { status: 500 }
    );
  }
});
