'use client';

import React, { useState, useEffect } from 'react';

interface Note {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function TenantNotes({ tenantId }: { tenantId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [authorName, setAuthorName] = useState('Admin');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tenants/${tenantId}/notes`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotes(Array.isArray(data) ? data : []))
      .catch(() => setNotes([]));
  }, [tenantId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: authorName.trim() || 'Admin', content: content.trim() }),
      });
      if (res.ok) {
        const note = (await res.json()) as Note;
        setNotes((prev) => [note, ...prev]);
        setContent('');
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-32 shrink-0 px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
          <input
            type="text"
            placeholder="Add a note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#0d9488' }}
          >
            {submitting ? '...' : 'Add'}
          </button>
        </div>
      </form>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
          No notes yet. Add one above.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {note.authorName}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatRelative(note.createdAt)}
                </span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
