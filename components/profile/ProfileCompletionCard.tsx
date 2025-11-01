"use client";

import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { calculateProfileCompletion, getProfileCompletionMessage } from '@/lib/utils/profileCompletion';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ProfileCompletionCardProps {
  userProfile: any;
  compact?: boolean;
}

export const ProfileCompletionCard = ({ userProfile, compact = false }: ProfileCompletionCardProps) => {
  const router = useRouter();
  const completion = calculateProfileCompletion(userProfile);

  if (completion.percentage === 100 && compact) {
    return null; // Don't show if profile is complete and compact mode
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-500';
    if (percentage >= 50) return 'from-blue-500 to-cyan-500';
    if (percentage >= 25) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Card className="p-4 bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 border-brand-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative w-12 h-12">
                <svg className="transform -rotate-90 w-12 h-12">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-dark-surface"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - completion.percentage / 100)}`}
                    className="text-brand-primary transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-brand-primary">
                  {completion.percentage}%
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Profile Completion</p>
                <p className="text-xs text-text-tertiary">{completion.completedFields}/{completion.totalFields} fields completed</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/profile')}
              className="text-brand-primary hover:text-brand-light"
            >
              Complete
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="p-6 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/5 border-brand-primary/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-1 flex items-center">
              {completion.percentage === 100 ? (
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2 text-brand-primary" />
              )}
              Profile Completion
            </h3>
            <p className="text-sm text-text-secondary">
              {getProfileCompletionMessage(completion)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand-primary">{completion.percentage}%</p>
            <p className="text-xs text-text-tertiary">
              {completion.completedFields}/{completion.totalFields} complete
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-dark-surface rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getProgressColor(completion.percentage)} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${completion.percentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Missing Fields */}
        {completion.missingFields.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-text-secondary mb-2">Missing information:</p>
            <div className="flex flex-wrap gap-2">
              {completion.missingFields.slice(0, 5).map((field, _index) => (
                <motion.span
                  key={field}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="px-3 py-1 bg-dark-surface/50 text-text-tertiary text-xs rounded-full border border-dark-border"
                >
                  {field}
                </motion.span>
              ))}
              {completion.missingFields.length > 5 && (
                <span className="px-3 py-1 text-text-muted text-xs">
                  +{completion.missingFields.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {completion.percentage < 100 && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/dashboard/profile')}
            className="w-full"
          >
            Complete Your Profile
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {completion.percentage === 100 && (
          <div className="flex items-center justify-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-500 font-medium">Your profile is complete!</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
