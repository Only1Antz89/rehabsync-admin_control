'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EnablePilotModalProps {
  tenantId: string;
  enrolled: boolean;
  currentCohort?: string | null;
}

export function EnablePilotModal({ tenantId, enrolled, currentCohort }: EnablePilotModalProps) {
  const [open, setOpen] = useState(false);
  const [cohort, setCohort] = useState(currentCohort ?? '');
  const [loading, setLoading] = useState<null | 'enroll' | 'remove'>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save(nextEnrolled: boolean) {
    setLoading(nextEnrolled ? 'enroll' : 'remove');
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/pilot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrolled: nextEnrolled, cohort: cohort.trim() || null }),
      });
      if (!res.ok) {
        setError('Failed to update pilot enrolment. Please try again.');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={
          enrolled
            ? { backgroundColor: '#dcfce7', color: '#15803d' }
            : { backgroundColor: '#ede9fe', color: '#6d28d9' }
        }
      >
        {enrolled ? 'Pilot ✓' : 'Enable pilot'}
      </button>

      {open && (
        <div className="rs-dialog-overlay">
          <div className="absolute inset-0" onClick={() => setOpen(false)} />

          <div className="rs-dialog-panel relative max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {enrolled ? 'Manage pilot' : 'Enable pilot'}
            </h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Cohort (optional)
              </label>
              <input
                type="text"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                placeholder="e.g. 2026-Q3 sports clinics"
                className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                style={{
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Enrolling adds this tenant to the pilot programme and sets its lifecycle stage to “pilot”.
              </p>
            </div>

            {error && <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              {enrolled && (
                <button
                  onClick={() => void save(false)}
                  disabled={loading !== null}
                  className="mr-auto px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ color: 'var(--color-error-text)' }}
                >
                  {loading === 'remove' ? 'Removing…' : 'Remove from pilot'}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => void save(true)}
                disabled={loading !== null}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {loading === 'enroll' ? 'Saving…' : enrolled ? 'Update cohort' : 'Enable pilot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
