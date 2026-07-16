import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

function target(tenantId: string, path: string[]): string {
  const suffix = path.map((p) => encodeURIComponent(p)).join('/');
  return adminApiUrl(`/api/v1/admin/tenants/${tenantId}/dsar/${suffix}`);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantId: string; path: string[] }> }) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;
  const { tenantId, path } = await params;
  const res = await fetch(target(tenantId, path), {
    method: 'GET',
    headers: adminProxyHeaders(request),
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string; path: string[] }> }) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;
  const { tenantId, path } = await params;
  const body = await request.text();
  const res = await fetch(target(tenantId, path), {
    method: 'POST',
    headers: adminProxyHeaders(request, true),
    body: body || '{}',
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}
