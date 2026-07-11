'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Globe,
  FileText,
  AlertTriangle,
  Loader2,
  Plus,
  XCircle,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Boxes,
} from 'lucide-react';
import { AnatomyFigure } from '@/components/anatomy/AnatomyFigure';

export interface KbOverview {
  topics: { specialties: number; conditions: number; modalities: number; services: number; total: number };
  sources: { approved: number; pending: number; rejected: number };
  articles: number;
  guardrails: number;
}

export interface KbCondition {
  id: string;
  name: string;
  slug: string;
}
export interface KbSpecialty {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  conditions: KbCondition[];
}
export interface KbTopics {
  specialties: KbSpecialty[];
  modalityGroups: Record<string, Array<{ id: string; name: string }>>;
  services: Array<{ id: string; name: string; slug: string }>;
}

export interface KbSource {
  id: string;
  title: string;
  url: string;
  publisher: string | null;
  licenseType: string | null;
  licenseUrl: string | null;
  permissive: boolean;
  status: 'approved' | 'pending' | 'rejected';
  requestedByName: string | null;
  reviewedByName: string | null;
  notes: string | null;
  createdAt: string;
}

interface Guardrail {
  id: string;
  title: string;
  description: string;
}
interface ScrapeResult {
  url: string;
  host: string;
  title: string | null;
  permissive: boolean;
  licenseType: string | null;
  licenseUrl: string | null;
  fetchError: string | null;
  warning: string | null;
}
interface SafeguardResult {
  question: string;
  verdict: 'allow' | 'decline' | 'caution';
  reasons: string[];
  guardrails: Guardrail[];
}

type Tab = 'overview' | 'topics' | 'sources' | 'content' | 'scrape' | 'safeguarding' | 'settings';

const TABS: Array<{ key: Tab; label: string; icon: typeof BookOpen }> = [
  { key: 'overview', label: 'Overview', icon: BookOpen },
  { key: 'topics', label: 'Topics', icon: FileText },
  { key: 'sources', label: 'Sources', icon: Globe },
  { key: 'content', label: 'Add content', icon: Plus },
  { key: 'scrape', label: 'Scrape check', icon: AlertTriangle },
  { key: 'safeguarding', label: 'Safeguarding', icon: ShieldCheck },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

const SAFEGUARD_EXAMPLES = [
  'What are the phases of ACL rehabilitation?',
  'When can my patient Jane Smith, DOB 1990-04-12, return to running?',
  'What is the weather in London today?',
  'Diagnose what is wrong with this knee and prescribe the exact dose.',
];

async function kbFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api/admin/knowledgebase/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
}

