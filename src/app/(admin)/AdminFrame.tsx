'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import type { AdminRole } from '../../lib/admin-api';
import { OnboardingTour, type TourStep } from '../../lib/OnboardingTour';

const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to the RehabSync console',
    body: 'A 30-second tour of the platform control centre. You can skip it anytime.',
  },
  {
    target: 'a[data-tour="admin-nav:/admin"]',
    title: 'Platform overview',
    body: 'Your home base — tenant health, activity and key platform metrics at a glance.',
  },
  {
    target: 'a[data-tour="admin-nav:/admin/tenants"]',
    title: 'Manage tenants',
    body: 'Create, configure and support every clinic on the platform from here.',
  },
  {
    target: 'a[data-tour="admin-nav:/admin/analytics"]',
    title: 'Web Analytics & SEO',
    body: 'Track traffic, search visibility and Core Web Vitals, and jump to the live dashboards.',
  },
  {
    target: 'a[data-tour="admin-nav:/admin/support"]',
    title: 'Support desk',
    body: 'Triage and reply to tenant support tickets in one place.',
  },
  {
    title: "You're all set",
    body: (
      <>
        That&apos;s the quick tour. Help articles and ticketing live in the{' '}
        <a href="/admin/support">Support area</a> — reach out anytime you need a hand.
      </>
    ),
  },
];

export function AdminFrame({ children, role }: { children: ReactNode; role?: AdminRole }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="admin-theme rs-app-shell flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <AdminSidebar role={role} />
      <div className="flex-1 lg:pl-64 min-w-0 min-h-0">
        <main className="rs-main-scroll h-full p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>{children}</main>
      </div>
      <OnboardingTour steps={ADMIN_TOUR_STEPS} tourKey="rs-onboarding-admin-v1" accent="#0d9488" />
    </div>
  );
}
