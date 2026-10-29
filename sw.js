/* ============================================================
   SI MAMBA - sw.js (Service Worker)  -- versi: lihat APP_VERSION di bawah
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

   PERUBAHAN v7.43 (hasil audit):
   - Install: file inti (index/app.js/styles/firebase/crypto) WAJIB berhasil di-precache; kalau gagal,
     install dibatalkan & dicoba lagi (sebelumnya SW "terpasang" dengan cache bolong -> offline rusak).
   - Install: respons 200 berisi HTML untuk file .js/.css/gambar (halaman login Wi-Fi/captive portal)
     ditolak, bukan disimpan permanen sebagai aset ber-versi.
   - Install: respons hasil redirect dibersihkan (browser menolak respons redirected untuk navigasi).
   - Precache dibatasi 8 unduhan paralel (jaringan lemah tidak kewalahan).
   - Cache runtime hanya menyimpan status 200 (206 dari Range request membuat cache.put gagal).
   - Pencocokan host NEVER_CACHE memakai batas titik (bukan sekadar endsWith).

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
   (css/styles.css, js/app.js, js/portal-ortu.js, js/infaq.js, js/sikap-buku.js, js/materi-tugas.js, js/kelola-absen-guru.js, js/jadwal.js, js/laporan-rekap.js, js/honor-guru.js, js/event-ujian.js, js/pengingat-absen-guru.js, js/v4-tahfidz-pramuka-ekskul.js, js/v4-pengaturan-notif-rapor.js, js/rekap-nilai.js, js/kalender-akademik.js, js/saran-kritik.js, js/ortu-akun-admin.js, js/amalan-kegiatan.js, js/kas.js, js/administrasi-ujian.js,
   js/bacaan-shalat.js, js/menu-hub.js, js/rapat.js, js/modul-ajar.js, js/buku-tamu.js, js/fitur-pelengkap.js,
   js/tunggakan-infaq.js, js/auto-logout.js, js/login-kode.js, js/tahfidz-grafik.js, js/monitor-petugas.js,
   js/kredensial.js, js/peran-ganda.js, js/ttd-digital.js, js/data-pkg-mi.js, js/pkg.js, js/perangkat-*.js).
============================================================ */

