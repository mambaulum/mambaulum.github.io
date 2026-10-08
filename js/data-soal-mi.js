/* ============================================================
   SI MAMBA - js/data-soal-mi.js
   Bank soal DRAF untuk TP PAI MI (kunci TP sama dengan js/data-tp-mi.js, mis. 'aa-A-1' = Akidah Akhlak Fase A TP ke-1).
   Cakupan: Akidah Akhlak (Fase A-C), Fikih (A-C), SKI (B-C), dan Tajwid pada Al-Qur'an Hadis (A-C).
   TIDAK mencakup hafalan surah/ayat/hadis dan Bahasa Arab: soal untuk itu diketik guru di modul Kartu Soal.
   Soal ditulis ulang oleh penyusun aplikasi dan berstatus DRAF: guru wajib memeriksa kebenaran isi, kesesuaian
   dengan buku ajar/mazhab yang dipakai madrasah, dan tingkat kesulitan sebelum dipakai.
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
