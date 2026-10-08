/* ============================================================
   SI MAMBA - js/bacaan-shalat.js (v1)
   Menu "Bacaan Shalat" -- hafalan bacaan shalat + amalan harian di rumah + gamifikasi.

   TIGA AKSES:
   1) GURU / ADMIN (menu sidebar "Bacaan Shalat", halaman #page-bacaan-shalat -> #bsRoot)
      - Tab Target    : buat daftar target bacaan (harian / mingguan), per kelas atau semua kelas.
      - Tab Penilaian : uji setoran syafahi -> status Lulus / Remedial / Belum Setor (+ nilai & catatan).
      - Tab Grafik    : perkembangan klasikal (per target, per pekan, per siswa) dan individu
                        (grafik hafalan, poin & lencana, ringkasan amalan di rumah).
   2) ORANG TUA (Portal Orang Tua, disambung lewat bsOrtuRender() dari app.js)
      - Checklist amalan harian anak di rumah (shalat 5 waktu, mengaji, dst).
      - Laporan progres setoran bacaan shalat yang dinilai guru.
   3) SISWA ("Mode Anak" di dalam Portal Orang Tua -- anak belum punya akun sendiri)
      - Target bacaan berikutnya, poin, level, dan lencana digital (mis. "Bintang Shalat Subuh").
        Hanya-baca: poin & lencana dihitung dari data guru + checklist orang tua.

   DATA FIREBASE (aturan ada di rule.txt):
   - bs_target/{id}                  : target bacaan (nama, jenis, tanggal, kelas | '*', urutan, teks?, aktif)
   - bs_setoran/{targetId}_{siswaKey}: SATU catatan terbaru per siswa per target (status, nilai, catatan, percobaan)
   - bs_amalan_rumah/{siswaKey}_{tgl}: checklist harian dari orang tua (items: {subuh:true, ...})
   Poin & lencana TIDAK disimpan: selalu dihitung ulang dari tiga data di atas (tidak bisa "dikarang").

   Dimuat SESUDAH app.js (memakai helper app.js saat dijalankan, bukan saat dimuat).
============================================================ */

const BS_STATUS = ['Lulus', 'Remedial', 'Belum Setor'];
const BS_STATUS_WARNA = { 'Lulus': '#059669', 'Remedial': '#d97706', 'Belum Setor': '#6b7280' };
const BS_STATUS_BG = { 'Lulus': '#d1fae5', 'Remedial': '#fef3c7', 'Belum Setor': '#f3f4f6' };
const BS_STATUS_IKON = { 'Lulus': '✅', 'Remedial': '🔁', 'Belum Setor': '⏳' };

// Checklist amalan harian di rumah. `wajib` = shalat 5 waktu (dasar lencana "Bintang Shalat ...").
const BS_AMALAN = [
  { k: 'subuh',    nama: 'Subuh',    t: 'Shalat Subuh',    e: '🌅', poin: 10, wajib: true },
  { k: 'dzuhur',   nama: 'Dzuhur',   t: 'Shalat Dzuhur',   e: '🌞', poin: 10, wajib: true },
  { k: 'ashar',    nama: 'Ashar',    t: 'Shalat Ashar',    e: '🌤️', poin: 10, wajib: true },
  { k: 'maghrib',  nama: 'Maghrib',  t: 'Shalat Maghrib',  e: '🌇', poin: 10, wajib: true },
  { k: 'isya',     nama: 'Isya',     t: 'Shalat Isya',     e: '🌙', poin: 10, wajib: true },
  { k: 'mengaji',  nama: 'Mengaji',  t: 'Mengaji / Membaca Al-Qur\'an', e: '📖', poin: 10 },
  { k: 'dhuha',    nama: 'Dhuha',    t: 'Shalat Dhuha',    e: '☀️', poin: 5 },
  { k: 'berbakti', nama: 'Berbakti', t: 'Membantu Orang Tua', e: '🤝', poin: 5 }
];
const BS_LEVEL = [
  { min: 0,    nama: 'Pemula',          e: '🌱' },
  { min: 150,  nama: 'Rajin',           e: '🌟' },
  { min: 400,  nama: 'Teladan',         e: '🏅' },
  { min: 800,  nama: 'Bintang',         e: '🌠' },
  { min: 1500, nama: 'Juara',           e: '🏆' },
  { min: 2500, nama: 'Pahlawan Shalat', e: '👑' }
];
const BS_POIN_LULUS = 50, BS_POIN_LULUS_PERTAMA = 10, BS_STREAK_BINTANG = 7;
const BS_HARI_ISI_MUNDUR = 2;   // orang tua boleh mengisi hari ini + 2 hari ke belakang
const BS_CONTOH_TARGET = ['Niat Shalat', 'Takbiratul Ihram', 'Doa Iftitah', 'Surat Al-Fatihah', 'Surat Al-Ikhlas',
  'Bacaan Ruku', 'Bacaan I\'tidal', 'Bacaan Sujud', 'Doa Duduk di Antara Dua Sujud', 'Tasyahud Awal',
  'Tasyahud Akhir', 'Salam', 'Doa Setelah Shalat'];

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
function bsTambahHari(tgl, n) { const d = bsTglParse(tgl); d.setDate(d.getDate() + n); return tglLokal(d); }
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
function bsOnline() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
function bsEl(id) { return document.getElementById(id); }
function bsLabelTarget(t) {
  if (!t) return '-';
  return t.jenis === 'mingguan' ? 'Pekan ' + bsMingguLabel(t.tanggal) : 'Tanggal ' + bsFmtTgl(t.tanggal);
}

