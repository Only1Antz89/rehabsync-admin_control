import React from 'react';
import Link from 'next/link';
import { Badge, Card } from '@rs/ui';
import { adminFetch } from '../../../../lib/admin-api';

interface TenantUsage {
  tenantId: string;
  tenantSlug: string;
  total: number;
}

interface AiMetrics {
  totalQueriesThisMonth: number;
  billingPeriod: string;
  topTenants: TenantUsage[];
  billingSummary?: {
    totalTenants: number;
    aiEnabledTenants: number;
    blockedTenants: number;
    exhaustedTenants: number;
    pastDueTenants: number;
  };
  tenantBilling?: AiBillingTenant[];
}

interface AiBillingTenant {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: string;
  planName: string | null;
  billingEmail: string;
  hasStripeSubscription: boolean;
  currentPeriodEndsAt: string | null;
  aiEnabled: boolean;
  monthlyAllowance: number;
  monthlyUsed: number;
  allowanceRemaining: number;
  purchasedBalance: number;
  availableCredits: number;
  percentUsed: number;
  billingRisk: 'ok' | 'no_plan' | 'ai_disabled' | 'exhausted' | 'past_due' | 'cancelled';
}

function riskVariant(risk: AiBillingTenant['billingRisk']): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (risk === 'ok') return 'success';
  if (risk === 'exhausted' || risk === 'past_due' || risk === 'cancelled') return 'error';
  if (risk === 'no_plan' || risk === 'ai_disabled') return 'warning';
  return 'neutral';
}

function riskLabel(risk: AiBillingTenant['billingRisk']): string {
  switch (risk) {
    case 'ok':
      return 'Ready';
    case 'no_plan':
      return 'No plan';
    case 'ai_disabled':
      return 'AI disabled';
    case 'exhausted':
      return 'Credits exhausted';
    case 'past_due':
      return 'Past due';
    case 'cancelled':
      return 'Inactive';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function AiPage() {
  let metrics: AiMetrics | null = null;

  try {
    const res = await adminFetch('/api/v1/admin/metrics/ai', {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      metrics = (await res.json()) as AiMetrics;
    }
  } catch { /* empty */ }

  const topTenants = metrics?.topTenants ?? [];
  const tenantBilling = metrics?.tenantBilling ?? [];
  const billingSummary = metrics?.billingSummary;
  const total = metrics?.totalQueriesThisMonth ?? 0;
  const maxTenantTotal = topTenants.reduce((m, t) => Math.max(m, t.total), 1);
  const atRiskTenants = tenantBilling.filter((tenant) => tenant.billingRisk !== 'ok');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Consumption</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Platform-wide AI query usage for the current billing period.</p>
      </div>

      {/* Platform total stat */}
      <div className="rounded-xl p-8 flex flex-col items-start gap-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Platform Total This Month</p>
        <p className="text-5xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          {total.toLocaleString('en-GB')}
        </p>
        {metrics?.billingPeriod && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Billing period: {metrics.billingPeriod}</p>
        )}
        <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }}>Usage resets on the 1st of each month</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Customers</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{billingSummary?.totalTenants ?? '—'}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>AI enabled</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{billingSummary?.aiEnabledTenants ?? '—'}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Blocked</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{billingSummary?.blockedTenants ?? '—'}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Exhausted</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{billingSummary?.exhaustedTenants ?? '—'}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
          <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>Past due</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{billingSummary?.pastDueTenants ?? '—'}</p>
        </div>
      </div>

      <Card title="Customer AI Billing Readiness" description="Plan entitlement, monthly usage, and purchased AI credit availability by tenant">
        {tenantBilling.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No customer billing data available.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Billing</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>AI access</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Used</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Available</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Cycle</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
                {tenantBilling.map((tenant) => (
                  <tr key={tenant.tenantId}>
                    <td className="px-6 py-3">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{tenant.tenantName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tenant.tenantSlug} · {tenant.billingEmail}</p>
                    </td>
                    <td className="px-6 py-3">
                      <p style={{ color: 'var(--text-secondary)' }}>{tenant.planName ?? 'No plan'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {tenant.hasStripeSubscription ? 'Stripe subscription linked' : 'No Stripe subscription'}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={riskVariant(tenant.billingRisk)}>{riskLabel(tenant.billingRisk)}</Badge>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {tenant.monthlyUsed.toLocaleString('en-GB')} / {tenant.monthlyAllowance.toLocaleString('en-GB')}
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tenant.percentUsed}% monthly allowance</p>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {tenant.availableCredits.toLocaleString('en-GB')}
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {tenant.purchasedBalance.toLocaleString('en-GB')} purchased
                      </p>
                    </td>
                    <td className="px-6 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(tenant.currentPeriodEndsAt)}
                      <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{tenant.status.replace('_', ' ')}</p>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/tenants/${tenant.tenantId}`} className="text-xs text-blue-600 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {atRiskTenants.length > 0 && (
        <Card title="Customers Needing AI Billing Review" description="Tenants whose plan, billing status, or credit balance can block AI">
          <div className="space-y-2">
            {atRiskTenants.slice(0, 8).map((tenant) => (
              <div key={tenant.tenantId} className="flex items-center justify-between gap-4 py-2" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{tenant.tenantName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {tenant.planName ?? 'No plan'} · {tenant.availableCredits.toLocaleString('en-GB')} credits available
                  </p>
                </div>
                <Badge variant={riskVariant(tenant.billingRisk)}>{riskLabel(tenant.billingRisk)}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top 10 tenants table */}
      <Card title="Top Tenants by AI Usage" description="Top 10 tenants ranked by queries this billing period">
        {topTenants.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No AI usage data available.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    #
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Tenant
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Queries
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    % of Total
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Distribution
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
                {topTenants.slice(0, 10).map((t, idx) => {
                  const pct = total > 0 ? ((t.total / total) * 100).toFixed(1) : '0.0';
                  const barWidth = Math.round((t.total / maxTenantTotal) * 100);
                  return (
                    <tr key={t.tenantId} className="transition-colors">
                      <td className="px-6 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{t.tenantSlug}</td>
                      <td className="px-6 py-3 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {t.total.toLocaleString('en-GB')}
                      </td>
                      <td className="px-6 py-3 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct}%</td>
                      <td className="px-6 py-3 w-40">
                        <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${barWidth}%`, backgroundColor: 'var(--brand-primary)' }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/admin/tenants/${t.tenantId}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
