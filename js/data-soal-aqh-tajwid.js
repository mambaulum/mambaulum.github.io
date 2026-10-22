/* ============================================================
   SI MAMBA - js/data-soal-aqh-tajwid.js
   TAMBAHAN soal Tajwid Al-Qur'an Hadis MI Fase A-C. Soal DITAMBAHKAN ke kunci TP yang sudah ada di
   js/data-soal-mi.js (aqh-A-1..3, aqh-B-1..6, aqh-C-1..4); soal lama tidak diubah dan soal yang
   bunyinya sama tidak diulang. Kunci = kunci TP di js/data-tp-mi.js.
   Status: DRAF, belum diperiksa guru. Contoh bacaan dan istilah (mis. jawazul wajhain) mengikuti buku ajar madrasah.
   Format sama dengan data-soal-mi.js (PG: jawaban benar di posisi pertama; opsi diacak saat dipakai).
   WAJIB dimuat SESUDAH js/data-soal-mi.js.
============================================================ */
(function () {
  'use strict';
  const P = (lv, q, b, x, y, z) => ['pg', lv, q, [b, x, y, z]];
  const I = (lv, q, a) => ['is', lv, q, a];
  const U = (lv, q, r) => ['ur', lv, q, r];

  const TAMBAH = {
    // Huruf hijaiyah dan tanda baca
    "aqh-A-1": [
      P("L1", "Jumlah huruf hijaiyah ada ...", "dua puluh delapan", "dua puluh lima", "tiga puluh", "dua puluh"),
      P("L1", "Huruf hijaiyah ditulis dari arah ...", "kanan ke kiri", "kiri ke kanan", "atas ke bawah", "bawah ke atas"),
      P("L1", "Tanda baca fathah diletakkan di ... huruf.", "atas", "bawah", "depan", "belakang"),
      P("L1", "Tanda baca yang diletakkan di bawah huruf disebut ...", "kasrah", "fathah", "dammah", "sukun"),
      P("L1", "Tanda baca dammah dibaca dengan bunyi ...", "u", "a", "i", "e"),
      I("L1", "Tanda baca fathah dibaca dengan bunyi ....", "a"),
      I("L1", "Tanda baca yang membuat huruf menjadi mati disebut ....", "sukun"),
      U("L2", "Sebutkan tiga tanda baca (harakat) beserta bunyinya!", "Fathah (a), kasrah (i), dammah (u). Skor sebanding jumlah pasangan yang benar.")
    ],
    // Hukum bacaan gunnah
    "aqh-A-2": [
      P("L1", "Gunnah dibaca pada huruf nun dan mim yang ...", "bertasydid", "berharakat fathah", "berharakat kasrah", "tidak bertanda apa pun"),
      P("L1", "Mim yang bertasydid dibaca dengan ...", "dengung (gunnah)", "pantulan bunyi", "panjang enam harakat", "jelas tanpa dengung"),
      P("L1", "Bunyi dengung pada gunnah diambil dari ...", "pangkal hidung", "ujung lidah", "bibir", "tenggorokan"),
      I("L1", "Nun dan mim bertasydid dibaca dengan ....", "dengung (gunnah)"),
      U("L2", "Jelaskan yang dimaksud gunnah!", "Jawaban benar memuat inti: bunyi dengung dari pangkal hidung pada nun dan mim yang bertasydid, lamanya sekitar dua harakat. Skor penuh bila inti ini ada.")
    ],
    // Alif Lam Qamariyah dan Syamsiyah
    "aqh-A-3": [
      P("L1", "Huruf qamariyah berjumlah ...", "empat belas", "dua belas", "lima belas", "tiga belas"),
      P("L1", "Huruf syamsiyah berjumlah ...", "empat belas", "dua belas", "lima belas", "sepuluh"),
      P("L1", "Qamariyah berasal dari kata qamar yang artinya ...", "bulan", "matahari", "bintang", "langit"),
      P("L1", "Alif Lam yang bertemu huruf ba dibaca ...", "jelas (Qamariyah)", "tidak dibaca (Syamsiyah)", "dengan dengung", "dengan pantulan"),
      P("L2", "Alif Lam yang bertemu huruf syin termasuk Alif Lam ...", "Syamsiyah", "Qamariyah", "Mad", "Gunnah"),
      I("L1", "Syamsiyah berasal dari kata syams yang artinya ....", "matahari"),
      U("L2", "Sebutkan perbedaan cara membaca Alif Lam Qamariyah dan Alif Lam Syamsiyah!", "Qamariyah: lam dibaca jelas. Syamsiyah: lam tidak dibaca dan huruf sesudahnya bertasydid. Skor separuh untuk masing-masing jawaban yang benar.")
    ],
    // Hukum bacaan kalkalah
    "aqh-B-1": [
      P("L1", "Huruf kalkalah dikumpulkan dalam kalimat ...", "qutbu jad", "yarmalun", "ibghi hajjaka", "sakata"),
      P("L2", "Kalkalah terjadi apabila huruf kalkalah dalam keadaan ...", "sukun (mati)", "berharakat fathah", "berharakat dammah", "bertasydid"),
      P("L1", "Kalkalah dibaca dengan cara ...", "memantulkan bunyi huruf", "berdengung", "memanjangkan bunyi", "menyamarkan bunyi"),
      I("L2", "Pantulan bunyi pada kalkalah terjadi ketika huruf kalkalah dalam keadaan ....", "sukun (mati)"),
      U("L1", "Sebutkan lima huruf kalkalah!", "Qaf, tha, ba, jim, dal. Skor sebanding jumlah huruf yang benar.")
    ],
    // Mad tabi'i
    "aqh-B-2": [
      P("L1", "Mad tabi'i terjadi jika fathah bertemu ...", "alif", "wawu sukun", "ya sukun", "hamzah"),
      P("L1", "Mad tabi'i terjadi jika kasrah bertemu ...", "ya sukun", "alif", "wawu sukun", "ra"),
      P("L1", "Huruf mad ada ... buah.", "tiga", "dua", "empat", "lima"),
      P("L1", "Bacaan dua harakat sama dengan panjang sekitar ...", "dua ketukan", "empat ketukan", "enam ketukan", "satu ketukan"),
      I("L1", "Huruf mad ada tiga, yaitu alif, wawu sukun, dan ... sukun.", "ya"),
      U("L2", "Sebutkan tiga keadaan yang menyebabkan mad tabi'i!", "Fathah bertemu alif; kasrah bertemu ya sukun; dammah bertemu wawu sukun. Skor sebanding jumlah keadaan yang benar.")
    ],
    // Izhar halqi
    "aqh-B-3": [
      P("L1", "Halqi berarti ...", "tenggorokan", "hidung", "bibir", "lidah"),
      P("L1", "Huruf berikut yang termasuk huruf izhar halqi adalah ...", "'ain", "ba", "lam", "ya"),
      P("L2", "Nun sukun bertemu huruf kha dibaca ...", "izhar (jelas) tanpa dengung", "ikhfa", "idgam", "iqlab"),
      I("L1", "Huruf izhar halqi keluar dari ....", "tenggorokan"),
      U("L2", "Jelaskan cara membaca izhar halqi dan sebutkan dua hurufnya!", "Dibaca jelas tanpa dengung. Huruf yang benar antara lain: hamzah, ha, ain, ha (ح), ghain, kha. Skor separuh untuk cara baca, separuh untuk dua huruf yang benar.")
    ],
    // Ikhfa' hakiki
    "aqh-B-4": [
      P("L1", "Nun sukun bertemu huruf kaf dibaca ...", "ikhfa", "izhar", "idgam", "iqlab"),
      P("L1", "Nun sukun bertemu huruf ta dibaca ...", "ikhfa", "izhar", "idgam bilagunnah", "iqlab"),
      P("L1", "Contoh huruf ikhfa hakiki adalah ...", "sin", "ain", "ha (ه)", "ba"),
      P("L2", "Ikhfa dibaca dengan dengung sekitar ... harakat.", "dua", "empat", "enam", "satu"),
      I("L1", "Ikhfa dibaca samar dan disertai ....", "dengung (gunnah)"),
      U("L2", "Sebutkan lima huruf ikhfa' hakiki!", "Contoh benar: ta, tsa, jim, dal, dzal, za, sin, syin, shad, dhad, tha, zha, fa, qaf, kaf (lima huruf mana saja). Skor sebanding jumlah huruf yang benar.")
    ],
    // Idgam bigunnah dan bilagunnah
    "aqh-B-5": [
      P("L1", "Idgam bigunnah dibaca dengan ...", "dengung", "tanpa dengung", "pantulan bunyi", "panjang enam harakat"),
      P("L1", "Idgam bilagunnah dibaca ...", "tanpa dengung", "dengan dengung", "dengan pantulan", "samar"),
      P("L1", "Nun sukun bertemu huruf mim dibaca ...", "idgam bigunnah", "idgam bilagunnah", "ikhfa", "iqlab"),
      P("L1", "Nun sukun bertemu huruf ra dibaca ...", "idgam bilagunnah", "idgam bigunnah", "izhar", "ikhfa"),
      P("L2", "Huruf idgam bigunnah dikumpulkan dalam kata ...", "yanmu", "qutbu jad", "hadza", "sakata"),
      I("L1", "Nun sukun bertemu huruf lam dibaca idgam ....", "bilagunnah"),
      U("L2", "Sebutkan huruf idgam bigunnah dan idgam bilagunnah!", "Idgam bigunnah: ya, nun, mim, wawu. Idgam bilagunnah: lam dan ra. Skor separuh untuk masing-masing kelompok yang lengkap dan benar.")
    ],
    // Iqlab
    "aqh-B-6": [
      P("L1", "Huruf iqlab berjumlah ...", "satu", "dua", "tiga", "empat"),
      P("L2", "Pada iqlab, yang diganti dengan bunyi mim adalah ...", "nun sukun atau tanwin", "huruf ba", "huruf mim", "tanda mad"),
      P("L2", "Iqlab dibaca dengan dengung dan bibir ...", "dirapatkan", "dibuka lebar", "dimonyongkan terus", "digigit"),
      I("L1", "Huruf iqlab hanya ....", "ba"),
      U("L2", "Jelaskan cara membaca iqlab!", "Nun sukun atau tanwin yang bertemu ba diganti bunyi mim samar disertai dengung dengan bibir dirapatkan. Skor penuh bila penggantian menjadi mim dan dengung ada.")
    ],
    // Hukum bacaan mim sukun
    "aqh-C-1": [
      P("L1", "Mim sukun bertemu huruf selain mim dan ba dibaca ...", "izhar syafawi", "ikhfa syafawi", "idgam mimi", "iqlab"),
      P("L1", "Syafawi berarti ...", "bibir", "hidung", "tenggorokan", "lidah"),
      P("L1", "Izhar syafawi dibaca ...", "jelas tanpa dengung", "samar dengan dengung", "dilebur dengan dengung", "diganti mim"),
      P("L2", "Ikhfa syafawi dibaca samar dengan dengung sekitar ... harakat.", "dua", "empat", "enam", "satu"),
      I("L1", "Mim sukun bertemu huruf ba dibaca ikhfa ....", "syafawi"),
      U("L2", "Sebutkan tiga hukum bacaan mim sukun beserta cirinya!", "Ikhfa syafawi: mim sukun bertemu ba. Idgam mimi: mim sukun bertemu mim. Izhar syafawi: mim sukun bertemu huruf selain mim dan ba. Skor sebanding jumlah pasangan yang benar.")
    ],
    // Waqaf dan wasal
    "aqh-C-2": [
      P("L1", "Lawan dari waqaf adalah ...", "wasal", "mad", "gunnah", "iqlab"),
      P("L2", "Tanda \"لا\" pada Al-Qur'an menunjukkan kita ...", "tidak boleh berhenti", "harus berhenti", "wajib mengulang", "boleh membaca sambil duduk"),
      P("L1", "Waqaf dilakukan antara lain agar bacaan jelas maknanya dan ...", "cukup napas", "semakin cepat", "bunyi hilang", "suara besar"),
      I("L1", "Melanjutkan bacaan tanpa berhenti disebut ....", "wasal"),
      U("L2", "Jelaskan perbedaan waqaf dan wasal!", "Waqaf: berhenti sejenak pada akhir kata sambil mengambil napas. Wasal: melanjutkan bacaan tanpa berhenti. Skor separuh untuk masing-masing jawaban yang benar.")
    ],
    // Ra' tafkhim dan tarqiq
    "aqh-C-3": [
      P("L1", "Tafkhim artinya ...", "tebal", "tipis", "panjang", "pendek"),
      P("L1", "Tarqiq artinya ...", "tipis", "tebal", "jelas", "samar"),
      P("L2", "Ra' sukun yang jatuh sesudah fathah dibaca ...", "tafkhim", "tarqiq", "ikhfa", "izhar"),
      P("L2", "Ra' sukun yang jatuh sesudah kasrah dibaca ...", "tarqiq", "tafkhim", "ikhfa", "izhar"),
      I("L1", "Ra' berharakat dammah dibaca ....", "tafkhim"),
      U("L2", "Sebutkan tiga keadaan ra' dibaca tafkhim!", "Ra' berharakat fathah; ra' berharakat dammah; ra' sukun yang jatuh sesudah fathah atau dammah. Skor sebanding jumlah keadaan yang benar.")
    ],
    // Jawazul wajhain
    "aqh-C-4": [
      P("L1", "Jawaz dalam jawazul wajhain artinya ...", "boleh", "wajib", "dilarang", "sunah"),
      P("L1", "Wajhain dalam jawazul wajhain artinya ...", "dua cara", "tiga cara", "satu cara", "empat cara"),
      I("L1", "Jawazul wajhain berarti bacaan yang boleh dibaca dengan dua ....", "cara"),
      U("L2", "Jelaskan arti jawazul wajhain dengan kata-katamu sendiri!", "Jawaban benar memuat inti: bacaan yang boleh dibaca dengan dua cara. Contoh bacaannya mengikuti buku ajar madrasah. Skor penuh bila inti ini ada.")
    ]
  };

  window.BANK_SOAL_MI = window.BANK_SOAL_MI || {};
  Object.keys(TAMBAH).forEach(function (k) {
    const ada = window.BANK_SOAL_MI[k] || [];
    const teks = new Set(ada.map(function (x) { return x[2]; }));
    window.BANK_SOAL_MI[k] = ada.concat(TAMBAH[k].filter(function (x) { return !teks.has(x[2]); }));
  });
})();
