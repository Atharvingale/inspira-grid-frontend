"use client";

import React, { useState, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, AlertCircle, Loader2 } from "lucide-react";

const inputVariants = cva(
  "flex w-full rounded-md border bg-dark-card transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-ig-focus disabled:cursor-not-allowed disabled:opacity-50 text-text-primary placeholder:text-text-tertiary",
  {
    variants: {
      variant: {
        default:
          "border-dark-border hover:border-dark-border focus:border-brand-primary/50",
        filled:
          "bg-dark-surface border-dark-border focus:border-brand-primary/50",
        ghost:
          "bg-transparent border-transparent focus:bg-dark-card focus:border-dark-border",
        error:
          "border-danger-500 focus:border-danger-500",
        success:
          "border-success-500 focus:border-success-500",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-3.5 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      type = "text",
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      loading,
      showPasswordToggle,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const finalVariant = error ? "error" : success ? "success" : variant;
    const inputType = type === "password" && showPassword ? "text" : type;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
            {label}
            {props.required && <span className="text-danger-500">*</span>}
          </label>
        )}

        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-brand-primary transition-colors z-10 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            className={cn(
              inputVariants({ variant: finalVariant, size }),
              leftIcon && "pl-10",
              (rightIcon ||
                loading ||
                error ||
                success ||
                (type === "password" && showPasswordToggle)) &&
                "pr-11",
              className
            )}
            disabled={loading || props.disabled}
            {...props}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && (
              <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
            )}
            {!loading && error && (
              <AlertCircle className="w-4 h-4 text-danger-500" />
            )}
            {!loading && !error && success && (
              <Check className="w-4 h-4 text-success-500" />
            )}
            {!loading &&
              !error &&
              !success &&
              type === "password" &&
              showPasswordToggle && (
                <button
                  type="button"
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            {!loading &&
              !error &&
              !success &&
              rightIcon &&
              type !== "password" && (
                <div className="text-text-tertiary">{rightIcon}</div>
              )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-sm text-danger-500">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        {!error && success && (
          <div className="flex items-center gap-1.5 text-sm text-success-500">
            <Check className="w-3.5 h-3.5 shrink-0" />
            {success}
          </div>
        )}
        {!error && !success && hint && (
          <p className="text-sm text-text-tertiary">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
