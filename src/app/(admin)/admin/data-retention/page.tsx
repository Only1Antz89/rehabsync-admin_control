import Link from 'next/link';
import { Badge } from '@rs/ui';
import { AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { adminFetch } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

interface PurgeRow {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  deletionAt: string;
  daysRemaining: number;
  patientCount: number;
}

interface PurgePreview {
  due: PurgeRow[];
  scheduled: PurgeRow[];
  generatedAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function getPreview(): Promise<PurgePreview | null> {
  try {
    const res = await adminFetch('/api/v1/admin/lifecycle/purge-preview', { cache: 'no-store' });
    if (res.ok) return (await res.json()) as PurgePreview;
  } catch {
    /* API unavailable */
  }
  return null;
}

function Table({ rows, highlightDue }: { rows: PurgeRow[]; highlightDue: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        {highlightDue ? 'No clinics are currently due for deletion.' : 'No clinics are scheduled for deletion.'}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Clinic</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Status</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Patients</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Deletion date</th>
            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{highlightDue ? 'Overdue by' : 'Days left'}</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
          {rows.map((r) => (
            <tr key={r.tenantId}>
              <td className="px-6 py-3">
                <Link href={`/admin/tenants/${r.tenantId}`} className="font-medium hover:underline" style={{ color: 'var(--text-primary)' }}>
                  {r.name}
                </Link>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{r.slug}</p>
              </td>
              <td className="px-6 py-3">
                <Badge variant={r.status === 'cancelled' ? 'error' : 'warning'}>{r.status}</Badge>
              </td>
              <td className="px-6 py-3 text-right font-semibold" style={{ color: r.patientCount > 0 ? 'var(--color-error-text)' : 'var(--text-secondary)' }}>
                {r.patientCount}
              </td>
              <td className="px-6 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(r.deletionAt)}</td>
              <td className="px-6 py-3 text-right font-medium" style={{ color: highlightDue ? 'var(--color-error-text)' : 'var(--text-primary)' }}>
                {highlightDue ? `${Math.abs(r.daysRemaining)} day${Math.abs(r.daysRemaining) === 1 ? '' : 's'}` : `${Math.max(0, r.daysRemaining)} day${r.daysRemaining === 1 ? '' : 's'}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DataRetentionPage() {
  const preview = await getPreview();
  const due = preview?.due ?? [];
  const scheduled = preview?.scheduled ?? [];
  const duePatients = due.reduce((sum, r) => sum + r.patientCount, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Operations</p>
        <h1 className="mt-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Data Retention</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Clinics scheduled for automatic clinical-data deletion, 28 days after their trial lapsed or subscription was cancelled.
          The daily sweep purges any clinic in the “due” list — this page is a read-only preview.
        </p>
      </div>

      {/* Due now — the destructive set */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--color-error-text)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Due for deletion on next sweep</h2>
          </div>
          {due.length > 0 && (
            <span className="text-xs font-semibold" style={{ color: 'var(--color-error-text)' }}>
              {due.length} clinic{due.length === 1 ? '' : 's'} · {duePatients} patient record{duePatients === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <Table rows={due} highlightDue />
      </div>

      {/* Scheduled — the countdown set */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
          <Clock className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Scheduled (counting down)</h2>
        </div>
        <Table rows={scheduled} highlightDue={false} />
      </div>

      <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        <ShieldCheck className="h-3.5 w-3.5" /> Reactivating a clinic (Activate on its tenant page, or a successful subscription) removes it from these lists immediately.
      </p>
    </div>
  );
}
