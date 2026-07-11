import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: {
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success-text)',
  },
  warning: {
    backgroundColor: 'var(--color-warning-bg)',
    color: 'var(--color-warning-text)',
  },
  error: {
    backgroundColor: 'var(--color-error-bg)',
    color: 'var(--color-error-text)',
  },
  info: {
    backgroundColor: 'var(--color-info-bg)',
    color: 'var(--color-info-text)',
  },
  neutral: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
  },
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}
