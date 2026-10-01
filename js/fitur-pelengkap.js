/* ============================================================
   SI MAMBA - js/fitur-pelengkap.js
   Melengkapi 3 fitur yang tombolnya sudah ada di index.html tetapi
   fungsinya belum ada di js/app.js:

   1) Import / Export Siswa via Excel  (halaman Data Siswa)
      unduhTemplatSiswaExcel, exportSiswaExcel, siswaExcelDipilih
      (+ pembantu simpanSiswaExcel, batalSiswaExcel)
   2) Rekap Sikap per Siswa            (halaman Sikap Siswa)
      onSikapRekapKelasChange, renderSikapRekapSiswa, cetakSikapRekapSiswa
   3) Riwayat Absen Saya (filter tanggal)  (halaman Absen Guru)
      initRiwayatAbsenSaya, renderRiwayatAbsenSaya

   CARA KERJA / KETERGANTUNGAN
   - Script klasik (bukan ES module). Dimuat SESUDAH js/app.js (lihat index.html), berbeda dengan
     js/kas.js & js/administrasi-ujian.js yang dimuat sebelumnya, karena file ini membungkus
     setupSikapPage() dan renderSikapRekap() milik app.js -- bungkusan itu hanya bisa dipasang
     kalau fungsi aslinya sudah ada.
   - Yang dipakai dari app.js: currentUser, db, allSiswa, allKedisiplinan, allTeacherAttendance,
     KELAS_LIST, MADRASAH, currentTahunAjaran, toast, addLog, escapeHtml, tglLokal, waktuMs,
     isAdmin, isKepsek, loaderScopeKelas, siswaScopeKelas, isBusy/setBusy/clearBusy, ensureLib
     ('xlsx' dimuat malas, sama seperti Export Rekap Nilai), reloadDataset,
     populateClassFilterDropdowns, loadAttendance, loadGrades, namaFileAman.
   - Semua nama di file ini berawalan `plg`/`PLG_` supaya tidak bentrok dengan app.js.
   - Semua teks dari file Excel / data Firebase yang masuk innerHTML melewati escapeHtml().
============================================================ */

const PLG_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const PLG_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const PLG_MAKS_SISWA_PER_KELAS = 30;   // sama dengan tambahSiswa() & bulkImportSiswa() di app.js
const PLG_MAKS_BARIS_IMPOR = 500;
const PLG_MAKS_UKURAN_FILE = 2 * 1024 * 1024;

// ---------- pembantu umum ----------

// 'YYYY-MM-DD' -> '29 September 2026' (atau 'Selasa, 29 September 2026' kalau denganHari)
function plgTglIndo(tgl, denganHari) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || '');
  if (!m) return tgl || '-';
  const teks = `${+m[3]} ${PLG_BULAN[+m[2] - 1]} ${m[1]}`;
  if (!denganHari) return teks;
  return `${PLG_HARI[new Date(+m[1], +m[2] - 1, +m[3]).getDay()]}, ${teks}`;
}

