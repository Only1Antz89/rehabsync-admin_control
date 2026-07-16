import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminSession, type AdminRole } from '../../lib/admin-api';
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

  let role: AdminRole | undefined;
  if (pathname !== '/admin/login') {
    const admin = await getAdminSession();
    if (!admin) {
      redirect('/admin/login');
    }
    // Any active platform admin may enter; the sidebar + the platform API scope what they can see.
    role = admin.role;
  }

  return <AdminFrame role={role}>{children}</AdminFrame>;
}
