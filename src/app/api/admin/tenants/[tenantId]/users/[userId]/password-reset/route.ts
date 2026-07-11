import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { tenantId, userId } = await params;
  const res = await fetch(adminApiUrl(`/api/v1/admin/tenants/${tenantId}/users/${userId}/password-reset`), {
    method: 'POST',
    headers: adminProxyHeaders(request),
    cache: 'no-store',
  });

  return adminProxyResponse(res);
}
