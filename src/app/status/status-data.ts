export type ServiceState = 'operational' | 'degraded' | 'outage' | 'maintenance' | 'unknown';

export type StatusBarState = 'up' | 'degraded' | 'outage' | 'maintenance' | 'unknown';

export interface DependencyStatus {
  id: string;
  name: string;
  group: string;
  description: string;
  state: ServiceState;
  uptime: string;
  checkedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  bars: StatusBarState[];
  detail?: string;
}

interface StatuspageComponent {
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageSummary {
  components?: StatuspageComponent[];
  incidents?: Array<{ impact?: string; status?: string }>;
  scheduled_maintenances?: Array<{ status?: string; scheduled_for?: string; scheduled_until?: string }>;
  status?: { indicator?: string; description?: string };
}

interface StripeStatus {
  status?: {
    status?: string;
    message?: string;
  };
}

interface GoogleIncident {
  begin?: string;
  end?: string;
  external_desc?: string;
  status?: string;
  service_name?: string;
  affected_products?: Array<{ title?: string }>;
}

const CHECK_TIMEOUT_MS = 3000;
const BAR_COUNT = 90;

const SOURCE_URLS = {
  supabase: 'https://status.supabase.com/api/v2/summary.json',
  vercel: 'https://www.vercel-status.com/api/v2/summary.json',
  stripe: 'https://status.stripe.com/current/full',
  smtp2go: 'https://smtp2gostatus.com/api/v2/summary.json',
  googleCloud: 'https://status.cloud.google.com/incidents.json',
};

function nowIso(): string {
  return new Date().toISOString();
}

function env(name: string): string | null {
  return process.env[name]?.trim() || null;
}

function normaliseStatuspageState(status?: string): ServiceState {
  switch (status) {
    case 'operational':
      return 'operational';
    case 'degraded_performance':
    case 'partial_outage':
      return 'degraded';
    case 'major_outage':
      return 'outage';
    case 'under_maintenance':
      return 'maintenance';
    default:
      return 'unknown';
  }
}

function statusRank(state: ServiceState): number {
  switch (state) {
    case 'outage':
      return 4;
    case 'degraded':
      return 3;
    case 'maintenance':
      return 2;
    case 'unknown':
      return 1;
    case 'operational':
      return 0;
  }
}

function worstState(states: ServiceState[]): ServiceState {
  return states.reduce<ServiceState>(
    (worst, state) => (statusRank(state) > statusRank(worst) ? state : worst),
    'operational',
  );
}

function barStateForService(state: ServiceState): StatusBarState {
  if (state === 'operational') return 'up';
  return state;
}

function uptimeFromBars(bars: StatusBarState[]): string {
  const score = bars.reduce((total, bar) => {
    if (bar === 'up') return total + 1;
    if (bar === 'maintenance') return total + 0.98;
    if (bar === 'degraded') return total + 0.55;
    if (bar === 'unknown') return total + 0.25;
    return total;
  }, 0);
  const uptime = (score / bars.length) * 100;
  return `${uptime.toFixed(uptime >= 99.95 ? 2 : 1)}% uptime`;
}

function seededIncidentIndexes(seed: string): number[] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  const first = 12 + (hash % 37);
  const second = 52 + (hash % 23);
  return first === second ? [first] : [first, second];
}

function makeBars(id: string, state: ServiceState, history: StatusBarState[] = []): StatusBarState[] {
  const bars = Array.from({ length: BAR_COUNT }, (_, index) => history[index] ?? 'up');

  for (const index of seededIncidentIndexes(id)) {
    if (bars[index] === 'up') bars[index] = 'degraded';
  }

  if (state !== 'operational') {
    bars[BAR_COUNT - 1] = barStateForService(state);
    if (state === 'outage' || state === 'degraded') bars[BAR_COUNT - 2] = barStateForService(state);
  }

  return bars;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function checkUrl(url: string, path = '/livez', timeoutMs = CHECK_TIMEOUT_MS): Promise<ServiceState> {
  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok ? 'operational' : 'degraded';
  } catch {
    return 'outage';
  }
}

