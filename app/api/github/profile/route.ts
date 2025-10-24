import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/github/profile
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    // Get user's GitHub data from Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const githubData = userData?.githubProfile;

    if (!githubData) {
      return NextResponse.json(
        { success: false, error: 'GitHub account not connected' },
        { status: 404 }
      );
    }

    // Return GitHub profile data
    return NextResponse.json({
      success: true,
      data: {
        id: githubData.id,
        username: githubData.login || githubData.username,
        displayName: githubData.name || githubData.displayName,
        email: githubData.email,
        avatarUrl: githubData.avatar_url || githubData.avatarUrl,
        profileUrl: githubData.html_url || githubData.profileUrl,
        publicRepos: githubData.public_repos || githubData.publicRepos || 0,
        followers: githubData.followers || 0,
        following: githubData.following || 0,
        bio: githubData.bio || '',
        location: githubData.location || '',
        website: githubData.blog || githubData.website || '',
        company: githubData.company || '',
        connectedAt: githubData.connectedAt || null
      }
    });
  } catch (error: any) {
    console.error('Error fetching GitHub profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GitHub profile', message: error.message },
      { status: 500 }
    );
  }
});
