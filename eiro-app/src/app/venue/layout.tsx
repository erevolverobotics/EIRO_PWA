'use client';

import { Suspense, useState } from 'react';
import { Sidebar, type NavItem } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import {
  LayoutDashboard, QrCode, UserCheck, CalendarDays, Shuffle,
  CreditCard, ClipboardList, Activity, History
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { RouteGuard } from '@/components/layout/RouteGuard';

const VENUE_NAV: NavItem[] = [
  { label: 'Venue Dashboard', href: '/venue', icon: LayoutDashboard },
  { label: 'QR Check-in', href: '/venue/checkin', icon: QrCode },
  { label: 'Team Attendance', href: '/venue/attendance', icon: UserCheck },
  { label: 'Training Day 1', href: '/venue/training/day1', icon: CalendarDays },
  { label: 'Training Day 2', href: '/venue/training/day2', icon: CalendarDays },
  { label: 'Training Dashboard', href: '/venue/training', icon: ClipboardList },
  { label: 'Payment Verification', href: '/venue/payments', icon: CreditCard },
  { label: 'Arena Queue', href: '/venue/queue', icon: Activity },
  { label: 'Merge / Transfer', href: '/venue/adjustments', icon: Shuffle, badge: 1 },
  { label: 'Attendance History', href: '/venue/history', icon: History },
];

function getTitle(pathname: string): string {
  const found = VENUE_NAV.find(n => n.href === pathname || pathname.startsWith(n.href + '/'));
  return found ? found.label : 'Venue Coordinator';
}

function VenueHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  return <Header title={getTitle(pathname)} onMenuClick={onMenuClick} />;
}

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RouteGuard allowedRoles={['VENUE_COORDINATOR', 'CHECKIN_VOLUNTEER', 'DISTRICT_ADMIN', 'SUPER_ADMIN']}>
      <div className="flex h-screen overflow-hidden animated-bg">
        <Sidebar
          items={VENUE_NAV}
          roleLabel="Venue Coordinator"
          roleColor="text-green-400"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Suspense fallback={<Header title="Venue Coordinator" onMenuClick={() => setSidebarOpen(true)} />}>
            <VenueHeader onMenuClick={() => setSidebarOpen(true)} />
          </Suspense>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
