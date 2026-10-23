'use client';

import { useState } from 'react';
import { Sidebar, type NavItem } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import {
  LayoutDashboard, School, Users, Plus, Upload, ClipboardList,
  QrCode, Calendar, Trophy, Award, Shuffle, CreditCard, BookOpen
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { RouteGuard } from '@/components/layout/RouteGuard';

const COORDINATOR_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/coordinator', icon: LayoutDashboard },
  { label: 'School Profile', href: '/coordinator/school', icon: School },
  { label: 'Category Directory', href: '/coordinator/categories', icon: BookOpen },
  { label: 'Register Team', href: '/coordinator/register', icon: Plus },
  { label: 'Bulk CSV Upload', href: '/coordinator/bulk-upload', icon: Upload },
  { label: 'My Registrations', href: '/coordinator/registrations', icon: ClipboardList, badge: 2 },
  { label: 'Fee Status', href: '/coordinator/fees', icon: CreditCard },
  { label: 'Team Passes', href: '/coordinator/passes', icon: QrCode },
  { label: 'Schedule & Venue', href: '/coordinator/schedule', icon: Calendar },
  { label: 'Results & Finals', href: '/coordinator/results', icon: Trophy },
  { label: 'Certificates', href: '/coordinator/certificates', icon: Award },
  { label: 'Transfer / Merge', href: '/coordinator/adjustments', icon: Shuffle },
];

function getTitle(pathname: string): string {
  const found = COORDINATOR_NAV.find(n => n.href === pathname);
  return found ? found.label : 'School Coordinator';
}

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <RouteGuard allowedRoles={['SCHOOL_COORDINATOR', 'DISTRICT_ADMIN', 'SUPER_ADMIN']}>
      <div className="flex h-screen overflow-hidden bg-[#0a0f1e]">
        <Sidebar
          items={COORDINATOR_NAV}
          roleLabel="School Coordinator"
          roleColor="text-blue-400"
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
