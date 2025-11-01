import { getFirestore, initAdmin } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import ProjectModel from './Project';

class ApplicationModel {
  private get db() {
    initAdmin();
    return getFirestore();
  }

  private get collection() {
    return this.db.collection('applications');
  }

  // Create a new application
  async create(applicationData: any) {
    try {
      const docRef = this.collection.doc();
      const application = {
        id: docRef.id,
        ...applicationData,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await docRef.set(application);
      
      // Increment application count in project
      const projectRef = this.db.collection('projects').doc(applicationData.projectId);
      await projectRef.update({
        applicationCount: FieldValue.increment(1)
      });

      return { id: docRef.id, ...application };
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  // Get application by ID
  async getById(applicationId: string) {
    try {
      const doc = await this.collection.doc(applicationId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting application:', error);
      throw error;
    }
  }

  // Get applications by project
  async getByProject(projectId: string, status: string | null = null) {
    try {
      let query: any = this.collection.where('projectId', '==', projectId);
      
      if (status) {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting applications by project:', error);
      throw error;
    }
  }

  // Get applications by user
  async getByUser(userId: string, status: string | null = null) {
    try {
      let query: any = this.collection.where('applicantId', '==', userId);
      
      if (status) {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting applications by user:', error);
      throw error;
    }
  }

  // Update application status
  async updateStatus(applicationId: string, status: string, reviewerId: string | null = null, reviewNote: string | null = null) {
    try {
      const updateData: any = {
        status,
        updatedAt: FieldValue.serverTimestamp()
      };

      if (reviewerId) {
        updateData.reviewerId = reviewerId;
        updateData.reviewedAt = FieldValue.serverTimestamp();
      }

      if (reviewNote) {
        updateData.reviewNote = reviewNote;
      }

      await this.collection.doc(applicationId).update(updateData);

      // If accepted, add user to project team
      if (status === 'accepted') {
        const application = await this.getById(applicationId);
        if (application) {
          await ProjectModel.addTeamMember(application.projectId, application.applicantId);
        }
      }

      return this.getById(applicationId);
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  // Delete application
  async delete(applicationId: string) {
    try {
      const application = await this.getById(applicationId);
      if (application) {
        // Decrement application count in project
        const projectRef = this.db.collection('projects').doc(application.projectId);
        await projectRef.update({
          applicationCount: FieldValue.increment(-1)
        });
      }

      await this.collection.doc(applicationId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  // Check if user has already applied to project (excluding accepted applications)
  async hasApplied(userId: string, projectId: string) {
    try {
      const snapshot = await this.collection
        .where('applicantId', '==', userId)
        .where('projectId', '==', projectId)
        .where('status', 'in', ['pending', 'rejected'])
        .get();

      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking application:', error);
      throw error;
    }
  }

  // Get application statistics
  async getStats() {
    try {
      const [totalSnapshot, pendingSnapshot, acceptedSnapshot, rejectedSnapshot] = await Promise.all([
        this.collection.get(),
        this.collection.where('status', '==', 'pending').get(),
        this.collection.where('status', '==', 'accepted').get(),
        this.collection.where('status', '==', 'rejected').get()
      ]);

      return {
        total: totalSnapshot.size,
        pending: pendingSnapshot.size,
        accepted: acceptedSnapshot.size,
        rejected: rejectedSnapshot.size
      };
    } catch (error) {
      console.error('Error getting application stats:', error);
      throw error;
    }
  }

  // Get applications with user details (for project owners)
  async getByProjectWithUserDetails(projectId: string) {
    try {
      const applications = await this.getByProject(projectId);
      
      // Get user details for each application
      const applicationsWithUsers = await Promise.all(
        applications.map(async (app: any) => {
          const userDoc = await this.db.collection('users').doc(app.applicantId).get();
          const userData = userDoc.exists ? userDoc.data() : null;
          
          return {
            ...app,
            applicantDetails: userData ? {
              displayName: userData.displayName,
              email: userData.email,
              photoURL: userData.photoURL,
              bio: userData.bio,
              skills: userData.skills,
              githubUsername: userData.githubUsername
            } : null
          };
        })
      );

      return applicationsWithUsers;
    } catch (error) {
      console.error('Error getting applications with user details:', error);
      throw error;
    }
  }
}

export default new ApplicationModel();
