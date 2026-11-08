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
