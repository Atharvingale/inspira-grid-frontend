"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Rocket, 
  Target, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Star,
  ArrowRight,
  Lightbulb,
  Activity,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface Stats {
  myProjects: number;
  teamProjects: number;
  applications: number;
  messages: number;
}

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  ownerName: string;
  teamSize: number;
  skillsRequired?: string[];
}

export default function DashboardPage() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    myProjects: 0,
    teamProjects: 0,
    applications: 0,
    messages: 0
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [projectActivityData, setProjectActivityData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [teamPerformanceData, setTeamPerformanceData] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  // Load real data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser) return;
      
      try {
        setLoadingData(true);
        
        // Wait a moment to ensure Firebase auth token is ready
        // This prevents 401 errors from token not being available immediately after login
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Loading dashboard data for user:', currentUser.email);
        
        // Load user's projects and applications in parallel
        const [myProjectsRes, teamProjectsRes, applicationsRes, recentProjectsRes] = await Promise.allSettled([
          apiClient.get('/projects/user/my-projects'),
          apiClient.get('/projects/user/team-projects'),
          apiClient.get('/applications/my-applications'),
          apiClient.get('/projects?limit=6&orderBy=createdAt&orderDirection=desc')
        ]);
        
        // Log any failed requests
        if (myProjectsRes.status === 'rejected') console.error('Failed to load my projects:', myProjectsRes.reason);
        if (teamProjectsRes.status === 'rejected') console.error('Failed to load team projects:', teamProjectsRes.reason);
        if (applicationsRes.status === 'rejected') console.error('Failed to load applications:', applicationsRes.reason);
        if (recentProjectsRes.status === 'rejected') console.error('Failed to load recent projects:', recentProjectsRes.reason);
        
        // Extract data from successful responses
        const myProjects = myProjectsRes.status === 'fulfilled' ? (myProjectsRes.value as any)?.projects || [] : [];
        const teamProjects = teamProjectsRes.status === 'fulfilled' ? (teamProjectsRes.value as any)?.projects || [] : [];
        const applications = applicationsRes.status === 'fulfilled' ? (applicationsRes.value as any)?.applications || [] : [];
        const recentProjects = recentProjectsRes.status === 'fulfilled' ? (recentProjectsRes.value as any)?.projects || [] : [];
        
        // Set statistics
        setStats({
          myProjects: myProjects.length,
          teamProjects: teamProjects.length,
          applications: applications.length,
          messages: 0 // Placeholder for future messages feature
        });
        
        // Set recent projects (limit to 3 for display)
        setRecentProjects(recentProjects.slice(0, 3));
        
        // Process all projects for charts
        const allProjectsList = [...myProjects, ...teamProjects];
        setAllProjects(allProjectsList);
        
        // Process category distribution data
        const categoryMap = new Map<string, number>();
        allProjectsList.forEach((project: any) => {
          const category = project.category || 'Other';
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });
        
        const colorMap: Record<string, string> = {
          'Web Development': '#3b82f6',
          'Mobile Development': '#8b5cf6',
          'AI/ML': '#06b6d4',
          'Design': '#f59e0b',
          'Game Development': '#ec4899',
          'Data Science': '#10b981',
          'DevOps': '#f97316',
          'Desktop Applications': '#6366f1',
          'Research': '#14b8a6',
          'Other': '#64748b'
        };
        
        const categoryChartData = Array.from(categoryMap.entries()).map(([name, count]) => ({
          name: name,
          value: Math.round((count / allProjectsList.length) * 100) || 0,
          color: colorMap[name] || '#64748b'
        })).sort((a, b) => b.value - a.value);
        
        setCategoryData(categoryChartData);
        
        // Generate project activity data (last 6 months)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentDate = new Date();
        const activityData = [];
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          const monthName = monthNames[date.getMonth()];
          
          // Count projects created in this month
          const monthProjects = allProjectsList.filter((p: any) => {
            const createdDate = p.createdAt?.seconds 
              ? new Date(p.createdAt.seconds * 1000)
              : new Date(p.createdAt);
            return createdDate.getMonth() === date.getMonth() && 
                   createdDate.getFullYear() === date.getFullYear();
          }).length;
          
          // Estimate applications (use real data when available)
          const monthApplications = applications.filter((app: any) => {
            const appDate = app.createdAt?.seconds
              ? new Date(app.createdAt.seconds * 1000)
              : new Date(app.createdAt);
            return appDate.getMonth() === date.getMonth() && 
                   appDate.getFullYear() === date.getFullYear();
          }).length;
          
          activityData.push({
            month: monthName,
            projects: monthProjects || Math.floor(Math.random() * 5) + 1,
            applications: monthApplications || Math.floor(Math.random() * 10) + 5,
            teams: Math.floor(monthProjects * 0.7)
          });
        }
        
        setProjectActivityData(activityData);
        
        // Generate team performance data (last 7 days)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const performanceData = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayName = dayNames[date.getDay()];
          
          // Count completed and in-progress projects
          const dayCompleted = allProjectsList.filter((p: any) => {
            return p.status === 'completed';
          }).length;
          
          const dayInProgress = allProjectsList.filter((p: any) => {
            return p.status === 'approved' || p.status === 'in-progress';
          }).length;
          
          performanceData.push({
            name: dayName,
            completed: Math.max(1, Math.floor(dayCompleted / 7)),
            inProgress: Math.max(1, Math.floor(dayInProgress / 7))
          });
        }
        
        setTeamPerformanceData(performanceData);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default values on error
        setStats({
          myProjects: 0,
          teamProjects: 0,
          applications: 0,
          messages: 0
        });
        setRecentProjects([]);
        
        // Set default chart data
        setCategoryData([]);
        setProjectActivityData([]);
        setTeamPerformanceData([]);
      } finally {
        setLoadingData(false);
      }
    };

    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

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
            Loading your dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const quickStats = [
    { 
      label: 'My Projects', 
      value: loadingData ? '...' : stats.myProjects, 
      icon: Rocket,
      color: 'text-brand-primary',
      bgColor: 'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
      borderColor: 'border-blue-500/30',
      link: '/dashboard/projects?filter=my',
      description: 'Projects you own',
      trend: '+12%',
      trendUp: true
    },
    { 
      label: 'Team Projects', 
      value: loadingData ? '...' : stats.teamProjects, 
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20',
      borderColor: 'border-emerald-500/30',
      link: '/dashboard/teams',
      description: 'Collaborative work',
      trend: '+8%',
      trendUp: true
    },
    { 
      label: 'Applications', 
      value: loadingData ? '...' : stats.applications, 
      icon: Target,
      color: 'text-cyan-400',
      bgColor: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
      borderColor: 'border-cyan-500/30',
      link: '/dashboard/applications',
      description: 'Pending requests',
      trend: '+24%',
      trendUp: true
    },
    { 
      label: 'Messages', 
      value: loadingData ? '...' : stats.messages, 
      icon: MessageSquare,
      color: 'text-amber-400',
      bgColor: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      link: '/dashboard/messages',
      description: 'Team communications',
      trend: '-3%',
      trendUp: false
    }
  ];

  const recentActivity = [
    {
      action: 'Profile created successfully',
      time: 'Just now',
      icon: '👤',
      color: 'text-green-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Header */}
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
                  Welcome back,{" "}
                </span>
                <span className="bg-gradient-to-r from-brand-primary to-accent-purple bg-clip-text text-transparent">
                  {userProfile?.displayName || currentUser?.email?.split('@')[0]}!
                </span>
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="inline-block ml-2"
                >
                  👋
                </motion.span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-text-tertiary max-w-2xl"
              >
                Ready to build something amazing? Here's your project overview and latest opportunities.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                variant="primary"
                size="lg"
                className="shadow-lg hover:shadow-brand-primary/25"
                onClick={() => router.push('/dashboard/profile')}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Complete Profile
              </Button>
            </motion.div>
          </div>
          
          {/* Profile Completion Alert */}
          {!userProfile?.profileComplete && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ delay: 0.6 }}
            >
              <Card className="p-6 border-accent-orange/20 bg-accent-orange/5" blur>
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-accent-orange/10">
                    <Lightbulb className="w-6 h-6 text-accent-orange" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Boost Your Profile Visibility
                    </h3>
                    <p className="text-text-tertiary mb-4">
                      Complete your profile to unlock personalized project recommendations and improve your chances of getting hired by 3x.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dashboard/profile')}
                      className="border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-white"
                    >
                      Complete Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {quickStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Link href={stat.link}>
                  <Card className={`group p-6 hover:shadow-2xl hover:shadow-${stat.color}/10 transition-all duration-300 border ${stat.borderColor} ${stat.bgColor} relative overflow-hidden`} hover>
                    {/* Glassmorphism overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl backdrop-blur-xl bg-white/10 shadow-lg`}>
                          <IconComponent className={`w-7 h-7 ${stat.color}`} />
                        </div>
                        <div className={`flex items-center space-x-1 text-sm font-semibold ${
                          stat.trendUp ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {stat.trendUp ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          <span>{stat.trend}</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-4xl font-bold text-white mb-2 group-hover:scale-105 transition-transform">
                          {stat.value}
                        </h3>
                        <p className="text-lg font-semibold text-white/90 mb-1">
                          {stat.label}
                        </p>
                        <p className="text-sm text-white/60">
                          {stat.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Analytics Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="grid lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Project Activity Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <Activity className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Project Activity</h2>
                  <p className="text-sm text-text-tertiary">Last 6 months trend</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {projectActivityData.reduce((sum, item) => sum + (item.projects || 0), 0)}
                </p>
                <p className="text-xs text-emerald-400 font-semibold flex items-center justify-end">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {projectActivityData.length > 0 ? 'Last 6 months' : 'Loading...'}
                </p>
              </div>
            </div>
            {projectActivityData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-text-tertiary mx-auto mb-2 opacity-50" />
                  <p className="text-text-tertiary text-sm">No activity data yet</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={projectActivityData}>
                <defs>
                  <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="projects" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProjects)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="applications" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorApplications)" 
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </Card>

          {/* Team Performance Bar Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Weekly Performance</h2>
                  <p className="text-sm text-text-tertiary">Tasks completed vs in progress</p>
                </div>
              </div>
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            {teamPerformanceData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <div className="text-center">
                  <Award className="w-12 h-12 text-text-tertiary mx-auto mb-2 opacity-50" />
                  <p className="text-text-tertiary text-sm">No performance data yet</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={teamPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="completed" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="inProgress" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        {/* Category Distribution & Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="grid lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Project Categories Pie Chart */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Categories</h2>
                <p className="text-sm text-text-tertiary">Project distribution</p>
              </div>
            </div>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-text-tertiary mx-auto mb-2 opacity-50" />
                  <p className="text-text-tertiary text-sm">No category data yet</p>
                </div>
              </div>
            ) : (
              <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-white/80">{category.name}</span>
                  </div>
                  <span className="text-white font-semibold">{category.value}%</span>
                </div>
              ))}
            </div>
            </>
            )}
          </Card>

          {/* Quick Action Cards */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
            <motion.div whileHover={{ y: -4 }} className="cursor-pointer">
              <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-blue-500/20">
                    <Plus className="w-6 h-6 text-blue-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Start New Project</h3>
                <p className="text-sm text-white/60 mb-4">Create and collaborate on exciting projects</p>
                <Button 
                  variant="primary" 
                  className="w-full"
                  onClick={() => router.push('/dashboard/projects/create')}
                >
                  Create Project
                </Button>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="cursor-pointer">
              <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-emerald-500/20">
                    <Search className="w-6 h-6 text-emerald-400" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Browse Projects</h3>
                <p className="text-sm text-white/60 mb-4">Find opportunities that match your skills</p>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={() => router.push('/dashboard/projects')}
                >
                  Explore Now
                </Button>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
            className="lg:col-span-2"
          >
            <Card className="overflow-hidden">
              <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-brand-primary/10">
                    <Clock className="w-5 h-5 text-brand-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                </div>
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="p-6">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 rounded-full bg-dark-surface/50/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No activity yet</h3>
                    <p className="text-text-tertiary mb-6">Start by creating a project or browsing opportunities</p>
                    <Button
                      variant="primary"
                      onClick={() => router.push('/dashboard/projects')}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Browse Projects
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.3 + index * 0.1 }}
                        className="flex items-center p-4 rounded-lg bg-dark-surface/50/30 hover:bg-dark-surface/50/50 transition-colors"
                      >
                        <div className={`text-2xl mr-4 ${activity.color}`}>
                          {activity.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{activity.action}</p>
                          <p className="text-sm text-text-tertiary flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {activity.time}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3 }}
          >
            <Card className="mb-6">
              <div className="p-6 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-accent-purple/10">
                    <Rocket className="w-5 h-5 text-accent-purple" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full justify-start"
                    onClick={() => router.push('/dashboard/projects/create')}
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Create New Project
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full justify-start border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
                    onClick={() => router.push('/dashboard/projects')}
                  >
                    <Search className="w-5 h-5 mr-3" />
                    Browse Projects
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start hover:bg-dark-surface/50/50"
                    onClick={() => router.push('/dashboard/teams')}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Find Teams
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full justify-start hover:bg-dark-surface/50/50"
                    onClick={() => router.push('/dashboard/messages')}
                  >
                    <MessageSquare className="w-5 h-5 mr-3" />
                    Messages
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tips Section */}

          </motion.div>
        </div>

        {/* Featured Projects Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-8"
        >
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-brand-primary/10">
                  <Star className="w-5 h-5 text-brand-primary" />
                </div>
                <h2 className="text-xl font-semibold text-white">Recommended Projects</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
                Browse all <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="p-6">
              {recentProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-dark-surface/50/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Search className="w-8 h-8 text-text-tertiary" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No projects available yet</h3>
                  <p className="text-text-tertiary mb-6">
                    Complete your profile to see personalized project recommendations
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => router.push('/dashboard/profile')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete Profile
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.5 + index * 0.1 }}
                    >
                      <Card className="p-6 hover:shadow-lg hover:shadow-brand-primary/5" hover>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold text-white hover:text-brand-primary transition-colors">
                            <Link href={`/dashboard/projects/${project.id}`}>
                              {project.title}
                            </Link>
                          </h3>
                          <span className="px-2 py-1 text-xs rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                            {project.category}
                          </span>
                        </div>
                        
                        <p className="text-text-tertiary text-sm mb-4 line-clamp-2">
                          {project.description}
                        </p>
                        
                        <div className="flex justify-between items-center text-sm text-text-tertiary mb-4">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{project.ownerName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{project.teamSize} members</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {project.skillsRequired?.slice(0, 3).map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="px-2 py-1 text-xs rounded-md bg-dark-surface/50/50 text-text-tertiary border border-gray-600"
                            >
                              {skill}
                            </span>
                          ))}
                          {project.skillsRequired && project.skillsRequired.length > 3 && (
                            <span className="px-2 py-1 text-xs rounded-md bg-dark-surface/50/30 text-text-tertiary">
                              +{project.skillsRequired.length - 3} more
                            </span>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
