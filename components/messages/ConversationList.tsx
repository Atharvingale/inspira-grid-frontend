'use client';

import React from 'react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Users } from 'lucide-react';
import type { Conversation } from '@/lib/contexts/MessagingContext';

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

  const formattedDate = format(new Date(), 'EEEE, d MMMM, yyyy');

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
      {/* Header */}
      <div className="p-6 border-b border-[var(--ig-border)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Message</h1>
            <p className="text-xs text-[var(--ig-text-secondary)] mt-1">{formattedDate}</p>
          </div>
          <button
            onClick={onNewConversation}
            className="p-2.5 bg-[var(--ig-accent-strong)] hover:bg-[var(--ig-accent)] text-white rounded-xl hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--ig-text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Chat..."
            className="w-full pl-11 pr-4 py-2.5 bg-[var(--ig-bg)] border border-[var(--ig-border)] rounded-xl text-white placeholder-[var(--ig-text-muted)] focus:outline-none focus:border-[var(--ig-accent)] transition-all text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent py-3">
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
                className={`group relative p-3.5 mx-3 my-1 rounded-xl cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'bg-[var(--ig-surface-hover)] border border-[var(--ig-border)]' 
                    : 'hover:bg-[var(--ig-surface-hover)] border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    {conversation.type === 'direct' ? (
                      <Avatar className="w-12 h-12 ring-2 ring-[var(--ig-border)] group-hover:ring-[var(--ig-accent)] transition-all">
                        <AvatarImage src={avatar.src} />
                        <AvatarFallback className="bg-slate-800 text-white font-semibold">
                          {avatar.fallback}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                        conversation.type === 'project_group'
                          ? 'bg-gradient-to-br from-[var(--ig-accent)] to-[var(--ig-accent-strong)]'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    )}
                    
                    {/* Online indicator */}
                    {conversation.type === 'direct' && avatar.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0f172a] rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-[var(--ig-accent)] transition-colors">
                        {getConversationName(conversation)}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-xs text-[var(--ig-text-muted)] flex-shrink-0 ml-2 font-medium">
                          {formatLastMessageTime(conversation.lastMessage.timestamp)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {conversation.isTyping && conversation.isTyping.length > 0 ? (
                        <span className="text-xs font-semibold italic text-[var(--ig-accent)] animate-pulse">
                          Typing...
                        </span>
                      ) : (
                        <p className={`text-xs truncate flex-1 mr-2 ${
                          conversation.unreadCount > 0 ? 'text-white font-medium' : 'text-[var(--ig-text-secondary)]'
                        }`}>
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                      )}
                      
                      {conversation.unreadCount > 0 && (
                        <div className="bg-[var(--ig-accent-strong)] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                    
                    {/* Project indicator */}
                    {conversation.type === 'project_group' && conversation.projectTitle && (
                      <div className="flex items-center mt-1.5 px-2 py-0.5 bg-[var(--ig-bg)] rounded-lg border border-[var(--ig-border)]">
                        <div className="w-1.5 h-1.5 bg-[var(--ig-accent)] rounded-full mr-2"></div>
                        <p className="text-[10px] text-[var(--ig-text-secondary)] truncate">
                          Project: {conversation.projectTitle}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
