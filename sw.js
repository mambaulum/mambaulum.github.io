/* ============================================================
   SI MAMBA - sw.js (Service Worker)  -- versi patch v5.5
   PWA offline caching untuk aplikasi SI MAMBA.

   STRATEGI CACHE:
   1) APP SHELL (index.html, css/, js/, vendor/, manifest.json, icons/, logo/)
      -> di-precache saat install, lalu disajikan dengan Stale-While-Revalidate.
         Aset ber-versi (?v=N) yang sudah ada di cache dibalas langsung tanpa
         revalidate (versinya dinaikkan manual saat deploy).
   2) NAVIGASI HALAMAN (buka / reload / homescreen)
      -> Network-First dengan batas waktu. Kalau network tidak menjawab dalam
         NAV_NETWORK_TIMEOUT_MS, langsung pakai index.html dari cache. Fetch
         tetap DIJAGA HIDUP (event.waitUntil) sampai selesai supaya cache
         ter-update untuk load berikutnya, walau sinyal lemot.
   3) LIBRARY CDN LAZY (Chart.js, SheetJS, jsPDF, font Google, dst)
      -> Stale-While-Revalidate. Respons hanya disimpan kalau BENAR-BENAR ok
         (status 2xx). Respons "opaque" tidak lagi disimpan, karena bisa saja
         itu halaman error/blokir dari proxy wifi yang lalu tersimpan selamanya.
         Untuk itu request lintas-origin diambil ulang dengan mode CORS agar
         statusnya bisa diperiksa.
   4) FIREBASE REALTIME DATABASE / AUTH (data) -> TIDAK di-cache (Network-Only).
   5) Request non-GET -> langsung ke network.

   PERUBAHAN v5.5 (dibanding v5.4):
   - event.waitUntil() pada update background (navigasi & SWR).
   - Tidak lagi menyimpan respons opaque; cek res.ok.
   - Kunjungan pertama tanpa cache punya batas waktu -> offline.html.
   - importScripts dibungkus try/catch (tidak lagi menggagalkan install).
   - Library inti dipindah ke ./vendor/ (satu origin, tidak tergantung CDN).
   - Cross-origin image tidak lagi di-cache (hanya script/style/font).

   CARA UPDATE VERSI:
   Setiap kali file app shell diubah dan di-deploy ulang, naikkan APP_VERSION
   DAN angka ?v= file terkait di index.html serta PRECACHE_URLS di bawah
   (css/styles.css, js/app.js, js/kas.js, js/administrasi-ujian.js,
   js/menu-hub.js, js/modul-ajar.js, js/buku-tamu.js, js/fitur-pelengkap.js,
   js/tunggakan-infaq.js, js/auto-logout.js, js/tahfidz-grafik.js, js/monitor-petugas.js).
============================================================ */

const APP_VERSION = 'v6.9';
const SHELL_CACHE = `si-mamba-shell-${APP_VERSION}`;
const RUNTIME_CACHE = `si-mamba-runtime-${APP_VERSION}`;
const ALL_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

// Saat membuka/refresh app dengan cache tersedia: tunggu network maksimal segini lama.
const NAV_NETWORK_TIMEOUT_MS = 3000;
// Kunjungan pertama (belum ada cache sama sekali): tunggu lebih lama, lalu tampilkan offline.html.
const NAV_FIRST_VISIT_TIMEOUT_MS = 12000;

// Modul IndexedDB dipakai bersama dengan halaman (lihat js/offline-db.js).
// Dibungkus try/catch supaya kegagalan memuat file ini (jaringan buruk) tidak
// menggagalkan seluruh pendaftaran Service Worker.
try {
  importScripts('./js/offline-db.js');
} catch (e) {
  console.warn('[SW] Gagal memuat js/offline-db.js:', e);
}

