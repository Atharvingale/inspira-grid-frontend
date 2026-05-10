import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/github/disconnect
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    initAdmin();
    const db = getFirestore();
    
    // Remove GitHub data from user document
    await db.collection('users').doc(user.uid).update({
      githubProfile: FieldValue.delete(),
      githubAccessToken: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'GitHub account disconnected successfully'
      }
    });
  } catch (error) {
    console.error('[github/disconnect/route.ts]', error);

    return NextResponse.json(
      { success: false, error: 'Failed to disconnect GitHub account', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
