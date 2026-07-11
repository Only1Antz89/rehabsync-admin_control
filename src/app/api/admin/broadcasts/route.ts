import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const res = await fetch(adminApiUrl('/api/v1/admin/broadcasts'), {
    headers: adminProxyHeaders(request),
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const body = await request.text();
  const res = await fetch(adminApiUrl('/api/v1/admin/broadcasts'), {
    method: 'POST',
    headers: adminProxyHeaders(request, true),
    body,
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}
