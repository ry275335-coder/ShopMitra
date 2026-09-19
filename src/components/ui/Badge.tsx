// ==============================================================================
// src/components/ui/Badge.tsx
// Status & Verification Badge Primitive
// ==============================================================================

import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 
  | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate' | 'outline'
  | 'success' | 'warning' | 'danger' | 'primary' | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({ className, variant = 'slate', size = 'md', children, ...props }: BadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.2',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-xs sm:text-sm px-2.5 py-1',
  };

  const base = 'inline-flex items-center gap-1 font-bold rounded-md border';

  const variants: Record<BadgeVariant, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    outline: 'bg-transparent text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-700',
    // Semantic aliases
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    primary: 'bg-emerald-600 text-white border-transparent',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <span className={cn(base, sizeClasses[size], variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
