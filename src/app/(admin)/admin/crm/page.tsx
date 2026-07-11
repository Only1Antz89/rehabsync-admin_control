import { adminFetch } from '../../../../lib/admin-api';
import { CrmConsole } from './CrmConsole';
import type { Contact } from './CrmConsole';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  let contacts: Contact[] = [];
  try {
    const res = await adminFetch('/api/v1/admin/crm', { next: { revalidate: 0 } });
    if (res.ok) contacts = (await res.json()) as Contact[];
  } catch {
    /* empty */
  }

  const salesCentreUrl =
    process.env['NEXT_PUBLIC_SALES_CENTRE_URL'] ?? 'https://salescentre.rehabsync.app';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sales CRM</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Track every contact through the lifecycle — lead → demo → onboarding → customer.
        </p>
      </div>
      <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        <strong>CRM has moved to the Sales Centre.</strong> It works on these same contacts and adds
        pipeline kanban, tasks, capture forms, email campaigns and analytics — this console stays as
        a lightweight fallback.{' '}
        <a href={salesCentreUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
          Open Sales Centre ↗
        </a>
      </div>
      <CrmConsole initialContacts={contacts} />
    </div>
  );
}
