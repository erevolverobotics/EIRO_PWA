'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Bot, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

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
      {item.children && isActive && (
        <ul className="mt-1 space-y-1">
          {item.children.map(child => (
            <NavLink key={child.href} item={child} depth={depth + 1} onClose={onClose} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({ items, roleLabel, roleColor, open, onClose }: SidebarProps) {
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white leading-none">EIRO</span>
              <p className={cn('text-[10px] leading-none mt-0.5', roleColor)}>{roleLabel}</p>
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {items.map(item => (
              <NavLink key={item.href} item={item} onClose={onClose} />
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5">
          <p className="text-[10px] text-gray-600 text-center">EIRO Platform v1.0 · Evolve Robotics</p>
        </div>
      </aside>
    </>
  );
}
