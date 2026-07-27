'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card } from '@rs/ui';

export interface TenantEmbedSettingsView {
  tenantId: string;
  embedAvailable: boolean;
  enabled: boolean;
  configured: boolean;
  publicKey: string | null;
  allowedOrigins: string[];
  headline: string | null;
  showPrices: boolean;
  showDurations: boolean;
  ctaLabel: string;
  bookingUrl: string | null;
  theme: 'auto' | 'light' | 'dark';
  accentColor: string | null;
  activeServiceCount: number;
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-2 cursor-pointer">
      <span>
        <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>
        {hint && <span className="block text-xs text-[var(--text-secondary)]">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
        style={{ backgroundColor: checked ? '#0d9488' : '#94a3b8' }}
      >
        <span
          className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    </label>
  );
}

function normaliseOriginInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.origin;
  } catch {
    /* invalid */
  }
  return null;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded-md border px-2.5 py-1 text-xs font-medium border-[var(--border-primary)] text-[var(--text-secondary)]"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

export function TenantEmbedSettings({
  tenantId,
  data,
  embedBaseUrl,
}: {
  tenantId: string;
  data: TenantEmbedSettingsView;
  embedBaseUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [enabled, setEnabled] = useState(data.enabled);
  const [origins, setOrigins] = useState<string[]>(data.allowedOrigins);
  const [originDraft, setOriginDraft] = useState('');
  const [originError, setOriginError] = useState<string | null>(null);
  const [headline, setHeadline] = useState(data.headline ?? '');
  const [showPrices, setShowPrices] = useState(data.showPrices);
  const [showDurations, setShowDurations] = useState(data.showDurations);
  const [ctaLabel, setCtaLabel] = useState(data.ctaLabel);
  const [bookingUrl, setBookingUrl] = useState(data.bookingUrl ?? '');
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>(data.theme);
  const [accentColor, setAccentColor] = useState(data.accentColor ?? '');
  const [publicKey, setPublicKey] = useState(data.publicKey);

  const base = embedBaseUrl.replace(/\/+$/, '');
  const scriptSnippet = useMemo(
    () =>
      publicKey
        ? `<script src="${base}/api/embed/loader" data-rehabsync-embed="${publicKey}" async></script>`
        : '',
    [base, publicKey],
  );
  const iframeSnippet = useMemo(
    () =>
      publicKey
        ? `<iframe src="${base}/api/embed/${publicKey}" title="Book a service" loading="lazy" style="width:100%;border:0;min-height:600px"></iframe>`
        : '',
    [base, publicKey],
  );

  function addOrigin() {
    const origin = normaliseOriginInput(originDraft);
    if (!origin) {
      setOriginError('Enter a full origin, e.g. https://www.yourclinic.com');
      return;
    }
    if (origins.includes(origin)) {
      setOriginError('That origin is already on the list.');
      return;
    }
    setOrigins([...origins, origin]);
    setOriginDraft('');
    setOriginError(null);
  }

  async function save() {
    setBusy('save');
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/embed-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          allowedOrigins: origins,
          headline: headline.trim() || null,
          showPrices,
          showDurations,
          ctaLabel: ctaLabel.trim() || 'Book now',
          bookingUrl: bookingUrl.trim() || null,
          theme,
          accentColor: accentColor.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'Save failed. Please try again.');
        return;
      }
      const body = (await res.json().catch(() => null)) as { publicKey?: string | null } | null;
      if (body?.publicKey) setPublicKey(body.publicKey);
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function rotateKey() {
    if (!window.confirm('Rotate the public key? Existing embed snippets on the clinic website will stop working until updated.')) {
      return;
    }
    setBusy('rotate');
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/embed-settings/rotate-key`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'Could not rotate the key.');
        return;
      }
      const body = (await res.json().catch(() => null)) as { publicKey?: string | null } | null;
      if (body?.publicKey) setPublicKey(body.publicKey);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const inputClass =
    'w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-primary)]';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Website embed</h2>
        <div className="flex items-center gap-2">
          <Badge variant={data.embedAvailable ? 'success' : 'neutral'}>
            {data.embedAvailable ? 'Granted' : 'Not granted'}
          </Badge>
          <Badge variant={data.enabled && data.embedAvailable ? 'success' : 'neutral'}>
            {data.enabled && data.embedAvailable ? 'Live' : 'Off'}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Let this clinic publish its bookable service catalogue as a widget on their own website.
        {' '}Active services available to embed: <strong>{data.activeServiceCount}</strong>.
      </p>

      {!data.embedAvailable && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The <strong>Website embed</strong> capability is not granted. Turn it on in the
          entitlements panel above (Platform group) before the widget can go live.
        </div>
      )}

      <div className="space-y-4">
        <Toggle
          label="Embed enabled"
          hint="The clinic-facing go-live switch. The widget only serves data when the capability is granted and this is on."
          checked={enabled}
          onChange={setEnabled}
          disabled={!data.embedAvailable}
        />

        {/* Allowed origins */}
        <div className="border-t border-[var(--border-primary)] pt-3">
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Allowed website origins
          </label>
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            Only these origins may embed the widget (enforced as the page&apos;s <code>frame-ancestors</code>).
            Add each site the clinic will place the widget on.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {origins.length === 0 && (
              <span className="text-xs text-[var(--text-secondary)]">No origins yet — the widget can&apos;t be framed anywhere.</span>
            )}
            {origins.map((origin) => (
              <span
                key={origin}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <span className="font-mono">{origin}</span>
                <button
                  type="button"
                  onClick={() => setOrigins(origins.filter((o) => o !== origin))}
                  className="text-[var(--text-secondary)] hover:text-red-600"
                  aria-label={`Remove ${origin}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={originDraft}
              onChange={(e) => setOriginDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOrigin();
                }
              }}
              placeholder="https://www.yourclinic.com"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addOrigin}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold border border-[var(--border-primary)] text-[var(--text-primary)]"
            >
              Add
            </button>
          </div>
          {originError && <p className="mt-1 text-xs text-red-600">{originError}</p>}
        </div>

        {/* Display options */}
        <div className="border-t border-[var(--border-primary)] pt-2">
          <Toggle label="Show prices" checked={showPrices} onChange={setShowPrices} />
          <Toggle label="Show durations" checked={showDurations} onChange={setShowDurations} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Widget heading</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Leave blank for “Book with <clinic>”"
              maxLength={120}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Button label</label>
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Book now"
              maxLength={40}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Booking link (CTA target)</label>
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              placeholder="Blank = clinic booking portal"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'auto' | 'light' | 'dark')}
              className={inputClass}
            >
              <option value="auto">Auto (match visitor)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Accent colour</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="Blank = brand primary"
                maxLength={7}
                className={inputClass}
              />
              {/^#[0-9a-fA-F]{6}$/.test(accentColor) && (
                <span
                  className="h-8 w-8 shrink-0 rounded border border-[var(--border-primary)]"
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm text-emerald-600">Saved.</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={busy !== null}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#0d9488' }}
          >
            {busy === 'save' ? 'Saving…' : 'Save embed settings'}
          </button>
        </div>

        {/* Public key + snippet */}
        <div className="border-t border-[var(--border-primary)] pt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Public key</label>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-primary)] break-all">
                {publicKey ?? 'Issued on first save'}
              </code>
              {publicKey && <CopyButton text={publicKey} />}
              {publicKey && (
                <button
                  type="button"
                  onClick={rotateKey}
                  disabled={busy !== null}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium border-[var(--border-primary)] text-[var(--text-secondary)] disabled:opacity-50"
                >
                  {busy === 'rotate' ? 'Rotating…' : 'Rotate key'}
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              The public key is non-secret and appears in the clinic&apos;s website markup. Rotating it
              invalidates every previously issued snippet.
            </p>
          </div>

          {publicKey && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Embed snippet (recommended — auto-resizes)
                  </span>
                  <CopyButton text={scriptSnippet} label="Copy snippet" />
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)]">
                  <code>{scriptSnippet}</code>
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Plain iframe (fixed height)
                  </span>
                  <CopyButton text={iframeSnippet} label="Copy iframe" />
                </div>
                <pre className="overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)]">
                  <code>{iframeSnippet}</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
