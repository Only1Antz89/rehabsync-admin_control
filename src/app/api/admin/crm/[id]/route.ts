import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const res = await fetch(adminApiUrl(`/api/v1/admin/crm/${id}`), {
    headers: adminProxyHeaders(request),
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.text();
  const res = await fetch(adminApiUrl(`/api/v1/admin/crm/${id}`), {
    method: 'PATCH',
    headers: adminProxyHeaders(request, true),
    body,
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}
