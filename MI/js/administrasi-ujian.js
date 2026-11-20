/* ============================================================
   SI MAMBA - js/administrasi-ujian.js
   Menu "Administrasi Ujian" (halaman #page-administrasi-ujian), dipisah dari js/app.js.
   Isi menu (per sesi ASAS/ASAT / per ruang):
     1. Data Sesi        : nama ASAS/ASAT, mapel, kelas, ruang, waktu, 2 pengawas
     2. Daftar Hadir     : peserta (H/S/I/A) + pengawas -> cetak dengan kolom tanda tangan
     3. Tata Tertib      : peserta & pengawas (ada teks bawaan, bisa diedit Admin)
     4. Denah            : Denah Lokasi (ruang-ruang di gedung) + Denah Tempat Duduk ruang ASAS/ASAT
     5. Kartu Peserta    : satu kartu per siswa (no. peserta, ruang, kursi dari denah) -> cetak kertas F4
     6. Berita Acara     : rekap otomatis dari daftar hadir + catatan pengawas -> cetak
     7. Jadwal Ujian     : (tab pertama, tidak tergantung sesi terpilih) semua sesi berurut tanggal/jam, filter,
                           form jadwal massal (rentang tanggal x 2 slot jam x daftar mapel), peringatan pengawas
                           bentrok, tombol duplikat sesi, dan cetak jadwal (A4 mendatar). Kodenya di bagian
                           "JADWAL UJIAN" paling bawah file ini.
   Setiap tab punya tombol cetak, plus "Cetak Semua Berkas" (satu paket A4, halaman terpisah).
   Kartu Peserta dicetak TERPISAH dari paket itu karena kertasnya F4 (215 x 330 mm), sedangkan satu
   pekerjaan cetak hanya bisa memakai satu ukuran kertas.

   CARA KERJA / KETERGANTUNGAN
   - Script klasik (bukan ES module), dimuat SEBELUM js/app.js (lihat index.html), sama seperti
     js/kas.js. Yang dipakai dari app.js baru dipanggil saat fungsi berjalan: currentUser, db,
     allSiswa, allGuru, KELAS_LIST, MADRASAH, currentTahunAjaran, currentSemesterAktif, toast,
     addLog, escapeHtml, escapeJs, tglLokal, isAdmin, isKepsek, v4IsTeacher, isBusy/setBusy/clearBusy,
     doubleConfirm, _fetchList, _byTahun, isReallyOnline; opsional window.TTD (js/ttd-digital.js).
   - Data disimpan di node Firebase `administrasi_ujian` (satu record = satu ruang pada satu
     sesi ASAS/ASAT), difilter per tahun ajaran. Data dimuat sendiri di file ini.
   - Yang MASIH perlu ada di app.js hanya "sambungan"-nya: judul halaman (titleMap),
     pemanggilan setupAdministrasiUjianPage() di navigateTo(), dan aturan tampil menu
     (aujCanOpenMenu) di menuRules.
   - Hak akses: Admin mengubah semua; Kepsek & guru boleh melihat + mencetak. Ubah di
     aujCanEdit() / aujCanOpenMenu() kalau ingin pengawas boleh mengisi sendiri.
============================================================ */

const AUJ_NODE = 'administrasi_ujian';
const AUJ_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const AUJ_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const AUJ_STATUS = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
const AUJ_TABS = [
  { id: 'jadwal', label: '📅 Jadwal Ujian' },
  { id: 'sesi', label: '📋 Data Sesi' },
  { id: 'hadir', label: '✅ Daftar Hadir' },
  { id: 'tatib', label: '📜 Tata Tertib' },
  { id: 'denah', label: '🗺️ Denah' },
  { id: 'kartu', label: '🎫 Kartu Peserta' },
  { id: 'ba', label: '📄 Berita Acara' }
];

// Teks bawaan tata tertib -- satu butir per baris. Admin bisa mengubahnya per sesi (tab Tata Tertib).
const AUJ_TATIB_PESERTA_DEFAULT = [
  'Peserta hadir di ruang ASAS/ASAT paling lambat 15 menit sebelum ASAS/ASAT dimulai.',
  'Peserta memakai seragam sesuai ketentuan madrasah dengan rapi dan sopan.',
  'Peserta membawa kartu peserta dan alat tulis sendiri (pensil 2B, pulpen, penghapus, penggaris).',
  'Peserta duduk di tempat sesuai denah tempat duduk dan nomor peserta yang telah ditentukan.',
  'Peserta berdoa bersama sebelum mengerjakan soal dan sesudah ASAS/ASAT selesai.',
  'Peserta dilarang membawa dan menggunakan HP, catatan, buku, atau alat komunikasi lain selama ASAS/ASAT berlangsung.',
  'Peserta dilarang menyontek, bekerja sama, memberi, atau meminta jawaban kepada peserta lain.',
  'Peserta dilarang meminjam atau meminjamkan alat tulis selama ASAS/ASAT berlangsung.',
  'Peserta yang terlambat lebih dari 30 menit tidak diperkenankan mengikuti ASAS/ASAT kecuali dengan izin panitia/Kepala Madrasah.',
  'Peserta tidak diperkenankan meninggalkan ruang ASAS/ASAT tanpa izin pengawas; keluar ruangan bergantian, tidak bersamaan.',
  'Peserta menjaga ketenangan dan kebersihan ruang ASAS/ASAT.',
  'Setelah selesai, peserta menyerahkan naskah soal dan lembar jawaban kepada pengawas sebelum meninggalkan ruangan.',
  'Peserta yang melanggar tata tertib dikenai sanksi sesuai ketentuan madrasah.'
].join('\n');
const AUJ_TATIB_PENGAWAS_DEFAULT = [
  'Pengawas hadir di madrasah paling lambat 30 menit sebelum ASAS/ASAT dimulai dan mengambil naskah soal, lembar jawaban, daftar hadir, dan berita acara dari panitia.',
  'Pengawas berpakaian rapi dan sopan serta menjadi teladan bagi peserta.',
  'Pengawas memeriksa kebersihan ruangan, denah tempat duduk, nomor peserta, dan kelengkapan bahan ASAS/ASAT sebelum peserta masuk.',
  'Pengawas mempersilakan peserta masuk, memeriksa kartu peserta, dan memastikan tidak ada peserta yang membawa HP atau catatan.',
  'Pengawas membuka amplop soal di hadapan peserta tepat pada waktunya, lalu membagikan naskah soal dan lembar jawaban.',
  'Pengawas menjelaskan tata tertib dan petunjuk pengerjaan soal sebelum ASAS/ASAT dimulai.',
  'Pengawas mengawasi dengan tertib dan aktif berkeliling; tidak menggunakan HP, tidak membaca koran/buku, dan tidak mengobrol.',
  'Pengawas tidak meninggalkan ruang ASAS/ASAT selama ASAS/ASAT berlangsung, tidak membantu peserta mengerjakan soal, dan tidak memberikan jawaban.',
  'Pengawas mengisi daftar hadir peserta dan berita acara dengan benar, serta mencatat setiap kejadian khusus selama ASAS/ASAT.',
  'Pengawas mengumpulkan lembar jawaban sesuai urutan nomor peserta, menghitung jumlahnya, lalu menyerahkannya kepada panitia bersama berita acara.',
  'Pengawas baru meninggalkan ruangan setelah seluruh peserta keluar dan ruangan dirapikan.'
].join('\n');

let allAdmUjian = [];
let aujTahunDimuat = null, aujGen = 0, aujTerakhirSegar = 0;
let aujAktifKey = null, aujBaru = false, aujTabAktif = 'sesi';
let aujKursi = {};          // draft tempat duduk: { 'baris_kolom': siswaKey }
let aujHadir = {};          // draft kehadiran peserta: { siswaKey: 'H'|'S'|'I'|'A' }
let aujHadirPengawas = {};  // draft kehadiran pengawas: { p1: true, p2: false }
let aujSel = null;          // pilihan aktif di denah: { t:'k', k:'1_2' } atau { t:'s', key }
let aujSalinan = null;      // isian awal form "sesi baru" hasil Duplikat Sesi (null = form kosong)
let aujJdwNama = '', aujJdwKelas = '';   // filter tab Jadwal Ujian (kosong = semua)
let aujMassalBuka = false, aujMassalDraft = null, aujMassalHasil = null;   // form jadwal massal: terbuka?, isian, hasil pratinjau

// ---------- Hak akses ----------
function aujCanEdit() { return !!currentUser && isAdmin(); }
function aujCanOpenMenu() { return !!currentUser && (isAdmin() || isKepsek() || (typeof v4IsTeacher === 'function' && v4IsTeacher())); }

