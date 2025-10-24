'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Search, Users, MessageCircle, Briefcase } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useMessaging } from '@/lib/contexts/MessagingContext';

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  isOnline?: boolean;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectTitle?: string;
}

export function NewConversationModal({ 
  isOpen, 
  onClose, 
  projectId, 
  projectTitle 
}: NewConversationModalProps) {
  const { currentUser } = useAuth();
  const { createConversation, setActiveConversation } = useMessaging();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'project_group'>(
    projectId ? 'project_group' : 'direct'
  );
  const [conversationName, setConversationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  // Load available users
  useEffect(() => {
    if (isOpen && currentUser) {
      loadUsers();
    }
  }, [isOpen, currentUser]);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (isOpen && currentUser) {
        loadUsers();
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, projectId]);

  const loadUsers = async () => {
    try {
      setSearchLoading(true);
      
      // Get authentication token
      const token = await currentUser?.getIdToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Construct query parameters
      const params = new URLSearchParams({
        limit: '20',
        ...(projectId && { projectId }),
        ...(searchQuery && { query: searchQuery })
      });

      const response = await fetch(`/api/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAvailableUsers(data.users || []);
      
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setSearchLoading(false);
    }
  };

  // Users are already filtered by the API based on search query
  const filteredUsers = availableUsers;

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        // For direct conversations, only allow one user
        if (conversationType === 'direct') {
          return [user];
        }
        return [...prev, user];
      }
    });
  };

  const handleTypeChange = (type: 'direct' | 'group' | 'project_group') => {
    setConversationType(type);
    // Reset selection if changing to direct and have multiple users selected
    if (type === 'direct' && selectedUsers.length > 1) {
      setSelectedUsers(selectedUsers.slice(0, 1));
    }
  };

  const canCreateConversation = () => {
    if (selectedUsers.length === 0) return false;
    if (conversationType === 'direct' && selectedUsers.length !== 1) return false;
    if (conversationType === 'group' && conversationName.trim() === '') return false;
    return true;
  };

  const handleCreate = async () => {
    if (!canCreateConversation()) return;

    setLoading(true);
    setError('');

    try {
      const participantIds = selectedUsers.map(user => user.id);
      
      const conversation = await createConversation(
        participantIds,
        conversationType,
        projectId,
        conversationType === 'group' ? conversationName : undefined,
        projectTitle
      );

      // Set the newly created conversation as active
      if (conversation) {
        setActiveConversation(conversation);
      }

      // Reset form
      setSelectedUsers([]);
      setConversationName('');
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setConversationName('');
    setSearchQuery('');
    setError('');
    onClose();
  };

  const getConversationTitle = () => {
    switch (conversationType) {
      case 'direct':
        return 'New Direct Message';
      case 'group':
        return 'New Group Chat';
      case 'project_group':
        return `New ${projectTitle} Team Chat`;
      default:
        return 'New Conversation';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <h2 className="text-2xl font-bold text-white">
            {getConversationTitle()}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Conversation Type Selector */}
          {!projectId && (
            <div className="p-6 border-b border-slate-800/50">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleTypeChange('direct')}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    conversationType === 'direct'
                      ? 'border-brand-primary bg-brand-primary/20 text-white shadow-lg shadow-brand-primary/20'
                      : 'border-slate-700/50 hover:border-brand-primary/50 text-slate-400 hover:bg-slate-800/30'
                  }`}
                >
                  <MessageCircle className="w-5 h-5 mb-2" />
                  <div>
                    <p className="font-semibold text-sm">Direct</p>
                    <p className="text-xs opacity-70">1-on-1 chat</p>
                  </div>
                </button>
                <button
                  onClick={() => handleTypeChange('group')}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    conversationType === 'group'
                      ? 'border-brand-primary bg-brand-primary/20 text-white shadow-lg shadow-brand-primary/20'
                      : 'border-slate-700/50 hover:border-brand-primary/50 text-slate-400 hover:bg-slate-800/30'
                  }`}
                >
                  <Users className="w-5 h-5 mb-2" />
                  <div>
                    <p className="font-semibold text-sm">Group</p>
                    <p className="text-xs opacity-70">Multiple people</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Group Name Input */}
          {(conversationType === 'group' || conversationType === 'project_group') && (
            <div className="p-6 border-b border-dark-border">
              <Input
                label="Group Name"
                value={conversationName}
                onChange={(e) => setConversationName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>
          )}

          {/* Search */}
          <div className="p-6 border-b border-slate-800/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary focus:bg-slate-800/70 transition-all"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {searchLoading ? (
              <div className="p-6 text-center text-text-secondary">
                <div className="animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-text-secondary">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{searchQuery ? 'No users found matching your search' : 'No users available'}</p>
              </div>
            ) : (
              <div className="p-3">
                {filteredUsers.map(user => {
                  const isSelected = selectedUsers.some(u => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUserSelection(user)}
                      className={`w-full p-3 rounded-xl flex items-center space-x-3 text-left transition-all ${
                        isSelected
                          ? 'bg-brand-primary/20 border border-brand-primary shadow-lg shadow-brand-primary/20'
                          : 'hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12 ring-2 ring-slate-800/50">
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-white font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-sm text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-3 border-t border-dark-border">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-slate-800/50 flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-slate-800/50 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreateConversation() || loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-brand-primary/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </div>
            ) : (
              'Create'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
