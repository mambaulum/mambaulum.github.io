/* SI MAMBA - js/data-soal-tambahan-gabung.js
   GABUNGAN otomatis dari _sumber-gabung/ (jangan diedit langsung; jalankan gabung-soal.sh).
   Urutan: data-soal-ba-bacaan-tambahan data-soal-aqh-surah-b-tambahan data-soal-umum-remap data-soal-umum-lengkap-a data-soal-umum-lengkap-mtk data-soal-umum-lengkap-seni */

/* ---- awal: data-soal-ba-bacaan-tambahan.js ---- */
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

;

/* ---- awal: data-soal-aqh-surah-b-tambahan.js ---- */
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

;

/* ---- awal: data-soal-umum-remap.js ---- */
/* ============================================================
   SI MAMBA - js/data-soal-umum-remap.js
   PEMETAAN ULANG kunci soal mapel umum (Matematika, PP, PJOK, IPAS, Seni) ke urutan TP terbaru di js/data-tp-umum.js (versi 17 Nov 2026).
   Latar: soal lama ditulis untuk daftar TP versi sebelum audit (Seni 4 TP per fase, IPAS/PJOK/PP lebih sedikit), sehingga
   banyak soal berada di bawah TP yang salah (mis. soal musik di bawah TP Seni Rupa, soal wujud zat di bawah TP siklus hidup).
   File ini TIDAK mengubah isi soal; hanya memindahkan soal ke kunci TP yang topiknya paling sesuai (berdasarkan isi soal).
   B. Indonesia, B. Inggris, dan semua mapel PAI tidak disentuh.
   Matematika (v8.484): soal lama mengikuti urutan topik lama (mis. pecahan di A-6, perkalian di A-5, waktu di A-9); dipindah ke TP Kurikulum Merdeka
   yang sesuai. Soal berhitung dengan titik-titik dan pola dipisah berdasarkan bentuk kalimatnya. Rentang bilangan soal tidak diubah (beberapa lebih besar
   dari batas TP, mis. operasi di atas 100.000); guru perlu menelaah.
   Aturan: [kunciLama, kunciBaru]                      = semua soal pindah ke kunciBaru
           [kunciLama, kunciBawaan, [[/regex/, kunciX]]] = soal yang teksnya cocok regex pindah ke kunciX, sisanya ke kunciBawaan
   Soal yang sama persis tidak digandakan. Sesudah file ini, js/data-soal-umum-lengkap-*.js melengkapi TP yang masih kosong.
   Status DRAF: pemetaan berdasarkan topik soal; guru bidang wajib menelaah.
   WAJIB dimuat SESUDAH semua js/data-soal-*.js lain dan SEBELUM js/data-soal-umum-lengkap-*.js dan perangkat-*.js.
============================================================ */
(function () {
  'use strict';
  const B = window.BANK_SOAL_MI;
  if (!B || window.__UMUM_REMAP_SELESAI) return;
  window.__UMUM_REMAP_SELESAI = true;

  const R = [
    /* ---------- Pendidikan Pancasila ---------- */
    ['pp-A-1', 'pp-A-1'], ['pp-A-5', 'pp-A-1'],            // bendera, lagu kebangsaan, Garuda, sila
    ['pp-A-2', 'pp-A-2'], ['pp-A-3', 'pp-A-3'], ['pp-A-4', 'pp-A-4'],
    ['pp-B-1', 'pp-B-1'], ['pp-B-2', 'pp-B-1'],            // makna sila dan penerapannya (musyawarah, gotong royong)
    ['pp-B-3', 'pp-B-4'],                                  // hak dan kewajiban
    ['pp-B-4', 'pp-B-5'],                                  // keragaman dan toleransi
    ['pp-B-5', 'pp-B-2'], ['pp-B-6', 'pp-B-2'],            // persatuan, bahasa persatuan, cinta tanah air
    ['pp-C-1', 'pp-C-2'],                                  // Pancasila sebagai dasar negara dan satu kesatuan
    ['pp-C-2', 'pp-C-3'], ['pp-C-3', 'pp-C-3'],            // hak, kewajiban, UUD dan lembaga negara
    ['pp-C-4', 'pp-C-4'],                                  // musyawarah
    ['pp-C-5', 'pp-C-6'],                                  // wilayah dan kerja sama (ASEAN)
    ['pp-C-6', 'pp-C-7'],                                  // bela negara

    /* ---------- PJOK ---------- */
    ['pjok-A-1', 'pjok-A-1'], ['pjok-A-2', 'pjok-A-1'], ['pjok-A-3', 'pjok-A-1'],   // lokomotor, nonlokomotor, manipulatif
    ['pjok-A-4', 'pjok-A-5'],                              // kebersihan dan makanan bergizi
    ['pjok-A-5', 'pjok-A-3'],                              // fair play dan kerja sama
    ['pjok-B-1', 'pjok-B-1'], ['pjok-B-2', 'pjok-B-2'],
    ['pjok-B-3', 'pjok-B-5'],                              // komponen kebugaran jasmani
    ['pjok-B-4', 'pjok-B-6'],                              // kebiasaan hidup sehat dan pola makan
    ['pjok-B-5', 'pjok-B-4'],                              // kerja sama dalam tim
    ['pjok-C-1', 'pjok-C-1'],                              // permainan bola besar dan kecil
    ['pjok-C-2', 'pjok-C-2'], ['pjok-C-3', 'pjok-C-2'],    // atletik dan senam
    ['pjok-C-4', 'pjok-C-5'],                              // kebugaran dan aktivitas teratur
    ['pjok-C-5', 'pjok-C-4'],                              // sportivitas dan aturan permainan

    /* ---------- IPAS ---------- */
    ['ipas-B-1', 'ipas-B-2'],                              // tumbuhan dan daur hidup
    ['ipas-B-2', 'ipas-B-3'],                              // wujud benda
    ['ipas-B-3', 'ipas-B-5'],                              // gaya
    ['ipas-B-4', 'ipas-B-4'],                              // energi dan bunyi
    ['ipas-B-5', 'ipas-B-6', [[/siang|malam|berputar|rotasi|revolusi/i, 'ipas-C-5']]],   // bumi berputar -> tata surya; sisanya SDA
    ['ipas-B-6', 'ipas-B-9'],                              // keragaman budaya
    ['ipas-B-7', 'ipas-C-9'],                              // kebutuhan, produksi, konsumsi
    ['ipas-B-8', 'ipas-B-7'],                              // norma dan interaksi sosial
    ['ipas-C-1', 'ipas-C-1'], ['ipas-C-2', 'ipas-C-2'],
    ['ipas-C-3', 'ipas-B-3'],                              // perubahan benda dan campuran
    ['ipas-C-4', 'ipas-C-4'],                              // listrik dan magnet (terdekat: energi)
    ['ipas-C-5', 'ipas-B-3', [[/banjir|sampah/i, 'ipas-B-6'], [/gempa/i, 'ipas-C-5']]], // siklus air -> perubahan wujud
    ['ipas-C-6', 'ipas-C-6'], ['ipas-C-7', 'ipas-C-7'],
    ['ipas-C-8', 'ipas-C-9', [[/menabung|uang|tabungan/i, 'ipas-B-11']]],               // ekonomi; menabung -> uang

    /* ---------- Matematika ---------- */
    ['mtk-A-1', 'mtk-A-1'], ['mtk-A-2', 'mtk-A-2'], ['mtk-A-3', 'mtk-A-3'],
    ['mtk-A-4', 'mtk-B-2'],                                // tambah/kurang sampai 100 (dalam batas TP B-2, sampai 1.000)
    ['mtk-A-5', 'mtk-B-3', [[/dibagi sama banyak/i, 'mtk-A-4']]],   // berbagi sama banyak -> A-4; perkalian/pembagian -> B-3
    ['mtk-A-6', 'mtk-A-4'],                                // pecahan setengah dan seperempat
    ['mtk-A-7', 'mtk-B-8', [[/lingkaran|segitiga|kotak/i, 'mtk-A-6'], [/^(\d+\s*[+\-]\s*\.{2,}|\.{2,}\s*[+\-]\s*\d+|Lengkapi:)/, 'mtk-A-5']]],
    ['mtk-A-8', 'mtk-A-8'],
    ['mtk-A-9', 'mtk-A-7'],                                // hari, bulan, jam (waktu)
    ['mtk-A-10', 'mtk-A-9', [[/depan|belakang|kanan|kiri/i, 'mtk-A-10']]],
    ['mtk-A-11', 'mtk-A-11'],
    ['mtk-B-1', 'mtk-B-1'], ['mtk-B-2', 'mtk-C-2'],        // tambah/kurang 4 angka
    ['mtk-B-3', 'mtk-B-3'],
    ['mtk-B-4', 'mtk-C-2'],                                // operasi hitung campuran
    ['mtk-B-5', 'mtk-B-5'], ['mtk-B-6', 'mtk-B-6'],
    ['mtk-B-7', 'mtk-B-8', [[/^(\.{2,}\s*[+\-]\s*\d+|\d+\s*[+\-]\s*\.{2,})/, 'mtk-B-7'], [/^\d+\s*[\u00d7:]\s*\.{2,}/, 'mtk-C-6']]],
    ['mtk-B-8', 'mtk-B-9'],                                // satuan panjang dan berat
    ['mtk-B-9', 'mtk-C-9'],                                // waktu
    ['mtk-B-10', 'mtk-C-8'],                               // keliling dan luas
    ['mtk-B-11', 'mtk-C-10', [[/^Persegi panjang/, 'mtk-B-11']]],   // bangun ruang -> C-10
    ['mtk-B-12', 'mtk-B-12'],
    ['mtk-C-1', 'mtk-C-1'], ['mtk-C-2', 'mtk-C-2'], ['mtk-C-3', 'mtk-C-3'], ['mtk-C-4', 'mtk-C-4'], ['mtk-C-5', 'mtk-C-5'],
    ['mtk-C-6', 'mtk-C-7'],                                // perbandingan, skala (penalaran proporsional)
    ['mtk-C-7', 'mtk-C-7', [[/\bn\b/, 'mtk-C-6']]],       // persamaan dengan n -> nilai yang belum diketahui
    ['mtk-C-8', 'mtk-B-9', [[/jam|menit|detik|pukul/i, 'mtk-C-9']]], // satuan -> B-9; waktu -> C-9
    ['mtk-C-9', 'mtk-C-8'],                                // luas bangun datar
    ['mtk-C-10', 'mtk-C-10'], ['mtk-C-11', 'mtk-C-10'],    // volume, jaring-jaring
    ['mtk-C-12', 'mtk-C-12']
  ];
  ['A', 'B', 'C'].forEach(function (f) {                   // Seni: 1 Rupa, 2 Musik, 3 Tari, 4 Teater (lama) -> TP pertama tiap bidang
    R.push(['seni-' + f + '-1', 'seni-' + f + '-1'], ['seni-' + f + '-2', 'seni-' + f + '-6'],
      ['seni-' + f + '-3', 'seni-' + f + '-11'], ['seni-' + f + '-4', 'seni-' + f + '-16']);
  });

  const snap = {};
  R.forEach(function (r) { if (!(r[0] in snap)) snap[r[0]] = (B[r[0]] || []).slice(); });
  Object.keys(snap).forEach(function (k) { delete B[k]; });

  const taruh = function (kunci, soal) {
    const arr = B[kunci] || (B[kunci] = []);
    if (!arr.some(function (x) { return x[2] === soal[2]; })) arr.push(soal);
  };
  R.forEach(function (r) {
    snap[r[0]].forEach(function (soal) {
      let tujuan = r[1];
      (r[2] || []).some(function (c) { if (c[0].test(String(soal[2]))) { tujuan = c[1]; return true; } return false; });
      taruh(tujuan, soal);
    });
  });
})();

;

