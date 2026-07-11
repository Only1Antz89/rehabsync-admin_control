import React from 'react';
import { SubscriptionsManager } from './SubscriptionsManager';

export const dynamic = 'force-dynamic';

export default function ClientSubscriptionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Client Subscriptions
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Define the member subscription tiers clients can choose from — pricing, benefits, and who each tier is catered for.
        </p>
      </div>
      <SubscriptionsManager />
    </div>
  );
}