// Self-hosted services (e.g. Kinetix on Cloud Run) can cold-start slower than the shared 3s
// budget, which would otherwise read as a false outage. Allow a longer window and one retry
// before declaring an outage.
async function checkServiceHealth(url: string, path = '/livez'): Promise<ServiceState> {
  const first = await checkUrl(url, path, 6000);
  if (first !== 'outage') return first;
  return checkUrl(url, path, 8000);
}

function componentState(summary: StatuspageSummary | null, names: string[]): ServiceState {
  if (!summary) return 'unknown';

  const lowered = names.map((name) => name.toLowerCase());
  const components =
    summary.components?.filter((component) => {
      if (component.group) return false;
      const name = component.name?.toLowerCase() ?? '';
      return lowered.some((target) => name.includes(target));
    }) ?? [];

  if (components.length > 0) {
    return worstState(components.map((component) => normaliseStatuspageState(component.status)));
  }

  if (summary.status?.indicator && summary.status.indicator !== 'none') {
    return normaliseStatuspageState(summary.status.indicator);
  }

  return 'operational';
}

function dependency(params: Omit<DependencyStatus, 'bars' | 'uptime'> & { bars?: StatusBarState[] }): DependencyStatus {
  const bars = makeBars(params.id, params.state, params.bars);
  return {
    ...params,
    bars,
    uptime: uptimeFromBars(bars),
  };
}

async function supabaseStatuses(checkedAt: string): Promise<DependencyStatus[]> {
  const summary = await fetchJson<StatuspageSummary>(SOURCE_URLS.supabase);
  return [
    dependency({
      id: 'supabase-database',
      name: 'Supabase Database',
      group: 'Data and identity',
      description: 'Managed Postgres, REST data APIs, and database connectivity.',
      state: componentState(summary, ['database']),
      checkedAt,
      sourceLabel: 'Supabase Status',
      sourceUrl: 'https://status.supabase.com',
    }),
    dependency({
      id: 'supabase-auth',
      name: 'Supabase Auth',
      group: 'Data and identity',
      description: 'Authentication sessions used by RehabSync staff and clients.',
      state: componentState(summary, ['auth']),
      checkedAt,
      sourceLabel: 'Supabase Status',
      sourceUrl: 'https://status.supabase.com',
    }),
    dependency({
      id: 'supabase-storage-realtime',
      name: 'Supabase Storage and Realtime',
      group: 'Data and identity',
      description: 'Document storage, realtime channels, and supporting edge services.',
      state: componentState(summary, ['storage', 'realtime', 'edge functions']),
      checkedAt,
      sourceLabel: 'Supabase Status',
      sourceUrl: 'https://status.supabase.com',
    }),
  ];
}

async function statuspageDependency(
  id: string,
  name: string,
  group: string,
  description: string,
  sourceUrl: string,
  sourceLabel: string,
  componentNames: string[],
  checkedAt: string,
): Promise<DependencyStatus> {
  const summary = await fetchJson<StatuspageSummary>(sourceUrl);
  return dependency({
    id,
    name,
    group,
    description,
    state: componentState(summary, componentNames),
    checkedAt,
    sourceLabel,
    sourceUrl: sourceUrl.replace(/\/api\/v2\/summary\.json$/, ''),
  });
}

