// ============================================================
// MODE WALI MURID (PWA khusus orang tua)
// Aktif bila halaman dibuka lewat  https://<domain>/?app=ortu  (start_url manifest-ortu.json).
// Penanda mode dipasang lebih awal oleh skrip kecil di <head> index.html (window.SIMAMBA_MODE_ORTU + kelas
// html.mode-ortu). Tampilan SAMA dengan aplikasi guru (beranda pilihan login -> form); yang beda hanya pilihan loginnya:
// tombol "Guru / Staff" (data-login="guru") & form login staf disembunyikan lewat CSS di index.html. Aplikasi selalu
// dibuka di beranda dengan satu pilihan: Orang Tua. Bila perangkat menyimpan login wali ("Ingat saya"), ketuk pilihan itu
// -> form masuk otomatis.
// Di luar mode ini (web biasa) file ini hanya menambah tautan "Pasang aplikasi Wali Murid" di form portal.
// Juga: kartu "Bagikan tautan Wali Murid" (halaman Info ke Ortu, untuk Admin/wali kelas), petunjuk "buka di Chrome"
// bila halaman terbuka di dalam WhatsApp/aplikasi lain, dan panel diagnosa pemasangan (/?app=ortu&cek=1).
// Gaya (CSS) file ini disuntikkan sendiri oleh pasangCss(); pemicu klik memakai atribut data-* + addEventListener.
// CATATAN: ini penyederhanaan tampilan, bukan pengamanan -- login staf tetap dilindungi PIN & Rules Firebase.
// ============================================================
(function () {
  'use strict';
  var ORTU = !!window.SIMAMBA_MODE_ORTU;
  var terpasang = false;      // true setelah aplikasi benar-benar terpasang (appinstalled / pemasangan diterima)
  var tmr = null;             // interval cek berkala (dihentikan setelah 10 kali / saat terpasang)
  var pengamatPanel = [];     // MutationObserver untuk panel login (dilepas saat terpasang)
  var terjadwal = false;

  function el(id) { return document.getElementById(id); }
  function standalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  var UA = navigator.userAgent || '';
  var iOS = /iphone|ipad|ipod/i.test(UA) && !window.MSStream;
  // Browser di dalam aplikasi lain (WhatsApp/Facebook/Instagram/Line): tidak bisa memasang PWA. Android WebView ditandai "; wv)",
  // WebView iOS tidak punya token "Safari/". Tautan yang dikirim lewat WhatsApp sering terbuka di sini.
  var dalamAplikasi = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|; wv\)|WhatsApp/i.test(UA) || (iOS && !/Safari\//.test(UA));
  var iOSBukanSafari = iOS && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(UA);

  // ---- Gaya: disuntikkan sekali (class CSS, bukan atribut style) ----
  var CSS = '' +
    '.po-pasang{margin-top:14px;padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:12px;color:#065f46;text-align:center;}' +
    '.po-pasang-tombol{width:100%;font-size:13px;}' +
    '.po-pasang-manual{margin-top:8px;font-size:11px;color:#047857;}' +
    '.po-peringatan{margin-bottom:8px;padding:8px;border-radius:8px;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-size:12px;}' +
    '.po-saran{margin-bottom:8px;font-size:11px;color:#92400e;}' +
    '.po-tautan{color:#047857;font-weight:700;}' +
    '.po-kecil{font-size:11px;}' +
    '.po-salin-tersembunyi{position:fixed;opacity:0;}' +
    '.ortu-bagikan{margin-bottom:12px;}' +
    '.ortu-bagikan-judul{font-size:16px;font-weight:700;margin-bottom:4px;}' +
    '.ortu-bagikan-ket{font-size:13px;color:#6b7280;margin-bottom:10px;}' +
    '.ortu-bagikan-tautan{font-size:12px;word-break:break-all;background:#f3f4f6;border-radius:8px;padding:8px 10px;margin-bottom:10px;color:#374151;}' +
    '.ortu-bagikan-aksi{display:flex;gap:8px;flex-wrap:wrap;}' +
    '.dg-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;background:#fff;color:#111;overflow:auto;padding:14px;font:12px/1.5 monospace;white-space:pre-wrap;word-break:break-all;}' +
    '.dg-judul{font:700 14px sans-serif;margin-bottom:6px;}' +
    '.dg-aksi{margin-top:12px;display:flex;gap:8px;}' +
    '.dg-aksi button{padding:8px 12px;}';
  function pasangCss() {
    if (el('poStyle')) return;
    var s = document.createElement('style'); s.id = 'poStyle'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  // ---- Petunjuk browser ----
  function petunjukBrowser() {
    if (dalamAplikasi) {
      return '<div class="po-peringatan">⚠️ Halaman ini terbuka di dalam aplikasi lain (mis. WhatsApp), jadi belum bisa dipasang. ' +
        (iOS ? 'Ketuk ikon <strong>Safari</strong>/menu Bagikan lalu pilih <em>Buka di Safari</em>.' : 'Ketuk <strong>⋮</strong> di pojok atas lalu pilih <em>Buka di Chrome</em> (atau <em>Buka di browser</em>).') + '</div>';
    }
    if (iOSBukanSafari) return '<div class="po-saran">💡 Di iPhone, buka lewat <strong>Safari</strong> agar bisa dipasang.</div>';
    if (!iOS && !/Chrome\//.test(UA)) return '<div class="po-saran">💡 Gunakan <strong>Chrome</strong> agar bisa dipasang.</div>';
    return '';
  }
  // Tombol hanya ditampilkan bila Chrome sudah memberi sinyal pemasangan DAN installApp() (app.js) tersedia.
  function adaPrompt() { return !!window.__simambaBIP || (typeof deferredPrompt !== 'undefined' && !!deferredPrompt); }
  function bisaPasang() { return adaPrompt() && typeof window.installApp === 'function'; }
  function manualHtml() {
    return iOS
      ? '📲 <strong>Pasang di iPhone/iPad:</strong> buka lewat Safari, ketuk tombol Bagikan (⬆️), lalu pilih <em>Tambahkan ke Layar Utama</em>.'
      : '📲 <strong>Pasang di HP:</strong> ketuk menu ⋮ pada browser, lalu pilih <em>Instal aplikasi</em> atau <em>Tambahkan ke layar utama</em>.';
  }

  // ---- Mode wali: beranda sama seperti guru; tombol pilihan Orang Tua jadi tombol utama ----
  function rapikanBeranda() {
    if (!ORTU) return;
    var b = document.querySelector('#loginChooser [data-login="ortu"]');
    if (b && b.classList.contains('btn-soft')) { b.classList.remove('btn-soft'); b.classList.add('btn-primary'); }
  }

  // ---- Kotak "Pasang aplikasi": di form masuk Portal Orang Tua, dan (mode wali) di beranda pilihan login ----
  function buatKotak(selKartu, id, sebelumTerakhir) {
    var kartu = document.querySelector(selKartu);
    if (!kartu || kartu.querySelector('.po-pasang')) return;
    var box = document.createElement('div');
    box.className = 'po-pasang'; if (id) box.id = id;
    if (sebelumTerakhir && kartu.lastElementChild) kartu.insertBefore(box, kartu.lastElementChild); else kartu.appendChild(box);
  }
  function hapusKotak() {
    var k = document.querySelectorAll('.po-pasang');
    for (var i = 0; i < k.length; i++) k[i].remove();
  }
  function kotakPasang() {
    if (window.__simambaTerpasang && !terpasang) tandaiTerpasang();
    if (terpasang || standalone()) return;
    buatKotak('#portalOrtuLogin .auth-card', 'poPasangBox', true);
    if (ORTU) buatKotak('#loginChooser .auth-card', null, false);
    isiKotak();
  }
  function isiKotak() {
    if (terpasang) return;
    var kotak = document.querySelectorAll('.po-pasang'); if (!kotak.length) return;
    var isi, tombol = ORTU && bisaPasang();
    if (!ORTU) {
      isi = '📲 <a class="po-tautan" href="?app=ortu">Pasang aplikasi khusus Wali Murid</a><br><span class="po-kecil">Satu ketukan dari layar utama, tanpa menu guru.</span>';
    } else if (tombol) {
      // Tombol + instruksi manual di bawahnya (cadangan bila dialog pemasangan tidak muncul).
      isi = '<button type="button" class="btn btn-primary po-pasang-tombol" data-po-aksi="pasang">📲 Pasang Aplikasi di HP</button>' +
        '<div class="po-pasang-manual">Tombol tidak berfungsi? Ketuk menu <strong>⋮</strong>, lalu pilih <em>Instal aplikasi</em> atau <em>Tambahkan ke layar utama</em>' +
        ' (iPhone: Bagikan lalu <em>Tambahkan ke Layar Utama</em>).</div>';
    } else {
      isi = manualHtml();
    }
    var html = (tombol ? '' : petunjukBrowser()) + isi;
    for (var i = 0; i < kotak.length; i++) {
      if (kotak[i].__html !== html) { kotak[i].__html = html; kotak[i].innerHTML = html; }   // jangan gambar ulang bila sama
    }
  }
  function tandaiTerpasang() {
    terpasang = true;
    hentikanCek();
    for (var i = 0; i < pengamatPanel.length; i++) pengamatPanel[i].disconnect();
    pengamatPanel = [];
    hapusKotak();
  }
  function hentikanCek() { if (tmr) { clearInterval(tmr); tmr = null; } }

  // Panggil ulang secara ringan (digabung per frame) saat panel login berubah/ditampilkan.
  function jadwalkan() {
    if (terpasang || terjadwal) return;
    terjadwal = true;
    var jalan = function () { terjadwal = false; kotakPasang(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(jalan); else setTimeout(jalan, 0);
  }
  function dalamKotak(n) {
    var e = n && n.nodeType === 1 ? n : (n ? n.parentNode : null);
    return !!(e && e.closest && e.closest('.po-pasang'));
  }
  function pantau() {
    if (!window.MutationObserver) return;
    ['portalOrtuLogin', 'loginChooser'].forEach(function (id) {
      var n = el(id); if (!n) return;
      var o = new MutationObserver(function (recs) {
        for (var i = 0; i < recs.length; i++) { if (!dalamKotak(recs[i].target)) { jadwalkan(); break; } }   // abaikan perubahan akibat kotak sendiri
      });
      o.observe(n, { attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true });
      pengamatPanel.push(o);
    });
    // Halaman "Info ke Ortu" dibuka (class "hidden" dilepas) -> segarkan tautan.
    var info = el('page-info-ortu');
    if (info) {
      new MutationObserver(function () { if (!info.classList.contains('hidden')) window.ortuTautanTampil(); })
        .observe(info, { attributes: true, attributeFilter: ['class'] });
    }
  }

  window.addEventListener('beforeinstallprompt', jadwalkan);
  window.addEventListener('appinstalled', tandaiTerpasang);

  // ---- Bagikan tautan aplikasi Wali Murid (kartu di halaman "Info ke Ortu") ----
  // Folder aplikasi dari pathname, sehingga benar juga bila situs ada di subpath (/app/index.html, /app, /app/).
  function folderAplikasi() {
    var p = location.pathname || '/';
    if (p.charAt(p.length - 1) !== '/') {
      var seg = p.substring(p.lastIndexOf('/') + 1);
      p = seg.indexOf('.') >= 0 ? p.substring(0, p.lastIndexOf('/') + 1) : p + '/';
    }
    return p;
  }
  function tautanOrtu() { return location.protocol + '//' + location.host + folderAplikasi() + '?app=ortu'; }
  function pesanTautanOrtu() {
    var nama = '';
    try { nama = (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) || ''; } catch (e) {}
    return 'Assalamu\'alaikum Bapak/Ibu Wali Murid' + (nama ? ' ' + nama : '') + '.\n\n' +
      'Kini ada aplikasi *SI MAMBA Wali Murid* untuk memantau kehadiran, nilai, tugas, dan infaq ananda.\n\n' +
      'Cara memasang:\n' +
      '1. Salin tautan di bawah, lalu buka di *Chrome* (iPhone: *Safari*). Jangan dibuka langsung dari dalam WhatsApp. Atau ketuk ⋮ lalu pilih _Buka di Chrome_.\n' +
      '2. Ketuk tombol *Pasang Aplikasi di HP*. Jika tidak ada: menu ⋮ lalu _Instal aplikasi_ (iPhone: Bagikan lalu _Tambahkan ke Layar Utama_).\n' +
      '3. Masuk memakai nomor WhatsApp yang terdaftar di madrasah. Belum punya PIN? Ketuk _Masuk pertama kali (tanpa PIN)_.\n\n' +
      tautanOrtu() + '\n\nJazakumullahu khairan.';
  }
  window.ortuTautanTampil = function () { var e = el('ortuTautanTeks'); if (e) e.textContent = tautanOrtu(); };
  function bagikanWA() {
    // Tanpa nomor: WhatsApp membuka pilihan kontak/grup (mis. grup wali murid satu kelas).
    window.open('https://wa.me/?text=' + encodeURIComponent(pesanTautanOrtu()), '_blank');
  }
  function salin(pesanLengkap) {
    var teks = pesanLengkap ? pesanTautanOrtu() : tautanOrtu();
    function ok() { if (typeof toast === 'function') toast(pesanLengkap ? '📋 Pesan disalin' : '📋 Tautan disalin'); }
    function cadangan() {
      var t = document.createElement('textarea'); t.value = teks; t.className = 'po-salin-tersembunyi';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { if (typeof toast === 'function') toast('Gagal menyalin. Salin manual: ' + teks, true, 6000); }
      t.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(ok, cadangan); else cadangan();
  }

  // Satu pendengar klik (delegasi) untuk semua pemicu data-*: tombol Pasang & kartu Bagikan.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-po-aksi],[data-ortu-aksi]') : null;
    if (!t) return;
    var a = t.getAttribute('data-po-aksi');
    if (a === 'pasang') { if (typeof window.installApp === 'function') window.installApp(); return; }
    var b = t.getAttribute('data-ortu-aksi');
    if (b === 'wa') bagikanWA();
    else if (b === 'salin-tautan') salin(false);
    else if (b === 'salin-pesan') salin(true);
  });

  // ---- Panel diagnosa pemasangan: buka  /?app=ortu&cek=1  (untuk mencari tahu kenapa tombol Pasang tidak muncul) ----
  function diagnosa() {
    pasangCss();
    var box = document.createElement('div');
    box.className = 'dg-overlay';
    box.innerHTML = '<div class="dg-judul">🔎 Diagnosa Pemasangan Wali Murid</div><div class="dg-hasil"></div>' +
      '<div class="dg-aksi"><button type="button" data-dg="salin">📋 Salin hasil</button><button type="button" data-dg="tutup">Tutup</button></div>';
    document.body.appendChild(box);
    var out = box.querySelector('.dg-hasil'), teks = [];
    function baris(ok, s) { var t = (ok === true ? '✅ ' : ok === false ? '❌ ' : 'ℹ️ ') + s; teks.push(t); out.appendChild(document.createTextNode(t + '\n')); }
    box.querySelector('[data-dg="tutup"]').addEventListener('click', function () { box.remove(); });
    box.querySelector('[data-dg="salin"]').addEventListener('click', function () { try { navigator.clipboard.writeText(teks.join('\n')); } catch (e) {} });
    function ambilManifest(url, label) {
      return fetch(url, { cache: 'no-store' }).then(function (r) {
        baris(r.ok, label + ' → HTTP ' + r.status + ' (' + (r.headers.get('content-type') || '?') + ')');
        if (!r.ok) return null;
        return r.text().then(function (t) {
          try { var j = JSON.parse(t); baris(true, label + ': id=' + j.id + ' | start_url=' + j.start_url + ' | scope=' + j.scope + ' | display=' + j.display); return j; }
          catch (e) { baris(false, label + ' bukan JSON valid: ' + e.message); return null; }
        });
      }).catch(function (e) { baris(false, label + ' gagal diambil: ' + e.message); return null; });
    }
    baris(null, 'URL: ' + location.href);
    baris(null, 'Browser: ' + UA);
    baris(window.isSecureContext, 'Koneksi aman (HTTPS): ' + window.isSecureContext);
    baris(null, 'Mode Wali Murid: ' + ORTU + ' | standalone: ' + standalone());
    baris(window.__simambaBIP ? true : null, 'Event pemasangan (beforeinstallprompt) diterima: ' + (!!window.__simambaBIP));
    baris(typeof window.installApp === 'function', 'Fungsi installApp() tersedia: ' + (typeof window.installApp === 'function'));
    var link = document.querySelector('link[rel="manifest"]');
    baris(!!link, 'Tautan manifest di halaman: ' + (link ? link.href : '(tidak ada)'));
    var p = link ? ambilManifest(link.href, 'Manifest aktif') : Promise.resolve(null);
    p.then(function (mf) {
      var pend = [];
      if (mf && link) {
        (mf.icons || []).forEach(function (ic) {
          var u = new URL(ic.src, link.href).href;
          pend.push(new Promise(function (res) {
            var im = new Image();
            im.onload = function () { baris(im.naturalWidth >= 144, 'Ikon ' + ic.sizes + ' (' + (ic.purpose || 'any') + ') terbaca, ukuran asli ' + im.naturalWidth + 'x' + im.naturalHeight + ' → ' + u); res(); };
            im.onerror = function () { baris(false, 'Ikon ' + ic.sizes + ' TIDAK bisa dibuka → ' + u); res(); };
            im.src = u + (u.indexOf('?') < 0 ? '?cek=' + Date.now() : '');
          }));
        });
        var ada = function (n) { return (mf.icons || []).some(function (i) { return (i.sizes || '').indexOf(n + 'x' + n) >= 0; }); };
        baris(ada(192), 'Ada ikon 192x192 di manifest'); baris(ada(512), 'Ada ikon 512x512 di manifest');
      }
      return Promise.all(pend).then(function () { return ambilManifest(new URL('manifest.json', location.href).href, 'Manifest guru (pembanding)'); }).then(function (mg) {
        if (mf && mg) baris(mf.id !== mg.id, 'id Wali ≠ id Guru: ' + mf.id + '  vs  ' + mg.id + (mf.id === mg.id ? '  ← SAMA: Chrome menganggap sudah terpasang' : ''));
      });
    }).then(function () {
      if (!navigator.serviceWorker) { baris(false, 'Service worker tidak didukung'); return; }
      return navigator.serviceWorker.getRegistration().then(function (r) {
        baris(!!r, 'Service worker: ' + (r ? 'scope ' + r.scope + ', status ' + ((r.active && r.active.state) || '-') : 'belum terdaftar'));
        baris(!!navigator.serviceWorker.controller, 'Halaman dikendalikan service worker: ' + !!navigator.serviceWorker.controller);
      });
    }).then(function () {
      if (navigator.getInstalledRelatedApps) return navigator.getInstalledRelatedApps().then(function (a) { baris(null, 'Aplikasi terkait terpasang: ' + (a.length ? JSON.stringify(a) : 'tidak ada')); }, function () {});
    }).then(function () { baris(null, 'Selesai. Foto/screenshot halaman ini lalu kirim ke Claude.'); });
  }
  if (/[?&]cek=1\b/.test(location.search)) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', diagnosa); else diagnosa();
  }

  // ---- Mulai: saat DOM siap (dan sekali lagi saat load) ----
  function mulai() {
    pasangCss(); rapikanBeranda(); kotakPasang(); window.ortuTautanTampil(); pantau();
    // Cadangan: event kadang datang agak lambat setelah halaman siap; cek ulang beberapa detik pertama lalu berhenti.
    var cek = 0;
    if (!terpasang && !tmr) tmr = setInterval(function () { cek++; kotakPasang(); if (cek >= 10 || terpasang || standalone()) hentikanCek(); }, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.addEventListener('load', function () { rapikanBeranda(); kotakPasang(); window.ortuTautanTampil(); });
})();
