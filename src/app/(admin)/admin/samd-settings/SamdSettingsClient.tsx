'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Card, Input } from '@rs/ui';
import { AlertTriangle, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import {
  SAMD_MODES,
  SAMD_FEATURE_GROUPS,
  actionLabel,
  formatDateTime,
  samdModeLabel,
  type SamdFeatureRow,
  type SamdMode,
  type SamdSettingsView,
  type SamdTenantListRow,
  type TenantSamdOverride,
} from '../../../../lib/samd';
import { SamdModeDialog, type SamdModeDialogSubmission } from './SamdModeDialog';

/**
 * The SaMD settings surface: summary cards, the global-vs-tenant scope tabs, the grouped feature
 * table with its three-segment control, and the audit history.
 *
 * Every write goes through `SamdModeDialog`, which collects the acknowledgements, reason, approval
 * reference and typed phrase the platform API requires. This component never decides authorisation —
 * it renders controls, and the API accepts or rejects.
 */

type Scope = 'global' | 'tenants';

interface PendingChange {
  scope: 'global' | 'tenant';
  featureKey: string;
  featureLabel: string;
  previousMode: SamdMode;
  requestedMode: SamdMode | TenantSamdOverride;
  effectiveMode: SamdMode;
  tenantId?: string;
  tenantOverrideCount?: number;
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'error' | 'warning' | 'success';
}) {
  return (
    <Card>
      <div className="px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {value}
          </span>
          {tone && <Badge variant={tone}>{tone === 'error' ? 'Full' : tone === 'warning' ? 'Partial' : 'Off'}</Badge>}
        </p>
        {hint && (
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </p>
        )}
      </div>
    </Card>
  );
}

