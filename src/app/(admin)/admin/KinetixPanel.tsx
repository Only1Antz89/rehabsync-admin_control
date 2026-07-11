import { adminFetch } from '../../../lib/admin-api';

interface KinetixStatus {
  configured: boolean;
  operational: boolean;
  url: string | null;
  checkedAt: string;
}

interface TenantUsage {
  tenantId: string;
  tenantName: string;
  queries: number;
  totalTokens: number;
  costPence: number;
}

interface ClinicUsage {
  tenantName: string;
  clinicId: string;
  clinicName: string;
  queries: number;
  totalTokens: number;
  costPence: number;
}

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function KinetixPanel() {
  let status: KinetixStatus | null = null;
  let byTenant: TenantUsage[] = [];
  let byClinic: ClinicUsage[] = [];

  try {
    const [statusRes, usageRes] = await Promise.all([
      adminFetch('/api/v1/admin/kinetix/status', { next: { revalidate: 0 } }),
      adminFetch('/api/v1/admin/kinetix/usage', { next: { revalidate: 30 } }),
    ]);
    if (statusRes.ok) status = (await statusRes.json()) as KinetixStatus;
    if (usageRes.ok) {
      const data = (await usageRes.json()) as {
        byTenant?: TenantUsage[];
        byClinic?: ClinicUsage[];
      };
      byTenant = data.byTenant ?? [];
      byClinic = data.byClinic ?? [];
    }
  } catch {
    /* render with whatever we have */
  }

  const operational = status?.operational ?? false;
  const dotColor = !status?.configured
    ? 'var(--text-muted)'
    : operational
      ? 'var(--color-success)'
      : 'var(--color-error)';
  const statusLabel = !status?.configured ? 'Not configured' : operational ? 'Operational' : 'Down';

  return (
    <section className="rs-panel">
      <div className="rs-panel-head">
        <div>
          <p className="rs-kicker">Kinetix</p>
          <h2>Treatment intelligence</h2>
          <p className="rs-muted">API operational status and usage across tenants and clinics.</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {statusLabel}
          </span>
          {status?.checkedAt && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              checked {new Date(status.checkedAt).toLocaleTimeString('en-GB')}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h4
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            Usage by tenancy
          </h4>
          {byTenant.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No Kinetix usage recorded.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                  <th className="py-1 font-medium">Tenant</th>
                  <th className="py-1 font-medium text-right">Queries</th>
                  <th className="py-1 font-medium text-right">Tokens</th>
                  <th className="py-1 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byTenant.map((r) => (
                  <tr key={r.tenantId} style={{ borderTop: '1px solid var(--border-secondary)' }}>
                    <td className="py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {r.tenantName}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {r.queries}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {r.totalTokens.toLocaleString('en-GB')}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {gbp(r.costPence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h4
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-secondary)' }}
          >
            Usage by clinic
          </h4>
          {byClinic.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No clinic-attributed usage yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--text-muted)' }}>
                  <th className="py-1 font-medium">Tenant</th>
                  <th className="py-1 font-medium">Clinic</th>
                  <th className="py-1 font-medium text-right">Queries</th>
                  <th className="py-1 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byClinic.map((r) => (
                  <tr key={r.clinicId} style={{ borderTop: '1px solid var(--border-secondary)' }}>
                    <td className="py-1.5" style={{ color: 'var(--text-primary)' }}>
                      {r.tenantName}
                    </td>
                    <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {r.clinicName}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {r.queries}
                    </td>
                    <td className="py-1.5 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {gbp(r.costPence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
