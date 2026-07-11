import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getAdminSession, isSuperadmin } from '../../lib/admin-api';
import { AdminFrame } from './AdminFrame';

// SECURITY: the superadmin console must never be indexed or surfaced by any
// crawler (search or AI). This noindex is layered with an X-Robots-Tag header
// (next.config + middleware) and a blanket robots.txt Disallow on the admin host.
export const metadata: Metadata = {
  title: { absolute: 'Admin Console' },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nositelinkssearchbox: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-snippet': 0,
      'max-image-preview': 'none',
    },
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';

  if (pathname !== '/admin/login') {
    const admin = await getAdminSession();
    if (!admin) {
      redirect('/admin/login');
    }
    if (!isSuperadmin(admin)) {
      notFound();
    }
  }

  return <AdminFrame>{children}</AdminFrame>;
}
