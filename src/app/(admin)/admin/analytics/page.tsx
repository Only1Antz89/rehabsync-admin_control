import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Gauge,
  Globe2,
  LineChart,
  PlugZap,
  Rocket,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { SITE_URL, SITE_NAME, MARKETING_ROUTES } from '../../../../lib/site';
import { fetchWebAnalytics } from '../../../../lib/vercel-analytics';

export const metadata = {
  title: { absolute: 'Web Analytics & SEO' },
};

// Live data + a token mean this page should never be statically cached.
export const dynamic = 'force-dynamic';

const enc = encodeURIComponent;

const TOOLS: Array<{ label: string; description: string; href: string }> = [
  { label: 'Vercel Analytics', description: 'Live page views, visitors, top pages & referrers.', href: 'https://vercel.com/analytics' },
  { label: 'Vercel Speed Insights', description: 'Real-user Core Web Vitals (LCP, INP, CLS).', href: 'https://vercel.com/docs/speed-insights' },
  { label: 'Google Search Console', description: 'Impressions, clicks, queries & index coverage.', href: 'https://search.google.com/search-console' },
  { label: 'Bing Webmaster Tools', description: 'Bing/Copilot indexing & search performance.', href: 'https://www.bing.com/webmasters' },
  { label: 'PageSpeed Insights', description: 'On-demand performance + SEO audit.', href: `https://pagespeed.web.dev/analysis?url=${enc(SITE_URL)}` },
  { label: 'Rich Results Test', description: 'Validate our structured data for rich snippets.', href: `https://search.google.com/test/rich-results?url=${enc(SITE_URL)}` },
];

const SEO_HEALTH: Array<{ label: string; detail: string }> = [
  { label: 'XML sitemap', detail: `Published & referenced in robots.txt (${MARKETING_ROUTES.length} pages).` },
  { label: 'robots.txt', detail: 'Public pages crawlable; admin, app & API disallowed.' },
  { label: 'AI search crawlers', detail: 'GPTBot, ClaudeBot, PerplexityBot & Google-Extended welcomed on public pages.' },
  { label: 'Structured data', detail: 'Organization, WebSite, SoftwareApplication & FAQ (schema.org JSON-LD).' },
  { label: 'Open Graph & Twitter cards', detail: 'Social/AI link previews with 1200×630 image.' },
  { label: 'Canonical URLs & metadataBase', detail: 'Absolute canonical links prevent duplicate-content dilution.' },
  { label: 'Mobile & Core Web Vitals', detail: 'Responsive viewport, dynamic-viewport shell, optimised images.' },
  { label: 'Superadmin hidden', detail: 'Console noindex via metadata, X-Robots-Tag header & host-level robots Disallow.' },
];

const WEB_VITALS: Array<{ metric: string; target: string; note: string }> = [
  { metric: 'LCP', target: '< 2.5s', note: 'Largest Contentful Paint' },
  { metric: 'INP', target: '< 200ms', note: 'Interaction to Next Paint' },
  { metric: 'CLS', target: '< 0.1', note: 'Cumulative Layout Shift' },
];

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof LineChart; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function fmt(n: number | null): string {
  return typeof n === 'number' ? n.toLocaleString('en-GB') : '—';
}

