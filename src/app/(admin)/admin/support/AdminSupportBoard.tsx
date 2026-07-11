'use client';

import type { CSSProperties, DragEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Clock, GripVertical, Inbox, Lock, MessageSquare, UserRound } from 'lucide-react';

type Status = 'new' | 'open' | 'pending' | 'solved' | 'closed';
type Importance = 'low' | 'medium' | 'high';
type TicketType = 'problem' | 'question' | 'task' | 'incident';

interface Ticket {
  id: string;
  ticketNumber: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
  requesterName: string;
  requesterEmail?: string | null;
  requesterRole: string;
  subject: string;
  description?: string;
  status: Status;
  importance: Importance;
  ticketType: TicketType;
  assigneePlatformAdminId?: string | null;
  assigneeName?: string | null;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  visibility: 'public' | 'internal';
  body: string;
  createdAt: string;
}

interface TicketDetail {
  ticket: Ticket;
  comments: Comment[];
}

interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditSupportContext {
  auditEventId: string | null;
  tenantId: string | null;
}

interface Props {
  initialTickets: Ticket[];
  admins: PlatformAdmin[];
  initialError?: string | null;
  auditContext?: AuditSupportContext | null;
}

const COLUMNS: { id: Status; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'open', label: 'Open' },
  { id: 'pending', label: 'Pending' },
  { id: 'solved', label: 'Solved' },
  { id: 'closed', label: 'Closed' },
];

const SUPPORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/London',
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : SUPPORT_DATE_FORMATTER.format(date);
}

const statusLabels: Record<Status, string> = {
  new: 'New',
  open: 'Open',
  pending: 'Waiting',
  solved: 'Solved',
  closed: 'Closed',
};

const panelStyle: CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-primary)',
  boxShadow: 'var(--shadow-sm)',
};

const fieldStyle: CSSProperties = {
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-primary)',
  color: 'var(--text-primary)',
};

