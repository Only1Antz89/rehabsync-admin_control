import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { tenantId } = await params;
  const res = await fetch(adminApiUrl(`/api/v1/admin/tenants/${tenantId}/store-settings`), {
    method: 'GET',
    headers: adminProxyHeaders(request),
    cache: 'no-store',
  });

  return adminProxyResponse(res);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { tenantId } = await params;
  const body = await request.text();
  const res = await fetch(adminApiUrl(`/api/v1/admin/tenants/${tenantId}/store-settings`), {
    method: 'PUT',
    headers: adminProxyHeaders(request, true),
    body,
    cache: 'no-store',
  });

  return adminProxyResponse(res);
}
