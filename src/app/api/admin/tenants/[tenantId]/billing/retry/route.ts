import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { tenantId } = await params;
  const res = await fetch(adminApiUrl(`/api/v1/admin/tenants/${tenantId}/billing/retry`), {
    method: 'POST',
    headers: adminProxyHeaders(request, true),
    body: '{}',
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}
