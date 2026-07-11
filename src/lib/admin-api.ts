import { cache } from 'react';
import { cookies } from 'next/headers';

const API_URL = process.env['REHABSYNC_API_URL']?.trim() || process.env['NEXT_PUBLIC_API_URL']?.trim() || 'http://localhost:4000';
const ADMIN_API_TIMEOUT_MS = 30_000;

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: 'support' | 'admin' | 'super_admin';
}

async function adminCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieHeader = await adminCookieHeader();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/admin/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
      signal: AbortSignal.timeout(ADMIN_API_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { admin?: AdminSession };
    return data.admin ?? null;
  } catch {
    return null;
  }
});

export function isSuperadmin(admin: AdminSession | null): admin is AdminSession & { role: 'super_admin' } {
  return admin?.role === 'super_admin';
}

export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const admin = await getAdminSession();
  if (!admin) {
    return Response.json({ error: 'Platform admin session required' }, { status: 401 });
  }
  if (!isSuperadmin(admin)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const cookieHeader = await adminCookieHeader();

  const headers = new Headers(init?.headers);
  if (cookieHeader) headers.set('cookie', cookieHeader);

  // Respect a caller-supplied caching directive (e.g. `next: { revalidate }`). Only default to
  // `no-store` when none is given — setting both `cache: 'no-store'` and `next.revalidate`
  // throws in Next 15.
  const hasCacheDirective =
    init?.cache !== undefined ||
    (typeof init?.next === 'object' && init.next !== null && 'revalidate' in init.next);

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(ADMIN_API_TIMEOUT_MS),
    ...(hasCacheDirective ? {} : { cache: 'no-store' }),
  });
}
