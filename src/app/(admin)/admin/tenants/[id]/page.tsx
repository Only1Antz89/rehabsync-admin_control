import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card } from '@rs/ui';
import type { BadgeVariant } from '@rs/ui';
import { TenantActions } from '../TenantActions';
import { OverridePlanModal } from './OverridePlanModal';
import { ExtendTrialModal } from './ExtendTrialModal';
import { EnablePilotModal } from './EnablePilotModal';
import { TenantNotes } from './TenantNotes';
import { TenantSupportOperations } from './TenantSupportOperations';
import { TenantGovernance } from './TenantGovernance';
import type { TenantEntitlementsView } from './TenantGovernance';
import { TenantStoreSettings } from './TenantStoreSettings';
import type { TenantStoreSettingsView } from './TenantStoreSettings';
import { adminFetch } from '../../../../../lib/admin-api';

interface TenantDetail {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    createdAt: string;
    onboardingStep: number;
  };
  branding: {
    primaryColor: string | null;
    logoUrl: string | null;
    displayName: string | null;
    supportEmail: string | null;
  } | null;
  plan: {
    id: string;
    name: string;
    priceMonthly: number;
    maxConsultants: number;
    maxPatients: number;
    aiQueriesPerMonth: number;
  } | null;
  usage: { metric: string; total: number }[];
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  patientSubscriptions: {
    id: string;
    name: string;
    email: string | null;
    subscriptionTier: string;
    clientSubscriptionStatus: string;
    clientStripeCustomerId: string | null;
    clientStripeSubscriptionId: string | null;
    updatedAt: string;
  }[];
  healthScore: number;
  compliance: {
    shutdownModeEnabled: boolean;
    shutdownModeReason: string | null;
    shutdownModeEnabledAt: string | null;
    offboardingStatus: string | null;
    contractEndDate: string | null;
    dataExportDeadline: string | null;
    finalDeletionDate: string | null;
    retention: {
      total: number;
      discharged: number;
      onLegalHold: number;
      dueForDeletion: number;
      deleted: number;
    };
  };
}

type PlansApiResponse = { plans?: { id: string; name: string }[] } | { id: string; name: string }[];

async function fetchTenantDetail(id: string): Promise<TenantDetail | null> {
  try {
    const res = await adminFetch(`/api/v1/admin/tenants/${id}`, {
      next: { revalidate: 0 },
    });
    if (res.status === 404) return null;
    if (res.ok) {
      return (await res.json()) as TenantDetail;
    }
  } catch {
    // API unavailable
  }
  return null;
}

async function fetchPlans(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await adminFetch('/api/v1/admin/plans', {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      // The admin plans endpoint returns a bare array; tolerate a { plans: [...] } wrapper too.
      const data = (await res.json()) as PlansApiResponse;
      const list = Array.isArray(data) ? data : (data.plans ?? []);
      return list.map((p) => ({ id: p.id, name: p.name }));
    }
  } catch {
    // ignore
  }
  return [];
}

async function fetchEntitlements(id: string): Promise<TenantEntitlementsView | null> {
  try {
    const res = await adminFetch(`/api/v1/admin/tenants/${id}/entitlements`, {
      next: { revalidate: 0 },
    });
    if (res.ok) {
      return (await res.json()) as TenantEntitlementsView;
    }
  } catch {
    // API unavailable
  }
  return null;
}

async function fetchStoreSettings(id: string): Promise<TenantStoreSettingsView | null> {
  try {
    const res = await adminFetch(`/api/v1/admin/tenants/${id}/store-settings`, {
      next: { revalidate: 0 },
    });
    if (res.ok) {
      return (await res.json()) as TenantStoreSettingsView;
    }
  } catch {
    // API unavailable
  }
  return null;
}

function lifecycleBadgeVariant(stage: string): BadgeVariant {
  switch (stage) {
    case 'active':
      return 'success';
    case 'pilot':
      return 'info';
    case 'onboarding':
      return 'warning';
    case 'churned':
      return 'error';
    case 'prospect':
    default:
      return 'neutral';
  }
}

function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'trial':
      return 'info';
    case 'past_due':
      return 'warning';
    case 'suspended':
      return 'error';
    case 'cancelled':
    default:
      return 'neutral';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

