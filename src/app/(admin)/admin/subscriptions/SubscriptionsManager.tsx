'use client';

import { useState, type FormEvent } from 'react';
import { Card } from '@rs/ui';
import {
  CLIENT_SUBSCRIPTION_TIERS,
  formatClientSubscriptionPrice,
  type ClientSubscriptionTier,
} from '../../../../lib/client-subscriptions';

interface AdminSubscriptionTier {
  id: string;
  name: string;
  pricePence: number;
  summary: string;
  audience: string;
  benefits: string[];
  featured: boolean;
}

type Draft = Omit<AdminSubscriptionTier, 'id' | 'benefits'> & {
  benefitsText: string;
};

const EMPTY: Draft = {
  name: '',
  pricePence: 0,
  summary: '',
  audience: '',
  benefitsText: '',
  featured: false,
};

const inputClass = 'w-full rounded-md border px-3 py-2 text-sm';
const inputStyle = {
  backgroundColor: 'var(--bg-input)',
  borderColor: 'var(--border-primary)',
  color: 'var(--text-primary)',
};

function toAdminTier(tier: ClientSubscriptionTier): AdminSubscriptionTier {
  return {
    id: tier.id,
    name: tier.name,
    pricePence: tier.pricePence,
    summary: tier.summary,
    audience: tier.audience,
    benefits: tier.benefits,
    featured: Boolean(tier.featured),
  };
}

function toDraft(tier: AdminSubscriptionTier): Draft {
  return {
    name: tier.name,
    pricePence: tier.pricePence,
    summary: tier.summary,
    audience: tier.audience,
    benefitsText: tier.benefits.join('\n'),
    featured: tier.featured,
  };
}

function benefitsFromText(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function monthlyLabel(pricePence: number): string {
  return pricePence === 0 ? 'Included' : `${formatClientSubscriptionPrice(pricePence)} /mo`;
}

export function SubscriptionsManager() {
  const [tiers, setTiers] = useState<AdminSubscriptionTier[]>(
    CLIENT_SUBSCRIPTION_TIERS.map(toAdminTier),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  function startNew() {
    setEditingId(null);
    setDraft(EMPTY);
  }

  function startEdit(tier: AdminSubscriptionTier) {
    setEditingId(tier.id);
    setDraft(toDraft(tier));
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;

    const nextTier: AdminSubscriptionTier = {
      id: editingId ?? `subscription-${Date.now()}`,
      name: draft.name.trim(),
      pricePence: draft.pricePence,
      summary: draft.summary.trim(),
      audience: draft.audience.trim(),
      benefits: benefitsFromText(draft.benefitsText),
      featured: draft.featured,
    };

    setTiers((current) => {
      const withoutFeatured = nextTier.featured
        ? current.map((tier) => ({ ...tier, featured: false }))
        : current;
      if (editingId) {
        return withoutFeatured.map((tier) => (tier.id === editingId ? nextTier : tier));
      }
      return [...withoutFeatured, nextTier];
    });
    startNew();
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
        onChange={(event) => set(key, Number(event.target.value) as Draft[typeof key])}
        className={inputClass}
        style={inputStyle}
      />
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card title="Subscriptions">
        <div className="grid gap-4 sm:grid-cols-2">
          {[...tiers]
            .sort((a, b) => (a.pricePence || -1) - (b.pricePence || -1))
            .map((tier) => (
              <div
                key={tier.id}
                className="flex flex-col rounded-xl p-4"
                style={{
                  border: `1px solid ${tier.featured ? 'var(--brand-primary)' : 'var(--border-primary)'}`,
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {tier.name}
                  </h3>
                  {tier.featured && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        color: 'var(--brand-primary)',
                        background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
                      }}
                    >
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
                    {monthlyLabel(tier.pricePence)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                  {tier.summary}
                </p>
                <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {tier.audience}
                </p>
                <ul className="mt-3 flex-1 space-y-1.5">
                  {tier.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span style={{ color: 'var(--brand-primary)' }}>✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => startEdit(tier)}
                  className="mt-3 self-start text-xs font-semibold"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Edit subscription
                </button>
              </div>
            ))}
        </div>
      </Card>

      <Card title={editingId ? 'Edit subscription' : 'New subscription'}>
        <form onSubmit={save} className="space-y-3 p-1">
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Name
            </span>
            <input
              value={draft.name}
              onChange={(event) => set('name', event.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. Plus"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {numField('Monthly price', 'pricePence', 'pence')}
          </div>
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Summary
            </span>
            <textarea
              value={draft.summary}
              onChange={(event) => set('summary', event.target.value)}
              className={inputClass}
              style={inputStyle}
              rows={3}
              placeholder="Short client-facing description"
            />
          </label>
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Catered for
            </span>
            <textarea
              value={draft.audience}
              onChange={(event) => set('audience', event.target.value)}
              className={inputClass}
              style={inputStyle}
              rows={3}
              placeholder="Who this subscription is best for"
            />
          </label>
          <label className="block">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Benefits
            </span>
            <textarea
              value={draft.benefitsText}
              onChange={(event) => set('benefitsText', event.target.value)}
              className={inputClass}
              style={inputStyle}
              rows={6}
              placeholder="One benefit per line"
            />
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => set('featured', event.target.checked)}
            />
            Mark as most popular
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!draft.name.trim()}
              className="flex-1 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {editingId ? 'Save changes' : 'Create subscription'}
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
