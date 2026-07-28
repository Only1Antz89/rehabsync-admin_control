'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Card, Input } from '@rs/ui';
import { AlertTriangle, ExternalLink, Monitor, RotateCcw, Smartphone, Tablet } from 'lucide-react';
import {
  PREVIEWABLE_ROUTES,
  PREVIEW_VIEWPORTS,
  SAMD_MODES,
  actionLabel,
  formatDateTime,
  samdModeLabel,
  samdModeTone,
  type PreviewTokenResult,
  type PreviewViewport,
  type WebsiteProfile,
  type WebsiteStatusView,
} from '../../../../lib/samd';

/**
 * The Website control surface: status header, the three profile cards, the signed responsive preview,
 * mismatch panels, publication controls and audit history.
 *
 * All state comes from the platform API through this repository's server-side proxy routes. Nothing
 * here talks to a database, holds a deployment credential, or fetches private tenant configuration
 * from the public website.
 */

const VIEWPORT_ICONS = { desktop: Monitor, tablet: Tablet, mobile: Smartphone } as const;

function StatusItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {children}
      </p>
    </div>
  );
}

const PROFILE_SUMMARY: Record<
  WebsiteProfile,
  { name: string; positioning: string; includes: string[]; excludes: string[]; notice: string }
> = {
  off: {
    name: 'Off — Practice management',
    positioning: 'Practice-management and patient-engagement software for physiotherapy clinics.',
    includes: [
      'Scheduling, reminders and waiting lists',
      'Patient records and document storage',
      'Manual rehabilitation programme builder',
      'Billing, invoicing and insurance administration',
      'Raw adherence and diary logging (no interpretation)',
      'Team management, messaging, audit logs',
    ],
    excludes: [
      'Diagnosis and differential support',
      'Triage classification and urgency',
      'AI treatment or exercise recommendation',
      'Recovery prediction',
      'Injury-risk monitoring and training-load bands',
      'Biomechanical interpretation and movement scoring',
      'Patient clinical AI chat',
      'Return-to-play readiness or clearance',
    ],
    notice:
      'RehabSync provides clinic-management and communication tools. Clinical decisions are made by the treating physiotherapist.',
  },
  partial: {
    name: 'Partial — Scaled-back professional tools',
    positioning:
      'Structured workflows, clinician-controlled tools and restricted AI productivity features.',
    includes: [
      'Everything in the Off profile',
      'Plain pre-appointment questionnaires (no interpretation)',
      'Transcription and formatting (no clinical inference)',
      'Cited reference search (no patient context)',
      'Secure media capture with manual annotation',
      'Raw athletic measurements with clinician conclusions',
    ],
    excludes: [
      'Any claim the software diagnoses, predicts or recommends treatment',
      'Any claim partial mode is outside medical-device regulation',
      'Clinical AI screenshots or pricing bullets not available in this mode',
      'Patient-facing unreviewed AI advice',
    ],
    notice:
      'Some tools operate in a restricted, clinician-controlled form. Intended purpose and real-world use may still create medical-device obligations. This website does not represent MHRA approval, certification, registration or a legal classification decision.',
  },
  on: {
    name: 'Full — Clinical intelligence enabled',
    positioning:
      'Clinician-reviewed clinical decision support alongside the practice-management tools.',
    includes: [
      'Everything in the Partial profile',
      'Rehabilitation plan drafting (clinician-approved)',
      'Triage and safety review (clinician-confirmed)',
      'Assessment decision support (clinician-only)',
      'Recovery outlook as an indicative range',
      'Movement and biomechanics review',
      'Injury-risk monitoring for clinical review',
    ],
    excludes: [
      'Diagnostic accuracy, outcome or safety statistics',
      'MHRA, NHS, CE or UKCA approval, certification or registration claims',
      'Any claim the AI replaces a physiotherapist',
      'Guaranteed recovery or injury prevention',
      'Any feature the full global configuration does not actually enable',
    ],
    notice:
      'RehabSync clinical features are designed to support qualified physiotherapy professionals and do not replace professional judgement. Clinical output requires clinician review.',
  },
};

