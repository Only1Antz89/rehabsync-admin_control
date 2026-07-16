'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Card } from '@rs/ui';
import type { BadgeVariant } from '@rs/ui';

type DunningStage = 'current' | 'past_due' | 'grace' | 'suspended';

interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amountDuePence: number;
  amountPaidPence: number;
  currency: string;
  createdAt: string | null;
  dueDate: string | null;
  hostedInvoiceUrl: string | null;
}
interface Billing {
  configured: boolean;
  tenantStatus: string;
  subscriptionStatus: string | null;
  dunning: { stage: DunningStage; daysPastDue: number; graceEndsAt: string | null };
  invoices: Invoice[];
}

const STAGE_VARIANT: Record<DunningStage, BadgeVariant> = {
  current: 'success',
  past_due: 'warning',
  grace: 'warning',
  suspended: 'error',
};
const STAGE_LABEL: Record<DunningStage, string> = {
  current: 'Current',
  past_due: 'Past due',
  grace: 'In grace period',
  suspended: 'Suspended',
};

function money(pence: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(pence / 100);
}

export function TenantBillingPanel({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'retry' | 'portal' | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/tenants/${tenantId}/billing`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d: Billing) => setData(d))
      .catch(() => setError('Could not load billing.'));
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  async function retry() {
    setBusy('retry');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing/retry`, { method: 'POST' });
      const d = (await res.json().catch(() => null)) as { status?: string; error?: string } | null;
      if (!res.ok) setError(d?.error ?? 'Retry failed.');
      else setNotice(`Retry submitted — invoice is now ${d?.status ?? 'processing'}.`);
      load();
    } finally {
      setBusy(null);
    }
  }

  async function portal() {
    setBusy('portal');
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const d = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !d?.url) setError(d?.error ?? 'Could not open the billing portal.');
      else window.open(d.url, '_blank', 'noopener,noreferrer');
    } finally {
      setBusy(null);
    }
  }

  if (!data && !error) return null;

  const dunning = data?.dunning;
  const canAct = data?.configured;

  return (
    <Card title="Billing & dunning" description="Live subscription status and invoices from Stripe.">
      {error && <p className="text-sm" style={{ color: 'var(--color-error-text, #b91c1c)' }}>{error}</p>}
      {notice && <p className="text-sm" style={{ color: 'var(--color-success-text, #0f766e)' }}>{notice}</p>}

      {dunning && (
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <Badge variant={STAGE_VARIANT[dunning.stage]}>{STAGE_LABEL[dunning.stage]}</Badge>
          {data?.subscriptionStatus && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>subscription: {data.subscriptionStatus}</span>
          )}
          {dunning.daysPastDue > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{dunning.daysPastDue} days past due</span>
          )}
          {dunning.graceEndsAt && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              grace ends {new Date(dunning.graceEndsAt).toLocaleDateString('en-GB')}
            </span>
          )}
        </div>
      )}

      {!data?.configured && (
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Stripe isn’t connected — showing the tenant’s stored status ({data?.tenantStatus}). Retry and portal need Stripe.
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <button
          type="button"
          disabled={!canAct || busy !== null}
          onClick={retry}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary, #0d9488)' }}
        >
          {busy === 'retry' ? 'Retrying…' : 'Retry latest invoice'}
        </button>
        <button
          type="button"
          disabled={!canAct || busy !== null}
          onClick={portal}
          className="rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
        >
          {busy === 'portal' ? 'Opening…' : 'Open customer portal'}
        </button>
      </div>

      {data && data.invoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <th className="py-2 pr-3">Invoice</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} className="border-t" style={{ borderColor: 'var(--border-secondary, #f1f5f9)' }}>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.number ?? inv.id.slice(0, 12)}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-secondary)' }}>{inv.status}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-primary)' }}>{money(inv.amountDuePence, inv.currency)}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-secondary)' }}>
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="py-2">
                    {inv.hostedInvoiceUrl && (
                      <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: 'var(--brand-primary, #0d9488)' }}>
                        View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        data?.configured && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No invoices yet.</p>
      )}
    </Card>
  );
}