// ---------- peran & izin ----------
function bsIsAdmin() { return typeof v4IsAdmin === 'function' && !!v4IsAdmin(); }
function bsIsHead() { return typeof v4IsHead === 'function' && !!v4IsHead(); }
function bsIsTeacher() { return typeof v4IsTeacher === 'function' && !!v4IsTeacher(); }
function bsKelasScope() { return typeof loaderScopeKelas === 'function' ? loaderScopeKelas() : []; }
// Dipanggil app.js untuk menyembunyikan/menampilkan menu sidebar.
function bsCanOpenMenu() { return bsIsAdmin() || bsIsHead() || bsIsTeacher(); }
// Menilai setoran: Admin (semua kelas) + guru/wali kelas untuk kelas yang dia ampu. Kepala Madrasah: lihat saja.
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
function bsHitungGame(targets, setoranByTarget, amalanList, hariIni) {
  hariIni = hariIni || bsHariIni();
  const harian = {};
  (amalanList || []).forEach(r => { if (r && r.tanggal) harian[r.tanggal] = r.items || {}; });
  const tanggals = Object.keys(harian).sort();
  let poin = 0;
  tanggals.forEach(tg => BS_AMALAN.forEach(a => { if (harian[tg][a.k] === true) poin += a.poin; }));
  let lulus = 0, lulusPertama = 0;
  (targets || []).forEach(t => {
    const s = (setoranByTarget || {})[t.key];
    if (s && s.status === 'Lulus') { lulus++; poin += BS_POIN_LULUS; if ((s.percobaan || 1) === 1) { lulusPertama++; poin += BS_POIN_LULUS_PERTAMA; } }
  });
  // Rentetan hari berturut-turut terpanjang yang memenuhi syarat (hari tanpa isian = putus)
  const rentetan = pred => {
    let best = 0, cur = 0, prev = null;
    tanggals.forEach(tg => {
      if (!pred(harian[tg])) { cur = 0; prev = null; return; }
      cur = (prev && bsSelisihHari(prev, tg) === 1) ? cur + 1 : 1;
      prev = tg; if (cur > best) best = cur;
    });
    return best;
  };
  const semuaWajib = it => BS_AMALAN.filter(a => a.wajib).every(a => it[a.k] === true);
  // Rentetan yang masih berjalan sampai hari ini (atau kemarin, kalau hari ini belum diisi)
  let berjalan = 0;
  { let tg = (harian[hariIni] && semuaWajib(harian[hariIni])) ? hariIni : bsTambahHari(hariIni, -1);
    while (harian[tg] && semuaWajib(harian[tg])) { berjalan++; tg = bsTambahHari(tg, -1); } }
  const badges = [];
  const tambah = (id, e, n, d, now, need) => badges.push({ id, e, n, d, now, need, got: now >= need });
  BS_AMALAN.filter(a => a.wajib).forEach(a =>
    tambah('shalat_' + a.k, '⭐', 'Bintang Shalat ' + a.nama, 'Shalat ' + a.nama + ' ' + BS_STREAK_BINTANG + ' hari berturut-turut', rentetan(it => it[a.k] === true), BS_STREAK_BINTANG));
  tambah('lima_waktu', '🌈', 'Pejuang Lima Waktu', 'Shalat 5 waktu lengkap 5 hari berturut-turut', rentetan(semuaWajib), 5);
  tambah('mengaji', '📖', 'Sahabat Al-Qur\'an', 'Mengaji ' + BS_STREAK_BINTANG + ' hari berturut-turut', rentetan(it => it.mengaji === true), BS_STREAK_BINTANG);
  tambah('rajin', '📅', 'Anak Rajin', 'Checklist amalan terisi 30 hari', tanggals.filter(tg => Object.keys(harian[tg]).some(k => harian[tg][k] === true)).length, 30);
  tambah('lulus_1', '🎯', 'Langkah Pertama', 'Lulus 1 target bacaan', lulus, 1);
  tambah('lulus_5', '🕌', 'Hafidz Cilik', 'Lulus 5 target bacaan', lulus, 5);
  tambah('sekali_jalan', '⚡', 'Sekali Jalan', 'Lulus 3 target di percobaan pertama', lulusPertama, 3);
  const nTarget = (targets || []).length;
  if (nTarget >= 3) tambah('juara', '🏆', 'Juara Bacaan Shalat', 'Lulus semua target bacaan', lulus, nTarget);
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
    grafik: 'klasikal', siswaSel: '', amalanSiswa: {}, memuat: false, err: ''
  };
}
let bsState = bsStateBaru();
function bacaanShalatResetState() {
  bsState = bsStateBaru();
  const r = bsEl('bsRoot'); if (r) r.innerHTML = '';
  try { bsAnakTutup(); } catch (e) { /* belum ada overlay */ }
}

function bsMuatTargets(paksa) {
  const ta = bsTA();
  if (!paksa && bsState.targets && bsState.targetsTA === ta) return Promise.resolve(bsState.targets);
  return db.ref('bs_target').orderByChild('tahunAjaran').equalTo(ta).once('value').then(snap => {
    const arr = []; snap.forEach(c => { const v = c.val() || {}; v.key = c.key; arr.push(v); });
    bsState.targets = arr; bsState.targetsTA = ta; return arr;
  });
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
function bsMuatAmalanSiswa(sk, paksa) {
  const ta = bsTA();
  if (!paksa && bsState.amalanSiswa[sk]) return Promise.resolve(bsState.amalanSiswa[sk]);
  return db.ref('bs_amalan_rumah').orderByChild('siswaKey').equalTo(sk).once('value').then(snap => {
    const arr = []; snap.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === ta) arr.push(v); });
    bsState.amalanSiswa[sk] = arr; return arr;
  });
}
function bsSiswaKelas(k) {
  const arr = (typeof v4PanelSiswaCache !== 'undefined' && v4PanelSiswaCache[k]) ? v4PanelSiswaCache[k] : null;
  return arr ? arr.slice().sort((a, b) => bsCmp(a.name, b.name)) : null;
}

function setupBacaanShalatPage() {
  const root = bsEl('bsRoot'); if (!root) return;
  if (!bsCanOpenMenu()) { root.innerHTML = '<p class="text-muted">Menu ini hanya untuk Guru, Wali Kelas, Kepala Madrasah, dan Admin.</p>'; return; }
  const pil = bsKelasPilihan();
  if (!bsState.kelas || !pil.includes(bsState.kelas)) bsState.kelas = pil[0] || '';
  if (!bsState.tglNilai) bsState.tglNilai = bsHariIni();
  bsState.memuat = true; bsState.err = ''; bsRender();
  bsMuatTargets(false)
    .catch(e => { bsState.err = 'Gagal memuat target: ' + ((e && e.message) || e); })
    .then(() => { bsState.memuat = false; bsRender(); bsPastikanDataKelas(); });
}
function bsPastikanDataKelas() {
  const k = bsState.kelas;
  if (!k || bsState.tab === 'target') return;
  if (typeof v4PanelSiswaCache !== 'undefined' && !v4PanelSiswaCache[k] && typeof v4FetchSiswaByKelas === 'function') {
    v4FetchSiswaByKelas(k, () => { if (bsState.kelas === k) bsRender(); });
  }
  bsMuatSetoran(k, false)
    .catch(e => { bsState.err = 'Gagal memuat penilaian: ' + ((e && e.message) || e); })
    .then(() => { if (bsState.kelas === k) bsRender(); });
}
function bsSegarkan() {
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  bsState.targets = null; bsState.setoran = {}; bsState.setoranTA = {}; bsState.amalanSiswa = {};
  if (typeof v4PanelSiswaCache !== 'undefined' && bsState.kelas) { delete v4PanelSiswaCache[bsState.kelas]; }
  setupBacaanShalatPage();
}
function bsPilihTab(t) { bsState.tab = t; bsRender(); bsPastikanDataKelas(); }
function bsPilihKelas(k) { bsState.kelas = k; bsState.siswaSel = ''; bsState.targetSel = ''; bsRender(); bsPastikanDataKelas(); }

