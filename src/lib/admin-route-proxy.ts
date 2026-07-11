import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const API_URL = process.env['REHABSYNC_API_URL']?.trim() || process.env['NEXT_PUBLIC_API_URL']?.trim() || 'http://localhost:4000';
const ADMIN_API_TIMEOUT_MS = 30_000;
const PRIVATE_CACHE_CONTROL = 'no-store, max-age=0';

function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Platform admin session required' },
    { status: 401, headers: { 'cache-control': PRIVATE_CACHE_CONTROL } },
  );
}

function notFoundResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Not found' },
    { status: 404, headers: { 'cache-control': PRIVATE_CACHE_CONTROL } },
  );
}

export async function requireAdminSession(request: NextRequest): Promise<NextResponse | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return unauthorizedResponse();
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/admin/auth/me`, {
      headers: { cookie },
      cache: 'no-store',
      signal: AbortSignal.timeout(ADMIN_API_TIMEOUT_MS),
    });

    if (!res.ok) {
      return unauthorizedResponse();
    }

    const data = (await res.json().catch(() => null)) as { admin?: { role?: string } } | null;
    if (data?.admin?.role !== 'super_admin') {
      return notFoundResponse();
    }
  } catch {
    return unauthorizedResponse();
  }

  return null;
}

export function adminProxyHeaders(request: NextRequest, withBody = false): HeadersInit {
  const cookie = request.headers.get('cookie');
  const headers: Record<string, string> = {};

  if (withBody) headers['Content-Type'] = 'application/json';
  if (cookie) headers['cookie'] = cookie;

  return headers;
}

export async function adminProxyResponse(response: Response): Promise<NextResponse> {
  const headers = {
    'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    'cache-control': PRIVATE_CACHE_CONTROL,
  };

  if (response.status === 204 || response.status === 304) {
    return new NextResponse(null, {
      status: response.status,
      headers,
    });
  }

  return new NextResponse(await response.text(), {
    status: response.status,
    headers,
  });
}

export function adminApiUrl(path: string): string {
  return `${API_URL}${path}`;
}
