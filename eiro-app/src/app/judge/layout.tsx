'use client';

import { useState } from 'react';
import { Sidebar, type NavItem } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import {
  LayoutDashboard, ClipboardList, Timer, Swords, Star, History, ShieldCheck
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { RouteGuard } from '@/components/layout/RouteGuard';

const JUDGE_NAV: NavItem[] = [
  { label: 'My Assignments', href: '/judge', icon: LayoutDashboard },
  { label: 'Assigned Matches', href: '/judge/matches', icon: Swords },
  { label: 'Timed Runs', href: '/judge/timed-runs', icon: Timer },
  { label: 'Rubric Scoring', href: '/judge/rubric', icon: Star },
  { label: 'Eligibility Check', href: '/judge/eligibility', icon: ShieldCheck },
  { label: 'Scorecard History', href: '/judge/history', icon: History },
];

const HEAD_JUDGE_NAV: NavItem[] = [
  ...JUDGE_NAV,
  { label: 'Score Verification', href: '/judge/verify', icon: ShieldCheck, badge: 2 },
];

function getTitle(pathname: string): string {
  const all = [...JUDGE_NAV, ...HEAD_JUDGE_NAV];
  const found = all.find(n => n.href === pathname);
  return found ? found.label : 'Judge Panel';
}

export default function JudgeLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <RouteGuard allowedRoles={['JUDGE', 'HEAD_JUDGE', 'DISTRICT_ADMIN', 'SUPER_ADMIN']}>
      <div className="flex h-screen overflow-hidden bg-[#0a0f1e]">
        <Sidebar
          items={HEAD_JUDGE_NAV}
          roleLabel="Judge / Referee"
          roleColor="text-purple-400"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header title={getTitle(pathname)} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
