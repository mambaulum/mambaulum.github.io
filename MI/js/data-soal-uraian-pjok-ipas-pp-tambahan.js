/* ============================================================
   SI MAMBA - js/data-soal-uraian-pjok-ipas-pp-tambahan.js
   TAMBAHAN bank soal DRAF: +1 Uraian untuk 13 TP mapel umum yang di bank gabungan baru punya 1 uraian, supaya dua kelas
   dalam satu fase tidak mendapat uraian yang sama persis (perangkat-soal.js membagi urutan soal ganjil/genap antar kelas).
   Cakupan: PJOK (pjok-A-6, B-6, B-7, C-6, C-7, C-8), IPAS (ipas-B-6, B-9, B-10, B-11, B-12, C-10),
            Pendidikan Pancasila (pp-C-7).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang. Isi soal memakai fakta yang sudah ada di bank
   untuk TP yang sama, disusun dalam bentuk pertanyaan yang berbeda dari uraian lama.
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban.
   WAJIB dimuat SESUDAH js/data-soal-semua.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    /* ---------- Pendidikan Pancasila ---------- */
    "pp-C-7": [
      U("L2", "Jelaskan arti bela negara dan nasionalisme, serta sebutkan satu contoh bela negara di lingkungan tempat tinggalmu!", "Bela negara: sikap dan tindakan untuk membela serta menjaga negara. Nasionalisme: semangat cinta tanah air. Contoh: menjaga kerukunan di lingkungan sekitar, menaati aturan, ikut kerja bakti. Skor sebanding jumlah jawaban yang benar.")
    ],
    /* ---------- PJOK ---------- */
    "pjok-A-6": [
      U("L2", "Apa yang harus kamu lakukan jika diajak pergi oleh orang asing? Jelaskan juga mengapa bermain di dekat jalan raya berbahaya!", "Menolak dan memberi tahu orang dewasa tepercaya (orang tua atau guru). Bermain di dekat jalan raya berbahaya karena dapat tertabrak kendaraan. Skor separuh untuk masing-masing.")
    ],
    "pjok-B-6": [
      U("L2", "Sebutkan komponen makanan bergizi seimbang, serta tuliskan manfaat olahraga teratur dan manfaat minum air putih yang cukup!", "Makanan bergizi seimbang: nasi (makanan pokok), lauk, sayur, dan buah. Olahraga teratur membuat tubuh bugar. Minum air putih yang cukup mencegah tubuh kekurangan cairan. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-B-7": [
      U("L2", "Tuliskan kepanjangan P3K dan sebutkan tiga isi kotak P3K sekolah!", "Pertolongan Pertama pada Kecelakaan. Isi kotak P3K, contoh: plester, kasa, antiseptik, perban, obat merah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-C-6": [
      U("L2", "Apa yang dimaksud perilaku sedenter? Sebutkan satu risikonya bagi kesehatan dan satu cara mencegahnya!", "Perilaku sedenter: duduk atau berbaring terlalu lama tanpa banyak bergerak (misalnya terlalu lama bermain gawai). Risiko: kegemukan (obesitas). Pencegahan: olahraga teratur dan makan bergizi.")
    ],
    "pjok-C-7": [
      U("L2", "Tuliskan fungsi karbohidrat dan protein beserta satu contoh makanan sumbernya, serta makanan yang banyak mengandung vitamin dan mineral!", "Karbohidrat: sumber tenaga utama, contoh nasi. Protein: membangun dan memperbaiki jaringan tubuh, contoh ikan, telur, atau tempe. Vitamin dan mineral banyak terdapat pada sayur dan buah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-C-8": [
      U("L2", "Jelaskan langkah pertolongan pertama pada dugaan patah tulang lengan dan sebutkan alat yang dipakai untuk menyangga anggota tubuh yang diduga patah!", "Menjaga lengan tidak bergerak, menyangga sementara dengan bidai, lalu segera mencari bantuan medis. Alat penyangga: bidai.")
    ],
    /* ---------- IPAS ---------- */
    "ipas-B-6": [
      U("L2", "Sebutkan satu contoh sumber daya alam yang dapat diperbarui dan satu yang tidak dapat diperbarui, serta satu cara mencegah banjir!", "Dapat diperbarui: tumbuhan (hewan, air). Tidak dapat diperbarui: minyak bumi (batu bara, gas alam). Mencegah banjir: tidak membuang sampah ke sungai. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-9": [
      U("L2", "Mengapa kita harus menghormati budaya daerah lain? Tuliskan juga satu cara melestarikan budaya daerah!", "Indonesia memiliki banyak suku bangsa, bahasa, dan budaya daerah yang berbeda sehingga kita mau mengenal dan menghormatinya. Melestarikan: mempelajari tarian daerah, memakai pakaian adat, menggunakan bahasa daerah.")
    ],
    "ipas-B-10": [
      U("L2", "Sebutkan dua contoh sumber sejarah di kampung dan jelaskan siapa sesepuh serta mengapa ia membantu menelusuri sejarah kampung!", "Sumber sejarah: prasasti, bangunan tua, foto lama. Sesepuh adalah orang yang dituakan dan mengetahui cerita masa lalu kampung, sehingga dapat bercerita tentang asal-usul dan peristiwa penting kampung. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-11": [
      U("L2", "Sebutkan fungsi utama uang serta manfaat menabung dan manfaat mencatat uang masuk dan keluar!", "Fungsi uang: alat tukar. Menabung: memenuhi kebutuhan di masa depan. Mencatat uang masuk dan keluar: mengetahui ke mana uang digunakan. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-12": [
      U("L2", "Urutkan langkah penyelidikan sederhana mulai dari mengamati sampai menarik kesimpulan, dan jelaskan manfaat mencatat hasil dalam tabel!", "Urutan: mengamati, membuat pertanyaan dan prediksi, melakukan percobaan dan mengumpulkan data, mencatat hasil, mengolah data lalu menarik kesimpulan. Tabel memudahkan membandingkan hasil pengamatan. Skor sebanding kelengkapan langkah.")
    ],
    "ipas-C-10": [
      U("L2", "Tabel: hari ke-1 tinggi tanaman 2 cm, hari ke-3 4 cm, hari ke-5 6 cm. Tuliskan kesimpulannya, jenis grafik yang cocok, dan alasan variabel lain harus dijaga tetap sama!", "Kesimpulan: tinggi tanaman bertambah seiring waktu (2 cm setiap 2 hari). Grafik yang cocok: grafik garis. Variabel lain dijaga tetap sama agar percobaan adil, sehingga perubahan hanya disebabkan variabel bebas. Skor sebanding jumlah jawaban yang benar.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
