/* ============================================================
   SI MAMBA - js/tunggakan-infaq.js
   Tunggakan Infaq Mingguan per siswa + pengingat WhatsApp ke wali.

   TAMPIL DI MANA
   - Di halaman "Infaq Mingguan" (infaq-madrasah), tepat di bawah daftar "Belum Lunas Minggu Ini"
     (#infaqBelumSetorArea). Areanya (#infaqTunggakanArea) dibuat sendiri oleh modul ini, jadi
     index.html tidak perlu diubah selain menambah <script>.
   - Admin: semua kelas. Petugas infaq: hanya kelas tugasnya. Kepala Madrasah: semua kelas, LIHAT &
     UNDUH saja (tombol WA hanya untuk Admin/petugas). Lihat tunggakanCanView().
   - Unduh PDF & Excel mengikuti filter yang sedang dipilih (kelas + "Hitung sejak"). Nomor WA wali
     SENGAJA tidak ikut diekspor.

   CARA MENGHITUNG
   - Minggu yang dihitung = minggu ISO dari awal tahun ajaran sampai MINGGU LALU. Minggu berjalan
     tidak dihitung (belum jatuh tempo; sudah ada daftar "Belum Lunas Minggu Ini").
   - Minggu yang Senin-Jumat-nya seluruhnya libur di Kalender Akademik (jenis 'libur') dilewati.
   - "Hitung sejak" bisa dipilih. Default: minggu pertama yang ada catatan lunasnya, supaya minggu
     libur panjang/sebelum infaq dimulai tidak terhitung tunggakan.
   - Siswa baru tidak dikenai minggu sebelum minggu ia didaftarkan (field `dibuat`).
   - Siswa dengan nominal khusus Rp 0 (gratis) tidak pernah menunggak.
   - Lunas = ada record iuran_siswa dengan siswaKey + minggu yang sama (sama dengan tanda centang
     di halaman ini). Nominal tunggakan = jumlah nominal TIAP minggu yang belum lunas, memakai nominal
     standar yang berlaku pada minggu itu (riwayat: node iuran_nominal_riwayat, lihat bagian RIWAYAT NOMINAL
     di bawah). Tanpa riwayat -> nominal sekarang x jumlah minggu. Minggu ber-nominal 0 tidak ditagih.

   KETERGANTUNGAN (milik app.js, dipakai saat fungsi dipanggil)
   - allSiswa, allInfaqSiswa, allKalenderAkademik, currentTahunAjaran, MADRASAH, KELAS_LIST,
     infaqCanAccess, infaqMyKelasList, iuranNominalSiswa, iuranRp, isoMingguKey, mingguLabel,
     tglLokal, formatNomorWa, kirimWA, escapeHtml, escapeJs, reloadDataset, addLog, toast, isAdmin,
     isKepsek, ensureLib, v4LoadLogoForPdf, v4LoadTtdKepalaForPdf, v4TambahLogoKeKopPdf (PDF/Excel).
   - Dimuat SESUDAH js/app.js. Dipicu dari renderIuranRekap() (satu baris, lihat catatan pemasangan).
============================================================ */
const TUNGGAKAN_MAX_MINGGU_PESAN = 6;      // rincian minggu di pesan WA; sisanya diringkas "dan N minggu lainnya"

let _tgUser = null;                         // pemilik state di bawah; direset kalau pengguna berganti
let _tgKelas = 'ALL';                       // filter kelas yang dipilih
let _tgMulai = '';                          // minggu awal hitungan yang dipilih ('' = otomatis)
let _tgKalenderDicoba = false;              // kalender akademik dimuat malas; coba muat sekali per sesi
let _tgBarisByKey = {};                     // siswaKey -> baris tunggakan terakhir yang dirender (untuk tombol WA)
let _tgUrutan = [];                         // siswaKey sesuai urutan tampilan (dasar antrean WA)
let _tgTerkirim = {};                       // siswaKey -> true: pengingat WA sudah dibuka pada sesi ini (hilang saat muat ulang)
let _tgAntrean = null;                      // { items:[siswaKey], i, kirim, lewat } | null

