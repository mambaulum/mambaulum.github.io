/* ============================================================
   SI MAMBA - js/data-soal-aqh-surah-b-tambahan.js
   TAMBAHAN bank soal DRAF Al-Qur'an Hadis MI Fase B, kunci aqh-B-8 (arti dan isi kandungan surah pendek).
   Latar: PDF Kisi-kisi Ujian Madrasah 2025/2026 (Kepdirjen 3302), indikator Fase B "arti dan isi kandungan surah-surah
   pendek/pilihan" memberi contoh QS. Al-Ma'un, QS. At-Takatsur, QS. Al-Qari'ah, dan QS. Az-Zalzalah. Bank lama aqh-B-8
   baru memuat Al-Asr, Al-Kautsar, An-Nasr, Al-Kafirun, Al-Fil, dan Quraisy.
   Isi: 17 soal (Al-Ma'un 4, At-Takatsur 4, Al-Qari'ah 5, Az-Zalzalah 4). Bagian awal tiap opsi pada P() = jawaban benar
   (urutan diacak aplikasi). Soal lama tidak diubah; soal yang teksnya sama dengan soal yang sudah ada tidak diulang.
   Status DRAF: guru wajib memeriksa soal, terjemah ayat, dan kunci jawaban terhadap mushaf/terjemah Kemenag.
   WAJIB dimuat SESUDAH js/data-soal-semua.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];
  const TAMBAH = {
    "aqh-B-8": [
      /* QS. Al-Ma'un */
      P("L2", "Menurut surah Al-Ma'un, orang yang mendustakan agama tidak mau mendorong orang lain untuk ... orang miskin.", "memberi makan", "mengunjungi", "menasihati", "mengajari"),
      P("L2", "Surah Al-Ma'un menyebut celaka bagi orang yang salat tetapi ... dari salatnya.", "lalai", "rajin", "khusyuk", "tepat waktu"),
      I("L2", "Beramal supaya dipuji orang lain, seperti disebut dalam surah Al-Ma'un, dinamakan ....", "riya"),
      P("L3", "Dino rajin salat, tetapi ia membentak teman yatim dan tidak mau meminjamkan alat tulisnya. Sikap Dino bertentangan dengan pesan surah Al-Ma'un karena ...", "salat tidak diikuti kepedulian kepada sesama", "ia terlalu rajin salat", "ia tidak mau berpuasa", "ia suka belajar"),
      /* QS. At-Takatsur */
      P("L2", "Surah At-Takatsur menegur manusia yang lalai karena ...", "bermegah-megahan", "rajin belajar", "banyak bersedekah", "suka menolong"),
      P("L2", "Menurut surah At-Takatsur, manusia terus bermegah-megahan sampai ...", "masuk ke dalam kubur", "lulus sekolah", "menjadi dewasa", "pergi haji"),
      I("L2", "Pada hari kiamat manusia akan ditanya tentang ... yang telah diberikan Allah (At-Takatsur ayat 8).", "nikmat"),
      U("L3", "Berikan dua contoh sikap bermegah-megahan pada anak seusiamu dan satu cara menghindarinya sesuai pesan surah At-Takatsur!", "Contoh benar: memamerkan mainan, gawai, atau pakaian mahal kepada teman; membanggakan harta orang tua; membandingkan barang dengan teman. Cara menghindari: bersyukur, hidup sederhana, berbagi dengan teman. Skor sebanding jumlah contoh dan cara yang benar."),
      /* QS. Al-Qari'ah */
      P("L1", "Al-Qari'ah berarti ...", "hari kiamat (hari yang menggetarkan)", "hari raya", "hari libur", "hari Jumat"),
      P("L2", "Surah Al-Qari'ah menggambarkan manusia pada hari kiamat seperti ... yang beterbangan.", "anai-anai", "semut", "lebah", "burung"),
      P("L2", "Surah Al-Qari'ah menggambarkan gunung pada hari kiamat seperti ...", "bulu yang dihambur-hamburkan", "batu yang kokoh", "pasir yang tenang", "awan yang putih"),
      P("L2", "Orang yang berat timbangan amal baiknya akan mendapat kehidupan yang ...", "memuaskan", "sulit", "sempit", "menyedihkan"),
      I("L2", "Orang yang ringan timbangan amalnya akan kembali ke neraka ... (Al-Qari'ah).", "Hawiyah"),
      /* QS. Az-Zalzalah */
      P("L1", "Zalzalah berarti ...", "guncangan (gempa)", "banjir", "angin", "petir"),
      P("L2", "Menurut surah Az-Zalzalah, pada hari kiamat bumi akan ... beritanya.", "menceritakan", "menyembunyikan", "melupakan", "mengubah"),
      P("L2", "Menurut surah Az-Zalzalah, orang yang berbuat baik seberat zarah akan ... balasannya.", "melihat", "melupakan", "menolak", "menyembunyikan"),
      U("L3", "Jelaskan pesan surah Az-Zalzalah ayat 7–8 dan berikan satu contoh kebaikan kecil yang tidak boleh diremehkan!", "Setiap perbuatan, sekecil apa pun, akan diperlihatkan dan dibalas: kebaikan dibalas kebaikan, keburukan dibalas keburukan. Contoh kebaikan kecil: tersenyum kepada teman, membuang sampah pada tempatnya, mengucapkan terima kasih. Skor sebanding ketepatan pesan dan contoh.")
    ]
  };

  const INFO = window.BANK_SOAL_AQH_INFO;
  if (INFO && INFO["aqh-B-8"] && INFO["aqh-B-8"].rujukan.indexOf("Al-Ma'un") < 0) {
    INFO["aqh-B-8"].rujukan += "; QS. Al-Ma'un (7 ayat); QS. At-Takatsur (8 ayat); QS. Al-Qari'ah (11 ayat); QS. Az-Zalzalah (8 ayat)";
  }

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
