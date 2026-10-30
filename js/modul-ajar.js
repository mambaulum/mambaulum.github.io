/* ============================================================
   MODUL PEMBELAJARAN (modul ajar) -- js/modul-ajar.js
   Dimuat SETELAH app.js & menu-hub.js. Modul mandiri seperti kas.js: halaman dibuat sendiri
   lewat JS, data dimuat sendiri (db.ref('modul_ajar')), tidak menyentuh loadAllData().
   Hubungan: Guru -> Mata Pelajaran -> Kelas -> Murid (jumlah siswa diambil dari allSiswa),
   dengan tombol pintas ke Absensi & Nilai kelas yang sama.
   Akses: Guru/Wali Kelas/Admin membuat & mengelola modul sendiri; Admin mengelola semua; Kepsek hanya melihat.
   Pembaruan (selaras KMA 1503 Tahun 2025): kolom Karakteristik Materi; Kesiapan Murid = format lengkap (opsional); Pendahuluan & Penutup = format minimum; saran
   Dimensi Profil Lulusan 2-3 hanya anjuran (tidak memblokir); Panca Cinta dikelompokkan (Sumber, Tanda, Tali Cinta); DPL & Panca Cinta
   terisi otomatis menurut mapel pada modul baru.
============================================================ */
(function () {
  'use strict';

  // Akses global eksternal (app.js) yang aman: tidak melempar ReferenceError bila belum terdefinisi.
  function madr() { return (typeof MADRASAH !== 'undefined' && MADRASAH) || {}; }
  function semAktif() { return (typeof currentSemesterAktif !== 'undefined' && currentSemesterAktif) || ''; }
  function taAktif() { return (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) || ''; }

  var PAGE = 'modul-ajar';
  var SECTIONS = [
    { k: 'cp',        t: 'Capaian Pembelajaran (CP)', ph: 'Terisi otomatis dari Referensi Kurikulum sesuai mapel & fase; bisa diedit…' },
    { k: 'tujuan',    t: 'Tujuan Pembelajaran (TP)', ph: 'Tuliskan tujuan pembelajaran (satu per baris): kompetensi + lingkup materi + konteks nilai Panca Cinta, mis. "… sebagai wujud cinta …"…', req: true },
    { k: 'pemantik',  t: 'Pertanyaan Pemantik',    ph: 'Pertanyaan pembuka untuk memancing rasa ingin tahu murid…' },
    { k: 'materiIsi', t: 'Materi Pembelajaran',    ph: 'Ringkasan materi, konsep utama, contoh…' },
    { k: 'aktivitas', t: 'Aktivitas Pembelajaran', ph: 'Kegiatan pendahuluan, inti, dan penutup…' },
    { k: 'kokurikuler', t: 'Kegiatan Kokurikuler', ph: 'Tema/projek kokurikuler yang terkait (jika ada)…' },
    { k: 'lkpd',      t: 'LKPD',                   ph: 'Lembar Kerja Peserta Didik: petunjuk dan soal/kegiatan…' },
    { k: 'media',     t: 'Media Pembelajaran',     ph: 'Alat peraga, gambar, video, slide, benda nyata…' },
    { k: 'asesmen',   t: 'Asesmen',                ph: 'Asesmen diagnostik, formatif, sumatif; teknik & instrumen…' },
    { k: 'tugas',     t: 'Tugas',                  ph: 'Tugas individu/kelompok, tugas rumah…' },
    { k: 'refleksi',  t: 'Refleksi',               ph: 'Refleksi guru dan murid setelah pembelajaran…' },
    { k: 'pengayaan', t: 'Pengayaan',              ph: 'Kegiatan untuk murid yang sudah mencapai tujuan…' },
    { k: 'remedial',  t: 'Remedial',               ph: 'Kegiatan untuk murid yang belum mencapai tujuan…' },
    { k: 'sumber',    t: 'Sumber Belajar',         ph: 'Buku, tautan, lingkungan sekitar, narasumber…' }
  ];
  var KOMPONEN = ['materiIsi', 'lkpd', 'media', 'asesmen', 'tugas', 'refleksi'];
  var TABS = [
    { id: 'daftar',   t: '📚 Daftar Modul' },
    { id: 'buat',     t: '➕ Buat Modul' },
    { id: 'komponen', t: '🧩 Komponen' },
    { id: 'favorit',  t: '⭐ Favorit' },
    { id: 'arsip',    t: '🗄️ Arsip' },
    { id: 'rekap',    t: '📊 Rekap' },
    { id: 'referensi', t: '🧭 Referensi' }
  ];

  // Delapan Dimensi Profil Lulusan & Panca Cinta (KBC) -- daftar nama baku, bukan isi CP/TP.
  var DPL = ['Keimanan dan Ketakwaan terhadap Tuhan YME', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi'];
  // Panca Cinta dikelompokkan menjadi tiga bagian (KMA 1503/2025 & Panduan KBC): Sumber Cinta, Tanda Cinta, Tali Cinta.
  var PANCA_GRUP = [
    { g: 'Sumber Cinta', ket: 'Allah dan Rasul-Nya sebagai asal cinta', items: ['Cinta kepada Allah dan Rasul-Nya'] },
    { g: 'Tanda Cinta',  ket: 'ilmu dan alam sebagai tanda kehadiran Allah', items: ['Cinta ilmu', 'Cinta lingkungan'] },
    { g: 'Tali Cinta',   ket: 'relasi dengan diri, sesama manusia, dan bangsa', items: ['Cinta diri dan sesama', 'Cinta tanah air'] }
  ];
  var PANCA = PANCA_GRUP.reduce(function (a, g) { return a.concat(g.items); }, []);
  var DPL_MAX = 3;   // SARAN jumlah Dimensi Profil Lulusan per modul (bukan batas resmi; panduan menyerahkan pilihan ke guru)
  // Label tampilan sesuai Panduan Pembelajaran dan Asesmen Madrasah 2025. Nilai tersimpan di Firebase TIDAK diubah (kunci lama tetap).
  var PANCA_LABEL = { 'Cinta kepada Allah dan Rasul-Nya': 'Cinta Allah dan Rasul-Nya', 'Cinta ilmu': 'Cinta Ilmu', 'Cinta lingkungan': 'Cinta Lingkungan',
    'Cinta diri dan sesama': 'Cinta Diri dan Sesama Manusia', 'Cinta tanah air': 'Cinta Tanah Air' };
  function labelPanca(p) { return PANCA_LABEL[p] || p; }
  function grupPancaDari(p) {
    var r = PANCA_GRUP.filter(function (g) { return g.items.indexOf(p) !== -1; })[0];
    return r ? r.g : '';
  }
  // Teks Panca Cinta terkelompok untuk cetak: "Sumber Cinta: …" per baris (hanya kelompok yang ada isinya).
  function pancaGrupText(pc) {
    pc = pc || [];
    return PANCA_GRUP.map(function (g) {
      var it = g.items.filter(function (x) { return pc.indexOf(x) !== -1; });
      return it.length ? g.g + ': ' + it.map(labelPanca).join(', ') : '';
    }).filter(Boolean).join('\n');
  }
  // Profil per mapel: saran DPL (maks. 3), Panca Cinta, dan karakteristik materi. Pencocokan memakai nama mapel; urutan penting
  // (Bahasa Arab / SKI dicek sebelum Bahasa Indonesia / Seni). Hanya saran awal; guru bebas mengubahnya.
  var D = { iman: DPL[0], warga: DPL[1], nalar: DPL[2], kreatif: DPL[3], kolab: DPL[4], mandiri: DPL[5], sehat: DPL[6], komun: DPL[7] };
  var P = { allah: PANCA[0], ilmu: PANCA[1], lingk: PANCA[2], sesama: PANCA[3], tanah: PANCA[4] };
  var MAPEL_PROFIL = [
    { re: /arab/i, dpl: [D.komun, D.kolab, D.iman], panca: [P.ilmu, P.sesama],
      jenis: 'keterampilan berbahasa (istima’, kalam, qira’ah, kitabah) disertai kosakata (mufradat) dan pola kalimat tentang {M}',
      ciri: 'bersifat keterampilan dan bertahap sehingga perlu latihan berulang',
      cara: 'drill, percakapan berpasangan, permainan kosakata, dan penugasan membaca/menulis sederhana' },
    { re: /qur.?an|hadis|hadits/i, dpl: [D.iman, D.nalar, D.mandiri], panca: [P.allah, P.ilmu],
      jenis: 'bacaan, hafalan, dan pemahaman pesan pokok {M}',
      ciri: 'menuntut ketepatan makhraj dan tajwid serta pembiasaan mengamalkan pesannya',
      cara: 'talaqqi, pengulangan bersama, hafalan bertahap, dan diskusi pesan pokok' },
    { re: /akidah|akhlak/i, dpl: [D.iman, D.warga, D.kolab], panca: [P.allah, P.sesama],
      jenis: 'konsep keimanan dan nilai (afektif) yang diwujudkan dalam akhlak pada {M}',
      ciri: 'sebagian bersifat abstrak (keyakinan) sehingga perlu kisah dan keteladanan; hasilnya berupa sikap dan pembiasaan',
      cara: 'kisah keteladanan, diskusi nilai, pembiasaan, dan refleksi diri' },
    { re: /fikih|fiqih|fiqh/i, dpl: [D.iman, D.mandiri, D.sehat], panca: [P.allah, P.lingk],
      jenis: 'konsep hukum dan tata cara ibadah/muamalah (pengetahuan prosedural) pada {M}',
      ciri: 'terdiri atas ketentuan dan urutan tata cara yang dipahami lalu dipraktikkan',
      cara: 'demonstrasi, praktik bergantian, dan tanya jawab ketentuan' },
    { re: /sejarah kebudayaan|\bski\b/i, dpl: [D.iman, D.nalar, D.warga], panca: [P.ilmu, P.sesama],
      jenis: 'fakta sejarah (tokoh, peristiwa, tempat, waktu) dan ibrah dari {M}',
      ciri: 'bersifat naratif dan kronologis; pesan utamanya keteladanan',
      cara: 'bercerita, linimasa, peta konsep, dan dramatisasi singkat' },
    { re: /matematika/i, dpl: [D.nalar, D.kreatif, D.mandiri], panca: [P.ilmu, P.sesama],
      jenis: 'konsep dan prosedur (pengetahuan konseptual dan prosedural) tentang {M}',
      ciri: 'abstrak dan berjenjang: pemahaman materi sebelumnya menjadi prasyarat',
      cara: 'benda konkret atau visual, pemecahan masalah kontekstual, dan latihan bertahap' },
    { re: /\bipas?\b|sains|ilmu pengetahuan alam/i, dpl: [D.nalar, D.kreatif, D.kolab], panca: [P.ilmu, P.lingk],
      jenis: 'konsep ilmiah dan proses ilmiah (mengamati, menyelidiki, menyimpulkan) tentang {M}',
      ciri: 'berkaitan dengan gejala alam yang dapat diamati; memadukan konsep dan keterampilan proses',
      cara: 'pengamatan, percobaan sederhana, dan diskusi hasil' },
    { re: /indonesia/i, dpl: [D.komun, D.nalar, D.kreatif], panca: [P.ilmu, P.tanah],
      jenis: 'keterampilan berbahasa (menyimak, membaca, berbicara, menulis) dan teks pada {M}',
      ciri: 'bersifat keterampilan sehingga berkembang lewat latihan dan umpan balik',
      cara: 'membaca dan menyimak teks, berdiskusi, menulis, dan presentasi' },
    { re: /inggris/i, dpl: [D.komun, D.kolab, D.warga], panca: [P.ilmu, P.sesama],
      jenis: 'keterampilan berbahasa asing (listening, speaking, reading, writing) dan kosakata tentang {M}',
      ciri: 'bersifat keterampilan; membutuhkan paparan dan latihan berulang',
      cara: 'percakapan berpasangan, permainan kosakata, lagu/cerita pendek, dan penugasan' },
    { re: /\bips\b|ilmu pengetahuan sosial/i, dpl: [D.warga, D.nalar, D.kolab], panca: [P.tanah, P.sesama],
      jenis: 'fakta dan konsep sosial (ruang, waktu, masyarakat) tentang {M}',
      ciri: 'terkait kehidupan masyarakat sehingga mudah dikaitkan dengan lingkungan sekitar',
      cara: 'pengamatan lingkungan, diskusi kasus, peta/diagram, dan proyek sederhana' },
    { re: /pancasila|ppkn|kewarganegaraan/i, dpl: [D.warga, D.kolab, D.iman], panca: [P.tanah, P.sesama],
      jenis: 'nilai dan konsep kewargaan (afektif dan pengetahuan) pada {M}',
      ciri: 'berorientasi sikap dan pembiasaan hidup bersama',
      cara: 'diskusi kasus, simulasi, bermain peran, dan pembiasaan' },
    { re: /pjok|jasmani|penjas|olahraga/i, dpl: [D.sehat, D.kolab, D.mandiri], panca: [P.sesama, P.lingk],
      jenis: 'keterampilan gerak dan kebugaran (psikomotor) pada {M}',
      ciri: 'dipelajari lewat praktik langsung dengan memperhatikan keselamatan',
      cara: 'demonstrasi, praktik bertahap, permainan, dan umpan balik gerak' },
    { re: /seni|prakarya|budaya/i, dpl: [D.kreatif, D.kolab, D.komun], panca: [P.tanah, P.ilmu],
      jenis: 'keterampilan berkarya dan apresiasi pada {M}',
      ciri: 'terbuka terhadap ekspresi dan kreativitas; hasilnya berupa karya',
      cara: 'eksplorasi, praktik berkarya, pameran karya, dan apresiasi' },
    { re: /informatika|\btik\b|komputer/i, dpl: [D.nalar, D.kreatif, D.mandiri], panca: [P.ilmu, P.sesama],
      jenis: 'konsep komputasional dan keterampilan praktik tentang {M}',
      ciri: 'abstrak dan berjenjang, diperkuat dengan praktik langsung',
      cara: 'praktik terpandu, pemecahan masalah, dan proyek sederhana' }
  ];
  var PROFIL_UMUM = { dpl: [D.iman, D.nalar, D.kolab], panca: [P.ilmu, P.sesama],
    jenis: 'konsep dan fakta pokok tentang {M} beserta contoh penerapannya',
    ciri: 'dikembangkan dari yang konkret ke abstrak sesuai kesiapan murid',
    cara: 'pengamatan, diskusi, dan penugasan' };
  function profilMapel(mapel) {
    return MAPEL_PROFIL.filter(function (x) { return x.re.test(mapel || ''); })[0] || PROFIL_UMUM;
  }
  // Karakteristik Materi diisi otomatis dari mapel + materi + fase; guru tinggal menyesuaikan.
  function karakterMateri(mapel, M, kelas, fase) {
    var pr = profilMapel(mapel), f = String(fase || '').toUpperCase();
    var tingkat = (f === 'A' || f === 'B') ? 'cenderung konkret dan dekat dengan pengalaman sehari-hari murid (Fase ' + f + ')'
      : (f === 'C' || f === 'D') ? 'peralihan dari konkret ke abstrak sehingga perlu contoh nyata sebelum konsep (Fase ' + f + ')'
      : (f === 'E' || f === 'F') ? 'cenderung abstrak dan analitis sehingga perlu penalaran dan contoh kontekstual (Fase ' + f + ')'
      : 'disesuaikan dengan tingkat perkembangan murid';
    var sub = function (t) { return String(t).replace(/\{M\}/g, M); };
    return bullets([
      'Jenis materi: ' + sub(pr.jenis) + '.',
      'Ciri materi: ' + sub(pr.ciri) + '.',
      'Tingkat keabstrakan: ' + tingkat + '.',
      'Cara belajar yang sesuai: ' + sub(pr.cara) + '.',
      'Keterkaitan: ' + M + ' (' + mapel + ', Kelas ' + kelas + ') dikaitkan dengan pengalaman dan lingkungan nyata murid agar bermakna. (Contoh awal; sesuaikan dengan materi Anda.)'
    ]);
  }
  function pancaChecks(sel) {
    return PANCA_GRUP.map(function (g) {
      return '<div style="margin-top:6px;"><div style="font-weight:600;font-size:13px;color:#065f46;">' + esc(g.g) +
        ' <span class="text-muted" style="font-weight:400;">— ' + esc(g.ket) + '</span></div>' + checks('mpf-panca', g.items, sel) + '</div>';
    }).join('');
  }

  // ---- Rencana Pembelajaran Mendalam (RPM): bidang tambahan di atas modul yang sudah ada ----
  // lengkap:true = hanya tampil di form & tercetak bila "format lengkap" dicentang. Disimpan datar (string) di node modul.
  var RPM_FIELDS = [
    { g: 'Identifikasi', k: 'rpmKesiapan', t: 'Kesiapan Murid', lengkap: true, opsional: true, ph: 'Kondisi awal murid: pengetahuan prasyarat, minat, gaya belajar, kebutuhan khusus…' },
    { g: 'Identifikasi', k: 'rpmKarakter', t: 'Karakteristik Materi', opsional: true, ph: 'Sifat materi: jenis pengetahuan (fakta/konsep/prosedur/nilai), tingkat keabstrakan, cara belajar yang cocok… (terisi otomatis dari materi dan mapel)' },
    { g: 'Identifikasi', k: 'rpmIntegrasiKbc', t: 'Materi Integrasi KBC', ph: 'Materi Panca Cinta yang dikaitkan dengan materi pelajaran (pilih yang ada benang merahnya)…', rows: 2 },
    { g: 'Desain Pembelajaran', k: 'rpmLintas', t: 'Lintas Disiplin Ilmu', lengkap: true, ph: 'Mapel/disiplin lain yang dikaitkan pada topik ini…', rows: 2 },
    { g: 'Desain Pembelajaran', k: 'rpmPedagogis', t: 'Praktik Pedagogis', ph: 'Strategi/model yang dipakai (jika kosong, saat cetak diambil dari Model/Metode/Pendekatan)…', rows: 2 },
    { g: 'Desain Pembelajaran', k: 'rpmLingkungan', t: 'Lingkungan Pembelajaran', ph: 'Ruang fisik/virtual & budaya kelas yang aman, nyaman, ramah, menyenangkan, sejahtera…', rows: 2 },
    { g: 'Desain Pembelajaran', k: 'rpmKemitraan', t: 'Kemitraan Pembelajaran', lengkap: true, ph: 'Pihak yang dilibatkan: orang tua, narasumber, komunitas, guru lain…', rows: 2 },
    { g: 'Desain Pembelajaran', k: 'rpmDigital', t: 'Pemanfaatan Digital', lengkap: true, ph: 'Perangkat/aplikasi/sumber digital yang dipakai…', rows: 2 },
    { g: 'Pengalaman Belajar', k: 'rpmPendahuluan', t: 'Pendahuluan', ph: 'Pembukaan: doa, apersepsi, pemantik, penyampaian tujuan…' },
    { g: 'Pengalaman Belajar', k: 'rpmMemahami', t: 'Memahami', ph: 'Tulis prinsip yang dipakai (berkesadaran, bermakna, dan/atau menggembirakan), lalu kegiatan murid membangun pemahaman konsep; sisipkan Panca Cinta…' },
    { g: 'Pengalaman Belajar', k: 'rpmMengaplikasi', t: 'Mengaplikasi', ph: 'Tulis prinsip yang dipakai, lalu kegiatan murid menerapkan pemahaman dalam tugas/proyek/kasus nyata…' },
    { g: 'Pengalaman Belajar', k: 'rpmMerefleksi', t: 'Merefleksi', ph: 'Tulis prinsip yang dipakai, lalu kegiatan murid merenungkan proses & hasil belajarnya…' },
    { g: 'Pengalaman Belajar', k: 'rpmPenutup', t: 'Penutup', ph: 'Kesimpulan, umpan balik, tindak lanjut, doa penutup…' },
    { g: 'Asesmen', k: 'rpmAsesAwal', t: 'Asesmen Awal', ph: 'Teknik/instrumen asesmen diagnostik di awal pembelajaran…', rows: 2 },
    { g: 'Asesmen', k: 'rpmAsesProses', t: 'Asesmen Proses', ph: 'Teknik/instrumen asesmen formatif selama pembelajaran…', rows: 2 },
    { g: 'Asesmen', k: 'rpmAsesAkhir', t: 'Asesmen Akhir', ph: 'Teknik/instrumen asesmen sumatif di akhir pembelajaran…', rows: 2 },
    { g: 'Asesmen', k: 'rpmRubrik', t: 'Rubrik dan Kriteria Penilaian', lengkap: true, ph: 'Rubrik penilaian beserta kriteria ketercapaian…', rows: 4 },
    { g: 'Asesmen', k: 'rpmKktp', t: 'KKTP (Kriteria Ketercapaian Tujuan Pembelajaran)', lengkap: true, ph: 'Batas/kriteria murid dinyatakan mencapai tiap tujuan pembelajaran; sesuaikan dengan kesepakatan madrasah…', rows: 4 }
  ];
  // Daftar kolom RPM yang masih kosong (minimum selalu dicek; kolom lengkap hanya bila modul memakai format lengkap).
  function rpmKurang(m) {
    var out = [], L = rpmLengkap(m);
    if (!(m.dpl && m.dpl.length)) out.push('Dimensi Profil Lulusan');
    if (!(m.pancaCinta && m.pancaCinta.length)) out.push('Panca Cinta');
    RPM_FIELDS.forEach(function (f) {
      if (f.opsional) return;   // Kesiapan Murid (opsional menurut panduan) dan Karakteristik Materi (tambahan) tidak dihitung kurang
      if (f.k === 'rpmPedagogis' && (m.model || m.metode || m.pendekatan)) return;   // cetak memakai Model/Metode/Pendekatan sebagai cadangan
      if ((L || !f.lengkap) && !String(m[f.k] || '').trim()) out.push(f.t + (f.lengkap ? ' (lengkap)' : ''));
    });
    return out;
  }
  function rpmLengkap(m) { return !!m && (m.rpmLengkap === '1' || m.rpmLengkap === true); }

  var REF_MIN = 20; // panjang minimum CP/TP (bila diisi) pada referensi kurikulum
  var data = [], loaded = false, loading = false, loadErr = '';
  var refs = [], refLoaded = false, refLoading = false, refErr = '';
  var refMode = 'list', refEditKey = null, refParsed = null, refPaste = '';
  var formRef = null, lastFill = { cp: '', tp: '' };
  // Pilihan sumber CP/TP di formulir: 'auto' (Admin dulu, bila kosong Bank TP), 'admin' (hanya Referensi Admin), 'bank' (hanya Bank TP aplikasi).
  var refSumber = 'auto';
  var tab = 'daftar', editingKey = null, komp = 'materiIsi', rekapOpen = '';
  var filt = { q: '', mapel: '', kelas: '', semester: '', pers: '' };
  var root = null;
  var gen = 0; // naik tiap resetState(); callback load yang datang terlambat (milik sesi lama) diabaikan

  /* ---------- util ---------- */
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function sec(k) { return SECTIONS.filter(function (s) { return s.k === k; })[0]; }
  function canCreate() { return !!currentUser && (isAdmin() || isTeacher() || (typeof isWaliKelas === 'function' && isWaliKelas())); }
  function canView() { return canCreate() || isKepsek(); }
  // v15: pemilik dikenali dari KUNCI guru. Dulu nama DAN kunci harus sama persis, sehingga modul "hilang" dari akun guru
  // bila nama guru diedit / kunci akun berubah / modul lama tanpa ownerKey. Sekarang: kunci sama = pemilik; bila kunci pemilik
  // sudah tidak ada di daftar guru (akun dibuat ulang) atau modul lama tanpa ownerKey, dicocokkan lewat nama (spasi/huruf besar diabaikan).
  function normNama(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function isOwner(m) {
    if (!currentUser || !m) return false;
    var mk = m.ownerKey || '', uk = currentUser.key || '';
    if (mk && uk) {
      if (mk === uk) return true;
      var masihAda = (typeof allGuru !== 'undefined' && allGuru ? allGuru : []).some(function (g) { return g && g.key === mk; });
      if (masihAda) return false;            // pemilik lain yang masih aktif: jangan dicocokkan lewat nama
    }
    var n = normNama(m.ownerName);
    return !!n && n === normNama(currentUser.name);
  }
  function canEdit(m) { return isAdmin() || (canCreate() && isOwner(m)); }

  /* ---------- persetujuan kepala madrasah ----------
     Field terpisah dari status (aktif/arsip): persetujuan = draf | diajukan | disetujui | ditolak.
     Modul lama tanpa field ini dianggap 'draf'. Saat 'diajukan' isi modul dikunci sampai ditinjau;
     mengubah modul 'disetujui' mengembalikannya ke 'draf'. Ini hanya penjaga sisi klien (seperti fitur lain). */
  var PERS = {
    draf:      { t: '📝 Draf',                 bg: '#f3f4f6', fg: '#374151' },
    diajukan:  { t: '⏳ Menunggu persetujuan', bg: '#fef3c7', fg: '#92400e' },
    disetujui: { t: '✅ Disetujui',            bg: '#d1fae5', fg: '#065f46' },
    ditolak:   { t: '❌ Ditolak',              bg: '#fee2e2', fg: '#991b1b' }
  };
  function pers(m) { return (m && PERS[m.persetujuan]) ? m.persetujuan : 'draf'; }
  function canApprove() { return !!currentUser && (isAdmin() || isKepsek()); }
  function persBadge(m) {
    var p = PERS[pers(m)];
    return '<span class="mp-meta" style="background:' + p.bg + ';color:' + p.fg + ';font-weight:600;">' + p.t + '</span>';
  }
  function persInfoHtml(m) {
    var st = pers(m), out = '';
    if (st === 'disetujui') out += 'Disetujui ' + (m.persetujuanRole === 'Admin' ? 'atas nama' : 'oleh') + ' <b>' + esc(m.persetujuanOleh || '-') + '</b>' + (m.persetujuanRole === 'Admin' ? ' (diinput Admin)' : (m.persetujuanRole ? ' (' + esc(m.persetujuanRole) + ')' : '')) + ' · ' + tglIso(m.persetujuanAt);
    if (st === 'diajukan') out += 'Diajukan ' + tglIso(m.diajukanAt) + '. Modul dikunci sampai ditinjau Kepala Madrasah.';
    if (st === 'ditolak') out += 'Ditolak oleh <b>' + esc(m.persetujuanOleh || '-') + '</b> · ' + tglIso(m.persetujuanAt) + '. Perbaiki lalu ajukan ulang.';
    if (m.catatanKepsek && (st === 'ditolak' || st === 'disetujui')) out += '<br>💬 Catatan: ' + nl2br(m.catatanKepsek);
    return out ? '<div class="mp-rel" style="margin-top:6px;">' + out + '</div>' : '';
  }
  // Ubah status persetujuan dengan transaction pada node modul: hanya lolos bila status saat ini masih salah satu dari `dari`
  // (mencegah dua orang bertindak bersamaan / data basi di layar). patch = field yang ikut ditulis.
  function transisi(key, dari, ke, patch, okMsg, logAksi, btn) {
    var m = byKey(key); if (!m) return;
    if (!isReallyOnline()) return toast('Perlu koneksi internet.', true);
    if (isBusy('persModul')) return toast('Sedang memproses…', false, 1500);
    setBusy('persModul', btn);
    db.ref('modul_ajar/' + key).transaction(function (cur) {
      // cur === null = cache lokal kosong/basi. null di sini nilai biasa ("tulis kosong"), BUKAN abort: server menolak karena
      // hash data tidak cocok lalu memanggil fungsi ini lagi dengan data asli. Hanya `return;` (undefined) yang membatalkan.
      if (cur === null) return cur;
      var st = PERS[cur.persetujuan] ? cur.persetujuan : 'draf';
      if (dari.indexOf(st) === -1) return;   // undefined = abort -> committed=false
      return Object.assign({}, cur, patch, { persetujuan: ke });
    }, function (err, committed, snap) {
      clearBusy('persModul', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      if (!committed) { toast('Status modul sudah berubah. Memuat ulang…', true, 4000); return load(true, function () { renderBody(); }); }
      if (!snap.exists()) { toast('Modul tidak ditemukan (mungkin sudah dihapus). Memuat ulang…', true, 4000); return load(true, function () { renderBody(); }); }
      var v = snap.val(); v.key = key; Object.assign(m, v);
      addLog(logAksi, judulModul(m)); toast(okMsg); kirimNotif(ke, m);
      if (tab === 'buat') { editingKey = null; tab = 'daftar'; render(); } else renderBody();
    }, false);
  }
  // Notifikasi in-app (notifications_v4). Kepsek/Admin memang melihat semua notifikasi, jadi target 'Kepala Madrasah'
  // (akun Kepsek tidak punya key). Guru dicocokkan lewat key atau nama, sama seperti v4LoadNotifications.
  function kirimNotif(ke, m) {
    try {
      if (typeof v4Notify !== 'function') return;
      var judul = judulModul(m) + ' (' + (m.kelas || '-') + ')', pemilik = m.ownerKey || m.ownerName;
      if (ke === 'diajukan') v4Notify('Modul ajar diajukan', (m.guru || m.ownerName || 'Guru') + ' mengajukan modul: ' + judul + '.', 'ACTION', 'Kepala Madrasah', 'MODUL_AJAR', m.key);
      else if (ke === 'disetujui') v4Notify('Modul ajar disetujui', judul + ' disetujui oleh ' + (m.persetujuanOleh || '-') + '.', 'SUCCESS', pemilik, 'MODUL_AJAR', m.key);
      else if (ke === 'ditolak') v4Notify('Modul ajar perlu diperbaiki', judul + ' dikembalikan. Catatan: ' + (m.catatanKepsek || '-'), 'ALERT', pemilik, 'MODUL_AJAR', m.key);
    } catch (e) { console.warn('[modul-ajar] notifikasi gagal', e); }
  }
  function aksiPersetujuan(act, key, btn) {
    var m = byKey(key); if (!m) return;
    var now = new Date().toISOString();
    if (act === 'ajukan') {
      if (!canEdit(m)) return toast('Hanya pemilik modul yang bisa mengajukan.', true);
      if (!m.materi || !m.tujuan) return toast('Lengkapi materi dan tujuan pembelajaran sebelum mengajukan.', true);
      var kurang = rpmKurang(m);
      var peringatan = kurang.length ? '⚠️ Kolom RPM berikut masih kosong:\n- ' + kurang.join('\n- ') + '\n\nTekan Batal untuk melengkapi dulu, atau OK untuk tetap mengajukan.\n\n' : '';
      if (!confirm(peringatan + 'Ajukan modul ini ke Kepala Madrasah?\nSetelah diajukan, modul dikunci sampai ditinjau.')) return;
      return transisi(key, ['draf', 'ditolak'], 'diajukan', { diajukanAt: now, catatanKepsek: null, persetujuanOleh: null, persetujuanRole: null, persetujuanAt: null },
        '📨 Modul diajukan ke Kepala Madrasah', 'ajukan_modul_ajar', btn);
    }
    if (!canApprove()) return toast('Hanya Kepala Madrasah atau Admin yang bisa menilai modul.', true);
    var role = isKepsek() ? 'Kepala Madrasah' : 'Admin';
    if (act === 'setujui') {
      // Persetujuan atas nama Kepala. Kepsek: nama Kepala dari data madrasah. Admin: nama Kepala terisi (boleh diganti), peran Admin tetap tercatat.
      var kpMadrasah = madr().kepala_sekolah || '';
      var atasNama = kpMadrasah || currentUser.name;
      if (!isKepsek()) {
        var jawab = prompt('Disetujui atas nama siapa? (Admin tetap tercatat sebagai yang menginput.)', kpMadrasah);
        if (jawab === null) return;
        atasNama = String(jawab).trim() || kpMadrasah || currentUser.name;
      }
      var cat = prompt('Catatan untuk guru (boleh dikosongkan):', '');
      if (cat === null) return;
      return transisi(key, ['diajukan'], 'disetujui', { persetujuanOleh: atasNama, persetujuanRole: role, persetujuanAt: now, catatanKepsek: cat.trim() || null },
        '✅ Modul disetujui', 'setujui_modul_ajar', btn);
    }
    if (act === 'tolak') {
      var alasan = prompt('Alasan penolakan / bagian yang perlu diperbaiki (wajib):', '');
      if (alasan === null) return;
      if (!alasan.trim()) return toast('Alasan penolakan wajib diisi agar guru tahu apa yang diperbaiki.', true);
      return transisi(key, ['diajukan'], 'ditolak', { persetujuanOleh: currentUser.name, persetujuanRole: role, persetujuanAt: now, catatanKepsek: alasan.trim() },
        '❌ Modul dikembalikan ke guru', 'tolak_modul_ajar', btn);
    }
  }
  function kelasBoleh() { return (isAdmin() || isKepsek()) ? KELAS_LIST.slice() : loaderScopeKelas(); }
  function faseDari(kelas) {
    var n = parseInt(String(kelas || '').replace(/\D/g, ''), 10);
    if (n >= 1 && n <= 2) return 'A';
    if (n >= 3 && n <= 4) return 'B';
    if (n >= 5 && n <= 6) return 'C';
    // Jenjang lanjutan (bila aplikasi dipakai multi-jenjang): SMP/MTs 7-9 = Fase D, SMA/MA 10 = Fase E, 11-12 = Fase F.
    if (n >= 7 && n <= 9) return 'D';
    if (n === 10) return 'E';
    if (n >= 11 && n <= 12) return 'F';
    return '';
  }
  function jumlahSiswa(kelas) {
    try { return (allSiswa || []).filter(function (s) { return s.kelas === kelas; }).length; } catch (e) { return 0; }
  }
  /* ---------- isian otomatis dari jadwal (allJadwal: kelas, hari, jam, mapel, guru, guruKey) ---------- */
  // Jadwal milik guru yang dipilih di form. Guru biasa: cocokkan guruKey (fallback nama utk baris lama tanpa guruKey).
  // Admin yang menyusun modul atas nama guru lain: cocokkan nama guru pada isian Nama Guru.
  // Satu hari mengajar = satu pertemuan; jumlah jam (JP) pada hari itu = panjang pertemuan.
  var MENIT_JP = 35;
  function jadwalOpsi() {
    var list = (typeof allJadwal !== 'undefined' && allJadwal) ? allJadwal : [];
    var nama = val('mpf-guru') || (currentUser && currentUser.name) || '';
    var sendiri = !!currentUser && nama === currentUser.name && !!currentUser.key;
    var boleh = kelasBoleh(), grup = {};
    list.forEach(function (j) {
      var cocok = sendiri ? (j.guruKey ? j.guruKey === currentUser.key : j.guru === nama) : j.guru === nama;
      if (!cocok || !j.kelas || !j.mapel || boleh.indexOf(j.kelas) === -1) return;
      var k = j.kelas + '||' + j.mapel;
      var g = grup[k] = grup[k] || { kelas: j.kelas, mapel: j.mapel, jp: 0, hari: {} };
      g.jp++; g.hari[j.hari || '-'] = (g.hari[j.hari || '-'] || 0) + 1;
    });
    return Object.keys(grup).map(function (k) {
      var g = grup[k], hs = Object.keys(g.hari);
      g.nHari = hs.length; g.jpMax = Math.max.apply(null, hs.map(function (h) { return g.hari[h]; }));
      return g;
    }).sort(function (a, b) { return (a.kelas + a.mapel).localeCompare(b.kelas + b.mapel); });
  }
  // Batas pilihan untuk guru biasa: Mapel hanya yang ada di jadwalnya. Bila jadwal guru belum diisi -> null (semua mapel tetap boleh dipilih,
  // dengan peringatan di bilah jadwal). Admin & Kepala Madrasah tidak dibatasi.
  function mapelBatas() {
    if (isAdmin() || isKepsek()) return null;
    var out = [];
    jadwalOpsi().forEach(function (o) { if (out.indexOf(o.mapel) === -1) out.push(o.mapel); });
    return out.length ? out.sort() : null;
  }
  // Isi ulang pilihan Kelas: guru hanya melihat kelas tempat ia mengajar mapel terpilih. semua=true -> tanpa batas mapel (dipakai sebelum mengisi dari jadwal).
  function batasiKelas(semua) {
    var k = $('mpf-kelas'); if (!k) return;
    var mp = val('mpf-mapel'), cur = k.value, allow = kelasBoleh();
    if (!semua && mp && mapelBatas()) {
      var ks = jadwalOpsi().filter(function (o) { return o.mapel === mp; }).map(function (o) { return o.kelas; });
      if (ks.length) allow = ks;
    }
    if (cur && allow.indexOf(cur) === -1) { if (editingKey) allow = allow.concat(cur); else cur = ''; }   // modul lama tetap utuh; modul baru: kelas tak cocok dikosongkan
    k.innerHTML = '<option value="">-- Pilih Kelas --</option>' + allow.map(function (x) { return '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    k.value = cur;
    if (!cur && $('mpf-fase') && !editingKey) $('mpf-fase').value = '';
  }
  function saranPertemuan(nHari) { return nHari ? Math.min(8, Math.max(3, nHari * 2)) : PERT_DEFAULT; }   // hari mengajar/minggu × 2 minggu
  function jadwalBarHtml() {
    var ops = jadwalOpsi();
    return '<div class="mp-refbar" style="margin-top:6px;"><select id="mpfJadwal" class="field" style="max-width:360px;">' +
      '<option value="">🗓️ Isi dari jadwal mengajar…</option>' +
      ops.map(function (o) { return '<option value="' + esc(o.kelas + '||' + o.mapel) + '" data-hari="' + o.nHari + '" data-jp="' + o.jpMax + '">' + esc(o.kelas + ' — ' + o.mapel + ' (' + o.nHari + ' hari · ' + o.jp + ' JP/minggu)') + '</option>'; }).join('') + '</select>' +
      '<div class="mp-rel" id="mpfJadwalInfo" style="margin:0;flex:1;">' + (ops.length ? 'Pilih untuk mengisi Kelas, Mapel, Fase, Alokasi Waktu, dan saran jumlah pertemuan.' : 'Belum ada jadwal untuk guru ini' + (isAdmin() || isKepsek() ? '. Minta Admin mengisi menu Jadwal.' : ', jadi semua mata pelajaran ditampilkan sementara. Minta Admin mengisi menu Jadwal agar pilihan dibatasi ke mapel yang Anda ajar.')) + '</div></div>';
  }
  function refreshJadwalOpsi() {
    var sel = $('mpfJadwal'); if (!sel) return;
    var b = document.createElement('div'); b.innerHTML = jadwalBarHtml();
    sel.parentNode.parentNode.replaceChild(b.firstChild, sel.parentNode);
  }
  function isiDariJadwal(v) {
    if (!v) return;
    var p = v.split('||'), kelas = p[0], mapel = p[1], opt = $('mpfJadwal').selectedOptions[0];
    var nHari = opt ? parseInt(opt.getAttribute('data-hari'), 10) || 0 : 0, jp = opt ? parseInt(opt.getAttribute('data-jp'), 10) || 0 : 0;
    var k = $('mpf-kelas'), mp = $('mpf-mapel'); if (!k || !mp) return;
    batasiKelas(true);
    k.disabled = false;   // dibuka dulu agar nilai & event bisa diterapkan; urutkanForm() menghitung ulang di akhir
    if (!Array.prototype.some.call(k.options, function (o) { return o.value === kelas; })) return toast('Kelas ' + kelas + ' tidak termasuk kelas yang Anda ampu.', true);
    if (!Array.prototype.some.call(mp.options, function (o) { return o.value === mapel; })) {
      var o = document.createElement('option'); o.value = mapel; o.textContent = mapel; mp.appendChild(o);
    }
    k.value = kelas; k.dispatchEvent(new Event('change'));   // memperbarui Fase, hubungan kelas, dan CP/TP dari referensi
    mp.value = mapel; mp.dispatchEvent(new Event('change'));
    var al = $('mpf-alokasi'); if (al && !al.value.trim() && jp) al.value = jp + ' × ' + MENIT_JP + ' menit';
    pertSaran = saranPertemuan(nHari); pertInfoRefresh();
    var rows = pertCollectRaw();   // baris yang belum disentuh disesuaikan dengan saran & alokasi baru
    if (rows.every(pertKosong)) { pertRender(pertSesuaikan(rows, pertSaran)); }
    urutkanForm(); refreshAcc();
    toast('🗓️ Terisi dari jadwal: ' + kelas + ' — ' + mapel + '. Saran ' + pertSaran + ' pertemuan.');
  }

  /* ---------- daftar pertemuan ----------
     modul.pertemuan = [{ topik, tanggal, alokasi, tujuan, aktivitas, asesmen }]. Bagian yang sama untuk semua pertemuan
     (CP, TP, materi, media, LKPD, dst.) tetap di level modul. Field lama `aktivitas` & `asesmen` di level modul TETAP ditulis
     (gabungan teks semua pertemuan) supaya tab Komponen, pencarian, dan modul lama yang belum punya pertemuan tetap terbaca. */
  var PERT_DEFAULT = 4, PERT_MAX = 10, pertSaran = 4;
  function fixPert(p) {
    p = p || {};
    return { topik: String(p.topik || ''), tanggal: String(p.tanggal || ''), alokasi: String(p.alokasi || ''),
             tujuan: String(p.tujuan || ''), aktivitas: String(p.aktivitas || ''), asesmen: String(p.asesmen || '') };
  }
  function pertKosong(p) { return !(p.topik.trim() || p.tanggal || p.tujuan.trim() || p.aktivitas.trim() || p.asesmen.trim()); }
  function pertSaved(m) {   // hanya pertemuan yang benar-benar tersimpan
    var a = m && m.pertemuan; if (!a) return [];
    if (!Array.isArray(a)) a = Object.keys(a).map(function (k) { return a[k]; });
    return a.map(fixPert);
  }
  function getPert(m) {   // tersimpan, atau 1 pertemuan dari aktivitas/asesmen modul lama
    var l = pertSaved(m);
    if (l.length) return l;
    return (m && (m.aktivitas || m.asesmen)) ? [fixPert({ aktivitas: m.aktivitas, asesmen: m.asesmen })] : [];
  }
  function normPert(list) {
    return (list || []).map(function (p) { return [p.topik, p.tanggal, p.alokasi, p.tujuan, p.aktivitas, p.asesmen].join('¦'); }).join('§');
  }
  function pertJudul(p, i) { return 'Pertemuan ' + (i + 1) + (p.topik ? ' — ' + p.topik : ''); }
  function pertRowHtml(p, i, open) {
    var fld = function (label, cls, html) { return '<div><label class="label">' + label + '</label>' + html + '</div>'; };
    var ta = function (cls, v, rows, ph) { return '<textarea class="field ' + cls + '" rows="' + rows + '" placeholder="' + esc(ph) + '">' + esc(v) + '</textarea>'; };
    return '<details class="mp-pert" data-i="' + i + '"' + (open ? ' open' : '') + ' style="border:1px solid #e5e7eb;border-radius:8px;margin:6px 0;padding:0 10px;background:#fafafa;">' +
      '<summary style="cursor:pointer;padding:8px 0;font-weight:600;font-size:13px;display:flex;justify-content:space-between;gap:8px;">' +
      '<span class="mp-pert-t">' + esc(pertJudul(p, i)) + '</span><span class="text-muted mp-pert-b" style="font-size:12px;font-weight:500;">' + (pertKosong(p) ? 'kosong' : '✓ terisi') + '</span></summary>' +
      '<div style="padding-bottom:10px;"><div class="grid-3">' +
        fld('Topik / sub-materi', '', '<input class="field mpp-topik" value="' + esc(p.topik) + '" placeholder="Contoh: Pengenalan alam sekitar">') +
        fld('Tanggal (opsional)', '', '<input type="date" class="field mpp-tanggal" value="' + esc(p.tanggal) + '">') +
        fld('Alokasi waktu', '', '<input class="field mpp-alokasi" value="' + esc(p.alokasi) + '" placeholder="Contoh: 2 × 35 menit">') +
      '</div>' +
      '<label class="label" style="margin-top:6px;">Tujuan pertemuan ini</label>' + ta('mpp-tujuan', p.tujuan, 2, 'Bagian dari Tujuan Pembelajaran yang dicapai pada pertemuan ini…') +
      '<label class="label" style="margin-top:6px;">Aktivitas pembelajaran</label>' + ta('mpp-aktivitas', p.aktivitas, 5, 'Pendahuluan, inti, dan penutup pertemuan ini…') +
      '<label class="label" style="margin-top:6px;">Asesmen</label>' + ta('mpp-asesmen', p.asesmen, 3, 'Asesmen diagnostik / formatif / sumatif untuk pertemuan ini…') +
      '<div class="mp-actions" style="margin-top:8px;"><button type="button" class="btn btn-soft mp-btn" data-mp="pertdup" data-i="' + i + '">Salin pertemuan</button>' +
      '<button type="button" class="btn btn-danger mp-btn" data-mp="pertdel" data-i="' + i + '">Hapus</button></div></div></details>';
  }
  function pertSectionHtml(list) {
    return '<div class="mp-rel" style="margin-bottom:6px;">Satu modul bisa berisi beberapa pertemuan. Saran: <b id="mpfPertSaran">' + pertSaran + '</b> pertemuan ' +
      '(hari mengajar per minggu × 2 minggu, min. 3 dan maks. 8; jika belum memilih jadwal, ' + PERT_DEFAULT + '). Tambah atau hapus sesuai kebutuhan.</div>' +
      '<div id="mpfPert">' + list.map(function (p, i) { return pertRowHtml(p, i, i === 0); }).join('') + '</div>' +
      '<div class="mp-actions"><button type="button" class="btn btn-primary mp-btn" data-mp="pertadd">＋ Tambah pertemuan</button>' +
      '<button type="button" class="btn btn-soft mp-btn" data-mp="pertsaran">Atur ke saran</button></div>';
  }
  function pertInfoRefresh() { var e = $('mpfPertSaran'); if (e) e.textContent = pertSaran; }
  function pertCollectRaw() {   // semua baris di layar (termasuk yang kosong), mengikuti urutan tampilan
    if (!root) return [];
    return Array.prototype.map.call(root.querySelectorAll('#mpfPert .mp-pert'), function (d) {
      var g = function (c) { var el = d.querySelector('.' + c); return el ? String(el.value || '').trim() : ''; };
      return fixPert({ topik: g('mpp-topik'), tanggal: g('mpp-tanggal'), alokasi: g('mpp-alokasi'), tujuan: g('mpp-tujuan'), aktivitas: g('mpp-aktivitas'), asesmen: g('mpp-asesmen') });
    });
  }
  function pertCollect() { return pertCollectRaw().filter(function (p) { return !pertKosong(p); }); }
  function pertRender(list, bukaIdx) {
    var box = $('mpfPert'); if (!box) return;
    if (!list.length) list = [fixPert({ alokasi: val('mpf-alokasi') })];
    box.innerHTML = list.map(function (p, i) { return pertRowHtml(p, i, i === (bukaIdx == null ? 0 : bukaIdx)); }).join('');
    refreshAcc();
  }
  function pertSesuaikan(list, n) {   // tambah baris kosong / buang baris kosong di ujung sampai berjumlah n
    var out = list.slice(), al = val('mpf-alokasi');
    while (out.length < n && out.length < PERT_MAX) out.push(fixPert({ alokasi: al }));
    while (out.length > n && pertKosong(out[out.length - 1])) out.pop();
    out.forEach(function (p) { if (!p.alokasi && pertKosong(p)) p.alokasi = al; });
    return out;
  }
  function ratakan(list, key) {   // gabungan teks aktivitas/asesmen semua pertemuan (untuk kompatibilitas)
    var rows = list.filter(function (p) { return p[key]; });
    if (!rows.length) return '';
    if (list.length === 1) return rows[0][key];
    return list.map(function (p, i) { return p[key] ? 'Pertemuan ' + (i + 1) + (p.topik ? ' — ' + p.topik : '') + ':\n' + p[key] : ''; }).filter(Boolean).join('\n\n');
  }
  function pertDocHtml(m, no) {
    var l = pertSaved(m);
    return '<h3>' + no + '. Rencana Pertemuan (' + l.length + ' pertemuan)</h3>' + l.map(function (p, i) {
      var meta = [p.tanggal ? 'Tanggal: ' + p.tanggal : '', p.alokasi ? 'Alokasi: ' + p.alokasi : ''].filter(Boolean).join(' · ');
      var bag = function (t, v) { return v ? '<div style="margin-top:6px;"><b>' + t + '</b><br>' + nl2br(v) + '</div>' : ''; };
      return '<div class="b" style="margin-bottom:8px;page-break-inside:avoid;"><b>Pertemuan ' + (i + 1) + (p.topik ? ' — ' + esc(p.topik) : '') + '</b>' +
        (meta ? '<div style="color:#555;font-size:12px;">' + esc(meta) + '</div>' : '') +
        bag('Tujuan', p.tujuan) + bag('Aktivitas Pembelajaran', p.aktivitas) + bag('Asesmen', p.asesmen) + '</div>';
    }).join('');
  }

  function menuVisible(page) {
    var el = document.querySelector('#v4SidebarMenu .menu-item[data-page="' + page + '"]');
    return !!el && !el.classList.contains('hidden-tab');
  }
  function judulModul(m) { return (m.mapel || '-') + ' — ' + (m.materi || '(tanpa materi)'); }
  function relasi(m, guru) {
    return esc(guru || m.guru || '-') + ' → ' + esc(m.mapel || '-') + ' → ' + esc(m.kelas || '-') +
      ' → ' + jumlahSiswa(m.kelas) + ' murid';
  }

  /* ---------- data ---------- */
  function load(force, cb) {
    if (loading) return;
    if (loaded && !force) { if (cb) cb(); return; }
    if (typeof db === 'undefined' || !isReallyOnline()) {
      loadErr = loaded ? '' : 'Perlu koneksi internet untuk memuat modul.';
      if (cb) cb(); return;
    }
    loading = true; loadErr = '';
    var g = gen;
    render();
    db.ref('modul_ajar').once('value', function (snap) {
      if (g !== gen) return;
      var arr = [];
      snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      data = arr.filter(function (m) { return isAdmin() || isKepsek() || isOwner(m); });
      sortData();
      loaded = true; loading = false; render(); if (cb) cb();
    }, function (err) {
      if (g !== gen) return;
      loading = false; loadErr = 'Gagal memuat modul: ' + (err && err.message || err);
      render(); if (cb) cb();
    });
  }
  function sortData() { data.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }); }
  // Modul berstatus 'diajukan' dikunci (juga ditegakkan Firebase Rules): favorit, arsip, pulih, hapus ikut ditolak.
  function terkunci(m) { if (m && pers(m) === 'diajukan') { toast('Modul sedang diajukan dan dikunci sampai ditinjau Kepala Madrasah.', true); return true; } return false; }
  function byKey(key) { return data.filter(function (m) { return m.key === key; })[0]; }
  function write(key, payload, okMsg, cb) {
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    var kunci = 'tulisModul:' + key;
    if (isBusy(kunci)) return;   // cegah klik ganda (Favorit/Arsip/Pulihkan) mengirim dua permintaan
    setBusy(kunci);
    db.ref('modul_ajar/' + key).update(payload, function (err) {
      clearBusy(kunci);
      if (err) return toast('Gagal: ' + err.message, true);
      var m = byKey(key); if (m) Object.keys(payload).forEach(function (k) { m[k] = payload[k]; });
      if (payload.updatedAt) sortData();
      if (okMsg) toast(okMsg);
      if (cb) cb();
    });
  }

  /* ---------- referensi kurikulum (kurikulum_ref) ---------- */
  function mapelList() {
    var src = $('materiMapelFilter'), out = [];
    if (src) Array.prototype.forEach.call(src.querySelectorAll('option'), function (o) { if (o.value && out.indexOf(o.value) === -1) out.push(o.value); });
    return out.length ? out : ['Matematika', 'Bahasa Indonesia'];
  }
  function tglIso(iso) { return iso ? String(iso).slice(0, 10) : '-'; }
  function refByKey(key) { return refs.filter(function (r) { return r.key === key; })[0]; }
  // Nama kepala madrasah untuk baris tanda tangan cetak Modul Ajar. Dibuat terpisah dari alur
  // persetujuan digital (m.persetujuanOleh): banyak madrasah masih tanda tangan basah di kertas
  // dan tidak pernah memakai tombol Setuju/Tolak di aplikasi, sehingga tanpa ini baris tanda tangan
  // kepala madrasah akan selalu kosong. Disimpan di Firebase (bukan localStorage) karena nilainya
  // satu untuk seluruh madrasah, bukan per guru.
  var kepalaNama = '';
  // Disimpan di school_settings/namaKepala: node ini sudah ada di Firebase Rules (baca/tulis untuk user login,
  // anak tambahan diizinkan lewat $other), jadi tidak perlu mengubah Rules. Jalur lama 'pengaturan_cetak' dan
  // 'perangkat_setting_v4' TIDAK ada di Rules sehingga selalu ditolak. Salinan localStorage tetap dibuat supaya
  // cetak di perangkat ini terisi walau sedang offline.
  var KEPALA_PATHS = ['school_settings/namaKepala'];
  var KEPALA_LS = 'mp_nama_kepala';
  function kepalaLokal() { try { return localStorage.getItem(KEPALA_LS) || ''; } catch (e) { return ''; } }
  function kepalaSegarkan() { if (tab !== 'buat') renderBody(); } // jangan timpa form yang sedang diisi
  function kepalaOnline() { return typeof isReallyOnline === 'function' ? isReallyOnline() : navigator.onLine; }
  function loadKepalaNama() {
    kepalaNama = kepalaLokal();
    var g0 = gen;   // jawaban yang datang setelah logout/ganti pengguna (resetState) diabaikan
    if (typeof db === 'undefined' || !db || !kepalaOnline()) { kepalaSegarkan(); return; }
    (function coba(i) {
      if (g0 !== gen) return;
      if (i >= KEPALA_PATHS.length) { kepalaSegarkan(); return; }
      db.ref(KEPALA_PATHS[i]).once('value', function (snap) {
        if (g0 !== gen) return;
        var v = snap.val();
        if (typeof v === 'string' && v.trim()) { kepalaNama = v.trim(); kepalaSegarkan(); } else coba(i + 1);
      }, function () { if (g0 === gen) coba(i + 1); }); // dibaca ditolak -> coba jalur berikutnya, bukan diam saja
    })(0);
  }
  function simpanKepalaServer(v, cb) { // cb(errTerakhir | null)
    var selesai = false, timer = setTimeout(function () { if (!selesai) { selesai = true; cb({ message: 'server tidak merespons' }); } }, 12000);
    function akhir(err) { if (selesai) return; selesai = true; clearTimeout(timer); cb(err); }
    (function coba(i, lastErr) {
      if (selesai) return;
      if (i >= KEPALA_PATHS.length) return akhir(lastErr || { message: 'gagal' });
      try {
        db.ref(KEPALA_PATHS[i]).set(v, function (err) { if (err) coba(i + 1, err); else akhir(null); });
      } catch (e) { coba(i + 1, e); }
    })(0, null);
  }
  function aturKepalaNama() {
    if (!isAdmin()) return toast('Hanya Admin yang bisa mengubah nama Kepala Madrasah.', true);
    var v = prompt('Nama Kepala Madrasah (dicetak di baris tanda tangan Modul Ajar bila belum disetujui lewat aplikasi):', kepalaNama || '');
    if (v === null) return;
    v = v.trim().slice(0, 80);
    try { localStorage.setItem(KEPALA_LS, v); } catch (e) {}
    kepalaNama = v; kepalaSegarkan();
    if (typeof db === 'undefined' || !db || !kepalaOnline()) {
      return toast('⚠️ Offline: nama tersimpan di perangkat ini saja. Simpan ulang saat online agar berlaku di semua perangkat.', true);
    }
    simpanKepalaServer(v, function (err) {
      if (err) return toast('⚠️ Tersimpan di perangkat ini saja. Server menolak: ' + (err.message || err) + '. Coba lagi saat online dan sudah login.', true);
      toast('✅ Nama Kepala Madrasah disimpan');
    });
  }
  function refFor(mapel, fase) { return refs.filter(function (r) { return r.mapel === mapel && r.fase === fase; })[0]; }
  function refStale(m) {
    var r = m.kurikulumRefKey ? refByKey(m.kurikulumRefKey) : null;
    if (!(r && m.kurikulumAt)) return false;
    var ta = Date.parse(r.updatedAt), tb = Date.parse(m.kurikulumAt);
    if (!isNaN(ta) && !isNaN(tb)) return ta > tb;
    return String(r.updatedAt || '') > String(m.kurikulumAt);   // format tak dikenal: cadangan perbandingan teks
  }
  function loadRef(force, cb) {
    if (refLoading) return;
    if (refLoaded && !force) { if (cb) cb(); return; }
    if (typeof db === 'undefined' || !isReallyOnline()) { if (cb) cb(); return; }
    refLoading = true; refErr = '';
    var g = gen;
    db.ref('kurikulum_ref').once('value', function (snap) {
      if (g !== gen) return;
      var arr = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      refs = arr.sort(function (a, b) { return (a.mapel + a.fase).localeCompare(b.mapel + b.fase); });
      refLoaded = true; refLoading = false;
      if (tab === 'referensi') renderBody();
      else if (tab === 'buat') { if (!editingKey) applyRef(true); refreshRefInfo(); }
      if (cb) cb();
    }, function (err) {
      if (g !== gen) return;
      refLoading = false; refErr = 'Gagal memuat referensi kurikulum: ' + (err && err.message || err);
      if (tab === 'referensi') renderBody(); if (cb) cb();
    });
  }
  function refInfoHtml() {
    if (!formRef) return '🧭 Belum terhubung ke referensi kurikulum. Pilih mapel & kelas, lalu klik “Isi dari kurikulum”.';
    var r = refByKey(formRef.key), stale = r && formRef.at && String(r.updatedAt || '') > String(formRef.at);
    return '🧭 Terisi dari: <b>' + esc(formRef.versi || 'referensi') + '</b> · ' + esc(tglIso(formRef.at)) +
      (stale ? ' · <span style="color:#b45309;font-weight:600;">⚠ Referensi sudah diperbarui — klik “Isi dari kurikulum” untuk memuat ulang</span>' : '');
  }
  function refreshRefInfo() { var el = $('mpfRef'); if (el) el.innerHTML = refInfoHtml(); }
  // auto=true: isi diam-diam hanya kolom yang kosong/belum diubah guru. auto=false: tombol manual.
  // Pecah CP yang berupa satu paragraf panjang menjadi baris per elemen bernomor ("1.1. ", "2.3. ", dst),
  // sesuai pola penomoran di SK Dirjen Pendis 9941/2025 dan KepKa BSKAP 046/2025. Hanya format tampilan;
  // kata-katanya tidak diubah. CP yang tidak memakai pola ini (mis. ringkasan lama) tidak terpengaruh.
  function formatCP(s) {
    s = String(s || '');
    return s.replace(/\s*(?=\d+\.\d+\.\s)/g, '\n').trim();
  }
  function applyRef(auto) {
    var mapel = val('mpf-mapel'), fase = val('mpf-fase'), cpEl = $('mpf-cp'), tpEl = $('mpf-tujuan');
    if (!cpEl || !tpEl) return;
    var bebas = function (el, k) { var v = el.value.trim(); return !v || v === lastFill[k]; };
    if (!mapel || !fase) { return; }
    var rAdmin = refFor(mapel, fase), rBank = refBank(mapel, fase);
    var r = refSumber === 'admin' ? rAdmin : refSumber === 'bank' ? rBank : (rAdmin || rBank);   // auto: referensi Admin diutamakan; bila belum ada, cadangan dari Bank TP
    if (!r) {
      if (bebas(cpEl, 'cp') && lastFill.cp) cpEl.value = '';
      if (bebas(tpEl, 'tp') && lastFill.tp) tpEl.value = '';
      lastFill = { cp: '', tp: '' }; formRef = null; refreshRefInfo();
      if (!auto) {
        var alt = refSumber === 'admin' ? (rBank ? ' Bank TP aplikasi tersedia: ganti sumber ke “Bank TP”.' : '')
                : refSumber === 'bank' ? (rAdmin ? ' Referensi Admin tersedia: ganti sumber ke “Referensi Admin”.' : '') : '';
        var nama = refSumber === 'bank' ? 'Bank TP aplikasi' : 'Referensi Admin';
        toast((refSumber === 'auto' ? 'Referensi kurikulum' : nama) + ' untuk ' + mapel + ' Fase ' + fase + ' belum tersedia.' + alt +
          (refSumber !== 'bank' && !alt ? (isAdmin() ? ' Tambahkan di tab Referensi.' : ' Minta admin mengisinya di tab Referensi.') : ''), true, 5000);
      }
      return;
    }
    var cp = String(r.cp || ''), tp = String(r.tp || '');
    var cpOk = bebas(cpEl, 'cp'), tpOk = bebas(tpEl, 'tp');
    if (!auto && (!cpOk || !tpOk) && !confirm('CP/TP sudah Anda ubah. Timpa dengan referensi kurikulum?')) return;
    // lastFill dibaca balik dari elemen (bukan dari teks sumber) supaya cocok dengan normalisasi baris baru textarea.
    var isi = function (el, k, teks) { el.value = teks; lastFill[k] = el.value.trim(); };
    // Urutan tetap: CP dulu, lalu TP.
    if (cp && (cpOk || !auto)) isi(cpEl, 'cp', formatCP(cp));
    if (tp && (tpOk || !auto)) isi(tpEl, 'tp', tp);
    formRef = { key: r.key, versi: r.versi || '', at: r.updatedAt || '' };
    refreshRefInfo(); refreshAcc();
    if (!auto) toast('✅ CP & TP diisi dari ' + (r.versi || 'referensi kurikulum'));
  }
  function refTabHtml() {
    var admin = isAdmin();
    if (refMode === 'form') return refFormHtml();
    if (refMode === 'impor') return refImporHtml();
    if (refMode === 'bank') return refBankHtml();
    var head = '<p class="text-muted" style="font-size:13px;margin-bottom:10px;">Sumber CP &amp; TP untuk tombol “Isi dari kurikulum” di formulir modul. ' +
      (admin ? 'Anda (admin) yang mengelola isinya — salin dari dokumen resmi Kemenag.' : 'Hanya admin yang dapat mengubah.') + '</p>';
    var acts = admin ? '<div class="mp-actions" style="margin:0 0 12px;"><button class="btn btn-success" data-mp="refbaru">+ TAMBAH REFERENSI</button><button class="btn btn-soft" data-mp="refbank">📚 ISI DARI BANK TP</button><button class="btn btn-soft" data-mp="refimpor">📥 IMPOR TEMPEL</button><button class="btn btn-soft" data-mp="kepalanama">👤 NAMA KEPALA MADRASAH</button></div>' : '';
    if (refErr) return head + '<p style="color:#dc2626;">' + esc(refErr) + '</p><button class="btn btn-soft" data-mp="refreload">🔄 Coba lagi</button>';
    if (refLoading) return head + '<p class="text-muted">⏳ Memuat referensi…</p>';
    if (!refs.length) return head + acts + '<p class="text-muted">Belum ada referensi kurikulum.' + (admin ? ' Mulai dengan “ISI DARI BANK TP”, “+ TAMBAH REFERENSI”, atau “IMPOR TEMPEL”.' : ' Minta admin mengisinya.') + '</p>';
    return head + acts + refs.map(refCard).join('');
  }
  function refCard(r) {
    var admin = isAdmin(), tpN = String(r.tp || '').split('\n').filter(function (x) { return x.trim(); }).length;
    return '<details class="mp-card mp-ref"><summary><span class="mp-title">' + esc(r.mapel) + ' — Fase ' + esc(r.fase) + '</span> ' +
      '<span class="mp-meta">' + esc(r.versi || '-') + '</span> <span class="mp-meta">' + tpN + ' TP</span> <span class="mp-meta">diperbarui ' + esc(tglIso(r.updatedAt)) + '</span></summary>' +
      (r.cp ? '<div class="mp-sec-t">Capaian Pembelajaran</div><div class="mp-snip">' + nl2br(r.cp) + '</div>' : '') +
      (r.tp ? '<div class="mp-sec-t">Tujuan Pembelajaran</div><div class="mp-snip">' + nl2br(r.tp) + '</div>' : '') +
      (admin ? '<div class="mp-actions"><button class="btn btn-primary mp-btn" data-mp="refedit" data-key="' + esc(r.key) + '">EDIT</button>' +
        '<button class="btn btn-danger mp-btn" data-mp="refhapus" data-key="' + esc(r.key) + '">🗑️ Hapus</button></div>' : '') + '</details>';
  }
  function refFormHtml() {
    var r = refEditKey ? refByKey(refEditKey) : null; r = r || {};
    var faseOpt = ['A', 'B', 'C', 'D', 'E', 'F'].map(function (f) { return '<option' + (f === (r.fase || 'A') ? ' selected' : '') + '>' + f + '</option>'; }).join('');
    var mapelOpt = '<option value="">-- Pilih Mata Pelajaran --</option>' + mapelList().map(function (m) { return '<option value="' + esc(m) + '"' + (m === r.mapel ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
    return '<div class="mp-form"><div class="mp-fh">' + (refEditKey ? 'Ubah' : 'Tambah') + ' Referensi Kurikulum</div><div class="grid-3">' +
      '<div><label class="label">Mata Pelajaran *</label><select id="mpr-mapel" class="field">' + mapelOpt + '</select></div>' +
      '<div><label class="label">Fase *</label><select id="mpr-fase" class="field">' + faseOpt + '</select></div>' +
      '<div><label class="label">Sumber / Versi *</label><input id="mpr-versi" class="field" value="' + esc(r.versi || '') + '" placeholder="Contoh: KMA 1503 Tahun 2025"></div></div>' +
      '<div class="mp-fsec"><label class="label">Capaian Pembelajaran (CP)</label><textarea id="mpr-cp" class="field" rows="6">' + esc(r.cp || '') + '</textarea></div>' +
      '<div class="mp-fsec"><label class="label">Tujuan Pembelajaran / Alur TP (satu per baris)</label><textarea id="mpr-tp" class="field" rows="8">' + esc(r.tp || '') + '</textarea></div>' +
      '<div class="mp-actions"><button class="btn btn-success" data-mp="refsimpan">💾 SIMPAN</button><button class="btn btn-soft" data-mp="refbatal">Batal</button></div></div>';
  }
  function refImporHtml() {
    var info = '';
    if (refParsed) {
      info = '<div class="mp-rel" style="margin-top:10px;">✅ Siap disimpan: <b>' + refParsed.ok.length + '</b> baris · dilewati: <b>' + refParsed.skip.length + '</b>' +
        (refParsed.skip.length ? '<ul style="margin:6px 0 0 18px;">' + refParsed.skip.slice(0, 10).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + (refParsed.skip.length > 10 ? '<li>…</li>' : '') + '</ul>' : '') + '</div>' +
        (refParsed.ok.length ? '<div class="mp-actions"><button class="btn btn-success" data-mp="refimporsimpan">💾 SIMPAN ' + refParsed.ok.length + ' REFERENSI</button></div>' : '');
    }
    return '<div class="mp-form"><div class="mp-fh">Impor Tempel Referensi Kurikulum</div>' +
      '<p class="text-muted" style="font-size:12.5px;margin-bottom:8px;">Salin dari Excel/Google Sheets, satu baris per data, dengan kolom (dipisah tab): <b>Mata Pelajaran · Fase · Sumber/Versi · CP · TP</b>. ' +
      'Beberapa TP dalam satu sel dipisahkan dengan <code>||</code>. Baris judul boleh disertakan. Data mapel+fase yang sudah ada akan diganti.</p>' +
      '<textarea id="mpr-paste" class="field" rows="10" placeholder="Matematika&#9;A&#9;KMA 1503 Tahun 2025&#9;CP…&#9;TP 1||TP 2">' + esc(refPaste) + '</textarea>' +
      '<div class="mp-actions"><button class="btn btn-primary" data-mp="refimporcek">🔍 PERIKSA</button><button class="btn btn-soft" data-mp="refbatal">Batal</button></div>' + info + '</div>';
  }
  function parseImpor(text) {
    var mapels = mapelList(), byLower = {}, out = {}, skip = [];
    mapels.forEach(function (m) { byLower[m.toLowerCase()] = m; });
    var off = 0;   // jumlah kolom di depan kolom Mapel (mis. kolom "No"), diambil dari baris header
    text.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var c = line.split('\t').map(function (x) { return x.trim(); });
      if (i === 0) {
        var ix = -1; c.forEach(function (x, k) { if (ix < 0 && /^(mata\s*pelajaran|mapel)$/i.test(x)) ix = k; });
        if (ix >= 0) { off = ix; return; }   // baris header (boleh diawali kolom No)
      }
      if (off) c = c.slice(off);
      if (c.length < 4) return skip.push('Baris ' + (i + 1) + ': kolom kurang (butuh minimal Mapel, Fase, Versi, CP)');
      var mapel = byLower[c[0].toLowerCase()], fase = (c[1] || '').toUpperCase();
      if (!mapel) return skip.push('Baris ' + (i + 1) + ': mata pelajaran “' + c[0] + '” tidak dikenal');
      if (!/^[A-F]$/.test(fase)) return skip.push('Baris ' + (i + 1) + ': fase harus A–F');
      if (!c[2]) return skip.push('Baris ' + (i + 1) + ': sumber/versi kosong');
      var cp = c[3] || '', tp = (c[4] || '').split('||').map(function (x) { return x.trim(); }).filter(Boolean).join('\n');
      if (!cp && !tp) return skip.push('Baris ' + (i + 1) + ': CP dan TP kosong');
      out[mapel + '|' + fase] = { mapel: mapel, fase: fase, versi: c[2], cp: cp, tp: tp };
    });
    return { ok: Object.keys(out).map(function (k) { return out[k]; }), skip: skip };
  }
  function refSimpan(btn) {
    if (!isAdmin()) return toast('Hanya Admin!', true);
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    if (isBusy('simpanRef')) return;
    var mapel = val('mpr-mapel'), fase = val('mpr-fase'), versi = val('mpr-versi'), cp = val('mpr-cp'), tp = val('mpr-tp');
    if (!mapel || !fase || !versi || (!cp && !tp)) return toast('Mata pelajaran, fase, sumber/versi, dan minimal CP atau TP wajib diisi!', true);
    if ((cp && cp.length < REF_MIN) || (tp && tp.length < REF_MIN)) return toast('CP/TP yang diisi minimal ' + REF_MIN + ' karakter.', true);
    var dup = refFor(mapel, fase);
    if (dup && refEditKey && dup.key !== refEditKey) return toast('Referensi untuk mapel & fase ini sudah ada. Ubah yang sudah ada.', true);
    if (dup && !refEditKey && !confirm('Referensi ' + mapel + ' Fase ' + fase + ' sudah ada. Ganti dengan isian ini?')) return;
    var key = refEditKey || (dup && dup.key) || db.ref('kurikulum_ref').push().key;
    var obj = { mapel: mapel, fase: fase, versi: versi, cp: cp, tp: tp, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
    setBusy('simpanRef', btn);
    db.ref('kurikulum_ref/' + key).set(obj, function (err) {
      clearBusy('simpanRef', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      obj.key = key; var ex = refByKey(key);
      if (ex) Object.assign(ex, obj); else refs.push(obj);
      refs.sort(function (a, b) { return (a.mapel + a.fase).localeCompare(b.mapel + b.fase); });
      addLog('simpan_referensi_kurikulum', mapel + ' Fase ' + fase + ' - ' + versi);
      toast('✅ Referensi disimpan'); refMode = 'list'; refEditKey = null; renderBody();
    });
  }
  function refImporSimpan(btn) {
    if (!isAdmin() || !refParsed || !refParsed.ok.length) return;
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    if (isBusy('imporRef')) return;
    var now = new Date().toISOString(), upd = {};
    refParsed.ok.forEach(function (r) {
      var ex = refFor(r.mapel, r.fase), k = ex ? ex.key : db.ref('kurikulum_ref').push().key;
      upd[k] = Object.assign({}, r, { updatedAt: now, updatedBy: currentUser.name });
    });
    setBusy('imporRef', btn);
    db.ref('kurikulum_ref').update(upd, function (err) {
      clearBusy('imporRef', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      addLog('impor_referensi_kurikulum', refParsed.ok.length + ' baris');
      toast('✅ ' + refParsed.ok.length + ' referensi disimpan');
      refMode = 'list'; refParsed = null; refPaste = ''; refLoaded = false; loadRef(true);
    });
  }

  /* ---------- isi referensi dari Bank TP aplikasi (window.BANK_TP_MI) ---------- */
  // Bank TP = js/data-tp-mi.js (PAI & B. Arab, CP dari SK Dirjen Pendis 9941/2025) + js/data-tp-umum.js (mapel umum, DRAF).
  // Tombol ini hanya MENYALIN bank ke kurikulum_ref (satu CP & TP per mapel+fase) agar Admin tidak mengetik ulang;
  // hasilnya tetap bisa diedit di tab Referensi. Tidak mengubah Rules (node kurikulum_ref sama dengan tambah/impor manual).
  var BANK_ALIAS = { aqh: /qur.?an|hadis|hadits/i, aa: /akidah|aqidah|akhlak/i, fikih: /fikih|fiqih/i, ski: /sejarah|^ski$/i, ba: /arab/i,
    mtk: /matematika|^mtk$/i, bin: /indonesia/i, pp: /pancasila|ppkn|^pkn$|^pp$/i, pjok: /pjok|jasmani/i, ipas: /ipas|pengetahuan alam/i,
    seni: /^seni|sbdp/i, big: /inggris/i };
  var BANK_SK = { aqh: 1, aa: 1, fikih: 1, ski: 1, ba: 1 };
  var BANK_VERSI_SK = 'SK Dirjen Pendis No. 9941 Tahun 2025 (via Bank TP aplikasi)';
  var BANK_VERSI_UMUM = 'Bank TP aplikasi - USULAN/DRAF, belum dicocokkan naskah CP resmi';
  function bankNorm(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function bankTujuan(k, f) {
    var m = window.BANK_TP_MI && window.BANK_TP_MI.mapel && window.BANK_TP_MI.mapel[k];
    return (m && m.tp && m.tp[f] || []).map(function (t) { return t && t[1] ? String(t[1]).trim() : ''; }).filter(Boolean);
  }
  function bankCP(k, f) {
    var m = window.BANK_TP_MI && window.BANK_TP_MI.mapel && window.BANK_TP_MI.mapel[k], c = m && m.cp && m.cp[f];
    return c ? c.map(function (x) { return String(x || '').trim(); }).filter(Boolean).join('\n') : '';
  }
  function bankTebak(k, nama, daftar) {
    var n = bankNorm(nama), hit = daftar.filter(function (x) { return bankNorm(x) === n; })[0];
    if (hit) return hit;
    var re = BANK_ALIAS[k];
    return re ? (daftar.filter(function (x) { return re.test(x); })[0] || '') : '';
  }
  // Cadangan: bila Admin belum menyimpan referensi untuk mapel+fase ini, CP & TP diambil langsung dari Bank TP aplikasi.
  // Hanya dipakai untuk mengisi formulir; TIDAK disimpan ke kurikulum_ref. Begitu Admin menyimpan referensi, referensi Admin yang dipakai.
  function refBank(mapel, fase) {
    var bank = window.BANK_TP_MI;
    if (!bank || !bank.mapel) return null;
    var ks = Object.keys(bank.mapel);
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i], m = bank.mapel[k];
      if (bankTebak(k, m && m.nama, [mapel]) !== mapel) continue;
      var cp = bankCP(k, fase), tp = bankTujuan(k, fase).join('\n');
      if (!cp && !tp) continue;
      return { key: 'bank-' + k + '-' + fase, mapel: mapel, fase: fase, cp: cp, tp: tp,
        versi: (BANK_SK[k] ? BANK_VERSI_SK : BANK_VERSI_UMUM) + ' · cadangan, belum disimpan Admin', updatedAt: new Date().toISOString() };
    }
    return null;
  }
  function refBankHtml() {
    var bank = window.BANK_TP_MI, mapels = mapelList();
    var back = '<div class="mp-actions"><button class="btn btn-soft" data-mp="refbatal">Batal</button></div>';
    if (!bank || !bank.mapel || !Object.keys(bank.mapel).length) {
      return '<div class="mp-form"><div class="mp-fh">Isi dari Bank TP</div><p class="text-muted">Bank TP belum termuat (js/data-tp-mi.js dan js/data-tp-umum.js).</p>' + back + '</div>';
    }
    var rows = Object.keys(bank.mapel).map(function (k) {
      var m = bank.mapel[k], fases = ['A', 'B', 'C'].filter(function (f) { return bankTujuan(k, f).length; });
      if (!fases.length) return '';
      var tebak = bankTebak(k, m.nama, mapels);
      var opt = '<option value="">-- Pilih mapel di aplikasi --</option>' + mapels.map(function (x) { return '<option value="' + esc(x) + '"' + (x === tebak ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
      var cek = fases.map(function (f) {
        return '<label style="margin-right:14px;white-space:nowrap;"><input type="checkbox" class="mpb-fase" data-k="' + esc(k) + '" data-f="' + f + '"' + (tebak ? ' checked' : '') + '> Fase ' + f + ' (' + bankTujuan(k, f).length + ' TP)</label>';
      }).join('');
      return '<div class="mp-card" style="padding:10px 12px;margin-bottom:8px;"><div class="mp-title">' + esc(m.nama || k) + (BANK_SK[k] ? '' : ' <span class="mp-meta">DRAF</span>') + '</div>' +
        '<div class="grid-3" style="margin:6px 0;"><div><label class="label">Disimpan sebagai mapel</label><select id="mpb-map-' + esc(k) + '" class="field">' + opt + '</select></div></div>' +
        '<div style="font-size:13px;">' + cek + '</div></div>';
    }).join('');
    return '<div class="mp-form"><div class="mp-fh">Isi Referensi dari Bank TP</div>' +
      '<p class="text-muted" style="font-size:12.5px;margin-bottom:8px;">Menyalin CP dan TP dari bank TP aplikasi ke referensi kurikulum (satu per mapel + fase). Hasilnya <b>usulan</b>: telaah bersama KKG/Kepala Madrasah dan cocokkan dengan naskah resmi sebelum dipakai final. ' +
      'Mapel bertanda <b>DRAF</b> (mapel umum) belum dicocokkan dengan naskah CP resmi. Setelah disimpan, isinya masih bisa diubah lewat tombol EDIT.</p>' +
      '<label style="display:block;margin-bottom:10px;font-size:13px;"><input type="checkbox" id="mpb-lewati" checked> Lewati mapel + fase yang sudah ada referensinya (hilangkan centang untuk menggantinya)</label>' +
      rows + '<div class="mp-actions"><button class="btn btn-success" data-mp="refbanksimpan">💾 SIMPAN KE REFERENSI</button><button class="btn btn-soft" data-mp="refbatal">Batal</button></div></div>';
  }
  function refBankSimpan(btn) {
    if (!isAdmin()) return toast('Hanya Admin!', true);
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    if (isBusy('bankRef')) return;
    var lewati = !!($('mpb-lewati') || {}).checked, now = new Date().toISOString(), target = {}, tanpaMapel = 0, ganda = '', dilewati = 0;
    Array.prototype.forEach.call(root.querySelectorAll('.mpb-fase:checked'), function (c) {
      var k = c.getAttribute('data-k'), f = c.getAttribute('data-f'), mapel = val('mpb-map-' + k);
      if (!mapel) { tanpaMapel++; return; }
      var ex = refFor(mapel, f);
      if (ex && lewati) { dilewati++; return; }
      var id = mapel + '|' + f;
      if (target[id]) { ganda = mapel + ' Fase ' + f; return; }
      target[id] = { mapel: mapel, fase: f, versi: BANK_SK[k] ? BANK_VERSI_SK : BANK_VERSI_UMUM, cp: bankCP(k, f), tp: bankTujuan(k, f).join('\n') };
    });
    if (ganda) return toast('Dua mapel bank diarahkan ke ' + ganda + '. Pilih mapel tujuan yang berbeda.', true, 5000);
    if (tanpaMapel) return toast(tanpaMapel + ' pilihan belum punya mapel tujuan. Pilih mapelnya atau hilangkan centang.', true, 5000);
    var list = Object.keys(target).map(function (i) { return target[i]; });
    if (!list.length) return toast(dilewati ? 'Semua pilihan sudah punya referensi (dilewati).' : 'Belum ada fase yang dicentang.', true);
    var diganti = list.filter(function (r) { return refFor(r.mapel, r.fase); }).length;
    if (diganti && !confirm(diganti + ' referensi yang sudah ada akan DIGANTI dengan isi bank TP. Lanjut?')) return;
    var upd = {};
    list.forEach(function (r) {
      var ex = refFor(r.mapel, r.fase), k = ex ? ex.key : db.ref('kurikulum_ref').push().key;
      upd[k] = Object.assign({}, r, { updatedAt: now, updatedBy: currentUser.name });
    });
    setBusy('bankRef', btn);
    db.ref('kurikulum_ref').update(upd, function (err) {
      clearBusy('bankRef', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      addLog('isi_referensi_dari_bank_tp', list.length + ' baris');
      toast('✅ ' + list.length + ' referensi disimpan dari Bank TP' + (dilewati ? ' (' + dilewati + ' dilewati karena sudah ada)' : ''));
      refMode = 'list'; refLoaded = false; loadRef(true);
    });
  }

  /* ---------- shell ---------- */
  function ensurePage() {
    if ($('page-' + PAGE)) return;
    var host = $('mainContent'); if (!host) return;
    var div = document.createElement('div');
    div.id = 'page-' + PAGE; div.className = 'page-content hidden';
    var anchor = $('page-tugas-siswa');
    if (anchor && anchor.parentNode === host) anchor.insertAdjacentElement('afterend', div); else host.appendChild(div);
    root = div;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
  }

  function render() {
    if (!root) return;
    if (!canView()) {
      root.innerHTML = '<div class="card"><p style="color:#dc2626;">🔒 Menu ini hanya untuk guru, admin, dan kepala madrasah.</p></div>';
      return;
    }
    var tabsHtml = TABS.map(function (t) {
      var label = (t.id === 'buat' && editingKey) ? '✏️ Edit Modul' : t.t;
      if (t.id === 'buat' && !canCreate()) return '';
      if (t.id === 'rekap' && !canApprove()) return '';
      var on = tab === t.id;
      return '<button type="button" id="mp-tab-' + t.id + '" role="tab" aria-selected="' + on + '" aria-controls="mpBody" class="mp-tab' + (on ? ' active' : '') + '" data-mp="tab" data-tab="' + t.id + '">' + label + '</button>';
    }).join('');
    root.innerHTML = '<div class="card">' +
      '<h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📚 Modul Pembelajaran</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:12px;">Susun modul ajar, hubungkan dengan kelas, lalu pakai untuk absensi dan penilaian kelas yang sama.</p>' +
      '<div class="mp-tabs" role="tablist">' + tabsHtml + '</div>' +
      '<div id="mpBody" role="tabpanel" aria-labelledby="mp-tab-' + tab + '"></div></div>';
    renderBody();
  }
  function renderBody() {
    var b = $('mpBody'); if (!b) return;
    if (tab === 'referensi') { b.innerHTML = refTabHtml(); return; }
    if (loading) { b.innerHTML = '<p class="text-muted" style="padding:12px 0;">⏳ Memuat modul…</p>'; return; }
    if (tab === 'buat') { b.innerHTML = formHtml(editingKey ? byKey(editingKey) : null); bindForm(); return; }
    if (loadErr) { b.innerHTML = '<p style="color:#dc2626;padding:8px 0;">' + esc(loadErr) + '</p><button class="btn btn-soft" data-mp="reload">🔄 Coba lagi</button>'; return; }
    if (tab === 'rekap') {
      if (!canApprove()) { tab = 'daftar'; return renderBody(); }
      b.innerHTML = rekapToolbarHtml() + '<div id="mpRekapIsi"></div>'; renderRekapIsi(); return;
    }
    if (tab === 'komponen') { b.innerHTML = komponenHtml(); renderList(); return; }
    b.innerHTML = toolbarHtml() + '<div id="mpList"></div>';
    renderList();
  }

  /* ---------- daftar / favorit / arsip / komponen ---------- */
  function toolbarHtml() {
    var mapelOpt = uniq(data.map(function (m) { return m.mapel; })), kelasOpt = uniq(data.map(function (m) { return m.kelas; }));
    function opts(list, cur, all) {
      return '<option value="">' + all + '</option>' + list.map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    }
    var antre = data.filter(function (m) { return pers(m) === 'diajukan' && m.status !== 'arsip'; }).length;
    var banner = (canApprove() && tab === 'daftar' && antre)
      ? '<div class="mp-rel" style="margin-bottom:8px;background:#fef3c7;">🔔 <b>' + antre + '</b> modul menunggu persetujuan. <button type="button" class="btn btn-soft mp-btn" data-mp="antrean">Tampilkan</button></div>' : '';
    var persOpt = '<option value="">Semua status persetujuan</option>' + Object.keys(PERS).map(function (k) {
      return '<option value="' + k + '"' + (filt.pers === k ? ' selected' : '') + '>' + esc(PERS[k].t) + '</option>';
    }).join('');
    return banner + '<div class="mp-toolbar">' +
      '<input id="mpQ" class="field" placeholder="🔍 Cari materi / mapel / guru…" value="' + esc(filt.q) + '">' +
      '<select id="mpFPers" class="field">' + persOpt + '</select>' +
      '<select id="mpFMapel" class="field">' + opts(mapelOpt, filt.mapel, 'Semua mapel') + '</select>' +
      '<select id="mpFKelas" class="field">' + opts(kelasOpt, filt.kelas, 'Semua kelas') + '</select>' +
      '<select id="mpFSem" class="field">' + opts(['Ganjil', 'Genap'], filt.semester, 'Semua semester') + '</select>' +
      (canCreate() && tab === 'daftar' ? '<button class="btn btn-success" data-mp="baru">+ MODUL BARU</button>' : '') +
      (canView() && tab === 'daftar' ? '<button class="btn btn-soft" data-mp="cetakgab" title="Cetak semua modul yang tampil (sesuai filter) dalam satu dokumen">🖨️ CETAK GABUNGAN RPM</button>' : '') + '</div>';
  }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }).sort(); }
  function komponenHtml() {
    var chips = KOMPONEN.map(function (k) {
      return '<button type="button" class="mp-chip' + (komp === k ? ' active' : '') + '" data-mp="komp" data-k="' + k + '">' + esc(sec(k).t) + '</button>';
    }).join('');
    return '<div class="mp-chips">' + chips + '</div>' + toolbarHtml().replace(/<button class="btn btn-success"[^>]*>.*?<\/button>/, '') + '<div id="mpList"></div>';
  }
  function filtered() {
    var q = filt.q.toLowerCase();
    return data.filter(function (m) {
      var arsip = m.status === 'arsip';
      if (tab === 'arsip' ? !arsip : arsip) return false;
      if (tab === 'favorit' && !m.favorit) return false;
      if (filt.mapel && m.mapel !== filt.mapel) return false;
      if (filt.kelas && m.kelas !== filt.kelas) return false;
      if (filt.semester && m.semester !== filt.semester) return false;
      if (filt.pers && pers(m) !== filt.pers) return false;
      if (q && (m.materi + ' ' + m.mapel + ' ' + m.guru + ' ' + m.kelas).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  /* ---------- rekap pemantauan (Admin & Kepala Madrasah) ---------- */
  // Satu guru = satu baris. Kunci guru: ownerKey; bila akunnya sudah dibuat ulang / modul lama tanpa ownerKey, dicocokkan lewat nama
  // (aturan sama dengan isOwner). Modul arsip tidak dihitung. Guru tanpa modul tetap tampil selama filter mapel/kelas tidak dipakai.
  function daftarGuru() { return (typeof allGuru !== 'undefined' && allGuru) ? allGuru : []; }
  function guruKeyOf(m) {
    var gl = daftarGuru(), mk = m.ownerKey || '';
    if (mk && gl.some(function (g) { return g && g.key === mk; })) return mk;
    var n = normNama(m.ownerName || m.guru), g2 = n ? gl.filter(function (g) { return g && normNama(g.name) === n; })[0] : null;
    return g2 ? g2.key : (mk || 'n:' + n);
  }
  function rekapRows() {
    var gl = daftarGuru(), rows = {}, q = normNama(filt.q);
    function row(key, nama) { return rows[key] || (rows[key] = { key: key, nama: nama || '-', total: 0, draf: 0, diajukan: 0, disetujui: 0, ditolak: 0, last: '', items: [] }); }
    if (!filt.mapel && !filt.kelas) gl.forEach(function (g) { if (g && (g.role === 'guru' || g.role === 'wali_kelas')) row(g.key, g.name); });
    data.forEach(function (m) {
      if (m.status === 'arsip') return;
      if (filt.mapel && m.mapel !== filt.mapel) return;
      if (filt.kelas && m.kelas !== filt.kelas) return;
      if (filt.semester && m.semester !== filt.semester) return;
      var k = guruKeyOf(m), g = gl.filter(function (x) { return x && x.key === k; })[0];
      var r = row(k, (g && g.name) || m.ownerName || m.guru), st = pers(m);
      r.total++; r[st]++; r.items.push(m);
      if (String(m.updatedAt || '') > r.last) r.last = String(m.updatedAt || '');
    });
    return Object.keys(rows).map(function (k) { return rows[k]; })
      .filter(function (r) { return !q || normNama(r.nama).indexOf(q) !== -1; })
      .sort(function (a, b) { return (b.diajukan - a.diajukan) || String(a.nama).localeCompare(String(b.nama), 'id'); });
  }
  function rekapToolbarHtml() {
    var aktif = data.filter(function (m) { return m.status !== 'arsip'; });
    function opts(list, cur, all) {
      return '<option value="">' + all + '</option>' + list.map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    }
    return '<div class="mp-toolbar">' +
      '<input id="mpQ" class="field" placeholder="🔍 Cari nama guru…" value="' + esc(filt.q) + '">' +
      '<select id="mpFMapel" class="field">' + opts(uniq(aktif.map(function (m) { return m.mapel; })), filt.mapel, 'Semua mapel') + '</select>' +
      '<select id="mpFKelas" class="field">' + opts(uniq(aktif.map(function (m) { return m.kelas; })), filt.kelas, 'Semua kelas') + '</select>' +
      '<select id="mpFSem" class="field">' + opts(['Ganjil', 'Genap'], filt.semester, 'Semua semester') + '</select>' +
      '<button class="btn btn-soft" data-mp="rekapcsv">⬇️ EKSPOR CSV</button></div>';
  }
  function renderRekapIsi() {
    var box = $('mpRekapIsi'); if (!box || !canApprove()) return;
    var rows = rekapRows(), sum = { total: 0, draf: 0, diajukan: 0, disetujui: 0, ditolak: 0 }, sudah = 0, belum = 0;
    rows.forEach(function (r) {
      Object.keys(sum).forEach(function (k) { sum[k] += r[k]; });
      if (r.total) sudah++; else belum++;
    });
    var pct = sum.total ? Math.round(sum.disetujui * 100 / sum.total) : 0;
    var kartu = function (angka, label, bg, fg) {
      return '<div style="flex:1 1 130px;min-width:130px;padding:10px 12px;border-radius:10px;background:' + bg + ';color:' + fg + ';"><div style="font-size:20px;font-weight:700;">' + angka + '</div><div style="font-size:12px;">' + label + '</div></div>';
    };
    var html = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px;">' +
      kartu(sum.total, 'Modul (tidak termasuk arsip)', '#f3f4f6', '#374151') +
      kartu(sudah + ' / ' + rows.length, 'Guru sudah membuat modul', '#dbeafe', '#1e40af') +
      kartu(sum.diajukan, 'Menunggu persetujuan', '#fef3c7', '#92400e') +
      kartu(sum.disetujui + ' (' + pct + '%)', 'Disetujui', '#d1fae5', '#065f46') +
      (belum ? kartu(belum, 'Guru belum punya modul', '#fee2e2', '#991b1b') : '') + '</div>';
    if (sum.diajukan) html += '<div class="mp-rel" style="margin-bottom:8px;background:#fef3c7;">🔔 <b>' + sum.diajukan + '</b> modul menunggu persetujuan. <button type="button" class="btn btn-soft mp-btn" data-mp="rekapantrean">Buka antrean</button></div>';
    if (!rows.length) { box.innerHTML = html + '<p class="text-muted" style="padding:12px 0;font-size:13px;">Tidak ada data yang cocok dengan filter.</p>'; return; }
    var th = 'padding:6px 8px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;white-space:nowrap;', td = 'padding:6px 8px;border-bottom:1px solid #f3f4f6;font-size:13px;';
    var body = rows.map(function (r) {
      var buka = rekapOpen === r.key, sepi = !r.total;
      var tr = '<tr><td style="' + td + '"><button type="button" class="btn btn-soft mp-btn" data-mp="rekapguru" data-key="' + esc(r.key) + '">' + (buka ? '▾ ' : '▸ ') + esc(r.nama) + '</button></td>' +
        '<td style="' + td + '"><b>' + r.total + '</b></td><td style="' + td + '">' + r.draf + '</td>' +
        '<td style="' + td + (r.diajukan ? 'background:#fef3c7;font-weight:700;' : '') + '">' + r.diajukan + '</td>' +
        '<td style="' + td + '">' + r.disetujui + '</td><td style="' + td + '">' + r.ditolak + '</td>' +
        '<td style="' + td + 'white-space:nowrap;">' + (sepi ? '<span style="color:#991b1b;">Belum ada modul</span>' : tglIso(r.last)) + '</td></tr>';
      if (buka) {
        var det = r.items.length ? r.items.slice().sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }).map(function (m) {
          var bt = function (act, label, cls) { return '<button class="btn ' + (cls || 'btn-soft') + ' mp-btn" data-mp="' + act + '" data-key="' + esc(m.key) + '">' + label + '</button>'; };
          return '<div class="mp-card" style="margin:6px 0;"><div class="mp-card-h"><div class="mp-title">' + esc(judulModul(m)) + '</div>' +
            '<div class="mp-metas">' + persBadge(m) + chip(m.kelas) + chip('Sem. ' + (m.semester || '-')) + chip('Diperbarui ' + tglIso(m.updatedAt)) + '</div></div>' +
            '<div class="mp-actions">' + (pers(m) === 'diajukan' ? bt('setujui', '✅ SETUJUI', 'btn-success') + bt('tolak', '❌ TOLAK', 'btn-danger') : '') + bt('cetak', 'CETAK') + '</div></div>';
        }).join('') : '<p class="text-muted" style="font-size:13px;">Belum ada modul yang cocok dengan filter.</p>';
        tr += '<tr><td colspan="7" style="padding:4px 8px 10px;background:#fafafa;">' + det + '</td></tr>';
      }
      return tr;
    }).join('');
    box.innerHTML = html + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr>' +
      ['Guru', 'Total', 'Draf', 'Diajukan', 'Disetujui', 'Ditolak', 'Terakhir diperbarui'].map(function (h) { return '<th style="' + th + '">' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function rekapCsv() {
    if (!canApprove()) return;
    var cell = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    var baris = [['Guru', 'Total', 'Draf', 'Diajukan', 'Disetujui', 'Ditolak', 'Terakhir Diperbarui']];
    rekapRows().forEach(function (r) { baris.push([r.nama, r.total, r.draf, r.diajukan, r.disetujui, r.ditolak, r.last ? tglIso(r.last) : '']); });
    var csv = baris.map(function (b) { return b.map(cell).join(';'); }).join('\r\n');
    var nama = 'rekap-modul-ajar-' + new Date().toISOString().slice(0, 10) + '.csv';
    if (typeof downloadFile === 'function') downloadFile(csv, nama, 'text/csv');
    else { var u = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a'); a.href = u; a.download = nama; a.click(); URL.revokeObjectURL(u); }
  }
  function renderList() {
    var box = $('mpList'); if (!box) return;
    var items = filtered();
    if (!items.length) {
      var msg = { daftar: 'Belum ada modul. Klik “+ MODUL BARU” untuk membuat.', favorit: 'Belum ada modul favorit. Tandai ⭐ pada modul di Daftar Modul.', arsip: 'Arsip kosong.', komponen: 'Belum ada modul untuk ditampilkan.' }[tab];
      box.innerHTML = '<p class="text-muted" style="padding:12px 0;font-size:13px;">' + msg + '</p>'; return;
    }
    box.innerHTML = items.map(tab === 'komponen' ? komponenCard : card).join('');
  }
  function chip(t) { return '<span class="mp-meta">' + esc(t) + '</span>'; }
  function card(m) {
    var st = pers(m), edit = canEdit(m), arsip = m.status === 'arsip', kunci = st === 'diajukan';
    var btn = function (act, label, cls) { return '<button class="btn ' + (cls || 'btn-soft') + ' mp-btn" data-mp="' + act + '" data-key="' + esc(m.key) + '">' + label + '</button>'; };
    var acts = '';
    if (edit && !arsip && !kunci) acts += btn('edit', 'EDIT', 'btn-primary');
    if (edit && !arsip && (st === 'draf' || st === 'ditolak')) acts += btn('ajukan', '📨 AJUKAN', 'btn-success');
    if (canApprove() && !arsip && st === 'diajukan') acts += btn('setujui', '✅ SETUJUI', 'btn-success') + btn('tolak', '❌ TOLAK', 'btn-danger');
    if (canCreate()) acts += btn('dup', 'DUPLIKAT');
    if (edit && !arsip) acts += btn('fav', m.favorit ? '⭐ Favorit' : '☆ Favorit');
    acts += btn('cetak', 'CETAK') + btn('pdf', 'PDF') + btn('cetakrpm', 'CETAK RPM');
    if (edit && !arsip) acts += btn('arsip', 'ARSIPKAN', 'btn-warning');
    if (edit && arsip) acts += btn('pulih', '♻️ Pulihkan') + btn('hapus', '🗑️ Hapus', 'btn-danger');
    var go = '';
    if (menuVisible('attendance')) go += btn('goabsen', '📋 Absensi ' + esc(m.kelas));
    if (menuVisible('grades')) go += btn('gonilai', '📝 Nilai ' + esc(m.kelas));
    return '<div class="mp-card">' +
      '<div class="mp-card-h"><div class="mp-title">' + esc(judulModul(m)) + (m.favorit ? ' ⭐' : '') + '</div>' +
      '<div class="mp-metas">' + persBadge(m) + chip(m.kelas) + (m.fase ? chip('Fase ' + m.fase) : '') + chip('Sem. ' + (m.semester || '-')) + chip(m.tahunAjaran || '-') + (m.alokasi ? chip('⏱ ' + m.alokasi) : '') + (pertSaved(m).length ? chip('🗓️ ' + pertSaved(m).length + ' pertemuan') : '') + (m.kurikulumVersi ? chip('🧭 ' + m.kurikulumVersi) : '') + (refStale(m) ? '<span class="mp-meta mp-warn">⚠ Kurikulum diperbarui</span>' : '') + '</div></div>' +
      '<div class="mp-rel">' + relasi(m) + '</div>' + persInfoHtml(m) +
      (m.tujuan ? '<div class="mp-snip">' + nl2br(String(m.tujuan).slice(0, 160)) + (String(m.tujuan).length > 160 ? '…' : '') + '</div>' : '') +
      '<div class="mp-actions">' + acts + '</div>' +
      (go ? '<div class="mp-actions mp-go">' + go + '</div>' : '') + '</div>';
  }
  function komponenCard(m) {
    var s = sec(komp), txt = m[komp];
    return '<div class="mp-card"><div class="mp-card-h"><div class="mp-title">' + esc(judulModul(m)) + '</div>' +
      '<div class="mp-metas">' + chip(m.kelas) + chip('Sem. ' + (m.semester || '-')) + '</div></div>' +
      '<div class="mp-sec-t">' + esc(s.t) + '</div>' +
      '<div class="mp-snip">' + (txt ? nl2br(txt) : '<span class="text-muted">— belum diisi —</span>') + '</div>' +
      '<div class="mp-actions">' + (canEdit(m) ? '<button class="btn btn-primary mp-btn" data-mp="edit" data-key="' + esc(m.key) + '">EDIT</button>' : '') +
      '<button class="btn btn-soft mp-btn" data-mp="cetak" data-key="' + esc(m.key) + '">CETAK</button></div></div>';
  }

  /* ---------- form ---------- */
  function mapelOptions(cur) {
    // Opsi kosong bawaan filter (mis. "Semua mapel") dilewati lewat mapelList(); placeholder hanya satu.
    var bt = mapelBatas(), daftar = bt ? bt.slice() : mapelList();
    if (bt && cur && daftar.indexOf(cur) === -1) daftar.push(cur);   // modul lama dengan mapel di luar jadwal tetap tampil
    return '<option value="">-- Pilih Mata Pelajaran --</option>' + daftar.map(function (m) {
      return '<option value="' + esc(m) + '"' + (m === cur ? ' selected' : '') + '>' + esc(m) + '</option>';
    }).join('');
  }
  function checks(cls, list, sel) {
    return '<div class="mp-checks">' + list.map(function (x) {
      return '<label class="mp-check"><input type="checkbox" class="' + cls + '" value="' + esc(x) + '"' + (sel.indexOf(x) !== -1 ? ' checked' : '') + '> <span>' + esc(cls === 'mpf-panca' ? labelPanca(x) : x) + '</span></label>';
    }).join('') + '</div>';
  }
  function rpmAccHtml(m) {
    m = m || {};
    var ck = rpmLengkap(m), gr = '', isi = '';
    isi += '<div class="mp-rel" style="margin-bottom:6px;">Format <b>minimum</b> (sesuai Panduan Pembelajaran dan Asesmen Madrasah 2025) memuat Identifikasi, Desain Pembelajaran, Pengalaman Belajar (awal, inti, penutup), dan Asesmen. Centang <b>format lengkap</b> bila modul akan disupervisi/akreditasi; kolom bertanda (lengkap), termasuk Kesiapan Murid (opsional), akan muncul dan ikut tercetak. Cetak dengan tombol <b>CETAK RPM</b>.</div>' +
      '<label class="mp-check" style="margin-bottom:6px;"><input type="checkbox" id="mpf-rpmLengkap"' + (ck ? ' checked' : '') + '> <span><b>Gunakan format lengkap</b></span></label>';
    RPM_FIELDS.forEach(function (f) {
      if (f.g !== gr) { gr = f.g; isi += '<div style="font-weight:700;font-size:13px;margin:10px 0 2px;color:#065f46;">' + esc(gr) + '</div>'; }
      isi += '<div class="' + (f.lengkap ? 'mp-rpm-lkp' : '') + '"' + (f.lengkap && !ck ? ' style="display:none;"' : '') + '>' +
        '<label class="label" style="margin-top:4px;">' + esc(f.t) + (f.lengkap ? ' <span class="text-muted" style="font-weight:400;">(lengkap)</span>' : '') + '</label>' +
        '<textarea id="mpf-' + f.k + '" class="field" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.ph || '') + '">' + esc(m[f.k] || '') + '</textarea></div>';
    });
    return '<details class="mp-acc" id="mpacc-rpm" style="border:1px solid #e5e7eb;border-radius:10px;margin:6px 0;padding:0 12px;">' +
      '<summary style="cursor:pointer;padding:10px 0;font-weight:600;font-size:14px;display:flex;justify-content:space-between;gap:8px;align-items:center;">' +
      '<span>Rencana Pembelajaran Mendalam (RPM) &amp; KBC</span><span id="mpbadge-rpm" class="text-muted" style="font-size:12px;font-weight:500;"></span></summary>' +
      '<div style="padding-bottom:10px;">' + isi + '</div></details>';
  }
  function rpmRefresh() {
    var cb = $('mpf-rpmLengkap'); if (!cb || !root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.mp-rpm-lkp'), function (d) { d.style.display = cb.checked ? '' : 'none'; });
    var aktif = RPM_FIELDS.filter(function (f) { return cb.checked || !f.lengkap; });
    var n = aktif.filter(function (f) { var el = $('mpf-' + f.k); return el && el.value.trim(); }).length, b = $('mpbadge-rpm');
    if (b) { b.textContent = (cb.checked ? 'Lengkap' : 'Minimum') + ' · ' + n + '/' + aktif.length + ' terisi'; b.style.color = n ? '#059669' : ''; }
  }
  function formHtml(m) {
    m = m || {};
    var kelasList = kelasBoleh(), kelas = m.kelas || '';   // modul baru: kelas dipilih sesudah mapel (lihat urutkanForm)
    if (!canCreate()) return '<p style="color:#dc2626;">🔒 Anda tidak punya izin membuat modul.</p>';
    if (!kelasList.length) return '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>';
    var guru = m.guru || currentUser.name, fase = m.fase || faseDari(kelas);
    var kelasOpt = '<option value=""' + (kelas ? '' : ' selected') + '>-- Pilih Kelas --</option>' + kelasList.map(function (k) { return '<option' + (k === kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    var semOpt = ['Ganjil', 'Genap'].map(function (s) { return '<option' + (s === (m.semester || semAktif()) ? ' selected' : '') + '>' + s + '</option>'; }).join('');
    var faseOpt = '<option value=""' + (fase ? '' : ' selected') + '>-</option>' + ['A', 'B', 'C', 'D', 'E', 'F'].map(function (f) { return '<option' + (f === fase ? ' selected' : '') + '>' + f + '</option>'; }).join('');
    var fld = function (id, label, html) { return '<div><label class="label">' + label + '</label>' + html + '</div>'; };
    // Kolom dengan daftar saran (materi, model, metode, pendekatan): datalist bawaan browser sering tak muncul (terutama di HP / bila kolom
    // sudah terisi), jadi ditambah tombol ▾ yang membuka daftar pilihan penuh. Mengetik bebas tetap bisa.
    var inp = function (id, v, ph, list) {
      var i = '<input id="' + id + '" class="field" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '"' + (list ? ' list="' + list + '"' : '') + (list ? ' style="flex:1;min-width:0;"' : '') + '>';
      if (!list) return i;
      return '<div style="display:flex;gap:4px;">' + i + '<button type="button" class="btn btn-soft" style="padding:0 12px;" data-mp="dd" data-for="' + id + '" data-list="' + list + '" aria-label="Lihat pilihan" title="Lihat pilihan">▾</button></div>' +
        '<div id="mpdd-' + id + '" hidden style="max-height:220px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;margin-top:4px;background:#fff;"></div>';
    };
    // Bagian panjang dilipat (akordeon) supaya formulir ringkas; hanya Tujuan Pembelajaran (wajib) terbuka.
    var acc = function (id, judul, isi, open, badgeId) {
      return '<details class="mp-acc" id="' + id + '"' + (open ? ' open' : '') + ' style="border:1px solid #e5e7eb;border-radius:10px;margin:6px 0;padding:0 12px;">' +
        '<summary style="cursor:pointer;padding:10px 0;font-weight:600;font-size:14px;display:flex;justify-content:space-between;gap:8px;align-items:center;">' +
        '<span>' + judul + '</span><span id="' + badgeId + '" class="text-muted" style="font-size:12px;font-weight:500;"></span></summary>' +
        '<div style="padding-bottom:10px;">' + isi + '</div></details>';
    };
    var nomor = 2, secs = SECTIONS.map(function (s) {
      if (s.k === 'asesmen') return '';   // asesmen diisi per pertemuan
      var no = nomor++;
      if (s.k === 'aktivitas') {
        var pl = getPert(m);
        if (!editingKey && !pl.length) pl = pertSesuaikan([], pertSaran);
        if (!pl.length) pl = [fixPert({})];
        return acc('mpacc-aktivitas', no + '. Daftar Pertemuan (aktivitas & asesmen per pertemuan)', pertSectionHtml(pl), true, 'mpbadge-aktivitas');
      }
      return acc('mpacc-' + s.k, no + '. ' + esc(s.t) + (s.req ? ' *' : ''),
        '<textarea id="mpf-' + s.k + '" class="field" rows="3" placeholder="' + esc(s.ph) + '">' + esc(m[s.k] || '') + '</textarea>',
        !!s.req, 'mpbadge-' + s.k);
    }).join('');
    var infoPers = '';
    if (editingKey && pers(m) === 'disetujui') infoPers = '<div class="mp-rel" style="background:#fef3c7;margin-bottom:8px;">⚠️ Modul ini sudah disetujui. Jika Anda mengubah isinya, status kembali ke <b>Draf</b> dan perlu diajukan ulang.' + persInfoHtml(m) + '</div>';
    else if (editingKey && pers(m) === 'ditolak') infoPers = '<div class="mp-rel" style="background:#fee2e2;margin-bottom:8px;">❌ Modul dikembalikan oleh Kepala Madrasah. Perbaiki lalu ajukan ulang dari Daftar Modul.' + persInfoHtml(m) + '</div>';
    return '<div class="mp-form">' + infoPers +
      '<div class="mp-fh">1. Identitas Modul</div>' +
      '<div class="grid-3">' +
        fld('', 'Mata Pelajaran *', '<select id="mpf-mapel" class="field">' + mapelOptions(m.mapel) + '</select>') +
        fld('', 'Kelas *', '<select id="mpf-kelas" class="field">' + kelasOpt + '</select>') +
        fld('', 'Semester', '<select id="mpf-semester" class="field">' + semOpt + '</select>') +
        fld('', 'Materi *', inp('mpf-materi', m.materi, 'Contoh: Alam sekitar', 'mpDlMateri')) +
        fld('', 'Alokasi Waktu', inp('mpf-alokasi', m.alokasi, 'Contoh: 2 × 35 menit')) +
        fld('', 'Model Pembelajaran', inp('mpf-model', m.model, 'Contoh: Project Based Learning', 'mpDlModel')) +
      '</div>' +
      acc('mpacc-detail', 'Detail identitas (sekolah, fase, tahun, guru, metode, pendekatan)',
        '<div class="grid-3">' +
          fld('', 'Nama Sekolah', '<input id="mpf-sekolah" class="field" value="' + esc(m.sekolah || madr().nama) + '" readonly>') +
          fld('', 'Fase', '<select id="mpf-fase" class="field">' + faseOpt + '</select>') +
          fld('', 'Tahun Pelajaran', inp('mpf-ta', m.tahunAjaran || taAktif(), '2026/2027')) +
          fld('', 'Nama Guru', '<input id="mpf-guru" class="field" value="' + esc(guru) + '"' + (isAdmin() ? '' : ' readonly') + '>') +
          fld('', 'Metode', inp('mpf-metode', m.metode, 'Contoh: Diskusi, Demonstrasi', 'mpDlMetode')) +
          fld('', 'Pendekatan', inp('mpf-pendekatan', m.pendekatan, 'Contoh: Saintifik', 'mpDlPend')) +
        '</div>' + ((isAdmin() && (!editingKey || isOwner(m))) ? '<div class="mp-rel" style="margin-top:6px;">ℹ️ Modul yang dibuat Admin tercatat <b>milik Admin</b>. Nama guru di atas hanya tampil di dokumen; guru tersebut tidak dapat melihat atau mengedit modul ini dari akunnya.</div>' : ''), false, 'mpbadge-detail') +
      '<datalist id="mpDlModel"><option value="Problem Based Learning"><option value="Project Based Learning"><option value="Discovery Learning"><option value="Inquiry Learning"><option value="Cooperative Learning"></datalist>' +
      '<datalist id="mpDlMetode"><option value="Ceramah"><option value="Diskusi"><option value="Demonstrasi"><option value="Tanya jawab"><option value="Penugasan"><option value="Praktik"></datalist>' +
      '<datalist id="mpDlMateri"></datalist>' +
      '<datalist id="mpDlPend"><option value="Saintifik"><option value="Kontekstual"><option value="Pembelajaran berdiferensiasi"><option value="Tematik"></datalist>' +
      (editingKey ? '' : jadwalBarHtml()) +
      '<div class="mp-rel" id="mpfRel" style="margin:10px 0 8px;"></div>' +
      '<div id="mpfLanjutInfo" class="mp-rel" style="background:#fef3c7;margin-bottom:8px;" hidden></div>' +
      '<fieldset id="mpfLanjut" style="border:0;margin:0;padding:0;min-width:0;">' +
      '<div class="mp-refbar"><button type="button" class="btn btn-primary" data-mp="isiref">🧭 Isi dari kurikulum</button>' +
      '<select id="mpf-sumberref" class="field" style="max-width:210px;" title="Sumber CP &amp; TP untuk tombol Isi dari kurikulum">' +
        [['auto', 'Sumber: Otomatis'], ['admin', 'Sumber: Referensi Admin'], ['bank', 'Sumber: Bank TP (draf)']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === refSumber ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<div class="mp-rel" id="mpfRef" style="margin:0;flex:1;">' + refInfoHtml() + '</div></div>' +
      '<div class="mp-refbar" style="margin-top:6px;"><button type="button" class="btn btn-primary" data-mp="drafauto">✨ Buat draf otomatis</button>' +
      '<div class="mp-rel" style="margin:0;flex:1;">Mengisi bagian yang masih kosong (Pertanyaan Pemantik s.d. Sumber Belajar, serta semua kolom RPM) dari materi, model, metode, dan TP di atas. Bagian yang sudah Anda isi tidak ditimpa.</div>' +
      (editingKey ? '' : '<label style="font-size:13px;white-space:nowrap;display:flex;align-items:center;gap:4px;" title="Draf dibuat dan diperbarui sendiri setelah Materi, Model, Metode, atau TP diubah"><input type="checkbox" id="mpf-autodraf" checked> Otomatis</label>') + '</div>' +
      acc('mpacc-profil', 'Dimensi Profil Lulusan & Panca Cinta',
        '<label class="label">Dimensi Profil Lulusan <span class="text-muted" style="font-weight:400;">(disarankan 2–' + DPL_MAX + '; pilih yang paling relevan)</span></label>' +
        '<div id="mpfDplWarn" class="mp-rel" style="margin:4px 0;"></div>' + checks('mpf-dpl', DPL, m.dpl || []) +
        '<label class="label" style="margin-top:8px;">Panca Cinta (Kurikulum Berbasis Cinta): Sumber, Tanda, dan Tali Cinta</label>' + pancaChecks(m.pancaCinta || []),
        false, 'mpbadge-profil') + rpmAccHtml(m) +
      '<div style="text-align:right;margin:6px 0 2px;"><button type="button" class="btn btn-soft mp-btn" data-mp="accall">↕ Buka / tutup semua bagian</button></div>' +
      secs +
      '</fieldset>' +
      '<div class="mp-actions mp-sticky">' +
        '<button class="btn btn-success" id="mpBtnSimpan" data-mp="simpan">💾 SIMPAN</button>' +
        (editingKey ? '<button class="btn btn-soft" data-mp="dup" data-key="' + esc(editingKey) + '">DUPLIKAT</button>' : '') +
        '<button class="btn btn-soft" data-mp="cetakform">CETAK</button><button class="btn btn-soft" data-mp="pdfform">PDF</button><button class="btn btn-soft" data-mp="cetakrpmform">CETAK RPM</button>' +
        (editingKey ? '<button class="btn btn-warning" data-mp="arsip" data-key="' + esc(editingKey) + '">ARSIPKAN</button>' : '') +
        '<button class="btn btn-soft" data-mp="batal">Batal</button></div></div>';
  }
  // Lencana status tiap bagian akordeon ("✓ terisi" / "n dipilih"); dipanggil ulang setiap isi form berubah.
  function refreshAcc() {
    if (!root) return;
    SECTIONS.forEach(function (s) {
      var el = $('mpf-' + s.k), b = $('mpbadge-' + s.k); if (!el || !b) return;
      b.textContent = el.value.trim() ? '✓ terisi' : (s.req ? 'wajib diisi' : 'kosong');
      b.style.color = el.value.trim() ? '#059669' : (s.req ? '#dc2626' : '');
    });
    var raw = pertCollectRaw(), bpt = $('mpbadge-aktivitas');   // dibaca sekali, dipakai badge & tiap baris
    if (bpt) { var isi = raw.filter(function (p) { return !pertKosong(p); }).length; bpt.textContent = raw.length + ' pertemuan · ' + isi + ' terisi'; bpt.style.color = isi ? '#059669' : ''; }
    Array.prototype.forEach.call(root.querySelectorAll('#mpfPert .mp-pert'), function (d, i) {
      var raw2 = raw[i], b = d.querySelector('.mp-pert-b'), t = d.querySelector('.mp-pert-t');
      if (raw2 && b) { b.textContent = pertKosong(raw2) ? 'kosong' : '✓ terisi'; if (t) t.textContent = pertJudul(raw2, i); }
    });
    var n = root.querySelectorAll('.mpf-dpl:checked, .mpf-panca:checked').length, bp = $('mpbadge-profil');
    if (bp) bp.textContent = n ? n + ' dipilih' : 'kosong';
    dplInfo();
    rpmRefresh();
  }
  function dplInfo() {
    var w = $('mpfDplWarn'); if (!w || !root) return;
    var n = root.querySelectorAll('.mpf-dpl:checked').length;
    if (n > DPL_MAX) { w.style.background = '#fef3c7'; w.innerHTML = 'ℹ️ <b>' + n + '</b> dimensi terpilih. Anjuran 2–' + DPL_MAX + ' agar pembelajaran fokus; tetap boleh disimpan bila memang relevan.'; }
    else { w.style.background = ''; w.innerHTML = '<b>' + n + '</b> dimensi dipilih (anjuran 2–' + DPL_MAX + '). Pilih yang paling kuat dikembangkan pada materi ini.'; }
  }
  // Saran materi: label materi dari bank TP (semua mapel) lalu dari bank kisi-kisi resmi (AQH & BA).
  // Hanya saran; guru tetap bebas mengetik.
  function refreshMateriSaran() {
    var dl = $('mpDlMateri'); if (!dl) return;
    var mapel = val('mpf-mapel'), seen = {}, out = [];
    var tambah = function (m) { var t = String(m || '').trim(); if (t && !seen[t]) { seen[t] = 1; out.push(t); } };
    var tp = window.BANK_TP_MI, kr = window.BANK_KISI_RESMI_MI;
    if (tp && tp.mapel) Object.keys(tp.mapel).forEach(function (k) {
      var mp = tp.mapel[k]; if (!mp || mp.nama !== mapel) return;
      Object.keys(mp.tp || {}).forEach(function (f) { (mp.tp[f] || []).forEach(function (t) { tambah(t && t[2]); }); });
    });
    if (kr) Object.keys(kr).forEach(function (k) {
      (kr[k] || []).forEach(function (e) { if (e.mp === mapel) tambah(e.materi); });
    });
    dl.innerHTML = out.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
  }
  // Isian beruntun pada formulir: Mapel -> Kelas -> (Semester, Materi) -> (Alokasi, Model) -> bagian 2 dst.
  // Kolom yang terkunci tetap menyimpan nilainya; yang dikunci hanya masukan dari pengguna.
  function urutkanForm() {
    if (!root || !$('mpf-mapel')) return;
    var okMapel = !!val('mpf-mapel'), okKelas = okMapel && !!val('mpf-kelas'), okMateri = okKelas && !!val('mpf-materi');
    var kunci = function (ids, buka) {
      ids.forEach(function (id) {
        var el = $(id); if (el) el.disabled = !buka;
        var bt = root.querySelector('[data-for="' + id + '"]'); if (bt) bt.disabled = !buka;
      });
    };
    kunci(['mpf-kelas'], okMapel);
    kunci(['mpf-semester', 'mpf-materi'], okKelas);
    kunci(['mpf-alokasi', 'mpf-model'], okMateri);
    var fs = $('mpfLanjut'); if (fs) fs.disabled = !okMateri;
    var info = $('mpfLanjutInfo');
    if (info) {
      info.hidden = okMateri;
      info.textContent = !okMapel ? '1️⃣ Pilih Mata Pelajaran dahulu, lalu Kelas dan Materi. Bagian berikutnya terbuka setelah Identitas Modul terisi.'
        : !okKelas ? '2️⃣ Pilih Kelas.' : '3️⃣ Isi Materi agar bagian berikutnya terbuka.';
    }
  }
  function bindForm() {
    var k = $('mpf-kelas'); if (!k) return;
    var upd = function () {
      var rel = $('mpfRel'); if (!rel) return;
      rel.innerHTML = '<b>Hubungan kelas:</b> ' + relasi({ mapel: val('mpf-mapel') || '(mapel)', kelas: val('mpf-kelas') }, val('mpf-guru'));
    };
    var auto = function () { if (!editingKey) applyRef(true); };
    k.addEventListener('change', function () { var f = faseDari(k.value); if ($('mpf-fase') && (f || !k.value)) $('mpf-fase').value = f; upd(); auto(); urutkanForm(); });
    var mp = $('mpf-mapel'); if (mp) mp.addEventListener('change', function () { batasiKelas(); upd(); auto(); refreshMateriSaran(); autoSaran(); autoProfil(); urutkanForm(); });
    refreshMateriSaran();
    var fs = $('mpf-fase'); if (fs) fs.addEventListener('change', auto);
    var sr = $('mpf-sumberref'); if (sr) sr.addEventListener('change', function () { refSumber = sr.value; applyRef(false); });   // ganti sumber = muat ulang CP/TP (minta konfirmasi bila sudah diedit)
    upd(); refreshRefInfo();
    // Modul baru: langsung isi dari entri jadwal pertama (guru bisa mengganti pilihannya).
    if (!editingKey) {
      var jo = $('mpfJadwal');
      if (jo && jo.options.length > 1 && !jo.value) { jo.value = jo.options[1].value; isiDariJadwal(jo.value); }
    }
    if (refLoaded && !editingKey) applyRef(true);
    autoSaran();
    autoProfil();
    urutkanForm();
    refreshAcc();
  }
  function collect() {
    var o = {
      sekolah: val('mpf-sekolah'), mapel: val('mpf-mapel'), kelas: val('mpf-kelas'), fase: val('mpf-fase'),
      semester: val('mpf-semester'), tahunAjaran: val('mpf-ta'), guru: val('mpf-guru'), materi: val('mpf-materi'),
      alokasi: val('mpf-alokasi'), model: val('mpf-model'), metode: val('mpf-metode'), pendekatan: val('mpf-pendekatan')
    };
    SECTIONS.forEach(function (s) { o[s.k] = val('mpf-' + s.k); });
    var pilih = function (cls) { return Array.prototype.map.call(root.querySelectorAll('.' + cls + ':checked'), function (el) { return el.value; }); };
    o.dpl = pilih('mpf-dpl'); o.pancaCinta = pilih('mpf-panca');
    RPM_FIELDS.forEach(function (f) { o[f.k] = val('mpf-' + f.k); });
    var cbL = $('mpf-rpmLengkap'); o.rpmLengkap = (cbL && cbL.checked) ? '1' : '';
    o.pertemuan = pertCollect();
    o.aktivitas = ratakan(o.pertemuan, 'aktivitas'); o.asesmen = ratakan(o.pertemuan, 'asesmen');
    o.kurikulumVersi = formRef ? (formRef.versi || null) : null;
    o.kurikulumRefKey = formRef ? formRef.key : null;
    o.kurikulumAt = formRef ? (formRef.at || null) : null;
    return o;
  }

  /* ---------- draf otomatis (berbasis template, tanpa AI/server) ----------
     Mengisi bagian yang KOSONG (pemantik s.d. sumber belajar) dari materi, model, metode, alokasi, dan TP.
     Bagian yang sudah diisi/diubah guru TIDAK ditimpa. Bagian hasil draf sebelumnya (lastDraft) boleh diperbarui
     bila tombol ditekan lagi (mis. setelah materi atau model diganti). CP & TP tetap dari Referensi Kurikulum. */
  var lastDraft = {};
  var SINTAKS = [
    { re: /problem|masalah/i, langkah: [
      'Orientasi pada masalah: guru menyajikan masalah kontekstual tentang {materi}.',
      'Mengorganisasikan murid: membentuk kelompok dan membagi tugas penyelidikan.',
      'Membimbing penyelidikan: kelompok mengumpulkan informasi dan mencoba memecahkan masalah.',
      'Mengembangkan dan menyajikan hasil: kelompok mempresentasikan penyelesaiannya.',
      'Menganalisis dan mengevaluasi proses pemecahan masalah bersama guru.'] },
    { re: /project|proyek/i, langkah: [
      'Penentuan pertanyaan mendasar: guru mengajukan pertanyaan yang mengarahkan proyek tentang {materi}.',
      'Mendesain perencanaan proyek: murid menyusun rencana dan membagi peran dalam kelompok.',
      'Menyusun jadwal: kelompok menentukan langkah kerja dan waktu penyelesaian.',
      'Memonitor pelaksanaan: guru mendampingi dan memantau kemajuan proyek.',
      'Menguji hasil dan mempresentasikan produk proyek.',
      'Evaluasi pengalaman: guru dan murid merefleksikan proses serta hasil proyek.'] },
    { re: /discovery|penemuan/i, langkah: [
      'Stimulasi: guru menampilkan contoh atau situasi yang memancing rasa ingin tahu tentang {materi}.',
      'Identifikasi masalah: murid merumuskan hal yang ingin ditemukan.',
      'Pengumpulan data: murid mengamati, membaca, atau mencoba untuk mengumpulkan informasi.',
      'Pengolahan data: murid menganalisis dan menafsirkan data yang diperoleh.',
      'Pembuktian: murid memeriksa kebenaran temuannya bersama teman dan guru.',
      'Generalisasi: murid menarik kesimpulan dari hasil temuan.'] },
    { re: /inquiry|inkuiri/i, langkah: [
      'Orientasi: guru menyiapkan suasana belajar dan menyampaikan topik {materi}.',
      'Merumuskan masalah: murid menyusun pertanyaan yang akan diselidiki.',
      'Mengajukan hipotesis: murid membuat dugaan sementara.',
      'Mengumpulkan data untuk menguji dugaan tersebut.',
      'Menguji hipotesis: murid membandingkan data dengan dugaan awal.',
      'Merumuskan kesimpulan bersama.'] },
    { re: /cooperative|kooperatif/i, langkah: [
      'Guru menyampaikan tujuan pembelajaran dan memotivasi murid.',
      'Guru menyajikan informasi pokok tentang {materi}.',
      'Murid dibagi ke dalam kelompok belajar yang heterogen.',
      'Guru membimbing kelompok saat bekerja dan belajar bersama.',
      'Kelompok mempresentasikan hasil kerja dan guru memberi penguatan.',
      'Guru memberi penghargaan atas hasil belajar individu dan kelompok.'] }
  ];
  // Penyesuaian draf RPM untuk mapel rumpun PAI & Bahasa Arab. {M} = materi. Hanya contoh awal; guru wajib menyesuaikan dengan TP/CP.
  var MAPEL_MADRASAH = [
    { re: /bahasa arab/i, nama: 'Bahasa Arab', panca: ['Cinta ilmu', 'Cinta diri dan sesama'],
      kaitan: 'mempelajari bahasa Al-Quran dan Hadis sebagai kunci memahami sumber ajaran Islam, sambil berlatih santun dan percaya diri saat berkomunikasi pada materi {M}.',
      lintas: ['Bahasa Indonesia/Inggris: membandingkan kosakata dan struktur kalimat sederhana.', 'Al-Quran Hadis: kosakata Arab yang dijumpai dalam bacaan.', 'Seni dan Budaya: kaligrafi atau poster kosakata bertema {M}.'],
      pembiasaan: 'Guru menyapa dengan salam dan ungkapan sederhana berbahasa Arab, dan murid menjawabnya.',
      memahami: 'Murid menyimak (istima’) dan menirukan kosakata serta kalimat tentang {M}, lalu memahami artinya.',
      mengaplikasi: 'Murid bercakap berpasangan (kalam), membaca (qira’ah), dan menulis (kitabah) kalimat sederhana tentang {M}.',
      merefleksi: 'Murid menilai kemampuan sendiri dan menentukan kosakata atau pola kalimat yang masih perlu dilatih.',
      asesProses: 'Observasi keterampilan menyimak dan berbicara serta penilaian latihan membaca dan menulis.',
      asesAkhir: 'Tes lisan (percakapan/hafalan kosakata) dan tes tertulis tentang {M}.' },
    { re: /qur.?an|hadis|hadits/i, nama: 'Al-Quran Hadis', panca: ['Cinta kepada Allah dan Rasul-Nya', 'Cinta ilmu'],
      kaitan: 'membaca, memahami, dan mengamalkan pesan pokok {M} sebagai wujud cinta kepada Al-Quran, Hadis, dan Rasulullah SAW.',
      lintas: ['Bahasa Arab: kosakata dan struktur kalimat dalam {M}.', 'Bahasa Indonesia: murid menuliskan arti dan pesan pokok {M} dengan kata sendiri.', 'Akidah Akhlak: pesan {M} dihubungkan dengan akhlak sehari-hari.'],
      pembiasaan: 'Murid membaca ayat atau surat pendek bersama (sesuai kebiasaan madrasah).',
      memahami: 'Guru membacakan (talaqqi) dan murid menirukan dengan memperhatikan makhraj dan tajwid, kemudian memahami arti dan pesan pokok {M}.',
      mengaplikasi: 'Murid membaca atau menghafal secara bergantian, menuliskan pesan pokok dengan kata sendiri, dan mencontohkan pengamalannya.',
      merefleksi: 'Murid merenungkan pesan {M} dan menentukan satu amalan yang akan dibiasakan.',
      asesProses: 'Penilaian bacaan secara lisan (ketepatan makhraj dan tajwid) dan observasi keaktifan.',
      asesAkhir: 'Tes bacaan/hafalan lisan dan tes tertulis tentang arti serta pesan pokok {M}.' },
    { re: /akidah|akhlak/i, nama: 'Akidah Akhlak', panca: ['Cinta kepada Allah dan Rasul-Nya', 'Cinta diri dan sesama'],
      kaitan: 'meneladani sifat Allah dan akhlak Rasulullah SAW yang berkaitan dengan {M}, kemudian membiasakannya dalam sikap sehari-hari di rumah, kelas, dan lingkungan.',
      lintas: ['Bahasa Indonesia: murid menceritakan kisah teladan yang berkaitan dengan {M}.', 'Pendidikan Pancasila: nilai {M} dihubungkan dengan sikap sebagai warga yang baik.', 'Seni dan Budaya: murid membuat poster atau karya sederhana bertema {M}.'],
      pembiasaan: 'Guru mengajak murid melantunkan asmaul husna atau shalawat bersama (sesuai kebiasaan madrasah).',
      memahami: 'Murid menyimak kisah atau contoh akhlak terpuji yang berkaitan dengan {M}, lalu mengidentifikasi sikap yang patut diteladani.',
      mengaplikasi: 'Murid membuat komitmen pembiasaan berkaitan dengan {M} dan mencatatnya pada jurnal pembiasaan harian.',
      merefleksi: 'Murid menilai diri sendiri atas pembiasaan tersebut dan mengungkapkan rasa syukur kepada Allah SWT.',
      asesProses: 'Observasi sikap dan pembiasaan melalui jurnal harian serta penilaian teman sebaya.',
      asesAkhir: 'Tes lisan/tertulis tentang pemahaman {M}, ditambah penilaian sikap melalui observasi dan jurnal.' },
    { re: /fikih|fiqih|fiqh/i, nama: 'Fikih', panca: ['Cinta kepada Allah dan Rasul-Nya', 'Cinta lingkungan'],
      kaitan: 'memahami ketentuan {M} sebagai wujud ketaatan kepada Allah dan Rasul-Nya, serta menumbuhkan sikap disiplin, bersih, dan peduli lingkungan saat mempraktikkannya.',
      lintas: ['IPAS/Sains: hubungan {M} dengan kebersihan, kesehatan, atau lingkungan (bila relevan).', 'Bahasa Arab: istilah-istilah penting dalam {M}.', 'Bahasa Indonesia: murid menyampaikan hasil praktik secara lisan.'],
      pembiasaan: 'Guru memastikan kesiapan dan kebersihan tempat belajar sebelum kegiatan dimulai.',
      memahami: 'Guru mendemonstrasikan tata cara {M}, murid mengamati dan memahami ketentuan serta urutannya.',
      mengaplikasi: 'Murid mempraktikkan {M} secara bergantian dengan lembar observasi dari teman.',
      merefleksi: 'Murid menilai ketepatan praktiknya dan menghubungkannya dengan rasa syukur serta ketaatan kepada Allah.',
      asesProses: 'Unjuk kerja (praktik) dengan lembar observasi ketepatan tata cara.',
      asesAkhir: 'Tes lisan/tertulis tentang ketentuan {M} dan unjuk kerja praktik.' },
    { re: /sejarah kebudayaan|\bski\b/i, nama: 'Sejarah Kebudayaan Islam', panca: ['Cinta ilmu', 'Cinta diri dan sesama'],
      kaitan: 'mengambil ibrah dari peristiwa dan tokoh dalam {M} sebagai teladan, serta menumbuhkan cinta kepada Rasulullah SAW dan semangat berkarya bagi sesama.',
      lintas: ['IPS: kaitan {M} dengan peristiwa sejarah, tempat, dan waktu.', 'Bahasa Indonesia: murid menceritakan ulang kisah {M}.', 'Seni dan Budaya: dramatisasi singkat atau gambar tentang {M}.'],
      pembiasaan: 'Guru mengajak murid berdoa dan bershalawat bersama (sesuai kebiasaan madrasah).',
      memahami: 'Murid menyimak kisah atau peristiwa {M} dan mengurutkan tokoh serta kejadian pentingnya.',
      mengaplikasi: 'Murid membuat linimasa, peta konsep, atau dramatisasi singkat tentang {M}.',
      merefleksi: 'Murid menemukan ibrah (pelajaran) dari {M} dan menghubungkannya dengan kehidupan mereka sekarang.',
      asesProses: 'Penilaian produk (linimasa/peta konsep/dramatisasi) dengan rubrik dan observasi kerja sama.',
      asesAkhir: 'Tes tertulis/lisan tentang peristiwa, tokoh, dan ibrah dalam {M}.' }
  ];
  function mdFor(mapel) {
    var md = null;
    MAPEL_MADRASAH.forEach(function (x) { if (!md && x.re.test(mapel || '')) md = x; });
    return md;
  }
  var SINTAKS_UMUM = [
    'Mengamati: murid mengamati gambar, benda, atau contoh yang berkaitan dengan {materi}.',
    'Menanya: murid mengajukan pertanyaan tentang hal yang diamati.',
    'Mengumpulkan informasi: murid mencoba, membaca, atau berdiskusi untuk menjawab pertanyaan.',
    'Menalar: murid mengolah informasi dan menghubungkannya dengan pengetahuan sebelumnya.',
    'Mengomunikasikan: murid menyampaikan hasil secara lisan atau tertulis, guru memberi penguatan.'
  ];
  // "2 × 35 menit" -> 70 ; "70 menit" -> 70 ; selain itu 0 (waktu per tahap dilewati).
  function menitTotal(alokasi) {
    var s = String(alokasi || ''), m = s.match(/(\d+)\s*[x×*]\s*(\d+)/i);
    if (m) return parseInt(m[1], 10) * parseInt(m[2], 10);
    m = s.match(/(\d+)\s*menit/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  function daftarBaris(t) {
    return String(t || '').split('\n').map(function (x) { return x.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
  }
  function bernomor(arr) { return arr.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'); }
  function bullets(arr) { return arr.map(function (x) { return '- ' + x; }).join('\n'); }

  function susunDraf(c) {
    var M = c.materi, tp = c.tp || [], out = {};
    var mnt = menitTotal(c.alokasi), pen = 0, tut = 0, inti = 0;
    if (mnt >= 20) { pen = Math.max(5, Math.round(mnt * 0.15 / 5) * 5); tut = pen; inti = mnt - pen - tut; }
    var wkt = function (n) { return n > 0 ? ' (' + n + ' menit)' : ''; };
    var sx = null;
    SINTAKS.forEach(function (s) { if (!sx && s.re.test(c.model || '')) sx = s; });
    var langkah = (sx ? sx.langkah : SINTAKS_UMUM).map(function (x) { return x.replace(/\{materi\}/g, M); });

    out.pemantik = bernomor([
      'Pernahkah kamu melihat atau mengalami hal yang berkaitan dengan ' + M + '? Ceritakan!',
      'Menurutmu, mengapa ' + M + ' penting untuk dipelajari?',
      'Apa yang ingin kamu ketahui lebih dalam tentang ' + M + '?'
    ]);

    out.materiIsi = 'Materi pokok: ' + M + ' (' + c.mapel + ', Kelas ' + c.kelas + (c.fase ? ', Fase ' + c.fase : '') + ').\n\n' +
      (tp.length ? 'Uraian materi diarahkan agar murid mencapai:\n' + bullets(tp) + '\n\n' : '') +
      'Cakupan (lengkapi dari buku pegangan):\n' +
      bullets(['Pengertian dan konsep utama ' + M, 'Contoh dalam kehidupan sehari-hari', 'Hal penting yang perlu diingat murid']);

    var info = [];
    if (c.alokasi) info.push('Alokasi waktu: ' + c.alokasi);
    if (c.model) info.push('Model: ' + c.model);
    if (c.metode) info.push('Metode: ' + c.metode);
    if (c.pendekatan) info.push('Pendekatan: ' + c.pendekatan);
    out.aktivitas = (info.length ? info.join(' | ') + '\n\n' : '') +
      'A. Pendahuluan' + wkt(pen) + '\n' + bernomor([
        'Guru membuka pembelajaran dengan salam, doa bersama, dan mengecek kehadiran serta kesiapan murid.',
        'Guru menyampaikan tujuan pembelajaran dan manfaat mempelajari ' + M + '.',
        'Guru mengajukan pertanyaan pemantik dan mengaitkannya dengan pengalaman murid.'
      ]) + '\n\n' +
      'B. Kegiatan Inti' + wkt(inti) + '\n' + bernomor(langkah) + '\n\n' +
      'C. Penutup' + wkt(tut) + '\n' + bernomor([
        'Murid bersama guru menyimpulkan materi ' + M + '.',
        'Guru dan murid melakukan refleksi pembelajaran.',
        'Guru menyampaikan tindak lanjut dan rencana pembelajaran berikutnya.',
        'Pembelajaran ditutup dengan doa dan salam.'
      ]);

    out.kokurikuler = 'Penguatan karakter yang dikaitkan dengan ' + M + ':\n' +
      bullets([
        'Dimensi Profil Lulusan: ' + (c.dpl.length ? c.dpl.join(', ') : '(pilih pada bagian Dimensi Profil Lulusan)'),
        'Panca Cinta: ' + (c.panca.length ? c.panca.map(labelPanca).join(', ') : '(pilih pada bagian Panca Cinta)'),
        'Pembiasaan: berdoa bersama, bekerja sama dalam kelompok, saling menghargai pendapat, dan menjaga kebersihan kelas'
      ]);

    out.lkpd = 'LKPD: ' + M + '\nNama: ____________  Kelas: ' + c.kelas + '  Kelompok: ______\n\n' +
      'Petunjuk:\n' + bernomor(['Berdoalah sebelum mengerjakan.', 'Bacalah setiap kegiatan dengan teliti.', 'Kerjakan bersama kelompokmu dan tanyakan kepada guru jika ada yang belum jelas.']) + '\n\n' +
      'Kegiatan 1: Amati/kerjakan tugas yang diberikan guru tentang ' + M + ', lalu tuliskan hasilnya.\n' +
      'Kegiatan 2: Jawablah pertanyaan berikut.\n' +
      (tp.length ? tp.map(function (x, i) { return 'Soal ' + (i + 1) + ': (buat pertanyaan untuk tujuan: ' + x + ')'; }).join('\n')
                 : 'Soal 1: (tuliskan pertanyaan sesuai tujuan pembelajaran)');

    out.media = bullets(['Papan tulis dan spidol', 'Gambar, poster, atau slide tentang ' + M, 'Video pendek atau benda nyata yang berkaitan (jika tersedia)', 'Lembar Kerja Peserta Didik (LKPD)', 'Buku pegangan ' + c.mapel + ' Kelas ' + c.kelas]);

    out.asesmen = '1. Asesmen diagnostik: tanya jawab lisan di awal untuk memetakan pengetahuan awal murid.\n' +
      '2. Asesmen formatif: observasi keaktifan dan kerja sama, penilaian LKPD, dan tanya jawab selama pembelajaran.\n' +
      '3. Asesmen sumatif: tes tertulis/lisan atau unjuk kerja pada akhir materi.\n\n' +
      'Indikator ketercapaian:\n' + (tp.length ? bullets(tp) : '- Sesuaikan dengan tujuan pembelajaran') + '\n\n' +
      'Rubrik (contoh):\n' +
      '4 - Sangat baik: memenuhi seluruh indikator dengan tepat dan mandiri\n' +
      '3 - Baik: memenuhi sebagian besar indikator dengan sedikit bantuan\n' +
      '2 - Cukup: memenuhi sebagian indikator dengan bimbingan\n' +
      '1 - Perlu bimbingan: belum memenuhi indikator';

    out.tugas = 'Tugas individu: merangkum pokok-pokok ' + M + ' dengan kata-kata sendiri.\n' +
      'Tugas rumah: mencari contoh ' + M + ' di lingkungan sekitar dan menceritakannya pada pertemuan berikutnya.';

    out.refleksi = 'Refleksi guru:\n' +
      bullets(['Apakah tujuan pembelajaran tercapai?', 'Bagian mana yang berjalan baik dan bagian mana yang perlu diperbaiki?', 'Murid mana yang perlu pendampingan lebih?']) + '\n\n' +
      'Refleksi murid:\n' +
      bullets(['Hal baru yang kupelajari hari ini adalah ...', 'Bagian yang masih sulit bagiku adalah ...', 'Aku ingin belajar lebih lanjut tentang ...']);

    out.pengayaan = 'Untuk murid yang sudah mencapai tujuan pembelajaran:\n' +
      bullets(['Mengerjakan soal atau tugas tingkat lanjut tentang ' + M, 'Menjadi tutor sebaya bagi teman yang membutuhkan', 'Membuat karya sederhana (poster/cerita/ringkasan) tentang ' + M]);

    out.remedial = 'Untuk murid yang belum mencapai tujuan pembelajaran:\n' +
      bullets(['Penjelasan ulang dengan media atau contoh yang lebih sederhana', 'Bimbingan dalam kelompok kecil atau tutor sebaya', 'Latihan tambahan yang bertahap', 'Asesmen ulang setelah pendampingan']);

    out.sumber = bullets(['Buku teks ' + c.mapel + ' Kelas ' + c.kelas + ' yang digunakan madrasah', 'Lingkungan sekitar madrasah dan pengalaman murid', 'Sumber daring yang sesuai usia (tulis tautannya di sini)']);

    /* ---- RPM: kolom Rencana Pembelajaran Mendalam & KBC (semua kolom, termasuk versi lengkap) ---- */
    var NILAI_PANCA = {
      'Cinta kepada Allah dan Rasul-Nya': 'mensyukuri ciptaan dan nikmat Allah serta meneladani akhlak Rasulullah SAW ketika mempelajari ' + M,
      'Cinta ilmu': 'memandang ilmu tentang ' + M + ' sebagai cahaya cinta Allah yang menumbuhkan rasa ingin tahu',
      'Cinta lingkungan': 'menjaga lingkungan sebagai tanda cinta Allah dan mengaitkannya dengan ' + M,
      'Cinta diri dan sesama': 'menghargai diri sendiri dan teman, bekerja sama, serta saling membantu saat mempelajari ' + M,
      'Cinta tanah air': 'menumbuhkan rasa syukur dan tanggung jawab sebagai warga negara melalui ' + M
    };
    var MD = null;
    MAPEL_MADRASAH.forEach(function (x) { if (!MD && x.re.test(c.mapel || '')) MD = x; });
    var pcDef = !(c.panca && c.panca.length), pcList = pcDef ? profilMapel(c.mapel).panca : c.panca;
    out.rpmIntegrasiKbc = bullets(pcList.map(function (p) { return labelPanca(p) + (grupPancaDari(p) ? ' (' + grupPancaDari(p) + ')' : '') + ': ' + (NILAI_PANCA[p] || 'dikaitkan dengan ' + M) + '.'; })) +
      (pcDef ? '\n(Contoh awal: pilih Panca Cinta yang sesuai pada bagian Profil, lalu sesuaikan kalimat ini.)' : '');

    out.rpmKarakter = karakterMateri(c.mapel, M, c.kelas, c.fase);
    var jml = jumlahSiswa(c.kelas);
    out.rpmKesiapan = bullets([
      'Pengetahuan awal tentang ' + M + ' dipetakan melalui asesmen awal.',
      'Minat, gaya belajar (visual, auditori, kinestetik), dan kebutuhan belajar murid beragam sehingga dilayani dengan pembelajaran berdiferensiasi.',
      'Kesiapan sosial-emosional dan kebiasaan belajar (fokus, kerja sama, berani bertanya) diamati di awal pembelajaran.'
    ].concat(jml ? ['Jumlah murid: ' + jml + ' siswa.'] : []));

    var lt = [['Bahasa Indonesia', 'murid menyampaikan hasil belajar ' + M + ' secara lisan dan tulisan'],
      ['Seni dan Budaya', 'murid membuat karya (poster, gambar, atau cerita) tentang ' + M],
      ['Pendidikan Agama Islam', 'nilai-nilai Islam yang berkaitan dengan ' + M + ' dihubungkan dengan kehidupan sehari-hari']]
      .filter(function (x) { return String(c.mapel).toLowerCase() !== x[0].toLowerCase(); });
    out.rpmLintas = bullets(lt.map(function (x) { return x[0] + ': ' + x[1] + '.'; }));

    var pd = [];
    if (c.model) pd.push('Model: ' + c.model);
    if (c.metode) pd.push('Metode: ' + c.metode);
    if (c.pendekatan) pd.push('Pendekatan: ' + c.pendekatan);
    out.rpmPedagogis = bullets([
      pd.length ? pd.join(' | ') : 'Pembelajaran berpusat pada murid dengan bimbingan guru.',
      'Pembelajaran berkesadaran, bermakna, dan menggembirakan melalui olah pikir, olah hati, olah rasa, dan olah raga.',
      'Diferensiasi konten, proses, dan produk sesuai kesiapan serta minat murid.',
      'Kolaborasi dalam kelompok dan umpan balik yang membangun dari guru maupun teman.'
    ]);

    out.rpmLingkungan = bullets([
      'Aman: kelas bebas dari perundungan, murid berani bertanya dan berpendapat.',
      'Nyaman: ruang kelas bersih, tertata, dan memungkinkan murid bergerak serta berkelompok.',
      'Ramah: guru dan murid saling menyapa, menghargai, dan mendengarkan.',
      'Menyenangkan: kegiatan dirancang dengan variasi dan apresiasi atas usaha murid.',
      'Sejahtera: kebutuhan belajar dan kesejahteraan emosional murid diperhatikan.'
    ]);

    out.rpmKemitraan = bullets([
      'Orang tua/wali: mendampingi tugas rumah dan memberi dukungan belajar di rumah.',
      'Guru lain/wali kelas: berbagi informasi tentang kebutuhan belajar murid.',
      'Narasumber atau tokoh masyarakat sekitar (bila memungkinkan) yang berkaitan dengan ' + M + '.',
      'Teman sebaya: tutor sebaya dan belajar kelompok.'
    ]);

    out.rpmDigital = bullets([
      'Slide atau video pendek tentang ' + M + ' (bila perangkat tersedia).',
      'Kuis interaktif sederhana untuk asesmen formatif.',
      'Pencarian informasi daring yang dipandu guru dan sesuai usia murid.',
      'Jika perangkat digital tidak tersedia, gunakan media konkret dan cetak sebagai gantinya.'
    ]);

    out.rpmPendahuluan = 'Pendahuluan' + wkt(pen) + '\n' + bernomor([
      'Murid menenangkan diri (napas dalam atau hening sejenak) dan berdoa bersama sebagai awal belajar yang berkesadaran.',
      'Guru menyapa dengan hangat, mengecek kehadiran dan kesiapan murid.',
      'Guru mengajukan pertanyaan pemantik tentang ' + M + ' serta menyampaikan tujuan dan manfaat pembelajaran.'
    ]);

    var nL = langkah.length, ka = Math.ceil(nL / 3), kb = Math.ceil(2 * nL / 3);
    out.rpmMemahami = 'Prinsip: berkesadaran dan bermakna.\n' + bernomor(langkah.slice(0, ka)) + '\nNilai cinta: guru mengaitkan ' + M + ' dengan ' + pcList.map(labelPanca).join(', ') + '.';
    out.rpmMengaplikasi = 'Prinsip: bermakna dan menggembirakan.\n' + bernomor(langkah.slice(ka, kb)) + '\nMurid menerapkan pemahamannya pada tugas atau kasus nyata yang bermakna, dikerjakan bersama teman dengan gembira.';
    out.rpmMerefleksi = 'Prinsip: berkesadaran.\n' + bernomor(langkah.slice(kb)) + '\nMurid merenungkan proses dan hasil belajarnya (apa yang dipelajari, perasaan, dan nilai cinta yang ditemukan) pada jurnal atau kartu refleksi.';

    out.rpmPenutup = 'Penutup' + wkt(tut) + '\n' + bernomor([
      'Murid bersama guru menyimpulkan materi ' + M + '.',
      'Guru memberi umpan balik dan apresiasi atas usaha murid.',
      'Guru menyampaikan tindak lanjut dan rencana pembelajaran berikutnya.',
      'Pembelajaran ditutup dengan doa dan salam.'
    ]);

    out.rpmAsesAwal = 'Tanya jawab lisan atau kuis singkat untuk memetakan pengetahuan awal tentang ' + M + '.\nObservasi kesiapan dan minat belajar murid.';
    out.rpmAsesProses = 'Observasi keaktifan, kerja sama, dan sikap (termasuk nilai cinta yang dipilih).\nPenilaian LKPD/produk kelompok dan tanya jawab selama pembelajaran, disertai umpan balik langsung.';
    out.rpmAsesAkhir = 'Tes tertulis/lisan atau unjuk kerja pada akhir materi.\nIndikator ketercapaian:\n' + (tp.length ? bullets(tp) : '- Sesuaikan dengan tujuan pembelajaran');
    out.rpmRubrik = '4 - Sangat baik: memenuhi seluruh indikator dengan tepat dan mandiri\n3 - Baik: memenuhi sebagian besar indikator dengan sedikit bantuan\n' +
      '2 - Cukup: memenuhi sebagian indikator dengan bimbingan\n1 - Perlu bimbingan: belum memenuhi indikator';
    out.rpmKktp = 'Murid dinyatakan mencapai tujuan pembelajaran bila memenuhi kriteria berikut (mengacu pada rubrik di atas):\n' +
      (tp.length ? tp.map(function (x, i) { return 'TP ' + (i + 1) + ': ' + x + ' → skor rubrik minimal 3 (Baik).'; }).join('\n')
                 : '- Capaian tujuan pembelajaran ' + M + ' → skor rubrik minimal 3 (Baik).') +
      '\nSkor 4 (Sangat baik): dapat diberi kegiatan pengayaan.\nSkor 1-2: mengikuti program remedial lalu asesmen ulang.\n' +
      '(Batas skor adalah contoh awal; sesuaikan dengan kesepakatan madrasah.)';

    if (MD) {   // lapisan khusus mapel madrasah
      var sub = function (t) { return String(t).replace(/\{M\}/g, M); };
      out.rpmIntegrasiKbc += '\nKaitan dengan ' + MD.nama + ': ' + sub(MD.kaitan);
      out.rpmLintas = bullets(MD.lintas.map(sub));
      out.rpmPendahuluan += '\n4. ' + sub(MD.pembiasaan);
      out.rpmMemahami += '\n' + sub(MD.memahami);
      out.rpmMengaplikasi += '\n' + sub(MD.mengaplikasi);
      out.rpmMerefleksi += '\n' + sub(MD.merefleksi);
      out.rpmAsesProses += '\n' + sub(MD.asesProses);
      out.rpmAsesAkhir = out.rpmAsesAkhir.replace(/^[^\n]*/, sub(MD.asesAkhir));
      out._mapel = MD.nama;
    }
    return out;
  }

  // Draf per pertemuan: langkah inti sintaks model dibagi rata ke semua pertemuan, TP dibagi sebagai tujuan tiap pertemuan.
  function susunPertemuan(c, n) {
    var M = c.materi, tp = c.tp || [], mnt = menitTotal(c.alokasi), pen = 0, tut = 0, inti = 0;
    if (mnt >= 20) { pen = Math.max(5, Math.round(mnt * 0.15 / 5) * 5); tut = pen; inti = mnt - pen - tut; }
    var wkt = function (x) { return x > 0 ? ' (' + x + ' menit)' : ''; };
    var sx = null;
    SINTAKS.forEach(function (s) { if (!sx && s.re.test(c.model || '')) sx = s; });
    var langkah = (sx ? sx.langkah : SINTAKS_UMUM).map(function (x) { return x.replace(/\{materi\}/g, M); });
    var L = langkah.length, res = [];
    var MD = mdFor(c.mapel), subM = function (t) { return String(t).replace(/\{M\}/g, M); };
    var info = [];
    if (c.model) info.push('Model: ' + c.model);
    if (c.metode) info.push('Metode: ' + c.metode);
    if (c.pendekatan) info.push('Pendekatan: ' + c.pendekatan);
    for (var i = 0; i < n; i++) {
      var awal = Math.floor(i * L / n), akhir = Math.floor((i + 1) * L / n), pertama = i === 0, terakhir = i === n - 1;
      var langkahI = langkah.slice(awal, akhir);
      if (!langkahI.length) langkahI = ['Murid melanjutkan dan mendalami kegiatan tentang ' + M + ' dengan bimbingan guru.'];
      if (MD) {   // kegiatan khas mapel: Memahami di awal, Mengaplikasi di tengah, Merefleksi di akhir rangkaian pertemuan
        var tahap = n === 1 ? [0, 1, 2] : (n === 2 ? (i === 0 ? [0] : [1, 2]) : (i === 0 ? [0] : (terakhir ? [2] : [1])));
        var kunciT = ['memahami', 'mengaplikasi', 'merefleksi'];
        tahap.forEach(function (f) { langkahI.push(subM(MD[kunciT[f]])); });
      }
      var a = Math.floor(i * tp.length / n), b = Math.floor((i + 1) * tp.length / n), tpI = tp.slice(a, b);
      if (!tpI.length && tp.length) tpI = [tp[Math.min(i, tp.length - 1)]];
      var judul = n === 1 ? M : (pertama ? 'Pengenalan ' : (terakhir ? 'Penerapan dan penilaian ' : 'Pendalaman ')) + M;
      var buka = ['Guru membuka pembelajaran dengan salam, doa bersama, dan mengecek kehadiran serta kesiapan murid.',
        pertama ? 'Guru menyampaikan tujuan pembelajaran dan manfaat mempelajari ' + M + '.' : 'Guru mengulas materi pertemuan sebelumnya dan menyampaikan tujuan pertemuan hari ini.',
        'Guru mengajukan pertanyaan pemantik dan mengaitkannya dengan pengalaman murid.'];
      var tutup = [terakhir ? 'Murid bersama guru menyimpulkan seluruh materi ' + M + '.' : 'Murid bersama guru menyimpulkan kegiatan hari ini.',
        'Guru dan murid melakukan refleksi pembelajaran.',
        terakhir ? 'Guru menyampaikan tindak lanjut pembelajaran.' : 'Guru menyampaikan rencana pembelajaran pertemuan berikutnya.',
        'Pembelajaran ditutup dengan doa dan salam.'];
      if (MD) buka.splice(1, 0, subM(MD.pembiasaan));
      var ases = [];
      if (pertama) ases.push('Asesmen diagnostik: tanya jawab lisan di awal untuk memetakan pengetahuan awal murid.');
      ases.push(MD ? 'Asesmen formatif: ' + subM(MD.asesProses) : 'Asesmen formatif: observasi keaktifan dan kerja sama, penilaian LKPD, dan tanya jawab selama pembelajaran.');
      var asesTeks = bernomor(ases);
      if (terakhir) asesTeks += '\n' + (ases.length + 1) + '. Asesmen sumatif: ' + (MD ? subM(MD.asesAkhir) : 'tes tertulis/lisan atau unjuk kerja pada akhir materi.') + '\n\n' +
        'Indikator ketercapaian:\n' + (tp.length ? bullets(tp) : '- Sesuaikan dengan tujuan pembelajaran') + '\n\n' +
        'Rubrik (contoh):\n4 - Sangat baik: memenuhi seluruh indikator dengan tepat dan mandiri\n3 - Baik: memenuhi sebagian besar indikator dengan sedikit bantuan\n' +
        '2 - Cukup: memenuhi sebagian indikator dengan bimbingan\n1 - Perlu bimbingan: belum memenuhi indikator';
      res.push({
        topik: judul, tujuan: tpI.length ? bullets(tpI) : '',
        aktivitas: (pertama && info.length ? info.join(' | ') + '\n\n' : '') + 'A. Pendahuluan' + wkt(pen) + '\n' + bernomor(buka) + '\n\n' +
          'B. Kegiatan Inti' + wkt(inti) + '\n' + bernomor(langkahI) + '\n\nC. Penutup' + wkt(tut) + '\n' + bernomor(tutup),
        asesmen: asesTeks
      });
    }
    return res;
  }
  // Saran bawaan Model / Metode / Pendekatan menurut mapel. Hanya mengisi kolom yang masih kosong (atau hasil saran sebelumnya),
  // tidak pernah menimpa isian guru, dan hanya untuk modul baru.
  var SARAN_MM = [
    { re: /arab/i,                    model: 'Cooperative Learning',   metode: 'Drill, Praktik, Tanya jawab',          pendekatan: 'Kontekstual' },
    { re: /qur.?an|hadis|hadits/i,    model: 'Cooperative Learning',   metode: 'Talaqqi, Drill, Penugasan',            pendekatan: 'Kontekstual' },
    { re: /akidah|akhlak/i,           model: 'Problem Based Learning', metode: 'Cerita keteladanan, Diskusi, Tanya jawab', pendekatan: 'Kontekstual' },
    { re: /fikih|fiqih|fiqh/i,        model: 'Discovery Learning',     metode: 'Demonstrasi, Praktik, Tanya jawab',    pendekatan: 'Saintifik' },
    { re: /ski|sejarah/i,             model: 'Cooperative Learning',   metode: 'Cerita, Diskusi, Penugasan',           pendekatan: 'Kontekstual' },
    { re: /matematika/i,              model: 'Problem Based Learning', metode: 'Tanya jawab, Latihan soal, Diskusi',   pendekatan: 'Saintifik' },
    { re: /ipa|ipas|sains|alam/i,     model: 'Project Based Learning', metode: 'Eksperimen, Diskusi, Penugasan',       pendekatan: 'Saintifik' },
    { re: /pjok|jasmani|penjas|olahraga/i, model: 'Discovery Learning', metode: 'Demonstrasi, Praktik',                pendekatan: 'Kontekstual' },
    { re: /seni|prakarya|budaya/i,    model: 'Project Based Learning', metode: 'Demonstrasi, Praktik, Penugasan',      pendekatan: 'Kontekstual' }
  ];
  var SARAN_UMUM = { model: 'Problem Based Learning', metode: 'Diskusi, Tanya jawab, Penugasan', pendekatan: 'Kontekstual' };
  function autoSaran() {
    if (editingKey) return;
    var mp = val('mpf-mapel'); if (!mp || !$('mpf-model')) return;
    var sr = SARAN_MM.filter(function (x) { return x.re.test(mp); })[0] || SARAN_UMUM;
    ['model', 'metode', 'pendekatan'].forEach(function (f) {
      var el = $('mpf-' + f); if (!el) return;
      var cur = el.value.trim();
      if (!cur || cur === lastDraft['a_' + f]) { el.value = sr[f]; lastDraft['a_' + f] = sr[f]; }
    });
    refreshAcc();
  }
  // Isi otomatis DPL (maks. 3) & Panca Cinta menurut mapel, hanya modul baru. Pilihan guru sendiri tidak ditimpa;
  // hasil isian otomatis sebelumnya boleh diganti bila mapel diganti.
  function autoProfil() {
    if (editingKey || !root) return;
    var mp = val('mpf-mapel'); if (!mp) return;
    var pr = profilMapel(mp);
    [['dpl', 'mpf-dpl'], ['panca', 'mpf-panca']].forEach(function (x) {
      var boxes = root.querySelectorAll('.' + x[1]);
      var cur = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).map(function (b) { return b.value; }).sort().join('|');
      if (cur && cur !== lastDraft['a_' + x[0]]) return;   // guru sudah memilih sendiri
      var isi = pr[x[0]].slice(0, x[0] === 'dpl' ? DPL_MAX : 99);
      Array.prototype.forEach.call(boxes, function (b) { b.checked = isi.indexOf(b.value) !== -1; });
      lastDraft['a_' + x[0]] = isi.slice().sort().join('|');
    });
    refreshAcc();
  }
  // Draf otomatis (modul baru, kotak "Otomatis" dicentang): dijalankan setelah Materi / Model / Metode / Pendekatan / Alokasi / TP selesai diubah.
  // Aman diulang: buatDraf hanya mengisi kolom kosong atau memperbarui hasil draf sebelumnya, tidak menimpa isian guru.
  var AUTO_IDS = ['mpf-mapel', 'mpf-kelas', 'mpf-materi', 'mpf-model', 'mpf-metode', 'mpf-pendekatan', 'mpf-alokasi', 'mpf-tujuan'];
  var autoTimer = null;
  function autoDraf() {
    var cb = $('mpf-autodraf');
    if (editingKey || !cb || !cb.checked || !val('mpf-mapel') || !val('mpf-materi')) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () { autoTimer = null; if (!editingKey && $('mpf-materi')) buatDraf(true); }, 500);
  }
  function buatDraf(senyap) {
    if (!canCreate()) return toast('Tidak diizinkan!', true);
    var pilih = function (cls) { return Array.prototype.map.call(root.querySelectorAll('.' + cls + ':checked'), function (el) { return el.value; }); };
    var c = {
      mapel: val('mpf-mapel'), kelas: val('mpf-kelas'), fase: val('mpf-fase'), materi: val('mpf-materi'),
      alokasi: val('mpf-alokasi'), model: val('mpf-model'), metode: val('mpf-metode'), pendekatan: val('mpf-pendekatan'),
      tp: daftarBaris(val('mpf-tujuan')), dpl: pilih('mpf-dpl'), panca: pilih('mpf-panca')
    };
    if (!c.mapel || !c.materi) { if (!senyap) toast('Isi Mata Pelajaran dan Materi terlebih dahulu.', true); return; }
    var out = susunDraf(c), isi = 0, lewat = 0;
    SECTIONS.concat(RPM_FIELDS).forEach(function (s) {
      var el = $('mpf-' + s.k), teks = out[s.k] && out[s.k].trim();
      if (!el || !teks) return;   // cp & tujuan tidak dibuat di sini (dari Referensi Kurikulum / guru)
      var cur = el.value.trim();
      if (cur && cur !== lastDraft[s.k]) { lewat++; return; }
      el.value = teks; lastDraft[s.k] = teks;
      el.rows = Math.min(14, Math.max(3, teks.split('\n').length + 1));
      isi++;
    });
    refreshAcc();
    // Daftar pertemuan: isi topik, tujuan, aktivitas, dan asesmen tiap pertemuan yang masih kosong (atau hasil draf sebelumnya).
    var rows = pertCollectRaw(), dp = susunPertemuan(c, rows.length), pIsi = 0;
    rows.forEach(function (r, i) {
      ['topik', 'tujuan', 'aktivitas', 'asesmen'].forEach(function (f) {
        var lk = 'p' + i + f, cur = r[f].trim(), t = dp[i][f]; if (!t) return;
        if (cur && cur !== lastDraft[lk]) { lewat++; return; }
        r[f] = t; lastDraft[lk] = t; pIsi++;
      });
      if (!r.alokasi && c.alokasi) r.alokasi = c.alokasi;
    });
    if (pIsi) { var buka = 0; Array.prototype.forEach.call(root.querySelectorAll('#mpfPert .mp-pert'), function (d, i) { if (d.open) buka = i; }); pertRender(rows, buka); }
    isi += pIsi ? 1 : 0;
    if (!isi) { if (!senyap) toast('Semua bagian sudah Anda isi, jadi draf tidak mengubah apa pun.', false, 4000); return; }
    if (senyap) return toast('✨ Draf otomatis diperbarui (' + isi + ' bagian). Periksa dan sesuaikan.', false, 2500);
    toast('✨ Draf dibuat: ' + isi + ' bagian terisi' + (lewat ? ', ' + lewat + ' bagian yang sudah Anda isi tidak diubah' : '') +
      '.' + (c.tp.length ? '' : ' Tujuan Pembelajaran masih kosong, isi dahulu agar draf lebih sesuai.') + (out._mapel ? ' Isi RPM disesuaikan untuk mapel ' + out._mapel + '.' : '') + ' Periksa dan sesuaikan.', false, 6000);
  }

  /* ---------- aksi ---------- */
  function openForm(key) {
    editingKey = key || null;
    var m = key ? byKey(key) : null;
    formRef = (m && m.kurikulumRefKey) ? { key: m.kurikulumRefKey, versi: m.kurikulumVersi, at: m.kurikulumAt } : null;
    lastFill = { cp: '', tp: '' }; lastDraft = {};
    pertSaran = (m && pertSaved(m).length) ? Math.min(PERT_MAX, pertSaved(m).length) : PERT_DEFAULT;   // edit: ikuti jumlah pertemuan tersimpan
    tab = 'buat'; render(); loadRef(false); window.scrollTo(0, 0);
  }
  function showTab(id) {
    if (id === 'rekap' && !canApprove()) return;
    if (id === 'buat' && tab !== 'buat') { editingKey = null; formRef = null; lastFill = { cp: '', tp: '' }; lastDraft = {}; pertSaran = PERT_DEFAULT; }
    if (id !== 'referensi') { refMode = 'list'; refEditKey = null; refParsed = null; }
    tab = id; render();
    if (id === 'buat' || id === 'referensi') loadRef(false);
  }
  function simpan() {
    if (!canCreate()) return toast('Tidak diizinkan!', true);
    if (isBusy('simpanModul')) return toast('Sedang menyimpan…', false, 1500);
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    var o = collect(), lama = editingKey ? byKey(editingKey) : null;
    if (lama && !canEdit(lama)) return toast('Anda tidak bisa mengubah modul milik guru lain.', true);
    if (lama && pers(lama) === 'diajukan') return toast('Modul sedang menunggu persetujuan dan dikunci. Tunggu hasil tinjauan.', true);
    if (!o.mapel || !o.kelas || !o.materi || !o.tujuan) return toast('Mata pelajaran, kelas, materi, dan tujuan pembelajaran wajib diisi!', true);
    if (kelasBoleh().indexOf(o.kelas) === -1) return toast('Anda hanya bisa membuat modul untuk kelas yang Anda ampu!', true);
    var now = new Date().toISOString(), btn = $('mpBtnSimpan');
    var ref = lama ? db.ref('modul_ajar/' + lama.key) : db.ref('modul_ajar').push();
    var norm = function (v) { return Array.isArray(v) ? v.join('|') : String(v == null ? '' : v); };
    var berubah = !!lama && Object.keys(o).some(function (k) {
      return k === 'pertemuan' ? normPert(o.pertemuan) !== normPert(getPert(lama)) : norm(o[k]) !== norm(lama[k]);
    });
    var kembaliDraf = !!lama && pers(lama) === 'disetujui' && berubah;
    var full = Object.assign({}, lama || {}, o, kembaliDraf ? { persetujuanOleh: null, persetujuanRole: null, persetujuanAt: null, catatanKepsek: null } : {}, {
      persetujuan: kembaliDraf ? 'draf' : (lama ? pers(lama) : 'draf'),
      status: lama ? (lama.status || 'aktif') : 'aktif', favorit: lama ? !!lama.favorit : false,
      ownerName: lama ? lama.ownerName : currentUser.name, ownerKey: lama ? (lama.ownerKey || '') : (currentUser.key || ''),
      createdAt: lama ? (lama.createdAt || now) : now, updatedAt: now
    });
    delete full.key;
    setBusy('simpanModul', btn);
    var selesaiSimpan = function (err) {
      clearBusy('simpanModul', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      full.key = ref.key;
      if (lama) Object.assign(lama, full); else data.unshift(full);
      sortData();
      toast(kembaliDraf ? '✅ Modul disimpan. Status kembali ke Draf, ajukan ulang untuk persetujuan.' : '✅ Modul disimpan!', false, kembaliDraf ? 5000 : undefined); addLog(lama ? 'ubah_modul_ajar' : 'buat_modul_ajar', judulModul(full));
      editingKey = null; tab = 'daftar'; render();
    };
    if (!lama) { ref.set(full, selesaiSimpan); return; }
    // Edit: ref.set() menimpa SELURUH node memakai salinan lokal yang bisa basi. Contoh: modul sudah diajukan/disetujui
    // dari perangkat lain, lalu perangkat ini (cache lama: masih "draf") menyimpan -> status persetujuan ikut kembali ke
    // "draf" tanpa sepengetahuan Kepala Madrasah. Transaction membatalkan simpan kalau status di server sudah berbeda.
    var statusLokal = pers(lama);
    ref.transaction(function (cur) {
      // cur === null = cache lokal kosong/basi: `full` hanya usulan; bila server berisi data lain, usulan ditolak dan fungsi
      // ini dipanggil ulang dengan data asli (lalu pemeriksaan status di bawah berlaku).
      if (cur === null) return full;
      var st = PERS[cur.persetujuan] ? cur.persetujuan : 'draf';
      if (st !== statusLokal) return;  // undefined = abort -> committed=false
      return full;
    }, function (err, committed) {
      if (!err && !committed) {
        clearBusy('simpanModul', btn);
        toast('⚠️ Status modul sudah berubah di server (mis. sudah diajukan/dinilai), perubahan Anda belum disimpan. Memuat ulang…', true, 6000);
        return load(true, function () { editingKey = null; tab = 'daftar'; render(); });
      }
      selesaiSimpan(err);
    }, false);
  }
  function duplikat(key) {
    var m = byKey(key); if (!m || !canCreate()) return;
    if (!isReallyOnline()) return toast('Perlu koneksi internet.', true);
    if (isBusy('dupModul')) return toast('Sedang menduplikat…', false, 1500);
    setBusy('dupModul');
    var now = new Date().toISOString(), ref = db.ref('modul_ajar').push();
    var salin = Object.assign({}, m, { materi: (m.materi || '') + ' (Salinan)', status: 'aktif', favorit: false,
      persetujuan: 'draf', persetujuanOleh: null, persetujuanRole: null, persetujuanAt: null, diajukanAt: null, catatanKepsek: null,
      pertemuan: pertSaved(m).map(function (p) { return Object.assign({}, p, { tanggal: '' }); }),
      ownerName: currentUser.name, ownerKey: currentUser.key || '', createdAt: now, updatedAt: now });
    delete salin.key;
    ref.set(salin, function (err) {
      clearBusy('dupModul');
      if (err) return toast('Gagal: ' + err.message, true);
      salin.key = ref.key; data.unshift(salin);
      toast('📄 Modul diduplikat. Silakan sesuaikan isinya.'); addLog('duplikat_modul_ajar', judulModul(m));
      openForm(ref.key);
    });
  }
  function goto(page, selId, kelas) {
    var sel = $(selId);
    if (sel && Array.prototype.some.call(sel.options, function (o) { return o.value === kelas; })) sel.value = kelas;
    navigateTo(page);
  }

  /* ---------- cetak / PDF ---------- */
  // Blok pengesahan: hanya terisi bila modul berstatus disetujui (nama penyetuju + tanggal, tanda tangan digital bila ada).
  function ttdHtml(m) {
    if (pers(m) !== 'disetujui') return '<br><br><br><b>' + esc(kepalaNama || '………………………') + '</b>';
    // Penandatangan = Kepala Madrasah (dari data madrasah), bukan siapa yang menekan tombol Setujui (bisa Admin).
    // Penyetuju sebenarnya dicatat di keterangan QR.
    var kpNama = madr().kepala_sekolah || kepalaNama || m.persetujuanOleh || '';
    var kpNip = madr().nip_kepala_sekolah || '';
    var penyetuju = m.persetujuanRole === 'Admin'
      ? 'atas nama ' + (m.persetujuanOleh || '') + ' (diinput Admin)'
      : 'oleh ' + (m.persetujuanOleh || '') + (m.persetujuanRole ? ' (' + m.persetujuanRole + ')' : '');
    var blokTtd = (window.TTD && TTD.penanda)
      ? '<div style="min-height:19mm;">' + TTD.penanda('kepala', { jenis: 'Persetujuan Modul Pembelajaran', ket: [judulModul(m), m.guru, 'disetujui ' + tglIso(m.persetujuanAt) + (m.persetujuanOleh ? ' ' + penyetuju : '')].filter(Boolean).join(' | '), nama: kpNama, jabatan: 'Kepala Madrasah', nip: kpNip }, { mm: 17 }) + '</div>'
      : '';
    var img = '';
    try { var b64 = madr().ttdKepalaBase64 || ''; if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(b64)) img = '<img src="' + b64 + '" alt="" style="height:56px;max-width:160px;object-fit:contain;">'; } catch (e) {}
    return '<div style="font-size:11px;color:#065f46;">Disetujui ' + esc(tglIso(m.persetujuanAt)) + '</div>' + (blokTtd || img || '<br><br><br>') + '<b>' + esc(kpNama) + '</b>' + (m.persetujuanRole === 'Admin' ? '<div style="font-size:10px;color:#555;">disetujui atas nama ' + esc(m.persetujuanOleh || '') + ', diinput Admin</div>' : '');
  }
  function docHtml(m) {
    var dpl = m.dpl || [], pc = m.pancaCinta || [];
    var rows = [['Nama Sekolah', m.sekolah || madr().nama], ['Mata Pelajaran', m.mapel], ['Kelas / Fase', (m.kelas || '-') + (m.fase ? ' / Fase ' + m.fase : '')],
      ['Semester', m.semester], ['Tahun Pelajaran', m.tahunAjaran], ['Nama Guru', m.guru], ['Materi', m.materi], ['Alokasi Waktu', m.alokasi],
      ['Model Pembelajaran', m.model], ['Metode', m.metode], ['Pendekatan', m.pendekatan], ['Kurikulum', m.kurikulumVersi], ['Murid', jumlahSiswa(m.kelas) + ' siswa']]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<tr><td class="k">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('');
    var adaPert = pertSaved(m).length > 0;
    var body = SECTIONS.filter(function (s) { return adaPert ? (s.k === 'aktivitas' || (s.k !== 'asesmen' && m[s.k])) : m[s.k]; }).map(function (s, i) {
      if (adaPert && s.k === 'aktivitas') return pertDocHtml(m, i + 2);
      return '<h3>' + (i + 2) + '. ' + esc(s.t) + '</h3><div class="b">' + nl2br(m[s.k]) + '</div>';
    }).join('');
    return '<div class="kop"><img src="logo/logo-lembaga.png" alt="" onerror="this.style.display=\'none\'"><div><div class="n">' + esc(madr().nama) + '</div>' +
      '<div class="a">' + esc(madr().alamat || '') + '</div></div></div><h2>MODUL PEMBELAJARAN</h2>' +
      '<h3>1. Identitas</h3><table>' + rows + '</table>' +
      (dpl.length ? '<h3>Dimensi Profil Lulusan</h3><div class="b">' + esc(dpl.join(', ')) + '</div>' : '') +
      (pc.length ? '<h3>Panca Cinta</h3><div class="b">' + nl2br(pancaGrupText(pc)) + '</div>' : '') + body +
      '<div class="ttd"><div>Mengetahui,<br>Kepala Madrasah<br>' + ttdHtml(m) + '</div><div>Guru Mata Pelajaran<br><br><br><br><b>' + esc(m.guru || '') + '</b></div></div>';
  }
  function docRpmHtml(m) {
    var L = rpmLengkap(m), dpl = m.dpl || [], pc = m.pancaCinta || [];
    var rows = [['Nama Sekolah', m.sekolah || madr().nama], ['Mata Pelajaran', m.mapel], ['Kelas / Fase', (m.kelas || '-') + (m.fase ? ' / Fase ' + m.fase : '')],
      ['Semester', m.semester], ['Tahun Pelajaran', m.tahunAjaran], ['Nama Guru', m.guru], ['Materi / Topik', m.materi], ['Alokasi Waktu', m.alokasi],
      ['Murid', jumlahSiswa(m.kelas) + ' siswa']]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<tr><td class="k">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('');
    var b = function (t, v) { return v ? '<div class="b" style="margin-bottom:6px;"><b>' + esc(t) + '</b><br>' + nl2br(v) + '</div>' : ''; };
    var no = 0, bagian = function (judul, isi) { return isi ? '<h3>' + (++no) + '. ' + esc(judul) + '</h3>' + isi : ''; };
    var pedagogis = m.rpmPedagogis || [m.model && 'Model: ' + m.model, m.metode && 'Metode: ' + m.metode, m.pendekatan && 'Pendekatan: ' + m.pendekatan].filter(Boolean).join('\n');

    var ident = '<table>' + rows + '</table>' + b('Kesiapan Murid', m.rpmKesiapan) + b('Karakteristik Materi', m.rpmKarakter) +
      (dpl.length ? b('Dimensi Profil Lulusan', dpl.join(', ')) : '') + (pc.length ? b('Topik Panca Cinta', pancaGrupText(pc)) : '') +
      b('Materi Integrasi KBC', m.rpmIntegrasiKbc);

    var desain = (L ? b('Capaian Pembelajaran', m.cp) + b('Lintas Disiplin Ilmu', m.rpmLintas) : '') + b('Tujuan Pembelajaran', m.tujuan) +
      (L ? b('Topik Pembelajaran', m.materi) : '') +
      '<div style="margin:8px 0 4px;"><b>Kerangka Pembelajaran</b></div>' +
      b('Praktik Pedagogis', pedagogis) + (L ? b('Kemitraan Pembelajaran', m.rpmKemitraan) : '') + b('Lingkungan Pembelajaran', m.rpmLingkungan) +
      (L ? b('Pemanfaatan Digital', m.rpmDigital) + b('Media Pembelajaran', m.media) + b('Sumber Belajar', m.sumber) : '');

    var pl = pertSaved(m);
    var pert = pl.length ? '<div style="margin:8px 0 4px;"><b>Rencana per Pertemuan</b></div>' + pl.map(function (p, i) {
      var meta = [p.tanggal ? 'Tanggal: ' + p.tanggal : '', p.alokasi ? 'Alokasi: ' + p.alokasi : ''].filter(Boolean).join(' · ');
      var bag = function (t, v) { return v ? '<div style="margin-top:6px;"><b>' + t + '</b><br>' + nl2br(v) + '</div>' : ''; };
      return '<div class="b" style="margin-bottom:8px;page-break-inside:avoid;"><b>Pertemuan ' + (i + 1) + (p.topik ? ' — ' + esc(p.topik) : '') + '</b>' +
        (meta ? '<div style="color:#555;font-size:12px;">' + esc(meta) + '</div>' : '') + bag('Tujuan', p.tujuan) + bag('Aktivitas Pembelajaran', p.aktivitas) + '</div>';
    }).join('') : '';
    var pengalaman = b('Pendahuluan', [m.pemantik ? 'Pertanyaan pemantik:\n' + m.pemantik : '', m.rpmPendahuluan].filter(Boolean).join('\n\n')) +
      b('Inti — Memahami', m.rpmMemahami) + b('Inti — Mengaplikasi', m.rpmMengaplikasi) +
      b('Inti — Merefleksi', m.rpmMerefleksi) + b('Penutup', m.rpmPenutup) + pert;

    var adaAses = m.rpmAsesAwal || m.rpmAsesProses || m.rpmAsesAkhir;
    var asesmen = (adaAses ? b('Asesmen Awal', m.rpmAsesAwal) + b('Asesmen Proses', m.rpmAsesProses) + b('Asesmen Akhir', m.rpmAsesAkhir) : b('Asesmen', m.asesmen)) +
      (L ? b('Rubrik dan Kriteria Penilaian', m.rpmRubrik) + b('KKTP (Kriteria Ketercapaian Tujuan Pembelajaran)', m.rpmKktp) : '');
    var tindak = L ? b('Refleksi', m.refleksi) + b('Pengayaan', m.pengayaan) + b('Remedial', m.remedial) + b('Tugas', m.tugas) : '';

    return '<div class="kop"><img src="logo/logo-lembaga.png" alt="" onerror="this.style.display=\'none\'"><div><div class="n">' + esc(madr().nama) + '</div>' +
      '<div class="a">' + esc(madr().alamat || '') + '</div></div></div><h2>RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>' +
      '<div style="text-align:center;font-size:12px;color:#555;margin-top:-8px;">Pembelajaran Mendalam · Kurikulum Berbasis Cinta (KMA 1503 Tahun 2025) · Format ' + (L ? 'Lengkap' : 'Minimum') + '</div>' +
      bagian('Identifikasi', ident) + bagian('Desain Pembelajaran', desain) + bagian('Pengalaman Belajar (berkesadaran, bermakna, menggembirakan)', pengalaman) +
      bagian('Asesmen', asesmen) + bagian('Refleksi dan Tindak Lanjut', tindak) +
      '<div class="ttd"><div>Mengetahui,<br>Kepala Madrasah<br>' + ttdHtml(m) + '</div><div>Guru Mata Pelajaran<br><br><br><br><b>' + esc(m.guru || '') + '</b></div></div>';
  }
  function cetak(m, pdf, rpm) { cetakDok((rpm ? 'RPM ' : 'Modul ') + judulModul(m), rpm ? docRpmHtml(m) : docHtml(m), pdf); }
  function cetakDok(judul, isiDok, pdf) {
    var w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return toast('Popup diblokir browser.', true);
    var css = 'body{font-family:Arial,sans-serif;padding:30px;color:#111;line-height:1.5;font-size:13px}h2{text-align:center;margin:14px 0}h3{margin:16px 0 4px;font-size:14px}' +
      'table{width:100%;border-collapse:collapse}td{border:1px solid #999;padding:5px 8px;vertical-align:top}td.k{width:32%;background:#f3f4f6;font-weight:600}' +
      '.kop{display:flex;align-items:center;gap:14px;border-bottom:3px double #333;padding-bottom:10px}.kop img{width:64px;height:64px;object-fit:contain}.kop .n{font-weight:700;font-size:16px}.kop .a{font-size:12px}' +
      '.b{border:1px solid #ddd;border-radius:6px;padding:8px 10px;white-space:normal}.ttd{display:flex;justify-content:space-between;margin-top:36px;text-align:center}' +
      '.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:60%;max-width:430px;opacity:.1;z-index:-1;pointer-events:none}' +
      '.tip{background:#fef3c7;border:1px solid #f59e0b;padding:8px 12px;border-radius:8px;margin-bottom:12px}@page{size:A4;margin:14mm}@media print{body{padding:0}.tip{display:none}}';
    var tip = pdf ? '<div class="tip">Untuk menyimpan sebagai PDF: pada dialog cetak, pilih tujuan <b>Simpan sebagai PDF</b>.</div>' : '';
    var htmlModul = '<html><head><base href="' + esc(document.baseURI) + '"><title>' + esc(judul) + '</title><style>' + css + '</style></head><body><img class="wm" src="logo/logo-lembaga.png" alt="" onerror="this.style.display=\'none\'">' + tip + isiDok + '</body></html>';
    var tulisModul = function (h) { w.document.open(); w.document.write(h); w.document.close(); w.focus(); setTimeout(function () { if (!w.closed) w.print(); }, 400); };
    if (window.TTD && TTD.isiHtml && /\[\[TTD:/.test(htmlModul)) {
      w.document.write('<p style="font-family:Arial,sans-serif;padding:24px;">Menyiapkan dokumen…</p>');
      TTD.isiHtml(htmlModul).catch(function () { return htmlModul.replace(/\[\[TTD:[^\]]*\]\]/g, ''); }).then(tulisModul);
    } else tulisModul(htmlModul);
  }

  // Cetak gabungan: semua modul yang lolos filter di tab Daftar Modul (tidak termasuk arsip), diurutkan kelas > mapel > materi.
  function cetakGabungan() {
    if (!canView()) return toast('Tidak diizinkan!', true);
    var items = filtered().slice().sort(function (a, b) {
      return (a.kelas + '|' + a.mapel + '|' + a.materi).localeCompare(b.kelas + '|' + b.mapel + '|' + b.materi);
    });
    if (!items.length) return toast('Tidak ada modul untuk dicetak. Periksa filter yang dipakai.', true);
    if (items.length > 30 && !confirm('Akan mencetak ' + items.length + ' RPM sekaligus. Lanjutkan?')) return;
    var STAT = { draf: 'Draf', diajukan: 'Menunggu persetujuan', disetujui: 'Disetujui', ditolak: 'Ditolak' };
    var gabung = function (f) { return uniq(items.map(function (m) { return m[f]; })).join(', ') || '-'; };
    var guruList = uniq(items.map(function (m) { return m.guru; }));
    var fl = [filt.mapel && 'Mapel: ' + filt.mapel, filt.kelas && 'Kelas: ' + filt.kelas, filt.semester && 'Semester: ' + filt.semester, filt.pers && 'Status: ' + STAT[filt.pers], filt.q && 'Pencarian: ' + filt.q].filter(Boolean).join(' · ');
    var info = [['Nama Guru', guruList.join(', ') || '-'], ['Tahun Pelajaran', gabung('tahunAjaran')], ['Semester', gabung('semester')], ['Jumlah RPM', items.length + ' modul'], ['Penyaring', fl]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<tr><td class="k">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('');
    var th = function (t, w) { return '<td class="k" style="width:' + (w || 'auto') + ';text-align:center;">' + t + '</td>'; };
    var baris = items.map(function (m, i) {
      return '<tr><td style="text-align:center;">' + (i + 1) + '</td><td>' + esc(m.mapel) + '</td><td style="text-align:center;">' + esc(m.kelas) + '</td><td>' + esc(m.materi) + '</td>' +
        '<td style="text-align:center;">' + (rpmLengkap(m) ? 'Lengkap' : 'Minimum') + '</td><td>' + STAT[pers(m)] + '</td></tr>';
    }).join('');
    var kpNama = madr().kepala_sekolah || kepalaNama || '………………………';
    var kpNip = madr().nip_kepala_sekolah || '';
    var sampul = '<div class="kop"><img src="logo/logo-lembaga.png" alt="" onerror="this.style.display=\'none\'"><div><div class="n">' + esc(madr().nama) + '</div>' +
      '<div class="a">' + esc(madr().alamat || '') + '</div></div></div><h2>KUMPULAN RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>' +
      '<table>' + info + '</table><h3>Daftar Isi</h3>' +
      '<table><tr>' + th('No', '6%') + th('Mata Pelajaran', '24%') + th('Kelas', '9%') + th('Materi') + th('Format', '12%') + th('Status', '17%') + '</tr>' + baris + '</table>' +
      '<div class="ttd"><div>Mengetahui,<br>Kepala Madrasah<br><br><br><br><b>' + esc(kpNama) + '</b>' + (kpNip ? '<br>NIP. ' + esc(kpNip) : '') + '</div>' +
      '<div>Guru Mata Pelajaran<br><br><br><br><b>' + (guruList.length === 1 ? esc(guruList[0]) : '(sesuai tiap RPM)') + '</b></div></div>' +
      '<div style="font-size:11px;color:#555;margin-top:14px;">Tanda tangan dan pengesahan digital (bila ada) tercantum pada halaman masing-masing RPM.</div>';
    var isi = sampul + items.map(function (m) { return '<div style="page-break-before:always;">' + docRpmHtml(m) + '</div>'; }).join('');
    cetakDok('Kumpulan RPM ' + (guruList.length === 1 ? guruList[0] : madr().nama), isi, false);
  }

  /* ---------- event ---------- */
  var Q_DELAY = 200, qTimer = null;
  function onInput(e) {
    // <select> memicu 'input' lalu 'change' untuk satu pilihan; cukup tangani 'change' agar tidak diproses dua kali.
    // Checkbox/radio juga memicu keduanya; di sini 'change' yang dipakai (nilai sudah final).
    var tg = e.target, tipe = tg && String(tg.type || '').toLowerCase();
    if (e.type === 'input' && tg && (tg.tagName === 'SELECT' || tipe === 'checkbox' || tipe === 'radio')) return;
    var id = e.target && e.target.id;
    if (id === 'mpf-mapel' || id === 'mpf-kelas' || id === 'mpf-materi') urutkanForm();
    if (id === 'mpfJadwal') { isiDariJadwal(e.target.value); return; }
    if (e.target && e.target.classList && Array.prototype.some.call(e.target.classList, function (c) { return c.indexOf('mpp-') === 0; })) { refreshAcc(); return; }
    if (id === 'mpf-guru') { refreshJadwalOpsi(); }
    if (id === 'mpf-autodraf') { if (e.target.checked) autoDraf(); return; }
    if (e.type === 'change' && AUTO_IDS.indexOf(id) !== -1) autoDraf();
    if (id && id.indexOf('mpf-') === 0) { refreshAcc(); return; }
    var cl = e.target && e.target.classList;
    if (cl && cl.contains('mpf-dpl')) {
      dplInfo();
      refreshAcc(); autoDraf(); return;
    }
    if (cl && cl.contains('mpf-panca')) { refreshAcc(); autoDraf(); return; }
    if (id === 'mpQ') {
      // filt.q langsung diperbarui; hanya render daftar yang ditunda agar tidak berat saat mengetik.
      filt.q = e.target.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { qTimer = null; if (tab === 'rekap') renderRekapIsi(); else renderList(); }, Q_DELAY);
      return;
    }
    if (id === 'mpFPers') filt.pers = e.target.value;
    else if (id === 'mpFMapel') filt.mapel = e.target.value;
    else if (id === 'mpFKelas') filt.kelas = e.target.value;
    else if (id === 'mpFSem') filt.semester = e.target.value;
    else return;
    clearTimeout(qTimer); qTimer = null;
    if (tab === 'rekap') renderRekapIsi(); else renderList();
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-mp]'); if (!b || !root.contains(b)) return;
    var act = b.getAttribute('data-mp'), key = b.getAttribute('data-key'), m = key ? byKey(key) : null;
    switch (act) {
      case 'tab': showTab(b.dataset.tab); break;
      case 'komp': komp = b.dataset.k; renderBody(); break;
      case 'reload': load(true); break;
      case 'baru': openForm(null); break;
      case 'edit':
        if (m && pers(m) === 'diajukan') { toast('Modul sedang menunggu persetujuan dan dikunci.', true); break; }
        if (m && canEdit(m)) openForm(key); break;
      case 'ajukan': case 'setujui': case 'tolak': aksiPersetujuan(act, key, b); break;
      case 'pertadd': {
        var rA = pertCollectRaw(); if (rA.length >= PERT_MAX) { toast('Maksimal ' + PERT_MAX + ' pertemuan per modul.', true); break; }
        rA.push(fixPert({ alokasi: val('mpf-alokasi') })); pertRender(rA, rA.length - 1); break;
      }
      case 'pertdup': {
        var rD = pertCollectRaw(), iD = parseInt(b.dataset.i, 10); if (!rD[iD]) break;
        if (rD.length >= PERT_MAX) { toast('Maksimal ' + PERT_MAX + ' pertemuan per modul.', true); break; }
        rD.splice(iD + 1, 0, fixPert(Object.assign({}, rD[iD], { tanggal: '' }))); pertRender(rD, iD + 1); break;
      }
      case 'pertdel': {
        var rX = pertCollectRaw(), iX = parseInt(b.dataset.i, 10);
        if (!rX[iX]) break;
        if (!pertKosong(rX[iX]) && !confirm('Hapus Pertemuan ' + (iX + 1) + ' beserta isinya?')) break;
        rX.splice(iX, 1); pertRender(rX, Math.max(0, iX - 1)); break;
      }
      case 'pertsaran': {
        var rS = pertCollectRaw(), hasil = pertSesuaikan(rS, pertSaran);
        if (hasil.length > pertSaran) toast('Pertemuan yang sudah berisi tidak dihapus otomatis; hapus manual bila perlu.', false, 4000);
        pertRender(hasil); break;
      }
      case 'antrean': filt.pers = 'diajukan'; renderBody(); break;
      case 'dd': {
        var pn = $('mpdd-' + b.getAttribute('data-for')), dlEl = $(b.getAttribute('data-list'));
        if (!pn) break;
        if (!pn.hidden) { pn.hidden = true; break; }
        var ops = dlEl ? Array.prototype.map.call(dlEl.querySelectorAll('option'), function (o) { return o.value; }).filter(Boolean) : [];
        pn.innerHTML = ops.length ? ops.map(function (v) {
          return '<button type="button" class="btn btn-soft" style="display:block;width:100%;text-align:left;border:0;border-radius:0;white-space:normal;" data-mp="ddpick" data-for="' + esc(b.getAttribute('data-for')) + '" data-v="' + esc(v) + '">' + esc(v) + '</button>';
        }).join('') : '<div class="text-muted" style="padding:8px 10px;font-size:13px;">Belum ada saran untuk kolom ini. Ketik sendiri, atau pilih mapel dan kelas dulu.</div>';
        pn.hidden = false; break;
      }
      case 'ddpick': {
        var tgt = $(b.getAttribute('data-for')), pn2 = $('mpdd-' + b.getAttribute('data-for'));
        if (tgt) { tgt.value = b.getAttribute('data-v') || ''; tgt.dispatchEvent(new Event('input', { bubbles: true })); tgt.dispatchEvent(new Event('change', { bubbles: true })); tgt.focus(); }
        if (pn2) pn2.hidden = true; break;
      }
      case 'rekapguru': rekapOpen = (rekapOpen === key) ? '' : key; renderRekapIsi(); break;
      case 'rekapantrean': filt.pers = 'diajukan'; showTab('daftar'); break;
      case 'rekapcsv': rekapCsv(); break;
      case 'dup': duplikat(key); break;
      case 'simpan': simpan(); break;
      case 'batal': editingKey = null; tab = 'daftar'; render(); break;
      case 'fav': if (m && canEdit(m) && !terkunci(m)) write(key, { favorit: !m.favorit, updatedAt: new Date().toISOString() }, m.favorit ? 'Dihapus dari favorit' : '⭐ Ditambahkan ke favorit', renderList); break;
      case 'arsip': if (m && canEdit(m) && !terkunci(m)) write(key, { status: 'arsip', updatedAt: new Date().toISOString() }, '🗄️ Modul diarsipkan', function () { editingKey = null; if (tab === 'buat') tab = 'daftar'; render(); }); break;
      case 'pulih': if (m && canEdit(m) && !terkunci(m)) write(key, { status: 'aktif', updatedAt: new Date().toISOString() }, '♻️ Modul dipulihkan', renderList); break;
      case 'hapus':
        if (m && canEdit(m)) {
          if (terkunci(m)) break;
          if (!isReallyOnline()) { toast('Perlu koneksi internet untuk menghapus.', true); break; }
          if (isBusy('hapusModul')) break;
          if (!doubleConfirm('Hapus modul ini secara permanen?')) break;
          setBusy('hapusModul');
          db.ref('modul_ajar/' + key).remove(function (err) {
            clearBusy('hapusModul');
            if (err) return toast('Gagal: ' + err.message, true);
            data = data.filter(function (x) { return x.key !== key; }); addLog('hapus_modul_ajar', judulModul(m)); toast('Modul dihapus'); renderList();
          });
        } break;
      case 'cetak': if (m) cetak(m, false); break;
      case 'pdf': if (m) cetak(m, true); break;
      case 'cetakrpm': if (m) cetak(m, false, true); break;
      case 'cetakgab': cetakGabungan(); break;
      case 'cetakrpmform':
        var oR = collect(); if (!oR.mapel && !oR.materi) return toast('Isi modul terlebih dahulu.', true);
        cetak(oR, false, true); break;
      case 'cetakform': case 'pdfform':
        var o = collect(); if (!o.mapel && !o.materi) return toast('Isi modul terlebih dahulu.', true);
        cetak(o, act === 'pdfform'); break;
      case 'accall':
        var accs = root.querySelectorAll('details.mp-acc'), adaTutup = Array.prototype.some.call(accs, function (d) { return !d.open; });
        Array.prototype.forEach.call(accs, function (d) { d.open = adaTutup; }); break;
      case 'isiref': applyRef(false); break;
      case 'drafauto': buatDraf(); break;
      case 'refbaru': refMode = 'form'; refEditKey = null; renderBody(); break;
      case 'kepalanama': aturKepalaNama(); break;
      case 'refedit': if (isAdmin() && refByKey(key)) { refMode = 'form'; refEditKey = key; renderBody(); } break;
      case 'refsimpan': refSimpan(b); break;
      case 'refbatal': refMode = 'list'; refEditKey = null; refParsed = null; refPaste = ''; renderBody(); break;
      case 'refreload': refLoaded = false; loadRef(true); renderBody(); break;
      case 'refimpor': refMode = 'impor'; refParsed = null; refPaste = ''; renderBody(); break;
      case 'refbank': if (isAdmin()) { refMode = 'bank'; refParsed = null; renderBody(); } break;
      case 'refbanksimpan': refBankSimpan(b); break;
      case 'refimporcek': refPaste = ($('mpr-paste') || {}).value || ''; refParsed = parseImpor(refPaste); renderBody(); break;
      case 'refimporsimpan': refImporSimpan(b); break;
      case 'refhapus':
        if (isAdmin() && refByKey(key)) {
          if (!isReallyOnline()) { toast('Perlu koneksi internet untuk menghapus.', true); break; }
          if (isBusy('hapusRefKur')) break;
          if (!doubleConfirm('Hapus referensi kurikulum ini?')) break;
          setBusy('hapusRefKur');
          db.ref('kurikulum_ref/' + key).remove(function (err) {
            clearBusy('hapusRefKur');
            if (err) return toast('Gagal: ' + err.message, true);
            refs = refs.filter(function (x) { return x.key !== key; }); addLog('hapus_referensi_kurikulum', key); toast('Referensi dihapus'); renderBody();
          });
        } break;
      case 'goabsen': if (m) goto('attendance', 'attendanceClassFilter', m.kelas); break;
      case 'gonilai': if (m) goto('grades', 'gradesClassFilter', m.kelas); break;
    }
  }

  /* ---------- pasang ke navigasi ---------- */
  // Dipanggil app.js saat logout / ganti pengguna: kosongkan semua state modul (data, referensi, draf form, filter,
  // tab) supaya pengguna berikutnya tidak melihat data milik sesi sebelumnya. Aman dipanggil berulang kali.
  function resetState() {
    gen++; // batalkan load yang masih berjalan
    clearTimeout(qTimer); qTimer = null; clearTimeout(autoTimer); autoTimer = null;
    data = []; loaded = false; loading = false; loadErr = '';
    refs = []; refLoaded = false; refLoading = false; refErr = '';
    refMode = 'list'; refEditKey = null; refParsed = null; refPaste = '';
    formRef = null; lastFill = { cp: '', tp: '' }; lastDraft = {}; pertSaran = PERT_DEFAULT; refSumber = 'auto';
    tab = 'daftar'; editingKey = null; komp = 'materiIsi'; rekapOpen = '';
    filt = { q: '', mapel: '', kelas: '', semester: '', pers: '' };
    if (root) root.innerHTML = '';
  }
  window.modulAjarResetState = resetState;

  /* ---------- alat Admin: isi Karakteristik Materi pada modul lama ----------
     Pakai di Console browser saat login sebagai Admin pada aplikasi:
       modulAjarIsiKarakterMassal()                       -> simulasi (tidak menulis apa pun)
       modulAjarIsiKarakterMassal({ terapkan: true })     -> tulis ke Firebase
       opsi tambahan: { termasukDisetujui: true } bila modul berstatus Disetujui ikut diisi.
     Hanya mengisi modul yang rpmKarakter-nya KOSONG; isian guru tidak pernah ditimpa. Modul 'diajukan' (terkunci) dilewati.
     updatedAt dan status persetujuan tidak diubah. Satu modul = satu tulis (field rpmKarakter saja), jadi mudah dibatalkan. */
  window.modulAjarIsiKarakterMassal = function (opsi) {
    opsi = opsi || {};
    if (!currentUser || !isAdmin()) { console.warn('[modul-ajar] Hanya Admin yang boleh menjalankan ini.'); return Promise.resolve(null); }
    if (typeof db === 'undefined' || !isReallyOnline()) { console.warn('[modul-ajar] Perlu koneksi internet.'); return Promise.resolve(null); }
    return db.ref('modul_ajar').once('value').then(function (snap) {
      var tulis = [], lewat = { sudahIsi: 0, diajukan: 0, disetujui: 0, tanpaMapelMateri: 0 };
      snap.forEach(function (c) {
        var v = c.val() || {};
        if (String(v.rpmKarakter || '').trim()) { lewat.sudahIsi++; return; }
        if (!v.mapel || !v.materi) { lewat.tanpaMapelMateri++; return; }
        var st = PERS[v.persetujuan] ? v.persetujuan : 'draf';
        if (st === 'diajukan') { lewat.diajukan++; return; }
        if (st === 'disetujui' && !opsi.termasukDisetujui) { lewat.disetujui++; return; }
        tulis.push({ key: c.key, judul: judulModul(v), status: st, isi: karakterMateri(v.mapel, v.materi, v.kelas || '-', v.fase || faseDari(v.kelas)) });
      });
      var ringkas = { akanDiisi: tulis.length, dilewati: lewat, terapkan: !!opsi.terapkan };
      console.table(tulis.map(function (t) { return { key: t.key, modul: t.judul, status: t.status }; }));
      console.log('[modul-ajar] Ringkasan', ringkas);
      if (!opsi.terapkan) { console.log('[modul-ajar] SIMULASI saja. Jalankan modulAjarIsiKarakterMassal({ terapkan: true }) untuk menulis.'); return ringkas; }
      return Promise.all(tulis.map(function (t) {
        return db.ref('modul_ajar/' + t.key).update({ rpmKarakter: t.isi }).then(function () { return { key: t.key, ok: true }; }, function (err) { return { key: t.key, ok: false, err: (err && err.message) || String(err) }; });
      })).then(function (hasil) {
        var gagal = hasil.filter(function (h) { return !h.ok; });
        try { addLog('isi_karakter_materi_massal', (hasil.length - gagal.length) + ' modul'); } catch (e) {}
        ringkas.berhasil = hasil.length - gagal.length; ringkas.gagal = gagal;
        console.log('[modul-ajar] Selesai', ringkas);
        if (loaded) { loaded = false; }   // muat ulang daftar modul pada kunjungan berikutnya
        return ringkas;
      });
    });
  };

  var initTries = 0, hooked = false, logoutBound = false;
  function bindLogout() {
    if (logoutBound) return; logoutBound = true;
    // Data milik sesi sebelumnya dibuang saat ganti pengguna (state modul ini di luar kasResetState/logout app.js).
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.logout-btn')) resetState();
    }, true);
  }
  function init() {
    if (hooked) return;
    // DOM belum siap (skrip dimuat di <head>): tunggu dulu.
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init, { once: true }); return; }
    ensurePage();
    bindLogout();
    // navigateTo belum tersedia (app.js belum selesai): coba lagi tiap 250 ms, maksimal ~10 detik.
    if (typeof window.navigateTo !== 'function') {
      if (++initTries <= 40) setTimeout(init, 250);
      else console.warn('[modul-ajar] window.navigateTo tidak ditemukan; menu Modul Pembelajaran tidak terpasang.');
      return;
    }
    hooked = true;
    loadKepalaNama();
    var orig = window.navigateTo;
    window.navigateTo = function (page) {
      var r = orig.apply(this, arguments);
      if (page === PAGE) {
        try {
          if (!root) ensurePage();
          var t = $('pageTitle'); if (t) t.textContent = 'Modul Pembelajaran';
          if (tab === 'buat' && !editingKey) tab = 'daftar';
          render(); load(false); loadRef(false); loadKepalaNama();
        } catch (e) { console.error('[modul-ajar]', e); }
      }
      return r;
    };
  }
  init();
})();
