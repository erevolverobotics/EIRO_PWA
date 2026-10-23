'use client';

import { useState } from 'react';
import { Sidebar, type NavItem } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import {
  LayoutDashboard, Settings, Users, School, Trophy, Calendar,
  MapPin, ClipboardList, BarChart3, Award, FileText, ShieldCheck,
  Shuffle, History, Upload, CreditCard, UserCheck, Zap
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { RouteGuard } from '@/components/layout/RouteGuard';

const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Seasons', href: '/admin/seasons', icon: Trophy },
  { label: 'Categories & Rules', href: '/admin/categories', icon: Settings },
  { label: 'Districts & Venues', href: '/admin/districts', icon: MapPin },
  { label: 'Schools & Approvals', href: '/admin/schools', icon: School, badge: 3 },
  { label: 'Staff & Judges', href: '/admin/staff', icon: Users },
  { label: 'Schedule Builder', href: '/admin/schedule', icon: Calendar },
  { label: 'Live Operations', href: '/admin/live', icon: Zap },
  { label: 'Score Verification', href: '/admin/scores', icon: ShieldCheck },
  { label: 'Rankings & Qualification', href: '/admin/rankings', icon: BarChart3 },
  { label: 'State Finals', href: '/admin/finals', icon: Award },
  { label: 'Payment Verification', href: '/admin/payments', icon: CreditCard },
  { label: 'Publication & Certs', href: '/admin/publication', icon: Award },
  { label: 'Team Adjustments', href: '/admin/adjustments', icon: Shuffle, badge: 1 },
  { label: 'Adjustment History', href: '/admin/adjustments/history', icon: History },
  { label: 'Import Monitoring', href: '/admin/imports', icon: Upload },
  { label: 'Reports & Audit', href: '/admin/reports', icon: FileText },
  { label: 'Attendance Mgmt', href: '/admin/attendance', icon: UserCheck },
];

function getTitle(pathname: string): string {
  const found = ADMIN_NAV.find(n => n.href === pathname);
  return found ? found.label : 'Admin Dashboard';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <RouteGuard allowedRoles={['SUPER_ADMIN', 'DISTRICT_ADMIN']}>
      <div className="flex h-screen overflow-hidden bg-[#0a0f1e]">
        <Sidebar
          items={ADMIN_NAV}
          roleLabel="Super Admin"
          roleColor="text-red-400"
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
