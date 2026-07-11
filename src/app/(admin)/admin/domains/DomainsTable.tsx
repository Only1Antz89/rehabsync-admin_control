'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Badge } from '@rs/ui';

export interface DomainRow {
  tenantId: string;
  tenantName: string;
  slug: string;
  subdomain: string;
  customDomain: string | null;
  domainVerified: boolean;
}

interface DomainsTableProps {
  rows: DomainRow[];
}

export function DomainsTable({ rows }: DomainsTableProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  function handleVerify(tenantId: string, domain: string) {
    setVerifying(tenantId);
    // Optimistic — the worker will verify on the next hourly run
    setTimeout(() => {
      setVerifying(null);
      showToast(`Verification queued for ${domain}. The worker will confirm it on the next hourly run.`);
    }, 600);
  }

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
        <p className="text-4xl mb-3">🌐</p>
        <p className="text-sm">No tenants yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 text-white text-sm px-5 py-3 rounded-xl max-w-sm"
          style={{ backgroundColor: '#1e293b', boxShadow: 'var(--shadow-md)' }}
        >
          {toastMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Tenant
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                App Subdomain
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Custom Domain
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Status
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-secondary)' }}>
            {rows.map((row) => (
              <HoverRow key={row.tenantId} row={row} verifying={verifying} onVerify={handleVerify} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HoverRow({
  row,
  verifying,
  onVerify,
}: {
  row: DomainRow;
  verifying: string | null;
  onVerify: (tenantId: string, domain: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      className="transition-colors"
      style={{ backgroundColor: hovered ? 'var(--bg-hover)' : undefined }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-6 py-3">
        <Link
          href={`/admin/tenants/${row.tenantId}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.tenantName}
        </Link>
      </td>
      <td className="px-6 py-3">
        <a
          href={`https://${row.subdomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs px-2 py-0.5 rounded hover:underline"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          {row.subdomain}
        </a>
      </td>
      <td className="px-6 py-3">
        {row.customDomain ? (
          <code
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            {row.customDomain}
          </code>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
        )}
      </td>
      <td className="px-6 py-3">
        {!row.customDomain ? (
          <Badge variant="success">Active (subdomain)</Badge>
        ) : row.domainVerified ? (
          <Badge variant="success">Verified ✓</Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        )}
      </td>
      <td className="px-6 py-3 text-right">
        {row.customDomain ? (
          <Button
            variant="ghost"
            size="sm"
            loading={verifying === row.tenantId}
            onClick={() => onVerify(row.tenantId, row.customDomain!)}
          >
            Trigger verify
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
