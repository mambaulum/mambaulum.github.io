/* ============================================================
   BUKU TAMU -- js/buku-tamu.js
   Dimuat SETELAH app.js & menu-hub.js (lihat index.html). Modul mandiri seperti modul-ajar.js/kas.js:
   halaman dibuat sendiri lewat JS, data dimuat sendiri dari db.ref('buku_tamu'), tidak menyentuh loadAllData().
   Pengunjung mengisi lewat halaman publik buku-tamu.html (tanpa login). Menu ini untuk petugas:
   Admin = melihat + mengubah status/catatan + isi manual; Kepsek = hanya melihat.
   Penghapusan hanya lewat tab Arsip Semester (admin): semester harus sudah berakhir dan CSV-nya diunduh dulu.
============================================================ */
(function () {
  'use strict';

  var PAGE = 'buku-tamu';
  var KATEGORI = ['Orang Tua / Wali Murid', 'Dinas / Instansi Pemerintah', 'Pengawas Madrasah', 'Alumni / Masyarakat Umum', 'Mitra / Vendor', 'Peneliti / Mahasiswa PPL', 'Lainnya'];
  var STATUS = { baru: 'Baru', ditemui: 'Sudah ditemui', arsip: 'Arsip' };
  var RENTANG = { hari: 'Hari ini', minggu: '7 hari terakhir', bulan: 'Bulan ini', semua: 'Semua (maks. 500 terbaru)' };
  var TABS = [
    { id: 'daftar', t: '📋 Daftar Tamu' }, { id: 'isi', t: '✍️ Isi Manual' },
    { id: 'rekap', t: '📊 Rekap' }, { id: 'arsip', t: '🗄️ Arsip Semester' }, { id: 'tautan', t: '🔗 Tautan & QR' }
  ];
  var data = [], loaded = false, loading = false, loadErr = '';
  var live = null, liveRef = null, known = null;
  var tab = 'daftar', filt = { q: '', rentang: 'hari', kategori: '', status: '' }, root = null;
  var arsip = { sem: '', list: null, diunduh: false };

  /* ---------- util ---------- */
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function canView() { return !!currentUser && (isAdmin() || isKepsek()); }
  function canManage() { return !!currentUser && isAdmin(); }
  function byKey(k) { return data.filter(function (x) { return x.key === k; })[0]; }
  function fmt(ts) {
    return ts ? new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  }
  function statusDari(x) { return STATUS[x.status] ? x.status : 'baru'; }
  function normWa(wa) { return String(wa || '').replace(/[\s\-().]/g, ''); }
  function waValid(wa) { return !wa || /^\+?\d{9,15}$/.test(wa); }
  function waLink(wa) {
    var n = String(wa || '').replace(/\D/g, '');
    if (!n) return '';
    if (n.charAt(0) === '0') n = '62' + n.slice(1);
    else if (n.charAt(0) === '8') n = '62' + n;
    return 'https://wa.me/' + n;
  }
  function bintang(n) { n = parseInt(n, 10); return (n >= 1 && n <= 5) ? '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n) : ''; }
  function publicUrl() { return new URL('buku-tamu.html', document.baseURI).href; }
  function injectCss() {
    if ($('btStyle')) return;
    var st = document.createElement('style'); st.id = 'btStyle';
    st.textContent = '.bt-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.bt-tab{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}' +
      '.bt-tab.active{background:#059669;border-color:#059669;color:#fff}.bt-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.bt-bar .field{flex:1;min-width:130px}' +
      '.bt-item{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff}.bt-h{display:flex;justify-content:space-between;gap:8px;align-items:center}' +
      '.bt-m{font-size:12.5px;color:#6b7280;margin-top:2px}.bt-badge{font-size:11.5px;border-radius:999px;padding:2px 8px;background:#fef3c7;color:#92400e;white-space:nowrap}' +
      '.bt-badge.st-ditemui{background:#d1fae5;color:#065f46}.bt-badge.st-arsip{background:#e5e7eb;color:#374151}.bt-act{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
      '.bt-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.bt-form .full{grid-column:1/-1}.bt-tbl{width:100%;border-collapse:collapse;font-size:13px}.bt-tbl td,.bt-tbl th{border:1px solid #e5e7eb;padding:5px 8px;text-align:left}' +
      '.bt-mbadge{display:inline-block;margin-left:8px;min-width:18px;padding:1px 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;line-height:16px;text-align:center;vertical-align:middle}' +
      '.bt-offline{display:none;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px}';
    document.head.appendChild(st);
  }

  /* ---------- data ---------- */
  function pageAktif() { return !!(root && root.classList && !root.classList.contains('hidden')); }
  function updateOnline() {
    var el = $('btOffline'); if (!el) return;
    if (navigator.onLine) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = '📴 Anda sedang offline. Data yang tampil mungkin belum terbaru, dan perubahan (simpan, status, catatan, arsip) baru bisa dilakukan setelah tersambung kembali.';
    el.style.display = 'block';
  }
  function renderData() { if (pageAktif() && (tab === 'daftar' || tab === 'rekap')) renderBody(); }
  function renderArsip() { if (pageAktif() && tab === 'arsip') renderBody(); }
  function madInfo() { return (typeof MADRASAH !== 'undefined' && MADRASAH) || {}; }
  function badgeBaru() { return data.filter(function (x) { return statusDari(x) === 'baru'; }).length; }
  function updateBadge() {
    var mi = document.querySelector('.sidebar-menu .menu-item[data-page="' + PAGE + '"]'); if (!mi) return;
    var b = mi.querySelector('.bt-mbadge'), n = canView() ? badgeBaru() : 0;
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('span'); b.className = 'bt-mbadge'; mi.appendChild(b); }
    b.textContent = n > 99 ? '99+' : String(n);
  }
  function labelTab(t) { var n = t.id === 'daftar' ? badgeBaru() : 0; return n ? t.t + ' (' + n + ' baru)' : t.t; }
  // Tab Isi Manual / Tautan tidak dirender ulang agar isian petugas tidak hilang.
  function refreshView() {
    var tb = root && root.querySelector('[data-tab="daftar"]'); if (tb) tb.textContent = labelTab(TABS[0]);
    if (tab === 'daftar') { if ($('btList')) renderList(); else renderBody(); }
    else if (tab === 'rekap') renderBody();
  }
  function stopLive() {
    if (liveRef && live) { try { liveRef.off('value', live); } catch (e) {} }
    liveRef = null; live = null; known = null;
  }
  // Listener realtime (hemat: setelah muatan awal hanya perubahan yang dikirim). Aktif untuk Admin/Kepsek sejak
  // navigasi pertama, sehingga badge menu dan notifikasi tamu baru bekerja di halaman mana pun.
  function startLive() {
    if (live || !canView() || typeof db === 'undefined') return;
    if (!navigator.onLine) { if (!loaded) { loadErr = 'Perlu koneksi internet untuk memuat buku tamu.'; renderData(); } return; }
    loading = !loaded; loadErr = '';
    if (loading) renderData();
    liveRef = db.ref('buku_tamu').orderByChild('ts').limitToLast(500);
    live = function (snap) {
      var arr = [], baru = [];
      snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      arr.reverse();
      if (known) arr.forEach(function (x) { if (!known[x.key] && statusDari(x) === 'baru' && x.sumber !== 'resepsionis') baru.push(x); });
      known = {}; arr.forEach(function (x) { known[x.key] = 1; });
      data = arr; loaded = true; loading = false; loadErr = '';
      updateBadge();
      if (pageAktif()) refreshView();
      if (baru.length) toast('🔔 Tamu baru: ' + String(baru[0].nama || '').replace(/[<>&"'`]/g, '') + (baru.length > 1 ? ' (+' + (baru.length - 1) + ' lainnya)' : ''));
    };
    liveRef.on('value', live, function (err) {
      stopLive(); loading = false; loadErr = 'Gagal memuat buku tamu: ' + (err && err.message || err);
      renderData();
    });
  }
  function load(force) { if (force) stopLive(); startLive(); }
  function inRange(ts) {
    var n = new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    if (filt.rentang === 'hari') return ts >= d0;
    if (filt.rentang === 'minggu') return ts >= d0 - 6 * 864e5;
    if (filt.rentang === 'bulan') return ts >= new Date(n.getFullYear(), n.getMonth(), 1).getTime();
    return true;
  }
  function filtered(abaikanLain) {
    var q = filt.q.toLowerCase();
    return data.filter(function (x) {
      if (!inRange(x.ts || 0)) return false;
      if (abaikanLain) return true;
      if (filt.kategori && x.kategori !== filt.kategori) return false;
      if (filt.status && statusDari(x) !== filt.status) return false;
      if (q && [x.nama, x.instansi, x.alamat, x.dituju, x.keperluan, x.saran].join(' ').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  function simpanTamu(o, sumber, btn, cb) {
    if (!canManage()) return toast('Tidak diizinkan!', true);
    if (!navigator.onLine) return toast('Perlu koneksi internet untuk menyimpan.', true);
    if (isBusy('simpanTamu')) return;
    setBusy('simpanTamu', btn);
    var p = {
      nama: o.nama, wa: o.wa, instansi: o.instansi, alamat: o.alamat, kategori: o.kategori, dituju: o.dituju, keperluan: o.keperluan,
      saran: o.saran || '', status: 'baru', sumber: sumber, ts: firebase.database.ServerValue.TIMESTAMP
    };
    if (o.rating >= 1 && o.rating <= 5) p.rating = o.rating;
    db.ref('buku_tamu').push(p, function (err) {
      clearBusy('simpanTamu', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      toast('✅ Tamu dicatat'); addLog('buku_tamu_manual', o.nama);
      if (cb) cb();
    });
  }
  function ubah(key, field, v, msg) {
    var x = byKey(key); if (!x || !canManage()) return;
    if (!navigator.onLine) return toast('Perlu koneksi internet.', true);
    db.ref('buku_tamu/' + key + '/' + field).set(v, function (err) {
      if (err) return toast('Gagal: ' + err.message, true);
      x[field] = v; toast(msg); updateBadge(); refreshView();
    });
  }

  /* ---------- tampilan ---------- */
  function ensurePage() {
    var div = $('page-' + PAGE);
    if (div && root === div) return;
    if (!div) {
      var host = $('mainContent'); if (!host) return;
      div = document.createElement('div');
      div.id = 'page-' + PAGE; div.className = 'page-content hidden';
      host.appendChild(div);
    }
    root = div;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
  }
  function render() {
    if (!root) return;
    if (!canView()) { root.innerHTML = '<div class="card"><p style="color:#dc2626;">🔒 Menu ini hanya untuk admin dan kepala madrasah.</p></div>'; return; }
    var tabs = TABS.map(function (t) {
      if ((t.id === 'isi' || t.id === 'arsip') && !canManage()) return '';
      return '<button type="button" class="bt-tab' + (tab === t.id ? ' active' : '') + '" data-bt="tab" data-tab="' + t.id + '">' + labelTab(t) + '</button>';
    }).join('');
    root.innerHTML = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📖 Buku Tamu</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:12px;">Catatan kunjungan tamu madrasah. Pengunjung mengisi sendiri lewat tautan/QR di tab Tautan & QR.</p>' +
      '<div id="btOffline" class="bt-offline" role="status"></div><div class="bt-tabs">' + tabs + '</div><div id="btBody"></div></div>';
    renderBody(); updateOnline();
  }
  function renderBody() {
    var b = $('btBody'); if (!b) return;
    if (tab === 'tautan') { b.innerHTML = tautanHtml(); buatQr(); return; }
    if (tab === 'isi') { b.innerHTML = formHtml(); return; }
    if (tab === 'arsip') { b.innerHTML = arsipHtml(); return; }
    if (loading) { b.innerHTML = '<p class="text-muted" style="padding:12px 0;">⏳ Memuat…</p>'; return; }
    if (loadErr) { b.innerHTML = '<p style="color:#dc2626;">' + esc(loadErr) + '</p><button class="btn btn-soft" data-bt="reload">🔄 Coba lagi</button>'; return; }
    if (tab === 'rekap') { b.innerHTML = rekapHtml(); return; }
    b.innerHTML = toolbarHtml() + '<div id="btList"></div>'; renderList();
  }
  function opts(list, cur, all) {
    return '<option value="">' + all + '</option>' + list.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
  }
  function rentangHtml() {
    return Object.keys(RENTANG).map(function (k) { return '<option value="' + k + '"' + (k === filt.rentang ? ' selected' : '') + '>' + RENTANG[k] + '</option>'; }).join('');
  }
  function toolbarHtml() {
    return '<div class="bt-bar"><input id="btQ" class="field" placeholder="Cari nama / instansi / keperluan…" value="' + esc(filt.q) + '">' +
      '<select id="btR" class="field">' + rentangHtml() + '</select>' +
      '<select id="btK" class="field">' + opts(KATEGORI, filt.kategori, 'Semua kategori') + '</select>' +
      '<select id="btS" class="field"><option value="">Semua status</option>' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === filt.status ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select></div>' +
      '<div class="bt-bar"><button class="btn btn-soft" data-bt="reload">🔄 Muat ulang</button><button class="btn btn-soft" data-bt="csv">⬇️ CSV</button><button class="btn btn-soft" data-bt="cetak">🖨️ Cetak</button></div>';
  }
  function renderList() {
    var el = $('btList'); if (!el) return;
    var list = filtered();
    if (!list.length) { el.innerHTML = '<p class="text-muted" style="padding:12px 0;">Belum ada tamu pada filter ini.</p>'; return; }
    el.innerHTML = '<p class="text-muted" style="font-size:12.5px;margin-bottom:6px;">' + list.length + ' tamu</p>' + list.map(card).join('');
  }
  function card(x) {
    var st = statusDari(x), wl = waLink(x.wa), m = canManage();
    var act = m ? '<div class="bt-act">' +
      (st !== 'ditemui' ? '<button class="btn btn-soft" data-bt="st" data-st="ditemui" data-key="' + esc(x.key) + '">✅ Sudah ditemui</button>' : '') +
      (st !== 'arsip' ? '<button class="btn btn-soft" data-bt="st" data-st="arsip" data-key="' + esc(x.key) + '">🗄️ Arsipkan</button>' : '<button class="btn btn-soft" data-bt="st" data-st="baru" data-key="' + esc(x.key) + '">♻️ Pulihkan</button>') +
      '<button class="btn btn-soft" data-bt="catatan" data-key="' + esc(x.key) + '">📝 Catatan</button></div>' : '';
    return '<div class="bt-item"><div class="bt-h"><b>' + esc(x.nama) + '</b><span class="bt-badge st-' + st + '">' + STATUS[st] + '</span></div>' +
      '<div class="bt-m">' + esc(x.kategori || '-') + (x.instansi ? ' · ' + esc(x.instansi) : '') + (x.alamat ? ' · ' + esc(x.alamat) : '') + '</div>' +
      '<div style="margin-top:4px;font-size:13.5px;">' + esc(x.keperluan) + '</div>' +
      ((x.rating || x.saran) ? '<div class="bt-m">' + (x.rating ? '<span style="color:#f59e0b;letter-spacing:1px;">' + bintang(x.rating) + '</span>' : '') + (x.saran ? ' 💬 ' + esc(x.saran) : '') + '</div>' : '') +
      '<div class="bt-m">' + fmt(x.ts) + (x.dituju ? ' · bertemu: ' + esc(x.dituju) : '') + (wl ? ' · <a href="' + wl + '" target="_blank" rel="noopener">WA ' + esc(x.wa) + '</a>' : (x.wa ? ' · ' + esc(x.wa) : '')) + (x.sumber === 'resepsionis' ? ' · dicatat petugas' : '') + '</div>' +
      (x.catatan ? '<div class="bt-m">📝 ' + esc(x.catatan) + '</div>' : '') + act + '</div>';
  }
  function formHtml() {
    if (!canManage()) return '<p style="color:#dc2626;">🔒 Hanya admin yang dapat mencatat tamu.</p>';
    var f = function (id, label, ph, full, max) { return '<div' + (full ? ' class="full"' : '') + '><label class="label">' + label + '</label><input id="' + id + '" class="field" maxlength="' + max + '" placeholder="' + ph + '"></div>'; };
    return '<p class="text-muted" style="font-size:12.5px;margin-bottom:8px;">Untuk tamu yang datang langsung dan dicatat petugas (mis. di meja resepsionis).</p><div class="bt-form">' +
      f('btf-nama', 'Nama Lengkap *', 'Nama tamu', false, 80) + f('btf-wa', 'Nomor WhatsApp', '08…', false, 20) +
      f('btf-instansi', 'Asal Instansi', 'Instansi atau asal', false, 100) + f('btf-alamat', 'Alamat', 'Alamat tamu', false, 150) +
      '<div><label class="label">Kategori *</label><select id="btf-kategori" class="field">' + opts(KATEGORI, '', '-- Pilih kategori --') + '</select></div>' +
      f('btf-dituju', 'Bertemu dengan', 'Kepala madrasah / guru / TU', true, 80) +
      '<div class="full"><label class="label">Keperluan *</label><textarea id="btf-keperluan" class="field" rows="3" maxlength="300" placeholder="Keperluan singkat"></textarea></div>' +
      '<div><label class="label">Penilaian Pelayanan</label><select id="btf-rating" class="field"><option value="">-- Tidak dinilai --</option><option value="5">★★★★★ Sangat baik</option><option value="4">★★★★☆ Baik</option><option value="3">★★★☆☆ Cukup</option><option value="2">★★☆☆☆ Kurang</option><option value="1">★☆☆☆☆ Sangat kurang</option></select></div>' +
      '<div class="full"><label class="label">Kesan / Saran untuk Madrasah</label><textarea id="btf-saran" class="field" rows="2" maxlength="300" placeholder="Opsional"></textarea></div></div>' +
      '<div class="bt-act" style="margin-top:12px;"><button class="btn btn-success" id="btBtnSimpan" data-bt="simpan">💾 SIMPAN</button></div>';
  }
  function rekapHtml() {
    var list = filtered(true), kat = {}, hari = {}, hariTs = {}, tuju = {};
    list.forEach(function (x) {
      var k = x.kategori || 'Lainnya', d = x.ts ? new Date(x.ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-', t = (x.dituju || '').trim();
      kat[k] = (kat[k] || 0) + 1; hari[d] = (hari[d] || 0) + 1; hariTs[d] = Math.max(hariTs[d] || 0, x.ts || 0); if (t) tuju[t] = (tuju[t] || 0) + 1;
    });
    var tbl = function (judul, o, lim, cmp, balik) {
      var ks = Object.keys(o).sort(cmp || function (a, b) { return o[b] - o[a]; })    .slice(0, lim || 99); if (balik) ks.reverse();
      var rows = ks.map(function (k) { return '<tr><td>' + esc(k) + '</td><td style="width:60px;text-align:right;">' + o[k] + '</td></tr>'; }).join('');
      return '<h4 style="margin:12px 0 4px;font-size:14px;">' + judul + '</h4>' + (rows ? '<table class="bt-tbl">' + rows + '</table>' : '<p class="text-muted">-</p>');
    };
    var rated = list.filter(function (x) { return x.rating >= 1 && x.rating <= 5; }), sum = 0, dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    rated.forEach(function (x) { sum += x.rating; dist[x.rating]++; });
    var avg = rated.length ? sum / rated.length : 0;
    var nilai = '<h4 style="margin:12px 0 4px;font-size:14px;">Penilaian pelayanan</h4>' + (rated.length
      ? '<p><b style="font-size:18px;">' + avg.toFixed(1) + '</b> / 5 <span style="color:#f59e0b;">' + bintang(Math.round(avg)) + '</span> dari ' + rated.length + ' penilaian</p><table class="bt-tbl">' +
        [5, 4, 3, 2, 1].map(function (n) { return '<tr><td>' + bintang(n) + '</td><td style="width:60px;text-align:right;">' + dist[n] + '</td></tr>'; }).join('') + '</table>'
      : '<p class="text-muted">Belum ada penilaian.</p>');
    var sar = list.filter(function (x) { return x.saran; }).slice(0, 10);
    var saranHtml = '<h4 style="margin:12px 0 4px;font-size:14px;">Kesan & saran terbaru</h4>' + (sar.length
      ? sar.map(function (x) { return '<div class="bt-item"><div class="bt-m">' + esc(x.nama) + ' · ' + esc(x.kategori || '-') + ' · ' + fmt(x.ts) + (x.rating ? ' · <span style="color:#f59e0b;">' + bintang(x.rating) + '</span>' : '') + '</div><div style="font-size:13.5px;margin-top:3px;">' + esc(x.saran) + '</div></div>'; }).join('')
      : '<p class="text-muted">Belum ada saran pada rentang ini.</p>');
    return '<div class="bt-bar"><select id="btR" class="field">' + rentangHtml() + '</select></div><p><b>' + list.length + '</b> kunjungan pada rentang ini.</p>' +
      tbl('Per kategori', kat) + tbl('Per hari', hari, 31, function (a, b) { return hariTs[b] - hariTs[a]; }) + tbl('Paling sering dituju', tuju, 10) + nilai + saranHtml;
  }
  function tautanHtml() {
    var u = publicUrl();
    return '<p style="font-size:13px;">Bagikan tautan ini atau tempel QR di meja resepsionis. Pengunjung mengisi lewat HP/komputer <b>tanpa login</b>.</p>' +
      '<div class="bt-bar"><input id="btUrl" class="field" readonly value="' + esc(u) + '"><button class="btn btn-soft" data-bt="salin">📋 Salin</button><a class="btn btn-soft" href="' + esc(u) + '" target="_blank" rel="noopener">Buka</a></div>' +
      '<div id="btQr" style="margin:14px 0;"></div><button class="btn btn-soft" data-bt="poster">🖨️ Cetak poster QR</button>' +
      '<h4 style="margin:18px 0 4px;font-size:14px;">📱 Mode tablet meja depan</h4>' +
      '<p class="text-muted" style="font-size:12.5px;margin-bottom:6px;">Untuk tablet/HP yang dipasang tetap di meja resepsionis. Formulir kembali kosong sendiri beberapa detik setelah data terkirim, dan dikosongkan bila tidak ada aktivitas 150 detik, sehingga data tamu sebelumnya tidak terlihat tamu berikutnya.</p>' +
      '<div class="bt-bar"><input id="btUrlT" class="field" readonly value="' + esc(u + '?mode=tablet') + '"><button class="btn btn-soft" data-bt="salin" data-src="btUrlT">📋 Salin</button><a class="btn btn-soft" href="' + esc(u + '?mode=tablet') + '" target="_blank" rel="noopener">Buka</a></div>' +
      '<p class="text-muted" style="font-size:12px;">Tips: buka tautan ini di tablet, lalu kunci layar ke satu halaman (iPad: Guided Access; Android: Sematkan layar) agar tamu tidak keluar dari formulir.</p>' +
      '<p class="text-muted" style="font-size:12px;margin-top:10px;">Halaman publik: file <b>buku-tamu.html</b> harus berada satu folder dengan index.html.</p>';
  }
  function buatQr() {
    var el = $('btQr'); if (!el) return;
    if (typeof QRCode === 'undefined') { el.innerHTML = '<p class="text-muted">Pustaka QR belum termuat.</p>'; return; }
    el.innerHTML = ''; new QRCode(el, { text: publicUrl(), width: 180, height: 180 });
  }

  /* ---------- ekspor & cetak ---------- */
  function csvCell(v) { var s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }
  function unduhCsv() { csvDari(filtered(), 'buku-tamu-' + new Date().toISOString().slice(0, 10)); }
  function csvDari(list, nama) {
    if (!list.length) return toast('Tidak ada data untuk diekspor.', true);
    var head = ['Waktu', 'Nama', 'WhatsApp', 'Instansi', 'Alamat', 'Kategori', 'Bertemu dengan', 'Keperluan', 'Penilaian (1-5)', 'Saran', 'Status', 'Catatan'];
    var rows = list.map(function (x) { return [fmt(x.ts), x.nama, x.wa, x.instansi, x.alamat, x.kategori, x.dituju, x.keperluan, x.rating || '', x.saran, STATUS[statusDari(x)], x.catatan].map(csvCell).join(','); });
    var blob = new Blob(['\ufeff' + head.map(csvCell).join(',') + '\r\n' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function bukaCetak(judul, isi) {
    var w = window.open('', '_blank', 'width=900,height=700'); if (!w) return toast('Popup diblokir browser.', true);
    var css = 'body{font-family:Arial,sans-serif;padding:26px;color:#111;font-size:12.5px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f3f4f6}.kop{text-align:center;border-bottom:3px double #333;padding-bottom:8px;margin-bottom:12px}.kop b{font-size:16px}';
    w.document.write('<html><head><title>' + esc(judul) + '</title><style>' + css + '</style></head><body><div class="kop"><b>' + esc(madInfo().nama || 'Madrasah') + '</b><br>' + esc(madInfo().alamat || '') + '</div>' + isi + '</body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 400);
  }
  function cetakDaftar() {
    var list = filtered(); if (!list.length) return toast('Tidak ada data untuk dicetak.', true);
    var rows = list.map(function (x, i) { return '<tr><td>' + (i + 1) + '</td><td>' + fmt(x.ts) + '</td><td>' + esc(x.nama) + '</td><td>' + esc(x.kategori) + (x.instansi ? '<br>' + esc(x.instansi) : '') + '</td><td>' + esc(x.dituju) + '</td><td>' + esc(x.keperluan) + ((x.rating || x.saran) ? '<br><i>' + (x.rating ? bintang(x.rating) + ' ' : '') + esc(x.saran || '') + '</i>' : '') + '</td><td>' + STATUS[statusDari(x)] + '</td></tr>'; }).join('');
    bukaCetak('Buku Tamu', '<h3 style="text-align:center;">BUKU TAMU</h3><p>Rentang: ' + RENTANG[filt.rentang] + '</p><table><tr><th>No</th><th>Waktu</th><th>Nama</th><th>Kategori / Instansi</th><th>Bertemu</th><th>Keperluan</th><th>Status</th></tr>' + rows + '</table>');
  }
  // QR beresolusi tinggi khusus poster (QR di layar hanya 180px, akan buram bila diperbesar ke kertas).
  function qrPoster(px) {
    if (typeof QRCode === 'undefined') return '';
    var tmp = document.createElement('div');
    try { new QRCode(tmp, { text: publicUrl(), width: px, height: px }); } catch (e) { return ''; }
    var img = tmp.querySelector('img'), cv = tmp.querySelector('canvas');
    return (img && img.src && img.src.indexOf('data:') === 0) ? img.src : (cv ? cv.toDataURL() : '');
  }
  // Logo mengikuti index.html (logo/logo-lembaga.png). Bila logo sidebar sudah termuat (termasuk hasil fallback), pakai itu;
  // jendela cetak butuh URL absolut karena berupa jendela kosong.
  function logoPoster() {
    var el = $('sidebarLogo') || $('dashboardLogo');
    if (el && el.complete && el.naturalWidth > 0 && el.src) return el.src;
    try { return new URL('logo/logo-lembaga.png', document.baseURI).href; } catch (e) { return ''; }
  }
  function cetakPoster() {
    var src = qrPoster(720);
    if (!src) { var img = root.querySelector('#btQr img'), cv = root.querySelector('#btQr canvas'); src = (img && img.src && img.src.indexOf('data:') === 0) ? img.src : (cv ? cv.toDataURL() : ''); }
    if (!src) return toast('QR belum siap, coba lagi.', true);
    var w = window.open('', '_blank', 'width=900,height=1100'); if (!w) return toast('Popup diblokir browser.', true);
    var nama = madInfo().nama || 'Madrasah', alamat = madInfo().alamat || '', logo = logoPoster();
    var css = '@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}' +
      'body{font-family:"Segoe UI",Arial,sans-serif;color:#064e3b;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.p{width:210mm;height:296mm;position:relative;overflow:hidden;background:#ecfdf5;display:flex;flex-direction:column;align-items:center}' +
      '.top{width:100%;background:linear-gradient(135deg,#047857,#10b981);color:#fff;text-align:center;padding:11mm 14mm 30mm}' +
      '.lg{width:30mm;height:30mm;margin:0 auto 4mm;border-radius:50%;background:#fff;padding:2.5mm;box-shadow:0 1mm 4mm rgba(0,0,0,.18)}.lg img{width:100%;height:100%;object-fit:contain;display:block}' +
      '.top .sm{font-size:11pt;letter-spacing:.4em;opacity:.9}.top h2{margin:3mm 0 1mm;font-size:22pt;line-height:1.2;text-transform:uppercase}.top .al{font-size:10pt;opacity:.85}' +
      '.card{margin-top:-20mm;width:150mm;background:#fff;border-radius:8mm;padding:9mm 10mm 8mm;text-align:center;box-shadow:0 2mm 8mm rgba(6,78,59,.18)}' +
      '.card h1{margin:0;font-size:38pt;line-height:1.05;color:#047857;letter-spacing:.01em}.card .sub{margin:2mm 0 6mm;font-size:14pt;color:#374151}' +
      '.qr{display:inline-block;padding:5mm;border:1.2mm solid #059669;border-radius:6mm;background:#fff}.qr img{display:block;width:88mm;height:88mm}' +
      '.pill{display:inline-block;margin-top:6mm;background:#059669;color:#fff;font-weight:700;font-size:14pt;padding:3mm 9mm;border-radius:99mm}' +
      '.steps{display:flex;gap:6mm;width:170mm;margin-top:11mm}.st{flex:1;text-align:center}' +
      '.n{width:12mm;height:12mm;line-height:12mm;margin:0 auto 2mm;border-radius:50%;background:#047857;color:#fff;font-weight:800;font-size:15pt}' +
      '.st b{display:block;font-size:12.5pt;margin-bottom:1mm}.st span{font-size:10.5pt;color:#4b5563}' +
      '.ft{margin-top:auto;width:100%;background:#064e3b;color:#d1fae5;text-align:center;padding:7mm 10mm;font-size:10pt}.ft b{color:#fff;font-size:11pt}.ft .u{margin-top:1.5mm;font-size:9pt;opacity:.85;word-break:break-all}';
    var step = function (n, t, d) { return '<div class="st"><div class="n">' + n + '</div><b>' + t + '</b><span>' + d + '</span></div>'; };
    w.document.write('<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Poster Buku Tamu</title><style>' + css + '</style></head><body><div class="p">' +
      '<div class="top">' + (logo ? '<div class="lg"><img src="' + esc(logo) + '" alt="Logo" onerror="this.parentNode.style.display=\'none\'"></div>' : '') + '<div class="sm">SELAMAT DATANG DI</div><h2>' + esc(nama) + '</h2>' + (alamat ? '<div class="al">' + esc(alamat) + '</div>' : '') + '</div>' +
      '<div class="card"><h1>Buku Tamu Digital</h1><p class="sub">Scan QR untuk mengisi data kunjungan Anda</p>' +
      '<div class="qr"><img src="' + src + '" alt="QR Buku Tamu"></div><div><span class="pill">📷 Arahkan kamera HP ke kode ini</span></div></div>' +
      '<div class="steps">' + step(1, 'Scan QR', 'Buka kamera HP lalu arahkan ke kode di atas') + step(2, 'Isi Data', 'Lengkapi nama, kategori, dan keperluan Anda') + step(3, 'Disambut Petugas', 'Kunjungan tercatat otomatis, petugas akan menemui Anda') + '</div>' +
      '<div class="ft"><b>Tanpa login &bull; Gratis &bull; Waktu kunjungan tercatat otomatis</b><div class="u">Atau buka: ' + esc(publicUrl()) + '</div></div>' +
      '</div></body></html>');
    w.document.close(); w.focus();
    // Cetak setelah logo & QR selesai dimuat (cadangan 2,5 detik bila event load tidak terpicu).
    var done = false, go = function () { if (done) return; done = true; try { w.print(); } catch (e) {} };
    w.addEventListener('load', function () { setTimeout(go, 200); });
    setTimeout(go, 2500);
  }

  /* ---------- arsip per semester ---------- */
  // Ganjil = Juli-Desember tahun Y (TA Y/Y+1); Genap = Januari-Juni tahun Y (TA Y-1/Y).
  function semRange(id) {
    var m = /^(\d{4})-([12])$/.exec(id || ''); if (!m) return null;
    var y = parseInt(m[1], 10), g = m[2] === '1';
    return {
      start: (g ? new Date(y, 6, 1) : new Date(y, 0, 1)).getTime(),
      end: (g ? new Date(y + 1, 0, 1) : new Date(y, 6, 1)).getTime(),
      label: g ? 'Semester Ganjil ' + y + '/' + (y + 1) + ' (Jul-Des ' + y + ')' : 'Semester Genap ' + (y - 1) + '/' + y + ' (Jan-Jun ' + y + ')',
      file: g ? 'buku-tamu-semester-ganjil-' + y + '-' + (y + 1) : 'buku-tamu-semester-genap-' + (y - 1) + '-' + y
    };
  }
  function semList() {
    var n = new Date(), y = n.getFullYear(), g = n.getMonth() >= 6, out = [];
    for (var i = 0; i < 8; i++) {
      var id = y + '-' + (g ? '1' : '2'); out.push({ id: id, label: semRange(id).label });
      if (g) g = false; else { g = true; y--; }
    }
    return out;
  }
  function arsipHtml() {
    if (!canManage()) return '<p style="color:#dc2626;">🔒 Hanya admin yang dapat mengelola arsip.</p>';
    var sems = semList(); if (!arsip.sem) arsip.sem = sems[1].id; // default: semester terakhir yang sudah berakhir
    var r = semRange(arsip.sem), selesai = r.end <= Date.now(), L = arsip.list;
    var o = sems.map(function (s) { return '<option value="' + s.id + '"' + (s.id === arsip.sem ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('');
    var hasil = '<p class="text-muted">Pilih semester, lalu tekan Muat data.</p>';
    if (L) {
      var boleh = selesai && arsip.diunduh && L.length;
      hasil = '<p><b>' + L.length + '</b> tamu pada ' + esc(r.label) + '.</p><div class="bt-act">' +
        '<button class="btn btn-soft" data-bt="arsipUnduh"' + (L.length ? '' : ' disabled') + '>⬇️ Unduh CSV semester</button>' +
        '<button class="btn btn-soft" style="color:#dc2626;" data-bt="arsipHapus"' + (boleh ? '' : ' disabled') + '>🗑️ Hapus data semester</button></div>' +
        '<p class="text-muted" style="font-size:12.5px;margin-top:8px;">' + (!selesai ? 'Semester ini belum berakhir, jadi belum bisa dihapus.' : (!arsip.diunduh ? 'Tombol hapus aktif setelah CSV semester ini diunduh.' : 'CSV sudah diunduh. Simpan file-nya sebelum menghapus.')) + '</p>';
    }
    return '<p class="text-muted" style="font-size:12.5px;margin-bottom:8px;">Unduh arsip per semester (Ganjil: Juli-Desember, Genap: Januari-Juni), lalu hapus data semester itu agar database tetap ringan. Penghapusan bersifat permanen.</p>' +
      '<div class="bt-bar"><select id="btSem" class="field">' + o + '</select><button class="btn btn-soft" data-bt="arsipMuat">🔍 Muat data semester</button></div>' + hasil;
  }
  function arsipMuat(btn) {
    if (!canManage()) return toast('Tidak diizinkan!', true);
    if (!navigator.onLine) return toast('Perlu koneksi internet.', true);
    var r = semRange(arsip.sem); if (!r) return toast('Pilih semester dulu.', true);
    if (isBusy('arsipMuat')) return; setBusy('arsipMuat', btn);
    db.ref('buku_tamu').orderByChild('ts').startAt(r.start).endAt(r.end - 1).once('value').then(function (snap) {
      var arr = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      arr.reverse(); arsip.list = arr; arsip.diunduh = false;
    }).catch(function (err) { arsip.list = null; arsip.diunduh = false; toast('Gagal memuat: ' + (err && err.message || err), true); })
      .then(function () { clearBusy('arsipMuat', btn); renderArsip(); });
  }
  function arsipUnduh() {
    var r = semRange(arsip.sem); if (!r || !arsip.list || !arsip.list.length) return toast('Muat data semester dulu.', true);
    csvDari(arsip.list, r.file); arsip.diunduh = true; renderBody();
  }
  function arsipHapus(btn) {
    if (!canManage()) return toast('Tidak diizinkan!', true);
    var r = semRange(arsip.sem), L = arsip.list;
    if (!r || !L || !L.length) return toast('Muat data semester dulu.', true);
    if (r.end > Date.now()) return toast('Semester ini belum berakhir, belum boleh dihapus.', true);
    if (!arsip.diunduh) return toast('Unduh CSV semester ini dulu sebelum menghapus.', true);
    if (!navigator.onLine) return toast('Perlu koneksi internet.', true);
    var c = prompt('Menghapus PERMANEN ' + L.length + ' data tamu ' + r.label + '.\nPastikan file CSV sudah tersimpan.\nKetik HAPUS untuk melanjutkan:');
    if (c === null || c.trim() !== 'HAPUS') return toast('Penghapusan dibatalkan.');
    if (isBusy('arsipHapus')) return; setBusy('arsipHapus', btn);
    var jobs = [], i; for (i = 0; i < L.length; i += 200) jobs.push(L.slice(i, i + 200));
    jobs.reduce(function (p, part) {
      return p.then(function () { var u = {}; part.forEach(function (x) { u[x.key] = null; }); return db.ref('buku_tamu').update(u); });
    }, Promise.resolve()).then(function () {
      toast('🗑️ ' + L.length + ' data dihapus'); addLog('buku_tamu_hapus', r.label + ' (' + L.length + ' data)');
      arsip.list = null; arsip.diunduh = false;
    }).catch(function (err) { toast('Gagal menghapus: ' + (err && err.message || err), true); })
      .then(function () { clearBusy('arsipHapus', btn); renderArsip(); });
  }

  /* ---------- event ---------- */
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === 'btSem') { arsip.sem = e.target.value; arsip.list = null; arsip.diunduh = false; return renderBody(); }
    if (id === 'btQ') filt.q = e.target.value;
    else if (id === 'btR') { filt.rentang = e.target.value; if (tab === 'rekap') return renderBody(); }
    else if (id === 'btK') filt.kategori = e.target.value;
    else if (id === 'btS') filt.status = e.target.value;
    else return;
    renderList();
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-bt]'); if (!b || !root.contains(b)) return;
    var act = b.getAttribute('data-bt'), key = b.getAttribute('data-key');
    switch (act) {
      case 'tab': tab = b.dataset.tab; render(); break;
      case 'reload': load(true); break;
      case 'csv': unduhCsv(); break;
      case 'arsipMuat': arsipMuat(b); break;
      case 'arsipUnduh': arsipUnduh(); break;
      case 'arsipHapus': arsipHapus(b); break;
      case 'cetak': cetakDaftar(); break;
      case 'poster': cetakPoster(); break;
      case 'salin':
        var u = $(b.getAttribute('data-src') || 'btUrl'); if (!u) break; u.select();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u.value).then(function () { toast('Tautan disalin'); }, function () { document.execCommand('copy'); toast('Tautan disalin'); });
        else { document.execCommand('copy'); toast('Tautan disalin'); }
        break;
      case 'st': ubah(key, 'status', b.dataset.st, 'Status diperbarui'); break;
      case 'catatan':
        var x = byKey(key); if (!x) break;
        var c = prompt('Catatan petugas (maks. 200 karakter):', x.catatan || '');
        if (c !== null) ubah(key, 'catatan', c.trim().slice(0, 200), 'Catatan disimpan');
        break;
      case 'simpan':
        var o = { nama: val('btf-nama'), wa: normWa(val('btf-wa')), instansi: val('btf-instansi'), alamat: val('btf-alamat'), kategori: val('btf-kategori'), dituju: val('btf-dituju'), keperluan: val('btf-keperluan'), rating: parseInt(val('btf-rating'), 10) || 0, saran: val('btf-saran') };
        if (o.nama.length < 2 || !o.kategori || !o.keperluan) return toast('Nama, kategori, dan keperluan wajib diisi!', true);
        if (!waValid(o.wa)) return toast('Nomor WhatsApp hanya boleh berisi angka (9-15 digit), boleh diawali +.', true);
        simpanTamu(o, 'resepsionis', b, function () { tab = 'daftar'; render(); load(false); });
        break;
    }
  }

  /* ---------- pasang ke navigasi ---------- */
  function init() {
    injectCss(); ensurePage();
    window.addEventListener('offline', updateOnline);
    window.addEventListener('online', function () {
      updateOnline();
      if (pageAktif()) toast('Kembali online');
      try { if (canView()) { if (!live) { loadErr = ''; load(false); } } } catch (e) { console.error('[buku-tamu]', e); }
    });
    var orig = window.navigateTo;
    if (typeof orig !== 'function') return;
    window.navigateTo = function (page) {
      var r = orig.apply(this, arguments);
      try { if (canView()) startLive(); updateBadge(); } catch (e) { console.error('[buku-tamu]', e); }
      if (page === PAGE) {
        try { var t = $('pageTitle'); if (t) t.textContent = 'Buku Tamu'; if (!root) { ensurePage(); if (root) root.classList.remove('hidden'); } render(); load(false); }
        catch (e) { console.error('[buku-tamu]', e); }
      }
      return r;
    };
    // Data sesi sebelumnya dibuang saat logout (state modul ini di luar reset logout app.js).
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.logout-btn')) { stopLive(); if (root) root.innerHTML = ''; data = []; loaded = false; loading = false; loadErr = ''; updateBadge(); tab = 'daftar'; filt = { q: '', rentang: 'hari', kategori: '', status: '' }; arsip = { sem: '', list: null, diunduh: false }; }
    }, true);
  }
  init();
})();
