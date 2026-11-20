// ============================================================
// AUDIT DOKUMEN KEPALA -- js/dokumen-kepala-audit.js  (dimuat SESUDAH js/dokumen-kepala.js)
// Tab "Audit": pemeriksaan otomatis berbasis aturan (tanpa AI) atas data yang sudah ada di aplikasi, ditambah pencatatan hasil EDM/SKPM
// dan daftar riwayat perubahan dokumen.
// Yang diperiksa: kelengkapan catatan dokumen, urutan antardokumen, mutu data RKT, kesiapan data guru/jadwal/kalender,
//                 keselarasan hasil EDM dengan RKT dan data aplikasi.
// Yang TIDAK bisa diperiksa aplikasi: isi/mutu dokumen, keaslian tanda tangan, dan isi tautan. Tab ini adalah audit kepatuhan data, bukan audit substansi.
// Penyimpanan: dokumen_kepala_v1/edm/{tahun} -> { jawaban: {A1:1-4,...}, status, skpm, upd, oleh }  dan  dokumen_kepala_v1/riwayat/{pushId} (ditulis dokumen-kepala.js).
// ============================================================
(function () {
  'use strict';
  var I = window.DokumenKepala && window.DokumenKepala._i;
  if (!I) { try { console.error('[dokumen-kepala-audit] dokumen-kepala.js belum dimuat'); } catch (e) {} return; }
  var S = I.S, esc = I.esc, DD = I.DD;
  var thn = null;   // tahun EDM yang sedang dibuka

  // ---------- struktur EDM / SKPM (bobot tiap indikator sesuai lampiran "Skor Kinerja Pencapaian Mutu" 2026) ----------
  var ASPEK = [
    { k: 'A', n: 'Kedisiplinan', bidang: 'Kesiswaan', ind: [['Perilaku religius siswa', 4], ['Kehadiran guru', 4], ['Supervisi pembelajaran', 3], ['Komunikasi efektif siswa', 4], ['Minat baca siswa', 3], ['Evaluasi kinerja pendidik & tendik', 3], ['Pertemuan rutin evaluasi diri', 3]] },
    { k: 'B', n: 'Pengembangan Diri', bidang: 'Ketenagaan (guru & tendik)', ind: [['Kepala madrasah ikut pengembangan diri', 3], ['Guru ikut KKG/MGMP/pelatihan', 4], ['Rencana peningkatan mutu guru', 4], ['Tendik ikut pelatihan', 3]] },
    { k: 'C', n: 'Proses Pembelajaran', bidang: 'Kurikulum & Pembelajaran', ind: [['Perangkat pembelajaran', 4], ['Metode pembelajaran', 4], ['Media pembelajaran', 3], ['Penilaian otentik', 3], ['Penilaian hasil belajar', 4], ['Pemanfaatan hasil penilaian', 4], ['Remedial dan pengayaan', 3]] },
    { k: 'D', n: 'Sarana dan Prasarana', bidang: 'Sarana & Prasarana', ind: [['Buku teks dan bacaan', 3], ['Media non-digital', 3], ['Media digital', 3], ['Guru memakai buku teks', 3], ['Siswa memakai buku teks', 3]] },
    { k: 'E', n: 'Pembiayaan', bidang: 'Keuangan & Pembiayaan', ind: [['EDM dan e-RKAM', 4], ['Bantuan biaya pengembangan', 3], ['Laporan keuangan ke orang tua', 3]] }
  ];
  var JML_IND = 26;
  // Jawaban EDM 2026 MIS Mambaul Ulum dari berkas "rangkuman-edm-111235090251-2026.pdf" (urutan A1..A7, B1..B4, C1..C7, D1..D5, E1..E3).
  var EDM2026 = [4, 3, 4, 3, 1, 4, 4, 3, 1, 1, 1, 4, 3, 3, 2, 1, 3, 2, 3, 2, 3, 4, 3, 4, 1, 3];
  // 71 sub kegiatan prioritas EDM 2026 (urutan = prioritas 1..71) dari lampiran "Usulan Prioritas Sub Kegiatan" pada rangkuman EDM.
  var PRIO2026 = [
    ['3.2.9', 'Pemanfaatan TIK untuk kegiatan pembelajaran'],
    ['3.2.1', 'Pelaksanaan Kegiatan Belajar Mengajar'],
    ['5.2.1', 'Penguatan Kapasitas Bagi Guru'],
    ['6.2.58', 'Penyediaan Media dan sumber pembelajaran'],
    ['4.3.1', 'Analisis Hasil Penilaian UH, Formatif, Sumatif, PAS, PAT'],
    ['3.2.2', 'Pelaksanaan Kegiatan Belajar Mengajar Digital Madrasah'],
    ['6.2.57', 'Penyediaan sarana prasarana digital madrasah'],
    ['2.1.1', 'Penyusunan Program Semester'],
    ['2.2.13', 'Penyusunan Modul Ajar'],
    ['5.1.2', 'Penguatan Kapasitas Bagi Kepala Madrasah'],
    ['5.1.3', 'Kegiatan KKG/MGMP'],
    ['5.3.2', 'Penguatan Kapasitas Bagi Tenaga Administrasi'],
    ['6.2.3', 'Penyediaan Sarana dan Prasarana Perpustakaan termasuk perpustakaan digital'],
    ['6.2.56', 'Penyediaan Media Pendidikan'],
    ['6.3.40', 'Penambahan daya internet'],
    ['6.3.43', 'Pengembangan dan Pemeliharaan Website'],
    ['6.3.44', 'Penambahan fasilitas elektronik untuk ketatausahaan'],
    ['7.1.11', 'Pengelolaan Madrasah Berbasis ICT/TIK'],
    ['7.1.6', 'Pelaksanaan Rapat Kerja madrasah'],
    ['7.4.7', 'Penyediaan sarana publikasi madrasah'],
    ['1.1.1', 'Pengembangan Kompetensi Beriman, Bertakwa pada Tuhan YME, dan Penguatan Moderasi Beragama'],
    ['1.1.2', 'Pengembangan Kompetensi berkarakter, jujur, dan peduli'],
    ['1.1.4', 'Pengembangan Kompetensi pembelajar sejati sepanjang hayat'],
    ['1.1.6', 'Pelaksanaan Tes Pengembangan Mutu Dimensi Sikap'],
    ['1.1.7', 'Pengembangan Kompetensi Dimensi Sikap Melalui Perlombaan dan Pertandingan'],
    ['2.1.12', 'Penyusunan Perangkat Pembelajaran'],
    ['2.1.2', 'Penyusunan Program Tahunan'],
    ['2.1.8', 'Penyusunan Program Pengelolaan Multimedia'],
    ['2.2.2', 'Penyusunan Dokumen 1 dan 2 serta review RPP semua mata pelajaran'],
    ['3.1.4', 'Penerimaan Peserta Didik Baru (PPDB)'],
    ['3.1.5', 'Masa Taaruf Siswa Madrasah'],
    ['3.2.11', 'Pelaksanaan Kegiatan Ekstrakurikuler'],
    ['3.2.5', 'Workshop Media Pembelajaran'],
    ['4.1.4', 'Penginputan data nilai siswa'],
    ['4.3.2', 'Perencanaan dan Pelaksanaan Tindak Lanjut Hasil Penilaian'],
    ['4.5.1', 'Pelaksanaan Penilaian/Ulangan Harian'],
    ['4.5.2', 'Pelaksanaan Penilaian/Ujian Tengah Semester'],
    ['4.5.3', 'Pelaksanaan Penilaian/Ujian Akhir Semester'],
    ['4.5.4', 'Pelaksanaan Penilaian/Ujian Kenaikan Kelas'],
    ['4.5.5', 'Pelaksanaan Ujian Madrasah'],
    ['4.5.6', 'Pelaksanaan Asesmen Nasional atau Sejenisnya'],
    ['5.2.2', 'Kegiatan KKKM/MKKM'],
    ['5.6.2', 'Penguatan Kapasitas Bagi Tenaga Kependidikan Lainnya'],
    ['6.2.17', 'Pemeliharaan perabot / meubelair'],
    ['6.2.2', 'Pembangunan Ruang Perpustakaan'],
    ['6.2.4', 'Pembangunan Ruang Media'],
    ['6.2.5', 'Pembangunan Toilet dan Sarana Sanitasi Air Bersih Madrasah'],
    ['6.2.54', 'Pembelian Alat dan Bahan Praktikum'],
    ['6.2.55', 'Pembelian Peralatan Madrasah Berkebutuhan Khusus'],
    ['6.2.6', 'Pembangunan Ruang Kepala madrasah/Guru/Tata Usaha/BP/BK'],
    ['6.2.8', 'Pemasangan/Pembuatan instalasi air baru dan/atau sumur'],
    ['6.3.15', 'Pemeliharaan taman, lapangan dan fasilitas olahraga'],
    ['6.3.19', 'Pemeliharaan Pagar'],
    ['6.3.33', 'Pemeliharaan dan Perbaikan Instalasi listrik (termasuk penggantian lampu)'],
    ['6.3.35', 'Pemeliharaan dan Perbaikan Fasilitas Internet'],
    ['6.3.6', 'Pembangunan Pos satpam'],
    ['7.1.12', 'Pengembangan Sistem Informasi Manajemen madrasah (SIM)'],
    ['7.1.7', 'Pembuatan Program Kerja madrasah'],
    ['7.1.8', 'Penyusunan Program RKJM/RPS/RKT/RAPBS/RKAM'],
    ['7.2.2', 'Pengadaan Sarana Administrasi Perkantoran'],
    ['7.2.4', 'Pengelolaan Inventaris Barang'],
    ['7.3.1', 'Penyusunan Program Supervisi, Monitoring dan Evaluasi'],
    ['7.3.7', 'Supervisi Administrasi Tata Usaha'],
    ['7.4.1', 'Sosialisasi Kebijakan-Kebijakan'],
    ['7.4.8', 'Pemutakhiran data EMIS Madrasah dan data madrasah lainnya'],
    ['8.2.1', 'Penyediaan Beban Operasional Madrasah (ATK, listrik, telp, air, keamanan, kebersihan, dll)'],
    ['8.2.2', 'Penyediaan Sarana dan Prasarana Operasional'],
    ['8.3.2', 'Penyusunan Laporan Biaya Operasional madrasah'],
    ['8.3.4', 'Penyusunan RKAM Madrasah'],
    ['8.3.5', 'Penyusunan Laporan Pertanggungjawaban dan Keuangan Madrasah'],
    ['8.3.7', 'Sosialisasi keuangan madrasah']
  ];
  // Daftar prioritas: hasil impor PDF yang tersimpan (edm/{tahun}/prioritas = ["kode|nama", ...]); jika belum ada, bawaan 2026.
  function prioritas(t) {
    var r = S.D && S.D.edm && S.D.edm[t], a = r && r.prioritas;
    if (a) {
      var l = (Array.isArray(a) ? a : Object.keys(a).map(function (k) { return a[k]; })).map(function (x) { x = String(x); var i = x.indexOf('|'); return [x.slice(0, i), x.slice(i + 1)]; }).filter(function (x) { return x[0] && x[1]; });
      if (l.length) return l;
    }
    return String(t) === '2026' ? PRIO2026 : [];
  }
  // Digit pertama kode = nomor standar (1 SKL, 2 SI, 3 Proses, 4 Penilaian, 5 PTK, 6 Sarana, 7 Pengelolaan, 8 Pembiayaan) -> bidang RKT.
  function bidangUntuk(k) {
    if (k === '1.1.1') return 'Keagamaan & Budaya Madrasah';
    if (/^(3\.1\.4|3\.1\.5|3\.2\.11)$/.test(k)) return 'Kesiswaan';
    if (/^(7\.4\.1|7\.4\.7)$/.test(k)) return 'Humas & Kemitraan';
    return { '1': 'Kesiswaan', '2': 'Kurikulum & Pembelajaran', '3': 'Kurikulum & Pembelajaran', '4': 'Kurikulum & Pembelajaran', '5': 'Ketenagaan (guru & tendik)', '6': 'Sarana & Prasarana', '7': 'Tata Usaha & Administrasi', '8': 'Keuangan & Pembiayaan' }[k.charAt(0)];
  }
  function norm(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  // Tercakup bila ada program RKT yang ditandai [EDM kode] (dibuat dari kartu ini) atau namanya sama/memuat nama sub kegiatan.
  function tercakup(x, prog) {
    return prog.some(function (p) {
      if (p.catatan && String(p.catatan).indexOf('[EDM ' + x[0] + ']') >= 0) return true;
      var a = norm(p.program), b = norm(x[1]); return !!a && !!b && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0);
    });
  }
  var semuaPrio = false;
  var RANK = { belum: 0, draf: 1, final: 2, disahkan: 3 };
  var LV = { kritis: ['Kritis', '#dc2626', 0], perhatian: ['Perlu perhatian', '#d97706', 1], saran: ['Saran', '#6b7280', 2] };

  function f1(v) { return v == null ? '-' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
  function kategori(v) { return v == null ? '-' : v <= 40 ? 'KURANG' : v <= 60 ? 'CUKUP' : v <= 80 ? 'BAIK' : 'SANGAT BAIK'; }
  function kode(a, i) { return a.k + (i + 1); }

  // SKPM: skor aspek = jumlah(tingkat x bobot) / (jumlah bobot x 4) x 100; nilai akhir = rata-rata sederhana lima aspek.
  function hitung(jw) {
    var terisi = 0, ada = 0, tot = 0, hasil = { aspek: [], terisi: 0, lengkap: false, total: null };
    ASPEK.forEach(function (a) {
      var sum = 0, bobot = 0, lengkap = true;
      a.ind.forEach(function (x, i) { var v = +(jw || {})[kode(a, i)]; bobot += x[1]; if (v >= 1 && v <= 4) { sum += v * x[1]; terisi++; } else lengkap = false; });
      var skor = lengkap ? sum / (bobot * 4) * 100 : null;
      if (skor != null) { ada++; tot += skor; }
      hasil.aspek.push({ k: a.k, n: a.n, bidang: a.bidang, skor: skor, kat: kategori(skor) });
    });
    hasil.terisi = terisi; hasil.lengkap = terisi === JML_IND; hasil.total = ada === ASPEK.length ? tot / ASPEK.length : null;
    return hasil;
  }

  // ---------- mesin pemeriksaan ----------
  function ringkas(arr, fn) { var n = arr.slice(0, 3).map(fn).join(', '); return n + (arr.length > 3 ? ', dan ' + (arr.length - 3) + ' lainnya' : ''); }
  function jalankan() {
    var T = [], y = I.taAktif(), label = I.taLabel(y), today = I.hariIni(), D = S.D || {};
    function add(lv, grup, t, tab) { T.push({ lv: lv, grup: grup, t: t, tab: tab || 'dokumen' }); }
    var defs = I.semuaDefinisi(), byId = {};
    defs.forEach(function (d) { byId[d.id] = I.rekam(d); });
    function rank(id) { return RANK[(byId[id] || {}).status || 'belum'] || 0; }

    // 1) kelengkapan catatan dokumen
    defs.forEach(function (d) {
      var r = I.rekam(d), st = r.status || 'belum', pg = I.pengingat(d, r);
      if (st === 'belum') { if (pg && pg.lv === 'segera') add('saran', 'Dokumen', d.nama + ': ' + pg.t + '.'); return; }
      if ((st === 'final' || st === 'disahkan') && !r.link) add('perhatian', 'Dokumen', d.nama + ': berstatus ' + st + ' tetapi belum ada tautan dokumen.');
      if (!r.tgl) add('perhatian', 'Dokumen', d.nama + ': tanggal penyusunan kosong, pengingat revisi tidak aktif.');
      if (r.tgl && r.tgl > today) add('perhatian', 'Dokumen', d.nama + ': tanggal penyusunan (' + I.tglId(r.tgl) + ') ada di masa depan.');
      if (r.tglSah && r.tglSah > today) add('perhatian', 'Dokumen', d.nama + ': tanggal pengesahan (' + I.tglId(r.tglSah) + ') ada di masa depan.');
      if (r.tglSah && r.tgl && r.tglSah < r.tgl) add('kritis', 'Dokumen', d.nama + ': tanggal pengesahan lebih awal daripada tanggal penyusunan.');
      if (pg && pg.lv === 'lewat') add('perhatian', 'Dokumen', d.nama + ': ' + pg.t + '.');
    });

    // 2) urutan antardokumen (anak tidak boleh disahkan lebih dulu daripada induknya)
    [['rkt', 'rkjm', 'RKT', 'RKJM'], ['rkam', 'rkt', 'RKAM', 'RKT'], ['lap_rkt', 'rkt', 'Laporan RKT', 'RKT']].forEach(function (p) {
      var a = byId[p[0]] || {}, b = byId[p[1]] || {};
      if (a.status === 'disahkan' && rank(p[1]) < 3) add('kritis', 'Urutan dokumen', p[2] + ' berstatus Disahkan padahal ' + p[3] + ' belum disahkan.');
      else if (a.tglSah && b.tglSah && a.tglSah < b.tglSah) add('perhatian', 'Urutan dokumen', p[2] + ' disahkan (' + I.tglId(a.tglSah) + ') lebih dulu daripada ' + p[3] + ' (' + I.tglId(b.tglSah) + ').');
    });

    // 3) mutu data RKT tahun ajaran berjalan
    var prog = I.daftarProgram(label), snap = I.kpiSnap();
    if (!prog.length) add('perhatian', 'RKT', 'Belum ada program RKT untuk tahun ajaran ' + label + '.', 'rkt');
    else {
      var nm = function (p) { return '“' + (p.program || '(tanpa nama)') + '”'; };
      [['pj', 'tanpa penanggung jawab'], ['tenggat', 'tanpa tenggat'], ['target', 'tanpa target']].forEach(function (c) {
        var l = prog.filter(function (p) { return !p[c[0]]; });
        if (l.length) add('perhatian', 'RKT', l.length + ' program ' + c[1] + ': ' + ringkas(l, nm) + '.', 'rkt');
      });
      var tl = prog.filter(I.terlambat); if (tl.length) add('perhatian', 'RKT', tl.length + ' program lewat tenggat tetapi belum tercapai: ' + ringkas(tl, nm) + '.', 'rkt');
      var tp = prog.filter(function (p) { return p.status === 'tercapai' && (+p.progres || 0) < 100; });
      if (tp.length) add('perhatian', 'RKT', tp.length + ' program berstatus Tercapai tetapi progres kurang dari 100%: ' + ringkas(tp, nm) + '.', 'rkt');
      var kp = prog.filter(function (p) { var it = p.kpi && snap && snap.items && snap.items[p.kpi]; var g = it ? I.kpiProgres(it) : null; return p.status === 'tercapai' && g != null && g < 100; });
      if (kp.length) add('perhatian', 'RKT vs KPI', kp.length + ' program berstatus Tercapai padahal KPI terhubung belum memenuhi target: ' + ringkas(kp, nm) + '.', 'rkt');
      var kosong = DD.BIDANG.filter(function (b) { return !prog.some(function (p) { return p.bidang === b; }); });
      if (kosong.length) add('saran', 'RKT', 'Bidang tanpa program: ' + kosong.join(', ') + '.', 'rkt');
    }

    // 4) kesiapan data sumber untuk SK tugas, jadwal, dan kalender
    var X = I.dataSekolah(y);
    if (!X.guru.length && !X.jadwal.length) add('saran', 'Data sumber', 'Data guru dan jadwal belum termuat atau kosong; pemeriksaan data sumber dilewati.');
    else {
      var tj = X.guru.filter(function (g) { return !g.jam && !g.wali; });
      if (tj.length) add('saran', 'Data sumber', tj.length + ' guru tanpa jadwal mengajar dan bukan wali kelas: ' + ringkas(tj, function (g) { return g.nama; }) + '.');
      var tw = X.siswaKelas.filter(function (k) { return !k.wali; });
      if (tw.length) add('perhatian', 'Data sumber', 'Kelas tanpa wali kelas: ' + tw.map(function (k) { return k.kelas; }).join(', ') + '.');
      var ks = X.siswaKelas.map(function (k) { return k.kelas; }), tk = X.kelasJadwal.filter(function (k) { return ks.indexOf(k.kelas) < 0; });
      if (X.siswaKelas.length && tk.length) add('saran', 'Data sumber', 'Kelas ada di jadwal tetapi tidak punya siswa: ' + tk.map(function (k) { return k.kelas; }).join(', ') + '.');
      var cnt = {}, bentrok = 0;
      X.jadwal.forEach(function (j) { var k = (j.guruKey || j.guru || '') + '|' + j.hari + '|' + j.jam; if (!j.guruKey && !j.guru) return; cnt[k] = (cnt[k] || 0) + 1; if (cnt[k] === 2) bentrok++; });
      if (bentrok) add('perhatian', 'Data sumber', bentrok + ' slot jadwal bentrok (guru yang sama mengajar dua kelas pada hari dan jam yang sama).');
      if (!X.kalender.length) add('perhatian', 'Data sumber', 'Kalender akademik tahun ajaran ' + label + ' kosong; kerangka Kalender Pendidikan tidak bisa terisi.');
    }

    // 5) EDM / SKPM
    var t0 = thn || String(today.slice(0, 4)), rec = (D.edm || {})[t0];
    if (!rec) add('perhatian', 'EDM', 'Belum ada hasil EDM ' + t0 + ' yang dicatat; pemeriksaan keselarasan EDM dilewati.', 'audit');
    else {
      var jw = rec.jawaban || {}, H = hitung(jw), edm = byId.edm || {};
      if (!H.lengkap) add('perhatian', 'EDM', 'Jawaban EDM ' + t0 + ' baru ' + H.terisi + ' dari ' + JML_IND + ' indikator.', 'audit');
      if (H.lengkap && rec.skpm != null && rec.skpm !== '' && Math.abs(H.total - +rec.skpm) > 0.1) add('kritis', 'EDM', 'SKPM hasil hitungan (' + f1(H.total) + ') berbeda dari nilai resmi (' + f1(+rec.skpm) + '); periksa jawaban yang dicatat.', 'audit');
      if (rec.status !== 'disetujui') {
        if (edm.status === 'disahkan') add('kritis', 'EDM', 'Dokumen EDM berstatus Disahkan di daftar, padahal EDM ' + t0 + ' masih berstatus belum disetujui.');
        else add('saran', 'EDM', 'EDM ' + t0 + ' masih berstatus belum disetujui.', 'audit');
      }
      H.aspek.forEach(function (a) {
        if (a.skor == null || a.skor > 60) return;
        if (!prog.some(function (p) { return p.bidang === a.bidang; })) add(a.skor <= 40 ? 'kritis' : 'perhatian', 'EDM vs RKT', 'Aspek ' + a.n + ' pada EDM berkategori ' + a.kat + ' (' + f1(a.skor) + '), tetapi RKT ' + label + ' belum punya program di bidang ' + a.bidang + '.', 'rkt');
      });
      var lv = function (c) { return +jw[c] || 0; };
      var kpi = function (key) { var it = snap && snap.items && snap.items[key]; return it && it.nilai != null ? it.nilai : null; };
      var infaq = kpi('pInfaq'), guruH = kpi('pHadirGuru');
      if (lv('A1') >= 4 && infaq != null && infaq < 90) add('perhatian', 'EDM vs data', 'EDM A.1 menyatakan 90–100% siswa rutin beribadah (termasuk infaq), tetapi KPI infaq lunas ' + f1(infaq) + '%.');
      if (lv('A2') >= 3 && guruH != null && guruH < 95) add('perhatian', 'EDM vs data', 'EDM A.2 menyatakan kehadiran guru 95–100%, tetapi KPI kehadiran guru ' + f1(guruH) + '%.');
      if (lv('A3') >= 3 && rank('lap_supervisi') < 2) add('perhatian', 'EDM vs data', 'EDM A.3 menyatakan supervisi dan tindak lanjutnya dilaksanakan, tetapi laporan supervisi belum Final/Disahkan di daftar dokumen.');
      if (lv('E1') >= 4 && rank('rkam') < 3) add('perhatian', 'EDM vs data', 'EDM E.1 menyatakan RKAM disahkan kepala madrasah, tetapi RKAM belum berstatus Disahkan di daftar dokumen.');
      if (lv('E3') >= 3 && rank('lap_keu') < 2) add('perhatian', 'EDM vs data', 'EDM E.3 menyatakan laporan keuangan telah dibuat, tetapi laporan realisasi anggaran belum Final/Disahkan di daftar dokumen.');
    }
    var pri = prioritas(t0);
    if (pri.length && rec) {
      var blm = pri.slice(0, 10).filter(function (x) { return !tercakup(x, prog); });
      if (blm.length) add('saran', 'EDM vs RKT', blm.length + ' dari 10 sub kegiatan prioritas teratas EDM belum ada di RKT ' + label + ': ' + ringkas(blm, function (x) { return '“' + x[1] + '”'; }) + '.', 'audit');
    }
    T.sort(function (a, b) { return LV[a.lv][2] - LV[b.lv][2]; });
    return T;
  }

  // ---------- impor PDF rangkuman EDM ----------
  // parseEdm menerima teks per halaman (hasil pdf.js getTextContent). Jawaban tiap indikator tidak dibaca dari kolomnya, melainkan dihitung dari
  // pasangan "bobot skor" di ujung baris: skor = tingkat x bobot, dan bobot harus sama dengan bobot yang diharapkan indikator itu.
  var RX_IND = /^[A-E]\.\d$/, RX_KODE = /^\d\.\d\.\d{1,2}$/, RX_INT = /^\d{1,3}$/;
  function cariUrut(T, kata, dari) {
    for (var i = dari || 0; i + kata.length <= T.length; i++) { var ok = true; for (var j = 0; j < kata.length; j++) if (T[i + j] !== kata[j]) { ok = false; break; } if (ok) return i; }
    return -1;
  }
  function parseEdm(halaman) {
    var T = [], out = { jawaban: {}, prioritas: [], peringatan: [] };
    halaman.forEach(function (h) { h.forEach(function (x) { String(x).split(/\s+/).forEach(function (w) { if (w) T.push(w); }); }); });
    var teks = T.join(' '), m = /Skor Kinerja Pencapaian Mutu (\d{4})/.exec(teks);
    out.tahun = m ? m[1] : null;
    m = /Nilai SKPM\s*:?\s*(\d+(?:[.,]\d+)?)/.exec(teks); out.skpm = m ? parseFloat(m[1].replace(',', '.')) : null;
    out.belumDisetujui = /Belum Disetujui/.test(teks);
    var iDet = cariUrut(T, ['Lampiran', 'Detil', 'Indikator:']), iUs = cariUrut(T, ['Lampiran', 'Usulan', 'Prioritas'], iDet < 0 ? 0 : iDet);
    if (iDet < 0) { out.peringatan.push('Bagian "Lampiran Detil Indikator" tidak ditemukan; PDF ini mungkin bukan rangkuman EDM.'); return out; }
    // --- indikator ---
    var D = T.slice(iDet, iUs < 0 ? T.length : iUs), bobot = {};
    ASPEK.forEach(function (a) { a.ind.forEach(function (x, i) { bobot[a.k + '.' + (i + 1)] = [kode(a, i), x[1]]; }); });
    var pos = []; D.forEach(function (w, i) { if (RX_IND.test(w) && bobot[w]) pos.push(i); });
    pos.forEach(function (at, n) {
      var kd = D[at], blok = D.slice(at + 1, n + 1 < pos.length ? pos[n + 1] : D.length), b = bobot[kd][1], j = 0;
      for (var p = blok.length - 2; p >= 0 && !j; p--) {
        if (RX_INT.test(blok[p]) && RX_INT.test(blok[p + 1]) && +blok[p] === b) { var sk = +blok[p + 1]; if (sk % b === 0 && sk / b >= 1 && sk / b <= 4) j = sk / b; }
      }
      if (j) out.jawaban[bobot[kd][0]] = j; else out.peringatan.push('Indikator ' + kd + ' tidak terbaca.');
    });
    // --- prioritas sub kegiatan ---
    if (iUs >= 0) {
      var P = [], U = T.slice(iUs), HDR = ['Prioritas', 'Kode', 'Sub', 'Kegiatan', 'Nama', 'Sub', 'Kegiatan', 'SNP'];
      for (var i = 0; i < U.length; i++) {
        if (U[i] === 'Belum' && U[i + 1] === 'Disetujui') { i++; continue; }
        if (U[i] === 'Prioritas' && cariUrut(U.slice(i, i + 8), HDR) === 0) { i += 7; continue; }
        P.push(U[i]);
      }
      var k0 = 0; while (k0 < P.length && !(P[k0] === '1' && RX_KODE.test(P[k0 + 1] || ''))) k0++;
      var nn = 1, q = k0;
      while (q < P.length && P[q] === String(nn) && RX_KODE.test(P[q + 1] || '')) {
        var kd2 = P[q + 1], r = q + 2, nama = [];
        while (r < P.length && P[r] !== 'PENGEMBANGAN') { nama.push(P[r]); r++; }
        var z = r; while (z < P.length && !(P[z] === String(nn + 1) && RX_KODE.test(P[z + 1] || ''))) z++;
        if (nama.length) out.prioritas.push([kd2, nama.join(' ').replace(/(\S)([\/-])\s+/g, '$1$2')]);   // "KKG/ MGMP" -> "KKG/MGMP", "Kebijakan- Kebijakan" -> "Kebijakan-Kebijakan" (pemisah kata di PDF)
        nn++; q = z;
      }
      if (!out.prioritas.length) out.peringatan.push('Daftar prioritas sub kegiatan tidak terbaca.');
    }
    return out;
  }
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  function muatPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (ok, gagal) {
      var sc = document.createElement('script'); sc.src = PDFJS + 'pdf.min.js'; sc.async = true;
      var t = setTimeout(function () { sc.remove(); gagal(new Error('Waktu habis memuat pembaca PDF.')); }, 45000);
      sc.onload = function () { clearTimeout(t); if (window.pdfjsLib) ok(window.pdfjsLib); else gagal(new Error('Pembaca PDF tidak siap.')); };
      sc.onerror = function () { clearTimeout(t); sc.remove(); gagal(new Error('Gagal memuat pembaca PDF. Periksa koneksi internet.')); };
      document.head.appendChild(sc);
    }).then(function (lib) {   // worker dari CDN lain-origin tidak boleh dibuat langsung: ambil sebagai blob
      return fetch(PDFJS + 'pdf.worker.min.js').then(function (r) { if (!r.ok) throw new Error('worker'); return r.blob(); })
        .then(function (b) { lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(b); return lib; })
        .catch(function () { lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; return lib; });
    });
  }
  function bacaPdf(file) {
    return Promise.all([muatPdfJs(), file.arrayBuffer()]).then(function (r) { return r[0].getDocument({ data: r[1] }).promise; }).then(function (doc) {
      var ps = []; for (var i = 1; i <= doc.numPages; i++) ps.push(doc.getPage(i).then(function (pg) { return pg.getTextContent(); }).then(function (c) { return c.items.map(function (x) { return x.str; }); }));
      return Promise.all(ps);
    });
  }
  var impor = null;   // hasil impor PDF yang belum disimpan: { tahun, prioritas }

  // ---------- tampilan ----------
  function chip(lv) { return '<span class="dk-chip" style="background:' + LV[lv][1] + ';">' + LV[lv][0] + '</span>'; }
  function htmlEdm(T0) {
    var y = +I.hariIni().slice(0, 4); thn = thn || String(y);
    var rec = (S.D.edm || {})[thn] || {}, jw = rec.jawaban || {}, H = hitung(jw);
    var h = '<div class="dk-h">Hasil EDM / SKPM <small>dicatat manual dari rangkuman EDM</small></div><div class="dk-ker">' +
      '<div class="dk-ctl"><label>Tahun EDM<select id="dkAudThn" class="dk-in">' + [y - 1, y].map(function (t) { return '<option value="' + t + '"' + (String(t) === thn ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label></div>';
    if (H.terisi) {
      h += '<table style="width:100%;font-size:13px;margin-top:8px;border-collapse:collapse;"><tbody>' + H.aspek.map(function (a) { return '<tr><td style="padding:2px 0;">' + a.k + '. ' + esc(a.n) + '</td><td style="text-align:right;">' + f1(a.skor) + '</td><td style="text-align:right;padding-left:10px;">' + a.kat + '</td></tr>'; }).join('') +
        '<tr><td style="padding-top:6px;"><b>Nilai SKPM</b></td><td style="text-align:right;padding-top:6px;"><b>' + f1(H.total) + '</b></td><td style="text-align:right;padding-left:10px;padding-top:6px;"><b>' + kategori(H.total) + '</b></td></tr></tbody></table>';
    } else h += '<p class="text-muted" style="font-size:12px;">Belum ada jawaban untuk tahun ini.</p>';
    h += '<details style="margin-top:8px;"' + (H.terisi ? '' : ' open') + '><summary>Isi atau ubah jawaban (' + JML_IND + ' indikator, tingkat 1–4)</summary>';
    ASPEK.forEach(function (a) {
      h += '<div style="font-size:12px;font-weight:700;margin:8px 0 2px;">' + a.k + '. ' + esc(a.n) + '</div><div class="dk-2">' + a.ind.map(function (x, i) {
        var c = kode(a, i), v = +jw[c] || 0;
        return '<label class="dk-f">' + c + ' ' + esc(x[0]) + ' (bobot ' + x[1] + ')<select class="dk-in" data-aj="' + c + '"><option value="">-</option>' + [1, 2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (n === v ? ' selected' : '') + '>Tingkat ' + n + '</option>'; }).join('') + '</select></label>';
      }).join('') + '</div>';
    });
    h += '<div class="dk-2" style="margin-top:8px;"><label class="dk-f">Status persetujuan EDM<select id="dkAudStatus" class="dk-in"><option value="belum"' + (rec.status !== 'disetujui' ? ' selected' : '') + '>Belum disetujui</option><option value="disetujui"' + (rec.status === 'disetujui' ? ' selected' : '') + '>Disetujui</option></select></label>' +
      '<label class="dk-f">Nilai SKPM resmi (opsional, untuk verifikasi)<input id="dkAudSkpm" type="number" step="0.1" min="0" max="100" class="dk-in" value="' + (rec.skpm != null ? esc(rec.skpm) : '') + '"></label></div>' +
      '<div class="dk-ctl"><label class="btn btn-soft" style="cursor:pointer;">Impor dari PDF rangkuman EDM<input type="file" id="dkAudPdf" accept="application/pdf,.pdf" style="display:none;"></label></div><div class="dk-ket" id="dkAudPdfInfo"></div>' +
      '<div class="dk-ctl"><button type="button" class="btn btn-primary" id="dkAudSimpan">Simpan hasil EDM</button>' + (thn === '2026' ? '<button type="button" class="btn btn-soft" id="dkAudIsi2026">Isi dari rangkuman EDM 2026 (PDF)</button>' : '') + '</div></details></div>';
    return h;
  }
  function htmlPrioritas() {
    var pri = prioritas(thn), h = '<div class="dk-h">Prioritas sub kegiatan EDM <small>untuk RKT / RKAM</small></div>';
    if (!pri.length) return h + '<p class="text-muted" style="font-size:12px;">Belum ada daftar prioritas untuk EDM ' + esc(thn) + '. Impor PDF rangkuman EDM tahun ini (di bagian Hasil EDM) untuk mengisinya.</p>';
    var prog = I.daftarProgram(I.taLabel(I.taAktif())), blm = [], n = 0;
    pri.forEach(function (x, i) { var ok = tercakup(x, prog); if (ok) n++; else if (i < 10) blm.push(x[0]); });
    h += '<div class="dk-ket">' + n + ' dari ' + pri.length + ' sub kegiatan sudah tercakup di RKT ' + esc(I.taLabel(I.taAktif())) + '. Pencocokan memakai nama program (atau penanda [EDM kode] pada catatan).</div>';
    if (blm.length) h += '<div class="dk-ctl"><button type="button" class="btn btn-primary" id="dkAudPrioBatch" data-kode="' + blm.join(',') + '">Tambahkan ' + blm.length + ' prioritas teratas yang belum tercakup</button></div>';
    (semuaPrio ? pri : pri.slice(0, 15)).forEach(function (x) {
      var no = pri.indexOf(x) + 1, ok = tercakup(x, prog);
      h += '<div class="dk-row" style="padding:6px 10px;"><div style="font-size:13px;"><b>' + no + '.</b> ' + esc(x[1]) + '</div><div class="dk-ket" style="margin:0;">' + esc(x[0]) + ' · bidang ' + esc(bidangUntuk(x[0])) + '</div><div style="margin-top:4px;">' +
        (ok ? '<span class="dk-chip" style="background:#059669;">Sudah di RKT</span>' : '<button type="button" class="btn btn-soft" data-audprio="' + esc(x[0]) + '">Jadikan program RKT</button>') + '</div></div>';
    });
    return h + '<div class="dk-ctl"><button type="button" class="btn btn-soft" id="dkAudPrioSemua">' + (semuaPrio ? 'Tampilkan 15 teratas' : 'Tampilkan semua (' + pri.length + ')') + '</button></div>';
  }
  function htmlRiwayat() {
    var R = S.D.riwayat || {}, a = Object.keys(R).map(function (k) { return R[k]; }).filter(function (x) { return x && x.t; }).sort(function (p, q) { return q.t - p.t; }).slice(0, 25);
    var NM = { status: 'status', tgl: 'tgl. penyusunan', tglSah: 'tgl. pengesahan', link: 'tautan' };
    var h = '<div class="dk-h">Riwayat perubahan dokumen <small>25 terbaru</small></div>';
    if (!a.length) return h + '<p class="text-muted" style="font-size:12px;">Belum ada riwayat. Perubahan status, tanggal, dan tautan dokumen mulai dicatat sejak versi ini.</p>';
    return h + a.map(function (x) {
      var d = new Date(x.t), ts = I.hariIni && d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      var ub = Object.keys(x.ubah || {}).map(function (f) { var v = x.ubah[f] || []; return (NM[f] || f) + ': ' + (v[0] || '(kosong)') + ' → ' + (v[1] || '(kosong)'); }).join('; ');
      return '<div class="dk-row" style="padding:6px 10px;"><b style="font-size:13px;">' + esc(x.nama || x.dok) + '</b><div class="dk-ket" style="margin:0;">' + esc(ts) + ' oleh ' + esc(x.oleh || '-') + '</div><div style="font-size:12px;">' + esc(ub) + '</div></div>';
    }).join('');
  }
  function html() {
    var T = jalankan(), n = { kritis: 0, perhatian: 0, saran: 0 };
    T.forEach(function (x) { n[x.lv]++; });
    var skor = Math.max(0, 100 - 12 * n.kritis - 5 * n.perhatian - n.saran);
    var h = '<div class="dk-sum">' + [['Skor audit', skor, skor >= 80 ? '#059669' : skor >= 60 ? '#d97706' : '#dc2626'], ['Kritis', n.kritis, LV.kritis[1]], ['Perlu perhatian', n.perhatian, LV.perhatian[1]], ['Saran', n.saran, LV.saran[1]]].map(function (x) {
      return '<div class="dk-box"><div class="n" style="color:' + x[2] + ';">' + x[1] + '</div><div class="l">' + x[0] + '</div></div>'; }).join('') + '</div>' +
      '<div class="dk-bar-tool"><span style="font-size:12px;">Pemeriksaan otomatis atas data yang tercatat di aplikasi. Isi dokumen, keaslian pengesahan, dan isi tautan tidak bisa diperiksa di sini.</span><span class="sp"></span><button type="button" class="btn btn-soft" id="dkAudCsv">Unduh CSV</button></div>';
    if (!T.length) h += '<p class="text-muted">Tidak ada temuan.</p>';
    T.forEach(function (x) {
      h += '<div class="dk-row"><div class="dk-top">' + chip(x.lv) + '<span class="dk-chip s">' + esc(x.grup) + '</span></div><div style="font-size:13px;margin-top:4px;">' + esc(x.t) + '</div>' +
        (x.tab !== 'audit' ? '<div style="margin-top:4px;"><button type="button" class="btn btn-soft" data-audtab="' + x.tab + '">Buka ' + (x.tab === 'rkt' ? 'Pemantau RKT' : 'Daftar Dokumen') + '</button></div>' : '') + '</div>';
    });
    return h + htmlEdm() + htmlPrioritas() + htmlRiwayat();
  }

  // ---------- aksi ----------
  function simpanEdm() {
    var jw = {}, a, ada = 0;
    Array.prototype.forEach.call(document.querySelectorAll('#page-dokumen-kepala [data-aj]'), function (s) { if (s.value) { jw[s.getAttribute('data-aj')] = +s.value; ada++; } });
    if (!ada) { I.pesan('Isi minimal satu jawaban.', true); return; }
    var rec = { jawaban: jw, status: document.getElementById('dkAudStatus').value === 'disetujui' ? 'disetujui' : 'belum', upd: Date.now(), oleh: I.namaPengguna() };
    a = parseFloat(document.getElementById('dkAudSkpm').value); if (isFinite(a)) rec.skpm = a;
    if (impor && impor.tahun === thn && impor.prioritas.length) rec.prioritas = impor.prioritas.map(function (x) { return x[0] + '|' + x[1]; });
    I.tulis('edm/' + thn, rec, function (e) {
      if (e) { I.galatTulis(e); return; }
      try { if (typeof addLog === 'function') addLog('dokumen_kepala_ubah', 'EDM ' + thn + ' dicatat (' + ada + ' indikator)'); } catch (x) {}
      impor = null; I.pesan('Hasil EDM disimpan.'); I.segar();
    });
  }
  function isi() {
    var i = 0;
    ASPEK.forEach(function (a) { a.ind.forEach(function (x, j) { var s = document.querySelector('[data-aj="' + kode(a, j) + '"]'); if (s) s.value = String(EDM2026[i]); i++; }); });
    var k = document.getElementById('dkAudSkpm'); if (k) k.value = '65.6';
    var st = document.getElementById('dkAudStatus'); if (st) st.value = 'belum';
    I.pesan('Terisi dari rangkuman EDM 2026. Periksa, lalu tekan Simpan.');
  }
  function isiForm(jw, skpm, belum) {
    Object.keys(jw).forEach(function (c) { var el = document.querySelector('[data-aj="' + c + '"]'); if (el) el.value = String(jw[c]); });
    var k = document.getElementById('dkAudSkpm'); if (k && skpm != null) k.value = String(skpm);
    var st = document.getElementById('dkAudStatus'); if (st && belum) st.value = 'belum';
  }
  function imporPdf(file) {
    var info = document.getElementById('dkAudPdfInfo'); if (info) info.textContent = 'Membaca PDF…';
    bacaPdf(file).then(function (hal) {
      var o = parseEdm(hal), n = Object.keys(o.jawaban).length, msg = [];
      if (o.tahun && o.tahun !== thn) { msg.push('PDF ini EDM ' + o.tahun + ', sedangkan tahun yang dibuka ' + thn + '. Pilih tahun ' + o.tahun + ' dulu, lalu impor lagi.'); }
      else {
        isiForm(o.jawaban, o.skpm, o.belumDisetujui);
        var H = hitung(o.jawaban);
        msg.push('Terbaca ' + n + ' dari ' + JML_IND + ' indikator dan ' + o.prioritas.length + ' sub kegiatan prioritas.');
        if (H.total != null && o.skpm != null) msg.push(Math.abs(H.total - o.skpm) <= 0.1 ? 'SKPM hasil hitungan ' + f1(H.total) + ' cocok dengan yang tertulis di PDF (' + f1(o.skpm) + ').' : 'PERHATIAN: SKPM hitungan ' + f1(H.total) + ' tidak sama dengan yang tertulis di PDF (' + f1(o.skpm) + '). Periksa jawaban sebelum menyimpan.');
        if (o.belumDisetujui) msg.push('PDF bertanda "Belum Disetujui".'); else msg.push('Status persetujuan tidak terbaca; periksa isian status.');
        o.peringatan.forEach(function (x) { msg.push(x); });
        impor = { tahun: thn, prioritas: o.prioritas };
        msg.push('Periksa isiannya, lalu tekan Simpan hasil EDM.');
      }
      var inf = document.getElementById('dkAudPdfInfo'); if (inf) inf.textContent = msg.join(' ');
    }).catch(function (e) {
      var inf = document.getElementById('dkAudPdfInfo'); if (inf) inf.textContent = 'Gagal membaca PDF: ' + (e && e.message ? e.message : e) + ' Gunakan isian manual.';
    });
  }
  function tambahPrio(daftar) {
    var label = I.taLabel(I.taAktif()), pri = prioritas(thn), n = 0, gagal = false;
    var ada = daftar.filter(function (kd) { return pri.some(function (x) { return x[0] === kd; }); }), sisa = ada.length;
    ada.forEach(function (kd) {
      var i = -1; pri.forEach(function (x, j) { if (x[0] === kd) i = j; });
      var x = pri[i];
      I.tambahProgramRkt(label, { bidang: bidangUntuk(x[0]), program: x[1].slice(0, 120), status: 'belum', progres: 0, catatan: ('[EDM ' + x[0] + '] Prioritas EDM ' + thn + ' no. ' + (i + 1)).slice(0, 500) }, function (e) {
        if (e) { if (!gagal) { gagal = true; I.galatTulis(e); } } else n++;
        if (--sisa === 0 && !gagal) { I.pesan(n + ' program ditambahkan ke RKT ' + label + '. Lengkapi penanggung jawab, target, dan tenggatnya di Pemantau RKT.'); I.segar(); }
      });
    });
  }
  function unduhCsv() {
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['Audit Dokumen Kepala Madrasah', I.hariIni()], [], ['Tingkat', 'Kelompok', 'Temuan']].concat(jalankan().map(function (x) { return [LV[x.lv][0], x.grup, x.t]; }));
    I.unduh(new Blob(['﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'audit-dokumen-kepala_' + I.hariIni() + '.csv');
  }
  function pasang() {
    var pg = document.getElementById('page-dokumen-kepala'); if (!pg) return;
    pg.addEventListener('click', function (ev) {
      var t = ev.target, b; if (!t || !t.closest) return;
      if ((b = t.closest('[data-audtab]'))) { S.tab = b.getAttribute('data-audtab'); I.segar(); return; }
      if (t.closest('#dkAudCsv')) { unduhCsv(); return; }
      if (t.closest('#dkAudSimpan')) { simpanEdm(); return; }
      if (t.closest('#dkAudIsi2026')) { isi(); return; }
      if ((b = t.closest('[data-audprio]'))) { tambahPrio([b.getAttribute('data-audprio')]); return; }
      if ((b = t.closest('#dkAudPrioBatch'))) { tambahPrio(b.getAttribute('data-kode').split(',')); return; }
      if (t.closest('#dkAudPrioSemua')) { semuaPrio = !semuaPrio; I.segar(); return; }
    });
    pg.addEventListener('change', function (ev) {
      var t = ev.target; if (!t) return;
      if (t.id === 'dkAudThn') { thn = t.value; impor = null; I.segar(); }
      else if (t.id === 'dkAudPdf' && t.files && t.files[0]) { imporPdf(t.files[0]); t.value = ''; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();

  window.DKAudit = { html: html, jalankan: jalankan, hitung: hitung, EDM2026: EDM2026, tambahPrio: tambahPrio, parseEdm: parseEdm, PRIO2026: PRIO2026 };
})();
