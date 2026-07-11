import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adaptSetCookieDomain } from '../../../../../lib/set-cookie-domain';

const API_URL = process.env['REHABSYNC_API_URL']?.trim() || process.env['NEXT_PUBLIC_API_URL']?.trim() || 'http://localhost:4000';

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  const target = new URL(`${API_URL}/api/v1/admin/auth/${params.path.join('/')}`);
  req.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers = new Headers();
  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
    cache: 'no-store',
  });

  const responseHeaders = new Headers();
  const responseContentType = res.headers.get('content-type');
  if (responseContentType) responseHeaders.set('content-type', responseContentType);
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) responseHeaders.set('set-cookie', adaptSetCookieDomain(setCookie, req.headers.get('host')));

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
