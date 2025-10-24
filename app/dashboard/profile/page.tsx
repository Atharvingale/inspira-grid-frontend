'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/AuthContext';
import { githubService, type GitHubProfile } from '@/lib/services/githubService';
import Loading from '@/components/common/Loading';
import { motion } from 'framer-motion';
import { User, MapPin, Globe, Github, Linkedin, Star, Award, Briefcase, Calendar, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  skills?: string[];
  experience?: string;
  availability?: 'available' | 'busy' | 'unavailable';
  profileComplete: boolean;
}

const Profile = () => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'github' | 'settings'>('profile');
  const [_loading, _setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  
  // GitHub state
  const [githubProfile, setGitHubProfile] = useState<GitHubProfile | null>(null);
  const [githubLoading, setGitHubLoading] = useState(false);
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);

  // Location search state
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const commonSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript',
    'Java', 'C++', 'HTML', 'CSS', 'PHP', 'Go', 'Rust',
    'Vue.js', 'Angular', 'Django', 'Flask', 'Express',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'Linux',
    'UI/UX Design', 'Figma', 'Adobe Creative Suite',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
    'Mobile Development', 'React Native', 'Flutter', 'Swift', 'Kotlin'
  ];

  // Search locations using OpenStreetMap Nominatim API
  const searchLocations = async (query: string) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      setIsSearchingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const suggestions = data.map((item: any) => {
          // Format: City, State, Country or City, Country
          const city = item.address?.city || item.address?.town || item.address?.village;
          const state = item.address?.state;
          const country = item.address?.country;
          
          if (city && state && country) {
            return `${city}, ${state}, ${country}`;
          } else if (city && country) {
            return `${city}, ${country}`;
          } else {
            return item.display_name.split(',').slice(0, 3).join(',');
          }
        });
        
        // Remove duplicates
        const uniqueSuggestions = [...new Set(suggestions)];
        setLocationSuggestions(uniqueSuggestions);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  // Debounce location search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationQuery) {
        searchLocations(locationQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationQuery]);

  // Click outside to close location dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile as UserProfile);
      setSelectedSkills(userProfile.skills || []);
      setLocationQuery(userProfile.location || '');
    } else if (currentUser) {
      // Try to load from localStorage as fallback
      try {
        const savedProfile = localStorage.getItem(`profile_${currentUser.uid}`);
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          setProfile(parsedProfile);
          setSelectedSkills(parsedProfile.skills || []);
        } else {
          // Create initial profile from currentUser data
          const initialProfile: UserProfile = {
            id: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            profileComplete: false,
            skills: [],
            availability: 'available'
          };
          setProfile(initialProfile);
        }
      } catch (error) {
        // Failed to load profile from localStorage - create initial profile
        const initialProfile: UserProfile = {
          id: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
          profileComplete: false,
          skills: [],
          availability: 'available'
        };
        setProfile(initialProfile);
      }
    }
  }, [userProfile, currentUser]);

  // Check for OAuth callback status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      
      if (success === 'github_connected') {
        toast.success('GitHub account connected successfully!');
        setActiveTab('github'); // Switch to GitHub tab
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/profile');
        // Reload GitHub profile
        setTimeout(() => loadGitHubProfile(), 500);
      } else if (error) {
        const errorMessages: Record<string, string> = {
          github_auth_failed: 'GitHub authentication failed. Please try again.',
          github_auth_no_user: 'Failed to retrieve GitHub user data.',
          auth_state_missing: 'Authentication state missing. Please try again.',
          github_link_failed: 'Failed to link GitHub account. Please try again.'
        };
        toast.error(errorMessages[error] || 'An error occurred connecting GitHub.');
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/profile');
      }
    }
  }, []);

  // Load GitHub profile
  useEffect(() => {
    if (currentUser && activeTab === 'github') {
      loadGitHubProfile();
    }
  }, [currentUser, activeTab]);

  const loadGitHubProfile = async () => {
    if (!currentUser) return;
    
    try {
      setGitHubLoading(true);
      // Set timeout to prevent blocking UI for too long
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const response = await Promise.race([
        githubService.getProfile(),
        timeoutPromise
      ]) as any;
      
      console.log('GitHub Profile Response:', response);
      
      if (response.success && response.data) {
        // Handle potential double-wrapped response from baseService
        const profileData = (response.data as any)?.data || response.data;
        console.log('GitHub Profile Data:', profileData);
        setGitHubProfile(profileData);
      } else {
        // User doesn't have GitHub connected
        console.log('GitHub not connected or no data');
        setGitHubProfile(null);
      }
    } catch (error: any) {
      console.log('GitHub profile not connected or unavailable:', error);
      setGitHubProfile(null);
    } finally {
      setGitHubLoading(false);
    }
  };

  const handleGitHubConnect = async () => {
    if (!currentUser) {
      toast.error('Please log in to connect GitHub');
      return;
    }

    try {
      setIsConnectingGitHub(true);
      await githubService.redirectToGitHubOAuth();
    } catch (error: any) {
      console.error('GitHub connect error:', error);
      toast.error('Failed to connect GitHub: ' + (error.message || 'Unknown error'));
      setIsConnectingGitHub(false);
    }
  };

  const handleGitHubDisconnect = async () => {
    if (!currentUser || !githubProfile) return;

    try {
      setGitHubLoading(true);
      const response = await githubService.disconnect();
      if (response.success) {
        setGitHubProfile(null);
        toast.success('GitHub account disconnected successfully');
      } else {
        toast.error('Failed to disconnect GitHub account');
      }
    } catch (error: any) {
      console.error('GitHub disconnect error:', error);
      toast.error('Failed to disconnect GitHub: ' + (error.message || 'Unknown error'));
    } finally {
      setGitHubLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !selectedSkills.includes(skillInput.trim())) {
      const newSkills = [...selectedSkills, skillInput.trim()];
      setSelectedSkills(newSkills);
      setProfile(prev => prev ? { ...prev, skills: newSkills } : null);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const newSkills = selectedSkills.filter(skill => skill !== skillToRemove);
    setSelectedSkills(newSkills);
    setProfile(prev => prev ? { ...prev, skills: newSkills } : null);
  };

  const handleSkillSelect = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      const newSkills = [...selectedSkills, skill];
      setSelectedSkills(newSkills);
      setProfile(prev => prev ? { ...prev, skills: newSkills } : null);
    }
  };

  const handleLocationSelect = (location: string) => {
    setLocationQuery(location);
    setProfile(prev => prev ? { ...prev, location } : null);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocationQuery(value);
    setProfile(prev => prev ? { ...prev, location: value } : null);
    setShowLocationDropdown(true);
  };

  const handleSave = async () => {
    if (!profile || !currentUser) return;

    try {
      setSaving(true);
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save to localStorage for persistence
      localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(profile));
      
      // Update the auth context
      await updateUserProfile?.(currentUser.uid, profile);
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return <Loading message="Loading profile..." />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-900 p-4 md:p-8">
      <motion.div 
        className="max-w-7xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section with Profile Card */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="bg-gradient-to-r from-brand-primary/20 via-brand-secondary/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-8 border border-brand-primary/20 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                  {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-950 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {profile.displayName || 'Your Name'}
                </h1>
                <p className="text-gray-300 mb-3">{profile.email}</p>
                <div className="flex flex-wrap gap-3">
                  {profile.location && (
                    <span className="inline-flex items-center px-3 py-1 bg-slate-800/60 rounded-full text-sm text-gray-300">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      {profile.location}
                    </span>
                  )}
                  {profile.availability && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      profile.availability === 'available' ? 'bg-green-500/20 text-green-400' :
                      profile.availability === 'busy' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      <span className="w-2 h-2 rounded-full mr-2 ${
                        profile.availability === 'available' ? 'bg-green-400' :
                        profile.availability === 'busy' ? 'bg-yellow-400' :
                        'bg-red-400'
                      }"></span>
                      {profile.availability.charAt(0).toUpperCase() + profile.availability.slice(1)}
                    </span>
                  )}
                  {profile.experience && (
                    <span className="inline-flex items-center px-3 py-1 bg-blue-500/20 rounded-full text-sm text-blue-400">
                      <Award className="w-3.5 h-3.5 mr-1.5" />
                      {profile.experience.charAt(0).toUpperCase() + profile.experience.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-2 border border-slate-700/50 shadow-xl inline-flex gap-2">
            {[
              { key: 'profile', label: 'Profile', icon: User },
              { key: 'github', label: 'GitHub', icon: Github },
              { key: 'settings', label: 'Settings', icon: Briefcase }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`relative px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/30'
                    : 'text-gray-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Profile Information Tab */}
        {activeTab === 'profile' && (
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-brand-primary/20 rounded-lg">
                    <User className="w-5 h-5 text-brand-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Basic Information</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      value={profile.displayName || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                      placeholder="Enter your display name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profile.email || currentUser?.email || ''}
                        disabled
                        className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-gray-400 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-700/50 px-2 py-1 rounded text-gray-400">Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">About</h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative" ref={locationDropdownRef}>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={locationQuery}
                          onChange={handleLocationChange}
                          onFocus={() => setShowLocationDropdown(true)}
                          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                          placeholder="Search for your city..."
                        />
                        {isSearchingLocation && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-primary"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Location Dropdown */}
                      {showLocationDropdown && locationSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                          {locationSuggestions.map((location, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleLocationSelect(location)}
                              className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-colors flex items-center gap-2 border-b border-slate-700 last:border-b-0"
                            >
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm">{location}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Availability
                      </label>
                      <select
                        name="availability"
                        value={profile.availability || 'available'}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                      >
                        <option value="available" className="bg-slate-800">🟢 Available</option>
                        <option value="busy" className="bg-slate-800">🟡 Busy</option>
                        <option value="unavailable" className="bg-slate-800">🔴 Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={profile.bio || ''}
                      onChange={handleInputChange}
                      rows={5}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all resize-none"
                      placeholder="Tell others about yourself, your interests, and what you're looking for in collaboration..."
                    />
                  </div>
                </div>
              </div>

              {/* Social Links Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Social Links</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Website
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        name="website"
                        value={profile.website || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                        placeholder="https://yourwebsite.com"
                      />
                      <ExternalLink className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      <Github className="w-4 h-4 inline mr-1" />
                      GitHub Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="github"
                        value={profile.github || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                        placeholder="username"
                      />
                      <Github className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      <Linkedin className="w-4 h-4 inline mr-1" />
                      LinkedIn Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="linkedin"
                        value={profile.linkedin || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 pl-10 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                        placeholder="username"
                      />
                      <Linkedin className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Skills Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                    <Star className="w-5 h-5 text-pink-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Skills</h2>
                </div>
                
                {/* Skills Input */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Add a skill..."
                      className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-lg hover:shadow-lg hover:shadow-brand-primary/30 transition-all font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Selected Skills */}
                {selectedSkills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-300 mb-3">Your skills ({selectedSkills.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkills.map(skill => (
                        <motion.span
                          key={skill}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 text-brand-light rounded-full text-sm border border-brand-primary/30 font-medium"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="ml-2 text-brand-light hover:text-white transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common Skills */}
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-3">Suggestions:</p>
                  <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {commonSkills.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillSelect(skill)}
                        disabled={selectedSkills.includes(skill)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${
                          selectedSkills.includes(skill)
                            ? 'bg-slate-800/30 text-gray-600 cursor-not-allowed border border-slate-700/30'
                            : 'bg-slate-800/50 text-gray-300 hover:bg-brand-primary/20 hover:text-brand-light hover:border-brand-primary/40 border border-slate-600/50'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Experience Level Card */}
              <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Award className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Experience</h2>
                </div>
                <select
                  name="experience"
                  value={profile.experience || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all"
                >
                  <option value="" className="bg-slate-800">Select experience level</option>
                  <option value="beginner" className="bg-slate-800">🌱 Beginner (0-1 years)</option>
                  <option value="intermediate" className="bg-slate-800">🚀 Intermediate (1-3 years)</option>
                  <option value="advanced" className="bg-slate-800">⭐ Advanced (3-5 years)</option>
                  <option value="expert" className="bg-slate-800">💎 Expert (5+ years)</option>
                </select>
              </div>

              {/* Save Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full px-6 py-4 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-bold hover:shadow-xl hover:shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg"
              >
                {saving ? '💾 Saving...' : '✨ Save Profile'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* GitHub Integration Tab */}
        {activeTab === 'github' && (
          <motion.div 
            variants={itemVariants}
            className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-xl"
          >
            {githubLoading ? (
              <div className="text-center py-12">
                <Loading message="Loading GitHub profile..." />
              </div>
            ) : githubProfile ? (
              // Connected GitHub Profile
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Github className="w-6 h-6 text-purple-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">GitHub Profile</h2>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGitHubDisconnect}
                    className="px-5 py-2.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-600/30 transition-all font-medium"
                  >
                    Disconnect
                  </motion.button>
                </div>
                
                <div className="bg-slate-800/40 rounded-xl p-6 mb-6">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* Profile Info */}
                    <div className="flex items-start space-x-4">
                      {githubProfile.avatarUrl ? (
                        <img
                          src={githubProfile.avatarUrl}
                          alt={githubProfile.displayName || 'GitHub Profile'}
                          className="w-20 h-20 rounded-full border-2 border-brand-primary shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-2 border-brand-primary bg-slate-700 flex items-center justify-center">
                          <Github className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold text-white">{githubProfile.displayName || 'GitHub User'}</h3>
                        <p className="text-gray-400 mb-2">@{githubProfile.username || 'username'}</p>
                        {githubProfile.bio && (
                          <p className="text-gray-300 text-sm">{githubProfile.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">{githubProfile.publicRepos ?? 0}</div>
                    <div className="text-sm text-gray-400 mt-1">Repositories</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">{githubProfile.followers ?? 0}</div>
                    <div className="text-sm text-gray-400 mt-1">Followers</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-pink-400">{githubProfile.following ?? 0}</div>
                    <div className="text-sm text-gray-400 mt-1">Following</div>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="bg-slate-800/40 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {githubProfile.location && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Location:</span> {githubProfile.location}
                      </div>
                    )}
                    {githubProfile.company && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Company:</span> {githubProfile.company}
                      </div>
                    )}
                    {githubProfile.website && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Website:</span>
                        <a href={githubProfile.website} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                          Link
                        </a>
                      </div>
                    )}
                    {githubProfile.connectedAt && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Connected:</span> {new Date(githubProfile.connectedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={githubProfile.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-600/30 transition-all font-medium"
                >
                  <Github className="w-5 h-5" />
                  View GitHub Profile
                  <ExternalLink className="w-4 h-4" />
                </motion.a>
              </div>
            ) : (
              // Not Connected
              <div className="text-center py-16">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-24 h-24 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Github className="w-12 h-12 text-gray-500" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-3">Connect Your GitHub</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Showcase your repositories, contributions, and developer activity by connecting your GitHub account.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGitHubConnect}
                  disabled={isConnectingGitHub}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-purple-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  <Github className="w-5 h-5" />
                  {isConnectingGitHub ? 'Connecting...' : 'Connect GitHub Account'}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div 
            variants={itemVariants}
            className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-xl"
          >
            <div className="text-center py-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Briefcase className="w-12 h-12 text-gray-500" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-3">Settings Coming Soon</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Account settings, privacy preferences, and notification options will be available here.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Profile;
