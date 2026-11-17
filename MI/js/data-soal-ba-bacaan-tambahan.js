/* ============================================================
   SI MAMBA - js/data-soal-ba-bacaan-tambahan.js
   TAMBAHAN bank soal DRAF Bahasa Arab MI Fase A-C: soal DIALOG dan BACAAN PENDEK berharakat.
   Latar: bank Bahasa Arab yang ada hampir seluruhnya soal arti kosakata (L1). SK Dirjen Pendis No. 9941 Tahun 2025
   (Bahasa Arab MI) meminta murid Fase B mengidentifikasi kalimat sapaan dan pertanyaan, dan murid Fase C
   mengidentifikasi informasi dari bacaan sederhana; Fase A mengenali pola kalimat sederhana.
   Isi: 2 soal per TP (kunci ba-A-1..10, ba-B-1..13, ba-C-1..10), kebanyakan L2, dua soal L3 (ba-C-6, ba-C-8).
   Kosakata dan pola kalimat mengikuti tema TP; teks bacaan ditulis ulang oleh penyusun (bukan salinan buku ajar).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang. Status DRAF: guru wajib memeriksa soal, harakat,
   dan kunci jawaban, serta mencocokkannya dengan buku ajar madrasah.
   WAJIB dimuat SESUDAH js/data-soal-semua.js (dan sebelum perangkat-*.js).
   JIKA urutan TP di data-tp-mi.js diubah, kunci di file ini harus ikut disesuaikan.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];
  const TAMBAH = {
    /* ===================== FASE A ===================== */
    "ba-A-1": [
      P("L2", "Lengkapi dialog: — مَا اسْمُكَ؟ — ........", "اسْمِي أَحْمَدُ", "هَذَا قَلَمٌ", "هِيَ أُمِّي", "أَنَا مِنْ إِنْدُونِيسِيَا"),
      I("L2", "Lengkapi dialog: — مَا اسْمُكِ؟ — ........ فَاطِمَةُ.", "اسْمِي")
    ],
    "ba-A-2": [
      P("L2", "Arti kalimat “هَذِهِ أُمِّي” adalah ...", "Ini ibuku", "Ini ayahku", "Dia kakekku", "Itu ibuku"),
      P("L2", "Pertanyaan “مَنْ هُوَ؟” sambil menunjuk seorang laki-laki dijawab dengan ...", "هُوَ أَبِي", "هِيَ أُمِّي", "هَذَا بَيْتٌ", "أَنَا تِلْمِيذٌ")
    ],
    "ba-A-3": [
      P("L2", "Arti kalimat “هَذَا بَيْتٌ كَبِيرٌ” adalah ...", "Ini rumah yang besar", "Ini rumah yang kecil", "Ini kamar yang besar", "Itu rumah yang besar"),
      I("L2", "Lengkapi: هَذِهِ غُرْفَةٌ ........ (bersih).", "نَظِيفَةٌ")
    ],
    "ba-A-4": [
      P("L2", "Pertanyaan “مَا هَذَا؟” sambil menunjuk sebuah pena dijawab dengan ...", "هَذَا قَلَمٌ", "هَذِهِ سَبُّورَةٌ", "هَذَا مُدَرِّسٌ", "هَذِهِ مَدْرَسَةٌ"),
      P("L2", "Arti kalimat “هَذَا فَصْلِي” adalah ...", "Ini kelasku", "Ini guruku", "Ini bukuku", "Itu kelasku")
    ],
    "ba-A-5": [
      P("L2", "Kalimat “هِوَايَتِي السِّبَاحَةُ” adalah jawaban untuk pertanyaan ...", "مَا هِوَايَتُكَ؟", "مَا اسْمُكَ؟", "مَنْ هُوَ؟", "أَيْنَ بَيْتُكَ؟"),
      I("L2", "Lengkapi dialog: — مَا هِوَايَتُكَ؟ — ........ الْقِرَاءَةُ.", "هِوَايَتِي")
    ],
    "ba-A-6": [
      P("L2", "Arti kalimat “أُحِبُّ الْمَوْزَ” adalah ...", "Aku suka pisang", "Aku makan pisang", "Aku membeli pisang", "Aku punya pisang"),
      I("L2", "Arti kalimat “أُحِبُّ الْعِنَبَ” adalah Aku suka ....", "anggur")
    ],
    "ba-A-7": [
      P("L2", "Arti kalimat “الْبَابُ أَبْيَضُ” adalah ...", "Pintunya putih", "Pintunya hitam", "Pintunya merah", "Pintunya biru"),
      I("L2", "Lengkapi dialog: — مَا لَوْنُ الْمَوْزِ؟ — لَوْنُهُ ........ (kuning).", "أَصْفَرُ")
    ],
    "ba-A-8": [
      P("L2", "Arti kalimat “أَرْكَبُ السَّيَّارَةَ” adalah ...", "Aku naik mobil", "Aku membeli mobil", "Aku melihat mobil", "Aku mencuci mobil"),
      I("L2", "Lengkapi: أَرْكَبُ ........ إِلَى جَاكَرْتَا. (pesawat)", "الطَّائِرَةَ")
    ],
    "ba-A-9": [
      P("L2", "Arti kalimat “هَذَا جَبَلٌ عَالٍ” adalah ...", "Ini gunung yang tinggi", "Ini sungai yang panjang", "Ini laut yang luas", "Ini pohon yang besar"),
      I("L2", "Lengkapi: ........ جَمِيلٌ. (Laut itu indah.)", "الْبَحْرُ")
    ],
    "ba-A-10": [
      P("L2", "Membaca kalimat dalam buku termasuk keterampilan ...", "الْقِرَاءَةُ", "الْكَلَامُ", "الِاسْتِمَاعُ", "الْكِتَابَةُ"),
      P("L2", "Mendengarkan guru membacakan kosakata termasuk keterampilan ...", "الِاسْتِمَاعُ", "الْقِرَاءَةُ", "الْكِتَابَةُ", "الْكَلَامُ")
    ],
    /* ===================== FASE B ===================== */
    "ba-B-1": [
      P("L2", "Dalam dialog “مَا هَذَا الدَّرْسُ؟ — هَذَا دَرْسُ اللُّغَةِ الْعَرَبِيَّةِ”, pelajaran yang disebut adalah ...", "bahasa Arab", "matematika", "sejarah", "olahraga"),
      I("L2", "Lengkapi: أُحِبُّ دَرْسَ ........ (matematika).", "الرِّيَاضِيَّاتِ")
    ],
    "ba-B-2": [
      P("L2", "Arti kalimat “الْقِطَّةُ تَشْرَبُ الْحَلِيبَ” adalah ...", "Kucing itu minum susu", "Kucing itu makan ikan", "Anjing itu minum susu", "Kuda itu minum susu"),
      I("L2", "Arti kalimat “الْكَلْبُ يَنْبَحُ” adalah Anjing itu ....", "menggonggong")
    ],
    "ba-B-3": [
      P("L2", "Dalam dialog “مَاذَا أَصَابَكَ؟ — أَصَابَنِي الصُّدَاعُ”, penyakit yang dialami adalah ...", "sakit kepala", "demam", "batuk", "sakit gigi"),
      I("L2", "Lengkapi: أَصَابَنِي ........ (batuk).", "السُّعَالُ")
    ],
    "ba-B-4": [
      P("L2", "Arti kalimat “أَلْعَبُ كُرَةَ الْقَدَمِ كُلَّ يَوْمٍ” adalah ...", "Aku bermain sepak bola setiap hari", "Aku menonton sepak bola setiap hari", "Aku bermain bola voli setiap hari", "Aku bermain sepak bola setiap pekan"),
      I("L2", "Lengkapi dialog: — هَلْ تُحِبُّ السِّبَاحَةَ؟ — نَعَمْ، ........ السِّبَاحَةَ. (Ya, aku suka)", "أُحِبُّ")
    ],
    "ba-B-5": [
      P("L2", "Jawaban “هِيَ صَدِيقَتِي” menunjukkan bahwa yang ditanyakan adalah ...", "teman perempuan", "teman laki-laki", "guru perempuan", "ibu"),
      I("L2", "Lengkapi: أَحْمَدُ صَدِيقِي، ........ نَشِيطٌ. (Dia rajin.)", "هُوَ")
    ],
    "ba-B-6": [
      P("L2", "Arti kalimat “فِي الْحَدِيقَةِ أَزْهَارٌ جَمِيلَةٌ” adalah ...", "Di taman ada bunga-bunga yang indah", "Di taman ada pohon yang besar", "Di rumah ada bunga yang indah", "Di taman ada kupu-kupu yang cantik"),
      I("L2", "Lengkapi: ........ الْحَدِيقَةِ شَجَرَةٌ كَبِيرَةٌ. (Di taman ada pohon besar.)", "فِي")
    ],
    "ba-B-7": [
      P("L2", "Jawaban yang tepat untuk pertanyaan “أَيْنَ تَسْكُنُ؟” adalah ...", "أَسْكُنُ فِي جَاكَرْتَا", "اسْمِي أَحْمَدُ", "هِوَايَتِي الرَّسْمُ", "أَنَا طَبِيبٌ"),
      I("L2", "Lengkapi dialog: — ........ تَسْكُنُ؟ — أَسْكُنُ فِي سُورَابَايَا. (Di mana)", "أَيْنَ")
    ],
    "ba-B-8": [
      P("L2", "Arti kalimat “أَبِي فَلَّاحٌ” adalah ...", "Ayahku seorang petani", "Ayahku seorang dokter", "Ayahku seorang guru", "Ayahku seorang pilot"),
      I("L2", "Lengkapi: هُوَ ........ يُعَالِجُ الْمَرْضَى. (dokter)", "طَبِيبٌ")
    ],
    "ba-B-9": [
      P("L2", "Seorang murid ingin menjadi guru. Kalimat yang diucapkannya adalah ...", "أُرِيدُ أَنْ أَكُونَ مُدَرِّسًا", "أَنَا تِلْمِيذٌ", "هِوَايَتِي الْقِرَاءَةُ", "اسْمِي أَحْمَدُ"),
      I("L2", "Lengkapi: أُرِيدُ أَنْ أَكُونَ ........ (pilot).", "طَيَّارًا")
    ],
    "ba-B-10": [
      P("L2", "Arti kalimat “فِي غُرْفَةِ النَّوْمِ سَرِيرٌ” adalah ...", "Di kamar tidur ada tempat tidur", "Di dapur ada kulkas", "Di kamar tidur ada kursi", "Di ruang tamu ada tempat tidur"),
      I("L2", "Lengkapi: فِي الْمَطْبَخِ ........ (kulkas).", "ثَلَّاجَةٌ")
    ],
    "ba-B-11": [
      P("L2", "Arti kalimat “هَذَا عَمِّي وَهَذِهِ عَمَّتِي” adalah ...", "Ini pamanku (saudara ayah) dan ini bibiku (saudari ayah)", "Ini pamanku (saudara ibu) dan ini bibiku (saudari ibu)", "Ini kakekku dan ini nenekku", "Ini ayahku dan ini ibuku"),
      I("L2", "Lengkapi: أَخُو أَبِي هُوَ ........ (pamanku).", "عَمِّي")
    ],
    "ba-B-12": [
      P("L2", "Arti kalimat “إِنْدُونِيسِيَا وَطَنِي” adalah ...", "Indonesia tanah airku", "Indonesia bahasaku", "Indonesia pulauku", "Indonesia benderaku"),
      I("L2", "Lengkapi: عَلَمُ إِنْدُونِيسِيَا أَحْمَرُ وَ ........ (putih).", "أَبْيَضُ")
    ],
    "ba-B-13": [
      P("L2", "Menulis nama dan alamat dalam bahasa Arab termasuk keterampilan ...", "الْكِتَابَةُ", "الْقِرَاءَةُ", "الِاسْتِمَاعُ", "الْكَلَامُ"),
      P("L2", "Mendengarkan rekaman percakapan lalu menjawab pertanyaan termasuk keterampilan ...", "الِاسْتِمَاعُ", "الْكِتَابَةُ", "الْقِرَاءَةُ", "الْكَلَامُ")
    ],
    /* ===================== FASE C (bacaan sederhana) ===================== */
    "ba-C-1": [
      P("L2", "Bacaan: “لِي عَيْنَانِ وَأُذُنَانِ وَفَمٌ وَاحِدٌ. أَنْظُرُ بِعَيْنَيَّ وَأَسْمَعُ بِأُذُنَيَّ.” Anggota tubuh yang dipakai untuk mendengar adalah ...", "telinga", "mata", "mulut", "hidung"),
      I("L2", "Bacaan: “أَنْظُرُ بِعَيْنَيَّ.” Anggota tubuh yang dipakai untuk melihat adalah ....", "mata")
    ],
    "ba-C-2": [
      P("L2", "Bacaan: “ذَهَبْتُ إِلَى حَدِيقَةِ الْحَيَوَانِ. رَأَيْتُ أَسَدًا كَبِيرًا وَقِرْدًا صَغِيرًا.” Hewan besar yang dilihat dalam bacaan adalah ...", "singa", "monyet", "gajah", "kuda"),
      I("L2", "Dalam kalimat “رَأَيْتُ قِرْدًا صَغِيرًا”, kata قِرْدٌ berarti ....", "monyet")
    ],
    "ba-C-3": [
      P("L2", "Bacaan: “فِي غُرْفَةِ الِاسْتِقْبَالِ أَرِيكَةٌ وَطَاوِلَةٌ. وَفِي غُرْفَةِ الدِّرَاسَةِ مَكْتَبٌ وَكُرْسِيٌّ.” Benda yang ada di ruang belajar adalah ...", "meja tulis dan kursi", "sofa dan meja", "tempat tidur dan lemari", "kulkas dan televisi"),
      I("L2", "Lengkapi: فِي غُرْفَةِ الدِّرَاسَةِ ........ وَكُرْسِيٌّ. (meja tulis)", "مَكْتَبٌ")
    ],
    "ba-C-4": [
      P("L2", "Bacaan: “أَذْهَبُ إِلَى الْمَكْتَبَةِ كُلَّ يَوْمِ خَمِيسٍ. أَقْرَأُ قِصَّةً جَمِيلَةً.” Kegiatan di perpustakaan menurut bacaan adalah ...", "membaca cerita", "menulis surat", "bermain bola", "makan bersama"),
      I("L2", "Arti “قِصَّةٌ” adalah ....", "cerita")
    ],
    "ba-C-5": [
      P("L2", "Bacaan: “فِي الْمَقْصِفِ أَشْتَرِي خُبْزًا وَعَصِيرًا. الْخُبْزُ لَذِيذٌ.” Makanan dan minuman yang dibeli di kantin adalah ...", "roti dan jus", "nasi dan teh", "kue dan susu", "buah dan air putih"),
      I("L2", "Arti “لَذِيذٌ” adalah ....", "enak (lezat)")
    ],
    "ba-C-6": [
      P("L2", "Bacaan: “أَذْهَبُ إِلَى الْمَدْرَسَةِ فِي السَّاعَةِ السَّادِسَةِ وَالنِّصْفِ صَبَاحًا.” Murid berangkat ke madrasah pada pukul ...", "06.30", "06.00", "07.30", "06.15"),
      P("L3", "Arti “السَّاعَةُ السَّابِعَةُ إِلَّا رُبْعًا” adalah pukul ...", "06.45", "07.15", "07.45", "06.15")
    ],
    "ba-C-7": [
      P("L2", "Bacaan: “أُحِبُّ اللُّغَةَ الْعَرَبِيَّةَ لِأَنَّهَا لُغَةُ الْقُرْآنِ.” Alasan penulis menyukai bahasa Arab adalah ...", "karena bahasa Arab adalah bahasa Al-Qur'an", "karena bahasa Arab mudah dipelajari", "karena bahasa Arab adalah bahasa ibunya", "karena disuruh oleh gurunya"),
      I("L2", "Lengkapi: أُحِبُّ اللُّغَةَ ........ (Arab).", "الْعَرَبِيَّةَ")
    ],
    "ba-C-8": [
      P("L2", "Dalam dialog “إِلَى أَيْنَ ذَهَبْتَ؟ — ذَهَبْتُ إِلَى شَاطِئِ الْبَحْرِ”, tempat yang dikunjungi saat liburan adalah ...", "pantai", "gunung", "kebun binatang", "desa"),
      P("L2", "Arti kalimat “قَضَيْتُ الْعُطْلَةَ فِي بَيْتِ جَدِّي” adalah ...", "Aku menghabiskan liburan di rumah kakekku", "Aku menghabiskan liburan di rumah pamanku", "Aku menghabiskan liburan di madrasah", "Aku akan menghabiskan liburan di rumah kakekku"),
      U("L3", "Tulislah dua kalimat sederhana tentang kegiatan liburanmu memakai pola “ذَهَبْتُ إِلَى ....”! Boleh dengan lafal latin.", "Dua kalimat yang tepat dan sesuai topik liburan, mis. ذَهَبْتُ إِلَى بَيْتِ جَدِّي. زُرْتُ الْقَرْيَةَ. Skor 50 untuk tiap kalimat yang tepat.")
    ],
    "ba-C-9": [
      P("L2", "Bacaan: “ذَهَبْنَا فِي رِحْلَةٍ إِلَى الْجَبَلِ. حَمَلْنَا خَيْمَةً وَطَعَامًا.” Barang yang dibawa saat piknik adalah ...", "tenda dan makanan", "sepeda dan bola", "buku dan pena", "perahu dan jaring"),
      I("L2", "Lengkapi: ذَهَبْنَا فِي ........ إِلَى الْحَدِيقَةِ. (piknik)", "رِحْلَةٍ")
    ],
    "ba-C-10": [
      P("L2", "Menyampaikan hasil belajar di depan kelas, baik lisan maupun dengan media, disebut keterampilan ...", "mempresentasikan", "menyimak", "memirsa", "menulis"),
      P("L2", "Mengamati gambar atau video lalu menjelaskan isinya termasuk keterampilan ...", "memirsa", "menyimak", "menulis", "membaca")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
