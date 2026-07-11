'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ExtendTrialModalProps {
  tenantId: string;
}

export function ExtendTrialModal({ tenantId }: ExtendTrialModalProps) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(14);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConfirm() {
    if (!days || days < 1) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) {
        setError('Failed to extend trial. Please try again.');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
      >
        Extend trial
      </button>

      {open && (
        <div className="rs-dialog-overlay">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div
            className="rs-dialog-panel relative max-w-sm p-6 space-y-4"
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Extend Trial</h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Additional days
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                style={{
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                The trial will be extended by this many days from today.
              </p>
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !days || days < 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {loading ? 'Saving…' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
