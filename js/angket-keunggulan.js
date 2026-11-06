// ============================================================
// ANGKET KEUNGGULAN MADRASAH -- js/angket-keunggulan.js
// Tab ketiga pada halaman "Angket" (Kurikulum | Profil Lulusan | Keunggulan).
// Dimuat SESUDAH js/angket.js (memakai global: db, currentUser, ROLES, toast, escapeHtml; dan, bila ada,
// P8_DIMENSI serta p8Periode dari Angket Profil Lulusan).
//
// Tujuan: memilih 1-2 bidang keunggulan madrasah dari lima bidang:
//   Tahfidz | Bahasa | Seni & Olahraga | Sains & Riset | Kewirausahaan & Literasi Digital
// Empat sisi penilaian per bidang: Minat, SDM (guru/pembina), Sarana, Potensi.
//
// Siapa mengisi:
//   - Guru / Wali Kelas   -> 40 butir (5 bidang x 4 sisi x 2 butir khusus bidang) + prioritas + 3 pertanyaan terbuka.
//   - Kepala Madrasah     -> 40 butir + prioritas + 3 pertanyaan terbuka.
//   - Orang tua & siswa   -> hanya sisi Minat (5 bidang x 3 butir) + prioritas + 2 pertanyaan terbuka, lewat API global:
//       AngketKeunggulan.renderForm(idWadah, 'ortu' | 'siswa', { kunci, nama }, { izinAnonim:true })
//     (sudah dipanggil dari portal-ortu.js: angketKeunggulanMuat).
//   - Admin & Kepala      -> tombol ON/OFF + batas waktu + tab Rekap (matriks skor, peringkat, pemetaan
//                            dimensi profil lulusan, jawaban terbuka, ekspor CSV).
//
// Skala butir: 1 Sangat Tidak Setuju | 2 Tidak Setuju | 3 Setuju | 4 Sangat Setuju.
// Tiap sisi punya beberapa butir; skor sisi = rata-rata butirnya per responden, lalu rata-rata antarresponden.
// Kode jawaban lama (tanpa angka, mis. tahfidz_minat) tetap terbaca di Rekap.
// Skor bidang = jumlah rata-rata 4 sisi (maksimum 16). Sisi Minat dirata-rata dari semua jenis responden
// (guru, kepala, ortu, siswa, masing-masing diberi bobot sama); SDM, Sarana, Potensi dari guru dan kepala.
// Rekap juga menampilkan skor dimensi terkait dari Angket Profil Lulusan (semester aktif) sebagai
// pertimbangan tambahan: skor dimensi rendah berarti bidang tersebut layak diprioritaskan. Skor itu
// TIDAK dijumlahkan ke skor bidang.
//
// Data Firebase:
//   angket_keunggulan_status = { aktif, periode, batas, diubahOleh, tgl }
//   angket_keunggulan/{periode}/{jenis}/{kunciResponden}
//        = { nama, jenis, periode, tgl, jawaban:{tahfidz_minat1:3, tahfidz_sdm2:4, ...}, prioritas:{p1:'tahfidz', p2:'sains'}, terbuka:{T1:'...'} }
//   prioritas.p1 wajib, p2 opsional; berisi id bidang. TIDAK ikut skor, ditampilkan sebagai jumlah pilihan di Rekap.
//   jenis: guru | kepala | ortu | siswa.   periode: "2026-1" (Ganjil Jul-Des) / "2026-2" (Genap Jan-Jun).
//
// PENTING (Rules Firebase): struktur data ini sama dengan angket_kurikulum. Salin aturan angket_kurikulum dan
// angket_kurikulum_status yang sudah berjalan, lalu ganti nama path menjadi angket_keunggulan dan
// angket_keunggulan_status. Pengecekan peran/status di file ini hanya di sisi klien, jadi Rules wajib
// menegakkannya (status aktif, nilai 1-4, panjang teks, batas baca rekap hanya Admin/Kepala).
// Aturan baca angket_profil mengikuti Rules Angket Profil; bila ditolak, bagian profil di Rekap disembunyikan.
// ============================================================
(function () {
  'use strict';

  // Kata tombol (nilai tersimpan tetap 1-4). Staf: persetujuan; orang tua & siswa: kesesuaian.
  var SKALA = ['Sangat Tidak Setuju', 'Tidak Setuju', 'Setuju', 'Sangat Setuju'];
  var SKALA_KATA = {
    guru: SKALA, kepala: SKALA,
    ortu: ['Tidak Sesuai', 'Kurang Sesuai', 'Sesuai', 'Sangat Sesuai'],
    siswa: ['Tidak Sesuai', 'Kurang Sesuai', 'Sesuai', 'Sangat Sesuai']
  };
  var JENIS = ['guru', 'kepala', 'ortu', 'siswa'];
  var JUDUL_JENIS = { guru: 'Guru', kepala: 'Kepala Madrasah', ortu: 'Orang Tua', siswa: 'Peserta Didik' };
  var DIM_NAMA = ['Keimanan & Ketakwaan', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi']; // urutan sama dengan P8_DIMENSI

  // dim = indeks dimensi profil lulusan yang dikuatkan bidang tersebut
  var BIDANG = [
    { id: 'tahfidz',   nama: 'Tahfidz',                            ikon: '📖', dim: [0, 5] },
    { id: 'bahasa',    nama: 'Bahasa',                             ikon: '🗣️', dim: [7, 1] },
    { id: 'seni',      nama: 'Seni & Olahraga',                    ikon: '🎨', dim: [3, 4, 6] },
    { id: 'sains',     nama: 'Sains & Riset',                      ikon: '🔬', dim: [2, 3, 4] },
    { id: 'wirausaha', nama: 'Kewirausahaan & Literasi Digital',   ikon: '💡', dim: [5, 3, 1] }
  ];
  var SISI = [
    { id: 'minat',   nama: 'Minat',   teks: function (n) { return 'Siswa menunjukkan minat yang tinggi pada bidang ' + n + '.'; } },
    { id: 'sdm',     nama: 'SDM',     teks: function (n) { return 'Madrasah memiliki guru atau pembina yang mampu membina bidang ' + n + '.'; } },
    { id: 'sarana',  nama: 'Sarana',  teks: function (n) { return 'Sarana, alat, dan materi untuk bidang ' + n + ' sudah memadai.'; } },
    { id: 'potensi', nama: 'Potensi', teks: function (n) { return 'Bidang ' + n + ' sudah punya kebiasaan atau prestasi yang bisa dikembangkan.'; } }
  ];
  var SISI_STAF = ['minat', 'sdm', 'sarana', 'potensi'];

  // [kode, idBidang, teks, idSisi]
  // Guru & Kepala: 2 butir per sisi per bidang, kalimat khusus bidang (satu hal per butir).
  var TEKS_STAF = {
    tahfidz: {
      minat:   ['Banyak siswa antusias mengikuti kegiatan tahfidz (setoran, muraja\u2019ah, lomba).', 'Banyak siswa mau menambah waktu belajar tahfidz di luar jam wajib.'],
      sdm:     ['Madrasah memiliki guru yang mampu membina bacaan dan hafalan siswa.', 'Jumlah guru pembina tahfidz cukup untuk jumlah siswa.'],
      sarana:  ['Ruang, mushaf, dan perlengkapan tahfidz sudah memadai.', 'Program tahfidz punya jadwal dan target yang jelas serta berjalan rutin.'],
      potensi: ['Ada siswa atau alumni yang berprestasi di bidang tahfidz.', 'Orang tua dan masyarakat sekitar mendukung kegiatan tahfidz.']
    },
    bahasa: {
      minat:   ['Banyak siswa antusias berlatih bahasa Arab atau Inggris di luar jam pelajaran.', 'Banyak siswa berani berbicara atau tampil dengan bahasa asing (pidato, percakapan, lomba).'],
      sdm:     ['Madrasah memiliki guru yang mampu membina kemampuan bahasa asing siswa.', 'Ada pembina yang siap mendampingi klub dan lomba bahasa.'],
      sarana:  ['Media belajar bahasa (buku, audio, laboratorium bahasa, aplikasi) sudah memadai.', 'Tersedia waktu khusus di luar pelajaran untuk kegiatan bahasa (klub, hari berbahasa).'],
      potensi: ['Ada siswa atau alumni yang berprestasi di lomba bahasa.', 'Ada kegiatan bahasa yang sudah berjalan dan bisa dikembangkan.']
    },
    seni: {
      minat:   ['Banyak siswa antusias mengikuti kegiatan seni (hadrah, kaligrafi, tari, musik).', 'Banyak siswa antusias mengikuti kegiatan olahraga (futsal, bela diri, atletik).'],
      sdm:     ['Madrasah memiliki pembina yang mampu melatih kegiatan seni.', 'Madrasah memiliki pembina yang mampu melatih kegiatan olahraga.'],
      sarana:  ['Ruang dan alat kegiatan seni sudah memadai.', 'Lapangan dan alat olahraga sudah memadai.'],
      potensi: ['Ada siswa yang berprestasi di bidang seni.', 'Ada siswa yang berprestasi di bidang olahraga.']
    },
    sains: {
      minat:   ['Banyak siswa antusias dengan percobaan dan kegiatan sains.', 'Banyak siswa suka mengikuti lomba atau proyek sains (olimpiade, KSM, karya ilmiah).'],
      sdm:     ['Madrasah memiliki guru yang mampu membimbing percobaan dan penelitian sederhana.', 'Ada guru yang siap membimbing siswa menghadapi olimpiade atau KSM.'],
      sarana:  ['Alat praktik dan bahan percobaan (laboratorium sederhana) sudah memadai.', 'Siswa dapat mengakses buku, internet, dan sumber belajar sains.'],
      potensi: ['Ada siswa atau alumni yang berprestasi di olimpiade atau KSM.', 'Ada karya atau proyek sains siswa yang bisa dikembangkan.']
    },
    wirausaha: {
      minat:   ['Banyak siswa tertarik pada kegiatan berwirausaha (membuat dan menjual produk).', 'Banyak siswa tertarik belajar komputer dan teknologi digital.'],
      sdm:     ['Madrasah memiliki guru yang mampu membina kewirausahaan siswa.', 'Madrasah memiliki guru yang mampu membina literasi digital (komputer, aplikasi, keamanan internet).'],
      sarana:  ['Perangkat digital (komputer, tablet, internet) sudah memadai untuk pembelajaran.', 'Tersedia ruang dan modal awal untuk praktik usaha siswa (kantin, koperasi, bazar).'],
      potensi: ['Ada kegiatan usaha atau koperasi siswa yang sudah berjalan.', 'Ada dukungan orang tua atau mitra sekitar untuk usaha dan pelatihan digital siswa.']
    }
  };
  var TEKS_ORTU = [
    function (n) { return 'Anak saya tertarik pada bidang ' + n + '.'; },
    function (n) { return 'Saya bersedia mendukung anak di bidang ' + n + ' (waktu, biaya, atau pendampingan).'; },
    function (n) { return 'Saya ingin madrasah menjadikan ' + n + ' sebagai bidang unggulan.'; }
  ];
  var TEKS_SISWA = [
    function (n) { return 'Aku suka belajar dan berkegiatan di bidang ' + n + '.'; },
    function (n) { return 'Aku ingin lebih sering ikut kegiatan ' + n + ' di madrasah.'; },
    function (n) { return 'Aku mau ikut latihan atau lomba di bidang ' + n + '.'; }
  ];
  var BUTIR = {};
  JENIS.forEach(function (j) {
    BUTIR[j] = [];
    BIDANG.forEach(function (b) {
      if (j === 'guru' || j === 'kepala') {
        SISI.forEach(function (s) {
          TEKS_STAF[b.id][s.id].forEach(function (t, i) { BUTIR[j].push([b.id + '_' + s.id + (i + 1), b.id, t, s.id]); });
        });
      } else {
        (j === 'ortu' ? TEKS_ORTU : TEKS_SISWA).forEach(function (f, i) { BUTIR[j].push([b.id + '_minat' + (i + 1), b.id, f(b.nama), 'minat']); });
      }
    });
  });
  var TERBUKA = {
    guru: ['Bidang apa yang paling layak dijadikan keunggulan madrasah? Mengapa?', 'Dukungan atau pelatihan apa yang dibutuhkan untuk mengembangkannya?', 'Kegiatan nyata apa yang bisa dimulai semester ini untuk bidang tersebut?'],
    kepala: ['Bidang apa yang paling layak dijadikan keunggulan madrasah? Mengapa?', 'Dukungan, sarana, atau anggaran apa yang dapat disiapkan madrasah?', 'Apa tantangan terbesar mengembangkan bidang tersebut, dan bagaimana mengatasinya?'],
    ortu: ['Bidang atau kegiatan apa yang Bapak/Ibu harapkan dikembangkan di madrasah?', 'Dukungan apa yang bersedia Bapak/Ibu berikan untuk kegiatan tersebut?'],
    siswa: ['Kegiatan apa yang paling ingin kamu ikuti di madrasah?', 'Apa yang membuatmu tertarik dengan kegiatan itu?']
  };
  var JUDUL = { guru: 'Angket Keunggulan (Guru)', kepala: 'Angket Keunggulan (Kepala Madrasah)', ortu: 'Angket Keunggulan (Orang Tua / Wali)', siswa: 'Angket Keunggulan (Peserta Didik)' };

  // ---------- util ----------
  function el(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function periodeSekarang() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() >= 6 ? '1' : '2'); }
  function labelPeriode(p) { var a = String(p).split('-'); return (a[1] === '1' ? 'Ganjil' : 'Genap') + ' ' + a[0]; }
  function aman(k) { return String(k || '').replace(/[.#$\[\]\/]/g, '_'); }
  function kategori(r) { r = +r.toFixed(2); return r >= 3.26 ? 'Sangat Baik' : r >= 2.51 ? 'Baik' : r >= 1.76 ? 'Cukup' : 'Kurang'; }
  function skorValid(v) { return typeof v === 'number' && v >= 1 && v <= 4 && v % 1 === 0; }
  function f2(v) { return v == null ? '-' : (+v).toFixed(2); }
  function bidangDari(id) { for (var i = 0; i < BIDANG.length; i++) if (BIDANG[i].id === id) return BIDANG[i]; return null; }
  var POLA_PERIODE = /^\d{4}-[12]$/;
  function kunciDari(o) {
    o = o || {};
    var k = o.key || o.id || o.uid;
    if (!k) { k = o.name; try { console.warn('[angket-keunggulan] responden tanpa key/id; memakai nama sebagai kunci:', o.name); } catch (e) {} }
    return k;
  }
  function bolehRekap() { return typeof currentUser !== 'undefined' && currentUser && (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.HEADMASTER); }
  function jenisAwal() { return currentUser && currentUser.role === ROLES.HEADMASTER ? 'kepala' : 'guru'; }

  // CSS sama dengan angket.js (id akqCss). Dipasang hanya bila belum ada, agar tidak ganda.
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
  // Tombol 2 x 2 berisi kata (dipasang terpisah: akqCss bisa sudah dibuat angket.js tanpa gaya ini).
  var CSS2 = '.akg-opsi{display:grid;grid-template-columns:1fr 1fr;gap:6px;}' +
    '.akg-opsi label{min-width:0;flex:none;}' +
    '.akg-opsi span{padding:10px 6px;line-height:1.25;}';
  function pasangCss() {
    if (!el('akqCss')) { var s = document.createElement('style'); s.id = 'akqCss'; s.textContent = CSS; document.head.appendChild(s); }
    if (!el('akgCss2')) { var s2 = document.createElement('style'); s2.id = 'akgCss2'; s2.textContent = CSS2; document.head.appendChild(s2); }
  }

  // ---------- status ON/OFF (terpisah dari angket kurikulum) ----------
  var STATUS_PATH = 'angket_keunggulan_status';
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
      var lewat = v.aktif === true && sisa !== null && sisa < 0;
      return { aktif: v.aktif === true && !lewat, aktifDb: v.aktif === true, lewat: lewat, batas: batas, sisa: sisa, periode: POLA_PERIODE.test(v.periode || '') ? v.periode : periodeSekarang(), tgl: v.tgl || '', diubahOleh: v.diubahOleh || '' };
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
  function htmlTutup() {
    return '<div style="padding:18px;border:1px dashed #d1d5db;border-radius:10px;text-align:center;color:#6b7280;font-size:13px;">' +
      '<div style="font-size:26px;">🔒</div><b>Angket keunggulan belum dibuka.</b><br>Angket bisa diisi setelah dibuka oleh Admin atau Kepala Madrasah.</div>';
  }
  function htmlGagal() {
    return '<div style="padding:18px;border:1px dashed #fca5a5;border-radius:10px;text-align:center;color:#b91c1c;font-size:13px;">' +
      '<div style="font-size:26px;">⚠️</div><b>Status angket tidak bisa dibaca.</b><br>Periksa koneksi internet atau izin akses (Rules Firebase), lalu coba lagi.' +
      '<div style="margin-top:10px;"><button type="button" class="btn btn-soft" data-akg-ulang="1">Coba Lagi</button></div></div>';
  }

  // ---------- form ----------
  function htmlPilihPrioritas(jenis, no, label, nilai) {
    return '<div style="margin:6px 0;"><label style="font-size:12px;display:block;margin-bottom:3px;" for="akgP' + no + '_' + jenis + '">' + esc(label) + '</label>' +
      '<select class="akq-ta" style="min-height:0;" id="akgP' + no + '_' + jenis + '"><option value="">-- pilih bidang --</option>' +
      BIDANG.map(function (b) { return '<option value="' + esc(b.id) + '"' + (nilai === b.id ? ' selected' : '') + '>' + esc(b.ikon + ' ' + b.nama) + '</option>'; }).join('') + '</select></div>';
  }
  function htmlForm(jenis, pre) {
    var kata = SKALA_KATA[jenis] || SKALA;
    var h = '<div class="akq-skala">Pilih satu jawaban untuk tiap pernyataan. Jawablah sesuai kondisi yang SEBENARNYA.</div>';
    var last = '';
    BUTIR[jenis].forEach(function (b) {
      if (b[1] !== last) { var bd = bidangDari(b[1]); h += '<div class="akq-grup">' + esc(bd.ikon + ' ' + bd.nama) + '</div>'; last = b[1]; }
      var cur = pre && pre.jawaban ? pre.jawaban[b[0]] : null;
      var label = (jenis === 'guru' || jenis === 'kepala') ? '<b>[' + esc(SISI.filter(function (s) { return s.id === b[3]; })[0].nama) + ']</b> ' : '';
      h += '<div class="akq-butir"><div class="akq-teks">' + label + esc(b[2]) + '</div><div class="akq-opsi akg-opsi" role="radiogroup" aria-label="' + esc(b[2]) + '">';
      for (var i = 1; i <= 4; i++) h += '<label><input type="radio" name="akg_' + esc(b[0]) + '" value="' + i + '"' + (cur === i ? ' checked' : '') + '><span>' + esc(kata[i - 1]) + '</span></label>';
      h += '</div></div>';
    });
    h += '<div class="akq-grup">Bidang Prioritas</div><div class="akq-butir"><div class="akq-teks">Dari lima bidang di atas, pilih bidang yang paling perlu dijadikan keunggulan madrasah.</div>' +
      htmlPilihPrioritas(jenis, '1', 'Pilihan 1 (wajib)', pre && pre.prioritas ? pre.prioritas.p1 : '') +
      htmlPilihPrioritas(jenis, '2', 'Pilihan 2 (boleh dikosongkan)', pre && pre.prioritas ? pre.prioritas.p2 : '') + '</div>';
    h += '<div class="akq-grup">Pertanyaan Terbuka</div>';
    TERBUKA[jenis].forEach(function (q, i) {
      var v = pre && pre.terbuka ? (pre.terbuka['T' + (i + 1)] || '') : '';
      h += '<div class="akq-butir"><div class="akq-teks">' + (i + 1) + '. ' + esc(q) + '</div><textarea class="akq-ta" id="akg_T' + (i + 1) + '_' + jenis + '" maxlength="600">' + esc(v) + '</textarea></div>';
    });
    return h;
  }
  function bacaForm(jenis) {
    var jawaban = {}, kosong = [];
    BUTIR[jenis].forEach(function (b) {
      var r = document.querySelector('input[name="akg_' + b[0] + '"]:checked');
      if (r) jawaban[b[0]] = parseInt(r.value, 10); else kosong.push(b[0]);
    });
    var terbuka = {};
    TERBUKA[jenis].forEach(function (q, i) { var t = el('akg_T' + (i + 1) + '_' + jenis); if (t && t.value.trim()) terbuka['T' + (i + 1)] = t.value.trim().slice(0, 600); });
    var pv = function (no) { var e = el('akgP' + no + '_' + jenis); var v = e ? e.value : ''; return bidangDari(v) ? v : ''; };
    var prioritas = { p1: pv('1') };
    if (pv('2')) prioritas.p2 = pv('2');
    return { jawaban: jawaban, terbuka: terbuka, kosong: kosong, prioritas: prioritas };
  }
  function namaKosong(kode) {
    var p = kode.split('_'), bd = bidangDari(p[0]);
    return bd ? bd.nama + ' (' + p[1].replace(/\d+$/, '') + ')' : kode;
  }

  // ---------- jawaban anonim: kunci acak, hanya disimpan lokal di perangkat ----------
  function acak() {
    try { var a = new Uint32Array(4); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return x.toString(36); }).join(''); }
    catch (e) { return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2); }
  }
  function anonKey(jenis, periode, kunci, buat) {
    var k = 'akg_anon_' + periode + '_' + jenis + '_' + aman(kunci);
    try {
      var v = localStorage.getItem(k);
      if (!v && buat) { v = 'anon_' + acak(); localStorage.setItem(k, v); }
      return v || '';
    } catch (e) { return buat ? 'anon_' + acak() : ''; }
  }
  function refResp(periode, jenis, k) { return db.ref('angket_keunggulan/' + periode + '/' + jenis + '/' + k); }

  // Simpan jawaban. Satu responden satu data per periode (mengisi ulang = memperbarui).
  function kirim(jenis, resp, periode) {
    if (!BUTIR[jenis]) return Promise.resolve(false);
    var f = bacaForm(jenis);
    if (f.kosong.length) { toast('Masih ada ' + f.kosong.length + ' butir belum dijawab (mulai dari ' + namaKosong(f.kosong[0]) + ').', true); return Promise.resolve(false); }
    if (!f.prioritas.p1) { toast('Pilih dulu bidang prioritas (Pilihan 1).', true); return Promise.resolve(false); }
    if (f.prioritas.p2 && f.prioritas.p2 === f.prioritas.p1) { toast('Pilihan 1 dan Pilihan 2 harus bidang yang berbeda.', true); return Promise.resolve(false); }
    return bacaStatus().then(function (st) {
      if (st.gagal) { toast('Tidak bisa memeriksa status angket (koneksi atau izin akses). Coba lagi.', true); return false; }
      if (!st.aktif) { toast('Angket sedang ditutup. Hubungi Admin atau Kepala Madrasah.', true); return false; }
      periode = (periode && POLA_PERIODE.test(periode)) ? periode : st.periode;
      var anon = !!resp.anonim;
      var kAsli = aman(resp.kunci);
      var kSimpan = anon ? anonKey(jenis, periode, resp.kunci, true) : kAsli;
      var kLain = anon ? kAsli : anonKey(jenis, periode, resp.kunci, false);
      var data = { nama: anon ? '' : (resp.nama || ''), jenis: jenis, periode: periode, tgl: anon ? new Date().toISOString().slice(0, 10) : new Date().toISOString(), jawaban: f.jawaban, prioritas: f.prioritas, terbuka: f.terbuka };
      return refResp(periode, jenis, kSimpan).set(data).then(function () {
        if (kLain && kLain !== kSimpan) { try { refResp(periode, jenis, kLain).remove().catch(function () {}); } catch (e) {} }
        toast('Terima kasih, angket berhasil dikirim.'); return true;
      }).catch(function (e) {
        toast('Gagal mengirim angket: ' + (e && e.message ? e.message : e), true); return false;
      });
    });
  }

  // Dipakai halaman staf dan (nanti) portal ortu/siswa.
  function renderForm(idWadah, jenis, resp, opsi) {
    pasangCss();
    var w = el(idWadah); if (!w || !BUTIR[jenis]) return;
    opsi = opsi || {};
    w.innerHTML = 'Memuat...';
    bacaStatus().then(function (st) {
      if (st.gagal) {
        w.innerHTML = htmlGagal();
        var u = w.querySelector('[data-akg-ulang]'); if (u) u.addEventListener('click', function () { renderForm(idWadah, jenis, resp, opsi); });
        return;
      }
      if (!st.aktif) { w.innerHTML = htmlTutup(); return; }
      var periode = (opsi.periode && POLA_PERIODE.test(opsi.periode)) ? opsi.periode : st.periode;
      var staf = (jenis === 'guru' || jenis === 'kepala');
      w.innerHTML = '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">' + esc(JUDUL[jenis]) + '</div>' +
        '<div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Periode: <b>' + esc(labelPeriode(periode)) + '</b>.' + (st.batas ? ' Batas pengisian: <b>' + esc(labelTgl(st.batas)) + '</b> (' + teksSisa(st.sisa) + ').' : '') + ' Jawaban dilaporkan secara gabungan dan dipakai untuk menentukan bidang keunggulan madrasah.' +
        (staf ? ' Madrasah hanya melihat siapa yang sudah mengisi, bukan isi jawaban per orang.' : '') + '</div><div id="akgFormIsi_' + jenis + '">Memuat...</div>';
      var kAsli = aman(resp.kunci);
      var kAnon = opsi.izinAnonim ? anonKey(jenis, periode, resp.kunci, false) : '';
      var baca = function (k) { return k ? refResp(periode, jenis, k).once('value').then(function (sn) { return sn.val(); }, function () { return null; }) : Promise.resolve(null); };
      Promise.all([baca(kAsli), baca(kAnon)]).then(function (r) {
        var isi = el('akgFormIsi_' + jenis); if (!isi) return;
        var pre = r[0] || r[1], ada = !!pre, anonAwal = !r[0] && !!r[1];
        isi.innerHTML = (ada ? '<div class="akq-skala" style="color:#047857;">Anda sudah mengisi angket ini pada ' + esc(new Date(pre.tgl).toLocaleDateString('id-ID')) + '. Mengirim lagi akan memperbarui jawaban sebelumnya.</div>' : '') +
          htmlForm(jenis, pre) + (opsi.izinAnonim ? '<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:12px;cursor:pointer;"><input type="checkbox" id="akgAnonim_' + jenis + '"' + (anonAwal ? ' checked' : '') + '> <span>Kirim sebagai anonim (identitas tidak disimpan bersama jawaban). <span style="color:#6b7280;">Jawaban anonim hanya bisa diperbarui dari perangkat ini.</span></span></label>' : '') +
          '<div style="margin-top:14px;"><button class="btn btn-primary" id="akgKirim_' + jenis + '" type="button">' + (ada ? 'Perbarui Jawaban' : 'Kirim Angket') + '</button></div>';
        el('akgKirim_' + jenis).addEventListener('click', function () {
          var b = this; b.disabled = true;
          var an = el('akgAnonim_' + jenis); var resp2 = { kunci: resp.kunci, nama: resp.nama, anonim: an ? an.checked : !!resp.anonim };
          kirim(jenis, resp2, periode).then(function (ok) { b.disabled = false; if (ok) renderForm(idWadah, jenis, resp, opsi); });
        });
      });
    });
  }

  // ---------- rekap ----------
  function rata(arr) { var a = arr.filter(function (x) { return x != null; }); return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  // Skor satu sisi dari satu responden: rata-rata butir bidang_sisi (kode lama tanpa angka ikut terbaca).
  function skorSisi(r, bid, sisi) {
    var j = r && r.jawaban; if (!j) return null;
    var pre = bid + '_' + sisi, v = [];
    Object.keys(j).forEach(function (k) {
      if ((k === pre || (k.indexOf(pre) === 0 && /^\d$/.test(k.slice(pre.length)))) && skorValid(j[k])) v.push(j[k]);
    });
    return v.length ? v.reduce(function (t, x) { return t + x; }, 0) / v.length : null;
  }
  function avgBidangSisi(daftarPerJenis, jenisDipakai, bid, sisi) {
    // rata-rata per responden, lalu per jenis, lalu antarjenis agar bobot tiap kelompok sama
    var per = jenisDipakai.map(function (j) {
      var nilai = (daftarPerJenis[j] || []).map(function (r) { return skorSisi(r, bid, sisi); }).filter(function (v) { return v != null; });
      return nilai.length ? nilai.reduce(function (t, x) { return t + x; }, 0) / nilai.length : null;
    });
    return rata(per);
  }
  function hitungPrioritas(daftarPerJenis) {
    var hasil = BIDANG.map(function (b) { return { b: b, p1: 0, p2: 0 }; });
    JENIS.forEach(function (j) {
      (daftarPerJenis[j] || []).forEach(function (r) {
        var pr = r && r.prioritas; if (!pr) return;
        hasil.forEach(function (x) { if (pr.p1 === x.b.id) x.p1++; if (pr.p2 === x.b.id) x.p2++; });
      });
    });
    return hasil;
  }
  function hitungMatriks(daftarPerJenis) {
    var baris = BIDANG.map(function (b) {
      var minat = avgBidangSisi(daftarPerJenis, JENIS, b.id, 'minat');
      var sdm = avgBidangSisi(daftarPerJenis, ['guru', 'kepala'], b.id, 'sdm');
      var sarana = avgBidangSisi(daftarPerJenis, ['guru', 'kepala'], b.id, 'sarana');
      var potensi = avgBidangSisi(daftarPerJenis, ['guru', 'kepala'], b.id, 'potensi');
      var lengkap = minat != null && sdm != null && sarana != null && potensi != null;
      return { b: b, minat: minat, sdm: sdm, sarana: sarana, potensi: potensi, total: lengkap ? minat + sdm + sarana + potensi : null };
    });
    var urut = baris.filter(function (x) { return x.total != null; }).sort(function (a, c) { return c.total - a.total; });
    baris.forEach(function (x) { x.rank = x.total == null ? null : urut.indexOf(x) + 1; });
    return baris;
  }
  // Skor dimensi profil lulusan semester aktif dari Angket Profil (bila modulnya ada & boleh dibaca).
  function bacaSkorProfil() {
    if (typeof P8_DIMENSI === 'undefined') return Promise.resolve(null);
    var p = (typeof p8Periode === 'function') ? p8Periode() : { ta: '', sem: '' };
    return db.ref('angket_profil').once('value').then(function (sn) {
      var v = sn.val() || {}, tot = [0, 0, 0, 0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0, 0, 0, 0], anak = 0;
      Object.keys(v).forEach(function (k) {
        var r = v[k]; if (!r || !r.jawaban) return;
        if (p.ta && String(r.tahunAjaran) !== p.ta) return;
        if (p.sem && String(r.semester) !== p.sem) return;
        anak++;
        for (var d = 0; d < 8; d++) for (var i = 0; i < 3; i++) {
          var x = Number(r.jawaban[d * 3 + i]);
          if (x >= 1 && x <= 4) { tot[d] += x; n[d]++; }
        }
      });
      if (!anak) return null;
      return { skor: tot.map(function (t, d) { return n[d] ? t / n[d] : null; }), anak: anak, ta: p.ta, sem: p.sem };
    }, function () { return null; });
  }
  function skorProfilBidang(prof, b) {
    if (!prof) return null;
    return rata(b.dim.map(function (d) { return prof.skor[d]; }));
  }
  function namaDim(idx) { return (typeof P8_DIMENSI !== 'undefined' && P8_DIMENSI[idx]) ? P8_DIMENSI[idx].nama : DIM_NAMA[idx]; }

  function htmlRekap(periode, data, prof) {
    var per = {}; var jml = {};
    JENIS.forEach(function (j) { per[j] = Object.keys(data[j] || {}).map(function (k) { return data[j][k]; }); jml[j] = per[j].length; });
    var totalResp = JENIS.reduce(function (s, j) { return s + jml[j]; }, 0);
    if (!totalResp) return '<div class="akq-skala">Belum ada jawaban untuk periode ' + esc(labelPeriode(periode)) + '.</div>';
    var m = hitungMatriks(per);
    var h = '<div class="akq-grup">Responden</div><div class="akq-scroll"><table class="akq-tbl"><tr>' + JENIS.map(function (j) { return '<th>' + esc(JUDUL_JENIS[j]) + '</th>'; }).join('') + '</tr><tr>' +
      JENIS.map(function (j) { return '<td>' + jml[j] + '</td>'; }).join('') + '</tr></table></div>';

    h += '<div class="akq-grup">Matriks Skor Bidang Keunggulan (skala 1-4, total maksimum 16)</div><div class="akq-scroll"><table class="akq-tbl"><tr><th>Bidang</th><th>Minat</th><th>SDM</th><th>Sarana</th><th>Potensi</th><th>Total</th><th>Peringkat</th></tr>' +
      m.map(function (x) {
        var tebal = x.rank && x.rank <= 2 ? ' style="background:#ecfdf5;font-weight:700;"' : '';
        return '<tr' + tebal + '><td>' + esc(x.b.ikon + ' ' + x.b.nama) + '</td><td>' + f2(x.minat) + '</td><td>' + f2(x.sdm) + '</td><td>' + f2(x.sarana) + '</td><td>' + f2(x.potensi) + '</td><td>' + f2(x.total) + '</td><td>' + (x.rank || '-') + '</td></tr>';
      }).join('') + '</table></div>';
    var prio = hitungPrioritas(per);
    h += '<div class="akq-grup">Pilihan Bidang Prioritas</div><div class="akq-skala">Jumlah responden yang memilih bidang sebagai prioritas. Tidak ikut dijumlahkan ke total skor; dipakai sebagai pembanding.</div><div class="akq-scroll"><table class="akq-tbl"><tr><th>Bidang</th><th>Pilihan 1</th><th>Pilihan 2</th><th>Jumlah</th></tr>' +
      prio.map(function (x) { return '<tr><td>' + esc(x.b.ikon + ' ' + x.b.nama) + '</td><td>' + x.p1 + '</td><td>' + x.p2 + '</td><td>' + (x.p1 + x.p2) + '</td></tr>'; }).join('') + '</table></div>';
    var kurang = [];
    if (!(jml.guru + jml.kepala)) kurang.push('SDM, Sarana, dan Potensi dihitung dari guru dan kepala madrasah, yang belum mengisi');
    if (!jml.ortu && !jml.siswa) kurang.push('Minat belum memuat suara orang tua dan siswa');
    if (kurang.length) h += '<div class="akq-skala" style="color:#b45309;">Catatan: ' + esc(kurang.join('; ')) + '. Peringkat sementara belum mewakili semua pihak.</div>';

    var top = m.filter(function (x) { return x.rank && x.rank <= 2; }).sort(function (a, c) { return a.rank - c.rank; });
    if (top.length) {
      h += '<div style="font-size:13px;margin:8px 0;padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;"><b>Usulan bidang unggulan:</b> ' +
        top.map(function (x) { return esc(x.b.nama) + ' (' + f2(x.total) + ')'; }).join(' dan ') + '. ' +
        'Sisi dengan skor terendah pada bidang tersebut menjadi bahan rencana tindak lanjut: ' +
        top.map(function (x) {
          var s = SISI.map(function (si) { return { n: si.nama, v: x[si.id] }; }).filter(function (q) { return q.v != null; }).sort(function (a, c) { return a.v - c.v; })[0];
          return esc(x.b.nama) + (s ? ' (' + esc(s.n) + ' ' + f2(s.v) + ')' : '');
        }).join(', ') + '.</div>';
    }

    if (prof) {
      var urutDim = prof.skor.map(function (v, i) { return { i: i, v: v }; }).filter(function (q) { return q.v != null; }).sort(function (a, c) { return a.v - c.v; });
      h += '<div class="akq-grup">Pemetaan ke Dimensi Profil Lulusan</div>' +
        '<div class="akq-skala">Skor dimensi dari Angket Profil Lulusan (isian orang tua, ' + prof.anak + ' anak' + (prof.sem ? ', semester ' + esc(prof.sem) : '') + (prof.ta ? ' TA ' + esc(prof.ta) : '') + '). Skor dimensi yang rendah berarti bidang yang menguatkannya layak diprioritaskan. Skor ini tidak ikut dijumlahkan ke total bidang.</div>' +
        '<div class="akq-scroll"><table class="akq-tbl"><tr><th>Bidang</th><th>Dimensi yang dikuatkan</th><th>Skor dimensi (rata-rata)</th></tr>' +
        m.map(function (x) {
          return '<tr><td>' + esc(x.b.ikon + ' ' + x.b.nama) + '</td><td>' + x.b.dim.map(function (d) { return esc(namaDim(d)) + ' (' + f2(prof.skor[d]) + ')'; }).join(', ') + '</td><td>' + f2(skorProfilBidang(prof, x.b)) + '</td></tr>';
        }).join('') + '</table></div>';
      if (urutDim.length >= 2) {
        var rendah = urutDim.slice(0, 2).map(function (q) { return q.i; });
        var cocok = m.filter(function (x) { return x.b.dim.some(function (d) { return rendah.indexOf(d) !== -1; }); }).map(function (x) { return esc(x.b.nama); });
        h += '<div style="font-size:12px;margin:6px 0;">Dua dimensi terendah: <b>' + rendah.map(function (d) { return esc(namaDim(d)) + ' (' + f2(prof.skor[d]) + ')'; }).join(' dan ') + '</b>' +
          (cocok.length ? '. Bidang yang menguatkannya: ' + cocok.join(', ') + '.' : '.') + '</div>';
      }
    } else {
      h += '<div class="akq-skala">Pemetaan dimensi profil belum tampil: belum ada data Angket Profil Lulusan semester aktif, atau akses bacanya belum diizinkan.</div>';
    }

    h += '<div class="akq-grup">Jawaban Terbuka</div>';
    var adaTerbuka = false;
    JENIS.forEach(function (j) {
      var isi = [];
      per[j].forEach(function (r) {
        TERBUKA[j].forEach(function (q, i) {
          var t = r.terbuka && r.terbuka['T' + (i + 1)];
          if (t) isi.push('<li><span style="color:#6b7280;">' + esc(q) + '</span><br>' + esc(t) + '</li>');
        });
      });
      if (isi.length) { adaTerbuka = true; h += '<details style="margin:6px 0;"><summary style="cursor:pointer;font-size:13px;">' + esc(JUDUL_JENIS[j]) + ' (' + isi.length + ')</summary><ul style="font-size:12px;margin:6px 0 0 16px;">' + isi.join('') + '</ul></details>'; }
    });
    if (!adaTerbuka) h += '<div class="akq-skala">Belum ada jawaban terbuka.</div>';
    h += '<div style="margin-top:12px;"><button type="button" class="btn btn-soft" id="akgCsv">Unduh CSV</button></div>';
    return { html: h, matriks: m, jml: jml, prio: prio };
  }

  function unduhCsv(periode, matriks, jml, prof, prio) {
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var kepala = ['Bidang', 'Minat', 'SDM', 'Sarana', 'Potensi', 'Total (maks 16)', 'Peringkat', 'Dimensi yang dikuatkan', 'Skor dimensi profil', 'Pilihan prioritas 1', 'Pilihan prioritas 2'];
    var baris = matriks.map(function (x, ix) {
      var pz = prio && prio[ix] ? prio[ix] : { p1: '', p2: '' };
      return [x.b.nama, f2(x.minat), f2(x.sdm), f2(x.sarana), f2(x.potensi), f2(x.total), x.rank || '', x.b.dim.map(namaDim).join(' / '), prof ? f2(skorProfilBidang(prof, x.b)) : '', pz.p1, pz.p2];
    });
    var info = [['Periode', labelPeriode(periode)], ['Responden', JENIS.map(function (j) { return JUDUL_JENIS[j] + ': ' + jml[j]; }).join(' | ')], []];
    var csv = '\ufeff' + info.concat([kepala], baris).map(function (r) { return r.map(q).join(';'); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'angket-keunggulan_' + periode + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }


  // ---------- Pengingat via WhatsApp (Admin/Kepala, di tab Rekap) ----------
  // Cara kerja sama dengan pengingat tunggakan infaq: aplikasi TIDAK mengirim otomatis. Tombol membuka WhatsApp
  // (wa.me) dengan pesan yang sudah terisi, lalu pengirim menekan Kirim. Tanda "diingatkan" disimpan di perangkat ini saja.
  // Orang tua : jawaban disimpan dengan kunci hash (tanpa No. WA) jadi tidak bisa dicocokkan -> SEMUA nomor orang tua
  //             aktif diingatkan (satu pesan per nomor walau punya beberapa anak). Keanoniman tetap terjaga.
  // Guru      : hanya guru yang jawabannya TIDAK anonim yang dikenali sudah mengisi; jawaban anonim diberi catatan.
  var FIELD_WA_GURU = ['noWa', 'noWA', 'no_wa', 'wa', 'noHp', 'noHP', 'hp', 'telp', 'telepon', 'phone'];
  function nomorWa(x) {
    var d = String(x == null ? '' : x).replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.charAt(0) === '0') d = '62' + d.slice(1); else if (d.charAt(0) === '8') d = '62' + d;
    return (d.indexOf('62') === 0 && d.length >= 10 && d.length <= 15) ? d : '';
  }
  function waGuru(g) { for (var i = 0; i < FIELD_WA_GURU.length; i++) { var n = nomorWa(g && g[FIELD_WA_GURU[i]]); if (n) return n; } return ''; }
  function namaMadrasah() { try { if (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) return MADRASAH.nama; } catch (e) {} return 'Madrasah'; }
  function basisUrl() { return location.origin + location.pathname.replace(/[^\/]*$/, ''); }
  function infoBatasWa(st) {
    if (!st || !st.batas) return '';
    return 'Batas pengisian: ' + labelTgl(st.batas) + (st.sisa !== null && st.sisa !== undefined ? ' (' + teksSisa(st.sisa) + ')' : '') + '.\n';
  }
  function pesanOrtu(st, anak) {
    return 'Assalamu\u2019alaikum Bapak/Ibu' + (anak ? ' wali dari ' + anak : ' wali murid') + '.\n\n' +
      'Angket Keunggulan ' + namaMadrasah() + ' periode ' + labelPeriode(st.periode) + ' sedang dibuka. Mohon Bapak/Ibu dan ananda berkenan mengisinya lewat Portal Wali Murid:\n' + basisUrl() + '?app=ortu\n\n' +
      infoBatasWa(st) + 'Pengisian hanya beberapa menit dan boleh anonim.\n\nTerima kasih.\n' + namaMadrasah();
  }
  function pesanGuru(st, nama) {
    return 'Assalamu\u2019alaikum' + (nama ? ' Bapak/Ibu ' + nama : ' Bapak/Ibu Guru') + '.\n\n' +
      'Angket Keunggulan ' + namaMadrasah() + ' periode ' + labelPeriode(st.periode) + ' sedang dibuka. Mohon diisi lewat aplikasi SI MAMBA, menu Angket \u2192 tab \uD83C\uDF1F Keunggulan:\n' + basisUrl() + '\n\n' +
      infoBatasWa(st) + 'Terima kasih.\n' + namaMadrasah();
  }
  function tandaWa(periode, jenis, k) { return 'akg_wa_' + periode + '_' + jenis + '_' + aman(k); }
  function sudahWa(periode, jenis, k) { try { return localStorage.getItem(tandaWa(periode, jenis, k)) || ''; } catch (e) { return ''; } }
  function catatWa(periode, jenis, k) { try { localStorage.setItem(tandaWa(periode, jenis, k), hariIni()); } catch (e) {} }
  function bukaWa(no, teks) { window.open('https://wa.me/' + no + '?text=' + encodeURIComponent(teks), '_blank', 'noopener'); }
  function salinTeks(teks) {
    function cadangan() { var t = document.createElement('textarea'); t.value = teks; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(t); toast(ok ? 'Pesan disalin.' : 'Gagal menyalin pesan.', !ok); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(function () { toast('Pesan disalin.'); }, cadangan); else cadangan();
  }
  function ambilGuru() {
    try { if (typeof allGuru !== 'undefined' && allGuru && allGuru.length) return Promise.resolve(allGuru.slice()); } catch (e) {}
    return db.ref('guru').once('value').then(function (sn) { var l = []; sn.forEach(function (c) { var g = c.val(); if (g) { g.key = c.key; l.push(g); } }); return l; }, function () { return []; });
  }
  function ambilSiswaAktif() {
    try { if (typeof allSiswa !== 'undefined' && allSiswa && allSiswa.length) return Promise.resolve(allSiswa.slice()); } catch (e) {}
    return db.ref('siswa').once('value').then(function (sn) { var l = []; sn.forEach(function (c) { var x = c.val(); if (x && x.aktif !== false) { x.key = c.key; l.push(x); } }); return l; }, function () { return []; });
  }
  function renderWa(periode, data) {
    var w = el('akgWa'); if (!w) return;
    w.innerHTML = '<div class="akq-grup">\uD83D\uDCF2 Ingatkan via WhatsApp</div><div class="akq-skala">Memuat daftar...</div>';
    Promise.all([bacaStatus(), ambilGuru(), ambilSiswaAktif()]).then(function (r) {
      if (el('akgWa') !== w) return;
      var st = r[0], guruAll = r[1], siswaAll = r[2];
      if (st.gagal) { w.innerHTML = '<div class="akq-grup">\uD83D\uDCF2 Ingatkan via WhatsApp</div><div class="akq-skala" style="color:#b91c1c;">Status angket tidak bisa dibaca.</div>'; return; }
      var head = '<div class="akq-grup">\uD83D\uDCF2 Ingatkan via WhatsApp</div>';
      if (!st.aktif || periode !== st.periode) {
        w.innerHTML = head + '<div class="akq-skala">Pengingat hanya tersedia saat angket DIBUKA dan periode yang dipilih sama dengan periode berjalan (' + esc(labelPeriode(st.periode)) + ').</div>'; return;
      }
      // ---- guru ----
      var pg = data.guru || {}, kunciSudah = {}, namaSudah = {}, anonim = 0;
      Object.keys(pg).forEach(function (k) { kunciSudah[k] = true; var nm = pg[k] && pg[k].nama; if (nm) namaSudah[String(nm).trim().toLowerCase()] = true; else anonim++; });
      var guruList = guruAll.filter(function (g) {
        if (!g || g.aktif === false) return false;
        if (g.role === ROLES.ADMIN || g.role === ROLES.HEADMASTER) return false;
        return true;
      }).filter(function (g) {
        var k = aman(kunciDari(g));
        return !(kunciSudah[k] || (g.name && namaSudah[String(g.name).trim().toLowerCase()]));
      });
      // ---- orang tua: satu baris per nomor ----
      var peta = {}, tanpaNomor = 0;
      siswaAll.forEach(function (s) {
        var n = nomorWa(s.noWaOrtu); if (!n) { tanpaNomor++; return; }
        (peta[n] = peta[n] || { no: n, anak: [], kelas: {} }).anak.push(s.nama || s.name || '-');
        if (s.kelas) peta[n].kelas[s.kelas] = true;
      });
      var ortuList = Object.keys(peta).map(function (k) { return peta[k]; }).sort(function (a, b) { return a.anak[0].localeCompare(b.anak[0]); });
      var kelasAda = {}; ortuList.forEach(function (o) { Object.keys(o.kelas).forEach(function (k) { kelasAda[k] = true; }); });
      var kelasOpsi = Object.keys(kelasAda).sort();

      function barisGuru(g, i) {
        var no = waGuru(g), t = sudahWa(periode, 'guru', kunciDari(g));
        return '<tr><td>' + esc(g.name || '-') + '</td><td>' + (no ? esc(no) : '<span style="color:#b45309;">tanpa No. WA</span>') + '</td><td>' +
          (no ? '<button type="button" class="btn btn-soft" data-akgwa="guru" data-i="' + i + '">' + (t ? 'Ingatkan lagi' : 'Kirim WA') + '</button>' + (t ? ' <span style="font-size:11px;color:#047857;">\u2713 ' + esc(t) + '</span>' : '') : '-') + '</td></tr>';
      }
      function barisOrtu(o, i) {
        var t = sudahWa(periode, 'ortu', o.no);
        return '<tr data-kelas="' + esc(Object.keys(o.kelas).join('|')) + '"><td>' + esc(o.anak.join(', ')) + '<div style="font-size:11px;color:#6b7280;">' + esc(Object.keys(o.kelas).join(', ')) + '</div></td><td>' + esc(o.no) + '</td><td>' +
          '<button type="button" class="btn btn-soft" data-akgwa="ortu" data-i="' + i + '">' + (t ? 'Ingatkan lagi' : 'Kirim WA') + '</button>' + (t ? ' <span style="font-size:11px;color:#047857;">\u2713 ' + esc(t) + '</span>' : '') + '</td></tr>';
      }
      var h = head +
        '<div class="akq-skala">Tombol membuka WhatsApp dengan pesan yang sudah terisi; Anda tinggal menekan Kirim. Tanda \u2713 hanya tersimpan di perangkat ini.</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;"><button type="button" class="btn btn-soft" data-akgsalin="guru">Salin pesan untuk grup Guru</button><button type="button" class="btn btn-soft" data-akgsalin="ortu">Salin pesan untuk grup Orang Tua</button></div>' +
        '<details open style="margin:8px 0;"><summary style="cursor:pointer;font-size:13px;"><b>Guru yang belum tercatat mengisi (' + guruList.length + ')</b></summary>' +
        (anonim ? '<div class="akq-skala">Ada ' + anonim + ' jawaban guru anonim yang tidak bisa dikenali, jadi sebanyak itu dari daftar ini mungkin sebenarnya sudah mengisi.</div>' : '') +
        (guruList.length ? '<div class="akq-scroll"><table class="akq-tbl"><tr><th>Nama</th><th>No. WA</th><th></th></tr>' + guruList.map(barisGuru).join('') + '</table></div>' : '<div class="akq-skala">Semua guru aktif sudah tercatat mengisi.</div>') +
        '</details>' +
        '<details style="margin:8px 0;"><summary style="cursor:pointer;font-size:13px;"><b>Orang tua / wali (' + ortuList.length + ' nomor)</b></summary>' +
        '<div class="akq-skala">Jawaban orang tua anonim dan tidak terhubung ke nomor WA, jadi pengingat ini ke semua nomor aktif.' + (tanpaNomor ? ' ' + tanpaNomor + ' siswa belum punya No. WA orang tua yang valid.' : '') + '</div>' +
        (kelasOpsi.length ? '<div style="font-size:13px;margin-bottom:6px;">Kelas: <select id="akgWaKelas"><option value="">Semua</option>' + kelasOpsi.map(function (k) { return '<option value="' + esc(k) + '">' + esc(k) + '</option>'; }).join('') + '</select></div>' : '') +
        (ortuList.length ? '<div class="akq-scroll"><table class="akq-tbl" id="akgWaOrtuTbl"><tr><th>Anak</th><th>No. WA</th><th></th></tr>' + ortuList.map(barisOrtu).join('') + '</table></div>' : '<div class="akq-skala">Belum ada No. WA orang tua yang valid.</div>') +
        '</details>';
      w.innerHTML = h;

      var kel = el('akgWaKelas');
      if (kel) kel.addEventListener('change', function () {
        var v = kel.value, rows = el('akgWaOrtuTbl').querySelectorAll('tr[data-kelas]');
        Array.prototype.forEach.call(rows, function (tr) { tr.style.display = (!v || tr.getAttribute('data-kelas').split('|').indexOf(v) !== -1) ? '' : 'none'; });
      });
      Array.prototype.forEach.call(w.querySelectorAll('[data-akgwa]'), function (b) {
        b.addEventListener('click', function () {
          var jenis = b.getAttribute('data-akgwa'), i = +b.getAttribute('data-i');
          if (jenis === 'guru') { var g = guruList[i]; bukaWa(waGuru(g), pesanGuru(st, g.name)); catatWa(periode, 'guru', kunciDari(g)); }
          else { var o = ortuList[i]; bukaWa(o.no, pesanOrtu(st, o.anak.join(', '))); catatWa(periode, 'ortu', o.no); }
          b.textContent = 'Ingatkan lagi';
          if (!b.parentNode.querySelector('.akg-ok')) { var sp = document.createElement('span'); sp.className = 'akg-ok'; sp.style.cssText = 'font-size:11px;color:#047857;margin-left:4px;'; sp.textContent = '\u2713 ' + hariIni(); b.parentNode.appendChild(sp); }
        });
      });
      Array.prototype.forEach.call(w.querySelectorAll('[data-akgsalin]'), function (b) {
        b.addEventListener('click', function () { salinTeks(b.getAttribute('data-akgsalin') === 'guru' ? pesanGuru(st, '') : pesanOrtu(st, '')); });
      });
    }).catch(function (e) { if (el('akgWa') === w) w.innerHTML = '<div class="akq-grup">\uD83D\uDCF2 Ingatkan via WhatsApp</div><div class="akq-skala" style="color:#b91c1c;">Gagal memuat daftar: ' + esc(e && e.message ? e.message : e) + '</div>'; });
  }

  function renderRekap() {
    var sel = el('akgPeriode'), w = el('akgRekapIsi'); if (!sel || !w) return;
    var periode = sel.value;
    w.innerHTML = 'Memuat...';
    Promise.all([
      db.ref('angket_keunggulan/' + periode).once('value').then(function (sn) { return { ok: true, v: sn.val() || {} }; }, function (e) { return { ok: false, e: e }; }),
      bacaSkorProfil()
    ]).then(function (r) {
      if (el('akgPeriode') !== sel) return;
      if (!r[0].ok) { w.innerHTML = '<div class="akq-skala" style="color:#b91c1c;">Rekap tidak bisa dibaca. Periksa koneksi atau Rules Firebase untuk angket_keunggulan.</div>'; return; }
      var out = htmlRekap(periode, r[0].v, r[1]);
      if (typeof out === 'string') { w.innerHTML = out; renderWa(periode, r[0].v); return; }
      w.innerHTML = out.html;
      renderWa(periode, r[0].v);
      var b = el('akgCsv'); if (b) b.addEventListener('click', function () { unduhCsv(periode, out.matriks, out.jml, r[1], out.prio); });
    });
  }

  // ---------- halaman staf ----------
  function setupPage() {
    pasangCss();
    var p = el('angketKeunggulanArea'); if (!p || typeof currentUser === 'undefined' || !currentUser) return;
    var isiAngket = currentUser.role !== ROLES.ADMIN; // Admin hanya melihat rekap
    var jenis = jenisAwal();
    p.innerHTML = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">🌟 Angket Keunggulan Madrasah</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:10px;">Tahfidz, Bahasa, Seni &amp; Olahraga, Sains &amp; Riset, serta Kewirausahaan &amp; Literasi Digital. Isian Anda membantu madrasah memilih bidang keunggulan.</p>' +
      (bolehRekap() ? '<div id="akgStatus" style="margin-bottom:12px;"></div>' : '') +
      '<div class="akq-tabs">' + (isiAngket ? '<button type="button" class="akq-tab on" data-akg-sub="isi">Isi Angket</button>' : '') +
      (bolehRekap() ? '<button type="button" class="akq-tab' + (isiAngket ? '' : ' on') + '" data-akg-sub="rekap">Rekap</button>' : '') + '</div>' +
      '<div id="akgTabIsi"' + (isiAngket ? '' : ' class="hidden"') + '><div id="akgWadahForm"></div></div>' +
      '<div id="akgTabRekap" class="hidden"><div style="font-size:13px;margin-bottom:8px;">Periode: <select id="akgPeriode"></select></div><div id="akgRekapIsi"></div><div id="akgWa"></div></div></div>';

    function muatForm() { renderForm('akgWadahForm', jenis, { kunci: kunciDari(currentUser), nama: currentUser.name }, { izinAnonim: jenis === 'guru' }); }

    function renderStatus() {
      var w = el('akgStatus'); if (!w) return;
      bacaStatus().then(function (st) {
        if (st.gagal) {
          w.innerHTML = '<div style="padding:10px 12px;border-radius:10px;border:1px solid #fca5a5;background:#fef2f2;font-size:13px;color:#b91c1c;">Status angket tidak bisa dibaca. Periksa koneksi atau Rules Firebase. <button type="button" class="btn btn-soft" id="akgUlangStatus">Coba Lagi</button></div>';
          var u = el('akgUlangStatus'); if (u) u.addEventListener('click', renderStatus);
          return;
        }
        var on = st.aktif;
        var infoBatas = on && st.batas ? '<br>Batas pengisian: <b>' + esc(labelTgl(st.batas)) + '</b> (' + teksSisa(st.sisa) + ').' : '';
        var infoLewat = st.lewat ? '<br><span style="color:#b45309;">Batas waktu (' + esc(labelTgl(st.batas)) + ') sudah lewat, angket tertutup otomatis. Buka kembali dengan batas baru bila perlu.</span>' : '';
        w.innerHTML = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;border:1px solid ' + (on ? '#a7f3d0' : '#e5e7eb') + ';background:' + (on ? '#ecfdf5' : '#f9fafb') + ';">' +
          '<div style="flex:1;min-width:180px;font-size:13px;"><b>Status angket keunggulan: ' + (on ? 'DIBUKA' : 'DITUTUP') + '</b><br><span style="font-size:12px;color:#6b7280;">' +
          (on ? 'Periode ' + esc(labelPeriode(st.periode)) + '. Responden dapat mengisi.' : 'Belum bisa diisi. Tekan tombol untuk memulai.') + infoBatas + infoLewat +
          (st.tgl ? '<br>Diubah ' + esc(new Date(st.tgl).toLocaleString('id-ID')) + (st.diubahOleh ? ' oleh ' + esc(st.diubahOleh) : '') : '') +
          '</span></div>' +
          '<button type="button" class="btn ' + (on ? 'btn-danger' : 'btn-success') + '" id="akgToggle">' + (on ? 'Tutup Angket (OFF)' : 'Buka Angket (ON)') + '</button>' +
          '<div style="flex-basis:100%;font-size:12px;color:#374151;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">Batas pengisian (opsional): ' +
          '<input type="date" id="akgBatas" min="' + hariIni() + '" value="' + (on ? esc(st.batas) : '') + '" style="padding:4px 6px;border:1px solid #d1d5db;border-radius:8px;">' +
          (on ? '<button type="button" class="btn btn-soft" id="akgSimpanBatas">Simpan Batas</button>' : '') +
          '<span style="color:#6b7280;">Setelah tanggal ini angket tertutup otomatis. Kosongkan bila tanpa batas.</span></div></div>';
        function batasValid() {
          var bt = (el('akgBatas') || {}).value || '';
          if (bt && bt < hariIni()) { toast('Batas waktu tidak boleh tanggal yang sudah lewat.', true); return null; }
          return bt;
        }
        el('akgToggle').addEventListener('click', function () {
          if (on && !confirm('Tutup angket keunggulan? Responden tidak bisa mengisi lagi sampai dibuka kembali. Jawaban yang sudah masuk tetap tersimpan.')) return;
          var bt = on ? '' : batasValid(); if (bt === null) return;
          this.disabled = true;
          aturStatus(!on, bt).then(function () {
            toast(on ? 'Angket keunggulan ditutup.' : 'Angket keunggulan dibuka untuk periode ' + labelPeriode(periodeSekarang()) + (bt ? ', batas ' + labelTgl(bt) : '') + '.');
            renderStatus(); if (isiAngket) muatForm(); if (el('akgPeriode')) renderRekap();
          }).catch(function (e) { toast('Gagal mengubah status: ' + (e && e.message ? e.message : e), true); renderStatus(); });
        });
        var sb = el('akgSimpanBatas');
        if (sb) sb.addEventListener('click', function () {
          var bt = batasValid(); if (bt === null) return;
          this.disabled = true;
          aturBatas(bt).then(function () {
            toast(bt ? 'Batas pengisian disimpan: ' + labelTgl(bt) + '.' : 'Batas pengisian dihapus.');
            renderStatus(); if (el('akgPeriode')) renderRekap();
          }).catch(function (e) { toast('Gagal menyimpan batas: ' + (e && e.message ? e.message : e), true); renderStatus(); });
        });
      });
    }
    renderStatus();

    var sel = el('akgPeriode'), siap = Promise.resolve();
    if (sel) {
      var y = new Date().getFullYear(), opt = '';
      for (var t = y; t >= y - 2; t--) { opt += '<option value="' + t + '-2">Genap ' + t + '</option><option value="' + t + '-1">Ganjil ' + t + '</option>'; }
      sel.innerHTML = opt; sel.value = periodeSekarang(); sel.addEventListener('change', renderRekap);
      siap = bacaStatus().then(function (st) {
        if (st.gagal || !POLA_PERIODE.test(st.periode)) return;
        var ada = Array.prototype.some.call(sel.options, function (o) { return o.value === st.periode; });
        if (!ada) { var o = document.createElement('option'); o.value = st.periode; o.textContent = labelPeriode(st.periode); sel.insertBefore(o, sel.firstChild); }
        sel.value = st.periode;
      });
    }
    Array.prototype.forEach.call(p.querySelectorAll('[data-akg-sub]'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(p.querySelectorAll('[data-akg-sub]'), function (x) { x.classList.toggle('on', x === b); });
        var rekap = b.getAttribute('data-akg-sub') === 'rekap';
        el('akgTabIsi').classList.toggle('hidden', rekap);
        el('akgTabRekap').classList.toggle('hidden', !rekap);
        if (rekap) siap.then(renderRekap);
      });
    });
    if (isiAngket) muatForm(); else { el('akgTabRekap').classList.remove('hidden'); siap.then(renderRekap); }
  }

  // ---------- sambungkan sebagai tab ketiga pada halaman Angket ----------
  // Membungkus setupAngketPage() milik js/angket.js: setelah bar tab dibuat, tambahkan tab "Keunggulan".
  // Tidak perlu mengubah index.html: wadah #angketKeunggulanArea dibuat otomatis di bawah wadah Profil.
  function tambahTab() {
    var bar = el('angketTabBar'), k = el('angketKurikulumArea'), pr = el('angketProfilArea');
    if (!bar || !k || !pr || typeof currentUser === 'undefined' || !currentUser) return;
    var area = el('angketKeunggulanArea');
    if (!area) {
      area = document.createElement('div'); area.id = 'angketKeunggulanArea';
      pr.parentNode.insertBefore(area, pr.nextSibling);
    }
    area.className = 'hidden'; area.innerHTML = '';
    bar.classList.remove('hidden');
    var lama = bar.querySelector('[data-angket-tab="keunggulan"]'); if (lama) lama.remove();   // cegah tombol ganda bila setupAngketPage dipanggil ulang
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'akq-tab'; btn.setAttribute('data-angket-tab', 'keunggulan');
    btn.textContent = '🌟 Keunggulan';
    bar.appendChild(btn);
    var terisi = false;
    // tab lain: sembunyikan wadah Keunggulan (handler bawaan sudah mengatur Kurikulum/Profil)
    Array.prototype.forEach.call(bar.querySelectorAll('[data-angket-tab]'), function (b) {
      if (b === btn) return;
      b.addEventListener('click', function () { area.classList.add('hidden'); btn.classList.remove('on'); });
    });
    btn.addEventListener('click', function () {
      k.classList.add('hidden'); pr.classList.add('hidden'); area.classList.remove('hidden');
      Array.prototype.forEach.call(bar.querySelectorAll('[data-angket-tab]'), function (b) { b.classList.toggle('on', b === btn); });
      if (!terisi) { terisi = true; setupPage(); }
    });
  }
  var setupAsli = window.setupAngketPage;
  window.setupAngketPage = function () {
    if (typeof setupAsli === 'function') setupAsli.apply(this, arguments);
    try { tambahTab(); } catch (e) { try { console.error('[angket-keunggulan] gagal memasang tab:', e); } catch (e2) {} }
  };

  window.setupAngketKeunggulanPage = setupPage;
  window.AngketKeunggulan = { renderForm: renderForm, kirim: kirim, cekAktif: bacaStatus, butir: BUTIR, terbuka: TERBUKA, bidang: BIDANG, periodeSekarang: periodeSekarang };
})();