export function WebsiteClient({
  status,
  canPublish,
}: {
  status: WebsiteStatusView;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<WebsiteProfile>(status.resolvedProfile);
  const [route, setRoute] = useState<string>('/');
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [preview, setPreview] = useState<PreviewTokenResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showPublish, setShowPublish] = useState(false);
  const [reason, setReason] = useState('');
  const [approvalReference, setApprovalReference] = useState('');
  const [revision, setRevision] = useState('');
  const [phrase, setPhrase] = useState('');
  const [publishError, setPublishError] = useState<string | null>(null);

  const viewportSpec = PREVIEW_VIEWPORTS.find((entry) => entry.key === viewport)!;
  const mismatchedPublish = selected !== status.globalOfferingProfile;
  const requiredPhrase = mismatchedPublish ? 'PUBLISH MISMATCHED WEBSITE' : 'PUBLISH WEBSITE';

  async function requestPreview() {
    setBusy(true);
    setPreviewError(null);
    try {
      const res = await fetch('/api/admin/website/preview-token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile: selected, route, viewport }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        setPreviewError(
          payload?.message ??
            `A preview link could not be issued (${res.status}). Check that the preview secret is configured on the API.`,
        );
        return;
      }
      setPreview((await res.json()) as PreviewTokenResult);
    } catch {
      setPreviewError('A preview link could not be issued.');
    } finally {
      setBusy(false);
    }
  }

  async function post(path: string, body: unknown, onError: (message: string) => void) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: path.endsWith('/strategy') ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { message?: string; error?: { message?: string } }
          | null;
        onError(
          payload?.error?.message ??
            payload?.message ??
            `The request was rejected (${res.status}). Nothing has changed.`,
        );
        return false;
      }
      startTransition(() => router.refresh());
      return true;
    } catch {
      onError('The request could not be submitted. Nothing has changed.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Unavoidable mismatch banners ──────────────────────────────────── */}

      {status.strategy === 'manual_override' && (
        <Card>
          <div
            className="space-y-2 px-6 py-5"
            style={{ backgroundColor: 'color-mix(in srgb, #dc2626 9%, var(--bg-card))' }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#dc2626' }} />
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Website profile differs from the global SaMD offering
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  The public marketing profile has been manually overridden. The wording, pricing feature
                  list, screenshots and solutions shown publicly may not match the global product
                  configuration. This banner stays visible until the strategy returns to Follow global.
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Override profile: {status.manualProfile ? samdModeLabel(status.manualProfile) : '—'} ·
                  global offering: {samdModeLabel(status.globalOfferingProfile)} · review by{' '}
                  {formatDateTime(status.reviewAt)} · approval {status.approvalReference ?? '—'}
                  {status.overrideExpired && ' · EXPIRED, the site has reverted to the global offering'}
                </p>
              </div>
            </div>
            {canPublish && (
              <div className="pl-8">
                <Button
                  variant="secondary"
                  disabled={busy || pending}
                  onClick={() =>
                    post(
                      '/api/admin/website/strategy',
                      {
                        strategy: 'follow_global',
                        reason: 'Reverting the public website to follow the global SaMD offering.',
                      },
                      setPublishError,
                    )
                  }
                >
                  Restore Follow global
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {status.globalFeatureState === 'mixed' && (
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
                  Individual global feature modes do not all match one of the three curated website
                  profiles. The published website may overstate or understate the platform offering. None
                  of the three profiles can fully represent the exact global feature set.
                </p>
              </div>
            </div>
            <ul className="space-y-1 pl-8 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {status.globalMismatches.map((mismatch) => (
                <li key={mismatch.key}>
                  <strong>{mismatch.label}</strong> is {mismatch.actual}, offering profile is{' '}
                  {mismatch.expected}
                </li>
              ))}
            </ul>
            <p className="pl-8 text-xs" style={{ color: 'var(--text-muted)' }}>
              Reconcile these on the{' '}
              <Link href="/admin/samd-settings" className="font-semibold underline">
                SaMD settings page
              </Link>
              .
            </p>
          </div>
        </Card>
      )}

      {status.tenantMismatch.tenantsNotRepresented > 0 && (
        <Card>
          <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Public website does not represent every tenant
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong>{status.tenantMismatch.tenantsNotRepresented}</strong> of{' '}
                {status.tenantMismatch.totalTenants} tenants have an effective feature set that differs
                from the published profile ({samdModeLabel(status.publishedProfile)}). Grouped by
                dominant mode:{' '}
                {SAMD_MODES.map(
                  (mode) => `${status.tenantMismatch.countsByEffectiveMode[mode] ?? 0} ${samdModeLabel(mode)}`,
                ).join(' · ')}
                . Sales, onboarding, pilot and contract workflows must use each tenant&apos;s capability
                summary, not this website.
              </p>
            </div>
            <Link href="/admin/samd-settings">
              <Button variant="secondary">Tenant overrides</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Status header ─────────────────────────────────────────────────── */}
      <Card>
        <div className="grid gap-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatusItem label="Global offering">
            <Badge variant={samdModeTone(status.globalOfferingProfile)}>
              {status.globalOfferingLabel}
            </Badge>
          </StatusItem>
          <StatusItem label="Global features">
            <Badge variant={status.globalFeatureState === 'aligned' ? 'success' : 'warning'}>
              {status.globalFeatureState === 'aligned' ? 'Aligned' : 'Mixed'}
            </Badge>
          </StatusItem>
          <StatusItem label="Publication strategy">
            {status.strategy === 'follow_global' ? 'Follow global' : 'Manual override'}
          </StatusItem>
          <StatusItem label="Published profile">
            <Badge variant={samdModeTone(status.publishedProfile)}>
              {samdModeLabel(status.publishedProfile)}
            </Badge>
          </StatusItem>
          <StatusItem label="Content revision">{status.publishedRevision}</StatusItem>
          <StatusItem label="Last published">{formatDateTime(status.publishedAt)}</StatusItem>
          <StatusItem label="Published by">{status.publishedBy ?? '—'}</StatusItem>
          <StatusItem label="Public endpoint">
            <Badge variant={status.publicEndpointHealth.ok ? 'success' : 'error'}>
              {status.publicEndpointHealth.ok ? 'Healthy' : 'Unavailable'}
            </Badge>
          </StatusItem>
        </div>
        <div
          className="border-t px-6 py-3 text-xs"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}
        >
          {status.publicEndpointHealth.detail} Last checked{' '}
          {formatDateTime(status.publicEndpointHealth.lastCheckedAt)}.
          {status.previousRevision &&
            ` Previous revision ${status.previousRevision} (${status.previousProfile ? samdModeLabel(status.previousProfile) : '—'}) is available for rollback.`}
        </div>
      </Card>

      {/* ── Profile cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {SAMD_MODES.map((profile) => {
          const info = PROFILE_SUMMARY[profile];
          const active = selected === profile;
          const isPublished = status.publishedProfile === profile;
          return (
            <Card key={profile}>
              <button
                type="button"
                onClick={() => {
                  setSelected(profile);
                  setPreview(null);
                }}
                aria-pressed={active}
                className="w-full px-5 py-4 text-left"
                style={
                  active
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--brand-primary) 8%, var(--bg-card))',
                      }
                    : undefined
                }
              >
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant={samdModeTone(profile)}>{samdModeLabel(profile)}</Badge>
                  {isPublished && <Badge variant="info">Published</Badge>}
                  {status.globalOfferingProfile === profile && <Badge variant="neutral">Global offering</Badge>}
                </span>
                <span className="mt-2 block text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {info.name}
                </span>
                <span className="mt-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {info.positioning}
                </span>
              </button>
              <div
                className="space-y-3 border-t px-5 py-4 text-xs"
                style={{ borderColor: 'var(--border-primary)' }}
              >
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Included capabilities
                  </p>
                  <ul className="mt-1 space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {info.includes.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Excluded claims
                  </p>
                  <ul className="mt-1 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                    {info.excludes.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{info.notice}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Live preview ──────────────────────────────────────────────────── */}
      <Card>
        <div
          className="flex flex-wrap items-end gap-3 border-b px-5 py-4"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Page
            </span>
            <select
              value={route}
              onChange={(event) => {
                setRoute(event.target.value);
                setPreview(null);
              }}
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              {PREVIEWABLE_ROUTES.map((entry) => (
                <option key={entry.path} value={entry.path}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Viewport
            </span>
            <div
              role="group"
              aria-label="Viewport"
              className="inline-flex overflow-hidden rounded-md border"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              {PREVIEW_VIEWPORTS.map((entry) => {
                const Icon = VIEWPORT_ICONS[entry.key];
                const active = viewport === entry.key;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setViewport(entry.key)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold"
                    style={
                      active
                        ? { backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }
                        : { color: 'var(--text-muted)' }
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={requestPreview} disabled={busy}>
            {busy ? 'Requesting…' : `Preview ${samdModeLabel(selected)}`}
          </Button>

          {preview && (
            <a
              href={preview.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-semibold underline"
              style={{ color: 'var(--brand-text)' }}
            >
              Open preview in new tab <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <div className="px-5 py-5">
          {previewError && (
            <p className="mb-3 text-sm font-semibold" style={{ color: '#dc2626' }}>
              {previewError}
            </p>
          )}
          {!preview ? (
            <p className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Request a preview to see the {samdModeLabel(selected)} profile. Preview links are
              short-lived, signed by the platform API, and never indexed.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Signed link expires {formatDateTime(preview.expiresAt)} · profile{' '}
                {samdModeLabel(preview.profile)} · revision {preview.contentRevision} · route{' '}
                {preview.route}
              </p>
              <div
                className="mx-auto overflow-hidden rounded-lg border"
                style={{
                  borderColor: 'var(--border-primary)',
                  width: '100%',
                  maxWidth: viewportSpec.width,
                }}
              >
                <iframe
                  key={preview.token}
                  src={preview.previewUrl}
                  title={`RehabSync ${samdModeLabel(preview.profile)} preview`}
                  // Locked-down sandbox: the preview may render and run its own scripts, but cannot
                  // navigate this console, submit forms, or reach same-origin storage.
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="origin"
                  style={{
                    width: '100%',
                    height: Math.min(viewportSpec.height, 760),
                    border: 0,
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Publication controls ──────────────────────────────────────────── */}
      {canPublish ? (
        <Card>
          <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-primary)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Publication
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Publishing changes public wording, features, solutions, screenshots, pricing comparisons,
              FAQs, metadata and regulatory notices together.
            </p>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                disabled={busy || pending || status.strategy === 'follow_global'}
                onClick={() =>
                  post(
                    '/api/admin/website/strategy',
                    {
                      strategy: 'follow_global',
                      reason: 'Following the global SaMD offering for the public website.',
                    },
                    setPublishError,
                  )
                }
              >
                Follow global offering
              </Button>
              <Button
                variant={showPublish ? 'secondary' : 'primary'}
                onClick={() => {
                  setShowPublish((current) => !current);
                  setPublishError(null);
                }}
              >
                {showPublish ? 'Cancel publish' : `Publish ${samdModeLabel(selected)}`}
              </Button>
              {status.previousRevision && (
                <Button
                  variant="secondary"
                  disabled={busy || pending}
                  onClick={() =>
                    post(
                      '/api/admin/website/rollback',
                      {
                        targetRevision: status.previousRevision,
                        reason: `Rolling back to the last known good revision ${status.previousRevision}.`,
                      },
                      setPublishError,
                    )
                  }
                >
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Roll back to {status.previousRevision}
                  </span>
                </Button>
              )}
            </div>

            {showPublish && (
              <div
                className="space-y-4 rounded-md border px-4 py-4"
                style={{
                  borderColor: mismatchedPublish
                    ? 'color-mix(in srgb, #dc2626 40%, var(--border-primary))'
                    : 'var(--border-primary)',
                  backgroundColor: mismatchedPublish
                    ? 'color-mix(in srgb, #dc2626 6%, var(--bg-card))'
                    : 'var(--bg-hover)',
                }}
              >
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {mismatchedPublish
                      ? 'Website profile differs from the global SaMD offering'
                      : 'Publish this RehabSync offering?'}
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {mismatchedPublish
                      ? `You are publishing the ${samdModeLabel(selected)} profile while the global offering is ${samdModeLabel(status.globalOfferingProfile)}. The wording, pricing feature list, screenshots and solutions shown publicly will not match the global product configuration, and a persistent red banner will remain until this is reconciled.`
                      : 'Confirm that the selected profile matches the global offering and that tenant-specific overrides are handled separately.'}
                  </p>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Reason for publication (required)
                  </span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={2}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Approval or review reference (required)
                  </span>
                  <Input
                    value={approvalReference}
                    onChange={(event) => setApprovalReference(event.target.value)}
                    placeholder="e.g. MKT-2026-031"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Content revision (required)
                  </span>
                  <Input
                    value={revision}
                    onChange={(event) => setRevision(event.target.value)}
                    placeholder={`e.g. ${selected === 'on' ? 'full' : selected}-2026-07-01`}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Type <code>{requiredPhrase}</code> to confirm
                  </span>
                  <Input value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder={requiredPhrase} />
                </label>

                {publishError && (
                  <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
                    {publishError}
                  </p>
                )}

                <Button
                  variant={mismatchedPublish ? 'danger' : 'primary'}
                  disabled={
                    busy ||
                    pending ||
                    !reason.trim() ||
                    !approvalReference.trim() ||
                    !revision.trim() ||
                    phrase.trim() !== requiredPhrase
                  }
                  onClick={async () => {
                    const ok = await post(
                      '/api/admin/website/publish',
                      {
                        expectedCurrentRevision: status.publishedRevision,
                        profile: selected,
                        newRevision: revision.trim(),
                        reason: reason.trim(),
                        approvalReference: approvalReference.trim(),
                        confirmationPhrase: phrase.trim(),
                      },
                      setPublishError,
                    );
                    if (ok) {
                      setShowPublish(false);
                      setReason('');
                      setApprovalReference('');
                      setRevision('');
                      setPhrase('');
                    }
                  }}
                >
                  {busy ? 'Publishing…' : `Publish ${samdModeLabel(selected)}`}
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-3 px-6 py-4">
            <Badge variant="warning">Read only</Badge>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Publishing, changing the strategy and rolling back require a platform super admin.
            </p>
          </div>
        </Card>
      )}

      {/* ── Audit history ─────────────────────────────────────────────────── */}
      <Card>
        <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Website publication history
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                {['When', 'Action', 'Profile', 'Revision', 'Global', 'Mismatched tenants', 'Actor', 'Approval'].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-2 text-left text-xs font-bold uppercase tracking-wider">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {status.events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No publication events recorded yet.
                  </td>
                </tr>
              ) : (
                status.events.map((event) => (
                  <tr key={event.id} className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <td className="px-5 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-primary)' }}>
                      {actionLabel(event.action)}
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {event.previousProfile ?? '—'} → {event.newProfile ?? '—'}
                    </td>
                    <td className="px-5 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {event.newRevision ?? '—'}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {event.globalOfferingProfile ?? '—'}
                      {event.globalFeatureState === 'mixed' ? ' (mixed)' : ''}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {event.tenantMismatchCount ?? '—'}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-secondary)' }}>
                      {event.actorName ?? '—'}
                    </td>
                    <td className="px-5 py-2" style={{ color: 'var(--text-muted)' }}>
                      {event.approvalReference ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
