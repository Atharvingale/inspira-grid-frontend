import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { initAdmin, getFirestore } from '@/lib/firebase-admin';

/**
 * GET /api/users
 * Get list of users (for messaging, team invitations, etc.)
 * Query params:
 *   - limit: number of users to return (default: 20)
 *   - query: search query for name/email
 *   - projectId: filter users by project team members
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await validateFirebaseToken(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const query = searchParams.get('query')?.toLowerCase() || '';
    const projectId = searchParams.get('projectId');

    // Initialize Firebase Admin and get Firestore instance
    initAdmin();
    const db = getFirestore();
    let usersQuery = db.collection('users');

    // Apply limit
    usersQuery = usersQuery.limit(limit);

    // Execute query
    const usersSnapshot = await usersQuery.get();

    // Map and filter users
    let users = usersSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || data.name || 'Anonymous',
          email: data.email || '',
          photoURL: data.photoURL || null,
          isOnline: data.isOnline || false,
        };
      })
      // Filter out current user
      .filter(u => u.id !== user.uid);

    // Apply search filter if query provided
    if (query) {
      users = users.filter(u => 
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }

    // If projectId provided, filter by project team members
    if (projectId) {
      const projectDoc = await db.collection('projects').doc(projectId).get();
      if (projectDoc.exists) {
        const projectData = projectDoc.data();
        const teamMemberIds = new Set([
          projectData?.ownerId,
          ...(projectData?.teamMembers || []).map((m: any) => m.userId || m.id)
        ]);
        
        users = users.filter(u => teamMemberIds.has(u.id));
      }
    }

    return NextResponse.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
