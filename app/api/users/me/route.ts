import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// GET /api/users/me
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    initAdmin();
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      const initialProfile = {
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        profileComplete: false,
        skills: [],
        availability: 'available',
        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      
      if (user.photoURL) {
        (initialProfile as any).photoURL = user.photoURL;
      }
      
      await db.collection('users').doc(user.uid).set(initialProfile);
      
      return NextResponse.json({
        uid: user.uid,
        ...initialProfile,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    const userData = userDoc.data();
    return NextResponse.json({
      uid: user.uid,
      ...userData,
      createdAt: userData?.createdAt?.toDate?.(),
      updatedAt: userData?.updatedAt?.toDate?.(),
      joinedAt: userData?.joinedAt?.toDate?.()
    });
  } catch (error) {
    console.error('[users/me/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch profile', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/users/me
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    
    initAdmin();
    const db = getFirestore();
    const userRef = db.collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    
    const profileData: any = {
      displayName: body.displayName,
      bio: body.bio,
      location: body.location,
      website: body.website,
      github: body.github,
      linkedin: body.linkedin,
      skills: body.skills || [],
      experience: body.experience,
      availability: body.availability || 'available',
      updatedAt: FieldValue.serverTimestamp()
    };
    
    // Remove undefined values
    Object.keys(profileData).forEach(key => {
      if (profileData[key] === undefined) {
        delete profileData[key];
      }
    });
    
    // Check if profile is complete
    const isProfileComplete = !!(profileData.displayName && profileData.bio && profileData.skills && profileData.skills.length > 0);
    profileData.profileComplete = isProfileComplete;
    
    if (!userDoc.exists) {
      profileData.email = user.email;
      if (user.photoURL) profileData.photoURL = user.photoURL;
      profileData.joinedAt = FieldValue.serverTimestamp();
      profileData.createdAt = FieldValue.serverTimestamp();
      
      await userRef.set(profileData);
    } else {
      await userRef.update(profileData);
    }
    
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    
    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: {
        uid: user.uid,
        ...updatedData,
        createdAt: updatedData?.createdAt?.toDate?.(),
        updatedAt: updatedData?.updatedAt?.toDate?.(),
        joinedAt: updatedData?.joinedAt?.toDate?.()
      }
    });
  } catch (error) {
    console.error('[users/me/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to update profile', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT /api/users/me - same as POST for updating profile
export const PUT = POST;
