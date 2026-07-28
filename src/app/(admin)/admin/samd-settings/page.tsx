import { Badge, Card } from '@rs/ui';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { adminFetch, getAdminSession, isSuperadmin } from '../../../../lib/admin-api';
import type { SamdSettingsView } from '../../../../lib/samd';
import { SamdSettingsClient } from './SamdSettingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SaMD settings',
};

async function getSettings(): Promise<SamdSettingsView | null> {
  try {
    const res = await adminFetch('/api/v1/admin/samd-settings', { cache: 'no-store' });
    if (res.ok) return (await res.json()) as SamdSettingsView;
  } catch {
    /* API unavailable */
  }
  return null;
}

export default async function SamdSettingsPage() {
  const [session, settings] = await Promise.all([getAdminSession(), getSettings()]);
  // Read access follows the existing admin read pattern; every WRITE is restricted to super_admin by
  // the platform API and re-checked in its service layer. This flag only decides whether to render the
  // controls — it is never the authorisation.
  const canWrite = isSuperadmin(session);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6" style={{ color: 'var(--brand-text)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            SaMD settings
          </h1>
        </div>
        <p className="max-w-4xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          These settings control which clinical capabilities RehabSync operates, globally and per
          tenant. Each capability runs in one of three modes: <strong>Off</strong> (removed and blocked
          server-side), <strong>Partial</strong> (a defined scaled-back form only), or{' '}
          <strong>Full</strong> (the complete clinician-reviewed capability).
        </p>
        <div
          className="max-w-4xl rounded-md border px-4 py-3 text-sm leading-relaxed"
          style={{
            borderColor: 'color-mix(in srgb, #f59e0b 45%, var(--border-primary))',
            backgroundColor: 'color-mix(in srgb, #f59e0b 8%, var(--bg-card))',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#b45309' }} />
            <span>
              These settings control product behaviour. They do not determine legal classification.
              Changing a mode does not make RehabSync approved, certified, registered or exempt from
              medical-device regulation — intended purpose and real-world use decide that. Do not
              describe any mode as MHRA approved or guaranteed non-SaMD.
            </span>
          </span>
        </div>
      </header>

      {!settings ? (
        <Card>
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              SaMD settings are unavailable
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              The platform API could not be reached. Effective modes fail closed to <em>Off</em> while
              settings cannot be read, so no clinical capability is enabled by this outage.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {!canWrite && (
            <Card>
              <div className="flex items-center gap-3 px-6 py-4">
                <Badge variant="warning">Read only</Badge>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Changing a SaMD mode requires a platform super admin.
                </p>
              </div>
            </Card>
          )}
          <SamdSettingsClient settings={settings} canWrite={canWrite} />
        </>
      )}
    </div>
  );
}
