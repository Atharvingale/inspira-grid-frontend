import { getFirestore, initAdmin } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

class ProjectModel {
  private get collection() {
    initAdmin();
    const db = getFirestore();
    return db.collection('projects');
  }

  // Create a new project
  async create(projectData: any) {
    try {
      const docRef = this.collection.doc();
      const project = {
        id: docRef.id,
        ...projectData,
        status: 'open',
        applicationCount: 0,
        teamMembers: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await docRef.set(project);
      return { id: docRef.id, ...project };
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Get project by ID
  async getById(projectId: string): Promise<any> {
    try {
      const doc = await this.collection.doc(projectId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  }

  // Get all projects with filters
  async getAll(filters: any = {}): Promise<any[]> {
    try {
      let query: any = this.collection;

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      if (filters.skills && filters.skills.length > 0) {
        query = query.where('skillsRequired', 'array-contains-any', filters.skills);
      }
      if (filters.ownerId) {
        query = query.where('ownerId', '==', filters.ownerId);
      }

      const orderBy = filters.orderBy || 'createdAt';
      const orderDirection = filters.orderDirection || 'desc';
      query = query.orderBy(orderBy, orderDirection);

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  }

  // Update project
  async update(projectId: string, updates: any) {
    try {
      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp()
      };
      
      await this.collection.doc(projectId).update(updateData);
      return this.getById(projectId);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // Delete project
  async delete(projectId: string) {
    try {
      await this.collection.doc(projectId).delete();
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  // Add team member to project
  async addTeamMember(projectId: string, userId: string, role = 'member') {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      initAdmin();
      const db = getFirestore();
      const teamMember = {
        userId,
        role,
        joinedAt: new Date().toISOString()
      };

      await this.collection.doc(projectId).update({
        teamMembers: FieldValue.arrayUnion(teamMember),
        updatedAt: FieldValue.serverTimestamp()
      });

      return this.getById(projectId);
    } catch (error) {
      console.error('Error adding team member:', error);
      throw error;
    }
  }

  // Remove team member from project
  async removeTeamMember(projectId: string, userId: string) {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const updatedMembers = project.teamMembers.filter((member: any) => member.userId !== userId);

      await this.collection.doc(projectId).update({
        teamMembers: updatedMembers,
        updatedAt: FieldValue.serverTimestamp()
      });

      return this.getById(projectId);
    } catch (error) {
      console.error('Error removing team member:', error);
      throw error;
    }
  }

  // Get projects by team member
  async getByTeamMember(userId: string): Promise<any[]> {
    try {
      const snapshot = await this.collection
        .where('teamMembers', 'array-contains', { userId })
        .orderBy('updatedAt', 'desc')
        .get();

      return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting projects by team member:', error);
      throw error;
    }
  }

  // Search projects
  async search(searchTerm: string, filters: any = {}) {
    try {
      let query: any = this.collection;

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.ownerId) {
        query = query.where('ownerId', '==', filters.ownerId);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      const orderBy = filters.orderBy || 'createdAt';
      const orderDirection = filters.orderDirection || 'desc';
      const limit = filters.limit || 50;

      const snapshot = await query
        .orderBy(orderBy, orderDirection)
        .limit(limit)
        .get();

      const projects = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      const searchTermLower = searchTerm.toLowerCase();
      const filtered = projects.filter((project: any) => 
        project.title?.toLowerCase().includes(searchTermLower) ||
        project.description?.toLowerCase().includes(searchTermLower) ||
        project.skillsRequired?.some((skill: string) => skill.toLowerCase().includes(searchTermLower))
      );

      return filtered;
    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
    }
  }

  // Link GitHub repository to project
  async linkGitHubRepository(projectId: string, repositoryData: any) {
    try {
      const project = await this.getById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const githubRepo = {
        repositoryUrl: repositoryData.repositoryUrl,
        repositoryName: repositoryData.repositoryName,
        description: repositoryData.description,
        linkedAt: FieldValue.serverTimestamp()
      };

      await this.collection.doc(projectId).update({
        githubRepository: githubRepo,
        updatedAt: FieldValue.serverTimestamp()
      });

      return this.getById(projectId);
    } catch (error) {
      console.error('Error linking GitHub repository:', error);
      throw error;
    }
  }

  // Get project statistics
  async getStats() {
    try {
      const [totalSnapshot, openSnapshot, inProgressSnapshot, completedSnapshot] = await Promise.all([
        this.collection.get(),
        this.collection.where('status', '==', 'open').get(),
        this.collection.where('status', '==', 'in-progress').get(),
        this.collection.where('status', '==', 'completed').get()
      ]);

      return {
        total: totalSnapshot.size,
        open: openSnapshot.size,
        inProgress: inProgressSnapshot.size,
        completed: completedSnapshot.size
      };
    } catch (error) {
      console.error('Error getting project stats:', error);
      throw error;
    }
  }
}

export default new ProjectModel();
