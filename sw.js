// Service worker do AIKE
// - O app (HTML) sempre tenta a versão mais nova da internet primeiro;
//   sem internet, abre a última versão guardada.
// - Os dados do Supabase NUNCA são guardados aqui: vêm sempre do banco.
const CACHE = 'aike-v2';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './icons/icone-192.png', './icons/icone-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Supabase, fontes etc. passam direto

  // Página: internet primeiro (pega atualizações), cache se estiver offline
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')){
    e.respondWith(
      fetch(req)
        .then(resp => { const copia = resp.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); return resp; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Ícones e manifesto: cache primeiro, atualizando em segundo plano
  e.respondWith(
    caches.match(req).then(salvo => {
      const rede = fetch(req).then(resp => { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return resp; }).catch(() => salvo);
      return salvo || rede;
    })
  );
});
