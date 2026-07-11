'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card } from '@rs/ui';

export interface TenantStoreSettingsView {
  tenantId: string;
  storeEnabled: boolean;
  affiliateTag: string | null;
  affiliateLinksEnabled: boolean;
  allowCustomSupplierLinks: boolean;
  disclosureTextOverride: string | null;
  catalogueSize: number;
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

export function TenantStoreSettings({
  tenantId,
  data,
}: {
  tenantId: string;
  data: TenantStoreSettingsView;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [affiliateTag, setAffiliateTag] = useState(data.affiliateTag ?? '');
  const [affiliateLinksEnabled, setAffiliateLinksEnabled] = useState(data.affiliateLinksEnabled);
  const [allowCustomSupplierLinks, setAllowCustomSupplierLinks] = useState(data.allowCustomSupplierLinks);
  const [disclosure, setDisclosure] = useState(data.disclosureTextOverride ?? '');

  async function save() {
    setBusy('save');
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/store-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliateTag: affiliateTag.trim() || null,
          affiliateLinksEnabled,
          allowCustomSupplierLinks,
          disclosureTextOverride: disclosure.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'Save failed. Please try again.');
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function seed() {
    setBusy('seed');
    setError(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/store/seed`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'Seeding failed.');
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Store &amp; recommended equipment</h2>
        <Badge variant={data.storeEnabled ? 'success' : 'neutral'}>
          {data.storeEnabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Enable the store with the <strong>Store &amp; recommended equipment</strong> feature toggle above.
        Set the store credentials and defaults here. Catalogue items: <strong>{data.catalogueSize}</strong>.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Amazon Associates tag
          </label>
          <input
            type="text"
            value={affiliateTag}
            onChange={(e) => setAffiliateTag(e.target.value)}
            placeholder="e.g. rehabsync-21"
            className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-primary)]"
          />
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            A single store-level associate tag. Never a per-patient sub-tag — patient identifiers are never
            sent to Amazon.
          </p>
        </div>

        <div className="border-t border-[var(--border-primary)] pt-2">
          <Toggle
            label="Affiliate links enabled"
            hint="When off, product links open without the associate tag (no commission) and clinics can use custom supplier links."
            checked={affiliateLinksEnabled}
            onChange={setAffiliateLinksEnabled}
          />
          <Toggle
            label="Allow custom supplier links"
            hint="Let clinics attach their own non-affiliate supplier links to equipment items."
            checked={allowCustomSupplierLinks}
            onChange={setAllowCustomSupplierLinks}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Affiliate disclosure override (optional)
          </label>
          <textarea
            value={disclosure}
            onChange={(e) => setDisclosure(e.target.value)}
            rows={2}
            placeholder="Leave blank to use the standard RehabSync affiliate disclosure."
            className="w-full rounded-lg border px-3 py-2 text-sm bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-primary)]"
          />
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
            {busy === 'save' ? 'Saving…' : 'Save store settings'}
          </button>
          <button
            onClick={seed}
            disabled={busy !== null || data.catalogueSize > 0}
            className="rounded-lg px-4 py-2 text-sm font-semibold border border-[var(--border-primary)] text-[var(--text-primary)] disabled:opacity-50"
            title={data.catalogueSize > 0 ? 'Catalogue already has items' : 'Seed a demo equipment catalogue'}
          >
            {busy === 'seed' ? 'Seeding…' : 'Seed demo catalogue'}
          </button>
        </div>
      </div>
    </Card>
  );
}
