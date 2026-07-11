import React from 'react';
import Link from 'next/link';
import { Badge, Card } from '@rs/ui';
import { adminFetch } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
}

async function fetchTenants(): Promise<TenantRow[]> {
  try {
    const res = await adminFetch('/api/v1/admin/tenants', { next: { revalidate: 0 } });
    if (res.ok) {
      const data = (await res.json()) as { tenants?: TenantRow[] };
      return data.tenants ?? [];
    }
  } catch {
    // API unavailable
  }
  return [];
}

export default async function AdminStorePage() {
  const tenants = await fetchTenants();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Store &amp; recommended equipment</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Clinician-curated equipment recommendations with an affiliate storefront. Enable the store and set
          the Amazon Associates credentials per tenant from each tenant&apos;s detail page.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">How it works</h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)] list-disc pl-5">
          <li>
            Enable the <strong>Store &amp; recommended equipment</strong> feature per tenant (Governance panel),
            then set the associate tag and defaults in the tenant&apos;s <strong>Store</strong> section.
          </li>
          <li>Tenant admins curate an equipment library; consultants approve items per patient with Kinetix-assisted suggestions.</li>
          <li>Patients only ever see clinician-approved items, with a clear affiliate disclosure and safety disclaimer.</li>
          <li>
            No patient-identifiable data is ever sent to Amazon — outbound links carry only the store-level
            associate tag, and clicks are logged non-identifiably.
          </li>
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Manage per tenant</h2>
        {tenants.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No tenants found.</p>
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {tenants.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="flex items-center justify-between py-3 hover:opacity-80"
              >
                <span>
                  <span className="block text-sm font-medium text-[var(--text-primary)]">{t.name}</span>
                  <span className="block text-xs text-[var(--text-secondary)]">{t.slug}</span>
                </span>
                <span className="flex items-center gap-3">
                  <Badge variant="neutral">{t.status}</Badge>
                  <span className="text-xs text-[var(--text-secondary)]">Manage store →</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
