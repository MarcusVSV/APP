// sw.js

const CACHE_NAME = 'gerenciador-cache-v8';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './debts.js',
  './manifest.json'
];

// Instalação: Salva os arquivos essenciais no cache do celular
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptação: Ao abrir o app, busca os arquivos no cache primeiro
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna o arquivo do cache se existir, senão baixa da rede
        return response || fetch(event.request);
      })
  );
});

// Atualização: Limpa caches antigos se houver uma nova versão
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});