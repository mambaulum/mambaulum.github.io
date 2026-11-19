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
    { id: 'visi_misi', kel: 0, nama: 'Visi, misi, dan tujuan madrasah', siklus: 48, ket: 'Ditinjau bersama penyusunan RKJM.' },
    { id: 'edm', kel: 0, nama: 'Laporan Evaluasi Diri Madrasah (EDM)', siklus: 12, ket: 'Dasar penyusunan RKJM dan RKT.' },
    { id: 'rkjm', kel: 0, nama: 'Rencana Kerja Jangka Menengah (RKJM)', siklus: 48, ket: 'Rencana 4 tahun.' },
    { id: 'rkt', kel: 0, nama: 'Rencana Kerja Tahunan (RKT)', siklus: 12, ket: 'Dijabarkan dari RKJM; dipantau di tab Pemantau RKT.' },
    { id: 'rkam', kel: 0, nama: 'Rencana Kegiatan dan Anggaran Madrasah (RKAM)', siklus: 12, ket: 'Anggaran tahunan yang selaras dengan RKT.' },
    { id: 'kalender', kel: 0, nama: 'Kalender pendidikan', siklus: 12, ket: 'Disusun sebelum tahun ajaran baru.' },
    { id: 'kom', kel: 1, nama: 'Dokumen kurikulum madrasah', siklus: 12, ket: 'Struktur kurikulum, muatan lokal, pengembangan diri.' },
    { id: 'prog_supervisi', kel: 1, nama: 'Program supervisi akademik', siklus: 12, ket: 'Jadwal dan instrumen supervisi kelas.' },
    { id: 'jadwal', kel: 1, nama: 'Pembagian tugas mengajar dan jadwal pelajaran', siklus: 12, ket: '' },
    { id: 'struktur', kel: 2, nama: 'Struktur organisasi madrasah', siklus: 12, ket: '' },
    { id: 'sk_tugas', kel: 2, nama: 'SK pembagian tugas guru dan tenaga kependidikan', siklus: 12, ket: 'Termasuk wali kelas dan pembina.' },
    { id: 'tatib', kel: 2, nama: 'Pedoman tata tertib guru, siswa, dan pegawai', siklus: 48, ket: '' },
    { id: 'sop', kel: 2, nama: 'SOP layanan madrasah', siklus: 24, ket: 'Pendaftaran, layanan administrasi, pengaduan, dll.' },
    { id: 'prog_kesiswaan', kel: 3, nama: 'Program kesiswaan dan ekstrakurikuler', siklus: 12, ket: '' },
    { id: 'prog_sarpras', kel: 3, nama: 'Program sarana dan prasarana', siklus: 12, ket: 'Pemeliharaan, pengadaan, inventaris.' },
    { id: 'prog_humas', kel: 3, nama: 'Program kemitraan dan hubungan masyarakat (komite)', siklus: 12, ket: '' },
    { id: 'lap_rkt', kel: 4, nama: 'Laporan pelaksanaan RKT', siklus: 12, ket: 'Kerangka tersedia di tab Kerangka Dokumen.' },
    { id: 'lap_keu', kel: 4, nama: 'Laporan realisasi anggaran (RKAM/BOS)', siklus: 12, ket: '' },
    { id: 'lap_supervisi', kel: 4, nama: 'Laporan hasil supervisi dan tindak lanjut', siklus: 12, ket: '' },
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

  var KERANGKA = {
    rkjm: {
      judul: 'Rencana Kerja Jangka Menengah (RKJM)', ringkas: 'Rencana 4 tahun: profil, hasil EDM, visi-misi, program strategis, pembiayaan, dan pemantauan.', jenisTa: 'periode',
      bangun: function (c) {
        var thn = c.periode.thn;
        var B = sampul(c, 'RENCANA KERJA JANGKA MENENGAH (RKJM)', 'Periode ' + c.periode.label).concat(pengesahan(c));
        B.push({ t: 'h1', x: 'BAB I  PENDAHULUAN' },
          { t: 'h2', x: 'A. Latar Belakang' }, { t: 'petunjuk', x: '[Uraikan kondisi madrasah, tantangan pendidikan di wilayah, dan alasan perlunya perencanaan 4 tahun.]' },
          { t: 'h2', x: 'B. Landasan Hukum' },
          { t: 'daftar', items: ['Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional.', 'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan (sebagaimana diubah dengan PP Nomor 4 Tahun 2022).', 'Peraturan Menteri Agama Nomor 90 Tahun 2013 tentang Penyelenggaraan Pendidikan Madrasah (diubah dengan PMA Nomor 60 Tahun 2015).', 'Keputusan Menteri Agama Nomor 184 Tahun 2019 tentang Pedoman Implementasi Kurikulum pada Madrasah.', '[Tambahkan regulasi Kemenag terbaru dan peraturan daerah yang berlaku.]'] },
          { t: 'petunjuk', x: '[Periksa kembali nomor, tahun, dan perubahan setiap regulasi sebelum dokumen disahkan.]' },
          { t: 'h2', x: 'C. Tujuan Penyusunan' }, { t: 'petunjuk', x: '[Tuliskan tujuan penyusunan RKJM.]' },
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
        B.push({ t: 'h1', x: 'BAB IV  VISI, MISI, DAN TUJUAN' },
          { t: 'h2', x: 'A. Visi' }, { t: 'petunjuk', x: '[Tuliskan visi madrasah.]' },
          { t: 'h2', x: 'B. Misi' }, { t: 'daftar', nomor: true, items: ['[Misi 1]', '[Misi 2]', '[Misi 3]'] },
          { t: 'h2', x: 'C. Tujuan dan Sasaran 4 Tahun' },
          { t: 'tabel', head: ['Tujuan', 'Indikator'].concat(thn.map(function (t) { return 'Target ' + t; })), lebar: [26, 24, 12.5, 12.5, 12.5, 12.5], kosong: 4 }, { t: 'br' });
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
          { t: 'h2', x: 'B. Tujuan' }, { t: 'petunjuk', x: '[Tuliskan tujuan penyusunan RKT.]' },
          { t: 'h2', x: 'C. Evaluasi Pelaksanaan RKT Tahun Sebelumnya' },
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
          { t: 'h2', x: 'B. Dasar dan Tujuan' }, { t: 'petunjuk', x: '[Rujuk RKT yang disahkan dan tujuan pelaporan.]' });
        var ringkas = c.program.length ? (function () {
          var n = { belum: 0, berjalan: 0, tercapai: 0, tidak: 0 }; c.program.forEach(function (p) { n[p.status] = (n[p.status] || 0) + 1; });
          return 'Dari ' + c.program.length + ' program: ' + n.tercapai + ' tercapai, ' + n.berjalan + ' berjalan, ' + n.belum + ' belum mulai, ' + n.tidak + ' tidak tercapai/ditunda.';
        })() : '';
        B.push({ t: 'h1', x: 'BAB II  CAPAIAN PROGRAM' });
        if (ringkas) B.push({ t: 'p', x: ringkas });
        B.push({ t: 'tabel', head: ['No', 'Bidang', 'Program/kegiatan', 'Target', 'Status', 'Progres', 'Keterangan'], lebar: [5, 15, 24, 14, 14, 8, 20],
          rows: nomor(c.program.map(function (p) { return [p.bidang, p.program, p.target || '', NS[p.status] || '', (p.progres == null ? '' : p.progres + '%'), p.catatan || '']; })), kosong: c.program.length ? 0 : 8 }, { t: 'br' });
        var kr = c.kpi.length ? c.kpi.map(function (k) { return [k.nama, k.targetTeks, fpct(k.nilai), k.statusTeks]; }) : KPI_LINK.map(function (k) { return [k[1], '', '', '']; });
        B.push({ t: 'h1', x: 'BAB III  CAPAIAN INDIKATOR KINERJA' },
          { t: 'petunjuk', x: c.kpi.length ? '[Nilai diambil dari KPI Madrasah periode ' + c.kpiPeriode + '. Untuk laporan akhir tahun, pilih periode Tahun Ajaran di halaman KPI lalu unduh ulang.]' : '[Buka halaman KPI Madrasah lebih dulu agar tabel ini terisi otomatis.]' },
          { t: 'tabel', head: ['Indikator', 'Target', 'Capaian', 'Status'], lebar: [40, 20, 20, 20], rows: kr },
          { t: 'h1', x: 'BAB IV  REALISASI ANGGARAN' },
          { t: 'tabel', head: ['Bidang', 'Anggaran (RKAM)', 'Realisasi', 'Sisa/selisih'], lebar: [34, 22, 22, 22], rows: c.bidang.map(function (b) { return [b, '', '', '']; }) },
          { t: 'h1', x: 'BAB V  FAKTOR PENDUKUNG DAN PENGHAMBAT' },
          { t: 'tabel', head: ['Faktor pendukung', 'Faktor penghambat'], lebar: [50, 50], kosong: 4 },
          { t: 'h1', x: 'BAB VI  TINDAK LANJUT DAN REKOMENDASI' },
          { t: 'tabel', head: ['No', 'Temuan/masalah', 'Tindak lanjut', 'Penanggung jawab', 'Waktu'], lebar: [6, 30, 30, 20, 14], rows: nomor([['', '', '', ''], ['', '', '', ''], ['', '', '', '']]) },
          { t: 'h1', x: 'BAB VII  PENUTUP' }, { t: 'petunjuk', x: '[Kesimpulan umum dan harapan untuk tahun ajaran berikutnya.]' }, { t: 'br' },
          { t: 'h1', x: 'LAMPIRAN' }, { t: 'daftar', items: ['Dokumentasi kegiatan', 'Notulen rapat evaluasi', 'Laporan realisasi anggaran', 'Dokumen pendukung lain'] });
        return B;
      }
    }
  };

  window.DOKKEP_DATA = { KELOMPOK: KELOMPOK, DOKUMEN: DOKUMEN, STATUS_DOK: STATUS_DOK, SIKLUS_LABEL: SIKLUS_LABEL, BIDANG: BIDANG, STATUS_RKT: STATUS_RKT, KPI_LINK: KPI_LINK, KERANGKA: KERANGKA, tglId: tglId };
})();