function tgResetBilaGantiUser() {
  const uid = (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name) : null;
  if (uid === _tgUser) return;
  _tgUser = uid; _tgKelas = 'ALL'; _tgMulai = ''; _tgKalenderDicoba = false; _tgBarisByKey = {}; _tgUrutan = []; _tgTerkirim = {}; _tgAntrean = null; riwReset();
}
function tgTglDari(s) {                      // 'YYYY-MM-DD' -> Date lokal (tanpa geser zona waktu)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function tgLiburSet() {
  const set = new Set();
  (allKalenderAkademik || []).forEach(k => {
    if (String(k.jenis || '').toLowerCase() !== 'libur') return;
    const d = tgTglDari(k.tanggalMulai), akhir = tgTglDari(k.tanggalSelesai || k.tanggalMulai);
    if (!d || !akhir) return;
    for (let n = 0; d <= akhir && n < 400; n++) { set.add(tglLokal(d)); d.setDate(d.getDate() + 1); }
  });
  return set;
}
// Minggu yang sudah jatuh tempo di tahun ajaran aktif (urut lama -> baru), tanpa minggu libur penuh.
function tgDaftarMinggu() {
  const thn = parseInt(String(currentTahunAjaran).split('/')[0], 10);
  if (!thn) return [];
  const akhirTA = new Date(thn + 1, 5, 30);
  const d = new Date(thn, 6, 1); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));       // Senin minggu 1 Juli
  const kini = new Date(), seninIni = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate());
  seninIni.setDate(seninIni.getDate() - ((seninIni.getDay() + 6) % 7));                  // Senin minggu berjalan
  const libur = tgLiburSet(), out = [];
  while (d < seninIni && d <= akhirTA) {
    let aktif = false;
    for (let i = 0; i < 5 && !aktif; i++) aktif = !libur.has(tglLokal(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i)));
    if (aktif) out.push(isoMingguKey(d));
    d.setDate(d.getDate() + 7);
  }
  return out;
}
// Admin & petugas infaq (lihat + WA) dan Kepala Madrasah (lihat + unduh saja).
function tunggakanCanView() { return !!currentUser && (infaqCanAccess() || isKepsek()); }
function tgKelasDilihat() { return (isAdmin() || isKepsek()) ? [...KELAS_LIST] : infaqMyKelasList(); }

// Hasil hitung: [{ siswa, minggu:[key], jumlah, nominal, total }] urut kelas, lalu terbanyak menunggak.
function tgHitung(kelasList, mulaiKey, semuaMinggu) {
  const minggu = semuaMinggu.filter(k => k >= mulaiKey);
  const kelasSet = new Set(kelasList), lunas = new Set();
  (allInfaqSiswa || []).forEach(it => lunas.add(it.siswaKey + '|' + it.minggu));
  const hasil = [];
  (allSiswa || []).forEach(s => {
    if (!kelasSet.has(s.kelas)) return;
    const nominal = iuranNominalSiswa(s);                      // nominal SEKARANG (null = belum diatur, 0 = gratis); hanya untuk tampilan
    let awalSiswa = '';
    if (s.dibuat) { const dt = new Date(s.dibuat); if (!isNaN(dt.getTime())) awalSiswa = isoMingguKey(dt); }
    // minggu pendaftaran sendiri tidak ditagih; minggu ber-nominal 0 (gratis) pada saat itu juga tidak ditagih
    const belum = minggu.filter(k => k > awalSiswa && !lunas.has(s.key + '|' + k) && tgNominalMingguSiswa(s, k) !== 0);
    if (!belum.length) return;
    const per = belum.map(k => tgNominalMingguSiswa(s, k));
    const adaNull = per.some(n => n === null);
    hasil.push({ siswa: s, minggu: belum, jumlah: belum.length, nominal, total: adaNull ? null : per.reduce((a, b) => a + b, 0), bervariasi: new Set(per).size > 1 });
  });
  const urut = (a, b) => (typeof COLLATOR_ID !== 'undefined' ? COLLATOR_ID.compare(a, b) : String(a).localeCompare(String(b)));
  return hasil.sort((a, b) => urut(a.siswa.kelas, b.siswa.kelas) || b.jumlah - a.jumlah || urut(a.siswa.name, b.siswa.name));
}
function tgMulaiDefault(kelasList, semuaMinggu) {
  if (!semuaMinggu.length) return '';
  const kelasSet = new Set(kelasList);
  const ada = (allInfaqSiswa || []).filter(it => kelasSet.has(it.kelas) && semuaMinggu.indexOf(it.minggu) >= 0).map(it => it.minggu).sort();
  return ada.length ? ada[0] : semuaMinggu[semuaMinggu.length - 1];   // belum ada catatan sama sekali: hanya minggu lalu
}
// Satu sumber data untuk tampilan layar, PDF & Excel supaya angkanya selalu sama.
function tgDataAktif() {
  const kelasSemua = tgKelasDilihat();
  if (_tgKelas !== 'ALL' && !kelasSemua.includes(_tgKelas)) _tgKelas = 'ALL';
  const kelasList = _tgKelas === 'ALL' ? kelasSemua : [_tgKelas];
  const semuaMinggu = tgDaftarMinggu();
  if (!semuaMinggu.length) return { kelasSemua, kelasList, semuaMinggu, mulai: '', baris: [], totMinggu: 0, totRp: 0, adaTanpaNominal: false };
  const mulai = semuaMinggu.indexOf(_tgMulai) >= 0 ? _tgMulai : tgMulaiDefault(kelasList, semuaMinggu);
  const baris = tgHitung(kelasList, mulai, semuaMinggu);
  return {
    kelasSemua, kelasList, semuaMinggu, mulai, baris,
    totMinggu: baris.reduce((a, b) => a + b.jumlah, 0),
    totRp: baris.reduce((a, b) => a + (b.total || 0), 0),
    adaTanpaNominal: baris.some(b => b.total === null)
  };
}
function tgTglIndo(d) {
  const nb = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return `${d.getDate()} ${nb[d.getMonth()]} ${d.getFullYear()}`;
}
function tgLabelKelas() { return _tgKelas === 'ALL' ? 'Semua Kelas' : _tgKelas; }
function tgSlug() { return 'Tunggakan_Infaq_' + (_tgKelas === 'ALL' ? 'Semua_Kelas' : _tgKelas.replace(/[^A-Za-z0-9]+/g, '_')) + '_' + String(currentTahunAjaran).replace('/', '-'); }
function tgRingkasKelas(baris) {   // [{ kelas, siswa, minggu, total }] urut sesuai baris
  const m = {}, urut = [];
  baris.forEach(b => {
    const k = b.siswa.kelas;
    if (!m[k]) { m[k] = { kelas: k, siswa: 0, minggu: 0, total: 0, tanpaNominal: false }; urut.push(k); }
    m[k].siswa += 1; m[k].minggu += b.jumlah; m[k].total += b.total || 0; if (b.nominal === null) m[k].tanpaNominal = true;
  });
  return urut.map(k => m[k]);
}
function tgEnsureArea() {
  let el = document.getElementById('infaqTunggakanArea');
  if (el) return el;
  const anchor = document.getElementById('infaqBelumSetorArea') || document.getElementById('infaqRekapArea');
  if (!anchor) return null;
  el = document.createElement('div'); el.id = 'infaqTunggakanArea'; el.style.marginTop = '14px';
  anchor.insertAdjacentElement('afterend', el);
  return el;
}


