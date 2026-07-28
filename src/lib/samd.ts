/**
 * Local SaMD types for the standalone Admin Centre.
 *
 * This repository is a THIN CLIENT over `/api/v1/admin/*`. It holds no database client, no database
 * credentials and no `@rs/*` workspace imports beyond the vendored UI kit. These types therefore
 * mirror the canonical definitions in the main repository's `packages/types/src/samd.ts` rather than
 * importing them.
 *
 * The main repository owns the rules. Everything here is display and request shaping: the API
 * validates every feature key, mode, confirmation phrase and acknowledgement server-side, and rejects
 * anything this client gets wrong. Keep this file in step with the canonical registry — the
 * `/api/v1/admin/samd-settings/registry` endpoint is the authority if the two ever disagree.
 */

export const SAMD_MODES = ['off', 'partial', 'on'] as const;
export type SamdMode = (typeof SAMD_MODES)[number];

export const TENANT_SAMD_OVERRIDES = ['inherit', 'off', 'partial', 'on'] as const;
export type TenantSamdOverride = (typeof TENANT_SAMD_OVERRIDES)[number];

export type WebsiteProfile = SamdMode;
export type WebsitePublicationStrategy = 'follow_global' | 'manual_override';
export type GlobalSamdFeatureState = 'aligned' | 'mixed';

/** `on` is presented to administrators and the public as "Full". */
export function samdModeLabel(mode: SamdMode): string {
  return mode === 'on' ? 'Full' : mode === 'partial' ? 'Partial' : 'Off';
}

export function overrideLabel(override: TenantSamdOverride): string {
  return override === 'inherit' ? 'Inherit global' : samdModeLabel(override);
}

/** Badge variant per mode, using the vendored UI kit's semantic set. */
export function samdModeTone(mode: SamdMode): 'error' | 'warning' | 'success' {
  return mode === 'on' ? 'error' : mode === 'partial' ? 'warning' : 'success';
}

export const SAMD_FEATURE_GROUPS = [
  'Diagnosis and triage',
  'Treatment and recovery',
  'Monitoring and risk',
  'AI and media',
  'Documentation and resources',
  'Sports',
] as const;
export type SamdFeatureGroup = (typeof SAMD_FEATURE_GROUPS)[number];

// ── Confirmation phrases and acknowledgements (mirrors the canonical set) ────

export const SAMD_CONFIRMATION_PHRASES = {
  enablePartial: 'ENABLE PARTIAL',
  enableFullTenant: 'ENABLE FULL SAMD',
  enableFullGlobal: 'ENABLE FULL SAMD FOR ALL TENANTS',
  applyToAllTenants: 'APPLY TO ALL TENANTS',
  publishWebsite: 'PUBLISH WEBSITE',
  publishMismatchedWebsite: 'PUBLISH MISMATCHED WEBSITE',
} as const;

export const SAMD_PARTIAL_ACKNOWLEDGEMENTS = [
  'I understand partial mode may still trigger medical-device obligations.',
  'I confirm the scaled-back restrictions have been reviewed for this scope.',
  'I will not describe this setting as MHRA approved, certified or guaranteed non-SaMD.',
] as const;

export const SAMD_FULL_ACKNOWLEDGEMENTS = [
  'A named regulatory or clinical safety lead has approved this activation.',
  'The applicable classification and market-access route have been documented.',
  'The affected pilot or clinic has appropriate governance and insurance.',
  'I understand this action is audited and may create regulatory and patient-safety obligations.',
] as const;

const MODE_RANK: Record<SamdMode, number> = { off: 0, partial: 1, on: 2 };

/** Does moving from `previous` to `next` reduce or remove clinical functionality? */
export function isSamdDowngrade(previous: SamdMode, next: SamdMode): boolean {
  return MODE_RANK[next] < MODE_RANK[previous];
}

/** The typed phrase required for an activation, or null when the change is a downgrade. */
export function requiredConfirmation(scope: 'global' | 'tenant', mode: SamdMode): string | null {
  if (mode === 'partial') return SAMD_CONFIRMATION_PHRASES.enablePartial;
  if (mode === 'on') {
    return scope === 'global'
      ? SAMD_CONFIRMATION_PHRASES.enableFullGlobal
      : SAMD_CONFIRMATION_PHRASES.enableFullTenant;
  }
  return null;
}

