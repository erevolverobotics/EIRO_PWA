'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  Bot,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavItem[];
}

interface SidebarProps {
  items: NavItem[];
  roleLabel: string;
  roleColor: string;
  open: boolean;
  onClose: () => void;
}

function NavLink({
  item,
  depth = 0,
  onClose,
  collapsed = false,
}: {
  item: NavItem;
  depth?: number;
  onClose: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  const isActive =
    pathname === item.href || pathname.startsWith(item.href + '/');

  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClose}
        title={collapsed ? item.label : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
          'text-sm font-medium transition-all duration-200',
          depth > 0 && !collapsed && 'ml-6 text-xs',
          collapsed && 'justify-center px-0',
          isActive
            ? [
                'border border-purple-500/30',
                'bg-gradient-to-r from-fuchsia-600/20 via-purple-600/15 to-violet-600/10',
                'text-purple-200',
                'shadow-[0_0_15px_rgba(168,85,247,0.08)]',
              ].join(' ')
            : 'border border-transparent text-[#A99DBB] hover:border-purple-500/15 hover:bg-purple-500/[0.08] hover:text-white'
        )}
      >
        {isActive && (
          <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-gradient-to-b from-fuchsia-400 to-violet-500 shadow-[0_0_10px_rgba(192,80,255,0.7)]" />
        )}

        <Icon
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-colors duration-200',
            isActive
              ? 'text-fuchsia-400'
              : 'text-[#887B9B] group-hover:text-purple-300'
          )}
        />

        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">
              {item.label}
            </span>

            {item.badge && (
              <span className="min-w-[18px] rounded-full border border-purple-400/20 bg-gradient-to-r from-fuchsia-600 to-violet-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                {item.badge}
              </span>
            )}

            {item.children && (
              <ChevronRight className="h-3 w-3 text-[#756584]" />
            )}
          </>
        )}
      </Link>

      {item.children && isActive && !collapsed && (
        <ul className="mt-1 space-y-1 border-l border-purple-500/20 ml-4">
          {item.children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              depth={depth + 1}
              onClose={onClose}
              collapsed={collapsed}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  DISTRICT_ADMIN: 'District Admin',
  HEAD_JUDGE: 'Head Judge',
  JUDGE: 'Judge / Referee',
  VENUE_COORDINATOR: 'Venue Coordinator',
  CHECKIN_VOLUNTEER: 'Check-in Volunteer',
  SCHOOL_COORDINATOR: 'School Coordinator',
  PUBLIC_VIEWER: 'Viewer',
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'text-red-400',
  DISTRICT_ADMIN: 'text-orange-400',
  HEAD_JUDGE: 'text-purple-400',
  JUDGE: 'text-purple-400',
  VENUE_COORDINATOR: 'text-emerald-400',
  CHECKIN_VOLUNTEER: 'text-emerald-400',
  SCHOOL_COORDINATOR: 'text-fuchsia-400',
  PUBLIC_VIEWER: 'text-[#A99DBB]',
};

export function Sidebar({
  items,
  roleLabel,
  roleColor,
  open,
  onClose,
}: SidebarProps) {
  const { primaryRole, profile, signOut } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [resizing, setResizing] = useState(false);

  const liveRole = primaryRole
    ? ROLE_DISPLAY[primaryRole] ?? roleLabel
    : roleLabel;

  const liveColor = primaryRole
    ? ROLE_COLOR[primaryRole] ?? roleColor
    : roleColor;

  const displayName =
    profile?.displayName ?? profile?.email ?? '';

  const handleResize = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (!resizing) return;

    setSidebarWidth(
      Math.min(360, Math.max(210, event.clientX))
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="sidebar-overlay fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        onPointerMove={handleResize}
        onPointerUp={() => setResizing(false)}
        onPointerCancel={() => setResizing(false)}
        style={{
          width: collapsed ? '76px' : `${sidebarWidth}px`,
          flexShrink: 0,
        }}
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex h-[100dvh] flex-col',
          'border-r border-fuchsia-400/15',
          'bg-[rgba(8,4,13,0.88)] text-white backdrop-blur-2xl',
          'shadow-[8px_0_35px_rgba(0,0,0,0.45)]',
          'transition-[width,transform] duration-300',
          'md:relative md:z-auto md:h-full md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Subtle ambient purple glow */}
        <div className="pointer-events-none absolute left-0 top-0 h-40 w-full bg-[radial-gradient(ellipse_at_top_left,rgba(147,51,234,0.13),transparent_70%)]" />

        {/* Header */}
        <div
          className={cn(
            'relative flex h-[60px] flex-shrink-0 items-center border-b border-[#302038]/70 px-3',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            onClick={onClose}
            title="EIRO"
          >
            <div className="relative h-9 w-9 flex-shrink-0"><img src="/IMAGES/image-removebg-preview%20(8).png"alt="EIRO Logo"className="h-full w-full object-contain"/></div>
            {/* Logo without a heavy background box
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
              <Bot className="h-6 w-6 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(192,80,255,0.5)]" />
            </div> */}

            {!collapsed && (
              <div className="min-w-0">
                <span className="text-sm font-bold leading-none tracking-wide text-white">
                  EIRO
                </span>
                <p
                  className={cn(
                    'mt-0.5 text-[10px] font-semibold leading-none',
                    liveColor
                  )}
                >
                  {liveRole}
                </p>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="hidden rounded-lg p-1.5 text-[#887B9B] transition hover:bg-purple-500/10 hover:text-purple-300 md:block"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="absolute right-[-12px] top-[70px] z-50 hidden rounded-full border border-purple-500/30 bg-[#100B18] p-1.5 text-purple-300 shadow-lg transition hover:bg-purple-600 hover:text-white md:block"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#887B9B] transition hover:bg-purple-500/10 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative min-h-0 flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                onClose={onClose}
                collapsed={collapsed}
              />
            ))}
          </ul>
        </nav>

        {/* User identity + sign-out footer */}
        <div className="relative flex-shrink-0 space-y-2 border-t border-[#302038]/70 p-2">
          {displayName && (
            <div
              title={collapsed ? displayName : undefined}
              className={cn(
                'rounded-xl border border-[#302038]/80 bg-[#100B18] px-2 py-2',
                'transition-colors hover:border-purple-500/30',
                collapsed && 'flex justify-center'
              )}
            >
              {collapsed ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-400/30 bg-gradient-to-br from-fuchsia-600 to-violet-700 text-xs font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <>
                  <p className="truncate text-[11px] font-semibold text-[#F5F0FD]">
                    {displayName}
                  </p>
                  <p className={cn('truncate text-[10px]', liveColor)}>
                    {liveRole}
                  </p>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => signOut()}
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-2',
              'text-xs text-[#A99DBB] transition-all duration-200',
              'hover:bg-red-500/10 hover:text-red-400',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
            {!collapsed && 'Sign out'}
          </button>

          {!collapsed && (
            <p className="text-center text-[10px] tracking-wide text-[#665873]">
              EIRO Platform v1.0
            </p>
          )}
        </div>

        {/* Desktop resize handle */}
        {!collapsed && (
          <div
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              setResizing(true);
            }}
            className={cn(
              'absolute right-[-4px] top-0 z-[60] hidden h-full w-2',
              'cursor-col-resize touch-none md:block',
              'after:absolute after:inset-y-0 after:left-[3px] after:w-[2px]',
              'after:bg-transparent after:transition-colors',
              'hover:after:bg-fuchsia-400/70',
              resizing && 'after:bg-fuchsia-400'
            )}
          />
        )}
      </aside>
    </>
  );
}
