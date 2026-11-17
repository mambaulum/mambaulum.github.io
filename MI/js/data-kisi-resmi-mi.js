/* ============================================================
   SI MAMBA - js/data-kisi-resmi-mi.js
   Rujukan INDIKATOR SOAL dan BENTUK SOAL dari dua berkas unggahan pengguna:
     - kisi_kisi_am_alquran_hadis_mi_2025.xlsx (Al-Qur'an Hadis MI, kelas IV-VI, 26 butir)
     - kisi_kisi_am_bahasa_arab_mi_2025.xlsx   (Bahasa Arab MI, kelas IV-VI, 20 butir)
   Dipetakan ke kunci TP di js/data-tp-mi.js. Hanya butir yang punya padanan TP yang dimuat:
     Al-Qur'an Hadis: 15 butir -> 13 TP; Bahasa Arab: 16 butir -> 10 TP (butir no.10 dipetakan ke dua TP: ba-C-4 dan ba-C-5).
   Dipakai js/perangkat-kisi.js sebagai usulan awal indikator dan keterangan bentuk soal.
   CATATAN: berkas sumber tidak memuat nomor soal, level kognitif, maupun keterangan penerbit; cocokkan dengan
   PDF resmi Kemenag (KISI-KISI UJIAN MADRASAH 2025/2026, Kepdirjen 3302) sebelum dipakai sebagai dokumen final.
   Verifikasi ulang 17 Nov 2026 terhadap data-tp-mi.js hasil audit 17 Nov 2026 (kunci = mapel-FASE-nomor urut TP, mulai 1):
   semua 23 kunci (13 AQH + 10 BA) masih menunjuk TP yang sama dengan materi butirnya; tidak ada kunci yang bergeser.
   Rumusan TP Bahasa Arab yang disesuaikan pada audit tidak mengubah urutan, sehingga pemetaan tetap berlaku.
   Catatan kehati-hatian (tidak mengubah pemetaan):
     - AQH no.1 (Izhar dan Ikhfa) dipetakan ke aqh-B-3 karena indikatornya hanya Izhar Halqi; Ikhfa' hakiki (aqh-B-4) belum punya butir.
     - AQH no.18 (Ra) dipetakan ke aqh-C-3 (tafkhim); Jawazul wajhain (aqh-C-4) belum punya butir.
     - BA no.10 (Di Sekolah: Perpustakaan/Kantin) dipakai di dua kunci (ba-C-4, ba-C-5); perangkat-kisi.js hanya menampilkannya di kedua TP itu (tidak ada rekap butir).
     - BA no.5 (menyusun), no.18 (fi'il madi), no.20 (membuat kalimat) bersifat produktif/menulis; keterampilan menulis juga tercakup di TP
       'Keterampilan berbahasa' (ba-B-13 / ba-C-10), yang belum punya butir.
     - Butir kelas V yang materinya ada di TP Fase B (AQH no.16 Silaturahmi -> aqh-B-13; BA no.8 Profesi -> ba-B-8) tetap dilewati
       karena beda fase; PDF resmi (di bawah) juga menaruhnya di Fase B.
   Dicek terhadap PDF resmi KISI-KISI UJIAN MADRASAH TAHUN AJARAN 2025/2026 (halaman judul: KEPDIRJEN 3302; AQH MI hlm.1-7, BA MI hlm.21-25):
     - CP/materi per fase di PDF sama dengan TP di data-tp-mi.js (AQH Fase B-C dan BA Fase B-C); tidak ada perbedaan topik.
     - PDF hanya memuat indikator tingkat fase; TIDAK memuat nomor butir, kelas, maupun bentuk soal. Jadi bentuk soal tetap hanya dari xlsx.
     - Surah contoh di PDF: Fase B (aqh-B-8) = al-Ma'un, at-Takatsur, al-Qari'ah, az-Zalzalah; Fase C = al-Ma'un (munafik),
       ad-Dhuha (anak yatim), al-Bayyinah, at-Tin, ad-Dhuha (memberi/amal saleh).
       Calon padanan butir yang masih dilewati (indikator/bentuk dari xlsx belum ada, jadi belum dimuat):
         no.11 al-Qari'ah, no.12 az-Zalzalah (kelas V) -> aqh-B-8 (Fase B, beda fase dengan kelas V);
         no.22 adh-Dhuha -> aqh-C-6 (juga C-7); no.19 al-Bayyinah dan no.14 at-Tin -> aqh-C-8.
       Tanpa padanan di PDF: no.13 al-'Adiyat, no.15 al-Humazah, no.20 al-'Alaq, no.21 al-Qadr, no.23 al-Insyirah.
     - BA: topik Fase B/C di PDF sama dengan TP; 'Kegiatan sehari-hari' (no.15-16) dan 'al-Hadiqah/Kebun' (no.9) tidak ada di Fase C. Profesi di Fase B.
       Indikator Fase C PDF mencakup fi'il madhi-mudhari', menyusun kosakata menjadi kalimat, dan menerjemahkan, sehingga BA no.5, 13, 18, 20 masih wajar.
   Indikator butir (xlsx) lebih spesifik daripada indikator fase di PDF; arahnya konsisten, belum dicocokkan kata per kata.
   Butir tanpa padanan TP (dilewati):
     Al-Qur'an Hadis: no.11 kelas V QS. al-Qari'ah; no.12 kelas V QS. al-Zalzalah; no.13 kelas V QS. al-'Adiyat; no.14 kelas V QS. at-Tin; no.15 kelas V QS. al-Humazah; no.16 kelas V Hadis tentang Silaturahmi; no.19 kelas VI QS. al-Bayyinah; no.20 kelas VI QS. al-'Alaq (Ayat 1-5); no.21 kelas VI QS. al-Qadr; no.22 kelas VI QS. adh-Dhuha; no.23 kelas VI QS. al-Insyirah.
     Bahasa Arab: no.8 kelas Kelas V المهنة (Al-Mihnah/Profesi); no.9 kelas Kelas V الحديقة (Al-Hadiqah/Kebun); no.15 kelas Kelas VI الأنشطة اليومية (Al-Ansyithah Al-Yaumiyah); no.16 kelas Kelas VI الأنشطة اليومية (Al-Ansyithah Al-Yaumiyah).
   Catatan format: field kelas ditulis 'IV'/'V'/'VI' (tanpa awalan 'Kelas ') karena perangkat-kisi.js menambah kata 'kelas' sendiri.
   Format: { 'kunci-TP': [ { mp (mapel), no, kelas, materi, i (indikator), bentuk (teks asli) } ] }
============================================================ */
window.BANK_KISI_RESMI_MI = {
 "aqh-B-3": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 1,
   "kelas": "IV",
   "materi": "Hukum Bacaan Izhar dan Ikhfa",
   "i": "Disajikan beberapa potongan ayat, siswa dapat menentukan contoh bacaan Izhar Halqi dengan tepat.",
   "bentuk": "Pilihan Ganda (PG)"
  }
 ],
 "aqh-B-5": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 2,
   "kelas": "IV",
   "materi": "Hukum Bacaan Idgham Bighunnah dan Bilaghunnah",
   "i": "Disajikan ayat Al-Qur'an, siswa dapat mengidentifikasi lafal yang mengandung hukum bacaan Idgham Bighunnah.",
   "bentuk": "Pilihan Ganda Kompleks"
  }
 ],
 "aqh-B-8": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 3,
   "kelas": "IV",
   "materi": "QS. al-Ashr",
   "i": "Siswa dapat menentukan kandungan utama dari QS. al-Ashr tentang memanfaatkan waktu.",
   "bentuk": "PG"
  },
  {
   "mp": "Al-Qur'an Hadis",
   "no": 5,
   "kelas": "IV",
   "materi": "QS. al-Ma'un",
   "i": "Siswa dapat menunjukkan ciri-ciri pendusta agama berdasarkan kandungan QS. al-Ma'un.",
   "bentuk": "PG"
  },
  {
   "mp": "Al-Qur'an Hadis",
   "no": 6,
   "kelas": "IV",
   "materi": "QS. at-Takatsur",
   "i": "Siswa dapat menganalisis perilaku tercela (bermegah-megahan) yang dilarang dalam QS. at-Takatsur.",
   "bentuk": "Uraian"
  }
 ],
 "aqh-B-7": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 4,
   "kelas": "IV",
   "materi": "QS. al-Quraisy",
   "i": "Disajikan potongan ayat dari QS. al-Quraisy, siswa dapat melengkapi ayat tersebut dengan benar.",
   "bentuk": "Isian"
  }
 ],
 "aqh-B-12": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 7,
   "kelas": "IV",
   "materi": "Hadis tentang Niat",
   "i": "Disajikan terjemah hadis tentang niat, siswa dapat menyimpulkan pentingnya ikhlas dalam beramal.",
   "bentuk": "PG"
  }
 ],
 "aqh-B-11": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 8,
   "kelas": "IV",
   "materi": "Hadis tentang Takwa",
   "i": "Siswa dapat menerapkan contoh perilaku bertakwa dalam kehidupan sehari-hari di sekolah.",
   "bentuk": "PG"
  }
 ],
 "aqh-C-1": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 9,
   "kelas": "V",
   "materi": "Hukum Bacaan Mim Sukun (Izh-har Syafawi, Ikhfa Syafawi, Idgham Mimi)",
   "i": "Disajikan tabel ayat dan hukum bacaan, siswa dapat menjodohkan lafal mim sukun dengan hukum tajwidnya yang benar.",
   "bentuk": "Menjodohkan"
  }
 ],
 "aqh-C-2": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 10,
   "kelas": "V",
   "materi": "Hukum Bacaan Waqaf dan Washal",
   "i": "Siswa dapat menentukan tanda waqaf yang berarti 'harus berhenti' pada sebuah ayat.",
   "bentuk": "PG"
  }
 ],
 "aqh-C-10": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 17,
   "kelas": "V",
   "materi": "Hadis tentang Menyayangi Anak Yatim",
   "i": "Siswa dapat menunjukkan sikap kepedulian yang mencerminkan hadis menyayangi anak yatim.",
   "bentuk": "PG Kompleks"
  }
 ],
 "aqh-C-3": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 18,
   "kelas": "VI",
   "materi": "Hukum Bacaan Ra (Tafkhim, Tarqiq, Jawazul Wajhain)",
   "i": "Disajikan kalimat, siswa dapat menganalisis alasan dibacanya Ra Tafkhim dengan tepat.",
   "bentuk": "PG"
  }
 ],
 "aqh-C-9": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 24,
   "kelas": "VI",
   "materi": "Hadis tentang Ciri-Ciri Orang Munafik",
   "i": "Disajikan ilustrasi cerita, siswa dapat mengidentifikasi perilaku yang termasuk ciri kemunafikan.",
   "bentuk": "PG Kompleks"
  }
 ],
 "aqh-C-11": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 25,
   "kelas": "VI",
   "materi": "Hadis tentang Keutamaan Memberi",
   "i": "Siswa dapat menyimpulkan maksud filosofi 'tangan di atas lebih baik daripada tangan di bawah'.",
   "bentuk": "PG"
  }
 ],
 "aqh-C-12": [
  {
   "mp": "Al-Qur'an Hadis",
   "no": 26,
   "kelas": "VI",
   "materi": "Hadis tentang Amal Saleh",
   "i": "Siswa dapat menyebutkan tiga jenis amalan yang pahalanya tidak terputus setelah wafat.",
   "bentuk": "Uraian"
  }
 ],
 "ba-B-7": [
  {
   "mp": "Bahasa Arab",
   "no": 1,
   "kelas": "IV",
   "materi": "العنوان (Al-Unwan/Alamat)",
   "i": "Menentukan arti kosakata tentang nomor rumah/alamat dengan tepat.",
   "bentuk": "Pilihan Ganda"
  },
  {
   "mp": "Bahasa Arab",
   "no": 2,
   "kelas": "IV",
   "materi": "العنوان (Al-Unwan/Alamat)",
   "i": "Melengkapi kalimat rumpang menggunakan Isim Isyarah (هذا/هذه) sesuai teks alamat.",
   "bentuk": "Pilihan Ganda Kompleks"
  }
 ],
 "ba-B-8": [
  {
   "mp": "Bahasa Arab",
   "no": 3,
   "kelas": "IV",
   "materi": "المهنة (Al-Mihnah/Profesi)",
   "i": "Mengidentifikasi jenis profesi berdasarkan gambar yang disediakan.",
   "bentuk": "Pilihan Ganda"
  },
  {
   "mp": "Bahasa Arab",
   "no": 4,
   "kelas": "IV",
   "materi": "المهنة (Al-Mihnah/Profesi)",
   "i": "Menerjemahkan kalimat sederhana tentang profesi anggota keluarga.",
   "bentuk": "Isian"
  }
 ],
 "ba-B-9": [
  {
   "mp": "Bahasa Arab",
   "no": 5,
   "kelas": "IV",
   "materi": "آمالي (Amali/Cita-citaku)",
   "i": "Menyusun kata acak menjadi kalimat sempurna tentang cita-cita.",
   "bentuk": "Uraian"
  }
 ],
 "ba-C-1": [
  {
   "mp": "Bahasa Arab",
   "no": 6,
   "kelas": "V",
   "materi": "أعضاء الجسم (A'dhaul Jism/Anggota Tubuh)",
   "i": "Menentukan fungsi dari salah satu anggota tubuh (Mata/Telinga/Hidung) dalam Bahasa Arab.",
   "bentuk": "Pilihan Ganda"
  },
  {
   "mp": "Bahasa Arab",
   "no": 7,
   "kelas": "V",
   "materi": "أعضاء الجسم (A'dhaul Jism/Anggota Tubuh)",
   "i": "Menganalisis penggunaan kata sifat yang sesuai dengan anggota tubuh (Mudzakar/Muannats).",
   "bentuk": "Menjodohkan"
  }
 ],
 "ba-C-4": [
  {
   "mp": "Bahasa Arab",
   "no": 10,
   "kelas": "V",
   "materi": "في المدرسة (Fil Madrosah/Di Sekolah)",
   "i": "Menerjemahkan kalimat tentang fasilitas di sekolah (Perpustakaan/Kantin).",
   "bentuk": "Uraian"
  }
 ],
 "ba-C-5": [
  {
   "mp": "Bahasa Arab",
   "no": 10,
   "kelas": "V",
   "materi": "في المدرسة (Fil Madrosah/Di Sekolah)",
   "i": "Menerjemahkan kalimat tentang fasilitas di sekolah (Perpustakaan/Kantin).",
   "bentuk": "Uraian"
  }
 ],
 "ba-C-6": [
  {
   "mp": "Bahasa Arab",
   "no": 11,
   "kelas": "VI",
   "materi": "الساعة (As-Sa'ah/Jam)",
   "i": "Menentukan jam tertentu berdasarkan gambar jarum jam yang disajikan.",
   "bentuk": "Pilihan Ganda"
  },
  {
   "mp": "Bahasa Arab",
   "no": 12,
   "kelas": "VI",
   "materi": "الساعة (As-Sa'ah/Jam)",
   "i": "Melengkapi kalimat dengan keterangan waktu (pagi/siang/sore/malam).",
   "bentuk": "Pilihan Ganda Kompleks"
  }
 ],
 "ba-C-7": [
  {
   "mp": "Bahasa Arab",
   "no": 13,
   "kelas": "VI",
   "materi": "أحب اللغة العربية (Uhibbu Al-Lughah Al-Arabiyah)",
   "i": "Mengidentifikasi fi'il mudhori' yang sesuai dengan kata ganti (Dhomir Ana/Anta/Anti).",
   "bentuk": "Pilihan Ganda"
  },
  {
   "mp": "Bahasa Arab",
   "no": 14,
   "kelas": "VI",
   "materi": "أحب اللغة العربية (Uhibbu Al-Lughah Al-Arabiyah)",
   "i": "Menerjemahkan kalimat ungkapan rasa cinta terhadap Bahasa Arab.",
   "bentuk": "Menjodohkan"
  }
 ],
 "ba-C-8": [
  {
   "mp": "Bahasa Arab",
   "no": 17,
   "kelas": "VI",
   "materi": "العطلة (Al-Uthlah/Liburan)",
   "i": "Menentukan tempat liburan yang sesuai dengan narasi teks pendek.",
   "bentuk": "Pilihan Ganda"
  },
  {
   "mp": "Bahasa Arab",
   "no": 18,
   "kelas": "VI",
   "materi": "العطلة (Al-Uthlah/Liburan)",
   "i": "Mengubah kata kerja menjadi bentuk Fi'il Madi sederhana untuk menceritakan masa lalu.",
   "bentuk": "Isian"
  }
 ],
 "ba-C-9": [
  {
   "mp": "Bahasa Arab",
   "no": 19,
   "kelas": "VI",
   "materi": "النزهة (An-Nuzhah/Rekreasi)",
   "i": "Menentukan sarana transportasi yang digunakan untuk rekreasi berdasarkan teks.",
   "bentuk": "Pilihan Ganda Kompleks"
  },
  {
   "mp": "Bahasa Arab",
   "no": 20,
   "kelas": "VI",
   "materi": "النزهة (An-Nuzhah/Rekreasi)",
   "i": "Membuat kalimat sederhana mengenai rencana rekreasi/wisata.",
   "bentuk": "Uraian"
  }
 ]
};
