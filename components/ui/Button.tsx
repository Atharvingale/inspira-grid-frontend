"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-ig-focus disabled:pointer-events-none disabled:opacity-40 relative",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-primary text-dark hover:bg-brand-light active:bg-brand-secondary",
        secondary:
          "bg-dark-card text-text-primary border border-dark-border hover:bg-dark-hover hover:border-dark-border",
        outline:
          "border border-brand-primary/40 text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary",
        ghost:
          "text-text-tertiary hover:bg-dark-card hover:text-text-primary",
        success:
          "bg-success-500 text-dark hover:bg-success-light",
        warning:
          "bg-warning-500 text-dark hover:bg-warning-light",
        danger:
          "bg-danger-500 text-dark hover:bg-danger-light",
        glass:
          "bg-dark-card/80 text-text-primary border border-dark-border hover:bg-dark-hover",
      },
      size: {
        xs: "h-7 px-2.5 text-xs gap-1",
        sm: "h-8 px-3 text-sm gap-1.5",
        default: "h-10 px-4 text-sm gap-2",
        lg: "h-11 px-5 text-base gap-2",
        xl: "h-12 px-6 text-base gap-2",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || disabled}
        {...props}
      >
        {loading && (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {leftIcon && !loading && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
export { buttonVariants };
