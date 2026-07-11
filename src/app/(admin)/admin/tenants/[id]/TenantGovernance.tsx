'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Card } from '@rs/ui';

// ── Types (mirror AdminService.getTenantEntitlements) ─────────────────────────

type OverrideState = 'on' | 'off' | 'inherit';

interface FeatureRow {
  key: string;
  label: string;
  description: string;
  group: string;
  planDefault: boolean;
  override: OverrideState;
  effective: boolean;
}

export interface TenantEntitlementsView {
  tenantId: string;
  features: FeatureRow[];
  ai: {
    planAllowance: number;
    override: number | null;
    effectiveAllowance: number;
    used: number;
    remaining: number;
    purchasedBalance: number;
    resetDate: string;
  };
  pilot: { enrolled: boolean; cohort: string | null; startedAt: string | null; notes: string | null };
  lifecycleStage: string;
  events: Array<{ id: string; action: string; detail: unknown; actorName: string | null; createdAt: string }>;
}

const LIFECYCLE_STAGES = ['prospect', 'onboarding', 'pilot', 'active', 'churned'] as const;

const ACTION_LABELS: Record<string, string> = {
  feature_enabled: 'Feature enabled',
  feature_disabled: 'Feature disabled',
  feature_inherited: 'Feature reset to plan',
  ai_allowance_set: 'AI allowance set',
  ai_allowance_adjusted: 'AI allowance adjusted',
  ai_allowance_reset: 'AI allowance reset to plan',
  credits_granted: 'Credits granted',
  credits_deducted: 'Credits deducted',
  pilot_enrolled: 'Enrolled in pilot',
  pilot_updated: 'Pilot details updated',
  pilot_unenrolled: 'Removed from pilot',
  lifecycle_changed: 'Lifecycle stage changed',
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(n);
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function summariseDetail(action: string, detail: unknown): string {
  if (!detail || typeof detail !== 'object') return '';
  const d = detail as Record<string, unknown>;
  if (action.startsWith('feature_')) return String(d['feature'] ?? '');
  if (action.startsWith('ai_allowance')) {
    if (action === 'ai_allowance_reset') return 'back to plan';
    return d['value'] != null ? `${formatNumber(Number(d['value']))} / mo` : '';
  }
  if (action.startsWith('credits')) {
    const c = Number(d['credits'] ?? 0);
    return `${c > 0 ? '+' : ''}${formatNumber(c)} credits${d['reason'] ? ` — ${String(d['reason'])}` : ''}`;
  }
  if (action.startsWith('pilot')) return d['cohort'] ? `cohort ${String(d['cohort'])}` : '';
  if (action === 'lifecycle_changed') return `${String(d['previous'] ?? '')} → ${String(d['stage'] ?? '')}`;
  return '';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TenantGovernance({
  tenantId,
  data,
}: {
  tenantId: string;
  data: TenantEntitlementsView;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Local form state for the editable fields.
  const [allowanceValue, setAllowanceValue] = useState(String(data.ai.override ?? data.ai.effectiveAllowance));
  const [adjustValue, setAdjustValue] = useState('100');
  const [creditValue, setCreditValue] = useState('1000');
  const [creditReason, setCreditReason] = useState('');
  const [cohort, setCohort] = useState(data.pilot.cohort ?? '');
  const [notes, setNotes] = useState(data.pilot.notes ?? '');

  async function mutate(path: string, init: RequestInit, key: string): Promise<void> {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(path, init);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? 'Request failed. Please try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const json = (body: unknown): RequestInit => ({
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  function setFeature(key: string, value: OverrideState) {
    void mutate(`/api/admin/tenants/${tenantId}/features/${key}`, json({ value }), `feature:${key}`);
  }
  function setAllowance(body: { mode: string; value?: number; delta?: number }) {
    void mutate(`/api/admin/tenants/${tenantId}/ai-allowance`, json(body), 'allowance');
  }
  function grantCredits(credits: number) {
    void mutate(
      `/api/admin/tenants/${tenantId}/ai-credits`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credits, reason: creditReason || null }) },
      'credits',
    );
  }
  function savePilot(enrolled: boolean) {
    void mutate(
      `/api/admin/tenants/${tenantId}/pilot`,
      json({ enrolled, cohort: cohort || null, notes: notes || null }),
      'pilot',
    );
  }
  function setLifecycle(stage: string) {
    void mutate(`/api/admin/tenants/${tenantId}/lifecycle`, json({ stage }), 'lifecycle');
  }

  const usedPct =
    data.ai.effectiveAllowance > 0 ? Math.min(100, Math.round((data.ai.used / data.ai.effectiveAllowance) * 100)) : 0;
  const groups = Array.from(new Set(data.features.map((f) => f.group)));

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-error-bg, #fee2e2)', color: 'var(--color-error-text, #b91c1c)' }}
        >
          {error}
        </div>
      )}

      {/* Entitlements */}
      <Card
        title="Features & entitlements"
        description="Enable or disable features for this tenant, independent of its plan. ‘Inherit’ follows the plan default."
      >
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {group}
              </p>
              <div className="space-y-2">
                {data.features
                  .filter((f) => f.group === group)
                  .map((f) => (
                    <div
                      key={f.key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-3"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <div className="min-w-[200px] flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {f.label}
                          </span>
                          <Badge variant={f.effective ? 'success' : 'neutral'}>
                            {f.effective ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {f.override !== 'inherit' && (
                            <Badge variant="info">Override</Badge>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {f.description}{' '}
                          <span style={{ color: 'var(--text-muted)' }}>
                            (plan default: {f.planDefault ? 'on' : 'off'})
                          </span>
                        </p>
                      </div>
                      <SegmentedOverride
                        value={f.override}
                        busy={busy === `feature:${f.key}`}
                        onChange={(v) => setFeature(f.key, v)}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* AI allowance */}
      <Card
        title="AI allowance"
        description="The monthly AI call allowance for this tenant. An override replaces the plan allowance; complimentary credits carry over and never expire."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Plan allowance" value={`${formatNumber(data.ai.planAllowance)}/mo`} />
            <Stat
              label="Effective"
              value={`${formatNumber(data.ai.effectiveAllowance)}/mo`}
              badge={data.ai.override != null ? 'Override' : undefined}
            />
            <Stat label="Used this period" value={formatNumber(data.ai.used)} />
            <Stat label="Comp credits" value={formatNumber(data.ai.purchasedBalance)} />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>{usedPct}% used</span>
              <span>{formatNumber(data.ai.remaining)} remaining</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${usedPct}%`, backgroundColor: usedPct >= 90 ? '#dc2626' : usedPct >= 70 ? '#f59e0b' : '#14b8a6' }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t pt-4" style={{ borderColor: 'var(--border-secondary)' }}>
            <Field label="Set monthly allowance">
              <input
                type="number"
                min={0}
                value={allowanceValue}
                onChange={(e) => setAllowanceValue(e.target.value)}
                className="rs-gov-input"
              />
            </Field>
            <ActionButton
              busy={busy === 'allowance'}
              onClick={() => setAllowance({ mode: 'set', value: Math.max(0, parseInt(allowanceValue, 10) || 0) })}
            >
              Set
            </ActionButton>

            <Field label="Adjust by">
              <input
                type="number"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                className="rs-gov-input"
              />
            </Field>
            <ActionButton
              busy={busy === 'allowance'}
              onClick={() => setAllowance({ mode: 'adjust', delta: Math.abs(parseInt(adjustValue, 10) || 0) })}
            >
              + Increase
            </ActionButton>
            <ActionButton
              busy={busy === 'allowance'}
              onClick={() => setAllowance({ mode: 'adjust', delta: -Math.abs(parseInt(adjustValue, 10) || 0) })}
            >
              − Decrease
            </ActionButton>

            <ActionButton busy={busy === 'allowance'} variant="ghost" onClick={() => setAllowance({ mode: 'inherit' })}>
              Reset to plan
            </ActionButton>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t pt-4" style={{ borderColor: 'var(--border-secondary)' }}>
            <Field label="Complimentary credits (− to deduct)">
              <input
                type="number"
                value={creditValue}
                onChange={(e) => setCreditValue(e.target.value)}
                className="rs-gov-input"
              />
            </Field>
            <Field label="Reason (optional)">
              <input
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="e.g. pilot top-up"
                className="rs-gov-input"
                style={{ minWidth: 180 }}
              />
            </Field>
            <ActionButton busy={busy === 'credits'} onClick={() => grantCredits(parseInt(creditValue, 10) || 0)}>
              Apply credits
            </ActionButton>
          </div>
        </div>
      </Card>

      {/* Pilot + lifecycle */}
      <Card
        title="Pilot programme & lifecycle"
        description="Enrol this tenant into a pilot cohort and track where they are in the customer journey."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={data.pilot.enrolled ? 'success' : 'neutral'}>
              {data.pilot.enrolled ? 'In pilot' : 'Not in pilot'}
            </Badge>
            {data.pilot.startedAt && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Since {formatDateTime(data.pilot.startedAt)}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Lifecycle stage
              </label>
              <select
                value={data.lifecycleStage}
                disabled={busy === 'lifecycle'}
                onChange={(e) => setLifecycle(e.target.value)}
                className="rs-gov-input"
              >
                {LIFECYCLE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cohort">
              <input
                type="text"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                placeholder="e.g. pilot-2026-q3"
                className="rs-gov-input"
              />
            </Field>
            <Field label="Pilot notes">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Context for this enrolment"
                className="rs-gov-input"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.pilot.enrolled ? (
              <>
                <ActionButton busy={busy === 'pilot'} onClick={() => savePilot(true)}>
                  Save pilot details
                </ActionButton>
                <ActionButton busy={busy === 'pilot'} variant="danger" onClick={() => savePilot(false)}>
                  Remove from pilot
                </ActionButton>
              </>
            ) : (
              <ActionButton busy={busy === 'pilot'} onClick={() => savePilot(true)}>
                Enrol in pilot
              </ActionButton>
            )}
          </div>
        </div>
      </Card>

      {/* Activity timeline */}
      <Card title="Governance activity" description="Every entitlement, allowance and pilot change — most recent first.">
        {data.events.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No governance changes recorded yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {data.events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: 'var(--color-primary, #14b8a6)' }} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDateTime(e.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {summariseDetail(e.action, e.detail)}
                    {summariseDetail(e.action, e.detail) && e.actorName ? ' · ' : ''}
                    {e.actorName ? `by ${e.actorName}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <style>{`
        .rs-gov-input {
          padding: 0.4rem 0.6rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-primary);
          background-color: var(--bg-card);
          color: var(--text-primary);
          font-size: 0.875rem;
          max-width: 160px;
        }
      `}</style>
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function Stat({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
        {badge && (
          <span className="ml-1.5 align-middle">
            <Badge variant="info">{badge}</Badge>
          </span>
        )}
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
  variant = 'secondary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  const bg =
    variant === 'danger'
      ? 'var(--color-error-text, #dc2626)'
      : variant === 'ghost'
        ? 'transparent'
        : variant === 'primary'
          ? 'var(--color-primary, #14b8a6)'
          : 'var(--bg-secondary)';
  const color =
    variant === 'danger' || variant === 'primary' ? '#fff' : 'var(--text-secondary)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60"
      style={{ backgroundColor: bg, color, border: variant === 'ghost' ? '1px solid var(--border-primary)' : 'none' }}
    >
      {busy ? '…' : children}
    </button>
  );
}

function SegmentedOverride({
  value,
  onChange,
  busy,
}: {
  value: OverrideState;
  onChange: (v: OverrideState) => void;
  busy?: boolean;
}) {
  const options: OverrideState[] = ['inherit', 'on', 'off'];
  const labels: Record<OverrideState, string> = { inherit: 'Inherit', on: 'On', off: 'Off' };
  return (
    <div className="inline-flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--border-primary)' }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={busy}
            onClick={() => !active && onChange(opt)}
            className="px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
            style={{
              backgroundColor: active ? 'var(--color-primary, #14b8a6)' : 'var(--bg-card)',
              color: active ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}