const APP_VERSION = 'v8.246';
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
  './css/styles.css?v=21',
  './css/menu-polish.css?v=35',              // samakan dengan ?v= di index.html
  './css/impersonate.css?v=3',            // gaya spanduk & modal impersonasi (samakan dengan ?v= di index.html)
  './js/logo-fallback.js',
  './js/offline-db.js',
  './js/kas.js?v=9',
  './js/administrasi-ujian.js?v=4',
  './js/app.js?v=134',
  './js/portal-ortu.js?v=2',                // Portal Orang Tua: login, PIN, dashboard (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/infaq.js?v=1',                      // Infaq/Iuran Mingguan (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/sikap-buku.js?v=2',                 // Sikap, Buku Penghubung, Info ke Ortu (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/materi-tugas.js?v=1',               // Materi Belajar & Tugas (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/kelola-absen-guru.js?v=6',          // Kelola Absen Guru + Koreksi Honor Sholat (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/jadwal.js?v=5',                     // Jadwal Pelajaran (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/laporan-rekap.js?v=2',              // Rekap Absensi/Jurnal PDF + Laporan bulanan PDF (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/honor-guru.js?v=25',                 // Honor Guru: honor sholat, tarif, Halaman Honor, panjar, slip, PDF Rekap Honor (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/honor-kebersihan.js?v=3',            // Honor Petugas Kebersihan (input manual; dimuat SESUDAH honor-guru.js)
  './js/versi-app.js?v=2',                   // Penampil versi + Cek pembaruan (footer menu samping; berdiri sendiri)
  './js/event-ujian.js?v=1',                // Event & Ujian: form admin, daftar, check-in kamera (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/pengingat-absen-guru.js?v=1',       // Absen Guru Admin + pengingat belum absen (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/v4-tahfidz-pramuka-ekskul.js?v=2',  // V4: panel siswa, Tahfidz, Pramuka, Ekskul (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/v4-pengaturan-notif-rapor.js?v=3',  // V4: tarif honor, pengaturan Absen QR, notifikasi, persetujuan, Rapor (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/rekap-nilai.js?v=2',                // Rekap Nilai + ekspor PDF/Excel (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/kalender-akademik.js?v=1',          // Kalender Akademik/Nasional + panel "Hari Ini" (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/saran-kritik.js?v=1',               // Saran & Kritik Portal Ortu (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/ortu-akun-admin.js?v=1',            // Akun Portal Ortu sisi Admin + Reset PIN (dipecah dari app.js; dimuat SESUDAH app.js)
  './js/amalan-kegiatan.js?v=32',          // menu Amalan Yaumiyah (dimuat SESUDAH app.js)
  './js/bacaan-shalat.js?v=3',            // menu Bacaan Shalat + checklist amalan Portal Ortu + Mode Anak (dimuat SESUDAH app.js)
  './js/kredensial.js?v=8',               // verifikasi PIN guru + panel Keamanan Login (dimuat sesudah app.js)
  './js/ttd-digital.js?v=10',              // tanda tangan QR/gambar + halaman verifikasi publik (dimuat SESUDAH app.js)
  './js/menu-hub.js?v=12',
  './js/menu-polish.js?v=31',
  './js/rekap-jurnal.js?v=1',            // halaman Rekap Jurnal Mengajar (menu Pembelajaran; dimuat SESUDAH app.js & menu-hub.js)
  './js/rapat.js?v=7',                    // menu Rapat (halaman dibuat JS; dimuat SESUDAH app.js & menu-hub.js)
  './js/data-pkg-mi.js?v=1',              // instrumen & rumus PKG Guru MI (dimuat SEBELUM pkg.js)
  './js/pkg-sumber.js?v=65',               // pembaca absensi guru/jurnal/nilai/perangkat pembelajaran untuk bukti otomatis PKG (dimuat SEBELUM pkg.js)
  './js/data-pkg-angket.js?v=6',          // butir & rumus angket PKG (dimuat SEBELUM pkg.js; juga dipakai angket.html)
  './js/pkg.js?v=96',                     // menu PKG Guru (halaman dibuat JS; dimuat SESUDAH app.js & menu-hub.js)
  './js/pkg-surat.js?v=4',                // surat PKG berQR Kepala (dimuat SESUDAH pkg.js)
  './js/pkg-analisis.js?v=3',             // tab Analisis PKG (dimuat SESUDAH pkg.js)
  './js/data-tp-mi.js?v=3',
  './js/data-tp-umum.js?v=1',            // bank TP mapel umum (dimuat sesudah data-tp-mi.js)
  './js/data-soal-semua.js?v=1',          // bank soal gabungan semua mapel (menggantikan data-soal-mi.js)
  './js/data-soal-aqh-tambahan.js?v=1',
  './js/data-soal-pai-tambahan.js?v=1',
  './js/data-soal-umum-tambahan.js?v=1',
  './js/data-soal-pai-fase-a-tambahan.js?v=1',
  './js/perangkat-rpe.js?v=15',
  './js/perangkat-prota-promes.js?v=9',
  './js/perangkat-atp-tp.js?v=11',
  './js/data-kisi-resmi-mi.js?v=3',
  './js/perangkat-kisi.js?v=12',
  './js/perangkat-soal.js?v=24',
  './js/perangkat-paket.js?v=2',
  './js/perangkat-pembelajaran.js?v=23',
  './js/modul-ajar.js?v=16',
  './js/buku-tamu.js?v=5',
  './js/fitur-pelengkap.js?v=3',
  './js/tunggakan-infaq.js?v=13',
  './js/auto-logout.js?v=5',
  './js/login-kode.js?v=12',               // juga dipakai login OFFLINE (membungkus login())
  './js/impersonate.js?v=7',
  './js/peran-ganda.js?v=1',              // peran ganda: guru yang juga Kepala beralih Guru/Kepala tanpa logout (dimuat SESUDAH app.js, kredensial.js, login-kode.js)
  './js/absen-manual-gps.js?v=5',          // konfirmasi manual Admin untuk absen QR guru yang GPS-nya bermasalah (dimuat SESUDAH app.js)
  './js/surat-guru.js?v=47',               // surat resmi guru + kerangka tab Surat & Ijin
  './js/agenda-surat.js?v=5',             // agenda & rekap surat masuk/keluar (+ API SIMambaAgenda)
  './js/undangan-rapat.js?v=5',           // undangan rapat bernomor (tab Surat & Ijin)
  './js/edaran-wali.js?v=5',              // surat edaran wali murid (tab Surat & Ijin)
  './js/tahfidz-grafik.js?v=4',
  './js/monitor-petugas.js?v=5',
  './js/rujukan.js?v=5',                   // catatan rujukan regulasi per menu/tab
  './js/tombol-kembali.js?v=3',            // tombol kembali HP/PWA tersambung ke navigasi aplikasi
  './js/tab-halaman.js?v=2',               // tab per bagian untuk halaman panjang di HP
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
  './icons/icon-v2-512x512.png',
  './icons/icon-v2-maskable-512x512.png',
  './icons/apple-touch-icon-v2-180x180.png',
  './logo/logo-lembaga.png',
  './logo/logo-yayasan.png',
  './fonts/bookman-old-style-regular.ttf',   // font naskah penetapan (PMA 12/2026) untuk PDF SK
  './fonts/bookman-old-style-bold.ttf',
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

