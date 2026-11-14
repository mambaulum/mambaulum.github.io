/* ============================================================
   SI MAMBA - js/bacaan-shalat.js (v3 + ringkasan dashboard Portal Orang Tua + Mode Anak kartu lipat + 7 Kebiasaan utuh 7 butir (2 turunan otomatis) + kartu lipat Portal Orang Tua + 7 Kebiasaan terpisah + Pengingat WA + PJ per kelas oleh Admin, tab Pengingat, target per kelas & otomatis, progres penilaian per kelas + penanda yang perlu diingatkan, tombol Ingatkan lagi, notifikasi aplikasi ke PJ, kartu progres pekan ini di tab Penilaian)
   Menu "Bacaan Sholat" -- hafalan bacaan sholat + amalan harian di rumah + gamifikasi.

   TIGA AKSES:
   1) GURU / ADMIN (menu sidebar "Bacaan Sholat", halaman #page-bacaan-shalat -> #bsRoot)
      - Tab Target    : buat daftar target bacaan (harian / mingguan), per kelas atau semua kelas.
      - Tab Penilaian : uji setoran syafahi -> status Lulus / Remedial / Belum Setor (+ nilai & catatan).
      - Tab Grafik    : perkembangan klasikal (per target, per pekan, per siswa) dan individu
                        (grafik hafalan, poin & lencana, ringkasan amalan di rumah).
   2) ORANG TUA (Portal Orang Tua, disambung lewat bsOrtuRender() dari app.js)
      - Checklist amalan harian anak di rumah (sholat 5 waktu, mengaji, dst).
      - Laporan progres setoran bacaan sholat yang dinilai guru.
   3) SISWA ("Mode Anak" di dalam Portal Orang Tua -- anak belum punya akun sendiri)
      - Target bacaan berikutnya, poin, level, dan lencana digital (mis. "Bintang Sholat Subuh").
        Hanya-baca: poin & lencana dihitung dari data guru + checklist orang tua.

   DATA FIREBASE (aturan ada di rule.txt):
   - bs_target/{id}                  : target bacaan (nama, jenis, tanggal, kelas | '*', urutan, teks?, aktif)
   - bs_setoran/{targetId}_{siswaKey}: SATU catatan terbaru per siswa per target (status, nilai, catatan, percobaan)
   - bs_amalan_rumah/{siswaKey}_{tgl}: checklist harian dari orang tua (items: {subuh:true, ...}; berhalangan: true/false = hari itu
                                       berhalangan sholat (mis. haid): sholat 5 waktu tidak dihitung, tidak memutus rentetan;
                                       sakit: true/false = hari sakit: seluruh hari tidak dihitung di persen & tidak memutus rentetan; tanpa alasan tersimpan)
   SEMANTIK "percobaan" (bs_setoran.percobaan): mulai 1. Naik +1 HANYA bila catatan sebelumnya Remedial lalu siswa
   diuji ulang (status baru Lulus/Remedial). Tidak naik untuk: simpan ulang status sama (hanya nilai/catatan berubah),
   "Belum Setor" -> apa pun, dan koreksi salah klik (Lulus -> Remedial). Percobaan=1 + Lulus = bonus "lulus pertama".
   Poin & lencana TIDAK disimpan: selalu dihitung ulang dari tiga data di atas (tidak bisa "dikarang").

   Dimuat SESUDAH app.js (memakai helper app.js saat dijalankan, bukan saat dimuat).
============================================================ */

const BS_STATUS = ['Lulus', 'Remedial', 'Belum Setor'];
const BS_STATUS_WARNA = { 'Lulus': '#059669', 'Remedial': '#d97706', 'Belum Setor': '#6b7280' };
const BS_STATUS_BG = { 'Lulus': '#d1fae5', 'Remedial': '#fef3c7', 'Belum Setor': '#f3f4f6' };
const BS_STATUS_IKON = { 'Lulus': '✅', 'Remedial': '🔁', 'Belum Setor': '⏳' };

// Checklist amalan harian di rumah. `wajib` = sholat 5 waktu (dasar lencana "Bintang Sholat ...").
const BS_AMALAN = [
  { k: 'subuh',    nama: 'Subuh',    t: 'Sholat Subuh',    e: '🌅', poin: 10, wajib: true },
  { k: 'dzuhur',   nama: 'Dzuhur',   t: 'Sholat Dzuhur',   e: '🌞', poin: 10, wajib: true },
  { k: 'ashar',    nama: 'Ashar',    t: 'Sholat Ashar',    e: '🌤️', poin: 10, wajib: true },
  { k: 'maghrib',  nama: 'Maghrib',  t: 'Sholat Maghrib',  e: '🌇', poin: 10, wajib: true },
  { k: 'isya',     nama: 'Isya',     t: 'Sholat Isya',     e: '🌙', poin: 10, wajib: true },
  { k: 'mengaji',  nama: 'Mengaji',  t: 'Mengaji / Membaca Al-Qur\'an', e: '📖', poin: 10 },
  { k: 'dhuha',    nama: 'Dhuha',    t: 'Sholat Dhuha',    e: '☀️', poin: 5 },
  { k: 'berbakti', nama: 'Berbakti', t: 'Membantu Orang Tua', e: '🤝', poin: 5 }
];
// Kelompok TERPISAH "7 Kebiasaan" (5 butir dicatat; Beribadah & Bermasyarakat turunan otomatis dari BS_AMALAN, lihat BS_KEB7).
// Tidak ikut poin, lencana, maupun hitungan "n dari 8": hanya dicatat dan direkap sendiri.
const BS_KEBIASAAN = [
  { k: 'bangun',   nama: 'Bangun Pagi',   t: 'Bangun Pagi',   e: '⏰' },
  { k: 'olahraga', nama: 'Berolahraga',   t: 'Berolahraga',   e: '🏃' },
  { k: 'makan',    nama: 'Makan Sehat',   t: 'Makan Sehat',   e: '🥗' },
  { k: 'belajar',  nama: 'Gemar Belajar', t: 'Gemar Belajar', e: '📚' },
  { k: 'tidur',    nama: 'Tidur Cepat',   t: 'Tidur Cepat',   e: '🛌' }
];
const BS_SEMUA_ITEM = BS_AMALAN.concat(BS_KEBIASAAN);   // semua kunci yang boleh tersimpan di bs_amalan_rumah/.../items
// Tampilan UTUH 7 Kebiasaan (urutan baku): 5 butir di atas dicatat orang tua; "Beribadah" dan "Bermasyarakat" TURUNAN
// (dihitung otomatis dari Amalan Harian, tidak disimpan ke Firebase, tidak menambah poin/lencana).
const BS_KEB_BY = k => BS_KEBIASAAN.find(a => a.k === k);
const BS_KEB7 = [
  BS_KEB_BY('bangun'),
  { k: '_ibadah', nama: 'Beribadah', t: 'Beribadah', e: '🕌', oto: 'Otomatis: sholat 5 waktu lengkap', fn: it => BS_AMALAN.filter(a => a.wajib).every(a => it[a.k] === true) },
  BS_KEB_BY('olahraga'), BS_KEB_BY('makan'), BS_KEB_BY('belajar'),
  { k: '_masyarakat', nama: 'Bermasyarakat', t: 'Bermasyarakat', e: '🤝', oto: 'Otomatis: Membantu Orang Tua dicentang', fn: it => it.berbakti === true },
  BS_KEB_BY('tidur')
];
const bsKebNilai = (a, it) => { it = it || {}; return a.fn ? a.fn(it) : it[a.k] === true; };
const bsKebJumlah = it => BS_KEB7.filter(a => bsKebNilai(a, it)).length;
// Hari "berhalangan": 5 sholat wajib (dan turunannya, Beribadah) dikeluarkan dari pembagi supaya persen tidak turun.
function bsHitungHari(it, uzur) {
  it = it || {};
  const lama = BS_AMALAN.filter(a => !(uzur && a.wajib)), keb = BS_KEB7.filter(a => !(uzur && a.k === '_ibadah'));
  return { lamaC: lama.filter(a => it[a.k] === true).length, lamaN: lama.length, kebC: keb.filter(a => bsKebNilai(a, it)).length, kebN: keb.length };
}
const BS_LEVEL = [
  { min: 0,    nama: 'Pemula',          e: '🌱' },
  { min: 400,   nama: 'Rajin',           e: '🌟' },
  { min: 1200,  nama: 'Teladan',         e: '🏅' },
  { min: 3000,  nama: 'Bintang',         e: '🌠' },
  { min: 6000,  nama: 'Juara',           e: '🏆' },
  { min: 10000, nama: 'Pahlawan Sholat', e: '👑' }
];
// Alasan Remedial (sekali ketuk). Disimpan di bs_setoran.alasan sebagai teks dipisah '; ' dan tampil ke orang tua.
const BS_ALASAN_REMEDIAL = ['Hafalan belum lancar', 'Makhraj atau tajwid', 'Urutan bacaan', 'Suara kurang jelas'];
const BS_HARI_NILAI_MUNDUR = 14;   // tanggal penilaian paling jauh 14 hari ke belakang
const BS_POIN_LULUS = 50, BS_POIN_LULUS_PERTAMA = 10, BS_STREAK_BINTANG = 7;
const BS_HARI_ISI_MUNDUR = 2;   // orang tua boleh mengisi hari ini + 2 hari ke belakang
const BS_CONTOH_TARGET = ['Niat Sholat', 'Takbiratul Ihram', 'Doa Iftitah', 'Surat Al-Fatihah', 'Surat Al-Ikhlas',
  'Bacaan Ruku', 'Bacaan I\'tidal', 'Bacaan Sujud', 'Doa Duduk di Antara Dua Sujud', 'Tasyahud Awal',
  'Tasyahud Akhir', 'Salam', 'Doa Setelah Sholat'];

// ---------- utilitas umum ----------
function bsEsc(s) {
  s = s == null ? '' : String(s);
  if (typeof escapeHtml === 'function') return escapeHtml(s);
  return s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function bsEscJs(s) {
  s = s == null ? '' : String(s);
  if (typeof escapeJs === 'function') return escapeJs(s);
  return s.replace(/[\\'"<>&\r\n]/g, c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0'));
}
function bsCmp(a, b) {
  a = a == null ? '' : String(a); b = b == null ? '' : String(b);
  return (typeof COLLATOR_ID !== 'undefined') ? COLLATOR_ID.compare(a, b) : a.localeCompare(b);
}
function bsTA() { return typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : ''; }
function bsHariIni() { return tglLokal(); }
function bsTglParse(tgl) { const p = String(tgl || '').split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); }
// Format tanggal dari komponen LOKAL Date (bebas zona waktu). Jangan pakai tglLokal(d) untuk Date hasil bsTglParse:
// tglLokal membaca tanggal menurut WIB, sehingga di perangkat WITA/WIT hasilnya mundur satu hari.
function bsFmtLokal(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function bsTambahHari(tgl, n) { const d = bsTglParse(tgl); d.setDate(d.getDate() + n); return bsFmtLokal(d); }
function bsSelisihHari(a, b) {   // b - a, dalam hari (selalu bulat, bebas efek jam musim panas)
  const x = bsTglParse(a), y = bsTglParse(b);
  return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000);
}
const BS_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
function bsFmtTgl(tgl, tanpaTahun) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl || '')) return tgl || '-';
  const d = bsTglParse(tgl);
  return d.getDate() + ' ' + BS_BULAN[d.getMonth()] + (tanpaTahun ? '' : ' ' + d.getFullYear());
}
function bsMingguKey(tgl) { return typeof isoMingguKey === 'function' ? isoMingguKey(bsTglParse(tgl)) : String(tgl || '').slice(0, 7); }
function bsMingguLabel(tgl) {   // "6 – 12 Okt 2026" untuk pekan yang memuat tanggal itu
  try { if (typeof mingguLabel === 'function') return mingguLabel(bsMingguKey(tgl)); } catch (e) { /* fallback */ }
  return bsFmtTgl(tgl);
}
function bsMingguSingkat(key) {
  try { const s = mingguKeTanggal(key).senin; return s.getDate() + ' ' + BS_BULAN[s.getMonth()]; } catch (e) { return key; }
}
// Kunci ringan agar tombol aksi tidak terproses dua kali (klik ganda) selagi permintaan masih berjalan.
const bsKunci = {};
function bsKunciMulai(k) { if (bsKunci[k]) return false; bsKunci[k] = true; return true; }
function bsKunciSelesai(k) { delete bsKunci[k]; }
function bsOnline() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
function bsAlasanParse(str) { const s = String(str || '').split('; '); return BS_ALASAN_REMEDIAL.filter(a => s.includes(a)); }
function bsAlasanGabung(arr) { return BS_ALASAN_REMEDIAL.filter(a => (arr || []).includes(a)).join('; '); }
// Hari pertama target: tanggal itu sendiri (harian) atau Senin pekan itu (mingguan).
function bsAwalTarget(t) {
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t.tanggal || '')) return '';
  if (t.jenis !== 'mingguan') return t.tanggal;
  return bsTambahHari(t.tanggal, -((bsTglParse(t.tanggal).getDay() + 6) % 7));
}
function bsEl(id) { return document.getElementById(id); }
function bsLabelTarget(t) {
  if (!t) return '-';
  return t.jenis === 'mingguan' ? 'Pekan ' + bsMingguLabel(t.tanggal) : 'Tanggal ' + bsFmtTgl(t.tanggal);
}

// ---------- peran & izin ----------
function bsIsAdmin() { return typeof v4IsAdmin === 'function' && !!v4IsAdmin(); }
function bsIsHead() { return typeof v4IsHead === 'function' && !!v4IsHead(); }
function bsIsTeacher() { return typeof v4IsTeacher === 'function' && !!v4IsTeacher(); }
// Peta PJ per kelas (node bs_pj_kelas: {kelas: {key, name}}). Disimpan di variabel global TERPISAH dari bsState
// supaya tidak hilang saat bacaanShalatResetState(). Harus dimuat SEBELUM menu dicek: lihat bsMuatPjAwal().
let bsPjMap = null;       // null = belum dimuat
let bsPjMuatJanji = null;
function bsMuatPjAwal(paksa) {
  if (typeof db === 'undefined') return Promise.resolve({});
  if (!paksa && bsPjMuatJanji) return bsPjMuatJanji;
  bsPjMuatJanji = db.ref('bs_pj_kelas').once('value')
    .then(s => { bsPjMap = s.val() || {}; bsState.pjKelas = bsPjMap; return bsPjMap; })
    .catch(() => { bsPjMuatJanji = null; if (!bsPjMap) bsPjMap = {}; return bsPjMap; });   // Rules belum mengizinkan baca: anggap tidak ada PJ
  return bsPjMuatJanji;
}
function bsPjSimpanLokal(kelas, rec) {   // dipakai saat Admin menetapkan/menghapus PJ
  bsPjMap = bsPjMap || {};
  if (rec) bsPjMap[kelas] = rec; else delete bsPjMap[kelas];
  bsState.pjKelas = bsPjMap;
}
// Kelas yang PJ-nya adalah guru yang sedang login (cocok lewat key atau nama).
// Akses lewat PJ baru berlaku mulai pekan pertama November 2026 (Senin, 2 Nov 2026). Sebelum tanggal itu, guru yang
// hanya PJ (bukan wali kelas) belum punya akses; wali kelas, Kepala, dan Admin tidak terpengaruh.
const BS_PJ_AKSES_MULAI = '2026-11-02';
function bsKelasPjSaya() {
  if (!bsPjMap) return [];
  if (bsHariIni() < BS_PJ_AKSES_MULAI) return [];
  const key = bsGuruKey(), nama = bsGuruNama();
  return Object.keys(bsPjMap).filter(k => { const p = bsPjMap[k]; return p && ((p.key && p.key === key) || (p.name && nama && p.name === nama)); });
}
// Admin & Kepala: semua kelas. Guru: kelas yang dia wali-i (waliKelasOf) DITAMBAH kelas yang ia pegang sebagai PJ
// (bs_pj_kelas). Kelas yang sekadar diajar (currentUser.kelas / flag semuaKelas) TIDAK ikut.
function bsKelasScope() {
  if (bsIsAdmin() || bsIsHead()) return typeof KELAS_LIST !== 'undefined' ? [...KELAS_LIST] : [];
  const hasil = new Set();
  const w = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.waliKelasOf : null;
  if (w) hasil.add(w);
  bsKelasPjSaya().forEach(k => hasil.add(k));
  return [...hasil];
}
// Dipanggil app.js untuk menyembunyikan/menampilkan menu sidebar. Data PJ harus sudah dimuat (bsMuatPjAwal),
// kalau belum, guru yang hanya PJ (bukan wali kelas) belum terhitung.
function bsCanOpenMenu() { return bsIsAdmin() || bsIsHead() || (bsIsTeacher() && bsKelasScope().length > 0); }
// Menilai setoran: Admin (semua kelas) + wali kelas untuk kelasnya sendiri. Kepala Madrasah: lihat saja.
function bsCanNilai(kelas) { return bsIsAdmin() || (bsIsTeacher() && bsKelasScope().includes(kelas)); }
// Membuat/mengubah target: Admin (termasuk '*' = semua kelas); guru/wali hanya untuk kelasnya sendiri.
function bsCanTarget(kelas) {
  if (bsIsAdmin()) return true;
  if (kelas === '*') return false;
  return bsIsTeacher() && bsKelasScope().includes(kelas);
}
function bsPunyaAksesTarget() { return bsIsAdmin() || (bsIsTeacher() && bsKelasScope().length > 0); }
function bsKelasPilihan() {
  const semua = typeof KELAS_LIST !== 'undefined' ? [...KELAS_LIST] : [];
  if (bsIsAdmin() || bsIsHead()) return semua;
  const scope = bsKelasScope();
  return semua.filter(k => scope.includes(k));
}
function bsGuruKey() { return (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : ''; }
function bsGuruNama() { return (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : ''; }
// Rules bs_target / bs_setoran mewajibkan bukti sesi tulis (Admin: sesi_admin, guru: sesi_guru) terisi SEBELUM menulis.
// Sama seperti simpan Nilai di app.js. Tidak pernah menolak: bila gagal / lewat 8 dtk, penulisan tetap dicoba dan server yang memutuskan.
function bsSesiSiap() {
  try {
    const f = bsIsAdmin() ? (typeof adminSesiSiap === 'function' ? adminSesiSiap : null) : (typeof guruSesiSiap === 'function' ? guruSesiSiap : null);
    return f ? Promise.resolve(f()).catch(() => true) : Promise.resolve(true);
  } catch (e) { return Promise.resolve(true); }
}

// ============================================================
// GAMIFIKASI -- dihitung ulang dari data (tidak disimpan)
// ============================================================
function bsLevelDari(poin) {
  let idx = 0;
  BS_LEVEL.forEach((l, i) => { if (poin >= l.min) idx = i; });
  const cur = BS_LEVEL[idx], nxt = BS_LEVEL[idx + 1] || null;
  return {
    no: idx + 1, nama: cur.nama, e: cur.e, min: cur.min, berikut: nxt ? nxt.min : null,
    persen: nxt ? Math.round((poin - cur.min) / (nxt.min - cur.min) * 100) : 100
  };
}
// targets: target yang berlaku untuk siswa; setoranByTarget: {targetId: rec}; amalanList: [{tanggal, items}]
// semuaTarget (opsional): termasuk target nonaktif, supaya poin & lencana tidak turun saat target dinonaktifkan.
function bsHitungGame(targets, setoranByTarget, amalanList, hariIni, semuaTarget) {
  hariIni = hariIni || bsHariIni();
  const harian = {}, uzurH = {}, sakitH = {};   // uzurH: berhalangan sholat; sakitH: hari sakit (keduanya tidak memutus rentetan & tidak menambah hitungan)
  (amalanList || []).forEach(r => { if (r && r.tanggal) { harian[r.tanggal] = r.items || {}; uzurH[r.tanggal] = r.berhalangan === true; sakitH[r.tanggal] = r.sakit === true; } });
  const tanggals = Object.keys(harian).sort();
  let poin = 0;
  tanggals.forEach(tg => BS_AMALAN.forEach(a => { if (harian[tg][a.k] === true) poin += a.poin; }));
  let lulus = 0, lulusSemua = 0, lulusPertama = 0;
  const aktifKey = {}; (targets || []).forEach(t => { aktifKey[t.key] = true; });
  (semuaTarget || targets || []).forEach(t => {
    const s = (setoranByTarget || {})[t.key];
    if (s && s.status === 'Lulus') {
      lulusSemua++; if (aktifKey[t.key]) lulus++;
      poin += BS_POIN_LULUS;
      if ((s.percobaan || 1) === 1) { lulusPertama++; poin += BS_POIN_LULUS_PERTAMA; }
    }
  });
  // Rentetan hari berturut-turut terpanjang yang memenuhi syarat (hari tanpa isian = putus)
  const rentetan = (pred, jembatan) => {
    let best = 0, cur = 0, prev = null;
    tanggals.forEach(tg => {
      if (sakitH[tg] || (jembatan && uzurH[tg])) { prev = tg; return; }
      if (!pred(harian[tg])) { cur = 0; prev = null; return; }
      cur = (prev && bsSelisihHari(prev, tg) === 1) ? cur + 1 : 1;
      prev = tg; if (cur > best) best = cur;
    });
    return best;
  };
  const semuaWajib = it => BS_AMALAN.filter(a => a.wajib).every(a => it[a.k] === true);
  // Rentetan yang masih berjalan sampai hari ini (atau kemarin, kalau hari ini belum diisi)
  let berjalan = 0;
  { const baik = t => harian[t] && (uzurH[t] || sakitH[t] || semuaWajib(harian[t]));
    let tg = baik(hariIni) ? hariIni : bsTambahHari(hariIni, -1);
    while (baik(tg)) { if (!uzurH[tg] && !sakitH[tg]) berjalan++; tg = bsTambahHari(tg, -1); } }
  const badges = [];
  const tambah = (id, e, n, d, now, need) => badges.push({ id, e, n, d, now, need, got: now >= need });
  BS_AMALAN.filter(a => a.wajib).forEach(a =>
    tambah('shalat_' + a.k, '⭐', 'Bintang Sholat ' + a.nama, 'Sholat ' + a.nama + ' ' + BS_STREAK_BINTANG + ' hari berturut-turut', rentetan(it => it[a.k] === true, true), BS_STREAK_BINTANG));
  tambah('lima_waktu', '🌈', 'Pejuang Lima Waktu', 'Sholat 5 waktu lengkap 5 hari berturut-turut', rentetan(semuaWajib, true), 5);
  tambah('mengaji', '📖', 'Sahabat Al-Qur\'an', 'Mengaji ' + BS_STREAK_BINTANG + ' hari berturut-turut', rentetan(it => it.mengaji === true), BS_STREAK_BINTANG);
  tambah('rajin', '📅', 'Anak Rajin', 'Checklist amalan terisi 30 hari', tanggals.filter(tg => BS_AMALAN.some(a => harian[tg][a.k] === true)).length, 30);
  tambah('lulus_1', '🎯', 'Langkah Pertama', 'Lulus 1 target bacaan', lulusSemua, 1);
  tambah('lulus_5', '🕌', 'Hafidz Cilik', 'Lulus 5 target bacaan', lulusSemua, 5);
  tambah('sekali_jalan', '⚡', 'Sekali Jalan', 'Lulus 3 target di percobaan pertama', lulusPertama, 3);
  const nTarget = (targets || []).length;
  if (nTarget >= 3) tambah('juara', '🏆', 'Juara Bacaan Sholat', 'Lulus semua target bacaan', lulus, nTarget);
  return { poin, level: bsLevelDari(poin), lulus, nTarget, lulusPertama, badges, rentetanLimaWaktu: berjalan, hariTercatat: tanggals.length };
}
function bsHtmlLencana(badges, ringkas) {
  const dapat = badges.filter(b => b.got), belum = badges.filter(b => !b.got);
  const kartu = (b, aktif) => `<div title="${bsEsc(b.d)}" style="text-align:center;padding:10px 6px;border-radius:12px;${aktif ? 'background:linear-gradient(135deg,#fef9c3,#fde68a);border:1px solid #f59e0b;' : 'background:#f3f4f6;border:1px dashed #d1d5db;opacity:.75;'}">
      <div style="font-size:28px;${aktif ? '' : 'filter:grayscale(1);'}">${b.e}</div>
      <div style="font-size:12px;font-weight:700;margin-top:2px;">${bsEsc(b.n)}</div>
      <div class="text-muted" style="font-size:10px;margin-top:2px;">${aktif ? 'Sudah diraih 🎉' : Math.min(b.now, b.need) + '/' + b.need}</div>
    </div>`;
  const grid = arr => `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;">${arr.join('')}</div>`;
  if (ringkas) return dapat.length ? grid(dapat.map(b => kartu(b, true))) : '<p class="text-muted" style="font-size:13px;">Belum ada lencana yang diraih.</p>';
  return (dapat.length ? `<p style="font-weight:700;font-size:13px;margin:6px 0;">🏅 Lencana diraih (${dapat.length})</p>${grid(dapat.map(b => kartu(b, true)))}` : '')
    + (belum.length ? `<p style="font-weight:700;font-size:13px;margin:12px 0 6px;">🔒 Menuju lencana berikutnya</p>${grid(belum.map(b => kartu(b, false)))}` : '');
}

// ============================================================
// GRAFIK (SVG/CSS murni -- tanpa library, aman dipakai offline)
// ============================================================
// titik: [{label, nilai}]  opsi: {maks, satuan}
function bsSvgGaris(titik, opsi) {
  opsi = opsi || {};
  if (!titik || titik.length < 2) return '<p class="text-muted" style="font-size:13px;">Belum cukup data untuk grafik (minimal 2 titik waktu).</p>';
  const W = 340, H = 160, L = 34, R = 12, T = 12, B = 30;
  const maks = Math.max(opsi.maks || 0, ...titik.map(p => p.nilai), 1);
  const x = i => L + (W - L - R) * (titik.length === 1 ? 0 : i / (titik.length - 1));
  const y = v => T + (H - T - B) * (1 - v / maks);
  const sat = opsi.satuan || '';
  const garis = [0, 0.5, 1].map(f => { const v = Math.round(maks * f * 10) / 10; return `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" stroke="#e5e7eb" stroke-width="1"/><text x="${L - 4}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#6b7280">${v}${sat}</text>`; }).join('');
  const pts = titik.map((p, i) => `${x(i).toFixed(1)},${y(p.nilai).toFixed(1)}`).join(' ');
  const area = `${x(0).toFixed(1)},${y(0)} ${pts} ${x(titik.length - 1).toFixed(1)},${y(0)}`;
  const langkah = Math.max(1, Math.ceil(titik.length / 5));
  const labels = titik.map((p, i) => (i % langkah === 0 || i === titik.length - 1)
    ? `<text x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="9" fill="#6b7280">${bsEsc(p.label)}</text>` : '').join('');
  const dots = titik.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.nilai).toFixed(1)}" r="3" fill="#059669"><title>${bsEsc(p.label)}: ${p.nilai}${sat}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:560px;height:auto;" role="img" aria-label="${bsEsc(opsi.judul || 'Grafik perkembangan')}">${garis}<polygon points="${area}" fill="#059669" fill-opacity=".12"/><polyline points="${pts}" fill="none" stroke="#059669" stroke-width="2.5" stroke-linejoin="round"/>${dots}${labels}</svg>`;
}
function bsBarTumpuk(lulus, remedial, belum) {
  const total = Math.max(1, lulus + remedial + belum);
  const seg = (n, w) => n ? `<div style="width:${(n / total * 100).toFixed(1)}%;background:${w};" title="${n}"></div>` : '';
  return `<div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:#e5e7eb;">${seg(lulus, BS_STATUS_WARNA.Lulus)}${seg(remedial, BS_STATUS_WARNA.Remedial)}${seg(belum, '#d1d5db')}</div>`;
}
function bsBarProgres(persen, warna) {
  persen = Math.max(0, Math.min(100, persen || 0));
  return `<div style="height:10px;border-radius:5px;background:#e5e7eb;overflow:hidden;"><div style="height:100%;width:${persen}%;background:${warna || '#059669'};"></div></div>`;
}
function bsChip(status) {
  return `<span style="display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:${BS_STATUS_BG[status] || '#f3f4f6'};color:${BS_STATUS_WARNA[status] || '#6b7280'};">${BS_STATUS_IKON[status] || ''} ${bsEsc(status)}</span>`;
}

