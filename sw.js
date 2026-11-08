self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => /^si-mamba-(shell|runtime)-/.test(k)).map(k => caches.delete(k)));
    await self.registration.unregister();
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach(c => {
      const p = new URL(c.url).pathname;
      if (p === '/' || p === '/index.html') { try { c.navigate(c.url); } catch (e) {} }
    });
  })());
});
