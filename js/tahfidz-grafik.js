/* ============================================================
   SI MAMBA - js/tahfidz-grafik.js
   Grafik progres tahfidz & target per kelas (halaman Tahfidz, #page-tahfidz-v4).

   YANG DITAMPILKAN (untuk kelas yang dipilih di dropdown Kelas, per semester)
     1. Grafik garis : capaian KUMULATIF rata-rata per siswa (ayat) vs jalur target vs target akhir.
     2. Batang/siswa : capaian tiap siswa vs target, urut dari yang paling tertinggal.
     3. Ringkasan    : target, rata-rata capaian, jumlah siswa Tercapai / Sesuai jalur / Tertinggal.

   CARA MENGHITUNG
   - Progres = jumlah AYAT dari catatan jenis "Setoran" (tahfidz_v4) pada semester itu. "Murojaah"
     tidak menambah progres (hanya dihitung jumlah sesinya).
   - Jumlah ayat dibaca dari kolom Ayat: "1-7" = 7, "5" = 1, "1-7, 10" = 8, "1,2,3" = 3.
     Kolom Ayat KOSONG tapi nama surah dikenali (tabel 114 surah, ejaan toleran) -> dihitung seluruh ayat surah
     itu dan diberi keterangan; ayat yang melebihi jumlah ayat surahnya dianggap salah ketik.
     Isi yang tidak bisa dibaca (kosong/huruf/rentang terbalik/> 286 ayat per catatan) tidak terhitung dan
     DIBERITAHUKAN di layar (bukan hilang diam-diam).
   - Semester: Ganjil = 1 Jul - 31 Des, Genap = 1 Jan - 30 Jun (sama dengan Kas/Setoran Infaq).
   - Jalur target = garis lurus 0 -> target dari awal sampai akhir semester. "Sesuai jalur" berarti
     capaian siswa >= posisi jalur hari ini.
   - Siswa yang dihitung = daftar siswa kelas itu SAAT INI (v4PanelSiswaCache); catatan siswa yang
     sudah pindah kelas diabaikan.

   TARGET
   - Disimpan di node Firebase baru `tahfidz_target_v4/{TA-dengan-strip}/{Semester}/{Kelas}` =
     { ayat, updatedBy, updatedAt }. Satuan: ayat per siswa per semester, sama untuk semua siswa
     di kelas itu. Hanya Admin yang bisa mengatur/menghapus; Kepsek & PJ tahfidz hanya melihat.
   - Dimuat sendiri di file ini (tidak lewat v4LoadCore) dan di-cache per tahun ajaran.
   - Kalau Firebase Security Rules dipakai: beri akses baca/tulis ke node tahfidz_target_v4.

   KETERGANTUNGAN (milik app.js; dipakai saat fungsi dipanggil)
   - currentUser, currentTahunAjaran, currentSemesterAktif, db, V4, v4TfKelasSel, v4PanelSiswaCache,
     v4CanClass, v4IsAdmin, v4IsHead, v4Safe, escapeJs, tglLokal, toast, addLog, isBusy/setBusy/clearBusy, isReallyOnline,
     ensureLib, v4LoadLogoForPdf, v4LoadTtdKepalaForPdf, v4TambahLogoKeKopPdf (khusus unduhan PDF), MADRASAH.
   - Dimuat SESUDAH js/app.js; dipicu dari akhir v4RenderTahfidz() (satu baris di app.js).
   - Tanpa kelas terpilih, Admin & Kepsek melihat RINGKASAN SEMUA KELAS (thfOverviewCard) dan bisa mengunduhnya
     sebagai PDF (thfExportPDF: ringkasan per kelas + daftar siswa di bawah jalur); guru PJ hanya melihat kelasnya. thfRaporHtml() dipakai v4RenderReportPreview() untuk bagian Tahfidz di raport.
   - Grafik digambar dengan SVG/HTML biasa: tanpa library, tetap jalan offline.
============================================================ */
const THF_HARI_MS = 86400000;
const THF_MAX_AYAT_PER_CATATAN = 286;   // surah terpanjang (Al-Baqarah); lebih dari ini dianggap salah ketik
const THF_MAX_TARGET = 6236;            // jumlah seluruh ayat Al-Qur'an
const THF_WARNA = { tercapai: '#059669', jalur: '#2563eb', tertinggal: '#dc2626', netral: '#059669', target: '#d97706', pace: '#6b7280' };

let _thfUser = null;
let _thfSem = '';                                                  // semester yang dipilih ('' = ikut semester aktif)
let _thfTarget = { ta: null, data: null, memuat: false, gagal: false };   // cache target per tahun ajaran

function thfResetBilaGantiUser() {
  const uid = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name) : null;
  if (uid === _thfUser) return;
  _thfUser = uid; _thfSem = ''; _thfTarget = { ta: null, data: null, memuat: false, gagal: false };
}

// ---------- Baca jumlah ayat dari teks bebas ----------
function thfAngkaLatin(s) {
  return String(s == null ? '' : s)
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
}
// -> { n: jumlah ayat terbaca, ok: true kalau SELURUH isi terbaca, maks: nomor ayat tertinggi yang disebut }
function thfParseAyat(txt) {
  let s = thfAngkaLatin(txt).toLowerCase()
    .replace(/\s*(sampai|s\/d|s\.d\.?|hingga)\s*/g, '-')
    .replace(/[\u2013\u2014\u2012~]/g, '-')
    .replace(/\([^)]*\)/g, ' ')                       // catatan dalam kurung, mis. "1-7 (lancar)"
    .replace(/\b(ayat|ay|ke)\b\.?/g, ' ');
  const bagian = s.split(/[,;&]|\bdan\b/).map(p => p.trim()).filter(Boolean);
  if (!bagian.length) return { n: 0, ok: false, maks: 0 };
  let n = 0, semuaOk = true, maks = 0;
  bagian.forEach(p => {
    let m;
    if (/^\d+$/.test(p)) { n += 1; maks = Math.max(maks, +p); }
    else if ((m = /^(\d+)\s*-\s*(\d+)$/.exec(p)) && +m[2] >= +m[1]) { n += (+m[2] - +m[1] + 1); maks = Math.max(maks, +m[2]); }
    else semuaOk = false;
  });
  if (n > THF_MAX_AYAT_PER_CATATAN) return { n: 0, ok: false, maks };
  return { n, ok: semuaOk && n > 0, maks };
}


