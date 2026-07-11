import React from 'react';
import Link from 'next/link';
import { Badge } from '@rs/ui';
import { adminFetch } from '../../../lib/admin-api';
import { KinetixPanel } from './KinetixPanel';

interface OverviewMetrics {
  totalTenants: number;
  mrrPence: number;
  activeCount: number;
  activeTrials: number;
  aiQueriesThisMonth: number;
  platformHealth: 'ok' | 'degraded';
  alerts: {
    expiringTrials: { id: string; name: string; slug: string; trialEndsAt: string }[];
    pastDueAccounts: { id: string; name: string; slug: string }[];
    highAiUsage: { tenantId: string; tenantSlug: string; usage: number; limit: number }[];
    aiBillingRisks?: {
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
      planName: string | null;
      availableCredits: number;
      billingRisk: 'ok' | 'no_plan' | 'ai_disabled' | 'exhausted' | 'past_due' | 'cancelled';
    }[];
  };
  recentActivity: {
    id: string;
    tenantId: string | null;
    actorType: string;
    action: string;
    resourceType: string | null;
    createdAt: string;
    metadata: unknown;
  }[];
  statusDistribution: { status: string; count: number }[];
  support?: {
    openTickets: number;
    slaBreaches: number;
    openIncidents: number;
    pendingTenantReplies: number;
  };
  storage?: {
    usedBytes: number;
    limitBytes: number | null;
    percentUsed: number;
    topTenants: {
      tenantId: string;
      tenantName: string;
      tenantSlug: string;
      planName: string | null;
      usedBytes: number;
      limitGb: number;
      percentUsed: number;
    }[];
  };
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'Unlimited';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toLocaleString('en-GB', {
      maximumFractionDigits: 1,
    })} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString('en-GB', {
      maximumFractionDigits: 0,
    })} MB`;
  }
  return `${bytes.toLocaleString('en-GB')} B`;
}

function actionVariant(action: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (action.includes('delete') || action.includes('cancel') || action.includes('churn'))
    return 'error';
  if (action.includes('create') || action.includes('subscribe')) return 'success';
  if (action.includes('trial') || action.includes('update')) return 'warning';
  return 'neutral';
}

function aiBillingRiskLabel(
  risk: NonNullable<OverviewMetrics['alerts']['aiBillingRisks']>[number]['billingRisk'],
): string {
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

function aiBillingRiskVariant(
  risk: NonNullable<OverviewMetrics['alerts']['aiBillingRisks']>[number]['billingRisk'],
): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (risk === 'ok') return 'success';
  if (risk === 'exhausted' || risk === 'past_due' || risk === 'cancelled') return 'error';
  if (risk === 'no_plan' || risk === 'ai_disabled') return 'warning';
  return 'neutral';
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tint?: 'red' | 'green' | 'amber' | 'blue';
}

function StatCard({ label, value, sub, tint }: StatCardProps) {
  const tintStyle: React.CSSProperties | undefined =
    tint === 'red'
      ? {
          backgroundColor: 'var(--color-error-bg)',
          borderColor: 'color-mix(in srgb, var(--color-error) 30%, var(--border-primary))',
        }
      : tint === 'green'
        ? {
            backgroundColor: 'var(--color-success-bg)',
            borderColor: 'color-mix(in srgb, var(--color-success) 30%, var(--border-primary))',
          }
        : tint === 'amber'
          ? {
              backgroundColor: 'var(--color-warning-bg)',
              borderColor: 'color-mix(in srgb, var(--color-warning) 30%, var(--border-primary))',
            }
          : tint === 'blue'
            ? {
                backgroundColor: 'color-mix(in srgb, var(--brand-primary) 10%, var(--bg-card))',
                borderColor: 'color-mix(in srgb, var(--brand-primary) 35%, var(--border-primary))',
              }
            : undefined;

  return (
    <div className="rs-panel" style={tintStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <p className="rs-muted">{sub}</p>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  trial: '#d97706',
  past_due: '#dc2626',
  suspended: '#6b7280',
  cancelled: '#991b1b',
  provisioning: '#2563eb',
};

export default async function DashboardOverviewPage() {
  let data: OverviewMetrics | null = null;
  let loadError: string | null = null;

  try {
    const res = await adminFetch('/api/v1/admin/metrics/overview', {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      data = (await res.json()) as OverviewMetrics;
    } else {
      loadError = `Admin API returned ${res.status}. Check platform API deployment and admin auth configuration.`;
    }
  } catch {
    loadError = 'Admin API is unavailable. Check REHABSYNC_API_URL and backend health.';
  }

  const hasAlerts =
    data &&
    (data.alerts.expiringTrials.length > 0 ||
      data.alerts.pastDueAccounts.length > 0 ||
      data.alerts.highAiUsage.length > 0 ||
      (data.alerts.aiBillingRisks?.length ?? 0) > 0);

  const maxStatusCount = data ? Math.max(...data.statusDistribution.map((s) => s.count), 1) : 1;
  const totalAlertCount = data
    ? data.alerts.expiringTrials.length +
      data.alerts.pastDueAccounts.length +
      data.alerts.highAiUsage.length +
      (data.alerts.aiBillingRisks?.length ?? 0)
    : 0;

  return (
    <div className="rs-dashboard rs-dashboard--admin rs-dashboard--superadmin">
      <section className="rs-panel rs-admin-hero">
        <div>
          <p className="rs-kicker">Platform console</p>
          <h1>Superadmin Dashboard</h1>
          <p className="rs-muted">
            Platform overview, tenant health, billing signals, and operational alerts.
          </p>
        </div>
        <div className="rs-hero-cards">
          <div>
            <span>Role</span>
            <strong>Super Admin</strong>
          </div>
          <div>
            <span>Health</span>
            <strong>
              {data ? (data.platformHealth === 'ok' ? 'Healthy' : 'Degraded') : 'Unavailable'}
            </strong>
          </div>
          <div>
            <span>Alert queue</span>
            <strong>{totalAlertCount}</strong>
          </div>
        </div>
        {data && (
          <Badge variant={data.platformHealth === 'ok' ? 'success' : 'error'}>
            System {data.platformHealth === 'ok' ? 'Healthy' : 'Degraded'}
          </Badge>
        )}
      </section>

      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {loadError}{' '}
          <Link href="/admin/login" className="font-semibold text-amber-900 underline">
            Sign in to platform admin
          </Link>
        </div>
      )}

      <section className="rs-admin-stats">
        <StatCard
          label="Total Tenants"
          value={data?.totalTenants ?? '---'}
          sub={data ? `${data.activeCount} active` : undefined}
        />
        <StatCard label="MRR" value={data ? formatMrr(data.mrrPence) : '---'} tint="green" />
        <StatCard label="Active Trials" value={data?.activeTrials ?? '---'} tint="amber" />
        <StatCard
          label="AI Queries (this month)"
          value={data?.aiQueriesThisMonth?.toLocaleString('en-GB') ?? '---'}
          tint="blue"
        />
        <StatCard
          label="Storage Used"
          value={data?.storage ? formatBytes(data.storage.usedBytes) : '---'}
          sub={data?.storage?.limitBytes ? `${data.storage.percentUsed}% of plan capacity` : 'Across tenant media and records'}
          tint="blue"
        />
      </section>

      <section className="rs-admin-stats">
        <StatCard
          label="Open Support Tickets"
          value={data?.support?.openTickets ?? '---'}
          sub="New, open, and pending"
          tint="blue"
        />
        <StatCard
          label="SLA Breaches"
          value={data?.support?.slaBreaches ?? '---'}
          sub="Require immediate review"
          tint="red"
        />
        <StatCard
          label="Open Incidents"
          value={data?.support?.openIncidents ?? '---'}
          sub="Incident-type tickets"
          tint="amber"
        />
        <StatCard
          label="Pending Replies"
          value={data?.support?.pendingTenantReplies ?? '---'}
          sub="Waiting on tenant/customer"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.85fr)]">
        <div className="space-y-6">
          <KinetixPanel />

          <section className="rs-panel">
            <div className="rs-panel-head">
              <div>
                <p className="rs-kicker">Tenants</p>
                <h2>Subscription Distribution</h2>
                <p className="rs-muted">Current tenant status spread across the platform.</p>
              </div>
              <span className="rs-chip">{data?.totalTenants ?? 0} tenants</span>
            </div>
            {!data || data.statusDistribution.length === 0 ? (
              <p className="rs-muted">No data available.</p>
            ) : (
              <div className="space-y-3">
                {data.statusDistribution.map((s) => {
                  const widthPct = Math.round((s.count / maxStatusCount) * 100);
                  return (
                    <div key={s.status} className="flex items-center gap-4">
                      <span
                        className="w-24 shrink-0 text-sm font-medium capitalize"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {s.status.replace('_', ' ')}
                      </span>
                      <div
                        className="h-3 flex-1 overflow-hidden rounded-full"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor: STATUS_COLORS[s.status] ?? 'var(--text-muted)',
                          }}
                        />
                      </div>
                      <span
                        className="w-8 shrink-0 text-right text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {s.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rs-panel">
            <div className="rs-panel-head">
              <div>
                <p className="rs-kicker">Storage</p>
                <h2>Tenant Storage Usage</h2>
                <p className="rs-muted">Resources, client files, temporary audio, records, media, and messages.</p>
              </div>
              <span className="rs-chip">
                {data?.storage ? `${data.storage.percentUsed}% used` : 'No data'}
              </span>
            </div>
            {!data?.storage ? (
              <p className="rs-muted">No storage data available.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {formatBytes(data.storage.usedBytes)} used
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {formatBytes(data.storage.limitBytes)} capacity
                    </span>
                  </div>
                  <div
                    className="mt-2 h-3 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, data.storage.percentUsed)}%`,
                        backgroundColor: 'var(--brand-primary)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {data.storage.topTenants.length === 0 ? (
                    <p className="rs-muted">No tenant storage usage yet.</p>
                  ) : (
                    data.storage.topTenants.map((tenant) => (
                      <div
                        key={tenant.tenantId}
                        className="flex items-center justify-between gap-4 py-2"
                        style={{ borderBottom: '1px solid var(--border-secondary)' }}
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/admin/tenants/${tenant.tenantId}`}
                            className="text-sm font-semibold text-blue-600 hover:underline"
                          >
                            {tenant.tenantName}
                          </Link>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {tenant.planName ?? 'No plan'} · {tenant.tenantSlug}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {formatBytes(tenant.usedBytes)}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {tenant.limitGb >= 9999 ? 'Unlimited' : `${tenant.percentUsed}% of ${tenant.limitGb} GB`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rs-panel">
            <div className="rs-panel-head">
              <div>
                <p className="rs-kicker">Operations</p>
                <h2>Alerts</h2>
                <p className="rs-muted">Trials, billing, and usage items that need review.</p>
              </div>
              <span className="rs-chip">{totalAlertCount} items</span>
            </div>
            {!hasAlerts && <p className="rs-muted">No active alerts.</p>}
            {hasAlerts && (
              <div className="space-y-4">
                {data!.alerts.expiringTrials.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: '#d97706' }}>
                      Trials Expiring (next 7 days)
                    </h4>
                    <div className="space-y-1">
                      {data!.alerts.expiringTrials.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-sm">
                          <Link
                            href={`/admin/tenants/${t.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {t.name}
                          </Link>
                          <span style={{ color: 'var(--text-muted)' }}>
                            expires {formatDate(t.trialEndsAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data!.alerts.pastDueAccounts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: '#dc2626' }}>
                      Past-Due Accounts
                    </h4>
                    <div className="space-y-1">
                      {data!.alerts.pastDueAccounts.map((t) => (
                        <div key={t.id} className="text-sm">
                          <Link
                            href={`/admin/tenants/${t.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {t.name}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data!.alerts.highAiUsage.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: '#2563eb' }}>
                      High AI Usage (&gt;80% of limit)
                    </h4>
                    <div className="space-y-1">
                      {data!.alerts.highAiUsage.map((t) => (
                        <div key={t.tenantId} className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--text-primary)' }}>{t.tenantSlug}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {t.usage.toLocaleString()} / {t.limit.toLocaleString()} queries
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(data!.alerts.aiBillingRisks?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: '#dc2626' }}>
                      AI Billing Access Risks
                    </h4>
                    <div className="space-y-2">
                      {data!.alerts.aiBillingRisks!.map((tenant) => (
                        <div
                          key={tenant.tenantId}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <div>
                            <Link
                              href={`/admin/tenants/${tenant.tenantId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {tenant.tenantName}
                            </Link>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {tenant.planName ?? 'No plan'} ·{' '}
                              {tenant.availableCredits.toLocaleString('en-GB')} credits available
                            </p>
                          </div>
                          <Badge variant={aiBillingRiskVariant(tenant.billingRisk)}>
                            {aiBillingRiskLabel(tenant.billingRisk)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rs-panel">
            <div className="rs-panel-head">
              <div>
                <p className="rs-kicker">Audit feed</p>
                <h2>Recent Activity</h2>
                <p className="rs-muted">Latest platform events and admin actions.</p>
              </div>
            </div>
            {!data || data.recentActivity.length === 0 ? (
              <p className="rs-muted">No recent activity.</p>
            ) : (
              <div className="space-y-2">
                {data.recentActivity.map((entry) => (
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
                            {entry.tenantId.slice(0, 8)}...
                          </Link>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-xs shrink-0 whitespace-nowrap"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
