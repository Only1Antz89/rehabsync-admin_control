'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Input } from '@rs/ui';

export function TenantsFilter({
  search,
  status,
  planId,
}: {
  search?: string;
  status?: string;
  planId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 when filter changes
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        type="search"
        placeholder="Search clinics…"
        defaultValue={search ?? ''}
        onChange={(e) => updateParams('search', e.target.value)}
        className="w-56"
      />

      <select
        defaultValue={status ?? ''}
        onChange={(e) => updateParams('status', e.target.value)}
        className="h-9 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        style={{
          border: '1px solid var(--border-primary)',
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-secondary)',
        }}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="trial">Trial</option>
        <option value="past_due">Past due</option>
        <option value="suspended">Suspended</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <select
        defaultValue={planId ?? ''}
        onChange={(e) => updateParams('planId', e.target.value)}
        className="h-9 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        style={{
          border: '1px solid var(--border-primary)',
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-secondary)',
        }}
      >
        <option value="">All plans</option>
        <option value="starter">Starter</option>
        <option value="growth">Growth</option>
        <option value="enterprise">Enterprise</option>
      </select>
    </div>
  );
}