// ============================================================
// 1) AKSES GURU / ADMIN
// ============================================================
function bsStateBaru() {
  return {
    tab: 'target', kelas: '', targets: null, targetsTA: '', editId: '',
    setoran: {}, setoranTA: {}, targetSel: '', tglNilai: '', draft: {},
    grafik: 'klasikal', siswaSel: '', amalanSiswa: {}, memuat: false, err: '', pjKelas: bsPjMap || {}, rekapMode: 'kelas'
  };
}
let bsState = bsStateBaru();
function bsNamaKelas(k) { const s = String(k == null ? '' : k); return /^kelas\b/i.test(s) ? s : 'Kelas ' + s; }
function bacaanShalatResetState() {
  bsState = bsStateBaru();
  const r = bsEl('bsRoot'); if (r) r.innerHTML = '';
  try { bsAnakTutup(); } catch (e) { /* belum ada overlay */ }
}

function bsMuatTargets(paksa) {
  const ta = bsTA();
  if (!paksa && bsState.targets && bsState.targetsTA === ta) return Promise.resolve(bsState.targets);
  // PJ per kelas (node bs_pj_kelas). Bila Rules node ini belum dipasang, kegagalan baca diabaikan (PJ otomatis dipakai).
  const pPj = bsMuatPjAwal(!!paksa);
  const pTarget = db.ref('bs_target').orderByChild('tahunAjaran').equalTo(ta).once('value').then(snap => {
    const arr = []; snap.forEach(c => { const v = c.val() || {}; v.key = c.key; arr.push(v); });
    bsState.targets = arr; bsState.targetsTA = ta; return arr;
  });
  return Promise.all([pTarget, pPj]).then(r => r[0]);
}
function bsBandingTarget(a, b) { return (a.urutan || 0) - (b.urutan || 0) || bsCmp(a.nama, b.nama); }
function bsTargetUntukKelas(targets, kelas, termasukNonaktif) {
  return (targets || []).filter(t => (t.kelas === '*' || t.kelas === kelas) && (termasukNonaktif || t.aktif !== false)).sort(bsBandingTarget);
}
function bsMuatSetoran(kelas, paksa) {
  const ta = bsTA();
  if (!paksa && bsState.setoran[kelas] && bsState.setoranTA[kelas] === ta) return Promise.resolve(bsState.setoran[kelas]);
  return db.ref('bs_setoran').orderByChild('kelas').equalTo(kelas).once('value').then(snap => {
    const m = {}; snap.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === ta) { v.key = c.key; m[c.key] = v; } });
    bsState.setoran[kelas] = m; bsState.setoranTA[kelas] = ta; return m;
  });
}
// Amalan rumah dimuat per tahun ajaran lewat rentang KUNCI ('{siswaKey}_{tanggal}'), jadi riwayat tahun lalu tidak ikut terunduh
// dan tanpa migrasi data. Rentang sengaja longgar (Jun tahun awal - Jul tahun akhir); penyaring tahunAjaran di perangkat tetap berlaku.
function bsQueryAmalan(sk, ta) {
  const ref = db.ref('bs_amalan_rumah'), m = /^(\d{4})\/(\d{4})$/.exec(String(ta || ''));
  if (!m) return ref.orderByChild('siswaKey').equalTo(sk).once('value');   // format tahun ajaran tak dikenal: cara lama
  return ref.orderByKey().startAt(sk + '_' + m[1] + '-06-01').endAt(sk + '_' + m[2] + '-07-31').once('value');
}
function bsMuatAmalanSiswa(sk, paksa) {
  const ta = bsTA();
  if (!paksa && bsState.amalanSiswa[sk]) return Promise.resolve(bsState.amalanSiswa[sk]);
  return bsQueryAmalan(sk, ta).then(snap => {
    const arr = []; snap.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === ta && v.siswaKey === sk) arr.push(v); });
    bsState.amalanSiswa[sk] = arr; return arr;
  });
}
function bsSiswaKelas(k) {
  const arr = (typeof v4PanelSiswaCache !== 'undefined' && v4PanelSiswaCache[k]) ? v4PanelSiswaCache[k] : null;
  return arr ? arr.slice().sort((a, b) => bsCmp(a.name, b.name)) : null;
}

function setupBacaanShalatPage() {
  const root = bsEl('bsRoot'); if (!root) return;
  // PJ dimuat dulu: tanpa itu guru yang hanya PJ (bukan wali kelas) akan ditolak di cek menu.
  root.innerHTML = '<p class="text-muted" style="padding:14px;">⏳ Memuat data...</p>';
  bsMuatPjAwal(true).then(() => {
    if (!bsCanOpenMenu()) { root.innerHTML = '<p class="text-muted">Menu ini hanya untuk Wali Kelas / Penanggung Jawab (kelasnya sendiri), Kepala Madrasah, dan Admin.</p>'; return; }
    const pil = bsKelasPilihan();
    if (!bsState.kelas || !pil.includes(bsState.kelas)) bsState.kelas = pil[0] || '';
    if (!bsState.tglNilai) bsState.tglNilai = bsHariIni();
    bsState.memuat = true; bsState.err = ''; bsRender();
    return bsMuatTargets(false)
      .catch(e => { bsState.err = 'Gagal memuat target: ' + ((e && e.message) || e); })
      .then(() => { bsState.memuat = false; bsRender(); bsPastikanDataKelas(); });
  });
}
function bsPastikanDataKelas() {
  const k = bsState.kelas;
  if (bsState.tab === 'rekap' && bsState.rekapMode === 'semua') { bsPastikanDataSemua(); return; }
  if (bsState.tab === 'ingatkan') { bsPastikanDataIngatkan(); return; }
  if (!k || bsState.tab === 'target') return;
  const perluSiswa = typeof v4PanelSiswaCache !== 'undefined' && !v4PanelSiswaCache[k] && typeof v4FetchSiswaByKelas === 'function';
  // Pembungkus Promise + batas waktu 15 dtk (jaga-jaga callback tidak terpanggil), supaya cukup SATU render.
  const pSiswa = perluSiswa ? new Promise(res => { let sel = false; const fin = () => { if (!sel) { sel = true; res(); } }; try { v4FetchSiswaByKelas(k, fin); } catch (e) { fin(); } setTimeout(fin, 15000); }) : Promise.resolve();
  Promise.all([pSiswa, bsMuatSetoran(k, false)])
    .catch(e => { bsState.err = 'Gagal memuat penilaian: ' + ((e && e.message) || e); })
    .then(() => { if (bsState.kelas === k) bsRender(); });
}
function bsSegarkan() {
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  bsState.targets = null; bsState.setoran = {}; bsState.setoranTA = {}; bsState.amalanSiswa = {}; bsState.amalanGagal = {}; bsState.amalanKelasGagal = {}; bsState.siswaDiminta = {}; bsState.err = ''; bsPjMuatJanji = null;
  if (typeof v4PanelSiswaCache !== 'undefined' && bsState.kelas) { delete v4PanelSiswaCache[bsState.kelas]; }
  setupBacaanShalatPage();
}
function bsPilihTab(t) { bsState.tab = t; bsRender(); bsPastikanDataKelas(); }
function bsPilihKelas(k) { bsState.kelas = k; bsState.siswaSel = ''; bsState.targetSel = ''; bsRender(); bsPastikanDataKelas(); }

