import type { NextRequest } from 'next/server';
import { adminApiUrl, adminProxyHeaders, adminProxyResponse, requireAdminSession } from '@/lib/admin-route-proxy';

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const unauthorized = await requireAdminSession(req);
  if (unauthorized) return unauthorized;

  const params = await context.params;
  const target = new URL(adminApiUrl(`/api/v1/admin/knowledgebase/${params.path.join('/')}`));
  req.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const isWrite = !['GET', 'HEAD'].includes(req.method);
  const res = await fetch(target, {
    method: req.method,
    headers: adminProxyHeaders(req, isWrite),
    body: isWrite ? await req.text() : undefined,
    cache: 'no-store',
  });

  return adminProxyResponse(res);
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
