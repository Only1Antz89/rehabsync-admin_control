import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, style, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`block w-full rounded-lg border px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-offset-0
          ${className ?? ''}`}
        style={{
          backgroundColor: 'var(--bg-input)',
          borderColor: error ? 'var(--color-error-text)' : 'var(--border-primary)',
          color: 'var(--text-primary)',
          '--tw-ring-color': error ? 'var(--color-error-bg)' : 'var(--brand-primary)',
          ...style,
        } as React.CSSProperties}
      />
      {hint && !error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--color-error-text)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
