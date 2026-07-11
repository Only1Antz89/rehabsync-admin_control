const DEMO_BASE = process.env['REHABSYNC_DEMO_URL'] ?? process.env['REHABSYNC_WEB_URL'] ?? 'https://rehabsync.vercel.app';

const accounts = [
  { role: 'Admin', email: 'olivia.hart@lakesiderehab.co.uk', view: '/dashboard' },
  { role: 'Consultant', email: 'joshua.ellis@lakesiderehab.co.uk', view: '/consultant/dashboard' },
  { role: 'Client', email: 'sarah.johnson@example.com', view: '/client/dashboard' },
];

export const dynamic = 'force-dynamic';

export default function AdminDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Sales demo access</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          A shared, unlimited-plan demo workspace for the sales team — show the admin, consultant, and client
          experiences from one login. Access is controlled here in superadmin.
        </p>
      </div>

      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
        <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Demo portal</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          Sign in as the demo <strong>Admin</strong> below, then use the admin-only sidebar switcher
          (Admin · Consultant · Client) to demo each actual portal route.
        </p>
        <a
          href={`${DEMO_BASE}/login`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          Open demo portal →
        </a>
      </div>

      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Demo accounts</h2>
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.role} className="flex items-center justify-between gap-4 flex-wrap rounded-lg p-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-secondary)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.role}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.email} · password: <code>DemoPass123!</code></p>
              </div>
              <a
                href={`${DEMO_BASE}${a.view}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold"
                style={{ color: 'var(--brand-primary)' }}
              >
                Open {a.role.toLowerCase()} view →
              </a>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Direct view links require being signed in as the demo Admin first (they share one session).
        </p>
      </div>

      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
        <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Plan</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Keep the demo tenant on an <strong>Enterprise / unlimited</strong> plan so every feature and AI function
          is available during demos. Set it under <a href="/admin/tenants" style={{ color: 'var(--brand-primary)' }}>Tenants → override plan</a>.
        </p>
      </div>
    </div>
  );
}