function bsRender() {
  const root = bsEl('bsRoot'); if (!root || !bsCanOpenMenu()) return;
  const pil = bsKelasPilihan();
  const tabs = [['target', '🎯 Target']].concat((bsIsAdmin() || bsIsHead()) ? [['ingatkan', '📲 Pengingat']] : []).concat([['nilai', '📝 Penilaian'], ['rekap', '📋 Rekap'], ['grafik', '📊 Grafik']]);
  const opsiKelas = pil.map(k => `<option value="${bsEsc(k)}" ${k === bsState.kelas ? 'selected' : ''}>${bsEsc(bsNamaKelas(k))}</option>`).join('');
  let body = '';
  if (bsState.memuat) body = '<p class="text-muted" style="padding:14px;">⏳ Memuat data...</p>';
  else if (bsState.tab === 'target') body = bsBodyTarget();
  else if (bsState.tab === 'ingatkan') body = bsBodyIngatkan();
  else if (bsState.tab === 'nilai') body = bsBodyNilai();
  else if (bsState.tab === 'rekap') body = bsBodyRekap();
  else body = bsBodyGrafik();
  root.innerHTML = `
    ${bsState.err ? `<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;">⚠️ ${bsEsc(bsState.err)} <button class="btn btn-soft" style="padding:3px 10px;font-size:12px;margin-left:6px;" onclick="bsSegarkan()">🔄 Coba lagi</button></div>` : ''}
    <div class="hub-tabs show kg-top" role="tablist">${tabs.map(([id, t]) => `<button type="button" role="tab" class="hub-tab${bsState.tab === id ? ' active' : ''}" aria-selected="${bsState.tab === id}" onclick="bsPilihTab('${id}')">${t}</button>`).join('')}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px;">
      <div style="min-width:150px;${((bsState.tab === 'rekap' && bsState.rekapMode === 'semua') || bsState.tab === 'ingatkan') ? 'display:none;' : ''}"><label class="label">Kelas</label>
        <select class="field" onchange="bsPilihKelas(this.value)">${opsiKelas || '<option value="">(tidak ada kelas)</option>'}</select></div>
      <button class="btn btn-soft" style="padding:8px 12px;" onclick="bsSegarkan()">🔄 Segarkan</button>
    </div>
    ${bsIsHead() ? '<p class="v4-muted" style="font-size:12px;margin-bottom:8px;">👑 Mode Kepala Madrasah: hanya melihat (target &amp; penilaian dikelola Admin/guru kelas).</p>' : ''}
    ${body}`;
}


// ============================================================
// PENGINGAT WHATSAPP (Admin / Kepala Madrasah) -- di tab Target
// ============================================================
// Tanpa API berbayar/server: tiap penerima = satu tombol yang membuka wa.me dengan nomor & pesan sudah terisi (kirimWA di app.js);
// pengirim tinggal menekan "Kirim" di WhatsApp. Penanda "sudah dibuka" disimpan di perangkat ini saja (localStorage) dan hanya
// berarti WhatsApp pernah dibuka untuk penerima itu -- aplikasi tidak bisa tahu pesan benar-benar terkirim.
// Penanggung jawab = PJ yang dipilih di formulir target; bila kosong: wali kelas dari kelas target (atau semua wali kelas untuk target "Semua kelas") + guru pembuat target.
// Tidak menambah field/data baru di Firebase (jadi tidak perlu ubah Rules).
const BS_WA_KUNCI = 'bsWaDibuka';
let bsWaMem = {};
function bsWaBacaTanda() { try { return JSON.parse(localStorage.getItem(BS_WA_KUNCI) || '{}') || {}; } catch (e) { return Object.assign({}, bsWaMem); } }
function bsWaTandai(id) {
  const m = bsWaBacaTanda(); m[id] = Date.now();
  const kunci = Object.keys(m); if (kunci.length > 800) kunci.sort((a, b) => m[a] - m[b]).slice(0, kunci.length - 800).forEach(k => delete m[k]);
  bsWaMem = m; try { localStorage.setItem(BS_WA_KUNCI, JSON.stringify(m)); } catch (e) { /* penanda hanya sementara */ }
}
function bsWaSudah(id) { return !!bsWaBacaTanda()[id]; }
function bsWaPesanPetugas() { return 'Assalamualaikum {nama}.\nPengingat dari {madrasah}: Bapak/Ibu penanggung jawab agenda Bacaan Sholat "{bacaan}" ({waktu}) untuk {kelas}.\nProgres penilaian saat ini: {progres}.\nSiswa yang belum dinilai: {belum}.\nMohon sisa setoran segera dinilai. Terima kasih. 🙏'; }
function bsWaPesanWali() { return 'Assalamualaikum Bapak/Ibu wali murid {siswa}.\nPengingat dari {madrasah}: agenda Bacaan Sholat "{bacaan}" ({waktu}) untuk {kelas}.\nProgres ananda: {progres}.\nBacaan yang belum lulus: {belum}.\nMohon ananda dibantu berlatih dan didampingi di rumah. Penanggung jawab: {pj}. Terima kasih. 🙏'; }
// Pengingat dikelompokkan PER PEKAN (mingguan) / per tanggal (harian), lalu menampilkan SEMUA kelas sekaligus.
function bsWaGrupKey(t) { return t.jenis === 'mingguan' ? 'M|' + bsAwalTarget(t) : 'H|' + t.tanggal; }
function bsWaDaftarPekan(aktif) {
  const m = new Map();
  (aktif || []).forEach(t => {
    const key = bsWaGrupKey(t);
    if (!m.has(key)) m.set(key, { key, awal: bsAwalTarget(t) || t.tanggal || '', label: bsLabelTarget(t), targets: [] });
    m.get(key).targets.push(t);
  });
  return [...m.values()].sort((a, b) => String(a.awal).localeCompare(String(b.awal)));
}
function bsWaState(targets) {
  if (!bsState.wa) bsState.wa = { pekan: '', kelasWali: '', hanyaPerlu: false, pesanPetugas: bsWaPesanPetugas(), pesanWali: bsWaPesanWali() };
  const w = bsState.wa, grup = bsWaDaftarPekan((targets || []).filter(t => t.aktif !== false));
  if (!grup.find(g => g.key === w.pekan)) {
    // Default: pekan terdekat dari hari ini (yang belum lewat lebih dari 7 hari); kalau tak ada, pekan terakhir.
    const h = bsHariIni(), g = grup.find(x => bsSelisihHari(x.awal, h) <= 7) || grup[grup.length - 1];
    w.pekan = g ? g.key : '';
  }
  return w;
}
function bsWaIsi(tpl, v) {
  return String(tpl || '').replace(/\{(nama|siswa|bacaan|waktu|kelas|pj|madrasah|progres|persen|sisa|belum)\}/g, (m, k) => (v[k] == null ? '' : v[k]));
}
function bsWaMadrasah() { return (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) ? MADRASAH.nama : 'Madrasah'; }
function bsWaKelasTarget(t, w) { return t ? (t.kelas === '*' ? (w.kelas || bsState.kelas || '') : t.kelas) : ''; }
// PJ pilihan manual disimpan di target sebagai teks kunci guru dipisah koma (target.pjKeys). Kosong = PJ otomatis.
function bsPjKeys(t) { return String((t && t.pjKeys) || '').split(',').map(x => x.trim()).filter(Boolean); }
function bsPjNama(t) {
  const gl = (typeof allGuru !== 'undefined' && Array.isArray(allGuru)) ? allGuru : [];
  const lama = bsPjKeys(t).map(k => { const g = gl.find(x => x && (x.key === k || x.name === k)); return g ? g.name : ''; }).filter(Boolean);
  if (lama.length) return lama;
  const pk = (bsState.pjKelas || {})[t && t.kelas];
  return pk && pk.name ? [pk.name] : [];
}
function bsWaPetugas(t, kelas) {
  const gl = (typeof allGuru !== 'undefined' && Array.isArray(allGuru)) ? allGuru : [];
  const hasil = [], ada = new Set();
  const tambah = (g, peran) => { if (!g || ada.has(g.key || g.name)) return; ada.add(g.key || g.name); hasil.push({ key: g.key || g.name, nama: g.name || '-', noWa: g.noWa || '', peran }); };
  const cariGuru = k => gl.find(g => g && (g.key === k || g.name === k));
  const pjLama = bsPjKeys(t);   // PJ per target (versi lama), kalau masih ada
  if (pjLama.length) { pjLama.forEach(k => tambah(cariGuru(k), 'PJ target')); if (hasil.length) return hasil; }
  const pjKls = (bsState.pjKelas || {})[t.kelas];   // PJ per kelas (ditentukan Admin di tab Target)
  if (pjKls && pjKls.key) { tambah(cariGuru(pjKls.key), 'PJ ' + bsNamaKelas(t.kelas)); if (hasil.length) return hasil; }
  gl.filter(g => g && g.waliKelasOf && (t.kelas === '*' || g.waliKelasOf === t.kelas)).sort((a, b) => bsCmp(a.name, b.name)).forEach(g => tambah(g, 'Wali Kelas ' + g.waliKelasOf));
  tambah(gl.find(g => g && t.dibuatOleh && g.name === t.dibuatOleh), 'Pembuat target');
  return hasil;
}
function bsWaWali(kelas) {
  const arr = bsSiswaKelas(kelas) || (typeof allSiswa !== 'undefined' ? allSiswa.filter(s => s.kelas === kelas) : null);
  if (!arr) return null;
  const perNomor = new Map(), tanpa = [];
  bsFilterAktif(arr).forEach(s => {
    const k = (typeof ortuWaKey === 'function') ? ortuWaKey(s.noWaOrtu) : null;
    if (!k) { tanpa.push(s.name); return; }
    if (!perNomor.has(k)) perNomor.set(k, { nomor: k, siswa: [], keys: [] });
    perNomor.get(k).siswa.push(s.name); perNomor.get(k).keys.push(s.key);
  });
  return { daftar: [...perNomor.values()].sort((a, b) => bsCmp(a.siswa[0], b.siswa[0])), tanpa: tanpa.sort(bsCmp) };
}
// ---------- Progres penilaian per kelas (tab Pengingat) ----------
// Progres = sel (siswa aktif x target pada pekan terpilih) yang SUDAH DINILAI (status Lulus atau Remedial).
// "Belum Setor" dan sel kosong dihitung belum dinilai (sama seperti tab Rekap). Dihitung dari data yang sudah dimuat; null bila belum siap.
function bsWaProgresKelas(k, ts) {
  const siswa = bsSiswaAktif(k), setoran = bsState.setoran[k];
  if (!siswa || !setoran || !ts.length) return null;
  let l = 0, r = 0;
  const perSiswa = {}, namaBelum = [];
  siswa.forEach(s => {
    const st = { l: 0, r: 0, b: 0, belumLulus: [] };
    ts.forEach(t => {
      const x = setoran[bsKunciSetoran(t.key, s.key)], sts = x ? x.status : '';
      if (sts === 'Lulus') st.l++;
      else { if (sts === 'Remedial') st.r++; else st.b++; st.belumLulus.push(t.nama); }
    });
    l += st.l; r += st.r; perSiswa[s.key] = st;
    if (st.b > 0) namaBelum.push(s.name || '-');
  });
  const total = siswa.length * ts.length, dinilai = l + r;
  return { k, siswa: siswa.length, targets: ts.length, total, lulus: l, remedial: r, dinilai, belum: total - dinilai, persen: total ? Math.round(dinilai / total * 100) : 0, perSiswa, namaBelum };
}
// Fase pekan terpilih: 'belum' (belum mulai), 'jalan' (sedang berjalan), 'lewat' (sudah berakhir).
function bsWaFase(g) {
  const h = bsHariIni(), awal = g.awal || '', akhir = (g.key || '').charAt(0) === 'M' ? bsTambahHari(awal, 6) : awal;
  return { awal, akhir, fase: h < awal ? 'belum' : (h > akhir ? 'lewat' : 'jalan') };
}
// Penanda siapa yang perlu diingatkan. perlu: true (perlu), false (tidak perlu), null (progres belum siap).
function bsWaStatus(siap, sisa, fase, labelSelesai) {
  if (!siap) return { perlu: null, label: '⏳ memuat progres...', warna: '#6b7280', bg: '#f3f4f6' };
  if (sisa <= 0) return { perlu: false, label: '✅ ' + labelSelesai, warna: '#047857', bg: '#ecfdf5' };
  if (fase.fase === 'belum') return { perlu: false, label: '⏳ Pekan belum mulai', warna: '#6b7280', bg: '#f3f4f6' };
  if (fase.fase === 'lewat') return { perlu: true, label: '🔴 Terlambat, perlu diingatkan', warna: '#b91c1c', bg: '#fef2f2' };
  return { perlu: true, label: '🔔 Perlu diingatkan', warna: '#b45309', bg: '#fffbeb' };
}
function bsWaLencana(st) {
  return `<span style="display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;background:${st.bg};color:${st.warna};">${bsEsc(st.label)}</span>`;
}
// Isian pesan untuk PJ: progres penilaian satu kelas.
function bsWaVarPetugas(P) {
  const n = P.namaBelum.length;
  return {
    progres: P.dinilai + ' dari ' + P.total + ' setoran sudah dinilai (' + P.persen + '%): ' + P.lulus + ' lulus, ' + P.remedial + ' remedial',
    sisa: P.belum, persen: P.persen,
    belum: n ? P.namaBelum.slice(0, 6).join(', ') + (n > 6 ? ', dst (' + n + ' siswa)' : '') : '-'
  };
}
// Isian pesan untuk wali murid: progres anak (atau anak-anak) pada nomor WA itu.
function bsWaVarWali(P, d) {
  const ada = new Set(), belum = [], bagian = [];
  let sisa = 0, lulus = 0, n = 0;
  const banyak = (d.keys || []).length > 1;
  (d.keys || []).forEach((sk, i) => {
    const st = P.perSiswa[sk]; if (!st) return;
    n++; lulus += st.l; sisa += st.r + st.b;
    st.belumLulus.forEach(b => { if (!ada.has(b)) { ada.add(b); belum.push(b); } });
    bagian.push((banyak ? (d.siswa[i] || '') + ': ' : '') + st.l + ' dari ' + P.targets + ' bacaan lulus' + (st.r ? ', ' + st.r + ' remedial' : '') + (st.b ? ', ' + st.b + ' belum setor' : ''));
  });
  const total = n * P.targets;
  return { siap: n > 0, progres: bagian.join('; '), sisa, belum: belum.length ? belum.join(', ') : '-', persen: total ? Math.round(lulus / total * 100) : 0 };
}
function bsWaPanelHtml(targets) {
  if (!(bsIsAdmin() || bsIsHead())) return '';
  const aktif = (targets || []).filter(t => t.aktif !== false);
  if (!aktif.length) return '';
  const w = bsWaState(targets), grup = bsWaDaftarPekan(aktif), g = grup.find(x => x.key === w.pekan) || grup[0];
  const fase = bsWaFase(g), hanya = !!w.hanyaPerlu;
  // Satu baris per kelas untuk pekan terpilih, lengkap dengan progres penilaian & status pengingat.
  const rows = bsKelasPilihan().map(k => {
    const ts = g.targets.filter(t => t.kelas === k || t.kelas === '*').sort(bsBandingTarget);
    const petugas = bsWaPetugas(ts.length ? Object.assign({}, ts[0], { kelas: k }) : { kelas: k }, k);
    const P = ts.length ? bsWaProgresKelas(k, ts) : null;
    const st = !ts.length ? null : (P && !P.total) ? { perlu: false, label: 'Belum ada siswa aktif', warna: '#6b7280', bg: '#f3f4f6' } : bsWaStatus(!!P, P ? P.belum : 0, fase, 'Penilaian selesai');
    return { k, ts, petugas, bacaan: ts.map(t => t.nama).join(', '), P, st, v: P ? bsWaVarPetugas(P) : null };
  });
  const adaTarget = rows.filter(r => r.ts.length);
  // Daftar penerima PJ yang bisa dikirimi (urut sesuai tampilan).
  const listP = [];
  adaTarget.forEach(r => r.petugas.forEach(p => listP.push({ nama: p.nama, noWa: p.noWa, peran: p.peran, kelas: r.k, bacaan: r.bacaan, pjTeks: r.petugas.map(x => x.nama).join(', ') || '-', id: 'P|' + g.key + '|' + r.k + '|' + p.key, key: p.key, nid: 'N|' + g.key + '|' + r.k + '|' + p.key, fase: fase.fase, perlu: r.st.perlu, v: r.v })));
  // Wali murid: satu kelas dipilih (hanya kelas yang punya target pekan itu).
  if (!adaTarget.find(r => r.k === w.kelasWali)) w.kelasWali = adaTarget.length ? ((adaTarget.find(r => r.k === bsState.kelas) || adaTarget[0]).k) : '';
  const rw = adaTarget.find(r => r.k === w.kelasWali) || null;
  const wali = rw ? bsWaWali(rw.k) : null;
  if (rw && !wali && typeof v4FetchSiswaByKelas === 'function') { bsState.siswaDiminta = bsState.siswaDiminta || {}; if (!bsState.siswaDiminta[rw.k]) { bsState.siswaDiminta[rw.k] = true; v4FetchSiswaByKelas(rw.k, () => { if (bsState.tab === 'ingatkan') bsRender(); }); } }
  const daftarWali = wali ? wali.daftar.map(d => {
    const vw = rw.P ? bsWaVarWali(rw.P, d) : null;
    const st = bsWaStatus(!!(vw && vw.siap), vw ? vw.sisa : 0, fase, 'Semua bacaan lulus');
    return Object.assign({ id: 'W|' + g.key + '|' + rw.k + '|' + d.nomor, perlu: st.perlu, st, v: vw }, d);
  }) : [];
  bsState.waList = { pekan: g.key, label: g.label, petugas: listP, wali: daftarWali, waliKelas: rw ? rw.k : '', waliBacaan: rw ? rw.bacaan : '', waliPj: rw ? (rw.petugas.map(x => x.nama).join(', ') || '-') : '-' };
  const sudah = id => bsWaSudah(id);
  const opsiPekan = grup.map(x => `<option value="${bsEsc(x.key)}" ${x.key === g.key ? 'selected' : ''}>${bsEsc(x.label)}</option>`).join('');
  // ----- ringkasan -----
  const nPjResmi = adaTarget.filter(r => r.petugas.length && /^PJ/.test(r.petugas[0].peran)).length;
  const nPerluPj = adaTarget.filter(r => r.st.perlu === true).length, nMemuat = adaTarget.filter(r => r.st.perlu === null).length;
  const sisaP = listP.filter(x => x.noWa && x.perlu === true && !sudah(x.id)).length;
  const nNotif = listP.filter(x => x.key && x.perlu === true && x.v && !sudah(x.nid)).length;
  const ringkas = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 2px;">
      <span style="background:#ecfdf5;color:#047857;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;">${adaTarget.length} dari ${rows.length} kelas punya target</span>
      <span style="background:${nPjResmi === adaTarget.length ? '#ecfdf5' : '#fffbeb'};color:${nPjResmi === adaTarget.length ? '#047857' : '#b45309'};border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;">${nPjResmi} kelas punya PJ resmi</span>
      <span style="background:${nPerluPj ? '#fffbeb' : '#ecfdf5'};color:${nPerluPj ? '#b45309' : '#047857'};border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;">${nPerluPj ? '🔔 ' + nPerluPj + ' kelas perlu diingatkan' : (nMemuat ? '⏳ progres dimuat' : '✅ tidak ada kelas yang perlu diingatkan')}${nPerluPj && nMemuat ? ' (+' + nMemuat + ' kelas masih dimuat)' : ''}</span></div>`;
  // ----- progres penilaian per kelas -----
  let sT = 0, sD = 0, sL = 0, sR = 0;
  adaTarget.forEach(r => { if (r.P) { sT += r.P.total; sD += r.P.dinilai; sL += r.P.lulus; sR += r.P.remedial; } });
  const barisProgres = adaTarget.map(r => {
    const nama = `<td style="white-space:nowrap;font-weight:600;">${bsEsc(bsNamaKelas(r.k))}</td>`;
    if (!r.P) return `<tr>${nama}<td colspan="7" class="text-muted" style="font-size:12px;">⏳ memuat...</td></tr>`;
    return `<tr>${nama}<td style="text-align:center;">${r.P.siswa}</td><td style="text-align:center;">${r.P.targets}</td>
      <td style="text-align:center;white-space:nowrap;"><strong>${r.P.dinilai}/${r.P.total}</strong> <span class="text-muted" style="font-size:11px;">(${r.P.persen}%)</span></td>
      <td style="text-align:center;color:#059669;font-weight:700;">${r.P.lulus}</td><td style="text-align:center;color:#d97706;font-weight:700;">${r.P.remedial}</td>
      <td style="min-width:110px;">${r.P.total ? bsBarTumpuk(r.P.lulus, r.P.remedial, r.P.belum) : ''}</td><td>${bsWaLencana(r.st)}</td></tr>`;
  }).join('');
  const blokProgres = adaTarget.length ? `<p class="text-muted" style="font-size:12px;margin-bottom:6px;">Dinilai = setoran berstatus Lulus atau Remedial (siswa aktif x bacaan pekan ini). ${sT ? '<strong>Seluruh kelas: ' + sD + ' dari ' + sT + ' setoran sudah dinilai (' + Math.round(sD / sT * 100) + '%).</strong>' : ''} Data dari server saat dimuat; tekan 🔄 Segarkan bila guru baru saja menilai.</p>
      <div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Siswa</th><th>Bacaan</th><th>Dinilai</th><th>Lulus</th><th>Remedial</th><th>Progres</th><th>Status</th></tr></thead><tbody>${barisProgres}</tbody></table></div>`
    : '<p class="text-muted" style="font-size:12px;">Belum ada kelas yang punya target di pekan ini.</p>';
  // ----- bagian PJ: semua kelas -----
  const jam = r => r.P ? `<div style="font-size:12px;margin-top:4px;">${r.P.dinilai}/${r.P.total} dinilai (${r.P.persen}%) · ${r.P.lulus} lulus · ${r.P.remedial} remedial</div><div style="max-width:220px;margin-top:3px;">${r.P.total ? bsBarTumpuk(r.P.lulus, r.P.remedial, r.P.belum) : ''}</div>` : '<div class="text-muted" style="font-size:12px;margin-top:4px;">⏳ memuat progres...</div>';
  let barisP = rows.filter(r => !hanya || (r.ts.length && r.st.perlu !== false)).map(r => {
    if (!r.ts.length) return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;"><strong style="min-width:70px;">${bsEsc(bsNamaKelas(r.k))}</strong><span class="text-muted" style="font-size:12px;">Belum ada target di pekan ini. Buat di tab 🎯 Target.</span></div>`;
    if (!r.petugas.length) return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;"><strong style="min-width:70px;">${bsEsc(bsNamaKelas(r.k))}</strong><span style="font-size:12px;">${bsEsc(r.bacaan)}</span>${bsWaLencana(r.st)}<span style="color:#dc2626;font-size:12px;">⚠️ Belum ada PJ. Tetapkan di tab 🎯 Target.</span></div>`;
    return r.petugas.map(p => {
      const i = listP.findIndex(x => x.id === 'P|' + g.key + '|' + r.k + '|' + (p.key));
      const id = listP[i].id, resmi = /^PJ/.test(p.peran);
      return `<div id="bsWaRow_P${i}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;">
        <div style="min-width:0;flex:1 1 220px;"><div><strong>${bsEsc(bsNamaKelas(r.k))}</strong> <span class="text-muted" style="font-size:12px;">· ${bsEsc(r.bacaan)}</span></div>
          <div style="font-size:13px;margin-top:2px;">👤 ${bsEsc(p.nama)} ${resmi ? '' : `<span style="color:#b45309;font-size:11px;">(${bsEsc(p.peran)}; PJ belum ditetapkan)</span>`}</div>
          ${p.noWa ? '' : '<div style="color:#dc2626;font-size:11px;margin-top:2px;">Nomor WA belum diisi di data guru</div>'}${jam(r)}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${bsWaLencana(r.st)}${bsWaTandaHtml(id, 'P', i)}<button class="btn btn-success" style="padding:5px 10px;font-size:12px;" ${p.noWa ? '' : 'disabled'} onclick="bsWaKirimPetugas(${i})">📲 WhatsApp</button>${(r.st.perlu === true && p.key) ? `<button class="btn btn-soft" style="padding:5px 10px;font-size:12px;" onclick="bsWaNotifPj(${i})">🔔 Notif aplikasi</button><span id="bsWaNotif_P${i}" style="font-size:11px;color:#059669;">${bsWaTglTanda(listP[i].nid) ? '✓ notif ' + bsEsc(bsWaTglTanda(listP[i].nid)) : ''}</span>` : ''}</div></div>`;
    }).join('');
  }).join('');
  if (!barisP) barisP = '<p class="text-muted" style="font-size:12px;padding:6px 0;">Tidak ada PJ yang perlu diingatkan untuk pekan ini.</p>';
  // ----- bagian wali murid: satu kelas -----
  let blokWali;
  if (!rw) blokWali = '<p class="text-muted" style="font-size:12px;">Belum ada kelas yang punya target di pekan ini.</p>';
  else if (!wali) blokWali = '<p class="text-muted" style="font-size:12px;">⏳ Memuat daftar siswa...</p>';
  else {
    const nPerluW = daftarWali.filter(d => d.perlu === true).length, sisaW = daftarWali.filter(d => d.perlu === true && !sudah(d.id)).length;
    const tampil = daftarWali.map((d, i) => ({ d, i })).filter(x => !hanya || x.d.perlu !== false);
    const baris = tampil.map(({ d, i }) => `<div id="bsWaRow_W${i}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;">
        <div style="min-width:0;flex:1 1 200px;font-size:13px;">${bsEsc(d.siswa.join(', '))}<div class="text-muted" style="font-size:11px;">+${bsEsc(d.nomor)}</div>
          <div style="font-size:12px;margin-top:2px;">${d.v ? bsEsc(d.v.progres) : '<span class="text-muted">⏳ memuat progres...</span>'}</div></div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${bsWaLencana(d.st)}${bsWaTandaHtml(d.id, 'W', i)}<button class="btn btn-soft" style="padding:5px 10px;font-size:12px;" onclick="bsWaKirimWali(${i})">📲 WhatsApp</button></div></div>`).join('');
    blokWali = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        <span style="font-size:12px;">${daftarWali.length} nomor wali · ${nPerluW} perlu diingatkan · <strong id="bsWaSisa">${sisaW}</strong> belum dibuka</span>
        <button class="btn btn-success" style="padding:6px 12px;font-size:12px;" onclick="bsWaBerikutnya()">▶ Buka yang perlu diingatkan berikutnya</button></div>
      <div style="max-height:300px;overflow-y:auto;">${baris || (hanya && daftarWali.length ? '<p class="text-muted" style="font-size:12px;">Tidak ada wali murid yang perlu diingatkan di kelas ini.</p>' : '<p class="text-muted" style="font-size:12px;">Belum ada siswa dengan nomor WA wali.</p>')}</div>
      ${wali.tanpa.length ? `<p style="font-size:12px;color:#b45309;margin-top:8px;">⚠️ Nomor WA wali belum diisi (${wali.tanpa.length}): ${bsEsc(wali.tanpa.slice(0, 8).join(', '))}${wali.tanpa.length > 8 ? ', dst' : ''}. Isi lewat Edit Siswa.</p>` : ''}`;
  }
  const pilKelas = adaTarget.map(r => `<option value="${bsEsc(r.k)}" ${rw && r.k === rw.k ? 'selected' : ''}>${bsEsc(bsNamaKelas(r.k))}</option>`).join('');
  const judul = (n, t) => `<div style="display:flex;align-items:center;gap:8px;margin:16px 0 6px;"><span style="background:#047857;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:none;">${n}</span><strong>${t}</strong></div>`;
  return `<div class="card" style="margin-bottom:14px;border:1px solid #e5e7eb;">
    <p style="font-size:13px;margin-bottom:4px;"><strong>📲 Pengingat WhatsApp.</strong> <span class="text-muted">Pilih pekan, lihat progres penilaian tiap kelas, lalu ketuk tombol WhatsApp pada penerima yang ditandai 🔔. WhatsApp terbuka dengan nomor dan pesan (sudah memuat progres) terisi, Anda tinggal menekan Kirim. Tanda "sudah dibuka" hanya catatan di perangkat ini.</span></p>
    ${judul(1, 'Pilih pekan / agenda')}
    <select class="field" style="max-width:420px;" onchange="bsWaPilihPekan(this.value)">${opsiPekan}</select>${ringkas}
    ${judul(2, 'Progres penilaian per kelas')}
    ${blokProgres}
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin:14px 0 0;cursor:pointer;"><input type="checkbox" ${hanya ? 'checked' : ''} onchange="bsWaToggleHanyaPerlu(this.checked)"> Tampilkan hanya yang perlu diingatkan</label>
    ${judul(3, 'Ingatkan penanggung jawab (semua kelas)')}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
      <span style="font-size:12px;"><strong id="bsWaSisaP">${sisaP}</strong> PJ perlu diingatkan &amp; belum dibuka</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" onclick="bsWaBerikutnyaPetugas()">▶ Buka PJ yang perlu diingatkan berikutnya</button>
      <button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" ${nNotif ? '' : 'disabled'} onclick="bsWaNotifSemua()">🔔 Notif aplikasi ke semua PJ yang perlu (${nNotif})</button></div></div>
    <div>${barisP}</div>
    ${judul(4, 'Ingatkan wali murid (per kelas)')}
    <div style="margin-bottom:8px;max-width:260px;"><label class="label">Kelas wali murid</label><select class="field" onchange="bsWaPilihKelas(this.value)" ${adaTarget.length ? '' : 'disabled'}>${pilKelas}</select></div>
    ${blokWali}
    <details style="margin-top:14px;"><summary style="cursor:pointer;font-weight:600;font-size:13px;">✏️ Ubah isi pesan (opsional)</summary>
      <label class="label" style="margin-top:8px;">Pesan untuk penanggung jawab</label>
      <textarea class="field" rows="6" oninput="bsState.wa.pesanPetugas=this.value">${bsEsc(w.pesanPetugas)}</textarea>
      <label class="label" style="margin-top:8px;">Pesan untuk wali murid</label>
      <textarea class="field" rows="6" oninput="bsState.wa.pesanWali=this.value">${bsEsc(w.pesanWali)}</textarea>
      <p class="text-muted" style="font-size:11px;margin-top:4px;">Isian otomatis: {nama} {siswa} {bacaan} {waktu} {kelas} {pj} {madrasah} · progres: {progres} {persen} {sisa} {belum}. Untuk PJ, progres = penilaian kelas ({belum} = siswa yang belum dinilai); untuk wali = progres ananda ({belum} = bacaan yang belum lulus). <a href="#" onclick="bsWaResetPesan();return false;">Kembalikan pesan awal</a></p>
    </details></div>`;
}
function bsWaPilihPekan(key) { if (bsState.wa) bsState.wa.pekan = key; bsRender(); bsPastikanDataIngatkan(); }
function bsWaToggleHanyaPerlu(v) { if (bsState.wa) bsState.wa.hanyaPerlu = !!v; bsRender(); }
function bsWaPilihKelas(k) { if (bsState.wa) bsState.wa.kelasWali = k; bsRender(); }
function bsWaResetPesan() { if (bsState.wa) { bsState.wa.pesanPetugas = bsWaPesanPetugas(); bsState.wa.pesanWali = bsWaPesanWali(); } bsRender(); }
// Tanda "sudah dibuka" tersimpan di perangkat ini beserta tanggalnya; "Ingatkan lagi" mengosongkannya supaya masuk antrean tombol "berikutnya".
function bsWaTglTanda(id) {
  const t = bsWaBacaTanda()[id]; if (!t) return '';
  const d = new Date(t); return d.getDate() + ' ' + BS_BULAN[d.getMonth()];
}
function bsWaTandaHtml(id, kind, i) {
  const tg = bsWaTglTanda(id);
  if (!tg) return '<span class="bs-wa-tanda"><span class="bs-wa-st text-muted" style="font-size:12px;">belum dibuka</span></span>';
  return `<span class="bs-wa-tanda"><span class="bs-wa-st" style="color:#059669;font-weight:600;font-size:12px;">✓ dibuka ${bsEsc(tg)}</span> <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="bsWaIngatkanLagi('${kind}',${i})">↺ Ingatkan lagi</button></span>`;
}
function bsWaHapusTanda(id) {
  const m = bsWaBacaTanda(); delete m[id]; bsWaMem = m;
  try { localStorage.setItem(BS_WA_KUNCI, JSON.stringify(m)); } catch (e) { /* penanda hanya sementara */ }
}
function bsWaHitungSisa() {
  const ls = bsState.waList || { petugas: [], wali: [] }, sp = bsEl('bsWaSisaP'), sw = bsEl('bsWaSisa');
  if (sp) sp.textContent = ls.petugas.filter(x => x.noWa && x.perlu === true && !bsWaSudah(x.id)).length;
  if (sw) sw.textContent = ls.wali.filter(d => d.perlu === true && !bsWaSudah(d.id)).length;
}
function bsWaTandaiBaris(rowId, id) {
  bsWaTandai(id);
  const el = bsEl(rowId), m = /^bsWaRow_([PW])(\d+)$/.exec(rowId), tn = el && el.querySelector('.bs-wa-tanda');
  if (tn && m) tn.outerHTML = bsWaTandaHtml(id, m[1], +m[2]);
  bsWaHitungSisa();
}
function bsWaIngatkanLagi(kind, i) {
  if (!(bsIsAdmin() || bsIsHead())) return;
  const ls = bsState.waList || {}, item = (kind === 'P' ? ls.petugas : ls.wali || [])[i];
  if (!item) return;
  bsWaHapusTanda(item.id);
  const el = bsEl('bsWaRow_' + kind + i), tn = el && el.querySelector('.bs-wa-tanda');
  if (tn) tn.outerHTML = bsWaTandaHtml(item.id, kind, i);
  bsWaHitungSisa();
  toast('Tanda dikosongkan. Tombol "berikutnya" akan memilihnya lagi.', false, 2000);
}
// Notifikasi di dalam aplikasi untuk PJ (lewat v4Notify, seperti saat PJ ditetapkan). Tanda "✓ notif <tgl>" juga hanya di perangkat ini.
function bsWaKirimNotifSatu(p, label) {
  return new Promise(res => {
    const judul = p.fase === 'lewat' ? 'Penilaian Bacaan Sholat terlambat' : 'Pengingat penilaian Bacaan Sholat';
    const isi = bsNamaKelas(p.kelas) + ' (' + label + '): ' + p.v.progres + '. Belum dinilai: ' + p.v.belum + '. Mohon segera dinilai di menu Bacaan Sholat.';
    try { const r = v4Notify(judul, isi, 'INFO', p.key); if (r && typeof r.then === 'function') r.then(() => res(true), () => res(false)); else res(true); } catch (e) { res(false); }
  });
}
function bsWaTandaiNotif(i) {
  const p = ((bsState.waList || {}).petugas || [])[i]; if (!p) return;
  bsWaTandai(p.nid);
  const sp = bsEl('bsWaNotif_P' + i); if (sp) sp.textContent = '✓ notif ' + bsWaTglTanda(p.nid);
}
function bsWaNotifPj(i) {
  if (!(bsIsAdmin() || bsIsHead())) return;
  const ls = bsState.waList || {}, p = (ls.petugas || [])[i];
  if (!p || !p.key) return;
  if (typeof v4Notify !== 'function') return toast('Fitur notifikasi aplikasi tidak tersedia.', true);
  if (!p.v) return toast('⏳ Progres penilaian ' + bsNamaKelas(p.kelas) + ' masih dimuat. Tunggu sebentar lalu coba lagi.', true);
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  if (!bsKunciMulai('notif_' + p.nid)) return;
  bsWaKirimNotifSatu(p, ls.label).then(ok => {
    bsKunciSelesai('notif_' + p.nid);
    if (ok) { bsWaTandaiNotif(i); toast('✅ Notifikasi dikirim ke ' + p.nama + '.'); } else toast('❌ Gagal mengirim notifikasi ke ' + p.nama + '.', true);
  });
}
function bsWaNotifSemua() {
  if (!(bsIsAdmin() || bsIsHead())) return;
  const ls = bsState.waList || {}, daftar = [];
  (ls.petugas || []).forEach((p, i) => { if (p.key && p.perlu === true && p.v && !bsWaSudah(p.nid)) daftar.push({ p, i }); });
  if (!daftar.length) return toast('Tidak ada PJ lagi yang perlu diberi notifikasi.', false, 2000);
  if (typeof v4Notify !== 'function') return toast('Fitur notifikasi aplikasi tidak tersedia.', true);
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  if (!confirm('Kirim notifikasi aplikasi ke ' + daftar.length + ' PJ yang perlu diingatkan (' + ls.label + ')?')) return;
  if (!bsKunciMulai('notifSemua')) return;
  let ok = 0, gagal = 0;
  daftar.reduce((jan, x) => jan.then(() => bsWaKirimNotifSatu(x.p, ls.label).then(b => { if (b) { ok++; bsWaTandaiNotif(x.i); } else gagal++; })), Promise.resolve())
    .then(() => { bsKunciSelesai('notifSemua'); toast((ok ? '✅ ' + ok + ' notifikasi dikirim.' : '') + (gagal ? ' ❌ ' + gagal + ' gagal.' : ''), !!gagal && !ok); });
}
function bsWaKirimPetugas(i) {
  if (!(bsIsAdmin() || bsIsHead())) return;
  const ls = bsState.waList || {}, p = (ls.petugas || [])[i];
  if (!p || !p.noWa || typeof kirimWA !== 'function') return;
  if (!p.v) return toast('⏳ Progres penilaian ' + bsNamaKelas(p.kelas) + ' masih dimuat. Tunggu sebentar lalu coba lagi.', true);
  kirimWA(p.noWa, bsWaIsi(bsState.wa.pesanPetugas, { nama: p.nama, bacaan: p.bacaan, waktu: ls.label, kelas: bsNamaKelas(p.kelas), pj: p.pjTeks, madrasah: bsWaMadrasah(), progres: p.v.progres, sisa: p.v.sisa, belum: p.v.belum, persen: p.v.persen }));
  bsWaTandaiBaris('bsWaRow_P' + i, p.id);
}
function bsWaBerikutnyaPetugas() {
  const ls = bsState.waList || { petugas: [] };
  const i = ls.petugas.findIndex(x => x.noWa && x.perlu === true && !bsWaSudah(x.id));
  if (i < 0) return toast('Tidak ada PJ lagi yang perlu diingatkan untuk pekan ini.', false, 2000);
  bsWaKirimPetugas(i);
  const el = bsEl('bsWaRow_P' + i); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}
function bsWaKirimWali(i) {
  if (!(bsIsAdmin() || bsIsHead())) return;
  const ls = bsState.waList || {}, d = (ls.wali || [])[i];
  if (!d || typeof kirimWA !== 'function') return;
  if (!d.v) return toast('⏳ Progres penilaian ' + bsNamaKelas(ls.waliKelas) + ' masih dimuat. Tunggu sebentar lalu coba lagi.', true);
  kirimWA(d.nomor, bsWaIsi(bsState.wa.pesanWali, { siswa: d.siswa.join(' & '), nama: d.siswa.join(' & '), bacaan: ls.waliBacaan, waktu: ls.label, kelas: bsNamaKelas(ls.waliKelas), pj: ls.waliPj, madrasah: bsWaMadrasah(), progres: d.v.progres, sisa: d.v.sisa, belum: d.v.belum, persen: d.v.persen }));
  bsWaTandaiBaris('bsWaRow_W' + i, d.id);
}
function bsWaBerikutnya() {
  const ls = bsState.waList || { wali: [] };
  const i = ls.wali.findIndex(d => d.perlu === true && !bsWaSudah(d.id));
  if (i < 0) return toast('Tidak ada wali murid lagi yang perlu diingatkan di kelas ini.', false, 2000);
  bsWaKirimWali(i);
  const el = bsEl('bsWaRow_W' + i); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
}

// ---------- Tab TARGET ----------
// ---------- PJ per kelas + target otomatis + pembersihan target lama ----------
function bsPjKelasHtml() {
  if (!(bsIsAdmin() || bsIsHead())) return '';
  const admin = bsIsAdmin();
  const gl = ((typeof allGuru !== 'undefined' && Array.isArray(allGuru)) ? allGuru : []).filter(g => g && g.name).slice().sort((a, b) => bsCmp(a.name, b.name));
  const kl = typeof KELAS_LIST !== 'undefined' ? KELAS_LIST : [];
  const pj = bsState.pjKelas || {}, tg = bsState.targets || [];
  const tanpa = kl.filter(k => !tg.some(t => t.kelas === k));
  const baris = kl.map(k => {
    const p = pj[k] || {}, n = tg.filter(t => t.kelas === k).length;
    const pilih = admin
      ? `<select class="field" style="font-size:12px;padding:5px;" onchange="bsSetPjKelas('${bsEscJs(k)}', this.value)"><option value="">-- Belum Ditentukan --</option>${gl.map(g => { const v = g.key || g.name; return `<option value="${bsEsc(v)}" ${v === p.key ? 'selected' : ''}>${bsEsc(g.name)}</option>`; }).join('')}</select>`
      : bsEsc(p.name || '—');
    const tombol = (admin && !n) ? ` <button class="btn btn-primary" style="padding:3px 9px;font-size:11px;" onclick="bsBuatTargetOtomatis('${bsEscJs(k)}')">⚡ Buat otomatis</button>` : '';
    return `<tr><td style="font-weight:600;white-space:nowrap;">${bsEsc(bsNamaKelas(k))}</td><td>${pilih}</td><td style="white-space:nowrap;font-size:12px;">${n ? n + ' target' : '<span class="text-muted">belum ada</span>'}${tombol}</td></tr>`;
  }).join('');
  const lama = tg.filter(t => t.kelas === '*');
  const peringatanLama = (admin && lama.length) ? `<div style="padding:10px;border:1px solid #fecaca;background:#fef2f2;border-radius:10px;margin-bottom:10px;font-size:13px;">⚠️ Ada ${lama.length} target lama berlaku "Semua kelas". Target seperti ini sudah tidak dipakai lagi. <button class="btn btn-danger" style="margin-left:6px;padding:4px 10px;font-size:12px;" onclick="bsHapusTargetLama()">🧹 Hapus target lama</button></div>` : '';
  const semuaOto = (admin && tanpa.length > 1) ? `<button class="btn btn-soft" style="padding:5px 10px;font-size:12px;margin-bottom:8px;" onclick="bsBuatTargetOtomatis('')">⚡ Buat otomatis untuk ${tanpa.length} kelas yang belum punya target</button>` : '';
  return `${peringatanLama}<div class="v4-card" style="margin-bottom:14px;"><h4>👤 Penanggung Jawab Bacaan Sholat per Kelas</h4>
    <div class="v4-muted" style="margin-bottom:8px;">${admin ? 'Admin menentukan satu guru penanggung jawab untuk tiap kelas. Guru ini menerima notifikasi di aplikasi saat ditetapkan, dan diingatkan lewat WhatsApp di tab 📲 Pengingat.' : 'Penanggung jawab ditentukan oleh Admin.'}</div>
    ${semuaOto}<div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Penanggung Jawab</th><th>Target</th></tr></thead><tbody>${baris}</tbody></table></div></div>`;
}
// Notifikasi ke guru yang ditetapkan (atau dilepas) sebagai PJ. Gagal kirim tidak menggagalkan penetapan.
function bsNotifPj(kelas, baru, lama) {
  if (typeof v4Notify !== 'function') return;
  const nk = bsNamaKelas(kelas), kirim = (judul, isi, key) => { try { const p = v4Notify(judul, isi, 'INFO', key); if (p && p.catch) p.catch(() => {}); } catch (e) { /* abaikan */ } };
  if (baru && (!lama || lama.key !== baru.key)) {
    const tindak = bsHariIni() < BS_PJ_AKSES_MULAI ? ' Menu Bacaan Sholat aktif untuk Anda mulai ' + bsFmtTgl(BS_PJ_AKSES_MULAI) + '.' : ' Buka menu Bacaan Sholat untuk menilai setoran dan mengelola target kelas ini.';
    kirim('Anda ditetapkan sebagai PJ Bacaan Sholat', 'Anda menjadi penanggung jawab Bacaan Sholat ' + nk + '.' + tindak, baru.key);
  }
  if (lama && (!baru || lama.key !== baru.key)) kirim('Penanggung jawab Bacaan Sholat berubah', 'Anda tidak lagi menjadi penanggung jawab Bacaan Sholat ' + nk + '.', lama.key);
}
function bsSetPjKelas(kelas, guruValue) {
  if (!bsIsAdmin()) return toast('Hanya Admin!', true);
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  const gl = (typeof allGuru !== 'undefined' && Array.isArray(allGuru)) ? allGuru : [];
  const ref = db.ref('bs_pj_kelas/' + kelas);
  bsState.pjKelas = bsState.pjKelas || {};
  const pjLama = (bsPjMap && bsPjMap[kelas]) ? Object.assign({}, bsPjMap[kelas]) : null;
  if (!guruValue) {
    ref.remove().then(() => { bsPjSimpanLokal(kelas, null); bsNotifPj(kelas, null, pjLama); toast('Penanggung jawab dihapus'); bsRender(); })
      .catch(err => toast('❌ Gagal menyimpan: ' + ((err && err.message) || err), true));
    return;
  }
  const g = gl.find(x => x && (x.key || x.name) === guruValue); if (!g) return;
  const rec = { kelas, key: g.key || g.name, name: g.name, updatedAt: new Date().toISOString(), updatedBy: bsGuruNama() };
  ref.set(rec).then(() => {
    bsPjSimpanLokal(kelas, rec); bsNotifPj(kelas, rec, pjLama);
    if (typeof v4Audit === 'function') v4Audit('BS_SET_PJ_KELAS', 'BACAAN_SHALAT', kelas, null, { kelas, pj: g.name });
    toast('✅ Penanggung jawab ' + bsNamaKelas(kelas) + ' tersimpan.'); bsRender();
  }).catch(err => toast('❌ Gagal menyimpan: ' + ((err && err.message) || err), true));
}
function bsBuatTargetOtomatis(kelas) {
  if (!bsIsAdmin()) return toast('Hanya Admin.', true);
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  const semua = typeof KELAS_LIST !== 'undefined' ? KELAS_LIST : [];
  const punya = new Set((bsState.targets || []).map(t => t.kelas));
  const daftar = (kelas ? [kelas] : semua).filter(k => !punya.has(k));
  if (!daftar.length) return toast('Kelas ini sudah punya target.', true);
  const msg = 'Buat ' + BS_CONTOH_TARGET.length + ' target bacaan sholat (mingguan, satu per pekan mulai ' + bsFmtTgl(BS_PJ_AKSES_MULAI) + ' atau pekan ini bila sudah lewat) untuk ' + (daftar.length === 1 ? bsNamaKelas(daftar[0]) : daftar.length + ' kelas yang belum punya target') + '?';
  if (!(typeof doubleConfirm === 'function' ? doubleConfirm(msg) : confirm(msg))) return;
  if (!bsKunciMulai('otomatis')) return;
  // Mulai dari Senin pekan ini, tetapi tidak lebih awal dari BS_PJ_AKSES_MULAI (2 Nov 2026): target pertama jatuh di pekan PJ mulai aktif.
  const d = new Date(), seninIni = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)), seninMulai = bsTglParse(BS_PJ_AKSES_MULAI);
  const senin = seninIni < seninMulai ? seninMulai : seninIni;
  const now = new Date().toISOString(), payload = {}, baru = [];
  daftar.forEach(k => BS_CONTOH_TARGET.forEach((nama, i) => {
    const id = db.ref('bs_target').push().key;
    const tgl = bsFmtLokal(new Date(senin.getFullYear(), senin.getMonth(), senin.getDate() + i * 7));
    const rec = { nama, jenis: 'mingguan', tanggal: tgl, kelas: k, urutan: i + 1, aktif: true, tahunAjaran: bsTA(), dibuat: now, dibuatOleh: bsGuruNama() };
    payload[id] = rec; baru.push(Object.assign({ key: id }, rec));
  }));
  db.ref('bs_target').update(payload).then(() => {
    bsState.targets = (bsState.targets || []).concat(baru);
    if (typeof v4Audit === 'function') v4Audit('BS_TARGET_OTOMATIS', 'BACAAN_SHALAT', null, null, { kelas: daftar.join(', '), jumlah: baru.length });
    toast('✅ ' + baru.length + ' target dibuat untuk ' + daftar.length + ' kelas.'); bsRender();
  }).catch(err => toast('❌ Gagal: ' + ((err && err.message) || err), true))
    .then(() => bsKunciSelesai('otomatis'));
}
function bsHapusTargetLama() {
  if (!bsIsAdmin()) return toast('Hanya Admin.', true);
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  const lama = (bsState.targets || []).filter(t => t.kelas === '*');
  if (!lama.length) return toast('Tidak ada target lama.', true);
  const msg = 'Hapus ' + lama.length + ' target lama "Semua kelas"? Target yang sudah punya penilaian siswa tidak dihapus, hanya dinonaktifkan.';
  if (!(typeof doubleConfirm === 'function' ? doubleConfirm(msg) : confirm(msg))) return;
  if (!bsKunciMulai('hapusLama')) return;
  Promise.all(lama.map(t => db.ref('bs_setoran').orderByChild('targetId').equalTo(t.key).limitToFirst(1).once('value').then(snap => ({ t, ada: snap.exists() })))).then(hasil => {
    const payload = {}; let dihapus = 0, dinonaktif = 0;
    hasil.forEach(h => { if (h.ada) { if (h.t.aktif !== false) { payload[h.t.key + '/aktif'] = false; payload[h.t.key + '/updatedAt'] = new Date().toISOString(); } dinonaktif++; } else { payload[h.t.key] = null; dihapus++; } });
    return db.ref('bs_target').update(payload).then(() => {
      bsState.targets = (bsState.targets || []).filter(t => !hasil.some(h => !h.ada && h.t.key === t.key));
      hasil.filter(h => h.ada).forEach(h => { const t = bsState.targets.find(x => x.key === h.t.key); if (t) t.aktif = false; });
      if (typeof v4Audit === 'function') v4Audit('BS_HAPUS_TARGET_LAMA', 'BACAAN_SHALAT', null, null, { dihapus, dinonaktif });
      toast('✅ ' + dihapus + ' target lama dihapus' + (dinonaktif ? ', ' + dinonaktif + ' dinonaktifkan (sudah ada penilaian)' : '') + '.'); bsRender();
    });
  }).catch(err => toast('❌ Gagal: ' + ((err && err.message) || err), true))
    .then(() => bsKunciSelesai('hapusLama'));
}
function bsBodyIngatkan() {
  if (!(bsIsAdmin() || bsIsHead())) return '<p class="text-muted">Tab ini hanya untuk Admin dan Kepala Madrasah.</p>';
  const targets = (bsState.targets || []).filter(t => t.aktif !== false).sort(bsBandingTarget);
  return bsWaPanelHtml(targets) || '<p class="text-muted" style="font-size:13px;">Belum ada target aktif. Buat target di tab 🎯 Target dulu, lalu kembali ke sini untuk mengirim pengingat.</p>';
}
function bsBodyTarget() {
  const targets = (bsState.targets || []).filter(t => bsIsAdmin() || bsIsHead() || t.kelas === '*' || bsKelasScope().includes(t.kelas)).sort(bsBandingTarget);
  const edit = bsState.editId ? (bsState.targets || []).find(t => t.key === bsState.editId) : null;
  const pilKelasForm = [];
  if (edit && edit.kelas === '*') pilKelasForm.push(['*', 'Semua kelas']);   // opsi lama hanya muncul saat mengubah target lama
  bsKelasPilihan().forEach(k => { if (bsCanTarget(k)) pilKelasForm.push([k, bsNamaKelas(k)]); });
  const nextUrutan = (targets.reduce((m, t) => Math.max(m, t.urutan || 0), 0)) + 1;
  const v = edit || { nama: '', jenis: 'mingguan', tanggal: bsHariIni(), kelas: (pilKelasForm.find(x => x[0] === bsState.kelas) || pilKelasForm[0] || [''])[0], urutan: nextUrutan, teks: '' };
  const kelasInputHtml = (!edit && pilKelasForm.length > 1)
    ? `<div><label class="label">Berlaku untuk kelas * <span class="text-muted" style="font-weight:400;font-size:11px;">(boleh lebih dari satu)</span></label>
          <div style="display:flex;flex-wrap:wrap;gap:6px 14px;padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;">${pilKelasForm.map(([k, t]) => `<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;"><input type="checkbox" class="bsTgKelasCb" value="${bsEsc(k)}" ${k === bsState.kelas ? 'checked' : ''}> ${bsEsc(t)}</label>`).join('')}</div></div>`
    : `<div><label class="label">Berlaku untuk *</label>
          <select id="bsTgKelas" class="field">${pilKelasForm.map(([k, t]) => `<option value="${bsEsc(k)}" ${v.kelas === k ? 'selected' : ''}>${bsEsc(t)}</option>`).join('')}</select></div>`;
  const form = bsPunyaAksesTarget() ? `
    <details class="card" style="margin-bottom:14px;border:1px solid #e5e7eb;" ${(edit || !targets.length) ? 'open' : ''}>
      <summary style="cursor:pointer;font-weight:700;margin-bottom:8px;">${edit ? '✏️ Ubah Target' : '➕ Tambah Target Bacaan'}</summary>
      <div class="v4-grid-2">
        <div><label class="label">Nama bacaan *</label><input id="bsTgNama" class="field" maxlength="120" placeholder="mis. Doa Iftitah" value="${bsEsc(v.nama)}"></div>
        <div><label class="label">Periode *</label>
          <select id="bsTgJenis" class="field" onchange="bsTargetJenisBerubah()"><option value="harian" ${v.jenis === 'harian' ? 'selected' : ''}>Harian</option><option value="mingguan" ${v.jenis === 'mingguan' ? 'selected' : ''}>Mingguan</option></select></div>
        <div><label class="label" id="bsTgTanggalLabel">${v.jenis === 'harian' ? 'Tanggal target *' : 'Tanggal di pekan target *'}</label><input id="bsTgTanggal" type="date" class="field" value="${bsEsc(v.tanggal)}"></div>
        ${kelasInputHtml}
        <div><label class="label">Urutan</label><input id="bsTgUrutan" type="number" min="1" max="999" class="field" value="${bsEsc(v.urutan)}"></div>
      </div>
      <label class="label" style="margin-top:8px;">Teks bacaan / catatan untuk siswa (opsional)</label>
      <textarea id="bsTgTeks" class="field" rows="3" maxlength="2000" placeholder="Tulis teks bacaan atau petunjuk singkat. Tampil di Mode Anak.">${bsEsc(v.teks || '')}</textarea>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button class="btn btn-success" id="bsBtnSimpanTarget" onclick="bsSimpanTarget()">💾 ${edit ? 'Simpan Perubahan' : 'Tambah Target'}</button>
        ${edit ? '<button class="btn btn-soft" onclick="bsBatalEditTarget()">Batal</button>' : ''}
      </div>
    </details>` : '';
  const kosong = !targets.length;
  const contoh = '';
  const baris = targets.map(t => {
    const bisa = bsCanTarget(t.kelas);
    const aktif = t.aktif !== false;
    return `<tr style="${aktif ? '' : 'opacity:.55;'}">
      <td style="text-align:center;">${bsEsc(t.urutan || '')}</td>
      <td><strong>${bsEsc(t.nama)}</strong>${t.teks ? ' <span title="Ada teks bacaan">📄</span>' : ''}<div class="text-muted" style="font-size:11px;">${bsEsc(t.jenis === 'mingguan' ? 'Mingguan' : 'Harian')} · ${bsEsc(bsLabelTarget(t))}</div>${bsPjNama(t).length ? '<div class="text-muted" style="font-size:11px;">👤 PJ: ' + bsEsc(bsPjNama(t).join(', ')) + '</div>' : ''}</td>
      <td>${t.kelas === '*' ? 'Semua' : bsEsc(t.kelas)}</td>
      <td>${aktif ? '<span style="color:#059669;font-weight:600;font-size:12px;">Aktif</span>' : '<span class="text-muted" style="font-size:12px;">Nonaktif</span>'}</td>
      <td style="white-space:nowrap;">${bisa ? `<button class="btn btn-soft" style="padding:3px 8px;font-size:11px;" onclick="bsEditTarget('${bsEscJs(t.key)}')">✏️</button>
        <button class="btn btn-soft" style="padding:3px 8px;font-size:11px;" onclick="bsToggleAktif('${bsEscJs(t.key)}')">${aktif ? '⏸️' : '▶️'}</button>
        <button class="btn btn-danger" style="padding:3px 8px;font-size:11px;" onclick="bsHapusTarget('${bsEscJs(t.key)}')">🗑️</button>` : '<span class="text-muted" style="font-size:11px;">lihat saja</span>'}</td>
    </tr>`;
  }).join('');
  return bsPjKelasHtml() + form + contoh + (kosong ? '<p class="text-muted" style="font-size:13px;">Belum ada target bacaan.</p>' : `<div style="overflow-x:auto;"><table><thead><tr><th>#</th><th>Bacaan</th><th>Kelas</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${baris}</tbody></table></div>`);
}
function bsTargetJenisBerubah() {
  const j = bsEl('bsTgJenis'), l = bsEl('bsTgTanggalLabel');
  if (j && l) l.textContent = j.value === 'harian' ? 'Tanggal target *' : 'Tanggal di pekan target *';
}
function bsEditTarget(id) { bsState.editId = id; bsRender(); const f = bsEl('bsTgNama'); if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' }); }
function bsBatalEditTarget() { bsState.editId = ''; bsRender(); }
function bsSimpanTarget() {
  if (!bsPunyaAksesTarget()) return toast('Anda tidak punya izin mengelola target.', true);
  if (!bsOnline()) return toast('📡 Sedang offline. Menyimpan target butuh koneksi internet.', true);
  if (isBusy('bsSimpanTarget')) return;
  const nama = (bsEl('bsTgNama').value || '').trim(), jenis = bsEl('bsTgJenis').value, tanggal = bsEl('bsTgTanggal').value;
  const kelasEl = bsEl('bsTgKelas');
  const kelasPilih = kelasEl ? [kelasEl.value] : Array.from(document.querySelectorAll('.bsTgKelasCb:checked')).map(el => el.value);
  const kelas = kelasPilih[0] || '', urutan = parseInt(bsEl('bsTgUrutan').value, 10) || 1, teks = (bsEl('bsTgTeks').value || '').trim();
  if (nama.length < 2) return toast('⚠️ Nama bacaan minimal 2 huruf.', true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || '')) return toast('⚠️ Tanggal target belum diisi.', true);
  if (!kelasPilih.length) return toast('⚠️ Pilih minimal satu kelas.', true);
  if (kelasPilih.some(k => !k || !bsCanTarget(k))) return toast('⚠️ Anda tidak boleh membuat target untuk kelas tersebut.', true);
  const edit = bsState.editId ? (bsState.targets || []).find(t => t.key === bsState.editId) : null;
  if (edit && !bsCanTarget(edit.kelas)) return toast('⚠️ Anda tidak boleh mengubah target milik kelas lain.', true);
  const btn = bsEl('bsBtnSimpanTarget'); setBusy('bsSimpanTarget', btn);
  const now = new Date().toISOString();
  const data = { nama, jenis, tanggal, kelas, urutan, tahunAjaran: bsTA(), updatedAt: now, diubahOleh: bsGuruNama() };
  let janji, rec, recsBaru = [];
  if (edit) {
    rec = Object.assign({}, edit, data); if (teks) rec.teks = teks; else delete rec.teks;
    const dataUbah = Object.assign({}, data, { teks: teks || null });
    janji = bsSesiSiap().then(() => db.ref('bs_target/' + edit.key).update(dataUbah));
  } else {
    const updates = {};
    kelasPilih.forEach(k => {   // satu target per kelas yang dicentang (tidak ada lagi target "semua kelas" untuk target baru)
      const key = db.ref('bs_target').push().key;
      const d = Object.assign({}, data, { kelas: k, aktif: true, dibuat: now, dibuatOleh: bsGuruNama() });
      if (teks) d.teks = teks;
      updates[key] = d; recsBaru.push(Object.assign({ key }, d));
    });
    rec = recsBaru[0]; janji = bsSesiSiap().then(() => db.ref('bs_target').update(updates));
  }
  janji.then(() => {
    clearBusy('bsSimpanTarget', bsEl('bsBtnSimpanTarget'));
    if (edit) { const i = bsState.targets.findIndex(t => t.key === edit.key); if (i >= 0) bsState.targets[i] = rec; } else recsBaru.forEach(r => bsState.targets.push(r));
    bsState.editId = '';
    if (typeof v4Audit === 'function') (edit ? [rec] : recsBaru).forEach(r => v4Audit(edit ? 'BS_UBAH_TARGET' : 'BS_BUAT_TARGET', 'BACAAN_SHALAT', r.key, null, { nama, jenis, kelas: r.kelas }));
    toast(edit || recsBaru.length < 2 ? '✅ Target tersimpan.' : '✅ ' + recsBaru.length + ' target (per kelas) tersimpan.'); bsRender();
  }).catch(err => { clearBusy('bsSimpanTarget', bsEl('bsBtnSimpanTarget')); toast('❌ Gagal menyimpan target: ' + ((err && err.message) || err), true); });
}
function bsToggleAktif(id) {
  const t = (bsState.targets || []).find(x => x.key === id); if (!t || !bsCanTarget(t.kelas)) return;
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  const baru = t.aktif === false, kunci = 'aktif_' + id;
  if (!bsKunciMulai(kunci)) return;
  bsSesiSiap().then(() => db.ref('bs_target/' + id).update({ aktif: baru, updatedAt: new Date().toISOString() }))
    .then(() => { t.aktif = baru; toast(baru ? '▶️ Target diaktifkan.' : '⏸️ Target dinonaktifkan (data penilaian tetap tersimpan).'); bsRender(); })
    .catch(err => toast('❌ Gagal: ' + ((err && err.message) || err), true))
    .then(() => bsKunciSelesai(kunci));
}
function bsHapusTarget(id) {
  const t = (bsState.targets || []).find(x => x.key === id); if (!t || !bsCanTarget(t.kelas)) return;
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  // Tolak hapus kalau sudah ada penilaian (hindari data yatim) -- sarankan nonaktifkan.
  const kunci = 'hapus_' + id;
  if (!bsKunciMulai(kunci)) return;
  db.ref('bs_setoran').orderByChild('targetId').equalTo(id).limitToFirst(1).once('value').then(snap => {
    if (snap.exists()) return toast('⚠️ Target ini sudah punya penilaian siswa, jadi tidak bisa dihapus. Gunakan ⏸️ Nonaktifkan.', true);
    const ok = typeof doubleConfirm === 'function' ? doubleConfirm('Hapus target "' + t.nama + '"?') : confirm('Hapus target "' + t.nama + '"?');
    if (!ok) return;
    return db.ref('bs_target/' + id).remove().then(() => {
      bsState.targets = bsState.targets.filter(x => x.key !== id);
      if (typeof v4Audit === 'function') v4Audit('BS_HAPUS_TARGET', 'BACAAN_SHALAT', id, { nama: t.nama }, null);
      toast('✅ Target dihapus.'); bsRender();
    });
  }).catch(err => toast('❌ Gagal: ' + ((err && err.message) || err), true))
    .then(() => bsKunciSelesai(kunci));
}

// ---------- Tab PENILAIAN ----------
function bsKunciSetoran(targetId, sk) { return targetId + '_' + sk; }
function bsDraftBeda(d, saved) {
  if (!saved) return !!d.status || (d.nilai !== '' && d.nilai != null) || (d.catatan || '').trim() !== '' || (d.alasan || []).length > 0;   // nilai/catatan tanpa status tetap terdeteksi -> divalidasi saat simpan
  const n1 = d.nilai === '' || d.nilai == null ? null : Number(d.nilai), n2 = saved.nilai == null ? null : Number(saved.nilai);
  return d.status !== saved.status || n1 !== n2 || (d.catatan || '').trim() !== (saved.catatan || '') || bsAlasanGabung(d.alasan) !== (saved.status === 'Remedial' ? bsAlasanGabung(bsAlasanParse(saved.alasan)) : '');
}
function bsBuatDraft(sk) {
  const k = bsState.kelas, tid = bsState.targetSel, saved = (bsState.setoran[k] || {})[bsKunciSetoran(tid, sk)];
  const s = (bsSiswaKelas(k) || []).find(x => x.key === sk), t = (bsState.targets || []).find(x => x.key === tid);
  return { kelas: k, targetId: tid, targetNama: t ? t.nama : '', siswaKey: sk, siswaNama: s ? s.name : '',
    status: saved ? saved.status : '', nilai: saved && saved.nilai != null ? saved.nilai : '', catatan: saved ? (saved.catatan || '') : '',
    alasan: saved && saved.status === 'Remedial' ? bsAlasanParse(saved.alasan) : [] };
}
function bsDraftAmbil(sk) {
  const key = bsKunciSetoran(bsState.targetSel, sk);
  if (!bsState.draft[key]) bsState.draft[key] = bsBuatDraft(sk);
  return bsState.draft[key];
}
function bsJumlahDirty() {
  const k = bsState.kelas, saved = bsState.setoran[k] || {};
  return Object.values(bsState.draft).filter(d => d.kelas === k && bsDraftBeda(d, saved[bsKunciSetoran(d.targetId, d.siswaKey)])).length;
}
function bsUpdateLabelSimpan() {
  const b = bsEl('bsBtnSimpanNilai'); if (!b) return;
  const n = bsJumlahDirty(); b.textContent = '💾 Simpan Penilaian' + (n ? ' (' + n + ' perubahan)' : '');
}
function bsPilihTarget(id) { bsState.targetSel = id; bsRender(); }
function bsPilihStatus(sk, idx) {
  if (!bsCanNilai(bsState.kelas)) return;
  const d = bsDraftAmbil(sk); d.status = BS_STATUS[idx]; if (d.status !== 'Remedial') d.alasan = []; bsRender();
}
function bsToggleAlasan(sk, idx) {
  if (!bsCanNilai(bsState.kelas)) return;
  const d = bsDraftAmbil(sk), a = BS_ALASAN_REMEDIAL[idx]; if (!a || d.status !== 'Remedial') return;
  const cur = new Set(d.alasan || []); if (cur.has(a)) cur.delete(a); else cur.add(a);
  d.alasan = BS_ALASAN_REMEDIAL.filter(x => cur.has(x)); bsRender();
}
function bsSetNilai(sk, v) { if (!bsCanNilai(bsState.kelas)) return; bsDraftAmbil(sk).nilai = v; bsUpdateLabelSimpan(); }
function bsSetCatatan(sk, v) { if (!bsCanNilai(bsState.kelas)) return; bsDraftAmbil(sk).catatan = v; bsUpdateLabelSimpan(); }
// Kartu ringkas di tab Penilaian: progres penilaian kelas ini untuk pekan berjalan (Senin-Minggu).
function bsKartuProgresPekan(k, targets) {
  const h = bsHariIni(), senin = bsTambahHari(h, -((bsTglParse(h).getDay() + 6) % 7)), minggu = bsTambahHari(senin, 6);
  const ts = targets.filter(t => { const a = bsAwalTarget(t); return a && a >= senin && a <= minggu; });
  const kotak = isi => `<div class="card" style="border:1px solid #e5e7eb;margin-bottom:10px;"><p style="font-weight:700;font-size:13px;margin-bottom:4px;">📊 Progres penilaian pekan ini · ${bsEsc(bsNamaKelas(k))} <span class="text-muted" style="font-weight:400;font-size:11px;">(${bsEsc(bsFmtTgl(senin, true))} – ${bsEsc(bsFmtTgl(minggu, true))})</span></p>${isi}</div>`;
  if (!ts.length) return kotak('<p class="text-muted" style="font-size:12px;">Belum ada bacaan yang dijadwalkan pekan ini untuk kelas ini.</p>');
  const P = bsWaProgresKelas(k, ts);
  if (!P || !P.total) return '';
  const n = P.namaBelum.length;
  return kotak(`<p style="font-size:13px;"><strong>${P.dinilai} dari ${P.total}</strong> setoran sudah dinilai (${P.persen}%) · ✅ ${P.lulus} lulus · 🔁 ${P.remedial} remedial</p>
    <div style="margin:6px 0;">${bsBarTumpuk(P.lulus, P.remedial, P.belum)}</div>
    <p style="font-size:12px;${n ? 'color:#b45309;' : 'color:#047857;font-weight:600;'}">${n ? '⏳ Masih ada ' + P.belum + ' setoran belum dinilai (' + n + ' siswa): ' + bsEsc(P.namaBelum.slice(0, 8).join(', ')) + (n > 8 ? ', dst' : '') : '✅ Semua setoran pekan ini sudah dinilai.'}</p>
    <p class="text-muted" style="font-size:11px;margin-top:2px;">Bacaan pekan ini: ${bsEsc(ts.map(t => t.nama).join(', '))}</p>`);
}
function bsBodyNilai() {
  const k = bsState.kelas;
  if (!k) return '<p class="text-muted">Belum ada kelas yang bisa dipilih.</p>';
  const targets = bsTargetUntukKelas(bsState.targets, k);
  if (!targets.length) return '<p class="text-muted" style="font-size:13px;">Belum ada target aktif untuk kelas ini. Buat dulu di tab 🎯 Target.</p>';
  if (!targets.some(t => t.key === bsState.targetSel)) bsState.targetSel = targets[0].key;
  const t = targets.find(x => x.key === bsState.targetSel);
  const siswa = bsSiswaAktif(k);   // hanya siswa aktif (sama dengan Rekap)
  if (!siswa) {
    const gagal = typeof v4PanelSiswaGagal !== 'undefined' && v4PanelSiswaGagal[k];
    return gagal ? `<div style="padding:10px;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:13px;">⚠️ Gagal memuat siswa kelas ${bsEsc(k)} (${bsEsc(gagal)}). <button class="btn btn-soft" style="padding:3px 10px;font-size:12px;" onclick="bsPastikanDataKelas()">🔄 Coba lagi</button></div>`
      : '<p class="text-muted" style="padding:10px;">⏳ Memuat daftar siswa...</p>';
  }
  if (!bsState.setoran[k]) return '<p class="text-muted" style="padding:10px;">⏳ Memuat data penilaian...</p>';
  if (!siswa.length) return '<p class="text-muted">Belum ada siswa di kelas ini.</p>';
  const setoran = bsState.setoran[k], bisa = bsCanNilai(k);
  let nL = 0, nR = 0;
  siswa.forEach(s => { const x = setoran[bsKunciSetoran(t.key, s.key)]; if (x && x.status === 'Lulus') nL++; else if (x && x.status === 'Remedial') nR++; });
  const draftPer = {}; Object.values(bsState.draft).forEach(d => { if (d.kelas === k && bsDraftBeda(d, setoran[bsKunciSetoran(d.targetId, d.siswaKey)])) draftPer[d.targetId] = (draftPer[d.targetId] || 0) + 1; });
  const opsiTarget = targets.map(x => `<option value="${bsEsc(x.key)}" ${x.key === t.key ? 'selected' : ''}>${bsEsc((x.urutan || '') + '. ' + x.nama + (draftPer[x.key] ? '  ✏️ ' + draftPer[x.key] + ' belum disimpan' : ''))}</option>`).join('');
  const baris = siswa.map(s => {
    const key = bsKunciSetoran(t.key, s.key), saved = setoran[key], d = bsState.draft[key];
    const cur = d ? d.status : (saved ? saved.status : '');
    const dirty = d && bsDraftBeda(d, saved);
    const nilai = d ? d.nilai : (saved && saved.nilai != null ? saved.nilai : '');
    const cat = d ? d.catatan : (saved ? (saved.catatan || '') : '');
    const tombol = BS_STATUS.map((st, i) => {
      const aktif = cur === st;
      return `<button ${bisa ? '' : 'disabled'} onclick="bsPilihStatus('${bsEscJs(s.key)}',${i})" style="padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:${bisa ? 'pointer' : 'default'};border:2px solid ${BS_STATUS_WARNA[st]};background:${aktif ? BS_STATUS_WARNA[st] : '#fff'};color:${aktif ? '#fff' : BS_STATUS_WARNA[st]};">${BS_STATUS_IKON[st]} ${st}</button>`;
    }).join('');
    const alasanCur = d ? (d.alasan || []) : (saved && saved.status === 'Remedial' ? bsAlasanParse(saved.alasan) : []);
    const chipAlasan = (bisa && cur === 'Remedial') ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center;"><span class="text-muted" style="font-size:11px;">Alasan remedial:</span>${BS_ALASAN_REMEDIAL.map((a, i) => { const on = alasanCur.includes(a); return `<button onclick="bsToggleAlasan('${bsEscJs(s.key)}',${i})" style="padding:4px 9px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid #d97706;background:${on ? '#d97706' : '#fff'};color:${on ? '#fff' : '#b45309'};">${bsEsc(a)}</button>`; }).join('')}</div>` : '';
    return `<div style="padding:10px;border:1px solid ${dirty ? '#f59e0b' : '#e5e7eb'};border-radius:10px;margin-bottom:8px;${dirty ? 'background:#fffbeb;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-weight:600;font-size:14px;">${bsEsc(s.name)} ${saved ? `<span class="text-muted" style="font-size:11px;font-weight:400;">· ${bsEsc(bsFmtTgl(saved.tanggal, true))}${(saved.percobaan || 1) > 1 ? ' · percobaan ke-' + saved.percobaan : ''}</span>` : ''}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${tombol}</div>
      </div>
      ${chipAlasan}
      ${bisa ? `<div style="display:flex;gap:6px;margin-top:6px;">
        <input type="number" min="0" max="100" class="field" style="width:84px;" placeholder="Nilai" value="${bsEsc(nilai)}" oninput="bsSetNilai('${bsEscJs(s.key)}',this.value)">
        <input type="text" maxlength="300" class="field" placeholder="Catatan guru (opsional)" value="${bsEsc(cat)}" oninput="bsSetCatatan('${bsEscJs(s.key)}',this.value)">
      </div>` : (saved && (saved.nilai != null || saved.catatan || saved.alasan) ? `<div class="text-muted" style="font-size:12px;margin-top:4px;">${saved.nilai != null ? 'Nilai: ' + bsEsc(saved.nilai) + '. ' : ''}${saved.alasan ? 'Alasan: ' + bsEsc(saved.alasan) + '. ' : ''}${bsEsc(saved.catatan || '')}</div>` : '')}
    </div>`;
  }).join('');
  return bsKartuProgresPekan(k, targets) + `<div class="card" style="border:1px solid #e5e7eb;">
    <div class="v4-grid-2">
      <div><label class="label">Target yang diuji</label><select class="field" onchange="bsPilihTarget(this.value)">${opsiTarget}</select></div>
      <div><label class="label">Tanggal penilaian</label><input type="date" class="field" value="${bsEsc(bsState.tglNilai)}" min="${bsEsc(bsTambahHari(bsHariIni(), -BS_HARI_NILAI_MUNDUR))}" max="${bsEsc(bsHariIni())}" onchange="bsState.tglNilai=this.value"></div>
    </div>
    <p style="font-size:12px;margin:8px 0;" class="text-muted">${bsEsc(bsLabelTarget(t))} · ✅ ${nL} Lulus · 🔁 ${nR} Remedial · ⏳ ${siswa.length - nL - nR} Belum Setor (dari ${siswa.length} siswa)</p>
    ${t.teks ? `<div style="padding:8px 10px;background:#f0fdf4;border-radius:8px;font-size:13px;margin-bottom:8px;white-space:pre-wrap;">${bsEsc(t.teks)}</div>` : ''}
    ${baris}
    ${bisa ? `<button id="bsBtnSimpanNilai" class="btn btn-success" style="margin-top:6px;" onclick="bsSimpanNilai()">💾 Simpan Penilaian${bsJumlahDirty() ? ' (' + bsJumlahDirty() + ' perubahan)' : ''}</button>` : '<p class="v4-muted" style="font-size:12px;">Anda hanya bisa melihat kelas ini.</p>'}
  </div>`;
}
function bsSimpanNilai() {
  const k = bsState.kelas;
  if (!bsCanNilai(k)) return toast('Anda tidak punya izin menilai kelas ini.', true);
  if (!bsOnline()) return toast('📡 Sedang offline. Penilaian bacaan sholat butuh koneksi internet.', true);
  if (isBusy('bsSimpanNilai')) return;
  const tgl = bsState.tglNilai || bsHariIni();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return toast('⚠️ Tanggal penilaian belum diisi.', true);
  if (tgl > bsHariIni()) return toast('⚠️ Tanggal penilaian tidak boleh di masa depan.', true);
  const saved = bsState.setoran[k] || {};
  const dirty = Object.values(bsState.draft).filter(d => d.kelas === k && bsDraftBeda(d, saved[bsKunciSetoran(d.targetId, d.siswaKey)]));
  if (!dirty.length) return toast('Tidak ada perubahan untuk disimpan.', false, 1800);
  const tanpaStatus = dirty.filter(d => !d.status);
  if (tanpaStatus.length) return toast('⚠️ Pilih status (Lulus/Remedial/Belum Setor) dulu untuk: ' + tanpaStatus.slice(0, 3).map(d => d.siswaNama).join(', ') + (tanpaStatus.length > 3 ? ', dst.' : ''), true);
  const salahNilai = dirty.find(d => d.nilai !== '' && d.nilai != null && !(isFinite(Number(d.nilai)) && Number(d.nilai) >= 0 && Number(d.nilai) <= 100));
  if (salahNilai) return toast('⚠️ Nilai ' + salahNilai.siswaNama + ' harus angka 0–100.', true);
  const belumDgnNilai = dirty.find(d => d.status === 'Belum Setor' && d.nilai !== '' && d.nilai != null);
  if (belumDgnNilai) return toast('⚠️ ' + belumDgnNilai.siswaNama + ': status Belum Setor tidak boleh punya nilai. Kosongkan nilai atau ubah statusnya.', true);
  const remedialKosong = dirty.filter(d => d.status === 'Remedial' && !(d.alasan || []).length && !(d.catatan || '').trim());
  if (remedialKosong.length) return toast('⚠️ Remedial wajib disertai alasan (pilih salah satu) atau catatan: ' + remedialKosong.slice(0, 3).map(d => d.siswaNama).join(', ') + (remedialKosong.length > 3 ? ', dst.' : ''), true);
  // Tanggal penilaian: tidak terlalu jauh ke belakang, dan tidak sebelum target itu dimulai (hanya untuk catatan yang memakai tanggal ini).
  const batasMundur = bsTambahHari(bsHariIni(), -BS_HARI_NILAI_MUNDUR);
  const barisTglBaru = dirty.filter(d => { const l = saved[bsKunciSetoran(d.targetId, d.siswaKey)]; return !(l && l.status === d.status); });
  if (barisTglBaru.length && tgl < batasMundur) return toast('⚠️ Tanggal penilaian paling jauh ' + BS_HARI_NILAI_MUNDUR + ' hari ke belakang (mulai ' + bsFmtTgl(batasMundur) + ').', true);
  // Penilaian lebih awal dari tanggal mulai target BOLEH (setoran dini); hanya dibatasi 14 hari ke belakang dan tidak di masa depan.
  const turunLulus = dirty.filter(d => { const l = saved[bsKunciSetoran(d.targetId, d.siswaKey)]; return l && l.status === 'Lulus' && d.status !== 'Lulus'; });
  if (turunLulus.length) {
    const msg = 'Ubah status LULUS menjadi ' + (turunLulus.length === 1 ? turunLulus[0].status : 'status lain') + ' untuk: ' + turunLulus.slice(0, 5).map(d => d.siswaNama).join(', ') + (turunLulus.length > 5 ? ', dst' : '') + '? Poin dan lencana siswa ikut berubah.';
    if (!confirm(msg)) return;
  }
  const btn = bsEl('bsBtnSimpanNilai'); setBusy('bsSimpanNilai', btn);
  const now = new Date().toISOString(), ta = bsTA();
  // Versi sebuah catatan = updatedAt + status. Dipakai mendeteksi catatan yang sudah diubah perangkat lain sejak dimuat.
  const verRec = r => r ? String(r.updatedAt || '') + '|' + String(r.status || '') : null;
  // 'lama' = catatan di SERVER saat transaksi berjalan (bukan salinan di perangkat), supaya percobaan/tanggal selalu benar.
  const bangunRec = (d, lama) => {
    const sama = lama && lama.status === d.status;
    const rec = {
      targetId: d.targetId, targetNama: d.targetNama, siswaKey: d.siswaKey, siswaNama: d.siswaNama, kelas: k, status: d.status,
      tanggal: sama ? (lama.tanggal || tgl) : tgl,
      // Percobaan baru dihitung hanya bila sebelumnya Remedial lalu diuji ulang. 'Belum Setor' & koreksi salah klik bukan percobaan.
      percobaan: !lama ? 1 : ((lama.status === 'Remedial' && !sama && d.status !== 'Belum Setor') ? (lama.percobaan || 1) + 1 : (lama.percobaan || 1)),
      guruKey: bsGuruKey(), guruName: bsGuruNama(), tahunAjaran: ta, updatedAt: now
    };
    if (d.nilai !== '' && d.nilai != null) rec.nilai = Number(d.nilai);
    if (d.status === 'Remedial' && (d.alasan || []).length) rec.alasan = bsAlasanGabung(d.alasan);
    const cat = (d.catatan || '').trim(); if (cat) rec.catatan = cat.slice(0, 300);
    return rec;
  };
  // Satu transaksi per catatan: dibaca ulang dari server, ditolak bila sudah berubah dari yang dilihat penilai.
  const tugas = bsSesiSiap().then(() => Promise.all(dirty.map(d => {
    const key = bsKunciSetoran(d.targetId, d.siswaKey), dilihat = saved[key] || null;
    return db.ref('bs_setoran/' + key).transaction(cur => {
      // cur === null bisa berarti "belum ada" ATAU "belum termuat" (putaran pertama); biarkan server yang menguji ulang.
      if (cur !== null && verRec(cur) !== verRec(dilihat)) return;   // undefined = batalkan (konflik)
      return bangunRec(d, cur);
    }, undefined, false).then(res => ({ key, d, committed: res.committed, server: res.snapshot.val() }))
      .catch(err => ({ key, d, err }));
  })));
  tugas.then(hasil => {
    hasil.filter(h => h.err).forEach(h => console.warn('[SI MAMBA] Simpan penilaian ditolak:', h.key, h.err && (h.err.code || h.err.message), { kelas: k, guruKey: bsGuruKey() }));
    clearBusy('bsSimpanNilai', bsEl('bsBtnSimpanNilai'));
    const peta = (bsState.setoran[k] = bsState.setoran[k] || {});
    const ok = hasil.filter(h => h.committed), gagal = hasil.filter(h => h.err), konflik = hasil.filter(h => !h.committed && !h.err);
    ok.forEach(h => { peta[h.key] = Object.assign({ key: h.key }, h.server); delete bsState.draft[h.key]; });
    // Konflik: muat nilai terbaru dari server ke tampilan, draft penilai TETAP dipertahankan untuk ditinjau.
    konflik.forEach(h => { if (h.server) peta[h.key] = Object.assign({ key: h.key }, h.server); else delete peta[h.key]; });
    if (ok.length && typeof v4Audit === 'function') v4Audit('BS_NILAI_SETORAN', 'BACAAN_SHALAT', k, null, { kelas: k, jumlah: ok.length, tanggal: tgl });
    const nama = arr => arr.slice(0, 3).map(h => h.d.siswaNama).join(', ') + (arr.length > 3 ? ', dst.' : '');
    if (!konflik.length && !gagal.length) toast('✅ ' + ok.length + ' penilaian tersimpan.');
    else {
      let pesan = ok.length ? ok.length + ' tersimpan. ' : '';
      if (konflik.length) pesan += '⚠️ ' + konflik.length + ' TIDAK disimpan karena sudah diubah di perangkat lain (' + nama(konflik) + '). Data terbaru sudah dimuat; periksa lalu simpan lagi. ';
      if (gagal.length) pesan += '❌ ' + gagal.length + ' gagal (' + nama(gagal) + '): ' + ((gagal[0].err && gagal[0].err.message) || gagal[0].err) + '. Draft dipertahankan.';
      toast(pesan.trim(), true);
    }
    bsRender();
  });
}

// ---------- Tab REKAP (per kelas / semua kelas) ----------
function bsPilihModeRekap(m) { bsState.rekapMode = m; bsRender(); bsPastikanDataKelas(); }
function bsRekapBukaKelas(k) { bsState.kelas = k; bsState.rekapMode = 'kelas'; bsRender(); bsPastikanDataKelas(); }
// Pengaman ganda: selain bidang 'aktif' pada data kelas, siswa yang tercatat nonaktif di allSiswaSemua (app.js) juga dibuang.
function bsNonaktifSet() {
  const semua = (typeof allSiswaSemua !== 'undefined' && Array.isArray(allSiswaSemua)) ? allSiswaSemua : [];
  return new Set(semua.filter(x => x && x.aktif === false).map(x => x.key));
}
function bsFilterAktif(arr) { const non = bsNonaktifSet(); return (arr || []).filter(x => x && x.aktif !== false && !non.has(x.key)); }
function bsSiswaAktif(k) { const a = bsSiswaKelas(k); return a ? bsFilterAktif(a) : null; }
function bsPromiseSiswa(k) {
  const perlu = typeof v4PanelSiswaCache !== 'undefined' && !v4PanelSiswaCache[k] && typeof v4FetchSiswaByKelas === 'function';
  return perlu ? new Promise(res => { let sel = false; const fin = () => { if (!sel) { sel = true; res(); } }; try { v4FetchSiswaByKelas(k, fin); } catch (e) { fin(); } setTimeout(fin, 15000); }) : Promise.resolve();
}
function bsPastikanDataSemua() {
  const daftar = bsKelasPilihan(); if (!daftar.length) return;
  if (!bsKunciMulai('rekapSemua')) return;
  Promise.all(daftar.map(k => Promise.all([bsPromiseSiswa(k), bsMuatSetoran(k, false)])))
    .catch(e => { bsState.err = 'Gagal memuat rekap: ' + ((e && e.message) || e); })
    .then(() => { bsKunciSelesai('rekapSemua'); if (bsState.tab === 'rekap' && bsState.rekapMode === 'semua') bsRender(); });
}
// Tab Pengingat: muat siswa + penilaian untuk semua kelas yang punya target di pekan terpilih (dipakai menghitung progres).
function bsPastikanDataIngatkan() {
  if (!(bsIsAdmin() || bsIsHead()) || !bsState.wa) return;
  const g = bsWaDaftarPekan((bsState.targets || []).filter(t => t.aktif !== false)).find(x => x.key === bsState.wa.pekan);
  if (!g) return;
  const daftar = bsKelasPilihan().filter(k => g.targets.some(t => t.kelas === k || t.kelas === '*'));
  if (!daftar.length) return;
  if (!bsKunciMulai('ingatkanData')) { bsState.ingatkanUlang = true; return; }   // sedang memuat: ulangi setelah selesai (pekan mungkin berganti)
  Promise.all(daftar.map(k => Promise.all([bsPromiseSiswa(k), bsMuatSetoran(k, false)])))
    .catch(e => { bsState.err = 'Gagal memuat progres penilaian: ' + ((e && e.message) || e); })
    .then(() => {
      bsKunciSelesai('ingatkanData');
      if (bsState.tab === 'ingatkan') bsRender();
      if (bsState.ingatkanUlang) { bsState.ingatkanUlang = false; bsPastikanDataIngatkan(); }
    });
}
// Hitung rekap satu kelas dari data yang sudah dimuat; null bila siswa/penilaian belum siap.
function bsHitungRekapKelas(k) {
  const siswa = bsSiswaAktif(k), setoran = bsState.setoran[k];
  if (!siswa || !setoran) return null;
  const targets = bsTargetUntukKelas(bsState.targets, k);
  let l = 0, r = 0;
  const perSiswa = siswa.map(s => {
    let sl = 0, sr = 0;
    targets.forEach(t => { const x = setoran[bsKunciSetoran(t.key, s.key)]; if (x && x.status === 'Lulus') sl++; else if (x && x.status === 'Remedial') sr++; });
    l += sl; r += sr; return { s, l: sl, r: sr };
  });
  const total = siswa.length * targets.length;
  return { k, siswa, targets, setoran, perSiswa, l, r, b: total - l - r, total, persen: total ? Math.round(l / total * 100) : 0 };
}
function bsBodyRekap() {
  const mode = bsState.rekapMode === 'semua' ? 'semua' : 'kelas';
  const sw = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
    <button class="btn ${mode === 'kelas' ? 'btn-primary' : 'btn-soft'}" style="padding:7px 14px;" onclick="bsPilihModeRekap('kelas')">🏫 Per Kelas</button>
    <button class="btn ${mode === 'semua' ? 'btn-primary' : 'btn-soft'}" style="padding:7px 14px;" onclick="bsPilihModeRekap('semua')">🌐 Semua Kelas</button>
    <button class="btn btn-soft" style="padding:7px 14px;margin-left:auto;" onclick="bsRekapPdf()">📄 Unduh PDF</button>
    <button class="btn btn-soft" style="padding:7px 14px;" onclick="bsRekapUnduh()">📥 CSV</button></div>`;
  return sw + (mode === 'semua' ? bsRekapSemua() : bsRekapKelas());
}
function bsRekapKelas() {
  const k = bsState.kelas;
  if (!k) return '<p class="text-muted">Belum ada kelas yang bisa dipilih.</p>';
  const targets = bsTargetUntukKelas(bsState.targets, k);
  if (!targets.length) return '<p class="text-muted" style="font-size:13px;">Belum ada target aktif untuk kelas ini.</p>';
  const R = bsHitungRekapKelas(k);
  if (!R) return '<p class="text-muted" style="padding:10px;">⏳ Memuat data...</p>';
  if (!R.siswa.length) return '<p class="text-muted">Belum ada siswa di kelas ini.</p>';
  const sel = (s, t) => {
    const x = R.setoran[bsKunciSetoran(t.key, s.key)];
    if (!x) return '<td style="text-align:center;color:#9ca3af;">·</td>';
    const w = BS_STATUS_WARNA[x.status] || '#6b7280', bg = BS_STATUS_BG[x.status] || '#f3f4f6';
    return `<td style="text-align:center;background:${bg};color:${w};font-weight:700;font-size:12px;" title="${bsEsc(x.status + (x.nilai != null ? ' · nilai ' + x.nilai : '') + ((x.percobaan || 1) > 1 ? ' · percobaan ke-' + x.percobaan : ''))}">${BS_STATUS_IKON[x.status] || ''}${x.nilai != null ? ' ' + bsEsc(x.nilai) : ''}</td>`;
  };
  const thT = R.targets.map(t => `<th style="min-width:64px;font-size:11px;font-weight:600;vertical-align:bottom;" title="${bsEsc(t.nama)}">${bsEsc((t.urutan || '') + '. ' + t.nama)}</th>`).join('');
  const baris = R.perSiswa.map((p, i) => `<tr><td style="position:sticky;left:0;background:#fff;white-space:nowrap;font-size:13px;font-weight:600;z-index:1;">${i + 1}. ${bsEsc(p.s.name)}</td>${R.targets.map(t => sel(p.s, t)).join('')}
      <td style="text-align:center;white-space:nowrap;font-size:12px;">${p.l}/${R.targets.length}</td><td style="text-align:center;font-weight:700;font-size:12px;">${R.targets.length ? Math.round(p.l / R.targets.length * 100) : 0}%</td></tr>`).join('');
  const kaki = R.targets.map(t => { const n = R.siswa.filter(s => { const x = R.setoran[bsKunciSetoran(t.key, s.key)]; return x && x.status === 'Lulus'; }).length; return `<td style="text-align:center;font-size:12px;font-weight:700;">${n}/${R.siswa.length}</td>`; }).join('');
  return `<div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
        <div><div style="font-size:22px;font-weight:800;">${R.siswa.length}</div><div class="text-muted" style="font-size:11px;">Siswa</div></div>
        <div><div style="font-size:22px;font-weight:800;">${R.targets.length}</div><div class="text-muted" style="font-size:11px;">Target</div></div>
        <div><div style="font-size:22px;font-weight:800;color:#059669;">${R.persen}%</div><div class="text-muted" style="font-size:11px;">Ketuntasan</div></div>
        <div><div style="font-size:22px;font-weight:800;color:#d97706;">${R.r}</div><div class="text-muted" style="font-size:11px;">Remedial</div></div>
      </div><div style="margin-top:8px;">${bsBarTumpuk(R.l, R.r, R.b)}</div></div>
    <div class="card" style="border:1px solid #e5e7eb;"><p style="font-weight:700;margin-bottom:4px;">📋 Rekap ${bsEsc(bsNamaKelas(k))}</p>
      <p class="text-muted" style="font-size:11px;margin-bottom:8px;">${BS_STATUS_IKON.Lulus} Lulus · ${BS_STATUS_IKON.Remedial} Remedial · · belum setor. Angka di samping ikon = nilai. Geser tabel ke samping bila target banyak.</p>
      <div style="overflow-x:auto;"><table style="border-collapse:separate;border-spacing:0;width:100%;"><thead><tr><th style="position:sticky;left:0;background:#f3f4f6;text-align:left;z-index:2;">Siswa</th>${thT}<th>Lulus</th><th>%</th></tr></thead>
      <tbody>${baris}</tbody><tfoot><tr><td style="position:sticky;left:0;background:#f3f4f6;font-weight:700;font-size:12px;">Lulus per target</td>${kaki}<td></td><td></td></tr></tfoot></table></div></div>`;
}
function bsRekapSemua() {
  const daftar = bsKelasPilihan();
  if (!daftar.length) return '<p class="text-muted">Belum ada kelas yang bisa dipilih.</p>';
  const hasil = daftar.map(k => ({ k, R: bsHitungRekapKelas(k) }));
  const siap = hasil.filter(h => h.R);
  const memuat = hasil.length - siap.length;
  let S = 0, L = 0, Rm = 0, B = 0, T = 0;
  siap.forEach(h => { S += h.R.siswa.length; L += h.R.l; Rm += h.R.r; B += h.R.b; T += h.R.total; });
  const persen = T ? Math.round(L / T * 100) : 0;
  const baris = hasil.map(({ k, R }) => {
    if (!R) return `<tr><td style="font-weight:600;">${bsEsc(bsNamaKelas(k))}</td><td colspan="6" class="text-muted" style="font-size:12px;">⏳ memuat...</td></tr>`;
    return `<tr><td style="white-space:nowrap;"><a href="javascript:void(0)" onclick="bsRekapBukaKelas('${bsEscJs(k)}')" style="color:#2563eb;text-decoration:none;font-weight:600;">${bsEsc(bsNamaKelas(k))}</a></td>
      <td style="text-align:center;">${R.siswa.length}</td><td style="text-align:center;">${R.targets.length}</td>
      <td style="text-align:center;color:#059669;font-weight:700;">${R.l}</td><td style="text-align:center;color:#d97706;font-weight:700;">${R.r}</td>
      <td style="text-align:center;">${R.targets.length ? R.persen + '%' : '<span class="text-muted">—</span>'}</td>
      <td style="min-width:110px;">${R.total ? bsBarTumpuk(R.l, R.r, R.b) : '<span class="text-muted" style="font-size:11px;">belum ada target</span>'}</td></tr>`;
  }).join('');
  return `<div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
        <div><div style="font-size:22px;font-weight:800;">${hasil.length}</div><div class="text-muted" style="font-size:11px;">Kelas</div></div>
        <div><div style="font-size:22px;font-weight:800;">${S}</div><div class="text-muted" style="font-size:11px;">Siswa</div></div>
        <div><div style="font-size:22px;font-weight:800;color:#059669;">${persen}%</div><div class="text-muted" style="font-size:11px;">Ketuntasan</div></div>
        <div><div style="font-size:22px;font-weight:800;color:#d97706;">${Rm}</div><div class="text-muted" style="font-size:11px;">Remedial</div></div>
      </div>${memuat ? `<p class="text-muted" style="font-size:11px;margin-top:6px;">⏳ ${memuat} kelas masih dimuat, angka total belum lengkap.</p>` : ''}</div>
    <div class="card" style="border:1px solid #e5e7eb;"><p style="font-weight:700;margin-bottom:4px;">🌐 Rekap Semua Kelas</p>
      <p class="text-muted" style="font-size:11px;margin-bottom:8px;">Lulus &amp; Remedial dihitung per sel (siswa × target aktif). Ketuk nama kelas untuk melihat rincian per siswa.</p>
      <div style="font-size:11px;margin-bottom:8px;" class="text-muted"><span style="color:#059669;">■</span> Lulus &nbsp;<span style="color:#d97706;">■</span> Remedial &nbsp;<span style="color:#9ca3af;">■</span> Belum Setor</div>
      <div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Siswa</th><th>Target</th><th>Lulus</th><th>Remedial</th><th>%</th><th>Progres</th></tr></thead><tbody>${baris}</tbody></table></div></div>`;
}
function bsRekapPdf() {
  const mode = bsState.rekapMode === 'semua' ? 'semua' : 'kelas';
  let data;
  if (mode === 'semua') {
    data = bsKelasPilihan().map(k => ({ k, R: bsHitungRekapKelas(k) }));
    if (!data.length || data.some(d => !d.R)) return toast('⏳ Data belum lengkap, tunggu sampai semua kelas selesai dimuat.', true);
  } else {
    data = bsState.kelas ? bsHitungRekapKelas(bsState.kelas) : null;
    if (!data) return toast('⏳ Data belum siap.', true);
  }
  if (typeof ensureLib !== 'function') return toast('Fitur PDF belum tersedia di versi ini.', true);
  if (!bsOnline() && !(window.jspdf && window.jspdf.jsPDF)) return toast('📡 Butuh jaringan untuk memuat pustaka PDF (sekali saja).', true);
  if (!bsKunciMulai('pdf')) return;
  toast('⏳ Menyiapkan PDF...');
  const safe = f => { try { return f(); } catch (e) { return Promise.resolve(null); } };
  Promise.all([ensureLib('pdf'), safe(() => v4LoadLogoForPdf()), safe(() => v4LoadTtdKepalaForPdf())]).then(async r => {
    const logo = r[1] || null, ttd = r[2] || null;
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), m = 15;
    let y = (typeof v4KopMadrasahPdf === 'function') ? v4KopMadrasahPdf(doc, pw, logo, m) + 7 : 20;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(mode === 'semua' ? 'REKAP BACAAN SHOLAT - SEMUA KELAS' : 'REKAP BACAAN SHOLAT - ' + String(bsNamaKelas(data.k)).toUpperCase(), pw / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Tahun Ajaran ' + bsTA() + '  |  Dicetak ' + bsFmtTgl(bsHariIni()), pw / 2, y + 5, { align: 'center' });
    y += 9;
    const kepala = (typeof MADRASAH !== 'undefined' && MADRASAH) ? MADRASAH : {};
    const warnaSel = d => {
      if (d.section !== 'body') return;
      const t = String(d.cell.raw == null ? '' : d.cell.raw);
      if (/^L(\s|$)/.test(t)) { d.cell.styles.fillColor = [220, 252, 231]; d.cell.styles.textColor = [4, 120, 87]; d.cell.styles.fontStyle = 'bold'; }
      else if (/^R$/.test(t)) { d.cell.styles.fillColor = [254, 243, 199]; d.cell.styles.textColor = [180, 83, 9]; d.cell.styles.fontStyle = 'bold'; }
    };
    let ketY;
    if (mode === 'kelas') {
      const R = data, nT = R.targets.length;
      const head = [['No', 'Nama Siswa'].concat(R.targets.map((t, i) => String(t.urutan || i + 1)), ['Lulus', '%'])];
      const body = R.perSiswa.map((p, i) => [String(i + 1), p.s.name].concat(R.targets.map(t => {
        const x = R.setoran[bsKunciSetoran(t.key, p.s.key)];
        return !x ? '-' : x.status === 'Lulus' ? 'L' + (x.nilai != null ? ' ' + x.nilai : '') : x.status === 'Remedial' ? 'R' : '-';
      }), [p.l + '/' + nT, (nT ? Math.round(p.l / nT * 100) : 0) + '%']));
      const foot = [['', 'Lulus per target'].concat(R.targets.map(t => String(R.siswa.filter(s => { const x = R.setoran[bsKunciSetoran(t.key, s.key)]; return x && x.status === 'Lulus'; }).length)), ['', ''])];
      doc.autoTable({ startY: y, head, body, foot, theme: 'grid', margin: { left: m, right: m },
        styles: { fontSize: 8, cellPadding: 1.1, halign: 'center', lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [31, 41, 55], textColor: 255 }, footStyles: { fillColor: [243, 244, 246], textColor: 20, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'left', cellWidth: 52 } }, didParseCell: warnaSel });
      ketY = doc.lastAutoTable.finalY + 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      const ket = 'Keterangan: L = Lulus (angka = nilai), R = Remedial, - = belum setor.  Ketuntasan kelas: ' + R.persen + '% (' + R.l + ' lulus, ' + R.r + ' remedial, ' + R.b + ' belum setor).';
      const daftarT = 'Target: ' + R.targets.map((t, i) => (t.urutan || i + 1) + '. ' + t.nama).join('; ');
      const barisKet = doc.splitTextToSize(ket, pw - 2 * m).concat(doc.splitTextToSize(daftarT, pw - 2 * m));
      if (ketY + barisKet.length * 4 > ph - 12) { doc.addPage(); ketY = 18; }   // keterangan satu blok, tidak terpecah antar halaman
      barisKet.forEach(l => { doc.text(l, m, ketY); ketY += 4; });
    } else {
      const head = [['No', 'Kelas', 'Siswa', 'Target', 'Lulus', 'Remedial', 'Belum Setor', 'Ketuntasan']];
      let S = 0, L = 0, Rm = 0, B = 0, T = 0;
      const body = data.map(({ k, R }, i) => { S += R.siswa.length; L += R.l; Rm += R.r; B += R.b; T += R.total;
        return [String(i + 1), bsNamaKelas(k), String(R.siswa.length), String(R.targets.length), String(R.l), String(R.r), String(R.b), R.targets.length ? R.persen + '%' : '-']; });
      const foot = [['', 'Total', String(S), '', String(L), String(Rm), String(B), (T ? Math.round(L / T * 100) : 0) + '%']];
      doc.autoTable({ startY: y, head, body, foot, theme: 'grid', margin: { left: m, right: m },
        styles: { fontSize: 9, cellPadding: 1.8, halign: 'center', lineColor: [200, 200, 200], lineWidth: 0.1 },
        headStyles: { fillColor: [31, 41, 55], textColor: 255 }, footStyles: { fillColor: [243, 244, 246], textColor: 20, fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'left' } } });
      ketY = doc.lastAutoTable.finalY + 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Lulus, Remedial, dan Belum Setor dihitung per sel (siswa x target aktif). Siswa nonaktif tidak dihitung.', m, ketY); ketY += 4;
    }
    // Tanda tangan: PJ/wali kelas di kiri (mode per kelas), Kepala Madrasah di kanan.
    let ty = ketY + 6;
    if (ty > ph - 48) { doc.addPage(); ty = 22; }
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const xKanan = pw - m - 60, xKiri = m + 15;
    const adaTtd = !!(window.TTD && typeof window.TTD.blokPdf === 'function');
    if (adaTtd) {
      // Sama dengan cetakan lain: blok Kepala mengikuti mode Profil Sekolah (QR / gambar / keduanya). Kode QR dicatat di ttd_qr
      // beserta jenis dokumen & pencetaknya, jadi bisa diverifikasi lewat ?verifikasi=KODE.
      const ketDok = (mode === 'semua' ? 'Semua kelas' : bsNamaKelas(data.k)) + ' | Tahun Ajaran ' + bsTA() + ' | Dicetak ' + bsFmtTgl(bsHariIni());
      doc.__ttdJudul = 'Rekap Bacaan Sholat'; doc.__ttdInfo = ketDok;
      try {
        await window.TTD.blokPdf(doc, { role: 'kepala', x: xKanan + 30, y: ty, atas: 'Mengetahui,', meta: { jenis: 'Rekap Bacaan Sholat', ket: ketDok } });
      } catch (e) { console.error('[Bacaan Sholat] Gagal menempel tanda tangan Kepala:', e); toast('⚠️ Tanda tangan Kepala gagal ditempel pada PDF.', true); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0);
    } else {
      doc.text('Mengetahui,', xKanan + 30, ty, { align: 'center' }); doc.text('Kepala Madrasah', xKanan + 30, ty + 5, { align: 'center' });
      if (ttd) { try { doc.addImage(ttd, /^data:image\/jpe?g/i.test(ttd) ? 'JPEG' : 'PNG', xKanan + 10, ty + 7, 40, 18, undefined, 'FAST'); } catch (e) { /* tanpa tanda tangan */ } }
      doc.setFont('helvetica', 'bold'); doc.text(String(kepala.kepala_sekolah || '........................'), xKanan + 30, ty + 30, { align: 'center' });
      doc.setFont('helvetica', 'normal'); if (kepala.nip_kepala_sekolah) doc.text('NIP. ' + kepala.nip_kepala_sekolah, xKanan + 30, ty + 35, { align: 'center' });
    }
    if (mode === 'kelas') {
      const pj = (bsPjMap && bsPjMap[data.k] && bsPjMap[data.k].name) || '';
      doc.text('Penanggung Jawab Bacaan Sholat', xKiri + 30, ty + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold'); doc.text(pj || '........................', xKiri + 30, ty + 30, { align: 'center' });
    }
    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120); doc.text('Halaman ' + i + ' / ' + n, pw - m, ph - 6, { align: 'right' }); doc.setTextColor(0); }
    const nama = 'rekap-bacaan-sholat-' + (mode === 'semua' ? 'semua-kelas' : String(data.k).replace(/[^A-Za-z0-9]+/g, '-')) + '-' + bsHariIni() + '.pdf';
    doc.save(nama);
    toast('✅ PDF rekap diunduh.');
  }).catch(e => toast('❌ Gagal membuat PDF: ' + ((e && e.message) || e), true))
    .then(() => bsKunciSelesai('pdf'));
}
function bsCsvSel(v) { v = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(v) && isNaN(Number(v))) v = "'" + v; return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function bsRekapUnduh() {
  const mode = bsState.rekapMode === 'semua' ? 'semua' : 'kelas';
  const baris = [];
  if (mode === 'semua') {
    const daftar = bsKelasPilihan().map(k => ({ k, R: bsHitungRekapKelas(k) }));
    if (!daftar.length || daftar.some(d => !d.R)) return toast('⏳ Data belum lengkap, tunggu sampai semua kelas selesai dimuat.', true);
    baris.push(['Kelas', 'Siswa', 'Target', 'Lulus', 'Remedial', 'Belum Setor', 'Ketuntasan (%)']);
    daftar.forEach(({ k, R }) => baris.push([bsNamaKelas(k), R.siswa.length, R.targets.length, R.l, R.r, R.b, R.persen]));
  } else {
    const k = bsState.kelas, R = k ? bsHitungRekapKelas(k) : null;
    if (!R) return toast('⏳ Data belum siap.', true);
    baris.push(['No', 'Siswa'].concat(R.targets.map(t => t.nama), ['Lulus', 'Ketuntasan (%)']));
    R.perSiswa.forEach((p, i) => baris.push([i + 1, p.s.name].concat(R.targets.map(t => {
      const x = R.setoran[bsKunciSetoran(t.key, p.s.key)];
      return x ? x.status + (x.nilai != null ? ' (' + x.nilai + ')' : '') : 'Belum Setor';
    }), [p.l + '/' + R.targets.length, R.targets.length ? Math.round(p.l / R.targets.length * 100) : 0])));
  }
  const csv = '﻿' + baris.map(r => r.map(bsCsvSel).join(',')).join('\r\n');
  const nama = 'rekap-bacaan-sholat-' + (mode === 'semua' ? 'semua-kelas' : String(bsState.kelas).replace(/\s+/g, '-')) + '-' + bsHariIni() + '.csv';
  try {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
  } catch (e) { toast('❌ Gagal membuat file: ' + ((e && e.message) || e), true); }
}

// ---------- Tab GRAFIK ----------
function bsPilihModeGrafik(m) { bsState.grafik = m; bsRender(); bsMuatAmalanIndividu(); }
function bsPilihSiswaGrafik(sk) { bsState.siswaSel = sk; bsRender(); bsMuatAmalanIndividu(); }
function bsMuatAmalanIndividu() {
  const sk = bsState.siswaSel; if (bsState.grafik !== 'individu' || !sk || bsState.amalanSiswa[sk]) return;
  if (!bsState.amalanGagal) bsState.amalanGagal = {};
  if (bsState.amalanGagal[sk]) return;                 // sudah gagal: jangan diulang otomatis (tekan Segarkan)
  if (!bsKunciMulai('amalan_' + sk)) return;           // permintaan yang sama masih berjalan
  bsMuatAmalanSiswa(sk, false).catch(e => { bsState.amalanGagal[sk] = true; bsState.err = 'Gagal memuat amalan di rumah: ' + ((e && e.message) || e); })
    .then(() => { bsKunciSelesai('amalan_' + sk); if (bsState.siswaSel === sk) bsRender(); });
}
// ---------- Rekap mingguan amalan rumah: 8 amalan lama dan 7 Kebiasaan DIHITUNG TERPISAH ----------
// "Hari terisi" tiap kelompok = hari yang punya minimal satu kunci kelompok itu (true/false). Hari yang hanya berisi kelompok lain
// tidak dihitung, jadi data lama (sebelum 7 Kebiasaan) tidak terbaca 0%. Persen = jumlah centang / (hari terisi x jumlah butir).
function bsRingkasPekan(amalanList) {
  const per = {};   // pekanKey -> { lama:{hari,centang,butir,lengkap5}, keb:{hari,centang,butir} }
  (amalanList || []).forEach(r => {
    if (!r || !r.tanggal) return;
    const it = r.items || {}, w = bsMingguKey(r.tanggal), uz = r.berhalangan === true;
    const x = per[w] || (per[w] = { lama: { hari: 0, centang: 0, butir: 0, lengkap5: 0, sakit: 0 }, keb: { hari: 0, centang: 0, butir: 0, sakit: 0 } });
    if (r.sakit === true) { x.lama.sakit++; x.keb.sakit++; return; }   // hari sakit: tidak masuk persen
    const h = bsHitungHari(it, uz);
    if (uz || BS_AMALAN.some(a => typeof it[a.k] === 'boolean')) {
      x.lama.hari++; x.lama.centang += h.lamaC; x.lama.butir += h.lamaN;
      if (!uz && BS_AMALAN.filter(a => a.wajib).every(a => it[a.k] === true)) x.lama.lengkap5++;
    }
    if (uz || BS_KEBIASAAN.some(a => typeof it[a.k] === 'boolean')) {
      x.keb.hari++; x.keb.centang += h.kebC; x.keb.butir += h.kebN;
    }
  });
  return per;
}
function bsHariSel(g, per7) { return g && g.hari ? g.hari + (per7 ? ' / 7' : '') + (g.sakit ? ' · 🤒 ' + g.sakit : '') : (g && g.sakit ? '🤒 ' + g.sakit + ' sakit' : '-'); }
function bsPersenRingkas(g, nButir) { return g && g.hari ? Math.round(g.centang / (g.butir || g.hari * nButir) * 100) : null; }
function bsDaftarPekanAmalan(n) {   // n pekan terakhir (pekan ini dulu), tanpa kunci ganda
  const h = bsHariIni(), out = [], seen = {};
  for (let i = 0; i < n * 2 && out.length < n; i++) {
    const tg = bsTambahHari(h, -7 * i), key = bsMingguKey(tg);
    if (!seen[key]) { seen[key] = true; out.push({ key, label: bsMingguLabel(tg) }); }
  }
  return out;
}
function bsSelPersen(p, warna) {
  return p == null ? '<span class="text-muted">-</span>' : `<div style="display:flex;align-items:center;gap:6px;min-width:110px;"><div style="flex:1;">${bsBarProgres(p, warna)}</div><span style="font-size:12px;min-width:34px;text-align:right;">${p}%</span></div>`;
}
// Kartu rekap mingguan satu siswa (dipakai di mode Individu)
function bsKartuRekapMingguan(amalan) {
  const per = bsRingkasPekan(amalan), pekan = bsDaftarPekanAmalan(8);
  const tbl = (judul, warna, kepala, isiBaris) => `<p style="font-weight:700;font-size:13px;margin:10px 0 6px;">${judul}</p><div style="overflow-x:auto;"><table><thead><tr><th>Pekan</th>${kepala}</tr></thead><tbody>${isiBaris}</tbody></table></div>`;
  const barisLama = pekan.map(w => { const g = (per[w.key] || {}).lama;
    return `<tr><td style="white-space:nowrap;">${bsEsc(w.label)}</td><td style="text-align:center;">${bsHariSel(g, true)}</td><td>${bsSelPersen(bsPersenRingkas(g, BS_AMALAN.length), '#2563eb')}</td><td style="text-align:center;">${g && g.hari ? g.lengkap5 : '-'}</td></tr>`; }).join('');
  const barisKeb = pekan.map(w => { const g = (per[w.key] || {}).keb;
    return `<tr><td style="white-space:nowrap;">${bsEsc(w.label)}</td><td style="text-align:center;">${bsHariSel(g, true)}</td><td>${bsSelPersen(bsPersenRingkas(g, BS_KEB7.length), '#d97706')}</td></tr>`; }).join('');
  return `<div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:2px;">📆 Rekap mingguan amalan di rumah</p>
    <p class="text-muted" style="font-size:11px;margin-bottom:4px;">8 pekan terakhir (Senin–Minggu). Persen = jumlah centang dibanding hari yang terisi orang tua. Dua kelompok dihitung terpisah.</p>
    ${tbl('🏡 Amalan (8 butir)', '#2563eb', '<th>Hari terisi</th><th>Rata-rata centang</th><th title="Hari sholat 5 waktu lengkap">5 waktu lengkap</th>', barisLama)}
    ${tbl('🌟 7 Kebiasaan (7 butir)', '#d97706', '<th>Hari terisi</th><th>Rata-rata centang</th>', barisKeb)}</div>`;
}
// Rekap mingguan per kelas: butuh amalan semua siswa aktif kelas; dimuat per siswa lalu disimpan di bsState.amalanSiswa (dipakai bersama mode Individu).
function bsMuatAmalanKelas(k) {
  const siswa = bsSiswaAktif(k); if (!siswa || !siswa.length) return;
  if (!bsState.amalanKelasGagal) bsState.amalanKelasGagal = {};
  if (bsState.amalanKelasGagal[k]) return;              // sudah gagal: jangan diulang otomatis (tekan Segarkan)
  const perlu = siswa.filter(x => !bsState.amalanSiswa[x.key]); if (!perlu.length) return;
  if (!bsKunciMulai('amalanKelas_' + k)) return;
  Promise.all(perlu.map(x => bsMuatAmalanSiswa(x.key, false)))
    .catch(e => { bsState.amalanKelasGagal[k] = true; bsState.err = 'Gagal memuat amalan kelas: ' + ((e && e.message) || e); })
    .then(() => { bsKunciSelesai('amalanKelas_' + k); if (bsState.kelas === k && bsState.tab === 'grafik' && bsState.grafik === 'amalan') bsRender(); });
}
function bsPilihPekanAmalan(key) { bsState.amalanPekan = key; bsRender(); }
function bsGrafikAmalanKelas(k, siswa) {
  const pekan = bsDaftarPekanAmalan(8);
  if (!pekan.some(w => w.key === bsState.amalanPekan)) bsState.amalanPekan = pekan[0].key;
  const sel = pekan.find(w => w.key === bsState.amalanPekan);
  const opsi = pekan.map((w, i) => `<option value="${bsEsc(w.key)}" ${w.key === sel.key ? 'selected' : ''}>${bsEsc(w.label)}${i === 0 ? ' (pekan ini)' : ''}</option>`).join('');
  const kepala = `<div style="max-width:420px;margin-bottom:10px;"><label class="label">Pekan</label><select class="field" onchange="bsPilihPekanAmalan(this.value)">${opsi}</select></div>`;
  const siap = siswa.every(x => bsState.amalanSiswa[x.key]);
  if (!siap) {
    bsMuatAmalanKelas(k);
    if (bsState.amalanKelasGagal && bsState.amalanKelasGagal[k]) return kepala + '<p style="font-size:13px;color:#b45309;">⚠️ Amalan kelas gagal dimuat. Tekan 🔄 Segarkan untuk mencoba lagi.</p>';
    const n = siswa.filter(x => bsState.amalanSiswa[x.key]).length;
    return kepala + `<p class="text-muted" style="font-size:13px;">⏳ Memuat amalan di rumah (${n}/${siswa.length} siswa)...</p>`;
  }
  const baris = siswa.map(x => ({ x, g: (bsRingkasPekan(bsState.amalanSiswa[x.key])[sel.key] || {}) }));
  const jum = (arr, f) => arr.reduce((t, r) => t + f(r), 0);
  const rata = (arr, pick, nButir) => { const hari = jum(arr, r => (pick(r) || { hari: 0 }).hari), butir = jum(arr, r => (pick(r) || { hari: 0, butir: 0 }).butir) || hari * nButir; return hari ? Math.round(jum(arr, r => (pick(r) || { centang: 0 }).centang) / butir * 100) : null; };
  const pLama = r => r.g.lama, pKeb = r => r.g.keb;
  const tr = baris.map(r => `<tr><td><a href="javascript:void(0)" onclick="bsPilihModeGrafik('individu');bsPilihSiswaGrafik('${bsEscJs(r.x.key)}')" style="color:#2563eb;text-decoration:none;">${bsEsc(r.x.name)}</a></td>
      <td style="text-align:center;background:#eff6ff;">${bsHariSel(r.g.lama, false)}</td><td style="background:#eff6ff;">${bsSelPersen(bsPersenRingkas(r.g.lama, BS_AMALAN.length), '#2563eb')}</td><td style="text-align:center;background:#eff6ff;">${r.g.lama && r.g.lama.hari ? r.g.lama.lengkap5 : '-'}</td>
      <td style="text-align:center;background:#fffbeb;">${bsHariSel(r.g.keb, false)}</td><td style="background:#fffbeb;">${bsSelPersen(bsPersenRingkas(r.g.keb, BS_KEB7.length), '#d97706')}</td></tr>`).join('');
  const nIsiLama = baris.filter(r => r.g.lama && r.g.lama.hari).length, nIsiKeb = baris.filter(r => r.g.keb && r.g.keb.hari).length;
  const ringkas = `<tr style="font-weight:700;"><td>Rata-rata kelas</td><td style="text-align:center;background:#eff6ff;" colspan="1">${nIsiLama}/${siswa.length} siswa</td><td style="background:#eff6ff;">${bsSelPersen(rata(baris, pLama, BS_AMALAN.length), '#2563eb')}</td><td style="background:#eff6ff;"></td><td style="text-align:center;background:#fffbeb;">${nIsiKeb}/${siswa.length} siswa</td><td style="background:#fffbeb;">${bsSelPersen(rata(baris, pKeb, BS_KEB7.length), '#d97706')}</td></tr>`;
  return kepala + `<div class="card" style="border:1px solid #e5e7eb;"><p style="font-weight:700;margin-bottom:2px;">🏡 Amalan di rumah · ${bsEsc(bsNamaKelas(k))} · ${bsEsc(sel.label)}</p>
    <p class="text-muted" style="font-size:11px;margin-bottom:8px;">Diisi orang tua. Persen = jumlah centang dibanding hari yang terisi; amalan 8 butir dan 7 Kebiasaan (7 butir) dihitung terpisah. "-" = belum diisi pekan ini.</p>
    <div style="overflow-x:auto;"><table><thead>
      <tr><th rowspan="2">Siswa</th><th colspan="3" style="text-align:center;background:#dbeafe;">🏡 Amalan (8 butir)</th><th colspan="2" style="text-align:center;background:#fef3c7;">🌟 7 Kebiasaan (7 butir)</th></tr>
      <tr><th style="background:#dbeafe;">Hari terisi</th><th style="background:#dbeafe;">Rata-rata centang</th><th style="background:#dbeafe;" title="Hari sholat 5 waktu lengkap">5 waktu lengkap</th><th style="background:#fef3c7;">Hari terisi</th><th style="background:#fef3c7;">Rata-rata centang</th></tr>
    </thead><tbody>${tr}${ringkas}</tbody></table></div></div>` + bsAmalanWaHtml(k, siswa);
}
// ---------- Ringkasan pekan untuk ORANG TUA dan MODE ANAK (hanya-baca; dihitung dari data yang sama dengan rekap guru) ----------
function bsPekanIni() { const h = bsHariIni(); return { ini: bsMingguKey(h), lalu: bsMingguKey(bsTambahHari(h, -7)), labelIni: bsMingguLabel(h), labelLalu: bsMingguLabel(bsTambahHari(h, -7)) }; }
// ---------- Kartu lipat (accordion) agar halaman Portal Orang Tua tidak panjang di HP ----------
// Bawaan TERTUTUP; ketuk judul untuk membuka. Status buka/tutup disimpan di bsLipatBuka sehingga
// tidak menutup sendiri saat kartu digambar ulang (mis. sesudah mencentang amalan atau ganti tanggal).
const bsLipatBuka = {};
const BS_IKON = {
  rumah: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  bintang: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  buku: '<path d="M12 6.5C10.4 5.3 8.3 4.8 4.8 4.8v13.4c3.5 0 5.6.5 7.2 1.7 1.6-1.2 3.7-1.7 7.2-1.7V4.8c-3.5 0-5.6.5-7.2 1.7z"/><path d="M12 6.5v13.4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  medali: '<circle cx="12" cy="9" r="5.5"/><path d="M8.7 13.4 7 21l5-2.6 5 2.6-1.7-7.6"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'
};
function bsLipat(kunci, ikon, warna, judul, ringkas, isi, gaya) {
  const buka = bsLipatBuka[kunci] === true;
  return `<div class="card bs-lipat" id="bsLp_${kunci}" style="margin-bottom:12px;padding:0;overflow:hidden;${gaya || ''}">
    <button type="button" class="bs-lipat-kepala" aria-expanded="${buka}" aria-controls="bsLpIsi_${kunci}" onclick="bsLipatToggle('${kunci}')" style="display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:10px 14px;background:transparent;border:0;color:inherit;text-align:left;cursor:pointer;font:inherit;-webkit-tap-highlight-color:transparent;">
      <span style="flex:none;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${warna}1f;color:${warna};"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BS_IKON[ikon] || ''}</svg></span>
      <span style="flex:1;min-width:0;"><span style="display:block;font-weight:700;font-size:14px;">${judul}</span><span class="text-muted" style="display:block;font-size:12px;margin-top:1px;">${ringkas}</span></span>
      <svg class="bs-lipat-panah" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;opacity:.55;transition:transform .2s;transform:rotate(${buka ? 180 : 0}deg);"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div id="bsLpIsi_${kunci}" style="display:${buka ? 'block' : 'none'};padding:2px 14px 14px;">${isi}</div></div>`;
}
function bsLipatToggle(kunci) {
  const buka = bsLipatBuka[kunci] !== true; bsLipatBuka[kunci] = buka;
  const isi = bsEl('bsLpIsi_' + kunci), kartu = bsEl('bsLp_' + kunci); if (!isi || !kartu) return;
  isi.style.display = buka ? 'block' : 'none';
  const kepala = kartu.querySelector('.bs-lipat-kepala'), panah = kartu.querySelector('.bs-lipat-panah');
  if (kepala) kepala.setAttribute('aria-expanded', String(buka));
  if (panah) panah.style.transform = 'rotate(' + (buka ? 180 : 0) + 'deg)';
}
function bsHtmlRingkasPekanOrtu(amalanList) {
  const per = bsRingkasPekan(amalanList), pk = bsPekanIni();
  const kolom = (judul, key) => { const x = per[key] || {}, a = x.lama, b = x.keb;
    const pa = bsPersenRingkas(a, BS_AMALAN.length), pb = bsPersenRingkas(b, BS_KEB7.length);
    return `<div style="flex:1;min-width:230px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;">
      <p style="font-weight:700;font-size:13px;margin-bottom:6px;">${bsEsc(judul)}</p>
      <p style="font-size:12px;margin-bottom:2px;">🏡 Amalan: ${a && a.hari ? '<strong>' + a.hari + '</strong> hari terisi · sholat 5 waktu lengkap <strong>' + a.lengkap5 + '</strong> hari' : '<span class="text-muted">belum ada isian</span>'}</p>${pa != null ? bsSelPersen(pa, '#2563eb') : ''}
      <p style="font-size:12px;margin:8px 0 2px;">🌟 7 Kebiasaan: ${b && b.hari ? '<strong>' + b.hari + '</strong> hari terisi' : '<span class="text-muted">belum ada isian</span>'}</p>${pb != null ? bsSelPersen(pb, '#d97706') : ''}</div>`; };
  return bsLipat('pekan', 'kalender', '#7c3aed', 'Ringkasan Pekan', 'Pekan ini · ' + bsEsc(pk.labelIni), `<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Persen = jumlah centang dibanding hari yang sudah diisi. Amalan dan 7 Kebiasaan dihitung terpisah.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">${kolom('Pekan ini · ' + pk.labelIni, pk.ini)}${kolom('Pekan lalu · ' + pk.labelLalu, pk.lalu)}</div>`);
}
function bsHtmlRingkasPekanAnak(amalanList) {
  const per = bsRingkasPekan(amalanList), pk = bsPekanIni(), x = per[pk.ini] || {}, a = x.lama, b = x.keb;
  const pb = bsPersenRingkas(b, BS_KEB7.length);
  return `<p style="font-size:14px;text-align:center;">${a && a.lengkap5 ? '🔥 Sholat 5 waktu lengkap <strong>' + a.lengkap5 + ' hari</strong>' : '💪 Ayo semangat sholat 5 waktu!'}</p>
    <p style="font-size:12px;text-align:center;margin:6px 0 2px;" class="text-muted">🌟 Kebiasaan hebat pekan ini</p>${pb != null ? bsBarProgres(pb, '#f59e0b') : '<p class="text-muted" style="font-size:12px;text-align:center;">Belum ada yang dicentang. Minta Ayah/Bunda mencentang ya!</p>'}`;
}

