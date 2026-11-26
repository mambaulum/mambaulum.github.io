/* ============================================================
   SI MAMBA - js/data-soal-pjok-gambar.js
   TAMBAHAN soal bergambar otomatis untuk PJOK (sebelumnya belum punya soal bergambar sama sekali).
   Memakai jenis gambar baru [[g:lapangan;voli|basket|sepakbola|bulutangkis|lintasan|lompatjauh]] di js/perangkat-soal.js
   (tampak atas, disederhanakan, tanpa tulisan), serta diagram, ikon, dan wajah yang sudah ada.
     pjok-C-1 Permainan bola dengan aturan : mengenal lapangan voli, basket, sepak bola dan perlengkapannya (12 soal)
     pjok-C-2 Atletik                      : lintasan lari dan lompat jauh (6 soal)
     pjok-A-3 Gerak manipulatif            : bola (3 soal)
     pjok-B-3 Komponen kebugaran jasmani   : membaca diagram hasil tes sit-up (4 soal)
     pjok-C-4 Kebugaran dan kesehatan      : membaca diagram lama berolahraga (3 soal)
     pjok-B-4 Pola hidup sehat             : mengenal makanan bergizi (5 soal)
     pjok-A-5, B-5, C-5 Sikap/karakter     : ekspresi wajah dan sikap sportif (6 soal)
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban. Catatan: gambar lapangan hanya memperlihatkan garis-garis pokok.
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang.
   WAJIB dimuat SESUDAH js/data-soal-lanjutan-umum.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const L = v => '[[g:lapangan;' + v + ']]';
  const T = {
    /* ---------- Fase C: Permainan bola dengan aturan ---------- */
    "pjok-C-1": [
      P("L1", L('voli') + "Lapangan pada gambar digunakan untuk permainan ...", "bola voli", "bola basket", "sepak bola", "bulu tangkis"),
      P("L1", L('basket') + "Lapangan pada gambar digunakan untuk permainan ...", "bola basket", "bola voli", "sepak bola", "bulu tangkis"),
      P("L1", L('sepakbola') + "Lapangan pada gambar digunakan untuk permainan ...", "sepak bola", "bola voli", "bola basket", "bulu tangkis"),
      P("L1", "Gambar lapangan bola voli adalah ...", L('voli'), L('basket'), L('sepakbola'), L('bulutangkis')),
      P("L1", "Gambar lapangan bola basket adalah ...", L('basket'), L('voli'), L('sepakbola'), L('bulutangkis')),
      P("L1", "Gambar lapangan sepak bola adalah ...", L('sepakbola'), L('voli'), L('basket'), L('bulutangkis')),
      P("L2", L('voli') + "Lapangan pada gambar dibagi dua oleh sebuah ... di bagian tengah.", "net (jaring)", "gawang", "ring", "garis gawang"),
      P("L2", L('sepakbola') + "Pada permainan di lapangan itu terdapat gawang. Pemain yang bertugas menjaga gawang disebut ...", "penjaga gawang (kiper)", "pemain bertahan", "pemain depan", "wasit"),
      P("L2", L('basket') + "Pada permainan di lapangan itu, bola dimasukkan ke dalam ... milik lawan.", "ring", "net", "gawang", "garis tengah"),
      I("L1", L('voli') + "Lapangan pada gambar digunakan untuk permainan bola ....", "voli"),
      I("L1", L('basket') + "Lapangan pada gambar digunakan untuk permainan bola ....", "basket"),
      I("L1", L('sepakbola') + "Lapangan pada gambar digunakan untuk permainan ....", "sepak bola")
    ],
    /* ---------- Fase C: Atletik ---------- */
    "pjok-C-2": [
      P("L1", L('lintasan') + "Lintasan pada gambar digunakan untuk nomor atletik ...", "lari", "lompat jauh", "lempar lembing", "tolak peluru"),
      P("L1", L('lompatjauh') + "Lapangan pada gambar digunakan untuk nomor atletik ...", "lompat jauh", "lari estafet", "lempar cakram", "lari gawang"),
      P("L1", "Gambar tempat untuk nomor atletik lompat jauh adalah ...", L('lompatjauh'), L('lintasan'), L('voli'), L('basket')),
      P("L2", L('lompatjauh') + "Bagian yang berisi pasir pada gambar berfungsi sebagai tempat ...", "mendarat", "bertolak (menolak)", "mengambil awalan", "memulai lari"),
      I("L1", L('lintasan') + "Nomor atletik yang dilakukan di lintasan pada gambar adalah ....", "lari"),
      I("L1", L('lompatjauh') + "Nomor atletik yang memakai lintasan awalan dan bak pasir pada gambar adalah lompat ....", "jauh")
    ],
    /* ---------- Fase A: Gerak manipulatif ---------- */
    "pjok-A-3": [
      P("L1", "Alat yang ditendang pada permainan sepak bola adalah ...", "[[g:ikon;bola;1]]", "[[g:ikon;buku;1]]", "[[g:ikon;pensil;1]]", "[[g:ikon;pohon;1]]"),
      P("L1", "Alat yang dilempar dan ditangkap pada permainan bola adalah ...", "[[g:ikon;bola;1]]", "[[g:ikon;rumah;1]]", "[[g:ikon;mobil;1]]", "[[g:ikon;bunga;1]]"),
      I("L1", "[[g:ikon;bola;1]]Benda pada gambar dipakai untuk latihan gerak manipulatif, yaitu melempar, menangkap, dan ... bola.", "menendang")
    ],
    /* ---------- Fase B: Komponen kebugaran jasmani ---------- */
    "pjok-B-3": [
      P("L2", "[[g:diagram;Ani:12;Budi:20;Citra:15;Dedi:9]]Diagram menunjukkan jumlah sit-up yang dilakukan empat anak dalam satu menit. Anak yang kekuatan dan daya tahan otot perutnya paling baik adalah ...", "Budi", "Ani", "Citra", "Dedi"),
      P("L2", "[[g:diagram;Ani:12;Budi:20;Citra:15;Dedi:9]]Pada diagram sit-up, selisih jumlah sit-up terbanyak dan tersedikit adalah ...", "11", "29", "3", "8"),
      I("L2", "[[g:diagram;Ani:12;Budi:20;Citra:15;Dedi:9]]Pada diagram sit-up, jumlah seluruh sit-up keempat anak adalah ....", "56"),
      I("L1", "[[g:diagram;Ani:12;Budi:20;Citra:15;Dedi:9]]Tes sit-up pada diagram mengukur kekuatan otot ....", "perut")
    ],
    /* ---------- Fase C: Kebugaran dan kesehatan ---------- */
    "pjok-C-4": [
      P("L2", "[[g:diagram;Senin:30;Selasa:20;Rabu:40;Kamis:10]]Diagram menunjukkan lama Rafi berolahraga (dalam menit) selama empat hari. Rafi berolahraga paling lama pada hari ...", "Rabu", "Senin", "Selasa", "Kamis"),
      P("L2", "[[g:diagram;Senin:30;Selasa:20;Rabu:40;Kamis:10]]Pada diagram lama berolahraga, selisih lama olahraga hari Rabu dan hari Kamis adalah ... menit.", "30", "10", "40", "20"),
      I("L2", "[[g:diagram;Senin:30;Selasa:20;Rabu:40;Kamis:10]]Pada diagram lama berolahraga, jumlah seluruh menit Rafi berolahraga selama empat hari adalah ... menit.", "100")
    ],
    /* ---------- Fase B: Pola hidup sehat (makanan bergizi) ---------- */
    "pjok-B-4": [
      P("L1", "Gambar makanan yang termasuk buah-buahan adalah ...", "[[g:ikon;apel;1]]", "[[g:ikon;ikan;1]]", "[[g:ikon;ayam;1]]", "[[g:ikon;mobil;1]]"),
      P("L1", "Gambar makanan sumber protein hewani (lauk) adalah ...", "[[g:ikon;ikan;1]]", "[[g:ikon;pisang;1]]", "[[g:ikon;apel;1]]", "[[g:ikon;jeruk;1]]"),
      P("L1", "[[g:ikon;pisang;1]]Makanan pada gambar termasuk golongan ...", "buah-buahan", "lauk pauk", "sayuran", "makanan pokok"),
      P("L1", "[[g:ikon;ikan;1]]Makanan pada gambar termasuk lauk pauk dan merupakan sumber ...", "protein", "serat", "gula", "garam"),
      I("L1", "[[g:ikon;apel;1]]Buah pada gambar sebaiknya kita makan setiap hari karena mengandung banyak ....", "vitamin")
    ],
    /* ---------- Sikap dan karakter dalam bermain ---------- */
    "pjok-A-5": [
      P("L1", "[[g:wajah;sedih]]Temanmu merasa sedih karena kalah dalam permainan. Sikap sportif yang sebaiknya kita tunjukkan adalah ...", "menghibur dan menyemangatinya", "menertawakannya", "mengejeknya", "meninggalkannya sendirian"),
      P("L1", "[[g:wajah;senang]]Semua anak senang bermain bersama teman yang taat aturan. Contoh sikap taat aturan saat bermain adalah ...", "menunggu giliran", "menyerobot antrean", "membantah wasit", "berbuat curang")
    ],
    "pjok-B-5": [
      P("L1", "[[g:wajah;senang]]Tim kelas 4 merasa senang karena bermain kompak dan saling membantu. Sikap yang ditunjukkan tim itu adalah ...", "kerja sama", "curang", "egois", "malas")
    ],
    "pjok-C-5": [
      P("L2", "[[g:wajah;marah]]Tim Dani kalah dalam pertandingan dan Dani merasa seperti pada gambar. Sikap sportif yang sebaiknya ditunjukkan Dani adalah ...", "mengakui kekalahan dan memberi selamat kepada lawan", "menyalahkan wasit", "meninggalkan lapangan tanpa pamit", "mengejek tim lawan"),
      P("L2", "[[g:wajah;sedih]]Rani merasa sedih karena timnya kalah. Cara mengelola emosi yang baik adalah ...", "menarik napas dalam dan menerima hasil pertandingan", "membanting bola", "berteriak kepada teman", "berhenti bermain selamanya"),
      I("L1", "[[g:wajah;marah]]Anak yang kalah lalu marah dan mengejek lawannya tidak bersikap ....", "sportif")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(T).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(T[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
