'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter,
  Plus,
  Users,
  Code,
  Calendar,
  Star,
  TrendingUp,
  Clock,
  Eye,
  Heart,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  Folder
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'react-toastify';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  skills?: string[];
  skillsRequired?: string[];
  ownerId: string;
  ownerName?: string;
  owner?: {
    name: string;
    photoURL?: string;
  };
  teamSize: number;
  teamMembers?: Array<{ userId: string; name: string }>;
  currentTeamSize?: number;
  status: 'open' | 'approved' | 'in-progress' | 'completed';
  hasApplied?: boolean;
  applicationCount?: number;
  duration?: string;
  budget?: string;
  githubRepo?: string;
  createdAt: string | { seconds: number };
  isOwner?: boolean;
  isTeamMember?: boolean;
}


const Projects = () => {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-projects'>('discover');
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const projectsPerPage = 9;

  const categories = [
    'Web Development',
    'Mobile Development',
    'AI/ML',
    'Data Science',
    'Game Development',
    'Desktop Applications',
    'DevOps',
    'Design',
    'Research',
    'Other'
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'approved', label: 'Approved' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'team-size', label: 'Team Size' },
    { value: 'alphabetical', label: 'A-Z' }
  ];

  // Load projects and favorites from API
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        if (activeTab === 'discover') {
          // Load all approved projects for discovery
          const params = new URLSearchParams();
          if (searchTerm) params.append('search', searchTerm);
          if (selectedCategory) params.append('category', selectedCategory);
          if (selectedStatus) params.append('status', selectedStatus);
          else params.append('status', 'approved'); // Default to approved
          params.append('limit', '100');
          
          const queryString = params.toString();
          const url = `/api/projects${queryString ? '?' + queryString : ''}`;
          
          const response = await apiClient.get(url);
          let fetchedProjects = (response as any)?.projects || [];
          
          // Apply sorting
          fetchedProjects = sortProjects(fetchedProjects, sortBy);
          
          setFilteredProjects(fetchedProjects);
        } else {
          // Load user's own projects
          const response = await apiClient.get('/api/projects/user/my-projects');
          let userProjects = (response as any)?.projects || [];
          
          // Apply filters
          if (searchTerm) {
            userProjects = userProjects.filter((p: Project) => 
              p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
          if (selectedCategory) {
            userProjects = userProjects.filter((p: Project) => p.category === selectedCategory);
          }
          if (selectedStatus) {
            userProjects = userProjects.filter((p: Project) => p.status === selectedStatus);
          }
          
          // Apply sorting
          userProjects = sortProjects(userProjects, sortBy);
          
          setMyProjects(userProjects);
          setFilteredProjects(userProjects);
        }
        
        setCurrentPage(1); // Reset to first page on new search
        
      } catch (error) {
        console.error('Error loading projects:', error);
        setFilteredProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [currentUser, searchTerm, selectedCategory, selectedStatus, activeTab, sortBy]);

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      if (!currentUser) return;
      try {
        const storedFavorites = localStorage.getItem(`favorites_${currentUser.uid}`);
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    loadFavorites();
  }, [currentUser]);

  // Re-sort when sortBy changes
  useEffect(() => {
    if (filteredProjects.length > 0) {
      const sorted = sortProjects([...filteredProjects], sortBy);
      setFilteredProjects(sorted);
    }
  }, [sortBy]);

  const sortProjects = (projects: Project[], sortType: string) => {
    const sorted = [...projects];
    switch (sortType) {
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = typeof a.createdAt === 'object' ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
          const dateB = typeof b.createdAt === 'object' ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
          return dateB - dateA;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          const dateA = typeof a.createdAt === 'object' ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
          const dateB = typeof b.createdAt === 'object' ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
          return dateA - dateB;
        });
      case 'popular':
        return sorted.sort((a, b) => (b.applicationCount || 0) - (a.applicationCount || 0));
      case 'team-size':
        return sorted.sort((a, b) => b.teamSize - a.teamSize);
      case 'alphabetical':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return sorted;
    }
  };

  const toggleFavorite = (projectId: string) => {
    const newFavorites = favorites.includes(projectId)
      ? favorites.filter(id => id !== projectId)
      : [...favorites, projectId];
    
    setFavorites(newFavorites);
    if (currentUser) {
      localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify(newFavorites));
    }
    toast.success(
      favorites.includes(projectId) ? 'Removed from favorites' : 'Added to favorites'
    );
  };

  const handleApplyClick = (project: Project) => {
    setSelectedProject(project);
    setApplicationMessage('');
    setShowApplyModal(true);
  };

  const handleApply = async () => {
    if (!selectedProject || !applicationMessage.trim() || applicationMessage.trim().length < 10) {
      toast.error('Please provide a detailed application message (at least 10 characters)');
      return;
    }

    try {
      setApplying(true);
      await apiClient.post(`/api/projects/${selectedProject.id}/apply`, {
        message: applicationMessage.trim()
      });
      toast.success('Application submitted successfully!');
      setShowApplyModal(false);
      // Refresh projects to update hasApplied status
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      else params.append('status', 'approved');
      params.append('limit', '100');
      const response = await apiClient.get(`/api/projects?${params.toString()}`);
      setFilteredProjects((response as any)?.projects || []);
    } catch (error: any) {
      console.error('Error applying to project:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  // Pagination logic
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstProject, indexOfLastProject);
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <motion.div
          className="mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex items-center gap-2 border-b border-dark-border">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-6 py-3 font-semibold transition-all duration-300 relative ${
                activeTab === 'discover'
                  ? 'text-brand-primary border-b-2 border-brand-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Search className="inline-block mr-2 h-4 w-4" />
              Discover Projects
            </button>
            <button
              onClick={() => setActiveTab('my-projects')}
              className={`px-6 py-3 font-semibold transition-all duration-300 relative ${
                activeTab === 'my-projects'
                  ? 'text-brand-primary border-b-2 border-brand-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Folder className="inline-block mr-2 h-4 w-4" />
              My Projects
            </button>
          </div>
        </motion.div>

        {/* Header Section */}
        <motion.div 
          className="mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-text-primary to-brand-light bg-clip-text text-transparent mb-2">
                {activeTab === 'discover' ? 'Discover Projects' : 'My Projects'}
              </h1>
              <p className="text-text-secondary text-lg">
                {activeTab === 'discover'
                  ? 'Find exciting projects and join collaborative teams'
                  : 'Manage and track your personal projects'
                }
              </p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/projects/create')}
              variant="primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Project
            </Button>
          </div>

          {/* Search and Filters */}
          <Card className="backdrop-blur-sm bg-dark-card/80 border border-dark-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Search projects by title, description, or skills..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      leftIcon={<Search className="w-5 h-5" />}
                      className="h-12 text-lg"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('');
                      setSelectedStatus('');
                      setSortBy('newest');
                    }}
                    variant="outline"
                    className="h-12 px-6"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Clear All
                  </Button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-text-secondary mb-2 block">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full h-11 px-4 border border-dark-border rounded-lg bg-dark-surface/50 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-white backdrop-blur-sm"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-text-secondary mb-2 block">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full h-11 px-4 border border-dark-border rounded-lg bg-dark-surface/50 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-white backdrop-blur-sm"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-text-secondary mb-2 block">
                      <ArrowUpDown className="w-4 h-4 inline mr-1" />
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full h-11 px-4 border border-dark-border rounded-lg bg-dark-surface/50 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-white backdrop-blur-sm"
                    >
                      {sortOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Summary and Active Filters */}
        <motion.div 
          className="mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-text-secondary">
              Showing <span className="font-semibold text-text-primary">{currentProjects.length}</span> of <span className="font-semibold text-text-primary">{filteredProjects.length}</span> project{filteredProjects.length !== 1 ? 's' : ''}
              {searchTerm && (
                <span> for "<span className="font-semibold">{searchTerm}</span>"
                </span>
              )}
            </p>
            
            {/* Active Filters */}
            {(selectedCategory || selectedStatus) && (
              <div className="flex flex-wrap gap-2">
                {selectedCategory && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-primary/20 text-brand-primary">
                    <Code className="w-3 h-3 mr-1" />
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('')} className="ml-2 hover:text-brand-light">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedStatus && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-purple/20 text-accent-purple">
                    <Filter className="w-3 h-3 mr-1" />
                    {statusOptions.find(s => s.value === selectedStatus)?.label}
                    <button onClick={() => setSelectedStatus('')} className="ml-2 hover:text-accent-purple">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-dark-surface/50 rounded mb-4"></div>
                  <div className="h-4 bg-dark-surface/50 rounded mb-2"></div>
                  <div className="h-4 bg-dark-surface/50 rounded mb-4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-dark-surface/50 rounded w-20"></div>
                    <div className="h-8 bg-dark-surface/50 rounded w-24"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-dark-surface/50 to-dark-card/80 flex items-center justify-center">
              <Search className="w-12 h-12 text-text-tertiary" />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-2">No Projects Found</h3>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              {searchTerm || selectedCategory 
                ? 'Try adjusting your search terms or filters to find more projects.'
                : 'No projects are currently available. Be the first to create one!'}
            </p>
            <Button 
              onClick={() => router.push('/dashboard/projects/create')}
              variant="primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Project
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {currentProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * index, duration: 0.3 }}
                >
                  <ProjectCard 
                    project={project} 
                    isFavorite={favorites.includes(project.id)}
                    onToggleFavorite={toggleFavorite}
                    onApply={handleApplyClick}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div 
                className="mt-8 flex justify-center items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, current, and pages around current
                      return page === 1 || 
                             page === totalPages || 
                             Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 py-2 text-text-tertiary">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded-lg transition-all ${
                            currentPage === page
                              ? 'bg-brand-primary text-white shadow-lg'
                              : 'bg-dark-card/80 text-text-secondary hover:bg-dark-surface/50 hover:text-text-primary'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && selectedProject && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowApplyModal(false)}
          >
            <motion.div 
              className="relative border border-dark-border w-full max-w-2xl shadow-2xl rounded-2xl bg-dark-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-text-primary">
                      Apply to Join
                    </h3>
                    <p className="text-text-secondary mt-1">{selectedProject.title}</p>
                  </div>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-medium text-text-primary mb-3">Required Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.skillsRequired?.map((skill, index) => (
                      <span key={index} className="px-3 py-1.5 bg-dark-surface/50 text-text-secondary rounded-lg text-sm border border-dark-border">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Application Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    placeholder="Tell the project owner why you want to join this project. Include your relevant experience, skills, and what you can contribute..."
                    rows={6}
                    className="w-full px-4 py-3 border border-dark-border rounded-xl bg-dark-surface/50 text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                  />
                  <p className="text-sm text-text-tertiary mt-2">
                    Minimum 10 characters ({applicationMessage.length}/10)
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setShowApplyModal(false)}
                    disabled={applying}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={applying || !applicationMessage.trim() || applicationMessage.trim().length < 10}
                    variant="primary"
                  >
                    {applying ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Enhanced ProjectCard Component
const ProjectCard = ({ 
  project, 
  isFavorite, 
  onToggleFavorite, 
  onApply 
}: { 
  project: Project; 
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onApply: (project: Project) => void;
}) => {
  const router = useRouter();
  
  const getStatusBadge = () => {
    const statusConfig = {
      'open': { bg: 'bg-success-500/20', text: 'text-success-500', label: 'Open' },
      'in-progress': { bg: 'bg-brand-primary/20', text: 'text-brand-primary', label: 'In Progress' },
      'completed': { bg: 'bg-text-tertiary/20', text: 'text-text-tertiary', label: 'Completed' },
      'approved': { bg: 'bg-accent-purple/20', text: 'text-accent-purple', label: 'Approved' }
    };
    const config = statusConfig[project.status] || statusConfig.open;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <Card className="group relative hover:shadow-2xl transition-all duration-300 bg-dark-card/80 backdrop-blur-sm border border-dark-border hover:border-brand-primary/50 h-full flex flex-col">
      <CardContent className="p-6 flex flex-col flex-1">
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(project.id);
          }}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-dark-surface/80 hover:bg-dark-surface transition-all"
        >
          <Heart 
            className={`w-5 h-5 transition-all ${
              isFavorite 
                ? 'fill-red-500 text-red-500' 
                : 'text-text-tertiary hover:text-red-500'
            }`} 
          />
        </button>

        {/* Header */}
        <div 
          className="flex justify-between items-start mb-4 cursor-pointer" 
          onClick={() => router.push(`/dashboard/projects/${project.id}`)}
        >
          <div className="flex-1 pr-10">
            <h3 className="text-xl font-bold text-text-primary mb-2 group-hover:text-brand-light transition-colors line-clamp-2">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {getStatusBadge()}
              <span className="text-xs text-text-tertiary flex items-center">
                <Users className="w-3 h-3 mr-1" />
                by {project.ownerName}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-tertiary mb-1">
            <span>Team Progress</span>
            <span>{project.currentTeamSize || 0}/{project.teamSize} members</span>
          </div>
          <div className="w-full bg-dark-surface/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-brand-primary to-brand-secondary h-2 rounded-full transition-all duration-500" 
              style={{ width: `${((project.currentTeamSize || 0) / project.teamSize) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary mb-4 line-clamp-3 text-sm flex-1">
          {project.description}
        </p>

        {/* Category */}
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent-blue/20 text-accent-blue text-xs font-medium">
            <Code className="w-3 h-3 mr-1" />
            {project.category}
          </span>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {project.skillsRequired?.slice(0, 3).map(skill => (
              <span key={skill} className="px-2 py-1 bg-dark-surface/50 text-text-secondary text-xs rounded border border-dark-border">
                {skill}
              </span>
            ))}
            {project.skillsRequired && project.skillsRequired.length > 3 && (
              <span className="px-2 py-1 text-text-tertiary text-xs">
                +{project.skillsRequired.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-border/50 mt-auto">
          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{project.duration || 'Flexible'}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{project.applicationCount || 0} applied</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/projects/${project.id}`);
              }}
              className="text-xs"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            {!project.hasApplied && !project.isOwner && !project.isTeamMember && (
              <Button 
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(project);
                }}
                className="text-xs"
              >
                Apply
              </Button>
            )}
            {project.hasApplied && (
              <span className="px-3 py-1 bg-success-500/20 text-success-500 rounded-lg text-xs font-medium">
                Applied ✓
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Projects;
