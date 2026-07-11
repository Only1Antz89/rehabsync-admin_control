import { adminFetch } from '../../../../lib/admin-api';
import { AgentConsole, type AgentStatus, type TicketSummary } from './AgentConsole';

export const dynamic = 'force-dynamic';

export default async function AgentPage() {
  let status: AgentStatus | null = null;
  let tickets: TicketSummary[] = [];

  try {
    const [statusRes, ticketsRes] = await Promise.all([
      adminFetch('/api/v1/admin/agent/status', { cache: 'no-store' }).catch(() => null),
      adminFetch('/api/v1/admin/support/tickets', { cache: 'no-store' }).catch(() => null),
    ]);
    if (statusRes?.ok) status = (await statusRes.json()) as AgentStatus;
    if (ticketsRes?.ok) tickets = (await ticketsRes.json()) as TicketSummary[];
  } catch {
    /* render with whatever loaded */
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Operations</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Maintenance Agent</h1>
        <p className="mt-1 text-sm text-slate-600">
          A Claude-backed co-pilot that watches Kinetix, triages support tickets, and drafts fixes.
          It is decision support only — it never changes systems or pushes code without your authorization.
        </p>
      </div>

      <AgentConsole initialStatus={status} initialTickets={tickets} />
    </div>
  );
}
