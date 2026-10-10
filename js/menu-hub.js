/* ============================================================
   MENU HUB -- menggabungkan item sidebar yang mirip jadi satu entri (41 item -> 22 entri).
   Tidak ada halaman yang dihapus dan aturan hak akses per peran di app.js TIDAK diubah:
   - Item asli tetap ada di DOM (disembunyikan lewat class .hub-member) dan tetap diberi/dicabut
     class .hidden-tab oleh app.js sesuai peran. Modul ini hanya MEMBACA class itu.
   - Entri gabungan (hub) tampil kalau minimal satu anggotanya boleh dilihat peran yang login.
   - Di dalam halaman, muncul deretan tab kecil di bawah topbar untuk pindah antar anggota hub.
   Dimuat SETELAH app.js (lihat index.html).
============================================================ */
(function () {
  'use strict';

  // Urutan pages = urutan tab. Label hub = teks di sidebar.
  var HUBS = [
    { id: 'profil',    label: 'Profil',              pages: ['profile-v4', 'profil-sekolah'] },
    { id: 'siswa',     label: 'Siswa',               pages: ['students', 'promotion'] },
    { id: 'nilai',     label: 'Nilai & Sikap',       pages: ['grades', 'rekap-nilai', 'sikap-siswa'] },
    { id: 'jurnal',    label: 'Jurnal Mengajar',     pages: ['rekap-jurnal', 'journal'] },
    { id: 'komortu',   label: 'Komunikasi Ortu',     pages: ['buku-penghubung', 'info-ortu'] },
    { id: 'belajar',   label: 'Modul & Materi',      pages: ['modul-ajar', 'materi-belajar', 'tugas-siswa'] },
    { id: 'amalan',    label: 'Religi & Tahfidz',    pages: ['religi', 'tahfidz-v4'] },
    { id: 'ekskul',    label: 'Ekskul & Pramuka',    pages: ['ekskul-v4', 'pramuka-v4'] },
    { id: 'absenguru', label: 'Absen Guru',          pages: ['teacher-attendance', 'kelola-absen-guru'] },
    { id: 'ujian',     label: 'Ujian',               pages: ['ujian', 'administrasi-ujian'] },
    { id: 'honor',     label: 'Honor',               pages: ['honor', 'honor-slip'] },
    { id: 'kas',       label: 'Kas & Infaq',         pages: ['kas-umum', 'infaq-madrasah'] },
    { id: 'raport',    label: 'Raport & Dokumen',    pages: ['raport-v4', 'laporan', 'surat'] },
    { id: 'notif',     label: 'Notifikasi & Tugas',  pages: ['notifications-v4', 'tasks-v4', 'approval-v4', 'saran-kritik'] },
    { id: 'admin',     label: 'Admin & Ringkasan',   pages: ['admin', 'user-management', 'rekap'] }
  ];

  var menu = document.getElementById('v4SidebarMenu');
  if (!menu) return;

  var hubs = [];
  var curPage = null;
  var tabsBar = null;

  function labelOf(el) {
    var c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.icon, .badge-dot'), function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function isVisible(el) { return !el.classList.contains('hidden-tab'); }
  function hasDot(el) { return !!el.querySelector('.badge-dot.show'); }
  function setClass(el, cls, on) { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); }

  function build() {
    HUBS.forEach(function (cfg) {
      var members = [];
      cfg.pages.forEach(function (p) {
        var el = menu.querySelector('.menu-item[data-page="' + p + '"]');
        if (el) members.push({ page: p, el: el, label: labelOf(el) });
      });
      if (!members.length) return;

      var first = members.slice().sort(function (a, b) {
        return (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
      })[0].el;

      var hub = document.createElement('div');
      hub.className = 'menu-item menu-hub notif-badge';
      hub.setAttribute('data-hub', cfg.id);
      var icon = first.querySelector('.icon');
      if (icon) hub.appendChild(icon.cloneNode(true));
      hub.appendChild(document.createTextNode(' ' + cfg.label + ' '));
      var dot = document.createElement('span');
      dot.className = 'badge-dot';
      hub.appendChild(dot);
      first.parentNode.insertBefore(hub, first);

      var h = { cfg: cfg, el: hub, dot: dot, members: members, vis: members, last: null };
      members.forEach(function (m) { m.el.classList.add('hub-member'); });
      hub.addEventListener('click', function () {
        var t = h.vis.filter(function (m) { return m.page === h.last; })[0] || h.vis[0];
        if (t && typeof window.navigateTo === 'function') window.navigateTo(t.page);
      });
      hubs.push(h);
    });

    tabsBar = document.createElement('div');
    tabsBar.id = 'hubTabs';
    tabsBar.className = 'hub-tabs';
    tabsBar.setAttribute('role', 'tablist');
    var topbar = document.querySelector('#mainContent .topbar');
    if (topbar) topbar.insertAdjacentElement('afterend', tabsBar);
  }

  function renderTabs() {
    if (!tabsBar) return;
    var h = hubs.filter(function (x) { return x.cfg.pages.indexOf(curPage) !== -1; })[0];
    if (!h || h.vis.length < 2) { setClass(tabsBar, 'show', false); tabsBar.replaceChildren(); return; }
    tabsBar.replaceChildren();
    h.vis.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hub-tab' + (m.page === curPage ? ' active' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', m.page === curPage ? 'true' : 'false');
      b.textContent = m.label;
      if (hasDot(m.el)) { var d = document.createElement('i'); d.className = 'hub-tab-dot'; b.appendChild(d); }
      b.addEventListener('click', function () { if (m.page !== curPage) window.navigateTo(m.page); });
      tabsBar.appendChild(b);
    });
    setClass(tabsBar, 'show', true);
  }

  function sync() {
    hubs.forEach(function (h) {
      h.vis = h.members.filter(function (m) { return isVisible(m.el); });
      setClass(h.el, 'hub-empty', h.vis.length === 0);
      setClass(h.dot, 'show', h.vis.some(function (m) { return hasDot(m.el); }));
      setClass(h.el, 'active', h.cfg.pages.indexOf(curPage) !== -1);
    });
    renderTabs();
  }

  // Sidebar akordeon: buka grup yang memuat entri aktif (hub atau item biasa), tutup grup lain.
  // Anggota hub (.hub-member) disembunyikan, jadi yang dipakai adalah entri hub-nya.
  function openActiveGroup() {
    var act = menu.querySelector('.menu-item.active:not(.hub-member)');
    var grp = act && act.closest('.menu-group');
    if (!grp) return;
    Array.prototype.forEach.call(menu.querySelectorAll('.menu-group'), function (g) { setClass(g, 'collapsed', g !== grp); });
  }

  build();

  // Bungkus navigateTo: semua pemanggilan (sidebar, bottom nav, dashboard, dll.) ikut memperbarui hub.
  var origNav = window.navigateTo;
  if (typeof origNav === 'function') {
    window.navigateTo = function (page) {
      var r = origNav.apply(this, arguments);
      try {
        curPage = page;
        hubs.forEach(function (h) { if (h.cfg.pages.indexOf(page) !== -1) h.last = page; });
        sync();
        openActiveGroup();
      } catch (e) { console.error('[menu-hub]', e); }
      return r;
    };
  }

  // Aturan peran & titik notifikasi diubah app.js lewat class -> sinkronkan ulang (dibatasi 1x per frame).
  var pending = false;
  new MutationObserver(function (recs) {
    var relevan = recs.some(function (r) {
      var t = r.target;
      return t.classList && (t.classList.contains('hub-member') || t.classList.contains('badge-dot')) && !t.closest('.menu-hub');
    });
    if (!relevan || pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; sync(); });
  }).observe(menu, { subtree: true, attributes: true, attributeFilter: ['class'] });

  sync();
})();
