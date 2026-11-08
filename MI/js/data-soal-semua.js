/* ============================================================
   SI MAMBA - js/data-soal-semua.js
   GABUNGAN SATU FILE seluruh bank soal (Kartu Soal / modul Perangkat Pembelajaran). Menggantikan 10 file terpisah:
   data-soal-mi, data-soal-aqh-hafalan, data-soal-aqh-tajwid, data-soal-ba, data-soal-pai-tambah, data-soal-mtk,
   data-soal-umum-1, data-soal-umum-2, data-soal-umum-3, data-soal-uraian-tambah (urutan di bawah = urutan muat lama).
   Mengisi window.BANK_SOAL_MI (kunci = kode mapel-FASE-nomor urut TP di js/data-tp-mi.js dan js/data-tp-umum.js),
   window.BANK_SOAL_AQH_INFO, dan window.DRAF_TP_MTK. Isi tiap bagian TIDAK diubah; tiap bagian tetap IIFE sendiri.
   WAJIB dimuat SESUDAH js/data-tp-mi.js dan js/data-tp-umum.js, SEBELUM js/perangkat-*.js.
   Status semua soal: DRAF, guru wajib memeriksa sebelum dipakai.
============================================================ */

/* ################ BAGIAN: data-soal-mi.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-mi.js
   Bank soal DRAF untuk TP PAI MI (kunci TP sama dengan js/data-tp-mi.js, mis. 'aa-A-1' = Akidah Akhlak Fase A TP ke-1).
   Cakupan: Akidah Akhlak (Fase A-C), Fikih (A-C), SKI (B-C), Tajwid pada Al-Qur'an Hadis (A-C), dan Bahasa Arab Fase A-C (kosakata dan pola kalimat sederhana, kunci 'ba-A/B/C-n').
   TIDAK mencakup hafalan surah/ayat/hadis: soal untuk itu diketik guru di modul Kartu Soal.
   Soal ditulis ulang oleh penyusun aplikasi dan berstatus DRAF: guru wajib memeriksa kebenaran isi, kesesuaian
   dengan buku ajar/mazhab yang dipakai madrasah, dan tingkat kesulitan sebelum dipakai.
   Verifikasi (Oktober 2026): isi soal AQH, Akidah Akhlak, Fikih, dan SKI dicek ulang terhadap materi SK 9941/2025
   dan fakta dasarnya (kunci jawaban pilihan ganda, arti asmaulhusna, rukun, rakaat, nama nabi/sahabat). Tidak ada
   kunci yang keliru. Belum dicek: tingkat kesulitan dan kesesuaian dengan buku ajar madrasah.
   Format:
     PG    : ['pg', level, soal, [jawaban BENAR, pengecoh1, pengecoh2, pengecoh3]]  (urutan opsi diacak saat dipakai)
     Isian : ['is', level, soal, jawaban]
     Uraian: ['ur', level, soal, pedoman penskoran]
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  window.BANK_SOAL_MI = {
    // ===================== AKIDAH AKHLAK FASE A =====================
    'aa-A-1': [
      P('L1', 'Kalimat syahadat artinya ...', 'Aku bersaksi tidak ada Tuhan selain Allah dan Nabi Muhammad utusan Allah', 'Aku bersaksi bahwa salat lima waktu itu wajib bagi setiap muslim', 'Aku beriman kepada malaikat, kitab, dan rasul-rasul Allah', 'Aku bersedia berpuasa dan membayar zakat setiap tahun'),
      P('L1', 'Syahadat merupakan rukun Islam yang ke ...', 'pertama', 'kedua', 'ketiga', 'kelima'),
      I('L1', 'Tidak ada Tuhan selain ..., dan Nabi Muhammad adalah utusan-Nya.', 'Allah')
    ],
    'aa-A-2': [
      P('L1', 'Jumlah rukun iman ada ...', 'enam', 'empat', 'lima', 'tujuh'),
      P('L1', 'Rukun iman yang pertama adalah iman kepada ...', 'Allah', 'malaikat', 'rasul', 'hari akhir'),
      U('L1', 'Sebutkan enam rukun iman!', 'Iman kepada Allah, malaikat, kitab-kitab Allah, rasul-rasul Allah, hari akhir, dan qada dan qadar. Skor sebanding jumlah butir yang benar.')
    ],
    'aa-A-3': [
      P('L1', 'Sifat wajib bagi Allah adalah sifat yang ... dimiliki Allah.', 'pasti', 'mustahil', 'kadang-kadang', 'belum')
      , P('L1', 'Allah bersifat wujud, artinya Allah ...', 'ada', 'kekal', 'kuat', 'hidup'),
      I('L1', 'Allah bersifat baqa\', artinya ....', 'kekal')
    ],
    'aa-A-4': [
      P('L1', 'Malaikat yang bertugas menyampaikan wahyu kepada para nabi adalah ...', 'Jibril', 'Mikail', 'Israfil', 'Izrail'),
      P('L1', 'Malaikat yang bertugas meniup sangkakala pada hari kiamat adalah ...', 'Israfil', 'Mikail', 'Malik', 'Ridwan'),
      U('L2', 'Sebutkan empat malaikat Allah beserta tugasnya!', 'Jibril: menyampaikan wahyu; Mikail: membagi rezeki; Israfil: meniup sangkakala; Izrail: mencabut nyawa. Skor sebanding jumlah pasangan yang benar.')
    ],
    'aa-A-5': [
      P('L1', 'Ar-Rahman artinya Maha ...', 'Pengasih', 'Penyayang', 'Suci', 'Merajai'),
      P('L1', 'Asmaulhusna yang berarti Maha Suci adalah ...', 'Al-Quddus', 'Al-Malik', 'Ar-Rahim', 'Ar-Rahman'),
      I('L1', 'Al-Malik artinya Maha ....', 'Merajai (Raja)')
    ],
    'aa-A-6': [
      P('L1', 'Al-Aziz artinya Maha ...', 'Perkasa', 'Memelihara', 'Pengasih', 'Mengetahui'),
      P('L1', 'Asmaulhusna yang berarti Maha Memelihara adalah ...', 'Al-Muhaimin', 'As-Salam', 'Al-Mukmin', 'Al-Aziz'),
      I('L1', 'Al-Mukmin artinya Maha Memberi ....', 'Keamanan')
    ],
    'aa-A-7': [
      P('L1', 'Bacaan yang diucapkan ketika memulai pekerjaan yang baik adalah ...', 'Bismillahirrahmanirrahim', 'Alhamdulillah', 'Astaghfirullah', 'Subhanallah'),
      P('L2', 'Kalimat \'Alhamdulillah\' diucapkan ketika ...', 'mendapat nikmat dan bersyukur', 'akan makan', 'melakukan kesalahan', 'melihat hal yang buruk'),
      I('L1', 'Hamdalah artinya segala ... bagi Allah.', 'puji')
    ],
    'aa-A-8': [
      P('L1', 'Contoh perilaku hidup sehat adalah ...', 'mencuci tangan sebelum makan', 'makan sambil bermain', 'tidur larut malam', 'membuang sampah sembarangan'),
      P('L1', 'Menyikat gigi yang baik dilakukan ...', 'pagi hari dan sebelum tidur malam', 'seminggu sekali', 'hanya saat gigi sakit', 'tidak perlu dilakukan'),
      U('L2', 'Tuliskan tiga contoh perilaku hidup bersih dan sehat di madrasah!', 'Contoh benar antara lain: membuang sampah pada tempatnya, mencuci tangan, menjaga kebersihan kelas, memakai seragam bersih, jajan makanan sehat. Skor sebanding jumlah contoh yang benar.')
    ],
    'aa-A-9': [
      P('L1', 'Sikap jujur artinya ...', 'berkata dan berbuat sesuai kenyataan', 'berkata tidak sesuai kenyataan', 'menyembunyikan kesalahan', 'suka menyontek'),
      P('L2', 'Jika menemukan uang temanmu yang jatuh, sikap jujur adalah ...', 'mengembalikannya kepada teman', 'menyimpannya sendiri', 'membelanjakannya', 'membiarkannya'),
      I('L1', 'Lawan dari jujur adalah ....', 'bohong (dusta)')
    ],
    'aa-A-10': [
      P('L2', 'Jika temanmu menolongmu, sikap yang baik adalah ...', 'mengucapkan terima kasih', 'diam saja', 'pergi begitu saja', 'menyombongkan diri'),
      P('L1', 'Sikap rendah hati adalah ...', 'tidak sombong dan menghargai orang lain', 'merasa dirinya paling pintar dan paling benar', 'suka meremehkan pendapat teman yang lain', 'enggan bergaul dengan teman yang berbeda'),
      U('L2', 'Mengapa kita harus mengucapkan terima kasih? Jelaskan!', 'Jawaban benar memuat salah satu alasan: menghargai kebaikan orang lain, membuat orang lain senang, tanda bersyukur. Skor penuh bila alasan jelas dan sesuai.')
    ],
    'aa-A-11': [
      P('L1', 'Contoh sikap malas adalah ...', 'menunda mengerjakan tugas', 'rajin belajar', 'merapikan tempat tidur', 'membantu ibu'),
      P('L2', 'Berkata kasar sebaiknya diganti dengan ...', 'kata-kata yang sopan', 'diam sambil marah', 'berteriak', 'mengejek'),
      I('L1', 'Berkata tidak sesuai kenyataan disebut ....', 'berbohong (bohong)')
    ],
    'aa-A-12': [
      P('L1', 'Sebelum belajar, kita dianjurkan membaca ...', 'doa', 'lagu', 'puisi', 'cerita'),
      P('L2', 'Adab belajar yang benar adalah ...', 'memperhatikan penjelasan guru', 'mengobrol saat guru menjelaskan', 'tidur di kelas', 'bermain saat belajar'),
      I('L1', 'Sebelum belajar kita membaca ....', 'doa')
    ],
    'aa-A-13': [
      P('L1', 'Ketika memakai pakaian, kita mendahulukan anggota badan sebelah ...', 'kanan', 'kiri', 'atas', 'bawah'),
      P('L1', 'Sebelum mandi sebaiknya kita membaca ...', 'basmalah', 'azan', 'syahadat', 'salawat'),
      U('L2', 'Tuliskan dua adab ketika berpakaian!', 'Contoh benar: membaca basmalah/doa, mendahulukan anggota kanan saat memakai, memakai pakaian bersih dan menutup aurat. Skor sebanding jumlah adab yang benar.')
    ],
    'aa-A-14': [
      P('L1', 'Ketika bersin, kita mengucapkan ...', 'Alhamdulillah', 'Astaghfirullah', 'Bismillah', 'Subhanallah'),
      P('L2', 'Ketika menguap, sebaiknya kita ...', 'menutup mulut dengan tangan', 'membuka mulut lebar-lebar', 'bersuara keras', 'berlari'),
      I('L1', 'Orang yang mendengar kita bersin dan mengucap hamdalah menjawab dengan ucapan ....', 'Yarhamukallah')
    ],
    'aa-A-15': [
      P('L1', 'Makan dan minum sebaiknya dengan tangan ...', 'kanan', 'kiri', 'kedua-duanya', 'apa saja')
      , P('L1', 'Sebelum makan kita membaca ...', 'basmalah', 'hamdalah', 'istigfar', 'tahlil'),
      U('L2', 'Sebutkan tiga adab makan dan minum!', 'Contoh benar: membaca basmalah, memakai tangan kanan, duduk, tidak berlebihan, mengambil makanan yang dekat, membaca hamdalah sesudah makan. Skor sebanding jumlah adab yang benar.')
    ],
    'aa-A-16': [
      P('L1', 'Nabi Muhammad saw. dilahirkan di kota ...', 'Mekah', 'Madinah', 'Taif', 'Yaman'),
      P('L1', 'Julukan Nabi Muhammad saw. sejak muda yang berarti \'dapat dipercaya\' adalah ...', 'Al-Amin', 'As-Siddiq', 'Al-Faruq', 'Al-Karim'),
      I('L1', 'Nabi Muhammad saw. adalah nabi dan rasul yang ....', 'terakhir')
    ],
    'aa-A-17': [
      P('L1', 'Nabi Nuh a.s. diperintah Allah membuat ...', 'kapal (bahtera)', 'rumah', 'masjid', 'tembok'),
      P('L2', 'Pelajaran dari kisah Nabi Nuh a.s. adalah ...', 'sabar dalam berdakwah', 'boleh bersikap sombong', 'menolak nasihat', 'mudah marah'),
      U('L2', 'Ceritakan secara singkat kisah Nabi Nuh a.s.!', 'Memuat: Nuh berdakwah lama kepada kaumnya yang menolak; Nuh diperintah membuat kapal; terjadi banjir besar; orang-orang beriman selamat. Skor sebanding kelengkapan.')
    ],
    // ===================== AKIDAH AKHLAK FASE B =====================
    'aa-B-1': [
      P('L1', 'Al-Wahhab artinya Maha ...', 'Pemberi', 'Penyantun', 'Besar', 'Agung'),
      P('L1', 'Asmaulhusna yang berarti Maha Besar adalah ...', 'Al-Kabir', 'Al-Halim', 'Al-Wahhab', 'Al-\'Adhim'),
      I('L1', 'Al-\'Adhim artinya Maha ....', 'Agung')
    ],
    'aa-B-2': [
      P('L1', 'As-Sami\' artinya Maha ...', 'Mendengar', 'Melihat', 'Mengetahui', 'Melindungi'),
      P('L1', 'Asmaulhusna yang berarti Maha Mengetahui adalah ...', 'Al-\'Alim', 'Al-Bashir', 'As-Sami\'', 'Al-Waliy'),
      U('L2', 'Tuliskan arti As-Sami\', Al-Bashir, dan Al-\'Alim!', 'As-Sami\' = Maha Mendengar; Al-Bashir = Maha Melihat; Al-\'Alim = Maha Mengetahui. Skor sebanding jumlah arti yang benar.')
    ],
    'aa-B-3': [
      P('L1', 'Kitab yang diturunkan kepada Nabi Muhammad saw. adalah ...', 'Al-Qur\'an', 'Taurat', 'Zabur', 'Injil'),
      P('L1', 'Kitab Taurat diturunkan kepada Nabi ...', 'Musa', 'Daud', 'Isa', 'Ibrahim'),
      I('L1', 'Kitab Zabur diturunkan kepada Nabi ....', 'Daud')
    ],
    'aa-B-4': [
      P('L1', 'Jumlah nabi dan rasul yang wajib kita ketahui adalah ...', '25', '20', '40', '99'),
      P('L1', 'Nabi dan rasul terakhir adalah ...', 'Nabi Muhammad saw.', 'Nabi Isa a.s.', 'Nabi Musa a.s.', 'Nabi Ibrahim a.s.'),
      U('L1', 'Sebutkan lima nama nabi yang kamu ketahui!', 'Jawaban benar: lima nama nabi/rasul yang sah (mis. Adam, Nuh, Ibrahim, Ismail, Musa, Isa, Muhammad). Skor sebanding jumlah nama yang benar.')
    ],
    'aa-B-5': [
      P('L1', 'Ucapan \'Subhanallah\' artinya ...', 'Maha Suci Allah', 'Allah Maha Besar', 'Atas kehendak Allah', 'Segala puji bagi Allah'),
      P('L1', 'Ucapan \'Allahu Akbar\' artinya ...', 'Allah Maha Besar', 'Maha Suci Allah', 'Segala puji bagi Allah', 'Allah Maha Pengampun'),
      U('L2', 'Tuliskan arti Subhanallah, Allahu Akbar, dan Masya Allah beserta contoh penggunaannya!', 'Subhanallah = Maha Suci Allah (takjub); Allahu Akbar = Allah Maha Besar (kagum atau memulai kebaikan tertentu); Masya Allah = atas kehendak Allah (kagum pada nikmat/ciptaan). Skor sebanding kelengkapan arti dan contoh.')
    ],
    'aa-B-6': [
      P('L1', 'Bersyukur artinya ...', 'berterima kasih kepada Allah atas nikmat-Nya', 'mengeluh karena nikmat dirasa kurang banyak', 'meminta nikmat terus-menerus tanpa berusaha', 'menyalahkan keadaan ketika mendapat kesulitan'),
      P('L2', 'Contoh cara bersyukur adalah ...', 'menggunakan nikmat untuk hal yang baik', 'menyia-nyiakan nikmat yang diberikan Allah', 'mengeluh setiap kali tidak mendapat keinginan', 'iri dengan nikmat yang dimiliki teman'),
      I('L1', 'Ucapan syukur kepada Allah adalah ....', 'Alhamdulillah')
    ],
    'aa-B-7': [
      P('L1', 'Sikap pantang menyerah adalah ...', 'terus berusaha meski pernah gagal', 'berhenti sebelum mencoba', 'menyalahkan orang lain', 'mudah putus asa'),
      P('L2', 'Jika nilai ulanganmu kurang bagus, sikap yang benar adalah ...', 'belajar lebih giat', 'menyalahkan guru', 'berhenti belajar', 'menyontek saat ulangan berikutnya'),
      U('L2', 'Ceritakan pengalamanmu ketika kamu tidak menyerah dalam melakukan sesuatu!', 'Jawaban terbuka: memuat kegiatan yang dilakukan, hambatannya, usaha berulang, dan hasilnya. Skor sebanding kelengkapan dan kesesuaian dengan sikap pantang menyerah.')
    ],
    'aa-B-8': [
      P('L2', 'Contoh sikap pemberani yang benar adalah ...', 'berani mengakui kesalahan', 'berani berkelahi', 'berani berbohong', 'berani menyontek'),
      P('L1', 'Pemberani adalah sikap tidak takut untuk ...', 'membela kebenaran', 'menyakiti teman', 'melanggar aturan', 'menolak nasihat'),
      I('L2', 'Berani mengatakan yang benar dan mengakui kesalahan termasuk sikap ....', 'pemberani')
    ],
    'aa-B-9': [
      P('L1', 'Allah memerintahkan kita saling tolong-menolong dalam ...', 'kebaikan dan takwa', 'dosa dan permusuhan', 'kejahatan', 'keburukan'),
      P('L2', 'Contoh tolong-menolong di madrasah adalah ...', 'membantu teman yang kesulitan belajar', 'membiarkan teman yang jatuh', 'menertawakan teman', 'menyembunyikan buku teman'),
      U('L2', 'Tuliskan dua contoh tolong-menolong di lingkungan rumah!', 'Contoh benar antara lain: membantu orang tua, membantu tetangga, berbagi makanan. Skor sebanding jumlah contoh yang benar.')
    ],
    'aa-B-10': [
      P('L1', 'Amanah artinya ...', 'dapat dipercaya', 'suka ingkar janji', 'suka berbohong', 'tidak bertanggung jawab'),
      P('L2', 'Contoh sikap amanah adalah ...', 'mengembalikan barang pinjaman tepat waktu', 'menunda mengembalikan barang pinjaman', 'merusak barang pinjaman', 'melupakan janji'),
      I('L1', 'Lawan dari amanah adalah ....', 'khianat')
    ],
    'aa-B-11': [
      P('L1', 'Kikir artinya ...', 'tidak mau berbagi atau memberi', 'suka bersedekah kepada orang yang membutuhkan', 'senang menolong teman yang kesulitan', 'dermawan dan suka berbagi rezeki'),
      P('L1', 'Serakah adalah sikap ...', 'tidak pernah puas dan ingin menguasai semuanya', 'merasa cukup dengan apa yang dimiliki', 'mau berbagi dengan orang lain secara adil', 'sederhana dan tidak berlebihan'),
      U('L2', 'Jelaskan cara menghindari sikap kikir!', 'Contoh benar: membiasakan berbagi, bersedekah, bersyukur atas nikmat, menolong orang yang membutuhkan. Skor sebanding kejelasan cara yang disebutkan.')
    ],
    'aa-B-12': [
      P('L1', 'Adab kepada orang tua adalah ...', 'berkata sopan dan menaati perintah yang baik', 'menjawab dengan nada keras ketika diperintah', 'mengabaikan nasihat yang diberikan orang tua', 'membantah setiap perintah yang diberikan'),
      P('L2', 'Ketika dipanggil orang tua, sebaiknya kita ...', 'segera menjawab dan menemui mereka', 'pura-pura tidak mendengar', 'menjawab sambil marah', 'menunda tanpa alasan'),
      I('L1', 'Kita harus ... kepada kedua orang tua.', 'berbakti (berbuat baik)')
    ],
    'aa-B-13': [
      P('L1', 'Ketika bertemu guru, kita sebaiknya ...', 'mengucapkan salam dan menyapa dengan sopan', 'lewat begitu saja tanpa menyapa guru', 'berpura-pura tidak melihat agar tidak menyapa', 'berbicara dengan suara keras kepada guru'),
      P('L2', 'Ketika guru menjelaskan pelajaran, sikap yang benar adalah ...', 'memperhatikan dan tidak berbicara sendiri', 'mengobrol dengan teman sebangku', 'bermain sendiri di dalam kelas', 'memotong penjelasan guru tanpa izin'),
      U('L2', 'Tuliskan tiga adab kepada guru!', 'Contoh benar: mengucapkan salam, mendengarkan penjelasan, tidak memotong pembicaraan, mengerjakan tugas, berkata sopan. Skor sebanding jumlah adab yang benar.')
    ],
    'aa-B-14': [
      P('L1', 'Adab kepada teman adalah ...', 'saling menghormati dan membantu', 'mengejek dan menertawakan teman', 'membeda-bedakan teman yang kaya dan miskin', 'memusuhi teman yang berbeda pendapat'),
      P('L2', 'Jika teman berbuat salah kepadamu, sebaiknya kamu ...', 'memaafkannya', 'membalas dendam', 'menjauhinya selamanya', 'mengejeknya'),
      I('L1', 'Kita tidak boleh memanggil teman dengan julukan yang ....', 'buruk')
    ],
    'aa-B-15': [
      P('L1', 'Putra Nabi Ibrahim a.s. yang diperintah untuk disembelih adalah ...', 'Ismail', 'Ishaq', 'Yakub', 'Yusuf'),
      P('L1', 'Ketaatan Nabi Ibrahim a.s. dan Nabi Ismail a.s. diperingati dengan ibadah ...', 'kurban', 'zakat fitrah', 'puasa', 'umrah'),
      U('L2', 'Ceritakan kisah ketaatan Nabi Ibrahim a.s. dan Nabi Ismail a.s.!', 'Memuat: Ibrahim menerima perintah Allah untuk menyembelih Ismail; Ismail rela dan taat; Allah mengganti dengan hewan sembelihan; menjadi asal ibadah kurban. Skor sebanding kelengkapan.')
    ],
    // ===================== AKIDAH AKHLAK FASE C =====================
    'aa-C-1': [
      P('L1', 'Al-Muhyi artinya Maha ...', 'Menghidupkan', 'Kuat', 'Teliti', 'Esa'),
      P('L1', 'Al-Wahid artinya Maha ...', 'Esa', 'Kuat', 'Menghidupkan', 'Pengampun'),
      I('L1', 'Al-Qawiyy artinya Maha ....', 'Kuat')
    ],
    'aa-C-2': [
      P('L1', 'Al-Ghaffar artinya Maha ...', 'Pengampun', 'Luas', 'Esa', 'Kuat'),
      P('L1', 'Asmaulhusna yang berarti Maha Luas (karunia dan ilmu-Nya) adalah ...', 'Al-Waasi\'', 'Al-Ghaffar', 'As-Samad', 'Al-Ahad'),
      U('L2', 'Berikan contoh perilaku yang mencerminkan sifat Al-Ghaffar!', 'Contoh benar: mudah memaafkan kesalahan teman/orang lain, tidak menyimpan dendam, bertobat dan memohon ampun. Skor sebanding kejelasan contoh.')
    ],
    'aa-C-3': [
      P('L1', 'Beriman kepada hari akhir berarti percaya bahwa ...', 'dunia ini akan berakhir pada hari kiamat', 'dunia kekal selamanya', 'kehidupan hanya sekali tanpa pertanggungjawaban', 'kiamat tidak akan terjadi'),
      P('L1', 'Hari ketika semua amal manusia dihitung dan dibalas disebut hari ...', 'pembalasan', 'raya', 'libur', 'pasar'),
      I('L1', 'Tempat balasan bagi orang yang beriman dan beramal saleh adalah ....', 'surga')
    ],
    'aa-C-4': [
      P('L1', 'Beriman kepada qada dan qadar artinya percaya bahwa semua yang terjadi ...', 'atas ketentuan Allah', 'karena kebetulan', 'tanpa sebab', 'hanya karena usaha manusia'),
      P('L2', 'Sikap yang benar ketika menghadapi musibah adalah ...', 'bersabar dan tetap berusaha', 'menyalahkan takdir', 'berputus asa', 'marah kepada orang lain'),
      U('L2', 'Jelaskan arti beriman kepada qada dan qadar serta contoh sikap yang mencerminkannya!', 'Memuat: percaya semua kejadian atas ketentuan Allah; contoh sikap: berusaha dan berdoa lalu bertawakal, bersyukur saat berhasil, bersabar saat gagal. Skor sebanding kelengkapan arti dan contoh.')
    ],
    'aa-C-5': [
      P('L1', 'Kalimat tarji\' diucapkan ketika ...', 'mendapat musibah', 'akan makan', 'bersin', 'mendapat hadiah'),
      P('L1', 'Astaghfirullah diucapkan untuk ...', 'memohon ampun kepada Allah', 'memuji Allah', 'mengagungkan Allah', 'meminta pertolongan'),
      I('L1', 'Kalimat \'Laa ilaaha illallah\' disebut kalimat ....', 'tahlil')
    ],
    'aa-C-6': [
      P('L1', 'Sabar artinya ...', 'menahan diri dalam menghadapi ujian dan kesulitan', 'cepat marah ketika menghadapi kesulitan', 'mudah menyerah ketika mendapat ujian', 'suka mengeluh dan menyalahkan keadaan'),
      P('L2', 'Contoh sikap sabar adalah ...', 'tidak marah ketika diejek teman', 'membalas ejekan dengan ejekan juga', 'mengadu domba antar teman', 'meninggalkan kelas sambil marah-marah'),
      U('L2', 'Ceritakan contoh sikap sabar yang pernah kamu lakukan!', 'Jawaban terbuka: memuat situasi, tindakan sabar, dan akibat baiknya. Skor sebanding kelengkapan dan kesesuaian.')
    ],
    'aa-C-7': [
      P('L1', 'Disiplin berarti ...', 'taat pada aturan dan tepat waktu', 'bebas berbuat sesuka hati', 'datang terlambat', 'melanggar aturan'),
      P('L2', 'Contoh sikap mandiri adalah ...', 'merapikan tempat tidur sendiri', 'menunggu disuruh', 'meminta tolong untuk semua hal', 'menyalin pekerjaan teman'),
      I('L1', 'Mengerjakan tugas sendiri tanpa bergantung pada orang lain disebut sikap ....', 'mandiri')
    ],
    'aa-C-8': [
      P('L1', 'Pemaaf adalah sikap ...', 'mudah memaafkan kesalahan orang lain', 'menyimpan dendam kepada orang yang bersalah', 'selalu membalas kesalahan orang lain', 'tidak mau bertegur sapa'),
      P('L1', 'Bertanggung jawab berarti ...', 'menyelesaikan tugas dan menanggung akibat perbuatan sendiri', 'melempar kesalahan kepada orang lain dan menghindari tugas', 'lari dari tugas yang sudah diberikan kepadanya', 'menyalahkan teman ketika terjadi masalah'),
      U('L2', 'Tuliskan contoh sikap pemaaf dan sikap bertanggung jawab di madrasah!', 'Pemaaf: mis. memaafkan teman yang meminta maaf. Bertanggung jawab: mis. melaksanakan piket, merapikan alat sendiri. Skor sebanding kelengkapan dua contoh.')
    ],
    'aa-C-9': [
      P('L1', 'Adil artinya ...', 'memberi hak kepada yang berhak dengan semestinya', 'berpihak kepada teman dekat saja', 'membeda-bedakan orang menurut kekayaannya', 'mengutamakan diri sendiri dalam segala hal'),
      P('L2', 'Contoh sikap adil adalah ...', 'membagi tugas piket secara merata', 'memberi tugas lebih banyak kepada teman yang tidak disukai', 'memilih teman tertentu saja', 'membagi makanan hanya untuk sahabat'),
      I('L1', 'Lawan dari adil adalah ....', 'zalim (curang)')
    ],
    'aa-C-10': [
      P('L2', 'Cara menghindari sifat pemarah adalah ...', 'membaca ta\'awuz dan berwudu', 'berteriak dan membanting barang', 'membalas kemarahan dengan marah juga', 'memukul meja agar orang takut'),
      P('L1', 'Fasik adalah orang yang ...', 'sering melanggar perintah Allah', 'rajin beribadah dan taat kepada Allah', 'dermawan kepada fakir miskin', 'jujur dalam perkataan dan perbuatan'),
      U('L2', 'Sebutkan tiga cara mengendalikan rasa marah!', 'Contoh benar: membaca ta\'awuz, berwudu, diam, mengubah posisi (duduk/berbaring), menarik napas dalam, memaafkan. Skor sebanding jumlah cara yang benar.')
    ],
    'aa-C-11': [
      P('L1', 'Pilih kasih artinya ...', 'membeda-bedakan perlakuan terhadap orang lain', 'berlaku adil kepada semua orang', 'menyayangi semua orang', 'berbagi dengan merata kepada semua teman'),
      P('L1', 'Iri hati adalah sikap ...', 'tidak senang melihat orang lain mendapat nikmat', 'senang melihat teman berhasil', 'bersyukur atas nikmat orang lain', 'turut bahagia atas nikmat teman'),
      I('L1', 'Sikap yang hanya memikirkan kepentingan diri sendiri disebut ....', 'egois')
    ],
    'aa-C-12': [
      P('L1', 'Ketika bertamu, hal pertama yang dilakukan adalah ...', 'mengucapkan salam dan mengetuk pintu', 'langsung masuk tanpa mengetuk pintu', 'berteriak memanggil dari luar rumah', 'mengintip dari jendela'),
      P('L2', 'Adab bertamu yang benar adalah ...', 'pamit saat pulang', 'berlama-lama tanpa diminta', 'membuka lemari tuan rumah', 'bermain di kamar tuan rumah'),
      U('L2', 'Tuliskan tiga adab bertamu!', 'Contoh benar: mengucapkan salam, mengetuk pintu dengan sopan, tidak masuk sebelum diizinkan, duduk dengan sopan, tidak berlama-lama, pamit. Skor sebanding jumlah adab yang benar.')
    ],
    'aa-C-13': [
      P('L2', 'Jika tetangga sedang sakit, sikap yang baik adalah ...', 'menjenguknya dan mendoakannya', 'tidak peduli dengan keadaan tetangga', 'menjauhinya agar tidak tertular', 'menertawakannya karena sedang sakit'),
      P('L2', 'Contoh menjaga lingkungan adalah ...', 'membuang sampah pada tempatnya', 'membakar sampah sembarangan', 'mencoret tembok', 'menebang pohon sembarangan'),
      I('L1', 'Orang yang tinggal di dekat rumah kita disebut ....', 'tetangga')
    ],
    'aa-C-14': [
      P('L1', 'Raja zalim yang dihadapi Nabi Musa a.s. bernama ...', 'Fir\'aun', 'Namrud', 'Abrahah', 'Qarun'),
      P('L1', 'Untuk menyelamatkan Nabi Musa a.s. dan pengikutnya, Allah membelah ...', 'laut', 'gunung', 'bukit', 'sungai kecil'),
      U('L2', 'Sebutkan dua sikap yang dapat diteladani dari Nabi Musa a.s.!', 'Contoh benar: berani menghadapi penguasa zalim, teguh pendirian, bertawakal kepada Allah, sabar. Skor sebanding jumlah sikap yang benar.')
    ],
    'aa-C-15': [
      P('L1', 'Ibu Nabi Isa a.s. bernama ...', 'Maryam', 'Aminah', 'Khadijah', 'Aisyah'),
      P('L1', 'Kitab yang diturunkan kepada Nabi Isa a.s. adalah ...', 'Injil', 'Taurat', 'Zabur', 'Al-Qur\'an'),
      I('L2', 'Sikap yang diteladani dari Nabi Isa a.s. ketika menghadapi kaumnya adalah ....', 'sabar')
    ],
    // ===================== FIKIH FASE A =====================
    'fikih-A-1': [
      P('L1', 'Jumlah rukun Islam ada ...', 'lima', 'empat', 'enam', 'tujuh'),
      P('L1', 'Rukun Islam yang ketiga adalah ...', 'zakat', 'salat', 'puasa', 'haji'),
      U('L1', 'Sebutkan lima rukun Islam secara berurutan!', 'Mengucapkan dua kalimat syahadat; mendirikan salat; menunaikan zakat; berpuasa di bulan Ramadan; berhaji bagi yang mampu. Skor sebanding jumlah butir benar dan berurutan.')
    ],
    'fikih-A-2': [
      P('L1', 'Syahadatain artinya ...', 'dua kalimat syahadat', 'dua rukun salat', 'dua macam zakat', 'dua kitab suci'),
      P('L1', 'Orang yang masuk Islam mengucapkan ...', 'dua kalimat syahadat', 'kalimat azan', 'kalimat ikamah', 'doa sebelum makan')
    ],
    'fikih-A-3': [
      P('L1', 'Taharah artinya ...', 'bersuci', 'makan', 'tidur', 'bermain'),
      P('L1', 'Bersuci dari hadas kecil dilakukan dengan ...', 'berwudu', 'mandi besar', 'menyikat gigi', 'menyisir rambut'),
      I('L1', 'Air yang suci dan menyucikan disebut air ....', 'mutlak'),
      U('L1', 'Sebutkan empat anggota tubuh yang dibasuh atau diusap ketika berwudu!', 'Wajah, kedua tangan sampai siku, sebagian kepala, kedua kaki sampai mata kaki. Skor sebanding jumlah anggota yang benar.')
    ],
    'fikih-A-4': [
      P('L1', 'Jumlah salat fardu dalam sehari semalam adalah ...', 'lima', 'tiga', 'empat', 'enam'),
      P('L1', 'Salat yang dikerjakan ketika matahari terbenam adalah salat ...', 'Magrib', 'Subuh', 'Zuhur', 'Isya'),
      I('L1', 'Salat Subuh terdiri dari ... rakaat.', 'dua'),
      U('L1', 'Sebutkan lima salat fardu beserta jumlah rakaatnya!', 'Subuh 2, Zuhur 4, Asar 4, Magrib 3, Isya 4. Skor sebanding jumlah pasangan yang benar.')
    ],
    'fikih-A-5': [
      P('L1', 'Orang yang memimpin salat berjemaah disebut ...', 'imam', 'makmum', 'muazin', 'khatib'),
      P('L2', 'Pahala salat berjemaah dibandingkan salat sendirian adalah ...', 'lebih banyak', 'lebih sedikit', 'sama saja', 'tidak ada'),
      I('L1', 'Orang yang mengikuti imam disebut ....', 'makmum')
    ],
    'fikih-A-6': [
      P('L1', 'Azan dikumandangkan untuk ...', 'memberi tahu masuknya waktu salat', 'memanggil teman bermain', 'mengakhiri salat', 'mengawali belajar'),
      P('L1', 'Ikamah dibaca ...', 'sebelum salat berjemaah dimulai', 'sesudah salat berjemaah selesai', 'sebelum mengambil air wudu', 'ketika khatib sedang berkhutbah'),
      I('L1', 'Orang yang mengumandangkan azan disebut ....', 'muazin')
    ],
    'fikih-A-7': [
      P('L1', 'Zikir yang dianjurkan dibaca sesudah salat antara lain ...', 'Subhanallah, Alhamdulillah, dan Allahu Akbar', 'Basmalah dan ta\'awuz', 'Istirja\' dan hauqalah saja', 'Doa ketika masuk ke dalam kamar mandi'),
      P('L1', 'Membaca Subhanallah, Alhamdulillah, dan Allahu Akbar sesudah salat biasanya masing-masing sebanyak ... kali.', '33', '10', '3', '100'),
      I('L1', 'Bacaan \'Subhanallah\' disebut juga ....', 'tasbih')
    ],
    // ===================== FIKIH FASE B =====================
    'fikih-B-1': [
      P('L1', 'Puasa Ramadan dilakukan sejak ... sampai terbenam matahari.', 'terbit fajar (waktu Subuh)', 'tengah malam setelah salat Isya', 'waktu Zuhur ketika matahari tinggi', 'terbit matahari di pagi hari'),
      P('L1', 'Makan di waktu menjelang Subuh untuk berpuasa disebut ...', 'sahur', 'berbuka', 'iktikaf', 'tarawih'),
      I('L1', 'Hal yang membatalkan puasa antara lain makan dan ....', 'minum dengan sengaja'),
      U('L2', 'Sebutkan tiga hal yang membatalkan puasa!', 'Makan dan minum dengan sengaja, muntah dengan sengaja, haid/nifas, dan sebagainya yang sesuai fikih. Skor sebanding jumlah hal yang benar.')
    ],
    'fikih-B-2': [
      P('L1', 'Salat Jumat dikerjakan pada waktu ...', 'Zuhur di hari Jumat', 'Subuh di hari Jumat', 'Magrib di hari Jumat', 'Isya di hari Jumat'),
      P('L1', 'Sebelum salat Jumat, khatib menyampaikan ...', 'khutbah', 'ikamah saja', 'doa makan', 'tausiyah tanpa rukun'),
      I('L1', 'Salat Jumat terdiri dari ... rakaat.', 'dua')
    ],
    'fikih-B-3': [
      P('L1', 'Salat sunah yang dikerjakan pada malam hari setelah bangun tidur adalah ...', 'Tahajud', 'Duha', 'Asar', 'Subuh'),
      P('L1', 'Salat sunah yang dikerjakan pada pagi hari setelah matahari naik adalah ...', 'Duha', 'Tahajud', 'Witir', 'Tarawih'),
      U('L1', 'Sebutkan tiga contoh salat sunah!', 'Contoh benar: rawatib, duha, tahajud, witir, tarawih, istikharah, salat hari raya. Skor sebanding jumlah contoh benar.')
    ],
    'fikih-B-4': [
      P('L1', 'Rukhsah artinya ...', 'keringanan', 'kewajiban', 'larangan', 'kesunahan'),
      P('L2', 'Contoh rukhsah pada salat adalah ...', 'salat sambil duduk bagi orang yang sakit', 'meninggalkan salat tanpa alasan', 'salat tanpa wudu', 'menunda salat sesuka hati'),
      I('L1', 'Menggabungkan dua salat dalam satu waktu karena bepergian disebut salat ....', 'jamak')
    ],
    'fikih-B-5': [
      P('L1', 'Salah satu tanda balig pada anak laki-laki adalah ...', 'mimpi basah', 'bertambah tinggi', 'bertambah berat', 'gigi tanggal'),
      P('L1', 'Salah satu tanda balig pada anak perempuan adalah ...', 'mengalami haid', 'suka bermain', 'gigi tanggal', 'bertambah tinggi'),
      U('L1', 'Sebutkan satu tanda balig pada anak laki-laki dan satu tanda balig pada anak perempuan!', 'Laki-laki: mimpi basah; perempuan: haid. Skor sebanding jumlah jawaban benar.')
    ],
    'fikih-B-6': [
      P('L1', 'Hadas besar disucikan dengan ...', 'mandi wajib', 'berwudu', 'mencuci tangan', 'menyikat gigi'),
      P('L1', 'Salah satu penyebab hadas besar adalah ...', 'haid', 'buang air kecil', 'kentut', 'tidur'),
      I('L1', 'Mandi untuk menyucikan hadas besar disebut mandi ....', 'wajib (junub)')
    ],
    // ===================== FIKIH FASE C =====================
    'fikih-C-1': [
      P('L1', 'Zakat fitrah dikeluarkan pada bulan ...', 'Ramadan', 'Syaban', 'Zulhijah', 'Rajab'),
      P('L2', 'Sedekah berbeda dengan zakat karena sedekah ...', 'hukumnya sunah dan tidak ditentukan jumlahnya', 'hukumnya wajib dan ditentukan jumlahnya', 'hanya dikeluarkan setahun sekali', 'hanya untuk orang kaya'),
      I('L1', 'Zakat fitrah dibayarkan sebelum salat ....', 'Idulfitri'),
      U('L2', 'Jelaskan perbedaan zakat fitrah, infak, dan sedekah!', 'Zakat fitrah: wajib, dikeluarkan pada bulan Ramadan sebelum salat Idulfitri; infak: mengeluarkan harta untuk kebaikan, tidak ditentukan; sedekah: pemberian sukarela berupa harta atau perbuatan baik. Skor sebanding kelengkapan.')
    ],
    'fikih-C-2': [
      P('L1', 'Hewan yang sah dijadikan kurban adalah ...', 'kambing', 'ayam', 'bebek', 'kucing'),
      P('L1', 'Hewan yang TIDAK sah dijadikan kurban adalah ...', 'ayam', 'sapi', 'kambing', 'unta'),
      I('L1', 'Penyembelihan hewan kurban dimulai pada tanggal ... Zulhijah.', '10'),
      U('L2', 'Sebutkan dua hikmah berkurban!', 'Contoh benar: meneladani ketaatan Nabi Ibrahim, mendekatkan diri kepada Allah, berbagi dengan sesama, melatih keikhlasan. Skor sebanding jumlah hikmah yang benar.')
    ],
    'fikih-C-3': [
      P('L1', 'Ibadah haji dilaksanakan di kota ...', 'Mekah', 'Madinah', 'Jeddah', 'Taif'),
      P('L1', 'Tempat wukuf pada ibadah haji adalah ...', 'Arafah', 'Mina', 'Muzdalifah', 'Safa'),
      I('L1', 'Bangunan berbentuk kubus yang dikelilingi saat tawaf adalah ....', 'Kakbah')
    ],
    'fikih-C-4': [
      P('L1', 'Makanan halal adalah makanan yang ...', 'boleh dimakan menurut syariat dan baik', 'dilarang dimakan menurut syariat', 'membahayakan kesehatan', 'diperoleh dengan mencuri'),
      P('L1', 'Contoh makanan haram adalah ...', 'daging babi', 'nasi', 'sayur bayam', 'ikan laut'),
      I('L1', 'Daging babi hukumnya ....', 'haram'),
      U('L2', 'Mengapa kita harus memilih makanan yang halal dan baik?', 'Memuat salah satu atau lebih alasan: perintah Allah, menjaga kesehatan, mendatangkan keberkahan. Skor sebanding kejelasan alasan.')
    ],
    'fikih-C-5': [
      P('L1', 'Unsur yang harus ada dalam jual beli adalah ...', 'penjual, pembeli, dan barang', 'hanya penjual dan barang', 'hanya barang dan uang', 'hanya pembeli dan uang'),
      P('L1', 'Perbuatan yang dilarang dalam jual beli adalah ...', 'mengurangi timbangan', 'menimbang dengan jujur', 'menjelaskan kondisi barang', 'menepati janji'),
      I('L1', 'Ucapan penawaran dan penerimaan dalam jual beli disebut ijab dan ....', 'kabul')
    ],
    'fikih-C-6': [
      P('L1', 'Barang yang dipinjam harus dikembalikan ...', 'tepat waktu dan dalam keadaan baik', 'kapan saja sesuka peminjam', 'dalam keadaan rusak karena dipakai', 'setelah dipinjamkan kepada orang lain'),
      P('L2', 'Jika barang pinjaman rusak karena kelalaian peminjam, maka peminjam harus ...', 'mengganti atau memperbaikinya', 'membiarkannya', 'menyalahkan pemilik', 'menyembunyikannya'),
      I('L1', 'Barang yang dipinjam harus dikembalikan dalam keadaan ....', 'baik'),
      U('L2', 'Tuliskan dua adab meminjam barang!', 'Contoh benar: meminta izin pemilik, menjaga barang, mengembalikan tepat waktu, berterima kasih. Skor sebanding jumlah adab yang benar.')
    ],
    'fikih-C-7': [
      P('L1', 'Gasab adalah ...', 'mengambil atau menggunakan barang orang lain tanpa izin', 'meminjam barang dengan izin pemiliknya', 'membeli barang dengan harga yang pantas', 'memberi hadiah kepada orang lain dengan ikhlas'),
      P('L1', 'Hukum gasab adalah ...', 'haram', 'wajib', 'sunah', 'mubah'),
      I('L2', 'Menggunakan barang teman tanpa izin termasuk perbuatan ....', 'gasab')
    ],
    'fikih-C-8': [
      P('L1', 'Barang temuan dalam istilah fikih disebut ...', 'luqathah', 'gasab', 'zakat', 'wakaf'),
      P('L2', 'Jika menemukan barang yang bukan milik kita, sebaiknya ...', 'mengumumkannya dan mengembalikan kepada pemiliknya', 'menyimpannya sendiri tanpa memberi tahu siapa pun', 'menjualnya dan memakai uangnya', 'membuangnya karena dianggap tidak berguna'),
      U('L2', 'Apa yang kamu lakukan jika menemukan dompet di jalan? Jelaskan!', 'Memuat: tidak mengambil untuk diri sendiri; mengumumkan/menyerahkan kepada pihak berwenang atau guru; mengembalikan kepada pemilik. Skor sebanding kelengkapan.')
    ],
    // ===================== SKI FASE B =====================
    'ski-B-1': [
      P('L1', 'Zaman masyarakat Arab sebelum datangnya Islam disebut zaman ...', 'jahiliah', 'modern', 'kekhalifahan', 'kerajaan'),
      P('L1', 'Salah satu kebiasaan buruk masyarakat jahiliah adalah ...', 'menyembah berhala', 'menolong tetangga', 'menuntut ilmu', 'bersedekah'),
      I('L1', 'Kota tempat Nabi Muhammad saw. dilahirkan adalah ....', 'Mekah'),
      U('L2', 'Sebutkan dua kebiasaan buruk masyarakat jahiliah!', 'Contoh benar: menyembah berhala, berjudi, minum khamr, mengubur bayi perempuan, saling berperang antarsuku. Skor sebanding jumlah kebiasaan yang benar.')
    ],
    'ski-B-2': [
      P('L1', 'Ayah Nabi Muhammad saw. bernama ...', 'Abdullah', 'Abdul Muttalib', 'Abu Talib', 'Abu Lahab'),
      P('L1', 'Ibu Nabi Muhammad saw. bernama ...', 'Aminah', 'Khadijah', 'Aisyah', 'Fatimah'),
      I('L1', 'Nabi Muhammad saw. dilahirkan pada Tahun ....', 'Gajah')
    ],
    'ski-B-3': [
      P('L1', 'Wahyu pertama diterima Nabi Muhammad saw. di gua ...', 'Hira', 'Tsur', 'Uhud', 'Arafah'),
      P('L1', 'Surah yang pertama kali diturunkan kepada Nabi Muhammad saw. adalah ...', 'Al-\'Alaq', 'Al-Fatihah', 'Al-Ikhlas', 'An-Nas'),
      I('L1', 'Malaikat yang menyampaikan wahyu pertama adalah ....', 'Jibril')
    ],
    'ski-B-4': [
      P('L1', 'Orang pertama dari kalangan wanita yang masuk Islam adalah ...', 'Khadijah', 'Aisyah', 'Fatimah', 'Aminah'),
      P('L1', 'Orang pertama dari kalangan laki-laki dewasa yang masuk Islam adalah ...', 'Abu Bakar', 'Umar', 'Usman', 'Abu Jahal'),
      U('L2', 'Ceritakan satu bentuk gangguan kaum Quraisy terhadap Nabi dan para sahabat serta sikap mereka!', 'Contoh gangguan: boikot, penyiksaan sahabat, penghinaan/pelemparan di Taif. Sikap: sabar, tabah, tidak membalas, terus berdakwah. Skor sebanding kelengkapan.')
    ],
    'ski-B-5': [
      P('L1', 'Nabi Muhammad saw. berhijrah dari Mekah ke ...', 'Madinah', 'Taif', 'Habasyah', 'Yaman'),
      P('L1', 'Sahabat yang menemani Nabi Muhammad saw. berhijrah adalah ...', 'Abu Bakar', 'Umar', 'Usman', 'Ali'),
      I('L1', 'Penduduk Madinah yang menolong kaum Muhajirin disebut kaum ....', 'Ansar'),
      U('L2', 'Mengapa Nabi Muhammad saw. berhijrah ke Madinah? Jelaskan!', 'Memuat: gangguan dan ancaman kaum Quraisy yang semakin berat; perintah Allah; penduduk Madinah bersedia menerima dan menolong; Islam dapat berkembang. Skor sebanding kelengkapan.')
    ],
    'ski-B-6': [
      P('L1', 'Isra adalah perjalanan Nabi Muhammad saw. dari Masjidilharam ke ...', 'Masjidilaksa', 'Masjid Nabawi', 'Masjid Quba', 'Masjid Kufah'),
      P('L1', 'Perintah yang diterima Nabi Muhammad saw. pada peristiwa Mikraj adalah ...', 'salat lima waktu', 'puasa Ramadan', 'zakat', 'haji'),
      I('L1', 'Peristiwa Isra Mikraj terjadi pada bulan ....', 'Rajab')
    ],
    // ===================== SKI FASE C =====================
    'ski-C-1': [
      P('L1', 'Piagam yang mengatur hidup bersama antara muslim dan nonmuslim di Madinah disebut ...', 'Piagam Madinah', 'Piagam Mekah', 'Perjanjian Hudaibiyah', 'Piagam Jakarta'),
      P('L1', 'Masjid pertama yang dibangun Nabi Muhammad saw. ketika tiba di Madinah adalah ...', 'Masjid Quba', 'Masjidilaksa', 'Masjidilharam', 'Masjid Kufah'),
      I('L1', 'Aturan hidup bersama di Madinah yang dibuat Nabi disebut Piagam ....', 'Madinah'),
      U('L2', 'Teladan apa yang dapat kita ambil dari sikap Nabi terhadap nonmuslim di Madinah?', 'Memuat: toleransi, menjaga kerukunan, menghormati kebebasan beragama, bekerja sama menjaga keamanan. Skor sebanding kejelasan teladan.')
    ],
    'ski-C-2': [
      P('L1', 'Nabi Muhammad saw. wafat di kota ...', 'Madinah', 'Mekah', 'Taif', 'Hudaibiyah'),
      P('L1', 'Haji yang dilakukan Nabi Muhammad saw. sebelum wafat disebut haji ...', 'wada\'', 'akbar', 'ifrad', 'umrah'),
      I('L1', 'Haji terakhir Nabi Muhammad saw. disebut Haji ....', 'Wada\'')
    ],
    'ski-C-3': [
      P('L1', 'Khalifah pertama setelah Nabi Muhammad saw. wafat adalah ...', 'Abu Bakar Ash-Shiddiq', 'Umar bin Khattab', 'Usman bin Affan', 'Ali bin Abi Thalib'),
      P('L1', 'Gelar Abu Bakar adalah ...', 'Ash-Shiddiq', 'Al-Faruq', 'Zun Nurain', 'Al-Amin'),
      U('L2', 'Sebutkan dua sifat teladan Abu Bakar Ash-Shiddiq!', 'Contoh benar: jujur, membenarkan Nabi, dermawan, setia, sabar. Skor sebanding jumlah sifat yang benar.')
    ],
    'ski-C-4': [
      P('L1', 'Khalifah kedua adalah ...', 'Umar bin Khattab', 'Abu Bakar', 'Usman bin Affan', 'Ali bin Abi Thalib'),
      P('L1', 'Gelar Umar bin Khattab adalah ...', 'Al-Faruq', 'Ash-Shiddiq', 'Zun Nurain', 'Al-Amin'),
      I('L2', 'Al-Faruq artinya pembeda antara yang hak dan yang ....', 'batil')
    ],
    'ski-C-5': [
      P('L1', 'Khalifah ketiga adalah ...', 'Usman bin Affan', 'Umar bin Khattab', 'Abu Bakar', 'Ali bin Abi Thalib'),
      P('L1', 'Sifat yang menonjol pada Usman bin Affan adalah ...', 'dermawan dan pemalu', 'keras kepala', 'pendendam', 'kikir'),
      I('L1', 'Pada masa Usman bin Affan, Al-Qur\'an dibukukan menjadi Mushaf ....', 'Usmani')
    ],
    'ski-C-6': [
      P('L1', 'Khalifah keempat adalah ...', 'Ali bin Abi Thalib', 'Usman bin Affan', 'Umar bin Khattab', 'Abu Bakar'),
      P('L1', 'Ali bin Abi Thalib adalah menantu Nabi, suami dari ...', 'Fatimah az-Zahra', 'Khadijah', 'Aisyah', 'Zainab'),
      U('L2', 'Sebutkan dua sifat teladan Ali bin Abi Thalib!', 'Contoh benar: pemberani, cerdas dan berilmu, sederhana, setia kepada Nabi. Skor sebanding jumlah sifat yang benar.')
    ],
    'ski-C-7': [
      P('L1', 'Wali Sanga artinya ...', 'sembilan wali', 'tujuh wali', 'sepuluh wali', 'lima wali'),
      P('L1', 'Wali Sanga menyebarkan Islam terutama di pulau ...', 'Jawa', 'Sumatra', 'Sulawesi', 'Papua'),
      I('L2', 'Sunan ... menyebarkan Islam melalui kesenian wayang.', 'Kalijaga'),
      U('L1', 'Sebutkan tiga nama anggota Wali Sanga!', 'Contoh benar: Maulana Malik Ibrahim, Sunan Ampel, Sunan Bonang, Sunan Drajat, Sunan Giri, Sunan Kalijaga, Sunan Kudus, Sunan Muria, Sunan Gunung Jati. Skor sebanding jumlah nama yang benar.')
    ],
    // ===================== BAHASA ARAB FASE A (kelas 1-2; kunci TP sama dengan js/data-tp-mi.js 'ba-A-n') =====================
    'ba-A-1': [
      P('L1', 'Arti "اسْمِي أَحْمَدُ" adalah ...', 'Namaku Ahmad', 'Aku berasal dari Jakarta', 'Aku seorang murid', 'Aku suka belajar'),
      P('L1', 'Arti "مَا اسْمُكَ؟" adalah ...', 'Siapa namamu?', 'Dari mana asalmu?', 'Apa kabarmu?', 'Berapa umurmu?'),
      I('L1', 'Arti "أَنَا" adalah ....', 'saya (aku)'),
      P('L1', 'Arti "اسْمِي" adalah ...', 'namaku', 'saya', 'kamu (laki-laki)', 'dia (laki-laki)'),
      P('L1', 'Arti "أَنَا" adalah ...', 'saya', 'kamu (laki-laki)', 'dia (laki-laki)', 'dia (perempuan)'),
      P('L1', 'Bahasa Arab "kamu (laki-laki)" adalah ...', 'أَنْتَ', 'هُوَ', 'هِيَ', 'شُكْرًا'),
      I('L1', 'Arti "هُوَ" adalah ....', 'dia (laki-laki)')
    ],
    'ba-A-2': [
      P('L1', 'Arti "أُمِّي" adalah ...', 'ibuku', 'ayahku', 'kakekku', 'saudara perempuanku'),
      P('L1', 'Bahasa Arab "ayahku" adalah ...', 'أَبِي', 'أُمِّي', 'أَخِي', 'جَدِّي'),
      I('L1', 'Arti "جَدَّتِي" adalah ... ku.', 'nenek'),
      U('L1', 'Tuliskan arti dari: أَبِي, أُمِّي, dan أَخِي!', 'ayahku; ibuku; saudara laki-lakiku (kakak/adik laki-laki). Skor sebanding jumlah arti yang benar.'),
      P('L1', 'Arti "أَبِي" adalah ...', 'ayahku', 'ibuku', 'saudara laki-lakiku', 'saudara perempuanku'),
      P('L1', 'Bahasa Arab "ibuku" adalah ...', 'أُمِّي', 'أَخِي', 'أُخْتِي', 'جَدِّي'),
      P('L1', 'Arti "أَخِي" adalah ...', 'saudara laki-lakiku', 'saudara perempuanku', 'kakekku', 'nenekku'),
      I('L1', 'Arti "أُخْتِي" adalah ....', 'saudara perempuanku')
    ],
    'ba-A-3': [
      P('L1', 'Arti "مَطْبَخٌ" adalah ...', 'dapur', 'kamar mandi', 'pintu', 'jendela'),
      P('L1', 'Bahasa Arab "pintu" adalah ...', 'بَابٌ', 'نَافِذَةٌ', 'غُرْفَةٌ', 'بَيْتٌ'),
      I('L1', 'Arti "بَيْتٌ" adalah ....', 'rumah'),
      P('L1', 'Arti "بَيْتٌ" adalah ...', 'rumah', 'kamar', 'dapur', 'kamar mandi'),
      P('L1', 'Arti "غُرْفَةٌ" adalah ...', 'kamar', 'dapur', 'kamar mandi', 'taman'),
      P('L1', 'Bahasa Arab "dapur" adalah ...', 'مَطْبَخٌ', 'حَمَّامٌ', 'حَدِيقَةٌ', 'بَابٌ'),
      I('L1', 'Arti "حَمَّامٌ" adalah ....', 'kamar mandi')
    ],
    'ba-A-4': [
      P('L1', 'Arti "قَلَمٌ" adalah ...', 'pena', 'buku', 'penggaris', 'meja'),
      P('L1', 'Bahasa Arab "buku" adalah ...', 'كِتَابٌ', 'قَلَمٌ', 'كُرْسِيٌّ', 'سَبُّورَةٌ'),
      I('L1', 'Arti "كُرْسِيٌّ" adalah ....', 'kursi'),
      P('L1', 'Arti "مَدْرَسَةٌ" adalah ...', 'sekolah', 'kelas', 'guru', 'murid'),
      P('L1', 'Arti "فَصْلٌ" adalah ...', 'kelas', 'guru', 'murid', 'buku'),
      P('L1', 'Bahasa Arab "guru" adalah ...', 'مُدَرِّسٌ', 'تِلْمِيذٌ', 'كِتَابٌ', 'قَلَمٌ'),
      I('L1', 'Arti "تِلْمِيذٌ" adalah ....', 'murid')
    ],
    'ba-A-5': [
      P('L1', 'Arti "هِوَايَتِي الرَّسْمُ" adalah ...', 'Hobiku menggambar', 'Hobiku membaca', 'Hobiku berenang', 'Hobiku bermain bola'),
      P('L1', 'Arti "السِّبَاحَةُ" adalah ...', 'berenang', 'membaca', 'menggambar', 'berlari'),
      I('L1', 'Arti "الْقِرَاءَةُ" adalah ....', 'membaca'),
      P('L1', 'Arti "الْقِرَاءَةُ" adalah ...', 'membaca', 'menggambar', 'berenang', 'sepak bola'),
      P('L1', 'Arti "الرَّسْمُ" adalah ...', 'menggambar', 'berenang', 'sepak bola', 'memasak'),
      P('L1', 'Bahasa Arab "berenang" adalah ...', 'السِّبَاحَةُ', 'كُرَةُ الْقَدَمِ', 'الطَّبْخُ', 'الْقِرَاءَةُ'),
      I('L1', 'Arti "كُرَةُ الْقَدَمِ" adalah ....', 'sepak bola')
    ],
    'ba-A-6': [
      P('L1', 'Arti "مَوْزٌ" adalah ...', 'pisang', 'apel', 'jeruk', 'anggur'),
      P('L1', 'Bahasa Arab "apel" adalah ...', 'تُفَّاحٌ', 'مَوْزٌ', 'عِنَبٌ', 'بُرْتُقَالٌ'),
      I('L1', 'Arti "بُرْتُقَالٌ" adalah ....', 'jeruk'),
      U('L1', 'Tuliskan arti dari: تُفَّاحٌ, عِنَبٌ, dan مَوْزٌ!', 'apel; anggur; pisang. Skor sebanding jumlah arti yang benar.'),
      P('L1', 'Arti "تُفَّاحٌ" adalah ...', 'apel', 'pisang', 'jeruk', 'anggur'),
      P('L1', 'Bahasa Arab "pisang" adalah ...', 'مَوْزٌ', 'بُرْتُقَالٌ', 'عِنَبٌ', 'أَنَنَاسٌ'),
      P('L1', 'Arti "بُرْتُقَالٌ" adalah ...', 'jeruk', 'anggur', 'nanas', 'semangka'),
      I('L1', 'Arti "عِنَبٌ" adalah ....', 'anggur')
    ],
    'ba-A-7': [
      P('L1', 'Arti "أَحْمَرُ" adalah ...', 'merah', 'hijau', 'biru', 'kuning'),
      P('L1', 'Bahasa Arab "hijau" adalah ...', 'أَخْضَرُ', 'أَزْرَقُ', 'أَصْفَرُ', 'أَسْوَدُ'),
      I('L1', 'Arti "أَبْيَضُ" adalah ....', 'putih'),
      U('L1', 'Tuliskan arti dari: أَصْفَرُ, أَزْرَقُ, dan أَسْوَدُ!', 'kuning; biru; hitam. Skor sebanding jumlah arti yang benar.'),
      P('L1', 'Bahasa Arab "merah" adalah ...', 'أَحْمَرُ', 'أَصْفَرُ', 'أَخْضَرُ', 'أَزْرَقُ'),
      P('L1', 'Arti "أَصْفَرُ" adalah ...', 'kuning', 'hijau', 'biru', 'putih'),
      P('L1', 'Arti "أَخْضَرُ" adalah ...', 'hijau', 'biru', 'putih', 'hitam'),
      I('L1', 'Arti "أَزْرَقُ" adalah ....', 'biru')
    ],
    'ba-A-8': [
      P('L1', 'Arti "سَيَّارَةٌ" adalah ...', 'mobil', 'pesawat', 'kapal', 'sepeda'),
      P('L1', 'Bahasa Arab "pesawat" adalah ...', 'طَائِرَةٌ', 'قِطَارٌ', 'سَفِينَةٌ', 'دَرَّاجَةٌ'),
      I('L1', 'Arti "قِطَارٌ" adalah ....', 'kereta api'),
      P('L1', 'Bahasa Arab "mobil" adalah ...', 'سَيَّارَةٌ', 'دَرَّاجَةٌ', 'طَائِرَةٌ', 'قِطَارٌ'),
      P('L1', 'Arti "دَرَّاجَةٌ" adalah ...', 'sepeda', 'pesawat', 'kereta api', 'kapal'),
      P('L1', 'Arti "طَائِرَةٌ" adalah ...', 'pesawat', 'kereta api', 'kapal', 'bus'),
      I('L1', 'Arti "سَفِينَةٌ" adalah ....', 'kapal')
    ],
    'ba-A-9': [
      P('L1', 'Arti "جَبَلٌ" adalah ...', 'gunung', 'laut', 'sungai', 'pohon'),
      P('L1', 'Bahasa Arab "laut" adalah ...', 'بَحْرٌ', 'نَهْرٌ', 'جَبَلٌ', 'شَجَرَةٌ'),
      I('L1', 'Arti "شَجَرَةٌ" adalah ....', 'pohon'),
      P('L1', 'Bahasa Arab "gunung" adalah ...', 'جَبَلٌ', 'نَهْرٌ', 'بَحْرٌ', 'شَجَرَةٌ'),
      P('L1', 'Arti "نَهْرٌ" adalah ...', 'sungai', 'laut', 'pohon', 'bunga'),
      P('L1', 'Arti "بَحْرٌ" adalah ...', 'laut', 'pohon', 'bunga', 'langit'),
      I('L1', 'Arti "زَهْرَةٌ" adalah ....', 'bunga')
    ],
    'ba-A-10': [
      P('L1', 'Arti "الْكِتَابَةُ" adalah ...', 'menulis', 'membaca', 'berbicara', 'menyimak'),
      P('L1', 'Keterampilan berbahasa Arab yang berarti "menyimak" adalah ...', 'الِاسْتِمَاعُ', 'الْكَلَامُ', 'الْقِرَاءَةُ', 'الْكِتَابَةُ'),
      I('L1', 'Arti "الْكَلَامُ" adalah ....', 'berbicara'),
      U('L1', 'Tuliskan arti dari: كِتَابٌ, بَابٌ, dan أَحْمَرُ!', 'buku; pintu; merah. Skor sebanding jumlah arti yang benar.')
    ],
    // ===================== BAHASA ARAB FASE B (kelas 3-4; kunci TP 'ba-B-n') =====================
    'ba-B-1': [
      P('L1', 'Arti "الرِّيَاضِيَّاتُ" adalah ...', 'matematika', 'olahraga', 'bahasa Arab', 'ilmu pengetahuan alam'),
      P('L1', 'Bahasa Arab "ilmu pengetahuan alam (sains)" adalah ...', 'الْعُلُومُ', 'الرِّيَاضِيَّاتُ', 'التَّارِيخُ', 'الْجُغْرَافِيَا'),
      I('L1', 'Arti "مَادَّةٌ" dalam konteks sekolah adalah ....', 'mata pelajaran'),
      P('L1', 'Bahasa Arab "matematika" adalah ...', 'الرِّيَاضِيَّاتُ', 'الْعُلُومُ', 'اللُّغَةُ الْعَرَبِيَّةُ', 'التَّارِيخُ'),
      P('L1', 'Arti "الْعُلُومُ" adalah ...', 'ilmu pengetahuan alam', 'bahasa Arab', 'sejarah', 'geografi'),
      P('L1', 'Arti "اللُّغَةُ الْعَرَبِيَّةُ" adalah ...', 'bahasa Arab', 'sejarah', 'geografi', 'matematika'),
      I('L1', 'Arti "التَّارِيخُ" adalah ....', 'sejarah')
    ],
    'ba-B-2': [
      P('L1', 'Arti "فِيلٌ" adalah ...', 'gajah', 'singa', 'kuda', 'kucing'),
      P('L1', 'Bahasa Arab "kucing" adalah ...', 'قِطَّةٌ', 'كَلْبٌ', 'حِصَانٌ', 'أَسَدٌ'),
      I('L1', 'Arti "حِصَانٌ" adalah ....', 'kuda'),
      P('L1', 'Arti "أَسَدٌ" adalah ...', 'singa', 'gajah', 'kucing', 'anjing'),
      P('L1', 'Bahasa Arab "gajah" adalah ...', 'فِيلٌ', 'قِطَّةٌ', 'كَلْبٌ', 'حِصَانٌ'),
      P('L1', 'Arti "قِطَّةٌ" adalah ...', 'kucing', 'anjing', 'kuda', 'sapi'),
      I('L1', 'Arti "كَلْبٌ" adalah ....', 'anjing')
    ],
    'ba-B-3': [
      P('L1', 'Arti "عِنْدِي صُدَاعٌ" adalah ...', 'Aku sakit kepala', 'Aku sakit gigi', 'Aku demam', 'Aku batuk'),
      P('L1', 'Bahasa Arab "demam" adalah ...', 'حُمَّى', 'سُعَالٌ', 'صُدَاعٌ', 'زُكَامٌ'),
      I('L1', 'Arti "سُعَالٌ" adalah ....', 'batuk'),
      P('L1', 'Arti "صُدَاعٌ" adalah ...', 'sakit kepala', 'sakit gigi', 'demam', 'batuk'),
      P('L1', 'Arti "أَلَمُ الْأَسْنَانِ" adalah ...', 'sakit gigi', 'demam', 'batuk', 'pilek'),
      I('L1', 'Arti "حُمَّى" adalah ....', 'demam'),
      P('L1', 'Bahasa Arab "batuk" adalah ...', 'سُعَالٌ', 'زُكَامٌ', 'أَلَمُ الْبَطْنِ', 'صُدَاعٌ')
    ],
    'ba-B-4': [
      P('L1', 'Arti "كُرَةُ الْقَدَمِ" adalah ...', 'sepak bola', 'bola basket', 'bola voli', 'tenis meja'),
      P('L1', 'Bahasa Arab "bola basket" adalah ...', 'كُرَةُ السَّلَّةِ', 'كُرَةُ الْقَدَمِ', 'كُرَةُ الطَّائِرَةِ', 'السِّبَاحَةُ'),
      I('L1', 'Arti "الْجَرْيُ" adalah ....', 'lari'),
      P('L1', 'Bahasa Arab "sepak bola" adalah ...', 'كُرَةُ الْقَدَمِ', 'كُرَةُ السَّلَّةِ', 'كُرَةُ الطَّائِرَةِ', 'السِّبَاحَةُ'),
      P('L1', 'Arti "كُرَةُ السَّلَّةِ" adalah ...', 'bola basket', 'bola voli', 'renang', 'lari'),
      P('L1', 'Arti "كُرَةُ الطَّائِرَةِ" adalah ...', 'bola voli', 'renang', 'lari', 'tenis meja'),
      I('L1', 'Arti "السِّبَاحَةُ" adalah ....', 'renang')
    ],
    'ba-B-5': [
      P('L1', 'Arti "هُوَ صَدِيقِي" adalah ...', 'Dia (laki-laki) temanku', 'Dia (perempuan) temanku', 'Aku temannya', 'Kamu temanku'),
      P('L1', 'Arti "نَشِيطٌ" adalah ...', 'rajin (aktif)', 'malas', 'pintar', 'tinggi'),
      I('L1', 'Arti "ذَكِيٌّ" adalah ....', 'pintar (cerdas)'),
      P('L1', 'Bahasa Arab "rajin" adalah ...', 'نَشِيطٌ', 'كَسْلَانُ', 'ذَكِيٌّ', 'طَيِّبٌ'),
      P('L1', 'Arti "كَسْلَانُ" adalah ...', 'malas', 'pintar', 'baik', 'tinggi'),
      P('L1', 'Arti "ذَكِيٌّ" adalah ...', 'pintar', 'baik', 'tinggi', 'pendek'),
      I('L1', 'Arti "طَيِّبٌ" adalah ....', 'baik')
    ],
    'ba-B-6': [
      P('L1', 'Arti "فَرَاشَةٌ" adalah ...', 'kupu-kupu', 'bunga', 'burung', 'rumput'),
      P('L1', 'Bahasa Arab "bunga" adalah ...', 'زَهْرَةٌ', 'شَجَرَةٌ', 'عُشْبٌ', 'مَقْعَدٌ'),
      I('L1', 'Arti "حَدِيقَةٌ" adalah ....', 'taman'),
      P('L1', 'Arti "حَدِيقَةٌ" adalah ...', 'taman', 'bunga', 'pohon', 'rumput'),
      P('L1', 'Arti "زَهْرَةٌ" adalah ...', 'bunga', 'pohon', 'rumput', 'bangku'),
      P('L1', 'Bahasa Arab "pohon" adalah ...', 'شَجَرَةٌ', 'عُشْبٌ', 'مَقْعَدٌ', 'فَرَاشَةٌ'),
      I('L1', 'Arti "عُشْبٌ" adalah ....', 'rumput')
    ],
    'ba-B-7': [
      P('L1', 'Arti "أَيْنَ تَسْكُنُ؟" adalah ...', 'Di mana kamu tinggal?', 'Siapa namamu?', 'Apa hobimu?', 'Kamu belajar apa?'),
      P('L1', 'Arti "أَسْكُنُ فِي قَرْيَةٍ" adalah ...', 'Aku tinggal di desa', 'Aku tinggal di kota', 'Aku pergi ke desa', 'Aku belajar di desa'),
      I('L1', 'Arti "شَارِعٌ" adalah ....', 'jalan'),
      P('L1', 'Arti "عُنْوَانٌ" adalah ...', 'alamat', 'jalan', 'kota', 'desa'),
      P('L1', 'Arti "شَارِعٌ" adalah ...', 'jalan', 'kota', 'desa', 'rumah'),
      P('L1', 'Bahasa Arab "kota" adalah ...', 'مَدِينَةٌ', 'قَرْيَةٌ', 'بَيْتٌ', 'مَدْرَسَةٌ'),
      I('L1', 'Arti "قَرْيَةٌ" adalah ....', 'desa')
    ],
    'ba-B-8': [
      P('L1', 'Arti "طَبِيبٌ" adalah ...', 'dokter', 'guru', 'polisi', 'petani'),
      P('L1', 'Bahasa Arab "polisi" adalah ...', 'شُرْطِيٌّ', 'طَيَّارٌ', 'فَلَّاحٌ', 'تَاجِرٌ'),
      I('L1', 'Arti "فَلَّاحٌ" adalah ....', 'petani'),
      P('L1', 'Arti "مُدَرِّسٌ" adalah ...', 'guru', 'dokter', 'polisi', 'pilot'),
      P('L1', 'Bahasa Arab "dokter" adalah ...', 'طَبِيبٌ', 'شُرْطِيٌّ', 'طَيَّارٌ', 'فَلَّاحٌ'),
      P('L1', 'Arti "شُرْطِيٌّ" adalah ...', 'polisi', 'pilot', 'petani', 'pedagang'),
      I('L1', 'Arti "طَيَّارٌ" adalah ....', 'pilot')
    ],
    'ba-B-9': [
      P('L1', 'Arti "أُرِيدُ أَنْ أَكُونَ طَبِيبًا" adalah ...', 'Aku ingin menjadi dokter', 'Aku sedang bertemu dokter', 'Ayahku seorang dokter', 'Aku sakit dan pergi ke dokter'),
      P('L1', 'Arti "مَاذَا تُرِيدُ أَنْ تَكُونَ؟" adalah ...', 'Kamu ingin menjadi apa?', 'Apa yang kamu makan?', 'Kamu tinggal di mana?', 'Siapa temanmu?'),
      I('L1', 'Arti "أُرِيدُ" adalah ....', 'aku ingin'),
      P('L1', 'Arti "طَبِيبٌ" adalah ...', 'dokter', 'guru', 'pilot', 'insinyur'),
      P('L1', 'Arti "مُدَرِّسٌ" adalah ...', 'guru', 'pilot', 'insinyur', 'polisi'),
      P('L1', 'Bahasa Arab "pilot" adalah ...', 'طَيَّارٌ', 'مُهَنْدِسٌ', 'شُرْطِيٌّ', 'تَاجِرٌ'),
      I('L1', 'Arti "مُهَنْدِسٌ" adalah ....', 'insinyur')
    ],
    'ba-B-10': [
      P('L1', 'Arti "سَرِيرٌ" adalah ...', 'tempat tidur', 'meja', 'kursi', 'lemari'),
      P('L1', 'Bahasa Arab "kulkas" adalah ...', 'ثَلَّاجَةٌ', 'تِلْفَازٌ', 'طَاوِلَةٌ', 'سَرِيرٌ'),
      I('L1', 'Arti "غُرْفَةُ النَّوْمِ" adalah ....', 'kamar tidur'),
      P('L1', 'Bahasa Arab "tempat tidur" adalah ...', 'سَرِيرٌ', 'طَاوِلَةٌ', 'كُرْسِيٌّ', 'ثَلَّاجَةٌ'),
      P('L1', 'Arti "طَاوِلَةٌ" adalah ...', 'meja', 'kursi', 'kulkas', 'televisi'),
      P('L1', 'Arti "كُرْسِيٌّ" adalah ...', 'kursi', 'kulkas', 'televisi', 'lemari'),
      I('L1', 'Arti "ثَلَّاجَةٌ" adalah ....', 'kulkas')
    ],
    'ba-B-11': [
      P('L1', 'Arti "عَمٌّ" adalah ...', 'paman (saudara laki-laki ayah)', 'paman (saudara laki-laki ibu)', 'kakek', 'sepupu'),
      P('L1', 'Bahasa Arab "bibi (saudara perempuan ibu)" adalah ...', 'خَالَةٌ', 'عَمَّةٌ', 'أُمٌّ', 'بِنْتٌ'),
      I('L1', 'Arti "بِنْتٌ" adalah ....', 'anak perempuan'),
      P('L1', 'Arti "أَبٌ" adalah ...', 'ayah', 'ibu', 'anak laki-laki', 'anak perempuan'),
      P('L1', 'Arti "أُمٌّ" adalah ...', 'ibu', 'anak laki-laki', 'anak perempuan', 'paman (saudara laki-laki ayah)'),
      P('L1', 'Bahasa Arab "anak laki-laki" adalah ...', 'ابْنٌ', 'بِنْتٌ', 'عَمٌّ', 'خَالٌ'),
      I('L1', 'Arti "عَمٌّ" adalah ....', 'paman (saudara laki-laki ayah)')
    ],
    'ba-B-12': [
      P('L1', 'Arti "أُحِبُّ إِنْدُونِيسِيَا" adalah ...', 'Aku cinta Indonesia', 'Aku tinggal di Indonesia', 'Aku pergi ke Indonesia', 'Aku belajar tentang Indonesia'),
      P('L1', 'Arti "عَلَمٌ" adalah ...', 'bendera', 'peta', 'lagu', 'tanah air'),
      I('L1', 'Arti "وَطَنٌ" adalah ....', 'tanah air (negara)'),
      P('L1', 'Bahasa Arab "bendera" adalah ...', 'عَلَمٌ', 'وَطَنٌ', 'لُغَةٌ', 'جَزِيرَةٌ'),
      P('L1', 'Arti "وَطَنٌ" adalah ...', 'tanah air', 'bahasa', 'pulau', 'ibu kota'),
      P('L1', 'Arti "لُغَةٌ" adalah ...', 'bahasa', 'pulau', 'ibu kota', 'rakyat'),
      I('L1', 'Arti "جَزِيرَةٌ" adalah ....', 'pulau')
    ],
    'ba-B-13': [
      P('L1', 'Arti "الِاسْتِمَاعُ" adalah ...', 'menyimak', 'berbicara', 'membaca', 'menulis'),
      P('L1', 'Keterampilan berbahasa Arab yang berarti "berbicara" adalah ...', 'الْكَلَامُ', 'الِاسْتِمَاعُ', 'الْقِرَاءَةُ', 'الْكِتَابَةُ'),
      I('L1', 'Arti "الْقِرَاءَةُ" adalah ....', 'membaca'),
      U('L1', 'Tuliskan arti keempat kata berikut: الِاسْتِمَاعُ, الْكَلَامُ, الْقِرَاءَةُ, dan الْكِتَابَةُ!', 'menyimak; berbicara; membaca; menulis. Skor sebanding jumlah arti yang benar.')
    ],
    // ===================== BAHASA ARAB FASE C (kelas 5-6; kunci TP 'ba-C-n') =====================
    'ba-C-1': [
      P('L1', 'Arti "أُذُنٌ" adalah ...', 'telinga', 'mata', 'hidung', 'mulut'),
      P('L1', 'Bahasa Arab "tangan" adalah ...', 'يَدٌ', 'رِجْلٌ', 'رَأْسٌ', 'ظَهْرٌ'),
      I('L1', 'Arti "عَيْنٌ" adalah ....', 'mata'),
      U('L1', 'Sebutkan tiga anggota tubuh dalam bahasa Arab beserta artinya!', 'Contoh benar: رَأْسٌ (kepala), عَيْنٌ (mata), أُذُنٌ (telinga), أَنْفٌ (hidung), فَمٌ (mulut), يَدٌ (tangan), رِجْلٌ (kaki), بَطْنٌ (perut). Skor sebanding jumlah pasangan kata dan arti yang benar.'),
      P('L1', 'Arti "رَأْسٌ" adalah ...', 'kepala', 'mata', 'telinga', 'hidung'),
      P('L1', 'Arti "عَيْنٌ" adalah ...', 'mata', 'telinga', 'hidung', 'mulut'),
      P('L1', 'Bahasa Arab "telinga" adalah ...', 'أُذُنٌ', 'أَنْفٌ', 'فَمٌ', 'يَدٌ'),
      I('L1', 'Arti "أَنْفٌ" adalah ....', 'hidung')
    ],
    'ba-C-2': [
      P('L1', 'Arti "حَدِيقَةُ الْحَيَوَانِ" adalah ...', 'kebun binatang', 'taman bunga', 'kebun buah', 'peternakan'),
      P('L1', 'Arti "زَرَافَةٌ" adalah ...', 'jerapah', 'gajah', 'monyet', 'beruang'),
      I('L1', 'Arti "قِرْدٌ" adalah ....', 'monyet'),
      U('L1', 'Tuliskan arti dari: نَمِرٌ, دُبٌّ, dan ثُعْبَانٌ!', 'harimau; beruang; ular. Skor sebanding jumlah arti yang benar.'),
      P('L1', 'Arti "قِرْدٌ" adalah ...', 'monyet', 'jerapah', 'harimau', 'beruang'),
      P('L1', 'Bahasa Arab "jerapah" adalah ...', 'زَرَافَةٌ', 'نَمِرٌ', 'دُبٌّ', 'ثُعْبَانٌ'),
      P('L1', 'Arti "نَمِرٌ" adalah ...', 'harimau', 'beruang', 'ular', 'merak'),
      I('L1', 'Arti "دُبٌّ" adalah ....', 'beruang')
    ],
    'ba-C-3': [
      P('L1', 'Arti "أَرِيكَةٌ" adalah ...', 'sofa', 'kursi belajar', 'karpet', 'lampu'),
      P('L1', 'Bahasa Arab "ruang tamu" adalah ...', 'غُرْفَةُ الضُّيُوفِ', 'غُرْفَةُ النَّوْمِ', 'غُرْفَةُ الدِّرَاسَةِ', 'الْمَطْبَخُ'),
      I('L1', 'Arti "مِصْبَاحٌ" adalah ....', 'lampu'),
      P('L1', 'Bahasa Arab "sofa" adalah ...', 'أَرِيكَةٌ', 'سَجَّادَةٌ', 'مِصْبَاحٌ', 'سَاعَةٌ'),
      P('L1', 'Arti "سَجَّادَةٌ" adalah ...', 'karpet', 'lampu', 'jam dinding', 'meja tulis'),
      P('L1', 'Arti "مِصْبَاحٌ" adalah ...', 'lampu', 'jam dinding', 'meja tulis', 'lemari'),
      I('L1', 'Arti "سَاعَةٌ" adalah ....', 'jam dinding')
    ],
    'ba-C-4': [
      P('L1', 'Arti "مَكْتَبَةٌ" (di madrasah) adalah ...', 'perpustakaan', 'kantin', 'lapangan', 'masjid'),
      P('L1', 'Arti "قَامُوسٌ" adalah ...', 'kamus', 'majalah', 'cerita', 'rak buku'),
      I('L1', 'Arti "مَجَلَّةٌ" adalah ....', 'majalah'),
      P('L1', 'Arti "رَفٌّ" adalah ...', 'rak', 'cerita', 'majalah', 'kamus'),
      P('L1', 'Arti "قِصَّةٌ" adalah ...', 'cerita', 'majalah', 'kamus', 'buku'),
      P('L1', 'Bahasa Arab "majalah" adalah ...', 'مَجَلَّةٌ', 'قَامُوسٌ', 'كِتَابٌ', 'جَرِيدَةٌ'),
      I('L1', 'Arti "قَامُوسٌ" adalah ....', 'kamus')
    ],
    'ba-C-5': [
      P('L1', 'Arti "مَقْصِفٌ" adalah ...', 'kantin', 'perpustakaan', 'lapangan', 'masjid'),
      P('L1', 'Arti "كَمِ الثَّمَنُ؟" adalah ...', 'Berapa harganya?', 'Apa yang kamu mau?', 'Di mana kantinnya?', 'Jam berapa sekarang?'),
      P('L1', 'Bahasa Arab "air" adalah ...', 'مَاءٌ', 'خُبْزٌ', 'أَرُزٌّ', 'لَحْمٌ'),
      I('L1', 'Arti "عَصِيرٌ" adalah ....', 'jus (sari buah)'),
      P('L1', 'Arti "طَعَامٌ" adalah ...', 'makanan', 'minuman', 'air', 'jus'),
      P('L1', 'Arti "شَرَابٌ" adalah ...', 'minuman', 'air', 'jus', 'roti'),
      I('L1', 'Arti "مَاءٌ" adalah ....', 'air'),
      P('L1', 'Bahasa Arab "jus" adalah ...', 'عَصِيرٌ', 'خُبْزٌ', 'أَرُزٌّ', 'لَحْمٌ')
    ],
    'ba-C-6': [
      P('L1', 'Arti "كَمِ السَّاعَةُ؟" adalah ...', 'Jam berapa sekarang?', 'Berapa harganya?', 'Siapa namamu?', 'Di mana sekolahmu?'),
      P('L1', 'Arti "السَّاعَةُ الثَّالِثَةُ" adalah ...', 'pukul tiga', 'pukul dua', 'pukul empat', 'pukul satu'),
      P('L2', 'Arti "السَّاعَةُ الْخَامِسَةُ وَالنِّصْفُ" adalah pukul ...', '05.30', '05.15', '06.30', '04.30'),
      I('L1', 'Arti "السَّاعَةُ" adalah ....', 'jam'),
      P('L1', 'Arti "يَوْمٌ" adalah ...', 'hari', 'pekan (minggu)', 'bulan (kalender)', 'tahun'),
      P('L1', 'Arti "أُسْبُوعٌ" adalah ...', 'pekan (minggu)', 'bulan (kalender)', 'tahun', 'menit'),
      P('L1', 'Bahasa Arab "bulan (kalender)" adalah ...', 'شَهْرٌ', 'سَنَةٌ', 'دَقِيقَةٌ', 'سَاعَةٌ'),
      I('L1', 'Arti "سَنَةٌ" adalah ....', 'tahun')
    ],
    'ba-C-7': [
      P('L1', 'Arti "أُحِبُّ اللُّغَةَ الْعَرَبِيَّةَ" adalah ...', 'Aku suka bahasa Arab', 'Aku belajar bahasa Arab', 'Aku bisa berbahasa Arab', 'Aku guru bahasa Arab'),
      P('L1', 'Arti "لُغَةُ الْقُرْآنِ" adalah ...', 'bahasa Al-Qur\'an', 'kitab Al-Qur\'an', 'guru Al-Qur\'an', 'huruf hijaiyah'),
      I('L1', 'Arti "جَمِيلَةٌ" adalah ....', 'indah (cantik)'),
      P('L1', 'Arti "جَمِيلَةٌ" adalah ...', 'indah', 'mudah', 'sulit', 'menyenangkan'),
      P('L1', 'Arti "سَهْلَةٌ" adalah ...', 'mudah', 'sulit', 'menyenangkan', 'bermanfaat'),
      P('L1', 'Bahasa Arab "sulit" adalah ...', 'صَعْبَةٌ', 'مُمْتِعَةٌ', 'مُفِيدَةٌ', 'مُهِمَّةٌ'),
      I('L1', 'Arti "مُمْتِعَةٌ" adalah ....', 'menyenangkan')
    ],
    'ba-C-8': [
      P('L1', 'Arti "عُطْلَةٌ" adalah ...', 'liburan', 'sekolah', 'ujian', 'pelajaran'),
      P('L2', 'Arti "ذَهَبْتُ إِلَى الْقَرْيَةِ" adalah ...', 'Aku (telah) pergi ke desa', 'Aku tinggal di desa', 'Aku akan pergi ke desa', 'Aku datang dari desa'),
      I('L1', 'Arti "زَارَ" adalah ....', 'mengunjungi'),
      P('L1', 'Bahasa Arab "liburan" adalah ...', 'عُطْلَةٌ', 'قَرْيَةٌ', 'ذَهَبَ', 'زَارَ'),
      P('L1', 'Arti "قَرْيَةٌ" adalah ...', 'desa', 'pergi', 'mengunjungi', 'kembali'),
      P('L1', 'Arti "ذَهَبَ" adalah ...', 'pergi', 'mengunjungi', 'kembali', 'bermain'),
      I('L1', 'Arti "رَجَعَ" adalah ....', 'kembali')
    ],
    'ba-C-9': [
      P('L1', 'Arti "رِحْلَةٌ" adalah ...', 'piknik (perjalanan wisata)', 'tugas sekolah', 'ujian', 'pelajaran'),
      P('L1', 'Arti "نَذْهَبُ إِلَى الْحَدِيقَةِ" adalah ...', 'Kami pergi ke taman', 'Aku pergi ke taman', 'Mereka pergi ke taman', 'Kamu pergi ke taman'),
      I('L1', 'Arti "خَيْمَةٌ" adalah ....', 'tenda'),
      P('L1', 'Bahasa Arab "piknik" adalah ...', 'رِحْلَةٌ', 'خَيْمَةٌ', 'حَدِيقَةٌ', 'بَحْرٌ'),
      P('L1', 'Arti "خَيْمَةٌ" adalah ...', 'tenda', 'taman', 'laut', 'gunung'),
      P('L1', 'Arti "حَدِيقَةٌ" adalah ...', 'taman', 'laut', 'gunung', 'bola'),
      I('L1', 'Arti "بَحْرٌ" adalah ....', 'laut')
    ],
    'ba-C-10': [
      P('L1', 'Keterampilan berbahasa Arab yang berarti "menulis" adalah ...', 'الْكِتَابَةُ', 'الْقِرَاءَةُ', 'الْكَلَامُ', 'الِاسْتِمَاعُ'),
      P('L1', 'Arti "الْكَلَامُ" adalah ...', 'berbicara', 'menyimak', 'membaca', 'menulis'),
      I('L1', 'Arti "الِاسْتِمَاعُ" adalah ....', 'menyimak'),
      U('L1', 'Sebutkan dua keterampilan berbahasa Arab beserta artinya!', 'Contoh benar: الِاسْتِمَاعُ (menyimak), الْكَلَامُ (berbicara), الْقِرَاءَةُ (membaca), الْكِتَابَةُ (menulis). Skor sebanding jumlah pasangan yang benar.')
    ],
    // ===================== AL-QUR'AN HADIS: TAJWID =====================
    'aqh-A-1': [
      P('L1', 'Huruf hijaiyah yang pertama adalah ...', 'alif', 'ba', 'ta', 'jim'),
      P('L1', 'Huruf hijaiyah yang terakhir adalah ...', 'ya', 'wawu', 'ha', 'nun')
    ],
    'aqh-A-2': [
      P('L1', 'Gunnah adalah bunyi dengung yang keluar dari ...', 'hidung', 'tenggorokan', 'bibir', 'lidah'),
      P('L1', 'Gunnah terdapat pada huruf ...', 'nun dan mim yang bertasydid', 'alif dan ya yang bertasydid', 'lam dan ra yang bertasydid', 'ba dan ta yang bertasydid'),
      I('L1', 'Gunnah dibaca dengan panjang ... harakat.', 'dua')
    ],
    'aqh-A-3': [
      P('L1', 'Alif Lam yang lam-nya dibaca jelas disebut Alif Lam ...', 'Qamariyah', 'Syamsiyah', 'Mad', 'Gunnah'),
      P('L1', 'Alif Lam yang lam-nya tidak dibaca dan huruf sesudahnya bertasydid disebut Alif Lam ...', 'Syamsiyah', 'Qamariyah', 'Mad', 'Iqlab'),
      I('L1', 'Alif Lam yang bertemu huruf qamariyah dibaca dengan ....', 'jelas')
    ],
    'aqh-B-1': [
      P('L1', 'Huruf kalkalah berjumlah ...', 'lima', 'tiga', 'enam', 'delapan'),
      P('L1', 'Kalkalah artinya ...', 'memantul', 'berdengung', 'memanjangkan', 'menyamarkan'),
      I('L1', 'Huruf kalkalah adalah qaf, tha, ba, jim, dan ....', 'dal')
    ],
    'aqh-B-2': [
      P('L1', 'Mad tabi\'i dibaca dengan panjang ... harakat.', 'dua', 'empat', 'enam', 'satu'),
      P('L1', 'Mad tabi\'i terjadi jika fathah bertemu alif, kasrah bertemu ya sukun, atau dammah bertemu ...', 'wawu sukun', 'alif sukun', 'ya berharakat', 'hamzah'),
      I('L1', 'Mad tabi\'i disebut juga mad ....', 'asli')
    ],
    'aqh-B-3': [
      P('L1', 'Huruf izhar halqi berjumlah ...', 'enam', 'empat', 'lima', 'lima belas'),
      P('L1', 'Izhar artinya ...', 'jelas', 'samar', 'memasukkan', 'mengganti'),
      I('L1', 'Nun sukun atau tanwin bertemu huruf halqi dibaca ....', 'jelas')
    ],
    'aqh-B-4': [
      P('L1', 'Huruf ikhfa hakiki berjumlah ...', 'lima belas', 'enam', 'empat', 'dua puluh'),
      P('L1', 'Ikhfa artinya ...', 'samar', 'jelas', 'memantul', 'memanjangkan'),
      I('L1', 'Nun sukun atau tanwin bertemu huruf ikhfa dibaca dengan ....', 'samar')
    ],
    'aqh-B-5': [
      P('L1', 'Huruf idgam bigunnah adalah ...', 'ya, nun, mim, wawu', 'lam dan ra', 'ba', 'alif dan ya'),
      P('L1', 'Huruf idgam bilagunnah adalah ...', 'lam dan ra', 'ya, nun, mim, wawu', 'ba', 'mim saja'),
      I('L1', 'Idgam artinya ....', 'memasukkan (meleburkan)')
    ],
    'aqh-B-6': [
      P('L1', 'Iqlab terjadi jika nun sukun atau tanwin bertemu huruf ...', 'ba', 'mim', 'lam', 'ra'),
      P('L1', 'Iqlab artinya ...', 'mengganti', 'menyamarkan', 'menjelaskan', 'memantulkan'),
      I('L1', 'Pada iqlab, nun sukun atau tanwin dibaca seperti huruf ....', 'mim')
    ],
    'aqh-C-1': [
      P('L1', 'Hukum bacaan mim sukun ada ... macam.', 'tiga', 'dua', 'empat', 'lima'),
      P('L1', 'Mim sukun bertemu huruf ba dibaca ...', 'ikhfa syafawi', 'idgam mimi', 'izhar syafawi', 'iqlab'),
      I('L1', 'Mim sukun bertemu huruf mim dibaca ....', 'idgam mimi (idgam mitslain)')
    ],
    'aqh-C-2': [
      P('L1', 'Waqaf artinya ...', 'berhenti', 'melanjutkan', 'memanjangkan', 'menyamarkan'),
      P('L1', 'Wasal artinya ...', 'melanjutkan bacaan', 'berhenti', 'mengulang', 'menjelaskan'),
      I('L1', 'Berhenti sejenak ketika membaca Al-Qur\'an sambil mengambil napas disebut ....', 'waqaf')
    ],
    'aqh-C-3': [
      P('L1', 'Huruf ra dibaca tebal (tafkhim) jika berharakat ...', 'fathah atau dammah', 'kasrah', 'sukun setelah kasrah', 'tanwin kasrah'),
      P('L1', 'Huruf ra dibaca tipis (tarqiq) jika berharakat ...', 'kasrah', 'fathah', 'dammah', 'fathatain'),
      I('L1', 'Membaca huruf ra dengan tebal disebut ....', 'tafkhim')
    ],
    'aqh-C-4': [
      P('L1', 'Jawazul wajhain berarti bacaan yang boleh dibaca dengan ...', 'dua cara', 'satu cara saja', 'tiga cara', 'tidak boleh dibaca')
    ]
  };
})();
;

/* ################ BAGIAN: data-soal-aqh-hafalan.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-aqh-hafalan.js
   Bank soal DRAF Al-Qur'an Hadis MI Fase A-C untuk TP Al-Qur'an dan Hadis (melengkapi js/data-soal-mi.js yang
   baru memuat TP Tajwid: aqh-A-1..3, aqh-B-1..6, aqh-C-1..4).
   KUNCI = kunci TP di js/data-tp-mi.js (urutan TP dalam daftar mapel 'aqh' per fase):
     Fase A : aqh-A-4 hafalan surah, aqh-A-5 isi surah, aqh-A-6..8 hadis (kebersihan, belajar, orang tua)
     Fase B : aqh-B-7 hafalan/tulisan surah, aqh-B-8 arti dan isi surah, aqh-B-9..13 hadis (salat berjemaah,
              persaudaraan, takwa, niat, silaturahmi)
     Fase C : aqh-C-5..8 ayat (munafik, anak yatim, keutamaan memberi, amal saleh), aqh-C-9..12 hadis (tema sama)
   JIKA urutan TP di data-tp-mi.js diubah, kunci di file ini harus ikut disesuaikan.
   Acuan: SK Dirjen Pendis No. 9941 Tahun 2025, Lampiran I bagian II. SK hanya menyebut "surah pendek pilihan"
   (Fase A-B) dan tema (Fase C), sehingga DAFTAR SURAH/AYAT/HADIS di sini adalah pilihan penyusun yang umum dipakai.
   Guru wajib mencocokkannya dengan buku ajar/KMA madrasah, lalu mengganti atau menghapus yang tidak sesuai.
   Status: DRAF, belum diperiksa guru.
   Format sama dengan data-soal-mi.js:
     PG    : ['pg', level, soal, [jawaban BENAR, pengecoh1, pengecoh2, pengecoh3]]  (opsi diacak saat dipakai)
     Isian : ['is', level, soal, jawaban]
     Uraian: ['ur', level, soal, pedoman penskoran]
   Info tiap kunci ada di window.BANK_SOAL_AQH_INFO. WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const BARU = {
    // ===================== FASE A (KELAS 1-2 MI) =====================
    // aqh-A-4: Hafalan surah pendek pilihan (identitas surah)
    "aqh-A-4": [
      P("L1", "Surah Al-Fatihah terdiri dari ... ayat.", "tujuh", "enam", "lima", "sembilan"),
      P("L1", "Surah yang wajib dibaca pada setiap rakaat salat adalah surah ...", "Al-Fatihah", "Al-Ikhlas", "An-Nas", "Al-Falaq"),
      I("L1", "Surah Al-Fatihah terletak pada urutan ... dalam mushaf Al-Qur'an.", "pertama"),
      P("L1", "Surah An-Nas terdiri dari ... ayat.", "enam", "empat", "lima", "tujuh"),
      P("L1", "An-Nas artinya ...", "manusia", "fajar", "gajah", "kebersihan"),
      P("L1", "Surah Al-Ikhlas terdiri dari ... ayat.", "empat", "tiga", "lima", "enam"),
      P("L1", "Surah Al-Falaq terdiri dari ... ayat.", "lima", "empat", "enam", "tujuh"),
      P("L1", "Al-Falaq artinya ...", "waktu subuh (fajar)", "manusia", "gajah", "kebaikan"),
      I("L1", "Surah terakhir dalam mushaf Al-Qur'an adalah surah ....", "An-Nas"),
      U("L2", "Sebutkan empat surah pendek yang sudah kamu hafal beserta jumlah ayatnya!", "Contoh benar: Al-Fatihah (7 ayat), An-Nas (6), Al-Ikhlas (4), Al-Falaq (5). Skor sebanding jumlah pasangan nama surah dan jumlah ayat yang benar.")
    ],
    // aqh-A-5: Isi surah pendek dan penerapannya
    "aqh-A-5": [
      U("L2", "Tuliskan arti ayat \"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ\"!", "Segala puji bagi Allah, Tuhan semesta alam. Skor penuh bila makna \"puji hanya milik Allah\" dan \"Tuhan semesta alam\" sama-sama ada."),
      P("L2", "Surah An-Nas berisi permohonan perlindungan kepada Allah dari kejahatan ...", "bisikan setan yang bersembunyi", "waktu malam yang gelap gulita", "pasukan bergajah", "orang yang menghardik anak yatim"),
      U("L2", "Tuliskan arti ayat \"قُلْ أَعُوذُ بِرَبِّ النَّاسِ\"!", "Katakanlah, \"Aku berlindung kepada Tuhan (yang memelihara) manusia.\" Skor penuh bila makna \"berlindung kepada Tuhan manusia\" tepat."),
      P("L1", "Surah Al-Ikhlas menjelaskan bahwa Allah itu ...", "Maha Esa", "ada dua", "ada tiga", "banyak"),
      I("L1", "Ayat pertama surah Al-Ikhlas dimulai dengan kata \"qul\" yang artinya ....", "katakanlah"),
      U("L2", "Tuliskan arti ayat \"قُلْ هُوَ اللَّهُ أَحَدٌ\"!", "Katakanlah (Muhammad), \"Dialah Allah, Yang Maha Esa.\" Skor penuh bila makna \"Allah Maha Esa\" tepat."),
      I("L1", "Dalam surah Al-Falaq kita berlindung kepada Tuhan yang menguasai waktu ....", "subuh (fajar)")
    ],
    // aqh-A-6: Hadis tentang kebersihan
    "aqh-A-6": [
      P("L1", "Menurut hadis, kebersihan adalah sebagian dari ...", "iman", "ilmu", "harta", "permainan"),
      P("L1", "Contoh perbuatan yang sesuai dengan hadis tentang kebersihan adalah ...", "membuang sampah pada tempatnya", "makan sambil berlari", "membiarkan kelas berantakan", "membuang bungkus jajan di kolong meja"),
      I("L1", "Lawan kata dari bersih adalah ....", "kotor"),
      U("L2", "Tuliskan bunyi hadis tentang kebersihan beserta artinya!", "الطُّهُورُ شَطْرُ الْإِيمَانِ — Kebersihan (kesucian) adalah sebagian dari iman. Teks Arab disesuaikan dengan buku ajar madrasah. Skor: teks Arab dan arti masing-masing separuh.")
    ],
    // aqh-A-7: Hadis tentang keutamaan belajar
    "aqh-A-7": [
      P("L1", "Orang yang menuntut ilmu akan dimudahkan Allah jalannya menuju ...", "surga", "pasar", "sekolah", "kota"),
      P("L1", "Sikap yang sesuai dengan hadis keutamaan belajar adalah ...", "rajin belajar dan tidak mudah malas", "sering bolos sekolah", "menunda mengerjakan tugas", "mengejek teman yang rajin"),
      I("L1", "Mencari ilmu disebut juga ... ilmu.", "menuntut"),
      U("L2", "Jelaskan isi hadis keutamaan belajar dengan kata-katamu sendiri!", "Jawaban benar memuat inti: orang yang bersungguh-sungguh mencari ilmu akan dimudahkan Allah jalannya menuju surga. Skor penuh bila inti ini ada.")
    ],
    // aqh-A-8: Hadis tentang berbakti kepada orang tua
    "aqh-A-8": [
      P("L1", "Menurut hadis, rida Allah bergantung pada rida ...", "orang tua", "teman", "tetangga", "penjual"),
      P("L1", "Contoh berbakti kepada orang tua adalah ...", "menuruti nasihat baik dan membantu pekerjaan rumah", "membantah ketika dinasihati", "berkata kasar kepada ibu", "pulang tanpa berpamitan"),
      I("L1", "Anak yang berbakti kepada orang tua disebut anak yang ....", "saleh"),
      U("L2", "Tuliskan dua cara berbakti kepada orang tua!", "Contoh benar: menaati nasihat baik, berkata santun, membantu pekerjaan rumah, mendoakan orang tua, belajar dengan rajin. Skor sebanding jumlah cara yang benar.")
    ],
    // ===================== FASE B (KELAS 3-4 MI) =====================
    // aqh-B-7: Hafalan dan tulisan surah pendek (identitas surah)
    "aqh-B-7": [
      P("L1", "Surah Al-Asr terdiri dari ... ayat.", "tiga", "dua", "empat", "lima"),
      P("L1", "Al-Asr artinya demi ...", "waktu (masa)", "matahari", "bulan", "hujan"),
      P("L1", "Surah Al-Kautsar terdiri dari ... ayat.", "tiga", "dua", "empat", "enam"),
      P("L1", "Al-Kautsar artinya ...", "nikmat yang banyak", "gajah", "waktu", "pertolongan"),
      P("L1", "Surah An-Nasr terdiri dari ... ayat.", "tiga", "dua", "empat", "lima"),
      P("L1", "An-Nasr artinya ...", "pertolongan", "manusia", "gajah", "nikmat"),
      P("L1", "Surah Al-Kafirun terdiri dari ... ayat.", "enam", "lima", "empat", "tujuh"),
      P("L1", "Surah Al-Fil terdiri dari ... ayat.", "lima", "empat", "enam", "tiga"),
      I("L1", "Al-Fil artinya ....", "gajah"),
      P("L1", "Surah Quraisy terdiri dari ... ayat.", "empat", "tiga", "lima", "enam"),
      I("L1", "Surah yang artinya \"pertolongan\" adalah surah ....", "An-Nasr"),
      U("L2", "Tuliskan tiga surah pendek yang kamu hafal beserta jumlah ayat dan arti nama surahnya!", "Contoh benar: Al-Asr (3 ayat, demi waktu), Al-Kautsar (3 ayat, nikmat yang banyak), An-Nasr (3 ayat, pertolongan), Al-Fil (5 ayat, gajah), Al-Kafirun (6 ayat, orang-orang kafir). Skor sebanding jumlah surah yang lengkap dan benar.")
    ],
    // aqh-B-8: Arti dan isi kandungan surah pendek
    "aqh-B-8": [
      P("L2", "Menurut surah Al-Asr, orang yang tidak merugi adalah orang yang beriman dan ...", "beramal saleh", "banyak bermain", "suka menunda pekerjaan", "selalu bepergian"),
      U("L3", "Sebutkan empat ciri orang yang tidak merugi menurut surah Al-Asr!", "Beriman; beramal saleh; saling menasihati dalam kebenaran; saling menasihati dalam kesabaran. Skor sebanding jumlah ciri yang benar."),
      P("L2", "Perintah dalam surah Al-Kautsar adalah mendirikan salat karena Allah dan ...", "berkurban", "berpuasa setiap hari", "berdagang", "bepergian jauh"),
      I("L1", "Allah memberikan nikmat yang banyak (Al-Kautsar) kepada Nabi ....", "Muhammad"),
      P("L2", "Ketika pertolongan Allah dan kemenangan datang, kita diperintahkan bertasbih memuji Allah dan memohon ...", "ampun (istigfar)", "harta", "jabatan", "kekuasaan"),
      I("L2", "Allah Maha Penerima ... (at-Tawwab).", "tobat"),
      P("L2", "Surah Al-Kafirun mengajarkan sikap ...", "tidak mencampuradukkan ibadah dan saling menghormati keyakinan", "mengikuti ibadah semua agama", "memaksa orang lain masuk Islam", "memusuhi orang yang berbeda agama"),
      I("L2", "Arti \"lakum dinukum waliyadin\" adalah untukmu agamamu, dan untukku ....", "agamaku"),
      P("L1", "Surah Al-Fil menceritakan pasukan bergajah yang dipimpin oleh ...", "Abrahah", "Abu Lahab", "Fir'aun", "Namrud"),
      P("L2", "Allah menghancurkan pasukan bergajah dengan mengirim burung ...", "ababil", "elang", "merpati", "gagak"),
      P("L2", "Dalam surah Quraisy, kaum Quraisy diperintahkan menyembah Tuhan pemilik ...", "Ka'bah (rumah ini)", "bukit Safa", "gunung Uhud", "pasar Ukaz"),
      I("L2", "Allah memberi makan kepada mereka untuk menghilangkan lapar dan memberi rasa ... dari ketakutan.", "aman")
    ],
    // aqh-B-9: Hadis tentang salat berjemaah
    "aqh-B-9": [
      P("L1", "Salat berjemaah lebih utama daripada salat sendirian sebanyak ... derajat.", "27", "17", "7", "70"),
      P("L1", "Salat berjemaah paling sedikit dilakukan oleh ... orang.", "dua", "satu", "tiga", "lima"),
      I("L1", "Orang yang mengikuti imam dalam salat berjemaah disebut ....", "makmum"),
      U("L2", "Tuliskan dua manfaat salat berjemaah!", "Contoh benar: pahala lebih banyak, mempererat persaudaraan, melatih disiplin, saling mengenal sesama jamaah. Skor sebanding jumlah manfaat yang benar.")
    ],
    // aqh-B-10: Hadis tentang persaudaraan
    "aqh-B-10": [
      P("L1", "Menurut hadis, seorang muslim adalah ... bagi muslim lainnya.", "saudara", "musuh", "pesaing", "tamu"),
      P("L1", "Sikap yang sesuai dengan hadis persaudaraan adalah ...", "menolong teman yang sedang kesulitan", "membiarkan teman dikucilkan", "mengejek teman yang salah", "merebut mainan teman"),
      I("L1", "Persaudaraan sesama muslim disebut ukhuwah ....", "Islamiyah"),
      U("L2", "Berikan satu contoh menjaga persaudaraan di madrasah!", "Contoh benar: berbagi bekal, menolong teman yang jatuh, tidak mengejek, meminjamkan alat tulis, menjenguk teman yang sakit. Skor penuh bila contoh sesuai.")
    ],
    // aqh-B-11: Hadis tentang takwa
    "aqh-B-11": [
      P("L1", "Takwa adalah melaksanakan perintah Allah dan ...", "menjauhi larangan-Nya", "menunda salat", "memilih ibadah yang disukai saja", "berbicara sesuka hati"),
      P("L2", "Menurut hadis, jika berbuat kesalahan kita dianjurkan segera ...", "mengiringinya dengan perbuatan baik", "menyembunyikannya", "mengulanginya", "menyalahkan orang lain"),
      I("L1", "Orang yang bertakwa disebut ....", "muttaqin"),
      U("L2", "Jelaskan arti \"bertakwalah kepada Allah di mana pun engkau berada\"!", "Jawaban benar memuat inti: taat kepada Allah dan menjauhi larangan-Nya baik di tempat ramai maupun sepi, dilihat orang atau tidak. Skor penuh bila inti ini ada.")
    ],
    // aqh-B-12: Hadis tentang niat
    "aqh-B-12": [
      P("L1", "Hadis \"innamal a'malu binniyyat\" artinya setiap amal tergantung pada ...", "niatnya", "banyaknya", "waktunya", "tempatnya"),
      P("L1", "Niat tempatnya di ...", "hati", "tangan", "kaki", "telinga"),
      I("L1", "Niat yang ikhlas dilakukan hanya karena ....", "Allah"),
      U("L2", "Mengapa niat penting sebelum beramal? Jelaskan!", "Jawaban benar memuat inti: niat menentukan nilai amal; amal yang diniatkan karena Allah bernilai ibadah. Skor penuh bila inti ini ada.")
    ],
    // aqh-B-13: Hadis tentang silaturahmi
    "aqh-B-13": [
      P("L1", "Silaturahmi artinya menyambung tali ...", "persaudaraan", "benang", "jalan", "tali sepatu"),
      P("L1", "Menurut hadis, orang yang menyambung silaturahmi akan diluaskan rezekinya dan ...", "dipanjangkan umurnya", "dijauhkan dari belajar", "dijauhkan dari saudara", "dibebaskan dari tugas"),
      I("L1", "Mengunjungi kakek dan nenek termasuk menyambung ....", "silaturahmi"),
      U("L2", "Tuliskan tiga cara bersilaturahmi!", "Contoh benar: berkunjung ke rumah saudara, menelepon kerabat, menjenguk yang sakit, saling memaafkan, mengirim kabar. Skor sebanding jumlah cara yang benar.")
    ],
    // ===================== FASE C (KELAS 5-6 MI) =====================
    // aqh-C-5: Ayat tentang orang munafik
    "aqh-C-5": [
      P("L1", "Orang munafik adalah orang yang di mulut mengaku beriman, tetapi di hati ...", "tidak beriman", "sangat beriman", "selalu berdoa", "rajin beribadah"),
      I("L1", "Orang yang lahirnya tampak beriman tetapi batinnya ingkar disebut ....", "munafik"),
      P("L2", "Menurut Al-Baqarah ayat 8, ucapan orang munafik \"kami beriman kepada Allah dan hari akhir\" sebenarnya ...", "tidak sesuai dengan isi hatinya", "benar adanya", "tanda ketakwaan", "tanda kejujuran"),
      U("L2", "Jelaskan arti ayat tentang orang munafik pada Al-Baqarah ayat 8 dengan kata-katamu sendiri!", "Jawaban benar memuat inti: ada orang yang mengaku beriman kepada Allah dan hari akhir, padahal sebenarnya mereka tidak beriman. Skor penuh bila inti ini ada.")
    ],
    // aqh-C-6: Ayat tentang menyayangi anak yatim
    "aqh-C-6": [
      P("L1", "Anak yatim adalah anak yang ayahnya ...", "telah meninggal dunia", "pergi bekerja", "sedang sakit", "pindah rumah"),
      P("L2", "Menurut surah Al-Ma'un, orang yang mendustakan agama adalah orang yang ... anak yatim.", "menghardik", "menyayangi", "memberi makan", "mendoakan"),
      I("L2", "Surah Ad-Duha ayat 9 melarang kita berlaku sewenang-wenang terhadap anak ....", "yatim"),
      U("L2", "Tuliskan dua cara menyayangi anak yatim!", "Contoh benar: berkata lembut, berbagi makanan atau perlengkapan sekolah, mengajak bermain, membantu kebutuhannya, mendoakan. Skor sebanding jumlah cara yang benar.")
    ],
    // aqh-C-7: Ayat tentang keutamaan memberi
    "aqh-C-7": [
      P("L2", "Menurut Al-Baqarah ayat 261, orang yang berinfak di jalan Allah diumpamakan seperti sebutir biji yang menumbuhkan ... tangkai.", "tujuh", "tiga", "sepuluh", "dua belas"),
      P("L2", "Pada setiap tangkai tersebut terdapat ... biji.", "seratus", "sepuluh", "tujuh", "seribu"),
      I("L1", "Memberikan harta di jalan Allah disebut ....", "infak"),
      U("L2", "Jelaskan makna perumpamaan sebutir biji pada Al-Baqarah ayat 261!", "Jawaban benar memuat inti: harta yang diinfakkan di jalan Allah akan dibalas dengan pahala yang dilipatgandakan. Skor penuh bila inti ini ada.")
    ],
    // aqh-C-8: Ayat tentang amal saleh
    "aqh-C-8": [
      P("L1", "Amal saleh adalah perbuatan yang ...", "baik dan bermanfaat", "merugikan orang lain", "tidak ada gunanya", "dilakukan terpaksa"),
      P("L2", "Menurut Al-Bayyinah ayat 7, orang yang beriman dan beramal saleh adalah ...", "sebaik-baik makhluk", "makhluk yang merugi", "makhluk yang lalai", "makhluk yang tersesat"),
      I("L1", "Membantu teman membersihkan kelas termasuk amal ....", "saleh"),
      U("L2", "Tuliskan tiga contoh amal saleh yang dapat dilakukan murid di madrasah!", "Contoh benar: menjaga kebersihan kelas, membantu teman, salat berjemaah, menghormati guru, berkata jujur. Skor sebanding jumlah contoh yang benar.")
    ],
    // aqh-C-9: Hadis tentang ciri orang munafik
    "aqh-C-9": [
      P("L1", "Menurut hadis, tanda orang munafik ada ...", "tiga", "dua", "empat", "lima"),
      P("L1", "Salah satu tanda orang munafik adalah apabila berbicara ia ...", "berdusta", "jujur", "berhati-hati", "berpikir dahulu"),
      I("L1", "Apabila dipercaya ia berkhianat, ini adalah tanda orang ....", "munafik"),
      U("L2", "Sebutkan tiga tanda orang munafik menurut hadis!", "Apabila berbicara berdusta; apabila berjanji mengingkari; apabila dipercaya berkhianat. Skor sebanding jumlah tanda yang benar.")
    ],
    // aqh-C-10: Hadis tentang menyayangi anak yatim
    "aqh-C-10": [
      P("L1", "Menurut hadis, orang yang menanggung anak yatim akan berada dekat dengan Nabi di ...", "surga", "pasar", "sekolah", "kota Madinah"),
      P("L2", "Isyarat dua jari (telunjuk dan tengah) dalam hadis menunjukkan ...", "dekatnya kedudukan penanggung anak yatim dengan Nabi di surga", "jumlah anak yatim yang ditanggung", "jumlah rakaat salat sunah", "jumlah hari berpuasa"),
      I("L1", "Anak yang ayahnya telah wafat disebut anak ....", "yatim"),
      U("L2", "Tuliskan arti hadis tentang menanggung anak yatim dan satu cara melaksanakannya!", "Arti: orang yang menanggung anak yatim akan dekat dengan Nabi di surga. Cara melaksanakan, contoh: menyayangi, membantu kebutuhan sekolah, berbagi makanan. Skor penuh bila arti dan satu cara sama-sama ada.")
    ],
    // aqh-C-11: Hadis tentang keutamaan memberi
    "aqh-C-11": [
      P("L1", "\"Tangan di atas\" dalam hadis maksudnya adalah orang yang ...", "memberi", "meminta", "menerima", "menyimpan"),
      P("L1", "\"Tangan di bawah\" dalam hadis maksudnya adalah orang yang ...", "meminta atau menerima", "memberi", "bekerja keras", "berdagang"),
      I("L1", "Memberi lebih baik daripada ....", "meminta"),
      U("L2", "Mengapa kita dianjurkan lebih suka memberi daripada meminta? Jelaskan!", "Jawaban benar memuat inti: memberi mendatangkan pahala dan menolong sesama, sedangkan meminta-minta menurunkan kehormatan diri. Skor penuh bila inti ini ada.")
    ],
    // aqh-C-12: Hadis tentang amal saleh yang tidak terputus
    "aqh-C-12": [
      P("L1", "Amal yang pahalanya tidak terputus setelah meninggal dunia adalah ...", "doa anak yang saleh", "banyaknya harta", "luasnya rumah", "banyaknya teman"),
      P("L2", "Contoh sedekah jariah adalah ...", "membangun tempat wudu untuk masjid", "memberi permen kepada teman", "membeli mainan baru", "menabung di celengan"),
      I("L1", "Tiga amal yang tidak terputus: sedekah jariah, ilmu yang bermanfaat, dan anak yang ... yang mendoakannya.", "saleh"),
      U("L2", "Sebutkan tiga amal yang pahalanya terus mengalir setelah seseorang meninggal dunia!", "Sedekah jariah; ilmu yang bermanfaat; anak saleh yang mendoakan. Skor sebanding jumlah yang benar.")
    ]
  };

  window.BANK_SOAL_AQH_INFO = {
    "aqh-A-4": { fase: "A", jenis: "Al-Qur'an", judul: "Hafalan surah pendek pilihan (identitas surah)", rujukan: "QS. Al-Fatihah (7 ayat); QS. An-Nas (6 ayat); QS. Al-Ikhlas (4 ayat); QS. Al-Falaq (5 ayat)" },
    "aqh-A-5": { fase: "A", jenis: "Al-Qur'an", judul: "Isi surah pendek dan penerapannya", rujukan: "QS. Al-Fatihah (7 ayat); QS. An-Nas (6 ayat); QS. Al-Ikhlas (4 ayat); QS. Al-Falaq (5 ayat)" },
    "aqh-A-6": { fase: "A", jenis: "Hadis", judul: "Hadis tentang kebersihan", rujukan: "HR. Muslim: الطُّهُورُ شَطْرُ الْإِيمَانِ (Kebersihan/kesucian adalah sebagian dari iman)" },
    "aqh-A-7": { fase: "A", jenis: "Hadis", judul: "Hadis tentang keutamaan belajar", rujukan: "HR. Muslim: مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ" },
    "aqh-A-8": { fase: "A", jenis: "Hadis", judul: "Hadis tentang berbakti kepada orang tua", rujukan: "HR. at-Tirmidzi: rida Allah bergantung pada rida orang tua, murka Allah bergantung pada murka orang tua (teks Arab ikut buku ajar madrasah)" },
    "aqh-B-7": { fase: "B", jenis: "Al-Qur'an", judul: "Hafalan dan tulisan surah pendek (identitas surah)", rujukan: "QS. Al-Asr (3 ayat); QS. Al-Kautsar (3 ayat); QS. An-Nasr (3 ayat); QS. Al-Kafirun (6 ayat); QS. Al-Fil (5 ayat); QS. Quraisy (4 ayat)" },
    "aqh-B-8": { fase: "B", jenis: "Al-Qur'an", judul: "Arti dan isi kandungan surah pendek", rujukan: "QS. Al-Asr (3 ayat); QS. Al-Kautsar (3 ayat); QS. An-Nasr (3 ayat); QS. Al-Kafirun (6 ayat); QS. Al-Fil (5 ayat); QS. Quraisy (4 ayat)" },
    "aqh-B-9": { fase: "B", jenis: "Hadis", judul: "Hadis tentang salat berjemaah", rujukan: "HR. al-Bukhari dan Muslim: salat berjemaah lebih utama 27 derajat daripada salat sendirian" },
    "aqh-B-10": { fase: "B", jenis: "Hadis", judul: "Hadis tentang persaudaraan", rujukan: "HR. al-Bukhari dan Muslim: seorang muslim adalah saudara bagi muslim lainnya; ia tidak menzaliminya dan tidak membiarkannya dalam kesulitan" },
    "aqh-B-11": { fase: "B", jenis: "Hadis", judul: "Hadis tentang takwa", rujukan: "HR. at-Tirmidzi: bertakwalah kepada Allah di mana pun berada, iringilah perbuatan buruk dengan kebaikan, dan bergaullah dengan akhlak yang baik" },
    "aqh-B-12": { fase: "B", jenis: "Hadis", judul: "Hadis tentang niat", rujukan: "HR. al-Bukhari dan Muslim: إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ (Sesungguhnya setiap amal tergantung pada niatnya)" },
    "aqh-B-13": { fase: "B", jenis: "Hadis", judul: "Hadis tentang silaturahmi", rujukan: "HR. al-Bukhari dan Muslim: siapa yang ingin diluaskan rezekinya dan dipanjangkan umurnya, hendaklah menyambung silaturahmi" },
    "aqh-C-5": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang orang munafik", rujukan: "QS. Al-Baqarah: 8" },
    "aqh-C-6": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang menyayangi anak yatim", rujukan: "QS. Al-Ma'un: 1-3 dan QS. Ad-Duha: 9" },
    "aqh-C-7": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang keutamaan memberi", rujukan: "QS. Al-Baqarah: 261 dan QS. Al-Lail: 5-7" },
    "aqh-C-8": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang amal saleh", rujukan: "QS. Al-Bayyinah: 7" },
    "aqh-C-9": { fase: "C", jenis: "Hadis", judul: "Hadis tentang ciri orang munafik", rujukan: "HR. al-Bukhari dan Muslim: tanda munafik ada tiga, yaitu berdusta ketika berbicara, mengingkari janji, dan berkhianat ketika dipercaya" },
    "aqh-C-10": { fase: "C", jenis: "Hadis", judul: "Hadis tentang menyayangi anak yatim", rujukan: "HR. al-Bukhari: aku dan orang yang menanggung anak yatim di surga seperti ini (dengan mengisyaratkan jari telunjuk dan jari tengah)" },
    "aqh-C-11": { fase: "C", jenis: "Hadis", judul: "Hadis tentang keutamaan memberi", rujukan: "HR. al-Bukhari dan Muslim: tangan di atas lebih baik daripada tangan di bawah" },
    "aqh-C-12": { fase: "C", jenis: "Hadis", judul: "Hadis tentang amal saleh yang tidak terputus", rujukan: "HR. Muslim: apabila manusia meninggal, terputus amalnya kecuali tiga, yaitu sedekah jariah, ilmu yang bermanfaat, dan anak saleh yang mendoakannya" }
  };

  // Gabungkan ke bank utama tanpa menimpa kunci yang sudah ada.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(window.BANK_SOAL_MI, k)) window.BANK_SOAL_MI[k] = BARU[k];
  });
})();
;

/* ################ BAGIAN: data-soal-aqh-tajwid.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-aqh-tajwid.js
   TAMBAHAN soal Tajwid Al-Qur'an Hadis MI Fase A-C. Soal DITAMBAHKAN ke kunci TP yang sudah ada di
   js/data-soal-mi.js (aqh-A-1..3, aqh-B-1..6, aqh-C-1..4); soal lama tidak diubah dan soal yang
   bunyinya sama tidak diulang. Kunci = kunci TP di js/data-tp-mi.js.
   Status: DRAF, belum diperiksa guru. Contoh bacaan dan istilah (mis. jawazul wajhain) mengikuti buku ajar madrasah.
   Format sama dengan data-soal-mi.js (PG: jawaban benar di posisi pertama; opsi diacak saat dipakai).
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const TAMBAH = {
    // Huruf hijaiyah dan tanda baca
    "aqh-A-1": [
      P("L1", "Jumlah huruf hijaiyah ada ...", "dua puluh delapan", "dua puluh lima", "tiga puluh", "dua puluh"),
      P("L1", "Huruf hijaiyah ditulis dari arah ...", "kanan ke kiri", "kiri ke kanan", "atas ke bawah", "bawah ke atas"),
      P("L1", "Tanda baca fathah diletakkan di ... huruf.", "atas", "bawah", "depan", "belakang"),
      P("L1", "Tanda baca yang diletakkan di bawah huruf disebut ...", "kasrah", "fathah", "dammah", "sukun"),
      P("L1", "Tanda baca dammah dibaca dengan bunyi ...", "u", "a", "i", "e"),
      I("L1", "Tanda baca fathah dibaca dengan bunyi ....", "a"),
      I("L1", "Tanda baca yang membuat huruf menjadi mati disebut ....", "sukun"),
      U("L2", "Sebutkan tiga tanda baca (harakat) beserta bunyinya!", "Fathah (a), kasrah (i), dammah (u). Skor sebanding jumlah pasangan yang benar.")
    ],
    // Hukum bacaan gunnah
    "aqh-A-2": [
      P("L1", "Gunnah dibaca pada huruf nun dan mim yang ...", "bertasydid", "berharakat fathah", "berharakat kasrah", "tidak bertanda apa pun"),
      P("L1", "Mim yang bertasydid dibaca dengan ...", "dengung (gunnah)", "pantulan bunyi", "panjang enam harakat", "jelas tanpa dengung"),
      P("L1", "Bunyi dengung pada gunnah diambil dari ...", "pangkal hidung", "ujung lidah", "bibir", "tenggorokan"),
      I("L1", "Nun dan mim bertasydid dibaca dengan ....", "dengung (gunnah)"),
      U("L2", "Jelaskan yang dimaksud gunnah!", "Jawaban benar memuat inti: bunyi dengung dari pangkal hidung pada nun dan mim yang bertasydid, lamanya sekitar dua harakat. Skor penuh bila inti ini ada.")
    ],
    // Alif Lam Qamariyah dan Syamsiyah
    "aqh-A-3": [
      P("L1", "Huruf qamariyah berjumlah ...", "empat belas", "dua belas", "lima belas", "tiga belas"),
      P("L1", "Huruf syamsiyah berjumlah ...", "empat belas", "dua belas", "lima belas", "sepuluh"),
      P("L1", "Qamariyah berasal dari kata qamar yang artinya ...", "bulan", "matahari", "bintang", "langit"),
      P("L1", "Alif Lam yang bertemu huruf ba dibaca ...", "jelas (Qamariyah)", "tidak dibaca (Syamsiyah)", "dengan dengung", "dengan pantulan"),
      P("L2", "Alif Lam yang bertemu huruf syin termasuk Alif Lam ...", "Syamsiyah", "Qamariyah", "Mad", "Gunnah"),
      I("L1", "Syamsiyah berasal dari kata syams yang artinya ....", "matahari"),
      U("L2", "Sebutkan perbedaan cara membaca Alif Lam Qamariyah dan Alif Lam Syamsiyah!", "Qamariyah: lam dibaca jelas. Syamsiyah: lam tidak dibaca dan huruf sesudahnya bertasydid. Skor separuh untuk masing-masing jawaban yang benar.")
    ],
    // Hukum bacaan kalkalah
    "aqh-B-1": [
      P("L1", "Huruf kalkalah dikumpulkan dalam kalimat ...", "qutbu jad", "yarmalun", "ibghi hajjaka", "sakata"),
      P("L2", "Kalkalah terjadi apabila huruf kalkalah dalam keadaan ...", "sukun (mati)", "berharakat fathah", "berharakat dammah", "bertasydid"),
      P("L1", "Kalkalah dibaca dengan cara ...", "memantulkan bunyi huruf", "berdengung", "memanjangkan bunyi", "menyamarkan bunyi"),
      I("L2", "Pantulan bunyi pada kalkalah terjadi ketika huruf kalkalah dalam keadaan ....", "sukun (mati)"),
      U("L1", "Sebutkan lima huruf kalkalah!", "Qaf, tha, ba, jim, dal. Skor sebanding jumlah huruf yang benar.")
    ],
    // Mad tabi'i
    "aqh-B-2": [
      P("L1", "Mad tabi'i terjadi jika fathah bertemu ...", "alif", "wawu sukun", "ya sukun", "hamzah"),
      P("L1", "Mad tabi'i terjadi jika kasrah bertemu ...", "ya sukun", "alif", "wawu sukun", "ra"),
      P("L1", "Huruf mad ada ... buah.", "tiga", "dua", "empat", "lima"),
      P("L1", "Bacaan dua harakat sama dengan panjang sekitar ...", "dua ketukan", "empat ketukan", "enam ketukan", "satu ketukan"),
      I("L1", "Huruf mad ada tiga, yaitu alif, wawu sukun, dan ... sukun.", "ya"),
      U("L2", "Sebutkan tiga keadaan yang menyebabkan mad tabi'i!", "Fathah bertemu alif; kasrah bertemu ya sukun; dammah bertemu wawu sukun. Skor sebanding jumlah keadaan yang benar.")
    ],
    // Izhar halqi
    "aqh-B-3": [
      P("L1", "Halqi berarti ...", "tenggorokan", "hidung", "bibir", "lidah"),
      P("L1", "Huruf berikut yang termasuk huruf izhar halqi adalah ...", "'ain", "ba", "lam", "ya"),
      P("L2", "Nun sukun bertemu huruf kha dibaca ...", "izhar (jelas) tanpa dengung", "ikhfa", "idgam", "iqlab"),
      I("L1", "Huruf izhar halqi keluar dari ....", "tenggorokan"),
      U("L2", "Jelaskan cara membaca izhar halqi dan sebutkan dua hurufnya!", "Dibaca jelas tanpa dengung. Huruf yang benar antara lain: hamzah, ha, ain, ha (ح), ghain, kha. Skor separuh untuk cara baca, separuh untuk dua huruf yang benar.")
    ],
    // Ikhfa' hakiki
    "aqh-B-4": [
      P("L1", "Nun sukun bertemu huruf kaf dibaca ...", "ikhfa", "izhar", "idgam", "iqlab"),
      P("L1", "Nun sukun bertemu huruf ta dibaca ...", "ikhfa", "izhar", "idgam bilagunnah", "iqlab"),
      P("L1", "Contoh huruf ikhfa hakiki adalah ...", "sin", "ain", "ha (ه)", "ba"),
      P("L2", "Ikhfa dibaca dengan dengung sekitar ... harakat.", "dua", "empat", "enam", "satu"),
      I("L1", "Ikhfa dibaca samar dan disertai ....", "dengung (gunnah)"),
      U("L2", "Sebutkan lima huruf ikhfa' hakiki!", "Contoh benar: ta, tsa, jim, dal, dzal, za, sin, syin, shad, dhad, tha, zha, fa, qaf, kaf (lima huruf mana saja). Skor sebanding jumlah huruf yang benar.")
    ],
    // Idgam bigunnah dan bilagunnah
    "aqh-B-5": [
      P("L1", "Idgam bigunnah dibaca dengan ...", "dengung", "tanpa dengung", "pantulan bunyi", "panjang enam harakat"),
      P("L1", "Idgam bilagunnah dibaca ...", "tanpa dengung", "dengan dengung", "dengan pantulan", "samar"),
      P("L1", "Nun sukun bertemu huruf mim dibaca ...", "idgam bigunnah", "idgam bilagunnah", "ikhfa", "iqlab"),
      P("L1", "Nun sukun bertemu huruf ra dibaca ...", "idgam bilagunnah", "idgam bigunnah", "izhar", "ikhfa"),
      P("L2", "Huruf idgam bigunnah dikumpulkan dalam kata ...", "yanmu", "qutbu jad", "hadza", "sakata"),
      I("L1", "Nun sukun bertemu huruf lam dibaca idgam ....", "bilagunnah"),
      U("L2", "Sebutkan huruf idgam bigunnah dan idgam bilagunnah!", "Idgam bigunnah: ya, nun, mim, wawu. Idgam bilagunnah: lam dan ra. Skor separuh untuk masing-masing kelompok yang lengkap dan benar.")
    ],
    // Iqlab
    "aqh-B-6": [
      P("L1", "Huruf iqlab berjumlah ...", "satu", "dua", "tiga", "empat"),
      P("L2", "Pada iqlab, yang diganti dengan bunyi mim adalah ...", "nun sukun atau tanwin", "huruf ba", "huruf mim", "tanda mad"),
      P("L2", "Iqlab dibaca dengan dengung dan bibir ...", "dirapatkan", "dibuka lebar", "dimonyongkan terus", "digigit"),
      I("L1", "Huruf iqlab hanya ....", "ba"),
      U("L2", "Jelaskan cara membaca iqlab!", "Nun sukun atau tanwin yang bertemu ba diganti bunyi mim samar disertai dengung dengan bibir dirapatkan. Skor penuh bila penggantian menjadi mim dan dengung ada.")
    ],
    // Hukum bacaan mim sukun
    "aqh-C-1": [
      P("L1", "Mim sukun bertemu huruf selain mim dan ba dibaca ...", "izhar syafawi", "ikhfa syafawi", "idgam mimi", "iqlab"),
      P("L1", "Syafawi berarti ...", "bibir", "hidung", "tenggorokan", "lidah"),
      P("L1", "Izhar syafawi dibaca ...", "jelas tanpa dengung", "samar dengan dengung", "dilebur dengan dengung", "diganti mim"),
      P("L2", "Ikhfa syafawi dibaca samar dengan dengung sekitar ... harakat.", "dua", "empat", "enam", "satu"),
      I("L1", "Mim sukun bertemu huruf ba dibaca ikhfa ....", "syafawi"),
      U("L2", "Sebutkan tiga hukum bacaan mim sukun beserta cirinya!", "Ikhfa syafawi: mim sukun bertemu ba. Idgam mimi: mim sukun bertemu mim. Izhar syafawi: mim sukun bertemu huruf selain mim dan ba. Skor sebanding jumlah pasangan yang benar.")
    ],
    // Waqaf dan wasal
    "aqh-C-2": [
      P("L1", "Lawan dari waqaf adalah ...", "wasal", "mad", "gunnah", "iqlab"),
      P("L2", "Tanda \"لا\" pada Al-Qur'an menunjukkan kita ...", "tidak boleh berhenti", "harus berhenti", "wajib mengulang", "boleh membaca sambil duduk"),
      P("L1", "Waqaf dilakukan antara lain agar bacaan jelas maknanya dan ...", "cukup napas", "semakin cepat", "bunyi hilang", "suara besar"),
      I("L1", "Melanjutkan bacaan tanpa berhenti disebut ....", "wasal"),
      U("L2", "Jelaskan perbedaan waqaf dan wasal!", "Waqaf: berhenti sejenak pada akhir kata sambil mengambil napas. Wasal: melanjutkan bacaan tanpa berhenti. Skor separuh untuk masing-masing jawaban yang benar.")
    ],
    // Ra' tafkhim dan tarqiq
    "aqh-C-3": [
      P("L1", "Tafkhim artinya ...", "tebal", "tipis", "panjang", "pendek"),
      P("L1", "Tarqiq artinya ...", "tipis", "tebal", "jelas", "samar"),
      P("L2", "Ra' sukun yang jatuh sesudah fathah dibaca ...", "tafkhim", "tarqiq", "ikhfa", "izhar"),
      P("L2", "Ra' sukun yang jatuh sesudah kasrah dibaca ...", "tarqiq", "tafkhim", "ikhfa", "izhar"),
      I("L1", "Ra' berharakat dammah dibaca ....", "tafkhim"),
      U("L2", "Sebutkan tiga keadaan ra' dibaca tafkhim!", "Ra' berharakat fathah; ra' berharakat dammah; ra' sukun yang jatuh sesudah fathah atau dammah. Skor sebanding jumlah keadaan yang benar.")
    ],
    // Jawazul wajhain
    "aqh-C-4": [
      P("L1", "Jawaz dalam jawazul wajhain artinya ...", "boleh", "wajib", "dilarang", "sunah"),
      P("L1", "Wajhain dalam jawazul wajhain artinya ...", "dua cara", "tiga cara", "satu cara", "empat cara"),
      I("L1", "Jawazul wajhain berarti bacaan yang boleh dibaca dengan dua ....", "cara"),
      U("L2", "Jelaskan arti jawazul wajhain dengan kata-katamu sendiri!", "Jawaban benar memuat inti: bacaan yang boleh dibaca dengan dua cara. Contoh bacaannya mengikuti buku ajar madrasah. Skor penuh bila inti ini ada.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;

/* ################ BAGIAN: data-soal-ba.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-ba.js
   Bank soal DRAF Bahasa Arab MI Fase A-C. Melengkapi js/data-soal-mi.js yang belum memuat Bahasa Arab.
   KUNCI = kunci TP di js/data-tp-mi.js (mapel 'ba'): ba-A-1..10, ba-B-1..13, ba-C-1..10 (total 33 TP).
   JIKA urutan TP di data-tp-mi.js diubah, kunci di file ini harus ikut disesuaikan.
   Acuan: SK Dirjen Pendis No. 9941 Tahun 2025 (Bahasa Arab MI). SK hanya menyebut tema/topik, sehingga
   DAFTAR KOSAKATA dan POLA KALIMAT di sini adalah pilihan penyusun yang umum dipakai pada buku ajar madrasah.
   Guru wajib mencocokkannya dengan buku ajar/KMA madrasah, lalu mengganti atau menghapus yang tidak sesuai.
   Status: DRAF, belum diperiksa guru. Tanda baca (harakat) pada teks Arab sengaja minim; tambahkan sesuai buku ajar.
   Format sama dengan data-soal-mi.js:
     PG    : ['pg', level, soal, [jawaban BENAR, pengecoh1, pengecoh2, pengecoh3]]  (opsi diacak saat dipakai)
     Isian : ['is', level, soal, jawaban]
     Uraian: ['ur', level, soal, pedoman penskoran]
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const BARU = {
    // ===================== FASE A =====================
    // Perkenalan
    "ba-A-1": [
      P("L1", "Arti “اسمي” adalah ...", "namaku", "kelasku", "ayahku", "rumahku"),
      P("L1", "Jawaban yang tepat untuk pertanyaan “ما اسمك؟” adalah ...", "اسمي أحمد", "أنا بخير", "هذا كتاب", "مع السلامة"),
      P("L1", "Salam pembuka ketika bertemu dan berkenalan adalah ...", "السلام عليكم", "مع السلامة", "شكرا", "عفوا"),
      P("L1", "Arti “مع السلامة” adalah ...", "selamat tinggal", "selamat pagi", "terima kasih", "sama-sama"),
      I("L1", "Arti “أنا” adalah ....", "saya (aku)")
    ],
    // Keluargaku
    "ba-A-2": [
      P("L1", "Arti “أب” adalah ...", "ayah", "ibu", "kakek", "nenek"),
      P("L1", "Bahasa Arab “ibu” adalah ...", "أم", "أب", "أخت", "جدة"),
      P("L1", "Bahasa Arab “nenek” adalah ...", "جدة", "جد", "أخت", "أم"),
      P("L1", "Arti “أخ” adalah ...", "saudara laki-laki", "saudara perempuan", "ayah", "ibu"),
      I("L1", "Arti “أخت” adalah ....", "saudara perempuan")
    ],
    // Rumahku
    "ba-A-3": [
      P("L1", "Arti “بيت” adalah ...", "rumah", "sekolah", "masjid", "pasar"),
      P("L1", "Tempat memasak di rumah disebut ...", "المطبخ", "الحمام", "غرفة النوم", "الحديقة"),
      P("L1", "Arti “غرفة النوم” adalah ...", "kamar tidur", "dapur", "kamar mandi", "taman"),
      P("L1", "Bahasa Arab “taman” adalah ...", "الحديقة", "المطبخ", "الحمام", "غرفة النوم"),
      I("L1", "Arti “الحمام” adalah ....", "kamar mandi")
    ],
    // Madrasahku
    "ba-A-4": [
      P("L1", "Arti “مدرسة” adalah ...", "madrasah (sekolah)", "rumah", "kantor", "pasar"),
      P("L1", "Bahasa Arab “papan tulis” adalah ...", "سبورة", "كرسي", "مكتب", "كتاب"),
      P("L1", "Arti “قلم” adalah ...", "pena (pulpen)", "buku", "meja", "kursi"),
      P("L1", "Bahasa Arab “guru (laki-laki)” adalah ...", "معلم", "معلمة", "طالب", "طالبة"),
      I("L1", "Arti “كتاب” adalah ....", "buku")
    ],
    // Hobiku
    "ba-A-5": [
      P("L1", "Arti “هوايتي” adalah ...", "hobiku (kegemaranku)", "namaku", "kelasku", "rumahku"),
      P("L1", "Arti “القراءة” adalah ...", "membaca", "menulis", "berenang", "menggambar"),
      P("L1", "Bahasa Arab “berenang” adalah ...", "السباحة", "القراءة", "الكتابة", "الرسم"),
      P("L1", "Bahasa Arab “menggambar” adalah ...", "الرسم", "السباحة", "القراءة", "الكتابة"),
      I("L1", "Arti “الكتابة” adalah ....", "menulis")
    ],
    // Nama-nama buah
    "ba-A-6": [
      P("L1", "Arti “تفاح” adalah ...", "apel", "pisang", "jeruk", "anggur"),
      P("L1", "Bahasa Arab “pisang” adalah ...", "موز", "تفاح", "عنب", "برتقال"),
      P("L1", "Bahasa Arab “jeruk” adalah ...", "برتقال", "موز", "تفاح", "عنب"),
      P("L1", "Arti “بطيخ” adalah ...", "semangka", "mangga", "apel", "pisang"),
      I("L1", "Arti “عنب” adalah ....", "anggur")
    ],
    // Warna-warna
    "ba-A-7": [
      P("L1", "Arti “أحمر” adalah ...", "merah", "biru", "hijau", "kuning"),
      P("L1", "Bahasa Arab “hijau” adalah ...", "أخضر", "أحمر", "أزرق", "أصفر"),
      P("L1", "Bahasa Arab “kuning” adalah ...", "أصفر", "أخضر", "أبيض", "أسود"),
      P("L1", "Lawan warna “أبيض” adalah ...", "أسود", "أحمر", "أزرق", "أخضر"),
      I("L1", "Arti “أزرق” adalah ....", "biru")
    ],
    // Alat transportasi
    "ba-A-8": [
      P("L1", "Arti “سيارة” adalah ...", "mobil", "sepeda", "pesawat", "kapal"),
      P("L1", "Bahasa Arab “kapal” adalah ...", "سفينة", "طائرة", "قطار", "سيارة"),
      P("L1", "Bahasa Arab “pesawat” adalah ...", "طائرة", "سفينة", "دراجة", "قطار"),
      P("L1", "Alat transportasi yang berjalan di atas rel adalah ...", "قطار", "سفينة", "طائرة", "دراجة"),
      I("L1", "Arti “دراجة” adalah ....", "sepeda")
    ],
    // Pemandangan alam
    "ba-A-9": [
      P("L1", "Arti “جبل” adalah ...", "gunung", "laut", "sungai", "pohon"),
      P("L1", "Bahasa Arab “laut” adalah ...", "بحر", "جبل", "نهر", "شجرة"),
      P("L1", "Bahasa Arab “matahari” adalah ...", "شمس", "قمر", "سماء", "نهر"),
      P("L1", "Bahasa Arab “sungai” adalah ...", "نهر", "بحر", "جبل", "شمس"),
      I("L1", "Arti “سماء” adalah ....", "langit")
    ],
    // Keterampilan berbahasa
    "ba-A-10": [
      P("L1", "Keterampilan bahasa yang memakai telinga adalah ...", "menyimak", "berbicara", "membaca", "menulis"),
      P("L1", "Bahasa Arab “menulis” adalah ...", "الكتابة", "القراءة", "الكلام", "الاستماع"),
      P("L1", "Arti “الكلام” adalah ...", "berbicara", "menyimak", "membaca", "menulis"),
      I("L1", "Arti “الاستماع” adalah ....", "menyimak"),
      U("L2", "Perkenalkan dirimu dalam bahasa Arab sederhana (nama dan kelas)! Boleh ditulis dengan lafal latin.", "Jawaban memuat nama dan kelas, mis. “اسمي ... أنا في الصف ...”. Skor 50 untuk nama, 50 untuk kelas; kesalahan kecil lafal tidak mengurangi skor.")
    ],

    // ===================== FASE B =====================
    // Materi pelajaran
    "ba-B-1": [
      P("L1", "Arti “الرياضيات” adalah ...", "matematika", "bahasa Arab", "olahraga", "ilmu pengetahuan alam"),
      P("L1", "Arti “اللغة العربية” adalah ...", "bahasa Arab", "bahasa Inggris", "bahasa Indonesia", "matematika"),
      P("L1", "Bahasa Arab “ilmu pengetahuan alam (sains)” adalah ...", "العلوم", "الرياضيات", "اللغة العربية", "الرسم"),
      P("L2", "Arti kalimat “ما درسك اليوم؟” adalah ...", "Apa pelajaranmu hari ini?", "Siapa namamu?", "Di mana rumahmu?", "Jam berapa sekarang?"),
      I("L1", "Arti “اليوم” adalah ....", "hari ini")
    ],
    // Nama-nama binatang
    "ba-B-2": [
      P("L1", "Arti “أسد” adalah ...", "singa", "gajah", "kuda", "unta"),
      P("L1", "Bahasa Arab “gajah” adalah ...", "فيل", "أسد", "حصان", "جمل"),
      P("L1", "Bahasa Arab “ikan” adalah ...", "سمكة", "عصفور", "بقرة", "دجاجة"),
      P("L2", "Arti kalimat “هذا حصان” adalah ...", "Ini kuda", "Itu kuda", "Ini sapi", "Ini unta"),
      I("L1", "Arti “عصفور” adalah ....", "burung")
    ],
    // Penyakit
    "ba-B-3": [
      P("L1", "Arti “صداع” adalah ...", "sakit kepala", "sakit gigi", "demam", "batuk"),
      P("L1", "Bahasa Arab “demam” adalah ...", "حمى", "صداع", "سعال", "زكام"),
      P("L1", "Arti “طبيب” adalah ...", "dokter", "guru", "pilot", "polisi"),
      P("L2", "Arti kalimat “أنا مريض” adalah ...", "Saya sakit", "Saya sehat", "Saya lapar", "Saya haus"),
      I("L1", "Arti “دواء” adalah ....", "obat")
    ],
    // Olahraga
    "ba-B-4": [
      P("L1", "Arti “كرة القدم” adalah ...", "sepak bola", "bola basket", "bola voli", "renang"),
      P("L1", "Bahasa Arab “renang” adalah ...", "السباحة", "الجري", "كرة القدم", "كرة السلة"),
      P("L1", "Bahasa Arab “lari” adalah ...", "الجري", "السباحة", "كرة الطائرة", "كرة القدم"),
      P("L2", "Arti kalimat “أحب كرة القدم” adalah ...", "Saya suka sepak bola", "Saya bermain voli", "Saya benci sepak bola", "Saya menonton renang"),
      I("L1", "Arti “الرياضة” adalah ....", "olahraga")
    ],
    // Teman-temanku
    "ba-B-5": [
      P("L1", "Arti “صديقي” adalah ...", "temanku", "ayahku", "bukuku", "rumahku"),
      P("L1", "Bahasa Arab “temanku (perempuan)” adalah ...", "صديقتي", "صديقي", "أختي", "أمي"),
      P("L2", "Arti kalimat “هذا صديقي” adalah ...", "Ini temanku", "Ini bukuku", "Ini rumahku", "Ini gurunya"),
      P("L1", "Arti “يلعب” adalah ...", "bermain", "belajar", "makan", "tidur"),
      I("L1", "Arti “زميل” adalah ....", "teman sekelas")
    ],
    // Taman
    "ba-B-6": [
      P("L1", "Arti “الحديقة” adalah ...", "taman", "kantin", "kelas", "perpustakaan"),
      P("L1", "Bahasa Arab “bunga” adalah ...", "زهرة", "شجرة", "عشب", "فراشة"),
      P("L1", "Bahasa Arab “pohon” adalah ...", "شجرة", "زهرة", "فراشة", "مقعد"),
      P("L2", "Arti kalimat “في الحديقة أزهار” adalah ...", "Di taman ada bunga-bunga", "Di taman ada pohon besar", "Di rumah ada bunga", "Di kantin ada bunga"),
      I("L1", "Arti “فراشة” adalah ....", "kupu-kupu")
    ],
    // Alamat
    "ba-B-7": [
      P("L1", "Arti “ما عنوانك؟” adalah ...", "Apa alamatmu?", "Siapa namamu?", "Berapa umurmu?", "Kamu kelas berapa?"),
      P("L1", "Arti “أين تسكن؟” adalah ...", "Di mana kamu tinggal?", "Kamu dari mana?", "Kamu mau ke mana?", "Kamu sedang apa?"),
      P("L1", "Arti “شارع” adalah ...", "jalan", "kota", "desa", "rumah"),
      P("L2", "Jawaban yang tepat untuk “أين تسكن؟” adalah ...", "أسكن في القرية", "اسمي سعيد", "أنا طالب", "هذا كتاب"),
      I("L1", "Arti “مدينة” adalah ....", "kota")
    ],
    // Profesi
    "ba-B-8": [
      P("L1", "Arti “فلاح” adalah ...", "petani", "pedagang", "guru", "sopir"),
      P("L1", "Bahasa Arab “polisi” adalah ...", "شرطي", "طيار", "تاجر", "سائق"),
      P("L1", "Bahasa Arab “pilot” adalah ...", "طيار", "شرطي", "فلاح", "معلم"),
      P("L2", "Arti kalimat “أبي تاجر” adalah ...", "Ayahku pedagang", "Ayahku guru", "Ibuku dokter", "Kakakku petani"),
      I("L1", "Arti “سائق” adalah ....", "sopir")
    ],
    // Cita-citaku
    "ba-B-9": [
      P("L2", "Arti kalimat “أريد أن أكون معلما” adalah ...", "Saya ingin menjadi guru", "Saya ingin bertemu guru", "Saya sudah menjadi guru", "Saya tidak mau menjadi guru"),
      P("L1", "Arti “أريد” adalah ...", "saya ingin", "saya pergi", "saya makan", "saya membaca"),
      P("L2", "Kalimat “Saya ingin menjadi dokter” dalam bahasa Arab adalah ...", "أريد أن أكون طبيبا", "أريد أن أكون معلما", "أريد أن أكون طيارا", "أريد أن أكون شرطيا"),
      P("L1", "Arti “مستقبل” adalah ...", "masa depan", "masa lalu", "hari ini", "kemarin"),
      I("L1", "Kalimat “Saya ingin menjadi guru” dalam bahasa Arab: أريد أن أكون ....", "معلما")
    ],
    // Di rumah
    "ba-B-10": [
      P("L1", "Arti “نافذة” adalah ...", "jendela", "pintu", "lampu", "kursi"),
      P("L1", "Bahasa Arab “pintu” adalah ...", "باب", "نافذة", "سرير", "طاولة"),
      P("L1", "Bahasa Arab “tempat tidur” adalah ...", "سرير", "باب", "كرسي", "مصباح"),
      P("L2", "Arti kalimat “الكتاب على الطاولة” adalah ...", "Buku itu di atas meja", "Buku itu di bawah meja", "Buku itu di dalam tas", "Buku itu di samping kursi"),
      I("L1", "Arti “ثلاجة” adalah ....", "kulkas (lemari es)")
    ],
    // Anggota keluarga
    "ba-B-11": [
      P("L1", "Arti “العم” adalah ...", "paman (saudara ayah)", "bibi (saudara ayah)", "kakek", "ayah"),
      P("L1", "Arti “الخالة” adalah ...", "bibi (saudara ibu)", "bibi (saudara ayah)", "nenek", "ibu"),
      P("L1", "Bahasa Arab “kakek” adalah ...", "الجد", "الجدة", "العم", "الخال"),
      P("L2", "Arti kalimat “هذه جدتي” adalah ...", "Ini nenekku", "Ini kakekku", "Ini ibuku", "Ini bibiku"),
      I("L1", "Arti “الخال” adalah ....", "paman (saudara laki-laki ibu)")
    ],
    // Cinta Indonesia
    "ba-B-12": [
      P("L1", "Arti “وطن” adalah ...", "tanah air", "bendera", "pulau", "kota"),
      P("L1", "Bahasa Arab “pulau” adalah ...", "جزيرة", "وطن", "شعب", "عاصمة"),
      P("L2", "Arti kalimat “أحب وطني إندونيسيا” adalah ...", "Saya cinta tanah airku Indonesia", "Saya tinggal di Indonesia", "Saya berasal dari kota ini", "Saya ingin pergi ke luar negeri"),
      P("L1", "Arti “عاصمة” adalah ...", "ibu kota", "pulau", "desa", "pantai"),
      I("L1", "Arti “شعب” adalah ....", "rakyat (bangsa)")
    ],
    // Keterampilan berbahasa
    "ba-B-13": [
      P("L1", "Bahasa Arab “menyimak” adalah ...", "الاستماع", "القراءة", "الكتابة", "الكلام"),
      P("L1", "Keterampilan bahasa yang paling berkaitan dengan mulut adalah ...", "berbicara", "menyimak", "membaca", "memirsa"),
      P("L2", "Menonton video berbahasa Arab termasuk keterampilan ...", "memirsa", "menulis", "berbicara", "membaca"),
      I("L1", "Arti “المشاهدة” adalah ....", "memirsa (menonton)"),
      U("L2", "Tulislah dua kalimat sederhana tentang keluargamu dalam bahasa Arab! Boleh ditulis dengan lafal latin.", "Dua kalimat tentang keluarga memakai kosakata yang dipelajari, mis. “هذا أبي” dan “هذه أمي”. Skor 50 per kalimat yang benar dan sesuai topik; kesalahan kecil penulisan tidak mengurangi skor.")
    ],

    // ===================== FASE C =====================
    // Anggota tubuh
    "ba-C-1": [
      P("L1", "Arti “عين” adalah ...", "mata", "telinga", "hidung", "mulut"),
      P("L1", "Bahasa Arab “telinga” adalah ...", "أذن", "عين", "أنف", "فم"),
      P("L1", "Bahasa Arab “tangan” adalah ...", "يد", "رأس", "فم", "أنف"),
      P("L2", "Arti kalimat “أسمع بالأذن” adalah ...", "Saya mendengar dengan telinga", "Saya melihat dengan mata", "Saya berbicara dengan mulut", "Saya mencium dengan hidung"),
      I("L1", "Arti “فم” adalah ....", "mulut"),
      U("L2", "Tuliskan lima nama anggota tubuh dalam bahasa Arab beserta artinya!", "Lima pasangan benar, mis. رأس (kepala), عين (mata), أذن (telinga), أنف (hidung), يد (tangan). Skor 20 per pasangan yang benar.")
    ],
    // Kebun binatang
    "ba-C-2": [
      P("L1", "Arti “حديقة الحيوان” adalah ...", "kebun binatang", "taman bunga", "kebun buah", "kolam ikan"),
      P("L1", "Arti “زرافة” adalah ...", "jerapah", "gajah", "monyet", "harimau"),
      P("L1", "Bahasa Arab “monyet” adalah ...", "قرد", "زرافة", "ثعبان", "أسد"),
      P("L2", "Bacaan: “في حديقة الحيوان فيل كبير.” Hewan yang disebut dalam bacaan adalah ...", "gajah", "singa", "kuda", "unta"),
      I("L1", "Arti “ثعبان” adalah ....", "ular")
    ],
    // Di ruang tamu dan ruang belajar
    "ba-C-3": [
      P("L1", "Arti “غرفة الضيوف” adalah ...", "ruang tamu", "ruang belajar", "kamar tidur", "dapur"),
      P("L1", "Arti “غرفة المذاكرة” adalah ...", "ruang belajar", "ruang tamu", "kamar mandi", "ruang makan"),
      P("L1", "Bahasa Arab “sofa” adalah ...", "أريكة", "خزانة", "مكتب", "مصباح"),
      P("L2", "Arti kalimat “في غرفة الضيوف أريكة” adalah ...", "Di ruang tamu ada sofa", "Di ruang belajar ada sofa", "Di kamar tidur ada lemari", "Di dapur ada meja"),
      I("L1", "Arti “خزانة” adalah ....", "lemari")
    ],
    // Di perpustakaan
    "ba-C-4": [
      P("L1", "Arti “المكتبة” adalah ...", "perpustakaan", "kantin", "kelas", "masjid"),
      P("L1", "Arti “قاموس” adalah ...", "kamus", "majalah", "cerita", "buku tulis"),
      P("L1", "Arti “يستعير” adalah ...", "meminjam", "mengembalikan", "membeli", "menjual"),
      P("L2", "Arti kalimat “أقرأ قصة في المكتبة” adalah ...", "Saya membaca cerita di perpustakaan", "Saya menulis cerita di kelas", "Saya membeli majalah di kantin", "Saya meminjam kamus di rumah"),
      I("L1", "Arti “مجلة” adalah ....", "majalah")
    ],
    // Di kantin
    "ba-C-5": [
      P("L1", "Arti “المقصف” adalah ...", "kantin", "perpustakaan", "lapangan", "kelas"),
      P("L1", "Arti “عصير” adalah ...", "jus", "susu", "air putih", "teh"),
      P("L1", "Bahasa Arab “nasi” adalah ...", "أرز", "خبز", "ماء", "لبن"),
      P("L2", "Arti kalimat “بكم هذا الخبز؟” adalah ...", "Berapa harga roti ini?", "Siapa yang membeli roti ini?", "Di mana roti ini?", "Apakah roti ini enak?"),
      I("L1", "Arti “ماء” adalah ....", "air")
    ],
    // Jam
    "ba-C-6": [
      P("L1", "Arti kalimat “ما الساعة الآن؟” adalah ...", "Jam berapa sekarang?", "Hari apa sekarang?", "Di mana kamu sekarang?", "Apa pelajaran sekarang?"),
      P("L1", "Arti “الساعة الثامنة” adalah ...", "jam delapan", "jam tujuh", "jam sembilan", "jam sepuluh"),
      P("L2", "Arti “الساعة السابعة والنصف” adalah ...", "pukul 07.30", "pukul 07.15", "pukul 06.45", "pukul 07.00"),
      P("L2", "Arti “الساعة الثالثة إلا ربعا” adalah ...", "pukul 02.45", "pukul 03.15", "pukul 03.45", "pukul 02.15"),
      I("L1", "Arti “دقيقة” adalah ....", "menit")
    ],
    // Saya suka bahasa Arab
    "ba-C-7": [
      P("L1", "Arti kalimat “أحب اللغة العربية” adalah ...", "Saya suka bahasa Arab", "Saya belajar bahasa Inggris", "Saya mengajar bahasa Arab", "Saya benci bahasa Arab"),
      P("L1", "Arti “جميلة” adalah ...", "indah", "sulit", "mudah", "panjang"),
      P("L1", "Arti “لأن” adalah ...", "karena", "tetapi", "dan", "atau"),
      P("L2", "Arti kalimat “اللغة العربية لغة القرآن” adalah ...", "Bahasa Arab adalah bahasa Al-Qur'an", "Bahasa Arab adalah bahasa daerah", "Al-Qur'an memakai bahasa Inggris", "Bahasa Arab adalah bahasa Nusantara"),
      I("L1", "Arti “سهلة” adalah ....", "mudah"),
      U("L2", "Tuliskan dua alasan mengapa kamu suka belajar bahasa Arab! Boleh memakai bahasa Indonesia.", "Dua alasan yang masuk akal, mis. bahasa Al-Qur'an, membantu memahami doa dan bacaan salat, atau menambah kosakata baru. Skor 50 per alasan yang jelas.")
    ],
    // Kegiatan liburan
    "ba-C-8": [
      P("L1", "Arti “عطلة” adalah ...", "liburan", "ujian", "pelajaran", "upacara"),
      P("L1", "Arti “أزور” adalah ...", "saya mengunjungi", "saya membaca", "saya menulis", "saya membeli"),
      P("L2", "Arti kalimat “في العطلة أزور جدتي” adalah ...", "Pada liburan saya mengunjungi nenekku", "Pada liburan saya mengunjungi kakekku", "Saya menulis surat untuk nenek", "Saya membantu ibu di rumah"),
      P("L1", "Arti “أسافر” adalah ...", "saya bepergian", "saya pulang", "saya tidur", "saya bermain"),
      I("L1", "Arti “أذهب” adalah ....", "saya pergi")
    ],
    // Piknik
    "ba-C-9": [
      P("L1", "Arti “رحلة” adalah ...", "perjalanan (piknik)", "pasar", "ruangan", "ujian"),
      P("L1", "Arti “شاطئ” adalah ...", "pantai", "gunung", "sungai", "hutan"),
      P("L2", "Arti kalimat “نذهب إلى الشاطئ” adalah ...", "Kami pergi ke pantai", "Saya pergi ke pantai", "Kami pulang dari pantai", "Mereka berenang di pantai"),
      P("L1", "Arti “نأكل” adalah ...", "kami makan", "kami minum", "kami bermain", "kami tidur"),
      I("L1", "Arti “خيمة” adalah ....", "tenda")
    ],
    // Keterampilan berbahasa
    "ba-C-10": [
      P("L1", "Mempresentasikan berarti ...", "menyampaikan hasil di depan orang lain", "menyalin tulisan", "hanya mendengarkan", "hanya menggambar"),
      P("L1", "Keterampilan “الكلام” melatih kita untuk ...", "berbicara", "menyimak", "membaca", "menulis"),
      P("L1", "Bahasa Arab “membaca” adalah ...", "القراءة", "الكتابة", "الاستماع", "التحدث"),
      I("L1", "Arti “التحدث” adalah ....", "berbicara"),
      U("L3", "Tulislah tiga kalimat sederhana tentang kegiatan liburanmu dalam bahasa Arab (boleh dengan lafal latin), lalu bacakan di depan kelas!", "Tiga kalimat memakai kosakata liburan, mis. “أسافر إلى القرية”, “أزور جدتي”, “نذهب إلى الشاطئ”. Skor 25 per kalimat benar dan sesuai topik; 25 untuk kelancaran saat membacakan.")
    ]
  };

  // Gabungkan ke bank utama; soal yang bunyinya sama tidak diulang.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(BARU[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;

/* ################ BAGIAN: data-soal-pai-tambah.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-pai-tambah.js
   TAMBAHAN soal PAI MI Fase A-C untuk TP yang bank soalnya masih tipis: Akidah Akhlak (aa), Fikih (fikih),
   SKI (ski), dan Al-Qur'an Hadis (aqh; hanya TP hafalan/hadis yang kurang dari 5 soal).
   Tujuan: setiap TP minimal 5 soal = 3 PG + 1 isian + 1 uraian, supaya "Isi dari bank soal" di Kartu Soal tidak kehabisan.
   Soal DITAMBAHKAN ke kunci TP yang sudah ada; soal lama tidak diubah dan soal yang bunyinya sama tidak diulang.
   Kunci = kunci TP di js/data-tp-mi.js (kode mapel-FASE-nomor urut TP).
   Status: DRAF, belum diperiksa guru. Guru wajib mencocokkan dengan buku ajar madrasah dan mazhab yang dipakai.
   Format sama dengan data-soal-mi.js (PG: jawaban benar di posisi pertama; opsi diacak saat dipakai).
   WAJIB dimuat SESUDAH js/data-soal-mi.js, data-soal-aqh-hafalan.js, data-soal-aqh-tajwid.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const TAMBAH = {
    // ===================== AKIDAH AKHLAK FASE A =====================
    "aa-A-1": [
      P("L1", "Dua kalimat syahadat diucapkan oleh seseorang ketika ...", "masuk Islam", "berangkat sekolah", "akan makan", "akan tidur"),
      U("L2", "Jelaskan arti dua kalimat syahadat dengan bahasamu sendiri!", "Jawaban benar memuat dua inti: bersaksi bahwa tidak ada Tuhan selain Allah, dan bersaksi bahwa Nabi Muhammad saw. adalah utusan Allah. Skor penuh bila kedua inti ada.")
    ],
    "aa-A-2": [
      P("L1", "Iman kepada malaikat adalah rukun iman yang ke ...", "dua", "satu", "tiga", "empat"),
      I("L1", "Iman kepada qada dan qadar adalah rukun iman yang ke ....", "enam (keenam)")
    ],
    "aa-A-3": [
      P("L1", "Allah bersifat qidam, artinya Allah ...", "ada tanpa permulaan", "tidak berakhir", "diciptakan oleh yang lain", "baru ada setelah dunia diciptakan"),
      U("L2", "Sebutkan tiga sifat wajib bagi Allah beserta artinya!", "Contoh benar: wujud = ada; qidam = tidak berawal; baqa' = kekal; qudrat = berkuasa; sama' = mendengar; basar = melihat. Skor sebanding jumlah sifat beserta arti yang benar.")
    ],
    "aa-A-4": [
      P("L1", "Malaikat yang bertugas mencabut nyawa adalah ...", "Izrail", "Jibril", "Mikail", "Israfil"),
      I("L1", "Malaikat yang bertugas membagi rezeki adalah ....", "Mikail")
    ],
    "aa-A-5": [
      P("L1", "Ar-Rahim artinya Maha ...", "Penyayang", "Pengasih", "Suci", "Merajai"),
      U("L2", "Tuliskan arti Ar-Rahman, Ar-Rahim, Al-Malik, dan Al-Quddus!", "Ar-Rahman = Maha Pengasih; Ar-Rahim = Maha Penyayang; Al-Malik = Maha Merajai; Al-Quddus = Maha Suci. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-A-6": [
      P("L1", "As-Salam artinya Maha ...", "Memberi keselamatan", "Perkasa", "Memelihara", "Pengasih"),
      U("L2", "Tuliskan arti As-Salam, Al-Mukmin, Al-Muhaimin, dan Al-Aziz!", "As-Salam = Maha Memberi Keselamatan; Al-Mukmin = Maha Memberi Keamanan; Al-Muhaimin = Maha Memelihara; Al-Aziz = Maha Perkasa. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-A-7": [
      P("L1", "Arti bacaan basmalah adalah ...", "Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang", "Segala puji bagi Allah", "Maha Suci Allah", "Allah Maha Besar"),
      U("L2", "Kapan kita mengucapkan basmalah, hamdalah, dan taawuz? Jelaskan!", "Basmalah: ketika memulai pekerjaan yang baik; hamdalah: ketika mendapat nikmat atau selesai melakukan sesuatu; taawuz: ketika berlindung kepada Allah dari godaan setan, misalnya sebelum membaca Al-Qur'an atau saat marah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-A-8": [
      P("L1", "Dalam Islam, kebersihan adalah sebagian dari ...", "iman", "harta", "ilmu", "amal"),
      I("L1", "Memotong kuku yang panjang termasuk perilaku hidup ....", "bersih")
    ],
    "aa-A-9": [
      P("L1", "Orang yang jujur akan ... oleh orang lain.", "dipercaya", "dijauhi", "dimusuhi", "diejek"),
      U("L2", "Tuliskan dua contoh sikap jujur di madrasah!", "Contoh benar: mengerjakan ulangan sendiri tanpa menyontek, mengaku jika berbuat salah, mengembalikan barang yang ditemukan, berkata sesuai kenyataan. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-A-10": [
      P("L2", "Ketika mendapat pujian dari guru, sikap rendah hati adalah ...", "tetap bersikap biasa dan tidak sombong", "memamerkannya kepada teman", "meremehkan teman yang lain", "merasa paling hebat"),
      I("L1", "Orang yang tidak sombong disebut orang yang ....", "rendah hati")
    ],
    "aa-A-11": [
      P("L1", "Berbohong termasuk akhlak ...", "tercela", "terpuji", "mulia", "baik"),
      U("L2", "Sebutkan dua cara menghindari sikap malas!", "Contoh benar: membuat jadwal belajar, mengerjakan tugas tepat waktu, berdoa memohon kekuatan, membantu pekerjaan orang tua, tidur dan bangun tepat waktu. Skor sebanding jumlah cara yang benar.")
    ],
    "aa-A-12": [
      P("L1", "Kita membaca doa sebelum belajar agar ilmu kita ...", "bermanfaat dan berkah", "cepat hilang", "tidak berguna", "sulit dipahami"),
      U("L2", "Sebutkan tiga adab belajar!", "Contoh benar: berdoa sebelum belajar, memperhatikan penjelasan guru, tidak ribut, bertanya dengan sopan, mencatat pelajaran, menghormati guru dan teman. Skor sebanding jumlah adab yang benar.")
    ],
    "aa-A-13": [
      P("L1", "Ketika melepas pakaian, kita mendahulukan anggota badan sebelah ...", "kiri", "kanan", "atas", "bawah"),
      I("L1", "Pakaian seorang muslim harus menutup ....", "aurat")
    ],
    "aa-A-14": [
      P("L2", "Ketika bersin, kita sebaiknya menutup hidung dan mulut dengan ...", "tisu atau lipatan siku", "dibiarkan terbuka", "tangan yang baru memegang makanan", "kaki"),
      U("L2", "Jelaskan adab ketika bersin dan menguap!", "Bersin: menutup hidung dan mulut, mengucapkan Alhamdulillah. Menguap: menutup mulut dan menahan suara. Orang yang mendengar bersin dan hamdalah menjawab Yarhamukallah. Skor sebanding kelengkapan.")
    ],
    "aa-A-15": [
      P("L1", "Sesudah makan, kita mengucapkan ...", "hamdalah", "basmalah", "takbir", "tahlil"),
      I("L1", "Makanan yang kita makan harus halal dan ....", "baik (thayyib)")
    ],
    "aa-A-16": [
      P("L1", "Ibu Nabi Muhammad saw. bernama ...", "Aminah", "Khadijah", "Aisyah", "Maryam"),
      U("L2", "Sebutkan dua sifat Nabi Muhammad saw. yang dapat kita teladani!", "Contoh benar: jujur (siddiq), dapat dipercaya (amanah), menyampaikan (tabligh), cerdas (fathanah), sabar, penyayang. Skor sebanding jumlah sifat yang benar.")
    ],
    "aa-A-17": [
      P("L1", "Kaum Nabi Nuh a.s. yang ingkar diazab oleh Allah dengan ...", "banjir besar", "gempa bumi", "hujan batu", "kemarau panjang"),
      I("L1", "Nabi Nuh a.s. membuat kapal atas perintah ....", "Allah")
    ],
    // ===================== AKIDAH AKHLAK FASE B =====================
    "aa-B-1": [
      P("L1", "Al-Halim artinya Maha ...", "Penyantun", "Pemberi", "Besar", "Agung"),
      U("L2", "Tuliskan arti Al-Halim, Al-Wahhab, Al-Kabir, dan Al-'Adhim!", "Al-Halim = Maha Penyantun; Al-Wahhab = Maha Pemberi; Al-Kabir = Maha Besar; Al-'Adhim = Maha Agung. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-B-2": [
      P("L1", "Al-Bashir artinya Maha ...", "Melihat", "Mendengar", "Mengetahui", "Melindungi"),
      I("L1", "Al-Waliy artinya Maha ....", "Melindungi (Pelindung)")
    ],
    "aa-B-3": [
      P("L1", "Kitab Injil diturunkan kepada Nabi ...", "Isa a.s.", "Musa a.s.", "Daud a.s.", "Muhammad saw."),
      U("L2", "Sebutkan empat kitab Allah beserta nabi penerimanya!", "Taurat - Nabi Musa a.s.; Zabur - Nabi Daud a.s.; Injil - Nabi Isa a.s.; Al-Qur'an - Nabi Muhammad saw. Skor sebanding jumlah pasangan yang benar.")
    ],
    "aa-B-4": [
      P("L1", "Nabi yang dijuluki Khalilullah (kekasih Allah) adalah Nabi ...", "Ibrahim a.s.", "Nuh a.s.", "Musa a.s.", "Isa a.s."),
      I("L1", "Nabi pertama adalah Nabi ....", "Adam a.s.")
    ],
    "aa-B-5": [
      P("L1", "Kalimat 'Masya Allah' diucapkan ketika kita ...", "melihat hal yang indah dan mengagumkan", "mendapat musibah", "akan makan", "bersin"),
      I("L1", "'Masya Allah' artinya atas ... Allah.", "kehendak")
    ],
    "aa-B-6": [
      P("L1", "Cara bersyukur atas nikmat sehat adalah ...", "beribadah dan menjaga kesehatan", "menyia-nyiakan waktu", "mengeluh setiap hari", "bersikap sombong"),
      U("L2", "Tuliskan dua cara bersyukur kepada Allah!", "Contoh benar: mengucap hamdalah, beribadah dengan rajin, menggunakan nikmat untuk kebaikan, berbagi dengan sesama, menjaga pemberian Allah. Skor sebanding jumlah cara yang benar.")
    ],
    "aa-B-7": [
      P("L2", "Ketika belum lancar membaca Al-Qur'an, sikap pantang menyerah adalah ...", "terus berlatih setiap hari", "berhenti belajar", "menyalahkan guru", "malu dan tidak mau mencoba"),
      I("L1", "Orang yang tidak mudah putus asa disebut orang yang pantang ....", "menyerah")
    ],
    "aa-B-8": [
      P("L1", "Anak yang pemberani berani mengatakan ... walaupun sulit.", "yang benar", "yang bohong", "yang menyakiti", "yang menipu"),
      U("L2", "Tuliskan contoh sikap pemberani di madrasah!", "Contoh benar: berani mengakui kesalahan, berani menolak ajakan berbuat buruk, berani membela teman yang diperlakukan tidak adil, berani bertanya kepada guru. Skor sebanding kesesuaian contoh.")
    ],
    "aa-B-9": [
      P("L1", "Ketika teman membutuhkan bantuan, kita sebaiknya ...", "menolongnya sesuai kemampuan", "membiarkannya", "mengejeknya", "pura-pura tidak tahu"),
      I("L1", "Saling membantu dalam kebaikan disebut ....", "tolong-menolong")
    ],
    "aa-B-10": [
      P("L1", "Orang yang amanah akan ... oleh orang lain.", "dipercaya", "dijauhi", "dibenci", "ditertawakan"),
      U("L2", "Berikan dua contoh sikap amanah di madrasah!", "Contoh benar: menjaga barang milik madrasah, melaksanakan tugas piket, menyampaikan pesan guru kepada orang tua, mengembalikan barang pinjaman. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-B-11": [
      P("L1", "Kufur nikmat artinya ...", "tidak mensyukuri nikmat Allah", "selalu bersyukur", "suka berbagi", "rajin berdoa"),
      I("L1", "Lawan dari kikir adalah ....", "dermawan")
    ],
    "aa-B-12": [
      P("L2", "Kita tidak boleh membentak orang tua karena mereka telah ...", "merawat dan mendidik kita", "membeli mainan kita", "pergi jauh dari kita", "mengajak kita bermain"),
      U("L2", "Tuliskan dua cara berbakti kepada orang tua!", "Contoh benar: menaati perintah yang baik, berkata santun, membantu pekerjaan rumah, mendoakan orang tua, belajar dengan rajin. Skor sebanding jumlah cara yang benar.")
    ],
    "aa-B-13": [
      P("L1", "Ketika guru memberi nasihat, sikap kita adalah ...", "mendengarkan dan menghormatinya", "membantahnya", "mengabaikannya", "menertawakannya"),
      I("L1", "Orang yang mengajarkan ilmu kepada kita disebut ....", "guru")
    ],
    "aa-B-14": [
      P("L1", "Ketika teman sedang sedih, kita sebaiknya ...", "menghibur dan menemaninya", "menertawakannya", "menjauhinya", "mengejeknya"),
      U("L2", "Sebutkan tiga adab kepada teman!", "Contoh benar: saling menghormati, tidak mengejek, menolong, meminta maaf dan memaafkan, berbagi, menjaga rahasia. Skor sebanding jumlah adab yang benar.")
    ],
    "aa-B-15": [
      P("L2", "Pelajaran dari kisah Nabi Ibrahim a.s. dan Nabi Ismail a.s. adalah ...", "taat kepada perintah Allah", "menuruti keinginan sendiri", "takut kepada kaum yang zalim", "menolak perintah orang tua"),
      I("L2", "Hewan pengganti sembelihan Nabi Ismail a.s. adalah ....", "domba (kibas)")
    ],
    // ===================== AKIDAH AKHLAK FASE C =====================
    "aa-C-1": [
      P("L1", "Al-Khabir artinya Maha ...", "Teliti", "Kuat", "Menghidupkan", "Esa"),
      U("L2", "Tuliskan arti Al-Qawiyy, Al-Khabir, Al-Muhyi, dan Al-Wahid!", "Al-Qawiyy = Maha Kuat; Al-Khabir = Maha Teliti; Al-Muhyi = Maha Menghidupkan; Al-Wahid = Maha Esa. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-C-2": [
      P("L1", "As-Samad artinya Allah adalah tempat ...", "bergantung segala makhluk", "tinggal para malaikat", "bermain anak-anak", "berkumpul manusia"),
      I("L1", "Al-Ahad artinya Maha ....", "Esa")
    ],
    "aa-C-3": [
      P("L1", "Tiupan sangkakala oleh malaikat Israfil menandai datangnya ...", "hari kiamat", "hari raya", "musim hujan", "lahirnya seorang nabi"),
      U("L2", "Mengapa kita harus beriman kepada hari akhir? Jelaskan!", "Jawaban benar memuat salah satu atau lebih: yakin semua amal akan dihisab dan dibalas, mendorong berbuat baik, takut berbuat dosa, tidak menyia-nyiakan hidup. Skor sebanding kejelasan alasan.")
    ],
    "aa-C-4": [
      P("L2", "Ketika berhasil menjadi juara kelas, sikap yang sesuai dengan iman kepada qada dan qadar adalah ...", "bersyukur kepada Allah", "menyombongkan diri", "merendahkan teman", "berhenti belajar"),
      I("L1", "Berusaha sekuat tenaga lalu berserah diri kepada Allah disebut ....", "tawakal")
    ],
    "aa-C-5": [
      P("L1", "Bacaan hauqalah adalah ...", "La haula wa la quwwata illa billah", "Subhanallah", "Alhamdulillah", "Allahu Akbar"),
      U("L2", "Tuliskan bacaan tarji' dan hauqalah beserta artinya!", "Tarji': Inna lillahi wa inna ilaihi raji'un = sesungguhnya kita milik Allah dan kepada-Nya kita kembali. Hauqalah: La haula wa la quwwata illa billah = tidak ada daya dan kekuatan kecuali dengan pertolongan Allah. Skor sebanding kebenaran bacaan dan arti.")
    ],
    "aa-C-6": [
      P("L1", "Sabar menurut Islam harus disertai dengan ...", "usaha dan doa", "keluhan", "kemarahan", "putus asa"),
      I("L1", "Sabar adalah menahan diri dari ... ketika menghadapi ujian.", "keluh kesah (mengeluh)")
    ],
    "aa-C-7": [
      P("L1", "Contoh sikap disiplin di madrasah adalah ...", "masuk kelas tepat waktu", "datang terlambat", "membolos", "melanggar tata tertib"),
      U("L2", "Tuliskan dua contoh sikap mandiri dalam kehidupan sehari-hari!", "Contoh benar: merapikan tempat tidur sendiri, menyiapkan buku dan perlengkapan sekolah, mengerjakan tugas sendiri, mencuci piring sendiri. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-C-8": [
      P("L1", "Jika temanmu meminta maaf atas kesalahannya, sikap pemaaf adalah ...", "memaafkannya dengan tulus", "tetap marah kepadanya", "membalas kesalahannya", "mengabaikannya"),
      I("L1", "Berani menanggung akibat perbuatan sendiri disebut sikap ....", "tanggung jawab (bertanggung jawab)")
    ],
    "aa-C-9": [
      P("L2", "Orang yang bijaksana ketika mengambil keputusan ...", "mempertimbangkan baik dan buruknya", "bertindak sesuka hati", "bertindak asal-asalan", "hanya ikut-ikutan"),
      U("L2", "Berikan dua contoh sikap adil di rumah atau di madrasah!", "Contoh benar: membagi tugas secara merata, tidak membeda-bedakan teman, membagi makanan dengan sama rata, memberi kesempatan yang sama kepada semua teman. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-C-10": [
      P("L1", "Marah yang tidak terkendali dapat menyebabkan ...", "penyesalan dan merugikan orang lain", "ketenangan hati", "banyak teman", "pahala yang besar"),
      I("L1", "Orang yang suka melanggar perintah Allah disebut ....", "fasik")
    ],
    "aa-C-11": [
      P("L2", "Cara menghindari iri hati adalah ...", "bersyukur dan ikut senang atas keberhasilan teman", "membenci teman yang berhasil", "menjatuhkan teman yang berhasil", "mengejek hasil kerja teman"),
      U("L2", "Sebutkan dua cara menghindari sikap pilih kasih!", "Contoh benar: bersikap adil kepada semua teman, tidak membeda-bedakan teman yang kaya dan miskin, berbagi dengan merata, bergaul dengan semua teman. Skor sebanding jumlah cara yang benar.")
    ],
    "aa-C-12": [
      P("L2", "Jika tuan rumah belum menjawab salam, kita sebaiknya ...", "menunggu di luar dan tidak langsung masuk", "langsung masuk", "mengintip dari jendela", "berteriak keras-keras"),
      I("L1", "Salam yang kita ucapkan ketika bertamu adalah ....", "Assalamu'alaikum")
    ],
    "aa-C-13": [
      P("L2", "Jika tetangga sedang kesulitan, kita sebaiknya ...", "membantunya sesuai kemampuan", "mengabaikannya", "menjauhinya", "mengejeknya"),
      U("L2", "Tuliskan dua contoh adab kepada tetangga!", "Contoh benar: menyapa dengan salam, menjenguk saat sakit, berbagi makanan, tidak membuat gaduh, membantu saat kesulitan. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-C-14": [
      P("L1", "Salah satu mukjizat Nabi Musa a.s. adalah ...", "tongkat yang berubah menjadi ular", "menghidupkan orang mati", "membelah bulan", "berbicara dengan burung"),
      I("L1", "Nabi Musa a.s. berdakwah kepada Fir'aun bersama saudaranya, yaitu Nabi ....", "Harun")
    ],
    "aa-C-15": [
      P("L1", "Salah satu mukjizat Nabi Isa a.s. adalah ...", "menyembuhkan orang sakit dengan izin Allah", "membelah laut", "mengubah tongkat menjadi ular", "tidak terbakar oleh api"),
      U("L2", "Sebutkan dua mukjizat Nabi Isa a.s.!", "Contoh benar: berbicara ketika masih bayi, menyembuhkan orang buta sejak lahir dan penderita kusta, menghidupkan orang mati dengan izin Allah. Skor sebanding jumlah mukjizat yang benar.")
    ],
    // ===================== FIKIH FASE A =====================
    "fikih-A-1": [
      P("L1", "Rukun Islam yang pertama adalah ...", "mengucapkan dua kalimat syahadat", "mendirikan salat", "menunaikan zakat", "berpuasa di bulan Ramadan"),
      I("L1", "Rukun Islam yang kelima adalah ... bagi yang mampu.", "haji")
    ],
    "fikih-A-2": [
      P("L1", "Syahadatain berisi pengakuan bahwa tidak ada Tuhan selain Allah dan Nabi Muhammad saw. adalah ...", "utusan Allah", "nabi palsu", "malaikat", "raja"),
      I("L1", "Kalimat syahadat diucapkan oleh orang yang ingin masuk ....", "Islam"),
      U("L2", "Tuliskan arti dua kalimat syahadat!", "Aku bersaksi bahwa tidak ada Tuhan selain Allah dan aku bersaksi bahwa Nabi Muhammad adalah utusan Allah. Skor sebanding kedua inti yang benar.")
    ],
    "fikih-A-3": [
      P("L1", "Sebelum berwudu, kita membaca ...", "basmalah", "hamdalah", "takbir", "tahlil")
    ],
    "fikih-A-4": [
      P("L1", "Salat Asar dikerjakan pada waktu ...", "sore hari", "pagi hari", "tengah malam", "menjelang fajar")
    ],
    "fikih-A-5": [
      P("L1", "Saf makmum dalam salat berjemaah harus ...", "rapat dan lurus", "berantakan", "renggang", "acak"),
      U("L2", "Sebutkan dua manfaat salat berjemaah!", "Contoh benar: pahala lebih banyak, mempererat persaudaraan, melatih disiplin, saling mengenal sesama jamaah. Skor sebanding jumlah manfaat yang benar.")
    ],
    "fikih-A-6": [
      P("L1", "Kalimat 'Allahu Akbar' dalam azan artinya ...", "Allah Maha Besar", "Maha Suci Allah", "Segala puji bagi Allah", "Tidak ada Tuhan selain Allah"),
      U("L2", "Tuliskan perbedaan azan dan ikamah!", "Azan: dikumandangkan untuk memberi tahu masuknya waktu salat, dibaca sebelum ikamah. Ikamah: dibaca sebagai tanda salat berjemaah akan segera dimulai. Skor sebanding jumlah perbedaan yang benar.")
    ],
    "fikih-A-7": [
      P("L1", "Zikir sesudah salat bertujuan untuk ...", "mengingat dan mengagungkan Allah", "bermain", "tidur", "segera pulang tanpa berdoa"),
      U("L2", "Tuliskan tiga bacaan zikir sesudah salat beserta artinya!", "Subhanallah = Maha Suci Allah; Alhamdulillah = segala puji bagi Allah; Allahu Akbar = Allah Maha Besar. Skor sebanding jumlah bacaan dan arti yang benar.")
    ],
    // ===================== FIKIH FASE B =====================
    "fikih-B-1": [
      P("L1", "Puasa Ramadan hukumnya ...", "wajib bagi muslim yang balig dan mampu", "sunah", "mubah", "haram")
    ],
    "fikih-B-2": [
      P("L1", "Salat Jumat hukumnya wajib bagi ...", "laki-laki muslim yang balig dan mukim", "semua orang tanpa syarat", "hanya anak kecil", "hanya orang yang sakit"),
      U("L2", "Sebutkan dua adab menghadiri salat Jumat!", "Contoh benar: mandi, memakai pakaian bersih dan rapi, berangkat lebih awal, mendengarkan khutbah dengan tenang, tidak berbicara saat khutbah. Skor sebanding jumlah adab yang benar.")
    ],
    "fikih-B-3": [
      P("L1", "Salat sunah yang dikerjakan sebelum atau sesudah salat fardu disebut salat ...", "rawatib", "tahajud", "duha", "tarawih"),
      I("L1", "Salat sunah malam bulan Ramadan sesudah salat Isya disebut salat ....", "tarawih")
    ],
    "fikih-B-4": [
      P("L1", "Salat Zuhur yang diqasar menjadi ... rakaat.", "dua", "tiga", "empat", "satu"),
      U("L2", "Sebutkan dua contoh rukhsah (keringanan) dalam salat!", "Contoh benar: menjamak salat saat bepergian, mengqasar salat empat rakaat menjadi dua, salat sambil duduk atau berbaring bagi yang sakit, bertayamum bila tidak ada air. Skor sebanding jumlah contoh yang benar.")
    ],
    "fikih-B-5": [
      P("L1", "Memotong sebagian kulit penutup kemaluan anak laki-laki disebut ...", "khitan", "akikah", "tahalul", "tawaf"),
      I("L1", "Anak laki-laki yang sudah mimpi basah dikatakan sudah ....", "balig")
    ],
    "fikih-B-6": [
      P("L1", "Hal pertama yang dilakukan saat akan mandi wajib adalah ...", "berniat", "langsung keluar kamar mandi", "meninggalkan mandi", "makan dahulu"),
      U("L2", "Sebutkan dua penyebab seseorang wajib mandi besar!", "Contoh benar: keluar mani (misalnya mimpi basah), haid, nifas. Skor sebanding jumlah penyebab yang benar.")
    ],
    // ===================== FIKIH FASE C =====================
    "fikih-C-1": [
      P("L1", "Orang yang berhak menerima zakat disebut ...", "mustahik", "muzaki", "khatib", "muazin")
    ],
    "fikih-C-2": [
      P("L1", "Penyembelihan hewan kurban dilaksanakan pada hari raya ...", "Iduladha", "Idulfitri", "Maulid Nabi", "Isra Mikraj")
    ],
    "fikih-C-3": [
      P("L1", "Berkeliling Kakbah sebanyak tujuh kali disebut ...", "tawaf", "sai", "wukuf", "tahalul"),
      U("L2", "Urutkan empat kegiatan umrah mulai dari ihram!", "Ihram, tawaf, sai, tahalul (mencukur atau menggunting rambut). Skor sebanding jumlah kegiatan yang benar dan berurutan.")
    ],
    "fikih-C-4": [
      P("L1", "Minuman yang haram adalah ...", "khamr (minuman keras)", "air putih", "susu", "teh")
    ],
    "fikih-C-5": [
      P("L1", "Jual beli harus dilakukan dengan ... dari kedua pihak.", "kerelaan", "paksaan", "tipuan", "ancaman"),
      U("L2", "Sebutkan dua contoh perbuatan jujur dalam jual beli!", "Contoh benar: menjelaskan keadaan barang apa adanya, menimbang atau mengukur dengan benar, tidak menipu pembeli, tidak menyembunyikan cacat barang. Skor sebanding jumlah contoh yang benar.")
    ],
    "fikih-C-6": [
      P("L1", "Sebelum meminjam barang milik orang lain, kita harus ...", "meminta izin pemiliknya", "langsung mengambilnya", "mengambilnya diam-diam", "memaksa pemiliknya")
    ],
    "fikih-C-7": [
      P("L1", "Contoh perbuatan gasab adalah ...", "memakai sepeda teman tanpa izin", "meminjam buku dengan izin", "membeli alat tulis dengan uang sendiri", "memberi hadiah kepada teman"),
      U("L2", "Apa yang harus dilakukan jika kita telanjur menggasab barang teman? Jelaskan!", "Memuat: segera mengembalikan barang, meminta maaf, mengganti atau memperbaiki bila rusak, bertobat dan tidak mengulangi. Skor sebanding kelengkapan.")
    ],
    "fikih-C-8": [
      P("L1", "Barang temuan yang bukan milik kita harus dijaga sebagai ...", "amanah", "milik pribadi", "hadiah", "barang dagangan"),
      I("L1", "Barang temuan harus diumumkan agar dapat dikembalikan kepada ....", "pemiliknya")
    ],
    // ===================== SKI FASE B =====================
    "ski-B-1": [
      P("L1", "Kebiasaan buruk masyarakat jahiliah yang dilarang Islam adalah ...", "berjudi dan minum khamr", "menolong anak yatim", "menepati janji", "menuntut ilmu")
    ],
    "ski-B-2": [
      P("L1", "Setelah ibunda wafat, Nabi Muhammad saw. diasuh oleh kakeknya yang bernama ...", "Abdul Muttalib", "Abu Lahab", "Abdullah", "Abu Bakar"),
      U("L2", "Sebutkan dua sifat Nabi Muhammad saw. sejak muda yang dapat diteladani!", "Contoh benar: jujur (dijuluki Al-Amin), dapat dipercaya, sabar, santun, suka menolong, adil. Skor sebanding jumlah sifat yang benar.")
    ],
    "ski-B-3": [
      P("L1", "Wahyu pertama turun kepada Nabi Muhammad saw. pada bulan ...", "Ramadan", "Rajab", "Zulhijah", "Syawal"),
      U("L2", "Ceritakan secara singkat peristiwa turunnya wahyu pertama!", "Memuat: Nabi menyendiri (berkhalwat) di Gua Hira; malaikat Jibril datang membawa wahyu; Nabi diperintah membaca (Iqra'); Nabi pulang dalam keadaan gemetar dan ditenangkan Khadijah. Skor sebanding kelengkapan.")
    ],
    "ski-B-4": [
      P("L1", "Dakwah Nabi pada tahap awal dilakukan secara sembunyi-sembunyi, kemudian secara ...", "terang-terangan", "rahasia selamanya", "dihentikan", "diwakilkan kepada kaum Quraisy"),
      I("L1", "Paman yang melindungi dakwah Nabi meskipun tidak masuk Islam adalah Abu ....", "Talib")
    ],
    "ski-B-5": [
      P("L1", "Peristiwa hijrah Nabi menjadi awal penanggalan ...", "Hijriah", "Masehi", "Saka", "Jawa")
    ],
    "ski-B-6": [
      P("L1", "Dalam Mikraj, Nabi Muhammad saw. diangkat dari Masjidilaksa menuju ...", "Sidratulmuntaha", "Gua Hira", "Madinah", "Padang Arafah"),
      U("L2", "Sebutkan dua pelajaran dari peristiwa Isra Mikraj!", "Contoh benar: salat lima waktu adalah kewajiban penting, menunjukkan kekuasaan Allah, menguatkan Nabi dalam berdakwah, menumbuhkan disiplin beribadah. Skor sebanding jumlah pelajaran yang benar.")
    ],
    // ===================== SKI FASE C =====================
    "ski-C-1": [
      P("L1", "Kaum Muhajirin adalah ...", "kaum muslim yang berhijrah dari Mekah ke Madinah", "penduduk asli Madinah", "kaum Quraisy yang menentang Nabi", "para pedagang dari Yaman")
    ],
    "ski-C-2": [
      P("L1", "Ketika Nabi sakit menjelang wafat, sahabat yang ditunjuk menjadi imam salat adalah ...", "Abu Bakar", "Umar", "Usman", "Ali"),
      U("L2", "Sebutkan satu pesan penting Nabi dalam khutbah Wada'!", "Contoh benar: saling menghormati jiwa dan harta sesama muslim, berpegang teguh pada Al-Qur'an dan sunah, memperlakukan perempuan dengan baik, tidak ada kemuliaan karena suku, kemuliaan karena takwa. Skor penuh bila satu pesan benar.")
    ],
    "ski-C-3": [
      P("L1", "Abu Bakar mendapat gelar Ash-Shiddiq karena ...", "membenarkan peristiwa Isra Mikraj", "memenangkan perang", "menjadi pedagang terkaya", "membangun kota Madinah"),
      I("L1", "Ketika hijrah, Abu Bakar menemani Nabi bersembunyi di Gua ....", "Tsur")
    ],
    "ski-C-4": [
      P("L1", "Umar bin Khattab dikenal sebagai khalifah yang ...", "tegas dan adil", "pendendam", "kikir", "lalai kepada rakyat"),
      U("L2", "Ceritakan satu keteladanan Umar bin Khattab sebagai pemimpin!", "Contoh benar: adil kepada rakyat, hidup sederhana, memeriksa keadaan rakyat pada malam hari, tegas dalam menegakkan kebenaran. Skor sebanding kejelasan teladan.")
    ],
    "ski-C-5": [
      P("L1", "Usman bin Affan dijuluki ...", "Zun Nurain", "Al-Faruq", "Ash-Shiddiq", "Al-Amin"),
      U("L2", "Sebutkan dua sifat teladan Usman bin Affan!", "Contoh benar: dermawan, pemalu, sabar, banyak membantu perjuangan Islam dengan hartanya. Skor sebanding jumlah sifat yang benar.")
    ],
    "ski-C-6": [
      P("L1", "Ali bin Abi Thalib adalah putra paman Nabi yang bernama ...", "Abu Talib", "Abu Lahab", "Abdullah", "Abu Bakar"),
      I("L1", "Ali bin Abi Thalib dibesarkan di rumah Nabi sejak masih ....", "kecil (anak-anak)")
    ],
    "ski-C-7": [
      P("L1", "Sunan Gunung Jati berdakwah di daerah ...", "Cirebon", "Surabaya", "Tuban", "Gresik")
    ],
    // ===================== AL-QUR'AN HADIS (TP hafalan/hadis yang masih kurang dari 5 soal) =====================
    "aqh-A-5": [
      P("L1", "Surah Al-Fatihah terdiri dari ... ayat.", "tujuh", "lima", "enam", "delapan")
    ],
    "aqh-A-6": [
      P("L1", "Contoh menerapkan hadis tentang kebersihan sebelum salat adalah ...", "berwudu dengan air yang bersih", "berwudu dengan air kotor", "langsung salat tanpa bersuci", "menunda wudu sampai nanti")
    ],
    "aqh-A-7": [
      P("L1", "Ilmu yang kita pelajari sebaiknya diamalkan dan ...", "diajarkan kepada orang lain", "disimpan sendiri", "dilupakan", "disembunyikan")
    ],
    "aqh-A-8": [
      P("L1", "Menurut hadis, orang yang paling berhak mendapat bakti kita adalah ...", "ibu", "teman", "tetangga", "penjual")
    ],
    "aqh-B-9": [
      P("L1", "Dalam salat berjemaah, makmum harus mengikuti gerakan ...", "imam", "muazin", "khatib", "orang yang lewat")
    ],
    "aqh-B-10": [
      P("L1", "Sesama muslim tidak boleh saling ...", "menzalimi (menyakiti)", "menolong", "menyayangi", "menasihati")
    ],
    "aqh-B-11": [
      P("L2", "Contoh sikap takwa ketika sendirian adalah ...", "tetap jujur walaupun tidak ada yang melihat", "berbohong karena tidak ada yang tahu", "meninggalkan salat", "menyontek saat ulangan")
    ],
    "aqh-B-12": [
      P("L1", "Mengerjakan salat semata-mata karena Allah adalah contoh niat yang ...", "ikhlas", "pamer", "terpaksa", "asal-asalan")
    ],
    "aqh-B-13": [
      P("L1", "Contoh silaturahmi saat hari raya adalah ...", "bersalaman dan saling memaafkan dengan keluarga", "menjauhi saudara", "mengurung diri di kamar", "tidak mau bertegur sapa")
    ],
    "aqh-C-5": [
      P("L2", "Sikap yang harus dijauhi agar tidak menjadi munafik adalah ...", "berpura-pura dan tidak jujur", "jujur dalam berkata", "menepati janji", "ikhlas dalam beramal")
    ],
    "aqh-C-6": [
      P("L1", "Perlakuan yang baik kepada anak yatim adalah ...", "menyayangi dan membantu kebutuhannya", "menghardiknya", "mengabaikannya", "menyakitinya")
    ],
    "aqh-C-7": [
      P("L1", "Berinfak di jalan Allah akan dibalas dengan pahala yang ...", "berlipat ganda", "berkurang", "hilang", "sama saja")
    ],
    "aqh-C-8": [
      P("L1", "Iman harus disertai ... agar menjadi sebaik-baik makhluk.", "amal saleh", "kesombongan", "kemalasan", "kebohongan")
    ],
    "aqh-C-9": [
      P("L1", "Salah satu tanda orang munafik adalah apabila berjanji ia ...", "mengingkari", "menepati", "mencatat", "melupakannya")
    ],
    "aqh-C-10": [
      P("L2", "Contoh menerapkan hadis menanggung anak yatim di madrasah adalah ...", "berbagi bekal dan tidak mengejek teman yang yatim", "mengejek teman yang yatim", "menjauhi teman yang yatim", "mengambil barang teman yang yatim")
    ],
    "aqh-C-11": [
      P("L1", "Orang yang suka memberi disebut ...", "dermawan", "kikir", "peminta", "pelit")
    ],
    "aqh-C-12": [
      P("L1", "Ilmu yang bermanfaat termasuk amal yang pahalanya ...", "terus mengalir", "terputus saat meninggal", "hilang", "berkurang")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;

/* ################ BAGIAN: data-soal-mtk.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-mtk.js
   Bank soal DRAF Matematika MI Fase A-C (kelas 1-6) + DAFTAR TP DRAF (window.DRAF_TP_MTK).
   KUNCI = mtk-A-1..11, mtk-B-1..12, mtk-C-1..12 (total 35 TP).
   PENTING: kode mapel 'mtk' adalah ASUMSI. Samakan dengan kode mapel Matematika di js/data-tp-mi.js,
   dan pindahkan daftar TP di bawah ke data-tp-mi.js agar kunci cocok (urutan TP = nomor kunci).
   Acuan: Capaian Pembelajaran Matematika Fase A-C (lima elemen: Bilangan, Aljabar, Pengukuran, Geometri,
   Analisis Data dan Peluang). Rumusan TP adalah usulan penyusun; guru wajib menyesuaikan dengan ATP
   madrasah dan buku ajar, lalu mengubah/menghapus yang tidak sesuai.
   Status: DRAF, belum diperiksa guru.
   Format sama dengan data-soal-mi.js:
     PG    : ['pg', level, soal, [jawaban BENAR, pengecoh1, pengecoh2, pengecoh3]]  (opsi diacak saat dipakai)
     Isian : ['is', level, soal, jawaban]
     Uraian: ['ur', level, soal, pedoman penskoran]
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  // ---------- DAFTAR TP DRAF ----------
  window.DRAF_TP_MTK = {
    "mtk-A-1": "Membaca, menulis, membandingkan, dan mengurutkan bilangan cacah sampai 100 (Bilangan)",
    "mtk-A-2": "Menentukan nilai tempat (puluhan dan satuan) serta menguraikan bilangan sampai 100 (Bilangan)",
    "mtk-A-3": "Menyelesaikan penjumlahan dan pengurangan bilangan sampai 20 (Bilangan)",
    "mtk-A-4": "Menyelesaikan penjumlahan dan pengurangan bilangan sampai 100, termasuk soal cerita (Bilangan)",
    "mtk-A-5": "Menyelesaikan perkalian dan pembagian sederhana dengan benda konkret, hasil sampai 20 (Bilangan)",
    "mtk-A-6": "Mengenal pecahan setengah dan seperempat sebagai bagian dari keseluruhan (Bilangan)",
    "mtk-A-7": "Melanjutkan pola sederhana dan mengisi nilai yang belum diketahui pada kalimat matematika (Aljabar)",
    "mtk-A-8": "Mengukur dan membandingkan panjang dan berat benda dengan satuan tidak baku (Pengukuran)",
    "mtk-A-9": "Mengenal waktu: jam, hari, dan bulan (Pengukuran)",
    "mtk-A-10": "Mengenal bangun datar dan bangun ruang sederhana serta posisi benda (Geometri)",
    "mtk-A-11": "Mengumpulkan, menyajikan, dan membaca data dalam tabel dan diagram gambar (Analisis Data dan Peluang)",

    "mtk-B-1": "Membaca, menulis, menentukan nilai tempat, dan membandingkan bilangan cacah sampai 10.000 (Bilangan)",
    "mtk-B-2": "Menyelesaikan penjumlahan dan pengurangan bilangan sampai 10.000 (Bilangan)",
    "mtk-B-3": "Menyelesaikan perkalian dan pembagian bilangan cacah (Bilangan)",
    "mtk-B-4": "Menyelesaikan operasi hitung campuran dan soal cerita (Bilangan)",
    "mtk-B-5": "Mengenal, membandingkan, dan menentukan pecahan senilai serta penjumlahan pecahan berpenyebut sama (Bilangan)",
    "mtk-B-6": "Mengenal bilangan desimal sederhana dan hubungannya dengan pecahan (Bilangan)",
    "mtk-B-7": "Menentukan pola bilangan dan mengisi nilai yang belum diketahui (Aljabar)",
    "mtk-B-8": "Mengukur dan mengonversi panjang (cm, m, km) dan berat (g, kg) dengan satuan baku (Pengukuran)",
    "mtk-B-9": "Menentukan waktu dan durasi dalam jam, menit, dan detik (Pengukuran)",
    "mtk-B-10": "Menghitung keliling bangun datar serta luas persegi dan persegi panjang (Pengukuran)",
    "mtk-B-11": "Mendeskripsikan ciri bangun datar dan bangun ruang (Geometri)",
    "mtk-B-12": "Menyajikan, membaca, dan menafsirkan data dalam tabel, diagram gambar, dan diagram batang (Analisis Data dan Peluang)",

    "mtk-C-1": "Membaca, menulis, menentukan nilai tempat, membulatkan, dan membandingkan bilangan sampai 1.000.000 (Bilangan)",
    "mtk-C-2": "Menyelesaikan operasi hitung bilangan cacah besar dan soal cerita (Bilangan)",
    "mtk-C-3": "Menentukan faktor, kelipatan, KPK, dan FPB (Bilangan)",
    "mtk-C-4": "Menyelesaikan penjumlahan dan pengurangan pecahan berpenyebut berbeda (Bilangan)",
    "mtk-C-5": "Menghubungkan pecahan, desimal, dan persen serta menyelesaikan soal sehari-hari (Bilangan)",
    "mtk-C-6": "Menyelesaikan masalah perbandingan dan skala sederhana (Bilangan)",
    "mtk-C-7": "Menentukan pola bilangan dan menyelesaikan kalimat matematika dengan nilai yang belum diketahui (Aljabar)",
    "mtk-C-8": "Mengonversi satuan panjang, berat, waktu, dan volume cairan (Pengukuran)",
    "mtk-C-9": "Menghitung luas dan keliling berbagai bangun datar (Pengukuran)",
    "mtk-C-10": "Menghitung volume kubus dan balok serta hubungannya dengan liter (Pengukuran)",
    "mtk-C-11": "Mengidentifikasi sifat bangun ruang dan jaring-jaringnya (Geometri)",
    "mtk-C-12": "Menentukan rata-rata, median, dan modus serta menafsirkan data (Analisis Data dan Peluang)"
  };

  const BARU = {
    // ===================== FASE A =====================
    "mtk-A-1": [
      P("L1", "Bilangan 47 dibaca ...", "empat puluh tujuh", "tujuh puluh empat", "empat puluh empat", "tujuh puluh tujuh"),
      P("L1", "Lambang bilangan “delapan puluh dua” adalah ...", "82", "28", "80", "802"),
      P("L1", "Tanda yang tepat untuk 56 ... 65 adalah ...", "<", ">", "=", "+"),
      P("L2", "Urutan bilangan dari yang terkecil: 34, 12, 51, 27 adalah ...", "12, 27, 34, 51", "51, 34, 27, 12", "12, 34, 27, 51", "27, 12, 34, 51"),
      I("L1", "Bilangan setelah 99 adalah ....", "100"),
      U("L2", "Urutkan bilangan 73, 37, 58, 85 dari yang terbesar, lalu jelaskan cara membandingkannya!", "Urutan: 85, 73, 58, 37. Cara: bandingkan angka puluhan lebih dulu; jika sama, bandingkan satuan. Skor: urutan benar 3, penjelasan cara 1.")
    ],
    "mtk-A-2": [
      P("L1", "Pada bilangan 46, angka 4 menempati tempat ...", "puluhan", "satuan", "ratusan", "ribuan"),
      P("L1", "Nilai angka 7 pada bilangan 73 adalah ...", "70", "7", "73", "3"),
      P("L1", "36 = 30 + ...", "6", "3", "60", "66"),
      P("L2", "Bilangan yang terdiri dari 5 puluhan dan 8 satuan adalah ...", "58", "85", "13", "508"),
      I("L1", "60 + 9 = ....", "69"),
      U("L2", "Tuliskan bilangan 74 sebagai penjumlahan puluhan dan satuan, lalu sebutkan nilai tiap angkanya!", "74 = 70 + 4. Angka 7 bernilai 70 (puluhan) dan angka 4 bernilai 4 (satuan). Skor: penjumlahan 2, nilai tiap angka 2.")
    ],
    "mtk-A-3": [
      P("L1", "8 + 7 = ...", "15", "14", "16", "13"),
      P("L1", "17 - 9 = ...", "8", "7", "9", "26"),
      P("L2", "Ani punya 9 kelereng. Ibu memberi 6 kelereng lagi. Kelereng Ani sekarang ... buah.", "15", "3", "14", "16"),
      P("L2", "Penjumlahan yang hasilnya 12 adalah ...", "5 + 7", "6 + 7", "4 + 7", "9 + 4"),
      I("L1", "20 - 13 = ....", "7"),
      U("L2", "Ada 14 burung di pohon. Sebanyak 6 burung terbang. Berapa burung yang tersisa? Tulis kalimat matematikanya!", "14 - 6 = 8. Tersisa 8 burung. Skor: kalimat matematika 2, hasil 1, kalimat jawaban 1.")
    ],
    "mtk-A-4": [
      P("L1", "35 + 24 = ...", "59", "49", "11", "61"),
      P("L1", "78 - 35 = ...", "43", "53", "113", "47"),
      P("L1", "46 + 27 = ...", "73", "63", "72", "83"),
      P("L2", "Di kebun ada 52 pohon mangga dan 36 pohon jeruk. Jumlah semua pohon adalah ... pohon.", "88", "16", "78", "98"),
      I("L1", "90 - 45 = ....", "45"),
      U("L3", "Di toko ada 85 buku. Terjual 38 buku, lalu datang 20 buku baru. Berapa buku di toko sekarang?", "85 - 38 = 47; 47 + 20 = 67. Jawaban: 67 buku. Skor: langkah pertama 2, langkah kedua 2.")
    ],
    "mtk-A-5": [
      P("L1", "2 + 2 + 2 + 2 jika ditulis sebagai perkalian adalah ...", "4 × 2", "2 × 2", "4 + 2", "2 × 6"),
      P("L1", "3 × 5 = ...", "15", "8", "35", "12"),
      P("L2", "12 permen dibagi sama banyak kepada 4 anak. Setiap anak mendapat ... permen.", "3", "8", "16", "4"),
      P("L2", "Ada 4 piring, tiap piring berisi 3 apel. Jumlah apel seluruhnya ...", "12", "7", "43", "9"),
      I("L1", "20 : 5 = ....", "4"),
      U("L2", "Ada 3 kantong, tiap kantong berisi 5 jeruk. Berapa jumlah jeruk? Tulis dalam bentuk penjumlahan berulang dan perkalian!", "5 + 5 + 5 = 15 dan 3 × 5 = 15. Jumlah jeruk 15. Skor: penjumlahan berulang 1, perkalian 1, hasil 1, kalimat jawaban 1.")
    ],
    "mtk-A-6": [
      P("L1", "Sebuah roti dibagi dua sama besar. Satu bagian disebut ...", "setengah", "seperempat", "sepertiga", "seluruhnya"),
      P("L1", "Sebuah semangka dibagi 4 sama besar. Satu potong disebut ...", "seperempat", "setengah", "sepertiga", "tiga perempat"),
      P("L1", "Lambang pecahan “setengah” adalah ...", "1/2", "2/1", "1/4", "1/3"),
      P("L2", "Pernyataan yang benar tentang 1/2 dan 1/4 adalah ...", "1/2 lebih besar daripada 1/4", "1/4 lebih besar daripada 1/2", "keduanya sama besar", "keduanya tidak dapat dibandingkan"),
      I("L1", "Satu bagian dari empat bagian sama besar ditulis pecahan ....", "1/4")
    ],
    "mtk-A-7": [
      P("L1", "Pola bilangan 2, 4, 6, 8, ... Bilangan berikutnya adalah ...", "10", "9", "12", "7"),
      P("L1", "Pola: lingkaran, kotak, lingkaran, kotak, lingkaran, ... Gambar berikutnya adalah ...", "kotak", "lingkaran", "segitiga", "bintang"),
      P("L1", "5 + ... = 12. Bilangan yang tepat adalah ...", "7", "6", "8", "17"),
      P("L2", "... - 4 = 6. Bilangan yang tepat adalah ...", "10", "2", "24", "9"),
      I("L1", "Lanjutkan pola: 5, 10, 15, 20, ....", "25"),
      U("L2", "Perhatikan pola 3, 6, 9, 12, ... Tuliskan tiga bilangan berikutnya dan jelaskan aturan polanya!", "15, 18, 21. Aturan: ditambah 3 setiap kali. Skor: tiga bilangan 3, aturan 1.")
    ],
    "mtk-A-8": [
      P("L1", "Satuan tidak baku untuk mengukur panjang meja adalah ...", "jengkal", "meter", "kilometer", "gram"),
      P("L2", "Pensil A lebih panjang dari pensil B, dan pensil B lebih panjang dari pensil C. Pensil yang paling pendek adalah ...", "pensil C", "pensil A", "pensil B", "semuanya sama panjang"),
      P("L1", "Pada timbangan, sisi yang berisi benda lebih berat akan ...", "lebih rendah", "lebih tinggi", "tetap datar", "terangkat"),
      P("L2", "Panjang buku 6 klip kertas dan panjang tali 9 klip kertas. Yang lebih panjang adalah ...", "tali", "buku", "sama panjang", "tidak dapat dibandingkan"),
      I("L1", "Meja diukur 5 jengkal dan papan tulis 8 jengkal. Yang lebih pendek adalah ....", "meja"),
      U("L2", "Jelaskan cara mengukur panjang buku tulismu menggunakan klip kertas!", "Klip diletakkan berderet dari ujung ke ujung buku tanpa celah dan tidak bertumpuk, lalu banyak klip dihitung dan ditulis sebagai hasil (mis. 12 klip). Skor: cara meletakkan 2, menghitung 1, menulis hasil 1.")
    ],
    "mtk-A-9": [
      P("L1", "Banyak hari dalam seminggu adalah ...", "7", "5", "6", "30"),
      P("L1", "Hari setelah Selasa adalah ...", "Rabu", "Senin", "Kamis", "Jumat"),
      P("L1", "Jarum pendek menunjuk angka 3 dan jarum panjang menunjuk angka 12. Pukul berapa?", "03.00", "12.00", "06.00", "12.03"),
      P("L1", "Bulan pertama dalam satu tahun adalah ...", "Januari", "Februari", "Desember", "Maret"),
      I("L1", "Hari sebelum Jumat adalah ....", "Kamis"),
      U("L2", "Tuliskan urutan hari dalam seminggu mulai dari Senin!", "Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu. Skor: 1 per hari yang benar dan berurutan.")
    ],
    "mtk-A-10": [
      P("L1", "Bangun datar yang memiliki tiga sisi adalah ...", "segitiga", "persegi", "lingkaran", "persegi panjang"),
      P("L1", "Bangun datar yang tidak memiliki sudut dan sisi lurus adalah ...", "lingkaran", "persegi", "segitiga", "persegi panjang"),
      P("L1", "Benda yang berbentuk kubus adalah ...", "dadu", "bola basket", "pipa", "kelereng"),
      P("L1", "Benda yang berbentuk bola adalah ...", "bola sepak", "dadu", "buku", "kotak pensil"),
      P("L1", "Lawan kata “depan” adalah ...", "belakang", "atas", "kiri", "samping"),
      I("L1", "Persegi memiliki .... sisi.", "4")
    ],
    "mtk-A-11": [
      P("L1", "Buah kesukaan: apel 5, jeruk 8, mangga 3. Buah yang paling banyak disukai adalah ...", "jeruk", "apel", "mangga", "pisang"),
      P("L2", "Dari data buah kesukaan di atas (apel 5, jeruk 8, mangga 3), jumlah semua anak adalah ...", "16", "13", "15", "11"),
      P("L1", "Pada diagram gambar, satu ☺ mewakili 1 anak. Ada 6 ☺ pada kolom “kucing”. Banyak anak yang menyukai kucing adalah ...", "6", "1", "7", "16"),
      P("L1", "Cara yang tepat untuk mengumpulkan data kesukaan teman sekelas adalah ...", "bertanya lalu mencatat", "menebak saja", "melihat awan", "menghitung bangku"),
      I("L1", "Data warna: merah 4, biru 7, hijau 2. Warna yang paling sedikit adalah ....", "hijau"),
      U("L2", "Data hewan: kucing 6, ayam 9, ikan 4. Hewan apa yang paling banyak, dan berapa selisihnya dengan yang paling sedikit?", "Ayam paling banyak (9); paling sedikit ikan (4); selisih 9 - 4 = 5. Skor: hewan terbanyak 1, hewan tersedikit 1, selisih 2.")
    ],

    // ===================== FASE B =====================
    "mtk-B-1": [
      P("L1", "Bilangan 3.405 dibaca ...", "tiga ribu empat ratus lima", "tiga ribu empat puluh lima", "tiga ratus empat puluh lima", "tiga ribu lima ratus empat"),
      P("L1", "Nilai angka 6 pada bilangan 7.629 adalah ...", "600", "60", "6", "6.000"),
      P("L2", "Bilangan terbesar dari 4.098, 4.980, 4.089, 4.908 adalah ...", "4.980", "4.098", "4.089", "4.908"),
      P("L1", "5.000 + 300 + 20 + 7 = ...", "5.327", "5.237", "5.723", "5.372"),
      I("L1", "8.000 + 900 + 5 = ....", "8.905"),
      U("L2", "Tuliskan bilangan 6.248 dalam bentuk panjang dan sebutkan nilai tempat tiap angkanya!", "6.248 = 6.000 + 200 + 40 + 8. Angka 6 ribuan, 2 ratusan, 4 puluhan, 8 satuan. Skor: bentuk panjang 2, nilai tempat 2.")
    ],
    "mtk-B-2": [
      P("L1", "2.345 + 1.234 = ...", "3.579", "3.469", "3.569", "4.579"),
      P("L1", "5.608 - 2.305 = ...", "3.303", "3.313", "3.903", "7.913"),
      P("L2", "1.789 + 2.456 = ...", "4.245", "3.235", "4.235", "4.345"),
      P("L2", "7.000 - 3.456 = ...", "3.544", "4.544", "3.456", "4.456"),
      I("L1", "4.500 + 3.700 = ....", "8.200"),
      U("L3", "Pak Budi punya 6.500 butir telur. Pagi hari terjual 2.750 butir dan siang hari 1.600 butir. Berapa butir telur yang tersisa?", "2.750 + 1.600 = 4.350; 6.500 - 4.350 = 2.150. Sisa 2.150 butir. Skor: jumlah terjual 2, sisa 2.")
    ],
    "mtk-B-3": [
      P("L1", "7 × 8 = ...", "56", "54", "48", "63"),
      P("L1", "72 : 9 = ...", "8", "9", "7", "6"),
      P("L2", "24 × 3 = ...", "72", "62", "27", "82"),
      P("L2", "96 : 4 = ...", "24", "23", "26", "22"),
      I("L1", "125 × 4 = ....", "500"),
      U("L2", "Satu kotak berisi 12 pensil. Berapa pensil dalam 15 kotak?", "12 × 15 = 180. Jawaban 180 pensil. Skor: kalimat matematika 2, hasil 2.")
    ],
    "mtk-B-4": [
      P("L2", "8 + 6 × 2 = ...", "20", "28", "16", "14"),
      P("L2", "40 - 24 : 4 = ...", "34", "4", "16", "10"),
      P("L2", "(15 + 5) × 3 = ...", "60", "30", "75", "20"),
      P("L2", "Ibu membeli 3 kg apel seharga Rp20.000 per kg dan membayar Rp100.000. Uang kembaliannya ...", "Rp40.000", "Rp80.000", "Rp60.000", "Rp20.000"),
      I("L2", "50 + 10 × 3 = ....", "80"),
      U("L3", "Ali punya 5 kantong kelereng, tiap kantong berisi 12 butir. Ia memberi 18 butir kepada adiknya. Berapa butir kelereng Ali sekarang? Tulis kalimat matematikanya!", "5 × 12 = 60; 60 - 18 = 42. Sisa 42 butir. Skor: perkalian 2, pengurangan 2.")
    ],
    "mtk-B-5": [
      P("L1", "Pizza dipotong 8 bagian sama besar. Adik makan 3 potong. Pecahan bagian yang dimakan adik adalah ...", "3/8", "8/3", "5/8", "3/5"),
      P("L2", "Pecahan yang senilai dengan 1/2 adalah ...", "2/4", "1/4", "2/3", "3/4"),
      P("L1", "Pecahan yang paling besar adalah ...", "3/4", "1/4", "2/4", "1/2"),
      P("L2", "2/5 + 1/5 = ...", "3/5", "3/10", "2/10", "1/5"),
      I("L2", "1/2 senilai dengan .../8. Isian yang tepat adalah ....", "4"),
      U("L2", "Urutkan 1/2, 1/4, 3/4, 1/8 dari yang terkecil dan jelaskan caranya!", "1/8, 1/4, 1/2, 3/4. Cara: samakan penyebut menjadi 8 sehingga 1/8, 2/8, 4/8, 6/8, lalu bandingkan pembilangnya. Skor: urutan 3, cara 1.")
    ],
    "mtk-B-6": [
      P("L1", "Bilangan desimal 0,5 sama dengan pecahan ...", "1/2", "1/5", "5/100", "5"),
      P("L2", "Bentuk desimal dari 1/4 adalah ...", "0,25", "0,14", "0,4", "1,4"),
      P("L1", "Bilangan desimal yang paling besar adalah ...", "0,9", "0,09", "0,19", "0,8"),
      P("L1", "Pada bilangan 4,37 angka 3 menempati tempat ...", "persepuluhan", "perseratusan", "satuan", "puluhan"),
      I("L2", "0,75 jika ditulis sebagai pecahan berpenyebut 100 adalah ....", "75/100"),
      U("L2", "Tuliskan 3/10 dan 7/10 dalam bentuk desimal, lalu tentukan mana yang lebih besar!", "3/10 = 0,3 dan 7/10 = 0,7; 0,7 lebih besar. Skor: dua desimal 2, perbandingan 2.")
    ],
    "mtk-B-7": [
      P("L1", "Pola 4, 8, 12, 16, ... Bilangan berikutnya adalah ...", "20", "18", "24", "19"),
      P("L1", "Pola 100, 90, 80, 70, ... Bilangan berikutnya adalah ...", "60", "50", "75", "65"),
      P("L2", "... + 15 = 40. Bilangan yang tepat adalah ...", "25", "55", "35", "15"),
      P("L2", "3 × ... = 27. Bilangan yang tepat adalah ...", "9", "8", "24", "81"),
      I("L1", "Lanjutkan pola: 1, 4, 7, 10, ....", "13"),
      U("L3", "Perhatikan pola 2, 5, 8, 11, ... Tuliskan aturan pola dan bilangan ke-7!", "Aturan: ditambah 3. Barisan: 2, 5, 8, 11, 14, 17, 20. Bilangan ke-7 adalah 20. Skor: aturan 2, bilangan ke-7 2.")
    ],
    "mtk-B-8": [
      P("L1", "1 meter = ... cm", "100", "10", "1.000", "1"),
      P("L1", "1 kg = ... g", "1.000", "100", "10", "10.000"),
      P("L1", "Satuan yang paling tepat untuk menyatakan jarak antarkota adalah ...", "kilometer", "sentimeter", "milimeter", "kilogram"),
      P("L2", "2 kg 300 g = ... g", "2.300", "230", "2.030", "23.000"),
      I("L1", "3 m = .... cm", "300"),
      U("L2", "Tali sepanjang 2 m dipotong 75 cm. Berapa cm sisa tali?", "2 m = 200 cm; 200 - 75 = 125. Sisa 125 cm. Skor: konversi 1, pengurangan 2, satuan 1.")
    ],
    "mtk-B-9": [
      P("L1", "1 jam = ... menit", "60", "30", "100", "24"),
      P("L1", "Pukul 14.00 sama dengan pukul ...", "2 siang", "4 sore", "12 siang", "1 siang"),
      P("L2", "Film dimulai pukul 09.30 dan selesai pukul 11.15. Lama film adalah ...", "1 jam 45 menit", "2 jam 15 menit", "1 jam 15 menit", "1 jam 55 menit"),
      P("L2", "Dina belajar 45 menit lalu istirahat 20 menit. Jumlah waktunya adalah ...", "65 menit", "25 menit", "55 menit", "75 menit"),
      I("L1", "2 jam = .... menit", "120"),
      U("L3", "Kegiatan dimulai pukul 07.15 dan berlangsung 2 jam 50 menit. Pukul berapa kegiatan selesai?", "07.15 + 2 jam = 09.15; 09.15 + 50 menit = 10.05. Selesai pukul 10.05. Skor: tambah jam 2, tambah menit 2.")
    ],
    "mtk-B-10": [
      P("L1", "Keliling persegi dengan sisi 7 cm adalah ...", "28 cm", "14 cm", "49 cm", "21 cm"),
      P("L2", "Keliling persegi panjang dengan panjang 9 cm dan lebar 4 cm adalah ...", "26 cm", "36 cm", "13 cm", "22 cm"),
      P("L2", "Luas persegi panjang dengan panjang 8 cm dan lebar 3 cm adalah ...", "24 cm²", "22 cm²", "11 cm²", "24 cm"),
      P("L1", "Luas persegi dengan sisi 6 cm adalah ...", "36 cm²", "24 cm²", "12 cm²", "36 cm"),
      I("L1", "Keliling segitiga dengan sisi 5 cm, 6 cm, dan 7 cm adalah .... cm", "18"),
      U("L3", "Kebun berbentuk persegi panjang berukuran 12 m × 8 m. Hitunglah keliling dan luas kebun!", "Keliling = 2 × (12 + 8) = 40 m. Luas = 12 × 8 = 96 m². Skor: keliling 2, luas 2.")
    ],
    "mtk-B-11": [
      P("L1", "Persegi panjang memiliki ... pasang sisi yang sejajar.", "dua", "satu", "tiga", "nol"),
      P("L1", "Banyak titik sudut pada kubus adalah ...", "8", "6", "12", "4"),
      P("L1", "Banyak rusuk pada balok adalah ...", "12", "8", "6", "10"),
      P("L1", "Bangun ruang yang tidak memiliki rusuk dan titik sudut adalah ...", "bola", "kubus", "balok", "limas"),
      P("L1", "Benda yang berbentuk tabung adalah ...", "kaleng susu", "dadu", "bola voli", "kardus sepatu"),
      I("L1", "Kubus memiliki .... sisi.", "6"),
      U("L2", "Sebutkan dua persamaan dan satu perbedaan antara kubus dan balok!", "Persamaan: sama-sama memiliki 6 sisi, 12 rusuk, 8 titik sudut. Perbedaan: semua sisi kubus berupa persegi yang sama besar, sedangkan sisi balok berupa persegi panjang. Skor: tiap persamaan 1, perbedaan 2.")
    ],
    "mtk-B-12": [
      P("L1", "Nilai: Ani 80, Budi 90, Cici 70. Nilai tertinggi diperoleh ...", "Budi", "Ani", "Cici", "tidak ada"),
      P("L2", "Selisih nilai tertinggi dan terendah dari data Ani 80, Budi 90, Cici 70 adalah ...", "20", "10", "30", "90"),
      P("L2", "Pada diagram gambar, satu ☺ mewakili 2 anak. Kelas A memiliki 5 ☺. Banyak anak di kelas A adalah ...", "10", "5", "7", "25"),
      P("L1", "Penyajian data yang cocok untuk membandingkan banyak benda adalah ...", "diagram batang", "denah", "peta", "jaring-jaring"),
      I("L2", "Buku terjual 4 hari: 12, 15, 9, 14. Jumlah buku yang terjual adalah ....", "50"),
      U("L3", "Hasil panen: Senin 25 kg, Selasa 40 kg, Rabu 35 kg. Hari apa panen terbanyak, dan berapa kg total panen tiga hari itu?", "Panen terbanyak hari Selasa (40 kg). Total 25 + 40 + 35 = 100 kg. Skor: hari 1, penjumlahan 2, hasil 1.")
    ],

    // ===================== FASE C =====================
    "mtk-C-1": [
      P("L1", "Bilangan 250.364 dibaca ...", "dua ratus lima puluh ribu tiga ratus enam puluh empat", "dua puluh lima ribu tiga ratus enam puluh empat", "dua ratus lima puluh tiga ratus enam puluh empat", "dua ratus lima ribu tiga ratus enam puluh empat"),
      P("L1", "Nilai angka 8 pada bilangan 480.325 adalah ...", "80.000", "8.000", "800.000", "8"),
      P("L2", "Pembulatan 46.782 ke ratusan terdekat adalah ...", "46.800", "46.700", "47.000", "46.780"),
      P("L2", "Bilangan terkecil dari 345.210, 345.012, 354.012, 345.102 adalah ...", "345.012", "345.102", "345.210", "354.012"),
      I("L2", "Pembulatan 7.450 ke ribuan terdekat adalah ....", "7.000"),
      U("L2", "Tuliskan bilangan 903.057 dalam bentuk panjang!", "903.057 = 900.000 + 3.000 + 50 + 7. Skor: tiap suku yang benar 1.")
    ],
    "mtk-C-2": [
      P("L1", "125.340 + 48.760 = ...", "174.100", "164.100", "173.100", "174.000"),
      P("L1", "500.000 - 123.456 = ...", "376.544", "377.544", "386.544", "376.456"),
      P("L2", "1.250 × 12 = ...", "15.000", "12.500", "1.500", "15.500"),
      P("L2", "7.200 : 24 = ...", "300", "30", "3.000", "288"),
      I("L1", "345 × 20 = ....", "6.900"),
      U("L3", "Sebuah toko menerima 48 dus berisi masing-masing 36 botol. Sebanyak 1.200 botol terjual. Berapa botol yang tersisa?", "48 × 36 = 1.728; 1.728 - 1.200 = 528. Sisa 528 botol. Skor: perkalian 2, pengurangan 2.")
    ],
    "mtk-C-3": [
      P("L1", "Semua faktor dari 12 adalah ...", "1, 2, 3, 4, 6, 12", "1, 2, 3, 6, 12", "2, 4, 6, 12", "1, 2, 4, 6, 12"),
      P("L2", "KPK dari 6 dan 8 adalah ...", "24", "48", "14", "2"),
      P("L2", "FPB dari 18 dan 24 adalah ...", "6", "3", "72", "12"),
      P("L1", "Tiga kelipatan 7 yang pertama adalah ...", "7, 14, 21", "7, 17, 27", "1, 7, 14", "14, 21, 28"),
      I("L2", "KPK dari 4 dan 10 adalah ....", "20"),
      U("L3", "Lampu A menyala tiap 6 detik dan lampu B tiap 8 detik. Keduanya menyala bersamaan pada detik ke-0. Setelah berapa detik keduanya menyala bersamaan lagi?", "Dicari KPK 6 dan 8. Kelipatan 6: 6, 12, 18, 24; kelipatan 8: 8, 16, 24. KPK = 24, jadi setelah 24 detik. Skor: cara 3, hasil 1.")
    ],
    "mtk-C-4": [
      P("L2", "1/2 + 1/3 = ...", "5/6", "2/5", "2/6", "1/6"),
      P("L2", "3/4 - 1/8 = ...", "5/8", "2/4", "2/8", "1/2"),
      P("L1", "Pecahan campuran 1 3/4 jika diubah ke pecahan biasa menjadi ...", "7/4", "4/7", "5/4", "13/4"),
      P("L2", "Ibu punya 3/4 kg gula dan memakai 1/4 kg. Sisa gula ibu adalah ...", "1/2 kg", "1/4 kg", "3/4 kg", "1 kg"),
      I("L2", "2/3 + 1/6 = .... (pecahan paling sederhana)", "5/6"),
      U("L3", "Rina memiliki pita 3/4 m, lalu membeli lagi 2/3 m. Berapa panjang pita Rina sekarang?", "3/4 = 9/12 dan 2/3 = 8/12; 9/12 + 8/12 = 17/12 = 1 5/12 m. Skor: penyamaan penyebut 2, penjumlahan 1, bentuk campuran 1.")
    ],
    "mtk-C-5": [
      P("L1", "25% sama dengan pecahan ...", "1/4", "1/5", "2/5", "1/2"),
      P("L1", "Bentuk persen dari 0,6 adalah ...", "60%", "6%", "0,6%", "600%"),
      P("L2", "Bentuk persen dari 3/4 adalah ...", "75%", "34%", "43%", "60%"),
      P("L2", "Harga barang Rp50.000 diberi diskon 20%. Besar diskon adalah ...", "Rp10.000", "Rp20.000", "Rp40.000", "Rp5.000"),
      I("L2", "1,5 + 2,25 = ....", "3,75"),
      U("L3", "Sebuah buku berharga Rp40.000 mendapat diskon 25%. Berapa rupiah yang harus dibayar?", "Diskon = 25% × 40.000 = 10.000; harga bayar = 40.000 - 10.000 = Rp30.000. Skor: diskon 2, harga bayar 2.")
    ],
    "mtk-C-6": [
      P("L1", "Perbandingan 4 anak laki-laki dan 6 anak perempuan dalam bentuk paling sederhana adalah ...", "2 : 3", "4 : 6", "3 : 2", "1 : 2"),
      P("L2", "Skala peta 1 : 1.000.000. Jarak pada peta 3 cm. Jarak sebenarnya adalah ...", "30 km", "3 km", "300 km", "3.000 km"),
      P("L2", "Perbandingan kelereng A dan B adalah 3 : 5. Jika A = 12, maka B = ...", "20", "15", "36", "8"),
      P("L2", "Harga 3 pensil Rp9.000. Harga 5 pensil yang sama adalah ...", "Rp15.000", "Rp12.000", "Rp27.000", "Rp18.000"),
      I("L1", "Perbandingan 15 : 25 dalam bentuk paling sederhana adalah ....", "3 : 5"),
      U("L3", "Sebuah adonan memerlukan tepung dan gula dengan perbandingan 5 : 2. Jika tepung yang dipakai 500 gram, berapa gram gula yang diperlukan?", "500 : 5 = 100 untuk tiap bagian; gula = 2 × 100 = 200 gram. Skor: nilai satu bagian 2, hasil 2.")
    ],
    "mtk-C-7": [
      P("L2", "Pola 1, 3, 6, 10, ... Bilangan berikutnya adalah ...", "15", "14", "16", "13"),
      P("L2", "Nilai n pada 3n + 4 = 19 adalah ...", "5", "4", "6", "23"),
      P("L2", "Pola 2, 6, 18, 54, ... Bilangan berikutnya adalah ...", "162", "108", "72", "216"),
      P("L1", "n - 18 = 27. Nilai n adalah ...", "45", "9", "35", "46"),
      I("L2", "Jika n + 15 = 40, maka 2 × n = ....", "50"),
      U("L3", "Perhatikan pola 5, 9, 13, 17, ... Tuliskan aturan pola dan bilangan ke-8!", "Aturan: ditambah 4. Barisan: 5, 9, 13, 17, 21, 25, 29, 33. Bilangan ke-8 adalah 33. Skor: aturan 2, bilangan ke-8 2.")
    ],
    "mtk-C-8": [
      P("L1", "3,5 km = ... m", "3.500", "350", "35.000", "3.050"),
      P("L1", "4.500 g = ... kg", "4,5", "45", "0,45", "450"),
      P("L2", "2 jam 30 menit = ... menit", "150", "230", "130", "120"),
      P("L1", "5 liter = ... mL", "5.000", "500", "50", "50.000"),
      I("L1", "2,5 m = .... cm", "250"),
      U("L2", "Tiga bungkus gula masing-masing bermassa 750 g. Berapa kg berat seluruh gula?", "3 × 750 = 2.250 g = 2,25 kg. Skor: perkalian 2, konversi 2.")
    ],
    "mtk-C-9": [
      P("L1", "Luas segitiga dengan alas 10 cm dan tinggi 6 cm adalah ...", "30 cm²", "60 cm²", "16 cm²", "32 cm²"),
      P("L1", "Luas jajargenjang dengan alas 12 cm dan tinggi 5 cm adalah ...", "60 cm²", "30 cm²", "17 cm²", "120 cm²"),
      P("L2", "Luas trapesium dengan sisi sejajar 8 cm dan 12 cm serta tinggi 5 cm adalah ...", "50 cm²", "100 cm²", "40 cm²", "60 cm²"),
      P("L2", "Keliling lingkaran berdiameter 14 cm (π = 22/7) adalah ...", "44 cm", "88 cm", "154 cm", "616 cm"),
      I("L2", "Luas lingkaran berjari-jari 7 cm (π = 22/7) adalah .... cm²", "154"),
      U("L3", "Sebuah bangun gabungan terdiri dari persegi panjang 10 cm × 6 cm dan persegi bersisi 4 cm di sampingnya (tidak bertumpuk). Hitunglah luas seluruh bangun!", "Luas persegi panjang = 60 cm²; luas persegi = 16 cm²; luas total = 76 cm². Skor: tiap luas 1, total 2.")
    ],
    "mtk-C-10": [
      P("L1", "Volume kubus dengan rusuk 5 cm adalah ...", "125 cm³", "25 cm³", "15 cm³", "30 cm³"),
      P("L1", "Volume balok berukuran 8 cm × 5 cm × 4 cm adalah ...", "160 cm³", "17 cm³", "40 cm³", "80 cm³"),
      P("L2", "1 liter = ... cm³", "1.000", "100", "10", "10.000"),
      P("L3", "Bak berukuran 50 cm × 40 cm × 30 cm. Volumenya dalam liter adalah ...", "60 liter", "6 liter", "600 liter", "120 liter"),
      I("L1", "Volume kubus dengan rusuk 3 cm adalah .... cm³", "27"),
      U("L3", "Akuarium berukuran 60 cm × 30 cm × 40 cm diisi air sebanyak 3/4 bagian. Berapa liter air di dalam akuarium?", "Volume = 60 × 30 × 40 = 72.000 cm³ = 72 liter; 3/4 × 72 = 54 liter. Skor: volume 2, konversi 1, 3/4 bagian 1.")
    ],
    "mtk-C-11": [
      P("L1", "Jaring-jaring kubus terdiri dari ... persegi.", "6", "4", "8", "12"),
      P("L1", "Bangun ruang beralas lingkaran dan memiliki satu titik puncak adalah ...", "kerucut", "tabung", "bola", "limas"),
      P("L2", "Jaring-jaring tabung terdiri dari ...", "2 lingkaran dan 1 persegi panjang", "1 lingkaran dan 1 segitiga", "2 persegi dan 1 lingkaran", "3 lingkaran"),
      P("L2", "Banyak rusuk limas segiempat adalah ...", "8", "4", "5", "12"),
      I("L2", "Banyak sisi (bidang) limas segiempat adalah ....", "5"),
      U("L2", "Jelaskan bagian-bagian penyusun jaring-jaring balok!", "Jaring-jaring balok terdiri dari 6 persegi panjang: 2 untuk alas dan atas, 2 untuk depan dan belakang, 2 untuk kiri dan kanan; sisi yang berhadapan sama besar. Skor: jumlah 2, pasangan sisi 2.")
    ],
    "mtk-C-12": [
      P("L1", "Rata-rata dari 6, 7, 8, 9, 10 adalah ...", "8", "7", "9", "40"),
      P("L1", "Modus dari data 3, 4, 4, 5, 6, 4, 7 adalah ...", "4", "3", "5", "6"),
      P("L2", "Median dari data 5, 9, 3, 7, 11 adalah ...", "7", "5", "9", "3"),
      P("L2", "Nilai empat siswa: 70, 80, 90, 60. Rata-ratanya adalah ...", "75", "70", "80", "300"),
      I("L2", "Median dari data 2, 4, 6, 8, 10, 12 adalah ....", "7"),
      U("L3", "Diketahui data: 6, 2, 9, 6, 14, 7, 12. Tentukan rata-rata, median, dan modusnya!", "Jumlah = 56, rata-rata = 56 : 7 = 8. Data terurut 2, 6, 6, 7, 9, 12, 14; median = 7. Modus = 6. Skor: rata-rata 2, median 1, modus 1.")
    ]
  };

  // Gabungkan ke bank utama; soal yang bunyinya sama tidak diulang.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(BARU[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;

/* ################ BAGIAN: data-soal-umum-1.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-umum-1.js
   Bank soal DRAF mapel umum MI Fase A-C: Bahasa Indonesia (bin) dan Pendidikan Pancasila (pp).
   KUNCI = kode mapel-FASE-nomor urut TP di js/data-tp-umum.js (bin-A-1..6, B-1..6, C-1..6; pp-A-1..5, B-1..6, C-1..6).
   JIKA urutan TP di data-tp-umum.js diubah, kunci di file ini harus ikut disesuaikan.
   Status: DRAF, belum diperiksa guru. Guru wajib mencocokkan dengan buku ajar madrasah dan KMA yang berlaku.
   Format sama dengan data-soal-mi.js:
     PG    : ['pg', level, soal, [jawaban BENAR, pengecoh1, pengecoh2, pengecoh3]]  (opsi diacak saat dipakai)
     Isian : ['is', level, soal, jawaban]
     Uraian: ['ur', level, soal, pedoman penskoran]
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const BARU = {
    // ===================== BAHASA INDONESIA FASE A =====================
    "bin-A-1": [
      P("L1", "Ketika guru sedang bercerita, sikap yang baik adalah ...", "mendengarkan dengan tenang", "berbicara sendiri", "bermain di tempat duduk", "menutup telinga"),
      P("L1", "Ibu berpesan, “Bawa payung karena hari akan hujan.” Barang yang harus dibawa adalah ...", "payung", "topi", "tas", "sepatu"),
      P("L2", "Guru berpesan, “Letakkan bukumu di atas meja.” Buku harus diletakkan di ...", "atas meja", "bawah meja", "dalam tas", "samping pintu"),
      I("L1", "Orang atau hewan yang berperan dalam sebuah cerita disebut ....", "tokoh"),
      U("L2", "Ceritakan kembali dengan kalimatmu sendiri satu cerita yang pernah kamu dengar!", "Jawaban memuat tokoh dan kejadian utama secara runtut. Skor: tokoh 1, kejadian awal-tengah-akhir masing-masing 1, kalimat jelas 1.")
    ],
    "bin-A-2": [
      P("L1", "Huruf pertama pada kata “bola” adalah ...", "b", "o", "l", "a"),
      P("L1", "Kata “buku” jika dipisah menjadi suku kata adalah ...", "bu-ku", "b-uku", "buk-u", "bu-k-u"),
      P("L1", "Gabungan suku kata “ma” dan “kan” membentuk kata ...", "makan", "kanma", "mana", "minum"),
      P("L1", "Kalimat sederhana yang benar adalah ...", "Ibu memasak nasi.", "Memasak ibu.", "Nasi ibu.", "Ibu nasi."),
      I("L1", "Kalimat “Ibu memasak nasi” terdiri atas .... kata.", "3"),
      U("L2", "Tulislah tiga kata yang diawali huruf “m”!", "Contoh: meja, makan, mata, mobil. Skor 1 untuk tiap kata benar yang diawali huruf m.")
    ],
    "bin-A-3": [
      P("L1", "Adi pergi ke pasar bersama ibu. Adi pergi bersama ...", "ibu", "ayah", "kakak", "adik"),
      P("L1", "Ibu membeli sayur dan buah di pasar. Ibu membeli ...", "sayur dan buah", "baju dan sepatu", "buku dan pensil", "ikan dan daging"),
      P("L2", "Rina menyiram bunga di taman setiap pagi. Rina menyiram bunga pada waktu ...", "pagi", "siang", "sore", "malam"),
      P("L2", "Budi memelihara kucing yang suka tidur. Hewan peliharaan Budi adalah ...", "kucing", "ayam", "burung", "ikan"),
      I("L1", "Dodi membaca buku di perpustakaan. Dodi membaca di ....", "perpustakaan"),
      U("L2", "Bacalah: “Sari membantu ibu menyapu halaman. Setelah itu Sari mandi.” Tuliskan dua kegiatan Sari!", "Kegiatan Sari: menyapu halaman (membantu ibu) dan mandi. Skor 2 per kegiatan.")
    ],
    "bin-A-4": [
      P("L1", "Ketika bertemu guru di pagi hari, kita mengucapkan ...", "Selamat pagi, Bu", "Hai", "Halo, kamu", "Pergi dulu"),
      P("L1", "Ketika menerima hadiah dari teman, kita mengucapkan ...", "terima kasih", "maaf", "permisi", "tolong"),
      P("L1", "Kalimat yang santun untuk meminta tolong adalah ...", "Tolong ambilkan buku itu, ya.", "Ambil bukunya!", "Cepat ambil buku itu!", "Buku itu ambil sana."),
      P("L1", "Ketika lewat di depan orang yang lebih tua, kita mengucapkan ...", "permisi", "terima kasih", "selamat malam", "sampai jumpa"),
      I("L1", "Ketika berbuat salah, kita mengucapkan kata ....", "maaf"),
      U("L2", "Tuliskan tiga kalimat untuk memperkenalkan dirimu (nama, umur, dan kelas)!", "Contoh: Namaku Ani. Umurku tujuh tahun. Aku kelas satu. Skor: tiap kalimat benar dan sopan 1, kelancaran 1.")
    ],
    "bin-A-5": [
      P("L1", "Kalimat yang penulisannya benar adalah ...", "Ayah membaca koran.", "ayah membaca koran.", "Ayah membaca koran", "Ayah membaca Koran."),
      P("L1", "Awal kalimat ditulis dengan huruf ...", "kapital", "kecil", "miring", "tebal"),
      P("L1", "Akhir kalimat berita ditandai dengan tanda ...", "titik (.)", "koma (,)", "tanya (?)", "seru (!)"),
      P("L1", "Huruf pertama nama orang ditulis dengan huruf ...", "kapital", "kecil", "angka", "tebal"),
      I("L1", "Akhir kalimat “Aku suka bermain bola” diberi tanda ....", "titik (.)"),
      U("L2", "Tulislah satu kalimat tentang kegiatanmu hari ini dengan huruf kapital dan tanda titik yang benar!", "Skor: kalimat bermakna 1, huruf kapital di awal 1, tanda titik di akhir 1, ejaan kata benar 1.")
    ],
    "bin-A-6": [
      P("L1", "Susunan kata yang benar menjadi kalimat dari “makan, nasi, adik” adalah ...", "Adik makan nasi.", "Nasi adik makan.", "Makan nasi adik.", "Adik nasi makan."),
      P("L1", "Kata yang cocok: “... mengeong di depan pintu.”", "Kucing", "Ayam", "Sapi", "Bebek"),
      P("L1", "Kata yang cocok: “Ibu memasak di ....”", "dapur", "kamar mandi", "kebun", "halaman sekolah"),
      P("L2", "Kalimat yang lengkap (ada pelaku dan kegiatan) adalah ...", "Adik menendang bola.", "Menendang bola", "Adik dan bola", "Bola yang besar"),
      I("L1", "Susunlah menjadi kalimat: minum, Rani, susu → ....", "Rani minum susu."),
      U("L2", "Tuliskan dua kalimat tentang kegiatan keluargamu di rumah!", "Skor: tiap kalimat lengkap dan sesuai topik 2 (huruf kapital dan tanda titik benar).")
    ],

    // ===================== BAHASA INDONESIA FASE B =====================
    "bin-B-1": [
      P("L1", "Pengumuman: “Besok siswa kelas 3 membawa sapu dan pel untuk kerja bakti.” Yang dibawa siswa kelas 3 adalah ...", "sapu dan pel", "buku dan pensil", "bola dan tali", "tas dan botol minum"),
      P("L2", "Informasi pokok dari pengumuman tersebut adalah ...", "kerja bakti kelas 3 besok", "libur sekolah", "lomba lari", "rapat guru"),
      P("L1", "Kata tanya untuk menanyakan waktu kejadian adalah ...", "kapan", "siapa", "di mana", "mengapa"),
      P("L1", "Kata tanya untuk menanyakan sebab adalah ...", "mengapa", "kapan", "siapa", "berapa"),
      I("L1", "Kata tanya untuk menanyakan tempat adalah ....", "di mana"),
      U("L2", "Dengarkan dongeng yang dibacakan gurumu, lalu tuliskan tokoh dan pesan moralnya!", "Jawaban menyebut tokoh utama dan pesan moral yang sesuai isi dongeng. Skor: tokoh 2, pesan moral 2.")
    ],
    "bin-B-2": [
      P("L1", "Gagasan utama sebuah paragraf disebut ...", "ide pokok", "judul", "tanda baca", "kosakata"),
      P("L2", "“Kucing adalah hewan peliharaan yang suka makan ikan dan tidur.” Ide pokok kalimat tersebut adalah ...", "kebiasaan kucing peliharaan", "cara memandikan kucing", "jenis-jenis ikan", "rumah kucing"),
      P("L1", "Kalimat yang memuat gagasan pokok paragraf disebut kalimat ...", "utama", "penjelas", "tanya", "seru"),
      P("L2", "“Hujan turun sejak pagi. Jalan menjadi becek. Banyak orang memakai payung.” Informasi yang sesuai bacaan adalah ...", "banyak orang memakai payung", "hujan turun malam hari", "jalan menjadi kering", "tidak ada yang membawa payung"),
      I("L1", "Kalimat yang menjelaskan kalimat utama disebut kalimat ....", "penjelas"),
      U("L2", "Tulislah satu kalimat utama dan dua kalimat penjelas tentang topik “sekolahku”!", "Skor: kalimat utama sesuai topik 2, tiap kalimat penjelas yang mendukung 1, ejaan dan tanda baca 1 (maks. 5).")
    ],
    "bin-B-3": [
      P("L1", "Teks yang menceritakan rangkaian peristiwa dengan tokoh disebut teks ...", "narasi", "deskripsi", "prosedur", "pengumuman"),
      P("L1", "Teks yang menggambarkan ciri-ciri suatu benda atau tempat disebut teks ...", "deskripsi", "narasi", "prosedur", "dongeng"),
      P("L1", "Teks langkah-langkah membuat teh manis termasuk teks ...", "prosedur", "narasi", "deskripsi", "puisi"),
      P("L2", "Ciri teks prosedur adalah ...", "berisi langkah-langkah yang berurutan", "berisi tokoh dan alur cerita", "menggambarkan ciri benda", "berisi pendapat penulis"),
      I("L1", "Teks yang menggambarkan keindahan pantai termasuk teks ....", "deskripsi"),
      U("L2", "Jelaskan perbedaan teks narasi dan teks deskripsi!", "Narasi menceritakan rangkaian peristiwa dengan tokoh dan alur; deskripsi menggambarkan ciri/keadaan suatu objek. Skor: ciri narasi 2, ciri deskripsi 2.")
    ],
    "bin-B-4": [
      P("L1", "Urutan yang tepat saat menceritakan kembali sebuah cerita adalah ...", "awal, tengah, akhir", "akhir, awal, tengah", "tengah, akhir, awal", "acak"),
      P("L2", "Kalimat pendapat yang santun adalah ...", "Menurut saya, kita sebaiknya menjaga kebersihan kelas.", "Kamu salah semua!", "Aku tidak mau dengar pendapatmu.", "Itu ide yang bodoh."),
      P("L1", "Hal penting saat berbicara di depan kelas adalah ...", "suara jelas dan menghadap pendengar", "menunduk dan berbisik", "membelakangi teman", "berbicara sambil bermain"),
      P("L1", "Kata penghubung urutan yang tepat adalah pertama, kedua, kemudian, dan ...", "akhirnya", "tetapi", "karena", "atau"),
      I("L1", "Kata “akhirnya” dipakai untuk menandai bagian .... cerita.", "akhir"),
      U("L2", "Ceritakan kegiatan liburanmu dalam empat kalimat yang runtut!", "Skor: empat kalimat runtut dan sesuai topik masing-masing 1; penggunaan kata penghubung urutan menjadi nilai tambahan.")
    ],
    "bin-B-5": [
      P("L1", "Tanda baca di akhir kalimat tanya adalah ...", "?", ".", "!", ","),
      P("L2", "Kalimat yang penulisannya benar adalah ...", "Ibu membeli apel, jeruk, dan mangga.", "ibu membeli apel, jeruk, dan mangga.", "Ibu Membeli Apel, Jeruk, dan Mangga.", "Ibu membeli apel, jeruk, dan mangga?"),
      P("L1", "Tanda seru dipakai pada kalimat ...", "perintah atau seruan", "pertanyaan", "berita biasa", "pembuka surat"),
      P("L1", "Nama kota harus diawali dengan huruf ...", "kapital", "kecil", "miring", "angka"),
      I("L2", "Tanda baca untuk memisahkan rincian benda dalam kalimat adalah ....", "koma (,)"),
      U("L2", "Tulislah satu paragraf tiga kalimat tentang hewan kesukaanmu! Perhatikan huruf kapital dan tanda baca.", "Skor: isi sesuai topik 2, huruf kapital 1, tanda baca 1, tiga kalimat runtut 1.")
    ],
    "bin-B-6": [
      P("L1", "Sinonim (persamaan) kata “pintar” adalah ...", "pandai", "bodoh", "malas", "rajin"),
      P("L1", "Antonim (lawan kata) “tinggi” adalah ...", "rendah", "besar", "panjang", "jauh"),
      P("L1", "Antonim (lawan kata) “panas” adalah ...", "dingin", "terik", "gerah", "api"),
      P("L1", "Kata tanya untuk menanyakan orang adalah ...", "siapa", "apa", "kapan", "berapa"),
      I("L1", "Antonim dari kata “rajin” adalah ....", "malas"),
      U("L2", "Tuliskan tiga pasang kata yang berlawanan (antonim)!", "Contoh: besar-kecil, naik-turun, siang-malam. Skor 1 tiap pasangan benar, maks. 3 (nilai tambahan 1 untuk ejaan benar).")
    ],

    // ===================== BAHASA INDONESIA FASE C =====================
    "bin-C-1": [
      P("L1", "Berita: “Warga bergotong royong membersihkan sungai pada hari Minggu pagi.” Unsur waktu pada berita tersebut adalah ...", "Minggu pagi", "warga", "sungai", "bergotong royong"),
      P("L1", "Unsur tempat pada berita tersebut adalah ...", "sungai", "Minggu pagi", "warga", "membersihkan"),
      P("L2", "Kesimpulan yang tepat dari berita tersebut adalah ...", "warga peduli kebersihan lingkungan", "warga tidak suka bekerja", "sungai dilarang dibersihkan", "kegiatan dilakukan malam hari"),
      P("L1", "Saat menyimak wawancara, hal yang perlu dicatat adalah ...", "pertanyaan dan jawaban yang penting", "hanya nama pembawa acara", "warna baju narasumber", "jumlah penonton"),
      I("L1", "Pertanyaan “mengapa” digunakan untuk menanyakan ... (sebab/tempat/waktu).", "sebab"),
      U("L2", "Tulislah kesimpulan dari pidato berikut: “Kita harus menjaga kebersihan sekolah agar nyaman belajar.”", "Kesimpulan: menjaga kebersihan sekolah membuat kegiatan belajar nyaman. Skor: inti pesan 2, kalimat sendiri yang runtut 2.")
    ],
    "bin-C-2": [
      P("L1", "Pernyataan yang merupakan fakta adalah ...", "Air membeku pada suhu 0 derajat Celsius.", "Bakso adalah makanan paling enak.", "Hujan membuat suasana menyenangkan.", "Pelajaran olahraga paling seru."),
      P("L1", "Pernyataan yang merupakan opini adalah ...", "Bakso adalah makanan paling enak.", "Matahari terbit dari timur.", "Ikan hidup di air.", "Satu minggu terdiri atas tujuh hari."),
      P("L1", "Fakta adalah pernyataan yang ...", "dapat dibuktikan kebenarannya", "berdasarkan perasaan", "tidak dapat dibuktikan", "selalu memakai kata “menurutku”"),
      P("L1", "Gagasan utama sebuah bacaan adalah ...", "inti yang dibahas dalam bacaan", "kalimat pertama saja", "nama penulis", "judul tambahan"),
      I("L1", "Pernyataan yang berisi pendapat pribadi disebut ....", "opini"),
      U("L2", "Tuliskan satu fakta dan satu opini tentang sekolahmu!", "Fakta dapat dibuktikan (mis. sekolah memiliki lapangan); opini berisi penilaian pribadi (mis. sekolahku paling bagus). Skor: fakta 2, opini 2.")
    ],
    "bin-C-3": [
      P("L1", "Orang atau hewan yang berperan dalam cerita disebut ...", "tokoh", "latar", "alur", "amanat"),
      P("L1", "Tempat dan waktu terjadinya peristiwa dalam cerita disebut ...", "latar", "tokoh", "alur", "tema"),
      P("L1", "Rangkaian peristiwa dalam cerita disebut ...", "alur", "amanat", "latar", "judul"),
      P("L1", "Pesan yang ingin disampaikan pengarang kepada pembaca disebut ...", "amanat", "latar", "tokoh", "alur"),
      I("L2", "Sifat atau karakter tokoh dalam cerita disebut ....", "watak (perwatakan)"),
      U("L2", "Pilih satu cerita yang pernah kamu baca, lalu sebutkan tokoh, latar, dan amanatnya!", "Jawaban sesuai cerita yang dipilih. Skor: tokoh 1, latar 1, amanat 2.")
    ],
    "bin-C-4": [
      P("L1", "Sikap yang baik saat orang lain berbicara dalam diskusi adalah ...", "mendengarkan dan menunggu giliran", "memotong pembicaraan", "bermain gawai", "tertawa mengejek"),
      P("L1", "Orang yang memimpin jalannya diskusi disebut ...", "moderator", "notulis", "peserta", "penonton"),
      P("L1", "Orang yang mencatat hasil diskusi disebut ...", "notulis", "moderator", "penanya", "juri"),
      P("L2", "Hal yang perlu disiapkan sebelum presentasi adalah ...", "bahan dan urutan penyampaian", "hanya baju baru", "hadiah untuk teman", "tempat duduk saja"),
      I("L1", "Kesimpulan diskusi disampaikan pada bagian .... diskusi.", "akhir"),
      U("L2", "Jelaskan tiga langkah menyampaikan presentasi yang baik!", "Contoh: menyiapkan bahan, berbicara jelas dan runtut, menjawab pertanyaan dengan santun. Skor 2 per langkah yang tepat (maks. 4 + 1 kejelasan).")
    ],
    "bin-C-5": [
      P("L1", "Surat yang ditulis untuk teman atau keluarga disebut surat ...", "pribadi", "dinas", "undangan", "edaran"),
      P("L1", "Teks yang menggambarkan keadaan suatu tempat disebut teks ...", "deskripsi", "narasi", "prosedur", "pengumuman"),
      P("L1", "Judul sebuah teks sebaiknya ...", "singkat dan sesuai isi", "sangat panjang", "tidak berkaitan dengan isi", "dikosongkan"),
      P("L1", "Teks yang menceritakan pengalaman pribadi disebut teks ...", "narasi", "deskripsi", "prosedur", "puisi"),
      I("L1", "Bagian akhir surat pribadi berupa salam ....", "penutup"),
      U("L3", "Tulislah surat pribadi singkat kepada temanmu (tempat dan tanggal, salam pembuka, isi, salam penutup, nama)!", "Skor: tempat dan tanggal 1, salam pembuka 1, isi sesuai tujuan 2, salam penutup dan nama 1, ejaan dan tanda baca 1.")
    ],
    "bin-C-6": [
      P("L1", "Kata baku untuk tempat menjual obat adalah ...", "apotek", "apotik", "afotek", "apothek"),
      P("L2", "Kata baku untuk kegiatan melaksanakan keterampilan secara nyata adalah ...", "praktik", "praktek", "prakteks", "praktic"),
      P("L1", "Kata “tulis” diberi imbuhan me- menjadi ...", "menulis", "mentulis", "memtulis", "metulis"),
      P("L1", "Kata “jalan” diberi imbuhan ber- menjadi ...", "berjalan", "menjalan", "terjalan", "dijalan"),
      I("L1", "Imbuhan pada kata “dimakan” adalah ....", "di-"),
      U("L2", "Perbaikilah kalimat ini agar sesuai ejaan: “dia pergi kesekolah naik sepeda”", "Dia pergi ke sekolah naik sepeda. Skor: huruf kapital 1, “ke sekolah” dipisah 2, tanda titik 1.")
    ],

    // ===================== PENDIDIKAN PANCASILA FASE A =====================
    "pp-A-1": [
      P("L1", "Jumlah sila dalam Pancasila adalah ...", "lima", "empat", "enam", "tujuh"),
      P("L1", "Sila pertama Pancasila berbunyi ...", "Ketuhanan Yang Maha Esa", "Kemanusiaan yang adil dan beradab", "Persatuan Indonesia", "Keadilan sosial bagi seluruh rakyat Indonesia"),
      P("L1", "Lambang negara Indonesia adalah ...", "Garuda Pancasila", "pohon beringin", "bintang", "padi dan kapas"),
      P("L1", "Sila ketiga Pancasila berbunyi ...", "Persatuan Indonesia", "Ketuhanan Yang Maha Esa", "Kemanusiaan yang adil dan beradab", "Keadilan sosial bagi seluruh rakyat Indonesia"),
      I("L1", "Sila kelima: “Keadilan sosial bagi ....”", "seluruh rakyat Indonesia"),
      U("L2", "Tuliskan bunyi sila pertama sampai sila ketiga Pancasila!", "1. Ketuhanan Yang Maha Esa; 2. Kemanusiaan yang adil dan beradab; 3. Persatuan Indonesia. Skor 1 tiap sila benar.")
    ],
    "pp-A-2": [
      P("L1", "Berdoa sebelum belajar sesuai dengan sila ke ...", "pertama", "kedua", "ketiga", "keempat"),
      P("L1", "Menolong teman yang jatuh mencerminkan sila ...", "Kemanusiaan yang adil dan beradab", "Persatuan Indonesia", "Ketuhanan Yang Maha Esa", "Keadilan sosial bagi seluruh rakyat Indonesia"),
      P("L1", "Mengerjakan piket kelas bersama-sama menunjukkan sikap ...", "gotong royong", "egois", "malas", "curang"),
      P("L2", "Membagi tugas piket secara adil mencerminkan sila ke ...", "kelima", "pertama", "ketiga", "keempat"),
      I("L1", "Beribadah sesuai agama masing-masing mencerminkan sila ke-....", "pertama (satu)"),
      U("L2", "Tuliskan dua contoh perilaku sesuai Pancasila di sekolah!", "Contoh: berdoa sebelum belajar, menolong teman, bermain bersama, membagi tugas piket. Skor 2 tiap contoh yang tepat.")
    ],
    "pp-A-3": [
      P("L1", "Aturan di sekolah dibuat agar ...", "kegiatan tertib dan aman", "semua orang bebas berbuat apa saja", "murid merasa takut", "guru senang saja"),
      P("L1", "Contoh kewajiban murid di kelas adalah ...", "menjaga kebersihan kelas", "tidur saat pelajaran", "membuang sampah sembarangan", "datang terlambat"),
      P("L1", "Contoh hak murid di sekolah adalah ...", "mendapat pelajaran", "menyontek", "mengganggu teman", "membolos"),
      P("L1", "Aturan di rumah yang baik adalah ...", "merapikan mainan setelah bermain", "membiarkan mainan berserakan", "berteriak di dalam rumah", "pulang larut malam"),
      I("L1", "Tugas yang harus dilaksanakan disebut ....", "kewajiban"),
      U("L2", "Tuliskan dua aturan di kelasmu beserta alasannya!", "Contoh: tidak berlarian di kelas agar tidak jatuh; membuang sampah pada tempatnya agar bersih. Skor: tiap aturan dan alasan yang tepat 2.")
    ],
    "pp-A-4": [
      P("L1", "Jika temanmu berbeda suku, kita sebaiknya ...", "tetap berteman dengan baik", "menjauhinya", "mengejeknya", "tidak mengajaknya bermain"),
      P("L1", "Perbedaan bahasa daerah termasuk ... bangsa kita.", "keberagaman", "kesalahan", "masalah", "larangan"),
      P("L1", "Sikap menghargai perbedaan adalah ...", "bermain bersama dengan rukun", "mengejek logat teman", "memilih-milih teman", "bertengkar"),
      P("L1", "Semboyan negara Indonesia adalah ...", "Bhinneka Tunggal Ika", "Merdeka atau mati", "Tut Wuri Handayani", "Garuda Pancasila"),
      I("L1", "Bhinneka Tunggal Ika berarti berbeda-beda tetapi tetap ....", "satu"),
      U("L2", "Mengapa kita harus hidup rukun walaupun berbeda?", "Karena perbedaan adalah kekayaan bangsa; rukun membuat hidup aman, damai, dan saling membantu. Skor: alasan 2, contoh 2.")
    ],
    "pp-A-5": [
      P("L1", "Bendera negara Indonesia berwarna ...", "merah dan putih", "biru dan putih", "merah dan biru", "hijau dan putih"),
      P("L1", "Bahasa persatuan bangsa Indonesia adalah bahasa ...", "Indonesia", "Jawa", "Inggris", "Arab"),
      P("L1", "Lagu kebangsaan negara kita adalah ...", "Indonesia Raya", "Garuda Pancasila", "Halo-Halo Bandung", "Padamu Negeri"),
      P("L1", "Warna pada bagian atas bendera Indonesia adalah ...", "merah", "putih", "biru", "kuning"),
      I("L1", "Bendera Indonesia dinamakan Sang .... Putih.", "Merah"),
      U("L2", "Tuliskan dua sikap yang menunjukkan penghormatan kepada bendera!", "Contoh: berdiri tegak dan hormat saat upacara, tidak merobek atau mengotori bendera. Skor 2 tiap sikap yang tepat.")
    ],

    // ===================== PENDIDIKAN PANCASILA FASE B =====================
    "pp-B-1": [
      P("L1", "Lambang sila pertama Pancasila adalah ...", "bintang", "rantai", "pohon beringin", "kepala banteng"),
      P("L1", "Lambang sila kedua Pancasila adalah ...", "rantai", "bintang", "padi dan kapas", "pohon beringin"),
      P("L1", "Lambang sila ketiga Pancasila adalah ...", "pohon beringin", "kepala banteng", "rantai", "padi dan kapas"),
      P("L1", "Lambang sila keempat Pancasila adalah ...", "kepala banteng", "pohon beringin", "bintang", "rantai"),
      I("L1", "Lambang sila kelima Pancasila adalah .... dan kapas.", "padi"),
      U("L2", "Jelaskan makna lambang rantai pada sila kedua!", "Rantai melambangkan hubungan manusia yang saling membantu dan menghargai (kemanusiaan). Skor: makna 3, kalimat jelas 1.")
    ],
    "pp-B-2": [
      P("L1", "Memutuskan sesuatu secara bersama-sama untuk mencapai mufakat disebut ...", "musyawarah", "paksaan", "undian saja", "perintah"),
      P("L1", "Cara yang tepat memilih ketua kelas adalah dengan ...", "musyawarah", "memaksa teman", "marah-marah", "berkelahi"),
      P("L1", "Gotong royong adalah ...", "bekerja bersama-sama", "bekerja sendiri", "tidak peduli", "menunggu perintah"),
      P("L1", "Contoh gotong royong adalah ...", "kerja bakti membersihkan lingkungan", "membaca sendirian", "bermain gawai", "tidur siang"),
      I("L2", "Hasil musyawarah harus dihormati dan ....", "dilaksanakan"),
      U("L2", "Jelaskan manfaat gotong royong bagi lingkungan sekitarmu!", "Pekerjaan lebih ringan dan cepat, mempererat persaudaraan, lingkungan menjadi bersih dan rukun. Skor: tiap manfaat yang tepat 2.")
    ],
    "pp-B-3": [
      P("L1", "Hak adalah sesuatu yang ...", "seharusnya kita terima", "harus kita kerjakan", "dilarang oleh aturan", "menjadi hukuman"),
      P("L1", "Kewajiban adalah sesuatu yang ...", "harus kita kerjakan", "seharusnya kita terima", "boleh ditinggalkan", "diberikan sebagai hadiah"),
      P("L1", "Contoh kewajiban siswa adalah ...", "menaati tata tertib sekolah", "membolos", "mengotori kelas", "meminta hadiah"),
      P("L1", "Tata tertib dibuat agar ...", "kehidupan di sekolah tertib dan nyaman", "semua orang dihukum", "kegiatan belajar terhenti", "siswa merasa takut"),
      I("L2", "Hak memperoleh pendidikan dimiliki oleh .... anak.", "setiap (semua)"),
      U("L2", "Sebutkan dua hak dan dua kewajiban murid di sekolah!", "Hak: mendapat pelajaran, mendapat perlakuan baik, dll. Kewajiban: menaati tata tertib, menjaga kebersihan, dll. Skor 1 tiap jawaban yang tepat.")
    ],
    "pp-B-4": [
      P("L1", "Indonesia memiliki banyak suku, budaya, dan agama. Keadaan ini disebut ...", "keberagaman", "keseragaman", "perpecahan", "keterbatasan"),
      P("L1", "Toleransi adalah sikap ...", "menghargai perbedaan", "memaksakan pendapat", "menjauhi orang lain", "menghina orang lain"),
      P("L1", "Contoh toleransi beragama adalah ...", "tidak mengganggu teman yang sedang beribadah", "mengejek ibadah teman", "melarang teman beribadah", "memaksa teman pindah agama"),
      P("L1", "Pakaian adat dan tarian daerah merupakan contoh ...", "kebudayaan daerah", "aturan sekolah", "hewan langka", "peralatan olahraga"),
      I("L1", "Sikap saling menghormati perbedaan disebut ....", "toleransi"),
      U("L2", "Mengapa keberagaman menjadi kekayaan bangsa Indonesia?", "Karena beragam budaya, bahasa, dan adat memperkaya kehidupan serta bisa saling melengkapi bila dijaga dengan toleransi. Skor: alasan 2, contoh 2.")
    ],
    "pp-B-5": [
      P("L1", "Indonesia adalah negara ...", "kepulauan", "benua", "gurun", "daratan saja"),
      P("L1", "Persatuan berarti ...", "bersatu walaupun berbeda-beda", "berjalan sendiri-sendiri", "bertengkar", "memisahkan diri"),
      P("L1", "Contoh menjaga persatuan di sekolah adalah ...", "bergotong royong dan tidak membeda-bedakan teman", "memaksakan kehendak", "membeda-bedakan teman", "bertengkar"),
      P("L2", "Sumpah Pemuda diikrarkan pada tanggal ...", "28 Oktober 1928", "17 Agustus 1945", "1 Juni 1945", "2 Mei 1926"),
      I("L1", "Satu tanah air, satu bangsa, dan satu bahasa, yaitu ....", "Indonesia"),
      U("L2", "Tuliskan dua cara menjaga persatuan di sekolah!", "Contoh: berteman dengan semua murid, bekerja sama dalam piket, menyelesaikan masalah dengan musyawarah. Skor 2 tiap cara yang tepat.")
    ],
    "pp-B-6": [
      P("L1", "Hari Kemerdekaan Republik Indonesia diperingati setiap tanggal ...", "17 Agustus", "28 Oktober", "2 Mei", "10 November"),
      P("L1", "Bersikap sempurna saat upacara bendera menunjukkan sikap ...", "hormat kepada bangsa dan negara", "malas", "bosan", "marah"),
      P("L1", "Merawat fasilitas umum menunjukkan sikap ...", "cinta tanah air", "malas", "boros", "egois"),
      P("L1", "Menggunakan produk dalam negeri adalah contoh ...", "cinta tanah air", "pemborosan", "ketidakpedulian", "perpecahan"),
      I("L1", "Orang yang berjuang merebut dan mempertahankan kemerdekaan disebut ....", "pahlawan"),
      U("L2", "Tuliskan tiga cara mencintai tanah air sebagai murid!", "Contoh: belajar tekun, menjaga kebersihan lingkungan, menghormati bendera, memakai produk dalam negeri. Skor 1 tiap cara, maks. 3 + 1 kejelasan.")
    ],

    // ===================== PENDIDIKAN PANCASILA FASE C =====================
    "pp-C-1": [
      P("L1", "Sila keempat Pancasila berbunyi ...", "Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan", "Persatuan Indonesia", "Kemanusiaan yang adil dan beradab", "Keadilan sosial bagi seluruh rakyat Indonesia"),
      P("L2", "Pancasila ditetapkan sebagai dasar negara pada tanggal ...", "18 Agustus 1945", "1 Juni 1945", "17 Agustus 1945", "28 Oktober 1928"),
      P("L2", "Menghargai pendapat teman dalam diskusi kelas mencerminkan sila ke ...", "empat", "satu", "dua", "lima"),
      P("L1", "Bersikap adil kepada semua teman mencerminkan sila ...", "Keadilan sosial bagi seluruh rakyat Indonesia", "Ketuhanan Yang Maha Esa", "Persatuan Indonesia", "Kerakyatan yang dipimpin oleh hikmat kebijaksanaan"),
      I("L1", "Pancasila merupakan dasar dan ideologi .... Indonesia.", "negara"),
      U("L3", "Jelaskan hubungan sila pertama dengan sila kedua dalam kehidupan sehari-hari!", "Orang yang bertakwa kepada Tuhan akan menghargai dan menyayangi sesama manusia. Skor: hubungan kedua sila 2, contoh perilaku 2.")
    ],
    "pp-C-2": [
      P("L1", "Contoh kewajiban warga negara adalah ...", "membayar pajak", "mendapat pelayanan kesehatan", "bebas beribadah", "memperoleh pekerjaan"),
      P("L1", "Contoh hak warga negara adalah ...", "mendapat pendidikan", "membayar pajak", "menaati hukum", "membela negara"),
      P("L2", "Hak dan kewajiban harus dijalankan secara ...", "seimbang", "memilih salah satu", "diabaikan", "dipaksakan"),
      P("L1", "Menaati peraturan lalu lintas merupakan ...", "kewajiban warga negara", "hak istimewa", "pilihan bebas", "hukuman"),
      I("L1", "Ikut serta dalam pembelaan negara adalah .... setiap warga negara.", "kewajiban"),
      U("L3", "Jelaskan mengapa hak dan kewajiban harus seimbang, lalu berikan satu contoh!", "Jika hanya menuntut hak tanpa menjalankan kewajiban akan timbul ketidakadilan. Contoh: hak belajar disertai kewajiban menaati tata tertib. Skor: alasan 2, contoh 2.")
    ],
    "pp-C-3": [
      P("L1", "Kepala negara sekaligus kepala pemerintahan di Indonesia adalah ...", "Presiden", "Ketua DPR", "Menteri", "Gubernur"),
      P("L2", "Lembaga yang membuat undang-undang bersama Presiden adalah ...", "DPR", "Mahkamah Agung", "BPK", "KPK"),
      P("L1", "Salah satu asas pemilu adalah ...", "rahasia", "paksaan", "berbayar", "tertutup"),
      P("L1", "Pemilu di Indonesia diadakan setiap ... tahun.", "lima", "tiga", "sepuluh", "dua"),
      I("L1", "Singkatan dari pemilihan umum adalah ....", "pemilu"),
      U("L3", "Jelaskan pentingnya menggunakan hak pilih secara jujur dan bebas!", "Pemimpin yang terpilih mewakili suara rakyat; pilihan jujur dan bebas membuat pemilu adil dan demokratis. Skor: alasan 3, kalimat jelas 1.")
    ],
    "pp-C-4": [
      P("L1", "Perbedaan pendapat sebaiknya diselesaikan dengan ...", "musyawarah", "kekerasan", "diam saja", "mengancam"),
      P("L1", "Contoh sikap yang mempersatukan adalah ...", "bekerja sama dengan teman berbeda suku", "mengejek teman", "memisahkan kelompok", "bertengkar"),
      P("L2", "Semboyan Bhinneka Tunggal Ika tertulis pada ...", "pita yang dicengkeram burung Garuda", "perisai di dada Garuda", "kepala burung Garuda", "bendera merah putih"),
      P("L2", "Jika dikelola dengan baik, keberagaman dapat menjadi ...", "kekuatan bangsa", "penyebab perpecahan", "beban negara", "masalah besar"),
      I("L1", "Penyelesaian masalah bersama melalui diskusi untuk mencapai mufakat disebut ....", "musyawarah"),
      U("L2", "Berikan contoh sikap menyikapi perbedaan pendapat di lingkungan sekolah!", "Contoh: mendengarkan pendapat teman, mencari kesepakatan lewat musyawarah, tidak memaksakan kehendak. Skor: dua sikap yang tepat 2 tiap sikap.")
    ],
    "pp-C-5": [
      P("L1", "Indonesia terletak di antara dua benua dan dua samudra, yaitu ...", "Asia dan Australia; Hindia dan Pasifik", "Afrika dan Eropa; Atlantik dan Arktik", "Amerika dan Asia; Pasifik dan Atlantik", "Eropa dan Australia; Hindia dan Arktik"),
      P("L1", "ASEAN adalah singkatan dari ...", "Association of Southeast Asian Nations", "Asian Sports and Education Network", "Association of South Atlantic Nations", "Alliance of Eastern Asian Nations"),
      P("L2", "ASEAN didirikan pada tahun ...", "1967", "1945", "1955", "1975"),
      P("L1", "Negara anggota ASEAN selain Indonesia adalah ...", "Malaysia", "Jepang", "India", "Australia"),
      I("L1", "Karena dilalui garis khatulistiwa, Indonesia beriklim ....", "tropis"),
      U("L2", "Sebutkan dua manfaat kerja sama antarnegara di ASEAN!", "Contoh: kerja sama ekonomi dan perdagangan, pertukaran budaya dan pendidikan, menjaga perdamaian kawasan. Skor 2 tiap manfaat.")
    ],
    "pp-C-6": [
      P("L1", "Contoh bela negara yang dapat dilakukan pelajar adalah ...", "belajar dengan tekun dan menaati aturan", "berkelahi dengan teman", "membuang sampah sembarangan", "membolos sekolah"),
      P("L1", "Bela negara adalah ...", "sikap dan tindakan untuk membela serta menjaga negara", "membenci negara lain", "bermain di sekolah", "menjual aset negara"),
      P("L2", "Menjaga kerukunan di lingkungan sekitar termasuk ...", "bela negara", "kegiatan ekonomi", "hiburan semata", "perbuatan sia-sia"),
      P("L2", "Ancaman terhadap persatuan bangsa adalah ...", "perpecahan karena perbedaan", "kerja bakti", "upacara bendera", "gotong royong"),
      I("L1", "Semangat cinta tanah air disebut ....", "nasionalisme"),
      U("L3", "Tuliskan tiga contoh bela negara yang dapat dilakukan murid di sekolah!", "Contoh: mengikuti upacara dengan khidmat, menjaga persatuan, belajar tekun, menjaga fasilitas sekolah. Skor 1 tiap contoh + 1 alasan.")
    ]
  };

  // Gabungkan ke bank utama; soal yang bunyinya sama tidak diulang.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(BARU[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;

/* ################ BAGIAN: data-soal-umum-2.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-umum-2.js
   Bank soal DRAF mapel umum MI Fase A-C: PJOK (pjok; A-1..5, B-1..5, C-1..5) dan IPAS (ipas; Fase B-1..8, C-1..8).
   KUNCI = kode mapel-FASE-nomor urut TP di js/data-tp-umum.js. Jika urutan TP berubah, kunci ikut disesuaikan.
   Status: DRAF, belum diperiksa guru. Guru wajib mencocokkan dengan buku ajar madrasah.
   Format sama dengan data-soal-mi.js (PG: jawaban benar di posisi pertama; opsi diacak saat dipakai).
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const BARU = {
    // ===================== PJOK FASE A =====================
    "pjok-A-1": [
      P("L1", "Berjalan, berlari, dan melompat termasuk gerak ...", "lokomotor", "nonlokomotor", "manipulatif", "statis"),
      P("L1", "Gerak berpindah tempat disebut gerak ...", "lokomotor", "nonlokomotor", "manipulatif", "diam"),
      P("L1", "Contoh gerak lokomotor adalah ...", "berlari", "membungkuk", "melempar bola", "menangkap bola"),
      P("L1", "Sebelum berolahraga, kita sebaiknya melakukan ...", "pemanasan", "tidur", "makan banyak", "mandi"),
      I("L1", "Berpindah tempat dengan cepat memakai kedua kaki disebut ....", "berlari"),
      U("L2", "Sebutkan tiga contoh gerak lokomotor!", "Contoh: berjalan, berlari, melompat, berjingkat, meloncat. Skor 1 tiap contoh benar + 1 kejelasan.")
    ],
    "pjok-A-2": [
      P("L1", "Gerak yang dilakukan tanpa berpindah tempat disebut gerak ...", "nonlokomotor", "lokomotor", "manipulatif", "berlari"),
      P("L1", "Contoh gerak nonlokomotor adalah ...", "membungkuk", "berlari", "melompat", "berjalan"),
      P("L1", "Memutar badan di tempat termasuk gerak ...", "nonlokomotor", "lokomotor", "manipulatif", "akrobatik"),
      P("L1", "Meregangkan kedua tangan ke atas termasuk gerak ...", "nonlokomotor", "lokomotor", "manipulatif", "berpindah"),
      I("L1", "Mengayunkan lengan di tempat termasuk gerak ....", "nonlokomotor"),
      U("L2", "Sebutkan tiga contoh gerak nonlokomotor!", "Contoh: membungkuk, meregang, memutar, mengayun, menekuk lutut. Skor 1 tiap contoh benar + 1 kejelasan.")
    ],
    "pjok-A-3": [
      P("L1", "Gerak melempar, menangkap, dan menendang bola disebut gerak ...", "manipulatif", "lokomotor", "nonlokomotor", "statis"),
      P("L1", "Bola yang dilempar teman sebaiknya ditangkap menggunakan ...", "kedua tangan", "kaki", "kepala", "punggung"),
      P("L1", "Anggota tubuh yang dipakai untuk menendang bola adalah ...", "kaki", "tangan", "kepala", "bahu"),
      P("L2", "Saat melempar bola kepada teman, kita harus memperhatikan ...", "arah dan sasaran", "warna bola", "baju teman", "jumlah penonton"),
      I("L1", "Menangkap bola menggunakan anggota tubuh ....", "tangan"),
      U("L2", "Jelaskan cara melempar bola kepada teman!", "Pegang bola dengan kuat, pandang sasaran, ayunkan lengan ke belakang lalu ke depan, lepaskan bola ke arah teman. Skor: 1 tiap langkah yang tepat (maks. 4).")
    ],
    "pjok-A-4": [
      P("L1", "Mencuci tangan sebaiknya memakai ...", "air bersih dan sabun", "air kotor", "tanah", "lap saja"),
      P("L1", "Menyikat gigi sebaiknya dilakukan minimal ... kali sehari.", "dua", "satu", "empat", "lima"),
      P("L1", "Makanan yang menyehatkan tubuh adalah ...", "sayur dan buah", "permen", "gorengan terus-menerus", "minuman manis"),
      P("L1", "Mandi yang baik dilakukan ...", "dua kali sehari", "seminggu sekali", "sebulan sekali", "tidak perlu"),
      I("L1", "Tidur yang cukup membuat tubuh menjadi ....", "sehat"),
      U("L2", "Sebutkan tiga cara menjaga kebersihan diri!", "Contoh: mandi, menyikat gigi, mencuci tangan, memotong kuku, memakai pakaian bersih. Skor 1 tiap cara + 1 kejelasan.")
    ],
    "pjok-A-5": [
      P("L1", "Jika kalah dalam permainan, sikap yang baik adalah ...", "menerima dengan lapang dada", "marah", "menyalahkan teman", "berhenti bermain"),
      P("L1", "Bermain dengan menaati aturan dan jujur disebut ...", "sportif", "curang", "egois", "malas"),
      P("L1", "Contoh kerja sama dalam permainan adalah ...", "saling membantu teman satu tim", "bermain sendiri", "merebut bola dari teman", "menghindari teman"),
      P("L1", "Saat bermain bergantian, kita harus ...", "sabar menunggu giliran", "marah", "berbuat curang", "pergi"),
      I("L1", "Sikap jujur dan menaati aturan permainan disebut ....", "sportif"),
      U("L2", "Tuliskan dua sikap yang harus ditunjukkan saat bermain bersama!", "Contoh: menaati aturan, bekerja sama, sabar menunggu giliran, jujur. Skor 2 tiap sikap yang tepat.")
    ],

    // ===================== PJOK FASE B =====================
    "pjok-B-1": [
      P("L1", "Permainan yang memakai bola kecil adalah ...", "kasti", "sepak bola", "bola voli", "bola basket"),
      P("L1", "Mengoper bola kepada teman harus ...", "tepat ke arah teman", "sekuat tenaga ke atas", "ke sembarang arah", "pelan ke lantai"),
      P("L1", "Menggiring bola pada permainan sepak bola dilakukan dengan ...", "kaki", "tangan", "kepala", "punggung"),
      P("L1", "Gerak dasar yang digunakan pada permainan bola adalah ...", "melempar, menangkap, dan menendang", "membaca dan menulis", "menggambar", "berbaris"),
      I("L2", "Memantulkan bola ke lantai berulang-ulang pada permainan bola basket disebut ....", "dribel (dribble)"),
      U("L2", "Jelaskan cara mengoper bola kepada teman dalam permainan bola!", "Pandang teman yang dituju, pegang bola dengan kuat, ayunkan lengan atau kaki, lepaskan bola ke arah teman. Skor 1 tiap langkah yang tepat (maks. 4).")
    ],
    "pjok-B-2": [
      P("L1", "Gerakan berguling ke depan disebut ...", "guling depan", "guling belakang", "kayang", "meroda"),
      P("L1", "Senam lantai dilakukan di atas ...", "matras", "pasir", "rumput basah", "aspal"),
      P("L1", "Gerak berirama dilakukan dengan mengikuti ...", "irama musik", "teriakan", "arah angin", "suara kendaraan"),
      P("L1", "Sebelum senam, kita harus melakukan ...", "pemanasan", "makan banyak", "tidur", "mandi"),
      I("L2", "Gerakan badan melengkung ke belakang dengan tangan dan kaki sebagai tumpuan disebut ....", "kayang"),
      U("L2", "Jelaskan urutan gerakan guling depan!", "Jongkok, kedua tangan menumpu di matras, kepala dimasukkan, punggung berguling, berdiri kembali. Skor 1 tiap langkah yang tepat (maks. 4).")
    ],
    "pjok-B-3": [
      P("L1", "Kemampuan melakukan aktivitas lama tanpa cepat lelah disebut ...", "daya tahan", "kelenturan", "kecepatan", "kelincahan"),
      P("L1", "Kemampuan menggerakkan sendi seluas-luasnya disebut ...", "kelenturan", "kekuatan", "daya tahan", "keseimbangan"),
      P("L1", "Berlari cepat pada jarak pendek menunjukkan komponen ...", "kecepatan", "kelenturan", "kekuatan", "kelincahan"),
      P("L1", "Mengangkat beban menunjukkan komponen ...", "kekuatan", "daya tahan", "kecepatan", "kelenturan"),
      I("L1", "Kemampuan mengubah arah dengan cepat disebut ....", "kelincahan"),
      U("L2", "Sebutkan tiga komponen kebugaran jasmani dan satu contoh aktivitasnya!", "Contoh: daya tahan (lari jarak jauh), kekuatan (push-up), kelenturan (peregangan), kecepatan, kelincahan. Skor: tiap komponen 1, satu contoh tepat 1.")
    ],
    "pjok-B-4": [
      P("L1", "Olahraga yang teratur membuat tubuh menjadi ...", "bugar", "lemas", "mudah sakit", "malas"),
      P("L1", "Makanan bergizi seimbang terdiri atas ...", "nasi, lauk, sayur, dan buah", "mi instan saja", "permen", "minuman bersoda"),
      P("L1", "Istirahat yang baik dilakukan dengan ...", "tidur malam yang cukup", "begadang", "bermain gawai sepanjang malam", "tidak tidur"),
      P("L1", "Minum air putih yang cukup bermanfaat untuk ...", "mencegah tubuh kekurangan cairan", "membuat lemas", "membuat sakit", "tidak ada manfaat"),
      I("L1", "Tubuh yang terawat dan bugar disebut tubuh yang ....", "sehat"),
      U("L2", "Tuliskan tiga kebiasaan hidup sehat yang kamu lakukan sehari-hari!", "Contoh: olahraga, makan sayur dan buah, tidur cukup, cuci tangan. Skor 1 tiap kebiasaan + 1 kejelasan.")
    ],
    "pjok-B-5": [
      P("L1", "Sikap jujur saat bermain adalah ...", "mengakui kesalahan sendiri", "menyembunyikan kesalahan", "menyalahkan teman", "berbuat curang"),
      P("L1", "Tanggung jawab setelah berolahraga adalah ...", "mengembalikan alat ke tempatnya", "meninggalkan alat di lapangan", "melempar alat", "merusak alat"),
      P("L1", "Kerja sama dalam lomba estafet ditunjukkan dengan ...", "mengoper tongkat tepat waktu", "berlari sendiri", "menolak bergiliran", "membuang tongkat"),
      P("L1", "Sikap kepada teman yang kurang mahir bermain adalah ...", "memberi semangat", "mengejek", "mengabaikan", "menertawakan"),
      I("L1", "Mengembalikan peralatan olahraga ke tempat semula menunjukkan sikap ....", "bertanggung jawab"),
      U("L2", "Jelaskan pentingnya kerja sama dalam permainan tim!", "Kerja sama membuat tim lebih kuat, tugas terbagi, dan kemenangan diraih bersama. Skor: alasan 2, contoh 2.")
    ],

    // ===================== PJOK FASE C =====================
    "pjok-C-1": [
      P("L1", "Jumlah pemain sepak bola dalam satu tim di lapangan adalah ... orang.", "11", "9", "7", "15"),
      P("L1", "Jumlah pemain bola voli dalam satu tim di lapangan adalah ... orang.", "6", "5", "9", "11"),
      P("L1", "Jumlah pemain bola basket dalam satu tim di lapangan adalah ... orang.", "5", "6", "7", "11"),
      P("L1", "Pada permainan bola voli, bola dipukul melewati ...", "net", "gawang", "ring", "tiang"),
      I("L1", "Sasaran pada permainan bola basket berupa lingkaran besi disebut ....", "ring"),
      U("L2", "Sebutkan dua aturan dasar permainan bola voli!", "Contoh: bola tidak boleh jatuh di lapangan sendiri, satu tim maksimal tiga kali sentuhan, bola harus melewati net. Skor 2 tiap aturan yang tepat.")
    ],
    "pjok-C-2": [
      P("L1", "Nomor lari jarak pendek pada atletik adalah ...", "lari 100 meter", "maraton", "lompat jauh", "lempar lembing"),
      P("L1", "Pada lompat jauh, tolakan dilakukan dengan ...", "satu kaki", "dua tangan", "kepala", "perut"),
      P("L1", "Lempar lembing termasuk nomor ...", "lempar", "lari", "lompat", "jalan"),
      P("L1", "Start pada lari jarak pendek dilakukan dengan sikap ...", "jongkok", "berdiri tegak", "duduk", "tiduran"),
      I("L1", "Pendaratan lompat jauh dilakukan di dalam ....", "bak pasir"),
      U("L2", "Jelaskan urutan gerakan lompat jauh!", "Awalan, tumpuan, melayang di udara, mendarat. Skor 1 tiap tahap yang disebut dan dijelaskan benar.")
    ],
    "pjok-C-3": [
      P("L1", "Gerakan senam yang melatih kelenturan badan adalah ...", "kayang", "berlari cepat", "melempar bola", "menendang bola"),
      P("L1", "Sikap akhir yang benar pada senam lantai adalah ...", "berdiri tegak dengan tangan lurus ke atas", "berlari", "membungkuk", "duduk"),
      P("L1", "Agar aman saat senam lantai, kita menggunakan ...", "matras dan pakaian olahraga", "lantai licin", "sepatu basah", "meja sebagai alas"),
      P("L1", "Senam irama dilakukan dengan iringan ...", "musik", "klakson", "hujan", "teriakan"),
      I("L1", "Guling depan dan guling belakang termasuk senam ....", "lantai"),
      U("L3", "Susunlah rangkaian tiga gerakan senam lantai (misalnya sikap awal, guling depan, sikap akhir) dan jelaskan satu hal yang perlu diperhatikan agar aman!", "Rangkaian runtut dan benar (3 gerakan, skor 3); keselamatan: pemanasan, memakai matras, tidak memaksakan gerak (skor 1).")
    ],
    "pjok-C-4": [
      P("L1", "Manfaat kebugaran jasmani adalah ...", "tubuh kuat dan tidak mudah lelah", "mudah sakit", "malas belajar", "mengantuk terus"),
      P("L1", "Denyut nadi dapat dihitung pada ...", "pergelangan tangan", "telapak kaki", "dahi", "telinga"),
      P("L1", "Kebugaran jasmani dapat dipertahankan dengan ...", "olahraga teratur dan makan bergizi", "begadang", "jajan berlebihan", "tidak bergerak"),
      P("L2", "Lari jarak jauh terutama melatih ...", "daya tahan", "kelenturan", "kekuatan lengan", "kecepatan"),
      I("L2", "Lari jarak jauh melatih daya tahan .... dan paru-paru.", "jantung"),
      U("L2", "Jelaskan tiga manfaat kebugaran jasmani bagi murid!", "Contoh: tubuh sehat, tidak mudah lelah, mudah berkonsentrasi belajar. Skor 1 tiap manfaat + 1 kejelasan.")
    ],
    "pjok-C-5": [
      P("L1", "Sikap sportif adalah ...", "menerima keputusan wasit", "memprotes keputusan wasit", "berkelahi dengan lawan", "sengaja melanggar aturan"),
      P("L1", "Cara menghargai lawan setelah pertandingan adalah ...", "berjabat tangan", "mengejek lawan", "mengabaikan lawan", "menyalahkan wasit"),
      P("L2", "Jika emosi memuncak saat bermain, sebaiknya ...", "menarik napas dan menenangkan diri", "memukul teman", "membanting alat", "pergi sambil marah"),
      P("L1", "Kejujuran dalam pertandingan ditunjukkan dengan ...", "tidak berbuat curang", "menyembunyikan bola", "mengakali aturan", "menyalahkan teman"),
      I("L1", "Sikap menjunjung kejujuran dan aturan dalam permainan disebut ....", "sportivitas"),
      U("L3", "Ceritakan pengalamanmu bersikap sportif saat bermain dan bagaimana perasaanmu!", "Jawaban memuat pengalaman nyata, sikap sportif yang dilakukan, dan perasaan. Skor: pengalaman 2, sikap 1, perasaan 1.")
    ],

    // ===================== IPAS FASE B =====================
    "ipas-B-1": [
      P("L1", "Bagian tumbuhan yang menyerap air dan mineral dari tanah adalah ...", "akar", "batang", "daun", "bunga"),
      P("L1", "Fungsi daun bagi tumbuhan adalah ...", "tempat membuat makanan (fotosintesis)", "menyerap air dari tanah", "alat berkembang biak", "menopang tumbuhan"),
      P("L2", "Urutan daur hidup kupu-kupu yang benar adalah ...", "telur, ulat, kepompong, kupu-kupu", "telur, kepompong, ulat, kupu-kupu", "ulat, telur, kupu-kupu, kepompong", "kupu-kupu, ulat, telur, kepompong"),
      P("L1", "Bunga berfungsi sebagai alat ...", "perkembangbiakan", "pernapasan", "penyerap air", "pengangkut makanan"),
      I("L1", "Bagian tumbuhan yang menopang tumbuhan dan mengangkut air serta zat makanan adalah ....", "batang"),
      U("L2", "Jelaskan fungsi akar, batang, dan daun!", "Akar menyerap air dan mineral serta menopang; batang menopang dan mengangkut zat; daun membuat makanan. Skor 1 tiap fungsi + 1 kejelasan.")
    ],
    "ipas-B-2": [
      P("L1", "Es batu termasuk benda berwujud ...", "padat", "cair", "gas", "plasma"),
      P("L2", "Benda yang bentuknya mengikuti wadah tetapi volumenya tetap adalah benda ...", "cair", "padat", "gas", "semuanya"),
      P("L1", "Es mencair karena ...", "menerima panas", "kehilangan panas", "diberi tekanan", "dikocok"),
      P("L1", "Udara termasuk benda berwujud ...", "gas", "cair", "padat", "tidak berwujud"),
      I("L1", "Perubahan wujud dari cair menjadi gas disebut ....", "menguap"),
      U("L2", "Jelaskan perbedaan benda padat, cair, dan gas!", "Padat: bentuk dan volume tetap; cair: volume tetap, bentuk mengikuti wadah; gas: bentuk dan volume berubah mengisi ruang. Skor 1 tiap wujud + 1 kejelasan.")
    ],
    "ipas-B-3": [
      P("L1", "Gaya adalah ...", "tarikan atau dorongan", "benda yang berat", "kecepatan benda", "bentuk benda"),
      P("L1", "Mendorong meja merupakan contoh gaya ...", "dorong", "tarik", "magnet", "pegas"),
      P("L1", "Gaya yang membuat benda jatuh ke bawah adalah gaya ...", "gravitasi", "gesek", "magnet", "pegas"),
      P("L2", "Permukaan kasar menyebabkan benda yang bergerak ...", "cepat berhenti karena gesekan besar", "bergerak lebih cepat", "tidak mengalami gesekan", "melayang"),
      I("L1", "Gaya yang menghambat gerak benda karena bersentuhan permukaan disebut gaya ....", "gesek"),
      U("L2", "Berikan satu contoh gaya dorong dan satu contoh gaya tarik dalam kehidupan sehari-hari!", "Contoh dorong: mendorong pintu; tarik: menarik laci. Skor 2 tiap contoh yang tepat.")
    ],
    "ipas-B-4": [
      P("L1", "Energi yang memungkinkan kita melihat benda adalah energi ...", "cahaya", "bunyi", "panas", "gerak"),
      P("L1", "Sumber energi panas dan cahaya utama di bumi adalah ...", "matahari", "bulan", "bintang", "lampu jalan"),
      P("L1", "Bunyi dihasilkan oleh benda yang ...", "bergetar", "diam", "bercahaya", "membeku"),
      P("L2", "Pada kipas angin, energi listrik berubah menjadi energi ...", "gerak", "cahaya", "bunyi saja", "kimia"),
      I("L1", "Lampu mengubah energi listrik menjadi energi .... dan panas.", "cahaya"),
      U("L2", "Sebutkan tiga contoh sumber energi dalam kehidupan sehari-hari!", "Contoh: matahari, listrik, bahan bakar (minyak bumi), angin, makanan. Skor 1 tiap contoh benar + 1 kejelasan.")
    ],
    "ipas-B-5": [
      P("L1", "Siang dan malam terjadi karena bumi ...", "berputar pada porosnya (rotasi)", "mengelilingi matahari", "diam", "mengelilingi bulan"),
      P("L1", "Bumi berputar pada porosnya satu kali putaran penuh selama kira-kira ...", "24 jam", "12 jam", "7 hari", "365 hari"),
      P("L1", "Sumber daya alam yang dapat diperbarui adalah ...", "tumbuhan", "batu bara", "minyak bumi", "gas alam"),
      P("L1", "Cara menghemat air adalah ...", "menutup keran saat tidak dipakai", "membiarkan keran menyala", "memakai air berlebihan", "membuang air sembarangan"),
      I("L2", "Minyak bumi termasuk sumber daya alam yang .... dapat diperbarui.", "tidak"),
      U("L2", "Jelaskan mengapa terjadi siang dan malam!", "Bumi berputar pada porosnya (rotasi). Bagian yang menghadap matahari mengalami siang, yang membelakangi mengalami malam. Skor: rotasi 2, penjelasan siang-malam 2.")
    ],
    "ipas-B-6": [
      P("L1", "Rumah adat, pakaian adat, dan tarian daerah adalah contoh ...", "budaya daerah", "aturan sekolah", "kebutuhan pokok", "benda langit"),
      P("L1", "Indonesia memiliki banyak ...", "suku bangsa dan bahasa daerah", "benua", "samudra besar", "gurun pasir"),
      P("L1", "Sikap terhadap budaya daerah lain adalah ...", "mau mengenal dan menghormatinya", "mengejeknya", "mengabaikannya", "melarangnya"),
      P("L1", "Contoh melestarikan budaya daerah adalah ...", "mempelajari tarian daerah", "membuang pakaian adat", "mengejek bahasa daerah", "menolak belajar"),
      I("L1", "Bahasa yang digunakan di suatu daerah disebut bahasa ....", "daerah"),
      U("L2", "Sebutkan tiga contoh keragaman budaya di daerahmu!", "Jawaban sesuai daerah (mis. bahasa, makanan khas, tarian, pakaian adat). Skor 1 tiap contoh yang tepat + 1 kejelasan.")
    ],
    "ipas-B-7": [
      P("L1", "Kebutuhan pokok manusia terdiri atas ...", "sandang, pangan, dan papan", "mainan dan hiburan", "kendaraan mewah", "perhiasan"),
      P("L1", "Pangan berarti ...", "makanan", "pakaian", "tempat tinggal", "uang"),
      P("L1", "Kegiatan membuat barang disebut ...", "produksi", "konsumsi", "distribusi", "penawaran"),
      P("L1", "Orang yang memakai atau membeli barang disebut ...", "konsumen", "produsen", "distributor", "pedagang besar"),
      I("L1", "Orang yang membuat barang disebut ....", "produsen"),
      U("L2", "Jelaskan perbedaan kebutuhan dan keinginan dengan contoh!", "Kebutuhan harus dipenuhi (makan, pakaian); keinginan boleh ditunda (mainan baru). Skor: pengertian 2, contoh 2.")
    ],
    "ipas-B-8": [
      P("L1", "Norma adalah ...", "aturan yang berlaku di masyarakat", "hadiah", "nama tempat", "jenis barang"),
      P("L1", "Interaksi sosial adalah ...", "hubungan timbal balik antarmanusia", "hubungan manusia dengan benda", "kegiatan bermain sendiri", "perpindahan tempat"),
      P("L1", "Contoh norma kesopanan adalah ...", "mengucapkan salam saat bertemu", "berteriak di kelas", "menyela pembicaraan", "mengejek teman"),
      P("L1", "Anggota masyarakat yang bekerja bersama untuk kepentingan bersama disebut ...", "gotong royong", "egois", "acuh", "bertikai"),
      I("L1", "Kelompok sosial yang paling kecil adalah ....", "keluarga"),
      U("L2", "Jelaskan pentingnya aturan (norma) dalam kehidupan masyarakat!", "Norma membuat kehidupan tertib, aman, dan rukun. Skor: alasan 2, contoh norma 2.")
    ],

    // ===================== IPAS FASE C =====================
    "ipas-C-1": [
      P("L1", "Organ yang berfungsi mencerna makanan secara kimiawi adalah ...", "lambung", "paru-paru", "jantung", "ginjal"),
      P("L1", "Organ utama pernapasan manusia adalah ...", "paru-paru", "jantung", "lambung", "usus"),
      P("L1", "Organ yang memompa darah ke seluruh tubuh adalah ...", "jantung", "paru-paru", "usus", "ginjal"),
      P("L1", "Pencernaan makanan dimulai dari ...", "mulut", "usus besar", "lambung", "kerongkongan"),
      I("L1", "Gas yang kita hirup dan dibutuhkan tubuh adalah ....", "oksigen"),
      U("L2", "Urutkan jalannya makanan dari mulut sampai anus!", "Mulut, kerongkongan, lambung, usus halus, usus besar, anus. Skor 1 tiap organ pada urutan yang benar (maks. 5).")
    ],
    "ipas-C-2": [
      P("L1", "Produsen dalam rantai makanan adalah ...", "tumbuhan hijau", "ulat", "burung", "harimau"),
      P("L1", "Hewan pemakan tumbuhan disebut ...", "herbivora", "karnivora", "omnivora", "dekomposer"),
      P("L2", "Rantai makanan yang benar adalah ...", "padi → tikus → ular → elang", "elang → ular → tikus → padi", "tikus → padi → ular → elang", "ular → padi → elang → tikus"),
      P("L1", "Makhluk hidup yang mengurai sisa makhluk hidup yang mati adalah ...", "jamur dan bakteri", "elang", "rumput", "kelinci"),
      I("L1", "Hewan pemakan daging disebut ....", "karnivora"),
      U("L3", "Buatlah rantai makanan empat tingkat, lalu tunjukkan produsen dan konsumennya!", "Contoh: rumput → belalang → katak → ular. Produsen: rumput; konsumen: belalang, katak, ular. Skor: rantai benar 2, produsen 1, konsumen 1.")
    ],
    "ipas-C-3": [
      P("L2", "Perubahan benda yang menghasilkan zat baru adalah ...", "kayu terbakar menjadi arang", "es mencair", "air menguap", "gula larut dalam air"),
      P("L1", "Campuran yang dapat dipisahkan dengan cara disaring adalah ...", "pasir dan air", "gula dan air", "garam dan air", "teh manis"),
      P("L1", "Perubahan wujud cair menjadi padat disebut ...", "membeku", "menguap", "mencair", "mengembun"),
      P("L1", "Gula yang larut dalam air membentuk ...", "larutan", "uap", "padatan", "gas"),
      I("L1", "Perubahan wujud gas menjadi cair disebut ....", "mengembun"),
      U("L3", "Bedakan perubahan fisika dan perubahan kimia, masing-masing dengan satu contoh!", "Perubahan fisika tidak membentuk zat baru (es mencair); perubahan kimia membentuk zat baru (kayu terbakar). Skor: tiap pengertian 1 dan contoh 1.")
    ],
    "ipas-C-4": [
      P("L1", "Benda yang dapat menghantarkan listrik (konduktor) adalah ...", "tembaga", "kayu", "plastik", "karet"),
      P("L1", "Benda yang tidak menghantarkan listrik (isolator) adalah ...", "plastik", "besi", "aluminium", "tembaga"),
      P("L1", "Rangkaian listrik sederhana minimal terdiri atas ...", "sumber listrik, kabel, dan lampu", "lampu saja", "kabel saja", "baterai dan kertas"),
      P("L1", "Kutub magnet yang sejenis jika didekatkan akan ...", "tolak-menolak", "tarik-menarik", "diam", "menempel"),
      I("L1", "Benda yang dapat ditarik oleh magnet disebut benda ....", "magnetis"),
      U("L2", "Jelaskan cara membuat rangkaian listrik sederhana yang dapat menyalakan lampu!", "Hubungkan kutub baterai dengan kabel ke lampu hingga membentuk rangkaian tertutup. Skor: alat 2, rangkaian tertutup 2.")
    ],
    "ipas-C-5": [
      P("L1", "Urutan siklus air yang benar adalah ...", "penguapan, pengembunan (awan), hujan", "hujan, penguapan, pengembunan", "pengembunan, hujan, penguapan", "hujan, pengembunan, penguapan"),
      P("L1", "Awan terbentuk dari ...", "uap air yang mengembun", "asap", "debu", "angin"),
      P("L1", "Banjir dapat dicegah dengan ...", "tidak membuang sampah ke sungai", "menebang hutan", "membuang sampah ke selokan", "menutup saluran air"),
      P("L1", "Gempa bumi adalah ...", "getaran pada kerak bumi", "hujan lebat", "angin kencang", "naiknya air laut"),
      I("L2", "Air laut menjadi uap air karena panas matahari. Peristiwa ini disebut ....", "penguapan"),
      U("L2", "Jelaskan proses terjadinya hujan!", "Air menguap karena panas matahari, uap naik dan mengembun menjadi awan, lalu jatuh sebagai hujan. Skor: tiap tahap benar 1, kelengkapan 1.")
    ],
    "ipas-C-6": [
      P("L1", "Peta adalah gambaran permukaan bumi ...", "pada bidang datar dengan perbandingan (skala)", "dalam bentuk rumah", "berupa foto keluarga", "dengan ukuran sebenarnya"),
      P("L1", "Empat arah mata angin utama adalah ...", "utara, selatan, timur, barat", "atas, bawah, kiri, kanan", "depan, belakang, kiri, kanan", "timur, barat, atas, bawah"),
      P("L1", "Daerah yang tinggi dan menjulang disebut ...", "pegunungan", "pantai", "laut", "lembah"),
      P("L1", "Simbol-simbol pada peta dijelaskan di bagian ...", "legenda", "judul", "garis lintang", "bingkai"),
      I("L2", "Perbandingan jarak pada peta dengan jarak sebenarnya disebut ....", "skala"),
      U("L2", "Sebutkan tiga komponen yang terdapat pada peta!", "Contoh: judul, legenda, skala, arah mata angin, simbol. Skor 1 tiap komponen benar + 1 kejelasan.")
    ],
    "ipas-C-7": [
      P("L1", "Kerajaan Hindu-Buddha yang berpusat di Sumatra adalah ...", "Sriwijaya", "Majapahit", "Mataram Kuno", "Singasari"),
      P("L1", "Proklamator kemerdekaan Indonesia adalah Soekarno dan ...", "Mohammad Hatta", "Sutan Sjahrir", "Ki Hajar Dewantara", "Jenderal Sudirman"),
      P("L1", "Proklamasi kemerdekaan Indonesia dibacakan pada 17 Agustus tahun ...", "1945", "1928", "1950", "1942"),
      P("L2", "Kerajaan Islam yang pertama di Indonesia adalah ...", "Samudera Pasai", "Majapahit", "Sriwijaya", "Tarumanegara"),
      I("L1", "Kerajaan Majapahit terletak di pulau ....", "Jawa"),
      U("L2", "Ceritakan secara singkat peristiwa proklamasi kemerdekaan Indonesia!", "Pada 17 Agustus 1945 di Jakarta, Soekarno dan Hatta membacakan proklamasi atas nama bangsa Indonesia. Skor: waktu 1, tempat 1, tokoh 1, isi peristiwa 1.")
    ],
    "ipas-C-8": [
      P("L1", "Jual beli adalah kegiatan ...", "tukar-menukar barang dengan uang", "membuat barang", "membuang barang", "meminjam barang"),
      P("L1", "Pada pasar tradisional, harga biasanya ditentukan melalui ...", "tawar-menawar", "mesin kasir saja", "undian", "penjual saja"),
      P("L1", "Menabung bermanfaat untuk ...", "memenuhi kebutuhan di masa depan", "menghabiskan uang", "membuang uang", "berutang"),
      P("L1", "Ekspor adalah kegiatan ...", "menjual barang ke luar negeri", "membeli barang dari luar negeri", "menjual barang di dalam negeri", "membuat barang di rumah"),
      I("L1", "Membeli barang dari luar negeri disebut ....", "impor"),
      U("L2", "Jelaskan perbedaan pasar tradisional dan pasar modern!", "Pasar tradisional: ada tawar-menawar, pembeli dan penjual bertemu langsung; pasar modern: harga pas, layanan sendiri/kasir. Skor: tiap jenis 2.")
    ]
  };

  // Gabungkan ke bank utama; soal yang bunyinya sama tidak diulang.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(BARU[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;

/* ################ BAGIAN: data-soal-umum-3.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-umum-3.js
   Bank soal DRAF mapel umum MI Fase A-C: Seni (seni; A-1..4, B-1..4, C-1..4) dan Bahasa Inggris (big; B-1..5, C-1..5).
   KUNCI = kode mapel-FASE-nomor urut TP di js/data-tp-umum.js. Jika urutan TP berubah, kunci ikut disesuaikan.
   Status: DRAF, belum diperiksa guru. Soal Seni bersifat pengetahuan dasar; penilaian praktik (karya/penampilan)
   dilakukan guru dengan rubrik sendiri. Bahasa Inggris adalah mapel pilihan/muatan lokal: sesuaikan dengan buku ajar madrasah.
   Format sama dengan data-soal-mi.js (PG: jawaban benar di posisi pertama; opsi diacak saat dipakai).
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const BARU = {
    // ===================== SENI FASE A =====================
    "seni-A-1": [
      P("L1", "Garis yang lurus ke atas dan ke bawah disebut garis ...", "tegak (vertikal)", "datar (horizontal)", "lengkung", "zigzag"),
      P("L1", "Warna pokok (primer) adalah ...", "merah, kuning, dan biru", "hijau, ungu, dan jingga", "hitam, putih, dan abu-abu", "merah, hijau, dan ungu"),
      P("L1", "Bentuk matahari yang biasa digambar anak-anak berupa ...", "lingkaran", "persegi", "segitiga", "belah ketupat"),
      P("L1", "Alat yang dipakai untuk mewarnai gambar adalah ...", "krayon", "penggaris", "penghapus", "gunting"),
      I("L1", "Garis yang melengkung seperti gelombang disebut garis ....", "lengkung"),
      U("L2", "Sebutkan tiga warna beserta satu benda yang berwarna tersebut!", "Contoh: merah-apel, kuning-pisang, hijau-daun. Skor: tiap pasangan warna dan benda yang tepat 1 (maks. 3) + 1 kejelasan.")
    ],
    "seni-A-2": [
      P("L1", "Suara tepuk tangan yang pelan termasuk bunyi ...", "lembut", "keras", "tinggi", "panjang"),
      P("L1", "Alat musik yang dipukul adalah ...", "gendang", "seruling", "gitar", "biola"),
      P("L1", "Alat musik yang ditiup adalah ...", "seruling", "gendang", "gitar", "rebana"),
      P("L1", "Saat bernyanyi, kita menggunakan ...", "suara", "kaki", "mata", "hidung"),
      I("L1", "Lagu yang dinyanyikan anak-anak disebut lagu ....", "anak"),
      U("L2", "Nyanyikan satu lagu anak, lalu sebutkan judulnya dan ceritakan isinya secara singkat!", "Penilaian praktik: lagu dinyanyikan dengan suara jelas (2), judul benar (1), isi lagu diceritakan (1).")
    ],
    "seni-A-3": [
      P("L1", "Gerak tari dilakukan dengan mengikuti ...", "irama", "angin", "cahaya", "bau"),
      P("L1", "Anggota tubuh yang digerakkan saat menari adalah ...", "tangan, kaki, dan kepala", "hanya tangan", "hanya kaki", "tidak ada"),
      P("L1", "Saat menari bersama teman, kita harus ...", "kompak", "bergerak sendiri-sendiri", "berebut tempat", "tidak peduli"),
      P("L1", "Pemanasan sebelum menari berguna agar ...", "tubuh tidak kaku dan tidak cedera", "mengantuk", "lapar", "haus"),
      I("L1", "Gerak tubuh yang indah mengikuti irama musik disebut ....", "tari"),
      U("L2", "Peragakan tiga gerak tari sederhana menggunakan tangan, kaki, dan kepala!", "Penilaian praktik: tiga gerak sesuai irama (3), kekompakan atau kepercayaan diri (1).")
    ],
    "seni-A-4": [
      P("L1", "Bermain peran artinya ...", "berperan menjadi tokoh tertentu", "hanya menonton", "membaca buku", "menggambar"),
      P("L1", "Saat bermain peran, kita menggunakan ...", "ekspresi wajah dan suara", "hanya diam", "tidur", "menutup mata"),
      P("L1", "Ekspresi wajah ketika senang adalah ...", "tersenyum", "menangis", "marah", "cemberut"),
      P("L1", "Dongeng dapat diperankan menjadi ...", "pertunjukan peran", "lagu daerah", "lukisan", "patung"),
      I("L1", "Kegiatan memerankan tokoh disebut bermain ....", "peran"),
      U("L2", "Peragakan ekspresi senang, sedih, dan marah, lalu jelaskan perbedaannya!", "Penilaian praktik: tiga ekspresi dapat dibedakan (3), penjelasan singkat (1).")
    ],

    // ===================== SENI FASE B =====================
    "seni-B-1": [
      P("L1", "Contoh karya seni rupa dua dimensi adalah ...", "gambar", "patung", "kerajinan tanah liat", "topeng"),
      P("L1", "Teknik menempel potongan bahan seperti kertas membentuk gambar disebut ...", "kolase", "pahatan", "anyaman", "ukiran"),
      P("L1", "Campuran warna merah dan kuning menghasilkan warna ...", "jingga", "hijau", "ungu", "cokelat"),
      P("L1", "Campuran warna biru dan kuning menghasilkan warna ...", "hijau", "jingga", "ungu", "merah"),
      I("L1", "Campuran warna merah dan biru menghasilkan warna ....", "ungu"),
      U("L2", "Jelaskan langkah-langkah membuat gambar pemandangan sederhana!", "Contoh: menentukan objek, membuat sketsa dengan pensil, memberi warna, memeriksa hasil. Skor 1 tiap langkah yang tepat (maks. 4).")
    ],
    "seni-B-2": [
      P("L1", "Cepat atau lambatnya sebuah lagu disebut ...", "tempo", "dinamika", "nada", "lirik"),
      P("L1", "Keras atau lembutnya sebuah lagu disebut ...", "dinamika", "tempo", "nada", "birama"),
      P("L1", "Alat musik ritmis adalah ...", "rebana", "pianika", "seruling", "biola"),
      P("L1", "Alat musik melodis adalah ...", "pianika", "kendang", "rebana", "tamborin"),
      I("L1", "Alat musik tradisional Jawa Barat yang terbuat dari bambu adalah ....", "angklung"),
      U("L2", "Jelaskan perbedaan tempo cepat dan tempo lambat, lalu beri satu contoh lagu untuk masing-masing!", "Tempo cepat: lagu terdengar ceria dan bergerak cepat; tempo lambat: lagu terdengar tenang. Contoh lagu sesuai pilihan murid. Skor: pengertian 2, contoh 2.")
    ],
    "seni-B-3": [
      P("L1", "Tari Saman berasal dari daerah ...", "Aceh", "Bali", "Jawa Barat", "Papua"),
      P("L1", "Tari Kecak berasal dari daerah ...", "Bali", "Aceh", "Sumatera Barat", "Maluku"),
      P("L1", "Tari Piring berasal dari daerah ...", "Sumatera Barat", "Bali", "Jawa Tengah", "Nusa Tenggara"),
      P("L1", "Tari Jaipong berasal dari daerah ...", "Jawa Barat", "Bali", "Aceh", "Maluku"),
      I("L1", "Tari Pendet berasal dari daerah ....", "Bali"),
      U("L2", "Sebutkan dua tari daerah beserta asal daerahnya dan satu ciri geraknya!", "Contoh: Tari Saman (Aceh) bergerak serempak sambil duduk dengan tepukan; Tari Piring (Sumatera Barat) memakai piring. Skor: tiap tari dan asal 1, ciri 2.")
    ],
    "seni-B-4": [
      P("L1", "Percakapan antartokoh dalam drama disebut ...", "dialog", "monolog", "narasi", "puisi"),
      P("L1", "Orang yang memerankan tokoh dalam drama disebut ...", "pemeran (pemain)", "penonton", "sutradara", "penulis"),
      P("L1", "Orang yang mengarahkan jalannya pementasan disebut ...", "sutradara", "pemeran", "penonton", "penata rias"),
      P("L1", "Tempat pementasan drama biasanya berupa ...", "panggung", "dapur", "kebun", "pasar"),
      I("L2", "Percakapan yang dilakukan oleh satu pemeran sendirian disebut ....", "monolog"),
      U("L3", "Tulislah dialog empat baris antara dua tokoh yang saling menolong!", "Dialog bergantian antara dua tokoh, sesuai tema tolong-menolong. Skor: tiap baris yang runtut dan sesuai tema 1.")
    ],

    // ===================== SENI FASE C =====================
    "seni-C-1": [
      P("L1", "Unsur-unsur seni rupa adalah ...", "titik, garis, dan bidang", "nada dan irama", "gerak dan ruang pentas", "dialog dan naskah"),
      P("L1", "Kesan kasar atau halus pada permukaan benda disebut ...", "tekstur", "warna", "garis", "ruang"),
      P("L2", "Prinsip keseimbangan dalam karya seni rupa memberi kesan ...", "sama berat pada kedua sisi", "hanya gelap", "hanya terang", "hanya besar"),
      P("L1", "Contoh karya seni rupa tiga dimensi adalah ...", "patung", "lukisan", "gambar", "poster"),
      I("L2", "Karya seni rupa yang memiliki panjang, lebar, dan tinggi disebut karya ....", "tiga dimensi"),
      U("L2", "Jelaskan perbedaan karya seni rupa dua dimensi dan tiga dimensi dengan contoh!", "Dua dimensi: hanya panjang dan lebar (gambar); tiga dimensi: ada tinggi/volume (patung). Skor: tiap jenis 2 (pengertian dan contoh).")
    ],
    "seni-C-2": [
      P("L1", "Pada notasi angka, nada 3 dibaca ...", "mi", "re", "fa", "do"),
      P("L1", "Pada notasi angka, nada 5 dibaca ...", "sol", "fa", "la", "si"),
      P("L2", "Birama 4/4 berarti satu birama berisi ... ketukan.", "empat", "dua", "tiga", "enam"),
      P("L1", "Lagu “Bungong Jeumpa” berasal dari daerah ...", "Aceh", "Bali", "Papua", "Jawa Tengah"),
      I("L1", "Pada notasi angka, nada 1 dibaca ....", "do"),
      U("L2", "Tuliskan nama nada untuk angka 1 sampai 7!", "do, re, mi, fa, sol, la, si. Skor 1 tiap dua nama yang benar (maks. 4) dan urut.")
    ],
    "seni-C-3": [
      P("L1", "Wiraga dalam tari berarti ...", "gerak tubuh", "irama", "penghayatan", "busana"),
      P("L1", "Wirama dalam tari berarti ...", "irama atau ritme", "gerak tubuh", "penghayatan", "pakaian"),
      P("L1", "Wirasa dalam tari berarti ...", "penghayatan atau ekspresi", "gerak tubuh", "irama", "musik"),
      P("L2", "Pola lantai dalam tari adalah ...", "garis yang dilalui penari di lantai", "busana penari", "alat musik pengiring", "jumlah penonton"),
      I("L1", "Unsur tari berupa gerak tubuh disebut ....", "wiraga"),
      U("L2", "Jelaskan tiga unsur tari (wiraga, wirama, wirasa)!", "Wiraga: gerak tubuh; wirama: irama; wirasa: penghayatan atau ekspresi. Skor 1 tiap unsur + 1 kejelasan.")
    ],
    "seni-C-4": [
      P("L1", "Naskah drama adalah ...", "teks cerita berisi dialog dan petunjuk pementasan", "tarian daerah", "gambar pemandangan", "lagu anak"),
      P("L1", "Tokoh utama adalah tokoh yang ...", "paling berperan dalam cerita", "menonton pementasan", "mengatur panggung", "menjual tiket"),
      P("L1", "Tata panggung berkaitan dengan ...", "pengaturan dekorasi di panggung", "nyanyian pemain", "kehadiran penonton", "jumlah dialog"),
      P("L1", "Unsur pokok pementasan teater adalah ...", "pemain, naskah, panggung, penonton", "buku, pena, papan, kapur", "bola, net, ring, lapangan", "kuas, cat, kanvas, palet"),
      I("L1", "Orang yang menyaksikan pertunjukan teater disebut ....", "penonton"),
      U("L3", "Susunlah rencana pementasan drama sederhana yang memuat tokoh, dialog singkat, dan tata panggung!", "Skor: daftar tokoh 1, dialog singkat sesuai tema 2, tata panggung 1.")
    ],

    // ===================== BAHASA INGGRIS FASE B =====================
    "big-B-1": [
      P("L1", "“Good morning” berarti ...", "selamat pagi", "selamat malam", "selamat siang", "sampai jumpa"),
      P("L1", "Jawaban untuk “What is your name?” adalah ...", "My name is Ani.", "I am fine.", "I am seven.", "Thank you."),
      P("L1", "Jawaban untuk “How are you?” adalah ...", "I am fine, thank you.", "My name is Budi.", "Goodbye.", "Yes, please."),
      P("L1", "“Good night” berarti ...", "selamat malam", "selamat pagi", "selamat sore", "selamat datang"),
      I("L1", "Arti “thank you” adalah ....", "terima kasih"),
      U("L2", "Tulislah tiga kalimat bahasa Inggris untuk memperkenalkan dirimu (nama, umur, kelas)!", "Contoh: My name is Ani. I am eight years old. I am in grade three. Skor: tiap kalimat benar 1, tambahan 1 untuk ejaan benar.")
    ],
    "big-B-2": [
      P("L1", "Angka “seven” adalah ...", "7", "6", "8", "9"),
      P("L1", "Angka “twelve” adalah ...", "12", "2", "20", "21"),
      P("L1", "“Red” berarti warna ...", "merah", "biru", "hijau", "kuning"),
      P("L1", "Warna langit yang cerah dalam bahasa Inggris adalah ...", "blue", "red", "green", "black"),
      I("L1", "Angka 10 dalam bahasa Inggris adalah ....", "ten"),
      U("L2", "Tuliskan angka 1 sampai 5 dan tiga nama warna dalam bahasa Inggris!", "one, two, three, four, five; contoh warna: red, blue, green. Skor: angka 2, warna 2.")
    ],
    "big-B-3": [
      P("L1", "“Book” berarti ...", "buku", "pensil", "meja", "kursi"),
      P("L1", "“Open your book” berarti ...", "buka bukumu", "tutup bukumu", "tulis bukumu", "robek bukumu"),
      P("L1", "“Sit down” berarti ...", "duduk", "berdiri", "masuk", "keluar"),
      P("L1", "Jika guru berkata “Stand up!”, kamu harus ...", "berdiri", "duduk", "menulis", "tidur"),
      I("L1", "Arti “ruler” adalah ....", "penggaris"),
      U("L2", "Tulislah tiga perintah di kelas dalam bahasa Inggris beserta artinya!", "Contoh: Sit down (duduk), Stand up (berdiri), Open your book (buka bukumu). Skor 1 tiap perintah dan arti benar + 1 ejaan.")
    ],
    "big-B-4": [
      P("L1", "“Mother” berarti ...", "ibu", "ayah", "kakak", "nenek"),
      P("L1", "“Father” berarti ...", "ayah", "ibu", "adik", "kakek"),
      P("L1", "“Grandmother” berarti ...", "nenek", "kakek", "bibi", "ibu"),
      P("L1", "“Brother” berarti ...", "saudara laki-laki", "saudara perempuan", "paman", "bibi"),
      I("L1", "Arti “sister” adalah ....", "saudara perempuan"),
      U("L2", "Perkenalkan tiga anggota keluargamu dalam bahasa Inggris!", "Contoh: This is my father. This is my mother. This is my sister. Skor: tiap kalimat benar 1, ejaan 1.")
    ],
    "big-B-5": [
      P("L1", "“This is a pen.” Kata “this” dipakai untuk benda yang ...", "dekat dengan kita", "jauh dari kita", "tidak ada", "sangat besar"),
      P("L1", "“That is a bag.” Kata “that” dipakai untuk benda yang ...", "jauh dari kita", "dekat dengan kita", "ada di tangan", "tidak terlihat"),
      P("L1", "“My book” berarti ...", "bukuku", "bukumu", "bukunya", "buku kami"),
      P("L1", "“Your name” berarti ...", "namamu", "namaku", "namanya", "nama kami"),
      I("L1", "Pensilmu dalam bahasa Inggris: .... pencil.", "your"),
      U("L2", "Buatlah tiga kalimat sederhana dengan this atau that!", "Contoh: This is my book. That is your bag. This is a pencil. Skor: tiap kalimat benar 1, ejaan 1.")
    ],

    // ===================== BAHASA INGGRIS FASE C =====================
    "big-C-1": [
      P("L1", "“I get up at six o’clock.” berarti ...", "Aku bangun pukul enam", "Aku tidur pukul enam", "Aku makan pukul enam", "Aku berangkat pukul enam"),
      P("L2", "Pukul 07.30 dibaca ...", "half past seven", "a quarter past seven", "seven o’clock", "half past eight"),
      P("L1", "“I brush my teeth.” berarti ...", "Aku menyikat gigi", "Aku mandi", "Aku makan", "Aku berlari"),
      P("L1", "Kalimat bahasa Inggris untuk “Aku mandi” adalah ...", "I take a bath.", "I go to bed.", "I eat lunch.", "I read a book."),
      I("L1", "Pukul 07.00 dibaca seven o’.... ", "clock"),
      U("L3", "Tulislah empat kalimat bahasa Inggris tentang kegiatanmu sehari-hari!", "Contoh: I get up at five. I take a bath. I go to school. I study at night. Skor: tiap kalimat benar 1 (maks. 4).")
    ],
    "big-C-2": [
      P("L1", "“I like reading.” Arti “reading” adalah ...", "membaca", "menulis", "bernyanyi", "berenang"),
      P("L1", "“Rice” berarti ...", "nasi", "roti", "susu", "air"),
      P("L1", "“Milk” berarti ...", "susu", "teh", "jus", "kopi"),
      P("L1", "“My hobby is swimming.” Hobiku adalah ...", "berenang", "bersepeda", "menari", "memasak"),
      I("L1", "Arti “bread” adalah ....", "roti"),
      U("L2", "Tulislah tiga kalimat bahasa Inggris tentang makanan atau hobi yang kamu sukai dengan pola “I like ...”!", "Contoh: I like rice. I like milk. I like reading. Skor 1 tiap kalimat benar + 1 ejaan.")
    ],
    "big-C-3": [
      P("L1", "“Library” berarti ...", "perpustakaan", "kantin", "masjid", "kantor"),
      P("L1", "“Hospital” berarti ...", "rumah sakit", "sekolah", "pasar", "bank"),
      P("L1", "“Turn left” berarti ...", "belok kiri", "belok kanan", "jalan lurus", "berhenti"),
      P("L1", "“Go straight” berarti ...", "jalan lurus", "belok kiri", "belok kanan", "mundur"),
      I("L1", "Belok kanan dalam bahasa Inggris: Turn ....", "right"),
      U("L3", "Tulislah petunjuk arah dari sekolah ke masjid dalam tiga kalimat bahasa Inggris!", "Contoh: Go straight. Turn left. The mosque is on your right. Skor: tiap kalimat petunjuk yang benar dan sesuai 1 (maks. 3) + 1 ejaan.")
    ],
    "big-C-4": [
      P("L2", "She ... a book every day.", "reads", "read", "reading", "readed"),
      P("L1", "I ... to school every day.", "go", "goes", "going", "went"),
      P("L2", "He ... breakfast at seven.", "eats", "eat", "eating", "ate"),
      P("L1", "They ... football on Sunday.", "play", "plays", "playing", "played"),
      I("L2", "My mother ... (cook) in the kitchen every morning.", "cooks"),
      U("L3", "Tulislah tiga kalimat simple present tentang dirimu atau keluargamu!", "Contoh: I go to school. My father works in an office. My sister likes reading. Skor: tiap kalimat benar 1 (maks. 3) + 1 ejaan.")
    ],
    "big-C-5": [
      P("L1", "“Big” berarti ...", "besar", "kecil", "tinggi", "pendek"),
      P("L1", "Lawan kata “tall” adalah ...", "short", "long", "big", "fat"),
      P("L2", "There ... three books on the table.", "are", "is", "am", "be"),
      P("L2", "There ... a cat under the chair.", "is", "are", "am", "were"),
      I("L1", "“She has long hair.” Arti “long” adalah ....", "panjang"),
      U("L3", "Deskripsikan sahabatmu dalam tiga kalimat bahasa Inggris (nama, ciri fisik, dan hobi)!", "Contoh: His name is Dani. He is tall and has short hair. He likes football. Skor: tiap kalimat benar 1 (maks. 3) + 1 ejaan.")
    ]
  };

  // Gabungkan ke bank utama; soal yang bunyinya sama tidak diulang.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(BARU[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;

/* ################ BAGIAN: data-soal-uraian-tambah.js ################ */
/* ============================================================
   SI MAMBA - js/data-soal-uraian-tambah.js
   TAMBAHAN 1 soal URAIAN untuk TP yang bank soalnya belum punya uraian: Bahasa Arab (ba-A-1, A-3, A-4, A-5, A-8, A-9,
   ba-B-1..B-12, ba-C-3..C-6, C-8, C-9) dan Matematika (mtk-A-6, mtk-A-10).
   Soal Bahasa Arab berbentuk "Tuliskan arti dari: ..." memakai kosakata yang SUDAH ada di soal PG/isian TP yang sama
   di js/data-soal-ba.js (teks Arab dan artinya diambil dari sana, tidak ditulis baru). Harakat mengikuti file asal.
   Status: DRAF, belum diperiksa guru. Guru Bahasa Arab wajib mencocokkan dengan buku ajar madrasah.
   Format sama dengan data-soal-mi.js. WAJIB dimuat SESUDAH js/data-soal-ba.js dan js/data-soal-mtk.js.
============================================================ */
(function () {
  'use strict';
  const U = (lv, q, r) => ['ur', lv, q, r];

  const TAMBAH = {
    "ba-A-1": [
      U("L2", "Tuliskan arti dari: أَنَا, هُوَ, dan اسْمِي أَحْمَدُ!", "saya (aku); dia (laki-laki); Namaku Ahmad. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-3": [
      U("L2", "Tuliskan arti dari: بَيْتٌ, حَمَّامٌ, dan مَطْبَخٌ!", "rumah; kamar mandi; dapur. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-4": [
      U("L2", "Tuliskan arti dari: كُرْسِيٌّ, تِلْمِيذٌ, dan قَلَمٌ!", "kursi; murid; pena. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-5": [
      U("L2", "Tuliskan arti dari: الْقِرَاءَةُ, كُرَةُ الْقَدَمِ, dan هِوَايَتِي الرَّسْمُ!", "membaca; sepak bola; Hobiku menggambar. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-8": [
      U("L2", "Tuliskan arti dari: قِطَارٌ, سَفِينَةٌ, dan سَيَّارَةٌ!", "kereta api; kapal; mobil. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-9": [
      U("L2", "Tuliskan arti dari: شَجَرَةٌ, زَهْرَةٌ, dan جَبَلٌ!", "pohon; bunga; gunung. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-1": [
      U("L2", "Tuliskan arti dari: التَّارِيخُ, الرِّيَاضِيَّاتُ, dan الْعُلُومُ!", "sejarah; matematika; ilmu pengetahuan alam. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-2": [
      U("L2", "Tuliskan arti dari: حِصَانٌ, كَلْبٌ, dan فِيلٌ!", "kuda; anjing; gajah. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-3": [
      U("L2", "Tuliskan arti dari: سُعَالٌ, حُمَّى, dan عِنْدِي صُدَاعٌ!", "batuk; demam; Aku sakit kepala. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-4": [
      U("L2", "Tuliskan arti dari: الْجَرْيُ, السِّبَاحَةُ, dan كُرَةُ الْقَدَمِ!", "lari; renang; sepak bola. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-5": [
      U("L2", "Tuliskan arti dari: ذَكِيٌّ, طَيِّبٌ, dan هُوَ صَدِيقِي!", "pintar (cerdas); baik; Dia (laki-laki) temanku. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-6": [
      U("L2", "Tuliskan arti dari: حَدِيقَةٌ, عُشْبٌ, dan فَرَاشَةٌ!", "taman; rumput; kupu-kupu. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-7": [
      U("L2", "Tuliskan arti dari: شَارِعٌ, قَرْيَةٌ, dan أَيْنَ تَسْكُنُ؟", "jalan; desa; Di mana kamu tinggal? Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-8": [
      U("L2", "Tuliskan arti dari: فَلَّاحٌ, طَيَّارٌ, dan طَبِيبٌ!", "petani; pilot; dokter. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-9": [
      U("L2", "Tuliskan arti dari: أُرِيدُ, مُهَنْدِسٌ, dan أُرِيدُ أَنْ أَكُونَ طَبِيبًا!", "aku ingin; insinyur; Aku ingin menjadi dokter. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-10": [
      U("L2", "Tuliskan arti dari: غُرْفَةُ النَّوْمِ, ثَلَّاجَةٌ, dan سَرِيرٌ!", "kamar tidur; kulkas; tempat tidur. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-11": [
      U("L2", "Tuliskan arti dari: بِنْتٌ, عَمٌّ, dan أَبٌ!", "anak perempuan; paman (saudara laki-laki ayah); ayah. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-12": [
      U("L2", "Tuliskan arti dari: وَطَنٌ, جَزِيرَةٌ, dan أُحِبُّ إِنْدُونِيسِيَا!", "tanah air (negara); pulau; Aku cinta Indonesia. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-3": [
      U("L2", "Tuliskan arti dari: مِصْبَاحٌ, سَاعَةٌ, dan أَرِيكَةٌ!", "lampu; jam dinding; sofa. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-4": [
      U("L2", "Tuliskan arti dari: مَجَلَّةٌ, قَامُوسٌ, dan رَفٌّ!", "majalah; kamus; rak. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-5": [
      U("L2", "Tuliskan arti dari: عَصِيرٌ, مَاءٌ, dan مَقْصِفٌ!", "jus (sari buah); air; kantin. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-6": [
      U("L2", "Tuliskan arti dari: السَّاعَةُ, سَنَةٌ, dan كَمِ السَّاعَةُ؟", "jam; tahun; Jam berapa sekarang? Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-8": [
      U("L2", "Tuliskan arti dari: زَارَ, رَجَعَ, dan عُطْلَةٌ!", "mengunjungi; kembali; liburan. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-9": [
      U("L2", "Tuliskan arti dari: خَيْمَةٌ, بَحْرٌ, dan رِحْلَةٌ!", "tenda; laut; piknik (perjalanan wisata). Skor sebanding jumlah arti yang benar.")
    ],
    // ===================== MATEMATIKA FASE A =====================
    "mtk-A-6": [
      U("L2", "Sebuah roti dipotong menjadi 2 bagian sama besar. Ani mengambil 1 bagian. Tuliskan pecahan yang menyatakan bagian roti yang diambil Ani, lalu jelaskan alasanmu!", "Pecahan 1/2 (setengah), karena Ani mengambil 1 bagian dari 2 bagian yang sama besar. Skor 50 untuk pecahan yang benar, 50 untuk alasan yang sesuai.")
    ],
    "mtk-A-10": [
      U("L2", "Sebutkan dua benda di kelasmu yang berbentuk persegi panjang dan satu benda yang berbentuk lingkaran!", "Contoh persegi panjang: papan tulis, pintu, buku tulis, permukaan meja. Contoh lingkaran: jam dinding, tutup toples, piringan. Skor sebanding jumlah contoh yang benar.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
;
