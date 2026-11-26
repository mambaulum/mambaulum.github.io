/* ============================================================
   SI MAMBA - js/data-soal-lanjutan-pai.js
   (dulu bernama data-soal-uraian-aa-fikih-ski-tambahan.js; kini memuat lebih dari uraian, jadi diganti namanya)
   LANJUTAN bank soal untuk Akidah Akhlak, Fikih, dan SKI (PG, isian, uraian):
   melengkapi tiap TP sampai minimal 6 PG, 4 isian, dan 2 uraian. Blok-blok di bawah dipisah per tujuan dan memakai pola gabung yang sama.
   Penanda [[g:jenis;param]] pada teks soal atau pilihan jawaban diubah menjadi gambar SVG oleh js/perangkat-soal.js.
   Rincian lama di bawah ini tetap berlaku untuk blok pertama:
   TAMBAHAN bank soal DRAF: +1 Uraian untuk 33 TP yang di bank gabungan baru punya 1 uraian, supaya dua kelas
   dalam satu fase tidak mendapat uraian yang sama persis (perangkat-soal.js membagi urutan soal ganjil/genap antar kelas).
   Cakupan: Akidah Akhlak Fase B (aa-B-2,3,4,5,7,9,10,11,13,15) dan Fase C (aa-C-2,4,6,8,10,12,14,15),
            Fikih Fase B (fikih-B-1,3,5) dan Fase C (fikih-C-1,2,4,6,8),
            SKI Fase B (ski-B-1,4,5) dan Fase C (ski-C-1,3,6,7).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang. Isi soal memakai fakta yang sudah ada di bank
   untuk TP yang sama, disusun dalam bentuk pertanyaan yang berbeda dari uraian lama.
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban, dan kesesuaiannya dengan buku ajar/mazhab madrasah.
   WAJIB dimuat SESUDAH js/data-soal-semua.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    /* ---------- Akidah Akhlak Fase B ---------- */
    "aa-B-2": [
      U("L2", "Tuliskan arti Al-Waliy dan As-Sami', serta satu sikap yang mencerminkan keyakinan bahwa Allah Maha Mendengar!", "Al-Waliy = Maha Melindungi (Pelindung); As-Sami' = Maha Mendengar. Sikap: rajin berdoa kepada Allah, menjaga ucapan agar tetap baik. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-B-3": [
      U("L2", "Sebutkan nama kitab yang diturunkan kepada Nabi Musa a.s. dan Nabi Isa a.s., serta malaikat yang menyampaikan Al-Qur'an!", "Taurat (Nabi Musa a.s.); Injil (Nabi Isa a.s.); malaikat Jibril. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-B-4": [
      U("L2", "Tuliskan julukan Nabi Ibrahim a.s. dan Nabi Musa a.s., serta nama nabi dan rasul yang terakhir!", "Nabi Ibrahim a.s.: Khalilullah (kekasih Allah); Nabi Musa a.s.: Kalimullah; nabi dan rasul terakhir: Nabi Muhammad saw. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-B-5": [
      U("L2", "Tuliskan arti Alhamdulillah dan istigfar, lalu jelaskan kapan masing-masing diucapkan!", "Alhamdulillah = segala puji bagi Allah, diucapkan ketika mendapat nikmat atau kebaikan. Istigfar = memohon ampun kepada Allah, diucapkan ketika berbuat salah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-B-7": [
      U("L2", "Apa yang sebaiknya kita lakukan ketika mengalami kegagalan? Tuliskan dua hal!", "Contoh benar: mencoba lagi, berdoa, belajar lebih giat, terus berlatih. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-B-9": [
      U("L2", "Dalam hal apa kita diperintahkan tolong-menolong dan dalam hal apa dilarang? Berikan satu contoh menolong teman di madrasah!", "Diperintahkan dalam kebaikan dan takwa; dilarang dalam keburukan. Contoh: membantu teman yang kesulitan belajar, meminjamkan pensil.")
    ],
    "aa-B-10": [
      U("L2", "Tuliskan arti amanah dan lawannya, lalu jelaskan mengapa Rasulullah dijuluki Al-Amin!", "Amanah = dapat dipercaya; lawannya khianat. Rasulullah dijuluki Al-Amin karena beliau orang yang dapat dipercaya.")
    ],
    "aa-B-11": [
      U("L2", "Jelaskan arti kikir, serakah, dan kufur nikmat!", "Kikir: tidak mau berbagi atau memberi. Serakah: tidak pernah puas dan ingin menguasai semuanya. Kufur nikmat: tidak mensyukuri nikmat Allah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-B-13": [
      U("L2", "Apa yang harus kita lakukan ketika guru menjelaskan pelajaran dan ketika guru memberi tugas?", "Ketika guru menjelaskan: memperhatikan dan tidak berbicara sendiri. Ketika guru memberi tugas: mengerjakannya dengan sungguh-sungguh. Skor separuh untuk masing-masing.")
    ],
    "aa-B-15": [
      U("L2", "Sebutkan dua pelajaran yang dapat kita ambil dari kisah ketaatan Nabi Ibrahim a.s. dan Nabi Ismail a.s.!", "Contoh benar: taat kepada perintah Allah, ikhlas dan rela berkorban, sabar, patuh kepada orang tua. Skor sebanding jumlah jawaban yang benar.")
    ],
    /* ---------- Akidah Akhlak Fase C ---------- */
    "aa-C-2": [
      U("L2", "Tuliskan arti Al-Ghafur, As-Samad, dan Al-Waasi'!", "Al-Ghafur = Maha Pengampun; As-Samad = tempat bergantung segala makhluk; Al-Waasi' = Maha Luas. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-C-4": [
      U("L2", "Bagaimana sikap kita ketika berhasil dan ketika menghadapi musibah menurut iman kepada qada dan qadar?", "Ketika berhasil: bersyukur kepada Allah. Ketika menghadapi musibah: bersabar dan tetap berusaha. Skor separuh untuk masing-masing.")
    ],
    "aa-C-6": [
      U("L2", "Jelaskan arti sabar, apa yang harus menyertainya, dan tuliskan satu sikap yang berlawanan dengan sabar!", "Sabar: menahan diri dari keluh kesah ketika menghadapi ujian dan kesulitan; harus disertai usaha dan doa. Sikap yang berlawanan: tergesa-gesa atau mudah marah.")
    ],
    "aa-C-8": [
      U("L2", "Jelaskan arti pemaaf beserta lawannya, dan tuliskan apa yang harus kita lakukan jika bersalah kepada teman!", "Pemaaf: mudah memaafkan kesalahan orang lain; lawannya pendendam. Jika bersalah kepada teman: meminta maaf.")
    ],
    "aa-C-10": [
      U("L2", "Apa yang dimaksud fasik? Tuliskan satu contoh perbuatan fasik dan satu akibat marah yang tidak terkendali!", "Fasik: orang yang sering melanggar perintah Allah. Contoh: meninggalkan salat dengan sengaja. Akibat marah yang tidak terkendali: penyesalan dan merugikan orang lain.")
    ],
    "aa-C-12": [
      U("L2", "Apa yang sebaiknya dilakukan tamu jika tuan rumah belum menjawab salam atau belum membukakan pintu setelah tiga kali salam? Bagaimana sikap tuan rumah yang baik kepada tamunya?", "Tamu menunggu di luar dan tidak langsung masuk; jika setelah tiga kali salam pintu belum dibuka, pulang dengan baik. Tuan rumah menghormati tamunya dengan ramah.")
    ],
    "aa-C-14": [
      U("L2", "Sebutkan nama raja zalim yang dihadapi Nabi Musa a.s., saudara yang membantunya berdakwah, dan satu mukjizatnya!", "Fir'aun; Nabi Harun a.s.; mukjizat, misalnya tongkat yang berubah menjadi ular atau laut yang terbelah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aa-C-15": [
      U("L2", "Siapa nama ibu Nabi Isa a.s., kitab apa yang diturunkan kepadanya, dan bagaimana kelahirannya?", "Maryam; Injil; lahir tanpa ayah atas kehendak Allah. Skor sebanding jumlah jawaban yang benar.")
    ],
    /* ---------- Fikih Fase B ---------- */
    "fikih-B-1": [
      U("L2", "Sejak kapan sampai kapan puasa Ramadan dikerjakan dalam sehari? Apa nama makan yang dilakukan menjelang Subuh untuk berpuasa?", "Sejak terbit fajar (waktu Subuh) sampai terbenam matahari (waktu magrib). Makan menjelang Subuh disebut sahur.")
    ],
    "fikih-B-3": [
      U("L2", "Tuliskan nama salat sunah yang dikerjakan: (a) pagi hari setelah matahari naik, (b) malam bulan Ramadan sesudah Isya, (c) dengan rakaat ganjil setelah Isya!", "(a) Duha; (b) Tarawih; (c) Witir. Skor sebanding jumlah jawaban yang benar.")
    ],
    "fikih-B-5": [
      U("L2", "Jelaskan arti mukalaf dan sebutkan satu kewajiban yang harus dikerjakan perempuan setelah haid selesai!", "Mukalaf: orang yang sudah dibebani kewajiban agama (balig dan berakal). Setelah haid selesai, perempuan wajib mandi wajib.")
    ],
    /* ---------- Fikih Fase C ---------- */
    "fikih-C-1": [
      U("L2", "Siapa yang wajib mengeluarkan zakat dan siapa yang berhak menerimanya? Sebutkan juga satu contoh bahan zakat fitrah!", "Yang wajib mengeluarkan: muzaki. Yang berhak menerima: mustahik. Contoh zakat fitrah: beras atau makanan pokok. Skor sebanding jumlah jawaban yang benar.")
    ],
    "fikih-C-2": [
      U("L2", "Sebutkan satu hewan yang sah dan satu hewan yang tidak sah dijadikan kurban, serta kepada siapa dagingnya dibagikan!", "Sah: kambing (atau domba, sapi, unta). Tidak sah: ayam. Daging dibagikan kepada fakir miskin dan warga sekitar. Skor sebanding jumlah jawaban yang benar.")
    ],
    "fikih-C-4": [
      U("L2", "Tuliskan arti makanan halal dan dua contoh makanan atau minuman yang haram!", "Halal: boleh dimakan menurut syariat dan baik. Contoh haram: daging babi, khamr (minuman keras). Skor sebanding jumlah jawaban yang benar.")
    ],
    "fikih-C-6": [
      U("L2", "Apa yang harus dilakukan jika barang yang kita pinjam rusak karena kelalaian kita? Apa hukum meminjamkan barang kepada orang yang membutuhkan?", "Mengganti atau memperbaikinya. Meminjamkan barang kepada orang yang membutuhkan hukumnya sunah (dianjurkan). Skor separuh untuk masing-masing.")
    ],
    "fikih-C-8": [
      U("L2", "Tuliskan istilah fikih untuk barang temuan dan orang yang menemukannya, serta kepada siapa barang temuan di madrasah sebaiknya diserahkan!", "Barang temuan: luqathah; penemunya: multaqit; barang temuan di madrasah diserahkan kepada guru. Skor sebanding jumlah jawaban yang benar.")
    ],
    /* ---------- SKI Fase B ---------- */
    "ski-B-1": [
      U("L2", "Tuliskan nama kota kelahiran Nabi Muhammad saw., bangunan suci yang dibangun Nabi Ibrahim a.s. dan putranya, serta kedudukan perempuan pada zaman jahiliah!", "Mekah; Kakbah; kedudukan perempuan rendah dan tidak dihargai. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ski-B-4": [
      U("L2", "Sebutkan orang pertama dari kalangan wanita dan orang pertama dari kalangan laki-laki dewasa yang masuk Islam, serta paman yang melindungi dakwah Nabi!", "Khadijah; Abu Bakar; Abu Talib. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ski-B-5": [
      U("L2", "Tuliskan nama sahabat yang menemani Nabi berhijrah, nama lama kota Madinah, dan sebutan penduduk Madinah yang menolong kaum Muhajirin!", "Abu Bakar; Yatsrib; kaum Ansar. Skor sebanding jumlah jawaban yang benar.")
    ],
    /* ---------- SKI Fase C ---------- */
    "ski-C-1": [
      U("L2", "Jelaskan tujuan dibuatnya Piagam Madinah dan sebutkan masjid pertama yang dibangun Nabi di Madinah!", "Piagam Madinah dibuat untuk menjaga persatuan dan kerukunan warga Madinah. Masjid pertama: Masjid Quba.")
    ],
    "ski-C-3": [
      U("L2", "Mengapa Abu Bakar bergelar Ash-Shiddiq? Tuliskan satu peristiwa yang menunjukkan kesetiaannya kepada Nabi!", "Karena ia membenarkan peristiwa Isra Mikraj. Peristiwa kesetiaan: menemani Nabi bersembunyi di Gua Tsur ketika hijrah, atau menyerahkan banyak hartanya untuk perjuangan Islam.")
    ],
    "ski-C-6": [
      U("L2", "Tuliskan hubungan Ali bin Abi Thalib dengan Nabi Muhammad saw. dan peran Ali pada malam hijrah!", "Ali adalah putra paman Nabi (Abu Talib) sekaligus menantu Nabi, suami Fatimah az-Zahra. Pada malam hijrah, Ali tidur di tempat tidur Nabi untuk mengelabui kaum Quraisy.")
    ],
    "ski-C-7": [
      U("L2", "Bagaimana cara Wali Sanga berdakwah? Sebutkan satu contohnya!", "Dengan cara damai dan memanfaatkan budaya setempat. Contoh: Sunan Kalijaga berdakwah melalui kesenian wayang.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN Akidah Akhlak (isian sampai 4 per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "aa-A-1": [
      I("L1", "Rukun Islam yang pertama adalah membaca dua kalimat ....", "syahadat")
    ],
    "aa-A-2": [
      I("L1", "Rukun iman yang pertama adalah iman kepada ....", "Allah")
    ],
    "aa-A-3": [
      I("L1", "Allah bersifat sama', artinya Allah Maha ....", "Mendengar")
    ],
    "aa-A-4": [
      I("L1", "Malaikat yang bertugas menyampaikan wahyu kepada para nabi adalah ....", "Jibril")
    ],
    "aa-A-5": [
      I("L1", "Ar-Rahman artinya Maha ....", "Pengasih")
    ],
    "aa-A-6": [
      I("L1", "Al-Aziz artinya Maha ....", "Perkasa")
    ],
    "aa-A-7": [
      I("L1", "Alhamdulillah diucapkan ketika kita mendapat ....", "nikmat (kebaikan)")
    ],
    "aa-A-8": [
      I("L1", "Menyikat gigi sebaiknya dilakukan sesudah makan dan sebelum ....", "tidur")
    ],
    "aa-A-9": [
      I("L1", "Mengembalikan barang teman yang tertinggal termasuk sikap ....", "jujur")
    ],
    "aa-A-10": [
      I("L1", "Sikap sombong adalah sikap yang ... oleh Allah.", "dibenci (tidak disukai)")
    ],
    "aa-A-11": [
      I("L1", "Akhlak yang baik disebut akhlak ....", "terpuji (mahmudah)")
    ],
    "aa-A-12": [
      I("L1", "Doa sebelum belajar dibaca agar ilmu yang kita pelajari ....", "bermanfaat")
    ],
    "aa-A-13": [
      I("L1", "Ketika melepas sepatu, kita mendahulukan kaki ....", "kiri")
    ],
    "aa-A-14": [
      I("L1", "Orang yang bersin mengucapkan ....", "Alhamdulillah")
    ],
    "aa-A-15": [
      I("L1", "Makan dan minum sebaiknya dengan tangan ....", "kanan")
    ],
    "aa-A-16": [
      I("L1", "Ayah Nabi Muhammad saw. bernama ....", "Abdullah")
    ],
    "aa-A-17": [
      I("L1", "Nabi Nuh a.s. dan para pengikutnya selamat dari banjir karena naik ....", "kapal")
    ],
    "aa-B-1": [
      I("L1", "Ar-Razzaq artinya Maha Pemberi ....", "Rezeki"),
      I("L1", "Al-Karim artinya Maha ....", "Mulia")
    ],
    "aa-B-2": [
      I("L1", "Al-Bashir artinya Maha ....", "Melihat")
    ],
    "aa-B-3": [
      I("L1", "Kitab Taurat diturunkan kepada Nabi ....", "Musa"),
      I("L1", "Kitab Injil diturunkan kepada Nabi ....", "Isa")
    ],
    "aa-B-4": [
      I("L1", "Nabi Ibrahim a.s. membangun Ka'bah bersama putranya, yaitu Nabi ....", "Ismail")
    ],
    "aa-B-5": [
      I("L1", "Ucapan 'Subhanallah' artinya Maha ....", "Suci")
    ],
    "aa-B-6": [
      I("L1", "Bersyukur dapat dilakukan dengan hati, lisan, dan ....", "perbuatan"),
      I("L1", "Orang yang bersyukur akan ditambah nikmatnya oleh ....", "Allah")
    ],
    "aa-B-7": [
      I("L1", "Orang yang berhenti mencoba ketika gagal disebut orang yang mudah putus ....", "asa")
    ],
    "aa-B-8": [
      I("L1", "Anak yang pemberani berani berkata ....", "benar (jujur)"),
      I("L1", "Pemberani bukan berarti suka ....", "berkelahi")
    ],
    "aa-B-9": [
      I("L1", "Allah melarang tolong-menolong dalam dosa dan ....", "permusuhan"),
      I("L1", "Menolong teman yang terjatuh termasuk perbuatan ....", "terpuji")
    ],
    "aa-B-10": [
      I("L1", "Menjaga rahasia teman termasuk sikap ....", "amanah"),
      I("L1", "Barang pinjaman harus kita ... tepat waktu.", "kembalikan")
    ],
    "aa-B-11": [
      I("L1", "Sifat selalu ingin memiliki lebih banyak untuk diri sendiri disebut ....", "serakah (tamak)")
    ],
    "aa-B-12": [
      I("L1", "Orang tua harus kita panggil dengan suara yang ... dan lembut.", "sopan"),
      I("L1", "Ibu telah berjasa karena mengandung dan ... kita.", "melahirkan")
    ],
    "aa-B-13": [
      I("L1", "Madrasah adalah tempat kita menuntut ... dari guru.", "ilmu"),
      I("L1", "Mencium tangan guru saat bertemu menunjukkan sikap ....", "hormat")
    ],
    "aa-B-14": [
      I("L1", "Jika dua temanmu bertengkar, kita sebaiknya ... mereka.", "mendamaikan"),
      I("L1", "Berbicara kasar kepada teman termasuk akhlak ....", "tercela")
    ],
    "aa-B-15": [
      I("L1", "Kisah penyembelihan Nabi Ismail a.s. menjadi dasar ibadah ....", "kurban")
    ],
    "aa-C-1": [
      I("L1", "Al-Hayy artinya Maha ....", "Hidup"),
      I("L1", "Al-Qadir artinya Maha ....", "Kuasa (Berkuasa)")
    ],
    "aa-C-2": [
      I("L1", "Ar-Raqib artinya Maha ....", "Mengawasi")
    ],
    "aa-C-3": [
      I("L1", "Hari kiamat disebut juga hari ....", "akhir"),
      I("L1", "Tempat balasan bagi orang yang durhaka kepada Allah adalah ....", "neraka")
    ],
    "aa-C-4": [
      I("L1", "Hasil usaha sudah ditentukan Allah, tetapi kita tetap wajib ....", "berusaha")
    ],
    "aa-C-5": [
      I("L1", "Kalimat 'Subhanallah' disebut kalimat ....", "tasbih"),
      I("L1", "Kalimat 'Alhamdulillah' disebut kalimat ....", "tahmid")
    ],
    "aa-C-6": [
      I("L1", "Sabar ketika ditimpa musibah disebut sabar menghadapi ....", "musibah (cobaan)")
    ],
    "aa-C-7": [
      I("L1", "Merapikan tempat tidur sendiri termasuk sikap ....", "mandiri"),
      I("L1", "Masuk kelas sebelum bel berbunyi termasuk sikap ....", "disiplin")
    ],
    "aa-C-8": [
      I("L1", "Memaafkan kesalahan orang lain disebut sikap ....", "pemaaf")
    ],
    "aa-C-9": [
      I("L1", "Memberi hukuman sesuai kesalahan tanpa pilih kasih disebut sikap ....", "adil"),
      I("L1", "Berbuat adil kepada semua teman termasuk akhlak ....", "terpuji")
    ],
    "aa-C-10": [
      I("L1", "Lawan dari pemarah adalah ....", "penyabar (sabar)")
    ],
    "aa-C-11": [
      I("L1", "Iri hati berarti tidak suka melihat ... orang lain.", "kebahagiaan (nikmat)"),
      I("L1", "Pilih kasih termasuk akhlak ....", "tercela")
    ],
    "aa-C-12": [
      I("L1", "Memuliakan tamu merupakan ajaran agama ....", "Islam")
    ],
    "aa-C-13": [
      I("L1", "Tetangga yang sedang kesusahan harus kita ....", "tolong (bantu)"),
      I("L1", "Sampah sebaiknya dibuang pada ....", "tempat sampah")
    ],
    "aa-C-14": [
      I("L1", "Laut yang terbelah atas mukjizat Nabi Musa a.s. adalah Laut ....", "Merah")
    ],
    "aa-C-15": [
      I("L1", "Nabi Isa a.s. diberi mukjizat dapat menghidupkan orang ... dengan izin Allah.", "mati"),
      I("L1", "Nabi Isa a.s. diutus kepada kaum Bani ....", "Israil")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN Fikih (isian sampai 4 per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "fikih-A-1": [
      I("L1", "Rukun Islam yang ketiga adalah ....", "zakat")
    ],
    "fikih-A-2": [
      I("L1", "Syahadat artinya ....", "kesaksian")
    ],
    "fikih-A-3": [
      I("L1", "Membasuh muka termasuk rukun ....", "wudu")
    ],
    "fikih-A-4": [
      I("L1", "Salat Asar terdiri dari ... rakaat.", "empat")
    ],
    "fikih-A-5": [
      I("L1", "Saf salat berjemaah harus lurus dan ....", "rapat")
    ],
    "fikih-A-6": [
      I("L1", "Azan dikumandangkan untuk memberitahukan masuknya waktu ....", "salat")
    ],
    "fikih-A-7": [
      I("L1", "Bacaan 'Allahu Akbar' disebut juga ....", "takbir")
    ],
    "fikih-B-1": [
      I("L1", "Makan sahur dilakukan sebelum waktu ....", "Subuh"),
      I("L1", "Puasa Ramadan hukumnya ... bagi muslim yang mampu.", "wajib")
    ],
    "fikih-B-2": [
      I("L1", "Salat Jumat dikerjakan secara ....", "berjemaah"),
      I("L1", "Khutbah Jumat disampaikan ... salat Jumat dilaksanakan.", "sebelum")
    ],
    "fikih-B-3": [
      I("L1", "Salat sunah dua rakaat ketika masuk masjid disebut salat tahiyatul ....", "masjid")
    ],
    "fikih-B-4": [
      I("L1", "Jamak dan qasar adalah keringanan bagi orang yang sedang ....", "bepergian (musafir)"),
      I("L1", "Orang yang melakukan perjalanan jauh disebut ....", "musafir")
    ],
    "fikih-B-5": [
      I("L1", "Selain haid, perempuan juga wajib mandi setelah selesai ....", "nifas")
    ],
    "fikih-B-6": [
      I("L1", "Keluarnya darah haid termasuk penyebab hadas ....", "besar"),
      I("L1", "Hadas kecil disucikan dengan ....", "wudu")
    ],
    "fikih-C-1": [
      I("L1", "Orang yang berhak menerima zakat disebut ....", "mustahik"),
      I("L1", "Orang yang wajib mengeluarkan zakat disebut ....", "muzaki")
    ],
    "fikih-C-2": [
      I("L1", "Hewan kurban dapat berupa kambing, sapi, atau ....", "unta"),
      I("L1", "Berkurban dilakukan untuk mendekatkan diri kepada ....", "Allah")
    ],
    "fikih-C-3": [
      I("L1", "Ibadah berlari kecil antara bukit Safa dan Marwah disebut ....", "sai"),
      I("L1", "Pakaian ihram bagi laki-laki berwarna ....", "putih")
    ],
    "fikih-C-4": [
      I("L1", "Minuman yang memabukkan hukumnya ....", "haram"),
      I("L1", "Hewan yang halal dimakan harus disembelih dengan menyebut nama ....", "Allah")
    ],
    "fikih-C-5": [
      I("L1", "Penjual dan pembeli harus saling ... dalam jual beli.", "rida"),
      I("L1", "Orang yang menjual barang disebut ....", "penjual")
    ],
    "fikih-C-6": [
      I("L1", "Meminjam barang harus dengan ... pemiliknya.", "izin"),
      I("L1", "Mengembalikan barang pinjaman tepat waktu termasuk sifat ....", "amanah")
    ],
    "fikih-C-7": [
      I("L1", "Orang yang merusak barang hasil gasab wajib ... kerugiannya.", "mengganti"),
      I("L1", "Sebelum memakai barang teman, kita harus meminta ....", "izin")
    ],
    "fikih-C-8": [
      I("L1", "Barang temuan harus disimpan dengan ....", "aman")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN SKI (isian sampai 4 per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "ski-B-1": [
      I("L1", "Masa sebelum datangnya Islam disebut zaman ....", "jahiliah"),
      I("L1", "Masyarakat jahiliah menyembah ....", "berhala")
    ],
    "ski-B-2": [
      I("L1", "Kakek yang mengasuh Nabi Muhammad saw. setelah ibunda wafat adalah Abdul ....", "Muththalib"),
      I("L1", "Nabi Muhammad saw. lahir pada bulan ....", "Rabiulawal")
    ],
    "ski-B-3": [
      I("L1", "Gua tempat Nabi Muhammad saw. menerima wahyu pertama adalah Gua ....", "Hira"),
      I("L1", "Surah yang pertama kali turun adalah surah Al-....", "'Alaq (Alaq)")
    ],
    "ski-B-4": [
      I("L1", "Istri Nabi Muhammad saw. yang pertama masuk Islam adalah Siti ....", "Khadijah")
    ],
    "ski-B-5": [
      I("L1", "Sebelum bernama Madinah, kota tujuan hijrah Nabi bernama ....", "Yatsrib"),
      I("L1", "Hijrah artinya ....", "berpindah")
    ],
    "ski-B-6": [
      I("L1", "Dalam peristiwa Isra Mikraj, Nabi menerima perintah salat ... waktu sehari semalam.", "lima"),
      I("L1", "Isra adalah perjalanan dari Masjidil Haram ke Masjidil ....", "Aqsa")
    ],
    "ski-C-1": [
      I("L1", "Masjid Nabawi terletak di kota ....", "Madinah"),
      I("L1", "Persaudaraan antara kaum Muhajirin dan kaum Ansar disebut ukhuwah ....", "Islamiyah")
    ],
    "ski-C-2": [
      I("L1", "Nabi Muhammad saw. wafat pada usia ... tahun.", "63"),
      I("L1", "Nabi Muhammad saw. dimakamkan di Madinah dekat Masjid ....", "Nabawi")
    ],
    "ski-C-3": [
      I("L1", "Pada masa Abu Bakar, orang yang tidak mau membayar ... diperangi.", "zakat")
    ],
    "ski-C-4": [
      I("L1", "Umar bin Khattab adalah khalifah yang ke ... (urutan).", "dua (kedua)"),
      I("L1", "Pada masa Umar, penanggalan Islam dimulai sejak peristiwa ....", "hijrah")
    ],
    "ski-C-5": [
      I("L1", "Khalifah Usman bin Affan terkenal sebagai sahabat yang sangat ....", "dermawan"),
      I("L1", "Usman bin Affan menikahi dua putri Nabi, yaitu Ruqayyah dan Ummu ....", "Kultsum")
    ],
    "ski-C-6": [
      I("L1", "Istri Ali bin Abi Thalib adalah Fatimah, putri Nabi ....", "Muhammad saw.")
    ],
    "ski-C-7": [
      I("L1", "Wali Sanga artinya ... wali.", "sembilan"),
      I("L1", "Sunan Giri berdakwah di Gresik, Provinsi Jawa ....", "Timur")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PG Akidah Akhlak (sampai 6 PG per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "aa-A-1": [
      P("L1", "Rukun Islam yang pertama adalah ...", "membaca dua kalimat syahadat", "salat", "puasa", "zakat")
    ],
    "aa-A-2": [
      P("L1", "Iman kepada rasul adalah rukun iman yang ke ...", "empat", "dua", "tiga", "lima"),
      P("L1", "Iman kepada hari akhir adalah rukun iman yang ke ...", "lima", "tiga", "empat", "enam")
    ],
    "aa-A-3": [
      P("L1", "Allah bersifat sama', artinya Allah Maha ...", "Mendengar", "Melihat", "Mengetahui", "Berkuasa"),
      P("L1", "Allah bersifat hayat, artinya Allah ...", "hidup", "ada", "kekal", "baru")
    ],
    "aa-A-4": [
      P("L1", "Malaikat yang bertugas membagi rezeki adalah ...", "Mikail", "Jibril", "Izrail", "Israfil")
    ],
    "aa-A-5": [
      P("L1", "Al-Malik artinya Maha ...", "Merajai", "Penyayang", "Pengampun", "Kuat"),
      P("L1", "Al-Quddus artinya Maha ...", "Suci", "Pengasih", "Perkasa", "Penyayang")
    ],
    "aa-A-6": [
      P("L1", "Al-Mukmin artinya Maha Memberi ...", "keamanan", "rezeki", "ampunan", "kekuatan"),
      P("L1", "Asmaulhusna yang berarti Maha Perkasa adalah ...", "Al-Aziz", "Al-Quddus", "As-Salam", "Al-Malik")
    ],
    "aa-A-7": [
      P("L1", "Kalimat hamdalah adalah ...", "Alhamdulillah", "Bismillah", "Astaghfirullah", "Subhanallah")
    ],
    "aa-A-8": [
      P("L1", "Memotong kuku yang panjang termasuk perilaku hidup ...", "bersih", "boros", "malas", "kotor")
    ],
    "aa-A-9": [
      P("L1", "Lawan dari jujur adalah ...", "bohong", "rajin", "sabar", "ikhlas")
    ],
    "aa-A-10": [
      P("L1", "Orang yang tidak sombong disebut orang yang ...", "rendah hati", "pemarah", "iri", "pelit")
    ],
    "aa-A-11": [
      P("L1", "Lawan dari rajin adalah ...", "malas", "jujur", "sabar", "ramah")
    ],
    "aa-A-12": [
      P("L1", "Ketika masuk kelas, kita mengucapkan ...", "salam", "bohong", "ejekan", "teriakan")
    ],
    "aa-A-13": [
      P("L1", "Pakaian seorang muslim harus menutup ...", "aurat", "wajah saja", "kaki saja", "tangan saja"),
      P("L1", "Ketika melepas sepatu, kita mendahulukan kaki ...", "kiri", "kanan", "kedua-duanya", "tidak ada")
    ],
    "aa-A-14": [
      P("L1", "Jawaban bagi orang yang bersin dan mengucap hamdalah adalah ...", "Yarhamukallah", "Astaghfirullah", "Subhanallah", "Innalillahi")
    ],
    "aa-A-15": [
      P("L1", "Makan secara berlebihan dan membuang makanan disebut ...", "mubazir", "hemat", "rajin", "jujur")
    ],
    "aa-A-16": [
      P("L1", "Ibu susu Nabi Muhammad saw. bernama ...", "Halimah", "Aminah", "Khadijah", "Aisyah")
    ],
    "aa-A-17": [
      P("L1", "Nabi Nuh a.s. termasuk Nabi ...", "Ulul Azmi", "biasa saja", "terakhir", "pertama")
    ],
    "aa-B-1": [
      P("L1", "Al-'Adhim artinya Maha ...", "Agung", "Kuat", "Kaya", "Pengampun")
    ],
    "aa-B-2": [
      P("L1", "Al-'Alim artinya Maha ...", "Mengetahui", "Mendengar", "Melihat", "Kuat"),
      P("L1", "Al-Waliy artinya Maha ...", "Melindungi", "Menciptakan", "Mematikan", "Menghidupkan")
    ],
    "aa-B-3": [
      P("L1", "Kitab Zabur diturunkan kepada Nabi ...", "Daud", "Musa", "Isa", "Ibrahim"),
      P("L1", "Al-Qur'an disebut juga ...", "Al-Furqan", "Al-Zabur", "Al-Taurat", "Al-Injil")
    ],
    "aa-B-4": [
      P("L1", "Nabi pertama adalah Nabi ...", "Adam a.s.", "Nuh a.s.", "Ibrahim a.s.", "Muhammad saw.")
    ],
    "aa-B-5": [
      P("L1", "Ucapan 'Alhamdulillah' artinya ...", "segala puji bagi Allah", "Allah Maha Suci", "Atas kehendak Allah", "Aku memohon ampun")
    ],
    "aa-B-6": [
      P("L1", "Orang yang tidak mau bersyukur disebut orang yang ...", "kufur nikmat", "dermawan", "sabar", "jujur")
    ],
    "aa-B-7": [
      P("L1", "Orang yang tidak mudah putus asa disebut orang yang ...", "pantang menyerah", "pemalu", "pemalas", "penakut")
    ],
    "aa-B-8": [
      P("L1", "Lawan dari berani adalah ...", "takut", "jujur", "rajin", "sabar")
    ],
    "aa-B-9": [
      P("L1", "Saling membantu dalam kebaikan disebut ...", "tolong-menolong", "bermusuhan", "pilih kasih", "egois")
    ],
    "aa-B-10": [
      P("L1", "Lawan dari amanah adalah ...", "khianat", "jujur", "sabar", "rendah hati")
    ],
    "aa-B-11": [
      P("L1", "Orang yang suka berbagi kepada sesama disebut ...", "dermawan", "kikir", "serakah", "pelit")
    ],
    "aa-B-12": [
      P("L1", "Ridha Allah tergantung pada ridha ...", "orang tua", "teman", "tetangga", "guru")
    ],
    "aa-B-13": [
      P("L1", "Orang yang mengajarkan ilmu kepada kita disebut ...", "guru", "tetangga", "penjual", "petani")
    ],
    "aa-B-14": [
      P("L1", "Kita tidak boleh memanggil teman dengan julukan yang ...", "buruk", "baik", "lucu", "indah")
    ],
    "aa-B-15": [
      P("L1", "Allah menggantikan Nabi Ismail a.s. dengan seekor ...", "domba", "sapi", "unta", "kambing hutan")
    ],
    "aa-C-1": [
      P("L1", "Al-Qawiyy artinya Maha ...", "Kuat", "Kaya", "Suci", "Teliti")
    ],
    "aa-C-2": [
      P("L1", "Al-Ahad artinya Maha ...", "Esa", "Luas", "Kuat", "Mengampuni")
    ],
    "aa-C-3": [
      P("L1", "Tempat balasan bagi orang beriman dan beramal saleh adalah ...", "surga", "neraka", "barzakh", "mahsyar")
    ],
    "aa-C-4": [
      P("L1", "Berusaha lalu menyerahkan hasilnya kepada Allah disebut ...", "tawakal", "putus asa", "sombong", "iri")
    ],
    "aa-C-5": [
      P("L1", "Kalimat 'Laa ilaaha illallah' disebut kalimat ...", "tahlil", "takbir", "tasbih", "tahmid")
    ],
    "aa-C-6": [
      P("L1", "Sikap tergesa-gesa dan mudah marah berlawanan dengan sikap ...", "sabar", "jujur", "mandiri", "disiplin")
    ],
    "aa-C-7": [
      P("L1", "Mengerjakan tugas sendiri tanpa bergantung pada orang lain disebut ...", "mandiri", "manja", "malas", "ceroboh")
    ],
    "aa-C-8": [
      P("L1", "Berani menanggung akibat perbuatan sendiri disebut ...", "tanggung jawab", "pemaaf", "iri hati", "sombong")
    ],
    "aa-C-9": [
      P("L1", "Lawan dari adil adalah ...", "zalim", "jujur", "sabar", "rendah hati")
    ],
    "aa-C-10": [
      P("L1", "Orang yang suka melanggar perintah Allah disebut ...", "fasik", "muttaqin", "dermawan", "pemaaf")
    ],
    "aa-C-11": [
      P("L1", "Iri hati disebut juga ...", "hasad", "sabar", "syukur", "ikhlas")
    ],
    "aa-C-12": [
      P("L1", "Salam yang diucapkan ketika bertamu adalah ...", "Assalamu'alaikum", "Selamat tinggal", "Permisi saja", "Halo")
    ],
    "aa-C-13": [
      P("L1", "Orang yang tinggal di dekat rumah kita disebut ...", "tetangga", "saudara jauh", "musafir", "tamu")
    ],
    "aa-C-14": [
      P("L1", "Kitab yang diturunkan kepada Nabi Musa a.s. adalah ...", "Taurat", "Zabur", "Injil", "Al-Qur'an")
    ],
    "aa-C-15": [
      P("L1", "Nabi Isa a.s. lahir tanpa ...", "ayah", "ibu", "nama", "kitab"),
      P("L1", "Nabi Isa a.s. diutus kepada kaum ...", "Bani Israil", "Quraisy", "Madyan", "Tsamud")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PG Fikih dan SKI (sampai 6 PG per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "fikih-A-1": [
      P("L1", "Rukun Islam yang keempat adalah ...", "puasa Ramadan", "salat", "zakat", "haji"),
      P("L1", "Rukun Islam yang kelima adalah ...", "haji bagi yang mampu", "zakat", "puasa", "salat")
    ],
    "fikih-A-2": [
      P("L1", "Orang yang telah mengucapkan dua kalimat syahadat disebut ...", "muslim", "kafir", "munafik", "musafir")
    ],
    "fikih-A-3": [
      P("L1", "Urutan pertama rukun wudu adalah ...", "niat", "membasuh muka", "mengusap kepala", "membasuh kaki")
    ],
    "fikih-A-4": [
      P("L1", "Jumlah rakaat salat Subuh adalah ...", "dua", "tiga", "empat", "lima")
    ],
    "fikih-A-5": [
      P("L1", "Orang yang berada di belakang imam saat salat berjemaah disebut ...", "makmum", "muazin", "khatib", "muslim")
    ],
    "fikih-A-6": [
      P("L1", "Muazin adalah orang yang ...", "mengumandangkan azan", "memimpin salat", "membaca khutbah", "membagi zakat")
    ],
    "fikih-A-7": [
      P("L1", "Ucapan 'Alhamdulillah' artinya ...", "segala puji bagi Allah", "Maha Suci Allah", "Allah Maha Besar", "tidak ada Tuhan selain Allah")
    ],
    "fikih-B-1": [
      P("L1", "Waktu berbuka puasa adalah saat ...", "matahari terbenam", "fajar terbit", "tengah hari", "tengah malam"),
      P("L1", "Hal yang membatalkan puasa adalah ...", "makan dan minum dengan sengaja", "menggosok gigi", "berkumur ringan", "tidur")
    ],
    "fikih-B-2": [
      P("L1", "Jumlah rakaat salat Jumat adalah ...", "dua", "tiga", "empat", "lima")
    ],
    "fikih-B-3": [
      P("L1", "Salat tahiyatul masjid dikerjakan ketika ...", "masuk masjid", "keluar rumah", "sebelum makan", "sebelum tidur")
    ],
    "fikih-B-4": [
      P("L1", "Orang yang boleh menjamak dan mengqasar salat adalah ...", "musafir", "orang yang menetap di rumah", "orang yang sedang tidur", "orang yang sehat di rumah")
    ],
    "fikih-B-5": [
      P("L1", "Setelah balig, seorang muslim ...", "wajib melaksanakan ibadah", "bebas dari ibadah", "tidak berdosa melanggar", "tidak perlu belajar agama")
    ],
    "fikih-B-6": [
      P("L1", "Hadas besar juga disebabkan oleh keluarnya ...", "mani", "keringat", "air mata", "ludah")
    ],
    "fikih-C-1": [
      P("L1", "Zakat fitrah dibayarkan sebelum ...", "salat Idulfitri", "salat Zuhur", "bulan Rajab", "bulan Muharam"),
      P("L1", "Muzaki adalah ...", "orang yang mengeluarkan zakat", "penerima zakat", "petugas masjid", "penjual beras")
    ],
    "fikih-C-2": [
      P("L1", "Hari raya kurban jatuh pada tanggal ...", "10 Zulhijah", "1 Syawal", "1 Muharam", "12 Rabiulawal")
    ],
    "fikih-C-3": [
      P("L1", "Rukun haji yang paling pokok adalah ...", "wukuf di Arafah", "bermain di Mina", "berbelanja", "berfoto")
    ],
    "fikih-C-4": [
      P("L1", "Makanan yang halal dan baik disebut ...", "halalan thayyiban", "haram", "syubhat", "najis")
    ],
    "fikih-C-5": [
      P("L1", "Ucapan ijab dalam jual beli diucapkan oleh ...", "penjual", "pembeli", "saksi", "wali")
    ],
    "fikih-C-6": [
      P("L1", "Meminjam barang tanpa izin pemiliknya termasuk perbuatan ...", "tidak terpuji", "terpuji", "sunah", "wajib")
    ],
    "fikih-C-7": [
      P("L1", "Jika barang hasil gasab rusak, pelaku wajib ...", "menggantinya", "mendiamkannya", "menyembunyikannya", "menjualnya")
    ],
    "fikih-C-8": [
      P("L1", "Jika menemukan dompet di jalan, langkah pertama adalah ...", "mencari pemiliknya", "memakai isinya", "membuangnya", "menyembunyikannya")
    ],
    "ski-B-1": [
      P("L1", "Agama yang umum dianut masyarakat Arab jahiliah adalah ...", "menyembah berhala", "Islam", "Nasrani yang taat", "tidak ada")
    ],
    "ski-B-2": [
      P("L1", "Tahun kelahiran Nabi Muhammad saw. disebut tahun ...", "Gajah", "Hijrah", "Duka Cita", "Pertama")
    ],
    "ski-B-3": [
      P("L1", "Kata 'Iqra'' artinya ...", "bacalah", "tulislah", "dengarlah", "berdirilah")
    ],
    "ski-B-4": [
      P("L1", "Orang pertama dari kalangan anak-anak yang masuk Islam adalah ...", "Ali bin Abi Thalib", "Umar bin Khattab", "Usman bin Affan", "Khalid bin Walid")
    ],
    "ski-B-5": [
      P("L1", "Kaum Ansar adalah ...", "penduduk Madinah penolong kaum Muhajirin", "penduduk Mekah yang memusuhi Nabi", "pedagang dari Syam", "orang Habsyah")
    ],
    "ski-B-6": [
      P("L1", "Mikraj adalah perjalanan Nabi dari Masjidilaksa ke ...", "Sidratul Muntaha", "Mekah", "Madinah", "Gua Hira")
    ],
    "ski-C-1": [
      P("L1", "Di Madinah, Nabi mempersaudarakan kaum ...", "Muhajirin dan Ansar", "Quraisy dan Yahudi", "Madyan dan Tsamud", "Habsyah dan Mesir")
    ],
    "ski-C-2": [
      P("L1", "Usia Nabi Muhammad saw. ketika wafat adalah ...", "63 tahun", "53 tahun", "73 tahun", "40 tahun")
    ],
    "ski-C-3": [
      P("L1", "Abu Bakar memimpin umat Islam sebagai khalifah selama sekitar ...", "dua tahun", "sepuluh tahun", "dua belas tahun", "dua puluh lima tahun")
    ],
    "ski-C-4": [
      P("L1", "Penanggalan Hijriah ditetapkan pada masa khalifah ...", "Umar bin Khattab", "Abu Bakar", "Usman bin Affan", "Ali bin Abi Thalib")
    ],
    "ski-C-5": [
      P("L1", "Pada masa Usman, Al-Qur'an dikumpulkan dalam satu ...", "mushaf", "buku sejarah", "kitab fikih", "surat"),
      P("L1", "Usman bin Affan dikenal sebagai sahabat yang pemalu dan ...", "dermawan", "pelit", "pemarah", "penakut")
    ],
    "ski-C-6": [
      P("L1", "Empat khalifah pertama setelah Nabi wafat disebut ...", "Khulafaur Rasyidin", "Wali Sanga", "Bani Umayyah", "Tabiin")
    ],
    "ski-C-7": [
      P("L1", "Sunan Kalijaga berdakwah dengan memanfaatkan ...", "seni dan budaya setempat", "perang", "pelarangan seni", "pelayaran saja")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
