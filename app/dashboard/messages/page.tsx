'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMessaging } from '@/lib/contexts/MessagingContext';
import Loading from '@/components/common/Loading';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { FileUpload } from '@/components/messages/FileUpload';
import { NewConversationModal } from '@/components/messages/NewConversationModal';
import { Send, Paperclip, ArrowLeft, AlertCircle, Video, Phone, MoreVertical, Smile, Mic } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Messages = () => {
  const { currentUser } = useAuth();
  const {
    state,
    loadConversations,
    loadMessages,
    setActiveConversation,
    sendMessage,
    sendFile,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    getConversationName,
  } = useMessaging();

  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  // Mobile: show list or chat panel
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Typing indicator — use ref to avoid stale closure
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll sentinel
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (state.activeConversation) {
      loadMessages(state.activeConversation.id);
    }
  }, [state.activeConversation, loadMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.activeConversation?.id, state.messages]);

  // Auto-resize textarea
  const autoResizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = newMessage.trim();
    if (!content || !state.activeConversation) return;

    setSendError(null);
    try {
      setSendingMessage(true);
      await sendMessage(state.activeConversation.id, content);
      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Clear typing indicator
      if (isTypingRef.current) {
        isTypingRef.current = false;
        stopTyping(state.activeConversation.id);
      }
    } catch (error) {
      setSendError('Failed to send message. Please try again.');
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewConversation = () => setShowNewConversation(true);

  const handleFileUpload = async (file: File) => {
    if (!state.activeConversation) return;
    try {
      setSendingMessage(true);
      await sendFile(state.activeConversation.id, file);
      setShowFileUpload(false);
    } catch (error) {
      setSendError('Failed to upload file. Please try again.');
      console.error('Error uploading file:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!state.activeConversation) return;
    try {
      await addReaction(state.activeConversation.id, messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!state.activeConversation) return;
    try {
      await removeReaction(state.activeConversation.id, messageId, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    setSendError(null);
    autoResizeTextarea();

    if (!state.activeConversation) return;

    // Start typing indicator
    if (value.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(state.activeConversation.id);
    }

    // Reset stop-typing debounce
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && state.activeConversation) {
        isTypingRef.current = false;
        stopTyping(state.activeConversation.id);
      }
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift); Shift+Enter = newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConversationSelect = (conversation: Parameters<typeof setActiveConversation>[0]) => {
    setActiveConversation(conversation);
    setMobileView('chat');
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  if (state.loading && state.conversations.length === 0) {
    return <Loading message="Loading messages..." />;
  }

  const activeMessages = state.activeConversation
    ? (state.messages[state.activeConversation.id] || [])
    : [];

  const activeTypers = state.typingIndicators.filter(
    t => t.conversationId === state.activeConversation?.id
  );

  const activeConversationName = state.activeConversation 
    ? getConversationName(state.activeConversation) 
    : '';

  const getActiveConversationAvatar = () => {
    if (!state.activeConversation) return null;
    if (state.activeConversation.type === 'direct') {
      const otherParticipant = state.activeConversation.participants.find(p => p.id !== currentUser?.uid);
      return {
        src: otherParticipant?.photoURL,
        fallback: otherParticipant?.name?.charAt(0) || '?',
      };
    }
    return {
      src: undefined,
      fallback: state.activeConversation.name?.charAt(0) || 'G',
    };
  };

  const getHeaderStatus = () => {
    if (activeTypers.length > 0) {
      return 'Typing...';
    }
    if (state.activeConversation?.type === 'direct') {
      const otherParticipant = state.activeConversation.participants.find(p => p.id !== currentUser?.uid);
      return otherParticipant?.isOnline ? 'Online' : 'Offline';
    }
    return 'Online';
  };

  const status = getHeaderStatus();
  const activeAvatar = getActiveConversationAvatar();

  const getMessageDateLabel = (date: Date) => {
    const d = new Date(date);
    const dayStr = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : d.toLocaleDateString([], { weekday: 'long' });
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dayStr}, ${dateStr}`;
  };

  return (
    <div
      className="p-4 sm:p-6 flex gap-6 overflow-hidden w-full"
      style={{ height: 'calc(100vh - 96px)', background: 'var(--ig-bg)' }}
    >
      {/* Conversation List Card — hidden on mobile when chat is open */}
      <div
        className={`
          flex-shrink-0 border rounded-2xl md:rounded-3xl overflow-hidden
          w-full md:w-80 lg:w-96
          ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
          flex-col bg-[var(--ig-surface)] border-[var(--ig-border)] shadow-xl
        `}
      >
        <ConversationList
          conversations={state.conversations}
          activeConversation={state.activeConversation}
          searchQuery={searchQuery}
          onConversationSelect={handleConversationSelect}
          onSearchChange={setSearchQuery}
          onNewConversation={handleNewConversation}
          getConversationName={getConversationName}
          currentUserId={currentUser?.uid}
        />
      </div>

      {/* Chat Area Card */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 border rounded-2xl md:rounded-3xl overflow-hidden bg-[var(--ig-surface)] border-[var(--ig-border)] shadow-xl
          ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}
        `}
      >
        {state.activeConversation ? (
          <>
            {/* Chat Header */}
            <div
              className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-[var(--ig-border)] bg-[var(--ig-surface)]"
            >
              {/* Mobile back button */}
              <button
                onClick={handleBackToList}
                className="md:hidden p-2 rounded-lg mr-2 hover:bg-white/5 transition-colors"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--ig-text-secondary)]" />
              </button>

              <div className="flex items-center gap-3 flex-1 min-w-0">
                {activeAvatar && (
                  <Avatar className="w-10 h-10 ring-2 ring-[var(--ig-border)] flex-shrink-0">
                    <AvatarImage src={activeAvatar.src} />
                    <AvatarFallback className="bg-[#1e293b] text-white font-semibold">
                      {activeAvatar.fallback}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white truncate">
                    {activeConversationName}
                  </h2>
                  <p className="text-xs mt-0.5">
                    {status === 'Typing...' ? (
                      <span className="text-[var(--ig-accent)] font-semibold animate-pulse">Typing...</span>
                    ) : status === 'Online' ? (
                      <span className="text-emerald-400 font-semibold">Online</span>
                    ) : (
                      <span className="text-[var(--ig-text-muted)] font-medium">Offline</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Call/More Actions Header Icons */}
              <div className="flex items-center gap-2">
                <button className="p-2 text-[var(--ig-text-secondary)] hover:text-white hover:bg-[var(--ig-surface-hover)] rounded-xl transition-all" title="Video Call">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-[var(--ig-text-secondary)] hover:text-white hover:bg-[var(--ig-surface-hover)] rounded-xl transition-all" title="Voice Call">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-[var(--ig-text-secondary)] hover:text-white hover:bg-[var(--ig-surface-hover)] rounded-xl transition-all" title="More Actions">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-transparent"
            >
              {activeMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-3">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-[#1e293b]/60"
                    >
                      <svg className="w-8 h-8 text-[var(--ig-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">No messages yet</h3>
                      <p className="text-sm mt-1 text-[var(--ig-text-muted)]">Start the conversation below</p>
                    </div>
                  </div>
                </div>
              ) : (
                (() => {
                  let lastDateLabel = '';
                  return activeMessages.map((message) => {
                    const otherParticipant = state.activeConversation?.type === 'direct'
                      ? state.activeConversation.participants?.find(p => p.id !== currentUser?.uid)
                      : undefined;
                    const messageDate = new Date(message.timestamp);
                    const dateLabel = getMessageDateLabel(messageDate);
                    const showDivider = dateLabel !== lastDateLabel;
                    lastDateLabel = dateLabel;

                    return (
                      <React.Fragment key={message.id}>
                        {showDivider && (
                          <div className="flex justify-center my-6">
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#1e293b]/80 text-[#94a3b8] border border-[var(--ig-border)] shadow-sm">
                              {dateLabel}
                            </span>
                          </div>
                        )}
                        <MessageBubble
                          message={message}
                          isCurrentUser={message.senderId === currentUser?.uid}
                          onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                          onRemoveReaction={(emoji) => handleRemoveReaction(message.id, emoji)}
                          conversationType={state.activeConversation?.type}
                          otherParticipantId={otherParticipant?.id}
                        />
                      </React.Fragment>
                    );
                  });
                })()
              )}
              {/* Auto-scroll sentinel */}
              <div ref={messagesEndRef} />
            </div>

            {/* Send Error Banner */}
            {sendError && (
              <div
                className="mx-6 mb-2 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--ig-danger)' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {sendError}
              </div>
            )}

            {/* Message Input */}
            <div
              className="flex-shrink-0 px-6 py-4 border-t border-[var(--ig-border)] bg-[var(--ig-surface)]"
            >
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                {/* Input container box that has icons inside */}
                <div className="flex-1 flex items-center bg-[#020617] border border-[var(--ig-border)] rounded-full px-4 py-1.5 focus-within:border-[var(--ig-accent)] transition-all">
                  {/* Emoji picker icon */}
                  <button type="button" className="p-1.5 text-[var(--ig-text-secondary)] hover:text-white transition-colors" title="Emoji">
                    <Smile className="w-5 h-5" />
                  </button>
                  
                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-white placeholder-[var(--ig-text-muted)] text-sm resize-none mx-2 max-h-24 py-1.5 scrollbar-none"
                    disabled={sendingMessage}
                  />
                  
                  {/* Right-side icons inside the input box */}
                  <div className="flex items-center gap-1">
                    {/* Attachment button */}
                    <button
                      type="button"
                      onClick={() => setShowFileUpload(true)}
                      disabled={sendingMessage}
                      className="p-1.5 text-[var(--ig-text-secondary)] hover:text-white transition-colors disabled:opacity-40"
                      title="Attach file"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    
                    {/* Voice mic icon */}
                    <button type="button" className="p-1.5 text-[var(--ig-text-secondary)] hover:text-white transition-colors" title="Voice note">
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Standalone send button */}
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-[var(--ig-accent-strong)] hover:bg-[var(--ig-accent)] text-white rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:scale-105"
                  title="Send message"
                >
                  {sendingMessage ? (
                    <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <Send className="w-4 h-4 translate-x-[1px] -translate-y-[1px]" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* No conversation selected — empty state */
          <div
            className="flex-1 hidden md:flex items-center justify-center bg-[var(--ig-surface)]"
          >
            <div className="text-center space-y-4 max-w-sm px-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto bg-[#1e293b]/60"
              >
                <svg className="w-10 h-10 text-[var(--ig-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Your Messages</h3>
                <p className="text-sm mt-2 text-[var(--ig-text-muted)]">
                  Select a conversation to start chatting with team members
                </p>
              </div>
              <button
                onClick={handleNewConversation}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ background: 'var(--ig-accent-strong)', color: 'white' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showFileUpload && (
        <FileUpload
          onFileSelect={handleFileUpload}
          onCancel={() => setShowFileUpload(false)}
          disabled={sendingMessage}
        />
      )}
      {showNewConversation && (
        <NewConversationModal
          isOpen={showNewConversation}
          onClose={() => setShowNewConversation(false)}
        />
      )}
    </div>
  );
};

export default Messages;