// ============================================================
// RIWAYAT NOMINAL INFAQ STANDAR (supaya perkiraan tunggakan memakai nominal yang berlaku PADA minggu itu)
// Node Firebase `iuran_nominal_riwayat/{minggu-berlaku}` = { berlakuMinggu, nominal, updatedBy, updatedAt }.
//  - Nominal minggu W = entri dengan berlakuMinggu terbesar yang <= W. Minggu sebelum entri pertama memakai
//    nominal entri pertama (dianggap nominal awal).
//  - Entri awal '0000-W00' dibuat otomatis saat Admin PERTAMA KALI mengubah nominal setelah fitur ini ada,
//    berisi nominal LAMA yang sedang berlaku, supaya minggu-minggu lama tidak ikut berubah.
//  - Nominal KHUSUS siswa (nominalIuranKhusus) tidak punya riwayat: dipakai apa adanya untuk semua minggu.
//  - Kalau riwayat kosong/gagal dimuat, hitungan kembali ke nominal standar SEKARANG (perilaku lama).
// ============================================================
const RIWAYAT_BASELINE = '0000-W00';
let _riw = { data: null, memuat: false, dicoba: false, gagal: false };

function riwReset() { _riw = { data: null, memuat: false, dicoba: false, gagal: false }; }
function riwDaftar() {                      // [{ berlaku, nominal }] urut naik; [] kalau belum ada
  if (!_riw.data) return [];
  return Object.keys(_riw.data).map(k => ({ berlaku: (_riw.data[k] && _riw.data[k].berlakuMinggu) || k, nominal: Number(_riw.data[k] && _riw.data[k].nominal) }))
    .filter(e => Number.isFinite(e.nominal) && e.nominal >= 0).sort((a, b) => (a.berlaku < b.berlaku ? -1 : a.berlaku > b.berlaku ? 1 : 0));
}
function riwNominalStandarMinggu(mingguKey) {
  const dft = riwDaftar();
  if (!dft.length) return iuranNominalStandar();                   // tanpa riwayat: nominal sekarang
  let hasil = dft[0].nominal;                                      // sebelum entri pertama: nominal awal
  dft.forEach(e => { if (e.berlaku <= mingguKey) hasil = e.nominal; });
  return hasil;
}
function tgNominalMingguSiswa(s, mingguKey) {                      // null = belum diatur, 0 = gratis
  const khusus = (typeof iuranAngka === 'function') ? iuranAngka(s && s.nominalIuranKhusus) : null;
  return khusus !== null ? khusus : riwNominalStandarMinggu(mingguKey);
}
function riwMuat(sesudah) {
  if (_riw.memuat || _riw.dicoba) return;
  _riw.dicoba = true; _riw.memuat = true;
  const selesai = (data, gagal) => { _riw.memuat = false; _riw.data = data || null; _riw.gagal = !!gagal; if (sesudah) sesudah(); };
  try {
    db.ref('iuran_nominal_riwayat').once('value').then(snap => selesai(snap.val(), false))
      .catch(err => { console.warn('[SI MAMBA] Gagal memuat riwayat nominal infaq:', err && err.message ? err.message : err); selesai(null, true); });
  } catch (e) { console.warn('[SI MAMBA] Gagal memuat riwayat nominal infaq:', e); selesai(null, true); }
}
// Dipakai renderIuranNominalArea() (app.js) -- pilihan "berlaku mulai minggu" untuk Admin.
function infaqRiwayatBerlakuSelectHtml() {
  const kini = new Date(), opsi = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() - i * 7);
    const k = isoMingguKey(d);
    opsi.push(`<option value="${k}">${i === 0 ? 'Minggu ini' : i === 1 ? 'Minggu lalu' : ''}${i < 2 ? ' — ' : ''}${escapeHtml(mingguLabel(k))}</option>`);
  }
  return `<label style="font-size:11px;color:#065f46;">Berlaku mulai
      <select id="infaqBerlakuMinggu" class="field" style="font-size:12px;padding:5px;max-width:230px;">${opsi.join('')}</select></label>`;
}
// Dipanggil simpanIuranNominal() (app.js) SESUDAH nominal standar berhasil disimpan. Tidak pernah melempar error.
function infaqRiwayatCatat(nominalBaru, nominalLama) {
  try {
    if (!isAdmin()) return;
    const el = document.getElementById('infaqBerlakuMinggu');
    const berlaku = (el && /^\d{4}-W\d{2}$/.test(el.value)) ? el.value : isoMingguKey(new Date());
    db.ref('iuran_nominal_riwayat').once('value').then(snap => {
      const ada = snap.val() || {}, upd = {}, kunci = Object.keys(ada);
      if (!kunci.length) {
        if (nominalLama === null || nominalLama === undefined || Number(nominalLama) === Number(nominalBaru)) return null;   // tidak ada perubahan yang perlu dicatat
        upd['iuran_nominal_riwayat/' + RIWAYAT_BASELINE] = { berlakuMinggu: RIWAYAT_BASELINE, nominal: Number(nominalLama), updatedBy: 'sistem', updatedAt: new Date().toISOString() };
      }
      kunci.forEach(k => { const b = (ada[k] && ada[k].berlakuMinggu) || k; if (b > berlaku) upd['iuran_nominal_riwayat/' + k] = null; });   // entri yang lebih baru tergantikan
      upd['iuran_nominal_riwayat/' + berlaku] = { berlakuMinggu: berlaku, nominal: Number(nominalBaru), updatedBy: currentUser.name, updatedAt: new Date().toISOString() };
      return db.ref().update(upd);
    }).then(() => { riwReset(); try { tunggakanRender(); } catch (e) { /* kartu tunggakan belum ada */ } })
      .catch(err => { console.warn('[SI MAMBA] Gagal mencatat riwayat nominal infaq:', err && err.message ? err.message : err); toast('⚠️ Nominal tersimpan, tapi riwayat per minggu gagal dicatat (perkiraan tunggakan memakai nominal terbaru).', true, 6000); });
  } catch (e) { console.warn('[SI MAMBA] infaqRiwayatCatat gagal:', e); }
}

