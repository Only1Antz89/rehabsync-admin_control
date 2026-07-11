'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Input } from '@rs/ui';

export interface AuditEntry {
  id: string;
  tenantId: string | null;
  actorType: string;
  actorId: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: unknown;
  createdAt: string;
}

type AuditSeverity = 'kinetix' | 'breach' | 'caution' | 'system' | 'standard';

export interface BreakdownRow {
  key?: string;
  label: string;
  count: number;
  breach: number;
  caution: number;
  kinetix: number;
  system: number;
}

export interface AuditAggregates {
  totals: {
    breach: number;
    caution: number;
    kinetix: number;
    system: number;
  };
  tenants: BreakdownRow[];
  clinics: BreakdownRow[];
  consultants: BreakdownRow[];
}

interface AuditLogTableProps {
  items: AuditEntry[];
  aggregates: AuditAggregates;
  total: number;
  page: number;
  limit: number;
  initialTenantFilter: string;
  initialActionFilter: string;
  initialFromFilter: string;
  initialToFilter: string;
  supportBaseHref?: string;
  enableSupportTicketCreation?: boolean;
  showTenantFilter?: boolean;
  showTenantBreakdown?: boolean;
}

const ACTION_OPTIONS = [
  '',
  'tenant.created',
  'tenant.updated',
  'tenant.deleted',
  'user.invited',
  'user.created',
  'billing.subscribed',
  'billing.cancelled',
  'billing.upgraded',
  'domain.verified',
  'ai.query',
  'kinetix.recommendation.created',
  'kinetix.recommendation.viewed',
  'kinetix.recommendation.saved',
  'kinetix.recommendation.dismissed',
  'communication.message.sent',
  'communication.thread.read',
  'communication.thread.started',
  'communication.thread.transferred',
  'communication.message.redacted',
  'communication.message.escalated',
  'communication.export.requested',
  'communication.settings.updated',
];

function metadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstString(meta: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = stringValue(meta[key]);
    if (value) return value;
  }
  return null;
}

function truncate(value: string | null | undefined, len = 12): string {
  if (!value) return '—';
  return value.length > len ? `${value.slice(0, len)}…` : value;
}

function relativeTime(iso: string): string {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays >= 1) {
      return new Date(iso).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (diffHours >= 1) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffMins >= 1) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    return 'just now';
  } catch {
    return iso;
  }
}

