// ============================================================
// TOMBOL KEMBALI -- js/tombol-kembali.js  (dimuat SESUDAH app.js dan js/dokumen-kepala.js)
// app.js tidak mengatur riwayat browser, sehingga tombol/gestur Kembali di HP langsung keluar dari aplikasi.
// Berkas ini memasang satu entri riwayat "penjaga" dan menangani tiap tekanan Kembali dengan urutan:
//   1) keyboard terbuka        -> tutup keyboard
//   2) layar login (isian)     -> kembali ke pilihan peran
//   3) sidebar / modal terbuka -> tutup
//   4) bukan Dashboard         -> halaman sebelumnya (atau Dashboard)
//   5) Dashboard / layar awal  -> kotak konfirmasi "Keluar dari aplikasi?" (Kembali sekali lagi = tetap di sini)
// Tidak mengubah app.js. Halaman yang dikunjungi dibaca dari kelas .page-content (tidak membungkus navigateTo).
// Entri penjaga baru dipasang sesudah sentuhan pertama, karena Chrome melewati entri riwayat yang dibuat tanpa interaksi pengguna.
// ============================================================
(function () {
  'use strict';
  if (window.SimambaKembali) return;

  var MAKS = 30, OPEN = '.modal-overlay.show, .v4-modal-backdrop.show';
  var armed = false, riw = [], cur = 'dashboard', dialog = null;
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
    if (layarLogin()) { riw = []; cur = 'dashboard'; return; }   // logout/login baru: mulai dari awal
    var p = halamanSekarang(); if (!p || p === cur) return;
    riw.push(cur); if (riw.length > MAKS) riw.shift();
    cur = p;
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
  function info(msg) { try { if (typeof toast === 'function') toast(msg, false, 4000); } catch (e) {} }
  // Kotak konfirmasi keluar. Kembali saat kotak terbuka = menutupnya (tetap di aplikasi).
  function tutupDialog() { if (dialog) { try { dialog.remove(); } catch (e) {} dialog = null; } }
  function keluar() {
    tutupDialog(); armed = false;
    try { if (history.length > 2) { history.go(-2); return; } } catch (e) {}   // ada halaman sebelum aplikasi: kembali ke sana (melewati entri base dan guard)
    try { window.close(); } catch (e2) {}
    try { history.back(); } catch (e3) {}
    info('Tekan tombol Kembali sistem sekali lagi untuk menutup aplikasi.');   // aplikasi terpasang (PWA) tidak bisa menutup diri lewat kode
  }
  function tampilDialog() {
    if (dialog) return;
    var gelap = !!(document.body && document.body.classList && document.body.classList.contains('dark-mode'));
    var o = document.createElement('div');
    o.setAttribute('style', 'position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;');
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div style="max-width:340px;width:100%;border-radius:14px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.3);background:' + (gelap ? '#1e293b' : '#fff') + ';color:' + (gelap ? '#e5e7eb' : '#1f2937') + ';">' +
      '<div style="font-size:16px;font-weight:700;margin-bottom:6px;">Keluar dari aplikasi?</div>' +
      '<div style="font-size:13px;opacity:.8;margin-bottom:14px;">Isian yang belum disimpan akan hilang.</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;"><button type="button" class="btn btn-soft" data-k="tetap">Tetap di sini</button><button type="button" class="btn btn-primary" data-k="keluar">Keluar</button></div></div>';
    o.querySelector('[data-k="tetap"]').onclick = tutupDialog;
    o.querySelector('[data-k="keluar"]').onclick = keluar;
    o.addEventListener('mousedown', function (ev) { if (ev.target === o) tutupDialog(); });
    document.body.appendChild(o); dialog = o;
    try { o.querySelector('[data-k="tetap"]').focus(); } catch (e) {}
  }

  // Dipanggil setiap tombol Kembali ditekan dan browser mendarat di entri "base" (entri penjaga terlepas).
  window.addEventListener('popstate', function (ev) {
    if (!armed) return;
    var st = history.state || {};
    if (st.sm !== 'base') return;
    ev.stopImmediatePropagation();
    if (dialog) { tutupDialog(); pasangGuard(); return; }                     // Kembali saat kotak keluar terbuka = tetap di aplikasi
    var a = document.activeElement, tujuan;
    if (medanKetik(a)) { var kb = keyboardTampak(); try { a.blur(); } catch (e) {} if (kb) { pasangGuard(); return; } }
    if (tampil(el('loginPage')) && typeof window.kembaliKeChooser === 'function') { pasangGuard(); window.kembaliKeChooser(); return; }
    if (tutupSidebar() || tutupOverlay()) { pasangGuard(); return; }
    if (!layarLogin()) {
      tujuan = riw.length ? riw.pop() : (cur !== 'dashboard' ? 'dashboard' : null);
      if (tujuan) { pasangGuard(); cur = tujuan; try { window.navigateTo(tujuan); } catch (e2) {} return; }
    }
    pasangGuard(); tampilDialog();                                           // titik keluar: minta konfirmasi
  }, true);

  function mulai() {
    cur = halamanSekarang() || 'dashboard';
    try { var mo = new MutationObserver(catat); Array.prototype.forEach.call(document.querySelectorAll('.page-content'), function (p) { mo.observe(p, { attributes: true, attributeFilter: ['class'] }); }); } catch (e) {}
    ukur(); window.addEventListener('resize', ukur);
    var awal = function () { arm(); if (armed) ['pointerup', 'click', 'keydown'].forEach(function (n) { document.removeEventListener(n, awal, true); }); };
    ['pointerup', 'click', 'keydown'].forEach(function (n) { document.addEventListener(n, awal, true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && dialog) tutupDialog(); });
  window.SimambaKembali = { keyboardTampak: keyboardTampak };
})();