function tgCatatanNominal() {
  return riwDaftar().length
    ? 'Perkiraan dihitung per minggu dari riwayat nominal standar; siswa bernominal khusus memakai nominal khusus sekarang.'
    : 'Perkiraan = nominal berlaku sekarang x jumlah minggu (riwayat perubahan nominal belum ada).';
}

function tunggakanRender() {
  tgResetBilaGantiUser();
  const area = tgEnsureArea(); if (!area) return;
  if (typeof tunggakanCanView !== 'function' || !tunggakanCanView()) { area.innerHTML = ''; return; }
  // Kalender akademik dimuat malas (baru terisi kalau halamannya pernah dibuka) -- muat dulu supaya minggu libur terdeteksi.
  if (!_tgKalenderDicoba && (!allKalenderAkademik || allKalenderAkademik.length === 0) && typeof reloadDataset === 'function') {
    _tgKalenderDicoba = true;
    area.innerHTML = '<p class="text-muted" style="font-size:12px;">⏳ Menghitung tunggakan...</p>';
    reloadDataset('kalenderAkademik', () => tunggakanRender());
    return;
  }
  if (!_riw.dicoba && typeof riwMuat === 'function') {            // riwayat nominal dimuat sekali per sesi, lalu hitung ulang
    area.innerHTML = '<p class="text-muted" style="font-size:12px;">⏳ Menghitung tunggakan...</p>';
    riwMuat(() => tunggakanRender());
    return;
  }
  const d = tgDataAktif();
  if (!d.semuaMinggu.length) { area.innerHTML = '<p class="text-muted" style="font-size:12px;">Belum ada minggu yang jatuh tempo di tahun ajaran ini.</p>'; return; }
  const { kelasSemua, semuaMinggu, mulai, baris, totMinggu, totRp, adaTanpaNominal } = d;
  const bolehWA = infaqCanAccess();                     // Kepsek: lihat & unduh saja
  _tgBarisByKey = {}; baris.forEach(b => { _tgBarisByKey[b.siswa.key] = b; }); _tgUrutan = baris.map(b => b.siswa.key);
  const jumlahAntre = baris.filter(b => tgAdaWa(b.siswa) && !_tgTerkirim[b.siswa.key]).length;
  const selKelas = kelasSemua.length > 1
    ? `<select id="tunggakanKelas" class="field" style="font-size:12px;padding:5px;max-width:150px;" onchange="tunggakanGanti()"><option value="ALL">Semua Kelas</option>${kelasSemua.map(k => `<option value="${escapeHtml(k)}"${k === _tgKelas ? ' selected' : ''}>${escapeHtml(k)}</option>`).join('')}</select>` : '';
  const selMulai = `<select id="tunggakanMulai" class="field" style="font-size:12px;padding:5px;max-width:190px;" onchange="tunggakanGanti()">${semuaMinggu.map(k => `<option value="${k}"${k === mulai ? ' selected' : ''}>${escapeHtml(mingguLabel(k))}</option>`).join('')}</select>`;

  const rows = baris.map(b => {
    const s = b.siswa, w = b.minggu;
    const ringkas = w.slice(0, 3).map(mingguLabel).join('; ') + (w.length > 3 ? ` (+${w.length - 3} lagi)` : '');
    const adaWa = !!s.noWaOrtu && formatNomorWa(s.noWaOrtu).length >= 10;
    const aksiWa = !bolehWA ? '' : (adaWa ? `<button class="btn" style="padding:2px 8px;font-size:10px;background:#25D366;color:white;" title="${_tgTerkirim[s.key] ? 'Pengingat sudah dibuka pada sesi ini' : 'Kirim pengingat WA'}" onclick="tunggakanKirimWA('${escapeJs(s.key)}')">📲 WA${_tgTerkirim[s.key] ? ' ✓' : ''}</button>` : '<span class="text-muted" style="font-size:10px;" title="Nomor WA wali belum diisi / tidak valid">📵</span>');
    return `<tr>
      <td style="font-size:12px;"><strong>${escapeHtml(s.name)}</strong>${_tgKelas === 'ALL' ? `<div style="font-size:10px;color:#6b7280;">${escapeHtml(s.kelas)}</div>` : ''}</td>
      <td style="text-align:center;"><span style="background:#fee2e2;color:#991b1b;border-radius:10px;padding:2px 9px;font-size:11px;font-weight:700;">${b.jumlah} mgg</span></td>
      <td style="font-size:10px;color:#6b7280;" title="${escapeHtml(w.map(mingguLabel).join('; '))}">${escapeHtml(ringkas)}</td>
      <td style="text-align:right;white-space:nowrap;font-weight:600;"${b.bervariasi ? ' title="Nominal berubah di antara minggu-minggu ini; dihitung per minggu"' : ''}>${b.total === null ? '—' : (b.bervariasi ? '≈ ' : '') + iuranRp(b.total)}</td>
      <td style="white-space:nowrap;">${aksiWa}</td>
    </tr>`;
  }).join('');

  const kosongKal = (!allKalenderAkademik || allKalenderAkademik.length === 0)
    ? '<div style="font-size:10px;color:#b45309;margin-top:4px;">⚠️ Kalender Akademik kosong — minggu libur tidak bisa dikecualikan. Atur "Hitung sejak" bila perlu.</div>' : '';
  area.innerHTML = `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 14px;">
    <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px;">📋 Tunggakan Infaq (minggu sebelum minggu ini)</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px;">${selKelas}<span style="font-size:11px;color:#6b7280;">Hitung sejak</span>${selMulai}
      ${baris.length ? `<button class="btn btn-soft" style="padding:4px 10px;font-size:11px;" onclick="tunggakanExportPDF()">📄 PDF</button><button class="btn btn-soft" style="padding:4px 10px;font-size:11px;" onclick="tunggakanExportExcel()">📊 Excel</button>` : ''}
      ${bolehWA && jumlahAntre > 0 && !_tgAntrean ? `<button class="btn" style="padding:4px 10px;font-size:11px;background:#25D366;color:white;" onclick="tunggakanMulaiAntrean()">📲 Kirim berurutan (${jumlahAntre})</button>` : ''}</div>
    ${tgAntreanHtml()}
    ${baris.length === 0
      ? '<div style="font-size:12px;color:#065f46;">🎉 Tidak ada tunggakan pada rentang ini.</div>'
      : `<div style="font-size:12px;color:#78350f;margin-bottom:8px;"><strong>${baris.length}</strong> siswa menunggak • <strong>${totMinggu}</strong> minggu${adaTanpaNominal ? '' : ` • perkiraan <strong>${iuranRp(totRp)}</strong>`}</div>
         <div style="overflow-x:auto;"><table><thead><tr><th>Siswa</th><th style="text-align:center;">Tunggakan</th><th>Minggu</th><th style="text-align:right;">Perkiraan</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
         ${adaTanpaNominal ? '<div style="font-size:10px;color:#b45309;margin-top:4px;">⚠️ Nominal iuran standar belum diatur, jadi Rp tidak dihitung.</div>' : `<div style="font-size:10px;color:#6b7280;margin-top:4px;">${tgCatatanNominal()}${baris.some(b => b.bervariasi) ? ' Tanda ≈ = nominal berubah di antara minggu-minggu itu.' : ''}</div>`}`}
    ${kosongKal}
  </div>`;
}
function tunggakanGanti() {
  const k = document.getElementById('tunggakanKelas'), m = document.getElementById('tunggakanMulai');
  if (k) _tgKelas = k.value;
  if (m) _tgMulai = m.value;
  tunggakanRender();
}
function tunggakanPesan(b) {
  const s = b.siswa, w = b.minggu;
  const rinci = w.slice(0, TUNGGAKAN_MAX_MINGGU_PESAN).map(k => '• ' + mingguLabel(k)).join('\n')
    + (w.length > TUNGGAKAN_MAX_MINGGU_PESAN ? `\n• dan ${w.length - TUNGGAKAN_MAX_MINGGU_PESAN} minggu lainnya` : '');
  const total = b.total === null ? '' : `\n\nTotal tunggakan: *${iuranRp(b.total)}*`;
  return `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${s.name}* (${s.kelas}).\n\nKami informasikan bahwa infaq mingguan ananda tercatat belum lunas untuk *${w.length} minggu*:\n${rinci}${total}\n\nMohon kesediaannya untuk melunasinya. Jika sudah membayar atau ada kendala, mohon konfirmasi kepada kami. Terima kasih.\n\n- ${MADRASAH.nama}`;
}
function tunggakanKirimWA(siswaKey) {
  if (!infaqCanAccess()) return toast('Tidak diizinkan!', true);
  const b = _tgBarisByKey[siswaKey];
  if (!b) return toast('Data tunggakan tidak ditemukan — muat ulang halaman.', true);
  const s = b.siswa;
  if (!s.noWaOrtu || formatNomorWa(s.noWaOrtu).length < 10) return toast('⚠️ Nomor WhatsApp wali belum diisi atau tidak valid. Isi lewat Edit Siswa di Data Siswa.', true);
  kirimWA(s.noWaOrtu, tunggakanPesan(b));
  _tgTerkirim[siswaKey] = true;
  try { addLog('ingatkan_tunggakan_infaq', `${s.kelas} - ${s.name} - ${b.jumlah} minggu`); } catch (e) { console.error('[SI MAMBA] addLog pengingat tunggakan gagal:', e); }
  tunggakanRender();
  return true;
}

