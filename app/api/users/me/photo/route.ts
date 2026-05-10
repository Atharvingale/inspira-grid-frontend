import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/users/me/photo - Upload profile picture
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // In a real implementation, you would upload to cloud storage (Firebase Storage, AWS S3, etc.)
    // For now, we'll use a base64 data URL
    const base64 = buffer.toString('base64');
    const photoURL = `data:${file.type};base64,${base64}`;

    // Update user profile with photo URL
    initAdmin();
    const db = getFirestore();
    await db.collection('users').doc(user.uid).update({
      photoURL,
      updatedAt: FieldValue.serverTimestamp()
    });

    return NextResponse.json({ 
      photoURL,
      message: 'Profile picture uploaded successfully'
    });
  } catch (error) {
    console.error('[users/me/photo/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to upload profile picture', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