/** The three-segment off / partial / full control. */
function ModeSegments({
  value,
  disabled,
  onSelect,
  includeInherit,
  inheritLabel,
}: {
  value: SamdMode | TenantSamdOverride;
  disabled?: boolean;
  onSelect: (mode: SamdMode | TenantSamdOverride) => void;
  includeInherit?: boolean;
  inheritLabel?: string;
}) {
  const options: Array<{ key: SamdMode | TenantSamdOverride; label: string }> = [
    ...(includeInherit ? [{ key: 'inherit' as const, label: inheritLabel ?? 'Inherit' }] : []),
    ...SAMD_MODES.map((mode) => ({ key: mode, label: samdModeLabel(mode) })),
  ];

  return (
    <div
      role="group"
      aria-label="Mode"
      className="inline-flex overflow-hidden rounded-md border"
      style={{ borderColor: 'var(--border-primary)' }}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => !active && onSelect(option.key)}
            className="px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55"
            style={
              active
                ? {
                    backgroundColor:
                      option.key === 'on'
                        ? 'color-mix(in srgb, #dc2626 16%, var(--bg-card))'
                        : option.key === 'partial'
                          ? 'color-mix(in srgb, #f59e0b 18%, var(--bg-card))'
                          : option.key === 'off'
                            ? 'color-mix(in srgb, #16a34a 14%, var(--bg-card))'
                            : 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                  }
                : { backgroundColor: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FeatureRow({
  feature,
  totalTenants,
  canWrite,
  onRequest,
}: {
  feature: SamdFeatureRow;
  totalTenants: number;
  canWrite: boolean;
  onRequest: (change: PendingChange) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border-primary)' }}>
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex items-start gap-2 text-left"
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            )}
            <span>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {feature.label}
                </span>
                <Badge
                  variant={
                    feature.riskLevel === 'high'
                      ? 'error'
                      : feature.riskLevel === 'medium'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {feature.riskLevel} risk
                </Badge>
                {feature.tenantOverrideCount > 0 && (
                  <Badge variant="info">
                    {feature.tenantOverrideCount} tenant{feature.tenantOverrideCount === 1 ? '' : 's'}{' '}
                    overridden
                  </Badge>
                )}
              </span>
              <span className="mt-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                {feature.description}
              </span>
            </span>
          </button>

          {open && (
            <div className="mt-3 space-y-3 pl-6 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  Off
                </p>
                <p>{feature.offBehaviour}</p>
              </div>
              <div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  Partial
                </p>
                <p>{feature.partialBehaviour}</p>
              </div>
              <div>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  Full
                </p>
                <p>{feature.fullBehaviour}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Affected routes
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {feature.affectedRoutes.length === 0 ? (
                      <li>None declared</li>
                    ) : (
                      feature.affectedRoutes.map((route) => <li key={route}><code>{route}</code></li>)
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Affected interfaces and jobs
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {[...feature.affectedUiAreas, ...feature.affectedJobs].map((area) => (
                      <li key={area}>{area}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {feature.relatedEntitlement && (
                <p>
                  Also gated by the commercial entitlement{' '}
                  <code>{feature.relatedEntitlement}</code>. Both gates apply — a paid entitlement never
                  bypasses the SaMD mode.
                </p>
              )}
              <p style={{ color: 'var(--text-muted)' }}>
                Effective across tenants: {feature.effectiveCounts.off} off ·{' '}
                {feature.effectiveCounts.partial} partial · {feature.effectiveCounts.on} full
                {feature.updatedAt && (
                  <>
                    {' '}
                    · last changed {formatDateTime(feature.updatedAt)}
                    {feature.updatedBy ? ` by ${feature.updatedBy}` : ''}
                  </>
                )}
              </p>
              {feature.reason && <p style={{ color: 'var(--text-muted)' }}>Reason: {feature.reason}</p>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ModeSegments
            value={feature.globalMode}
            disabled={!canWrite}
            onSelect={(mode) =>
              onRequest({
                scope: 'global',
                featureKey: feature.key,
                featureLabel: feature.label,
                previousMode: feature.globalMode,
                requestedMode: mode,
                effectiveMode: mode as SamdMode,
                tenantOverrideCount: feature.tenantOverrideCount,
              })
            }
          />
        </div>
      </div>
      <span className="sr-only">
        {feature.label} is globally {samdModeLabel(feature.globalMode)} across {totalTenants} tenants.
      </span>
    </div>
  );
}

export function SamdSettingsClient({
  settings,
  canWrite,
}: {
  settings: SamdSettingsView;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<Scope>('global');
  const [change, setChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(
    () =>
      SAMD_FEATURE_GROUPS.map((group) => ({
        group,
        features: settings.features.filter((feature) => feature.group === group),
      })).filter((entry) => entry.features.length > 0),
    [settings.features],
  );

  async function submit(submission: SamdModeDialogSubmission) {
    if (!change) return;
    setBusy(true);
    setError(null);
    try {
      const path =
        change.scope === 'global'
          ? `/api/admin/samd-settings/${encodeURIComponent(change.featureKey)}`
          : `/api/admin/tenants/${encodeURIComponent(change.tenantId ?? '')}/samd-settings/${encodeURIComponent(change.featureKey)}`;

      const res = await fetch(path, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(submission),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { message?: string; error?: { message?: string } }
          | null;
        setError(
          payload?.error?.message ??
            payload?.message ??
            `The change was rejected (${res.status}). Nothing has been applied.`,
        );
        return;
      }
      setChange(null);
      startTransition(() => router.refresh());
    } catch {
      setError('The change could not be submitted. Nothing has been applied.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mixed-configuration warning. Cannot be dismissed while the mismatch exists. */}
      {settings.globalFeatureState === 'mixed' && (
        <Card>
          <div
            className="space-y-3 px-6 py-5"
            style={{ backgroundColor: 'color-mix(in srgb, #f59e0b 8%, var(--bg-card))' }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#b45309' }} />
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Global feature configuration is mixed
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Individual global feature modes do not all match the selected offering profile (
                  {samdModeLabel(settings.offeringProfile)}). The published website may overstate or
                  understate the platform offering.
                </p>
              </div>
            </div>
            <ul className="space-y-1 pl-8 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {settings.mismatches.map((mismatch) => (
                <li key={mismatch.key}>
                  <strong>{mismatch.label}</strong> is {samdModeLabel(mismatch.actual)} but the offering
                  profile is {samdModeLabel(mismatch.expected)}
                </li>
              ))}
            </ul>
            <p className="pl-8 text-xs" style={{ color: 'var(--text-muted)' }}>
              Reconcile the features above, or change the offering profile, from the{' '}
              <Link href="/admin/website" className="font-semibold underline">
                Website page
              </Link>
              .
            </p>
          </div>
        </Card>
      )}

      {/* Tenant-override warning: exact counts, with a drill-down. */}
      {settings.summary.tenantsWithOverrides > 0 && (
        <Card>
          <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Public website does not represent every tenant
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong>{settings.summary.tenantsWithOverrides}</strong> of{' '}
                {settings.summary.totalTenants} tenants have an explicit SaMD override, so their
                effective feature set differs from the global offering the public website describes. Do
                not use the website as a tenant&apos;s contractual or clinical capability statement.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setScope('tenants')}>
              View tenants
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Features off" value={settings.summary.featuresOff} tone="success" />
        <SummaryCard label="Features partial" value={settings.summary.featuresPartial} tone="warning" />
        <SummaryCard label="Features full" value={settings.summary.featuresOn} tone="error" />
        <SummaryCard
          label="Tenants with overrides"
          value={settings.summary.tenantsWithOverrides}
          hint={`of ${settings.summary.totalTenants} tenants`}
        />
        <SummaryCard
          label="Tenants effectively full"
          value={settings.summary.tenantsEffectivelyOn}
          hint="on at least one feature"
        />
        <SummaryCard
          label="Last regulatory change"
          value={settings.summary.lastRegulatoryChangeAt ? '—' : 'None'}
          hint={formatDateTime(settings.summary.lastRegulatoryChangeAt)}
        />
      </div>

      <div className="flex items-center gap-2">
        {(['global', 'tenants'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setScope(tab)}
            aria-pressed={scope === tab}
            className="rounded-md border px-4 py-2 text-sm font-bold transition-colors"
            style={
              scope === tab
                ? {
                    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 13%, var(--bg-card))',
                    borderColor: 'color-mix(in srgb, var(--brand-primary) 42%, var(--border-primary))',
                    color: 'var(--brand-text)',
                  }
                : {
                    backgroundColor: 'transparent',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-secondary)',
                  }
            }
          >
            {tab === 'global' ? 'Global defaults' : 'Tenant overrides'}
          </button>
        ))}
      </div>

      {scope === 'global' ? (
        <div className="space-y-5">
          {grouped.map(({ group, features }) => (
            <Card key={group}>
              <div
                className="flex items-center gap-2 border-b px-5 py-3"
                style={{ borderColor: 'var(--border-primary)' }}
              >
                <Layers className="h-4 w-4" style={{ color: 'var(--brand-text)' }} />
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {group}
                </h2>
              </div>
              <div>
                {features.map((feature) => (
                  <FeatureRow
                    key={feature.key}
                    feature={feature}
                    totalTenants={settings.summary.totalTenants}
                    canWrite={canWrite}
                    onRequest={setChange}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <TenantScope canWrite={canWrite} onRequest={setChange} />
      )}

      <Card>
        <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Regulatory audit history
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            Append-only. Turning a feature off stops new processing but never removes the record that it
            was on.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                {['When', 'Action', 'Feature', 'Change', 'Actor', 'Reason'].map((heading) => (
                  <th key={heading} className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settings.events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No regulatory changes recorded yet.
                  </td>
                </tr>
              ) : (
                settings.events.map((event) => (
                  <tr key={event.id} className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <td className="px-5 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-primary)' }}>
                      {actionLabel(event.action)}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {event.featureKey ?? '—'}
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {event.previousMode ?? '—'} → {event.newMode ?? '—'}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {event.actorName ?? '—'}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-muted)' }}>
                      {event.reason ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {change && (
        <SamdModeDialog
          scope={change.scope}
          featureLabel={change.featureLabel}
          previousMode={change.previousMode}
          requestedMode={change.requestedMode}
          effectiveMode={change.effectiveMode}
          affectedTenantCount={change.scope === 'global' ? settings.summary.totalTenants : undefined}
          tenantOverrideCount={change.tenantOverrideCount}
          allowClearOverrides={change.scope === 'global'}
          busy={busy || pending}
          error={error}
          onCancel={() => {
            setChange(null);
            setError(null);
          }}
          onConfirm={submit}
        />
      )}
    </div>
  );
}

/**
 * The tenant-overrides scope. Loads on demand with search and filters, and shows global mode, the
 * tenant override and the effective mode separately for the selected feature.
 */
function TenantScope({
  canWrite,
  onRequest,
}: {
  canWrite: boolean;
  onRequest: (change: PendingChange) => void;
}) {
  const [search, setSearch] = useState('');
  const [feature, setFeature] = useState('');
  const [effectiveMode, setEffectiveMode] = useState('');
  const [override, setOverride] = useState('');
  const [rows, setRows] = useState<SamdTenantListRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (feature) params.set('feature', feature);
      if (effectiveMode) params.set('effectiveMode', effectiveMode);
      if (override) params.set('override', override);
      const res = await fetch(`/api/admin/samd-settings/tenants?${params.toString()}`, {
        cache: 'no-store',
      });
      setRows(res.ok ? ((await res.json()) as SamdTenantListRow[]) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div
        className="flex flex-wrap items-end gap-3 border-b px-5 py-4"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <label className="flex-1 space-y-1" style={{ minWidth: 200 }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Tenant search
          </span>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or slug" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Effective mode
          </span>
          <select
            value={effectiveMode}
            onChange={(event) => setEffectiveMode(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Any</option>
            {SAMD_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {samdModeLabel(mode)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Override state
          </span>
          <select
            value={override}
            onChange={(event) => setOverride(event.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Any</option>
            <option value="overridden">Overridden</option>
            <option value="inherited">Inherited</option>
          </select>
        </label>
        <Button onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Apply filters'}
        </Button>
      </div>

      {rows === null ? (
        <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Apply filters to list tenants and their effective SaMD modes.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No tenants match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                {['Tenant', 'Status', 'Lifecycle', 'Overrides', 'Effective spread', ''].map((heading) => (
                  <th key={heading} className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tenantId} className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/tenants/${row.tenantId}`}
                      className="font-semibold underline"
                      style={{ color: 'var(--brand-text)' }}
                    >
                      {row.name}
                    </Link>
                    <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                      {row.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {row.status}
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {row.lifecycleStage}
                    {row.pilotCohort ? ` · ${row.pilotCohort}` : ''}
                  </td>
                  <td className="px-5 py-3">
                    {row.overrideCount > 0 ? (
                      <Badge variant="info">{row.overrideCount}</Badge>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Inherits global</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {row.counts.off} off · {row.counts.partial} partial · {row.counts.on} full
                  </td>
                  <td className="px-5 py-3">
                    {row.feature && (
                      <ModeSegments
                        value={row.feature.override}
                        disabled={!canWrite}
                        includeInherit
                        inheritLabel={`Inherit (${samdModeLabel(row.feature.globalMode)})`}
                        onSelect={(mode) =>
                          onRequest({
                            scope: 'tenant',
                            tenantId: row.tenantId,
                            featureKey: row.feature!.key,
                            featureLabel: `${row.feature!.key} · ${row.name}`,
                            previousMode: row.feature!.effectiveMode,
                            requestedMode: mode,
                            effectiveMode:
                              mode === 'inherit' ? row.feature!.globalMode : (mode as SamdMode),
                          })
                        }
                      />
                    )}
                    {!row.feature && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Filter by a feature to edit its override
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* The feature filter drives the inline override control, so it is offered alongside search. */}
      <div className="border-t px-5 py-3" style={{ borderColor: 'var(--border-primary)' }}>
        <label className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="font-bold uppercase tracking-wider">Feature key filter</span>
          <Input
            value={feature}
            onChange={(event) => setFeature(event.target.value)}
            placeholder="e.g. recovery_forecasting"
          />
          <span>Set a feature to show and edit its per-tenant override.</span>
        </label>
      </div>
    </Card>
  );
}