// ---- Antrean kirim berurutan: satu klik = satu chat WA terbuka (WhatsApp tidak mengizinkan kirim massal otomatis) ----
function tgAdaWa(s) { return !!s.noWaOrtu && formatNomorWa(s.noWaOrtu).length >= 10; }
function tgAntreanHtml() {
  const a = _tgAntrean; if (!a) return '';
  while (a.i < a.items.length && !_tgBarisByKey[a.items[a.i]]) { a.i++; a.lewat++; }   // sudah lunas/tidak menunggak lagi -> lewati otomatis
  const kotak = isi => `<div style="background:rgba(37,211,102,.12);border:1px solid #25D366;border-radius:10px;padding:10px 12px;margin-bottom:10px;">${isi}</div>`;
  if (a.i >= a.items.length) return kotak(`<div style="font-size:12px;">✅ Antrean selesai: <strong>${a.kirim}</strong> pengingat dibuka, <strong>${a.lewat}</strong> dilewati.</div><button class="btn btn-soft" style="padding:4px 10px;font-size:11px;margin-top:6px;" onclick="tunggakanAntreanTutup()">Tutup</button>`);
  const b = _tgBarisByKey[a.items[a.i]], s = b.siswa;
  return kotak(`<div style="font-size:11px;color:#6b7280;">Antrean WA ${a.i + 1} dari ${a.items.length}</div>
    <div style="font-size:13px;margin:2px 0 8px;"><strong>${escapeHtml(s.name)}</strong> (${escapeHtml(s.kelas)}) — ${b.jumlah} minggu${b.total === null ? '' : ' • ' + iuranRp(b.total)}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;"><button class="btn" style="padding:5px 12px;font-size:12px;background:#25D366;color:white;" onclick="tunggakanAntreanBuka()">📲 Buka WA & lanjut</button><button class="btn btn-soft" style="padding:5px 12px;font-size:12px;" onclick="tunggakanAntreanLewati()">⏭️ Lewati</button><button class="btn btn-soft" style="padding:5px 12px;font-size:12px;" onclick="tunggakanAntreanTutup()">✖ Berhenti</button></div>`);
}
function tunggakanMulaiAntrean() {
  if (!infaqCanAccess()) return toast('Tidak diizinkan!', true);
  const items = _tgUrutan.filter(k => _tgBarisByKey[k] && tgAdaWa(_tgBarisByKey[k].siswa) && !_tgTerkirim[k]);
  if (!items.length) return toast('Tidak ada siswa dengan nomor WA wali yang belum diingatkan.', true);
  _tgAntrean = { items, i: 0, kirim: 0, lewat: 0 };
  tunggakanRender();
}
function tunggakanAntreanBuka() {
  const a = _tgAntrean; if (!a || a.i >= a.items.length) return;
  const key = a.items[a.i];
  if (!_tgBarisByKey[key]) { a.i++; a.lewat++; return tunggakanRender(); }
  a.i++; a.kirim++;                     // maju & hitung DULU: tunggakanKirimWA() merender ulang kartu di dalamnya
  if (!tunggakanKirimWA(key)) { a.i--; a.kirim--; tunggakanRender(); }
}
function tunggakanAntreanLewati() { const a = _tgAntrean; if (!a) return; a.i++; a.lewat++; tunggakanRender(); }
function tunggakanAntreanTutup() { _tgAntrean = null; tunggakanRender(); }

