'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@rs/ui';

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxConsultants: number;
  maxPatients: number;
  aiQueriesPerMonth: number;
  storageGb: number;
  customDomainAllowed: boolean;
  whiteLabelAllowed: boolean;
  apiAccessAllowed: boolean;
  sportsPackageIncluded: boolean;
  stripePriceIdMonthly?: string | null;
  stripePriceIdYearly?: string | null;
}

interface Props {
  initialPlans: Plan[];
}

type Draft = Omit<Plan, 'id'>;

const EMPTY: Draft = {
  name: '',
  priceMonthly: 0,
  priceYearly: 0,
  maxConsultants: 1,
  maxPatients: 50,
  aiQueriesPerMonth: 100,
  storageGb: 5,
  customDomainAllowed: false,
  whiteLabelAllowed: false,
  apiAccessAllowed: false,
  sportsPackageIncluded: false,
  stripePriceIdMonthly: '',
  stripePriceIdYearly: '',
};

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const inputClass = 'w-full rounded-md border px-3 py-2 text-sm';
const inputStyle = {
  backgroundColor: 'var(--bg-input)',
  borderColor: 'var(--border-primary)',
  color: 'var(--text-primary)',
};

export function PlansManager({ initialPlans }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditingId(null);
    setDraft(EMPTY);
  }

  function startEdit(p: Plan) {
    setEditingId(p.id);
    const { ...rest } = p;
    setDraft(rest);
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const url = editingId ? `/api/admin/plans/${editingId}` : '/api/admin/plans';
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error(`Failed to save plan (${res.status})`);
      startNew();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setBusy(false);
    }
  }

  const numField = (label: string, key: keyof Draft, hint?: string) => (
    <label className="block">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {hint ? ` (${hint})` : ''}
      </span>
      <input
        type="number"
        min={0}
        value={String(draft[key] as number)}
        onChange={(e) => set(key, Number(e.target.value) as Draft[typeof key])}
        className={inputClass}
        style={inputStyle}
      />
    </label>
  );

  const flagField = (label: string, key: keyof Draft) => (
    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <input
        type="checkbox"
        checked={Boolean(draft[key])}
        onChange={(e) => set(key, e.target.checked as Draft[typeof key])}
      />
      {label}
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card title="Plans">
        {initialPlans.length === 0 ? (
          <p className="p-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            No plans defined yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...initialPlans]
              .sort((a, b) => (a.priceMonthly || Infinity) - (b.priceMonthly || Infinity))
              .map((p) => {
                const popular = p.name.toLowerCase() === 'clinic';
                const features = [
                  `${p.maxConsultants >= 9999 ? 'Unlimited' : p.maxConsultants} consultants`,
                  `${p.maxPatients >= 99999 ? 'Unlimited' : p.maxPatients.toLocaleString()} patients`,
                  `${p.aiQueriesPerMonth.toLocaleString()} AI credits / month`,
                  `${p.storageGb} GB storage`,
                  ...(p.apiAccessAllowed ? ['Kinetix AI access'] : []),
                  ...(p.customDomainAllowed ? ['Custom domain'] : []),
                  ...(p.whiteLabelAllowed ? ['White-label'] : []),
                  ...(p.sportsPackageIncluded ? ['Sports package'] : []),
                ];
                return (
                  <div
                    key={p.id}
                    className="rounded-xl p-4 flex flex-col"
                    style={{
                      border: `1px solid ${popular ? 'var(--brand-primary)' : 'var(--border-primary)'}`,
                      backgroundColor: 'var(--bg-card)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                      {popular && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ color: 'var(--brand-primary)', background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}
                        >
                          Most popular
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        {p.priceMonthly ? gbp(p.priceMonthly) : 'Custom'}
                      </span>
                      {p.priceMonthly ? (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}> /mo · {gbp(p.priceYearly)}/yr</span>
                      ) : null}
                    </div>
                    <ul className="mt-3 space-y-1.5 flex-1">
                      {features.map((f) => (
                        <li key={f} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--brand-primary)' }}>✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="mt-3 text-xs font-semibold self-start"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      Edit plan
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <Card title={editingId ? 'Edit plan' : 'New plan'}>
        <form onSubmit={save} className="space-y-3 p-1">
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Name
            </span>
            <input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. Professional"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {numField('Monthly price', 'priceMonthly', 'pence')}
            {numField('Yearly price', 'priceYearly', 'pence')}
            {numField('Max consultants', 'maxConsultants')}
            {numField('Max patients', 'maxPatients')}
            {numField('AI queries / month', 'aiQueriesPerMonth')}
            {numField('Storage', 'storageGb', 'GB')}
          </div>
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Stripe monthly Price ID
            </span>
            <input
              value={draft.stripePriceIdMonthly ?? ''}
              onChange={(e) => set('stripePriceIdMonthly', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="price_..."
            />
          </label>
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Stripe yearly Price ID
            </span>
            <input
              value={draft.stripePriceIdYearly ?? ''}
              onChange={(e) => set('stripePriceIdYearly', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="price_..."
            />
          </label>
          <div className="space-y-1.5">
            {flagField('Custom domain allowed', 'customDomainAllowed')}
            {flagField('White-label allowed', 'whiteLabelAllowed')}
            {flagField('API access (Kinetix) allowed', 'apiAccessAllowed')}
            {flagField('Sports package (athlete suite)', 'sportsPackageIncluded')}
          </div>
          {error && (
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !draft.name.trim()}
              className="flex-1 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create plan'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={startNew}
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
