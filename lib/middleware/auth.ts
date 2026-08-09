import { NextRequest, NextResponse } from 'next/server';
import { getAuth, getFirestore } from '../firebase-admin';
import { initAdmin } from '../firebase-admin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  profileComplete?: boolean;
  role?: string;
  skills?: string[];
  [key: string]: any;
}

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthenticatedUser;
}

/**
 * Middleware to validate Firebase ID token from request headers
 * Returns the authenticated user or throws an error
 */
export async function validateFirebaseToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    initAdmin(); // Ensure Firebase Admin is initialized
    
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null; // No token provided
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify Firebase ID token
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user data from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.suspended === true) return null;
      return {
        uid: decodedToken.uid,
        ...userData
      } as AuthenticatedUser;
    } else {
      // Return basic user info from token
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email?.split('@')[0],
        profileComplete: false
      };
    }
  } catch (error) {
    console.error('Firebase token validation error:', error);
    return null;
  }
}

/**
 * Higher-order function to protect API routes with authentication
 * Usage: export const GET = withAuth(async (request, user, context) => { ... })
 * 
 * Note: In Next.js 15, dynamic route params are Promises and must be awaited in your handler.
 * Example: const params = await context.params; const { id } = params;
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, user: AuthenticatedUser, context: T) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const user = await validateFirebaseToken(request);
    
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        },
        { status: 401 }
      );
    }
    
    return handler(request, user, context);
  };
}

/**
 * Middleware to check if user's profile is complete
 */
export function withCompleteProfile<T = any>(
  handler: (request: NextRequest, user: AuthenticatedUser, context: T) => Promise<Response>
) {
  return withAuth(async (request: NextRequest, user: AuthenticatedUser, context: T): Promise<Response> => {
    if (!user.profileComplete) {
      return NextResponse.json(
        {
          error: 'Profile incomplete',
          message: 'Please complete your profile before accessing this resource',
          profileComplete: false
        },
        { status: 400 }
      );
    }
    
    return handler(request, user, context);
  });
}

/**
 * Middleware to check if user has admin role
 */
export function withAdmin<T = any>(
  handler: (request: NextRequest, user: AuthenticatedUser, context: T) => Promise<Response>
) {
  return withAuth(async (request: NextRequest, user: AuthenticatedUser, context: T): Promise<Response> => {
    if (user.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Admin access required',
          message: 'You do not have permission to access this resource'
        },
        { status: 403 }
      );
    }
    
    return handler(request, user, context);
  });
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * Doesn't throw error if not authenticated
 */
export async function optionalAuth(request: NextRequest): Promise<AuthenticatedUser | null> {
  return validateFirebaseToken(request);
}
