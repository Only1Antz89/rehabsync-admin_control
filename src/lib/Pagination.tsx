'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * URL-driven pagination (`?page=N`) for server-rendered list screens. The page slices the data by
 * `page`; this just renders the controls and updates the query string.
 */
export function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const go = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const btn = (active: boolean): React.CSSProperties =>
    active
      ? { backgroundColor: 'var(--brand-primary, #0d9488)', color: '#fff', borderColor: 'var(--brand-primary, #0d9488)' }
      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' };

  // Compact window of page numbers around the current page.
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav className="flex flex-wrap items-center gap-1.5 justify-between" aria-label="Pagination">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => go(currentPage - 1)}
          className="rounded-md border px-2.5 py-1 text-sm font-medium disabled:opacity-40"
          style={btn(false)}
        >
          Prev
        </button>
        {start > 1 && <span className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className="rounded-md border px-2.5 py-1 text-sm font-medium min-w-[2rem]"
            style={btn(p === currentPage)}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => go(currentPage + 1)}
          className="rounded-md border px-2.5 py-1 text-sm font-medium disabled:opacity-40"
          style={btn(false)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