// ---- Ekspor rekap tunggakan (mengikuti filter yang sedang dipilih; tanpa nomor WA) ----
async function tunggakanExportPDF() {
  if (!tunggakanCanView()) return toast('Tidak diizinkan!', true);
  const d = tgDataAktif();
  if (!d.baris.length) return toast('Tidak ada tunggakan untuk diekspor.', true);
  try { await ensureLib('pdf'); } catch (e) { console.error('[SI MAMBA] Gagal memuat modul PDF', e); return toast('❌ Modul PDF belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
  const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); const pw = doc.internal.pageSize.getWidth();
  if (typeof doc.autoTable !== 'function') { console.error('[SI MAMBA] jspdf-autotable tidak tersedia setelah ensureLib("pdf")'); return toast('❌ Modul tabel PDF (autotable) belum termuat. Muat ulang halaman lalu coba lagi.', true); }
  const [logoData, ttdKepalaData] = await Promise.all([v4LoadLogoForPdf(), v4LoadTtdKepalaForPdf()]);
  const offY = MADRASAH.nsm ? 5 : 0;
  v4TambahLogoKeKopPdf(doc, logoData, offY);
  doc.setFontSize(16); doc.text(MADRASAH.nama || '', pw / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  if (MADRASAH.nsm) { doc.setFont(undefined, 'bold'); doc.text(`NSM: ${MADRASAH.nsm}`, pw / 2, 25, { align: 'center' }); doc.setFont(undefined, 'normal'); }
  doc.text(MADRASAH.alamat || '', pw / 2, 27 + offY, { align: 'center' });
  const kontak = [MADRASAH.telp ? 'Telp. ' + MADRASAH.telp : '', MADRASAH.email || '', MADRASAH.website || ''].filter(Boolean).join(' | ');
  if (kontak) doc.text(kontak, pw / 2, 33 + offY, { align: 'center' });
  doc.setDrawColor(0); doc.setLineWidth(0.5);
  doc.line(15, 38 + offY, pw - 15, 38 + offY); doc.line(15, 40 + offY, pw - 15, 40 + offY);
  let y = 49 + offY;
  doc.setFontSize(14); doc.text('REKAP TUNGGAKAN INFAQ MINGGUAN', pw / 2, y, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Tahun Ajaran ${currentTahunAjaran} - ${tgLabelKelas()}`, pw / 2, y + 6, { align: 'center' });
  doc.text(`Dihitung sejak minggu ${mingguLabel(d.mulai)} s.d. minggu lalu (per ${tgTglIndo(new Date())})`, pw / 2, y + 11, { align: 'center' });
  const gaya = { theme: 'grid', showFoot: 'lastPage', styles: { fontSize: 8, cellPadding: 1.6 }, headStyles: { fillColor: [146, 64, 14], textColor: [255, 255, 255], fontStyle: 'bold' }, footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }, margin: { left: 15, right: 15 } };
  const rp = n => (n === null ? '-' : iuranRp(n));
  let startY = y + 16;
  const ring = tgRingkasKelas(d.baris);
  if (ring.length > 1) {
    doc.autoTable(Object.assign({}, gaya, {
      startY, head: [['Kelas', 'Siswa Menunggak', 'Total Minggu', 'Perkiraan Tunggakan']],
      body: ring.map(r => [r.kelas, String(r.siswa), String(r.minggu), r.tanpaNominal ? '-' : iuranRp(r.total)]),
      foot: [['TOTAL', String(d.baris.length), String(d.totMinggu), d.adaTanpaNominal ? '-' : iuranRp(d.totRp)]],
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' } }
    }));
    startY = doc.lastAutoTable.finalY + 8;
  }
  doc.autoTable(Object.assign({}, gaya, {
    startY, head: [['No', 'Kelas', 'Nama Siswa', 'Minggu', 'Rincian Minggu', 'Perkiraan']],
    body: d.baris.map((b, i) => [String(i + 1), b.siswa.kelas, b.siswa.name, String(b.jumlah), b.minggu.map(mingguLabel).join('; '), rp(b.total)]),
    foot: ring.length > 1 ? undefined : [['', '', 'TOTAL', String(d.totMinggu), '', d.adaTanpaNominal ? '-' : iuranRp(d.totRp)]],
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 20 }, 3: { cellWidth: 14, halign: 'center' }, 5: { cellWidth: 27, halign: 'right' } }
  }));
  let yc = doc.lastAutoTable.finalY + 5;
  if (yc > 270) { doc.addPage(); yc = 20; }
  doc.setFontSize(8); doc.setTextColor(100);
  doc.text(tgCatatanNominal() + ' Minggu libur penuh di Kalender Akademik tidak dihitung.', 15, yc, { maxWidth: pw - 30 });
  doc.setTextColor(0);
  let ySign = yc + 10;
  if (ySign > 235) { doc.addPage(); ySign = 20; }
  const xKiri = 50, xKanan = pw - 50;
  doc.setFontSize(10);
  doc.text('Dibuat oleh,', xKiri, ySign, { align: 'center' }); doc.text('Bendahara Madrasah', xKiri, ySign + 5, { align: 'center' });
  doc.text('Mengetahui,', xKanan, ySign, { align: 'center' }); doc.text('Kepala Madrasah', xKanan, ySign + 5, { align: 'center' });
  if (ttdKepalaData) {
    try {
      const ttdW = 32; const props = doc.getImageProperties(ttdKepalaData);
      doc.addImage(ttdKepalaData, 'PNG', xKanan - ttdW / 2, ySign + 7, ttdW, Math.min(16, ttdW * (props.height / props.width)));
    } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF Tunggakan:', e); }
  }
  const yNama = ySign + 28;
  doc.text(MADRASAH.bendahara || '(............................)', xKiri, yNama, { align: 'center' });
  if (MADRASAH.bendahara && MADRASAH.nip_bendahara) doc.text('NIP. ' + MADRASAH.nip_bendahara, xKiri, yNama + 5, { align: 'center' });
  doc.text(MADRASAH.kepala_sekolah || '', xKanan, yNama, { align: 'center' });
  if (MADRASAH.nip_kepala_sekolah) doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, xKanan, yNama + 5, { align: 'center' });
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 15, doc.internal.pageSize.getHeight() - 8);
  doc.save(`${tgSlug()}.pdf`); toast('📥 PDF Tunggakan Infaq berhasil diunduh!');
  try { addLog('unduh_tunggakan_infaq', `PDF - ${tgLabelKelas()} - ${d.baris.length} siswa`); } catch (e) { /* log best-effort */ }
}
async function tunggakanExportExcel() {
  if (!tunggakanCanView()) return toast('Tidak diizinkan!', true);
  const d = tgDataAktif();
  if (!d.baris.length) return toast('Tidak ada tunggakan untuk diekspor.', true);
  try { await ensureLib('xlsx'); } catch (e) { console.error('[SI MAMBA] Gagal memuat modul Excel', e); return toast('❌ Modul Excel belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
  if (typeof XLSX === 'undefined' || !XLSX.utils) return toast('❌ Modul Excel belum termuat. Muat ulang halaman lalu coba lagi.', true);
  const judul = [[MADRASAH.nama || ''], ['REKAP TUNGGAKAN INFAQ MINGGUAN'],
    [`Tahun Ajaran ${currentTahunAjaran} - ${tgLabelKelas()} - sejak minggu ${mingguLabel(d.mulai)} s.d. minggu lalu (per ${tglLokal()})`], []];
  const aoa1 = judul.concat([['No', 'Kelas', 'Nama Siswa', 'Jumlah Minggu', 'Nominal per Minggu', 'Perkiraan Tunggakan', 'Rincian Minggu']]);
  d.baris.forEach((b, i) => aoa1.push([i + 1, b.siswa.kelas, b.siswa.name, b.jumlah, b.bervariasi ? 'bervariasi' : (b.nominal === null ? '' : b.nominal), b.total === null ? '' : b.total, b.minggu.map(mingguLabel).join('; ')]));
  aoa1.push(['', '', 'TOTAL', d.totMinggu, '', d.adaTanpaNominal ? '' : d.totRp, '']);
  const ring = tgRingkasKelas(d.baris);
  const aoa2 = judul.concat([['Kelas', 'Siswa Menunggak', 'Total Minggu', 'Perkiraan Tunggakan']]);
  ring.forEach(r => aoa2.push([r.kelas, r.siswa, r.minggu, r.tanpaNominal ? '' : r.total]));
  aoa2.push(['TOTAL', d.baris.length, d.totMinggu, d.adaTanpaNominal ? '' : d.totRp]);
  const ws1 = XLSX.utils.aoa_to_sheet(aoa1), ws2 = XLSX.utils.aoa_to_sheet(aoa2);
  ws1['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 70 }];
  ws2['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 22 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws1, 'Per Siswa'); XLSX.utils.book_append_sheet(wb, ws2, 'Per Kelas');
  XLSX.writeFile(wb, `${tgSlug()}.xlsx`); toast('📥 Excel Tunggakan Infaq berhasil diunduh!');
  try { addLog('unduh_tunggakan_infaq', `Excel - ${tgLabelKelas()} - ${d.baris.length} siswa`); } catch (e) { /* log best-effort */ }
}
