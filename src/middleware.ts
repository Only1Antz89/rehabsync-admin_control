import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Cheap gate: everything except the login screen needs the platform session cookie to be
 * PRESENT (the authoritative check — role included — happens server-side in the (admin)
 * layout via the main API). Also forwards x-pathname, which that layout reads.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/robots.txt') {
    return new NextResponse('User-agent: *\nDisallow: /\n', {
      headers: { 'content-type': 'text/plain', 'x-robots-tag': 'noindex, nofollow' },
    });
  }

  if (pathname !== '/admin/login' && pathname !== '/' && !pathname.startsWith('/api/')) {
    if (!req.cookies.has('rs_platform_session')) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.png|.*\\..*).*)'],
};
