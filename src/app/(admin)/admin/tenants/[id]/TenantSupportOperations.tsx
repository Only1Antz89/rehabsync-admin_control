'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Mail, PauseCircle, PlayCircle, RefreshCw, ShieldCheck, StopCircle } from 'lucide-react';

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PatientSubscription {
  id: string;
  name: string;
  email: string | null;
  subscriptionTier: string;
  clientSubscriptionStatus: string;
  clientStripeCustomerId: string | null;
  clientStripeSubscriptionId: string | null;
  updatedAt: string;
}

interface TenantSupportOperationsProps {
  tenantId: string;
  supportEmail: string;
  users: TenantUser[];
  patientSubscriptions: PatientSubscription[];
}

const TIERS = [
  { value: 'essential', label: 'Essential' },
  { value: 'plus', label: 'Plus' },
  { value: 'sports', label: 'Sports' },
] as const;

function statusStyle(status: string): CSSProperties {
  if (status === 'active') return { backgroundColor: '#dcfce7', color: '#15803d' };
  if (status === 'suspended') return { backgroundColor: '#fef3c7', color: '#92400e' };
  if (status === 'past_due') return { backgroundColor: '#fee2e2', color: '#b91c1c' };
  return { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' };
}

function labelFromValue(value: string): string {
  return value.replaceAll('_', ' ').replace(/^\w/, (char) => char.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    clinic_admin: 'Admin',
    consultant: 'Consultant',
    patient: 'Patient',
  };
  return map[role] ?? role;
}

export function TenantSupportOperations({
  tenantId,
  supportEmail,
  users,
  patientSubscriptions,
}: TenantSupportOperationsProps) {
  const router = useRouter();
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [updatingPatientId, setUpdatingPatientId] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>(() =>
    Object.fromEntries(patientSubscriptions.map((patient) => [patient.id, patient.subscriptionTier])),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const adminUsers = useMemo(
    () => users.filter((user) => user.role === 'clinic_admin' || user.role === 'consultant'),
    [users],
  );

  async function sendPasswordReset(user: TenantUser) {
    setNotice(null);
    setError(null);
    setResettingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/users/${user.id}/password-reset`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(body?.message ?? body?.error ?? 'Password reset could not be sent.');
      }
      setNotice(`Password reset sent to ${user.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset could not be sent.');
    } finally {
      setResettingUserId(null);
    }
  }

  async function updateSubscription(patient: PatientSubscription, action: 'enable' | 'change' | 'suspend' | 'disable') {
    setNotice(null);
    setError(null);
    setUpdatingPatientId(patient.id);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/patients/${patient.id}/subscription`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          subscriptionTier: selectedTiers[patient.id] ?? patient.subscriptionTier,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(body?.message ?? body?.error ?? 'Subscription update failed.');
      }
      setNotice(`${patient.name} subscription updated.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription update failed.');
    } finally {
      setUpdatingPatientId(null);
    }
  }

  return (
    <div className="space-y-6">
      {(notice || error) && (
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium"
          style={
            notice
              ? { backgroundColor: '#dcfce7', color: '#15803d' }
              : { backgroundColor: '#fee2e2', color: '#b91c1c' }
          }
        >
          {notice ?? error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section
          className="overflow-hidden rounded-xl"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        >
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border-primary)' }}>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>User Access</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Send reset links for admins and consultants.</p>
            </div>
            <ShieldCheck className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
                <tr>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Role</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Joined</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Reset</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
                {adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                      No admin or consultant users found.
                    </td>
                  </tr>
                ) : (
                  adminUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void sendPasswordReset(user)}
                          disabled={resettingUserId !== null}
                          className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          {resettingUserId === user.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          Send link
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)', color: 'var(--brand-primary)' }}>
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Email Intake</h2>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                Admins can raise support tickets by emailing the platform support desk.
              </p>
            </div>
          </div>
          <a
            href={`mailto:${supportEmail}?subject=Support%20ticket`}
            className="mt-5 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
          >
            <span className="truncate">{supportEmail}</span>
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
          </a>
        </section>
      </div>

      <section
        className="overflow-hidden rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Patient Subscriptions</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enable, change, suspend, or disable patient membership access during support incidents.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-secondary)' }}>
              <tr>
                <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Patient</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Tier</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Stripe subscription</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
              {patientSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                    No patients found.
                  </td>
                </tr>
              ) : (
                patientSubscriptions.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{patient.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{patient.email ?? 'No email'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={selectedTiers[patient.id] ?? patient.subscriptionTier}
                        onChange={(event) => setSelectedTiers((current) => ({ ...current, [patient.id]: event.target.value }))}
                        className="rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-primary)',
                          '--tw-ring-color': 'var(--brand-primary)',
                        } as CSSProperties}
                      >
                        {TIERS.map((tier) => (
                          <option key={tier.value} value={tier.value}>{tier.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" style={statusStyle(patient.clientSubscriptionStatus)}>
                        {labelFromValue(patient.clientSubscriptionStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {patient.clientStripeSubscriptionId ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void updateSubscription(patient, 'enable')}
                          disabled={updatingPatientId !== null}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                          style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> Enable
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateSubscription(patient, 'change')}
                          disabled={updatingPatientId !== null}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${updatingPatientId === patient.id ? 'animate-spin' : ''}`} /> Change
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateSubscription(patient, 'suspend')}
                          disabled={updatingPatientId !== null}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                          style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                        >
                          <PauseCircle className="h-3.5 w-3.5" /> Suspend
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateSubscription(patient, 'disable')}
                          disabled={updatingPatientId !== null}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55"
                          style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
                        >
                          <StopCircle className="h-3.5 w-3.5" /> Disable
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
