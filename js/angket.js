// ============================================================
// ANGKET (gabungan) -- js/angket.js
// Menggabungkan dua modul yang sebelumnya terpisah (isi aslinya tidak diubah, kecuali yang tertera di bawah):
//   BAGIAN 1  Angket Kurikulum   (dulu js/angket-kurikulum.js)  -> penilaian pelaksanaan Pembelajaran Mendalam & Kurikulum Berbasis Cinta
//   BAGIAN 2  Angket Profil      (dulu js/angket-profil.js)     -> angket 8 Dimensi Profil Lulusan, diisi orang tua
//   BAGIAN 3  Halaman "Angket" bertab yang membungkus keduanya
// Perubahan terhadap file asli: (a) Kurikulum menulis ke #angketKurikulumArea (bukan #page-angket-kurikulum);
// (b) tombol kartu Dashboard Kurikulum membuka halaman 'angket'.
// Data Firebase tetap terpisah: angket_kurikulum/... dan angket_profil/...
// Dimuat SESUDAH app.js dan portal-ortu.js. Aturan (Rules) Firebase untuk kedua path tetap diperlukan.
// ============================================================

// ########## BAGIAN 1: ANGKET KURIKULUM ##########
// ============================================================
// ANGKET KURIKULUM: Pembelajaran Mendalam & Kurikulum Berbasis Cinta
// Dimuat SESUDAH app.js (memakai global: db, currentUser, ROLES, toast, escapeHtml).
//
// Halaman staf (tab "Kurikulum" pada menu "Angket"):
//   - Guru / Wali Kelas  -> mengisi angket Guru (43 butir, Bagian A-E + 6 pertanyaan terbuka).
//   - Kepala Madrasah    -> mengisi angket Kepala/Waka Kurikulum (16 butir).
//   - Guru yang menjabat Waka Kurikulum boleh memilih "Isi sebagai: Kepala/Waka".
//   - Admin & Kepala Madrasah -> tab "Rekap" (rata-rata per bagian, per aspek Mindful/Meaningful/Joyful untuk guru, rekomendasi tindak lanjut otomatis, kategori, jawaban terbuka, ekspor CSV).
//
// Tombol ON/OFF: Admin & Kepala Madrasah membuka/menutup angket di bagian atas halaman. Status disimpan di
//   angket_kurikulum_status = { aktif:true|false, periode:'2026-1', diubahOleh, tgl }.
//   Selama OFF, form tidak tampil & tidak bisa dikirim (guru, kepala, ortu, siswa). Rekap tetap bisa dilihat.
//
// Data Firebase:  angket_kurikulum/{periode}/{jenis}/{kunciResponden}
//   = { nama, jenis, periode, tgl, jawaban:{A1:3,...}, terbuka:{T1:'...'} }
//   jenis: guru | kepala | ortu | siswa.   periode: "2026-1" (Ganjil Jul-Des) / "2026-2" (Genap Jan-Jun).
//
// Portal Orang Tua / siswa memakai API global (portal-ortu.js tinggal memanggilnya):
//   AngketKurikulum.renderForm(idWadah, 'ortu', { kunci, nama }, { izinAnonim:true })  -> sudah dipasang di js/portal-ortu.js
// CATATAN: Rules Firebase harus mengizinkan tulis ke angket_kurikulum (lihat angket-kurikulum.rules.json).
//   Pengecekan peran & status di file ini hanya di sisi klien; Rules WAJIB menegakkannya (status aktif, nilai 1-4, panjang teks, batas baca rekap).
// Responden anonim memakai kunci acak (disimpan lokal di perangkat), bukan identitas. CSV memakai kode responden; ubah CSV_SERTAKAN_NAMA bila nama diperlukan.
// Opsi "Isi sebagai Kepala/Waka" hanya muncul bagi guru yang dikenali sebagai Waka Kurikulum (lihat adalahWaka()).
// ============================================================
(function () {
  'use strict';

  var SKALA = ['Tidak Pernah / Sangat Tidak Setuju', 'Jarang / Tidak Setuju', 'Sering / Setuju', 'Selalu / Sangat Setuju'];
  var BAGIAN = { A: 'A. Visi, Misi & Arah Kurikulum', B: 'B. Pembelajaran Mendalam', C: 'C. Nilai-Nilai Cinta', D: 'D. Ekosistem Pendukung', E: 'E. Asesmen' };

  // [kode, bagian, teks, dibalik?]
  var BUTIR = {
    guru: [
      ['A1','A','Saya memahami visi dan misi madrasah dengan baik.'],
      ['A2','A','Visi dan misi madrasah disosialisasikan secara rutin kepada guru.'],
      ['A3','A','Nilai-nilai cinta (kepada Allah dan Rasul-Nya, ilmu, lingkungan, diri dan sesama, tanah air) tercermin dalam visi dan misi madrasah.'],
      ['A4','A','Visi dan misi madrasah menjadi acuan saya dalam merancang pembelajaran.'],
      ['A5','A','Praktik pembelajaran di kelas saya sejalan dengan visi dan misi madrasah.'],
      ['A6','A','Madrasah mengevaluasi secara berkala keterlaksanaan visi dan misi dalam pembelajaran.'],
      ['B1','B','[Mindful] Saya menyampaikan tujuan pembelajaran dan alasan mempelajari materi di awal pembelajaran.'],
      ['B2','B','[Mindful] Saya mengajak peserta didik menyadari proses berpikir dan cara belajarnya sendiri.'],
      ['B3','B','[Mindful] Saya memberi ruang bagi peserta didik untuk fokus, bertanya, dan merenungkan materi.'],
      ['B4','B','[Meaningful] Saya mengaitkan materi dengan pengalaman dan kehidupan nyata peserta didik.'],
      ['B5','B','[Meaningful] Saya mendorong peserta didik memahami konsep, bukan sekadar menghafal.'],
      ['B6','B','[Meaningful] Saya memberi tugas atau projek yang menuntut penerapan pengetahuan untuk memecahkan masalah.'],
      ['B7','B','[Joyful] Saya menggunakan metode dan media bervariasi agar peserta didik antusias belajar.'],
      ['B8','B','[Joyful] Suasana kelas saya aman, hangat, dan bebas dari rasa takut salah.'],
      ['B9','B','[Joyful] Peserta didik aktif terlibat (berdiskusi, berkolaborasi, mencoba) selama pembelajaran.'],
      ['C1','C','[Cinta Allah & Rasul] Saya mengaitkan materi dengan keimanan, rasa syukur, dan keteladanan Rasulullah.'],
      ['C2','C','[Cinta Allah & Rasul] Saya membiasakan doa, dzikir, atau refleksi spiritual dalam pembelajaran.'],
      ['C3','C','[Cinta Ilmu] Saya menumbuhkan rasa ingin tahu dan semangat mencari ilmu pada peserta didik.'],
      ['C4','C','[Cinta Ilmu] Saya membiasakan peserta didik membaca, meneliti, dan bertanya secara kritis.'],
      ['C5','C','[Cinta Lingkungan] Saya mengaitkan materi dengan kepedulian terhadap kebersihan dan kelestarian lingkungan.'],
      ['C6','C','[Cinta Lingkungan] Saya melibatkan peserta didik dalam aksi nyata menjaga lingkungan madrasah.'],
      ['C7','C','[Cinta Diri & Sesama] Saya menumbuhkan sikap saling menghargai, empati, dan kerja sama.'],
      ['C8','C','[Cinta Diri & Sesama] Saya membantu peserta didik mengenali potensi dan menghargai dirinya sendiri.'],
      ['C9','C','[Cinta Tanah Air] Saya mengaitkan materi dengan nilai kebangsaan, kebinekaan, dan kebanggaan sebagai bangsa Indonesia.'],
      ['C10','C','[Cinta Tanah Air] Saya memberi contoh dan kegiatan yang menumbuhkan semangat berkontribusi bagi bangsa dan masyarakat.'],
      ['D1','D','[Guru] Saya punya kompetensi dan kesempatan pengembangan diri (pelatihan, KKG/MGMP) untuk menerapkan pembelajaran mendalam.'],
      ['D2','D','[Guru] Beban kerja dan administrasi tidak menghambat saya merancang pembelajaran yang bermakna.'],
      ['D3','D','[Peserta didik] Peserta didik memiliki motivasi dan kesiapan belajar yang baik.'],
      ['D4','D','[Kepala madrasah] Kepala madrasah memberi dukungan, supervisi, dan umpan balik yang membangun.'],
      ['D5','D','[Kepala madrasah] Kebijakan madrasah mendorong inovasi pembelajaran dan penerapan Kurikulum Berbasis Cinta.'],
      ['D6','D','[Orang tua] Orang tua mendukung proses belajar dan pembiasaan nilai di rumah.'],
      ['D7','D','[Orang tua] Ada komunikasi yang baik antara guru dan orang tua tentang perkembangan peserta didik.'],
      ['D8','D','[Sarana prasarana] Sarana, media, dan sumber belajar di madrasah memadai untuk pembelajaran mendalam.'],
      ['D9','D','[Budaya madrasah] Budaya madrasah (keteladanan, kolaborasi, saling menghargai) mendukung tumbuhnya nilai-nilai cinta.'],
      ['E1','E','Asesmen yang saya gunakan mengukur pemahaman dan penalaran, bukan hanya hafalan.'],
      ['E2','E','Saya menggunakan beragam bentuk asesmen (tes, observasi, penugasan, unjuk kerja).'],
      ['E3','E','Saya menggunakan asesmen projek atau portofolio untuk menilai kemampuan peserta didik.'],
      ['E4','E','Saya menilai sikap dan nilai (akhlak, empati, tanggung jawab) secara terencana dengan instrumen yang jelas.'],
      ['E5','E','Asesmen saya mampu menggambarkan perkembangan nilai-nilai cinta pada peserta didik.'],
      ['E6','E','Saya memberi kesempatan peserta didik melakukan refleksi diri atas proses belajarnya.'],
      ['E7','E','Saya memberikan umpan balik yang membangun, bukan hanya nilai angka.'],
      ['E8','E','Hasil asesmen saya gunakan untuk memperbaiki proses pembelajaran berikutnya.'],
      ['E9','E','Asesmen di madrasah saat ini masih didominasi tes tertulis.', true]
    ],
    kepala: [
      ['K1','A','Visi dan misi madrasah memuat nilai-nilai cinta (kepada Allah dan Rasul-Nya, ilmu, lingkungan, diri dan sesama, tanah air).'],
      ['K2','A','Visi dan misi madrasah dijabarkan ke dalam program dan kurikulum operasional madrasah.'],
      ['K3','A','Madrasah mengevaluasi berkala keterlaksanaan visi dan misi dalam pembelajaran di kelas.'],
      ['K4','B','Madrasah memiliki program pelatihan atau pendampingan guru tentang Pembelajaran Mendalam.'],
      ['K5','B','Saya melakukan supervisi yang menilai kebermaknaan dan keterlibatan peserta didik, bukan hanya kelengkapan administrasi.'],
      ['K6','B','Guru mendapat umpan balik yang membangun dari hasil supervisi.'],
      ['K7','C','Madrasah memiliki program atau pembiasaan yang menumbuhkan nilai-nilai cinta.'],
      ['K8','C','Nilai-nilai cinta diintegrasikan dalam perencanaan pembelajaran semua mata pelajaran, bukan hanya mapel agama.'],
      ['K9','D','Kebijakan dan anggaran madrasah mendukung inovasi pembelajaran.'],
      ['K10','D','Sarana, media, dan sumber belajar memadai untuk pembelajaran mendalam.'],
      ['K11','D','Madrasah menjalin komunikasi dan kerja sama yang baik dengan orang tua.'],
      ['K12','D','Budaya madrasah (keteladanan, kolaborasi, saling menghargai) mendukung Kurikulum Berbasis Cinta.'],
      ['K13','E','Kebijakan asesmen madrasah mendorong penilaian yang tidak hanya berupa tes tertulis.'],
      ['K14','E','Madrasah mendorong guru menggunakan projek, portofolio, dan refleksi diri peserta didik.'],
      ['K15','E','Perkembangan sikap dan nilai peserta didik dipantau dan dilaporkan secara terencana.'],
      ['K16','E','Asesmen di madrasah masih didominasi tes tertulis yang mengukur hafalan.', true]
    ],
    ortu: [
      ['O1','A','Saya mengetahui visi dan misi madrasah tempat anak saya belajar.'],
      ['O2','A','Madrasah menyampaikan program dan arah pendidikan kepada orang tua (rapat, buku penghubung, grup komunikasi).'],
      ['O3','B','Anak saya bersemangat dan senang berangkat serta belajar di madrasah.'],
      ['O4','B','Anak saya bisa menceritakan apa yang dipelajari dan menghubungkannya dengan kehidupan sehari-hari.'],
      ['O5','C','Anak saya menunjukkan perkembangan dalam ibadah, doa, dan kecintaan kepada Allah dan Rasul-Nya.'],
      ['O6','C','Anak saya gemar belajar, membaca, dan bertanya.'],
      ['O7','C','Anak saya peduli kebersihan dan lingkungan, termasuk di rumah.'],
      ['O8','C','Anak saya menunjukkan sikap menghargai, empati, dan suka membantu orang lain.'],
      ['O9','C','Anak saya menunjukkan kebanggaan dan kepedulian sebagai bagian dari bangsa Indonesia.'],
      ['O10','D','Saya mendampingi dan menanyakan perkembangan belajar anak di rumah.'],
      ['O11','D','Saya membiasakan nilai-nilai yang diajarkan madrasah (ibadah, kejujuran, kepedulian) di rumah.'],
      ['O12','D','Guru dan madrasah mudah dihubungi dan terbuka terhadap masukan orang tua.'],
      ['O13','D','Saya menerima laporan perkembangan anak yang jelas, tidak hanya berupa nilai angka.'],
      ['O15','D','Lingkungan madrasah aman, ramah, dan memberi keteladanan yang baik bagi anak.'],
      ['O14','E','Saya memahami cara madrasah menilai anak (tugas, projek, praktik, sikap), tidak hanya ujian tertulis.']
    ],
    siswa: [
      ['S1','B','Guru menjelaskan apa yang akan dipelajari dan untuk apa kita mempelajarinya.'],
      ['S2','B','Aku diberi waktu untuk berpikir, bertanya, dan merenungkan pelajaran.'],
      ['S3','B','Aku mengerti hubungan pelajaran dengan kehidupan sehari-hariku.'],
      ['S4','B','Aku diminta memahami dan menerapkan pelajaran, bukan hanya menghafal.'],
      ['S5','B','Belajar di kelas terasa menyenangkan.'],
      ['S6','B','Aku berani bertanya atau menjawab tanpa takut salah atau ditertawakan.'],
      ['S7','B','Aku ikut aktif berdiskusi, bekerja sama, atau mengerjakan projek bersama teman.'],
      ['S8','C','Guru mengaitkan pelajaran dengan iman, rasa syukur, dan teladan Rasulullah.'],
      ['S9','C','Guru membuatku semangat mencari tahu dan suka belajar.'],
      ['S10','C','Aku diajak menjaga kebersihan dan kelestarian lingkungan madrasah.'],
      ['S11','C','Di kelas, kami diajarkan untuk saling menghargai, peduli, dan membantu teman.'],
      ['S12','C','Aku diajak mencintai dan bangga sebagai bagian dari bangsa Indonesia.'],
      ['S13','E','Penilaianku tidak hanya ujian tertulis, tetapi juga tugas, projek, atau praktik.'],
      ['S14','E','Aku diberi kesempatan menilai dan merenungkan perkembangan belajarku sendiri.'],
      ['S15','E','Guru memberi masukan yang membantuku menjadi lebih baik, bukan hanya nilai.']
    ]
  };

  var TERBUKA = {
    guru: [
      'Nilai cinta apa yang paling sudah terlihat dalam pembelajaran di madrasah ini? Berikan contohnya.',
      'Nilai cinta apa yang paling perlu diperkuat? Mengapa?',
      'Apa kesenjangan terbesar antara visi madrasah dan praktik pembelajaran sehari-hari?',
      'Apa faktor pendukung dan penghambat utama yang Anda alami dalam menerapkan pembelajaran mendalam?',
      'Bentuk asesmen apa yang paling sesuai untuk mengukur perubahan cara berpikir, bersikap, dan bertindak peserta didik?',
      'Dukungan atau pelatihan apa yang Anda butuhkan agar dapat menerapkan pembelajaran mendalam berbasis cinta secara optimal?'
    ],
    kepala: [
      'Apa kesenjangan terbesar antara visi madrasah dan praktik pembelajaran saat ini?',
      'Apa faktor pendukung dan penghambat utama penerapan Pembelajaran Mendalam dan Kurikulum Berbasis Cinta?',
      'Dukungan apa yang dibutuhkan madrasah untuk memperkuat penerapannya?'
    ],
    ortu: [
      'Perubahan positif apa yang Bapak/Ibu lihat pada anak sejak belajar di madrasah ini?',
      'Hal apa yang masih perlu diperbaiki dalam pembelajaran atau komunikasi madrasah?',
      'Bagaimana Bapak/Ibu bersedia berperan mendukung pembelajaran dan pembiasaan nilai di rumah?'
    ],
    siswa: [
      'Hal apa di kelas yang paling kamu sukai?',
      'Hal apa yang membuatmu kurang semangat atau sulit belajar?',
      'Bagaimana cara guru mengajar atau menilai yang kamu harapkan?'
    ]
  };

  var JUDUL = { guru: 'Angket Guru', kepala: 'Angket Kepala Madrasah / Waka Kurikulum', ortu: 'Angket Orang Tua / Wali', siswa: 'Angket Peserta Didik' };

  // ---------- util ----------
  function el(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function periodeSekarang() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() >= 6 ? '1' : '2'); }
  function labelPeriode(p) { var a = String(p).split('-'); return (a[1] === '1' ? 'Ganjil' : 'Genap') + ' ' + a[0]; }
  function aman(k) { return String(k || '').replace(/[.#$\[\]\/]/g, '_'); }
  // Bulatkan ke 2 desimal dulu supaya kategori selalu cocok dengan angka yang ditampilkan.
  function kategori(r) { r = +r.toFixed(2); return r >= 3.26 ? 'Sangat Baik' : r >= 2.51 ? 'Baik' : r >= 1.76 ? 'Cukup' : 'Kurang'; }
  function skorValid(v) { return typeof v === 'number' && v >= 1 && v <= 4 && v % 1 === 0; }
  function skorButir(b, v) { return b[3] ? (5 - v) : v; }
  var POLA_PERIODE = /^\d{4}-[12]$/;
  var CSV_SERTAKAN_NAMA = false; // false = CSV memakai kode responden (G001, O014, ...) agar sejalan dengan janji kerahasiaan
  // Kunci responden: utamakan ID/kunci unik; nama hanya cadangan terakhir (nama kembar akan saling menimpa).
  function kunciDari(o) {
    o = o || {};
    var k = o.key || o.id || o.uid;
    if (!k) { k = o.name; try { console.warn('[angket] responden tanpa key/id; memakai nama sebagai kunci:', o.name); } catch (e) {} }
    return k;
  }

  var CSS = '' +
    '.akq-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}' +
    '.akq-tab{padding:7px 14px;border-radius:999px;border:1px solid #d1d5db;background:#fff;font-size:13px;cursor:pointer;}' +
    '.akq-tab.on{background:#047857;color:#fff;border-color:#047857;}' +
    '.akq-grup{margin:16px 0 6px;font-weight:700;font-size:14px;color:#065f46;}' +
    '.akq-butir{padding:10px 0;border-bottom:1px solid #f3f4f6;}' +
    '.akq-teks{font-size:13px;margin-bottom:6px;}' +
    '.akq-opsi{display:flex;gap:6px;flex-wrap:wrap;}' +
    '.akq-opsi label{position:relative;flex:1 1 60px;min-width:56px;font-size:12px;cursor:pointer;}' +
    '.akq-opsi input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;}' +
    '.akq-opsi span{display:block;text-align:center;border:1px solid #d1d5db;border-radius:8px;padding:6px 4px;}' +
    '.akq-opsi input:checked + span{background:#047857;color:#fff;border-color:#047857;}' +
    '.akq-opsi input:focus-visible + span{outline:2px solid #047857;outline-offset:2px;}' +
    '.akq-skala{font-size:11px;color:#6b7280;margin:6px 0 10px;line-height:1.5;}' +
    '.akq-ta{width:100%;min-height:64px;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-size:13px;box-sizing:border-box;}' +
    '.akq-tbl{width:100%;border-collapse:collapse;font-size:12px;margin:8px 0;}' +
    '.akq-tbl th,.akq-tbl td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;}' +
    '.akq-tbl th{background:#f0fdf4;}' +
    '.akq-scroll{overflow-x:auto;}';
  function pasangCss() {
    if (el('akqCss')) return;
    var s = document.createElement('style'); s.id = 'akqCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  // ---------- status ON/OFF ----------
  var STATUS_PATH = 'angket_kurikulum_status';
  // Tanggal batas disimpan sebagai 'YYYY-MM-DD' (tanggal lokal perangkat). Hari batas masih dihitung terbuka sampai pukul 23.59.
  var stCache = null; // status terakhir yang berhasil dibaca (dipakai pesan pengingat di Rekap)
  function hariIni() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function sisaHari(batas) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(batas || ''); if (!m) return null;
    var t = new Date(), a = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()), b = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return Math.round((b - a) / 86400000);
  }
  function labelTgl(batas) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(batas || ''); if (!m) return '';
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function teksSisa(sisa) { return sisa === null ? '' : (sisa <= 0 ? 'hari ini hari terakhir' : 'sisa ' + sisa + ' hari'); }
  function bacaStatus() {
    return db.ref(STATUS_PATH).once('value').then(function (sn) {
      var v = sn.val() || {};
      var batas = /^\d{4}-\d{2}-\d{2}$/.test(v.batas || '') ? v.batas : '';
      var sisa = batas ? sisaHari(batas) : null;
      var lewat = v.aktif === true && sisa !== null && sisa < 0; // batas waktu terlewat: dianggap tertutup otomatis
      var st = { aktif: v.aktif === true && !lewat, aktifDb: v.aktif === true, lewat: lewat, batas: batas, sisa: sisa, periode: v.periode || periodeSekarang(), tgl: v.tgl || '', diubahOleh: v.diubahOleh || '' };
      stCache = st; return st;
    }, function () { return { aktif: false, aktifDb: false, lewat: false, batas: '', sisa: null, periode: periodeSekarang(), tgl: '', diubahOleh: '', gagal: true }; });
  }
  function aturStatus(aktif, batas) {
    return bacaStatus().then(function (lama) {
      var data = { aktif: !!aktif, periode: aktif ? periodeSekarang() : lama.periode, diubahOleh: (currentUser && currentUser.name) || '', tgl: new Date().toISOString(), batas: (aktif && batas) ? batas : null };
      return db.ref(STATUS_PATH).set(data).then(function () { return data; });
    });
  }
  function aturBatas(batas) {
    return db.ref(STATUS_PATH).update({ batas: batas || null, diubahOleh: (currentUser && currentUser.name) || '', tgl: new Date().toISOString() });
  }
  function bukaWa(nomor, pesan) {
    var n = String(nomor || '').replace(/[^0-9]/g, '');
    if (n.indexOf('0') === 0) n = '62' + n.slice(1); else if (n.indexOf('62') !== 0) n = '62' + n;
    if (n.length < 10 || n.length > 15) { toast('Nomor WhatsApp tidak valid.', true); return; }
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(pesan), '_blank');
  }
  function htmlTutup() {
    return '<div style="padding:18px;border:1px dashed #d1d5db;border-radius:10px;text-align:center;color:#6b7280;font-size:13px;">' +
      '<div style="font-size:26px;">🔒</div><b>Angket belum dibuka.</b><br>Angket akan bisa diisi setelah dibuka oleh Admin atau Kepala Madrasah.</div>';
  }

  // ---------- form ----------
  function htmlForm(jenis, pre) {
    var h = '<div class="akq-skala">Skala: 1 = ' + esc(SKALA[0]) + ' &nbsp;|&nbsp; 2 = ' + esc(SKALA[1]) + ' &nbsp;|&nbsp; 3 = ' + esc(SKALA[2]) + ' &nbsp;|&nbsp; 4 = ' + esc(SKALA[3]) + '. Jawablah sesuai kondisi yang SEBENARNYA terjadi.</div>';
    var last = '';
    BUTIR[jenis].forEach(function (b) {
      if (b[1] !== last) { h += '<div class="akq-grup">' + esc(BAGIAN[b[1]]) + '</div>'; last = b[1]; }
      var cur = pre && pre.jawaban ? pre.jawaban[b[0]] : null;
      h += '<div class="akq-butir"><div class="akq-teks"><b>' + esc(b[0]) + '.</b> ' + esc(b[2]) + '</div><div class="akq-opsi" role="radiogroup" aria-label="Butir ' + esc(b[0]) + '">';
      for (var i = 1; i <= 4; i++) h += '<label><input type="radio" name="akq_' + esc(b[0]) + '" value="' + i + '"' + (cur === i ? ' checked' : '') + '><span>' + i + '</span></label>';
      h += '</div></div>';
    });
    h += '<div class="akq-grup">Pertanyaan Terbuka</div>';
    TERBUKA[jenis].forEach(function (q, i) {
      var v = pre && pre.terbuka ? (pre.terbuka['T' + (i + 1)] || '') : '';
      h += '<div class="akq-butir"><div class="akq-teks">' + (i + 1) + '. ' + esc(q) + '</div><textarea class="akq-ta" id="akq_T' + (i + 1) + '_' + jenis + '" maxlength="600">' + esc(v) + '</textarea></div>';
    });
    return h;
  }

  function bacaForm(jenis) {
    var jawaban = {}, kosong = [];
    BUTIR[jenis].forEach(function (b) {
      var r = document.querySelector('input[name="akq_' + b[0] + '"]:checked');
      if (r) jawaban[b[0]] = parseInt(r.value, 10); else kosong.push(b[0]);
    });
    var terbuka = {};
    TERBUKA[jenis].forEach(function (q, i) { var t = el('akq_T' + (i + 1) + '_' + jenis); if (t && t.value.trim()) terbuka['T' + (i + 1)] = t.value.trim().slice(0, 600); });
    return { jawaban: jawaban, terbuka: terbuka, kosong: kosong };
  }

  // ---------- jawaban anonim: kunci acak, hanya disimpan lokal di perangkat ----------
  function acak() {
    try { var a = new Uint32Array(4); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return x.toString(36); }).join(''); }
    catch (e) { return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2); }
  }
  // Satu kunci acak per (periode, jenis, responden) di perangkat ini. Dipakai agar responden anonim tetap bisa memperbarui jawabannya
  // tanpa menaruh identitasnya di path database.
  function anonKey(jenis, periode, kunci, buat) {
    var k = 'akq_anon_' + periode + '_' + jenis + '_' + aman(kunci);
    try {
      var v = localStorage.getItem(k);
      if (!v && buat) { v = 'anon_' + acak(); localStorage.setItem(k, v); }
      return v || '';
    } catch (e) { return buat ? 'anon_' + acak() : ''; }
  }
  function refResp(periode, jenis, k) { return db.ref('angket_kurikulum/' + periode + '/' + jenis + '/' + k); }

  function htmlGagal() {
    return '<div style="padding:18px;border:1px dashed #fca5a5;border-radius:10px;text-align:center;color:#b91c1c;font-size:13px;">' +
      '<div style="font-size:26px;">⚠️</div><b>Status angket tidak bisa dibaca.</b><br>Periksa koneksi internet atau izin akses (Rules Firebase), lalu coba lagi.' +
      '<div style="margin-top:10px;"><button type="button" class="btn btn-soft" data-akq-ulang="1">Coba Lagi</button></div></div>';
  }

  // Simpan jawaban. Satu responden satu data per periode (mengisi ulang = memperbarui).
  function kirim(jenis, resp, periode) {
    var f = bacaForm(jenis);
    if (f.kosong.length) { toast('Masih ada ' + f.kosong.length + ' butir belum dijawab (mulai dari ' + f.kosong[0] + ').', true); return Promise.resolve(false); }
    return bacaStatus().then(function (st) {
      if (st.gagal) { toast('Tidak bisa memeriksa status angket (koneksi atau izin akses). Coba lagi.', true); return false; }
      if (!st.aktif) { toast('Angket sedang ditutup. Hubungi Admin atau Kepala Madrasah.', true); return false; }
      periode = (periode && POLA_PERIODE.test(periode)) ? periode : st.periode;
      var anon = !!resp.anonim;
      var kAsli = aman(resp.kunci);
      var kSimpan = anon ? anonKey(jenis, periode, resp.kunci, true) : kAsli;
      var kLain = anon ? kAsli : anonKey(jenis, periode, resp.kunci, false); // catatan versi lain dari responden yang sama, dibersihkan agar tidak ganda
      var data = { nama: anon ? '' : (resp.nama || ''), jenis: jenis, periode: periode, tgl: anon ? new Date().toISOString().slice(0, 10) : new Date().toISOString(), jawaban: f.jawaban, terbuka: f.terbuka };
      return refResp(periode, jenis, kSimpan).set(data).then(function () {
        if (kLain && kLain !== kSimpan) { try { refResp(periode, jenis, kLain).remove().catch(function () {}); } catch (e) {} }
        toast('Terima kasih, angket berhasil dikirim.'); try { updateNotif(true); } catch (e) {} return true;
      }).catch(function (e) {
        toast('Gagal mengirim angket: ' + (e && e.message ? e.message : e), true); return false;
      });
    });
  }

  // Dipakai portal ortu/siswa & halaman staf.
  function renderForm(idWadah, jenis, resp, opsi) {
    pasangCss();
    var w = el(idWadah); if (!w || !BUTIR[jenis]) return;
    opsi = opsi || {};
    w.innerHTML = 'Memuat...';
    bacaStatus().then(function (st) {
      if (st.gagal) {
        w.innerHTML = htmlGagal();
        var u = w.querySelector('[data-akq-ulang]'); if (u) u.addEventListener('click', function () { renderForm(idWadah, jenis, resp, opsi); });
        return;
      }
      if (!st.aktif) { w.innerHTML = htmlTutup(); return; }
      var periode = (opsi.periode && POLA_PERIODE.test(opsi.periode)) ? opsi.periode : st.periode;
      var staf = (jenis === 'guru' || jenis === 'kepala');
      w.innerHTML = '<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Periode: <b>' + esc(labelPeriode(periode)) + '</b>.' + (st.batas ? ' Batas pengisian: <b>' + esc(labelTgl(st.batas)) + '</b> (' + teksSisa(st.sisa) + ').' : '') + ' Jawaban dilaporkan secara gabungan dan hanya dipakai untuk perbaikan pembelajaran.' +
        (staf ? ' Madrasah hanya melihat siapa yang sudah mengisi, bukan isi jawaban per orang.' : '') + '</div><div id="akqFormIsi_' + jenis + '">Memuat...</div>';
      var kAsli = aman(resp.kunci);
      var kAnon = opsi.izinAnonim ? anonKey(jenis, periode, resp.kunci, false) : '';
      var baca = function (k) { return k ? refResp(periode, jenis, k).once('value').then(function (sn) { return sn.val(); }, function () { return null; }) : Promise.resolve(null); };
      Promise.all([baca(kAsli), baca(kAnon)]).then(function (r) {
        var isi = el('akqFormIsi_' + jenis); if (!isi) return;
        var pre = r[0] || r[1], ada = !!pre, anonAwal = !r[0] && !!r[1];
        isi.innerHTML = (ada ? '<div class="akq-skala" style="color:#047857;">Anda sudah mengisi angket ini pada ' + esc(new Date(pre.tgl).toLocaleDateString('id-ID')) + '. Mengirim lagi akan memperbarui jawaban sebelumnya.</div>' : '') +
          htmlForm(jenis, pre) + (opsi.izinAnonim ? '<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:12px;cursor:pointer;"><input type="checkbox" id="akqAnonim_' + jenis + '"' + (anonAwal ? ' checked' : '') + '> <span>Kirim sebagai anonim (identitas tidak disimpan bersama jawaban). <span style="color:#6b7280;">Jawaban anonim hanya bisa diperbarui dari perangkat ini.</span></span></label>' : '') +
          '<div style="margin-top:14px;"><button class="btn btn-primary" id="akqKirim_' + jenis + '" type="button">' + (ada ? 'Perbarui Jawaban' : 'Kirim Angket') + '</button></div>';
        el('akqKirim_' + jenis).addEventListener('click', function () {
          var b = this; b.disabled = true;
          var an = el('akqAnonim_' + jenis); var resp2 = { kunci: resp.kunci, nama: resp.nama, anonim: an ? an.checked : !!resp.anonim };
          kirim(jenis, resp2, periode).then(function (ok) { b.disabled = false; if (ok) renderForm(idWadah, jenis, resp, opsi); });
        });
      });
    });
  }

  // ---------- rekap ----------
  function hitung(jenis, daftar) {
    var tot = {}, n = {};
    daftar.forEach(function (r) {
      BUTIR[jenis].forEach(function (b) {
        var v = r.jawaban && r.jawaban[b[0]]; if (!skorValid(v)) return;
        var g = b[1]; tot[g] = (tot[g] || 0) + skorButir(b, v); n[g] = (n[g] || 0) + 1;
      });
    });
    var out = {}; Object.keys(BAGIAN).forEach(function (g) { out[g] = n[g] ? tot[g] / n[g] : null; });
    return out;
  }

  // Rekap aspek Pembelajaran Mendalam: Mindful / Meaningful / Joyful.
  // Hanya butir angket guru (B1-B9) yang berlabel aspek, jadi rekap ini khusus guru. Tidak mengubah data/Rules.
  var ASPEK_PM = ['Mindful', 'Meaningful', 'Joyful'];
  function aspekButir(b) { var m = /^\[(Mindful|Meaningful|Joyful)\]/.exec(b[2]); return m ? m[1] : null; }
  function htmlAspekPM(daftarGuru) {
    if (!daftarGuru || !daftarGuru.length) return '';
    var tot = {}, n = {}, per = {};
    daftarGuru.forEach(function (r) {
      BUTIR.guru.forEach(function (b) {
        var a = aspekButir(b); if (!a) return;
        var v = r.jawaban && r.jawaban[b[0]]; if (!skorValid(v)) return;
        var s = skorButir(b, v);
        tot[a] = (tot[a] || 0) + s; n[a] = (n[a] || 0) + 1;
        var p = per[b[0]] || (per[b[0]] = { t: 0, n: 0 }); p.t += s; p.n++;
      });
    });
    var avgs = {}, ada = 0;
    ASPEK_PM.forEach(function (a) { avgs[a] = n[a] ? tot[a] / n[a] : null; if (avgs[a] != null) ada++; });
    if (!ada) return '';
    var baris = ASPEK_PM.map(function (a) {
      var butir = BUTIR.guru.filter(function (b) { return aspekButir(b) === a; }).map(function (b) {
        var p = per[b[0]], x = p && p.n ? p.t / p.n : null;
        return '<li>' + esc(b[0]) + '. ' + esc(b[2].replace(/^\[[^\]]+\]\s*/, '')) + ' <b>' + (x == null ? '-' : x.toFixed(2)) + '</b></li>';
      }).join('');
      return '<tr><td>' + a + '</td><td>' + (avgs[a] == null ? '-' : avgs[a].toFixed(2) + ' (' + kategori(avgs[a]) + ')') + '</td>' +
        '<td><details><summary style="cursor:pointer;font-size:12px;">Lihat butir</summary><ul style="font-size:12px;margin:6px 0 0 16px;">' + butir + '</ul></details></td></tr>';
    }).join('');
    var catatan = '';
    if (ada === ASPEK_PM.length) {
      var mn = Math.min.apply(null, ASPEK_PM.map(function (a) { return +avgs[a].toFixed(2); }));
      var mx = Math.max.apply(null, ASPEK_PM.map(function (a) { return +avgs[a].toFixed(2); }));
      var sebut = function (v) { return ASPEK_PM.filter(function (a) { return +avgs[a].toFixed(2) === v; }).join(' dan '); };
      if (mn !== mx) catatan = '<div style="font-size:12px;margin-top:6px;">Rata-rata terendah: <b>' + sebut(mn) + '</b>. Tertinggi: <b>' + sebut(mx) + '</b>.</div>';
    }
    return '<div class="akq-grup">Aspek Pembelajaran Mendalam (Mindful, Meaningful, Joyful)</div>' +
      '<div class="akq-scroll"><table class="akq-tbl"><tr><th>Aspek</th><th>Rata-rata guru (' + daftarGuru.length + ' responden)</th><th>Butir</th></tr>' + baris + '</table></div>' + catatan +
      '<div class="akq-skala">Dihitung dari butir guru B1-B3 (Mindful), B4-B6 (Meaningful), dan B7-B9 (Joyful). Kategori sama dengan tabel di atas.</div>';
  }

  // ---------- perbandingan dengan periode sebelumnya ----------
  // Urutan periode: 2025-1 (Ganjil) -> 2026-2 (Genap) -> 2026-1 (Ganjil) ... ; "sebelum" dari X-1 ialah X-2, dari X-2 ialah (X-1)-1.
  function periodeSebelum(p) { var a = String(p).split('-'), y = parseInt(a[0], 10); return a[1] === '1' ? y + '-2' : (y - 1) + '-1'; }
  function avgAspek(daftar) {
    var tot = {}, n = {}, out = {};
    (daftar || []).forEach(function (r) {
      BUTIR.guru.forEach(function (b) {
        var a = aspekButir(b), v = r.jawaban && r.jawaban[b[0]]; if (!a || !skorValid(v)) return;
        tot[a] = (tot[a] || 0) + skorButir(b, v); n[a] = (n[a] || 0) + 1;
      });
    });
    ASPEK_PM.forEach(function (a) { out[a] = n[a] ? tot[a] / n[a] : null; });
    return out;
  }
  function selTren(prev, now) {
    if (now == null) return '-';
    if (prev == null) return now.toFixed(2) + ' <span style="color:#9ca3af;">(baru)</span>';
    var d = now - prev, naik = d > 0.004, turun = d < -0.004;
    return prev.toFixed(2) + ' &rarr; <b>' + now.toFixed(2) + '</b> <span style="color:' + (naik ? '#047857' : turun ? '#b91c1c' : '#6b7280') + ';">' + (naik ? '&#9650; +' : turun ? '&#9660; ' : '&#9679; ') + d.toFixed(2) + '</span>';
  }
  function muatTren(periode, seq) {
    var box = el('akqTren'); if (!box) return;
    var prev = periodeSebelum(periode);
    db.ref('angket_kurikulum/' + prev).once('value').then(function (snap) {
      if (seq !== rekapSeq) return;
      var v = snap.val() || {}, rows = '', adaRow = false;
      ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) {
        var dn = dataRekap[j] || [], dp = Object.keys(v[j] || {}).map(function (k) { return v[j][k]; });
        if (!dn.length || !dp.length) return;
        var an = hitung(j, dn), ap = hitung(j, dp); adaRow = true;
        rows += '<tr><td>' + esc(JENIS_PENDEK[j]) + ' (' + dp.length + ' &rarr; ' + dn.length + ')</td>' + Object.keys(BAGIAN).map(function (g) { return '<td>' + selTren(ap[g], an[g]) + '</td>'; }).join('') + '</tr>';
      });
      var dpg = Object.keys(v.guru || {}).map(function (k) { return v.guru[k]; }), dng = dataRekap.guru || [], rowsA = '';
      if (dpg.length && dng.length) {
        var aa = avgAspek(dpg), an2 = avgAspek(dng);
        rowsA = ASPEK_PM.map(function (a) { return '<tr><td>' + a + '</td><td>' + selTren(aa[a], an2[a]) + '</td></tr>'; }).join('');
      }
      if (!adaRow && !rowsA) { box.innerHTML = '<p style="font-size:13px;color:#6b7280;">Belum ada data periode sebelumnya (' + esc(labelPeriode(prev)) + ') yang bisa dibandingkan.</p>'; return; }
      var h = '<div style="font-size:12px;color:#6b7280;margin-bottom:4px;">Dibandingkan dengan ' + esc(labelPeriode(prev)) + '. Format: sebelumnya &rarr; sekarang. Angka dalam kurung = jumlah responden (sebelumnya &rarr; sekarang).</div>';
      if (adaRow) h += '<div class="akq-scroll"><table class="akq-tbl"><tr><th>Responden</th>' + Object.keys(BAGIAN).map(function (g) { return '<th>' + esc(BAGIAN[g].split('. ')[1]) + '</th>'; }).join('') + '</tr>' + rows + '</table></div>';
      if (rowsA) h += '<div class="akq-scroll" style="margin-top:8px;"><table class="akq-tbl"><tr><th>Aspek (guru)</th><th>Perubahan</th></tr>' + rowsA + '</table></div>';
      h += '<div class="akq-skala">Perbandingan hanya untuk jenis responden yang punya data di kedua periode. Jumlah dan susunan responden bisa berbeda, jadi baca sebagai gambaran arah, bukan selisih pasti.</div>';
      box.innerHTML = h;
    }, function () { if (seq === rekapSeq) box.innerHTML = '<p style="font-size:13px;color:#b91c1c;">Perbandingan tidak bisa dimuat (periksa koneksi atau Rules).</p>'; });
  }
  function unduhBelumGuru(daftar, periode) {
    var baris = [['No', 'Nama', 'Periode', 'Status']].concat(daftar.map(function (g, i) { return [i + 1, g.name || '', periode, 'Belum mengisi']; }));
    var csv = baris.map(function (r) { return r.map(selCsv).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'angket-kurikulum-belum-mengisi-' + periode + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- cetak / simpan PDF rekap ----------
  // Mencetak salinan rekap lewat fitur cetak peramban (di HP pilih "Simpan sebagai PDF"). Daftar nama yang belum mengisi tidak ikut dicetak.
  function pasangCssCetak() {
    if (el('akqCssCetak')) return;
    var P = 'body.akq-cetak #akqPrintRoot';
    var s = document.createElement('style'); s.id = 'akqCssCetak';
    s.textContent = '#akqPrintRoot{display:none;}@media print{' +
      'html,body.akq-cetak{height:auto!important;overflow:visible!important;position:static!important;background:#fff!important;}' +
      'body.akq-cetak>*:not(#akqPrintRoot){display:none!important;}' +
      P + '{display:block!important;background:#fff;font-size:12px;}' +
      P + ',' + P + ' *{color:#000!important;}' +
      P + ' .akq-scroll{overflow:visible!important;}' +
      P + ' table{width:100%;border-collapse:collapse;}' +
      P + ' th,' + P + ' td{border:1px solid #999;padding:4px 6px;background:#fff;}' +
      P + ' th{background:#f3f4f6;}' +
      P + ' tr{page-break-inside:avoid;}' +
      P + ' .akq-grup{page-break-after:avoid;}' +
      'body.akq-cetak,body.akq-cetak *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}';
    document.head.appendChild(s);
  }
  function cetakRekap(periode) {
    var w = el('akqRekapIsi'); if (!w) return;
    var klon = document.createElement('div'); klon.innerHTML = w.innerHTML;
    Array.prototype.forEach.call(klon.querySelectorAll('button, select, input'), function (n) { n.remove(); });
    Array.prototype.forEach.call(klon.querySelectorAll('details'), function (d) {
      var sm = d.querySelector('summary');
      if (sm && /^Belum mengisi/.test(sm.textContent.trim())) { d.remove(); return; }
      d.setAttribute('open', '');
    });
    var gt = null;
    Array.prototype.forEach.call(klon.querySelectorAll('.akq-grup'), function (g) { if (g.textContent.trim() === 'Jawaban Terbuka') gt = g; });
    if (gt && !confirm('Sertakan jawaban terbuka (isian bebas) pada cetakan?\nPilih Batal untuk mencetak tanpa jawaban terbuka.')) {
      while (gt.nextSibling) gt.parentNode.removeChild(gt.nextSibling);
      gt.remove();
    }
    var old = el('akqPrintRoot'); if (old) old.remove();
    var root = document.createElement('div'); root.id = 'akqPrintRoot';
    root.innerHTML = '<h2 style="margin:0 0 2px;font-size:18px;">Rekap Angket Kurikulum</h2><div style="font-size:12px;margin-bottom:10px;">Periode ' + esc(labelPeriode(periode)) +
      ' &middot; dicetak ' + esc(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })) + ' &middot; SI-MAMBA</div>';
    root.appendChild(klon);
    document.body.appendChild(root);
    pasangCssCetak();
    var bersih = function () {
      document.body.classList.remove('akq-cetak');
      var r = el('akqPrintRoot'); if (r) r.remove();
      window.removeEventListener('afterprint', bersih);
    };
    window.addEventListener('afterprint', bersih);
    document.body.classList.add('akq-cetak');
    setTimeout(function () { try { window.print(); } catch (e) { bersih(); toast('Peramban tidak mendukung cetak.', true); } }, 150);
    setTimeout(bersih, 90000); // cadangan bila afterprint tidak dipanggil peramban
  }

  var dataRekap = {}, teksIngat = '', rekapSeq = 0;
  // ---- Rekomendasi & Rencana Tindak Lanjut (RTL) ----
  // Usulan OTOMATIS dari skor rekap (bagian A-E semua responden, ditambah aspek Mindful/Meaningful/Joyful untuk guru).
  // Bagian dijadikan baris tindak lanjut bila salah satu jenis responden berkategori Cukup/Kurang (aspek: skor guru); sisanya masuk daftar "dipertahankan".
  // Isinya usulan umum untuk dibahas Kepala & Waka Kurikulum, bukan keputusan dan bukan penilaian individu. Tidak menulis ke Firebase.
  var JENIS_PENDEK = { guru: 'Guru', kepala: 'Kepala/Waka', ortu: 'Orang Tua', siswa: 'Siswa' };
  var RTL = {
    A: { pj: 'Kepala Madrasah dan Waka Kurikulum',
         perbaiki: 'Sosialisasikan ulang visi dan misi (rapat dewan guru, poster di kelas dan ruang guru). Minta tiap guru menautkan visi-misi ke tujuan pembelajaran di perangkat ajarnya, lalu tinjau dalam supervisi.',
         jaga: 'Pertahankan sosialisasi rutin visi-misi dan jadikan acuan saat menyusun program tahunan.' },
    B: { pj: 'Waka Kurikulum dan guru',
         perbaiki: 'Adakan pendampingan tematik Pembelajaran Mendalam: contoh praktik baik, supervisi kelas yang berfokus pada keterlibatan dan kebermaknaan, serta sesi berbagi antarguru setiap bulan.',
         jaga: 'Dokumentasikan praktik baik Pembelajaran Mendalam dan jadikan bahan berbagi antarguru.' },
    C: { pj: 'Kepala Madrasah, wali kelas, dan seluruh guru',
         perbaiki: 'Perkuat pembiasaan nilai cinta lewat kegiatan rutin dan keteladanan guru, tautkan ke modul ajar, dan pantau bersama wali kelas secara berkala.',
         jaga: 'Pertahankan pembiasaan dan keteladanan nilai cinta yang sudah berjalan.' },
    D: { pj: 'Kepala Madrasah dan Waka Kurikulum',
         perbaiki: 'Tinjau beban administrasi guru, kecukupan sarana dan media, serta dukungan supervisi. Daftar hambatan dari jawaban terbuka, lalu tetapkan yang bisa dibereskan pada semester berjalan.',
         jaga: 'Pertahankan dukungan sarana, supervisi, dan kolaborasi yang sudah baik.' },
    E: { pj: 'Waka Kurikulum dan guru',
         perbaiki: 'Latih guru menyusun asesmen formatif dan autentik (proyek, portofolio, observasi), samakan rubrik, dan pastikan umpan balik sampai ke peserta didik secara berkala.',
         jaga: 'Pertahankan praktik asesmen yang sudah baik dan bagikan contohnya antarguru.' }
  };
  var RTL_ASPEK = {
    Mindful:    { pj: 'Waka Kurikulum dan guru kelas/mapel', perbaiki: 'Awali pelajaran dengan tujuan dan alasan belajar, beri jeda refleksi singkat di akhir, dan ajak peserta didik menyebut cara belajar yang berhasil bagi mereka.' },
    Meaningful: { pj: 'Waka Kurikulum dan guru kelas/mapel', perbaiki: 'Kaitkan materi dengan pengalaman nyata peserta didik, tambah tugas atau projek penerapan, dan kurangi pembelajaran yang hanya menghafal.' },
    Joyful:     { pj: 'Waka Kurikulum dan guru kelas/mapel', perbaiki: 'Variasikan metode dan media, bangun suasana kelas yang aman untuk bertanya dan salah, serta perbanyak kerja kelompok dan aktivitas mencoba.' }
  };
  var teksRtl = '';
  function ringkasTeks(t, n) { t = String(t).replace(/^\[[^\]]+\]\s*/, ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
  function htmlRTL(periode) {
    teksRtl = '';
    var jenisAda = ['guru', 'kepala', 'ortu', 'siswa'].filter(function (j) { return dataRekap[j] && dataRekap[j].length; });
    if (!jenisAda.length) return '';
    var avgJ = {}, butir = {};
    jenisAda.forEach(function (j) {
      avgJ[j] = hitung(j, dataRekap[j]);
      BUTIR[j].forEach(function (b) {
        var t = 0, c = 0;
        dataRekap[j].forEach(function (r) { var v = r.jawaban && r.jawaban[b[0]]; if (skorValid(v)) { t += skorButir(b, v); c++; } });
        if (c) (butir[b[1]] = butir[b[1]] || []).push({ j: j, kode: b[0], teks: b[2], avg: t / c });
      });
    });
    // Rata-rata gabungan = rata-rata dari rata-rata tiap jenis responden (bobot sama), agar jenis yang banyak respondennya tidak mendominasi.
    function gabung(g) {
      var v = jenisAda.map(function (j) { return avgJ[j][g]; }).filter(function (x) { return x != null; });
      return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
    }
    function rincian(g) {
      return jenisAda.filter(function (j) { return avgJ[j][g] != null; }).map(function (j) { return JENIS_PENDEK[j] + ' ' + avgJ[j][g].toFixed(2) + ' (n=' + dataRekap[j].length + ')'; }).join('; ');
    }
    function terendah(g) {
      return (butir[g] || []).slice().sort(function (a, b) { return a.avg - b.avg; }).slice(0, 2).map(function (x) {
        return JENIS_PENDEK[x.j] + ' ' + x.kode + ': ' + ringkasTeks(x.teks, 90) + ' (' + x.avg.toFixed(2) + ')';
      });
    }
    var item = [], baik = [];
    // Bagian ditandai perlu tindak lanjut bila SALAH SATU jenis responden berada di kategori Cukup/Kurang,
    // supaya skor rendah dari satu kelompok (mis. guru) tidak tertutup oleh skor tinggi kelompok lain.
    Object.keys(BAGIAN).forEach(function (g) {
      var a = gabung(g); if (a == null) return;
      var jj = jenisAda.filter(function (j) { return avgJ[j][g] != null; });
      var lj = jj.reduce(function (m, j) { return avgJ[j][g] < avgJ[m][g] ? j : m; }, jj[0]);
      var low = avgJ[lj][g], kat = kategori(low);
      if (kat === 'Cukup' || kat === 'Kurang') {
        item.push({ avg: low, kat: kat, nama: BAGIAN[g], butir: terendah(g), rek: RTL[g].perbaiki, pj: RTL[g].pj,
          rinci: 'Terendah pada ' + JENIS_PENDEK[lj] + '. Gabungan semua jenis ' + a.toFixed(2) + '. Rincian: ' + rincian(g) });
      } else baik.push({ nama: BAGIAN[g], avg: a, kat: kategori(a), jaga: RTL[g].jaga });
    });
    if (dataRekap.guru && dataRekap.guru.length) {
      ASPEK_PM.forEach(function (as) {
        var t = 0, c = 0;
        dataRekap.guru.forEach(function (r) { BUTIR.guru.forEach(function (b) {
          if (aspekButir(b) !== as) return;
          var v = r.jawaban && r.jawaban[b[0]]; if (skorValid(v)) { t += skorButir(b, v); c++; }
        }); });
        if (!c) return;
        var a = t / c, kat = kategori(a);
        if (kat === 'Cukup' || kat === 'Kurang') item.push({ avg: a, kat: kat, nama: 'Aspek ' + as + ' (Pembelajaran Mendalam, guru)', rinci: '', butir: [], rek: RTL_ASPEK[as].perbaiki, pj: RTL_ASPEK[as].pj });
      });
    }
    item.sort(function (x, y) { return x.avg - y.avg; });
    var gap = [];
    if (avgJ.guru && avgJ.kepala) Object.keys(BAGIAN).forEach(function (g) {
      if (avgJ.guru[g] != null && avgJ.kepala[g] != null && Math.abs(avgJ.guru[g] - avgJ.kepala[g]) >= 0.75) {
        gap.push(BAGIAN[g] + ' (Guru ' + avgJ.guru[g].toFixed(2) + ' vs Kepala/Waka ' + avgJ.kepala[g].toFixed(2) + ')');
      }
    });
    var sedikit = jenisAda.filter(function (j) { return dataRekap[j].length < 5; }).map(function (j) { return JENIS_PENDEK[j] + ' (n=' + dataRekap[j].length + ')'; });

    var h = '<div class="akq-grup">Rekomendasi &amp; Rencana Tindak Lanjut</div>';
    var tt = ['REKOMENDASI TINDAK LANJUT ANGKET KURIKULUM, PERIODE ' + labelPeriode(periode).toUpperCase(), ''];
    if (item.length) {
      h += '<div class="akq-scroll"><table class="akq-tbl"><tr><th>Prioritas</th><th>Temuan</th><th>Rekomendasi tindak lanjut</th><th>Usulan penanggung jawab</th></tr>';
      item.forEach(function (x, i) {
        var pr = x.kat === 'Kurang' ? 'Tinggi' : 'Sedang';
        h += '<tr><td>' + pr + '</td><td><b>' + esc(x.nama) + '</b><br>' + x.avg.toFixed(2) + ' (' + x.kat + ')' +
          (x.rinci ? '<div style="font-size:12px;margin-top:4px;">' + esc(x.rinci) + '</div>' : '') +
          (x.butir.length ? '<div style="font-size:12px;margin-top:4px;">Butir terendah: ' + x.butir.map(esc).join(' | ') + '</div>' : '') +
          '</td><td>' + esc(x.rek) + '</td><td>' + esc(x.pj) + '</td></tr>';
        tt.push((i + 1) + '. [Prioritas ' + pr + '] ' + x.nama + ': rata-rata ' + x.avg.toFixed(2) + ' (' + x.kat + ').');
        if (x.rinci) tt.push('   Rincian: ' + x.rinci);
        x.butir.forEach(function (b) { tt.push('   Butir terendah: ' + b); });
        tt.push('   Rekomendasi: ' + x.rek, '   Usulan penanggung jawab: ' + x.pj, '');
      });
      h += '</table></div>';
    } else {
      h += '<p style="font-size:13px;">Semua bagian berada pada kategori Baik atau Sangat Baik. Fokus tindak lanjut: pertahankan dan dokumentasikan praktik baik.</p>';
      tt.push('Semua bagian berada pada kategori Baik atau Sangat Baik. Fokus: pertahankan dan dokumentasikan praktik baik.', '');
    }
    if (baik.length) {
      h += '<details style="margin:8px 0;"><summary style="cursor:pointer;font-size:13px;">Yang sudah baik dan perlu dipertahankan (' + baik.length + ')</summary><ul style="font-size:12px;margin:6px 0 0 18px;">' +
        baik.map(function (x) { return '<li><b>' + esc(x.nama) + '</b> ' + x.avg.toFixed(2) + ' (' + x.kat + '). ' + esc(x.jaga) + '</li>'; }).join('') + '</ul></details>';
      tt.push('Dipertahankan:');
      baik.forEach(function (x) { tt.push('- ' + x.nama + ' ' + x.avg.toFixed(2) + ' (' + x.kat + '). ' + x.jaga); });
      tt.push('');
    }
    if (gap.length) {
      h += '<div style="font-size:12px;margin:6px 0;">Persepsi guru dan kepala/waka berbeda cukup jauh pada: ' + gap.map(esc).join('; ') + '. Disarankan dibahas bersama untuk menyamakan pemahaman dan praktik.</div>';
      tt.push('Catatan: persepsi guru dan kepala/waka berbeda cukup jauh pada ' + gap.join('; ') + '.');
    }
    if (sedikit.length) {
      h += '<div style="font-size:12px;margin:6px 0;color:#92400e;">Jumlah responden masih sedikit pada: ' + sedikit.map(esc).join(', ') + '. Tafsirkan dengan hati-hati.</div>';
      tt.push('Catatan: jumlah responden masih sedikit pada ' + sedikit.join(', ') + '.');
    }
    h += '<div class="akq-skala">Usulan otomatis dari skor angket. Bagian ditandai bila salah satu jenis responden berkategori Cukup atau Kurang; angka gabungan memberi bobot sama untuk tiap jenis responden. Skor mencerminkan persepsi responden, bukan penilaian individu. Mohon dibahas dan disesuaikan oleh Kepala dan Waka Kurikulum.</div>' +
      '<div style="margin:8px 0;"><button class="btn btn-soft" id="akqRtlSalin" type="button">Salin rencana tindak lanjut</button></div>';
    teksRtl = tt.join('\n');
    return h;
  }

  function renderRekap() {
    var w = el('akqRekapIsi'); if (!w) return;
    var periode = (el('akqPeriode') || {}).value || periodeSekarang();
    var seq = ++rekapSeq; // abaikan respons lama bila periode diganti cepat
    w.innerHTML = 'Memuat rekap...';
    db.ref('angket_kurikulum/' + periode).once('value').then(function (snap) {
      if (seq !== rekapSeq) return;
      var v = snap.val() || {}; dataRekap = {};
      var h = '<div class="akq-scroll"><table class="akq-tbl"><tr><th>Responden</th><th>Jumlah</th>' + Object.keys(BAGIAN).map(function (g) { return '<th>' + esc(BAGIAN[g].split('. ')[1]) + '</th>'; }).join('') + '</tr>';
      var adaData = false;
      ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) {
        var daftar = Object.keys(v[j] || {}).map(function (k) { return v[j][k]; });
        dataRekap[j] = daftar;
        var avg = hitung(j, daftar);
        h += '<tr><td>' + esc(JUDUL[j]) + '</td><td>' + daftar.length + '</td>' + Object.keys(BAGIAN).map(function (g) {
          return '<td>' + (avg[g] == null ? '-' : avg[g].toFixed(2) + ' (' + kategori(avg[g]) + ')') + '</td>';
        }).join('') + '</tr>';
        if (daftar.length) adaData = true;
      });
      var sudahKey = {}; ['guru', 'kepala'].forEach(function (j) { Object.keys(v[j] || {}).forEach(function (k) { sudahKey[k] = 1; }); });
      var semuaGuru = (typeof allGuru !== 'undefined' && allGuru && allGuru.length) ? allGuru : [];
      var belumList = semuaGuru.filter(function (g) { return !sudahKey[aman(kunciDari(g))]; });
      // Jawaban anonim tidak membawa identitas, jadi tidak bisa mencoret nama dari daftar. Dihitung terpisah sebagai perkiraan.
      var anonN = Object.keys(v.guru || {}).filter(function (k) { return k.indexOf('anon_') === 0; }).length;
      var sisaPerkiraan = Math.max(0, belumList.length - anonN);
      var progHtml = '';
      var bolehIngat = !stCache || (stCache.aktif && stCache.periode === periode);
      var infoBatasWa = (stCache && stCache.aktif && stCache.periode === periode && stCache.batas) ? ' Batas pengisian ' + labelTgl(stCache.batas) + '.' : '';
      if (semuaGuru.length) {
        var sudahN = Math.min(semuaGuru.length, semuaGuru.length - belumList.length + anonN), pct = Math.round(sudahN / semuaGuru.length * 100);
        progHtml = '<div style="margin:6px 0 12px;"><div style="font-size:13px;margin-bottom:4px;"><b>Kemajuan pengisian guru: ' + sudahN + ' dari ' + semuaGuru.length + ' (' + pct + '%)</b></div>' +
          '<div style="height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;"><div style="height:8px;width:' + pct + '%;background:#047857;"></div></div>';
        if (belumList.length) {
          progHtml += '<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:13px;">Belum mengisi (' + belumList.length + ')</summary>' +
            (anonN ? '<div style="font-size:12px;color:#92400e;margin:6px 0;">' + anonN + ' guru mengisi secara anonim, jadi namanya tidak tercatat dan tetap muncul di daftar ini. Perkiraan yang benar-benar belum mengisi: sekitar <b>' + sisaPerkiraan + '</b>.</div>' : '') +
            '<ul style="font-size:12px;margin:6px 0 6px 18px;">' +
            belumList.map(function (g, i) {
              var wa = String(g.noWa || '').replace(/[^0-9]/g, '');
              return '<li style="margin-bottom:6px;">' + esc(g.name) + ' ' + (!bolehIngat ? '' : (wa.length >= 9 ?
                '<button type="button" class="btn btn-soft" data-akq-wa="' + i + '" style="padding:2px 10px;font-size:12px;">Ingatkan via WA</button>' :
                '<span style="color:#9ca3af;">(nomor WA belum diisi)</span>')) + '</li>';
            }).join('') + '</ul>' + (bolehIngat ? '' : '<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Angket sedang ditutup, tombol pengingat muncul saat angket dibuka.</div>') +
            '<button class="btn btn-soft" id="akqSalin" type="button">Salin pesan pengingat</button> <button class="btn btn-soft" id="akqCsvBelum" type="button">Unduh daftar (CSV)</button></details>';
        } else progHtml += '<div style="font-size:12px;color:#047857;margin-top:6px;">Semua guru sudah mengisi. Alhamdulillah.</div>';
        progHtml += '</div>';
      }
      // Pesan pengingat sengaja tidak memuat nama, agar aman ditempel di grup.
      teksIngat = "Assalamu'alaikum Bapak/Ibu guru. Angket Kurikulum (Pembelajaran Mendalam & Kurikulum Berbasis Cinta) periode " + labelPeriode(periode) +
        ' sudah dibuka di SiMamba, menu Angket Kurikulum.' + (sisaPerkiraan ? ' Saat ini masih ada sekitar ' + sisaPerkiraan + ' guru yang belum mengisi.' : '') + infoBatasWa + ' Mohon segera diisi; bila sudah mengisi, abaikan pesan ini. Terima kasih.';
      h += '</table></div><div class="akq-skala">Kategori: 3,26-4,00 Sangat Baik | 2,51-3,25 Baik | 1,76-2,50 Cukup | 1,00-1,75 Kurang. Butir negatif (E9, K16) otomatis dibalik. Rata-rata dihitung per butir terjawab.</div>';
      h += htmlAspekPM(dataRekap.guru);
      h += htmlRTL(periode);
      if (!adaData) h += '<p style="font-size:13px;color:#6b7280;">Belum ada jawaban pada periode ini.</p>';
      else {
        h += '<div class="akq-grup">Perbandingan dengan Periode Sebelumnya</div><div id="akqTren" style="font-size:13px;">Memuat perbandingan...</div>';
        h += '<div style="margin:8px 0;"><button class="btn btn-soft" id="akqCsv" type="button">Unduh CSV</button> <button class="btn btn-soft" id="akqCetak" type="button">Cetak / Simpan PDF</button></div>';
        h += '<div class="akq-grup">Jawaban Terbuka</div>';
        ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) {
          var item = [];
          dataRekap[j].forEach(function (r) { Object.keys(r.terbuka || {}).forEach(function (t) { item.push([t, r.terbuka[t]]); }); });
          if (!item.length) return;
          h += '<details style="margin:6px 0;"><summary style="cursor:pointer;font-size:13px;">' + esc(JUDUL[j]) + ' (' + item.length + ' jawaban)</summary>';
          TERBUKA[j].forEach(function (q, i) {
            var isi = item.filter(function (x) { return x[0] === 'T' + (i + 1); });
            if (!isi.length) return;
            h += '<div style="font-size:12px;font-weight:600;margin:8px 0 2px;">' + (i + 1) + '. ' + esc(q) + '</div><ul style="font-size:12px;margin:0 0 4px 18px;">' + isi.map(function (x) { return '<li>' + esc(x[1]) + '</li>'; }).join('') + '</ul>';
          });
          h += '</details>';
        });
      }
      w.innerHTML = progHtml + h;
      Array.prototype.forEach.call(w.querySelectorAll('[data-akq-wa]'), function (btn) {
        btn.addEventListener('click', function () {
          var g = belumList[parseInt(btn.getAttribute('data-akq-wa'), 10)]; if (!g) return;
          bukaWa(g.noWa, "Assalamu'alaikum Bapak/Ibu " + g.name + '. Mohon kesediaannya mengisi Angket Kurikulum (Pembelajaran Mendalam & Kurikulum Berbasis Cinta) periode ' +
            labelPeriode(periode) + ' di SiMamba, menu Angket Kurikulum (sekitar 10 menit).' + infoBatasWa + ' Bila sudah mengisi, abaikan pesan ini. Terima kasih.');
        });
      });
      var sl = el('akqSalin'); if (sl) sl.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teksIngat).then(function () { toast('Pesan pengingat disalin.'); }, function () { toast('Gagal menyalin pesan.', true); });
        else toast('Peramban tidak mendukung salin otomatis.', true);
      });
      var rs = el('akqRtlSalin'); if (rs) rs.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teksRtl).then(function () { toast('Rencana tindak lanjut disalin.'); }, function () { toast('Gagal menyalin.', true); });
        else toast('Peramban tidak mendukung salin otomatis.', true);
      });
      var b = el('akqCsv'); if (b) b.addEventListener('click', function () { unduhCsv(periode); });
      if (el('akqTren')) muatTren(periode, seq);
      var ct = el('akqCetak'); if (ct) ct.addEventListener('click', function () { cetakRekap(periode); });
      var cb = el('akqCsvBelum'); if (cb) cb.addEventListener('click', function () { unduhBelumGuru(belumList, periode); });
    }, function (e) { if (seq !== rekapSeq) return; w.innerHTML = '<p style="color:#b91c1c;font-size:13px;">Tidak bisa membaca data (' + esc(e && e.message) + '). Periksa Rules Firebase untuk angket_kurikulum.</p>'; });
  }

  // Sel CSV: kutip, gandakan tanda kutip, dan netralkan awalan rumus (=, +, -, @) agar tidak dieksekusi Excel/Sheets.
  function selCsv(c) {
    if (typeof c === 'string' && /^[=+\-@\t\r]/.test(c)) c = "'" + c;
    return '"' + String(c).replace(/"/g, '""') + '"';
  }
  function unduhCsv(periode) {
    var KODE = { guru: 'G', kepala: 'K', ortu: 'O', siswa: 'S' };
    var baris = [['periode', 'jenis', 'responden', 'tanggal', 'butir', 'skor_mentah', 'skor_olah', 'jawaban_terbuka']];
    ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) {
      // Urut menurut waktu kirim (bukan abjad nama) agar kode responden tidak membocorkan identitas.
      var daftar = (dataRekap[j] || []).slice().sort(function (a, b) { return String(a.tgl || '').localeCompare(String(b.tgl || '')); });
      daftar.forEach(function (r, idx) {
        var resp = CSV_SERTAKAN_NAMA ? (r.nama || '(anonim)') : KODE[j] + ('00' + (idx + 1)).slice(-3);
        var tgl = (r.tgl || '').slice(0, 10);
        BUTIR[j].forEach(function (b) {
          var v = r.jawaban && r.jawaban[b[0]]; if (!skorValid(v)) return;
          baris.push([periode, j, resp, tgl, b[0], v, skorButir(b, v), '']);
        });
        Object.keys(r.terbuka || {}).sort().forEach(function (t) {
          baris.push([periode, j, resp, tgl, t, '', '', r.terbuka[t]]);
        });
      });
    });
    var csv = baris.map(function (r) { return r.map(selCsv).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'angket-kurikulum-' + periode + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- pengingat: titik menu + kartu Dashboard ----------
  var notifTerakhir = 0;
  function sembunyiPengingat() {
    var d = el('angketNotifDot'); if (d) d.classList.remove('show');
    var c = el('angketDashCard'); if (c) c.innerHTML = '';
  }
  function updateNotif(paksa) {
    if (typeof currentUser === 'undefined' || !currentUser || currentUser.role === ROLES.ADMIN) { sembunyiPengingat(); return; }
    var now = Date.now();
    if (!paksa && now - notifTerakhir < 20000) return;
    notifTerakhir = now;
    var kunci = aman(kunciDari(currentUser));
    bacaStatus().then(function (st) {
      if (st.gagal) return; // gagal baca status: jangan ubah tampilan pengingat
      if (!st.aktif) { sembunyiPengingat(); return; }
      var cek = function (j) {
        var q = [db.ref('angket_kurikulum/' + st.periode + '/' + j + '/' + kunci).once('value').then(function (x) { return x.exists(); }, function () { return false; })];
        var ak = anonKey(j, st.periode, kunci, false); // jawaban anonim dikenali lewat kunci acak yang tersimpan di perangkat ini
        if (ak) q.push(refResp(st.periode, j, ak).once('value').then(function (x) { return x.exists(); }, function () { return false; }));
        return Promise.all(q).then(function (r) { return r.some(Boolean); });
      };
      return Promise.all([cek('guru'), cek('kepala')]).then(function (r) {
        var belum = !(r[0] || r[1]);
        var d = el('angketNotifDot'); if (d) d.classList.toggle('show', belum);
        var c = el('angketDashCard'); if (!c) return;
        if (!belum) { c.innerHTML = ''; return; }
        var mepet = st.sisa !== null && st.sisa <= 2;
        c.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:12px 14px;border-radius:12px;border:1px solid ' + (mepet ? '#fcd34d' : '#a7f3d0') + ';background:' + (mepet ? '#fffbeb' : '#ecfdf5') + ';">' +
          '<div style="flex:1;min-width:180px;font-size:13px;"><b>📝 Angket Kurikulum sudah dibuka</b><br><span style="font-size:12px;color:' + (mepet ? '#92400e' : '#065f46') + ';">Periode ' + esc(labelPeriode(st.periode)) + '. Mohon isi, hanya sekitar 10 menit.' +
          (st.batas ? ' <b>Batas ' + esc(labelTgl(st.batas)) + ' (' + teksSisa(st.sisa) + ').</b>' : '') + '</span></div>' +
          '<button type="button" class="btn btn-primary" id="angketDashBtn">Isi Sekarang</button></div>';
        var b = el('angketDashBtn'); if (b) b.addEventListener('click', function () { if (typeof navigateTo === 'function') navigateTo('angket'); });
      });
    }).catch(function () {});
  }

  // ---------- halaman staf ----------
  function bolehRekap() { return typeof currentUser !== 'undefined' && currentUser && (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.HEADMASTER); }
  function jenisAwal() { return currentUser && currentUser.role === ROLES.HEADMASTER ? 'kepala' : 'guru'; }

  // Guru yang boleh mengisi angket Kepala/Waka. Dikenali dari salah satu:
  //   currentUser.isWaka / waka / wakaKurikulum === true, atau jabatan/position memuat "waka" dan "kurikulum",
  //   atau kuncinya terdaftar di window.ANGKET_WAKA (array kunci/nama).
  function adalahWaka() {
    var u = (typeof currentUser !== 'undefined' && currentUser) || {};
    if (u.isWaka === true || u.waka === true || u.wakaKurikulum === true) return true;
    var j = String(u.jabatan || u.position || u.jabatanTambahan || '').toLowerCase();
    if (j.indexOf('waka') !== -1 && j.indexOf('kurikulum') !== -1) return true;
    var daftar = window.ANGKET_WAKA;
    return !!(daftar && daftar.indexOf && (daftar.indexOf(kunciDari(u)) !== -1 || daftar.indexOf(u.name) !== -1));
  }

  function setupPage() {
    pasangCss();
    var p = el('angketKurikulumArea'); if (!p || !currentUser) return;
    var isiAngket = currentUser.role !== ROLES.ADMIN; // Admin hanya melihat rekap
    var jenis = jenisAwal();
    var pilihJenis = isiAngket && currentUser.role !== ROLES.HEADMASTER && adalahWaka();
    var h = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📝 Angket Kurikulum</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:10px;">Pembelajaran Mendalam &amp; Kurikulum Berbasis Cinta. Isian Anda membantu madrasah menyusun perbaikan.</p>' +
      (bolehRekap() ? '<div id="akqStatus" style="margin-bottom:12px;"></div>' : '') +
      '<div class="akq-tabs">' + (isiAngket ? '<button type="button" class="akq-tab on" data-tab="isi">Isi Angket</button>' : '') +
      (bolehRekap() ? '<button type="button" class="akq-tab' + (isiAngket ? '' : ' on') + '" data-tab="rekap">Rekap</button>' : '') + '</div>' +
      '<div id="akqTabIsi"' + (isiAngket ? '' : ' class="hidden"') + '>';
    if (pilihJenis) {
      h += '<div style="font-size:13px;margin-bottom:8px;">Isi sebagai: <select id="akqJenis"><option value="guru">Guru</option><option value="kepala">Kepala / Waka Kurikulum</option></select></div>';
    }
    h += '<div id="akqWadahForm"></div></div>' +
      '<div id="akqTabRekap" class="hidden"><div style="font-size:13px;margin-bottom:8px;">Periode: <select id="akqPeriode"></select></div><div id="akqRekapIsi"></div></div></div>';
    p.innerHTML = h;

    function muatForm() {
      var jj = el('akqJenis') ? el('akqJenis').value : jenis;
      if (jj === 'kepala' && currentUser.role !== ROLES.HEADMASTER && !adalahWaka()) jj = 'guru';
      renderForm('akqWadahForm', jj, { kunci: kunciDari(currentUser), nama: currentUser.name }, { izinAnonim: jj === 'guru' });
    }
    function renderStatus() {
      var w = el('akqStatus'); if (!w) return;
      bacaStatus().then(function (st) {
        if (st.gagal) {
          w.innerHTML = '<div style="padding:10px 12px;border-radius:10px;border:1px solid #fca5a5;background:#fef2f2;font-size:13px;color:#b91c1c;">Status angket tidak bisa dibaca. Periksa koneksi atau Rules Firebase. ' +
            '<button type="button" class="btn btn-soft" id="akqUlangStatus">Coba Lagi</button></div>';
          var u = el('akqUlangStatus'); if (u) u.addEventListener('click', renderStatus);
          return;
        }
        var on = st.aktif;
        var beda = on && st.periode !== periodeSekarang();
        var infoBatas = on && st.batas ? '<br>Batas pengisian: <b>' + esc(labelTgl(st.batas)) + '</b> (' + teksSisa(st.sisa) + ').' : '';
        var infoLewat = st.lewat ? '<br><span style="color:#b45309;">Batas waktu (' + esc(labelTgl(st.batas)) + ') sudah lewat, angket tertutup otomatis. Buka kembali dengan batas baru bila perlu.</span>' : '';
        w.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;border:1px solid ' + (on ? '#a7f3d0' : '#e5e7eb') + ';background:' + (on ? '#ecfdf5' : '#f9fafb') + ';">' +
          '<div style="flex:1;min-width:180px;font-size:13px;"><b>Status angket: ' + (on ? 'DIBUKA' : 'DITUTUP') + '</b><br><span style="font-size:12px;color:#6b7280;">' +
          (on ? 'Periode ' + esc(labelPeriode(st.periode)) + '. Guru dapat mengisi.' : 'Guru belum bisa mengisi. Tekan tombol untuk memulai.') + infoBatas + infoLewat +
          (st.tgl ? '<br>Diubah ' + esc(new Date(st.tgl).toLocaleString('id-ID')) + (st.diubahOleh ? ' oleh ' + esc(st.diubahOleh) : '') : '') +
          (beda ? '<br><span style="color:#b45309;">Periode angket (' + esc(labelPeriode(st.periode)) + ') berbeda dengan periode saat ini (' + esc(labelPeriode(periodeSekarang())) + '). Tutup lalu buka kembali untuk berpindah periode.</span>' : '') +
          '</span></div>' +
          '<button type="button" class="btn ' + (on ? 'btn-danger' : 'btn-success') + '" id="akqToggle">' + (on ? 'Tutup Angket (OFF)' : 'Buka Angket (ON)') + '</button>' +
          '<div style="flex-basis:100%;font-size:12px;color:#374151;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">Batas pengisian (opsional): ' +
          '<input type="date" id="akqBatas" min="' + hariIni() + '" value="' + (on ? esc(st.batas) : '') + '" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:8px;">' +
          (on ? '<button type="button" class="btn btn-soft" id="akqSimpanBatas">Simpan Batas</button>' : '') +
          '<span style="color:#6b7280;">Setelah tanggal ini angket tertutup otomatis. Kosongkan bila tanpa batas.</span></div></div>';
        function batasValid() {
          var bt = (el('akqBatas') || {}).value || '';
          if (bt && bt < hariIni()) { toast('Batas waktu tidak boleh tanggal yang sudah lewat.', true); return null; }
          return bt;
        }
        el('akqToggle').addEventListener('click', function () {
          if (on && !confirm('Tutup angket? Guru tidak bisa mengisi lagi sampai dibuka kembali. Jawaban yang sudah masuk tetap tersimpan.')) return;
          var bt = on ? '' : batasValid(); if (bt === null) return;
          this.disabled = true;
          aturStatus(!on, bt).then(function () {
            toast(on ? 'Angket ditutup.' : 'Angket dibuka untuk periode ' + labelPeriode(periodeSekarang()) + (bt ? ', batas ' + labelTgl(bt) : '') + '.');
            renderStatus(); updateNotif(true); if (isiAngket) muatForm(); if (bolehRekap() && el('akqPeriode')) renderRekap();
          }).catch(function (e) { toast('Gagal mengubah status: ' + (e && e.message ? e.message : e), true); renderStatus(); });
        });
        var sb = el('akqSimpanBatas');
        if (sb) sb.addEventListener('click', function () {
          var bt = batasValid(); if (bt === null) return;
          this.disabled = true;
          aturBatas(bt).then(function () {
            toast(bt ? 'Batas pengisian disimpan: ' + labelTgl(bt) + '.' : 'Batas pengisian dihapus.');
            renderStatus(); updateNotif(true); if (bolehRekap() && el('akqPeriode')) renderRekap();
          }).catch(function (e) { toast('Gagal menyimpan batas: ' + (e && e.message ? e.message : e), true); renderStatus(); });
        });
      });
    }
    renderStatus();
    if (el('akqJenis')) el('akqJenis').addEventListener('change', muatForm);
    var sel = el('akqPeriode'), siap = Promise.resolve();
    if (sel) {
      var y = new Date().getFullYear(), opt = '';
      for (var t = y; t >= y - 2; t--) { opt += '<option value="' + t + '-2">Genap ' + t + '</option><option value="' + t + '-1">Ganjil ' + t + '</option>'; }
      sel.innerHTML = opt; sel.value = periodeSekarang(); sel.addEventListener('change', renderRekap);
      // Default ke periode angket yang sedang/terakhir dipakai, supaya rekap tidak kosong saat pergantian semester.
      siap = bacaStatus().then(function (st) {
        if (st.gagal || !POLA_PERIODE.test(st.periode)) return;
        var ada = Array.prototype.some.call(sel.options, function (o) { return o.value === st.periode; });
        if (!ada) { var o = document.createElement('option'); o.value = st.periode; o.textContent = labelPeriode(st.periode); sel.insertBefore(o, sel.firstChild); }
        sel.value = st.periode;
      });
    }
    Array.prototype.forEach.call(p.querySelectorAll('.akq-tab'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(p.querySelectorAll('.akq-tab'), function (x) { x.classList.toggle('on', x === b); });
        var rekap = b.getAttribute('data-tab') === 'rekap';
        el('akqTabIsi').classList.toggle('hidden', rekap);
        el('akqTabRekap').classList.toggle('hidden', !rekap);
        if (rekap) siap.then(renderRekap);
      });
    });
    if (isiAngket) muatForm(); else { el('akqTabRekap').classList.remove('hidden'); siap.then(renderRekap); }
  }

  window.setupAngketKurikulumPage = setupPage;
  window.updateAngketKurikulumNotifDot = updateNotif;
  window.AngketKurikulum = { renderForm: renderForm, kirim: kirim, cekAktif: bacaStatus, butir: BUTIR, terbuka: TERBUKA, periodeSekarang: periodeSekarang };
})();

