import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.text();
  const res = await fetch(adminApiUrl(`/api/v1/admin/crm/${id}/notes`), {
    method: 'POST',
    headers: adminProxyHeaders(request, true),
    body,
    cache: 'no-store',
  });
  return adminProxyResponse(res);
}