function dateToIso(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function calendarCells(month: Date): Date[] {
  const first = startOfMonth(month);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function AuditDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const cells = useMemo(() => calendarCells(month), [month]);
  const today = dateToIso(new Date());

  function selectDate(day: Date) {
    onChange(dateToIso(day));
    setMonth(startOfMonth(day));
    setOpen(false);
  }

  return (
    <div className="relative min-w-44">
      <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
      >
        <span>{value || 'Select date'}</span>
        <CalendarDays size={16} className="text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMonth((current) => addMonths(current, -1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-bold text-slate-900">
              {month.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setMonth((current) => addMonths(current, 1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {cells.map((day) => {
              const iso = dateToIso(day);
              const isSelected = iso === value;
              const isToday = iso === today;
              const inMonth = day.getMonth() === month.getMonth();
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`aspect-square rounded-lg text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-teal-700 text-white'
                      : isToday
                        ? 'border border-teal-300 bg-teal-50 text-teal-900'
                        : inMonth
                          ? 'text-slate-800 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => selectDate(new Date())}
              className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-900"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditThemeStyles() {
  return (
    <style jsx global>{`
      .rs-audit-shell .bg-white {
        background-color: var(--bg-card) !important;
      }
      .rs-audit-shell .bg-slate-50 {
        background-color: var(--bg-secondary) !important;
      }
      .rs-audit-shell .bg-slate-100,
      .rs-audit-shell .bg-slate-200 {
        background-color: var(--bg-tertiary) !important;
      }
      .rs-audit-shell .border-slate-100,
      .rs-audit-shell .border-slate-200,
      .rs-audit-shell .border-slate-300 {
        border-color: var(--border-primary) !important;
      }
      .rs-audit-shell .divide-slate-100 > :not([hidden]) ~ :not([hidden]) {
        border-color: var(--border-secondary) !important;
      }
      .rs-audit-shell .text-slate-950,
      .rs-audit-shell .text-slate-900,
      .rs-audit-shell .text-slate-800,
      .rs-audit-shell .text-slate-700 {
        color: var(--text-primary) !important;
      }
      .rs-audit-shell .text-slate-600,
      .rs-audit-shell .text-slate-500 {
        color: var(--text-secondary) !important;
      }
      .rs-audit-shell .text-slate-400,
      .rs-audit-shell .text-slate-300 {
        color: var(--text-muted) !important;
      }
      .rs-audit-shell input,
      .rs-audit-shell select {
        background-color: var(--bg-input) !important;
        border-color: var(--border-primary) !important;
        color: var(--text-primary) !important;
      }
      .rs-audit-shell code,
      .rs-audit-shell pre {
        background-color: var(--bg-secondary) !important;
        border-color: var(--border-primary) !important;
        color: var(--text-primary) !important;
      }
      .rs-audit-shell .bg-teal-50,
      .rs-audit-shell .bg-teal-100 {
        background-color: color-mix(in srgb, var(--brand-primary) 12%, var(--bg-card)) !important;
      }
      .rs-audit-shell .border-teal-200,
      .rs-audit-shell .border-teal-300 {
        border-color: color-mix(in srgb, var(--brand-primary) 45%, var(--border-primary)) !important;
      }
      .rs-audit-shell .text-teal-900,
      .rs-audit-shell .text-teal-800 {
        color: var(--brand-primary) !important;
      }
      .rs-audit-shell .bg-amber-50,
      .rs-audit-shell .bg-amber-100 {
        background-color: var(--color-warning-bg) !important;
      }
      .rs-audit-shell .border-amber-300 {
        border-color: color-mix(in srgb, var(--color-warning) 45%, var(--border-primary)) !important;
      }
      .rs-audit-shell .text-amber-900,
      .rs-audit-shell .text-amber-800 {
        color: var(--color-warning-text) !important;
      }
      .rs-audit-shell .bg-red-50,
      .rs-audit-shell .bg-red-100 {
        background-color: var(--color-error-bg) !important;
      }
      .rs-audit-shell .border-red-300 {
        border-color: color-mix(in srgb, var(--color-error) 45%, var(--border-primary)) !important;
      }
      .rs-audit-shell .text-red-900,
      .rs-audit-shell .text-red-800 {
        color: var(--color-error-text) !important;
      }
      .rs-audit-shell a,
      .rs-audit-shell button:not(:disabled) {
        text-underline-offset: 3px;
      }
    `}</style>
  );
}

function classifyAudit(entry: AuditEntry): { severity: AuditSeverity; label: string; reason: string } {
  const action = entry.action.toLowerCase();
  const resource = (entry.resourceType ?? '').toLowerCase();
  const metadata = JSON.stringify(entry.metadata ?? {}).toLowerCase();
  const haystack = `${action} ${resource} ${metadata}`;

  if (haystack.includes('kinetix')) {
    return {
      severity: 'kinetix',
      label: 'Kinetix',
      reason: 'Kinetix module, recommendation, or clinical-intelligence activity.',
    };
  }

  if (
    /breach|unauthori[sz]ed|forbidden|permission|access_denied|data_leak|exfiltrat|gdpr|phi|clinical_document_deleted/.test(haystack) ||
    /delete|offboarding|retention\.purge|export_requested|password-reset|role\.changed|tenant\.deleted/.test(haystack)
  ) {
    return {
      severity: 'breach',
      label: 'Critical',
      reason: 'Potential data breach, destructive action, access concern, or ethics/governance-sensitive event.',
    };
  }

  if (/error|fail|fault|incident|unavailable|timeout|500|supportticket|persistencewarning/.test(haystack)) {
    return {
      severity: 'system',
      label: 'System fault',
      reason: 'Likely platform fault or failed subsystem. Link this event to a support ticket.',
    };
  }

  if (
    /cancel|reject|refund|dismiss|invite|trial|billing|subscription|update|override|domain|login|import|checkout/.test(haystack)
  ) {
    return {
      severity: 'caution',
      label: 'Caution',
      reason: 'Operational, billing, access, or clinical workflow action that may need review.',
    };
  }

  return {
    severity: 'standard',
    label: 'Standard',
    reason: 'Routine platform or tenant activity.',
  };
}

function severityClasses(severity: AuditSeverity): string {
  switch (severity) {
    case 'kinetix':
      return 'border-teal-300 bg-teal-50 text-teal-900';
    case 'breach':
      return 'border-red-300 bg-red-50 text-red-900';
    case 'caution':
      return 'border-amber-300 bg-amber-50 text-amber-900';
    case 'system':
      return 'border-slate-300 bg-slate-100 text-slate-800';
    case 'standard':
      return 'border-slate-200 bg-white text-slate-700';
  }
}

function pillClasses(severity: AuditSeverity): string {
  switch (severity) {
    case 'kinetix':
      return 'border-teal-300 bg-teal-100 text-teal-900';
    case 'breach':
      return 'border-red-300 bg-red-100 text-red-900';
    case 'caution':
      return 'border-amber-300 bg-amber-100 text-amber-900';
    case 'system':
      return 'border-slate-300 bg-slate-200 text-slate-800';
    case 'standard':
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function tenantLabel(entry: AuditEntry): string {
  const meta = metadataRecord(entry.metadata);
  return firstString(meta, ['tenantName', 'tenantSlug', 'slug']) ?? entry.tenantId ?? 'Platform';
}

function clinicLabel(entry: AuditEntry): string {
  const meta = metadataRecord(entry.metadata);
  return firstString(meta, ['clinicName', 'clinicSlug', 'homeClinic', 'patientClinicName'])
    ?? firstString(meta, ['clinicId', 'patientClinicId'])
    ?? 'No clinic in audit metadata';
}

function consultantLabel(entry: AuditEntry): string {
  const meta = metadataRecord(entry.metadata);
  return firstString(meta, ['actorName', 'consultantName', 'clinicianName', 'reviewedByName', 'createdByName'])
    ?? firstString(meta, ['consultantId', 'clinicianId', 'reviewedBy', 'createdBy'])
    ?? (firstString(meta, ['actorRole']) === 'consultant'
      ? firstString(meta, ['actorEmail']) ?? entry.actorId
      : null)
    ?? (entry.actorType === 'user' ? entry.actorId : `${entry.actorType}:${entry.actorId}`)
    ?? 'Unattributed';
}

function actionSummary(entry: AuditEntry): string {
  const meta = metadataRecord(entry.metadata);
  const title = firstString(meta, ['title', 'subject', 'moduleKey', 'requestType']);
  const url = firstString(meta, ['url', 'sectionHref']);
  if (title && url) return `${title} · ${url}`;
  return title ?? url ?? entry.resourceType ?? 'Audit event';
}

function buildBreakdown(items: AuditEntry[], dimension: 'tenant' | 'clinic' | 'consultant'): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const entry of items) {
    const label =
      dimension === 'tenant'
        ? tenantLabel(entry)
        : dimension === 'clinic'
          ? clinicLabel(entry)
          : consultantLabel(entry);
    const key = `${dimension}:${label}`;
    const severity = classifyAudit(entry).severity;
    const row = map.get(key) ?? {
      key,
      label,
      count: 0,
      breach: 0,
      caution: 0,
      kinetix: 0,
      system: 0,
    };
    row.count += 1;
    if (severity === 'breach') row.breach += 1;
    if (severity === 'caution') row.caution += 1;
    if (severity === 'kinetix') row.kinetix += 1;
    if (severity === 'system') row.system += 1;
    map.set(key, row);
  }
  return Array.from(map.values())
    .sort((a, b) => b.breach - a.breach || b.caution - a.caution || b.count - a.count)
    .slice(0, 8);
}

function StatCard({
  label,
  value,
  sub,
  severity,
}: {
  label: string;
  value: string | number;
  sub: string;
  severity: AuditSeverity;
}) {
  return (
    <div className={`rounded-xl border p-4 ${severityClasses(severity)}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{sub}</p>
    </div>
  );
}

function BreakdownPanel({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No audit activity in this result set.</p>
        ) : (
          rows.map((row) => (
            <div key={row.key ?? row.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-800">{row.label}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
                  {row.count}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                {row.breach > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">Critical {row.breach}</span>}
                {row.caution > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Caution {row.caution}</span>}
                {row.kinetix > 0 && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-teal-800">Kinetix {row.kinetix}</span>}
                {row.system > 0 && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">Fault {row.system}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AuditLogTable({
  items,
  aggregates,
  total,
  page,
  limit,
  initialTenantFilter,
  initialActionFilter,
  initialFromFilter,
  initialToFilter,
  supportBaseHref = '/admin/support?source=audit',
  enableSupportTicketCreation = true,
  showTenantFilter = true,
  showTenantBreakdown = true,
}: AuditLogTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [tenantFilter, setTenantFilter] = useState(initialTenantFilter);
  const [actionFilter, setActionFilter] = useState(initialActionFilter);
  const [fromFilter, setFromFilter] = useState(initialFromFilter);
  const [toFilter, setToFilter] = useState(initialToFilter);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creatingTicketFor, setCreatingTicketFor] = useState<string | null>(null);
  const [ticketMessage, setTicketMessage] = useState<string | null>(null);

  const classified = useMemo(
    () => items.map((entry) => ({ entry, classification: classifyAudit(entry) })),
    [items],
  );
  const stats = aggregates.totals;
  const tenantRows = aggregates.tenants.length > 0 ? aggregates.tenants : buildBreakdown(items, 'tenant');
  const clinicRows = aggregates.clinics.length > 0 ? aggregates.clinics : buildBreakdown(items, 'clinic');
  const consultantRows = aggregates.consultants.length > 0 ? aggregates.consultants : buildBreakdown(items, 'consultant');
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function applyFilters(newPage: number, newTenant: string, newAction: string, newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (showTenantFilter && newTenant) params.set('tenantId', newTenant);
    else params.delete('tenantId');
    if (newAction) params.set('action', newAction);
    else params.delete('action');
    if (newFrom) params.set('from', newFrom);
    else params.delete('from');
    if (newTo) params.set('to', newTo);
    else params.delete('to');
    params.set('page', String(newPage));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    applyFilters(1, tenantFilter, actionFilter, fromFilter, toFilter);
  }

  async function createSupportTicket(entry: AuditEntry) {
    if (!enableSupportTicketCreation) return;
    setCreatingTicketFor(entry.id);
    setTicketMessage(null);
    try {
      const res = await fetch('/api/admin/support/audit-fault-ticket', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ auditEventId: entry.id, tenantId: entry.tenantId }),
      });
      if (!res.ok) throw new Error(`Support API returned ${res.status}`);
      const detail = await res.json() as { ticket?: { ticketNumber?: string } };
      setTicketMessage(`Support ticket ${detail.ticket?.ticketNumber ?? 'created'} is ready for triage.`);
    } catch {
      setTicketMessage('Support ticket could not be created. Open Support and add the audit context manually.');
    } finally {
      setCreatingTicketFor(null);
    }
  }

  return (
    <div className="rs-audit-shell space-y-6">
      <AuditThemeStyles />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Events" value={total.toLocaleString('en-GB')} sub={`${items.length} shown on this page`} severity="standard" />
        <StatCard label="Critical" value={stats.breach} sub="Potential breach, ethics, or destructive actions" severity="breach" />
        <StatCard label="Caution" value={stats.caution} sub="Operational actions needing review" severity="caution" />
        <StatCard label="System faults" value={stats.system} sub="Likely platform issue; link to support" severity="system" />
        <StatCard label="Kinetix" value={stats.kinetix} sub="Tenant Kinetix events highlighted green" severity="kinetix" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950">Severity guide</h2>
            <p className="mt-1 text-sm text-slate-500">
              Green is Kinetix, amber needs caution, red needs immediate governance review, grey is likely a system fault.
            </p>
          </div>
          <Link href={supportBaseHref} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Open support system
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-teal-900">Kinetix logs</span>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900">Cautious actions</span>
          <span className="rounded-full border border-red-300 bg-red-50 px-3 py-1 text-red-900">Breach or ethics risk</span>
          <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-slate-800">System fault</span>
        </div>
      </div>

      <form onSubmit={handleFilterSubmit} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          {showTenantFilter && (
            <div className="min-w-56 flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Tenant ID</label>
              <Input
                placeholder="Filter by tenant id"
                value={tenantFilter}
                onChange={(event) => setTenantFilter(event.target.value)}
              />
            </div>
          )}
          <div className="min-w-56">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Action</label>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.filter(Boolean).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <AuditDateField label="From" value={fromFilter} onChange={setFromFilter} />
          <AuditDateField label="To" value={toFilter} onChange={setToFilter} />
          <Button type="submit" variant="primary" size="sm" loading={isPending}>
            Apply
          </Button>
          {((showTenantFilter && tenantFilter) || actionFilter || fromFilter || toFilter) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setTenantFilter('');
                setActionFilter('');
                setFromFilter('');
                setToFilter('');
                applyFilters(1, '', '', '', '');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      <div className={`grid gap-4 ${showTenantBreakdown ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
        {showTenantBreakdown && <BreakdownPanel title="Tenant Breakdown" rows={tenantRows} />}
        <BreakdownPanel title="Clinic Breakdown" rows={clinicRows} />
        <BreakdownPanel title="Consultant Breakdown" rows={consultantRows} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-950">Audit Events</h2>
          <p className="mt-1 text-xs text-slate-500">
            Page {page} of {totalPages}. Breakdowns use the full filtered audit range, while the table is paginated.
          </p>
          {ticketMessage && (
            <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">
              {ticketMessage}
            </p>
          )}
        </div>

        {classified.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No audit log entries match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Tenant / Clinic</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Resource</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classified.map(({ entry, classification }) => {
                  const meta = metadataRecord(entry.metadata);
                  const isExpanded = expandedId === entry.id;
                  const supportHref = `${supportBaseHref}${supportBaseHref.includes('?') ? '&' : '?'}auditEvent=${encodeURIComponent(entry.id)}&tenantId=${encodeURIComponent(entry.tenantId ?? '')}`;
                  return (
                    <React.Fragment key={entry.id}>
                      <tr className={`${classification.severity === 'kinetix' ? 'bg-teal-50/65' : ''}`}>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${pillClasses(classification.severity)}`}>
                            {classification.label}
                          </span>
                          {classification.severity === 'system' && (
                            <div className="mt-2 space-y-1">
                              {enableSupportTicketCreation && (
                                <button
                                  type="button"
                                  disabled={!entry.tenantId || creatingTicketFor === entry.id}
                                  onClick={() => void createSupportTicket(entry)}
                                  className="block text-xs font-semibold text-slate-700 underline disabled:cursor-not-allowed disabled:text-slate-400"
                                >
                                  {creatingTicketFor === entry.id ? 'Creating...' : 'Create ticket'}
                                </button>
                              )}
                              <Link href={supportHref} className="block text-xs font-semibold text-slate-500 underline">
                                Open support
                              </Link>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-slate-600">
                          {relativeTime(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {entry.tenantId ? (
                            <Link href={`/admin/tenants/${entry.tenantId}`} className="font-mono text-xs font-semibold text-teal-800 underline">
                              {truncate(tenantLabel(entry), 24)}
                            </Link>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500">Platform</span>
                          )}
                          <p className="mt-1 max-w-52 truncate text-xs text-slate-500">{clinicLabel(entry)}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="max-w-44 truncate text-xs font-semibold text-slate-800">{consultantLabel(entry)}</p>
                          <p className="font-mono text-[11px] text-slate-500">{entry.actorType}:{truncate(entry.actorId, 10)}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">{entry.action}</code>
                          <p className="mt-2 max-w-md text-xs text-slate-500">{actionSummary(entry)}</p>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-xs text-slate-600">
                          {entry.resourceType ? `${entry.resourceType}:${truncate(entry.resourceId ?? '', 10)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-950"
                          >
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={7} className="px-4 pb-4">
                            <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
                              <div className={`rounded-lg border p-3 text-xs ${severityClasses(classification.severity)}`}>
                                <p className="font-bold">{classification.label}</p>
                                <p className="mt-1 opacity-85">{classification.reason}</p>
                                {classification.severity === 'system' && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {enableSupportTicketCreation && (
                                      <button
                                        type="button"
                                        disabled={!entry.tenantId || creatingTicketFor === entry.id}
                                        onClick={() => void createSupportTicket(entry)}
                                        className="inline-flex rounded-md bg-white px-2 py-1 font-bold text-slate-700 underline disabled:cursor-not-allowed disabled:text-slate-400"
                                      >
                                        {creatingTicketFor === entry.id ? 'Creating ticket...' : 'Create support ticket'}
                                      </button>
                                    )}
                                    <Link href={supportHref} className="inline-flex rounded-md bg-white px-2 py-1 font-bold text-slate-700 underline">
                                      Open support
                                    </Link>
                                  </div>
                                )}
                              </div>
                              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                                {JSON.stringify({ ...meta, auditId: entry.id }, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing {items.length} of {total.toLocaleString('en-GB')} events.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => applyFilters(page - 1, tenantFilter, actionFilter, fromFilter, toFilter)}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => applyFilters(page + 1, tenantFilter, actionFilter, fromFilter, toFilter)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
