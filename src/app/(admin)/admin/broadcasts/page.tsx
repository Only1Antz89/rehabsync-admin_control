import React from 'react';
import { adminFetch } from '../../../../lib/admin-api';
import { BroadcastManager } from './BroadcastManager';
import type { Broadcast } from './BroadcastManager';

export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  let broadcasts: Broadcast[] = [];
  try {
    const res = await adminFetch('/api/v1/admin/broadcasts', { next: { revalidate: 0 } });
    if (res.ok) broadcasts = (await res.json()) as Broadcast[];
  } catch {
    /* empty */
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Broadcasts
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Send holiday, closure, maintenance, or change alerts to consultants, clients, or both.
          Broadcasts appear only in recipients&apos; notifications.
        </p>
      </div>
      <BroadcastManager initialBroadcasts={broadcasts} />
    </div>
  );
}
