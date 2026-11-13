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

   V10: formulir siswa menampilkan Riwayat Kelas (usulan dari Nilai/Absensi/menu Siswa), rekap Kehadiran per semester & Sikap per tahun ajaran, tiga bagian dengan tombol sendiri, dibaca HANYA saat ditekan (hemat kuota Firebase gratis); kehadiran hanya kelas sekarang & tahun ajaran berjalan. Baca-saja, tanpa perubahan Rules.
   V9: Daftar menampilkan siswa AKTIF saja secara bawaan (nonaktif tetap bisa dilihat lewat filter "Semua" / "Nonaktif saja", atau saat mencari nama/NISN).
   V8: tab "Impor" menerima file Excel Dapodik (Daftar Siswa) langsung (dapodikKeCsv -> olahCsv; sama aturan dengan impor CSV).

   V4: tab "Persetujuan" (status persetujuan yang diisi orang tua di Portal Orang Tua, pengingat WA, salin ke bagian G). Butuh Rules persetujuan_ortu*.

   V3 (format PDF Buku Induk MI): kolom ditambah (nama panggilan, saudara tiri/angkat, bahasa, jarak, telepon, pendidikan wali, STTB TK, tingkat pindah,
   bea siswa, catatan penting). Cetak mengikuti urutan A-F format baku. Kolom kesehatan (gol. darah, BB/TB, penyakit) SENGAJA tidak disimpan: di cetakan hanya
   ada tabel kosong untuk diisi tangan. Menu berdiri sendiri (sejajar Siswa). Rules node buku_induk WAJIB diganti (RULES-buku-induk-v3).

   V2: tab "Rekap per kelas" (memakai buku_induk_indeks saja, tanpa membuka isi data) & tab "Impor CSV" (Admin). Impor menulis per-kolom
   (sel kosong = tidak diubah), tidak menimpa isian lama kecuali dicentang, dan memakai path/field/aksi log yang SAMA dengan simpan manual -> Rules tidak berubah.
