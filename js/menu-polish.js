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
        if (page === 'dashboard') renderDashCards();
        setTimeout(function () {
          var pg = document.getElementById('page-' + page);
          if (pg) { watchPage(pg.id); decorate(pg); if (CARD_TABLE_PAGES.indexOf(pg.id) !== -1) cardifyTables(pg); }
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
    kepsek: ['rekap', 'laporan', 'rekap-jurnal', 'teacher-attendance', 'honor', 'kalender-akademik'],
    guru: ['attendance', 'journal', 'grades', 'teacher-attendance', 'jadwal', 'activities-v4']
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
        try { decorate(pg); if (CARD_TABLE_PAGES.indexOf(id) !== -1) cardifyTables(pg); } catch (e) { console.error('[menu-polish]', e); }
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
  var annHost = null, annAll = false, ANN_MAX = 3;
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
      var c = el('div', 'mp-ann-card mp-ann-' + pr,
        '<div class="mp-ann-top"><span class="mp-ann-badge">' + LABEL[pr] + '</span>' +
        (ortu ? '<span class="mp-ann-ortu" title="Tampil juga untuk orang tua">👨‍👩‍👧</span>' : '') +
        '<span class="mp-ann-date">' + escapeHtml(annDate(p)) + '</span></div>' +
        '<div class="mp-ann-text">' + escapeHtml(p.teks || '-') + '</div>');
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

})();
