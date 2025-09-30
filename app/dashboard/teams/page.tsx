'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Users, 
  Star,
  ArrowRight,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Heart,
  Filter,
  ArrowUpDown,
  Settings,
  UserPlus,
  UserMinus,
  X,
  TrendingUp,
  Archive,
  Eye,
  Activity,
  Award,
  Target
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { formatFirebaseTimestamp } from '@/lib/utils/dateUtils';
import { toast } from 'react-toastify';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'active' | 'recruiting' | 'completed' | 'paused';
  teamSize: number;
  currentTeamSize: number;
  owner: string;
  role?: string;
  lastActivity: string;
  skills: string[];
  priority: 'high' | 'medium' | 'low';
}

export default function TeamsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-projects' | 'teams'>('my-projects');
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [teamProjects, setTeamProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedProjectForManage, setSelectedProjectForManage] = useState<Project | null>(null);
  const [projectStats, setProjectStats] = useState<{
    totalProjects: number;
    activeProjects: number;
    totalMembers: number;
    completedProjects: number;
  }>({ totalProjects: 0, activeProjects: 0, totalMembers: 0, completedProjects: 0 });

  useEffect(() => {
    const loadProjectsData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Load user's projects and team projects in parallel
        const [myProjectsRes, teamProjectsRes] = await Promise.allSettled([
          apiClient.get('/api/projects/user/my-projects'),
          apiClient.get('/api/projects/user/team-projects')
        ]);
        
        // Process my projects
        if (myProjectsRes.status === 'fulfilled') {
          const projects = (myProjectsRes.value as any)?.projects || [];
          const mappedProjects = projects.map((project: any) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            category: project.category,
            status: project.status === 'approved' ? 'active' : project.status,
            teamSize: project.teamSize,
            currentTeamSize: project.teamMembers?.length || 1,
            owner: project.ownerName || 'You',
            role: 'Owner',
            lastActivity: project.updatedAt || project.createdAt,
            skills: project.skillsRequired || [],
            priority: 'medium' as const
          }));
          setMyProjects(mappedProjects);
        }
        
        // Process team projects
        if (teamProjectsRes.status === 'fulfilled') {
          const projects = (teamProjectsRes.value as any)?.projects || [];
          const mappedProjects = projects.map((project: any) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            category: project.category,
            status: project.status === 'approved' ? 'active' : project.status,
            teamSize: project.teamSize,
            currentTeamSize: project.teamMembers?.length || 1,
            owner: project.ownerName || 'Unknown',
            role: 'Member',
            lastActivity: project.updatedAt || project.createdAt,
            skills: project.skillsRequired || [],
            priority: 'medium' as const
          }));
          setTeamProjects(mappedProjects);
        }
        
        // Calculate stats
        const allProjects = [...(myProjectsRes.status === 'fulfilled' ? (myProjectsRes.value as any)?.projects || [] : []),
                             ...(teamProjectsRes.status === 'fulfilled' ? (teamProjectsRes.value as any)?.projects || [] : [])];
        const stats = {
          totalProjects: allProjects.length,
          activeProjects: allProjects.filter((p: any) => p.status === 'active' || p.status === 'approved').length,
          totalMembers: allProjects.reduce((acc: number, p: any) => acc + (p.teamMembers?.length || 0) + 1, 0),
          completedProjects: allProjects.filter((p: any) => p.status === 'completed').length
        };
        setProjectStats(stats);
        
      } catch (error) {
        console.error('Error loading projects data:', error);
        setMyProjects([]);
        setTeamProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjectsData();
  }, [currentUser]);

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      if (!currentUser) return;
      try {
        const storedFavorites = localStorage.getItem(`team_favorites_${currentUser.uid}`);
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    loadFavorites();
  }, [currentUser]);

  const toggleFavorite = (projectId: string) => {
    const newFavorites = favorites.includes(projectId)
      ? favorites.filter(id => id !== projectId)
      : [...favorites, projectId];
    
    setFavorites(newFavorites);
    if (currentUser) {
      localStorage.setItem(`team_favorites_${currentUser.uid}`, JSON.stringify(newFavorites));
    }
    toast.success(
      favorites.includes(projectId) ? 'Removed from favorites' : 'Added to favorites'
    );
  };

  const handleManageTeam = (project: Project) => {
    setSelectedProjectForManage(project);
    setShowManageModal(true);
  };

  const sortProjects = (projects: Project[]) => {
    const sorted = [...projects];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => {
          const dateA = typeof a.lastActivity === 'string' ? new Date(a.lastActivity).getTime() : 0;
          const dateB = typeof b.lastActivity === 'string' ? new Date(b.lastActivity).getTime() : 0;
          return dateB - dateA;
        });
      case 'alphabetical':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'status':
        return sorted.sort((a, b) => a.status.localeCompare(b.status));
      case 'team-size':
        return sorted.sort((a, b) => b.currentTeamSize - a.currentTeamSize);
      default:
        return sorted;
    }
  };

  const filterProjects = (projects: Project[]) => {
    let filtered = projects;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    return sortProjects(filtered);
  };

  const displayMyProjects = filterProjects(myProjects);
  const displayTeamProjects = filterProjects(teamProjects);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.p
            className="text-text-tertiary text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading your teams and projects...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'recruiting':
        return <AlertCircle className="w-4 h-4 text-accent-orange" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-accent-blue" />;
      case 'paused':
        return <XCircle className="w-4 h-4 text-text-tertiary" />;
      default:
        return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-accent-green/10 text-accent-green border-accent-green/20';
      case 'recruiting':
        return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20';
      case 'completed':
        return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20';
      case 'paused':
        return 'bg-dark-surface/50/10 text-text-tertiary border-gray-600/20';
      default:
        return 'bg-dark-surface/50/10 text-text-tertiary border-gray-600/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-dark-surface/50/10 text-text-tertiary border-gray-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8">
            <div className="mb-6 lg:mb-0">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl lg:text-5xl font-bold mb-4"
              >
                <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Your Teams &
                </span>
                <span className="bg-gradient-to-r from-brand-primary to-accent-purple bg-clip-text text-transparent">
                  {" "}Projects
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-text-tertiary max-w-2xl"
              >
                Manage your projects and collaborate with talented creators from around the world.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/dashboard/projects')}
                className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
              >
                <Search className="w-5 h-5 mr-2" />
                Browse Projects
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/dashboard/projects/create')}
                className="shadow-lg hover:shadow-brand-primary/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Project
              </Button>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <Card className="p-4 bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 border-brand-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">Total Projects</p>
                  <p className="text-3xl font-bold text-brand-primary">{projectStats.totalProjects}</p>
                </div>
                <div className="p-3 bg-brand-primary/20 rounded-lg">
                  <Briefcase className="w-6 h-6 text-brand-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-accent-green/10 to-accent-green/5 border-accent-green/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">Active Projects</p>
                  <p className="text-3xl font-bold text-accent-green">{projectStats.activeProjects}</p>
                </div>
                <div className="p-3 bg-accent-green/20 rounded-lg">
                  <Activity className="w-6 h-6 text-accent-green" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-accent-purple/10 to-accent-purple/5 border-accent-purple/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">Team Members</p>
                  <p className="text-3xl font-bold text-accent-purple">{projectStats.totalMembers}</p>
                </div>
                <div className="p-3 bg-accent-purple/20 rounded-lg">
                  <Users className="w-6 h-6 text-accent-purple" />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-accent-blue/10 to-accent-blue/5 border-accent-blue/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-tertiary text-sm mb-1">Completed</p>
                  <p className="text-3xl font-bold text-accent-blue">{projectStats.completedProjects}</p>
                </div>
                <div className="p-3 bg-accent-blue/20 rounded-lg">
                  <Award className="w-6 h-6 text-accent-blue" />
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6"
        >
          <Card className="p-4 backdrop-blur-sm bg-dark-card/80 border border-dark-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-surface/50 border border-dark-border rounded-lg text-white placeholder-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                />
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface/50 border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="recruiting">Recruiting</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface/50 border border-dark-border rounded-lg text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                >
                  <option value="recent">Most Recent</option>
                  <option value="alphabetical">A-Z</option>
                  <option value="status">By Status</option>
                  <option value="team-size">Team Size</option>
                </select>
              </div>
            </div>

            {/* Active filters display */}
            {(searchTerm || filterStatus) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-dark-border">
                <span className="text-sm text-text-tertiary">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-brand-primary/20 text-brand-primary">
                    Search: {searchTerm}
                    <button onClick={() => setSearchTerm('')} className="ml-2 hover:text-brand-light">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterStatus && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-accent-purple/20 text-accent-purple">
                    Status: {filterStatus}
                    <button onClick={() => setFilterStatus('')} className="ml-2 hover:text-accent-purple">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('');
                  }}
                  className="text-xs text-text-tertiary hover:text-text-primary"
                >
                  Clear all
                </button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-dark-surface/50 rounded-lg p-1 backdrop-blur-sm border border-gray-700/50">
            <button
              onClick={() => setActiveTab('my-projects')}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'my-projects'
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'text-text-tertiary hover:text-white hover:bg-dark-surface/50'
              }`}
            >
              <Briefcase className="w-4 h-4 mr-2 inline" />
              My Projects ({displayMyProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'teams'
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'text-text-tertiary hover:text-white hover:bg-dark-surface/50'
              }`}
            >
              <Users className="w-4 h-4 mr-2 inline" />
              Team Projects ({displayTeamProjects.length})
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'my-projects' ? (
            <div className="space-y-6">
              {displayMyProjects.length > 0 ? (
                displayMyProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className="p-6 hover:shadow-lg hover:shadow-brand-primary/5" hover>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-white hover:text-brand-primary transition-colors cursor-pointer">
                              <Link href={`/dashboard/projects/${project.id}`}>
                                {project.title}
                              </Link>
                            </h3>
                            <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(project.priority)}`}>
                              {project.priority} priority
                            </span>
                          </div>
                          <p className="text-text-tertiary mb-4 max-w-3xl">{project.description}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(project.status)}`}>
                            {getStatusIcon(project.status)}
                            <span className="text-sm font-medium capitalize">{project.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">
                            Team: {project.currentTeamSize}/{project.teamSize} members
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Briefcase className="w-4 h-4" />
                          <span className="text-sm">{project.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Updated {formatFirebaseTimestamp(project.lastActivity, 'recently')}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.skills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-3 py-1 text-xs rounded-full bg-dark-surface/50/50 text-text-tertiary border border-gray-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(project.id);
                            }}
                            className="text-text-tertiary hover:text-red-500 transition-colors"
                          >
                            <Heart 
                              className={`w-5 h-5 ${
                                favorites.includes(project.id) 
                                  ? 'fill-red-500 text-red-500' 
                                  : ''
                              }`} 
                            />
                          </button>
                          <div className="text-sm text-text-tertiary">
                            Created by {project.owner}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleManageTeam(project)}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Manage Team
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                            className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                          >
                            View Project
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-12 text-center">
                    <div className="p-4 rounded-full bg-dark-surface/50/50 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                      <Briefcase className="w-10 h-10 text-text-tertiary" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">No projects yet</h3>
                    <p className="text-text-tertiary mb-8 max-w-md mx-auto">
                      Start your journey by creating your first project and building an amazing team.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => router.push('/dashboard/projects/create')}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Project
                    </Button>
                  </Card>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {displayTeamProjects.length > 0 ? (
                displayTeamProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className="p-6 hover:shadow-lg hover:shadow-brand-primary/5" hover>
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-semibold text-white hover:text-brand-primary transition-colors cursor-pointer">
                              <Link href={`/dashboard/projects/${project.id}`}>
                                {project.title}
                              </Link>
                            </h3>
                            {project.role && (
                              <span className="px-3 py-1 text-xs rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                                {project.role}
                              </span>
                            )}
                            <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(project.priority)}`}>
                              {project.priority} priority
                            </span>
                          </div>
                          <p className="text-text-tertiary mb-4 max-w-3xl">{project.description}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(project.status)}`}>
                            {getStatusIcon(project.status)}
                            <span className="text-sm font-medium capitalize">{project.status}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">
                            Team: {project.currentTeamSize}/{project.teamSize} members
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Briefcase className="w-4 h-4" />
                          <span className="text-sm">{project.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-text-tertiary">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Updated {formatFirebaseTimestamp(project.lastActivity, 'recently')}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.skills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-3 py-1 text-xs rounded-full bg-dark-surface/50/50 text-text-tertiary border border-gray-600"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(project.id);
                            }}
                            className="text-text-tertiary hover:text-red-500 transition-colors"
                            title={favorites.includes(project.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart 
                              className={`w-5 h-5 ${
                                favorites.includes(project.id) 
                                  ? 'fill-red-500 text-red-500' 
                                  : ''
                              }`} 
                            />
                          </button>
                          <div className="text-sm text-text-tertiary">
                            Created by {project.owner}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                            className="border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                          >
                            Open Project
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-12 text-center">
                    <div className="p-4 rounded-full bg-dark-surface/50/50 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                      <Users className="w-10 h-10 text-text-tertiary" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">No team projects yet</h3>
                    <p className="text-text-tertiary mb-8 max-w-md mx-auto">
                      Join exciting projects and collaborate with talented creators from around the world.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => router.push('/dashboard/projects')}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Browse Available Projects
                    </Button>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Manage Team Modal */}
      <AnimatePresence>
        {showManageModal && selectedProjectForManage && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowManageModal(false)}
          >
            <motion.div 
              className="relative border border-dark-border w-full max-w-3xl shadow-2xl rounded-2xl bg-dark-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary flex items-center">
                      <Settings className="w-6 h-6 mr-2 text-brand-primary" />
                      Manage Team
                    </h3>
                    <p className="text-text-secondary mt-1">{selectedProjectForManage.title}</p>
                  </div>
                  <button
                    onClick={() => setShowManageModal(false)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-dark-surface/30 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-primary">{selectedProjectForManage.currentTeamSize}</p>
                    <p className="text-sm text-text-tertiary mt-1">Current Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent-purple">{selectedProjectForManage.teamSize}</p>
                    <p className="text-sm text-text-tertiary mt-1">Max Team Size</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent-green">
                      {selectedProjectForManage.teamSize - selectedProjectForManage.currentTeamSize}
                    </p>
                    <p className="text-sm text-text-tertiary mt-1">Open Spots</p>
                  </div>
                </div>

                {/* Team Members Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-text-primary">Team Members</h4>
                    <Button variant="primary" size="sm">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Member
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {/* Project Owner */}
                    <div className="flex items-center justify-between p-3 bg-dark-surface/30 rounded-lg border border-brand-primary/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                          <span className="text-white font-bold">{selectedProjectForManage.owner[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">{selectedProjectForManage.owner}</p>
                          <p className="text-sm text-text-tertiary">Project Owner</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-xs font-medium">
                          Owner
                        </span>
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      </div>
                    </div>

                    {/* Team Members Placeholder */}
                    {selectedProjectForManage.currentTeamSize > 1 ? (
                      <div className="text-center py-8 text-text-tertiary">
                        <Users className="w-12 h-12 mx-auto mb-3 text-text-tertiary" />
                        <p>Team members will be displayed here</p>
                        <p className="text-sm mt-1">Connect to backend to fetch team data</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-text-tertiary">
                        <Users className="w-12 h-12 mx-auto mb-3 text-text-tertiary" />
                        <p>No team members yet</p>
                        <p className="text-sm mt-1">Invite collaborators to join your project</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t border-dark-border pt-4">
                  <p className="text-sm text-text-tertiary mb-3">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        router.push(`/dashboard/projects/${selectedProjectForManage.id}`);
                        setShowManageModal(false);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Project Details
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Activity className="w-4 h-4 mr-2" />
                      View Applications
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Target className="w-4 h-4 mr-2" />
                      Project Settings
                    </Button>
                    <Button variant="outline" className="justify-start text-red-500 border-red-500/30 hover:bg-red-500/10">
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Project
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
