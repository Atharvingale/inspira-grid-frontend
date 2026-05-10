import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/users/[userId]
export const GET = withAuth(async (request: NextRequest, user, context: { params: Promise<{ userId: string }> }) => {
  try {
    const params = await context.params;
    const { userId } = params;
    
    initAdmin();
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    // Return public profile information only
    const publicProfile = {
      uid: userDoc.id,
      displayName: userData?.displayName,
      email: userData?.email,
      photoURL: userData?.photoURL,
      bio: userData?.bio,
      location: userData?.location,
      website: userData?.website,
      skills: userData?.skills || [],
      joinedAt: userData?.joinedAt,
      profileComplete: userData?.profileComplete
    };
    
    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error('[users/[userId]/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch user profile', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
