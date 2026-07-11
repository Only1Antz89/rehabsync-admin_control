'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleAlert,
  Loader2,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface KinetixStatus {
  configured: boolean;
  operational: boolean;
  knowledgeUrl?: string | null;
  compositionUrl?: string | null;
  checkedAt: string;
}

export interface AgentStatus {
  configured: boolean;
  model: string;
  kinetix: KinetixStatus;
}

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  importance: 'low' | 'medium' | 'high';
  ticketType: string;
  tenantName?: string | null;
  tenantSlug?: string | null;
}

interface Analysis {
  summary: string;
  severity: Severity;
  rootCauseHypotheses: string[];
  remediationSteps: string[];
  suggestedReply?: string;
  needsHumanAuthorization: true;
  model: string;
  generatedAt: string;
}

const SEVERITY_STYLE: Record<Severity, { bg: string; fg: string; label: string }> = {
  low: { bg: '#ecfdf5', fg: '#047857', label: 'Low' },
  medium: { bg: '#fffbeb', fg: '#b45309', label: 'Medium' },
  high: { bg: '#fff7ed', fg: '#c2410c', label: 'High' },
  critical: { bg: '#fef2f2', fg: '#b91c1c', label: 'Critical' },
};

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(data.error ?? data.message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function AgentConsole({
  initialStatus,
  initialTickets,
}: {
  initialStatus: AgentStatus | null;
  initialTickets: TicketSummary[];
}) {
  const [status, setStatus] = useState<AgentStatus | null>(initialStatus);
  const [refreshing, setRefreshing] = useState(false);

  const [kinetixAnalysis, setKinetixAnalysis] = useState<Analysis | null>(null);
  const [kinetixBusy, setKinetixBusy] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState(initialTickets[0]?.id ?? '');
  const [ticketAnalysis, setTicketAnalysis] = useState<Analysis | null>(null);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configured = status?.configured ?? false;

  async function refreshStatus() {
    setRefreshing(true);
    setError(null);
    try {
      const next = await fetch('/api/admin/agent/status', { cache: 'no-store' });
      if (next.ok) setStatus((await next.json()) as AgentStatus);
    } catch {
      /* keep prior status */
    } finally {
      setRefreshing(false);
    }
  }

  async function diagnoseKinetix() {
    setKinetixBusy(true);
    setError(null);
    try {
      setKinetixAnalysis(await postJson<Analysis>('/api/admin/agent/diagnose/kinetix'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnosis failed');
    } finally {
      setKinetixBusy(false);
    }
  }

  async function diagnoseTicket() {
    if (!selectedTicket) return;
    setTicketBusy(true);
    setError(null);
    setNote(null);
    setTicketAnalysis(null);
    try {
      setTicketAnalysis(await postJson<Analysis>('/api/admin/agent/diagnose/ticket', { ticketId: selectedTicket }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Investigation failed');
    } finally {
      setTicketBusy(false);
    }
  }

  async function authorizeNote() {
    if (!selectedTicket || !ticketAnalysis) return;
    const body = [
      ticketAnalysis.summary,
      ticketAnalysis.remediationSteps.length
        ? `\nInvestigation plan:\n${ticketAnalysis.remediationSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        : '',
      ticketAnalysis.suggestedReply ? `\nDraft reply:\n${ticketAnalysis.suggestedReply}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    setAuthBusy(true);
    setError(null);
    try {
      await postJson(`/api/admin/agent/tickets/${selectedTicket}/note`, { body });
      setNote('Agent findings posted as an internal note on the ticket.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post the note');
    } finally {
      setAuthBusy(false);
    }
  }

  const kinetix = status?.kinetix;

  return (
    <div className="space-y-6">
      {/* Safety / governance banner */}
      <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
        <p className="text-sm text-teal-900">
          <span className="font-bold">Decision support, with a human in the loop.</span> The agent analyses and
          drafts only. It cannot deploy, change configuration, or push code, and it never contacts a requester or
          edits a ticket until you explicitly authorize the action here.
        </p>
      </div>

      {/* Status header */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-teal-700" />
              <h2 className="font-bold text-slate-950">Agent</h2>
            </div>
            {configured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                <CircleAlert className="h-3.5 w-3.5" /> Not configured
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {configured ? (
              <>Model <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">{status?.model}</code></>
            ) : (
              <>Set <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">REHABSYNC_ANTHROPIC_API_KEY</code> to enable Claude-backed analysis.</>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ServerCog className="h-5 w-5 text-teal-700" />
              <h2 className="font-bold text-slate-950">Kinetix</h2>
            </div>
            <button
              type="button"
              onClick={() => void refreshStatus()}
              disabled={refreshing}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Re-check
            </button>
          </div>
          <p className="mt-2 text-sm">
            {!kinetix?.configured ? (
              <span className="font-semibold text-slate-500">Not configured</span>
            ) : kinetix.operational ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" /> Down / unreachable
              </span>
            )}
            {kinetix?.checkedAt && (
              <span className="ml-2 text-xs text-slate-400">
                checked {new Date(kinetix.checkedAt).toLocaleTimeString('en-GB')}
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Kinetix maintenance */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-teal-700" />
            <h2 className="font-bold text-slate-950">Kinetix maintenance</h2>
          </div>
          <button
            type="button"
            onClick={() => void diagnoseKinetix()}
            disabled={!configured || kinetixBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {kinetixBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            {kinetixBusy ? 'Diagnosing…' : 'Diagnose Kinetix'}
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Ask the agent to assess the live Kinetix state and produce a remediation runbook when it is down.
        </p>
        {kinetixAnalysis && <AnalysisCard analysis={kinetixAnalysis} />}
      </section>

      {/* Support triage */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-teal-700" />
          <h2 className="font-bold text-slate-950">Support triage</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Pick a ticket and let the agent investigate likely root causes and draft a reply. Nothing is sent
          until you authorize it.
        </p>

        {initialTickets.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No support tickets in the queue.</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={selectedTicket}
              onChange={(e) => {
                setSelectedTicket(e.target.value);
                setTicketAnalysis(null);
                setNote(null);
              }}
              className="min-w-[260px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {initialTickets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ticketNumber} · {t.subject} ({t.importance})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void diagnoseTicket()}
              disabled={!configured || ticketBusy || !selectedTicket}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {ticketBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              {ticketBusy ? 'Investigating…' : 'Investigate'}
            </button>
          </div>
        )}

        {ticketAnalysis && (
          <>
            <AnalysisCard analysis={ticketAnalysis} />
            {ticketAnalysis.suggestedReply && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Draft reply</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{ticketAnalysis.suggestedReply}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void authorizeNote()}
                disabled={authBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
              >
                {authBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Authorize &amp; post as internal note
              </button>
              <span className="text-xs text-slate-500">Posts the findings to the ticket thread (internal, staff-only).</span>
            </div>
            {note && (
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> {note}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: Analysis }) {
  const sev = SEVERITY_STYLE[analysis.severity];
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ backgroundColor: sev.bg, color: sev.fg }}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> {sev.label} severity
        </span>
        <span className="text-xs text-slate-400">
          {analysis.model} · {new Date(analysis.generatedAt).toLocaleTimeString('en-GB')}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-800">{analysis.summary}</p>

      {analysis.rootCauseHypotheses.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Likely root causes</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {analysis.rootCauseHypotheses.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        </div>
      )}

      {analysis.remediationSteps.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Remediation runbook</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {analysis.remediationSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-4 text-xs italic text-slate-400">
        Generated suggestions — review before acting. The agent has made no changes.
      </p>
    </div>
  );
}
