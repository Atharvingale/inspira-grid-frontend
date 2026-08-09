import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { withAuth } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// PATCH /api/applications/:id/accept
// Acceptance is transactional so capacity, membership, application status, and notification stay consistent.
export const PATCH = withAuth(async (request: NextRequest, user, context: { params: Promise<{ id: string }> }) => {
  try {
    initAdmin();
    const db = getFirestore();
    const { id } = await context.params;
    const { role = 'member', welcomeMessage = 'Your application has been accepted!' } = await request.json();
    const applicationRef = db.collection('applications').doc(id);

    const result = await db.runTransaction(async (transaction) => {
      const applicationDoc = await transaction.get(applicationRef);
      if (!applicationDoc.exists) throw new Error('APPLICATION_NOT_FOUND');
      const application = applicationDoc.data()!;
      if (application.status !== 'pending') throw new Error('APPLICATION_NOT_PENDING');

      const projectRef = db.collection('projects').doc(application.projectId);
      const projectDoc = await transaction.get(projectRef);
      if (!projectDoc.exists) throw new Error('PROJECT_NOT_FOUND');
      const project = projectDoc.data()!;
      if (project.ownerId !== user.uid && project.owner?.id !== user.uid) throw new Error('FORBIDDEN');
      if (project.status !== 'open') throw new Error('PROJECT_NOT_OPEN');

      const existingMembers = Array.isArray(project.teamMembers)
        ? project.teamMembers
        : Array.isArray(project.team) ? project.team : [];
      if (existingMembers.some((member: { userId: string }) => member.userId === application.applicantId)) {
        throw new Error('ALREADY_A_MEMBER');
      }
      const capacity = Number(project.teamSize || 0);
      if (capacity > 0 && existingMembers.length >= capacity) throw new Error('TEAM_FULL');

      const member = {
        userId: application.applicantId,
        displayName: application.applicantName || 'Team member',
        name: application.applicantName || 'Team member',
        email: application.applicantEmail || '',
        role,
        skills: application.skills || [],
        joinedAt: FieldValue.serverTimestamp(),
      };
      const notificationRef = db.collection('notifications').doc();
      transaction.update(applicationRef, {
        status: 'accepted', reviewMessage: welcomeMessage, reviewedBy: user.uid,
        reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(projectRef, {
        teamMembers: [...existingMembers, member], team: [...existingMembers, member],
        currentTeamSize: existingMembers.length + 1, updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(notificationRef, {
        userId: application.applicantId, title: 'Application accepted', message: welcomeMessage,
        type: 'application_accepted', isRead: false,
        data: { applicationId: id, projectId: application.projectId, projectTitle: application.projectTitle },
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return { applicationId: id, projectId: application.projectId };
    });

    return NextResponse.json({ success: true, data: result, message: 'Application accepted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to accept application';
    const status = ['APPLICATION_NOT_FOUND', 'PROJECT_NOT_FOUND'].includes(message) ? 404
      : ['FORBIDDEN'].includes(message) ? 403
      : ['APPLICATION_NOT_PENDING', 'PROJECT_NOT_OPEN', 'ALREADY_A_MEMBER', 'TEAM_FULL'].includes(message) ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
});
