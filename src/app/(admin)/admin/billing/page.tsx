import React from 'react';
import Link from 'next/link';
import { Card, Badge } from '@rs/ui';
import { adminFetch } from '../../../../lib/admin-api';
import { BillingTenantsTable, type BillingTenant } from './BillingTenantsTable';

export const dynamic = 'force-dynamic';

interface MrrMetrics {
  mrrPence: number;
  activeCount: number;
  trialCount: number;
  trialConverting: number;
  churnedLast30: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  planName: string | null;
  priceMonthly: number | null;
  status: string;
  stripeCustomerId: string | null;
}

interface AuditEntry {
  id: string;
  tenantId: string | null;
  actorType: string | null;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: unknown;
  createdAt: string;
}

interface AuditPage {
  items: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

function formatMrr(pence: number): string {
  const pounds = pence / 100;
  return `£${pounds.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function actionVariant(action: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (action.includes('cancel') || action.includes('churn')) return 'error';
  if (action.includes('upgrade') || action.includes('subscribe')) return 'success';
  if (action.includes('trial')) return 'warning';
  return 'neutral';
}

function formatActor(entry: AuditEntry): string {
  const actorType = entry.actorType ?? 'system';
  const actorId = entry.actorId ? entry.actorId.slice(0, 12) : 'unknown';
  return `${actorType}:${actorId}`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tint?: 'red' | 'green' | 'amber';
}

function StatCard({ label, value, sub, tint }: StatCardProps) {
  const tintStyle: React.CSSProperties =
    tint === 'red'
      ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' }
      : tint === 'green'
      ? { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }
      : tint === 'amber'
      ? { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
      : { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' };

  return (
    <div
      className="rounded-xl border p-6"
      style={tintStyle}
    >
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  );
}

export default async function BillingPage() {
  let metrics: MrrMetrics | null = null;
  let tenants: Tenant[] = [];
  let auditItems: AuditEntry[] = [];

  const [metricsRes, tenantsRes, auditRes] = await Promise.allSettled([
    adminFetch('/api/v1/admin/metrics/mrr', {
      next: { revalidate: 60 },
    }),
    adminFetch('/api/v1/admin/tenants', {
      next: { revalidate: 60 },
    }),
    adminFetch('/api/v1/admin/audit-log?limit=5', {
      next: { revalidate: 60 },
    }),
  ]);

  if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
    try {
      metrics = (await metricsRes.value.json()) as MrrMetrics;
    } catch {
      /* ignore malformed response */
    }
  }

  if (tenantsRes.status === 'fulfilled' && tenantsRes.value.ok) {
    try {
      const data = (await tenantsRes.value.json()) as
        | { tenants?: Tenant[]; items?: Tenant[]; data?: Tenant[] }
        | Tenant[];
      if (Array.isArray(data)) {
        tenants = data;
      } else {
        tenants = data.tenants ?? data.items ?? data.data ?? [];
      }
    } catch {
      /* ignore malformed response */
    }
  }

  if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
    try {
      const data = (await auditRes.value.json()) as AuditPage | AuditEntry[];
      if (Array.isArray(data)) {
        auditItems = data;
      } else {
        auditItems = data.items ?? [];
      }
    } catch {
      /* ignore malformed response */
    }
  }

  // Plan breakdown from tenant list — grouped by the tenant's actual plan name, with revenue.
  const planGroups = new Map<string, { count: number; mrrPence: number }>();
  for (const t of tenants) {
    const name = t.planName ?? 'No plan';
    const group = planGroups.get(name) ?? { count: 0, mrrPence: 0 };
    group.count += 1;
    group.mrrPence += t.priceMonthly ?? 0;
    planGroups.set(name, group);
  }
  const planRows = Array.from(planGroups.entries()).sort((a, b) => b[1].mrrPence - a[1].mrrPence || b[1].count - a[1].count);
  const maxPlanCount = Math.max(...planRows.map(([, g]) => g.count), 1);
  const planColor = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('enterprise')) return '#0f766e';
    if (n.includes('professional') || n.includes('pro')) return '#0d9488';
    if (n.includes('starter') || n.includes('basic')) return '#60a5fa';
    return 'var(--text-muted)';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Billing Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Platform-wide subscription and revenue metrics.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={metrics ? formatMrr(metrics.mrrPence) : '—'}
          tint="green"
        />
        <StatCard
          label="Active Subscriptions"
          value={metrics?.activeCount ?? '—'}
        />
        <StatCard
          label="Trials"
          value={metrics?.trialCount ?? '—'}
          sub={
            metrics && metrics.trialConverting != null
              ? `→ ${metrics.trialConverting} converting`
              : undefined
          }
          tint="amber"
        />
        <StatCard
          label="Churned (30d)"
          value={metrics?.churnedLast30 ?? '—'}
          tint={metrics && metrics.churnedLast30 > 0 ? 'red' : undefined}
        />
      </div>

      {/* MRR Breakdown */}
      <Card title="MRR Breakdown by Plan">
        {planRows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tenant data available.</p>
        ) : (
          <div className="space-y-3">
            {planRows.map(([name, group]) => {
              const widthPct = Math.round((group.count / maxPlanCount) * 100);
              return (
                <div key={name} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium shrink-0 truncate" style={{ color: 'var(--text-secondary)' }} title={name}>
                    {name}
                  </span>
                  <div className="flex-1 rounded-full h-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div
                      className="h-4 rounded-full transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: planColor(name) }}
                    />
                  </div>
                  <span className="w-24 text-sm text-right shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {group.mrrPence > 0 ? formatMrr(group.mrrPence) : '—'}
                  </span>
                  <span className="w-8 text-sm text-right shrink-0 font-medium" style={{ color: 'var(--text-primary)' }}>{group.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Tenant directory — searchable, plan-identified, with invoice creation */}
      <Card title="Tenants" description="Search, identify by plan, and raise invoices.">
        {tenants.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tenant data available.</p>
        ) : (
          <BillingTenantsTable tenants={tenants as BillingTenant[]} />
        )}
      </Card>

      {/* Recent billing activity */}
      <Card title="Recent Billing Activity" description="Last 5 billing-related audit events">
        {auditItems.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent billing activity.</p>
        ) : (
          <div className="space-y-2">
            {auditItems.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 py-2 last:border-0"
                style={{ borderBottom: '1px solid var(--border-secondary)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                    {entry.tenantId && (
                      <Link
                        href={`/admin/tenants/${entry.tenantId}`}
                        className="text-xs text-blue-600 hover:underline truncate"
                      >
                        {entry.tenantId.slice(0, 8)}…
                      </Link>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {formatActor(entry)}
                  </p>
                </div>
                <span className="text-xs shrink-0 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
