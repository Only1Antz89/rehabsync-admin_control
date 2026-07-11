import React from 'react';
import Link from 'next/link';
import { Card, Badge } from '@rs/ui';
import { ArrowUpRight } from 'lucide-react';
import { adminFetch } from '../../../../lib/admin-api';
import {
  getDependencyStatuses,
  overallState,
  stateLabel,
  type DependencyStatus,
  type ServiceState,
} from '../../../status/status-data';

interface ExtendedHealth {
  status: 'ok' | 'degraded';
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
  uptime: number;
  timestamp: string;
  ai: {
    status: 'ok' | 'unknown' | 'error';
    lastInteractionAt: string | null;
  };
  queues: {
    name: string;
    waiting: number;
    active: number;
    failed: number;
  }[];
  recentErrorCount: number;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return iso;
  }
}

function statusBadge(status: 'ok' | 'error' | 'unknown') {
  if (status === 'ok') return <Badge variant="success">Operational</Badge>;
  if (status === 'error') return <Badge variant="error">Down</Badge>;
  return <Badge variant="warning">Unknown</Badge>;
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

const OVERALL_PRESENTATION: Record<ServiceState, { label: string; color: string }> = {
  operational: { label: 'All Systems Operational', color: '#16a34a' },
  degraded: { label: 'System Degraded', color: '#d97706' },
  maintenance: { label: 'Under Maintenance', color: '#d97706' },
  outage: { label: 'Service Outage', color: '#dc2626' },
  unknown: { label: 'Status Unknown', color: '#6b7280' },
};

function dependencyBadgeVariant(state: ServiceState): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (state === 'operational') return 'success';
  if (state === 'outage') return 'error';
  if (state === 'degraded' || state === 'maintenance') return 'warning';
  return 'neutral';
}

function groupDependencies(dependencies: DependencyStatus[]): [string, DependencyStatus[]][] {
  const groups = new Map<string, DependencyStatus[]>();
  for (const dependency of dependencies) {
    groups.set(dependency.group, [...(groups.get(dependency.group) ?? []), dependency]);
  }
  return Array.from(groups.entries());
}

export const dynamic = 'force-dynamic';

export default async function PlatformHealthPage() {
  let health: ExtendedHealth | null = null;

  const [healthResult, dependencies] = await Promise.all([
    adminFetch('/api/v1/admin/platform/health', { cache: 'no-store' })
      .then(async (res) => (res.ok ? ((await res.json()) as ExtendedHealth) : null))
      .catch(() => null),
    getDependencyStatuses().catch(() => [] as DependencyStatus[]),
  ]);
  health = healthResult;

  // Combine internal infrastructure health with the external dependency states so this banner
  // agrees with the Dependency Status page instead of contradicting it.
  const internalState: ServiceState = !health
    ? 'outage'
    : health.status === 'ok'
      ? 'operational'
      : 'degraded';
  const dependencyState = dependencies.length > 0 ? overallState(dependencies) : 'unknown';
  const combined = worstServiceState([internalState, dependencyState]);
  const affected = dependencies.filter(
    (dependency) => dependency.state === 'outage' || dependency.state === 'degraded',
  );

  const overall = OVERALL_PRESENTATION[combined];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Platform Health
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Infrastructure, dependencies, and service status monitoring.
          </p>
        </div>
        <Link
          href="/admin/status"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--brand-primary) 12%, var(--bg-card))',
            border: '1px solid color-mix(in srgb, var(--brand-primary) 32%, var(--border-primary))',
            color: 'var(--brand-primary)',
          }}
        >
          Dependency status <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Overall status banner — reflects internal infra AND external dependencies */}
      <div
        className="rounded-xl p-6 flex items-center justify-between"
        style={{ backgroundColor: overall.color + '12', border: `1px solid ${overall.color}40` }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: overall.color }}>Overall System Status</p>
          <p className="text-2xl font-bold mt-1" style={{ color: overall.color }}>
            {!health ? 'API Unreachable' : overall.label}
          </p>
          {affected.length > 0 && (
            <p className="text-xs mt-1.5" style={{ color: overall.color }}>
              {affected.length} dependenc{affected.length === 1 ? 'y' : 'ies'} affected: {affected.map((dependency) => dependency.name).join(', ')}
            </p>
          )}
        </div>
        {health && (
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Uptime: <span className="font-semibold">{formatUptime(health.uptime)}</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Last checked: {new Date(health.timestamp).toLocaleTimeString('en-GB')}
            </p>
          </div>
        )}
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ServiceCard
          name="Database"
          description="PostgreSQL 16"
          status={health?.db ?? 'unknown'}
        />
        <ServiceCard
          name="Cache / Queues"
          description="Redis 7"
          status={health?.redis ?? 'unknown'}
        />
        <ServiceCard
          name="AI Service"
          description="Google Gemini"
          status={health?.ai.status ?? 'unknown'}
          detail={
            health?.ai.lastInteractionAt
              ? `Last call: ${formatRelative(health.ai.lastInteractionAt)}`
              : 'No recent interactions'
          }
        />
        <ServiceCard
          name="API Server"
          description="NestJS v11"
          status={health ? 'ok' : 'error'}
          detail={health ? `Uptime: ${formatUptime(health.uptime)}` : 'Unreachable'}
        />
      </div>

      {/* External dependencies — same source of truth as the Dependency Status page */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>External Dependencies</h3>
          <Link href="/admin/status" className="text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>
            View full status →
          </Link>
        </div>
        {dependencies.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Dependency status is temporarily unavailable.
          </p>
        ) : (
          <div className="space-y-5">
            {groupDependencies(dependencies).map(([group, items]) => (
              <div key={group}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{group}</p>
                  <Badge variant={dependencyBadgeVariant(worstServiceState(items.map((item) => item.state)))}>
                    {stateLabel(worstServiceState(items.map((item) => item.state)))}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                        {item.detail ? (
                          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.detail}</p>
                        ) : null}
                      </div>
                      <Badge variant={dependencyBadgeVariant(item.state)}>{stateLabel(item.state)}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Queue status + Errors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Background Queues (BullMQ)">
          {!health || health.queues.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No queue data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <th className="text-left py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Queue</th>
                    <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Waiting</th>
                    <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Active</th>
                    <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {health.queues.map((q) => (
                    <tr key={q.name} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                      <td className="py-2 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{q.name}</td>
                      <td className="py-2 text-right" style={{ color: 'var(--text-primary)' }}>{q.waiting}</td>
                      <td className="py-2 text-right" style={{ color: q.active > 0 ? '#2563eb' : 'var(--text-primary)' }}>{q.active}</td>
                      <td className="py-2 text-right" style={{ color: q.failed > 0 ? '#dc2626' : 'var(--text-primary)' }}>{q.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Error Monitoring">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold"
                style={{
                  backgroundColor: !health || health.recentErrorCount === 0 ? '#f0fdf4' : '#fef2f2',
                  color: !health || health.recentErrorCount === 0 ? '#16a34a' : '#dc2626',
                }}
              >
                {health?.recentErrorCount ?? '?'}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Errors in the last 24 hours
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Based on audit log entries containing error/fail actions
                </p>
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                For detailed error monitoring, configure Sentry via the <code className="px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>REHABSYNC_SENTRY_DSN</code> environment variable.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ServiceCard({
  name,
  description,
  status,
  detail,
}: {
  name: string;
  description: string;
  status: 'ok' | 'error' | 'unknown';
  detail?: string;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        {statusBadge(status)}
      </div>
      {detail && (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{detail}</p>
      )}
    </div>
  );
}