// epoch-ms -> 'HH:MM' (jam perangkat). 0/tidak valid -> '-'
function plgJam(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '-';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// Buka jendela cetak. Pola sama dengan v4PrintReport(): <base href> supaya path relatif ikut ter-resolve.
function plgBukaCetak(judul, isiHtml) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return toast('Popup diblokir browser.', true);
  w.document.write(`<html><head><base href="${escapeHtml(document.baseURI)}"><title>${escapeHtml(judul)}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#111}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #999;padding:6px 8px;font-size:13px;text-align:left}th{background:#eee}h2,h3,p{margin:4px 0}@media print{button{display:none}}</style></head><body>${isiHtml}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
}

function plgUrutSiswa(a, b) {
  const ia = KELAS_LIST.indexOf(a.kelas), ib = KELAS_LIST.indexOf(b.kelas);
  if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  return String(a.name || '').localeCompare(String(b.name || ''), 'id');
}

function plgLibExcelGagal(err) {
  console.warn('[SI MAMBA] Library Excel:', err);
  toast('⚠️ Library Excel belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true);
}

// =====================================================
// 1) IMPORT / EXPORT SISWA VIA EXCEL
// =====================================================
// Baris mentah hasil baca file disimpan di sini supaya validasi bisa dijalankan ULANG persis saat
// tombol Simpan ditekan (data siswa bisa berubah antara pratinjau dan simpan, mis. kelas jadi penuh).
let plgSiswaExcelBaris = null;
let plgJumlahOkPratinjau = 0;   // jumlah siswa yang ditampilkan "akan diimpor" di pratinjau terakhir

function unduhTemplatSiswaExcel() {
  ensureLib('xlsx').then(() => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Nama', 'Kelas', 'No WA Ortu']]);
    ws['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    const petunjuk = XLSX.utils.aoa_to_sheet([
      ['Petunjuk pengisian'],
      ['1. Isi data mulai baris 2 pada sheet "Siswa". Jangan mengubah judul kolom.'],
      ['2. Nama dan Kelas wajib diisi. No WA Ortu boleh dikosongkan.'],
      ['3. Kelas harus salah satu dari: ' + KELAS_LIST.join(', ') + ' (boleh ditulis angkanya saja, mis. 3).'],
      ['4. No WA Ortu ditulis angka saja, mis. 081234567890 atau 6281234567890.'],
      ['5. Maksimal ' + PLG_MAKS_SISWA_PER_KELAS + ' siswa per kelas. Siswa dengan nama & kelas yang sama dengan data yang sudah ada akan dilewati.'],
      ['6. Setelah file dipilih, data ditampilkan dulu sebagai pratinjau dan baru disimpan setelah Anda menekan tombol Simpan.']
    ]);
    petunjuk['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, petunjuk, 'Petunjuk');
    XLSX.writeFile(wb, 'Templat_Import_Siswa.xlsx');
  }).catch(plgLibExcelGagal);
}

function exportSiswaExcel() {
  if (!currentUser) return;
  const scope = new Set(siswaScopeKelas());
  const daftar = ((isAdmin() || isKepsek()) ? allSiswa : allSiswa.filter(s => scope.has(s.kelas))).slice().sort(plgUrutSiswa);
  if (daftar.length === 0) return toast('Belum ada data siswa untuk diekspor.', true);
  ensureLib('xlsx').then(() => {
    const data = [['No', 'Nama', 'Kelas', 'No WA Ortu']];
    daftar.forEach((s, i) => data.push([i + 1, s.name || '', s.kelas || '', s.noWaOrtu ? String(s.noWaOrtu) : '']));
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 12 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siswa');
    XLSX.writeFile(wb, `Data_Siswa_${namaFileAman(tglLokal())}.xlsx`);
    addLog('export_siswa_excel', daftar.length + ' siswa');
  }).catch(plgLibExcelGagal);
}

// Kelas dari Excel -> nama kelas baku di KELAS_LIST ("kelas 3", "Kelas3", "3" -> "Kelas 3"). Tak dikenal -> null.
function plgNormKelas(v) {
  const kunci = s => String(s).toLowerCase().replace(/\s+/g, '');
  const k = kunci(v == null ? '' : v);
  if (!k) return null;
  const persis = KELAS_LIST.find(x => kunci(x) === k);
  if (persis) return persis;
  if (/^\d+$/.test(k)) return KELAS_LIST.find(x => kunci(x) === 'kelas' + k) || null;
  return null;
}

// Nomor WA dari Excel. Excel sering membuang angka 0 di depan (0812... jadi 812...), jadi 8xxx dilengkapi.
// Kosong -> { val:null, salah:false }. Tak masuk akal -> { val:null, salah:true }.
function plgNormWa(v) {
  if (v === null || v === undefined || String(v).trim() === '') return { val: null, salah: false };
  let d = String(v).replace(/\D/g, '');
  if (!d) return { val: null, salah: true };
  if (d.startsWith('8')) d = '0' + d;
  if (d.length < 10 || d.length > 15) return { val: null, salah: true };
  return { val: d, salah: false };
}

function plgKunciSiswa(nama, kelas) {
  return String(nama).toLowerCase().replace(/\s+/g, ' ').trim() + '|' + kelas;
}

// Susun baris mentah dari sheet (array of array). Deteksi baris judul (Nama/Kelas/No WA) di 10 baris
// pertama; kalau tidak ada, dianggap kolom 1=Nama, 2=Kelas, 3=No WA mulai baris pertama.
function plgUraiSheetSiswa(aoa) {
  const norm = v => String(v == null ? '' : v).trim().toLowerCase();
  let mulai = 0, cNama = 0, cKelas = 1, cWa = 2;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const r = (aoa[i] || []).map(norm);
    const iN = r.findIndex(x => x === 'nama' || x === 'nama siswa');
    const iK = r.findIndex(x => x === 'kelas');
    if (iN !== -1 && iK !== -1) {
      mulai = i + 1; cNama = iN; cKelas = iK;
      cWa = r.findIndex((x, idx) => idx !== iN && idx !== iK && !x.includes('nama') && /\bwa\b|nowa|whatsapp|\bhp\b|telp|ponsel/.test(x));
      break;
    }
  }
  const baris = [];
  for (let i = mulai; i < aoa.length; i++) {
    const r = aoa[i] || [];
    const nama = String(r[cNama] == null ? '' : r[cNama]).trim();
    const kelasRaw = String(r[cKelas] == null ? '' : r[cKelas]).trim();
    const waRaw = cWa >= 0 && r[cWa] != null ? r[cWa] : '';
    if (!nama && !kelasRaw && String(waRaw).trim() === '') continue;   // baris kosong dilewati
    baris.push({ baris: i + 1, nama, kelasRaw, waRaw });
  }
  return baris;
}

// Validasi tiap baris terhadap data siswa SAAT INI. Hitungan per kelas ikut naik tiap baris yang
// diterima (bukan snapshot awal), supaya batas 30 tidak kebobolan di dalam satu file.
function plgValidasiSiswaExcel(rows) {
  const jumlah = {}, sudahAda = new Set(), dalamFile = new Set();
  allSiswa.forEach(s => { jumlah[s.kelas] = (jumlah[s.kelas] || 0) + 1; sudahAda.add(plgKunciSiswa(s.name || '', s.kelas)); });
  return rows.map(r => {
    const item = { baris: r.baris, nama: r.nama.replace(/\s+/g, ' '), kelasAsli: r.kelasRaw, kelas: null, wa: null, catatan: [], ok: false, alasan: '' };
    if (!item.nama) { item.alasan = 'Nama kosong'; return item; }
    if (item.nama.length > 100) { item.alasan = 'Nama terlalu panjang (maks 100 karakter)'; return item; }
    const kelas = plgNormKelas(r.kelasRaw);
    if (!kelas) { item.alasan = r.kelasRaw ? `Kelas "${r.kelasRaw}" tidak dikenal` : 'Kelas kosong'; return item; }
    item.kelas = kelas;
    const kunci = plgKunciSiswa(item.nama, kelas);
    if (sudahAda.has(kunci)) { item.alasan = 'Sudah ada di data siswa'; return item; }
    if (dalamFile.has(kunci)) { item.alasan = 'Dobel di dalam file ini'; return item; }
    if ((jumlah[kelas] || 0) >= PLG_MAKS_SISWA_PER_KELAS) { item.alasan = `${kelas} sudah penuh (maks ${PLG_MAKS_SISWA_PER_KELAS} siswa)`; return item; }
    const wa = plgNormWa(r.waRaw);
    item.wa = wa.val;
    if (wa.salah) item.catatan.push('No WA tidak valid, dikosongkan');
    dalamFile.add(kunci);
    jumlah[kelas] = (jumlah[kelas] || 0) + 1;
    item.ok = true;
    return item;
  });
}

function plgRenderSiswaExcel(items) {
  const box = document.getElementById('siswaExcelPreview');
  if (!box) return;
  if (!items || items.length === 0) { plgJumlahOkPratinjau = 0; box.innerHTML = ''; return; }
  const jumlahOk = items.filter(i => i.ok).length, jumlahLewat = items.length - jumlahOk;
  plgJumlahOkPratinjau = jumlahOk;
  const baris = items.map(i => {
    const status = i.ok
      ? `<span style="color:#059669;font-weight:600;">✅ Akan diimpor</span>${i.catatan.length ? `<div style="font-size:11px;color:#d97706;">⚠️ ${escapeHtml(i.catatan.join('; '))}</div>` : ''}`
      : `<span style="color:#dc2626;">⏭️ Dilewati: ${escapeHtml(i.alasan)}</span>`;
    return `<tr><td>${i.baris}</td><td>${escapeHtml(i.nama || '-')}</td><td>${escapeHtml(i.kelas || i.kelasAsli || '-')}</td><td>${escapeHtml(i.wa || '-')}</td><td>${status}</td></tr>`;
  }).join('');
  box.innerHTML = `
    <p style="font-size:13px;font-weight:600;margin-bottom:6px;">Pratinjau: <span style="color:#059669;">${jumlahOk} siswa akan diimpor</span>${jumlahLewat ? `, <span style="color:#dc2626;">${jumlahLewat} baris dilewati</span>` : ''} (dari ${items.length} baris)</p>
    <div style="overflow:auto;max-height:340px;"><table><thead><tr><th>Baris</th><th>Nama</th><th>Kelas</th><th>No WA Ortu</th><th>Status</th></tr></thead><tbody>${baris}</tbody></table></div>
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">
      <button id="btnSimpanSiswaExcel" class="btn btn-success" onclick="simpanSiswaExcel()" ${jumlahOk === 0 ? 'disabled' : ''}>💾 Simpan ${jumlahOk} Siswa</button>
      <button class="btn btn-soft" onclick="batalSiswaExcel()">✖️ Batal</button>
    </div>`;
}

function batalSiswaExcel() {
  plgSiswaExcelBaris = null;
  plgRenderSiswaExcel(null);
  const input = document.getElementById('siswaExcelFile');
  if (input) input.value = '';
}

function siswaExcelDipilih(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;
  if (!isAdmin()) { input.value = ''; return toast('🔒 Hanya Admin!', true); }
  if (file.size > PLG_MAKS_UKURAN_FILE) { input.value = ''; return toast('File terlalu besar (maks 2 MB).', true); }
  const csv = /\.csv$/i.test(file.name);
  toast('⏳ Membaca file...', false, 1500);
  ensureLib('xlsx').then(() => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Gagal membaca file'));
    if (csv) fr.readAsText(file, 'UTF-8'); else fr.readAsArrayBuffer(file);   // CSV dibaca sebagai teks UTF-8 supaya huruf berakses tidak rusak
  })).then(isi => {
    const wb = XLSX.read(isi, { type: csv ? 'string' : 'array' });
    const namaSheet = wb.SheetNames.includes('Siswa') ? 'Siswa' : wb.SheetNames[0];
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[namaSheet], { header: 1, defval: '', raw: true });
    const rows = plgUraiSheetSiswa(aoa);
    if (rows.length === 0) { plgSiswaExcelBaris = null; plgRenderSiswaExcel(null); return toast('File tidak berisi data siswa. Pakai templat dari tombol "Unduh Templat".', true); }
    if (rows.length > PLG_MAKS_BARIS_IMPOR) { plgSiswaExcelBaris = null; plgRenderSiswaExcel(null); return toast(`Terlalu banyak baris (${rows.length}). Maksimal ${PLG_MAKS_BARIS_IMPOR} baris per file.`, true); }
    plgSiswaExcelBaris = rows;
    plgRenderSiswaExcel(plgValidasiSiswaExcel(rows));
  }).catch(err => {
    console.warn('[SI MAMBA] Baca file siswa gagal:', err);
    if (typeof XLSX === 'undefined') plgLibExcelGagal(err);
    else toast('⚠️ File tidak bisa dibaca. Pastikan formatnya .xlsx, .xls, atau .csv yang valid.', true);
  }).finally(() => { input.value = ''; });
}

function simpanSiswaExcel() {
  if (!isAdmin()) return toast('🔒 Hanya Admin!', true);
  if (!plgSiswaExcelBaris) return toast('Pilih file Excel dulu.', true);
  if (isBusy('simpanSiswaExcel')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
  if (!navigator.onLine) return toast('⚠️ Sedang offline. Import siswa butuh koneksi internet.', true);
  // Validasi ulang terhadap data siswa TERBARU. Kalau hasilnya beda dari pratinjau, jangan simpan diam-diam.
  const items = plgValidasiSiswaExcel(plgSiswaExcelBaris);
  const diterima = items.filter(i => i.ok);
  if (diterima.length === 0) { plgRenderSiswaExcel(items); return toast('Tidak ada siswa yang bisa disimpan.', true); }
  if (plgJumlahOkPratinjau !== diterima.length) { plgRenderSiswaExcel(items); return toast('Data siswa berubah sejak pratinjau. Periksa pratinjau terbaru lalu tekan Simpan lagi.', true); }
  const btn = document.getElementById('btnSimpanSiswaExcel');
  setBusy('simpanSiswaExcel', btn);
  const sekarang = new Date().toISOString();
  const updates = {};
  diterima.forEach(i => {
    const key = db.ref('siswa').push().key;
    const rec = { name: i.nama, kelas: i.kelas, guru: 'Admin', guruKey: currentUser.key || null, dibuat: sekarang };
    if (i.wa) rec.noWaOrtu = i.wa;
    updates[key] = rec;
  });
  // Satu update() = semua siswa tersimpan bersamaan atau tidak sama sekali (tidak ada impor separuh jalan).
  db.ref('siswa').update(updates, err => {
    clearBusy('simpanSiswaExcel', btn);
    if (err) return toast('Gagal menyimpan: ' + err.message, true);
    toast(`✅ ${diterima.length} siswa berhasil diimpor.`);
    addLog('import_siswa_excel', diterima.length + ' siswa diimpor');
    batalSiswaExcel();
    const filter = document.getElementById('filterKelasSiswa'); if (filter) filter.value = '';
    reloadDataset('siswa', () => { populateClassFilterDropdowns(); loadAttendance(); loadGrades(); });
  });
}

// =====================================================
// 2) REKAP SIKAP PER SISWA
// =====================================================
// Kelas yang boleh dilihat: Admin/Kepsek semua, guru = kelas yang diampu/diwalikan
// (sama dengan izin mencatat sikap di simpanSikap()).
function plgKelasRekapSikap() {
  return (isAdmin() || isKepsek()) ? [...KELAS_LIST] : loaderScopeKelas();
}

function plgIsiKelasRekapSikap() {
  const sel = document.getElementById('sikapRekapKelas');
  if (!sel || !currentUser) return;
  const sebelumnya = sel.value, daftar = plgKelasRekapSikap();
  sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + daftar.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  if (daftar.includes(sebelumnya)) sel.value = sebelumnya;
  else onSikapRekapKelasChange();
}

function onSikapRekapKelasChange() {
  const kelasSel = document.getElementById('sikapRekapKelas'), siswaSel = document.getElementById('sikapRekapSiswa');
  const area = document.getElementById('sikapRekapSiswaArea');
  if (area) area.innerHTML = '';
  if (!kelasSel || !siswaSel) return;
  const kelas = kelasSel.value;
  const kosong = '<option value="">-- Pilih Siswa --</option>';
  if (!kelas || !plgKelasRekapSikap().includes(kelas)) { siswaSel.innerHTML = kosong; return; }
  const siswa = allSiswa.filter(s => s.kelas === kelas).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id'));
  siswaSel.innerHTML = kosong + siswa.map(s => `<option value="${escapeHtml(s.key)}">${escapeHtml(s.name)}</option>`).join('');
}

// Data rekap satu siswa (dipakai tampilan layar & cetak). null kalau siswa tak ada / di luar kelas pengguna.
function plgDataRekapSikap(siswaKey) {
  const siswa = allSiswa.find(s => s.key === siswaKey);
  if (!siswa || !plgKelasRekapSikap().includes(siswa.kelas)) return null;
  const items = allKedisiplinan.filter(d => d.siswaKey === siswaKey)
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.inputAt || '').localeCompare(a.inputAt || ''));
  const pel = items.filter(d => d.jenis === 'pelanggaran').reduce((s, d) => s + (d.poin || 0), 0);
  const pres = items.filter(d => d.jenis === 'prestasi').reduce((s, d) => s + (d.poin || 0), 0);
  return { siswa, items, pel, pres, net: pres - pel };
}

function renderSikapRekapSiswa() {
  const area = document.getElementById('sikapRekapSiswaArea'), sel = document.getElementById('sikapRekapSiswa');
  if (!area || !sel) return;
  if (!sel.value) { area.innerHTML = ''; return; }
  const r = plgDataRekapSikap(sel.value);
  if (!r) { area.innerHTML = '<p class="text-muted" style="font-size:13px;">Siswa tidak ditemukan atau bukan di kelas Anda.</p>'; return; }
  const warnaNet = r.net >= 0 ? '#059669' : '#dc2626';
  const ringkasan = `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;margin-bottom:10px;">
      <strong style="font-size:14px;">${escapeHtml(r.siswa.name)}</strong><span class="text-muted" style="font-size:12px;">${escapeHtml(r.siswa.kelas)} · ${escapeHtml(currentTahunAjaran)}</span>
      <span style="font-size:13px;font-weight:700;color:${warnaNet};">Net Poin: ${r.net >= 0 ? '+' : ''}${r.net}</span>
      <span class="text-muted" style="font-size:12px;">(⚠️ ${r.pel} / 🌟 ${r.pres})</span></div>`;
  if (r.items.length === 0) { area.innerHTML = ringkasan + '<p class="text-muted" style="font-size:13px;">Belum ada catatan sikap tahun ajaran ini.</p>'; return; }
  const baris = r.items.map(d => `<tr>
      <td>${escapeHtml(plgTglIndo(d.tanggal))}</td>
      <td style="color:${d.jenis === 'prestasi' ? '#059669' : '#dc2626'};font-weight:600;">${d.jenis === 'prestasi' ? '🌟 Prestasi' : '⚠️ Pelanggaran'}</td>
      <td>${escapeHtml(d.kategori || '-')}</td><td>${d.jenis === 'prestasi' ? '+' : '-'}${d.poin || 0}</td>
      <td>${escapeHtml(d.keterangan || '-')}</td><td>${escapeHtml(d.inputBy || '-')}</td></tr>`).join('');
  area.innerHTML = ringkasan + `<div style="overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Poin</th><th>Keterangan</th><th>Dicatat oleh</th></tr></thead><tbody>${baris}</tbody></table></div>`;
}

function cetakSikapRekapSiswa() {
  const sel = document.getElementById('sikapRekapSiswa');
  if (!sel || !sel.value) return toast('Pilih kelas dan siswa dulu.', true);
  const r = plgDataRekapSikap(sel.value);
  if (!r) return toast('Siswa tidak ditemukan atau bukan di kelas Anda.', true);
  const baris = r.items.map((d, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(plgTglIndo(d.tanggal))}</td><td>${d.jenis === 'prestasi' ? 'Prestasi' : 'Pelanggaran'}</td><td>${escapeHtml(d.kategori || '-')}</td><td>${d.jenis === 'prestasi' ? '+' : '-'}${d.poin || 0}</td><td>${escapeHtml(d.keterangan || '-')}</td></tr>`).join('');
  const isi = `
    <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px;">
      <h2>${escapeHtml(MADRASAH.nama)}</h2>${MADRASAH.alamat ? `<p style="font-size:12px;">${escapeHtml(MADRASAH.alamat)}</p>` : ''}
    </div>
    <h3 style="text-align:center;">REKAP SIKAP & KEDISIPLINAN SISWA</h3>
    <p style="text-align:center;font-size:12px;">Tahun Ajaran ${escapeHtml(currentTahunAjaran)}</p>
    <p style="margin-top:12px;"><strong>Nama:</strong> ${escapeHtml(r.siswa.name)} &nbsp;&nbsp; <strong>Kelas:</strong> ${escapeHtml(r.siswa.kelas)}</p>
    <p><strong>Total Pelanggaran:</strong> ${r.pel} poin &nbsp;&nbsp; <strong>Total Prestasi:</strong> ${r.pres} poin &nbsp;&nbsp; <strong>Net Poin:</strong> ${r.net >= 0 ? '+' : ''}${r.net}</p>
    ${r.items.length ? `<table><thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Poin</th><th>Keterangan</th></tr></thead><tbody>${baris}</tbody></table>` : '<p style="margin-top:12px;">Belum ada catatan sikap pada tahun ajaran ini.</p>'}
    <p style="margin-top:24px;font-size:11px;color:#555;">Dicetak ${escapeHtml(plgTglIndo(tglLokal()))}</p>`;
  plgBukaCetak('Rekap Sikap ' + r.siswa.name, isi);
}

// Sambungan ke app.js tanpa mengubah app.js: (a) isi dropdown kelas rekap-per-siswa saat halaman Sikap
// dibuka, (b) tampilan rekap-per-siswa ikut segar setiap kali catatan sikap disimpan/dihapus
// (simpanSikap/hapusSikap/loadSikapKelas memanggil renderSikapRekap()).
(function pasangSambunganSikap() {
  if (typeof setupSikapPage === 'function') {
    const asli = setupSikapPage;
    window.setupSikapPage = function () {
      const hasil = asli.apply(this, arguments);
      try { plgIsiKelasRekapSikap(); renderSikapRekapSiswa(); } catch (e) { console.warn('[SI MAMBA] Rekap sikap per siswa:', e); }
      return hasil;
    };
  }
  if (typeof renderSikapRekap === 'function') {
    const asli = renderSikapRekap;
    window.renderSikapRekap = function () {
      const hasil = asli.apply(this, arguments);
      try { renderSikapRekapSiswa(); } catch (e) { console.warn('[SI MAMBA] Rekap sikap per siswa:', e); }
      return hasil;
    };
  }
})();

// =====================================================
// 3) RIWAYAT ABSEN SAYA (filter tanggal)
// =====================================================
// Sumber: allTeacherAttendance -- sudah dibatasi ke tahun ajaran berjalan, dan untuk non-Admin hanya
// milik sendiri. Dicocokkan lagi di sini dengan pola yang sama seperti renderTeacherAttendance().
function initRiwayatAbsenSaya() {
  const dari = document.getElementById('riwayatAbsenDari'), sampai = document.getElementById('riwayatAbsenSampai');
  if (!dari || !sampai) return;
  const hariIni = tglLokal();
  if (!sampai.value) sampai.value = hariIni;
  if (!dari.value) dari.value = hariIni.slice(0, 8) + '01';   // default: awal bulan ini
  renderRiwayatAbsenSaya();
}

function renderRiwayatAbsenSaya() {
  const list = document.getElementById('riwayatAbsenSayaList');
  if (!list || !currentUser) return;
  const dari = document.getElementById('riwayatAbsenDari').value, sampai = document.getElementById('riwayatAbsenSampai').value;
  if (!dari || !sampai) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Pilih tanggal Dari dan Sampai lalu tekan Tampilkan.</p>'; return; }
  if (dari > sampai) return toast('Tanggal "Dari" tidak boleh melewati tanggal "Sampai".', true);
  const milikSaya = a => a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name;
  const perHari = {};
  (allTeacherAttendance || []).filter(a => a.tanggal && a.tanggal >= dari && a.tanggal <= sampai && milikSaya(a))
    .forEach(a => { (perHari[a.tanggal] = perHari[a.tanggal] || []).push(a); });
  const tanggalList = Object.keys(perHari).sort().reverse();
  const catatanTahun = `<p class="text-muted" style="font-size:11px;margin-top:8px;">Menampilkan data tahun ajaran ${escapeHtml(currentTahunAjaran)}.</p>`;
  if (tanggalList.length === 0) { list.innerHTML = `<div class="text-muted border-muted" style="padding:12px;text-align:center;border-radius:8px;">📭 Tidak ada catatan absen pada rentang ${escapeHtml(plgTglIndo(dari))} – ${escapeHtml(plgTglIndo(sampai))}</div>${catatanTahun}`; return; }
  const hitung = { hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
  const barisHtml = tanggalList.map(tgl => {
    const recs = perHari[tgl];
    const urut = tipe => recs.filter(a => a.type === tipe).sort((a, b) => waktuMs(a.waktu) - waktuMs(b.waktu));
    const datangList = urut('Datang'), pulangList = urut('Pulang');
    const datang = datangList[0] || null, pulang = pulangList.length ? pulangList[pulangList.length - 1] : null;
    const izinSakit = urut('Izin')[0] || urut('Sakit')[0] || null, alpha = urut('Alpha')[0] || null;
    let isi;
    if (datang || pulang) {
      hitung.hadir++;
      let jamKerja = '';
      if (datang && pulang && waktuMs(datang.waktu) && waktuMs(pulang.waktu)) {
        const menit = Math.max(0, Math.round((waktuMs(pulang.waktu) - waktuMs(datang.waktu)) / 60000));
        jamKerja = ` · <span style="color:#2563eb;">⏱️ ${Math.floor(menit / 60)}j ${menit % 60}m</span>`;
      }
      const telat = datang && datang.keterangan ? `<div style="font-size:11px;color:#991b1b;">⚠️ ${escapeHtml(datang.keterangan)}</div>` : '';
      isi = `<div>🌅 ${plgJam(datang ? waktuMs(datang.waktu) : 0)} · 🌇 ${plgJam(pulang ? waktuMs(pulang.waktu) : 0)}${jamKerja}</div>${telat}`;
    } else if (izinSakit) {
      hitung[izinSakit.type]++;
      isi = `<div style="color:#d97706;font-weight:600;">${izinSakit.type === 'Sakit' ? '🤒 Sakit' : '📝 Izin'}</div>${izinSakit.keterangan ? `<div class="text-muted" style="font-size:11px;">${escapeHtml(izinSakit.keterangan)}</div>` : ''}`;
    } else if (alpha) {
      hitung.Alpha++;
      isi = '<div style="color:#dc2626;font-weight:600;">❌ Alpha (tidak ada laporan)</div>';
    } else {
      isi = '<div class="text-muted">-</div>';
    }
    return `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;"><strong>${escapeHtml(plgTglIndo(tgl, true))}</strong><div style="text-align:right;">${isi}</div></div>`;
  }).join('');
  const ringkasan = `<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;font-weight:600;margin-bottom:8px;">
      <span style="color:#059669;">✅ Hadir: ${hitung.hadir}</span><span style="color:#d97706;">📝 Izin: ${hitung.Izin}</span>
      <span style="color:#d97706;">🤒 Sakit: ${hitung.Sakit}</span><span style="color:#dc2626;">❌ Alpha: ${hitung.Alpha}</span></div>`;
  list.innerHTML = ringkasan + barisHtml + catatanTahun;
}
