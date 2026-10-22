'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw-register';
import toast from 'react-hot-toast';

export function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();

    // Show update toast when new SW is available
    const handler = () => {
      toast('🔄 App update available — refresh to get the latest version', {
        duration: 8000,
        icon: '🚀',
      });
    };
    window.addEventListener('sw-update-available', handler);
    return () => window.removeEventListener('sw-update-available', handler);
  }, []);

  return <>{children}</>;
}
