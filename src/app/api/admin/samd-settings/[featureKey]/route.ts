import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ featureKey: string }> },
) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  const { featureKey } = await params;
  // The feature key is validated against the canonical registry by the platform API — an unknown key
  // is rejected there rather than guessed at here.
  const body = await request.text();
  const res = await fetch(
    adminApiUrl(`/api/v1/admin/samd-settings/${encodeURIComponent(featureKey)}`),
    {
      method: 'PUT',
      headers: adminProxyHeaders(request, true),
      body,
      cache: 'no-store',
    },
  );

  return adminProxyResponse(res);
}
