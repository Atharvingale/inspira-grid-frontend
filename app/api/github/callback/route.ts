import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// GET /api/github/callback
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?error=github_auth_failed', request.url)
      );
    }

    // Decode and verify state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?error=auth_state_missing', request.url)
      );
    }

    const { userId } = stateData;

    if (!userId) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?error=auth_state_missing', request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('GitHub OAuth error:', tokenData);
      return NextResponse.redirect(
        new URL('/dashboard/profile?error=github_auth_failed', request.url)
      );
    }

    // Fetch user data from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    });

    const githubUser = await userResponse.json();

    if (!githubUser.id) {
      return NextResponse.redirect(
        new URL('/dashboard/profile?error=github_auth_no_user', request.url)
      );
    }

    // Save GitHub data to Firestore
    initAdmin();
    const db = getFirestore();
    
    await db.collection('users').doc(userId).update({
      githubProfile: {
        id: githubUser.id.toString(),
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
        avatar_url: githubUser.avatar_url,
        html_url: githubUser.html_url,
        public_repos: githubUser.public_repos,
        followers: githubUser.followers,
        following: githubUser.following,
        bio: githubUser.bio,
        location: githubUser.location,
        blog: githubUser.blog,
        company: githubUser.company,
        connectedAt: FieldValue.serverTimestamp()
      },
      githubAccessToken: tokenData.access_token, // Store encrypted in production
      updatedAt: FieldValue.serverTimestamp()
    });

    // Redirect to profile with success message
    return NextResponse.redirect(
      new URL('/dashboard/profile?success=github_connected', request.url)
    );
  } catch (error: any) {
    console.error('GitHub callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/profile?error=github_link_failed', request.url)
    );
  }
}
