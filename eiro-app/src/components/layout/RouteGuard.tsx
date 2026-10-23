'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-context';
import { Bot, Loader2, ShieldX } from 'lucide-react';
import type { UserRole } from '@/lib/types';

interface RouteGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { user, loading, roles } = useAuth();
  const router = useRouter();

  const userRoles = roles.map(r => r.role);
  const hasAccess = userRoles.some(r => allowedRoles.includes(r));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
  }, [user, loading, router]);

  // Always render children (satisfies Next.js 16 instant navigation segment validation).
  // Overlay the appropriate gate screen on top when access is not confirmed yet.
  const showGate = loading || !user || !hasAccess;

  return (
    <>
      {/* Children always mount so the segment is never "dropped" */}
      <div style={{ visibility: showGate ? 'hidden' : 'visible', position: showGate ? 'absolute' : 'static', inset: 0 }}>
        {children}
      </div>

      {/* Gate overlay */}
      {showGate && (
        <div className="fixed inset-0 z-50 bg-[#0a0f1e] flex flex-col items-center justify-center gap-4 px-4">
          {(loading || !user) ? (
            /* Loading / unauthenticated spinner */
            <>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                Verifying access…
              </div>
            </>
          ) : (
            /* Wrong role */
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <ShieldX className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center max-w-sm">
                <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-sm text-gray-400 mb-1">
                  You don&apos;t have permission to view this page.
                </p>
                <p className="text-xs text-gray-600">
                  Required: {allowedRoles.map(r => r.replace(/_/g, ' ')).join(' or ')}
                </p>
                {userRoles.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Your role: {userRoles.map(r => r.replace(/_/g, ' ')).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.replace('/dashboard')}
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
                >
                  Go to my dashboard
                </button>
                <button
                  onClick={() => router.replace('/')}
                  className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl transition-colors"
                >
                  Home
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

