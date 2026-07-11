'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@rs/ui';
import { FileText, Search, ExternalLink, Loader2, X } from 'lucide-react';

export interface BillingTenant {
  id: string;
  name: string;
  slug: string;
  planName: string | null;
  priceMonthly: number | null;
  status: string;
  stripeCustomerId: string | null;
}

function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'trial') return 'info';
  if (status === 'past_due') return 'warning';
  if (status === 'suspended' || status === 'cancelled') return 'error';
  return 'neutral';
}

interface InvoiceResult {
  number: string | null;
  status: string | null;
  hostedInvoiceUrl: string | null;
  amountDue: number;
}

export function BillingTenantsTable({ tenants }: { tenants: BillingTenant[] }) {
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [invoiceFor, setInvoiceFor] = useState<BillingTenant | null>(null);

  const plans = useMemo(() => {
    const set = new Set<string>();
    tenants.forEach((t) => set.add(t.planName ?? 'No plan'));
    return Array.from(set).sort();
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((t) => {
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.planName ?? '').toLowerCase().includes(q);
      const matchesPlan = planFilter === 'all' || (t.planName ?? 'No plan') === planFilter;
      return matchesQuery && matchesPlan;
    });
  }, [tenants, query, planFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenants by name, slug, or plan…"
            className="w-full rounded-lg py-2 pl-9 pr-3 text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
          />
        </label>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
        >
          <option value="all">All plans</option>
          {plans.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} of {tenants.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tenant</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Plan</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>MRR</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No tenants match your search.</td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                      {t.name}
                    </Link>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{t.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    {t.planName ? (
                      <Badge variant="info">{t.planName}</Badge>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No plan</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                    {t.priceMonthly != null ? `${formatPence(t.priceMonthly)}/mo` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setInvoiceFor(t)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                      style={{ border: '1px solid var(--border-primary)', color: 'var(--brand-primary)' }}
                    >
                      <FileText className="h-3.5 w-3.5" /> Create invoice
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {invoiceFor && <CreateInvoiceModal tenant={invoiceFor} onClose={() => setInvoiceFor(null)} />}
    </div>
  );
}

function CreateInvoiceModal({ tenant, onClose }: { tenant: BillingTenant; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [daysUntilDue, setDaysUntilDue] = useState('14');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InvoiceResult | null>(null);

  async function submit() {
    const pounds = Number(amount);
    if (!Number.isFinite(pounds) || pounds <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setError('Enter a description for the invoice.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPence: Math.round(pounds * 100),
          description: description.trim(),
          daysUntilDue: Math.max(1, Math.round(Number(daysUntilDue) || 14)),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as InvoiceResult & { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? data.message ?? `Failed to create invoice (${res.status}).`);
        return;
      }
      setResult(data);
    } catch {
      setError('Network error creating the invoice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rs-dialog-overlay" onClick={onClose}>
      <div className="rs-dialog-panel relative max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Create invoice</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tenant.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 text-sm" style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'color-mix(in srgb, var(--color-success-text) 30%, transparent)', color: 'var(--color-success-text)' }}>
              Invoice {result.number ? `#${result.number} ` : ''}created ({result.status}).
            </div>
            {result.hostedInvoiceUrl && (
              <a href={result.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
                <ExternalLink className="h-4 w-4" /> View hosted invoice
              </a>
            )}
            <div className="flex justify-end pt-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>Done</button>
            </div>
          </div>
        ) : (
          <>
            {!tenant.stripeCustomerId && (
              <p className="rounded-lg border px-3 py-2 text-xs" style={{ backgroundColor: 'var(--color-warning-bg)', borderColor: 'color-mix(in srgb, var(--color-warning-text) 30%, transparent)', color: 'var(--color-warning-text)' }}>
                This tenant has no Stripe customer yet — one will be created automatically.
              </p>
            )}
            <label className="block space-y-1">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Amount (GBP)</span>
              <input
                type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description</span>
              <input
                type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Implementation services — June"
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Days until due</span>
              <input
                type="number" min={1} max={180} value={daysUntilDue} onChange={(e) => setDaysUntilDue(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
              />
            </label>

            {error && <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
              <button
                onClick={() => void submit()} disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? 'Creating…' : 'Create & send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
