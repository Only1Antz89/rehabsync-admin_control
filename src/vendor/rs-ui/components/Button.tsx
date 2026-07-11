import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  className,
  style,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const sizes: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--brand-primary)',
      color: 'var(--brand-on-primary, var(--text-inverse))',
    },
    secondary: {
      backgroundColor: 'transparent',
      border: '1px solid var(--border-primary)',
      color: 'var(--text-primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
    },
    danger: {
      backgroundColor: 'var(--color-error)',
      color: '#fff',
    },
  };

  const mergedStyle: React.CSSProperties = {
    ...variantStyles[variant],
    '--tw-ring-color': 'var(--brand-primary)',
    ...style,
  } as React.CSSProperties;

  return (
    <button
      {...props}
      disabled={disabled ?? loading}
      style={mergedStyle}
      className={`${base} ${sizes[size]} ${(disabled ?? loading) ? 'opacity-60 cursor-not-allowed' : ''} ${className ?? ''}`}
      onMouseEnter={(e) => {
        if (variant === 'ghost') {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (variant === 'ghost') {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
        }
        props.onMouseLeave?.(e);
      }}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
