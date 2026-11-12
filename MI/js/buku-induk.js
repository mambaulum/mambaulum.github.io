/* ============================================================
   BUKU INDUK SISWA -- js/buku-induk.js
   Dimuat SETELAH app.js, kredensial.js & menu-hub.js. Modul mandiri seperti buku-tamu.js: halaman dibuat sendiri lewat JS,
   data dimuat sendiri dan TIDAK menyentuh loadAllData().

   DASAR & PRINSIP (UU 27/2022 tentang Pelindungan Data Pribadi -- data anak adalah data pribadi spesifik, Pasal 4 ayat 2):
   - Persetujuan orang tua/wali tertulis atau terekam & dapat dibuktikan (Pasal 22, 24, 25) -> bagian "Persetujuan Orang Tua/Wali".
   - Pemrosesan terbatas & spesifik (Pasal 27-28) -> hanya kolom di FIELDS di bawah; tidak ada KK, penghasilan, kesehatan, foto/berkas.
   - Pengamanan & kerahasiaan (Pasal 35-39) -> Rules mengunci node hanya untuk sesi Admin (tulis+baca) & Kepala (baca); data dimuat PER SISWA;
     TIDAK disimpan di IndexedDB/localStorage/cache offline; setiap lihat/ubah/cetak/hapus dicatat di buku_induk_log.
   - Hak hapus (Pasal 43) -> tombol "Hapus data induk".
   FORMAT KOLOM: kolom di FIELDS dapat disesuaikan dengan format dari Kankemenag (tambah/kurangi di daftar ini + Rules di RULES-buku-induk.json).
   Perlu koneksi internet (sengaja tanpa antrean offline agar data pribadi tidak tertinggal di perangkat).
============================================================ */
(function () {
  'use strict';

  var PAGE = 'buku-induk';
  var MAXLIST = 100;

  // Teks formulir persetujuan (ubah sesuai kebijakan madrasah / arahan Kankemenag).
  var TUJUAN_PERSETUJUAN = 'pencatatan administrasi peserta didik pada Buku Induk Siswa madrasah';
  var MASA_SIMPAN = 'sesuai ketentuan peraturan perundang-undangan tentang kearsipan dan penyelenggaraan pendidikan madrasah yang berlaku';

  var OPT = {
    jk: ['Laki-laki', 'Perempuan'],
    agama: ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya'],
    tinggal: ['Orang tua', 'Wali', 'Kerabat', 'Panti / asrama', 'Lainnya'],
    pend: ['Tidak sekolah', 'SD / MI', 'SMP / MTs', 'SMA / MA / SMK', 'D1-D3', 'S1', 'S2', 'S3'],
    masuk: ['Peserta didik baru', 'Pindahan'],
    hasil: ['Naik kelas', 'Tinggal kelas', 'Lulus'],
    keluar: ['Lulus', 'Pindah (mutasi keluar)', 'Mengundurkan diri', 'Lainnya'],
    bentuk: ['Tertulis', 'Terekam']
  };
  var GROUPS = [
    { id: 'idn', t: '1. Identitas Tambahan' }, { id: 'alm', t: '2. Alamat' }, { id: 'ayh', t: '3. Ayah Kandung' }, { id: 'ibu', t: '4. Ibu Kandung' },
    { id: 'wal', t: '5. Wali (bila ada)' }, { id: 'msk', t: '6. Penerimaan Peserta Didik' }, { id: 'rwy', t: '7. Riwayat Kelas' },
    { id: 'klr', t: '8. Keluar / Lulus' }, { id: 'stj', t: '9. Persetujuan Orang Tua/Wali (UU PDP)' }
  ];
  // t: text | date | select | area. max = batas panjang (juga dipakai di Rules). pola = validasi ringan.
  var FIELDS = [
    { id: 'nism', g: 'idn', l: 'NISM', t: 'text', max: 20, pola: /^\d*$/, pesan: 'NISM hanya angka' },
    { id: 'nik', g: 'idn', l: 'NIK', t: 'text', max: 16, pola: /^(\d{16})?$/, pesan: 'NIK harus 16 angka' },
    { id: 'jk', g: 'idn', l: 'Jenis Kelamin', t: 'select', o: 'jk', max: 20 },
    { id: 'agama', g: 'idn', l: 'Agama', t: 'select', o: 'agama', max: 20 },
    { id: 'warga', g: 'idn', l: 'Kewarganegaraan', t: 'text', max: 40 },
    { id: 'anak_ke', g: 'idn', l: 'Anak ke-', t: 'text', max: 3, pola: /^\d*$/, pesan: 'Anak ke- hanya angka' },
    { id: 'saudara', g: 'idn', l: 'Jumlah saudara kandung', t: 'text', max: 3, pola: /^\d*$/, pesan: 'Jumlah saudara hanya angka' },
    { id: 'tinggal', g: 'idn', l: 'Tinggal bersama', t: 'select', o: 'tinggal', max: 30 },

    { id: 'alamat', g: 'alm', l: 'Alamat (jalan / dusun)', t: 'text', max: 200, full: 1 },
    { id: 'rtrw', g: 'alm', l: 'RT / RW', t: 'text', max: 20 },
    { id: 'desa', g: 'alm', l: 'Desa / Kelurahan', t: 'text', max: 80 },
    { id: 'kec', g: 'alm', l: 'Kecamatan', t: 'text', max: 80 },
    { id: 'kab', g: 'alm', l: 'Kabupaten / Kota', t: 'text', max: 80 },
    { id: 'prov', g: 'alm', l: 'Provinsi', t: 'text', max: 80 },
    { id: 'pos', g: 'alm', l: 'Kode pos', t: 'text', max: 5, pola: /^\d*$/, pesan: 'Kode pos hanya angka' },

    { id: 'ayah_nama', g: 'ayh', l: 'Nama ayah', t: 'text', max: 100 },
    { id: 'ayah_pend', g: 'ayh', l: 'Pendidikan', t: 'select', o: 'pend', max: 30 },
    { id: 'ayah_kerja', g: 'ayh', l: 'Pekerjaan', t: 'text', max: 80 },
    { id: 'ibu_nama', g: 'ibu', l: 'Nama ibu', t: 'text', max: 100 },
    { id: 'ibu_pend', g: 'ibu', l: 'Pendidikan', t: 'select', o: 'pend', max: 30 },
    { id: 'ibu_kerja', g: 'ibu', l: 'Pekerjaan', t: 'text', max: 80 },
    { id: 'wali_nama', g: 'wal', l: 'Nama wali', t: 'text', max: 100 },
    { id: 'wali_hub', g: 'wal', l: 'Hubungan dengan siswa', t: 'text', max: 40 },
    { id: 'wali_kerja', g: 'wal', l: 'Pekerjaan', t: 'text', max: 80 },

    { id: 'masuk_tgl', g: 'msk', l: 'Tanggal diterima', t: 'date', max: 10 },
    { id: 'masuk_jenis', g: 'msk', l: 'Status penerimaan', t: 'select', o: 'masuk', max: 30 },
    { id: 'masuk_kelas', g: 'msk', l: 'Diterima di kelas', t: 'text', max: 20 },
    { id: 'masuk_asal', g: 'msk', l: 'Asal (TK / RA / sekolah sebelumnya)', t: 'text', max: 100, full: 1 },
    { id: 'masuk_alasan', g: 'msk', l: 'Alasan pindah (bila pindahan)', t: 'text', max: 150, full: 1 },

    { id: 'klr_jenis', g: 'klr', l: 'Keterangan', t: 'select', o: 'keluar', max: 40 },
    { id: 'klr_tgl', g: 'klr', l: 'Tanggal', t: 'date', max: 10 },
    { id: 'klr_ke', g: 'klr', l: 'Melanjutkan / pindah ke', t: 'text', max: 100 },
    { id: 'klr_alasan', g: 'klr', l: 'Alasan (bila pindah / mundur)', t: 'text', max: 150 },
    { id: 'ijazah_no', g: 'klr', l: 'Nomor ijazah', t: 'text', max: 40 },
    { id: 'ijazah_tgl', g: 'klr', l: 'Tanggal ijazah', t: 'date', max: 10 },

    { id: 'setuju_tgl', g: 'stj', l: 'Tanggal persetujuan', t: 'date', max: 10 },
    { id: 'setuju_oleh', g: 'stj', l: 'Diberikan oleh (nama orang tua/wali)', t: 'text', max: 100 },
    { id: 'setuju_hub', g: 'stj', l: 'Hubungan dengan siswa', t: 'text', max: 40 },
    { id: 'setuju_bentuk', g: 'stj', l: 'Bentuk persetujuan', t: 'select', o: 'bentuk', max: 20 },
    { id: 'setuju_cat', g: 'stj', l: 'Catatan (lokasi arsip formulir, dsb.)', t: 'text', max: 200, full: 1 }
  ];
  for (var k = 1; k <= 6; k++) {
    FIELDS.push({ id: 'r' + k + '_ta', g: 'rwy', l: 'Kelas ' + k + ' - tahun ajaran', t: 'text', max: 9, pola: /^(\d{4}\/\d{4})?$/, pesan: 'Tahun ajaran format 2024/2025 (kelas ' + k + ')' });
    FIELDS.push({ id: 'r' + k + '_hasil', g: 'rwy', l: 'Kelas ' + k + ' - hasil', t: 'select', o: 'hasil', max: 20 });
  }
  window.__bukuIndukFields = FIELDS.map(function (f) { return { id: f.id, max: f.max }; });   // dipakai pembuat Rules

  var LOG_AKSI = ['lihat', 'ubah', 'cetak', 'cetak_persetujuan', 'hapus'];
  var root = null, idx = null, idxMuat = false, idxGalat = '', cur = null;   // cur = { key, siswa, data, baru }
  var filt = { q: '', kelas: '' }, qTimer = null, sibuk = false;

  /* ---------- util ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    s = String(s == null ? '' : s);
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return s.replace(/[&<>"'`]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
  }
  function canView() { return !!currentUser && (isAdmin() || isKepsek()); }
  function canEdit() { return !!currentUser && isAdmin(); }
  function pageAktif() { return !!(root && root.classList && !root.classList.contains('hidden')); }
  function madInfo() { return (typeof MADRASAH !== 'undefined' && MADRASAH) || {}; }
  function daftarSiswa() { return (typeof allSiswaSemua !== 'undefined' && allSiswaSemua && allSiswaSemua.length) ? allSiswaSemua : ((typeof allSiswa !== 'undefined' && allSiswa) || []); }
  function siswaByKey(key) { return daftarSiswa().filter(function (s) { return s.key === key; })[0]; }
  function tglId(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso || ''; var b = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return parseInt(m[3], 10) + ' ' + b[parseInt(m[2], 10) - 1] + ' ' + m[1]; }
  function hariIni() { try { return tglLokal(); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function injectCss() {
    if ($('biStyle')) return;
    var st = document.createElement('style'); st.id = 'biStyle';
    st.textContent = '.bi-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.bi-bar .field{flex:1;min-width:130px}.bi-tbl{width:100%;border-collapse:collapse;font-size:13px}' +
      '.bi-tbl td,.bi-tbl th{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}.bi-ok{color:#047857}.bi-no{color:#b45309}.bi-warn{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px}' +
      '.bi-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:8px}.bi-form .full{grid-column:1/-1}details.bi-g{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;margin-bottom:8px}' +
      'details.bi-g>summary{cursor:pointer;font-weight:700;font-size:14px}.bi-id{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13.5px;margin-bottom:10px}.bi-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}';
    document.head.appendChild(st);
  }

  /* ---------- akses & data ---------- */
  function siap() {
    if (!canView()) return Promise.reject(new Error('Menu ini hanya untuk Admin dan Kepala Madrasah.'));
    if (typeof isReallyOnline === 'function' && !isReallyOnline()) return Promise.reject(new Error('Buku Induk perlu koneksi internet (data pribadi tidak disimpan offline di perangkat).'));
    if (isAdmin()) return typeof kredAdminSiap === 'function' ? kredAdminSiap() : Promise.reject(new Error('Modul kredensial belum termuat.'));
    return typeof kredKepsekSiap === 'function' ? kredKepsekSiap() : Promise.reject(new Error('Modul kredensial belum termuat.'));
  }
  function oleh() { return (currentUser && (currentUser.name || currentUser.key)) || '-'; }
  function catat(aksi, key) {
    if (LOG_AKSI.indexOf(aksi) < 0) return;
    try { db.ref('buku_induk_log').push({ sk: String(key || '').slice(0, 100), aksi: aksi, oleh: String(oleh()).slice(0, 100), ts: firebase.database.ServerValue.TIMESTAMP }).catch(function () {}); } catch (e) { }
  }
  function muatIndeks(paksa) {
    if (idxMuat && !paksa) return Promise.resolve();
    idxGalat = '';
    return siap().then(function () { return db.ref('buku_induk_indeks').once('value'); }).then(function (snap) {
      idx = snap.val() || {}; idxMuat = true;
    }).catch(function (e) { idx = null; idxMuat = false; idxGalat = (e && e.message) || String(e); });
  }
  function persenTerisi(o) {
    var n = 0, tot = FIELDS.filter(function (f) { return f.g !== 'stj' && f.g !== 'klr' && f.g !== 'wal'; });
    tot.forEach(function (f) { if (o && o[f.id]) n++; });
    return Math.round(100 * n / tot.length);
  }

  /* ---------- tampilan: daftar ---------- */
  function ensurePage() {
    var div = $('page-' + PAGE);
    if (div && root === div) return;
    if (!div) {
      var host = $('mainContent'); if (!host) return;
      div = document.createElement('div'); div.id = 'page-' + PAGE; div.className = 'page-content hidden'; host.appendChild(div);
    }
    root = div;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
  }
  function render() {
    if (!root) return;
    if (!canView()) { root.innerHTML = '<div class="card"><p style="color:#dc2626;">🔒 Menu ini hanya untuk Admin dan Kepala Madrasah.</p></div>'; return; }
    if (cur) return renderForm();
    root.innerHTML = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📕 Buku Induk Siswa</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:10px;">Data induk peserta didik. <b>Rahasia</b> (data pribadi anak, UU 27/2022): hanya Admin &amp; Kepala Madrasah; setiap akses dicatat. ' + (canEdit() ? '' : 'Kepala Madrasah: hanya melihat.') + '</p>' +
      '<div id="biBody"></div></div>';
    renderDaftar();
  }
  function renderDaftar() {
    var b = $('biBody'); if (!b) return;
    if (!idxMuat) {
      b.innerHTML = idxGalat ? '<div class="bi-warn">' + esc(idxGalat) + '</div><button class="btn btn-soft" data-bi="muat">🔄 Coba lagi</button>' : '<p class="text-muted">⏳ Memuat…</p>';
      if (!idxGalat) muatIndeks(false).then(function () { if (pageAktif() && !cur) renderDaftar(); });
      return;
    }
    var kelasList = {}; daftarSiswa().forEach(function (s) { if (s.kelas) kelasList[s.kelas] = 1; });
    var ko = '<option value="">Semua kelas</option>' + Object.keys(kelasList).sort().map(function (k) { return '<option' + (k === filt.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    b.innerHTML = '<div class="bi-bar"><input id="biQ" class="field" placeholder="Cari nama / NISN / NIS…" value="' + esc(filt.q) + '"><select id="biK" class="field">' + ko + '</select>' +
      '<button class="btn btn-soft" data-bi="muat">🔄 Muat ulang</button></div><div id="biList"></div>';
    renderList();
  }
  function renderList() {
    var el = $('biList'); if (!el) return;
    var q = filt.q.toLowerCase();
    var list = daftarSiswa().filter(function (s) {
      if (filt.kelas && s.kelas !== filt.kelas) return false;
      return !q || [s.name, s.nisn, s.nis].join(' ').toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return String(a.kelas).localeCompare(String(b.kelas)) || String(a.name).localeCompare(String(b.name)); });
    if (!list.length) { el.innerHTML = '<p class="text-muted" style="padding:10px 0;">Tidak ada siswa pada filter ini.</p>'; return; }
    var rows = list.slice(0, MAXLIST).map(function (s) {
      var d = (idx && idx[s.key]) || null;
      return '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.kelas) + '</td><td>' + esc(s.nisn || '-') + '</td>' +
        '<td>' + (d ? '<span class="bi-ok">' + (d.pct || 0) + '%</span>' : '<span class="bi-no">belum diisi</span>') + '</td>' +
        '<td>' + (d && d.setuju ? '<span class="bi-ok">✔</span>' : '<span class="bi-no">✖</span>') + '</td>' +
        '<td><button class="btn btn-soft" data-bi="buka" data-key="' + esc(s.key) + '">' + (canEdit() ? 'Buka / isi' : 'Lihat') + '</button></td></tr>';
    }).join('');
    el.innerHTML = '<p class="text-muted" style="font-size:12.5px;margin-bottom:6px;">' + list.length + ' siswa' + (list.length > MAXLIST ? ' (tampil ' + MAXLIST + ' pertama, persempit pencarian)' : '') + '</p>' +
      '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Nama</th><th>Kelas</th><th>NISN</th><th>Terisi</th><th>Persetujuan</th><th></th></tr>' + rows + '</table></div>';
  }

  /* ---------- tampilan: formulir per siswa ---------- */
  function bukaSiswa(key) {
    var s = siswaByKey(key); if (!s) return toast('Siswa tidak ditemukan!', true);
    if (sibuk) return; sibuk = true;
    siap().then(function () { return db.ref('buku_induk/' + key).once('value'); }).then(function (snap) {
      cur = { key: key, siswa: s, data: snap.val() || {}, baru: !snap.exists() };
      catat('lihat', key); render();
    }).catch(function (e) { toast('❌ ' + ((e && e.message) || e), true, 6000); }).then(function () { sibuk = false; });
  }
  function inputHtml(f, v) {
    var id = 'bif-' + f.id, ro = canEdit() ? '' : ' disabled', cls = f.full ? ' class="full"' : '';
    var ctl;
    if (f.t === 'select') ctl = '<select id="' + id + '" class="field"' + ro + '><option value="">-- pilih --</option>' + OPT[f.o].map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    else ctl = '<input id="' + id + '" class="field" type="' + (f.t === 'date' ? 'date' : 'text') + '" maxlength="' + f.max + '" value="' + esc(v || '') + '"' + ro + (f.t === 'text' && f.pola && /\\d/.test(String(f.pola)) ? ' inputmode="numeric"' : '') + '>';
    return '<div' + cls + '><label class="label" for="' + id + '">' + esc(f.l) + '</label>' + ctl + '</div>';
  }
  function renderForm() {
    var s = cur.siswa, d = cur.data || {};
    var grup = GROUPS.map(function (g, i) {
      var isi = FIELDS.filter(function (f) { return f.g === g.id; }).map(function (f) { return inputHtml(f, d[f.id]); }).join('');
      return '<details class="bi-g"' + (i === 0 || g.id === 'stj' ? ' open' : '') + '><summary>' + esc(g.t) + '</summary><div class="bi-form">' + isi + '</div></details>';
    }).join('');
    root.innerHTML = '<div class="card"><button class="btn btn-soft" data-bi="kembali">← Kembali ke daftar</button>' +
      '<h3 style="font-size:16px;font-weight:700;margin:10px 0 6px;">📕 Buku Induk: ' + esc(s.name) + '</h3>' +
      '<div class="bi-id"><b>' + esc(s.name) + '</b> · Kelas ' + esc(s.kelas || '-') + '<br>NIS: ' + esc(s.nis || '-') + ' · NISN: ' + esc(s.nisn || '-') +
      '<br>Tempat, tgl lahir: ' + esc(s.tempatLahir || '-') + ', ' + esc(tglId(s.tglLahir) || '-') + '<br><span class="text-muted" style="font-size:12px;">Data di atas diambil dari menu Siswa (ubah di sana).</span></div>' +
      (d.setuju_tgl && d.setuju_oleh ? '' : '<div class="bi-warn">⚠️ Persetujuan orang tua/wali belum dicatat (UU 27/2022 Pasal 22 &amp; 25). Isi bagian 9 setelah formulir ditandatangani.</div>') +
      grup +
      '<div class="bi-act">' + (canEdit() ? '<button class="btn btn-success" data-bi="simpan">💾 Simpan</button>' : '') +
      '<button class="btn btn-soft" data-bi="cetak">🖨️ Cetak Buku Induk</button><button class="btn btn-soft" data-bi="cetakSetuju">🖨️ Formulir Persetujuan</button>' +
      (canEdit() && !cur.baru ? '<button class="btn btn-soft" style="color:#dc2626;" data-bi="hapus">🗑️ Hapus data induk</button>' : '') + '</div></div>';
  }
  function kumpulkan() {
    var o = {}, err = null;
    FIELDS.forEach(function (f) {
      var el = $('bif-' + f.id), v = el ? String(el.value || '').trim() : '';
      if (v.length > f.max) err = err || (f.l + ' terlalu panjang');
      if (v && f.pola && !f.pola.test(v)) err = err || f.pesan;
      if (v) o[f.id] = v;
    });
    return { o: o, err: err };
  }
  function simpan() {
    if (!canEdit() || !cur || sibuk) return;
    var h = kumpulkan(); if (h.err) return toast('⚠️ ' + h.err, true, 5000);
    if (!Object.keys(h.o).length) return toast('Belum ada data yang diisi.', true);
    if (!(h.o.setuju_tgl && h.o.setuju_oleh) && !confirm('Persetujuan orang tua/wali belum dicatat.\nTetap simpan data induk?')) return;
    sibuk = true;
    h.o._upd = firebase.database.ServerValue.TIMESTAMP; h.o._oleh = String(oleh()).slice(0, 100);
    var ind = { pct: persenTerisi(h.o), setuju: !!(h.o.setuju_tgl && h.o.setuju_oleh), upd: firebase.database.ServerValue.TIMESTAMP };
    var upd = {}; upd['buku_induk/' + cur.key] = h.o; upd['buku_induk_indeks/' + cur.key] = ind;
    siap().then(function () { return db.ref().update(upd); }).then(function () {
      catat('ubah', cur.key);
      cur.data = Object.assign({}, h.o); delete cur.data._upd; cur.baru = false;
      idx = idx || {}; idx[cur.key] = { pct: ind.pct, setuju: ind.setuju };
      try { addLog('buku_induk_ubah', cur.siswa.name); } catch (e) { }
      toast('✅ Buku induk disimpan'); render();
    }).catch(function (e) { toast('❌ Gagal menyimpan: ' + ((e && e.message) || e), true, 6000); }).then(function () { sibuk = false; });
  }
  function hapus() {
    if (!canEdit() || !cur || sibuk) return;
    var c = prompt('Menghapus PERMANEN data buku induk ' + cur.siswa.name + ' (data identitas siswa di menu Siswa tidak ikut terhapus).\nCetak/arsipkan dulu bila masih diperlukan.\nKetik HAPUS untuk melanjutkan:');
    if (c === null || c.trim() !== 'HAPUS') return toast('Penghapusan dibatalkan.');
    sibuk = true;
    var upd = {}; upd['buku_induk/' + cur.key] = null; upd['buku_induk_indeks/' + cur.key] = null;
    siap().then(function () { return db.ref().update(upd); }).then(function () {
      catat('hapus', cur.key); try { addLog('buku_induk_hapus', cur.siswa.name); } catch (e) { }
      if (idx) delete idx[cur.key];
      toast('🗑️ Data induk dihapus'); cur = null; render();
    }).catch(function (e) { toast('❌ Gagal menghapus: ' + ((e && e.message) || e), true, 6000); }).then(function () { sibuk = false; });
  }

  /* ---------- cetak ---------- */
  function bukaDokumen(html, fitur) {
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    var w = window.open(url, '_blank', fitur);
    if (!w) { URL.revokeObjectURL(url); return toast('Popup diblokir browser.', true); }
    var done = false, go = function () { if (done) return; done = true; try { w.focus(); w.print(); } catch (e) { } };
    try { w.addEventListener('load', function () { setTimeout(go, 300); }); } catch (e) { }
    setTimeout(go, 2500); setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  var CSS = 'body{font-family:Arial,sans-serif;padding:22px;color:#111;font-size:12.5px}table{width:100%;border-collapse:collapse;margin-bottom:8px}td,th{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f3f4f6}' +
    '.kop{text-align:center;border-bottom:3px double #333;padding-bottom:8px;margin-bottom:12px}.kop b{font-size:16px}h3{text-align:center;margin:8px 0}h4{margin:12px 0 4px;font-size:13px}.k{width:34%}.ttd{display:flex;justify-content:space-between;margin-top:30px}.ttd div{width:44%;text-align:center}.ft{margin-top:14px;font-size:10.5px;color:#555}';
  function kop() { return '<div class="kop"><b>' + esc(madInfo().nama || 'Madrasah') + '</b><br>' + esc(madInfo().alamat || '') + '</div>'; }
  function cetak() {
    if (!cur) return;
    var s = cur.siswa, d = cur.data || {};
    var baris = function (l, v) { return '<tr><td class="k">' + esc(l) + '</td><td>' + esc(v || '') + '</td></tr>'; };
    var idn = '<h4>A. Identitas Peserta Didik</h4><table>' + baris('Nama lengkap', s.name) + baris('Kelas', s.kelas) + baris('NIS', s.nis) + baris('NISN', s.nisn) +
      baris('Tempat, tanggal lahir', (s.tempatLahir || '') + (s.tglLahir ? ', ' + tglId(s.tglLahir) : '')) + FIELDS.filter(function (f) { return f.g === 'idn'; }).map(function (f) { return baris(f.l, d[f.id]); }).join('') + '</table>';
    var blok = function (huruf, gid, judul) { return '<h4>' + huruf + '. ' + judul + '</h4><table>' + FIELDS.filter(function (f) { return f.g === gid; }).map(function (f) { return baris(f.l, f.t === 'date' ? tglId(d[f.id]) : d[f.id]); }).join('') + '</table>'; };
    var rw = '<h4>G. Riwayat Kelas</h4><table><tr><th>Kelas</th><th>Tahun ajaran</th><th>Hasil</th></tr>' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<tr><td>' + n + '</td><td>' + esc(d['r' + n + '_ta'] || '') + '</td><td>' + esc(d['r' + n + '_hasil'] || '') + '</td></tr>'; }).join('') + '</table>';
    var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Buku Induk - ' + esc(s.name) + '</title><style>' + CSS + '</style></head><body>' + kop() + '<h3>BUKU INDUK SISWA</h3>' + idn +
      blok('B', 'alm', 'Alamat') + blok('C', 'ayh', 'Ayah Kandung') + blok('D', 'ibu', 'Ibu Kandung') + blok('E', 'wal', 'Wali') + blok('F', 'msk', 'Penerimaan Peserta Didik') + rw + blok('H', 'klr', 'Keluar / Lulus') +
      '<div class="ttd"><div>Wali Kelas / Operator<br><br><br><br>(................................)</div><div>Kepala Madrasah<br><br><br><br>(................................)</div></div>' +
      '<p class="ft">DOKUMEN RAHASIA: memuat data pribadi anak (UU No. 27 Tahun 2022). Dicetak oleh ' + esc(oleh()) + ' pada ' + esc(tglId(hariIni())) + '. Simpan dan musnahkan sesuai ketentuan.</p></body></html>';
    catat('cetak', cur.key); bukaDokumen(html, 'width=900,height=1000');
  }
  function cetakSetuju() {
    if (!cur) return;
    var s = cur.siswa, nm = madInfo().nama || 'Madrasah';
    var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Persetujuan - ' + esc(s.name) + '</title><style>' + CSS + 'p{line-height:1.55}</style></head><body>' + kop() +
      '<h3>SURAT PERSETUJUAN ORANG TUA / WALI<br>ATAS PEMROSESAN DATA PRIBADI PESERTA DIDIK</h3>' +
      '<p>Yang bertanda tangan di bawah ini:</p><table><tr><td class="k">Nama orang tua / wali</td><td>&nbsp;</td></tr><tr><td class="k">Hubungan dengan peserta didik</td><td>&nbsp;</td></tr><tr><td class="k">Alamat</td><td>&nbsp;</td></tr></table>' +
      '<p>selaku orang tua / wali dari:</p><table>' + '<tr><td class="k">Nama peserta didik</td><td>' + esc(s.name) + '</td></tr><tr><td class="k">Kelas</td><td>' + esc(s.kelas || '') + '</td></tr><tr><td class="k">NISN</td><td>' + esc(s.nisn || '') + '</td></tr></table>' +
      '<p>menyatakan <b>MENYETUJUI</b> ' + esc(nm) + ' memproses data pribadi anak saya untuk <b>' + esc(TUJUAN_PERSETUJUAN) + '</b>, dengan ketentuan:</p>' +
      '<ol><li>Data yang diproses: identitas, alamat, data orang tua/wali, riwayat penerimaan, riwayat kelas, dan keterangan keluar/lulus.</li>' +
      '<li>Data dijaga kerahasiaannya, hanya diakses petugas yang berwenang, dan tidak diberikan kepada pihak lain kecuali diwajibkan peraturan perundang-undangan.</li>' +
      '<li>Data disimpan ' + esc(MASA_SIMPAN) + ', kemudian dihapus atau dimusnahkan.</li>' +
      '<li>Saya berhak meminta akses dan salinan data, memperbaiki data yang keliru, meminta penghapusan, serta menarik kembali persetujuan ini sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</li></ol>' +
      '<p>Demikian surat persetujuan ini dibuat dengan sebenarnya.</p>' +
      '<div class="ttd"><div>Petugas madrasah<br><br><br><br>(................................)</div><div>............................, ....................... 20....<br>Orang tua / wali<br><br><br><br>(................................)</div></div></body></html>';
    catat('cetak_persetujuan', cur.key); bukaDokumen(html, 'width=900,height=1000');
  }

  /* ---------- event ---------- */
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === 'biQ') { filt.q = e.target.value; clearTimeout(qTimer); qTimer = setTimeout(renderList, 200); }
    else if (id === 'biK') { filt.kelas = e.target.value; renderList(); }
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-bi]'); if (!b || !root.contains(b)) return;
    switch (b.getAttribute('data-bi')) {
      case 'buka': bukaSiswa(b.getAttribute('data-key')); break;
      case 'kembali': cur = null; render(); break;
      case 'muat': idxMuat = false; idxGalat = ''; render(); break;
      case 'simpan': simpan(); break;
      case 'hapus': hapus(); break;
      case 'cetak': cetak(); break;
      case 'cetakSetuju': cetakSetuju(); break;
    }
  }

  /* ---------- reset state (logout) ---------- */
  function resetState() {
    clearTimeout(qTimer); cur = null; idx = null; idxMuat = false; idxGalat = ''; filt = { q: '', kelas: '' }; sibuk = false;
    if (root) root.innerHTML = '';   // data pribadi tidak boleh tertinggal di DOM untuk pengguna berikutnya
  }
  window.bukuIndukResetState = resetState;

  function init() {
    injectCss(); ensurePage();
    var origLogout = window.logout;
    if (typeof origLogout === 'function' && !origLogout.__bi) {
      var wl = function () { try { return origLogout.apply(this, arguments); } finally { try { resetState(); } catch (e) { console.error('[buku-induk]', e); } } };
      wl.__bi = true; window.logout = wl;
    }
    var orig = window.navigateTo;
    if (typeof orig !== 'function') return;
    window.navigateTo = function (page) {
      var r = orig.apply(this, arguments);
      if (page === PAGE) {
        try {
          var t = $('pageTitle'); if (t) t.textContent = 'Buku Induk Siswa';
          if (!root) { ensurePage(); if (root) root.classList.remove('hidden'); }
          render();
        } catch (e) { console.error('[buku-induk]', e); }
      } else if (cur || idxMuat) { resetState(); }   // keluar dari halaman -> kosongkan data pribadi dari memori & DOM
      return r;
    };
  }
  init();
})();