function bsRender() {
  const root = bsEl('bsRoot'); if (!root || !bsCanOpenMenu()) return;
  const pil = bsKelasPilihan();
  const tabs = [['target', '🎯 Target'], ['nilai', '📝 Penilaian'], ['grafik', '📊 Grafik']];
  const opsiKelas = pil.map(k => `<option value="${bsEsc(k)}" ${k === bsState.kelas ? 'selected' : ''}>Kelas ${bsEsc(k)}</option>`).join('');
  let body = '';
  if (bsState.memuat) body = '<p class="text-muted" style="padding:14px;">⏳ Memuat data...</p>';
  else if (bsState.tab === 'target') body = bsBodyTarget();
  else if (bsState.tab === 'nilai') body = bsBodyNilai();
  else body = bsBodyGrafik();
  root.innerHTML = `
    ${bsState.err ? `<div style="padding:10px;margin-bottom:10px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:13px;">⚠️ ${bsEsc(bsState.err)} <button class="btn btn-soft" style="padding:3px 10px;font-size:12px;margin-left:6px;" onclick="bsSegarkan()">🔄 Coba lagi</button></div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px;">
      <div style="min-width:150px;"><label class="label">Kelas</label>
        <select class="field" onchange="bsPilihKelas(this.value)">${opsiKelas || '<option value="">(tidak ada kelas)</option>'}</select></div>
      <button class="btn btn-soft" style="padding:8px 12px;" onclick="bsSegarkan()">🔄 Segarkan</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
      ${tabs.map(([id, t]) => `<button class="btn ${bsState.tab === id ? 'btn-primary' : 'btn-soft'}" style="padding:8px 14px;" onclick="bsPilihTab('${id}')">${t}</button>`).join('')}
    </div>
    ${bsIsHead() ? '<p class="v4-muted" style="font-size:12px;margin-bottom:8px;">👑 Mode Kepala Madrasah: hanya melihat (target &amp; penilaian dikelola Admin/guru kelas).</p>' : ''}
    ${body}`;
}

// ---------- Tab TARGET ----------
function bsBodyTarget() {
  const targets = (bsState.targets || []).filter(t => bsIsAdmin() || bsIsHead() || t.kelas === '*' || bsKelasScope().includes(t.kelas)).sort(bsBandingTarget);
  const edit = bsState.editId ? (bsState.targets || []).find(t => t.key === bsState.editId) : null;
  const pilKelasForm = [];
  if (bsIsAdmin()) pilKelasForm.push(['*', 'Semua kelas']);
  bsKelasPilihan().forEach(k => { if (bsCanTarget(k)) pilKelasForm.push([k, 'Kelas ' + k]); });
  const nextUrutan = (targets.reduce((m, t) => Math.max(m, t.urutan || 0), 0)) + 1;
  const v = edit || { nama: '', jenis: 'mingguan', tanggal: bsHariIni(), kelas: pilKelasForm[0] ? pilKelasForm[0][0] : '', urutan: nextUrutan, teks: '' };
  const form = bsPunyaAksesTarget() ? `
    <div class="card" style="margin-bottom:14px;border:1px solid #e5e7eb;">
      <p style="font-weight:700;margin-bottom:8px;">${edit ? '✏️ Ubah Target' : '➕ Tambah Target Bacaan'}</p>
      <div class="v4-grid-2">
        <div><label class="label">Nama bacaan *</label><input id="bsTgNama" class="field" maxlength="120" placeholder="mis. Doa Iftitah" value="${bsEsc(v.nama)}"></div>
        <div><label class="label">Periode *</label>
          <select id="bsTgJenis" class="field" onchange="bsTargetJenisBerubah()"><option value="harian" ${v.jenis === 'harian' ? 'selected' : ''}>Harian</option><option value="mingguan" ${v.jenis === 'mingguan' ? 'selected' : ''}>Mingguan</option></select></div>
        <div><label class="label" id="bsTgTanggalLabel">${v.jenis === 'harian' ? 'Tanggal target *' : 'Tanggal di pekan target *'}</label><input id="bsTgTanggal" type="date" class="field" value="${bsEsc(v.tanggal)}"></div>
        <div><label class="label">Berlaku untuk *</label>
          <select id="bsTgKelas" class="field">${pilKelasForm.map(([k, t]) => `<option value="${bsEsc(k)}" ${v.kelas === k ? 'selected' : ''}>${bsEsc(t)}</option>`).join('')}</select></div>
        <div><label class="label">Urutan</label><input id="bsTgUrutan" type="number" min="1" max="999" class="field" value="${bsEsc(v.urutan)}"></div>
      </div>
      <label class="label" style="margin-top:8px;">Teks bacaan / catatan untuk siswa (opsional)</label>
      <textarea id="bsTgTeks" class="field" rows="3" maxlength="2000" placeholder="Tulis teks bacaan atau petunjuk singkat. Tampil di Mode Anak.">${bsEsc(v.teks || '')}</textarea>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button class="btn btn-success" id="bsBtnSimpanTarget" onclick="bsSimpanTarget()">💾 ${edit ? 'Simpan Perubahan' : 'Tambah Target'}</button>
        ${edit ? '<button class="btn btn-soft" onclick="bsBatalEditTarget()">Batal</button>' : ''}
      </div>
    </div>` : '';
  const kosong = !targets.length;
  const contoh = (bsIsAdmin() && kosong) ? `<div style="padding:12px;border:1px dashed #9ca3af;border-radius:10px;margin-bottom:12px;font-size:13px;">Belum ada target. Untuk mulai cepat, isi daftar contoh (${BS_CONTOH_TARGET.length} bacaan shalat, satu per pekan mulai pekan ini, berlaku semua kelas) lalu ubah sesuai kebutuhan. <button class="btn btn-primary" style="margin-left:6px;padding:6px 12px;" onclick="bsIsiContoh()">✨ Isi contoh daftar</button></div>` : '';
  const baris = targets.map(t => {
    const bisa = bsCanTarget(t.kelas);
    const aktif = t.aktif !== false;
    return `<tr style="${aktif ? '' : 'opacity:.55;'}">
      <td style="text-align:center;">${bsEsc(t.urutan || '')}</td>
      <td><strong>${bsEsc(t.nama)}</strong>${t.teks ? ' <span title="Ada teks bacaan">📄</span>' : ''}<div class="text-muted" style="font-size:11px;">${bsEsc(t.jenis === 'mingguan' ? 'Mingguan' : 'Harian')} · ${bsEsc(bsLabelTarget(t))}</div></td>
      <td>${t.kelas === '*' ? 'Semua' : bsEsc(t.kelas)}</td>
      <td>${aktif ? '<span style="color:#059669;font-weight:600;font-size:12px;">Aktif</span>' : '<span class="text-muted" style="font-size:12px;">Nonaktif</span>'}</td>
      <td style="white-space:nowrap;">${bisa ? `<button class="btn btn-soft" style="padding:3px 8px;font-size:11px;" onclick="bsEditTarget('${bsEscJs(t.key)}')">✏️</button>
        <button class="btn btn-soft" style="padding:3px 8px;font-size:11px;" onclick="bsToggleAktif('${bsEscJs(t.key)}')">${aktif ? '⏸️' : '▶️'}</button>
        <button class="btn btn-danger" style="padding:3px 8px;font-size:11px;" onclick="bsHapusTarget('${bsEscJs(t.key)}')">🗑️</button>` : '<span class="text-muted" style="font-size:11px;">lihat saja</span>'}</td>
    </tr>`;
  }).join('');
  return form + contoh + (kosong ? '<p class="text-muted" style="font-size:13px;">Belum ada target bacaan.</p>' : `<div style="overflow-x:auto;"><table><thead><tr><th>#</th><th>Bacaan</th><th>Kelas</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${baris}</tbody></table></div>`);
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
  const kelas = bsEl('bsTgKelas').value, urutan = parseInt(bsEl('bsTgUrutan').value, 10) || 1, teks = (bsEl('bsTgTeks').value || '').trim();
  if (nama.length < 2) return toast('⚠️ Nama bacaan minimal 2 huruf.', true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || '')) return toast('⚠️ Tanggal target belum diisi.', true);
  if (!kelas || !bsCanTarget(kelas)) return toast('⚠️ Anda tidak boleh membuat target untuk kelas tersebut.', true);
  const edit = bsState.editId ? (bsState.targets || []).find(t => t.key === bsState.editId) : null;
  if (edit && !bsCanTarget(edit.kelas)) return toast('⚠️ Anda tidak boleh mengubah target milik kelas lain.', true);
  const btn = bsEl('bsBtnSimpanTarget'); setBusy('bsSimpanTarget', btn);
  const now = new Date().toISOString();
  const data = { nama, jenis, tanggal, kelas, urutan, tahunAjaran: bsTA(), updatedAt: now, diubahOleh: bsGuruNama() };
  let janji, rec;
  if (edit) {
    rec = Object.assign({}, edit, data); if (teks) rec.teks = teks; else delete rec.teks;
    janji = db.ref('bs_target/' + edit.key).update(Object.assign({}, data, { teks: teks || null }));
  } else {
    const ref = db.ref('bs_target').push(); data.aktif = true; data.dibuat = now; data.dibuatOleh = bsGuruNama(); if (teks) data.teks = teks;
    rec = Object.assign({ key: ref.key }, data); janji = ref.set(data);
  }
  janji.then(() => {
    clearBusy('bsSimpanTarget', bsEl('bsBtnSimpanTarget'));
    if (edit) { const i = bsState.targets.findIndex(t => t.key === edit.key); if (i >= 0) bsState.targets[i] = rec; } else bsState.targets.push(rec);
    bsState.editId = '';
    if (typeof v4Audit === 'function') v4Audit(edit ? 'BS_UBAH_TARGET' : 'BS_BUAT_TARGET', 'BACAAN_SHALAT', rec.key, null, { nama, jenis, kelas });
    toast('✅ Target tersimpan.'); bsRender();
  }).catch(err => { clearBusy('bsSimpanTarget', bsEl('bsBtnSimpanTarget')); toast('❌ Gagal menyimpan target: ' + ((err && err.message) || err), true); });
}
function bsToggleAktif(id) {
  const t = (bsState.targets || []).find(x => x.key === id); if (!t || !bsCanTarget(t.kelas)) return;
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  const baru = t.aktif === false;
  db.ref('bs_target/' + id).update({ aktif: baru, updatedAt: new Date().toISOString() })
    .then(() => { t.aktif = baru; toast(baru ? '▶️ Target diaktifkan.' : '⏸️ Target dinonaktifkan (data penilaian tetap tersimpan).'); bsRender(); })
    .catch(err => toast('❌ Gagal: ' + ((err && err.message) || err), true));
}
function bsHapusTarget(id) {
  const t = (bsState.targets || []).find(x => x.key === id); if (!t || !bsCanTarget(t.kelas)) return;
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  // Tolak hapus kalau sudah ada penilaian (hindari data yatim) -- sarankan nonaktifkan.
  db.ref('bs_setoran').orderByChild('targetId').equalTo(id).limitToFirst(1).once('value').then(snap => {
    if (snap.exists()) return toast('⚠️ Target ini sudah punya penilaian siswa, jadi tidak bisa dihapus. Gunakan ⏸️ Nonaktifkan.', true);
    const ok = typeof doubleConfirm === 'function' ? doubleConfirm('Hapus target "' + t.nama + '"?') : confirm('Hapus target "' + t.nama + '"?');
    if (!ok) return;
    return db.ref('bs_target/' + id).remove().then(() => {
      bsState.targets = bsState.targets.filter(x => x.key !== id);
      if (typeof v4Audit === 'function') v4Audit('BS_HAPUS_TARGET', 'BACAAN_SHALAT', id, { nama: t.nama }, null);
      toast('✅ Target dihapus.'); bsRender();
    });
  }).catch(err => toast('❌ Gagal: ' + ((err && err.message) || err), true));
}
function bsIsiContoh() {
  if (!bsIsAdmin()) return toast('Hanya Admin.', true);
  if (!bsOnline()) return toast('📡 Sedang offline.', true);
  if ((bsState.targets || []).length) return toast('Sudah ada target; contoh tidak diisi agar tidak dobel.', true);
  const ok = typeof doubleConfirm === 'function' ? doubleConfirm('Isi ' + BS_CONTOH_TARGET.length + ' target contoh (mingguan, semua kelas)?') : confirm('Isi target contoh?');
  if (!ok) return;
  const d = new Date(), senin = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  const now = new Date().toISOString(), payload = {}, baru = [];
  BS_CONTOH_TARGET.forEach((nama, i) => {
    const id = db.ref('bs_target').push().key;
    const tgl = tglLokal(new Date(senin.getFullYear(), senin.getMonth(), senin.getDate() + i * 7));
    const rec = { nama, jenis: 'mingguan', tanggal: tgl, kelas: '*', urutan: i + 1, aktif: true, tahunAjaran: bsTA(), dibuat: now, dibuatOleh: bsGuruNama() };
    payload[id] = rec; baru.push(Object.assign({ key: id }, rec));
  });
  db.ref('bs_target').update(payload).then(() => {
    bsState.targets = (bsState.targets || []).concat(baru);
    if (typeof v4Audit === 'function') v4Audit('BS_ISI_CONTOH_TARGET', 'BACAAN_SHALAT', null, null, { jumlah: baru.length });
    toast('✅ ' + baru.length + ' target contoh ditambahkan.'); bsRender();
  }).catch(err => toast('❌ Gagal: ' + ((err && err.message) || err), true));
}

