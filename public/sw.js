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
      data: { eventoId: dados.eventoId || null, tela: dados.tela || null },
    })
  );
});

// Ao tocar no aviso, abre (ou traz para frente) o app no compromisso
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.eventoId;
  const tela = event.notification.data && event.notification.data.tela;
  const caminho = id ? `/?evento=${encodeURIComponent(id)}` : tela ? `/?tela=${encodeURIComponent(tela)}` : '/';
  const url = new URL(caminho, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) {
          if (id) janela.postMessage({ abrirEvento: id });
          else if (tela) janela.postMessage({ abrirTela: tela });
          return janela.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
