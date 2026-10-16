/* ============================================================
   MENU POLISH -- tambahan UX untuk sidebar & topbar SI MAMBA.
   1) Kotak "Cari menu" di sidebar (juga Ctrl+K atau tombol "/"), mencari SEMUA halaman yang boleh dilihat
      peran yang login, termasuk anggota hub (mis. "Rekap Nilai" -> halaman Rekap Nilai).
   2) Tombol Refresh / Debug / Backup di topbar dipindah ke satu menu "⋮ Aksi". Elemen & onclick aslinya
      TIDAK diganti (hanya dipindah), jadi app.js tetap bisa menampilkan/menyembunyikan tombol Backup.
   3) "Form tambah" dijadikan jendela (modal) yang dibuka lewat tombol "+ Tambah ...", supaya daftar data
      langsung terlihat di halaman. Saat ini dipakai untuk halaman Siswa; halaman lain tinggal menambah satu
      entri di ADD_FORMS (bagian 3 di bawah). Elemen form (id, onclick) hanya DIPINDAH ke jendela, tidak diganti.
   4) Form di halaman lain (Acara, Ujian, Agenda, Pengguna, Jadwal, Kas) dijadikan jendela dengan cara yang
      berbeda: kartu formnya sendiri yang diubah tampil sebagai jendela (lihat FORM_MODALS), jadi semua
      fungsi app.js (isi otomatis saat Edit, tombol Batal, dll.) tetap jalan seperti semula.
   Dimuat SETELAH app.js & menu-hub.js. Tidak mengubah hak akses (class .hidden-tab tetap dibaca saja).
============================================================ */
(function () {
  'use strict';

  var menu = document.getElementById('v4SidebarMenu');
  if (!menu) return;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function norm(s) { return (s || '').toLowerCase().replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- 1. Cari menu ---------------- */
  var wrap = el('div', 'mp-search',
    '<div class="mp-search-box">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>' +
    '<input id="mpMenuSearch" type="search" placeholder="Cari menu…" autocomplete="off" spellcheck="false" ' +
    'aria-label="Cari menu" role="combobox" aria-expanded="false" aria-controls="mpMenuResults">' +
    '<kbd>Ctrl K</kbd></div>');
  var results = el('div', 'mp-results');
  results.id = 'mpMenuResults';
  results.setAttribute('role', 'listbox');
  menu.insertBefore(results, menu.firstChild);
  menu.insertBefore(wrap, menu.firstChild);
  var input = wrap.querySelector('input');
  var sel = 0;

  // Kumpulkan halaman yang boleh dilihat (tanpa hub-nya sendiri; anggota hub ikut).
  function collect() {
    var list = [];
    Array.prototype.forEach.call(menu.querySelectorAll('.menu-item[data-page]'), function (it) {
      if (it.classList.contains('hidden-tab')) return;
      var grp = it.closest('.menu-group');
      if (grp && grp.style.display === 'none') return;
      var c = it.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('.icon, .badge-dot'), function (x) { x.remove(); });
      var label = c.textContent.replace(/\s+/g, ' ').trim();
      var gh = grp && grp.querySelector('.menu-group-header');
      var ghText = gh ? gh.textContent.replace(/[▲▼]/g, '').trim() : 'Menu utama';
      var icon = it.querySelector('.icon');
      list.push({ page: it.getAttribute('data-page'), label: label, group: ghText, icon: icon ? icon.innerHTML : '' });
    });
    return list;
  }

  function highlight(text, q) {
    var i = norm(text).indexOf(q);
    if (i < 0 || !q) return escapeHtml(text);
    return escapeHtml(text.slice(0, i)) + '<mark>' + escapeHtml(text.slice(i, i + q.length)) + '</mark>' + escapeHtml(text.slice(i + q.length));
  }

  function render() {
    var q = norm(input.value);
    var searching = q.length > 0;
    menu.classList.toggle('mp-searching', searching);
    results.classList.toggle('show', searching);
    input.setAttribute('aria-expanded', searching ? 'true' : 'false');
    if (!searching) { results.replaceChildren(); return; }
    var hits = collect().filter(function (p) { return norm(p.label).indexOf(q) !== -1; });
    // label yang diawali kata kunci diprioritaskan
    hits.sort(function (a, b) { return (norm(a.label).indexOf(q) === 0 ? 0 : 1) - (norm(b.label).indexOf(q) === 0 ? 0 : 1); });
    sel = 0;
    results.replaceChildren();
    if (!hits.length) { results.appendChild(el('div', 'mp-nohit', 'Menu “' + escapeHtml(input.value.trim()) + '” tidak ditemukan')); return; }
    hits.forEach(function (h, i) {
      var b = el('button', 'mp-hit' + (i === 0 ? ' sel' : ''));
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.setAttribute('data-page', h.page);
      b.innerHTML = '<span class="icon">' + h.icon + '</span><span>' + highlight(h.label, q) + '<small>' + escapeHtml(h.group) + '</small></span>';
      b.addEventListener('click', function () { go(h.page); });
      results.appendChild(b);
    });
  }

  function go(page) {
    if (typeof window.navigateTo === 'function') window.navigateTo(page);
    input.value = '';
    render();
    input.blur();
  }
  function move(d) {
    var hs = results.querySelectorAll('.mp-hit');
    if (!hs.length) return;
    hs[sel].classList.remove('sel');
    sel = (sel + d + hs.length) % hs.length;
    hs[sel].classList.add('sel');
    hs[sel].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { var s = results.querySelector('.mp-hit.sel'); if (s) { e.preventDefault(); go(s.getAttribute('data-page')); } }
    else if (e.key === 'Escape') { input.value = ''; render(); input.blur(); }
  });
  // Pintasan: Ctrl/Cmd+K atau "/" (di luar kolom isian)
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable);
    var appVisible = document.getElementById('appPage') && document.getElementById('appPage').style.display !== 'none';
    if (!appVisible) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); focusSearch(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); focusSearch(); }
  });
  function focusSearch() {
    var sb = document.getElementById('sidebar');
    if (sb && window.innerWidth <= 768 && !sb.classList.contains('open') && typeof window.toggleSidebar === 'function') window.toggleSidebar();
    input.focus(); input.select();
  }

  /* ---------------- 2. Menu aksi topbar (⋮) ---------------- */
  var right = document.querySelector('#mainContent .topbar .topbar-right');
  if (right) {
    var refresh = right.querySelector('button[onclick^="refreshAllData"]');
    var debug = right.querySelector('button[onclick^="showDebug"]');
    var items = [refresh, debug, document.getElementById('headerBackupBtn')].filter(Boolean);
    if (items.length) {
      var more = el('button', 'mp-more-btn', '⋮');
      more.type = 'button';
      more.id = 'mpMoreBtn';
      more.title = 'Aksi lainnya';
      more.setAttribute('aria-label', 'Aksi lainnya');
      more.setAttribute('aria-haspopup', 'true');
      more.setAttribute('aria-expanded', 'false');
      var panel = el('div', 'mp-more-panel');
      panel.id = 'mpMorePanel';
      panel.appendChild(el('div', 'mp-more-title', 'Aksi'));
      items.forEach(function (b) { panel.appendChild(b); }); // dipindah, bukan disalin: id & onclick tetap
      right.appendChild(more);
      right.appendChild(panel);

      var close = function () { panel.classList.remove('show'); more.setAttribute('aria-expanded', 'false'); };
      more.addEventListener('click', function (e) {
        e.stopPropagation();
        // Debug hanya untuk Admin (dicek tiap menu dibuka, karena peran baru diketahui setelah login)
        if (debug) debug.hidden = !(typeof window.isAdmin === 'function' && window.isAdmin());
        var on = panel.classList.toggle('show');
        more.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      panel.addEventListener('click', function (e) { if (e.target.closest('.btn')) setTimeout(close, 0); });
      document.addEventListener('click', function (e) { if (!panel.contains(e.target)) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
  }

  /* ---------------- 3. Form tambah -> jendela (modal) ----------------
     Tiap entri: page (id halaman), toolbar (selector baris tempat tombol dipasang), button (teks tombol),
     title (judul jendela), tabs: [{ label, nodes: [selector elemen yang dipindah] }]. Selector yang diawali
     "^" dicari dari elemen terdekat (dibungkus panel abu-abu) agar judul + isinya ikut pindah. */
  var ADD_FORMS = [
    {
      page: 'page-students',
      toolbar: '#searchSiswa',
      button: '➕ Tambah Siswa',
      title: 'Tambah Siswa',
      tabs: [
        { label: 'Satu siswa', nodes: ['#studentName@grid', '#btnTambahSiswa'] },
        { label: 'Input massal', nodes: ['#bulkStudentInput@panel'] },
        { label: 'Import Excel', nodes: ['#siswaExcelFile@panel'] }
      ]
    }
  ];

  // "@grid" = induk .grid-2 dari elemen; "@panel" = kotak abu-abu pembungkus (anak langsung .card).
  function resolveNode(spec) {
    var parts = spec.split('@'), n = document.querySelector(parts[0]);
    if (!n) return null;
    if (parts[1] === 'grid') return n.closest('.grid-2') || n;
    if (parts[1] === 'panel') { var c = n.closest('.card'); while (n && n.parentElement && n.parentElement !== c) n = n.parentElement; return n; }
    return n;
  }

  function buildAddForm(cfg) {
    var page = document.getElementById(cfg.page);
    var anchor = document.querySelector(cfg.toolbar);
    if (!page || !anchor) return;
    var tabs = cfg.tabs.map(function (t) {
      return { label: t.label, nodes: t.nodes.map(resolveNode).filter(Boolean) };
    }).filter(function (t) { return t.nodes.length; });
    if (!tabs.length) return;

    var overlay = el('div', 'mp-modal');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', cfg.title);
    var box = el('div', 'mp-modal-box');
    var head = el('div', 'mp-modal-head', '<h3>' + escapeHtml(cfg.title) + '</h3>');
    var x = el('button', 'mp-modal-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Tutup');
    head.appendChild(x);
    box.appendChild(head);

    var bar = null;
    if (tabs.length > 1) { bar = el('div', 'mp-modal-tabs'); bar.setAttribute('role', 'tablist'); box.appendChild(bar); }
    var body = el('div', 'mp-modal-body');
    box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var panes = tabs.map(function (t, i) {
      var pane = el('div', 'mp-pane');
      t.nodes.forEach(function (n) { pane.appendChild(n); }); // dipindah: id & onclick tetap
      body.appendChild(pane);
      if (bar) {
        var b = el('button', 'mp-modal-tab', escapeHtml(t.label)); b.type = 'button'; b.setAttribute('role', 'tab');
        b.addEventListener('click', function () { show(i); });
        bar.appendChild(b);
      }
      return pane;
    });
    function show(i) {
      panes.forEach(function (p, k) { p.classList.toggle('show', k === i); });
      if (bar) Array.prototype.forEach.call(bar.children, function (b, k) { b.classList.toggle('active', k === i); b.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    }
    show(0);

    var lastFocus = null;
    function open() {
      if (typeof window.isAdmin === 'function' && !window.isAdmin()) {
        if (typeof window.toast === 'function') window.toast('🔒 Hanya Admin!', true);
        return;
      }
      lastFocus = document.activeElement;
      overlay.classList.add('show');
      document.body.classList.add('mp-lock');
      var f = panes[0].querySelector('input, select, textarea');
      if (f) setTimeout(function () { f.focus(); }, 30);
    }
    function close() {
      overlay.classList.remove('show');
      document.body.classList.remove('mp-lock');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    x.addEventListener('click', close);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('show')) close(); });

    var btn = el('button', 'btn btn-primary mp-add-btn', escapeHtml(cfg.button));
    btn.type = 'button';
    btn.addEventListener('click', open);
    var row = anchor.closest('div[style*="display:flex"]') || anchor.parentElement;
    row.appendChild(btn);
  }
  ADD_FORMS.forEach(function (c) { try { buildAddForm(c); } catch (e) { console.error('[menu-polish] form tambah', e); } });

  /* ---------------- 4. Kartu form -> jendela (halaman lain) ----------------
     form    : selector kartu/panel form. "@panel" = naik ke kotak abu-abu pembungkusnya.
     button  : teks tombol "tambah" yang dipasang di bar atas halaman (kosong = tidak dibuat,
               dipakai bila halaman sudah punya tombol pembukanya sendiri).
     gate    : 'inline' = tombol ikut tersembunyi bila app.js menyembunyikan kartunya (mis. non-Admin).
     mode    : 'auto' = jendela tampil/tutup mengikuti style.display yang diatur app.js.
     closeFn : fungsi app.js untuk menutup (mode auto), mis. batalJadwal.
     edit    : fungsi app.js "edit" yang mengisi form -> jendela dibuka otomatis setelahnya.
     openWhen: elemen yang muncul saat mode edit (mis. tombol "Batal Edit") -> jendela ikut terbuka. */
  var FORM_MODALS = [
    { page: 'page-dashboard',        form: '#pengumumanAdmin',       button: '📢 Kelola Pengumuman', gate: 'inline' },
    { page: 'page-events',           form: '#eventAdminFormCard',      button: '➕ Buat Acara',        gate: 'inline', edit: ['editEvent'] },
    { page: 'page-ujian',            form: '#ujianAdminFormCard',      button: '➕ Buat Sesi Ujian',   gate: 'inline', edit: ['editUjian'] },
    { page: 'page-kalender-akademik',form: '#kalenderAdminFormCard',   button: '➕ Tambah Agenda',     gate: 'inline' },
    { page: 'page-user-management',  form: '#userName@panel',          button: '➕ Tambah Pengguna' },
    { page: 'page-jadwal',           form: '#jadwalFormContainer',     mode: 'auto', closeFn: 'batalJadwal' },
    { page: 'page-kas-umum',         form: '#kasFormCard',             button: '➕ Catat Kas',         gate: 'inline', showWith: '#kasBukuWrap',    openWhen: '#btnBatalKas' },
    { page: 'page-kas-umum',         form: '#setoranFormCard',         button: '➕ Catat Setoran',     gate: 'inline', showWith: '#kasSetoranWrap', openWhen: '#btnBatalSetoran' }
  ];

  var fms = [];            // { cfg, form, open, close, refresh }
  var armed = null;        // form yang baru saja diklik tombol di dalamnya (menunggu toast sukses)
  var armTimer = null;
  var backdrop = el('div', 'mp-backdrop');
  document.body.appendChild(backdrop);

  function isShown(f) { return f.classList.contains('mp-show'); }
  function syncBackdrop() {
    var any = fms.some(function (m) { return isShown(m.form); });
    backdrop.classList.toggle('show', any);
    if (any) document.body.classList.add('mp-lock'); else if (!document.querySelector('.mp-modal.show')) document.body.classList.remove('mp-lock');
  }
  function topShown() { var a = fms.filter(function (m) { return isShown(m.form); }); return a[a.length - 1]; }

  function buildFormModal(cfg) {
    var form = resolveNode(cfg.form);
    if (form && cfg.form.indexOf('@panel') !== -1) form = form.closest('div[style*="background:#f8fafc"]') || form;
    if (!form) return;
    var auto = cfg.mode === 'auto';
    form.classList.add('mp-fm');
    document.body.appendChild(form); // dipindah ke <body>: tidak terpengaruh efek/overflow kartu induk

    var x = el('button', 'mp-fm-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Tutup');
    form.insertBefore(x, form.firstChild);
    form.setAttribute('role', 'dialog'); form.setAttribute('aria-modal', 'true');

    var m = { cfg: cfg, form: form };
    m.refresh = function () {
      var on;
      if (auto) { var d = form.style.display; on = !!d && d !== 'none'; }
      else on = form.classList.contains('mp-open');
      form.classList.toggle('mp-show', on);
      syncBackdrop();
    };
    m.open = function () {
      if (auto) { if (!form.style.display || form.style.display === 'none') form.style.display = 'block'; }
      else form.classList.add('mp-open');
      m.refresh();
      var f = form.querySelector('input:not([type=hidden]):not([type=checkbox]), select, textarea');
      if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 40);
    };
    m.close = function () {
      if (auto) {
        if (cfg.closeFn && typeof window[cfg.closeFn] === 'function') window[cfg.closeFn]();
        else form.style.display = 'none';
      } else form.classList.remove('mp-open');
      m.refresh();
    };
    x.addEventListener('click', m.close);
    // app.js/kas.js memanggil form.scrollIntoView() (pintasan "Kelola Pengumuman", Edit): di jendela itu artinya "buka"
    if (!auto) form.scrollIntoView = function () { if (form.style.display !== 'none') m.open(); };
    // tombol di dalam form diklik -> jika sebentar lagi muncul toast sukses, jendela ditutup otomatis
    form.addEventListener('click', function (e) {
      if (!e.target.closest('.btn')) return;
      armed = m; clearTimeout(armTimer); armTimer = setTimeout(function () { armed = null; }, 8000);
    });
    if (auto) new MutationObserver(m.refresh).observe(form, { attributes: true, attributeFilter: ['style'] });
    fms.push(m);

    // tombol pembuka di bar atas halaman
    if (cfg.button) {
      var page = document.getElementById(cfg.page);
      if (page) {
        var bar = page.querySelector(':scope > .mp-pagebar');
        if (!bar) { bar = el('div', 'mp-pagebar'); page.insertBefore(bar, page.firstChild); }
        var btn = el('button', 'btn btn-primary', escapeHtml(cfg.button)); btn.type = 'button';
        btn.addEventListener('click', m.open);
        bar.appendChild(btn);
        if (cfg.gate === 'inline' || cfg.showWith) {
          // tombol tampil hanya bila kartu form tidak disembunyikan app.js (hak akses) DAN tab/bagian induknya sedang tampil
          var sw = cfg.showWith ? document.querySelector(cfg.showWith) : null;
          var gate = function () {
            btn.hidden = !!((cfg.gate === 'inline' && form.style.display === 'none') || (sw && sw.style.display === 'none'));
            bar.hidden = !bar.querySelector('.btn:not([hidden])');
          };
          new MutationObserver(gate).observe(form, { attributes: true, attributeFilter: ['style'] });
          if (sw) new MutationObserver(gate).observe(sw, { attributes: true, attributeFilter: ['style'] });
          gate();
        }
      }
    }
    // fungsi "edit" milik app.js: setelah form terisi, buka jendelanya
    (cfg.edit || []).forEach(function (name) {
      var orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function () { var r = orig.apply(this, arguments); try { m.open(); } catch (e) { console.error('[menu-polish]', e); } return r; };
    });
    // mode edit yang ditandai elemen lain (mis. tombol "Batal Edit" tampil)
    if (cfg.openWhen) {
      var marker = document.querySelector(cfg.openWhen);
      if (marker) new MutationObserver(function () {
        var shown = marker.style.display !== 'none'; // dalam jendela tertutup elemen ini tak dirender, jadi hanya style inline yang dipakai
        if (shown) m.open(); else if (form.classList.contains('mp-open')) m.close();
      }).observe(marker, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    }
  }
  FORM_MODALS.forEach(function (c) { try { buildFormModal(c); } catch (e) { console.error('[menu-polish] form modal', e); } });

  backdrop.addEventListener('mousedown', function () { var t = topShown(); if (t) t.close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var t = topShown(); if (t) t.close(); } });

  // Toast sukses setelah klik tombol di dalam jendela -> tutup
  var origToast = window.toast;
  if (typeof origToast === 'function') {
    window.toast = function (msg, err) {
      var r = origToast.apply(this, arguments);
      try {
        if (armed && !err && /✅|berhasil|ditambah|disimpan|tersimpan|diperbarui/i.test(String(msg))) {
          var m = armed; armed = null; setTimeout(m.close, 450);
        }
      } catch (e) { console.error('[menu-polish]', e); }
      return r;
    };
  }
  // Pindah halaman -> tutup semua jendela
  var navPrev = window.navigateTo;
  if (typeof navPrev === 'function') {
    window.navigateTo = function (page) {
      fms.forEach(function (m) { if (isShown(m.form)) m.close(); });
      var r = navPrev.apply(this, arguments);
      try {
        if (page === 'dashboard') { renderDashCards(); renderPrayer(); }
        setTimeout(function () {
          var pg = document.getElementById('page-' + page);
          if (pg) { watchPage(pg.id); decorate(pg); if (CARD_TABLE_PAGES.indexOf(pg.id) !== -1) cardifyTables(pg); }
          // Jadwal: tampilan awal Mingguan (sekali per pemuatan aplikasi; pilihan Harian/Per Mapel sesudahnya tetap dihormati)
          if (page === 'jadwal' && !jadwalDefaulted && typeof window.setJadwalView === 'function') { jadwalDefaulted = true; window.setJadwalView('mingguan'); }
        }, 0);
      } catch (e) { /* bagian 5-7 dimuat di bawah */ }
      return r;
    };
  }

  /* ---------------- 5. Kartu menu Dashboard per peran ----------------
     Kartu dibuat dari menu sidebar yang SEDANG boleh dilihat (tanpa .hidden-tab), jadi hak akses tidak
     pernah dilonggarkan: halaman yang tak boleh dibuka peran itu otomatis tidak muncul. */
  var DASH_PICKS = {
    admin: ['students', 'honor', 'laporan', 'kas-umum', 'rekap', 'user-management'],
    kepsek: ['rekap', 'laporan', 'rekap-jurnal', 'honor', 'kalender-akademik'],
    guru: ['grades', 'jadwal', 'activities-v4'] // Absensi, Jurnal & Absen Guru tidak diulang sebagai kartu (sudah ada di navbar/menu)
  };
  var dashPage = document.getElementById('page-dashboard');
  var dashHost = null;
  function roleKey() {
    if (typeof window.isAdmin === 'function' && window.isAdmin()) return 'admin';
    if (typeof window.isKepsek === 'function' && window.isKepsek()) return 'kepsek';
    return 'guru';
  }
  function renderDashCards() {
    if (!dashPage) return;
    if (!dashHost) {
      var qa = document.getElementById('dashQuickActions');
      if (!qa) return;
      dashHost = el('div', 'mp-dash-cards');
      dashHost.id = 'mpDashCards';
      qa.parentNode.insertBefore(dashHost, qa.nextSibling);
    }
    var vis = {};
    collect().forEach(function (p) { vis[p.page] = p; });
    var picks = (DASH_PICKS[roleKey()] || []).filter(function (k) { return vis[k]; });
    var sig = roleKey() + '|' + picks.join(',');
    if (dashHost.getAttribute('data-sig') === sig) return;
    dashHost.setAttribute('data-sig', sig);
    dashHost.replaceChildren();
    picks.forEach(function (k) {
      var p = vis[k];
      var b = el('button', 'mp-dash-card',
        '<span class="icon">' + p.icon + '</span><span class="lbl">' + escapeHtml(p.label) + '</span>');
      b.type = 'button';
      b.addEventListener('click', function () { if (typeof window.navigateTo === 'function') window.navigateTo(p.page); });
      dashHost.appendChild(b);
    });
    dashHost.hidden = !picks.length;
  }
  // peran baru diketahui setelah login & menu disaring app.js -> hitung ulang saat class menu berubah
  var dashTimer = null;
  new MutationObserver(function () { clearTimeout(dashTimer); dashTimer = setTimeout(renderDashCards, 120); })
    .observe(menu, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
  renderDashCards();

  /* ---------------- 6. Loading rangka & keadaan kosong ----------------
     Hanya mendekorasi teks "Memuat..." / "Belum ada ..." yang sudah dibuat app.js (tidak mengubah logikanya). */
  var ADD_BTN_BY_PAGE = {}; // page-id -> teks tombol tambah, diisi dari ADD_FORMS & FORM_MODALS
  ADD_FORMS.forEach(function (c) { ADD_BTN_BY_PAGE[c.page] = c.button; });
  FORM_MODALS.forEach(function (c) { if (c.button && !ADD_BTN_BY_PAGE[c.page]) ADD_BTN_BY_PAGE[c.page] = c.button; });
  var RX_LOAD = /^\s*(⏳\s*)?(memuat|loading)\b[^\n]{0,40}$/i;
  var RX_EMPTY = /^\s*(📭\s*|📋\s*)?(belum ada|tidak ada|tak ada|data kosong|kosong)\b[^\n]{0,90}$/i;
  function decorate(root) {
    var nodes = root.querySelectorAll('p, td[colspan]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.children.length > 1 || n.closest('.mp-fm, .mp-modal, #debugBox, .marquee-container, .toast')) continue;
      var t = n.textContent;
      if (!t || t.length > 140) continue;
      if (RX_LOAD.test(t)) {
        if (!n.classList.contains('mp-loading')) { n.classList.add('mp-loading'); n.setAttribute('aria-busy', 'true'); }
      } else {
        if (n.classList.contains('mp-loading')) { n.classList.remove('mp-loading'); n.removeAttribute('aria-busy'); }
        if (RX_EMPTY.test(t) && !n.classList.contains('mp-empty') && !n.querySelector('.mp-empty')) {
          n.classList.add('mp-empty');
          var pg = n.closest('.page-content');
          var label = pg && ADD_BTN_BY_PAGE[pg.id];
          // ajakan: tombol tambah hanya bila tombolnya memang tampil (bukan untuk peran yang tak berhak)
          var openBtn = pg && Array.prototype.filter.call(pg.querySelectorAll('.mp-pagebar .btn, .mp-add-btn'), function (b) { return !b.hidden && b.textContent.trim() === label; })[0];
          // belum ada siswa sama sekali (bukan sekadar pencarian tak cocok) dan pengguna boleh menambah -> ajakan khusus
          if (openBtn && pg.id === 'page-students' && typeof allSiswa !== 'undefined' && allSiswa.length === 0) n.textContent = 'Belum ada siswa. Tambah siswa pertama.';
          if (openBtn && !n.querySelector('.mp-empty-cta')) {
            var cta = el('button', 'btn btn-soft mp-empty-cta', escapeHtml(label)); cta.type = 'button';
            cta.addEventListener('click', function () { openBtn.click(); });
            n.appendChild(cta);
          }
        }
      }
    }
  }

  /* ---------------- 7. Tabel lebar -> kartu di HP ----------------
     Hanya untuk halaman di CARD_TABLE_PAGES dan tabel dengan 1 baris header tanpa colspan/rowspan.
     Memberi data-label per sel; CSS (@media <=640px) yang mengubah tampilannya. Tabel lain tidak disentuh. */
  var CARD_TABLE_PAGES = ['page-students', 'page-user-management', 'page-events', 'page-ujian', 'page-kas-umum',
    'page-honor', 'page-rekap-jurnal', 'page-info-ortu', 'page-surat', 'page-rapat'];
  function cardifyTables(root) {
    Array.prototype.forEach.call(root.querySelectorAll('table:not([data-mp-nocards])'), function (tb) {
      var heads = tb.querySelectorAll('thead tr'), hr = heads[0], noThead = false;
      if (!heads.length) {
        var first = tb.querySelector('tr');
        if (first && first.children.length && Array.prototype.every.call(first.children, function (c) { return c.tagName === 'TH'; })) { hr = first; noThead = true; heads = [first]; }
      }
      if (heads.length !== 1 || hr.querySelector('[colspan],[rowspan]')) return;
      var ths = hr.children;
      if (ths.length < 4) return;
      var labels = Array.prototype.map.call(ths, function (h) { return h.textContent.replace(/\s+/g, ' ').trim(); });
      if (noThead) hr.classList.add('mp-cards-head');
      Array.prototype.forEach.call(tb.querySelectorAll('tbody tr, tr'), function (tr) {
        if (tr === hr || tr.children.length !== labels.length) return; // baris "kosong"/colspan dibiarkan
        Array.prototype.forEach.call(tr.children, function (td, i) { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', labels[i]); });
      });
      tb.classList.add('mp-cards');
    });
  }

  var obsTimers = {};
  function watchPage(id) {
    var pg = document.getElementById(id);
    if (!pg || pg.getAttribute('data-mp-watch')) return;
    pg.setAttribute('data-mp-watch', '1');
    new MutationObserver(function () {
      clearTimeout(obsTimers[id]);
      obsTimers[id] = setTimeout(function () {
        try { decorate(pg); if (CARD_TABLE_PAGES.indexOf(id) !== -1) cardifyTables(pg); if (id === 'page-jadwal') jadwalPortrait(); if (id === 'page-grades') gradeInputsSiap(); } catch (e) { console.error('[menu-polish]', e); }
      }, 80);
    }).observe(pg, { childList: true, subtree: true, characterData: true });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.page-content[id]'), function (pg) { watchPage(pg.id); });

  /* ---------------- 8. Konfirmasi hapus seragam (pengganti confirm() bawaan browser) ----------------
     confirm() bersifat sinkron, jadi tidak bisa diganti begitu saja. Caranya: saat confirm() dipanggil di dalam
     klik pengguna, jawabannya ditahan (false), jendela konfirmasi kita tampil, dan bila "Ya" ditekan klik yang
     sama diulang sekali dengan confirm() menjawab true. Panggilan confirm() di luar klik (timer, async)
     tetap memakai kotak bawaan. */
  var nativeConfirm = window.confirm.bind(window);
  var clickEl = null, approved = [], replaying = false, cmodal = null, promptedInClick = false;
  var nativePrompt = window.prompt.bind(window);
  // prompt() lebih dulu dari confirm() (mis. catatan panjar honor): mengulang klik akan menanyakan prompt dua kali -> pakai kotak bawaan
  window.prompt = function () { if (clickEl) promptedInClick = true; return nativePrompt.apply(window, arguments); };
  document.addEventListener('click', function (e) {
    if (cmodal && cmodal.ov.contains(e.target)) return;
    if (e.isTrusted) { approved = []; promptedInClick = false; clickEl = e.target; setTimeout(function () { clickEl = null; }, 0); }
    else if (replaying) { clickEl = e.target; setTimeout(function () { clickEl = null; }, 0); } // ulangan klik: jawaban lama tetap berlaku
  }, true);
  function ensureConfirmModal() {
    if (cmodal) return cmodal;
    var ov = el('div', 'mp-modal mp-confirm');
    ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="mp-modal-box mp-confirm-box"><div class="mp-confirm-ico" aria-hidden="true">⚠️</div>' +
      '<h3 class="mp-confirm-title">Konfirmasi</h3><p class="mp-confirm-msg"></p>' +
      '<div class="mp-confirm-actions"><button type="button" class="btn btn-soft" data-act="no">Batal</button>' +
      '<button type="button" class="btn btn-danger" data-act="yes">Ya, lanjutkan</button></div></div>';
    document.body.appendChild(ov);
    cmodal = { ov: ov, msg: ov.querySelector('.mp-confirm-msg'), yes: ov.querySelector('[data-act=yes]'), no: ov.querySelector('[data-act=no]'), target: null };
    function done(ok) {
      ov.classList.remove('show');
      if (!document.querySelector('.mp-modal.show, .mp-fm.mp-show')) document.body.classList.remove('mp-lock');
      var t = cmodal.target; cmodal.target = null;
      if (ok && t && document.contains(t)) {
        approved.push(cmodal.asked); replaying = true;
        try { t.click(); } finally { replaying = false; }
      } else approved = [];
    }
    cmodal.yes.addEventListener('click', function () { done(true); });
    cmodal.no.addEventListener('click', function () { done(false); });
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) done(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('show')) { e.stopPropagation(); done(false); } }, true);
    return cmodal;
  }
  window.confirm = function (msg) {
    var key = String(msg == null ? '' : msg);
    if (approved.indexOf(key) !== -1) return true;
    if (!clickEl || promptedInClick || !document.contains(clickEl)) return nativeConfirm(msg);
    var target = clickEl.closest('button, a, [onclick], .btn, input[type=button], input[type=submit]') || clickEl;
    var c = ensureConfirmModal();
    c.target = target; c.asked = key;
    c.msg.textContent = String(msg == null ? 'Yakin?' : msg);
    var danger = /hapus|delete|reset|kosongkan|batalkan/i.test(String(msg));
    c.yes.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    c.ov.classList.add('show'); document.body.classList.add('mp-lock');
    setTimeout(function () { c.no.focus(); }, 30);
    return false;
  };


  /* ---------------- 9. Pengumuman Dashboard -> kartu ----------------
     renderMarquee() milik app.js tetap dijalankan (teks berjalan disembunyikan lewat CSS); setelah itu kartu
     dibuat dari allPengumuman yang sama, dengan aturan yang sama (hanya yang aktif !== false). */
  var annHost = null, annAll = false, ANN_MAX = 1;
  function annDate(p) { try { return p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; } catch (e) { return ''; } }
  function renderAnnounceCards() {
    var box = document.getElementById('pengumumanContainer');
    if (!box || typeof allPengumuman === 'undefined') return;
    if (!annHost) {
      annHost = el('div', 'mp-ann'); annHost.id = 'mpAnnounce';
      box.parentNode.insertBefore(annHost, box.nextSibling);
    }
    box.classList.add('mp-ann-on');
    var aktif = allPengumuman.filter(function (p) { return p.aktif !== false; });
    // yang Penting di atas; urutan tanggal (terbaru dulu) dipertahankan di dalam kelompoknya
    var urut = aktif.filter(function (p) { return p.prioritas === 'penting'; }).concat(aktif.filter(function (p) { return p.prioritas !== 'penting'; }));
    annHost.replaceChildren();
    if (!urut.length) {
      annHost.appendChild(el('div', 'mp-ann-empty', '📢 Belum ada pengumuman saat ini'));
      return;
    }
    var LABEL = { umum: 'Umum', info: 'Info', penting: 'Penting' };
    var tampil = annAll ? urut : urut.slice(0, ANN_MAX);
    tampil.forEach(function (p) {
      var pr = LABEL[p.prioritas] ? p.prioritas : 'umum';
      var ortu = typeof pengumumanUntukOrtu === 'function' && pengumumanUntukOrtu(p);
      var panjang = (p.teks || '').length > 90;
      var c = el('div', 'mp-ann-card mp-ann-' + pr + (panjang ? ' mp-ann-clamp' : ''),
        '<div class="mp-ann-top"><span class="mp-ann-badge">' + LABEL[pr] + '</span>' +
        (ortu ? '<span class="mp-ann-ortu" title="Tampil juga untuk orang tua">👨‍👩‍👧</span>' : '') +
        '<span class="mp-ann-date">' + escapeHtml(annDate(p)) + '</span></div>' +
        '<div class="mp-ann-text">' + escapeHtml(p.teks || '-') + '</div>');
      if (panjang) { // teks panjang: tampil 2 baris + "Selengkapnya" supaya tombol di bawahnya tidak terdorong keluar layar
        var tg = el('button', 'mp-ann-toggle', 'Selengkapnya'); tg.type = 'button'; tg.setAttribute('aria-expanded', 'false');
        tg.addEventListener('click', function () { var buka = c.classList.toggle('mp-ann-clamp') === false; tg.textContent = buka ? 'Ringkas' : 'Selengkapnya'; tg.setAttribute('aria-expanded', buka ? 'true' : 'false'); });
        c.appendChild(tg);
      }
      annHost.appendChild(c);
    });
    if (urut.length > ANN_MAX) {
      var more = el('button', 'btn btn-soft mp-ann-more', annAll ? 'Tampilkan lebih sedikit' : 'Lihat semua (' + urut.length + ')');
      more.type = 'button';
      more.addEventListener('click', function () { annAll = !annAll; renderAnnounceCards(); });
      annHost.appendChild(more);
    }
  }
  if (typeof window.renderMarquee === 'function') {
    var marqueePrev = window.renderMarquee;
    window.renderMarquee = function () {
      var r = marqueePrev.apply(this, arguments);
      try { renderAnnounceCards(); } catch (e) { console.error('[menu-polish] pengumuman', e); }
      return r;
    };
    try { renderAnnounceCards(); } catch (e) { /* data pengumuman belum dimuat: renderMarquee() berikutnya yang menggambar */ }
  }


  /* ---------------- 10. Input Nilai: validasi, rapor langsung, tanpa catatan kosong ---------------- */
  var NILAI_KOLOM = ['h1', 'h2', 'h3', 'mid', 'pas'];
  function nilaiParse(v) { return String(v == null ? '' : v).trim().replace(',', '.'); }
  function nilaiValid(v) { if (v === '') return true; var n = Number(v); return isFinite(n) && n >= 0 && n <= 100; }
  function gradeInputsSiap() {
    Array.prototype.forEach.call(document.querySelectorAll('#gradesContainer .grade-input:not([inputmode])'), function (i) { i.setAttribute('inputmode', 'decimal'); i.setAttribute('autocomplete', 'off'); });
  }
  // rapor ikut berubah saat mengetik (rumus tetap satu sumber: calculateRapor milik app.js)
  document.addEventListener('input', function (e) {
    var inp = e.target;
    if (!inp || !inp.classList || !inp.classList.contains('grade-input')) return;
    var v = nilaiParse(inp.value);
    inp.classList.toggle('mp-bad', !nilaiValid(v));
    var tr = inp.closest('tr'); if (!tr || typeof window.calculateRapor !== 'function') return;
    var data = {};
    Array.prototype.forEach.call(tr.querySelectorAll('.grade-input'), function (i) { var x = nilaiParse(i.value); data[i.dataset.key] = nilaiValid(x) ? x : ''; });
    var cell = tr.lastElementChild; if (cell) cell.textContent = window.calculateRapor(data);
  });
  if (typeof window.saveGrades === 'function') {
    var saveGradesPrev = window.saveGrades;
    window.saveGrades = function () {
      var inputs = Array.prototype.slice.call(document.querySelectorAll('#gradesContainer .grade-input'));
      if (!inputs.length) return saveGradesPrev.apply(this, arguments);
      var salah = [], perSiswa = {};
      inputs.forEach(function (inp) {
        var v = nilaiParse(inp.value);
        if (!nilaiValid(v)) { inp.classList.add('mp-bad'); salah.push(inp); return; }
        inp.classList.remove('mp-bad');
        if (v !== '') inp.value = String(Number(v)); // "85,5" -> 85.5 ; "085" -> 85
        else inp.value = '';
        var k = inp.dataset.siswa; (perSiswa[k] = perSiswa[k] || []).push(inp);
      });
      if (salah.length) {
        salah[0].focus();
        return window.toast('⚠️ ' + salah.length + ' nilai tidak valid. Isi angka 0–100 (boleh desimal, koma atau titik). Kolom bertanda merah belum diperbaiki.', true, 6000);
      }
      // siswa yang SEMUA kolomnya kosong dan belum punya catatan nilai tidak ikut disimpan (tidak membuat catatan 0)
      var lewati = [];
      Object.keys(perSiswa).forEach(function (k) {
        var row = perSiswa[k];
        var kosong = row.every(function (i) { return i.value === ''; });
        var barangAda = row.some(function (i) { return i.dataset.gradekey; });
        if (kosong && !barangAda) row.forEach(function (i) { lewati.push(i); });
      });
      if (lewati.length === inputs.length) return window.toast('Belum ada nilai yang diisi.', true);
      lewati.forEach(function (i) { i.classList.remove('grade-input'); });
      try { return saveGradesPrev.apply(this, arguments); }
      finally { lewati.forEach(function (i) { i.classList.add('grade-input'); }); } // saveGrades membaca input secara sinkron di awal
    };
  }

  /* ---------------- 11. Jadwal: default Mingguan + tampilan HP (potret) + PDF potret ---------------- */
  var jadwalDefaulted = false;
  // Di layar sempit grid 7 kolom tidak muat: dibuat salinan "kartu per hari" dari grid yang sama
  // (isi sel disalin apa adanya, termasuk tombol ➕ Admin); CSS memilih mana yang tampil.
  function jadwalPortrait() {
    var wrap = document.getElementById('jadwalTableWrapper'); if (!wrap) return;
    var tb = wrap.querySelector('table'); if (!tb || tb.getAttribute('data-mp-jd')) return;
    var heads = Array.prototype.map.call(tb.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    if (heads.length < 3 || !/^Jam/i.test(heads[0]) || !/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu)$/.test(heads[1])) return; // bukan grid mingguan
    tb.setAttribute('data-mp-jd', '1');
    var src = tb.parentNode; src.classList.add('mp-jd-src');
    var old = wrap.querySelector('.mp-jd-days'); if (old) old.remove();
    var host = el('div', 'mp-jd-days');
    var rows = tb.querySelectorAll('tbody tr');
    for (var c = 1; c < heads.length; c++) {
      var card = el('section', 'mp-jd-day', '<h4 class="mp-jd-h">' + escapeHtml(heads[c]) + '</h4>'), n = 0;
      Array.prototype.forEach.call(rows, function (tr) {
        var cell = tr.children[c], jamTd = tr.children[0]; if (!cell || !jamTd) return;
        var kosong = cell.textContent.trim() === '-' && !cell.querySelector('button');
        if (kosong) return; // slot kosong tanpa aksi tidak ditampilkan
        var waktuEl = jamTd.querySelector('span');
        var jamNo = (jamTd.firstChild && jamTd.firstChild.textContent || '').trim();
        var row = el('div', 'mp-jd-row' + (cell.querySelector('button') ? ' mp-jd-slot' : ''),
          '<div class="mp-jd-jam"><b>' + escapeHtml(jamNo) + '</b><small>' + escapeHtml(waktuEl ? waktuEl.textContent : '') + '</small></div>' +
          '<div class="mp-jd-body">' + cell.innerHTML + '</div>');
        if (cell.style.backgroundColor) { row.style.backgroundColor = cell.style.backgroundColor; row.style.color = cell.style.color; }
        card.appendChild(row); n++;
      });
      if (n) host.appendChild(card);
    }
    src.parentNode.insertBefore(host, src.nextSibling);
  }
  function hexRgb(h) { h = String(h).replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  if (typeof window.exportJadwalPDF === 'function') {
    var exportJadwalPrev = window.exportJadwalPDF;
    window.exportJadwalPDF = function () {
      // Tampilan Mingguan -> PDF grid seminggu, A4 potret. Tampilan lain tetap memakai PDF harian bawaan.
      if (typeof jadwalView === 'undefined' || jadwalView !== 'mingguan') return exportJadwalPrev.apply(this, arguments);
      var kelas = document.getElementById('jadwalKelasFilter').value;
      var gSel = document.getElementById('jadwalGuruFilter'), gVal = gSel ? gSel.value : '';
      var gNama = gSel && gSel.selectedIndex > 0 ? gSel.options[gSel.selectedIndex].textContent : '';
      var data = allJadwal.filter(function (j) { return j.kelas === kelas && (!gVal || (j.guruKey || j.guru) === gVal); });
      if (!data.length) return toast('Tidak ada jadwal untuk ' + kelas + (gNama ? ' (guru ' + gNama + ')' : ''), true);
      var urutan = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      var hariList = urutan.filter(function (h) { return data.some(function (j) { return j.hari === h; }); });
      var jamList = Array.from(new Set(data.map(function (j) { return j.jam; }).filter(Boolean))).sort(function (a, b) { return a - b; });
      var sel = {};
      var body = jamList.map(function (jam, r) {
        var w = jamSettings[jam] ? jamSettings[jam].mulai + '-' + jamSettings[jam].selesai : '';
        return ['Jam ' + jam + (w ? '\n' + w : '')].concat(hariList.map(function (h, c) {
          var j = data.find(function (x) { return x.jam === jam && x.hari === h; });
          if (j) sel[r + ':' + (c + 1)] = warnaMapel(j.mapel);
          return j ? (j.mapel || '-') + '\n' + (j.guru || '-') : '';
        }));
      });
      var jsPDF = window.jspdf.jsPDF, doc = new jsPDF('p', 'mm', 'a4'), W = doc.internal.pageSize.getWidth();
      doc.setFontSize(16); doc.text('JADWAL PELAJARAN', W / 2, 16, { align: 'center' });
      doc.setFontSize(12); doc.text('Kelas ' + kelas + (gNama ? ' - Guru ' + gNama : ''), W / 2, 23, { align: 'center' });
      doc.setFontSize(8); doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), W - 10, 29, { align: 'right' });
      doc.autoTable({
        startY: 33, head: [['Jam'].concat(hariList)], body: body, theme: 'grid', margin: { left: 10, right: 10 },
        styles: { fontSize: 8, cellPadding: 2, halign: 'center', valign: 'middle', lineColor: [209, 213, 219], lineWidth: 0.2 },
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold', fillColor: [243, 244, 246] } },
        didParseCell: function (d) {
          if (d.section !== 'body') return;
          var c = sel[d.row.index + ':' + d.column.index];
          if (c) { d.cell.styles.fillColor = hexRgb(c[0]); d.cell.styles.textColor = hexRgb(c[1]); }
        }
      });
      doc.save('Jadwal_Mingguan_' + kelas.replace(/\s+/g, '_') + '.pdf');
      toast('📥 Jadwal mingguan berhasil diunduh!');
    };
  }

  /* ---------------- 11b. Rapikan profil Dashboard ----------------
     Teks diisi app.js; di sini hanya dinormalkan di DOM (tanpa mengubah data/logika app.js). */
  (function () {
    var kelasEl = document.getElementById('bioKelas'), busy = false;
    function ringkasKelas() {
      if (!kelasEl || busy) return;
      var t = kelasEl.textContent || '';
      if (/^\d+–\d+$/.test(t.trim())) return; // sudah rapi (hindari memproses ulang hasil sendiri)
      var nums = (t.match(/\d+/g) || []).map(Number);
      if (!nums.length) return;
      // hanya bila isinya sekadar daftar nomor ("Kelas 1, Kelas 2, ..."); nama kelas lain ("1A") tidak diubah
      if (!/^[\s\d,&\-–]*$/.test(t.replace(/kelas/gi, ''))) return;
      var uniq = nums.filter(function (n, i) { return nums.indexOf(n) === i; }).sort(function (a, b) { return a - b; });
      var rapat = uniq.length >= 3 && uniq.every(function (n, i) { return !i || n === uniq[i - 1] + 1; });
      // "Kelas" sudah ada di depan elemen ini; 3+ kelas berurutan -> "1–6"
      var baru = rapat ? uniq[0] + '–' + uniq[uniq.length - 1] : uniq.join(', ');
      if (baru === t) return;
      busy = true; kelasEl.textContent = baru; busy = false;
    }
    if (kelasEl) { new MutationObserver(ringkasKelas).observe(kelasEl, { childList: true, characterData: true, subtree: true }); ringkasKelas(); }
  })();

  /* ---------------- 12. Waktu shalat di Dashboard ----------------
     Dihitung di perangkat (tanpa internet, tanpa API luar), mengikuti parameter Kemenag RI:
     Subuh 20°, Isya 18°, Ashar mazhab Syafi'i, ihtiyat +2 menit (Terbit -2 menit). Lokasi: koordinat madrasah
     dari Pengaturan Absen QR bila ada, selain itu Jember. Hasilnya perkiraan (selisih ±1-2 menit dari jadwal resmi). */
  var PRAY_DEFAULT = { lat: -8.1724, lng: 113.6995, label: 'Jember' };
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function dsin(x) { return Math.sin(x * D2R); }
  function dcos(x) { return Math.cos(x * D2R); }
  function fixN(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }
  function julianDay(y, m, d) { if (m <= 2) { y -= 1; m += 12; } var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
  function sunPos(jd) {
    var D = jd - 2451545.0, g = fixN(357.529 + 0.98560028 * D, 360), q = fixN(280.459 + 0.98564736 * D, 360);
    var L = fixN(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360), e = 23.439 - 0.00000036 * D;
    var RA = fixN(Math.atan2(dcos(e) * dsin(L), dcos(L)) * R2D / 15, 24);
    return { decl: Math.asin(dsin(e) * dsin(L)) * R2D, eq: q / 15 - RA };
  }
  function prayerTimes(y, m, d, lat, lng, tz) {
    var jd = julianDay(y, m, d) - lng / 360;
    function mid(t) { return fixN(12 - sunPos(jd + t).eq, 24); }
    function angle(a, t, ccw) {
      var dec = sunPos(jd + t).decl, v = (-dsin(a) - dsin(dec) * dsin(lat)) / (dcos(dec) * dcos(lat));
      if (v < -1 || v > 1) return NaN;
      var h = Math.acos(v) * R2D / 15; return mid(t) + (ccw ? -h : h);
    }
    function asr(t) { var dec = sunPos(jd + t).decl; return angle(-Math.atan(1 / (1 + Math.tan(Math.abs(lat - dec) * D2R))) * R2D, t, false); }
    var adj = tz - lng / 15;
    var t = {
      subuh: angle(20, 5 / 24, true), terbit: angle(0.833, 6 / 24, true), dzuhur: mid(12 / 24),
      ashar: asr(13 / 24), maghrib: angle(0.833, 18 / 24, false), isya: angle(18, 18 / 24, false)
    };
    var IHTIYAT = { subuh: 2, terbit: -2, dzuhur: 2, ashar: 2, maghrib: 2, isya: 2 };
    var out = {};
    Object.keys(t).forEach(function (k) {
      if (!isFinite(t[k])) { out[k] = null; return; }
      var mnt = (t[k] + adj) * 60 + IHTIYAT[k];
      out[k] = fixN(k === 'terbit' ? Math.floor(mnt) : Math.ceil(mnt), 1440); // menit sejak tengah malam (terbit dibulatkan turun, lainnya naik)
    });
    return out;
  }

  var PRAY_HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var PRAY_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var PRAY_NAMA = { subuh: 'Subuh', terbit: 'Terbit', dzuhur: 'Dzuhur', ashar: 'Ashar', maghrib: 'Maghrib', isya: 'Isya' };
  var PRAY_URUT = ['subuh', 'terbit', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  var prayHost = null, prayLogin = null;
  function prayHosts() {
    var hs = [];
    var anchor = document.getElementById('dashQuickActions');
    if (anchor && dashPage) {
      if (!prayHost) { prayHost = el('div', 'mp-pray'); prayHost.id = 'mpPrayer'; anchor.parentNode.insertBefore(prayHost, anchor); }
      hs.push(prayHost);
    }
    var chooser = document.getElementById('loginChooser'), quote = document.getElementById('cxQuote');
    if (chooser) {
      if (!prayLogin) {
        prayLogin = el('div', 'mp-pray mp-pray-login'); prayLogin.id = 'mpPrayerLogin';
        var card = chooser.querySelector('.auth-choice');
        if (card && card.nextSibling) chooser.insertBefore(prayLogin, card.nextSibling); else if (quote) chooser.insertBefore(prayLogin, quote); else chooser.appendChild(prayLogin);
      }
      hs.push(prayLogin);
    }
    return hs;
  }
  function prayVisible() { return (dashPage && dashPage.offsetParent !== null) || (prayLogin && prayLogin.offsetParent !== null); }
  function prayLoc() {
    try {
      var q = (typeof V4 !== 'undefined' && V4 && V4.absenQr) || null;
      if (q && isFinite(parseFloat(q.lat)) && isFinite(parseFloat(q.lng))) {
        var la = parseFloat(q.lat), ln = parseFloat(q.lng);
        // nama daerah: dari pengaturan bila ada; selain itu "Jember" bila koordinat dalam ±50 km dari pusat Jember; selain itu teks umum
        var dekat = Math.hypot((la - PRAY_DEFAULT.lat) * 111, (ln - PRAY_DEFAULT.lng) * 111 * Math.cos(PRAY_DEFAULT.lat * D2R)) <= 50;
        var nama = String(q.kota || q.daerah || q.kabupaten || '').trim();
        return { lat: la, lng: ln, label: nama || (dekat ? PRAY_DEFAULT.label : 'Lokasi madrasah') };
      }
    } catch (e) { /* V4 belum siap: pakai lokasi bawaan */ }
    return PRAY_DEFAULT;
  }
  function jam(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  function renderPrayer() {
    var hosts = prayHosts();
    if (!hosts.length) return;
    var loc = prayLoc();
    var tz = loc.lng >= 127 ? 9 : (loc.lng >= 115 ? 8 : 7); // WIT / WITA / WIB menurut bujur
    var now = new Date(Date.now() + tz * 3600000);            // "jam dinding" di zona lokasi, dibaca lewat getUTC*
    var y = now.getUTCFullYear(), mo = now.getUTCMonth() + 1, d = now.getUTCDate();
    var menitNow = now.getUTCHours() * 60 + now.getUTCMinutes();
    var hari = prayerTimes(y, mo, d, loc.lat, loc.lng, tz), besokMode = false, tglTampil = now;
    if (PRAY_URUT.some(function (k) { return hari[k] == null; })) { hosts.forEach(function (h) { h.hidden = true; }); return; }
    hosts.forEach(function (h) { h.hidden = false; });
    // berikutnya = shalat fardhu (tanpa Terbit) pertama yang belum lewat; lewat Isya -> Subuh besok
    var wajib = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'], nextKey = null, nextMin = 0;
    for (var i = 0; i < wajib.length; i++) { if (hari[wajib[i]] > menitNow) { nextKey = wajib[i]; nextMin = hari[nextKey]; break; } }
    if (!nextKey) {
      var besok = new Date(Date.UTC(y, mo - 1, d + 1));
      var tb = prayerTimes(besok.getUTCFullYear(), besok.getUTCMonth() + 1, besok.getUTCDate(), loc.lat, loc.lng, tz);
      // lewat Isya: seluruh kartu menampilkan jadwal BESOK (judul & kotak Subuh memakai waktu yang sama) + penanda "besok"
      if (!PRAY_URUT.some(function (k) { return tb[k] == null; })) { hari = tb; besokMode = true; tglTampil = besok; }
      nextKey = 'subuh'; nextMin = tb.subuh + 1440;
    }
    var sisa = nextMin - menitNow, jamSisa = Math.floor(sisa / 60), mntSisa = sisa % 60;
    var zona = tz === 7 ? 'WIB' : (tz === 8 ? 'WITA' : 'WIT');
    var cells = PRAY_URUT.map(function (k) {
      var cls = 'mp-pray-cell' + (k === nextKey ? ' mp-pray-next' : '') + (!besokMode && hari[k] <= menitNow && k !== nextKey ? ' mp-pray-past' : '') + (k === 'terbit' ? ' mp-pray-info' : '');
      return '<div class="' + cls + '"><span>' + PRAY_NAMA[k] + '</span><b>' + jam(hari[k]) + '</b></div>';
    }).join('');
    var sisaPendek = (jamSisa ? jamSisa + ' j ' : '') + mntSisa + ' m';
    function bangun(denganCuaca) { return '<div class="mp-pray-top"><div class="mp-pray-next-line">🕌 <b>' + PRAY_NAMA[nextKey] + ' ' + jam(nextMin % 1440) + (besokMode ? ' <small class="mp-pray-besok">besok</small>' : '') + '</b><span> · ' + sisaPendek + ' lagi</span></div>' +
      '<div class="mp-pray-sub">' + escapeHtml(loc.label) + ' · ' + PRAY_HARI[tglTampil.getUTCDay()] + ', ' + tglTampil.getUTCDate() + ' ' + PRAY_BULAN[tglTampil.getUTCMonth()] + (besokMode ? ' (besok)' : '') + ' · ' + zona +
        (denganCuaca ? wxChip() : '') + '</div></div>' +
      '<div class="mp-pray-grid">' + cells + '</div>'; }
    var catatan = 'Waktu shalat: metode Kemenag RI, perkiraan ±2 menit; rujuk jadwal resmi setempat bila perlu.';
    hosts.forEach(function (h) {
      var dash = h === prayHost;
      h.title = catatan + (dash && wxData ? ' Cuaca: Open-Meteo.com (CC BY 4.0).' : '');
      h.innerHTML = bangun(dash);
    });
    if (prayHost && prayHost.offsetParent !== null) wxEnsure(loc); // cuaca hanya untuk Dashboard (setelah login)
  }

  /* ---- Chip cuaca (Dashboard saja) ----
     Open-Meteo (gratis, tanpa kunci). Disimpan 30 menit di perangkat; gagal/offline -> chip tidak tampil, tanpa pesan galat.
     Yang dikirim hanya koordinat lokasi (tanpa data pribadi). */
  var wxData = null, wxBusy = false, wxLastTry = 0, WX_KEY = 'mp_cuaca_v1', WX_TTL = 30 * 60 * 1000;
  function wxLabel(c) {
    if (c === 0) return ['☀️', 'Cerah'];
    if (c === 1 || c === 2) return ['⛅', 'Cerah berawan'];
    if (c === 3) return ['☁️', 'Berawan'];
    if (c === 45 || c === 48) return ['🌫️', 'Berkabut'];
    if (c >= 51 && c <= 57) return ['🌦️', 'Gerimis'];
    if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return ['🌧️', c >= 65 || c === 82 ? 'Hujan lebat' : 'Hujan'];
    if (c >= 95) return ['⛈️', 'Badai petir'];
    return ['🌡️', 'Cuaca'];
  }
  function wxChip() {
    if (!wxData) return '';
    var ic = wxLabel(wxData.code);
    return ' · <span class="mp-wx" title="' + escapeHtml(ic[1] + ', hujan ' + wxData.rain + '% hari ini') + '">' + ic[0] + ' ' + Math.round(wxData.temp) + '°' +
      (wxData.rain >= 10 ? ' 💧' + wxData.rain + '%' : '') + '</span>';
  }
  function wxEnsure(loc) {
    var kunci = loc.lat.toFixed(2) + ',' + loc.lng.toFixed(2);
    if (!wxData) { try { var c = JSON.parse(localStorage.getItem(WX_KEY) || 'null'); if (c && c.k === kunci && Date.now() - c.t < WX_TTL) wxData = c.d; } catch (e) { /* cache rusak: abaikan */ } if (wxData) { try { renderPrayer(); } catch (e) { /* diabaikan */ } return; } }
    var segar = wxData && wxData.k === kunci && Date.now() - wxData.t < WX_TTL;
    if (segar || wxBusy || navigator.onLine === false || Date.now() - wxLastTry < 5 * 60 * 1000) return;
    wxBusy = true; wxLastTry = Date.now();
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 7000);
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat.toFixed(4) + '&longitude=' + loc.lng.toFixed(4) +
      '&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=auto&forecast_days=1', ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        var cur = j && j.current, rain = j && j.daily && j.daily.precipitation_probability_max && j.daily.precipitation_probability_max[0];
        if (!cur || !isFinite(cur.temperature_2m) || !isFinite(cur.weather_code)) throw new Error('format');
        wxData = { temp: cur.temperature_2m, code: cur.weather_code, rain: isFinite(rain) ? Math.round(rain) : 0, k: kunci, t: Date.now() };
        try { localStorage.setItem(WX_KEY, JSON.stringify({ k: kunci, t: wxData.t, d: wxData })); } catch (e) { /* penyimpanan penuh/diblokir: tidak masalah */ }
        renderPrayer();
      })
      .catch(function () { /* diam: chip cuaca opsional */ })
      .then(function () { clearTimeout(to); wxBusy = false; });
  }
  try { renderPrayer(); } catch (e) { console.error('[menu-polish] waktu shalat', e); }
  setInterval(function () { if (prayVisible() && !document.hidden) { try { renderPrayer(); } catch (e) { /* diabaikan */ } } }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && prayVisible()) { try { renderPrayer(); } catch (e) { /* diabaikan */ } } });

})();
