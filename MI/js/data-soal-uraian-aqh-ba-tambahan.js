/* ============================================================
   SI MAMBA - js/data-soal-uraian-aqh-ba-tambahan.js
   TAMBAHAN bank soal DRAF: +1 Uraian untuk 43 TP yang di bank gabungan baru punya 1 uraian, supaya dua kelas
   dalam satu fase tidak mendapat uraian yang sama persis (perangkat-soal.js membagi urutan soal ganjil/genap antar kelas).
   Cakupan: Al-Qur'an Hadis Fase B (aqh-B-1..7, 9..13) dan Fase C (aqh-C-1..12),
            Bahasa Arab Fase B (ba-B-1..12) dan Fase C (ba-C-2..7, ba-C-9).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang. Isi soal memakai materi yang sudah ada di bank
   untuk TP yang sama (kosakata dan fakta dasar), bukan hafalan teks Arab.
   Status DRAF: guru wajib memeriksa soal, kunci, dan harakat Arabnya.
   WAJIB dimuat SESUDAH js/data-soal-semua.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    /* ---------- Al-Qur'an Hadis Fase B ---------- */
    "aqh-B-1": [
      U("L2", "Jelaskan apa yang dimaksud kalkalah dan kapan bunyi pantulan itu terjadi!", "Kalkalah adalah bunyi memantul pada huruf kalkalah (qaf, tha, ba, jim, dal). Pantulan terjadi ketika huruf kalkalah dalam keadaan sukun (mati).")
    ],
    "aqh-B-2": [
      U("L2", "Sebutkan tiga huruf mad dan berapa harakat panjang bacaan mad tabi'i!", "Huruf mad: alif, wawu sukun, dan ya sukun. Mad tabi'i dibaca dua harakat. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aqh-B-3": [
      U("L2", "Mengapa huruf-huruf izhar disebut izhar halqi? Jelaskan!", "Halqi berarti tenggorokan; huruf-hurufnya keluar dari tenggorokan, dan nun sukun atau tanwin yang bertemu huruf-huruf itu dibaca jelas.")
    ],
    "aqh-B-4": [
      U("L2", "Jelaskan cara membaca ikhfa hakiki!", "Nun sukun atau tanwin yang bertemu salah satu dari lima belas huruf ikhfa dibaca samar, disertai dengung sekitar dua harakat.")
    ],
    "aqh-B-5": [
      U("L2", "Apa perbedaan cara membaca idgam bigunnah dan idgam bilagunnah? Sebutkan huruf masing-masing!", "Idgam bigunnah dibaca dengan dengung; hurufnya ya, nun, mim, wawu. Idgam bilagunnah dibaca tanpa dengung; hurufnya lam dan ra. Skor separuh untuk masing-masing.")
    ],
    "aqh-B-6": [
      U("L2", "Sebutkan huruf iqlab dan jelaskan apa yang berubah pada nun sukun atau tanwin ketika bertemu huruf itu!", "Huruf iqlab adalah ba. Nun sukun atau tanwin diganti dengan bunyi mim.")
    ],
    "aqh-B-7": [
      U("L2", "Tuliskan arti nama surah Al-Fil dan Al-Kautsar beserta jumlah ayat masing-masing!", "Al-Fil: gajah, 5 ayat. Al-Kautsar: nikmat yang banyak, 3 ayat. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aqh-B-9": [
      U("L2", "Tuliskan dua adab makmum ketika salat berjemaah!", "Contoh benar: mengikuti gerakan imam dan tidak mendahuluinya; berdiri di belakang imam; meluruskan dan merapatkan saf. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aqh-B-10": [
      U("L2", "Jelaskan arti hadis \"seorang muslim adalah saudara bagi muslim lainnya\" dan sebutkan satu hal yang tidak boleh dilakukan kepada saudara sesama muslim!", "Arti: sesama muslim bersaudara. Yang tidak boleh dilakukan: menzalimi atau menyakiti saudaranya (jawaban lain yang sesuai, misalnya mengejek atau membiarkannya kesusahan, juga dinilai benar).")
    ],
    "aqh-B-11": [
      U("L2", "Menurut hadis tentang takwa, apa yang dianjurkan jika kita berbuat kesalahan? Berikan satu contohnya!", "Segera mengiringi kesalahan itu dengan perbuatan baik. Contoh benar: meminta maaf, bersedekah, salat sunah, membantu teman.")
    ],
    "aqh-B-12": [
      U("L2", "Bedakan niat ikhlas dan riya, lalu berikan satu contoh niat ikhlas ketika belajar!", "Ikhlas: beramal hanya karena Allah. Riya: beramal karena ingin dipuji orang. Contoh: belajar dengan sungguh-sungguh karena Allah agar memperoleh ilmu yang bermanfaat.")
    ],
    "aqh-B-13": [
      U("L2", "Sebutkan dua manfaat silaturahmi menurut hadis!", "Diluaskan rezekinya dan dipanjangkan umurnya. Skor sebanding jumlah jawaban yang benar.")
    ],
    /* ---------- Al-Qur'an Hadis Fase C ---------- */
    "aqh-C-1": [
      U("L2", "Bagaimana cara membaca mim sukun yang bertemu huruf ba? Sebutkan nama hukum bacaannya dan cirinya!", "Ikhfa syafawi: dibaca samar dengan dengung sekitar dua harakat.")
    ],
    "aqh-C-2": [
      U("L2", "Mengapa kita perlu berhenti (waqaf) ketika membaca Al-Qur'an? Apa arti tanda \"لا\" pada ayat?", "Waqaf dilakukan agar bacaan jelas maknanya dan cukup napas. Tanda \"لا\" berarti tidak boleh berhenti.")
    ],
    "aqh-C-3": [
      U("L2", "Sebutkan dua keadaan ra' dibaca tarqiq dan tuliskan arti tarqiq!", "Ra' berharakat kasrah; ra' sukun yang jatuh sesudah kasrah. Tarqiq berarti tipis. Skor sebanding jumlah jawaban yang benar.")
    ],
    "aqh-C-4": [
      U("L2", "Tuliskan arti kata \"jawaz\" dan \"wajhain\" dalam istilah jawazul wajhain!", "Jawaz berarti boleh; wajhain berarti dua cara. Skor separuh untuk masing-masing.")
    ],
    "aqh-C-5": [
      U("L2", "Jelaskan arti munafik dan tuliskan satu cara menghindari sifat munafik!", "Munafik adalah orang yang di mulut mengaku beriman tetapi hatinya tidak beriman. Cara menghindari: berkata dan berbuat jujur, tidak berpura-pura.")
    ],
    "aqh-C-6": [
      U("L2", "Apa arti anak yatim? Menurut surah Al-Ma'un, bagaimana perlakuan orang yang mendustakan agama terhadap anak yatim?", "Anak yatim adalah anak yang ayahnya telah meninggal dunia. Orang yang mendustakan agama menghardik anak yatim.")
    ],
    "aqh-C-7": [
      U("L2", "Jelaskan perbedaan infak dan zakat! Sebutkan juga niat yang harus ada ketika berinfak!", "Infak tidak ditentukan jumlah dan waktunya, sedangkan zakat ditentukan ketentuannya. Niat berinfak: ikhlas karena Allah.")
    ],
    "aqh-C-8": [
      U("L2", "Jelaskan arti amal saleh dan mengapa iman harus disertai amal saleh menurut surah Al-Bayyinah ayat 7!", "Amal saleh adalah perbuatan yang baik dan bermanfaat. Orang yang beriman dan beramal saleh adalah sebaik-baik makhluk.")
    ],
    "aqh-C-9": [
      U("L2", "Tuliskan satu tanda orang munafik menurut hadis dan sifat lawannya yang harus kita biasakan!", "Contoh benar: berbicara berdusta lawannya jujur; berjanji mengingkari lawannya menepati janji; dipercaya berkhianat lawannya menjaga amanah.")
    ],
    "aqh-C-10": [
      U("L2", "Apa makna isyarat dua jari (telunjuk dan tengah) dalam hadis tentang menanggung anak yatim?", "Dekatnya kedudukan orang yang menanggung anak yatim dengan Nabi di surga.")
    ],
    "aqh-C-11": [
      U("L2", "Apa yang dimaksud \"tangan di atas\" dan \"tangan di bawah\" dalam hadis?", "Tangan di atas: orang yang memberi. Tangan di bawah: orang yang meminta atau menerima. Skor separuh untuk masing-masing.")
    ],
    "aqh-C-12": [
      U("L2", "Mengapa sedekah jariah disebut amal yang pahalanya terus mengalir? Berikan satu contohnya!", "Karena manfaatnya terus dinikmati orang lain walaupun pemberinya sudah meninggal. Contoh benar: membangun tempat wudu masjid, mewakafkan Al-Qur'an, membangun sumur.")
    ],
    /* ---------- Bahasa Arab Fase B ---------- */
    "ba-B-1": [
      U("L2", "Tuliskan arti dari: اللُّغَةُ الْعَرَبِيَّةُ, مَادَّةٌ, dan مَا دَرْسُكَ الْيَوْمَ؟", "bahasa Arab; mata pelajaran; Apa pelajaranmu hari ini? Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-2": [
      U("L2", "Tuliskan arti dari: أَسَدٌ, قِطَّةٌ, dan سَمَكَةٌ!", "singa; kucing; ikan. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-3": [
      U("L2", "Tuliskan arti dari: أَلَمُ الْأَسْنَانِ, دَوَاءٌ, dan أَنَا مَرِيضٌ!", "sakit gigi; obat; Saya sakit. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-4": [
      U("L2", "Tuliskan arti dari: كُرَةُ السَّلَّةِ, كُرَةُ الطَّائِرَةِ, dan الرِّيَاضَةُ!", "bola basket; bola voli; olahraga. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-5": [
      U("L2", "Tuliskan arti dari: نَشِيطٌ, كَسْلَانُ, dan زَمِيلٌ!", "rajin (aktif); malas; teman sekelas. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-6": [
      U("L2", "Tuliskan arti dari: زَهْرَةٌ, شَجَرَةٌ, dan فِي الْحَدِيقَةِ أَزْهَارٌ!", "bunga; pohon; Di taman ada bunga-bunga. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-7": [
      U("L2", "Tuliskan arti dari: عُنْوَانٌ, مَدِينَةٌ, dan مَا عُنْوَانُكَ؟", "alamat; kota; Apa alamatmu? Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-8": [
      U("L2", "Tuliskan arti dari: شُرْطِيٌّ, مُدَرِّسٌ, dan أَبِي تَاجِرٌ!", "polisi; guru; Ayahku pedagang. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-9": [
      U("L2", "Tuliskan arti dari: مُسْتَقْبَلٌ, طَيَّارٌ, dan مَاذَا تُرِيدُ أَنْ تَكُونَ؟", "masa depan; pilot; Kamu ingin menjadi apa? Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-10": [
      U("L2", "Tuliskan arti dari: نَافِذَةٌ, بَابٌ, dan طَاوِلَةٌ!", "jendela; pintu; meja. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-11": [
      U("L2", "Tuliskan arti dari: أُمٌّ, خَالَةٌ, dan هَذِهِ جَدَّتِي!", "ibu; bibi (saudara perempuan ibu); Ini nenekku. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-B-12": [
      U("L2", "Tuliskan arti dari: عَلَمٌ, عَاصِمَةٌ, dan إِنْدُونِيسِيَا وَطَنِي!", "bendera; ibu kota; Indonesia tanah airku. Skor sebanding jumlah arti yang benar.")
    ],
    /* ---------- Bahasa Arab Fase C ---------- */
    "ba-C-2": [
      U("L2", "Tuliskan arti kalimat: رَأَيْتُ أَسَدًا كَبِيرًا وَقِرْدًا صَغِيرًا فِي حَدِيقَةِ الْحَيَوَانِ.", "Aku melihat seekor singa besar dan seekor monyet kecil di kebun binatang. Skor sebanding jumlah bagian arti yang benar.")
    ],
    "ba-C-3": [
      U("L2", "Tuliskan arti dari: سَجَّادَةٌ, خِزَانَةٌ, dan غُرْفَةُ الضُّيُوفِ!", "karpet; lemari; ruang tamu. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-4": [
      U("L2", "Tuliskan arti dari: الْمَكْتَبَةُ, يَسْتَعِيرُ, dan قِصَّةٌ!", "perpustakaan; meminjam; cerita. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-5": [
      U("L2", "Tuliskan arti dari: طَعَامٌ, شَرَابٌ, dan كَمِ الثَّمَنُ؟", "makanan; minuman; Berapa harganya? Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-6": [
      U("L2", "Tuliskan arti dari: السَّاعَةُ الثَّامِنَةُ, السَّاعَةُ السَّابِعَةُ وَالنِّصْفُ, dan دَقِيقَةٌ!", "jam delapan; pukul 07.30; menit. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-7": [
      U("L2", "Tuliskan arti dari: سَهْلَةٌ, مُمْتِعَةٌ, dan لِأَنَّ!", "mudah; menyenangkan; karena. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-C-9": [
      U("L2", "Tuliskan arti dari: شَاطِئٌ, نَأْكُلُ, dan نَذْهَبُ إِلَى الْحَدِيقَةِ!", "pantai; kami makan; Kami pergi ke taman. Skor sebanding jumlah arti yang benar.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN Al-Qur'an Hadis dan Bahasa Arab (isian sampai 4 per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "aqh-A-1": [
      I("L1", "Tanda baca kasrah dibaca dengan bunyi ....", "i")
    ],
    "aqh-A-2": [
      I("L1", "Gunnah terjadi pada huruf nun dan mim yang ....", "bertasydid")
    ],
    "aqh-A-3": [
      I("L1", "Alif Lam yang lamnya dibaca jelas disebut Alif Lam ....", "Qamariyah")
    ],
    "aqh-A-4": [
      I("L1", "Surah An-Nas terdiri atas ... ayat.", "enam")
    ],
    "aqh-A-5": [
      I("L1", "Surah Al-Ikhlas terdiri atas ... ayat.", "empat")
    ],
    "aqh-A-6": [
      I("L1", "Orang yang menjaga kebersihan dicintai oleh ....", "Allah")
    ],
    "aqh-A-7": [
      I("L1", "Menuntut ilmu hukumnya ... bagi setiap muslim.", "wajib")
    ],
    "aqh-A-8": [
      I("L1", "Membantu pekerjaan orang tua di rumah menunjukkan sikap ....", "berbakti")
    ],
    "aqh-B-1": [
      I("L1", "Kalkalah artinya ....", "pantulan"),
      I("L1", "Huruf kalkalah ada ... huruf.", "lima")
    ],
    "aqh-B-2": [
      I("L1", "Mad tabi'i dibaca ... harakat.", "dua"),
      I("L1", "Huruf mad alif harus didahului huruf yang berharakat ....", "fathah")
    ],
    "aqh-B-3": [
      I("L1", "Huruf izhar halqi ada ... huruf.", "enam"),
      I("L1", "Izhar berarti ....", "jelas")
    ],
    "aqh-B-4": [
      I("L1", "Huruf ikhfa ada ... huruf.", "lima belas (15)"),
      I("L1", "Ikhfa artinya ....", "menyamarkan (samar)")
    ],
    "aqh-B-5": [
      I("L1", "Huruf idgam bigunnah adalah ya, nun, mim, dan ....", "wawu"),
      I("L1", "Huruf idgam bigunnah ada ... huruf.", "empat")
    ],
    "aqh-B-6": [
      I("L1", "Iqlab artinya ....", "mengganti (menukar)"),
      I("L1", "Iqlab dibaca disertai ....", "dengung (gunnah)")
    ],
    "aqh-B-7": [
      I("L1", "Surah Al-Fil menceritakan pasukan bergajah yang ingin menghancurkan ....", "Kakbah"),
      I("L1", "Surah Al-Fil terdiri atas ... ayat.", "lima")
    ],
    "aqh-B-9": [
      I("L1", "Orang yang terlambat bergabung dalam salat jemaah disebut makmum ....", "masbuk"),
      I("L1", "Salat berjemaah di masjid menumbuhkan sikap ....", "kebersamaan")
    ],
    "aqh-B-10": [
      I("L1", "Sesama muslim ibarat satu ....", "tubuh"),
      I("L1", "Menjenguk teman yang sakit termasuk sikap ....", "peduli")
    ],
    "aqh-B-11": [
      I("L1", "Orang yang bertakwa akan mendapat balasan ....", "surga"),
      I("L1", "Takwa dapat ditingkatkan dengan rajin ....", "beribadah")
    ],
    "aqh-B-12": [
      I("L1", "Beramal agar dilihat dan dipuji orang disebut ....", "riya"),
      I("L1", "Niat ditempatkan di dalam ....", "hati")
    ],
    "aqh-B-13": [
      I("L1", "Silaturahmi dapat memperpanjang ... dan melapangkan rezeki.", "umur"),
      I("L1", "Saling mengunjungi dan bermaafan setelah Idulfitri disebut ....", "halalbihalal")
    ],
    "aqh-C-1": [
      I("L1", "Mim sukun bertemu huruf selain mim dan ba dibaca ....", "izhar syafawi"),
      I("L1", "Ikhfa syafawi dibaca ... disertai dengung.", "samar")
    ],
    "aqh-C-2": [
      I("L1", "Tanda waqaf lazim (mim kecil) berarti harus ....", "berhenti"),
      I("L1", "Tanda waqaf 'laa' berarti ... berhenti.", "tidak boleh")
    ],
    "aqh-C-3": [
      I("L1", "Membaca huruf ra dengan tipis disebut ....", "tarqiq"),
      I("L1", "Ra' berharakat kasrah dibaca ....", "tipis (tarqiq)")
    ],
    "aqh-C-4": [
      I("L1", "Jawaz artinya ....", "boleh"),
      I("L1", "Membaca Al-Qur'an dengan pelan dan sesuai tajwid disebut ....", "tartil")
    ],
    "aqh-C-5": [
      I("L1", "Nifak artinya berpura-pura beriman padahal hatinya ....", "ingkar"),
      I("L1", "Nifak adalah sifat yang ... oleh Allah.", "dibenci")
    ],
    "aqh-C-6": [
      I("L1", "Surah Ad-Duha ayat 10 melarang kita menghardik orang yang ....", "meminta-minta"),
      I("L1", "Surah Ad-Duha terdiri atas ... ayat.", "sebelas")
    ],
    "aqh-C-7": [
      I("L1", "Infak diberikan untuk kepentingan di jalan ....", "Allah"),
      I("L1", "Zakat hukumnya wajib, sedangkan infak hukumnya ....", "sunah")
    ],
    "aqh-C-8": [
      I("L1", "Amal saleh harus disertai ... kepada Allah.", "iman"),
      I("L1", "Orang yang beramal saleh dengan ikhlas akan mendapat balasan ....", "surga")
    ],
    "aqh-C-9": [
      I("L1", "Jika berjanji, orang munafik ....", "mengingkari"),
      I("L1", "Hadis tentang tanda orang munafik menyebut ... tanda.", "tiga")
    ],
    "aqh-C-10": [
      I("L1", "Rasulullah bersabda bahwa penanggung anak yatim dan beliau di surga seperti dua ....", "jari"),
      I("L1", "Menyantuni anak yatim dapat dilakukan dengan memberi makanan dan ....", "pakaian")
    ],
    "aqh-C-11": [
      I("L1", "Tangan di atas artinya orang yang ....", "memberi"),
      I("L1", "Tangan di bawah artinya orang yang ....", "menerima (meminta)")
    ],
    "aqh-C-12": [
      I("L1", "Pahala sedekah jariah tetap mengalir meski pemberinya telah ....", "wafat"),
      I("L1", "Ilmu yang diajarkan dan bermanfaat bagi orang lain akan ... pahalanya.", "mengalir")
    ],
    "ba-A-2": [
      I("L1", "Arti \"أَبِي\" adalah ... ku.", "ayah")
    ],
    "ba-A-4": [
      I("L1", "Arti \"قَلَمٌ\" adalah ....", "pena")
    ],
    "ba-A-10": [
      I("L1", "Arti \"الْكِتَابَةُ\" adalah ....", "menulis")
    ],
    "ba-B-13": [
      I("L1", "Arti \"اللُّغَةُ\" adalah ....", "bahasa"),
      I("L1", "Arti \"الْعَرَبِيَّةُ\" adalah ... (bahasa).", "Arab")
    ],
    "ba-C-6": [
      I("L1", "Arti \"يَوْمٌ\" adalah ....", "hari")
    ],
    "ba-C-8": [
      I("L1", "Arti \"ذَهَبَ\" adalah ....", "pergi")
    ],
    "ba-C-10": [
      I("L1", "Arti \"يَكْتُبُ\" adalah ....", "menulis"),
      I("L1", "Arti \"يَسْمَعُ\" adalah ....", "mendengar")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN Bahasa Arab ba-A-10 (pengganti soal kembar) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "ba-A-10": [
      I("L1", "Bahasa Arab \"berbicara\" adalah ....", "الْكَلَامُ")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PG Al-Qur'an Hadis (sampai 6 PG per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "aqh-A-2": [
      P("L1", "Bunyi dengung pada nun dan mim bertasydid disebut ...", "gunnah", "mad", "kalkalah", "waqaf")
    ],
    "aqh-A-5": [
      P("L1", "Surah Al-Falaq berisi permohonan perlindungan dari ...", "kejahatan makhluk", "hujan", "lapar", "lupa"),
      P("L1", "Jumlah ayat surah An-Nas adalah ...", "enam", "empat", "lima", "tujuh")
    ],
    "aqh-A-6": [
      P("L1", "Menurut hadis, sampah sebaiknya dibuang ...", "di tempat sampah", "di sungai", "di jalan", "di halaman")
    ],
    "aqh-A-7": [
      P("L1", "Orang yang mengajarkan ilmu yang bermanfaat akan mendapat ...", "pahala", "hukuman", "musuh", "kesulitan")
    ],
    "aqh-A-8": [
      P("L1", "Contoh durhaka kepada orang tua adalah ...", "membentak", "membantu", "mencium tangan", "mendoakan")
    ],
    "aqh-B-1": [
      P("L1", "Huruf kalkalah adalah ...", "qaf, tha, ba, jim, dal", "alif, lam, mim", "ra, sin, nun", "ha, kha, 'ain")
    ],
    "aqh-B-3": [
      P("L1", "Cara membaca izhar halqi adalah ...", "jelas tanpa dengung", "samar dengan dengung", "dimasukkan", "diganti mim")
    ],
    "aqh-B-6": [
      P("L1", "Huruf iqlab adalah ...", "ba", "mim", "nun", "ya")
    ],
    "aqh-B-9": [
      P("L1", "Makmum masbuk adalah makmum yang ...", "terlambat bergabung", "memimpin salat", "mengumandangkan azan", "menyampaikan khutbah")
    ],
    "aqh-B-10": [
      P("L1", "Hadis persaudaraan mengajarkan kita untuk ...", "saling menyayangi", "saling membenci", "saling menjauhi", "saling bersaing curang")
    ],
    "aqh-B-11": [
      P("L1", "Balasan bagi orang yang bertakwa adalah ...", "surga", "neraka", "azab", "kesulitan")
    ],
    "aqh-B-12": [
      P("L1", "Lawan dari ikhlas adalah ...", "riya", "syukur", "sabar", "tawakal")
    ],
    "aqh-B-13": [
      P("L1", "Silaturahmi dapat dilakukan dengan ...", "mengunjungi kerabat", "memutus hubungan", "menghindari keluarga", "mengejek saudara")
    ],
    "aqh-C-2": [
      P("L1", "Tanda waqaf 'mim' kecil artinya ...", "harus berhenti", "dilarang berhenti", "boleh memilih", "baca cepat")
    ],
    "aqh-C-4": [
      P("L1", "Bacaan yang boleh dibaca dengan dua cara disebut ...", "jawazul wajhain", "ikhfa", "kalkalah", "iqlab")
    ],
    "aqh-C-5": [
      P("L1", "Nifak artinya ...", "berpura-pura beriman", "beriman dengan sungguh-sungguh", "ragu-ragu", "bersabar")
    ],
    "aqh-C-6": [
      P("L1", "Memberi makan anak yatim termasuk perbuatan ...", "terpuji", "tercela", "sia-sia", "dilarang")
    ],
    "aqh-C-7": [
      P("L1", "Infak adalah ...", "mengeluarkan harta di jalan Allah", "menyimpan harta", "menghamburkan harta", "meminjam harta")
    ],
    "aqh-C-8": [
      P("L1", "Perbuatan berikut yang termasuk amal saleh adalah ...", "menolong teman yang kesulitan", "berbohong", "mencontek", "membolos")
    ],
    "aqh-C-9": [
      P("L1", "Orang yang menepati janji dan jujur jauh dari sifat ...", "munafik", "dermawan", "sabar", "ikhlas")
    ],
    "aqh-C-10": [
      P("L1", "Orang yang menanggung anak yatim di surga dekat dengan ...", "Nabi Muhammad saw.", "setan", "musuh Allah", "orang kikir")
    ],
    "aqh-C-11": [
      P("L1", "Orang yang rajin bekerja lebih baik daripada orang yang ...", "meminta-minta", "menabung", "belajar", "berbagi")
    ],
    "aqh-C-12": [
      P("L1", "Tiga amal yang pahalanya tidak terputus adalah sedekah jariah, ilmu bermanfaat, dan ...", "doa anak saleh", "harta", "jabatan", "kekuatan")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN soal bergambar Bahasa Arab (kosakata dari ikon) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "ba-A-6": [
      P("L1", "[[g:ikon;apel;1]]Bahasa Arab untuk benda pada gambar adalah ...", "تُفَّاحٌ", "بُرْتُقَالٌ", "مَوْزٌ", "عِنَبٌ"),
      P("L1", "[[g:ikon;apel;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "تُفَّاحٌ", "خُبْزٌ", "عِنَبٌ", "مَوْزٌ"),
      P("L1", "[[g:ikon;jeruk;1]]Bahasa Arab untuk benda pada gambar adalah ...", "بُرْتُقَالٌ", "تُفَّاحٌ", "مَوْزٌ", "عِنَبٌ"),
      P("L1", "[[g:ikon;jeruk;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "بُرْتُقَالٌ", "خُبْزٌ", "عِنَبٌ", "مَوْزٌ"),
      P("L1", "[[g:ikon;pisang;1]]Bahasa Arab untuk benda pada gambar adalah ...", "مَوْزٌ", "تُفَّاحٌ", "بُرْتُقَالٌ", "عِنَبٌ"),
      P("L1", "[[g:ikon;pisang;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "مَوْزٌ", "خُبْزٌ", "عِنَبٌ", "بُرْتُقَالٌ")
    ],
    "ba-A-8": [
      P("L1", "[[g:ikon;mobil;1]]Bahasa Arab untuk benda pada gambar adalah ...", "سَيَّارَةٌ", "قَارِبٌ", "طَائِرَةٌ", "قِطَارٌ"),
      P("L1", "[[g:ikon;mobil;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "سَيَّارَةٌ", "قِطَارٌ", "طَائِرَةٌ", "قَارِبٌ"),
      P("L1", "[[g:ikon;perahu;1]]Bahasa Arab untuk benda pada gambar adalah ...", "قَارِبٌ", "سَيَّارَةٌ", "طَائِرَةٌ", "قِطَارٌ"),
      P("L1", "[[g:ikon;perahu;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "قَارِبٌ", "قِطَارٌ", "طَائِرَةٌ", "سَيَّارَةٌ")
    ],
    "ba-A-9": [
      P("L1", "[[g:ikon;pohon;1]]Bahasa Arab untuk benda pada gambar adalah ...", "شَجَرَةٌ", "شَمْسٌ", "جَبَلٌ", "بَحْرٌ"),
      P("L1", "[[g:ikon;pohon;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "شَجَرَةٌ", "بَحْرٌ", "جَبَلٌ", "شَمْسٌ"),
      P("L1", "[[g:ikon;matahari;1]]Bahasa Arab untuk benda pada gambar adalah ...", "شَمْسٌ", "شَجَرَةٌ", "جَبَلٌ", "بَحْرٌ"),
      P("L1", "[[g:ikon;matahari;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "شَمْسٌ", "بَحْرٌ", "جَبَلٌ", "شَجَرَةٌ")
    ],
    "ba-A-3": [
      P("L1", "[[g:ikon;rumah;1]]Bahasa Arab untuk benda pada gambar adalah ...", "بَيْتٌ", "مَطْبَخٌ", "غُرْفَةٌ", "حَدِيقَةٌ"),
      P("L1", "[[g:ikon;rumah;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "بَيْتٌ", "حَدِيقَةٌ", "غُرْفَةٌ", "مَطْبَخٌ")
    ],
    "ba-A-4": [
      P("L1", "[[g:ikon;buku;1]]Bahasa Arab untuk benda pada gambar adalah ...", "كِتَابٌ", "مَكْتَبٌ", "سَبُّورَةٌ", "قَلَمٌ"),
      P("L1", "[[g:ikon;buku;1]]Kata bahasa Arab yang tepat untuk gambar ini adalah ...", "كِتَابٌ", "قَلَمٌ", "سَبُّورَةٌ", "مَكْتَبٌ")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN soal bergambar Bahasa Arab (pilihan jawaban berupa gambar) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "ba-A-6": [
      P("L1", "Gambar yang berarti مَوْزٌ adalah ...", "[[g:ikon;pisang;1]]", "[[g:ikon;apel;1]]", "[[g:ikon;jeruk;1]]", "[[g:ikon;ikan;1]]"),
      P("L1", "Gambar yang berarti تُفَّاحٌ adalah ...", "[[g:ikon;apel;1]]", "[[g:ikon;jeruk;1]]", "[[g:ikon;pisang;1]]", "[[g:ikon;ikan;1]]"),
      P("L1", "Gambar yang berarti بُرْتُقَالٌ adalah ...", "[[g:ikon;jeruk;1]]", "[[g:ikon;apel;1]]", "[[g:ikon;pisang;1]]", "[[g:ikon;ikan;1]]")
    ],
    "ba-A-8": [
      P("L1", "Gambar yang berarti سَيَّارَةٌ adalah ...", "[[g:ikon;mobil;1]]", "[[g:ikon;perahu;1]]", "[[g:ikon;rumah;1]]", "[[g:ikon;pohon;1]]"),
      P("L1", "Gambar yang berarti قَارِبٌ adalah ...", "[[g:ikon;perahu;1]]", "[[g:ikon;mobil;1]]", "[[g:ikon;rumah;1]]", "[[g:ikon;pohon;1]]")
    ],
    "ba-A-9": [
      P("L1", "Gambar yang berarti شَجَرَةٌ adalah ...", "[[g:ikon;pohon;1]]", "[[g:ikon;matahari;1]]", "[[g:ikon;rumah;1]]", "[[g:ikon;bunga;1]]"),
      P("L1", "Gambar yang berarti شَمْسٌ adalah ...", "[[g:ikon;matahari;1]]", "[[g:ikon;pohon;1]]", "[[g:ikon;rumah;1]]", "[[g:ikon;bunga;1]]")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
