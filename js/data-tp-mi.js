/* ============================================================
   SI MAMBA - js/data-tp-mi.js
   Bank usulan Tujuan Pembelajaran (TP) PAI dan Bahasa Arab untuk Madrasah Ibtidaiyah (Fase A, B, C).
   Disusun dari cakupan "Pemahaman Konsep" pada Capaian Pembelajaran SK Dirjen Pendis No. 9941 Tahun 2025.
   Rumusan TP dan ringkasan CP di sini ditulis ulang (bukan salinan naskah SK) dan berstatus USULAN:
   telaah bersama KKG/Kepala Madrasah dan rujuk naskah resmi SK sebelum dipakai sebagai dokumen final.
   Fase A = kelas 1-2, Fase B = kelas 3-4, Fase C = kelas 5-6. SKI baru diajarkan mulai Fase B.
   Bentuk TP: [elemen, tujuan pembelajaran, materi pokok (singkat, dipakai sebagai materi di Prota/Promes)].
============================================================ */
(function () {
  'use strict';
  const PROSES = {
    aqh: 'Alur proses: mengamati, bertanya dan memprediksi, merencanakan dan melakukan penyelidikan, mengolah data, evaluasi dan refleksi, mengomunikasikan hasil; kemandirian murid meningkat dari fase ke fase.',
    aa: 'Alur proses: mengamati, bertanya dan mengumpulkan informasi, menganalisis dan menyimpulkan, mengomunikasikan, menghafal dan menerapkan, refleksi dan rencana tindak lanjut.',
    fikih: 'Alur proses: mengamati ibadah/muamalah, menanya, mengumpulkan data, menganalisis data, menyimpulkan dan merefleksikan, mengomunikasikan hasil.',
    ski: 'Alur proses: mengamati, mempertanyakan dan memprediksi, merencanakan dan melakukan penyelidikan, menganalisis data (peta konsep), evaluasi dan refleksi (ibrah), mengomunikasikan hasil.',
    ba: 'Keterampilan bahasa: menyimak, berbicara, membaca, memirsa, menulis, dan mempresentasikan.'
  };

  window.BANK_TP_MI = {
    sumber: 'SK Dirjen Pendis No. 9941 Tahun 2025 (usulan TP, perlu ditelaah KKG)',
    mapel: {
      aqh: {
        nama: "Al-Qur'an Hadis",
        cp: {
          A: ["Pemahaman Konsep: mengenal dan menulis huruf hijaiyah serta tanda baca, hukum gunnah, Alif Lam Qamariyah/Syamsiyah; menghafal dan menjelaskan surah pendek pilihan; menghafal hadis tentang kebersihan, keutamaan belajar, dan berbakti kepada orang tua.", PROSES.aqh],
          B: ["Pemahaman Konsep: tajwid kalkalah, mad tabi'i, izhar halqi, ikhfa' hakiki, idgam bigunnah/bilagunnah, iqlab; menghafal, menulis, dan menjelaskan surah pendek; hadis tentang salat berjemaah, persaudaraan, takwa, niat, dan silaturahmi.", PROSES.aqh],
          C: ["Pemahaman Konsep: tajwid mim sukun, waqaf wasal, ra' tafkhim/tarqiq, jawazul wajhain; ayat/surah dan hadis tentang ciri orang munafik, menyayangi anak yatim, keutamaan memberi, dan amal saleh.", PROSES.aqh]
        },
        tp: {
          A: [
            ['Tajwid', 'Murid mampu mengenal dan menulis huruf hijaiyah terpisah dan bersambung beserta tanda bacanya.', 'Huruf hijaiyah dan tanda baca'],
            ['Tajwid', "Murid mampu menerapkan hukum bacaan gunnah dalam membaca Al-Qur'an.", 'Hukum bacaan gunnah'],
            ['Tajwid', "Murid mampu membedakan dan membaca Alif Lam Qamariyah dan Alif Lam Syamsiyah dengan benar.", 'Alif Lam Qamariyah dan Syamsiyah'],
            ["Al-Qur'an", 'Murid mampu menghafal surah-surah pendek pilihan dengan lancar dan benar.', 'Hafalan surah pendek pilihan'],
            ["Al-Qur'an", 'Murid mampu menjelaskan isi surah pendek pilihan dan menerapkannya dalam kehidupan sehari-hari.', 'Isi surah pendek dan penerapannya'],
            ['Hadis', 'Murid mampu menghafal dan menjelaskan hadis tentang kebersihan serta menerapkannya.', 'Hadis tentang kebersihan'],
            ['Hadis', 'Murid mampu menghafal dan menjelaskan hadis tentang keutamaan belajar serta menerapkannya.', 'Hadis tentang keutamaan belajar'],
            ['Hadis', 'Murid mampu menghafal dan menjelaskan hadis tentang berbakti kepada kedua orang tua serta menerapkannya.', 'Hadis tentang berbakti kepada orang tua']
          ],
          B: [
            ['Tajwid', "Murid mampu menerapkan hukum bacaan kalkalah dalam membaca Al-Qur'an.", 'Hukum bacaan kalkalah'],
            ['Tajwid', "Murid mampu menerapkan mad tabi'i dalam membaca Al-Qur'an.", "Mad tabi'i"],
            ['Tajwid', "Murid mampu menerapkan hukum bacaan izhar halqi dalam membaca Al-Qur'an.", 'Izhar halqi'],
            ['Tajwid', "Murid mampu menerapkan hukum bacaan ikhfa' hakiki dalam membaca Al-Qur'an.", "Ikhfa' hakiki"],
            ['Tajwid', "Murid mampu menerapkan hukum bacaan idgam bigunnah dan idgam bilagunnah.", 'Idgam bigunnah dan bilagunnah'],
            ['Tajwid', "Murid mampu menerapkan hukum bacaan iqlab dalam membaca Al-Qur'an.", 'Iqlab'],
            ["Al-Qur'an", 'Murid mampu menghafal dan menulis surah-surah pendek pilihan dengan benar.', 'Hafalan dan tulisan surah pendek'],
            ["Al-Qur'an", 'Murid mampu menjelaskan arti dan isi kandungan surah pendek serta menerapkannya dalam kehidupan sehari-hari.', 'Arti dan isi kandungan surah pendek'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan arti hadis tentang salat berjemaah serta menerapkannya.', 'Hadis tentang salat berjemaah'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan arti hadis tentang persaudaraan serta menerapkannya.', 'Hadis tentang persaudaraan'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan arti hadis tentang takwa serta menerapkannya.', 'Hadis tentang takwa'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan arti hadis tentang niat serta menerapkannya.', 'Hadis tentang niat'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan arti hadis tentang silaturahmi serta menerapkannya.', 'Hadis tentang silaturahmi']
          ],
          C: [
            ['Tajwid', "Murid mampu menerapkan hukum bacaan mim sukun dalam membaca Al-Qur'an.", 'Hukum bacaan mim sukun'],
            ['Tajwid', "Murid mampu menerapkan waqaf dan wasal dalam membaca Al-Qur'an.", 'Waqaf dan wasal'],
            ['Tajwid', "Murid mampu menerapkan hukum ra' tafkhim dan tarqiq dalam membaca Al-Qur'an.", "Ra' tafkhim dan tarqiq"],
            ['Tajwid', "Murid mampu menerapkan jawazul wajhain dalam membaca Al-Qur'an.", 'Jawazul wajhain'],
            ["Al-Qur'an", 'Murid mampu menghafal, menulis, dan menjelaskan ayat/surah tentang ciri-ciri orang munafik serta menerapkannya.', "Ayat tentang ciri orang munafik"],
            ["Al-Qur'an", 'Murid mampu menghafal, menulis, dan menjelaskan ayat/surah tentang menyayangi anak yatim serta menerapkannya.', 'Ayat tentang menyayangi anak yatim'],
            ["Al-Qur'an", 'Murid mampu menghafal, menulis, dan menjelaskan ayat/surah tentang keutamaan memberi serta menerapkannya.', 'Ayat tentang keutamaan memberi'],
            ["Al-Qur'an", 'Murid mampu menghafal, menulis, dan menjelaskan ayat/surah tentang amal saleh serta menerapkannya.', 'Ayat tentang amal saleh'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan hadis tentang ciri-ciri orang munafik serta menerapkannya.', 'Hadis tentang ciri orang munafik'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan hadis tentang menyayangi anak yatim serta menerapkannya.', 'Hadis tentang menyayangi anak yatim'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan hadis tentang keutamaan memberi serta menerapkannya.', 'Hadis tentang keutamaan memberi'],
            ['Hadis', 'Murid mampu menghafal, menulis, dan menjelaskan hadis tentang amal saleh serta menerapkannya.', 'Hadis tentang amal saleh']
          ]
        }
      },
      aa: {
        nama: 'Akidah Akhlak',
        cp: {
          A: ['Pemahaman Konsep: akidah (dua kalimat syahadat, rukun iman, sifat wajib Allah, iman kepada malaikat, contoh asmaulhusna); akhlak (kalimah thayyibah, hidup bersih dan sehat, jujur, terima kasih, rendah hati, menghindari malas, berkata kasar, dan berbohong); adab sehari-hari; kisah Nabi Muhammad saw. dan Nabi Nuh a.s.', PROSES.aa],
          B: ['Pemahaman Konsep: asmaulhusna, iman kepada kitab Allah serta nabi dan rasul; kalimah thayyibah; bersyukur, pantang menyerah, pemberani, tolong-menolong, amanah, dan menghindari serakah, kikir, kufur nikmat; adab kepada orang tua, guru, teman; kisah Nabi Ibrahim a.s. dan Nabi Ismail a.s.', PROSES.aa],
          C: ['Pemahaman Konsep: perilaku yang mencerminkan asmaulhusna, hari akhir, qada dan qadar; kalimah thayyibah; akhlak terpuji (sabar, disiplin, mandiri, pemaaf, tanggung jawab, adil, bijaksana) dan menghindari akhlak tercela; adab bertamu dan kepada tetangga/lingkungan; kisah Nabi Musa a.s. dan Nabi Isa a.s.', PROSES.aa]
        },
        tp: {
          A: [
            ['Akidah', 'Murid mampu menghafal dan menjelaskan dua kalimat syahadat.', 'Dua kalimat syahadat'],
            ['Akidah', 'Murid mampu menghafal dan menjelaskan enam rukun iman.', 'Rukun iman'],
            ['Akidah', 'Murid mampu menghafal dan menjelaskan sifat wajib bagi Allah.', 'Sifat wajib bagi Allah'],
            ['Akidah', 'Murid mampu menjelaskan iman kepada malaikat Allah.', 'Iman kepada malaikat'],
            ['Akidah', 'Murid mampu menemukan contoh asmaulhusna ar-Rahman, ar-Rahim, al-Malik, dan al-Quddus.', 'Asmaulhusna (1): ar-Rahman, ar-Rahim, al-Malik, al-Quddus'],
            ['Akidah', 'Murid mampu menemukan contoh asmaulhusna as-Salam, al-Mukmin, al-Muhaimin, dan al-Aziz.', 'Asmaulhusna (2): as-Salam, al-Mukmin, al-Muhaimin, al-Aziz'],
            ['Akhlak', 'Murid mampu menghafal dan menjelaskan kalimah thayyibah: basmalah, hamdalah, dan taawuz.', 'Kalimah thayyibah (basmalah, hamdalah, taawuz)'],
            ['Akhlak', 'Murid mampu menerapkan pola hidup sehat dan bersih.', 'Hidup sehat dan bersih'],
            ['Akhlak', 'Murid mampu menerapkan sikap jujur dalam kehidupan sehari-hari.', 'Sikap jujur'],
            ['Akhlak', 'Murid mampu menerapkan rasa terima kasih dan sikap rendah hati.', 'Terima kasih dan rendah hati'],
            ['Akhlak', 'Murid mampu mengidentifikasi cara menghindari sikap malas, berkata kasar, dan berbohong.', 'Menghindari malas, berkata kasar, dan berbohong'],
            ['Adab', 'Murid mampu menerapkan adab belajar.', 'Adab belajar'],
            ['Adab', 'Murid mampu menerapkan adab mandi dan berpakaian.', 'Adab mandi dan berpakaian'],
            ['Adab', 'Murid mampu menerapkan adab bersin dan menguap.', 'Adab bersin dan menguap'],
            ['Adab', 'Murid mampu menerapkan adab makan dan minum.', 'Adab makan dan minum'],
            ['Kisah Keteladanan', 'Murid mampu menceritakan dan meneladani kisah Nabi Muhammad saw.', 'Kisah Nabi Muhammad saw.'],
            ['Kisah Keteladanan', 'Murid mampu menceritakan dan meneladani kisah Nabi Nuh a.s.', 'Kisah Nabi Nuh a.s.']
          ],
          B: [
            ['Akidah', "Murid mampu menemukan contoh asmaulhusna al-Halim, al-Wahhab, al-Kabir, dan al-'Adhim.", "Asmaulhusna (1): al-Halim, al-Wahhab, al-Kabir, al-'Adhim"],
            ['Akidah', "Murid mampu menemukan contoh asmaulhusna as-Sami', al-Bashir, al-Waliy, dan al-'Alim.", "Asmaulhusna (2): as-Sami', al-Bashir, al-Waliy, al-'Alim"],
            ['Akidah', 'Murid mampu menghafal dan menjelaskan iman kepada kitab-kitab Allah Swt.', 'Iman kepada kitab-kitab Allah'],
            ['Akidah', 'Murid mampu menghafal dan menjelaskan iman kepada nabi dan rasul Allah.', 'Iman kepada nabi dan rasul'],
            ['Akhlak', 'Murid mampu menghafal dan menjelaskan kalimah thayyibah: Subhanallah, Allahu Akbar, dan Masya Allah.', 'Kalimah thayyibah (Subhanallah, Allahu Akbar, Masya Allah)'],
            ['Akhlak', 'Murid mampu menjelaskan dan menerapkan sikap bersyukur.', 'Sikap bersyukur'],
            ['Akhlak', 'Murid mampu menjelaskan dan menerapkan sikap pantang menyerah.', 'Sikap pantang menyerah'],
            ['Akhlak', 'Murid mampu menjelaskan dan menerapkan sikap pemberani.', 'Sikap pemberani'],
            ['Akhlak', 'Murid mampu menjelaskan dan menerapkan sikap tolong-menolong.', 'Sikap tolong-menolong'],
            ['Akhlak', 'Murid mampu menjelaskan dan menerapkan sikap amanah.', 'Sikap amanah'],
            ['Akhlak', 'Murid mampu menjelaskan cara menghindari sikap serakah, kikir, dan kufur nikmat.', 'Menghindari serakah, kikir, dan kufur nikmat'],
            ['Adab', 'Murid mampu menerapkan adab kepada kedua orang tua.', 'Adab kepada orang tua'],
            ['Adab', 'Murid mampu menerapkan adab kepada guru.', 'Adab kepada guru'],
            ['Adab', 'Murid mampu menerapkan adab kepada teman.', 'Adab kepada teman'],
            ['Kisah Keteladanan', 'Murid mampu menceritakan dan menerapkan perilaku taat melalui kisah Nabi Ibrahim a.s. dan Nabi Ismail a.s.', 'Kisah Nabi Ibrahim a.s. dan Nabi Ismail a.s.']
          ],
          C: [
            ['Akidah', 'Murid mampu menerapkan perilaku yang mencerminkan asmaulhusna al-Qawiyy, al-Khabir, al-Muhyi, dan al-Wahid.', 'Asmaulhusna (1): al-Qawiyy, al-Khabir, al-Muhyi, al-Wahid'],
            ['Akidah', "Murid mampu menerapkan perilaku yang mencerminkan asmaulhusna al-Ahad, as-Samad, al-Ghaffar, dan al-Waasi'.", "Asmaulhusna (2): al-Ahad, as-Samad, al-Ghaffar, al-Waasi'"],
            ['Akidah', 'Murid mampu menjelaskan iman kepada hari akhir (kiamat).', 'Iman kepada hari akhir'],
            ['Akidah', 'Murid mampu menjelaskan iman kepada qada dan qadar.', 'Iman kepada qada dan qadar'],
            ['Akhlak', "Murid mampu menjelaskan dan menerapkan kalimah thayyibah: istigfar, hauqalah, tarji', dan tahlil.", "Kalimah thayyibah (istigfar, hauqalah, tarji', tahlil)"],
            ['Akhlak', 'Murid mampu menerapkan dan merefleksikan sikap sabar.', 'Akhlak terpuji: sabar'],
            ['Akhlak', 'Murid mampu menerapkan dan merefleksikan sikap disiplin dan mandiri.', 'Akhlak terpuji: disiplin dan mandiri'],
            ['Akhlak', 'Murid mampu menerapkan dan merefleksikan sikap pemaaf dan tanggung jawab.', 'Akhlak terpuji: pemaaf dan tanggung jawab'],
            ['Akhlak', 'Murid mampu menerapkan dan merefleksikan sikap adil dan bijaksana.', 'Akhlak terpuji: adil dan bijaksana'],
            ['Akhlak', 'Murid mampu menjelaskan cara menghindari akhlak tercela: pemarah dan fasik.', 'Akhlak tercela: pemarah dan fasik'],
            ['Akhlak', 'Murid mampu menjelaskan cara menghindari akhlak tercela: pilih kasih, iri hati, dan egois.', 'Akhlak tercela: pilih kasih, iri hati, egois'],
            ['Adab', 'Murid mampu menerapkan adab bertamu.', 'Adab bertamu'],
            ['Adab', 'Murid mampu menerapkan adab kepada tetangga dan lingkungan.', 'Adab kepada tetangga dan lingkungan'],
            ['Kisah Keteladanan', 'Murid mampu menceritakan dan menerapkan sikap berani dan teguh pendirian melalui kisah Nabi Musa a.s.', 'Kisah Nabi Musa a.s.'],
            ['Kisah Keteladanan', 'Murid mampu menceritakan dan menerapkan sikap sabar melalui kisah Nabi Isa a.s.', 'Kisah Nabi Isa a.s.']
          ]
        }
      },
      fikih: {
        nama: 'Fikih',
        cp: {
          A: ['Pemahaman Konsep (Ibadah): menyebutkan rukun Islam; meniru dan melafalkan syahadatain; meniru praktik taharah, salat fardu, salat berjemaah, azan, ikamah, dan zikir sesudah salat.', PROSES.fikih],
          B: ['Pemahaman Konsep (Ibadah): tata cara puasa Ramadan, salat Jumat dan beberapa salat sunah, rukhsah pada salat, khitan, tanda-tanda balig, dan bersuci dari hadas besar.', PROSES.fikih],
          C: ['Pemahaman Konsep: ibadah (zakat fitrah, infak, sedekah, hewan kurban dan hikmahnya, haji dan umrah, halal dan haram) serta muamalah (jual beli, pinjam meminjam, gasab, barang temuan/luqathah).', PROSES.fikih]
        },
        tp: {
          A: [
            ['Ibadah', 'Murid mampu menyebutkan rukun Islam.', 'Rukun Islam'],
            ['Ibadah', 'Murid mampu meniru dan melafalkan kalimat syahadatain.', 'Kalimat syahadatain'],
            ['Ibadah', 'Murid mampu meniru praktik taharah (bersuci).', 'Taharah'],
            ['Ibadah', 'Murid mampu meniru praktik salat fardu.', 'Salat fardu'],
            ['Ibadah', 'Murid mampu meniru praktik salat berjemaah.', 'Salat berjemaah'],
            ['Ibadah', 'Murid mampu meniru dan melafalkan azan dan ikamah.', 'Azan dan ikamah'],
            ['Ibadah', 'Murid mampu meniru dan melafalkan bacaan zikir sesudah salat.', 'Zikir sesudah salat']
          ],
          B: [
            ['Ibadah', 'Murid mampu menyebutkan tata cara pelaksanaan puasa Ramadan.', 'Puasa Ramadan'],
            ['Ibadah', 'Murid mampu meniru tata cara salat Jumat.', 'Salat Jumat'],
            ['Ibadah', 'Murid mampu meniru tata cara beberapa salat sunah.', 'Salat sunah'],
            ['Ibadah', 'Murid mampu menyebutkan rukhsah pada salat.', 'Rukhsah pada salat'],
            ['Ibadah', 'Murid mampu menyebutkan tata cara khitan dan tanda-tanda balig.', 'Khitan dan tanda-tanda balig'],
            ['Ibadah', 'Murid mampu menyebutkan cara bersuci dari hadas besar.', 'Bersuci dari hadas besar']
          ],
          C: [
            ['Ibadah', 'Murid mampu membedakan zakat fitrah, infak, dan sedekah.', 'Zakat fitrah, infak, dan sedekah'],
            ['Ibadah', 'Murid mampu mengklasifikasikan jenis-jenis hewan kurban dan menyebutkan hikmah kurban.', 'Hewan kurban dan hikmahnya'],
            ['Ibadah', 'Murid mampu mengurutkan tata cara haji dan umrah.', 'Haji dan umrah'],
            ['Ibadah', 'Murid mampu menjelaskan ketentuan halal dan haram.', 'Halal dan haram'],
            ['Muamalah', 'Murid mampu menceritakan pengalaman praktik jual beli.', 'Jual beli'],
            ['Muamalah', 'Murid mampu mengilustrasikan ketentuan pinjam meminjam.', 'Pinjam meminjam'],
            ['Muamalah', 'Murid mampu menjelaskan pentingnya menghindari perbuatan gasab.', 'Gasab'],
            ['Muamalah', 'Murid mampu menjelaskan ketentuan barang temuan (luqathah).', 'Barang temuan (luqathah)']
          ]
        }
      },
      ski: {
        nama: 'Sejarah Kebudayaan Islam',
        cp: {
          B: ['Pemahaman Konsep: masyarakat Arab sebelum Islam; kehidupan dan kepribadian Rasulullah saw.; peristiwa kerasulan; ketabahan Rasulullah saw. dan sahabat dalam berdakwah; kronologi hijrah; peristiwa Isra Mikraj.', PROSES.ski],
          C: ['Pemahaman Konsep: dakwah Rasulullah saw. kepada nonmuslim di Madinah; peristiwa menjelang akhir hayat Rasulullah saw.; keteladanan Khulafaur Rasyidin; biografi Wali Sanga dalam mengembangkan Islam di Indonesia.', PROSES.ski]
        },
        tp: {
          B: [
            ['Sejarah', 'Murid mampu mengidentifikasi kehidupan masyarakat Arab sebelum Islam.', 'Masyarakat Arab sebelum Islam'],
            ['Sejarah', 'Murid mampu menggambarkan kehidupan dan kepribadian Rasulullah saw.', 'Kehidupan dan kepribadian Rasulullah saw.'],
            ['Sejarah', 'Murid mampu mendeskripsikan peristiwa kerasulan Rasulullah saw.', 'Peristiwa kerasulan'],
            ['Sejarah', 'Murid mampu menceritakan ketabahan Rasulullah saw. dan para sahabat dalam berdakwah.', 'Ketabahan dalam berdakwah'],
            ['Sejarah', 'Murid mampu memahami kronologi hijrah Rasulullah saw.', 'Hijrah Rasulullah saw.'],
            ['Sejarah', 'Murid mampu menceritakan dan merefleksikan peristiwa Isra Mikraj dalam kehidupan sehari-hari.', 'Isra Mikraj']
          ],
          C: [
            ['Sejarah', 'Murid mampu merefleksikan dakwah Rasulullah saw. kepada kelompok nonmuslim di Madinah.', 'Dakwah Rasulullah saw. di Madinah'],
            ['Sejarah', 'Murid mampu menceritakan dan merefleksikan peristiwa menjelang akhir hayat Rasulullah saw.', 'Akhir hayat Rasulullah saw.'],
            ['Sejarah', 'Murid mampu merefleksikan kisah keteladanan Abu Bakar Ash-Shiddiq.', 'Keteladanan Abu Bakar Ash-Shiddiq'],
            ['Sejarah', 'Murid mampu merefleksikan kisah keteladanan Umar bin Khattab.', 'Keteladanan Umar bin Khattab'],
            ['Sejarah', 'Murid mampu merefleksikan kisah keteladanan Usman bin Affan.', 'Keteladanan Usman bin Affan'],
            ['Sejarah', 'Murid mampu merefleksikan kisah keteladanan Ali bin Abi Thalib.', 'Keteladanan Ali bin Abi Thalib'],
            ['Sejarah', 'Murid mampu menganalisis biografi Wali Sanga dalam mengembangkan Islam di Indonesia.', 'Wali Sanga']
          ]
        }
      },
      ba: {
        nama: 'Bahasa Arab',
        cp: {
          A: ['Komponen Bahasa: mengenali bunyi dan kosakata tentang perkenalan, keluargaku, rumahku, madrasahku, hobiku, nama-nama buah, warna, alat transportasi, dan pemandangan alam beserta pola kalimatnya. Keterampilan: menyimak, berbicara, membaca, memirsa, menulis, mempresentasikan.', PROSES.ba],
          B: ['Komponen Bahasa: mengidentifikasi kalimat sapaan dan pertanyaan tentang materi pelajaran, binatang, penyakit, olahraga, teman-temanku, taman, alamat, profesi, cita-citaku, di rumah, anggota keluarga, dan cinta Indonesia. Keterampilan: enam keterampilan berbahasa.', PROSES.ba],
          C: ['Komponen Bahasa: mengidentifikasi informasi dan bacaan sederhana tentang anggota tubuh, kebun binatang, di ruang tamu dan ruang belajar, di perpustakaan, di kantin, jam, saya suka bahasa Arab, kegiatan liburan, dan piknik. Keterampilan: enam keterampilan berbahasa.', PROSES.ba]
        },
        tp: {
          A: [
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata serta pola kalimat tentang perkenalan.', 'Perkenalan'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata serta pola kalimat tentang keluargaku.', 'Keluargaku'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata serta pola kalimat tentang rumahku.', 'Rumahku'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata serta pola kalimat tentang madrasahku.', 'Madrasahku'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata serta pola kalimat tentang hobiku.', 'Hobiku'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata tentang nama-nama buah.', 'Nama-nama buah'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata tentang warna-warna.', 'Warna-warna'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata tentang alat transportasi.', 'Alat transportasi'],
            ['Komponen Bahasa', 'Murid mampu mengenali bunyi dan kosakata tentang pemandangan alam.', 'Pemandangan alam'],
            ['Keterampilan Bahasa', 'Murid mampu menerapkan keterampilan menyimak, berbicara, membaca, memirsa, menulis, dan mempresentasikan pada topik yang dipelajari.', 'Keterampilan berbahasa']
          ],
          B: [
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat sapaan dan pertanyaan tentang materi pelajaran.', 'Materi pelajaran'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang nama-nama binatang.', 'Nama-nama binatang'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang penyakit.', 'Penyakit'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang olahraga.', 'Olahraga'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang teman-temanku.', 'Teman-temanku'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang taman.', 'Taman'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat sapaan dan pertanyaan tentang alamat.', 'Alamat'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang profesi.', 'Profesi'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang cita-citaku.', 'Cita-citaku'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang di rumah.', 'Di rumah'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang anggota keluarga.', 'Anggota keluarga'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi kalimat dan kosakata tentang cinta Indonesia.', 'Cinta Indonesia'],
            ['Keterampilan Bahasa', 'Murid mampu menerapkan keterampilan menyimak, berbicara, membaca, memirsa, menulis, dan mempresentasikan pada topik yang dipelajari.', 'Keterampilan berbahasa']
          ],
          C: [
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang anggota tubuh.', 'Anggota tubuh'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang kebun binatang.', 'Kebun binatang'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang di ruang tamu dan di ruang belajar.', 'Di ruang tamu dan ruang belajar'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang di perpustakaan.', 'Di perpustakaan'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang di kantin.', 'Di kantin'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang jam.', 'Jam'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang saya suka bahasa Arab.', 'Saya suka bahasa Arab'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang kegiatan liburan.', 'Kegiatan liburan'],
            ['Komponen Bahasa', 'Murid mampu mengidentifikasi informasi dan bacaan sederhana tentang piknik.', 'Piknik'],
            ['Keterampilan Bahasa', 'Murid mampu menerapkan keterampilan menyimak, berbicara, membaca, memirsa, menulis, dan mempresentasikan pada topik yang dipelajari.', 'Keterampilan berbahasa']
          ]
        }
      }
    }
  };
})();
