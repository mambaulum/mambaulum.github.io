/* ============================================================
   SI MAMBA - js/surat-guru.js  (v7)
   Surat resmi untuk GURU, disatukan dengan halaman "Surat & Ijin" (siswa) yang sudah ada,
   tetapi kodenya terpisah dari app.js.

   Cara kerja:
   - Tidak mengubah app.js. Saat halaman Surat & Ijin dibuka, modul ini menyisipkan tab
     "Surat Siswa | Surat Guru" (tab hanya untuk Admin & Kepala Madrasah). Mode Siswa = tampilan lama.
   - Mode Guru memakai KOP, kolom Preview, dan Riwayat Surat yang SAMA dengan surat siswa.
   - Jenis surat: SK Pengangkatan Guru, Surat Keterangan Keaslian TMT, SK Pembagian Jadwal
     Mengajar (otomatis dari data Jadwal), Surat Keterangan Aktif Mengajar, Surat Tugas, SKMT (Surat Keterangan Melaksanakan Tugas).
   - Satu sumber isi (susun()) dipakai untuk preview HTML DAN PDF, jadi keduanya selalu sama.
   - Tersimpan di node Firebase 'surat' yang sudah ada (field sama persis dengan surat siswa;
     jenis diawali "guru-", kelas = "GURU"), sehingga tampil di Riwayat Surat yang sama dan
     tidak tampil bagi Wali Kelas. Bila Firebase Rules menolak, toast "Gagal simpan" muncul.

   - [v2] Modul ini juga menyediakan kerangka tab: modul lain (mis. js/agenda-surat.js) dapat
     menambah tab sendiri lewat window.SIMambaSuratTab.daftar({id,label,boleh,buat,buka}).
     Mode tambahan menyembunyikan preview/riwayat surat dan menampilkan panelnya sendiri.

   - [v3] Data kepegawaian guru (NIP/NIY, PegID, TTL, pendidikan, jabatan, status, TMT, nomor &
     tanggal SK) bisa DISIMPAN SEKALI lewat tombol "Simpan Data Guru" dan otomatis terisi saat guru
     dipilih lagi. Disimpan di node Firebase BARU 'data_pegawai/{guruKey}', sengaja BUKAN di node
     'guru' karena daftar guru dibaca sebelum login (anonim) dan tidak boleh memuat data pribadi.
     Tambahkan 'data_pegawai' ke Firebase Rules bila Rules membatasi node. Catatan: Rules
     (auth != null) tidak bisa membatasi baca hanya untuk Admin; simpan hanya data yang memang
     perlu (jangan NIK/alamat rumah).

   CATATAN PENTING:
   - Hasilnya DRAF yang harus ditandatangani & dicap pejabat berwenang. Semua data (terutama
     TMT dan nomor SK) diisi manual oleh Admin sesuai dokumen asli; modul ini tidak menebak
     atau mengisi otomatis tanggal TMT.
   - Nomor surat otomatis (counter Firebase 'nomor_surat'); boleh diketik manual (surat guru). Bila penomoran
     gagal, nomor jatuh ke titik-titik / proses dibatalkan dengan pesan. Tidak ada nomor acak.
   - Surat SISWA (preview/PDF/simpan) kini juga dikerjakan di file ini dan memakai counter yang sama
     (lihat bagian "SURAT SISWA" di bawah); fungsi lamanya sudah dihapus dari app.js (v92).

   KETERGANTUNGAN (app.js): currentUser, allGuru, allJadwal, jamSettings, MADRASAH,
   currentTahunAjaran, currentSemesterAktif, db, toast, escapeHtml, tglLokal, addLog,
   selectedSiswaSurat, isWaliKelas, buatIsiSuratPlain, loadSuratRiwayat,
   isAdmin, isKepsek, isBusy/setBusy/clearBusy, samaNamaGuru, generateKopSuratHTML,
   ensureLib, v4LoadLogoForPdf, v4LoadTtdKepalaForPdf, v4TambahLogoKeKopPdf, ttdKepalaPdf.
   Dimuat SESUDAH app.js.
============================================================ */
(function () {
  'use strict';

  var HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var DASAR_DEFAULT = [
    'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
    'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen;',
    'Peraturan Pemerintah Nomor 55 Tahun 2007 tentang Pendidikan Agama dan Pendidikan Keagamaan;',
    'Peraturan Pemerintah Nomor 74 Tahun 2008 tentang Guru sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 19 Tahun 2017;',
    'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 4 Tahun 2022;',
    'Peraturan Menteri Agama Nomor 90 Tahun 2013 tentang Penyelenggaraan Pendidikan Madrasah sebagaimana telah diubah dengan Peraturan Menteri Agama Nomor 60 Tahun 2015 dan Peraturan Menteri Agama Nomor 66 Tahun 2016;',
    'Keputusan Menteri Agama Nomor 1006 Tahun 2021 tentang Pedoman Pengangkatan Guru pada Madrasah yang Diselenggarakan oleh Masyarakat;',
    'Akta Pendirian Yayasan Pendidikan Islam Sirojul Ulum Karangharjo Nomor 79 tanggal 30 Desember 2015 yang dibuat di hadapan Onny Bunga Novasari, S.H., M.Kn., Notaris di Jember, dan telah mendapat pengesahan Menteri Hukum dan Hak Asasi Manusia Nomor AHU-0034526.AH.01.04 Tahun 2015;',
    'Akta Pernyataan Keputusan Pembina Yayasan Pendidikan Islam Sirojul Ulum Karangharjo Nomor 3 tanggal 18 Juli 2025 yang dibuat di hadapan Onny Bunga Novasari, S.H., M.Kn., Notaris di Jember, tentang susunan Pembina, Pengurus, dan Pengawas Yayasan;',
    'Keputusan Menteri Agama Republik Indonesia Nomor 3607 Tahun 2016 tanggal 15 Juli 2016 tentang Pemberian Izin Pendirian/Operasional Madrasah Ibtidaiyah Mambaul Ulum Kabupaten Jember Provinsi Jawa Timur;'
  ].join('\n');
  var TITIK = '………………';

  // Rata kiri-kanan (justify) untuk satu baris PDF. Baris terakhir paragraf, baris pendek, atau baris yang
  // celah antarkatanya akan melebar >3x normal dibiarkan rata kiri supaya tidak terlihat bolong.
  function tulisRata(doc, baris, x, y, lebar, rata) {
    if (!rata) { doc.text(baris, x, y); return; }
    var kata = String(baris).trim().split(/\s+/);
    if (kata.length < 2) { doc.text(baris, x, y); return; }
    var total = 0; kata.forEach(function (k) { total += doc.getTextWidth(k); });
    var celah = (lebar - total) / (kata.length - 1), normal = doc.getTextWidth(' ');
    if (celah < normal * 0.9 || celah > normal * 4.5) { doc.text(baris, x, y); return; }
    var cx = x; kata.forEach(function (k, i) { doc.text(i < kata.length - 1 ? k + ' ' : k, cx, y); cx += doc.getTextWidth(k) + celah; });
  }
  // Penomoran otomatis mengikuti PMA 12/2026 (Tata Naskah Dinas): nomor urut/Kode Jabatan/Klasifikasi Arsip[/Kode Naskah]/bulan/tahun.
  // Ubah KODE & KLAS di sini bila madrasah memakai kode jabatan / klasifikasi arsip yang berbeda.
  var KODE = { kepala: 'MI-MU', yayasan: 'YPI-SU' };
  var KLAS = { 'sk-pengangkatan': 'KP.01', 'ket-tmt': 'KP.01', 'sk-jadwal': 'KP.01', 'ket-aktif': 'KP.01', 'surat-tugas': 'KP.01', 'skmt': 'KP.01' };
  // Kode klasifikasi arsip surat SISWA — pilihan di dropdown "Kode Klasifikasi Arsip" (halaman Surat & Ijin).
  // CATATAN: daftar ini kode INTERNAL madrasah (bukan kode resmi Kemenag). Silakan ubah/tambah baris di sini;
  // dropdown otomatis mengikuti. KLAS_BAWAAN_SISWA = kode yang dipakai bila dropdown dibiarkan "Otomatis".
  var KLAS_PILIHAN_SISWA = [
    { kode: 'KS.01', label: 'Kesiswaan — keterangan siswa (aktif, pindah)' },
    { kode: 'KS.02', label: 'Kesiswaan — kehadiran (ijin, sakit)' },
    { kode: 'KS.00', label: 'Kesiswaan — umum' }
  ];
  var KLAS_BAWAAN_SISWA = { aktif: 'KS.01', pindah: 'KS.01', ijin: 'KS.02', sakit: 'KS.02' };
  Object.keys(KLAS_BAWAAN_SISWA).forEach(function (k) { KLAS[k] = KLAS_BAWAAN_SISWA[k]; });
  // Surat KELUAR umum (undangan, pemberitahuan, dll; dipakai Agenda Surat). Seri nomor sendiri (kategori 'B').
  var KLAS_UMUM = [{ kode: 'UM.01', label: 'Umum — surat dinas, undangan, pemberitahuan' }]
    .concat(KLAS_PILIHAN_SISWA, [{ kode: 'KP.01', label: 'Kepegawaian' }]);
  KLAS['surat-keluar'] = 'UM.01';
  // Data Yayasan (sumber: Akta No. 79/2015, Akta No. 3/2025, KMA 3607/2016). Ubah di sini bila ada perubahan pengurus.
  var YAYASAN = {
    nama: 'Yayasan Pendidikan Islam Sirojul Ulum Karangharjo',
    ketua: 'Achmad Syauqi',
    akta: 'Akta Pendirian Nomor 79 tanggal 30 Desember 2015',
    sah: 'Pengesahan Menkumham Nomor AHU-0034526.AH.01.04 Tahun 2015',
    alamat: 'Darungan, Desa Karangharjo, Kecamatan Silo, Kabupaten Jember, Jawa Timur',
    // Teks kop surat yayasan (mengikuti kop resmi yayasan). Ubah di sini bila ada perubahan.
    kopNama: 'YAYASAN PENDIDIKAN ISLAM SIROJUL ULUM',
    kopSK: 'SK MENTERI HUKUM DAN HAK ASASI MANUSIA No. AHU-0034526.AH.01.04.TAHUN 2015',
    kopAkte: 'Akte notaris : ONNY BUNGA NOVASARI, S.H., M.Kn. No. 79 / 30 DESEMBER 2015',
    kopLembaga: 'Lembaga Pendidikan Paud, Madin & Madrasah Ibtidaiyah (MI)',
    kopJalan: 'Alamat: Jl. Darungan, Desa Karangharjo, Kec. Silo, Kab. Jember, Jawa Timur 68184  |  Telp. 085288798494'
  };

  // Kolom isian per jenis surat
  var FIELD = {
    nomor:   { l: 'Nomor Surat (otomatis)', t: 'text', ph: 'terisi otomatis; boleh diketik manual' },
    klas:    { l: 'Kode Klasifikasi Arsip', t: 'text', ph: 'mis. KP.01' },
    tanggal: { l: 'Tanggal Surat', t: 'date' },
    nip:     { l: 'NIP / NIY', t: 'text' },
    nuptk:   { l: 'PegID', t: 'text' },
    ttl:     { l: 'Tempat, Tanggal Lahir', t: 'text', ph: 'mis. Banyuwangi, 12 Mei 1990' },
    pend:    { l: 'Pendidikan Terakhir', t: 'text', ph: 'mis. S1 PGMI' },
    jabatan: { l: 'Jabatan', t: 'text', ph: 'mis. Guru Kelas / Guru Mapel PAI' },
    status:  { l: 'Status Kepegawaian', t: 'text', ph: 'mis. Guru Tetap Yayasan' },
    tmt:     { l: 'Tanggal TMT', t: 'date' },
    nosk:    { l: 'Nomor SK Pengangkatan', t: 'text' },
    tglsk:   { l: 'Tanggal SK Pengangkatan', t: 'date' },
    dasar:   { l: 'Dasar Hukum (Mengingat) — satu baris per butir', t: 'area' },
    tugas:   { l: 'Tugas / Kegiatan', t: 'text', ph: 'mis. Mengikuti Workshop Kurikulum' },
    mulai:   { l: 'Tanggal Mulai', t: 'date' },
    selesai: { l: 'Tanggal Selesai', t: 'date' },
    tempat:  { l: 'Tempat Kegiatan', t: 'text' },
    guruLain:{ l: 'Guru lain yang ikut ditugaskan (opsional) — tahan Ctrl / tekan lama untuk memilih beberapa', t: 'multi' },
    keperluan:{ l: 'Keperluan / Maksud & Tujuan Surat', t: 'text', ph: 'mis. kelengkapan administrasi tunjangan profesi guru' },
    rujukan: { l: 'Dasar Penugasan — satu baris per butir (mis. surat undangan / program kerja)', t: 'area' },
    masa:    { l: 'Masa Berlaku SK', t: 'sel', o: [['', 'Tidak dibatasi (berlaku sampai ada keputusan baru)'], ['tahun', 'Per tahun kalender (1 Januari – 31 Desember)'], ['ta', 'Per tahun ajaran (1 Juli – 30 Juni)'], ['kustom', 'Atur tanggal sendiri (isi Tanggal Mulai & Selesai)']] },
    ketuaYys:{ l: 'Nama Ketua Yayasan (penandatangan SK)', t: 'text' },
    tembusan:{ l: 'Tembusan — satu baris per butir', t: 'area' }
  };
  var JENIS = {
    'sk-pengangkatan': { label: 'SK Pengangkatan sebagai Guru (oleh Yayasan)', file: 'SK_Pengangkatan_Guru',
      f: ['nomor', 'klas', 'tanggal', 'nip', 'nuptk', 'ttl', 'pend', 'jabatan', 'status', 'tmt', 'masa', 'mulai', 'selesai', 'dasar', 'ketuaYys', 'tembusan'], wajib: ['tmt'] },
    'ket-tmt': { label: 'Surat Keterangan Keaslian TMT', file: 'Keterangan_Keaslian_TMT',
      f: ['nomor', 'klas', 'tanggal', 'nip', 'nuptk', 'jabatan', 'status', 'tmt', 'nosk', 'tglsk', 'keperluan'], wajib: ['tmt'] },
    'sk-jadwal': { label: 'SK Pembagian Jadwal Mengajar', file: 'SK_Jadwal_Mengajar',
      f: ['nomor', 'klas', 'tanggal', 'nip', 'jabatan', 'dasar', 'tembusan'], wajib: [] },
    'ket-aktif': { label: 'Surat Keterangan Aktif Mengajar', file: 'Keterangan_Aktif_Mengajar',
      f: ['nomor', 'klas', 'tanggal', 'nip', 'nuptk', 'jabatan', 'status', 'tmt', 'keperluan'], wajib: [] },
    'surat-tugas': { label: 'Surat Tugas', file: 'Surat_Tugas',
      f: ['nomor', 'klas', 'tanggal', 'nip', 'jabatan', 'guruLain', 'tugas', 'mulai', 'selesai', 'tempat', 'rujukan'], wajib: ['tugas'] },
    'skmt': { label: 'SKMT (Surat Keterangan Melaksanakan Tugas)', file: 'SKMT',
      f: ['nomor', 'klas', 'tanggal', 'nip', 'nuptk', 'jabatan', 'status', 'tmt', 'nosk', 'tglsk', 'keperluan'], wajib: ['tmt'] }
  };

  var mode = 'siswa';
  var NODE_PEG = 'data_pegawai';
  var PEGAWAI = ['nip', 'nuptk', 'ttl', 'pend', 'jabatan', 'status', 'tmt', 'nosk', 'tglsk'];   // kolom yang disimpan per guru
  var cachePeg = {};
  var EKSTRA = {};                                           // tab tambahan dari modul lain
  window.SIMambaSuratTab = { daftar: function (def) { if (def && def.id) EKSTRA[def.id] = def; } };

  // ---------- util ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, css) { var e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; }
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function bolehGuru() { try { return !!(isAdmin() || isKepsek()); } catch (e) { return false; } }
  function fmtTgl(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function T(s) { return s ? s : TITIK; }
  function tempatSurat() { return (MADRASAH && MADRASAH.desa) ? MADRASAH.desa : 'Mambaul Ulum'; }
  function guruTerpilih() {
    var k = $('sg_guru') ? $('sg_guru').value : '';
    if (!k) return null;
    return (allGuru || []).filter(function (g) { return (g.key || g.name) === k; })[0] || null;
  }
  function jadwalGuru(g) {
    var daftar = (allJadwal || []).filter(function (j) {
      return g.key ? (j.guruKey === g.key || (!j.guruKey && samaNamaGuru(j.guru, g.name))) : (!j.guruKey && samaNamaGuru(j.guru, g.name));
    });
    daftar.sort(function (a, b) { return (HARI.indexOf(a.hari) - HARI.indexOf(b.hari)) || ((a.jam || 0) - (b.jam || 0)); });
    return daftar;
  }
  function waktuJam(n) {
    try { var s = jamSettings && jamSettings[n]; return s ? (s.mulai + '–' + s.selesai) : '-'; } catch (e) { return '-'; }
  }
  function kelasGuru(g, jadwal) {
    var set = [];
    jadwal.forEach(function (j) { if (j.kelas && set.indexOf(j.kelas) < 0) set.push(j.kelas); });
    if (set.length) return set.join(', ');
    if (g.semuaKelas) return 'semua kelas';
    return Array.isArray(g.kelas) ? g.kelas.join(', ') : (g.kelas || '');
  }

  // ---------- UI (disisipkan ke #page-surat) ----------
  function bangunUI() {
    if ($('suratGuruPanel')) return true;
    var page = $('page-surat'), sel = $('suratSiswaSelect'), prev = $('suratPreviewContainer');
    if (!page || !sel || !prev) return false;
    var baris = sel.parentElement.parentElement;            // baris kontrol surat siswa
    baris.id = baris.id || 'suratSiswaBaris';
    pasangKlasSiswa(baris);

    // Tab Siswa | Guru
    var tab = el('div', null, 'display:none;gap:8px;margin-bottom:12px;flex-wrap:wrap;'); tab.id = 'suratTab';
    var daftarTab = [['siswa', '👨‍🎓 Surat Siswa'], ['guru', '👩‍🏫 Surat Guru']];
    Object.keys(EKSTRA).forEach(function (id) { daftarTab.push([id, EKSTRA[id].label || id]); });
    daftarTab.forEach(function (x) {
      var b = el('button', 'btn btn-soft', 'padding:6px 14px;font-size:13px;'); b.type = 'button'; b.id = 'suratTab_' + x[0];
      b.textContent = x[1]; b.addEventListener('click', function () { aturMode(x[0]); }); tab.appendChild(b);
    });
    baris.parentElement.insertBefore(tab, baris);

    // Panel Guru
    var p = el('div', null, 'display:none;margin-bottom:16px;'); p.id = 'suratGuruPanel';
    var atas = el('div', null, 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;');
    var wG = el('div', null, 'flex:2;min-width:200px;'), lG = el('label', 'label'); lG.textContent = 'Pilih Guru'; lG.htmlFor = 'sg_guru';
    var sG = el('select', 'field'); sG.id = 'sg_guru'; sG.addEventListener('change', saatGuruBerganti);
    wG.appendChild(lG); wG.appendChild(sG);
    var wJ = el('div', null, 'flex:2;min-width:200px;'), lJ = el('label', 'label'); lJ.textContent = 'Jenis Surat'; lJ.htmlFor = 'sg_jenis';
    var sJ = el('select', 'field'); sJ.id = 'sg_jenis';
    Object.keys(JENIS).forEach(function (k) { var o = el('option'); o.value = k; o.textContent = '📋 ' + JENIS[k].label; sJ.appendChild(o); });
    sJ.addEventListener('change', function () { sesuaikan(); preview(true); isiNomor(true).then(function () { preview(true); }); });
    wJ.appendChild(lJ); wJ.appendChild(sJ);
    atas.appendChild(wG); atas.appendChild(wJ); p.appendChild(atas);

    var kolom = el('div', null, 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;'); kolom.id = 'sg_kolom';
    Object.keys(FIELD).forEach(function (k) {
      var f = FIELD[k], w = el('div', null, (f.t === 'area' || f.t === 'multi') ? 'flex:1 1 100%;' : 'flex:1;min-width:150px;'); w.id = 'sg_w_' + k;
      var l = el('label', 'label'); l.textContent = f.l; l.htmlFor = 'sg_' + k;
      var i = f.t === 'area' ? el('textarea', 'field') : ((f.t === 'multi' || f.t === 'sel') ? el('select', 'field') : el('input', 'field'));
      i.id = 'sg_' + k;
      if (f.t === 'area') { i.rows = k === 'dasar' ? 10 : (k === 'tembusan' ? 4 : 3); if (k === 'dasar') { i.value = DASAR_DEFAULT; i.addEventListener('input', function () { i.dataset.edit = '1'; }); } if (k === 'tembusan') i.addEventListener('input', function () { i.dataset.edit = '1'; }); }
      else if (f.t === 'multi') { i.multiple = true; i.size = 6; i.addEventListener('change', function () { siapkanGuruLain(ambil()).then(function () { preview(true); }); }); }
      else if (f.t === 'sel') { f.o.forEach(function (op) { var o = el('option'); o.value = op[0]; o.textContent = op[1]; i.appendChild(o); }); i.addEventListener('change', function () { sesuaikan(); }); }
      else { i.type = f.t; if (k === 'ketuaYys') i.value = YAYASAN.ketua; }
      if (f.ph) i.placeholder = f.ph;
      i.addEventListener('change', function () { preview(true); });
      if (k === 'nomor') {
        i.addEventListener('input', function () { i.dataset.manual = i.value.trim() ? '1' : '0'; i.dataset.auto = '0'; i.dataset.final = '0'; });
        i.addEventListener('change', function () { if (!i.value.trim()) isiNomor(true).then(function () { preview(true); }); });
      }
      if (k === 'klas') {
        i.addEventListener('input', function () { i.dataset.edit = '1'; });
        i.addEventListener('change', function () { isiNomor(false).then(function () { preview(true); }); });
      }
      if (k === 'tanggal') i.addEventListener('change', function () { isiNomor(false).then(function () { preview(true); }); });
      w.appendChild(l); w.appendChild(i);
      if (k === 'nomor') { var inf = el('p', null, 'font-size:11px;color:#6b7280;margin:3px 0 0;'); inf.id = 'sg_nomorInfo'; w.appendChild(inf); }
      kolom.appendChild(w);
    });
    p.appendChild(kolom);
    var stat = el('p', null, 'font-size:12px;color:#6b7280;margin:-4px 0 12px;min-height:16px;'); stat.id = 'sg_statusPeg'; p.appendChild(stat);

    var aksi = el('div', null, 'display:flex;gap:8px;flex-wrap:wrap;');
    [['👁️ Preview', 'btn btn-primary', function () { if (preview(false)) bukaPratinjau(kertasTerakhir); }],
     ['📥 Download PDF', 'btn btn-success', unduhPDF],
     ['💾 Simpan', 'btn btn-soft', simpan, 'btnSimpanSuratGuru'],
     ['🧑‍🏫 Simpan Data Guru', 'btn btn-soft', simpanDataGuru, 'btnSimpanDataGuru']].forEach(function (x) {
      var b = el('button', x[1]); b.type = 'button'; b.textContent = x[0]; if (x[3]) b.id = x[3];
      b.addEventListener('click', x[2]); aksi.appendChild(b);
    });
    p.appendChild(aksi);
    var cat = el('p', null, 'font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;margin-top:12px;');
    cat.textContent = 'Hasil berupa draf: wajib ditandatangani & dicap pejabat berwenang. Isi tanggal TMT, nomor surat, dan data lain sesuai dokumen asli.';
    p.appendChild(cat);
    prev.parentElement.insertBefore(p, prev);
    Object.keys(EKSTRA).forEach(function (id) {
      var q = el('div', null, 'display:none;margin-bottom:16px;'); q.id = 'suratEkstra_' + id; prev.parentElement.insertBefore(q, prev);
    });
    return true;
  }
  function isiDropdownGuru() {
    var s = $('sg_guru'); if (!s) return;
    var lama = s.value;
    s.innerHTML = '';
    var o0 = el('option'); o0.value = ''; o0.textContent = '-- Pilih Guru --'; s.appendChild(o0);
    (allGuru || []).slice().sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'id'); })
      .forEach(function (g) { var o = el('option'); o.value = g.key || g.name; o.textContent = g.name; s.appendChild(o); });
    if (lama) s.value = lama;
    isiGuruLain();
  }
  // ---------- Surat Tugas untuk beberapa guru ----------
  var cachePegLain = {};                                      // data kepegawaian guru tambahan (terpisah dari cachePeg)
  function isiGuruLain() {                                    // daftar guru tambahan = semua guru kecuali yang dipilih utama
    var s = $('sg_guruLain'); if (!s) return;
    var utama = $('sg_guru') ? $('sg_guru').value : '', pilih = {};
    Array.prototype.forEach.call(s.options || [], function (o) { if (o.selected) pilih[o.value] = true; });
    s.innerHTML = '';
    (allGuru || []).slice().sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'id'); })
      .forEach(function (g) { var k = g.key || g.name; if (k === utama) return; var o = el('option'); o.value = k; o.textContent = g.name; o.selected = !!pilih[k]; s.appendChild(o); });
  }
  function daftarGuruLain(d) {                                // [{name, nip, jab}] dari pilihan "Guru lain"
    return String(d.guruLain || '').split('\n').filter(Boolean).map(function (k) {
      var g = (allGuru || []).filter(function (x) { return (x.key || x.name) === k; })[0]; if (!g) return null;
      var p = cachePegLain[k] || {};
      return { name: g.name, nip: p.nip || '', jab: p.jabatan || 'Guru' };
    }).filter(Boolean);
  }
  function siapkanGuruLain(d) {                               // muat NIP/jabatan guru tambahan (sekali per guru)
    var ks = String(d.guruLain || '').split('\n').filter(function (k) { return k && !cachePegLain[k]; });
    return Promise.all(ks.map(function (k) {
      return db.ref(NODE_PEG + '/' + k).once('value').then(function (s) { cachePegLain[k] = s.val() || {}; }).catch(function () {});
    }));
  }
  // ---------- Data kepegawaian guru (disimpan sekali, terisi otomatis) ----------
  function setStatusPeg(teks, warna) { var e = $('sg_statusPeg'); if (e) { e.textContent = teks || ''; e.style.color = warna || '#6b7280'; } }
  function kosongkanPeg() { PEGAWAI.forEach(function (k) { var e = $('sg_' + k); if (e) e.value = ''; }); }
  function isiPeg(v) { PEGAWAI.forEach(function (k) { var e = $('sg_' + k); if (e) e.value = (v && v[k]) || ''; }); }
  function infoPeg(v) {
    var t = ''; try { t = v.updatedAt ? new Date(v.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; } catch (e) {}
    return '✅ Data guru dimuat' + (t ? ' (disimpan ' + t + (v.updatedBy ? ' oleh ' + v.updatedBy : '') + ')' : '') + '. Ubah lalu klik "Simpan Data Guru" bila ada perubahan.';
  }
  function saatGuruBerganti() {
    isiGuruLain();
    isiNomor(true).then(function () { preview(true); });
    kosongkanPeg(); setStatusPeg(''); sesuaikan();           // kosongkan dulu supaya data guru sebelumnya tidak terbawa
    var g = guruTerpilih();
    if (!g) { preview(true); return; }
    if (!g.key) { setStatusPeg('Guru ini tidak punya key; data kepegawaian tidak bisa disimpan permanen.', '#b45309'); preview(true); return; }
    var k = g.key, masihGuruIni = function () { var e = $('sg_guru'); return !!e && e.value === (g.key || g.name); };
    if (cachePeg[k]) { isiPeg(cachePeg[k]); setStatusPeg(infoPeg(cachePeg[k])); preview(true); return; }
    setStatusPeg('Memuat data guru…');
    db.ref(NODE_PEG + '/' + k).once('value').then(function (snap) {
      if (!masihGuruIni()) return;                           // pengguna sudah memilih guru lain
      var v = snap.val();
      if (v) { cachePeg[k] = v; isiPeg(v); setStatusPeg(infoPeg(v)); }
      else setStatusPeg('Belum ada data tersimpan untuk guru ini. Isi lalu klik "Simpan Data Guru" agar tidak perlu mengetik ulang.');
      preview(true);
    }).catch(function (err) {
      if (!masihGuruIni()) return;
      setStatusPeg('Gagal memuat data guru: ' + (err && err.message ? err.message : err), '#b91c1c'); preview(true);
    });
  }
  function simpanDataGuru() {
    if (!bolehGuru()) return toast('Hanya Admin & Kepala Madrasah!', true);
    var g = guruTerpilih(); if (!g) return toast('Pilih guru terlebih dahulu!', true);
    if (!g.key) return toast('Guru ini tidak punya key; data tidak bisa disimpan.', true);
    if (isBusy('simpanDataGuru')) return toast('Sedang menyimpan...', false, 1500);
    var d = ambil(), data = { updatedAt: new Date().toISOString(), updatedBy: currentUser.name }, btn = $('btnSimpanDataGuru');
    PEGAWAI.forEach(function (k) { data[k] = d[k] || ''; });
    setBusy('simpanDataGuru', btn);
    db.ref(NODE_PEG + '/' + g.key).set(data, function (err) {
      clearBusy('simpanDataGuru', btn);
      if (err) return toast('Gagal simpan: ' + err.message, true);
      cachePeg[g.key] = data; setStatusPeg(infoPeg(data)); toast('✅ Data guru tersimpan!'); addLog('simpan_data_guru', g.name);
    });
  }

  function sesuaikan() {                                     // tampilkan hanya kolom yang relevan
    var j = JENIS[$('sg_jenis').value]; if (!j) return;
    Object.keys(FIELD).forEach(function (k) {
      var w = $('sg_w_' + k); if (w) w.style.display = j.f.indexOf(k) >= 0 ? '' : 'none';
    });
    if ($('sg_jenis').value === 'sk-pengangkatan') { var kus = $('sg_masa') && $('sg_masa').value === 'kustom'; ['mulai', 'selesai'].forEach(function (k) { var w2 = $('sg_w_' + k); if (w2) w2.style.display = kus ? '' : 'none'; }); }
    var t = $('sg_tanggal'); if (t && !t.value) t.value = tglLokal();
    var tb = $('sg_tembusan'); if (tb && tb.dataset.edit !== '1') tb.value = tembusanDefault($('sg_jenis').value);
    var ds = $('sg_dasar'); if (ds && ds.dataset.edit !== '1') ds.value = dasarDefault($('sg_jenis').value);
    var kl = $('sg_klas'); if (kl && kl.dataset.edit !== '1') kl.value = KLAS[$('sg_jenis').value] || 'KP.01';
  }
  // SK Pembagian Jadwal Mengajar: dasar hukum diringkas (tanpa akta yayasan, PP 55/2007, PP 74/2008, KMA 1006/2021 yang khusus pengangkatan).
  var DASAR_JADWAL = [0, 1, 4, 5, 9].map(function (i) { return DASAR_DEFAULT.split('\n')[i]; }).join('\n');
  function dasarDefault(jenis) { return jenis === 'sk-jadwal' ? DASAR_JADWAL : DASAR_DEFAULT; }
  function tembusanDefault(jenis) {
    var kemenag = 'Kepala Kantor Kementerian Agama Kabupaten Jember';
    if (jenis === 'sk-pengangkatan') return [kemenag, 'Kepala ' + titleCase(MADRASAH.nama), 'Yang bersangkutan', 'Arsip'].join('\n');
    return [YAYASAN.nama, kemenag, 'Yang bersangkutan', 'Arsip'].join('\n');
  }
  function placeholder(teks) {
    $('suratPreview').innerHTML = kopMadrasahHTML() + '<p class="text-muted" style="text-align:center;padding:40px 0;">' + esc(teks) + '</p>';
  }
  function modeBoleh(m) {
    if (m === 'siswa') return true;
    if (m === 'guru') return bolehGuru();
    var ek = EKSTRA[m]; try { return !!(ek && (!ek.boleh || ek.boleh())); } catch (e) { return false; }
  }
  function aturMode(m) {
    if (!modeBoleh(m)) m = 'siswa';
    mode = m;
    var ek = EKSTRA[m], baris = $('suratSiswaBaris'), panel = $('suratGuruPanel'), list = $('suratRiwayatList');
    if (baris) baris.style.display = m === 'siswa' ? '' : 'none';
    if (panel) panel.style.display = m === 'guru' ? 'block' : 'none';
    Object.keys(EKSTRA).forEach(function (id) { var q = $('suratEkstra_' + id); if (q) q.style.display = id === m ? 'block' : 'none'; });
    // Preview & Riwayat Surat dipakai bersama mode Siswa/Guru; mode tambahan punya tampilan sendiri.
    [$('suratPreviewContainer'), list && list.previousElementSibling, list, $('suratPagination')].forEach(function (e) { if (e) e.style.display = ek ? 'none' : ''; });
    ['siswa', 'guru'].concat(Object.keys(EKSTRA)).forEach(function (x) {
      var b = $('suratTab_' + x); if (!b) return;
      b.style.background = x === m ? '#2563eb' : ''; b.style.color = x === m ? '#fff' : '';
    });
    if (ek) {
      var q2 = $('suratEkstra_' + m);
      try { if (q2 && !q2.dataset.siap) { q2.dataset.siap = '1'; if (ek.buat) ek.buat(q2); } if (ek.buka) ek.buka(q2); }
      catch (e) { console.error('[SI MAMBA] Tab ' + m + ' gagal dibuka:', e); }
      return;
    }
    if (m === 'guru') { isiDropdownGuru(); sesuaikan(); isiNomor(false); placeholder('Pilih guru dan jenis surat untuk melihat preview.'); }
    else {
      try { if (typeof selectedSiswaSurat !== 'undefined' && selectedSiswaSurat && typeof previewSurat === 'function') { previewSurat(); return; } } catch (e) {}
      placeholder('Pilih siswa dan jenis surat untuk melihat preview.');
    }
  }
  function saatHalamanDibuka() {
    if (!bangunUI()) return;
    var tab = $('suratTab'), ada = false;
    if (tab) {
      ['guru'].concat(Object.keys(EKSTRA)).forEach(function (id) {
        var b = $('suratTab_' + id), ok = modeBoleh(id); if (b) b.style.display = ok ? '' : 'none'; if (ok) ada = true;
      });
      tab.style.display = ada ? 'flex' : 'none';
    }
    aturMode('siswa');                                       // app.js sudah mereset preview; mulai dari mode siswa
  }

  // ---------- Isi surat (satu sumber untuk HTML & PDF) ----------
  function ambil() {
    var d = {};
    Object.keys(FIELD).forEach(function (k) {
      var e = $('sg_' + k);
      if (e && FIELD[k].t === 'multi') { d[k] = Array.prototype.filter.call(e.options || [], function (o) { return o.selected; }).map(function (o) { return o.value; }).join('\n'); return; }
      d[k] = e ? String(e.value || '').trim() : '';
    });
    return d;
  }
  function kvGuru(g, d, lengkap) {
    var r = [['Nama', g.name]];
    if (d.nip) r.push(['NIP / NIY', d.nip]);
    if (d.nuptk) r.push(['PegID', d.nuptk]);
    if (lengkap && d.ttl) r.push(['Tempat, Tgl Lahir', d.ttl]);
    if (lengkap && d.pend) r.push(['Pendidikan', d.pend]);
    r.push(['Jabatan', d.jabatan || 'Guru']);
    if (d.status) r.push(['Status', d.status]);
    return r;
  }
  // Logo Yayasan: berkas TERSENDIRI (bukan logo madrasah). Letakkan di logo/logo-yayasan.png.
  // Bila berkas belum ada, kop yayasan tampil tanpa logo (tidak pernah memakai logo madrasah).
  var LOGO_YAYASAN = 'logo/logo-yayasan.png';
  var LOGO_MAKS_PX = 320;                                     // sisi terpanjang logo di PDF (27 mm @ ~300 dpi)
  var logoYysCache;
  function muatLogoYayasan() {
    if (logoYysCache !== undefined) return Promise.resolve(logoYysCache);
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () {
        try {
          var sk = Math.min(1, LOGO_MAKS_PX / Math.max(im.naturalWidth, im.naturalHeight));   // perkecil: logo hanya tampil 27 mm di PDF
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * sk)); c.height = Math.max(1, Math.round(im.naturalHeight * sk));
          var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(im, 0, 0, c.width, c.height);   // kertas putih: JPEG jauh lebih kecil dari PNG
          logoYysCache = { data: c.toDataURL('image/jpeg', 0.88), w: c.width, h: c.height };
        } catch (e) { logoYysCache = null; }
        res(logoYysCache);
      };
      im.onerror = function () { logoYysCache = null; res(null); };
      im.src = LOGO_YAYASAN;
    });
  }
  function kopYayasanHTML() {
    var img = '<img src="' + LOGO_YAYASAN + '" alt="Logo Yayasan" style="width:92px;height:92px;object-fit:contain;" onerror="this.style.visibility=\'hidden\'">';
    var serif = 'font-family:\'Times New Roman\',Times,serif;', sans = 'font-family:Arial,Helvetica,sans-serif;';
    return '<div style="margin-bottom:14px;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<div style="flex:0 0 92px;">' + img + '</div>' +
      '<div style="flex:1;text-align:center;line-height:1.25;">' +
      '<div style="' + serif + 'font-size:23px;font-weight:700;white-space:nowrap;">' + esc(YAYASAN.kopNama) + '</div>' +
      '<div style="' + serif + 'font-size:12.5px;">' + esc(YAYASAN.kopSK) + '</div>' +
      '<div style="' + serif + 'font-size:12.5px;">' + esc(YAYASAN.kopAkte) + '</div>' +
      '<div style="' + sans + 'font-size:13px;font-weight:700;">' + esc(YAYASAN.kopLembaga) + '</div></div></div>' +
      '<div style="' + sans + 'border:1px solid #000;border-radius:3px;padding:5px 10px;margin-top:6px;font-size:11px;text-align:center;">' + esc(YAYASAN.kopJalan) + '</div></div>';
  }
  // Menggambar kop yayasan di PDF; mengembalikan koordinat y bagian bawah kop.
  function kopYayasanPdf(doc, pw, logo) {
    var ukuran = 27, x0 = 20, y0 = 11, xr = pw - 20, xt = x0 + ukuran + 3, tengah = (xt + xr) / 2, lebarTeks = xr - xt, y = 17;
    if (logo && logo.data) {
      try { var r = logo.w / logo.h, lw = r >= 1 ? ukuran : ukuran * r, lh = r >= 1 ? ukuran / r : ukuran; doc.addImage(logo.data, 'JPEG', x0 + (ukuran - lw) / 2, y0 + (ukuran - lh) / 2, lw, lh, undefined, 'FAST'); }
      catch (e) { console.error('[SI MAMBA] Gagal menambah logo yayasan:', e); }
    }
    function baris(teks, font, gaya, ukur, lebarMaks, dy) {            // perkecil huruf bila melebihi lebar
      doc.setFont(font, gaya); doc.setFontSize(ukur);
      while (doc.getTextWidth(teks) > lebarMaks && ukur > 6) { ukur -= 0.25; doc.setFontSize(ukur); }
      doc.text(teks, tengah, y, { align: 'center' }); y += dy;
    }
    baris(YAYASAN.kopNama, 'times', 'bold', 15, lebarTeks, 5.6);
    baris(YAYASAN.kopSK, 'times', 'normal', 9.5, lebarTeks, 4.6);
    baris(YAYASAN.kopAkte, 'times', 'normal', 9.5, lebarTeks, 4.8);
    baris(YAYASAN.kopLembaga, 'helvetica', 'bold', 10, lebarTeks, 0);
    var bt = Math.max(y + 3, y0 + ukuran + 3), bh = 8;
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.roundedRect(20, bt, pw - 40, bh, 1, 1);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    while (doc.getTextWidth(YAYASAN.kopJalan) > pw - 44 && doc.getFontSize() > 6) doc.setFontSize(doc.getFontSize() - 0.25);
    doc.text(YAYASAN.kopJalan, pw / 2, bt + 5.3, { align: 'center' });
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    return bt + bh;
  }
  // ---- KOP MADRASAH (logo lembaga) -- anti tumpang tindih ----
  // Sebelumnya teks kop dipusatkan di tengah HALAMAN, sehingga baris alamat / telp yang panjang
  // melebar sampai ke area logo di kiri. Kini teks dipusatkan di kolom di KANAN logo, dan baris
  // yang terlalu panjang diperkecil / dipecah agar tidak pernah masuk ke kotak logo.
  var LOGO_MADRASAH = 'logo/logo-lembaga.png';
  function muatGambarInfo(src) {                                  // -> {data,w,h,fmt} atau null
    return new Promise(function (res) {
      if (!src) return res(null);
      var im = new Image();
      im.onload = function () {
        var sk = Math.min(1, LOGO_MAKS_PX / Math.max(im.naturalWidth, im.naturalHeight)), data;
        try {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * sk)); c.height = Math.max(1, Math.round(im.naturalHeight * sk));
          var cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(im, 0, 0, c.width, c.height); data = c.toDataURL('image/jpeg', 0.88);
          res({ data: data, w: c.width, h: c.height, fmt: 'JPEG' });
        } catch (e) { res(null); }
      };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }
  function muatLogoMadrasah(l) {                                  // l = hasil v4LoadLogoForPdf() (bentuk apa pun) -> info logo
    var src = typeof l === 'string' ? l : (l && (l.data || l.dataUrl || l.base64 || l.src)) || '';
    return muatGambarInfo(src).then(function (r) { return r || muatGambarInfo(LOGO_MADRASAH); });
  }
  function kopMadrasahPdf(doc, pw, logo) {                        // mengembalikan y garis bawah kop (>= 40)
    var ukuran = 26, x0 = 20, y0 = 10, xr = pw - 20, xt = x0 + ukuran + 4, tengah = (xt + xr) / 2, lebarTeks = xr - xt, y = 16;
    if (logo && logo.data) {
      try { var r = logo.w / logo.h, lw = r >= 1 ? ukuran : ukuran * r, lh = r >= 1 ? ukuran / r : ukuran; doc.addImage(logo.data, logo.fmt || 'PNG', x0 + (ukuran - lw) / 2, y0 + (ukuran - lh) / 2, lw, lh, undefined, 'FAST'); }
      catch (e) { console.error('[SI MAMBA] Gagal menambah logo madrasah:', e); }
    }
    function baris(teks, gaya, ukur, dy, boleh2) {                // perkecil dulu (min 8pt); bila masih panjang, pecah ke beberapa baris
      if (!teks) return;
      doc.setFont('helvetica', gaya); doc.setFontSize(ukur);
      while (doc.getTextWidth(teks) > lebarTeks && ukur > (boleh2 ? 8 : 6)) { ukur -= 0.25; doc.setFontSize(ukur); }
      var rs = doc.getTextWidth(teks) > lebarTeks ? doc.splitTextToSize(teks, lebarTeks) : [teks];
      rs.forEach(function (t) { doc.text(t, tengah, y, { align: 'center' }); y += dy; });
    }
    baris(String(MADRASAH.nama || '').toUpperCase(), 'bold', 16, 5.5, false);
    if (MADRASAH.nsm) baris('NSM: ' + MADRASAH.nsm, 'bold', 10, 4.6, false);
    baris(MADRASAH.alamat, 'normal', 10, 4.4, true);
    baris('Telp: ' + MADRASAH.telp + '  |  Email: ' + MADRASAH.email + '  |  Web: ' + MADRASAH.website, 'normal', 10, 4.4, true);
    var yb = Math.max(y + 0.5, y0 + ukuran + 2, 38);
    doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(20, yb, pw - 20, yb); doc.line(20, yb + 2, pw - 20, yb + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    return yb + 2;
  }
  function kopMadrasahHTML() { return generateKopSuratHTML(); }   // satu sumber: app.js
  // ---- PRATINJAU CETAK (tampilan seperti print preview) ----
  // Dibuka dari tombol Preview: kertas A4/F4 di atas latar abu-abu, zoom, Cetak (dialog print browser), Download PDF.
  var kertasTerakhir = 'A4';
  function bukaPratinjau(kertas) {
    var isi = $('suratPreview'); if (!isi) return;
    tutupPratinjau();
    var f4 = kertas === 'F4', tinggi = f4 ? 330 : 297, guru = mode !== 'siswa';
    var pad = '20mm 20mm 25mm 30mm', margin = '20mm 20mm 25mm 30mm';   // PMA 12/2026: atas 2, kanan 2, bawah 2,5, kiri 3 cm
    var o = el('div', null, 'position:fixed;inset:0;z-index:99999;background:#525659;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;');
    o.id = 'sgPrevOverlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Pratinjau cetak');
    var bar = el('div', null, 'flex:0 0 auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#323639;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4);');
    var jdl = el('div', null, 'font-size:14px;font-weight:700;flex:1;min-width:140px;'); jdl.textContent = 'Pratinjau Cetak · ' + (f4 ? 'F4' : 'A4');
    bar.appendChild(jdl);
    function tb(label, fn, css) { var b = el('button', null, 'border:0;border-radius:6px;padding:7px 12px;font-size:13px;font-weight:600;cursor:pointer;' + (css || 'background:#4b5054;color:#fff;')); b.type = 'button'; b.innerHTML = label; b.addEventListener('click', fn); bar.appendChild(b); return b; }
    var zl = el('span', null, 'font-size:13px;min-width:44px;text-align:center;');
    var zoom = 1;
    function setZoom(z) { zoom = Math.max(0.3, Math.min(2, z)); kertasEl.style.zoom = zoom; zl.textContent = Math.round(zoom * 100) + '%'; }
    function fit() { setZoom(Math.min(1, (window.innerWidth - 24) / (210 * 96 / 25.4))); }
    tb('−', function () { setZoom(zoom - 0.1); }); bar.appendChild(zl); tb('+', function () { setZoom(zoom + 0.1); }); tb('Pas', fit);
    tb('🖨️ Cetak', function () { cetakPratinjau(kertasEl, f4, margin); }, 'background:#2563eb;color:#fff;');
    if (mode === 'siswa' || mode === 'guru') tb('📥 PDF', function () { if (mode === 'siswa') window.downloadSuratPDF(); else unduhPDF(); }, 'background:#16a34a;color:#fff;');
    tb('✕ Tutup', tutupPratinjau, 'background:#dc2626;color:#fff;');
    o.appendChild(bar);
    var area = el('div', null, 'flex:1 1 auto;overflow:auto;padding:16px 12px 40px;text-align:center;-webkit-overflow-scrolling:touch;');
    var kertasEl = el('div', null, 'display:block;width:210mm;min-height:' + tinggi + 'mm;margin:0 auto;box-sizing:border-box;background:#fff;color:#000;text-align:left;padding:' + pad + ';' +
      "font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;box-shadow:0 2px 12px rgba(0,0,0,.5);" +
      'background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(' + tinggi + 'mm - 1px),#cbd5e1 calc(' + tinggi + 'mm - 1px),#cbd5e1 ' + tinggi + 'mm);');
    kertasEl.innerHTML = isi.innerHTML;
    area.appendChild(kertasEl); o.appendChild(area);
    document.body.appendChild(o);
    pratinjauState = { overflow: document.body.style.overflow };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', escPratinjau);
    fit();
  }
  var pratinjauState = null;
  function escPratinjau(e) { if (e.key === 'Escape') tutupPratinjau(); }
  function tutupPratinjau() {
    var o = $('sgPrevOverlay'); if (o) o.remove();
    if (pratinjauState) { document.body.style.overflow = pratinjauState.overflow; pratinjauState = null; }
    document.removeEventListener('keydown', escPratinjau);
  }
  function cetakPratinjau(kertasEl, f4, margin) {
    var fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(fr);
    var d = fr.contentWindow.document;
    var css = Array.prototype.map.call(document.querySelectorAll('link[rel="stylesheet"],style'), function (n) { return n.outerHTML; }).join('');
    d.open();
    d.write('<!doctype html><html><head><meta charset="utf-8"><base href="' + document.baseURI + '"><title>Surat</title>' + css +
      '<style>@page{size:210mm ' + (f4 ? 330 : 297) + 'mm;margin:' + margin + '}html,body{margin:0;padding:0;background:#fff;}p,li,tr,img,.judul-surat,.nomor-surat,.footer{break-inside:avoid;page-break-inside:avoid;}p,li{orphans:2;widows:2;}' +
      "body{font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.5;color:#000;}</style></head><body>" + kertasEl.innerHTML + '</body></html>');
    d.close();
    var imgs = Array.prototype.slice.call(d.images || []);
    var tunggu = Promise.all(imgs.map(function (im) { return im.complete ? 1 : new Promise(function (r) { im.onload = im.onerror = r; }); }));
    Promise.race([tunggu, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
      try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('❌ Gagal membuka dialog cetak.', true); }
      setTimeout(function () { if (fr.parentNode) fr.parentNode.removeChild(fr); }, 60000);
    });
  }
  function pushMengingat(B, d) {
    B.push({ t: 'p', s: 'Mengingat :', b: true });
    (d.dasar || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x, i) { B.push({ t: 'ol', k: (i + 1) + '.', s: x }); });
  }
  function titleCase(x) { return String(x || '').toLowerCase().replace(/(^|[\s(\/-])([a-z])/g, function (m0, a0, b0) { return a0 + b0.toUpperCase(); }); }
  function tanpaGelar(n) {                                   // PMA 12/2026: nama penandatangan/penerima tugas ditulis tanpa gelar
    var x = String(n || '').split(',')[0].trim();
    x = x.replace(/^((prof|dr|drs|dra|ir)\.?\s+)+/i, '');
    var t = x.split(/\s+/);
    while (t.length > 1 && /^(s|m|d)\.[a-z.]+$/i.test(t[t.length - 1])) t.pop();
    return titleCase(t.join(' '));
  }
  function tembusanBlok(arr) {                               // 1 penerima: tanpa nomor; >1: bernomor, ';' dan 'dan'
    var a = (arr || []).map(function (x) { return String(x).trim().replace(/[;.\s]+$/, ''); }).filter(Boolean);
    if (!a.length) return null;
    if (a.length === 1) return { judul: 'Tembusan', nomor: false, baris: [a[0]] };
    return { judul: 'Tembusan:', nomor: true, baris: a.map(function (x, k) { return x + (k === a.length - 1 ? '.' : (k === a.length - 2 ? '; dan' : ';')); }) };
  }
  // ---------- Penomoran otomatis ----------
  var nomorToken = 0;
  function kodeJabatan(jenis) { return jenis === 'sk-pengangkatan' ? KODE.yayasan : KODE.kepala; }
  function kategoriNomor(jenis) { if (jenis === 'surat-keluar') return 'B'; return (jenis === 'sk-pengangkatan' || jenis === 'sk-jadwal') ? 'SK' : (jenis === 'surat-tugas' ? 'ST' : 'SKET'); }
  function bagianTanggal(d) { var iso = d.tanggal || tglLokal(); return { yy: iso.slice(0, 4), mm: iso.slice(5, 7) }; }
  function kunciCounter(jenis, yy) { return 'nomor_surat/' + yy + '/' + (kodeJabatan(jenis) + '_' + kategoriNomor(jenis)).replace(/[^A-Za-z0-9_-]/g, '_'); }
  function susunNomor(jenis, n, d) {
    var t = bagianTanggal(d), p = [(n < 10 ? '00' : n < 100 ? '0' : '') + n, kodeJabatan(jenis), d.klas || KLAS[jenis] || 'KP.01'];
    if (jenis === 'surat-keluar' && !d.internal) p.unshift('B');                // PMA 12/2026 Lampiran Tata Penomoran huruf e: korespondensi eksternal diawali kategori keamanan (B = biasa)
    if (kategoriNomor(jenis) === 'SKET') p.push('SKet');
    p.push(t.mm, t.yy);
    return p.join('/');
  }
  function setInfoNomor(teks, warna) { var e = $('sg_nomorInfo'); if (e) { e.textContent = teks || ''; e.style.color = warna || '#6b7280'; } }
  function isiNomor(force) {                                 // tampilkan nomor berikutnya (belum dikunci)
    var e = $('sg_nomor'), j = $('sg_jenis'); if (!e || !j) return Promise.resolve();
    if (!force && (e.dataset.manual === '1' || e.dataset.final === '1')) return Promise.resolve();
    var jenis = j.value, d = ambil(), t = bagianTanggal(d), tok = ++nomorToken;
    e.dataset.manual = '0'; e.dataset.final = '0'; e.dataset.auto = '0';
    setInfoNomor('Menghitung nomor otomatis…');
    return db.ref(kunciCounter(jenis, t.yy)).once('value').then(function (snap) {
      if (tok !== nomorToken) return;
      var n = (parseInt(snap.val(), 10) || 0) + 1;
      e.value = susunNomor(jenis, n, d); e.dataset.auto = '1';
      setInfoNomor('🔢 Nomor otomatis (urutan ke-' + n + ' tahun ' + t.yy + '). Dikunci saat Simpan / Download PDF. Ketik manual bila ingin mengganti.');
    }).catch(function (err) {
      if (tok !== nomorToken) return;
      e.value = '';
      setInfoNomor('Gagal membaca penomoran (' + (err && err.message ? err.message : err) + '). Isi nomor manual, atau izinkan node "nomor_surat" di Firebase Rules.', '#b91c1c');
    });
  }
  function pastikanNomor(jenis, d) {                         // kunci nomor (counter +1) hanya sekali per surat
    var e = $('sg_nomor');
    if (!e || e.dataset.auto !== '1') return Promise.resolve(e ? e.value.trim() : '');
    var t = bagianTanggal(d);
    return new Promise(function (res, rej) {
      db.ref(kunciCounter(jenis, t.yy)).transaction(function (cur) { return (parseInt(cur, 10) || 0) + 1; }, function (err, committed, snap) {
        if (err || !committed) return rej(err || new Error('penomoran dibatalkan'));
        var nomor = susunNomor(jenis, snap.val(), d);
        e.value = nomor; e.dataset.auto = '0'; e.dataset.final = '1';
        setInfoNomor('✅ Nomor ' + nomor + ' sudah dikunci untuk surat ini.', '#047857');
        res(nomor);
      });
    });
  }
  function kvTugas(g, d) {
    var r = [['Nama', tanpaGelar(g.name)]];
    if (d.nip) r.push(['NIP / NIY', d.nip]);
    r.push(['Jabatan', d.jabatan || 'Guru']);
    return r;
  }
  function kvKepala() {
    return [['Nama', MADRASAH.kepala_sekolah], ['NIP', MADRASAH.nip_kepala_sekolah], ['Jabatan', 'Kepala ' + MADRASAH.nama]];
  }
  // Masa berlaku SK pengangkatan: kembalikan {a, b} (ISO) atau null bila tidak dibatasi.
  function masaSK(d) {
    var iso = d.tanggal || tglLokal(), y = parseInt(String(iso).slice(0, 4), 10);
    if (d.masa === 'tahun') return { a: y + '-01-01', b: y + '-12-31' };
    if (d.masa === 'ta') {
      var m0 = String(currentTahunAjaran || '').match(/(\d{4})/), y0 = m0 ? parseInt(m0[1], 10) : y;
      return { a: y0 + '-07-01', b: (y0 + 1) + '-06-30' };
    }
    if (d.masa === 'kustom' && d.mulai && d.selesai) return { a: d.mulai, b: d.selesai };
    return null;
  }
  function susun(jenis, d, g) {
    var m = MADRASAH.nama, mU = m.toUpperCase(), ta = currentTahunAjaran + ' Semester ' + currentSemesterAktif;
    var tgl = fmtTgl(d.tanggal) || fmtTgl(tglLokal());
    var S = { judul: [], tentang: [], nomor: d.nomor || TITIK, blok: [], tempat: tempatSurat(), tanggal: tgl,
              ttd: 'Kepala ' + titleCase(m), penanda: tanpaGelar(MADRASAH.kepala_sekolah), sk: false, yys: false, tembusan: [] };
    var B = S.blok, tmt = fmtTgl(d.tmt), jab = d.jabatan || 'Guru', jadwal = [], kep = d.keperluan || 'kelengkapan administrasi';
    function pembukaSK(jabatanPembentuk) {
      B.push({ t: 'p', s: 'DENGAN RAHMAT TUHAN YANG MAHA ESA', b: true, c: true });
      B.push({ t: 'p', s: jabatanPembentuk + ',', b: true, c: true });
    }
    switch (jenis) {
      case 'sk-pengangkatan':
        var jabYys = 'KETUA ' + YAYASAN.nama.toUpperCase();
        S.yys = true; S.ttd = 'Ketua ' + YAYASAN.nama; S.penanda = tanpaGelar(d.ketuaYys || YAYASAN.ketua);
        S.judul = ['KEPUTUSAN KETUA YAYASAN PENDIDIKAN ISLAM SIROJUL ULUM']; S.garis = true; S.tentang = ['PENGANGKATAN GURU PADA', mU];
        pembukaSK(jabYys);
        B.push({ t: 'p', s: 'Menimbang :', b: true });
        B.push({ t: 'ol', k: 'a.', s: 'bahwa untuk kelancaran penyelenggaraan kegiatan belajar mengajar di ' + m + ' perlu mengangkat guru;' });
        B.push({ t: 'ol', k: 'b.', s: 'bahwa nama yang tercantum dalam keputusan ini dinilai memenuhi syarat dan layak diangkat sebagai guru;' });
        pushMengingat(B, d);
        B.push({ t: 'p', s: 'MEMUTUSKAN', b: true, c: true });
        B.push({ t: 'p', s: 'Menetapkan : KEPUTUSAN ' + jabYys + ' TENTANG PENGANGKATAN GURU PADA ' + mU + '.', b: true });
        B.push({ t: 'p', s: 'KESATU : Mengangkat saudara/i:' });
        B.push({ t: 'kv', r: kvGuru(g, d, true) });
        B.push({ t: 'p', s: 'sebagai ' + jab + ' di ' + m + ' terhitung mulai tanggal ' + T(tmt) + '.' });
        B.push({ t: 'p', s: 'KEDUA : Yang bersangkutan bertugas melaksanakan kegiatan pembelajaran dan tugas lain yang diberikan Kepala Madrasah sesuai ketentuan yang berlaku.' });
        var masa = masaSK(d);
        if (masa) {
          B.push({ t: 'p', s: 'KETIGA : Masa berlaku keputusan ini adalah tanggal ' + fmtTgl(masa.a) + ' sampai dengan tanggal ' + fmtTgl(masa.b) + ', dan dapat diperpanjang berdasarkan hasil evaluasi kinerja serta kebutuhan madrasah.' });
          B.push({ t: 'p', s: 'KEEMPAT : Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.' });
        } else B.push({ t: 'p', s: 'KETIGA : Keputusan ini mulai berlaku pada tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.' });
        break;
      case 'ket-tmt':
        S.judul = ['SURAT KETERANGAN', 'KEASLIAN TANGGAL MULAI TUGAS (TMT)'];
        B.push({ t: 'p', s: 'Yang bertanda tangan di bawah ini:' });
        B.push({ t: 'kv', r: kvKepala() });
        B.push({ t: 'p', s: 'Menerangkan dengan sebenarnya bahwa:' });
        B.push({ t: 'kv', r: kvGuru(g, d, false) });
        B.push({ t: 'p', s: 'adalah benar telah melaksanakan tugas sebagai ' + jab + ' di ' + m + ' terhitung mulai tanggal ' + T(tmt) +
          (d.nosk ? ', berdasarkan SK Pengangkatan Nomor ' + d.nosk + (d.tglsk ? ' tanggal ' + fmtTgl(d.tglsk) : '') : '') + '.' });
        B.push({ t: 'p', s: 'Tanggal Mulai Tugas (TMT) tersebut adalah benar dan sesuai dengan dokumen yang ada di madrasah. Apabila di kemudian hari terdapat ketidakbenaran, kami bersedia bertanggung jawab sesuai ketentuan yang berlaku.' });
        B.push({ t: 'p', s: 'Surat keterangan ini diberikan untuk keperluan ' + kep + '.' });
        B.push({ t: 'p', s: 'Demikian surat keterangan ini dibuat dengan sebenarnya untuk digunakan sebagaimana mestinya.' });
        break;
      case 'sk-jadwal':
        jadwal = jadwalGuru(g);
        var jabKep = 'KEPALA ' + mU;
        S.sk = true; S.judul = ['KEPUTUSAN', jabKep]; S.tentang = ['PEMBAGIAN JADWAL MENGAJAR GURU', 'TAHUN AJARAN ' + ta.toUpperCase()];
        pembukaSK(jabKep);
        B.push({ t: 'p', s: 'Menimbang :', b: true });
        B.push({ t: 'ol', k: 'a.', s: 'bahwa untuk kelancaran kegiatan pembelajaran di ' + m + ' pada tahun ajaran ' + ta + ' perlu menetapkan pembagian jadwal mengajar guru;' });
        B.push({ t: 'ol', k: 'b.', s: 'bahwa guru yang namanya tercantum dalam keputusan ini dinilai memenuhi syarat untuk ditugaskan sesuai jadwal tersebut;' });
        pushMengingat(B, d);
        B.push({ t: 'p', s: 'MEMUTUSKAN', b: true, c: true });
        B.push({ t: 'p', s: 'Menetapkan : KEPUTUSAN ' + jabKep + ' TENTANG PEMBAGIAN JADWAL MENGAJAR GURU TAHUN AJARAN ' + ta.toUpperCase() + '.', b: true });
        B.push({ t: 'p', s: 'KESATU : Menetapkan pembagian jadwal mengajar kepada:' });
        B.push({ t: 'kv', r: kvGuru(g, d, false) });
        B.push({ t: 'p', s: 'dengan rincian jadwal mengajar sebagai berikut:' });
        B.push({ t: 'tabel', head: ['No', 'Hari', 'Jam Ke-', 'Waktu', 'Kelas', 'Mata Pelajaran'],
          rows: jadwal.length ? jadwal.map(function (j, i) { return [String(i + 1), j.hari || '-', String(j.jam || '-'), waktuJam(j.jam), j.kelas || '-', j.mapel || '-']; })
                              : [['-', 'Belum ada jadwal untuk guru ini pada menu Jadwal Pelajaran', '', '', '', '']] });
        B.push({ t: 'p', s: 'KEDUA : Total beban mengajar: ' + jadwal.length + ' jam pelajaran per minggu.' });
        B.push({ t: 'p', s: 'KETIGA : Keputusan ini mulai berlaku pada tanggal ditetapkan sampai dengan berakhirnya tahun ajaran tersebut.' });
        S.jadwalKosong = !jadwal.length;
        break;
      case 'ket-aktif':
        jadwal = jadwalGuru(g);
        S.judul = ['SURAT KETERANGAN', 'AKTIF MENGAJAR'];
        B.push({ t: 'p', s: 'Yang bertanda tangan di bawah ini:' });
        B.push({ t: 'kv', r: kvKepala() });
        B.push({ t: 'p', s: 'Menerangkan bahwa:' });
        B.push({ t: 'kv', r: kvGuru(g, d, false) });
        B.push({ t: 'p', s: 'adalah benar guru aktif di ' + m + ' pada tahun ajaran ' + ta + (kelasGuru(g, jadwal) ? ', yang mengajar di kelas ' + kelasGuru(g, jadwal) : '') +
          (tmt ? ', terhitung mulai tanggal ' + tmt : '') + '.' });
        B.push({ t: 'p', s: 'Surat keterangan ini diberikan untuk keperluan ' + kep + '.' });
        B.push({ t: 'p', s: 'Demikian surat keterangan ini dibuat dengan sebenarnya.' });
        break;
      case 'surat-tugas':
        S.judul = ['SURAT TUGAS'];
        B.push({ t: 'p', s: 'Menimbang :', b: true });
        B.push({ t: 'ol', k: 'a.', s: 'bahwa untuk pelaksanaan kegiatan ' + T(d.tugas) + ' perlu menugaskan guru yang namanya tercantum dalam surat tugas ini;' });
        B.push({ t: 'p', s: 'Dasar :', b: true });
        var dasarT = (d.rujukan || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        if (!dasarT.length) dasarT = ['Program kerja ' + m + ' tahun ajaran ' + ta + ';'];
        dasarT.forEach(function (x, i) { B.push({ t: 'ol', k: (i + 1) + '.', s: x }); });
        B.push({ t: 'p', s: 'Memberi Tugas', b: true, c: true });
        B.push({ t: 'p', s: 'Kepada :' });
        var lainT = daftarGuruLain(d);
        if (!lainT.length) B.push({ t: 'kv', r: kvTugas(g, d) });
        else {                                                // beberapa guru: daftar bernomor
          var semuaT = [{ name: g.name, nip: d.nip, jab: d.jabatan || 'Guru' }].concat(lainT);
          semuaT.forEach(function (x, i) {
            B.push({ t: 'ol', k: (i + 1) + '.', s: tanpaGelar(x.name) + (x.nip ? ', NIP/NIY ' + x.nip : '') + ', ' + (x.jab || 'Guru') + (i === semuaT.length - 1 ? '.' : ';') });
          });
        }
        B.push({ t: 'p', s: 'Untuk :' });
        var kv = [['Tugas', T(d.tugas)]];
        if (d.mulai) kv.push(['Waktu', fmtTgl(d.mulai) + (d.selesai && d.selesai !== d.mulai ? ' s.d. ' + fmtTgl(d.selesai) : '')]);
        if (d.tempat) kv.push(['Tempat', d.tempat]);
        B.push({ t: 'kv', r: kv });
        B.push({ t: 'p', s: 'Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.' });
        break;
      case 'skmt':
        S.judul = ['SURAT KETERANGAN', 'MELAKSANAKAN TUGAS'];
        B.push({ t: 'p', s: 'Yang bertanda tangan di bawah ini:' });
        B.push({ t: 'kv', r: kvKepala() });
        B.push({ t: 'p', s: 'Menerangkan bahwa:' });
        B.push({ t: 'kv', r: kvGuru(g, d, false) });
        B.push({ t: 'p', s: 'telah nyata melaksanakan tugas sebagai ' + jab + ' di ' + m + ' terhitung mulai tanggal ' + T(tmt) +
          (d.nosk ? ', berdasarkan SK Nomor ' + d.nosk + (d.tglsk ? ' tanggal ' + fmtTgl(d.tglsk) : '') : '') + '.' });
        B.push({ t: 'p', s: 'Surat keterangan ini diberikan untuk keperluan ' + kep + '.' });
        B.push({ t: 'p', s: 'Demikian surat keterangan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.' });
        break;
    }
    S.sk = S.sk || jenis === 'sk-pengangkatan';
    S.tembusan = JENIS[jenis].f.indexOf('tembusan') >= 0
      ? (d.tembusan || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean) : [];
    return S;
  }
  function htmlSurat(S) {
    var h = S.yys ? kopYayasanHTML() : kopMadrasahHTML();
    h += '<div class="judul-surat"' + (S.garis ? ' style="text-decoration:underline;"' : '') + '>' + S.judul.map(esc).join('<br>') + '</div>';
    h += '<div class="nomor-surat">NOMOR: ' + esc(S.nomor) + '</div>';
    if (S.tentang && S.tentang.length) h += '<div class="judul-surat" style="margin-top:2px;line-height:1.3;">TENTANG<br>' + S.tentang.map(esc).join('<br>') + '</div>';
    h += '<div class="body">';
    S.blok.forEach(function (b) {
      if (b.t === 'p') h += '<p style="' + (b.c ? 'text-align:center;' : 'text-align:justify;') + (b.b ? 'font-weight:700;' : '') + '">' + esc(b.s) + '</p>';
      else if (b.t === 'ol') h += '<p style="margin:0 0 4px 24px;text-indent:-20px;text-align:justify;"><span style="display:inline-block;width:20px;">' + esc(b.k) + '</span>' + esc(b.s) + '</p>';
      else if (b.t === 'kv') {
        h += '<table style="border:0;margin:4px 0 8px 16px;border-collapse:collapse;">';
        b.r.forEach(function (r) { h += '<tr><td style="padding:1px 8px 1px 0;white-space:nowrap;vertical-align:top;">' + esc(r[0]) + '</td><td style="vertical-align:top;">:</td><td style="padding-left:8px;vertical-align:top;"><strong>' + esc(r[1]) + '</strong></td></tr>'; });
        h += '</table>';
      } else if (b.t === 'tabel') {
        h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 10px;"><tr>' +
          b.head.map(function (x) { return '<th style="border:1px solid #000;padding:4px;background:#eee;">' + esc(x) + '</th>'; }).join('') + '</tr>' +
          b.rows.map(function (r) { return '<tr>' + r.map(function (x) { return '<td style="border:1px solid #000;padding:4px;">' + esc(x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
      }
    });
    var tb = tembusanBlok(S.tembusan);
    h += '</div><div class="footer"><div style="width:100%;display:flex;justify-content:flex-end;margin-top:30px;padding-right:8%;">' +
      '<div style="text-align:center;min-width:45%;max-width:60%;">' +
      (S.sk ? '<p style="text-align:left;margin:0;">Ditetapkan di : ' + esc(S.tempat) + '</p><p style="text-align:left;margin:0 0 8px;">pada tanggal : ' + esc(S.tanggal) + '</p>'
            : '<p style="margin:0 0 8px;">' + esc(S.tempat) + ', ' + esc(S.tanggal) + '</p>') +
      '<p style="margin:0;">' + esc(S.ttd) + ',</p>' +
      '<br><br><br><br>' +
      '<p style="margin:0;"><strong>' + esc(S.penanda) + '</strong></p></div></div>';
    if (tb) {
      h += '<div style="margin-top:18px;font-size:12px;"><p style="margin:0 0 2px;">' + esc(tb.judul) + '</p>' +
        tb.baris.map(function (x, i) { return tb.nomor ? '<p style="margin:0 0 1px 18px;text-indent:-18px;"><span style="display:inline-block;width:18px;">' + (i + 1) + '.</span>' + esc(x) + '</p>'
                                                         : '<p style="margin:0;">' + esc(x) + '</p>'; }).join('') + '</div>';
    }
    h += '</div>';
    return h;
  }

  // ---------- Aksi ----------
  function cekWajib(jenis, d, g) {
    if (!g) return 'Pilih guru terlebih dahulu!';
    var j = JENIS[jenis], salah = (j.wajib || []).filter(function (k) { return !d[k]; });
    if (jenis === 'sk-pengangkatan' && d.masa === 'kustom') { if (!d.mulai || !d.selesai) return 'Masa berlaku "Atur tanggal sendiri": isi Tanggal Mulai dan Tanggal Selesai.'; if (d.selesai < d.mulai) return 'Tanggal Selesai tidak boleh sebelum Tanggal Mulai.'; }
    if (salah.length) return 'Lengkapi dulu: ' + salah.map(function (k) { return FIELD[k].l; }).join(', ') + '.';
    return '';
  }
  function preview(otomatis) {
    if (mode !== 'guru') return;
    var g = guruTerpilih(), jenis = $('sg_jenis').value;
    if (!g) { if (!otomatis) toast('Pilih guru terlebih dahulu!', true); else placeholder('Pilih guru dan jenis surat untuk melihat preview.'); return; }
    var d, S;
    try { d = ambil(); S = susun(jenis, d, g); kertasTerakhir = 'A4'; $('suratPreview').innerHTML = htmlSurat(S); }
    catch (e) { console.error('[SI MAMBA] Preview surat gagal:', e); if (!otomatis) toast('❌ Preview gagal: ' + (e && e.message ? e.message : e), true); return; }
    if (!otomatis) {
      var w = cekWajib(jenis, d, g);
      var pc = $('suratPreviewContainer');
      if (pc && pc.scrollIntoView) { try { pc.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e2) { pc.scrollIntoView(); } }
      var pv = $('suratPreview'); if (pv) { pv.style.transition = 'opacity .15s'; pv.style.opacity = '.35'; setTimeout(function () { pv.style.opacity = '1'; }, 160); }
      if (w) toast(w, true); else toast('👁️ Preview diperbarui', false, 1200);
    }
    if (S.jadwalKosong && !otomatis) toast('Guru ini belum punya jadwal di menu Jadwal Pelajaran.', true);
    return true;
  }
  function simpan() {
    if (!bolehGuru()) return toast('Hanya Admin & Kepala Madrasah!', true);
    var g = guruTerpilih(), jenis = $('sg_jenis').value, d = ambil(), w = cekWajib(jenis, d, g);
    if (w) return toast(w, true);
    if (isBusy('simpanSuratGuru')) return toast('Sedang menyimpan...', false, 1500);
    var btn = $('btnSimpanSuratGuru'), label = JENIS[jenis].label;
    setBusy('simpanSuratGuru', btn);
    siapkanGuruLain(d).then(function () { return pastikanNomor(jenis, d); }).then(function () {
      d = ambil(); var S = susun(jenis, d, g);
      $('suratPreview').innerHTML = htmlSurat(S);
      db.ref('surat').push().set({
      siswaKey: 'guru:' + (g.key || g.name), siswaName: g.name + (daftarGuruLain(d).length ? ' +' + daftarGuruLain(d).length + ' guru' : ''), kelas: 'GURU', jenis: 'guru-' + jenis, jenisLabel: label,
      tanggal: new Date().toISOString(), tahunAjaran: currentTahunAjaran, dibuatOleh: currentUser.name, guruKey: currentUser.key || null,
      htmlContent: $('suratPreview').innerHTML, createdAt: new Date().toISOString()
    }, function (err) {
      clearBusy('simpanSuratGuru', btn);
      if (err) toast('Gagal simpan: ' + err.message, true);
      else { toast('✅ Surat berhasil disimpan!'); addLog('simpan_surat_guru', label + ' - ' + g.name); if (typeof loadSuratRiwayat === 'function') loadSuratRiwayat(); }
    });
    }).catch(function (err) {
      clearBusy('simpanSuratGuru', btn);
      toast('❌ Nomor otomatis gagal: ' + (err && err.message ? err.message : err) + '. Isi nomor manual atau cek Firebase Rules node nomor_surat.', true);
    });
  }
  async function unduhPDF() {
    if (!bolehGuru()) return toast('Hanya Admin & Kepala Madrasah!', true);
    var g = guruTerpilih(), jenis = $('sg_jenis').value, d = ambil(), w = cekWajib(jenis, d, g);
    if (w) return toast(w, true);
    try { toast('⏳ Menyiapkan PDF...', false, 2000); await ensureLib('pdf'); }
    catch (e) { return toast('❌ Modul PDF belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
    await siapkanGuruLain(d);
    try { await pastikanNomor(jenis, d); }
    catch (e) { return toast('❌ Nomor otomatis gagal: ' + (e && e.message ? e.message : e) + '. Isi nomor manual atau cek Firebase Rules node nomor_surat.', true); }
    d = ambil();
    var S = susun(jenis, d, g), jsPDF = window.jspdf.jsPDF, doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });   // semua surat: A4; compress = ukuran berkas kecil
    var pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    var mk = 30, mr = 20, lebar = pw - mk - mr, LH = S.yys ? 6 : 6.3, y = 0;                                                    // margin PMA 12/2026 (Lampiran, Tata Letak No. 12): kiri 3 cm, kanan 2 cm, bawah 2,5 cm, atas 2 cm
    var data = await Promise.all([S.yys ? null : Promise.resolve().then(function () { return v4LoadLogoForPdf(); }).then(muatLogoMadrasah, function () { return muatLogoMadrasah(null); }), null, S.yys ? muatLogoYayasan() : null]), logo = data[0], logoYys = data[2];

    // Kop
    var off = S.yys ? 0 : (MADRASAH.nsm ? 5 : 0);
    if (S.yys) off = Math.max(0, kopYayasanPdf(doc, pw, logoYys) - 41);
    else off = Math.max(0, kopMadrasahPdf(doc, pw, logo) - 40);

    y = 50 + off;
    var perlu = function (h) { if (y + h > ph - 25) { doc.addPage(); y = 20; } };
    var tinggiHal = ph - 25 - 20;
    var jaga = function (h) { if (h <= tinggiHal) perlu(h); };                       // blok utuh: pindah ke halaman berikutnya bila tidak muat, agar kalimat/paragraf tidak terpotong di akhir halaman
    function tahanYatim(n, i) { if (n > 2 && (i === 0 || i === n - 2)) perlu(2 * LH); }  // paragraf panjang: minimal 2 baris di tiap halaman
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    S.judul.forEach(function (j) {
      if (S.garis) {                                                  // judul satu baris, bergaris bawah (gaya surat yayasan)
        var fs = 13; doc.setFontSize(fs);
        while (doc.getTextWidth(j) > lebar && fs > 8) { fs -= 0.25; doc.setFontSize(fs); }
        var tw = doc.getTextWidth(j); doc.text(j, pw / 2, y, { align: 'center' });
        doc.setLineWidth(0.3); doc.line(pw / 2 - tw / 2, y + 1, pw / 2 + tw / 2, y + 1); doc.setFontSize(13);
      } else doc.text(j, pw / 2, y, { align: 'center' });
      y += 5.5;
    });
    doc.setFont(undefined, 'normal'); doc.setFontSize(12);
    doc.text('NOMOR: ' + S.nomor, pw / 2, y, { align: 'center' }); y += 6;
    if (S.tentang && S.tentang.length) {
      doc.setFont(undefined, 'bold'); doc.setFontSize(13);
      doc.text('TENTANG', pw / 2, y, { align: 'center' }); y += 5.5;
      S.tentang.forEach(function (j) { doc.splitTextToSize(j, lebar).forEach(function (r) { doc.text(r, pw / 2, y, { align: 'center' }); y += 5.5; }); });
      doc.setFont(undefined, 'normal'); y += 1;
    }
    y += 1; doc.setFontSize(12);

    S.blok.forEach(function (b, bi) {
      if (b.t === 'p') {
        doc.setFont(undefined, b.b ? 'bold' : 'normal');
        var rp = doc.splitTextToSize(b.s, lebar);
        jaga(rp.length * LH + (b.b && S.blok[bi + 1] ? 2 * LH : 0));                  // judul bagian (mis. "Mengingat :") ikut butir pertamanya
        rp.forEach(function (r, i) { tahanYatim(rp.length, i); perlu(7); if (b.c) doc.text(r, pw / 2, y, { align: 'center' }); else tulisRata(doc, r, mk, y, lebar, i < rp.length - 1); y += LH; });
        doc.setFont(undefined, 'normal'); y += 2;
      } else if (b.t === 'ol') {
        var rs = doc.splitTextToSize(b.s, lebar - 12);
        jaga(rs.length * LH);
        rs.forEach(function (r, i) { tahanYatim(rs.length, i); perlu(7); if (i === 0) doc.text(b.k, mk + 4, y); tulisRata(doc, r, mk + 12, y, lebar - 12, i < rs.length - 1); y += LH; });
        y += 1;
      } else if (b.t === 'kv') {
        b.r.forEach(function (r) {
          var rs = doc.splitTextToSize(String(r[1] == null ? '' : r[1]), lebar - 56);
          perlu(rs.length * LH);
          doc.text(r[0], mk + 6, y); doc.text(':', mk + 46, y);
          doc.setFont(undefined, 'bold'); rs.forEach(function (x) { doc.text(x, mk + 50, y); y += LH; }); doc.setFont(undefined, 'normal');
        });
        y += 3;
      } else if (b.t === 'tabel') {
        perlu(30);
        doc.autoTable({ startY: y, head: [b.head], body: b.rows, margin: { left: mk, right: mr, bottom: 25, top: 20 }, theme: 'grid',
          styles: { fontSize: 10, cellPadding: 1.8, textColor: 0, lineColor: 0, lineWidth: 0.2 },
          headStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: 'bold' } });
        y = doc.lastAutoTable.finalY + 6;
      }
    });

    // Kaki: kanan bawah (tempat/tanggal, jabatan + koma, tanda tangan, nama tanpa gelar)
    var cx = pw - 30 - 40;
    perlu(75); y += 6;
    if (S.sk) { doc.text('Ditetapkan di : ' + S.tempat, cx - 38, y); y += LH; doc.text('pada tanggal : ' + S.tanggal, cx - 38, y); }
    else doc.text(S.tempat + ', ' + S.tanggal, cx, y, { align: 'center' });
    y += LH + 2;
    var tl = doc.splitTextToSize(S.ttd + ',', 80);
    tl.forEach(function (r, i) { doc.text(r, cx, y + i * LH, { align: 'center' }); });
    y += (tl.length - 1) * LH;
    y += S.yys ? 26 : 24;                                       // ruang tanda tangan basah (tanpa QR / TTD digital)
    doc.setFont(undefined, 'bold'); doc.text(S.penanda, cx, y, { align: 'center' }); doc.setFont(undefined, 'normal');

    // Tembusan: kiri bawah
    var tb = tembusanBlok(S.tembusan);
    if (tb) {
      y += 14; perlu(10 + tb.baris.length * 5.5);
      doc.setFontSize(10); doc.text(tb.judul, mk, y); y += 5;
      tb.baris.forEach(function (x, i) {
        doc.splitTextToSize(x, lebar - 10).forEach(function (r, k) { perlu(6); if (tb.nomor) { if (k === 0) doc.text((i + 1) + '.', mk + 2, y); doc.text(r, mk + 9, y); } else doc.text(r, mk, y); y += 5; });
      });
    }

    // Nomor halaman: "- 2 -" di tengah atas, mulai halaman kedua
    for (var pg = 2; pg <= doc.getNumberOfPages(); pg++) { doc.setPage(pg); doc.setFontSize(10); doc.text('- ' + pg + ' -', pw / 2, 12, { align: 'center' }); }

    doc.save(JENIS[jenis].file + '_' + String(g.name).replace(/[^\w]+/g, '_') + '_' + tglLokal() + '.pdf');
    toast('📥 Surat berhasil diunduh!'); addLog('download_surat_guru', JENIS[jenis].label + ' - ' + g.name);
  }


  // ============================================================
  // SURAT SISWA — penomoran otomatis (dipindah dari app.js; app.js TIDAK diubah)
  // ------------------------------------------------------------
  // Dulu nomor surat siswa = Math.random() (beda antara preview, PDF, dan yang tersimpan).
  // Sekarang memakai counter Firebase yang SAMA dengan surat guru (nomor_surat/<tahun>/MI-MU_SKET),
  // jadi Surat Keterangan guru & siswa satu urutan: 001/MI-MU/<klas>/SKet/<bulan>/<tahun>.
  // - Preview menampilkan nomor BERIKUTNYA (belum mengunci / menaikkan counter).
  // - Counter baru naik (transaction) saat Simpan atau Download PDF; nomor yang sudah terkunci
  //   dipakai ulang untuk surat yang sama (siswa + jenis + tanggal) selama halaman belum dimuat ulang.
  // - Tiga fungsi di bawah (previewSurat/downloadSuratPDF/simpanSurat) kini satu-satunya versi; di app.js sudah dihapus
  //   (isinya disalin apa adanya; hanya bagian nomor yang berubah). app.js memanggilnya lewat window.
  // ============================================================
  var sKunci = {};                                           // kunci surat -> nomor yang sudah terkunci
  var sPrev = { key: '', nomor: '' }, sNoToken = 0;          // nomor berikutnya untuk preview
  function tglSuratSiswa(jenis) {                            // tanggal yang tercetak di surat (sama dengan app.js)
    var raw = $('suratTanggalIjin') ? $('suratTanggalIjin').value : '';
    return (jenis === 'ijin' || jenis === 'sakit') && raw ? raw : tglLokal();
  }
  function klasSiswa(jenis) { var e = $('suratKlasSiswa'); return (e && e.value) || KLAS_BAWAAN_SISWA[jenis] || KLAS_PILIHAN_SISWA[0].kode; }
  function kunciSiswa(siswa, jenis, iso) { return [siswa.key, jenis, iso, klasSiswa(jenis)].join('|'); }
  function pasangKlasSiswa(baris) {                          // dropdown kode klasifikasi di baris kontrol surat siswa
    if ($('suratKlasSiswa')) return;
    var w = el('div', null, 'flex:1;min-width:150px;'), l = el('label', 'label'), s = el('select', 'field');
    l.textContent = 'Kode Klasifikasi Arsip'; l.htmlFor = 'suratKlasSiswa'; s.id = 'suratKlasSiswa';
    var o0 = el('option'); o0.value = ''; o0.textContent = 'Otomatis (sesuai jenis surat)'; s.appendChild(o0);
    KLAS_PILIHAN_SISWA.forEach(function (x) { var o = el('option'); o.value = x.kode; o.textContent = x.kode + ' — ' + x.label; s.appendChild(o); });
    s.addEventListener('change', function () { try { if (typeof selectedSiswaSurat !== 'undefined' && selectedSiswaSurat) window.previewSurat(); } catch (e) {} });
    w.appendChild(l); w.appendChild(s);
    baris.insertBefore(w, baris.lastElementChild);           // sebelum tombol Preview/Download/Simpan
  }
  function nomorSiswaTampil(k) { return sKunci[k] || (sPrev.key === k ? sPrev.nomor : '') || TITIK; }
  function setNomorPreview(nomor, k) {
    var p = $('suratPreview'); if (!p || p.dataset.noKey !== k) return;
    var e = p.querySelector('.nomor-surat'); if (e) e.textContent = 'Nomor: ' + nomor;
  }
  function segarkanNomorSiswa(jenis, iso, k) {               // baca counter, tampilkan nomor berikutnya
    if (sKunci[k]) return;
    var tok = ++sNoToken, t = bagianTanggal({ tanggal: iso });
    db.ref(kunciCounter(jenis, t.yy)).once('value').then(function (snap) {
      if (tok !== sNoToken || sKunci[k]) return;
      sPrev = { key: k, nomor: susunNomor(jenis, (parseInt(snap.val(), 10) || 0) + 1, { tanggal: iso, klas: klasSiswa(jenis) }) };
      setNomorPreview(sPrev.nomor, k);
    }).catch(function (err) { console.error('[SI MAMBA] Gagal membaca penomoran surat siswa:', err); });
  }
  function kunciNomorSiswa(jenis, iso, k) {                  // kunci nomor (counter +1) sekali per surat
    if (sKunci[k]) return Promise.resolve(sKunci[k]);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new Error('perangkat sedang offline'));
    var t = bagianTanggal({ tanggal: iso });
    return new Promise(function (res, rej) {
      db.ref(kunciCounter(jenis, t.yy)).transaction(function (cur) { return (parseInt(cur, 10) || 0) + 1; }, function (err, committed, snap) {
        if (err || !committed) return rej(err || new Error('penomoran dibatalkan'));
        sKunci[k] = susunNomor(jenis, snap.val(), { tanggal: iso, klas: klasSiswa(jenis) });
        setNomorPreview(sKunci[k], k);
        res(sKunci[k]);
      });
    });
  }

  // ---- Disalin dari js/app.js (previewSurat / downloadSuratPDF / simpanSurat); perubahan hanya di bagian nomor ----
    function previewSurat() {
      const siswa = selectedSiswaSurat;
      if (!siswa) { toast('Pilih siswa terlebih dahulu!', true); return; }
      const jenis = document.getElementById('suratJenisSelect').value;
      const perluTanggalIjin = (jenis === 'ijin' || jenis === 'sakit');
      const tanggalIjinRaw = document.getElementById('suratTanggalIjin') ? document.getElementById('suratTanggalIjin').value : '';
      if (perluTanggalIjin && !tanggalIjinRaw) { toast('Pilih tanggal ijin/sakit terlebih dahulu!', true); return; }
      const tanggal = perluTanggalIjin
        ? new Date(tanggalIjinRaw + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
        : new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
      const isoSurat = tglSuratSiswa(jenis), kSurat = kunciSiswa(siswa, jenis, isoSurat);
      let judul = '', isi = '', penutup = '';
      const namaAman = escapeHtml(siswa.name), kelasAman = escapeHtml(siswa.kelas);
      switch(jenis) {
        case 'aktif': judul = 'SURAT KETERANGAN AKTIF';
          isi = `Yang bertanda tangan di bawah ini, Kepala ${MADRASAH.nama}, menerangkan bahwa:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Bahwa siswa tersebut adalah benar-benar siswa aktif di ${MADRASAH.nama} pada tahun ajaran ${currentTahunAjaran}.<br><br>Surat keterangan ini diberikan untuk keperluan administrasi dan digunakan sebagaimana mestinya.`;
          penutup = `Demikian surat keterangan ini dibuat dengan sebenarnya.`; break;
        case 'pindah': judul = 'SURAT KETERANGAN PINDAH';
          isi = `Yang bertanda tangan di bawah ini, Kepala ${MADRASAH.nama}, menerangkan bahwa:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Bahwa siswa tersebut adalah benar-benar siswa aktif di ${MADRASAH.nama} dan telah menyelesaikan proses administrasi kepindahan.<br><br>Surat keterangan ini diberikan sebagai bukti kepindahan siswa untuk keperluan pendaftaran di sekolah baru.`;
          penutup = `Demikian surat keterangan ini dibuat dengan sebenarnya.`; break;
        case 'ijin': judul = 'SURAT IJIN TIDAK MASUK SEKOLAH';
          isi = `Yang bertanda tangan di bawah ini, orang tua/wali dari:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Dengan ini mengijinkan anak kami untuk tidak masuk sekolah pada tanggal ${tanggal} dikarenakan keperluan keluarga / kesehatan.<br><br>Demikian surat ijin ini kami buat untuk digunakan sebagaimana mestinya.`;
          penutup = `Mengetahui,<br>Orang Tua/Wali`; break;
        case 'sakit': judul = 'SURAT KETERANGAN SAKIT';
          isi = `Yang bertanda tangan di bawah ini, orang tua/wali dari:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Menerangkan bahwa anak kami tidak dapat mengikuti kegiatan belajar mengajar pada tanggal ${tanggal} karena sedang sakit.<br><br>Demikian surat keterangan ini dibuat dengan sebenarnya.`;
          penutup = `Mengetahui,<br>Orang Tua/Wali`; break;
      }
      const html = `
        ${kopMadrasahHTML()}
        <div class="judul-surat">${judul}</div>
        <div class="nomor-surat">Nomor: ${nomorSiswaTampil(kSurat)}</div>
        <div class="body">
          <p>${isi}</p>
          <br>
          <p>${penutup}</p>
        </div>
        <div class="footer">
          <div style="width:100%;display:flex;justify-content:space-between;margin-top:30px;">
            <div>
              <p>Dikeluarkan di : Mambaul Ulum</p>
              <p>Tanggal : ${tanggal}</p>
            </div>
            <div style="text-align:center;">
              <p>Kepala ${MADRASAH.nama}</p>
              ${MADRASAH.ttdKepalaBase64
                ? `<img src="${MADRASAH.ttdKepalaBase64}" alt="Tanda tangan" style="max-height:45px;display:block;margin:6px auto;">`
                : '<br><br><br>'}
              <p><u>${MADRASAH.kepala_sekolah}</u></p>
              <p>NIP. ${MADRASAH.nip_kepala_sekolah}</p>
            </div>
          </div>
        </div>
      `;
      document.getElementById('suratPreview').innerHTML = html;
      document.getElementById('suratPreview').dataset.noKey = kSurat;
      segarkanNomorSiswa(jenis, isoSurat, kSurat);
      kertasTerakhir = 'A4';
      return true;
    }
    async function downloadSuratPDF() {
      const siswa = selectedSiswaSurat;
      if (!siswa) { toast('Pilih siswa terlebih dahulu!', true); return; }
      const jenis = document.getElementById('suratJenisSelect').value;
      const namaJenis = { 'aktif':'Keterangan_Aktif','pindah':'Keterangan_Pindah','ijin':'Surat_Ijin','sakit':'Surat_Sakit' }[jenis] || 'Surat';
      const perluTanggalIjin = (jenis === 'ijin' || jenis === 'sakit');
      const tanggalIjinRaw = document.getElementById('suratTanggalIjin') ? document.getElementById('suratTanggalIjin').value : '';
      const tanggal = perluTanggalIjin && tanggalIjinRaw
        ? new Date(tanggalIjinRaw + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
        : new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
      try { await ensureLib('pdf'); }
      catch (e) { return toast('❌ Modul PDF belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
      const isoSurat = tglSuratSiswa(jenis), kSurat = kunciSiswa(siswa, jenis, isoSurat);
      let nomorSurat;
      try { nomorSurat = await kunciNomorSiswa(jenis, isoSurat, kSurat); }
      catch (e) { return toast('❌ Nomor otomatis gagal: ' + (e && e.message ? e.message : e) + '. Cek koneksi internet atau Firebase Rules node nomor_surat.', true); }
      const { jsPDF } = window.jspdf; 
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true }); 
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginKiri = 30, marginKanan = 20, lebarIsi = pageWidth - marginKiri - marginKanan;
      const [logoRaw, ttdKepalaData] = await Promise.all([Promise.resolve().then(() => v4LoadLogoForPdf()).catch(() => null), v4LoadTtdKepalaForPdf()]);
      const logoData = await muatLogoMadrasah(logoRaw);

      // Kop surat di PDF (teks di kolom kanan logo; tidak tumpang tindih)
      const offsetY1 = Math.max(0, kopMadrasahPdf(doc, pageWidth, logoData) - 40);

      // Judul surat
      const judulMap = {
        'aktif': 'SURAT KETERANGAN AKTIF',
        'pindah': 'SURAT KETERANGAN PINDAH',
        'ijin': 'SURAT IJIN TIDAK MASUK SEKOLAH',
        'sakit': 'SURAT KETERANGAN SAKIT'
      };
      doc.setFontSize(14);
      doc.text(judulMap[jenis] || 'SURAT KETERANGAN', pageWidth/2, 52 + offsetY1, { align: 'center', underline: true });
      doc.setFontSize(10);
      doc.text('Nomor: ' + nomorSurat, pageWidth/2, 60 + offsetY1, { align: 'center' });
      
      // Isi surat -- dibangun dari teks terstruktur (buatIsiSuratPlain), bukan dibaca ulang
      // dari innerHTML preview, dan setiap paragraf di-word-wrap pakai splitTextToSize supaya
      // tidak ada baris yang keluar dari tepi halaman.
      doc.setFontSize(12);
      let y = 72 + offsetY1;
      const cetakParagraf = (teks, opts) => {
        opts = opts || {};
        const paragraf = teks.split('\n\n');
        paragraf.forEach((p, idx) => {
          if (!p.trim()) return;
          const wrapped = doc.splitTextToSize(p.trim(), lebarIsi);
          if ((wrapped.length - 1) * 6.5 <= 255 && y + (wrapped.length - 1) * 6.5 > 272) { doc.addPage(); y = 20; }   // paragraf tidak terpotong di akhir halaman
          wrapped.forEach((baris, bi) => {
            if (y > 272) { doc.addPage(); y = 20; }
            if (opts.tengah) doc.text(baris, pageWidth/2, y, { align: 'center' });
            else tulisRata(doc, baris, marginKiri, y, lebarIsi, bi < wrapped.length - 1);
            y += 6.5;
          });
          if (idx < paragraf.length - 1) y += 3; // jarak antar paragraf
        });
      };
      const konten = buatIsiSuratPlain(jenis, siswa, tanggal);
      cetakParagraf(konten.pembuka);
      y += 3;
      konten.identitas.forEach(baris => { if (y > 272) { doc.addPage(); y = 20; } doc.text(baris, marginKiri + 4, y); y += 6.5; });
      y += 3;
      cetakParagraf(konten.isi);
      y += 6;
      cetakParagraf(konten.penutup);
      
      // Dikeluarkan di & tanggal
      if (y > 208) { doc.addPage(); y = 20; }   // 'Dikeluarkan di' + tanda tangan selalu satu halaman
      y += 6;
      doc.text('Dikeluarkan di : Mambaul Ulum', marginKiri, y);
      y += 6.5;
      doc.text('Tanggal : ' + tanggal, marginKiri, y);
      
      // Tanda tangan (satu-satunya blok tanda tangan, tidak ada duplikasi)
      if (y > 244) { doc.addPage(); y = 20; }
      y += 14;
      doc.text('Kepala ' + MADRASAH.nama, pageWidth/2, y, { align: 'center' });
      // Surat boleh dicetak Admin & Wali Kelas, jadi TANPA hanyaPimpinan; pencetak tercatat di halaman verifikasi QR.
      const ttdSurat = await ttdKepalaPdf(doc, pageWidth/2, y + 3, { lebar: 35, tinggiMaks: 20, meta: { jenis: 'Surat ' + String(namaJenis).replace(/_/g, ' '), ket: [siswa.name, siswa.kelas, tanggal].filter(Boolean).join(' | ') } });
      if (ttdSurat.dipakai) {
        y += Math.max(22, ttdSurat.tinggi + 5);
      } else if (ttdKepalaData) {
        // Tanda tangan digital ditempel di ruang antara jabatan & nama. Rasio lebar:tinggi
        // gambar asli dijaga (bukan dipaksa kotak) supaya tidak gepeng/melar.
        try {
          const ttdW = 35;
          const propsTtd = doc.getImageProperties(ttdKepalaData);
          const ttdH = Math.min(18, ttdW * (propsTtd.height / propsTtd.width));
          doc.addImage(ttdKepalaData, 'PNG', pageWidth/2 - ttdW/2, y + 3, ttdW, ttdH);
        } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF:', e); }
        y += 22;
      } else {
        y += 20;
      }
      doc.text(MADRASAH.kepala_sekolah, pageWidth/2, y, { align: 'center' });
      y += 6;
      doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, pageWidth/2, y, { align: 'center' });
      
      doc.save(`Surat_${namaJenis}_${siswa.name}_${tglLokal()}.pdf`);
      toast('📥 Surat berhasil diunduh!'); 
      addLog('download_surat', `${jenis} - ${siswa.name}`);
    }
    function simpanSurat() {
      if (!isAdmin() && !isWaliKelas()) return toast('Hanya Admin & Wali Kelas!', true);
      const siswa = selectedSiswaSurat;
      if (!siswa) { toast('Pilih siswa terlebih dahulu!', true); return; }
      const jenis = document.getElementById('suratJenisSelect').value;
      const namaJenis = { 'aktif':'Keterangan Aktif','pindah':'Keterangan Pindah','ijin':'Surat Ijin','sakit':'Surat Sakit' }[jenis] || 'Surat';
      if (isBusy('simpanSurat')) return toast('Sedang menyimpan...', false, 1500);
      const btnSimpanSurat = document.getElementById('btnSimpanSurat');
      setBusy('simpanSurat', btnSimpanSurat);
      const isoSurat = tglSuratSiswa(jenis), kSurat = kunciSiswa(siswa, jenis, isoSurat);
      kunciNomorSiswa(jenis, isoSurat, kSurat).then(() => {
      const html = document.getElementById('suratPreview').innerHTML;      // dibaca SESUDAH nomor terkunci
      const ref = db.ref('surat').push();
      ref.set({ siswaKey: siswa.key, siswaName: siswa.name, kelas: siswa.kelas, jenis, jenisLabel: namaJenis, tanggal: new Date().toISOString(), tahunAjaran: currentTahunAjaran, dibuatOleh: currentUser.name, guruKey: currentUser.key || null, htmlContent: html, createdAt: new Date().toISOString() }, err => {
        clearBusy('simpanSurat', btnSimpanSurat);
        if (err) toast('Gagal simpan: '+err.message, true);
        else { toast('✅ Surat berhasil disimpan!'); addLog('simpan_surat', `${namaJenis} - ${siswa.name}`); loadSuratRiwayat(); }
      });
      }).catch(e => {
        clearBusy('simpanSurat', btnSimpanSurat);
        toast('❌ Nomor otomatis gagal: ' + (e && e.message ? e.message : e) + '. Cek koneksi internet atau Firebase Rules node nomor_surat.', true);
      });
    }
  window.previewSurat = previewSurat;
  window.previewSuratCetak = function () { if (previewSurat()) bukaPratinjau('A4'); };   // tombol Preview surat siswa
  window.downloadSuratPDF = downloadSuratPDF;
  window.simpanSurat = simpanSurat;

  // ---------- API penomoran untuk modul lain (dipakai js/agenda-surat.js) ----------
  // intip(jenis, iso, klas) -> Promise<nomor berikutnya> (TIDAK menaikkan counter)
  // kunci(jenis, iso, klas) -> Promise<nomor>           (counter +1, atomik)
  window.SIMambaNomor = {
    klasPilihan: function () { return KLAS_UMUM.slice(); },
    // opsi.internal = true: korespondensi INTERNAL (mis. undangan ke guru) -> tanpa awalan kategori keamanan "B/" (PMA 12/2026, Lampiran Tata Penomoran huruf d)
    intip: function (jenis, iso, klas, opsi) {
      var t = bagianTanggal({ tanggal: iso });
      return db.ref(kunciCounter(jenis, t.yy)).once('value').then(function (snap) {
        return susunNomor(jenis, (parseInt(snap.val(), 10) || 0) + 1, { tanggal: iso, klas: klas, internal: !!(opsi && opsi.internal) });
      });
    },
    kunci: function (jenis, iso, klas, opsi) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new Error('perangkat sedang offline'));
      var t = bagianTanggal({ tanggal: iso });
      return new Promise(function (res, rej) {
        db.ref(kunciCounter(jenis, t.yy)).transaction(function (cur) { return (parseInt(cur, 10) || 0) + 1; }, function (err, committed, snap) {
          if (err || !committed) return rej(err || new Error('penomoran dibatalkan'));
          res(susunNomor(jenis, snap.val(), { tanggal: iso, klas: klas, internal: !!(opsi && opsi.internal) }));
        });
      });
    }
  };

  // ---------- Pasang ke halaman Surat & Ijin ----------
  function pasang() {
    var page = $('page-surat'); if (!page) return;
    var tampil = !page.classList.contains('hidden');
    if (tampil) saatHalamanDibuka();
    new MutationObserver(function () {
      var sekarang = !page.classList.contains('hidden');
      if (sekarang && !tampil) saatHalamanDibuka();
      tampil = sekarang;
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