// File app shell milik sendiri (same-origin) yang WAJIB bisa diakses offline.
// Precache dilakukan satu per satu dengan try/catch supaya satu file yang
// gagal (404) tidak menggagalkan seluruh proses install.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css?v=20',              // samakan dengan ?v= di index.html
  './js/logo-fallback.js',
  './js/offline-db.js',
  './js/kas.js?v=5',
  './js/administrasi-ujian.js?v=2',
  './js/app.js?v=28',
  './js/menu-hub.js?v=3',
  './js/modul-ajar.js?v=5',
  './js/buku-tamu.js?v=4',
  './js/fitur-pelengkap.js?v=3',
  './js/tunggakan-infaq.js?v=3',
  './js/auto-logout.js?v=2',
  './js/tahfidz-grafik.js?v=3',
  './js/monitor-petugas.js?v=3',
  // Library inti (self-hosted, lihat download-vendor.bat) -- samakan ?v= dengan index.html
  './vendor/firebase-app-compat.js?v=10.12.0',
  './vendor/firebase-database-compat.js?v=10.12.0',
  './vendor/firebase-auth-compat.js?v=10.12.0',
  './vendor/lucide.min.js?v=0.263.0',
  './vendor/crypto-js.min.js?v=4.2.0',
  './vendor/jsQR.js?v=1.4.0',
  './vendor/qrcode.min.js?v=1.0.0',
  './offline.html',
  './icons/icon-v2-192x192.png',
  './icons/icon-v2-152x152.png',
  './icons/icon-v2-512x512.png',
  './icons/icon-v2-maskable-512x512.png',
  './icons/apple-touch-icon-v2-180x180.png',
  './logo/logo-lembaga.png',
  './logo/logo-lembaga-white.png',
];

// Domain Firebase (Realtime Database, Auth, Storage) & domain lain yang
// membawa DATA (bukan file statis) -> jangan pernah di-cache.
const NEVER_CACHE_HOSTS = [
  'firebaseio.com',
  'firebasedatabase.app',
  'firebaseapp.com',
  'googleapis.com', // Firebase Auth / Storage REST API
];

// Host CDN dengan URL ber-versi (isinya tidak berubah): kalau sudah ada di cache,
// langsung dibalas tanpa revalidate.
const IMMUTABLE_CDN_HOSTS = [
  'www.gstatic.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNeverCacheRequest(url) {
  // Google Fonts adalah file statis (bukan data) -- boleh di-cache.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return false;
  if (!NEVER_CACHE_HOSTS.some(host => url.hostname.endsWith(host))) return false;
  // Kalau app ini di-host di *.firebaseapp.com, hanya endpoint auth (/__/) yang network-only.
  if (isSameOrigin(url)) return url.pathname.startsWith('/__/');
  return true;
}

const timeoutAfter = ms => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

// ============================================================
// INSTALL: precache app shell (per-file, tahan gagal sebagian)
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async cache => {
      await Promise.all(
        PRECACHE_URLS.map(async url => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res && res.ok) await cache.put(url, res);
          } catch (e) {
            console.warn('[SW] Gagal precache:', url, e);
          }
        })
      );
    })
  );
  // Tidak auto skipWaiting(): update dikontrol dari UI (lihat listener 'message' di bawah).
});

// ============================================================
// ACTIVATE: bersihkan cache versi lama
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith('si-mamba-') && !ALL_CACHES.includes(key))
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ============================================================
// FETCH: routing strategi sesuai jenis request
// ============================================================
self.addEventListener('fetch', event => {
  const req = event.request;

  // Non-GET selalu langsung ke network.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Data Firebase (Auth/Storage REST, dsb) -> network only.
  if (isNeverCacheRequest(url)) return;

  // Navigasi -> Network-First dengan batas waktu.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(req, event));
    return;
  }

  // Aset statis milik sendiri maupun library CDN -> Stale-While-Revalidate.
  if (isSameOrigin(url) || isKnownStaticAsset(req)) {
    event.respondWith(staleWhileRevalidate(req, event));
    return;
  }
  // Selain itu -> biarkan lewat apa adanya.
});

function isKnownStaticAsset(req) {
  // Hanya script/style/font lintas-origin (image lintas-origin tidak lagi di-cache).
  return ['script', 'style', 'font'].includes(req.destination);
}

