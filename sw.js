const CACHE_NAME = 'allin-v3';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/health.html',
  '/gym.html',
  '/finance.html',
  '/po-water.html',
  '/auth.html',
  '/topbar.js',
  '/time-blocking.js',
  '/manifest.json',
  '/favicon.svg',
  '/icons/logo.svg',
  '/icons/logo-small.svg',
  '/js/auth.js',
  '/js/config.js',
  '/js/finance-data.js',
  '/js/goals-data.js',
  '/js/gym-data.js',
  '/js/habits-data.js',
  '/js/nutrition-data.js',
  '/js/objectives-data.js',
  '/js/programs-data.js',
  '/js/running-data.js',
  '/js/stack-data.js',
  '/js/stretching-data.js',
  '/js/supabase.js',
  '/js/user-menu.js',
  '/js/water-data.js',
  '/js/workouts-data.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept: Supabase API, Google Fonts, ESM CDN, non-GET
  if (
    url.includes('supabase.co') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('esm.sh') ||
    e.request.method !== 'GET'
  ) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for all other static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
