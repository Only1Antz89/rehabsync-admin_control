'use client';

import type { ComponentType, CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BookOpen,
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FlaskConical,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  Megaphone,
  MonitorPlay,
  Rocket,
  Send,
  Server,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  Wrench,
  ShoppingBag,
} from 'lucide-react';
import { ThemeToggle } from '../../lib/ThemeToggle';
import type { AdminRole } from '../../lib/admin-api';

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** Standalone internal tools on sibling subdomains — rendered as plain external links. */
  external?: boolean;
  /** Scoped roles (besides super_admin) that may see this item. Omit = super_admin only. */
  roles?: AdminRole[];
}

// Coarse UI scoping. super_admin sees everything; these are the extra grants per scoped role. The
// platform API is the real gate (default-deny) — this just avoids showing links that would 404.
const READ: AdminRole[] = ['support', 'billing', 'read_only'];
const SUPPORT: AdminRole[] = ['support'];
const BILLING: AdminRole[] = ['billing'];

const SALES_CENTRE_URL =
  process.env['NEXT_PUBLIC_SALES_CENTRE_URL'] ?? 'https://salescentre.rehabsync.app';
const ADS_CENTRE_URL =
  process.env['NEXT_PUBLIC_ADS_CENTRE_URL'] ?? 'https://adscentre.rehabsync.app';

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupName: 'Overview',
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard, roles: READ },
      { label: 'Web Analytics', href: '/admin/analytics', icon: LineChart, roles: READ },
      { label: 'Platform', href: '/admin/platform', icon: Server, roles: READ },
    ],
  },
  {
    groupName: 'Support',
    items: [
      { label: 'Support', href: '/admin/support', icon: LifeBuoy, roles: SUPPORT },
      { label: 'Platform Admins', href: '/admin/admins', icon: UserCog },
      { label: 'Audit', href: '/admin/audit', icon: ClipboardList, roles: READ },
      { label: 'Tenants', href: '/admin/tenants', icon: Building2, roles: READ },
      { label: 'Pilot', href: '/admin/pilot', icon: FlaskConical, roles: READ },
      { label: 'Broadcasts', href: '/admin/broadcasts', icon: Megaphone, roles: SUPPORT },
    ],
  },
  {
    groupName: 'Revenue',
    items: [
      { label: 'Sales CRM', href: '/admin/crm', icon: Users },
      { label: 'Demo', href: '/admin/demo', icon: MonitorPlay },
      { label: 'Billing', href: '/admin/billing', icon: CreditCard, roles: BILLING },
      { label: 'Plans', href: '/admin/plans', icon: CreditCard, roles: BILLING },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, roles: BILLING },
      { label: 'Store', href: '/admin/store', icon: ShoppingBag, roles: BILLING },
    ],
  },
  {
    groupName: 'Internal tools',
    items: [
      { label: 'Sales Centre', href: SALES_CENTRE_URL, icon: LineChart, external: true },
      { label: 'Ads Centre', href: ADS_CENTRE_URL, icon: Send, external: true },
    ],
  },
  {
    groupName: 'Operations',
    items: [
      { label: 'AI Usage', href: '/admin/ai', icon: Bot, roles: READ },
      { label: 'Knowledgebase', href: '/admin/knowledgebase', icon: BookOpen },
      { label: 'Maintenance Agent', href: '/admin/agent', icon: Wrench },
      { label: 'Data Retention', href: '/admin/data-retention', icon: Trash2 },
      { label: 'Status Page', href: '/admin/status', icon: ShieldCheck, roles: READ },
      { label: 'Domains', href: '/admin/domains', icon: Globe2, roles: READ },
      { label: 'Onboarding', href: '/admin/onboarding', icon: Rocket },
    ],
  },
];

/** super_admin sees everything; a scoped role sees only items whose `roles` include it. */
function groupsForRole(role: AdminRole | undefined): NavGroup[] {
  if (!role || role === 'super_admin' || role === 'admin') return NAV_GROUPS;
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles?.includes(role)),
  })).filter((group) => group.items.length > 0);
}

const adminLinkBaseStyle: CSSProperties = {
  color: 'var(--text-secondary)',
};

const adminLinkActiveStyle: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, var(--brand-primary) 13%, var(--bg-card))',
  borderColor: 'color-mix(in srgb, var(--brand-primary) 42%, var(--border-primary))',
  color: 'var(--brand-text)',
};

function setAdminLinkHover(element: HTMLElement, active: boolean) {
  if (active) return;
  element.style.backgroundColor = 'var(--bg-hover)';
  element.style.color = 'var(--text-primary)';
}

function clearAdminLinkHover(element: HTMLElement, active: boolean) {
  if (active) return;
  element.style.backgroundColor = 'transparent';
  element.style.color = 'var(--text-secondary)';
}

export function AdminSidebar({ role }: { role?: AdminRole }) {
  const pathname = usePathname();
  const groups = groupsForRole(role);
  const items = groups.flatMap((group) => group.items);

  const sidebarContent = (
    <div
      className="flex h-full flex-col border-r"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 border-b px-5 py-5"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold"
          style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
        >
          RS
        </span>
        <span className="truncate text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Admin Centre
        </span>
      </div>

      {/* Nav items */}
      <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.groupName} className="space-y-1">
              <h3
                className="px-3 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {group.groupName}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  if (item.external) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        <ExternalLink className="ml-auto h-3 w-3 text-slate-400" />
                      </a>
                    );
                  }

                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-tour={`admin-nav:${item.href}`}
                      aria-current={isActive ? 'page' : undefined}
                      className="relative flex items-center gap-3 rounded-md border px-3 py-2 text-sm font-semibold transition-colors"
                      style={
                        isActive
                          ? adminLinkActiveStyle
                          : { ...adminLinkBaseStyle, borderColor: 'transparent' }
                      }
                      onMouseEnter={(e) => setAdminLinkHover(e.currentTarget, isActive)}
                      onMouseLeave={(e) => clearAdminLinkHover(e.currentTarget, isActive)}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                        style={{ backgroundColor: isActive ? 'currentColor' : 'transparent' }}
                      />
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom label */}
      <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex items-center gap-2 text-xs font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            <Activity className="h-4 w-4" style={{ color: 'var(--brand-text)' }} />
            Platform console
          </div>
          <ThemeToggle compact showLabel />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        {sidebarContent}
      </div>

      {/* Mobile: simple top bar fallback */}
      <div
        className="fixed left-0 right-0 top-0 z-40 flex items-center gap-4 border-b px-4 py-3 lg:hidden"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
      >
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          RehabSync Admin
        </span>
        <nav className="custom-scrollbar flex gap-2 overflow-x-auto">
          {items.map((item) => {
            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </a>
              );
            }
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs font-semibold transition-colors"
                style={
                  isActive
                    ? adminLinkActiveStyle
                    : { ...adminLinkBaseStyle, borderColor: 'transparent' }
                }
                onMouseEnter={(e) => setAdminLinkHover(e.currentTarget, isActive)}
                onMouseLeave={(e) => clearAdminLinkHover(e.currentTarget, isActive)}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0.5 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: isActive ? 'currentColor' : 'transparent' }}
                />
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle compact menuPlacement="bottom" />
      </div>
    </>
  );
}
