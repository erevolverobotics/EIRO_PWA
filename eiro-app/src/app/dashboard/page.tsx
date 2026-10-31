'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { Loader2, Bot } from 'lucide-react';
import type { UserRole } from '@/lib/types';

/**
 * /dashboard — Smart redirect hub.
 * Waits for auth to resolve, then sends the user to their
 * role-appropriate area. Unauthenticated users are sent to /login.
 */
const ROLE_ROUTES: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin',
  DISTRICT_ADMIN: '/admin',
  HEAD_JUDGE: '/judge',
  VENUE_COORDINATOR: '/venue',
  SCHOOL_COORDINATOR: '/coordinator',
  JUDGE: '/judge',
  CHECKIN_VOLUNTEER: '/venue',
  PUBLIC_VIEWER: '/',
};

export default function DashboardPage() {
  const { user, primaryRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // wait for auth state

    if (!user) {
      router.replace('/login');
      return;
    }

    // Redirect based on role; fall back to /coordinator for authenticated
    // users without a role assignment (e.g. newly signed-up coordinators).
    const destination = primaryRole
      ? (ROLE_ROUTES[primaryRole] ?? '/coordinator')
      : '/coordinator';
    router.replace(destination);
  }, [user, primaryRole, loading, router]);

  return (
    <div className="min-h-screen animated-bg flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg glow-accent">
        <Bot className="w-8 h-8 text-white" />
      </div>
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        Loading your dashboard&hellip;
      </div>
    </div>
  );
}
