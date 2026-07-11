import React, { Suspense } from 'react';
import { adminFetch } from '../../../../lib/admin-api';
import { AuditLogTable } from '../../../(platform)/audit/AuditLogTable';
import type { AuditAggregates, AuditEntry } from '../../../(platform)/audit/AuditLogTable';

export const dynamic = 'force-dynamic';

interface AuditPage {
  items: AuditEntry[];
  aggregates: AuditAggregates;
  total: number;
  page: number;
  limit: number;
}

const EMPTY_AGGREGATES: AuditAggregates = {
  totals: { breach: 0, caution: 0, kinetix: 0, system: 0 },
  tenants: [],
  clinics: [],
  consultants: [],
};

export default async function SuperadminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tenantId?: string; action?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const tenantFilter = params.tenantId ?? '';
  const actionFilter = params.action ?? '';
  const fromFilter = params.from ?? '';
  const toFilter = params.to ?? '';
  const limit = 100;
  const queryParts = [`page=${page}`, `limit=${limit}`];

  if (tenantFilter) queryParts.push(`tenantId=${encodeURIComponent(tenantFilter)}`);
  if (actionFilter) queryParts.push(`action=${encodeURIComponent(actionFilter)}`);
  if (fromFilter) queryParts.push(`from=${encodeURIComponent(fromFilter)}`);
  if (toFilter) queryParts.push(`to=${encodeURIComponent(toFilter)}`);
  const isTenantScoped = tenantFilter.trim().length > 0;

  let auditData: AuditPage = { items: [], aggregates: EMPTY_AGGREGATES, total: 0, page, limit };

  try {
    const res = await adminFetch(`/api/v1/admin/audit-log?${queryParts.join('&')}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      auditData = (await res.json()) as AuditPage;
    }
  } catch {
    // Render an empty audit state if the platform API is unavailable.
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="rs-kicker">Platform governance</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {isTenantScoped ? 'Tenant Audit' : 'Superadmin Audit'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {isTenantScoped
            ? 'Tenant-scoped action monitoring, governance checks, clinic breakdowns, consultant attribution, Kinetix review status, and date-range audit review.'
            : 'Platform-wide tenant action monitoring with tenant filters, support-ticket triage, clinic breakdowns, consultant attribution, Kinetix review status, and date-range audit review.'}
        </p>
      </div>

      <Suspense fallback={<p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>}>
        <AuditLogTable
          items={auditData.items}
          aggregates={auditData.aggregates}
          total={auditData.total}
          page={auditData.page}
          limit={auditData.limit}
          initialTenantFilter={tenantFilter}
          initialActionFilter={actionFilter}
          initialFromFilter={fromFilter}
          initialToFilter={toFilter}
          supportBaseHref="/admin/support?source=audit"
          enableSupportTicketCreation
          showTenantFilter
          showTenantBreakdown={!isTenantScoped}
        />
      </Suspense>
    </div>
  );
}
