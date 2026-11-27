/* ============================================================
   SI MAMBA - js/data-soal-aqh-ski-gambar.js
   TAMBAHAN soal bergambar otomatis (terbatas) untuk AL-QUR'AN HADIS dan SKI, dua mapel yang sebelumnya belum punya soal bergambar.
   Hanya memakai gambar yang sudah ada di js/perangkat-soal.js (wajah, ikon, uang, timbangan, mata angin, bangun ruang).
   TIDAK ada gambar nabi, sahabat, malaikat, atau teks Arab sebagai gambar (soal huruf hijaiyah dan tajwid tetap berupa teks).
   Al-Qur'an Hadis (15 soal): aqh-A-6 hadis kebersihan, A-7 keutamaan belajar, A-8 berbakti kepada orang tua, B-10 persaudaraan,
                              B-13 silaturahmi, C-6 menyayangi anak yatim, C-7 keutamaan memberi
   SKI (8 soal): ski-B-1 Ka'bah (kubus), B-4 ketabahan, B-5 arah hijrah (mata angin), C-4 Umar bin Khattab (adil, timbangan),
                 C-5 Usman bin Affan (dermawan, uang)
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban. Catatan isi:
   - Arah hijrah: Madinah dinyatakan di sebelah utara Mekah (perkiraan kasar, sebenarnya agak ke barat laut).
   - Ka'bah ditulis "menyerupai kubus" (bentuk aslinya mendekati balok); pengecoh sengaja tidak memuat balok.
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang.
   WAJIB dimuat SESUDAH js/data-soal-lanjutan-umum.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const W = e => '[[g:wajah;' + e + ']]';
  const K = n => '[[g:ikon;' + n + ';1]]';
  const M = d => '[[g:mataangin;' + d + ']]';
  const T = {
    /* ---------- Al-Qur'an Hadis ---------- */
    "aqh-A-6": [
      P("L1", K('rumah') + "Rumah yang bersih membuat penghuninya nyaman. Hadis tentang kebersihan mengajarkan kita untuk selalu menjaga ...", "kebersihan", "kemalasan", "keributan", "kemarahan"),
      P("L1", W('senang') + "Dina senang karena kamarnya bersih. Menurut hadis, kebersihan adalah sebagian dari ...", "iman", "uang", "mainan", "hadiah"),
      I("L1", K('bunga') + "Menjaga kebersihan taman dan lingkungan adalah sebagian dari ....", "iman")
    ],
    "aqh-A-7": [
      P("L1", K('buku') + "Benda pada gambar kita gunakan untuk belajar. Menurut hadis, menuntut ... itu wajib bagi setiap muslim.", "ilmu", "uang", "mainan", "makanan"),
      P("L1", W('senang') + "Anak yang rajin belajar akan merasa senang. Allah akan meninggikan ... orang yang berilmu.", "derajat", "mainan", "tubuh", "rumah"),
      I("L1", K('pensil') + "Pensil pada gambar dipakai untuk menuntut ilmu. Menuntut ilmu hukumnya wajib bagi setiap ....", "muslim")
    ],
    "aqh-A-8": [
      P("L1", W('senang') + "Ayah dan ibu senang jika anaknya berbakti. Menurut hadis, rida Allah tergantung pada rida ...", "orang tua", "teman", "guru", "tetangga"),
      P("L1", W('sedih') + "Ibu merasa sedih jika anaknya ...", "membantah dan berkata kasar", "membantu pekerjaan rumah", "mencium tangan ibu", "menurut nasihat ibu"),
      I("L1", W('sedih') + "Orang tua akan sedih jika anaknya berkata ....", "kasar")
    ],
    "aqh-B-10": [
      P("L1", W('sedih') + "Temanmu sedih karena sedang kesulitan. Hadis tentang persaudaraan mengajarkan kita untuk ... saudara seiman.", "menolong", "mengejek", "menjauhi", "memarahi")
    ],
    "aqh-B-13": [
      P("L1", K('rumah') + "Mengunjungi rumah saudara dan keluarga untuk mempererat hubungan kasih sayang disebut ...", "silaturahmi", "permusuhan", "pertengkaran", "pemborosan"),
      I("L1", K('rumah') + "Mengunjungi rumah saudara untuk mempererat kasih sayang disebut ....", "silaturahmi")
    ],
    "aqh-C-6": [
      P("L2", "[[g:uang;10000;2000]]Rina memberikan uang seperti pada gambar kepada anak yatim agar tidak merasa kekurangan. Jumlah uang yang Rina berikan adalah ...", "Rp12.000", "Rp10.000", "Rp11.000", "Rp13.000")
    ],
    "aqh-C-7": [
      P("L2", "[[g:uang;20000;5000]]Budi memberikan uang seperti pada gambar kepada orang yang membutuhkan. Jumlah uang yang diberikan Budi adalah ...", "Rp25.000", "Rp20.000", "Rp27.000", "Rp22.000"),
      P("L1", "[[g:uang;20000;5000]]Memberikan sebagian harta kepada orang yang membutuhkan karena Allah merupakan perbuatan yang utama. Perbuatan itu disebut ...", "sedekah (infak)", "pemborosan", "kikir", "menimbun harta")
    ],
    /* ---------- SKI ---------- */
    "ski-B-1": [
      P("L1", "Ka'bah dibangun oleh Nabi Ibrahim a.s. dan Nabi Ismail a.s. Gambar yang menyerupai bentuk Ka'bah adalah ...", "[[g:ruang;kubus]]", "[[g:ruang;tabung]]", "[[g:ruang;kerucut]]", "[[g:ruang;bola]]"),
      I("L1", "[[g:ruang;kubus]]Ka'bah yang dibangun Nabi Ibrahim a.s. dan Nabi Ismail a.s. menyerupai bangun ruang pada gambar, yaitu ....", "kubus")
    ],
    "ski-B-4": [
      P("L2", W('sedih') + "Para sahabat sering disakiti ketika berdakwah, tetapi mereka tetap tabah. Ketika kita sedih karena diejek teman, sikap yang dapat diteladani adalah ...", "tabah dan sabar", "membalas mengejek", "marah-marah", "menyerah dan menangis")
    ],
    "ski-B-5": [
      P("L1", "Rasulullah saw. berhijrah dari Mekah ke Madinah yang berada di sebelah utara Mekah. Panah yang menunjukkan arah hijrah Rasulullah saw. kira-kira adalah ...", M('U'), M('S'), M('T'), M('B')),
      I("L1", M('U') + "Arah panah pada gambar kira-kira adalah arah perjalanan hijrah Rasulullah saw. dari Mekah ke Madinah, yaitu ke arah ....", "utara")
    ],
    "ski-C-4": [
      P("L1", "[[g:timbangan;Apel;Apel;seimbang]]Umar bin Khattab dikenal sebagai khalifah yang adil. Timbangan yang seimbang pada gambar melambangkan sikap ...", "adil", "serakah", "pemarah", "pilih kasih"),
      I("L1", "[[g:timbangan;Apel;Apel;seimbang]]Sikap Umar bin Khattab yang dilambangkan oleh timbangan seimbang pada gambar adalah ....", "adil")
    ],
    "ski-C-5": [
      P("L2", "[[g:uang;5000;2000]]Usman bin Affan dikenal sebagai sahabat yang dermawan. Dina meneladaninya dengan menyedekahkan uang seperti pada gambar. Jumlah sedekah Dina adalah ...", "Rp7.000", "Rp7.500", "Rp6.500", "Rp8.000")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(T).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(T[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
