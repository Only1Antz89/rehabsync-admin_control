'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'super_admin', label: 'Super admin' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
  { value: 'read_only', label: 'Read only' },
];

const inputClass =
  'block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2';
const inputStyle = {
  backgroundColor: 'var(--bg-input, #fff)',
  borderColor: 'var(--border-primary, #e2e8f0)',
  color: 'var(--text-primary)',
} as const;

export function PlatformAdminsManager() {
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('super_admin');
  const [password, setPassword] = useState('');

  const load = useCallback(() => {
    fetch('/api/admin/platform-admins')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load'))))
      .then((rows: AdminRow[]) => setAdmins(rows))
      .catch(() => setError('Could not load platform admins.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy('create');
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/platform-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role, password }),
      });
      const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setError(body?.message ?? body?.error ?? 'Create failed.');
        return;
      }
      setNotice(`${email.trim().toLowerCase()} can now sign in.`);
      setEmail('');
      setName('');
      setPassword('');
      setShowCreate(false);
      load();
    } finally {
      setBusy(null);
    }
  }

  async function patch(admin: AdminRow, body: Record<string, string>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(admin.id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/platform-admins/${admin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        setError(data?.message ?? data?.error ?? 'Update failed.');
        return;
      }
      load();
    } finally {
      setBusy(null);
    }
  }

  function resetPassword(admin: AdminRow) {
    const next = window.prompt(`New password for ${admin.email} (min 12 characters):`);
    if (next === null) return;
    void patch(admin, { password: next });
  }

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--brand-primary, #0d9488)' }}
        >
          {showCreate ? 'Cancel' : 'Add admin'}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={create}
          className="rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ borderColor: 'var(--border-primary, #e2e8f0)', backgroundColor: 'var(--bg-card, #fff)' }}
        >
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} style={inputStyle}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password (min 12 chars)</label>
            <input type="password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy === 'create'}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--brand-primary, #0d9488)' }}
            >
              Create admin
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-teal-700">{notice}</p>}

      <div
        className="overflow-x-auto rounded-xl border"
        style={{ borderColor: 'var(--border-primary, #e2e8f0)', backgroundColor: 'var(--bg-card, #fff)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wide border-b"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-primary, #e2e8f0)' }}
            >
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins === null ? (
              <tr><td colSpan={5} className="px-4 py-4" style={{ color: 'var(--text-secondary)' }}>Loading…</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-4" style={{ color: 'var(--text-secondary)' }}>No platform admins yet.</td></tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-secondary, #f1f5f9)' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{admin.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{admin.email}</p>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{admin.role.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        admin.status === 'active'
                          ? { backgroundColor: 'rgba(13,148,136,0.12)', color: '#0f766e' }
                          : { backgroundColor: 'rgba(220,38,38,0.10)', color: '#b91c1c' }
                      }
                    >
                      {admin.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {admin.lastLoginAt
                      ? new Date(admin.lastLoginAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : 'never'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <button className="text-sm font-medium underline" style={{ color: 'var(--brand-primary, #0d9488)' }} disabled={busy === admin.id} onClick={() => resetPassword(admin)}>
                      Reset password
                    </button>
                    <select
                      value={admin.role}
                      disabled={busy === admin.id}
                      aria-label={`Role for ${admin.email}`}
                      className="text-sm rounded-md border px-2 py-1"
                      style={inputStyle}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === admin.role) return;
                        void patch(admin, { role: next }, `Change ${admin.email} to ${next.replace('_', ' ')}?`);
                      }}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      className="text-sm font-medium underline"
                      style={{ color: admin.status === 'active' ? '#b91c1c' : 'var(--brand-primary, #0d9488)' }}
                      disabled={busy === admin.id}
                      onClick={() =>
                        void patch(
                          admin,
                          { status: admin.status === 'active' ? 'disabled' : 'active' },
                          admin.status === 'active'
                            ? `Disable ${admin.email}? Their sessions are revoked immediately.`
                            : undefined,
                        )
                      }
                    >
                      {admin.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
