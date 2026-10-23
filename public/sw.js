// Service worker da Agenda Ministerial (versão web / iPhone)
// Recebe os avisos enviados pelo robô de lembretes e mostra a notificação.

// ---- Funcionar sem internet -------------------------------------------------
// As telas do app ficam guardadas no aparelho. Com internet, sempre busca a versão
// mais nova (e atualiza a cópia); sem internet, abre a cópia guardada.
// A agenda em si fica salva pelo próprio app (cópia local dos compromissos).
const CACHE = 'agenda-app-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['/', '/manifest.json']))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('agenda-app-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Só os arquivos do próprio site; Firebase, mapas etc. seguem direto para a internet
  if (url.origin !== self.location.origin) return;

  // Página do app: internet primeiro, cópia guardada se estiver sem internet
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return resp;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  // Programas, fontes e imagens (os nomes mudam a cada versão): usa a cópia e guarda os novos
  event.respondWith(
    caches.match(req).then(
      (guardado) =>
        guardado ||
        fetch(req).then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        })
    )
  );
});

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
