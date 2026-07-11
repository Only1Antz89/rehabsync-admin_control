import React from 'react';

export interface CardProps {
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, description, footer, children, className }: CardProps) {
  return (
    <div
      className={`rounded-xl border ${className ?? ''}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {(title ?? description) && (
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-secondary)' }}
        >
          {title && (
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p
              className="text-sm mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div
          className="px-6 py-4 border-t rounded-b-xl"
          style={{
            borderColor: 'var(--border-secondary)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
