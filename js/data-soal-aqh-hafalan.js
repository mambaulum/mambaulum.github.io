/* ============================================================
   SI MAMBA - js/data-soal-aqh-hafalan.js
   Bank soal DRAF Al-Qur'an Hadis MI Fase A-C untuk TP Al-Qur'an dan Hadis (melengkapi js/data-soal-mi.js yang
   baru memuat TP Tajwid: aqh-A-1..3, aqh-B-1..6, aqh-C-1..4).
   KUNCI = kunci TP di js/data-tp-mi.js (urutan TP dalam daftar mapel 'aqh' per fase):
     Fase A : aqh-A-4 hafalan surah, aqh-A-5 isi surah, aqh-A-6..8 hadis (kebersihan, belajar, orang tua)
     Fase B : aqh-B-7 hafalan/tulisan surah, aqh-B-8 arti dan isi surah, aqh-B-9..13 hadis (salat berjemaah,
              persaudaraan, takwa, niat, silaturahmi)
     Fase C : aqh-C-5..8 ayat (munafik, anak yatim, keutamaan memberi, amal saleh), aqh-C-9..12 hadis (tema sama)
   JIKA urutan TP di data-tp-mi.js diubah, kunci di file ini harus ikut disesuaikan.
   Acuan: SK Dirjen Pendis No. 9941 Tahun 2025, Lampiran I bagian II. SK hanya menyebut "surah pendek pilihan"
   (Fase A-B) dan tema (Fase C), sehingga DAFTAR SURAH/AYAT/HADIS di sini adalah pilihan penyusun yang umum dipakai.
   Guru wajib mencocokkannya dengan buku ajar/KMA madrasah, lalu mengganti atau menghapus yang tidak sesuai.
   Status: DRAF, belum diperiksa guru.
   Format sama dengan data-soal-mi.js:
     PG    : ['pg', level, soal, [jawaban BENAR, pengecoh1, pengecoh2, pengecoh3]]  (opsi diacak saat dipakai)
     Isian : ['is', level, soal, jawaban]
     Uraian: ['ur', level, soal, pedoman penskoran]
   Info tiap kunci ada di window.BANK_SOAL_AQH_INFO. WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const BARU = {
    // ===================== FASE A (KELAS 1-2 MI) =====================
    // aqh-A-4: Hafalan surah pendek pilihan (identitas surah)
    "aqh-A-4": [
      P("L1", "Surah Al-Fatihah terdiri dari ... ayat.", "tujuh", "enam", "lima", "sembilan"),
      P("L1", "Surah yang wajib dibaca pada setiap rakaat salat adalah surah ...", "Al-Fatihah", "Al-Ikhlas", "An-Nas", "Al-Falaq"),
      I("L1", "Surah Al-Fatihah terletak pada urutan ... dalam mushaf Al-Qur'an.", "pertama"),
      P("L1", "Surah An-Nas terdiri dari ... ayat.", "enam", "empat", "lima", "tujuh"),
      P("L1", "An-Nas artinya ...", "manusia", "fajar", "gajah", "kebersihan"),
      P("L1", "Surah Al-Ikhlas terdiri dari ... ayat.", "empat", "tiga", "lima", "enam"),
      P("L1", "Surah Al-Falaq terdiri dari ... ayat.", "lima", "empat", "enam", "tujuh"),
      P("L1", "Al-Falaq artinya ...", "waktu subuh (fajar)", "manusia", "gajah", "kebaikan"),
      I("L1", "Surah terakhir dalam mushaf Al-Qur'an adalah surah ....", "An-Nas"),
      U("L2", "Sebutkan empat surah pendek yang sudah kamu hafal beserta jumlah ayatnya!", "Contoh benar: Al-Fatihah (7 ayat), An-Nas (6), Al-Ikhlas (4), Al-Falaq (5). Skor sebanding jumlah pasangan nama surah dan jumlah ayat yang benar.")
    ],
    // aqh-A-5: Isi surah pendek dan penerapannya
    "aqh-A-5": [
      U("L2", "Tuliskan arti ayat \"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ\"!", "Segala puji bagi Allah, Tuhan semesta alam. Skor penuh bila makna \"puji hanya milik Allah\" dan \"Tuhan semesta alam\" sama-sama ada."),
      P("L2", "Surah An-Nas berisi permohonan perlindungan kepada Allah dari kejahatan ...", "bisikan setan yang bersembunyi", "waktu malam yang gelap gulita", "pasukan bergajah", "orang yang menghardik anak yatim"),
      U("L2", "Tuliskan arti ayat \"قُلْ أَعُوذُ بِرَبِّ النَّاسِ\"!", "Katakanlah, \"Aku berlindung kepada Tuhan (yang memelihara) manusia.\" Skor penuh bila makna \"berlindung kepada Tuhan manusia\" tepat."),
      P("L1", "Surah Al-Ikhlas menjelaskan bahwa Allah itu ...", "Maha Esa", "ada dua", "ada tiga", "banyak"),
      I("L1", "Ayat pertama surah Al-Ikhlas dimulai dengan kata \"qul\" yang artinya ....", "katakanlah"),
      U("L2", "Tuliskan arti ayat \"قُلْ هُوَ اللَّهُ أَحَدٌ\"!", "Katakanlah (Muhammad), \"Dialah Allah, Yang Maha Esa.\" Skor penuh bila makna \"Allah Maha Esa\" tepat."),
      I("L1", "Dalam surah Al-Falaq kita berlindung kepada Tuhan yang menguasai waktu ....", "subuh (fajar)")
    ],
    // aqh-A-6: Hadis tentang kebersihan
    "aqh-A-6": [
      P("L1", "Menurut hadis, kebersihan adalah sebagian dari ...", "iman", "ilmu", "harta", "permainan"),
      P("L1", "Contoh perbuatan yang sesuai dengan hadis tentang kebersihan adalah ...", "membuang sampah pada tempatnya", "makan sambil berlari", "membiarkan kelas berantakan", "membuang bungkus jajan di kolong meja"),
      I("L1", "Lawan kata dari bersih adalah ....", "kotor"),
      U("L2", "Tuliskan bunyi hadis tentang kebersihan beserta artinya!", "الطُّهُورُ شَطْرُ الْإِيمَانِ — Kebersihan (kesucian) adalah sebagian dari iman. Teks Arab disesuaikan dengan buku ajar madrasah. Skor: teks Arab dan arti masing-masing separuh.")
    ],
    // aqh-A-7: Hadis tentang keutamaan belajar
    "aqh-A-7": [
      P("L1", "Orang yang menuntut ilmu akan dimudahkan Allah jalannya menuju ...", "surga", "pasar", "sekolah", "kota"),
      P("L1", "Sikap yang sesuai dengan hadis keutamaan belajar adalah ...", "rajin belajar dan tidak mudah malas", "sering bolos sekolah", "menunda mengerjakan tugas", "mengejek teman yang rajin"),
      I("L1", "Mencari ilmu disebut juga ... ilmu.", "menuntut"),
      U("L2", "Jelaskan isi hadis keutamaan belajar dengan kata-katamu sendiri!", "Jawaban benar memuat inti: orang yang bersungguh-sungguh mencari ilmu akan dimudahkan Allah jalannya menuju surga. Skor penuh bila inti ini ada.")
    ],
    // aqh-A-8: Hadis tentang berbakti kepada orang tua
    "aqh-A-8": [
      P("L1", "Menurut hadis, rida Allah bergantung pada rida ...", "orang tua", "teman", "tetangga", "penjual"),
      P("L1", "Contoh berbakti kepada orang tua adalah ...", "menuruti nasihat baik dan membantu pekerjaan rumah", "membantah ketika dinasihati", "berkata kasar kepada ibu", "pulang tanpa berpamitan"),
      I("L1", "Anak yang berbakti kepada orang tua disebut anak yang ....", "saleh"),
      U("L2", "Tuliskan dua cara berbakti kepada orang tua!", "Contoh benar: menaati nasihat baik, berkata santun, membantu pekerjaan rumah, mendoakan orang tua, belajar dengan rajin. Skor sebanding jumlah cara yang benar.")
    ],
    // ===================== FASE B (KELAS 3-4 MI) =====================
    // aqh-B-7: Hafalan dan tulisan surah pendek (identitas surah)
    "aqh-B-7": [
      P("L1", "Surah Al-Asr terdiri dari ... ayat.", "tiga", "dua", "empat", "lima"),
      P("L1", "Al-Asr artinya demi ...", "waktu (masa)", "matahari", "bulan", "hujan"),
      P("L1", "Surah Al-Kautsar terdiri dari ... ayat.", "tiga", "dua", "empat", "enam"),
      P("L1", "Al-Kautsar artinya ...", "nikmat yang banyak", "gajah", "waktu", "pertolongan"),
      P("L1", "Surah An-Nasr terdiri dari ... ayat.", "tiga", "dua", "empat", "lima"),
      P("L1", "An-Nasr artinya ...", "pertolongan", "manusia", "gajah", "nikmat"),
      P("L1", "Surah Al-Kafirun terdiri dari ... ayat.", "enam", "lima", "empat", "tujuh"),
      P("L1", "Surah Al-Fil terdiri dari ... ayat.", "lima", "empat", "enam", "tiga"),
      I("L1", "Al-Fil artinya ....", "gajah"),
      P("L1", "Surah Quraisy terdiri dari ... ayat.", "empat", "tiga", "lima", "enam"),
      I("L1", "Surah yang artinya \"pertolongan\" adalah surah ....", "An-Nasr"),
      U("L2", "Tuliskan tiga surah pendek yang kamu hafal beserta jumlah ayat dan arti nama surahnya!", "Contoh benar: Al-Asr (3 ayat, demi waktu), Al-Kautsar (3 ayat, nikmat yang banyak), An-Nasr (3 ayat, pertolongan), Al-Fil (5 ayat, gajah), Al-Kafirun (6 ayat, orang-orang kafir). Skor sebanding jumlah surah yang lengkap dan benar.")
    ],
    // aqh-B-8: Arti dan isi kandungan surah pendek
    "aqh-B-8": [
      P("L2", "Menurut surah Al-Asr, orang yang tidak merugi adalah orang yang beriman dan ...", "beramal saleh", "banyak bermain", "suka menunda pekerjaan", "selalu bepergian"),
      U("L3", "Sebutkan empat ciri orang yang tidak merugi menurut surah Al-Asr!", "Beriman; beramal saleh; saling menasihati dalam kebenaran; saling menasihati dalam kesabaran. Skor sebanding jumlah ciri yang benar."),
      P("L2", "Perintah dalam surah Al-Kautsar adalah mendirikan salat karena Allah dan ...", "berkurban", "berpuasa setiap hari", "berdagang", "bepergian jauh"),
      I("L1", "Allah memberikan nikmat yang banyak (Al-Kautsar) kepada Nabi ....", "Muhammad"),
      P("L2", "Ketika pertolongan Allah dan kemenangan datang, kita diperintahkan bertasbih memuji Allah dan memohon ...", "ampun (istigfar)", "harta", "jabatan", "kekuasaan"),
      I("L2", "Allah Maha Penerima ... (at-Tawwab).", "tobat"),
      P("L2", "Surah Al-Kafirun mengajarkan sikap ...", "tidak mencampuradukkan ibadah dan saling menghormati keyakinan", "mengikuti ibadah semua agama", "memaksa orang lain masuk Islam", "memusuhi orang yang berbeda agama"),
      I("L2", "Arti \"lakum dinukum waliyadin\" adalah untukmu agamamu, dan untukku ....", "agamaku"),
      P("L1", "Surah Al-Fil menceritakan pasukan bergajah yang dipimpin oleh ...", "Abrahah", "Abu Lahab", "Fir'aun", "Namrud"),
      P("L2", "Allah menghancurkan pasukan bergajah dengan mengirim burung ...", "ababil", "elang", "merpati", "gagak"),
      P("L2", "Dalam surah Quraisy, kaum Quraisy diperintahkan menyembah Tuhan pemilik ...", "Ka'bah (rumah ini)", "bukit Safa", "gunung Uhud", "pasar Ukaz"),
      I("L2", "Allah memberi makan kepada mereka untuk menghilangkan lapar dan memberi rasa ... dari ketakutan.", "aman")
    ],
    // aqh-B-9: Hadis tentang salat berjemaah
    "aqh-B-9": [
      P("L1", "Salat berjemaah lebih utama daripada salat sendirian sebanyak ... derajat.", "27", "17", "7", "70"),
      P("L1", "Salat berjemaah paling sedikit dilakukan oleh ... orang.", "dua", "satu", "tiga", "lima"),
      I("L1", "Orang yang mengikuti imam dalam salat berjemaah disebut ....", "makmum"),
      U("L2", "Tuliskan dua manfaat salat berjemaah!", "Contoh benar: pahala lebih banyak, mempererat persaudaraan, melatih disiplin, saling mengenal sesama jamaah. Skor sebanding jumlah manfaat yang benar.")
    ],
    // aqh-B-10: Hadis tentang persaudaraan
    "aqh-B-10": [
      P("L1", "Menurut hadis, seorang muslim adalah ... bagi muslim lainnya.", "saudara", "musuh", "pesaing", "tamu"),
      P("L1", "Sikap yang sesuai dengan hadis persaudaraan adalah ...", "menolong teman yang sedang kesulitan", "membiarkan teman dikucilkan", "mengejek teman yang salah", "merebut mainan teman"),
      I("L1", "Persaudaraan sesama muslim disebut ukhuwah ....", "Islamiyah"),
      U("L2", "Berikan satu contoh menjaga persaudaraan di madrasah!", "Contoh benar: berbagi bekal, menolong teman yang jatuh, tidak mengejek, meminjamkan alat tulis, menjenguk teman yang sakit. Skor penuh bila contoh sesuai.")
    ],
    // aqh-B-11: Hadis tentang takwa
    "aqh-B-11": [
      P("L1", "Takwa adalah melaksanakan perintah Allah dan ...", "menjauhi larangan-Nya", "menunda salat", "memilih ibadah yang disukai saja", "berbicara sesuka hati"),
      P("L2", "Menurut hadis, jika berbuat kesalahan kita dianjurkan segera ...", "mengiringinya dengan perbuatan baik", "menyembunyikannya", "mengulanginya", "menyalahkan orang lain"),
      I("L1", "Orang yang bertakwa disebut ....", "muttaqin"),
      U("L2", "Jelaskan arti \"bertakwalah kepada Allah di mana pun engkau berada\"!", "Jawaban benar memuat inti: taat kepada Allah dan menjauhi larangan-Nya baik di tempat ramai maupun sepi, dilihat orang atau tidak. Skor penuh bila inti ini ada.")
    ],
    // aqh-B-12: Hadis tentang niat
    "aqh-B-12": [
      P("L1", "Hadis \"innamal a'malu binniyyat\" artinya setiap amal tergantung pada ...", "niatnya", "banyaknya", "waktunya", "tempatnya"),
      P("L1", "Niat tempatnya di ...", "hati", "tangan", "kaki", "telinga"),
      I("L1", "Niat yang ikhlas dilakukan hanya karena ....", "Allah"),
      U("L2", "Mengapa niat penting sebelum beramal? Jelaskan!", "Jawaban benar memuat inti: niat menentukan nilai amal; amal yang diniatkan karena Allah bernilai ibadah. Skor penuh bila inti ini ada.")
    ],
    // aqh-B-13: Hadis tentang silaturahmi
    "aqh-B-13": [
      P("L1", "Silaturahmi artinya menyambung tali ...", "persaudaraan", "benang", "jalan", "tali sepatu"),
      P("L1", "Menurut hadis, orang yang menyambung silaturahmi akan diluaskan rezekinya dan ...", "dipanjangkan umurnya", "dijauhkan dari belajar", "dijauhkan dari saudara", "dibebaskan dari tugas"),
      I("L1", "Mengunjungi kakek dan nenek termasuk menyambung ....", "silaturahmi"),
      U("L2", "Tuliskan tiga cara bersilaturahmi!", "Contoh benar: berkunjung ke rumah saudara, menelepon kerabat, menjenguk yang sakit, saling memaafkan, mengirim kabar. Skor sebanding jumlah cara yang benar.")
    ],
    // ===================== FASE C (KELAS 5-6 MI) =====================
    // aqh-C-5: Ayat tentang orang munafik
    "aqh-C-5": [
      P("L1", "Orang munafik adalah orang yang di mulut mengaku beriman, tetapi di hati ...", "tidak beriman", "sangat beriman", "selalu berdoa", "rajin beribadah"),
      I("L1", "Orang yang lahirnya tampak beriman tetapi batinnya ingkar disebut ....", "munafik"),
      P("L2", "Menurut Al-Baqarah ayat 8, ucapan orang munafik \"kami beriman kepada Allah dan hari akhir\" sebenarnya ...", "tidak sesuai dengan isi hatinya", "benar adanya", "tanda ketakwaan", "tanda kejujuran"),
      U("L2", "Jelaskan arti ayat tentang orang munafik pada Al-Baqarah ayat 8 dengan kata-katamu sendiri!", "Jawaban benar memuat inti: ada orang yang mengaku beriman kepada Allah dan hari akhir, padahal sebenarnya mereka tidak beriman. Skor penuh bila inti ini ada.")
    ],
    // aqh-C-6: Ayat tentang menyayangi anak yatim
    "aqh-C-6": [
      P("L1", "Anak yatim adalah anak yang ayahnya ...", "telah meninggal dunia", "pergi bekerja", "sedang sakit", "pindah rumah"),
      P("L2", "Menurut surah Al-Ma'un, orang yang mendustakan agama adalah orang yang ... anak yatim.", "menghardik", "menyayangi", "memberi makan", "mendoakan"),
      I("L2", "Surah Ad-Duha ayat 9 melarang kita berlaku sewenang-wenang terhadap anak ....", "yatim"),
      U("L2", "Tuliskan dua cara menyayangi anak yatim!", "Contoh benar: berkata lembut, berbagi makanan atau perlengkapan sekolah, mengajak bermain, membantu kebutuhannya, mendoakan. Skor sebanding jumlah cara yang benar.")
    ],
    // aqh-C-7: Ayat tentang keutamaan memberi
    "aqh-C-7": [
      P("L2", "Menurut Al-Baqarah ayat 261, orang yang berinfak di jalan Allah diumpamakan seperti sebutir biji yang menumbuhkan ... tangkai.", "tujuh", "tiga", "sepuluh", "dua belas"),
      P("L2", "Pada setiap tangkai tersebut terdapat ... biji.", "seratus", "sepuluh", "tujuh", "seribu"),
      I("L1", "Memberikan harta di jalan Allah disebut ....", "infak"),
      U("L2", "Jelaskan makna perumpamaan sebutir biji pada Al-Baqarah ayat 261!", "Jawaban benar memuat inti: harta yang diinfakkan di jalan Allah akan dibalas dengan pahala yang dilipatgandakan. Skor penuh bila inti ini ada.")
    ],
    // aqh-C-8: Ayat tentang amal saleh
    "aqh-C-8": [
      P("L1", "Amal saleh adalah perbuatan yang ...", "baik dan bermanfaat", "merugikan orang lain", "tidak ada gunanya", "dilakukan terpaksa"),
      P("L2", "Menurut Al-Bayyinah ayat 7, orang yang beriman dan beramal saleh adalah ...", "sebaik-baik makhluk", "makhluk yang merugi", "makhluk yang lalai", "makhluk yang tersesat"),
      I("L1", "Membantu teman membersihkan kelas termasuk amal ....", "saleh"),
      U("L2", "Tuliskan tiga contoh amal saleh yang dapat dilakukan murid di madrasah!", "Contoh benar: menjaga kebersihan kelas, membantu teman, salat berjemaah, menghormati guru, berkata jujur. Skor sebanding jumlah contoh yang benar.")
    ],
    // aqh-C-9: Hadis tentang ciri orang munafik
    "aqh-C-9": [
      P("L1", "Menurut hadis, tanda orang munafik ada ...", "tiga", "dua", "empat", "lima"),
      P("L1", "Salah satu tanda orang munafik adalah apabila berbicara ia ...", "berdusta", "jujur", "berhati-hati", "berpikir dahulu"),
      I("L1", "Apabila dipercaya ia berkhianat, ini adalah tanda orang ....", "munafik"),
      U("L2", "Sebutkan tiga tanda orang munafik menurut hadis!", "Apabila berbicara berdusta; apabila berjanji mengingkari; apabila dipercaya berkhianat. Skor sebanding jumlah tanda yang benar.")
    ],
    // aqh-C-10: Hadis tentang menyayangi anak yatim
    "aqh-C-10": [
      P("L1", "Menurut hadis, orang yang menanggung anak yatim akan berada dekat dengan Nabi di ...", "surga", "pasar", "sekolah", "kota Madinah"),
      P("L2", "Isyarat dua jari (telunjuk dan tengah) dalam hadis menunjukkan ...", "dekatnya kedudukan penanggung anak yatim dengan Nabi di surga", "jumlah anak yatim yang ditanggung", "jumlah rakaat salat sunah", "jumlah hari berpuasa"),
      I("L1", "Anak yang ayahnya telah wafat disebut anak ....", "yatim"),
      U("L2", "Tuliskan arti hadis tentang menanggung anak yatim dan satu cara melaksanakannya!", "Arti: orang yang menanggung anak yatim akan dekat dengan Nabi di surga. Cara melaksanakan, contoh: menyayangi, membantu kebutuhan sekolah, berbagi makanan. Skor penuh bila arti dan satu cara sama-sama ada.")
    ],
    // aqh-C-11: Hadis tentang keutamaan memberi
    "aqh-C-11": [
      P("L1", "\"Tangan di atas\" dalam hadis maksudnya adalah orang yang ...", "memberi", "meminta", "menerima", "menyimpan"),
      P("L1", "\"Tangan di bawah\" dalam hadis maksudnya adalah orang yang ...", "meminta atau menerima", "memberi", "bekerja keras", "berdagang"),
      I("L1", "Memberi lebih baik daripada ....", "meminta"),
      U("L2", "Mengapa kita dianjurkan lebih suka memberi daripada meminta? Jelaskan!", "Jawaban benar memuat inti: memberi mendatangkan pahala dan menolong sesama, sedangkan meminta-minta menurunkan kehormatan diri. Skor penuh bila inti ini ada.")
    ],
    // aqh-C-12: Hadis tentang amal saleh yang tidak terputus
    "aqh-C-12": [
      P("L1", "Amal yang pahalanya tidak terputus setelah meninggal dunia adalah ...", "doa anak yang saleh", "banyaknya harta", "luasnya rumah", "banyaknya teman"),
      P("L2", "Contoh sedekah jariah adalah ...", "membangun tempat wudu untuk masjid", "memberi permen kepada teman", "membeli mainan baru", "menabung di celengan"),
      I("L1", "Tiga amal yang tidak terputus: sedekah jariah, ilmu yang bermanfaat, dan anak yang ... yang mendoakannya.", "saleh"),
      U("L2", "Sebutkan tiga amal yang pahalanya terus mengalir setelah seseorang meninggal dunia!", "Sedekah jariah; ilmu yang bermanfaat; anak saleh yang mendoakan. Skor sebanding jumlah yang benar.")
    ]
  };

  window.BANK_SOAL_AQH_INFO = {
    "aqh-A-4": { fase: "A", jenis: "Al-Qur'an", judul: "Hafalan surah pendek pilihan (identitas surah)", rujukan: "QS. Al-Fatihah (7 ayat); QS. An-Nas (6 ayat); QS. Al-Ikhlas (4 ayat); QS. Al-Falaq (5 ayat)" },
    "aqh-A-5": { fase: "A", jenis: "Al-Qur'an", judul: "Isi surah pendek dan penerapannya", rujukan: "QS. Al-Fatihah (7 ayat); QS. An-Nas (6 ayat); QS. Al-Ikhlas (4 ayat); QS. Al-Falaq (5 ayat)" },
    "aqh-A-6": { fase: "A", jenis: "Hadis", judul: "Hadis tentang kebersihan", rujukan: "HR. Muslim: الطُّهُورُ شَطْرُ الْإِيمَانِ (Kebersihan/kesucian adalah sebagian dari iman)" },
    "aqh-A-7": { fase: "A", jenis: "Hadis", judul: "Hadis tentang keutamaan belajar", rujukan: "HR. Muslim: مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ" },
    "aqh-A-8": { fase: "A", jenis: "Hadis", judul: "Hadis tentang berbakti kepada orang tua", rujukan: "HR. at-Tirmidzi: rida Allah bergantung pada rida orang tua, murka Allah bergantung pada murka orang tua (teks Arab ikut buku ajar madrasah)" },
    "aqh-B-7": { fase: "B", jenis: "Al-Qur'an", judul: "Hafalan dan tulisan surah pendek (identitas surah)", rujukan: "QS. Al-Asr (3 ayat); QS. Al-Kautsar (3 ayat); QS. An-Nasr (3 ayat); QS. Al-Kafirun (6 ayat); QS. Al-Fil (5 ayat); QS. Quraisy (4 ayat)" },
    "aqh-B-8": { fase: "B", jenis: "Al-Qur'an", judul: "Arti dan isi kandungan surah pendek", rujukan: "QS. Al-Asr (3 ayat); QS. Al-Kautsar (3 ayat); QS. An-Nasr (3 ayat); QS. Al-Kafirun (6 ayat); QS. Al-Fil (5 ayat); QS. Quraisy (4 ayat)" },
    "aqh-B-9": { fase: "B", jenis: "Hadis", judul: "Hadis tentang salat berjemaah", rujukan: "HR. al-Bukhari dan Muslim: salat berjemaah lebih utama 27 derajat daripada salat sendirian" },
    "aqh-B-10": { fase: "B", jenis: "Hadis", judul: "Hadis tentang persaudaraan", rujukan: "HR. al-Bukhari dan Muslim: seorang muslim adalah saudara bagi muslim lainnya; ia tidak menzaliminya dan tidak membiarkannya dalam kesulitan" },
    "aqh-B-11": { fase: "B", jenis: "Hadis", judul: "Hadis tentang takwa", rujukan: "HR. at-Tirmidzi: bertakwalah kepada Allah di mana pun berada, iringilah perbuatan buruk dengan kebaikan, dan bergaullah dengan akhlak yang baik" },
    "aqh-B-12": { fase: "B", jenis: "Hadis", judul: "Hadis tentang niat", rujukan: "HR. al-Bukhari dan Muslim: إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ (Sesungguhnya setiap amal tergantung pada niatnya)" },
    "aqh-B-13": { fase: "B", jenis: "Hadis", judul: "Hadis tentang silaturahmi", rujukan: "HR. al-Bukhari dan Muslim: siapa yang ingin diluaskan rezekinya dan dipanjangkan umurnya, hendaklah menyambung silaturahmi" },
    "aqh-C-5": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang orang munafik", rujukan: "QS. Al-Baqarah: 8" },
    "aqh-C-6": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang menyayangi anak yatim", rujukan: "QS. Al-Ma'un: 1-3 dan QS. Ad-Duha: 9" },
    "aqh-C-7": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang keutamaan memberi", rujukan: "QS. Al-Baqarah: 261 dan QS. Al-Lail: 5-7" },
    "aqh-C-8": { fase: "C", jenis: "Al-Qur'an", judul: "Ayat tentang amal saleh", rujukan: "QS. Al-Bayyinah: 7" },
    "aqh-C-9": { fase: "C", jenis: "Hadis", judul: "Hadis tentang ciri orang munafik", rujukan: "HR. al-Bukhari dan Muslim: tanda munafik ada tiga, yaitu berdusta ketika berbicara, mengingkari janji, dan berkhianat ketika dipercaya" },
    "aqh-C-10": { fase: "C", jenis: "Hadis", judul: "Hadis tentang menyayangi anak yatim", rujukan: "HR. al-Bukhari: aku dan orang yang menanggung anak yatim di surga seperti ini (dengan mengisyaratkan jari telunjuk dan jari tengah)" },
    "aqh-C-11": { fase: "C", jenis: "Hadis", judul: "Hadis tentang keutamaan memberi", rujukan: "HR. al-Bukhari dan Muslim: tangan di atas lebih baik daripada tangan di bawah" },
    "aqh-C-12": { fase: "C", jenis: "Hadis", judul: "Hadis tentang amal saleh yang tidak terputus", rujukan: "HR. Muslim: apabila manusia meninggal, terputus amalnya kecuali tiga, yaitu sedekah jariah, ilmu yang bermanfaat, dan anak saleh yang mendoakannya" }
  };

  // Gabungkan ke bank utama tanpa menimpa kunci yang sudah ada.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    if (!Object.prototype.hasOwnProperty.call(window.BANK_SOAL_MI, k)) window.BANK_SOAL_MI[k] = BARU[k];
  });
})();
