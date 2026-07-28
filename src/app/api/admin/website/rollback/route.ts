import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  // The body is forwarded verbatim. Payload validation — feature keys, modes, confirmation phrases,
  // acknowledgements and approval references — is enforced by the platform API, which is the only
  // authority. This route just carries the platform session across.
  const body = await request.text();
  const res = await fetch(adminApiUrl('/api/v1/admin/website/rollback'), {
    method: 'POST',
    headers: adminProxyHeaders(request, true),
    body,
    cache: 'no-store',
  });

  return adminProxyResponse(res);
}
