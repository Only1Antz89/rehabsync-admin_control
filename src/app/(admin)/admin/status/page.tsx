import Link from 'next/link';
import { Badge } from '@rs/ui';
import { Activity, ArrowUpRight, Bell, ServerCog, ShieldCheck } from 'lucide-react';
import { adminFetch } from '../../../../lib/admin-api';
import { getDependencyStatuses, overallState, stateLabel, type DependencyStatus, type ServiceState } from '../../../status/status-data';

export const dynamic = 'force-dynamic';

interface InternalHealth {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
  ai: { status: 'ok' | 'unknown' | 'error' };
}

const SERVICE_RANK: Record<ServiceState, number> = {
  outage: 4,
  degraded: 3,
  maintenance: 2,
  unknown: 1,
  operational: 0,
};

function worstServiceState(states: ServiceState[]): ServiceState {
  return states.reduce<ServiceState>(
    (worst, state) => (SERVICE_RANK[state] > SERVICE_RANK[worst] ? state : worst),
    'operational',
  );
}

// Map the internal infra health (db/redis/api) into a single dependency state so the overall
// banner on this page matches the Platform Health page rather than contradicting it.
function internalServiceState(health: InternalHealth | null): ServiceState {
  if (!health) return 'outage';
  if (health.db === 'error' || health.redis === 'error') return 'outage';
  return health.status === 'ok' ? 'operational' : 'degraded';
}

function badgeVariant(state: ServiceState): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (state === 'operational') return 'success';
  if (state === 'outage') return 'error';
  if (state === 'degraded' || state === 'maintenance') return 'warning';
  return 'neutral';
}

function formatCheckedAt(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(new Date(value));
}

function groupDependencies(dependencies: DependencyStatus[]): Map<string, DependencyStatus[]> {
  const groups = new Map<string, DependencyStatus[]>();
  for (const dependency of dependencies) {
    groups.set(dependency.group, [...(groups.get(dependency.group) ?? []), dependency]);
  }
  return groups;
}

export default async function AdminStatusPage() {
  const [dependencies, internalHealth] = await Promise.all([
    getDependencyStatuses(),
    adminFetch('/api/v1/admin/platform/health', { cache: 'no-store' })
      .then(async (res) => (res.ok ? ((await res.json()) as InternalHealth) : null))
      .catch(() => null),
  ]);
  const internalState = internalServiceState(internalHealth);
  const state = worstServiceState([overallState(dependencies), internalState]);
  const groups = groupDependencies(dependencies);
  const checkedAt = dependencies[0]?.checkedAt ?? new Date().toISOString();
  const affected = dependencies.filter((dependency) => dependency.state === 'outage' || dependency.state === 'degraded');

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Operations</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Dependency Status</h1>
          <p className="mt-1 text-sm text-slate-600">
            Live status for Supabase, Kinetix, Gemini, MedGemma, Vercel, Stripe, SMTP2GO, and Google Workspace.
          </p>
        </div>
        <Link
          href="https://status.rehabsync.vercel.app"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-800"
        >
          Public status page
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <section
        className="rounded-xl border p-6"
        style={{
          backgroundColor:
            state === 'operational'
              ? 'var(--color-success-bg)'
              : state === 'outage'
                ? 'var(--color-error-bg)'
                : 'var(--color-warning-bg)',
          borderColor:
            state === 'operational'
              ? 'color-mix(in srgb, var(--color-success) 30%, var(--border-primary))'
              : state === 'outage'
                ? 'color-mix(in srgb, var(--color-error) 30%, var(--border-primary))'
                : 'color-mix(in srgb, var(--color-warning) 30%, var(--border-primary))',
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              <p className="text-sm font-bold text-slate-700">Overall dependency state</p>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{stateLabel(state)}</p>
            <p className="mt-1 text-sm text-slate-600">Last checked {formatCheckedAt(checkedAt)}</p>
          </div>
          <Badge variant={badgeVariant(state)}>{affected.length} affected</Badge>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-teal-700" />
              <h2 className="text-base font-bold text-slate-950">Outage email alerts</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              The scheduled monitor emails support@intaillium.com when a tracked dependency is degraded or down.
            </p>
          </div>
          <code className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">/api/status/monitor</code>
        </div>
      </section>

      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ServerCog className="h-4 w-4 text-teal-700" />
            <h2 className="font-bold text-slate-950">RehabSync platform</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={badgeVariant(internalState)}>{stateLabel(internalState)}</Badge>
            <Link href="/admin/platform" className="text-xs font-semibold text-teal-700 hover:underline">
              Platform health →
            </Link>
          </div>
        </header>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'API Server', state: (internalHealth ? 'operational' : 'outage') as ServiceState },
            { name: 'Database', state: (internalHealth ? (internalHealth.db === 'ok' ? 'operational' : 'outage') : 'unknown') as ServiceState },
            { name: 'Cache / Queues', state: (internalHealth ? (internalHealth.redis === 'ok' ? 'operational' : 'outage') : 'unknown') as ServiceState },
            { name: 'AI Service', state: (internalHealth ? (internalHealth.ai.status === 'error' ? 'outage' : internalHealth.ai.status === 'ok' ? 'operational' : 'unknown') : 'unknown') as ServiceState },
          ].map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm font-medium text-slate-900">{item.name}</span>
              <Badge variant={badgeVariant(item.state)}>{stateLabel(item.state)}</Badge>
            </div>
          ))}
        </div>
      </article>

      <section className="grid gap-5">
        {Array.from(groups.entries()).map(([group, items]) => (
          <article key={group} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-700" />
                <h2 className="font-bold text-slate-950">{group}</h2>
              </div>
              <Badge variant={badgeVariant(overallState(items))}>{stateLabel(overallState(items))}</Badge>
            </header>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <h3 className="font-bold text-slate-950">{item.name}</h3>
                      <Badge variant={badgeVariant(item.state)}>{stateLabel(item.state)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                    {item.detail ? <p className="mt-2 text-xs font-semibold text-slate-500">{item.detail}</p> : null}
                  </div>
                  <div className="text-left text-xs font-semibold text-slate-500 lg:text-right">
                    <p>{item.uptime}</p>
                    <a className="text-teal-700 hover:underline" href={item.sourceUrl}>
                      {item.sourceLabel}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
