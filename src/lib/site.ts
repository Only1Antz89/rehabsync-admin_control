/**
 * Canonical site metadata shared by the SEO surfaces (robots, sitemap,
 * metadataBase, structured data, llms.txt).
 *
 * Resolution order (no custom domain is assumed):
 *   1. REHABSYNC_SITE_URL  — set this once the real domain is secured.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the stable Vercel production host.
 *   3. the current Vercel deployment fallback.
 */
function resolveSiteUrl(): string {
  const explicit = process.env['REHABSYNC_SITE_URL'];
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercelProduction = process.env['VERCEL_PROJECT_PRODUCTION_URL'];
  if (vercelProduction) return `https://${vercelProduction}`;

  // No custom domain yet — point at the current Vercel deployment rather than
  // a domain we don't own.
  return 'https://rehabsync.vercel.app';
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = 'RehabSync';

export const SITE_TAGLINE = 'AI-Powered Physiotherapy & Rehab Platform';

export const SITE_DESCRIPTION =
  'RehabSync is the AI-powered operating system for modern physiotherapy and rehab teams — reduce admin, improve patient adherence with AI triage and Kinetix exercise plans, and deliver better outcomes.';

/**
 * Public marketing routes that belong in the sitemap and may be indexed.
 * Deliberately excludes the admin console, the authenticated app, and auth
 * pages. `priority` and `changeFrequency` tune crawl emphasis.
 */
export const MARKETING_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
}> = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: 'features', priority: 0.9, changeFrequency: 'weekly' },
  { path: 'solutions', priority: 0.9, changeFrequency: 'weekly' },
  { path: 'pricing', priority: 0.9, changeFrequency: 'weekly' },
  { path: 'about', priority: 0.7, changeFrequency: 'monthly' },
  { path: 'testimonials', priority: 0.7, changeFrequency: 'monthly' },
  { path: 'blog', priority: 0.8, changeFrequency: 'daily' },
  { path: 'faq', priority: 0.8, changeFrequency: 'monthly' },
  { path: 'security', priority: 0.6, changeFrequency: 'monthly' },
  { path: 'accessibility', priority: 0.5, changeFrequency: 'yearly' },
  { path: 'demo', priority: 0.8, changeFrequency: 'monthly' },
  { path: 'privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: 'terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: 'cookies', priority: 0.3, changeFrequency: 'yearly' },
];

/** Sensitive prefixes that must never be crawled or indexed. */
export const DISALLOWED_PATHS = [
  '/admin',
  '/api/',
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/client/',
  '/consultant/',
  '/patients',
  '/scheduling',
  '/appointments',
  '/triage',
  '/chat',
  '/team-chat',
  '/kinetix',
  '/clinics',
  '/consultants',
  '/users',
  '/profile',
  '/settings',
  '/notifications',
  '/resources',
  '/services',
  '/outcomes',
  '/safety',
  '/integrations',
  '/knowledgebase',
  '/support',
  '/feedback',
  '/onboarding',
  '/call',
  '/health',
];

/**
 * AI / LLM search crawlers we explicitly welcome on the public marketing site
 * (for visibility in AI answers) while still keeping them out of the console.
 */
export const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'cohere-ai',
];
