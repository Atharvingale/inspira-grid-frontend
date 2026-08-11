'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-brand-primary/30 bg-brand-primary/10 text-brand-primary',
        secondary:
          'border-dark-border bg-dark-surface text-text-secondary',
        destructive:
          'border-danger-500/30 bg-danger-500/10 text-danger-500',
        outline: 'border-dark-border text-text-secondary',
        success:
          'border-success-500/30 bg-success-500/10 text-success-500',
        warning:
          'border-warning-500/30 bg-warning-500/10 text-warning-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
