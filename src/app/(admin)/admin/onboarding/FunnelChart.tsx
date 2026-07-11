'use client';

import React from 'react';

export interface FunnelStep {
  step: number;
  count: number;
  label: string;
}

interface FunnelChartProps {
  steps: FunnelStep[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  if (steps.length === 0) {
    return <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>No funnel data available.</p>;
  }

  const topCount = steps[0]?.count ?? 1;

  return (
    <div className="space-y-3 py-2">
      {steps.map((step, idx) => {
        const pct = topCount > 0 ? Math.round((step.count / topCount) * 100) : 0;
        const prevCount = idx > 0 ? (steps[idx - 1]?.count ?? step.count) : step.count;
        const dropOff = idx > 0 ? prevCount - step.count : 0;
        const dropOffPct = prevCount > 0 ? Math.round((dropOff / prevCount) * 100) : 0;

        // Funnel shape: narrowing bars
        const marginPct = Math.round(((100 - pct) / 2));

        return (
          <div key={step.step}>
            {/* Drop-off indicator */}
            {idx > 0 && dropOff > 0 && (
              <div className="flex items-center justify-center mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--color-error-text)' }}>
                  ↓ -{dropOff} ({dropOffPct}% drop-off)
                </span>
              </div>
            )}
            {/* Funnel bar */}
            <div
              className="transition-all"
              style={{ marginLeft: `${marginPct}%`, marginRight: `${marginPct}%` }}
            >
              <div className="rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    backgroundColor:
                      idx === 0
                        ? '#4f46e5'
                        : idx === 1
                        ? '#0d9488'
                        : idx === 2
                        ? '#14b8a6'
                        : '#67e8f9',
                  }}
                >
                  <span className="text-white font-medium text-sm truncate">
                    Step {step.step}: {step.label}
                  </span>
                  <span className="text-white font-bold text-sm ml-4 shrink-0">
                    {step.count.toLocaleString('en-GB')}
                    <span className="font-normal text-teal-100 ml-1 text-xs">
                      ({pct}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
