import React from 'react';
import { DomainsTable } from './DomainsTable';
import type { DomainRow } from './DomainsTable';
import { adminFetch } from '../../../../lib/admin-api';

export default async function DomainsPage() {
  let rows: DomainRow[] = [];

  try {
    const res = await adminFetch('/api/v1/admin/domains', {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as DomainRow[] | { items?: DomainRow[]; data?: DomainRow[] };
      if (Array.isArray(data)) {
        rows = data;
      } else {
        rows = data.items ?? data.data ?? [];
      }
    }
  } catch { /* empty */ }

  const total = rows.length;
  const customDomains = rows.filter((r) => r.customDomain);
  const verified = customDomains.filter((r) => r.domainVerified).length;
  const pending = customDomains.length - verified;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Domain Management</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Every clinic gets an app subdomain automatically; custom domains are listed where set.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        >
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tenants</p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <p className="text-2xl font-bold" style={{ color: '#15803d' }}>{verified}</p>
          <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>Custom verified</p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}
        >
          <p className="text-2xl font-bold" style={{ color: '#b45309' }}>{pending}</p>
          <p className="text-xs mt-0.5" style={{ color: '#d97706' }}>Custom pending</p>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>All Domains</h2>
        </div>
        <DomainsTable rows={rows} />
      </div>
    </div>
  );
}
