/* ============================================================
   SI MAMBA - js/data-tp-umum.js
   Bank usulan Tujuan Pembelajaran (TP) MAPEL UMUM Madrasah Ibtidaiyah (Fase A, B, C):
   Matematika (mtk), Bahasa Indonesia (bin), Pendidikan Pancasila (pp), PJOK (pjok), IPAS (ipas; Fase B-C),
   Seni (seni), Bahasa Inggris (big; Fase B-C, mapel pilihan/muatan lokal).
   Format SAMA dengan js/data-tp-mi.js: [elemen, tujuan pembelajaran, materi pokok]. Kunci soal = kode mapel-FASE-nomor urut.
   Status: USULAN/DRAF. Rumusan TP dan ringkasan CP ditulis ulang dari cakupan Capaian Pembelajaran Kurikulum Merdeka
   (bukan salinan naskah). Telaah bersama KKG/Kepala Madrasah dan rujuk naskah CP resmi terbaru sebelum dipakai final.
   Fase A = kelas 1-2, B = kelas 3-4, C = kelas 5-6. IPAS diajarkan mulai Fase B.
   WAJIB dimuat SESUDAH js/data-tp-mi.js dan SEBELUM js/perangkat-*.js.
============================================================ */
(function () {
  'use strict';
  const PROSES = {
    mtk: "Alur proses: memahami masalah, memilih strategi, menyelesaikan, menalar dan memeriksa jawaban, mengomunikasikan hasil.",
    bin: "Keterampilan bahasa: menyimak, membaca dan memirsa, berbicara dan mempresentasikan, menulis.",
    pp: "Alur proses: mengamati, bertanya, mengumpulkan informasi, mengolah, menyimpulkan, mengomunikasikan, dan merefleksikan penerapan nilai.",
    pjok: "Alur proses: mengamati contoh gerak, mencoba, berlatih, bermain, mengevaluasi, dan merefleksikan.",
    ipas: "Alur proses: mengamati, bertanya dan memprediksi, merencanakan dan melakukan penyelidikan, mengolah data, mengevaluasi, mengomunikasikan hasil.",
    seni: "Alur proses: mengalami, menciptakan, merefleksikan, dan berdampak (mengomunikasikan karya).",
    big: "Keterampilan bahasa: menyimak-berbicara, membaca-memirsa, menulis-mempresentasikan."
};
  const TAMBAHAN = {
    mtk: {
      nama: "Matematika",
      cp: {
        A: ["Pemahaman Konsep: bilangan cacah sampai 100, penjumlahan dan pengurangan, perkalian dan pembagian sederhana, pecahan setengah dan seperempat; pola dan kalimat matematika; pengukuran tidak baku dan waktu; bangun datar dan bangun ruang sederhana; data dalam tabel dan diagram gambar.", PROSES.mtk],
        B: ["Pemahaman Konsep: bilangan cacah sampai 10.000 dan operasinya; pecahan dan desimal sederhana; pola dan nilai yang belum diketahui; pengukuran baku, waktu, keliling dan luas; ciri bangun datar dan ruang; data dalam tabel, diagram gambar, dan diagram batang.", PROSES.mtk],
        C: ["Pemahaman Konsep: bilangan sampai 1.000.000, faktor dan kelipatan, pecahan, desimal, persen, dan perbandingan; pola dan persamaan sederhana; konversi satuan, luas, dan volume; sifat bangun ruang; rata-rata, median, dan modus.", PROSES.mtk]
      },
      tp: {
        A: [
          ["Bilangan", "Murid mampu membaca, menulis, membandingkan, dan mengurutkan bilangan cacah sampai 100.", "Bilangan sampai 100"],
          ["Bilangan", "Murid mampu menentukan nilai tempat (puluhan dan satuan) serta menguraikan bilangan sampai 100.", "Nilai tempat bilangan sampai 100"],
          ["Bilangan", "Murid mampu menyelesaikan penjumlahan dan pengurangan bilangan sampai 20.", "Penjumlahan dan pengurangan sampai 20"],
          ["Bilangan", "Murid mampu menyelesaikan penjumlahan dan pengurangan bilangan sampai 100, termasuk soal cerita.", "Penjumlahan dan pengurangan sampai 100"],
          ["Bilangan", "Murid mampu menyelesaikan perkalian dan pembagian sederhana dengan benda konkret, hasil sampai 20.", "Perkalian dan pembagian sederhana"],
          ["Bilangan", "Murid mampu mengenal pecahan setengah dan seperempat sebagai bagian dari keseluruhan.", "Pecahan setengah dan seperempat"],
          ["Aljabar", "Murid mampu melanjutkan pola sederhana dan mengisi nilai yang belum diketahui pada kalimat matematika.", "Pola dan kalimat matematika"],
          ["Pengukuran", "Murid mampu mengukur dan membandingkan panjang dan berat benda dengan satuan tidak baku.", "Panjang dan berat tidak baku"],
          ["Pengukuran", "Murid mampu mengenal waktu: jam, hari, dan bulan.", "Waktu: jam, hari, bulan"],
          ["Geometri", "Murid mampu mengenal bangun datar dan bangun ruang sederhana serta posisi benda.", "Bangun datar, bangun ruang, posisi benda"],
          ["Analisis Data dan Peluang", "Murid mampu mengumpulkan, menyajikan, dan membaca data dalam tabel dan diagram gambar.", "Data: tabel dan diagram gambar"]
        ],
        B: [
          ["Bilangan", "Murid mampu membaca, menulis, menentukan nilai tempat, dan membandingkan bilangan cacah sampai 10.000.", "Bilangan sampai 10.000"],
          ["Bilangan", "Murid mampu menyelesaikan penjumlahan dan pengurangan bilangan sampai 10.000.", "Penjumlahan dan pengurangan sampai 10.000"],
          ["Bilangan", "Murid mampu menyelesaikan perkalian dan pembagian bilangan cacah.", "Perkalian dan pembagian"],
          ["Bilangan", "Murid mampu menyelesaikan operasi hitung campuran dan soal cerita.", "Operasi hitung campuran dan soal cerita"],
          ["Bilangan", "Murid mampu mengenal, membandingkan, dan menentukan pecahan senilai serta menjumlahkan pecahan berpenyebut sama.", "Pecahan"],
          ["Bilangan", "Murid mampu mengenal bilangan desimal sederhana dan hubungannya dengan pecahan.", "Bilangan desimal"],
          ["Aljabar", "Murid mampu menentukan pola bilangan dan mengisi nilai yang belum diketahui.", "Pola bilangan"],
          ["Pengukuran", "Murid mampu mengukur dan mengonversi panjang (cm, m, km) dan berat (g, kg) dengan satuan baku.", "Panjang dan berat satuan baku"],
          ["Pengukuran", "Murid mampu menentukan waktu dan durasi dalam jam, menit, dan detik.", "Waktu dan durasi"],
          ["Pengukuran", "Murid mampu menghitung keliling bangun datar serta luas persegi dan persegi panjang.", "Keliling dan luas"],
          ["Geometri", "Murid mampu mendeskripsikan ciri bangun datar dan bangun ruang.", "Ciri bangun datar dan bangun ruang"],
          ["Analisis Data dan Peluang", "Murid mampu menyajikan, membaca, dan menafsirkan data dalam tabel, diagram gambar, dan diagram batang.", "Penyajian data"]
        ],
        C: [
          ["Bilangan", "Murid mampu membaca, menulis, menentukan nilai tempat, membulatkan, dan membandingkan bilangan sampai 1.000.000.", "Bilangan sampai 1.000.000"],
          ["Bilangan", "Murid mampu menyelesaikan operasi hitung bilangan cacah besar dan soal cerita.", "Operasi hitung bilangan besar"],
          ["Bilangan", "Murid mampu menentukan faktor, kelipatan, KPK, dan FPB.", "Faktor, kelipatan, KPK, FPB"],
          ["Bilangan", "Murid mampu menyelesaikan penjumlahan dan pengurangan pecahan berpenyebut berbeda.", "Operasi pecahan"],
          ["Bilangan", "Murid mampu menghubungkan pecahan, desimal, dan persen serta menyelesaikan soal sehari-hari.", "Pecahan, desimal, dan persen"],
          ["Bilangan", "Murid mampu menyelesaikan masalah perbandingan dan skala sederhana.", "Perbandingan dan skala"],
          ["Aljabar", "Murid mampu menentukan pola bilangan dan menyelesaikan kalimat matematika dengan nilai yang belum diketahui.", "Pola dan kalimat matematika"],
          ["Pengukuran", "Murid mampu mengonversi satuan panjang, berat, waktu, dan volume cairan.", "Konversi satuan"],
          ["Pengukuran", "Murid mampu menghitung luas dan keliling berbagai bangun datar.", "Luas dan keliling bangun datar"],
          ["Pengukuran", "Murid mampu menghitung volume kubus dan balok serta hubungannya dengan liter.", "Volume kubus dan balok"],
          ["Geometri", "Murid mampu mengidentifikasi sifat bangun ruang dan jaring-jaringnya.", "Sifat dan jaring-jaring bangun ruang"],
          ["Analisis Data dan Peluang", "Murid mampu menentukan rata-rata, median, dan modus serta menafsirkan data.", "Rata-rata, median, dan modus"]
        ]
      }
    },
    bin: {
      nama: "Bahasa Indonesia",
      cp: {
        A: ["Pemahaman Konsep: menyimak pesan dan cerita sederhana; membaca huruf, suku kata, kata, kalimat, dan teks pendek; berbicara santun; menulis huruf, kata, dan kalimat sederhana.", PROSES.bin],
        B: ["Pemahaman Konsep: menyimak informasi pokok; membaca lancar dan menemukan ide pokok; mengenal jenis teks; bercerita dan berpendapat; menulis paragraf dengan ejaan dan tanda baca; kosakata dan kata bermakna sama atau berlawanan.", PROSES.bin],
        C: ["Pemahaman Konsep: menyimak dan menyimpulkan teks; gagasan utama, fakta, dan opini; unsur cerita; presentasi dan diskusi; menulis berbagai teks; ejaan, kata baku, dan imbuhan.", PROSES.bin]
      },
      tp: {
        A: [
          ["Menyimak", "Murid mampu menyimak dan memahami pesan lisan sederhana serta cerita pendek.", "Menyimak pesan dan cerita"],
          ["Membaca dan Memirsa", "Murid mampu mengenal huruf dan suku kata serta membaca kata dan kalimat sederhana.", "Huruf, suku kata, kata, dan kalimat"],
          ["Membaca dan Memirsa", "Murid mampu membaca teks pendek dan menentukan isi bacaan.", "Membaca teks pendek"],
          ["Berbicara dan Mempresentasikan", "Murid mampu berbicara dengan santun: menyapa, memperkenalkan diri, meminta tolong, dan berterima kasih.", "Berbicara santun"],
          ["Menulis", "Murid mampu menulis huruf, kata, dan kalimat sederhana dengan huruf kapital dan tanda titik yang tepat.", "Menulis kata dan kalimat"],
          ["Menulis", "Murid mampu menyusun kata menjadi kalimat dan menulis kalimat sederhana tentang gambar.", "Menyusun kalimat dari gambar"]
        ],
        B: [
          ["Menyimak", "Murid mampu menyimak dan menangkap informasi pokok teks lisan seperti pengumuman, penjelasan, dan dongeng.", "Informasi pokok teks lisan"],
          ["Membaca dan Memirsa", "Murid mampu membaca lancar serta menentukan ide pokok dan informasi rinci dalam bacaan.", "Ide pokok paragraf"],
          ["Membaca dan Memirsa", "Murid mampu mengenal ciri teks narasi, deskripsi, dan prosedur.", "Jenis teks"],
          ["Berbicara dan Mempresentasikan", "Murid mampu menceritakan kembali dan menyampaikan pendapat dengan kalimat runtut dan santun.", "Bercerita dan berpendapat"],
          ["Menulis", "Murid mampu menulis paragraf sederhana dengan huruf kapital dan tanda baca yang tepat.", "Paragraf dan tanda baca"],
          ["Kebahasaan", "Murid mampu menggunakan kosakata, kata yang bermakna sama dan berlawanan, serta kata tanya dengan tepat.", "Sinonim, antonim, dan kata tanya"]
        ],
        C: [
          ["Menyimak", "Murid mampu menyimak teks seperti berita, wawancara, dan pidato serta menyimpulkan isinya.", "Menyimak dan menyimpulkan"],
          ["Membaca dan Memirsa", "Murid mampu menemukan gagasan utama serta membedakan fakta dan opini dalam bacaan.", "Gagasan utama, fakta, dan opini"],
          ["Membaca dan Memirsa", "Murid mampu mengidentifikasi unsur cerita: tokoh, latar, alur, dan amanat.", "Unsur cerita"],
          ["Berbicara dan Mempresentasikan", "Murid mampu mempresentasikan hasil kerja dan berdiskusi dengan santun.", "Presentasi dan diskusi"],
          ["Menulis", "Murid mampu menulis teks narasi, deskripsi, surat, dan teks informasi sesuai kaidah.", "Menulis berbagai teks"],
          ["Kebahasaan", "Murid mampu menggunakan ejaan, kata baku, dan imbuhan dengan tepat.", "Ejaan, kata baku, dan imbuhan"]
        ]
      }
    },
    pp: {
      nama: "Pendidikan Pancasila",
      cp: {
        A: ["Pemahaman Konsep: lambang negara dan sila Pancasila; perilaku sesuai Pancasila; aturan, hak, dan kewajiban sederhana; menghargai perbedaan; identitas bangsa Indonesia.", PROSES.pp],
        B: ["Pemahaman Konsep: makna lambang sila Pancasila; musyawarah dan gotong royong; hak, kewajiban, dan tata tertib; keberagaman dan toleransi; wilayah Indonesia dan persatuan; cinta tanah air.", PROSES.pp],
        C: ["Pemahaman Konsep: pengamalan Pancasila; hak dan kewajiban warga negara; lembaga negara dan pemilu sederhana; keberagaman dan persatuan; letak Indonesia dan kerja sama antarnegara; bela negara.", PROSES.pp]
      },
      tp: {
        A: [
          ["Pancasila", "Murid mampu mengenal lambang negara Garuda Pancasila dan sila-sila Pancasila.", "Lambang negara dan sila Pancasila"],
          ["Pancasila", "Murid mampu menunjukkan perilaku yang sesuai dengan sila Pancasila di rumah dan sekolah.", "Perilaku sesuai Pancasila"],
          ["Undang-Undang Dasar 1945", "Murid mampu menjelaskan aturan di rumah dan sekolah serta hak dan kewajiban sederhana.", "Aturan, hak, dan kewajiban"],
          ["Bhinneka Tunggal Ika", "Murid mampu menghargai perbedaan teman dan hidup rukun.", "Perbedaan dan kerukunan"],
          ["Negara Kesatuan Republik Indonesia", "Murid mampu mengenal identitas bangsa: bendera, bahasa, dan lagu kebangsaan.", "Identitas bangsa Indonesia"]
        ],
        B: [
          ["Pancasila", "Murid mampu menjelaskan makna lambang sila-sila Pancasila.", "Makna lambang sila Pancasila"],
          ["Pancasila", "Murid mampu menerapkan nilai Pancasila melalui musyawarah dan gotong royong.", "Musyawarah dan gotong royong"],
          ["Undang-Undang Dasar 1945", "Murid mampu menjelaskan hak, kewajiban, dan tata tertib sebagai warga.", "Hak, kewajiban, dan tata tertib"],
          ["Bhinneka Tunggal Ika", "Murid mampu mengenal keragaman suku, budaya, dan agama serta bersikap toleran.", "Keberagaman dan toleransi"],
          ["Negara Kesatuan Republik Indonesia", "Murid mampu mengenal wilayah Indonesia dan pentingnya persatuan.", "Wilayah Indonesia dan persatuan"],
          ["Negara Kesatuan Republik Indonesia", "Murid mampu menunjukkan sikap cinta tanah air.", "Cinta tanah air"]
        ],
        C: [
          ["Pancasila", "Murid mampu menganalisis kaitan sila-sila Pancasila dan pengamalannya dalam kehidupan.", "Pengamalan Pancasila"],
          ["Undang-Undang Dasar 1945", "Murid mampu menjelaskan hak dan kewajiban warga negara.", "Hak dan kewajiban warga negara"],
          ["Undang-Undang Dasar 1945", "Murid mampu mengenal tugas lembaga negara dan pemilu secara sederhana.", "Lembaga negara dan pemilu"],
          ["Bhinneka Tunggal Ika", "Murid mampu menyikapi keberagaman dengan kerja sama dan menyelesaikan perbedaan secara damai.", "Keberagaman dan persatuan"],
          ["Negara Kesatuan Republik Indonesia", "Murid mampu menjelaskan letak Indonesia dan kerja sama antarnegara di ASEAN.", "Letak Indonesia dan ASEAN"],
          ["Negara Kesatuan Republik Indonesia", "Murid mampu menunjukkan sikap bela negara dan cinta tanah air.", "Bela negara"]
        ]
      }
    },
    pjok: {
      nama: "Pendidikan Jasmani, Olahraga, dan Kesehatan",
      cp: {
        A: ["Pemahaman Konsep: gerak lokomotor, nonlokomotor, dan manipulatif; kebersihan dan kesehatan diri; sikap bermain.", PROSES.pjok],
        B: ["Pemahaman Konsep: permainan bola sederhana; senam dasar; komponen kebugaran jasmani; pola hidup sehat; kerja sama dan sportivitas.", PROSES.pjok],
        C: ["Pemahaman Konsep: permainan bola dengan aturan; atletik; senam; kebugaran dan kesehatan; sportivitas dan pengelolaan emosi.", PROSES.pjok]
      },
      tp: {
        A: [
          ["Keterampilan Gerak", "Murid mampu mempraktikkan gerak lokomotor: berjalan, berlari, melompat, dan berjingkat.", "Gerak lokomotor"],
          ["Keterampilan Gerak", "Murid mampu mempraktikkan gerak nonlokomotor: membungkuk, meregang, memutar, dan mengayun.", "Gerak nonlokomotor"],
          ["Keterampilan Gerak", "Murid mampu mempraktikkan gerak manipulatif: melempar, menangkap, dan menendang bola.", "Gerak manipulatif"],
          ["Pengetahuan Gerak", "Murid mampu menjelaskan kebersihan dan kesehatan diri.", "Kebersihan dan kesehatan diri"],
          ["Pengembangan Karakter dan Internalisasi Nilai Gerak", "Murid mampu menunjukkan sikap taat aturan, kerja sama, dan sportif saat bermain.", "Sikap bermain"]
        ],
        B: [
          ["Keterampilan Gerak", "Murid mampu mempraktikkan permainan bola sederhana dengan kombinasi gerak dasar.", "Permainan bola sederhana"],
          ["Keterampilan Gerak", "Murid mampu mempraktikkan senam lantai sederhana dan gerak berirama.", "Senam lantai dan gerak berirama"],
          ["Pengetahuan Gerak", "Murid mampu mengenal komponen kebugaran jasmani.", "Komponen kebugaran jasmani"],
          ["Pemanfaatan Gerak", "Murid mampu menerapkan pola hidup sehat melalui aktivitas fisik dan makanan bergizi.", "Pola hidup sehat"],
          ["Pengembangan Karakter dan Internalisasi Nilai Gerak", "Murid mampu menunjukkan kerja sama, tanggung jawab, dan kejujuran dalam aktivitas jasmani.", "Kerja sama dan kejujuran"]
        ],
        C: [
          ["Keterampilan Gerak", "Murid mampu mempraktikkan permainan bola besar dan bola kecil dengan aturan sederhana.", "Permainan bola dengan aturan"],
          ["Keterampilan Gerak", "Murid mampu mempraktikkan atletik: lari, lompat, dan lempar.", "Atletik"],
          ["Keterampilan Gerak", "Murid mampu mempraktikkan rangkaian senam.", "Senam"],
          ["Pemanfaatan Gerak", "Murid mampu menjelaskan manfaat kebugaran jasmani dan menjaga kesehatan.", "Kebugaran dan kesehatan"],
          ["Pengembangan Karakter dan Internalisasi Nilai Gerak", "Murid mampu menunjukkan sportivitas, menghargai lawan, dan mengelola emosi.", "Sportivitas dan emosi"]
        ]
      }
    },
    ipas: {
      nama: "Ilmu Pengetahuan Alam dan Sosial",
      cp: {
        B: ["Pemahaman Konsep: bagian tumbuhan dan siklus hidup makhluk hidup; wujud benda; gaya dan gerak; bentuk energi; siang dan malam serta sumber daya alam; keragaman budaya, kebutuhan manusia, dan interaksi sosial.", PROSES.ipas],
        C: ["Pemahaman Konsep: sistem organ tubuh; ekosistem dan rantai makanan; sifat dan perubahan benda; listrik dan magnet; siklus air dan cuaca; kondisi geografis; sejarah Indonesia; kegiatan ekonomi.", PROSES.ipas]
      },
      tp: {
        B: [
          ["Sains", "Murid mampu mengidentifikasi bagian tumbuhan dan fungsinya serta siklus hidup makhluk hidup.", "Bagian tumbuhan dan siklus hidup"],
          ["Sains", "Murid mampu membedakan wujud benda padat, cair, dan gas serta perubahannya.", "Wujud benda"],
          ["Sains", "Murid mampu menjelaskan pengaruh gaya dorong dan gaya tarik pada gerak benda.", "Gaya dan gerak"],
          ["Sains", "Murid mampu mengenal bentuk energi (panas, cahaya, dan bunyi) beserta contohnya.", "Bentuk energi"],
          ["Sains", "Murid mampu menjelaskan pergantian siang dan malam serta sumber daya alam.", "Siang malam dan sumber daya alam"],
          ["Sosial", "Murid mampu mengenal keragaman suku dan budaya di lingkungan sekitar.", "Keragaman budaya"],
          ["Sosial", "Murid mampu menjelaskan kebutuhan manusia dan kegiatan ekonomi sederhana.", "Kebutuhan dan kegiatan ekonomi"],
          ["Sosial", "Murid mampu menjelaskan interaksi sosial dan norma di masyarakat.", "Interaksi sosial dan norma"]
        ],
        C: [
          ["Sains", "Murid mampu menjelaskan sistem organ tubuh (pencernaan, pernapasan, dan peredaran darah) serta cara menjaga kesehatannya.", "Sistem organ tubuh"],
          ["Sains", "Murid mampu menjelaskan rantai makanan dan ekosistem.", "Rantai makanan dan ekosistem"],
          ["Sains", "Murid mampu membedakan perubahan wujud benda dan campuran.", "Sifat dan perubahan benda"],
          ["Sains", "Murid mampu menjelaskan rangkaian listrik sederhana dan sifat magnet.", "Listrik dan magnet"],
          ["Sains", "Murid mampu menjelaskan siklus air, cuaca, dan bencana alam.", "Siklus air dan cuaca"],
          ["Sosial", "Murid mampu menjelaskan kondisi geografis Indonesia dan membaca peta sederhana.", "Geografi Indonesia dan peta"],
          ["Sosial", "Murid mampu menceritakan peristiwa sejarah Indonesia: kerajaan, penjajahan, dan kemerdekaan.", "Sejarah Indonesia"],
          ["Sosial", "Murid mampu menjelaskan kegiatan ekonomi dan perdagangan.", "Kegiatan ekonomi dan perdagangan"]
        ]
      }
    },
    seni: {
      nama: "Seni",
      cp: {
        A: ["Pemahaman Konsep: mengenal unsur rupa, bunyi, gerak, dan ekspresi melalui seni rupa, musik, tari, dan teater sederhana.", PROSES.seni],
        B: ["Pemahaman Konsep: karya seni rupa dua dimensi; tempo, dinamika, dan alat musik; tari daerah; drama sederhana.", PROSES.seni],
        C: ["Pemahaman Konsep: unsur dan prinsip seni rupa; nada dan notasi; unsur tari; unsur teater.", PROSES.seni]
      },
      tp: {
        A: [
          ["Seni Rupa", "Murid mampu mengenal unsur rupa: garis, bentuk, dan warna.", "Garis, bentuk, dan warna"],
          ["Seni Musik", "Murid mampu mengenal bunyi keras dan lembut, tinggi dan rendah, serta bernyanyi lagu anak.", "Bunyi dan lagu anak"],
          ["Seni Tari", "Murid mampu menggerakkan anggota tubuh mengikuti irama.", "Gerak mengikuti irama"],
          ["Seni Teater", "Murid mampu bermain peran sederhana dengan ekspresi.", "Bermain peran"]
        ],
        B: [
          ["Seni Rupa", "Murid mampu membuat karya dua dimensi dengan unsur garis, bentuk, dan warna.", "Karya dua dimensi"],
          ["Seni Musik", "Murid mampu mengenal tempo, dinamika, dan alat musik.", "Tempo, dinamika, dan alat musik"],
          ["Seni Tari", "Murid mampu mengenal dan menirukan gerak tari daerah.", "Tari daerah"],
          ["Seni Teater", "Murid mampu memerankan drama sederhana dengan dialog.", "Drama sederhana"]
        ],
        C: [
          ["Seni Rupa", "Murid mampu menjelaskan unsur dan prinsip seni rupa serta membuat karya dua atau tiga dimensi.", "Unsur dan prinsip seni rupa"],
          ["Seni Musik", "Murid mampu mengenal nada, notasi angka, birama, dan lagu daerah.", "Nada, notasi, dan lagu daerah"],
          ["Seni Tari", "Murid mampu menjelaskan unsur tari dan tari daerah.", "Unsur tari"],
          ["Seni Teater", "Murid mampu menjelaskan unsur teater dan menampilkan pementasan sederhana.", "Unsur teater"]
        ]
      }
    },
    big: {
      nama: "Bahasa Inggris",
      cp: {
        B: ["Pemahaman Konsep: sapaan dan perkenalan; angka dan warna; benda dan perintah di kelas; anggota keluarga; kalimat sederhana dengan this/that, my/your.", PROSES.big],
        C: ["Pemahaman Konsep: kegiatan sehari-hari dan waktu; hobi, makanan, dan minuman; tempat dan arah; simple present; deskripsi orang dan benda.", PROSES.big]
      },
      tp: {
        B: [
          ["Menyimak-Berbicara", "Murid mampu menyapa dan memperkenalkan diri dalam bahasa Inggris.", "Greetings and introduction"],
          ["Membaca-Memirsa", "Murid mampu mengenal angka dan warna dalam bahasa Inggris.", "Numbers and colours"],
          ["Menyimak-Berbicara", "Murid mampu memahami benda dan perintah sederhana di kelas.", "Classroom objects and instructions"],
          ["Membaca-Memirsa", "Murid mampu menyebutkan anggota keluarga dalam bahasa Inggris.", "Family members"],
          ["Menulis-Mempresentasikan", "Murid mampu menyusun kalimat sederhana dengan this, that, my, dan your.", "Simple sentences"]
        ],
        C: [
          ["Menyimak-Berbicara", "Murid mampu menceritakan kegiatan sehari-hari dan menyebutkan waktu.", "Daily routine and time"],
          ["Membaca-Memirsa", "Murid mampu menyebutkan hobi, makanan, dan minuman.", "Hobbies, food, and drink"],
          ["Menyimak-Berbicara", "Murid mampu menyebutkan tempat dan memberi arah sederhana.", "Places and directions"],
          ["Menulis-Mempresentasikan", "Murid mampu menyusun kalimat simple present sederhana.", "Simple present"],
          ["Menulis-Mempresentasikan", "Murid mampu mendeskripsikan orang dan benda dengan kata sifat serta there is dan there are.", "Describing people and things"]
        ]
      }
    }
  };

  window.BANK_TP_MI = window.BANK_TP_MI || { mapel: {} };
  window.BANK_TP_MI.mapel = window.BANK_TP_MI.mapel || {};
  Object.keys(TAMBAHAN).forEach(function (k) { window.BANK_TP_MI.mapel[k] = TAMBAHAN[k]; });
})();
