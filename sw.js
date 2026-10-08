const SW_VERSION = 'v2.4-b23';
const CACHE_NAME = `kasir-${SW_VERSION}`;

const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './manifest.json',

    './js/config.js',
    './js/firebase-config.js',
    './js/utils.js',
    './js/db.js',
    './js/sync.js',
    './js/ui.js',
    './js/storage.js',
    './js/test.js',
    './js/component-loader.js',
    './js/main.js',

    './components/lock-screen.html',
    './components/header.html',
    './components/input-page.html',
    './components/riwayat-page.html',
    './components/modals.html',
];

self.addEventListener('install', event => {
    console.log(`[SW ${SW_VERSION}] INSTALL`);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log(`[SW ${SW_VERSION}] ACTIVATE`);

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name =>
                            name.startsWith('kasir-v') &&
                            name !== CACHE_NAME
                        )
                        .map(name => {
                            console.log(`[SW] Delete cache: ${name}`);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    if (
        url.origin.includes('firebase') ||
        url.origin.includes('googleapis') ||
        !url.protocol.startsWith('http')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(networkResponse => {

                        if (
                            networkResponse &&
                            networkResponse.status === 200 &&
                            networkResponse.type === 'basic'
                        ) {
                            const responseClone = networkResponse.clone();

                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(
                                        event.request,
                                        responseClone
                                    );
                                });
                        }

                        return networkResponse;
                    })
                    .catch(() => {
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});