/**
 * Browsers silently REJECT a Set-Cookie whose Domain doesn't cover the serving host — the API
 * scopes the platform session to `.rehabsync.app` (for Sales/Ads Centre SSO), which is invalid
 * when the admin console is opened on `admin.rehabsync.vercel.app` or a preview URL, and login
 * then appears to do nothing. Strip the Domain attribute (host-only cookie) whenever it wouldn't
 * match the host actually serving the response.
 */
export function adaptSetCookieDomain(setCookie: string, host: string | null): string {
  const hostname = host?.split(':')[0]?.toLowerCase() ?? '';
  return setCookie.replace(/;\s*domain=([^;]+)/i, (match, domain: string) => {
    const normalized = domain.trim().replace(/^\./, '').toLowerCase();
    return hostname === normalized || hostname.endsWith(`.${normalized}`) ? match : '';
  });
}
