'use client';

import React, { useState } from 'react';
import { Badge, Card } from '@rs/ui';

interface ExportJob {
  id: string;
  exportType: string;
  patientId: string | null;
  status: string;
  requestedAt: string | null;
  completedAt: string | null;
}
interface Receipt {
  subjectId: string;
  tenantId: string;
  erasedAt: string;
  physicallyRemoved: boolean | null;
  erasedBy: string;
}

export function TenantDsarPanel({ tenantId }: { tenantId: string }) {
  const [subjectId, setSubjectId] = useState('');
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [busy, setBusy] = useState<'export' | 'jobs' | 'erase' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // Erasure is guarded: reveal the flow, then require the exact subject id typed back.
  const [eraseOpen, setEraseOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const base = `/api/admin/tenants/${tenantId}/dsar`;

  async function loadJobs() {
    setBusy('jobs');
    setError(null);
    try {
      const res = await fetch(`${base}/jobs`);
      const d = (await res.json().catch(() => null)) as ExportJob[] | { error?: string } | null;
      if (!res.ok || !Array.isArray(d)) setError((d as { error?: string })?.error ?? 'Could not load export jobs.');
      else setJobs(d);
    } finally {
      setBusy(null);
    }
  }

  async function requestExport() {
    if (!subjectId.trim()) {
      setError('Enter the subject (patient) id first.');
      return;
    }
    setBusy('export');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${base}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: subjectId.trim() }),
      });
      const d = (await res.json().catch(() => null)) as { jobId?: string; error?: string } | null;
      if (!res.ok) setError(d?.error ?? 'Export request failed.');
      else {
        setNotice('Export requested — it processes in the background. Refresh jobs for the download link.');
        loadJobs();
      }
    } finally {
      setBusy(null);
    }
  }

  async function download(jobId: string) {
    const res = await fetch(`${base}/jobs/${jobId}/download`);
    const d = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (res.ok && d?.url) window.open(d.url, '_blank', 'noopener,noreferrer');
    else setError(d?.error ?? 'No download available yet.');
  }

  async function erase() {
    setBusy('erase');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`${base}/erase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: subjectId.trim(), confirm: confirmText.trim() }),
      });
      const d = (await res.json().catch(() => null)) as { receipt?: Receipt; error?: string } | null;
      if (!res.ok || !d?.receipt) {
        setError(d?.error ?? 'Erasure failed.');
        return;
      }
      setReceipt(d.receipt);
      setEraseOpen(false);
      setConfirmText('');
      setNotice('Subject data erased. Receipt recorded in the audit log.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="GDPR data subject requests" description="Subject-access export and right-to-erasure for one patient (super admin only).">
      {error && <p className="text-sm mb-2" style={{ color: 'var(--color-error-text, #b91c1c)' }}>{error}</p>}
      {notice && <p className="text-sm mb-2" style={{ color: 'var(--color-success-text, #0f766e)' }}>{notice}</p>}

      <div className="flex items-end gap-2 flex-wrap mb-4">
        <div className="flex-1 min-w-[16rem]">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Subject (patient) id</label>
          <input
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setEraseOpen(false); setReceipt(null); }}
            placeholder="patient UUID"
            className="block w-full rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ backgroundColor: 'var(--bg-input, #fff)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
          />
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={requestExport}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary, #0d9488)' }}
        >
          {busy === 'export' ? 'Requesting…' : 'Export subject data'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={loadJobs}
          className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
        >
          Refresh jobs
        </button>
      </div>

      {jobs.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                <th className="py-2 pr-3">Job</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Requested</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t" style={{ borderColor: 'var(--border-secondary, #f1f5f9)' }}>
                  <td className="py-2 pr-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{j.id.slice(0, 10)}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-secondary)' }}>{j.exportType}</td>
                  <td className="py-2 pr-3"><Badge variant={j.status === 'completed' ? 'success' : j.status === 'failed' ? 'error' : 'info'}>{j.status}</Badge></td>
                  <td className="py-2 pr-3" style={{ color: 'var(--text-secondary)' }}>{j.requestedAt ? new Date(j.requestedAt).toLocaleString('en-GB') : '—'}</td>
                  <td className="py-2">
                    {j.status === 'completed' && (
                      <button type="button" onClick={() => download(j.id)} className="text-xs underline" style={{ color: 'var(--brand-primary, #0d9488)' }}>Download</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipt && (
        <div className="rounded-lg border p-3 mb-4" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Erasure receipt</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Subject <span className="font-mono">{receipt.subjectId}</span> erased {new Date(receipt.erasedAt).toLocaleString('en-GB')} by {receipt.erasedBy}
            {receipt.physicallyRemoved === false ? ' (row anonymised — retained for referential integrity)' : ''}.
          </p>
        </div>
      )}

      {/* Right-to-erasure — irreversible, gated behind a typed confirmation. */}
      <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-error, #dc2626)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-error-text, #b91c1c)' }}>Right to erasure (irreversible)</p>
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Permanently erases this patient&apos;s clinical records. A legal hold blocks erasure. This cannot be undone.
        </p>
        {!eraseOpen ? (
          <button
            type="button"
            disabled={!subjectId.trim()}
            onClick={() => setEraseOpen(true)}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: 'var(--color-error, #dc2626)', color: 'var(--color-error-text, #b91c1c)' }}
          >
            Begin erasure…
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs" style={{ color: 'var(--text-secondary)' }}>
              Type the subject id <span className="font-mono">{subjectId.trim()}</span> to confirm:
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="block w-full rounded-lg border px-3 py-2 text-sm font-mono"
              style={{ backgroundColor: 'var(--bg-input, #fff)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy !== null || confirmText.trim() !== subjectId.trim()}
                onClick={erase}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-error, #dc2626)' }}
              >
                {busy === 'erase' ? 'Erasing…' : 'Permanently erase'}
              </button>
              <button type="button" onClick={() => { setEraseOpen(false); setConfirmText(''); }} className="text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
