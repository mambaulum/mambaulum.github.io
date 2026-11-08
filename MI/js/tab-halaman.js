/* ============================================================
   SI MAMBA - js/tab-halaman.js (v2)
   Memecah halaman panjang menjadi TAB di HP (<=768px) supaya tidak perlu scroll panjang.
   - Hanya mengatur tampilan: kartu/bagian yang tidak aktif disembunyikan lewat class .tk-hide
     (CSS di index.html #compactMobileCss). Tidak mengubah data, id, maupun fungsi halaman.
   - Di desktop (>768px) tab tidak tampil dan semua bagian tetap terlihat seperti semula.
   - Tab yang isinya kosong / disembunyikan oleh aplikasi (mis. khusus Admin) otomatis tidak ditampilkan.
   - UBAH DI SINI: daftar halaman & tab pada CFG. 'auto' = satu tab per kartu (nama dari judul kartu).
       { label, cards:[nomor kartu langsung, mulai 0], sel:[selector CSS di dalam halaman] }
   Dimuat SESUDAH app.js & menu-polish.js (membungkus navigateTo).
============================================================ */
(function () {
  'use strict';
  var CFG = {
    'sikap-siswa': [
      { id: 'catat',  label: '✍️ Catat',     cards: [0] },
      { id: 'kelas',  label: '📊 Per Kelas', cards: [1] },
      { id: 'siswa',  label: '👤 Per Siswa', cards: [2] },
      { id: 'kat',    label: '⚙️ Kategori',  sel: ['#sikapKategoriAdminCard'] }
    ],
    'infaq-madrasah': [
      { id: 'input',  label: '📝 Input',      sel: ['#infaqModeSwitch', '.mp-iq-controls', '#infaqInputArea', '#infaqBelumSetorArea', '#infaqTunggakanArea'] },
      { id: 'atur',   label: '⚙️ Pengaturan', sel: ['#infaqPetugasArea', '#infaqTargetArea'] },
      { id: 'rekap',  label: '📊 Rekap',      cards: [1] }
    ],
    'kas-umum': [
      { id: 'ringkas',  label: '💰 Ringkasan',    sel: ['#kasPeriodeWrap'] },
      { id: 'buku',     label: '📑 Buku Kas',     sel: ['^#kasTableArea'] },
      { id: 'kat',      label: '🗂️ Per Kategori', sel: ['^#kasKategoriArea'] },
      { id: 'srekap',   label: '📊 Rekap Setoran', sel: ['^#setoranSemester'] },
      { id: 'sriwayat', label: '🧾 Riwayat',      sel: ['^#setoranRiwayatArea'] }
    ],
    'profil-sekolah': 'auto',
    'admin': 'auto',
    'events': 'auto',
    'ujian': 'auto',
    'kalender-akademik': 'auto'
  };

  // Posisi tab-bar: setelah elemen ini (bawaan: paling atas halaman). Tanda '^' pada sel = ambil kartu (.card) yang memuat elemen itu.
  var ANCHOR = { 'kas-umum': '#kasIntroText', 'infaq-madrasah': '#infaqIntroText' };
  var aktifPerHalaman = {}, terpasang = {}, antri = {};
  function $(id) { return document.getElementById(id); }
  function kartuLangsung(page) { return Array.prototype.filter.call(page.children, function (c) { return c.classList && c.classList.contains('card'); }); }
  function kosong(el) {
    if (!el) return true;
    if (el.classList.contains('hidden') || el.style.display === 'none') return true;
    for (var a = el.parentElement; a && !(a.classList && a.classList.contains('page-content')); a = a.parentElement) { if (a.style && a.style.display === 'none') return true; }
    return el.children.length === 0 && !el.textContent.trim();
  }
  function cari(page, s) {
    if (s.charAt(0) === '^') { var x = page.querySelector(s.slice(1)); return x ? x.closest('.card') : null; }
    return page.querySelector(s);
  }
  function judul(card, i) {
    var h = card.querySelector('h3, h4'), t = h ? h.textContent.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim() : '';
    if (!t) t = 'Bagian ' + (i + 1);
    return t.length > 20 ? t.slice(0, 18).trim() + '…' : t;
  }
  function susun(key, page) {
    var cfg = CFG[key], cards = kartuLangsung(page), tabs = [];
    if (cfg === 'auto') {
      cards.forEach(function (c, i) { tabs.push({ id: 'k' + i, label: judul(c, i), els: [c] }); });
    } else {
      cfg.forEach(function (t) {
        var els = [];
        (t.cards || []).forEach(function (i) { if (cards[i]) els.push(cards[i]); });
        (t.sel || []).forEach(function (s) { var e = cari(page, s); if (e) els.push(e); });
        tabs.push({ id: t.id, label: t.label, els: els });
      });
    }
    return tabs.filter(function (t) { return t.els.length && !t.els.every(kosong); });
  }
  function terapkan(key) {
    var page = $('page-' + key); if (!page || !CFG[key]) return;
    var tabs = susun(key, page), bar = page.querySelector('.tk-tabs');
    var semua = [];
    // Semua elemen yang dikelola (termasuk tab kosong) ikut dibuka dulu bila tab < 2
    var cfg = CFG[key], cards = kartuLangsung(page);
    if (cfg === 'auto') semua = cards.slice();
    else cfg.forEach(function (t) { (t.cards || []).forEach(function (i) { if (cards[i]) semua.push(cards[i]); }); (t.sel || []).forEach(function (s) { var e = cari(page, s); if (e) semua.push(e); }); });
    if (tabs.length < 2) {
      semua.forEach(function (e) { e.classList.remove('tk-hide'); });
      if (bar) bar.remove();
      return;
    }
    var aktif = aktifPerHalaman[key];
    if (!tabs.some(function (t) { return t.id === aktif; })) aktif = tabs[0].id;
    aktifPerHalaman[key] = aktif;
    var tampil = [];
    tabs.forEach(function (t) { if (t.id === aktif) tampil = tampil.concat(t.els); });
    semua.forEach(function (e) { e.classList.toggle('tk-hide', tampil.indexOf(e) === -1); });
    var sig = tabs.map(function (t) { return t.id + ':' + t.label; }).join('|') + '#' + aktif;
    if (bar && bar.getAttribute('data-sig') === sig) return;
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'tk-tabs'; bar.setAttribute('role', 'tablist');
      var ang = ANCHOR[key] ? page.querySelector(ANCHOR[key]) : null;
      if (ang && ang.parentNode) ang.parentNode.insertBefore(bar, ang.nextSibling); else page.insertBefore(bar, page.firstChild);
    }
    bar.setAttribute('data-sig', sig);
    bar.replaceChildren();
    tabs.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tk-tab' + (t.id === aktif ? ' active' : '');
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', t.id === aktif ? 'true' : 'false');
      b.textContent = t.label;
      b.addEventListener('click', function () {
        aktifPerHalaman[key] = t.id; terapkan(key);
        try { bar.scrollIntoView({ block: 'nearest' }); } catch (e) {}
      });
      bar.appendChild(b);
    });
  }
  function jadwalkan(key) {
    if (antri[key]) return;
    antri[key] = true;
    requestAnimationFrame(function () { antri[key] = false; try { terapkan(key); } catch (e) { console.error('[SI MAMBA] tab-halaman:', e); } });
  }
  function pasang(key) {
    var page = $('page-' + key); if (!page || terpasang[key]) return;
    terpasang[key] = true;
    // Isi halaman dirender ulang oleh modulnya -> susun ulang (perubahan pada tab-bar sendiri diabaikan)
    new MutationObserver(function (recs) {
      var luar = recs.some(function (r) { return !(r.target.closest && r.target.closest('.tk-tabs')) && !(r.target.classList && r.target.classList.contains('tk-tabs')); });
      if (luar) jadwalkan(key);
    }).observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  }

  var asli = window.navigateTo;
  if (typeof asli === 'function' && !asli.__tabHalaman) {
    var baru = function (page) {
      var r = asli.apply(this, arguments);
      try {
        if (CFG[page]) { pasang(page); terapkan(page); setTimeout(function () { terapkan(page); }, 400); setTimeout(function () { terapkan(page); }, 1500); }
      } catch (e) { console.error('[SI MAMBA] tab-halaman:', e); }
      return r;
    };
    baru.__tabHalaman = true;
    window.navigateTo = baru;
  }
  window.SIMambaTabHalaman = { cfg: CFG, terapkan: terapkan };
})();
