'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TenantActionsProps {
  tenantId: string;
  currentStatus: string;
}

export function TenantActions({ tenantId, currentStatus }: TenantActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function setStatus(newStatus: string) {
    setLoading(newStatus);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        setError(body?.message ?? body?.error ?? 'Failed to update tenant status. Please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error while updating tenant status. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  function handleTerminate() {
    setShowTerminateConfirm(true);
  }

  const isDisabled = loading !== null;
  const canActivate = currentStatus === 'trial' || currentStatus === 'suspended' || currentStatus === 'past_due';
  const canSuspend = currentStatus === 'active' || currentStatus === 'trial' || currentStatus === 'past_due';
  const canTerminate = currentStatus !== 'cancelled' && currentStatus !== 'provisioning';

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/admin/tenants/${tenantId}`}
        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
      >
        View
      </a>
      <a
        href={`/admin/audit?tenantId=${encodeURIComponent(tenantId)}`}
        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
      >
        Tenant audit
      </a>
      {canActivate && (
        <button
          onClick={() => setStatus('active')}
          disabled={isDisabled}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
        >
          {loading === 'active' ? '...' : 'Activate'}
        </button>
      )}
      {canSuspend && (
        <button
          onClick={() => setStatus('suspended')}
          disabled={isDisabled}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
        >
          {loading === 'suspended' ? '...' : 'Suspend'}
        </button>
      )}
      {canTerminate && (
        <button
          onClick={handleTerminate}
          disabled={isDisabled}
          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
        >
          {loading === 'cancelled' ? '...' : 'Terminate'}
        </button>
      )}
      {showTerminateConfirm && (
        <div className="rs-dialog-overlay">
          <div className="rs-dialog-panel max-w-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Terminate subscription?
                </h2>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  This will cancel the tenant subscription and is not easy to reverse.
                </p>
              </div>
              <button
                type="button"
                className="rs-dialog-close"
                onClick={() => setShowTerminateConfirm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTerminateConfirm(false)}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                Keep active
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTerminateConfirm(false);
                  void setStatus('cancelled');
                }}
                className="rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: '#ffffff', backgroundColor: 'var(--color-error)' }}
                disabled={isDisabled}
              >
                Terminate
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <p className="min-w-full text-xs font-semibold" style={{ color: 'var(--color-error-text)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
