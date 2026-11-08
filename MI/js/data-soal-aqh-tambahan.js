/* ============================================================
   SI MAMBA - js/data-soal-aqh-tambahan.js
   TAMBAHAN bank soal DRAF Al-Qur'an Hadis MI untuk 18 TP yang di bank gabungan baru punya sekitar 3 PG:
   aqh-A-5, A-6, A-7, A-8, B-9..B-13, C-4..C-12. Menambah 2 PG dan 1 isian per TP (A-5: 2 PG).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang. Soal sengaja berbasis makna dan sikap,
   bukan hafalan teks Arab. Status DRAF: guru wajib memeriksa soal dan kunci jawaban.
   WAJIB dimuat SESUDAH js/data-soal-semua.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const TAMBAH = {
    "aqh-A-5": [
      P("L1", "Surah Al-Fatihah disebut juga ...", "Ummul Kitab", "Surah Penutup", "Surah Al-Waqi'ah", "Surah As-Sajdah"),
      P("L1", "Surah Al-Ikhlas terdiri dari ... ayat.", "empat", "tiga", "lima", "enam")
    ],
    "aqh-A-6": [
      P("L1", "Hadis tentang kebersihan mengajarkan kita menjaga kebersihan badan, pakaian, dan ...", "tempat tinggal", "uang", "mainan", "jadwal"),
      P("L2", "Perbuatan yang bertentangan dengan hadis kebersihan adalah ...", "membuang sampah sembarangan", "mencuci tangan sebelum makan", "mandi dua kali sehari", "merapikan kelas"),
      I("L1", "Mencuci tangan sebelum makan termasuk menjaga kebersihan ....", "badan")
    ],
    "aqh-A-7": [
      P("L1", "Menuntut ilmu hukumnya wajib bagi ...", "setiap muslim", "orang kaya saja", "laki-laki saja", "guru saja"),
      P("L2", "Orang yang berilmu sebaiknya bersikap ...", "rendah hati", "sombong", "pelit ilmu", "suka mengejek"),
      I("L1", "Orang yang mengajarkan ilmu kepada kita disebut ....", "guru")
    ],
    "aqh-A-8": [
      P("L1", "Durhaka kepada orang tua termasuk dosa ...", "besar", "kecil", "ringan", "tidak berdosa"),
      P("L2", "Ketika orang tua memanggil saat kita sedang bermain, sikap yang baik adalah ...", "segera menjawab dan menghampiri", "pura-pura tidak mendengar", "menjawab dengan keras", "melanjutkan bermain"),
      I("L1", "Memanggil orang tua dengan suara lembut menunjukkan sikap ... kepada mereka.", "hormat")
    ],
    "aqh-B-9": [
      P("L1", "Posisi makmum dalam salat berjemaah adalah di ... imam.", "belakang", "depan", "atas", "mana saja"),
      P("L1", "Saf salat berjemaah hendaknya ... dan rapat.", "lurus", "bengkok", "berjauhan", "acak"),
      I("L1", "Orang yang memimpin salat berjemaah disebut ....", "imam")
    ],
    "aqh-B-10": [
      P("L1", "Sesama muslim harus saling ...", "menyayangi", "membenci", "menjauhi", "mengejek"),
      P("L2", "Jika temanmu bersin lalu mengucapkan Alhamdulillah, kita menjawab ...", "Yarhamukallah", "Astaghfirullah", "Subhanallah", "Innalillahi"),
      I("L1", "Tolong-menolong sesama muslim menunjukkan sikap ....", "persaudaraan")
    ],
    "aqh-B-11": [
      P("L1", "Takwa dapat diwujudkan dengan taat kepada Allah di ... tempat.", "mana pun", "rumah saja", "masjid saja", "sekolah saja"),
      P("L1", "Orang yang bertakwa akan dicintai ...", "Allah", "setan", "orang jahat", "tidak seorang pun"),
      I("L1", "Menjauhi larangan Allah dan menjalankan perintah-Nya disebut ....", "takwa")
    ],
    "aqh-B-12": [
      P("L1", "Amal yang dilakukan karena ingin dipuji orang disebut ...", "riya", "ikhlas", "tawadu", "syukur"),
      P("L1", "Niat dalam beribadah dilakukan ...", "sebelum memulai ibadah", "setelah ibadah selesai", "hari berikutnya", "saat tidur"),
      I("L1", "Mengerjakan sesuatu semata-mata karena Allah disebut ....", "ikhlas")
    ],
    "aqh-B-13": [
      P("L1", "Silaturahmi dapat dilakukan dengan mengunjungi atau menghubungi ...", "saudara dan kerabat", "orang asing saja", "teman bermain saja", "tetangga jauh saja"),
      P("L1", "Memutus silaturahmi hukumnya ...", "dilarang", "dianjurkan", "wajib", "sunah"),
      I("L1", "Menanyakan kabar kakek melalui telepon termasuk ....", "silaturahmi")
    ],
    "aqh-C-4": [
      P("L1", "Dalam ilmu tajwid, bacaan yang boleh dibaca dengan dua cara disebut ...", "jawazul wajhain", "ikhfa", "idgham", "qalqalah"),
      P("L1", "Pada bacaan jawazul wajhain, pembaca boleh memilih salah satu dari ... cara bacaan.", "dua", "tiga", "empat", "lima"),
      I("L1", "Hukum bacaan yang boleh dibaca dua cara disebut jawazul ....", "wajhain")
    ],
    "aqh-C-5": [
      P("L1", "Nifak artinya menampakkan keimanan dan menyembunyikan ... di dalam hati.", "kekufuran", "kejahatan", "kekayaan", "kesedihan"),
      P("L2", "Orang munafik diancam oleh Allah dengan ...", "azab yang pedih", "surga", "kasih sayang", "kekayaan"),
      I("L1", "Sifat munafik dapat dihindari dengan berkata dan berbuat ....", "jujur")
    ],
    "aqh-C-6": [
      P("L1", "Anak yatim perlu mendapat kasih sayang dan ...", "perlindungan", "dijauhi", "diabaikan", "dimarahi"),
      P("L1", "Menyantuni anak yatim termasuk perbuatan ...", "terpuji", "tercela", "sia-sia", "dilarang"),
      I("L1", "Memberi bantuan dan kasih sayang kepada anak yatim disebut ... anak yatim.", "menyantuni")
    ],
    "aqh-C-7": [
      P("L2", "Infak berbeda dengan zakat karena infak ...", "tidak ditentukan jumlah dan waktunya", "hanya diberikan setahun sekali", "harus mencapai nisab", "hanya untuk orang kaya"),
      P("L1", "Infak harus diberikan dengan niat ...", "ikhlas karena Allah", "ingin dipuji", "ingin dikenal", "terpaksa"),
      I("L1", "Orang yang suka berinfak termasuk orang yang ....", "dermawan")
    ],
    "aqh-C-8": [
      P("L1", "Amal saleh harus dilakukan dengan niat ...", "ikhlas", "riya", "terpaksa", "ingin dipuji"),
      P("L1", "Contoh amal saleh adalah ...", "menolong teman yang kesulitan", "mengejek teman", "berbohong", "menunda tugas"),
      I("L1", "Amal saleh dilakukan untuk mencari rida ....", "Allah")
    ],
    "aqh-C-9": [
      P("L1", "Agar tidak memiliki sifat munafik, kita harus ... dalam berbicara.", "jujur", "berdusta", "berpura-pura", "menutupi"),
      P("L2", "Menepati janji berlawanan dengan tanda munafik, yaitu ...", "mengingkari janji", "berkata jujur", "menjaga amanah", "bersikap adil"),
      I("L1", "Berkata jujur berlawanan dengan tanda munafik, yaitu ....", "berdusta")
    ],
    "aqh-C-10": [
      P("L1", "Menanggung anak yatim berarti memenuhi ... hidupnya.", "kebutuhan", "keinginan berlebihan", "kesalahan", "kesombongan"),
      P("L2", "Orang yang menanggung anak yatim sebaiknya bersikap ...", "ikhlas dan penuh kasih sayang", "ingin dipuji", "pilih kasih", "kasar"),
      I("L1", "Anak yatim adalah anak yang ditinggal wafat oleh ... nya.", "ayah")
    ],
    "aqh-C-11": [
      P("L1", "Hadis tentang tangan di atas mendorong kita menjadi orang yang ...", "suka memberi", "suka meminta", "suka mengeluh", "suka menunda"),
      P("L2", "Bekerja keras agar tidak meminta-minta sesuai dengan hadis tentang ...", "tangan di atas", "tangan di bawah", "kikir", "malas"),
      I("L1", "Orang yang rajin bekerja agar tidak meminta-minta memiliki sifat ....", "mandiri")
    ],
    "aqh-C-12": [
      P("L1", "Menyebarkan ilmu yang bermanfaat termasuk amal ...", "jariah", "tercela", "terputus", "sia-sia"),
      P("L2", "Mewakafkan Al-Qur'an untuk masjid termasuk ...", "sedekah jariah", "sedekah sekali habis", "utang", "perbuatan sia-sia"),
      I("L1", "Amal yang pahalanya terus mengalir disebut sedekah ....", "jariah")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
