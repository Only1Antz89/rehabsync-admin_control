import React, { Suspense } from 'react';
import Link from 'next/link';
import { Badge } from '@rs/ui';
import type { BadgeVariant } from '@rs/ui';
import { TenantsFilter } from './TenantsFilter';
import { TenantActions } from './TenantActions';
import { HealthBadge, type HealthBand } from './HealthBadge';
import { Pagination } from '../../../../lib/Pagination';
import { SavedViews } from '../../../../lib/SavedViews';
import { adminFetch } from '../../../../lib/admin-api';

const PAGE_SIZE = 25;

interface TenantHealthRow {
  tenantId: string;
  score: number;
  band: HealthBand;
}

/** Batch health scores keyed by tenant id. Best-effort: an unavailable API just hides the column. */
async function fetchTenantHealth(): Promise<Map<string, TenantHealthRow>> {
  try {
    const res = await adminFetch('/api/v1/admin/tenants/health', { next: { revalidate: 0 } });
    if (!res.ok) return new Map();
    const data = (await res.json()) as TenantHealthRow[];
    return new Map(data.map((h) => [h.tenantId, h]));
  } catch {
    return new Map();
  }
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  planName?: string | null;
  usersCount?: number | null;
  createdAt: string;
}

interface TenantsApiResponse {
  tenants: TenantRow[];
  total?: number;
}

function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'trial':
      return 'info';
    case 'past_due':
      return 'warning';
    case 'suspended':
      return 'error';
    case 'cancelled':
    default:
      return 'neutral';
  }
}

async function fetchTenants(params: {
  search?: string;
  status?: string;
  planId?: string;
}): Promise<TenantsApiResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.planId) query.set('planId', params.planId);

  const qs = query.toString();
  const url = `/api/v1/admin/tenants${qs ? `?${qs}` : ''}`;

  try {
    const res = await adminFetch(url, {
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = await res.json();
      // API returns a flat array; normalize to TenantsApiResponse shape
      if (Array.isArray(data)) {
        return { tenants: data as TenantRow[], total: data.length };
      }
      return data as TenantsApiResponse;
    }
  } catch {
    // API unavailable — return empty
  }

  return { tenants: [], total: 0 };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; planId?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [{ tenants, total }, health] = await Promise.all([fetchTenants(params), fetchTenantHealth()]);
  const count = total ?? tenants.length;

  // Client-side (already-fetched) pagination via ?page — no API change.
  const totalPages = Math.max(1, Math.ceil(tenants.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1), totalPages);
  const pageRows = tenants.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tenants</h1>
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            {count}
          </span>
        </div>
        <Suspense>
          <SavedViews storageKey="tenants" paramKeys={['search', 'status', 'planId']} />
        </Suspense>
      </div>

      {/* Filters */}
      <Suspense>
        <TenantsFilter
          search={params.search}
          status={params.status}
          planId={params.planId}
        />
      </Suspense>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-primary)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Clinic
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Slug
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Health
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Plan
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Users
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Created
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody style={{ borderColor: 'var(--border-secondary)' }} className="divide-y">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No tenants found.
                  </td>
                </tr>
              ) : (
                pageRows.map((tenant) => (
                  <tr key={tenant.id} className="transition-colors" style={{ ['--tw-divide-color' as string]: 'var(--border-secondary)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {tenant.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {tenant.slug}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const h = health.get(tenant.id);
                        return h ? <HealthBadge score={h.score} band={h.band} /> : <span style={{ color: 'var(--text-secondary)' }}>—</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {tenant.planName ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {tenant.usersCount ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(tenant.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <TenantActions
                        tenantId={tenant.id}
                        currentStatus={tenant.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Suspense>
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </Suspense>
    </div>
  );
}
