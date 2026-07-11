'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@rs/ui';
import { MarkdownText } from '@/components/MarkdownText';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'maintenance' | 'critical';
  targetAudience: 'consultants' | 'clients' | 'clinic_admins' | 'all';
  showInBanner?: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  initialBroadcasts: Broadcast[];
}

const AUDIENCE_LABEL: Record<Broadcast['targetAudience'], string> = {
  consultants: 'Consultants',
  clients: 'Clients',
  clinic_admins: 'Clinic admins',
  all: 'Consultants + clients',
};

const LEVEL_LABEL: Record<Broadcast['level'], string> = {
  info: 'Info',
  maintenance: 'Maintenance',
  critical: 'Critical',
};

export function BroadcastManager({ initialBroadcasts }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<Broadcast['level']>('maintenance');
  const [targetAudience, setTargetAudience] = useState<Broadcast['targetAudience']>('all');
  const [showInBanner, setShowInBanner] = useState(false);
  const [emailAdmins, setEmailAdmins] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string = before) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = message.slice(start, end);
    setMessage(`${message.slice(0, start)}${before}${selected}${after}${message.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  }

  function insertLinePrefix(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = message.lastIndexOf('\n', start - 1) + 1;
    setMessage(`${message.slice(0, lineStart)}${prefix}${message.slice(lineStart)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          level,
          targetAudience,
          notify: true,
          showInBanner,
          emailAdmins,
        }),
      });
      if (!res.ok) throw new Error(`Failed to create broadcast (${res.status})`);
      setTitle('');
      setMessage('');
      setTargetAudience('all');
      setShowInBanner(false);
      setEmailAdmins(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create broadcast');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(b: Broadcast) {
    setBusy(true);
    try {
      await fetch(`/api/admin/broadcasts/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'w-full rounded-md border px-3 py-2 text-sm';
  const inputStyle = {
    backgroundColor: 'var(--bg-input)',
    borderColor: 'var(--border-primary)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card title="New broadcast">
        <form onSubmit={create} className="space-y-3 p-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Scheduled maintenance)"
            className={inputClass}
            style={inputStyle}
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <ToolbarButton label="Bold" onClick={() => wrapSelection('**')}>
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton label="Italic" onClick={() => wrapSelection('_')}>
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton label="Link" onClick={() => wrapSelection('[', '](https://)')}>
                🔗
              </ToolbarButton>
              <ToolbarButton label="Bullet list" onClick={() => insertLinePrefix('- ')}>
                •
              </ToolbarButton>
              <ToolbarButton label="Heading" onClick={() => insertLinePrefix('### ')}>
                H
              </ToolbarButton>
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                className="ml-auto rounded-md px-2 py-1 text-xs font-semibold"
                style={{ border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div
                className="min-h-[88px] rounded-md border px-3 py-2 text-sm"
                style={{ ...inputStyle, borderColor: 'var(--border-primary)' }}
              >
                {message.trim() ? (
                  <MarkdownText text={message} />
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Nothing to preview yet.</span>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message shown in the notification"
                rows={4}
                className={inputClass}
                style={inputStyle}
              />
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Supports basic markdown — bold, italics, links, and lists.
            </p>
          </div>
          <select
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value as Broadcast['targetAudience'])}
            className={inputClass}
            style={inputStyle}
          >
            <option value="all">Consultants + clients</option>
            <option value="consultants">Consultants</option>
            <option value="clients">Clients</option>
            <option value="clinic_admins">Clinic admins (tenant admins)</option>
          </select>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Broadcast['level'])}
            className={inputClass}
            style={inputStyle}
          >
            <option value="info">Info</option>
            <option value="maintenance">Maintenance</option>
            <option value="critical">Critical</option>
          </select>

          <div className="space-y-2 rounded-md border p-3" style={{ borderColor: 'var(--border-primary)' }}>
            <label className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={showInBanner}
                onChange={(e) => setShowInBanner(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Show as site banner
                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                  Pins a dismissible banner across the app — for new features, maintenance windows, or service outages.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={emailAdmins}
                onChange={(e) => setEmailAdmins(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Email clinic admins
                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                  Also sends this notice to every tenant&apos;s clinic-admin email addresses.
                </span>
              </span>
            </label>
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Broadcasts reach recipients&apos; notification bells and browser push (when enabled){showInBanner ? ', plus the site banner' : ''}{emailAdmins ? ', plus clinic-admin email' : ''}.
          </p>
          {error && (
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !title.trim() || !message.trim()}
            className="w-full rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {busy ? 'Publishing…' : 'Publish broadcast'}
          </button>
        </form>
      </Card>

      <Card title="Broadcasts">
        {initialBroadcasts.length === 0 ? (
          <p className="p-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            No broadcasts yet.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
            {initialBroadcasts.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {b.title}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {LEVEL_LABEL[b.level]} · {AUDIENCE_LABEL[b.targetAudience ?? 'all']}
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <MarkdownText text={b.message} />
                  </div>
                </div>
                {b.showInBanner ? (
                  <button
                    type="button"
                    onClick={() => toggle(b)}
                    disabled={busy}
                    className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold"
                    style={{
                      border: '1px solid var(--border-primary)',
                      color: b.isActive ? 'var(--color-success)' : 'var(--text-muted)',
                    }}
                  >
                    {b.isActive ? 'Banner active — deactivate' : 'Banner inactive — activate'}
                  </button>
                ) : (
                  <span
                    className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold"
                    style={{ border: '1px solid var(--border-primary)', color: 'var(--text-muted)' }}
                  >
                    Notification only
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-md px-2 py-1 text-xs"
      style={{ border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  );
}