// ########## BAGIAN 2: ANGKET PROFIL LULUSAN ##########
// ============================================================
// ANGKET 8 DIMENSI PROFIL LULUSAN (diisi orang tua: kebiasaan ananda di rumah)
// Rujukan: 8 dimensi profil lulusan pada Standar Kompetensi Lulusan (Permendikdasmen No. 10 Tahun 2025).
// - Portal Orang Tua : kartu lipat "Angket 8 Profil Lulusan" (p8OrtuRender, dipanggil dari portal-ortu.js).
// - Guru/Wali Kelas/Admin/Kepsek : halaman "Angket Profil" (setupAngketProfilPage) -> rekap per kelas.
// Data  : angket_profil/{TA}_{Semester}_{siswaKey}  (satu isian per anak per semester; mengisi ulang = memperbarui)
//         { siswaKey, siswaNama, kelas, tahunAjaran, semester, jawaban:[24 angka 1..4], waktuIsi, versi }
// Skala : 4 = Selalu, 3 = Sering, 2 = Kadang-kadang, 1 = Belum pernah/belum terlihat. Butir ke-(d*3+b) = dimensi d, butir b.
// CATATAN: ini laporan mandiri orang tua -- gambaran kebiasaan di rumah, bukan nilai. Aturan Firebase untuk path
//          angket_profil harus ditambahkan (lihat panduan di balasan/README).
// Dimuat SESUDAH app.js & portal-ortu.js.
// ============================================================
const P8_DIMENSI = [
  { nama: 'Keimanan & Ketakwaan', ikon: '🕌', ket: 'Beribadah, berakhlak mulia, dan menjaga hubungan baik dengan Tuhan, sesama, dan alam.',
    butir: [
      'Ananda melaksanakan shalat wajib tanpa harus selalu diingatkan.',
      'Ananda terbiasa berdoa, membaca Al-Qur\'an, atau berzikir di rumah.',
      'Ananda berkata jujur dan bersikap sopan kepada orang tua, saudara, dan orang lain.'] },
  { nama: 'Kewargaan', ikon: '🇮🇩', ket: 'Menaati aturan, menghargai keberagaman, dan peduli pada lingkungan.',
    butir: [
      'Ananda menaati aturan di rumah dan lingkungan (misalnya antre, tidak mengambil milik orang lain).',
      'Ananda menghargai teman atau tetangga yang berbeda suku, bahasa, atau kebiasaan.',
      'Ananda menjaga kebersihan lingkungan (membuang sampah pada tempatnya, hemat air dan listrik).'] },
  { nama: 'Penalaran Kritis', ikon: '🧠', ket: 'Rasa ingin tahu, berpikir logis, dan mencari penyelesaian masalah.',
    butir: [
      'Ananda sering bertanya "mengapa" atau "bagaimana" tentang hal yang ia lihat atau pelajari.',
      'Ananda mencoba mencari cara atau mempertimbangkan beberapa pilihan saat menghadapi masalah sederhana.',
      'Ananda dapat menjelaskan alasan di balik pendapat atau pilihannya.'] },
  { nama: 'Kreativitas', ikon: '🎨', ket: 'Menghasilkan gagasan dan karya, serta berani mencoba hal baru.',
    butir: [
      'Ananda membuat sesuatu dari idenya sendiri (menggambar, bercerita, membuat karya dari barang bekas).',
      'Ananda memikirkan cara baru dalam bermain atau mengerjakan sesuatu.',
      'Ananda mau mencoba hal baru tanpa takut salah.'] },
  { nama: 'Kolaborasi', ikon: '🤝', ket: 'Peduli, berbagi, dan bekerja sama dengan orang lain.',
    butir: [
      'Ananda mau berbagi dengan saudara atau teman.',
      'Ananda membantu pekerjaan rumah atau ikut kegiatan bersama keluarga.',
      'Ananda bermain atau mengerjakan sesuatu bersama teman dengan rukun dan mau bergantian.'] },
  { nama: 'Kemandirian', ikon: '🌱', ket: 'Bertanggung jawab, berinisiatif, dan mengurus diri sendiri.',
    butir: [
      'Ananda menyiapkan perlengkapan sekolah dan mengerjakan tugasnya sendiri.',
      'Ananda mengurus kebutuhan dirinya (mandi, berpakaian, merapikan barang) tanpa banyak bantuan.',
      'Ananda bertanggung jawab atas tugas atau kesalahannya dan berusaha memperbaikinya.'] },
  { nama: 'Kesehatan', ikon: '💪', ket: 'Hidup bersih dan sehat, menjaga kebugaran fisik dan kesehatan mental.',
    butir: [
      'Ananda mencuci tangan dan menjaga kebersihan diri (mandi, menyikat gigi) secara teratur.',
      'Ananda makan makanan bergizi, minum air putih, dan tidur cukup.',
      'Ananda aktif bergerak atau bermain di luar, dan dapat mengungkapkan perasaannya dengan baik.'] },
  { nama: 'Komunikasi', ikon: '💬', ket: 'Menyimak, berbicara, membaca, dan menulis dengan baik dan santun.',
    butir: [
      'Ananda menyimak dengan baik saat diajak bicara.',
      'Ananda menyampaikan pendapat, keinginan, atau perasaannya dengan jelas dan sopan.',
      'Ananda gemar membaca dan menceritakan kembali pengalamannya (lisan atau tulisan).'] }
];
const P8_SKALA = [
  { nilai: 4, label: 'Selalu' }, { nilai: 3, label: 'Sering' }, { nilai: 2, label: 'Kadang' }, { nilai: 1, label: 'Belum' }
];
const P8_JUMLAH_BUTIR = P8_DIMENSI.reduce((s, d) => s + d.butir.length, 0);   // 24