// ---------- Tabel surah: untuk catatan yang kolom Ayat-nya kosong ----------
// Setiap entri: [nama, jumlah ayat, [ejaan lain...]]. Pencocokan nama dibuat TOLERAN terhadap ejaan umum
// (Al-Ikhlas / Al Ikhlash / Ikhlas, Adh-Dhuha / Ad-Duha, Asy-Syams / Ash-Shams, dst.), tapi tetap KETAT:
// nama yang tidak dikenali TIDAK ditebak (catatan itu tetap diberi peringatan, bukan dihitung asal).
const THF_SURAH = [
  ['Al-Fatihah', 7, ['Al-Fatiha', 'Ummul Kitab']], ['Al-Baqarah', 286, ['Al-Baqoroh']], ['Ali Imran', 200, ['Al-Imran']], ['An-Nisa', 176, ['An-Nisaa']],
  ['Al-Maidah', 120], ['Al-Anam', 165], ['Al-Araf', 206], ['Al-Anfal', 75], ['At-Taubah', 129, ['Bara-ah', 'At-Tawbah']], ['Yunus', 109],
  ['Hud', 123], ['Yusuf', 111], ['Ar-Rad', 43], ['Ibrahim', 52], ['Al-Hijr', 99], ['An-Nahl', 128], ['Al-Isra', 111, ['Bani Israil']], ['Al-Kahf', 110, ['Al-Kahfi']],
  ['Maryam', 98], ['Taha', 135, ['Ta-Ha', 'Thaha']], ['Al-Anbiya', 112], ['Al-Hajj', 78], ['Al-Muminun', 118], ['An-Nur', 64], ['Al-Furqan', 77], ['Asy-Syuara', 227],
  ['An-Naml', 93], ['Al-Qasas', 88], ['Al-Ankabut', 69], ['Ar-Rum', 60], ['Luqman', 34], ['As-Sajdah', 30], ['Al-Ahzab', 73], ['Saba', 54],
  ['Fatir', 45], ['Yasin', 83, ['Yaasiin']], ['As-Saffat', 182], ['Sad', 88], ['Az-Zumar', 75], ['Gafir', 85, ['Al-Mumin', 'Ghafir']], ['Fussilat', 54, ['Ha-Mim Sajdah']], ['Asy-Syura', 53],
  ['Az-Zukhruf', 89], ['Ad-Dukhan', 59], ['Al-Jasiyah', 37], ['Al-Ahqaf', 35], ['Muhammad', 38], ['Al-Fath', 29], ['Al-Hujurat', 18], ['Qaf', 45],
  ['Az-Zariyat', 60], ['At-Tur', 49], ['An-Najm', 62], ['Al-Qamar', 55], ['Ar-Rahman', 78], ['Al-Waqiah', 96], ['Al-Hadid', 29], ['Al-Mujadalah', 22],
  ['Al-Hasyr', 24], ['Al-Mumtahanah', 13], ['As-Saff', 14], ['Al-Jumuah', 11], ['Al-Munafiqun', 11], ['At-Tagabun', 18, ['At-Taghabun']], ['At-Talaq', 12], ['At-Tahrim', 12],
  ['Al-Mulk', 30, ['Tabarak']], ['Al-Qalam', 52, ['Nun']], ['Al-Haqqah', 52], ['Al-Maarij', 44], ['Nuh', 28], ['Al-Jinn', 28], ['Al-Muzzammil', 20, ['Al-Muzammil']], ['Al-Muddassir', 56, ['Al-Muddatsir', 'Al-Mudatsir']],
  ['Al-Qiyamah', 40], ['Al-Insan', 31, ['Ad-Dahr']], ['Al-Mursalat', 50], ['An-Naba', 40], ['An-Naziat', 46], ['Abasa', 42], ['At-Takwir', 29], ['Al-Infitar', 19],
  ['Al-Mutaffifin', 36, ['Al-Mutoffifin']], ['Al-Insyiqaq', 25, ['Al-Insyiqoq']], ['Al-Buruj', 22], ['At-Tariq', 17], ['Al-Ala', 19], ['Al-Gasyiyah', 26, ['Al-Ghosyiyah']], ['Al-Fajr', 30], ['Al-Balad', 20],
  ['Asy-Syams', 15, ['Asy-Syamsi']], ['Al-Lail', 21, ['Al-Layl']], ['Ad-Duha', 11, ['Ad-Dhuha', 'Adh-Dhuha']], ['Asy-Syarh', 8, ['Al-Insyirah', 'Alam Nasyrah', 'Insyirah', 'Al-Inshirah']], ['At-Tin', 8], ['Al-Alaq', 19, ['Al-Alak', 'Iqra']], ['Al-Qadr', 5, ['Al-Qodr']], ['Al-Bayyinah', 8],
  ['Az-Zalzalah', 8, ['Az-Zilzal', 'Al-Zalzalah']], ['Al-Adiyat', 11], ['Al-Qariah', 11, ['Al-Qoriah']], ['At-Takasur', 8, ['At-Takatsur', 'At-Takathur']], ['Al-Asr', 3, ['Al-Ashr']], ['Al-Humazah', 9], ['Al-Fil', 5], ['Quraisy', 4, ['Quraish', 'Quraysh', 'Al-Quraisy']],
  ['Al-Maun', 7], ['Al-Kausar', 3, ['Al-Kautsar', 'Al-Kawthar']], ['Al-Kafirun', 6], ['An-Nasr', 3, ['An-Nashr']], ['Al-Masad', 5, ['Al-Lahab', 'Tabbat']], ['Al-Ikhlas', 4, ['Al-Ikhlash']], ['Al-Falaq', 5, ['Al-Falak']], ['An-Nas', 6, ['An-Naas']]
];
const THF_ARTIKEL = /^(asy|ash|adh|adz|ath|ats|azh|al|an|as|ar|ad|at|az)(?=[a-z]{3,})/;
function thfNormNama(huruf) {                // huruf: hanya a-z. -> bentuk fonetik terlipat
  return huruf.replace(/gh/g, 'g').replace(/dh|dz/g, 'd').replace(/zh/g, 'z').replace(/th/g, 't').replace(/ts/g, 's').replace(/sh|sy/g, 's').replace(/([a-z])\1+/g, '$1');
}
function thfKunciNama(nama) {                // -> [bentuk penuh, bentuk tanpa artikel]
  const huruf = String(nama == null ? '' : nama).toLowerCase().replace(/\b(surat|surah|qs|q\.s)\b\.?/g, ' ').replace(/[^a-z]/g, '');
  if (!huruf) return [];
  const tanpa = huruf.replace(THF_ARTIKEL, '');
  return [thfNormNama(huruf), thfNormNama(tanpa)];
}
let _thfIndeksSurah = null;
function thfIndeksSurah() {
  if (_thfIndeksSurah) return _thfIndeksSurah;
  const peta = new Map(), ambigu = new Set();
  THF_SURAH.forEach((x, i) => {
    const kunciSurah = new Set();
    [x[0]].concat(x[2] || []).forEach(nm => thfKunciNama(nm).forEach(k => k && kunciSurah.add(k)));
    kunciSurah.forEach(k => { if (peta.has(k) && peta.get(k) !== i) ambigu.add(k); else peta.set(k, i); });
  });
  ambigu.forEach(k => peta.delete(k));        // kunci yang bisa berarti dua surah dibuang: lebih baik tidak dikenali daripada salah
  _thfIndeksSurah = { peta, ambigu };
  return _thfIndeksSurah;
}
// -> { nama, ayat } | null  (menerima nama atau nomor surah 1-114)
function thfSurahCari(teks) {
  const mentah = String(teks == null ? '' : teks).trim();
  if (!mentah) return null;
  const angka = /^(?:surat|surah|qs|q\.s\.?|ke|no\.?|nomor|\s)*(\d{1,3})$/i.exec(thfAngkaLatin(mentah));
  if (angka) { const n = +angka[1]; return (n >= 1 && n <= 114) ? { nama: THF_SURAH[n - 1][0], ayat: THF_SURAH[n - 1][1] } : null; }
  const idx = thfIndeksSurah().peta, kunci = thfKunciNama(thfAngkaLatin(mentah));
  for (const k of kunci) { if (k && idx.has(k)) { const x = THF_SURAH[idx.get(k)]; return { nama: x[0], ayat: x[1] }; } }
  return null;
}
// Jumlah ayat satu catatan. Kolom Ayat KOSONG + nama surah dikenali -> seluruh surah (perkiraan=true).
// Ayat yang disebut melebihi jumlah ayat surahnya -> dianggap salah ketik (tidak dihitung, diberi peringatan).
function thfAyatCatatan(x) {
  const p = thfParseAyat(x.ayat), s = thfSurahCari(x.surah);
  if (s) {
    if (!thfAngkaLatin(x.ayat).trim()) return { n: s.ayat, ok: true, perkiraan: true, maks: s.ayat };
    if (p.maks > s.ayat) return { n: 0, ok: false, maks: p.maks, melebihi: true };
  }
  return p;
}

