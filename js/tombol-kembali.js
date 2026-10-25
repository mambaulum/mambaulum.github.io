/* ============================================================
   SI MAMBA - js/tombol-kembali.js (v2)
   Menyambungkan tombol KEMBALI (Android / gesek tepi iOS / tombol Back browser) ke navigasi aplikasi (PWA):
     1. Ada modal / menu samping terbuka  -> kembali = menutupnya (tetap di halaman yang sama).
     2. Ada riwayat halaman              -> kembali = ke halaman sebelumnya di dalam aplikasi.
     3. Sudah di Dashboard               -> kembali pertama menampilkan "Tekan sekali lagi untuk keluar";
                                            kembali kedua (dalam 2 detik) benar-benar keluar.
   Tidak mengubah URL (tanpa #hash), tidak menyentuh data. Dimuat PALING AKHIR (membungkus navigateTo).
============================================================ */
(function () {
  'use strict';
  var HOME = 'dashboard';
  var OPEN_SEL = '.modal-overlay.show, .v4-modal-backdrop.show, .mp-fm.mp-show, .mp-modal.show, .mp-more-panel.show';
  var MODALS = {   // id overlay -> fungsi penutup (sama dengan yang dipakai tombol Esc di app.js)
    editGuruModal: 'closeEditGuruModal', editSiswaModal: 'closeEditSiswaModal', gantiPinModal: 'closeGantiPinModal',
    resetPinModal: 'closeResetPinModal', ekskulModal: 'closeEkskulModal', v4RoleModal: 'v4CloseRoleChooser'
  };
  var inited = false, cur = null, fromPop = false, exitArmed = false, exitTimer = null;

  function notif(msg) { try { if (typeof window.toast === 'function') window.toast(msg, false, 2000); } catch (e) {} }
  function terlihat(el) { return !!(el && (el.offsetParent !== null || getComputedStyle(el).position === 'fixed')); }

  function overlayTerbuka() {
    var all = document.querySelectorAll(OPEN_SEL);
    for (var i = all.length - 1; i >= 0; i--) if (terlihat(all[i])) return all[i];
    return null;
  }
  function masihTerbuka(ov) { return terlihat(ov) && ov.matches(OPEN_SEL); }
  function tutupOverlay(ov) {
    try {
      // 1) Tombol Esc: semua modal menu-polish.js (form-modal, konfirmasi, menu "titik tiga") & modal app.js punya penangan Esc
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      if (!masihTerbuka(ov)) return true;
      // 2) Fungsi penutup modal bawaan app.js
      var fn = window[MODALS[ov.id]];
      if (typeof fn === 'function') { fn(); if (!masihTerbuka(ov)) return true; }
      // 3) Cari tombol ✕ / Tutup / Batal di dalam modal
      var btns = ov.querySelectorAll('button, [role="button"], a');
      for (var i = 0; i < btns.length; i++) {
        var t = (btns[i].textContent || '').trim().toLowerCase(), a = (btns[i].getAttribute('aria-label') || '').toLowerCase();
        if (t === '✕' || t === '×' || t === 'x' || t === 'tutup' || t === 'batal' || a.indexOf('tutup') === 0 || a.indexOf('close') === 0) { btns[i].click(); break; }
      }
    } catch (e) { console.error('[SI MAMBA] tombol-kembali:', e); }
    return !masihTerbuka(ov);
  }
  function tutupSidebar() {
    var sb = document.getElementById('sidebar'), ol = document.getElementById('sidebarOverlay');
    if (window.innerWidth <= 768 && sb && sb.classList.contains('open')) {
      sb.classList.remove('open'); if (ol) ol.classList.remove('show'); return true;
    }
    return false;
  }
  function dorong(page) { try { history.pushState({ sm: 'app', page: page }, ''); } catch (e) {} }

  function mulai(page) {
    inited = true; cur = page;
    try {
      var s = history.state;
      if (s && s.sm) { history.replaceState({ sm: 'app', page: page }, ''); }       // halaman dimuat ulang: pertahankan tumpukan
      else { history.replaceState({ sm: 'base' }, ''); dorong(page); }
    } catch (e) {}
  }

  var asli = window.navigateTo;
  if (typeof asli !== 'function' || asli.__tombolKembali) return;
  var baru = function (page) {
    var r = asli.apply(this, arguments);
    try {
      if (fromPop) { cur = page; }
      else if (!inited) { mulai(page); }
      else if (page !== cur) { cur = page; dorong(page); }
    } catch (e) { console.error('[SI MAMBA] tombol-kembali:', e); }
    return r;
  };
  baru.__tombolKembali = true;
  window.navigateTo = baru;

  window.addEventListener('popstate', function (e) {
    if (!inited) return;
    var s = e.state;
    // 1) Modal / menu samping terbuka -> tutup saja, tetap di halaman ini
    var ov = overlayTerbuka();
    if (ov && tutupOverlay(ov)) { dorong(cur); return; }
    if (tutupSidebar()) { dorong(cur); return; }
    // 2) Ke halaman sebelumnya di dalam aplikasi
    if (s && s.sm === 'app' && s.page) {
      if (s.page !== cur) { fromPop = true; try { window.navigateTo(s.page); } finally { fromPop = false; } }
      return;
    }
    // 3) Dasar tumpukan (di luar Dashboard): pulang ke Dashboard dulu
    if (cur !== HOME) {
      fromPop = true; try { window.navigateTo(HOME); } finally { fromPop = false; }
      dorong(HOME); return;
    }
    // 4) Sudah di Dashboard: minta konfirmasi sebelum keluar
    if (exitArmed) { clearTimeout(exitTimer); exitArmed = false; try { history.back(); } catch (x) {} return; }
    exitArmed = true; notif('Tekan kembali sekali lagi untuk keluar');
    clearTimeout(exitTimer); exitTimer = setTimeout(function () { exitArmed = false; }, 2000);
    dorong(HOME);
  });
  window.SIMambaTombolKembali = { halamanSaatIni: function () { return cur; } };
})();
