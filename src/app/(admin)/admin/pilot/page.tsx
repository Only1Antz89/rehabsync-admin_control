import React from 'react';
import { PilotCohortTable } from './PilotCohortTable';
import type { PilotTenantRow } from './PilotCohortTable';
import { adminFetch } from '../../../../lib/admin-api';

async function fetchPilotTenants(): Promise<PilotTenantRow[]> {
  try {
    const res = await adminFetch('/api/v1/admin/pilot', { next: { revalidate: 0 } });
    if (res.ok) {
      const data = (await res.json()) as PilotTenantRow[] | { data?: PilotTenantRow[] };
      return Array.isArray(data) ? data : (data.data ?? []);
    }
  } catch {
    // API unavailable
  }
  return [];
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(n);
}

export default async function PilotProgrammePage() {
  const rows = await fetchPilotTenants();

  const total = rows.length;
  const cohorts = new Set(rows.map((r) => r.cohort).filter(Boolean)).size;
  const aiUsed = rows.reduce((sum, r) => sum + r.aiUsed, 0);
  const aiAllowance = rows.reduce((sum, r) => sum + r.aiAllowance, 0);
  const utilisation = aiAllowance > 0 ? Math.round((aiUsed / aiAllowance) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Pilot Programme
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Tenants enrolled in the pilot, grouped by cohort. Open a tenant to adjust its features,
          AI allowance or enrolment.
        </p>
      </div>

      {/* Summary */}
      <div className="grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard value={String(total)} label="Tenants in pilot" />
        <SummaryCard value={String(cohorts)} label="Cohorts" />
        <SummaryCard value={`${formatNumber(aiUsed)}`} label="AI calls this period" />
        <SummaryCard value={`${utilisation}%`} label="Allowance used" />
      </div>

      {/* Cohorts */}
      {total === 0 ? (
        <div
          className="rounded-xl p-8 text-center text-sm"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
        >
          No tenants are enrolled in the pilot yet. Open a tenant and use the{' '}
          <span className="font-medium">Pilot programme</span> panel to enrol them.
        </div>
      ) : (
        <PilotCohortTable rows={rows} />
      )}
    </div>
  );
}

function SummaryCard({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
    >
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
    </div>
  );
}
