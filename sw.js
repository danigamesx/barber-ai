
const CACHE_NAME = 'barberai-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/index.tsx',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap',
  'https://sdk.mercadopago.com/js/v2'
];

// Evento de instalação: abre o cache e armazena os assets principais.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('Failed to cache app shell:', error);
      })
  );
});

// Evento de ativação: limpa caches antigos para garantir que a nova versão seja usada.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Garante que o novo service worker assuma o controle imediatamente.
  return self.clients.claim();
});

// Evento de fetch: intercepta as requisições de rede.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET e requisições de API para evitar cache de dados dinâmicos.
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('supabase.co')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Estratégia: Stale-While-Revalidate
  // 1. Tenta buscar no cache.
  // 2. Ao mesmo tempo, faz uma requisição à rede.
  // 3. Se a resposta da rede for bem-sucedida, atualiza o cache.
  // 4. Retorna a resposta do cache (se existir) imediatamente, ou aguarda a resposta da rede.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Se a resposta da rede for válida, atualiza o cache.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          // O fetch falhou, provavelmente por estar offline.
          console.log('Service Worker: Fetch failed; returning offline page instead.', error);
          // Opcional: você pode retornar uma página offline customizada aqui.
          // return caches.match('/offline.html');
        });

        // Retorna a resposta do cache imediatamente se estiver disponível,
        // ou aguarda a promessa da rede (que atualizará o cache para a próxima vez).
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Listener for push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  let data = { title: 'Nova Notificação', body: 'Algo novo aconteceu no BarberAI!' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('[Service Worker] Push event contains invalid JSON.', e);
  }

  const title = data.title;
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener for notification click
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      // If a window is already open, focus it.
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