function isAppShellPath(url) {
  const scope = new URL('./', self.location).pathname;   // mis. '/' atau '/app/'
  return url.pathname === scope || url.pathname === scope + 'index.html';
}

function isNeverCacheRequest(url) {
  // Google Fonts adalah file statis (bukan data) -- boleh di-cache.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return false;
  if (!NEVER_CACHE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) return false;
  // Kalau app ini di-host di *.firebaseapp.com, hanya endpoint auth (/__/) yang network-only.
  if (isSameOrigin(url)) return url.pathname.startsWith('/__/');
  return true;
}

// File yang tanpanya aplikasi tidak bisa jalan offline: kalau salah satunya gagal di-precache, install dibatalkan.
const CRITICAL_RE = /^\.\/$|index\.html|js\/app\.js|css\/styles\.css|vendor\/(firebase-|crypto-js)/;

// Browser menolak respons "redirected" dipakai untuk navigasi -> salin jadi respons biasa sebelum disimpan.
async function bersihkanRedirect(res) {
  if (!res.redirected) return res;
  return new Response(await res.clone().blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

// Halaman login Wi-Fi sering membalas 200 + HTML untuk URL apa pun. Untuk file non-HTML itu pasti salah.
function isiCocok(url, res) {
  if (!/\.(js|css|json|png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.split('?')[0])) return true;
  return !(res.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

const timeoutAfter = ms => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

// ============================================================
// INSTALL: precache app shell (per-file, tahan gagal sebagian)
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async cache => {
      const gagalKritis = [];
      for (let i = 0; i < PRECACHE_URLS.length; i += 8) {
        await Promise.all(
          PRECACHE_URLS.slice(i, i + 8).map(async url => {
            try {
              const res = await fetch(url, { cache: 'no-cache' });
              if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
              if (!isiCocok(url, res)) throw new Error('isi HTML tidak sesuai untuk file ini');
              await cache.put(url, await bersihkanRedirect(res));
            } catch (e) {
              console.warn('[SW] Gagal precache:', url, e);
              if (CRITICAL_RE.test(url)) gagalKritis.push(url);
            }
          })
        );
      }
      if (gagalKritis.length) throw new Error('[SW] Precache file inti gagal: ' + gagalKritis.join(', '));
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

  // Navigasi -> Network-First dengan batas waktu. HANYA untuk halaman app (/ atau /index.html):
  // halaman lain (mis. buku-tamu.html publik) dibiarkan ke network, supaya tidak menimpa cache index.html
  // dan tidak dibalas dengan index.html saat jaringan lambat.
  if (req.mode === 'navigate') {
    if (isSameOrigin(url) && isAppShellPath(url)) event.respondWith(networkFirstNavigate(req, event));
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
    if (valid(res)) cache.put('./index.html', res.clone()).catch(() => {});
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
      if (res && res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
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
  // js/versi-app.js menanyakan nomor versi Service Worker ini (aktif maupun yang sedang menunggu) lewat MessageChannel.
  if (event.data && event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ type: 'VERSION', version: APP_VERSION });
  }
});