// ---------- Pengingat WhatsApp: orang tua yang belum mengisi checklist amalan (di mode Amalan Kelas) ----------
// Belum mengisi = tidak ada satu pun isian (amalan atau kebiasaan) pada hari ini dan 2 hari ke belakang (batas isi orang tua).
// Tanpa API/server & tanpa data baru di Firebase: tombol membuka wa.me; penanda "sudah dibuka" hanya di perangkat ini.
function bsAmalanWaPesanDefault() { return 'Assalamualaikum Bapak/Ibu wali murid {siswa}.\nPengingat dari {madrasah}: checklist amalan harian di rumah untuk {siswa} ({kelas}) belum terisi pada {waktu}.\nMohon dibantu mengisi lewat Portal Orang Tua. Orang tua bisa mengisi hari ini sampai 2 hari ke belakang. Terima kasih. 🙏'; }
function bsAmalanBelumIsi(amalanList, tgMulai, tgAkhir) {
  return !(amalanList || []).some(r => r && r.tanggal && r.tanggal >= tgMulai && r.tanggal <= tgAkhir && (r.berhalangan === true || r.sakit === true || BS_SEMUA_ITEM.some(a => typeof (r.items || {})[a.k] === 'boolean')));
}
function bsAmalanWaHtml(k, siswa) {
  const h = bsHariIni(), awal = bsTambahHari(h, -BS_HARI_ISI_MUNDUR);
  const wali = bsWaWali(k); if (!wali) return '';
  const belumSet = new Set(siswa.filter(x => bsAmalanBelumIsi(bsState.amalanSiswa[x.key], awal, h)).map(x => x.key));
  const rentang = bsFmtTgl(awal, true) + ' – ' + bsFmtTgl(h, true);
  const daftar = [];
  wali.daftar.forEach(d => { const idx = d.keys.map((sk, i) => belumSet.has(sk) ? i : -1).filter(i => i >= 0); if (!idx.length) return;
    daftar.push({ nomor: d.nomor, siswa: idx.map(i => d.siswa[i]), id: 'AM|' + h + '|' + d.nomor }); });
  const tanpaNomor = wali.tanpa.filter(nm => { const sx = siswa.find(x => x.name === nm); return sx && belumSet.has(sx.key); });
  bsState.amalanWaList = { kelas: k, waktu: rentang, daftar };
  if (!bsState.amalanWaPesan) bsState.amalanWaPesan = bsAmalanWaPesanDefault();
  const baris = daftar.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;"><span style="flex:1;min-width:160px;font-size:13px;font-weight:600;">${bsEsc(d.siswa.join(' & '))}</span>
      <span id="bsAWTag_${i}" class="text-muted" style="font-size:11px;">${bsWaSudah(d.id) ? '✔ WhatsApp sudah dibuka' : ''}</span>
      <button class="btn btn-success" style="padding:5px 12px;font-size:12px;" onclick="bsAmalanWaKirim(${i})">📲 Ingatkan</button></div>`).join('');
  return `<div class="card" style="border:1px solid #e5e7eb;margin-top:12px;"><p style="font-weight:700;margin-bottom:2px;">📲 Ingatkan orang tua yang belum mengisi</p>
    <p class="text-muted" style="font-size:11px;margin-bottom:8px;">Belum ada isian checklist pada ${bsEsc(rentang)} (hari ini dan ${BS_HARI_ISI_MUNDUR} hari ke belakang). Tombol membuka WhatsApp dengan pesan terisi; pengirim tinggal menekan Kirim. Penanda hanya berarti WhatsApp pernah dibuka di perangkat ini.</p>
    ${daftar.length ? baris : '<p style="font-size:13px;color:#047857;font-weight:600;">✅ Semua orang tua yang punya nomor WhatsApp sudah mengisi dalam 3 hari terakhir.</p>'}
    ${tanpaNomor.length ? `<p style="font-size:12px;color:#b45309;margin-top:8px;">⚠️ Belum mengisi dan tidak punya nomor WhatsApp wali (${tanpaNomor.length}): ${bsEsc(tanpaNomor.slice(0, 8).join(', '))}${tanpaNomor.length > 8 ? ', …' : ''}</p>` : ''}
    <details style="margin-top:10px;"><summary style="cursor:pointer;font-weight:600;font-size:13px;">✏️ Ubah isi pesan (opsional)</summary>
      <textarea class="field" rows="5" style="margin-top:6px;" oninput="bsState.amalanWaPesan=this.value">${bsEsc(bsState.amalanWaPesan)}</textarea>
      <p class="text-muted" style="font-size:11px;margin-top:4px;">Kata yang diganti otomatis: {siswa} {kelas} {waktu} {madrasah}.</p>
      <button class="btn btn-soft" style="padding:5px 12px;font-size:12px;margin-top:4px;" onclick="bsState.amalanWaPesan=bsAmalanWaPesanDefault();bsRender()">↩ Kembalikan pesan awal</button></details></div>`;
}
function bsAmalanWaKirim(i) {
  const ls = bsState.amalanWaList, d = ls && ls.daftar[i];
  if (!d || typeof kirimWA !== 'function') return;
  if (bsState.kelas !== ls.kelas) return toast('⚠️ Kelas berubah. Muat ulang daftar pengingat.', true);
  kirimWA(d.nomor, bsWaIsi(bsState.amalanWaPesan || bsAmalanWaPesanDefault(), { siswa: d.siswa.join(' & '), nama: d.siswa.join(' & '), kelas: bsNamaKelas(ls.kelas), waktu: ls.waktu, madrasah: bsWaMadrasah() }));
  bsWaTandai(d.id);
  const el = bsEl('bsAWTag_' + i); if (el) el.textContent = '✔ WhatsApp sudah dibuka';
}
function bsBodyGrafik() {
  const k = bsState.kelas;
  if (!k) return '<p class="text-muted">Belum ada kelas yang bisa dipilih.</p>';
  const targets = bsTargetUntukKelas(bsState.targets, k), siswa = bsSiswaAktif(k);
  if (!targets.length) return '<p class="text-muted" style="font-size:13px;">Belum ada target aktif untuk kelas ini.</p>';
  if (!siswa || !bsState.setoran[k]) return '<p class="text-muted" style="padding:10px;">⏳ Memuat data...</p>';
  if (!siswa.length) return '<p class="text-muted">Belum ada siswa di kelas ini.</p>';
  const sw = `<div style="display:flex;gap:6px;margin-bottom:12px;">
    <button class="btn ${bsState.grafik === 'klasikal' ? 'btn-primary' : 'btn-soft'}" style="padding:7px 14px;" onclick="bsPilihModeGrafik('klasikal')">👥 Klasikal</button>
    <button class="btn ${bsState.grafik === 'individu' ? 'btn-primary' : 'btn-soft'}" style="padding:7px 14px;" onclick="bsPilihModeGrafik('individu')">🧒 Individu</button>
    <button class="btn ${bsState.grafik === 'amalan' ? 'btn-primary' : 'btn-soft'}" style="padding:7px 14px;" onclick="bsPilihModeGrafik('amalan')">🏡 Amalan Kelas</button></div>`;
  return sw + (bsState.grafik === 'individu' ? bsGrafikIndividu(k, targets, siswa) : bsState.grafik === 'amalan' ? bsGrafikAmalanKelas(k, siswa) : bsGrafikKlasikal(k, targets, siswa));
}
function bsGrafikKlasikal(k, targets, siswa) {
  const setoran = bsState.setoran[k];
  const perTarget = targets.map(t => {
    let l = 0, r = 0; siswa.forEach(s => { const x = setoran[bsKunciSetoran(t.key, s.key)]; if (x && x.status === 'Lulus') l++; else if (x && x.status === 'Remedial') r++; });
    return { t, l, r, b: siswa.length - l - r };
  });
  const perSiswa = siswa.map(s => { let l = 0; targets.forEach(t => { const x = setoran[bsKunciSetoran(t.key, s.key)]; if (x && x.status === 'Lulus') l++; }); return { s, l }; }).sort((a, b) => b.l - a.l || bsCmp(a.s.name, b.s.name));
  const totalSel = siswa.length * targets.length, totalLulus = perTarget.reduce((a, p) => a + p.l, 0);
  const pct = totalSel ? Math.round(totalLulus / totalSel * 100) : 0;
  const perPekan = {};
  targets.forEach(t => siswa.forEach(s => { const x = setoran[bsKunciSetoran(t.key, s.key)]; if (x && x.status === 'Lulus' && x.tanggal) { const w = bsMingguKey(x.tanggal); perPekan[w] = (perPekan[w] || 0) + 1; } }));
  let cum = 0; const garis = Object.keys(perPekan).sort().map(w => { cum += perPekan[w]; return { label: bsMingguSingkat(w), nilai: totalSel ? Math.round(cum / totalSel * 100) : 0 }; });
  const barTarget = perTarget.map(p => `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;"><span><strong>${bsEsc((p.t.urutan || '') + '. ' + p.t.nama)}</strong></span><span class="text-muted" style="font-size:12px;white-space:nowrap;">${p.l}/${siswa.length} lulus (${siswa.length ? Math.round(p.l / siswa.length * 100) : 0}%)${p.r ? ' · ' + p.r + ' remedial' : ''}</span></div>
      ${bsBarTumpuk(p.l, p.r, p.b)}</div>`).join('');
  const barSiswa = perSiswa.map(p => `<div style="display:grid;grid-template-columns:minmax(90px,1.3fr) 2fr auto;gap:8px;align-items:center;font-size:13px;margin-bottom:6px;">
      <a href="javascript:void(0)" onclick="bsPilihModeGrafik('individu');bsPilihSiswaGrafik('${bsEscJs(p.s.key)}')" style="color:#2563eb;text-decoration:none;">${bsEsc(p.s.name)}</a>
      ${bsBarProgres(targets.length ? p.l / targets.length * 100 : 0)}<span class="text-muted" style="font-size:12px;">${p.l}/${targets.length}</span></div>`).join('');
  return `<div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
        <div><div style="font-size:22px;font-weight:800;">${siswa.length}</div><div class="text-muted" style="font-size:11px;">Siswa</div></div>
        <div><div style="font-size:22px;font-weight:800;">${targets.length}</div><div class="text-muted" style="font-size:11px;">Target</div></div>
        <div><div style="font-size:22px;font-weight:800;color:#059669;">${pct}%</div><div class="text-muted" style="font-size:11px;">Ketuntasan kelas</div></div>
      </div></div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">📊 Ketuntasan per target</p>
      <div style="font-size:11px;margin-bottom:8px;" class="text-muted"><span style="color:#059669;">■</span> Lulus &nbsp;<span style="color:#d97706;">■</span> Remedial &nbsp;<span style="color:#9ca3af;">■</span> Belum Setor</div>${barTarget}</div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">📈 Perkembangan ketuntasan kelas per pekan (kumulatif %)</p>${bsSvgGaris(garis, { maks: 100, satuan: '%', judul: 'Ketuntasan kelas per pekan' })}</div>
    <div class="card" style="border:1px solid #e5e7eb;"><p style="font-weight:700;margin-bottom:4px;">🧒 Progres per siswa</p><p class="text-muted" style="font-size:11px;margin-bottom:8px;">Ketuk nama untuk melihat grafik individu.</p>${barSiswa}</div>`;
}
function bsGrafikIndividu(k, targets, siswa) {
  if (!siswa.some(s => s.key === bsState.siswaSel)) bsState.siswaSel = siswa[0].key;
  const sk = bsState.siswaSel, s = siswa.find(x => x.key === sk), setoran = bsState.setoran[k];
  const opsi = siswa.map(x => `<option value="${bsEsc(x.key)}" ${x.key === sk ? 'selected' : ''}>${bsEsc(x.name)}</option>`).join('');
  const semuaT = bsTargetUntukKelas(bsState.targets, k, true);
  const byTarget = {}; semuaT.forEach(t => { const x = setoran[bsKunciSetoran(t.key, sk)]; if (x) byTarget[t.key] = x; });
  const amalan = bsState.amalanSiswa[sk];
  if (!amalan) bsMuatAmalanIndividu();
  const game = bsHitungGame(targets, byTarget, amalan || [], null, semuaT);
  const lulusUrut = Object.values(byTarget).filter(x => x.status === 'Lulus' && x.tanggal).sort((a, b) => bsCmp(a.tanggal, b.tanggal));
  const garis = []; lulusUrut.forEach((x, i) => { const last = garis[garis.length - 1]; const lb = bsFmtTgl(x.tanggal, true); if (last && last.label === lb) last.nilai = i + 1; else garis.push({ label: lb, nilai: i + 1 }); });
  const tabel = targets.map(t => { const x = byTarget[t.key]; return `<tr><td>${bsEsc((t.urutan || '') + '. ' + t.nama)}</td><td>${bsChip(x ? x.status : 'Belum Setor')}</td><td style="text-align:center;">${x && x.nilai != null ? bsEsc(x.nilai) : '-'}</td><td style="text-align:center;">${x ? bsEsc(x.percobaan || 1) : '-'}</td><td>${x ? bsEsc(bsFmtTgl(x.tanggal, true)) : '-'}</td><td style="font-size:12px;">${x ? bsEsc((x.alasan ? '[' + x.alasan + '] ' : '') + (x.catatan || '')) : ''}</td></tr>`; }).join('');
  let rumah = (bsState.amalanGagal && bsState.amalanGagal[sk]) ? '<p style="font-size:13px;color:#b45309;">⚠️ Amalan di rumah gagal dimuat. Tekan 🔄 Segarkan untuk mencoba lagi.</p>' : '<p class="text-muted" style="font-size:13px;">⏳ Memuat amalan di rumah...</p>';
  if (amalan) {
    const h = bsHariIni(), peta = {}; amalan.forEach(r => { peta[r.tanggal] = r.items || {}; });
    const hari = []; for (let i = 13; i >= 0; i--) hari.push(bsTambahHari(h, -i));
    const sel = hari.map(tg => { const it = peta[tg]; const n = it ? BS_AMALAN.filter(a => it[a.k] === true).length : -1;
      const warna = n < 0 ? '#f3f4f6' : n === 0 ? '#fecaca' : n < BS_AMALAN.length ? '#fde68a' : '#86efac';
      return `<div title="${bsEsc(bsFmtTgl(tg))}: ${n < 0 ? 'belum diisi' : n + '/' + BS_AMALAN.length + ' amalan'}" style="flex:1;min-width:18px;height:28px;border-radius:6px;background:${warna};display:flex;align-items:center;justify-content:center;font-size:10px;color:#374151;">${n < 0 ? '' : n}</div>`; }).join('');
    const isi = hari.filter(tg => peta[tg]);
    const perItem = BS_AMALAN.map(a => { const n = isi.filter(tg => peta[tg][a.k] === true).length; const p = isi.length ? Math.round(n / isi.length * 100) : 0;
      return `<div style="display:grid;grid-template-columns:minmax(110px,1.2fr) 2fr auto;gap:8px;align-items:center;font-size:12px;margin-bottom:5px;"><span>${a.e} ${bsEsc(a.nama)}</span>${bsBarProgres(p, '#2563eb')}<span class="text-muted">${p}%</span></div>`; }).join('');
    const adaKeb = it => !!it && BS_KEBIASAAN.some(a => typeof it[a.k] === 'boolean');
    const isiKeb = hari.filter(tg => adaKeb(peta[tg]));
    const selKeb = hari.map(tg => { const it = peta[tg]; const n = adaKeb(it) ? bsKebJumlah(it) : -1;
      const warna = n < 0 ? '#f3f4f6' : n === 0 ? '#fecaca' : n < BS_KEB7.length ? '#fde68a' : '#86efac';
      return `<div title="${bsEsc(bsFmtTgl(tg))}: ${n < 0 ? 'belum diisi' : n + '/' + BS_KEB7.length + ' kebiasaan'}" style="flex:1;min-width:18px;height:28px;border-radius:6px;background:${warna};display:flex;align-items:center;justify-content:center;font-size:10px;color:#374151;">${n < 0 ? '' : n}</div>`; }).join('');
    const perKeb = BS_KEB7.map(a => { const n = isiKeb.filter(tg => bsKebNilai(a, peta[tg])).length; const p = isiKeb.length ? Math.round(n / isiKeb.length * 100) : 0;
      return `<div style="display:grid;grid-template-columns:minmax(110px,1.2fr) 2fr auto;gap:8px;align-items:center;font-size:12px;margin-bottom:5px;"><span>${a.e} ${bsEsc(a.nama)}</span>${bsBarProgres(p, '#d97706')}<span class="text-muted">${p}%</span></div>`; }).join('');
    const blokKeb = `<p style="font-weight:700;font-size:13px;margin:14px 0 6px;">🌟 7 Kebiasaan (terpisah dari poin &amp; lencana)</p><div style="display:flex;gap:3px;margin-bottom:4px;">${selKeb}</div><p class="text-muted" style="font-size:11px;margin-bottom:8px;">14 hari terakhir (angka = jumlah kebiasaan dari ${BS_KEB7.length}; abu-abu = belum diisi). Terisi ${isiKeb.length} dari 14 hari.</p>${perKeb}`;
    rumah = `<div style="display:flex;gap:3px;margin-bottom:4px;">${sel}</div><p class="text-muted" style="font-size:11px;margin-bottom:8px;">14 hari terakhir (angka = jumlah amalan dari ${BS_AMALAN.length}; abu-abu = belum diisi orang tua). Terisi ${isi.length} dari 14 hari.</p>${perItem}${blokKeb}`;
  }
  return `<div style="max-width:420px;margin-bottom:12px;"><label class="label">Siswa</label><select class="field" onchange="bsPilihSiswaGrafik(this.value)">${opsi}</select></div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;">
      <p style="font-weight:700;">${bsEsc(s.name)} <span class="text-muted" style="font-weight:400;font-size:12px;">· ${bsEsc(bsNamaKelas(k))}</span></p>
      <p style="font-size:13px;margin:6px 0;">${game.level.e} Level ${game.level.no} — <strong>${bsEsc(game.level.nama)}</strong> · ⭐ ${game.poin} poin · 🎯 ${game.lulus}/${game.nTarget} target lulus</p>
      ${bsBarProgres(game.nTarget ? game.lulus / game.nTarget * 100 : 0)}</div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">📈 Perkembangan hafalan (jumlah target lulus)</p>${bsSvgGaris(garis, { maks: targets.length, judul: 'Perkembangan hafalan siswa' })}</div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">📋 Status per target</p><div style="overflow-x:auto;"><table><thead><tr><th>Bacaan</th><th>Status</th><th>Nilai</th><th>Percobaan</th><th>Tanggal</th><th>Catatan</th></tr></thead><tbody>${tabel}</tbody></table></div></div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">🏡 Amalan di rumah (diisi orang tua)</p>${rumah}</div>
    ${amalan ? bsKartuRekapMingguan(amalan) : ''}
    <div class="card" style="border:1px solid #e5e7eb;"><p style="font-weight:700;margin-bottom:4px;">🏅 Lencana</p>${bsHtmlLencana(game.badges, false)}</div>`;
}

// ============================================================
// 2) AKSES ORANG TUA (disambung dari renderPortalOrtuDashboard di app.js)
// ============================================================
let bsOrtu = { token: 0, siswa: null, targets: [], semua: [], setoran: {}, amalan: {}, uzur: {}, sakit: {}, tgl: '', err: '' };

function bsOrtuRender(siswa) {
  const content = bsEl('portalOrtuContent');
  if (!content || !siswa || typeof db === 'undefined') return;
  const lama = bsEl('bsOrtuBox'); if (lama) lama.remove();
  try { bsAnakTutup(); } catch (e) { /* tidak ada overlay */ }
  const box = document.createElement('div'); box.id = 'bsOrtuBox';
  const pertama = bsEl('poRingkas') || content.firstElementChild;   // Ringkasan satu layar (portal-ortu.js) tetap di atas kotak ini
  if (pertama && pertama.nextSibling) content.insertBefore(box, pertama.nextSibling); else content.appendChild(box);
  bsOrtuMuat(siswa);
}
let bsOrtuSiswaTerakhir = null;
function bsOrtuCobaLagi() { if (bsOrtuSiswaTerakhir) bsOrtuMuat(bsOrtuSiswaTerakhir); }
function bsOrtuMuat(siswa) {
  const my = ++bsOrtu.token, ta = bsTA(), box = bsEl('bsOrtuBox');
  bsOrtuSiswaTerakhir = siswa;
  if (box) box.innerHTML = '<div class="card" style="margin-bottom:12px;"><p class="text-muted" style="text-align:center;padding:10px;">⏳ Memuat amalan &amp; bacaan sholat...</p></div>';
  // Jaringan lambat: setelah 8 dtk beri tahu pengguna + tombol coba lagi (pemuatan lama tetap berjalan).
  const lambat = setTimeout(() => {
    if (my !== bsOrtu.token) return;
    const b = bsEl('bsOrtuBox'); if (!b || !/Memuat amalan/.test(b.textContent || '')) return;
    b.innerHTML = '<div class="card" style="margin-bottom:12px;"><p class="text-muted" style="text-align:center;padding:10px;">⏳ Koneksi terasa lambat, masih memuat... <button class="btn btn-soft" style="padding:3px 10px;font-size:12px;margin-left:6px;" onclick="bsOrtuCobaLagi()">🔄 Coba lagi</button></p></div>';
  }, 8000);
  Promise.all([
    db.ref('bs_target').orderByChild('tahunAjaran').equalTo(ta).once('value'),
    db.ref('bs_setoran').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
    bsQueryAmalan(siswa.key, ta)
  ]).then(([ts, ss, as]) => {
    clearTimeout(lambat);
    if (my !== bsOrtu.token) return;
    const targets = [], semua = []; ts.forEach(c => { const v = c.val() || {}; if (v.kelas === '*' || v.kelas === siswa.kelas) { v.key = c.key; semua.push(v); if (v.aktif !== false) targets.push(v); } });
    targets.sort(bsBandingTarget);
    const setoran = {}; ss.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === ta && v.targetId) setoran[v.targetId] = v; });
    const amalan = {}, uzur = {}, sakit = {}; as.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === ta && v.siswaKey === siswa.key && v.tanggal) { amalan[v.tanggal] = v.items || {}; if (v.berhalangan === true) uzur[v.tanggal] = true; if (v.sakit === true) sakit[v.tanggal] = true; } });
    bsOrtu = { token: my, siswa, targets, semua, setoran, amalan, uzur, sakit, madrasah: {}, tgl: bsHariIni(), err: '' };
    bsOrtuGambar();
    // Dhuha/Dzuhur di madrasah dimuat SETELAH kotak tampil (tidak menahan layar); gagal = tampil seperti biasa tanpa centang otomatis.
    bsMadrasahMuat(siswa, ta).then(md => { if (my === bsOrtu.token) { bsOrtu.madrasah = md || {}; bsOrtuGambar(); } })
      .catch(e => console.warn('[SI MAMBA] Dhuha/Dzuhur madrasah (amalan rumah) tidak dimuat:', e && e.message || e));
  }).catch(err => {
    clearTimeout(lambat);
    if (my !== bsOrtu.token) return;
    if (typeof poIsiUbin === 'function') { poIsiUbin('poRingkasAmalan', '-', '#6b7280', 'Gagal memuat', ''); poIsiUbin('poRingkasHafalan', '-', '#6b7280', 'Gagal memuat', ''); }
    const b = bsEl('bsOrtuBox');
    if (b) b.innerHTML = `<div class="card" style="margin-bottom:12px;"><p style="color:#dc2626;font-size:13px;">Gagal memuat Bacaan Sholat: ${bsEsc((err && err.message) || err)} <button class="btn btn-soft" style="padding:3px 10px;font-size:12px;margin-left:6px;" onclick="bsOrtuCobaLagi()">🔄 Coba lagi</button></p></div>`;
  });
}
// Isi dua kotak Ringkasan (Amalan hari ini & Hafalan) di dashboard Portal Orang Tua; kotaknya dibuat js/portal-ortu.js.
function bsRingkasKePortal(game, o, h) {
  if (typeof poIsiUbin !== 'function') return;
  const ada = !!o.amalan[h], it = bsItemsEfektif(o, h), uz = (o.uzur || {})[h] === true, sk = (o.sakit || {})[h] === true, hh = bsHitungHari(it, uz), n = hh.lamaC, tot = hh.lamaN;
  const ik = nm => typeof poIkon === 'function' ? poIkon(nm, 12) + ' ' : '';
  poIsiUbin('poRingkasAmalan', n + ' / ' + tot, !ada ? '#6b7280' : n === tot ? '#059669' : '#d97706',
    uz ? ik('daun') + 'Berhalangan sholat' : sk ? ik('termo') + 'Sakit (tidak dihitung)' : !ada ? 'Belum diisi hari ini' : (game.rentetanLimaWaktu >= 2 ? ik('api') + game.rentetanLimaWaktu + ' hari sholat lengkap' : bsKebJumlah(it) + ' dari ' + BS_KEB7.length + ' kebiasaan'));
  if (!o.targets.length) { poIsiUbin('poRingkasHafalan', 'Belum ada target', '#6b7280', 'Guru belum membuat target bacaan', ''); return; }
  const persen = game.nTarget ? Math.round(game.lulus / game.nTarget * 100) : 0, berikut = bsOrtuTargetBerikut();
  poIsiUbin('poRingkasHafalan', game.lulus + ' dari ' + game.nTarget + ' lulus', persen >= 100 ? '#059669' : '#2563eb',
    persen + '% · ' + (berikut ? 'berikutnya: ' + bsEsc(berikut.nama) : 'semua target lulus'), bsBarProgres(persen));
}
// ---------- Dhuha & Dzuhur yang dikerjakan di MADRASAH -> tercentang otomatis di amalan rumah ----------
// Hanya tampilan & hitungan poin/rentetan di Portal Ortu & Mode Anak (data amalan rumah yang tersimpan TIDAK diubah, jadi pengingat "belum diisi"
// dan rekap guru tetap berdasarkan isian orang tua). Sumber: absensi Dhuha/Dzuhur anak ini (status Hadir) lewat kunci pasti
// activity_attendance_v4/<jenisKey>_<tanggal>_<siswaKey>. Dhuha Senin-Sabtu, Dzuhur Senin-Kamis (kelas yang tidak ikut Dzuhur dilewati).
// Hari lama disimpan di localStorage; 7 hari terakhir selalu dibaca ulang supaya koreksi guru ikut.
const BS_MADRASAH_HARI = { dhuha: [1, 2, 3, 4, 5, 6], dzuhur: [1, 2, 3, 4] };
const BS_MADRASAH_SEGAR_HARI = 8;
function bsMadrasahJenis(nama) {
  const n = String(nama || '').toLowerCase();
  if (/dluha|dhuha|duha/.test(n)) return 'dhuha';
  if (/dluhur|dhuhur|duhur|dzuhur|zuhur/.test(n)) return 'dzuhur';
  return null;
}
function bsMadrasahMuat(siswa, ta) {
  if (!siswa || !siswa.key || typeof db === 'undefined') return Promise.resolve({});
  const m = /^(\d{4})\/(\d{4})$/.exec(String(ta || ''));
  const hari = bsHariIni(), mulai = m ? m[1] + '-07-01' : bsTambahHari(hari, -60);
  const kunci = 'mamba_bs_madrasah_v1_' + siswa.key + '_' + (ta || '');
  let cache = {}; try { cache = JSON.parse(localStorage.getItem(kunci) || '{}') || {}; } catch (e) { cache = {}; }
  const hasil = (cache.d && typeof cache.d === 'object') ? cache.d : {};
  const dari = (cache.cek && cache.cek >= mulai) ? bsTambahHari(cache.cek, 1) : mulai;
  if (dari > hari) return Promise.resolve(hasil);
  return db.ref('activity_types_v4').once('value').then(sn => {
    const tipe = { dhuha: [], dzuhur: [] }, kelas = String(siswa.kelas || '').trim();
    sn.forEach(c => {
      const v = c.val() || {}, j = bsMadrasahJenis(v.name); if (!j) return;
      const raw = v.kelasTidakIkut;
      const kec = raw === '-' ? [] : !raw ? (j === 'dzuhur' ? ['Kelas 1', 'Kelas 2'] : [])
        : (Array.isArray(raw) ? raw : (typeof raw === 'object' ? Object.keys(raw).map(k => raw[k]) : String(raw).split('|'))).map(x => String(x).trim()).filter(Boolean);
      if (!kec.some(x => x === kelas || ('Kelas ' + x) === kelas)) tipe[j].push(c.key);
    });
    const tugas = [];
    for (let tg = dari; tg <= hari; tg = bsTambahHari(tg, 1)) {
      delete hasil[tg];   // hari yang dibaca ulang dihitung dari nol
      const hr = bsTglParse(tg).getDay();
      ['dhuha', 'dzuhur'].forEach(j => { if (!BS_MADRASAH_HARI[j].includes(hr)) return; tipe[j].forEach(k => tugas.push({ tg, j, id: k + '_' + tg + '_' + siswa.key })); });
    }
    let ditolak = 0, selesai = Promise.resolve();
    for (let i = 0; i < tugas.length; i += 30) {
      const bagian = tugas.slice(i, i + 30);
      selesai = selesai.then(() => Promise.all(bagian.map(t => db.ref('activity_attendance_v4/' + t.id).once('value').then(x => {
        const rec = x.val(), st = rec && String(rec.status || '').trim().toLowerCase();
        if (st === 'h' || st === 'hadir') (hasil[t.tg] = hasil[t.tg] || {})[t.j] = true;
      }).catch(() => { ditolak++; }))));
    }
    return selesai.then(() => {
      if (tugas.length && ditolak === tugas.length) throw new Error('pembacaan absensi madrasah ditolak (cek Rules activity_attendance_v4)');
      try { localStorage.setItem(kunci, JSON.stringify({ d: hasil, cek: bsTambahHari(hari, -BS_MADRASAH_SEGAR_HARI) })); } catch (e) { /* penyimpanan penuh/dimatikan */ }
      return hasil;
    });
  });
}
function bsMadrasahDi(o, tg) { return ((o && o.madrasah) || {})[tg] || {}; }
function bsItemsEfektif(o, tg) { return Object.assign({}, ((o && o.amalan) || {})[tg] || {}, bsMadrasahDi(o, tg)); }
function bsOrtuDaftarAmalan() { return Object.keys(Object.assign({}, bsOrtu.amalan, bsOrtu.madrasah || {})).map(tg => ({ tanggal: tg, items: bsItemsEfektif(bsOrtu, tg), berhalangan: (bsOrtu.uzur || {})[tg] === true, sakit: (bsOrtu.sakit || {})[tg] === true })); }
// Pengingat di dalam Portal Orang Tua: hari (hari ini sampai BS_HARI_ISI_MUNDUR hari ke belakang) yang belum ada isian sama sekali.
// Hari ini baru dianggap belum diisi sesudah BS_PENGINGAT_JAM (jam perangkat); hari-hari sebelumnya selalu. Berhalangan/sakit dihitung sudah diisi.
const BS_PENGINGAT_JAM = 16;
let bsOrtuHkBuka = false;   // menu "Berhalangan sholat atau sakit?" dibuka orang tua
let bsOrtuTunda = '';   // "kunciSiswa|tanggal" bila orang tua menekan Nanti (hanya selama halaman ini terbuka)
function bsHariTerisi(o, tg) {
  const it = (o.amalan || {})[tg];
  return (o.uzur || {})[tg] === true || (o.sakit || {})[tg] === true || !!(it && BS_SEMUA_ITEM.some(a => typeof it[a.k] === 'boolean'));
}
function bsOrtuHariBelumIsi(o, h, jam) {   // paling lama dulu (paling cepat kedaluwarsa)
  const out = [];
  for (let n = BS_HARI_ISI_MUNDUR; n >= 0; n--) {
    if (n === 0 && jam < BS_PENGINGAT_JAM) continue;
    const tg = bsTambahHari(h, -n); if (!bsHariTerisi(o, tg)) out.push({ tg, n });
  }
  return out;
}
function bsOrtuTundaPengingat() { bsOrtuTunda = (bsOrtu.siswa ? bsOrtu.siswa.key : '') + '|' + bsHariIni(); bsOrtuGambar(); }
function bsOrtuIsiSekarang(tg) {
  bsOrtu.tgl = tg; bsLipatBuka.amalan = true; bsOrtuGambar();
  const el = bsEl('bsLp_amalan'); if (!el) return;
  try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
}
function bsOrtuTargetBerikut() { return bsOrtu.targets.find(t => !(bsOrtu.setoran[t.key] && bsOrtu.setoran[t.key].status === 'Lulus')) || null; }
function bsTglBolehIsi(tgl) { const h = bsHariIni(); return tgl <= h && bsSelisihHari(tgl, h) <= BS_HARI_ISI_MUNDUR; }
function bsOrtuGambar() {
  const box = bsEl('bsOrtuBox'); if (!box || !bsOrtu.siswa) return;
  const o = bsOrtu, h = bsHariIni();
  const game = bsHitungGame(o.targets, o.setoran, bsOrtuDaftarAmalan(), h, o.semua);
  try { bsRingkasKePortal(game, o, h); } catch (e) { console.warn('[SI MAMBA] Ringkasan portal gagal:', e); }
  const tglOps = [0, 1, 2].map(n => { const tg = bsTambahHari(h, -n); return `<button class="btn ${o.tgl === tg ? 'btn-primary' : 'btn-soft'}" style="padding:4px 10px;font-size:12px;min-height:32px;" onclick="bsOrtuPilihTgl('${tg}')">${n === 0 ? 'Hari ini' : n === 1 ? 'Kemarin' : '2 hari lalu'}</button>`; }).join('');
  if (bsLipatBuka.amalan === undefined) bsLipatBuka.amalan = true;   // kartu Amalan langsung terbuka; 7 Kebiasaan tertutup supaya halaman tidak terlalu panjang di HP
  const items = bsItemsEfektif(o, o.tgl), kr = bsMadrasahDi(o, o.tgl);
  const uzur = (o.uzur || {})[o.tgl] === true, sakit = (o.sakit || {})[o.tgl] === true, hh = bsHitungHari(items, uzur);
  const nCek = hh.lamaC, nKeb = hh.kebC;
  const tileLibur = (a, teks) => `<div style="display:flex;align-items:center;gap:6px;min-height:48px;padding:6px 10px;border-radius:12px;font-size:13px;font-weight:600;line-height:1.2;border:2px dashed #99f6e4;background:#f0fdfa;color:#6b7280;"><span style="font-size:20px;opacity:.55;">${a.e}</span><span style="flex:1;min-width:0;">${bsEsc(a.t)}<span style="display:block;font-size:10.5px;font-weight:400;">${teks}</span></span><span style="font-size:16px;">🌿</span></div>`;
  const tombol = a => { if (uzur && a.wajib) return tileLibur(a, 'Berhalangan'); const on = items[a.k] === true;
    return `<button type="button" onclick="bsOrtuToggle('${a.k}')" aria-pressed="${on}" style="display:flex;align-items:center;gap:6px;text-align:left;min-height:48px;padding:6px 10px;border-radius:12px;font:inherit;font-size:13px;font-weight:600;line-height:1.2;cursor:pointer;border:2px solid ${on ? '#059669' : '#d1d5db'};background:${on ? '#d1fae5' : '#fff'};color:#111827;-webkit-tap-highlight-color:transparent;">
      <span style="font-size:20px;">${a.e}</span><span style="flex:1;min-width:0;">${bsEsc(a.t)}</span><span style="font-size:16px;">${on ? '✅' : '⬜'}</span></button>`; };
  const ubin = a => { if (uzur && a.k === '_ibadah') return tileLibur(a, 'Berhalangan sholat'); const on = bsKebNilai(a, items);
    return `<div style="display:flex;align-items:center;gap:6px;min-height:48px;padding:6px 10px;border-radius:12px;font-size:13px;font-weight:600;line-height:1.2;border:2px dashed ${on ? '#059669' : '#d1d5db'};background:${on ? '#ecfdf5' : '#f9fafb'};color:#111827;">
      <span style="font-size:20px;">${a.e}</span><span style="flex:1;min-width:0;"><span style="display:block;">${bsEsc(a.t)}</span><span class="text-muted" style="display:block;font-size:10.5px;font-weight:400;">${bsEsc(a.oto)}</span></span><span style="font-size:16px;">${on ? '✅' : '⬜'}</span></div>`; };
  const limaLengkap = BS_AMALAN.filter(a => a.wajib).every(a => items[a.k] === true);
  const tombolUzur = `<button type="button" onclick="bsOrtuBerhalangan()" aria-pressed="${uzur}" style="display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin-top:8px;padding:6px 10px;border-radius:12px;font:inherit;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border:2px solid ${uzur ? '#0d9488' : '#d1d5db'};background:${uzur ? '#ccfbf1' : '#fff'};color:#111827;-webkit-tap-highlight-color:transparent;"><span style="font-size:18px;">🌿</span><span style="flex:1;min-width:0;">Berhalangan sholat pada tanggal ini<span class="text-muted" style="display:block;font-size:11px;font-weight:400;">Khusus haid atau kondisi lain yang membuat tidak boleh sholat. Yang sakit atau bepergian tetap sholat dengan keringanan, centang saja.</span></span><span style="font-size:16px;">${uzur ? '✅' : '⬜'}</span></button>`;
  const tombolSakit = `<button type="button" onclick="bsOrtuSakit()" aria-pressed="${sakit}" style="display:flex;align-items:center;gap:8px;width:100%;min-height:44px;margin-top:8px;padding:6px 10px;border-radius:12px;font:inherit;font-size:13px;font-weight:600;text-align:left;cursor:pointer;border:2px solid ${sakit ? '#d97706' : '#d1d5db'};background:${sakit ? '#fef3c7' : '#fff'};color:#111827;-webkit-tap-highlight-color:transparent;"><span style="font-size:18px;">🤒</span><span style="flex:1;min-width:0;">Anak sakit pada tanggal ini<span class="text-muted" style="display:block;font-size:11px;font-weight:400;">Seluruh hari tidak dihitung di persen dan tidak memutus rentetan. Yang sudah dicentang tetap dapat poin.</span></span><span style="font-size:16px;">${sakit ? '✅' : '⬜'}</span></button>`;
  const rentang = (bidang, st) => { const ts = [0, 1, 2].map(n => bsTambahHari(h, -n)).filter(bsTglBolehIsi), semua = ts.length > 0 && ts.every(t => (o[st] || {})[t] === true);
    return `<button type="button" class="btn btn-soft" style="width:100%;margin-top:4px;padding:3px 10px;font-size:12px;min-height:32px;" onclick="bsOrtuTandaiRentang('${bidang}','${st}')">${semua ? '↩️ Batalkan ' + ts.length + ' hari terakhir' : '☑️ Tandai ' + ts.length + ' hari terakhir sekaligus'}</button>`; };
  const labelHari = x => x.n === 0 ? 'Hari ini' : x.n === 1 ? 'Kemarin' : x.n + ' hari lalu';
  const belum = bsOrtuTunda === ((o.siswa.key || '') + '|' + h) ? [] : bsOrtuHariBelumIsi(o, h, new Date().getHours());
  const pengingat = belum.length ? `<div id="bsOrtuPengingat" class="card" style="margin-bottom:8px;padding:8px 12px;border:1px solid #fcd34d;background:#fffbeb;">
      <p style="font-weight:700;font-size:13px;">${typeof poIkon === 'function' ? poIkon('bell', 16) + ' ' : ''}Amalan di rumah belum diisi</p>
      <p style="font-size:12px;margin:2px 0 6px;">${bsEsc(belum.map(labelHari).join(', '))} belum diisi.${belum[0].n === BS_HARI_ISI_MUNDUR ? ' Batas terakhir mengisi: hari ini.' : ''}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="btn btn-primary" style="padding:3px 12px;font-size:12px;min-height:32px;" onclick="bsOrtuIsiSekarang('${belum[0].tg}')">Isi ${bsEsc(labelHari(belum[0]).toLowerCase())}</button><button type="button" class="btn btn-soft" style="padding:3px 12px;font-size:12px;min-height:32px;" onclick="bsOrtuTundaPengingat()">Nanti</button></div></div>` : '';
  const tombolLima = `<button type="button" class="btn ${limaLengkap ? 'btn-soft' : 'btn-primary'}" style="padding:3px 10px;font-size:12px;min-height:30px;"${limaLengkap ? ' disabled' : ''} onclick="bsOrtuCentangLima()">${limaLengkap ? '✅ Lengkap' : '☑️ Semua sudah'}</button>`;
  const kecilGaya = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:54px;padding:4px 2px;border-radius:12px;font:inherit;font-size:11px;font-weight:600;line-height:1.15;text-align:center;';
  const kecil = (a, label) => { if (uzur && a.wajib) return `<div style="${kecilGaya}border:2px dashed #99f6e4;background:#f0fdfa;color:#6b7280;"><span style="font-size:18px;line-height:1;opacity:.55;">${a.e}</span><span>${bsEsc(label)}</span><span style="font-size:12px;line-height:1;">🌿</span></div>`;
    if (kr[a.k]) return `<div title="Tercatat hadir di madrasah" style="${kecilGaya}border:2px solid #059669;background:#d1fae5;color:#111827;"><span style="font-size:18px;line-height:1;">${a.e}</span><span>${bsEsc(label)}</span><span style="font-size:12px;line-height:1;">🏫</span></div>`;
    const on = items[a.k] === true;
    return `<button type="button" onclick="bsOrtuToggle('${a.k}')" aria-pressed="${on}" style="${kecilGaya}cursor:pointer;border:2px solid ${on ? '#059669' : '#d1d5db'};background:${on ? '#d1fae5' : '#fff'};color:#111827;-webkit-tap-highlight-color:transparent;"><span style="font-size:18px;line-height:1;">${a.e}</span><span>${bsEsc(label)}</span><span style="font-size:12px;line-height:1;">${on ? '✅' : '⬜'}</span></button>`; };
  const rowLima = BS_AMALAN.filter(a => a.wajib).map(a => kecil(a, a.nama)).join('');
  const rowLain = BS_AMALAN.filter(a => !a.wajib).map(a => kecil(a, a.t)).join('');
  const rowKeb = BS_KEBIASAAN.map(a => kecil(a, a.nama)).join('');
  const otoBaris = BS_KEB7.filter(a => a.fn).map(a => a.e + ' ' + bsEsc(a.t) + ' ' + ((uzur && a.k === '_ibadah') ? '🌿' : bsKebNilai(a, items) ? '✅' : '⬜')).join(' &nbsp;·&nbsp; ');
  const ringkasHk = [uzur ? 'Berhalangan sholat' : '', sakit ? 'Hari sakit' : ''].filter(Boolean).join(' · ');
  const menuHk = `<details${(bsOrtuHkBuka || uzur || sakit) ? ' open' : ''} ontoggle="bsOrtuHkBuka=this.open" style="margin-top:8px;"><summary style="cursor:pointer;list-style:none;font-size:12px;font-weight:600;padding:8px 10px;border:1px dashed #d1d5db;border-radius:10px;-webkit-tap-highlight-color:transparent;">🌿🤒 ${ringkasHk ? bsEsc(ringkasHk) : 'Berhalangan sholat atau sakit?'}<span style="float:right;opacity:.6;">▾</span></summary>${tombolUzur}${rentang('berhalangan', 'uzur')}${tombolSakit}${rentang('sakit', 'sakit')}</details>`;
  const berikut = bsOrtuTargetBerikut();
  const baris = o.targets.map(t => { const x = o.setoran[t.key], st = x ? x.status : 'Belum Setor';
    return `<div style="padding:9px 0;border-bottom:1px solid #f1f5f9;">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;"><span style="font-size:13px;font-weight:600;">${bsEsc((t.urutan || '') + '. ' + t.nama)}</span>${bsChip(st)}</div>
      <div class="text-muted" style="font-size:11px;margin-top:2px;">${x ? bsEsc('Dinilai ' + bsFmtTgl(x.tanggal) + (x.guruName ? ' oleh ' + x.guruName : '') + ((x.percobaan || 1) > 1 ? ' · percobaan ke-' + x.percobaan : '') + (x.nilai != null ? ' · nilai ' + x.nilai : '')) : bsEsc(bsLabelTarget(t))}</div>
      ${x && x.alasan ? `<div style="font-size:12px;margin-top:3px;color:#b45309;">🔁 Perlu dilatih: ${bsEsc(x.alasan)}</div>` : ''}${x && x.catatan ? `<div style="font-size:12px;margin-top:3px;padding:6px 8px;background:#f9fafb;border-radius:6px;">💬 ${bsEsc(x.catatan)}</div>` : ''}</div>`; }).join('');
  const persen = game.nTarget ? Math.round(game.lulus / game.nTarget * 100) : 0;
  const rentetan = game.rentetanLimaWaktu >= 2 ? ' · 🔥 ' + game.rentetanLimaWaktu + ' hari sholat 5 waktu lengkap berturut-turut' : '';
  box.innerHTML = `
    ${pengingat}
    <div class="card" style="margin-bottom:8px;padding:8px 12px;background:linear-gradient(135deg,#ecfdf5,#fef9c3);border:1px solid #a7f3d0;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div style="min-width:0;"><p style="font-weight:700;font-size:13px;">🕌 Bacaan Sholat &amp; Amalan</p>
          <p style="font-size:12px;margin-top:1px;">${game.level.e} Level ${game.level.no} · <strong>${bsEsc(game.level.nama)}</strong> · ⭐ ${game.poin} poin</p></div>
        <button class="btn btn-primary" style="padding:4px 10px;font-size:12px;min-height:34px;white-space:nowrap;" onclick="bsAnakBuka()">👧 Mode Anak</button>
      </div>
      <div style="border-top:1px solid rgba(0,0,0,.08);margin-top:8px;padding-top:8px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><span style="font-size:12px;font-weight:700;">Isi untuk:</span>${tglOps}</div>
        <p class="text-muted" style="font-size:11px;margin-top:4px;">${bsEsc(bsFmtTgl(o.tgl))}${rentetan}</p>
      </div>
    </div>
    ${bsLipat('amalan', 'rumah', '#2563eb', 'Amalan Harian di Rumah', nCek + ' dari ' + hh.lamaN + ' amalan terisi' + (uzur ? ' · berhalangan sholat' : '') + (sakit ? ' · hari sakit' : ''), `
      <p class="text-muted" style="font-size:11px;margin-bottom:6px;">Ketuk yang sudah dilakukan ${bsEsc(o.siswa.name)}. Tersimpan otomatis.${Object.keys(kr).length ? ' <strong>🏫 Dhuha/Dzuhur yang tercatat hadir di madrasah tercentang otomatis.</strong>' : ''}</p>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:12px;font-weight:700;">Sholat 5 waktu</span>${uzur ? '<span style="font-size:11px;color:#0d9488;">🌿 berhalangan</span>' : tombolLima}</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;">${rowLima}</div>
      <p style="font-size:12px;font-weight:700;margin:8px 0 4px;">Amalan lain</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">${rowLain}</div>${menuHk}`)}
    ${bsLipat('keb', 'bintang', '#d97706', '7 Kebiasaan Anak Hebat', nKeb + ' dari ' + hh.kebN + ' kebiasaan terisi', `
      <p class="text-muted" style="font-size:11px;margin-bottom:6px;">Ketuk yang sudah dilakukan. Tidak memengaruhi poin dan lencana.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">${rowKeb}</div>
      <p class="text-muted" style="font-size:11px;margin-top:8px;">Otomatis dari Amalan Harian: ${otoBaris}</p>`)}
    ${bsHtmlRingkasPekanOrtu(bsOrtuDaftarAmalan())}
    ${bsLipat('setoran', 'buku', '#059669', 'Progres Setoran Bacaan Sholat', o.targets.length ? game.lulus + ' dari ' + game.nTarget + ' target lulus (' + persen + '%)' : 'Belum ada target dari guru', `
      ${o.targets.length ? `${bsBarProgres(persen)}
        ${berikut ? `<p style="font-size:13px;margin:10px 0 4px;">🎯 Target berikutnya: <strong>${bsEsc(berikut.nama)}</strong> <span class="text-muted" style="font-size:11px;">(${bsEsc(bsLabelTarget(berikut))})</span></p>` : '<p style="font-size:13px;margin:10px 0 4px;color:#059669;font-weight:700;">🎉 Semua target bacaan sudah lulus!</p>'}
        <div style="margin-top:6px;">${baris}</div>` : '<p class="text-muted" style="font-size:13px;">Guru belum membuat target bacaan sholat untuk kelas ini.</p>'}`)}`;
}
function bsOrtuPilihTgl(tg) { bsOrtu.tgl = tg; bsOrtuGambar(); }
function bsOrtuToggle(kode) {
  const o = bsOrtu, s = o.siswa; if (!s) return;
  const tg = o.tgl || bsHariIni();
  if (!bsTglBolehIsi(tg)) return toast('⚠️ Hanya bisa mengisi hari ini sampai ' + BS_HARI_ISI_MUNDUR + ' hari ke belakang.', true);
  if (!bsOnline()) return toast('📡 Sedang offline. Checklist butuh koneksi internet.', true);
  if ((o.uzur || {})[tg] === true && BS_AMALAN.some(a => a.k === kode && a.wajib)) return toast('🌿 Tanggal ini ditandai berhalangan sholat. Matikan dulu tandanya kalau mau mencentang sholat.', true);
  if (bsMadrasahDi(o, tg)[kode]) return toast('🏫 Tercatat hadir di madrasah, jadi sudah tercentang otomatis.');
  const pKey = tg + '|' + kode;
  if (!bsKunciMulai('toggle_' + pKey)) return;   // item yang sama masih menyimpan: abaikan ketukan ganda
  const sebelum = Object.assign({}, o.amalan[tg] || {});
  if (!BS_SEMUA_ITEM.some(a => a.k === kode)) { bsKunciSelesai('toggle_' + pKey); return; }
  const items = {}; BS_SEMUA_ITEM.forEach(a => { items[a.k] = sebelum[a.k] === true; });
  items[kode] = !items[kode];
  o.amalan[tg] = items; bsOrtuGambar();
  // Tulis HANYA item yang diubah (multi-path update), supaya centang orang tua lain di HP lain tidak tertimpa.
  const upd = { siswaKey: s.key, siswaNama: s.name || '', kelas: s.kelas || '', tanggal: tg, diisiOleh: 'ortu', tahunAjaran: bsTA(), updatedAt: new Date().toISOString() };
  upd['items/' + kode] = items[kode];
  const token = o.token;
  db.ref('bs_amalan_rumah/' + s.key + '_' + tg).update(upd).then(() => bsKunciSelesai('toggle_' + pKey)).catch(err => {
    bsKunciSelesai('toggle_' + pKey);
    if (bsOrtu.token !== token) return;
    const cur = Object.assign({}, bsOrtu.amalan[tg] || {}); cur[kode] = sebelum[kode] === true; bsOrtu.amalan[tg] = cur;   // kembalikan item ini saja
    bsOrtuGambar(); toast('❌ Gagal menyimpan checklist: ' + ((err && err.message) || err), true);
  });
}

// Tulis penanda hari (berhalangan / sakit) lewat transaksi: Rules bs_amalan_rumah mewajibkan child 'items' ada (hasChildren), sedangkan catatan
// yang baru berisi penanda tidak punya item apa pun. Bila 'items' belum ada diisi { subuh: false } (sama artinya dengan belum dicentang);
// catatan yang sudah ada (item, field lain) dipertahankan apa adanya.
function bsTulisHariKhusus(s, tg, bidang, nilai) {
  return db.ref('bs_amalan_rumah/' + s.key + '_' + tg).transaction(cur => {
    const r = (cur && typeof cur === 'object') ? cur : {};
    r.siswaKey = s.key; r.siswaNama = s.name || ''; r.kelas = s.kelas || ''; r.tanggal = tg; r.diisiOleh = 'ortu'; r.tahunAjaran = bsTA(); r.updatedAt = new Date().toISOString();
    r[bidang] = nilai;
    if (!r.items || typeof r.items !== 'object') r.items = { subuh: false };
    return r;
  });
}
// Tandai / batalkan "berhalangan sholat" atau "hari sakit" untuk tanggal terpilih (satu bidang boolean di catatan hari itu; alasan TIDAK disimpan).
function bsOrtuBerhalangan() { bsOrtuTandaiHari('berhalangan', 'uzur'); }
function bsOrtuSakit() { bsOrtuTandaiHari('sakit', 'sakit'); }
function bsOrtuTandaiHari(bidang, kunciState) {
  const o = bsOrtu, s = o.siswa; if (!s) return;
  const tg = o.tgl || bsHariIni();
  if (!bsTglBolehIsi(tg)) return toast('⚠️ Hanya bisa mengisi hari ini sampai ' + BS_HARI_ISI_MUNDUR + ' hari ke belakang.', true);
  if (!bsOnline()) return toast('📡 Sedang offline. Checklist butuh koneksi internet.', true);
  const pKey = tg + '|' + bidang;
  if (!bsKunciMulai('toggle_' + pKey)) return;
  if (!o[kunciState]) o[kunciState] = {};
  const sebelum = o[kunciState][tg] === true, baru = !sebelum, adaCatatan = Object.prototype.hasOwnProperty.call(o.amalan, tg);
  o[kunciState][tg] = baru; if (!adaCatatan) o.amalan[tg] = {};
  bsOrtuGambar();
  const token = o.token;
  bsTulisHariKhusus(s, tg, bidang, baru).then(() => bsKunciSelesai('toggle_' + pKey)).catch(err => {
    bsKunciSelesai('toggle_' + pKey);
    if (bsOrtu.token !== token) return;
    bsOrtu[kunciState][tg] = sebelum; if (!adaCatatan) delete bsOrtu.amalan[tg];
    bsOrtuGambar(); toast('❌ Gagal menyimpan: ' + ((err && err.message) || err), true);
  });
}
// Tandai / batalkan "berhalangan sholat" atau "hari sakit" untuk SEMUA hari yang masih boleh diisi (hari ini + BS_HARI_ISI_MUNDUR hari ke belakang).
// Satu tulisan per tanggal (bentuk sama dengan tandai satu hari); tanggal yang gagal dikembalikan saja.
function bsOrtuTandaiRentang(bidang, kunciState) {
  const o = bsOrtu, s = o.siswa; if (!s) return;
  if (!bsOnline()) return toast('📡 Sedang offline. Checklist butuh koneksi internet.', true);
  const h = bsHariIni(), tgls = [0, 1, 2].map(n => bsTambahHari(h, -n)).filter(bsTglBolehIsi);
  if (!tgls.length) return;
  const pKey = 'rentang|' + bidang;
  if (!bsKunciMulai('toggle_' + pKey)) return;
  if (!o[kunciState]) o[kunciState] = {};
  const baru = !tgls.every(t => o[kunciState][t] === true), sebelum = {}, adaCatatan = {};
  tgls.forEach(t => { sebelum[t] = o[kunciState][t] === true; adaCatatan[t] = Object.prototype.hasOwnProperty.call(o.amalan, t); o[kunciState][t] = baru; if (!adaCatatan[t]) o.amalan[t] = {}; });
  bsOrtuGambar();
  const token = o.token;
  Promise.all(tgls.map(t => {
    return bsTulisHariKhusus(s, t, bidang, baru).then(() => null, err => ({ t, err }));
  })).then(hasil => {
    bsKunciSelesai('toggle_' + pKey);
    const gagal = hasil.filter(Boolean);
    if (!gagal.length || bsOrtu.token !== token) return;
    gagal.forEach(g => { bsOrtu[kunciState][g.t] = sebelum[g.t]; if (!adaCatatan[g.t]) delete bsOrtu.amalan[g.t]; });
    bsOrtuGambar(); toast('❌ ' + gagal.length + ' tanggal gagal disimpan: ' + ((gagal[0].err && gagal[0].err.message) || gagal[0].err), true);
  });
}
// Satu ketukan: centang 5 sholat wajib sekaligus (satu tulisan multi-path, item lain tidak tersentuh).
function bsOrtuCentangLima() {
  const o = bsOrtu, s = o.siswa; if (!s) return;
  const tg = o.tgl || bsHariIni();
  if (!bsTglBolehIsi(tg)) return toast('⚠️ Hanya bisa mengisi hari ini sampai ' + BS_HARI_ISI_MUNDUR + ' hari ke belakang.', true);
  if (!bsOnline()) return toast('📡 Sedang offline. Checklist butuh koneksi internet.', true);
  if ((o.uzur || {})[tg] === true) return toast('🌿 Tanggal ini ditandai berhalangan sholat.', true);
  const pKey = tg + '|lima';
  if (!bsKunciMulai('toggle_' + pKey)) return;
  const kodes = BS_AMALAN.filter(a => a.wajib).map(a => a.k);
  const sebelum = Object.assign({}, o.amalan[tg] || {});
  const items = {}; BS_SEMUA_ITEM.forEach(a => { items[a.k] = sebelum[a.k] === true; });
  kodes.forEach(k => { items[k] = true; });
  o.amalan[tg] = items; bsOrtuGambar();
  const upd = { siswaKey: s.key, siswaNama: s.name || '', kelas: s.kelas || '', tanggal: tg, diisiOleh: 'ortu', tahunAjaran: bsTA(), updatedAt: new Date().toISOString() };
  kodes.forEach(k => { upd['items/' + k] = true; });
  const token = o.token;
  db.ref('bs_amalan_rumah/' + s.key + '_' + tg).update(upd).then(() => bsKunciSelesai('toggle_' + pKey)).catch(err => {
    bsKunciSelesai('toggle_' + pKey);
    if (bsOrtu.token !== token) return;
    const cur = Object.assign({}, bsOrtu.amalan[tg] || {}); kodes.forEach(k => { cur[k] = sebelum[k] === true; }); bsOrtu.amalan[tg] = cur;
    bsOrtuGambar(); toast('❌ Gagal menyimpan checklist: ' + ((err && err.message) || err), true);
  });
}

// ============================================================
// 3) AKSES SISWA -- "Mode Anak" (hanya-baca, di dalam sesi Portal Orang Tua)
// ============================================================
function bsAnakTutup() { const e = bsEl('bsAnakOverlay'); if (e) e.remove(); document.body.style.overflow = ''; }
function bsAnakBuka() {
  const o = bsOrtu; if (!o.siswa) return;
  bsAnakTutup();
  const h = bsHariIni(), game = bsHitungGame(o.targets, o.setoran, bsOrtuDaftarAmalan(), h, o.semua), berikut = bsOrtuTargetBerikut();
  const items = bsItemsEfektif(o, h);
  const uzA = (o.uzur || {})[h] === true, skA = (o.sakit || {})[h] === true, hhA = bsHitungHari(items, uzA);
  const ubinAnak = (a, on, libur) => libur
    ? `<div style="text-align:center;padding:8px 4px;border-radius:12px;background:#f0fdfa;"><div style="font-size:26px;opacity:.5;">${a.e}</div><div style="font-size:11px;font-weight:700;margin-top:2px;">${bsEsc(a.nama)}</div><div style="font-size:14px;">🌿</div></div>`
    : `<div style="text-align:center;padding:8px 4px;border-radius:12px;background:${on ? '#bbf7d0' : 'rgba(255,255,255,.7)'};"><div style="font-size:26px;${on ? '' : 'filter:grayscale(1);opacity:.55;'}">${a.e}</div><div style="font-size:11px;font-weight:700;margin-top:2px;">${bsEsc(a.nama)}</div><div style="font-size:14px;">${on ? '✅' : '⬜'}</div></div>`;
  const hariIni = BS_AMALAN.map(a => ubinAnak(a, items[a.k] === true, uzA && a.wajib)).join('');
  const kebAnak = BS_KEB7.map(a => ubinAnak(a, bsKebNilai(a, items), uzA && a.k === '_ibadah')).join('');
  const lv = game.level, sisa = lv.berikut != null ? lv.berikut - game.poin : 0;
  const KID = 'background:#fff;border:0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);color:#111827;';   // gaya kartu lipat khusus Mode Anak
  const nAmalanA = hhA.lamaC;
  const el = document.createElement('div'); el.id = 'bsAnakOverlay';
  el.style.cssText = 'position:fixed;inset:0;z-index:9000;overflow-y:auto;background:linear-gradient(180deg,#fef9c3 0%,#d1fae5 55%,#bfdbfe 100%);padding:16px 14px 40px;';
  el.innerHTML = `<div style="max-width:560px;margin:0 auto;">
    <button class="btn btn-soft" style="padding:8px 14px;margin-bottom:12px;" onclick="bsAnakTutup()">← Kembali ke Orang Tua</button>
    <div style="text-align:center;margin-bottom:14px;"><div style="font-size:46px;">${lv.e}</div>
      <h2 style="font-size:22px;font-weight:800;margin:4px 0;">Halo, ${bsEsc((o.siswa.name || '').split(' ')[0])}!</h2>
      <p style="font-size:14px;">Level ${lv.no} · <strong>${bsEsc(lv.nama)}</strong></p></div>
    <div style="background:#fff;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-size:26px;font-weight:800;text-align:center;">⭐ ${game.poin} poin</p>
      ${bsBarProgres(lv.persen, '#f59e0b')}
      <p style="font-size:12px;text-align:center;margin-top:6px;" class="text-muted">${lv.berikut != null ? 'Sebentar lagi naik level! Tinggal ' + sisa + ' poin lagi.' : 'Level tertinggi — masyaAllah! 🎉'}</p>
    </div>
    ${bsLipat('anak_target', 'target', '#059669', 'Target Hafalan Berikutnya', berikut ? bsEsc(berikut.nama) : (o.targets.length ? 'Semua target sudah lulus 🎉' : 'Belum dibuat guru'), `
      ${berikut ? `<p style="font-size:20px;font-weight:800;color:#047857;">${bsEsc(berikut.nama)}</p>
        <p class="text-muted" style="font-size:12px;margin:2px 0 8px;">${bsEsc(bsLabelTarget(berikut))}</p>
        ${berikut.teks ? `<div style="padding:10px;background:#f0fdf4;border-radius:10px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${bsEsc(berikut.teks)}</div>` : ''}
        <p style="font-size:13px;margin-top:8px;">Ayo latihan, lalu setor ke Ustadz/Ustadzah di sekolah! 💪</p>`
        : (o.targets.length ? '<p style="font-size:16px;font-weight:700;color:#047857;">🎉 Hebat! Semua target bacaan sudah lulus.</p>' : '<p class="text-muted">Target bacaan belum dibuat oleh guru.</p>')}
      ${o.targets.length ? `<p style="font-size:12px;margin-top:8px;" class="text-muted">Sudah lulus ${game.lulus} dari ${game.nTarget} bacaan.</p>${bsBarProgres(game.nTarget ? game.lulus / game.nTarget * 100 : 0)}` : ''}`, KID)}
    ${bsLipat('anak_amalan', 'rumah', '#2563eb', 'Amalanku Hari Ini', nAmalanA + ' dari ' + hhA.lamaN + ' amalan' + (uzA ? ' · berhalangan sholat' : '') + (skA ? ' · lekas sembuh 🤒' : ''), `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:#ecfdf5;border-radius:12px;padding:8px;">${hariIni}</div>
      ${game.rentetanLimaWaktu >= 1 ? `<p style="font-size:13px;text-align:center;margin-top:8px;">🔥 ${game.rentetanLimaWaktu} hari sholat 5 waktu lengkap berturut-turut!</p>` : '<p class="text-muted" style="font-size:12px;text-align:center;margin-top:8px;">Minta Ayah/Bunda mencentang amalanmu ya!</p>'}`, KID)}
    ${bsLipat('anak_keb', 'bintang', '#d97706', '7 Kebiasaan Hebatku', hhA.kebC + ' dari ' + hhA.kebN + ' kebiasaan', `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:#fefce8;border-radius:12px;padding:8px;">${kebAnak}</div>`, KID)}
    ${bsLipat('anak_pekan', 'kalender', '#7c3aed', 'Pekan Ini', 'Ringkasan amalan pekan ini', bsHtmlRingkasPekanAnak(bsOrtuDaftarAmalan()), KID)}
    ${bsLipat('anak_lencana', 'medali', '#f59e0b', 'Lencanaku', game.badges.filter(b => b.got).length + ' lencana diraih', bsHtmlLencana(game.badges, false), KID)}
    </div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden'; el.scrollTop = 0;
}