// ---------- Helper umum ----------
function aujEl(id) { return document.getElementById(id); }
function aujVal(id) { const el = aujEl(id); return el ? String(el.value || '').trim().replace(/\[\[/g, '[ [') : ''; }
function aujInt(v, def, min, max) { const n = parseInt(v, 10); return isNaN(n) ? def : Math.min(max, Math.max(min, n)); }
function aujAdaTanggal(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
// 'YYYY-MM-DD' -> objek bagian tanggal (dipecah manual supaya tidak geser hari karena zona waktu)
function aujBagianTgl(tgl) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  return { y, mo, d, hari: AUJ_HARI[new Date(y, mo - 1, d).getDay()], bulan: AUJ_BULAN[mo - 1] };
}
function aujTglIndo(tgl, denganHari) {
  const p = aujBagianTgl(tgl); if (!p) return tgl || '-';
  return (denganHari ? p.hari + ', ' : '') + `${p.d} ${p.bulan} ${p.y}`;
}
function aujWaktu(rec) {
  const a = rec.jamMulai || '', b = rec.jamSelesai || '';
  return a && b ? `${a} - ${b} WIB` : (a ? `${a} WIB` : '-');
}
function aujRec() { return allAdmUjian.find(x => x.key === aujAktifKey) || null; }
function aujUrutSesi() {
  return [...allAdmUjian].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (a.ruang || '').localeCompare(b.ruang || '', 'id'));
}
// Daftar peserta "hidup" dari Data Siswa (urut abjad, nomor = urutan).
function aujPesertaLive(kelas) {
  return (allSiswa || []).filter(s => s.kelas === kelas)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'))
    .map((s, i) => ({ key: s.key, nama: s.name || '-', kelas: s.kelas, no: i + 1 }));
}
// Kalau sesi punya snapshot (rec.pesertaSnap = { siswaKey: { n: nama, no } }), pakai itu: nomor peserta tetap walau
// Data Siswa berubah, dan pengawas yang tidak mengampu kelas itu tetap bisa mencetak. Tanpa snapshot -> ikut Data Siswa.
function aujPeserta(kelas, rec) {
  const snap = rec && rec.pesertaSnap;
  if (snap && typeof snap === 'object' && Object.keys(snap).length) {
    return Object.keys(snap).map(k => ({ key: k, nama: (snap[k] && snap[k].n) || '-', kelas: rec.kelas || kelas, no: +(snap[k] && snap[k].no) || 0 }))
      .sort((a, b) => a.no - b.no);
  }
  return aujPesertaLive(kelas);
}
function aujBuatSnapPeserta(kelas) {
  const snap = {}; aujPesertaLive(kelas).forEach(p => { snap[p.key] = { n: p.nama, no: p.no }; });
  return Object.keys(snap).length ? snap : null;
}
function aujBarisTeks(teks) {
  return String(teks || '').split('\n').map(x => x.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
}
function aujRekapHadir(rec) {
  const ps = aujPeserta(rec.kelas, rec), st = rec.hadirPeserta || {};
  const r = { total: ps.length, h: 0, s: 0, i: 0, a: 0, belum: 0, tidakHadir: [] };
  ps.forEach(p => {
    const v = st[p.key];
    if (v === 'H') r.h++;
    else if (v === 'S' || v === 'I' || v === 'A') { r[v.toLowerCase()]++; r.tidakHadir.push({ no: p.no, nama: p.nama, ket: AUJ_STATUS[v] }); }
    else r.belum++;
  });
  return r;
}
function aujTempat() {
  const k = String(MADRASAH.kabupaten || '').replace(/^(Kabupaten|Kab\.|Kota)\s+/i, '').trim();
  return (!k || k.indexOf('...') >= 0) ? '' : k;
}

// ---------- Memuat data ----------
function aujMuat(onDone) {
  if (!db || !aujCanOpenMenu()) return Promise.resolve();
  const g = ++aujGen, ta = currentTahunAjaran;
  return _fetchList(_byTahun(AUJ_NODE)).then(a => {
    if (a && g === aujGen) { allAdmUjian = a; aujTahunDimuat = ta; aujTerakhirSegar = Date.now(); }
    if (typeof onDone === 'function') onDone();
  }).catch(e => console.error('aujMuat gagal:', e));
}
function aujMuatDraft() {
  const rec = aujRec();
  aujKursi = Object.assign({}, rec && rec.kursi || {});
  aujHadir = Object.assign({}, rec && rec.hadirPeserta || {});
  aujHadirPengawas = Object.assign({}, rec && rec.pengawasHadir || {});
  aujSel = null;
}
function aujPastikanAktif() {
  if (aujBaru) return;
  if (!aujRec()) { const u = aujUrutSesi(); aujAktifKey = u.length ? u[0].key : null; aujMuatDraft(); }
}

// ---------- Titik masuk dari app.js ----------
function setupAdministrasiUjianPage() {
  const root = aujEl('aujRoot'); if (!root) return;
  if (!aujCanOpenMenu()) { root.innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin, Kepala Madrasah, dan guru yang bisa membuka menu ini.</p>'; return; }
  if (aujTahunDimuat !== currentTahunAjaran) { allAdmUjian = []; aujAktifKey = null; aujBaru = false; }
  aujPastikanAktif();
  aujRenderSemua();
  // Data bisa berubah dari perangkat lain -> segarkan di latar belakang, tapi tidak tiap kali halaman dibuka.
  if (isReallyOnline() && (aujTahunDimuat !== currentTahunAjaran || Date.now() - aujTerakhirSegar > 60 * 1000)) {
    aujTerakhirSegar = Date.now();
    aujMuat(() => {
      aujPastikanAktif();
      const sedangMengetik = document.activeElement && root.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (!sedangMengetik) aujRenderSemua();   // jangan menimpa isian yang sedang diketik
    });
  }
}

// ---------- Kerangka: pilih sesi + tab ----------
function aujRenderSemua() {
  const root = aujEl('aujRoot'); if (!root) return;
  const sesi = aujUrutSesi();
  const opsi = sesi.map(x => `<option value="${escapeHtml(x.key)}" ${x.key === aujAktifKey && !aujBaru ? 'selected' : ''}>${escapeHtml(aujTglIndo(x.tanggal))} — ${escapeHtml(x.nama || '-')} — ${escapeHtml(x.kelas || '-')}${x.ruang ? ' (' + escapeHtml(x.ruang) + ')' : ''}</option>`).join('');
  const ada = sesi.length > 0;
  const nBentrok = aujCariBentrok(allAdmUjian).pasangan.length;   // lencana ⚠️ di tab Jadwal Ujian
  root.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:12px;">
      <div style="flex:1;min-width:220px;"><label class="label">Sesi ASAS/ASAT / Ruang</label>
        <select id="aujPilihSesi" class="field" onchange="aujPilihSesi(this.value)" ${ada ? '' : 'disabled'}>${aujBaru && ada ? '<option value="" selected>— sesi baru (belum disimpan) —</option>' : ''}${ada ? opsi : '<option>(belum ada sesi ASAS/ASAT)</option>'}</select></div>
      ${aujCanEdit() ? '<button class="btn btn-success" onclick="aujBuatSesi()">➕ Sesi Baru</button>' : ''}
      ${ada && !aujBaru ? '<button class="btn btn-soft" onclick="aujCetakSemua()">🖨️ Cetak Semua Berkas</button>' : ''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
      ${AUJ_TABS.map(t => `<button class="btn ${t.id === aujTabAktif ? 'btn-primary' : 'btn-soft'}" style="padding:6px 12px;font-size:13px;" onclick="aujPilihTab('${t.id}')">${t.label}${t.id === 'jadwal' && nBentrok ? ` ⚠️${nBentrok}` : ''}</button>`).join('')}
    </div>
    <div id="aujTabBody"></div>`;
  aujRenderTab();
}
function aujPilihSesi(key) {
  if (!key) return;
  const lama = aujRec();
  if (lama && aujCanEdit() && ['hadir', 'denah'].some(j => aujDraftBeda(j, lama)) && !confirm('Ada perubahan yang belum disimpan pada sesi ini. Pindah sesi dan buang perubahan itu?')) { aujRenderSemua(); return; }
  aujAktifKey = key; aujBaru = false; aujSalinan = null; aujMuatDraft(); aujRenderSemua();
}
function aujPilihTab(id) { if (aujTabAktif === 'denah') aujTangkapDraftDenah(); aujTabAktif = id; aujSel = null; aujRenderSemua(); }
function aujBuatSesi() {
  if (!aujCanEdit()) return;
  aujBaru = true; aujSalinan = null; aujAktifKey = null; aujTabAktif = 'sesi'; aujKursi = {}; aujHadir = {}; aujHadirPengawas = {}; aujSel = null;
  aujRenderSemua();
}
// Isian teks tab Denah ikut dibawa saat layar digambar ulang (klik kursi, ubah ukuran), supaya tidak hilang.
function aujTangkapDraftDenah() {
  const rec = aujRec(), ta = aujEl('aujLokasiDenah'); if (!rec || !ta) return;
  rec.lokasiDenah = ta.value;
  const c = aujEl('aujLokasiCatatan'); if (c) rec.lokasiCatatan = c.value;
  const p = aujEl('aujPintu'); if (p) rec.denahPintu = p.value;
  // Ukuran denah juga ikut ditangkap (di memori), bukan hanya setelah Simpan Denah. Kosong = biarkan nilai lama.
  const b = aujEl('aujBaris'), k = aujEl('aujKolom');
  if (b && b.value !== '') rec.denahBaris = aujInt(b.value, 6, 1, 15);
  if (k && k.value !== '') rec.denahKolom = aujInt(k.value, 5, 1, 8);
}
function aujRenderTab() {
  const body = aujEl('aujTabBody'); if (!body) return;
  if (aujTabAktif === 'denah') aujTangkapDraftDenah();
  if (aujTabAktif === 'jadwal') { body.innerHTML = aujHtmlJadwal(); return; }   // tab ini tidak butuh sesi terpilih
  const rec = aujRec();
  if (aujTabAktif !== 'sesi' && !rec) {
    if (aujBaru) { body.innerHTML = '<p style="color:#6b7280;font-size:13px;">Simpan sesi baru dulu di tab <strong>Data Sesi</strong>, baru tab ini bisa diisi.</p>'; return; }
    body.innerHTML = `<p style="color:#6b7280;font-size:13px;">${aujCanEdit() ? 'Belum ada sesi ASAS/ASAT. Klik <strong>➕ Sesi Baru</strong> lalu isi tab Data Sesi.' : 'Belum ada sesi ASAS/ASAT. Admin perlu membuatnya dulu.'}</p>`;
    return;
  }
  if (aujTabAktif === 'sesi') { body.innerHTML = aujHtmlSesi(rec); aujCekBentrokForm(); }
  else if (aujTabAktif === 'hadir') body.innerHTML = aujHtmlHadir(rec);
  else if (aujTabAktif === 'tatib') body.innerHTML = aujHtmlTatib(rec);
  else if (aujTabAktif === 'denah') body.innerHTML = aujHtmlDenah(rec);
  else if (aujTabAktif === 'kartu') body.innerHTML = aujHtmlKartu(rec);
  else if (aujTabAktif === 'ba') body.innerHTML = aujHtmlBA(rec);
}

// ---------- Penyimpanan ----------
function aujTulis(patch, pesanOk, aksiLog, sesudah) {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa mengubah administrasi ASAS/ASAT!', true);
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  if (isBusy('aujTulis')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Penyimpanan administrasi ASAS/ASAT butuh koneksi internet — coba lagi setelah online.', true);
  setBusy('aujTulis');
  const data = Object.assign({}, patch, { updatedBy: currentUser.name, updatedAt: new Date().toISOString() });
  db.ref(AUJ_NODE + '/' + rec.key).update(data, err => {
    clearBusy('aujTulis');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    Object.keys(data).forEach(k => { if (data[k] === null) delete rec[k]; else rec[k] = data[k]; });
    toast(pesanOk); addLog(aksiLog, aujLogDetail(rec.nama, rec.kelas, rec.ruang));
    if (typeof sesudah === 'function') sesudah(rec);
    // Rec sudah diperbarui di memori (di atas). Draft yang di-reset hanya yang baru saja disimpan, supaya isian tab lain
    // yang belum disimpan tidak hilang. Tidak ada fetch ulang di sini (dulu bisa menimpa klik/isian yang sedang dikerjakan);
    // data dari perangkat lain tetap tersegarkan lewat setupAdministrasiUjianPage().
    if ('kursi' in data) aujKursi = Object.assign({}, rec.kursi || {});
    if ('hadirPeserta' in data) aujHadir = Object.assign({}, rec.hadirPeserta || {});
    if ('pengawasHadir' in data) aujHadirPengawas = Object.assign({}, rec.pengawasHadir || {});
    aujSel = null; aujRenderSemua();
  });
}
// Detail untuk addLog: teks MENTAH. renderLogs() di app.js sudah meng-escapeHtml saat menampilkan, jadi jangan di-escape di sini
// (dulu di-escape dua kali sehingga tampil "&amp;" di log).
function aujLogDetail(nama, kelas, ruang) {
  return `${nama || '-'} - ${kelas || '-'} - ${ruang || '-'}`;
}
function aujPerbaruiPeserta() {
  if (!aujCanEdit()) return;
  const rec = aujRec(); if (!rec) return;
  const baru = aujBuatSnapPeserta(rec.kelas);
  if (!baru) return toast('Belum ada siswa di ' + (rec.kelas || 'kelas ini') + ' pada Data Siswa.', true);
  const ada = !!rec.pesertaSnap;
  const pesan = ada
    ? 'Perbarui daftar peserta dari Data Siswa sekarang?\n\nSiswa baru ikut masuk, yang sudah keluar dihapus, dan NOMOR PESERTA bisa berubah. Kartu peserta yang sudah dicetak harus dicetak ulang.'
    : 'Bekukan daftar peserta sesi ini sekarang?\n\nSetelah dibekukan, nomor peserta tidak berubah lagi walau Data Siswa berubah. Cetak kartu SESUDAH ini.';
  if (!doubleConfirm(pesan)) return;
  aujTulis({ pesertaSnap: baru }, ada ? '✅ Daftar peserta diperbarui.' : '✅ Daftar peserta dibekukan.', 'bekukan_peserta_ujian');
}
function aujKosongJadiNull(v) { return v === '' || v === undefined ? null : v; }

// =====================================================
// TAB 1 -- DATA SESI
// =====================================================
function aujHtmlSesi(rec) {
  const r = aujBaru ? (aujSalinan || {}) : (rec || {});
  const ed = aujCanEdit(), dis = ed ? '' : 'disabled';
  const cekB = 'oninput="aujCekBentrokForm()"';   // tanggal / jam / pengawas diubah -> periksa bentrok pengawas
  const kelasOpt = KELAS_LIST.map(k => `<option value="${escapeHtml(k)}" ${r.kelas === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
  const guruOpt = (allGuru || []).map(g => `<option value="${escapeHtml(g.name || '')}"></option>`).join('');
  const f = (id, label, val, type, extra) => `<div><label class="label">${label}</label><input id="${id}" class="field" type="${type || 'text'}" value="${escapeHtml(val || '')}" ${dis} ${extra || ''}></div>`;
  return `
    <datalist id="aujGuruList">${guruOpt}</datalist>
    <h4 style="font-weight:700;margin-bottom:8px;">${aujBaru ? '➕ Sesi ASAS/ASAT Baru' : '📋 Data Sesi ASAS/ASAT'}</h4>
    ${aujBaru && aujSalinan ? `<p style="font-size:12px;color:#1d4ed8;background:#eff6ff;border-radius:6px;padding:6px 10px;margin-bottom:10px;">📑 Disalin dari <strong>${escapeHtml(aujSalinan._dari || '')}</strong>. Nama pengawas dikosongkan. Ubah tanggal / jam / kelas / ruang seperlunya, lalu klik Simpan Sesi.</p>` : ''}
    <div class="grid-2" style="margin-bottom:10px;">
      ${f('aujNama', 'Nama Asesmen *', r.nama, 'text', 'maxlength="100" placeholder="Contoh: ASAS Ganjil"')}
      ${f('aujMapel', 'Mata Pelajaran', r.mapel, 'text', 'maxlength="80" placeholder="Contoh: Matematika"')}
    </div>
    <div class="grid-3" style="margin-bottom:10px;">
      <div><label class="label">Kelas (peserta) *</label><select id="aujKelas" class="field" ${dis}><option value="">-- Pilih Kelas --</option>${kelasOpt}</select></div>
      ${f('aujRuang', 'Ruang ASAS/ASAT *', r.ruang, 'text', 'maxlength="40" placeholder="Contoh: Ruang 1"')}
      ${f('aujTanggal', 'Tanggal *', r.tanggal, 'date', cekB)}
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      ${f('aujJamMulai', 'Jam Mulai', r.jamMulai, 'time', cekB)}
      ${f('aujJamSelesai', 'Jam Selesai', r.jamSelesai, 'time', cekB)}
    </div>
    <div class="grid-2" style="margin-bottom:12px;">
      ${f('aujPengawas1', 'Pengawas 1', r.pengawas1, 'text', 'list="aujGuruList" maxlength="80" placeholder="Pilih guru atau ketik nama" ' + cekB)}
      ${f('aujPengawas2', 'Pengawas 2 (opsional)', r.pengawas2, 'text', 'list="aujGuruList" maxlength="80" placeholder="Pilih guru atau ketik nama" ' + cekB)}
    </div>
    <div id="aujWarnBentrok" style="margin-bottom:12px;"></div>
    ${!aujBaru && rec ? `<p style="font-size:12px;color:#6b7280;margin-bottom:10px;">Peserta: <strong>${aujPeserta(rec.kelas, rec).length} siswa</strong> dari ${escapeHtml(rec.kelas || '-')} — ${rec.pesertaSnap ? 'daftar dibekukan (nomor peserta tetap walau Data Siswa berubah).' : '<span style="color:#b45309;">masih mengikuti Data Siswa; nomor peserta bisa bergeser kalau ada siswa masuk/pindah.</span>'}${ed ? ` <button class="btn btn-soft" style="font-size:11px;padding:2px 8px;" onclick="aujPerbaruiPeserta()">🔒 ${rec.pesertaSnap ? 'Perbarui' : 'Bekukan'} Daftar Peserta</button>` : ''}</p>` : ''}
    ${ed ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-success" id="btnAujSimpanSesi" onclick="aujSimpanSesi()">💾 Simpan Sesi</button>
      ${aujBaru ? '<button class="btn btn-soft" onclick="aujBatalBaru()">✖ Batal</button>' : '<button class="btn btn-soft" onclick="aujDuplikat()">📑 Duplikat Sesi</button><button class="btn btn-danger" onclick="aujHapusSesi()">🗑️ Hapus Sesi</button>'}
    </div>` : '<p style="font-size:12px;color:#6b7280;">Lihat saja — perubahan dilakukan oleh Admin.</p>'}`;
}
function aujBatalBaru() { aujBaru = false; aujSalinan = null; aujPastikanAktif(); aujRenderSemua(); }
function aujSimpanSesi() {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa mengubah administrasi ASAS/ASAT!', true);
  const nama = aujVal('aujNama'), kelas = aujVal('aujKelas'), ruang = aujVal('aujRuang'), tanggal = aujVal('aujTanggal');
  const jamMulai = aujVal('aujJamMulai'), jamSelesai = aujVal('aujJamSelesai');
  if (nama.length < 3) return toast('Nama asesmen wajib diisi (minimal 3 karakter)!', true);
  if (!kelas) return toast('Pilih kelas peserta!', true);
  if (!ruang) return toast('Isi nama ruang ASAS/ASAT!', true);
  if (!aujAdaTanggal(tanggal)) return toast('Isi tanggal ASAS/ASAT dengan benar!', true);
  if (jamMulai && jamSelesai && jamMulai >= jamSelesai) return toast('Jam selesai harus setelah jam mulai.', true);
  const isi = {
    nama, kelas, ruang, tanggal, mapel: aujKosongJadiNull(aujVal('aujMapel')),
    jamMulai: aujKosongJadiNull(jamMulai), jamSelesai: aujKosongJadiNull(jamSelesai),
    pengawas1: aujKosongJadiNull(aujVal('aujPengawas1')), pengawas2: aujKosongJadiNull(aujVal('aujPengawas2'))
  };
  // Pengawas harus guru yang terdaftar (supaya honornya bisa dikunci ke orangnya). Nama dirapikan sesuai Data Guru.
  const g1 = isi.pengawas1 ? aujGuruDari(isi.pengawas1) : null, g2 = isi.pengawas2 ? aujGuruDari(isi.pengawas2) : null;
  if (isi.pengawas1 && !g1) return toast(`Pengawas 1 "${isi.pengawas1}" tidak cocok dengan Data Guru. Pilih dari daftar.`, true);
  if (isi.pengawas2 && !g2) return toast(`Pengawas 2 "${isi.pengawas2}" tidak cocok dengan Data Guru. Pilih dari daftar.`, true);
  isi.pengawas1 = g1 ? g1.name : null; isi.pengawas1Key = g1 ? g1.key : null;
  isi.pengawas2 = g2 ? g2.name : null; isi.pengawas2Key = g2 ? g2.key : null;
  // Pengawas bentrok = peringatan, bukan larangan (kadang memang disengaja), jadi Admin diberi pilihan.
  const bentrok = aujPesanBentrokSesi(isi);
  if (bentrok.length && !confirm('⚠️ Pengawas bentrok:\n\n• ' + bentrok.join('\n• ') + '\n\nTetap simpan sesi ini?')) return;
  if (aujBaru) {
    if (isBusy('aujSimpanSesi')) return toast('Sedang menyimpan...', false, 1500);
    if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
    // Sesi baru mewarisi denah lokasi & tata tertib buatan sesi terbaru, supaya tidak mengetik ulang.
    const acuan = aujUrutSesi()[0] || {};
    const data = Object.assign({}, isi, {
      lokasiDenah: acuan.lokasiDenah || null, lokasiCatatan: acuan.lokasiCatatan || null,
      tatibPeserta: acuan.tatibPeserta || null, tatibPengawas: acuan.tatibPengawas || null,
      pesertaSnap: aujBuatSnapPeserta(kelas),
      tahunAjaran: currentTahunAjaran, semester: currentSemesterAktif || null,
      inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: new Date().toISOString()
    });
    const ref = db.ref(AUJ_NODE).push(), btn = aujEl('btnAujSimpanSesi');
    setBusy('aujSimpanSesi', btn);
    ref.set(data, err => {
      clearBusy('aujSimpanSesi', btn);
      if (err) return toast('Gagal: ' + (err.message || err), true);
      toast('✅ Sesi ASAS/ASAT tersimpan!'); addLog('buat_administrasi_ujian', aujLogDetail(nama, kelas, ruang));
      aujAktifKey = ref.key; aujBaru = false; aujSalinan = null;
      allAdmUjian.push(Object.assign({ key: ref.key }, data));   // langsung tampil, tidak bergantung pada fetch ulang
      aujMuatDraft(); aujRenderSemua();
    });
    return;
  }
  // Ganti kelas -> daftar hadir & denah lama tidak cocok lagi, jadi dikosongkan (setelah konfirmasi).
  const rec = aujRec(); if (!rec) return;
  const patch = Object.assign({}, isi);
  // Nama pengawas diganti -> status hadir lama jangan ikut pindah ke orang baru.
  const pwBaru = Object.assign({}, rec.pengawasHadir || {});
  if ((rec.pengawas1 || null) !== isi.pengawas1) delete pwBaru.p1;
  if ((rec.pengawas2 || null) !== isi.pengawas2) delete pwBaru.p2;
  if (JSON.stringify(pwBaru) !== JSON.stringify(rec.pengawasHadir || {})) patch.pengawasHadir = Object.keys(pwBaru).length ? pwBaru : null;
  if (rec.kelas !== kelas) {
    if (!doubleConfirm(`Kelas peserta diubah dari ${rec.kelas} ke ${kelas}.\n\nDaftar hadir peserta dan denah tempat duduk sesi ini akan dikosongkan. Lanjutkan?`)) return;
    patch.hadirPeserta = null; patch.kursi = null; patch.pesertaSnap = aujBuatSnapPeserta(kelas);
  }
  if (!aujCekUbahHonor(rec, isi)) return;   // sudah ada check-in honor -> jam / pengawas yang sudah check-in tidak boleh diubah
  aujTulis(patch, '✅ Data sesi diperbarui!', 'ubah_administrasi_ujian', aujSinkronHonor);   // sesi honor (jika ada) ikut diperbarui
}
function aujHapusSesi() {
  if (!aujCanEdit()) return;
  const rec = aujRec(); if (!rec) return;
  if (isBusy('aujHapus')) return;
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  const uHonor = aujSesiHonorDari(rec.key);
  if (uHonor && (allUjianAttendance || []).some(x => x.ujianKey === uHonor.key)) return toast('Sesi ini sudah punya check-in honor pengawas, jadi tidak bisa dihapus. Hapus dulu check-in-nya di Honor Ujian bila memang perlu.', true);
  if (!doubleConfirm(`Hapus sesi ASAS/ASAT ini beserta daftar hadir, denah, dan berita acaranya?\n\n${rec.nama || '-'} • ${rec.kelas || '-'} • ${rec.ruang || '-'}\n${aujTglIndo(rec.tanggal, true)}`)) return;
  setBusy('aujHapus');
  db.ref(AUJ_NODE + '/' + rec.key).remove(err => {
    clearBusy('aujHapus');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    toast('✅ Sesi ASAS/ASAT dihapus.'); addLog('hapus_administrasi_ujian', aujLogDetail(rec.nama, rec.kelas, rec.ruang));
    allAdmUjian = allAdmUjian.filter(x => x.key !== rec.key);
    if (uHonor) { db.ref('ujian/' + uHonor.key).remove(() => {}); allUjian = allUjian.filter(x => x.key !== uHonor.key); }   // sesi honor yang belum dipakai ikut dibersihkan
    aujAktifKey = null; aujPastikanAktif(); aujRenderSemua();
  });
}

// =====================================================
// TAB 2 -- DAFTAR HADIR
// =====================================================
function aujHtmlHadir(rec) {
  const ps = aujPeserta(rec.kelas, rec), ed = aujCanEdit();
  const opt = v => `<option value="">— belum —</option>` + Object.keys(AUJ_STATUS).map(k => `<option value="${k}" ${v === k ? 'selected' : ''}>${AUJ_STATUS[k]}</option>`).join('');
  const barisPeserta = ps.map(p => `<tr>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.no}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(p.nama)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;"><select class="field" style="padding:3px 6px;font-size:13px;" ${ed ? '' : 'disabled'} onchange="aujSetHadir('${escapeJs(p.key)}', this.value)">${opt(aujHadir[p.key])}</select></td></tr>`).join('');
  const pw = (id, nama) => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:14px;"><input type="checkbox" ${aujHadirPengawas[id] ? 'checked' : ''} ${ed ? '' : 'disabled'} onchange="aujSetHadirPengawas('${escapeJs(id)}', this.checked)"> ${escapeHtml(nama)} <span style="color:#6b7280;font-size:12px;">(${id === 'p1' ? 'Pengawas 1' : 'Pengawas 2'})</span></label>`;
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">✅ Daftar Hadir — ${escapeHtml(rec.kelas || '')} · ${escapeHtml(rec.ruang || '')}</h4>
      <button class="btn btn-primary" onclick="aujCetakSatu('hadir')">🖨️ Cetak Daftar Hadir</button>
    </div>
    <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">Status di sini dipakai untuk rekap Berita Acara. Formulir cetak tetap memuat kolom tanda tangan untuk diisi langsung di ruang ASAS/ASAT.</p>
    <h5 style="font-weight:700;font-size:13px;margin:12px 0 6px;">Pengawas</h5>
    ${rec.pengawas1 || rec.pengawas2 ? (rec.pengawas1 ? pw('p1', rec.pengawas1) : '') + (rec.pengawas2 ? pw('p2', rec.pengawas2) : '') : '<p style="font-size:13px;color:#6b7280;">Nama pengawas belum diisi (tab Data Sesi).</p>'}
    <h5 style="font-weight:700;font-size:13px;margin:14px 0 6px;">Peserta (${ps.length} siswa)</h5>
    ${ps.length ? `${ed ? '<div style="margin-bottom:8px;"><button class="btn btn-soft" style="font-size:12px;padding:4px 10px;" onclick="aujHadirSemua()">✔ Tandai semua Hadir</button></div>' : ''}
    <div style="overflow-x:auto;max-height:420px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f3f4f6;position:sticky;top:0;"><th style="padding:6px 8px;width:44px;">No</th><th style="padding:6px 8px;text-align:left;">Nama</th><th style="padding:6px 8px;text-align:left;width:150px;">Status</th></tr></thead><tbody>${barisPeserta}</tbody></table>
    </div>` : `<p style="font-size:13px;color:#dc2626;">Belum ada siswa di ${escapeHtml(rec.kelas || 'kelas ini')} pada Data Siswa${aujCanEdit() ? '' : ' (atau bukan kelas yang Anda ampu)'}.</p>`}
    ${ed ? '<button class="btn btn-success" style="margin-top:12px;" onclick="aujSimpanHadir()">💾 Simpan Kehadiran</button>' : ''}`;
}
function aujSetHadir(key, v) { if (v) aujHadir[key] = v; else delete aujHadir[key]; }
function aujSetHadirPengawas(id, v) { aujHadirPengawas[id] = !!v; }
function aujHadirSemua() {
  const rec = aujRec(); if (!rec) return;
  aujPeserta(rec.kelas, rec).forEach(p => { aujHadir[p.key] = 'H'; });
  aujRenderTab();
}
function aujSimpanHadir() {
  const rec = aujRec(); if (!rec) return;
  const sah = {}; aujPeserta(rec.kelas, rec).forEach(p => { if (aujHadir[p.key]) sah[p.key] = aujHadir[p.key]; });   // buang siswa yang sudah tidak ada
  const pw = {}; if (rec.pengawas1 && aujHadirPengawas.p1) pw.p1 = true; if (rec.pengawas2 && aujHadirPengawas.p2) pw.p2 = true;
  aujTulis({ hadirPeserta: Object.keys(sah).length ? sah : null, pengawasHadir: Object.keys(pw).length ? pw : null }, '✅ Kehadiran tersimpan!', 'simpan_hadir_ujian');
}

// =====================================================
// TAB 3 -- TATA TERTIB
// =====================================================
function aujTatibTeks(rec, jenis) {
  return jenis === 'peserta' ? (rec.tatibPeserta || AUJ_TATIB_PESERTA_DEFAULT) : (rec.tatibPengawas || AUJ_TATIB_PENGAWAS_DEFAULT);
}
function aujHtmlTatib(rec) {
  const ed = aujCanEdit();
  const blok = (jenis, judul) => `
    <div style="margin-bottom:16px;">
      <h5 style="font-weight:700;font-size:14px;margin-bottom:6px;">${judul}</h5>
      ${ed ? `<textarea id="aujTatib_${jenis}" class="field" rows="9" style="font-size:13px;">${escapeHtml(aujTatibTeks(rec, jenis))}</textarea>
        <p style="font-size:11px;color:#6b7280;margin-top:3px;">Satu butir per baris — nomor ditambahkan otomatis saat dicetak.</p>`
      : `<ol style="padding-left:20px;font-size:13px;line-height:1.7;">${aujBarisTeks(aujTatibTeks(rec, jenis)).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`}
    </div>`;
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">📜 Tata Tertib ASAS/ASAT</h4>
      <button class="btn btn-primary" onclick="aujCetakSatu('tatib')">🖨️ Cetak Tata Tertib</button>
    </div>
    ${blok('peserta', 'Tata Tertib Peserta ASAS/ASAT')}
    ${blok('pengawas', 'Tata Tertib Pengawas ASAS/ASAT')}
    ${ed ? `<div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-success" onclick="aujSimpanTatib()">💾 Simpan Tata Tertib</button><button class="btn btn-soft" onclick="aujResetTatib()">↺ Kembalikan ke Bawaan</button></div>` : ''}`;
}
function aujSimpanTatib() {
  const p = aujEl('aujTatib_peserta'), w = aujEl('aujTatib_pengawas'); if (!p || !w) return;
  const bersih = t => t.replace(/\[\[/g, '[ ['), tp = bersih(aujBarisTeks(p.value).join('\n')), tw = bersih(aujBarisTeks(w.value).join('\n'));
  if (!tp || !tw) return toast('Tata tertib tidak boleh kosong. Pakai "Kembalikan ke Bawaan" kalau ingin memulai ulang.', true);
  aujTulis({ tatibPeserta: tp, tatibPengawas: tw }, '✅ Tata tertib disimpan!', 'simpan_tatib_ujian');
}
function aujResetTatib() {
  if (!confirm('Kembalikan tata tertib peserta dan pengawas sesi ini ke teks bawaan? Perubahan yang pernah Anda buat akan hilang.')) return;
  aujTulis({ tatibPeserta: null, tatibPengawas: null }, '✅ Tata tertib dikembalikan ke bawaan.', 'reset_tatib_ujian');
}

// =====================================================
// TAB 4 -- DENAH (lokasi + tempat duduk)
// =====================================================
function aujDimensi(rec) { return { B: aujInt(rec.denahBaris, 6, 1, 15), K: aujInt(rec.denahKolom, 5, 1, 8) }; }
// Denah lokasi: tiap baris teks = satu baris ruangan di gedung, dipisah tanda "|". Ruang ASAS/ASAT sesi ini disorot.
function aujLokasiHtml(rec) {
  const baris = String(rec.lokasiDenah || '').split('\n').map(x => x.trim()).filter(Boolean).map(x => x.split('|').map(y => y.trim()));
  if (!baris.length) return '<p style="font-size:13px;color:#6b7280;">Denah lokasi belum diisi.</p>';
  const kol = Math.max.apply(null, baris.map(b => b.length)), target = String(rec.ruang || '').trim().toLowerCase();
  let ada = false;
  const rows = baris.map(b => '<tr>' + Array.from({ length: kol }, (_, i) => {
    const t = b[i] || '';
    if (!t) return '<td style="border:none;"></td>';
    const sorot = t.toLowerCase() === target; if (sorot) ada = true;
    return `<td style="border:1px solid #64748b;padding:8px 6px;text-align:center;font-size:12px;height:38px;${sorot ? 'background:#fde68a;font-weight:700;border:2px solid #b45309;' : 'background:#f8fafc;'}">${sorot ? '📍 ' : ''}${escapeHtml(t)}</td>`;
  }).join('') + '</tr>').join('');
  return `<table style="width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed;">${rows}</table>
    ${ada ? '<p style="font-size:11px;color:#92400e;margin-top:4px;">📍 Ruang ASAS/ASAT ditandai warna kuning.</p>' : `<p style="font-size:11px;color:#dc2626;margin-top:4px;">Nama ruang "${escapeHtml(rec.ruang || '')}" belum ditemukan di denah — samakan penulisannya agar tersorot.</p>`}
    ${rec.lokasiCatatan ? `<p style="font-size:12px;margin-top:4px;">${escapeHtml(rec.lokasiCatatan)}</p>` : ''}`;
}
// Denah tempat duduk. interaktif=true dipakai di layar (bisa diklik); false untuk cetak.
function aujGridHtml(rec, kursi, peserta, interaktif) {
  const { B, K } = aujDimensi(rec), byKey = {}; peserta.forEach(p => { byKey[p.key] = p; });
  let h = `<table style="width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed;">
    <tr><td colspan="${K}" style="border:1px solid #334155;background:#e2e8f0;text-align:center;font-size:12px;font-weight:700;padding:6px;">MEJA PENGAWAS / PAPAN TULIS</td></tr>`;
  for (let r = 1; r <= B; r++) {
    h += '<tr>';
    for (let c = 1; c <= K; c++) {
      const k = r + '_' + c, p = byKey[kursi[k]], pilih = interaktif && aujSel && aujSel.t === 'k' && aujSel.k === k;
      const gaya = `border:1px solid #64748b;padding:4px 3px;text-align:center;font-size:${interaktif ? 11 : 10}px;height:${interaktif ? 48 : 44}px;vertical-align:middle;overflow:hidden;` +
        (pilih ? 'background:#bfdbfe;outline:2px solid #2563eb;' : (p ? 'background:#f0fdf4;' : 'background:#fff;color:#9ca3af;')) + (interaktif && aujCanEdit() ? 'cursor:pointer;' : '');
      h += `<td style="${gaya}" ${interaktif && aujCanEdit() ? `onclick="aujKlikKursi(${r},${c})"` : ''}>${p ? `<div style="font-weight:700;">${p.no}</div><div style="line-height:1.15;">${escapeHtml(p.nama)}</div>` : '·'}</td>`;
    }
    h += '</tr>';
  }
  const pintu = rec.denahPintu === 'kiri' ? 'left' : 'right';
  h += `<tr><td colspan="${K}" style="border:none;text-align:${pintu};font-size:12px;font-weight:700;padding-top:2px;">🚪 PINTU MASUK</td></tr></table>`;
  return h;
}
function aujHtmlDenah(rec) {
  const ed = aujCanEdit(), dis = ed ? '' : 'disabled', ps = aujPeserta(rec.kelas, rec), { B, K } = aujDimensi(rec);
  const terpakai = new Set(Object.keys(aujKursi).map(k => aujKursi[k]));
  const belum = ps.filter(p => !terpakai.has(p.key));
  const chip = p => `<button class="btn ${aujSel && aujSel.t === 's' && aujSel.key === p.key ? 'btn-primary' : 'btn-soft'}" style="padding:3px 8px;font-size:12px;" ${ed ? `onclick="aujKlikSiswa('${escapeJs(p.key)}')"` : 'disabled'}>${p.no}. ${escapeHtml(p.nama)}</button>`;
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">🗺️ Denah Lokasi & Tempat Duduk</h4>
      <button class="btn btn-primary" onclick="aujCetakSatu('denah')">🖨️ Cetak Denah</button>
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:14px;">
      <h5 style="font-weight:700;font-size:14px;margin-bottom:4px;">1. Denah Lokasi Ruang ASAS/ASAT</h5>
      ${ed ? `<p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Satu baris = satu deret ruangan di gedung; pisahkan ruangan dengan tanda <strong>|</strong>. Kosongkan sel dengan spasi antar tanda | (mis. <code>Ruang 1 | | Ruang 2</code>).</p>
      <textarea id="aujLokasiDenah" class="field" rows="5" style="font-family:monospace;font-size:12px;" placeholder="Ruang 1 | Ruang 2 | Ruang 3&#10;Kantor | Perpustakaan | Ruang 4" oninput="aujPratinjauLokasi()">${escapeHtml(rec.lokasiDenah || '')}</textarea>
      <input id="aujLokasiCatatan" class="field" style="margin:6px 0;" maxlength="160" placeholder="Keterangan (opsional), mis. Pintu masuk utama dari halaman depan" value="${escapeHtml(rec.lokasiCatatan || '')}">` : ''}
      <div id="aujLokasiPreview" style="margin-top:6px;">${aujLokasiHtml(rec)}</div>
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:12px;">
      <h5 style="font-weight:700;font-size:14px;margin-bottom:6px;">2. Denah Tempat Duduk — ${escapeHtml(rec.ruang || '')} (${ps.length} peserta)</h5>
      ${ed ? `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:8px;">
        <div><label class="label">Baris</label><input id="aujBaris" type="number" class="field" style="width:80px;" min="1" max="15" value="${B}" ${dis} onchange="aujUbahUkuran()"></div>
        <div><label class="label">Kolom</label><input id="aujKolom" type="number" class="field" style="width:80px;" min="1" max="8" value="${K}" ${dis} onchange="aujUbahUkuran()"></div>
        <div><label class="label">Pintu</label><select id="aujPintu" class="field" ${dis}><option value="kanan" ${rec.denahPintu !== 'kiri' ? 'selected' : ''}>Kanan</option><option value="kiri" ${rec.denahPintu === 'kiri' ? 'selected' : ''}>Kiri</option></select></div>
        <button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahOtomatis(false)">🔤 Urut Abjad</button>
        <button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahOtomatis(true)">🎲 Acak</button>
        <button class="btn btn-soft" style="font-size:12px;" onclick="aujKosongkanTerpilih()">⬜ Kosongkan Kursi Terpilih</button>
        <button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahReset()">🧹 Kosongkan Semua</button>
      </div>
      <p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Tukar posisi: klik satu kursi, lalu klik kursi lain. Untuk menaruh siswa dari daftar "belum dapat kursi": klik namanya lalu klik kursinya.</p>` : ''}
      <div id="aujGridWrap" style="overflow-x:auto;">${aujGridHtml(rec, aujKursi, ps, true)}</div>
      ${belum.length ? `<p style="font-size:12px;font-weight:700;margin:10px 0 4px;">Belum dapat kursi (${belum.length}):</p><div style="display:flex;flex-wrap:wrap;gap:4px;">${belum.map(chip).join('')}</div>` : (ps.length ? '<p style="font-size:12px;color:#059669;margin-top:8px;">✅ Semua peserta sudah mendapat kursi.</p>' : '')}
    </div>
    ${ed ? '<button class="btn btn-success" onclick="aujSimpanDenah()">💾 Simpan Denah</button>' : ''}`;
}
function aujPratinjauLokasi() {
  const rec = aujRec(), box = aujEl('aujLokasiPreview'), ta = aujEl('aujLokasiDenah'); if (!rec || !box || !ta) return;
  box.innerHTML = aujLokasiHtml(Object.assign({}, rec, { lokasiDenah: ta.value }));
}
function aujUbahUkuran() {
  const rec = aujRec(); if (!rec) return;
  let lepas = 0;
  const B = aujInt(aujVal('aujBaris'), 6, 1, 15), K = aujInt(aujVal('aujKolom'), 5, 1, 8);
  Object.keys(aujKursi).forEach(k => { const [r, c] = k.split('_').map(Number); if (r > B || c > K) { delete aujKursi[k]; lepas++; } });   // kursi di luar ukuran baru dilepas
  rec.denahBaris = B; rec.denahKolom = K;   // hanya di memori sampai disimpan
  aujSel = null; aujRenderTab();
  if (lepas) toast('ℹ️ ' + lepas + ' kursi di luar ukuran baru dilepas (belum disimpan).', false, 3500);
}
function aujDenahOtomatis(acak) {
  const rec = aujRec(); if (!rec) return;
  const ps = aujPeserta(rec.kelas, rec), { B, K } = aujDimensi(rec);
  if (ps.length > B * K) return toast(`Kursi (${B * K}) kurang dari jumlah peserta (${ps.length}). Tambah baris/kolom dulu.`, true);
  if (Object.keys(aujKursi).length && !confirm('Susunan kursi saat ini akan ditimpa. Lanjutkan?')) return;
  const urut = ps.slice();
  if (acak) for (let i = urut.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [urut[i], urut[j]] = [urut[j], urut[i]]; }
  aujKursi = {}; urut.forEach((p, i) => { aujKursi[(Math.floor(i / K) + 1) + '_' + ((i % K) + 1)] = p.key; });
  aujSel = null; aujRenderTab();
}
function aujDenahReset() { if (!confirm('Kosongkan semua kursi pada denah?')) return; aujKursi = {}; aujSel = null; aujRenderTab(); }
function aujSetKursi(k, key) {
  if (key) { Object.keys(aujKursi).forEach(x => { if (aujKursi[x] === key) delete aujKursi[x]; }); aujKursi[k] = key; }
  else delete aujKursi[k];
}
function aujKlikKursi(r, c) {
  if (!aujCanEdit()) return;
  const k = r + '_' + c, s = aujSel;
  if (!s) aujSel = { t: 'k', k };
  else if (s.t === 'k') {
    if (s.k !== k) { const a = aujKursi[s.k], b = aujKursi[k]; aujSetKursi(k, a); aujSetKursi(s.k, b); }
    aujSel = null;
  } else { aujSetKursi(k, s.key); aujSel = null; }
  aujRenderTab();
}
function aujKlikSiswa(key) {
  if (!aujCanEdit()) return;
  if (aujSel && aujSel.t === 'k') { aujSetKursi(aujSel.k, key); aujSel = null; }
  else aujSel = { t: 's', key };
  aujRenderTab();
}
function aujKosongkanTerpilih() {
  if (aujSel && aujSel.t === 'k') { aujSetKursi(aujSel.k, null); aujSel = null; aujRenderTab(); }
  else toast('Klik dulu kursi yang ingin dikosongkan.', true);
}
function aujSimpanDenah() {
  const rec = aujRec(); if (!rec) return;
  const B = aujInt(aujVal('aujBaris'), 6, 1, 15), K = aujInt(aujVal('aujKolom'), 5, 1, 8);
  const sah = new Set(aujPeserta(rec.kelas, rec).map(p => p.key)), kursi = {};
  Object.keys(aujKursi).forEach(k => { const [r, c] = k.split('_').map(Number); if (r <= B && c <= K && sah.has(aujKursi[k])) kursi[k] = aujKursi[k]; });
  aujTulis({
    lokasiDenah: aujKosongJadiNull(aujVal('aujLokasiDenah')), lokasiCatatan: aujKosongJadiNull(aujVal('aujLokasiCatatan')),
    denahBaris: B, denahKolom: K, denahPintu: aujVal('aujPintu') === 'kiri' ? 'kiri' : 'kanan',
    kursi: Object.keys(kursi).length ? kursi : null
  }, '✅ Denah tersimpan!', 'simpan_denah_ujian');
}

// =====================================================
// TAB 5 -- BERITA ACARA
// =====================================================
function aujHtmlBA(rec) {
  const ed = aujCanEdit(), dis = ed ? '' : 'disabled', rk = aujRekapHadir(rec);
  const f = (id, label, val, type, extra) => `<div><label class="label">${label}</label><input id="${id}" class="field" type="${type || 'text'}" value="${escapeHtml(val == null ? '' : val)}" ${dis} ${extra || ''}></div>`;
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">📄 Berita Acara Pelaksanaan ASAS/ASAT</h4>
      <button class="btn btn-primary" onclick="aujCetakSatu('ba')">🖨️ Cetak Berita Acara</button>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;">
      <strong>Rekap otomatis dari Daftar Hadir:</strong> peserta seharusnya <strong>${rk.total}</strong> · hadir <strong>${rk.h}</strong> · tidak hadir <strong>${rk.s + rk.i + rk.a}</strong> (sakit ${rk.s}, izin ${rk.i}, alpa ${rk.a})${rk.belum ? ` · <span style="color:#b45309;">${rk.belum} belum diisi statusnya</span>` : ''}
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      ${f('aujBaMulai', 'ASAS/ASAT Dimulai Pukul (aktual)', rec.baMulai || rec.jamMulai, 'time')}
      ${f('aujBaSelesai', 'ASAS/ASAT Selesai Pukul (aktual)', rec.baSelesai || rec.jamSelesai, 'time')}
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      ${f('aujBaNaskah', 'Jumlah Naskah Soal Diterima', rec.baNaskah, 'number', 'min="0" step="1" inputmode="numeric"')}
      ${f('aujBaLjk', 'Jumlah Lembar Jawaban Dikumpulkan', rec.baLjk, 'number', 'min="0" step="1" inputmode="numeric"')}
    </div>
    <div style="margin-bottom:12px;"><label class="label">Catatan Selama Pelaksanaan ASAS/ASAT</label>
      <textarea id="aujBaCatatan" class="field" rows="4" maxlength="800" ${dis} placeholder="Tuliskan kejadian khusus, atau isi &quot;ASAS/ASAT berjalan dengan tertib dan lancar.&quot;">${escapeHtml(rec.baCatatan || '')}</textarea></div>
    ${ed ? '<button class="btn btn-success" onclick="aujSimpanBA()">💾 Simpan Berita Acara</button>' : ''}`;
}
function aujSimpanBA() {
  const nas = aujVal('aujBaNaskah'), ljk = aujVal('aujBaLjk');
  const angka = v => v === '' ? null : (/^\d+$/.test(v) ? parseInt(v, 10) : NaN);
  const n = angka(nas), l = angka(ljk);
  if ((n !== null && isNaN(n)) || (l !== null && isNaN(l))) return toast('Jumlah naskah/lembar jawaban harus bilangan bulat ≥ 0.', true);
  aujTulis({
    baMulai: aujKosongJadiNull(aujVal('aujBaMulai')), baSelesai: aujKosongJadiNull(aujVal('aujBaSelesai')),
    baNaskah: n, baLjk: l, baCatatan: aujKosongJadiNull(aujVal('aujBaCatatan'))
  }, '✅ Berita acara tersimpan!', 'simpan_berita_acara_ujian');
}

// =====================================================
// KARTU PESERTA (kertas F4 = 215 x 330 mm)
// =====================================================
// Nomor peserta = nomor urut abjad kelas (p.no), SAMA dengan yang tampil di Daftar Hadir & Denah.
// Kursi diambil dari denah TERSIMPAN (rec.kursi: { 'baris_kolom': siswaKey }). Baris 1 = terdepan
// (dekat meja pengawas / papan tulis), sesuai gambar denah.
// UKURAN KARTU mengikuti eblek (card case) A1 yang umum dijual: casing 100 x 68 mm, kartu di dalamnya
// 85 x 53 mm (8,5 x 5,3 cm), mendatar. Gunting mengikuti garis putus-putus, jadi kartu pas masuk eblek.
// Kertas F4 215 x 330 mm, margin 10mm -> area 195 x 310mm. 2 kolom x 5 baris = 10 kartu per halaman:
// lebar 2x85 + 8 (jarak) = 178mm, tinggi 5x53 + 4x6 (jarak) = 289mm -- keduanya muat.
// Kalau ganti ke eblek lain (mis. A2: kartu 91 x 67 mm), cukup ubah 5 angka di bawah ini.
const AUJ_KARTU_W = 85, AUJ_KARTU_H = 53, AUJ_KARTU_JARAK_X = 8, AUJ_KARTU_JARAK_Y = 6;
const AUJ_KARTU_KOLOM = Math.floor((195 + AUJ_KARTU_JARAK_X) / (AUJ_KARTU_W + AUJ_KARTU_JARAK_X));
const AUJ_KARTU_BARIS = Math.floor((310 + AUJ_KARTU_JARAK_Y) / (AUJ_KARTU_H + AUJ_KARTU_JARAK_Y));
const AUJ_KARTU_PER_HALAMAN = AUJ_KARTU_KOLOM * AUJ_KARTU_BARIS;
// Aturan kartu (dipakai di pratinjau layar DAN di jendela cetak). Semua kelas berawalan kp- agar tidak bentrok.
const AUJ_KARTU_CSS = `
  .kp-halaman { display: grid; grid-template-columns: repeat(${AUJ_KARTU_KOLOM}, ${AUJ_KARTU_W}mm); grid-auto-rows: ${AUJ_KARTU_H}mm; gap: ${AUJ_KARTU_JARAK_Y}mm ${AUJ_KARTU_JARAK_X}mm; justify-content: center; align-content: start; page-break-after: always; break-after: page; }
  .kp-halaman:last-child { page-break-after: auto; break-after: auto; }
  .kp-kartu { box-sizing: border-box; width: ${AUJ_KARTU_W}mm; height: ${AUJ_KARTU_H}mm; border: 0.3mm dashed #555; padding: 2mm 2.5mm; display: flex; flex-direction: column; overflow: hidden; break-inside: avoid; page-break-inside: avoid; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; text-align: left; }
  .kp-kepala { box-sizing: border-box; display: flex; align-items: center; gap: 2mm; border-bottom: 0.4mm solid #000; padding-bottom: 1mm; height: 9.5mm; flex: none; }
  .kp-logo { width: 7.5mm; height: 7.5mm; object-fit: contain; flex: none; }
  .kp-judul { min-width: 0; flex: 1; }
  .kp-madrasah { font-size: 7.5pt; font-weight: 700; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kp-jenis { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.3pt; line-height: 1.15; }
  .kp-ujian { font-size: 5.8pt; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kp-isi { display: flex; gap: 2mm; flex: 1; padding-top: 1.2mm; min-height: 0; }
  .kp-data { flex: 1; min-width: 0; }
  .kp-data table { border-collapse: collapse; width: 100%; }
  .kp-data td { font-size: 7pt; line-height: 1.15; padding: 0.15mm 0; vertical-align: top; border: none; }
  .kp-data td:first-child { width: 17mm; white-space: nowrap; }
  .kp-data td:nth-child(2) { width: 1.8mm; }
  .kp-no { font-size: 10pt; font-weight: 700; line-height: 1.1; }
  .kp-nama { font-weight: 700; text-transform: uppercase; }
  .kp-nama-panjang { font-size: 6.2pt; line-height: 1.1; }   /* nama > 28 karakter: sedikit lebih kecil supaya tidak makan 4 baris */
  .kp-kanan { width: 26mm; flex: none; display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .kp-foto { width: 16mm; height: 21mm; border: 0.3mm solid #555; font-size: 5.5pt; color: #666; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.2; flex: none; }
  .kp-ttd { font-size: 5.5pt; text-align: center; line-height: 1.15; width: 100%; }
  .kp-ttd-ruang { height: 5mm; }
  .kp-ttd-ruang img { height: 5mm; max-width: 22mm; display: block; margin: 0 auto; }
  .kp-ttd b { text-decoration: underline; }
`;
const AUJ_KARTU_CSS_CETAK = `
  @page { size: 215mm 330mm; margin: 10mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
` + AUJ_KARTU_CSS;

// { siswaKey: 'Baris 2 / Kolom 3' } dari denah tersimpan; siswa tanpa kursi tidak ada di peta.
function aujPetaKursi(rec) {
  const peta = {};
  Object.keys(rec.kursi || {}).forEach(k => {
    const m = /^(\d+)_(\d+)$/.exec(k); if (!m) return;
    peta[rec.kursi[k]] = `Baris ${m[1]} / Kolom ${m[2]}`;
  });
  return peta;
}
function aujKartuHtml(rec, p, kursiTeks) {
  const logo = new URL('logo/logo-lembaga.png', location.href).href;
  const baris = (label, isi, kls) => `<tr><td>${label}</td><td>:</td><td${kls ? ` class="${kls}"` : ''}>${isi}</td></tr>`;
  return `<div class="kp-kartu">
    <div class="kp-kepala">
      <img class="kp-logo" src="${escapeHtml(logo)}" alt="" onerror="this.style.display='none'">
      <div class="kp-judul">
        <div class="kp-madrasah">${escapeHtml(MADRASAH.nama || '')}</div>
        <div class="kp-jenis">KARTU PESERTA ASAS/ASAT</div>
        <div class="kp-ujian">${escapeHtml(rec.nama || '-')} &middot; TA ${escapeHtml(currentTahunAjaran || '')}</div>
      </div>
    </div>
    <div class="kp-isi">
      <div class="kp-data"><table>
        ${baris('No. Peserta', escapeHtml(String(p.no)), 'kp-no')}
        ${baris('Nama', escapeHtml(p.nama), p.nama.length > 28 ? 'kp-nama kp-nama-panjang' : 'kp-nama')}
        ${baris('Kelas / Ruang', escapeHtml(p.kelas || '-') + ' / ' + escapeHtml(rec.ruang || '-'))}
        ${baris('Kursi', escapeHtml(kursiTeks || '-'))}
        ${baris('Waktu', escapeHtml(aujWaktu(rec)))}
      </table></div>
      <div class="kp-kanan">
        <div class="kp-foto">Pas foto</div>
        <div class="kp-ttd">Kepala Madrasah,
          <div class="kp-ttd-ruang">${(MADRASAH.ttdKepalaBase64 && aujBolehTtdKepala()) ? `<img src="${escapeHtml(MADRASAH.ttdKepalaBase64)}" alt="">` : ''}</div>
          <b>${escapeHtml(MADRASAH.kepala_sekolah || '(........................)')}</b></div>
      </div>
    </div>
  </div>`;
}
function aujHtmlKartu(rec) {
  const ps = aujPeserta(rec.kelas, rec), peta = aujPetaKursi(rec);
  const tanpaKursi = ps.filter(p => !peta[p.key]).length;
  const halaman = Math.ceil(ps.length / AUJ_KARTU_PER_HALAMAN);
  const judul = `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">🎫 Kartu Peserta \u2014 ${escapeHtml(rec.kelas || '')} \u00b7 ${escapeHtml(rec.ruang || '')}</h4>
      <button class="btn btn-primary" onclick="aujCetakKartu()" ${ps.length ? '' : 'disabled'}>🖨\uFE0F Cetak Kartu (F4)</button>
    </div>`;
  if (!ps.length) return judul + `<p style="font-size:13px;color:#dc2626;">Belum ada siswa di ${escapeHtml(rec.kelas || 'kelas ini')} pada Data Siswa${aujCanEdit() ? '' : ' (atau bukan kelas yang Anda ampu)'}.</p>`;
  const contoh = ps.slice(0, 2).map(p => aujKartuHtml(rec, p, peta[p.key])).join('');
  return judul + `
    <p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Kertas <strong>F4 (215 \u00d7 330 mm)</strong>, ${AUJ_KARTU_PER_HALAMAN} kartu per halaman (${AUJ_KARTU_KOLOM} kolom \u00d7 ${AUJ_KARTU_BARIS} baris). Ukuran tiap kartu <strong>${AUJ_KARTU_W} \u00d7 ${AUJ_KARTU_H} mm</strong>, pas untuk isi eblek / card case ukuran A1 (kartu 8,5 \u00d7 5,3 cm). Gunting mengikuti garis putus-putus. Nomor peserta sama dengan nomor urut di Daftar Hadir dan Denah. Kursi mengikuti denah yang sudah disimpan. Kartu dicetak terpisah dan tidak ikut "Cetak Semua Berkas" (A4).</p>
    <p style="font-size:13px;font-weight:600;margin-bottom:6px;">Akan tercetak ${ps.length} kartu = ${halaman} halaman F4.</p>
    ${tanpaKursi ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;padding:6px 10px;border-radius:6px;margin-bottom:8px;">\u26A0\uFE0F ${tanpaKursi} dari ${ps.length} peserta belum punya kursi di denah \u2014 kolom Kursi tertulis "-". Atur di tab Denah lalu simpan.</p>` : ''}
    <p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Pratinjau (2 kartu pertama):</p>
    <style>${AUJ_KARTU_CSS}</style>
    <div style="display:flex;flex-wrap:wrap;gap:10px;overflow-x:auto;">${contoh}</div>
    <p style="font-size:11px;color:#6b7280;margin-top:8px;">Di dialog cetak pilih ukuran kertas F4 / Folio (215 \u00d7 330 mm), margin bawaan, dan skala 100%. Kalau printer tidak punya F4, pilih "Simpan sebagai PDF" \u2014 ukuran halamannya otomatis mengikuti F4.</p>`;
}
function aujCetakKartu() {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  const ps = aujPeserta(rec.kelas, rec);
  if (!ps.length) return toast('Belum ada siswa di kelas ini.', true);
  if (aujCanEdit() && JSON.stringify(aujKursi) !== JSON.stringify(rec.kursi || {})) toast('\u26A0\uFE0F Ada perubahan denah yang belum disimpan \u2014 kursi pada kartu mengikuti denah tersimpan.', false, 4500);
  const peta = aujPetaKursi(rec), kartu = ps.map(p => aujKartuHtml(rec, p, peta[p.key]));
  let isi = '';
  for (let i = 0; i < kartu.length; i += AUJ_KARTU_PER_HALAMAN) isi += `<div class="kp-halaman">${kartu.slice(i, i + AUJ_KARTU_PER_HALAMAN).join('')}</div>`;
  aujCetakHtml(isi, `Kartu Peserta ASAS/ASAT - ${rec.kelas || ''} ${rec.ruang || ''}`, AUJ_KARTU_CSS_CETAK);
}

// =====================================================
// CETAK
// =====================================================
const AUJ_CSS = `
  @page { size: A4; margin: 20mm 20mm 25mm 30mm; }   /* PMA 12/2026: atas 2, kanan 2, bawah 2,5, kiri 3 cm */
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #000; margin: 0; }
  .halaman { page-break-after: always; }
  .halaman:last-child { page-break-after: auto; }
  .kop { width: 100%; border-collapse: collapse; }
  .kop td { border: none; padding: 0; vertical-align: middle; }
  .kop-garis { border: 0; border-top: 3px double #000; margin: 6px 0 12px; }
  h1 { font-size: 13pt; text-align: center; margin: 0 0 2px; text-transform: uppercase; }
  h2 { font-size: 11.5pt; margin: 14px 0 6px; text-transform: uppercase; }
  .sub { text-align: center; font-size: 11pt; margin-bottom: 10px; }
  table.data { width: 100%; border-collapse: collapse; margin: 6px 0; }
  table.data th, table.data td { border: 1px solid #000; padding: 4px 6px; font-size: 11pt; }
  table.data th { background: #eee; }
  table.info td { border: none; padding: 1px 4px; font-size: 11.5pt; vertical-align: top; }
  ol.tatib { padding-left: 22px; margin: 4px 0 8px; } ol.tatib li { margin-bottom: 3px; text-align: justify; line-height: 1.35; font-size: 11.5pt; }
  h2 { page-break-after: avoid; }
  .ttd { width: 100%; margin-top: 22px; border-collapse: collapse; page-break-inside: avoid; }
  .ttd td { border: none; text-align: center; vertical-align: top; width: 33%; padding: 0 4px; font-size: 11.5pt; }
  .ttd .ruang { min-height: 64px; }
  .blok { page-break-inside: avoid; }
  .muted { color: #555; font-size: 10pt; }
`;
function aujKopHtml() {
  const logo = new URL('logo/logo-lembaga.png', location.href).href;
  const kontak = [MADRASAH.telp ? 'Telp. ' + MADRASAH.telp : '', MADRASAH.email || '', MADRASAH.website || ''].filter(Boolean).join(' | ');
  return `<table class="kop"><tr>
    <td style="width:78px;"><img src="${escapeHtml(logo)}" width="70" height="70" alt="" onerror="this.style.display='none'"></td>
    <td style="text-align:center;">
      <div style="font-size:15pt;font-weight:700;">${escapeHtml(MADRASAH.nama || '')}</div>
      ${MADRASAH.nsm ? `<div style="font-size:10pt;font-weight:700;">NSM: ${escapeHtml(MADRASAH.nsm)}</div>` : ''}
      <div style="font-size:10pt;">${escapeHtml(MADRASAH.alamat || '')}</div>
      ${kontak ? `<div style="font-size:9.5pt;">${escapeHtml(kontak)}</div>` : ''}
    </td><td style="width:78px;"></td></tr></table><hr class="kop-garis">`;
}
function aujInfoHtml(rec) {
  const baris = [
    ['Asesmen', rec.nama], ['Mata Pelajaran', rec.mapel || '-'], ['Kelas', rec.kelas], ['Ruang', rec.ruang],
    ['Hari / Tanggal', aujTglIndo(rec.tanggal, true)], ['Waktu', aujWaktu(rec)]
  ];
  return `<table class="info">${baris.map(b => `<tr><td style="width:120px;">${b[0]}</td><td style="width:10px;">:</td><td>${escapeHtml(b[1] || '-')}</td></tr>`).join('')}</table>`;
}
// Gambar TTD Kepala hanya ikut tercetak bila yang mencetak Admin/Kepsek (guru yang membuka menu ini tidak mendapatkannya).
function aujBolehTtdKepala() { return !!currentUser && (isAdmin() || isKepsek()); }
function aujTtdKepalaHtml(rec, jenisDokumen) {
  // Tanda tangan QR / gambar lewat js/ttd-digital.js (penanda diganti di aujCetakHtml); tanpa file itu, pakai gambar lama.
  const isiTtd = (window.TTD && TTD.penanda && rec)
    ? TTD.penanda('kepala', { jenis: jenisDokumen || 'Berita Acara ASAS/ASAT', ket: [rec.nama, rec.kelas, rec.ruang, aujTglIndo(rec.tanggal)].filter(Boolean).join(' | ') }, { mm: 17, hanyaPimpinan: true })
    : ((MADRASAH.ttdKepalaBase64 && aujBolehTtdKepala()) ? `<img src="${escapeHtml(MADRASAH.ttdKepalaBase64)}" style="height:58px;max-width:150px;" alt="">` : '');
  return `<td><div>Mengetahui,</div><div>Kepala Madrasah</div>
    <div class="ruang">${isiTtd}</div>
    <div style="font-weight:700;text-decoration:underline;">${escapeHtml(MADRASAH.kepala_sekolah || '(............................)')}</div>
    ${MADRASAH.nip_kepala_sekolah ? `<div>NIP. ${escapeHtml(MADRASAH.nip_kepala_sekolah)}</div>` : ''}</td>`;
}
function aujTtdPengawasHtml(nama, no) {
  return `<td><div>&nbsp;</div><div>Pengawas ${no}</div><div class="ruang"></div>
    <div style="font-weight:700;text-decoration:underline;">${escapeHtml(nama || '(............................)')}</div></td>`;
}

// ---- 1. Daftar Hadir ----
function aujCetakHadirHtml(rec) {
  const ps = aujPeserta(rec.kelas, rec), st = rec.hadirPeserta || {};
  const baris = ps.map(p => {
    const v = st[p.key];
    return `<tr><td style="text-align:center;width:34px;">${p.no}</td><td>${escapeHtml(p.nama)}</td><td style="width:34%;height:26px;"></td><td style="width:16%;text-align:center;">${v ? AUJ_STATUS[v] : ''}</td></tr>`;
  }).join('') || '<tr><td colspan="4" style="text-align:center;">Belum ada data siswa.</td></tr>';
  const pw = [[rec.pengawas1, 'p1'], [rec.pengawas2, 'p2']].filter(x => x[0]);
  if (!pw.length) pw.push(['', 'p1'], ['', 'p2']);
  const bPw = pw.map((x, i) => `<tr><td style="text-align:center;width:34px;">${i + 1}</td><td>${escapeHtml(x[0])}</td><td style="width:34%;height:30px;"></td><td style="width:16%;text-align:center;">${x[0] && (rec.pengawasHadir || {})[x[1]] ? 'Hadir' : ''}</td></tr>`).join('');
  return `<div class="halaman">${aujKopHtml()}
    <h1>Daftar Hadir Peserta dan Pengawas Asesmen Sumatif Akhir Semester (ASAS/ASAT)</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    ${aujInfoHtml(rec)}
    <h2>A. Daftar Hadir Pengawas</h2>
    <table class="data"><thead><tr><th>No</th><th>Nama Pengawas</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead><tbody>${bPw}</tbody></table>
    <h2>B. Daftar Hadir Peserta</h2>
    <table class="data"><thead><tr><th>No</th><th>Nama Peserta</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead><tbody>${baris}</tbody></table>
  </div>`;
}
// ---- 2. Tata Tertib ----
function aujCetakTatibHtml(rec) {
  const daftar = jenis => `<ol class="tatib">${aujBarisTeks(aujTatibTeks(rec, jenis)).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`;
  return `<div class="halaman">${aujKopHtml()}
    <h1>Tata Tertib Peserta dan Pengawas Asesmen Sumatif Akhir Semester (ASAS/ASAT)</h1>
    <div class="sub">${escapeHtml(rec.nama || '')} — Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}</div>
    <div><h2>A. Tata Tertib Peserta ASAS/ASAT</h2>${daftar('peserta')}</div>
    <div><h2>B. Tata Tertib Pengawas ASAS/ASAT</h2>${daftar('pengawas')}</div>
  </div>`;
}
// ---- 3. Denah ----
function aujCetakDenahHtml(rec) {
  return `<div class="halaman">${aujKopHtml()}
    <h1>Denah Lokasi dan Denah Tempat Duduk Ruang Asesmen Sumatif Akhir Semester (ASAS/ASAT)</h1>
    <div class="sub">${escapeHtml(rec.nama || '')} — ${escapeHtml(rec.kelas || '')} — ${escapeHtml(rec.ruang || '')}</div>
    <div class="blok"><h2>A. Denah Lokasi</h2>${aujLokasiHtml(rec).replace(/<p style="font-size:11px;color:#dc2626[^>]*>[^<]*<\/p>/, '')}</div>
    <div class="blok"><h2>B. Denah Tempat Duduk — ${escapeHtml(rec.ruang || '')}</h2>${aujGridHtml(rec, rec.kursi || {}, aujPeserta(rec.kelas, rec), false)}</div>
  </div>`;
}
// ---- 4. Berita Acara ----
function aujCetakBAHtml(rec) {
  const rk = aujRekapHadir(rec), p = aujBagianTgl(rec.tanggal) || { hari: '...', d: '...', bulan: '...', y: '...' };
  const kosong = rk.belum === rk.total && rk.total > 0;
  const orang = n => kosong ? '.......... orang' : `${n} orang`;
  const titik = v => (v == null || v === '') ? '..........' : escapeHtml(String(v));
  const mulai = rec.baMulai || rec.jamMulai, selesai = rec.baSelesai || rec.jamSelesai;
  const tdkHadir = rk.tidakHadir.length
    ? `<table class="data" style="margin-top:4px;"><thead><tr><th style="width:34px;">No</th><th>Nama Peserta</th><th style="width:20%;">Keterangan</th></tr></thead><tbody>${rk.tidakHadir.map((x, i) => `<tr><td style="text-align:center;">${i + 1}</td><td>${escapeHtml(x.nama)}</td><td style="text-align:center;">${x.ket}</td></tr>`).join('')}</tbody></table>`
    : `<span>${kosong ? '' : '– (nihil)'}</span>`;
  const tempat = aujTempat();
  return `<div class="halaman">${aujKopHtml()}
    <h1>Berita Acara Pelaksanaan Asesmen Sumatif Akhir Semester (ASAS/ASAT)</h1>
    <div class="sub">${escapeHtml(rec.nama || '')}<br>Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    <p style="text-align:justify;line-height:1.5;">Pada hari ini <strong>${escapeHtml(p.hari)}</strong> tanggal <strong>${escapeHtml(String(p.d))}</strong> bulan <strong>${escapeHtml(p.bulan)}</strong> tahun <strong>${escapeHtml(String(p.y))}</strong>, telah dilaksanakan <strong>${escapeHtml(rec.nama || '')}</strong>${rec.mapel ? ' mata pelajaran <strong>' + escapeHtml(rec.mapel) + '</strong>' : ''} untuk <strong>${escapeHtml(rec.kelas || '')}</strong> di ${escapeHtml(MADRASAH.nama || 'madrasah')}, ruang <strong>${escapeHtml(rec.ruang || '')}</strong>, mulai pukul <strong>${escapeHtml(mulai || '.....')}</strong> sampai dengan pukul <strong>${escapeHtml(selesai || '.....')}</strong> WIB, dengan keterangan sebagai berikut:</p>
    <table class="info" style="margin-left:6px;">
      <tr><td style="width:24px;">1.</td><td style="width:250px;">Jumlah peserta seharusnya</td><td>: ${orang(rk.total)}</td></tr>
      <tr><td>2.</td><td>Jumlah peserta hadir</td><td>: ${orang(rk.h)}</td></tr>
      <tr><td>3.</td><td>Jumlah peserta tidak hadir</td><td>: ${kosong ? '.......... orang' : `${rk.s + rk.i + rk.a} orang (sakit ${rk.s}, izin ${rk.i}, alpa ${rk.a})`}</td></tr>
      <tr><td>4.</td><td>Jumlah naskah soal yang diterima</td><td>: ${titik(rec.baNaskah)} eksemplar</td></tr>
      <tr><td>5.</td><td>Jumlah lembar jawaban dikumpulkan</td><td>: ${titik(rec.baLjk)} lembar</td></tr>
    </table>
    <div class="blok" style="margin-top:8px;padding-left:6px;"><div style="margin-bottom:2px;">Peserta yang tidak hadir:</div>${tdkHadir}</div>
    <div class="blok" style="margin-top:10px;padding-left:6px;"><div>Catatan selama pelaksanaan ASAS/ASAT:</div>
      <div style="border:1px solid #000;min-height:80px;padding:6px 8px;margin-top:3px;white-space:pre-wrap;font-size:11.5pt;">${escapeHtml(rec.baCatatan || '')}</div></div>
    <p style="margin-top:12px;">Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
    <div style="text-align:right;margin-top:6px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(rec.tanggal))}</div>
    <table class="ttd"><tr>${aujTtdPengawasHtml(rec.pengawas1, 1)}${aujTtdPengawasHtml(rec.pengawas2, 2)}${aujTtdKepalaHtml(rec)}</tr></table>
  </div>`;
}

const AUJ_CETAK = { hadir: aujCetakHadirHtml, tatib: aujCetakTatibHtml, denah: aujCetakDenahHtml, ba: aujCetakBAHtml };
const AUJ_JUDUL = { hadir: 'Daftar Hadir ASAS/ASAT', tatib: 'Tata Tertib ASAS/ASAT', denah: 'Denah Ruang ASAS/ASAT', ba: 'Berita Acara ASAS/ASAT' };
// Cetak selalu memakai data TERSIMPAN. Fungsi ini mendeteksi isian/draft di layar yang belum disimpan.
function aujDraftBeda(jenis, rec) {
  const j = JSON.stringify, v = x => (x == null ? '' : String(x)).trim();
  if (jenis === 'hadir') {
    const pw = o => Object.keys(o || {}).filter(k => o[k]).sort().join(',');
    return j(aujHadir) !== j(rec.hadirPeserta || {}) || pw(aujHadirPengawas) !== pw(rec.pengawasHadir);
  }
  if (jenis === 'denah') return j(aujKursi) !== j(rec.kursi || {});
  if (jenis === 'ba' && aujEl('aujBaCatatan')) {
    return aujVal('aujBaMulai') !== v(rec.baMulai || rec.jamMulai) || aujVal('aujBaSelesai') !== v(rec.baSelesai || rec.jamSelesai)
      || aujVal('aujBaNaskah') !== v(rec.baNaskah) || aujVal('aujBaLjk') !== v(rec.baLjk) || aujVal('aujBaCatatan') !== v(rec.baCatatan);
  }
  if (jenis === 'tatib' && aujEl('aujTatib_peserta') && aujEl('aujTatib_pengawas')) {
    const t = x => aujBarisTeks(x).join('\n');
    return t(aujEl('aujTatib_peserta').value) !== t(aujTatibTeks(rec, 'peserta')) || t(aujEl('aujTatib_pengawas').value) !== t(aujTatibTeks(rec, 'pengawas'));
  }
  return false;
}
function aujPeringatDraft(daftar, rec) {
  if (!aujCanEdit()) return;
  const nama = { hadir: 'daftar hadir', tatib: 'tata tertib', denah: 'denah', ba: 'berita acara' };
  const beda = daftar.filter(j => aujDraftBeda(j, rec)).map(j => nama[j]);
  if (beda.length) toast('ℹ️ Ada perubahan yang belum disimpan (' + beda.join(', ') + ') — yang dicetak adalah data tersimpan.', false, 5000);
}
// Berita Acara: kalau sebagian peserta belum diberi status, angka hadir + tidak hadir tidak sama dengan jumlah seharusnya.
function aujKonfirmasiBA(rec) {
  const rk = aujRekapHadir(rec);
  if (rk.total > 0 && rk.belum > 0 && rk.belum < rk.total) {
    return confirm(rk.belum + ' dari ' + rk.total + ' peserta belum diisi statusnya di Daftar Hadir.\n\nAngka hadir dan tidak hadir di Berita Acara tidak akan menjumlah ke total peserta. Tetap cetak?');
  }
  return true;
}
function aujCetakSatu(jenis) {
  const rec = aujRec(); if (!rec || !AUJ_CETAK[jenis]) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  if (jenis === 'ba' && !aujKonfirmasiBA(rec)) return;
  aujPeringatDraft([jenis], rec);
  aujCetakHtml(AUJ_CETAK[jenis](rec), `${AUJ_JUDUL[jenis]} - ${rec.kelas || ''} ${rec.ruang || ''}`);
}
function aujCetakSemua() {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  if (!aujKonfirmasiBA(rec)) return;
  aujPeringatDraft(['hadir', 'tatib', 'denah', 'ba'], rec);
  aujCetakHtml(['hadir', 'tatib', 'denah', 'ba'].map(j => AUJ_CETAK[j](rec)).join(''), `Berkas Administrasi ASAS/ASAT - ${rec.kelas || ''} ${rec.ruang || ''}`);
}
function aujCetakHtml(bodyHtml, judul, cssKhusus) {
  const w = window.open('', '_blank', 'width=900,height=700');   // dibuka dulu (sinkron) agar tidak diblokir popup
  if (!w) return toast('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.', true);
  const tulis = (html) => {
    w.document.open();
    w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(judul)}</title><style>${cssKhusus || AUJ_CSS}</style></head><body>${html}</body></html>`);
    w.document.close();
    let sudah = false;
    const cetak = () => { if (sudah) return; sudah = true; try { w.focus(); w.print(); } catch (e) { /* jendela ditutup */ } };
    w.addEventListener('load', cetak);
    setTimeout(cetak, 3000);   // cadangan kalau event load tidak terpicu
  };
  if (window.TTD && TTD.isiHtml && /\[\[TTD:/.test(bodyHtml)) {
    w.document.write('<!doctype html><meta charset="utf-8"><title>Menyiapkan…</title><p style="font-family:Arial,sans-serif;padding:24px;">Menyiapkan dokumen…</p>');
    TTD.isiHtml(bodyHtml).catch(() => bodyHtml.replace(/\[\[TTD:[^\]]*\]\]/g, '')).then(tulis);
  } else tulis(bodyHtml);
}

// =====================================================
// JADWAL UJIAN -- daftar jadwal, jadwal massal, duplikat sesi, pengawas bentrok, cetak
// =====================================================
// Tidak ada node Firebase baru: "jadwal" hanyalah semua record administrasi_ujian (tanggal + jam + mapel + kelas + ruang
// + pengawas) yang diurutkan. Jadi Jadwal Massal membuat record yang sama persis dengan tombol "Sesi Baru".

// ---------- Pengawas bentrok ----------
function aujNormNama(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
// Pengawas dicocokkan ke Data Guru lewat nama (huruf besar/kecil & spasi ganda diabaikan). Yang disimpan di sesi: nama + KUNCI guru
// (pengawas1Key / pengawas2Key). Kunci inilah yang dipakai Rules untuk membatasi check-in honor dan untuk cek bentrok.
function aujGuruDari(nama) { const n = aujNormNama(nama); if (!n) return null; return (allGuru || []).find(g => aujNormNama(g.name) === n) || null; }
function aujKunciGuru(nama) { const g = aujGuruDari(nama); return g ? g.key : null; }
// Id pembanding pengawas: kunci guru bila ada, kalau tidak (data lama / nama tak dikenal) pakai nama.
function aujIdPengawas(nama) { const g = aujKunciGuru(nama); return g || (aujNormNama(nama) ? 'n:' + aujNormNama(nama) : ''); }
function aujMenit(t) { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
// Dua sesi bertumpuk jam-nya? Jam selesai = jam mulai sesi lain TIDAK dihitung bentrok. Sesi tanpa jam lengkap tidak bisa dinilai -> false.
function aujTumpang(a, b) {
  const a1 = aujMenit(a.jamMulai), a2 = aujMenit(a.jamSelesai), b1 = aujMenit(b.jamMulai), b2 = aujMenit(b.jamSelesai);
  if (a1 == null || a2 == null || b1 == null || b2 == null) return false;
  return a1 < b2 && b1 < a2;
}
function aujPengawasDari(rec) {
  const out = [];
  [rec.pengawas1, rec.pengawas2].forEach(n => { const k = aujIdPengawas(n); if (k && !out.some(o => o.k === k)) out.push({ k, nama: String(n).trim() }); });
  return out;
}
// Hasil: perKey = { keySesi: [{ nama, lawan }] }, pasangan = [{ nama, a, b }] (tiap bentrok tercatat satu kali).
// Pengawas dicocokkan lewat nama (huruf besar/kecil & spasi ganda diabaikan), karena yang tersimpan di sesi adalah nama.
function aujCariBentrok(daftar) {
  const perKey = {}, pasangan = [], perTgl = {};
  const tambah = (key, nama, lawan) => { (perKey[key] = perKey[key] || []).push({ nama, lawan }); };
  (daftar || []).forEach(r => { if (r && r.tanggal) (perTgl[r.tanggal] = perTgl[r.tanggal] || []).push(r); });
  Object.keys(perTgl).sort().forEach(t => {
    const g = perTgl[t];
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      if (!aujTumpang(g[i], g[j])) continue;
      const pj = aujPengawasDari(g[j]);
      aujPengawasDari(g[i]).forEach(x => {
        if (!pj.some(y => y.k === x.k)) return;
        tambah(g[i].key, x.nama, g[j]); tambah(g[j].key, x.nama, g[i]);
        pasangan.push({ nama: x.nama, a: g[i], b: g[j] });
      });
    }
  });
  return { perKey, pasangan };
}
function aujLabelSesi(r) {
  const w = r.jamMulai && r.jamSelesai ? ` (${r.jamMulai}–${r.jamSelesai})` : '';
  return `${r.mapel || r.nama || '-'} · ${r.kelas || '-'} · ${r.ruang || '-'}${w}`;
}
// Pesan bentrok untuk satu sesi yang sedang diisi/disimpan (dibandingkan dengan semua sesi tersimpan lainnya).
function aujPesanBentrokSesi(cand) {
  const lain = allAdmUjian.filter(x => x.key !== (aujBaru ? null : aujAktifKey));
  const c = { key: '__form__', tanggal: cand.tanggal, jamMulai: cand.jamMulai, jamSelesai: cand.jamSelesai, pengawas1: cand.pengawas1, pengawas2: cand.pengawas2 };
  const msgs = [];
  const n1 = aujIdPengawas(c.pengawas1), n2 = aujIdPengawas(c.pengawas2);
  if (n1 && n1 === n2) msgs.push('Pengawas 1 dan Pengawas 2 adalah orang yang sama.');
  (aujCariBentrok(lain.concat([c])).perKey.__form__ || []).forEach(h => msgs.push(`${h.nama} juga mengawas ${aujLabelSesi(h.lawan)} pada ${aujTglIndo(h.lawan.tanggal, true)}.`));
  return msgs;
}
function aujCekBentrokForm() {
  const box = aujEl('aujWarnBentrok'); if (!box) return;
  const c = { tanggal: aujVal('aujTanggal'), jamMulai: aujVal('aujJamMulai'), jamSelesai: aujVal('aujJamSelesai'), pengawas1: aujVal('aujPengawas1'), pengawas2: aujVal('aujPengawas2') };
  const msgs = aujPesanBentrokSesi(c);
  if (msgs.length) {
    box.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;">
      <strong>⚠️ Pengawas bentrok</strong><ul style="margin:4px 0 0 18px;">${msgs.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
      <div style="font-size:12px;margin-top:4px;color:#7f1d1d;">Sesi tetap bisa disimpan; Anda akan diminta konfirmasi.</div></div>`;
  } else if ((c.pengawas1 || c.pengawas2) && !(aujMenit(c.jamMulai) != null && aujMenit(c.jamSelesai) != null)) {
    box.innerHTML = '<div style="font-size:12px;color:#6b7280;">Isi jam mulai &amp; jam selesai agar bentrok pengawas bisa diperiksa.</div>';
  } else box.innerHTML = '';
}

// ---------- Duplikat sesi ----------
// Membuka form "sesi baru" yang sudah terisi dari sesi asal; belum menyimpan apa pun. Pengawas dikosongkan karena
// pengawas yang sama pada jam yang sama pasti bentrok. Daftar hadir, denah, dan berita acara tidak ikut disalin.
function aujDuplikat(key) {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa menduplikat sesi!', true);
  const rec = key ? allAdmUjian.find(x => x.key === key) : aujRec();
  if (!rec) return toast('Pilih sesi yang akan diduplikat dulu.', true);
  const lama = aujRec();
  if (lama && ['hadir', 'denah'].some(j => aujDraftBeda(j, lama)) && !confirm('Ada perubahan yang belum disimpan pada sesi yang sedang dibuka. Lanjut menduplikat dan buang perubahan itu?')) return;
  aujSalinan = {
    nama: rec.nama, mapel: rec.mapel, kelas: rec.kelas, ruang: rec.ruang, tanggal: rec.tanggal,
    jamMulai: rec.jamMulai, jamSelesai: rec.jamSelesai,
    _dari: `${aujTglIndo(rec.tanggal)} — ${aujLabelSesi(rec)}`
  };
  aujBaru = true; aujAktifKey = null; aujTabAktif = 'sesi'; aujKursi = {}; aujHadir = {}; aujHadirPengawas = {}; aujSel = null;
  aujRenderSemua();
  toast('📑 Sesi disalin. Ubah data yang berbeda lalu klik Simpan Sesi.', false, 4000);
}
// Dari baris tabel jadwal: buka sesi di tab Data Sesi.
function aujBukaSesi(key) {
  const lama = aujRec();
  if (lama && lama.key !== key && aujCanEdit() && ['hadir', 'denah'].some(j => aujDraftBeda(j, lama)) && !confirm('Ada perubahan yang belum disimpan pada sesi sebelumnya. Pindah sesi dan buang perubahan itu?')) return;
  aujAktifKey = key; aujBaru = false; aujSalinan = null; aujTabAktif = 'sesi'; aujMuatDraft(); aujRenderSemua();
}

// ---------- Tab Jadwal Ujian ----------
function aujTglPendek(tgl) {
  const p = aujBagianTgl(tgl); if (!p) return tgl || '-';
  return `${p.hari.slice(0, 3)}, ${p.d} ${p.bulan.slice(0, 3)} ${p.y}`;
}
function aujUrutJadwal(daftar) {
  return [...daftar].sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a.jamMulai || '').localeCompare(b.jamMulai || '')
    || (a.kelas || '').localeCompare(b.kelas || '', 'id') || (a.ruang || '').localeCompare(b.ruang || '', 'id'));
}
function aujJadwalTersaring() {
  return aujUrutJadwal(allAdmUjian.filter(x => (!aujJdwNama || x.nama === aujJdwNama) && (!aujJdwKelas || x.kelas === aujJdwKelas)));
}
function aujHtmlJadwal() {
  const ed = aujCanEdit();
  const uniq = f => [...new Set(allAdmUjian.map(x => x[f]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
  const opt = (arr, sel, semua) => `<option value="">${semua}</option>` + arr.map(v => `<option value="${escapeHtml(v)}" ${v === sel ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">📅 Jadwal Ujian — TA ${escapeHtml(currentTahunAjaran || '')}</h4>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${ed ? '<button class="btn btn-success" onclick="aujToggleMassal()">🗓️ Jadwal Massal</button>' : ''}
        ${ed ? '<button class="btn btn-soft" onclick="aujTampilPeriksa()" title="Cocokkan jadwal, Daftar Hadir, check-in, dan susulan">🔎 Periksa Honor</button>' : ''}
        ${ed ? '<button class="btn btn-primary" onclick="aujBuatSesiHonor()" title="Buat sesi honor pengawas dari jadwal (mengikuti filter di bawah)">💰 Buat Sesi Honor</button>' : ''}
        <button class="btn btn-primary" onclick="aujCetakJadwal()" ${allAdmUjian.length ? '' : 'disabled'}>🖨️ Cetak Jadwal</button>
      </div>
    </div>
    <div id="aujPeriksaIsi"></div>
    <div id="aujJdwMassal">${ed && aujMassalBuka ? aujHtmlMassal() : ''}</div>
    <div class="grid-2" style="margin-bottom:10px;">
      <div><label class="label">Asesmen</label><select id="aujJdwFNama" class="field" onchange="aujJdwFilter()">${opt(uniq('nama'), aujJdwNama, 'Semua asesmen')}</select></div>
      <div><label class="label">Kelas</label><select id="aujJdwFKelas" class="field" onchange="aujJdwFilter()">${opt(uniq('kelas'), aujJdwKelas, 'Semua kelas')}</select></div>
    </div>
    <div id="aujJdwIsi">${aujHtmlJadwalIsi()}</div>`;
}
function aujJdwFilter() {
  aujJdwNama = aujEl('aujJdwFNama') ? aujEl('aujJdwFNama').value : '';
  aujJdwKelas = aujEl('aujJdwFKelas') ? aujEl('aujJdwFKelas').value : '';
  const isi = aujEl('aujJdwIsi'); if (isi) isi.innerHTML = aujHtmlJadwalIsi();
}
function aujHtmlJadwalIsi() {
  if (!allAdmUjian.length) return `<p style="color:#6b7280;font-size:13px;">Belum ada jadwal.${aujCanEdit() ? ' Klik <strong>🗓️ Jadwal Massal</strong> untuk membuat banyak sesi sekaligus, atau <strong>➕ Sesi Baru</strong> untuk satu sesi.' : ' Admin perlu membuatnya dulu.'}</p>`;
  const daftar = aujJadwalTersaring(), ed = aujCanEdit();
  const bt = aujCariBentrok(allAdmUjian);
  const urut = bt.pasangan.slice().sort((x, y) => (x.a.tanggal || '').localeCompare(y.a.tanggal || '') || (x.a.jamMulai || '').localeCompare(y.a.jamMulai || ''));
  const banner = urut.length ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px;">
      <strong>⚠️ ${urut.length} pengawas bentrok</strong> (mengawas dua sesi yang jamnya bertumpuk):
      <ul style="margin:4px 0 0 18px;">${urut.slice(0, 8).map(p => `<li><strong>${escapeHtml(p.nama)}</strong> — ${escapeHtml(aujTglIndo(p.a.tanggal, true))}: ${escapeHtml(aujLabelSesi(p.a))} ⇄ ${escapeHtml(aujLabelSesi(p.b))}</li>`).join('')}${urut.length > 8 ? `<li>…dan ${urut.length - 8} lainnya</li>` : ''}</ul></div>` : '';
  if (!daftar.length) return banner + '<p style="color:#6b7280;font-size:13px;">Tidak ada sesi untuk filter ini.</p>';
  const th = 'padding:6px 8px;border-bottom:2px solid #cbd5e1;text-align:left;white-space:nowrap;';
  let tglLalu = null;
  const baris = daftar.map(r => {
    const baru = r.tanggal !== tglLalu; tglLalu = r.tanggal;
    const bn = (bt.perKey[r.key] || []).map(h => aujIdPengawas(h.nama));
    const pw = [r.pengawas1, r.pengawas2].filter(Boolean).map(n => bn.includes(aujIdPengawas(n)) ? `<span style="color:#b91c1c;font-weight:600;" title="Bentrok dengan sesi lain pada jam yang sama">⚠️ ${escapeHtml(n)}</span>` : escapeHtml(n)).join('<br>') || '<span style="color:#9ca3af;">—</span>';
    const td = 'padding:6px 8px;vertical-align:top;' + (baru ? 'border-top:1px solid #cbd5e1;' : 'border-top:1px solid #f1f5f9;');
    return `<tr style="${bn.length ? 'background:#fef2f2;' : ''}">
      <td style="${td}white-space:nowrap;font-weight:600;">${baru ? escapeHtml(aujTglPendek(r.tanggal)) : ''}</td>
      <td style="${td}white-space:nowrap;">${r.jamMulai && r.jamSelesai ? escapeHtml(r.jamMulai) + '–' + escapeHtml(r.jamSelesai) : '—'}</td>
      <td style="${td}">${escapeHtml(r.mapel || r.nama || '-')}${r.mapel ? `<div style="font-size:11px;color:#6b7280;">${escapeHtml(r.nama || '')}</div>` : ''}</td>
      <td style="${td}white-space:nowrap;">${escapeHtml(r.kelas || '-')}</td>
      <td style="${td}white-space:nowrap;">${escapeHtml(r.ruang || '-')}</td>
      <td style="${td}">${pw}${aujSesiHonorDari(r.key) ? '<div style="font-size:11px;color:#065f46;">💰 sesi honor dibuat</div>' : ''}</td>
      <td style="${td}white-space:nowrap;"><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="aujBukaSesi('${escapeJs(r.key)}')">${ed ? '✏️ Buka' : '👁️ Lihat'}</button>${ed ? ` <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="aujDuplikat('${escapeJs(r.key)}')" title="Duplikat sesi">📑</button>` : ''}</td>
    </tr>`;
  }).join('');
  return banner + `<p style="font-size:12px;color:#6b7280;margin-bottom:6px;">${daftar.length} sesi${daftar.length !== allAdmUjian.length ? ` (dari ${allAdmUjian.length})` : ''}. Cetak Jadwal mengikuti filter di atas.</p>
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f1f5f9;"><th style="${th}">Tanggal</th><th style="${th}">Waktu</th><th style="${th}">Mata Pelajaran</th><th style="${th}">Kelas</th><th style="${th}">Ruang</th><th style="${th}">Pengawas</th><th style="${th}"></th></tr></thead>
      <tbody>${baris}</tbody></table></div>`;
}

// ---------- Jadwal massal ----------
const AUJ_MASSAL_MAKS_HARI = 90;
const AUJ_HARI_URUT = [1, 2, 3, 4, 5, 6, 0];   // Senin..Minggu (angka = Date.getDay())
function aujFmtTgl(dt) { const p = n => String(n).padStart(2, '0'); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`; }

// Murni (tidak menyentuh layar/database) supaya mudah diuji. p = { nama, kelas, ruang, tglMulai, tglSelesai, hari:[0-6],
// libur:'teks berisi YYYY-MM-DD', slot1:{m,s}, slot2:{m,s}, mapelTeks, p1, p2 }.
// Mapel diisi berurutan: slot 1 hari ke-1, slot 2 hari ke-1, slot 1 hari ke-2, dst.
function aujHitungMassal(p) {
  const err = m => ({ error: m });
  if (!p.nama || p.nama.length < 3) return err('Nama asesmen wajib diisi (minimal 3 karakter).');
  if (p.nama.length > 100) return err('Nama asesmen maksimal 100 karakter.');
  if (!p.kelas) return err('Pilih kelas.');
  if (!p.ruang) return err('Isi nama ruang.');
  if (p.ruang.length > 40) return err('Nama ruang maksimal 40 karakter.');
  if (!aujAdaTanggal(p.tglMulai) || !aujAdaTanggal(p.tglSelesai)) return err('Isi rentang tanggal dengan benar.');
  if (p.tglMulai > p.tglSelesai) return err('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  const s1 = p.slot1 || {}, s2 = p.slot2 || {};
  if (aujMenit(s1.m) == null || aujMenit(s1.s) == null) return err('Slot jam 1 wajib diisi (mulai dan selesai).');
  if (s1.m >= s1.s) return err('Slot 1: jam selesai harus setelah jam mulai.');
  const slots = [{ m: s1.m, s: s1.s }];
  if (s2.m || s2.s) {
    if (aujMenit(s2.m) == null || aujMenit(s2.s) == null) return err('Slot jam 2: isi mulai dan selesai, atau kosongkan keduanya.');
    if (s2.m >= s2.s) return err('Slot 2: jam selesai harus setelah jam mulai.');
    if (s2.m < s1.s) return err('Slot 2 harus dimulai setelah slot 1 selesai.');
    slots.push({ m: s2.m, s: s2.s });
  }
  if (!p.hari || !p.hari.length) return err('Pilih minimal satu hari ujian.');
  const mapel = aujBarisTeks(p.mapelTeks);
  if (!mapel.length) return err('Isi daftar mata pelajaran (satu per baris).');
  if (mapel.some(m => m.length > 80)) return err('Nama mata pelajaran maksimal 80 karakter.');
  if ((p.p1 || '').length > 80 || (p.p2 || '').length > 80) return err('Nama pengawas maksimal 80 karakter.');
  const gm1 = p.p1 ? aujGuruDari(p.p1) : null, gm2 = p.p2 ? aujGuruDari(p.p2) : null;
  if (p.p1 && !gm1) return err(`Pengawas 1 "${p.p1}" tidak cocok dengan Data Guru. Pilih dari daftar.`);
  if (p.p2 && !gm2) return err(`Pengawas 2 "${p.p2}" tidak cocok dengan Data Guru. Pilih dari daftar.`);
  const libur = new Set(String(p.libur || '').match(/\d{4}-\d{2}-\d{2}/g) || []);
  const aw = aujBagianTgl(p.tglMulai), tanggal = [];
  for (let i = 0; ; i++) {
    if (i > AUJ_MASSAL_MAKS_HARI) return err(`Rentang tanggal terlalu panjang (maksimal ${AUJ_MASSAL_MAKS_HARI} hari).`);
    const dt = new Date(aw.y, aw.mo - 1, aw.d + i, 12), s = aujFmtTgl(dt);
    if (s > p.tglSelesai) break;
    if (p.hari.indexOf(dt.getDay()) >= 0 && !libur.has(s)) tanggal.push(s);
  }
  if (!tanggal.length) return err('Tidak ada hari ujian pada rentang tanggal itu (periksa hari yang dipilih dan tanggal libur).');
  const kapasitas = tanggal.length * slots.length;
  if (mapel.length > kapasitas) return err(`Ada ${mapel.length} mata pelajaran, tetapi rentang ini hanya memuat ${kapasitas} slot (${tanggal.length} hari × ${slots.length} slot). Perpanjang rentang tanggal, tambahkan slot 2, atau kurangi mapel.`);
  const baris = mapel.map((m, i) => ({
    nama: p.nama, kelas: p.kelas, ruang: p.ruang, mapel: m,
    tanggal: tanggal[Math.floor(i / slots.length)], jamMulai: slots[i % slots.length].m, jamSelesai: slots[i % slots.length].s,
    pengawas1: gm1 ? gm1.name : null, pengawas1Key: gm1 ? gm1.key : null, pengawas2: gm2 ? gm2.name : null, pengawas2Key: gm2 ? gm2.key : null
  }));
  return { baris, kapasitas, hariTerpakai: Math.ceil(mapel.length / slots.length), slotKosong: kapasitas - mapel.length };
}
function aujMassalAmbil() {
  const cek = [...document.querySelectorAll('.aujMsHari')];
  return {
    nama: aujVal('aujMsNama'), kelas: aujVal('aujMsKelas'), ruang: aujVal('aujMsRuang'),
    tglMulai: aujVal('aujMsTglMulai'), tglSelesai: aujVal('aujMsTglSelesai'),
    hari: cek.filter(c => c.checked).map(c => +c.value), libur: aujVal('aujMsLibur'),
    slot1: { m: aujVal('aujMsJam1M'), s: aujVal('aujMsJam1S') }, slot2: { m: aujVal('aujMsJam2M'), s: aujVal('aujMsJam2S') },
    mapelTeks: aujVal('aujMsMapel'), p1: aujVal('aujMsPengawas1'), p2: aujVal('aujMsPengawas2')
  };
}
// Setiap isian berubah: simpan draft (supaya tidak hilang kalau layar digambar ulang) dan buang pratinjau lama.
function aujMassalSimpanDraft() {
  aujMassalDraft = aujMassalAmbil();
  if (aujMassalHasil) { aujMassalHasil = null; const pv = aujEl('aujMassalPrev'); if (pv) pv.innerHTML = '<p style="font-size:12px;color:#6b7280;">Isian berubah — klik Pratinjau lagi sebelum menyimpan.</p>'; }
}
function aujToggleMassal() {
  if (!aujCanEdit()) return;
  aujMassalBuka = !aujMassalBuka;
  const el = aujEl('aujJdwMassal'); if (el) el.innerHTML = aujMassalBuka ? aujHtmlMassal() : '';
}
function aujHtmlMassal() {
  const d = aujMassalDraft || {}, val = (k, def) => escapeHtml(d[k] != null ? d[k] : (def == null ? '' : def));
  const s1 = d.slot1 || { m: '07:30', s: '09:30' }, s2 = d.slot2 || { m: '10:00', s: '12:00' };
  const hariDipilih = d.hari || [1, 2, 3, 4, 5];
  const kelasOpt = KELAS_LIST.map(k => `<option value="${escapeHtml(k)}" ${d.kelas === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
  const guruOpt = (allGuru || []).map(g => `<option value="${escapeHtml(g.name || '')}"></option>`).join('');
  const f = (id, label, v, type, extra) => `<div><label class="label">${label}</label><input id="${id}" class="field" type="${type || 'text'}" value="${v}" ${extra || ''}></div>`;
  return `<div id="aujMassalForm" oninput="aujMassalSimpanDraft()" onchange="aujMassalSimpanDraft()" style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:12px;">
    <datalist id="aujGuruListMs">${guruOpt}</datalist>
    <h5 style="font-weight:700;font-size:14px;margin-bottom:4px;">🗓️ Jadwal Massal</h5>
    <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">Untuk <strong>satu kelas di satu ruang</strong>. Mata pelajaran diisi berurutan: slot 1 hari pertama, slot 2 hari pertama, slot 1 hari kedua, dan seterusnya. Ulangi untuk kelas lain. Belum ada yang tersimpan sebelum Anda klik Simpan di pratinjau.</p>
    <div class="grid-3" style="margin-bottom:10px;">
      ${f('aujMsNama', 'Nama Asesmen *', val('nama'), 'text', 'maxlength="100" placeholder="Contoh: ASAS Ganjil"')}
      <div><label class="label">Kelas (peserta) *</label><select id="aujMsKelas" class="field"><option value="">-- Pilih Kelas --</option>${kelasOpt}</select></div>
      ${f('aujMsRuang', 'Ruang *', val('ruang'), 'text', 'maxlength="40" placeholder="Contoh: Ruang 1"')}
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      ${f('aujMsTglMulai', 'Tanggal Mulai *', val('tglMulai'), 'date')}
      ${f('aujMsTglSelesai', 'Tanggal Selesai *', val('tglSelesai'), 'date')}
    </div>
    <div style="margin-bottom:10px;"><label class="label">Hari ujian</label>
      <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;">${AUJ_HARI_URUT.map(h => `<label style="display:flex;align-items:center;gap:4px;"><input type="checkbox" class="aujMsHari" value="${h}" ${hariDipilih.indexOf(h) >= 0 ? 'checked' : ''}> ${AUJ_HARI[h]}</label>`).join('')}</div></div>
    <div style="margin-bottom:10px;"><label class="label">Tanggal libur / dilewati (opsional)</label>
      <input id="aujMsLibur" class="field" type="text" value="${val('libur')}" placeholder="Format 2026-12-25, pisahkan dengan koma"></div>
    <div class="grid-2" style="margin-bottom:10px;">
      <div><label class="label">Slot 1 *</label><div style="display:flex;gap:6px;align-items:center;"><input id="aujMsJam1M" class="field" type="time" value="${escapeHtml(s1.m || '')}"> <span>–</span> <input id="aujMsJam1S" class="field" type="time" value="${escapeHtml(s1.s || '')}"></div></div>
      <div><label class="label">Slot 2 (kosongkan kalau hanya satu slot per hari)</label><div style="display:flex;gap:6px;align-items:center;"><input id="aujMsJam2M" class="field" type="time" value="${escapeHtml(s2.m || '')}"> <span>–</span> <input id="aujMsJam2S" class="field" type="time" value="${escapeHtml(s2.s || '')}"></div></div>
    </div>
    <div style="margin-bottom:10px;"><label class="label">Daftar mata pelajaran * (satu per baris, urut sesuai jadwal)</label>
      <textarea id="aujMsMapel" class="field" rows="6" placeholder="Matematika&#10;Bahasa Indonesia&#10;Fikih">${val('mapelTeks')}</textarea></div>
    <div class="grid-2" style="margin-bottom:12px;">
      ${f('aujMsPengawas1', 'Pengawas 1 (opsional, berlaku untuk semua sesi)', val('p1'), 'text', 'list="aujGuruListMs" maxlength="80" placeholder="Boleh dikosongkan, isi per sesi nanti"')}
      ${f('aujMsPengawas2', 'Pengawas 2 (opsional)', val('p2'), 'text', 'list="aujGuruListMs" maxlength="80"')}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="aujPratinjauMassal()">👁️ Pratinjau</button><button class="btn btn-soft" onclick="aujToggleMassal()">✖ Tutup</button></div>
    <div id="aujMassalPrev" style="margin-top:12px;">${aujMassalHasil ? aujHtmlPratinjauMassal() : ''}</div>
  </div>`;
}
function aujPratinjauMassal() {
  if (!aujCanEdit()) return;
  aujMassalDraft = aujMassalAmbil(); aujMassalHasil = null;
  const pv = aujEl('aujMassalPrev'); if (!pv) return;
  const h = aujHitungMassal(aujMassalDraft);
  if (h.error) { pv.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;">${escapeHtml(h.error)}</div>`; return; }
  const ada = b => allAdmUjian.some(x => x.nama === b.nama && x.kelas === b.kelas && x.ruang === b.ruang && x.tanggal === b.tanggal && x.jamMulai === b.jamMulai);
  h.baris.forEach(b => { b.sudahAda = ada(b); });
  // Bentrok dihitung hanya untuk sesi yang benar-benar akan dibuat (yang sudah ada tidak dihitung dua kali).
  const baru = h.baris.filter(b => !b.sudahAda);
  baru.forEach((b, i) => { b.key = '__baru' + i; });
  const bt = aujCariBentrok(allAdmUjian.concat(baru));
  baru.forEach(b => { b.bentrok = bt.perKey[b.key] || []; });
  h.nBentrok = bt.pasangan.filter(p => String(p.a.key).indexOf('__baru') === 0 || String(p.b.key).indexOf('__baru') === 0).length;
  h.p = aujMassalDraft; aujMassalHasil = h;
  pv.innerHTML = aujHtmlPratinjauMassal();
}
function aujHtmlPratinjauMassal() {
  const h = aujMassalHasil; if (!h) return '';
  const baru = h.baris.filter(b => !b.sudahAda), lewat = h.baris.length - baru.length;
  const td = 'padding:4px 8px;border-top:1px solid #d1fae5;';
  const rows = h.baris.map((b, i) => `<tr style="${b.sudahAda ? 'color:#9ca3af;' : ''}">
      <td style="${td}">${i + 1}</td><td style="${td}white-space:nowrap;">${escapeHtml(aujTglPendek(b.tanggal))}</td>
      <td style="${td}white-space:nowrap;">${escapeHtml(b.jamMulai)}–${escapeHtml(b.jamSelesai)}</td><td style="${td}">${escapeHtml(b.mapel)}</td>
      <td style="${td}">${b.sudahAda ? 'sudah ada — dilewati' : (b.bentrok && b.bentrok.length ? `<span style="color:#b91c1c;">⚠️ ${escapeHtml(b.bentrok.map(x => x.nama + ' bentrok dengan ' + aujLabelSesi(x.lawan)).join('; '))}</span>` : '✓')}</td></tr>`).join('');
  return `<p style="font-size:13px;margin-bottom:6px;"><strong>${baru.length} sesi</strong> akan dibuat untuk <strong>${escapeHtml(h.p.kelas)}</strong> di <strong>${escapeHtml(h.p.ruang)}</strong>, memakai ${h.hariTerpakai} hari${lewat ? `; ${lewat} sesi dilewati karena sudah ada` : ''}${h.slotKosong ? `; ${h.slotKosong} slot di hari terakhir kosong` : ''}.</p>
    ${h.nBentrok ? `<p style="font-size:12px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ ${h.nBentrok} bentrok pengawas dengan sesi lain. Masih bisa disimpan; ubah pengawasnya di Data Sesi sesudahnya.</p>` : ''}
    <div style="overflow-x:auto;background:#fff;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;"><th style="padding:4px 8px;">No</th><th style="padding:4px 8px;">Tanggal</th><th style="padding:4px 8px;">Waktu</th><th style="padding:4px 8px;">Mapel</th><th style="padding:4px 8px;">Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="margin-top:10px;"><button class="btn btn-success" id="btnAujMassal" onclick="aujSimpanMassal()" ${baru.length ? '' : 'disabled'}>💾 Simpan ${baru.length} Sesi</button></div>`;
}
function aujSimpanMassal() {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa membuat jadwal!', true);
  const h = aujMassalHasil; if (!h) return toast('Klik Pratinjau dulu.', true);
  const baru = h.baris.filter(b => !b.sudahAda);
  if (!baru.length) return toast('Semua sesi pada pratinjau sudah ada.', true);
  if (isBusy('aujMassal')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  if (!confirm(`Buat ${baru.length} sesi ${h.p.nama} untuk ${h.p.kelas} (${h.p.ruang})?${h.nBentrok ? `\n\n⚠️ ${h.nBentrok} bentrok pengawas terdeteksi.` : ''}`)) return;
  const acuan = aujUrutSesi()[0] || {}, snap = aujBuatSnapPeserta(h.p.kelas), now = new Date().toISOString();
  const updates = {}, tersimpan = [];
  const bersih = o => { Object.keys(o).forEach(k => { if (o[k] == null) delete o[k]; }); return o; };
  baru.forEach(b => {
    const key = db.ref(AUJ_NODE).push().key;
    // Isi sama seperti sesi baru lewat form: mewarisi denah lokasi & tata tertib sesi terbaru, daftar peserta dibekukan.
    const data = bersih({
      nama: b.nama, kelas: b.kelas, ruang: b.ruang, tanggal: b.tanggal, mapel: b.mapel, jamMulai: b.jamMulai, jamSelesai: b.jamSelesai,
      pengawas1: b.pengawas1, pengawas1Key: b.pengawas1Key, pengawas2: b.pengawas2, pengawas2Key: b.pengawas2Key,
      lokasiDenah: acuan.lokasiDenah, lokasiCatatan: acuan.lokasiCatatan, tatibPeserta: acuan.tatibPeserta, tatibPengawas: acuan.tatibPengawas,
      pesertaSnap: snap, tahunAjaran: currentTahunAjaran, semester: currentSemesterAktif || null,
      inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: now
    });
    updates[key] = data; tersimpan.push(Object.assign({ key }, data));
  });
  const btn = aujEl('btnAujMassal');
  setBusy('aujMassal', btn);
  db.ref(AUJ_NODE).update(updates, err => {   // satu tulisan atomik: semua sesi masuk atau tidak sama sekali
    clearBusy('aujMassal', btn);
    if (err) return toast('Gagal: ' + (err.message || err), true);
    tersimpan.forEach(r => allAdmUjian.push(r));
    toast(`✅ ${tersimpan.length} sesi jadwal dibuat!`);
    addLog('buat_administrasi_ujian', aujLogDetail(h.p.nama, h.p.kelas, h.p.ruang) + ` (massal ${tersimpan.length} sesi)`);
    aujMassalHasil = null; aujMassalDraft = null; aujMassalBuka = false;
    aujPastikanAktif(); aujRenderSemua();
  });
}

// ---------- Cetak jadwal ----------
// Sama dengan AUJ_CSS (margin PMA) tetapi A4 mendatar, kepala tabel diulang di tiap halaman.
const AUJ_CSS_JADWAL = AUJ_CSS.replace(/@page \{[^}]*\}/, '@page { size: A4 landscape; margin: 20mm 20mm 25mm 30mm; }') + `
  thead { display: table-header-group; } tr { page-break-inside: avoid; }
  table.jadwal td, table.jadwal th { font-size: 10.5pt; vertical-align: top; }
`;
function aujCetakJadwalHtml(daftar) {
  const grup = [];
  daftar.forEach(r => { const l = grup[grup.length - 1]; if (l && l.t === r.tanggal) l.r.push(r); else grup.push({ t: r.tanggal, r: [r] }); });
  let no = 0;
  const baris = grup.map(g => g.r.map((r, i) => {
    no++;
    const p = aujBagianTgl(g.t);
    const pw = [r.pengawas1, r.pengawas2].filter(Boolean).map((n, j, a) => (a.length > 1 ? (j + 1) + '. ' : '') + escapeHtml(n)).join('<br>') || '-';
    return `<tr><td style="text-align:center;width:30px;">${no}</td>
      ${i === 0 ? `<td rowspan="${g.r.length}" style="width:105px;">${p ? escapeHtml(p.hari) + '<br>' + p.d + ' ' + escapeHtml(p.bulan) + ' ' + p.y : escapeHtml(g.t || '-')}</td>` : ''}
      <td style="white-space:nowrap;text-align:center;">${r.jamMulai && r.jamSelesai ? escapeHtml(r.jamMulai) + ' - ' + escapeHtml(r.jamSelesai) : '-'}</td>
      <td>${escapeHtml(r.mapel || r.nama || '-')}</td><td style="text-align:center;">${escapeHtml(r.kelas || '-')}</td><td style="text-align:center;">${escapeHtml(r.ruang || '-')}</td><td>${pw}</td></tr>`;
  }).join('')).join('');
  const judul = aujJdwNama ? 'Jadwal ' + aujJdwNama : 'Jadwal Asesmen Sumatif Akhir Semester (ASAS/ASAT)';
  const tempat = aujTempat();
  const pseudo = { nama: judul, tanggal: daftar[0] && daftar[0].tanggal };
  return `<div class="halaman">${aujKopHtml()}
    <h1>${escapeHtml(judul)}</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}${aujJdwKelas ? ' — ' + escapeHtml(aujJdwKelas) : ''}</div>
    <table class="data jadwal"><thead><tr><th>No</th><th>Hari / Tanggal</th><th>Waktu (WIB)</th><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th><th>Pengawas</th></tr></thead><tbody>${baris}</tbody></table>
    <div style="text-align:right;margin-top:10px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(tglLokal()))}</div>
    <table class="ttd"><tr><td style="width:67%;"></td>${aujTtdKepalaHtml(pseudo, 'Jadwal ASAS/ASAT')}</tr></table>
  </div>`;
}
function aujCetakJadwal() {
  const daftar = aujJadwalTersaring();
  if (!daftar.length) return toast('Belum ada jadwal untuk dicetak.', true);
  const nb = aujCariBentrok(daftar).pasangan.length;
  if (nb) toast(`⚠️ Ada ${nb} pengawas bentrok di jadwal ini — periksa dulu sebelum dibagikan.`, false, 5000);
  aujCetakHtml(aujCetakJadwalHtml(daftar), `Jadwal Ujian${aujJdwNama ? ' - ' + aujJdwNama : ''}${aujJdwKelas ? ' - ' + aujJdwKelas : ''}`, AUJ_CSS_JADWAL);
}


// =====================================================
// HONOR PENGAWAS DARI JADWAL -- jadwal = sumber tunggal penugasan
// =====================================================
// Tombol "Buat Sesi Honor" membuat sesi di node `ujian` (halaman Honor Ujian) dari tiap sesi jadwal. Kunci sesi tetap
// (adm_<kunciJadwal>) sehingga menekan tombol dua kali tidak membuat sesi ganda. Yang disimpan: pengawas: { kunciGuru: true },
// serta mulaiMs/selesaiMs (epoch, WIB) supaya Firebase Rules bisa memeriksa jendela check-in. Check-in guru (event-ujian.js)
// hanya diterima Rules bila guru itu tercantum di `pengawas` dan waktunya dalam jendela.
const AUJ_HONOR_PREFIX = 'adm_';
function aujSesiHonorDari(jadwalKey) { return (typeof allUjian !== 'undefined' && allUjian || []).find(u => u.key === AUJ_HONOR_PREFIX + jadwalKey) || null; }
function aujMsWIB(tgl, jam) { if (!tgl || !jam) return null; const t = Date.parse(`${tgl}T${String(jam).slice(0, 5)}:00+07:00`); return isNaN(t) ? null : t; }
function aujNamaHonor(r) { return ('Pengawas ' + (r.mapel || r.nama || '-') + ' · ' + (r.kelas || '-') + ' · ' + (r.ruang || '-')).slice(0, 120); }
// Kunci pengawas satu sesi jadwal; data lama (belum punya Key) dicocokkan lewat nama. Hasil: { map, tidakDikenal:[nama] }.
function aujKunciPengawasSesi(r) {
  const map = {}, tidakDikenal = [];
  [[r.pengawas1, r.pengawas1Key], [r.pengawas2, r.pengawas2Key]].forEach(x => {
    if (!x[0] && !x[1]) return;
    const k = x[1] || aujKunciGuru(x[0]);
    if (k) map[k] = true; else tidakDikenal.push(x[0]);
  });
  return { map, tidakDikenal };
}
// Sesi jadwal yang sudah punya check-in honor: jam/tanggal & pengawas yang sudah check-in tidak boleh berubah diam-diam.
function aujCekUbahHonor(rec, isi) {
  const u = aujSesiHonorDari(rec.key); if (!u) return true;
  const hadir = (allUjianAttendance || []).filter(a => a.ujianKey === u.key); if (!hadir.length) return true;
  const waktuBerubah = (rec.tanggal || '') !== (isi.tanggal || '') || (rec.jamMulai || null) !== (isi.jamMulai || null) || (rec.jamSelesai || null) !== (isi.jamSelesai || null);
  const tetap = new Set([isi.pengawas1Key, isi.pengawas2Key].filter(Boolean));
  const dicopot = hadir.filter(a => !tetap.has(a.guruKey)).map(a => a.guru || a.guruKey);
  if (!waktuBerubah && !dicopot.length) return true;
  toast('⛔ Sesi ini sudah punya check-in honor pengawas' + (dicopot.length ? ' (' + dicopot.join(', ') + ' sudah check-in)' : '') + '. Tanggal/jam dan pengawas yang sudah check-in tidak bisa diubah; hapus check-in-nya dulu di Honor Ujian bila memang salah.', true, 7000);
  return false;
}
// Dipanggil sesudah sesi jadwal berhasil diubah: samakan sesi honornya (kalau ada).
function aujSinkronHonor(rec) {
  const u = aujSesiHonorDari(rec.key); if (!u) return;
  if (!isReallyOnline()) return toast('⚠️ Sesi honor belum ikut diperbarui (offline). Tekan "Buat Sesi Honor" lagi nanti atau periksa di Honor Ujian.', true, 6000);
  const { map, tidakDikenal } = aujKunciPengawasSesi(rec);
  const mulaiMs = aujMsWIB(rec.tanggal, rec.jamMulai), selesaiMs = aujMsWIB(rec.tanggal, rec.jamSelesai);
  if (!Object.keys(map).length || tidakDikenal.length || mulaiMs == null || selesaiMs == null) return toast('⚠️ Sesi honor TIDAK diperbarui: pengawas atau jam belum lengkap / tidak dikenal. Periksa di Honor Ujian.', true, 7000);
  const data = { pengawas: map, tanggal: rec.tanggal, jamMulai: rec.jamMulai, jamSelesai: rec.jamSelesai, mulaiMs, selesaiMs, nama: aujNamaHonor(rec), updatedAt: new Date().toISOString() };
  db.ref('ujian/' + u.key).update(data, err => { if (err) return toast('⚠️ Sesi honor gagal diperbarui: ' + (err.message || err), true, 7000); Object.assign(u, data); });
}
function aujBuatSesiHonor() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  if (isBusy('aujHonor')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  const daftar = aujJadwalTersaring();
  if (!daftar.length) return toast('Tidak ada sesi jadwal (periksa filter).', true);
  const layak = [], lewati = [];
  daftar.forEach(r => {
    const label = aujLabelSesi(r) + ' · ' + aujTglPendek(r.tanggal);
    if (aujSesiHonorDari(r.key)) return;   // sudah dibuat sebelumnya (diam-diam dilewati, bukan masalah)
    const { map, tidakDikenal } = aujKunciPengawasSesi(r);
    const mulaiMs = aujMsWIB(r.tanggal, r.jamMulai), selesaiMs = aujMsWIB(r.tanggal, r.jamSelesai);
    if (!Object.keys(map).length && !tidakDikenal.length) return lewati.push(label + ' — belum ada pengawas');
    if (tidakDikenal.length) return lewati.push(label + ' — pengawas "' + tidakDikenal.join('", "') + '" tidak cocok dengan Data Guru');
    if (mulaiMs == null || selesaiMs == null || selesaiMs <= mulaiMs) return lewati.push(label + ' — jam mulai/selesai belum lengkap');
    layak.push({ r, map, mulaiMs, selesaiMs });
  });
  if (!layak.length) return toast(lewati.length ? 'Tidak ada sesi yang bisa dibuat:\n• ' + lewati.slice(0, 6).join('\n• ') : 'Semua sesi pada daftar ini sudah punya sesi honor.', true, 7000);
  const def = (typeof V4 !== 'undefined' && V4.rates && V4.rates.activity) || '';
  const masuk = prompt(`Honor per pengawas untuk SATU sesi (Rp)?\n\n${layak.length} sesi akan dibuat${lewati.length ? `, ${lewati.length} dilewati (lengkapi pengawas/jamnya dulu)` : ''}.`, def);
  if (masuk === null) return;
  const honor = parseInt(String(masuk).replace(/[^0-9]/g, ''), 10) || 0;
  if (honor <= 0) return toast('Honor harus lebih dari 0!', true);
  const bt = aujCariBentrok(allAdmUjian), kunciBentrok = new Set();
  layak.forEach(x => { if (bt.perKey[x.r.key] && bt.perKey[x.r.key].length) kunciBentrok.add(x.r.key); });
  if (!confirm(`Buat ${layak.length} sesi honor pengawas @ Rp ${honor.toLocaleString('id-ID')}?` + (kunciBentrok.size ? `\n\n⚠️ ${kunciBentrok.size} sesi punya pengawas yang bentrok jam. Orang yang sama bisa terbayar dua kali untuk jam yang bertumpuk — sebaiknya rapikan jadwal dulu.` : '') + (lewati.length ? `\n\nDilewati (${lewati.length}):\n• ` + lewati.slice(0, 5).join('\n• ') + (lewati.length > 5 ? '\n• …' : '') : ''))) return;
  const now = new Date().toISOString(), updates = {}, baru = [];
  layak.forEach(x => {
    const r = x.r, key = AUJ_HONOR_PREFIX + r.key;
    const data = { nama: aujNamaHonor(r), jenis: 'Pengawas', tanggal: r.tanggal, jamMulai: r.jamMulai, jamSelesai: r.jamSelesai, honor, tahunAjaran: currentTahunAjaran,
      jadwalKey: r.key, pengawas: x.map, mulaiMs: x.mulaiMs, selesaiMs: x.selesaiMs, createdBy: currentUser.name, guruKey: currentUser.key || null, createdAt: now, updatedAt: now };
    updates[key] = data; baru.push(Object.assign({ key }, data));
  });
  const btn = null; setBusy('aujHonor', btn);
  db.ref('ujian').update(updates, err => {   // satu tulisan atomik
    clearBusy('aujHonor', btn);
    if (err) return toast('Gagal: ' + (err.message || err), true);
    baru.forEach(u => { allUjian = allUjian.filter(e => e.key !== u.key); allUjian.push(u); });
    toast(`✅ ${baru.length} sesi honor pengawas dibuat!`); addLog('buat_sesi_honor_ujian', `${baru.length} sesi @ Rp ${honor}`);
    aujRenderSemua();
  });
}

// =====================================================
// PERIKSA HONOR PENGAWAS -- pencocokan jadwal, Daftar Hadir, check-in, susulan
// =====================================================
// Murni membaca data yang sudah dimuat (tidak menulis apa pun). Hasil: [{ tingkat:'salah'|'periksa'|'info', teks }].
// Juga dipasang sebagai window.cekDataHonorUjian supaya halaman Cek Data (js/cek-data.js) bisa memanggilnya bila diinginkan.
//   salah   = perlu diperbaiki (honor bisa keliru / terbayar ganda)
//   periksa = tidak cocok, tetapi mungkin wajar
//   info    = catatan saja
function aujPeriksaHonor() {
  const hasil = [], today = (typeof tglLokal === 'function') ? tglLokal() : '';
  const att = (typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || [];
  const sus = (typeof allUjianSusulan !== 'undefined' && allUjianSusulan) || [];
  allAdmUjian.forEach(r => {
    const u = aujSesiHonorDari(r.key), label = aujLabelSesi(r) + ' · ' + aujTglPendek(r.tanggal), lewat = (r.tanggal || '') < today;
    if (!u) { if ((r.pengawas1 || r.pengawas2) && (r.tanggal || '') <= today) hasil.push({ tingkat: 'info', teks: `${label}: ada pengawas, tetapi sesi honornya belum dibuat.` }); return; }
    [['p1', r.pengawas1, r.pengawas1Key], ['p2', r.pengawas2, r.pengawas2Key]].forEach(x => {
      if (!x[1]) return;
      const key = x[2] || aujKunciGuru(x[1]);
      if (!key) return hasil.push({ tingkat: 'salah', teks: `${label}: pengawas "${x[1]}" tidak cocok dengan Data Guru.` });
      const ck = att.find(c => c.ujianKey === u.key && c.guruKey === key), centang = !!(r.pengawasHadir || {})[x[0]];
      const pending = sus.find(s => s.ujianKey === u.key && s.guruKey === key && s.status === 'menunggu');
      if (centang && !ck) hasil.push({ tingkat: 'salah', teks: `${label}: ${x[1]} dicentang Hadir di Daftar Hadir, tetapi belum ada check-in${pending ? ' (ada pengajuan susulan menunggu keputusan)' : ''} — honor belum terhitung.` });
      else if (ck && !centang && lewat) hasil.push({ tingkat: 'periksa', teks: `${label}: ${x[1]} sudah check-in${ck.susulan ? ' (susulan)' : ''}, tetapi belum dicentang Hadir di Daftar Hadir.` });
      else if (!ck && !centang && lewat && !pending) hasil.push({ tingkat: 'info', teks: `${label}: ${x[1]} tidak tercatat hadir (tidak check-in, tidak dicentang) — tidak mendapat honor.` });
      else if (!ck && pending) hasil.push({ tingkat: 'info', teks: `${label}: ${x[1]} punya pengajuan susulan yang menunggu keputusan.` });
    });
  });
  // Honor dua kegiatan pada jam yang bertumpuk (ujian x ujian, ujian x rapat/lembur) berdasarkan check-in yang benar-benar tercatat.
  const iv = [];
  att.forEach(c => { const u = (allUjian || []).find(z => z.key === c.ujianKey); if (u && c.guruKey) iv.push({ gk: c.guruKey, nama: c.guru, tanggal: u.tanggal, jamMulai: u.jamMulai, jamSelesai: u.jamSelesai, label: 'ujian "' + u.nama + '"' }); });
  ((typeof allEventAttendance !== 'undefined' && allEventAttendance) || []).forEach(c => { const e = (allEvents || []).find(z => z.key === c.eventKey); if (e && c.guruKey) iv.push({ gk: c.guruKey, nama: c.guru, tanggal: e.tanggal, jamMulai: e.jamMulai, jamSelesai: e.jamSelesai, label: 'acara "' + e.nama + '"' }); });
  const grup = {};
  iv.forEach(i => { if (i.tanggal) (grup[i.gk + '|' + i.tanggal] = grup[i.gk + '|' + i.tanggal] || []).push(i); });
  Object.keys(grup).forEach(k => {
    const g = grup[k];
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (aujTumpang(g[i], g[j]))
      hasil.push({ tingkat: 'salah', jenis: 'bentrok', teks: `${g[i].nama || g[i].gk}: honor ${g[i].label} (${g[i].jamMulai}–${g[i].jamSelesai}) bertumpuk dengan ${g[j].label} (${g[j].jamMulai}–${g[j].jamSelesai}) pada ${aujTglPendek(g[i].tanggal)} — bisa terbayar dua kali.` });
  });
  const urut = { salah: 0, periksa: 1, info: 2 };
  return hasil.sort((p, q) => urut[p.tingkat] - urut[q.tingkat]);
}
window.cekDataHonorUjian = aujPeriksaHonor;
function aujTampilPeriksa() {
  const box = aujEl('aujPeriksaIsi'); if (!box) return;
  box.innerHTML = '<p style="font-size:12px;color:#6b7280;margin-bottom:10px;">⏳ Memuat data terbaru…</p>';
  const gambar = () => {
    const hasil = aujPeriksaHonor(), w = { salah: ['#991b1b', '#fef2f2', '#fecaca', '⛔'], periksa: ['#92400e', '#fffbeb', '#fde68a', '⚠️'], info: ['#1e40af', '#eff6ff', '#bfdbfe', 'ℹ️'] };
    if (!hasil.length) { box.innerHTML = '<div style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px;">✅ Jadwal, Daftar Hadir, check-in, dan susulan cocok. Tidak ada temuan.</div>'; return; }
    const n = t => hasil.filter(h => h.tingkat === t).length;
    box.innerHTML = `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px;">
      <strong>🔎 Hasil periksa honor pengawas</strong> — ${n('salah')} perlu diperbaiki, ${n('periksa')} perlu dicek, ${n('info')} catatan
      <ul style="list-style:none;margin:6px 0 0;padding:0;">${hasil.slice(0, 40).map(h => `<li style="background:${w[h.tingkat][1]};border:1px solid ${w[h.tingkat][2]};color:${w[h.tingkat][0]};border-radius:6px;padding:4px 8px;margin-bottom:4px;">${w[h.tingkat][3]} ${escapeHtml(h.teks)}</li>`).join('')}${hasil.length > 40 ? `<li style="color:#6b7280;">…dan ${hasil.length - 40} temuan lain</li>` : ''}</ul></div>`;
  };
  const tugas = [typeof reloadDataset === 'function' ? reloadDataset(['ujian', 'ujianAttendance', 'events', 'eventAttendance']) : null, typeof muatUjianSusulan === 'function' ? muatUjianSusulan(true) : null];
  Promise.all(tugas).catch(() => {}).then(gambar);
}
