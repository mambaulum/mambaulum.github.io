/* ============================================================
   SI MAMBA - js/data-soal-fikih-gambar.js
   TAMBAHAN soal bergambar otomatis untuk FIKIH (sebelumnya Fikih belum punya soal bergambar sama sekali).
   Memakai jenis gambar yang sudah ada di js/perangkat-soal.js (penanda [[g:jenis;param]]), tanpa gambar orang atau makhluk:
     fikih-A-4 Salat fardu      : jam (waktu salat) dan mata angin (arah kiblat)
     fikih-A-6 Azan dan ikamah  : jam (waktu azan)
     fikih-B-1 Puasa Ramadan    : fase bulan (hilal)
     fikih-C-1 Zakat/infak/sedekah : uang rupiah dan diagram batang (menghitung infak)
     fikih-C-3 Haji dan umrah   : bangun ruang (bentuk Ka'bah menyerupai kubus)
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban. Catatan isi:
   - Waktu salat pada soal jam bersifat perkiraan (Subuh 05.00, Zuhur 12.30, Asar 15.30, Magrib 18.00, Isya 19.30); menyesuaikan
     daerah dan musim, jadi soal memakai kata "kira-kira" dan keterangan pagi/siang/sore/malam. Guru boleh mengubah jamnya.
   - Arah kiblat dari Indonesia dinyatakan "kira-kira ke barat" (untuk kelas rendah); sebagian buku memakai "barat laut".
   - Ka'bah ditulis "menyerupai kubus" (bentuk aslinya mendekati balok); pengecoh sengaja tidak memuat balok.
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang.
   WAJIB dimuat SESUDAH js/data-soal-lanjutan-umum.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const TAMBAH = {
    /* ---------- Fikih Fase A: Salat fardu (waktu salat dan arah kiblat) ---------- */
    "fikih-A-4": [
      P("L1", "[[g:jam;5;0]]Pada pagi hari, jam menunjukkan seperti pada gambar. Salat fardu yang waktunya sedang berlangsung adalah salat ...", "Subuh", "Zuhur", "Asar", "Isya"),
      P("L1", "[[g:jam;12;30]]Pada siang hari, jam menunjukkan seperti pada gambar. Salat fardu yang waktunya sedang berlangsung adalah salat ...", "Zuhur", "Subuh", "Magrib", "Isya"),
      P("L1", "[[g:jam;3;30]]Pada sore hari, jam menunjukkan seperti pada gambar. Salat fardu yang waktunya sedang berlangsung adalah salat ...", "Asar", "Subuh", "Magrib", "Isya"),
      P("L1", "[[g:jam;6;0]]Pada petang hari, jam menunjukkan seperti pada gambar. Salat fardu yang waktunya sedang berlangsung adalah salat ...", "Magrib", "Subuh", "Zuhur", "Isya"),
      P("L1", "[[g:jam;7;30]]Pada malam hari, jam menunjukkan seperti pada gambar. Salat fardu yang waktunya sedang berlangsung adalah salat ...", "Isya", "Subuh", "Zuhur", "Asar"),
      I("L1", "[[g:jam;6;0]]Pada petang hari, jam menunjukkan seperti pada gambar. Salat fardu yang dikerjakan pada waktu itu adalah salat ....", "Magrib"),
      I("L1", "[[g:jam;3;30]]Pada sore hari, jam menunjukkan seperti pada gambar. Salat fardu yang dikerjakan pada waktu itu adalah salat ....", "Asar"),
      P("L1", "Ka'bah di Mekah berada di sebelah barat Indonesia. Panah yang menunjukkan arah kiblat dari Indonesia kira-kira adalah ...", "[[g:mataangin;B]]", "[[g:mataangin;T]]", "[[g:mataangin;U]]", "[[g:mataangin;S]]"),
      P("L2", "[[g:mataangin;T]]Matahari terbit di arah yang ditunjuk panah merah. Agar menghadap kiblat dari Indonesia, kita harus membelakangi arah panah itu. Arah menghadap kiblat kira-kira adalah ...", "barat", "timur", "utara", "selatan"),
      I("L1", "[[g:mataangin;B]]Panah merah pada gambar kira-kira menunjukkan arah kiblat dari Indonesia, yaitu arah ....", "barat")
    ],
    /* ---------- Fikih Fase A: Azan dan ikamah ---------- */
    "fikih-A-6": [
      P("L1", "[[g:jam;12;30]]Muazin mengumandangkan azan pada siang hari ketika jam menunjukkan kira-kira seperti pada gambar. Azan itu memanggil untuk salat ...", "Zuhur", "Subuh", "Magrib", "Isya"),
      P("L1", "[[g:jam;6;0]]Muazin mengumandangkan azan pada petang hari ketika jam menunjukkan kira-kira seperti pada gambar. Azan itu memanggil untuk salat ...", "Magrib", "Subuh", "Zuhur", "Isya"),
      I("L1", "[[g:jam;4;30]]Muazin mengumandangkan azan pada pagi hari ketika jam menunjukkan kira-kira seperti pada gambar. Azan itu memanggil untuk salat ....", "Subuh")
    ],
    /* ---------- Fikih Fase B: Puasa Ramadan (hilal) ---------- */
    "fikih-B-1": [
      P("L1", "[[g:bulan;sabit]]Bulan sabit tipis seperti pada gambar dilihat pada awal bulan Hijriah untuk menentukan awal Ramadan. Bulan sabit tipis itu disebut ...", "hilal", "bulan purnama", "gerhana bulan", "bulan separuh"),
      P("L1", "Awal bulan Ramadan ditentukan dengan melihat hilal. Gambar bulan yang menyerupai hilal adalah ...", "[[g:bulan;sabit]]", "[[g:bulan;purnama]]", "[[g:bulan;separuh]]", "[[g:bulan;cembung]]"),
      I("L1", "[[g:bulan;sabit]]Bulan sabit tipis pada gambar yang dilihat untuk menentukan awal Ramadan dinamakan ....", "hilal")
    ],
    /* ---------- Fikih Fase C: Zakat fitrah, infak, dan sedekah (menghitung uang) ---------- */
    "fikih-C-1": [
      P("L2", "[[g:uang;5000;2000]]Rina menginfakkan uang seperti pada gambar untuk pembangunan masjid. Jumlah infak Rina adalah ...", "Rp7.000", "Rp7.500", "Rp6.500", "Rp8.000"),
      P("L2", "[[g:uang;10000;1000]]Bayu bersedekah dengan uang seperti pada gambar. Jumlah sedekah Bayu adalah ...", "Rp11.000", "Rp10.000", "Rp12.000", "Rp11.500"),
      P("L2", "[[g:uang;20000;5000;2000]]Siti menyisihkan uang jajan seperti pada gambar untuk berinfak. Jumlah uang yang diinfakkan Siti adalah ...", "Rp27.000", "Rp25.000", "Rp22.000", "Rp29.000"),
      P("L2", "[[g:diagram;Senin:5;Selasa:3;Rabu:8;Kamis:4]]Diagram menunjukkan infak (dalam ribu rupiah) yang terkumpul di kelas selama empat hari. Infak terbanyak terkumpul pada hari ...", "Rabu", "Senin", "Selasa", "Kamis"),
      I("L2", "[[g:diagram;Senin:5;Selasa:3;Rabu:8;Kamis:4]]Diagram menunjukkan infak (dalam ribu rupiah) yang terkumpul di kelas selama empat hari. Jumlah seluruh infak adalah ... ribu rupiah.", "20")
    ],
    /* ---------- Fikih Fase C: Haji dan umrah (bentuk Ka'bah) ---------- */
    "fikih-C-3": [
      P("L1", "Ka'bah menyerupai bangun ruang kubus. Gambar yang menyerupai bentuk Ka'bah adalah ...", "[[g:ruang;kubus]]", "[[g:ruang;tabung]]", "[[g:ruang;kerucut]]", "[[g:ruang;bola]]"),
      P("L1", "[[g:ruang;kubus]]Jemaah haji dan umrah berthawaf mengelilingi Ka'bah. Bentuk Ka'bah menyerupai bangun ruang seperti pada gambar, yaitu ...", "kubus", "tabung", "kerucut", "bola"),
      I("L1", "[[g:ruang;kubus]]Bangun ruang pada gambar menyerupai bentuk Ka'bah. Nama bangun ruang itu adalah ....", "kubus")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
