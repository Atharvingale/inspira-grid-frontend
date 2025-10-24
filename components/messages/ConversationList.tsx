'use client';

import React from 'react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, Plus, Users, User } from 'lucide-react';
import type { Conversation, User as UserType } from '@/lib/contexts/MessagingContext';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  searchQuery: string;
  onConversationSelect: (conversation: Conversation) => void;
  onSearchChange: (query: string) => void;
  onNewConversation: () => void;
  getConversationName: (conversation: Conversation) => string;
  currentUserId?: string;
}

export function ConversationList({
  conversations,
  activeConversation,
  searchQuery,
  onConversationSelect,
  onSearchChange,
  onNewConversation,
  getConversationName,
  currentUserId
}: ConversationListProps) {
  const formatLastMessageTime = (date: Date) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (isYesterday(messageDate)) {
      return 'Yesterday';
    }
    
    return formatDistanceToNow(messageDate, { addSuffix: false });
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
      return {
        src: otherParticipant?.photoURL,
        fallback: otherParticipant?.name?.charAt(0) || '?',
        isOnline: otherParticipant?.isOnline
      };
    }
    
    return {
      src: undefined,
      fallback: conversation.name?.charAt(0) || 'G',
      isOnline: false
    };
  };

  const filteredConversations = conversations.filter(conversation => {
    const name = getConversationName(conversation).toLowerCase();
    const lastMessage = conversation.lastMessage?.content?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return name.includes(query) || lastMessage.includes(query);
  });

  return (
    <div className="w-1/3 bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <p className="text-sm text-slate-400 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onNewConversation}
            className="p-2.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl hover:shadow-lg hover:shadow-brand-primary/30 hover:scale-110 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary focus:bg-slate-800/70 transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <Users className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              {searchQuery 
                ? 'Try different search terms'
                : 'Start collaborating on projects to begin messaging with team members.'
              }
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const avatar = getConversationAvatar(conversation);
            const isActive = activeConversation?.id === conversation.id;
            
            return (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`group relative p-4 cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-brand-primary/20 to-brand-secondary/10 border-l-4 border-brand-primary' 
                    : 'hover:bg-slate-800/30 border-l-4 border-transparent hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    {conversation.type === 'direct' ? (
                      <Avatar className="w-14 h-14 ring-2 ring-slate-800/50 group-hover:ring-brand-primary/30 transition-all">
                        <AvatarImage src={avatar.src} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-white font-semibold">
                          {avatar.fallback}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                        conversation.type === 'project_group'
                          ? 'bg-gradient-to-br from-brand-primary to-brand-secondary'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        {conversation.type === 'project_group' ? (
                          <Users className="w-7 h-7 text-white" />
                        ) : (
                          <Users className="w-7 h-7 text-white" />
                        )}
                      </div>
                    )}
                    
                    {/* Online indicator */}
                    {conversation.type === 'direct' && avatar.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-base font-semibold text-white truncate group-hover:text-brand-primary transition-colors">
                        {getConversationName(conversation)}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-xs text-slate-500 flex-shrink-0 ml-2 font-medium">
                          {formatLastMessageTime(conversation.lastMessage.timestamp)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate flex-1 mr-2 ${
                        conversation.unreadCount > 0 ? 'text-slate-300 font-medium' : 'text-slate-400'
                      }`}>
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                      
                      {conversation.unreadCount > 0 && (
                        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary text-white text-xs font-bold px-2.5 py-1 rounded-full min-w-[24px] flex items-center justify-center shadow-lg animate-pulse">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                    
                    {/* Project indicator */}
                    {conversation.type === 'project_group' && conversation.projectTitle && (
                      <div className="flex items-center mt-2 px-2 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <div className="w-1.5 h-1.5 bg-brand-primary rounded-full mr-2 animate-pulse"></div>
                        <p className="text-xs text-slate-400 truncate">
                          Project: {conversation.projectTitle}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Typing indicator */}
                {conversation.isTyping && conversation.isTyping.length > 0 && (
                  <div className="mt-3 flex items-center space-x-2 px-2 py-1.5 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-brand-primary font-medium italic">
                      {conversation.isTyping.length === 1
                        ? `${conversation.participants.find(p => p.id === conversation.isTyping![0])?.name} is typing...`
                        : `${conversation.isTyping.length} people are typing...`
                      }
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
