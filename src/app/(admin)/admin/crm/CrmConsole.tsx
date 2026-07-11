'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  clinicName: string | null;
  stage: string;
  source: string;
  ownerName: string | null;
  estimatedValuePence: number | null;
  message: string | null;
  scheduledAt: string | null;
  meetingUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
interface Activity { id: string; type: string; body: string | null; actorName: string | null; createdAt: string }

const STAGES: Array<{ key: string; label: string }> = [
  { key: 'new', label: 'New lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'demo_scheduled', label: 'Demo scheduled' },
  { key: 'demo_completed', label: 'Demo completed' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'customer', label: 'Customer' },
  { key: 'churned', label: 'Churned' },
  { key: 'lost', label: 'Lost' },
];
const STAGE_LABEL = (k: string) => STAGES.find((s) => s.key === k)?.label ?? k;

function fmt(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function CrmConsole({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialContacts[0]?.id ?? null);
  const [detail, setDetail] = useState<{ contact: Contact; activities: Activity[] } | null>(null);
  const [note, setNote] = useState('');
  const [sched, setSched] = useState({ scheduledAt: '', meetingUrl: '' });
  const [busy, setBusy] = useState(false);

  const refreshList = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('stage', filter);
    if (search) params.set('search', search);
    const res = await fetch(`/api/admin/crm?${params}`, { cache: 'no-store' });
    if (res.ok) setContacts((await res.json()) as Contact[]);
  }, [filter, search]);

  useEffect(() => { void refreshList(); }, [refreshList]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/crm/${id}`, { cache: 'no-store' });
    if (res.ok) setDetail((await res.json()) as { contact: Contact; activities: Activity[] });
  }, []);

  useEffect(() => { if (selectedId) void loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  async function patch(body: Record<string, unknown>) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/crm/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await Promise.all([loadDetail(selectedId), refreshList()]);
    } finally { setBusy(false); }
  }

  async function addNote() {
    if (!selectedId || !note.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/crm/${selectedId}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: note }) });
      setNote('');
      await loadDetail(selectedId);
    } finally { setBusy(false); }
  }

  async function schedule() {
    if (!selectedId || !sched.scheduledAt) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/crm/${selectedId}/schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sched) });
      setSched({ scheduledAt: '', meetingUrl: '' });
      await Promise.all([loadDetail(selectedId), refreshList()]);
    } finally { setBusy(false); }
  }

  const counts = STAGES.map((s) => ({ ...s, n: contacts.filter((c) => c.stage === s.key).length }));
  const card = 'rounded-xl p-4';
  const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' } as const;

  return (
    <div>
      {/* Pipeline counts */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setFilter('all')} className="px-3 py-1.5 rounded-full text-xs font-semibold"
          style={filter === 'all' ? { background: 'var(--brand-primary)', color: '#fff' } : { background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
          All · {contacts.length}
        </button>
        {counts.map((s) => (
          <button key={s.key} onClick={() => setFilter(s.key)} className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={filter === s.key ? { background: 'var(--brand-primary)', color: '#fff' } : { background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
            {s.label} · {s.n}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* List */}
        <div className={card} style={cardStyle}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, clinic…"
            className="w-full rounded-md px-3 py-2 text-sm mb-3"
            style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
          />
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No contacts.</p>
            ) : contacts.map((c) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)} className="w-full text-left rounded-lg p-3 transition-colors"
                style={{ background: selectedId === c.id ? 'var(--bg-hover)' : 'transparent', border: `1px solid ${selectedId === c.id ? 'var(--brand-primary)' : 'var(--border-secondary)'}` }}>
                <div className="flex justify-between items-center gap-2">
                  <strong className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</strong>
                  <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{STAGE_LABEL(c.stage)}</span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.clinicName ?? c.email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        {detail ? (
          <div className={card} style={cardStyle}>
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{detail.contact.name}</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{detail.contact.email}{detail.contact.phone ? ` · ${detail.contact.phone}` : ''}</p>
                {detail.contact.clinicName && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{detail.contact.clinicName}</p>}
              </div>
              <select value={detail.contact.stage} onChange={(e) => void patch({ stage: e.target.value })} disabled={busy}
                className="rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            {detail.contact.message && (
              <blockquote className="mt-3 text-sm p-3 rounded-lg" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', borderLeft: '3px solid var(--brand-primary)' }}>{detail.contact.message}</blockquote>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              <label className="block">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Owner (sales)</span>
                <input defaultValue={detail.contact.ownerName ?? ''} onBlur={(e) => e.target.value !== (detail.contact.ownerName ?? '') && void patch({ ownerName: e.target.value || null })}
                  className="w-full rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
              </label>
              <label className="block">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. value (£)</span>
                <input type="number" min={0} defaultValue={detail.contact.estimatedValuePence != null ? Math.round(detail.contact.estimatedValuePence / 100) : ''}
                  onBlur={(e) => void patch({ estimatedValuePence: e.target.value ? Number(e.target.value) * 100 : null })}
                  className="w-full rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
              </label>
            </div>

            {/* Schedule a demo */}
            <div className="mt-4 p-3 rounded-lg" style={{ border: '1px solid var(--border-secondary)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Schedule a demo call</p>
              <div className="flex gap-2 flex-wrap items-end">
                <input type="datetime-local" value={sched.scheduledAt} onChange={(e) => setSched((s) => ({ ...s, scheduledAt: e.target.value }))}
                  className="rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
                <input value={sched.meetingUrl} onChange={(e) => setSched((s) => ({ ...s, meetingUrl: e.target.value }))} placeholder="Meeting link (optional)"
                  className="flex-1 rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
                <button onClick={() => void schedule()} disabled={busy || !sched.scheduledAt} className="px-3 py-2 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>Book + email</button>
              </div>
              {detail.contact.scheduledAt && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Booked for {fmt(detail.contact.scheduledAt)}{detail.contact.meetingUrl ? ` · ${detail.contact.meetingUrl}` : ''}</p>
              )}
            </div>

            {/* Add note */}
            <div className="mt-4">
              <div className="flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…"
                  onKeyDown={(e) => { if (e.key === 'Enter') void addNote(); }}
                  className="flex-1 rounded-md px-3 py-2 text-sm" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
                <button onClick={() => void addNote()} disabled={busy || !note.trim()} className="px-3 py-2 rounded-md text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}>Add</button>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-4 space-y-2 max-h-[30vh] overflow-y-auto">
              {detail.activities.map((a) => (
                <div key={a.id} className="text-xs flex gap-2">
                  <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>{fmt(a.createdAt)}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{a.body}{a.actorName ? ` — ${a.actorName}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={card} style={cardStyle}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a contact to view their pipeline.</p>
          </div>
        )}
      </div>
    </div>
  );
}
