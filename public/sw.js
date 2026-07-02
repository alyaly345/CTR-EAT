self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || '🔔 Nouvelle commande !';
  const options = {
    body: data.body || 'Une commande vous a été assignée.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [500, 200, 500, 200, 500, 200, 500],
    requireInteraction: true,
    silent: false,
    tag: 'nouvelle-commande',
    renotify: true,
    data: { url: data.url || '/livreur/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/livreur/dashboard')
  );
});