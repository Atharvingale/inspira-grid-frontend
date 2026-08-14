'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Message } from '@/lib/contexts/MessagingContext';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  onAddReaction?: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
  conversationType?: 'direct' | 'group' | 'project_group';
  otherParticipantId?: string; // For direct chats only
}

export function MessageBubble({
  message,
  isCurrentUser,
  showAvatar = true,
  onAddReaction,
  onRemoveReaction,
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

  if (!isCurrentUser) {
    return (
      <div className="flex items-start justify-start group relative mb-4 animate-fadeIn transition-all duration-200">
        {showAvatar && (
          <Avatar className="w-10 h-10 mr-3 mt-1.5 ring-2 ring-[var(--ig-border)] flex-shrink-0">
            <AvatarImage src={message.senderPhoto || undefined} alt={message.senderName} />
            <AvatarFallback className="bg-slate-800 text-white text-sm font-semibold">
              {message.senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex flex-col items-start max-w-[70%] md:max-w-[60%]">
          {/* Header containing name and timestamp */}
          <div className="flex items-center space-x-2 mb-1 px-1 text-xs">
            <span className="font-semibold text-white">{message.senderName}</span>
            <span className="text-[var(--ig-text-muted)] font-medium">{formatTime(message.timestamp)}</span>
          </div>
          
          {/* Bubble & Hover picker container */}
          <div className="relative group/bubble">
            <div className="bg-[#1e293b]/40 border border-[var(--ig-border)] text-white px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm transition-all duration-200">
              {message.replyTo && (
                <div className="mb-2 p-2 bg-black/30 rounded-lg border-l-2 border-white/50">
                  <p className="text-xs opacity-80">Replying to message...</p>
                </div>
              )}
              
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
                    <p className="text-sm leading-relaxed">{message.content}</p>
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

              {message.edited && (
                <p className="text-[10px] text-[var(--ig-text-muted)] italic mt-1 text-right">
                  edited
                </p>
              )}
            </div>
            
            {/* Reaction Picker on hover */}
            <div className="opacity-0 group-hover/bubble:opacity-100 pointer-events-none group-hover/bubble:pointer-events-auto transition-all duration-200 absolute -top-11 left-0 z-50 bg-[#0f172a]/95 border border-[var(--ig-border)] rounded-full px-2.5 py-1.5 shadow-xl flex space-x-1">
              {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onAddReaction?.(emoji)}
                  className="hover:scale-125 rounded-full p-1 text-sm transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Reaction badges */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5 px-1">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => onRemoveReaction?.(reaction.emoji)}
                  className="px-2 py-0.5 text-xs bg-[#1e293b]/60 hover:bg-[#1e293b]/90 border border-[var(--ig-border)] rounded-full cursor-pointer transition-all hover:scale-105 font-medium text-white flex items-center gap-1"
                >
                  <span>{reaction.emoji}</span> 
                  <span className="text-[10px] text-[var(--ig-text-secondary)]">{reaction.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-end group relative mb-4 animate-fadeIn transition-all duration-200">
      <div className="flex flex-col items-end max-w-[70%] md:max-w-[60%]">
        {/* Header containing timestamp and "You" */}
        <div className="flex items-center space-x-2 mb-1 px-1 text-xs">
          <span className="text-[var(--ig-text-muted)] font-medium">{formatTime(message.timestamp)}</span>
          <span className="font-semibold text-white">You</span>
        </div>
        
        {/* Bubble & Hover picker container */}
        <div className="relative group/bubble">
          <div className="bg-gradient-to-br from-[var(--ig-accent)] to-[var(--ig-accent-strong)] text-white px-4 py-2.5 rounded-2xl rounded-tr-none shadow-sm transition-all duration-200">
            {message.replyTo && (
              <div className="mb-2 p-2 bg-black/30 rounded-lg border-l-2 border-white/50">
                <p className="text-xs opacity-80">Replying to message...</p>
              </div>
            )}
            
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
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
            )}
            
            {message.type === 'file' && (
              <div className="flex items-center space-x-3 p-2 bg-black/10 rounded-lg">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">{message.fileName}</p>
                  <p className="text-xs text-white/70">
                    {message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-white/70">
              {message.edited && <span className="italic">edited</span>}
              {conversationType === 'direct' && (
                <span>{isSeen ? 'Seen' : 'Delivered'}</span>
              )}
            </div>
          </div>
          
          {/* Reaction Picker on hover */}
          <div className="opacity-0 group-hover/bubble:opacity-100 pointer-events-none group-hover/bubble:pointer-events-auto transition-all duration-200 absolute -top-11 right-0 z-50 bg-[#0f172a]/95 border border-[var(--ig-border)] rounded-full px-2.5 py-1.5 shadow-xl flex space-x-1">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddReaction?.(emoji)}
                className="hover:scale-125 rounded-full p-1 text-sm transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Reaction badges */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5 px-1 justify-end">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => onRemoveReaction?.(reaction.emoji)}
                className="px-2 py-0.5 text-xs bg-[#1e293b]/60 hover:bg-[#1e293b]/90 border border-[var(--ig-border)] rounded-full cursor-pointer transition-all hover:scale-105 font-medium text-white flex items-center gap-1"
              >
                <span>{reaction.emoji}</span> 
                <span className="text-[10px] text-[var(--ig-text-secondary)]">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showAvatar && (
        <Avatar className="w-10 h-10 ml-3 mt-1.5 ring-2 ring-[var(--ig-accent)]/30 flex-shrink-0">
          <AvatarImage src={message.senderPhoto || undefined} alt={message.senderName} />
          <AvatarFallback className="bg-[var(--ig-accent-strong)] text-white text-sm font-semibold">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}