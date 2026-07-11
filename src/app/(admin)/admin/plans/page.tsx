import React from 'react';
import { adminFetch } from '../../../../lib/admin-api';
import { PlansManager } from './PlansManager';
import type { Plan } from './PlansManager';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  let plans: Plan[] = [];
  try {
    const res = await adminFetch('/api/v1/admin/plans', { next: { revalidate: 0 } });
    if (res.ok) plans = (await res.json()) as Plan[];
  } catch {
    /* empty */
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Subscription Plans
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Define the plan tiers tenants can subscribe to — pricing, limits, and features.
        </p>
      </div>
      <PlansManager initialPlans={plans} />
    </div>
  );
}
