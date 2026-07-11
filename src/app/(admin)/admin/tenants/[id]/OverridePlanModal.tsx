'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
}

interface OverridePlanModalProps {
  tenantId: string;
  currentPlanId?: string | null;
  plans?: Plan[];
}

export function OverridePlanModal({
  tenantId,
  currentPlanId,
  plans = [],
}: OverridePlanModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleConfirm() {
    if (!selectedPlanId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId }),
      });
      if (!res.ok) {
        setError('Failed to override plan. Please try again.');
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
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
      >
        Override plan
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
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Override Plan</h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Select new plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                style={{
                  border: '1px solid var(--border-primary)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">— select a plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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
                disabled={loading || !selectedPlanId}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {loading ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
