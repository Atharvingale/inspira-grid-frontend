/**
 * Calculate profile completion percentage
 * @param profile User profile object
 * @returns Object with completion percentage and missing fields
 */
export interface ProfileCompletionResult {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  isComplete: boolean;
}

export const calculateProfileCompletion = (profile: any): ProfileCompletionResult => {
  if (!profile) {
    return {
      percentage: 0,
      completedFields: 0,
      totalFields: 8,
      missingFields: ['displayName', 'bio', 'skills', 'location', 'website', 'github', 'linkedin', 'photoURL'],
      isComplete: false
    };
  }

  const fields = [
    { key: 'displayName', label: 'Display Name', weight: 2 },
    { key: 'bio', label: 'Bio', weight: 2 },
    { key: 'skills', label: 'Skills', weight: 2, isArray: true },
    { key: 'location', label: 'Location', weight: 1 },
    { key: 'website', label: 'Website', weight: 0.5 },
    { key: 'github', label: 'GitHub', weight: 1 },
    { key: 'linkedin', label: 'LinkedIn', weight: 0.5 },
    { key: 'photoURL', label: 'Profile Photo', weight: 1 }
  ];

  let completedWeight = 0;
  let totalWeight = 0;
  const missingFields: string[] = [];
  let completedFields = 0;

  fields.forEach(field => {
    totalWeight += field.weight;
    
    const value = profile[field.key];
    const isCompleted = field.isArray 
      ? Array.isArray(value) && value.length > 0
      : value && value.trim !== '' && value !== '';
    
    if (isCompleted) {
      completedWeight += field.weight;
      completedFields++;
    } else {
      missingFields.push(field.label);
    }
  });

  const percentage = Math.round((completedWeight / totalWeight) * 100);
  const isComplete = percentage >= 80; // Consider 80% as complete

  return {
    percentage,
    completedFields,
    totalFields: fields.length,
    missingFields,
    isComplete
  };
};

/**
 * Get profile completion status message
 */
export const getProfileCompletionMessage = (result: ProfileCompletionResult): string => {
  if (result.percentage === 100) {
    return '🎉 Your profile is complete!';
  } else if (result.percentage >= 80) {
    return '✨ Almost there! Just a few more details.';
  } else if (result.percentage >= 50) {
    return '📝 You\'re halfway there! Keep going.';
  } else if (result.percentage >= 25) {
    return '🚀 Good start! Add more info to stand out.';
  } else {
    return '👋 Let\'s complete your profile to unlock all features!';
  }
};
