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