export default async function AdminAnalyticsPage() {
  const analytics = await fetchWebAnalytics(30);
  const isLive = analytics.status === 'ok';
  const hasCustomDomain = !SITE_URL.includes('vercel.app');

  const trafficCards = [
    { label: 'Page views (30d)', value: fmt(analytics.pageviews), source: 'Vercel Analytics', live: isLive },
    { label: 'Unique visitors (30d)', value: fmt(analytics.visitors), source: 'Vercel Analytics', live: isLive },
    { label: 'Search impressions', value: '—', source: 'Search Console', live: false },
    { label: 'Search clicks', value: '—', source: 'Search Console', live: false },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-1 py-2">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
          <LineChart className="h-4 w-4" />
          Discovery &amp; visibility
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-950">Web Analytics &amp; SEO</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Search visibility, performance and traffic for {SITE_NAME}. Traffic is read live from Vercel
          Web Analytics; Core Web Vitals and search performance live in the linked dashboards.
        </p>
      </div>

      {/* Traffic overview */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Gauge className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-950">Traffic overview</h2>
              <p className="mt-0.5 text-sm text-slate-500">Last 30 days.</p>
            </div>
          </div>
          {/* Connection status */}
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
              <span className="h-2 w-2 rounded-full bg-teal-500" /> Vercel Analytics connected
            </span>
          ) : analytics.status === 'error' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Analytics API error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              <PlugZap className="h-3.5 w-3.5" /> Not connected
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {trafficCards.map((m) => (
            <Card key={m.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-950">{m.value}</p>
              <p className="mt-1 text-xs text-slate-400">via {m.source}</p>
            </Card>
          ))}
        </div>

        {!isLive ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {analytics.status === 'error'
              ? analytics.message
              : 'Set VERCEL_ANALYTICS_TOKEN, VERCEL_PROJECT_ID and VERCEL_TEAM_ID to surface live page views and visitors here. Until then, the live numbers are in the Vercel Analytics dashboard below.'}
          </p>
        ) : analytics.topPages.length ? (
          <Card className="mt-4">
            <p className="mb-3 text-sm font-bold text-slate-900">Top pages</p>
            <ul className="space-y-1.5">
              {analytics.topPages.map((page) => (
                <li key={page.path} className="flex items-center justify-between text-sm">
                  <span className="truncate font-mono text-slate-700">{page.path}</span>
                  <span className="ml-3 shrink-0 font-bold text-slate-950">{fmt(page.views)}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>

      {/* SEO health */}
      <section>
        <SectionTitle icon={ShieldCheck} title="SEO & indexability health" subtitle="What's shipped to make RehabSync discoverable on search and AI engines." />
        <Card>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {SEO_HEALTH.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Go-live checklist */}
      <section>
        <SectionTitle icon={Rocket} title="Go-live checklist" subtitle="Finish these once the production domain is secured." />
        <Card>
          <ul className="space-y-3">
            <ChecklistItem
              done={hasCustomDomain}
              title="Point a production domain"
              detail={
                hasCustomDomain
                  ? `Live at ${SITE_URL}.`
                  : `Currently using ${SITE_URL}. Set REHABSYNC_SITE_URL to the real domain — it drives canonical URLs, the sitemap, OG tags and llms.txt.`
              }
            />
            <ChecklistItem done={false} title="Submit the sitemap" detail="Add /sitemap.xml in Google Search Console and Bing Webmaster Tools, then verify ownership." />
            <ChecklistItem
              done={isLive}
              title="Connect Vercel Analytics"
              detail={isLive ? 'Live traffic is flowing into this page.' : 'Add VERCEL_ANALYTICS_TOKEN, VERCEL_PROJECT_ID and VERCEL_TEAM_ID to show numbers inline.'}
            />
            <ChecklistItem done={false} title="Add brand profiles to structured data" detail="Once the social accounts + contact email exist, add them to the Organization schema (lib/structured-data)." />
          </ul>
        </Card>
      </section>

      {/* Core Web Vitals */}
      <section>
        <SectionTitle icon={Gauge} title="Core Web Vitals targets" subtitle="Field thresholds Google uses for ranking — live values in Speed Insights." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {WEB_VITALS.map((v) => (
            <Card key={v.metric}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold text-slate-950">{v.metric}</span>
                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-sm font-bold text-teal-700">{v.target}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{v.note}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Crawl files + tools */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle icon={Search} title="Crawl & index files" subtitle="The sources crawlers read." />
          <Card className="space-y-2">
            {[
              { label: 'Sitemap', path: '/sitemap.xml' },
              { label: 'Robots', path: '/robots.txt' },
              { label: 'Web manifest', path: '/manifest.webmanifest' },
              { label: 'AI guide (llms.txt)', path: '/llms.txt' },
            ].map((f) => (
              <a
                key={f.path}
                href={`${SITE_URL}${f.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-900">{f.label}</span>
                <span className="flex items-center gap-1 font-mono text-xs text-slate-500">
                  {f.path}
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            ))}
          </Card>
        </div>

        <div>
          <SectionTitle icon={Globe2} title="Live dashboards & audits" subtitle="Where the real numbers live." />
          <Card>
            <div className="grid gap-2">
              {TOOLS.map((tool) => (
                <a
                  key={tool.label}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{tool.label}</p>
                    <p className="truncate text-xs text-slate-500">{tool.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-700" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ChecklistItem({ done, title, detail }: { done: boolean; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
      )}
      <div>
        <p className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-700'}`}>{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </li>
  );
}