/* ---- awal: data-soal-umum-lengkap-a.js ---- */
/* ============================================================
   SI MAMBA - js/data-soal-umum-lengkap-a.js
   Melengkapi soal DRAF untuk TP yang belum punya soal pada data-tp-umum.js versi 17 Nov 2026:
   Pendidikan Pancasila (pp-A-5, B-3, B-6, C-1, C-5; tambahan pp-C-6), PJOK (pjok-A-2, A-4, A-6, B-3, B-7, C-3, C-6, C-7, C-8),
   IPAS (ipas-B-1, B-8, B-10, B-11, B-12, C-3, C-5, C-8, C-10), serta B. Indonesia bin-C-6 (makna denotatif dan konotatif). Isi: 6 soal per TP (4 PG, 1 isian, 1 uraian); beberapa 5-7.
   Pada P(), pilihan pertama = jawaban benar (urutan diacak aplikasi). Soal yang bunyinya sama dengan soal yang ada tidak diulang.
   Status DRAF: guru wajib memeriksa soal, fakta, dan kunci jawaban.
   WAJIB dimuat SESUDAH js/data-soal-umum-remap.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];
  const TAMBAH = {
    /* ================= Pendidikan Pancasila ================= */
    "pp-A-5": [
      P("L1", "Tempat tinggal dan sekolahmu adalah bagian dari negara ...", "Indonesia", "Jepang", "Mesir", "Australia"),
      P("L1", "Singkatan NKRI adalah ...", "Negara Kesatuan Republik Indonesia", "Negara Kota Raya Indonesia", "Negara Kecil Republik Indonesia", "Negara Kesatuan Rakyat Indonesia"),
      P("L1", "Membersihkan kelas bersama-sama adalah contoh ... menjaga lingkungan.", "bekerja sama", "bermain sendiri", "menunda tugas", "bertengkar"),
      P("L2", "Membuang sampah pada tempatnya di sekolah menunjukkan sikap ...", "peduli lingkungan", "malas", "tidak peduli", "mementingkan diri sendiri"),
      I("L1", "Desa, kota, dan sekolah tempat kita belajar adalah bagian dari wilayah negara ....", "Indonesia"),
      U("L2", "Tuliskan dua kegiatan bersama teman untuk menjaga kebersihan lingkungan sekolah!", "Contoh benar: kerja bakti membersihkan kelas; piket menyapu halaman; menanam dan menyiram tanaman bersama; membuang sampah pada tempatnya. Skor sebanding jumlah kegiatan yang benar.")
    ],
    "pp-B-3": [
      P("L1", "Aturan yang dibuat di sekolah agar murid tertib disebut ...", "tata tertib", "dongeng", "jadwal piknik", "denah kelas"),
      P("L1", "Memakai seragam sesuai jadwal adalah contoh melaksanakan ...", "aturan sekolah", "permainan", "hukuman", "lomba"),
      P("L2", "Warga kampung menyepakati jadwal ronda malam. Sikap yang benar adalah ...", "ikut melaksanakan jadwal yang disepakati", "menolak karena malas", "datang kalau diingat saja", "menyuruh orang lain terus"),
      P("L2", "Datang ke sekolah tepat waktu bermanfaat agar ...", "pelajaran dimulai bersama dan tidak terganggu", "dapat bermain lebih lama", "tidak perlu belajar", "mendapat hadiah setiap hari"),
      I("L1", "Aturan yang dibuat supaya murid tertib di sekolah disebut tata ....", "tertib"),
      U("L2", "Tuliskan dua aturan di lingkungan tempat tinggalmu dan alasan pentingnya aturan itu!", "Contoh benar: membuang sampah pada tempatnya (agar bersih); tidak bermain di jalan raya (agar aman); menjaga ketenangan saat malam (agar tidak mengganggu tetangga). Skor sebanding jumlah aturan dan alasan yang benar.")
    ],
    "pp-B-6": [
      P("L1", "Urutan wilayah dari yang paling kecil adalah ...", "RT, RW, desa atau kelurahan, kecamatan", "kecamatan, desa, RW, RT", "RW, RT, kecamatan, desa", "desa, RT, kecamatan, RW"),
      P("L1", "Pemimpin di tingkat RT disebut ...", "Ketua RT", "camat", "bupati", "gubernur"),
      P("L1", "Pemimpin di tingkat kecamatan disebut ...", "camat", "Ketua RT", "kepala desa", "wali kota"),
      P("L2", "Kerja bakti membersihkan selokan di lingkungan RT menunjukkan ...", "kerja sama warga", "persaingan warga", "sikap tidak peduli", "sikap menang sendiri"),
      I("L1", "Beberapa RT bergabung membentuk satu ....", "RW"),
      U("L2", "Tuliskan nama RT, RW, desa/kelurahan, dan kecamatan tempat tinggalmu, lalu satu kegiatan kerja sama warga di sana!", "Jawaban sesuai data tempat tinggal siswa. Kegiatan kerja sama yang benar, misalnya kerja bakti, ronda, atau posyandu. Skor sebanding kelengkapan nama wilayah dan ketepatan kegiatan.")
    ],
    "pp-C-1": [
      P("L1", "Hari Lahir Pancasila diperingati setiap tanggal ...", "1 Juni", "17 Agustus", "1 Oktober", "28 Oktober"),
      P("L1", "Badan yang bersidang membahas dasar negara sebelum Indonesia merdeka adalah ...", "BPUPKI", "PBB", "DPR", "MPR"),
      P("L2", "Tokoh yang pada 1 Juni 1945 mengusulkan nama Pancasila sebagai dasar negara adalah ...", "Ir. Soekarno", "Ki Hajar Dewantara", "Jenderal Sudirman", "R.A. Kartini"),
      P("L2", "PPKI menetapkan Pancasila sebagai dasar negara pada tanggal ...", "18 Agustus 1945", "1 Juni 1945", "28 Oktober 1928", "10 November 1945"),
      I("L1", "Panitia yang beranggotakan sembilan orang dan merumuskan rancangan dasar negara disebut Panitia ....", "Sembilan"),
      U("L3", "Sebutkan dua sikap para perumus Pancasila yang dapat kamu teladani, beserta contoh penerapannya di sekolah!", "Contoh benar: mengutamakan persatuan (bekerja sama dalam kelompok); menghargai perbedaan pendapat (mendengarkan teman saat diskusi); mengutamakan kepentingan bersama; cinta tanah air. Skor sebanding ketepatan sikap dan contoh.")
    ],
    "pp-C-5": [
      P("L1", "Tari, pakaian adat, dan rumah adat merupakan contoh ... di Indonesia.", "keberagaman budaya", "bahan pangan", "alat transportasi", "peraturan sekolah"),
      P("L2", "Cara yang tepat melestarikan budaya daerah adalah ...", "ikut belajar tari atau musik daerah", "meninggalkan budaya lama", "mengejek budaya daerah lain", "tidak mau mengenalnya"),
      P("L2", "Sikap menghormati teman yang berbeda budaya ditunjukkan dengan ...", "tidak mengejek dan mau belajar budayanya", "menjauhinya", "menertawakan adatnya", "memaksanya mengikuti budayamu"),
      P("L3", "Hasil pengamatan keberagaman budaya di lingkunganmu paling tepat disajikan dalam ...", "poster berisi jenis budaya dan cara melestarikannya", "daftar nama teman sekelas yang hadir", "denah ruang kelas dan letak bangkunya", "jadwal piket kelas selama sebulan"),
      I("L1", "Menjaga dan merawat budaya agar tidak punah disebut ... budaya.", "melestarikan"),
      U("L3", "Tuliskan tiga contoh keberagaman budaya di lingkunganmu dan satu cara melestarikannya!", "Contoh benar: bahasa daerah, tarian daerah, pakaian adat, makanan khas, upacara adat, kesenian. Cara melestarikan: ikut sanggar, memakai bahasa daerah, mempelajari dan mementaskan kesenian. Skor sebanding jumlah contoh dan ketepatan cara.")
    ],
    "pp-C-6": [
      P("L1", "Wilayah yang terdiri atas beberapa kabupaten atau kota disebut ...", "provinsi", "kecamatan", "RW", "kelurahan"),
      P("L1", "Pemimpin sebuah provinsi disebut ...", "gubernur", "bupati", "wali kota", "camat"),
      P("L1", "Pemimpin sebuah kabupaten disebut ...", "bupati", "gubernur", "camat", "Ketua RT"),
      I("L1", "Ibu kota Provinsi Jawa Timur adalah ....", "Surabaya"),
      U("L2", "Tuliskan nama kabupaten/kota dan provinsi tempat tinggalmu, serta satu hal dari daerahmu yang membuatmu bangga!", "Jawaban sesuai data siswa. Hal yang dibanggakan masuk akal, misalnya budaya, makanan khas, tempat wisata. Skor sebanding kelengkapan nama dan alasan.")
    ],

    /* ================= PJOK ================= */
    "pjok-A-2": [
      P("L1", "Sebelum melompat, kita menekuk lutut agar lompatan menjadi lebih ...", "tinggi", "pendek", "lambat", "lemah"),
      P("L1", "Bergerak maju, mundur, dan ke samping menunjukkan gerak ke berbagai ...", "arah", "warna", "rasa", "bunyi"),
      P("L2", "Agar lemparan bola mengenai sasaran, kita sebaiknya ...", "mengarahkan pandangan ke sasaran", "memejamkan mata", "melempar sambil membelakangi sasaran", "melempar sekuat-kuatnya tanpa melihat"),
      P("L2", "Berlari sambil mengayunkan lengan membantu kita bergerak lebih ...", "seimbang dan cepat", "lambat", "kaku", "mudah jatuh"),
      I("L1", "Bergerak dengan cepat atau lambat disebut mengatur ... gerak.", "kecepatan"),
      U("L2", "Cobalah dua cara melempar bola ke dalam ember. Cara mana yang lebih tepat sasaran? Jelaskan alasannya!", "Jawaban benar menyebut satu cara yang lebih berhasil dengan alasan yang masuk akal, misalnya melempar dari bawah dengan mata tertuju ke ember lebih terkendali. Skor sebanding kejelasan perbandingan dan alasan.")
    ],
    "pjok-A-4": [
      P("L1", "Berlari, melompat tali, dan bersepeda termasuk aktivitas ...", "jasmani", "belajar membaca", "makan", "tidur"),
      P("L1", "Manfaat aktivitas jasmani adalah tubuh menjadi ...", "sehat dan kuat", "mudah lelah", "mudah sakit", "lemas"),
      P("L1", "Sebelum beraktivitas jasmani, kita melakukan ...", "pemanasan", "makan banyak", "tidur", "menonton televisi"),
      P("L2", "Setelah berolahraga, sebaiknya kita ...", "minum air putih dan beristirahat", "langsung tidur di lantai", "makan permen banyak-banyak", "mandi air es"),
      I("L1", "Gerakan meregangkan otot sebelum dan sesudah olahraga disebut ....", "peregangan"),
      U("L1", "Sebutkan tiga aktivitas jasmani yang kamu sukai dan satu manfaatnya!", "Contoh benar: berlari, bermain bola, lompat tali, bersepeda, senam. Manfaat: tubuh sehat, kuat, gembira. Skor sebanding jumlah aktivitas dan ketepatan manfaat.")
    ],
    "pjok-A-6": [
      P("L1", "Jika ada orang asing mengajakmu pergi, kamu harus ...", "menolak dan memberi tahu orang dewasa tepercaya", "ikut dengannya", "menerima permennya", "memberi tahu alamat rumahmu"),
      P("L1", "Orang dewasa tepercaya yang dapat dimintai bantuan, misalnya ...", "orang tua dan guru", "orang yang tidak dikenal", "teman sebaya saja", "siapa saja di jalan"),
      P("L2", "Kamu terluka di lapangan sekolah. Hal pertama yang dilakukan adalah ...", "memberi tahu guru", "menyembunyikan luka", "pulang sendiri", "diam saja"),
      P("L2", "Bermain di dekat jalan raya berbahaya karena ...", "dapat tertabrak kendaraan", "jalannya licin dan luas", "banyak pohon", "udaranya segar"),
      I("L1", "Jika merasa tidak aman, kita harus meminta bantuan kepada orang dewasa yang ....", "tepercaya"),
      U("L2", "Tuliskan dua orang dewasa tepercaya yang dapat kamu mintai bantuan dan satu situasi yang membuatmu harus meminta bantuan!", "Contoh benar: orang tua, guru, wali, kakak/kakek-nenek yang dikenal baik. Situasi: terluka, tersesat, diajak orang asing, merasa tidak aman. Skor sebanding ketepatan orang dan situasi.")
    ],
    "pjok-B-3": [
      P("L1", "Permainan yang adil dimainkan dengan mematuhi ...", "aturan", "keinginan sendiri", "suara paling keras", "pemain terkuat"),
      P("L2", "Agar tim mudah memasukkan bola ke gawang, strategi sederhana yang tepat adalah ...", "mengoper bola kepada teman yang tidak dijaga", "menahan bola sendiri sepanjang permainan", "menendang bola ke luar lapangan", "berdiri diam di tengah lapangan"),
      P("L2", "Jika wasit meniup peluit tanda pelanggaran, pemain harus ...", "menerima keputusan wasit", "memprotes keras", "meninggalkan lapangan", "melanjutkan permainan sendiri"),
      P("L2", "Teman satu timmu melakukan kesalahan. Sikap fair play adalah ...", "menyemangatinya", "memarahinya", "mengejeknya", "mengeluarkannya dari tim"),
      I("L1", "Sikap jujur dan menaati aturan dalam permainan disebut ....", "fair play"),
      U("L3", "Timmu kalah 0-2. Tuliskan satu strategi sederhana untuk memperbaiki permainan dan satu sikap fair play yang harus ditunjukkan!", "Contoh strategi: memperbanyak operan, membagi posisi, menjaga lawan secara bergantian. Sikap: menerima kekalahan, memberi selamat kepada lawan, tidak menyalahkan teman. Skor sebanding ketepatan strategi dan sikap.")
    ],
    "pjok-B-7": [
      P("L1", "Luka lecet kecil sebaiknya pertama-tama ...", "dibersihkan dengan air mengalir", "ditutup tanah", "digaruk", "dibiarkan terkena kotoran"),
      P("L1", "Singkatan P3K adalah Pertolongan Pertama pada ...", "Kecelakaan", "Kegiatan", "Kesehatan", "Keluarga"),
      P("L2", "Pergelangan kaki temanmu terkilir ringan. Langkah awal yang tepat adalah ...", "mengistirahatkan dan mengompres dingin", "memijatnya keras-keras", "menyuruhnya berlari", "memanaskan dengan api"),
      P("L2", "Isi kotak P3K sekolah antara lain ...", "plester, kasa, dan antiseptik", "buku dan pensil", "bola dan raket", "sapu dan pel"),
      I("L1", "Cairan untuk membersihkan luka kecil agar tidak infeksi disebut ....", "antiseptik"),
      U("L2", "Jelaskan langkah menolong temanmu yang lututnya lecet saat bermain!", "Langkah benar: mencuci tangan; membersihkan luka dengan air mengalir; memberi antiseptik; menutup dengan plester atau kasa bersih; memberi tahu guru. Skor sebanding jumlah langkah yang benar dan berurutan.")
    ],
    "pjok-C-3": [
      P("L1", "Strategi gerak yang efektif adalah strategi yang ...", "membantu mencapai tujuan dengan hasil yang baik", "paling rumit dan sulit dilakukan", "paling lama dan paling melelahkan", "dipilih tanpa melihat keadaan"),
      P("L2", "Untuk menguji dua cara menggiring bola, hal yang dibandingkan adalah ...", "ketepatan, kecepatan, dan kontrol bola", "warna sepatu", "nama pemain", "harga bola"),
      P("L2", "Setelah mencoba suatu strategi, langkah selanjutnya adalah ...", "mengevaluasi hasil dan memperbaikinya", "melupakannya", "mengganti pemain tanpa alasan", "berhenti bermain"),
      P("L3", "Tim basket sering kehilangan bola saat menggiring. Perubahan strategi yang paling efektif adalah ...", "lebih banyak mengoper dan bergerak ke ruang kosong", "menggiring bola lebih lama tanpa mengoper", "menahan bola di tempat sambil menunggu", "menghindari semua lawan dengan berlari mundur"),
      I("L1", "Menilai apakah strategi berhasil atau belum disebut ....", "evaluasi"),
      U("L3", "Rancang cara menguji dua strategi serah terima tongkat pada lari estafet, lalu tentukan dua kriteria penilaiannya!", "Jawaban benar memuat cara uji yang adil (kedua strategi dicoba pada kondisi sama, dicatat waktu/jatuhnya tongkat) dan dua kriteria, misalnya waktu tempuh dan kelancaran serah terima. Skor sebanding kelengkapan rancangan dan kriteria.")
    ],
    "pjok-C-6": [
      P("L1", "Kurang bergerak dan terlalu lama bermain gawai dapat meningkatkan risiko ...", "kegemukan (obesitas)", "tubuh semakin kuat", "daya tahan naik", "tulang bertambah padat"),
      P("L1", "Kebiasaan merokok berisiko menyebabkan penyakit ...", "paru-paru", "gigi tumbuh", "mata minus saja", "tulang patah"),
      P("L2", "Cara mencegah penyakit akibat gaya hidup tidak sehat adalah ...", "olahraga teratur dan makan bergizi", "begadang setiap malam", "sering makan makanan manis", "jarang bergerak"),
      P("L2", "Begadang setiap malam berdampak ...", "mengantuk dan sulit berkonsentrasi", "tubuh makin bugar", "nilai pasti naik", "daya tahan bertambah"),
      I("L1", "Perilaku duduk atau berbaring terlalu lama tanpa banyak bergerak disebut perilaku ....", "sedenter"),
      U("L3", "Hubungkan satu kebiasaan tidak sehat, risikonya bagi kesehatan, dan cara mencegahnya!", "Contoh benar: kurang bergerak -> kegemukan/penyakit -> rutin berolahraga; sering jajan manis -> gigi berlubang/diabetes -> kurangi gula; begadang -> sulit fokus -> tidur cukup. Skor sebanding ketepatan hubungan ketiganya.")
    ],
    "pjok-C-7": [
      P("L1", "Zat gizi sumber tenaga utama adalah ...", "karbohidrat", "vitamin", "air", "serat"),
      P("L1", "Zat gizi yang membangun dan memperbaiki jaringan tubuh adalah ...", "protein", "karbohidrat", "garam", "gula"),
      P("L2", "Vitamin dan mineral banyak terdapat pada ...", "sayur dan buah", "permen", "minuman bersoda", "keripik"),
      P("L2", "Menu sehat seimbang terdiri atas ...", "makanan pokok, lauk, sayur, buah, dan air", "nasi saja setiap hari tanpa lauk", "jajanan manis dan minuman bersoda", "lauk dan gorengan tanpa sayur"),
      I("L1", "Makanan berlemak berlebihan sebaiknya dikonsumsi secara ....", "terbatas"),
      U("L3", "Susunlah satu menu makan siang bergizi seimbang dan sebutkan zat gizi utamanya!", "Contoh benar: nasi (karbohidrat), ikan/tempe (protein), sayur bayam (vitamin dan mineral), jeruk (vitamin C), air putih. Skor sebanding kelengkapan menu dan ketepatan zat gizi.")
    ],
    "pjok-C-8": [
      P("L1", "Pertolongan pertama pada dugaan patah tulang lengan adalah ...", "menjaga lengan tidak bergerak lalu segera mencari bantuan medis", "menarik lengan agar lurus kembali", "memijat lengan kuat-kuat agar sembuh", "menyuruh korban tetap memakai lengan itu"),
      P("L2", "Pada prinsip RICE untuk cedera terkilir, huruf I berarti ...", "Ice (kompres dingin)", "Insulin", "Injak", "Ingat"),
      P("L2", "Pada luka yang berdarah cukup banyak, tindakan awal yang tepat adalah ...", "menekan luka dengan kain bersih", "membiarkan darah mengalir", "menaburkan tanah", "mengusap dengan tangan kotor"),
      P("L2", "Alat untuk menyangga sementara anggota tubuh yang diduga patah disebut ...", "bidai", "tali rafia", "bola", "kursi"),
      I("L1", "Pada prinsip RICE, huruf E berarti ... (meninggikan bagian yang cedera).", "Elevation"),
      U("L3", "Jelaskan langkah pertolongan pertama untuk temanmu yang terkilir sedang saat bermain, dan kapan ia perlu dibawa ke tenaga kesehatan!", "Langkah benar: hentikan aktivitas dan istirahatkan; kompres dingin; balut/tekan ringan; tinggikan bagian yang cedera (RICE). Dibawa ke tenaga kesehatan bila bengkak parah, nyeri hebat, tidak dapat digerakkan, atau diduga patah. Skor sebanding kelengkapan langkah dan ketepatan kapan dirujuk.")
    ],

    /* ================= IPAS ================= */
    "ipas-B-1": [
      P("L1", "Indra yang digunakan untuk melihat adalah ...", "mata", "telinga", "hidung", "lidah"),
      P("L1", "Lidah berfungsi sebagai indra ...", "pengecap", "peraba", "penglihatan", "pendengaran"),
      P("L2", "Kulit berfungsi untuk merasakan ...", "sentuhan, panas, dan dingin", "bau harum", "rasa manis", "suara"),
      P("L2", "Hidung membantu kita ...", "mencium bau", "melihat warna", "mendengar suara", "merasakan asin"),
      I("L1", "Jumlah panca indra manusia adalah ... macam.", "lima"),
      U("L2", "Sebutkan lima panca indra beserta fungsinya!", "Mata: melihat; telinga: mendengar; hidung: mencium bau; lidah: mengecap rasa; kulit: meraba/merasakan sentuhan, panas, dingin. Skor sebanding jumlah pasangan yang benar.")
    ],
    "ipas-B-8": [
      P("L1", "Alat untuk melihat letak kota tempat tinggal kita di permukaan bumi adalah ...", "peta", "kalender", "termometer", "penggaris"),
      P("L1", "Arah mata angin yang berlawanan dengan utara adalah ...", "selatan", "barat", "timur", "timur laut"),
      P("L2", "Tanda atau gambar kecil pada peta yang mewakili objek disebut ...", "simbol", "judul", "skala", "angka"),
      P("L2", "Kabupaten tempat tinggalmu berada di dalam wilayah ...", "provinsi", "RT", "dusun", "kelurahan"),
      I("L1", "Peta yang menunjukkan batas wilayah provinsi dan kabupaten disebut peta ....", "administrasi"),
      U("L2", "Tunjukkan letak kabupaten/kota tempat tinggalmu pada peta provinsi dan sebutkan satu kabupaten/kota yang berbatasan dengannya!", "Jawaban sesuai peta provinsi masing-masing; siswa menyebut letak (arah/posisi) dan satu wilayah yang berbatasan dengan benar. Skor sebanding ketepatan letak dan wilayah.")
    ],
    "ipas-B-10": [
      P("L1", "Cerita tentang asal-usul nama desa atau kampung termasuk ...", "sejarah lokal", "ramalan cuaca", "berita olahraga", "iklan"),
      P("L2", "Cara menelusuri sejarah kampungmu yang tepat adalah ...", "mewawancarai tokoh masyarakat yang dituakan", "menebak-nebak sendiri tanpa bertanya", "mengikuti kabar angin dari mana saja", "menonton film kartun di televisi"),
      P("L2", "Prasasti, bangunan tua, dan foto lama disebut ...", "sumber sejarah", "mainan", "perabot baru", "peralatan olahraga"),
      P("L3", "Warga kampung yang dulu bertani kini banyak berdagang karena lahan sawah berubah menjadi pusat keramaian. Hal ini menunjukkan ...", "kehidupan masyarakat berubah mengikuti perkembangan lingkungan", "warga kampung menjadi malas bekerja", "sejarah kampung tidak pernah berubah", "pertanian sama sekali tidak berguna"),
      I("L1", "Orang yang dituakan dan mengetahui cerita masa lalu kampung disebut ....", "sesepuh"),
      U("L3", "Susunlah tiga pertanyaan wawancara untuk menggali sejarah kampungmu dari seorang sesepuh!", "Contoh pertanyaan benar: Bagaimana asal-usul nama kampung ini? Apa pekerjaan warga dahulu? Peristiwa penting apa yang pernah terjadi? Skor sebanding jumlah pertanyaan yang relevan dan jelas.")
    ],
    "ipas-B-11": [
      P("L1", "Fungsi utama uang adalah sebagai ...", "alat tukar", "alat tulis", "bahan makanan", "alat olahraga"),
      P("L1", "Uang resmi yang digunakan di Indonesia adalah ...", "rupiah", "ringgit", "dolar", "baht"),
      P("L2", "Membeli barang yang dibutuhkan lebih dulu daripada yang hanya diinginkan menunjukkan ...", "pengelolaan uang yang bijak", "boros", "tidak punya rencana", "kikir"),
      P("L2", "Mencatat uang masuk dan uang keluar bermanfaat untuk ...", "mengetahui ke mana uang digunakan", "menambah jajan", "menghilangkan tabungan", "membuat uang cepat habis"),
      I("L1", "Menyisihkan sebagian uang saku untuk masa depan disebut ....", "menabung"),
      U("L2", "Tuliskan dua cara mengelola uang saku dengan bijak dan alasannya!", "Contoh benar: menabung sebagian (untuk kebutuhan mendatang); membeli yang dibutuhkan dahulu; mencatat pengeluaran (agar tidak boros). Skor sebanding jumlah cara dan alasan yang benar.")
    ],
    "ipas-B-12": [
      P("L1", "Kegiatan memperhatikan benda dengan panca indra disebut ...", "mengamati", "menghafal", "menyalin", "menghitung"),
      P("L1", "Perkiraan hasil sebelum percobaan dilakukan disebut ...", "prediksi", "kesimpulan", "laporan", "kritik"),
      P("L2", "Hasil pengamatan lebih mudah dibandingkan jika dicatat dalam ...", "tabel", "dongeng", "puisi", "surat"),
      P("L2", "Setelah data terkumpul, langkah berikutnya dalam penyelidikan adalah ...", "mengolah data dan menarik kesimpulan", "membuang data", "mengulang dari awal tanpa alasan", "berhenti"),
      I("L1", "Kegiatan mengumpulkan data melalui percobaan sederhana disebut ....", "penyelidikan"),
      U("L3", "Rancang penyelidikan sederhana untuk mengetahui apakah air garam atau air biasa lebih cepat menguap. Tuliskan pertanyaan, prediksi, dan cara mengamatinya!", "Jawaban benar memuat pertanyaan penyelidikan, prediksi, serta cara: dua wadah dengan jumlah air sama dijemur di tempat sama dan diamati tinggi air tiap jam, dicatat dalam tabel. Skor sebanding kelengkapan tiga bagian.")
    ],
    "ipas-C-3": [
      P("L1", "Bunyi dapat merambat melalui zat padat, zat cair, dan ...", "gas", "ruang hampa", "cahaya", "kegelapan"),
      P("L1", "Cahaya merambat menurut garis ...", "lurus", "melengkung", "zig-zag", "putus-putus"),
      P("L2", "Benda yang memantulkan cahaya dengan baik adalah ...", "cermin", "kain hitam", "karton gelap", "arang"),
      P("L2", "Bayangan terbentuk karena cahaya ...", "terhalang oleh benda", "dapat menembus semua benda", "menghilang", "berubah menjadi bunyi"),
      I("L1", "Bunyi pantul yang terdengar kembali disebut ....", "gema"),
      U("L3", "Jelaskan mengapa kita melihat kilat lebih dulu daripada mendengar gemuruh petirnya!", "Jawaban benar: cahaya merambat jauh lebih cepat daripada bunyi, sehingga cahaya kilat sampai ke mata lebih dahulu. Skor penuh bila perbandingan kecepatan cahaya dan bunyi disebut.")
    ],
    "ipas-C-5": [
      P("L1", "Pergantian siang dan malam disebabkan oleh ... bumi.", "rotasi", "revolusi", "gerhana", "pasang surut"),
      P("L1", "Planet tempat kita tinggal adalah ...", "Bumi", "Mars", "Venus", "Jupiter"),
      P("L2", "Peredaran bumi mengelilingi matahari disebut ...", "revolusi", "rotasi", "rotasi bulan", "gravitasi"),
      P("L2", "Pusat tata surya adalah ...", "matahari", "bulan", "bumi", "bintang malam"),
      I("L1", "Satu kali rotasi bumi memerlukan waktu sekitar ... jam.", "24"),
      U("L3", "Jelaskan perbedaan rotasi dan revolusi bumi beserta akibat masing-masing!", "Rotasi: bumi berputar pada porosnya (sekitar 24 jam), akibatnya siang dan malam. Revolusi: bumi mengelilingi matahari (sekitar 365 hari), akibatnya pergantian musim/perbedaan lama siang. Skor sebanding ketepatan pengertian dan akibat.")
    ],
    "ipas-C-8": [
      P("L1", "Perbedaan suku, adat, dan bahasa di Indonesia disebut ...", "keragaman budaya", "keseragaman", "kesamaan agama", "kesamaan adat"),
      P("L2", "Kearifan lokal adalah ...", "nilai dan kebiasaan baik yang diwariskan masyarakat setempat", "aturan yang dibuat oleh negara asing", "barang buatan pabrik besar di kota", "kebiasaan yang merugikan lingkungan"),
      P("L2", "Cara masyarakat Bali mengatur pengairan sawah secara bersama disebut ...", "subak", "pajak", "pemilu", "ekspor"),
      P("L2", "Sikap yang tepat terhadap budaya daerah lain adalah ...", "menghargai dan mau mempelajarinya", "mengejeknya", "melarangnya", "menganggapnya tidak penting"),
      I("L1", "Semboyan yang menyatukan keberagaman bangsa Indonesia adalah ... Tunggal Ika.", "Bhinneka"),
      U("L3", "Jelaskan satu kearifan lokal di daerahmu dan manfaatnya bagi masyarakat!", "Jawaban sesuai daerah siswa, misalnya gotong royong, larangan merusak mata air, subak, sasi, atau upacara adat yang menjaga alam. Skor sebanding ketepatan kearifan lokal dan penjelasan manfaat.")
    ],
    "ipas-C-10": [
      P("L1", "Data yang berubah dari waktu ke waktu cocok disajikan dalam ...", "grafik garis", "denah", "puisi", "poster saja"),
      P("L2", "Variabel yang sengaja diubah dalam percobaan disebut ...", "variabel bebas", "variabel terikat", "variabel kontrol", "variabel acak"),
      P("L2", "Agar percobaan adil, variabel lain harus ...", "dijaga tetap sama", "diubah semua", "diabaikan", "ditambah sesukanya"),
      P("L3", "Tabel: hari ke-1 tinggi tanaman 2 cm, hari ke-3 4 cm, hari ke-5 6 cm. Kesimpulan yang tepat adalah ...", "tinggi tanaman bertambah seiring waktu", "tanaman tidak tumbuh", "tanaman menyusut", "tinggi tanaman tetap"),
      I("L1", "Jawaban sementara atas pertanyaan penyelidikan yang diuji melalui percobaan disebut ....", "hipotesis"),
      U("L3", "Rencanakan percobaan tentang pengaruh cahaya terhadap pertumbuhan kecambah. Tuliskan variabel bebas, variabel terikat, dan langkah singkatnya!", "Variabel bebas: ada/tidaknya cahaya. Variabel terikat: tinggi/pertumbuhan kecambah. Langkah: siapkan dua kelompok kecambah dengan jenis, air, dan media sama; satu di tempat terang, satu di tempat gelap; ukur tinggi tiap hari dan catat dalam tabel. Skor sebanding kelengkapan variabel dan langkah.")
    ],

    /* ================= Bahasa Indonesia (tambahan konotatif) ================= */
    "bin-C-6": [
      P("L1", "Makna kata yang sebenarnya, sesuai kamus, disebut makna ...", "denotatif", "konotatif", "gramatikal", "stilistika"),
      P("L2", "Kalimat yang memakai makna konotatif adalah ...", "Ayah membanting tulang untuk keluarga.", "Ayah membanting gelas di dapur.", "Ibu memotong kue ulang tahun.", "Adik membaca buku cerita."),
      P("L2", "Kata 'kepala' bermakna denotatif (sebenarnya) pada kalimat ...", "Kepala adik terbentur pintu.", "Ayah itu keras kepala.", "Pak Budi kepala desa kami.", "Kami berada di kepala jalan."),
      I("L1", "Makna kata yang mengandung kiasan atau nilai rasa tambahan disebut makna ....", "konotatif"),
      I("L2", "Kata 'rumah' pada kalimat 'Rumah itu dicat putih' bermakna ....", "denotatif"),
      U("L3", "Tuliskan satu kalimat bermakna denotatif dan satu kalimat bermakna konotatif dengan kata 'panas'!", "Contoh benar: denotatif 'Air di panci itu panas.'; konotatif 'Suasana rapat menjadi panas.' Skor sebanding ketepatan kedua kalimat dan perbedaan maknanya.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();

;

/* ---- awal: data-soal-umum-lengkap-mtk.js ---- */
/* ============================================================
   SI MAMBA - js/data-soal-umum-lengkap-mtk.js
   Melengkapi soal DRAF Matematika untuk TP yang masih kurang sesudah pemetaan ulang (js/data-soal-umum-remap.js):
   mtk-A-5, A-6, A-10, B-4, B-7, B-10, B-11, C-6, C-9 (bagian sudut), C-11.
   Isi: 6-7 soal per TP (4 PG, 2 isian, 1 uraian). Pada P(), pilihan pertama = jawaban benar (urutan diacak aplikasi).
   Soal yang bunyinya sama dengan soal yang ada tidak diulang. Status DRAF: guru wajib memeriksa soal dan kunci jawaban.
   WAJIB dimuat SESUDAH js/data-soal-umum-remap.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];
  const TAMBAH = {
    "mtk-A-5": [
      P("L1", "Pada kalimat 8 + 5 = 13, tanda = berarti ...", "sama nilainya", "lebih besar dari", "lebih kecil dari", "dikurangi"),
      P("L1", "Kalimat yang benar adalah ...", "9 + 4 = 13", "9 + 4 = 12", "9 - 4 = 13", "9 + 4 = 14"),
      P("L2", "7 + 3 = ... + 4. Bilangan yang tepat pada titik-titik adalah ...", "6", "5", "7", "3"),
      P("L2", "10 - 6 = 2 + ... . Bilangan yang tepat pada titik-titik adalah ...", "2", "4", "6", "8"),
      I("L1", "Tanda yang berarti 'sama dengan' adalah ....", "="),
      I("L2", "6 + .... = 15 - 3", "6"),
      U("L2", "Tuliskan dua kalimat penjumlahan yang hasilnya 10, lalu jelaskan arti tanda sama dengan!", "Contoh benar: 6 + 4 = 10 dan 7 + 3 = 10. Tanda sama dengan berarti nilai di kiri dan kanan sama. Skor sebanding dua kalimat benar dan penjelasan arti tanda sama dengan.")
    ],
    "mtk-A-6": [
      P("L1", "Pola: merah, biru, merah, biru, merah, ... Warna berikutnya adalah ...", "biru", "merah", "hijau", "kuning"),
      P("L1", "Pola: kotak, kotak, lingkaran, kotak, kotak, lingkaran, kotak, kotak, ... Gambar berikutnya adalah ...", "lingkaran", "kotak", "segitiga", "bintang"),
      P("L2", "Pola bunyi: tepuk, tepuk, ketuk, tepuk, tepuk, ... Bunyi berikutnya adalah ...", "ketuk", "tepuk", "diam", "siul"),
      P("L2", "Pola: A, B, B, A, B, B, A, ... Huruf berikutnya adalah ...", "B", "A", "C", "D"),
      I("L1", "Pola: bulan, bintang, bulan, bintang, bulan, .... Gambar berikutnya adalah ....", "bintang"),
      I("L1", "Pola: hijau, kuning, hijau, kuning, .... Warna berikutnya adalah ....", "hijau"),
      U("L2", "Buatlah satu pola dari warna atau gambar yang unsurnya berulang, lalu lanjutkan dua unsur berikutnya!", "Jawaban benar: pola yang jelas berulang (misalnya merah, biru, biru, merah, biru, biru) dan dua unsur lanjutan yang sesuai. Skor sebanding kejelasan pola dan ketepatan lanjutan.")
    ],
    "mtk-A-10": [
      P("L1", "Dua segitiga siku-siku yang sama, sisi miringnya disatukan, dapat membentuk ...", "persegi panjang", "lingkaran", "kubus", "bola"),
      P("L1", "Buku berada di atas meja. Meja berada di ... buku.", "bawah", "atas", "depan", "kanan"),
      P("L2", "Kamu menghadap papan tulis. Pintu ada di sisi tangan kananmu. Pintu berada di sebelah ...", "kanan", "kiri", "belakang", "atas"),
      P("L2", "Dua persegi yang sama besar disusun berdampingan membentuk ...", "persegi panjang", "lingkaran", "segitiga", "bola"),
      I("L1", "Lawan kata 'kiri' adalah ....", "kanan"),
      I("L1", "Lawan kata 'atas' adalah ....", "bawah"),
      U("L2", "Susunlah satu bangun dari dua segitiga yang sama, sebutkan namanya, lalu sebutkan satu benda yang berada di sebelah kiri tempat dudukmu!", "Contoh benar: dua segitiga menjadi persegi panjang/jajargenjang; benda di sebelah kiri sesuai posisi siswa (mis. jendela, tas, teman). Skor sebanding ketepatan bangun dan benda yang disebut.")
    ],
    "mtk-B-4": [
      P("L1", "Tiga kelipatan 5 yang pertama adalah ...", "5, 10, 15", "5, 6, 7", "1, 5, 10", "10, 20, 30"),
      P("L1", "Semua faktor dari 12 adalah ...", "1, 2, 3, 4, 6, 12", "1, 2, 3, 4, 12", "2, 3, 4, 6", "1, 3, 6, 12"),
      P("L2", "Bilangan berikut yang merupakan kelipatan 6 adalah ...", "24", "20", "26", "28"),
      P("L2", "Bilangan yang bukan faktor dari 20 adalah ...", "8", "4", "5", "10"),
      I("L1", "Kelipatan 3 yang lebih besar dari 10 dan kurang dari 16 adalah ....", "12 dan 15"),
      I("L2", "Banyak faktor dari 10 adalah ....", "4"),
      U("L2", "Tuliskan semua faktor dari 18 dan lima kelipatan 9 yang pertama!", "Faktor 18: 1, 2, 3, 6, 9, 18. Kelipatan 9: 9, 18, 27, 36, 45. Skor sebanding kelengkapan faktor dan kelipatan yang benar.")
    ],
    "mtk-B-7": [
      P("L1", "25 + ... = 60. Bilangan yang tepat adalah ...", "35", "25", "85", "45"),
      P("L1", "... - 18 = 32. Bilangan yang tepat adalah ...", "50", "14", "40", "60"),
      P("L2", "Ani menerima 14 kelereng sehingga kelerengnya menjadi 52. Banyak kelereng Ani semula adalah ...", "38", "66", "28", "48"),
      P("L2", "Ada 80 buku di rak. Setelah beberapa buku dipinjam, sisa 55 buku. Buku yang dipinjam adalah ...", "25", "35", "135", "15"),
      I("L1", "47 - .... = 20", "27"),
      I("L2", "36 + .... = 91", "55"),
      U("L2", "Budi memiliki 30 stiker. Setelah diberi ibu, jumlah stikernya menjadi 45. Tulis kalimat matematikanya dengan titik-titik dan tentukan stiker dari ibu!", "Kalimat: 30 + ... = 45; stiker dari ibu 15 buah. Skor sebanding ketepatan kalimat dan hasil.")
    ],
    "mtk-B-10": [
      P("L1", "Luas suatu permukaan dapat diukur dengan menghitung banyaknya ... yang menutupinya.", "ubin yang sama ukuran", "garis yang berbeda", "warna", "bayangan"),
      P("L2", "Lantai ditutup ubin 6 baris, tiap baris 4 ubin. Luas lantai adalah ... ubin.", "24", "10", "20", "46"),
      P("L2", "Persegi panjang dengan panjang 5 cm dan lebar 3 cm memiliki luas ...", "15 cm2", "16 cm2", "8 cm2", "30 cm2"),
      P("L2", "Satuan tidak baku yang cocok untuk mengukur isi (volume) sebuah kotak adalah ...", "kubus-kubus kecil yang sama besar", "bayangan kotak", "warna kotak", "bau kotak"),
      I("L1", "Satuan baku untuk luas yang ditulis cm2 dibaca sentimeter ....", "persegi"),
      I("L2", "Kotak diisi 3 lapis kubus satuan, tiap lapis 2 x 4 kubus. Volume kotak adalah .... kubus satuan.", "24"),
      U("L2", "Jelaskan cara mengukur luas permukaan meja memakai buku tulis sebagai satuan tidak baku, dan satu kelemahan cara ini!", "Cara: menutup permukaan meja dengan buku tulis tanpa celah/tumpang tindih, lalu menghitung banyaknya. Kelemahan: hasil berbeda jika ukuran buku berbeda sehingga tidak dapat dibandingkan secara tepat. Skor sebanding ketepatan cara dan kelemahan.")
    ],
    "mtk-B-11": [
      P("L1", "Banyak sisi pada segitiga adalah ...", "3", "4", "5", "6"),
      P("L1", "Bangun datar yang keempat sisinya sama panjang dan keempat sudutnya siku-siku adalah ...", "persegi", "persegi panjang", "segitiga", "lingkaran"),
      P("L2", "Bangun datar bersisi lima disebut ...", "segi lima", "segi empat", "segi enam", "segitiga"),
      P("L2", "Dua segitiga siku-siku yang sama dapat disusun menjadi ...", "persegi panjang", "lingkaran", "kubus", "bola"),
      I("L1", "Persegi panjang memiliki .... titik sudut.", "4"),
      I("L2", "Bangun datar bersisi enam disebut segi ....", "enam"),
      U("L2", "Sebutkan dua persamaan dan satu perbedaan antara persegi dan persegi panjang!", "Persamaan: sama-sama bersisi empat, memiliki empat sudut siku-siku, sisi berhadapan sejajar dan sama panjang. Perbedaan: persegi keempat sisinya sama panjang, persegi panjang hanya sisi berhadapan yang sama panjang. Skor sebanding ketepatan.")
    ],
    "mtk-C-6": [
      P("L1", "... x 6 = 144. Bilangan yang tepat adalah ...", "24", "18", "20", "864"),
      P("L1", "720 : ... = 9. Bilangan yang tepat adalah ...", "80", "81", "70", "729"),
      P("L2", "Tiap kotak berisi 15 mangga. Jika ada 180 mangga, banyak kotak adalah ...", "12", "15", "165", "195"),
      P("L2", "250 + ... = 600. Bilangan yang tepat adalah ...", "350", "850", "450", "250"),
      I("L1", "... - 125 = 375. Bilangan yang tepat adalah ....", "500"),
      I("L2", "8 x .... + 4 = 52", "6"),
      U("L3", "Pak Tani menjual 150 jeruk dan tersisa 275 jeruk. Tulis kalimat matematikanya dengan titik-titik dan tentukan hasil panen semula!", "Kalimat: ... - 150 = 275; hasil panen semula 425 jeruk. Skor sebanding ketepatan kalimat dan hasil.")
    ],
    "mtk-C-9": [
      P("L1", "Alat untuk mengukur besar sudut adalah ...", "busur derajat", "penggaris", "jangka", "timbangan"),
      P("L1", "Sudut siku-siku besarnya ...", "90 derajat", "45 derajat", "180 derajat", "360 derajat"),
      P("L2", "Sudut yang besarnya kurang dari 90 derajat disebut sudut ...", "lancip", "tumpul", "lurus", "siku-siku"),
      P("L2", "Sudut yang besarnya lebih dari 90 derajat dan kurang dari 180 derajat disebut sudut ...", "tumpul", "lancip", "siku-siku", "penuh"),
      I("L1", "Satuan besar sudut adalah ....", "derajat"),
      I("L2", "Sudut lurus besarnya .... derajat.", "180"),
      U("L2", "Jam menunjukkan pukul 15.00. Berapa besar sudut yang dibentuk jarum pendek dan jarum panjang? Jelaskan jenis sudutnya!", "Pada pukul 15.00 jarum panjang di angka 12 dan jarum pendek di angka 3, besar sudut 90 derajat, termasuk sudut siku-siku. Skor sebanding ketepatan besar dan jenis sudut.")
    ],
    "mtk-C-11": [
      P("L1", "Pada peta berpetak, letak sebuah tempat dinyatakan dengan ...", "pasangan kolom dan baris", "warna petak", "nama penggambar", "tebal garis"),
      P("L1", "Pada peta berpetak, kolom bertanda huruf dan baris bertanda angka. Letak 'C-2' berarti ...", "kolom C, baris 2", "kolom 2, baris C", "baris C, baris 2", "kolom C, kolom 2"),
      P("L2", "Sekolah berada di petak (B, 3). Rumah Dina dua petak ke kanan dari sekolah. Letak rumah Dina adalah ...", "(D, 3)", "(B, 5)", "(A, 3)", "(B, 1)"),
      P("L2", "Toko berada di (A, 1). Pasar tiga petak ke kanan dari toko. Letak pasar adalah ...", "(D, 1)", "(A, 4)", "(C, 1)", "(A, 3)"),
      I("L1", "Peta yang dibagi menjadi kotak-kotak untuk menentukan letak disebut peta ....", "berpetak"),
      I("L2", "Perpustakaan berada di (B, 2). Letak itu dibaca kolom B dan baris ....", "2"),
      U("L2", "Gambarlah peta berpetak 4 x 4, tandai sekolah di (B, 2) dan pasar di (D, 3), lalu jelaskan cara menuju pasar dari sekolah!", "Peta berpetak benar dengan dua titik pada letak yang tepat. Cara menuju: dua petak ke kanan, lalu satu petak naik/turun sesuai arah baris pada peta yang digambar. Skor sebanding ketepatan letak dan arah perjalanan.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();

;

/* ---- awal: data-soal-umum-lengkap-seni.js ---- */
/* ============================================================
   SI MAMBA - js/data-soal-umum-lengkap-seni.js
   Melengkapi soal DRAF Seni (Rupa, Musik, Tari, Teater) untuk 48 TP yang belum punya soal pada data-tp-umum.js versi 17 Nov 2026
   (seni-A/B/C: 2-5, 7-10, 12-15, 17-20). TP pertama tiap bidang (1, 6, 11, 16) memakai soal lama yang dipindah oleh
   js/data-soal-umum-remap.js. Isi: 6 soal per TP (3 PG, 2 isian, 1 uraian). Pada P(), pilihan pertama = jawaban benar
   (urutan diacak aplikasi). Soal yang bunyinya sama dengan soal yang ada tidak diulang.
   Catatan: banyak TP Seni bersifat praktik/proses (menciptakan, berdampak); soal tertulis ini hanya mengukur pengetahuan,
   sikap, dan perencanaan. Penilaian karya tetap memakai rubrik praktik/kinerja guru.
   Status DRAF: guru wajib memeriksa soal, istilah, dan kunci jawaban.
   WAJIB dimuat SESUDAH js/data-soal-umum-remap.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];
  const TAMBAH = {
    /* ============================ FASE A (kelas 1-2) ============================ */
    /* ----- Seni Rupa ----- */
    "seni-A-2": [
      P("L1", "Gambar teman yang bagus sebaiknya kita ...", "puji dengan sopan", "ejek", "robek", "abaikan"),
      P("L1", "Karya yang sudah kita buat sebaiknya ...", "dihargai dan disimpan dengan baik", "dibuang", "diinjak", "dirusak"),
      P("L2", "Kalimat yang tepat untuk menilai gambar sendiri adalah ...", "Aku suka warna gambarku.", "Gambarku jelek sekali.", "Gambar ini tidak berguna.", "Aku tidak mau melihatnya."),
      I("L1", "Memberi pujian yang sopan pada karya orang lain disebut ....", "apresiasi"),
      I("L1", "Karya sendiri harus kita ..., bukan dibuang.", "hargai"),
      U("L2", "Ceritakan satu hal yang kamu sukai dari gambarmu dan satu hal yang ingin kamu perbaiki!", "Jawaban benar menyebut satu hal yang disukai (misalnya warna atau tokoh) dan satu hal yang ingin diperbaiki dengan bahasa sederhana. Skor sebanding kejelasan kedua bagian.")
    ],
    "seni-A-3": [
      P("L1", "Alat untuk mewarnai gambar adalah ...", "krayon", "sapu", "sendok", "ember"),
      P("L1", "Bahan untuk menempel kertas adalah ...", "lem", "air", "minyak", "garam"),
      P("L2", "Kertas lipat cocok dipakai untuk membuat ...", "perahu kertas", "sambal", "baju", "meja"),
      I("L1", "Alat untuk memotong kertas adalah ....", "gunting"),
      I("L2", "Saat memakai gunting, kita harus berhati-hati agar tidak ....", "terluka"),
      U("L2", "Sebutkan dua alat dan dua bahan untuk membuat kolase!", "Alat: gunting, kuas lem, pensil. Bahan: kertas warna, lem, kain perca, daun kering. Skor sebanding jumlah alat dan bahan yang benar.")
    ],
    "seni-A-4": [
      P("L1", "Sebelum menggambar pohon, kita sebaiknya ... pohon itu.", "mengamati", "menebang", "memanjat", "mengabaikan"),
      P("L1", "Daun, bunga, dan batu di halaman dapat menjadi ... untuk menggambar.", "bahan pengamatan", "pekerjaan rumah", "hukuman", "makanan"),
      P("L2", "Contoh karya dari pengamatan lingkungan adalah gambar ...", "rumah dan pohon di dekat rumahku", "naga terbang di bulan", "monster luar angkasa", "kota di dalam air"),
      I("L1", "Memperhatikan benda dengan teliti sebelum menggambar disebut ....", "mengamati"),
      I("L1", "Menggambar benda sesuai yang kita lihat disebut menggambar ....", "pengamatan"),
      U("L2", "Tuliskan tiga benda yang kamu lihat di sekolah dan akan kamu gambar!", "Contoh benar: papan tulis, meja, pohon, bendera, bangku, tas. Skor sebanding jumlah benda yang benar-benar ada di lingkungan sekolah.")
    ],
    "seni-A-5": [
      P("L1", "Warna cerah seperti kuning sering menggambarkan perasaan ...", "senang", "takut", "sedih", "lelah"),
      P("L1", "Gambar dapat dibuat untuk mengungkapkan ... kita.", "perasaan", "alamat rumah", "uang saku", "tinggi badan"),
      P("L2", "Saat sedih, warna yang sering kita pilih adalah ...", "biru tua", "kuning terang", "oranye cerah", "merah muda cerah"),
      I("L1", "Menggambar dapat membuat hati kita merasa ....", "senang"),
      I("L2", "Gambar yang menunjukkan rasa gembira biasanya memakai warna yang ....", "cerah"),
      U("L2", "Ceritakan perasaanmu hari ini dan warna yang akan kamu pakai untuk menggambarkannya!", "Jawaban benar menyebut satu perasaan dan warna yang dipilih dengan alasan sederhana. Skor sebanding kejelasan perasaan dan warna.")
    ],
    /* ----- Seni Musik ----- */
    "seni-A-7": [
      P("L1", "Setelah teman bernyanyi, kita sebaiknya berkata ...", "Suaramu merdu, aku suka!", "Suaramu jelek!", "Kamu salah semua!", "Aku tidak mau dengar!"),
      P("L1", "Umpan balik berguna agar teman ...", "dapat menjadi lebih baik", "malu", "marah", "berhenti bernyanyi"),
      P("L2", "Umpan balik yang sopan adalah ...", "Nyanyianmu bagus, coba lebih pelan di bagian akhir.", "Nyanyianmu buruk sekali, jangan lagi.", "Jangan bernyanyi lagi di depan kami.", "Aku bosan mendengarmu bernyanyi."),
      I("L1", "Pendapat yang kita berikan tentang penampilan teman disebut ... balik.", "umpan"),
      I("L1", "Umpan balik harus disampaikan dengan bahasa yang ....", "sopan"),
      U("L2", "Tuliskan satu pujian dan satu saran untuk temanmu yang baru selesai menyanyi!", "Contoh benar: pujian 'suaramu keras dan jelas', saran 'coba menyanyi lebih pelan di bagian akhir'. Skor sebanding ada pujian dan saran yang sopan.")
    ],
    "seni-A-8": [
      P("L1", "Pola irama tepuk-tepuk-diam. Jika kita menirukannya, kita ...", "menepuk dengan pola yang sama", "menyanyi saja", "berlari", "melompat"),
      P("L1", "Nada yang lebih tinggi disebut nada ...", "tinggi", "rendah", "diam", "lemah"),
      P("L2", "Guru menyanyikan 'do-re-mi' lalu kamu menirukannya. Kegiatan ini disebut ...", "menirukan nada", "membuat lagu baru", "menulis lagu", "membeli alat musik"),
      I("L1", "Bunyi 'do' adalah salah satu ....", "nada"),
      I("L1", "Mengulang pola irama yang dibunyikan guru disebut ....", "menirukan"),
      U("L2", "Jelaskan cara menirukan pola irama yang dibunyikan guru!", "Jawaban benar: mendengarkan dengan teliti, memperhatikan pola panjang-pendek atau bunyi-diam, lalu mengulangnya dengan tepukan atau alat yang sama. Skor sebanding kejelasan langkah.")
    ],
    "seni-A-9": [
      P("L1", "Anggota tubuh yang dapat membuat bunyi irama adalah ...", "tangan dan kaki", "mata", "rambut", "kuku saja"),
      P("L1", "Botol berisi pasir jika digoyang menghasilkan bunyi ...", "gemerisik berirama", "air mengalir", "petir", "sirene"),
      P("L2", "Benda di sekitar yang dapat dipukul untuk membuat irama adalah ...", "ember bekas", "kertas tisu", "kapas", "busa"),
      I("L1", "Bunyi tepukan tangan yang berulang membentuk ....", "irama"),
      I("L1", "Menepuk paha dan bertepuk tangan bergantian membentuk pola ....", "irama"),
      U("L2", "Ciptakan satu pola irama dengan dua alat di sekitarmu dan jelaskan cara memainkannya!", "Jawaban benar menyebut dua alat sederhana (misalnya penggaris dan kaleng) dan pola yang jelas (misalnya pukul-pukul-diam). Skor sebanding kejelasan alat dan pola.")
    ],
    "seni-A-10": [
      P("L1", "Bernyanyi bersama teman membuat hati kita merasa ...", "senang", "marah", "takut", "bosan"),
      P("L1", "Saat pelajaran musik, sikap yang baik adalah ...", "bersemangat dan ikut bernyanyi", "menutup telinga", "mengganggu teman", "tidur"),
      P("L2", "Mendengarkan musik yang lembut saat lelah dapat membuat perasaan kita ...", "lebih tenang", "semakin marah", "semakin gelisah", "takut"),
      I("L1", "Saat bernyanyi, wajah kita sebaiknya ....", "ceria"),
      I("L1", "Musik dapat membuat suasana hati menjadi ....", "gembira"),
      U("L1", "Tuliskan satu lagu atau permainan musik yang kamu sukai dan alasannya!", "Jawaban sesuai kesukaan siswa, dengan satu alasan sederhana. Skor sebanding kejelasan pilihan dan alasan.")
    ],
    /* ----- Seni Tari ----- */
    "seni-A-12": [
      P("L1", "Tempat penari bergerak disebut unsur ...", "ruang", "waktu", "tenaga", "suara"),
      P("L1", "Cepat atau lambatnya gerak termasuk unsur ...", "waktu", "ruang", "tubuh", "warna"),
      P("L2", "Setelah menari, kalimat yang menunjukkan capaian diri adalah ...", "Aku sudah bisa melangkah mengikuti irama.", "Aku tidak mau menari lagi.", "Menari itu tidak penting.", "Aku benci gerakan ini."),
      I("L1", "Kuat atau lemahnya gerak termasuk unsur ....", "tenaga"),
      I("L1", "Anggota tubuh yang digerakkan saat menari disebut unsur ....", "tubuh"),
      U("L2", "Sebutkan dua unsur tari dan beri contoh masing-masing!", "Contoh benar: ruang (menari ke depan, ke samping); waktu (gerak cepat, lambat); tenaga (gerak kuat, lembut); tubuh (menggerakkan tangan, kaki). Skor sebanding jumlah unsur dan contoh yang benar.")
    ],
    "seni-A-13": [
      P("L1", "Sebelum menari, kita melakukan ...", "pemanasan", "makan banyak", "tidur", "menonton televisi"),
      P("L1", "Saat teman menari, kita harus ...", "memperhatikan dan bertepuk tangan", "mengejek", "berteriak keras", "meninggalkan ruangan"),
      P("L2", "Sikap percaya diri saat menari ditunjukkan dengan ...", "menari tegak dan tersenyum", "menunduk terus", "menutup wajah", "berhenti di tengah"),
      I("L1", "Saat menari bersama, kita harus menjaga ... agar tidak bertabrakan.", "jarak"),
      I("L1", "Berterima kasih setelah tampil termasuk sikap ....", "sopan"),
      U("L2", "Tuliskan dua etika yang harus dijaga saat menari bersama teman!", "Contoh benar: tidak mendorong teman; menjaga jarak; menunggu giliran; tidak mengejek penampilan teman; berterima kasih. Skor sebanding jumlah etika yang benar.")
    ],
    "seni-A-14": [
      P("L1", "Gerak melangkah, menepuk, dan berputar yang disusun berurutan menjadi ...", "gerak tari sederhana", "lagu", "gambar", "cerita"),
      P("L2", "Agar gerak tari lebih indah, kita dapat mengubah ...", "tinggi rendah dan arah gerak", "warna kertas", "nama gerak", "jumlah pensil"),
      P("L2", "Menggerakkan tangan dari rendah ke tinggi menunjukkan perbedaan ...", "tinggi rendah gerak", "warna gerak", "rasa gerak", "bau gerak"),
      I("L1", "Menggabungkan beberapa gerak menjadi satu rangkaian disebut ... gerak.", "merangkai"),
      I("L1", "Membuat gerak tari sendiri berarti kita ... gerak.", "menciptakan"),
      U("L2", "Rangkailah tiga gerak sederhana (misalnya melangkah, menepuk, berputar) dan jelaskan urutannya!", "Jawaban benar menyebut tiga gerak dengan urutan jelas, misalnya melangkah dua kali, menepuk dua kali, lalu berputar. Skor sebanding kejelasan urutan tiga gerak.")
    ],
    "seni-A-15": [
      P("L1", "Anak yang ingin tahu saat belajar tari akan ...", "bertanya dan mencoba", "diam saja", "pergi", "mengganggu teman"),
      P("L1", "Jika belum bisa gerakan tari, sikap yang baik adalah ...", "mencoba lagi dan bertanya", "menangis dan berhenti", "marah", "menyalahkan teman"),
      P("L2", "Guru menunjukkan gerak tari baru. Sikap yang tepat adalah ...", "memperhatikan dengan penuh minat", "bermain sendiri", "bercanda", "menutup mata"),
      I("L1", "Keinginan untuk mengetahui lebih banyak disebut rasa ingin ....", "tahu"),
      I("L1", "Tidak mudah menyerah saat belajar tari menunjukkan sikap pantang ....", "menyerah"),
      U("L1", "Tuliskan satu pertanyaan yang ingin kamu tanyakan tentang tari!", "Pertanyaan relevan tentang tari, misalnya asal tari, cara melakukan gerakan, atau alat pengiring. Skor sebanding kesesuaian pertanyaan dengan topik tari.")
    ],
    /* ----- Seni Teater ----- */
    "seni-A-17": [
      P("L1", "Setelah bermain peran, kita dapat menceritakan perasaan dengan bahasa ...", "sehari-hari yang sederhana", "asing", "rahasia", "yang sulit"),
      P("L1", "Saat memerankan tokoh yang gembira, wajah kita ...", "tersenyum ceria", "cemberut", "menangis", "marah"),
      P("L2", "Kalimat yang tepat untuk menceritakan pengalaman bermain peran adalah ...", "Aku senang menjadi kucing dan bisa mengeong.", "Aku tidak tahu apa-apa.", "Bermain peran membosankan sekali.", "Aku tidak mau cerita."),
      I("L1", "Perasaan senang, sedih, dan marah disebut ....", "emosi"),
      I("L1", "Setelah bermain peran, kita boleh menceritakan ... kita kepada teman.", "perasaan"),
      U("L2", "Ceritakan perasaanmu saat memerankan satu tokoh dengan kalimat sederhana!", "Jawaban benar menyebut tokoh yang diperankan dan perasaan yang dirasakan, misalnya senang atau malu. Skor sebanding kejelasan tokoh dan perasaan.")
    ],
    "seni-A-18": [
      P("L1", "Benda yang dipakai pemain saat bermain peran disebut ...", "properti", "buku", "rapor", "sepatu olahraga"),
      P("L1", "Topeng kucing dapat dipakai untuk memerankan ...", "kucing", "burung", "ikan", "kuda"),
      P("L2", "Properti yang cocok untuk tokoh dokter adalah ...", "stetoskop mainan", "cangkul", "jaring ikan", "palu tukang"),
      I("L1", "Alat bantu yang dipakai dalam permainan peran disebut ....", "properti"),
      I("L1", "Tongkat dapat menjadi properti untuk tokoh ....", "kakek"),
      U("L2", "Sebutkan dua properti sederhana untuk tokoh petani dan gunanya!", "Contoh benar: topi caping (pelindung panas); cangkul mainan (alat bertani); keranjang (wadah hasil panen). Skor sebanding jumlah properti dan kegunaan yang benar.")
    ],
    "seni-A-19": [
      P("L1", "Orang yang memerankan tokoh dalam cerita disebut ...", "pemain", "penonton", "penjual karcis", "petugas parkir"),
      P("L1", "Lakon adalah ...", "cerita yang dimainkan dalam pertunjukan", "alat musik", "jenis makanan", "bangunan sekolah"),
      P("L2", "Saat menjadi tokoh nenek, kita berjalan ...", "pelan dan sedikit membungkuk", "melompat-lompat", "berlari kencang", "menari cepat"),
      I("L1", "Cerita yang dimainkan oleh para pemain disebut ....", "lakon"),
      I("L1", "Tokoh dalam cerita Kancil biasanya berupa ....", "hewan"),
      U("L2", "Pilih satu tokoh di sekitarmu (misalnya penjual atau guru), lalu jelaskan gerak dan suara yang akan kamu pakai untuk memerankannya!", "Jawaban benar menyebut tokoh, satu ciri gerak, dan satu ciri suara yang sesuai. Skor sebanding kesesuaian gerak dan suara dengan tokoh.")
    ],
    "seni-A-20": [
      P("L1", "Saat bermain gerak dan lagu, kita mengikuti arahan ...", "guru", "orang asing", "penonton", "teman yang paling keras"),
      P("L1", "Gerak dan lagu dilakukan dengan ...", "bernyanyi sambil bergerak", "tidur sambil menyanyi", "berdiam diri", "menutup telinga"),
      P("L2", "Ketika guru memberi aba-aba berhenti, kita ...", "berhenti bergerak", "terus bergerak", "berlari keluar", "berteriak"),
      I("L1", "Gerak dan lagu dimainkan sesuai arahan ....", "guru"),
      I("L1", "Bernyanyi sambil bergerak membuat suasana belajar menjadi ....", "menyenangkan"),
      U("L1", "Sebutkan satu lagu yang dapat dimainkan dengan gerak dan tuliskan satu gerakannya!", "Jawaban benar menyebut satu lagu anak dan satu gerakan yang sesuai, misalnya bertepuk tangan atau berputar. Skor sebanding ketepatan lagu dan gerakan.")
    ],

    /* ============================ FASE B (kelas 3-4) ============================ */
    /* ----- Seni Rupa ----- */
    "seni-B-2": [
      P("L1", "Menilai karya dengan sopan menggunakan kosakata seni rupa disebut ...", "apresiasi", "pembelian", "pengiriman", "penyimpanan"),
      P("L2", "Kalimat apresiasi yang tepat adalah ...", "Pilihan warna lukisanmu serasi dan garisnya tegas.", "Bagus, tetapi aku tidak tahu kenapa.", "Lukisanmu jelek dan membosankan sekali.", "Aku tidak peduli dengan lukisanmu."),
      P("L2", "Bagian karya yang dinilai pada apresiasi seni rupa antara lain ...", "warna, garis, bentuk, dan tema", "harga bingkai", "nama penjual", "ukuran meja"),
      I("L1", "Garis, bentuk, warna, dan tekstur termasuk unsur seni ....", "rupa"),
      I("L1", "Memberi penilaian yang membangun pada karya teman berarti memberi ... yang sopan.", "saran"),
      U("L2", "Berikan apresiasi pada gambar temanmu dengan memakai dua kosakata seni rupa!", "Contoh benar: 'warna gambarmu cerah dan serasi', 'garis pada bentuk rumahmu tegas'. Skor sebanding jumlah kosakata seni rupa yang dipakai dengan tepat.")
    ],
    "seni-B-3": [
      P("L1", "Alat untuk melukis dengan cat air adalah ...", "kuas", "gunting", "penggaris besi", "palu"),
      P("L1", "Bahan untuk mengencerkan cat air adalah ...", "air", "minyak goreng", "pasir", "kapur"),
      P("L2", "Urutan yang benar menguji cat air pada kertas adalah ...", "siapkan kertas, ambil cat, campur air, goreskan, amati hasil", "goreskan, siapkan kertas, ambil cat, amati hasil", "amati hasil, campur air, goreskan, siapkan kertas", "ambil cat, amati hasil, siapkan kertas, goreskan"),
      I("L1", "Tempat mencampur warna cat disebut ....", "palet"),
      I("L1", "Setelah memakai kuas, kita harus ... kuas itu.", "mencuci"),
      U("L2", "Jelaskan langkah menguji dua jenis alat gambar (pensil warna dan krayon) pada kertas!", "Langkah benar: menyiapkan kertas, mencoba goresan dengan masing-masing alat, mengamati hasil warna dan ketebalan, lalu membandingkan. Skor sebanding kelengkapan langkah.")
    ],
    "seni-B-4": [
      P("L1", "Gambar tentang liburan bersama keluarga dibuat berdasarkan ...", "pengalaman", "khayalan saja", "gambar orang lain", "iklan"),
      P("L1", "Mengamati pasar sebelum menggambar berguna agar ...", "gambar lebih sesuai kenyataan", "gambar menjadi kecil", "kertas tidak terpakai", "pensil cepat habis"),
      P("L2", "Karya yang dibuat dari pengamatan lingkungan sekolah adalah ...", "lukisan halaman sekolah", "gambar naga di langit", "gambar kota fiktif di bulan", "gambar monster laut"),
      I("L1", "Gambar yang dibuat dari apa yang kita lihat langsung disebut gambar ....", "pengamatan"),
      I("L1", "Menuangkan kejadian yang pernah dialami ke dalam gambar disebut gambar dari ....", "pengalaman"),
      U("L2", "Tuliskan ide karya seni rupa yang berasal dari pengalamanmu dan alat yang akan kamu pakai!", "Jawaban benar menyebut satu pengalaman (misalnya bermain di sawah), karya yang akan dibuat, dan alat/bahan. Skor sebanding kejelasan ide dan alat.")
    ],
    "seni-B-5": [
      P("L1", "Poster 'Bumi Bersih' yang kamu buat mengungkapkan ...", "harapan", "kemarahan", "pengumuman libur", "daftar harga"),
      P("L2", "Warna biru dan hijau sering dipakai untuk menggambarkan suasana ...", "tenang dan sejuk", "marah", "sangat panas", "ribut"),
      P("L2", "Gambar cita-cita menjadi dokter mengungkapkan ...", "harapan", "kebencian", "rasa bosan", "rasa takut"),
      I("L1", "Karya seni rupa dapat mengungkapkan perasaan dan ....", "harapan"),
      I("L1", "Warna merah sering dipakai untuk menunjukkan perasaan ....", "semangat"),
      U("L2", "Buatlah rencana karya yang mengungkapkan harapanmu untuk sekolah: tuliskan ide dan warna yang dipakai!", "Jawaban benar menyebut harapan (misalnya sekolah bersih atau rukun), bentuk karya, dan warna dengan alasan. Skor sebanding kejelasan ketiganya.")
    ],
    /* ----- Seni Musik ----- */
    "seni-B-7": [
      P("L1", "Keras atau lembutnya bunyi disebut ...", "dinamika", "tempo", "melodi", "birama"),
      P("L2", "Umpan balik yang tepat memakai istilah musik adalah ...", "Tempomu sudah pas, tetapi nada di akhir kurang tinggi.", "Lagumu bagus sekali, aku suka.", "Lagumu jelek, tidak enak didengar.", "Aku tidak suka mendengar nyanyianmu."),
      P("L2", "Tempo lagu terlalu cepat sehingga syair tidak jelas. Saran yang tepat adalah ...", "memperlambat tempo", "mempercepat tempo", "mengganti judul", "berhenti bernyanyi"),
      I("L1", "Istilah untuk cepat lambatnya lagu adalah ....", "tempo"),
      I("L1", "Urutan nada yang enak didengar disebut ....", "melodi"),
      U("L2", "Berikan satu umpan balik untuk penampilan menyanyi temanmu dengan memakai istilah tempo atau dinamika!", "Contoh benar: 'Dinamikamu bagus saat bagian pelan, tetapi bagian reff bisa lebih keras.' Skor sebanding ketepatan istilah dan kesopanan saran.")
    ],
    "seni-B-8": [
      P("L1", "Contoh alat musik melodis adalah ...", "pianika", "kendang", "marakas", "tamborin"),
      P("L1", "Contoh alat musik ritmis adalah ...", "tamborin", "pianika", "suling", "recorder"),
      P("L2", "Cara merawat alat musik yang benar adalah ...", "menyimpan di tempat kering dan bersih", "menjemur di hujan", "melempar ke dalam tas", "membiarkan berdebu"),
      I("L1", "Alat musik bambu yang dimainkan dengan digoyang disebut ....", "angklung"),
      I("L1", "Susunan nada berurutan yang indah disebut ....", "melodi"),
      U("L2", "Jelaskan dua cara merawat alat musik di sekolah!", "Contoh benar: membersihkan setelah dipakai; menyimpan di lemari kering; tidak membanting; memakainya sesuai fungsi. Skor sebanding jumlah cara yang benar.")
    ],
    "seni-B-9": [
      P("L1", "Bunyi yang dapat dihasilkan dari tubuh adalah ...", "tepuk tangan dan petikan jari", "dentang lonceng", "klakson", "sirene"),
      P("L1", "Botol berisi biji-bijian jika digoyang dapat berfungsi sebagai ...", "alat musik ritmis", "alat tulis", "alat ukur", "alat gambar"),
      P("L2", "Musik yang memakai anggota tubuh sebagai sumber bunyi disebut ...", "body percussion", "opera", "orkestra", "paduan suara"),
      I("L1", "Memainkan irama dengan tubuh disebut body ....", "percussion"),
      I("L1", "Benda yang dipukul menghasilkan bunyi karena ....", "bergetar"),
      U("L2", "Rancang satu pola bunyi dari tubuh dan satu alat di kelas, lalu jelaskan cara memainkannya!", "Jawaban benar menyebut pola jelas (mis. tepuk-tepuk-hentak) dan satu alat (mis. penggaris di meja) beserta urutannya. Skor sebanding kejelasan pola dan alat.")
    ],
    "seni-B-10": [
      P("L1", "Orang yang berminat pada musik biasanya ...", "rajin berlatih", "menghindari musik", "tidak mau mendengar", "mudah bosan"),
      P("L1", "Cara mengembangkan minat bermusik adalah ...", "ikut kegiatan ekstrakurikuler musik", "menjauhi alat musik", "tidak mau berlatih", "menutup telinga"),
      P("L2", "Bermain musik secara berkelompok menumbuhkan ...", "kerja sama", "sikap egois", "sikap malas", "iri hati"),
      I("L1", "Ketertarikan terhadap sesuatu disebut ....", "minat"),
      I("L1", "Latihan rutin membuat kemampuan bermusik semakin ....", "baik"),
      U("L1", "Tuliskan jenis musik atau alat musik yang kamu minati dan alasannya!", "Jawaban sesuai minat siswa dengan satu alasan masuk akal. Skor sebanding kejelasan pilihan dan alasan.")
    ],
    /* ----- Seni Tari ----- */
    "seni-B-12": [
      P("L1", "Unsur ruang dalam tari mencakup ...", "level, arah hadap, dan pola lantai", "warna, bau, dan rasa", "nama, harga, dan ukuran", "judul, isi, dan penulis"),
      P("L1", "Unsur waktu dalam tari berkaitan dengan ...", "tempo dan irama gerak", "warna kostum", "luas panggung", "jumlah penonton"),
      P("L2", "Kalimat penilaian capaian diri setelah menari yang tepat adalah ...", "Gerak tanganku sudah sesuai irama, tetapi langkah kakiku perlu dilatih.", "Aku sudah menjadi penari yang paling baik.", "Aku sama sekali tidak bisa menari apa pun.", "Semua gerakanku salah dan tidak ada gunanya."),
      I("L1", "Kuat atau lemahnya gerak termasuk unsur ....", "tenaga"),
      I("L1", "Posisi gerak tinggi, sedang, dan rendah disebut ....", "level"),
      U("L2", "Sebutkan tiga unsur tari beserta contohnya dalam gerak!", "Contoh benar: ruang (menari ke depan/samping, level rendah); waktu (gerak cepat/lambat); tenaga (gerak kuat/lembut); tubuh (gerak tangan/kaki). Skor sebanding jumlah unsur dan contoh yang benar.")
    ],
    "seni-B-13": [
      P("L1", "Saat menari berkelompok, para penari harus ...", "kompak dan saling memperhatikan", "bergerak sendiri-sendiri", "saling mendorong", "meninggalkan kelompok"),
      P("L2", "Pola lantai lingkaran dibuat dengan cara ...", "penari berdiri melingkar", "penari berbaris lurus ke belakang", "penari duduk di kursi", "penari berdiri di satu titik"),
      P("L2", "Agar gerak kelompok serempak, penari harus ...", "mengikuti hitungan dan irama bersama", "bergerak sesuka hati", "menutup mata", "mengubah gerak tiap saat"),
      I("L1", "Menari kompak dalam kelompok menunjukkan sikap ....", "kerja sama"),
      I("L1", "Gerak yang dilakukan bersamaan disebut gerak ....", "serempak"),
      U("L2", "Jelaskan dua cara agar penari dalam kelompok dapat kompak!", "Contoh benar: berlatih bersama secara rutin; mengikuti hitungan dan irama; saling memperhatikan teman; menjaga jarak dan pola lantai. Skor sebanding jumlah cara yang benar.")
    ],
    "seni-B-14": [
      P("L1", "Gerak yang dilakukan sambil duduk atau jongkok termasuk level ...", "rendah", "tinggi", "melayang", "sedang"),
      P("L1", "Menghadap ke depan, samping, dan belakang disebut ...", "arah hadap", "pola irama", "warna gerak", "judul tari"),
      P("L2", "Gerak melangkah dapat dikembangkan menjadi lebih menarik dengan ...", "mengubah level dan arah hadap", "menghentikannya", "tidak mengubah apa pun", "mengulang tanpa variasi"),
      I("L1", "Gerak berdiri tegak dengan tangan terangkat tinggi termasuk level ....", "tinggi"),
      I("L1", "Posisi gerak setinggi bahu termasuk level ....", "sedang"),
      U("L2", "Kembangkan gerak 'melangkah' dengan dua level berbeda dan dua arah hadap. Jelaskan!", "Jawaban benar menyebut dua level (mis. rendah dan tinggi) dan dua arah hadap (mis. depan dan samping) pada gerak melangkah. Skor sebanding kelengkapan dan kejelasan.")
    ],
    "seni-B-15": [
      P("L1", "Usaha yang baik dalam belajar tari adalah ...", "berlatih dengan sungguh-sungguh", "malas berlatih", "tidak mau mencoba", "menunggu orang lain"),
      P("L2", "Gerakan sulit belum bisa dilakukan. Sikap yang tepat adalah ...", "berlatih berulang dengan sabar", "menyerah", "menyalahkan guru", "berhenti belajar"),
      P("L2", "Penari yang berusaha keras akan ...", "semakin terampil", "semakin malas", "makin lupa gerakan", "tidak berubah"),
      I("L1", "Sikap tidak mudah menyerah disebut ....", "gigih"),
      I("L1", "Latihan yang teratur membuat gerakan menjadi lebih ....", "baik"),
      U("L1", "Tuliskan dua usaha yang kamu lakukan agar bisa menari dengan baik!", "Contoh benar: berlatih di rumah; memperhatikan contoh guru; bertanya bila belum paham; berlatih bersama teman. Skor sebanding jumlah usaha yang benar.")
    ],
    /* ----- Seni Teater ----- */
    "seni-B-17": [
      P("L1", "Tokoh dalam teater dapat diambil dari ... di sekitar kita.", "orang di lingkungan sekitar", "benda mati saja", "hanya dari luar negeri", "hanya dari televisi"),
      P("L2", "Pengalaman bermain teater dapat diceritakan dengan ...", "menyebut perasaan dan bagian yang disukai", "menyembunyikannya dari semua orang", "menyalahkan teman yang bermain", "tidak berkata apa-apa sama sekali"),
      P("L2", "Mengamati lingkungan berguna dalam teater untuk ...", "menemukan tokoh dan cerita", "menghilangkan cerita", "menutup panggung", "menghapus naskah"),
      I("L1", "Menceritakan pengalaman dan perasaan setelah bermain teater disebut ....", "refleksi"),
      I("L1", "Penjual di pasar dapat menjadi ... dalam sebuah lakon.", "tokoh"),
      U("L2", "Ceritakan satu orang di lingkunganmu yang dapat dijadikan tokoh teater dan cirinya!", "Jawaban benar menyebut satu orang/profesi di lingkungan dan dua ciri (gerak, suara, atau kebiasaan). Skor sebanding kejelasan tokoh dan ciri.")
    ],
    "seni-B-18": [
      P("L1", "Properti yang cocok untuk tokoh petani adalah ...", "caping dan cangkul mainan", "stetoskop", "jas dan dasi", "helm pilot"),
      P("L1", "Properti dipilih agar sesuai dengan ...", "tokoh dan cerita", "harga bahan", "warna kesukaan sutradara saja", "ukuran tas"),
      P("L2", "Tokoh nenek yang sudah tua dapat diperankan dengan properti ...", "tongkat dan kacamata", "bola dan raket", "sepatu roda", "skateboard"),
      I("L1", "Benda yang dipakai pemain untuk mendukung peran disebut ....", "properti"),
      I("L1", "Pakaian pemain di atas panggung disebut ....", "kostum"),
      U("L2", "Sebutkan dua properti untuk tokoh nelayan dan jelaskan fungsinya!", "Contoh benar: jaring (alat menangkap ikan); topi (pelindung panas); perahu mainan (alat transportasi di laut). Skor sebanding jumlah properti dan fungsi yang benar.")
    ],
    "seni-B-19": [
      P("L1", "Tokoh utama dalam sebuah cerita disebut ...", "protagonis", "penonton", "sutradara", "penata suara"),
      P("L2", "Watak tokoh dapat diketahui dari ...", "perkataan dan perbuatannya", "warna sepatunya", "ukuran panggung", "jumlah penonton"),
      P("L2", "Pemain menunjukkan tokoh yang marah dengan ...", "suara keras dan wajah tegang", "suara lembut dan senyum", "tertawa pelan", "menari riang"),
      I("L1", "Orang yang memerankan tokoh dalam lakon disebut ....", "pemeran"),
      I("L1", "Bagian cerita ketika tokoh menghadapi masalah disebut ....", "konflik"),
      U("L2", "Pilih tokoh dari cerita yang kamu kenal dan jelaskan wataknya serta cara memerankannya!", "Jawaban benar menyebut tokoh, watak (mis. jujur, pelit), serta cara memerankan lewat gerak, suara, atau ekspresi. Skor sebanding kesesuaian watak dan cara memerankan.")
    ],
    "seni-B-20": [
      P("L1", "Teater yang hanya memakai gerak dan ekspresi tanpa kata-kata disebut ...", "pantomim", "opera", "paduan suara", "wayang golek"),
      P("L1", "Pertunjukan dengan boneka kulit yang bayangannya terlihat di layar disebut ...", "wayang kulit", "pantomim", "tari saman", "drama radio"),
      P("L2", "Pertunjukan cerita yang dimainkan dengan dialog antartokoh disebut ...", "drama", "pantomim", "lukisan", "nyanyian solo"),
      I("L1", "Pertunjukan dengan boneka yang digerakkan tangan disebut teater ....", "boneka"),
      I("L1", "Teater tradisional Betawi yang penuh humor disebut ....", "lenong"),
      U("L2", "Sebutkan dua bentuk lakon teater dan satu ciri masing-masing!", "Contoh benar: pantomim (tanpa kata-kata, mengandalkan gerak dan ekspresi); wayang kulit (memakai boneka kulit dan layar); drama (memakai dialog); teater boneka (boneka digerakkan). Skor sebanding jumlah bentuk dan ciri yang benar.")
    ],

    /* ============================ FASE C (kelas 5-6) ============================ */
    /* ----- Seni Rupa ----- */
    "seni-C-2": [
      P("L1", "Menilai karya dengan alasan dan istilah seni rupa disebut ...", "apresiasi", "penyalinan", "penyimpanan", "penjualan"),
      P("L2", "Karya yang kedua sisinya tampak sama berat memiliki prinsip desain ...", "keseimbangan", "kontras", "irama", "penekanan"),
      P("L2", "Kalimat apresiasi yang tepat dan bernalar adalah ...", "Komposisi karyamu seimbang karena warna gelap dan terang tersebar merata.", "Bagus, aku suka karyamu itu.", "Karyamu jelek dan tidak menarik sama sekali.", "Aku tidak mau menilai karya siapa pun."),
      I("L1", "Pengulangan unsur secara teratur pada karya disebut prinsip ....", "irama"),
      I("L1", "Bagian yang paling menarik perhatian pada sebuah karya disebut pusat ....", "perhatian"),
      U("L3", "Apresiasi satu karya temanmu: sebutkan dua unsur rupa, satu prinsip desain, dan satu saran perbaikan!", "Contoh benar: unsur garis dan warna; prinsip keseimbangan; saran 'tambahkan bayangan agar lebih hidup'. Skor sebanding ketepatan unsur, prinsip, dan saran.")
    ],
    "seni-C-3": [
      P("L1", "Teknik membuat gambar dari tempelan potongan kertas, kain, atau daun disebut ...", "kolase", "frotase", "mozaik air", "cetak saring"),
      P("L2", "Mencoba berbagai teknik dengan alat dan bahan yang sama berarti ...", "menguji variasi teknik", "menyalin karya orang", "membuang bahan", "menghentikan karya"),
      P("L2", "Cat air yang diaplikasikan pada kertas basah biasanya menghasilkan ...", "warna menyebar lembut", "garis sangat tegas", "warna menggumpal kering", "warna hilang"),
      I("L1", "Teknik menggosok pensil di atas kertas pada permukaan bertekstur disebut ....", "frotase"),
      I("L1", "Cat yang larut dalam air dan tampak bening disebut cat ....", "air"),
      U("L3", "Jelaskan dua teknik berbeda dalam membuat gambar dari bahan yang sama dan bandingkan hasilnya!", "Contoh benar: krayon digosok (halus, bertekstur) vs krayon diarsir (garis tegas); hasilnya dibandingkan dari tekstur dan kesan. Skor sebanding ketepatan dua teknik dan perbandingannya.")
    ],
    "seni-C-4": [
      P("L1", "Gambar monster ramah di planet baru berasal dari ...", "imajinasi", "pengamatan murni", "foto", "buku catatan"),
      P("L2", "Langkah awal membuat karya dari pengamatan dan imajinasi adalah ...", "mengamati objek lalu menggali ide", "langsung mewarnai", "menyalin gambar teman", "membuang kertas"),
      P("L2", "Menggabungkan pasar yang diamati dengan imajinasi dapat menghasilkan ...", "pasar di atas awan yang unik", "salinan foto persis", "gambar kosong", "tulisan saja"),
      I("L1", "Kemampuan membayangkan sesuatu yang belum ada disebut ....", "imajinasi"),
      I("L1", "Gambar awal yang dibuat sebelum karya jadi disebut ....", "sketsa"),
      U("L3", "Rancang satu karya yang menggabungkan pengamatan dan imajinasi: tuliskan objek pengamatan, unsur imajinasi, dan alat yang dipakai!", "Jawaban benar memuat objek nyata yang diamati, unsur khayalan yang ditambahkan, dan alat/bahan. Skor sebanding kelengkapan dan kesesuaian ketiganya.")
    ],
    "seni-C-5": [
      P("L1", "Anak yang berminat pada olahraga dapat membuat karya bertema ...", "olahraga", "kendaraan saja", "peta", "nama jalan"),
      P("L2", "Karya yang mewakili minat sebaiknya memuat ...", "tema yang disukai pembuatnya", "tema yang tidak disukai", "gambar milik orang lain", "tema yang sama untuk semua"),
      P("L2", "Poster tentang hobi menanam bunga mewakili ...", "minat pembuatnya", "minat guru", "minat tetangga", "minat penjual"),
      I("L1", "Ketertarikan pada suatu hal disebut ....", "minat"),
      I("L1", "Kegiatan yang disukai dan dilakukan di waktu luang disebut ....", "hobi"),
      U("L3", "Buatlah rancangan karya seni rupa yang mewakili minatmu dan jelaskan alasan memilih tema itu!", "Jawaban benar menyebut minat, bentuk karya, dan alasan pemilihan tema. Skor sebanding kejelasan ketiganya.")
    ],
    /* ----- Seni Musik ----- */
    "seni-C-7": [
      P("L1", "Keras lembutnya bunyi dalam musik disebut ...", "dinamika", "tempo", "birama", "tangga nada"),
      P("L2", "Sebuah lagu dinyanyikan pelan dari awal sampai akhir. Penilaian yang tepat adalah ...", "dinamika kurang bervariasi", "tempo terlalu lambat sekali", "nadanya benar semua", "lagunya tidak ada"),
      P("L2", "Cepat lambatnya lagu disebut ...", "tempo", "dinamika", "melodi", "harmoni"),
      I("L1", "Kejelasan pengucapan syair saat bernyanyi disebut ....", "artikulasi"),
      I("L1", "Ciri khas bunyi tiap alat musik disebut warna ....", "nada"),
      U("L3", "Nilailah penampilan musik kelompokmu dengan memakai tiga istilah musik beserta saran perbaikan!", "Contoh benar: tempo sesuai, dinamika kurang bervariasi (saran: perbanyak pelan-keras), artikulasi jelas, kekompakan baik. Skor sebanding ketepatan tiga istilah dan saran.")
    ],
    "seni-C-6": [
      P("L1", "Alat musik melodis adalah alat musik yang dapat memainkan ...", "nada berurutan (melodi)", "hanya ketukan", "hanya tepuk", "hanya hentakan kaki"),
      P("L1", "Contoh alat musik ritmis adalah ...", "drum", "pianika", "suling", "recorder"),
      P("L2", "Birama 4/4 berarti dalam satu birama terdapat ... ketukan.", "empat", "dua", "tiga", "enam"),
      I("L1", "Pola panjang pendek bunyi yang teratur disebut ....", "irama"),
      I("L1", "Pada notasi angka, urutan nada 1 2 3 4 5 6 7 dibaca do re mi fa sol la ....", "si"),
      U("L3", "Jelaskan perbedaan alat musik ritmis dan melodis beserta dua contoh masing-masing!", "Ritmis menghasilkan irama/ketukan (contoh: drum, tamborin, marakas); melodis menghasilkan nada berurutan (contoh: pianika, recorder, suling, angklung melodis). Skor sebanding ketepatan perbedaan dan contoh.")
    ],
    "seni-C-8": [
      P("L1", "Lima garis sejajar tempat menulis not balok disebut ...", "paranada", "birama", "tangga nada", "kunci"),
      P("L2", "Istilah tempo 'allegro' menunjukkan lagu dimainkan ...", "cepat dan riang", "sangat lambat", "sangat pelan", "berhenti"),
      P("L2", "Istilah tempo 'adagio' menunjukkan lagu dimainkan ...", "lambat dan tenang", "sangat cepat", "sangat keras", "tanpa irama"),
      I("L1", "Tanda dinamika 'forte' berarti dimainkan dengan ....", "keras"),
      I("L1", "Not seperempat bernilai ... ketukan pada birama 4/4.", "satu"),
      U("L3", "Ubahlah tempo satu lagu daerah yang kamu kenal menjadi lebih cepat dan lebih lambat. Jelaskan perubahan suasananya!", "Jawaban benar menyebut lagu daerah, tempo cepat memberi kesan riang/bersemangat, tempo lambat memberi kesan tenang/sendu. Skor sebanding ketepatan lagu dan penjelasan suasana.")
    ],
    "seni-C-9": [
      P("L1", "Alat musik tradisional Jawa Barat dari bambu yang dimainkan dengan digoyang adalah ...", "angklung", "tifa", "sasando", "kolintang"),
      P("L1", "Seperangkat alat musik tradisional Jawa yang terdiri atas bilah dan gong disebut ...", "gamelan", "orkestra", "band", "organ tunggal"),
      P("L2", "Pola irama berbasis kearifan lokal dapat diperoleh dari ...", "kegiatan khas masyarakat, seperti menumbuk padi", "musik dari luar negeri saja", "bunyi mesin pabrik di kota besar", "iklan yang tayang di televisi"),
      I("L1", "Alat musik pukul dari Maluku dan Papua berbentuk gendang adalah ....", "tifa"),
      I("L1", "Musik yang diwariskan turun-temurun di suatu daerah disebut musik ....", "tradisional"),
      U("L3", "Ciptakan pola irama dari kegiatan khas di daerahmu (misalnya menumbuk padi) dan jelaskan cara memainkannya!", "Jawaban benar menyebut kegiatan khas daerah, pola irama (misalnya pukul-pukul-diam), dan alat/bunyi yang dipakai. Skor sebanding ketepatan kegiatan, pola, dan cara memainkan.")
    ],
    "seni-C-10": [
      P("L1", "Rasa ingin tahu dalam bermusik ditunjukkan dengan ...", "bertanya dan mencoba alat musik baru", "tidak mau mendengar musik", "menolak berlatih", "mengganggu latihan"),
      P("L2", "Cara memperdalam minat bermusik adalah ...", "berlatih rutin dan menonton pertunjukan musik", "berhenti berlatih", "menghindari teman bermusik", "membuang alat musik"),
      P("L2", "Mengenal musik dari daerah lain dapat menambah ...", "wawasan dan sikap menghargai", "rasa iri", "rasa bosan", "permusuhan"),
      I("L1", "Keinginan untuk mengetahui lebih banyak disebut rasa ingin ....", "tahu"),
      I("L1", "Kegiatan di sekolah untuk menyalurkan minat bermusik disebut ekstrakurikuler ....", "musik"),
      U("L2", "Tuliskan dua hal yang ingin kamu ketahui lebih jauh tentang musik dan cara mencari tahunya!", "Contoh benar: asal alat musik daerah (bertanya ke guru, membaca buku); cara membaca not (belajar di ekstrakurikuler). Skor sebanding dua hal dan cara yang relevan.")
    ],
    /* ----- Seni Tari ----- */
    "seni-C-12": [
      P("L1", "Unsur pendukung tari antara lain ...", "iringan, tata busana, dan tata rias", "papan tulis dan penghapus", "buku dan pensil", "meja dan kursi saja"),
      P("L1", "Musik yang mengiringi tari disebut ...", "iringan", "naskah", "kostum", "properti"),
      P("L2", "Menerima kritik teman setelah menari dengan baik berarti ...", "mempertimbangkannya untuk memperbaiki penampilan", "marah dan menolak semua pendapat", "tidak mau menari lagi selamanya", "menyalahkan teman yang mengkritik"),
      I("L1", "Pakaian penari disebut tata ....", "busana"),
      I("L1", "Hiasan pada wajah penari disebut tata ....", "rias"),
      U("L3", "Sebutkan tiga unsur pendukung tari dan jelaskan fungsinya!", "Contoh benar: iringan (mengatur irama gerak); tata busana (menguatkan tema/tokoh); tata rias (menegaskan ekspresi wajah); properti (mendukung gerak/cerita). Skor sebanding jumlah unsur dan ketepatan fungsi.")
    ],
    "seni-C-13": [
      P("L1", "Rangkaian gerak adalah ...", "gabungan beberapa gerak yang berurutan", "satu gerak berhenti", "lagu pengiring saja", "kostum penari"),
      P("L2", "Agar penari kompak mengikuti musik, mereka harus ...", "menghitung ketukan bersama", "bergerak sesuka hati", "menutup telinga", "tidak berlatih"),
      P("L2", "Pembagian tugas saat latihan tari kelompok bertujuan agar ...", "latihan teratur dan hasil lebih baik", "ada yang tidak bekerja", "latihan lebih lama tanpa hasil", "kelompok terpecah"),
      I("L1", "Pola yang dibentuk penari di lantai disebut pola ....", "lantai"),
      I("L1", "Saling membantu dalam kelompok tari menunjukkan sikap ....", "kerja sama"),
      U("L3", "Jelaskan cara menyusun rangkaian gerak tari kelompok dengan iringan musik!", "Langkah benar: menentukan tema, memilih gerak dasar, merangkai gerak berurutan, menyesuaikan dengan ketukan iringan, menentukan pola lantai, berlatih bersama. Skor sebanding kelengkapan dan urutan langkah.")
    ],
    "seni-C-14": [
      P("L1", "Tari yang bersumber dari tradisi daerah disebut tari ...", "tradisional", "modern pop", "olahraga", "kartun"),
      P("L1", "Tari baru yang dikembangkan dari gerak tradisi disebut tari ...", "kreasi", "ritual saja", "salinan", "diam"),
      P("L2", "Desain kelompok dalam tari dapat berupa ...", "gerak serempak, bergantian, atau berpasangan", "hanya satu penari tampil sendirian", "tanpa gerak sama sekali", "hanya penonton yang bergerak"),
      I("L1", "Tari Pendet berasal dari pulau ....", "Bali"),
      I("L1", "Tari yang dibawakan banyak orang secara bersama disebut tari ....", "kelompok"),
      U("L3", "Susunlah rangkaian tiga gerak tari kreasi yang berpijak pada tradisi daerahmu dan jelaskan desain kelompoknya!", "Jawaban benar menyebut tiga gerak yang bersumber tradisi daerah, urutan rangkaian, dan desain kelompok (serempak/bergantian/berpasangan). Skor sebanding kesesuaian tradisi dan kejelasan desain.")
    ],
    "seni-C-15": [
      P("L1", "Menyampaikan pesan kepedulian lingkungan melalui gerak disebut berekspresi melalui ...", "tari", "angka", "peta", "tabel"),
      P("L2", "Kejadian banjir dapat ditanggapi melalui tari dengan gerak ...", "yang menggambarkan air dan ajakan peduli", "yang tidak berhubungan", "melompat tanpa arti", "diam sepanjang waktu"),
      P("L2", "Tari tentang kebersihan sungai bertujuan ...", "mengajak masyarakat peduli lingkungan", "mengusir penonton", "menjual karcis", "menghilangkan sungai"),
      I("L1", "Peristiwa di sekitar kita dapat menjadi ... gerak tari.", "inspirasi"),
      I("L1", "Pesan dalam tari disampaikan melalui ....", "gerak"),
      U("L3", "Pilih satu kejadian di sekitarmu dan jelaskan gerak tari yang akan kamu buat untuk menanggapinya!", "Jawaban benar menyebut kejadian (mis. sampah menumpuk), gerak yang dipilih (mis. gerak memungut dan membersihkan), dan pesan yang disampaikan. Skor sebanding kesesuaian gerak dan pesan.")
    ],
    /* ----- Seni Teater ----- */
    "seni-C-17": [
      P("L1", "Pelaku dalam sebuah cerita disebut ...", "tokoh", "penonton", "penerbit", "pengarang saja"),
      P("L1", "Sifat atau karakter tokoh disebut ...", "watak", "latar", "judul", "alur"),
      P("L2", "Tokoh yang selalu menolong teman memiliki watak ...", "baik hati", "pelit", "kasar", "pemalas"),
      I("L1", "Pemberian watak pada tokoh dalam cerita disebut ....", "penokohan"),
      I("L1", "Tokoh yang menjadi lawan tokoh utama disebut ....", "antagonis"),
      U("L3", "Pilih satu tokoh dari cerita yang kamu kenal, sebutkan wataknya, dan berikan satu pendapatmu tentang tokoh itu!", "Jawaban benar menyebut tokoh, watak yang sesuai dengan cerita, dan pendapat beralasan. Skor sebanding ketepatan watak dan alasan pendapat.")
    ],
    "seni-C-18": [
      P("L1", "Cerita tentang petani memerlukan properti ...", "cangkul dan caping", "stetoskop", "jas laboratorium", "mikrofon"),
      P("L2", "Properti sederhana dapat dibuat dari ...", "kardus, kain bekas, dan kertas", "emas dan berlian", "mesin pabrik", "bahan berbahaya"),
      P("L2", "Memilih properti harus mempertimbangkan ...", "kesesuaian dengan cerita dan keamanan", "harga paling mahal", "warna paling mencolok saja", "ukuran terbesar"),
      I("L1", "Benda untuk mendukung adegan disebut ....", "properti"),
      I("L1", "Penataan ruang dan benda di atas panggung disebut tata ....", "panggung"),
      U("L3", "Daftarkan tiga properti sederhana untuk adegan pasar dan cara membuatnya dari barang bekas!", "Contoh benar: keranjang dari kardus; timbangan dari piring plastik dan batang kayu; uang-uangan dari kertas. Skor sebanding jumlah properti dan kesesuaian cara membuatnya.")
    ],
    "seni-C-19": [
      P("L1", "Sebelum memerankan tokoh pedagang, kita sebaiknya ... pedagang itu.", "mengamati", "mengabaikan", "menghindari", "menertawakan"),
      P("L2", "Agar peran terlihat meyakinkan, pemain perlu ...", "menyesuaikan gerak, suara, dan ekspresi dengan tokoh", "memakai gerak yang sama untuk semua tokoh", "berbicara tanpa tujuan", "melupakan tokoh"),
      P("L2", "Peran yang berbeda memerlukan ...", "suara dan gerak yang berbeda", "suara yang sama", "gerak yang sama", "ekspresi yang sama"),
      I("L1", "Cara bicara dan gerak khas seorang tokoh menunjukkan ... tokoh.", "karakter"),
      I("L1", "Mengubah suara agar sesuai tokoh termasuk teknik ....", "vokal"),
      U("L3", "Pilih dua tokoh berbeda dan jelaskan perbedaan gerak dan suara saat memerankannya!", "Jawaban benar menyebut dua tokoh dan perbedaan gerak serta suara yang sesuai, misalnya kakek (lambat, suara serak) dan anak (lincah, suara nyaring). Skor sebanding ketepatan perbedaan.")
    ],
    "seni-C-20": [
      P("L1", "Pementasan singkat yang dimainkan oleh beberapa pemain disebut ...", "lakon", "pidato", "lomba lari", "pameran"),
      P("L2", "Urutan persiapan tampil yang benar adalah ...", "memilih cerita, membagi peran, berlatih, tampil", "tampil, berlatih, memilih cerita, membagi peran", "membagi peran, tampil, memilih cerita, berlatih", "berlatih, tampil, membagi peran, memilih cerita"),
      P("L2", "Setelah pentas, pemain sebaiknya ...", "mengevaluasi penampilan bersama", "menyalahkan satu pemain", "melupakannya", "merusak properti"),
      I("L1", "Latihan terakhir sebelum pentas, lengkap dengan kostum dan properti, disebut ....", "gladi resik"),
      I("L1", "Pertunjukan yang dimainkan oleh seorang pemain saja disebut ....", "monolog"),
      U("L3", "Rancang pementasan lakon singkat dengan tiga pemain: tentukan cerita, tokoh, dan satu adegan utama!", "Jawaban benar memuat cerita sederhana, tiga tokoh dengan peran jelas, dan satu adegan utama (apa yang terjadi, siapa terlibat). Skor sebanding kelengkapan dan kejelasan rancangan.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();

;