function p8El(id) { return document.getElementById(id); }
function p8Esc(s) { return typeof escapeHtml === 'function' ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function p8Periode() {
  const ta = (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) || '';
  const sem = (typeof currentSemesterAktif !== 'undefined' && currentSemesterAktif) || '';
  return { ta: String(ta), sem: String(sem) };
}
// Key Firebase tidak boleh memuat . # $ [ ] /  -> "2026/2027" jadi "2026-2027".
function p8Key(siswaKey) {
  const p = p8Periode();
  const aman = s => String(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return aman(p.ta) + '_' + aman(p.sem) + '_' + siswaKey;
}
function p8SkorDimensi(jawab) {
  return P8_DIMENSI.map((d, di) => {
    const v = d.butir.map((_, bi) => Number(jawab && jawab[di * 3 + bi])).filter(n => n >= 1 && n <= 4);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  });
}
function p8Rata(arr) { const v = arr.filter(n => n !== null && n !== undefined && !isNaN(n)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
function p8Kategori(skor) {
  if (skor === null || skor === undefined) return { teks: '-', kelas: 'p8-kosong' };
  if (skor >= 3.5) return { teks: 'Sangat Baik', kelas: 'p8-sb' };
  if (skor >= 2.75) return { teks: 'Baik', kelas: 'p8-b' };
  if (skor >= 2) return { teks: 'Cukup', kelas: 'p8-c' };
  return { teks: 'Perlu Dibimbing', kelas: 'p8-k' };
}
const p8F = n => (n === null || n === undefined || isNaN(n)) ? '-' : n.toFixed(1).replace('.', ',');

// ---- CSS (disuntik sekali; class, bukan style inline) ----
const P8_CSS = '' +
  '.p8-dim{border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;margin-bottom:10px;background:#fff;}' +
  '.p8-dim-judul{font-weight:700;font-size:14px;}.p8-dim-ket{font-size:11px;color:#6b7280;margin:2px 0 8px;}' +
  '.p8-butir{padding:8px 0;border-top:1px dashed #e5e7eb;}.p8-teks{font-size:13px;margin-bottom:6px;}' +
  '.p8-opsi{display:flex;gap:6px;}.p8-opsi label{flex:1;position:relative;margin:0;}' +
  '.p8-opsi input{position:absolute;opacity:0;pointer-events:none;}' +
  '.p8-opsi span{display:block;text-align:center;padding:8px 2px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;cursor:pointer;background:#f9fafb;-webkit-tap-highlight-color:transparent;}' +
  '.p8-opsi input:checked+span{background:#059669;border-color:#059669;color:#fff;font-weight:700;}' +
  '.p8-opsi input:focus-visible+span{outline:2px solid #2563eb;outline-offset:1px;}' +
  '.p8-belum .p8-teks{color:#b45309;}' +
  '.p8-legenda{font-size:11px;color:#6b7280;margin:0 0 10px;}' +
  '.p8-progres{font-size:12px;color:#6b7280;margin:6px 0;}.p8-status{margin-top:8px;font-size:12px;}.p8-ok{color:#059669;font-weight:600;}.p8-err{color:#dc2626;}' +
  '.p8-baris{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px;}.p8-baris-nama{flex:0 0 42%;}' +
  '.p8-bar{flex:1;height:8px;background:#e5e7eb;border-radius:99px;overflow:hidden;}.p8-bar>i{display:block;height:100%;background:#059669;border-radius:99px;}' +
  '.p8-baris-nilai{flex:0 0 auto;min-width:74px;text-align:right;font-weight:700;}' +
  '.p8-sb{background:#dcfce7;color:#166534;}.p8-b{background:#dbeafe;color:#1e40af;}.p8-c{background:#fef9c3;color:#854d0e;}.p8-k{background:#fee2e2;color:#991b1b;}.p8-kosong{background:#f3f4f6;color:#9ca3af;}' +
  '.p8-tabel-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;}' +
  '.p8-tabel{border-collapse:collapse;width:100%;font-size:12px;min-width:640px;}.p8-tabel th,.p8-tabel td{border:1px solid #e5e7eb;padding:6px 5px;text-align:center;}' +
  '.p8-tabel th{background:#f3f4f6;font-weight:700;}.p8-tabel td.p8-nama{text-align:left;white-space:nowrap;}' +
  '.p8-tabel tfoot td{font-weight:700;background:#f9fafb;}.p8-lihat{background:none;border:0;padding:0;color:#2563eb;cursor:pointer;font:inherit;text-decoration:underline;}' +
  '.p8-ringkas{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;}.p8-kotak{flex:1 1 140px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;}' +
  '.p8-kotak b{display:block;font-size:18px;}.p8-kotak small{color:#6b7280;font-size:11px;}' +
  '.p8-kontrol{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;}' +
  '.p8-lencana{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;}';
function p8PasangCss() {
  if (p8El('p8Style')) return;
  const s = document.createElement('style'); s.id = 'p8Style'; s.textContent = P8_CSS; document.head.appendChild(s);
}

// ============================================================
// PORTAL ORANG TUA
// ============================================================
let p8Ortu = { token: 0 };
function angketProfilOrtuRender(siswa) {
  const content = p8El('portalOrtuContent');
  if (!content || !siswa || typeof db === 'undefined') return;
  p8PasangCss();
  const lama = p8El('p8OrtuBox'); if (lama) lama.remove();
  const box = document.createElement('details');
  box.id = 'p8OrtuBox'; box.className = 'card po-acc'; box.style.marginBottom = '12px';
  box.innerHTML = '<summary><span>🧭 Angket 8 Profil Lulusan</span><span class="po-badge" id="p8Badge">Memuat...</span></summary><div class="po-acc-body" id="p8Isi"><p class="text-muted" style="font-size:12px;">⏳ Memuat...</p></div>';
  const ds = content.querySelectorAll('details.po-acc');
  const sebelum = ds.length ? ds[ds.length - 1] : null;   // sebelum "Saran & Kritik" (kartu lipat terakhir)
  if (sebelum && sebelum.parentNode) sebelum.parentNode.insertBefore(box, sebelum); else content.appendChild(box);
  const my = ++p8Ortu.token;
  db.ref('angket_profil/' + p8Key(siswa.key)).once('value').then(snap => {
    if (my !== p8Ortu.token) return;
    const v = snap.val();
    p8OrtuGambar(box, siswa, v && Array.isArray(v.jawaban) ? v.jawaban : null, v && v.waktuIsi);
  }).catch(err => {
    if (my !== p8Ortu.token) return;
    const isi = p8El('p8Isi');
    if (isi) isi.innerHTML = '<p class="p8-err" style="font-size:12px;">Gagal memuat angket: ' + p8Esc((err && err.message) || err) + '</p>';
    const b = p8El('p8Badge'); if (b) b.textContent = 'Gagal';
  });
}
function p8FormHtml(jawab) {
  let h = '';
  P8_DIMENSI.forEach((d, di) => {
    h += '<div class="p8-dim"><div class="p8-dim-judul">' + d.ikon + ' ' + (di + 1) + '. ' + p8Esc(d.nama) + '</div><div class="p8-dim-ket">' + p8Esc(d.ket) + '</div>';
    d.butir.forEach((t, bi) => {
      const idx = di * 3 + bi;
      h += '<div class="p8-butir" data-p8-butir="' + idx + '"><div class="p8-teks">' + p8Esc(t) + '</div><div class="p8-opsi">' +
        P8_SKALA.map(s => '<label><input type="radio" name="p8_' + idx + '" value="' + s.nilai + '"' + (jawab && Number(jawab[idx]) === s.nilai ? ' checked' : '') + '><span>' + s.label + '</span></label>').join('') +
        '</div></div>';
    });
    h += '</div>';
  });
  return h;
}
function p8RingkasHtml(jawab) {
  const skor = p8SkorDimensi(jawab);
  return '<div class="p8-ringkas-ortu">' + P8_DIMENSI.map((d, i) => {
    const k = p8Kategori(skor[i]);
    return '<div class="p8-baris"><span class="p8-baris-nama">' + d.ikon + ' ' + p8Esc(d.nama) + '</span><span class="p8-bar"><i style="width:' + Math.round(((skor[i] || 0) / 4) * 100) + '%"></i></span><span class="p8-baris-nilai"><span class="p8-lencana ' + k.kelas + '">' + k.teks + '</span></span></div>';
  }).join('') + '</div>';
}
function p8OrtuGambar(box, siswa, jawab, waktu) {
  const isi = p8El('p8Isi'), badge = p8El('p8Badge'); if (!isi) return;
  const sudah = !!jawab;
  if (badge) { badge.textContent = sudah ? 'Sudah diisi' : 'Belum diisi'; badge.className = 'po-badge' + (sudah ? ' ok' : ' warn'); }
  const p = p8Periode();
  isi.innerHTML =
    '<p class="text-muted" style="font-size:12px;margin-bottom:6px;">Bantu madrasah memahami kebiasaan <strong>' + p8Esc(siswa.name) + '</strong> di rumah. Pilih yang paling sesuai dengan keseharian ananda. ' +
    'Tidak ada jawaban benar atau salah, dan hasilnya <strong>bukan nilai</strong>; hanya gambaran untuk kerja sama rumah dan madrasah.</p>' +
    '<p class="p8-legenda">Semester ' + p8Esc(p.sem || '-') + ' · TA ' + p8Esc(p.ta || '-') + '. <strong>Selalu</strong> = hampir setiap hari · <strong>Sering</strong> = lebih sering ya · <strong>Kadang</strong> = sesekali · <strong>Belum</strong> = belum pernah/belum terlihat.</p>' +
    (sudah ? '<div class="p8-dim"><div class="p8-dim-judul">📊 Gambaran terakhir</div>' + p8RingkasHtml(jawab) + '<div class="p8-dim-ket">Diisi ' + p8Esc((waktu || '').slice(0, 10)) + '. Bapak/Ibu boleh memperbarui jawaban di bawah.</div></div>' : '') +
    '<form id="p8Form" onsubmit="return false;">' + p8FormHtml(jawab) + '</form>' +
    '<div class="p8-progres" id="p8Progres"></div>' +
    '<button type="button" class="btn btn-primary" id="p8Simpan" style="font-size:12px;padding:7px 14px;">' + (sudah ? '💾 Perbarui Jawaban' : '📤 Kirim Angket') + '</button>' +
    '<div class="p8-status" id="p8Status"></div>';
  const form = p8El('p8Form');
  const hitung = () => {
    const n = form.querySelectorAll('input[type=radio]:checked').length;
    p8El('p8Progres').textContent = 'Terjawab ' + n + ' dari ' + P8_JUMLAH_BUTIR + ' pernyataan';
    form.querySelectorAll('.p8-belum').forEach(e => { if (form.querySelector('input[name="p8_' + e.dataset.p8Butir + '"]:checked')) e.classList.remove('p8-belum'); });
  };
  form.addEventListener('change', hitung); hitung();
  p8El('p8Simpan').addEventListener('click', () => p8OrtuSimpan(siswa));
}
function p8OrtuSimpan(siswa) {
  if (typeof isBusy === 'function' && isBusy('p8Simpan')) return;
  const form = p8El('p8Form'), status = p8El('p8Status'), btn = p8El('p8Simpan');
  const jawab = []; let kosong = null;
  for (let i = 0; i < P8_JUMLAH_BUTIR; i++) {
    const c = form.querySelector('input[name="p8_' + i + '"]:checked');
    if (!c) { if (kosong === null) kosong = i; form.querySelector('[data-p8-butir="' + i + '"]').classList.add('p8-belum'); jawab.push(null); } else jawab.push(Number(c.value));
  }
  const belum = jawab.filter(v => v === null).length;
  if (belum) {
    status.innerHTML = '<span class="p8-err">⚠️ Masih ada ' + belum + ' pernyataan yang belum dijawab (berwarna oranye).</span>';
    const el = form.querySelector('[data-p8-butir="' + kosong + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }
  const p = p8Periode();
  status.innerHTML = '<span class="text-muted">⏳ Menyimpan...</span>';
  if (typeof setBusy === 'function') setBusy('p8Simpan', btn);
  const rec = { siswaKey: siswa.key, siswaNama: siswa.name || '', kelas: siswa.kelas || '', tahunAjaran: p.ta, semester: p.sem, jawaban: jawab, waktuIsi: new Date().toISOString(), versi: 1 };
  db.ref('angket_profil/' + p8Key(siswa.key)).set(rec, err => {
    if (typeof clearBusy === 'function') clearBusy('p8Simpan', btn);
    if (err) { status.innerHTML = '<span class="p8-err">❌ Gagal menyimpan: ' + p8Esc(err.message) + '</span>'; return; }
    p8OrtuGambar(p8El('p8OrtuBox'), siswa, jawab, rec.waktuIsi);
    const st = p8El('p8Status'); if (st) st.innerHTML = '<span class="p8-ok">✅ Tersimpan, terima kasih atas partisipasinya!</span>';
    if (typeof toast === 'function') toast('✅ Angket tersimpan');
  });
}

// ============================================================
// GURU / WALI KELAS / ADMIN / KEPSEK
// ============================================================
function angketProfilCanAccess() {
  try { return !!((typeof isAdmin === 'function' && isAdmin()) || (typeof isKepsek === 'function' && isKepsek()) || (typeof isWaliKelasAssigned === 'function' && isWaliKelasAssigned())); }
  catch (e) { return false; }
}
let p8Guru = { kelas: '', rekap: {}, siswa: [], token: 0 };
function setupAngketProfilPage() {
  const area = p8El('angketProfilArea'); if (!area) return;
  p8PasangCss();
  if (!angketProfilCanAccess()) { area.innerHTML = '<p class="text-muted">Halaman ini untuk Admin, Kepala Madrasah, dan wali kelas.</p>'; return; }
  const kelasList = (typeof siswaScopeKelas === 'function' ? siswaScopeKelas() : []).slice();
  if (!kelasList.length) { area.innerHTML = '<p class="text-muted">Belum ada kelas yang bisa ditampilkan.</p>'; return; }
  const p = p8Periode();
  const pilih = kelasList.includes(p8Guru.kelas) ? p8Guru.kelas : kelasList[0];
  area.innerHTML =
    '<div class="p8-kontrol">' +
      '<select id="p8Kelas" class="field" style="max-width:200px;">' + kelasList.map(k => '<option value="' + p8Esc(k) + '"' + (k === pilih ? ' selected' : '') + '>' + p8Esc(k) + '</option>').join('') + '</select>' +
      '<button type="button" class="btn btn-soft" id="p8Segarkan">🔄 Segarkan</button>' +
      '<button type="button" class="btn btn-soft" id="p8Unduh">⬇️ Unduh CSV</button>' +
    '</div>' +
    '<p class="text-muted" style="font-size:12px;">Semester ' + p8Esc(p.sem || '-') + ' · TA ' + p8Esc(p.ta || '-') + '. Skala 1,0–4,0 (rata-rata jawaban orang tua per dimensi). ' +
    'Ini laporan mandiri orang tua tentang kebiasaan di rumah; gunakan sebagai gambaran dan bahan diskusi, bukan nilai.</p>' +
    '<div id="p8Hasil"><p class="text-muted" style="text-align:center;padding:16px;">⏳ Memuat...</p></div><div id="p8Detail"></div>';
  p8El('p8Kelas').addEventListener('change', () => p8GuruMuat(p8El('p8Kelas').value));
  p8El('p8Segarkan').addEventListener('click', () => p8GuruMuat(p8El('p8Kelas').value));
  p8El('p8Unduh').addEventListener('click', p8Unduh);
  p8GuruMuat(pilih);
}
function p8SiswaKelas(kelas) {
  const daftar = (typeof allSiswa !== 'undefined' && Array.isArray(allSiswa)) ? allSiswa.filter(s => s.kelas === kelas) : [];
  const urut = typeof COLLATOR_ID !== 'undefined' ? (a, b) => COLLATOR_ID.compare(a.name || '', b.name || '') : (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
  return daftar.sort(urut);
}
function p8GuruMuat(kelas) {
  const hasil = p8El('p8Hasil'); if (!hasil) return;
  const my = ++p8Guru.token;
  p8Guru.kelas = kelas; p8Guru.siswa = p8SiswaKelas(kelas);
  hasil.innerHTML = '<p class="text-muted" style="text-align:center;padding:16px;">⏳ Memuat...</p>';
  const d = p8El('p8Detail'); if (d) d.innerHTML = '';
  const p = p8Periode();
  db.ref('angket_profil').orderByChild('kelas').equalTo(kelas).once('value').then(snap => {
    if (my !== p8Guru.token) return;
    const rekap = {};
    snap.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === p.ta && v.semester === p.sem && v.siswaKey && Array.isArray(v.jawaban)) rekap[v.siswaKey] = v; });
    p8Guru.rekap = rekap;
    p8GuruGambar();
  }).catch(err => {
    if (my !== p8Guru.token) return;
    hasil.innerHTML = '<p class="p8-err" style="font-size:13px;">Gagal memuat: ' + p8Esc((err && err.message) || err) + '</p>';
  });
}
function p8Wa(nomor, pesan) {
  let n = String(nomor || '').replace(/[^0-9]/g, '');
  if (n.indexOf('0') === 0) n = '62' + n.slice(1); else if (n.indexOf('62') !== 0) n = '62' + n;
  if (n.length < 10 || n.length > 15) { if (typeof toast === 'function') toast('Nomor WhatsApp wali tidak valid.', true); return; }
  window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(pesan), '_blank');
}
function p8TeksIngat(kelas, nama) {
  const p = p8Periode();
  return "Assalamu'alaikum Bapak/Ibu " + (nama ? 'wali dari ananda ' + nama : 'wali murid kelas ' + kelas) + '. Mohon kesediaannya mengisi Angket Profil Lulusan (kebiasaan ananda di rumah) semester ' +
    (p.sem || '-') + ' TA ' + (p.ta || '-') + ' lewat Portal Orang Tua SiMamba, menu Angket Profil Lulusan (sekitar 10 menit). Terima kasih.';
}
function p8GuruGambar() {
  const hasil = p8El('p8Hasil'); if (!hasil) return;
  const { siswa, rekap } = p8Guru;
  if (!siswa.length) { hasil.innerHTML = '<p class="text-muted" style="text-align:center;padding:16px;">Belum ada siswa di kelas ini.</p>'; return; }
  const skorSiswa = siswa.map(s => rekap[s.key] ? p8SkorDimensi(rekap[s.key].jawaban) : null);
  const terisi = skorSiswa.filter(Boolean).length;
  const rataDim = P8_DIMENSI.map((_, i) => p8Rata(skorSiswa.filter(Boolean).map(r => r[i])));
  const rataAll = p8Rata(rataDim);
  const urut = rataDim.map((v, i) => ({ v, i })).filter(x => x.v !== null).sort((a, b) => a.v - b.v);
  const fokus = urut.slice(0, 2).map(x => p8Esc(P8_DIMENSI[x.i].nama) + ' (' + p8F(x.v) + ')').join(' dan ');
  let h = '<div class="p8-ringkas">' +
    '<div class="p8-kotak"><b>' + terisi + ' / ' + siswa.length + '</b><small>orang tua sudah mengisi (' + Math.round((terisi / siswa.length) * 100) + '%)</small></div>' +
    '<div class="p8-kotak"><b>' + p8F(rataAll) + '</b><small>rata-rata kelas · ' + p8Kategori(rataAll).teks + '</small></div>' +
    '<div class="p8-kotak"><b style="font-size:13px;">' + (fokus || '-') + '</b><small>dimensi dengan rata-rata terendah</small></div></div>';
  if (!terisi) h += '<p class="text-muted" style="font-size:13px;">Belum ada orang tua yang mengisi di kelas ini. Ingatkan lewat grup wali kelas agar membuka Portal Orang Tua → Angket 8 Profil Lulusan.</p>';
  const belumList = siswa.filter(s => !rekap[s.key]);
  if (belumList.length) {
    h += '<details style="margin:10px 0;"><summary style="cursor:pointer;font-size:13px;"><b>Belum mengisi (' + belumList.length + ')</b></summary>' +
      '<ul style="font-size:12px;margin:6px 0 6px 18px;">' + belumList.map((s, i) => {
        const wa = String(s.noWaOrtu || '').replace(/[^0-9]/g, '');
        return '<li style="margin-bottom:6px;">' + p8Esc(s.name || '-') + ' ' + (wa.length >= 9 ?
          '<button type="button" class="btn btn-soft" data-p8-wa="' + i + '" style="padding:2px 10px;font-size:12px;">Ingatkan via WA</button>' :
          '<span style="color:#9ca3af;">(nomor WA belum diisi)</span>') + '</li>';
      }).join('') + '</ul><button type="button" class="btn btn-soft" id="p8SalinIngat">Salin pesan untuk grup kelas</button> <button type="button" class="btn btn-soft" id="p8CsvBelum">Unduh daftar (CSV)</button></details>';
  } else if (terisi) h += '<p style="font-size:12px;color:#047857;margin:8px 0;">Semua orang tua di kelas ini sudah mengisi. Alhamdulillah.</p>';
  h += '<div class="p8-tabel-wrap"><table class="p8-tabel"><thead><tr><th>No</th><th>Nama</th>' +
    P8_DIMENSI.map((d, i) => '<th title="' + p8Esc(d.nama) + '">' + d.ikon + '<br>D' + (i + 1) + '</th>').join('') + '<th>Rata²</th></tr></thead><tbody>';
  siswa.forEach((s, n) => {
    const sk = skorSiswa[n];
    h += '<tr><td>' + (n + 1) + '</td><td class="p8-nama">' + (sk ? '<button type="button" class="p8-lihat" data-p8-lihat="' + p8Esc(s.key) + '">' + p8Esc(s.name || '-') + '</button>' : p8Esc(s.name || '-')) + '</td>' +
      P8_DIMENSI.map((_, i) => '<td class="' + p8Kategori(sk ? sk[i] : null).kelas + '">' + (sk ? p8F(sk[i]) : '·') + '</td>').join('') +
      '<td class="' + p8Kategori(sk ? p8Rata(sk) : null).kelas + '"><b>' + (sk ? p8F(p8Rata(sk)) : '·') + '</b></td></tr>';
  });
  h += '</tbody><tfoot><tr><td colspan="2">Rata-rata kelas</td>' + rataDim.map(v => '<td class="' + p8Kategori(v).kelas + '">' + p8F(v) + '</td>').join('') + '<td class="' + p8Kategori(rataAll).kelas + '">' + p8F(rataAll) + '</td></tr></tfoot></table></div>' +
    '<p class="text-muted" style="font-size:11px;margin-top:8px;">' +
    P8_DIMENSI.map((d, i) => 'D' + (i + 1) + ' = ' + p8Esc(d.nama)).join(' · ') + '.<br>Warna: ' +
    '<span class="p8-lencana p8-sb">≥ 3,5 Sangat Baik</span> <span class="p8-lencana p8-b">≥ 2,75 Baik</span> <span class="p8-lencana p8-c">≥ 2,0 Cukup</span> <span class="p8-lencana p8-k">&lt; 2,0 Perlu Dibimbing</span>. Ketuk nama siswa untuk melihat rinciannya.</p>';
  hasil.innerHTML = h;
  hasil.querySelectorAll('[data-p8-wa]').forEach(b => b.addEventListener('click', () => {
    const s = belumList[parseInt(b.getAttribute('data-p8-wa'), 10)]; if (s) p8Wa(s.noWaOrtu, p8TeksIngat(p8Guru.kelas, s.name || ''));
  }));
  const cBel = p8El('p8CsvBelum');
  if (cBel) cBel.addEventListener('click', () => {
    const p = p8Periode(), q = v => { let t = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
    const baris = [['No', 'Nama', 'Kelas', 'Tahun Ajaran', 'Semester', 'Status']].concat(belumList.map((s, i) => [i + 1, s.name || '', p8Guru.kelas, p.ta, p.sem, 'Belum mengisi']));
    const csv = '\ufeff' + baris.map(r => r.map(q).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'angket-profil-belum-mengisi_' + String(p8Guru.kelas).replace(/\s+/g, '-') + '_' + String(p.ta).replace(/\//g, '-') + '_' + p.sem + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  const sIng = p8El('p8SalinIngat');
  if (sIng) sIng.addEventListener('click', () => {
    const t = p8TeksIngat(p8Guru.kelas, '') + (belumList.length ? ' Saat ini masih ada ' + belumList.length + ' dari ' + siswa.length + ' orang tua yang belum mengisi.' : '');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => { if (typeof toast === 'function') toast('Pesan pengingat disalin.'); }, () => { if (typeof toast === 'function') toast('Gagal menyalin pesan.', true); });
    else if (typeof toast === 'function') toast('Peramban tidak mendukung salin otomatis.', true);
  });
  hasil.querySelectorAll('[data-p8-lihat]').forEach(b => b.addEventListener('click', () => p8LihatDetail(b.getAttribute('data-p8-lihat'))));
}
function p8LihatDetail(siswaKey) {
  const box = p8El('p8Detail'); if (!box) return;
  const s = p8Guru.siswa.find(x => x.key === siswaKey), rec = p8Guru.rekap[siswaKey];
  if (!s || !rec) { box.innerHTML = ''; return; }
  const skor = p8SkorDimensi(rec.jawaban);
  const label = { 4: 'Selalu', 3: 'Sering', 2: 'Kadang', 1: 'Belum' };
  let h = '<div class="card" style="margin-top:12px;"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><h4 style="margin:0;font-size:14px;">📋 ' + p8Esc(s.name || '-') + ' <span class="text-muted" style="font-weight:400;font-size:11px;">diisi ' + p8Esc((rec.waktuIsi || '').slice(0, 10)) + '</span></h4><button type="button" class="btn btn-soft" id="p8TutupDetail" style="font-size:12px;padding:4px 10px;">Tutup</button></div>';
  P8_DIMENSI.forEach((d, di) => {
    const k = p8Kategori(skor[di]);
    h += '<div class="p8-dim" style="margin-top:8px;"><div class="p8-dim-judul">' + d.ikon + ' ' + p8Esc(d.nama) + ' <span class="p8-lencana ' + k.kelas + '">' + p8F(skor[di]) + ' · ' + k.teks + '</span></div>';
    d.butir.forEach((t, bi) => {
      const v = Number(rec.jawaban[di * 3 + bi]);
      h += '<div class="p8-baris"><span style="flex:1;">' + p8Esc(t) + '</span><span class="p8-lencana ' + p8Kategori(v >= 1 ? v : null).kelas + '">' + (label[v] || '-') + '</span></div>';
    });
    h += '</div>';
  });
  box.innerHTML = h + '</div>';
  p8El('p8TutupDetail').addEventListener('click', () => { box.innerHTML = ''; });
  if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function p8Unduh() {
  const { siswa, rekap, kelas } = p8Guru;
  if (!siswa.length) { if (typeof toast === 'function') toast('Belum ada data untuk diunduh.', true); return; }
  const p = p8Periode();
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const kepala = ['No', 'Nama', 'Kelas', 'Tahun Ajaran', 'Semester', 'Sudah Mengisi'].concat(P8_DIMENSI.map(d => d.nama), ['Rata-rata'], Array.from({ length: P8_JUMLAH_BUTIR }, (_, i) => 'J' + (i + 1)));
  const baris = siswa.map((s, n) => {
    const r = rekap[s.key], sk = r ? p8SkorDimensi(r.jawaban) : null;
    return [n + 1, s.name || '', kelas, p.ta, p.sem, r ? 'Ya' : 'Belum']
      .concat(P8_DIMENSI.map((_, i) => sk ? p8F(sk[i]) : ''), [sk ? p8F(p8Rata(sk)) : ''], Array.from({ length: P8_JUMLAH_BUTIR }, (_, i) => r ? r.jawaban[i] : ''));
  });
  const csv = '\ufeff' + [kepala].concat(baris).map(r => r.map(q).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'angket-profil-lulusan_' + String(kelas).replace(/\s+/g, '-') + '_' + String(p.ta).replace(/\//g, '-') + '_' + p.sem + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ============================================================
// BAGIAN 3 - HALAMAN "ANGKET" BERTAB (Kurikulum | Profil Lulusan)
// Menu sidebar data-page="angket" -> app.js memanggil setupAngketPage().
// Tab Profil Lulusan hanya muncul untuk Admin, Kepala Madrasah, dan wali kelas (angketProfilCanAccess).
// Guru biasa hanya melihat Angket Kurikulum, tanpa bar tab.
// ============================================================
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function bolehProfil() { return typeof angketProfilCanAccess === 'function' && angketProfilCanAccess(); }

  function setupAngketPage() {
    var bar = el('angketTabBar'), k = el('angketKurikulumArea'), p = el('angketProfilArea');
    if (!bar || !k || !p) return;
    var ada = bolehProfil();
    var terisi = { kurikulum: false, profil: false };   // isi tiap tab dibuat sekali per pembukaan halaman, jawaban yang belum terkirim tidak hilang saat pindah tab

    bar.innerHTML = '<button type="button" class="akq-tab on" data-angket-tab="kurikulum">📝 Kurikulum</button>' +
      (ada ? '<button type="button" class="akq-tab" data-angket-tab="profil">🧭 Profil Lulusan</button>' : '');
    bar.classList.toggle('hidden', !ada);

    function tampil(tab) {
      if (tab === 'profil' && !bolehProfil()) tab = 'kurikulum';
      Array.prototype.forEach.call(bar.querySelectorAll('[data-angket-tab]'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-angket-tab') === tab);
      });
      k.classList.toggle('hidden', tab !== 'kurikulum');
      p.classList.toggle('hidden', tab !== 'profil');
      if (terisi[tab]) return;
      terisi[tab] = true;
      if (tab === 'kurikulum') { if (typeof setupAngketKurikulumPage === 'function') setupAngketKurikulumPage(); }
      else if (typeof setupAngketProfilPage === 'function') setupAngketProfilPage();
    }
    Array.prototype.forEach.call(bar.querySelectorAll('[data-angket-tab]'), function (b) {
      b.addEventListener('click', function () { tampil(b.getAttribute('data-angket-tab')); });
    });
    tampil('kurikulum');
  }
  window.setupAngketPage = setupAngketPage;
})();