// ---------- Tanggal & semester ----------
function thfTgl(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function thfRentangSemester(sem) {
  const thn = parseInt(String(currentTahunAjaran).split('/')[0], 10) || new Date().getFullYear();
  return sem === 'Genap'
    ? { dari: new Date(thn + 1, 0, 1), sampai: new Date(thn + 1, 5, 30) }
    : { dari: new Date(thn, 6, 1), sampai: new Date(thn, 11, 31) };
}
function thfHariKe(d, dari) { return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - dari) / THF_HARI_MS); }
function thfSemAktif() {
  if (_thfSem === 'Ganjil' || _thfSem === 'Genap') return _thfSem;
  return (typeof currentSemesterAktif !== 'undefined' && currentSemesterAktif === 'Genap') ? 'Genap' : 'Ganjil';
}
function thfTaKey() { return String(currentTahunAjaran).replace(/\//g, '-'); }

// ---------- Perhitungan (murni, tanpa DOM) ----------
function thfStatus(ayat, target, jalurHariIni) {
  if (!target) return null;
  if (ayat >= target) return 'tercapai';
  if (jalurHariIni != null && ayat >= jalurHariIni) return 'jalur';
  return 'tertinggal';
}
function thfHitung(roster, records, sem, hariIni, target) {
  const r = thfRentangSemester(sem);
  const totalHari = thfHariKe(r.sampai, r.dari) + 1;
  const nMinggu = Math.ceil(totalHari / 7);
  const hariIniIdx = thfHariKe(hariIni, r.dari);
  const mulai = hariIniIdx >= 0;
  const idxSkrg = Math.min(hariIniIdx, totalHari - 1);
  const per = {};
  roster.forEach(s => { per[s.key] = { siswa: s, ayat: 0, setoran: 0, murojaah: 0 }; });
  const mingguan = new Array(nMinggu).fill(0);
  const harian = {};                      // idxHari -> total ayat (untuk titik grafik yang akurat per hari)
  let tidakPasti = 0, perkiraan = 0;
  (records || []).forEach(x => {
    const sw = per[x.studentId]; if (!sw) return;
    const d = thfTgl(x.tanggal); if (!d) return;
    const idx = thfHariKe(d, r.dari);
    if (idx < 0 || idx >= totalHari || idx > idxSkrg) return;     // di luar semester / belum terjadi
    if (String(x.type || '').toLowerCase() === 'murojaah') { sw.murojaah += 1; return; }
    sw.setoran += 1;
    const p = thfAyatCatatan(x);
    if (!p.ok) tidakPasti += 1;
    if (p.perkiraan) perkiraan += 1;
    sw.ayat += p.n;
    harian[idx] = (harian[idx] || 0) + p.n;
    mingguan[Math.min(nMinggu - 1, Math.floor(idx / 7))] += p.n;
  });
  const jumlahSiswa = roster.length;
  const jalurHariIni = (target && mulai) ? target * Math.min(1, (idxSkrg + 1) / totalHari) : null;
  const siswa = Object.keys(per).map(k => per[k]);
  siswa.forEach(sw => { sw.status = thfStatus(sw.ayat, target, jalurHariIni); sw.persen = target ? Math.round(sw.ayat / target * 100) : null; });
  const totalAyat = siswa.reduce((a, s) => a + s.ayat, 0);
  // Titik kumulatif rata-rata per siswa: awal semester, akhir tiap minggu, dan hari ini.
  const titik = [];
  if (mulai && jumlahSiswa > 0) {
    titik.push({ hari: 0, nilai: 0 });
    let kum = 0, h = 0;
    const akhir = idxSkrg;
    while (h <= akhir) {
      const hAkhirBlok = Math.min(h + 6, akhir);
      for (let i = h; i <= hAkhirBlok; i++) kum += (harian[i] || 0);
      titik.push({ hari: hAkhirBlok + 1, nilai: kum / jumlahSiswa });
      h = hAkhirBlok + 1;
    }
  }
  return {
    r, sem, totalHari, nMinggu, mulai, idxSkrg, jumlahSiswa, siswa, titik, mingguan, tidakPasti, perkiraan, totalAyat,
    rata: jumlahSiswa ? totalAyat / jumlahSiswa : 0, jalurHariIni,
    jml: {
      tercapai: siswa.filter(s => s.status === 'tercapai').length,
      jalur: siswa.filter(s => s.status === 'jalur').length,
      tertinggal: siswa.filter(s => s.status === 'tertinggal').length
    }
  };
}

// ---------- Gambar grafik garis (SVG) ----------
function thfLangkahBagus(v) {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}
function thfFmt(n) { return (Math.round(n * 10) / 10).toLocaleString('id-ID'); }
function thfSvgGaris(d, target) {
  const W = 640, H = 270, ml = 46, mr = 18, mt = 16, mb = 36, pw = W - ml - mr, ph = H - mt - mb;
  const maxAktual = d.titik.length ? d.titik[d.titik.length - 1].nilai : 0;
  const puncak = Math.max(target || 0, maxAktual, 1);
  const langkah = thfLangkahBagus(puncak / 4);
  const ymax = langkah * Math.ceil(puncak / langkah);
  const X = h => ml + pw * (h / d.totalHari), Y = v => mt + ph * (1 - v / ymax);
  let g = '';
  for (let v = 0; v <= ymax + 1e-9; v += langkah) {
    g += `<line x1="${ml}" y1="${Y(v).toFixed(1)}" x2="${W - mr}" y2="${Y(v).toFixed(1)}" stroke="rgba(128,128,128,.28)" stroke-width="1"/>`
      + `<text x="${ml - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="currentColor">${thfFmt(v)}</text>`;
  }
  const bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  for (let m = 0; m < 6; m++) {
    const tgl = new Date(d.r.dari.getFullYear(), d.r.dari.getMonth() + m, 1);
    const hh = thfHariKe(tgl, d.r.dari);
    if (hh < 0 || hh > d.totalHari) continue;
    g += `<line x1="${X(hh).toFixed(1)}" y1="${mt}" x2="${X(hh).toFixed(1)}" y2="${mt + ph}" stroke="rgba(128,128,128,.14)"/>`
      + `<text x="${X(hh).toFixed(1)}" y="${H - 14}" font-size="10" fill="currentColor" text-anchor="start">${bln[tgl.getMonth()]}</text>`;
  }
  if (target) {
    g += `<line x1="${ml}" y1="${Y(target).toFixed(1)}" x2="${W - mr}" y2="${Y(target).toFixed(1)}" stroke="${THF_WARNA.target}" stroke-width="1.6" stroke-dasharray="2 3"/>`
      + `<text x="${W - mr}" y="${(Y(target) - 4).toFixed(1)}" text-anchor="end" font-size="10" font-weight="700" fill="${THF_WARNA.target}">Target ${thfFmt(target)}</text>`
      + `<line x1="${X(0).toFixed(1)}" y1="${Y(0).toFixed(1)}" x2="${X(d.totalHari).toFixed(1)}" y2="${Y(target).toFixed(1)}" stroke="${THF_WARNA.pace}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  }
  if (d.mulai && d.idxSkrg < d.totalHari - 1) {
    g += `<line x1="${X(d.idxSkrg + 1).toFixed(1)}" y1="${mt}" x2="${X(d.idxSkrg + 1).toFixed(1)}" y2="${mt + ph}" stroke="rgba(128,128,128,.55)" stroke-width="1"/>`
      + `<text x="${(X(d.idxSkrg + 1) + 3).toFixed(1)}" y="${mt + 9}" font-size="9" fill="currentColor">hari ini</text>`;
  }
  if (d.titik.length) {
    const pts = d.titik.map(t => `${X(t.hari).toFixed(1)},${Y(t.nilai).toFixed(1)}`).join(' ');
    g += `<polyline points="${pts}" fill="none" stroke="${THF_WARNA.tercapai}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    const last = d.titik[d.titik.length - 1];
    g += `<circle cx="${X(last.hari).toFixed(1)}" cy="${Y(last.nilai).toFixed(1)}" r="4" fill="${THF_WARNA.tercapai}"/>`;
  }
  const ringkas = `Capaian kumulatif rata-rata per siswa ${thfFmt(d.rata)} ayat${target ? ` dari target ${thfFmt(target)} ayat` : ''}, semester ${d.sem}.`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${ringkas}" style="max-width:720px;display:block;"><title>${ringkas}</title>${g}</svg>`;
}

// ---------- Batang per siswa (HTML) ----------
function thfBatangHtml(d, target) {
  const maxAyat = d.siswa.reduce((a, s) => Math.max(a, s.ayat), 0);
  const skala = Math.max(target || 0, maxAyat, 1);
  const label = { tercapai: '✅ Tercapai', jalur: '🔵 Sesuai jalur', tertinggal: '🔻 Tertinggal' };
  const urut = (typeof COLLATOR_ID !== 'undefined') ? (a, b) => COLLATOR_ID.compare(a, b) : (a, b) => String(a).localeCompare(String(b));
  const baris = d.siswa.slice().sort((a, b) => (a.ayat - b.ayat) || urut(a.siswa.name || '', b.siswa.name || '')).map(sw => {
    const warna = sw.status ? THF_WARNA[sw.status] : THF_WARNA.netral;
    const lebar = Math.min(100, sw.ayat / skala * 100).toFixed(1);
    const penandaTarget = target ? `<div style="position:absolute;top:-2px;bottom:-2px;left:calc(${(target / skala * 100).toFixed(1)}% - 1px);width:2px;background:${THF_WARNA.target};"></div>` : '';
    const penandaJalur = (target && d.jalurHariIni != null && d.jalurHariIni < target) ? `<div style="position:absolute;top:-2px;bottom:-2px;left:calc(${(d.jalurHariIni / skala * 100).toFixed(1)}% - 1px);width:2px;background:${THF_WARNA.pace};opacity:.8;"></div>` : '';
    const angka = target ? `${thfFmt(sw.ayat)} / ${thfFmt(target)} ayat (${sw.persen}%)` : `${thfFmt(sw.ayat)} ayat`;
    return `<div style="padding:7px 0;border-bottom:1px solid rgba(128,128,128,.2);">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;"><strong>${v4Safe(sw.siswa.name)}</strong><span style="white-space:nowrap;">${angka}</span></div>
      <div style="position:relative;height:10px;border-radius:6px;background:rgba(128,128,128,.22);margin:5px 0;"><div style="height:100%;width:${lebar}%;border-radius:6px;background:${warna};"></div>${penandaJalur}${penandaTarget}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:10px;color:#6b7280;">${sw.status ? `<span style="font-weight:700;color:${warna};">${label[sw.status]}</span>` : ''}<span>📖 ${sw.setoran} setoran</span><span>🔁 ${sw.murojaah} murojaah</span></div>
    </div>`;
  }).join('');
  return `<div>${baris}</div>`;
}

// ---------- Target (Firebase) ----------
function thfTargetKelas(sem, kelas) {
  thfResetBilaGantiUser();                 // jaga cache target tidak terbawa saat pengguna berganti (juga dipakai raport)
  const dt = _thfTarget.ta === currentTahunAjaran ? _thfTarget.data : null;
  const n = dt && dt[sem] && dt[sem][kelas] ? Number(dt[sem][kelas].ayat) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
function thfMuatTarget() {
  thfResetBilaGantiUser();
  const ta = currentTahunAjaran;
  if (_thfTarget.memuat || (_thfTarget.ta === ta && _thfTarget.data)) return;
  _thfTarget.memuat = true;
  const selesai = (data, gagal) => {
    if (currentTahunAjaran !== ta) { _thfTarget.memuat = false; return; }
    _thfTarget = { ta, data: data || {}, memuat: false, gagal: !!gagal };
    thfGrafikRender();
    try { const rp = document.getElementById('v4ReportPreview'); if (rp && rp.innerHTML && typeof v4RenderReportPreview === 'function') v4RenderReportPreview(); } catch (e) { console.warn('[SI MAMBA] segarkan raport setelah target termuat gagal:', e); }
  };
  try {
    db.ref('tahfidz_target_v4/' + thfTaKey()).once('value')
      .then(snap => selesai(snap.val(), false))
      .catch(err => { console.warn('[SI MAMBA] Gagal memuat target tahfidz:', err && err.message ? err.message : err); selesai({}, true); });
  } catch (e) { console.warn('[SI MAMBA] Gagal memuat target tahfidz:', e); selesai({}, true); }
}
function thfPathTarget(sem, kelas) { return `tahfidz_target_v4/${thfTaKey()}/${sem}/${kelas}`; }
function thfSimpanTarget() {
  if (!v4IsAdmin()) return toast('Hanya Admin yang bisa mengatur target tahfidz!', true);
  if (isBusy('thfSimpanTarget')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Pengaturan target butuh koneksi internet — coba lagi setelah online.', true);
  const kelas = v4TfKelasSel; if (!kelas) return toast('Pilih kelas dulu!', true);
  if (/[.#$\[\]\/]/.test(kelas)) return toast('Nama kelas mengandung karakter yang tidak didukung untuk penyimpanan target.', true);
  const el = document.getElementById('thfTargetInput'), raw = String(el ? el.value : '').trim(), n = Number(raw);
  if (raw === '' || !Number.isInteger(n) || n < 1 || n > THF_MAX_TARGET) return toast(`Target harus bilangan bulat 1 - ${THF_MAX_TARGET.toLocaleString('id-ID')} ayat!`, true);
  const sem = thfSemAktif(), btn = document.getElementById('thfBtnSimpan');
  setBusy('thfSimpanTarget', btn);
  db.ref(thfPathTarget(sem, kelas)).set({ ayat: n, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }).then(() => {
    clearBusy('thfSimpanTarget', btn);
    const dt = (_thfTarget.ta === currentTahunAjaran && _thfTarget.data) ? _thfTarget.data : {};
    dt[sem] = dt[sem] || {}; dt[sem][kelas] = { ayat: n };
    _thfTarget = { ta: currentTahunAjaran, data: dt, memuat: false, gagal: false };
    toast(`✅ Target ${kelas} semester ${sem}: ${n.toLocaleString('id-ID')} ayat per siswa.`);
    try { addLog('atur_target_tahfidz', `${kelas} - ${sem} - ${n} ayat`); } catch (e) { console.error('[SI MAMBA] addLog target tahfidz gagal:', e); }
    thfGrafikRender();
  }).catch(err => { clearBusy('thfSimpanTarget', btn); console.error('[SI MAMBA] Gagal simpan target tahfidz:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
}
function thfHapusTarget() {
  if (!v4IsAdmin()) return toast('Hanya Admin!', true);
  if (isBusy('thfHapusTarget')) return;
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  const kelas = v4TfKelasSel, sem = thfSemAktif();
  if (!kelas || thfTargetKelas(sem, kelas) === null) return;
  if (!confirm(`Hapus target tahfidz ${kelas} semester ${sem}?`)) return;
  setBusy('thfHapusTarget');
  db.ref(thfPathTarget(sem, kelas)).remove().then(() => {
    clearBusy('thfHapusTarget');
    if (_thfTarget.data && _thfTarget.data[sem]) delete _thfTarget.data[sem][kelas];
    toast('✅ Target tahfidz dihapus.');
    try { addLog('hapus_target_tahfidz', `${kelas} - ${sem}`); } catch (e) { console.error('[SI MAMBA] addLog hapus target gagal:', e); }
    thfGrafikRender();
  }).catch(err => { clearBusy('thfHapusTarget'); toast('❌ Gagal menghapus: ' + (err && err.message || err), true); });
}
function thfGantiSemester(v) { _thfSem = (v === 'Genap') ? 'Genap' : 'Ganjil'; thfGrafikRender(); }

// ---------- Ringkasan semua kelas (Admin & Kepsek), tampil saat belum ada kelas dipilih ----------
function thfRosterKelas(k) {
  if (typeof v4PanelSiswaCache !== 'undefined' && v4PanelSiswaCache[k]) return v4PanelSiswaCache[k];
  return (allSiswa || []).filter(s => s.kelas === k);
}
function thfBukaKelas(kelas) {
  const sel = document.getElementById('v4TahfidzKelas');
  if (sel) sel.value = kelas;
  v4SetTahfidzKelas(kelas);
}
function thfOverviewCard() {
  const sem = thfSemAktif(), r = thfRentangSemester(sem), sekarang = new Date();
  const kontrol = `<div style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:end;"><div><label class="label" style="font-size:11px;">Semester</label><select class="field" style="font-size:12px;padding:5px;max-width:140px;" onchange="thfGantiSemester(this.value)"><option value="Ganjil"${sem === 'Ganjil' ? ' selected' : ''}>Ganjil</option><option value="Genap"${sem === 'Genap' ? ' selected' : ''}>Genap</option></select></div><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" onclick="thfExportPDF()">📄 Unduh PDF</button></div>`;
  const bungkus = isi => `<div style="border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:12px 14px;"><h4 style="font-size:14px;font-weight:700;margin-bottom:2px;">📈 Ringkasan Tahfidz Semua Kelas</h4><p class="v4-muted" style="font-size:11px;margin-bottom:10px;">Rata-rata capaian setoran per siswa vs target semester tiap kelas. Pilih kelas (tombol Lihat atau dropdown di atas) untuk grafik rinci dan pengaturan target.</p>${kontrol}${isi}</div>`;
  if (thfHariKe(sekarang, r.dari) < 0) return bungkus(`<p class="v4-muted">Semester ${sem} belum dimulai.</p>`);
  const label = { tercapai: '✅ Tercapai', jalur: '🔵 Sesuai jalur', tertinggal: '🔻 Tertinggal' };
  let nOk = 0, nTinggal = 0, nBelum = 0;
  const baris = KELAS_LIST.map(k => {
    const roster = thfRosterKelas(k), target = thfTargetKelas(sem, k);
    const d = thfHitung(roster, (V4 && V4.tahfidz) || [], sem, sekarang, target);
    const st = (target && roster.length) ? thfStatus(d.rata, target, d.jalurHariIni) : null;
    if (!target) nBelum++; else if (st === 'tertinggal') nTinggal++; else if (st) nOk++;
    const persen = target ? Math.min(100, d.rata / target * 100) : 0, warna = st ? THF_WARNA[st] : THF_WARNA.netral;
    const penandaJalur = (target && d.jalurHariIni != null && d.jalurHariIni < target) ? `<div style="position:absolute;top:-2px;bottom:-2px;left:calc(${(d.jalurHariIni / target * 100).toFixed(1)}% - 1px);width:2px;background:${THF_WARNA.pace};"></div>` : '';
    const bar = target ? `<div style="position:relative;height:10px;min-width:90px;border-radius:6px;background:rgba(128,128,128,.22);"><div style="height:100%;width:${persen.toFixed(1)}%;border-radius:6px;background:${warna};"></div>${penandaJalur}</div>` : '';
    return `<tr><td style="font-weight:600;white-space:nowrap;vertical-align:top;">${v4Safe(k)}</td><td style="vertical-align:top;text-align:center;">${roster.length || '-'}</td>
      <td style="vertical-align:top;white-space:nowrap;">${target ? thfFmt(target) + ' ayat' : '<span style="color:#b45309;">belum diatur</span>'}</td>
      <td style="vertical-align:top;">${roster.length ? thfFmt(d.rata) + ' ayat' + (target ? ` <span style="color:#6b7280;">(${Math.round(d.rata / target * 100)}%)</span>` : '') : '-'}${bar}</td>
      <td style="vertical-align:top;font-size:11px;">${st ? `<span style="font-weight:700;color:${warna};">${label[st]}</span><div style="color:#6b7280;">${d.jml.tertinggal} siswa tertinggal</div>` : '-'}</td>
      <td style="vertical-align:top;"><button class="btn btn-soft" style="padding:3px 10px;font-size:11px;" onclick="thfBukaKelas('${escapeJs(k)}')">Lihat</button></td></tr>`;
  }).join('');
  const ringkas = `${nOk} kelas tercapai/sesuai jalur • ${nTinggal} tertinggal${nBelum ? ` • ${nBelum} kelas belum diatur targetnya` : ''}`;
  const infoMuat = _thfTarget.memuat ? '<div style="font-size:11px;color:#92400e;margin-bottom:6px;">⏳ Memuat target...</div>' : (_thfTarget.gagal ? '<div style="font-size:11px;color:#92400e;margin-bottom:6px;">⚠️ Target tidak bisa dimuat (periksa koneksi/izin).</div>' : '');
  return bungkus(`${infoMuat}<div style="font-size:12px;margin-bottom:8px;">${ringkas}</div><div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Siswa</th><th>Target</th><th>Rata-rata Capaian</th><th>Status</th><th></th></tr></thead><tbody>${baris}</tbody></table></div>
    <p style="font-size:10px;color:#6b7280;margin-top:8px;">Garis abu pada batang = posisi jalur target hari ini. Status kelas dihitung dari rata-rata capaian per siswa.</p>`);
}

// ---------- Unduh PDF ringkasan semua kelas (Admin & Kepsek) ----------
// Data dihitung dengan fungsi yang sama dengan kartu ringkasan (thfHitung/thfStatus), jadi angkanya identik.
function thfOverviewData(sem) {
  const sekarang = new Date();
  return KELAS_LIST.map(k => {
    const roster = thfRosterKelas(k), target = thfTargetKelas(sem, k);
    const d = thfHitung(roster, (V4 && V4.tahfidz) || [], sem, sekarang, target);
    const status = (target && roster.length) ? thfStatus(d.rata, target, d.jalurHariIni) : null;
    return { kelas: k, jumlah: roster.length, target, d, status, tertinggal: target ? d.siswa.filter(s => s.status === 'tertinggal') : [] };
  });
}
async function thfExportPDF() {
  if (!(v4IsAdmin() || v4IsHead())) return toast('Tidak diizinkan!', true);
  const sem = thfSemAktif(), r = thfRentangSemester(sem);
  if (thfHariKe(new Date(), r.dari) < 0) return toast(`Semester ${sem} belum dimulai.`, true);
  if (_thfTarget.memuat) return toast('Target masih dimuat, coba lagi sebentar.', true);
  try { await ensureLib('pdf'); } catch (e) { console.error('[SI MAMBA] Gagal memuat modul PDF', e); return toast('❌ Modul PDF belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
  const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); const pw = doc.internal.pageSize.getWidth();
  if (typeof doc.autoTable !== 'function') { console.error('[SI MAMBA] jspdf-autotable tidak tersedia setelah ensureLib("pdf")'); return toast('❌ Modul tabel PDF (autotable) belum termuat. Muat ulang halaman lalu coba lagi.', true); }
  const [logoData, ttdKepalaData] = await Promise.all([v4LoadLogoForPdf(), v4LoadTtdKepalaForPdf()]);
  const rows = thfOverviewData(sem);
  const offY = MADRASAH.nsm ? 5 : 0;
  v4TambahLogoKeKopPdf(doc, logoData, offY);
  doc.setFontSize(16); doc.text(MADRASAH.nama || '', pw / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  if (MADRASAH.nsm) { doc.setFont(undefined, 'bold'); doc.text(`NSM: ${MADRASAH.nsm}`, pw / 2, 25, { align: 'center' }); doc.setFont(undefined, 'normal'); }
  doc.text(MADRASAH.alamat || '', pw / 2, 27 + offY, { align: 'center' });
  const kontak = [MADRASAH.telp ? 'Telp. ' + MADRASAH.telp : '', MADRASAH.email || '', MADRASAH.website || ''].filter(Boolean).join(' | ');
  if (kontak) doc.text(kontak, pw / 2, 33 + offY, { align: 'center' });
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(15, 38 + offY, pw - 15, 38 + offY); doc.line(15, 40 + offY, pw - 15, 40 + offY);
  const y = 49 + offY;
  doc.setFontSize(14); doc.text('REKAP CAPAIAN TAHFIDZ SEMUA KELAS', pw / 2, y, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Tahun Ajaran ${currentTahunAjaran} - Semester ${sem}`, pw / 2, y + 6, { align: 'center' });
  doc.text(`Capaian setoran sampai ${tglLokal()}`, pw / 2, y + 11, { align: 'center' });
  const gaya = { theme: 'grid', styles: { fontSize: 8, cellPadding: 1.6 }, headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' }, margin: { left: 15, right: 15 } };
  const namaStatus = { tercapai: 'Tercapai', jalur: 'Sesuai jalur', tertinggal: 'Tertinggal' };
  doc.autoTable(Object.assign({}, gaya, {
    startY: y + 16, head: [['Kelas', 'Siswa', 'Target (ayat)', 'Rata-rata (ayat)', '% Target', 'Status', 'Siswa Tertinggal']],
    body: rows.map(x => [x.kelas, x.jumlah ? String(x.jumlah) : '-', x.target ? thfFmt(x.target) : 'belum diatur', x.jumlah ? thfFmt(x.d.rata) : '-',
      (x.target && x.jumlah) ? Math.round(x.d.rata / x.target * 100) + '%' : '-', x.status ? namaStatus[x.status] : '-', x.target && x.jumlah ? String(x.tertinggal.length) : '-']),
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 6: { halign: 'center' } }
  }));
  let yc = doc.lastAutoTable.finalY + 8;
  const urut = (typeof COLLATOR_ID !== 'undefined') ? (a, b) => COLLATOR_ID.compare(a, b) : (a, b) => String(a).localeCompare(String(b));
  const tertinggal = [];
  rows.forEach(x => x.tertinggal.forEach(sw => tertinggal.push({ kelas: x.kelas, nama: sw.siswa.name || '', ayat: sw.ayat, persen: sw.persen, setoran: sw.setoran })));
  tertinggal.sort((a, b) => urut(a.kelas, b.kelas) || (a.ayat - b.ayat) || urut(a.nama, b.nama));
  if (tertinggal.length) {
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Siswa di bawah jalur target', 15, yc); doc.setFont(undefined, 'normal');
    doc.autoTable(Object.assign({}, gaya, {
      startY: yc + 3, head: [['Kelas', 'Nama Siswa', 'Capaian (ayat)', '% Target', 'Catatan Setoran']],
      body: tertinggal.map(t => [t.kelas, t.nama, thfFmt(t.ayat), t.persen + '%', String(t.setoran)]),
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } }
    }));
    yc = doc.lastAutoTable.finalY + 6;
  } else if (rows.some(x => x.target)) {
    doc.setFontSize(10); doc.text('Tidak ada siswa di bawah jalur target.', 15, yc); yc += 8;
  }
  if (yc > 270) { doc.addPage(); yc = 20; }
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text('Capaian = jumlah ayat dari catatan Setoran semester ini (murojaah tidak dihitung). Jalur target = garis lurus dari awal sampai akhir semester; siswa "tertinggal" bila capaiannya di bawah posisi jalur hari ini. Catatan setoran tanpa isian Ayat dihitung seluruh ayat surahnya; catatan yang jumlah ayatnya tidak terbaca belum terhitung.', 15, yc, { maxWidth: pw - 30 });
  doc.setTextColor(0);
  let ySign = yc + 14;
  if (ySign > 235) { doc.addPage(); ySign = 20; }
  const xKiri = 50, xKanan = pw - 50;
  doc.setFontSize(10);
  doc.text('Dibuat oleh,', xKiri, ySign, { align: 'center' }); doc.text(v4IsAdmin() ? 'Admin Madrasah' : 'Kepala Madrasah', xKiri, ySign + 5, { align: 'center' });
  doc.text('Mengetahui,', xKanan, ySign, { align: 'center' }); doc.text('Kepala Madrasah', xKanan, ySign + 5, { align: 'center' });
  if (ttdKepalaData) {
    try {
      const ttdW = 32; const props = doc.getImageProperties(ttdKepalaData);
      doc.addImage(ttdKepalaData, 'PNG', xKanan - ttdW / 2, ySign + 7, ttdW, Math.min(16, ttdW * (props.height / props.width)));
    } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF Tahfidz:', e); }
  }
  const yNama = ySign + 28;
  doc.text(currentUser.name || '(............................)', xKiri, yNama, { align: 'center' });
  doc.text(MADRASAH.kepala_sekolah || '', xKanan, yNama, { align: 'center' });
  if (MADRASAH.nip_kepala_sekolah) doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, xKanan, yNama + 5, { align: 'center' });
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 15, doc.internal.pageSize.getHeight() - 8);
  doc.save(`Rekap_Tahfidz_${sem}_${String(currentTahunAjaran).replace('/', '-')}.pdf`); toast('📥 PDF Rekap Tahfidz berhasil diunduh!');
  try { addLog('unduh_rekap_tahfidz', `PDF - Semester ${sem} - ${rows.length} kelas`); } catch (e) { /* log best-effort */ }
}

// ---------- Bagian Tahfidz di Raport (dipanggil dari v4RenderReportPreview) ----------
function thfRaporHtml(st, records) {
  const sem = (typeof currentSemesterAktif !== 'undefined' && currentSemesterAktif === 'Genap') ? 'Genap' : 'Ganjil';
  thfMuatTarget();
  const target = thfTargetKelas(sem, st.kelas);
  const d = thfHitung([st], records || [], sem, new Date(), target), sw = d.siswa[0];
  if (!d.mulai) return `<p class="v4-muted">Semester ${sem} belum dimulai.</p>`;
  if (!sw.setoran && !sw.murojaah) return `<p class="v4-muted">Belum ada catatan setoran/murojaah pada semester ${sem}.${target ? ` Target: ${thfFmt(target)} ayat.` : ''}</p>`;
  const capaian = target ? `<strong>${thfFmt(sw.ayat)} ayat</strong> dari target ${thfFmt(target)} ayat (${sw.persen}%)` : `<strong>${thfFmt(sw.ayat)} ayat</strong>`;
  const catatan = d.tidakPasti ? `<br><span style="font-size:11px;">* ${d.tidakPasti} catatan setoran tidak terbaca jumlah ayatnya, belum terhitung.</span>` : '';
  const infoSurah = d.perkiraan ? `<br><span style="font-size:11px;">** ${d.perkiraan} catatan tanpa isian Ayat dihitung seluruh ayat surahnya.</span>` : '';
  return `<p class="v4-muted">Setoran semester ${sem}: ${capaian} · ${sw.setoran} catatan setoran · ${sw.murojaah} sesi murojaah.${catatan}${infoSurah}</p>`;
}

// ---------- Tampilan ----------
function thfEnsureArea() {
  let el = document.getElementById('tahfidzGrafikArea');
  if (el) return el;
  const anchor = document.getElementById('v4TahfidzKelasPanel');
  if (!anchor) return null;
  el = document.createElement('div'); el.id = 'tahfidzGrafikArea'; el.style.marginTop = '14px';
  anchor.insertAdjacentElement('afterend', el);
  return el;
}
function thfGrafikRender() {
  thfResetBilaGantiUser();
  const area = thfEnsureArea(); if (!area) return;
  if (typeof currentUser === 'undefined' || !currentUser || typeof v4CanClass !== 'function' || !v4CanClass()) { area.innerHTML = ''; return; }
  const kelas = v4TfKelasSel;
  if (!kelas) {
    if (v4IsAdmin() || v4IsHead()) { thfMuatTarget(); area.innerHTML = thfOverviewCard(); }
    else area.innerHTML = '<p class="v4-muted">Pilih kelas untuk melihat grafik progres tahfidz dan target.</p>';
    return;
  }
  if (!v4PanelSiswaCache[kelas]) { area.innerHTML = ''; return; }   // panel di atas sudah menampilkan "memuat"/"gagal" + tombol coba lagi
  thfMuatTarget();

  const sem = thfSemAktif(), target = thfTargetKelas(sem, kelas), admin = v4IsAdmin();
  const roster = v4PanelSiswaCache[kelas];
  const d = thfHitung(roster, (V4 && V4.tahfidz) || [], sem, new Date(), target);
  const kontrol = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:10px;">
      <div><label class="label" style="font-size:11px;">Semester</label><select class="field" style="font-size:12px;padding:5px;" onchange="thfGantiSemester(this.value)"><option value="Ganjil"${sem === 'Ganjil' ? ' selected' : ''}>Ganjil</option><option value="Genap"${sem === 'Genap' ? ' selected' : ''}>Genap</option></select></div>
      ${admin ? `<div><label class="label" style="font-size:11px;">Target (ayat per siswa)</label><input id="thfTargetInput" type="number" min="1" max="${THF_MAX_TARGET}" step="1" inputmode="numeric" class="field" style="font-size:12px;padding:5px;width:120px;" value="${target || ''}" placeholder="mis. 60"></div>
        <button id="thfBtnSimpan" class="btn btn-success" style="padding:6px 12px;font-size:12px;" onclick="thfSimpanTarget()">💾 Simpan Target</button>
        ${target ? '<button class="btn btn-soft" style="padding:6px 10px;font-size:12px;" onclick="thfHapusTarget()">🗑️ Hapus</button>' : ''}` : ''}
    </div>`;
  const infoTarget = target ? '' : `<div style="font-size:12px;color:#92400e;background:#fef3c7;border-radius:8px;padding:8px 10px;margin-bottom:10px;">${_thfTarget.memuat ? '⏳ Memuat target...' : (_thfTarget.gagal ? '⚠️ Target tidak bisa dimuat (periksa koneksi/izin). Menampilkan progres saja.' : `Target semester ${sem} untuk ${v4Safe(kelas)} belum diatur${admin ? ' — isi di atas.' : ' oleh Admin.'} Menampilkan progres saja.`)}</div>`;

  let isi;
  if (!d.mulai) {
    isi = `<p class="v4-muted">Semester ${sem} (${d.r.dari.getFullYear()}) belum dimulai.</p>`;
  } else if (d.jumlahSiswa === 0) {
    isi = '<p class="v4-muted">Belum ada siswa di kelas ini.</p>';
  } else {
    const kartu = (judul, nilai, sub) => `<div style="flex:1;min-width:120px;background:rgba(128,128,128,.1);border-radius:10px;padding:8px 10px;"><div style="font-size:10px;color:#6b7280;">${judul}</div><div style="font-size:16px;font-weight:700;">${nilai}</div>${sub ? `<div style="font-size:10px;color:#6b7280;">${sub}</div>` : ''}</div>`;
    const kartuKartu = [
      kartu('Rata-rata capaian', `${thfFmt(d.rata)} ayat`, target ? `${Math.round(d.rata / target * 100)}% dari target` : 'per siswa'),
      target ? kartu('Jalur hari ini', `${thfFmt(d.jalurHariIni)} ayat`, `target ${thfFmt(target)} ayat`) : '',
      target ? kartu('Status siswa', `${d.jml.tercapai} / ${d.jml.jalur} / ${d.jml.tertinggal}`, 'tercapai / sesuai jalur / tertinggal') : '',
      kartu('Siswa', String(d.jumlahSiswa), `${d.siswa.reduce((a, s) => a + s.murojaah, 0)} sesi murojaah`)
    ].join('');
    const peringatan = d.tidakPasti ? `<div style="font-size:11px;color:#b45309;margin:8px 0;">⚠️ ${d.tidakPasti} catatan setoran jumlah ayatnya tidak terbaca/tidak pasti (kosong dengan nama surah tak dikenal, memakai huruf, rentang terbalik, atau melebihi jumlah ayat surahnya), jadi tidak/sebagian terhitung. Isi kolom Ayat dengan angka, mis. <strong>1-7</strong>.</div>` : '';
    const infoPerkiraan = d.perkiraan ? `<div style="font-size:11px;color:#1d4ed8;margin:8px 0;">ℹ️ ${d.perkiraan} catatan setoran tidak mengisi kolom Ayat; dihitung <strong>seluruh ayat surahnya</strong> (dari nama surah).</div>` : '';
    const legenda = `<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:10px;margin:4px 0 12px;">
        <span><span style="display:inline-block;width:14px;height:3px;background:${THF_WARNA.tercapai};vertical-align:middle;"></span> Capaian rata-rata</span>
        ${target ? `<span><span style="display:inline-block;width:14px;border-top:2px dashed ${THF_WARNA.pace};vertical-align:middle;"></span> Jalur target</span><span><span style="display:inline-block;width:14px;border-top:2px dotted ${THF_WARNA.target};vertical-align:middle;"></span> Target semester</span>` : ''}</div>`;
    isi = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">${kartuKartu}</div>${peringatan}${infoPerkiraan}
      <h5 style="font-size:12px;font-weight:700;margin:10px 0 4px;">Capaian kumulatif kelas (rata-rata ayat per siswa)</h5>
      ${thfSvgGaris(d, target)}${legenda}
      <h5 style="font-size:12px;font-weight:700;margin:10px 0 4px;">Capaian per siswa <span style="font-weight:400;color:#6b7280;">(urut dari yang paling tertinggal${target ? '; garis oranye = target, garis abu = jalur hari ini' : ''})</span></h5>
      ${thfBatangHtml(d, target)}`;
  }
  area.innerHTML = `<div style="border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:12px 14px;">
    <h4 style="font-size:14px;font-weight:700;margin-bottom:2px;">📈 Progres &amp; Target Tahfidz — ${v4Safe(kelas)}</h4>
    <p class="v4-muted" style="font-size:11px;margin-bottom:10px;">Progres = jumlah ayat dari catatan <strong>Setoran</strong> (murojaah tidak dihitung), dibaca dari kolom Ayat. Jalur target = garis lurus dari awal sampai akhir semester.</p>
    ${kontrol}${infoTarget}${isi}</div>`;
}
