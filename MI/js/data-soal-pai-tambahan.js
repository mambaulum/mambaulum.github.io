/* ============================================================
   SI MAMBA - js/data-soal-pai-tambahan.js
   TAMBAHAN bank soal DRAF PAI MI: Akidah Akhlak (aa), Fikih (fikih), dan SKI (ski), Fase A-C.
   Tujuan: menambah soal pada TP yang di data-soal-mi.js baru punya sekitar 2 PG, agar tiap TP minimal
   4 PG, 2 isian, dan 1 uraian. Soal DITAMBAHKAN ke kunci TP yang sudah ada (soal lama tidak diubah;
   soal yang bunyinya sama tidak diulang). Kunci = kunci TP di js/data-tp-mi.js.
   Status: DRAF, belum diperiksa guru. Guru wajib memeriksa kebenaran isi dan kesesuaiannya dengan buku
   ajar/mazhab yang dipakai madrasah. Format sama dengan data-soal-mi.js (PG: jawaban benar di posisi pertama;
   opsi diacak saat dipakai).
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const TAMBAH = {
    // ===================== AKIDAH AKHLAK FASE A =====================
    "aa-A-1": [
      P("L1", "Dua kalimat syahadat diucapkan oleh orang yang ingin ...", "masuk Islam", "berangkat haji", "membayar zakat", "berpuasa"),
      P("L1", "Kalimat 'Asyhadu an laa ilaaha illallaah' artinya ...", "Aku bersaksi tidak ada Tuhan selain Allah", "Aku bersaksi bahwa Allah Maha Pengampun", "Aku bersaksi bahwa Allah Maha Penyayang", "Aku bersaksi bahwa Allah Maha Pemberi"),
      I("L1", "Kalimat 'Wa asyhadu anna Muhammadan rasuulullaah' berarti Muhammad adalah ... Allah.", "utusan"),
      U("L2", "Jelaskan arti dua kalimat syahadat dengan kata-katamu sendiri!", "Jawaban benar memuat: bersaksi bahwa tidak ada Tuhan yang berhak disembah selain Allah, dan bersaksi bahwa Nabi Muhammad saw. adalah utusan Allah. Skor penuh bila kedua inti ada.")
    ],
    "aa-A-2": [
      P("L1", "Iman kepada malaikat adalah rukun iman yang ke ...", "dua", "satu", "tiga", "empat"),
      P("L1", "Iman kepada kitab-kitab Allah adalah rukun iman yang ke ...", "tiga", "dua", "lima", "enam"),
      I("L1", "Rukun iman yang keenam adalah iman kepada qada dan ....", "qadar"),
      I("L1", "Iman kepada rasul-rasul Allah adalah rukun iman yang ke ....", "empat")
    ],
    "aa-A-3": [
      P("L1", "Allah bersifat qidam, artinya Allah ...", "terdahulu (tidak ada awalnya)", "kekal (tidak ada akhirnya)", "Maha Mendengar", "Maha Kuasa"),
      P("L1", "Sifat Allah yang berarti Maha Mendengar adalah ...", "sami'", "basar", "kalam", "hayat"),
      I("L1", "Allah bersifat hayat, artinya Allah ....", "hidup"),
      U("L2", "Sebutkan tiga sifat wajib bagi Allah beserta artinya!", "Contoh benar: wujud = ada; qidam = terdahulu; baqa = kekal; hayat = hidup; sami' = Maha Mendengar; basar = Maha Melihat. Skor sebanding jumlah sifat dan arti yang benar.")
    ],
    "aa-A-4": [
      P("L1", "Malaikat yang bertugas mencatat amal baik manusia adalah ...", "Raqib", "Atid", "Munkar", "Ridwan"),
      P("L1", "Malaikat yang bertugas menjaga pintu surga adalah ...", "Ridwan", "Malik", "Israfil", "Mikail"),
      I("L1", "Malaikat Izrail bertugas mencabut ....", "nyawa"),
      I("L1", "Malaikat Mikail bertugas membagi ....", "rezeki")
    ],
    "aa-A-5": [
      P("L1", "Ar-Rahim artinya Maha ...", "Penyayang", "Pengasih", "Perkasa", "Pemberi"),
      P("L1", "Asmaulhusna yang berarti Maha Pemberi Keselamatan adalah ...", "As-Salam", "Al-Quddus", "Al-Malik", "Al-Mukmin"),
      I("L1", "Al-Quddus artinya Maha ....", "Suci"),
      U("L2", "Tuliskan arti Ar-Rahman, Ar-Rahim, dan Al-Malik!", "Ar-Rahman = Maha Pengasih; Ar-Rahim = Maha Penyayang; Al-Malik = Maha Merajai (Raja). Skor sebanding jumlah arti yang benar.")
    ],
    "aa-A-6": [
      P("L1", "As-Salam artinya Maha ...", "Memberi keselamatan", "Perkasa", "Memelihara", "Suci"),
      P("L1", "Asmaulhusna yang berarti Maha Memberi Keamanan adalah ...", "Al-Mukmin", "Al-Muhaimin", "Al-Aziz", "As-Salam"),
      I("L1", "Asmaulhusna yang berarti Maha Perkasa adalah Al-....", "Aziz"),
      U("L2", "Tuliskan arti As-Salam, Al-Mukmin, dan Al-Muhaimin!", "As-Salam = Maha Memberi Keselamatan; Al-Mukmin = Maha Memberi Keamanan; Al-Muhaimin = Maha Memelihara. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-A-7": [
      P("L1", "Kalimat 'Insya Allah' diucapkan ketika kita ...", "berencana melakukan sesuatu di masa depan", "mendapat musibah", "bersin", "melihat keindahan alam"),
      P("L1", "Ucapan 'Masya Allah' diucapkan ketika kita ...", "mengagumi ciptaan atau kebaikan", "mendapat musibah", "akan tidur", "meminta maaf"),
      I("L1", "Basmalah artinya dengan menyebut ... Allah.", "nama"),
      U("L2", "Sebutkan dua kalimat tayibah beserta waktu mengucapkannya!", "Contoh benar: basmalah ketika memulai pekerjaan; hamdalah ketika mendapat nikmat; istigfar ketika berbuat salah; insya Allah ketika berencana. Skor sebanding jumlah kalimat dan waktu yang benar.")
    ],
    "aa-A-8": [
      P("L1", "Kebersihan adalah sebagian dari ...", "iman", "ilmu", "amal", "harta"),
      P("L1", "Kita memotong kuku agar ...", "bersih dan sehat", "terlihat berbeda dari teman", "kuku cepat panjang", "tangan terasa berat"),
      I("L1", "Mandi sebaiknya dilakukan paling sedikit ... kali sehari.", "dua"),
      I("L1", "Mencuci tangan sebaiknya memakai air dan ....", "sabun")
    ],
    "aa-A-9": [
      P("L1", "Orang yang jujur akan disukai ...", "Allah dan teman-temannya", "hanya guru", "tidak seorang pun", "hanya orang tua"),
      P("L2", "Jika kamu memecahkan gelas milik teman, sikap yang jujur adalah ...", "mengaku dan meminta maaf", "diam saja", "menyalahkan teman lain", "menyembunyikan pecahannya"),
      I("L1", "Berkata benar dan sesuai kenyataan disebut sikap ....", "jujur"),
      U("L2", "Mengapa kita harus berlaku jujur? Jelaskan!", "Jawaban benar memuat salah satu alasan atau lebih: perintah Allah, dipercaya orang lain, hati tenang, dicintai teman dan guru. Skor penuh bila ada alasan yang masuk akal.")
    ],
    "aa-A-10": [
      P("L1", "Ucapan terima kasih dalam bahasa Arab adalah ...", "syukran", "afwan", "marhaban", "ahlan"),
      P("L2", "Jawaban yang sopan ketika seseorang berterima kasih kepadamu adalah ...", "sama-sama", "biarkan saja", "itu bukan urusanku", "terserah kamu"),
      I("L1", "Sikap tidak sombong dan menghargai orang lain disebut ....", "rendah hati"),
      I("L1", "Jazakallahu khairan diucapkan untuk membalas ... orang lain.", "kebaikan")
    ],
    "aa-A-11": [
      P("L1", "Perilaku bohong termasuk akhlak ...", "tercela", "terpuji", "utama", "mulia"),
      P("L2", "Jika kita bermalas-malasan, akibatnya adalah ...", "tugas tidak selesai", "dipuji guru", "mendapat hadiah", "semakin pandai"),
      I("L1", "Akhlak yang buruk disebut akhlak ....", "tercela"),
      U("L2", "Sebutkan tiga perilaku tercela yang harus dihindari di madrasah!", "Contoh benar: berbohong, malas, berkata kasar, mengejek teman, menyontek, membuang sampah sembarangan. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-A-12": [
      P("L1", "Ketika guru sedang menjelaskan pelajaran, kita sebaiknya ...", "mendengarkan dengan tenang", "bermain dengan teman", "berbicara sendiri", "meninggalkan kelas"),
      P("L2", "Jika ingin bertanya kepada guru, kita ...", "mengangkat tangan lebih dulu", "berteriak", "langsung memotong penjelasan", "memanggil guru hanya dengan namanya"),
      I("L1", "Ketika masuk kelas, kita mengucapkan ....", "salam"),
      U("L2", "Tuliskan tiga adab belajar yang baik!", "Contoh benar: berdoa sebelum belajar, memperhatikan guru, tidak ribut, mencatat pelajaran, bertanya dengan sopan, menghormati teman. Skor sebanding jumlah adab yang benar.")
    ],
    "aa-A-13": [
      P("L1", "Pakaian seorang muslim hendaknya ...", "bersih, rapi, dan menutup aurat", "mahal dan mencolok", "robek agar terlihat unik", "ketat dan pendek"),
      P("L1", "Ketika melepas pakaian, kita mendahulukan anggota badan sebelah ...", "kiri", "kanan", "depan", "belakang"),
      I("L1", "Ketika memakai sepatu, kita mendahulukan kaki ....", "kanan"),
      I("L1", "Sebelum memakai pakaian, kita membaca ....", "basmalah")
    ],
    "aa-A-14": [
      P("L1", "Orang yang bersin sebaiknya menutup ...", "mulut dan hidung", "mata", "telinga", "dahi"),
      P("L2", "Jika temanmu menjawab 'Yarhamukallah' setelah kamu bersin, kamu membalas dengan ...", "Yahdikumullah wa yushlihu balakum", "Alhamdulillah", "Subhanallah", "Astaghfirullah"),
      I("L1", "Ucapan 'Yarhamukallah' artinya semoga Allah ... kamu.", "merahmati"),
      U("L2", "Jelaskan adab ketika bersin dan menguap!", "Memuat: bersin menutup mulut dan hidung lalu membaca Alhamdulillah, orang yang mendengar menjawab Yarhamukallah; menguap berusaha menahan dan menutup mulut dengan tangan. Skor sebanding kelengkapan.")
    ],
    "aa-A-15": [
      P("L1", "Setelah selesai makan, kita membaca ...", "Alhamdulillah", "Bismillah", "Astaghfirullah", "Innalillahi"),
      P("L2", "Makanan yang sudah ada di piring sebaiknya ...", "dihabiskan", "dibuang", "dimainkan", "disisakan banyak"),
      I("L1", "Makan secara berlebihan dan membuang-buang makanan disebut ....", "mubazir"),
      I("L1", "Adab makan yang baik, sebaiknya dilakukan sambil ....", "duduk")
    ],
    "aa-A-16": [
      P("L1", "Nabi Muhammad saw. lahir pada hari Senin tanggal 12 bulan ...", "Rabiulawal", "Rajab", "Ramadan", "Syawal"),
      P("L1", "Kakek yang mengasuh Nabi Muhammad saw. setelah ibunya wafat adalah ...", "Abdul Muttalib", "Abu Thalib", "Abu Lahab", "Abbas"),
      I("L1", "Ibu susu Nabi Muhammad saw. bernama ....", "Halimah"),
      U("L2", "Sebutkan tiga sifat Nabi Muhammad saw.!", "Contoh benar: sidik (jujur), amanah (dapat dipercaya), tablig (menyampaikan), fatanah (cerdas), penyabar, penyayang. Skor sebanding jumlah sifat yang benar.")
    ],
    "aa-A-17": [
      P("L1", "Nabi Nuh a.s. mengajak kaumnya untuk menyembah ...", "Allah", "berhala", "matahari", "bulan"),
      P("L2", "Sikap kaum Nabi Nuh a.s. terhadap dakwahnya adalah ...", "menolak dan mengejek", "menerima seluruhnya", "membantu membuat kapal", "mengikuti sebagian besar"),
      I("L1", "Nabi Nuh a.s. termasuk Nabi Ulul ....", "Azmi"),
      I("L1", "Allah menurunkan ... besar untuk menenggelamkan kaum Nabi Nuh a.s. yang ingkar.", "banjir")
    ],
    // ===================== AKIDAH AKHLAK FASE B =====================
    "aa-B-1": [
      P("L1", "Asmaulhusna yang berarti Maha Agung adalah ...", "Al-'Adhim", "Al-Kabir", "Al-Wahhab", "Al-Aziz"),
      P("L1", "Al-Kabir artinya Maha ...", "Besar", "Agung", "Pemberi", "Kuat"),
      I("L1", "Asmaulhusna yang berarti Maha Pemberi adalah Al-....", "Wahhab"),
      U("L2", "Tuliskan arti Al-Wahhab, Al-Kabir, dan Al-'Adhim!", "Al-Wahhab = Maha Pemberi; Al-Kabir = Maha Besar; Al-'Adhim = Maha Agung. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-B-2": [
      P("L1", "Al-Bashir artinya Maha ...", "Melihat", "Mendengar", "Mengetahui", "Menjaga"),
      P("L1", "Asmaulhusna yang berarti Maha Mendengar adalah ...", "As-Sami'", "Al-Bashir", "Al-'Alim", "Al-Khabir"),
      I("L1", "Al-'Alim artinya Maha ....", "Mengetahui"),
      I("L1", "Allah mendengar doa kita karena Allah bersifat As-....", "Sami'")
    ],
    "aa-B-3": [
      P("L1", "Kitab Injil diturunkan kepada Nabi ...", "Isa", "Musa", "Daud", "Muhammad"),
      P("L1", "Jumlah kitab Allah yang wajib kita imani adalah ...", "empat", "tiga", "lima", "enam"),
      I("L1", "Al-Qur'an diturunkan kepada Nabi Muhammad saw. melalui malaikat ....", "Jibril"),
      U("L2", "Sebutkan empat kitab Allah beserta nabi penerimanya!", "Taurat - Nabi Musa a.s.; Zabur - Nabi Daud a.s.; Injil - Nabi Isa a.s.; Al-Qur'an - Nabi Muhammad saw. Skor sebanding jumlah pasangan yang benar.")
    ],
    "aa-B-4": [
      P("L1", "Nabi yang pertama diciptakan Allah adalah ...", "Nabi Adam a.s.", "Nabi Nuh a.s.", "Nabi Ibrahim a.s.", "Nabi Musa a.s."),
      P("L1", "Nabi yang dijuluki Khalilullah (kekasih Allah) adalah ...", "Nabi Ibrahim a.s.", "Nabi Musa a.s.", "Nabi Isa a.s.", "Nabi Yusuf a.s."),
      I("L1", "Nabi yang dijuluki Kalimullah adalah Nabi ....", "Musa"),
      I("L2", "Nabi yang dapat berbicara dengan hewan adalah Nabi ....", "Sulaiman")
    ],
    "aa-B-5": [
      P("L1", "Ucapan 'Masya Allah' artinya ...", "Atas kehendak Allah", "Maha Suci Allah", "Segala puji bagi Allah", "Allah Maha Besar"),
      P("L2", "Ucapan 'Subhanallah' diucapkan ketika kita ...", "kagum atau takjub", "mendapat musibah", "meminta maaf", "bersin"),
      I("L1", "Ucapan 'Alhamdulillah' artinya segala puji bagi ....", "Allah"),
      I("L1", "Ucapan untuk memohon ampun kepada Allah disebut ....", "istigfar")
    ],
    "aa-B-6": [
      P("L1", "Orang yang bersyukur akan ... nikmatnya oleh Allah.", "ditambah", "dikurangi", "dihentikan", "dilupakan"),
      P("L2", "Contoh bersyukur dengan lisan adalah ...", "mengucapkan Alhamdulillah", "mengeluh", "menyombongkan diri", "diam saja"),
      I("L1", "Orang yang tidak mau bersyukur disebut orang yang ... nikmat.", "kufur"),
      U("L2", "Tuliskan tiga cara bersyukur kepada Allah!", "Contoh benar: mengucapkan Alhamdulillah, menggunakan nikmat untuk kebaikan, beribadah dengan rajin, berbagi dengan orang lain, menjaga pemberian Allah. Skor sebanding jumlah cara yang benar.")
    ],
    "aa-B-7": [
      P("L1", "Contoh sikap pantang menyerah adalah ...", "tetap berlatih meski belum berhasil", "berhenti ketika gagal", "menyalahkan teman", "menyontek"),
      P("L2", "Ketika mengalami kegagalan, kita sebaiknya ...", "mencoba lagi dan berdoa", "marah-marah", "menyerah", "menyalahkan orang lain"),
      I("L1", "Orang yang tidak mudah putus asa disebut orang yang ....", "pantang menyerah"),
      I("L1", "Kita harus berusaha dan ... kepada Allah.", "berdoa")
    ],
    "aa-B-8": [
      P("L2", "Contoh sikap berani yang salah adalah ...", "melawan guru", "berani jujur", "berani membela yang lemah", "berani meminta maaf"),
      P("L2", "Berani mengakui kesalahan menunjukkan sikap ...", "pemberani dan jujur", "sombong", "pengecut", "malas"),
      I("L1", "Lawan dari berani adalah ....", "takut (pengecut)"),
      U("L2", "Berikan dua contoh sikap berani yang benar di madrasah!", "Contoh benar: berani mengakui kesalahan, berani menolak ajakan berbuat buruk, berani menegur teman yang salah dengan sopan, berani bertanya, berani membela yang lemah. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-B-9": [
      P("L1", "Tolong-menolong dalam keburukan hukumnya ...", "dilarang", "dianjurkan", "wajib", "sunah"),
      P("L2", "Jika temanmu lupa membawa pensil, sikap menolong yang benar adalah ...", "meminjamkan pensil", "menertawakannya", "mengambil pensilnya", "tidak peduli"),
      I("L1", "Saling membantu dalam kebaikan disebut ....", "tolong-menolong"),
      I("L1", "Allah memerintahkan tolong-menolong dalam kebaikan dan ....", "takwa")
    ],
    "aa-B-10": [
      P("L1", "Barang titipan harus ...", "dijaga dan dikembalikan", "dipakai sesukanya", "dijual", "dilupakan"),
      P("L1", "Orang yang tidak amanah disebut ...", "pengkhianat", "dermawan", "pemaaf", "penyabar"),
      I("L1", "Rasulullah dijuluki Al-Amin yang artinya orang yang dapat ....", "dipercaya"),
      U("L2", "Berikan dua contoh sikap amanah di madrasah!", "Contoh benar: menjaga barang titipan teman, mengembalikan buku perpustakaan tepat waktu, menjalankan tugas piket, menyampaikan pesan guru dengan benar. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-B-11": [
      P("L1", "Lawan dari kikir adalah ...", "dermawan", "serakah", "pemarah", "sombong"),
      P("L2", "Contoh sikap kikir adalah ...", "tidak mau meminjamkan barang padahal mampu", "memberi sedekah", "berbagi bekal", "menolong teman"),
      I("L1", "Orang yang suka berbagi disebut ....", "dermawan"),
      I("L1", "Memberi sebagian harta kepada orang yang membutuhkan disebut ....", "sedekah")
    ],
    "aa-B-12": [
      P("L2", "Ketika orang tua menasihati kita, sikap yang benar adalah ...", "mendengarkan dengan baik", "membantah", "pergi tanpa pamit", "menutup telinga"),
      P("L1", "Durhaka kepada orang tua termasuk dosa ...", "besar", "kecil", "ringan", "tidak berdosa"),
      I("L1", "Ridha Allah tergantung pada ridha ....", "orang tua"),
      U("L2", "Tuliskan tiga cara berbakti kepada orang tua!", "Contoh benar: menaati perintah yang baik, berkata sopan, membantu pekerjaan rumah, mendoakan, merawat ketika sakit, tidak membantah. Skor sebanding jumlah cara yang benar.")
    ],
    "aa-B-13": [
      P("L2", "Ketika guru memberi tugas, kita sebaiknya ...", "mengerjakannya dengan sungguh-sungguh", "mengabaikannya", "menyuruh teman mengerjakan", "menunda sampai besok"),
      P("L2", "Ketika akan masuk ruang guru, kita ...", "mengetuk pintu dan mengucap salam", "langsung masuk", "berteriak memanggil", "mendorong pintu keras-keras"),
      I("L1", "Ketika bertemu guru, kita mengucapkan ....", "salam"),
      I("L1", "Orang yang mengajarkan ilmu kepada kita disebut ....", "guru")
    ],
    "aa-B-14": [
      P("L2", "Jika temanmu sedang sakit, sebaiknya kamu ...", "menjenguk dan mendoakannya", "mengejeknya", "menjauhinya", "tidak peduli"),
      P("L1", "Mengejek teman hukumnya ...", "dilarang", "boleh", "sunah", "wajib"),
      I("L1", "Persaudaraan sesama muslim disebut ukhuwah ....", "Islamiyah"),
      U("L2", "Tuliskan tiga adab bergaul dengan teman!", "Contoh benar: saling menghormati, tidak mengejek, menolong, meminta maaf dan memaafkan, jujur, tidak memanggil dengan julukan buruk. Skor sebanding jumlah adab yang benar.")
    ],
    "aa-B-15": [
      P("L1", "Nabi Ibrahim a.s. membangun Kakbah bersama putranya, yaitu Nabi ...", "Ismail", "Ishaq", "Yakub", "Yusuf"),
      P("L1", "Hari raya yang memperingati peristiwa kurban Nabi Ibrahim a.s. adalah ...", "Iduladha", "Idulfitri", "Maulid Nabi", "Isra Mikraj"),
      I("L1", "Perintah menyembelih putra Nabi Ibrahim a.s. datang melalui ....", "mimpi"),
      I("L1", "Allah menggantikan Nabi Ismail a.s. dengan seekor ....", "domba")
    ],
    // ===================== AKIDAH AKHLAK FASE C =====================
    "aa-C-1": [
      P("L1", "Al-Mumit artinya Maha ...", "Mematikan", "Menghidupkan", "Esa", "Kuat"),
      P("L1", "Asmaulhusna yang berarti Maha Kuat adalah ...", "Al-Qawiyy", "Al-Wahid", "Al-Muhyi", "Al-Ghaffar"),
      I("L1", "Asmaulhusna yang berarti Maha Esa adalah Al-....", "Wahid"),
      U("L2", "Tuliskan arti Al-Muhyi, Al-Mumit, dan Al-Wahid!", "Al-Muhyi = Maha Menghidupkan; Al-Mumit = Maha Mematikan; Al-Wahid = Maha Esa. Skor sebanding jumlah arti yang benar.")
    ],
    "aa-C-2": [
      P("L1", "Al-Ghafur artinya Maha ...", "Pengampun", "Penyayang", "Pemberi", "Mengetahui"),
      P("L2", "Karena Allah Maha Pengampun, kita dianjurkan untuk ...", "bertobat ketika berbuat salah", "mengulangi kesalahan", "menunda meminta maaf", "menyembunyikan kesalahan"),
      I("L1", "Asmaulhusna yang berarti Maha Pengampun adalah Al-....", "Ghaffar"),
      I("L1", "Al-Waasi' artinya Maha ....", "Luas")
    ],
    "aa-C-3": [
      P("L1", "Tempat balasan bagi orang yang durhaka kepada Allah adalah ...", "neraka", "surga", "barzakh", "mahsyar"),
      P("L1", "Alam setelah kematian sampai hari kiamat disebut alam ...", "barzakh", "dunia", "mahsyar", "rahim"),
      I("L1", "Tempat berkumpulnya manusia setelah dibangkitkan disebut padang ....", "mahsyar"),
      U("L2", "Sebutkan tiga peristiwa yang terjadi pada hari akhir!", "Contoh benar: kiamat, kebangkitan dari kubur, berkumpul di mahsyar, hisab (perhitungan amal), mizan (timbangan amal), sirat, balasan surga atau neraka. Skor sebanding jumlah peristiwa yang benar.")
    ],
    "aa-C-4": [
      P("L2", "Orang yang beriman kepada qada dan qadar tidak ... ketika gagal.", "putus asa", "bersyukur", "bersabar", "berdoa"),
      P("L2", "Setelah berusaha sungguh-sungguh, kita bersikap ...", "bertawakal kepada Allah", "menyalahkan takdir", "menyerah", "sombong"),
      I("L1", "Menyerahkan hasil usaha kepada Allah setelah berusaha disebut ....", "tawakal"),
      I("L1", "Beriman kepada qada dan qadar adalah rukun iman yang ke ....", "enam")
    ],
    "aa-C-5": [
      P("L1", "Kalimat tarji' adalah ...", "Innalillahi wa inna ilaihi raji'un", "Alhamdulillah", "Astaghfirullah", "Subhanallah"),
      P("L1", "Kalimat 'La haula wa la quwwata illa billah' artinya ...", "tiada daya dan kekuatan kecuali dengan pertolongan Allah", "Allah Maha Besar", "Maha Suci Allah", "segala puji bagi Allah"),
      I("L1", "Kalimat 'Allahu Akbar' disebut juga kalimat ....", "takbir"),
      U("L2", "Tuliskan tiga kalimat tayibah beserta artinya!", "Contoh benar: Subhanallah = Maha Suci Allah; Alhamdulillah = segala puji bagi Allah; Allahu Akbar = Allah Maha Besar; Astaghfirullah = aku memohon ampun kepada Allah. Skor sebanding jumlah kalimat dan arti yang benar.")
    ],
    "aa-C-6": [
      P("L1", "Allah bersama orang-orang yang ...", "sabar", "sombong", "malas", "kikir"),
      P("L2", "Ketika sakit, sikap yang benar adalah ...", "bersabar dan berikhtiar berobat", "marah-marah", "menyalahkan Allah", "putus asa"),
      I("L1", "Sikap tergesa-gesa dan mudah marah berlawanan dengan sikap ....", "sabar"),
      I("L1", "Sabar dalam menjalankan perintah Allah disebut sabar dalam ....", "ketaatan")
    ],
    "aa-C-7": [
      P("L1", "Contoh disiplin di madrasah adalah ...", "datang tepat waktu", "terlambat", "membolos", "melanggar tata tertib"),
      P("L2", "Sikap mandiri membuat kita tidak ...", "bergantung pada orang lain", "bertanggung jawab", "rajin", "percaya diri"),
      I("L1", "Datang ke madrasah tepat waktu termasuk sikap ....", "disiplin"),
      U("L2", "Tuliskan dua contoh sikap mandiri dan dua contoh sikap disiplin!", "Mandiri: mis. merapikan buku sendiri, mengerjakan PR sendiri. Disiplin: mis. datang tepat waktu, menaati tata tertib. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-C-8": [
      P("L1", "Allah menyukai orang yang ...", "pemaaf", "pendendam", "pemarah", "sombong"),
      P("L2", "Jika kita bersalah kepada teman, kita ...", "meminta maaf", "diam saja", "menyalahkan teman", "menjauhinya"),
      I("L1", "Lawan dari pemaaf adalah ....", "pendendam"),
      I("L2", "Menyelesaikan piket kelas sesuai jadwal termasuk sikap ....", "bertanggung jawab")
    ],
    "aa-C-9": [
      P("L1", "Hakim yang adil memutuskan perkara ...", "sesuai kebenaran", "sesuai kemauan sendiri", "berpihak kepada temannya", "berdasarkan suap"),
      P("L2", "Contoh perilaku tidak adil adalah ...", "membeda-bedakan teman", "membagi sama rata", "mengikuti aturan", "bersikap jujur"),
      I("L1", "Perbuatan zalim artinya berbuat tidak ....", "adil"),
      U("L2", "Berikan dua contoh sikap adil di rumah dan di madrasah!", "Contoh benar: membagi tugas piket merata, tidak pilih kasih terhadap teman, membagi makanan sama rata, memberi giliran bermain. Skor sebanding jumlah contoh yang benar.")
    ],
    "aa-C-10": [
      P("L2", "Marah yang berlebihan dapat menyebabkan ...", "penyesalan dan merugikan orang lain", "dicintai teman", "hati tenang", "mendapat pahala"),
      P("L2", "Contoh perbuatan fasik adalah ...", "meninggalkan salat dengan sengaja", "membantu teman", "mengucapkan salam", "bersedekah"),
      I("L1", "Orang yang mudah marah disebut ....", "pemarah"),
      I("L1", "Ketika marah kita dianjurkan membaca ....", "ta'awuz")
    ],
    "aa-C-11": [
      P("L2", "Sikap iri hati dapat dihindari dengan ...", "mensyukuri nikmat sendiri", "membenci orang lain", "menyombongkan diri", "mengambil milik teman"),
      P("L1", "Lawan dari egois adalah ...", "peduli kepada orang lain", "serakah", "pemarah", "kikir"),
      I("L1", "Iri hati disebut juga ....", "hasad"),
      U("L2", "Jelaskan bahaya sikap iri hati dan cara menghindarinya!", "Memuat bahaya (mis. merusak persahabatan, hati tidak tenang, dibenci Allah) dan cara menghindari (mis. mensyukuri nikmat, berdoa, ikut senang atas keberhasilan orang lain). Skor sebanding kelengkapan.")
    ],
    "aa-C-12": [
      P("L2", "Jika tuan rumah belum membukakan pintu setelah tiga kali salam, kita sebaiknya ...", "pulang dengan baik", "masuk saja", "menggedor pintu", "berteriak memanggil"),
      P("L2", "Waktu yang baik untuk bertamu adalah ...", "waktu yang tidak mengganggu tuan rumah", "tengah malam", "saat tuan rumah tidur", "kapan saja"),
      I("L1", "Ketika masuk rumah orang, kita mengucapkan ....", "salam"),
      I("L1", "Tuan rumah yang baik ... tamunya dengan ramah.", "menghormati")
    ],
    "aa-C-13": [
      P("L1", "Nabi menganjurkan kita memuliakan ...", "tetangga", "orang asing saja", "hewan liar", "barang antik"),
      P("L2", "Kerja bakti di lingkungan dilakukan untuk ...", "menjaga kebersihan bersama", "mengganggu tetangga", "menghabiskan waktu", "bermain saja"),
      I("L1", "Membuang sampah sembarangan dapat menyebabkan ....", "banjir"),
      U("L2", "Tuliskan tiga cara bersikap baik kepada tetangga!", "Contoh benar: mengucapkan salam, menjenguk saat sakit, berbagi makanan, tidak membuat gaduh, membantu ketika kesulitan, menjaga kebersihan lingkungan. Skor sebanding jumlah cara yang benar.")
    ],
    "aa-C-14": [
      P("L1", "Saudara Nabi Musa a.s. yang membantunya berdakwah adalah ...", "Nabi Harun a.s.", "Nabi Yusuf a.s.", "Nabi Ismail a.s.", "Nabi Daud a.s."),
      P("L1", "Tongkat Nabi Musa a.s. termasuk ...", "mukjizat", "senjata perang", "alat berburu", "perhiasan"),
      I("L1", "Kitab yang diturunkan kepada Nabi Musa a.s. adalah ....", "Taurat"),
      I("L1", "Nabi Musa a.s. dijuluki ....", "Kalimullah")
    ],
    "aa-C-15": [
      P("L1", "Nabi Isa a.s. dapat menghidupkan orang mati atas izin ...", "Allah", "dirinya sendiri", "malaikat", "kaumnya"),
      P("L1", "Salah satu mukjizat Nabi Isa a.s. adalah ...", "menyembuhkan orang sakit kusta", "membelah laut", "melunakkan besi", "berbicara dengan hewan"),
      I("L1", "Nabi Isa a.s. lahir tanpa ....", "ayah"),
      U("L2", "Sebutkan dua mukjizat Nabi Isa a.s.!", "Contoh benar: berbicara saat masih bayi, menyembuhkan orang buta dan sakit kusta, menghidupkan orang mati atas izin Allah, membuat burung dari tanah atas izin Allah. Skor sebanding jumlah mukjizat yang benar.")
    ],
    // ===================== FIKIH =====================
    "fikih-A-1": [
      P("L1", "Rukun Islam yang pertama adalah ...", "mengucapkan dua kalimat syahadat", "mendirikan salat", "berpuasa Ramadan", "menunaikan zakat"),
      P("L1", "Naik haji bagi yang mampu adalah rukun Islam yang ke ...", "lima", "tiga", "empat", "dua"),
      I("L1", "Rukun Islam yang kedua adalah ....", "salat"),
      I("L1", "Puasa di bulan Ramadan adalah rukun Islam yang ke ....", "empat")
    ],
    "fikih-A-2": [
      P("L1", "Syahadat pertama menyatakan bahwa tidak ada Tuhan selain ...", "Allah", "malaikat", "nabi", "manusia"),
      P("L1", "Syahadat kedua menyatakan bahwa Muhammad adalah ... Allah.", "utusan", "malaikat", "anak", "pelayan"),
      I("L1", "Dua kalimat syahadat disebut juga ....", "syahadatain"),
      I("L1", "Orang yang telah bersyahadat disebut seorang ....", "muslim"),
      U("L2", "Tuliskan bunyi dan arti dua kalimat syahadat!", "Asyhadu an laa ilaaha illallaah wa asyhadu anna Muhammadan rasuulullaah. Artinya: aku bersaksi tidak ada Tuhan selain Allah dan aku bersaksi bahwa Muhammad adalah utusan Allah. Skor sebanding kelengkapan bunyi dan arti.")
    ],
    "fikih-A-3": [
      P("L1", "Air hujan termasuk air ...", "mutlak (suci dan menyucikan)", "najis", "musta'mal", "yang tercampur"),
      P("L1", "Sesuatu yang kotor menurut syariat dan membuat salat tidak sah disebut ...", "najis", "suci", "mutlak", "mubah"),
      I("L1", "Rukun wudu yang pertama adalah ....", "niat")
    ],
    "fikih-A-4": [
      P("L1", "Salat Zuhur terdiri dari ... rakaat.", "empat", "dua", "tiga", "lima"),
      P("L1", "Salat yang dikerjakan pada malam hari setelah Magrib adalah salat ...", "Isya", "Asar", "Subuh", "Zuhur"),
      I("L1", "Salat Magrib terdiri dari ... rakaat.", "tiga")
    ],
    "fikih-A-5": [
      P("L1", "Posisi makmum dalam salat berjemaah adalah ...", "di belakang imam", "di depan imam", "di atas imam", "bebas di mana saja"),
      P("L1", "Jumlah minimal orang untuk salat berjemaah adalah ...", "dua orang", "satu orang", "tiga orang", "lima orang"),
      I("L1", "Salat berjemaah lebih utama ... derajat daripada salat sendirian.", "27"),
      U("L2", "Tuliskan tiga adab mengikuti salat berjemaah!", "Contoh benar: datang tepat waktu, merapikan dan merapatkan saf, mengikuti gerakan imam, tidak mendahului imam, tidak bercanda atau ribut. Skor sebanding jumlah adab yang benar.")
    ],
    "fikih-A-6": [
      P("L1", "Azan diawali dengan kalimat ...", "Allahu Akbar", "Hayya 'alash shalah", "Laa ilaaha illallah", "Qad qamatish shalah"),
      P("L2", "Kalimat yang ada pada ikamah dan tidak ada pada azan adalah ...", "Qad qamatish shalah", "Allahu Akbar", "Laa ilaaha illallah", "Hayya 'alal falah"),
      I("L1", "Kalimat 'Hayya 'alash shalah' artinya marilah ....", "salat"),
      U("L2", "Jelaskan perbedaan azan dan ikamah!", "Memuat: azan untuk memberitahu masuknya waktu salat; ikamah untuk menandai salat berjemaah segera dimulai; ikamah memuat kalimat Qad qamatish shalah. Skor sebanding kelengkapan.")
    ],
    "fikih-A-7": [
      P("L1", "Zikir yang berarti Maha Suci Allah adalah ...", "Subhanallah", "Alhamdulillah", "Allahu Akbar", "Astaghfirullah"),
      P("L1", "Zikir yang berarti memohon ampun kepada Allah adalah ...", "Astaghfirullah", "Subhanallah", "Alhamdulillah", "Allahu Akbar"),
      I("L1", "Bacaan 'Alhamdulillah' disebut juga ....", "tahmid"),
      U("L2", "Sebutkan tiga bacaan zikir sesudah salat beserta artinya!", "Contoh benar: Subhanallah = Maha Suci Allah; Alhamdulillah = segala puji bagi Allah; Allahu Akbar = Allah Maha Besar; Astaghfirullah = aku memohon ampun kepada Allah. Skor sebanding jumlah zikir dan arti yang benar.")
    ],
    "fikih-B-1": [
      P("L1", "Puasa Ramadan hukumnya ...", "wajib", "sunah", "makruh", "mubah"),
      P("L1", "Hari raya yang dirayakan setelah puasa Ramadan adalah ...", "Idulfitri", "Iduladha", "Maulid Nabi", "Isra Mikraj"),
      I("L1", "Makan dan minum ketika waktu magrib tiba disebut ....", "berbuka puasa")
    ],
    "fikih-B-2": [
      P("L1", "Salat Jumat wajib bagi ...", "laki-laki muslim yang balig dan mukim", "anak kecil", "perempuan saja", "musafir saja"),
      P("L1", "Jumlah khutbah dalam salat Jumat adalah ...", "dua", "satu", "tiga", "empat"),
      I("L1", "Orang yang menyampaikan khutbah Jumat disebut ....", "khatib"),
      U("L2", "Tuliskan tiga adab menghadiri salat Jumat!", "Contoh benar: mandi dan berpakaian bersih, berangkat lebih awal, mendengarkan khutbah dengan tenang, tidak berbicara saat khutbah, tidak melangkahi pundak jemaah. Skor sebanding jumlah adab yang benar.")
    ],
    "fikih-B-3": [
      P("L1", "Salat sunah yang mengiringi salat fardu disebut salat ...", "rawatib", "tahajud", "duha", "witir"),
      P("L1", "Salat sunah dengan rakaat ganjil yang dikerjakan setelah salat Isya adalah salat ...", "witir", "duha", "tahajud", "rawatib"),
      I("L1", "Salat sunah malam hari di bulan Ramadan disebut salat ....", "tarawih"),
      I("L1", "Salat sunah yang dikerjakan pada pagi hari setelah matahari naik disebut salat ....", "duha")
    ],
    "fikih-B-4": [
      P("L1", "Salat jamak artinya ...", "menggabungkan dua salat dalam satu waktu", "meringkas jumlah rakaat salat", "meninggalkan salat", "menunda salat sampai hari berikutnya"),
      P("L1", "Salat qasar artinya ...", "meringkas salat empat rakaat menjadi dua rakaat", "menggabungkan dua salat", "menunda salat", "salat sambil berjalan"),
      I("L1", "Meringkas salat yang empat rakaat menjadi dua rakaat disebut salat ....", "qasar"),
      U("L2", "Sebutkan dua contoh rukhsah dalam ibadah beserta alasannya!", "Contoh benar: salat sambil duduk atau berbaring karena sakit; jamak atau qasar karena bepergian; tidak berpuasa karena sakit atau musafir lalu mengganti di hari lain; bertayamum ketika tidak ada air. Skor sebanding jumlah contoh dan alasan yang benar.")
    ],
    "fikih-B-5": [
      P("L1", "Anak yang sudah balig dan berakal wajib ...", "menjalankan kewajiban agama", "bermain saja", "tidak berpuasa", "diberi keringanan seumur hidup"),
      P("L1", "Orang yang sudah dibebani kewajiban agama disebut ...", "mukalaf", "mumayiz", "musafir", "muazin"),
      I("L1", "Haid dialami oleh anak perempuan yang sudah ....", "balig"),
      I("L1", "Setelah haid selesai, perempuan wajib melakukan mandi ....", "wajib")
    ],
    "fikih-B-6": [
      P("L1", "Rukun mandi wajib yang pertama adalah ...", "niat", "menyikat gigi", "memakai sabun", "membasuh kaki"),
      P("L1", "Mandi wajib dilakukan dengan cara ...", "meratakan air ke seluruh tubuh", "membasuh wajah saja", "mengusap kepala saja", "membasuh kaki saja"),
      I("L1", "Keluarnya mani disebut ....", "junub"),
      U("L2", "Sebutkan tiga penyebab seseorang wajib mandi!", "Contoh benar: haid, nifas, keluar mani (junub), melahirkan (wiladah), berhubungan suami istri, meninggal dunia (kecuali mati syahid). Skor sebanding jumlah penyebab yang benar.")
    ],
    "fikih-C-1": [
      P("L1", "Orang yang berhak menerima zakat disebut ...", "mustahik", "muzaki", "mukalaf", "muazin"),
      P("L1", "Orang yang wajib mengeluarkan zakat disebut ...", "muzaki", "mustahik", "imam", "khatib"),
      I("L1", "Zakat fitrah berupa makanan pokok, misalnya ....", "beras")
    ],
    "fikih-C-2": [
      P("L1", "Kurban dilaksanakan pada hari raya ...", "Iduladha", "Idulfitri", "Maulid Nabi", "Tahun Baru Hijriah"),
      P("L1", "Daging kurban dibagikan kepada ...", "fakir miskin dan warga sekitar", "hanya panitia", "hanya orang kaya", "tidak dibagikan"),
      I("L1", "Hewan kurban harus sehat dan tidak ....", "cacat")
    ],
    "fikih-C-3": [
      P("L1", "Ibadah haji wajib bagi muslim yang ...", "mampu", "kaya raya saja", "berusia tua", "tinggal di Mekah"),
      P("L1", "Pakaian ihram bagi laki-laki berwarna ...", "putih", "hitam", "merah", "hijau"),
      I("L1", "Ibadah mengelilingi Kakbah tujuh kali disebut ....", "tawaf"),
      U("L2", "Sebutkan tiga amalan atau rukun haji!", "Contoh benar: ihram, wukuf di Arafah, tawaf, sai antara Safa dan Marwah, tahalul. Skor sebanding jumlah amalan yang benar.")
    ],
    "fikih-C-4": [
      P("L1", "Contoh minuman haram adalah ...", "khamr (minuman keras)", "air putih", "susu", "jus buah"),
      P("L2", "Sebelum membeli makanan kemasan, kita sebaiknya memeriksa label ...", "halal", "warna", "harga saja", "bentuk"),
      I("L1", "Makanan yang boleh dimakan menurut syariat disebut makanan ....", "halal")
    ],
    "fikih-C-5": [
      P("L1", "Jual beli harus dilakukan dengan ...", "suka sama suka", "paksaan", "tipu daya", "ancaman"),
      P("L1", "Berbohong tentang kualitas barang dalam jual beli hukumnya ...", "haram", "boleh", "sunah", "wajib"),
      I("L1", "Orang yang membeli barang disebut ....", "pembeli"),
      U("L2", "Sebutkan tiga adab dalam jual beli!", "Contoh benar: jujur, tidak mengurangi timbangan, suka sama suka, tidak menyembunyikan cacat barang, tidak menipu, menepati janji. Skor sebanding jumlah adab yang benar.")
    ],
    "fikih-C-6": [
      P("L1", "Barang pinjaman boleh dipakai sesuai ...", "izin pemiliknya", "keinginan peminjam", "kebutuhan teman", "kebiasaan umum"),
      P("L1", "Meminjamkan barang kepada orang yang membutuhkan hukumnya ...", "sunah (dianjurkan)", "haram", "makruh", "wajib selamanya"),
      I("L2", "Meminjam barang lalu tidak mau mengembalikan termasuk perbuatan ....", "khianat")
    ],
    "fikih-C-7": [
      P("L1", "Memakai sepeda teman tanpa izin disebut ...", "gasab", "sedekah", "hibah", "wakaf"),
      P("L2", "Jika sudah telanjur gasab, kita harus ...", "mengembalikan dan meminta maaf", "menyembunyikannya", "menyalahkan pemilik", "membiarkannya"),
      I("L1", "Orang yang gasab berdosa dan harus ... barang itu.", "mengembalikan"),
      U("L2", "Berikan dua contoh gasab di madrasah dan cara menghindarinya!", "Contoh gasab: memakai pensil atau buku teman tanpa izin, mengambil bekal teman tanpa izin. Cara menghindari: meminta izin dulu, tidak mengambil barang yang bukan milik sendiri. Skor sebanding kelengkapan.")
    ],
    "fikih-C-8": [
      P("L1", "Orang yang menemukan barang yang hilang disebut ...", "multaqit", "muazin", "mustahik", "musafir"),
      P("L2", "Barang temuan yang berharga sebaiknya ...", "diumumkan untuk dicari pemiliknya", "disimpan diam-diam", "dijual", "dipakai sendiri"),
      I("L1", "Jika pemilik barang temuan sudah ditemukan, barang harus ....", "dikembalikan"),
      I("L2", "Barang temuan di madrasah sebaiknya diserahkan kepada ....", "guru")
    ],
    // ===================== SKI =====================
    "ski-B-1": [
      P("L1", "Pada zaman jahiliah, kedudukan perempuan dalam masyarakat Arab ...", "rendah dan tidak dihargai", "sangat dihormati", "setara dengan pemimpin", "dilindungi hukum"),
      P("L1", "Islam datang untuk membawa manusia dari kegelapan menuju ...", "cahaya", "kegelapan", "kesesatan", "kesombongan"),
      I("L1", "Kakbah dibangun oleh Nabi Ibrahim a.s. dan putranya, Nabi ....", "Ismail")
    ],
    "ski-B-2": [
      P("L1", "Kakek yang mengasuh Nabi Muhammad saw. setelah ibunya wafat adalah ...", "Abdul Muttalib", "Abu Lahab", "Abu Jahal", "Hamzah"),
      P("L1", "Setelah kakeknya wafat, Nabi Muhammad saw. diasuh oleh pamannya, yaitu ...", "Abu Thalib", "Abu Lahab", "Abu Jahal", "Hamzah"),
      I("L1", "Ibu susu Nabi Muhammad saw. bernama ....", "Halimah"),
      U("L2", "Ceritakan secara singkat masa kecil Nabi Muhammad saw.!", "Memuat inti: lahir sebagai yatim, disusui Halimah, diasuh kakeknya Abdul Muttalib lalu pamannya Abu Thalib, dikenal jujur dan dapat dipercaya. Skor sebanding kelengkapan.")
    ],
    "ski-B-3": [
      P("L1", "Nabi Muhammad saw. menerima wahyu pertama pada usia ... tahun.", "40", "25", "30", "50"),
      P("L1", "Wahyu pertama turun pada bulan ...", "Ramadan", "Rajab", "Syawal", "Muharam"),
      I("L1", "Perintah pertama dalam wahyu pertama adalah ... (iqra').", "bacalah"),
      U("L2", "Apa pesan penting dari wahyu pertama Surah Al-'Alaq? Jelaskan!", "Memuat: perintah membaca dan belajar dengan menyebut nama Allah yang menciptakan; pentingnya ilmu. Skor penuh bila perintah membaca dan nama Allah disebut.")
    ],
    "ski-B-4": [
      P("L1", "Dakwah pertama Nabi Muhammad saw. dilakukan secara ...", "sembunyi-sembunyi", "terang-terangan", "dengan perang", "dengan paksaan"),
      P("L1", "Anak yang termasuk pertama kali masuk Islam adalah ...", "Ali bin Abi Thalib", "Umar bin Khattab", "Usman bin Affan", "Hamzah"),
      I("L1", "Orang-orang yang pertama masuk Islam disebut Assabiqunal ....", "Awwalun"),
      I("L1", "Paman yang melindungi Nabi Muhammad saw. dalam berdakwah adalah Abu ....", "Thalib")
    ],
    "ski-B-5": [
      P("L1", "Kota Madinah sebelumnya bernama ...", "Yatsrib", "Thaif", "Mekah", "Habasyah"),
      P("L1", "Peristiwa hijrah Nabi Muhammad saw. menjadi awal tahun ...", "Hijriah", "Masehi", "Saka", "Imlek"),
      I("L1", "Kaum yang berhijrah dari Mekah ke Madinah disebut kaum ....", "Muhajirin")
    ],
    "ski-B-6": [
      P("L1", "Kendaraan Nabi Muhammad saw. pada peristiwa Isra Mikraj adalah ...", "Buraq", "unta", "kuda biasa", "kapal"),
      P("L1", "Mikraj adalah perjalanan Nabi Muhammad saw. dari Masjidilaksa naik ke ...", "Sidratulmuntaha", "Madinah", "Mekah", "Taif"),
      I("L1", "Peristiwa Isra Mikraj terjadi sebelum Nabi Muhammad saw. berhijrah ke ....", "Madinah"),
      U("L2", "Jelaskan pelajaran penting dari peristiwa Isra Mikraj!", "Memuat: kewajiban salat lima waktu, pentingnya menjaga salat, keyakinan terhadap kekuasaan Allah. Skor penuh bila salat disebut disertai satu pelajaran lain.")
    ],
    "ski-C-1": [
      P("L1", "Setelah tiba di Madinah, Nabi mempersaudarakan kaum Muhajirin dan ...", "Ansar", "Quraisy", "Yahudi", "Habasyah"),
      P("L2", "Piagam Madinah dibuat untuk ...", "menjaga persatuan dan kerukunan warga", "memulai perang", "mengusir penduduk", "mengumpulkan pajak"),
      I("L1", "Di Madinah, Nabi Muhammad saw. menjadi pemimpin agama dan kepala ....", "negara")
    ],
    "ski-C-2": [
      P("L1", "Nabi Muhammad saw. wafat pada tahun ... Hijriah.", "11", "8", "9", "10"),
      P("L2", "Pidato Nabi pada Haji Wada' berisi pesan tentang ...", "persaudaraan dan persamaan derajat manusia", "perang", "perdagangan", "pajak"),
      I("L1", "Istri Nabi Muhammad saw. yang merawat beliau saat sakit sampai wafat adalah ....", "Aisyah"),
      U("L2", "Sebutkan dua pesan Nabi Muhammad saw. pada Haji Wada'!", "Contoh benar: menjaga persaudaraan dan tidak saling menumpahkan darah, menghormati hak orang lain, semua manusia sederajat kecuali takwanya, berpegang pada Al-Qur'an dan sunah. Skor sebanding jumlah pesan yang benar.")
    ],
    "ski-C-3": [
      P("L1", "Sahabat yang menemani Nabi Muhammad saw. bersembunyi di Gua Tsur ketika hijrah adalah ...", "Abu Bakar", "Umar", "Usman", "Ali"),
      P("L2", "Abu Bakar menyerahkan banyak hartanya untuk perjuangan Islam, ini menunjukkan sifat ...", "dermawan", "kikir", "sombong", "pemarah"),
      I("L1", "Khalifah pertama bernama lengkap Abu Bakar ....", "Ash-Shiddiq"),
      I("L1", "Abu Bakar menjadi khalifah setelah Nabi Muhammad saw. ....", "wafat")
    ],
    "ski-C-4": [
      P("L2", "Umar bin Khattab terkenal sebagai khalifah yang ...", "tegas dan adil", "pemalu", "pendiam", "penakut"),
      P("L1", "Umar bin Khattab menjadi khalifah setelah ...", "Abu Bakar", "Usman", "Ali", "Hamzah"),
      I("L2", "Khalifah Umar suka meronda pada malam hari untuk memeriksa keadaan ....", "rakyat"),
      U("L2", "Ceritakan satu teladan kepemimpinan Umar bin Khattab!", "Contoh benar: meronda malam untuk memeriksa rakyat, bersikap adil, hidup sederhana, tegas menegakkan aturan. Skor penuh bila satu teladan dijelaskan dengan benar.")
    ],
    "ski-C-5": [
      P("L1", "Usman bin Affan dijuluki ...", "Dzun Nurain", "Al-Faruq", "Ash-Shiddiq", "Saifullah"),
      P("L2", "Usman bin Affan membeli sumur Raumah lalu ...", "mewakafkannya untuk kaum muslimin", "menjualnya lagi", "memilikinya sendiri", "menutupnya"),
      I("L1", "Dzun Nurain artinya pemilik ... cahaya.", "dua"),
      U("L2", "Jelaskan jasa Khalifah Usman bin Affan terhadap Al-Qur'an!", "Memuat: membukukan Al-Qur'an dalam satu mushaf (Mushaf Usmani) dan memperbanyaknya agar bacaan seragam. Skor penuh bila kedua inti ada.")
    ],
    "ski-C-6": [
      P("L2", "Ali bin Abi Thalib terkenal sangat ... dalam ilmu.", "cerdas dan berilmu", "malas", "penakut", "pelit"),
      P("L2", "Pada malam hijrah, Ali tidur di tempat tidur Nabi untuk ...", "mengelabui kaum Quraisy", "mengambil harta", "bermain", "menjual rumah"),
      I("L1", "Putra Ali bin Abi Thalib dan Fatimah antara lain Hasan dan ....", "Husain"),
      I("L1", "Ali bin Abi Thalib adalah khalifah yang ke ... (urutan).", "empat")
    ],
    "ski-C-7": [
      P("L2", "Wali Sanga berdakwah dengan cara ...", "damai dan memanfaatkan budaya setempat", "perang", "paksaan", "ancaman"),
      P("L1", "Salah satu anggota Wali Sanga adalah ...", "Sunan Giri", "Sultan Agung", "Pangeran Diponegoro", "Gajah Mada"),
      I("L1", "Sunan Ampel berdakwah di daerah ....", "Surabaya")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