function importanceStyle(value: Importance): CSSProperties {
  if (value === 'high') return { backgroundColor: 'var(--color-error-bg)', color: 'var(--color-error-text)', border: '1px solid color-mix(in srgb, var(--color-error-text) 28%, transparent)' };
  if (value === 'medium') return { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', border: '1px solid color-mix(in srgb, var(--color-warning-text) 28%, transparent)' };
  return { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' };
}

export function AdminSupportBoard({ initialTickets, admins, initialError, auditContext }: Props) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(initialTickets[0]?.id ?? '');
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0] ?? null;
  const grouped = useMemo(
    () => COLUMNS.map((column) => ({
      ...column,
      tickets: tickets.filter((ticket) => ticket.status === column.id),
    })),
    [tickets],
  );

  async function refreshTickets() {
    const res = await fetch('/api/admin/support/tickets', { cache: 'no-store' });
    if (!res.ok) throw new Error('Unable to refresh support tickets');
    setTickets((await res.json()) as Ticket[]);
  }

  async function loadDetail(ticketId: string) {
    setSelectedId(ticketId);
    setError(null);
    const res = await fetch(`/api/admin/support/tickets/${ticketId}`, { cache: 'no-store' });
    if (!res.ok) {
      setError('Ticket details are unavailable. Check platform session/API configuration.');
      return;
    }
    setDetail((await res.json()) as TicketDetail);
  }

  async function patchTicket(ticketId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Ticket update failed');
    await refreshTickets();
    await loadDetail(ticketId);
  }

  // Optimistically move a card to another column (drag-and-drop or the status select), rolling
  // back if the API rejects the change.
  async function moveTicket(ticketId: string, status: Status) {
    const current = tickets.find((ticket) => ticket.id === ticketId);
    if (!current || current.status === status) return;
    const snapshot = tickets;
    setError(null);
    setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket)));
    try {
      const res = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Ticket update failed');
      await refreshTickets();
      if (selectedId === ticketId) await loadDetail(ticketId);
    } catch {
      setTickets(snapshot);
      setError('Could not move the ticket. Check the platform session and try again.');
    }
  }

  function onColumnDrop(event: DragEvent<HTMLElement>, status: Status) {
    event.preventDefault();
    setDragOverColumn(null);
    const ticketId = event.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    if (ticketId) void moveTicket(ticketId, status);
  }

  // Load the full thread for whichever ticket is selected (including the one auto-selected on load).
  useEffect(() => {
    if (!selectedId) return;
    if (detail?.ticket.id === selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId]);

  async function addComment() {
    if (!selected || !comment.trim()) return;
    const res = await fetch(`/api/admin/support/tickets/${selected.id}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: comment, visibility }),
    });
    if (!res.ok) {
      setError('Comment could not be added.');
      return;
    }
    setComment('');
    await loadDetail(selected.id);
    await refreshTickets();
  }

  function useAuditContextAsInternalNote() {
    if (!auditContext) return;
    setVisibility('internal');
    setComment([
      `Audit event: ${auditContext.auditEventId ?? 'not supplied'}`,
      `Tenant: ${auditContext.tenantId ?? 'not supplied'}`,
      'Source: Admin Audit system-fault triage.',
      'Review the audit event, confirm whether this is platform fault or tenant action, then attach investigation notes here.',
    ].join('\n'));
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ ...importanceStyle('medium'), color: 'var(--color-warning-text)' }}>
          {error}
        </div>
      )}

      {auditContext && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid color-mix(in srgb, var(--text-muted) 30%, var(--border-primary))',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Audit-linked support triage
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                This queue was opened from an audit event flagged as a possible system fault. Attach the context to a ticket or add it as an internal note.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full px-2 py-1" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>
                  Audit {auditContext.auditEventId ?? 'not supplied'}
                </span>
                <span className="rounded-full px-2 py-1" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>
                  Tenant {auditContext.tenantId ?? 'not supplied'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={useAuditContextAsInternalNote}
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, var(--bg-card))',
                border: '1px solid color-mix(in srgb, var(--brand-primary) 34%, var(--border-primary))',
                color: 'var(--brand-primary)',
              }}
            >
              Use as internal note
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Open queue', value: tickets.filter((ticket) => ticket.status === 'new' || ticket.status === 'open').length, icon: Inbox },
          { label: 'Waiting', value: tickets.filter((ticket) => ticket.status === 'pending').length, icon: Clock },
          { label: 'High priority', value: tickets.filter((ticket) => ticket.importance === 'high').length, icon: AlertTriangle },
          { label: 'Resolved', value: tickets.filter((ticket) => ticket.status === 'solved' || ticket.status === 'closed').length, icon: MessageSquare },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl p-4" style={panelStyle}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)', color: 'var(--brand-primary)' }}>
                <stat.icon size={19} />
              </span>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        <GripVertical size={13} /> Drag a ticket between columns to change its status, or click it to open the full thread.
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid min-h-[650px] gap-3 md:grid-cols-5">
          {grouped.map((column) => (
            <section
              key={column.id}
              className="flex flex-col overflow-hidden rounded-xl transition"
              style={{
                ...panelStyle,
                ...(dragOverColumn === column.id
                  ? { outline: '2px dashed var(--brand-primary)', outlineOffset: '-2px', backgroundColor: 'color-mix(in srgb, var(--brand-primary) 6%, var(--bg-card))' }
                  : null),
              }}
              onDragOver={(event) => { if (draggingId) { event.preventDefault(); setDragOverColumn(column.id); } }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverColumn((c) => (c === column.id ? null : c)); }}
              onDrop={(event) => onColumnDrop(event, column.id)}
            >
              <div className="flex items-center justify-between border-b px-3 py-3" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{column.label}</h2>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>{column.tickets.length}</span>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {column.tickets.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}>
                    <AlertCircle className="mx-auto h-5 w-5" />
                    <p className="mt-2 text-xs font-medium">{dragOverColumn === column.id ? `Drop to mark ${column.label.toLowerCase()}` : `No ${column.label.toLowerCase()} tickets`}</p>
                  </div>
                ) : (
                  column.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(event) => { setDraggingId(ticket.id); event.dataTransfer.setData('text/plain', ticket.id); event.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { setDraggingId(null); setDragOverColumn(null); }}
                      onClick={() => void loadDetail(ticket.id)}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void loadDetail(ticket.id); } }}
                      className="group w-full cursor-grab rounded-lg p-3 text-left transition hover:shadow-sm active:cursor-grabbing"
                      style={{
                        opacity: draggingId === ticket.id ? 0.5 : 1,
                        border: selected?.id === ticket.id
                          ? '1px solid color-mix(in srgb, var(--brand-primary) 45%, var(--border-primary))'
                          : '1px solid var(--border-primary)',
                        backgroundColor: selected?.id === ticket.id
                          ? 'color-mix(in srgb, var(--brand-primary) 11%, var(--bg-card))'
                          : 'var(--bg-card)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>
                          <GripVertical size={12} className="opacity-40 group-hover:opacity-70" />
                          {ticket.ticketNumber}
                        </span>
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={importanceStyle(ticket.importance)}>{ticket.importance}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ticket.subject}</p>
                      <p className="mt-2 truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{ticket.tenantName ?? ticket.tenantSlug ?? 'Tenant'}</p>
                      <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span>{ticket.ticketType}</span>
                        <span>{formatDate(ticket.updatedAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>

        <aside className="overflow-hidden rounded-xl" style={panelStyle}>
          {!selected ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
              <Inbox className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Select a ticket</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Choose a card to inspect details, update ownership, and reply.</p>
            </div>
          ) : (
            <div className="flex max-h-[760px] flex-col">
              <div className="border-b p-5" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--brand-primary)' }}>{selected.ticketNumber}</p>
                    <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selected.subject}</h2>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={importanceStyle(selected.importance)}>{selected.importance}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-2"><UserRound className="h-4 w-4" />{selected.requesterName}</span>
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{selected.ticketType}</span>
                  <span className="flex items-center gap-2"><Clock className="h-4 w-4" />SLA {formatDate(selected.slaDueAt)}</span>
                  <span className="flex items-center gap-2"><Lock className="h-4 w-4" />{selected.requesterRole}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <select
                    value={selected.status}
                    onChange={(event) => void moveTicket(selected.id, event.target.value as Status)}
                    className="rounded-lg px-2 py-2 text-sm outline-none focus:ring-2"
                    style={{ ...fieldStyle, '--tw-ring-color': 'var(--brand-primary)' } as CSSProperties}
                  >
                    {COLUMNS.map((column) => <option key={column.id} value={column.id}>{statusLabels[column.id]}</option>)}
                  </select>
                  <select
                    value={selected.assigneePlatformAdminId ?? ''}
                    onChange={(event) => void patchTicket(selected.id, { assigneePlatformAdminId: event.target.value || null })}
                    className="rounded-lg px-2 py-2 text-sm outline-none focus:ring-2"
                    style={{ ...fieldStyle, '--tw-ring-color': 'var(--brand-primary)' } as CSSProperties}
                  >
                    <option value="">Unassigned</option>
                    {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                <p className="whitespace-pre-line rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {detail?.ticket.description ?? selected.description ?? 'Open the ticket to load the full description.'}
                </p>
                <div className="mt-5 space-y-3">
                  {(detail?.comments ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg p-3"
                      style={item.visibility === 'internal'
                        ? { backgroundColor: 'var(--color-warning-bg)', border: '1px solid color-mix(in srgb, var(--color-warning-text) 28%, transparent)' }
                        : { backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.authorName}</span>
                        <span style={{ color: item.visibility === 'internal' ? 'var(--color-warning-text)' : 'var(--text-muted)' }}>{item.visibility} · {formatDate(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm" style={{ color: item.visibility === 'internal' ? 'var(--color-warning-text)' : 'var(--text-secondary)' }}>{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t p-4" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value as 'public' | 'internal')}
                    className="rounded-lg px-2 py-1 text-xs outline-none focus:ring-2"
                    style={{ ...fieldStyle, '--tw-ring-color': 'var(--brand-primary)' } as CSSProperties}
                  >
                    <option value="public">Public reply</option>
                    <option value="internal">Internal note</option>
                  </select>
                </div>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg p-2 text-sm outline-none focus:ring-2"
                  style={{ ...fieldStyle, '--tw-ring-color': 'var(--brand-primary)' } as CSSProperties}
                  placeholder="Write a reply or internal note"
                />
                <button
                  type="button"
                  onClick={() => void addComment()}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <MessageSquare size={16} />
                  Add comment
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
