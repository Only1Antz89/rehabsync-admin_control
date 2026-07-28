import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

/**
 * A tenant's effective SaMD capability summary, for admin, sales, onboarding, pilot and support
 * workflows. These workflows must use this rather than the public website, which describes the global
 * offering only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { tenantId } = await params;
  const res = await fetch(
    adminApiUrl(`/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/samd-capabilities`),
    { method: 'GET', headers: adminProxyHeaders(request), cache: 'no-store' },
  );

  return adminProxyResponse(res);
}
