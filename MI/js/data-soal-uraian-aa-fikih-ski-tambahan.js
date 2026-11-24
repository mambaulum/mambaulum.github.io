/* ============================================================
   SI MAMBA - js/data-soal-uraian-aa-fikih-ski-tambahan.js
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
