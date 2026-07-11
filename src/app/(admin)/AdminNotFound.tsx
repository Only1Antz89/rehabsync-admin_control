import Link from 'next/link';

export function AdminNotFound() {
  const subject = encodeURIComponent('Superadmin console 404');
  const body = encodeURIComponent('Please review this missing or restricted RehabSync admin route.');

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <section
          className="w-full overflow-hidden rounded-lg border shadow-lg"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
        >
          <div className="border-b px-6 py-4" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
              >
                RS
              </span>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--brand-text)' }}>RehabSync</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Superadmin console</p>
              </div>
            </div>
          </div>
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_280px] md:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--brand-text)' }}>404</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-normal md:text-6xl">
                This route has been discharged.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7" style={{ color: 'var(--text-secondary)' }}>
                The page is missing, retired, or restricted to registered RehabSync superadmins.
                No platform data is shown here.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/admin/login"
                  className="rounded-md px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
                >
                  Superadmin sign in
                </Link>
                <a
                  href={`mailto:support@rehabsync.com?subject=${subject}&body=${body}`}
                  className="rounded-md border px-4 py-2 text-sm font-bold transition-colors"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  Log a ticket
                </a>
              </div>
            </div>
            <div
              className="rounded-lg border p-5"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                <p style={{ color: 'var(--brand-text)' }}>rehabsync.access.check</p>
                <p className="mt-4">tenant_scope: isolated</p>
                <p>admin_scope: tenant only</p>
                <p>superadmin_scope: verified only</p>
                <p className="mt-4" style={{ color: 'var(--color-error-text)' }}>result: route_not_found</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
