const CACHE_NAME = 'map-hybrid-labels-v3'; // Новая версия кеша
const ASSETS = [
    './',
    './index.html',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Проверяем, является ли запрос тайлом карты.
    // Теперь мы ищем 3 домена:
    // 1. openstreetmap.org (Схема)
    // 2. arcgisonline.com (Спутник)
    // 3. cartocdn.com (Надписи/Дороги)
    const isMapTile = 
        url.origin.includes('openstreetmap.org') || 
        url.origin.includes('arcgisonline.com') ||
        url.origin.includes('cartocdn.com');

    if (isMapTile) {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((response) => {
                    // Если есть в кеше - отдаем
                    if (response) return response;
                    
                    // Если нет - качаем и сохраняем
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    }).catch(() => {
                        // Офлайн и нет тайла
                        return new Response('', { status: 408 });
                    });
                });
            })
        );
    } else {
        // Обычная стратегия для остальных файлов
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});