// PWA Service Worker Registration
// Drop this in a layout or _app if you want auto-registration

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[PWA] Service Worker registered:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available — reload to update');
            // Optionally: dispatch a custom event to show a "Update available" toast
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      });
    } catch (err) {
      console.error('[PWA] Service Worker registration failed:', err);
    }
  });
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((r) => r.unregister());
}
