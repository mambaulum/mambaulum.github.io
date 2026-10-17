/* ============================================================
   SI MAMBA - js/data-pkg-mi.js
   Instrumen Penilaian Kinerja Guru (PKG) Guru Kelas / Guru Mata Pelajaran (MI)
   -- DATA + RUMUS RESMI.

   Sumber: Kepdirjen Pendis No. 1843 Tahun 2021 (Juknis PKG Madrasah),
           Lampiran I A (Instrumen), I C/I D (Rekap).

   ATURAN HITUNG (Juknis Bab III.E):
   1) Tiap indikator diberi skor 0 / 1 / 2
        0 = tidak ada bukti (tidak terpenuhi)
        1 = terpenuhi sebagian
        2 = terpenuhi seluruhnya
   2) Persentase komponen = total skor / (jumlah indikator x 2) x 100%
   3) Nilai komponen (1-4): 0<X<=25% =1 ; 25<X<=50% =2 ; 50<X<=75% =3 ; 75<X<=100% =4
   4) Jumlah 14 nilai komponen (min 14, maks 56)
   5) Nilai PKG (skala 100) = jumlah / 56 x 100
   6) Sebutan & NPK (Tabel 2): 91-100 Sangat Baik 125% | 76-90 Baik 100% |
      61-75 Cukup 75% | 51-60 Kurang 50% | <=50 Buruk 25%

   CATATAN KEJANGGALAN DI DOKUMEN ASLI (tidak mempengaruhi hitungan):
   - Tabel 1 Lampiran I A menulis jumlah indikator per komponen yang tidak sama
     dengan butir di Tabel 2: komponen 4 (tertulis 4, butirnya 9), komponen 8
     (tertulis 5, butirnya 2), komponen 11 (tertulis 5, butirnya 3). Total 66
     kebetulan sama. Instrumen ini mengikuti butir di Tabel 2, yang dipakai
     rumus skor maksimum (mis. komponen 4 = 18, komponen 8 = 4).
   - Baris "Total skor untuk kompetensi 11" tidak tercetak di dokumen asli;
     skor maksimumnya dihitung 3 x 2 = 6.
   - Indikator 6.5 terpotong di dokumen asli ("...semua jawaban peserta didik
     baik") dan ditulis apa adanya.

   Instrumen ini DATA (bukan kode logika): bila Kemenag memperbarui
   instrumen, cukup ganti isi PKG_MI.komponen.
============================================================ */
(function (root) {
  'use strict';

  function k(no, kompetensi, nama, indikator) {
    return { no: no, kompetensi: kompetensi, nama: nama, indikator: indikator };
  }
  function i(t, b) { return { t: t, b: b }; }

  // Bukti yang sering dipakai
  var SUP = 'Dokumen supervisi akademik pelaksanaan pembelajaran / observasi pelaksanaan pembelajaran';
  var PENGAMATAN = 'Pengamatan pelaksanaan pembelajaran di kelas';
  var SUP_INTERAKSI = 'Telaah hasil supervisi akademik pelaksanaan pembelajaran (fokus interaksi guru dengan peserta didik)';
  var CATATAN = 'Daftar catatan harian guru';
  var WAWANCARA_GURU = 'Hasil wawancara dengan guru';
  var REMEDIAL = 'Program remedial dan pengayaan';
  var DAYA_SERAP = 'Daya serap peserta didik setiap KD';
  var RPP_TELAAH = 'Dokumen telaah RPP';
  var HADIR_GURU = 'Daftar hadir guru dalam melaksanakan tugas pokok (rekap daftar hadir guru)';
  var WWC_KOLEGA = 'Wawancara dengan guru / teman sejawat atau kepala madrasah';
  var SUP_LAPORAN = 'Catatan hasil supervisi pelaksanaan pembelajaran (laporan supervisi)';
  var KKG = 'Keaktifan di KKG/MGMP';
  var SUP_WAKTU = 'Telaah dokumen hasil supervisi akademik pelaksanaan pembelajaran (fokus penggunaan alokasi waktu dengan baik)';

  var PKG_MI = {
    sumber: 'Kepdirjen Pendis No. 1843 Tahun 2021, Lampiran I (Instrumen PKG Guru Kelas/Mata Pelajaran)',
    versi: '2021',
    jenjang: 'MI',
    skalaIndikator: [
      { v: 0, label: 'Tidak ada bukti (tidak terpenuhi)' },
      { v: 1, label: 'Terpenuhi sebagian' },
      { v: 2, label: 'Terpenuhi seluruhnya' }
    ],
    // Tabel 2 Juknis. Dipakai dengan perbandingan nilai > min (Buruk: sisanya).
    sebutan: [
      { nama: 'Sangat Baik', npk: 125, min: 90 },
      { nama: 'Baik', npk: 100, min: 75 },
      { nama: 'Cukup', npk: 75, min: 60 },
      { nama: 'Kurang', npk: 50, min: 50 },
      { nama: 'Buruk', npk: 25, min: -1 }
    ],
    komponen: [
      // ===================== PEDAGOGIK =====================
      k(1, 'Pedagogik', 'Mengenal karakteristik peserta didik', [
        i('Guru dapat mengidentifikasi karakteristik belajar setiap peserta didik di kelasnya.',
          ['Dokumen hasil penilaian harian terakhir peserta didik', SUP, CATATAN, WAWANCARA_GURU]),
        i('Guru memastikan bahwa semua peserta didik (termasuk di dalamnya peserta didik dengan kelainan fisik dan kemampuan belajar yang berbeda) mendapatkan kesempatan yang sama untuk berpartisipasi aktif dalam kegiatan pembelajaran.',
          ['Dokumen daftar hadir terakhir peserta didik', SUP, CATATAN, WAWANCARA_GURU]),
        i('Guru mencoba mengetahui penyebab penyimpangan perilaku peserta didik untuk mencegah agar perilaku tersebut tidak merugikan peserta didik lainnya.',
          ['Dokumen daftar hadir terakhir peserta didik', SUP, CATATAN, WAWANCARA_GURU])
      ]),
      k(2, 'Pedagogik', 'Menguasai teori belajar dan prinsip-prinsip pembelajaran yang mendidik', [
        i('Guru memberi kesempatan kepada peserta didik untuk menguasai materi pembelajaran sesuai usia dan kemampuan belajarnya melalui pengaturan proses pembelajaran dan aktivitas yang bervariasi.',
          [RPP_TELAAH, 'Daftar catatan harian guru', SUP, REMEDIAL]),
        i('Guru selalu memastikan tingkat pemahaman peserta didik terhadap materi pembelajaran tertentu dan menyesuaikan aktivitas pembelajaran berikutnya berdasarkan tingkat pemahaman tersebut.',
          [RPP_TELAAH, 'Dokumen supervisi pelaksanaan pembelajaran', REMEDIAL, DAYA_SERAP]),
        i('Guru dapat menjelaskan alasan pelaksanaan kegiatan/aktivitas yang dilakukannya, baik yang sesuai maupun yang berbeda dengan rencana, terkait keberhasilan/kekurangberhasilan pembelajaran.',
          [RPP_TELAAH, 'Dokumen supervisi pelaksanaan pembelajaran', REMEDIAL, DAYA_SERAP, 'Wawancara dengan guru']),
        i('Guru menggunakan berbagai teknik untuk memotivasi kemauan belajar peserta didik.',
          ['Dokumen hasil telaah RPP', 'Hasil supervisi pelaksanaan pembelajaran', 'Wawancara dengan peserta didik']),
        i('Guru merencanakan kegiatan pembelajaran yang saling terkait satu sama lain, dengan memperhatikan tujuan pembelajaran maupun proses belajar peserta didik.',
          ['Dokumen hasil telaah RPP', 'Daftar hasil supervisi pelaksanaan pembelajaran']),
        i('Guru memperhatikan respon peserta didik yang belum/kurang memahami materi pembelajaran yang diajarkan dan menggunakannya untuk memperbaiki rancangan pembelajaran berikutnya.',
          ['Dokumen hasil telaah RPP', 'Daftar hasil supervisi pelaksanaan pembelajaran', REMEDIAL, 'Daya serap peserta didik'])
      ]),
      k(3, 'Pedagogik', 'Pengembangan kurikulum', [
        i('Guru dapat menyusun/menggunakan silabus yang sesuai dengan kurikulum.',
          ['Dokumen silabus terbaru', 'Analisis KI dan KD']),
        i('Guru merancang rencana pembelajaran yang sesuai dengan silabus.',
          ['Dokumen RPP terbaru', 'Dokumen silabus']),
        i('Guru mengembangkan materi pembelajaran untuk mencapai kompetensi dasar.',
          ['Dokumen RPP terbaru', 'KI dan KD sesuai mata pelajaran']),
        i('Guru mengikuti urutan materi pembelajaran dengan memperhatikan tujuan pembelajaran.',
          ['Dokumen RPP', 'KI-KD sesuai mata pelajaran']),
        i('Guru memilih materi pembelajaran yang: (a) sesuai dengan tujuan pembelajaran, (b) tepat dan mutakhir, (c) sesuai dengan usia dan tingkat kemampuan belajar peserta didik, (d) dapat dilaksanakan di kelas dan (e) sesuai dengan konteks kehidupan sehari-hari peserta didik.',
          ['Dokumen RPP', 'KI-KD sesuai mata pelajaran'])
      ]),
      k(4, 'Pedagogik', 'Kegiatan pembelajaran yang mendidik', [
        i('Guru melaksanakan aktivitas pembelajaran sesuai dengan rancangan yang telah disusun secara lengkap (termasuk pemberian informasi baru) yang mengindikasikan bahwa guru mengerti tentang tujuannya.',
          ['Dokumen RPP', 'Dokumen supervisi akademik pelaksanaan pembelajaran']),
        i('Guru melaksanakan aktivitas pembelajaran yang bertujuan untuk membantu proses belajar peserta didik, bukan untuk menguji sehingga membuat peserta didik merasa tertekan.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada proses belajar peserta didik)']),
        i('Guru menyikapi kesalahan yang dilakukan peserta didik sebagai tahapan proses pembelajaran, bukan semata-mata kesalahan yang harus dikoreksi. Misalnya: dengan mengetahui terlebih dahulu peserta didik lain yang setuju/tidak setuju dengan jawaban tersebut, sebelum memberikan penjelasan tentang jawaban yang benar.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada tahapan pembelajaran)', 'Atau melalui pengamatan di kelas dalam pelaksanaan pembelajaran']),
        i('Guru melaksanakan kegiatan pembelajaran sesuai isi kurikulum dan mengaitkannya dengan konteks kehidupan sehari-hari peserta didik.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada materi pokok yang disampaikan)', 'KI dan KD mapel', 'RPP (fokus pada materi pokok)', 'Atau melalui pengamatan di kelas dalam pelaksanaan pembelajaran']),
        i('Guru melakukan aktivitas pembelajaran secara bervariasi dengan mempertimbangkan waktu, kondisi kelas, usia dan tingkat kemampuan belajar dan mempertahankan perhatian peserta didik.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada metode pembelajaran dan penggunaan alokasi waktu)', 'Dokumen RPP (fokus pada metode pembelajaran)', 'Atau melalui pengamatan di kelas dalam pelaksanaan pembelajaran']),
        i('Guru mengelola kelas dengan efektif tanpa mendominasi atau sibuk dengan kegiatannya sendiri agar semua waktu peserta dapat dimanfaatkan secara produktif.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada teknik pembelajaran dan pemanfaatan alokasi waktu)', 'Atau mengamati pelaksanaan pembelajaran', 'Atau melalui pengamatan di kelas dalam pelaksanaan pembelajaran']),
        i('Guru memberikan banyak kesempatan kepada peserta didik untuk bertanya, mempraktikkan dan berinteraksi dengan peserta didik lain.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada teknik pembelajaran dan komunikasi guru dengan peserta didik)', 'Atau melalui pengamatan di kelas dalam pelaksanaan pembelajaran']),
        i('Guru mengatur pelaksanaan aktivitas pembelajaran secara sistematis untuk membantu proses belajar peserta didik. Sebagai contoh: guru menambah informasi baru setelah mengevaluasi pemahaman peserta didik terhadap materi sebelumnya.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada komunikasi guru dengan peserta didik)', 'Atau melalui pengamatan di kelas dalam pelaksanaan pembelajaran']),
        i('Guru menggunakan alat bantu mengajar, dan/atau audio-visual (termasuk TIK) untuk meningkatkan motivasi belajar peserta didik dalam mencapai tujuan pembelajaran.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada pemanfaatan alat bantu mengajar/TIK)', 'Dokumen RPP (fokus pada media pembelajaran)'])
      ]),
      k(5, 'Pedagogik', 'Memahami dan mengembangkan potensi peserta didik', [
        i('Guru menganalisis hasil belajar berdasarkan segala bentuk penilaian terhadap setiap peserta didik untuk mengetahui tingkat kemajuan masing-masing.',
          ['Dokumen analisis penilaian hasil belajar', REMEDIAL, 'Catatan harian guru']),
        i('Guru merancang dan melaksanakan aktivitas pembelajaran yang mendorong peserta didik untuk belajar sesuai dengan kecakapan dan pola belajar masing-masing.',
          ['Dokumen supervisi akademik pelaksanaan pembelajaran (fokus pada interaksi guru dan peserta didik)', 'Dokumen RPP (fokus pada langkah-langkah pembelajaran)']),
        i('Guru merancang dan melaksanakan aktivitas pembelajaran untuk memunculkan daya kreativitas dan kemampuan berpikir kritis peserta didik.',
          ['Dokumen RPP (fokus pada langkah-langkah pembelajaran)', 'Dokumen hasil supervisi akademik (fokus pada pelaksanaan pembelajaran)']),
        i('Guru secara aktif membantu peserta didik dalam proses pembelajaran dengan memberikan perhatian kepada setiap individu.',
          ['Dokumen hasil supervisi akademik pelaksanaan pembelajaran (fokus pada interaksi guru dengan peserta didik)', 'Pengamatan guru yang sedang melaksanakan pembelajaran']),
        i('Guru dapat mengidentifikasi dengan benar tentang bakat, minat, potensi, dan kesulitan belajar.',
          ['Catatan harian guru', 'Dokumen penilaian peserta didik (buku nilai peserta didik)'])
      ]),
      k(6, 'Pedagogik', 'Komunikasi dengan peserta didik', [
        i('Guru menggunakan pertanyaan untuk mengetahui pemahaman dan menjaga partisipasi peserta didik, termasuk memberikan pertanyaan terbuka yang menuntut peserta didik untuk menjawab dengan ide dan pengetahuan mereka.',
          ['Pengamatan guru yang melaksanakan pembelajaran di kelas', SUP_INTERAKSI]),
        i('Guru memberikan perhatian dan mendengarkan semua pertanyaan dan tanggapan peserta didik, tanpa menginterupsi, kecuali jika diperlukan untuk membantu atau mengklarifikasi pertanyaan/tanggapan tersebut.',
          [PENGAMATAN, SUP_INTERAKSI]),
        i('Guru menanggapi pertanyaan peserta didik secara tepat, benar, dan mutakhir, untuk menghilangkan kebingungan pada peserta didik sesuai tujuan pembelajaran dan isi kurikulum, tanpa mempermalukannya.',
          [PENGAMATAN, SUP_INTERAKSI]),
        i('Guru menyajikan kegiatan pembelajaran yang dapat menumbuhkan kerja sama yang baik antarpeserta didik.',
          [PENGAMATAN, SUP_INTERAKSI]),
        // Teks di dokumen asli terpotong di kata "baik" (lihat catatan di header).
        i('Guru mendengarkan dan memberikan perhatian terhadap semua jawaban peserta didik baik',
          [PENGAMATAN, SUP_INTERAKSI])
      ]),
      k(7, 'Pedagogik', 'Penilaian dan evaluasi', [
        i('Guru menyusun alat penilaian yang sesuai dengan tujuan pembelajaran untuk mencapai kompetensi tertentu seperti yang tertulis dalam RPP.',
          ['Dokumen RPP (fokus pada tujuan pembelajaran dan penilaian/asesmen)', 'Perangkat penilaian (sebaran soal, kisi-kisi soal/kartu soal)', 'Analisis hasil penilaian (analisis ketuntasan/daya serap)']),
        i('Guru melaksanakan penilaian dengan berbagai teknik dan jenis penilaian, selain penilaian formal yang dilaksanakan madrasah, dan mengumumkan hasil serta implikasinya kepada peserta didik, tentang tingkat pemahaman terhadap materi pembelajaran yang telah dan akan dipelajari.',
          ['Perangkat penilaian (sebaran soal, kisi-kisi soal/kartu soal)', 'Analisis hasil penilaian (analisis ketuntasan/daya serap)', 'Lembar jawaban tes yang sudah ditandatangani orang tua peserta didik', 'Rekap nilai (buku leger)']),
        i('Guru menganalisis hasil penilaian untuk mengidentifikasi topik/kompetensi dasar yang sulit sehingga diketahui kekuatan dan kelemahan masing-masing peserta didik untuk keperluan remedial dan pengayaan.',
          ['Dokumen RPP (fokus pada tujuan pembelajaran dan penilaian/asesmen)', 'Perangkat penilaian (sebaran soal, kisi-kisi soal/kartu soal)', 'Analisis hasil penilaian (analisis ketuntasan/daya serap)', REMEDIAL]),
        i('Guru memanfaatkan masukan dari peserta didik dan merefleksikannya untuk meningkatkan pembelajaran selanjutnya, dan dapat membuktikannya melalui catatan, jurnal pembelajaran, rancangan pembelajaran, materi tambahan, dan sebagainya.',
          ['Perangkat penilaian (sebaran soal, kisi-kisi soal/kartu soal)', 'Analisis hasil penilaian (analisis ketuntasan/daya serap)', REMEDIAL, 'Jurnal pembelajaran'])
      ]),
      // ===================== KEPRIBADIAN =====================
      k(8, 'Kepribadian', 'Bertindak sesuai dengan norma agama, hukum, sosial, dan kebudayaan nasional', [
        i('Guru menghargai dan mempromosikan prinsip-prinsip Pancasila sebagai dasar ideologi dan etika bagi semua warga Indonesia.',
          ['Dokumentasi kegiatan upacara bendera/PHBN (foto kegiatan, daftar hadir, surat tugas pembina upacara, dll)', 'Surat pernyataan tidak terlibat dalam organisasi terlarang oleh pemerintah Indonesia', 'Wawancara dengan guru/kepala madrasah']),
        i('Guru mengembangkan kerja sama dan membina kebersamaan dengan teman sejawat tanpa memperhatikan perbedaan yang ada (misalnya: suku, agama, dan gender).',
          ['Mengikuti kegiatan guru dalam MGMP/organisasi guru', 'Foto kegiatan guru-guru', 'Wawancara dengan guru/kepala madrasah'])
      ]),
      k(9, 'Kepribadian', 'Menunjukkan pribadi yang dewasa dan teladan', [
        i('Guru bertingkah laku santun dalam berbicara, berpenampilan sopan terhadap semua peserta didik, orang tua, dan teman sejawat.',
          [WWC_KOLEGA, HADIR_GURU, KKG]),
        i('Guru mau berbagi pengalaman dengan kolega, termasuk mengundang mereka untuk mengobservasi cara mengajarnya dan memberikan masukan.',
          [WWC_KOLEGA, HADIR_GURU, SUP_LAPORAN, KKG]),
        i('Guru mampu mengelola pembelajaran yang membuktikan bahwa guru dihormati oleh peserta didik, sehingga semua peserta didik selalu memperhatikan guru dan berpartisipasi aktif dalam proses pembelajaran.',
          [WWC_KOLEGA, HADIR_GURU, SUP_LAPORAN]),
        i('Guru bersikap dewasa dalam menerima masukan dari peserta didik.',
          [WWC_KOLEGA, HADIR_GURU, SUP_LAPORAN]),
        i('Guru berperilaku baik untuk mencitrakan nama baik madrasah.',
          [WWC_KOLEGA, HADIR_GURU, SUP_LAPORAN, KKG])
      ]),
      k(10, 'Kepribadian', 'Etos kerja, tanggung jawab yang tinggi, rasa bangga menjadi guru', [
        i('Guru mengawali dan mengakhiri pembelajaran dengan tepat waktu.',
          ['Daftar hadir guru', SUP_WAKTU, 'Kunjungan kelas memantau guru melaksanakan pembelajaran']),
        i('Jika guru harus meninggalkan kelas, guru mengaktifkan peserta didik dengan melakukan hal-hal produktif terkait dengan mata pelajaran, dan meminta guru piket atau guru lain untuk mengawasi kelas.',
          ['Daftar hadir guru', 'Surat keterangan/surat cuti/surat tugas', 'Catatan piket madrasah']),
        i('Guru memenuhi jam mengajar dan dapat melakukan semua kegiatan lain di luar jam mengajar berdasarkan izin dan persetujuan pengelola madrasah.',
          ['Daftar hadir guru', SUP_WAKTU, 'Kunjungan kelas memantau guru melaksanakan pembelajaran', 'Catatan piket madrasah']),
        i('Guru meminta izin dan memberitahu lebih awal, dengan memberikan alasan dan bukti yang sah jika tidak menghadiri kegiatan yang telah direncanakan, termasuk proses pembelajaran di kelas.',
          ['Daftar hadir guru', SUP_WAKTU, 'Catatan piket madrasah', 'Surat keterangan/surat cuti/surat tugas']),
        i('Guru menyelesaikan semua tugas administratif dan non-pembelajaran dengan tepat waktu sesuai standar yang ditetapkan.',
          ['Wawancara dengan guru/wakamad kurikulum', 'Telaah dokumen supervisi akademik perencanaan pembelajaran dan penilaian hasil pembelajaran']),
        i('Guru memanfaatkan waktu luang selain mengajar untuk kegiatan yang produktif terkait dengan tugasnya.',
          ['Keaktifan di KKG/MGMP (surat tugas/dokumen aktivitas di KKG/MGMP)']),
        i('Guru memberikan kontribusi terhadap pengembangan madrasah dan mempunyai prestasi yang berdampak positif terhadap nama baik madrasah.',
          ['Keaktifan di KKG/MGMP (surat tugas/dokumen aktivitas di KKG/MGMP)', 'SK kegiatan di madrasah dan di luar madrasah', 'Piagam/sertifikat prestasi guru dalam kegiatan tertentu atau lomba/guru berprestasi']),
        i('Guru merasa bangga dengan profesinya.',
          ['Mempunyai rencana PKB', 'Wawancara dengan guru/teman sejawat', 'Aktif dalam organisasi guru madrasah'])
      ]),
      // ===================== SOSIAL =====================
      k(11, 'Sosial', 'Bersikap inklusif, bertindak obyektif, serta tidak diskriminatif', [
        i('Guru memperlakukan semua peserta didik secara adil, memberikan perhatian dan bantuan sesuai kebutuhan masing-masing, tanpa memperdulikan faktor personal.',
          ['Daftar nilai peserta didik', CATATAN, 'Hasil wawancara dengan peserta didik']),
        i('Guru menjaga hubungan baik dan peduli dengan teman sejawat (bersifat inklusif), serta berkontribusi positif terhadap semua diskusi formal dan informal terkait dengan pekerjaannya.',
          [CATATAN, 'Hasil wawancara dengan guru/kepala madrasah']),
        i('Guru sering berinteraksi dengan peserta didik dan tidak membatasi perhatiannya hanya pada kelompok tertentu (misalnya: peserta didik yang pandai, kaya, berasal dari daerah yang sama dengan guru).',
          [CATATAN, 'Hasil wawancara dengan peserta didik'])
      ]),
      k(12, 'Sosial', 'Komunikasi dengan sesama guru, tenaga kependidikan, orang tua peserta didik, dan masyarakat', [
        i('Guru menyampaikan informasi tentang kemajuan, kesulitan, dan potensi peserta didik kepada orang tuanya, baik dalam pertemuan formal maupun tidak formal antara guru dan orang tua, teman sejawat, dan dapat menunjukkan buktinya.',
          [CATATAN, 'Hasil wawancara dengan guru/orang tua']),
        i('Guru ikut berperan aktif dalam kegiatan di luar pembelajaran yang diselenggarakan madrasah dan masyarakat, berkomunikasi serta berperan aktif dalam kegiatan sosial di masyarakat sekitar.',
          [CATATAN, WAWANCARA_GURU, 'Hasil wawancara dengan komite madrasah/orang tua peserta didik'])
      ]),
      // ===================== PROFESIONAL =====================
      k(13, 'Profesional', 'Penguasaan materi, struktur, konsep, dan pola pikir keilmuan yang mendukung mata pelajaran yang diampu', [
        i('Guru mengintegrasikan materi pembelajaran dengan konsep-konsep yang terdapat di dalam Al-Qur\u2019an dan Hadits.',
          ['Dokumen RPP (fokus pada materi pembelajaran)', 'Pengamatan guru dalam pelaksanaan pembelajaran']),
        i('Guru melakukan pemetaan standar kompetensi/kompetensi inti dan kompetensi dasar mata pelajaran yang diampunya, untuk mengidentifikasi materi pembelajaran yang dianggap sulit, melakukan perencanaan dan pelaksanaan pembelajaran, dan memperkirakan alokasi waktu yang diperlukan.',
          ['Dokumen pemetaan KI dan KD', 'Dokumen RPP', 'Hasil supervisi akademik perencanaan dan pelaksanaan pembelajaran']),
        i('Guru menyusun materi, perencanaan dan pelaksanaan pembelajaran berisi informasi yang tepat, mutakhir, dan membantu peserta didik untuk memahami konsep materi pembelajaran.',
          ['Dokumen RPP', 'Pemetaan KI dan KD', 'Mengamati proses pembelajaran / telaah hasil supervisi akademik pelaksanaan pembelajaran'])
      ]),
      k(14, 'Profesional', 'Mengembangkan keprofesionalan melalui tindakan yang reflektif', [
        i('Guru melakukan evaluasi diri secara spesifik, lengkap, dan didukung dengan contoh pengalaman diri sendiri.',
          ['Daftar catatan evaluasi diri guru', 'Rencana tahunan program PKB']),
        i('Guru memiliki jurnal pembelajaran, catatan masukan dari teman sejawat atau hasil penilaian proses pembelajaran sebagai bukti yang menggambarkan kinerjanya.',
          ['Daftar jurnal pembelajaran', 'Hasil wawancara dengan guru']),
        i('Guru memanfaatkan bukti gambaran kinerjanya untuk mengembangkan perencanaan dan pelaksanaan pembelajaran selanjutnya dalam program PKB.',
          ['Bukti keikutsertaan dalam melaksanakan kegiatan PKB', 'Pernah mengakses laman (website) yang terkait dengan program PKB']),
        i('Guru dapat mengaplikasikan pengalaman PKB dalam perencanaan, pelaksanaan, penilaian pembelajaran dan tindak lanjutnya.',
          ['Daftar nilai peserta didik', 'Hasil wawancara dengan peserta didik', 'Program PKB']),
        i('Guru melakukan penelitian, mengembangkan karya inovasi, mengikuti kegiatan ilmiah (misalnya seminar, konferensi), dan aktif dalam melaksanakan PKB.',
          ['Keikutsertaan dalam anggota profesi (KKG/MGMP)', 'Hasil karya tulis ilmiah/karya inovatif', 'Hasil wawancara dengan guru']),
        i('Guru dapat memanfaatkan TIK dalam berkomunikasi dan pelaksanaan PKB.',
          ['Telaah jejak digital guru dalam penggunaan TIK (media sosial, email, drive, aplikasi meeting, dan lainnya)', 'Hasil wawancara dengan guru dan peserta didik'])
      ])
    ]
  };

  // ---------- RUMUS RESMI ----------

  // skor: array angka 0/1/2 (null/undefined = belum dinilai) untuk SATU komponen.
  PKG_MI.hitungKomponen = function (no, skor) {
    var kmp = PKG_MI.komponen[no - 1];
    var n = kmp.indikator.length, total = 0, terisi = 0;
    for (var x = 0; x < n; x++) {
      var v = skor && skor[x];
      if (v === 0 || v === 1 || v === 2) { total += v; terisi++; }
    }
    var maks = n * 2;
    var persen = maks ? (total / maks) * 100 : 0;
    // 0% dianggap 1 (nilai minimum per kompetensi = 1, lihat catatan Lampiran I C)
    var nilai = persen > 75 ? 4 : persen > 50 ? 3 : persen > 25 ? 2 : 1;
    return { total: total, maks: maks, persen: persen, nilai: nilai, terisi: terisi, jumlahIndikator: n, lengkap: terisi === n };
  };

  PKG_MI.cariSebutan = function (nilai100) {
    var s = PKG_MI.sebutan;
    for (var x = 0; x < s.length; x++) { if (nilai100 > s[x].min) return s[x]; }
    return s[s.length - 1];
  };

  // skorSemua: { 1:[..], 2:[..], ... 14:[..] } (kunci = nomor komponen)
  PKG_MI.hitungPKG = function (skorSemua) {
    var rek = [], jumlah = 0, lengkap = true;
    for (var no = 1; no <= PKG_MI.komponen.length; no++) {
      var h = PKG_MI.hitungKomponen(no, skorSemua && skorSemua[no]);
      rek.push(h); jumlah += h.nilai; if (!h.lengkap) lengkap = false;
    }
    var tertinggi = PKG_MI.komponen.length * 4;       // 14 x 4 = 56
    var skala100 = (jumlah / tertinggi) * 100;
    var seb = PKG_MI.cariSebutan(skala100);
    return { komponen: rek, jumlah: jumlah, tertinggi: tertinggi, nilai100: skala100, sebutan: seb.nama, npk: seb.npk, lengkap: lengkap };
  };

  PKG_MI.kelompok = ['Pedagogik', 'Kepribadian', 'Sosial', 'Profesional'];

  PKG_MI.totalIndikator = function () {
    return PKG_MI.komponen.reduce(function (a, c) { return a + c.indikator.length; }, 0);
  };

  root.PKG_MI = PKG_MI;
})(typeof window !== 'undefined' ? window : globalThis);
