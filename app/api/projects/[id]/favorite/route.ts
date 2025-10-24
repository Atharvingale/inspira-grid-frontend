import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/projects/:id/favorite - Toggle project favorite
export const POST = withAuth(async (request: NextRequest, user, { params }: { params: { id: string } }) => {
  try {
    const projectId = params.id;
    
    initAdmin();
    const db = getFirestore();
    
    // Check if already favorited
    const favoriteRef = db.collection('favorites').doc(`${user.uid}_${projectId}`);
    const favoriteDoc = await favoriteRef.get();
    
    if (favoriteDoc.exists) {
      // Remove from favorites
      await favoriteRef.delete();
      return NextResponse.json({ isFavorite: false });
    } else {
      // Add to favorites
      await favoriteRef.set({
        userId: user.uid,
        projectId,
        createdAt: FieldValue.serverTimestamp()
      });
      return NextResponse.json({ isFavorite: true });
    }
  } catch (error: any) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json(
      { error: 'Failed to toggle favorite', message: error.message },
      { status: 500 }
    );
  }
});
