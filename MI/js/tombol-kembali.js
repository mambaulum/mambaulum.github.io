// ============================================================
// TOMBOL KEMBALI -- js/tombol-kembali.js  (dimuat SESUDAH app.js dan js/dokumen-kepala.js)
// app.js tidak mengatur riwayat browser, sehingga tombol/gestur Kembali di HP langsung keluar dari aplikasi.
// Berkas ini memasang satu entri riwayat "penjaga" dan menangani tiap tekanan Kembali dengan urutan:
//   1) keyboard terbuka        -> tutup keyboard
//   2) layar login (isian)     -> kembali ke pilihan peran
//   3) sidebar / modal terbuka -> tutup
//   4) bukan Dashboard         -> halaman sebelumnya (atau Dashboard)
//   (sebelum 3-4: bila ada isian yang diketik tapi belum disimpan, tampil konfirmasi "Tinggalkan halaman ini?")
//   5) Dashboard / layar awal  -> pesan "Tekan Kembali sekali lagi untuk keluar"; tekanan kedua (2,5 detik) keluar secara native
// Tidak mengubah app.js. Halaman yang dikunjungi dibaca dari kelas .page-content (tidak membungkus navigateTo).
// Entri penjaga baru dipasang sesudah sentuhan pertama, karena Chrome melewati entri riwayat yang dibuat tanpa interaksi pengguna.
// ============================================================
(function () {
  'use strict';
  if (window.SimambaKembali) return;

  var MAKS = 30, OPEN = '.modal-overlay.show, .v4-modal-backdrop.show';
  var armed = false, riw = [], cur = 'dashboard', kotor = false;
  var lebarDasar = 0, tinggiDasar = 0;

  function el(id) { return document.getElementById(id); }
  function tampil(e) {
    if (!e) return false;
    try { var cs = window.getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden'; } catch (x) { return false; }
  }
  function layarLogin() { return tampil(el('loginChooser')) || tampil(el('loginPage')); }

  // ---------- halaman yang sedang tampil ----------
  function halamanSekarang() { var p = document.querySelector('.page-content:not(.hidden)'); return p && p.id ? String(p.id).replace(/^page-/, '') : null; }
  function catat() {
    if (layarLogin()) { riw = []; cur = 'dashboard'; kotor = false; return; }   // logout/login baru: mulai dari awal
    var p = halamanSekarang(); if (!p || p === cur) return;
    riw.push(cur); if (riw.length > MAKS) riw.shift();
    cur = p; kotor = false;
  }

  // ---------- keyboard ----------
  function ukur() {
    var w = window.innerWidth; if (w !== lebarDasar) { lebarDasar = w; tinggiDasar = 0; }
    tinggiDasar = Math.max(tinggiDasar, window.innerHeight);
  }
  function keyboardTampak() {
    var v = window.visualViewport, ih = window.innerHeight;
    if (v && v.height < ih * 0.85) return true;       // Chrome baru: hanya viewport visual yang menyusut
    return ih < tinggiDasar * 0.85;                    // Chrome lama / mode resize-content
  }
  function medanKetik(a) {
    if (!a || !a.tagName) return false;
    if (a.tagName === 'TEXTAREA') return true;
    if (a.tagName === 'INPUT') return !/^(checkbox|radio|button|submit|range|file|color|image|reset)$/i.test(a.type || 'text');
    return !!a.isContentEditable;
  }

  // ---------- tutup sidebar / modal ----------
  function tutupSidebar() {
    var sb = el('sidebar'); if (!sb || !sb.classList.contains('open')) return false;
    if (typeof window.toggleSidebar === 'function') window.toggleSidebar();
    else { sb.classList.remove('open'); var ov = el('sidebarOverlay'); if (ov) ov.classList.remove('show'); }
    return true;
  }
  function tutupOverlay() {
    var o = document.querySelector(OPEN); if (!o) return false;
    try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); } catch (e) {}   // sama dengan tombol Esc milik app.js
    if (document.querySelector(OPEN)) {      // modal yang tidak terdaftar di penangan Esc: cari tombol tutupnya
      var b = o.querySelector('[data-tutup],.modal-close,[onclick*="close" i]');
      if (!b) Array.prototype.some.call(o.querySelectorAll('button'), function (x) { if (/^\s*(batal|tutup|×|✕|x)\s*$/i.test(x.textContent || '')) { b = x; return true; } return false; });
      if (b) try { b.click(); } catch (e2) {}
    }
    return true;
  }

  // ---------- riwayat ----------
  function pasangGuard() { try { history.pushState({ sm: 'guard' }, ''); } catch (e) {} }
  function arm() {
    if (armed) return;
    try {
      var ua = navigator.userActivation; if (ua && !ua.isActive && !ua.hasBeenActive) return;   // tunggu sentuhan sungguhan
      var s = history.state || {};
      if (s.sm === 'guard') { armed = true; return; }                  // halaman dimuat ulang saat berada di entri penjaga
      if (s.sm === 'base') { history.pushState({ sm: 'guard' }, ''); armed = true; return; }
      history.replaceState({ sm: 'base', asal: s }, '');
      history.pushState({ sm: 'guard' }, '');
      armed = true;
    } catch (e) {}
  }
  function info(msg) { try { if (typeof toast === 'function') toast(msg, false, 2500); } catch (e) {} }
  // Keluar dengan pola "tekan Kembali dua kali". Aplikasi terpasang (PWA) tidak bisa menutup diri lewat kode, jadi:
  // Kembali pertama di Dashboard -> pesan + penjaga TIDAK dipasang ulang (browser sudah di entri awal);
  // Kembali kedua (dalam 2,5 detik) -> keluar secara native. Bila tidak ada tekanan kedua, penjaga dipasang lagi.
  var keluarSiap = false, timerKeluar = null;
  function mintaKeluar() {
    keluarSiap = true;
    info('Tekan Kembali sekali lagi untuk keluar');
    clearTimeout(timerKeluar);
    timerKeluar = setTimeout(function () { keluarSiap = false; if ((history.state || {}).sm === 'base') pasangGuard(); }, 2500);
  }

  // Dipanggil setiap tombol Kembali ditekan dan browser mendarat di entri "base" (entri penjaga terlepas).
  window.addEventListener('popstate', function (ev) {
    if (!armed) return;
    var st = history.state || {};
    if (st.sm !== 'base') return;
    ev.stopImmediatePropagation();
    var a = document.activeElement, tujuan;
    if (medanKetik(a)) { var kb = keyboardTampak(); try { a.blur(); } catch (e) {} if (kb) { pasangGuard(); return; } }
    if (tampil(el('loginPage')) && typeof window.kembaliKeChooser === 'function') { pasangGuard(); window.kembaliKeChooser(); return; }
    if (tutupSidebar()) { pasangGuard(); return; }
    // Ada isian yang diketik tetapi belum disimpan dan Kembali akan meninggalkan halaman/jendela: minta konfirmasi.
    var akanPindah = !!document.querySelector(OPEN) || (!layarLogin() && (riw.length > 0 || cur !== 'dashboard'));
    if (kotor && akanPindah) { var lanjut = true; try { lanjut = window.confirm('Ada isian yang belum disimpan. Tinggalkan halaman ini?'); } catch (e3) {} if (!lanjut) { pasangGuard(); return; } }
    kotor = false;
    if (tutupOverlay()) { pasangGuard(); return; }
    if (!layarLogin()) {
      tujuan = riw.length ? riw.pop() : (cur !== 'dashboard' ? 'dashboard' : null);
      if (tujuan) { pasangGuard(); cur = tujuan; try { window.navigateTo(tujuan); } catch (e2) {} return; }
    }
    mintaKeluar();                                                           // titik keluar: tekan Kembali sekali lagi
  }, true);

  // ---------- isian belum disimpan ----------
  // Dianggap "kotor" bila pengguna mengetik di kolom teks (bukan kolom cari/filter) di dalam halaman atau jendela. Dibersihkan saat pindah
  // halaman atau menekan tombol bertuliskan simpan/kirim/tambah/batal dst. Hanya dipakai untuk tombol Kembali, bukan menu samping.
  var ABAI = /cari|search|filter|saring|kata.?kunci/i, TOMBOL = /simpan|kirim|tambah|catat|submit|terapkan|unggah|impor|selesai|setuju|hapus|batal|tutup/i;
  document.addEventListener('input', function (ev) {
    var t = ev.target; if (!t || !t.tagName || layarLogin() || t.readOnly || t.type === 'search') return;
    if (t.tagName !== 'TEXTAREA' && !(t.tagName === 'INPUT' && /^(text|number|tel|email|url|date|time|datetime-local|month|password)$/i.test(t.type || 'text'))) return;
    if (ABAI.test((t.id || '') + ' ' + (t.name || '') + ' ' + (t.placeholder || '') + ' ' + (t.getAttribute('aria-label') || ''))) return;
    if (!(t.closest && t.closest('.page-content, ' + OPEN))) return;
    kotor = true;
  }, true);
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('button, .btn, [role="button"]');
    if (b && TOMBOL.test(b.textContent || '')) kotor = false;
  }, true);

  function mulai() {
    cur = halamanSekarang() || 'dashboard';
    try { var mo = new MutationObserver(catat); Array.prototype.forEach.call(document.querySelectorAll('.page-content'), function (p) { mo.observe(p, { attributes: true, attributeFilter: ['class'] }); }); } catch (e) {}
    ukur(); window.addEventListener('resize', ukur);
    var awal = function () { arm(); if (armed) ['pointerup', 'click', 'keydown'].forEach(function (n) { document.removeEventListener(n, awal, true); }); };
    ['pointerup', 'click', 'keydown'].forEach(function (n) { document.addEventListener(n, awal, true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();

  document.addEventListener('pointerup', function () { if (armed && !keluarSiap && (history.state || {}).sm === 'base') pasangGuard(); }, true);   // penjaga hilang (mis. setelah halaman dipulihkan): pasang lagi
  window.SimambaKembali = { keyboardTampak: keyboardTampak };
})();
