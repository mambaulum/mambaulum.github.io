/* ============================================================
   SI MAMBA - js/data-soal-lanjutan-umum.js
   (dulu bernama data-soal-uraian-pjok-ipas-pp-tambahan.js; kini memuat lebih dari uraian, jadi diganti namanya)
   LANJUTAN bank soal untuk mapel umum: Matematika, IPAS, PJOK, Pancasila, B. Indonesia, B. Inggris, Seni Budaya (PG, isian, uraian, soal bergambar):
   melengkapi tiap TP sampai minimal 6 PG, 4 isian, dan 2 uraian. Blok-blok di bawah dipisah per tujuan dan memakai pola gabung yang sama.
   Penanda [[g:jenis;param]] pada teks soal atau pilihan jawaban diubah menjadi gambar SVG oleh js/perangkat-soal.js.
   Rincian lama di bawah ini tetap berlaku untuk blok pertama:
   TAMBAHAN bank soal DRAF: +1 Uraian untuk 13 TP mapel umum yang di bank gabungan baru punya 1 uraian, supaya dua kelas
   dalam satu fase tidak mendapat uraian yang sama persis (perangkat-soal.js membagi urutan soal ganjil/genap antar kelas).
   Cakupan: PJOK (pjok-A-6, B-6, B-7, C-6, C-7, C-8), IPAS (ipas-B-6, B-9, B-10, B-11, B-12, C-10),
            Pendidikan Pancasila (pp-C-7).
   Soal lama tidak diubah; soal yang bunyinya sama tidak diulang. Isi soal memakai fakta yang sudah ada di bank
   untuk TP yang sama, disusun dalam bentuk pertanyaan yang berbeda dari uraian lama.
   Status DRAF: guru wajib memeriksa soal dan kunci jawaban.
   WAJIB dimuat SESUDAH js/data-soal-semua.js (dan sebelum perangkat-*.js).
============================================================ */
(function () {
  'use strict';
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    /* ---------- Pendidikan Pancasila ---------- */
    "pp-C-7": [
      U("L2", "Jelaskan arti bela negara dan nasionalisme, serta sebutkan satu contoh bela negara di lingkungan tempat tinggalmu!", "Bela negara: sikap dan tindakan untuk membela serta menjaga negara. Nasionalisme: semangat cinta tanah air. Contoh: menjaga kerukunan di lingkungan sekitar, menaati aturan, ikut kerja bakti. Skor sebanding jumlah jawaban yang benar.")
    ],
    /* ---------- PJOK ---------- */
    "pjok-A-6": [
      U("L2", "Apa yang harus kamu lakukan jika diajak pergi oleh orang asing? Jelaskan juga mengapa bermain di dekat jalan raya berbahaya!", "Menolak dan memberi tahu orang dewasa tepercaya (orang tua atau guru). Bermain di dekat jalan raya berbahaya karena dapat tertabrak kendaraan. Skor separuh untuk masing-masing.")
    ],
    "pjok-B-6": [
      U("L2", "Sebutkan komponen makanan bergizi seimbang, serta tuliskan manfaat olahraga teratur dan manfaat minum air putih yang cukup!", "Makanan bergizi seimbang: nasi (makanan pokok), lauk, sayur, dan buah. Olahraga teratur membuat tubuh bugar. Minum air putih yang cukup mencegah tubuh kekurangan cairan. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-B-7": [
      U("L2", "Tuliskan kepanjangan P3K dan sebutkan tiga isi kotak P3K sekolah!", "Pertolongan Pertama pada Kecelakaan. Isi kotak P3K, contoh: plester, kasa, antiseptik, perban, obat merah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-C-6": [
      U("L2", "Apa yang dimaksud perilaku sedenter? Sebutkan satu risikonya bagi kesehatan dan satu cara mencegahnya!", "Perilaku sedenter: duduk atau berbaring terlalu lama tanpa banyak bergerak (misalnya terlalu lama bermain gawai). Risiko: kegemukan (obesitas). Pencegahan: olahraga teratur dan makan bergizi.")
    ],
    "pjok-C-7": [
      U("L2", "Tuliskan fungsi karbohidrat dan protein beserta satu contoh makanan sumbernya, serta makanan yang banyak mengandung vitamin dan mineral!", "Karbohidrat: sumber tenaga utama, contoh nasi. Protein: membangun dan memperbaiki jaringan tubuh, contoh ikan, telur, atau tempe. Vitamin dan mineral banyak terdapat pada sayur dan buah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-C-8": [
      U("L2", "Jelaskan langkah pertolongan pertama pada dugaan patah tulang lengan dan sebutkan alat yang dipakai untuk menyangga anggota tubuh yang diduga patah!", "Menjaga lengan tidak bergerak, menyangga sementara dengan bidai, lalu segera mencari bantuan medis. Alat penyangga: bidai.")
    ],
    /* ---------- IPAS ---------- */
    "ipas-B-6": [
      U("L2", "Sebutkan satu contoh sumber daya alam yang dapat diperbarui dan satu yang tidak dapat diperbarui, serta satu cara mencegah banjir!", "Dapat diperbarui: tumbuhan (hewan, air). Tidak dapat diperbarui: minyak bumi (batu bara, gas alam). Mencegah banjir: tidak membuang sampah ke sungai. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-9": [
      U("L2", "Mengapa kita harus menghormati budaya daerah lain? Tuliskan juga satu cara melestarikan budaya daerah!", "Indonesia memiliki banyak suku bangsa, bahasa, dan budaya daerah yang berbeda sehingga kita mau mengenal dan menghormatinya. Melestarikan: mempelajari tarian daerah, memakai pakaian adat, menggunakan bahasa daerah.")
    ],
    "ipas-B-10": [
      U("L2", "Sebutkan dua contoh sumber sejarah di kampung dan jelaskan siapa sesepuh serta mengapa ia membantu menelusuri sejarah kampung!", "Sumber sejarah: prasasti, bangunan tua, foto lama. Sesepuh adalah orang yang dituakan dan mengetahui cerita masa lalu kampung, sehingga dapat bercerita tentang asal-usul dan peristiwa penting kampung. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-11": [
      U("L2", "Sebutkan fungsi utama uang serta manfaat menabung dan manfaat mencatat uang masuk dan keluar!", "Fungsi uang: alat tukar. Menabung: memenuhi kebutuhan di masa depan. Mencatat uang masuk dan keluar: mengetahui ke mana uang digunakan. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-12": [
      U("L2", "Urutkan langkah penyelidikan sederhana mulai dari mengamati sampai menarik kesimpulan, dan jelaskan manfaat mencatat hasil dalam tabel!", "Urutan: mengamati, membuat pertanyaan dan prediksi, melakukan percobaan dan mengumpulkan data, mencatat hasil, mengolah data lalu menarik kesimpulan. Tabel memudahkan membandingkan hasil pengamatan. Skor sebanding kelengkapan langkah.")
    ],
    "ipas-C-10": [
      U("L2", "Tabel: hari ke-1 tinggi tanaman 2 cm, hari ke-3 4 cm, hari ke-5 6 cm. Tuliskan kesimpulannya, jenis grafik yang cocok, dan alasan variabel lain harus dijaga tetap sama!", "Kesimpulan: tinggi tanaman bertambah seiring waktu (2 cm setiap 2 hari). Grafik yang cocok: grafik garis. Variabel lain dijaga tetap sama agar percobaan adil, sehingga perubahan hanya disebabkan variabel bebas. Skor sebanding jumlah jawaban yang benar.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN Seni Budaya (+2 isian per TP, +1 uraian untuk TP yang uraiannya baru 1) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "seni-A-1": [
      I("L1", "Garis yang lurus dari kiri ke kanan disebut garis ....", "mendatar"),
      I("L1", "Garis yang naik turun bersudut seperti gigi gergaji disebut garis ....", "zigzag")
    ],
    "seni-A-2": [
      I("L1", "Setelah melihat gambar teman yang bagus, kita boleh memberinya ....", "pujian"),
      I("L1", "Kita boleh memberi pendapat pada gambar teman, tetapi tidak boleh ... karyanya.", "mengejek (menghina)"),
      U("L2", "Sebutkan dua cara menghargai karya teman!", "Contoh benar: memberi pujian; tidak mencoret atau merusak; tidak mengejek; menanyakan cara membuatnya. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-A-3": [
      I("L1", "Karya yang dibuat dari tempelan potongan kertas disebut ....", "kolase"),
      I("L1", "Bahan untuk merekatkan potongan kertas pada kolase adalah ....", "lem"),
      U("L2", "Jelaskan dua langkah membuat kolase sederhana dari kertas bekas!", "Contoh benar: menggunting kertas bekas; menyusun potongan di kertas dasar; menempel dengan lem; merapikan hasilnya. Skor sebanding jumlah langkah yang benar.")
    ],
    "seni-A-4": [
      I("L1", "Indra yang kita pakai untuk melihat benda yang akan digambar adalah indra ....", "penglihatan (mata)"),
      I("L1", "Alat untuk membuat gambar awal (sketsa) sebelum diwarnai adalah ....", "pensil"),
      U("L2", "Sebutkan dua hal yang kamu perhatikan saat mengamati sebuah buah sebelum menggambarnya!", "Contoh benar: bentuk; warna; ukuran; bagian-bagian buah (tangkai, daun). Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-A-5": [
      I("L1", "Warna biru tua dan abu-abu sering menggambarkan perasaan ....", "sedih"),
      I("L1", "Agar gambar rapi, mewarnai sebaiknya tidak keluar dari ... gambar.", "garis"),
      U("L2", "Jelaskan mengapa gambar yang menunjukkan rasa sedih biasanya memakai warna yang berbeda dari gambar yang menunjukkan rasa gembira!", "Warna sedih cenderung gelap atau redup, warna gembira cenderung cerah, sehingga perasaan lebih mudah dikenali. Skor separuh untuk masing-masing.")
    ],
    "seni-A-6": [
      I("L1", "Bunyi yang kuat dan nyaring disebut bunyi ....", "keras"),
      I("L1", "Syair lagu anak biasanya sederhana dan mudah ....", "dinyanyikan (dihafal)")
    ],
    "seni-A-7": [
      I("L1", "Kata 'suaramu bagus sekali' yang diucapkan kepada teman setelah bernyanyi adalah ....", "pujian"),
      I("L1", "Saat teman bernyanyi di depan kelas, kita harus ... dengan tenang.", "mendengarkan (menyimak)"),
      U("L2", "Jelaskan mengapa kita tidak boleh menertawakan teman yang salah saat bernyanyi!", "Karena akan menyakiti perasaan teman; sebaiknya kita memberi semangat dan saran yang baik. Skor sebanding jumlah alasan yang benar.")
    ],
    "seni-A-8": [
      I("L1", "Nada do, re, mi, fa, sol, la, si disusun berurutan dalam tangga ....", "nada"),
      I("L1", "Pola irama dapat ditirukan dengan tepukan ....", "tangan"),
      U("L2", "Jelaskan mengapa kita harus mendengarkan dengan teliti sebelum menirukan pola irama!", "Agar pola yang ditirukan sama dengan pola yang dibunyikan (tepat); jika kurang teliti, ketukan dapat salah.")
    ],
    "seni-A-9": [
      I("L1", "Alat musik yang digoyang dan berbunyi 'crek-crek' adalah ....", "marakas"),
      I("L1", "Irama dari tepukan paha dan dada dibuat dari anggota ....", "tubuh"),
      U("L2", "Sebutkan tiga anggota tubuh yang dapat membuat bunyi irama dan cara membunyikannya!", "Contoh benar: tangan ditepukkan; kaki dientakkan; jari dijentikkan; mulut bersiul. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-A-10": [
      I("L1", "Orang yang bernyanyi disebut ....", "penyanyi"),
      I("L1", "Alat musik tiup dari bambu yang berlubang-lubang adalah ....", "seruling"),
      U("L2", "Ceritakan satu lagu yang ingin kamu nyanyikan di depan kelas dan perasaanmu saat menyanyikannya!", "Jawaban sesuai pengalaman siswa dengan menyebut satu lagu dan satu perasaan. Skor separuh untuk masing-masing.")
    ],
    "seni-A-11": [
      I("L1", "Orang yang menari disebut ....", "penari"),
      I("L1", "Penari yang bergerak sesuai ketukan musik sedang menari mengikuti ....", "irama")
    ],
    "seni-A-12": [
      I("L1", "Gerak tari yang berpindah tempat ke depan, belakang, atau samping termasuk unsur ....", "ruang"),
      I("L1", "Cepat dan lambatnya gerak mengikuti irama termasuk unsur ....", "waktu"),
      U("L2", "Jelaskan perbedaan gerak bertenaga kuat dan gerak bertenaga lemah dengan satu contoh masing-masing!", "Gerak kuat: misalnya menghentak kaki atau mengepalkan tangan. Gerak lemah: misalnya melambaikan tangan pelan. Skor separuh untuk masing-masing.")
    ],
    "seni-A-13": [
      I("L1", "Sebelum menari, kita memakai pakaian yang ... agar mudah bergerak.", "nyaman"),
      I("L1", "Saat menari bersama teman, kita tidak boleh ... teman.", "mendorong"),
      U("L2", "Jelaskan satu alasan kita harus menjaga jarak saat menari bersama dan satu alasan kita harus berterima kasih setelah tampil!", "Menjaga jarak agar tidak bertabrakan atau saling melukai; berterima kasih adalah sikap sopan dan menghargai penonton dan teman. Skor separuh untuk masing-masing.")
    ],
    "seni-A-14": [
      I("L1", "Gerak melangkah, menepuk, lalu berputar yang disusun berurutan disebut ... gerak.", "rangkaian"),
      I("L1", "Gerak pertama dalam sebuah rangkaian disebut gerak ....", "awal (pembuka)"),
      U("L2", "Sebutkan dua gerak sederhana yang dapat kamu rangkai menjadi satu tarian dan jelaskan urutannya!", "Contoh benar: melangkah lalu menepuk; menggoyang tangan lalu berputar. Jawaban memuat dua gerak dan urutan yang jelas.")
    ],
    "seni-A-15": [
      I("L1", "Anak yang rajin berlatih menari dengan tekun menunjukkan sikap ....", "tekun (rajin)"),
      I("L1", "Bertanya kepada guru tentang gerak tari menunjukkan rasa ingin ....", "tahu"),
      U("L2", "Mengapa kita tidak boleh mudah menyerah ketika belajar gerak tari yang sulit? Jelaskan!", "Karena dengan berlatih terus gerakan akan semakin bisa dan baik. Jawaban yang menyebut latihan dan hasil yang membaik dinilai benar.")
    ],
    "seni-A-16": [
      I("L1", "Wajah yang menangis menunjukkan ekspresi ....", "sedih"),
      I("L1", "Wajah yang cemberut dengan alis mengerut menunjukkan ekspresi ....", "marah")
    ],
    "seni-A-17": [
      I("L1", "Setelah bermain peran, kita bertepuk tangan kepada ... yang sudah tampil.", "teman"),
      I("L1", "Perasaan yang kita rasakan ketika menang dalam permainan adalah perasaan ....", "senang (gembira)"),
      U("L2", "Sebutkan dua perasaan yang dapat kamu ceritakan setelah bermain peran!", "Contoh benar: senang; takut; malu; bangga; lucu. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-A-18": [
      I("L1", "Topi caping dapat menjadi properti untuk tokoh ....", "petani"),
      I("L1", "Properti dibuat dari benda yang ada di sekitar dan ... digunakan.", "mudah"),
      U("L2", "Sebutkan dua properti sederhana untuk tokoh penjual buah dan gunanya!", "Contoh benar: keranjang (tempat buah); timbangan mainan (menimbang buah); topi (pelindung panas). Skor sebanding jumlah pasangan yang benar.")
    ],
    "seni-A-19": [
      I("L1", "Orang yang menonton pertunjukan disebut ....", "penonton"),
      I("L1", "Suara tokoh raksasa dalam cerita biasanya dibuat ....", "besar (berat)"),
      U("L2", "Sebutkan dua tokoh dalam cerita yang kamu sukai dan satu sifat masing-masing!", "Contoh benar: Kancil - cerdik; Buaya - serakah. Skor sebanding jumlah pasangan yang benar.")
    ],
    "seni-A-20": [
      I("L1", "Gerak dan lagu 'Kepala Pundak Lutut Kaki' dimainkan sambil ....", "bernyanyi"),
      I("L1", "Dalam permainan gerak dan lagu, kita harus ... teman agar tidak bertabrakan.", "menjaga jarak dengan"),
      U("L2", "Jelaskan dua manfaat bermain gerak dan lagu bersama teman!", "Contoh benar: badan bergerak dan sehat; hati senang; belajar bekerja sama; melatih mendengarkan. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-B-1": [
      I("L1", "Campuran warna merah dan kuning menghasilkan warna ....", "jingga (oranye)"),
      I("L1", "Merah, kuning, dan biru disebut warna ....", "primer")
    ],
    "seni-B-2": [
      I("L1", "Prinsip seni rupa yang membuat bagian karya tampak seimbang disebut ....", "keseimbangan"),
      I("L1", "Kosakata 'harmonis' dan 'cerah' dipakai untuk ... karya seni rupa.", "mengapresiasi (menilai)"),
      U("L2", "Jelaskan perbedaan memberi pujian dan memberi saran pada karya teman, beserta satu contoh masing-masing!", "Pujian menyebut kelebihan karya (contoh: warnanya cerah). Saran menyebut hal yang dapat diperbaiki (contoh: tambahkan bayangan). Skor separuh untuk masing-masing.")
    ],
    "seni-B-3": [
      I("L1", "Alat gambar berbentuk batang berwarna yang terbuat dari lilin adalah ....", "krayon"),
      I("L1", "Cat air sebelum dipakai dicampur dengan ....", "air"),
      U("L2", "Sebutkan dua perbedaan hasil gambar menggunakan pensil warna dan krayon!", "Contoh benar: pensil warna hasilnya halus dan tipis; krayon hasilnya tebal dan agak kasar. Skor sebanding jumlah perbedaan yang benar.")
    ],
    "seni-B-4": [
      I("L1", "Menggambar dari benda yang kita lihat langsung di depan kita disebut menggambar ....", "pengamatan"),
      I("L1", "Gambar yang berasal dari ide dalam pikiran disebut gambar ....", "imajinasi"),
      U("L2", "Jelaskan perbedaan menggambar dari pengamatan dan dari pengalaman dengan satu contoh masing-masing!", "Pengamatan: melihat langsung objek (contoh: menggambar vas di meja). Pengalaman: mengingat kejadian yang pernah dialami (contoh: menggambar liburan ke pantai). Skor separuh untuk masing-masing.")
    ],
    "seni-B-5": [
      I("L1", "Karya seni rupa dapat dipakai untuk menyampaikan pesan dan ....", "perasaan"),
      I("L1", "Warna biru sering dipakai untuk menunjukkan suasana yang ....", "tenang"),
      U("L2", "Jelaskan dua hal yang dapat diungkapkan melalui karya seni rupa!", "Contoh benar: perasaan; harapan; pengalaman; pesan atau gagasan. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-B-6": [
      I("L1", "Alat musik tradisional dari Jawa Tengah yang terdiri atas gong dan saron adalah ....", "gamelan"),
      I("L1", "Alat musik petik tradisional dari Sulawesi Selatan berbentuk perahu adalah ....", "kecapi")
    ],
    "seni-B-7": [
      I("L1", "Keras lembutnya bunyi dalam lagu disebut ....", "dinamika"),
      I("L1", "Penyanyi memperhatikan ... agar lagu tidak terlalu cepat atau terlalu lambat.", "tempo"),
      U("L2", "Jelaskan cara memberi umpan balik yang baik kepada teman yang baru selesai bermain musik!", "Menyebut kelebihan terlebih dahulu, menyampaikan saran dengan bahasa sopan dan jelas, tidak mengejek. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-B-8": [
      I("L1", "Alat musik tradisional dari Papua yang dipukul adalah ....", "tifa"),
      I("L1", "Alat musik yang dimainkan dengan cara dipetik, misalnya gitar, termasuk alat musik ....", "petik"),
      U("L2", "Jelaskan perbedaan alat musik pukul dan alat musik tiup dengan satu contoh masing-masing!", "Pukul: dimainkan dengan dipukul (contoh: drum, kolintang). Tiup: dimainkan dengan ditiup (contoh: seruling, pianika). Skor separuh untuk masing-masing.")
    ],
    "seni-B-9": [
      I("L1", "Bunyi dari tepukan tangan, hentakan kaki, dan jentikan jari disebut body ....", "percussion"),
      I("L1", "Tepukan tangan yang berulang secara teratur membentuk pola ....", "irama"),
      U("L2", "Sebutkan dua benda di sekitarmu yang dapat dipakai untuk membuat bunyi dan cara membunyikannya!", "Contoh benar: meja dipukul; botol berisi biji digoyang; penggaris dipetik. Skor sebanding jumlah pasangan yang benar.")
    ],
    "seni-B-10": [
      I("L1", "Kegiatan sekolah untuk menyalurkan minat bermusik di luar jam pelajaran disebut ....", "ekstrakurikuler"),
      I("L1", "Agar mahir bermain musik, kita harus rajin ....", "berlatih"),
      U("L2", "Jelaskan dua cara mengembangkan minat bermusikmu!", "Contoh benar: berlatih rutin; ikut ekstrakurikuler musik; menonton pertunjukan musik; belajar dari guru atau teman. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-B-11": [
      I("L1", "Tari Piring berasal dari daerah ....", "Sumatera Barat"),
      I("L1", "Tari Kecak berasal dari daerah ....", "Bali")
    ],
    "seni-B-12": [
      I("L1", "Pola gerak yang melingkar atau lurus di lantai termasuk unsur ....", "ruang"),
      I("L1", "Cepat atau lambat gerak yang mengikuti irama termasuk unsur ....", "waktu"),
      U("L2", "Jelaskan perbedaan gerak level tinggi dan level rendah dengan satu contoh masing-masing!", "Tinggi: gerak dilakukan dengan tubuh berdiri atau tangan terangkat tinggi. Rendah: gerak dilakukan dengan tubuh merendah (jongkok atau duduk). Skor separuh untuk masing-masing.")
    ],
    "seni-B-13": [
      I("L1", "Penari yang bergerak dengan pola yang sama dan bersamaan dalam kelompok membentuk gerak ....", "serempak"),
      I("L1", "Agar tarian kelompok kompak, para penari harus sering ....", "berlatih bersama"),
      U("L2", "Sebutkan dua sikap yang harus dimiliki penari saat menari berkelompok!", "Contoh benar: kerja sama; saling menghargai; disiplin; tidak egois. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-B-14": [
      I("L1", "Gerak yang dilakukan dengan tubuh merendah, misalnya jongkok, termasuk level ....", "rendah"),
      I("L1", "Mengembangkan gerak dasar menjadi gerak baru disebut ... gerak.", "mengembangkan (eksplorasi)"),
      U("L2", "Jelaskan dua cara mengembangkan satu gerak tari menjadi gerak yang berbeda!", "Contoh benar: mengubah level; mengubah arah; mengubah kecepatan; mengubah tenaga. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-B-15": [
      I("L1", "Penari yang rajin berlatih tidak mudah ....", "menyerah"),
      I("L1", "Sebelum latihan menari, kita melakukan ... agar otot tidak kaku.", "pemanasan"),
      U("L2", "Mengapa latihan yang rutin diperlukan untuk menjadi penari yang baik? Jelaskan!", "Karena dengan latihan rutin gerak menjadi lebih luwes, hafal, dan percaya diri. Jawaban yang menyebut hasil latihan dinilai benar.")
    ],
    "seni-B-16": [
      I("L1", "Naskah cerita yang berisi percakapan antartokoh dalam drama disebut ....", "naskah"),
      I("L1", "Drama yang pemainnya bercerita tanpa kata dan hanya memakai gerak disebut ....", "pantomim")
    ],
    "seni-B-17": [
      I("L1", "Pemeran yang menjadi pelaku utama dalam sebuah cerita disebut tokoh ....", "utama"),
      I("L1", "Setelah pentas, kita bersama teman membahas kelebihan dan kekurangan penampilan. Kegiatan ini disebut ....", "refleksi (evaluasi)"),
      U("L2", "Jelaskan mengapa refleksi penting dilakukan setelah bermain teater!", "Agar kita mengetahui kelebihan dan kekurangan penampilan dan dapat memperbaikinya pada pentas berikutnya. Skor sebanding jumlah alasan yang benar.")
    ],
    "seni-B-18": [
      I("L1", "Penataan pakaian pemain agar sesuai tokoh disebut tata ....", "busana"),
      I("L1", "Properti sederhana untuk tokoh nelayan adalah jaring dan ....", "perahu (pancing)"),
      U("L2", "Sebutkan dua kostum sederhana untuk tokoh guru dan fungsinya!", "Contoh benar: baju rapi (menunjukkan guru); kacamata (pelengkap peran); buku (properti mengajar). Skor sebanding jumlah pasangan yang benar.")
    ],
    "seni-B-19": [
      I("L1", "Sifat atau karakter tokoh dalam cerita disebut ....", "watak"),
      I("L1", "Tokoh yang berwatak jahat dan menghalangi tokoh utama disebut tokoh ....", "antagonis"),
      U("L2", "Sebutkan dua watak tokoh dan jelaskan cara memerankannya dengan suara dan gerak!", "Contoh benar: pemarah - suara keras, gerak kasar; pemalu - suara pelan, kepala menunduk. Skor sebanding jumlah pasangan yang benar.")
    ],
    "seni-B-20": [
      I("L1", "Teater tradisional yang ceritanya dibawakan dengan wayang kulit disebut ....", "wayang"),
      I("L1", "Teater yang dimainkan tanpa dialog, hanya dengan gerak dan ekspresi, disebut ....", "pantomim"),
      U("L2", "Jelaskan perbedaan teater boneka dan teater tradisional lenong!", "Teater boneka: tokoh dimainkan oleh boneka yang digerakkan pemain. Lenong: teater tradisional Betawi dengan pemain manusia dan banyak humor. Skor separuh untuk masing-masing.")
    ],
    "seni-C-1": [
      I("L1", "Patung termasuk karya seni rupa ....", "tiga dimensi"),
      I("L1", "Lukisan di atas kanvas termasuk karya seni rupa ....", "dua dimensi")
    ],
    "seni-C-2": [
      I("L1", "Prinsip seni rupa yang membuat bagian-bagian karya tampak seimbang disebut ....", "keseimbangan"),
      I("L1", "Penyatuan semua bagian karya sehingga tampak serasi disebut prinsip ....", "kesatuan (harmoni)"),
      U("L2", "Sebutkan dua prinsip seni rupa dan jelaskan satu contoh penerapannya dalam karya!", "Contoh benar: irama - pengulangan bentuk yang teratur; keseimbangan - bagian kiri dan kanan tampak seimbang; kontras - perbedaan warna terang dan gelap. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-3": [
      I("L1", "Teknik menempel potongan bahan seperti kertas untuk membuat gambar disebut ....", "kolase"),
      I("L1", "Teknik mewarnai dengan menyapukan cat secara tipis dan bening memakai cat air disebut teknik ....", "aquarel"),
      U("L2", "Sebutkan dua bahan yang dapat dipakai membuat karya seni rupa dan teknik mengolah masing-masing!", "Contoh benar: kertas - digunting dan ditempel; tanah liat - dibentuk dengan tangan; pensil warna - digores dan diarsir. Skor sebanding jumlah pasangan yang benar.")
    ],
    "seni-C-4": [
      I("L1", "Gambar yang dibuat berdasarkan benda nyata yang dilihat disebut gambar ....", "pengamatan"),
      I("L1", "Gagasan yang muncul di pikiran untuk membuat karya disebut ....", "ide"),
      U("L2", "Jelaskan dua langkah merancang karya seni rupa dari ide hingga karya jadi!", "Contoh benar: menentukan ide; membuat sketsa; memilih bahan dan alat; mewarnai atau menyelesaikan. Skor sebanding jumlah langkah yang benar.")
    ],
    "seni-C-5": [
      I("L1", "Kegiatan seni yang disukai dan terus ditekuni menunjukkan ... seseorang.", "minat"),
      I("L1", "Karya yang dibuat sesuai minat sebaiknya dibuat dengan ....", "senang hati"),
      U("L2", "Sebutkan dua kegiatan seni rupa yang bisa dikembangkan sesuai minatmu!", "Contoh benar: menggambar; melukis; membuat kolase; membuat kerajinan dari tanah liat. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-6": [
      I("L1", "Pada notasi angka, nada 3 dibaca ....", "mi"),
      I("L1", "Pada notasi angka, nada 6 dibaca ....", "la")
    ],
    "seni-C-7": [
      I("L1", "Penyanyi harus mengucapkan syair dengan jelas, yaitu memperhatikan ....", "artikulasi"),
      I("L1", "Lagu yang dinyanyikan dengan suara berbeda-beda oleh dua kelompok disebut lagu dua ....", "suara"),
      U("L2", "Sebutkan dua hal yang dinilai saat kelompok bermain musik bersama!", "Contoh benar: kekompakan; ketepatan nada; ketepatan tempo; dinamika. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-8": [
      I("L1", "Tanda dinamika 'piano' berarti dimainkan dengan ....", "lembut (pelan)"),
      I("L1", "Not setengah bernilai ... ketukan pada birama 4/4.", "dua"),
      U("L2", "Jelaskan perbedaan tempo cepat dan tempo lambat dengan satu contoh suasana lagu masing-masing!", "Cepat: lagu terdengar semangat atau riang. Lambat: lagu terdengar tenang atau sedih. Skor separuh untuk masing-masing.")
    ],
    "seni-C-9": [
      I("L1", "Alat musik tradisional Jawa Barat yang terbuat dari bambu dan digoyang adalah ....", "angklung"),
      I("L1", "Alat musik dari Sulawesi Utara yang terbuat dari bilah kayu yang dipukul adalah ....", "kolintang"),
      U("L2", "Sebutkan dua musik daerah beserta alat musik khasnya!", "Contoh benar: Jawa Tengah - gamelan; Jawa Barat - angklung; Sulawesi Utara - kolintang; Papua - tifa. Skor sebanding jumlah pasangan yang benar.")
    ],
    "seni-C-10": [
      I("L1", "Kegiatan mencari tahu lebih banyak tentang musik daerah menunjukkan sikap ....", "ingin tahu"),
      I("L1", "Gong adalah alat musik yang dimainkan dengan cara ....", "dipukul"),
      U("L2", "Jelaskan dua cara mencari tahu lebih jauh tentang alat musik tradisional!", "Contoh benar: membaca buku; bertanya kepada guru; mencari di internet dengan bimbingan; menonton pertunjukan. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-11": [
      I("L1", "Unsur tari berupa rasa atau penghayatan disebut ....", "wirasa"),
      I("L1", "Orang yang menyusun gerak tari disebut ....", "koreografer")
    ],
    "seni-C-12": [
      I("L1", "Musik pengiring tari disebut ....", "iringan"),
      I("L1", "Pola gerak tari yang dibentuk penari di lantai disebut pola ....", "lantai"),
      U("L2", "Jelaskan fungsi tata rias dan tata busana pada tari!", "Tata rias mempertegas wajah dan karakter penari; tata busana mendukung tema dan karakter tari serta membuat penari tampak menarik. Skor separuh untuk masing-masing.")
    ],
    "seni-C-13": [
      I("L1", "Gerak tari yang dilakukan secara bersamaan oleh semua penari disebut gerak ....", "serempak"),
      I("L1", "Gerak yang dilakukan bergantian oleh penari disebut gerak ....", "bergantian (selang-seling)"),
      U("L2", "Sebutkan dua hal yang perlu disepakati kelompok sebelum menyusun gerak tari!", "Contoh benar: tema atau cerita; iringan; urutan gerak; pola lantai; pembagian peran. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-14": [
      I("L1", "Tari Jaipong berasal dari Jawa ....", "Barat"),
      I("L1", "Tari kreasi adalah tari yang dibuat dengan ... gerak baru.", "menggabungkan (mengembangkan)"),
      U("L2", "Jelaskan perbedaan tari tradisional dan tari kreasi!", "Tari tradisional: diwariskan turun-temurun dengan aturan gerak yang baku. Tari kreasi: gerak baru yang dikembangkan dari tari tradisional atau ide baru. Skor separuh untuk masing-masing.")
    ],
    "seni-C-15": [
      I("L1", "Hewan di sekitar, misalnya burung atau kupu-kupu, dapat menjadi ... gerak tari.", "inspirasi"),
      I("L1", "Tema tari tentang kegiatan petani dapat menggunakan gerak menanam dan ....", "memanen (mencangkul)"),
      U("L2", "Sebutkan dua peristiwa atau kegiatan di sekitarmu yang dapat dijadikan tema tari!", "Contoh benar: menanam padi; bermain di sekolah; membersihkan kelas; pasar. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-16": [
      I("L1", "Orang yang mengarahkan pemain dan jalannya pementasan disebut ....", "sutradara"),
      I("L1", "Naskah yang dipakai pemain untuk menghafal dialog disebut ....", "naskah")
    ],
    "seni-C-17": [
      I("L1", "Tokoh yang berwatak baik dan menjadi pusat cerita disebut tokoh ....", "protagonis"),
      I("L1", "Sifat tokoh dapat diketahui dari ucapan, tindakan, dan ....", "penampilan (pakaian)"),
      U("L2", "Jelaskan perbedaan tokoh protagonis dan antagonis dengan satu contoh masing-masing!", "Protagonis: tokoh baik atau pembela kebenaran (contoh: Kancil). Antagonis: tokoh yang menghalangi atau jahat (contoh: Buaya yang serakah). Skor separuh untuk masing-masing.")
    ],
    "seni-C-18": [
      I("L1", "Penataan cahaya pada pementasan disebut tata ....", "lampu (cahaya)"),
      I("L1", "Pakaian pemain yang disesuaikan dengan tokoh disebut ....", "kostum"),
      U("L2", "Jelaskan dua fungsi tata panggung dalam pementasan drama!", "Contoh benar: menunjukkan tempat kejadian; membuat suasana adegan; mendukung cerita. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-19": [
      I("L1", "Suara pelan dan bergetar cocok untuk memerankan tokoh yang sedang ....", "takut (sedih)"),
      I("L1", "Gerakan tubuh yang sesuai dengan tokoh disebut ... tubuh.", "gestur"),
      U("L2", "Jelaskan dua cara memerankan tokoh yang sedang gembira!", "Contoh benar: wajah tersenyum; suara riang dan keras; gerakan lincah dan cepat. Skor sebanding jumlah jawaban yang benar.")
    ],
    "seni-C-20": [
      I("L1", "Latihan akhir yang menyerupai pementasan sebenarnya disebut ....", "gladi resik"),
      I("L1", "Pemain mempersiapkan diri sebelum pentas agar tidak ....", "gugup (grogi)"),
      U("L2", "Sebutkan dua hal yang harus dipersiapkan sebelum pementasan lakon singkat!", "Contoh benar: naskah; pemain dan peran; properti; kostum; latihan. Skor sebanding jumlah jawaban yang benar.")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN Matematika (isian sampai 4 per TP, +1 uraian untuk TP yang uraiannya baru 1) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "mtk-A-1": [
      I("L1", "Bilangan sebelum 50 adalah ....", "49"),
      I("L1", "Bilangan yang terdiri dari 6 puluhan dan 2 satuan adalah ....", "62")
    ],
    "mtk-A-2": [
      I("L1", "Angka 4 pada bilangan 47 bernilai ....", "40"),
      I("L1", "30 + 5 = ....", "35")
    ],
    "mtk-A-3": [
      I("L1", "15 + 6 = ....", "21"),
      I("L1", "18 - 9 = ....", "9")
    ],
    "mtk-A-4": [
      I("L1", "10 : 2 = ....", "5"),
      I("L1", "Satu dari tiga bagian sama besar ditulis pecahan ....", "1/3")
    ],
    "mtk-A-5": [
      I("L1", "Lengkapi: 9 + .... = 13", "4"),
      U("L2", "Tuliskan dua kalimat pengurangan yang hasilnya 5, lalu jelaskan caramu menemukannya!", "Contoh benar: 9 - 4 = 5; 8 - 3 = 5; 10 - 5 = 5. Skor sebanding jumlah kalimat yang benar.")
    ],
    "mtk-A-6": [
      I("L1", "Pola: 2, 4, 6, 8, .... Bilangan berikutnya adalah ....", "10"),
      I("L1", "Pola: kotak, bulat, bulat, kotak, bulat, bulat, kotak, .... Bentuk berikutnya adalah ....", "bulat")
    ],
    "mtk-A-7": [
      I("L1", "Hari setelah Selasa adalah ....", "Rabu"),
      I("L1", "Satu tahun ada .... bulan.", "12")
    ],
    "mtk-A-8": [
      I("L1", "Jengkal dan langkah termasuk satuan ... baku.", "tidak"),
      I("L1", "Pita diukur 10 klip dan tali diukur 7 klip. Yang lebih pendek adalah ....", "tali")
    ],
    "mtk-A-9": [
      I("L1", "Bangun datar yang tidak memiliki sisi lurus dan sudut adalah ....", "lingkaran"),
      I("L1", "Persegi panjang memiliki .... sudut.", "4")
    ],
    "mtk-A-10": [
      I("L1", "Lawan kata 'depan' adalah ....", "belakang"),
      I("L1", "Lawan kata 'dalam' adalah ....", "luar"),
      U("L2", "Jelaskan letak bukumu terhadap tasmu menggunakan kata depan, belakang, kiri, atau kanan!", "Jawaban benar menyebut letak buku terhadap tas dengan satu kata posisi yang tepat, misalnya buku di sebelah kanan tas.")
    ],
    "mtk-A-11": [
      I("L1", "Data hewan: sapi 3, kambing 5, ayam 7. Hewan yang paling banyak adalah ....", "ayam"),
      I("L1", "Data buah: apel 4 dan jeruk 6. Jumlah kedua buah adalah ....", "10")
    ],
    "mtk-B-1": [
      I("L1", "Bilangan lima ribu dua ratus ditulis ....", "5.200"),
      I("L1", "Nilai angka 7 pada bilangan 7.405 adalah ....", "7.000")
    ],
    "mtk-B-2": [
      I("L1", "75 + 18 = ....", "93"),
      I("L1", "100 - 37 = ....", "63")
    ],
    "mtk-B-4": [
      I("L1", "Tiga kelipatan 5 yang pertama adalah 5, 10, dan ....", "15"),
      I("L1", "Faktor dari 6 adalah 1, 2, 3, dan ....", "6"),
      U("L2", "Tuliskan lima kelipatan 6 yang pertama dan tiga faktor dari 12!", "Kelipatan 6: 6, 12, 18, 24, 30. Faktor 12 (contoh): 1, 2, 3, 4, 6, 12. Skor separuh untuk masing-masing.")
    ],
    "mtk-B-5": [
      I("L1", "2/4 senilai dengan 1/ ....", "2"),
      I("L1", "Pecahan yang lebih besar antara 3/8 dan 5/8 adalah ....", "5/8")
    ],
    "mtk-B-6": [
      I("L1", "Pecahan 1/4 jika ditulis sebagai desimal adalah ....", "0,25"),
      I("L1", "0,3 jika ditulis sebagai pecahan berpenyebut 10 adalah ....", "3/10")
    ],
    "mtk-B-7": [
      I("L1", ".... + 25 = 60", "35"),
      I("L1", "82 - .... = 50", "32"),
      U("L2", "Tia punya 45 permen. Setelah sebagian diberikan kepada adik, tersisa 28 permen. Tulis kalimat matematika dan hitung permen yang diberikan!", "Kalimat: 45 - n = 28, maka n = 45 - 28 = 17. Permen yang diberikan 17 butir. Skor: kalimat 2, hasil 3.")
    ],
    "mtk-B-8": [
      I("L1", "Lanjutkan pola: 50, 45, 40, 35, ....", "30")
    ],
    "mtk-B-10": [
      I("L1", "Luas persegi dengan sisi 6 cm adalah .... cm persegi.", "36"),
      I("L1", "Kotak diisi 2 lapis kubus satuan, tiap lapis 3 × 3 kubus. Volume kotak adalah .... kubus satuan.", "18"),
      U("L2", "Jelaskan cara mencari luas persegi panjang dengan panjang 8 cm dan lebar 5 cm!", "Luas = panjang × lebar = 8 × 5 = 40 cm persegi. Skor: rumus 2, hasil dan satuan 3.")
    ],
    "mtk-B-11": [
      I("L1", "Segitiga memiliki .... titik sudut.", "3"),
      I("L1", "Bangun datar yang keempat sisinya sama panjang dan keempat sudutnya siku-siku adalah ....", "persegi"),
      U("L2", "Jelaskan perbedaan segitiga dan segi empat berdasarkan banyak sisi dan banyak sudutnya!", "Segitiga: 3 sisi dan 3 sudut. Segi empat: 4 sisi dan 4 sudut. Skor separuh untuk masing-masing.")
    ],
    "mtk-B-12": [
      I("L1", "Data: 3, 7, 5. Jumlah seluruh data adalah ....", "15"),
      I("L1", "Nilai terbesar dari data 12, 18, 15, 9 adalah ....", "18")
    ],
    "mtk-C-1": [
      I("L1", "Bilangan 125.000 dibaca seratus dua puluh lima ....", "ribu"),
      I("L1", "Pembulatan 8.640 ke ratusan terdekat adalah ....", "8.600")
    ],
    "mtk-C-3": [
      I("L1", "KPK dari 3 dan 5 adalah ....", "15"),
      I("L1", "FPB dari 16 dan 24 adalah ....", "8")
    ],
    "mtk-C-4": [
      I("L1", "1/2 + 1/4 = ....", "3/4"),
      I("L1", "7/8 - 3/8 = .... (pecahan paling sederhana)", "1/2")
    ],
    "mtk-C-5": [
      I("L1", "50% sama dengan pecahan ....", "1/2"),
      I("L1", "0,5 sama dengan .... persen.", "50")
    ],
    "mtk-C-6": [
      U("L2", "Ada n kelereng. Setelah 12 kelereng diberikan kepada adik, tersisa 25 kelereng. Tulis kalimat matematika dan hitung nilai n!", "Kalimat: n - 12 = 25, maka n = 25 + 12 = 37. Skor: kalimat 2, hasil 3.")
    ],
    "mtk-C-7": [
      I("L1", "Perbandingan 10 : 20 dalam bentuk paling sederhana adalah ....", "1 : 2"),
      I("L1", "Pada peta berskala 1 : 100, jarak 5 cm pada peta mewakili jarak sebenarnya .... cm.", "500")
    ],
    "mtk-C-11": [
      I("L1", "Pada peta berpetak, letak benda ditulis dengan pasangan huruf dan ....", "angka"),
      I("L1", "Peta berpetak 4 × 4 memiliki .... petak.", "16"),
      U("L2", "Taman berada di petak (C, 4). Jelaskan cara menemukan taman pada peta berpetak!", "Cari kolom C, lalu cari baris 4; taman berada pada petak pertemuan kolom C dan baris 4. Skor sebanding langkah yang benar.")
    ],
    "mtk-C-12": [
      I("L1", "Rata-rata (mean) dari data 4, 6, dan 8 adalah ....", "6"),
      I("L1", "Modus dari data 2, 3, 3, 4, 3, 5 adalah ....", "3")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PP, PJOK, IPAS (isian sampai 4 per TP, +1 uraian untuk TP yang uraiannya baru 1) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "pp-A-2": [
      I("L1", "Berdoa sebelum belajar mencerminkan sila ke-....", "pertama (satu)"),
      I("L1", "Memilih ketua kelas dengan musyawarah mencerminkan sila ke-....", "keempat (empat)")
    ],
    "pp-A-3": [
      I("L1", "Mendapat pelajaran dari guru adalah ... murid.", "hak"),
      I("L1", "Membuang sampah pada tempatnya adalah ... kita sebagai murid.", "kewajiban")
    ],
    "pp-A-4": [
      I("L1", "Teman kita berbeda suku, tetapi kita sama-sama bangsa ....", "Indonesia"),
      I("L1", "Saling menghormati perbedaan membuat hidup menjadi ....", "rukun")
    ],
    "pp-A-5": [
      I("L1", "Negara kita bernama Republik ....", "Indonesia"),
      I("L1", "Menjaga kebersihan lingkungan bersama-sama disebut kerja ....", "bakti"),
      I("L1", "Membuang sampah pada tempatnya menunjukkan sikap ... terhadap lingkungan.", "peduli"),
      U("L2", "Tuliskan dua cara kamu membantu menjaga kebersihan di rumah!", "Contoh benar: menyapu lantai; membuang sampah pada tempatnya; merapikan mainan; mencuci piring. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pp-B-3": [
      I("L1", "Orang yang menaati aturan dengan tertib disebut orang yang ....", "disiplin"),
      I("L1", "Aturan di rumah biasanya dibuat oleh ....", "orang tua"),
      I("L1", "Tata tertib sekolah dibuat agar kegiatan belajar berjalan dengan ....", "lancar (tertib)"),
      U("L2", "Jelaskan akibatnya jika warga tidak menaati aturan di lingkungan tempat tinggal!", "Contoh benar: lingkungan menjadi tidak tertib dan tidak aman; terjadi pertengkaran; warga merasa tidak nyaman. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pp-B-4": [
      I("L1", "Belajar dengan sungguh-sungguh termasuk ... murid.", "kewajiban"),
      I("L1", "Mendapat perlindungan dari kekerasan termasuk ... setiap anak.", "hak")
    ],
    "pp-B-5": [
      I("L1", "Perbedaan suku, agama, dan budaya di Indonesia disebut ....", "keberagaman (kebinekaan)"),
      I("L1", "Saling menghargai antarsuku dan agama membuat hidup menjadi ....", "rukun")
    ],
    "pp-B-6": [
      I("L1", "Beberapa RW bergabung membentuk satu ....", "desa (kelurahan)"),
      I("L1", "Pemimpin di tingkat RT disebut Ketua ....", "RT"),
      I("L1", "Pemimpin desa disebut kepala ....", "desa"),
      U("L2", "Sebutkan dua kegiatan bersama warga di RT atau RW tempat tinggalmu!", "Contoh benar: kerja bakti; ronda malam; pengajian; arisan; peringatan hari besar. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pp-C-1": [
      I("L1", "Badan yang menyiapkan kemerdekaan Indonesia disingkat ....", "BPUPKI"),
      I("L1", "Pancasila disahkan sebagai dasar negara pada 18 Agustus ....", "1945"),
      I("L1", "Rumusan resmi Pancasila terdapat dalam Pembukaan ....", "UUD 1945"),
      U("L2", "Jelaskan mengapa para perumus Pancasila memilih bermusyawarah dalam menyusun dasar negara!", "Agar keputusan diambil bersama dan dapat diterima oleh semua pihak yang berbeda pendapat; sikap saling menghargai dan mengutamakan kepentingan bangsa. Skor sebanding jumlah alasan yang benar.")
    ],
    "pp-C-2": [
      I("L1", "Panitia Persiapan Kemerdekaan Indonesia yang mengesahkan Pancasila disingkat ....", "PPKI"),
      I("L1", "Sila pertama Pancasila berbunyi 'Ketuhanan Yang Maha ....'", "Esa")
    ],
    "pp-C-4": [
      I("L1", "Keputusan hasil musyawarah yang disepakati bersama disebut ....", "mufakat"),
      I("L1", "Pengambilan keputusan dengan menghitung suara terbanyak disebut ....", "voting (pemungutan suara)")
    ],
    "pp-C-5": [
      I("L1", "Tari Saman berasal dari Provinsi ....", "Aceh"),
      I("L1", "Bahasa daerah perlu dipakai dan diajarkan agar tidak ....", "punah"),
      I("L1", "Tari Kecak berasal dari Provinsi ....", "Bali"),
      U("L2", "Jelaskan dua cara melestarikan budaya daerah di lingkunganmu!", "Contoh benar: mempelajari tari atau musik daerah; memakai bahasa daerah; mengikuti upacara adat; mengenalkan budaya kepada teman. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pp-C-6": [
      I("L1", "ASEAN didirikan pada tahun ....", "1967")
    ],
    "pp-C-7": [
      I("L1", "Sikap rela berkorban demi bangsa dan negara disebut ....", "patriotisme"),
      I("L1", "Ikut menjaga keamanan lingkungan dengan ronda termasuk upaya bela ....", "negara")
    ],
    "pjok-A-2": [
      I("L1", "Bergerak ke depan, belakang, atau samping disebut mengatur ... gerak.", "arah"),
      I("L1", "Berjalan lurus di atas garis lantai melatih ... tubuh.", "keseimbangan"),
      I("L1", "Bergerak dengan tenaga besar atau kecil disebut mengatur ... gerak.", "tenaga"),
      U("L2", "Sebutkan dua cara mengatur gerak saat berlari agar tidak menabrak teman!", "Contoh benar: melihat ke depan; menjaga jarak; mengurangi kecepatan; mengubah arah. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-A-3": [
      I("L1", "Menang atau kalah dalam permainan harus diterima dengan ....", "lapang dada"),
      I("L1", "Dalam permainan, kita tidak boleh ... teman yang kalah.", "mengejek (menertawakan)")
    ],
    "pjok-A-4": [
      I("L1", "Aktivitas jasmani yang rutin membuat tubuh menjadi ....", "bugar"),
      I("L1", "Sebelum berolahraga, kita melakukan ... agar otot tidak kaku.", "pemanasan"),
      I("L1", "Berlari, melompat, dan bermain bola termasuk aktivitas ....", "jasmani"),
      U("L2", "Jelaskan mengapa kita perlu melakukan peregangan sebelum dan sesudah olahraga!", "Agar otot tidak kaku dan terhindar dari cedera; sesudah olahraga untuk mengendurkan otot. Skor separuh untuk masing-masing.")
    ],
    "pjok-A-5": [
      I("L1", "Menggosok gigi sebaiknya dilakukan ... kali sehari, yaitu pagi dan malam.", "dua"),
      I("L1", "Memotong kuku secara teratur menjaga kebersihan ....", "badan (diri)")
    ],
    "pjok-A-6": [
      I("L1", "Jika orang asing menawarkan permen dan mengajak pergi, kita harus ....", "menolak"),
      I("L1", "Bermain di dekat jalan raya berbahaya karena dapat ....", "tertabrak"),
      I("L1", "Garis putih-hitam di jalan tempat menyeberang disebut ....", "zebra cross")
    ],
    "pjok-B-1": [
      I("L1", "Permainan bola yang bola dipukul tangan melewati jaring disebut bola ....", "voli"),
      I("L1", "Permainan bola yang bola ditendang ke gawang disebut ....", "sepak bola")
    ],
    "pjok-B-2": [
      I("L1", "Senam yang dilakukan di atas matras disebut senam ....", "lantai"),
      I("L1", "Gerak senam berguling ke belakang disebut guling ....", "belakang")
    ],
    "pjok-B-3": [
      I("L1", "Orang yang melatih sebuah tim disebut ....", "pelatih"),
      I("L1", "Rencana cara bermain agar tim dapat menang disebut ....", "strategi"),
      I("L1", "Pertandingan sebaiknya diakhiri dengan berjabat ....", "tangan"),
      U("L2", "Jelaskan dua sikap fair play yang harus ditunjukkan saat bertanding!", "Contoh benar: jujur; menaati aturan; menghargai lawan; menerima keputusan wasit; tidak curang. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-B-4": [
      I("L1", "Saling membantu dalam satu tim disebut ....", "kerja sama"),
      I("L1", "Pemimpin dalam sebuah tim bola biasanya disebut ....", "kapten")
    ],
    "pjok-B-5": [
      I("L1", "Kemampuan menekuk dan meregangkan sendi sejauh mungkin disebut ....", "kelenturan"),
      I("L1", "Kemampuan otot mengangkat beban disebut ... otot.", "kekuatan")
    ],
    "pjok-B-6": [
      I("L1", "Makanan bergizi seimbang terdiri atas makanan pokok, lauk, sayur, dan ....", "buah"),
      I("L1", "Agar tidak kekurangan cairan, tubuh perlu minum ....", "air putih")
    ],
    "pjok-B-7": [
      I("L1", "Singkatan P3K adalah Pertolongan Pertama pada ....", "Kecelakaan"),
      I("L1", "Luka lecet sebaiknya dibersihkan dengan air ....", "bersih"),
      I("L1", "Perban dipakai untuk ... luka.", "membalut (menutup)")
    ],
    "pjok-C-1": [
      I("L1", "Permainan bola voli dimainkan oleh ... pemain pada setiap tim di lapangan.", "enam"),
      I("L1", "Permainan sepak bola dimainkan oleh ... pemain pada setiap tim.", "sebelas")
    ],
    "pjok-C-3": [
      I("L1", "Lomba lari berkelompok dengan serah terima tongkat disebut lari ....", "estafet"),
      I("L1", "Strategi yang kurang berhasil perlu ... agar menjadi lebih baik.", "diperbaiki"),
      I("L1", "Mencoba dua cara berbeda lalu membandingkan hasilnya disebut ....", "uji coba (menguji)"),
      U("L2", "Jelaskan dua hal yang perlu diperhatikan agar serah terima tongkat estafet berjalan lancar!", "Contoh benar: pelari berkomunikasi dan memberi aba-aba; penerima mulai berlari sebelum tongkat diterima; tongkat diserahkan pada daerah serah terima; tangan penerima terentang. Skor sebanding jumlah jawaban yang benar.")
    ],
    "pjok-C-4": [
      I("L1", "Kemampuan menahan marah dan bersikap sabar disebut mengendalikan ....", "emosi"),
      I("L1", "Orang yang memimpin pertandingan dan memutuskan pelanggaran disebut ....", "wasit")
    ],
    "pjok-C-5": [
      I("L1", "Kemampuan tubuh beraktivitas lama tanpa lelah berlebihan disebut kebugaran ....", "jasmani"),
      I("L1", "Kebugaran jasmani dapat ditingkatkan dengan latihan secara ....", "teratur")
    ],
    "pjok-C-6": [
      I("L1", "Kurang bergerak dan lebih banyak duduk termasuk perilaku ....", "sedenter"),
      I("L1", "Berat badan yang sangat berlebihan disebut ....", "obesitas"),
      I("L1", "Aktivitas fisik sebaiknya dilakukan setiap ....", "hari")
    ],
    "pjok-C-7": [
      I("L1", "Sumber tenaga utama dalam nasi dan roti adalah ....", "karbohidrat"),
      I("L1", "Zat gizi untuk membangun dan memperbaiki sel tubuh adalah ....", "protein"),
      I("L1", "Sayur dan buah banyak mengandung vitamin dan ....", "mineral")
    ],
    "pjok-C-8": [
      I("L1", "Pada prinsip RICE, huruf R berarti ... (mengistirahatkan bagian yang cedera).", "Rest"),
      I("L1", "Pada prinsip RICE, huruf I berarti ... (kompres dingin).", "Ice"),
      I("L1", "Pada prinsip RICE, huruf C berarti ... (membalut dengan perban elastis).", "Compression")
    ],
    "ipas-B-1": [
      I("L1", "Alat indra untuk melihat adalah ....", "mata"),
      I("L1", "Alat indra untuk mendengar adalah ....", "telinga"),
      I("L1", "Alat indra untuk merasakan manis dan asin adalah ....", "lidah"),
      U("L2", "Jelaskan akibatnya jika kita tidak menjaga kebersihan telinga!", "Telinga dapat terganggu oleh kotoran sehingga pendengaran berkurang atau terjadi infeksi; kebersihan telinga perlu dijaga dengan hati-hati. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-2": [
      I("L1", "Bagian tumbuhan tempat pembuatan makanan adalah ....", "daun"),
      I("L1", "Tahap daur hidup kupu-kupu setelah telur adalah ....", "ulat (larva)")
    ],
    "ipas-B-4": [
      I("L1", "Sumber energi terbesar bagi kehidupan di bumi adalah ....", "matahari"),
      I("L1", "Kipas angin berputar karena mendapat energi ....", "listrik")
    ],
    "ipas-B-5": [
      I("L1", "Gaya yang menarik benda ke arah pusat bumi disebut gaya ....", "gravitasi"),
      I("L1", "Menarik laci meja termasuk contoh gaya ....", "tarik")
    ],
    "ipas-B-6": [
      I("L1", "Air dan udara termasuk sumber daya alam yang dapat ....", "diperbarui"),
      I("L1", "Menanam kembali pohon di hutan yang gundul disebut ....", "reboisasi")
    ],
    "ipas-B-7": [
      I("L1", "Kegiatan saling membantu dalam mengerjakan sesuatu secara bersama disebut ....", "gotong royong"),
      I("L1", "Kegiatan membersihkan lingkungan bersama warga disebut kerja ....", "bakti")
    ],
    "ipas-B-8": [
      I("L1", "Peta menggambarkan permukaan bumi pada bidang ....", "datar"),
      I("L1", "Arah mata angin yang berlawanan dengan utara adalah ....", "selatan"),
      I("L1", "Arah matahari terbit adalah ....", "timur"),
      U("L2", "Jelaskan dua kegunaan peta dalam kehidupan sehari-hari!", "Contoh benar: mengetahui letak suatu tempat; menentukan arah dan jalan; mengetahui jarak. Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-B-9": [
      I("L1", "Rumah gadang berasal dari Sumatera ....", "Barat"),
      I("L1", "Bahasa daerah yang banyak dipakai di Jawa Tengah adalah bahasa ....", "Jawa")
    ],
    "ipas-B-10": [
      I("L1", "Ilmu yang mempelajari peristiwa masa lalu disebut ....", "sejarah"),
      I("L1", "Bangunan tua peninggalan masa lalu yang dilindungi disebut cagar ....", "budaya"),
      I("L1", "Kegiatan bertanya langsung kepada narasumber disebut ....", "wawancara")
    ],
    "ipas-B-11": [
      I("L1", "Mata uang negara Indonesia adalah ....", "rupiah"),
      I("L1", "Tempat menyimpan uang yang dikelola lembaga keuangan disebut ....", "bank"),
      I("L1", "Catatan uang masuk dan uang keluar disebut catatan ....", "keuangan")
    ],
    "ipas-B-12": [
      I("L1", "Hasil pengamatan dalam percobaan sebaiknya dicatat dalam ....", "tabel"),
      I("L1", "Langkah awal penyelidikan adalah ... dengan teliti.", "mengamati"),
      I("L1", "Kesimpulan dibuat berdasarkan ... percobaan.", "hasil")
    ],
    "ipas-C-1": [
      I("L1", "Saluran udara dari hidung menuju paru-paru melewati batang ....", "tenggorok (trakea)"),
      I("L1", "Organ pencernaan yang menyerap sari-sari makanan adalah usus ....", "halus")
    ],
    "ipas-C-2": [
      I("L1", "Hewan pemakan tumbuhan dan daging disebut ....", "omnivora"),
      I("L1", "Tumbuhan hijau berperan sebagai ... dalam rantai makanan.", "produsen")
    ],
    "ipas-C-3": [
      I("L1", "Bunyi tidak dapat merambat di ruang ....", "hampa"),
      I("L1", "Cahaya merambat dalam garis ....", "lurus"),
      I("L1", "Benda yang memancarkan cahaya sendiri disebut sumber ....", "cahaya"),
      U("L2", "Jelaskan dua sifat cahaya beserta contohnya!", "Contoh benar: merambat lurus (sinar senter); dapat dipantulkan (cermin); dapat menembus benda bening (kaca). Skor sebanding jumlah jawaban yang benar.")
    ],
    "ipas-C-4": [
      I("L1", "Dua kutub magnet yang berbeda jika didekatkan akan ....", "tarik-menarik"),
      I("L1", "Jika saklar dibuka, arus listrik ... pada rangkaian.", "tidak mengalir (berhenti)")
    ],
    "ipas-C-5": [
      I("L1", "Peredaran bumi mengelilingi matahari disebut ....", "revolusi"),
      I("L1", "Satu kali revolusi bumi memerlukan waktu ....", "satu tahun (365 hari)")
    ],
    "ipas-C-6": [
      I("L1", "Warna biru pada peta biasanya menunjukkan ....", "perairan (laut)"),
      I("L1", "Arah mata angin antara utara dan timur disebut ....", "timur laut")
    ],
    "ipas-C-7": [
      I("L1", "Wakil presiden pertama Indonesia yang bersama Soekarno memproklamasikan kemerdekaan adalah Mohammad ....", "Hatta"),
      I("L1", "Proklamasi kemerdekaan Indonesia dibacakan pada tahun ....", "1945")
    ],
    "ipas-C-8": [
      I("L1", "Pengetahuan dan tradisi daerah yang diwariskan dan bermanfaat bagi masyarakat disebut kearifan ....", "lokal"),
      I("L1", "Keberagaman suku, agama, dan budaya merupakan ... bangsa Indonesia.", "kekayaan"),
      I("L1", "Saling menghormati perbedaan menjaga bangsa tetap ....", "bersatu"),
      U("L2", "Sebutkan dua contoh kearifan lokal di Indonesia dan manfaatnya!", "Contoh benar: gotong royong - mempererat kebersamaan; sasi di Maluku - menjaga kelestarian alam; subak di Bali - mengatur pembagian air. Skor sebanding jumlah pasangan yang benar.")
    ],
    "ipas-C-10": [
      I("L1", "Faktor yang sengaja diubah dalam percobaan disebut variabel ....", "bebas"),
      I("L1", "Faktor yang diamati hasilnya dalam percobaan disebut variabel ....", "terikat"),
      I("L1", "Faktor yang dijaga tetap sama dalam percobaan disebut variabel ....", "kontrol")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN B. Indonesia dan B. Inggris (isian sampai 4 per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "bin-A-1": [
      I("L1", "Tempat terjadinya peristiwa dalam sebuah cerita disebut ....", "latar"),
      I("L1", "Alat indra yang kita pakai untuk menyimak cerita adalah ....", "telinga")
    ],
    "bin-A-2": [
      I("L1", "Kata 'meja' terdiri atas .... suku kata.", "dua"),
      I("L1", "Huruf pertama pada kata 'ikan' adalah ....", "i")
    ],
    "bin-A-3": [
      I("L1", "Bacaan: 'Ani menanam bunga di kebun.' Ani menanam bunga di ....", "kebun"),
      I("L1", "Bacaan: 'Ibu membeli apel dan jeruk di pasar.' Ibu membeli apel dan ....", "jeruk")
    ],
    "bin-A-4": [
      I("L1", "Ketika menerima bantuan dari teman, kita mengucapkan ....", "terima kasih"),
      I("L1", "Saat bertemu guru di pagi hari, kita mengucapkan selamat ....", "pagi")
    ],
    "bin-A-5": [
      I("L1", "Tanda baca '!' disebut tanda ....", "seru"),
      I("L1", "Huruf pertama pada awal kalimat ditulis dengan huruf ....", "kapital")
    ],
    "bin-A-6": [
      I("L1", "Susunlah menjadi kalimat: koran, Ayah, membaca → ....", "Ayah membaca koran."),
      I("L1", "Susunlah menjadi kalimat: sekolah, Dina, berangkat → ....", "Dina berangkat sekolah.")
    ],
    "bin-B-1": [
      I("L1", "Kata tanya untuk menanyakan orang adalah ....", "siapa"),
      I("L1", "Kata tanya untuk menanyakan alasan atau sebab adalah ....", "mengapa")
    ],
    "bin-B-2": [
      I("L1", "Kalimat yang berisi gagasan utama sebuah paragraf disebut kalimat ....", "utama"),
      I("L1", "Sebuah paragraf yang baik hanya membahas ... ide pokok.", "satu")
    ],
    "bin-B-3": [
      I("L1", "Teks yang menceritakan rangkaian peristiwa disebut teks ....", "narasi"),
      I("L1", "Pada teks prosedur, daftar bahan ditulis sebelum ....", "langkah-langkah")
    ],
    "bin-B-4": [
      I("L1", "Kata 'kemudian' dipakai untuk menandai bagian ... cerita.", "tengah"),
      I("L1", "Cerita liburan sebaiknya ditulis secara ....", "runtut (urut)")
    ],
    "bin-B-5": [
      I("L1", "Huruf pertama pada nama kota ditulis dengan huruf ....", "kapital"),
      I("L1", "Tanda titik dua dipakai sebelum ... benda dalam kalimat.", "rincian")
    ],
    "bin-B-6": [
      I("L1", "Antonim dari kata 'tinggi' adalah ....", "rendah"),
      I("L1", "Sinonim dari kata 'senang' adalah ....", "gembira")
    ],
    "bin-C-1": [
      I("L1", "Pertanyaan 'siapa' digunakan untuk menanyakan ....", "orang"),
      I("L1", "Pertanyaan 'kapan' digunakan untuk menanyakan ....", "waktu")
    ],
    "bin-C-2": [
      I("L1", "Pernyataan 'Menurut saya, mangga paling enak' termasuk ....", "opini"),
      I("L1", "Pernyataan 'Air mendidih pada suhu 100 derajat Celsius' termasuk ....", "fakta")
    ],
    "bin-C-3": [
      I("L1", "Pelaku dalam sebuah cerita disebut ....", "tokoh"),
      I("L1", "Urutan peristiwa dalam cerita disebut ....", "alur")
    ],
    "bin-C-4": [
      I("L1", "Orang yang memimpin jalannya diskusi disebut ....", "moderator"),
      I("L1", "Orang yang menyampaikan presentasi di depan kelas disebut ....", "pembicara (presenter)")
    ],
    "bin-C-5": [
      I("L1", "Surat yang ditulis untuk sahabat atau keluarga disebut surat ....", "pribadi"),
      I("L1", "Surat yang ditulis kepada kepala sekolah untuk keperluan sekolah termasuk surat ....", "resmi (dinas)")
    ],
    "big-B-1": [
      I("L1", "Arti 'Good afternoon' adalah ....", "selamat siang (sore)"),
      I("L1", "Arti 'Good night' adalah ....", "selamat malam")
    ],
    "big-B-2": [
      I("L1", "Angka 5 dalam bahasa Inggris adalah ....", "five"),
      I("L1", "Arti kata 'blue' adalah ....", "biru")
    ],
    "big-B-3": [
      I("L1", "Arti kata 'pencil' adalah ....", "pensil"),
      I("L1", "Arti kata 'eraser' adalah ....", "penghapus")
    ],
    "big-B-4": [
      I("L1", "Arti kata 'father' adalah ....", "ayah"),
      I("L1", "Arti kata 'mother' adalah ....", "ibu")
    ],
    "big-B-5": [
      I("L1", "Benda yang jauh darimu: '.... is her bag.' (This/That)", "That"),
      I("L1", "Bukuku dalam bahasa Inggris: .... book.", "my")
    ],
    "big-C-1": [
      I("L1", "Arti 'get up' adalah ....", "bangun (tidur)"),
      I("L1", "Arti 'take a bath' adalah ....", "mandi")
    ],
    "big-C-2": [
      I("L1", "Arti kata 'water' adalah ....", "air"),
      I("L1", "Arti kata 'rice' adalah ....", "nasi")
    ],
    "big-C-3": [
      I("L1", "Belok kiri dalam bahasa Inggris: Turn ....", "left"),
      I("L1", "Arti 'Stop' adalah ....", "berhenti")
    ],
    "big-C-4": [
      I("L1", "She .... (read) a book every night.", "reads"),
      I("L1", "We .... (go) to school every day.", "go")
    ],
    "big-C-5": [
      I("L1", "Arti kata 'short' adalah ....", "pendek"),
      I("L1", "Arti kata 'tall' adalah ....", "tinggi")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PG Seni Budaya (sampai 6 PG per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "seni-A-1": [
      P("L1", "Garis yang lurus dari kiri ke kanan disebut garis ...", "mendatar", "tegak", "lengkung", "zigzag"),
      P("L1", "Garis yang bentuknya seperti ombak disebut garis ...", "lengkung", "lurus", "tegak", "mendatar")
    ],
    "seni-A-2": [
      P("L1", "Jika gambar temanmu belum rapi, kita sebaiknya ...", "memberi saran dengan sopan", "menertawakannya", "merobeknya", "mencoretnya"),
      P("L1", "Menghargai karya teman ditunjukkan dengan ...", "tidak merusaknya", "mengejeknya", "menyembunyikannya", "mengambilnya"),
      P("L1", "Kalimat pujian yang sopan untuk gambar teman adalah ...", "Gambarmu rapi sekali", "Gambarmu jelek", "Aku tidak suka", "Gambarmu aneh")
    ],
    "seni-A-3": [
      P("L1", "Karya dari potongan kertas yang ditempel disebut ...", "kolase", "lukisan", "patung", "foto"),
      P("L1", "Alat yang dipakai untuk memotong kertas adalah ...", "gunting", "kuas", "penghapus", "penggaris"),
      P("L1", "Saat menggunting kertas, kita harus ...", "berhati-hati", "sambil berlari", "sambil bercanda", "mengarahkan ke teman")
    ],
    "seni-A-4": [
      P("L1", "Alat indra yang dipakai untuk mengamati benda adalah ...", "mata", "telinga", "hidung", "lidah"),
      P("L1", "Hal pertama sebelum menggambar buah adalah ...", "mengamati bentuk buah", "mewarnai", "membuang kertas", "menghapus gambar"),
      P("L1", "Saat mengamati bunga, bagian yang kita perhatikan adalah ...", "bentuk dan warnanya", "harganya", "jumlah temannya", "nama toko")
    ],
    "seni-A-5": [
      P("L1", "Warna merah sering menggambarkan perasaan ...", "semangat", "sedih", "bosan", "mengantuk"),
      P("L1", "Gambar hujan dan awan gelap cocok menggambarkan perasaan ...", "sedih", "gembira", "bangga", "lucu"),
      P("L1", "Anak yang gembira biasanya menggambar dengan warna yang ...", "cerah", "gelap", "pudar", "kusam")
    ],
    "seni-A-6": [
      P("L1", "Bunyi petir yang kuat termasuk bunyi ...", "keras", "lembut", "pelan", "sunyi"),
      P("L1", "Lagu 'Balonku' termasuk lagu ...", "anak-anak", "dangdut", "rock", "keroncong")
    ],
    "seni-A-7": [
      P("L1", "Saat memberi saran kepada teman, kita harus memakai bahasa yang ...", "sopan", "kasar", "keras", "mengejek"),
      P("L1", "Teman yang selesai bernyanyi sebaiknya kita beri ...", "tepuk tangan", "ejekan", "teriakan", "diam saja"),
      P("L1", "Tujuan memberi umpan balik adalah agar teman ...", "menjadi lebih baik", "malu", "marah", "berhenti belajar")
    ],
    "seni-A-8": [
      P("L1", "Pola irama yang dibunyikan guru sebaiknya kita ...", "dengarkan lalu tirukan", "abaikan", "ganti sendiri", "tertawakan"),
      P("L1", "Tepuk-tepuk-tepuk-diam jika diulang akan membentuk ...", "pola irama", "gambar", "cerita", "warna"),
      P("L1", "Urutan nada setelah 'do' dan 're' adalah ...", "mi", "si", "la", "sol")
    ],
    "seni-A-9": [
      P("L1", "Menepuk meja dengan pensil dapat menghasilkan ...", "bunyi irama", "warna", "bau", "rasa"),
      P("L1", "Alat musik yang digoyang dan berbunyi 'crek-crek' adalah ...", "marakas", "seruling", "gendang", "piano"),
      P("L1", "Menjentikkan jari dan menepuk paha bergantian dapat membuat ...", "pola irama", "lukisan", "patung", "gambar")
    ],
    "seni-A-10": [
      P("L1", "Orang yang bernyanyi disebut ...", "penyanyi", "penari", "pelukis", "pemain drama"),
      P("L1", "Sebelum bernyanyi bersama, kita sebaiknya ...", "menyimak aba-aba guru", "berteriak", "keluar kelas", "bermain lain"),
      P("L1", "Lagu yang kita sukai membuat kita merasa ...", "gembira", "marah", "takut", "sakit")
    ],
    "seni-A-11": [
      P("L1", "Orang yang menari disebut ...", "penari", "penyanyi", "pelukis", "dalang"),
      P("L1", "Gerak tari yang cepat biasanya mengikuti musik yang ...", "cepat", "sangat lambat", "tanpa bunyi", "tidak ada")
    ],
    "seni-A-12": [
      P("L1", "Menari ke depan, belakang, dan samping termasuk unsur ...", "ruang", "waktu", "tenaga", "warna"),
      P("L1", "Menghentakkan kaki dengan kuat termasuk unsur ...", "tenaga", "ruang", "rasa", "suara"),
      P("L1", "Anggota tubuh yang digerakkan saat menari disebut unsur ...", "tubuh", "warna", "suara", "rasa")
    ],
    "seni-A-13": [
      P("L1", "Saat menari bersama, kita harus menjaga ...", "jarak dengan teman", "makanan", "sepatu", "tas"),
      P("L1", "Setelah selesai tampil menari, kita mengucapkan ...", "terima kasih", "tidak apa-apa", "aku hebat sendiri", "diam"),
      P("L1", "Pakaian untuk menari sebaiknya ...", "nyaman dan tidak menghalangi gerak", "sempit sekali", "panjang sampai lantai", "berat sekali")
    ],
    "seni-A-14": [
      P("L1", "Gerak pertama dalam rangkaian disebut gerak ...", "awal", "akhir", "tengah", "bebas"),
      P("L1", "Menggabungkan beberapa gerak menjadi satu disebut ...", "merangkai gerak", "menghapus gerak", "menonton gerak", "melupakan gerak"),
      P("L1", "Rangkaian gerak sebaiknya dilakukan dengan urutan yang ...", "tetap dan teratur", "acak setiap kali", "dilupakan", "tidak jelas")
    ],
    "seni-A-15": [
      P("L1", "Anak yang rajin berlatih tari disebut anak yang ...", "tekun", "malas", "sombong", "pemalu"),
      P("L1", "Jika gerakan tari terasa sulit, kita sebaiknya ...", "berlatih lagi", "menangis", "pergi", "marah"),
      P("L1", "Bertanya kepada guru tentang tari menunjukkan rasa ...", "ingin tahu", "bosan", "takut", "marah")
    ],
    "seni-A-16": [
      P("L1", "Wajah yang tersenyum lebar menunjukkan ekspresi ...", "senang", "sedih", "marah", "takut"),
      P("L1", "Orang yang memainkan tokoh disebut ...", "pemain (pemeran)", "penonton", "penjahit", "pelukis")
    ],
    "seni-A-17": [
      P("L1", "Setelah bermain peran, kita boleh menceritakan ...", "perasaan kita", "rahasia teman", "nilai ulangan teman", "harga mainan"),
      P("L1", "Ketika memerankan tokoh yang sedih, wajah kita ...", "murung", "tertawa", "menari", "bersiul"),
      P("L1", "Perasaan senang, sedih, dan marah disebut ...", "emosi", "bentuk", "warna", "aturan")
    ],
    "seni-A-18": [
      P("L1", "Tongkat dan kacamata cocok untuk memerankan tokoh ...", "kakek", "bayi", "atlet", "pilot"),
      P("L1", "Properti yang cocok untuk tokoh petani adalah ...", "caping", "stetoskop", "helm pilot", "jas hujan polisi"),
      P("L1", "Properti sederhana dapat dibuat dari ...", "kardus bekas", "emas", "berlian", "mobil sungguhan")
    ],
    "seni-A-19": [
      P("L1", "Orang yang menonton pertunjukan disebut ...", "penonton", "pemain", "sutradara", "penyanyi"),
      P("L1", "Tokoh raksasa dalam cerita biasanya bersuara ...", "besar dan berat", "kecil sekali", "merdu seperti burung", "tidak bersuara"),
      P("L1", "Dalam cerita Kancil, tokoh Buaya biasanya digambarkan ...", "serakah", "rajin menolong", "pemalu", "sangat dermawan")
    ],
    "seni-A-20": [
      P("L1", "Gerak dan lagu dimainkan sambil ...", "bernyanyi dan bergerak", "tidur", "makan", "menggambar"),
      P("L1", "Saat bermain gerak dan lagu, kita sebaiknya ...", "menjaga jarak", "mendorong teman", "keluar barisan", "berteriak"),
      P("L1", "Lagu 'Kepala Pundak Lutut Kaki' dinyanyikan dengan ...", "menunjuk bagian tubuh", "tidur", "menggambar", "menulis")
    ],
    "seni-B-1": [
      P("L1", "Warna primer adalah ...", "merah, kuning, biru", "hijau, jingga, ungu", "hitam, putih, abu-abu", "merah, hijau, ungu"),
      P("L1", "Campuran warna merah dan biru menghasilkan warna ...", "ungu", "hijau", "jingga", "cokelat")
    ],
    "seni-B-2": [
      P("L1", "Warna yang dipakai pada gambar termasuk unsur ...", "seni rupa", "seni tari", "seni musik", "seni teater"),
      P("L1", "Saran yang membangun untuk gambar teman adalah ...", "Tambahkan warna agar lebih cerah", "Gambarmu jelek", "Kamu tidak berbakat", "Hapus semuanya"),
      P("L1", "Sebelum menilai karya, kita sebaiknya ...", "mengamatinya dengan teliti", "langsung mengejek", "tidak melihat", "mencoretnya")
    ],
    "seni-B-3": [
      P("L1", "Tempat mencampur cat air disebut ...", "palet", "kanvas", "bingkai", "penggaris"),
      P("L1", "Setelah memakai kuas, kita harus ...", "mencucinya", "membuangnya", "menjemur kotor", "mematahkannya"),
      P("L1", "Alat gambar dari lilin berwarna adalah ...", "krayon", "pensil", "kuas", "spidol papan")
    ],
    "seni-B-4": [
      P("L1", "Menggambar langsung dari benda yang dilihat disebut menggambar ...", "pengamatan", "imajinasi", "fotokopi", "menjiplak"),
      P("L1", "Menggambar kegiatan pasar yang pernah kita lihat adalah gambar dari ...", "pengalaman", "nol", "dongeng", "angka"),
      P("L1", "Hasil pengamatan sebaiknya dituangkan dalam bentuk ...", "sketsa", "suara", "aroma", "rasa")
    ],
    "seni-B-5": [
      P("L1", "Karya seni rupa dapat menyampaikan ...", "pesan dan perasaan", "rumus", "harga saham", "jadwal kereta"),
      P("L1", "Warna biru sering memberi kesan ...", "tenang", "marah", "panas", "ribut"),
      P("L1", "Poster 'Jaga Kebersihan' berisi ...", "pesan untuk menjaga kebersihan", "iklan makanan", "cerita sedih", "lagu daerah")
    ],
    "seni-B-6": [
      P("L1", "Alat musik tradisional Jawa Barat dari bambu adalah ...", "angklung", "sasando", "tifa", "kolintang"),
      P("L1", "Alat musik tradisional Jawa Tengah yang dimainkan bersama adalah ...", "gamelan", "piano", "biola", "gitar listrik")
    ],
    "seni-B-7": [
      P("L1", "Istilah untuk cepat lambatnya lagu adalah ...", "tempo", "dinamika", "melodi", "syair"),
      P("L1", "Penyanyi yang bernyanyi terlalu keras perlu diberi saran ...", "mengatur dinamika", "berhenti menyanyi", "mengganti syair", "pindah kelas"),
      P("L1", "Susunan nada yang berurutan dan indah disebut ...", "melodi", "tempo", "syair", "birama")
    ],
    "seni-B-8": [
      P("L1", "Alat musik bambu yang digoyang adalah ...", "angklung", "gendang", "rebana", "piano"),
      P("L1", "Cara merawat alat musik adalah ...", "membersihkan setelah dipakai", "membanting", "menjemur terus", "memukul keras"),
      P("L1", "Alat musik yang dimainkan dengan dipetik adalah ...", "gitar", "seruling", "drum", "pianika")
    ],
    "seni-B-9": [
      P("L1", "Tepuk tangan, hentakan kaki, dan jentikan jari termasuk ...", "body percussion", "nyanyian solo", "tari piring", "teater boneka"),
      P("L1", "Benda yang dipukul menghasilkan bunyi karena ...", "bergetar", "diam", "dingin", "basah"),
      P("L1", "Pola ketukan yang diulang teratur disebut ...", "irama", "warna", "bentuk", "aroma")
    ],
    "seni-B-10": [
      P("L1", "Agar mahir bermusik, kita harus ...", "rajin berlatih", "malas", "menunda", "menghindar"),
      P("L1", "Ketertarikan terhadap musik disebut ...", "minat", "bakat buruk", "rasa takut", "aturan"),
      P("L1", "Kegiatan di sekolah untuk menyalurkan minat musik adalah ...", "ekstrakurikuler musik", "upacara", "piket kelas", "istirahat")
    ],
    "seni-B-11": [
      P("L1", "Tari Pendet berasal dari daerah ...", "Bali", "Aceh", "Papua", "Maluku"),
      P("L1", "Tari Reog terkenal berasal dari ...", "Ponorogo, Jawa Timur", "Aceh", "Bali", "Papua")
    ],
    "seni-B-12": [
      P("L1", "Cepat atau lambatnya gerak termasuk unsur ...", "waktu", "ruang", "warna", "suara"),
      P("L1", "Posisi gerak tinggi, sedang, dan rendah disebut ...", "level", "tempo", "irama", "warna"),
      P("L1", "Kuat lemahnya gerak termasuk unsur ...", "tenaga", "ruang", "wangi", "rasa")
    ],
    "seni-B-13": [
      P("L1", "Gerak yang dilakukan bersamaan oleh semua penari disebut gerak ...", "serempak", "bergantian", "acak", "diam"),
      P("L1", "Penari kelompok harus saling ...", "menyesuaikan gerak", "menyalahkan", "menjauhi", "berebut"),
      P("L1", "Pola lantai garis lurus berarti penari berbaris ...", "lurus", "melingkar", "menyebar acak", "berputar")
    ],
    "seni-B-14": [
      P("L1", "Gerak dengan tangan terangkat tinggi termasuk level ...", "tinggi", "rendah", "diam", "bawah tanah"),
      P("L1", "Gerak melangkah dapat dikembangkan dengan mengubah ...", "arah dan kecepatan", "nama penari", "warna dinding", "jumlah kursi"),
      P("L1", "Gerak jongkok termasuk level ...", "rendah", "tinggi", "sedang", "langit")
    ],
    "seni-B-15": [
      P("L1", "Penari yang rajin berlatih akan ...", "semakin mahir", "semakin bingung", "berhenti", "tertidur"),
      P("L1", "Sebelum latihan tari, kita melakukan ...", "pemanasan", "makan banyak", "tidur", "bermain gawai"),
      P("L1", "Sikap gigih dalam belajar tari adalah ...", "tidak mudah menyerah", "mudah marah", "malas", "iri hati")
    ],
    "seni-B-16": [
      P("L1", "Percakapan satu pemeran sendirian disebut ...", "monolog", "dialog", "prolog", "opera"),
      P("L1", "Teks yang berisi dialog dan petunjuk adegan disebut ...", "naskah", "poster", "lagu", "peta")
    ],
    "seni-B-17": [
      P("L1", "Orang yang berperan dalam sebuah lakon disebut ...", "tokoh", "penonton", "penjual karcis", "penata cahaya"),
      P("L1", "Setelah pentas, kita menceritakan pengalaman dengan ...", "refleksi", "menyalahkan", "menyembunyikan", "berhenti belajar"),
      P("L1", "Penjual sayur di pasar dapat diperankan menjadi ...", "tokoh dalam lakon", "bendera", "alat musik", "lagu")
    ],
    "seni-B-18": [
      P("L1", "Pakaian pemain yang sesuai tokoh disebut ...", "kostum", "properti", "naskah", "layar"),
      P("L1", "Properti untuk tokoh nelayan adalah ...", "jaring", "cangkul", "stetoskop", "palu hakim"),
      P("L1", "Properti dipilih agar ...", "sesuai tokoh dan cerita", "paling mahal", "paling besar", "sama semua")
    ],
    "seni-B-19": [
      P("L1", "Sifat tokoh dalam cerita disebut ...", "watak", "latar", "alur", "tema"),
      P("L1", "Tokoh jahat yang menghalangi tokoh utama disebut ...", "antagonis", "protagonis", "penonton", "dalang"),
      P("L1", "Pemain memerankan tokoh pemalu dengan suara ...", "pelan dan kepala menunduk", "keras dan menantang", "menyanyi", "berteriak")
    ],
    "seni-B-20": [
      P("L1", "Teater tradisional Betawi yang penuh humor adalah ...", "lenong", "wayang kulit", "ketoprak", "ludruk"),
      P("L1", "Teater dengan boneka yang digerakkan tangan disebut teater ...", "boneka", "bayangan listrik", "angka", "puisi"),
      P("L1", "Teater tradisional Jawa dengan pemain mengenakan kostum cerita rakyat adalah ...", "ketoprak", "lenong", "pantomim", "opera barat")
    ],
    "seni-C-1": [
      P("L1", "Karya seni rupa dua dimensi hanya memiliki ...", "panjang dan lebar", "panjang, lebar, tinggi", "tinggi saja", "berat"),
      P("L1", "Karya yang bisa dilihat dari banyak sisi adalah karya ...", "tiga dimensi", "dua dimensi", "satu dimensi", "tanpa dimensi")
    ],
    "seni-C-2": [
      P("L1", "Pengulangan unsur secara teratur disebut prinsip ...", "irama", "kontras", "proporsi", "tekstur"),
      P("L1", "Perbedaan warna terang dan gelap yang mencolok disebut ...", "kontras", "harmoni", "irama", "kesatuan"),
      P("L1", "Penyatuan semua bagian karya sehingga serasi disebut ...", "kesatuan", "kontras", "tekstur", "garis")
    ],
    "seni-C-3": [
      P("L1", "Teknik menggosok pensil di atas kertas pada permukaan bertekstur adalah ...", "frotase", "kolase", "mozaik", "cetak saring"),
      P("L1", "Teknik mewarnai dengan cat air yang tipis dan bening adalah ...", "aquarel", "plakat", "arsir", "dusel"),
      P("L1", "Menempel potongan kertas berwarna membentuk gambar adalah teknik ...", "kolase", "frotase", "lukis air", "pahat")
    ],
    "seni-C-4": [
      P("L1", "Kemampuan membayangkan sesuatu yang belum ada disebut ...", "imajinasi", "observasi", "rutinitas", "refleksi"),
      P("L1", "Gambar awal sebelum karya jadi disebut ...", "sketsa", "poster", "patung", "lukisan akhir"),
      P("L1", "Menggabungkan pengamatan dan imajinasi menghasilkan karya yang ...", "kreatif", "biasa saja", "tidak jelas", "tiruan")
    ],
    "seni-C-5": [
      P("L1", "Ketertarikan pada suatu kegiatan disebut ...", "minat", "takdir", "rasa malas", "aturan"),
      P("L1", "Anak yang berminat pada musik dapat membuat karya rupa bertema ...", "alat musik", "rumus hitung", "cuaca saja", "bendera negara asing"),
      P("L1", "Karya yang mewakili minat menunjukkan ...", "kesukaan pembuatnya", "harga bahan", "nama guru", "jarak sekolah")
    ],
    "seni-C-7": [
      P("L1", "Kejelasan pengucapan syair disebut ...", "artikulasi", "tempo", "melodi", "ritme"),
      P("L1", "Dinamika forte berarti ...", "keras", "lembut", "cepat", "lambat"),
      P("L1", "Menilai penampilan musik kelompok dapat memakai istilah ...", "tempo dan dinamika", "warna dan garis", "gerak dan ruang", "naskah dan dialog")
    ],
    "seni-C-8": [
      P("L1", "Not seperempat pada birama 4/4 bernilai ...", "satu ketukan", "dua ketukan", "empat ketukan", "setengah ketukan"),
      P("L1", "Tanda dinamika piano berarti ...", "lembut", "keras", "cepat", "lambat"),
      P("L1", "Tanda dinamika forte berarti ...", "keras", "lembut", "cepat", "lambat")
    ],
    "seni-C-9": [
      P("L1", "Alat musik pukul dari Papua dan Maluku adalah ...", "tifa", "angklung", "kolintang", "sasando"),
      P("L1", "Alat musik dari Nusa Tenggara Timur yang dipetik adalah ...", "sasando", "tifa", "gamelan", "angklung"),
      P("L1", "Musik yang diwariskan turun-temurun di suatu daerah disebut musik ...", "tradisional", "modern", "elektronik", "asing")
    ],
    "seni-C-10": [
      P("L1", "Anak yang ingin tahu tentang musik daerah akan ...", "mencari tahu tentang alat musiknya", "menghindar", "tidak berlatih", "menyalahkan teman"),
      P("L1", "Cara mencari tahu lebih jauh tentang musik daerah adalah ...", "membaca dan bertanya", "menebak", "mengabaikan", "menunggu"),
      P("L1", "Ekstrakurikuler musik berguna untuk ...", "mengembangkan minat", "mengurangi belajar", "menambah libur", "menghindari teman")
    ],
    "seni-C-11": [
      P("L1", "Orang yang menyusun gerak tari disebut ...", "koreografer", "dalang", "sutradara", "komposer"),
      P("L1", "Tari Pendet berasal dari ...", "Bali", "Aceh", "Papua", "Maluku")
    ],
    "seni-C-12": [
      P("L1", "Pakaian penari disebut tata ...", "busana", "rias", "panggung", "suara"),
      P("L1", "Hiasan wajah penari disebut tata ...", "rias", "busana", "lampu", "suara"),
      P("L1", "Fungsi musik iringan dalam tari adalah ...", "mengatur irama dan suasana", "menghalangi gerak", "mengganti penari", "menutup panggung")
    ],
    "seni-C-13": [
      P("L1", "Pola yang dibentuk penari di lantai disebut ...", "pola lantai", "pola tenun", "pola kain", "pola batik"),
      P("L1", "Gerak yang dilakukan penari secara bersamaan disebut ...", "serempak", "bergantian", "tunggal", "diam"),
      P("L1", "Latihan tari kelompok harus ...", "dilakukan teratur bersama", "dilakukan sendiri saja", "ditunda terus", "tanpa musik")
    ],
    "seni-C-14": [
      P("L1", "Tari kreasi dibuat dengan mengembangkan gerak ...", "tradisional atau ide baru", "yang dilarang", "tanpa irama", "yang sudah punah"),
      P("L1", "Tari yang dibawakan oleh banyak orang disebut tari ...", "kelompok", "tunggal", "tanpa gerak", "duet"),
      P("L1", "Tari Jaipong berasal dari ...", "Jawa Barat", "Bali", "Aceh", "Papua")
    ],
    "seni-C-15": [
      P("L1", "Kejadian di sekitar dapat menjadi ... gerak tari.", "inspirasi", "hukuman", "alasan berhenti", "penghalang"),
      P("L1", "Pesan dalam tari disampaikan melalui ...", "gerak", "angka", "rumus", "peta"),
      P("L1", "Tari tentang petani menanam padi dapat memakai gerak ...", "menanam dan mencangkul", "menyelam", "terbang", "menembak")
    ],
    "seni-C-16": [
      P("L1", "Orang yang mengarahkan pementasan disebut ...", "sutradara", "penonton", "pelukis", "penjahit"),
      P("L1", "Orang yang menyaksikan pementasan disebut ...", "penonton", "pemain", "penulis naskah", "penata busana")
    ],
    "seni-C-17": [
      P("L1", "Tokoh yang berwatak baik dan menjadi pusat cerita disebut ...", "protagonis", "antagonis", "figuran", "penonton"),
      P("L1", "Tokoh yang menjadi lawan tokoh utama disebut ...", "antagonis", "protagonis", "sutradara", "pemandu"),
      P("L1", "Penokohan adalah ...", "pemberian watak pada tokoh", "penulisan judul", "pemilihan lagu", "penjualan karcis")
    ],
    "seni-C-18": [
      P("L1", "Penataan ruang dan benda di panggung disebut tata ...", "panggung", "rias", "suara", "busana"),
      P("L1", "Penataan cahaya pada pementasan disebut tata ...", "lampu", "panggung", "rias", "suara"),
      P("L1", "Properti untuk adegan pasar dapat berupa ...", "keranjang dan timbangan", "stetoskop", "jangkar", "pesawat")
    ],
    "seni-C-19": [
      P("L1", "Suara pelan dan bergetar cocok untuk tokoh yang ...", "takut", "gembira", "marah besar", "berani"),
      P("L1", "Gerak dan sikap tubuh sesuai tokoh disebut ...", "gestur", "tempo", "melodi", "sketsa"),
      P("L1", "Tokoh nenek berbeda dari tokoh remaja dalam hal ...", "gerak dan suara", "jumlah jari", "warna mata saja", "nama tempat")
    ],
    "seni-C-20": [
      P("L1", "Latihan terakhir sebelum pentas disebut ...", "gladi resik", "upacara", "ulangan", "pameran"),
      P("L1", "Hal yang perlu dipersiapkan sebelum pentas adalah ...", "naskah, pemain, properti", "hanya kursi", "hanya tiket", "hanya spanduk"),
      P("L1", "Setelah pentas selesai, pemain sebaiknya ...", "mengevaluasi penampilan", "menghilang", "menyalahkan teman", "merusak properti")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PG Matematika (sampai 6 PG per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "mtk-A-1": [
      P("L1", "Bilangan setelah 59 adalah ...", "60", "58", "69", "50"),
      P("L1", "Bilangan 91 dibaca ...", "sembilan puluh satu", "sembilan belas satu", "sembilan puluh", "sepuluh sembilan")
    ],
    "mtk-A-2": [
      P("L1", "Nilai angka 5 pada bilangan 52 adalah ...", "50", "5", "2", "52"),
      P("L1", "70 + 3 = ...", "73", "37", "703", "10")
    ],
    "mtk-A-3": [
      P("L1", "13 - 6 = ...", "7", "6", "8", "19"),
      P("L1", "Ada 12 apel. Sebanyak 5 apel dimakan. Sisa apel adalah ...", "7", "17", "6", "8")
    ],
    "mtk-A-4": [
      P("L1", "Satu dari tiga bagian sama besar ditulis ...", "1/3", "1/2", "1/4", "3/1")
    ],
    "mtk-A-6": [
      P("L1", "Pola: 1, 2, 1, 2, 1, ... Angka berikutnya adalah ...", "2", "1", "3", "0")
    ],
    "mtk-A-7": [
      P("L1", "Hari sebelum Rabu adalah ...", "Selasa", "Kamis", "Senin", "Jumat"),
      P("L1", "Jarum pendek menunjuk angka 6 dan jarum panjang menunjuk angka 12. Pukul berapa itu?", "06.00", "12.06", "06.12", "12.00")
    ],
    "mtk-A-8": [
      P("L1", "Meja diukur 4 jengkal dan papan 7 jengkal. Yang lebih panjang adalah ...", "papan", "meja", "sama panjang", "tidak tahu"),
      P("L1", "Satuan tidak baku untuk mengukur panjang kelas adalah ...", "langkah", "kilogram", "meter", "liter")
    ],
    "mtk-A-9": [
      P("L1", "Persegi memiliki ... sisi.", "4", "3", "5", "6"),
      P("L1", "Benda yang berbentuk persegi panjang adalah ...", "buku tulis", "bola", "roda", "kelereng")
    ],
    "mtk-A-10": [
      P("L1", "Lawan kata 'atas' adalah ...", "bawah", "depan", "kiri", "kanan")
    ],
    "mtk-A-11": [
      P("L1", "Data: kucing 5, ayam 3, ikan 7. Hewan yang paling sedikit adalah ...", "ayam", "kucing", "ikan", "sama banyak"),
      P("L1", "Pada diagram gambar, satu ☺ mewakili 1 anak. Ada 4 ☺ untuk bola. Jumlah anak yang suka bola adalah ...", "4", "1", "5", "8")
    ],
    "mtk-B-1": [
      P("L1", "Bilangan 6.080 dibaca ...", "enam ribu delapan puluh", "enam ribu delapan ratus", "enam ribu delapan", "enam ratus delapan puluh"),
      P("L1", "Nilai angka 5 pada bilangan 5.208 adalah ...", "5.000", "500", "50", "5")
    ],
    "mtk-B-2": [
      P("L1", "63 + 29 = ...", "92", "82", "91", "93"),
      P("L1", "90 - 47 = ...", "43", "53", "47", "37")
    ],
    "mtk-B-4": [
      P("L1", "Semua faktor dari 10 adalah ...", "1, 2, 5, 10", "1, 5, 10", "2, 4, 5", "1, 10, 20"),
      P("L1", "Tiga kelipatan 4 yang pertama adalah ...", "4, 8, 12", "4, 6, 8", "2, 4, 6", "4, 12, 16")
    ],
    "mtk-B-5": [
      P("L1", "1/2 + 1/4 = ...", "3/4", "2/6", "2/4", "1/8"),
      P("L1", "Pecahan yang paling kecil adalah ...", "1/8", "1/2", "1/4", "3/4")
    ],
    "mtk-B-6": [
      P("L1", "0,25 ditulis sebagai pecahan ...", "1/4", "1/2", "25/10", "2/5"),
      P("L1", "0,7 sama dengan pecahan ...", "7/10", "7/100", "1/7", "70/10")
    ],
    "mtk-B-7": [
      P("L1", "... - 25 = 40. Bilangan yang tepat adalah ...", "65", "15", "75", "25")
    ],
    "mtk-B-8": [
      P("L1", "Pola 3, 6, 9, 12, ... Bilangan berikutnya adalah ...", "15", "14", "16", "18"),
      P("L1", "Pola 1, 3, 5, 7, ... Bilangan berikutnya adalah ...", "9", "8", "10", "11"),
      P("L1", "Pola 60, 55, 50, 45, ... Bilangan berikutnya adalah ...", "40", "35", "44", "50")
    ],
    "mtk-B-10": [
      P("L1", "Luas persegi panjang berukuran 8 cm × 3 cm adalah ...", "24 cm2", "11 cm2", "22 cm2", "48 cm2"),
      P("L1", "Luas persegi dengan sisi 5 cm adalah ...", "25 cm2", "20 cm2", "10 cm2", "15 cm2")
    ],
    "mtk-B-11": [
      P("L1", "Persegi memiliki ... sudut siku-siku.", "4", "2", "3", "0")
    ],
    "mtk-B-12": [
      P("L1", "Data: 5, 8, 6, 9. Jumlah semua data adalah ...", "28", "26", "27", "30"),
      P("L1", "Pada diagram batang, batang yang paling tinggi menunjukkan data yang ...", "paling banyak", "paling sedikit", "bernilai nol", "tidak ada")
    ],
    "mtk-C-1": [
      P("L1", "Bilangan 703.040 dibaca ...", "tujuh ratus tiga ribu empat puluh", "tujuh ratus tiga puluh ribu empat puluh", "tujuh ribu tiga ratus empat puluh", "tujuh puluh ribu tiga ratus empat puluh"),
      P("L1", "Nilai angka 3 pada bilangan 536.120 adalah ...", "30.000", "3.000", "300.000", "300")
    ],
    "mtk-C-3": [
      P("L1", "KPK dari 4 dan 6 adalah ...", "12", "24", "2", "10"),
      P("L1", "FPB dari 20 dan 30 adalah ...", "10", "5", "60", "20")
    ],
    "mtk-C-4": [
      P("L1", "2/3 + 1/6 = ...", "5/6", "3/9", "3/6", "4/9"),
      P("L1", "5/6 - 1/3 = ...", "1/2", "1/3", "2/3", "4/3")
    ],
    "mtk-C-5": [
      P("L1", "Bentuk persen dari 0,25 adalah ...", "25%", "2,5%", "250%", "0,25%"),
      P("L1", "Diskon 10% dari harga Rp80.000 adalah ...", "Rp8.000", "Rp800", "Rp10.000", "Rp80.000")
    ],
    "mtk-C-11": [
      P("L1", "Pada peta berpetak, titik (C, 2) berada pada ...", "kolom C, baris 2", "kolom 2, baris C", "kolom A, baris 2", "kolom C, baris 3"),
      P("L1", "Rumah berada di (B, 2). Toko dua petak ke kanan dari rumah. Letak toko adalah ...", "(D, 2)", "(B, 4)", "(A, 2)", "(D, 4)")
    ],
    "mtk-C-12": [
      P("L1", "Median dari data 2, 4, 6, 8, 10 adalah ...", "6", "5", "8", "4"),
      P("L1", "Modus dari data 2, 3, 3, 5, 5, 5, 6 adalah ...", "5", "3", "2", "6")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PG PP, PJOK, IPAS (sampai 6 PG per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "pp-A-2": [
      P("L1", "Menjenguk teman yang sakit mencerminkan sila ...", "kedua", "pertama", "ketiga", "keempat"),
      P("L1", "Memilih ketua kelas dengan musyawarah mencerminkan sila ...", "keempat", "pertama", "kedua", "kelima")
    ],
    "pp-A-3": [
      P("L1", "Hak murid di sekolah adalah ...", "mendapat pelajaran dari guru", "membuang sampah sembarangan", "terlambat masuk kelas", "mengganggu teman"),
      P("L1", "Kewajiban murid di rumah adalah ...", "membantu orang tua", "bermain terus", "marah kepada adik", "menolak belajar")
    ],
    "pp-A-4": [
      P("L1", "Teman berbeda agama sebaiknya kita ...", "hormati", "jauhi", "ejek", "musuhi"),
      P("L1", "Hidup rukun walaupun berbeda disebut hidup ...", "bersatu dalam keberagaman", "terpecah", "saling benci", "menyendiri")
    ],
    "pp-A-5": [
      P("L1", "Ibu kota negara kita adalah ...", "Jakarta", "Surabaya", "Bandung", "Medan"),
      P("L1", "Bendera negara kita bernama ...", "Sang Merah Putih", "Sang Biru Putih", "Sang Merah Kuning", "Sang Hijau Putih")
    ],
    "pp-B-3": [
      P("L1", "Orang yang taat aturan disebut orang yang ...", "disiplin", "ceroboh", "malas", "sombong"),
      P("L1", "Jika ada aturan di kampung, warga sebaiknya ...", "mematuhinya", "melanggarnya", "menertawakannya", "tidak peduli")
    ],
    "pp-B-4": [
      P("L1", "Hak anak untuk mendapat pendidikan dilindungi oleh ...", "negara", "teman", "tetangga", "penjual"),
      P("L1", "Melaksanakan kewajiban sebelum menuntut hak berarti ...", "bertanggung jawab", "egois", "malas", "curang")
    ],
    "pp-B-5": [
      P("L1", "Perbedaan suku dan budaya merupakan ... bangsa kita.", "kekayaan", "masalah", "beban", "kekurangan"),
      P("L1", "Menghormati teman yang beribadah berbeda dengan kita disebut ...", "toleransi", "iri", "ejekan", "pilih kasih")
    ],
    "pp-B-6": [
      P("L1", "Pemimpin di tingkat desa disebut ...", "kepala desa", "camat", "bupati", "gubernur"),
      P("L1", "Beberapa desa bergabung membentuk satu ...", "kecamatan", "RT", "RW", "dusun")
    ],
    "pp-C-1": [
      P("L1", "Dasar negara Indonesia adalah ...", "Pancasila", "Proklamasi", "Bhinneka", "Garuda"),
      P("L1", "Rumusan Pancasila yang sah terdapat pada ...", "Pembukaan UUD 1945", "bendera", "lagu kebangsaan", "peta")
    ],
    "pp-C-2": [
      P("L1", "Sila ketiga Pancasila berbunyi ...", "Persatuan Indonesia", "Kemanusiaan yang adil dan beradab", "Ketuhanan Yang Maha Esa", "Keadilan sosial bagi seluruh rakyat Indonesia"),
      P("L1", "Lambang sila pertama Pancasila adalah ...", "bintang", "rantai", "pohon beringin", "kepala banteng")
    ],
    "pp-C-4": [
      P("L1", "Hasil musyawarah yang disepakati bersama disebut ...", "mufakat", "perpecahan", "keputusan sepihak", "paksaan"),
      P("L1", "Perbedaan pendapat dalam diskusi sebaiknya ...", "disampaikan dengan santun", "dipaksakan", "diabaikan", "ditertawakan")
    ],
    "pp-C-5": [
      P("L1", "Budaya daerah dapat dilestarikan dengan ...", "mempelajari dan mempraktikkannya", "melupakannya", "mengejeknya", "menjualnya semua"),
      P("L1", "Tari Saman berasal dari ...", "Aceh", "Bali", "Jawa Barat", "Papua")
    ],
    "pp-C-7": [
      P("L1", "Sikap rela berkorban demi bangsa disebut ...", "patriotisme", "egoisme", "individualisme", "materialisme"),
      P("L1", "Upacara bendera menumbuhkan semangat ...", "cinta tanah air", "bermalas-malasan", "bermusuhan", "mementingkan diri")
    ],
    "pjok-A-2": [
      P("L1", "Berjalan pelan atau cepat disebut mengatur ... gerak.", "kecepatan", "warna", "suara", "bentuk"),
      P("L1", "Saat berlari di halaman, kita harus ...", "melihat ke depan", "menutup mata", "mendorong teman", "berlari ke segala arah")
    ],
    "pjok-A-3": [
      P("L1", "Permainan dengan aturan membuat permainan menjadi ...", "adil", "kacau", "berbahaya", "membosankan"),
      P("L1", "Teman kalah dan sedih, kita sebaiknya ...", "menghibur", "mengejek", "meninggalkan", "menertawakan")
    ],
    "pjok-A-4": [
      P("L1", "Olahraga membuat tubuh menjadi ...", "sehat", "lemah", "sakit", "lelah terus"),
      P("L1", "Pakaian yang baik untuk berolahraga adalah ...", "pakaian olahraga yang nyaman", "jaket tebal", "baju pesta", "sandal rumah")
    ],
    "pjok-A-5": [
      P("L1", "Memotong kuku secara rutin menjaga kebersihan ...", "badan", "rumah", "mainan", "kelas"),
      P("L1", "Tangan sebelum makan harus ...", "dicuci dengan sabun", "dikotori", "dilap baju", "dibiarkan")
    ],
    "pjok-A-6": [
      P("L1", "Menyeberang jalan yang aman dilakukan di ...", "zebra cross", "tengah jalan", "tikungan", "dekat truk"),
      P("L1", "Orang yang tidak dikenal memberi permen dan mengajak pergi, kita ...", "menolak dan lapor orang dewasa", "ikut", "menerima dan pergi", "diam saja")
    ],
    "pjok-B-1": [
      P("L1", "Permainan yang bola dipukul melewati net adalah ...", "bola voli", "sepak bola", "kasti", "atletik"),
      P("L1", "Memasukkan bola ke ring adalah permainan ...", "bola basket", "bola voli", "sepak bola", "kasti")
    ],
    "pjok-B-2": [
      P("L1", "Senam yang dilakukan di atas matras disebut senam ...", "lantai", "irama", "ritmik tali", "pagar"),
      P("L1", "Gerak senam berguling ke belakang disebut ...", "guling belakang", "guling depan", "kayang", "lompat")
    ],
    "pjok-B-3": [
      P("L1", "Rencana cara bermain agar tim menang disebut ...", "strategi", "hukuman", "undian", "kebiasaan"),
      P("L1", "Orang yang memimpin pertandingan disebut ...", "wasit", "penonton", "suporter", "pelatih")
    ],
    "pjok-B-4": [
      P("L1", "Kerja sama dalam tim berarti ...", "saling membantu", "berebut bola", "bermain sendiri", "menyalahkan teman"),
      P("L1", "Pemain yang mengakui kesalahan menunjukkan sikap ...", "jujur", "curang", "sombong", "licik")
    ],
    "pjok-B-5": [
      P("L1", "Kemampuan mengubah arah dengan cepat disebut ...", "kelincahan", "kekuatan", "kelenturan", "daya tahan"),
      P("L1", "Meregangkan badan ke depan melatih ...", "kelenturan", "kecepatan", "kekuatan", "kelincahan")
    ],
    "pjok-B-6": [
      P("L1", "Makanan bergizi seimbang terdiri atas makanan pokok, lauk, sayur, dan ...", "buah", "permen", "minuman bersoda", "keripik"),
      P("L1", "Tidur yang cukup membuat tubuh ...", "segar", "mudah sakit", "lemas", "sulit belajar")
    ],
    "pjok-B-7": [
      P("L1", "Singkatan P3K adalah ...", "Pertolongan Pertama pada Kecelakaan", "Pusat Pelatihan Kesehatan", "Pemeriksaan Pertama Kesehatan", "Persiapan Pasien Kritis"),
      P("L1", "Luka kecil yang berdarah sebaiknya ...", "dibersihkan lalu ditutup plester", "digosok kuat", "dibiarkan kotor", "dilumuri tanah")
    ],
    "pjok-C-1": [
      P("L1", "Jumlah pemain bola basket di lapangan dalam satu tim adalah ...", "5", "6", "9", "11"),
      P("L1", "Permainan bulu tangkis memakai ...", "raket dan kok", "bola dan gawang", "ring dan bola", "tongkat dan bola")
    ],
    "pjok-C-3": [
      P("L1", "Menguji dua strategi gerak dilakukan dengan ...", "membandingkan hasilnya", "menebak", "memilih sembarang", "menghindarinya"),
      P("L1", "Strategi yang kurang berhasil sebaiknya ...", "diperbaiki", "diulang tanpa belajar", "dilupakan", "disalahkan pada teman")
    ],
    "pjok-C-4": [
      P("L1", "Menghormati keputusan wasit menunjukkan sikap ...", "sportif", "curang", "iri", "sombong"),
      P("L1", "Menang tanpa curang menunjukkan ...", "kejujuran", "kelicikan", "keserakahan", "kebencian")
    ],
    "pjok-C-5": [
      P("L1", "Latihan lari jarak jauh melatih ...", "daya tahan", "kelenturan", "kecepatan saja", "keseimbangan saja"),
      P("L1", "Agar tubuh tetap bugar, kita sebaiknya ...", "berolahraga teratur", "tidur seharian", "makan berlebihan", "menunda gerak")
    ],
    "pjok-C-6": [
      P("L1", "Kurang gerak dapat menyebabkan ...", "berat badan berlebih", "tubuh lebih kuat", "daya tahan meningkat", "lebih lincah"),
      P("L1", "Gaya hidup sehat ditunjukkan dengan ...", "aktif bergerak", "begadang", "jajan berlebihan", "duduk berjam-jam")
    ],
    "pjok-C-7": [
      P("L1", "Zat gizi pembangun tubuh adalah ...", "protein", "karbohidrat", "lemak saja", "air saja"),
      P("L1", "Sumber karbohidrat adalah ...", "nasi", "ikan", "bayam", "jeruk")
    ],
    "pjok-C-8": [
      P("L1", "Pada prinsip RICE, huruf R berarti ...", "istirahat (Rest)", "lari", "renang", "ringan"),
      P("L1", "Pada prinsip RICE, huruf C berarti ...", "kompresi (membalut)", "cepat", "cuci", "campur")
    ],
    "ipas-B-1": [
      P("L1", "Telinga berfungsi sebagai indra ...", "pendengar", "pengecap", "penglihat", "peraba"),
      P("L1", "Jumlah panca indra manusia adalah ...", "lima", "tiga", "enam", "sepuluh")
    ],
    "ipas-B-2": [
      P("L1", "Bagian tumbuhan yang berfungsi membuat makanan adalah ...", "daun", "akar", "batang", "biji"),
      P("L1", "Tahap setelah ulat pada daur hidup kupu-kupu adalah ...", "kepompong", "telur", "kupu-kupu muda", "larva baru")
    ],
    "ipas-B-4": [
      P("L1", "Sumber energi terbesar bagi makhluk hidup adalah ...", "matahari", "bulan", "bintang kecil", "lilin"),
      P("L1", "Lampu mengubah energi listrik menjadi energi ...", "cahaya", "bunyi", "gerak", "kimia")
    ],
    "ipas-B-5": [
      P("L1", "Menarik pintu termasuk gaya ...", "tarik", "dorong", "gesek", "magnet"),
      P("L1", "Gaya yang menghambat gerak benda saat bersentuhan permukaan adalah gaya ...", "gesek", "dorong", "magnet", "listrik")
    ],
    "ipas-B-6": [
      P("L1", "Sumber daya alam yang tidak dapat diperbarui adalah ...", "minyak bumi", "air", "udara", "tumbuhan"),
      P("L1", "Menanam kembali pohon di hutan gundul disebut ...", "reboisasi", "penebangan", "pembakaran", "pengerukan"),
      P("L1", "Cara menghemat listrik adalah ...", "mematikan lampu yang tidak dipakai", "menyalakan semua lampu", "membiarkan kipas menyala", "membuka kulkas lama")
    ],
    "ipas-B-7": [
      P("L1", "Kelompok sosial terkecil adalah ...", "keluarga", "RT", "desa", "kecamatan"),
      P("L1", "Kegiatan membersihkan lingkungan bersama warga disebut ...", "kerja bakti", "ronda", "arisan", "wisata")
    ],
    "ipas-B-8": [
      P("L1", "Arah matahari terbit adalah ...", "timur", "barat", "utara", "selatan"),
      P("L1", "Peta dibuat pada bidang ...", "datar", "bulat", "cembung", "melengkung")
    ],
    "ipas-B-9": [
      P("L1", "Rumah gadang berasal dari ...", "Sumatera Barat", "Jawa Barat", "Bali", "Papua"),
      P("L1", "Bahasa daerah yang banyak dipakai di Jawa Barat adalah bahasa ...", "Sunda", "Jawa", "Bali", "Batak")
    ],
    "ipas-B-10": [
      P("L1", "Ilmu yang mempelajari peristiwa masa lalu adalah ...", "sejarah", "geografi", "ekonomi", "biologi"),
      P("L1", "Cara mendapatkan cerita sejarah kampung dari sesepuh adalah ...", "wawancara", "menebak", "mengarang", "membayangkan")
    ],
    "ipas-B-11": [
      P("L1", "Tempat menyimpan uang yang dikelola lembaga keuangan disebut ...", "bank", "pasar", "toko", "terminal")
    ],
    "ipas-B-12": [
      P("L1", "Langkah pertama dalam penyelidikan sederhana adalah ...", "mengamati", "menyimpulkan", "mencatat hasil akhir", "menghapus data"),
      P("L1", "Hasil percobaan dapat dicatat dalam ...", "tabel", "lagu", "cerita", "gambar acak")
    ],
    "ipas-C-1": [
      P("L1", "Organ yang menyerap sari makanan adalah usus ...", "halus", "besar", "buntu", "dua belas jari"),
      P("L1", "Gas yang kita hirup dan dibutuhkan tubuh adalah ...", "oksigen", "karbon dioksida", "nitrogen saja", "hidrogen")
    ],
    "ipas-C-2": [
      P("L1", "Hewan pemakan tumbuhan dan daging disebut ...", "omnivora", "herbivora", "karnivora", "produsen"),
      P("L1", "Dalam rantai makanan, tumbuhan hijau disebut ...", "produsen", "konsumen", "pengurai", "predator")
    ],
    "ipas-C-3": [
      P("L1", "Bunyi tidak dapat merambat di ruang ...", "hampa", "udara", "air", "logam"),
      P("L1", "Benda yang memancarkan cahaya sendiri adalah ...", "matahari", "bulan", "cermin", "buku")
    ],
    "ipas-C-4": [
      P("L1", "Dua kutub magnet yang berbeda akan ...", "tarik-menarik", "tolak-menolak", "diam saja", "terbakar"),
      P("L1", "Jika saklar dibuka, lampu pada rangkaian listrik ...", "padam", "menyala terang", "menyala redup", "meledak")
    ],
    "ipas-C-6": [
      P("L1", "Warna biru pada peta biasanya menunjukkan ...", "perairan", "pegunungan", "dataran tinggi", "kota"),
      P("L1", "Arah antara utara dan timur disebut ...", "timur laut", "barat daya", "tenggara", "barat laut")
    ],
    "ipas-C-7": [
      P("L1", "Wakil presiden pertama Indonesia adalah ...", "Mohammad Hatta", "Adam Malik", "Sutan Sjahrir", "Ki Hajar Dewantara"),
      P("L1", "Kerajaan Hindu-Buddha di Jawa Timur yang terkenal adalah ...", "Majapahit", "Samudra Pasai", "Demak", "Mataram Islam")
    ],
    "ipas-C-8": [
      P("L1", "Kearifan lokal Bali dalam mengatur air sawah adalah ...", "subak", "sasi", "tabuik", "ngaben"),
      P("L1", "Keberagaman bangsa Indonesia merupakan ...", "kekayaan", "masalah", "beban", "kelemahan")
    ],
    "ipas-C-10": [
      P("L1", "Variabel yang diamati hasilnya disebut variabel ...", "terikat", "bebas", "kontrol", "acak"),
      P("L1", "Variabel yang dijaga tetap sama disebut variabel ...", "kontrol", "bebas", "terikat", "acak")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN PG B. Indonesia dan B. Inggris (sampai 6 PG per TP) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "bin-A-1": [
      P("L1", "Ketika guru memberi pesan, kita harus ...", "menyimak dengan baik", "mengobrol", "bermain", "keluar kelas"),
      P("L1", "Ibu berpesan, \"Tutup pintu setelah masuk.\" Yang harus dilakukan adalah ...", "menutup pintu", "membuka jendela", "mematikan lampu", "menyapu lantai"),
      P("L1", "Tokoh dalam cerita adalah ...", "pelaku dalam cerita", "tempat cerita", "judul cerita", "pengarang")
    ],
    "bin-A-2": [
      P("L1", "Kata \"meja\" terdiri atas ... suku kata.", "dua", "satu", "tiga", "empat"),
      P("L1", "Huruf pertama kata \"ikan\" adalah ...", "i", "k", "a", "n")
    ],
    "bin-A-3": [
      P("L1", "Ani menanam bunga di kebun. Ani menanam bunga di ...", "kebun", "rumah", "kelas", "pasar"),
      P("L1", "Ayah membeli ikan di pasar. Ayah membeli ...", "ikan", "sayur", "buku", "baju")
    ],
    "bin-A-4": [
      P("L1", "Ketika meminta maaf, kita mengucapkan ...", "Maaf, aku salah", "Aku tidak mau", "Biarkan saja", "Terserah"),
      P("L1", "Ketika diberi bantuan oleh teman, kita berkata ...", "Terima kasih", "Biasa saja", "Tidak apa", "Kamu salah")
    ],
    "bin-A-5": [
      P("L1", "Tanda tanya dipakai pada akhir kalimat ...", "tanya", "berita", "perintah", "seruan"),
      P("L1", "Kalimat yang benar adalah ...", "Dina membaca buku.", "dina membaca buku", "Dina Membaca buku", "dina membaca buku.")
    ],
    "bin-A-6": [
      P("L1", "Susunan yang benar dari \"Rani, minum, susu\" adalah ...", "Rani minum susu.", "Minum Rani susu.", "Susu minum Rani.", "Rani susu minum."),
      P("L1", "Kata yang cocok: \"Ayam berkokok di ... hari.\"", "pagi", "dapur", "laut", "jalan")
    ],
    "bin-B-1": [
      P("L1", "Kata tanya untuk menanyakan tempat adalah ...", "di mana", "siapa", "kapan", "mengapa"),
      P("L1", "Kata tanya untuk menanyakan alasan adalah ...", "mengapa", "siapa", "kapan", "bagaimana")
    ],
    "bin-B-2": [
      P("L1", "Kalimat yang berisi gagasan pokok paragraf adalah kalimat ...", "utama", "penjelas", "tanya", "seru"),
      P("L1", "Satu paragraf yang baik membahas ...", "satu ide pokok", "banyak ide", "tidak ada ide", "hanya judul")
    ],
    "bin-B-3": [
      P("L1", "Teks yang berisi langkah-langkah membuat sesuatu disebut teks ...", "prosedur", "narasi", "deskripsi", "puisi"),
      P("L1", "Teks yang menggambarkan keindahan pantai termasuk teks ...", "deskripsi", "prosedur", "narasi", "dialog")
    ],
    "bin-B-4": [
      P("L1", "Kata \"kemudian\" menandai bagian ... cerita.", "tengah", "awal", "akhir", "judul"),
      P("L1", "Cerita liburan sebaiknya disampaikan secara ...", "runtut", "acak", "terputus", "berlawanan")
    ],
    "bin-B-5": [
      P("L1", "Tanda koma dipakai untuk memisahkan ... dalam kalimat.", "rincian benda", "akhir kalimat", "judul", "nama kota saja"),
      P("L1", "Kalimat yang memakai koma dengan benar adalah ...", "Ibu membeli apel, jeruk, dan mangga.", "ibu membeli apel jeruk dan mangga", "Ibu membeli apel jeruk dan mangga", "ibu Membeli apel, jeruk, dan mangga")
    ],
    "bin-B-6": [
      P("L1", "Sinonim kata \"senang\" adalah ...", "gembira", "sedih", "marah", "takut"),
      P("L1", "Antonim kata \"rajin\" adalah ...", "malas", "tekun", "giat", "ulet")
    ],
    "bin-C-1": [
      P("L1", "Pertanyaan \"kapan\" digunakan untuk menanyakan ...", "waktu", "orang", "tempat", "sebab"),
      P("L1", "Pertanyaan \"siapa\" digunakan untuk menanyakan ...", "orang", "waktu", "tempat", "cara")
    ],
    "bin-C-2": [
      P("L1", "Pernyataan \"Menurut saya, mangga paling enak\" termasuk ...", "opini", "fakta", "berita", "perintah"),
      P("L1", "Pernyataan \"Air mendidih pada suhu 100 derajat Celsius\" termasuk ...", "fakta", "opini", "saran", "harapan")
    ],
    "bin-C-3": [
      P("L1", "Sifat tokoh dalam cerita disebut ...", "watak", "alur", "latar", "amanat"),
      P("L1", "Urutan peristiwa dalam cerita disebut ...", "alur", "tokoh", "latar", "judul")
    ],
    "bin-C-4": [
      P("L1", "Orang yang menyampaikan presentasi disebut ...", "pembicara", "moderator", "notulis", "penonton"),
      P("L1", "Kesimpulan diskusi disampaikan pada bagian ...", "akhir", "awal", "tengah", "judul")
    ],
    "bin-C-5": [
      P("L1", "Surat kepada kepala sekolah untuk keperluan sekolah termasuk surat ...", "resmi", "pribadi", "puisi", "cerita"),
      P("L1", "Salam penutup pada surat pribadi dapat berupa ...", "Salam sayang", "Dengan hormat", "Kepada Yth.", "Perihal")
    ],
    "big-B-1": [
      P("L1", "\"Good afternoon\" berarti ...", "selamat siang (sore)", "selamat pagi", "selamat malam", "sampai jumpa"),
      P("L1", "\"Thank you\" berarti ...", "terima kasih", "maaf", "selamat tinggal", "tolong")
    ],
    "big-B-2": [
      P("L1", "Angka \"five\" adalah ...", "5", "15", "50", "4"),
      P("L1", "\"Blue\" berarti warna ...", "biru", "merah", "hijau", "kuning")
    ],
    "big-B-3": [
      P("L1", "\"Pencil\" berarti ...", "pensil", "penghapus", "penggaris", "buku"),
      P("L1", "\"Close the door\" berarti ...", "tutup pintu", "buka pintu", "duduk", "berdiri")
    ],
    "big-B-4": [
      P("L1", "\"Sister\" berarti ...", "saudara perempuan", "saudara laki-laki", "ibu", "nenek"),
      P("L1", "\"Grandfather\" berarti ...", "kakek", "nenek", "paman", "ayah")
    ],
    "big-B-5": [
      P("L1", "Benda jauh darimu: \"... is her bag.\" Kata yang tepat adalah ...", "That", "This", "These", "Those"),
      P("L1", "Bukuku dalam bahasa Inggris adalah ...", "my book", "your book", "his book", "her book")
    ],
    "big-C-1": [
      P("L1", "\"Take a bath\" berarti ...", "mandi", "makan", "tidur", "bangun"),
      P("L1", "Pukul 09.00 dibaca ...", "nine o'clock", "nine thirty", "ten o'clock", "half past nine")
    ],
    "big-C-2": [
      P("L1", "\"Water\" berarti ...", "air", "nasi", "susu", "roti"),
      P("L1", "\"I like fruits.\" berarti ...", "Aku suka buah-buahan.", "Aku suka sayur.", "Aku makan nasi.", "Aku minum air.")
    ],
    "big-C-3": [
      P("L1", "\"Turn right\" berarti ...", "belok kanan", "belok kiri", "jalan lurus", "berhenti"),
      P("L1", "\"Stop\" berarti ...", "berhenti", "jalan", "belok", "mundur")
    ],
    "big-C-4": [
      P("L1", "She ... a letter every week.", "writes", "write", "writing", "written"),
      P("L1", "We ... to school by bus.", "go", "goes", "going", "gone")
    ],
    "big-C-5": [
      P("L1", "\"Short\" berarti ...", "pendek", "panjang", "tinggi", "besar"),
      P("L1", "There ... two apples in the basket.", "are", "is", "am", "be")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN soal bergambar otomatis (Matematika, IPAS, Seni, B. Inggris): gambar SVG dari penanda [[g:...]], kunci dihitung dari parameter gambar ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "mtk-A-7": [
      P("L1", "[[g:jam;4;0]]Jam pada gambar menunjukkan pukul ...", "04.00", "04.30", "05.00", "03.00"),
      P("L1", "[[g:jam;9;0]]Jam pada gambar menunjukkan pukul ...", "09.00", "09.30", "10.00", "08.00"),
      P("L1", "[[g:jam;1;0]]Jam pada gambar menunjukkan pukul ...", "01.00", "01.30", "02.00", "12.00"),
      P("L1", "[[g:jam;12;0]]Jam pada gambar menunjukkan pukul ...", "12.00", "12.30", "01.00", "11.00"),
      P("L1", "[[g:jam;11;0]]Jam pada gambar menunjukkan pukul ...", "11.00", "11.30", "12.00", "10.00"),
      P("L1", "[[g:jam;4;30]]Jam pada gambar menunjukkan pukul ...", "04.30", "04.00", "05.30", "03.30"),
      I("L1", "[[g:jam;10;30]]Jam pada gambar menunjukkan pukul .... (tulis dengan titik, contoh 02.30)", "10.30 (10.30)"),
      I("L1", "[[g:jam;12;30]]Jam pada gambar menunjukkan pukul .... (tulis dengan titik, contoh 02.30)", "12.30 (12.30)")
    ],
    "mtk-A-4": [
      P("L1", "[[g:pecahan;2;3]]Bagian berwarna pada gambar menunjukkan pecahan ...", "2/3", "3/2", "3/3", "2/4"),
      P("L1", "[[g:pecahan;1;2]]Bagian berwarna pada gambar menunjukkan pecahan ...", "1/2", "2/1", "2/2", "1/3"),
      P("L1", "[[g:pecahan;3;4]]Bagian berwarna pada gambar menunjukkan pecahan ...", "3/4", "4/3", "4/4", "3/5"),
      P("L1", "[[g:pecahan;1;3]]Bagian berwarna pada gambar menunjukkan pecahan ...", "1/3", "3/1", "2/3", "1/4"),
      P("L1", "[[g:pecahan;1;4]]Bagian berwarna pada gambar menunjukkan pecahan ...", "1/4", "4/1", "2/4", "1/5"),
      I("L1", "[[g:pecahan;2;4]]Bagian berwarna pada gambar menunjukkan pecahan ....", "2/4")
    ],
    "mtk-B-5": [
      P("L1", "[[g:pecahan;6;8;batang]]Bagian berwarna pada gambar menunjukkan pecahan ...", "6/8", "8/6", "7/8", "6/9"),
      P("L1", "[[g:pecahan;1;6;batang]]Bagian berwarna pada gambar menunjukkan pecahan ...", "1/6", "6/1", "2/6", "1/7"),
      P("L1", "[[g:pecahan;3;5;batang]]Bagian berwarna pada gambar menunjukkan pecahan ...", "3/5", "5/3", "4/5", "3/6"),
      P("L1", "[[g:pecahan;3;6;batang]]Bagian berwarna pada gambar menunjukkan pecahan ...", "3/6", "6/3", "4/6", "3/7"),
      I("L1", "[[g:pecahan;5;6;batang]]Bagian berwarna pada gambar menunjukkan pecahan ....", "5/6"),
      I("L1", "[[g:pecahan;4;5;batang]]Bagian berwarna pada gambar menunjukkan pecahan ....", "4/5"),
      P("L1", "[[g:pecahan;2;4;batang]]Pecahan paling sederhana yang senilai dengan bagian berwarna pada gambar adalah ...", "1/2", "2/3", "1/4", "3/4"),
      P("L1", "[[g:pecahan;2;6;batang]]Pecahan paling sederhana yang senilai dengan bagian berwarna pada gambar adalah ...", "1/3", "1/2", "2/3", "1/6"),
      P("L1", "[[g:pecahan;3;6;batang]]Pecahan paling sederhana yang senilai dengan bagian berwarna pada gambar adalah ...", "1/2", "1/3", "3/4", "2/3"),
      P("L1", "[[g:pecahan;2;8;batang]]Pecahan paling sederhana yang senilai dengan bagian berwarna pada gambar adalah ...", "1/4", "1/2", "1/8", "2/4"),
      P("L1", "[[g:pecahan;4;8;batang]]Pecahan paling sederhana yang senilai dengan bagian berwarna pada gambar adalah ...", "1/2", "1/4", "4/6", "1/8")
    ],
    "mtk-A-9": [
      P("L1", "[[g:bangun;persegi]]Nama bangun datar pada gambar adalah ...", "persegi", "persegi panjang", "segitiga", "lingkaran"),
      I("L1", "[[g:bangun;persegi]]Bangun datar pada gambar memiliki .... sisi.", "4"),
      P("L1", "[[g:bangun;persegipanjang]]Nama bangun datar pada gambar adalah ...", "persegi panjang", "persegi", "segitiga", "lingkaran"),
      I("L1", "[[g:bangun;persegipanjang]]Bangun datar pada gambar memiliki .... sisi.", "4"),
      P("L1", "[[g:bangun;segitiga]]Nama bangun datar pada gambar adalah ...", "segitiga", "persegi", "persegi panjang", "lingkaran"),
      I("L1", "[[g:bangun;segitiga]]Bangun datar pada gambar memiliki .... sisi.", "3"),
      P("L1", "[[g:bangun;lingkaran]]Nama bangun datar pada gambar adalah ...", "lingkaran", "persegi", "persegi panjang", "segitiga"),
      I("L1", "[[g:bangun;lingkaran]]Bangun datar pada gambar disebut ....", "lingkaran")
    ],
    "mtk-B-11": [
      P("L1", "[[g:bangun;segilima]]Nama bangun datar pada gambar adalah ...", "segi lima", "belah ketupat", "segi enam", "jajar genjang"),
      I("L1", "[[g:bangun;segilima]]Bangun datar pada gambar memiliki .... sisi.", "5"),
      P("L1", "[[g:bangun;segienam]]Nama bangun datar pada gambar adalah ...", "segi enam", "jajar genjang", "segi lima", "belah ketupat"),
      I("L1", "[[g:bangun;segienam]]Bangun datar pada gambar memiliki .... sisi.", "6"),
      P("L1", "[[g:bangun;belahketupat]]Nama bangun datar pada gambar adalah ...", "belah ketupat", "jajar genjang", "layang-layang", "trapesium"),
      P("L1", "[[g:bangun;jajargenjang]]Nama bangun datar pada gambar adalah ...", "jajar genjang", "segi enam", "belah ketupat", "trapesium"),
      P("L1", "[[g:bangun;trapesium]]Nama bangun datar pada gambar adalah ...", "trapesium", "segi lima", "jajar genjang", "layang-layang"),
      P("L1", "[[g:bangun;layang]]Nama bangun datar pada gambar adalah ...", "layang-layang", "jajar genjang", "segi enam", "trapesium"),
      I("L1", "[[g:bangun;trapesium]]Bangun datar pada gambar disebut ....", "trapesium")
    ],
    "mtk-B-10": [
      P("L1", "[[g:ubin;2;3]]Jika satu kotak kecil luasnya 1 satuan persegi, luas bangun pada gambar adalah ... satuan persegi.", "6", "5", "8", "3"),
      P("L1", "[[g:ubin;6;7]]Jika satu kotak kecil luasnya 1 satuan persegi, luas bangun pada gambar adalah ... satuan persegi.", "42", "13", "48", "35"),
      P("L1", "[[g:ubin;4;7]]Jika satu kotak kecil luasnya 1 satuan persegi, luas bangun pada gambar adalah ... satuan persegi.", "28", "11", "32", "21"),
      P("L1", "[[g:ubin;6;3]]Jika satu kotak kecil luasnya 1 satuan persegi, luas bangun pada gambar adalah ... satuan persegi.", "18", "9", "24", "15"),
      I("L1", "[[g:ubin;3;7]]Jika satu kotak kecil luasnya 1 satuan persegi, luas bangun pada gambar adalah .... satuan persegi.", "21"),
      I("L1", "[[g:ubin;4;3]]Jika satu kotak kecil luasnya 1 satuan persegi, luas bangun pada gambar adalah .... satuan persegi.", "12"),
      P("L1", "[[g:kubus;4;4;3]]Balok pada gambar tersusun dari kubus satuan yang sama. Volume balok adalah ... kubus satuan.", "48", "11", "52", "44"),
      P("L1", "[[g:kubus;2;2;2]]Balok pada gambar tersusun dari kubus satuan yang sama. Volume balok adalah ... kubus satuan.", "8", "6", "10", "4"),
      P("L1", "[[g:kubus;4;3;2]]Balok pada gambar tersusun dari kubus satuan yang sama. Volume balok adalah ... kubus satuan.", "24", "9", "28", "21"),
      I("L1", "[[g:kubus;3;4;3]]Balok pada gambar tersusun dari kubus satuan yang sama. Volume balok adalah .... kubus satuan.", "36"),
      I("L1", "[[g:kubus;3;3;3]]Balok pada gambar tersusun dari kubus satuan yang sama. Volume balok adalah .... kubus satuan.", "27")
    ],
    "mtk-A-8": [
      P("L1", "[[g:penggaris;3]]Panjang pensil pada gambar adalah ... cm.", "3", "4", "2", "5"),
      P("L1", "[[g:penggaris;10]]Panjang pensil pada gambar adalah ... cm.", "10", "11", "9", "12"),
      P("L1", "[[g:penggaris;12]]Panjang pensil pada gambar adalah ... cm.", "12", "13", "11", "14"),
      P("L1", "[[g:penggaris;11]]Panjang pensil pada gambar adalah ... cm.", "11", "12", "10", "13"),
      I("L1", "[[g:penggaris;8]]Panjang pensil pada gambar adalah .... cm.", "8"),
      I("L1", "[[g:penggaris;4]]Panjang pensil pada gambar adalah .... cm.", "4"),
      P("L1", "[[g:timbangan;Apel;Jeruk;kiri]]Pada timbangan, sisi yang lebih rendah berisi benda yang lebih berat. Benda yang lebih berat adalah ...", "apel", "jeruk", "sama berat", "tidak dapat diketahui"),
      P("L1", "[[g:timbangan;Buku;Pensil;kanan]]Pada timbangan, sisi yang lebih rendah berisi benda yang lebih berat. Benda yang lebih berat adalah ...", "pensil", "buku", "sama berat", "tidak dapat diketahui"),
      P("L1", "[[g:timbangan;Bola;Kue;kiri]]Pada timbangan, sisi yang lebih rendah berisi benda yang lebih berat. Benda yang lebih berat adalah ...", "bola", "kue", "sama berat", "tidak dapat diketahui"),
      P("L1", "[[g:timbangan;Tas;Topi;kanan]]Pada timbangan, sisi yang lebih rendah berisi benda yang lebih berat. Benda yang lebih berat adalah ...", "topi", "tas", "sama berat", "tidak dapat diketahui")
    ],
    "mtk-A-11": [
      P("L1", "[[g:piktogram;Bola:2;Voli:9;Basket:3;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Pilihan yang paling banyak dipilih adalah ...", "Voli", "Bola", "Basket", "semua sama"),
      P("L1", "[[g:piktogram;Bola:2;Voli:9;Basket:3;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Banyak anak yang memilih Basket adalah ...", "3", "10", "2", "14"),
      I("L1", "[[g:piktogram;Bola:2;Voli:9;Basket:3;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Jumlah seluruh anak adalah ....", "14"),
      P("L1", "[[g:piktogram;Apel:5;Jeruk:6;Mangga:2;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Pilihan yang paling banyak dipilih adalah ...", "Jeruk", "Apel", "Mangga", "semua sama"),
      P("L1", "[[g:piktogram;Apel:5;Jeruk:6;Mangga:2;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Banyak anak yang memilih Apel adalah ...", "5", "7", "2", "13"),
      I("L1", "[[g:piktogram;Apel:5;Jeruk:6;Mangga:2;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Jumlah seluruh anak adalah ....", "13"),
      P("L1", "[[g:piktogram;Kucing:6;Ayam:3;Ikan:4;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Pilihan yang paling banyak dipilih adalah ...", "Kucing", "Ayam", "Ikan", "semua sama"),
      P("L1", "[[g:piktogram;Kucing:6;Ayam:3;Ikan:4;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Banyak anak yang memilih Ikan adalah ...", "4", "7", "3", "13"),
      I("L1", "[[g:piktogram;Kucing:6;Ayam:3;Ikan:4;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Jumlah seluruh anak adalah ....", "13"),
      P("L1", "[[g:piktogram;Merah:6;Biru:8;Hijau:7;=1 anak]]Pada gambar, satu wajah mewakili 1 anak. Pilihan yang paling banyak dipilih adalah ...", "Biru", "Merah", "Hijau", "semua sama")
    ],
    "mtk-B-12": [
      P("L1", "[[g:diagram;Apel:6;Jeruk:9;Mangga:7;Pisang:8]]Pada diagram batang, data yang paling banyak adalah ...", "Jeruk", "Apel", "Mangga", "Pisang"),
      P("L1", "[[g:diagram;Apel:6;Jeruk:9;Mangga:7;Pisang:8]]Pada diagram batang, selisih data terbanyak dan tersedikit adalah ...", "3", "15", "4", "9"),
      I("L1", "[[g:diagram;Apel:6;Jeruk:9;Mangga:7;Pisang:8]]Pada diagram batang, jumlah seluruh data adalah ....", "30"),
      P("L1", "[[g:diagram;Senin:7;Selasa:5;Rabu:2;Kamis:3]]Pada diagram batang, data yang paling banyak adalah ...", "Senin", "Selasa", "Rabu", "Kamis"),
      P("L1", "[[g:diagram;Senin:7;Selasa:5;Rabu:2;Kamis:3]]Pada diagram batang, selisih data terbanyak dan tersedikit adalah ...", "5", "9", "6", "7"),
      I("L1", "[[g:diagram;Senin:7;Selasa:5;Rabu:2;Kamis:3]]Pada diagram batang, jumlah seluruh data adalah ....", "17"),
      P("L1", "[[g:diagram;Kucing:3;Ayam:12;Ikan:9;Sapi:6]]Pada diagram batang, data yang paling banyak adalah ...", "Ayam", "Kucing", "Ikan", "Sapi"),
      P("L1", "[[g:diagram;Kucing:3;Ayam:12;Ikan:9;Sapi:6]]Pada diagram batang, selisih data terbanyak dan tersedikit adalah ...", "9", "15", "10", "12"),
      I("L1", "[[g:diagram;Kucing:3;Ayam:12;Ikan:9;Sapi:6]]Pada diagram batang, jumlah seluruh data adalah ....", "30")
    ],
    "mtk-A-6": [
      P("L1", "[[g:pola;k;o;k;o;k;o;?]]Bentuk yang tepat untuk tanda tanya (?) pada pola gambar adalah ...", "kotak", "bulat", "segitiga", "bintang"),
      P("L1", "[[g:pola;k;o;o;k;o;o;?]]Bentuk yang tepat untuk tanda tanya (?) pada pola gambar adalah ...", "kotak", "bulat", "segitiga", "bintang"),
      P("L1", "[[g:pola;o;o;k;o;o;k;?]]Bentuk yang tepat untuk tanda tanya (?) pada pola gambar adalah ...", "bulat", "kotak", "segitiga", "bintang"),
      P("L1", "[[g:pola;b;b;t;b;b;t;?]]Bentuk yang tepat untuk tanda tanya (?) pada pola gambar adalah ...", "bintang", "kotak", "bulat", "segitiga")
    ],
    "mtk-B-8": [
      P("L1", "[[g:pola;t;b;t;b;t;b;?]]Bentuk yang tepat untuk tanda tanya (?) pada pola gambar adalah ...", "segitiga", "kotak", "bulat", "bintang"),
      P("L1", "[[g:pola;t;b;h;t;b;h;?]]Bentuk yang tepat untuk tanda tanya (?) pada pola gambar adalah ...", "segitiga", "kotak", "bulat", "bintang"),
      P("L1", "[[g:pola;h;b;h;b;h;b;?]]Bentuk yang tepat untuk tanda tanya (?) pada pola gambar adalah ...", "hati", "kotak", "bulat", "segitiga")
    ],
    "mtk-C-11": [
      P("L1", "[[g:petak;5;4;A1:Toko]]Letak Toko pada peta berpetak adalah ...", "(A, 1)", "(B, 1)", "(A, 2)", "(1, A)"),
      P("L1", "[[g:petak;5;4;E4:Pasar]]Letak Pasar pada peta berpetak adalah ...", "(E, 4)", "(E, 3)", "(4, E)", "(D, 4)"),
      P("L1", "[[g:petak;5;4;C2:Masjid]]Letak Masjid pada peta berpetak adalah ...", "(C, 2)", "(D, 2)", "(C, 3)", "(2, C)"),
      P("L1", "[[g:petak;5;4;D3:Taman]]Letak Taman pada peta berpetak adalah ...", "(D, 3)", "(E, 3)", "(D, 4)", "(3, D)"),
      I("L1", "[[g:petak;5;4;C4:Sekolah]]Letak Sekolah pada peta berpetak ditulis (huruf, angka), yaitu ....", "(C, 4)"),
      I("L1", "[[g:petak;5;4;A4:Pos]]Letak Pos pada peta berpetak ditulis (huruf, angka), yaitu ....", "(A, 4)")
    ],
    "mtk-A-1": [
      P("L1", "[[g:garisbil;0;10;3;A]]Titik A pada garis bilangan menunjukkan bilangan ...", "3", "4", "2", "5"),
      P("L1", "[[g:garisbil;0;10;4;A]]Titik A pada garis bilangan menunjukkan bilangan ...", "4", "5", "3", "6"),
      P("L1", "[[g:garisbil;0;10;9;A]]Titik A pada garis bilangan menunjukkan bilangan ...", "9", "10", "8", "11"),
      I("L1", "[[g:garisbil;0;10;8;A]]Titik A pada garis bilangan menunjukkan bilangan ....", "8"),
      I("L1", "[[g:garisbil;0;10;5;A]]Titik A pada garis bilangan menunjukkan bilangan ....", "5"),
      P("L1", "[[g:ikon;apel;6]]Banyak gambar pada soal ini adalah ...", "6", "7", "5", "8"),
      P("L1", "[[g:ikon;bola;9]]Banyak gambar pada soal ini adalah ...", "9", "10", "8", "11"),
      P("L1", "[[g:ikon;bintang;7]]Banyak gambar pada soal ini adalah ...", "7", "8", "6", "9"),
      P("L1", "[[g:ikon;ikan;9]]Banyak gambar pada soal ini adalah ...", "9", "10", "8", "11"),
      I("L1", "[[g:ikon;balon;7]]Banyak gambar pada soal ini adalah ....", "7"),
      I("L1", "[[g:ikon;buku;5]]Banyak gambar pada soal ini adalah ....", "5")
    ],
    "mtk-A-3": [
      P("L1", "[[g:ikon;apel;5;jeruk;5]]Jumlah semua gambar pada soal ini adalah ...", "10", "11", "9", "5"),
      P("L1", "[[g:ikon;apel;5]]Gambar di atas dikurangi 4 gambar. Sisanya adalah ...", "1", "9", "2", "0"),
      P("L1", "[[g:ikon;bola;5;balon;6]]Jumlah semua gambar pada soal ini adalah ...", "11", "12", "10", "5"),
      P("L1", "[[g:ikon;bola;5]]Gambar di atas dikurangi 4 gambar. Sisanya adalah ...", "1", "9", "2", "0"),
      P("L1", "[[g:ikon;ikan;4;kucing;6]]Jumlah semua gambar pada soal ini adalah ...", "10", "11", "9", "4"),
      P("L1", "[[g:ikon;ikan;4]]Gambar di atas dikurangi 3 gambar. Sisanya adalah ...", "1", "7", "2", "0"),
      P("L1", "[[g:ikon;bunga;7;pohon;4]]Jumlah semua gambar pada soal ini adalah ...", "11", "12", "10", "7"),
      I("L1", "[[g:ikon;buku;6;pensil;4]]Jumlah semua gambar pada soal ini adalah ....", "10"),
      I("L1", "[[g:ikon;bintang;7;hati;3]]Jumlah semua gambar pada soal ini adalah ....", "10")
    ],
    "ipas-B-8": [
      P("L1", "[[g:mataangin;U]]Panah merah pada gambar menunjukkan arah ...", "utara", "timur", "selatan", "barat"),
      P("L1", "[[g:mataangin;T]]Panah merah pada gambar menunjukkan arah ...", "timur", "utara", "selatan", "barat"),
      P("L1", "[[g:mataangin;S]]Panah merah pada gambar menunjukkan arah ...", "selatan", "utara", "timur", "barat"),
      P("L1", "[[g:mataangin;B]]Panah merah pada gambar menunjukkan arah ...", "barat", "utara", "timur", "selatan"),
      I("L1", "[[g:mataangin;U]]Panah merah pada gambar menunjukkan arah ....", "utara"),
      I("L1", "[[g:mataangin;S]]Panah merah pada gambar menunjukkan arah ....", "selatan")
    ],
    "ipas-C-6": [
      P("L1", "[[g:mataangin;TL]]Panah merah pada gambar menunjukkan arah ...", "timur laut", "selatan", "timur", "tenggara"),
      P("L1", "[[g:mataangin;TG]]Panah merah pada gambar menunjukkan arah ...", "tenggara", "barat laut", "selatan", "barat daya"),
      P("L1", "[[g:mataangin;BD]]Panah merah pada gambar menunjukkan arah ...", "barat daya", "tenggara", "barat laut", "timur"),
      P("L1", "[[g:mataangin;BL]]Panah merah pada gambar menunjukkan arah ...", "barat laut", "barat daya", "utara", "selatan"),
      I("L1", "[[g:mataangin;TG]]Panah merah pada gambar menunjukkan arah ....", "tenggara"),
      I("L1", "[[g:mataangin;BD]]Panah merah pada gambar menunjukkan arah ....", "barat daya")
    ],
    "seni-A-5": [
      P("L1", "[[g:wajah;senang]]Wajah pada gambar menunjukkan perasaan ...", "senang", "sedih", "marah", "takut"),
      P("L1", "[[g:wajah;sedih]]Wajah pada gambar menunjukkan perasaan ...", "sedih", "senang", "marah", "takut"),
      P("L1", "[[g:wajah;marah]]Wajah pada gambar menunjukkan perasaan ...", "marah", "senang", "sedih", "takut")
    ],
    "seni-A-16": [
      P("L1", "[[g:wajah;takut]]Ekspresi wajah pada gambar menunjukkan perasaan ...", "takut", "senang", "sedih", "terkejut"),
      P("L1", "[[g:wajah;terkejut]]Ekspresi wajah pada gambar menunjukkan perasaan ...", "terkejut", "takut", "senang", "sedih"),
      P("L1", "[[g:wajah;senang]]Ekspresi wajah pada gambar menunjukkan perasaan ...", "senang", "marah", "terkejut", "takut"),
      P("L1", "[[g:wajah;marah]]Ekspresi wajah pada gambar menunjukkan perasaan ...", "marah", "terkejut", "takut", "senang"),
      P("L1", "[[g:wajah;sedih]]Ekspresi wajah pada gambar menunjukkan perasaan ...", "sedih", "takut", "marah", "terkejut"),
      I("L1", "[[g:wajah;takut]]Ekspresi wajah pada gambar menunjukkan perasaan ....", "takut"),
      I("L1", "[[g:wajah;terkejut]]Ekspresi wajah pada gambar menunjukkan perasaan ....", "terkejut")
    ],
    "seni-A-1": [
      P("L1", "[[g:warna;merah]]Warna kotak pada gambar adalah ...", "merah", "kuning", "biru", "hijau"),
      P("L1", "[[g:warna;kuning]]Warna kotak pada gambar adalah ...", "kuning", "merah", "biru", "hijau"),
      P("L1", "[[g:warna;biru]]Warna kotak pada gambar adalah ...", "biru", "merah", "kuning", "hijau"),
      P("L1", "[[g:warna;hijau]]Warna kotak pada gambar adalah ...", "hijau", "merah", "kuning", "biru")
    ],
    "seni-B-1": [
      P("L1", "[[g:warna;merah;+;kuning;=;?]]Hasil campuran kedua warna pada gambar adalah warna ...", "jingga", "hijau", "ungu", "cokelat"),
      P("L1", "[[g:warna;biru;+;kuning;=;?]]Hasil campuran kedua warna pada gambar adalah warna ...", "hijau", "jingga", "ungu", "cokelat"),
      P("L1", "[[g:warna;merah;+;biru;=;?]]Hasil campuran kedua warna pada gambar adalah warna ...", "ungu", "jingga", "hijau", "cokelat"),
      I("L1", "[[g:warna;merah;+;kuning;=;?]]Hasil campuran kedua warna pada gambar adalah warna ....", "jingga"),
      I("L1", "[[g:warna;biru;+;kuning;=;?]]Hasil campuran kedua warna pada gambar adalah warna ....", "hijau")
    ],
    "big-B-2": [
      P("L1", "[[g:ikon;apel;7]]How many pictures are there?", "seven", "eight", "six", "one"),
      P("L1", "[[g:ikon;bola;4]]How many pictures are there?", "four", "five", "three", "eight"),
      P("L1", "[[g:ikon;bintang;8]]How many pictures are there?", "eight", "nine", "seven", "two"),
      P("L1", "[[g:ikon;ikan;9]]How many pictures are there?", "nine", "ten", "eight", "three"),
      P("L1", "[[g:warna;merah]]What color is this?", "red", "blue", "yellow", "green"),
      P("L1", "[[g:warna;biru]]What color is this?", "blue", "red", "yellow", "green"),
      P("L1", "[[g:warna;kuning]]What color is this?", "yellow", "red", "blue", "green"),
      P("L1", "[[g:warna;hijau]]What color is this?", "green", "red", "blue", "yellow"),
      P("L1", "[[g:wajah;senang]]How does the face feel?", "happy", "sad", "angry", "tired"),
      P("L1", "[[g:wajah;sedih]]How does the face feel?", "sad", "happy", "angry", "tired"),
      P("L1", "[[g:wajah;marah]]How does the face feel?", "angry", "happy", "sad", "tired")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN soal bergambar otomatis jilid 2 (sudut, keliling, jam, bangun ruang, uang, termometer, listrik, magnet, daur hidup, bagian tumbuhan, rantai makanan) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "mtk-B-11": [
      P("L1", "[[g:sudut;30]]Sudut pada gambar termasuk sudut ...", "lancip", "siku-siku", "tumpul", "lurus"),
      P("L1", "[[g:sudut;45]]Sudut pada gambar termasuk sudut ...", "lancip", "siku-siku", "tumpul", "lurus"),
      P("L1", "[[g:sudut;60]]Sudut pada gambar termasuk sudut ...", "lancip", "siku-siku", "tumpul", "lurus"),
      I("L1", "[[g:sudut;75]]Sudut pada gambar termasuk sudut .... (lancip, siku-siku, atau tumpul)", "lancip"),
      P("L1", "[[g:sudut;90]]Sudut pada gambar termasuk sudut ...", "siku-siku", "lancip", "tumpul", "lurus"),
      P("L1", "[[g:sudut;100]]Sudut pada gambar termasuk sudut ...", "tumpul", "lancip", "siku-siku", "lurus"),
      P("L1", "[[g:sudut;120]]Sudut pada gambar termasuk sudut ...", "tumpul", "lancip", "siku-siku", "lurus"),
      I("L1", "[[g:sudut;135]]Sudut pada gambar termasuk sudut .... (lancip, siku-siku, atau tumpul)", "tumpul"),
      P("L1", "[[g:sudut;150]]Sudut pada gambar termasuk sudut ...", "tumpul", "lancip", "siku-siku", "lurus"),
      P("L1", "[[g:sudut;70;tampil]]Sudut pada gambar besarnya 70 derajat. Sudut ini lebih kecil dari ...", "90 derajat (siku-siku)", "semua sudut tumpul", "60 derajat", "30 derajat")
    ],
    "mtk-C-8": [
      P("L1", "[[g:bangun;persegi;7 cm]]Keliling persegi pada gambar adalah ... cm.", "28", "49", "14", "32"),
      I("L1", "[[g:bangun;persegi;7 cm]]Keliling persegi pada gambar adalah .... cm.", "28"),
      P("L1", "[[g:bangun;persegi;5 cm]]Keliling persegi pada gambar adalah ... cm.", "20", "25", "10", "24"),
      P("L1", "[[g:bangun;persegi;5 cm]]Luas persegi pada gambar adalah ... cm persegi.", "25", "20", "10", "30"),
      P("L1", "[[g:bangun;persegi;9 cm]]Keliling persegi pada gambar adalah ... cm.", "36", "81", "18", "40"),
      I("L1", "[[g:bangun;persegi;9 cm]]Luas persegi pada gambar adalah .... cm persegi.", "81"),
      P("L1", "[[g:bangun;persegi;12 cm]]Luas persegi pada gambar adalah ... cm persegi.", "144", "48", "24", "156"),
      P("L1", "[[g:bangun;persegipanjang;9 cm;4 cm]]Keliling persegi panjang pada gambar adalah ... cm.", "26", "36", "13", "72"),
      I("L1", "[[g:bangun;persegipanjang;9 cm;4 cm]]Luas persegi panjang pada gambar adalah .... cm persegi.", "36"),
      P("L1", "[[g:bangun;persegipanjang;8 cm;5 cm]]Keliling persegi panjang pada gambar adalah ... cm.", "26", "40", "13", "80"),
      P("L1", "[[g:bangun;persegipanjang;8 cm;5 cm]]Luas persegi panjang pada gambar adalah ... cm persegi.", "40", "26", "13", "48"),
      P("L1", "[[g:bangun;persegipanjang;10 cm;6 cm]]Keliling persegi panjang pada gambar adalah ... cm.", "32", "60", "16", "120"),
      I("L1", "[[g:bangun;persegipanjang;10 cm;6 cm]]Keliling persegi panjang pada gambar adalah .... cm.", "32"),
      P("L1", "[[g:bangun;persegipanjang;12 cm;7 cm]]Keliling persegi panjang pada gambar adalah ... cm.", "38", "84", "19", "168"),
      P("L1", "[[g:bangun;persegipanjang;12 cm;7 cm]]Luas persegi panjang pada gambar adalah ... cm persegi.", "84", "38", "19", "96")
    ],
    "mtk-C-9": [
      P("L1", "[[g:jam;9;30]][[g:jam;10;15]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah ... menit.", "45", "60", "30", "75"),
      P("L1", "[[g:jam;8;45]][[g:jam;9;45]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah ... menit.", "60", "75", "45", "90"),
      P("L1", "[[g:jam;8;30]][[g:jam;10;30]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah ... menit.", "120", "135", "105", "150"),
      P("L1", "[[g:jam;5;30]][[g:jam;6;45]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah ... menit.", "75", "90", "60", "105"),
      P("L1", "[[g:jam;2;15]][[g:jam;3;45]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah ... menit.", "90", "105", "75", "120"),
      P("L1", "[[g:jam;8;0]][[g:jam;8;30]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah ... menit.", "30", "45", "15", "60"),
      I("L1", "[[g:jam;1;45]][[g:jam;3;15]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah .... menit.", "90"),
      I("L1", "[[g:jam;6;45]][[g:jam;9;0]]Kegiatan dimulai pada jam pertama dan selesai pada jam kedua. Lama kegiatan adalah .... menit.", "135")
    ],
    "mtk-C-10": [
      P("L1", "[[g:ruang;kubus]]Nama bangun ruang pada gambar adalah ...", "kubus", "balok", "tabung", "kerucut"),
      P("L1", "[[g:ruang;balok]]Nama bangun ruang pada gambar adalah ...", "balok", "kubus", "tabung", "kerucut"),
      P("L1", "[[g:ruang;tabung]]Nama bangun ruang pada gambar adalah ...", "tabung", "kubus", "balok", "kerucut"),
      P("L1", "[[g:ruang;kerucut]]Nama bangun ruang pada gambar adalah ...", "kerucut", "kubus", "balok", "tabung"),
      P("L1", "[[g:ruang;bola]]Nama bangun ruang pada gambar adalah ...", "bola", "kubus", "balok", "tabung"),
      P("L1", "[[g:ruang;limas]]Nama bangun ruang pada gambar adalah ...", "limas segi empat", "kubus", "balok", "tabung"),
      P("L1", "[[g:ruang;kubus]]Banyak rusuk pada bangun ruang di gambar adalah ...", "12", "14", "10", "16"),
      P("L1", "[[g:ruang;kubus]]Banyak titik sudut pada bangun ruang di gambar adalah ...", "8", "10", "6", "12"),
      I("L1", "[[g:ruang;kubus]]Banyak sisi pada bangun ruang di gambar adalah ....", "6"),
      P("L1", "[[g:ruang;balok]]Banyak rusuk pada bangun ruang di gambar adalah ...", "12", "14", "10", "16"),
      P("L1", "[[g:ruang;balok]]Banyak titik sudut pada bangun ruang di gambar adalah ...", "8", "10", "6", "12"),
      I("L1", "[[g:ruang;limas]]Banyak sisi pada bangun ruang di gambar adalah ....", "5"),
      P("L1", "[[g:ruang;limas]]Banyak titik sudut pada bangun ruang di gambar adalah ...", "5", "7", "3", "9"),
      P("L1", "[[g:ruang;limas]]Banyak rusuk pada bangun ruang di gambar adalah ...", "8", "10", "6", "12"),
      I("L1", "[[g:ruang;tabung]]Banyak sisi pada bangun ruang di gambar adalah ....", "3")
    ],
    "ipas-B-11": [
      P("L1", "[[g:uang;2000;500]]Jumlah uang pada gambar adalah ...", "Rp2.500", "Rp3.000", "Rp2.000", "Rp3.500"),
      P("L1", "[[g:uang;20000;500]]Jumlah uang pada gambar adalah ...", "Rp20.500", "Rp21.000", "Rp20.000", "Rp21.500"),
      P("L1", "[[g:uang;5000;2000]]Jumlah uang pada gambar adalah ...", "Rp7.000", "Rp7.500", "Rp6.500", "Rp8.000"),
      P("L1", "[[g:uang;20000;10000;2000;2000]]Jumlah uang pada gambar adalah ...", "Rp34.000", "Rp34.500", "Rp33.500", "Rp35.000"),
      P("L1", "[[g:uang;10000;10000;5000;1000]]Jumlah uang pada gambar adalah ...", "Rp26.000", "Rp26.500", "Rp25.500", "Rp27.000"),
      P("L1", "[[g:uang;10000;5000;5000]]Jumlah uang pada gambar adalah ...", "Rp20.000", "Rp20.500", "Rp19.500", "Rp21.000"),
      I("L1", "[[g:uang;5000;2000;500]]Jumlah uang pada gambar adalah .... (tulis dengan Rp)", "Rp7.500"),
      I("L1", "[[g:uang;2000;2000]]Jumlah uang pada gambar adalah .... (tulis dengan Rp)", "Rp4.000"),
      I("L1", "[[g:uang;20000;5000;500]]Jumlah uang pada gambar adalah .... (tulis dengan Rp)", "Rp25.500")
    ],
    "ipas-B-3": [
      P("L1", "[[g:termometer;20]]Suhu yang ditunjukkan termometer pada gambar adalah ... derajat Celsius.", "20", "30", "10", "40"),
      P("L1", "[[g:termometer;40]]Suhu yang ditunjukkan termometer pada gambar adalah ... derajat Celsius.", "40", "50", "30", "60"),
      P("L1", "[[g:termometer;60]]Suhu yang ditunjukkan termometer pada gambar adalah ... derajat Celsius.", "60", "70", "50", "80"),
      P("L1", "[[g:termometer;80]]Suhu yang ditunjukkan termometer pada gambar adalah ... derajat Celsius.", "80", "90", "70", "100"),
      P("L1", "[[g:termometer;100]]Suhu yang ditunjukkan termometer pada gambar adalah ... derajat Celsius.", "100", "110", "90", "120"),
      P("L1", "[[g:termometer;30]]Suhu yang ditunjukkan termometer pada gambar adalah ... derajat Celsius.", "30", "40", "20", "50"),
      I("L1", "[[g:termometer;50]]Suhu yang ditunjukkan termometer pada gambar adalah .... derajat Celsius.", "50"),
      I("L1", "[[g:termometer;10]]Suhu yang ditunjukkan termometer pada gambar adalah .... derajat Celsius.", "10"),
      P("L1", "[[g:termometer;100]]Air mendidih pada suhu seperti yang ditunjukkan termometer. Suhu itu adalah ...", "100 derajat Celsius", "0 derajat Celsius", "50 derajat Celsius", "10 derajat Celsius"),
      P("L1", "[[g:termometer;0]]Air membeku menjadi es pada suhu seperti yang ditunjukkan termometer. Suhu itu adalah ...", "0 derajat Celsius", "100 derajat Celsius", "50 derajat Celsius", "37 derajat Celsius")
    ],
    "ipas-C-4": [
      P("L1", "[[g:rangkaian;tutup]]Keadaan lampu pada rangkaian listrik di gambar adalah ...", "menyala", "padam", "redup", "meledak"),
      P("L1", "[[g:rangkaian;buka]]Keadaan lampu pada rangkaian listrik di gambar adalah ...", "padam", "menyala", "sangat terang", "berkedip"),
      P("L1", "[[g:rangkaian;buka]]Rangkaian listrik pada gambar disebut rangkaian ...", "terbuka", "tertutup", "seri", "paralel"),
      P("L1", "[[g:rangkaian;tutup]]Rangkaian listrik pada gambar disebut rangkaian ...", "tertutup", "terbuka", "terputus", "tanpa baterai"),
      I("L1", "[[g:rangkaian;buka]]Lampu pada gambar tidak menyala karena saklar dalam keadaan ....", "terbuka (dibuka)"),
      I("L1", "[[g:rangkaian;tutup]]Lampu pada gambar menyala karena saklar dalam keadaan ....", "tertutup (ditutup)"),
      P("L1", "[[g:magnet;US;US]]Dua magnet pada gambar didekatkan. Kutub yang saling berhadapan membuat magnet ...", "tarik-menarik", "tolak-menolak", "diam saja", "berputar"),
      I("L1", "[[g:magnet;US;US]]Dua magnet pada gambar didekatkan. Kutub yang berhadapan membuat magnet saling ....", "menarik"),
      P("L1", "[[g:magnet;US;SU]]Dua magnet pada gambar didekatkan. Kutub yang saling berhadapan membuat magnet ...", "tolak-menolak", "tarik-menarik", "diam saja", "berputar"),
      I("L1", "[[g:magnet;US;SU]]Dua magnet pada gambar didekatkan. Kutub yang berhadapan membuat magnet saling ....", "menolak"),
      P("L1", "[[g:magnet;SU;US]]Dua magnet pada gambar didekatkan. Kutub yang saling berhadapan membuat magnet ...", "tolak-menolak", "tarik-menarik", "diam saja", "berputar"),
      P("L1", "[[g:magnet;SU;SU]]Dua magnet pada gambar didekatkan. Kutub yang saling berhadapan membuat magnet ...", "tarik-menarik", "tolak-menolak", "diam saja", "berputar")
    ],
    "ipas-B-2": [
      P("L1", "[[g:daur;kupu;1]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ...", "telur", "ulat", "kepompong", "kupu-kupu"),
      P("L1", "[[g:daur;kupu;2]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ...", "ulat (larva)", "telur", "kepompong", "kupu-kupu"),
      I("L1", "[[g:daur;kupu;2]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ....", "ulat (larva)"),
      P("L1", "[[g:daur;kupu;3]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ...", "kepompong (pupa)", "telur", "ulat", "kupu-kupu"),
      I("L1", "[[g:daur;kupu;3]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ....", "kepompong (pupa)"),
      P("L1", "[[g:daur;kupu;4]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ...", "kupu-kupu dewasa", "telur", "ulat", "kepompong"),
      P("L1", "[[g:daur;katak;1]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ...", "telur katak", "berudu", "katak muda", "katak dewasa"),
      P("L1", "[[g:daur;katak;2]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ...", "berudu", "telur katak", "katak muda", "katak dewasa"),
      I("L1", "[[g:daur;katak;2]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ....", "berudu"),
      P("L1", "[[g:daur;katak;3]]Tahap daur hidup yang ditandai tanda tanya (?) pada gambar adalah ...", "katak muda", "telur katak", "berudu", "katak dewasa"),
      P("L1", "[[g:tumbuhan;akar]]Bagian tumbuhan yang ditunjuk huruf A adalah ...", "akar", "batang", "daun", "bunga"),
      P("L1", "[[g:tumbuhan;akar]]Bagian tumbuhan yang ditunjuk huruf A berfungsi ...", "menyerap air dan zat hara dari tanah", "menopang tumbuhan dan mengangkut air", "tempat membuat makanan (fotosintesis)", "alat perkembangbiakan"),
      I("L1", "[[g:tumbuhan;akar]]Bagian tumbuhan yang ditunjuk huruf A adalah ....", "akar"),
      P("L1", "[[g:tumbuhan;batang]]Bagian tumbuhan yang ditunjuk huruf A adalah ...", "batang", "akar", "daun", "bunga"),
      P("L1", "[[g:tumbuhan;batang]]Bagian tumbuhan yang ditunjuk huruf A berfungsi ...", "menopang tumbuhan dan mengangkut air", "menyerap air dan zat hara dari tanah", "tempat membuat makanan (fotosintesis)", "alat perkembangbiakan"),
      P("L1", "[[g:tumbuhan;daun]]Bagian tumbuhan yang ditunjuk huruf A adalah ...", "daun", "akar", "batang", "bunga"),
      P("L1", "[[g:tumbuhan;daun]]Bagian tumbuhan yang ditunjuk huruf A berfungsi ...", "tempat membuat makanan (fotosintesis)", "menyerap air dan zat hara dari tanah", "menopang tumbuhan dan mengangkut air", "alat perkembangbiakan"),
      I("L1", "[[g:tumbuhan;daun]]Bagian tumbuhan yang ditunjuk huruf A adalah ....", "daun"),
      P("L1", "[[g:tumbuhan;bunga]]Bagian tumbuhan yang ditunjuk huruf A adalah ...", "bunga", "akar", "batang", "daun"),
      P("L1", "[[g:tumbuhan;bunga]]Bagian tumbuhan yang ditunjuk huruf A berfungsi ...", "alat perkembangbiakan", "menyerap air dan zat hara dari tanah", "menopang tumbuhan dan mengangkut air", "tempat membuat makanan (fotosintesis)")
    ],
    "ipas-C-2": [
      P("L1", "[[g:rantai;rumput;?;katak;ular]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ...", "belalang", "padi", "elang", "tikus"),
      P("L1", "[[g:rantai;rumput;belalang;?;ular]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ...", "katak", "padi", "elang", "tikus"),
      I("L1", "[[g:rantai;rumput;belalang;?;ular]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ....", "katak"),
      P("L1", "[[g:rantai;rumput;belalang;katak;?]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ...", "ular", "padi", "elang", "tikus"),
      P("L1", "[[g:rantai;padi;?;ular;elang]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ...", "tikus", "rumput", "belalang", "katak"),
      P("L1", "[[g:rantai;padi;tikus;?;elang]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ...", "ular", "rumput", "belalang", "katak"),
      I("L1", "[[g:rantai;padi;tikus;?;elang]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ....", "ular"),
      P("L1", "[[g:rantai;padi;tikus;ular;?]]Makhluk hidup yang tepat untuk tanda tanya (?) pada rantai makanan di gambar adalah ...", "elang", "rumput", "belalang", "katak"),
      P("L1", "[[g:rantai;rumput;belalang;katak;ular]]Makhluk hidup yang berperan sebagai produsen pada rantai makanan di gambar adalah ...", "rumput", "belalang", "katak", "ular"),
      P("L1", "[[g:rantai;padi;tikus;ular;elang]]Makhluk hidup yang berperan sebagai produsen pada rantai makanan di gambar adalah ...", "padi", "tikus", "ular", "elang"),
      P("L1", "[[g:rantai;padi;tikus;ular;elang]]Pada rantai makanan di gambar, tanda panah menunjukkan arah ...", "perpindahan makanan atau energi", "perpindahan tempat tinggal", "arah angin", "arah pandang hewan")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN soal bergambar B. Inggris dan B. Indonesia (kosakata dan kalimat dari ikon) ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "big-C-2": [
      P("L1", "[[g:ikon;apel;1]]Look at the picture. What is this?", "apple", "banana", "orange", "fish"),
      P("L1", "[[g:ikon;apel;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "apple", "table", "cup", "dog"),
      P("L1", "[[g:ikon;pisang;1]]Look at the picture. What is this?", "banana", "apple", "orange", "fish"),
      P("L1", "[[g:ikon;pisang;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "banana", "table", "cup", "dog"),
      P("L1", "[[g:ikon;jeruk;1]]Look at the picture. What is this?", "orange", "apple", "banana", "fish"),
      P("L1", "[[g:ikon;jeruk;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "orange", "table", "cup", "dog"),
      P("L1", "[[g:ikon;ikan;1]]Look at the picture. What is this?", "fish", "apple", "banana", "orange"),
      P("L1", "[[g:ikon;ikan;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "fish", "table", "cup", "dog"),
      P("L1", "[[g:ikon;ayam;1]]Look at the picture. What is this?", "chicken", "apple", "banana", "orange"),
      P("L1", "[[g:ikon;ayam;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "chicken", "table", "cup", "dog"),
      I("L1", "[[g:ikon;apel;1]]Tulis nama benda pada gambar dalam bahasa Inggris: ....", "apple"),
      I("L1", "[[g:ikon;pisang;1]]Tulis nama benda pada gambar dalam bahasa Inggris: ....", "banana"),
      I("L1", "[[g:ikon;ikan;1]]Tulis nama benda pada gambar dalam bahasa Inggris: ....", "fish")
    ],
    "big-B-3": [
      P("L1", "[[g:ikon;buku;1]]Look at the picture. What is this?", "book", "pencil", "spoon", "chair"),
      P("L1", "[[g:ikon;buku;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "book", "table", "cup", "dog"),
      P("L1", "[[g:ikon;pensil;1]]Look at the picture. What is this?", "pencil", "book", "spoon", "chair"),
      P("L1", "[[g:ikon;pensil;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "pencil", "table", "cup", "dog"),
      I("L1", "[[g:ikon;buku;1]]Tulis nama benda pada gambar dalam bahasa Inggris: ....", "book"),
      I("L1", "[[g:ikon;pensil;1]]Tulis nama benda pada gambar dalam bahasa Inggris: ....", "pencil")
    ],
    "big-C-3": [
      P("L1", "[[g:ikon;rumah;1]]Look at the picture. What is this?", "house", "spoon", "chair", "bag"),
      P("L1", "[[g:ikon;rumah;1]]Gambar pada soal ini dalam bahasa Inggris disebut ...", "house", "table", "cup", "dog")
    ],
    "big-C-5": [
      P("L1", "[[g:ikon;kucing;1]]Look at the picture. There ... cat.", "is", "are", "am", "be"),
      P("L1", "[[g:ikon;kucing;3]]Look at the picture. There ... cats.", "are", "is", "am", "be"),
      P("L1", "[[g:ikon;apel;2]]Look at the picture. There ... apples.", "are", "is", "am", "be"),
      P("L1", "[[g:ikon;bola;4]]Look at the picture. There ... balls.", "are", "is", "am", "be"),
      P("L1", "[[g:ikon;buku;1]]Look at the picture. There ... book.", "is", "are", "am", "be"),
      P("L1", "[[g:ikon;pensil;5]]Look at the picture. There ... pencils.", "are", "is", "am", "be"),
      I("L1", "[[g:ikon;apel;3]]Look at the picture. There are .... apples. (tulis angka dalam bahasa Inggris)", "three"),
      I("L1", "[[g:ikon;bola;5]]Look at the picture. There are .... balls. (tulis angka dalam bahasa Inggris)", "five"),
      I("L1", "[[g:ikon;kucing;2]]Look at the picture. There are .... cats. (tulis angka dalam bahasa Inggris)", "two")
    ],
    "bin-A-2": [
      P("L1", "[[g:ikon;bola;1]]Huruf pertama nama benda pada gambar adalah ...", "b", "l", "d", "n"),
      P("L1", "[[g:ikon;ikan;1]]Huruf pertama nama benda pada gambar adalah ...", "i", "p", "c", "s"),
      P("L1", "[[g:ikon;kucing;1]]Huruf pertama nama benda pada gambar adalah ...", "k", "b", "f", "a"),
      P("L1", "[[g:ikon;apel;1]]Huruf pertama nama benda pada gambar adalah ...", "a", "f", "h", "b"),
      P("L1", "[[g:ikon;buku;1]]Huruf pertama nama benda pada gambar adalah ...", "b", "c", "p", "m"),
      P("L1", "[[g:ikon;rumah;1]]Huruf pertama nama benda pada gambar adalah ...", "r", "n", "c", "b"),
      P("L1", "[[g:ikon;bunga;1]]Huruf pertama nama benda pada gambar adalah ...", "b", "o", "t", "a"),
      P("L1", "[[g:ikon;pohon;1]]Huruf pertama nama benda pada gambar adalah ...", "p", "e", "a", "t"),
      P("L1", "[[g:ikon;bola;1]]Nama benda pada gambar jika dipisah menjadi suku kata adalah ...", "bo-la", "bol-a", "b-ola", "bo-l-a"),
      P("L1", "[[g:ikon;ikan;1]]Nama benda pada gambar jika dipisah menjadi suku kata adalah ...", "i-kan", "ik-an", "ika-n", "i-ka-n"),
      P("L1", "[[g:ikon;kucing;1]]Nama benda pada gambar jika dipisah menjadi suku kata adalah ...", "ku-cing", "kuc-ing", "k-ucing", "kuci-ng"),
      P("L1", "[[g:ikon;apel;1]]Nama benda pada gambar jika dipisah menjadi suku kata adalah ...", "a-pel", "ap-el", "ape-l", "a-p-el"),
      P("L1", "[[g:ikon;buku;1]]Nama benda pada gambar jika dipisah menjadi suku kata adalah ...", "bu-ku", "buk-u", "b-uku", "bu-k-u"),
      P("L1", "[[g:ikon;rumah;1]]Nama benda pada gambar jika dipisah menjadi suku kata adalah ...", "ru-mah", "rum-ah", "r-umah", "ruma-h")
    ],
    "bin-A-6": [
      P("L1", "[[g:ikon;kucing;1]]Kalimat yang tepat untuk gambar adalah ...", "Ini adalah kucing.", "Ini adalah bola.", "Ini adalah pohon.", "Ini adalah mobil."),
      P("L1", "[[g:ikon;ikan;1]]Kalimat yang tepat untuk gambar adalah ...", "Ini adalah ikan.", "Ini adalah bola.", "Ini adalah pohon.", "Ini adalah mobil."),
      P("L1", "[[g:ikon;apel;3]]Kalimat yang tepat untuk gambar adalah ...", "Ada tiga apel.", "Ada dua apel.", "Ada empat apel.", "Ada lima apel."),
      P("L1", "[[g:ikon;bola;2]]Kalimat yang tepat untuk gambar adalah ...", "Ada dua bola.", "Ada tiga bola.", "Ada empat bola.", "Ada lima bola."),
      P("L1", "[[g:ikon;buku;4]]Kalimat yang tepat untuk gambar adalah ...", "Ada empat buku.", "Ada dua buku.", "Ada tiga buku.", "Ada lima buku."),
      P("L1", "[[g:ikon;bunga;5]]Kalimat yang tepat untuk gambar adalah ...", "Ada lima bunga.", "Ada dua bunga.", "Ada tiga bunga.", "Ada empat bunga.")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();


/* ---- TAMBAHAN soal bergambar jilid 4: pilihan jawaban berupa gambar, jaring-jaring kubus, fase bulan, simetri lipat ---- */
(function () {
  'use strict';
  const I = (lv, q, a) => ['is', lv, q, a];
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const U = (lv, q, k) => ['ur', lv, q, k];
  const TAMBAH = {
    "mtk-A-9": [
      P("L1", "Gambar yang berbentuk persegi adalah ...", "[[g:bangun;persegi]]", "[[g:bangun;persegipanjang]]", "[[g:bangun;segitiga]]", "[[g:bangun;lingkaran]]"),
      P("L1", "Gambar yang berbentuk persegi panjang adalah ...", "[[g:bangun;persegipanjang]]", "[[g:bangun;persegi]]", "[[g:bangun;segitiga]]", "[[g:bangun;lingkaran]]"),
      P("L1", "Gambar yang berbentuk segitiga adalah ...", "[[g:bangun;segitiga]]", "[[g:bangun;persegi]]", "[[g:bangun;persegipanjang]]", "[[g:bangun;lingkaran]]"),
      P("L1", "Gambar yang berbentuk lingkaran adalah ...", "[[g:bangun;lingkaran]]", "[[g:bangun;persegi]]", "[[g:bangun;persegipanjang]]", "[[g:bangun;segitiga]]")
    ],
    "mtk-B-11": [
      P("L1", "Gambar yang berbentuk segi lima adalah ...", "[[g:bangun;segilima]]", "[[g:bangun;jajargenjang]]", "[[g:bangun;trapesium]]", "[[g:bangun;belahketupat]]"),
      P("L1", "Gambar yang berbentuk segi enam adalah ...", "[[g:bangun;segienam]]", "[[g:bangun;segilima]]", "[[g:bangun;trapesium]]", "[[g:bangun;belahketupat]]"),
      P("L1", "Gambar yang berbentuk belah ketupat adalah ...", "[[g:bangun;belahketupat]]", "[[g:bangun;layang]]", "[[g:bangun;trapesium]]", "[[g:bangun;segienam]]"),
      P("L1", "Gambar yang berbentuk jajar genjang adalah ...", "[[g:bangun;jajargenjang]]", "[[g:bangun;belahketupat]]", "[[g:bangun;segienam]]", "[[g:bangun;trapesium]]"),
      P("L1", "Gambar yang berbentuk trapesium adalah ...", "[[g:bangun;trapesium]]", "[[g:bangun;segilima]]", "[[g:bangun;belahketupat]]", "[[g:bangun;jajargenjang]]"),
      P("L1", "Gambar yang berbentuk layang-layang adalah ...", "[[g:bangun;layang]]", "[[g:bangun;segienam]]", "[[g:bangun;segilima]]", "[[g:bangun;belahketupat]]"),
      P("L1", "Gambar yang menunjukkan sudut siku-siku adalah ...", "[[g:sudut;90]]", "[[g:sudut;45]]", "[[g:sudut;120]]", "[[g:sudut;150]]"),
      P("L1", "Gambar yang menunjukkan sudut lancip adalah ...", "[[g:sudut;40]]", "[[g:sudut;90]]", "[[g:sudut;110]]", "[[g:sudut;150]]"),
      P("L1", "Gambar yang menunjukkan sudut tumpul adalah ...", "[[g:sudut;130]]", "[[g:sudut;30]]", "[[g:sudut;90]]", "[[g:sudut;60]]"),
      P("L1", "[[g:bangun;persegi]]Banyak sumbu simetri lipat pada bangun datar di gambar adalah ...", "4", "5", "6", "3"),
      P("L1", "[[g:bangun;persegipanjang]]Banyak sumbu simetri lipat pada bangun datar di gambar adalah ...", "2", "3", "4", "1"),
      I("L1", "[[g:bangun;belahketupat]]Banyak sumbu simetri lipat pada bangun datar di gambar adalah ....", "2"),
      P("L1", "[[g:bangun;layang]]Banyak sumbu simetri lipat pada bangun datar di gambar adalah ...", "1", "2", "3", "0"),
      P("L1", "[[g:bangun;segilima]]Banyak sumbu simetri lipat pada bangun datar di gambar adalah ...", "5", "6", "7", "4"),
      I("L1", "[[g:bangun;segienam]]Banyak sumbu simetri lipat pada bangun datar di gambar adalah ....", "6"),
      P("L1", "[[g:bangun;jajargenjang]]Banyak sumbu simetri lipat pada bangun datar di gambar adalah ...", "0", "1", "2", "3")
    ],
    "mtk-A-4": [
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 1/2 adalah ...", "[[g:pecahan;1;2]]", "[[g:pecahan;3;4]]", "[[g:pecahan;1;4]]", "[[g:pecahan;1;3]]"),
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 1/3 adalah ...", "[[g:pecahan;1;3]]", "[[g:pecahan;1;4]]", "[[g:pecahan;2;3]]", "[[g:pecahan;1;2]]"),
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 2/3 adalah ...", "[[g:pecahan;2;3]]", "[[g:pecahan;3;4]]", "[[g:pecahan;1;2]]", "[[g:pecahan;1;3]]"),
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 1/4 adalah ...", "[[g:pecahan;1;4]]", "[[g:pecahan;1;2]]", "[[g:pecahan;2;3]]", "[[g:pecahan;1;3]]"),
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 3/4 adalah ...", "[[g:pecahan;3;4]]", "[[g:pecahan;2;3]]", "[[g:pecahan;1;4]]", "[[g:pecahan;1;3]]")
    ],
    "mtk-B-5": [
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 3/8 adalah ...", "[[g:pecahan;3;8;batang]]", "[[g:pecahan;1;8;batang]]", "[[g:pecahan;5;8;batang]]", "[[g:pecahan;7;8;batang]]"),
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 5/8 adalah ...", "[[g:pecahan;5;8;batang]]", "[[g:pecahan;1;8;batang]]", "[[g:pecahan;3;8;batang]]", "[[g:pecahan;7;8;batang]]"),
      P("L1", "Gambar yang bagian berwarnanya menunjukkan pecahan 7/8 adalah ...", "[[g:pecahan;7;8;batang]]", "[[g:pecahan;1;8;batang]]", "[[g:pecahan;3;8;batang]]", "[[g:pecahan;5;8;batang]]")
    ],
    "mtk-A-7": [
      P("L1", "Jam yang menunjukkan pukul 02.00 adalah ...", "[[g:jam;2;0]]", "[[g:jam;2;30]]", "[[g:jam;3;0]]", "[[g:jam;1;30]]"),
      P("L1", "Jam yang menunjukkan pukul 05.30 adalah ...", "[[g:jam;5;30]]", "[[g:jam;5;0]]", "[[g:jam;6;30]]", "[[g:jam;4;0]]"),
      P("L1", "Jam yang menunjukkan pukul 07.00 adalah ...", "[[g:jam;7;0]]", "[[g:jam;7;30]]", "[[g:jam;8;0]]", "[[g:jam;6;30]]"),
      P("L1", "Jam yang menunjukkan pukul 08.00 adalah ...", "[[g:jam;8;0]]", "[[g:jam;8;30]]", "[[g:jam;9;0]]", "[[g:jam;7;30]]"),
      P("L1", "Jam yang menunjukkan pukul 08.30 adalah ...", "[[g:jam;8;30]]", "[[g:jam;8;0]]", "[[g:jam;9;30]]", "[[g:jam;7;0]]"),
      P("L1", "Jam yang menunjukkan pukul 12.00 adalah ...", "[[g:jam;12;0]]", "[[g:jam;12;30]]", "[[g:jam;1;0]]", "[[g:jam;11;30]]")
    ],
    "ipas-B-8": [
      P("L1", "Gambar yang panah merahnya menunjuk ke arah utara adalah ...", "[[g:mataangin;U]]", "[[g:mataangin;T]]", "[[g:mataangin;S]]", "[[g:mataangin;B]]"),
      P("L1", "Gambar yang panah merahnya menunjuk ke arah timur adalah ...", "[[g:mataangin;T]]", "[[g:mataangin;U]]", "[[g:mataangin;S]]", "[[g:mataangin;B]]"),
      P("L1", "Gambar yang panah merahnya menunjuk ke arah selatan adalah ...", "[[g:mataangin;S]]", "[[g:mataangin;U]]", "[[g:mataangin;T]]", "[[g:mataangin;B]]"),
      P("L1", "Gambar yang panah merahnya menunjuk ke arah barat adalah ...", "[[g:mataangin;B]]", "[[g:mataangin;U]]", "[[g:mataangin;T]]", "[[g:mataangin;S]]")
    ],
    "ipas-C-6": [
      P("L1", "Gambar yang panah merahnya menunjuk ke arah timur laut adalah ...", "[[g:mataangin;TL]]", "[[g:mataangin;TG]]", "[[g:mataangin;S]]", "[[g:mataangin;BL]]"),
      P("L1", "Gambar yang panah merahnya menunjuk ke arah tenggara adalah ...", "[[g:mataangin;TG]]", "[[g:mataangin;TL]]", "[[g:mataangin;BL]]", "[[g:mataangin;BD]]"),
      P("L1", "Gambar yang panah merahnya menunjuk ke arah barat daya adalah ...", "[[g:mataangin;BD]]", "[[g:mataangin;TG]]", "[[g:mataangin;BL]]", "[[g:mataangin;S]]"),
      P("L1", "Gambar yang panah merahnya menunjuk ke arah barat laut adalah ...", "[[g:mataangin;BL]]", "[[g:mataangin;BD]]", "[[g:mataangin;U]]", "[[g:mataangin;S]]")
    ],
    "mtk-C-10": [
      P("L1", "Gambar yang berbentuk tabung adalah ...", "[[g:ruang;tabung]]", "[[g:ruang;kubus]]", "[[g:ruang;kerucut]]", "[[g:ruang;balok]]"),
      P("L1", "Gambar yang berbentuk kerucut adalah ...", "[[g:ruang;kerucut]]", "[[g:ruang;limas]]", "[[g:ruang;kubus]]", "[[g:ruang;balok]]"),
      P("L1", "Gambar yang berbentuk bola adalah ...", "[[g:ruang;bola]]", "[[g:ruang;kubus]]", "[[g:ruang;tabung]]", "[[g:ruang;kerucut]]"),
      P("L1", "Gambar yang berbentuk limas segi empat adalah ...", "[[g:ruang;limas]]", "[[g:ruang;bola]]", "[[g:ruang;tabung]]", "[[g:ruang;kerucut]]"),
      P("L1", "Gambar yang berbentuk balok adalah ...", "[[g:ruang;balok]]", "[[g:ruang;kerucut]]", "[[g:ruang;tabung]]", "[[g:ruang;limas]]"),
      P("L1", "[[g:jaring;01,10,11,21,22,31]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Ya, dapat membentuk kubus", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "[[g:jaring;01,11,20,21,22,32]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Ya, dapat membentuk kubus", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "[[g:jaring;00,01,11,12,21,31]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Ya, dapat membentuk kubus", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "[[g:jaring;00,01,11,21,22,31]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Ya, dapat membentuk kubus", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "[[g:jaring;00,01,02,11,12,22]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Ya, dapat membentuk kubus", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "[[g:jaring;01,02,10,11,12,13]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Ya, dapat membentuk kubus", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "[[g:jaring;01,10,11,20,21,22]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Ya, dapat membentuk kubus", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "[[g:jaring;00,01,10,11,20,21]]Gambar di atas adalah jaring-jaring. Apakah jaring-jaring ini dapat dilipat membentuk kubus?", "Tidak, ada sisi yang saling menumpuk saat dilipat", "Ya, dapat membentuk kubus", "Tidak, karena bentuknya melingkar", "Tidak, karena jumlah persegi kurang dari 6"),
      P("L1", "Gambar yang merupakan jaring-jaring kubus adalah ...", "[[g:jaring;01,10,11,21,22,31]]", "[[g:jaring;01,11,12,20,21,22]]", "[[g:jaring;01,10,11,20,21,22]]", "[[g:jaring;00,01,02,11,12,21]]"),
      P("L1", "[[g:jaring;01,10,11,21,22,31]]Banyak persegi pada jaring-jaring kubus di gambar adalah ...", "6", "4", "5", "8"),
      I("L1", "[[g:jaring;01,11,20,21,22,32]]Jaring-jaring kubus di gambar terdiri atas .... persegi.", "enam (6)")
    ],
    "seni-A-16": [
      P("L1", "Gambar wajah yang menunjukkan perasaan senang adalah ...", "[[g:wajah;senang]]", "[[g:wajah;terkejut]]", "[[g:wajah;takut]]", "[[g:wajah;sedih]]"),
      P("L1", "Gambar wajah yang menunjukkan perasaan sedih adalah ...", "[[g:wajah;sedih]]", "[[g:wajah;marah]]", "[[g:wajah;terkejut]]", "[[g:wajah;senang]]"),
      P("L1", "Gambar wajah yang menunjukkan perasaan marah adalah ...", "[[g:wajah;marah]]", "[[g:wajah;sedih]]", "[[g:wajah;terkejut]]", "[[g:wajah;takut]]"),
      P("L1", "Gambar wajah yang menunjukkan perasaan takut adalah ...", "[[g:wajah;takut]]", "[[g:wajah;terkejut]]", "[[g:wajah;senang]]", "[[g:wajah;marah]]"),
      P("L1", "Gambar wajah yang menunjukkan perasaan terkejut adalah ...", "[[g:wajah;terkejut]]", "[[g:wajah;senang]]", "[[g:wajah;marah]]", "[[g:wajah;sedih]]")
    ],
    "seni-B-1": [
      P("L1", "Gambar campuran warna yang menghasilkan warna jingga adalah ...", "[[g:warna;merah;+;kuning]]", "[[g:warna;biru;+;kuning]]", "[[g:warna;merah;+;biru]]", "[[g:warna;putih;+;hitam]]"),
      P("L1", "Gambar campuran warna yang menghasilkan warna hijau adalah ...", "[[g:warna;biru;+;kuning]]", "[[g:warna;merah;+;kuning]]", "[[g:warna;merah;+;biru]]", "[[g:warna;putih;+;hitam]]"),
      P("L1", "Gambar campuran warna yang menghasilkan warna ungu adalah ...", "[[g:warna;merah;+;biru]]", "[[g:warna;merah;+;kuning]]", "[[g:warna;biru;+;kuning]]", "[[g:warna;putih;+;hitam]]")
    ],
    "ipas-B-2": [
      P("L1", "Gambar yang menunjukkan kepompong adalah ...", "[[g:ikon;kepompong;1]]", "[[g:ikon;ulat;1]]", "[[g:ikon;telurkupu;1]]", "[[g:ikon;kupu;1]]"),
      P("L1", "Gambar yang menunjukkan ulat (larva) adalah ...", "[[g:ikon;ulat;1]]", "[[g:ikon;kepompong;1]]", "[[g:ikon;telurkupu;1]]", "[[g:ikon;kupu;1]]"),
      P("L1", "Gambar yang menunjukkan kupu-kupu dewasa adalah ...", "[[g:ikon;kupu;1]]", "[[g:ikon;kepompong;1]]", "[[g:ikon;ulat;1]]", "[[g:ikon;telurkupu;1]]"),
      P("L1", "Gambar yang menunjukkan berudu adalah ...", "[[g:ikon;berudu;1]]", "[[g:ikon;katak;1]]", "[[g:ikon;telurkatak;1]]", "[[g:ikon;ikan;1]]")
    ],
    "ipas-C-2": [
      P("L1", "Gambar makhluk hidup yang berperan sebagai produsen adalah ...", "[[g:ikon;rumput;1]]", "[[g:ikon;belalang;1]]", "[[g:ikon;katak;1]]", "[[g:ikon;ular;1]]"),
      P("L1", "Gambar makhluk hidup pemakan tumbuhan (herbivora) adalah ...", "[[g:ikon;belalang;1]]", "[[g:ikon;katak;1]]", "[[g:ikon;ular;1]]", "[[g:ikon;elang;1]]"),
      P("L1", "Gambar makhluk hidup yang menjadi pemangsa di puncak rantai makanan sawah adalah ...", "[[g:ikon;elang;1]]", "[[g:ikon;rumput;1]]", "[[g:ikon;tikus;1]]", "[[g:ikon;belalang;1]]")
    ],
    "big-C-2": [
      P("L1", "Which picture is an apple?", "[[g:ikon;apel;1]]", "[[g:ikon;ayam;1]]", "[[g:ikon;jeruk;1]]", "[[g:ikon;pisang;1]]"),
      P("L1", "Which picture is a banana?", "[[g:ikon;pisang;1]]", "[[g:ikon;ikan;1]]", "[[g:ikon;apel;1]]", "[[g:ikon;jeruk;1]]"),
      P("L1", "Which picture is an orange?", "[[g:ikon;jeruk;1]]", "[[g:ikon;apel;1]]", "[[g:ikon;ayam;1]]", "[[g:ikon;ikan;1]]"),
      P("L1", "Which picture is a fish?", "[[g:ikon;ikan;1]]", "[[g:ikon;ayam;1]]", "[[g:ikon;jeruk;1]]", "[[g:ikon;apel;1]]"),
      P("L1", "Which picture is a chicken?", "[[g:ikon;ayam;1]]", "[[g:ikon;ikan;1]]", "[[g:ikon;jeruk;1]]", "[[g:ikon;pisang;1]]")
    ],
    "big-B-3": [
      P("L1", "Which one is a pencil?", "[[g:ikon;pensil;1]]", "[[g:ikon;buku;1]]", "[[g:ikon;bola;1]]", "[[g:ikon;apel;1]]"),
      P("L1", "Which one is a book?", "[[g:ikon;buku;1]]", "[[g:ikon;pensil;1]]", "[[g:ikon;bola;1]]", "[[g:ikon;apel;1]]")
    ],
    "ipas-C-5": [
      P("L1", "[[g:bulan;baru]]Bentuk bulan pada gambar disebut ...", "bulan baru", "bulan sabit", "bulan separuh", "bulan cembung"),
      P("L1", "[[g:bulan;sabit]]Bentuk bulan pada gambar disebut ...", "bulan sabit", "bulan baru", "bulan separuh", "bulan cembung"),
      P("L1", "[[g:bulan;separuh]]Bentuk bulan pada gambar disebut ...", "bulan separuh", "bulan baru", "bulan sabit", "bulan cembung"),
      P("L1", "[[g:bulan;cembung]]Bentuk bulan pada gambar disebut ...", "bulan cembung", "bulan baru", "bulan sabit", "bulan separuh"),
      P("L1", "[[g:bulan;purnama]]Bentuk bulan pada gambar disebut ...", "bulan purnama", "bulan baru", "bulan sabit", "bulan separuh"),
      P("L1", "Gambar bulan yang berbentuk sabit adalah ...", "[[g:bulan;sabit]]", "[[g:bulan;purnama]]", "[[g:bulan;baru]]", "[[g:bulan;separuh]]"),
      P("L1", "Gambar bulan yang tampak bulat penuh adalah ...", "[[g:bulan;purnama]]", "[[g:bulan;cembung]]", "[[g:bulan;baru]]", "[[g:bulan;sabit]]"),
      I("L1", "[[g:bulan;purnama]]Bulan yang tampak bulat penuh seperti pada gambar disebut bulan ....", "purnama"),
      I("L1", "[[g:bulan;sabit]]Bulan yang tampak melengkung tipis seperti pada gambar disebut bulan ....", "sabit")
    ]
  };
  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
