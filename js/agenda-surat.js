/* ============================================================
   SI MAMBA - js/agenda-surat.js  (v3)
   Agenda & REKAP SURAT MASUK / SURAT KELUAR madrasah.
   Tab ke-3 di halaman "Surat & Ijin" (menumpang kerangka tab js/surat-guru.js v2+).

   Fitur:
   - Buku agenda Surat Masuk (no. agenda, tgl diterima, no. surat, tgl surat, asal, perihal,
     disposisi, keterangan) dan Surat Keluar (no., tanggal, no. surat, tujuan, perihal, ket).
   - Surat Keluar juga otomatis memuat surat yang dibuat lewat Surat & Ijin (siswa/guru) sebagai
     baris baca-saja bertanda "otomatis" (bisa dimatikan dengan kotak centang).
   - Filter tahun / bulan / cari, ringkasan bulanan Masuk vs Keluar.
   - Unduh PDF (kop resmi, tanda tangan Kepala), Excel, dan PDF Rekap Tahunan.

   Data manual disimpan di node Firebase BARU 'agenda_surat'. Bila Firebase Rules Anda
   membatasi node yang diizinkan, tambahkan 'agenda_surat' (toast "Gagal simpan" akan muncul).
   Berkas scan surat tidak disimpan (Firebase Storage butuh paket Blaze); gunakan kolom
   Keterangan untuk lokasi arsip fisik (mis. "Map 3 / Rak B").

   PENOMORAN OTOMATIS (v2): Surat Keluar yang dicatat manual mendapat Nomor Surat otomatis (window.SIMambaNomor dari
   js/surat-guru.js; counter Firebase nomor_surat/<tahun>/MI-MU_B) dan pilihan Kode Klasifikasi. No. Agenda / No. Urut
   juga otomatis (counter nomor_surat/<tahun>/agenda_<masuk|keluar>, tidak pernah lebih kecil dari nomor yang sudah ada).
   Nomor Surat MASUK tetap manual (nomor dari pengirim). Semua kolom boleh diketik manual. Dikunci saat Simpan.

   [v3] API untuk modul lain: window.SIMambaAgenda {ambil, catatKeluar, ubahKeluar} (dipakai js/undangan-rapat.js untuk mencatat
   Surat Undangan Rapat sebagai Surat Keluar dengan No. Agenda otomatis; key deterministik 'undangan_<rapatId>' = tidak bisa dobel).
   Baris agenda boleh memuat field tambahan (rapatId, sumber, isi); mengubah baris lewat form Agenda TIDAK menghapus field itu.

   KETERGANTUNGAN (app.js): currentUser, db, toast, escapeHtml, tglLokal, addLog, isAdmin,
   isKepsek, isBusy/setBusy/clearBusy, doubleConfirm, ensureLib, MADRASAH, v4LoadLogoForPdf,
   rekapGambarKop, rekapGambarTtd, rekapNomorHalaman, REKAP_HEAD_STYLE.
   Dimuat SESUDAH js/surat-guru.js.
============================================================ */
(function () {
  'use strict';

  var NODE = 'agenda_surat';
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var S = { jenis: 'masuk', data: [], oto: [], otoSiap: false, tahun: new Date().getFullYear(), bulan: '', cari: '', sertakan: true, memuat: false, edit: null, noManual: false, agManual: false, noToken: 0, agToken: 0, noAuto: '' };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, css) { var e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; }
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function boleh() { try { return !!(isAdmin() || isKepsek()); } catch (e) { return false; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function lokalYMD(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmt(ymd) { if (!ymd) return '-'; var d = new Date(ymd + 'T00:00:00'); return isNaN(d) ? '-' : d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  function thn(ymd) { return parseInt(String(ymd || '').slice(0, 4), 10) || 0; }
  function bln(ymd) { return parseInt(String(ymd || '').slice(5, 7), 10) || 0; }
  function angka(x) { var n = parseInt(String(x || '').replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; }

  // ---------- Data ----------
  function muatManual() {
    return db.ref(NODE).once('value').then(function (snap) {
      var arr = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); }); S.data = arr;
    });
  }
  function muatOtomatis() {                                  // surat yang dibuat di Surat & Ijin -> baris baca-saja
    if (!S.sertakan || S.otoSiap) return Promise.resolve();
    return db.ref('surat').orderByChild('createdAt').limitToLast(300).once('value').then(function (snap) {
      var arr = [];
      snap.forEach(function (c) {
        var s = c.val() || {}, m = /class="nomor-surat">\s*Nomor:\s*([^<]*)</i.exec(String(s.htmlContent || '')), no = m ? m[1].trim() : '';
        if (/^[….\s]*$/.test(no)) no = '';
        arr.push({ key: 'oto:' + c.key, otomatis: true, jenis: 'keluar', tanggal: lokalYMD(s.createdAt || s.tanggal), nomor: no,
          pihak: (s.kelas === 'GURU' ? 'Guru: ' : 'Siswa: ') + (s.siswaName || '-') + (s.kelas && s.kelas !== 'GURU' ? ' (' + s.kelas + ')' : ''),
          perihal: s.jenisLabel || 'Surat', ket: 'Dibuat di aplikasi' });
      });
      S.oto = arr; S.otoSiap = true;
    });
  }
  function muat(paksa) {
    if (paksa) S.otoSiap = false;
    S.memuat = true; render();
    Promise.all([muatManual(), muatOtomatis()]).catch(function (err) {
      toast('Gagal memuat agenda surat: ' + (err && err.message ? err.message : err), true);
    }).then(function () { S.memuat = false; isiTahun(); render(); });
  }
  function semua(jenis) {
    var d = S.data.filter(function (x) { return x.jenis === jenis; });
    if (jenis === 'keluar' && S.sertakan) d = d.concat(S.oto);
    return d;
  }
  function tersaring() {
    var q = S.cari.toLowerCase();
    return semua(S.jenis).filter(function (x) {
      if (S.tahun && thn(x.tanggal) !== S.tahun) return false;
      if (S.bulan && bln(x.tanggal) !== Number(S.bulan)) return false;
      if (q) { var h = [x.noAgenda, x.nomor, x.pihak, x.perihal, x.disposisi, x.ket].join(' ').toLowerCase(); if (h.indexOf(q) < 0) return false; }
      return true;
    }).sort(function (a, b) {
      return String(a.tanggal || '').localeCompare(String(b.tanggal || '')) || (angka(a.noAgenda) - angka(b.noAgenda));
    });
  }
  function labelPeriode() { return (S.bulan ? BULAN[Number(S.bulan) - 1] + ' ' : 'Tahun ') + S.tahun; }

  // ---------- UI ----------
  var KOLOM = {
    masuk: [['No. Agenda', 'noAgenda'], ['Tgl Diterima', 'tanggal', 1], ['No. Surat', 'nomor'], ['Tgl Surat', 'tglSurat', 1], ['Asal Surat', 'pihak'], ['Perihal', 'perihal'], ['Disposisi', 'disposisi'], ['Ket.', 'ket']],
    keluar: [['No.', 'noAgenda'], ['Tanggal', 'tanggal', 1], ['No. Surat', 'nomor'], ['Tujuan', 'pihak'], ['Perihal', 'perihal'], ['Ket.', 'ket']]
  };
  function btn(teks, cls, fn, id) { var b = el('button', cls); b.type = 'button'; b.textContent = teks; if (id) b.id = id; b.addEventListener('click', fn); return b; }
  function kolomIsian(id, label, tipe, css, ph) {
    var w = el('div', null, css || 'flex:1;min-width:150px;'); w.id = 'ag_w_' + id;
    var l = el('label', 'label'); l.textContent = label; l.htmlFor = 'ag_f_' + id;
    var i = el('input', 'field'); i.id = 'ag_f_' + id; i.type = tipe || 'text'; if (ph) i.placeholder = ph;
    w.appendChild(l); w.appendChild(i); return w;
  }
  function kolomKlas() {                                     // kode klasifikasi (hanya Surat Keluar)
    var w = el('div', null, 'flex:1;min-width:150px;'); w.id = 'ag_w_klas';
    var l = el('label', 'label'); l.textContent = 'Kode Klasifikasi Arsip'; l.htmlFor = 'ag_f_klas';
    var s = el('select', 'field'); s.id = 'ag_f_klas';
    var daftar = window.SIMambaNomor ? window.SIMambaNomor.klasPilihan() : [{ kode: 'UM.01', label: 'Umum' }];
    daftar.forEach(function (x) { var o = el('option'); o.value = x.kode; o.textContent = x.kode + ' — ' + x.label; s.appendChild(o); });
    w.appendChild(l); w.appendChild(s); return w;
  }
  function buat(panel) {
    // Baris 1: jenis + filter
    var a = el('div', null, 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:end;');
    a.appendChild(btn('📥 Surat Masuk', 'btn btn-soft', function () { setJenis('masuk'); }, 'ag_t_masuk'));
    a.appendChild(btn('📤 Surat Keluar', 'btn btn-soft', function () { setJenis('keluar'); }, 'ag_t_keluar'));
    panel.appendChild(a);

    var f = el('div', null, 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;align-items:end;');
    var wT = el('div', null, 'flex:1;min-width:110px;'), lT = el('label', 'label'); lT.textContent = 'Tahun'; lT.htmlFor = 'ag_tahun';
    var sT = el('select', 'field'); sT.id = 'ag_tahun'; sT.addEventListener('change', function () { S.tahun = Number(sT.value); render(); });
    wT.appendChild(lT); wT.appendChild(sT);
    var wB = el('div', null, 'flex:1;min-width:130px;'), lB = el('label', 'label'); lB.textContent = 'Bulan'; lB.htmlFor = 'ag_bulan';
    var sB = el('select', 'field'); sB.id = 'ag_bulan';
    var o0 = el('option'); o0.value = ''; o0.textContent = 'Semua bulan'; sB.appendChild(o0);
    BULAN.forEach(function (n, i) { var o = el('option'); o.value = String(i + 1); o.textContent = n; sB.appendChild(o); });
    sB.addEventListener('change', function () { S.bulan = sB.value; render(); });
    wB.appendChild(lB); wB.appendChild(sB);
    var wC = el('div', null, 'flex:2;min-width:160px;'), lC = el('label', 'label'); lC.textContent = 'Cari'; lC.htmlFor = 'ag_cari';
    var iC = el('input', 'field'); iC.id = 'ag_cari'; iC.type = 'search'; iC.placeholder = 'Nomor / asal / tujuan / perihal…';
    iC.addEventListener('input', function () { S.cari = iC.value.trim(); render(); });
    wC.appendChild(lC); wC.appendChild(iC);
    f.appendChild(wT); f.appendChild(wB); f.appendChild(wC); panel.appendChild(f);

    var oto = el('label', null, 'display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:12px;'); oto.id = 'ag_wOto';
    var cb = el('input'); cb.type = 'checkbox'; cb.id = 'ag_oto'; cb.checked = true;
    cb.addEventListener('change', function () { S.sertakan = cb.checked; if (S.sertakan && !S.otoSiap) muat(false); else render(); });
    oto.appendChild(cb); oto.appendChild(document.createTextNode('Sertakan surat yang dibuat lewat Surat & Ijin (siswa/guru) pada Surat Keluar'));
    panel.appendChild(oto);

    var ak = el('div', null, 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;');
    ak.appendChild(btn('➕ Tambah', 'btn btn-primary', function () { tampilForm(null); }, 'ag_btnTambah'));
    ak.appendChild(btn('📥 Download PDF', 'btn btn-success', unduhPDF));
    ak.appendChild(btn('📊 Excel', 'btn btn-soft', unduhExcel));
    ak.appendChild(btn('📅 PDF Rekap Tahunan', 'btn btn-soft', unduhRekapTahunan));
    ak.appendChild(btn('🔄 Muat ulang', 'btn btn-soft', function () { muat(true); }));
    panel.appendChild(ak);

    // Form tambah/ubah
    var fm = el('div', null, 'display:none;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:14px;'); fm.id = 'ag_form';
    var jd = el('h4', null, 'font-weight:700;font-size:14px;margin:0 0 10px;'); jd.id = 'ag_formJudul'; fm.appendChild(jd);
    var g = el('div', null, 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;');
    var wAg = kolomIsian('noagenda', 'No. Agenda', 'text', 'flex:1;min-width:110px;'), wTg = kolomIsian('tanggal', 'Tanggal', 'date');
    var wNo = kolomIsian('nomor', 'Nomor Surat', 'text', null, 'mis. 045/MI-MU/X/2026'), wKl = kolomKlas();
    var inf = el('p', null, 'font-size:11px;color:#6b7280;margin:3px 0 0;'); inf.id = 'ag_nomorInfo'; wNo.appendChild(inf);
    wAg.querySelector('input').addEventListener('input', function (e) { S.agManual = !!e.target.value.trim(); if (!S.agManual) segarkanNomor(); });
    wNo.querySelector('input').addEventListener('input', function (e) { S.noManual = !!e.target.value.trim(); if (!S.noManual) segarkanNomor(); });
    wTg.querySelector('input').addEventListener('change', segarkanNomor);
    wKl.querySelector('select').addEventListener('change', segarkanNomor);
    g.appendChild(wAg); g.appendChild(wTg); g.appendChild(wNo); g.appendChild(wKl);
    g.appendChild(kolomIsian('tglsurat', 'Tanggal Surat', 'date'));
    g.appendChild(kolomIsian('pihak', 'Asal Surat', 'text', 'flex:2;min-width:200px;'));
    g.appendChild(kolomIsian('perihal', 'Perihal', 'text', 'flex:1 1 100%;'));
    g.appendChild(kolomIsian('disposisi', 'Disposisi / Diteruskan kepada', 'text', 'flex:1 1 100%;'));
    g.appendChild(kolomIsian('ket', 'Keterangan (mis. lokasi arsip)', 'text', 'flex:1 1 100%;'));
    fm.appendChild(g);
    var fa = el('div', null, 'display:flex;gap:8px;');
    fa.appendChild(btn('💾 Simpan', 'btn btn-primary', simpan, 'ag_btnSimpan'));
    fa.appendChild(btn('Batal', 'btn btn-secondary', function () { $('ag_form').style.display = 'none'; S.edit = null; }));
    fm.appendChild(fa); panel.appendChild(fm);

    var rk = el('div', null, 'margin-bottom:14px;'); rk.id = 'ag_rekap'; panel.appendChild(rk);
    var ls = el('div'); ls.id = 'ag_list';
    ls.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button[data-aksi]') : null; if (!t) return;
      if (t.dataset.aksi === 'edit') tampilForm(t.dataset.key); else if (t.dataset.aksi === 'hapus') hapus(t.dataset.key);
    });
    panel.appendChild(ls);
  }
  function buka() {
    S.tahun = S.tahun || new Date().getFullYear();
    muat(false);
  }
  function setJenis(j) { S.jenis = j; $('ag_form').style.display = 'none'; S.edit = null; render(); }
  function isiTahun() {
    var sel = $('ag_tahun'); if (!sel) return;
    var set = {}; set[new Date().getFullYear()] = 1;
    S.data.concat(S.oto).forEach(function (x) { var y = thn(x.tanggal); if (y) set[y] = 1; });
    var tahun = Object.keys(set).map(Number).sort(function (a, b) { return b - a; });
    if (tahun.indexOf(S.tahun) < 0) S.tahun = tahun[0];
    sel.innerHTML = ''; tahun.forEach(function (y) { var o = el('option'); o.value = y; o.textContent = y; sel.appendChild(o); });
    sel.value = S.tahun;
  }

  function render() {
    if (!$('ag_list')) return;
    ['masuk', 'keluar'].forEach(function (j) {
      var b = $('ag_t_' + j); if (!b) return;
      b.style.background = j === S.jenis ? '#2563eb' : ''; b.style.color = j === S.jenis ? '#fff' : '';
    });
    $('ag_wOto').style.display = S.jenis === 'keluar' ? 'flex' : 'none';
    $('ag_btnTambah').style.display = boleh() ? '' : 'none';
    if (S.memuat) { $('ag_list').innerHTML = '<p class="text-muted" style="padding:12px;">Memuat agenda surat…</p>'; $('ag_rekap').innerHTML = ''; return; }
    renderRekap(); renderTabel();
  }
  function renderRekap() {
    var masuk = [], keluar = [], i;
    for (i = 0; i < 12; i++) { masuk.push(0); keluar.push(0); }
    semua('masuk').forEach(function (x) { if (thn(x.tanggal) === S.tahun && bln(x.tanggal)) masuk[bln(x.tanggal) - 1]++; });
    semua('keluar').forEach(function (x) { if (thn(x.tanggal) === S.tahun && bln(x.tanggal)) keluar[bln(x.tanggal) - 1]++; });
    var tm = masuk.reduce(function (a, b) { return a + b; }, 0), tk = keluar.reduce(function (a, b) { return a + b; }, 0);
    var h = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;">' +
      '<div style="flex:1;min-width:120px;background:#eff6ff;border-radius:10px;padding:10px;"><div style="font-size:12px;color:#6b7280;">Surat Masuk ' + S.tahun + '</div><div style="font-size:22px;font-weight:700;color:#1d4ed8;">' + tm + '</div></div>' +
      '<div style="flex:1;min-width:120px;background:#ecfdf5;border-radius:10px;padding:10px;"><div style="font-size:12px;color:#6b7280;">Surat Keluar ' + S.tahun + '</div><div style="font-size:22px;font-weight:700;color:#047857;">' + tk + '</div></div></div>' +
      '<details><summary style="cursor:pointer;font-size:13px;font-weight:600;">Ringkasan per bulan</summary><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;"><tr>' +
      ['Bulan', 'Masuk', 'Keluar', 'Total'].map(function (x) { return '<th style="border:1px solid #e5e7eb;padding:4px 8px;background:#f3f4f6;text-align:left;">' + x + '</th>'; }).join('') + '</tr>';
    for (i = 0; i < 12; i++) h += '<tr><td style="border:1px solid #e5e7eb;padding:3px 8px;">' + BULAN[i] + '</td><td style="border:1px solid #e5e7eb;padding:3px 8px;">' + masuk[i] + '</td><td style="border:1px solid #e5e7eb;padding:3px 8px;">' + keluar[i] + '</td><td style="border:1px solid #e5e7eb;padding:3px 8px;">' + (masuk[i] + keluar[i]) + '</td></tr>';
    $('ag_rekap').innerHTML = h + '</table></div></details>';
  }
  function sel(x, k, tgl) { var v = x[k]; return tgl ? fmt(v) : (v == null || v === '' ? '-' : v); }
  function renderTabel() {
    var kol = KOLOM[S.jenis], data = tersaring(), th = 'border:1px solid #e5e7eb;padding:6px 8px;background:#f3f4f6;text-align:left;white-space:nowrap;', td = 'border:1px solid #e5e7eb;padding:6px 8px;vertical-align:top;';
    var h = '<p class="text-muted" style="font-size:12px;margin:0 0 6px;">' + (S.jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar') + ' — ' + esc(labelPeriode()) + ' — ' + data.length + ' surat</p>' +
      '<div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:12px;min-width:640px;"><tr>' +
      kol.map(function (k) { return '<th style="' + th + '">' + esc(k[0]) + '</th>'; }).join('') + (boleh() ? '<th style="' + th + '">Aksi</th>' : '') + '</tr>';
    if (!data.length) h += '<tr><td colspan="' + (kol.length + 1) + '" style="' + td + 'text-align:center;color:#6b7280;padding:20px;">Belum ada data pada periode ini.</td></tr>';
    data.forEach(function (x) {
      h += '<tr>' + kol.map(function (k) {
        var v = x.otomatis && k[1] === 'noAgenda' ? '—' : sel(x, k[1], k[2]);
        if (x.otomatis && k[1] === 'ket') return '<td style="' + td + '"><span style="background:#e0f2fe;color:#075985;border-radius:999px;padding:1px 8px;font-size:11px;">otomatis</span></td>';
        return '<td style="' + td + '">' + esc(v) + '</td>';
      }).join('');
      if (boleh()) {
        h += '<td style="' + td + 'white-space:nowrap;">' + (x.otomatis ? '' :
          '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:12px;" data-aksi="edit" data-key="' + esc(x.key) + '" aria-label="Ubah">✏️</button> ' +
          (isAdmin() ? '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:12px;" data-aksi="hapus" data-key="' + esc(x.key) + '" aria-label="Hapus">🗑️</button>' : '')) + '</td>';
      }
      h += '</tr>';
    });
    $('ag_list').innerHTML = h + '</table></div>';
  }

  // ---------- Form ----------
  function nilai(id) { var e = $('ag_f_' + id); return e ? String(e.value || '').trim() : ''; }
  function setNilai(id, v) { var e = $('ag_f_' + id); if (e) e.value = v == null ? '' : v; }
  function maxAgenda(tahun, jenis) {                         // nomor agenda terbesar yang sudah ada (jenis & tahun ini)
    var mx = 0, jn = jenis || S.jenis;
    S.data.forEach(function (x) { if (x.jenis === jn && thn(x.tanggal) === tahun) mx = Math.max(mx, angka(x.noAgenda)); });
    return mx;
  }
  function kunciAgendaRef(tahun, jenis) { return db.ref('nomor_surat/' + tahun + '/agenda_' + (jenis || S.jenis)); }
  function intipAgenda(tgl) {                                // nomor agenda berikutnya (belum dikunci)
    var y = thn(tgl) || S.tahun, mx = maxAgenda(y);
    return kunciAgendaRef(y).once('value').then(function (snap) { return String(Math.max(parseInt(snap.val(), 10) || 0, mx) + 1); });
  }
  function kunciAgenda(tgl, jenis) {                         // kunci nomor agenda (atomik, tidak lebih kecil dari yang ada)
    var y = thn(tgl) || S.tahun, mx = maxAgenda(y, jenis);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new Error('perangkat sedang offline'));
    return new Promise(function (res, rej) {
      kunciAgendaRef(y, jenis).transaction(function (cur) { return Math.max(parseInt(cur, 10) || 0, mx) + 1; }, function (err, ok, snap) {
        if (err || !ok) return rej(err || new Error('penomoran dibatalkan'));
        res(String(snap.val()));
      });
    });
  }
  function klasDipilih() { var e = $('ag_f_klas'); return (e && e.value) || 'UM.01'; }
  function infoNomor(t, merah) { var e = $('ag_nomorInfo'); if (e) { e.textContent = t || ''; e.style.color = merah ? '#b91c1c' : '#6b7280'; } }
  function segarkanNomor() {                                 // isi nomor otomatis (pratinjau) untuk entri BARU
    if (S.edit) return;
    var masuk = S.jenis === 'masuk', tgl = nilai('tanggal') || tglLokal(), N = window.SIMambaNomor;
    if (!S.agManual) {
      var ta = ++S.agToken;
      intipAgenda(tgl).then(function (n) { if (ta === S.agToken && !S.agManual && !S.edit) setNilai('noagenda', n); })
        .catch(function (e) { console.error('[SI MAMBA] Gagal membaca nomor agenda:', e); });
    }
    if (masuk) { S.noAuto = ''; infoNomor('Nomor surat masuk = nomor dari pengirim; isi manual.'); return; }
    if (S.noManual) { infoNomor('Nomor diisi manual — tidak memakai penomoran otomatis.'); return; }
    if (!N) { infoNomor('Modul penomoran (js/surat-guru.js) belum dimuat. Isi nomor manual.', true); return; }
    var tn = ++S.noToken; infoNomor('Menghitung nomor otomatis…');
    N.intip('surat-keluar', tgl, klasDipilih()).then(function (n) {
      if (tn !== S.noToken || S.noManual || S.edit) return;
      S.noAuto = n; setNilai('nomor', n); infoNomor('🔢 Nomor otomatis. Dikunci saat Simpan; ketik manual bila ingin mengganti.');
    }).catch(function (e) {
      if (tn !== S.noToken) return;
      setNilai('nomor', ''); S.noAuto = '';
      infoNomor('Gagal membaca penomoran (' + (e && e.message ? e.message : e) + '). Isi manual, atau izinkan node "nomor_surat" di Firebase Rules.', true);
    });
  }
  function tampilForm(key) {
    if (!boleh()) return toast('Hanya Admin & Kepala Madrasah!', true);
    var x = key ? S.data.filter(function (d) { return d.key === key; })[0] : null;
    if (key && !x) return toast('Data tidak ditemukan!', true);
    S.edit = key || null;
    var masuk = S.jenis === 'masuk';
    $('ag_formJudul').textContent = (x ? '✏️ Ubah ' : '➕ Tambah ') + (masuk ? 'Surat Masuk' : 'Surat Keluar');
    $('ag_w_tglsurat').style.display = masuk ? '' : 'none';
    $('ag_w_disposisi').style.display = masuk ? '' : 'none';
    $('ag_w_tanggal').querySelector('label').textContent = masuk ? 'Tanggal Diterima' : 'Tanggal Surat';
    $('ag_w_pihak').querySelector('label').textContent = masuk ? 'Asal Surat' : 'Tujuan Surat';
    $('ag_w_noagenda').querySelector('label').textContent = masuk ? 'No. Agenda' : 'No. Urut';
    setNilai('tanggal', x ? x.tanggal : tglLokal());
    setNilai('noagenda', x ? x.noAgenda : '');
    setNilai('nomor', x && x.nomor);
    S.noManual = !!x; S.agManual = !!x; S.noAuto = '';        // entri lama: nomor dipertahankan apa adanya
    $('ag_w_klas').style.display = masuk ? 'none' : '';
    if (x) infoNomor(''); else segarkanNomor(); setNilai('tglsurat', x && x.tglSurat); setNilai('pihak', x && x.pihak);
    setNilai('perihal', x && x.perihal); setNilai('disposisi', x && x.disposisi); setNilai('ket', x && x.ket);
    $('ag_form').style.display = 'block';
    $('ag_f_perihal').focus();
  }
  function simpan() {
    if (!boleh()) return toast('Hanya Admin & Kepala Madrasah!', true);
    var tanggal = nilai('tanggal'), pihak = nilai('pihak'), perihal = nilai('perihal'), masuk = S.jenis === 'masuk';
    if (!tanggal || !pihak || !perihal) return toast('Tanggal, ' + (masuk ? 'asal' : 'tujuan') + ', dan perihal wajib diisi!', true);
    if (isBusy('simpanAgenda')) return toast('Sedang menyimpan...', false, 1500);
    var lama = S.edit ? S.data.filter(function (d) { return d.key === S.edit; })[0] : null, now = new Date().toISOString();
    var b0 = $('ag_btnSimpan'), baru = !S.edit, N = window.SIMambaNomor;
    setBusy('simpanAgenda', b0);
    var kunciAg = (baru && !S.agManual) ? kunciAgenda(tanggal) : Promise.resolve(nilai('noagenda'));
    kunciAg.then(function (noAg) {
      var otoNo = baru && !masuk && !S.noManual && N && nilai('nomor') && nilai('nomor') === S.noAuto;
      return (otoNo ? N.kunci('surat-keluar', tanggal, klasDipilih()) : Promise.resolve(nilai('nomor'))).then(function (noSurat) {
        setNilai('noagenda', noAg); setNilai('nomor', noSurat); S.noAuto = ''; S.noManual = true; S.agManual = true;
        simpanKeFirebase(lama, now, tanggal, pihak, perihal, masuk, b0);
      });
    }).catch(function (e) {
      clearBusy('simpanAgenda', b0);
      toast('❌ Penomoran otomatis gagal: ' + (e && e.message ? e.message : e) + '. Isi nomor manual, atau cek Firebase Rules node nomor_surat.', true);
    });
  }
  function simpanKeFirebase(lama, now, tanggal, pihak, perihal, masuk, b0) {
    var data = {
      jenis: S.jenis, noAgenda: nilai('noagenda'), tanggal: tanggal, tglSurat: masuk ? nilai('tglsurat') : '', nomor: nilai('nomor'),
      pihak: pihak, perihal: perihal, disposisi: masuk ? nilai('disposisi') : '', ket: nilai('ket'), tahun: thn(tanggal),
      dibuatOleh: lama ? (lama.dibuatOleh || '') : currentUser.name, createdAt: lama ? (lama.createdAt || now) : now,
      updatedAt: now, updatedBy: currentUser.name
    };
    if (lama) ['rapatId', 'sumber', 'isi'].forEach(function (k) { if (lama[k] != null) data[k] = lama[k]; });   // field dari modul lain jangan hilang
    var ref = S.edit ? db.ref(NODE + '/' + S.edit) : db.ref(NODE).push(), b = b0;
    ref.set(data, function (err) {
      clearBusy('simpanAgenda', b);
      if (err) return toast('Gagal simpan: ' + err.message, true);
      toast('✅ Agenda surat tersimpan!'); addLog('agenda_surat_' + (S.edit ? 'ubah' : 'tambah'), S.jenis + ' - ' + perihal);
      $('ag_form').style.display = 'none'; S.edit = null; S.tahun = thn(tanggal) || S.tahun; muat(false);
    });
  }
  function hapus(key) {
    if (!isAdmin()) return toast('Hanya Admin!', true);
    if (!doubleConfirm('Hapus agenda surat ini?')) return;
    db.ref(NODE + '/' + key).remove(function (err) {
      if (err) return toast('Gagal: ' + err.message, true);
      toast('✅ Agenda surat dihapus.'); addLog('agenda_surat_hapus', key); muat(false);
    });
  }

  // ---------- Ekspor ----------
  function barisTabel(data) {
    var kol = KOLOM[S.jenis];
    return data.map(function (x, i) {
      return kol.map(function (k) {
        if (x.otomatis && k[1] === 'noAgenda') return String(i + 1);
        var v = k[2] ? (x[k[1]] ? fmt(x[k[1]]) : '-') : (x[k[1]] == null || x[k[1]] === '' ? '-' : String(x[k[1]]));
        return v;
      });
    });
  }
  function namaBerkas(awal) { return awal + '_' + (S.bulan ? BULAN[Number(S.bulan) - 1] + '_' : '') + S.tahun; }
  async function siapPDF(orient) {
    if (typeof rekapGambarKop !== 'function' || typeof rekapNomorHalaman !== 'function') { toast('Modul rekap PDF belum tersedia.', true); return null; }
    try { toast('⏳ Menyiapkan PDF...', false, 2000); await ensureLib('pdf'); }
    catch (e) { toast('❌ Modul PDF belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); return null; }
    return { doc: new window.jspdf.jsPDF(orient, 'mm', 'a4'), logo: await v4LoadLogoForPdf() };
  }
  async function unduhPDF() {
    var data = tersaring(); if (!data.length) return toast('Tidak ada data untuk dicetak.', true);
    var p = await siapPDF('l'); if (!p) return;
    var masuk = S.jenis === 'masuk', judul = masuk ? 'REKAP SURAT MASUK' : 'REKAP SURAT KELUAR';
    var y = rekapGambarKop(p.doc, p.logo, judul, ['Periode: ' + labelPeriode() + '  |  Total: ' + data.length + ' surat']);
    p.doc.autoTable({ startY: y, head: [KOLOM[S.jenis].map(function (k) { return k[0]; })], body: barisTabel(data), theme: 'grid',
      headStyles: REKAP_HEAD_STYLE, styles: { fontSize: 8.5, cellPadding: 1.8, valign: 'top' }, margin: { left: 15, right: 15 } });
    await rekapGambarTtd(p.doc); rekapNomorHalaman(p.doc);
    p.doc.save(namaBerkas(masuk ? 'Rekap_Surat_Masuk' : 'Rekap_Surat_Keluar') + '.pdf');
    toast('📥 PDF berhasil diunduh!'); addLog('download_agenda_surat', S.jenis + ' ' + labelPeriode());
  }
  async function unduhExcel() {
    var data = tersaring(); if (!data.length) return toast('Tidak ada data untuk diekspor.', true);
    try { await ensureLib('xlsx'); } catch (e) { return toast('❌ Modul Excel belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
    var ws = XLSX.utils.aoa_to_sheet([KOLOM[S.jenis].map(function (k) { return k[0]; })].concat(barisTabel(data)));
    ws['!cols'] = KOLOM[S.jenis].map(function (k) { return { wch: k[1] === 'perihal' ? 40 : (k[1] === 'pihak' ? 28 : 16) }; });
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, S.jenis === 'masuk' ? 'Surat Masuk' : 'Surat Keluar');
    XLSX.writeFile(wb, namaBerkas(S.jenis === 'masuk' ? 'Rekap_Surat_Masuk' : 'Rekap_Surat_Keluar') + '.xlsx');
    toast('📊 Excel berhasil diunduh!'); addLog('download_agenda_surat_xlsx', S.jenis + ' ' + labelPeriode());
  }
  async function unduhRekapTahunan() {
    var p = await siapPDF('p'); if (!p) return;
    var masuk = [], keluar = [], i;
    for (i = 0; i < 12; i++) { masuk.push(0); keluar.push(0); }
    semua('masuk').forEach(function (x) { if (thn(x.tanggal) === S.tahun && bln(x.tanggal)) masuk[bln(x.tanggal) - 1]++; });
    semua('keluar').forEach(function (x) { if (thn(x.tanggal) === S.tahun && bln(x.tanggal)) keluar[bln(x.tanggal) - 1]++; });
    var rows = BULAN.map(function (n, k) { return [n, String(masuk[k]), String(keluar[k]), String(masuk[k] + keluar[k])]; });
    var tm = masuk.reduce(function (a, b) { return a + b; }, 0), tk = keluar.reduce(function (a, b) { return a + b; }, 0);
    rows.push(['JUMLAH', String(tm), String(tk), String(tm + tk)]);
    var y = rekapGambarKop(p.doc, p.logo, 'REKAP SURAT MASUK DAN SURAT KELUAR', ['Tahun ' + S.tahun + (S.sertakan ? '  |  termasuk surat yang dibuat lewat aplikasi' : '')]);
    p.doc.autoTable({ startY: y, head: [['Bulan', 'Surat Masuk', 'Surat Keluar', 'Total']], body: rows, theme: 'grid', headStyles: REKAP_HEAD_STYLE,
      styles: { fontSize: 10, cellPadding: 2 }, columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } }, margin: { left: 15, right: 15 },
      didParseCell: function (h) { if (h.row.index === rows.length - 1) h.cell.styles.fontStyle = 'bold'; } });
    await rekapGambarTtd(p.doc); rekapNomorHalaman(p.doc);
    p.doc.save('Rekap_Tahunan_Surat_' + S.tahun + '.pdf');
    toast('📥 PDF berhasil diunduh!'); addLog('download_rekap_tahunan_surat', String(S.tahun));
  }

  // ---------- API untuk modul lain (js/undangan-rapat.js) ----------
  // ambil(key) -> Promise<baris|null>
  // catatKeluar({key, tanggal, buatNomor|nomor, pihak, perihal, ket, rapatId, isi}) -> Promise<baris>
  //   Mengunci No. Agenda (counter atomik) lalu nomor surat (buatNomor dipanggil SESUDAH agenda terkunci), lalu menulis baris
  //   lewat transaction pada key tetap: bila key sudah ada, tidak menimpa (ditolak).
  // ubahKeluar(key, {pihak, perihal, ket, isi}) -> Promise (nomor & tanggal tidak berubah)
  window.SIMambaAgenda = {
    ambil: function (key) {
      return db.ref(NODE + '/' + key).once('value').then(function (s) { var v = s.val(); if (v) v.key = key; return v; });
    },
    catatKeluar: function (o) {
      if (!boleh()) return Promise.reject(new Error('hanya Admin & Kepala Madrasah'));
      if (!o || !o.key || !o.tanggal) return Promise.reject(new Error('data surat tidak lengkap'));
      return muatManual().then(function () { return kunciAgenda(o.tanggal, 'keluar'); }).then(function (noAg) {
        return Promise.resolve(o.nomor || (o.buatNomor ? o.buatNomor() : '')).then(function (noSurat) {
          var now = new Date().toISOString();
          var data = { jenis: 'keluar', noAgenda: noAg, tanggal: o.tanggal, tglSurat: '', nomor: noSurat || '', pihak: o.pihak || '', perihal: o.perihal || '',
            disposisi: '', ket: o.ket || '', tahun: thn(o.tanggal), dibuatOleh: currentUser.name, createdAt: now, updatedAt: now, updatedBy: currentUser.name };
          if (o.rapatId) { data.rapatId = String(o.rapatId); data.sumber = 'undangan-rapat'; }
          if (o.isi) data.isi = String(o.isi);
          return new Promise(function (res, rej) {
            db.ref(NODE + '/' + o.key).transaction(function (cur) { return cur ? undefined : data; }, function (err, ok, snap) {
              if (err) return rej(err);
              if (!ok) return rej(new Error('undangan untuk rapat ini sudah tercatat; tutup lalu buka lagi'));
              var v = snap.val() || data; v.key = o.key; res(v);
            });
          });
        });
      });
    },
    ubahKeluar: function (key, p) {
      if (!boleh()) return Promise.reject(new Error('hanya Admin & Kepala Madrasah'));
      var upd = { updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
      ['pihak', 'perihal', 'ket', 'isi'].forEach(function (k) { if (p && p[k] != null) upd[k] = String(p[k]); });
      return db.ref(NODE + '/' + key).update(upd);
    }
  };

  // ---------- Pasang sebagai tab di Surat & Ijin ----------
  if (window.SIMambaSuratTab) window.SIMambaSuratTab.daftar({ id: 'agenda', label: '📬 Agenda Masuk/Keluar', boleh: boleh, buat: buat, buka: buka });
  else console.warn('[SI MAMBA] agenda-surat.js: js/surat-guru.js (v2+) belum dimuat; tab Agenda tidak muncul.');
})();