// Network-First untuk navigasi HTML.
async function networkFirstNavigate(req, event) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match('./index.html');

  // Simpan hanya respons valid: sukses (2xx) dan bukan redirect ke domain lain
  // (mis. halaman login captive portal Wi-Fi).
  const valid = res => res && res.ok && !(res.redirected && new URL(res.url).origin !== self.location.origin);
  const networkFetch = fetch(req).then(res => {
    if (valid(res)) cache.put('./index.html', res.clone());
    return res;
  });

  // KUNCI PERBAIKAN: jaga Service Worker tetap hidup sampai fetch selesai, walau kita
  // sudah membalas dari cache. Tanpa ini browser mematikan SW dan cache tidak pernah ter-update.
  event.waitUntil(networkFetch.catch(() => {}));

  if (!cached) {
    // Kunjungan pertama, belum ada cache: tunggu network, tapi tidak selamanya.
    try {
      return await Promise.race([networkFetch, timeoutAfter(NAV_FIRST_VISIT_TIMEOUT_MS)]);
    } catch (e) {
      const offline = await cache.match('./offline.html');
      return offline || new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>SI MAMBA</title><body style="font-family:sans-serif;text-align:center;padding:40px">' +
        '<h2>Tidak dapat terhubung</h2><p>Jaringan terlalu lambat atau terputus.</p>' +
        '<button onclick="location.reload()" style="padding:10px 20px;font-size:16px">Coba lagi</button></body>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
  }

  try {
    const res = await Promise.race([networkFetch, timeoutAfter(NAV_NETWORK_TIMEOUT_MS)]);
    return valid(res) ? res : cached;   // server error / captive portal -> pakai cache
  } catch (e) {
    return cached;                      // timeout / offline -> cache (update lanjut di background)
  }
}

// Ambil dari network. Untuk request lintas-origin, ambil dengan mode CORS agar statusnya
// bisa diperiksa (respons opaque tidak bisa dibedakan antara file asli dan halaman error).
function fetchForCache(req, sameOrigin) {
  if (sameOrigin) return fetch(req);
  return fetch(req.url, { mode: 'cors', credentials: 'omit' }).catch(() => fetch(req));
}

// Stale-While-Revalidate.
async function staleWhileRevalidate(req, event) {
  const url = new URL(req.url);
  const sameOrigin = isSameOrigin(url);
  const cache = await caches.open(sameOrigin ? SHELL_CACHE : RUNTIME_CACHE);
  const cached = await cache.match(req, { ignoreVary: true });

  // Aset same-origin ber-versi (?v=N) yang sudah di cache: balas langsung, tanpa revalidate.
  if (cached && sameOrigin && url.searchParams.has('v')) return cached;
  // Library CDN ber-versi (isinya tidak berubah): juga tanpa revalidate.
  if (cached && IMMUTABLE_CDN_HOSTS.includes(url.hostname)) return cached;

  const networkFetch = fetchForCache(req, sameOrigin)
    .then(res => {
      // Simpan hanya respons yang benar-benar sukses (2xx). Opaque TIDAK disimpan.
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  event.waitUntil(networkFetch);   // biarkan update cache selesai walau respons sudah dikirim

  return cached || (await networkFetch) || new Response('', { status: 504, statusText: 'Offline dan belum ada cache untuk aset ini' });
}

// ============================================================
// BACKGROUND SYNC: absensi/jurnal yang diinput saat offline
// ============================================================
// Service Worker tidak menjalankan Firebase SDK, jadi saat event 'sync' berjalan, semua
// tab SI MAMBA yang sedang terbuka diminta mengirim antrian pendingWrites (lihat listener
// 'message' tipe FLUSH_PENDING_QUEUE di app.js). Kalau tidak ada tab terbuka, antrian tetap
// aman di IndexedDB dan dikirim saat app dibuka lagi (flushPendingWrites()).
self.addEventListener('sync', event => {
  if (event.tag !== 'sync-si-mamba') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'FLUSH_PENDING_QUEUE' }));
    })
  );
});

// ============================================================
// UPDATE TERKONTROL DARI UI
// app.js mengirim postMessage({type:'SKIP_WAITING'}) setelah user menekan tombol
// "Perbarui Aplikasi".
// ============================================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
