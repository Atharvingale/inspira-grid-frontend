'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMessaging } from '@/lib/contexts/MessagingContext';
import Loading from '@/components/common/Loading';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { FileUpload } from '@/components/messages/FileUpload';
import { NewConversationModal } from '@/components/messages/NewConversationModal';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (state.activeConversation) {
      loadMessages(state.activeConversation.id);
    }
  }, [state.activeConversation, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !state.activeConversation) return;

    try {
      setSendingMessage(true);
      await sendMessage(state.activeConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewConversation = () => {
    setShowNewConversation(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!state.activeConversation) return;
    
    try {
      setSendingMessage(true);
      await sendFile(state.activeConversation.id, file);
      setShowFileUpload(false);
    } catch (error) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (!state.activeConversation) return;
    
    // Handle typing indicators
    if (value.trim() && !typing) {
      setTyping(true);
      startTyping(state.activeConversation.id);
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing
    const timeout = setTimeout(() => {
      if (typing) {
        setTyping(false);
        stopTyping(state.activeConversation!.id);
      }
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const _formatTime = (date: Date | { seconds: number; nanoseconds: number }) => {
    const dateObj = date instanceof Date ? date : new Date(date.seconds * 1000);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (state.loading) {
    return <Loading message="Loading messages..." />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex overflow-hidden">
      <ConversationList
        conversations={state.conversations}
        activeConversation={state.activeConversation}
        searchQuery={searchQuery}
        onConversationSelect={setActiveConversation}
        onSearchChange={setSearchQuery}
        onNewConversation={handleNewConversation}
        getConversationName={getConversationName}
        currentUserId={currentUser?.uid}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {state.activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="relative z-10 px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-semibold shadow-lg">
                    {getConversationName(state.activeConversation).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {getConversationName(state.activeConversation)}
                    </h2>
                    <p className="text-sm text-slate-400 flex items-center">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                      {state.activeConversation.participants?.length || 0} participant{(state.activeConversation.participants?.length || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gradient-to-b from-transparent via-slate-950/30 to-transparent">
              {(state.messages[state.activeConversation.id] || []).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full opacity-20 animate-pulse"></div>
                      <div className="absolute inset-2 bg-slate-900/60 backdrop-blur-xl rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">No messages yet</h3>
                      <p className="text-slate-400">Start the conversation by sending a message below</p>
                    </div>
                  </div>
                </div>
              ) : (
                (state.messages[state.activeConversation.id] || []).map((message) => {
                  // Get other participant for direct chats
                  const otherParticipant = state.activeConversation?.type === 'direct'
                    ? state.activeConversation.participants?.find(p => p.id !== currentUser?.uid)
                    : undefined;
                  
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isCurrentUser={message.senderId === currentUser?.uid}
                      onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                      onRemoveReaction={(emoji) => handleRemoveReaction(message.id, emoji)}
                      conversationType={state.activeConversation?.type}
                      otherParticipantId={otherParticipant?.id}
                    />
                  );
                })
              )}
            </div>

            {/* Typing Indicators */}
            {state.typingIndicators
              .filter(t => t.conversationId === state.activeConversation?.id)
              .length > 0 && (
              <div className="px-6 py-2 flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-sm text-slate-400 italic">
                  {state.typingIndicators
                    .filter(t => t.conversationId === state.activeConversation?.id)
                    .map(t => t.userName)
                    .join(', ')}{' '}
                  {state.typingIndicators.filter(t => t.conversationId === state.activeConversation?.id).length === 1
                    ? 'is typing...' 
                    : 'are typing...'}
                </p>
              </div>
            )}

            {/* Message Input */}
            <div className="relative z-10 px-6 py-4 bg-slate-900/60 backdrop-blur-xl border-t border-slate-800/50">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => setShowFileUpload(true)}
                  className="group p-3 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all duration-200 hover:scale-110"
                  disabled={sendingMessage}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full px-5 py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary focus:bg-slate-800/70 transition-all backdrop-blur-sm"
                    disabled={sendingMessage}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="group relative px-5 py-3.5 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-2xl hover:shadow-xl hover:shadow-brand-primary/40 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
                >
                  {sendingMessage ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-950/50 to-slate-900/30">
            <div className="text-center space-y-8 max-w-md px-6">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full opacity-20 blur-2xl animate-pulse"></div>
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl rounded-full flex items-center justify-center border-2 border-slate-800/50">
                  <svg className="w-16 h-16 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-white">Your Messages</h3>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Send private messages to team members and collaborators
                </p>
              </div>
              <button
                onClick={handleNewConversation}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-brand-primary/40 hover:scale-105 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Send Message</span>
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