export function requiredAcknowledgements(mode: SamdMode): readonly string[] {
  if (mode === 'partial') return SAMD_PARTIAL_ACKNOWLEDGEMENTS;
  if (mode === 'on') return SAMD_FULL_ACKNOWLEDGEMENTS;
  return [];
}

// ── Warning dialog copy ─────────────────────────────────────────────────────

export interface SamdWarningCopy {
  title: string;
  body: string;
  acknowledgements: readonly string[];
  /** Whether an approval reference is mandatory (not merely optional). */
  approvalRequired: boolean;
  confirmationPhrase: string | null;
}

export function samdWarningFor(scope: 'global' | 'tenant', mode: SamdMode, previous: SamdMode): SamdWarningCopy {
  if (isSamdDowngrade(previous, mode)) {
    return {
      title: 'Reduce or disable this feature?',
      body:
        'New clinical processing will stop immediately. Existing generated records are preserved for authorised audit access, but the relevant tenant and patient interfaces may become unavailable.',
      acknowledgements: [],
      approvalRequired: false,
      confirmationPhrase: null,
    };
  }

  if (mode === 'partial') {
    return {
      title: 'Enable scaled-back clinical functionality?',
      body:
        'Partial mode exposes a restricted version of this feature. It removes patient-specific diagnosis, prognosis, treatment, urgency, risk classification or clinical recommendation as defined for this feature. However, intended purpose and real-world use may still cause the software to be treated as SaMD. Enabling partial mode does not make RehabSync MHRA compliant, approved, certified or registered.',
      acknowledgements: SAMD_PARTIAL_ACKNOWLEDGEMENTS,
      approvalRequired: false,
      confirmationPhrase: SAMD_CONFIRMATION_PHRASES.enablePartial,
    };
  }

  if (mode === 'on') {
    return {
      title: 'High-risk regulatory action: enable full SaMD functionality',
      body:
        'Full mode enables patient-specific clinical decision support that may diagnose, predict, recommend treatment, prioritise urgency, assess risk or influence care. This may place the module on the market or put it into service as medical-device software. Do not enable unless the regulatory route, technical documentation, clinical evidence, post-market surveillance, registration or accepted conformity status, clinic governance and insurance have been reviewed and approved.',
      acknowledgements: SAMD_FULL_ACKNOWLEDGEMENTS,
      approvalRequired: true,
      confirmationPhrase: requiredConfirmation(scope, mode),
    };
  }

  return {
    title: 'Disable this feature?',
    body:
      'New clinical processing will stop immediately. Existing generated records are preserved for authorised audit access, but the relevant tenant and patient interfaces may become unavailable.',
    acknowledgements: [],
    approvalRequired: false,
    confirmationPhrase: null,
  };
}

// ── API response shapes ─────────────────────────────────────────────────────

export interface SamdFeatureRow {
  key: string;
  label: string;
  description: string;
  group: string;
  riskLevel: string;
  partialBehaviour: string;
  fullBehaviour: string;
  offBehaviour: string;
  affectedRoutes: string[];
  affectedUiAreas: string[];
  affectedJobs: string[];
  relatedEntitlement: string | null;
  globalMode: SamdMode;
  reason: string | null;
  approvalReference: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  tenantOverrideCount: number;
  effectiveCounts: Record<SamdMode, number>;
}