/** Trial state badge: days-left while in-window, or a locked flag once the trial has expired. */
function trialInfo(
  status: string,
  trialEndsAt: string | null,
): { label: string; variant: BadgeVariant } | null {
  if (status !== 'trial' || !trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return { label: 'Trial expired · locked', variant: 'error' };
  const days = Math.ceil(ms / 86_400_000);
  return { label: `Trial · ${days} day${days === 1 ? '' : 's'} left`, variant: days <= 3 ? 'warning' : 'info' };
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    clinic_admin: 'Admin',
    consultant: 'Consultant',
    patient: 'Patient',
  };
  return map[role] ?? role;
}

function usageMetricLabel(metric: string): string {
  const map: Record<string, string> = {
    ai_queries: 'AI queries this month',
    active_users: 'Active users',
  };
  return map[metric] ?? metric;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, plans, entitlements, storeSettings] = await Promise.all([
    fetchTenantDetail(id),
    fetchPlans(),
    fetchEntitlements(id),
    fetchStoreSettings(id),
  ]);

  if (!detail) {
    notFound();
  }

  const { tenant, branding, plan, usage, users, patientSubscriptions, healthScore, compliance } = detail;

  const primaryColor = branding?.primaryColor ?? '#0d9488';
  const displayName = branding?.displayName ?? tenant.name;
  const supportEmail =
    branding?.supportEmail ??
    process.env['REHABSYNC_SUPPORT_INTAKE_EMAIL'] ??
    process.env['REHABSYNC_EMAIL_REPLY_TO'] ??
    'support@rehabsync.com';

  const aiUsage = usage.find((u) => u.metric === 'ai_queries');
  const activeUsers = usage.find((u) => u.metric === 'active_users');

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Link href="/admin/tenants" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
          Tenants
        </Link>
        <span>/</span>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{tenant.name}</span>
      </nav>

      {/* Tenant header */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{tenant.name}</h1>
              <Badge variant={statusBadgeVariant(tenant.status)}>{tenant.status}</Badge>
              {(() => {
                const t = trialInfo(tenant.status, tenant.trialEndsAt);
                return t ? <Badge variant={t.variant}>{t.label}</Badge> : null;
              })()}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: healthScore >= 70 ? '#dcfce7' : healthScore >= 40 ? '#fef3c7' : '#fee2e2',
                  color: healthScore >= 70 ? '#15803d' : healthScore >= 40 ? '#92400e' : '#b91c1c',
                }}
              >
                {healthScore >= 70 ? 'Healthy' : healthScore >= 40 ? 'At Risk' : 'Critical'} ({healthScore})
              </span>
              {entitlements && (
                <Badge variant={lifecycleBadgeVariant(entitlements.lifecycleStage)}>
                  {entitlements.lifecycleStage}
                </Badge>
              )}
              {entitlements?.pilot.enrolled && (
                <Badge variant="info">
                  Pilot{entitlements.pilot.cohort ? ` · ${entitlements.pilot.cohort}` : ''}
                </Badge>
              )}
            </div>
            <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{tenant.slug}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {plan ? (
                <>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{plan.name}</span>
                  {' · '}
                </>
              ) : null}
              Created {formatDate(tenant.createdAt)}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <TenantActions tenantId={tenant.id} currentStatus={tenant.status} />
            <OverridePlanModal
              tenantId={tenant.id}
              currentPlanId={plan?.id}
              plans={plans}
            />
            <ExtendTrialModal tenantId={tenant.id} />
            <EnablePilotModal
              tenantId={tenant.id}
              enrolled={entitlements?.pilot.enrolled ?? false}
              currentCohort={entitlements?.pilot.cohort ?? null}
            />
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left — Branding preview */}
        <Card title="Branding">
          <div className="space-y-4">
            <div
              className="w-full h-20 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              {branding?.logoUrl ? (
                <Image
                  src={branding.logoUrl}
                  alt={displayName}
                  width={160}
                  height={64}
                  className="h-10 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {getInitials(displayName)}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Display name</p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Primary colour</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded"
                  style={{ backgroundColor: primaryColor, border: '1px solid var(--border-primary)' }}
                />
                <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{primaryColor}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Middle — Usage stats */}
        <Card title="Usage">
          <div className="space-y-4">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>AI queries this month</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {aiUsage?.total ?? 0}
                {plan && (
                  <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                    {' '}/ {plan.aiQueriesPerMonth}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Active users</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {activeUsers?.total ?? users.length}
              </p>
            </div>
            {plan && (
              <div className="pt-2 space-y-2" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Plan limits</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Max consultants</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.maxConsultants}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Max patients</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.maxPatients}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>AI quota</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{plan.aiQueriesPerMonth}</p>
                  </div>
                </div>
              </div>
            )}
            {usage
              .filter((u) => u.metric !== 'ai_queries' && u.metric !== 'active_users')
              .map((u) => (
                <div key={u.metric}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>{usageMetricLabel(u.metric)}</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{u.total}</p>
                </div>
              ))}
          </div>
        </Card>

        {/* Right — Billing */}
        <Card title="Billing">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Stripe customer</p>
              <p className="font-mono break-all" style={{ color: 'var(--text-secondary)' }}>
                {tenant.stripeCustomerId ?? (
                  <span className="font-sans" style={{ color: 'var(--text-muted)' }}>No Stripe customer</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Stripe subscription</p>
              <p className="font-mono break-all" style={{ color: 'var(--text-secondary)' }}>
                {tenant.stripeSubscriptionId ?? (
                  <span className="font-sans" style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </p>
            </div>
            {tenant.currentPeriodEndsAt && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Next billing date</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDate(tenant.currentPeriodEndsAt)}</p>
              </div>
            )}
            {tenant.trialEndsAt && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Trial ends</p>
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{formatDate(tenant.trialEndsAt)}</p>
              </div>
            )}
            {plan && (
              <div>
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>MRR contribution</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatPence(plan.priceMonthly)}
                  <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}> /mo</span>
                </p>
              </div>
            )}
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Onboarding step</p>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{tenant.onboardingStep}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pilot programme & entitlements control surface */}
      {entitlements && <TenantGovernance tenantId={tenant.id} data={entitlements} />}

      {/* Store (recommended equipment) credentials & config */}
      {storeSettings && <TenantStoreSettings tenantId={tenant.id} data={storeSettings} />}

      {/* Data retention & offboarding oversight (read-only) */}
      <Card title="Data & compliance" description="Retention, legal holds and offboarding status for this clinic.">
        <div className="flex flex-wrap gap-6 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Read-only shutdown</p>
            {compliance.shutdownModeEnabled ? (
              <Badge variant="error">
                on{compliance.shutdownModeReason ? ` · ${compliance.shutdownModeReason}` : ''}
              </Badge>
            ) : (
              <Badge variant="success">off</Badge>
            )}
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Offboarding</p>
            <Badge
              variant={
                compliance.offboardingStatus === 'deleted'
                  ? 'error'
                  : compliance.offboardingStatus
                    ? 'warning'
                    : 'neutral'
              }
            >
              {compliance.offboardingStatus ?? 'none'}
            </Badge>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Contract end</p>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{compliance.contractEndDate ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Final deletion</p>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{compliance.finalDeletionDate ?? '—'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            ['Patients', compliance.retention.total],
            ['Discharged', compliance.retention.discharged],
            ['Legal hold', compliance.retention.onLegalHold],
            ['Due disposal', compliance.retention.dueForDeletion],
            ['Deleted', compliance.retention.deleted],
          ] as const).map(([label, value]) => (
            <div key={label} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent users */}
      <Card title="Users">
        <div className="overflow-x-auto -mx-6 -mb-4">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
              <tr>
                <th className="text-left px-6 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Name
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Role
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="transition-colors">
                    <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                      >
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TenantSupportOperations
        tenantId={tenant.id}
        supportEmail={supportEmail}
        users={users}
        patientSubscriptions={patientSubscriptions ?? []}
      />

      {/* Account notes */}
      <Card title="Account Notes" description="Internal notes visible only to platform admins.">
        <TenantNotes tenantId={tenant.id} />
      </Card>
    </div>
  );
}
