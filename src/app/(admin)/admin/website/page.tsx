import { Card } from '@rs/ui';
import { PanelsTopLeft } from 'lucide-react';
import { adminFetch, getAdminSession, isSuperadmin } from '../../../../lib/admin-api';
import type { WebsiteStatusView } from '../../../../lib/samd';
import { WebsiteClient } from './WebsiteClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Website',
};

async function getStatus(): Promise<WebsiteStatusView | null> {
  try {
    const res = await adminFetch('/api/v1/admin/website', { cache: 'no-store' });
    if (res.ok) return (await res.json()) as WebsiteStatusView;
  } catch {
    /* API unavailable */
  }
  return null;
}

export default async function WebsitePage() {
  const [session, status] = await Promise.all([getAdminSession(), getStatus()]);
  // Read-only preview follows the existing platform read roles. Publication, strategy changes and
  // rollback are super_admin only, enforced by the platform API and re-checked in its service layer.
  const canPublish = isSuperadmin(session);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <PanelsTopLeft className="h-6 w-6" style={{ color: 'var(--brand-text)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Website
          </h1>
        </div>
        <p className="max-w-4xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          This page controls which curated RehabSync offering is presented publicly at therehabsync.com.
          The public website describes the <strong>global</strong> offering only. Individual tenant
          overrides may provide a different service and must be disclosed separately — use a
          tenant&apos;s capability summary for contracts, onboarding, pilots and support.
        </p>
      </header>

      {!status ? (
        <Card>
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Website status is unavailable
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              The platform API could not be reached. The public site fails safe to the Off profile while
              its configuration cannot be read, so no clinical claims are being served by this outage.
            </p>
          </div>
        </Card>
      ) : (
        <WebsiteClient status={status} canPublish={canPublish} />
      )}
    </div>
  );
}
