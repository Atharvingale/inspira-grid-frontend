'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Message, MessageReaction } from '@/lib/contexts/MessagingContext';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  onAddReaction?: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  conversationType?: 'direct' | 'group' | 'project_group';
  otherParticipantId?: string; // For direct chats only
}

export function MessageBubble({
  message,
  isCurrentUser,
  showAvatar = true,
  onAddReaction,
  onRemoveReaction,
  onDeleteMessage,
  conversationType,
  otherParticipantId
}: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Check if message has been seen (for direct chats)
  const isSeen = conversationType === 'direct' && 
                 isCurrentUser && 
                 otherParticipantId && 
                 message.readBy?.includes(otherParticipantId);


  if (message.isDeleted) {
    return (
      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group mb-2`}>
        <div className={`px-4 py-2 rounded-2xl border border-slate-700 text-slate-500 italic text-sm ${isCurrentUser ? 'ml-auto' : ''}`}>
          This message was unsent
        </div>
      </div>
    );
  }

  return (

    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group animate-fadeIn`}>
      {!isCurrentUser && showAvatar && (
        <Avatar className="w-10 h-10 mr-3 mt-1 ring-2 ring-slate-800/50">
          <AvatarImage src={message.senderPhoto || undefined} alt={message.senderName} />
          <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-white text-sm font-semibold">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-xs lg:max-w-lg ${isCurrentUser ? 'ml-auto' : ''}`}>
        {!isCurrentUser && (
          <p className="text-xs font-medium text-slate-500 mb-1.5 px-2">{message.senderName}</p>
        )}
        
        <div
          className={`relative px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl ${
            isCurrentUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-slate-800 text-white rounded-bl-sm border-none'
          }`}
        >
          {message.replyTo && (
            <div className="mb-2 p-2 bg-black/30 rounded-lg border-l-2 border-white/50">
              <p className="text-xs opacity-80">Replying to message...</p>
            </div>
          )}
          
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              {message.type === 'text' && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
              )}
              
              {message.type === 'image' && (
                <div className="space-y-2">
                  <img 
                    src={message.fileUrl} 
                    alt="Shared image"
                    className="max-w-full h-auto rounded-lg"
                  />
                  {message.content && (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              )}
              
              {message.type === 'file' && (
                <div className="flex items-center space-x-3 p-2 bg-black/10 rounded-lg">
                  <div className="w-10 h-10 bg-current/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.fileName}</p>
                    <p className="text-xs opacity-60">
                      {message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end space-y-1">
              <p
                className={`text-xs font-medium ${
                  isCurrentUser ? 'text-white/80' : 'text-slate-400'
                }`}
              >
                {formatTime(message.timestamp)}
              </p>
              
              {isCurrentUser && conversationType === 'direct' && (
                <p className="text-xs text-white/70">
                  {isSeen ? 'Seen' : 'Delivered'}
                </p>
              )}
              
              {message.edited && (
                <p
                  className={`text-xs italic ${
                    isCurrentUser ? 'text-white/60' : 'text-slate-500'
                  }`}
                >
                  edited
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 px-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => onRemoveReaction?.(reaction.emoji)}
                className="px-2.5 py-1 text-xs bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-full cursor-pointer transition-all hover:scale-110 font-medium"
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        )}
        

        {/* Quick reactions on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute -top-8 right-0 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-full px-3 py-2 shadow-xl flex items-center gap-2">
          <div className="flex space-x-1.5 border-r border-slate-700 pr-2">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddReaction?.(emoji)}
                className="hover:bg-slate-700/50 hover:scale-125 rounded-full p-1.5 text-base transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
          {isCurrentUser && (
            <button
              className="text-xs text-red-400 hover:text-red-300 font-medium px-2"
              onClick={() => {
                if (onDeleteMessage) {
                  onDeleteMessage(message.id);
                }
              }}
            >
              Unsend
            </button>
          )}
        </div>

      </div>
      
      {isCurrentUser && showAvatar && (
        <Avatar className="w-10 h-10 ml-3 mt-1 ring-2 ring-brand-primary/30">
          <AvatarImage src={message.senderPhoto || undefined} alt={message.senderName} />
          <AvatarFallback className="bg-gradient-to-br from-brand-primary to-brand-secondary text-white text-sm font-semibold">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}