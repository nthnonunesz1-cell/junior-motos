/* Service worker: faz o app abrir mesmo sem internet.
   Ao publicar uma versão nova do index.html, aumente o número em CACHE. */
const CACHE = 'oficina-v5';
const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png', './logo.png', './logo-negativo.png',
  './fonts/barlow-condensed-600.woff2', './fonts/barlow-condensed-700.woff2', './fonts/barlow-condensed-700-italic.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ARQUIVOS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function buscarComLimite(req, ms) {
  return new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('tempo esgotado')), ms);
    fetch(req).then(r => { clearTimeout(t); ok(r); }, err => { clearTimeout(t); falha(err); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Página: tenta a versão mais nova (até 3 s) e cai no cache se estiver sem internet.
  if (req.mode === 'navigate') {
    e.respondWith(
      buscarComLimite(req, 3000)
        .then(resp => {
          if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); }
          return resp;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Demais arquivos (ícones, fontes): cache primeiro.
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(resp => {
      if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return resp;
    }))
  );
});
