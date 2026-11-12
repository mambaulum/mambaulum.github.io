/* ============================================================
   BUKU INDUK SISWA -- js/buku-induk.js
   Dimuat SETELAH app.js, kredensial.js & menu-hub.js. Modul mandiri seperti buku-tamu.js: halaman dibuat sendiri lewat JS,
   data dimuat sendiri dan TIDAK menyentuh loadAllData().

   DASAR & PRINSIP (UU 27/2022 tentang Pelindungan Data Pribadi -- data anak adalah data pribadi spesifik, Pasal 4 ayat 2; PP 33/2026 = peraturan pelaksana):
   - Persetujuan orang tua/wali wajib untuk data anak (Pasal 25), tertulis/terekam & dapat dibuktikan -> bagian "Persetujuan Orang Tua/Wali".
   - Pemrosesan terbatas & spesifik -> hanya kolom di FIELDS di bawah; tidak ada KK, penghasilan, kesehatan, foto/berkas.
   - Pengamanan & kerahasiaan -> Rules mengunci node hanya untuk sesi Admin (tulis+baca) & Kepala (baca); data dimuat PER SISWA;
     TIDAK disimpan di IndexedDB/localStorage/cache offline; setiap lihat/ubah/cetak/hapus dicatat di buku_induk_log.
   - Hak hapus/penarikan persetujuan -> tombol "Hapus data induk".
   FORMAT KOLOM: kolom di FIELDS dapat disesuaikan dengan format dari Kankemenag (tambah/kurangi di daftar ini + Rules di RULES-buku-induk.json).
   Perlu koneksi internet (sengaja tanpa antrean offline agar data pribadi tidak tertinggal di perangkat).

   V2: tab "Rekap per kelas" (memakai buku_induk_indeks saja, tanpa membuka isi data) & tab "Impor CSV" (Admin). Impor menulis per-kolom
   (sel kosong = tidak diubah), tidak menimpa isian lama kecuali dicentang, dan memakai path/field/aksi log yang SAMA dengan simpan manual -> Rules tidak berubah.
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
    { id: 'setuju_cat', g: 'stj', l: 'Catatan (butir yang tidak disetujui, lokasi arsip formulir, dsb.)', t: 'text', max: 200, full: 1 }
  ];
  for (var k = 1; k <= 6; k++) {
    FIELDS.push({ id: 'r' + k + '_ta', g: 'rwy', l: 'Kelas ' + k + ' - tahun ajaran', t: 'text', max: 9, pola: /^(\d{4}\/\d{4})?$/, pesan: 'Tahun ajaran format 2024/2025 (kelas ' + k + ')' });
    FIELDS.push({ id: 'r' + k + '_hasil', g: 'rwy', l: 'Kelas ' + k + ' - hasil', t: 'select', o: 'hasil', max: 20 });
  }
  window.__bukuIndukFields = FIELDS.map(function (f) { return { id: f.id, max: f.max }; });   // dipakai pembuat Rules

  var LOG_AKSI = ['lihat', 'ubah', 'cetak', 'cetak_persetujuan', 'hapus'];
  var root = null, idx = null, idxMuat = false, idxGalat = '', cur = null, tab = 'daftar', imp = null;   // cur = { key, siswa, data, baru }
  var filt = { q: '', kelas: '', st: '' }, qTimer = null, sibuk = false;

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
  function aktif(s) { return !s || s.aktif !== false; }
  function namaKelas(s) { return (s && s.kelas) || '(tanpa kelas)'; }
  function urutKelas(a, b) { return String(a).localeCompare(String(b), 'id', { numeric: true }); }
  function isNum(f) { return f.t === 'text' && ['nism', 'nik', 'anak_ke', 'saudara', 'pos'].indexOf(f.id) > -1; }   // kolom khusus angka
  function tglId(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso || ''; var b = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return parseInt(m[3], 10) + ' ' + b[parseInt(m[2], 10) - 1] + ' ' + m[1]; }
  function hariIni() { try { return tglLokal(); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function injectCss() {
    if ($('biStyle')) return;
    var st = document.createElement('style'); st.id = 'biStyle';
    st.textContent = '.bi-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.bi-bar .field{flex:1;min-width:130px}.bi-tbl{width:100%;border-collapse:collapse;font-size:13px}' +
      '.bi-tbl td,.bi-tbl th{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}.bi-ok{color:#047857}.bi-no{color:#b45309}.bi-warn{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px}' +
      '.bi-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:8px}.bi-form .full{grid-column:1/-1}details.bi-g{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;margin-bottom:8px}' +
      'details.bi-g>summary{cursor:pointer;font-weight:700;font-size:14px}.bi-err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px}.bi-prog{background:#e5e7eb;border-radius:6px;height:9px;min-width:90px;overflow:hidden}.bi-prog>i{display:block;height:100%;background:#059669}.bi-id{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13.5px;margin-bottom:10px}.bi-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}';
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
    var n = 0, tot = FIELDS.filter(function (f) { return f.g !== 'stj' && f.g !== 'klr' && f.g !== 'wal' && f.g !== 'rwy' && f.id !== 'masuk_alasan'; });   // riwayat kelas & alasan pindah tidak wajib untuk semua siswa
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
    if (tab === 'impor' && !canEdit()) tab = 'daftar';
    var tabs = [['daftar', '📋 Daftar'], ['rekap', '📊 Rekap per kelas']];
    if (canEdit()) tabs.push(['impor', '📥 Impor CSV']);
    root.innerHTML = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📕 Buku Induk Siswa</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:10px;">Data induk peserta didik. <b>Rahasia</b> (data pribadi anak, UU 27/2022): hanya Admin &amp; Kepala Madrasah; setiap akses dicatat. ' + (canEdit() ? '' : 'Kepala Madrasah: hanya melihat.') + '</p>' +
      '<div class="bi-bar">' + tabs.map(function (t) { return '<button class="btn ' + (t[0] === tab ? 'btn-success' : 'btn-soft') + '" data-bi="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="biBody"></div></div>';
    if (tab === 'rekap') renderRekap(); else if (tab === 'impor') renderImpor(); else renderDaftar();
  }
  // true bila indeks sudah termuat; kalau belum, tampilkan "memuat"/galat dan panggil ulang tampilan `nama` setelah selesai.
  function idxSiap(ulang, nama) {
    var b = $('biBody'); if (!b) return false;
    if (idxMuat) return true;
    if (idxGalat) { b.innerHTML = '<div class="bi-warn">' + esc(idxGalat) + '</div><button class="btn btn-soft" data-bi="muat">🔄 Coba lagi</button>'; return false; }
    b.innerHTML = '<p class="text-muted">⏳ Memuat…</p>';
    muatIndeks(false).then(function () { if (pageAktif() && !cur && tab === nama && $('biBody')) ulang(); });
    return false;
  }
  function renderDaftar() {
    var b = $('biBody'); if (!b || !idxSiap(renderDaftar, 'daftar')) return;
    var kelasList = {}; daftarSiswa().forEach(function (s) { kelasList[namaKelas(s)] = 1; });
    var ko = '<option value="">Semua kelas</option>' + Object.keys(kelasList).sort(urutKelas).map(function (k) { return '<option' + (k === filt.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    var so = [['', 'Semua status'], ['belum', 'Belum diisi'], ['kurang', 'Belum lengkap (<100%)'], ['stj', 'Belum ada persetujuan']].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === filt.st ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
    b.innerHTML = '<div class="bi-bar"><input id="biQ" class="field" placeholder="Cari nama / NISN / NIS…" value="' + esc(filt.q) + '"><select id="biK" class="field">' + ko + '</select><select id="biS" class="field">' + so + '</select>' +
      '<button class="btn btn-soft" data-bi="muat">🔄 Muat ulang</button></div><div id="biList"></div>';
    renderList();
  }
  function lolosStatus(s) {
    if (!filt.st) return true;
    if (!aktif(s)) return false;   // filter status hanya untuk siswa aktif (sama dengan tab Rekap)
    var d = idx && idx[s.key];
    if (filt.st === 'belum') return !d;
    if (filt.st === 'kurang') return !d || (d.pct || 0) < 100;
    if (filt.st === 'stj') return !(d && d.setuju);
    return true;
  }
  function renderList() {
    var el = $('biList'); if (!el) return;
    var q = filt.q.toLowerCase();
    var list = daftarSiswa().filter(function (s) {
      if (filt.kelas && namaKelas(s) !== filt.kelas) return false;
      if (!lolosStatus(s)) return false;
      return !q || [s.name, s.nisn, s.nis].join(' ').toLowerCase().indexOf(q) > -1;
    }).sort(function (a, b) { return urutKelas(namaKelas(a), namaKelas(b)) || String(a.name).localeCompare(String(b.name)); });
    if (!list.length) { el.innerHTML = '<p class="text-muted" style="padding:10px 0;">Tidak ada siswa pada filter ini.</p>'; return; }
    var rows = list.slice(0, MAXLIST).map(function (s) {
      var d = (idx && idx[s.key]) || null;
      return '<tr><td>' + esc(s.name) + (aktif(s) ? '' : ' <span class="text-muted" style="font-size:11px;">(nonaktif)</span>') + '</td><td>' + esc(s.kelas) + '</td><td>' + esc(s.nisn || '-') + '</td>' +
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
    else ctl = '<input id="' + id + '" class="field" type="' + (f.t === 'date' ? 'date' : 'text') + '" maxlength="' + f.max + '" value="' + esc(v || '') + '"' + ro + (isNum(f) ? ' inputmode="numeric"' : '') + '>';
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
      (d.setuju_tgl && d.setuju_oleh ? '' : '<div class="bi-warn">⚠️ Persetujuan orang tua/wali belum dicatat (UU 27/2022 &amp; PP 33/2026). Isi bagian 9 setelah formulir ditandatangani.</div>') +
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
    var kotak = '<td style="text-align:center;width:11%;">&#9744;</td>';
    var butir = function (no, judul, isi) { return '<tr><td style="text-align:center;width:5%;">' + no + '</td><td><b>' + judul + '</b><br>' + isi + '</td>' + kotak + kotak + '</tr>'; };
    var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Persetujuan - ' + esc(s.name) + '</title><style>' + CSS + 'p,li{line-height:1.5}ol{margin:4px 0 8px 18px;padding:0}.kecil{font-size:11.5px}</style></head><body>' + kop() +
      '<h3>SURAT PERSETUJUAN ORANG TUA / WALI<br>ATAS PEMROSESAN DATA PRIBADI PESERTA DIDIK</h3>' +
      '<p>Yang bertanda tangan di bawah ini:</p><table><tr><td class="k">Nama orang tua / wali</td><td>&nbsp;</td></tr><tr><td class="k">Hubungan dengan peserta didik</td><td>&nbsp;</td></tr><tr><td class="k">Alamat</td><td>&nbsp;</td></tr></table>' +
      '<p>selaku orang tua / wali dari:</p><table><tr><td class="k">Nama peserta didik</td><td>' + esc(s.name) + '</td></tr><tr><td class="k">Kelas</td><td>' + esc(s.kelas || '') + '</td></tr><tr><td class="k">NISN</td><td>' + esc(s.nisn || '') + '</td></tr></table>' +
      '<p>Pengendali data pribadi: <b>' + esc(nm) + '</b>. Dengan ini saya menyatakan <b>setuju / tidak setuju</b> (beri tanda &#10003; pada kolom yang sesuai) terhadap pemrosesan data berikut:</p>' +
      '<table><tr><th>No</th><th>Pemrosesan data dan tujuannya</th><th>Setuju</th><th>Tidak setuju</th></tr>' +
      butir(1, 'Data induk peserta didik', 'Identitas, alamat, data orang tua/wali, riwayat penerimaan, riwayat kelas, serta keterangan keluar/lulus, untuk ' + esc(TUJUAN_PERSETUJUAN) + '.') +
      butir(2, 'Hasil belajar peserta didik', 'Nilai, kehadiran, dan sikap, untuk pencatatan administrasi, penyusunan raport, dan laporan perkembangan belajar kepada orang tua/wali.') +
      butir(3, 'Nomor HP / WhatsApp orang tua/wali', 'Nomor: <b>' + esc(s.noWaOrtu || '') + '</b> <span class="kecil">(tulis ulang bila berbeda: ........................................)</span><br>Dipakai untuk menghubungi saya: informasi pembelajaran, pengingat infaq/iuran, edaran dan undangan madrasah, serta pemberitahuan lain tentang anak saya.') +
      butir(4, 'Akses Portal Orang Tua', 'Nomor HP/WhatsApp di atas dipakai sebagai kunci akses saya untuk melihat kehadiran, nilai, dan informasi anak saya di aplikasi madrasah.') +
      '</table>' +
      '<p><b>Ketentuan:</b></p><ol>' +
      '<li>Data dijaga kerahasiaannya, hanya diakses petugas/guru yang berwenang, dan tidak diberikan kepada pihak lain kecuali diwajibkan peraturan perundang-undangan.</li>' +
      '<li>Data disimpan ' + esc(MASA_SIMPAN) + ', kemudian dihapus atau dimusnahkan.</li>' +
      '<li>Butir yang tidak saya setujui tidak diproses untuk tujuan butir tersebut, kecuali diwajibkan peraturan perundang-undangan.</li>' +
      '<li>Saya berhak meminta akses dan salinan data, memperbaiki data yang keliru, meminta penghapusan atau penghentian pemrosesan, serta <b>menarik kembali persetujuan ini sewaktu-waktu</b> dengan menyampaikannya kepada wali kelas atau Kepala Madrasah, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi beserta peraturan pelaksanaannya.</li>' +
      '<li>Saat anak tidak lagi berstatus anak menurut peraturan yang berlaku, madrasah akan meminta persetujuan langsung dari yang bersangkutan.</li></ol>' +
      '<p>Demikian surat persetujuan ini dibuat dengan sebenarnya, tanpa paksaan.</p>' +
      '<div class="ttd"><div>Petugas madrasah<br><br><br><br>(................................)</div><div>............................, ....................... 20....<br>Orang tua / wali<br><br><br><br>(................................)</div></div>' +
      '<p class="ft">Formulir ini disimpan sebagai bukti persetujuan. Catat tanggal dan nama pemberi persetujuan pada bagian 9 Buku Induk; tulis butir yang tidak disetujui pada kolom Catatan.</p></body></html>';
    catat('cetak_persetujuan', cur.key); bukaDokumen(html, 'width=900,height=1000');
  }

  /* ---------- v2: rekap kelengkapan per kelas ---------- */
  // Hanya memakai buku_induk_indeks (persen terisi & status persetujuan) -> tidak membuka isi data pribadi siswa.
  function rekapKelas() {
    var per = {};
    daftarSiswa().forEach(function (s) {
      if (!aktif(s)) return;
      var k = namaKelas(s), r = per[k] || (per[k] = { kelas: k, n: 0, isi: 0, sum: 0, penuh: 0, stj: 0 });
      var d = idx && idx[s.key]; r.n++;
      if (d) { var p = +d.pct || 0; r.isi++; r.sum += p; if (p >= 100) r.penuh++; if (d.setuju) r.stj++; }
    });
    var list = Object.keys(per).sort(urutKelas).map(function (k) { return per[k]; });
    var tot = { kelas: 'Semua kelas', n: 0, isi: 0, sum: 0, penuh: 0, stj: 0 };
    list.forEach(function (r) { ['n', 'isi', 'sum', 'penuh', 'stj'].forEach(function (f) { tot[f] += r[f]; }); });
    return { list: list, tot: tot };
  }
  function renderRekap() {
    var b = $('biBody'); if (!b || !idxSiap(renderRekap, 'rekap')) return;
    var rk = rekapKelas();
    if (!rk.tot.n) { b.innerHTML = '<p class="text-muted">Belum ada siswa aktif.</p>'; return; }
    var baris = function (r, total) {
      var avg = r.n ? Math.round(r.sum / r.n) : 0, belum = r.n - r.isi;
      return '<tr' + (total ? ' style="font-weight:700;background:#f9fafb;"' : '') + '><td>' + esc(r.kelas) + '</td><td>' + r.n + '</td>' +
        '<td>' + r.isi + (belum ? ' <span class="bi-no">(' + belum + ' belum)</span>' : '') + '</td>' +
        '<td><div class="bi-prog"><i style="width:' + avg + '%"></i></div><span style="font-size:12px;">' + avg + '%</span></td>' +
        '<td>' + r.penuh + '</td><td>' + r.stj + ' / ' + r.n + '</td>' +
        '<td><button class="btn btn-soft" data-bi="drill" data-kelas="' + (total ? '' : esc(r.kelas)) + '">Lihat yang belum</button></td></tr>';
    };
    b.innerHTML = '<div class="bi-bar"><button class="btn btn-soft" data-bi="muat">🔄 Muat ulang</button>' +
      '<button class="btn btn-soft" data-bi="csvRekap">⬇️ Rekap kelas (CSV)</button><button class="btn btn-soft" data-bi="csvStatus">⬇️ Status per siswa (CSV)</button></div>' +
      '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Kelas</th><th>Siswa aktif</th><th>Sudah diisi</th><th>Kelengkapan</th><th>Lengkap 100%</th><th>Persetujuan</th><th></th></tr>' +
      rk.list.map(function (r) { return baris(r, false); }).join('') + baris(rk.tot, true) + '</table></div>' +
      '<p class="text-muted" style="font-size:12px;margin-top:8px;line-height:1.5;">Hanya siswa aktif. <b>Kelengkapan</b> = rata-rata persen terisi per kelas; siswa yang belum diisi dihitung 0%. ' +
      'Yang dihitung: identitas tambahan, alamat, ayah, ibu, dan penerimaan. Wali, riwayat kelas, keluar/lulus, dan persetujuan tidak masuk persen (persetujuan punya kolomnya sendiri).</p>';
  }
  function unduhRekap() {
    var rk = rekapKelas(), rows = [['Kelas', 'Siswa aktif', 'Sudah diisi', 'Belum diisi', 'Kelengkapan rata-rata (%)', 'Lengkap 100%', 'Persetujuan tercatat']];
    rk.list.concat([rk.tot]).forEach(function (r) { rows.push([r.kelas, r.n, r.isi, r.n - r.isi, r.n ? Math.round(r.sum / r.n) : 0, r.penuh, r.stj]); });
    unduhCsv('rekap-kelengkapan-buku-induk-' + hariIni() + '.csv', rows);
  }
  function unduhStatus() {
    var rows = [['Kelas', 'Nama', 'NIS', 'Terisi (%)', 'Persetujuan']];
    daftarSiswa().filter(aktif).sort(function (a, b) { return urutKelas(namaKelas(a), namaKelas(b)) || String(a.name).localeCompare(String(b.name)); }).forEach(function (s) {
      var d = idx && idx[s.key]; rows.push([namaKelas(s), s.name || '', s.nis || '', d ? (d.pct || 0) : 'belum diisi', d && d.setuju ? 'Ya' : 'Belum']);
    });
    unduhCsv('status-buku-induk-per-siswa-' + hariIni() + '.csv', rows);
  }

  /* ---------- v2: CSV (unduh & baca) ---------- */
  function csvCell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;   // cegah rumus Excel
    return /[;",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  // Titik koma + baris "sep=;" supaya Excel (pengaturan Indonesia maupun Inggris) langsung memisah kolom.
  function unduhCsv(nama, baris) {
    var teks = '\uFEFFsep=;\r\n' + baris.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n') + '\r\n';
    var url = URL.createObjectURL(new Blob([teks], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  function deteksiDelim(t) {
    var baris = t.split(/\r\n|\n|\r/, 1)[0] || '', best = ';', max = -1;
    [';', ',', '\t'].forEach(function (d) { var n = baris.split(d).length - 1; if (n > max) { max = n; best = d; } });
    return best;
  }
  function parseCsv(t, d) {
    var rows = [], row = [], f = '', q = false, i, c;
    for (i = 0; i < t.length; i++) {
      c = t.charAt(i);
      if (q) {
        if (c === '"') { if (t.charAt(i + 1) === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"' && f === '') q = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t.charAt(i + 1) === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return { rows: rows, terbuka: q };
  }

  /* ---------- v2: impor CSV (pengisian massal) ---------- */
  var IMPOR_MAX_BARIS = 1000, IMPOR_MAX_BYTES = 2 * 1024 * 1024, POTONG = 15;
  var SCI = /^\d+([.,]\d+)?e[+-]?\d+$/i;
  function nk(x) { return String(x == null ? '' : x).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function kunciAngka(x) { return String(x == null ? '' : x).replace(/\D/g, '').replace(/^0+/, ''); }
  function normHead(c) { return String(c == null ? '' : c).replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s\-]+/g, '_'); }
  function ketPilihan(f) {
    if (f.t === 'select') return OPT[f.o].join(' | ');
    if (f.t === 'date') return 'yyyy-mm-dd (boleh dd/mm/yyyy)';
    if (f.id === 'nik') return '16 angka';
    if (/_ta$/.test(f.id)) return 'contoh 2024/2025';
    return 'maks ' + f.max + ' karakter';
  }
  function parseTgl(v) {
    var m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/.exec(v), y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else { m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/.exec(v); if (!m) return null; d = +m[1]; mo = +m[2]; y = +m[3]; }   // dd/mm/yyyy (urutan Indonesia)
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1900 || y > 2100) return null;
    return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  // -> { v } bila sah, { err } bila tidak. Nilai bebas (NIK, alamat, dst.) tidak pernah dikutip di pesan galat.
  function normNilai(f, v) {
    v = String(v).replace(/\s+/g, ' ').trim();
    if (isNum(f)) {
      if (SCI.test(v)) return { err: 'terbaca sebagai angka ilmiah oleh Excel; format kolom sebagai Teks lalu ketik ulang' };
      v = v.replace(/^(\d+)[.,]0+$/, '$1');
    }
    if (f.t === 'date') { var t = parseTgl(v); return t ? { v: t } : { err: 'tanggal tidak dikenal (pakai yyyy-mm-dd)' }; }
    if (f.t === 'select') {
      var k = nk(v), opts = OPT[f.o], i;
      if (f.o === 'jk') { if (k === 'l' || k === 'lk' || k === 'laki') k = 'lakilaki'; else if (k === 'p' || k === 'pr') k = 'perempuan'; }
      for (i = 0; i < opts.length; i++) if (nk(opts[i]) === k) return { v: opts[i] };
      return { err: 'pilihan "' + v.slice(0, 30) + '" tidak dikenal (boleh: ' + opts.join(' | ') + ')' };
    }
    if (/_ta$/.test(f.id)) v = v.replace(/\s/g, '').replace(/^(\d{4})-(\d{4})$/, '$1/$2');
    if (v.length > f.max) return { err: 'terlalu panjang (' + v.length + ' dari maks ' + f.max + ' karakter)' };
    if (f.pola && !f.pola.test(v)) return { err: f.pesan || 'format tidak sesuai' };
    return { v: v };
  }
  // Membaca teks CSV -> { fatal, peringatan[], rows[], abaikan[] }. Murni (tanpa akses Firebase/DOM).
  function olahCsv(teks) {
    var h = { fatal: '', peringatan: [], rows: [], abaikan: [] };
    if (teks.indexOf('\uFFFD') > -1) h.peringatan.push('Ada karakter yang tidak terbaca. Bila nama/alamat tampak rusak, simpan ulang sebagai "CSV UTF-8".');
    teks = teks.replace(/^\uFEFF/, '');
    var d = null, m = /^sep=(.)\r?\n/i.exec(teks);
    if (m) { d = m[1]; teks = teks.slice(m[0].length); }
    if (!d) d = deteksiDelim(teks);
    var p = parseCsv(teks, d);
    if (p.terbuka) { h.fatal = 'Tanda kutip (") tidak berpasangan, file kemungkinan rusak.'; return h; }
    var data = [];   // { r: sel-sel, no: nomor baris asli di file (judul = 1), supaya cocok dengan baris di Excel }
    p.rows.forEach(function (r, i) { if (r.some(function (c) { return String(c).trim() !== ''; })) data.push({ r: r, no: i + 1 }); });
    if (data.length < 2) { h.fatal = 'File kosong atau hanya berisi judul kolom.'; return h; }
    if (data.length - 1 > IMPOR_MAX_BARIS) { h.fatal = 'Terlalu banyak baris (maks ' + IMPOR_MAX_BARIS + '). Pecah file per kelas.'; return h; }
    var head = data[0].r.map(normHead), col = Object.create(null), byId = Object.create(null), ids = Object.create(null);
    FIELDS.forEach(function (f) { ids[f.id] = f; });
    head.forEach(function (n, i) {
      if (!n) return;
      if (n in col) { h.peringatan.push('Kolom "' + n + '" muncul dua kali; yang kedua diabaikan.'); return; }
      col[n] = i;
      if (ids[n]) byId[n] = i; else if (['nisn', 'nis', 'nama', 'kelas'].indexOf(n) < 0) h.abaikan.push(n);
    });
    if (col.nisn == null && col.nis == null) { h.fatal = 'Kolom "nisn" (atau "nis") tidak ada. Gunakan template dari tombol Unduh template.'; return h; }
    var fidList = Object.keys(byId);
    if (!fidList.length) { h.fatal = 'Tidak ada kolom isian yang dikenal. Gunakan nama kolom persis seperti template.'; return h; }
    var byNisn = Object.create(null), byNis = Object.create(null);
    daftarSiswa().forEach(function (s) {
      var a = kunciAngka(s.nisn), b = kunciAngka(s.nis);
      if (a) byNisn[a] = byNisn[a] ? 'ganda' : s;
      if (b) byNis[b] = byNis[b] ? 'ganda' : s;
    });
    var seen = Object.create(null), nikOk = 0, nikNol = 0;
    for (var i = 1; i < data.length; i++) {
      (function (r, no) {
        var cel = function (c) { return c == null ? '' : String(r[c] == null ? '' : r[c]).trim(); };
        var err = [], s = null, vn = cel(col.nisn), vs = cel(col.nis), vals = {}, adaStj = false;
        if (SCI.test(vn) || SCI.test(vs)) err.push('NISN/NIS terbaca sebagai angka ilmiah (format kolom sebagai Teks)');
        else if (!vn && !vs) err.push('baris tanpa NISN/NIS');
        else {
          if (vn) s = byNisn[kunciAngka(vn)];
          if (!s && vs) s = byNis[kunciAngka(vs)];
          if (!s) err.push('NISN/NIS tidak ditemukan di data Siswa');
          else if (s === 'ganda') { err.push('NISN/NIS dipakai lebih dari satu siswa'); s = null; }
        }
        if (s) {
          var nm = cel(col.nama);
          if (nm && nk(nm) !== nk(s.name)) err.push('nama di file ("' + nm.slice(0, 40) + '") berbeda dengan data Siswa ("' + String(s.name || '').slice(0, 40) + '"), cek NISN/NIS');
          if (seen[s.key]) err.push('siswa yang sama sudah ada di baris ' + seen[s.key]); else seen[s.key] = no;
        }
        fidList.forEach(function (fid) {
          var v = cel(byId[fid]); if (v === '') return;
          var f = ids[fid], x = normNilai(f, v);
          if (x.err) { err.push(f.l + ' (' + fid + '): ' + x.err); return; }
          vals[fid] = x.v; if (f.g === 'stj') adaStj = true;
          if (fid === 'nik') { nikOk++; if (x.v.charAt(15) === '0') nikNol++; }
        });
        h.rows.push({ no: no, key: s ? s.key : '', nama: s ? s.name : (vn || vs || '-'), vals: vals, n: Object.keys(vals).length, err: err, stj: adaStj });
      })(data[i].r, data[i].no);
    }
    // Excel membulatkan angka >15 digit: NIK akhirnya berakhiran 0 hampir semuanya (normalnya ±10%).
    if (nikOk >= 3 && nikNol / nikOk > 0.6) h.fatal = 'Hampir semua NIK berakhiran angka 0: kolom NIK kemungkinan dibulatkan Excel (hanya 15 angka pertama yang akurat). Format kolom NIK sebagai Teks, ketik ulang, lalu unggah lagi.';
    return h;
  }
  function unduhTemplate() {
    var kelas = ($('biTplK') || {}).value || '', penuh = ($('biTplL') || {}).value === 'semua';
    var fs = FIELDS.filter(function (f) { return penuh || ['idn', 'alm', 'ayh', 'ibu', 'wal', 'msk'].indexOf(f.g) > -1; });
    var rows = daftarSiswa().filter(function (s) { return aktif(s) && (!kelas || namaKelas(s) === kelas); })
      .sort(function (a, b) { return urutKelas(namaKelas(a), namaKelas(b)) || String(a.name).localeCompare(String(b.name)); })
      .map(function (s) { return [s.nisn || '', s.nis || '', s.name || '', s.kelas || ''].concat(fs.map(function () { return ''; })); });
    if (!rows.length) return toast('Tidak ada siswa aktif pada pilihan itu.', true);
    unduhCsv('template-buku-induk' + (kelas ? '-' + kelas.replace(/[^\w-]+/g, '_') : '') + '.csv', [['nisn', 'nis', 'nama', 'kelas'].concat(fs.map(function (f) { return f.id; }))].concat(rows));
  }
  function bacaFile(file) {
    if (!file || !canEdit()) return;
    if (sibuk) return toast('Tunggu proses yang berjalan selesai.', true);
    if (/\.xlsx?$/i.test(file.name)) return toast('Itu file Excel. Simpan dulu sebagai CSV (UTF-8), lalu unggah.', true, 6000);
    if (file.size > IMPOR_MAX_BYTES) return toast('File terlalu besar (maks 2 MB).', true);
    var fr = new FileReader();
    fr.onload = function () {
      if (!canEdit()) return;
      imp = { phase: 'pratinjau', nama: file.name, h: olahCsv(String(fr.result || '')), timpa: false, konf: false };
      if (pageAktif() && tab === 'impor' && !cur) renderImporHasil();
    };
    fr.onerror = function () { toast('Gagal membaca file.', true); };
    fr.readAsText(file, 'UTF-8');
  }
  function renderImpor() {
    var b = $('biBody'); if (!b) return;
    if (!canEdit()) { b.innerHTML = '<div class="bi-warn">Impor hanya untuk Admin.</div>'; return; }
    var kelasList = {}; daftarSiswa().forEach(function (s) { if (aktif(s)) kelasList[namaKelas(s)] = 1; });
    var ko = '<option value="">Semua kelas</option>' + Object.keys(kelasList).sort(urutKelas).map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('');
    var ref = GROUPS.map(function (g) {
      return '<tr><td colspan="3" style="background:#f3f4f6;font-weight:700;">' + esc(g.t) + '</td></tr>' + FIELDS.filter(function (f) { return f.g === g.id; }).map(function (f) {
        return '<tr><td><code>' + f.id + '</code></td><td>' + esc(f.l) + '</td><td>' + esc(ketPilihan(f)) + '</td></tr>';
      }).join('');
    }).join('');
    b.innerHTML = '<div class="bi-id"><b>Isi massal dari file CSV</b><ol style="margin:6px 0 0 18px;padding:0;line-height:1.55;">' +
      '<li>Unduh template (sudah berisi NISN, NIS &amp; nama siswa aktif).</li>' +
      '<li>Isi di Excel / Google Sheets. <b>Sel kosong = tidak diubah.</b> Simpan sebagai <b>CSV (UTF-8)</b>.</li>' +
      '<li>Unggah di bawah, periksa pratinjau, lalu terapkan.</li></ol></div>' +
      '<div class="bi-bar"><select id="biTplK" class="field">' + ko + '</select>' +
      '<select id="biTplL" class="field"><option value="inti">Data inti (identitas, alamat, orang tua, penerimaan)</option><option value="semua">Lengkap (+ riwayat kelas, keluar/lulus, persetujuan)</option></select>' +
      '<button class="btn btn-soft" data-bi="template">⬇️ Unduh template</button></div>' +
      '<details class="bi-g"><summary>Aturan pengisian &amp; daftar kolom</summary><ul style="margin:8px 0 8px 18px;padding:0;font-size:13px;line-height:1.6;">' +
      '<li><code>nisn</code> (atau <code>nis</code>) mencocokkan siswa. Kolom <code>nama</code>, bila ada, jadi pengaman: harus sama dengan data Siswa (hapus kolomnya bila tak ingin dicek).</li>' +
      '<li><b>NIK, NISN, NISM, kode pos:</b> format kolom sebagai <b>Teks</b> SEBELUM mengisi. Excel membulatkan NIK 16 angka menjadi 15 angka + 0 dan menghapus angka 0 di depan.</li>' +
      '<li>Tanggal: <code>yyyy-mm-dd</code> (disarankan) atau <code>dd/mm/yyyy</code>.</li>' +
      '<li>Pilihan (jenis kelamin, agama, dst.): tulis seperti daftar di bawah; huruf besar/kecil bebas, jenis kelamin boleh L / P.</li>' +
      '<li>Isian yang sudah ada tidak ditimpa kecuali Anda mencentang opsinya. Isian tidak bisa dikosongkan lewat impor.</li>' +
      '<li>Hapus file CSV dari perangkat setelah selesai (berisi data pribadi anak).</li></ul>' +
      '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Kolom</th><th>Isi</th><th>Format / pilihan</th></tr>' + ref + '</table></div></details>' +
      '<div style="margin:10px 0;"><label class="label" for="biFile">Unggah file CSV yang sudah diisi</label><input id="biFile" type="file" accept=".csv,.txt,text/csv"></div>' +
      '<div id="biImp"></div>';
    renderImporHasil();
  }
  function renderImporHasil() {
    var el = $('biImp'); if (!el) return;
    if (!imp) { el.innerHTML = ''; return; }
    if (imp.phase === 'proses') {
      var pr = imp.total ? Math.round(100 * imp.done / imp.total) : 0;
      el.innerHTML = '<div class="bi-id">⏳ Menulis… ' + imp.done + ' / ' + imp.total + ' siswa<div class="bi-prog" style="margin-top:6px;"><i style="width:' + pr + '%"></i></div>Jangan tutup halaman ini.</div>';
      return;
    }
    if (imp.phase === 'selesai') {
      var st = imp.stat;
      el.innerHTML = (imp.galat ? '<div class="bi-err">❌ ' + esc(imp.galat) + '<br>Siswa yang sudah tertulis sebelum galat tetap tersimpan; unggah ulang file yang sama untuk melanjutkan (isian lama tidak ditimpa).</div>' : '') +
        '<div class="bi-id"><b>' + (imp.galat ? 'Impor berhenti sebagian' : '✅ Impor selesai') + '</b><br>' + st.siswa + ' siswa diperbarui, ' + st.isi + ' isian ditulis' + (st.timpa ? ' (' + st.timpa + ' menimpa isian lama)' : '') + '.' +
        (st.lewat ? '<br>' + st.lewat + ' isian dilewati karena sudah terisi (centang "Timpa" bila ingin mengganti).' : '') +
        (st.sama ? '<br>' + st.sama + ' isian sama dengan data yang sudah ada.' : '') +
        '<br><span class="text-muted" style="font-size:12px;">Hapus file CSV dari perangkat Anda.</span></div>' +
        '<button class="btn btn-soft" data-bi="impBatal">Selesai</button>';
      return;
    }
    var h = imp.h;
    if (h.fatal) { el.innerHTML = '<div class="bi-err">❌ ' + esc(h.fatal) + '</div><button class="btn btn-soft" data-bi="impBatal">Tutup</button>'; return; }
    var ok = h.rows.filter(function (r) { return !r.err.length && r.n; }), salah = h.rows.filter(function (r) { return r.err.length; });
    var kosong = h.rows.length - ok.length - salah.length, isi = ok.reduce(function (a, r) { return a + r.n; }, 0);
    var perluKonf = ok.some(function (r) { return r.stj; }), bolehTerapkan = ok.length && (!perluKonf || imp.konf);
    el.innerHTML = '<div class="bi-id"><b>Pratinjau: ' + esc(imp.nama) + '</b><br>' + h.rows.length + ' baris terbaca · <span class="bi-ok"><b>' + ok.length + ' siswa siap</b> (' + isi + ' isian)</span>' +
      (salah.length ? ' · <span style="color:#b91c1c;"><b>' + salah.length + ' baris bermasalah (dilewati)</b></span>' : '') + (kosong ? ' · ' + kosong + ' baris tanpa isian' : '') + '</div>' +
      h.peringatan.map(function (w) { return '<div class="bi-warn">' + esc(w) + '</div>'; }).join('') +
      (h.abaikan.length ? '<div class="bi-warn">Kolom tidak dikenal, diabaikan: ' + esc(h.abaikan.slice(0, 10).join(', ')) + (h.abaikan.length > 10 ? ' …' : '') + '</div>' : '') +
      (salah.length ? '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Baris</th><th>Siswa</th><th>Masalah</th></tr>' + salah.slice(0, 40).map(function (r) {
        return '<tr><td>' + r.no + '</td><td>' + esc(r.nama) + '</td><td>' + esc(r.err.join('; ')) + '</td></tr>';
      }).join('') + '</table></div>' + (salah.length > 40 ? '<p class="text-muted" style="font-size:12px;">…dan ' + (salah.length - 40) + ' baris lain.</p>' : '') : '') +
      '<label style="display:block;margin:10px 0 4px;font-size:13px;"><input type="checkbox" id="biTimpa"' + (imp.timpa ? ' checked' : '') + '> Timpa isian yang sudah ada (bawaan: hanya mengisi yang masih kosong)</label>' +
      (perluKonf ? '<div class="bi-warn">File ini mengisi kolom <b>persetujuan orang tua/wali</b>. Persetujuan harus bisa dibuktikan (UU 27/2022 &amp; PP 33/2026).<br><label style="display:block;margin-top:4px;"><input type="checkbox" id="biKonf"' + (imp.konf ? ' checked' : '') + '> Saya memegang formulir persetujuan tertulis/terekam untuk setiap siswa yang kolom persetujuannya terisi.</label></div>' : '') +
      '<div class="bi-act"><button class="btn btn-success" data-bi="impTerapkan"' + (bolehTerapkan ? '' : ' disabled') + '>✅ Terapkan ke ' + ok.length + ' siswa</button><button class="btn btn-soft" data-bi="impBatal">Batal</button></div>';
  }
  function terapkanImpor() {
    if (!canEdit() || !imp || imp.phase !== 'pratinjau' || sibuk || !imp.h) return;
    var sesi = imp, layak = sesi.h.rows.filter(function (r) { return !r.err.length && r.n; }), timpa = !!sesi.timpa;
    if (!layak.length) return;
    if (layak.some(function (r) { return r.stj; }) && !sesi.konf) return toast('Centang pernyataan persetujuan dulu.', true);
    sibuk = true;
    var stat = { siswa: 0, isi: 0, timpa: 0, lewat: 0, sama: 0 }, baru = {};
    sesi.phase = 'proses'; sesi.done = 0; sesi.total = layak.length; renderImporHasil();
    function potong(i) {
      if (i >= layak.length) return Promise.resolve();
      if (imp !== sesi) return Promise.reject(new Error('Impor dihentikan (halaman ditutup atau keluar akun).'));
      var grup = layak.slice(i, i + POTONG);
      return Promise.all(grup.map(function (r) { return db.ref('buku_induk/' + r.key).once('value'); })).then(function (snaps) {
        var upd = {}, ubah = [];
        grup.forEach(function (r, j) {
          var lama = snaps[j].val() || {}, tulis = {}, ada = false;
          Object.keys(r.vals).forEach(function (fid) {
            var v = r.vals[fid], sudah = lama[fid];
            if (sudah === v) { stat.sama++; return; }
            if (sudah && !timpa) { stat.lewat++; return; }
            if (sudah) stat.timpa++;
            tulis[fid] = v; stat.isi++; ada = true;
          });
          if (!ada) return;
          var gab = Object.assign({}, lama, tulis);
          Object.keys(tulis).forEach(function (fid) { upd['buku_induk/' + r.key + '/' + fid] = tulis[fid]; });
          upd['buku_induk/' + r.key + '/_upd'] = firebase.database.ServerValue.TIMESTAMP;
          upd['buku_induk/' + r.key + '/_oleh'] = String(oleh()).slice(0, 100);
          var ind = { pct: persenTerisi(gab), setuju: !!(gab.setuju_tgl && gab.setuju_oleh) };
          upd['buku_induk_indeks/' + r.key] = { pct: ind.pct, setuju: ind.setuju, upd: firebase.database.ServerValue.TIMESTAMP };
          ubah.push(r.key); baru[r.key] = ind;
        });
        if (!ubah.length) return;
        return db.ref().update(upd).then(function () { idx = idx || {}; ubah.forEach(function (k) { catat('ubah', k); stat.siswa++; idx[k] = baru[k]; }); });
      }).then(function () {
        sesi.done = Math.min(layak.length, i + POTONG);
        if (imp === sesi && pageAktif() && tab === 'impor') renderImporHasil();
        return potong(i + POTONG);
      });
    }
    siap().then(function () { return potong(0); }).catch(function (e) { sesi.galat = (e && e.message) || String(e); })
      .then(function () {
        if (stat.siswa) { try { addLog('buku_induk_impor', stat.siswa + ' siswa'); } catch (e) { } }
        sibuk = false;
        if (imp === sesi) {
          sesi.phase = 'selesai'; sesi.stat = stat; sesi.h = null;   // lepaskan isi CSV dari memori
          if (pageAktif() && tab === 'impor' && !cur) renderImporHasil();
        }
      });
  }

  /* ---------- event ---------- */
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === 'biQ') { filt.q = e.target.value; clearTimeout(qTimer); qTimer = setTimeout(renderList, 200); }
    else if (id === 'biK') { filt.kelas = e.target.value; renderList(); }
    else if (id === 'biS') { filt.st = e.target.value; renderList(); }
    else if (e.type !== 'change') return;   // elemen di bawah ini hanya bereaksi pada 'change' (input file memicu 'input' + 'change')
    else if (id === 'biFile') bacaFile(e.target.files && e.target.files[0]);
    else if (id === 'biTimpa' && imp) { imp.timpa = !!e.target.checked; }
    else if (id === 'biKonf' && imp) { imp.konf = !!e.target.checked; renderImporHasil(); }
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-bi]'); if (!b || !root.contains(b)) return;
    switch (b.getAttribute('data-bi')) {
      case 'buka': bukaSiswa(b.getAttribute('data-key')); break;
      case 'tab': tab = b.getAttribute('data-tab') || 'daftar'; render(); break;
      case 'drill': filt.kelas = b.getAttribute('data-kelas') || ''; filt.st = 'kurang'; filt.q = ''; tab = 'daftar'; render(); break;
      case 'csvRekap': unduhRekap(); break;
      case 'csvStatus': unduhStatus(); break;
      case 'template': unduhTemplate(); break;
      case 'impTerapkan': terapkanImpor(); break;
      case 'impBatal': if (!sibuk) { imp = null; renderImporHasil(); } break;
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
    clearTimeout(qTimer); cur = null; idx = null; idxMuat = false; idxGalat = ''; filt = { q: '', kelas: '', st: '' }; sibuk = false; tab = 'daftar'; imp = null;
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
      } else if (cur || idxMuat || imp) { resetState(); }   // keluar dari halaman -> kosongkan data pribadi dari memori & DOM
      return r;
    };
  }
  init();
})();
