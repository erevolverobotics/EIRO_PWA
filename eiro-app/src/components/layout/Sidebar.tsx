'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { X, Bot, ChevronRight, LogOut } from 'lucide-react';
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

// NavLink uses usePathname — must be inside <Suspense>
function NavLink({ item, depth = 0, onClose }: { item: NavItem; depth?: number; onClose: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onClose}
        className={cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          depth > 0 && 'ml-6 text-xs',
          isActive
            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        )}
      >
        <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300')} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white min-w-[18px] text-center">
            {item.badge}
          </span>
        )}
        {item.children && <ChevronRight className="w-3 h-3 text-gray-600" />}
      </Link>
      {item.children && (
        <Suspense>
          <NavLinkChildren item={item} onClose={onClose} depth={depth} />
        </Suspense>
      )}
    </li>
  );
}

// Separate component for children so each level has its own Suspense boundary
function NavLinkChildren({ item, depth, onClose }: { item: NavItem; depth: number; onClose: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  if (!isActive || !item.children) return null;
  return (
    <ul className="mt-1 space-y-1">
      {item.children.map(child => (
        <Suspense key={child.href}>
          <NavLink item={child} depth={depth + 1} onClose={onClose} />
        </Suspense>
      ))}
    </ul>
  );
}

// Static nav item (no pathname — used as fallback inside Suspense)
function StaticNavItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const Icon = item.icon;
  return (
    <li>
      <span className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400',
        depth > 0 && 'ml-6 text-xs',
      )}>
        <Icon className="w-4 h-4 flex-shrink-0 text-gray-500" />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white min-w-[18px] text-center">
            {item.badge}
          </span>
        )}
      </span>
    </li>
  );
}

const ROLE_DISPLAY: Record<string, string> = {
  SUPER_ADMIN:        'Super Admin',
  DISTRICT_ADMIN:     'District Admin',
  HEAD_JUDGE:         'Head Judge',
  JUDGE:              'Judge / Referee',
  VENUE_COORDINATOR:  'Venue Coordinator',
  CHECKIN_VOLUNTEER:  'Check-in Volunteer',
  SCHOOL_COORDINATOR: 'School Coordinator',
  PUBLIC_VIEWER:      'Viewer',
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN:        'text-red-400',
  DISTRICT_ADMIN:     'text-orange-400',
  HEAD_JUDGE:         'text-purple-400',
  JUDGE:              'text-purple-400',
  VENUE_COORDINATOR:  'text-green-400',
  CHECKIN_VOLUNTEER:  'text-green-400',
  SCHOOL_COORDINATOR: 'text-blue-400',
  PUBLIC_VIEWER:      'text-gray-400',
};

export function Sidebar({ items, roleLabel, roleColor, open, onClose }: SidebarProps) {
  const { primaryRole, profile, signOut } = useAuth();

  const liveRole  = primaryRole ? (ROLE_DISPLAY[primaryRole] ?? roleLabel) : roleLabel;
  const liveColor = primaryRole ? (ROLE_COLOR[primaryRole]   ?? roleColor) : roleColor;
  const displayName = profile?.displayName ?? profile?.email ?? '';

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div className="sidebar-overlay md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 bottom-0 w-64 flex flex-col z-50 glass border-r border-white/5 transition-transform duration-300',
          'md:translate-x-0 md:static md:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header — Brand + live role */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-white leading-none">EIRO</span>
              <p className={cn('text-[10px] leading-none mt-0.5 font-semibold', liveColor)}>
                {liveRole}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="md:hidden text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation — each NavLink wrapped in its own Suspense */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {items.map(item => (
              <Suspense key={item.href} fallback={<StaticNavItem item={item} />}>
                <NavLink item={item} onClose={onClose} />
              </Suspense>
            ))}
          </ul>
        </nav>

        {/* User identity + sign-out footer */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {displayName && (
            <Link href="/profile"
              className="block px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all group"
              title="View profile"
            >
              <p className="text-[11px] font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{displayName}</p>
              <p className={cn('text-[10px] truncate', liveColor)}>{liveRole}</p>
            </Link>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
          >
            <LogOut className="w-3 h-3" />
            Sign out
          </button>
          <p className="text-[10px] text-gray-700 text-center">EIRO Platform v1.0</p>
        </div>
      </aside>
    </>
  );
}
