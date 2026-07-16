'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface SavedView {
  name: string;
  query: string; // encoded URLSearchParams of just the captured filter keys
}

/**
 * Named filter presets for a list screen, stored in localStorage (client-only, no API). Captures the
 * given `paramKeys` from the URL, lets the user save the current combination under a name, and
 * re-applies a preset by rewriting those query params.
 */
export function SavedViews({ storageKey, paramKeys }: { storageKey: string; paramKeys: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [views, setViews] = useState<SavedView[]>([]);
  const lsKey = `rs-saved-views:${storageKey}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) setViews(JSON.parse(raw) as SavedView[]);
    } catch {
      /* ignore malformed storage */
    }
  }, [lsKey]);

  const persist = useCallback(
    (next: SavedView[]) => {
      setViews(next);
      try {
        localStorage.setItem(lsKey, JSON.stringify(next));
      } catch {
        /* storage full / unavailable — non-fatal */
      }
    },
    [lsKey],
  );

  const currentQuery = useCallback(() => {
    const p = new URLSearchParams();
    for (const key of paramKeys) {
      const value = searchParams.get(key);
      if (value) p.set(key, value);
    }
    return p.toString();
  }, [paramKeys, searchParams]);

  const hasActiveFilters = currentQuery().length > 0;

  const save = () => {
    const name = window.prompt('Name this view')?.trim();
    if (!name) return;
    persist([...views.filter((v) => v.name !== name), { name, query: currentQuery() }]);
  };

  const apply = (view: SavedView) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of paramKeys) params.delete(key);
    new URLSearchParams(view.query).forEach((value, key) => params.set(key, value));
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const remove = (name: string) => persist(views.filter((v) => v.name !== name));

  if (views.length === 0 && !hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Views</span>
      {views.map((view) => {
        const isActive = view.query === currentQuery();
        return (
          <span
            key={view.name}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={
              isActive
                ? { backgroundColor: 'var(--brand-primary, #0d9488)', color: '#fff', borderColor: 'var(--brand-primary, #0d9488)' }
                : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }
            }
          >
            <button type="button" onClick={() => apply(view)} className="cursor-pointer">
              {view.name}
            </button>
            <button
              type="button"
              onClick={() => remove(view.name)}
              aria-label={`Delete view ${view.name}`}
              className="cursor-pointer opacity-70 hover:opacity-100"
              style={{ color: isActive ? '#fff' : 'var(--text-muted)' }}
            >
              ×
            </button>
          </span>
        );
      })}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={save}
          className="rounded-full border border-dashed px-2.5 py-0.5 text-xs font-medium"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
        >
          + Save current
        </button>
      )}
    </div>
  );
}
