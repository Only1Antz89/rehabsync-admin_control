import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; patientId: string }> },
) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { tenantId, patientId } = await params;
  const body = await request.text();
  const res = await fetch(adminApiUrl(`/api/v1/admin/tenants/${tenantId}/patients/${patientId}/subscription`), {
    method: 'PATCH',
    headers: adminProxyHeaders(request, true),
    body,
    cache: 'no-store',
  });

  return adminProxyResponse(res);
}
