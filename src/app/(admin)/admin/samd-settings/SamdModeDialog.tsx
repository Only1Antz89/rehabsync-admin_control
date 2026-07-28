'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button, Input } from '@rs/ui';
import {
  samdModeLabel,
  samdWarningFor,
  type SamdMode,
  type TenantSamdOverride,
} from '../../../../lib/samd';

/**
 * The gated confirmation dialog for a SaMD mode change.
 *
 * It requires every acknowledgement, a reason, an approval reference where mandatory, and the exact
 * typed confirmation phrase before it will submit. The submit button is disabled until all of that is
 * satisfied — but that is a usability affordance only: the platform API re-validates every field and
 * rejects the request otherwise, so a disabled button is never the authorisation.
 */
export interface SamdModeDialogSubmission {
  mode: SamdMode | TenantSamdOverride;
  reason: string;
  approvalReference: string | null;
  changeReference: string | null;
  confirmationPhrase: string | null;
  acknowledgements: string[];
  clearTenantOverrides?: boolean;
}

export function SamdModeDialog({
  scope,
  featureLabel,
  previousMode,
  requestedMode,
  /** The effective mode the request resolves to, used to pick the right warning for `inherit`. */
  effectiveMode,
  affectedTenantCount,
  tenantOverrideCount,
  allowClearOverrides,
  onCancel,
  onConfirm,
  busy,
  error,
}: {
  scope: 'global' | 'tenant';
  featureLabel: string;
  previousMode: SamdMode;
  requestedMode: SamdMode | TenantSamdOverride;
  effectiveMode: SamdMode;
  affectedTenantCount?: number;
  tenantOverrideCount?: number;
  allowClearOverrides?: boolean;
  onCancel: () => void;
  onConfirm: (submission: SamdModeDialogSubmission) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const warning = samdWarningFor(scope, effectiveMode, previousMode);

  const [reason, setReason] = useState('');
  const [approvalReference, setApprovalReference] = useState('');
  const [changeReference, setChangeReference] = useState('');
  const [phrase, setPhrase] = useState('');
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [clearOverrides, setClearOverrides] = useState(false);
  const [clearPhrase, setClearPhrase] = useState('');

  const allAcknowledged = warning.acknowledgements.every((ack) => ticked[ack]);
  const phraseOk = !warning.confirmationPhrase || phrase.trim() === warning.confirmationPhrase;
  const approvalOk = !warning.approvalRequired || approvalReference.trim().length > 0;
  const clearOk = !clearOverrides || clearPhrase.trim() === 'APPLY TO ALL TENANTS';
  const ready = reason.trim().length > 0 && allAcknowledged && phraseOk && approvalOk && clearOk;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={warning.title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{ backgroundColor: 'rgba(15,23,42,.62)' }}
    >
      <div
        className="w-full max-w-2xl rounded-lg border shadow-xl"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-6 py-4"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: effectiveMode === 'on' ? '#dc2626' : '#b45309' }}
            />
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {warning.title}
              </h2>
              <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {featureLabel} · {samdModeLabel(previousMode)} →{' '}
                {requestedMode === 'inherit'
                  ? `Inherit global (${samdModeLabel(effectiveMode)})`
                  : samdModeLabel(requestedMode as SamdMode)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded p-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {warning.body}
          </p>

          {/* The affected-tenant count is shown BEFORE a global change is applied. */}
          {scope === 'global' && affectedTenantCount !== undefined && (
            <div
              className="rounded-md border px-4 py-3 text-sm"
              style={{
                borderColor: 'var(--border-primary)',
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
              }}
            >
              This global change affects <strong>{affectedTenantCount}</strong>{' '}
              {affectedTenantCount === 1 ? 'tenant' : 'tenants'}.{' '}
              {tenantOverrideCount ? (
                <>
                  <strong>{tenantOverrideCount}</strong>{' '}
                  {tenantOverrideCount === 1 ? 'tenant has' : 'tenants have'} an explicit override for
                  this feature and will <strong>keep</strong> it unless you clear overrides below.
                </>
              ) : (
                'No tenant currently overrides this feature, so all of them inherit the new mode.'
              )}
            </div>
          )}

          {warning.acknowledgements.length > 0 && (
            <fieldset className="space-y-2">
              <legend
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Required acknowledgements
              </legend>
              {warning.acknowledgements.map((ack) => (
                <label
                  key={ack}
                  className="flex cursor-pointer items-start gap-2 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(ticked[ack])}
                    onChange={(event) =>
                      setTicked((current) => ({ ...current, [ack]: event.target.checked }))
                    }
                  />
                  <span>{ack}</span>
                </label>
              ))}
            </fieldset>
          )}

          <label className="block space-y-1.5">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Reason for this change (required)
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--bg-input, var(--bg-card))',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              placeholder="Why is this capability changing mode?"
            />
          </label>

          <label className="block space-y-1.5">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {warning.approvalRequired
                ? 'Regulatory approval reference (required)'
                : 'Regulatory or pilot reference (optional)'}
            </span>
            <Input
              value={approvalReference}
              onChange={(event) => setApprovalReference(event.target.value)}
              placeholder={warning.approvalRequired ? 'e.g. REG-2026-014' : 'e.g. PILOT-07'}
            />
          </label>

          {warning.approvalRequired && (
            <label className="block space-y-1.5">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Change or governance ticket reference
              </span>
              <Input
                value={changeReference}
                onChange={(event) => setChangeReference(event.target.value)}
                placeholder="e.g. CHG-4821"
              />
            </label>
          )}

          {allowClearOverrides && scope === 'global' && (
            <div
              className="space-y-3 rounded-md border px-4 py-3"
              style={{
                borderColor: 'color-mix(in srgb, #dc2626 40%, var(--border-primary))',
                backgroundColor: 'color-mix(in srgb, #dc2626 6%, var(--bg-card))',
              }}
            >
              <label
                className="flex cursor-pointer items-start gap-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={clearOverrides}
                  onChange={(event) => setClearOverrides(event.target.checked)}
                />
                <span>
                  Also clear every explicit tenant override for this feature
                  {tenantOverrideCount ? ` (${tenantOverrideCount} affected)` : ''} — dangerous
                </span>
              </label>
              {clearOverrides && (
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Type <code>APPLY TO ALL TENANTS</code> to confirm
                  </span>
                  <Input
                    value={clearPhrase}
                    onChange={(event) => setClearPhrase(event.target.value)}
                    placeholder="APPLY TO ALL TENANTS"
                  />
                </label>
              )}
            </div>
          )}

          {warning.confirmationPhrase && (
            <label className="block space-y-1.5">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Type <code>{warning.confirmationPhrase}</code> to confirm
              </span>
              <Input
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                placeholder={warning.confirmationPhrase}
              />
            </label>
          )}

          {error && (
            <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
              {error}
            </p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 border-t px-6 py-4"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={effectiveMode === 'on' ? 'danger' : 'primary'}
            disabled={!ready || busy}
            onClick={() =>
              onConfirm({
                mode: requestedMode,
                reason: reason.trim(),
                approvalReference: approvalReference.trim() || null,
                changeReference: changeReference.trim() || null,
                confirmationPhrase: clearOverrides
                  ? 'APPLY TO ALL TENANTS'
                  : (warning.confirmationPhrase ?? null),
                acknowledgements: warning.acknowledgements.filter((ack) => ticked[ack]),
                ...(clearOverrides ? { clearTenantOverrides: true } : {}),
              })
            }
          >
            {busy ? 'Applying…' : 'Apply change'}
          </Button>
        </div>
      </div>
    </div>
  );
}
