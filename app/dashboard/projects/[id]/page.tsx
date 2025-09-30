'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/AuthContext';
import { apiClient as api } from '@/lib/api';
import Loading from '@/components/common/Loading';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  skillsRequired?: string[];
  ownerId: string;
  ownerName: string;
  teamSize: number;
  teamMembers?: Array<{ userId: string; name: string; role?: string }>;
  duration?: string;
  budget?: string;
  githubRepo?: string;
  status: 'approved' | 'pending' | 'rejected' | 'in-progress' | 'completed';
  createdAt: { seconds: number } | string;
  applicationCount?: number;
  isOwner?: boolean;
  isTeamMember?: boolean;
  hasApplied?: boolean;
}

interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  message: string;
  skills?: string[];
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: { seconds: number } | string;
}

const ProjectDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (project && project.isOwner && activeTab === 'applications') {
      loadApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, activeTab]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/api/projects/${id}`);
      setProject(data as Project);
    } catch (error: any) {
      console.error('Error loading project:', error);
      toast.error(error.response?.data?.message || 'Failed to load project');
      if (error.response?.status === 404) {
        router.push('/dashboard/projects');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const data = await api.get(`/api/projects/${id}/applications`);
      setApplications((data as any)?.applications || []);
    } catch (error: any) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const handleApply = async () => {
    if (!applicationMessage.trim() || applicationMessage.trim().length < 10) {
      toast.error('Please provide a detailed application message (at least 10 characters)');
      return;
    }

    try {
      setApplying(true);
      await api.post(`/api/projects/${id}/apply`, {
        message: applicationMessage.trim()
      });
      toast.success('Application submitted successfully!');
      setShowApplyModal(false);
      setApplicationMessage('');
      loadProject(); // Refresh to update hasApplied status
    } catch (error: any) {
      console.error('Error applying to project:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'accepted' | 'rejected', reviewNote = '') => {
    try {
      await api.put(`/api/applications/${applicationId}`, {
        status: action,
        reviewNote
      });
      toast.success(`Application ${action} successfully`);
      loadApplications(); // Refresh applications
      loadProject(); // Refresh project to update team members if accepted
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast.error(error.response?.data?.message || 'Failed to update application');
    }
  };

  const formatDate = (date: string | { seconds: number }) => {
    try {
      const dateObj = typeof date === 'object' && 'seconds' in date && date.seconds 
        ? new Date(date.seconds * 1000)
        : new Date(date as string);
      return dateObj.toLocaleDateString();
    } catch (_error) {
      return 'Unknown date';
    }
  };

  if (loading) {
    return <Loading message="Loading project details..." />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">Project Not Found</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  The project you're looking for doesn't exist or may have been removed.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/dashboard/projects')}
                    className="bg-red-500/20 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Back to Projects
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canApply = !project.isOwner && !project.isTeamMember && !project.hasApplied && project.status === 'approved';
  const canManage = project.isOwner;

  const getStatusBadge = (status: string) => {
    const colors = {
      approved: 'bg-success-500/20 text-success-500 border border-success-500/30',
      pending: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30',
      rejected: 'bg-red-500/20 text-red-500 border border-red-500/30',
      'in-progress': 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30',
      completed: 'bg-text-tertiary/20 text-text-tertiary border border-text-tertiary/30'
    };
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${colors[status as keyof typeof colors] || colors.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter p-6">
      <div className="max-w-6xl mx-auto">
        {/* Project Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-text-primary to-brand-light bg-clip-text text-transparent">{project.title}</h1>
                {getStatusBadge(project.status)}
              </div>
              <div className="flex items-center text-text-secondary mb-2 space-x-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Created by {project.ownerName}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-8 0a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2m-8 0h8" />
                  </svg>
                  <span>{formatDate(project.createdAt)}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>{project.category}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {canApply && (
                <button 
                  onClick={() => setShowApplyModal(true)}
                  disabled={!userProfile?.profileComplete}
                  className="px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-lg hover:from-brand-primary/90 hover:to-brand-secondary/90 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Apply to Join
                </button>
              )}
              
              {canManage && (
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/10 transition-colors backdrop-blur-sm"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Project
                </button>
              )}
              
              <button 
                onClick={() => router.push('/dashboard/projects')}
                className="px-4 py-2 border border-dark-border text-text-secondary rounded-lg hover:bg-dark-surface/50 hover:text-text-primary transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Projects
              </button>
            </div>
          </div>
          
          {!userProfile?.profileComplete && canApply && (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-400">
                    Complete your profile to apply to projects.
                    <Link href="/dashboard/profile" className="font-medium underline ml-2 hover:text-yellow-300">
                      Complete now →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-dark-border mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-dark-border'
              }`}
            >
              Overview
            </button>
            {(project.isOwner || project.isTeamMember) && (
              <button
                onClick={() => setActiveTab('teamchat')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'teamchat'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-dark-border'
                }`}
              >
                Team Chat
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setActiveTab('applications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'applications'
                    ? 'border-brand-primary text-brand-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-dark-border'
                }`}
              >
                Applications ({applications.length})
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Project Description */}
              <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-lg shadow-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Project Description</h2>
                <div className="prose max-w-none text-text-secondary">
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {project.description}
                  </p>
                </div>
                
                {project.githubRepo && (
                  <div className="mt-6 pt-6 border-t border-dark-border">
                    <h3 className="text-lg font-medium text-text-primary mb-2">Repository</h3>
                    <a 
                      href={project.githubRepo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-brand-primary hover:text-brand-light transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      {project.githubRepo}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Team Members */}
              <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-lg shadow-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">Team Members</h2>
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-medium text-text-primary">Project Owner</span>
                  </div>
                  <div className="ml-7">
                    <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium border border-brand-primary/30">
                      {project.ownerName}
                    </span>
                  </div>
                </div>
                
                {project.teamMembers && project.teamMembers.length > 0 ? (
                  <div>
                    <h3 className="font-medium text-text-primary mb-3">Team Members ({project.teamMembers.length})</h3>
                    {project.teamMembers.map((member, index) => (
                      <div key={index} className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-text-tertiary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-text-primary">{member.name}</span>
                        <span className="ml-2 px-2 py-1 bg-dark-surface/50 text-text-secondary rounded text-sm border border-dark-border">
                          {member.role || 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <svg className="w-12 h-12 mx-auto mb-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm">No team members yet. Be the first to join!</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Project Info</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-text-primary">Team Size:</span>
                    <div className="mt-1">
                      <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium border border-brand-primary/30">
                        {(project.teamMembers?.length || 0) + 1} / {project.teamSize} members
                      </span>
                    </div>
                  </div>
                  
                  {project.duration && (
                    <div>
                      <span className="font-medium text-text-primary">Duration:</span>
                      <p className="text-text-secondary mt-1">{project.duration}</p>
                    </div>
                  )}
                  
                  {project.budget && (
                    <div>
                      <span className="font-medium text-text-primary">Budget:</span>
                      <p className="text-text-secondary mt-1">{project.budget}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium text-text-primary">Status:</span>
                    <div className="mt-1">
                      {getStatusBadge(project.status)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Required Skills */}
              <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {project.skillsRequired?.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-dark-surface/50 text-text-secondary rounded-full text-sm border border-dark-border">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teamchat' && (project.isOwner || project.isTeamMember) && (
          <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-lg shadow-xl p-6" style={{ height: 'calc(100vh - 300px)' }}>
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-text-primary mb-2">Team Chat Coming Soon</h3>
              <p className="text-text-secondary">Real-time messaging functionality will be available here.</p>
            </div>
          </div>
        )}

        {activeTab === 'applications' && canManage && (
          <div className="bg-dark-card/80 backdrop-blur-sm border border-dark-border rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Project Applications</h2>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="text-lg font-medium text-text-primary mb-2">No Applications Yet</h3>
                <p className="text-text-secondary">Applications will appear here once people apply to join your project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {applications.map((application) => (
                  <div key={application.id} className="border border-dark-border rounded-lg p-4 bg-dark-surface/30 backdrop-blur-sm hover:border-brand-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-text-primary">{application.applicantName}</h4>
                        <p className="text-sm text-text-secondary">{application.applicantEmail}</p>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                    
                    <p className="text-text-secondary mb-3 text-sm">{application.message}</p>
                    
                    {application.skills && application.skills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-text-secondary mb-1">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {application.skills.map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-dark-surface/50 text-text-secondary rounded text-xs border border-dark-border">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {application.status === 'pending' && (
                      <div className="flex gap-2 mb-3">
                        <button 
                          onClick={() => handleApplicationAction(application.id, 'accepted')}
                          className="px-3 py-1 bg-success-500 text-white rounded-md text-sm hover:bg-success-600 transition-colors shadow-lg"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleApplicationAction(application.id, 'rejected')}
                          className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors shadow-lg"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    
                    <p className="text-xs text-text-tertiary">
                      Applied on {formatDate(application.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-dark-border w-full max-w-2xl shadow-2xl rounded-lg bg-dark-card backdrop-blur-md">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-text-primary">
                  Apply to {project.title}
                </h3>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-text-primary mb-2">Required Skills:</h4>
                <div className="flex flex-wrap gap-2">
                  {project.skillsRequired?.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-dark-surface/50 text-text-secondary rounded-full text-sm border border-dark-border">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Application Message *
                </label>
                <textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  placeholder="Tell the project owner why you want to join this project. Include your relevant experience, skills, and what you can contribute..."
                  rows={5}
                  className="w-full px-3 py-2 border border-dark-border rounded-md bg-dark-surface/50 text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                />
                <p className="text-sm text-text-tertiary mt-1">
                  Minimum 10 characters. Be specific about your skills and motivation.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowApplyModal(false)}
                  disabled={applying}
                  className="px-4 py-2 bg-dark-surface/50 text-text-secondary text-sm font-medium rounded-md hover:bg-dark-surface hover:text-text-primary disabled:opacity-50 transition-colors border border-dark-border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || !applicationMessage.trim() || applicationMessage.trim().length < 10}
                  className="px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-sm font-medium rounded-md hover:from-brand-primary/90 hover:to-brand-secondary/90 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                >
                  {applying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-dark-border w-96 shadow-2xl rounded-lg bg-dark-card backdrop-blur-md">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-text-primary">Edit Project</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4 mb-4 backdrop-blur-sm">
                <div className="flex">
                  <svg className="h-5 w-5 text-brand-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-brand-light">
                      Project editing functionality will be implemented soon.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-dark-surface/50 text-text-secondary text-sm font-medium rounded-md hover:bg-dark-surface hover:text-text-primary transition-colors border border-dark-border"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;