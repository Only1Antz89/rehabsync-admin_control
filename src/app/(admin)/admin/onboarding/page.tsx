import React from 'react';
import Link from 'next/link';
import { Card } from '@rs/ui';
import { FunnelChart } from './FunnelChart';
import type { FunnelStep } from './FunnelChart';
import { adminFetch } from '../../../../lib/admin-api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  onboardingStep: number;
  createdAt: string;
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

function stepLabel(step: number): string {
  switch (step) {
    case 0: return 'Signed up';
    case 1: return 'Clinic details';
    case 2: return 'Branding';
    case 3: return 'Team invited';
    default: return `Step ${step}`;
  }
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function OnboardingPage() {
  let funnelSteps: FunnelStep[] = [];
  let tenants: Tenant[] = [];

  const [funnelRes, tenantsRes] = await Promise.allSettled([
    adminFetch('/api/v1/admin/funnel', {
      next: { revalidate: 60 },
    }),
    adminFetch('/api/v1/admin/tenants', {
      next: { revalidate: 60 },
    }),
  ]);

  if (funnelRes.status === 'fulfilled' && funnelRes.value.ok) {
    const data = (await funnelRes.value.json()) as FunnelStep[] | { steps?: FunnelStep[] };
    if (Array.isArray(data)) {
      funnelSteps = data;
    } else {
      funnelSteps = data.steps ?? [];
    }
  }

  if (tenantsRes.status === 'fulfilled' && tenantsRes.value.ok) {
    const data = (await tenantsRes.value.json()) as
      | Tenant[]
      | { tenants?: Tenant[]; items?: Tenant[]; data?: Tenant[] };
    if (Array.isArray(data)) {
      tenants = data;
    } else {
      tenants = data.tenants ?? data.items ?? data.data ?? [];
    }
  }

  // If funnel API isn't available, derive steps from tenants list
  if (funnelSteps.length === 0 && tenants.length > 0) {
    const stepCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const t of tenants) {
      const s = t.onboardingStep ?? 0;
      for (let i = 0; i <= Math.min(s, 3); i++) {
        stepCounts[i] = (stepCounts[i] ?? 0) + 1;
      }
    }
    funnelSteps = [0, 1, 2, 3].map((step) => ({
      step,
      count: stepCounts[step] ?? 0,
      label:
        step === 0
          ? 'Signed up'
          : step === 1
          ? 'Clinic details completed'
          : step === 2
          ? 'Branding configured'
          : 'Team invited',
    }));
  }

  // Stalled tenants: onboardingStep < 2 and created > 7 days ago
  const now = Date.now();
  const stalledTenants = tenants.filter((t) => {
    const step = t.onboardingStep ?? 0;
    if (step >= 2) return false;
    const age = now - new Date(t.createdAt).getTime();
    return age > SEVEN_DAYS_MS;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Onboarding Funnel</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Clinic conversion through each onboarding step.
        </p>
      </div>

      {/* Funnel visualization */}
      <Card title="Onboarding Funnel" description="Clinics completing each step">
        <FunnelChart steps={funnelSteps} />
      </Card>

      {/* Stalled tenants */}
      <Card
        title="Stalled Tenants"
        description="Clinics at step 0 or 1 for more than 7 days"
      >
        {stalledTenants.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No stalled tenants. Great progress!</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Clinic
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Slug
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Current Step
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Created
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
                {stalledTenants.map((t) => (
                  <StalledRow key={t.id} t={t} stepLabel={stepLabel} formatDate={formatDate} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StalledRow({
  t,
  stepLabel,
  formatDate,
}: {
  t: Tenant;
  stepLabel: (step: number) => string;
  formatDate: (iso: string) => string;
}) {
  return (
    <tr className="transition-colors">
      <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
      <td className="px-6 py-3">
        <code
          className="font-mono text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          {t.slug}
        </code>
      </td>
      <td className="px-6 py-3" style={{ color: 'var(--text-secondary)' }}>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
          >
            {t.onboardingStep ?? 0}
          </span>
          {stepLabel(t.onboardingStep ?? 0)}
        </span>
      </td>
      <td className="px-6 py-3" style={{ color: 'var(--text-muted)' }}>{formatDate(t.createdAt)}</td>
      <td className="px-6 py-3 text-right">
        <Link
          href={`/admin/tenants/${t.id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
