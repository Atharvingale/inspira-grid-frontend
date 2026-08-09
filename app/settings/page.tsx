"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Lock, Shield, Info, Check, User, Save } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "react-toastify";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  const [user, loading] = useAuthState(auth);
  const { userProfile, updateUserProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    projectUpdates: true,
    applicationUpdates: true,
    messageNotifications: true,
    weeklyDigest: false
  });
  
  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showLocation: true,
    allowDirectMessages: true,
    showOnlineStatus: true
  });

  const [_showPasswordModal, setShowPasswordModal] = useState(false);
  const [_showEmailModal, setShowEmailModal] = useState(false);
  const [_passwords, _setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [_newEmail, _setNewEmail] = useState('');

  // Load settings from user profile
  useEffect(() => {
    if (userProfile) {
      if (userProfile.notificationSettings) {
        setNotifications((current) => ({ ...current, ...userProfile.notificationSettings }));
      }
      if (userProfile.privacySettings) {
        setPrivacy((current) => ({ ...current, ...userProfile.privacySettings }));
      }
    }
  }, [userProfile]);

  const saveNotificationSettings = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const success = await updateUserProfile(user.uid, {
        notificationSettings: notifications
      });
      
      if (success) {
        toast.success('Notification settings saved successfully!');
      } else {
        toast.error('Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const success = await updateUserProfile(user.uid, {
        privacySettings: privacy
      });
      
      if (success) {
        toast.success('Privacy settings saved successfully!');
      } else {
        toast.error('Failed to save privacy settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-text-tertiary">Loading settings...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
        <Card className="p-8 text-center">
          <Lock className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-primary text-lg font-semibold mb-2">Authentication Required</p>
          <p className="text-text-tertiary">Please log in to access settings.</p>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'about', label: 'About', icon: Info }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-brand-primary/10 rounded-xl">
              <User className="w-6 h-6 text-brand-primary" />
            </div>
            <h1 className="text-4xl font-bold text-text-primary">Account Settings</h1>
          </div>
          <p className="mt-2 text-text-secondary text-lg">Manage your account preferences and privacy settings.</p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8"
        >
          <Card className="p-2 backdrop-blur-sm">
            <nav className="flex space-x-2">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
                      activeTab === tab.id
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                        : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </motion.button>
                );
              })}
            </nav>
          </Card>
        </motion.div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === 'notifications' && (
          <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">Notification Preferences</h2>
            
            <div className="space-y-4">
              {Object.entries({
                emailNotifications: 'Receive email notifications',
                projectUpdates: 'Project updates and announcements',
                applicationUpdates: 'Application status updates',
                messageNotifications: 'New message notifications',
                weeklyDigest: 'Weekly digest email'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
                  <input
                    type="checkbox"
                    checked={notifications[key as keyof typeof notifications]}
                    onChange={(e) => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded border-dark-border bg-dark-surface text-brand-primary focus:ring-brand-primary focus:ring-offset-0 focus:ring-2 transition-all"
                  />
                </label>
              ))}
            </div>
            
            <Button
              onClick={saveNotificationSettings}
              disabled={saving}
              variant="primary"
              size="lg"
              className="mt-8"
            >
              {saving ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </>
              )}
            </Button>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-6">Privacy Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  Profile Visibility
                </label>
                <select
                  value={privacy.profileVisibility}
                  onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value }))}
                  className="block w-full rounded-xl border border-dark-border bg-dark-surface/80 backdrop-blur-sm text-text-primary px-4 py-3 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                >
                  <option value="public" className="bg-dark-surface text-text-primary">Public - Everyone</option>
                  <option value="members" className="bg-dark-surface text-text-primary">Members Only</option>
                  <option value="private" className="bg-dark-surface text-text-primary">Private - Only You</option>
                </select>
              </div>
              
              <div className="space-y-3">
                {Object.entries({
                  showEmail: 'Show email address on profile',
                  showLocation: 'Show location on profile',
                  allowDirectMessages: 'Allow direct messages from other users',
                  showOnlineStatus: 'Show when you\'re online'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
                    <input
                      type="checkbox"
                      checked={privacy[key as keyof typeof privacy] as boolean}
                      onChange={(e) => setPrivacy(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="rounded border-dark-border bg-dark-surface text-brand-primary focus:ring-brand-primary focus:ring-offset-0 focus:ring-2 transition-all"
                    />
                  </label>
                ))}
              </div>
            </div>
            
            <Button
              onClick={savePrivacySettings}
              disabled={saving}
              variant="primary"
              size="lg"
              className="mt-8"
            >
              {saving ? (
                <>
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Privacy Settings
                </>
              )}
            </Button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
              <h2 className="text-2xl font-semibold text-text-primary mb-6">Account Security</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Email Address</p>
                    <p className="text-sm text-text-tertiary">{user.email}</p>
                  </div>
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="text-sm text-brand-primary hover:text-brand-light px-3 py-2 rounded-lg hover:bg-brand-primary/10 transition-all"
                  >
                    Change
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Password</p>
                    <p className="text-sm text-text-tertiary">••••••••</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="text-sm text-brand-primary hover:text-brand-light px-3 py-2 rounded-lg hover:bg-brand-primary/10 transition-all"
                  >
                    Change
                  </button>
                </div>
                
                <div className="pt-6 border-t border-dark-border/50">
                  <p className="text-sm font-semibold text-text-primary mb-2">Account Created</p>
                  <p className="text-sm text-text-secondary">
                    {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8">
              <h3 className="text-2xl font-semibold text-text-primary mb-6">Account Actions</h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => auth.signOut()}
                  className="w-full text-left px-6 py-4 rounded-xl border border-dark-border bg-dark-surface/50 text-text-primary hover:bg-white/5 hover:border-brand-primary/50 transition-all"
                >
                  Sign Out
                </button>
                
                <button
                  disabled
                  className="w-full text-left px-6 py-4 rounded-xl border border-dark-border bg-dark-surface/30 text-text-muted opacity-50 cursor-not-allowed"
                >
                  Download My Data (Coming Soon)
                </button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-danger-500/20">
                <h4 className="text-danger-500 font-semibold mb-4 text-lg">Danger Zone</h4>
                <button
                  disabled
                  className="px-6 py-3 bg-danger-500/10 text-danger-500 rounded-xl opacity-50 cursor-not-allowed border border-danger-500/20"
                >
                  Delete Account (Coming Soon)
                </button>
                <p className="text-xs text-text-muted mt-2">
                  Account deletion will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="rounded-2xl border border-dark-border bg-dark-card/80 backdrop-blur-sm p-8 text-center">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl text-white">⬢</span>
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-3">Inspira-Grid</h2>
              <p className="text-brand-primary text-base font-medium">Version 1.0.0</p>
            </div>
            
            <p className="text-text-secondary mb-8 text-lg leading-relaxed max-w-2xl mx-auto">
              A collaborative platform for students, creators, developers, and innovators
              to form teams, collaborate on projects, and bring ideas to life.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="p-6 rounded-xl bg-dark-surface/50 border border-dark-border">
                <div className="text-brand-primary text-3xl mb-4">⚡</div>
                <h3 className="font-semibold text-text-primary mb-2 text-lg">Built with</h3>
                <p className="text-sm text-text-tertiary">Next.js, Node.js, Firebase</p>
              </div>
              <div className="p-6 rounded-xl bg-dark-surface/50 border border-dark-border">
                <div className="text-success-500 text-3xl mb-4">🔒</div>
                <h3 className="font-semibold text-text-primary mb-2 text-lg">Secure</h3>
                <p className="text-sm text-text-tertiary">Firebase Authentication</p>
              </div>
              <div className="p-6 rounded-xl bg-dark-surface/50 border border-dark-border">
                <div className="text-warning-500 text-3xl mb-4">⚡</div>
                <h3 className="font-semibold text-text-primary mb-2 text-lg">Real-time</h3>
                <p className="text-sm text-text-tertiary">Pusher notifications</p>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-dark-border">
              <p className="text-sm text-text-muted">
                © 2024 Inspira-Grid. Built with passion for collaboration.
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
