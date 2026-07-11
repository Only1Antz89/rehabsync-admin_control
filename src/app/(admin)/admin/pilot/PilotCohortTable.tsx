import React from 'react';
import Link from 'next/link';
import { Badge } from '@rs/ui';
import type { BadgeVariant } from '@rs/ui';

export interface PilotTenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  cohort: string | null;
  lifecycleStage: string;
  planName: string | null;
  aiUsed: number;
  aiAllowance: number;
  enabledFeatureCount: number;
  totalFeatureCount: number;
  startedAt: string | null;
  notes: string | null;
}

function lifecycleBadgeVariant(stage: string): BadgeVariant {
  switch (stage) {
    case 'active':
      return 'success';
    case 'pilot':
      return 'info';
    case 'onboarding':
      return 'warning';
    case 'churned':
      return 'error';
    default:
      return 'neutral';
  }
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function UsageBar({ used, allowance }: { used: number; allowance: number }) {
  const pct = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0;
  const color = pct >= 90 ? '#dc2626' : pct >= 70 ? '#f59e0b' : '#14b8a6';
  return (
    <div className="min-w-[140px]">
      <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>
          {formatNumber(used)} / {formatNumber(allowance)}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function PilotCohortTable({ rows }: { rows: PilotTenantRow[] }) {
  // Group by cohort; null/empty cohort falls into "Unassigned".
  const groups = new Map<string, PilotTenantRow[]>();
  for (const row of rows) {
    const key = row.cohort && row.cohort.trim() !== '' ? row.cohort : 'Unassigned';
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const cohortNames = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8">
      {cohortNames.map((cohort) => {
        const cohortRows = groups.get(cohort) ?? [];
        return (
          <div
            key={cohort}
            className="overflow-hidden rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-secondary)' }}
            >
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {cohort}
              </h2>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {cohortRows.length} {cohortRows.length === 1 ? 'tenant' : 'tenants'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-secondary)',
                  }}
                >
                  <tr>
                    <Th>Tenant</Th>
                    <Th>Lifecycle</Th>
                    <Th>Plan</Th>
                    <Th>AI usage</Th>
                    <Th>Features</Th>
                    <Th>Since</Th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
                  {cohortRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/tenants/${row.id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {row.name}
                        </Link>
                        <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          {row.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={lifecycleBadgeVariant(row.lifecycleStage)}>{row.lifecycleStage}</Badge>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {row.planName ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <UsageBar used={row.aiUsed} allowance={row.aiAllowance} />
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {row.enabledFeatureCount} / {row.totalFeatureCount}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(row.startedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide first:px-6"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </th>
  );
}
