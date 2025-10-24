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
  } catch (error: any) {
    console.error('Error disconnecting GitHub:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect GitHub account', message: error.message },
      { status: 500 }
    );
  }
});
