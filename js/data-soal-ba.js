/* ============================================================
   SI MAMBA - js/data-soal-ba.js
   Bank soal DRAF Bahasa Arab MI Fase A-C. Melengkapi js/data-soal-mi.js yang belum memuat Bahasa Arab.
   KUNCI = kunci TP di js/data-tp-mi.js (mapel 'ba'): ba-A-1..10, ba-B-1..13, ba-C-1..10 (total 33 TP).
   JIKA urutan TP di data-tp-mi.js diubah, kunci di file ini harus ikut disesuaikan.
   Acuan: SK Dirjen Pendis No. 9941 Tahun 2025 (Bahasa Arab MI). SK hanya menyebut tema/topik, sehingga
   DAFTAR KOSAKATA dan POLA KALIMAT di sini adalah pilihan penyusun yang umum dipakai pada buku ajar madrasah.
   Guru wajib mencocokkannya dengan buku ajar/KMA madrasah, lalu mengganti atau menghapus yang tidak sesuai.
   Status: DRAF, belum diperiksa guru. Tanda baca (harakat) pada teks Arab sengaja minim; tambahkan sesuai buku ajar.
   Format sama dengan data-soal-mi.js:
     PG    : ['pg', level, soal, [jawaban BENAR, pengecoh1, pengecoh2, pengecoh3]]  (opsi diacak saat dipakai)
     Isian : ['is', level, soal, jawaban]
     Uraian: ['ur', level, soal, pedoman penskoran]
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const BARU = {
    // ===================== FASE A =====================
    // Perkenalan
    "ba-A-1": [
      P("L1", "Arti “اسمي” adalah ...", "namaku", "kelasku", "ayahku", "rumahku"),
      P("L1", "Jawaban yang tepat untuk pertanyaan “ما اسمك؟” adalah ...", "اسمي أحمد", "أنا بخير", "هذا كتاب", "مع السلامة"),
      P("L1", "Salam pembuka ketika bertemu dan berkenalan adalah ...", "السلام عليكم", "مع السلامة", "شكرا", "عفوا"),
      P("L1", "Arti “مع السلامة” adalah ...", "selamat tinggal", "selamat pagi", "terima kasih", "sama-sama"),
      I("L1", "Arti “أنا” adalah ....", "saya (aku)")
    ],
    // Keluargaku
    "ba-A-2": [
      P("L1", "Arti “أب” adalah ...", "ayah", "ibu", "kakek", "nenek"),
      P("L1", "Bahasa Arab “ibu” adalah ...", "أم", "أب", "أخت", "جدة"),
      P("L1", "Bahasa Arab “nenek” adalah ...", "جدة", "جد", "أخت", "أم"),
      P("L1", "Arti “أخ” adalah ...", "saudara laki-laki", "saudara perempuan", "ayah", "ibu"),
      I("L1", "Arti “أخت” adalah ....", "saudara perempuan")
    ],
    // Rumahku
    "ba-A-3": [
      P("L1", "Arti “بيت” adalah ...", "rumah", "sekolah", "masjid", "pasar"),
      P("L1", "Tempat memasak di rumah disebut ...", "المطبخ", "الحمام", "غرفة النوم", "الحديقة"),
      P("L1", "Arti “غرفة النوم” adalah ...", "kamar tidur", "dapur", "kamar mandi", "taman"),
      P("L1", "Bahasa Arab “taman” adalah ...", "الحديقة", "المطبخ", "الحمام", "غرفة النوم"),
      I("L1", "Arti “الحمام” adalah ....", "kamar mandi")
    ],
    // Madrasahku
    "ba-A-4": [
      P("L1", "Arti “مدرسة” adalah ...", "madrasah (sekolah)", "rumah", "kantor", "pasar"),
      P("L1", "Bahasa Arab “papan tulis” adalah ...", "سبورة", "كرسي", "مكتب", "كتاب"),
      P("L1", "Arti “قلم” adalah ...", "pena (pulpen)", "buku", "meja", "kursi"),
      P("L1", "Bahasa Arab “guru (laki-laki)” adalah ...", "معلم", "معلمة", "طالب", "طالبة"),
      I("L1", "Arti “كتاب” adalah ....", "buku")
    ],
    // Hobiku
    "ba-A-5": [
      P("L1", "Arti “هوايتي” adalah ...", "hobiku (kegemaranku)", "namaku", "kelasku", "rumahku"),
      P("L1", "Arti “القراءة” adalah ...", "membaca", "menulis", "berenang", "menggambar"),
      P("L1", "Bahasa Arab “berenang” adalah ...", "السباحة", "القراءة", "الكتابة", "الرسم"),
      P("L1", "Bahasa Arab “menggambar” adalah ...", "الرسم", "السباحة", "القراءة", "الكتابة"),
      I("L1", "Arti “الكتابة” adalah ....", "menulis")
    ],
    // Nama-nama buah
    "ba-A-6": [
      P("L1", "Arti “تفاح” adalah ...", "apel", "pisang", "jeruk", "anggur"),
      P("L1", "Bahasa Arab “pisang” adalah ...", "موز", "تفاح", "عنب", "برتقال"),
      P("L1", "Bahasa Arab “jeruk” adalah ...", "برتقال", "موز", "تفاح", "عنب"),
      P("L1", "Arti “بطيخ” adalah ...", "semangka", "mangga", "apel", "pisang"),
      I("L1", "Arti “عنب” adalah ....", "anggur")
    ],
    // Warna-warna
    "ba-A-7": [
      P("L1", "Arti “أحمر” adalah ...", "merah", "biru", "hijau", "kuning"),
      P("L1", "Bahasa Arab “hijau” adalah ...", "أخضر", "أحمر", "أزرق", "أصفر"),
      P("L1", "Bahasa Arab “kuning” adalah ...", "أصفر", "أخضر", "أبيض", "أسود"),
      P("L1", "Lawan warna “أبيض” adalah ...", "أسود", "أحمر", "أزرق", "أخضر"),
      I("L1", "Arti “أزرق” adalah ....", "biru")
    ],
    // Alat transportasi
    "ba-A-8": [
      P("L1", "Arti “سيارة” adalah ...", "mobil", "sepeda", "pesawat", "kapal"),
      P("L1", "Bahasa Arab “kapal” adalah ...", "سفينة", "طائرة", "قطار", "سيارة"),
      P("L1", "Bahasa Arab “pesawat” adalah ...", "طائرة", "سفينة", "دراجة", "قطار"),
      P("L1", "Alat transportasi yang berjalan di atas rel adalah ...", "قطار", "سفينة", "طائرة", "دراجة"),
      I("L1", "Arti “دراجة” adalah ....", "sepeda")
    ],
    // Pemandangan alam
    "ba-A-9": [
      P("L1", "Arti “جبل” adalah ...", "gunung", "laut", "sungai", "pohon"),
      P("L1", "Bahasa Arab “laut” adalah ...", "بحر", "جبل", "نهر", "شجرة"),
      P("L1", "Bahasa Arab “matahari” adalah ...", "شمس", "قمر", "سماء", "نهر"),
      P("L1", "Bahasa Arab “sungai” adalah ...", "نهر", "بحر", "جبل", "شمس"),
      I("L1", "Arti “سماء” adalah ....", "langit")
    ],
    // Keterampilan berbahasa
    "ba-A-10": [
      P("L1", "Keterampilan bahasa yang memakai telinga adalah ...", "menyimak", "berbicara", "membaca", "menulis"),
      P("L1", "Bahasa Arab “menulis” adalah ...", "الكتابة", "القراءة", "الكلام", "الاستماع"),
      P("L1", "Arti “الكلام” adalah ...", "berbicara", "menyimak", "membaca", "menulis"),
      I("L1", "Arti “الاستماع” adalah ....", "menyimak"),
      U("L2", "Perkenalkan dirimu dalam bahasa Arab sederhana (nama dan kelas)! Boleh ditulis dengan lafal latin.", "Jawaban memuat nama dan kelas, mis. “اسمي ... أنا في الصف ...”. Skor 50 untuk nama, 50 untuk kelas; kesalahan kecil lafal tidak mengurangi skor.")
    ],

    // ===================== FASE B =====================
    // Materi pelajaran
    "ba-B-1": [
      P("L1", "Arti “الرياضيات” adalah ...", "matematika", "bahasa Arab", "olahraga", "ilmu pengetahuan alam"),
      P("L1", "Arti “اللغة العربية” adalah ...", "bahasa Arab", "bahasa Inggris", "bahasa Indonesia", "matematika"),
      P("L1", "Bahasa Arab “ilmu pengetahuan alam (sains)” adalah ...", "العلوم", "الرياضيات", "اللغة العربية", "الرسم"),
      P("L2", "Arti kalimat “ما درسك اليوم؟” adalah ...", "Apa pelajaranmu hari ini?", "Siapa namamu?", "Di mana rumahmu?", "Jam berapa sekarang?"),
      I("L1", "Arti “اليوم” adalah ....", "hari ini")
    ],
    // Nama-nama binatang
    "ba-B-2": [
      P("L1", "Arti “أسد” adalah ...", "singa", "gajah", "kuda", "unta"),
      P("L1", "Bahasa Arab “gajah” adalah ...", "فيل", "أسد", "حصان", "جمل"),
      P("L1", "Bahasa Arab “ikan” adalah ...", "سمكة", "عصفور", "بقرة", "دجاجة"),
      P("L2", "Arti kalimat “هذا حصان” adalah ...", "Ini kuda", "Itu kuda", "Ini sapi", "Ini unta"),
      I("L1", "Arti “عصفور” adalah ....", "burung")
    ],
    // Penyakit
    "ba-B-3": [
      P("L1", "Arti “صداع” adalah ...", "sakit kepala", "sakit gigi", "demam", "batuk"),
      P("L1", "Bahasa Arab “demam” adalah ...", "حمى", "صداع", "سعال", "زكام"),
      P("L1", "Arti “طبيب” adalah ...", "dokter", "guru", "pilot", "polisi"),
      P("L2", "Arti kalimat “أنا مريض” adalah ...", "Saya sakit", "Saya sehat", "Saya lapar", "Saya haus"),
      I("L1", "Arti “دواء” adalah ....", "obat")
    ],
    // Olahraga
    "ba-B-4": [
      P("L1", "Arti “كرة القدم” adalah ...", "sepak bola", "bola basket", "bola voli", "renang"),
      P("L1", "Bahasa Arab “renang” adalah ...", "السباحة", "الجري", "كرة القدم", "كرة السلة"),
      P("L1", "Bahasa Arab “lari” adalah ...", "الجري", "السباحة", "كرة الطائرة", "كرة القدم"),
      P("L2", "Arti kalimat “أحب كرة القدم” adalah ...", "Saya suka sepak bola", "Saya bermain voli", "Saya benci sepak bola", "Saya menonton renang"),
      I("L1", "Arti “الرياضة” adalah ....", "olahraga")
    ],
    // Teman-temanku
    "ba-B-5": [
      P("L1", "Arti “صديقي” adalah ...", "temanku", "ayahku", "bukuku", "rumahku"),
      P("L1", "Bahasa Arab “temanku (perempuan)” adalah ...", "صديقتي", "صديقي", "أختي", "أمي"),
      P("L2", "Arti kalimat “هذا صديقي” adalah ...", "Ini temanku", "Ini bukuku", "Ini rumahku", "Ini gurunya"),
      P("L1", "Arti “يلعب” adalah ...", "bermain", "belajar", "makan", "tidur"),
      I("L1", "Arti “زميل” adalah ....", "teman sekelas")
    ],
    // Taman
    "ba-B-6": [
      P("L1", "Arti “الحديقة” adalah ...", "taman", "kantin", "kelas", "perpustakaan"),
      P("L1", "Bahasa Arab “bunga” adalah ...", "زهرة", "شجرة", "عشب", "فراشة"),
      P("L1", "Bahasa Arab “pohon” adalah ...", "شجرة", "زهرة", "فراشة", "مقعد"),
      P("L2", "Arti kalimat “في الحديقة أزهار” adalah ...", "Di taman ada bunga-bunga", "Di taman ada pohon besar", "Di rumah ada bunga", "Di kantin ada bunga"),
      I("L1", "Arti “فراشة” adalah ....", "kupu-kupu")
    ],
    // Alamat
    "ba-B-7": [
      P("L1", "Arti “ما عنوانك؟” adalah ...", "Apa alamatmu?", "Siapa namamu?", "Berapa umurmu?", "Kamu kelas berapa?"),
      P("L1", "Arti “أين تسكن؟” adalah ...", "Di mana kamu tinggal?", "Kamu dari mana?", "Kamu mau ke mana?", "Kamu sedang apa?"),
      P("L1", "Arti “شارع” adalah ...", "jalan", "kota", "desa", "rumah"),
      P("L2", "Jawaban yang tepat untuk “أين تسكن؟” adalah ...", "أسكن في القرية", "اسمي سعيد", "أنا طالب", "هذا كتاب"),
      I("L1", "Arti “مدينة” adalah ....", "kota")
    ],
    // Profesi
    "ba-B-8": [
      P("L1", "Arti “فلاح” adalah ...", "petani", "pedagang", "guru", "sopir"),
      P("L1", "Bahasa Arab “polisi” adalah ...", "شرطي", "طيار", "تاجر", "سائق"),
      P("L1", "Bahasa Arab “pilot” adalah ...", "طيار", "شرطي", "فلاح", "معلم"),
      P("L2", "Arti kalimat “أبي تاجر” adalah ...", "Ayahku pedagang", "Ayahku guru", "Ibuku dokter", "Kakakku petani"),
      I("L1", "Arti “سائق” adalah ....", "sopir")
    ],
    // Cita-citaku
    "ba-B-9": [
      P("L2", "Arti kalimat “أريد أن أكون معلما” adalah ...", "Saya ingin menjadi guru", "Saya ingin bertemu guru", "Saya sudah menjadi guru", "Saya tidak mau menjadi guru"),
      P("L1", "Arti “أريد” adalah ...", "saya ingin", "saya pergi", "saya makan", "saya membaca"),
      P("L2", "Kalimat “Saya ingin menjadi dokter” dalam bahasa Arab adalah ...", "أريد أن أكون طبيبا", "أريد أن أكون معلما", "أريد أن أكون طيارا", "أريد أن أكون شرطيا"),
      P("L1", "Arti “مستقبل” adalah ...", "masa depan", "masa lalu", "hari ini", "kemarin"),
      I("L1", "Kalimat “Saya ingin menjadi guru” dalam bahasa Arab: أريد أن أكون ....", "معلما")
    ],
    // Di rumah
    "ba-B-10": [
      P("L1", "Arti “نافذة” adalah ...", "jendela", "pintu", "lampu", "kursi"),
      P("L1", "Bahasa Arab “pintu” adalah ...", "باب", "نافذة", "سرير", "طاولة"),
      P("L1", "Bahasa Arab “tempat tidur” adalah ...", "سرير", "باب", "كرسي", "مصباح"),
      P("L2", "Arti kalimat “الكتاب على الطاولة” adalah ...", "Buku itu di atas meja", "Buku itu di bawah meja", "Buku itu di dalam tas", "Buku itu di samping kursi"),
      I("L1", "Arti “ثلاجة” adalah ....", "kulkas (lemari es)")
    ],
    // Anggota keluarga
    "ba-B-11": [
      P("L1", "Arti “العم” adalah ...", "paman (saudara ayah)", "bibi (saudara ayah)", "kakek", "ayah"),
      P("L1", "Arti “الخالة” adalah ...", "bibi (saudara ibu)", "bibi (saudara ayah)", "nenek", "ibu"),
      P("L1", "Bahasa Arab “kakek” adalah ...", "الجد", "الجدة", "العم", "الخال"),
      P("L2", "Arti kalimat “هذه جدتي” adalah ...", "Ini nenekku", "Ini kakekku", "Ini ibuku", "Ini bibiku"),
      I("L1", "Arti “الخال” adalah ....", "paman (saudara laki-laki ibu)")
    ],
    // Cinta Indonesia
    "ba-B-12": [
      P("L1", "Arti “وطن” adalah ...", "tanah air", "bendera", "pulau", "kota"),
      P("L1", "Bahasa Arab “pulau” adalah ...", "جزيرة", "وطن", "شعب", "عاصمة"),
      P("L2", "Arti kalimat “أحب وطني إندونيسيا” adalah ...", "Saya cinta tanah airku Indonesia", "Saya tinggal di Indonesia", "Saya berasal dari kota ini", "Saya ingin pergi ke luar negeri"),
      P("L1", "Arti “عاصمة” adalah ...", "ibu kota", "pulau", "desa", "pantai"),
      I("L1", "Arti “شعب” adalah ....", "rakyat (bangsa)")
    ],
    // Keterampilan berbahasa
    "ba-B-13": [
      P("L1", "Bahasa Arab “menyimak” adalah ...", "الاستماع", "القراءة", "الكتابة", "الكلام"),
      P("L1", "Keterampilan bahasa yang paling berkaitan dengan mulut adalah ...", "berbicara", "menyimak", "membaca", "memirsa"),
      P("L2", "Menonton video berbahasa Arab termasuk keterampilan ...", "memirsa", "menulis", "berbicara", "membaca"),
      I("L1", "Arti “المشاهدة” adalah ....", "memirsa (menonton)"),
      U("L2", "Tulislah dua kalimat sederhana tentang keluargamu dalam bahasa Arab! Boleh ditulis dengan lafal latin.", "Dua kalimat tentang keluarga memakai kosakata yang dipelajari, mis. “هذا أبي” dan “هذه أمي”. Skor 50 per kalimat yang benar dan sesuai topik; kesalahan kecil penulisan tidak mengurangi skor.")
    ],

    // ===================== FASE C =====================
    // Anggota tubuh
    "ba-C-1": [
      P("L1", "Arti “عين” adalah ...", "mata", "telinga", "hidung", "mulut"),
      P("L1", "Bahasa Arab “telinga” adalah ...", "أذن", "عين", "أنف", "فم"),
      P("L1", "Bahasa Arab “tangan” adalah ...", "يد", "رأس", "فم", "أنف"),
      P("L2", "Arti kalimat “أسمع بالأذن” adalah ...", "Saya mendengar dengan telinga", "Saya melihat dengan mata", "Saya berbicara dengan mulut", "Saya mencium dengan hidung"),
      I("L1", "Arti “فم” adalah ....", "mulut"),
      U("L2", "Tuliskan lima nama anggota tubuh dalam bahasa Arab beserta artinya!", "Lima pasangan benar, mis. رأس (kepala), عين (mata), أذن (telinga), أنف (hidung), يد (tangan). Skor 20 per pasangan yang benar.")
    ],
    // Kebun binatang
    "ba-C-2": [
      P("L1", "Arti “حديقة الحيوان” adalah ...", "kebun binatang", "taman bunga", "kebun buah", "kolam ikan"),
      P("L1", "Arti “زرافة” adalah ...", "jerapah", "gajah", "monyet", "harimau"),
      P("L1", "Bahasa Arab “monyet” adalah ...", "قرد", "زرافة", "ثعبان", "أسد"),
      P("L2", "Bacaan: “في حديقة الحيوان فيل كبير.” Hewan yang disebut dalam bacaan adalah ...", "gajah", "singa", "kuda", "unta"),
      I("L1", "Arti “ثعبان” adalah ....", "ular")
    ],
    // Di ruang tamu dan ruang belajar
    "ba-C-3": [
      P("L1", "Arti “غرفة الضيوف” adalah ...", "ruang tamu", "ruang belajar", "kamar tidur", "dapur"),
      P("L1", "Arti “غرفة المذاكرة” adalah ...", "ruang belajar", "ruang tamu", "kamar mandi", "ruang makan"),
      P("L1", "Bahasa Arab “sofa” adalah ...", "أريكة", "خزانة", "مكتب", "مصباح"),
      P("L2", "Arti kalimat “في غرفة الضيوف أريكة” adalah ...", "Di ruang tamu ada sofa", "Di ruang belajar ada sofa", "Di kamar tidur ada lemari", "Di dapur ada meja"),
      I("L1", "Arti “خزانة” adalah ....", "lemari")
    ],
    // Di perpustakaan
    "ba-C-4": [
      P("L1", "Arti “المكتبة” adalah ...", "perpustakaan", "kantin", "kelas", "masjid"),
      P("L1", "Arti “قاموس” adalah ...", "kamus", "majalah", "cerita", "buku tulis"),
      P("L1", "Arti “يستعير” adalah ...", "meminjam", "mengembalikan", "membeli", "menjual"),
      P("L2", "Arti kalimat “أقرأ قصة في المكتبة” adalah ...", "Saya membaca cerita di perpustakaan", "Saya menulis cerita di kelas", "Saya membeli majalah di kantin", "Saya meminjam kamus di rumah"),
      I("L1", "Arti “مجلة” adalah ....", "majalah")
    ],
    // Di kantin
    "ba-C-5": [
      P("L1", "Arti “المقصف” adalah ...", "kantin", "perpustakaan", "lapangan", "kelas"),
      P("L1", "Arti “عصير” adalah ...", "jus", "susu", "air putih", "teh"),
      P("L1", "Bahasa Arab “nasi” adalah ...", "أرز", "خبز", "ماء", "لبن"),
      P("L2", "Arti kalimat “بكم هذا الخبز؟” adalah ...", "Berapa harga roti ini?", "Siapa yang membeli roti ini?", "Di mana roti ini?", "Apakah roti ini enak?"),
      I("L1", "Arti “ماء” adalah ....", "air")
    ],
    // Jam
    "ba-C-6": [
      P("L1", "Arti kalimat “ما الساعة الآن؟” adalah ...", "Jam berapa sekarang?", "Hari apa sekarang?", "Di mana kamu sekarang?", "Apa pelajaran sekarang?"),
      P("L1", "Arti “الساعة الثامنة” adalah ...", "jam delapan", "jam tujuh", "jam sembilan", "jam sepuluh"),
      P("L2", "Arti “الساعة السابعة والنصف” adalah ...", "pukul 07.30", "pukul 07.15", "pukul 06.45", "pukul 07.00"),
      P("L2", "Arti “الساعة الثالثة إلا ربعا” adalah ...", "pukul 02.45", "pukul 03.15", "pukul 03.45", "pukul 02.15"),
      I("L1", "Arti “دقيقة” adalah ....", "menit")
    ],
    // Saya suka bahasa Arab
    "ba-C-7": [
      P("L1", "Arti kalimat “أحب اللغة العربية” adalah ...", "Saya suka bahasa Arab", "Saya belajar bahasa Inggris", "Saya mengajar bahasa Arab", "Saya benci bahasa Arab"),
      P("L1", "Arti “جميلة” adalah ...", "indah", "sulit", "mudah", "panjang"),
      P("L1", "Arti “لأن” adalah ...", "karena", "tetapi", "dan", "atau"),
      P("L2", "Arti kalimat “اللغة العربية لغة القرآن” adalah ...", "Bahasa Arab adalah bahasa Al-Qur'an", "Bahasa Arab adalah bahasa daerah", "Al-Qur'an memakai bahasa Inggris", "Bahasa Arab adalah bahasa Nusantara"),
      I("L1", "Arti “سهلة” adalah ....", "mudah"),
      U("L2", "Tuliskan dua alasan mengapa kamu suka belajar bahasa Arab! Boleh memakai bahasa Indonesia.", "Dua alasan yang masuk akal, mis. bahasa Al-Qur'an, membantu memahami doa dan bacaan salat, atau menambah kosakata baru. Skor 50 per alasan yang jelas.")
    ],
    // Kegiatan liburan
    "ba-C-8": [
      P("L1", "Arti “عطلة” adalah ...", "liburan", "ujian", "pelajaran", "upacara"),
      P("L1", "Arti “أزور” adalah ...", "saya mengunjungi", "saya membaca", "saya menulis", "saya membeli"),
      P("L2", "Arti kalimat “في العطلة أزور جدتي” adalah ...", "Pada liburan saya mengunjungi nenekku", "Pada liburan saya mengunjungi kakekku", "Saya menulis surat untuk nenek", "Saya membantu ibu di rumah"),
      P("L1", "Arti “أسافر” adalah ...", "saya bepergian", "saya pulang", "saya tidur", "saya bermain"),
      I("L1", "Arti “أذهب” adalah ....", "saya pergi")
    ],
    // Piknik
    "ba-C-9": [
      P("L1", "Arti “رحلة” adalah ...", "perjalanan (piknik)", "pasar", "ruangan", "ujian"),
      P("L1", "Arti “شاطئ” adalah ...", "pantai", "gunung", "sungai", "hutan"),
      P("L2", "Arti kalimat “نذهب إلى الشاطئ” adalah ...", "Kami pergi ke pantai", "Saya pergi ke pantai", "Kami pulang dari pantai", "Mereka berenang di pantai"),
      P("L1", "Arti “نأكل” adalah ...", "kami makan", "kami minum", "kami bermain", "kami tidur"),
      I("L1", "Arti “خيمة” adalah ....", "tenda")
    ],
    // Keterampilan berbahasa
    "ba-C-10": [
      P("L1", "Mempresentasikan berarti ...", "menyampaikan hasil di depan orang lain", "menyalin tulisan", "hanya mendengarkan", "hanya menggambar"),
      P("L1", "Keterampilan “الكلام” melatih kita untuk ...", "berbicara", "menyimak", "membaca", "menulis"),
      P("L1", "Bahasa Arab “membaca” adalah ...", "القراءة", "الكتابة", "الاستماع", "التحدث"),
      I("L1", "Arti “التحدث” adalah ....", "berbicara"),
      U("L3", "Tulislah tiga kalimat sederhana tentang kegiatan liburanmu dalam bahasa Arab (boleh dengan lafal latin), lalu bacakan di depan kelas!", "Tiga kalimat memakai kosakata liburan, mis. “أسافر إلى القرية”, “أزور جدتي”, “نذهب إلى الشاطئ”. Skor 25 per kalimat benar dan sesuai topik; 25 untuk kelancaran saat membacakan.")
    ]
  };

  // Gabungkan ke bank utama; soal yang bunyinya sama tidak diulang.
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(BARU).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(BARU[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
