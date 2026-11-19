// ============================================================
// DATA DOKUMEN KEPALA MADRASAH -- js/dokumen-kepala-data.js  (dimuat SEBELUM js/dokumen-kepala.js)
// Isi: daftar dokumen wajib kepala madrasah, daftar bidang RKT, indikator KPI yang bisa dihubungkan,
// dan kerangka dokumen (RKJM, RKT, Laporan RKT) yang dirakit menjadi blok untuk js/docx-mini.js.
// Daftar dokumen & kerangka adalah USULAN UMUM; sesuaikan dengan juknis Kemenag setempat. Admin bisa menambah dokumen sendiri di halaman.
// ============================================================
(function () {
  'use strict';

  var KELOMPOK = ['Perencanaan', 'Kurikulum & Pembelajaran', 'Organisasi & Ketenagaan', 'Kesiswaan, Sarana & Kemitraan', 'Pelaporan & Evaluasi'];

  // siklus = jarak revisi dalam bulan (12 = tiap tahun, 24 = 2 tahun, 48 = 4 tahun, 0 = sesuai kebutuhan, tanpa pengingat tanggal)
  var DOKUMEN = [
    { id: 'visi_misi', kel: 0, nama: 'Visi, misi, dan tujuan madrasah', siklus: 48, ket: 'Isi di kartu Visi, Misi, dan Tujuan (tab Kerangka Dokumen); ikut terisi di RKJM, RKT, dan EDM.' },
    { id: 'edm', kel: 0, nama: 'Laporan Evaluasi Diri Madrasah (EDM)', siklus: 12, ket: 'Data pendukung terisi otomatis di tab Kerangka Dokumen.' },
    { id: 'rkjm', kel: 0, nama: 'Rencana Kerja Jangka Menengah (RKJM)', siklus: 48, ket: 'Rencana 4 tahun.' },
    { id: 'rkt', kel: 0, nama: 'Rencana Kerja Tahunan (RKT)', siklus: 12, ket: 'Dijabarkan dari RKJM; dipantau di tab Pemantau RKT.' },
    { id: 'rkam', kel: 0, nama: 'Rencana Kegiatan dan Anggaran Madrasah (RKAM)', siklus: 12, ket: 'Anggaran tahunan yang selaras dengan RKT.' },
    { id: 'kalender', kel: 0, nama: 'Kalender pendidikan', siklus: 12, ket: 'Kerangka terisi dari Kalender Akademik (tab Kerangka Dokumen).' },
    { id: 'kom', kel: 1, nama: 'Dokumen kurikulum madrasah', siklus: 12, ket: 'Struktur kurikulum, muatan lokal, pengembangan diri.' },
    { id: 'prog_supervisi', kel: 1, nama: 'Program supervisi akademik', siklus: 12, ket: 'Kerangka terisi dari menu PKG Guru (tab Kerangka Dokumen).' },
    { id: 'jadwal', kel: 1, nama: 'Pembagian tugas mengajar dan jadwal pelajaran', siklus: 12, ket: 'Kerangka terisi dari menu Jadwal (tab Kerangka Dokumen).' },
    { id: 'struktur', kel: 2, nama: 'Struktur organisasi madrasah', siklus: 12, ket: 'Kerangka terisi dari Data Guru (tab Kerangka Dokumen).' },
    { id: 'sk_tugas', kel: 2, nama: 'SK pembagian tugas guru dan tenaga kependidikan', siklus: 12, ket: 'Kerangka terisi dari Data Guru dan Jadwal (tab Kerangka Dokumen). Termasuk wali kelas dan pembina.' },
    { id: 'tatib', kel: 2, nama: 'Pedoman tata tertib guru, siswa, dan pegawai', siklus: 48, ket: '' },
    { id: 'sop', kel: 2, nama: 'SOP layanan madrasah', siklus: 24, ket: 'Pendaftaran, layanan administrasi, pengaduan, dll.' },
    { id: 'prog_kesiswaan', kel: 3, nama: 'Program kesiswaan dan ekstrakurikuler', siklus: 12, ket: '' },
    { id: 'prog_sarpras', kel: 3, nama: 'Program sarana dan prasarana', siklus: 12, ket: 'Pemeliharaan, pengadaan, inventaris.' },
    { id: 'prog_humas', kel: 3, nama: 'Program kemitraan dan hubungan masyarakat (komite)', siklus: 12, ket: '' },
    { id: 'lap_rkt', kel: 4, nama: 'Laporan pelaksanaan RKT', siklus: 12, ket: 'Kerangka tersedia di tab Kerangka Dokumen.' },
    { id: 'lap_keu', kel: 4, nama: 'Laporan realisasi anggaran (RKAM/BOS)', siklus: 12, ket: '' },
    { id: 'lap_supervisi', kel: 4, nama: 'Laporan hasil supervisi dan tindak lanjut', siklus: 12, ket: 'Kerangka terisi dari menu PKG Guru (tab Kerangka Dokumen).' },
    { id: 'pkkm', kel: 4, nama: 'Penilaian kinerja kepala madrasah (PKKM)', siklus: 12, ket: '' }
  ];

  var STATUS_DOK = [['belum', 'Belum'], ['draf', 'Draf'], ['final', 'Final'], ['disahkan', 'Disahkan']];
  var SIKLUS_LABEL = { 12: 'Tiap tahun', 24: 'Tiap 2 tahun', 48: 'Tiap 4 tahun', 0: 'Sesuai kebutuhan' };

  var BIDANG = ['Kurikulum & Pembelajaran', 'Kesiswaan', 'Ketenagaan (guru & tendik)', 'Sarana & Prasarana', 'Keuangan & Pembiayaan', 'Humas & Kemitraan', 'Keagamaan & Budaya Madrasah', 'Tata Usaha & Administrasi'];
  var STATUS_RKT = [['belum', 'Belum mulai'], ['berjalan', 'Berjalan'], ['tercapai', 'Tercapai'], ['tidak', 'Tidak tercapai / ditunda']];

  // Indikator KPI (kunci sama dengan js/kpi.js: barisIndikator). mode 'min' = makin tinggi makin baik; 'max' = makin rendah makin baik.
  var KPI_LINK = [
    ['pSiswa', 'Kehadiran siswa'], ['pInfaq', 'Infaq lunas'], ['pJur', 'Jurnal terisi'], ['pJurHari', 'Jurnal di hari yang sama'],
    ['pHadirGuru', 'Kehadiran guru'], ['pTelat', 'Guru datang terlambat'], ['pTanpaPulang', 'Guru tidak absen pulang'], ['pSikap', 'Siswa melanggar per bulan'], ['ortu', 'Orang tua aktif']
  ];

  // ---------- kerangka dokumen ----------
  function tglId(iso) {
    var N = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'], p = String(iso || '').split('-');
    return p.length === 3 ? (+p[2]) + ' ' + N[+p[1] - 1] + ' ' + p[0] : '';
  }
  function dot(s, d) { return s || d || '............................'; }
  function fpct(v) { return v == null ? '-' : v.toFixed(1).replace('.', ',') + '%'; }
  function nomor(arr) { return arr.map(function (r, i) { return [String(i + 1)].concat(r); }); }

  function sampul(c, judul, sub) {
    return [{ t: 'spasi', n: 4 }, { t: 'judul', x: judul }, { t: 'sub', x: sub, b: true }, { t: 'spasi', n: 6 },
      { t: 'sub', x: dot(c.nama, 'NAMA MADRASAH').toUpperCase(), b: true, sz: 28 }, { t: 'sub', x: dot(c.alamat, 'Alamat madrasah') },
      { t: 'sub', x: 'NSM ' + dot(c.nsm, '...............') + '  |  NPSN ' + dot(c.npsn, '...............') }, { t: 'spasi', n: 8 },
      { t: 'sub', x: 'Tahun ' + c.tahun }, { t: 'br' }];
  }
  function pengesahan(c, atas) {
    return [{ t: 'h1', x: 'LEMBAR PENGESAHAN' },
      { t: 'p', x: 'Dokumen ini telah ditelaah dan disahkan untuk dilaksanakan oleh seluruh warga ' + dot(c.nama, 'madrasah') + '.' },
      { t: 'spasi', n: 1 }, { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
      { t: 'ttd', kolom: [{ atas: 'Mengetahui,', jabatan: 'Ketua Komite Madrasah', nama: '' }, { atas: 'Disusun oleh,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] },
      { t: 'ttd', kolom: [{ atas: 'Menyetujui,', jabatan: 'Pengawas Madrasah', nama: '', nip: '' }] }, { t: 'br' }];
  }


  // ---------- dasar hukum (hasil penelusuran 19 Nov 2026; periksa kembali sebelum disahkan) ----------
  var HUKUM = {
    uu: 'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.',
    pp57: 'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 4 Tahun 2022.',
    pdm26: 'Peraturan Menteri Pendidikan Dasar dan Menengah Nomor 26 Tahun 2025 tentang Standar Pengelolaan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.',
    pma90: 'Peraturan Menteri Agama Nomor 90 Tahun 2013 tentang Penyelenggaraan Pendidikan Madrasah sebagaimana telah diubah dengan Peraturan Menteri Agama Nomor 60 Tahun 2015 dan Peraturan Menteri Agama Nomor 66 Tahun 2016.',
    pma58: 'Peraturan Menteri Agama Nomor 58 Tahun 2017 tentang Kepala Madrasah sebagaimana telah diubah dengan Peraturan Menteri Agama Nomor 24 Tahun 2018.',
    pma16: 'Peraturan Menteri Agama Nomor 16 Tahun 2020 tentang Komite Madrasah.',
    pma17: 'Peraturan Menteri Agama Nomor 17 Tahun 2025 tentang Rencana Strategis Kementerian Agama Tahun 2025–2029.',
    kma1503: 'Keputusan Menteri Agama Nomor 1503 Tahun 2025 tentang Perubahan atas Keputusan Menteri Agama Nomor 450 Tahun 2024 tentang Pedoman Implementasi Kurikulum pada RA, MI, MTs, MA, dan MAK.',
    pkg1843: 'Keputusan Direktur Jenderal Pendidikan Islam Nomor 1843 Tahun 2021 tentang Petunjuk Teknis Penilaian Kinerja Guru Madrasah.'
  };
  var KALDIK = { '2025/2026': 'Keputusan Direktur Jenderal Pendidikan Islam Nomor 4261 Tahun 2025 tentang Pedoman Kalender Pendidikan Madrasah Tahun Ajaran 2025/2026.', '2026/2027': 'Keputusan Direktur Jenderal Pendidikan Islam Nomor 4860 Tahun 2026 tentang Pedoman Kalender Pendidikan Madrasah Tahun Ajaran 2026/2027.' };
  var HUKUM_DOK = {
    visi_misi: ['uu', 'pp57', 'pdm26', 'pma90', 'pma58'],
    rkjm: ['uu', 'pp57', 'pdm26', 'pma90', 'pma58', 'pma16', 'pma17', 'kma1503'],
    rkt: ['uu', 'pp57', 'pdm26', 'pma90', 'pma58', 'pma16', 'pma17', 'kma1503'],
    laporan_rkt: ['uu', 'pp57', 'pdm26', 'pma90', 'pma58', 'pma16', 'kma1503'],
    sk_tugas: ['uu', 'pp57', 'pdm26', 'pma90', 'pma58'],
    jadwal: ['uu', 'pp57', 'pdm26', 'kma1503', 'kaldik'],
    struktur: ['uu', 'pp57', 'pma90', 'pma58', 'pma16'],
    kalender: ['uu', 'pp57', 'kma1503', 'kaldik'],
    edm: ['uu', 'pp57', 'pdm26', 'pma90'],
    prog_supervisi: ['uu', 'pp57', 'pdm26', 'pma58', 'pkg1843'],
    lap_supervisi: ['uu', 'pp57', 'pdm26', 'pma58', 'pkg1843']
  };
  // Blok dasar hukum: daftar bernomor + catatan pemeriksaan. Dipakai di semua kerangka.
  function hukumItems(c, kode) {
    var ids = HUKUM_DOK[kode] || [], items = [], catatan = [];
    ids.forEach(function (id) {
      if (id === 'kaldik') { if (KALDIK[c.ta]) items.push(KALDIK[c.ta]); else catatan.push('Pedoman kalender pendidikan madrasah tahun ajaran ' + c.ta + ' belum ada dalam daftar; tambahkan Keputusan Dirjen Pendis yang berlaku.'); return; }
      if (HUKUM[id]) items.push(HUKUM[id]);
    });
    var cat = '[Daftar dasar hukum disusun dari penelusuran regulasi pada ' + (c.tglCetak || 'hari pengunduhan') + '. Periksa kembali nomor, tahun, dan perubahan terbaru sebelum disahkan, lalu tambahkan peraturan daerah atau SK Kanwil Kemenag yang berlaku. ' +
      'Catatan: PMA 58/2017 sedang dalam rencana revisi oleh Kemenag, dan Permendikdasmen 26/2025 adalah standar dari Kemendikdasmen yang menyebut madrasah; pastikan apakah Kemenag sudah menerbitkan pengganti atau penyesuaian.' + (catatan.length ? ' ' + catatan.join(' ') : '') + ']';
    return [{ t: 'daftar', nomor: true, items: items }, { t: 'petunjuk', x: cat }];
  }
  // Isian profil (visi, misi, tujuan) dari kartu di tab Kerangka Dokumen.
  function profilTeks(c) { var P = c.profil || {}; return { visi: P.visi || '', misi: P.misi || [], tujuan: P.tujuan || [] }; }


  // ---------- usulan analisis & rekomendasi otomatis (berbasis aturan dari data aplikasi; tanpa AI) ----------
  var CAT_USUL = '[USULAN OTOMATIS dari data aplikasi. Periksa, lengkapi dengan konteks di lapangan, dan sesuaikan sebelum disahkan.]';
  function gabung(a, maks) { a = a.slice(); var x = a.splice(0, maks || 4).join(', '); return a.length ? x + ', dan ' + a.length + ' lainnya' : x; }
  function kpiAnalisis(c) {
    var r = { ok: [], kurang: [], tanpa: [] };
    (c.kpi || []).forEach(function (k) {
      if (k.nilai == null || !(k.target > 0)) r.tanpa.push(k);
      else if (k.mode === 'max' ? k.nilai <= k.target : k.nilai >= k.target) r.ok.push(k); else r.kurang.push(k);
    });
    r.n = r.ok.length + r.kurang.length;
    r.kalimat = r.n ? ('Pada periode ' + (c.kpiPeriode || '-') + ', dari ' + r.n + ' indikator yang terukur, ' + r.ok.length + ' mencapai target' + (r.ok.length ? ' (' + gabung(r.ok.map(function (k) { return k.nama; }), 4) + ')' : '') + ' dan ' + r.kurang.length + ' belum mencapai target' +
      (r.kurang.length ? ': ' + r.kurang.map(function (k) { return k.nama + ' ' + fpct(k.nilai) + ' (target ' + k.targetTeks + ')'; }).join('; ') : '') + '.') : '';
    return r;
  }
  function progAnalisis(c) {
    var P = c.program || [], n = P.length, r = { n: n, tercapai: [], berjalan: [], belum: [], tidak: [], tertinggal: [] };
    P.forEach(function (p) {
      (r[p.status] || r.belum).push(p);
      if ((p.status === 'belum' || p.status === 'berjalan') && p.tenggat && c.hariIni && p.tenggat < c.hariIni) r.tertinggal.push(p);
    });
    var sum = 0, cnt = 0; P.forEach(function (p) { if (p.progres != null && p.progres !== '') { sum += +p.progres || 0; cnt++; } });
    r.rata = cnt ? Math.round(sum / cnt) : null;
    r.kalimat = n ? ('Dari ' + n + ' program RKT, ' + r.tercapai.length + ' (' + Math.round(r.tercapai.length / n * 100) + '%) tercapai, ' + r.berjalan.length + ' berjalan, ' + r.belum.length + ' belum dimulai, dan ' + r.tidak.length + ' tidak tercapai atau ditunda' +
      (r.rata != null ? '; rata-rata progres ' + r.rata + '%' : '') + '.' + (r.tertinggal.length ? ' ' + r.tertinggal.length + ' program melewati tenggat tetapi belum selesai (' + gabung(r.tertinggal.map(function (p) { return p.program; }), 3) + ').' : '')) : '';
    return r;
  }
  function namaProg(p) { return '“' + (p.program || '-') + '”' + (p.bidang ? ' (' + p.bidang + ')' : ''); }
  function analisisProgram(c) {
    var A = progAnalisis(c); if (!A.n) return [];
    return [{ t: 'p', x: 'Analisis capaian program: ' + A.kalimat }, { t: 'petunjuk', x: CAT_USUL }];
  }
  function analisisKpi(c) {
    var K = kpiAnalisis(c); if (!K.n) return [];
    return [{ t: 'p', x: 'Analisis capaian indikator: ' + K.kalimat }, { t: 'petunjuk', x: CAT_USUL }];
  }
  function usulanFaktor(c) {
    var A = progAnalisis(c), K = kpiAnalisis(c), duk = [], hamb = [];
    A.tercapai.slice(0, 6).forEach(function (p) { duk.push('Program ' + namaProg(p) + ' tercapai' + (p.catatan ? ': ' + p.catatan : '.')); });
    K.ok.slice(0, 3).forEach(function (k) { duk.push('Indikator ' + k.nama + ' mencapai target (' + fpct(k.nilai) + ').'); });
    A.tidak.concat(A.tertinggal).slice(0, 6).forEach(function (p) { hamb.push('Program ' + namaProg(p) + (p.status === 'tidak' ? ' tidak tercapai/ditunda' : ' melewati tenggat') + (p.catatan ? ': ' + p.catatan : '.')); });
    K.kurang.slice(0, 3).forEach(function (k) { hamb.push('Indikator ' + k.nama + ' belum mencapai target (' + fpct(k.nilai) + ' dari ' + k.targetTeks + ').'); });
    var m = Math.max(duk.length, hamb.length, 4), rows = [], i;
    for (i = 0; i < m; i++) rows.push([duk[i] || '', hamb[i] || '']);
    return { rows: rows, ada: duk.length + hamb.length > 0 };
  }
  function usulanTindak(c) {
    var A = progAnalisis(c), K = kpiAnalisis(c), rows = [];
    A.tidak.concat(A.tertinggal).forEach(function (p) { if (rows.length < 8) rows.push([namaProg(p) + (p.status === 'tidak' ? ' tidak tercapai/ditunda.' : ' melewati tenggat dan belum selesai.'), 'Menelaah penyebab, lalu menjadwalkan ulang atau memasukkannya ke RKT tahun ajaran berikutnya.', p.pj || 'Kepala madrasah', 'Awal tahun ajaran berikutnya']); });
    K.kurang.forEach(function (k) { if (rows.length < 8) rows.push(['Indikator ' + k.nama + ' belum mencapai target (' + fpct(k.nilai) + ' dari ' + k.targetTeks + ').', 'Menyusun rencana perbaikan melalui bagian Tindak Lanjut di halaman KPI, lalu memantaunya tiap bulan.', 'Kepala madrasah dan guru/wali kelas terkait', 'Semester berikutnya']); });
    return rows;
  }
  function kesimpulanRkt(c) {
    var A = progAnalisis(c), K = kpiAnalisis(c), t = [];
    if (A.n) t.push('Pelaksanaan RKT ' + c.ta + ' menunjukkan ' + A.tercapai.length + ' dari ' + A.n + ' program telah tercapai.');
    if (K.n) t.push(K.kurang.length ? 'Indikator kinerja yang masih perlu ditingkatkan adalah ' + gabung(K.kurang.map(function (k) { return k.nama; }), 4) + '.' : 'Seluruh indikator kinerja yang terukur telah mencapai target.');
    if (A.tidak.length + A.tertinggal.length + K.kurang.length) t.push('Program dan indikator yang belum tercapai menjadi bahan prioritas penyusunan RKT tahun ajaran berikutnya.');
    return t.join(' ');
  }
  function analisisSupervisi(c) {
    var G = c.pkg.guru, n = G.length, dist = {}, ada = [], rendah = [], keberatan = [], belum = [], baik = [];
    G.forEach(function (g) {
      var sb = g.hasil && g.hasil.lengkap ? String(g.hasil.sebutan || '') : '';
      if (sb) { dist[sb] = (dist[sb] || 0) + 1; ada.push(g); if (/^(cukup|kurang|sangat kurang)$/i.test(sb)) rendah.push(g); else if (/baik/i.test(sb)) baik.push(g); }
      if (g.status === 'keberatan') keberatan.push(g);
      if (!sb && g.status !== 'ditetapkan') belum.push(g);
    });
    var rata = ada.length ? ada.reduce(function (a, g) { return a + (+g.hasil.nilai100 || 0); }, 0) / ada.length : null;
    var kal = n ? ('Supervisi mencakup ' + n + ' guru; ' + ada.length + ' guru telah memiliki penilaian lengkap' + (rata != null ? ' dengan rata-rata nilai ' + fpct(rata).replace('%', '') + ' (skala 100)' : '') + '.' + (Object.keys(dist).length ? ' Sebaran sebutan: ' + Object.keys(dist).map(function (k) { return k + ' ' + dist[k] + ' guru'; }).join(', ') + '.' : '')) : '';
    var rek = [];
    if (rendah.length) rek.push('Pembinaan dan pendampingan lanjutan bagi ' + gabung(rendah.map(function (g) { return g.nama; }), 5) + ' melalui pengamatan ulang dan kesepakatan tindak lanjut.');
    if (keberatan.length) rek.push('Pertemuan penyelesaian keberatan hasil penilaian bagi ' + gabung(keberatan.map(function (g) { return g.nama; }), 5) + '.');
    if (belum.length) rek.push('Menyelesaikan penilaian ' + gabung(belum.map(function (g) { return g.nama; }), 5) + (c.pkg.periode.selesai ? ' sebelum akhir periode (' + DocTgl(c.pkg.periode.selesai) + ')' : ' sebelum periode berakhir') + '.');
    if (baik.length) rek.push('Mendorong guru dengan hasil baik (' + gabung(baik.map(function (g) { return g.nama; }), 4) + ') berbagi praktik baik dalam forum guru.');
    return { n: n, kalimat: kal, rek: rek, rata: rata };
  }
  function DocTgl(v) { return tglId(v); }
  function analisisEdm(c) {
    var K = kpiAnalisis(c), out = [], rb = c.siswaKelas || [];
    if (K.n) out.push(K.kalimat);
    var lebih = rb.filter(function (k) { return k.n > 28; });
    if (lebih.length) out.push('Jumlah siswa pada rombongan belajar ' + gabung(lebih.map(function (k) { return k.kelas + ' (' + k.n + ' siswa)'; }), 4) + ' melebihi batas 28 siswa per rombel untuk MI menurut Permendikdasmen 26/2025 Pasal 8; perlu dicermati.');
    if (rb.length > 24) out.push('Jumlah rombongan belajar (' + rb.length + ') melebihi batas maksimal 24 rombel untuk MI (Pasal 9).');
    if (c.guru.length && c.siswaTotal) out.push('Rasio guru terhadap siswa saat ini 1 : ' + Math.round(c.siswaTotal / c.guru.length) + ' (' + c.guru.length + ' guru, ' + c.siswaTotal + ' siswa).');
    var rek = [];
    K.kurang.forEach(function (k) { rek.push('Meningkatkan ' + k.nama.toLowerCase() + ' (saat ini ' + fpct(k.nilai) + ', target ' + k.targetTeks + ') dan memasukkannya sebagai program prioritas RKT.'); });
    lebih.forEach(function (k) { rek.push('Mengkaji pembagian rombongan belajar ' + k.kelas + ' atau menyiapkan penetapan pengecualian sesuai ketentuan.'); });
    return { paragraf: out, rek: rek };
  }


  // ---------- bukti capaian dari angket (Kurikulum, Profil Lulusan, Keunggulan) ----------
  var ANG_BAG_NAMA = { A: 'Visi, misi, dan arah kurikulum', B: 'Pembelajaran mendalam', C: 'Nilai-nilai cinta', D: 'Ekosistem pendukung', E: 'Asesmen' };
  function a2(n) { return n == null || isNaN(n) ? '' : n.toFixed(2).replace('.', ','); }
  function katKur(r) { return r == null ? '' : r >= 3.26 ? 'Sangat Baik' : r >= 2.51 ? 'Baik' : r >= 1.76 ? 'Cukup' : 'Kurang'; }
  function katPro(r) { return r == null ? '' : r >= 3.5 ? 'Sangat Baik' : r >= 2.75 ? 'Baik' : r >= 2 ? 'Cukup' : 'Perlu Dibimbing'; }
  function angketGalat(A) {
    var g = A && A.galat ? Object.keys(A.galat) : [];
    return g.length ? 'Sebagian angket tidak terbaca (' + g.map(function (k) { return k + ': ' + A.galat[k]; }).join('; ') + '). Periksa Firebase Rules node angket_kurikulum, angket_profil, dan angket_keunggulan.' : '';
  }
  function buktiAngket(c) {
    var A = c.angket, B = [];
    B.push({ t: 'h1', x: 'BAB V  BUKTI CAPAIAN DAN ASPIRASI DARI ANGKET' });
    if (!A) { B.push({ t: 'petunjuk', x: '[Data angket belum dimuat. Unduh dokumen ini dari tab Kerangka Dokumen agar data angket dibaca.]' }); return B; }
    var ket = angketGalat(A); if (ket) B.push({ t: 'petunjuk', x: '[' + ket + ']' });
    var K = A.kur, G = K && K.guru, O = K && K.ortu, KP = K && K.kepala;
    B.push({ t: 'h2', x: 'A. Pemahaman dan sosialisasi visi-misi (Angket Kurikulum ' + (A.periode || '') + ')' });
    var rowsA = [];
    if (G) [['A1', 'Memahami visi dan misi madrasah'], ['A2', 'Visi dan misi disosialisasikan rutin'], ['A4', 'Menjadi acuan merancang pembelajaran'], ['A5', 'Praktik di kelas sejalan dengan visi-misi'], ['A6', 'Dievaluasi berkala keterlaksanaannya']].forEach(function (x) { if (G.item[x[0]] != null) rowsA.push(['Guru (' + G.n + ')', x[1], a2(G.item[x[0]]), katKur(G.item[x[0]])]); });
    if (O) [['O1', 'Mengetahui visi dan misi madrasah'], ['O2', 'Madrasah menyampaikan program dan arah pendidikan']].forEach(function (x) { if (O.item[x[0]] != null) rowsA.push(['Orang tua (' + O.n + ')', x[1], a2(O.item[x[0]]), katKur(O.item[x[0]])]); });
    if (KP && KP.bagian.A != null) rowsA.push(['Kepala (' + KP.n + ')', 'Visi-misi dijabarkan dalam program dan dievaluasi', a2(KP.bagian.A), katKur(KP.bagian.A)]);
    B.push({ t: 'tabel', head: ['Responden', 'Pernyataan', 'Rata-rata (1–4)', 'Kategori'], lebar: [20, 46, 17, 17], rows: rowsA, kosong: rowsA.length ? 0 : 4 });
    var teksA = [], gA = G ? [G.item.A1, G.item.A2].filter(function (x) { return x != null; }) : [], rg = gA.length ? gA.reduce(function (p, q) { return p + q; }, 0) / gA.length : null;
    if (rg != null) teksA.push('Pemahaman dan sosialisasi visi-misi di kalangan guru rata-rata ' + a2(rg) + ' (' + katKur(rg) + ')' + (rg < 2.51 ? ', sehingga sosialisasi visi-misi perlu diperkuat.' : '.'));
    if (O && O.item.O1 != null) teksA.push('Orang tua yang mengetahui visi-misi madrasah rata-rata ' + a2(O.item.O1) + ' (' + katKur(O.item.O1) + ')' + (O.item.O1 < 2.51 ? '; perlu sosialisasi kepada orang tua.' : '.'));
    if (teksA.length) B.push({ t: 'p', x: teksA.join(' ') }, { t: 'petunjuk', x: CAT_USUL });
    B.push({ t: 'h2', x: 'B. Hasil Angket Kurikulum per bagian' });
    var rowsB = Object.keys(ANG_BAG_NAMA).map(function (b) { return [b + '. ' + ANG_BAG_NAMA[b]].concat(['guru', 'kepala', 'ortu', 'siswa'].map(function (j) { var v = K && K[j] && K[j].bagian[b]; return v == null ? '–' : a2(v); })); });
    B.push({ t: 'tabel', head: ['Bagian', 'Guru' + (G ? ' (' + G.n + ')' : ''), 'Kepala' + (KP ? ' (' + KP.n + ')' : ''), 'Orang tua' + (O ? ' (' + O.n + ')' : ''), 'Siswa' + (K && K.siswa ? ' (' + K.siswa.n + ')' : '')], lebar: [36, 16, 16, 16, 16], rows: rowsB },
      { t: 'petunjuk', x: '[Skala 1–4: 3,26–4,00 Sangat Baik; 2,51–3,25 Baik; 1,76–2,50 Cukup; 1,00–1,75 Kurang. Tanda – berarti belum ada responden.]' });
    B.push({ t: 'h2', x: 'C. Profil lulusan (Angket 8 Dimensi, diisi orang tua)' });
    var P = A.pro;
    if (P && P.n) {
      B.push({ t: 'tabel', head: ['Dimensi', 'Rata-rata (1–4)', 'Kategori'], lebar: [50, 25, 25], rows: P.nama.map(function (n, i) { return [n, a2(P.dim[i]), katPro(P.dim[i])]; }) });
      var ur = P.dim.map(function (v, i) { return { v: v, n: P.nama[i] }; }).filter(function (x) { return x.v != null; }).sort(function (a, b) { return a.v - b.v; });
      B.push({ t: 'p', x: 'Angket diisi ' + P.n + ' orang tua' + (P.total ? ' dari ' + P.total + ' siswa (' + Math.round(P.n / P.total * 100) + '%)' : '') + (P.sem ? ', semester ' + P.sem : '') + '. ' +
        (ur.length ? 'Dimensi dengan rata-rata tertinggi: ' + ur[ur.length - 1].n + ' (' + a2(ur[ur.length - 1].v) + '); terendah: ' + ur.slice(0, 2).map(function (x) { return x.n + ' (' + a2(x.v) + ')'; }).join(' dan ') + ', yang diusulkan menjadi fokus tujuan dan program RKT. Perlu diingat bahwa ini laporan mandiri orang tua tentang kebiasaan anak di rumah, bukan nilai.' : '') },
        { t: 'petunjuk', x: CAT_USUL });
    } else B.push({ t: 'petunjuk', x: P ? '[Belum ada orang tua yang mengisi Angket Profil Lulusan untuk tahun ajaran ' + c.ta + '.]' : '[Data Angket Profil Lulusan tidak terbaca.]' });
    B.push({ t: 'h2', x: 'D. Bidang keunggulan (Angket Keunggulan)' });
    var U = A.keu;
    if (U && U.bidang.some(function (b) { return b.skor != null; })) {
      B.push({ t: 'tabel', head: ['Peringkat', 'Bidang', 'Minat', 'SDM', 'Sarana', 'Potensi', 'Skor (maks 16)', 'Pilihan prioritas'], lebar: [10, 26, 9, 9, 9, 9, 14, 14],
        rows: U.bidang.map(function (b, i) { return [String(i + 1), b.nama, a2(b.sisi.minat), a2(b.sisi.sdm), a2(b.sisi.sarana), a2(b.sisi.potensi), a2(b.skor) + (b.lengkap ? '' : '*'), String(b.pilih)]; }) });
      var top = U.bidang.filter(function (b) { return b.skor != null; }).slice(0, 2);
      B.push({ t: 'p', x: 'Berdasarkan skor angket, bidang yang paling menonjol adalah ' + top.map(function (b) { return b.nama + ' (' + a2(b.skor) + ' dari 16)'; }).join(' dan ') + '. Bidang ini dapat dipertimbangkan sebagai keunggulan madrasah dan dirumuskan dalam misi dan tujuan.' + (U.bidang.some(function (b) { return !b.lengkap && b.skor != null; }) ? ' Tanda * berarti ada sisi yang belum terisi, sehingga skor belum lengkap.' : '') }, { t: 'petunjuk', x: CAT_USUL });
    } else B.push({ t: 'petunjuk', x: '[Belum ada data Angket Keunggulan untuk tahun ajaran ini, atau datanya tidak terbaca.]' });
    return B;
  }
  function edmKomponen(c) {
    var A = c.angket, K = A && A.kur, P = A && A.pro, r = [['Mutu lulusan', '', '', ''], ['Proses pembelajaran', '', '', ''], ['Mutu guru', '', '', ''], ['Manajemen madrasah', '', '', '']];
    if (P && P.n) {
      var ur = P.dim.map(function (v, i) { return { v: v, n: P.nama[i] }; }).filter(function (x) { return x.v != null; }).sort(function (a, b) { return a.v - b.v; });
      var rt = ur.reduce(function (p, q) { return p + q.v; }, 0) / ur.length;
      r[0] = ['Mutu lulusan', 'Angket Profil Lulusan ' + a2(rt) + ' (' + katPro(rt) + ')', ur.length ? 'Tertinggi: ' + ur[ur.length - 1].n : '', ur.length ? 'Terendah: ' + ur[0].n : ''];
    }
    var pb = K && [K.guru && K.guru.bagian.B, K.siswa && K.siswa.bagian.B].filter(function (x) { return x != null; });
    if (pb && pb.length) { var m = pb.reduce(function (p, q) { return p + q; }, 0) / pb.length; r[1] = ['Proses pembelajaran', 'Pembelajaran mendalam (guru dan siswa) ' + a2(m) + ' (' + katKur(m) + ')', '', '']; }
    return r;
  }

  var KERANGKA = {
    rkjm: {
      judul: 'Rencana Kerja Jangka Menengah (RKJM)', ringkas: 'Rencana 4 tahun: profil, hasil EDM, visi-misi, program strategis, pembiayaan, dan pemantauan.', jenisTa: 'periode',
      bangun: function (c) {
        var thn = c.periode.thn;
        var B = sampul(c, 'RENCANA KERJA JANGKA MENENGAH (RKJM)', 'Periode ' + c.periode.label).concat(pengesahan(c));
        B.push({ t: 'h1', x: 'BAB I  PENDAHULUAN' },
          { t: 'h2', x: 'A. Latar Belakang' }, { t: 'petunjuk', x: '[Uraikan kondisi madrasah, tantangan pendidikan di wilayah, dan alasan perlunya perencanaan 4 tahun.]' },
          { t: 'h2', x: 'B. Landasan Hukum' });
        B = B.concat(hukumItems(c, 'rkjm'));
        B.push({ t: 'h2', x: 'C. Tujuan Penyusunan' }, { t: 'petunjuk', x: '[Tuliskan tujuan penyusunan RKJM.]' },
          { t: 'h2', x: 'D. Sistematika' }, { t: 'petunjuk', x: '[Ringkasan isi tiap bab.]' }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB II  PROFIL MADRASAH' }, { t: 'h2', x: 'A. Identitas Madrasah' },
          { t: 'tabel', head: ['Data', 'Keterangan'], lebar: [35, 65], rows: [['Nama madrasah', dot(c.nama, '')], ['NSM / NPSN', dot(c.nsm, '') + ' / ' + dot(c.npsn, '')], ['Alamat', dot(c.alamat, '')], ['Kepala madrasah', dot(c.kepala, '')], ['Status / akreditasi', ''], ['Tahun berdiri', '']] },
          { t: 'h2', x: 'B. Peserta Didik' },
          { t: 'tabel', head: ['Tahun ajaran', 'Jumlah rombel', 'Laki-laki', 'Perempuan', 'Total'], lebar: [28, 18, 18, 18, 18], rows: [[c.ta, '', '', '', '']], kosong: 3 },
          { t: 'h2', x: 'C. Pendidik dan Tenaga Kependidikan' },
          { t: 'tabel', head: ['Kelompok', 'ASN', 'Non-ASN', 'Sertifikasi', 'Total'], lebar: [32, 17, 17, 17, 17], rows: [['Guru', '', '', '', ''], ['Tenaga kependidikan', '', '', '', '']] },
          { t: 'h2', x: 'D. Sarana dan Prasarana' }, { t: 'petunjuk', x: '[Ringkas kondisi ruang kelas, perpustakaan, laboratorium, sanitasi, dan fasilitas lain.]' }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB III  HASIL EVALUASI DIRI MADRASAH' },
          { t: 'h2', x: 'A. Capaian per Standar' },
          { t: 'tabel', head: ['No', 'Standar', 'Skor/Capaian', 'Kekuatan', 'Kelemahan', 'Rekomendasi'], lebar: [6, 24, 14, 18, 18, 20], rows: nomor(['Kompetensi Lulusan', 'Isi', 'Proses', 'Penilaian', 'Pendidik dan Tenaga Kependidikan', 'Sarana dan Prasarana', 'Pengelolaan', 'Pembiayaan'].map(function (s) { return [s, '', '', '', '']; })) },
          { t: 'h2', x: 'B. Analisis SWOT' },
          { t: 'tabel', head: ['Kekuatan (S)', 'Kelemahan (W)', 'Peluang (O)', 'Ancaman (T)'], lebar: [25, 25, 25, 25], kosong: 4 }, { t: 'br' });
        var VM = profilTeks(c);
        B.push({ t: 'h1', x: 'BAB IV  VISI, MISI, DAN TUJUAN' },
          { t: 'h2', x: 'A. Visi' }, VM.visi ? { t: 'p', x: VM.visi } : { t: 'petunjuk', x: '[Tuliskan visi madrasah. Isi sekali di kartu Visi, Misi, dan Tujuan (tab Kerangka Dokumen) agar terisi otomatis.]' },
          { t: 'h2', x: 'B. Misi' }, { t: 'daftar', nomor: true, items: VM.misi.length ? VM.misi : ['[Misi 1]', '[Misi 2]', '[Misi 3]'] },
          { t: 'h2', x: 'C. Tujuan dan Sasaran 4 Tahun' },
          { t: 'tabel', head: ['Tujuan', 'Indikator'].concat(thn.map(function (t) { return 'Target ' + t; })), lebar: [26, 24, 12.5, 12.5, 12.5, 12.5], rows: VM.tujuan.length ? VM.tujuan.map(function (x) { return [x, '', '', '', '', '']; }) : null, kosong: VM.tujuan.length ? 0 : 4 }, { t: 'br' });
        var progRows = c.bidang.map(function (b) { return [b, '', '', '', '', '', '']; });
        B.push({ t: 'h1', x: 'BAB V  PROGRAM STRATEGIS' },
          { t: 'petunjuk', x: '[Satu baris per bidang sudah disediakan; tambah baris bila program lebih dari satu.]' },
          { t: 'tabel', head: ['Bidang', 'Program strategis', 'Indikator'].concat(thn.map(function (t) { return t; })), lebar: [20, 24, 18, 9.5, 9.5, 9.5, 9.5], rows: progRows, kosong: 3 },
          { t: 'br' },
          { t: 'h1', x: 'BAB VI  RENCANA PEMBIAYAAN' },
          { t: 'tabel', head: ['Sumber dana'].concat(thn).concat(['Jumlah']), lebar: [28, 14, 14, 14, 14, 16], rows: [['BOS / BOP'], ['APBN / APBD'], ['Komite / masyarakat'], ['Lain-lain'], ['Jumlah']].map(function (r) { return r.concat(['', '', '', '', '']).slice(0, 6); }) },
          { t: 'h1', x: 'BAB VII  PENGENDALIAN DAN EVALUASI' },
          { t: 'p', x: 'RKJM dijabarkan setiap tahun ke dalam Rencana Kerja Tahunan (RKT). Capaian program dipantau berkala oleh kepala madrasah dan dilaporkan pada akhir tahun ajaran.' },
          { t: 'petunjuk', x: '[Jelaskan jadwal monitoring (triwulan/semester), penanggung jawab, dan mekanisme tindak lanjut.]' },
          { t: 'h1', x: 'BAB VIII  PENUTUP' }, { t: 'petunjuk', x: '[Kesimpulan dan harapan pelaksanaan.]' });
        return B;
      }
    },

    rkt: {
      judul: 'Rencana Kerja Tahunan (RKT)', ringkas: 'Rencana satu tahun ajaran. Tabel program terisi otomatis dari tab Pemantau RKT.', jenisTa: 'ta',
      bangun: function (c) {
        var B = sampul(c, 'RENCANA KERJA TAHUNAN (RKT)', 'Tahun Ajaran ' + c.ta).concat(pengesahan(c));
        B.push({ t: 'h1', x: 'BAB I  PENDAHULUAN' },
          { t: 'h2', x: 'A. Dasar Penyusunan' }, { t: 'p', x: 'RKT tahun ajaran ' + c.ta + ' disusun sebagai penjabaran tahun berjalan dari Rencana Kerja Jangka Menengah (RKJM) ' + dot(c.nama, 'madrasah') + '.' },
          { t: 'h2', x: 'B. Landasan Hukum' });
        B = B.concat(hukumItems(c, 'rkt'));
        B.push({ t: 'h2', x: 'C. Tujuan' }, { t: 'petunjuk', x: '[Tuliskan tujuan penyusunan RKT.]' },
          { t: 'h2', x: 'D. Evaluasi Pelaksanaan RKT Tahun Sebelumnya' },
          { t: 'tabel', head: ['Program tahun lalu', 'Capaian', 'Kendala', 'Tindak lanjut'], lebar: [28, 20, 26, 26], kosong: 4 }, { t: 'br' });
        var kpiRows = c.kpi.length ? c.kpi.map(function (k) { return [k.nama, k.targetTeks, fpct(k.nilai)]; }) : KPI_LINK.map(function (k) { return [k[1], '', '']; });
        B.push({ t: 'h1', x: 'BAB II  SASARAN DAN INDIKATOR UTAMA' },
          { t: 'petunjuk', x: c.kpi.length ? '[Kolom "Posisi awal" diambil dari KPI Madrasah periode ' + c.kpiPeriode + '. Sesuaikan target tahun ini.]' : '[Isi target dan posisi awal. Buka halaman KPI Madrasah lebih dulu agar kolom ini terisi otomatis.]' },
          { t: 'tabel', head: ['Indikator', 'Target', 'Posisi awal'], lebar: [50, 25, 25], rows: kpiRows }, { t: 'br' });
        var prog = c.program.length ? nomor(c.program.map(function (p) { return [p.bidang, p.program, p.indikator || '', p.target || '', p.tenggat ? tglId(p.tenggat) : '', p.pj || '', '']; })) : [];
        B.push({ t: 'h1', x: 'BAB III  PROGRAM DAN KEGIATAN' },
          { t: 'petunjuk', x: c.program.length ? '[Tabel di bawah terisi dari tab Pemantau RKT (' + c.program.length + ' program). Lengkapi kolom anggaran.]' : '[Belum ada program di tab Pemantau RKT untuk tahun ajaran ini; isi tabel secara manual atau tambahkan program di aplikasi lalu unduh ulang.]' },
          { t: 'tabel', head: ['No', 'Bidang', 'Program/kegiatan', 'Indikator', 'Target', 'Waktu', 'Penanggung jawab', 'Anggaran'], lebar: [5, 13, 20, 15, 10, 11, 13, 13], rows: prog, kosong: c.program.length ? 0 : 8 }, { t: 'br' });
        var bln = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
        B.push({ t: 'h1', x: 'BAB IV  KALENDER KEGIATAN' },
          { t: 'tabel', head: ['Bulan', 'Kegiatan utama', 'Penanggung jawab'], lebar: [20, 55, 25], rows: bln.map(function (b) { return [b, '', '']; }) },
          { t: 'h1', x: 'BAB V  RENCANA ANGGARAN' }, { t: 'p', x: 'Rincian anggaran mengacu pada RKAM tahun ' + c.ta + '. Ringkasan sumber dan penggunaan dana:' },
          { t: 'tabel', head: ['Bidang', 'Anggaran', 'Sumber dana'], lebar: [40, 30, 30], rows: c.bidang.map(function (b) { return [b, '', '']; }) },
          { t: 'h1', x: 'BAB VI  MONITORING DAN EVALUASI' },
          { t: 'petunjuk', x: '[Jadwal monitoring (mis. tiap triwulan), penanggung jawab, dan bentuk pelaporan.]' },
          { t: 'h1', x: 'BAB VII  PENUTUP' }, { t: 'petunjuk', x: '[Penutup.]' });
        return B;
      }
    },

    laporan_rkt: {
      judul: 'Laporan Pelaksanaan RKT', ringkas: 'Laporan akhir tahun ajaran. Capaian program dan nilai KPI terisi otomatis.', jenisTa: 'ta',
      bangun: function (c) {
        var B = sampul(c, 'LAPORAN PELAKSANAAN RENCANA KERJA TAHUNAN', 'Tahun Ajaran ' + c.ta).concat(pengesahan(c));
        var NS = { belum: 'Belum mulai', berjalan: 'Berjalan', tercapai: 'Tercapai', tidak: 'Tidak tercapai / ditunda' };
        B.push({ t: 'h1', x: 'BAB I  PENDAHULUAN' },
          { t: 'h2', x: 'A. Latar Belakang' }, { t: 'p', x: 'Laporan ini menyajikan pelaksanaan Rencana Kerja Tahunan (RKT) ' + dot(c.nama, 'madrasah') + ' tahun ajaran ' + c.ta + '.' },
          { t: 'h2', x: 'B. Dasar Hukum' });
        B = B.concat(hukumItems(c, 'laporan_rkt'));
        B.push({ t: 'h2', x: 'C. Tujuan' }, { t: 'p', x: 'Laporan ini bertujuan menyajikan capaian program dan indikator kinerja RKT ' + c.ta + ' sebagai bahan evaluasi dan dasar penyusunan RKT tahun ajaran berikutnya.' }, { t: 'petunjuk', x: CAT_USUL });
        var ringkas = c.program.length ? (function () {
          var n = { belum: 0, berjalan: 0, tercapai: 0, tidak: 0 }; c.program.forEach(function (p) { n[p.status] = (n[p.status] || 0) + 1; });
          return 'Dari ' + c.program.length + ' program: ' + n.tercapai + ' tercapai, ' + n.berjalan + ' berjalan, ' + n.belum + ' belum mulai, ' + n.tidak + ' tidak tercapai/ditunda.';
        })() : '';
        B.push({ t: 'h1', x: 'BAB II  CAPAIAN PROGRAM' });
        if (ringkas) B.push({ t: 'p', x: ringkas });
        B.push({ t: 'tabel', head: ['No', 'Bidang', 'Program/kegiatan', 'Target', 'Status', 'Progres', 'Keterangan'], lebar: [5, 15, 24, 14, 14, 8, 20],
          rows: nomor(c.program.map(function (p) { return [p.bidang, p.program, p.target || '', NS[p.status] || '', (p.progres == null ? '' : p.progres + '%'), p.catatan || '']; })), kosong: c.program.length ? 0 : 8 });
        B = B.concat(analisisProgram(c)); B.push({ t: 'br' });
        var kr = c.kpi.length ? c.kpi.map(function (k) { return [k.nama, k.targetTeks, fpct(k.nilai), k.statusTeks]; }) : KPI_LINK.map(function (k) { return [k[1], '', '', '']; });
        B.push({ t: 'h1', x: 'BAB III  CAPAIAN INDIKATOR KINERJA' },
          { t: 'petunjuk', x: c.kpi.length ? '[Nilai diambil dari KPI Madrasah periode ' + c.kpiPeriode + '. Untuk laporan akhir tahun, pilih periode Tahun Ajaran di halaman KPI lalu unduh ulang.]' : '[Buka halaman KPI Madrasah lebih dulu agar tabel ini terisi otomatis.]' },
          { t: 'tabel', head: ['Indikator', 'Target', 'Capaian', 'Status'], lebar: [40, 20, 20, 20], rows: kr });
        B = B.concat(analisisKpi(c));
        B.push({ t: 'h1', x: 'BAB IV  REALISASI ANGGARAN' },
          { t: 'tabel', head: ['Bidang', 'Anggaran (RKAM)', 'Realisasi', 'Sisa/selisih'], lebar: [34, 22, 22, 22], rows: c.bidang.map(function (b) { return [b, '', '', '']; }) },
          { t: 'h1', x: 'BAB V  FAKTOR PENDUKUNG DAN PENGHAMBAT' },
          { t: 'petunjuk', x: usulanFaktor(c).ada ? CAT_USUL + ' Tambahkan faktor lain yang tidak terekam di aplikasi.' : '[Isi faktor pendukung dan penghambat.]' },
          { t: 'tabel', head: ['Faktor pendukung', 'Faktor penghambat'], lebar: [50, 50], rows: usulanFaktor(c).rows },
          { t: 'h1', x: 'BAB VI  TINDAK LANJUT DAN REKOMENDASI' },
          { t: 'petunjuk', x: usulanTindak(c).length ? CAT_USUL : '[Isi temuan dan tindak lanjut.]' },
          { t: 'tabel', head: ['No', 'Temuan/masalah', 'Tindak lanjut', 'Penanggung jawab', 'Waktu'], lebar: [6, 30, 30, 20, 14], rows: nomor(usulanTindak(c)), kosong: usulanTindak(c).length ? 0 : 3 },
          { t: 'h1', x: 'BAB VII  PENUTUP' }, kesimpulanRkt(c) ? { t: 'p', x: kesimpulanRkt(c) } : { t: 'petunjuk', x: '[Kesimpulan umum dan harapan untuk tahun ajaran berikutnya.]' }, { t: 'petunjuk', x: CAT_USUL }, { t: 'br' },
          { t: 'h1', x: 'LAMPIRAN' }, { t: 'daftar', items: ['Dokumentasi kegiatan', 'Notulen rapat evaluasi', 'Laporan realisasi anggaran', 'Dokumen pendukung lain'] });
        return B;
      }
    }

    ,
    // ====== Dokumen yang datanya sudah ada di aplikasi (v8.509) ======
    sk_tugas: {
      judul: 'SK Pembagian Tugas Guru dan Tenaga Kependidikan', ringkas: 'SK Kepala Madrasah. Daftar wali kelas, tugas mengajar, beban jam, dan tugas tambahan terisi dari data guru dan jadwal.', jenisTa: 'ta', berkas: 'SK-Pembagian-Tugas',
      oto: function (c) { return c.guru.length + ' guru, ' + c.waliKelas.length + ' wali kelas, ' + c.jadwal.length + ' baris jadwal'; },
      bangun: function (c) {
        var B = [{ t: 'judul', x: 'KEPUTUSAN KEPALA ' + dot(c.nama, 'NAMA MADRASAH').toUpperCase() }, { t: 'sub', x: 'NOMOR : ......................................', b: true },
          { t: 'sub', x: 'TENTANG', b: true }, { t: 'sub', x: 'PEMBAGIAN TUGAS GURU DAN TENAGA KEPENDIDIKAN', b: true }, { t: 'sub', x: 'TAHUN AJARAN ' + c.ta, b: true }, { t: 'spasi', n: 1 },
          { t: 'h2', x: 'Menimbang' }, { t: 'daftar', nomor: true, items: ['bahwa untuk kelancaran penyelenggaraan pendidikan di ' + dot(c.nama, 'madrasah') + ' pada tahun ajaran ' + c.ta + ' perlu menetapkan pembagian tugas guru dan tenaga kependidikan;', 'bahwa nama-nama yang tercantum dalam lampiran keputusan ini dipandang mampu melaksanakan tugas tersebut.'] },
          { t: 'h2', x: 'Mengingat' }].concat(hukumItems(c, 'sk_tugas'), [
          { t: 'h1', x: 'MEMUTUSKAN' }, { t: 'h2', x: 'Menetapkan' },
          { t: 'p', x: 'KESATU : Menetapkan pembagian tugas guru dan tenaga kependidikan ' + dot(c.nama, 'madrasah') + ' tahun ajaran ' + c.ta + ' sebagaimana tercantum dalam Lampiran I dan Lampiran II keputusan ini.' },
          { t: 'p', x: 'KEDUA : Guru dan tenaga kependidikan yang ditugaskan wajib melaksanakan tugas dengan penuh tanggung jawab dan melaporkan pelaksanaannya kepada Kepala Madrasah.' },
          { t: 'p', x: 'KETIGA : Keputusan ini berlaku sejak tanggal ditetapkan dan apabila terdapat kekeliruan akan diperbaiki sebagaimana mestinya.' }, { t: 'spasi', n: 1 },
          { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
          { t: 'ttd', kolom: [{ atas: 'Ditetapkan oleh,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] }, { t: 'br' }]);
        B.push({ t: 'h1', x: 'LAMPIRAN I  WALI KELAS' },
          { t: 'petunjuk', x: c.waliKelas.length ? '[Terisi dari data guru (wali kelas) dan data siswa aktif.]' : '[Belum ada guru yang ditetapkan sebagai wali kelas di Data Guru.]' },
          { t: 'tabel', head: ['No', 'Kelas', 'Wali Kelas', 'Jumlah Siswa'], lebar: [8, 20, 52, 20], rows: nomor(c.waliKelas.map(function (w) { return [w.kelas, w.nama, w.siswa == null ? '' : String(w.siswa)]; })), kosong: c.waliKelas.length ? 0 : 6 }, { t: 'br' });
        B.push({ t: 'h1', x: 'LAMPIRAN II  TUGAS GURU' },
          { t: 'petunjuk', x: c.guru.length ? '[Mata pelajaran, kelas, dan jumlah jam per pekan diambil dari menu Jadwal. Tugas tambahan diambil dari Data Guru.]' : '[Data guru belum termuat.]' },
          { t: 'tabel', head: ['No', 'Nama', 'Tugas pokok (mengajar)', 'Kelas', 'Jam/ pekan', 'Tugas tambahan'], lebar: [6, 24, 24, 14, 8, 24],
            rows: nomor(c.guru.map(function (g) { return [g.nama, g.mapel.join(', '), g.kelas.join(', '), g.jam ? String(g.jam) : '', (g.wali ? ['Wali Kelas ' + g.wali] : []).concat(g.tambahan).join('; ')]; })), kosong: c.guru.length ? 0 : 8 });
        return B;
      }
    },

    jadwal: {
      judul: 'Pembagian Tugas Mengajar dan Jadwal Pelajaran', ringkas: 'Beban mengajar per guru dan jadwal pelajaran per kelas, diambil dari menu Jadwal dan Setting Jam.', jenisTa: 'ta', berkas: 'Jadwal-Pelajaran',
      oto: function (c) { return c.jadwal.length + ' baris jadwal, ' + c.kelasJadwal.length + ' kelas'; },
      bangun: function (c) {
        var B = sampul(c, 'PEMBAGIAN TUGAS MENGAJAR DAN JADWAL PELAJARAN', 'Tahun Ajaran ' + c.ta);
        B[B.length - 1] = { t: 'br' };
        B.push({ t: 'h1', x: 'DASAR HUKUM' }); B = B.concat(hukumItems(c, 'jadwal')); B.push({ t: 'br' });
        B.push({ t: 'h1', x: 'A. PEMBAGIAN TUGAS MENGAJAR' },
          { t: 'petunjuk', x: c.beban.length ? '[Terisi dari menu Jadwal (kondisi saat diunduh). Pastikan sesuai tahun ajaran ' + c.ta + '.]' : '[Belum ada data jadwal.]' },
          { t: 'tabel', head: ['No', 'Nama Guru', 'Mata pelajaran', 'Kelas', 'Jam/ pekan'], lebar: [6, 34, 30, 16, 14], rows: nomor(c.beban.map(function (b) { return [b.guru, b.mapel, b.kelas, String(b.jam)]; })), kosong: c.beban.length ? 0 : 8 }, { t: 'br' });
        B.push({ t: 'h1', x: 'B. JADWAL PELAJARAN PER KELAS' });
        if (!c.kelasJadwal.length) B.push({ t: 'petunjuk', x: '[Belum ada data jadwal.]' });
        c.kelasJadwal.forEach(function (k) {
          var hr = k.hari, w = Math.floor(78 / Math.max(hr.length, 1)), lebar = [6, 16].concat(hr.map(function () { return w; }));
          B.push({ t: 'h2', x: 'Kelas ' + String(k.kelas).replace(/^kelas\s+/i, '') },
            { t: 'tabel', head: ['Jam', 'Waktu'].concat(hr), lebar: lebar, rows: k.jam.map(function (j) { return [String(j.no), j.waktu].concat(hr.map(function (h) { return j.sel[h] || ''; })); }) });
        });
        B.push({ t: 'spasi', n: 1 }, { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
          { t: 'ttd', kolom: [{ atas: 'Mengetahui,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] });
        return B;
      }
    },

    struktur: {
      judul: 'Struktur Organisasi Madrasah', ringkas: 'Kepala, wali kelas, guru, dan pemegang tugas tambahan terisi dari Data Guru dan Pengaturan Madrasah.', jenisTa: 'ta', berkas: 'Struktur-Organisasi',
      oto: function (c) { return c.guru.length + ' guru, ' + c.waliKelas.length + ' wali kelas'; },
      bangun: function (c) {
        var B = sampul(c, 'STRUKTUR ORGANISASI MADRASAH', 'Tahun Ajaran ' + c.ta);
        B[B.length - 1] = { t: 'br' };
        B.push({ t: 'h1', x: 'DASAR HUKUM' }); B = B.concat(hukumItems(c, 'struktur')); B.push({ t: 'br' });
        var kep = [['Kepala Madrasah', dot(c.kepala, '............................'), c.nip || '']];
        B.push({ t: 'h1', x: 'A. PIMPINAN' }, { t: 'tabel', head: ['Jabatan', 'Nama', 'NIP'], lebar: [30, 45, 25], rows: kep },
          { t: 'petunjuk', x: '[Tambahkan Ketua Komite, Waka, atau Operator/Tata Usaha bila ada di madrasah Anda.]' },
          { t: 'tabel', head: ['Jabatan', 'Nama'], lebar: [40, 60], kosong: 4 }, { t: 'br' });
        B.push({ t: 'h1', x: 'B. WALI KELAS' },
          { t: 'tabel', head: ['No', 'Kelas', 'Wali Kelas', 'Jumlah Siswa'], lebar: [8, 20, 52, 20], rows: nomor(c.waliKelas.map(function (w) { return [w.kelas, w.nama, w.siswa == null ? '' : String(w.siswa)]; })), kosong: c.waliKelas.length ? 0 : 6 });
        var tt = []; c.guru.forEach(function (g) { g.tambahan.forEach(function (t) { tt.push([t, g.nama]); }); });
        B.push({ t: 'h1', x: 'C. TUGAS TAMBAHAN' }, { t: 'petunjuk', x: tt.length ? '[Diambil dari kolom Tugas Tambahan di Data Guru.]' : '[Belum ada tugas tambahan yang diisi di Data Guru.]' },
          { t: 'tabel', head: ['No', 'Tugas tambahan', 'Pemegang tugas'], lebar: [8, 46, 46], rows: nomor(tt), kosong: tt.length ? 0 : 5 },
          { t: 'h1', x: 'D. GURU' }, { t: 'daftar', nomor: true, items: c.guru.map(function (g) { return g.nama + (g.mapel.length ? ' (' + g.mapel.join(', ') + ')' : ''); }) },
          { t: 'h1', x: 'E. BAGAN ORGANISASI' }, { t: 'petunjuk', x: '[Sisipkan bagan struktur organisasi (gambar) di sini.]' }, { t: 'spasi', n: 1 },
          { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
          { t: 'ttd', kolom: [{ atas: 'Mengetahui,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] });
        return B;
      }
    },

    kalender: {
      judul: 'Kalender Pendidikan', ringkas: 'Daftar kegiatan dan hari libur tahun ajaran terisi dari menu Kalender Akademik.', jenisTa: 'ta', berkas: 'Kalender-Pendidikan',
      oto: function (c) { return c.kalender.length ? c.kalender.length + ' entri kalender' : 'kalender kosong (buka halaman Kalender Akademik sekali lalu unduh ulang)'; },
      bangun: function (c) {
        var B = sampul(c, 'KALENDER PENDIDIKAN', 'Tahun Ajaran ' + c.ta);
        B[B.length - 1] = { t: 'br' };
        B.push({ t: 'h1', x: 'DASAR HUKUM' }); B = B.concat(hukumItems(c, 'kalender')); B.push({ t: 'br' });
        var libur = c.kalender.filter(function (k) { return /libur/i.test(k.jenis); }), lain = c.kalender.filter(function (k) { return !/libur/i.test(k.jenis); });
        var baris = function (a) { return nomor(a.map(function (k) { return [k.judul, tglId(k.mulai), k.selesai && k.selesai !== k.mulai ? tglId(k.selesai) : '', k.ket]; })); };
        B.push({ t: 'h1', x: 'A. KEGIATAN AKADEMIK' }, { t: 'petunjuk', x: c.kalender.length ? '[Terisi dari menu Kalender Akademik tahun ajaran ' + c.ta + '.]' : '[Belum ada entri kalender untuk tahun ajaran ini, atau data kalender belum dimuat. Buka halaman Kalender Akademik sekali, lalu unduh ulang.]' },
          { t: 'tabel', head: ['No', 'Kegiatan', 'Mulai', 'Selesai', 'Keterangan'], lebar: [6, 40, 18, 18, 18], rows: baris(lain), kosong: lain.length ? 0 : 6 }, { t: 'br' });
        B.push({ t: 'h1', x: 'B. HARI LIBUR' },
          { t: 'tabel', head: ['No', 'Hari libur', 'Mulai', 'Selesai', 'Keterangan'], lebar: [6, 40, 18, 18, 18], rows: baris(libur), kosong: libur.length ? 0 : 6 }, { t: 'spasi', n: 1 },
          { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
          { t: 'ttd', kolom: [{ atas: 'Ditetapkan oleh,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] });
        return B;
      }
    },

    edm: {
      judul: 'Data Pendukung Evaluasi Diri Madrasah (EDM)', angket: true, ringkas: 'Profil madrasah, jumlah siswa per kelas, jumlah guru, dan nilai KPI terisi otomatis. Analisis per komponen diisi manual.', jenisTa: 'ta', berkas: 'Data-Pendukung-EDM',
      oto: function (c) { return c.siswaTotal + ' siswa, ' + c.guru.length + ' guru' + (c.kpi.length ? ', KPI ' + c.kpiPeriode : ', KPI belum dimuat'); },
      bangun: function (c) {
        var AE = analisisEdm(c);
        var B = sampul(c, 'DATA PENDUKUNG EVALUASI DIRI MADRASAH (EDM)', 'Tahun Ajaran ' + c.ta);
        B[B.length - 1] = { t: 'br' };
        B.push({ t: 'h1', x: 'DASAR HUKUM' }); B = B.concat(hukumItems(c, 'edm')); B.push({ t: 'br' });
        var rasio = (c.guru.length && c.siswaTotal) ? ('1 : ' + Math.round(c.siswaTotal / c.guru.length)) : '';
        B.push({ t: 'h1', x: 'BAB I  PROFIL MADRASAH' },
          { t: 'tabel', head: ['Data', 'Keterangan'], lebar: [35, 65], rows: [['Nama madrasah', c.nama], ['NSM', c.nsm], ['NPSN', c.npsn], ['Alamat', c.alamat], ['Kepala madrasah', c.kepala], ['Visi', profilTeks(c).visi], ['Jumlah siswa', c.siswaTotal ? String(c.siswaTotal) : ''], ['Jumlah rombongan belajar', c.siswaKelas.length ? String(c.siswaKelas.length) : ''], ['Jumlah guru', c.guru.length ? String(c.guru.length) : ''], ['Rasio guru : siswa', rasio.replace('1 : ', '1 : ')]] }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB II  DATA SISWA PER KELAS' },
          { t: 'tabel', head: ['No', 'Kelas', 'Jumlah siswa', 'Wali kelas'], lebar: [8, 24, 24, 44], rows: nomor(c.siswaKelas.map(function (k) { return [k.kelas, String(k.n), k.wali]; })), kosong: c.siswaKelas.length ? 0 : 6 }, { t: 'br' });
        var kr = c.kpi.length ? c.kpi.map(function (k) { return [k.nama, k.targetTeks, fpct(k.nilai), k.statusTeks]; }) : KPI_LINK.map(function (k) { return [k[1], '', '', '']; });
        B.push({ t: 'h1', x: 'BAB III  CAPAIAN INDIKATOR KINERJA' },
          { t: 'petunjuk', x: c.kpi.length ? '[Nilai diambil dari KPI Madrasah periode ' + c.kpiPeriode + '.]' : '[Buka halaman KPI Madrasah lebih dulu agar tabel ini terisi otomatis.]' },
          { t: 'tabel', head: ['Indikator', 'Target', 'Capaian', 'Status'], lebar: [40, 20, 20, 20], rows: kr }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB IV  ANALISIS PER KOMPONEN' }, { t: 'petunjuk', x: '[Isi bukti, kekuatan, dan area perbaikan sesuai instrumen EDM yang berlaku.]' },
          { t: 'tabel', head: ['Komponen', 'Skor/hasil', 'Kekuatan', 'Area perbaikan'], lebar: [28, 14, 29, 29], rows: edmKomponen(c) });
        B = B.concat(AE.paragraf.map(function (x) { return { t: 'p', x: x }; }), AE.paragraf.length ? [{ t: 'petunjuk', x: CAT_USUL }] : []);
        B.push({ t: 'h1', x: 'BAB V  REKOMENDASI' }, AE.rek.length ? { t: 'daftar', nomor: true, items: AE.rek } : { t: 'petunjuk', x: '[Prioritas perbaikan yang menjadi dasar penyusunan RKJM dan RKT.]' }, AE.rek.length ? { t: 'petunjuk', x: CAT_USUL } : { t: 'spasi', n: 0 }, { t: 'spasi', n: 1 },
          { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
          { t: 'ttd', kolom: [{ atas: 'Disusun oleh,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] });
        return B;
      }
    }

    ,
    // ====== Dokumen supervisi: diambil dari data modul PKG (pkg_v4_*) ======
    prog_supervisi: {
      judul: 'Program Supervisi Akademik', ringkas: 'Sasaran, penilai, jadwal pengamatan, dan fokus supervisi tiap guru terisi dari penugasan dan supervisi digital di menu PKG Guru.', jenisTa: 'pkg', pkg: true, berkas: 'Program-Supervisi',
      bangun: function (c) {
        var P = c.pkg, B = sampul(c, 'PROGRAM SUPERVISI AKADEMIK', P.periode.nama ? P.periode.nama : 'Tahun Ajaran ' + c.ta);
        B[B.length - 1] = { t: 'br' };
        B.push({ t: 'h1', x: 'DASAR HUKUM' }); B = B.concat(hukumItems(c, 'prog_supervisi')); B.push({ t: 'br' });
        B.push({ t: 'h1', x: 'BAB I  PENDAHULUAN' },
          { t: 'h2', x: 'A. Dasar' }, { t: 'p', x: 'Program supervisi akademik ini disusun mengacu pada Petunjuk Teknis Penilaian Kinerja Guru Madrasah (Keputusan Direktur Jenderal Pendidikan Islam Nomor 1843 Tahun 2021) dan dilaksanakan di ' + dot(c.nama, 'madrasah') + '.' },
          { t: 'h2', x: 'B. Tujuan' }, { t: 'petunjuk', x: '[Tuliskan tujuan supervisi akademik di madrasah Anda.]' },
          { t: 'h2', x: 'C. Periode' }, { t: 'p', x: (P.periode.nama || '............................') + (P.periode.mulai ? ' (' + tglId(P.periode.mulai) + ' s.d. ' + tglId(P.periode.selesai) + ')' : '') + '.' }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB II  SASARAN DAN JADWAL' },
          { t: 'petunjuk', x: P.guru.length ? '[Terisi dari penugasan penilai dan supervisi digital (Tahap 1) di menu PKG Guru: ' + P.guru.length + ' guru. Kolom kosong berarti belum diisi di PKG.]' : '[Belum ada penugasan penilai pada periode ini di menu PKG Guru.]' },
          { t: 'tabel', head: ['No', 'Guru', 'Penilai', 'Jadwal pengamatan', 'Fokus pengamatan', 'Waktu dan cara'], lebar: [5, 20, 18, 15, 25, 17],
            rows: nomor(P.guru.map(function (g) { return [g.nama, g.penilai, g.jadwal ? tglId(g.jadwal) : '', g.fokus, g.waktu]; })), kosong: P.guru.length ? 0 : 8 }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB III  PERANGKAT YANG DISIAPKAN GURU' },
          { t: 'tabel', head: ['No', 'Guru', 'Perangkat pembelajaran'], lebar: [6, 30, 64], rows: nomor(P.guru.map(function (g) { return [g.nama, g.perangkat]; })), kosong: P.guru.length ? 0 : 6 },
          { t: 'h1', x: 'BAB IV  TAHAPAN SUPERVISI' },
          { t: 'daftar', nomor: true, items: ['Tahap 1: pertemuan awal, menyepakati fokus pengamatan dan perangkat.', 'Tahap 2: pengamatan pembelajaran dan pengumpulan bukti.', 'Tahap 3: pertemuan umpan balik dan kesepakatan tindak lanjut.'] },
          { t: 'petunjuk', x: '[Sesuaikan tahapan dengan pelaksanaan di madrasah Anda.]' },
          { t: 'h1', x: 'BAB V  PENUTUP' }, { t: 'petunjuk', x: '[Penutup.]' }, { t: 'spasi', n: 1 },
          { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
          { t: 'ttd', kolom: [{ atas: 'Disusun oleh,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] });
        return B;
      }
    },

    lap_supervisi: {
      judul: 'Laporan Hasil Supervisi dan Tindak Lanjut', ringkas: 'Status penilaian, nilai, sebutan, hasil umpan balik (Tahap 3), tindak lanjut, dan pengendalian internal terisi dari menu PKG Guru.', jenisTa: 'pkg', pkg: true, berkas: 'Laporan-Supervisi',
      bangun: function (c) {
        var AS = analisisSupervisi(c);
        var P = c.pkg, B = sampul(c, 'LAPORAN HASIL SUPERVISI DAN TINDAK LANJUT', P.periode.nama ? P.periode.nama : 'Tahun Ajaran ' + c.ta);
        B[B.length - 1] = { t: 'br' };
        B.push({ t: 'h1', x: 'DASAR HUKUM' }); B = B.concat(hukumItems(c, 'lap_supervisi')); B.push({ t: 'br' });
        var n = P.guru.length, lengkap = P.guru.filter(function (g) { return g.hasil && g.hasil.lengkap; }), ts = {};
        P.guru.forEach(function (g) { ts[g.status] = (ts[g.status] || 0) + 1; });
        var rata = lengkap.length ? lengkap.reduce(function (a, g) { return a + (+g.hasil.nilai100 || 0); }, 0) / lengkap.length : null;
        var NS = { belum: 'Belum', draft: 'Draf', diajukan: 'Diajukan', disetujui: 'Disetujui guru', keberatan: 'Keberatan', ditetapkan: 'Ditetapkan' };
        var ring = n ? ('Dari ' + n + ' guru pada periode ini: ' + Object.keys(NS).filter(function (k) { return ts[k]; }).map(function (k) { return ts[k] + ' ' + NS[k].toLowerCase(); }).join(', ') + '. ' + (rata == null ? 'Belum ada guru dengan penilaian lengkap.' : 'Rata-rata nilai PKG (skala 100) dari ' + lengkap.length + ' guru berpenilaian lengkap: ' + fpct(rata).replace('%', '') + '.')) : '';
        B.push({ t: 'h1', x: 'BAB I  PENDAHULUAN' }, { t: 'p', x: 'Laporan ini menyajikan pelaksanaan supervisi akademik dan penilaian kinerja guru di ' + dot(c.nama, 'madrasah') + ' pada ' + (P.periode.nama || 'tahun ajaran ' + c.ta) + '.' },
          { t: 'petunjuk', x: '[Rujuk program supervisi dan tujuan pelaporan.]' });
        B.push({ t: 'h1', x: 'BAB II  RINGKASAN PELAKSANAAN' }, { t: 'petunjuk', x: n ? '[Terisi dari data menu PKG Guru.]' : '[Belum ada penugasan penilai pada periode ini di menu PKG Guru.]' });
        if (ring) B.push({ t: 'p', x: ring });
        B.push({ t: 'tabel', head: ['No', 'Guru', 'Penilai', 'Nilai (100)', 'Sebutan', 'Status'], lebar: [6, 28, 24, 14, 14, 14],
          rows: nomor(P.guru.map(function (g) { return [g.nama, g.penilai, g.hasil && g.hasil.lengkap ? fpct(+g.hasil.nilai100).replace('%', '') : '', g.hasil && g.hasil.lengkap ? (g.hasil.sebutan || '') : '', NS[g.status] || '']; })), kosong: n ? 0 : 8 }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB III  UMPAN BALIK DAN TINDAK LANJUT PER GURU' },
          { t: 'tabel', head: ['No', 'Guru', 'Hal yang sudah baik', 'Perlu ditingkatkan', 'Tindak lanjut'], lebar: [5, 18, 25, 25, 27],
            rows: nomor(P.guru.map(function (g) { return [g.nama, g.baik, g.perbaikan, g.tindak || g.rtl]; })), kosong: n ? 0 : 6 }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB IV  PENGENDALIAN INTERNAL' },
          { t: 'tabel', head: ['Temuan', 'Tindak lanjut'], lebar: [50, 50], rows: [[P.kendali.temuan || '', P.kendali.tindak || '']] },
          { t: 'petunjuk', x: P.kendali.temuan || P.kendali.tindak ? '[Diambil dari lembar pengendalian internal di menu PKG Guru.]' : '[Lembar pengendalian internal belum diisi di menu PKG Guru.]' },
          { t: 'h1', x: 'BAB V  KESIMPULAN DAN REKOMENDASI' }, AS.kalimat ? { t: 'p', x: AS.kalimat } : { t: 'petunjuk', x: '[Kesimpulan umum.]' },
          { t: 'daftar', nomor: true, items: AS.rek.length ? AS.rek : (AS.n ? ['Tidak ada temuan yang memerlukan tindak lanjut khusus; pertahankan pembinaan rutin.'] : ['[Rekomendasi untuk periode berikutnya.]']) }, { t: 'petunjuk', x: AS.n ? CAT_USUL : '[Isi setelah data PKG tersedia.]' }, { t: 'spasi', n: 1 },
          { t: 'p', x: dot(c.kota, 'Kota') + ', ' + (c.tglCetak || '............................') },
          { t: 'ttd', kolom: [{ atas: 'Dilaporkan oleh,', jabatan: 'Kepala Madrasah', nama: c.kepala, nip: c.nip }] });
        return B;
      }
    }

    ,
    visi_misi: {
      judul: 'Visi, Misi, dan Tujuan Madrasah', angket: true, ringkas: 'Visi, misi, dan tujuan dari kartu isian, profil madrasah, indikator KPI, hasil angket (Kurikulum, Profil Lulusan, Keunggulan), dan dasar hukum terisi otomatis. Teks yang sama ikut terisi di RKJM, RKT, dan EDM.', jenisTa: 'ta', berkas: 'Visi-Misi-Tujuan',
      oto: function (c) { var P = profilTeks(c); return P.visi || P.misi.length || P.tujuan.length ? ('visi ' + (P.visi ? 'terisi' : 'kosong') + ', ' + P.misi.length + ' misi, ' + P.tujuan.length + ' tujuan') : 'belum ada isian; isi dulu di kartu Visi, Misi, dan Tujuan'; },
      bangun: function (c) {
        var VM = profilTeks(c), B = sampul(c, 'VISI, MISI, DAN TUJUAN MADRASAH', 'Tahun Ajaran ' + c.ta).concat(pengesahan(c));
        B.push({ t: 'h1', x: 'BAB I  DASAR' }, { t: 'h2', x: 'A. Dasar Hukum' });
        B = B.concat(hukumItems(c, 'visi_misi'));
        B.push({ t: 'h2', x: 'B. Kedudukan Visi, Misi, dan Tujuan' },
          { t: 'p', x: 'Perencanaan kegiatan pendidikan di satuan pendidikan berpedoman pada visi, misi, dan tujuan satuan pendidikan, serta disusun berdasarkan hasil evaluasi diri. Karena itu visi, misi, dan tujuan ' + dot(c.nama, 'madrasah') + ' menjadi acuan penyusunan Rencana Kerja Jangka Menengah (RKJM) empat tahunan dan Rencana Kerja Tahunan (RKT).' }, { t: 'br' });
        var rasio = (c.guru.length && c.siswaTotal) ? '1 : ' + Math.round(c.siswaTotal / c.guru.length) : '';
        B.push({ t: 'h1', x: 'BAB II  PROFIL SINGKAT MADRASAH' },
          { t: 'tabel', head: ['Data', 'Keterangan'], lebar: [35, 65], rows: [['Nama madrasah', c.nama], ['NSM / NPSN', dot(c.nsm, '') + ' / ' + dot(c.npsn, '')], ['Alamat', c.alamat], ['Kepala madrasah', c.kepala], ['Jumlah siswa', c.siswaTotal ? String(c.siswaTotal) : ''], ['Jumlah rombongan belajar', c.siswaKelas.length ? String(c.siswaKelas.length) : ''], ['Jumlah guru', c.guru.length ? String(c.guru.length) : ''], ['Rasio guru : siswa', rasio]] }, { t: 'br' });
        B.push({ t: 'h1', x: 'BAB III  VISI, MISI, DAN TUJUAN' }, { t: 'h2', x: 'A. Visi' },
          VM.visi ? { t: 'p', x: VM.visi } : { t: 'petunjuk', x: '[Isi visi di kartu Visi, Misi, dan Tujuan (tab Kerangka Dokumen), lalu unduh ulang. Visi yang baik singkat, jelas, dan menggambarkan keadaan madrasah yang dicita-citakan.]' },
          { t: 'h2', x: 'B. Misi' }, { t: 'daftar', nomor: true, items: VM.misi.length ? VM.misi : ['[Misi 1]', '[Misi 2]', '[Misi 3]'] },
          { t: 'h2', x: 'C. Tujuan' }, { t: 'daftar', nomor: true, items: VM.tujuan.length ? VM.tujuan : ['[Tujuan 1]', '[Tujuan 2]', '[Tujuan 3]'] }, { t: 'br' });
        var kr = c.kpi.length ? c.kpi.map(function (k) { return [k.nama, k.targetTeks, fpct(k.nilai), '']; }) : KPI_LINK.map(function (k) { return [k[1], '', '', '']; });
        B.push({ t: 'h1', x: 'BAB IV  KETERKAITAN DENGAN INDIKATOR' },
          { t: 'petunjuk', x: c.kpi.length ? '[Capaian diambil dari KPI Madrasah periode ' + c.kpiPeriode + '. Isi kolom tujuan terkait agar tiap tujuan punya indikator terukur.]' : '[Buka halaman KPI Madrasah lebih dulu agar capaian terisi otomatis.]' },
          { t: 'tabel', head: ['Indikator', 'Target', 'Capaian saat ini', 'Tujuan terkait'], lebar: [34, 16, 18, 32], rows: kr },
          { t: 'h2', x: 'Bidang perencanaan' }, { t: 'petunjuk', x: '[Hubungkan tiap bidang dengan misi yang mendasarinya.]' },
          { t: 'tabel', head: ['Bidang', 'Misi terkait', 'Program utama'], lebar: [30, 35, 35], rows: c.bidang.map(function (b) { return [b, '', '']; }) }, { t: 'br' });
        B = B.concat(buktiAngket(c));
        B.push({ t: 'br' });
        B.push({ t: 'h1', x: 'BAB VI  SOSIALISASI DAN PENINJAUAN' },
          { t: 'p', x: 'Visi, misi, dan tujuan disosialisasikan kepada guru, tenaga kependidikan, komite madrasah, dan orang tua, serta ditinjau bersama penyusunan RKJM setiap empat tahun atau bila ada perubahan kebijakan.' },
          { t: 'petunjuk', x: '[Tuliskan bentuk dan jadwal sosialisasi, misalnya rapat awal tahun dan pertemuan wali murid.]' });
        return B;
      }
    }
  };

  window.DOKKEP_DATA = { KELOMPOK: KELOMPOK, DOKUMEN: DOKUMEN, STATUS_DOK: STATUS_DOK, SIKLUS_LABEL: SIKLUS_LABEL, BIDANG: BIDANG, STATUS_RKT: STATUS_RKT, KPI_LINK: KPI_LINK, KERANGKA: KERANGKA, HUKUM: HUKUM, HUKUM_DOK: HUKUM_DOK, tglId: tglId };
})();
