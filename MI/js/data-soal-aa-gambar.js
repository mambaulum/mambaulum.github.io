/* ============================================================
   SI MAMBA - js/data-soal-aa-gambar.js
   TAMBAHAN soal bergambar otomatis untuk AKIDAH AKHLAK (sebelumnya belum punya soal bergambar sama sekali).
   Hanya memakai gambar yang sudah ada di js/perangkat-soal.js: ekspresi wajah [[g:wajah;...]], ikon benda sehari-hari [[g:ikon;...]],
   uang [[g:uang;...]], dan timbangan [[g:timbangan;...]]. TIDAK ada gambar nabi, malaikat, atau makhluk gaib; soal tentang rukun iman,
   sifat wajib Allah, asmaulhusna, dan kisah nabi sengaja tidak diberi gambar.
     Fase A: aa-A-7 kalimah thayyibah, A-8 hidup sehat, A-9 jujur, A-10 terima kasih, A-11 menghindari sikap buruk, A-15 adab makan (14 soal)
     Fase B: aa-B-5 kalimah thayyibah, B-6 bersyukur, B-9 tolong-menolong, B-11 serakah dan kikir, B-12/13/14 adab (13 soal)
     Fase C: aa-C-6 sabar, C-8 pemaaf, C-9 adil, C-10 pemarah, C-11 pilih kasih, C-12 adab bertamu, C-13 adab kepada lingkungan (11 soal)
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban, dan kesesuaiannya dengan buku ajar madrasah.
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang.
   WAJIB dimuat SESUDAH js/data-soal-lanjutan-umum.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const W = e => '[[g:wajah;' + e + ']]';
  const K = n => '[[g:ikon;' + n + ';1]]';
  const T = {
    /* ---------- Fase A ---------- */
    "aa-A-7": [
      P("L1", K('buku') + "Sebelum membuka buku untuk belajar, kita membaca ...", "basmalah (Bismillah)", "hamdalah (Alhamdulillah)", "taawuz (A'udzu billah)", "istigfar (Astagfirullah)"),
      P("L1", K('apel') + "Setelah selesai makan apel seperti pada gambar, kita mengucapkan ...", "hamdalah (Alhamdulillah)", "basmalah (Bismillah)", "taawuz (A'udzu billah)", "tahlil (La ilaha illallah)"),
      P("L1", W('senang') + "Kita merasa senang karena mendapat hadiah. Ucapan syukur kepada Allah yang kita baca adalah ...", "Alhamdulillah", "Astagfirullah", "A'udzu billah", "Innalillahi")
    ],
    "aa-A-8": [
      P("L1", "Buah-buahan menyehatkan tubuh. Gambar buah yang baik kita makan agar badan sehat adalah ...", K('apel'), K('mobil'), K('buku'), K('pensil')),
      P("L1", W('senang') + "Dina merasa segar dan senang setelah mandi. Mandi adalah salah satu cara menjaga ...", "kebersihan", "kemalasan", "kemarahan", "kebohongan")
    ],
    "aa-A-9": [
      P("L1", W('senang') + "Bu guru senang kepada murid yang selalu berkata ...", "jujur", "bohong", "kasar", "keras"),
      P("L1", W('sedih') + "Teman Rani merasa sedih karena Rani berbohong kepadanya. Sikap yang benar adalah selalu berkata ...", "jujur", "bohong", "kasar", "sombong"),
      I("L1", W('senang') + "Orang yang selalu berkata benar dan tidak berbohong disebut orang yang ....", "jujur")
    ],
    "aa-A-10": [
      P("L1", W('senang') + "Teman akan merasa senang jika setelah ditolong kita mengucapkan ...", "terima kasih", "marah-marah", "tidak apa-apa saja", "pergi begitu saja"),
      I("L1", W('senang') + "Setelah ditolong teman, kita mengucapkan ... agar teman merasa dihargai.", "terima kasih")
    ],
    "aa-A-11": [
      P("L1", W('marah') + "Rudi berkata kasar kepada Doni sehingga Doni merasa seperti pada gambar. Sikap yang sebaiknya dilakukan Rudi adalah ...", "meminta maaf dan berkata sopan", "mengulangi kata kasarnya", "menertawakan Doni", "menjauhi Doni"),
      I("L1", W('sedih') + "Teman akan merasa sedih jika kita berkata ....", "kasar")
    ],
    "aa-A-15": [
      P("L1", K('apel') + "Sebelum memakan apel seperti pada gambar, kita membaca ...", "Bismillah", "Alhamdulillah", "Astagfirullah", "Subhanallah"),
      I("L1", K('pisang') + "Sebelum memakan pisang pada gambar, kita membaca ....", "Bismillah")
    ],
    /* ---------- Fase B ---------- */
    "aa-B-5": [
      P("L1", K('bunga') + "Ketika melihat bunga yang sangat indah, kita mengucapkan kalimat kagum ...", "Masya Allah", "Astagfirullah", "Innalillahi", "Bismillah"),
      P("L1", K('pohon') + "Melihat pohon yang tinggi dan besar ciptaan Allah, kita mengucapkan kalimat kagum ...", "Masya Allah", "Astagfirullah", "Innalillahi", "Bismillah"),
      P("L1", K('matahari') + "Matahari bersinar atas kekuasaan Allah. Untuk mengagungkan Allah, kita mengucapkan ...", "Allahu Akbar", "Astagfirullah", "Innalillahi", "Bismillah")
    ],
    "aa-B-6": [
      P("L2", W('senang') + "Rina merasa senang mendapat hadiah dari ayahnya. Cara bersyukur kepada Allah yang paling tepat adalah ...", "mengucap Alhamdulillah dan memakai hadiah dengan baik", "menyombongkan hadiah itu", "mengeluh karena hadiahnya kurang besar", "menyia-nyiakan hadiah itu"),
      P("L2", "[[g:uang;5000;2000]]Dani mendapat uang jajan seperti pada gambar. Cara bersyukur yang tepat adalah ...", "menabung sebagian dan bersedekah", "menghabiskan semuanya untuk jajan berlebihan", "membuang uang itu", "menyombongkan uang itu kepada teman"),
      P("L2", "[[g:uang;10000;5000]]Ayu mendapat uang seperti pada gambar. Sikap bersyukur yang baik adalah menyisihkan sebagian uang itu untuk ...", "bersedekah", "membeli permainan tanpa batas", "dipamerkan kepada teman", "dihabiskan sekaligus")
    ],
    "aa-B-9": [
      P("L1", W('sedih') + "Teman sekelasmu sedih karena lupa membawa pensil. Sikap tolong-menolong yang tepat adalah ...", "meminjamkan pensil kepadanya", "mengejeknya", "membiarkannya saja", "memarahinya"),
      I("L1", W('sedih') + "Ketika teman sedang kesulitan, kita harus ... dia dalam kebaikan.", "menolong")
    ],
    "aa-B-11": [
      P("L2", "[[g:uang;20000;5000]]Dina memiliki uang seperti pada gambar. Ketika ada teman yang membutuhkan, Dina tidak mau berbagi sedikit pun. Sikap Dina disebut ...", "kikir", "dermawan", "pemaaf", "sabar"),
      P("L2", K('apel') + "Rudi mengambil semua apel dan tidak membagi kepada temannya. Sikap Rudi disebut ...", "serakah", "dermawan", "pemaaf", "rendah hati")
    ],
    "aa-B-12": [
      P("L1", W('senang') + "Ibu merasa senang jika anaknya ...", "menurut dan berkata sopan", "membantah ibu", "berbohong", "berteriak kepada ibu")
    ],
    "aa-B-13": [
      P("L1", W('senang') + "Guru merasa senang jika murid ...", "mendengarkan penjelasan guru", "mengobrol saat guru menjelaskan", "tidur di kelas", "meninggalkan kelas tanpa izin")
    ],
    "aa-B-14": [
      P("L1", W('sedih') + "Teman Dina sedih karena diejek. Adab kepada teman yang benar adalah tidak boleh ...", "mengejek teman", "menolong teman", "meminjamkan pensil", "menyapa teman")
    ],
    /* ---------- Fase C ---------- */
    "aa-C-6": [
      P("L2", W('marah') + "Fina marah karena adiknya merusak mainannya. Sikap sabar yang sebaiknya dilakukan Fina adalah ...", "menarik napas dan memaafkan adiknya", "membentak adiknya", "memukul adiknya", "merusak mainan adiknya"),
      I("L1", W('marah') + "Menahan diri ketika marah disebut sikap ....", "sabar")
    ],
    "aa-C-8": [
      P("L2", W('sedih') + "Temanmu meminta maaf dengan sungguh-sungguh karena tidak sengaja merusak bukumu. Sikap pemaaf yang tepat adalah ...", "memaafkannya", "marah kepadanya", "menyimpan dendam", "membalas merusak bukunya")
    ],
    "aa-C-9": [
      P("L1", "[[g:timbangan;Apel;Apel;seimbang]]Timbangan yang seimbang seperti pada gambar melambangkan sikap ...", "adil", "serakah", "iri hati", "pilih kasih"),
      P("L2", "[[g:timbangan;Apel;Jeruk;kiri]]Timbangan pada gambar berat sebelah. Membagi sesuatu dengan tidak sama rata kepada teman bertentangan dengan sikap ...", "adil", "rendah hati", "sabar", "pemaaf")
    ],
    "aa-C-10": [
      P("L2", W('marah') + "Wajah pada gambar menunjukkan orang yang sedang marah. Cara mengendalikan marah yang dianjurkan dalam Islam adalah ...", "membaca taawuz dan berwudu", "berteriak sekeras-kerasnya", "memukul benda di sekitar", "pergi sambil marah-marah"),
      I("L1", W('marah') + "Ketika marah, kita dianjurkan membaca ... agar terhindar dari godaan setan.", "taawuz (A'udzu billahi minasy syaithanir rajim)")
    ],
    "aa-C-11": [
      P("L2", W('sedih') + "Seorang guru hanya memberi hadiah kepada murid yang disukainya sehingga murid lain merasa sedih. Sikap guru itu disebut ...", "pilih kasih", "adil", "bijaksana", "rendah hati")
    ],
    "aa-C-12": [
      P("L1", K('rumah') + "Ketika bertamu ke rumah teman seperti pada gambar, sebelum masuk kita mengucapkan ...", "Assalamualaikum", "Astagfirullah", "Innalillahi", "Selamat tinggal"),
      I("L1", K('rumah') + "Ketika akan masuk ke rumah orang lain, kita mengetuk pintu dan mengucapkan ....", "Assalamualaikum")
    ],
    "aa-C-13": [
      P("L1", K('pohon') + "Menjaga dan tidak merusak pohon di sekitar kita termasuk adab kepada ...", "lingkungan", "guru", "tamu", "orang tua")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(T).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(T[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
