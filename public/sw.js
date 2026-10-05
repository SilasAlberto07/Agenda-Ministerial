// Service worker da Agenda Ministerial (versão web / iPhone)
// Recebe os avisos enviados pelo robô de lembretes e mostra a notificação.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { body: event.data ? event.data.text() : '' };
  }
  const titulo = dados.title || 'Agenda Ministerial';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: dados.tag,
      data: { eventoId: dados.eventoId || null },
    })
  );
});

// Ao tocar no aviso, abre (ou traz para frente) o app no compromisso
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.eventoId;
  const url = new URL(id ? `/?evento=${encodeURIComponent(id)}` : '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          if (id) janela.postMessage({ abrirEvento: id });
          return janela.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