============================================================ */
(function () {
  'use strict';

  var PAGE = 'buku-induk';
  var MAXLIST = 100;

  // Teks formulir persetujuan (ubah sesuai kebijakan madrasah / arahan Kankemenag).
  var TUJUAN_PERSETUJUAN = (window.PersetujuanOrtuTeks && window.PersetujuanOrtuTeks.tujuan) || 'pencatatan administrasi peserta didik pada Buku Induk Siswa madrasah';
  var MASA_SIMPAN = (window.PersetujuanOrtuTeks && window.PersetujuanOrtuTeks.masa) || 'sesuai ketentuan peraturan perundang-undangan tentang kearsipan dan penyelenggaraan pendidikan madrasah yang berlaku';

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
    { id: 'idn', t: 'A. Keterangan Murid (tambahan)' }, { id: 'alm', t: 'A. Alamat & Telepon' }, { id: 'ayh', t: 'B. Ayah Kandung' }, { id: 'ibu', t: 'B. Ibu Kandung' },
    { id: 'wal', t: 'B. Wali Murid (bila ada)' }, { id: 'msk', t: 'C. Pendidikan Sebelumnya / Penerimaan' }, { id: 'rwy', t: 'C. Riwayat Kelas' },
    { id: 'bea', t: 'D. Bea Siswa' }, { id: 'klr', t: 'E. Meninggalkan Madrasah (Tamat / Pindah / Keluar)' }, { id: 'lain', t: 'F. Lain-lain' }, { id: 'rkp', t: 'H. Arsip Rekap Kehadiran & Sikap (diisi lewat tombol "Arsipkan ke formulir")' },
    { id: 'stj', t: 'G. Persetujuan Orang Tua/Wali (UU PDP)' }
  ];
  // t: text | date | select | area. max = batas panjang (juga dipakai di Rules). pola = validasi ringan.
  var FIELDS = [
    { id: 'panggilan', g: 'idn', l: 'Nama panggilan', t: 'text', max: 30 },
    { id: 'nism', g: 'idn', l: 'NISM', t: 'text', max: 20, pola: /^\d*$/, pesan: 'NISM hanya angka' },
    { id: 'nik', g: 'idn', l: 'NIK', t: 'text', max: 16, pola: /^(\d{16})?$/, pesan: 'NIK harus 16 angka' },
    { id: 'jk', g: 'idn', l: 'Jenis Kelamin', t: 'select', o: 'jk', max: 20 },
    { id: 'agama', g: 'idn', l: 'Agama', t: 'select', o: 'agama', max: 20 },
    { id: 'warga', g: 'idn', l: 'Kewarganegaraan (WNI / WNI keturunan / lainnya)', t: 'text', max: 40 },
    { id: 'anak_ke', g: 'idn', l: 'Anak ke-', t: 'text', max: 3, pola: /^\d*$/, pesan: 'Anak ke- hanya angka' },
    { id: 'saudara', g: 'idn', l: 'Jumlah saudara kandung', t: 'text', max: 3, pola: /^\d*$/, pesan: 'Jumlah saudara hanya angka' },
    { id: 'saudara_tiri', g: 'idn', l: 'Jumlah saudara tiri', t: 'text', max: 3, pola: /^\d*$/, pesan: 'Saudara tiri hanya angka' },
    { id: 'saudara_angkat', g: 'idn', l: 'Jumlah saudara angkat', t: 'text', max: 3, pola: /^\d*$/, pesan: 'Saudara angkat hanya angka' },
    { id: 'bahasa', g: 'idn', l: 'Bahasa sehari-hari di rumah', t: 'text', max: 40 },
    { id: 'tinggal', g: 'idn', l: 'Bertempat tinggal pada', t: 'select', o: 'tinggal', max: 30 },
    { id: 'jarak', g: 'idn', l: 'Jarak ke madrasah (mis. 2 km)', t: 'text', max: 30 },

    { id: 'alamat', g: 'alm', l: 'Alamat (jalan / dusun)', t: 'text', max: 200, full: 1 },
    { id: 'rtrw', g: 'alm', l: 'RT / RW', t: 'text', max: 20 },
    { id: 'desa', g: 'alm', l: 'Desa / Kelurahan', t: 'text', max: 80 },
    { id: 'kec', g: 'alm', l: 'Kecamatan', t: 'text', max: 80 },
    { id: 'kab', g: 'alm', l: 'Kabupaten / Kota', t: 'text', max: 80 },
    { id: 'prov', g: 'alm', l: 'Provinsi', t: 'text', max: 80 },
    { id: 'pos', g: 'alm', l: 'Kode pos', t: 'text', max: 5, pola: /^\d*$/, pesan: 'Kode pos hanya angka' },
    { id: 'telp', g: 'alm', l: 'Nomor telepon / HP', t: 'text', max: 20, pola: /^[0-9+() -]*$/, pesan: 'Telepon hanya angka, spasi, + - ( )' },

    { id: 'ayah_nama', g: 'ayh', l: 'Nama ayah', t: 'text', max: 100 },
    { id: 'ayah_pend', g: 'ayh', l: 'Pendidikan', t: 'select', o: 'pend', max: 30 },
    { id: 'ayah_kerja', g: 'ayh', l: 'Pekerjaan', t: 'text', max: 80 },
    { id: 'ibu_nama', g: 'ibu', l: 'Nama ibu', t: 'text', max: 100 },
    { id: 'ibu_pend', g: 'ibu', l: 'Pendidikan', t: 'select', o: 'pend', max: 30 },
    { id: 'ibu_kerja', g: 'ibu', l: 'Pekerjaan', t: 'text', max: 80 },
    { id: 'wali_nama', g: 'wal', l: 'Nama wali', t: 'text', max: 100 },
    { id: 'wali_hub', g: 'wal', l: 'Hubungan dengan siswa', t: 'text', max: 40 },
    { id: 'wali_pend', g: 'wal', l: 'Pendidikan tertinggi', t: 'select', o: 'pend', max: 30 },
    { id: 'wali_kerja', g: 'wal', l: 'Pekerjaan', t: 'text', max: 80 },

    { id: 'masuk_tgl', g: 'msk', l: 'Tanggal diterima', t: 'date', max: 10 },
    { id: 'masuk_jenis', g: 'msk', l: 'Status penerimaan', t: 'select', o: 'masuk', max: 30 },
    { id: 'masuk_kelas', g: 'msk', l: 'Diterima di kelas', t: 'text', max: 20 },
    { id: 'masuk_asal', g: 'msk', l: 'Asal: nama TK / RA (murid baru) atau madrasah asal (pindahan)', t: 'text', max: 100, full: 1 },
    { id: 'masuk_dari_tkt', g: 'msk', l: 'Pindahan dari tingkat / kelas', t: 'text', max: 20 },
    { id: 'masuk_sttb', g: 'msk', l: 'Nomor STTB / ijazah TK-RA (bila ada)', t: 'text', max: 60 },
    { id: 'masuk_sttb_tgl', g: 'msk', l: 'Tanggal STTB / ijazah TK-RA', t: 'date', max: 10 },
    { id: 'masuk_alasan', g: 'msk', l: 'Alasan pindah (bila pindahan)', t: 'text', max: 150, full: 1 },

    { id: 'bea_jenis', g: 'bea', l: 'Jenis bea siswa (PIP, KIP, dll.)', t: 'text', max: 100, full: 1 },

    { id: 'klr_jenis', g: 'klr', l: 'Keterangan', t: 'select', o: 'keluar', max: 40 },
    { id: 'klr_tgl', g: 'klr', l: 'Tanggal (tamat / pindah / keluar)', t: 'date', max: 10 },
    { id: 'klr_ke', g: 'klr', l: 'Melanjutkan / pindah ke', t: 'text', max: 100 },
    { id: 'klr_dari_tkt', g: 'klr', l: 'Pindah dari tingkat / kelas', t: 'text', max: 20 },
    { id: 'klr_ke_tkt', g: 'klr', l: 'Pindah ke tingkat / kelas', t: 'text', max: 20 },
    { id: 'klr_alasan', g: 'klr', l: 'Alasan (bila pindah / mundur)', t: 'text', max: 150 },
    { id: 'ijazah_no', g: 'klr', l: 'Nomor ijazah', t: 'text', max: 40 },
    { id: 'ijazah_tgl', g: 'klr', l: 'Tanggal ijazah', t: 'date', max: 10 },

    { id: 'catatan', g: 'lain', l: 'Catatan yang penting', t: 'text', max: 300, full: 1 },

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
  for (var k2 = 1; k2 <= 6; k2++) {
    FIELDS.push({ id: 'h' + k2, g: 'rkp', l: 'Kelas ' + k2 + ' - rekap kehadiran (tahun|G:H,S,I,A|N:H,S,I,A)', t: 'text', max: 60, full: 1, pola: /^(\d{4}\/\d{4}\|G:\d{1,4},\d{1,4},\d{1,4},\d{1,4}\|N:\d{1,4},\d{1,4},\d{1,4},\d{1,4})?$/, pesan: 'Arsip kehadiran kelas ' + k2 + ' formatnya tidak sesuai (pakai tombol Arsipkan)' });
    FIELDS.push({ id: 's' + k2, g: 'rkp', l: 'Kelas ' + k2 + ' - rekap sikap (tahun|pelanggaran,prestasi,jumlah)', t: 'text', max: 40, full: 1, pola: /^(\d{4}\/\d{4}\|\d{1,5},\d{1,5},\d{1,4})?$/, pesan: 'Arsip sikap kelas ' + k2 + ' formatnya tidak sesuai (pakai tombol Arsipkan)' });
  }
  var OPSIONAL = ['masuk_alasan', 'masuk_dari_tkt', 'masuk_sttb', 'masuk_sttb_tgl', 'saudara_tiri', 'saudara_angkat'];   // tidak dihitung di persen terisi
  window.__bukuIndukFields = FIELDS.map(function (f) { return { id: f.id, max: f.max }; });   // dipakai pembuat Rules

  var LOG_AKSI = ['lihat', 'ubah', 'cetak', 'cetak_persetujuan', 'hapus'];
  var root = null, idx = null, idxMuat = false, idxGalat = '', cur = null, tab = 'daftar', imp = null;   // cur = { key, siswa, data, baru }
  var filt = { q: '', kelas: '', st: '' }, qTimer = null, sibuk = false;
  var stj = null, stjMuat = false, stjGalat = '', stjKelas = '', stjKirim = {}, stjAntre = null;   // tab Persetujuan (status dari Portal Orang Tua)

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
  function lblKelas(k) { k = String(k == null ? '' : k).trim(); return !k ? '-' : (/^kelas\b/i.test(k) ? k : 'Kelas ' + k); }   // data kelas bisa sudah berbunyi "Kelas 3"
  // Nilai bawaan madrasah (usulan, BUKAN data tersimpan): tampil terisi di formulir & baru tersimpan bila Admin menekan Simpan. Ubah/hapus baris sesuai kebijakan.
  var BAWAAN = { agama: 'Islam', warga: 'WNI' };
  function saranIsi(f, d, s) {
    if (!canEdit() || (d && d[f.id])) return '';
    if (BAWAAN[f.id]) return BAWAAN[f.id];
    if (f.id === 'telp') { var t = String((s && s.noWaOrtu) || '').replace(/[^0-9+() -]/g, '').trim().slice(0, f.max); return t.length >= 8 && f.pola.test(t) ? t : ''; }
    return '';
  }
  function namaKelas(s) { return (s && s.kelas) || '(tanpa kelas)'; }
  function urutKelas(a, b) { return String(a).localeCompare(String(b), 'id', { numeric: true }); }
  function isNum(f) { return f.t === 'text' && ['nism', 'nik', 'anak_ke', 'saudara', 'saudara_tiri', 'saudara_angkat', 'pos'].indexOf(f.id) > -1; }   // kolom khusus angka
  function tglId(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso || ''; var b = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return parseInt(m[3], 10) + ' ' + b[parseInt(m[2], 10) - 1] + ' ' + m[1]; }
  function hariIni() { try { return tglLokal(); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function injectCss() {
    if ($('biStyle')) return;
    var st = document.createElement('style'); st.id = 'biStyle';
    st.textContent = '.bi-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.bi-bar .field{flex:1;min-width:130px}.bi-tbl{width:100%;border-collapse:collapse;font-size:13px}' +
      '.bi-tbl td,.bi-tbl th{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}.bi-ok{color:#047857}.bi-saran{background:#fefce8!important;border-color:#fcd34d!important}.bi-hint{font-size:11.5px;color:#92400e;margin-top:3px}.bi-no{color:#b45309}.bi-warn{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px}' +
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
    var n = 0, tot = FIELDS.filter(function (f) { return ['stj', 'klr', 'wal', 'rwy', 'rkp', 'bea', 'lain'].indexOf(f.g) < 0 && OPSIONAL.indexOf(f.id) < 0; });   // riwayat kelas & alasan pindah tidak wajib untuk semua siswa
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
    if ((tab === 'impor' || tab === 'rwy') && !canEdit()) tab = 'daftar';
    var tabs = [['daftar', '📋 Daftar'], ['rekap', '📊 Rekap per kelas'], ['hs', '📈 Hadir & sikap kelas'], ['setuju', '📲 Persetujuan']];
    if (canEdit()) { tabs.push(['impor', '📥 Impor CSV']); tabs.push(['rwy', '🧮 Riwayat massal']); }
    root.innerHTML = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📕 Buku Induk Siswa</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:10px;">Data induk peserta didik. <b>Rahasia</b> (data pribadi anak, UU 27/2022): hanya Admin &amp; Kepala Madrasah; setiap akses dicatat. ' + (canEdit() ? '' : 'Kepala Madrasah: hanya melihat.') + '</p>' +
      '<div class="bi-bar">' + tabs.map(function (t) { return '<button class="btn ' + (t[0] === tab ? 'btn-success' : 'btn-soft') + '" data-bi="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="biBody"></div></div>';
    if (tab === 'rekap') renderRekap(); else if (tab === 'rwy') renderMassal(); else if (tab === 'hs') renderHs(); else if (tab === 'impor') renderImpor(); else if (tab === 'setuju') renderPersetujuan(); else renderDaftar();
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
    var so = [['', 'Siswa aktif'], ['semua', 'Semua (termasuk nonaktif)'], ['nonaktif', 'Nonaktif saja'], ['belum', 'Belum diisi'], ['kurang', 'Belum lengkap (<100%)'], ['stj', 'Belum ada persetujuan']].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === filt.st ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
    b.innerHTML = '<div class="bi-bar"><input id="biQ" class="field" placeholder="Cari nama / NISN / NIS…" value="' + esc(filt.q) + '"><select id="biK" class="field">' + ko + '</select><select id="biS" class="field">' + so + '</select>' +
      '<button class="btn btn-soft" data-bi="muat">🔄 Muat ulang</button></div><div id="biList"></div>';
    renderList();
  }
  function lolosStatus(s) {
    if (filt.st === 'semua') return true;
    if (filt.st === 'nonaktif') return !aktif(s);
    if (!filt.st) return aktif(s) || !!filt.q;   // bawaan: hanya siswa aktif; bila sedang mencari nama/NISN, nonaktif ikut dicari
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
  function inputHtml(f, v, saran) {
    var id = 'bif-' + f.id, ro = canEdit() ? '' : ' disabled', cls = f.full ? ' class="full"' : '';
    var ctl, pakai = !!saran; if (pakai) v = saran;
    var ket = pakai ? '<div class="bi-hint">usulan otomatis, periksa lalu Simpan</div>' : '';
    if ((f.id === 'ayah_nama' || f.id === 'ibu_nama') && canEdit() && !v && cur && cur.siswa && cur.siswa.namaOrtu)
      ket = '<div class="bi-hint">Di menu Siswa tertulis: <b>' + esc(cur.siswa.namaOrtu) + '</b> <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11.5px;" data-bi="pakaiOrtu" data-f="' + f.id + '">Pakai untuk ' + (f.id === 'ayah_nama' ? 'ayah' : 'ibu') + '</button></div>';
    if (f.t === 'select') ctl = '<select id="' + id + '" class="field' + (pakai ? ' bi-saran' : '') + '"' + ro + '><option value="">-- pilih --</option>' + OPT[f.o].map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    else ctl = '<input id="' + id + '" class="field' + (pakai ? ' bi-saran' : '') + '" type="' + (f.t === 'date' ? 'date' : 'text') + '" maxlength="' + f.max + '" value="' + esc(v || '') + '"' + ro + (isNum(f) ? ' inputmode="numeric"' : '') + '>';
    return '<div' + cls + '><label class="label" for="' + id + '">' + esc(f.l) + '</label>' + ctl + ket + '</div>';
  }
  function renderForm() {
    var s = cur.siswa, d = cur.data || {}, adaSaran = false;
    var grup = GROUPS.map(function (g, i) {
      var isi = FIELDS.filter(function (f) { return f.g === g.id; }).map(function (f) { var sr = saranIsi(f, d, s); if (sr) adaSaran = true; return inputHtml(f, d[f.id], sr); }).join('');
      return '<details class="bi-g"' + (i === 0 || g.id === 'stj' ? ' open' : '') + '><summary>' + esc(g.t) + '</summary><div class="bi-form">' + isi + '</div></details>';
    }).join('');
    root.innerHTML = '<div class="card"><button class="btn btn-soft" data-bi="kembali">← Kembali ke daftar</button>' +
      '<h3 style="font-size:16px;font-weight:700;margin:10px 0 6px;">📕 Buku Induk: ' + esc(s.name) + '</h3>' +
      '<div class="bi-id"><b>' + esc(s.name) + '</b> · ' + esc(lblKelas(s.kelas)) + '<br>NIS: ' + esc(s.nis || '-') + ' · NISN: ' + esc(s.nisn || '-') +
      '<br>Tempat, tgl lahir: ' + esc(s.tempatLahir || '-') + ', ' + esc(tglId(s.tglLahir) || '-') + '<br><span class="text-muted" style="font-size:12px;">Data di atas diambil dari menu Siswa (ubah di sana).</span></div>' +
      (d.setuju_tgl && d.setuju_oleh ? '' : '<div class="bi-warn">⚠️ Persetujuan orang tua/wali belum dicatat (UU 27/2022 &amp; PP 33/2026). Isi bagian G setelah formulir ditandatangani.</div>') +
      (adaSaran ? '<div class="bi-warn" style="background:#fefce8;">🟨 Isian berlatar kuning adalah <b>usulan otomatis</b> (agama &amp; kewarganegaraan bawaan madrasah, telepon dari nomor WA orang tua). Periksa, ubah bila perlu, lalu tekan Simpan. Sebelum disimpan, usulan ini belum menjadi data.</div>' : '') +
      grup +
      '<details class="bi-g" id="biNilaiBox"><summary>Hasil Belajar (otomatis dari menu Nilai, tidak disalin)</summary><div id="biNilai">' + nilaiHtml() + '</div></details>' +
      '<details class="bi-g" id="biRingkasBox" open><summary>Riwayat Kelas, Kehadiran &amp; Sikap (otomatis dari menu lain)</summary><div id="biRingkas">' + ringkasHtml() + '</div></details>' +
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

  /* ---------- persetujuan dari Portal Orang Tua (status + pengingat WA + sinkron ke Buku Induk) ---------- */
  function muatPersetujuan(paksa) {
    if (stjMuat && !paksa) return Promise.resolve();
    stjGalat = '';
    return siap().then(function () { return Promise.all([db.ref('persetujuan_ortu').once('value'), db.ref('buku_induk_indeks').once('value')]); }).then(function (r) {
      stj = r[0].val() || {}; idx = r[1].val() || {}; idxMuat = true; stjMuat = true;
    }).catch(function (e) { stj = null; stjMuat = false; stjGalat = (e && e.message) || String(e); });
  }
  function ptSetuju(p) { return !!(p && p.s === 'setuju' && p.b1); }
  function statusPt(s) {
    var p = stj && stj[s.key], d = idx && idx[s.key];
    if (ptSetuju(p)) return 'portal';
    if (p && p.s === 'setuju') return 'sebagian';
    if (p && p.s === 'tarik') return 'tarik';
    if (p && p.s === 'tidak') return 'tidak';
    if (d && d.setuju) return 'kertas';
    return 'belum';
  }
  var LABEL_PT = { portal: ['✔ Setuju (portal)', 'bi-ok'], kertas: ['✔ Sudah (formulir kertas)', 'bi-ok'], sebagian: ['◐ Sebagian, butir 1 tidak disetujui', 'bi-no'], tidak: ['✖ Tidak setuju', 'bi-no'], tarik: ['↩ Ditarik di portal', 'bi-no'], belum: ['… Belum', 'bi-no'] };
  function butuhSinkron(s) {
    var p = stj && stj[s.key], d = idx && idx[s.key];
    if (!p) return false;
    if (ptSetuju(p)) return !(d && d.setuju);
    return p.s === 'tarik' && !!(d && d.setuju);
  }
  function adaWa(s) { return !!s.noWaOrtu && typeof formatNomorWa === 'function' && formatNomorWa(s.noWaOrtu).length >= 10; }
  function pesanWa(s) {
    var url = location.origin + location.pathname;
    return 'Assalamu\'alaikum, Bapak/Ibu wali dari ananda *' + s.name + '* (' + (s.kelas || '-') + ').\n\nMadrasah memohon persetujuan Bapak/Ibu atas pencatatan data ananda pada Buku Induk Siswa, sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.\n\n' +
      'Caranya mudah: buka Portal Orang Tua di\n' + url + '\nmasuk dengan nomor WhatsApp ini, lalu isi kartu *Persetujuan Data Siswa* di halaman awal (pilih setuju atau tidak setuju). Hanya butuh satu menit.\n\nTerima kasih.\n\n- ' + (madInfo().nama || 'Madrasah');
  }
  function tglDariTs(ts) { return new Date((Number(ts) || Date.now()) + 7 * 3600 * 1000).toISOString().slice(0, 10); }
  function barisPt() {
    return daftarSiswa().filter(aktif).filter(function (s) { return !stjKelas || namaKelas(s) === stjKelas; })
      .sort(function (a, b) { return urutKelas(namaKelas(a), namaKelas(b)) || String(a.name).localeCompare(String(b.name)); });
  }
  function renderPersetujuan() {
    var b = $('biBody'); if (!b) return;
    if (!stjMuat) {
      if (stjGalat) { b.innerHTML = '<div class="bi-warn">' + esc(stjGalat) + '<br>Pastikan Rules <b>persetujuan_ortu</b> sudah dipasang.</div><button class="btn btn-soft" data-bi="stjMuat">🔄 Coba lagi</button>'; return; }
      b.innerHTML = '<p class="text-muted">⏳ Memuat…</p>';
      muatPersetujuan(false).then(function () { if (pageAktif() && !cur && tab === 'setuju') renderPersetujuan(); });
      return;
    }
    var list = barisPt(), hit = { portal: 0, kertas: 0, sebagian: 0, tidak: 0, tarik: 0, belum: 0 };
    list.forEach(function (s) { hit[statusPt(s)]++; });
    var kelasList = {}; daftarSiswa().filter(aktif).forEach(function (s) { kelasList[namaKelas(s)] = 1; });
    var ko = '<option value="">Semua kelas</option>' + Object.keys(kelasList).sort(urutKelas).map(function (k) { return '<option' + (k === stjKelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    var perlu = list.filter(butuhSinkron).length;
    var target = list.filter(function (s) { return statusPt(s) === 'belum' && adaWa(s) && !stjKirim[s.key]; });
    var boleh = canEdit();
    var antre = '';
    if (stjAntre) {
      var a = stjAntre;
      if (a.i >= a.items.length) antre = '<div class="bi-warn" style="background:#ecfdf5;border-color:#6ee7b7;color:#065f46;">✅ Antrean selesai: ' + a.kirim + ' pengingat dibuka, ' + a.lewat + ' dilewati. <button class="btn btn-soft" data-bi="stjTutup" style="padding:3px 10px;font-size:12px;">Tutup</button></div>';
      else {
        var sk = siswaByKey(a.items[a.i]);
        antre = '<div class="bi-warn" style="background:#ecfdf5;border-color:#25D366;color:#065f46;">Antrean WA ' + (a.i + 1) + ' dari ' + a.items.length + ': <b>' + esc(sk ? sk.name : '-') + '</b> (' + esc(sk ? sk.kelas : '') + ')<br>' +
          '<button class="btn" data-bi="stjBuka" style="background:#25D366;color:#fff;padding:5px 12px;font-size:12px;margin-top:6px;">📲 Buka WA &amp; lanjut</button> <button class="btn btn-soft" data-bi="stjLewati" style="padding:5px 12px;font-size:12px;">⏭️ Lewati</button> <button class="btn btn-soft" data-bi="stjTutup" style="padding:5px 12px;font-size:12px;">Tutup</button></div>';
      }
    }
    var rows = list.map(function (s) {
      var st = statusPt(s), p = stj[s.key], l = LABEL_PT[st];
      var info = p && p.ts ? ' <span class="text-muted" style="font-size:11px;">' + esc(tglId(tglDariTs(p.ts))) + (p.oleh ? ' · ' + esc(p.oleh) : '') + '</span>' : '';
      var aksi = (boleh && st === 'belum') ? (adaWa(s) ? '<button class="btn" data-bi="stjWa" data-key="' + esc(s.key) + '" style="background:#25D366;color:#fff;padding:2px 8px;font-size:11px;">📲 WA' + (stjKirim[s.key] ? ' ✓' : '') + '</button>' : '<span class="text-muted" style="font-size:11px;">no. WA kosong</span>') : '';
      return '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.kelas || '-') + '</td><td><span class="' + l[1] + '">' + l[0] + '</span>' + info + '</td><td>' + aksi + '</td></tr>';
    }).join('');
    b.innerHTML = '<p style="font-size:13px;margin-bottom:8px;">Orang tua mengisi persetujuan sendiri di <b>Portal Orang Tua</b> (kartu "Persetujuan Data Siswa"). Status di bawah diambil dari sana; persetujuan kertas yang sudah dicatat di Buku Induk tetap dihitung.</p>' +
      '<div class="bi-bar"><span class="bi-ok">✔ Portal: ' + hit.portal + '</span><span class="bi-ok">✔ Kertas: ' + hit.kertas + '</span><span class="bi-no">… Belum: ' + hit.belum + '</span><span class="bi-no">✖/↩/◐: ' + (hit.tidak + hit.tarik + hit.sebagian) + '</span></div>' +
      '<div class="bi-bar"><select id="biSK" class="field">' + ko + '</select><button class="btn btn-soft" data-bi="stjMuat">🔄 Muat ulang</button>' +
      (boleh ? '<button class="btn btn-soft" data-bi="stjSinkron"' + (perlu ? '' : ' disabled') + '>⬇️ Salin ke Buku Induk (' + perlu + ')</button>' +
        '<button class="btn" data-bi="stjMulai" style="background:#25D366;color:#fff;"' + (target.length && !stjAntre ? '' : ' disabled') + '>📲 Kirim berurutan (' + target.length + ')</button>' : '') + '</div>' +
      antre + '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Nama</th><th>Kelas</th><th>Status persetujuan</th><th></th></tr>' + rows + '</table></div>';
  }
  function kirimWaPt(key) {
    var s = siswaByKey(key); if (!s || !canEdit()) return false;
    if (!adaWa(s)) { toast('⚠️ Nomor WhatsApp wali belum diisi atau tidak valid. Isi lewat Edit Siswa di menu Siswa.', true); return false; }
    if (typeof kirimWA !== 'function') { toast('Fungsi kirim WA tidak tersedia.', true); return false; }
    kirimWA(s.noWaOrtu, pesanWa(s)); stjKirim[key] = true;
    try { addLog('ingatkan_persetujuan_ortu', (s.kelas || '-') + ' - ' + s.name); } catch (e) { }
    return true;
  }
  function antreBuka() {
    var a = stjAntre; if (!a || a.i >= a.items.length) return;
    var key = a.items[a.i]; a.i++;
    if (kirimWaPt(key)) a.kirim++; else a.lewat++;
    renderPersetujuan();
  }
  function sinkronPersetujuan() {
    if (!canEdit() || sibuk || !stj) return;
    var list = barisPt().filter(butuhSinkron);
    if (!list.length) return toast('Tidak ada yang perlu disalin.');
    if (!confirm('Salin status persetujuan dari Portal Orang Tua ke Buku Induk untuk ' + list.length + ' siswa?\n(Hanya bagian 9/G "Persetujuan"; isian lain tidak diubah.)')) return;
    sibuk = true;
    var stat = { isi: 0, hapus: 0, lewat: 0 };
    var ids = ['setuju_tgl', 'setuju_oleh', 'setuju_hub', 'setuju_bentuk', 'setuju_cat'];
    function potong(i) {
      if (i >= list.length) return Promise.resolve();
      var bag = list.slice(i, i + 20);
      return Promise.all(bag.map(function (s) { return db.ref('buku_induk/' + s.key).once('value'); })).then(function (snaps) {
        var upd = {}, ubah = [], baru = {};
        bag.forEach(function (s, j) {
          var p = stj[s.key], lama = snaps[j].val() || {}, gab = Object.assign({}, lama), id = 'buku_induk/' + s.key + '/';
          if (ptSetuju(p)) {
            var tdk = []; for (var n = 1; n <= 4; n++) if (!p['b' + n]) tdk.push(n);
            var nv = { setuju_tgl: tglDariTs(p.ts), setuju_oleh: String(p.oleh || '').slice(0, 100), setuju_hub: String(p.hub || '').slice(0, 40), setuju_bentuk: 'Terekam',
              setuju_cat: ('Portal Orang Tua (' + (p.ver || '-') + ')' + (tdk.length ? '; butir tidak disetujui: ' + tdk.join(', ') : '')).slice(0, 200) };
            Object.keys(nv).forEach(function (k) { upd[id + k] = nv[k]; gab[k] = nv[k]; }); stat.isi++;
          } else {
            if (!(lama.setuju_cat && String(lama.setuju_cat).indexOf('Portal Orang Tua') === 0)) { stat.lewat++; return; }   // persetujuan kertas: jangan dihapus otomatis
            ids.forEach(function (k) { upd[id + k] = null; delete gab[k]; }); stat.hapus++;
          }
          upd[id + '_upd'] = firebase.database.ServerValue.TIMESTAMP; upd[id + '_oleh'] = String(oleh()).slice(0, 100);
          var ind = { pct: persenTerisi(gab), setuju: !!(gab.setuju_tgl && gab.setuju_oleh) };
          upd['buku_induk_indeks/' + s.key] = { pct: ind.pct, setuju: ind.setuju, upd: firebase.database.ServerValue.TIMESTAMP };
          ubah.push(s.key); baru[s.key] = ind;
        });
        if (!ubah.length) return;
        return db.ref().update(upd).then(function () { idx = idx || {}; ubah.forEach(function (k) { catat('ubah', k); idx[k] = baru[k]; }); });
      }).then(function () { return potong(i + 20); });
    }
    siap().then(function () { return potong(0); }).then(function () {
      try { addLog('buku_induk_salin_persetujuan', stat.isi + ' diisi, ' + stat.hapus + ' dikosongkan'); } catch (e) { }
      toast('✅ Disalin: ' + stat.isi + ' diisi' + (stat.hapus ? ', ' + stat.hapus + ' dikosongkan (ditarik)' : '') + (stat.lewat ? '; ' + stat.lewat + ' dilewati (persetujuan kertas, periksa manual)' : ''), false, 7000);
    }).catch(function (e) { toast('❌ ' + ((e && e.message) || e), true, 6000); })
      .then(function () { sibuk = false; if (pageAktif() && !cur && tab === 'setuju') renderPersetujuan(); });
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
  /* ---------- hasil belajar otomatis: BACA-SAJA dari node grades (tidak disalin ke buku_induk, tidak ada data baru tersimpan) ---------- */
  function urutSem(a, b) { return String(a.ta).localeCompare(String(b.ta)) || (a.sem === b.sem ? 0 : (a.sem === 'Ganjil' ? -1 : 1)); }
  function nilaiHtml() {
    if (!cur) return '';
    if (!cur.nilai) return '<p class="text-muted" style="font-size:13px;margin:8px 0;">Menampilkan nilai siswa ini dari menu Nilai, per tahun ajaran dan semester. Dibaca saat tombol ditekan; tidak disimpan di Buku Induk.</p><button class="btn btn-soft" data-bi="nilai">📊 Tarik hasil belajar</button>';
    if (!cur.nilai.length) return '<p class="text-muted" style="font-size:13px;">Belum ada nilai tercatat untuk siswa ini.</p><button class="btn btn-soft" data-bi="nilai">🔄 Tarik ulang</button>';
    return cur.nilai.map(function (g) {
      return '<h4 style="margin:10px 0 4px;font-size:13px;">' + esc(g.ta) + ' · ' + esc(g.sem) + ' · ' + esc(lblKelas(g.kelas)) + (g.kunci === true ? ' <span class="bi-ok">🔒 raport final</span>' : (g.kunci === false ? ' <span class="bi-no">raport belum final</span>' : '')) + '</h4>' +
        '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Mata pelajaran</th><th style="width:90px;">Nilai</th></tr>' + g.rows.map(function (r) {
          return '<tr><td>' + esc(r.m) + '</td><td>' + r.n + (r.fin ? '' : ' <i class="text-muted" style="font-size:11px;">sementara</i>') + '</td></tr>';
        }).join('') + '</table></div>';
    }).join('') + '<p class="text-muted" style="font-size:12px;margin-top:6px;">"Sementara" = komponen penilaian belum lengkap. Nilai resmi tetap di Raport.</p><button class="btn btn-soft" data-bi="nilai">🔄 Tarik ulang</button>';
  }
  function tarikNilai() {
    if (!cur || sibuk) return;
    if (typeof statusRapor !== 'function') return toast('Fungsi nilai belum termuat. Muat ulang aplikasi.', true);
    var key = cur.key, locks = null;
    var tampil = function () { var el = $('biNilai'), box = $('biNilaiBox'); if (el && cur && cur.key === key) { el.innerHTML = nilaiHtml(); if (box) box.open = true; } };
    sibuk = true;
    siap().then(function () {
      return Promise.all([db.ref('grades').orderByChild('siswaKey').equalTo(key).once('value'),
        (typeof raporTerkunciSet === 'function' ? raporTerkunciSet(true).then(function (x) { locks = x; }, function () { locks = null; }) : Promise.resolve())]);
    }).then(function (h) {
      var per = {};
      h[0].forEach(function (ch) {
        var g = ch.val() || {}, st = statusRapor(g.data || {});
        if (st.nilai == null || !g.subject) return;
        var k = (g.tahunAjaran || '-') + '|' + g.semester, o = per[k] || (per[k] = { ta: g.tahunAjaran || '-', sem: g.semester || '-', kelas: g.kelas || '', rows: [] });
        o.rows.push({ m: String(g.subject), n: st.nilai, fin: !!st.final });
      });
      var out = Object.keys(per).map(function (k) { return per[k]; }).sort(urutSem);
      out.forEach(function (o) {
        o.rows.sort(function (a, b) { return a.m.localeCompare(b.m); });
        o.kunci = (locks && typeof raporKunciKey === 'function') ? locks.has(raporKunciKey(key, o.ta, o.sem)) : null;
      });
      if (cur && cur.key === key) cur.nilai = out;
      tampil();
    }).catch(function (e) { toast('❌ Gagal menarik nilai: ' + ((e && e.message) || e), true, 6000); }).then(function () { sibuk = false; });
  }
  function nilaiCetak() {
    if (!cur || !cur.nilai || !cur.nilai.length) return '';
    return '<p style="margin:6px 0 2px;">Ringkasan hasil belajar (dari menu Nilai; nilai resmi: Raport):</p>' + cur.nilai.map(function (g) {
      return '<table><tr><th colspan="2">' + esc(g.ta) + ' - ' + esc(g.sem) + ' - ' + esc(lblKelas(g.kelas)) + (g.kunci === true ? ' (raport final)' : '') + '</th></tr>' +
        g.rows.map(function (r) { return '<tr><td>' + esc(r.m) + '</td><td style="width:70px;">' + r.n + (r.fin ? '' : ' *') + '</td></tr>'; }).join('') + '</table>';
    }).join('') + '<p style="font-size:11px;margin:2px 0;">* nilai sementara (komponen penilaian belum lengkap).</p>';
  }


  /* ---------- v10: riwayat kelas, kehadiran & sikap OTOMATIS (baca-saja dari menu Nilai, Absensi, Sikap; tombol "Hitung ulang") ---------- */
  // Tidak ada data baru yang tersimpan saat menghitung. Riwayat kelas hanya menjadi USULAN di formulir (berlatar kuning); baru tersimpan bila Admin menekan Simpan.
  function tktDari(k) { var m = /(\d+)/.exec(String(k == null ? '' : k)); var n = m ? parseInt(m[1], 10) : 0; return n >= 1 && n <= 6 ? n : 0; }
  function taDari(x) {
    if (x && x.tahunAjaran) return String(x.tahunAjaran);
    var t = x && (x.tanggal || x.inputAt);
    try { if (typeof tahunAjaranDariTanggal === 'function') return tahunAjaranDariTanggal(t) || ''; } catch (e) { }
    return '';
  }
  function semDari(tgl) { var m = /^\d{4}-(\d{1,2})/.exec(String(tgl || '')); return m ? (parseInt(m[1], 10) >= 7 ? 'Ganjil' : 'Genap') : ''; }
  function taSekarang() { return (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) ? String(currentTahunAjaran) : ''; }
  // pasangan: [{ta, tkt}] -> { baris: [{k, ta, hasil, catatan}], peringatan: [] }
  function susunRiwayat(pasangan, siswa) {
    var perTa = {}, now = taSekarang(), peringatan = [];
    pasangan.forEach(function (p) { if (!p.ta || !p.tkt) return; var o = perTa[p.ta] || (perTa[p.ta] = {}); o[p.tkt] = (o[p.tkt] || 0) + 1; });
    var tkS = tktDari(siswa && siswa.kelas);
    if (now && tkS && aktif(siswa) && !perTa[now]) { perTa[now] = {}; perTa[now][tkS] = 99; }   // kelas di menu Siswa dipakai untuk tahun berjalan hanya bila belum ada data nilai tahun itu (aman bila siswa sudah dinaikkan kelasnya sebelum tahun ajaran diganti)
    var tas = Object.keys(perTa).sort(), urut = tas.map(function (ta) {
      var best = 0, bc = -1; Object.keys(perTa[ta]).forEach(function (t) { var c = perTa[ta][t]; if (c > bc || (c === bc && +t > best)) { bc = c; best = +t; } });
      return { ta: ta, tkt: best };
    });
    var per = {};
    urut.forEach(function (e, i) {
      var nx = urut[i + 1], h = '';
      if (nx) { if (nx.tkt > e.tkt) h = 'Naik kelas'; else if (nx.tkt === e.tkt) h = 'Tinggal kelas'; else peringatan.push('Kelas ' + e.tkt + ' (' + e.ta + ') diikuti kelas ' + nx.tkt + ' (' + nx.ta + '): urutan tidak lazim, periksa manual.'); }
      else if (e.tkt === 6 && e.ta < now) h = 'Lulus';
      (per[e.tkt] = per[e.tkt] || []).push({ ta: e.ta, hasil: h });
    });
    var baris = [];
    for (var k = 1; k <= 6; k++) {
      var l = per[k]; if (!l) { baris.push({ k: k, ta: '', hasil: '', catatan: '' }); continue; }
      var last = l[l.length - 1], cat = '';
      if (l.length > 1) { cat = 'ditempuh ' + l.length + ' tahun: ' + l.map(function (x) { return x.ta; }).join(', ') + ' (tinggal kelas); yang diusulkan tahun terakhir'; }
      baris.push({ k: k, ta: last.ta, hasil: last.hasil, catatan: cat });
    }
    var adaTingkatBolong = false, min = 0, max = 0; baris.forEach(function (b) { if (b.ta) { if (!min) min = b.k; max = b.k; } });
    for (var j = min; j <= max && min; j++) if (!baris[j - 1].ta) adaTingkatBolong = true;
    if (adaTingkatBolong) peringatan.push('Ada tingkat yang tidak ditemukan datanya (mis. siswa pindahan atau data lama belum ada). Isi manual bila perlu.');
    return { baris: baris, peringatan: peringatan };
  }
  // Tiga bagian TERPISAH, masing-masing dibaca HANYA saat tombolnya ditekan (hemat kuota Firebase gratis):
  //  riwayat = node grades (1 query per siswa) | sikap = kedisiplinan_siswa (1 query per siswa) | hadir = attendance, HANYA kelas siswa saat ini & tahun ajaran berjalan.
  // Tahun ajaran yang dipilih untuk Kehadiran (bawaan: tahun ajaran berjalan). Kelas siswa pada tahun itu diambil dari Riwayat kelas (kelas sekarang tidak berlaku untuk tahun lalu).
  function taPilihHadir() { return (cur && cur.ringkas && cur.ringkas.hadirTa) || taSekarang(); }
  function kelasPadaTa(ta) {
    if (ta === taSekarang()) return (cur.siswa && cur.siswa.kelas) || '';
    var rw = cur.ringkas && cur.ringkas.riwayat; if (!rw) return '';
    var b = rw.baris.filter(function (x) { return x.ta === ta; })[0]; if (!b) return '';
    var dl = (typeof KELAS_LIST !== 'undefined' && KELAS_LIST) || []; var c = dl.filter(function (k) { return tktDari(k) === b.k; })[0];
    return c || ('Kelas ' + b.k);
  }
  function opsiTaHadir() {
    var now = taSekarang(), o = {}; if (now) o[now] = 1;
    var rw = cur.ringkas && cur.ringkas.riwayat; if (rw) rw.baris.forEach(function (b) { if (b.ta) o[b.ta] = 1; });
    return Object.keys(o).sort().reverse();
  }
  function hitungBagian(nama, paksa) {
    if (!cur) return Promise.resolve();
    var key = cur.key, s = cur.siswa, R = cur.ringkas || (cur.ringkas = { galat: {}, kerja: {}, waktu: {} });
    if (R.kerja[nama] || (R[nama] && !paksa)) return Promise.resolve();
    R.kerja[nama] = true; R.galat[nama] = '';
    var selesai = function () { R.kerja[nama] = false; R.waktu[nama] = Date.now(); var el = $('biRingkas'); if (el && cur && cur.key === key) el.innerHTML = ringkasHtml(); };
    var gagal = function (e) { R.galat[nama] = (e && e.message) || String(e); R[nama] = null; };
    var el0 = $('biRingkas'); if (el0) el0.innerHTML = ringkasHtml();
    return siap().then(function () {
      if (nama === 'riwayat') {
        return db.ref('grades').orderByChild('siswaKey').equalTo(key).once('value').then(function (sn) {
          var pasangan = [];
          sn.forEach(function (ch) { var g = ch.val() || {}, t = tktDari(g.kelas); if (t) pasangan.push({ ta: taDari(g), tkt: t }); });
          R.riwayat = susunRiwayat(pasangan, s);
        });
      }
      if (nama === 'sikap') {
        return db.ref('kedisiplinan_siswa').orderByChild('siswaKey').equalTo(key).once('value').then(function (sn) {
          var per = {};
          sn.forEach(function (ch) {
            var d = ch.val() || {}, ta = taDari(d) || '-', sm = semDari(d.tanggal) || '-', o = per[ta + '|' + sm] || (per[ta + '|' + sm] = { ta: ta, sem: sm, pel: 0, pres: 0, n: 0 });
            if (d.jenis === 'prestasi') o.pres += (+d.poin || 0); else o.pel += (+d.poin || 0); o.n++;
          });
          R.sikap = Object.keys(per).map(function (k) { return per[k]; }).sort(urutSem);
        });
      }
      // hadir: satu kelas (kelas siswa sekarang), disaring ke tahun ajaran berjalan
      var now = taPilihHadir(), kls = kelasPadaTa(now);
      if (!kls) throw new Error('Kelas siswa pada tahun ajaran ' + now + ' belum diketahui. Hitung Riwayat kelas dulu.');
      return db.ref('attendance').orderByChild('kelas').equalTo(kls).once('value').then(function (sn) {
        var per = {};
        sn.forEach(function (ch) {
          var a = ch.val() || {}; if (!a.data) return;
          var st = a.data[key]; if (['H', 'S', 'I', 'A'].indexOf(st) < 0) return;
          var ta = taDari(a); if (now && ta !== now) return;
          var sem = semDari(a.tanggal), kk = ta + '|' + sem, o = per[kk] || (per[kk] = { ta: ta || '-', sem: sem || '-', kelas: a.kelas || kls, H: 0, S: 0, I: 0, A: 0 });
          o[st]++;
        });
        R.hadir = Object.keys(per).map(function (k) { return per[k]; }).sort(urutSem);
      });
    }).then(selesai, function (e) { gagal(e); selesai(); });
  }
  function bagianHtml(nama, judul, ket) {
    var R = cur.ringkas || { galat: {}, kerja: {}, waktu: {} }, ada = R[nama] != null, kerja = !!R.kerja[nama];
    var btn = '<button class="btn btn-soft" data-bi="ringkas" data-b="' + nama + '"' + (kerja ? ' disabled' : '') + '>' + (kerja ? '⏳ Menghitung…' : (ada ? '🔄 Hitung ulang' : '📊 Hitung sekarang')) + '</button>';
    return '<h4 style="margin:12px 0 4px;font-size:13px;">' + judul + '</h4>' +
      (R.galat[nama] ? '<div class="bi-warn">Gagal membaca: ' + esc(R.galat[nama]) + '</div>' : '') +
      (ada ? '<p class="text-muted" style="font-size:12px;margin:2px 0 6px;">Dihitung ' + esc(new Date(R.waktu[nama]).toLocaleTimeString('id-ID')) + '. Dibaca dari menu aslinya; tidak disimpan di Buku Induk.</p>' : '<p class="text-muted" style="font-size:12px;margin:2px 0 6px;">' + ket + '</p>') + (nama === 'hadir' ? '<div style="margin:2px 0 6px;"><label class="label" for="biHadirTa">Tahun ajaran</label><select id="biHadirTa" class="field" style="max-width:220px;"' + (kerja ? ' disabled' : '') + '>' + opsiTaHadir().map(function (t) { return '<option' + (t === taPilihHadir() ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select>' + (cur.ringkas && cur.ringkas.riwayat ? '' : '<div class="bi-hint">Untuk melihat tahun ajaran lalu, hitung <b>Riwayat kelas</b> dulu.</div>') + '</div>' : '') + '@@' + nama + '@@<div class="bi-act" style="margin-top:6px;">' + btn + '</div>';
  }
  function ringkasHtml() {
    if (!cur) return '';
    var R = cur.ringkas || { galat: {}, kerja: {}, waktu: {} }, d = cur.data || {}, h = '', t, n;
    // --- riwayat ---
    var ri = '';
    if (R.riwayat) {
      ri = '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Tingkat</th><th>Tahun ajaran</th><th>Hasil</th><th>Tersimpan di Buku Induk</th></tr>' +
        R.riwayat.baris.map(function (b) {
          var sv = [d['r' + b.k + '_ta'], d['r' + b.k + '_hasil']].filter(Boolean).join(' · '), sama = sv && sv === [b.ta, b.hasil].filter(Boolean).join(' · ');
          return '<tr><td>Kelas ' + b.k + '</td><td>' + (b.ta ? esc(b.ta) : '<span class="text-muted">-</span>') + '</td><td>' + esc(b.hasil || '') + (b.catatan ? '<div class="bi-hint">' + esc(b.catatan) + '</div>' : '') + '</td><td>' + (sv ? esc(sv) + (sama ? ' <span class="bi-ok">✔</span>' : ' <span class="bi-no">≠</span>') : '<span class="text-muted">kosong</span>') + '</td></tr>';
        }).join('') + '</table></div>' + R.riwayat.peringatan.map(function (w) { return '<div class="bi-warn" style="margin-top:6px;">' + esc(w) + '</div>'; }).join('') +
        (canEdit() ? '<div class="bi-act" style="margin-top:6px;"><button class="btn btn-success" data-bi="terapkanRiwayat">⬇️ Terapkan ke formulir (hanya yang kosong)</button><button class="btn btn-soft" data-bi="terapkanRiwayatSemua">⬇️ Terapkan &amp; timpa semua</button><button class="btn btn-soft" data-bi="perkirakanRiwayat">🧮 Perkirakan tahun yang kosong</button></div>' +
        '<div class="bi-act" style="margin-top:6px;align-items:center;"><span style="font-size:12.5px;">Hasil tahun ajaran ini:</span><select id="biHasilNow" class="field" style="max-width:170px;"><option value="">-- pilih --</option>' + OPT.hasil.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select><button class="btn btn-soft" data-bi="hasilIni">🏁 Tetapkan hasil tahun ini</button></div><p class="text-muted" style="font-size:12px;">"Perkirakan" menganggap siswa selalu naik kelas tiap tahun (mundur dari data terawal yang ada). Salah bagi siswa yang pernah tinggal kelas atau pindahan; periksa sebelum Simpan.</p><p class="text-muted" style="font-size:12px;">Hanya mengisi kolom bagian "C. Riwayat Kelas" di layar; tekan <b>Simpan</b> untuk menyimpan. Tingkat tanpa data nilai dibiarkan kosong (isi manual).</p>' : '');
    }
    // --- hadir ---
    var hd = '';
    if (R.hadir) {
      if (!R.hadir.length) hd = '<p class="text-muted" style="font-size:13px;">Belum ada catatan absensi pada tahun ajaran yang dipilih.</p>';
      else {
        t = { H: 0, S: 0, I: 0, A: 0 };
        hd = '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Tahun ajaran</th><th>Semester</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alfa</th><th>% hadir</th></tr>' +
          R.hadir.map(function (x) { n = x.H + x.S + x.I + x.A; ['H', 'S', 'I', 'A'].forEach(function (c) { t[c] += x[c]; }); return '<tr><td>' + esc(x.ta) + '</td><td>' + esc(x.sem) + '</td><td>' + x.H + '</td><td>' + x.S + '</td><td>' + x.I + '</td><td>' + x.A + '</td><td>' + Math.round(100 * x.H / n) + '%</td></tr>'; }).join('') +
          '</table></div><p class="text-muted" style="font-size:12px;">Hanya hari yang diisi guru. Juli-Desember = Ganjil, Januari-Juni = Genap. Satu tahun ajaran per tekan (pilih di atas); hemat kuota.</p>' + (canEdit() ? '<div class="bi-act" style="margin-top:4px;"><button class="btn btn-soft" data-bi="arsipHadir">📦 Arsipkan ke formulir</button></div><p class="text-muted" style="font-size:12px;">Mengisi bagian H di layar supaya rekap tahun ini tetap ada walau data absensi lama dibersihkan. Tekan Simpan untuk menyimpannya.</p>' : '');
      }
    }
    // --- sikap ---
    var sk = '';
    if (R.sikap) {
      if (!R.sikap.length) sk = '<p class="text-muted" style="font-size:13px;">Belum ada catatan sikap.</p>';
      else sk = '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Tahun ajaran</th><th>Semester</th><th>⚠️ Pelanggaran (poin)</th><th>🌟 Prestasi (poin)</th><th>Net</th><th>Catatan</th></tr>' +
        R.sikap.map(function (x) { var nt = x.pres - x.pel; return '<tr><td>' + esc(x.ta) + '</td><td>' + esc(x.sem) + '</td><td>' + x.pel + '</td><td>' + x.pres + '</td><td style="font-weight:700;color:' + (nt >= 0 ? '#059669' : '#dc2626') + ';">' + (nt >= 0 ? '+' : '') + nt + '</td><td>' + x.n + '</td></tr>'; }).join('') + '</table></div>' + (canEdit() ? '<div class="bi-act" style="margin-top:4px;"><button class="btn btn-soft" data-bi="arsipSikap">📦 Arsipkan ke formulir</button></div>' : '');
    }
    var isi = { riwayat: ri, hadir: hd, sikap: sk };
    h = bagianHtml('riwayat', 'Riwayat kelas (usulan, dari menu Nilai)', 'Membaca nilai siswa ini (ringan).') + bagianHtml('hadir', 'Kehadiran per tahun ajaran (dari menu Absensi)', 'Membaca absensi satu kelas (bagian terberat, tekan hanya bila perlu).') + bagianHtml('sikap', 'Sikap &amp; kedisiplinan (dari menu Sikap Siswa)', 'Membaca catatan sikap siswa ini (ringan).');
    return h.replace(/@@(\w+)@@/g, function (m, k) { return isi[k] || ''; }) + arsipHtml();
  }

  /* ---- arsip rekap (disimpan di Buku Induk lewat tombol "Arsipkan" + Simpan; butuh Rules v10) ---- */
  function bukaGrup(id) { var g = $(id); if (g && g.closest) { var dt = g.closest('details'); if (dt) dt.open = true; } }
  function setSaran(id, v) { var el = $(id); if (!el) return false; el.value = v; el.classList.add('bi-saran'); return true; }
  function arsipDari(d) {
    var out = [];
    for (var k = 1; k <= 6; k++) {
      var h = /^(\d{4}\/\d{4})\|G:(\d+),(\d+),(\d+),(\d+)\|N:(\d+),(\d+),(\d+),(\d+)$/.exec((d && d['h' + k]) || ''), sk = /^(\d{4}\/\d{4})\|(\d+),(\d+),(\d+)$/.exec((d && d['s' + k]) || '');
      if (!h && !sk) continue;
      out.push({ k: k, ta: (h && h[1]) || sk[1], g: h ? [+h[2], +h[3], +h[4], +h[5]] : null, n: h ? [+h[6], +h[7], +h[8], +h[9]] : null, sik: sk ? { pel: +sk[2], pres: +sk[3], n: +sk[4] } : null, takSama: !!(h && sk && h[1] !== sk[1]) });
    }
    return out;
  }
  function arsipHtml() {
    var a = arsipDari(cur && cur.data); if (!a.length) return '';
    return '<h4 style="margin:14px 0 4px;font-size:13px;">Arsip tersimpan di Buku Induk (tidak membaca Firebase)</h4><div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>Tingkat</th><th>Tahun ajaran</th><th>Ganjil H/S/I/A</th><th>Genap H/S/I/A</th><th>Sikap: pelanggaran / prestasi / catatan</th></tr>' +
      a.map(function (x) { return '<tr><td>Kelas ' + x.k + '</td><td>' + esc(x.ta) + (x.takSama ? ' <span class="bi-no">(tahun kehadiran ≠ sikap)</span>' : '') + '</td><td>' + (x.g ? x.g.join(' / ') : '-') + '</td><td>' + (x.n ? x.n.join(' / ') : '-') + '</td><td>' + (x.sik ? x.sik.pel + ' / ' + x.sik.pres + ' / ' + x.sik.n : '-') + '</td></tr>'; }).join('') + '</table></div>';
  }
  function arsipkanHadir() {
    var R = cur && cur.ringkas; if (!canEdit() || !R || !R.hadir) return toast('Hitung Kehadiran dulu.', true);
    var ta = taPilihHadir(), k = tktDari(kelasPadaTa(ta)), g = [0, 0, 0, 0], n = [0, 0, 0, 0], ada = false;
    if (!k) return toast('Tingkat kelas pada ' + ta + ' belum diketahui. Hitung Riwayat kelas dulu.', true);
    R.hadir.forEach(function (x) { if (x.ta !== ta) return; var t = x.sem === 'Ganjil' ? g : (x.sem === 'Genap' ? n : null); if (!t) return; ada = true; t[0] += x.H; t[1] += x.S; t[2] += x.I; t[3] += x.A; });
    if (!ada) return toast('Tidak ada data kehadiran untuk diarsipkan.', true);
    setSaran('bif-h' + k, ta + '|G:' + g.join(',') + '|N:' + n.join(',')); bukaGrup('bif-h' + k);
    toast('📦 Rekap kehadiran Kelas ' + k + ' (' + ta + ') diisi ke bagian H (kuning).' + (ta === taSekarang() ? ' Tahun ajaran masih berjalan, arsipkan lagi di akhir tahun.' : '') + ' Tekan Simpan untuk menyimpan.', false, 8000);
  }
  function arsipkanSikap() {
    var R = cur && cur.ringkas; if (!canEdit() || !R || !R.sikap) return toast('Hitung Sikap dulu.', true);
    var per = {}, lewat = 0, isi = 0;
    R.sikap.forEach(function (x) { var o = per[x.ta] || (per[x.ta] = { pel: 0, pres: 0, n: 0 }); o.pel += x.pel; o.pres += x.pres; o.n += x.n; });
    var rw = R.riwayat && R.riwayat.baris;
    Object.keys(per).forEach(function (ta) {
      var k = 0; if (rw) rw.forEach(function (b) { if (b.ta === ta) k = b.k; });
      if (!k && ta === taSekarang()) k = tktDari(cur.siswa && cur.siswa.kelas);
      if (!k) { lewat++; return; }
      var o = per[ta]; if (setSaran('bif-s' + k, ta + '|' + Math.min(o.pel, 99999) + ',' + Math.min(o.pres, 99999) + ',' + Math.min(o.n, 9999))) { isi++; bukaGrup('bif-s' + k); }
    });
    toast(isi ? '📦 ' + isi + ' rekap sikap diisi ke bagian H (kuning).' + (lewat ? ' ' + lewat + ' tahun dilewati (tingkatnya belum diketahui; hitung Riwayat kelas dulu).' : '') + ' Tekan Simpan.' : 'Tidak ada yang diarsipkan' + (lewat ? ' (tingkat belum diketahui; hitung Riwayat kelas dulu).' : '.'), !isi, 8000);
  }
  function tetapkanHasilIni() {
    var rw = cur && cur.ringkas && cur.ringkas.riwayat; if (!canEdit() || !rw) return;
    var now = taSekarang(), b = rw.baris.filter(function (x) { return x.ta === now; })[0], v = ($('biHasilNow') || {}).value;
    if (!b) return toast('Tahun ajaran berjalan belum ada di riwayat.', true);
    if (!v) return toast('Pilih hasilnya dulu.', true);
    setSaran('bif-r' + b.k + '_hasil', v); setSaran('bif-r' + b.k + '_ta', now); bukaGrup('bif-r' + b.k + '_ta');
    toast('🏁 Kelas ' + b.k + ' (' + now + '): ' + v + ' diisi di bagian C (kuning). Tekan Simpan.', false, 6000);
  }
  function perkirakanRiwayat() {
    if (!canEdit() || !cur || !cur.ringkas || !cur.ringkas.riwayat) return;
    var bs = cur.ringkas.riwayat.baris, ref = null;
    bs.forEach(function (b) { if (b.ta && !ref) ref = b; });
    if (!ref) return toast('Belum ada tahun ajaran acuan. Isi manual satu tingkat dulu.', true);
    var m = /^(\d{4})\/(\d{4})$/.exec(ref.ta); if (!m) return toast('Format tahun ajaran acuan tidak dikenal.', true);
    var isi = 0, ada = 0;
    for (var k = ref.k - 1; k >= 1; k--) {
      var n = ref.k - k, ta = (+m[1] - n) + '/' + (+m[2] - n), el = $('bif-r' + k + '_ta'), eh = $('bif-r' + k + '_hasil');
      if (el && !el.value) { el.value = ta; el.classList.add('bi-saran'); isi++; } else if (el && el.value) ada++;
      if (eh && !eh.value) { eh.value = 'Naik kelas'; eh.classList.add('bi-saran'); }
    }
    var g = $('bif-r1_ta'); if (g && g.closest) { var dt = g.closest('details'); if (dt) dt.open = true; }
    toast(isi ? '🧮 ' + isi + ' tahun ajaran diperkirakan (kuning), acuan Kelas ' + ref.k + ' ' + ref.ta + '. Periksa, ubah bila ada yang tinggal kelas/pindahan, lalu Simpan.' : 'Tidak ada kolom kosong untuk diperkirakan.', false, 8000);
  }
  function terapkanRiwayat(timpa) {
    if (!canEdit() || !cur || !cur.ringkas || !cur.ringkas.riwayat) return;
    var isi = 0, lewat = 0;
    cur.ringkas.riwayat.baris.forEach(function (b) {
      [['_ta', b.ta], ['_hasil', b.hasil]].forEach(function (p) {
        var el = $('bif-r' + b.k + p[0]); if (!el || !p[1]) return;
        if (el.value && !timpa) { if (el.value !== p[1]) lewat++; return; }
        if (el.value === p[1]) return;
        el.value = p[1]; el.classList.add('bi-saran'); isi++;
      });
    });
    toast(isi ? '✅ ' + isi + ' kolom riwayat kelas diisi (berlatar kuning). Periksa lalu tekan Simpan.' + (lewat ? ' ' + lewat + ' kolom terisi dilewati.' : '') : (lewat ? 'Semua kolom riwayat sudah terisi (' + lewat + ' berbeda dari usulan; pakai "timpa semua" bila ingin menggantinya).' : 'Tidak ada yang perlu diisi.'), false, 6000);
    var g = $('bif-r1_ta'); if (g && g.closest) { var dt = g.closest('details'); if (dt) dt.open = true; }
  }
  function ringkasCetak() {
    var r = cur && cur.ringkas, h = '', t, tadaH = {}, tadaS = {};
    if (r && r.hadir && r.hadir.length) {
      t = { H: 0, S: 0, I: 0, A: 0 };
      h += '<p style="margin:6px 0 2px;">Rekap kehadiran (dari menu Absensi):</p><table><tr><th>Tahun ajaran</th><th>Semester</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alfa</th></tr>' +
        r.hadir.map(function (x) { tadaH[x.ta] = 1; ['H', 'S', 'I', 'A'].forEach(function (c) { t[c] += x[c]; }); return '<tr><td>' + esc(x.ta) + '</td><td>' + esc(x.sem) + '</td><td>' + x.H + '</td><td>' + x.S + '</td><td>' + x.I + '</td><td>' + x.A + '</td></tr>'; }).join('') +
        '<tr><th colspan="2">Total</th><th>' + t.H + '</th><th>' + t.S + '</th><th>' + t.I + '</th><th>' + t.A + '</th></tr></table>';
    }
    if (r && r.sikap && r.sikap.length) {
      h += '<p style="margin:6px 0 2px;">Rekap sikap &amp; kedisiplinan (dari menu Sikap Siswa):</p><table><tr><th>Tahun ajaran</th><th>Semester</th><th>Pelanggaran (poin)</th><th>Prestasi (poin)</th><th>Net</th></tr>' +
        r.sikap.map(function (x) { tadaS[x.ta] = 1; var n = x.pres - x.pel; return '<tr><td>' + esc(x.ta) + '</td><td>' + esc(x.sem) + '</td><td>' + x.pel + '</td><td>' + x.pres + '</td><td>' + (n >= 0 ? '+' : '') + n + '</td></tr>'; }).join('') + '</table>';
    }
    var ar = arsipDari(cur && cur.data).filter(function (x) { return (x.g && !tadaH[x.ta]) || (x.sik && !tadaS[x.ta]); });   // arsip tahun yang tidak ikut dihitung di atas
    if (ar.length) {
      h += '<p style="margin:6px 0 2px;">Arsip rekap kehadiran &amp; sikap tahun lalu (tersimpan di Buku Induk):</p><table><tr><th>Kelas</th><th>Tahun ajaran</th><th>Ganjil H/S/I/A</th><th>Genap H/S/I/A</th><th>Sikap (pelanggaran/prestasi/catatan)</th></tr>' +
        ar.map(function (x) { return '<tr><td>' + x.k + '</td><td>' + esc(x.ta) + '</td><td>' + (x.g ? x.g.join(' / ') : '-') + '</td><td>' + (x.n ? x.n.join(' / ') : '-') + '</td><td>' + (x.sik ? x.sik.pel + ' / ' + x.sik.pres + ' / ' + x.sik.n : '-') + '</td></tr>'; }).join('') + '</table>';
    }
    return h;
  }

  function cetak() {
    if (!cur) return;
    var s = cur.siswa, d = cur.data || {};
    var v = function (id) { return d[id] || ''; }, tg = function (id) { return tglId(d[id]); };
    var baris = function (l, val) { return '<tr><td class="k">' + esc(l) + '</td><td>' + esc(val || '') + '</td></tr>'; };
    var dua = function (l, a, b) { return '<tr><td class="k">' + esc(l) + '</td><td>' + esc(a || '') + '</td><td>' + esc(b || '') + '</td></tr>'; };
    var foto = function (t) { return '<td style="width:25%;text-align:center;height:4cm;vertical-align:middle;color:#777;">Pas foto 3 x 4<br>' + t + '</td>'; };
    var A = '<h4>A. KETERANGAN MURID</h4><table>' + baris('Nomor Induk Siswa (NIS)', s.nis) + baris('NISN', s.nisn) + baris('NISM / NIK', [v('nism'), v('nik')].filter(Boolean).join(' / ')) +
      baris('1. Nama lengkap', s.name) + baris('    Nama panggilan', v('panggilan')) + baris('2. Jenis kelamin', v('jk')) +
      baris('3. Kelahiran - tempat', s.tempatLahir) + baris('    Kelahiran - tanggal', tglId(s.tglLahir)) + baris('4. Agama', v('agama')) + baris('5. Kewarganegaraan', v('warga')) +
      baris('    Anak ke-', v('anak_ke')) + baris('6. Jumlah saudara kandung', v('saudara')) + baris('    Jumlah saudara tiri', v('saudara_tiri')) + baris('    Jumlah saudara angkat', v('saudara_angkat')) +
      baris('7. Bahasa sehari-hari di rumah', v('bahasa')) + baris('8. Kelas', s.kelas) +
      baris('9. Alamat', [v('alamat'), v('rtrw') && 'RT/RW ' + v('rtrw'), v('desa'), v('kec') && 'Kec. ' + v('kec'), v('kab'), v('prov'), v('pos')].filter(Boolean).join(', ')) + baris('    Nomor telepon', v('telp')) +
      baris('10. Bertempat tinggal pada', v('tinggal')) + baris('11. Jarak ke madrasah', v('jarak')) + '</table>' +
      '<table><tr><th colspan="2">12. Pas foto 3 x 4 (ditempel, ditandatangani siswa dan distempel madrasah)</th></tr><tr>' + foto('saat masuk') + foto('saat meninggalkan madrasah') + '</tr></table>';
    var B = '<h4>B. KETERANGAN ORANG TUA / WALI MURID</h4><table><tr><th class="k"></th><th>Ayah</th><th>Ibu</th></tr>' +
      dua('13. Nama orang tua kandung', v('ayah_nama'), v('ibu_nama')) + dua('14. Pendidikan tertinggi', v('ayah_pend'), v('ibu_pend')) + dua('15. Pekerjaan', v('ayah_kerja'), v('ibu_kerja')) + '</table>' +
      '<table>' + baris('16. Wali murid - nama', v('wali_nama')) + baris('    Hubungan keluarga', v('wali_hub')) + baris('    Pendidikan tertinggi', v('wali_pend')) + baris('    Pekerjaan', v('wali_kerja')) + '</table>';
    var rw = '<table><tr><th>Tingkat</th><th>Tahun ajaran</th><th>Hasil</th></tr>' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<tr><td>Kelas ' + n + '</td><td>' + esc(v('r' + n + '_ta')) + '</td><td>' + esc(v('r' + n + '_hasil')) + '</td></tr>'; }).join('') + '</table>';
    var jas = '<p style="margin:6px 0 2px;">Keadaan jasmani (diisi tangan bila diperlukan; tidak disimpan di sistem):</p><table style="text-align:center;"><tr><th class="k">Tahun</th>' + [1, 2, 3, 4, 5, 6].map(function () { return '<th>&nbsp;</th>'; }).join('') + '</tr>' +
      ['Berat badan (kg)', 'Tinggi badan (cm)', 'Penyakit', 'Kelainan jasmani'].map(function (l) { return '<tr><td class="k" style="text-align:left;">' + l + '</td>' + [1, 2, 3, 4, 5, 6].map(function () { return '<td>&nbsp;</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    var C = '<h4>C. PERKEMBANGAN MURID</h4><table>' + baris('17. Status penerimaan', v('masuk_jenis')) + baris('    Tanggal diterima', tg('masuk_tgl')) + baris('    Diterima di kelas', v('masuk_kelas')) +
      baris('    a. Murid baru - asal / nama TK-RA, atau b. Pindahan - nama madrasah asal', v('masuk_asal')) + baris('    Tanggal dan nomor STTB TK-RA', [tg('masuk_sttb_tgl'), v('masuk_sttb')].filter(Boolean).join(' / ')) +
      baris('    Pindahan dari tingkat', v('masuk_dari_tkt')) + baris('    Alasan pindah', v('masuk_alasan')) + '</table>' +
      '<p style="margin:6px 0 2px;">18. Prestasi belajar: lihat Buku Hasil Belajar (Raport) tiap semester. Riwayat kelas:</p>' + rw + nilaiCetak() + ringkasCetak() + jas;
    var D = '<h4>D. BEA SISWA</h4><table>' + baris('19. Jenis bea siswa', v('bea_jenis')) + '</table>';
    var E = '<h4>E. MENINGGALKAN MADRASAH</h4><table>' + baris('20-22. Keterangan (tamat / pindah / keluar)', v('klr_jenis')) + baris('Tanggal', tg('klr_tgl')) + baris('Melanjutkan / pindah ke madrasah', v('klr_ke')) +
      baris('Pindah dari tingkat', v('klr_dari_tkt')) + baris('Pindah ke tingkat', v('klr_ke_tkt')) + baris('Alasan', v('klr_alasan')) + baris('Nomor ijazah / STTB', v('ijazah_no')) + baris('Tanggal ijazah', tg('ijazah_tgl')) + '</table>';
    var F = '<h4>F. LAIN-LAIN</h4><table>' + baris('Catatan yang penting', v('catatan')) + '</table>';
    var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Buku Induk - ' + esc(s.name) + '</title><style>' + CSS + '</style></head><body>' + kop() + '<h3>LEMBAR BUKU INDUK SISWA</h3>' +
      A + B + C + D + E + F +
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
      '<p class="ft">Formulir ini disimpan sebagai bukti persetujuan. Catat tanggal dan nama pemberi persetujuan pada bagian G Buku Induk; tulis butir yang tidak disetujui pada kolom Catatan.</p></body></html>';
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
  /* ---------- v8: impor langsung dari Excel Dapodik (Daftar Siswa) ----------
     Mengubah sheet Dapodik menjadi teks CSV berkolom id Buku Induk, lalu dilewatkan ke olahCsv() yang sama dengan impor CSV
     (aturan: sel kosong tidak mengubah, isian lama tidak ditimpa, NIK/NISN diperiksa, pratinjau dulu). Siswa dicocokkan lewat NISN
     -> NISN harus sudah terisi di menu Siswa (lihat js/lengkapi-siswa.js). Tidak ada perubahan Rules (kolom sama dengan simpan manual). */
  function dapKunci(c) { return String(c == null ? '' : c).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function dapTeks(c) { return String(c == null ? '' : c).replace(/^'/, '').replace(/\s+/g, ' ').trim(); }
  function dapJudul(c) { return dapTeks(c).toLowerCase().replace(/(^|[\s.\-\/])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  // "Dusun Darungan RT.002/008 KARANGHARJO, SILO, JEMBER, JAWA TIMUR, 68184, 68184" -> alamat, rtrw, desa, kec, kab, prov, pos
  function dapAlamat(a) {
    var s = dapTeks(a), o = {}; if (!s) return o;
    var p = s.split(',').map(function (x) { return x.trim(); });
    if (p.length < 4) { o.alamat = s; return o; }
    var m = /^(.*?)\s*\bRT\.?\s*(\d+)\s*\/\s*(\d+)\s*(.*)$/i.exec(p[0]);
    if (m) { o.alamat = m[1].trim(); o.rtrw = m[2] + '/' + m[3]; o.desa = dapJudul(m[4]); } else o.alamat = p[0];
    o.kec = dapJudul(p[1]); o.kab = dapJudul(p[2]); o.prov = dapJudul(p[3]);
    for (var i = 4; i < p.length; i++) if (/^\d{5}$/.test(p[i])) { o.pos = p[i]; break; }
    return o;
  }
  function dapTelp(v) {
    var d = String(v == null ? '' : v).replace(/\D/g, '');
    if (d.indexOf('62') === 0) d = '0' + d.slice(2);
    return d.length >= 9 && d.length <= 15 ? d : '';
  }
  // aoas = array sheet, masing-masing array-of-array (header:1). -> { fatal } atau { csv, catatan[] }
  function dapodikKeCsv(aoas) {
    var KOL = ['nisn', 'nama', 'nik', 'jk', 'alamat', 'rtrw', 'desa', 'kec', 'kab', 'prov', 'pos', 'telp', 'ayah_nama', 'ibu_nama', 'wali_nama', 'bea_jenis'];
    var out = [], pakai = false, wSama = 0, telpBuang = 0, adaAlamat = 0, alamatGagal = 0;
    var csvq = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    aoas.forEach(function (aoa, si) {
      var hi = -1, c = {};
      for (var i = 0; i < Math.min(aoa.length, 10) && hi < 0; i++) {
        var r = (aoa[i] || []).map(dapKunci);
        var iN = r.findIndex(function (x) { return x === 'nama lengkap' || x === 'nama' || x === 'nama siswa' || x === 'nama peserta didik'; });
        var iB = r.indexOf('nisn');
        if (iN > -1 && iB > -1) {
          hi = i; c.nama = iN; c.nisn = iB;
          c.nik = r.indexOf('nik'); c.jk = r.indexOf('jenis kelamin'); c.alamat = r.indexOf('alamat');
          c.telp = r.findIndex(function (x) { return x === 'no telepon' || x === 'no hp' || x === 'telepon' || x === 'no telepon hp'; });
          c.ayah = r.findIndex(function (x) { return x.indexOf('nama ayah') === 0; });
          c.ibu = r.findIndex(function (x) { return x.indexOf('nama ibu') === 0; });
          c.wali = r.indexOf('nama wali'); c.kip = r.findIndex(function (x) { return x.indexOf('kip') > -1 || x.indexOf('pip') > -1; });
        }
      }
      if (hi < 0) return;
      pakai = true;
      if (si === 0 || !out.length) { for (var z = 0; z < hi; z++) out.push([]); out.push(KOL.map(csvq)); }   // posisi baris = nomor baris di Excel (sheet pertama)
      else if (!out.length) out.push(KOL.map(csvq));
      for (var j = hi + 1; j < aoa.length; j++) {
        var row = aoa[j] || [], g = function (k) { return k > -1 && row[k] != null ? row[k] : ''; };
        var nisn = dapTeks(g(c.nisn)).replace(/\D/g, ''), nama = dapTeks(g(c.nama));
        if (!nisn && !nama) { out.push([]); continue; }
        if (nisn.length === 9) nisn = '0' + nisn;
        var al = dapAlamat(g(c.alamat)); if (al.alamat) { adaAlamat++; if (!al.kec) alamatGagal++; }
        var ay = dapTeks(g(c.ayah)), ib = dapTeks(g(c.ibu)), wl = dapTeks(g(c.wali));
        if (wl && (nk(wl) === nk(ay) || nk(wl) === nk(ib))) { wl = ''; wSama++; }
        var tl = dapTelp(g(c.telp)); if (c.telp > -1 && !tl && dapTeks(g(c.telp))) telpBuang++;
        var kip = dapTeks(g(c.kip)), jk = dapTeks(g(c.jk));
        var v = { nisn: nisn, nama: nama, nik: dapTeks(g(c.nik)).replace(/\D/g, ''), jk: jk, alamat: al.alamat, rtrw: al.rtrw, desa: al.desa, kec: al.kec, kab: al.kab, prov: al.prov, pos: al.pos, telp: tl, ayah_nama: ay, ibu_nama: ib, wali_nama: wl, bea_jenis: kip ? 'KIP/PIP' : '' };
        out.push(KOL.map(function (k) { return csvq(v[k] == null ? '' : v[k]); }));
      }
    });
    if (!pakai) return { fatal: 'Bukan format Excel Dapodik: butuh kolom "Nama Lengkap" dan "NISN" di baris judul. Untuk file lain, simpan sebagai CSV memakai template.' };
    var cat = ['Excel Dapodik: siswa dicocokkan lewat NISN (harus sudah terisi di menu Siswa). Yang diambil: NIK, jenis kelamin, alamat (dipecah ke RT/RW, desa, kecamatan, kabupaten, provinsi, kode pos), telepon, nama ayah/ibu/wali, dan penanda KIP/PIP (nomor KIP tidak disimpan). Kebutuhan khusus & disabilitas tidak diambil.'];
    if (wSama) cat.push(wSama + ' baris: "Nama Wali" sama dengan ayah/ibu, tidak diisi sebagai wali.');
    if (telpBuang) cat.push(telpBuang + ' baris: nomor telepon tidak valid (mis. 0), dilewati.');
    if (alamatGagal) cat.push(alamatGagal + ' alamat tidak mengikuti pola Dapodik; seluruh teks alamat dimasukkan ke kolom Alamat (cek di pratinjau).');
    return { csv: out.map(function (r) { return r.join(','); }).join('\r\n'), catatan: cat };
  }
  function unduhTemplate() {
    var kelas = ($('biTplK') || {}).value || '', penuh = ($('biTplL') || {}).value === 'semua';
    var fs = FIELDS.filter(function (f) { return f.g !== 'rkp' && (penuh || ['idn', 'alm', 'ayh', 'ibu', 'wal', 'msk'].indexOf(f.g) > -1); });
    var rows = daftarSiswa().filter(function (s) { return aktif(s) && (!kelas || namaKelas(s) === kelas); })
      .sort(function (a, b) { return urutKelas(namaKelas(a), namaKelas(b)) || String(a.name).localeCompare(String(b.name)); })
      .map(function (s) { return [s.nisn || '', s.nis || '', s.name || '', s.kelas || ''].concat(fs.map(function () { return ''; })); });
    if (!rows.length) return toast('Tidak ada siswa aktif pada pilihan itu.', true);
    unduhCsv('template-buku-induk' + (kelas ? '-' + kelas.replace(/[^\w-]+/g, '_') : '') + '.csv', [['nisn', 'nis', 'nama', 'kelas'].concat(fs.map(function (f) { return f.id; }))].concat(rows));
  }
  function bacaFile(file) {
    if (!file || !canEdit()) return;
    if (sibuk) return toast('Tunggu proses yang berjalan selesai.', true);
    if (file.size > IMPOR_MAX_BYTES) return toast('File terlalu besar (maks 2 MB).', true);
    if (/\.xlsx?$/i.test(file.name)) {   // v8: Excel Dapodik dibaca langsung
      if (typeof ensureLib !== 'function') return toast('Pembaca Excel belum tersedia. Simpan sebagai CSV (UTF-8), lalu unggah.', true, 6000);
      toast('⏳ Membaca file Excel...', false, 1500);
      ensureLib('xlsx').then(function () {
        return new Promise(function (res, rej) { var f2 = new FileReader(); f2.onload = function () { res(f2.result); }; f2.onerror = function () { rej(new Error('baca')); }; f2.readAsArrayBuffer(file); });
      }).then(function (buf) {
        if (!canEdit()) return;
        var wb = XLSX.read(buf, { type: 'array' });
        var aoas = wb.SheetNames.filter(function (n) { return n !== 'Petunjuk'; }).map(function (n) { return XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true }); });
        var d = dapodikKeCsv(aoas), h;
        if (d.fatal) h = { fatal: d.fatal, peringatan: [], rows: [], abaikan: [] };
        else { h = olahCsv(d.csv); h.peringatan = d.catatan.concat(h.peringatan); }
        imp = { phase: 'pratinjau', nama: file.name, h: h, timpa: false, konf: false };
        if (pageAktif() && tab === 'impor' && !cur) renderImporHasil();
      }).catch(function (e) { console.warn('[buku-induk] baca Excel:', e); toast('File Excel tidak bisa dibaca. Pastikan .xlsx/.xls yang valid.', true); });
      return;
    }
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
      '<li>Unggah di bawah, periksa pratinjau, lalu terapkan.</li></ol>' +
      '<div style="margin-top:6px;font-size:13px;">💡 <b>File Excel Dapodik</b> (Daftar Siswa) bisa diunggah langsung tanpa template: NIK, jenis kelamin, alamat, telepon, nama ayah/ibu/wali diambil otomatis. Syarat: NISN siswa sudah terisi di menu Siswa.</div></div>' +
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
      '<div style="margin:10px 0;"><label class="label" for="biFile">Unggah file CSV yang sudah diisi, atau Excel Dapodik (Daftar Siswa)</label><input id="biFile" type="file" accept=".csv,.txt,text/csv,.xlsx,.xls"></div>' +
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


  /* ---------- v10: riwayat kelas MASSAL per kelas (perkiraan: semua dianggap naik kelas normal; Admin mencentang/melepas per siswa) ---------- */
  var mas = null;   // { kelas, timpa, rows: [{ key, nama, est, lama, tulis, ubah, pilih }], fase }
  function estimasiRiwayat(sw) {
    var tkt = tktDari(sw.kelas), m = /^(\d{4})\/(\d{4})$/.exec(taSekarang()), o = {};
    if (!tkt || !m) return o;
    for (var j = 1; j <= tkt; j++) { var n = tkt - j; o['r' + j + '_ta'] = (+m[1] - n) + '/' + (+m[2] - n); if (j < tkt) o['r' + j + '_hasil'] = 'Naik kelas'; }
    return o;
  }
  function masHitungUbah(r, timpa) {
    var t = {}, n = 0; Object.keys(r.est).forEach(function (f) { var lm = r.lama[f]; if (lm === r.est[f]) return; if (lm && !timpa) return; t[f] = r.est[f]; n++; });
    r.tulis = t; r.ubah = n; return n;
  }
  function renderMassal() {
    var b = $('biBody'); if (!b) return;
    var kl = {}; daftarSiswa().filter(aktif).forEach(function (sw) { if (tktDari(sw.kelas)) kl[namaKelas(sw)] = 1; });
    var ko = '<option value="">-- pilih kelas --</option>' + Object.keys(kl).sort(urutKelas).map(function (k) { return '<option' + (mas && k === mas.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    var h = '<p style="font-size:13px;margin-bottom:8px;">Mengisi <b>riwayat kelas</b> (tahun ajaran &amp; hasil) untuk satu kelas sekaligus, dengan <b>perkiraan</b>: semua siswa dianggap naik kelas tiap tahun. <b>Lepas centang siswa yang pernah tinggal kelas atau pindahan</b> lalu isi manual. Hasil tahun berjalan dikosongkan.</p>' +
      '<div class="bi-bar"><select id="biMK" class="field">' + ko + '</select><label style="display:flex;align-items:center;gap:6px;font-size:13px;"><input type="checkbox" id="biMTimpa"' + (mas && mas.timpa ? ' checked' : '') + '> Timpa isian lama</label><button class="btn btn-soft" data-bi="masPratinjau"' + (sibuk ? ' disabled' : '') + '>🔍 Buat pratinjau</button></div>';
    if (mas && mas.rows) {
      var rows = mas.rows, nPilih = rows.filter(function (r) { return r.pilih && r.ubah; }).length, nUbah = rows.reduce(function (a, r) { return a + (r.pilih ? r.ubah : 0); }, 0);
      h += '<p class="text-muted" style="font-size:12.5px;margin:6px 0;">Pratinjau membaca isi Buku Induk ' + rows.length + ' siswa sekali (untuk melindungi isian lama). Kolom "Diisi" = jumlah kolom yang akan ditulis.</p>' +
        '<div class="bi-bar"><button class="btn btn-soft" data-bi="masSemua" data-v="1">Centang semua</button><button class="btn btn-soft" data-bi="masSemua" data-v="0">Lepas semua</button></div>' +
        '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th></th><th>Nama</th><th>Kelas</th><th>Perkiraan (tingkat: tahun)</th><th>Sudah terisi</th><th>Diisi</th></tr>' +
        rows.map(function (r) {
          var ks = Object.keys(r.est).filter(function (f) { return /_ta$/.test(f); }).map(function (f) { return f.replace(/^r(\d)_ta$/, '$1') + ': ' + r.est[f]; }).join(', '), terisi = Object.keys(r.lama).length;
          return '<tr><td><input type="checkbox" data-bimk="' + esc(r.key) + '"' + (r.pilih ? ' checked' : '') + (r.ubah ? '' : ' disabled') + '></td><td>' + esc(r.nama) + '</td><td>' + esc(r.kelas) + '</td><td style="font-size:12px;">' + esc(ks) + '</td><td>' + (terisi ? terisi + ' kolom' : '<span class="text-muted">kosong</span>') + '</td><td>' + (r.ubah ? r.ubah : '<span class="text-muted">sama / terlindungi</span>') + '</td></tr>';
        }).join('') + '</table></div>' +
        '<div class="bi-act"><button class="btn btn-success" data-bi="masTerapkan"' + (nPilih && !sibuk ? '' : ' disabled') + '>✅ Terapkan ke ' + nPilih + ' siswa (' + nUbah + ' kolom)</button></div>' +
        (mas.hasil ? '<div class="bi-warn" style="background:#ecfdf5;border-color:#6ee7b7;color:#065f46;margin-top:8px;">' + esc(mas.hasil) + '</div>' : '');
    }
    b.innerHTML = h;
  }
  function masPratinjau() {
    if (!canEdit() || sibuk) return;
    var kelas = ($('biMK') || {}).value, timpa = !!($('biMTimpa') || {}).checked;
    if (!kelas) return toast('Pilih kelas dulu.', true);
    var daftar = daftarSiswa().filter(function (sw) { return aktif(sw) && namaKelas(sw) === kelas && tktDari(sw.kelas); }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    if (!daftar.length) return toast('Tidak ada siswa aktif di kelas itu.', true);
    if (!/^\d{4}\/\d{4}$/.test(taSekarang())) return toast('Tahun ajaran berjalan belum terbaca (format 2026/2027).', true);
    sibuk = true; mas = { kelas: kelas, timpa: timpa, rows: null, hasil: '' };
    var sesi = mas, b = $('biBody'); if (b) b.insertAdjacentHTML('beforeend', '<p class="text-muted">⏳ Membaca…</p>');
    siap().then(function () { return Promise.all(daftar.map(function (sw) { return db.ref('buku_induk/' + sw.key).once('value'); })); }).then(function (snaps) {
      if (mas !== sesi) return;
      sesi.rows = daftar.map(function (sw, i) {
        var v = snaps[i].val() || {}, lama = {}; for (var j = 1; j <= 6; j++) { if (v['r' + j + '_ta']) lama['r' + j + '_ta'] = v['r' + j + '_ta']; if (v['r' + j + '_hasil']) lama['r' + j + '_hasil'] = v['r' + j + '_hasil']; }
        var r = { key: sw.key, nama: sw.name, kelas: sw.kelas, est: estimasiRiwayat(sw), lama: lama, pilih: true };
        masHitungUbah(r, timpa); r.pilih = r.ubah > 0; return r;
      });
    }).catch(function (e) { toast('❌ ' + ((e && e.message) || e), true, 6000); if (mas === sesi) mas = null; })
      .then(function () { sibuk = false; if (pageAktif() && !cur && tab === 'rwy') renderMassal(); });
  }
  function masTerapkan() {
    if (!canEdit() || sibuk || !mas || !mas.rows) return;
    var sesi = mas, pilih = sesi.rows.filter(function (r) { return r.pilih && r.ubah; });
    if (!pilih.length) return;
    if (!confirm('Menulis riwayat kelas (perkiraan) untuk ' + pilih.length + ' siswa kelas ' + sesi.kelas + '?\nPastikan siswa yang tinggal kelas / pindahan sudah dilepas centangnya.')) return;
    sibuk = true; var stat = { siswa: 0, kolom: 0 };
    function potong(i) {
      if (i >= pilih.length) return Promise.resolve();
      if (mas !== sesi) return Promise.reject(new Error('Dihentikan (halaman ditutup atau keluar akun).'));
      var grup = pilih.slice(i, i + POTONG);
      return Promise.all(grup.map(function (r) { return db.ref('buku_induk/' + r.key).once('value'); })).then(function (snaps) {
        var upd = {}, ubah = [], baru = {};
        grup.forEach(function (r, j) {
          var lama = snaps[j].val() || {}, tulis = {}, ada = false;   // baca ulang: hormati isian yang berubah sejak pratinjau
          Object.keys(r.est).forEach(function (f) { var sd = lama[f], v = r.est[f]; if (sd === v) return; if (sd && !sesi.timpa) return; tulis[f] = v; ada = true; });
          if (!ada) return;
          var gab = Object.assign({}, lama, tulis);
          Object.keys(tulis).forEach(function (f) { upd['buku_induk/' + r.key + '/' + f] = tulis[f]; stat.kolom++; });
          upd['buku_induk/' + r.key + '/_upd'] = firebase.database.ServerValue.TIMESTAMP;
          upd['buku_induk/' + r.key + '/_oleh'] = String(oleh()).slice(0, 100);
          var ind = { pct: persenTerisi(gab), setuju: !!(gab.setuju_tgl && gab.setuju_oleh) };
          upd['buku_induk_indeks/' + r.key] = { pct: ind.pct, setuju: ind.setuju, upd: firebase.database.ServerValue.TIMESTAMP };
          ubah.push(r.key); baru[r.key] = ind;
        });
        if (!ubah.length) return;
        return db.ref().update(upd).then(function () { idx = idx || {}; ubah.forEach(function (k) { catat('ubah', k); stat.siswa++; idx[k] = baru[k]; }); });
      }).then(function () { return potong(i + POTONG); });
    }
    siap().then(function () { return potong(0); }).then(function () {
      try { addLog('buku_induk_riwayat_massal', sesi.kelas + ': ' + stat.siswa + ' siswa'); } catch (e) { }
      sesi.hasil = '✅ Selesai: ' + stat.siswa + ' siswa, ' + stat.kolom + ' kolom diisi. Tahun ajaran & hasil perkiraan sudah tersimpan; periksa yang tinggal kelas/pindahan di formulir masing-masing.';
      sesi.rows.forEach(function (r) { r.pilih = false; r.ubah = 0; });
    }).catch(function (e) { sesi.hasil = '❌ ' + ((e && e.message) || e) + (stat.siswa ? ' (sebagian sudah tersimpan: ' + stat.siswa + ' siswa)' : ''); })
      .then(function () { sibuk = false; if (mas === sesi && pageAktif() && !cur && tab === 'rwy') renderMassal(); });
  }

  /* ---------- v11: rekap kehadiran & sikap SEKELAS (satu tabel; cetak & CSV). Baca-saja; 2 query per tekan (absensi 1 kelas + sikap 1 kelas), disaring ke tahun ajaran & semester pilihan ---------- */
  var hs = null;   // { kelas, ta, sem, rows, waktu, galat, kerja }
  function opsiTaHs() {
    var m = /^(\d{4})\/(\d{4})$/.exec(taSekarang()), o = [];
    if (!m) return o;
    for (var n = 0; n < 3; n++) o.push((+m[1] - n) + '/' + (+m[2] - n));
    return o;
  }
  function renderHs() {
    var b = $('biBody'); if (!b) return;
    if (!hs) hs = { kelas: '', ta: taSekarang(), sem: '', rows: null, galat: '', kerja: false };
    var kl = {}; daftarSiswa().forEach(function (sw) { if (tktDari(sw.kelas)) kl[namaKelas(sw)] = 1; });
    var ko = '<option value="">-- pilih kelas --</option>' + Object.keys(kl).sort(urutKelas).map(function (k) { return '<option' + (k === hs.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    var to = opsiTaHs().map(function (t) { return '<option' + (t === hs.ta ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
    var so = [['', 'Setahun'], ['Ganjil', 'Semester Ganjil'], ['Genap', 'Semester Genap']].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === hs.sem ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('');
    var h = '<p style="font-size:13px;margin-bottom:8px;">Rekap <b>kehadiran</b> (dari menu Absensi) dan <b>sikap</b> (dari menu Sikap Siswa) seluruh siswa satu kelas dalam satu tabel. Dibaca dari menu aslinya, tidak disimpan. Untuk tahun ajaran lalu, pilih <b>nama kelas pada tahun itu</b> (mis. siswa kelas 5 sekarang = Kelas 4 tahun lalu).</p>' +
      '<div class="bi-bar"><select id="biHK" class="field">' + ko + '</select><select id="biHT" class="field">' + to + '</select><select id="biHS" class="field">' + so + '</select><button class="btn btn-success" data-bi="hsHitung"' + (hs.kerja ? ' disabled' : '') + '>' + (hs.kerja ? '⏳ Menghitung…' : (hs.rows ? '🔄 Hitung ulang' : '📊 Hitung sekarang')) + '</button></div>';
    if (hs.galat) h += '<div class="bi-warn">' + esc(hs.galat) + '</div>';
    if (hs.rows) {
      var tot = { H: 0, S: 0, I: 0, A: 0, pel: 0, pres: 0 };
      h += '<p class="text-muted" style="font-size:12px;margin:4px 0;">' + esc(hs.kelas) + ' · ' + esc(hs.ta) + ' · ' + (hs.sem ? 'Semester ' + esc(hs.sem) : 'Setahun') + ' · dihitung ' + esc(new Date(hs.waktu).toLocaleTimeString('id-ID')) + ' · ' + hs.hari + ' hari absensi tercatat</p>' +
        '<div class="bi-bar"><button class="btn btn-soft" data-bi="hsCsv">⬇️ Unduh CSV</button><button class="btn btn-soft" data-bi="hsCetak">🖨️ Cetak</button></div>' +
        '<div style="overflow-x:auto;"><table class="bi-tbl"><tr><th>No</th><th>Nama</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alfa</th><th>% hadir</th><th>⚠️ Pelanggaran</th><th>🌟 Prestasi</th><th>Net</th></tr>' +
        hs.rows.map(function (r, i) {
          ['H', 'S', 'I', 'A', 'pel', 'pres'].forEach(function (c) { tot[c] += r[c]; });
          var n = r.H + r.S + r.I + r.A, net = r.pres - r.pel;
          return '<tr' + (n && r.H / n < 0.8 ? ' style="background:#fef2f2;"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(r.nama) + (r.nonaktif ? ' <span class="text-muted" style="font-size:11px;">(nonaktif)</span>' : '') + '</td><td>' + r.H + '</td><td>' + r.S + '</td><td>' + r.I + '</td><td>' + r.A + '</td><td>' + (n ? Math.round(100 * r.H / n) + '%' : '-') + '</td><td>' + r.pel + '</td><td>' + r.pres + '</td><td style="font-weight:700;color:' + (net >= 0 ? '#059669' : '#dc2626') + ';">' + (net >= 0 ? '+' : '') + net + '</td></tr>';
        }).join('') +
        (function () { var n = tot.H + tot.S + tot.I + tot.A; return '<tr style="font-weight:700;background:#f9fafb;"><td colspan="2">Total kelas</td><td>' + tot.H + '</td><td>' + tot.S + '</td><td>' + tot.I + '</td><td>' + tot.A + '</td><td>' + (n ? Math.round(100 * tot.H / n) + '%' : '-') + '</td><td>' + tot.pel + '</td><td>' + tot.pres + '</td><td>' + (tot.pres - tot.pel) + '</td></tr>'; })() +
        '</table></div><p class="text-muted" style="font-size:12px;margin-top:6px;">Baris merah = kehadiran di bawah 80%. Hanya hari yang diisi guru. Semester dari tanggal: Juli-Desember Ganjil, Januari-Juni Genap.</p>';
    }
    b.innerHTML = h;
  }
  function hsHitung() {
    if (!hs || hs.kerja) return;
    hs.kelas = ($('biHK') || {}).value || ''; hs.ta = ($('biHT') || {}).value || taSekarang(); hs.sem = ($('biHS') || {}).value || '';
    if (!hs.kelas) return toast('Pilih kelas dulu.', true);
    var sesi = hs, kelas = hs.kelas, ta = hs.ta, sem = hs.sem; sesi.kerja = true; sesi.galat = ''; renderHs();
    var per = {}, hari = 0;
    var ambil = function (key, nama, nonaktif) { return per[key] || (per[key] = { key: key, nama: nama, nonaktif: nonaktif, H: 0, S: 0, I: 0, A: 0, pel: 0, pres: 0 }); };
    if (ta === taSekarang()) daftarSiswa().forEach(function (sw) { if (aktif(sw) && sw.kelas === kelas) ambil(sw.key, sw.name || '-', false); });
    siap().then(function () {
      return Promise.all([db.ref('attendance').orderByChild('kelas').equalTo(kelas).once('value'), db.ref('kedisiplinan_siswa').orderByChild('kelas').equalTo(kelas).once('value')]);
    }).then(function (r) {
      r[0].forEach(function (ch) {
        var a = ch.val() || {}; if (!a.data || taDari(a) !== ta) return;
        if (sem && semDari(a.tanggal) !== sem) return;
        hari++;
        Object.keys(a.data).forEach(function (k) {
          var st = a.data[k]; if (['H', 'S', 'I', 'A'].indexOf(st) < 0) return;
          var sw = siswaByKey(k), o = ambil(k, sw ? (sw.name || '-') : '(siswa tidak dikenal)', !!sw && !aktif(sw)); o[st]++;
        });
      });
      r[1].forEach(function (ch) {
        var d = ch.val() || {}; if (!d.siswaKey || taDari(d) !== ta) return;
        if (sem && semDari(d.tanggal) !== sem) return;
        var sw = siswaByKey(d.siswaKey), o = ambil(d.siswaKey, sw ? (sw.name || '-') : (d.siswaNama || '(siswa tidak dikenal)'), !!sw && !aktif(sw));
        if (d.jenis === 'prestasi') o.pres += (+d.poin || 0); else o.pel += (+d.poin || 0);
      });
      sesi.rows = Object.keys(per).map(function (k) { return per[k]; }).sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama), 'id'); });
      sesi.hari = hari; sesi.waktu = Date.now(); catat('lihat', 'rekap_hs_' + kelas);
    }).catch(function (e) { sesi.galat = 'Gagal membaca: ' + ((e && e.message) || e); sesi.rows = null; })
      .then(function () { sesi.kerja = false; if (hs === sesi && pageAktif() && !cur && tab === 'hs') renderHs(); });
  }
  function hsBaris() {
    return hs.rows.map(function (r, i) { var n = r.H + r.S + r.I + r.A; return [i + 1, r.nama, r.H, r.S, r.I, r.A, n ? Math.round(100 * r.H / n) : '', r.pel, r.pres, r.pres - r.pel]; });
  }
  function hsCsv() {
    if (!hs || !hs.rows) return;
    unduhCsv('rekap-hadir-sikap-' + hs.kelas.replace(/[^\w-]+/g, '_') + '-' + hs.ta.replace('/', '-') + (hs.sem ? '-' + hs.sem : '') + '.csv', [['No', 'Nama', 'Hadir', 'Sakit', 'Izin', 'Alfa', '% hadir', 'Pelanggaran (poin)', 'Prestasi (poin)', 'Net']].concat(hsBaris()));
  }
  function hsCetak() {
    if (!hs || !hs.rows) return;
    var tot = [0, 0, 0, 0, 0, 0];
    var tr = hsBaris().map(function (r) { [2, 3, 4, 5, 7, 8].forEach(function (c, i) { tot[i] += r[c]; }); return '<tr>' + r.map(function (c, i) { return '<td' + (i === 1 ? '' : ' style="text-align:center;"') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('');
    var n = tot[0] + tot[1] + tot[2] + tot[3];
    var html = '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Rekap Hadir & Sikap - ' + esc(hs.kelas) + '</title><style>' + CSS + '</style></head><body>' + kop() + '<h3>REKAP KEHADIRAN &amp; SIKAP SISWA</h3>' +
      '<p style="text-align:center;margin:0 0 8px;">' + esc(hs.kelas) + ' · Tahun ajaran ' + esc(hs.ta) + ' · ' + (hs.sem ? 'Semester ' + esc(hs.sem) : 'Setahun') + '</p>' +
      '<table><tr><th>No</th><th>Nama</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alfa</th><th>% hadir</th><th>Pelanggaran</th><th>Prestasi</th><th>Net</th></tr>' + tr +
      '<tr><th colspan="2">Total kelas</th><th>' + tot[0] + '</th><th>' + tot[1] + '</th><th>' + tot[2] + '</th><th>' + tot[3] + '</th><th>' + (n ? Math.round(100 * tot[0] / n) : '') + '</th><th>' + tot[4] + '</th><th>' + tot[5] + '</th><th>' + (tot[5] - tot[4]) + '</th></tr></table>' +
      '<div class="ttd"><div>Wali Kelas<br><br><br><br>(................................)</div><div>Kepala Madrasah<br><br><br><br>(................................)</div></div>' +
      '<p class="ft">Dicetak oleh ' + esc(oleh()) + ' pada ' + esc(tglId(hariIni())) + '. Data dari menu Absensi dan Sikap Siswa; ' + hs.hari + ' hari absensi tercatat. Dokumen internal madrasah.</p></body></html>';
    bukaDokumen(html, 'width=1000,height=900');
  }

  /* ---------- event ---------- */
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === 'biQ') { filt.q = e.target.value; clearTimeout(qTimer); qTimer = setTimeout(renderList, 200); }
    else if (id === 'biK') { filt.kelas = e.target.value; renderList(); }
    else if (id === 'biS') { filt.st = e.target.value; renderList(); }
    else if (e.type !== 'change') return;   // elemen di bawah ini hanya bereaksi pada 'change' (input file memicu 'input' + 'change')
    else if (id === 'biHadirTa') { if (cur) { var R = cur.ringkas || (cur.ringkas = { galat: {}, kerja: {}, waktu: {} }); R.hadirTa = e.target.value; R.hadir = null; R.galat.hadir = ''; var bx = $('biRingkas'); if (bx) bx.innerHTML = ringkasHtml(); } }   // ganti tahun: tidak membaca Firebase, tunggu tombol
    else if (e.target.getAttribute && e.target.getAttribute('data-bimk') && mas && mas.rows) { var kk = e.target.getAttribute('data-bimk'); mas.rows.forEach(function (r) { if (r.key === kk) r.pilih = !!e.target.checked; }); renderMassal(); }
    else if (id === 'biHK' || id === 'biHT' || id === 'biHS') { if (hs) { hs.kelas = ($('biHK') || {}).value || ''; hs.ta = ($('biHT') || {}).value || hs.ta; hs.sem = ($('biHS') || {}).value || ''; hs.rows = null; hs.galat = ''; renderHs(); } }
    else if (id === 'biMK') { mas = { kelas: e.target.value, timpa: !!(mas && mas.timpa), rows: null, hasil: '' }; renderMassal(); }
    else if (id === 'biMTimpa') { if (mas) { mas.timpa = !!e.target.checked; if (mas.rows) { mas.rows.forEach(function (r) { masHitungUbah(r, mas.timpa); r.pilih = r.ubah > 0; }); renderMassal(); } } }
    else if (id === 'biSK') { stjKelas = e.target.value; renderPersetujuan(); }
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
      case 'stjMuat': stjMuat = false; stjGalat = ''; renderPersetujuan(); break;
      case 'stjSinkron': sinkronPersetujuan(); break;
      case 'stjWa': if (kirimWaPt(b.getAttribute('data-key'))) renderPersetujuan(); break;
      case 'stjMulai': var it = barisPt().filter(function (x) { return statusPt(x) === 'belum' && adaWa(x) && !stjKirim[x.key]; }).map(function (x) { return x.key; }); if (!it.length) { toast('Tidak ada yang perlu diingatkan.', true); break; } stjAntre = { items: it, i: 0, kirim: 0, lewat: 0 }; renderPersetujuan(); break;
      case 'stjBuka': antreBuka(); break;
      case 'stjLewati': if (stjAntre) { stjAntre.i++; stjAntre.lewat++; renderPersetujuan(); } break;
      case 'stjTutup': stjAntre = null; renderPersetujuan(); break;
      case 'csvRekap': unduhRekap(); break;
      case 'csvStatus': unduhStatus(); break;
      case 'template': unduhTemplate(); break;
      case 'impTerapkan': terapkanImpor(); break;
      case 'impBatal': if (!sibuk) { imp = null; renderImporHasil(); } break;
      case 'kembali': cur = null; render(); break;
      case 'muat': idxMuat = false; idxGalat = ''; render(); break;
      case 'simpan': simpan(); break;
      case 'nilai': tarikNilai(); break;
      case 'ringkas': hitungBagian(b.getAttribute('data-b') || '', true); break;
      case 'terapkanRiwayat': terapkanRiwayat(false); break;
      case 'perkirakanRiwayat': perkirakanRiwayat(); break;
      case 'hasilIni': tetapkanHasilIni(); break;
      case 'hsHitung': hsHitung(); break;
      case 'hsCsv': hsCsv(); break;
      case 'hsCetak': hsCetak(); break;
      case 'arsipHadir': arsipkanHadir(); break;
      case 'arsipSikap': arsipkanSikap(); break;
      case 'masPratinjau': masPratinjau(); break;
      case 'masTerapkan': masTerapkan(); break;
      case 'masSemua': if (mas && mas.rows) { mas.rows.forEach(function (r) { r.pilih = r.ubah > 0 && b.getAttribute('data-v') === '1'; }); renderMassal(); } break;
      case 'terapkanRiwayatSemua': terapkanRiwayat(true); break;
      case 'pakaiOrtu': var ie = $('bif-' + (b.getAttribute('data-f') || '')); if (ie && cur && cur.siswa && cur.siswa.namaOrtu && !ie.disabled) { ie.value = String(cur.siswa.namaOrtu).slice(0, 100); ie.classList.add('bi-saran'); b.parentNode.parentNode.removeChild(b.parentNode); } break;
      case 'hapus': hapus(); break;
      case 'cetak': cetak(); break;
      case 'cetakSetuju': cetakSetuju(); break;
    }
  }

  /* ---------- reset state (logout) ---------- */
  function resetState() {
    clearTimeout(qTimer); cur = null; idx = null; idxMuat = false; idxGalat = ''; filt = { q: '', kelas: '', st: '' }; sibuk = false; tab = 'daftar'; imp = null;
    stj = null; stjMuat = false; stjGalat = ''; stjKelas = ''; stjKirim = {}; stjAntre = null; mas = null; hs = null;
    if (root) root.innerHTML = '';   // data pribadi tidak boleh tertinggal di DOM untuk pengguna berikutnya
  }
  window.bukuIndukResetState = resetState;

  // Menu berdiri sendiri: tampil hanya untuk Admin & Kepala (Siswa & guru tidak melihatnya).
  function aturMenu() {
    var ok = false; try { ok = canView(); } catch (e) { }
    var els = document.querySelectorAll('[data-page="' + PAGE + '"]');
    for (var i = 0; i < els.length; i++) els[i].style.display = ok ? '' : 'none';
  }
  function init() {
    injectCss(); ensurePage(); aturMenu();
    setInterval(function () { if (!document.hidden) aturMenu(); }, 2000);
    var origLogout = window.logout;
    if (typeof origLogout === 'function' && !origLogout.__bi) {
      var wl = function () { try { return origLogout.apply(this, arguments); } finally { try { resetState(); aturMenu(); } catch (e) { console.error('[buku-induk]', e); } } };
      wl.__bi = true; window.logout = wl;
    }
    var orig = window.navigateTo;
    if (typeof orig !== 'function') return;
    window.navigateTo = function (page) {
      var r = orig.apply(this, arguments);
      aturMenu();
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
