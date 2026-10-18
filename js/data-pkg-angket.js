/* ============================================================
   SI MAMBA - js/data-pkg-angket.js
   Butir ANGKET untuk modul PKG Guru MI: angket peserta didik, orang tua/komite, dan teman sejawat/kepala madrasah.
   Dipakai oleh angket.html (halaman isian publik) dan js/pkg.js (rekap + usulan skor).

   Angket dipakai sebagai bentuk WAWANCARA TERSTRUKTUR untuk indikator yang bukti wawancaranya
   ditujukan kepada peserta didik, orang tua/komite, atau teman sejawat (Lampiran I, Kepdirjen Pendis 1843/2021).
   Hasilnya hanya USULAN skor; penilai tetap yang memutuskan.

   Jawaban disimpan sebagai kode: y = Ya, k = Kadang-kadang, t = Tidak, x = Tidak tahu (tidak dihitung).
   Nilai: y = 1, k = 0,5, t = 0. Persentase indikator = rata-rata nilai butir resmi yang dijawab (selain x).
   Usulan skor: >= ambang.baik -> 2; >= ambang.cukup -> 1; di bawahnya -> 0.
   Bila responden kurang dari batas minimum jenisnya, TIDAK ada usulan skor (angka tetap ditampilkan).

   resmi:false = butir pembanding observasi (tidak dipakai untuk usulan skor, hanya ditampilkan).
============================================================ */
(function (root) {
  'use strict';

  var PILIHAN = { y: 'Ya', k: 'Kadang-kadang', t: 'Tidak', x: 'Tidak tahu' };
  var NILAI = { y: 1, k: 0.5, t: 0 };
  var AMBANG = { baik: 80, cukup: 50 };
  function adaNilai(v) { return typeof v === 'string' && Object.prototype.hasOwnProperty.call(NILAI, v); }   // bukan 'in': kunci prototipe ('constructor') tidak boleh lolos

  function b(k, t, ind, o) { o = o || {}; return { k: k, t: t, ind: ind, resmi: o.resmi !== false, x: !!o.x }; }

  var JENIS = {
    siswa: {
      judul: 'Angket Peserta Didik',
      sasaran: 'Peserta didik kelas 4\u20136 (kelas 1\u20133 dibacakan oleh guru lain, bukan guru yang dinilai)',
      pembuka: 'Jawablah sesuai yang kamu rasakan dan alami. Ini bukan ulangan, tidak ada jawaban benar atau salah. Namamu tidak ditanyakan dan gurumu tidak akan melihat jawaban pribadimu.',
      min: 10,
      butir: [
        b('S1', 'Guruku membuat aku semangat belajar, misalnya dengan cerita, permainan, atau pujian.', '2.4'),
        b('S2', 'Guruku memakai cara yang berbeda-beda supaya aku tidak bosan.', '2.4'),
        b('S3', 'Guruku memperlakukan semua murid dengan adil.', '11.1'),
        b('S4', 'Guruku membantu aku kalau aku kesulitan, sama seperti membantu temanku yang lain.', '11.1'),
        b('S5', 'Guruku menyapa dan mengajak bicara semua murid, bukan hanya murid tertentu.', '11.3'),
        b('S6', 'Guruku tidak membeda-bedakan murid yang pintar, yang kaya, atau teman dekatnya.', '11.3'),
        b('S7', 'Guruku sering mencoba cara atau alat mengajar yang baru.', '14.4'),
        b('S8', 'Guruku memakai laptop, HP, proyektor, atau aplikasi saat mengajar atau memberi tugas.', '14.6', { x: true }),
        b('S9', 'Aku tidak takut salah menjawab di kelas guruku.', '4.2', { resmi: false }),
        b('S10', 'Guruku mendengarkan sampai selesai kalau aku bicara.', '6.2', { resmi: false }),
        b('S11', 'Guruku tidak mempermalukan aku kalau jawabanku salah.', '6.3', { resmi: false }),
        b('S12', 'Teman-temanku memperhatikan dan menghormati guruku.', '9.3', { resmi: false })
      ]
    },
    ortu: {
      judul: 'Angket Orang Tua / Komite Madrasah',
      sasaran: 'Orang tua peserta didik atau anggota komite madrasah',
      pembuka: 'Mohon jawab sesuai yang Bapak/Ibu ketahui sendiri. Pilih \u201cTidak tahu\u201d bila belum pernah mengalami atau mengetahuinya. Jawaban bersifat rahasia dan tidak mencantumkan nama.',
      min: 5,
      butir: [
        b('O1', 'Guru menyampaikan perkembangan belajar anak saya (lewat rapor, WhatsApp, buku penghubung, atau pertemuan).', '12.1', { x: true }),
        b('O2', 'Guru memberi tahu saya jika anak saya mengalami kesulitan, dan juga menyampaikan kelebihannya.', '12.1', { x: true }),
        b('O3', 'Guru mudah dihubungi dan menanggapi pesan saya.', '12.1', { x: true }),
        b('O4', 'Guru ikut aktif dalam kegiatan madrasah di luar pelajaran (acara, pengajian, lomba).', '12.2', { x: true }),
        b('O5', 'Guru ikut terlibat dalam kegiatan di lingkungan masyarakat sekitar.', '12.2', { x: true })
      ]
    },
    sejawat: {
      judul: 'Angket Teman Sejawat / Kepala Madrasah',
      sasaran: 'Guru lain, wakil kepala madrasah, atau kepala madrasah',
      pembuka: 'Mohon jawab sesuai yang Bapak/Ibu ketahui sendiri. Pilih \u201cTidak tahu\u201d bila belum pernah melihat atau mengalaminya. Jawaban bersifat rahasia dan tidak mencantumkan nama.',
      min: 3,
      butir: [
        b('K1', 'Guru ini menghargai dan mencontohkan nilai Pancasila dalam kegiatan madrasah.', '8.1', { x: true }),
        b('K2', 'Guru ini bekerja sama baik dengan rekan tanpa memandang suku, agama, atau gender.', '8.2', { x: true }),
        b('K3', 'Guru ini santun dalam berbicara dan berpenampilan sopan kepada murid, orang tua, dan rekan.', '9.1', { x: true }),
        b('K4', 'Guru ini mau berbagi pengalaman dan terbuka terhadap masukan rekan.', '9.2', { x: true }),
        b('K5', 'Murid menghormati dan memperhatikan guru ini di kelas.', '9.3', { x: true }),
        b('K6', 'Guru ini menerima masukan dari murid dengan sikap dewasa.', '9.4', { x: true }),
        b('K7', 'Perilaku guru ini menjaga nama baik madrasah.', '9.5', { x: true }),
        b('K8', 'Guru ini menyelesaikan tugas administrasi tepat waktu.', '10.5', { x: true }),
        b('K9', 'Guru ini tampak bangga dan bersungguh-sungguh dengan profesinya.', '10.8', { x: true }),
        b('K10', 'Guru ini peduli dan memberi sumbangan positif dalam diskusi bersama rekan.', '11.2', { x: true })
      ]
    }
  };

  function saranDari(pct) { return pct >= AMBANG.baik ? 2 : (pct >= AMBANG.cukup ? 1 : 0); }

  // respon: array of { j:{S1:'y',...} }  ->  { n, indikator:{'2.4':{pct,n,saran}}, pembanding:{S9:{pct,n}} }
  function hitung(id, respon) {
    var J = JENIS[id]; if (!J) return null;
    var ind = {}, pem = {}, nResp = 0;
    (respon || []).forEach(function (r) {
      var j = r && r.j; if (!j || typeof j !== 'object') return; nResp++;
      var dipakai = {};
      J.butir.forEach(function (x) {
        var v = j[x.k]; if (!adaNilai(v)) return;                       // x / kosong / tak dikenal tidak dihitung
        if (x.resmi) {
          var a = ind[x.ind] || (ind[x.ind] = { jum: 0, cnt: 0, n: 0 });
          a.jum += NILAI[v]; a.cnt++; if (!dipakai[x.ind]) { dipakai[x.ind] = 1; a.n++; }
        } else {
          var p = pem[x.k] || (pem[x.k] = { jum: 0, cnt: 0, ind: x.ind });
          p.jum += NILAI[v]; p.cnt++;
        }
      });
    });
    var outI = {}, outP = {};
    Object.keys(ind).forEach(function (k) {
      var a = ind[k], pct = a.cnt ? Math.round(a.jum / a.cnt * 1000) / 10 : 0;
      outI[k] = { pct: pct, n: a.n, saran: a.n >= J.min ? saranDari(pct) : null };
    });
    Object.keys(pem).forEach(function (k) {
      var p = pem[k]; outP[k] = { pct: p.cnt ? Math.round(p.jum / p.cnt * 1000) / 10 : 0, n: p.cnt, ind: p.ind };
    });
    return { n: nResp, min: J.min, indikator: outI, pembanding: outP };
  }


  // ===== PENILAIAN DIRI GURU (pembanding; TIDAK dipakai untuk usulan skor) =====
  // Cermin butir angket siswa (G1-G12 berpasangan dengan S1-S12) + G13-G18 khusus guru (s = null). Jawaban kode: y / k / t (tanpa "tidak tahu"). Nilai sama: 1 / 0,5 / 0.
  function g(k, t, ind, s, o) { return { k: k, t: t, ind: ind, s: s, resmi: !(o && o.resmi === false) }; }
  var DIRI = {
    judul: 'Penilaian Diri Guru',
    pembuka: 'Jawablah sesuai kenyataan yang Bapak/Ibu lakukan, bukan yang diharapkan. Hasil ini hanya pembanding dengan angket peserta didik dan tidak mengubah skor penilaian.',
    butir: [
      g('G1', 'Saya membuat murid semangat belajar, misalnya dengan cerita, permainan, atau pujian.', '2.4', 'S1'),
      g('G2', 'Saya memakai cara mengajar yang berbeda-beda supaya murid tidak bosan.', '2.4', 'S2'),
      g('G3', 'Saya memperlakukan semua murid dengan adil.', '11.1', 'S3'),
      g('G4', 'Saya membantu murid yang kesulitan, sama seperti membantu murid lainnya.', '11.1', 'S4'),
      g('G5', 'Saya menyapa dan mengajak bicara semua murid, bukan hanya murid tertentu.', '11.3', 'S5'),
      g('G6', 'Saya tidak membeda-bedakan murid yang pintar, yang kaya, atau yang dekat dengan saya.', '11.3', 'S6'),
      g('G7', 'Saya sering mencoba cara atau alat mengajar yang baru.', '14.4', 'S7'),
      g('G8', 'Saya memakai laptop, HP, proyektor, atau aplikasi saat mengajar atau memberi tugas.', '14.6', 'S8'),
      g('G9', 'Saya menciptakan suasana kelas yang membuat murid tidak takut salah menjawab.', '4.2', 'S9', { resmi: false }),
      g('G10', 'Saya mendengarkan murid sampai selesai berbicara.', '6.2', 'S10', { resmi: false }),
      g('G11', 'Saya tidak mempermalukan murid ketika jawabannya salah.', '6.3', 'S11', { resmi: false }),
      g('G12', 'Murid memperhatikan dan menghormati saya di kelas.', '9.3', 'S12', { resmi: false }),
      // --- khusus guru (tanpa pasangan butir siswa; kolom Siswa tampil "-") ---
      g('G13', 'Saya mengenali gaya dan kesulitan belajar tiap murid, lalu menyesuaikan cara membantunya.', '1.1', null),
      g('G14', 'Saya memastikan murid yang berbeda kemampuan atau kondisinya, termasuk yang berkebutuhan khusus, tetap ikut aktif belajar.', '1.2', null),
      g('G15', 'Saya mengubah rencana pembelajaran bila keadaan kelas menuntut, dan saya tahu alasannya.', '2.3', null),
      g('G16', 'Saya memperbaiki cara mengajar berdasarkan jurnal pembelajaran atau masukan rekan.', '14.2', null),
      g('G17', 'Saya ikut kegiatan madrasah atau masyarakat di luar jam mengajar.', '12.2', null),
      g('G18', 'Saya menyelesaikan tugas administrasi dan tugas non-pembelajaran tepat waktu.', '10.5', null)
    ],
    refleksi: [
      ['r1', 'Hal yang sudah berjalan baik dalam pembelajaran saya'],
      ['r2', 'Hal yang masih perlu saya perbaiki'],
      ['r3', 'Rencana tindak lanjut saya']
    ]
  };
  function persen(arr) { var j = 0, c = 0; arr.forEach(function (v) { if (adaNilai(v)) { j += NILAI[v]; c++; } }); return c ? { pct: Math.round(j / c * 1000) / 10, n: c } : null; }
  // diriJ: {G1:'y',...}; respSiswa: [{j:{S1:'y',...}}] -> baris perbandingan per butir + rata-rata per indikator
  function banding(diriJ, respSiswa) {
    var rs = (respSiswa || []).map(function (r) { return r && r.j; }).filter(function (j) { return j && typeof j === 'object'; });
    var baris = DIRI.butir.map(function (x) {
      var d = diriJ && adaNilai(diriJ && diriJ[x.k]) ? Math.round(NILAI[diriJ[x.k]] * 1000) / 10 : null;
      var ps = persen(rs.map(function (j) { return j[x.s]; }));
      return { k: x.k, s: x.s, t: x.t, ind: x.ind, resmi: x.resmi, diri: d, siswa: ps ? ps.pct : null, n: ps ? ps.n : 0, selisih: (d != null && ps) ? Math.round((d - ps.pct) * 10) / 10 : null };
    });
    return { nSiswa: rs.length, baris: baris };
  }

  root.PKG_ANGKET = { versi: 3, pilihan: PILIHAN, nilai: NILAI, ambang: AMBANG, jenis: JENIS, urut: ['siswa', 'ortu', 'sejawat'], hitung: hitung, diri: DIRI, banding: banding };
})(typeof window !== 'undefined' ? window : this);
