import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';

// GET /api/github/oauth-url
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'GitHub OAuth not configured' },
        { status: 500 }
      );
    }

    // Generate state for security
    const state = Buffer.from(JSON.stringify({
      userId: user.uid,
      timestamp: Date.now()
    })).toString('base64');

    // GitHub OAuth URL
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      process.env.NEXT_PUBLIC_APP_URL + '/api/github/callback'
    )}&scope=read:user,user:email,repo&state=${state}`;

    return NextResponse.json({
      success: true,
      data: {
        oauthUrl,
        message: 'Redirect to GitHub OAuth'
      }
    });
  } catch (error: any) {
    console.error('Error generating GitHub OAuth URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate OAuth URL', message: error.message },
      { status: 500 }
    );
  }
});