// ---------- Tab PENILAIAN ----------
function bsKunciSetoran(targetId, sk) { return targetId + '_' + sk; }
function bsDraftBeda(d, saved) {
  if (!saved) return !!d.status;   // belum ada catatan: dianggap perubahan kalau status sudah dipilih
  const n1 = d.nilai === '' || d.nilai == null ? null : Number(d.nilai), n2 = saved.nilai == null ? null : Number(saved.nilai);
  return d.status !== saved.status || n1 !== n2 || (d.catatan || '').trim() !== (saved.catatan || '');
}
function bsBuatDraft(sk) {
  const k = bsState.kelas, tid = bsState.targetSel, saved = (bsState.setoran[k] || {})[bsKunciSetoran(tid, sk)];
  const s = (bsSiswaKelas(k) || []).find(x => x.key === sk), t = (bsState.targets || []).find(x => x.key === tid);
  return { kelas: k, targetId: tid, targetNama: t ? t.nama : '', siswaKey: sk, siswaNama: s ? s.name : '',
    status: saved ? saved.status : '', nilai: saved && saved.nilai != null ? saved.nilai : '', catatan: saved ? (saved.catatan || '') : '' };
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
  const d = bsDraftAmbil(sk); d.status = BS_STATUS[idx]; bsRender();
}
function bsSetNilai(sk, v) { if (!bsCanNilai(bsState.kelas)) return; bsDraftAmbil(sk).nilai = v; bsUpdateLabelSimpan(); }
function bsSetCatatan(sk, v) { if (!bsCanNilai(bsState.kelas)) return; bsDraftAmbil(sk).catatan = v; bsUpdateLabelSimpan(); }
function bsBodyNilai() {
  const k = bsState.kelas;
  if (!k) return '<p class="text-muted">Belum ada kelas yang bisa dipilih.</p>';
  const targets = bsTargetUntukKelas(bsState.targets, k);
  if (!targets.length) return '<p class="text-muted" style="font-size:13px;">Belum ada target aktif untuk kelas ini. Buat dulu di tab 🎯 Target.</p>';
  if (!targets.some(t => t.key === bsState.targetSel)) bsState.targetSel = targets[0].key;
  const t = targets.find(x => x.key === bsState.targetSel);
  const siswa = bsSiswaKelas(k);
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
  const opsiTarget = targets.map(x => `<option value="${bsEsc(x.key)}" ${x.key === t.key ? 'selected' : ''}>${bsEsc((x.urutan || '') + '. ' + x.nama)}</option>`).join('');
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
    return `<div style="padding:10px;border:1px solid ${dirty ? '#f59e0b' : '#e5e7eb'};border-radius:10px;margin-bottom:8px;${dirty ? 'background:#fffbeb;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-weight:600;font-size:14px;">${bsEsc(s.name)} ${saved ? `<span class="text-muted" style="font-size:11px;font-weight:400;">· ${bsEsc(bsFmtTgl(saved.tanggal, true))}${(saved.percobaan || 1) > 1 ? ' · percobaan ke-' + saved.percobaan : ''}</span>` : ''}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${tombol}</div>
      </div>
      ${bisa ? `<div style="display:flex;gap:6px;margin-top:6px;">
        <input type="number" min="0" max="100" class="field" style="width:84px;" placeholder="Nilai" value="${bsEsc(nilai)}" oninput="bsSetNilai('${bsEscJs(s.key)}',this.value)">
        <input type="text" maxlength="300" class="field" placeholder="Catatan guru (opsional)" value="${bsEsc(cat)}" oninput="bsSetCatatan('${bsEscJs(s.key)}',this.value)">
      </div>` : (saved && (saved.nilai != null || saved.catatan) ? `<div class="text-muted" style="font-size:12px;margin-top:4px;">${saved.nilai != null ? 'Nilai: ' + bsEsc(saved.nilai) + '. ' : ''}${bsEsc(saved.catatan || '')}</div>` : '')}
    </div>`;
  }).join('');
  return `<div class="card" style="border:1px solid #e5e7eb;">
    <div class="v4-grid-2">
      <div><label class="label">Target yang diuji</label><select class="field" onchange="bsPilihTarget(this.value)">${opsiTarget}</select></div>
      <div><label class="label">Tanggal penilaian</label><input type="date" class="field" value="${bsEsc(bsState.tglNilai)}" max="${bsEsc(bsHariIni())}" onchange="bsState.tglNilai=this.value"></div>
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
  if (!bsOnline()) return toast('📡 Sedang offline. Penilaian bacaan shalat butuh koneksi internet.', true);
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
  const btn = bsEl('bsBtnSimpanNilai'); setBusy('bsSimpanNilai', btn);
  const now = new Date().toISOString(), ta = bsTA(), records = {}, lokal = {};
  dirty.forEach(d => {
    const key = bsKunciSetoran(d.targetId, d.siswaKey), lama = saved[key];
    const sama = lama && lama.status === d.status;
    const rec = {
      targetId: d.targetId, targetNama: d.targetNama, siswaKey: d.siswaKey, siswaNama: d.siswaNama, kelas: k, status: d.status,
      tanggal: sama ? (lama.tanggal || tgl) : tgl,
      percobaan: lama ? (sama ? (lama.percobaan || 1) : (lama.percobaan || 1) + 1) : 1,
      guruKey: bsGuruKey(), guruName: bsGuruNama(), tahunAjaran: ta, updatedAt: now
    };
    if (d.nilai !== '' && d.nilai != null) rec.nilai = Number(d.nilai);
    const cat = (d.catatan || '').trim(); if (cat) rec.catatan = cat.slice(0, 300);
    records[key] = rec; lokal[key] = Object.assign({ key }, rec);
  });
  db.ref('bs_setoran').update(records).then(() => {
    clearBusy('bsSimpanNilai', bsEl('bsBtnSimpanNilai'));
    Object.keys(lokal).forEach(key => { bsState.setoran[k][key] = lokal[key]; delete bsState.draft[key]; });
    if (typeof v4Audit === 'function') v4Audit('BS_NILAI_SETORAN', 'BACAAN_SHALAT', k, null, { kelas: k, jumlah: dirty.length, tanggal: tgl });
    toast('✅ ' + dirty.length + ' penilaian tersimpan.'); bsRender();
  }).catch(err => {
    clearBusy('bsSimpanNilai', bsEl('bsBtnSimpanNilai'));
    toast('❌ Gagal menyimpan (draft dipertahankan): ' + ((err && err.message) || err), true);
  });
}

// ---------- Tab GRAFIK ----------
function bsPilihModeGrafik(m) { bsState.grafik = m; bsRender(); bsMuatAmalanIndividu(); }
function bsPilihSiswaGrafik(sk) { bsState.siswaSel = sk; bsRender(); bsMuatAmalanIndividu(); }
function bsMuatAmalanIndividu() {
  const sk = bsState.siswaSel; if (bsState.grafik !== 'individu' || !sk || bsState.amalanSiswa[sk]) return;
  bsMuatAmalanSiswa(sk, false).catch(e => { bsState.err = 'Gagal memuat amalan di rumah: ' + ((e && e.message) || e); })
    .then(() => { if (bsState.siswaSel === sk) bsRender(); });
}
function bsBodyGrafik() {
  const k = bsState.kelas;
  if (!k) return '<p class="text-muted">Belum ada kelas yang bisa dipilih.</p>';
  const targets = bsTargetUntukKelas(bsState.targets, k), siswa = bsSiswaKelas(k);
  if (!targets.length) return '<p class="text-muted" style="font-size:13px;">Belum ada target aktif untuk kelas ini.</p>';
  if (!siswa || !bsState.setoran[k]) return '<p class="text-muted" style="padding:10px;">⏳ Memuat data...</p>';
  if (!siswa.length) return '<p class="text-muted">Belum ada siswa di kelas ini.</p>';
  const sw = `<div style="display:flex;gap:6px;margin-bottom:12px;">
    <button class="btn ${bsState.grafik === 'klasikal' ? 'btn-primary' : 'btn-soft'}" style="padding:7px 14px;" onclick="bsPilihModeGrafik('klasikal')">👥 Klasikal</button>
    <button class="btn ${bsState.grafik === 'individu' ? 'btn-primary' : 'btn-soft'}" style="padding:7px 14px;" onclick="bsPilihModeGrafik('individu')">🧒 Individu</button></div>`;
  return sw + (bsState.grafik === 'individu' ? bsGrafikIndividu(k, targets, siswa) : bsGrafikKlasikal(k, targets, siswa));
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
  const byTarget = {}; targets.forEach(t => { const x = setoran[bsKunciSetoran(t.key, sk)]; if (x) byTarget[t.key] = x; });
  const amalan = bsState.amalanSiswa[sk];
  if (!amalan) bsMuatAmalanIndividu();
  const game = bsHitungGame(targets, byTarget, amalan || []);
  const lulusUrut = Object.values(byTarget).filter(x => x.status === 'Lulus' && x.tanggal).sort((a, b) => bsCmp(a.tanggal, b.tanggal));
  const garis = []; lulusUrut.forEach((x, i) => { const last = garis[garis.length - 1]; const lb = bsFmtTgl(x.tanggal, true); if (last && last.label === lb) last.nilai = i + 1; else garis.push({ label: lb, nilai: i + 1 }); });
  const tabel = targets.map(t => { const x = byTarget[t.key]; return `<tr><td>${bsEsc((t.urutan || '') + '. ' + t.nama)}</td><td>${bsChip(x ? x.status : 'Belum Setor')}</td><td style="text-align:center;">${x && x.nilai != null ? bsEsc(x.nilai) : '-'}</td><td style="text-align:center;">${x ? bsEsc(x.percobaan || 1) : '-'}</td><td>${x ? bsEsc(bsFmtTgl(x.tanggal, true)) : '-'}</td><td style="font-size:12px;">${x ? bsEsc(x.catatan || '') : ''}</td></tr>`; }).join('');
  let rumah = '<p class="text-muted" style="font-size:13px;">⏳ Memuat amalan di rumah...</p>';
  if (amalan) {
    const h = bsHariIni(), peta = {}; amalan.forEach(r => { peta[r.tanggal] = r.items || {}; });
    const hari = []; for (let i = 13; i >= 0; i--) hari.push(bsTambahHari(h, -i));
    const sel = hari.map(tg => { const it = peta[tg]; const n = it ? BS_AMALAN.filter(a => it[a.k] === true).length : -1;
      const warna = n < 0 ? '#f3f4f6' : n === 0 ? '#fecaca' : n < BS_AMALAN.length ? '#fde68a' : '#86efac';
      return `<div title="${bsEsc(bsFmtTgl(tg))}: ${n < 0 ? 'belum diisi' : n + '/' + BS_AMALAN.length + ' amalan'}" style="flex:1;min-width:18px;height:28px;border-radius:6px;background:${warna};display:flex;align-items:center;justify-content:center;font-size:10px;color:#374151;">${n < 0 ? '' : n}</div>`; }).join('');
    const isi = hari.filter(tg => peta[tg]);
    const perItem = BS_AMALAN.map(a => { const n = isi.filter(tg => peta[tg][a.k] === true).length; const p = isi.length ? Math.round(n / isi.length * 100) : 0;
      return `<div style="display:grid;grid-template-columns:minmax(110px,1.2fr) 2fr auto;gap:8px;align-items:center;font-size:12px;margin-bottom:5px;"><span>${a.e} ${bsEsc(a.nama)}</span>${bsBarProgres(p, '#2563eb')}<span class="text-muted">${p}%</span></div>`; }).join('');
    rumah = `<div style="display:flex;gap:3px;margin-bottom:4px;">${sel}</div><p class="text-muted" style="font-size:11px;margin-bottom:8px;">14 hari terakhir (angka = jumlah amalan dari ${BS_AMALAN.length}; abu-abu = belum diisi orang tua). Terisi ${isi.length} dari 14 hari.</p>${perItem}`;
  }
  return `<div style="max-width:420px;margin-bottom:12px;"><label class="label">Siswa</label><select class="field" onchange="bsPilihSiswaGrafik(this.value)">${opsi}</select></div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;">
      <p style="font-weight:700;">${bsEsc(s.name)} <span class="text-muted" style="font-weight:400;font-size:12px;">· Kelas ${bsEsc(k)}</span></p>
      <p style="font-size:13px;margin:6px 0;">${game.level.e} Level ${game.level.no} — <strong>${bsEsc(game.level.nama)}</strong> · ⭐ ${game.poin} poin · 🎯 ${game.lulus}/${game.nTarget} target lulus</p>
      ${bsBarProgres(game.nTarget ? game.lulus / game.nTarget * 100 : 0)}</div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">📈 Perkembangan hafalan (jumlah target lulus)</p>${bsSvgGaris(garis, { maks: targets.length, judul: 'Perkembangan hafalan siswa' })}</div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">📋 Status per target</p><div style="overflow-x:auto;"><table><thead><tr><th>Bacaan</th><th>Status</th><th>Nilai</th><th>Percobaan</th><th>Tanggal</th><th>Catatan</th></tr></thead><tbody>${tabel}</tbody></table></div></div>
    <div class="card" style="border:1px solid #e5e7eb;margin-bottom:12px;"><p style="font-weight:700;margin-bottom:8px;">🏡 Amalan di rumah (diisi orang tua)</p>${rumah}</div>
    <div class="card" style="border:1px solid #e5e7eb;"><p style="font-weight:700;margin-bottom:4px;">🏅 Lencana</p>${bsHtmlLencana(game.badges, false)}</div>`;
}

// ============================================================
// 2) AKSES ORANG TUA (disambung dari renderPortalOrtuDashboard di app.js)
// ============================================================
let bsOrtu = { token: 0, siswa: null, targets: [], setoran: {}, amalan: {}, tgl: '', err: '' };

function bsOrtuRender(siswa) {
  const content = bsEl('portalOrtuContent');
  if (!content || !siswa || typeof db === 'undefined') return;
  const lama = bsEl('bsOrtuBox'); if (lama) lama.remove();
  try { bsAnakTutup(); } catch (e) { /* tidak ada overlay */ }
  const box = document.createElement('div'); box.id = 'bsOrtuBox';
  const pertama = content.firstElementChild;
  if (pertama && pertama.nextSibling) content.insertBefore(box, pertama.nextSibling); else content.appendChild(box);
  bsOrtuMuat(siswa);
}
function bsOrtuMuat(siswa) {
  const my = ++bsOrtu.token, ta = bsTA(), box = bsEl('bsOrtuBox');
  if (box) box.innerHTML = '<div class="card" style="margin-bottom:12px;"><p class="text-muted" style="text-align:center;padding:10px;">⏳ Memuat amalan &amp; bacaan shalat...</p></div>';
  Promise.all([
    db.ref('bs_target').orderByChild('tahunAjaran').equalTo(ta).once('value'),
    db.ref('bs_setoran').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
    db.ref('bs_amalan_rumah').orderByChild('siswaKey').equalTo(siswa.key).once('value')
  ]).then(([ts, ss, as]) => {
    if (my !== bsOrtu.token) return;
    const targets = []; ts.forEach(c => { const v = c.val() || {}; if ((v.kelas === '*' || v.kelas === siswa.kelas) && v.aktif !== false) { v.key = c.key; targets.push(v); } });
    targets.sort(bsBandingTarget);
    const setoran = {}; ss.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === ta && v.targetId) setoran[v.targetId] = v; });
    const amalan = {}; as.forEach(c => { const v = c.val() || {}; if (v.tahunAjaran === ta && v.tanggal) amalan[v.tanggal] = v.items || {}; });
    bsOrtu = { token: my, siswa, targets, setoran, amalan, tgl: bsHariIni(), err: '' };
    bsOrtuGambar();
  }).catch(err => {
    if (my !== bsOrtu.token) return;
    const b = bsEl('bsOrtuBox');
    if (b) b.innerHTML = `<div class="card" style="margin-bottom:12px;"><p style="color:#dc2626;font-size:13px;">Gagal memuat Bacaan Shalat: ${bsEsc((err && err.message) || err)}</p></div>`;
  });
}
function bsOrtuDaftarAmalan() { return Object.keys(bsOrtu.amalan).map(tg => ({ tanggal: tg, items: bsOrtu.amalan[tg] })); }
function bsOrtuTargetBerikut() { return bsOrtu.targets.find(t => !(bsOrtu.setoran[t.key] && bsOrtu.setoran[t.key].status === 'Lulus')) || null; }
function bsTglBolehIsi(tgl) { const h = bsHariIni(); return tgl <= h && bsSelisihHari(tgl, h) <= BS_HARI_ISI_MUNDUR; }
function bsOrtuGambar() {
  const box = bsEl('bsOrtuBox'); if (!box || !bsOrtu.siswa) return;
  const o = bsOrtu, h = bsHariIni();
  const game = bsHitungGame(o.targets, o.setoran, bsOrtuDaftarAmalan(), h);
  const tglOps = [0, 1, 2].map(n => { const tg = bsTambahHari(h, -n); return `<button class="btn ${o.tgl === tg ? 'btn-primary' : 'btn-soft'}" style="padding:6px 12px;font-size:12px;" onclick="bsOrtuPilihTgl('${tg}')">${n === 0 ? 'Hari ini' : n === 1 ? 'Kemarin' : '2 hari lalu'}</button>`; }).join('');
  const items = o.amalan[o.tgl] || {};
  const nCek = BS_AMALAN.filter(a => items[a.k] === true).length;
  const cek = BS_AMALAN.map(a => { const on = items[a.k] === true;
    return `<button onclick="bsOrtuToggle('${a.k}')" style="display:flex;align-items:center;gap:8px;text-align:left;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:2px solid ${on ? '#059669' : '#d1d5db'};background:${on ? '#d1fae5' : '#fff'};color:#111827;">
      <span style="font-size:20px;">${a.e}</span><span style="flex:1;">${bsEsc(a.t)}</span><span style="font-size:18px;">${on ? '✅' : '⬜'}</span></button>`; }).join('');
  const berikut = bsOrtuTargetBerikut();
  const baris = o.targets.map(t => { const x = o.setoran[t.key], st = x ? x.status : 'Belum Setor';
    return `<div style="padding:9px 0;border-bottom:1px solid #f1f5f9;">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;"><span style="font-size:13px;font-weight:600;">${bsEsc((t.urutan || '') + '. ' + t.nama)}</span>${bsChip(st)}</div>
      <div class="text-muted" style="font-size:11px;margin-top:2px;">${x ? bsEsc('Dinilai ' + bsFmtTgl(x.tanggal) + (x.guruName ? ' oleh ' + x.guruName : '') + ((x.percobaan || 1) > 1 ? ' · percobaan ke-' + x.percobaan : '') + (x.nilai != null ? ' · nilai ' + x.nilai : '')) : bsEsc(bsLabelTarget(t))}</div>
      ${x && x.catatan ? `<div style="font-size:12px;margin-top:3px;padding:6px 8px;background:#f9fafb;border-radius:6px;">💬 ${bsEsc(x.catatan)}</div>` : ''}</div>`; }).join('');
  const persen = game.nTarget ? Math.round(game.lulus / game.nTarget * 100) : 0;
  box.innerHTML = `
    <div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,#ecfdf5,#fef9c3);border:1px solid #a7f3d0;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div><p style="font-weight:700;">🕌 Bacaan Shalat &amp; Amalan</p>
          <p style="font-size:13px;margin-top:2px;">${game.level.e} Level ${game.level.no} · <strong>${bsEsc(game.level.nama)}</strong> · ⭐ ${game.poin} poin</p></div>
        <button class="btn btn-primary" style="padding:8px 14px;" onclick="bsAnakBuka()">👧 Mode Anak</button>
      </div></div>
    <div class="card" style="margin-bottom:12px;">
      <p style="font-weight:700;margin-bottom:6px;">🏡 Amalan Harian di Rumah</p>
      <p class="text-muted" style="font-size:12px;margin-bottom:8px;">Centang amalan yang sudah dilakukan ${bsEsc(o.siswa.name)}. Tersimpan otomatis. Bisa mengisi hari ini sampai ${BS_HARI_ISI_MUNDUR} hari ke belakang.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">${tglOps}</div>
      <p style="font-size:13px;margin-bottom:8px;"><strong>${nCek}</strong> dari ${BS_AMALAN.length} amalan terisi untuk ${bsEsc(bsFmtTgl(o.tgl))} ${game.rentetanLimaWaktu >= 2 ? ' · 🔥 ' + game.rentetanLimaWaktu + ' hari shalat 5 waktu lengkap berturut-turut' : ''}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;">${cek}</div>
    </div>
    <div class="card" style="margin-bottom:12px;">
      <p style="font-weight:700;margin-bottom:6px;">📿 Progres Setoran Bacaan Shalat</p>
      ${o.targets.length ? `<p style="font-size:13px;margin-bottom:6px;">${game.lulus} dari ${game.nTarget} target lulus (${persen}%)</p>${bsBarProgres(persen)}
        ${berikut ? `<p style="font-size:13px;margin:10px 0 4px;">🎯 Target berikutnya: <strong>${bsEsc(berikut.nama)}</strong> <span class="text-muted" style="font-size:11px;">(${bsEsc(bsLabelTarget(berikut))})</span></p>` : '<p style="font-size:13px;margin:10px 0 4px;color:#059669;font-weight:700;">🎉 Semua target bacaan sudah lulus!</p>'}
        <div style="margin-top:6px;">${baris}</div>` : '<p class="text-muted" style="font-size:13px;">Guru belum membuat target bacaan shalat untuk kelas ini.</p>'}
    </div>`;
}
function bsOrtuPilihTgl(tg) { bsOrtu.tgl = tg; bsOrtuGambar(); }
function bsOrtuToggle(kode) {
  const o = bsOrtu, s = o.siswa; if (!s) return;
  const tg = o.tgl || bsHariIni();
  if (!bsTglBolehIsi(tg)) return toast('⚠️ Hanya bisa mengisi hari ini sampai ' + BS_HARI_ISI_MUNDUR + ' hari ke belakang.', true);
  if (!bsOnline()) return toast('📡 Sedang offline. Checklist butuh koneksi internet.', true);
  const sebelum = Object.assign({}, o.amalan[tg] || {});
  const items = {}; BS_AMALAN.forEach(a => { items[a.k] = sebelum[a.k] === true; });
  items[kode] = !items[kode];
  o.amalan[tg] = items; bsOrtuGambar();
  const rec = { siswaKey: s.key, siswaNama: s.name || '', kelas: s.kelas || '', tanggal: tg, items, diisiOleh: 'ortu', tahunAjaran: bsTA(), updatedAt: new Date().toISOString() };
  const token = o.token;
  db.ref('bs_amalan_rumah/' + s.key + '_' + tg).set(rec).catch(err => {
    if (bsOrtu.token !== token) return;
    if (Object.keys(sebelum).length) bsOrtu.amalan[tg] = sebelum; else delete bsOrtu.amalan[tg];
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
  const h = bsHariIni(), game = bsHitungGame(o.targets, o.setoran, bsOrtuDaftarAmalan(), h), berikut = bsOrtuTargetBerikut();
  const items = o.amalan[h] || {};
  const hariIni = BS_AMALAN.map(a => { const on = items[a.k] === true;
    return `<div style="text-align:center;padding:8px 4px;border-radius:12px;background:${on ? '#bbf7d0' : 'rgba(255,255,255,.7)'};"><div style="font-size:26px;${on ? '' : 'filter:grayscale(1);opacity:.55;'}">${a.e}</div><div style="font-size:11px;font-weight:700;margin-top:2px;">${bsEsc(a.nama)}</div><div style="font-size:14px;">${on ? '✅' : '⬜'}</div></div>`; }).join('');
  const lv = game.level, sisa = lv.berikut != null ? lv.berikut - game.poin : 0;
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
    <div style="background:#fff;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-weight:800;font-size:15px;margin-bottom:6px;">🎯 Target Hafalan Berikutnya</p>
      ${berikut ? `<p style="font-size:20px;font-weight:800;color:#047857;">${bsEsc(berikut.nama)}</p>
        <p class="text-muted" style="font-size:12px;margin:2px 0 8px;">${bsEsc(bsLabelTarget(berikut))}</p>
        ${berikut.teks ? `<div style="padding:10px;background:#f0fdf4;border-radius:10px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${bsEsc(berikut.teks)}</div>` : ''}
        <p style="font-size:13px;margin-top:8px;">Ayo latihan, lalu setor ke Ustadz/Ustadzah di sekolah! 💪</p>`
        : (o.targets.length ? '<p style="font-size:16px;font-weight:700;color:#047857;">🎉 Hebat! Semua target bacaan sudah lulus.</p>' : '<p class="text-muted">Target bacaan belum dibuat oleh guru.</p>')}
      ${o.targets.length ? `<p style="font-size:12px;margin-top:8px;" class="text-muted">Sudah lulus ${game.lulus} dari ${game.nTarget} bacaan.</p>${bsBarProgres(game.nTarget ? game.lulus / game.nTarget * 100 : 0)}` : ''}
    </div>
    <div style="background:#fff;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-weight:800;font-size:15px;margin-bottom:8px;">🏡 Amalanku Hari Ini</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:#ecfdf5;border-radius:12px;padding:8px;">${hariIni}</div>
      ${game.rentetanLimaWaktu >= 1 ? `<p style="font-size:13px;text-align:center;margin-top:8px;">🔥 ${game.rentetanLimaWaktu} hari shalat 5 waktu lengkap berturut-turut!</p>` : '<p class="text-muted" style="font-size:12px;text-align:center;margin-top:8px;">Minta Ayah/Bunda mencentang amalanmu ya!</p>'}
    </div>
    <div style="background:#fff;border-radius:16px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <p style="font-weight:800;font-size:15px;margin-bottom:4px;">🏅 Lencanaku</p>${bsHtmlLencana(game.badges, false)}
    </div></div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden'; el.scrollTop = 0;
}
