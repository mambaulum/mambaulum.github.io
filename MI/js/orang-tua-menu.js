/* ============================================================
   MENU "ORANG TUA" (sidebar, grup Siswa & Orang Tua)  -- v8.459
   Dulu: tab "Orang Tua" di dalam halaman Admin (harus gulir ke atas untuk menemukan tab,
   lalu ada kotak daftar yang bisa digulir di dalam halaman yang juga digulir).
   Sekarang: satu entri menu sendiri ("Akun & Login Ortu"), dengan tiga tab pendek yang menempel di bawah topbar:
       🔑 Akun & PIN   |   👪 Keaktifan & Versi   |   🕘 Riwayat
   Angka kecil pada tab: Akun = jumlah akun terkunci, Riwayat = login gagal hari ini. Tab terakhir diingat (localStorage).
   Cara kerja (sengaja tanpa memindah/menulis ulang kartu):
   - Kartu #ortuAkunCard & #riwayatLoginOrtuCard tetap berada di #page-admin, jadi pemuat data
     lama (js/ortu-akun-admin.js, js/riwayat-login-ortu.js, app.js) tidak berubah sama sekali.
   - Klik menu "Orang Tua" -> navigateTo('ortu-akun') dicegat -> membuka halaman 'admin'
     dengan mode khusus (class body.mode-ortu-akun): hanya panel Orang Tua yang tampil,
     tab hub "Admin | User & Permission | Ringkasan" dan tab Admin disembunyikan.
   - Hak akses mengikuti menu "Admin": item ini tampil hanya bila menu Admin tampil untuk peran itu.
   Dimuat PALING AKHIR (sesudah app.js, menu-hub.js, tombol-kembali.js, tab-halaman.js).
   Tanpa perubahan Firebase Rules.
============================================================ */
(function () {
  'use strict';

  var PAGE = 'ortu-akun';
  var TITLE = 'Akun & Login Orang Tua';
  var KUNCI_TAB = 'mamba_ortu_tab';
  var TAB_OK = ['akun', 'keaktifan', 'riwayat'];
  var tabAktif = 'akun';          // 'akun' | 'keaktifan' | 'riwayat'
  try { var tersimpan = localStorage.getItem(KUNCI_TAB); if (TAB_OK.indexOf(tersimpan) !== -1) tabAktif = tersimpan; } catch (e) { /* abaikan */ }
  var modeOn = false;

  function $(id) { return document.getElementById(id); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- CSS (disuntik, hanya berlaku saat body.mode-ortu-akun) ---------- */
  function injectCss() {
    if ($('ortuMenuCss')) return;
    var st = document.createElement('style');
    st.id = 'ortuMenuCss';
    st.textContent =
      '.ortu-sembunyi{display:none!important;}' +
      'body.mode-ortu-akun #hubTabs{display:none!important;}' +
      'body.mode-ortu-akun #adminTabs{display:none!important;}' +
      'body.mode-ortu-akun #adminCatatanUser{display:none!important;}' +
      /* tab Akun: kotak daftar mengisi layar -> hanya satu area gulir (tidak gulir di dalam gulir) */
      'body.mode-ortu-akun #ortuAkunList{max-height:calc(100vh - 320px)!important;min-height:220px;overflow-y:auto;}' +
      /* kartu Riwayat dipakai dua tab: Keaktifan & Versi (hanya blok #rloAktif/#rloVersi) dan Riwayat (sisanya) */
      'body.mode-ortu-akun #riwayatLoginOrtuCard.ortu-t-keaktifan > :not(#rloAktif):not(#rloVersi){display:none!important;}' +
      'body.mode-ortu-akun #riwayatLoginOrtuCard.ortu-t-riwayat > #rloAktif,body.mode-ortu-akun #riwayatLoginOrtuCard.ortu-t-riwayat > #rloVersi{display:none!important;}' +
      '#ortuTabs .ot-bdg{display:inline-block;min-width:18px;margin-left:6px;padding:1px 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;line-height:16px;text-align:center;}' +
      /* tab Riwayat: tanpa kotak gulir bersarang; halaman saja yang digulir */
      'body.mode-ortu-akun #rloList{max-height:none!important;overflow:visible!important;}' +
      /* tab menempel di bawah topbar; offset --kg-stick-top diisi skrip di akhir index.html (sama dengan tab Bacaan Sholat/KPI) */
      '#ortuTabs.hub-tabs.kg-top{position:sticky;top:var(--kg-stick-top,0px);z-index:5;margin:0 0 10px;box-shadow:0 2px 6px rgba(0,0,0,.12);}';
    document.head.appendChild(st);
  }

  /* ---------- tab kecil di dalam panel Orang Tua ---------- */
  function ensureTabs() {
    var pane = document.querySelector('#page-admin [data-apane="ortu"]');
    if (!pane) return null;
    var bar = $('ortuTabs');
    if (bar && pane.contains(bar)) return bar;
    bar = document.createElement('div');
    bar.id = 'ortuTabs';
    bar.className = 'hub-tabs show kg-top';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Bagian menu Orang Tua');
    bar.innerHTML =
      '<button type="button" role="tab" class="hub-tab" data-ot="akun">🔑 Akun &amp; PIN<span class="ot-bdg" data-ot-bdg="akun" hidden></span></button>' +
      '<button type="button" role="tab" class="hub-tab" data-ot="keaktifan">👪 Keaktifan &amp; Versi</button>' +
      '<button type="button" role="tab" class="hub-tab" data-ot="riwayat">🕘 Riwayat<span class="ot-bdg" data-ot-bdg="riwayat" hidden></span></button>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-ot]') : null;
      if (b) setTab(b.getAttribute('data-ot'));
    });
    pane.insertBefore(bar, pane.firstChild);
    return bar;
  }

  function setTab(t) {
    tabAktif = (TAB_OK.indexOf(t) !== -1) ? t : 'akun';
    try { localStorage.setItem(KUNCI_TAB, tabAktif); } catch (e) { /* abaikan */ }
    var a = $('ortuAkunCard'), r = $('riwayatLoginOrtuCard');
    // class pembantu (bukan style.display) supaya kendali tampil/hilang oleh riwayat-login-ortu.js tidak terganggu
    if (a) a.classList.toggle('ortu-sembunyi', tabAktif !== 'akun');
    if (r) {
      r.classList.toggle('ortu-sembunyi', tabAktif === 'akun');
      r.classList.toggle('ortu-t-keaktifan', tabAktif === 'keaktifan');
      r.classList.toggle('ortu-t-riwayat', tabAktif === 'riwayat');
    }
    var bar = $('ortuTabs');
    if (bar) qa('[data-ot]', bar).forEach(function (b) {
      var on = b.getAttribute('data-ot') === tabAktif;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    try { window.scrollTo(0, 0); var mc = document.querySelector('.main-content'); if (mc) mc.scrollTop = 0; } catch (e) { /* abaikan */ }
  }

  /* ---------- angka kecil pada tab ---------- */
  function setBdg(nama, n) {
    var b = document.querySelector('#ortuTabs [data-ot-bdg="' + nama + '"]');
    if (!b) return;
    var ada = n > 0;
    b.hidden = !ada;
    b.style.display = ada ? '' : 'none';
    b.textContent = ada ? String(n) : '';
  }
  function perbaruiAngka() {
    var terkunci = 0, gagal = 0;
    try {
      // ortuAkunCache = daftar akun yang sudah dimuat js/ortu-akun-admin.js (let tingkat-atas: dirujuk langsung)
      if (typeof ortuAkunCache !== 'undefined' && Array.isArray(ortuAkunCache)) {
        var kini = Date.now();
        terkunci = ortuAkunCache.filter(function (a) { return a && a.kunciSampai && a.kunciSampai > kini; }).length;
      }
    } catch (e) { terkunci = 0; }
    try { if (window.rloStat && typeof window.rloStat.gagalHariIni === 'number') gagal = window.rloStat.gagalHariIni; } catch (e) { gagal = 0; }
    setBdg('akun', terkunci);
    setBdg('riwayat', gagal);
  }

  /* ---------- mode halaman ---------- */
  function panesAdmin() { return qa('#page-admin [data-apane]'); }

  function masukMode() {
    modeOn = true;
    document.body.classList.add('mode-ortu-akun');
    ensureTabs();
    panesAdmin().forEach(function (p) { p.style.display = (p.getAttribute('data-apane') === 'ortu') ? '' : 'none'; });
    setTab(tabAktif);
    perbaruiAngka();
  }

  function keluarMode() {
    if (!modeOn) return;
    modeOn = false;
    document.body.classList.remove('mode-ortu-akun');
    // kembalikan panel Admin ke tab pertamanya (tab Orang Tua sudah tidak ada di halaman Admin)
    try {
      if (typeof window.adminTab === 'function') window.adminTab('guru');
      else panesAdmin().forEach(function (p) { p.style.display = (p.getAttribute('data-apane') === 'guru') ? '' : 'none'; });
    } catch (e) { console.error('[orang-tua-menu]', e); }
  }

  /* ---------- sidebar: sorot item sendiri, bukan hub Admin ---------- */
  function sorotMenu() {
    var menu = $('v4SidebarMenu');
    if (!menu) return;
    qa('.menu-item.active', menu).forEach(function (el) { el.classList.remove('active'); });
    var mine = menu.querySelector('.menu-item[data-page="' + PAGE + '"]');
    if (mine) mine.classList.add('active');
    var g = mine && mine.closest ? mine.closest('.menu-group') : null;
    if (g) {
      qa('.menu-group', menu).forEach(function (x) { x.classList.toggle('collapsed', x !== g); });
    }
  }

  function setJudul() {
    var t = $('pageTitle');
    if (t) t.textContent = TITLE;
  }

  /* ---------- hak akses: ikut menu Admin ---------- */
  function adminBolehLihat() {
    var a = document.querySelector('.menu-item[data-page="admin"]');
    if (!a) return false;
    if (a.classList.contains('hidden-tab')) return false;
    if (a.style && a.style.display === 'none') return false;
    return true;
  }
  function aturMenu() {
    var ok = false;
    // currentUser dideklarasikan 'let' di app.js (bukan properti window) -> rujuk langsung
    try { ok = (typeof currentUser !== 'undefined') && !!currentUser && adminBolehLihat(); } catch (e) { ok = false; }
    qa('.menu-item[data-page="' + PAGE + '"]').forEach(function (el) {
      el.style.display = ok ? '' : 'none';
      el.classList.toggle('hidden-tab', !ok);
    });
  }

  function init() {
    injectCss();
    aturMenu();

    // ikuti perubahan class pada menu Admin (app.js mengatur per peran setelah login)
    var adm = document.querySelector('.menu-item[data-page="admin"]');
    if (adm && window.MutationObserver) {
      new MutationObserver(aturMenu).observe(adm, { attributes: true, attributeFilter: ['class', 'style'] });
    }
    setInterval(function () { if (!document.hidden) aturMenu(); }, 3000);
    document.addEventListener('ortu-akun-stat', perbaruiAngka);
    document.addEventListener('rlo-stat', perbaruiAngka);

    var orig = window.navigateTo;
    if (typeof orig !== 'function') return;
    if (orig.__ortuMenu) return;

    var wrapped = function (page) {
      var args = Array.prototype.slice.call(arguments);
      if (page === PAGE) {
        if (!adminBolehLihat()) {
          // peran tanpa akses Admin: jangan buka apa pun
          try { if (typeof toast === 'function') toast('Menu ini hanya untuk Admin.', true); } catch (e) { /* abaikan */ }
          return;
        }
        args[0] = 'admin';
        document.body.classList.add('mode-ortu-akun');
        var r = orig.apply(this, args);
        try {
          masukMode();
          setJudul();
          sorotMenu();
          // sorotan hub Admin bisa dipasang ulang sesudah frame berikutnya -> rapikan lagi
          if (window.requestAnimationFrame) window.requestAnimationFrame(function () { if (modeOn) { sorotMenu(); setJudul(); } });
          setTimeout(function () { if (modeOn) { sorotMenu(); setJudul(); } }, 120);
        } catch (e) { console.error('[orang-tua-menu]', e); }
        return r;
      }
      keluarMode();
      return orig.apply(this, args);
    };
    wrapped.__ortuMenu = true;
    window.navigateTo = wrapped;

    // logout: kembalikan mode supaya pengguna berikutnya tidak mewarisi tampilan ini
    var origLogout = window.logout;
    if (typeof origLogout === 'function' && !origLogout.__ortuMenu) {
      var wl = function () { try { return origLogout.apply(this, arguments); } finally { try { keluarMode(); aturMenu(); setBdg('akun', 0); setBdg('riwayat', 0); } catch (e) { console.error('[orang-tua-menu]', e); } } };
      wl.__ortuMenu = true; window.logout = wl;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
