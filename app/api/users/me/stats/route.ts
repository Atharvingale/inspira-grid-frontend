import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import ProjectModel from '@/lib/models/Project';
import ApplicationModel from '@/lib/models/Application';
import { getFirestore } from '@/lib/firebase-admin';

// GET /api/users/me/stats - Get current user's statistics
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const db = getFirestore();
    
    // Get user's projects
    const ownedProjects = await ProjectModel.getAll({ ownerId: user.uid });
    
    // Get projects where user is a team member
    const allProjects = await ProjectModel.getAll({});
    const teamProjects = allProjects.filter((project: any) => 
      project.teamMembers?.some((member: any) => 
        member.userId === user.uid || member.uid === user.uid
      ) && project.ownerId !== user.uid
    );
    
    // Get user's applications
    const applications = await ApplicationModel.getByUser(user.uid);
    
    // Calculate stats
    const totalProjects = ownedProjects.length;
    const totalApplications = applications.length;
    const acceptedApplications = applications.filter((app: any) => app.status === 'accepted').length;
    const teamMemberships = teamProjects.length;
    const projectsCompleted = ownedProjects.filter((p: any) => p.status === 'completed').length;
    
    // Get user profile for skills count
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    const skillsCount = userData?.skills?.length || 0;

    return NextResponse.json({
      totalProjects,
      totalApplications,
      acceptedApplications,
      teamMemberships,
      projectsCompleted,
      skillsCount
    });
  } catch (error) {
    console.error('[users/me/stats/route.ts]', error);

    return NextResponse.json(
      { error: 'Failed to fetch user statistics', message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error' },
      { status: 500 }
    );
  }
});