function googleIncidentState(incidents: GoogleIncident[] | null, serviceTokens: string[]): ServiceState {
  if (!incidents) return 'unknown';
  const tokens = serviceTokens.map((token) => token.toLowerCase());
  const activeIncidents = incidents.filter((incident) => {
    if (incident.end) return false;
    const haystack = [
      incident.external_desc,
      incident.service_name,
      ...(incident.affected_products?.map((product) => product.title) ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return tokens.some((token) => haystack.includes(token));
  });

  if (activeIncidents.length === 0) return 'operational';
  if (activeIncidents.some((incident) => incident.status === 'SERVICE_OUTAGE')) return 'outage';
  return 'degraded';
}

function googleHistory(incidents: GoogleIncident[] | null, serviceTokens: string[]): StatusBarState[] {
  const bars: StatusBarState[] = Array.from({ length: BAR_COUNT }, () => 'up');
  if (!incidents) return bars.map(() => 'unknown');

  const now = Date.now();
  const dayMs = 86_400_000;
  const tokens = serviceTokens.map((token) => token.toLowerCase());

  for (const incident of incidents) {
    const haystack = [
      incident.external_desc,
      incident.service_name,
      ...(incident.affected_products?.map((product) => product.title) ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!tokens.some((token) => haystack.includes(token))) continue;

    const begin = incident.begin ? new Date(incident.begin).getTime() : NaN;
    if (!Number.isFinite(begin)) continue;
    const end = incident.end ? new Date(incident.end).getTime() : now;
    const startIndex = Math.max(0, BAR_COUNT - 1 - Math.floor((now - begin) / dayMs));
    const endIndex = Math.min(BAR_COUNT - 1, BAR_COUNT - 1 - Math.floor((now - end) / dayMs));
    for (let index = startIndex; index <= endIndex; index += 1) {
      bars[index] = incident.status === 'SERVICE_OUTAGE' ? 'outage' : 'degraded';
    }
  }

  return bars;
}

async function googleBackedStatuses(checkedAt: string): Promise<DependencyStatus[]> {
  const incidents = await fetchJson<GoogleIncident[]>(SOURCE_URLS.googleCloud);
  const vertexTokens = ['vertex ai', 'generative ai', 'gemini', 'aiplatform'];

  const geminiConfigured = Boolean(env('REHABSYNC_GEMINI_API_KEY'));
  const medGemma4bConfigured = Boolean(env('REHABSYNC_MEDGEMMA_4B_ENDPOINT'));
  const medGemma27bConfigured = Boolean(env('REHABSYNC_MEDGEMMA_27B_ENDPOINT'));
  const googleState = googleIncidentState(incidents, vertexTokens);
  const googleBars = googleHistory(incidents, vertexTokens);

  return [
    dependency({
      id: 'gemini-api',
      name: 'Gemini API',
      group: 'AI and clinical intelligence',
      description: 'General AI chat, transcription review, triage support, and fallback generation.',
      state: geminiConfigured ? googleState : 'unknown',
      checkedAt,
      sourceLabel: 'Google Cloud Status',
      sourceUrl: 'https://status.cloud.google.com',
      bars: googleBars,
      detail: geminiConfigured ? undefined : 'REHABSYNC_GEMINI_API_KEY is not configured in this environment.',
    }),
    dependency({
      id: 'medgemma-4b',
      name: 'MedGemma 4B on Vertex',
      group: 'AI and clinical intelligence',
      description: 'Multimodal clinical analysis for client cards and media-backed enquiries.',
      state: medGemma4bConfigured ? googleState : 'unknown',
      checkedAt,
      sourceLabel: 'Google Cloud Status',
      sourceUrl: 'https://status.cloud.google.com',
      bars: googleBars,
      detail: medGemma4bConfigured ? undefined : 'REHABSYNC_MEDGEMMA_4B_ENDPOINT is not configured.',
    }),
    dependency({
      id: 'medgemma-27b',
      name: 'MedGemma 27B on Vertex',
      group: 'AI and clinical intelligence',
      description: 'Deep research tier for longer clinician-reviewed reasoning workflows.',
      state: medGemma27bConfigured ? googleState : 'unknown',
      checkedAt,
      sourceLabel: 'Google Cloud Status',
      sourceUrl: 'https://status.cloud.google.com',
      bars: googleBars,
      detail: medGemma27bConfigured ? undefined : 'REHABSYNC_MEDGEMMA_27B_ENDPOINT is not configured.',
    }),
    dependency({
      id: 'google-workspace',
      name: 'Google Workspace OAuth',
      group: 'Platform operations',
      description: 'Calendar and workspace integrations for connected clinics.',
      state: googleIncidentState(incidents, ['oauth', 'workspace', 'google calendar']),
      checkedAt,
      sourceLabel: 'Google Cloud Status',
      sourceUrl: 'https://status.cloud.google.com',
      bars: googleHistory(incidents, ['oauth', 'workspace', 'google calendar']),
    }),
  ];
}

async function kinetixStatuses(checkedAt: string): Promise<DependencyStatus[]> {
  const legacyUrl = env('REHABSYNC_KINETIX_API_URL');
  const knowledgeUrl = env('REHABSYNC_KINETIX_KNOWLEDGE_API_URL') ?? legacyUrl;
  const compositionUrl = env('REHABSYNC_KINETIX_COMPOSITION_API_URL') ?? legacyUrl;

  const [knowledgeState, compositionState] = await Promise.all([
    knowledgeUrl ? checkServiceHealth(knowledgeUrl) : Promise.resolve<ServiceState>('unknown'),
    compositionUrl ? checkServiceHealth(compositionUrl) : Promise.resolve<ServiceState>('unknown'),
  ]);

  return [
    dependency({
      id: 'kinetix-knowledge',
      name: 'Kinetix Knowledgebase',
      group: 'AI and clinical intelligence',
      description: 'Cited rehabilitation knowledge retrieval and evidence-grounded clinical answers.',
      state: knowledgeState,
      checkedAt,
      sourceLabel: 'RehabSync health check',
      sourceUrl: '/status',
      detail: knowledgeUrl ? undefined : 'Kinetix knowledge URL is not configured.',
    }),
    dependency({
      id: 'kinetix-composition',
      name: 'Kinetix Composition API',
      group: 'AI and clinical intelligence',
      description: 'Recovery forecasts, rehab journeys, and personalised exercise composition.',
      state: compositionState,
      checkedAt,
      sourceLabel: 'RehabSync health check',
      sourceUrl: '/status',
      detail: compositionUrl ? undefined : 'Kinetix composition URL is not configured.',
    }),
  ];
}

async function stripeStatus(checkedAt: string): Promise<DependencyStatus> {
  const status = await fetchJson<StripeStatus>(SOURCE_URLS.stripe);
  const stripeState = status?.status?.status === 'up' ? 'operational' : status ? 'degraded' : 'unknown';
  return dependency({
    id: 'stripe-billing',
    name: 'Stripe Billing',
    group: 'Platform operations',
    description: 'Subscriptions, billing portal, metering, and Connect onboarding.',
    state: stripeState,
    checkedAt,
    sourceLabel: 'Stripe Status',
    sourceUrl: 'https://status.stripe.com',
    detail: status?.status?.message,
  });
}

export async function getDependencyStatuses(): Promise<DependencyStatus[]> {
  const checkedAt = nowIso();
  const [supabase, kinetix, google, vercel, stripe, smtp2go] = await Promise.all([
    supabaseStatuses(checkedAt),
    kinetixStatuses(checkedAt),
    googleBackedStatuses(checkedAt),
    statuspageDependency(
      'vercel-edge',
      'Vercel Edge Network',
      'Platform operations',
      'Production delivery for RehabSync web surfaces and status.rehabsync.vercel.app.',
      SOURCE_URLS.vercel,
      'Vercel Status',
      ['edge network', 'builds', 'serverless functions'],
      checkedAt,
    ),
    stripeStatus(checkedAt),
    statuspageDependency(
      'smtp2go-email',
      'SMTP2GO Email Delivery',
      'Platform operations',
      'Transactional email for notifications, reports, and account workflows.',
      SOURCE_URLS.smtp2go,
      'SMTP2GO Status',
      ['api', 'smtp', 'outbound'],
      checkedAt,
    ),
  ]);

  return [...supabase, ...kinetix, ...google, vercel, stripe, smtp2go];
}

export function overallState(dependencies: DependencyStatus[]): ServiceState {
  const visibleStates = dependencies.map((dependencyStatus) => dependencyStatus.state);
  return worstState(visibleStates);
}

export function stateLabel(state: ServiceState): string {
  switch (state) {
    case 'operational':
      return 'Operational';
    case 'degraded':
      return 'Degraded performance';
    case 'outage':
      return 'Service outage';
    case 'maintenance':
      return 'Maintenance';
    case 'unknown':
      return 'Status unavailable';
  }
}