export function KnowledgebaseManager({
  initialOverview,
  initialTopics,
  initialSources,
}: {
  initialOverview: KbOverview | null;
  initialTopics: KbTopics | null;
  initialSources: KbSource[];
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [sources, setSources] = useState<KbSource[]>(initialSources);
  const overview = initialOverview;
  const topics = initialTopics;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === key ? 'var(--bg-card)' : 'transparent',
              color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === key ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === 'sources' && overview && overview.sources.pending > 0 && (
              <span className="ml-1 rounded-full px-1.5 text-[11px] font-semibold" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
                {overview.sources.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab overview={overview} sources={sources} />}
      {tab === 'topics' && <TopicsTab topics={topics} />}
      {tab === 'sources' && <SourcesTab sources={sources} setSources={setSources} />}
      {tab === 'content' && <ContentTab topics={topics} sources={sources} />}
      {tab === 'scrape' && <ScrapeTab onWhitelisted={(s) => setSources((prev) => [s, ...prev])} />}
      {tab === 'safeguarding' && <SafeguardingTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────
function OverviewTab({ overview, sources }: { overview: KbOverview | null; sources: KbSource[] }) {
  if (!overview) return <Empty>Overview unavailable — the API could not be reached.</Empty>;
  const pending = sources.filter((s) => s.status === 'pending').length;
  const cards: Array<{ label: string; value: number | string; hint?: string }> = [
    { label: 'Specialties', value: overview.topics.specialties },
    { label: 'Conditions', value: overview.topics.conditions },
    { label: 'Treatment modalities', value: overview.topics.modalities },
    { label: 'Specialist services', value: overview.topics.services },
    { label: 'Approved sources', value: overview.sources.approved },
    { label: 'Pending requests', value: pending, hint: pending > 0 ? 'needs review' : undefined },
    { label: 'Content entries', value: overview.articles },
    { label: 'Active guardrails', value: overview.guardrails },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
          <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
          {card.hint && <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--color-warning-text)' }}>{card.hint}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Topics (encyclopedia browse) ─────────────────────────────────────────────
function TopicsTab({ topics }: { topics: KbTopics | null }) {
  if (!topics) return <Empty>Topics unavailable — the API could not be reached.</Empty>;
  return (
    <div className="space-y-5">
      <Section title="Specialties & conditions">
        <div className="grid gap-3 lg:grid-cols-2">
          {topics.specialties.map((specialty) => (
            <div key={specialty.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{specialty.name}</h4>
              {specialty.description && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{specialty.description}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {specialty.conditions.map((condition) => (
                  <Chip key={condition.id}>{condition.name}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Treatment modalities">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(topics.modalityGroups).map(([group, items]) => (
            <div key={group} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{group}</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <Chip key={item.id}>{item.name}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Specialist services">
        <div className="flex flex-wrap gap-1.5">
          {topics.services.map((service) => (
            <Chip key={service.id}>{service.name}</Chip>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Sources (whitelist + requests) ───────────────────────────────────────────
function SourcesTab({ sources, setSources }: { sources: KbSource[]; setSources: (fn: (prev: KbSource[]) => KbSource[]) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const pending = sources.filter((s) => s.status === 'pending');
  const approved = sources.filter((s) => s.status === 'approved');
  const rejected = sources.filter((s) => s.status === 'rejected');

  async function review(id: string, status: 'approved' | 'rejected') {
    setBusy(id);
    try {
      const res = await kbFetch(`sources/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (res.ok) {
        const updated = (await res.json()) as KbSource;
        setSources((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <Section title={`Pending requests (${pending.length})`}>
          <div className="space-y-2">
            {pending.map((source) => (
              <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--color-warning-bg)' }}>
                <SourceInfo source={source} />
                <div className="flex gap-2">
                  <button type="button" disabled={busy === source.id} onClick={() => review(source.id, 'approved')} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--brand-primary)' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button type="button" disabled={busy === source.id} onClick={() => review(source.id, 'rejected')} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Approved sources (${approved.length})`}>
        {approved.length === 0 ? (
          <Empty>No approved sources yet. Use the Scrape-check tab to vet a page, then whitelist it.</Empty>
        ) : (
          <div className="space-y-2">
            {approved.map((source) => (
              <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                <SourceInfo source={source} />
                <button type="button" disabled={busy === source.id} onClick={() => review(source.id, 'rejected')} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {rejected.length > 0 && (
        <Section title={`Rejected (${rejected.length})`}>
          <div className="space-y-2">
            {rejected.map((source) => (
              <div key={source.id} className="flex items-center justify-between gap-3 rounded-xl p-4 opacity-70" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                <SourceInfo source={source} />
                <button type="button" disabled={busy === source.id} onClick={() => review(source.id, 'approved')} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--brand-primary)' }}>
                  Restore
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SourceInfo({ source }: { source: KbSource }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>
          {source.title}
        </a>
        {source.permissive ? (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>Open licence</span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>Licence unverified</span>
        )}
      </div>
      <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
        {source.licenseType ?? 'Unknown licence'}
        {source.publisher ? ` · ${source.publisher}` : ''}
        {source.requestedByName ? ` · requested by ${source.requestedByName}` : ''}
      </p>
    </div>
  );
}

// ── Add content ──────────────────────────────────────────────────────────────
function ContentTab({ topics, sources }: { topics: KbTopics | null; sources: KbSource[] }) {
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [contentType, setContentType] = useState<'text' | 'link' | 'document' | 'video' | 'image'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [body, setBody] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [anatomyRegions, setAnatomyRegions] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const specialties = topics?.specialties ?? [];
  const approvedSources = sources.filter((s) => s.status === 'approved');

  function toggleRegion(id: string) {
    setAnatomyRegions((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function submit() {
    setStatus('saving');
    setMessage('');
    try {
      const res = await kbFetch('articles', {
        method: 'POST',
        body: JSON.stringify({
          title,
          topicId: topicId || null,
          contentType,
          mediaUrl: mediaUrl || undefined,
          body: body || undefined,
          sourceId: sourceId || null,
          anatomyRegions: anatomyRegions.length ? anatomyRegions : undefined,
        }),
      });
      if (res.ok) {
        setStatus('saved');
        setTitle('');
        setMediaUrl('');
        setBody('');
        setSourceId('');
        setAnatomyRegions([]);
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        setStatus('error');
        setMessage(err.message ?? 'Could not save the entry.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error.');
    }
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Add an encyclopedia entry — text, a link, a document, a video or an image. Attaching an
        approved source cites it; uncited entries are original content.
      </p>
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="kb-input" placeholder="e.g. ACL reconstruction rehab phases" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Topic (optional)">
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="kb-input">
            <option value="">— None —</option>
            {specialties.map((s) => (
              <optgroup key={s.id} label={s.name}>
                <option value={s.id}>{s.name} (specialty)</option>
                {s.conditions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Content type">
          <select value={contentType} onChange={(e) => setContentType(e.target.value as typeof contentType)} className="kb-input">
            <option value="text">Text</option>
            <option value="link">Link</option>
            <option value="document">Document</option>
            <option value="video">Video</option>
            <option value="image">Image</option>
          </select>
        </Field>
      </div>
      {contentType !== 'text' && (
        <Field label="Media / link URL">
          <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="kb-input" placeholder="https://…" />
        </Field>
      )}
      <Field label="Body (markdown)">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="kb-input" placeholder="Write the entry…" />
      </Field>
      <Field label="Cite an approved source (optional)">
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="kb-input">
          <option value="">— Uncited (original content) —</option>
          {approvedSources.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </Field>
      <Field label={`Applicable anatomy (${anatomyRegions.length} selected — click regions)`}>
        <AnatomyFigure active={anatomyRegions} onSelectRegion={toggleRegion} interactive view="both" height={360} />
      </Field>
      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={status === 'saving' || !title.trim()} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--brand-primary)' }}>
          {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save entry
        </button>
        {status === 'saved' && <span className="text-sm" style={{ color: 'var(--color-success-text)' }}>Saved.</span>}
        {status === 'error' && <span className="text-sm" style={{ color: 'var(--color-error-text)' }}>{message}</span>}
      </div>
      <style jsx>{`
        :global(.kb-input) {
          width: 100%;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background-color: var(--bg-input);
          border: 1px solid var(--border-primary);
          color: var(--text-primary);
          outline: none;
        }
      `}</style>
    </div>
  );
}

// ── Scrape check ──────────────────────────────────────────────────────────────
function ScrapeTab({ onWhitelisted }: { onWhitelisted: (source: KbSource) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [added, setAdded] = useState(false);

  async function check() {
    setLoading(true);
    setResult(null);
    setAdded(false);
    try {
      const res = await kbFetch('scrape-check', { method: 'POST', body: JSON.stringify({ url }) });
      if (res.ok) setResult((await res.json()) as ScrapeResult);
    } finally {
      setLoading(false);
    }
  }

  async function whitelist() {
    if (!result) return;
    const res = await kbFetch('sources', {
      method: 'POST',
      body: JSON.stringify({
        title: result.title ?? result.host,
        url: result.url,
        publisher: result.host,
        licenseType: result.licenseType ?? undefined,
        licenseUrl: result.licenseUrl ?? undefined,
        permissive: result.permissive,
        status: 'approved',
      }),
    });
    if (res.ok) {
      onWhitelisted((await res.json()) as KbSource);
      setAdded(true);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Check a page for an open / re-use-friendly licence before ingesting it. This only reads the
          page — nothing is stored until you whitelist it.
        </p>
        <div className="mt-3 flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
          <button type="button" onClick={check} disabled={loading || !url.trim()} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--brand-primary)' }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Check licence
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${result.permissive ? 'var(--color-success-bg)' : 'var(--color-warning-bg)'}` }}>
          <div className="flex items-center gap-2">
            {result.permissive ? (
              <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--color-success-text)' }} />
            ) : (
              <AlertTriangle className="h-5 w-5" style={{ color: 'var(--color-warning-text)' }} />
            )}
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {result.permissive ? 'Open licence detected' : 'No open licence detected'}
            </h4>
          </div>
          {result.title && <p className="mt-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{result.title}</p>}
          <dl className="mt-2 space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div>Host: <span className="font-mono">{result.host}</span></div>
            <div>Licence: {result.licenseType ?? 'unknown'}</div>
            {result.licenseUrl && <div>Licence URL: <a href={result.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{result.licenseUrl}</a></div>}
          </dl>
          {result.warning && (
            <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
              ⚠️ {result.warning}
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={whitelist} disabled={added} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: result.permissive ? 'var(--brand-primary)' : 'var(--color-warning-text)' }}>
              {added ? 'Added to whitelist' : result.permissive ? 'Add to whitelist' : 'Add anyway (I hold re-use rights)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Safeguarding ──────────────────────────────────────────────────────────────
function SafeguardingTab() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SafeguardResult | null>(null);

  async function test(q?: string) {
    const query = q ?? question;
    if (!query.trim()) return;
    setQuestion(query);
    setLoading(true);
    setResult(null);
    try {
      const res = await kbFetch('safeguard-test', { method: 'POST', body: JSON.stringify({ question: query }) });
      if (res.ok) setResult((await res.json()) as SafeguardResult);
    } finally {
      setLoading(false);
    }
  }

  const verdictStyle = (verdict: string) =>
    verdict === 'decline'
      ? { bg: 'var(--color-error-bg)', fg: 'var(--color-error-text)', label: 'Declined' }
      : verdict === 'caution'
        ? { bg: 'var(--color-warning-bg)', fg: 'var(--color-warning-text)', label: 'Answered with caution' }
        : { bg: 'var(--color-success-bg)', fg: 'var(--color-success-text)', label: 'Allowed' };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI safeguards</h3>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>Enforced on every tenant knowledgebase query.</p>
        <div className="space-y-2">
          {(result?.guardrails ?? DEFAULT_GUARDRAILS).map((g) => (
            <div key={g.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} /> {g.title}
              </div>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{g.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Test the safeguards</h3>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>Dry-run a prospective question against the decline logic.</p>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="Type a question to test…" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SAFEGUARD_EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => test(example)} className="rounded-full px-2.5 py-1 text-[11px]" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              {example.length > 40 ? `${example.slice(0, 40)}…` : example}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => test()} disabled={loading || !question.trim()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--brand-primary)' }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Run test
        </button>

        {result && (
          <div className="mt-4">
            <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: verdictStyle(result.verdict).bg, color: verdictStyle(result.verdict).fg }}>
              {verdictStyle(result.verdict).label}
            </span>
            <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {result.reasons.map((reason, index) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_GUARDRAILS: Guardrail[] = [
  { id: 'cite_sources', title: 'Always cite sources', description: 'Answers are grounded in whitelisted, licensed sources and carry citations.' },
  { id: 'refuse_weak', title: 'Refuse on weak retrieval', description: 'Declines rather than guessing when confidence is too low.' },
  { id: 'no_pii', title: 'Reject patient identifiers', description: 'Questions with identifiers are refused.' },
  { id: 'decision_support', title: 'Decision-support only', description: 'Never a definitive diagnosis or prescription.' },
  { id: 'in_scope', title: 'Stay in clinical scope', description: 'Off-topic requests are declined.' },
];

// ── Settings (image generation) ──────────────────────────────────────────────
interface KbSettings {
  imageGenEnabled: boolean;
  imageModel: string;
  imageCreditCost: number;
  imageActualCostPence: number;
  promptGuidance: string | null;
  anatomyModelUrl: string | null;
  anatomyAttribution: string | null;
  anatomyModels: Record<string, string> | null;
  pricePerCreditPence: number;
  imageRetailPence: number;
  marginPence: number;
}

interface ModelCheck {
  system: string;
  label: string;
  url: string;
  ok: boolean;
  status: number;
  contentType: string | null;
  sizeBytes: number | null;
  message: string | null;
}

function SettingsTab() {
  const [settings, setSettings] = useState<KbSettings | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<ModelCheck[] | null>(null);

  useEffect(() => {
    (async () => {
      const res = await kbFetch('settings');
      if (res.ok) setSettings((await res.json()) as KbSettings);
    })();
  }, []);

  async function testModels() {
    setChecking(true);
    setCheckResults(null);
    try {
      const res = await kbFetch('anatomy-models/check');
      setCheckResults(res.ok ? ((await res.json()) as { results: ModelCheck[] }).results : []);
    } catch {
      setCheckResults([]);
    } finally {
      setChecking(false);
    }
  }

  async function save() {
    if (!settings) return;
    setStatus('saving');
    const res = await kbFetch('settings', {
      method: 'PATCH',
      body: JSON.stringify({
        imageGenEnabled: settings.imageGenEnabled,
        imageModel: settings.imageModel,
        imageCreditCost: settings.imageCreditCost,
        imageActualCostPence: settings.imageActualCostPence,
        promptGuidance: settings.promptGuidance ?? '',
        anatomyModelUrl: settings.anatomyModelUrl ?? '',
        anatomyAttribution: settings.anatomyAttribution ?? '',
        anatomyModels: settings.anatomyModels ?? {},
      }),
    });
    if (res.ok) {
      setSettings((await res.json()) as KbSettings);
      setStatus('saved');
    } else {
      setStatus('error');
    }
  }

  if (!settings) return <Empty>Loading settings…</Empty>;
  const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;
  const marginOk = settings.marginPence > 0;

  return (
    <div className="max-w-2xl space-y-4 rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI image generation</h3>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Controls image generation for every tenant. Charged against the tenant&apos;s AI credits — keep the credit cost above our actual Gemini cost.
      </p>

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
        <input type="checkbox" checked={settings.imageGenEnabled} onChange={(e) => setSettings({ ...settings, imageGenEnabled: e.target.checked })} />
        Enable image generation
      </label>

      <Field label="Image model (Gemini)">
        <input value={settings.imageModel} onChange={(e) => setSettings({ ...settings, imageModel: e.target.value })} className="kb-input" placeholder="gemini-2.5-flash-image" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Credit cost charged per image">
          <input type="number" min={1} value={settings.imageCreditCost} onChange={(e) => setSettings({ ...settings, imageCreditCost: Number(e.target.value) })} className="kb-input" />
        </Field>
        <Field label="Our actual cost per image (pence)">
          <input type="number" min={0} value={settings.imageActualCostPence} onChange={(e) => setSettings({ ...settings, imageActualCostPence: Number(e.target.value) })} className="kb-input" />
        </Field>
      </div>

      <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: marginOk ? 'var(--color-success-bg)' : 'var(--color-warning-bg)', color: marginOk ? 'var(--color-success-text)' : 'var(--color-warning-text)' }}>
        Tenant pays ≈ <strong>{gbp(settings.imageRetailPence)}</strong> per image ({settings.imageCreditCost} credits @ {settings.pricePerCreditPence}p) · our cost {gbp(settings.imageActualCostPence)} ·
        margin <strong>{gbp(settings.marginPence)}</strong>{marginOk ? '' : ' — below cost! raise the credit cost.'}
      </div>

      <Field label="Extra prompt guidance (optional, appended to every image prompt)">
        <textarea value={settings.promptGuidance ?? ''} onChange={(e) => setSettings({ ...settings, promptGuidance: e.target.value })} rows={3} className="kb-input" placeholder="e.g. house illustration style, muted palette…" />
      </Field>

      <div className="border-t pt-4" style={{ borderColor: 'var(--border-secondary)' }}>
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>3D anatomy model</h3>
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          URL of a hosted GLB/GLTF anatomy model. Recommended: a{' '}
          <a href="https://www.z-anatomy.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--brand-primary)' }}>Z-Anatomy</a>{' '}
          export (CC BY-SA 4.0). When set, the knowledgebase offers a 3D view; otherwise it uses the 2D atlas. Attribution is required by the licence.
        </p>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>System models (GLB URLs)</p>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        One GLB per anatomical system — these become switchable layers in the 3D view. Leave blank to hide a system.
      </p>
      {([
        ['muscular', 'Muscular'],
        ['arthrology', 'Joints / skeletal'],
        ['neurology', 'Nervous'],
        ['angiology', 'Vascular'],
      ] as const).map(([key, label]) => (
        <Field key={key} label={label}>
          <input
            value={settings.anatomyModels?.[key] ?? ''}
            onChange={(e) => setSettings({ ...settings, anatomyModels: { ...(settings.anatomyModels ?? {}), [key]: e.target.value } })}
            className="kb-input"
            placeholder={`https://…/${key}.glb`}
          />
        </Field>
      ))}
      <Field label="Single combined model URL (optional fallback)">
        <input value={settings.anatomyModelUrl ?? ''} onChange={(e) => setSettings({ ...settings, anatomyModelUrl: e.target.value })} className="kb-input" placeholder="https://…/anatomy.glb" />
      </Field>
      <Field label="Attribution (shown under the 3D view)">
        <input value={settings.anatomyAttribution ?? ''} onChange={(e) => setSettings({ ...settings, anatomyAttribution: e.target.value })} className="kb-input" placeholder="3D model: Z-Anatomy, CC BY-SA 4.0" />
      </Field>

      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={testModels}
            disabled={checking}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)' }}
          >
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Boxes className="h-3.5 w-3.5" />}
            Test model URLs
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Fetches each saved GLB from the server and reports its real HTTP status (save first). A 400 usually means the file name is wrong or the Supabase bucket isn&apos;t public.
          </span>
        </div>
        {checkResults && (
          <ul className="mt-3 space-y-1.5">
            {checkResults.length === 0 && (
              <li className="text-xs" style={{ color: 'var(--text-muted)' }}>No models are configured to test.</li>
            )}
            {checkResults.map((r) => (
              <li key={r.system} className="flex items-start gap-2 text-xs">
                {r.ok ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-success-text)' }} />
                ) : (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-error-text)' }} />
                )}
                <div className="min-w-0">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.label}</span>{' '}
                  <span style={{ color: r.ok ? 'var(--color-success-text)' : 'var(--color-error-text)' }}>
                    {r.ok
                      ? `OK (HTTP ${r.status}${r.sizeBytes ? `, ${(r.sizeBytes / 1_000_000).toFixed(1)} MB` : ''})`
                      : `Failed (HTTP ${r.status || 'no response'})`}
                  </span>
                  {!r.ok && r.message && <span style={{ color: 'var(--text-muted)' }}> — {r.message}</span>}
                  <div className="break-all" style={{ color: 'var(--text-muted)' }}>{r.url}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={status === 'saving'} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--brand-primary)' }}>
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && <span className="text-sm" style={{ color: 'var(--color-success-text)' }}>Saved.</span>}
        {status === 'error' && <span className="text-sm" style={{ color: 'var(--color-error-text)' }}>Could not save.</span>}
      </div>
      <style jsx>{`
        :global(.kb-input) {
          width: 100%;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background-color: var(--bg-input);
          border: 1px solid var(--border-primary);
          color: var(--text-primary);
          outline: none;
        }
      `}</style>
    </div>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {children}
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)' }}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-8 text-center text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}>
      {children}
    </div>
  );
}
