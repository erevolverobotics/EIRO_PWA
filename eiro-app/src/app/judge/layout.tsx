'use client';

import { Suspense, useState } from 'react';
import { Sidebar, type NavItem } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import {
  LayoutDashboard, Timer, Swords, Star, History, ShieldCheck
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { RouteGuard } from '@/components/layout/RouteGuard';
import { useAuth } from '@/lib/firebase/auth-context';

const JUDGE_NAV: NavItem[] = [
  { label: 'My Assignments', href: '/judge', icon: LayoutDashboard },
  { label: 'Assigned Matches', href: '/judge/matches', icon: Swords },
  { label: 'Timed Runs', href: '/judge/timed-runs', icon: Timer },
  { label: 'Rubric Scoring', href: '/judge/rubric', icon: Star },
  { label: 'Eligibility Check', href: '/judge/eligibility', icon: ShieldCheck },
  { label: 'Scorecard History', href: '/judge/history', icon: History },
];

const HEAD_JUDGE_EXTRA: NavItem = {
  label: 'Score Verification', href: '/judge/verify', icon: ShieldCheck, badge: 2
};

function getTitle(pathname: string, items: NavItem[]): string {
  const found = items.find(n => n.href === pathname || pathname.startsWith(n.href + '/'));
  return found ? found.label : 'Judge Panel';
}

function JudgeHeader({ navItems, onMenuClick }: { navItems: NavItem[]; onMenuClick: () => void }) {
  const pathname = usePathname();
  return <Header title={getTitle(pathname, navItems)} onMenuClick={onMenuClick} />;
}

export default function JudgeLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { primaryRole } = useAuth();

  const navItems: NavItem[] = primaryRole === 'HEAD_JUDGE'
    ? [...JUDGE_NAV, HEAD_JUDGE_EXTRA]
    : JUDGE_NAV;

  return (
    <RouteGuard allowedRoles={['JUDGE', 'HEAD_JUDGE', 'DISTRICT_ADMIN', 'SUPER_ADMIN']}>
      <div className="flex h-screen overflow-hidden animated-bg">
        <Sidebar
          items={navItems}
          roleLabel="Judge / Referee"
          roleColor="text-purple-400"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Suspense fallback={<Header title="Judge Panel" onMenuClick={() => setSidebarOpen(true)} />}>
            <JudgeHeader navItems={navItems} onMenuClick={() => setSidebarOpen(true)} />
          </Suspense>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
