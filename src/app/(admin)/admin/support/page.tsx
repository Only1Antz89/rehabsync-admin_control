import Link from 'next/link';
import { adminFetch, getAdminSession } from '../../../../lib/admin-api';
import { AdminSupportBoard } from './AdminSupportBoard';

interface Ticket {
  id: string;
  ticketNumber: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
  requesterName: string;
  requesterEmail?: string | null;
  requesterRole: string;
  subject: string;
  status: 'new' | 'open' | 'pending' | 'solved' | 'closed';
  importance: 'low' | 'medium' | 'high';
  ticketType: 'problem' | 'question' | 'task' | 'incident';
  assigneePlatformAdminId?: string | null;
  assigneeName?: string | null;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminSupportSearchParams {
  source?: string | string[];
  auditEvent?: string | string[];
  tenantId?: string | string[];
}

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function getJson<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await adminFetch(path);
    if (!res.ok) return { data: null, error: `Admin API returned ${res.status}` };
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: 'Admin API is unavailable' };
  }
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?: Promise<AdminSupportSearchParams>;
}) {
  const session = await getAdminSession();
  const params = searchParams ? await searchParams : {};
  const auditEvent = firstParam(params.auditEvent);
  const auditTenantId = firstParam(params.tenantId);
  const source = firstParam(params.source);
  const auditContext = source === 'audit' || auditEvent
    ? {
        auditEventId: auditEvent,
        tenantId: auditTenantId,
      }
    : null;
  const intakeEmail =
    process.env['REHABSYNC_SUPPORT_INTAKE_EMAIL'] ??
    process.env['REHABSYNC_EMAIL_REPLY_TO'] ??
    'support@rehabsync.com';
  const [ticketsResult, adminsResult] = await Promise.all([
    getJson<Ticket[]>('/api/v1/admin/support/tickets'),
    getJson<AdminUser[]>('/api/v1/admin/support/admins'),
  ]);

  const error = ticketsResult.error ?? adminsResult.error ?? (!session ? 'Platform session unavailable.' : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Support</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Platform ticket queue across all RehabSync tenancies.
          </p>
        </div>
        {!session && (
          <Link
            href="/admin/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--brand-primary) 12%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--brand-primary) 32%, var(--border-primary))',
              color: 'var(--brand-primary)',
            }}
          >
            Platform sign in
          </Link>
        )}
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Support email intake</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Tickets can be raised by email and triaged from this queue.
          </p>
        </div>
        <a
          href={`mailto:${intakeEmail}?subject=Support%20ticket`}
          className="rounded-lg px-3 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
        >
          {intakeEmail}
        </a>
      </div>

      <AdminSupportBoard
        initialTickets={ticketsResult.data ?? []}
        admins={adminsResult.data ?? []}
        initialError={error}
        auditContext={auditContext}
      />
    </div>
  );
}
