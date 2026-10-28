/* ============================================================
   SI MAMBA - js/data-soal-pai-fase-a-tambahan.js
   TAMBAHAN bank soal DRAF PAI Fase A (kelas 1-2), supaya kelas 1 dan kelas 2 tidak mendapat soal yang sama persis
   (bank berkunci per fase; perangkat-soal.js membagi urutan soal ganjil/genap antar kelas, dan ini menambah isinya).
   Isi: +1 Uraian untuk 28 TP yang uraiannya baru 1 (aqh 7, aa 9, ba 9, fikih 3)
        +1 Isian untuk 24 TP yang isiannya baru 2 (aqh 8, aa 10, ba 1, fikih 5).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang. Status DRAF: guru wajib memeriksa soal dan kunci jawaban.
   WAJIB dimuat SESUDAH js/data-soal-semua.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const U = (lv, q, k) => ['ur', lv, q, k];
  const I = (lv, q, a) => ['is', lv, q, a];
  const TAMBAH = {
    /* ---------- Al-Qur'an Hadis ---------- */
    "aqh-A-1": [
      U("L2", "Tuliskan nama tiga huruf hijaiyah yang pertama: ا , ب , ت !", "Alif, ba, ta. Skor sebanding jumlah nama yang benar."),
      I("L1", "Huruf hijaiyah yang pertama adalah ....", "alif")
    ],
    "aqh-A-2": [
      U("L2", "Huruf apa saja yang bertasydid dan dibaca dengan gunnah?", "Nun bertasydid dan mim bertasydid."),
      I("L1", "Gunnah adalah bunyi dengung yang keluar dari ....", "hidung")
    ],
    "aqh-A-3": [
      U("L2", "Tuliskan satu contoh Alif Lam Qamariyah dan satu contoh Alif Lam Syamsiyah!", "Contoh benar: Qamariyah = الْقَمَرُ (al-qamar); Syamsiyah = الشَّمْسُ (asy-syams). Contoh lain yang tepat juga dinilai benar."),
      I("L1", "Alif Lam yang lamnya tidak dibaca disebut Alif Lam ....", "Syamsiyah")
    ],
    "aqh-A-4": [
      U("L2", "Surah apa yang dibaca pada setiap rakaat salat? Sebutkan juga jumlah ayatnya!", "Surah Al-Fatihah, tujuh ayat."),
      I("L1", "Surah Al-Falaq terdiri atas ... ayat.", "lima")
    ],
    "aqh-A-5": [
      I("L1", "Surah An-Nas berisi permohonan perlindungan kepada Allah dari bisikan ....", "setan")
    ],
    "aqh-A-6": [
      U("L2", "Mengapa kita harus menjaga kebersihan? Tuliskan dua alasan!", "Contoh benar: agar sehat; agar nyaman dan tidak bau; kebersihan sebagian dari iman; Allah menyukai orang yang bersih."),
      I("L1", "Kebersihan adalah sebagian dari ....", "iman")
    ],
    "aqh-A-7": [
      U("L2", "Mengapa kita harus rajin menuntut ilmu? Tuliskan dua alasan!", "Contoh benar: perintah Allah dan Rasul; agar menjadi pintar dan berilmu; agar bermanfaat bagi orang lain; Allah meninggikan derajat orang berilmu."),
      I("L2", "Allah akan meninggikan ... orang yang beriman dan berilmu.", "derajat")
    ],
    "aqh-A-8": [
      U("L2", "Mengapa kita harus berbakti kepada orang tua? Tuliskan dua alasan!", "Contoh benar: orang tua telah merawat dan membesarkan kita; berbakti adalah perintah Allah; rida Allah tergantung pada rida orang tua."),
      I("L1", "Rida Allah tergantung pada rida ....", "orang tua")
    ],
    /* ---------- Akidah Akhlak ---------- */
    "aa-A-1": [
      I("L1", "Orang yang bersyahadat percaya kepada Allah dan kepada ... Allah.", "rasul (utusan)")
    ],
    "aa-A-2": [
      U("L2", "Sebutkan nama dua kitab Allah beserta nabi penerimanya!", "Contoh benar: Taurat - Nabi Musa a.s.; Zabur - Nabi Daud a.s.; Injil - Nabi Isa a.s.; Al-Qur'an - Nabi Muhammad saw. Skor sebanding jumlah pasangan yang benar.")
    ],
    "aa-A-3": [
      U("L2", "Tuliskan arti sifat wajib Allah: sama' dan bashar!", "Sama' = Maha Mendengar; bashar = Maha Melihat. Skor sebanding jumlah arti yang benar."),
      I("L1", "Allah bersifat wujud, artinya Allah ....", "ada")
    ],
    "aa-A-4": [
      U("L2", "Sebutkan nama dua malaikat yang bertugas mencatat amal baik dan amal buruk manusia!", "Raqib (mencatat amal baik) dan Atid (mencatat amal buruk).")
    ],
    "aa-A-5": [
      I("L1", "Ar-Rahim artinya Maha ....", "Penyayang")
    ],
    "aa-A-6": [
      I("L2", "Al-Muhaimin artinya Maha ....", "Memelihara")
    ],
    "aa-A-7": [
      I("L1", "Taawuz artinya aku berlindung kepada Allah dari godaan ....", "setan")
    ],
    "aa-A-8": [
      U("L2", "Mengapa kita harus menjaga kesehatan? Tuliskan dua alasan!", "Contoh benar: agar tubuh kuat untuk belajar dan beribadah; agar tidak mudah sakit; kesehatan adalah nikmat dari Allah yang harus disyukuri.")
    ],
    "aa-A-9": [
      I("L1", "Orang yang selalu jujur akan disayang oleh Allah dan oleh ....", "manusia (teman, orang lain)")
    ],
    "aa-A-10": [
      U("L2", "Sebutkan dua contoh sikap rendah hati!", "Contoh benar: tidak sombong; mau mendengarkan nasihat teman; mau meminta maaf bila bersalah; menghargai pendapat orang lain.")
    ],
    "aa-A-11": [
      I("L1", "Lawan dari rajin adalah ....", "malas")
    ],
    "aa-A-12": [
      I("L1", "Ketika guru menjelaskan pelajaran, kita harus ....", "memperhatikan (mendengarkan)")
    ],
    "aa-A-13": [
      U("L2", "Tuliskan dua adab ketika mandi!", "Contoh benar: membaca basmalah; menjaga aurat; tidak boros air; menggunakan sabun dan menjaga kebersihan; mendahulukan anggota badan yang kanan.")
    ],
    "aa-A-14": [
      U("L2", "Tuliskan ucapan orang yang bersin dan jawaban orang yang mendengarnya!", "Orang yang bersin mengucapkan Alhamdulillah; yang mendengar menjawab Yarhamukallah."),
      I("L1", "Ketika menguap, sebaiknya mulut ditutup dengan ....", "tangan")
    ],
    "aa-A-15": [
      U("L2", "Mengapa kita tidak boleh makan berlebihan dan membuang-buang makanan? Jelaskan!", "Jawaban benar memuat salah satu alasan: perbuatan mubazir yang dilarang Allah; masih banyak orang yang kekurangan makanan; makan berlebihan merusak kesehatan.")
    ],
    "aa-A-16": [
      I("L1", "Nabi Muhammad saw. dilahirkan di kota ....", "Mekah")
    ],
    "aa-A-17": [
      U("L2", "Sifat Nabi Nuh a.s. apa yang dapat kita teladani? Jelaskan!", "Contoh benar: sabar menghadapi kaum yang menolak; gigih berdakwah; taat kepada perintah Allah.")
    ],
    /* ---------- Bahasa Arab ---------- */
    "ba-A-1": [
      U("L2", "Tuliskan arti dari: أَنْتَ, أَنْتِ, dan هِيَ!", "kamu (laki-laki); kamu (perempuan); dia (perempuan). Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-2": [
      U("L2", "Tuliskan arti dari: جَدِّي, عَمِّي, dan خَالَتِي!", "kakekku; pamanku (saudara ayah); bibiku (saudari ibu). Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-3": [
      U("L2", "Tuliskan arti dari: غُرْفَةٌ, حَدِيقَةٌ, dan سَرِيرٌ!", "kamar; taman; tempat tidur. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-4": [
      U("L2", "Tuliskan arti dari: مُدَرِّسٌ, سَبُّورَةٌ, dan مَكْتَبٌ!", "guru (laki-laki); papan tulis; meja. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-5": [
      U("L2", "Tuliskan arti dari: السِّبَاحَةُ, الرَّسْمُ, dan الطَّبْخُ!", "berenang; menggambar; memasak. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-6": [
      U("L2", "Tuliskan arti dari: بِطِّيخٌ, مَانْجُو, dan تَمْرٌ!", "semangka; mangga; kurma. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-7": [
      U("L2", "Tuliskan arti dari: أَخْضَرُ, بُنِّيٌّ, dan بُرْتُقَالِيٌّ!", "hijau; cokelat; jingga. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-8": [
      U("L2", "Tuliskan arti dari: طَائِرَةٌ, حَافِلَةٌ, dan قَارِبٌ!", "pesawat; bus; perahu. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-9": [
      U("L2", "Tuliskan arti dari: نَهْرٌ, بَحْرٌ, dan شَمْسٌ!", "sungai; laut; matahari. Skor sebanding jumlah arti yang benar.")
    ],
    "ba-A-10": [
      I("L1", "Arti \"الْقِرَاءَةُ\" adalah ....", "membaca")
    ],
    /* ---------- Fikih ---------- */
    "fikih-A-1": [
      U("L2", "Siapa yang wajib menunaikan ibadah haji? Jelaskan!", "Orang Islam yang mampu, yaitu sehat badannya dan memiliki biaya serta bekal untuk pergi ke Mekah.")
    ],
    "fikih-A-3": [
      U("L2", "Sebutkan tiga hal yang membatalkan wudu!", "Contoh benar: buang air kecil atau besar; buang angin; tidur nyenyak; hilang akal (pingsan). Skor sebanding jumlah jawaban yang benar."),
      I("L1", "Wudu dilakukan sebelum melaksanakan ....", "salat")
    ],
    "fikih-A-4": [
      U("L2", "Tuliskan dua syarat sah salat!", "Contoh benar: suci dari hadas dan najis; menutup aurat; menghadap kiblat; sudah masuk waktu salat. Skor sebanding jumlah jawaban yang benar."),
      I("L1", "Salat Isya terdiri dari ... rakaat.", "empat")
    ],
    "fikih-A-5": [
      I("L1", "Dalam salat berjemaah, makmum mengikuti gerakan ....", "imam")
    ],
    "fikih-A-6": [
      I("L1", "Ikamah dikumandangkan ketika salat berjemaah akan ....", "dimulai")
    ],
    "fikih-A-7": [
      I("L1", "Bacaan 'Allahu Akbar' artinya Allah Maha ....", "Besar")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
