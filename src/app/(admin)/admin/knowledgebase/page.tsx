import { adminFetch } from '../../../../lib/admin-api';
import {
  KnowledgebaseManager,
  type KbOverview,
  type KbSource,
  type KbTopics,
} from './KnowledgebaseManager';

export const dynamic = 'force-dynamic';

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await adminFetch(path, { cache: 'no-store' });
    if (res.ok) return (await res.json()) as T;
  } catch {
    /* API unavailable */
  }
  return null;
}

export default async function AdminKnowledgebasePage() {
  const [overview, topics, sources] = await Promise.all([
    getJson<KbOverview>('/api/v1/admin/knowledgebase/overview'),
    getJson<KbTopics>('/api/v1/admin/knowledgebase/topics'),
    getJson<KbSource[]>('/api/v1/admin/knowledgebase/sources'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Support &amp; Settings</p>
        <h1 className="mt-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Knowledgebase</h1>
        <p className="mt-1 max-w-3xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Control the clinical knowledgebase available to every tenant — the taxonomy of topics, the
          whitelist of citable sources (and tenant requests to add more), and the AI safeguarding.
        </p>
      </div>

      <KnowledgebaseManager
        initialOverview={overview}
        initialTopics={topics}
        initialSources={sources ?? []}
      />
    </div>
  );
}