export interface SamdAuditEvent {
  id: string;
  scope: string;
  tenantId: string | null;
  featureKey: string | null;
  previousMode: string | null;
  newMode: string | null;
  action: string;
  reason: string | null;
  approvalReference: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface SamdSettingsView {
  offeringProfile: SamdMode;
  globalFeatureState: GlobalSamdFeatureState;
  mismatches: Array<{ key: string; label: string; expected: SamdMode; actual: SamdMode }>;
  features: SamdFeatureRow[];
  summary: {
    featuresOff: number;
    featuresPartial: number;
    featuresOn: number;
    tenantsWithOverrides: number;
    tenantsEffectivelyOn: number;
    totalTenants: number;
    lastRegulatoryChangeAt: string | null;
  };
  events: SamdAuditEvent[];
}

export interface TenantSamdFeatureRow {
  key: string;
  label: string;
  group: string;
  riskLevel: string;
  globalMode: SamdMode;
  override: TenantSamdOverride;
  effectiveMode: SamdMode;
  differsFromGlobal: boolean;
  lastChangedAt: string | null;
  lastChangedBy: string | null;
}

export interface TenantSamdSettingsView {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  features: TenantSamdFeatureRow[];
  events: SamdAuditEvent[];
}

export interface SamdTenantListRow {
  tenantId: string;
  name: string;
  slug: string;
  status: string;
  lifecycleStage: string;
  pilotCohort: string | null;
  overrideCount: number;
  counts: Record<SamdMode, number>;
  feature?: {
    key: string;
    globalMode: SamdMode;
    override: TenantSamdOverride;
    effectiveMode: SamdMode;
  };
}

export interface WebsiteStatusView {
  globalOfferingProfile: SamdMode;
  globalOfferingLabel: string;
  globalFeatureState: GlobalSamdFeatureState;
  globalMismatches: Array<{ key: string; label: string; expected: string; actual: string }>;
  strategy: WebsitePublicationStrategy;
  manualProfile: WebsiteProfile | null;
  resolvedProfile: WebsiteProfile;
  profileMismatch: boolean;
  overrideExpired: boolean;
  publishedProfile: WebsiteProfile;
  publishedRevision: string;
  previousProfile: WebsiteProfile | null;
  previousRevision: string | null;
  reason: string | null;
  approvalReference: string | null;
  reviewAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  tenantMismatch: {
    totalTenants: number;
    tenantsNotRepresented: number;
    countsByEffectiveMode: Record<string, number>;
  };
  publicEndpointHealth: { ok: boolean; lastCheckedAt: string; detail: string };
  events: WebsiteAuditEvent[];
}

export interface WebsiteAuditEvent {
  id: string;
  action: string;
  strategy: string | null;
  previousProfile: string | null;
  newProfile: string | null;
  previousRevision: string | null;
  newRevision: string | null;
  globalOfferingProfile: string | null;
  globalFeatureState: string | null;
  tenantMismatchCount: number | null;
  reason: string | null;
  approvalReference: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface PreviewTokenResult {
  token: string;
  previewUrl: string;
  expiresAt: string;
  profile: WebsiteProfile;
  contentRevision: string;
  route: string;
}

/** Public routes the Admin Centre offers for preview. Mirrors the website's previewable set. */
export const PREVIEWABLE_ROUTES = [
  { path: '/', label: 'Homepage' },
  { path: '/features', label: 'Features' },
  { path: '/solutions', label: 'Solutions' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/faq', label: 'FAQ' },
] as const;

export const PREVIEW_VIEWPORTS = [
  { key: 'desktop', label: 'Desktop', width: 1440, height: 900 },
  { key: 'tablet', label: 'Tablet', width: 834, height: 1112 },
  { key: 'mobile', label: 'Mobile', width: 390, height: 844 },
] as const;
export type PreviewViewport = (typeof PREVIEW_VIEWPORTS)[number]['key'];

/** Human label for an audit action code. */
export function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    set_global_mode: 'Global mode changed',
    set_tenant_override: 'Tenant override set',
    clear_tenant_override: 'Tenant override cleared',
    apply_to_all_tenants: 'Applied to all tenants',
    bulk_apply_profile: 'Offering applied to all features',
    set_offering_profile: 'Offering profile changed',
    migration_seed: 'Seeded by migration',
    publish: 'Website published',
    rollback: 'Website rolled back',
    strategy_change: 'Publication strategy changed',
    manual_override: 'Manual override activated',
    override_expired: 'Manual override expired',
    publish_failed: 'Publish attempt failed',
  };
  return labels[action] ?? action.replace(/_/g, ' ');
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
