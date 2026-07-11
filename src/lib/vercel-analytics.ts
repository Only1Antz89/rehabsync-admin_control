/**
 * Server-side reader for Vercel Web Analytics.
 *
 * Vercel's Web Analytics query API is the same surface the dashboard uses; it
 * needs a Vercel access token plus the project (and team) id. Configure:
 *
 *   VERCEL_ANALYTICS_TOKEN   - a Vercel access token (or VERCEL_API_TOKEN)
 *   VERCEL_PROJECT_ID        - the project id
 *   VERCEL_TEAM_ID           - the team id (omit for a personal account)
 *   VERCEL_ANALYTICS_ENVIRONMENT - defaults to "production"
 *   VERCEL_ANALYTICS_API_BASE    - override the API base if Vercel changes it
 *
 * Until those are set the dashboard falls back to its "not connected" state —
 * this never throws, so the admin page always renders.
 */

export interface WebAnalyticsSummary {
  status: 'unconfigured' | 'ok' | 'error';
  message?: string;
  rangeDays: number;
  pageviews: number | null;
  visitors: number | null;
  topPages: Array<{ path: string; views: number }>;
}

const TOKEN = process.env['VERCEL_ANALYTICS_TOKEN'] ?? process.env['VERCEL_API_TOKEN'];
const PROJECT_ID = process.env['VERCEL_PROJECT_ID'];
const TEAM_ID = process.env['VERCEL_TEAM_ID'];
const ENVIRONMENT = process.env['VERCEL_ANALYTICS_ENVIRONMENT'] ?? 'production';
const API_BASE = process.env['VERCEL_ANALYTICS_API_BASE'] ?? 'https://vercel.com/api/web-analytics';

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Sum the first matching numeric field across rows — tolerant of field naming. */
function sumField(rows: unknown, fields: string[]): number {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((acc: number, row) => {
    if (row && typeof row === 'object') {
      for (const field of fields) {
        const value = (row as Record<string, unknown>)[field];
        if (typeof value === 'number') return acc + value;
      }
    }
    return acc;
  }, 0);
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(6000),
      // Cache the upstream call so the admin page never hammers Vercel's API.
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

export async function fetchWebAnalytics(rangeDays = 30): Promise<WebAnalyticsSummary> {
  const base: WebAnalyticsSummary = {
    status: 'unconfigured',
    rangeDays,
    pageviews: null,
    visitors: null,
    topPages: [],
  };

  if (!TOKEN || !PROJECT_ID) return base;

  const to = new Date();
  const from = new Date(to.getTime() - rangeDays * 86_400_000);
  const params = new URLSearchParams({
    projectId: PROJECT_ID,
    environment: ENVIRONMENT,
    from: from.toISOString(),
    to: to.toISOString(),
  });
  if (TEAM_ID) params.set('teamId', TEAM_ID);

  const [series, pathStats] = await Promise.all([
    getJson(`${API_BASE}/timeseries?${params.toString()}`),
    getJson(`${API_BASE}/stats/path?${params.toString()}&limit=6`),
  ]);

  if (series === null && pathStats === null) {
    return {
      ...base,
      status: 'error',
      message:
        'Could not reach the Vercel Analytics API. Check the token, project/team IDs, and that Web Analytics is enabled.',
    };
  }

  const seriesRows =
    (series as { data?: unknown } | null)?.data ?? (Array.isArray(series) ? series : []);
  const pageviews =
    sumField(seriesRows, ['total', 'views', 'count', 'value']) ||
    toNumber((series as { total?: number } | null)?.total);
  const visitors =
    sumField(seriesRows, ['visitors', 'devices', 'uniques']) ||
    toNumber((series as { visitors?: number } | null)?.visitors);

  const pathRows = (pathStats as { data?: unknown } | null)?.data;
  const topPages = (Array.isArray(pathRows) ? pathRows : [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const path = (record['key'] ?? record['path'] ?? record['name']) as string | undefined;
      const views = toNumber(record['total'] ?? record['views'] ?? record['count'] ?? record['value']);
      return path ? { path, views } : null;
    })
    .filter((entry): entry is { path: string; views: number } => entry !== null)
    .slice(0, 6);

  return {
    status: 'ok',
    rangeDays,
    pageviews: pageviews || null,
    visitors: visitors || null,
    topPages,
  };
}
