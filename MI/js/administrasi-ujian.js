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
                           bentrok, tombol duplikat sesi, dan cetak jadwal (F4 tegak). Kodenya di bagian
                           "JADWAL UJIAN" paling bawah file ini.
   8. Tambahan di tab Jadwal Ujian: Rekap Beban Pengawas (jumlah sesi & jam tiap guru, bisa dicetak), Jadwal Mengawas per
      Guru (tiap guru melihat/mencetak sesinya sendiri), dan tombol Urungkan untuk Jadwal Massal / Salin Jadwal / Isi
      Pengawas Kosong. Kehadiran pengawas di Daftar Hadir otomatis tercentang bila pengawas sudah check-in honor.
   9. Isian pilihan (drop down): Nama Asesmen, Mata Pelajaran (menurut kelas), Ruang, Jam Mulai (jam selesai otomatis +70 menit),
      Pengawas (daftar guru), tanggal libur tambahan, catatan & waktu Berita Acara, keterangan lokasi Denah. Semuanya tetap
      menyediakan "Lainnya (ketik sendiri)" / bisa diubah. Pembantunya ada di bagian "ISIAN PILIHAN" paling bawah file ini.
  10. Cetakan tambahan (26 Nov 2026): Daftar Hadir & Berita Acara KOSONGAN (satu ruang, satu tanggal, atau rentang tanggal), Nomor Ruang untuk pintu,
      Daftar Peserta per Ruang, Sampul Amplop naskah/LJK, Rekap Kehadiran per kelas, Rekap Berita Acara semua ruang per tanggal,
      Daftar Hadir Pengawas per hari (F4 mendatar), Kartu Peserta GABUNGAN semua kelas (1 PDF),
      Kartu Pengganti per siswa, dan tab Cek Kesiapan (sesi belum lengkap, bentrok, denah/kursi, foto). Foto siswa: tepi putih dipangkas otomatis; kartu berbingkai foto.
      Judul cetak memakai nama resmi: ASAS (Asesmen Sumatif Akhir Semester) Gasal / ASAT (Asesmen Sumatif Akhir Tahun) Genap; "Ganjil" tercetak "Gasal". Kartu Peserta: font & pas foto diperbesar + catatan bawah.
   Setiap tab punya tombol cetak, plus "Cetak Semua Berkas" (satu paket F4, halaman terpisah).
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
// Lama satu sesi ASAS/ASAT di MI: 70 menit (2 jam pelajaran x 35 menit). Ketentuan madrasah; selain 70 menit hanya diberi peringatan.
const AUJ_DURASI_MENIT = 70;
const AUJ_STATUS = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
const AUJ_TABS = [
  { id: 'jadwal', label: '📅 Jadwal Ujian' },
  { id: 'sk', label: '📜 SK Panitia' },
  { id: 'sesi', label: '📋 Data Sesi' },
  { id: 'hadir', label: '✅ Daftar Hadir' },
  { id: 'tatib', label: '📜 Tata Tertib' },
  { id: 'denah', label: '🗺️ Denah' },
  { id: 'kartu', label: '🎫 Kartu Peserta' },
  { id: 'ba', label: '📄 Berita Acara' },
  { id: 'siap', label: '✔️ Cek Kesiapan' }
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
let aujGabung = false;       // tab Denah: tampilan denah gabungan semua kelas yang sama ruang & jam
let aujKursi = {};          // draft tempat duduk: { 'baris_kolom': siswaKey }
let aujHadir = {};          // draft kehadiran peserta: { siswaKey: 'H'|'S'|'I'|'A' }
let aujHadirPengawas = {};  // draft kehadiran pengawas: { p1: true, p2: false }
let aujSel = null;          // pilihan aktif di denah: { t:'k', k:'1_2' } atau { t:'s', key }
let aujDenahAsli = null;    // foto isian denah saat sesi dibuka/disimpan; pembanding untuk mendeteksi draf yang belum disimpan
function aujFotoDenah(r) { return r ? JSON.stringify([r.lokasiDenah || '', r.lokasiCatatan || '', r.denahPintu || '', r.denahBaris || null, r.denahKolom || null, r.denahPerBangku || null]) : null; }
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
// Format nomor peserta (tampil di Daftar Hadir, Denah, Kartu Peserta, dan Label Meja):
//   'kelas' = nomor kelas + "-" + urut 3 digit, mis. Kelas 4 siswa ke-1 = 4-001, Kelas 5 siswa ke-12 = 5-012 (unik antar tingkat).
//   'urut'  = nomor urut abjad dalam kelas saja (1, 2, 3...), seperti versi lama.
const AUJ_FORMAT_NOMOR = 'kelas';
function aujNomor(kelas, no) {
  const n = +no || 0; if (AUJ_FORMAT_NOMOR !== 'kelas') return String(n);
  const k = /(\d+)/.exec(String(kelas || ''));
  return (k ? k[1] + '-' : '') + String(n).padStart(3, '0');
}
// Teks nomor peserta di kotak denah/chip: format 'kelas' sudah memuat kelas; format 'urut' perlu awalan kelas agar tidak ambigu.
function aujLabelPeserta(p) { return AUJ_FORMAT_NOMOR === 'kelas' ? String(p.nomor) : ((p.kls ? p.kls + ' · ' : '') + p.no); }
function aujPesertaLive(kelas) {
  return (allSiswa || []).filter(s => s.kelas === kelas)
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id'))
    .map((s, i) => ({ key: s.key, nama: s.name || '-', kelas: s.kelas, no: i + 1, nomor: aujNomor(s.kelas, i + 1) }));
}
// Kalau sesi punya snapshot (rec.pesertaSnap = { siswaKey: { n: nama, no } }), pakai itu: nomor peserta tetap walau
// Data Siswa berubah, dan pengawas yang tidak mengampu kelas itu tetap bisa mencetak. Tanpa snapshot -> ikut Data Siswa.
function aujPeserta(kelas, rec) {
  const snap = rec && rec.pesertaSnap;
  if (snap && typeof snap === 'object' && Object.keys(snap).length) {
    return Object.keys(snap).map(k => ({ key: k, nama: (snap[k] && snap[k].n) || '-', kelas: rec.kelas || kelas, no: +(snap[k] && snap[k].no) || 0, nomor: aujNomor(rec.kelas || kelas, +(snap[k] && snap[k].no) || 0) }))
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
// Tampilan awal tab Denah: bila ruang dipakai lebih dari satu kelas pada jam yang sama, langsung mode gabungan. Kecuali denah tersimpan
// per kelas saling berebut kursi: itu dibiarkan mode per kelas supaya tidak ada siswa yang terlepas diam-diam (pengguna bisa menekan tombol gabungan sendiri).
function aujAwalDenah(rec) {
  aujGabung = false; aujKursi = Object.assign({}, rec && rec.kursi || {});
  if (!rec) return;
  const grup = aujGrupRuang(rec); if (grup.length < 2) return;
  const gab = aujKursiGabungan(grup), total = grup.reduce((n, r) => n + Object.keys(r.kursi || {}).length, 0);
  if (Object.keys(gab).length === total) { aujGabung = true; aujKursi = gab; }
}
function aujMuatDraft() {
  const rec = aujRec();
  aujAwalDenah(rec);
  aujHadir = Object.assign({}, rec && rec.hadirPeserta || {});
  aujHadirPengawas = aujPwHadirEfektif(rec);   // centang manual + check-in honor
  aujDenahAsli = aujFotoDenah(rec);
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
  aujSkMuat();   // SK Panitia dimuat di latar belakang (nama Ketua untuk tanda tangan jadwal)
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
  let nSiap = 0; try { nSiap = aujTemuanSiap().kritis.length; } catch (e) { nSiap = 0; }   // lencana ⚠️ di tab Cek Kesiapan
  root.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:12px;">
      <div style="flex:1;min-width:220px;"><label class="label">Sesi ASAS/ASAT / Ruang</label>
        <select id="aujPilihSesi" class="field" onchange="aujPilihSesi(this.value)" ${ada ? '' : 'disabled'}>${aujBaru && ada ? '<option value="" selected>— sesi baru (belum disimpan) —</option>' : ''}${ada ? opsi : '<option>(belum ada sesi ASAS/ASAT)</option>'}</select></div>
      ${aujCanEdit() ? '<button class="btn btn-success" onclick="aujBuatSesi()">➕ Sesi Baru</button>' : ''}
      ${ada && !aujBaru ? '<button class="btn btn-soft" onclick="aujCetakSemua()">🖨️ Cetak Semua Berkas</button>' : ''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
      ${AUJ_TABS.map(t => `<button class="btn ${t.id === aujTabAktif ? 'btn-primary' : 'btn-soft'}" style="padding:6px 12px;font-size:13px;" onclick="aujPilihTab('${t.id}')">${t.label}${t.id === 'jadwal' && nBentrok ? ` ⚠️${nBentrok}` : ''}${t.id === 'siap' && nSiap ? ` ⚠️${nSiap}` : ''}</button>`).join('')}
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
  aujBaru = true; aujSalinan = null; aujAktifKey = null; aujTabAktif = 'sesi'; aujKursi = {}; aujGabung = false; aujHadir = {}; aujHadirPengawas = {}; aujSel = null;
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
  const pb = aujEl('aujPerBangku'); if (pb) rec.denahPerBangku = pb.value === '2' ? 2 : null;
}
function aujRenderTab() {
  const body = aujEl('aujTabBody'); if (!body) return;
  if (aujTabAktif === 'denah') aujTangkapDraftDenah();
  if (aujTabAktif === 'sk') { body.innerHTML = aujHtmlSk(); return; }   // SK Panitia: juga tidak butuh sesi terpilih
  if (aujTabAktif === 'jadwal') { body.innerHTML = aujHtmlJadwal(); aujIsiOpsiLibur(); return; }   // tab ini tidak butuh sesi terpilih
  if (aujTabAktif === 'siap') { body.innerHTML = aujHtmlSiap(); return; }   // Cek Kesiapan: memeriksa semua sesi, tidak butuh sesi terpilih
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
  let rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  if (isBusy('aujTulis')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Penyimpanan administrasi ASAS/ASAT butuh koneksi internet — coba lagi setelah online.', true);
  setBusy('aujTulis');
  const data = Object.assign({}, patch, { updatedBy: currentUser.name, updatedAt: new Date().toISOString() });
  db.ref(AUJ_NODE + '/' + rec.key).update(data, err => {
    clearBusy('aujTulis');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    rec = allAdmUjian.find(x => x.key === rec.key) || rec;   // refresh latar belakang bisa mengganti objek sesi selama menyimpan
    Object.keys(data).forEach(k => { if (data[k] === null) delete rec[k]; else rec[k] = data[k]; });
    toast(pesanOk); addLog(aksiLog, aujLogDetail(rec.nama, rec.kelas, rec.ruang));
    if (typeof sesudah === 'function') sesudah(rec);
    // Rec sudah diperbarui di memori (di atas). Draft yang di-reset hanya yang baru saja disimpan, supaya isian tab lain
    // yang belum disimpan tidak hilang. Tidak ada fetch ulang di sini (dulu bisa menimpa klik/isian yang sedang dikerjakan);
    // data dari perangkat lain tetap tersegarkan lewat setupAdministrasiUjianPage().
    if ('kursi' in data) aujAwalDenah(rec);
    if ('hadirPeserta' in data) aujHadir = Object.assign({}, rec.hadirPeserta || {});
    if ('pengawasHadir' in data) aujHadirPengawas = aujPwHadirEfektif(rec);
    if (['lokasiDenah', 'lokasiCatatan', 'denahPintu', 'denahBaris', 'denahKolom', 'denahPerBangku'].some(f => f in data)) aujDenahAsli = aujFotoDenah(rec);
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
      ${aujPilihanHtml('aujNama', 'Nama Asesmen *', r.nama, aujOpsiNama(), { dis, input: 'maxlength="100" placeholder="Nama asesmen"' })}
      ${aujPilihanHtml('aujMapel', 'Mata Pelajaran', r.mapel, aujOpsiMapel(r.kelas), { dis, selalu: true, input: 'maxlength="80" placeholder="Nama mata pelajaran"' })}
    </div>
    <div class="grid-3" style="margin-bottom:10px;">
      <div><label class="label">Kelas (peserta) *</label><select id="aujKelas" class="field" ${dis} onchange="aujOpsiPerbarui('aujMapel', aujOpsiMapel(this.value))"><option value="">-- Pilih Kelas --</option>${kelasOpt}</select></div>
      ${aujPilihanHtml('aujRuang', 'Ruang ASAS/ASAT *', r.ruang, aujOpsiRuang(), { dis, input: 'maxlength="40" placeholder="Nama ruang"' })}
      ${f('aujTanggal', 'Tanggal *', r.tanggal, 'date', cekB)}
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      <div><label class="label">Jam Mulai</label>${aujSelectJam('aujJamMulai', r.jamMulai, dis, 'onchange="aujJamUbah(\'aujJamMulai\',\'aujJamSelesai\',true)"')}</div>
      ${f('aujJamSelesai', 'Jam Selesai <span style="font-weight:400;color:#6b7280;">(otomatis +' + AUJ_DURASI_MENIT + ' menit, bisa diubah)</span>', r.jamSelesai, 'time', cekB)}
    </div>
    <div class="grid-2" style="margin-bottom:12px;">
      <div><label class="label">Pengawas 1</label>${aujSelectGuru('aujPengawas1', r.pengawas1, dis, 'onchange="aujCekBentrokForm()"')}</div>
      <div><label class="label">Pengawas 2 (opsional)</label>${aujSelectGuru('aujPengawas2', r.pengawas2, dis, 'onchange="aujCekBentrokForm()"')}</div>
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
  if (jamMulai && jamSelesai && aujMenit(jamSelesai) - aujMenit(jamMulai) !== AUJ_DURASI_MENIT && !confirm(`Lama sesi ini ${aujMenit(jamSelesai) - aujMenit(jamMulai)} menit, sedangkan ketentuan MI ${AUJ_DURASI_MENIT} menit.\n\nTetap simpan?`)) return;
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
  if (bentrok.length && !confirm('⚠️ Jadwal bentrok:\n\n• ' + bentrok.join('\n• ') + '\n\nTetap simpan sesi ini?')) return;
  if (aujBaru) {
    if (isBusy('aujSimpanSesi')) return toast('Sedang menyimpan...', false, 1500);
    if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
    // Sesi baru mewarisi denah lokasi & tata tertib buatan sesi terbaru, supaya tidak mengetik ulang.
    const acuan = aujAcuanSesi();
    const data = Object.assign({}, isi, {
      lokasiDenah: acuan.lokasiDenah || null, lokasiCatatan: acuan.lokasiCatatan || null,
      tatibPeserta: acuan.tatibPeserta || null, tatibPengawas: acuan.tatibPengawas || null,
      pesertaSnap: aujBuatSnapPeserta(kelas),
      tahunAjaran: currentTahunAjaran, semester: currentSemesterAktif || null,
      inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: new Date().toISOString()
    });
    aujWarisiDenah([data]);   // denah kursi ikut diwarisi dari sesi lain di ruang & kelas yang sama
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
  // Sesi pemegang honor satu ruang pindah ruang/jam/tanggal: kelas yang ditinggalkan kehilangan sesi honornya (ikut pindah), jadi beri tahu Admin.
  const uLama = aujSesiHonorDari(rec.key), pemegang = !!uLama && uLama.key === AUJ_HONOR_PREFIX + rec.key, ditinggal = pemegang ? aujGrupRuang(rec).filter(x => x.key !== rec.key) : [];
  aujTulis(patch, '✅ Data sesi diperbarui!', 'ubah_administrasi_ujian', r => {   // sesi honor (jika ada) ikut diperbarui
    aujSesudahUbahSesi(r);
    if (ditinggal.length && !ditinggal.some(x => aujSatuRuang(x, r))) toast('ℹ️ Sesi honor ruang ' + (ditinggal[0].ruang || '') + ' ikut pindah bersama sesi ini. Untuk kelas yang ditinggalkan (' + ditinggal.map(x => x.kelas).join(', ') + ') tekan "Buat Sesi Honor" lagi bila pengawasnya perlu honor.', false, 9000);
  });
}
function aujHapusSesi() {
  if (!aujCanEdit()) return;
  const rec = aujRec(); if (!rec) return;
  if (isBusy('aujHapus')) return;
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  const uHonor = aujSesiHonorDari(rec.key), honorSendiri = !!uHonor && uHonor.key === AUJ_HONOR_PREFIX + rec.key;   // honor satu ruang dipegang sesi pemilik
  if (honorSendiri && ((typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || []).some(x => x.ujianKey === uHonor.key)) return toast('Sesi ini sudah punya check-in honor pengawas, jadi tidak bisa dihapus. Hapus dulu check-in-nya di Honor Ujian bila memang perlu.', true);
  if (!doubleConfirm(`Hapus sesi ASAS/ASAT ini beserta daftar hadir, denah, dan berita acaranya?\n\n${rec.nama || '-'} • ${rec.kelas || '-'} • ${rec.ruang || '-'}\n${aujTglIndo(rec.tanggal, true)}`)) return;
  const saudara = honorSendiri ? aujGrupRuang(rec).filter(x => x.key !== rec.key) : [];   // kelas lain satu ruang: honor ruang harus dipindah, bukan ikut terhapus
  // Anggota biasa (honor dipegang kelas lain): pengawas yang hanya bertugas di sesi ini dicopot dari honor ruang, kecuali sudah check-in -> hapus ditolak.
  const sisaRuang = (!honorSendiri && uHonor) ? aujGrupRuang(rec).filter(x => x.key !== rec.key) : [];
  if (sisaRuang.length) {
    const tetap = new Set(); sisaRuang.forEach(x => Object.keys(aujKunciPengawasSesi(x).map).forEach(k => tetap.add(k)));
    const dicopot = ((typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || []).filter(a => a.ujianKey === uHonor.key && !tetap.has(a.guruKey)).map(a => a.guru || a.guruKey);
    if (dicopot.length) return toast('⛔ ' + dicopot.join(', ') + ' sudah check-in honor di ruang ini dan hanya bertugas di sesi ini, jadi sesi tidak bisa dihapus. Hapus check-in-nya dulu di Honor Ujian bila memang salah.', true, 7000);
  }
  setBusy('aujHapus');
  db.ref(AUJ_NODE + '/' + rec.key).remove(err => {
    clearBusy('aujHapus');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    toast('✅ Sesi ASAS/ASAT dihapus.'); addLog('hapus_administrasi_ujian', aujLogDetail(rec.nama, rec.kelas, rec.ruang));
    allAdmUjian = allAdmUjian.filter(x => x.key !== rec.key);
    if (sisaRuang.length) aujSinkronHonor(sisaRuang[0]);   // honor ruang mengikuti pengawas yang tersisa
    if (honorSendiri && typeof allUjian !== 'undefined') {
      const peta = {}; saudara.forEach(x => Object.assign(peta, aujKunciPengawasSesi(x).map));
      if (saudara.length && Object.keys(peta).length) {   // pindahkan sesi honor ke kelas pertama yang tersisa (sesi honor satu ruang)
        const kb = AUJ_HONOR_PREFIX + saudara[0].key, now = new Date().toISOString();
        const baru = Object.assign({}, uHonor, { jadwalKey: saudara[0].key, pengawas: peta, updatedAt: now }); delete baru.key;
        baru.nama = aujNamaHonor(saudara[0]);
        const u2 = {}; u2[uHonor.key] = null; u2[kb] = baru;
        db.ref('ujian').update(u2, e2 => {
          if (e2) return toast('⚠️ Sesi dihapus, tetapi sesi honor ruang gagal dipindahkan: ' + (e2.message || e2) + '. Periksa di Honor Ujian.', true, 8000);
          allUjian = allUjian.filter(x => x.key !== uHonor.key && x.key !== kb); allUjian.push(Object.assign({ key: kb }, baru)); aujRenderSemua();
        });
      } else { db.ref('ujian/' + uHonor.key).remove(() => {}); allUjian = allUjian.filter(x => x.key !== uHonor.key); }   // tidak ada kelas lain: honor yang belum dipakai ikut dibersihkan
    }
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
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${p.nomor}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(p.nama)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;"><select class="field" style="padding:3px 6px;font-size:13px;" ${ed ? '' : 'disabled'} onchange="aujSetHadir('${escapeJs(p.key)}', this.value)">${opt(aujHadir[p.key])}</select></td></tr>`).join('');
  const ck = aujCheckinPengawas(rec);   // pengawas yang sudah check-in honor: otomatis Hadir, tidak bisa dicopot dari sini
  const pw = (id, nama) => `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:14px;flex-wrap:wrap;"><input type="checkbox" ${aujHadirPengawas[id] || ck[id] ? 'checked' : ''} ${ed && !ck[id] ? '' : 'disabled'} onchange="aujSetHadirPengawas('${escapeJs(id)}', this.checked)"> ${escapeHtml(nama)} <span style="color:#6b7280;font-size:12px;">(${id === 'p1' ? 'Pengawas 1' : 'Pengawas 2'})</span>${ck[id] ? ' <span style="color:#065f46;font-size:12px;">✓ otomatis dari check-in honor</span>' : ''}</label>`;
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">✅ Daftar Hadir — ${escapeHtml(rec.kelas || '')} · ${escapeHtml(rec.ruang || '')}</h4>
      <button class="btn btn-primary" onclick="aujCetakSatu('hadir')">🖨️ Cetak Daftar Hadir</button>
      <button class="btn btn-soft" onclick="aujCetakSatu('hadir0')" title="Daftar hadir tanpa status, untuk diisi tangan pengawas di ruangan">📝 Daftar Hadir Kosongan</button>
      <button class="btn btn-soft" onclick="aujCetakSatu('rekap')" title="Rekap H/S/I/A siswa kelas ini di semua sesi asesmen (F4 mendatar)">📊 Rekap Kehadiran Kelas</button>
      <button class="btn btn-soft" onclick="aujCetakSatu('rekapSemua')" title="Rekap kehadiran semua kelas, satu halaman per kelas (F4 mendatar)">📊 Rekap Semua Kelas</button>
      <button class="btn btn-soft" onclick="aujCetakKosonganHari()" title="Daftar Hadir + Berita Acara kosong untuk semua ruang pada tanggal sesi ini">📚 Kosongan Semua Ruang (tanggal ini)</button>
    </div>
    ${aujBarKosongan(rec)}
    <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">Status di sini dipakai untuk rekap Berita Acara. Formulir cetak tetap memuat kolom tanda tangan untuk diisi langsung di ruang ASAS/ASAT.</p>
    <h5 style="font-weight:700;font-size:13px;margin:12px 0 6px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">Pengawas <button class="btn btn-soft" style="font-size:11px;padding:2px 8px;font-weight:400;" onclick="aujMuatCheckin()" title="Muat ulang data check-in honor pengawas">↻ Muat check-in terbaru</button></h5>
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
function aujDimensi(rec) { return { B: aujInt(rec.denahBaris, 6, 1, 15), K: aujInt(rec.denahKolom, 5, 1, 8), P: rec.denahPerBangku === 2 ? 2 : 1 }; }
// Kunci kursi: 'baris_kolom' (kursi 1 / kiri) dan 'baris_kolom_2' (kursi ke-2 / kanan) bila satu bangku diisi dua siswa (denahPerBangku = 2).
function aujKunciKursi(r, c, s) { return r + '_' + c + (s === 2 ? '_2' : ''); }
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
  const { B, K, P } = aujDimensi(rec), byKey = {}; peserta.forEach(p => { byKey[p.key] = p; });
  const bt = peserta.some(p => p.recKey) ? aujSeatBentrok(kursi, byKey, B, K, P) : { set: {}, n: 0 };   // denah gabungan: tandai kursi bersebelahan sama kelas
  const bisaKlik = interaktif && aujCanEdit();
  let h = `<table style="width:100%;border-collapse:separate;border-spacing:4px;table-layout:fixed;">
    <tr><td colspan="${K}" style="border:1px solid #334155;background:#e2e8f0;text-align:center;font-size:12px;font-weight:700;padding:6px;">MEJA PENGAWAS / PAPAN TULIS</td></tr>`;
  const warna = (k, p) => {
    const pilih = interaktif && aujSel && aujSel.t === 'k' && aujSel.k === k;
    return pilih ? 'background:#bfdbfe;outline:2px solid #2563eb;' : (p ? 'background:' + (p.warna || '#f0fdf4') + ';' + (p.warna ? 'color:#111827;' : '') + (interaktif && bt.set[k] ? 'outline:2px solid #dc2626;' : '') : 'background:#fff;color:#9ca3af;');
  };
  for (let r = 1; r <= B; r++) {
    h += '<tr>';
    for (let c = 1; c <= K; c++) {
      if (P === 2) {   // satu bangku = dua kursi berdampingan (kiri | kanan), masing-masing bisa diklik
        const tinggi = interaktif ? 52 : 46, f = interaktif ? 9.5 : 8.5;
        h += `<td style="border:1px solid #64748b;padding:0;vertical-align:middle;overflow:hidden;"><div style="display:flex;height:${tinggi}px;">${[1, 2].map(s => {
          const k = aujKunciKursi(r, c, s), p = byKey[kursi[k]];
          return `<div style="flex:1;min-width:0;${s === 2 ? 'border-left:1px dashed #64748b;' : ''}padding:2px;text-align:center;font-size:${f}px;display:flex;flex-direction:column;justify-content:center;overflow:hidden;word-break:break-word;${warna(k, p)}${bisaKlik ? 'cursor:pointer;' : ''}" ${bisaKlik ? `onclick="aujKlikKursi(${r},${c},${s})"` : ''}>${p ? `<div style="font-weight:700;">${escapeHtml(aujLabelPeserta(p))}</div><div style="line-height:1.1;">${escapeHtml(p.nama)}</div>` : '·'}</div>`;
        }).join('')}</div></td>`;
        continue;
      }
      const k = r + '_' + c, p = byKey[kursi[k]];
      const gaya = `border:1px solid #64748b;padding:4px 3px;text-align:center;font-size:${interaktif ? 11 : 10}px;height:${interaktif ? 48 : 44}px;vertical-align:middle;overflow:hidden;` + warna(k, p) + (bisaKlik ? 'cursor:pointer;' : '');
      h += `<td style="${gaya}" ${bisaKlik ? `onclick="aujKlikKursi(${r},${c})"` : ''}>${p ? `<div style="font-weight:700;">${escapeHtml(aujLabelPeserta(p))}</div><div style="line-height:1.15;">${escapeHtml(p.nama)}</div>` : '·'}</td>`;
    }
    h += '</tr>';
  }
  const pintu = rec.denahPintu === 'kiri' ? 'left' : 'right';
  h += `<tr><td colspan="${K}" style="border:none;text-align:${pintu};font-size:12px;font-weight:700;padding-top:2px;">🚪 PINTU MASUK</td></tr></table>`;
  return h;
}
function aujHtmlDenah(rec) {
  const ed = aujCanEdit(), dis = ed ? '' : 'disabled', grup = aujGrupRuang(rec), gab = aujGabung && grup.length > 1;
  const ps = gab ? aujPesertaGabungan(grup) : aujPeserta(rec.kelas, rec), { B, K, P } = aujDimensi(rec);
  const terpakai = new Set(Object.keys(aujKursi).map(k => aujKursi[k]));
  const belum = ps.filter(p => !terpakai.has(p.key));
  const chip = p => `<button class="btn ${aujSel && aujSel.t === 's' && aujSel.key === p.key ? 'btn-primary' : 'btn-soft'}" style="padding:3px 8px;font-size:12px;" ${ed ? `onclick="aujKlikSiswa('${escapeJs(p.key)}')"` : 'disabled'}>${escapeHtml(aujLabelPeserta(p))}. ${escapeHtml(p.nama)}</button>`;
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">🗺️ Denah Lokasi & Tempat Duduk</h4>
      <button class="btn btn-primary" onclick="aujCetakSatu('denah')">🖨️ Cetak Denah</button>
      <button class="btn btn-soft" onclick="aujUnduhLabelPdf(false)" title="Label nomor peserta untuk ditempel di bangku ruang ini, berurutan sesuai denah tersimpan">🏷️ Unduh PDF Label Meja</button>
      <button class="btn btn-soft" onclick="aujUnduhLabelPdf(true)" title="Label meja semua ruang pada asesmen ini dalam satu file PDF, disambung tanpa ganti halaman">🏷️ Label Meja Semua Ruang</button>
      <button class="btn btn-soft" onclick="aujCetakSatu('pintu')" title="Lembar besar nama ruang + kelas + rentang nomor peserta untuk ditempel di pintu, satu lembar per ruang">🚪 Cetak Nomor Ruang (Pintu)</button>
      <button class="btn btn-soft" onclick="aujCetakSatu('pintuNama')" title="Daftar nama dan nomor peserta per ruang (satu halaman per ruang), untuk ditempel di dekat pintu">📋 Daftar Peserta per Ruang</button>
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:14px;">
      <h5 style="font-weight:700;font-size:14px;margin-bottom:4px;">1. Denah Lokasi Ruang ASAS/ASAT</h5>
      ${ed ? `<p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Satu baris = satu deret ruangan di gedung; pisahkan ruangan dengan tanda <strong>|</strong>. Kosongkan sel dengan spasi antar tanda | (mis. <code>Ruang 1 | | Ruang 2</code>).</p>
      <textarea id="aujLokasiDenah" class="field" rows="5" style="font-family:monospace;font-size:12px;" placeholder="Ruang 1 | Ruang 2 | Ruang 3&#10;Kantor | Perpustakaan | Ruang 4" oninput="aujPratinjauLokasi()">${escapeHtml(rec.lokasiDenah || '')}</textarea>
      <div style="margin:6px 0;">${aujPilihanHtml('aujLokasiCatatan', 'Keterangan lokasi (opsional)', rec.lokasiCatatan, aujOpsiUnik('lokasiCatatan'), { dis, input: 'maxlength="160" placeholder="mis. Pintu masuk utama dari halaman depan"' })}</div>` : ''}
      <div id="aujLokasiPreview" style="margin-top:6px;">${aujLokasiHtml(rec)}</div>
    </div>

    <div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:12px;">
      <h5 style="font-weight:700;font-size:14px;margin-bottom:6px;">2. Denah Tempat Duduk${gab ? ' Gabungan' : ''} — ${escapeHtml(rec.ruang || '')} (${ps.length} peserta${gab ? ', ' + escapeHtml(grup.map(r => r.kelas).join(' + ')) : ''}${P === 2 ? ', ' + B * K + ' bangku × 2' : ''})</h5>
      ${aujBannerGabung(grup, gab)}
      ${ed ? `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:8px;">
        <div><label class="label">Baris</label><input id="aujBaris" type="number" class="field" style="width:80px;" min="1" max="15" value="${B}" ${dis} onchange="aujUbahUkuran()"></div>
        <div><label class="label">Kolom</label><input id="aujKolom" type="number" class="field" style="width:80px;" min="1" max="8" value="${K}" ${dis} onchange="aujUbahUkuran()"></div>
        <div><label class="label">Pintu</label><select id="aujPintu" class="field" ${dis}><option value="kanan" ${rec.denahPintu !== 'kiri' ? 'selected' : ''}>Kanan</option><option value="kiri" ${rec.denahPintu === 'kiri' ? 'selected' : ''}>Kiri</option></select></div>
        <div><label class="label">Siswa per bangku</label><select id="aujPerBangku" class="field" ${dis} onchange="aujUbahPerBangku()"><option value="1" ${P === 1 ? 'selected' : ''}>1 siswa</option><option value="2" ${P === 2 ? 'selected' : ''}>2 siswa (satu bangku berdua)</option></select></div>
        ${gab ? '<button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahGabungOtomatis(false)">🧩 Susun Selang-seling Kelas</button><button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahGabungOtomatis(true)">🎲 Acak Selang-seling</button>' : '<button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahOtomatis(false)">🔤 Urut Abjad</button><button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahOtomatis(true)">🎲 Acak</button>'}
        <button class="btn btn-soft" style="font-size:12px;" onclick="aujKosongkanTerpilih()">⬜ Kosongkan Kursi Terpilih</button>
        <button class="btn btn-soft" style="font-size:12px;" onclick="aujDenahReset()">🧹 Kosongkan Semua</button>
      </div>
      <p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Tukar posisi: klik satu kursi, lalu klik kursi lain. Untuk menaruh siswa dari daftar "belum dapat kursi": klik namanya lalu klik kursinya.</p>` : ''}
      <div id="aujGridWrap" style="overflow-x:auto;">${aujGridHtml(rec, aujKursi, ps, true)}</div>
      ${P === 2 ? aujCatatanBangku(aujKursi, B, K) : ''}${gab ? aujCatatanBentrok(aujKursi, ps, B, K, grup, P) : ''}
      ${belum.length ? `<p style="font-size:12px;font-weight:700;margin:10px 0 4px;">Belum dapat kursi (${belum.length}):</p><div style="display:flex;flex-wrap:wrap;gap:4px;">${belum.map(chip).join('')}</div>` : (ps.length ? '<p style="font-size:12px;color:#059669;margin-top:8px;">✅ Semua peserta sudah mendapat kursi.</p>' : '')}
    </div>
    ${ed ? '<button class="btn btn-success" onclick="' + (gab ? 'aujSimpanDenahGabung' : 'aujSimpanDenah') + '()">💾 Simpan Denah' + (gab ? ' Gabungan' : '') + '</button> <button class="btn btn-soft" onclick="aujDenahKeSemua()" title="Salin denah tersimpan ini ke semua sesi lain di ruang yang sama (semua tanggal)">📋 Terapkan ke Semua Sesi Ruang Ini</button>' : ''}`;
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
function aujUbahPerBangku() {
  const rec = aujRec(); if (!rec) return;
  const P = aujVal('aujPerBangku') === '2' ? 2 : 1;
  if (P === 1) {
    const kedua = Object.keys(aujKursi).filter(k => k.split('_')[2] === '2');   // 'baris_kolom_2' = kursi kedua (jangan samakan dengan kursi biasa 'baris_2')
    if (kedua.length) {
      if (!confirm(`${kedua.length} siswa yang duduk di kursi kedua bangku akan dilepas dari kursinya (belum disimpan). Lanjutkan?`)) { aujRenderTab(); return; }
      kedua.forEach(k => { delete aujKursi[k]; });
    }
  }
  rec.denahPerBangku = P === 2 ? 2 : null;   // hanya di memori sampai disimpan
  aujSel = null; aujRenderTab();
}
function aujDenahOtomatis(acak) {
  const rec = aujRec(); if (!rec) return;
  const ps = aujPeserta(rec.kelas, rec), { B, K, P } = aujDimensi(rec);
  if (ps.length > B * K * P) return toast(`Kursi (${B * K * P}) kurang dari jumlah peserta (${ps.length}). Tambah baris/kolom dulu.`, true);
  if (Object.keys(aujKursi).length && !confirm('Susunan kursi saat ini akan ditimpa. Lanjutkan?')) return;
  const urut = ps.slice();
  if (acak) for (let i = urut.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [urut[i], urut[j]] = [urut[j], urut[i]]; }
  aujKursi = {}; urut.forEach((p, i) => { const bangku = Math.floor(i / P); aujKursi[aujKunciKursi(Math.floor(bangku / K) + 1, (bangku % K) + 1, (i % P) + 1)] = p.key; });
  aujSel = null; aujRenderTab();
}
function aujDenahReset() { if (!confirm('Kosongkan semua kursi pada denah?')) return; aujKursi = {}; aujSel = null; aujRenderTab(); }
function aujSetKursi(k, key) {
  if (key) { Object.keys(aujKursi).forEach(x => { if (aujKursi[x] === key) delete aujKursi[x]; }); aujKursi[k] = key; }
  else delete aujKursi[k];
}
function aujKlikKursi(r, c, s) {
  if (!aujCanEdit()) return;
  const k = aujKunciKursi(r, c, s), sel = aujSel;
  if (!sel) aujSel = { t: 'k', k };
  else if (sel.t === 'k') {
    if (sel.k !== k) { const a = aujKursi[sel.k], b = aujKursi[k]; aujSetKursi(k, a); aujSetKursi(sel.k, b); }
    aujSel = null;
  } else { aujSetKursi(k, sel.key); aujSel = null; }
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
  const P = aujVal('aujPerBangku') === '2' ? 2 : 1, sah = new Set(aujPeserta(rec.kelas, rec).map(p => p.key)), kursi = {};
  Object.keys(aujKursi).forEach(k => { const m = k.split('_'), s = m[2] === '2' ? 2 : 1; if (+m[0] <= B && +m[1] <= K && s <= P && sah.has(aujKursi[k])) kursi[k] = aujKursi[k]; });
  const lain = aujGrupRuang(rec).filter(x => x.key !== rec.key), dipakai = new Set();
  lain.forEach(x => Object.keys(x.kursi || {}).forEach(k => dipakai.add(k)));
  const tabrak = Object.keys(kursi).filter(k => dipakai.has(k)).length;
  if (tabrak && !confirm(`⚠️ ${tabrak} kursi sudah dipakai kelas lain di ruang dan jam yang sama (${lain.map(x => x.kelas).join(', ')}). Gunakan denah gabungan agar kursi tidak bertabrakan.\n\nTetap simpan denah kelas ini?`)) return;
  aujTulis({
    lokasiDenah: aujKosongJadiNull(aujVal('aujLokasiDenah')), lokasiCatatan: aujKosongJadiNull(aujVal('aujLokasiCatatan')),
    denahBaris: B, denahKolom: K, denahPerBangku: P === 2 ? 2 : null, denahPintu: aujVal('aujPintu') === 'kiri' ? 'kiri' : 'kanan',
    kursi: Object.keys(kursi).length ? kursi : null
  }, '✅ Denah tersimpan!', 'simpan_denah_ujian');
}

// ---------- Denah gabungan: beberapa kelas di satu ruang pada jam yang sama ----------
// Data tetap per kelas (rec.kursi hanya berisi siswa kelas itu), jadi daftar hadir, kartu peserta, dan berita acara tidak berubah.
// Denah gabungan hanya menggabungkan tampilan, menyusun kursi selang-seling antar kelas, lalu menyimpannya ke tiap sesi.
const AUJ_WARNA_KELAS = ['#dbeafe', '#fce7f3', '#dcfce7', '#fef3c7', '#ede9fe', '#ffedd5'];
function aujGrupRuang(rec) {
  if (!rec) return [];
  if (!rec.ruang || !rec.tanggal) return [rec];
  const g = allAdmUjian.filter(x => x.key === rec.key || aujSatuRuang(x, rec));
  if (!g.some(x => x.key === rec.key)) g.push(rec);
  return g.sort((a, b) => String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }));
}
function aujPesertaGabungan(grup) {
  const out = [];
  grup.forEach((r, i) => aujPeserta(r.kelas, r).forEach(p => out.push(Object.assign({}, p, {
    kls: String(r.kelas || '').replace(/^kelas\s*/i, ''), warna: AUJ_WARNA_KELAS[i % AUJ_WARNA_KELAS.length], recKey: r.key
  }))));
  return out;
}
// Sama isinya (urutan key tidak dihitung).
function aujKursiSama(a, b) {
  const ka = Object.keys(a || {}), kb = Object.keys(b || {});
  return ka.length === kb.length && ka.every(k => (b || {})[k] === a[k]);
}
function aujKursiGabungan(grup) {
  const out = {};
  (grup || []).forEach(r => Object.keys(r.kursi || {}).forEach(k => { if (!out[k]) out[k] = r.kursi[k]; }));
  return out;
}
// Pasangan kursi yang bersebelahan (kiri-kanan atau depan-belakang) dan berasal dari kelas yang sama.
function aujSeatBentrok(kursi, byKey, B, K, P) {
  P = P === 2 ? 2 : 1;
  const W = K * P, set = {}; let n = 0;   // dengan 2 siswa per bangku, deretan kursi dihitung memanjang (kiri-kanan melintasi batas bangku)
  const kunci = (r, w) => aujKunciKursi(r, Math.ceil(w / P), ((w - 1) % P) + 1);
  const kelasDi = (r, w) => { const p = byKey[kursi[kunci(r, w)]]; return p ? (p.recKey || p.kls || '') : ''; };
  for (let r = 1; r <= B; r++) for (let w = 1; w <= W; w++) {
    const a = kelasDi(r, w); if (!a) continue;
    [[r, w + 1], [r + 1, w]].forEach(x => { if (x[0] > B || x[1] > W) return; if (kelasDi(x[0], x[1]) === a) { set[kunci(r, w)] = 1; set[kunci(x[0], x[1])] = 1; n++; } });
  }
  return { set, n };
}
function aujLegendaKelas(grup) {
  return grup.map((r, i) => `<span style="display:inline-block;padding:1px 8px;border-radius:10px;border:1px solid #94a3b8;background:${AUJ_WARNA_KELAS[i % AUJ_WARNA_KELAS.length]};color:#111827;font-size:11px;margin-right:4px;">${escapeHtml(r.kelas || '')}</span>`).join('');
}
// Bangku berdua: berapa bangku berisi 2 siswa dan berapa yang hanya 1 (siswa tidak berpasangan duduk sendiri).
function aujCatatanBangku(kursi, B, K) {
  let berdua = 0, sendiri = 0;
  for (let r = 1; r <= B; r++) for (let c = 1; c <= K; c++) { const a = !!kursi[aujKunciKursi(r, c, 1)], b = !!kursi[aujKunciKursi(r, c, 2)]; if (a && b) berdua++; else if (a || b) sendiri++; }
  if (!berdua && !sendiri) return '';
  return `<p style="font-size:12px;margin-top:6px;color:${sendiri ? '#92400e' : '#059669'};">${sendiri ? `ℹ️ ${sendiri} bangku hanya diisi 1 siswa (siswa yang tidak berpasangan duduk sendiri), ${berdua} bangku diisi berdua. Ingin dipasangkan? Tukar atau pindahkan siswanya di denah.` : `✅ Semua bangku terisi berdua (${berdua} bangku).`}</p>`;
}
function aujCatatanBentrok(kursi, ps, B, K, grup, P) {
  const byKey = {}; ps.forEach(p => { byKey[p.key] = p; });
  const bt = aujSeatBentrok(kursi, byKey, B, K, P);
  const status = bt.n ? `<span style="color:#b91c1c;">⚠️ ${bt.n} pasang kursi bersebelahan sama kelas (berbingkai merah). Tukar posisi atau klik Susun Selang-seling.</span>`
    : (Object.keys(kursi).length ? '<span style="color:#059669;">✅ Tidak ada kursi bersebelahan yang sama kelasnya.</span>' : '');
  return `<div style="margin-top:8px;font-size:12px;">${aujLegendaKelas(grup)}<div style="margin-top:4px;">${status}</div></div>`;
}
function aujBannerGabung(grup, gab) {
  if (grup.length < 2) return '';
  const daftar = escapeHtml(grup.map(r => r.kelas).join(', '));
  if (gab) return `<p style="font-size:12px;background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:6px 10px;margin-bottom:8px;">🧩 Denah gabungan: ${daftar} duduk di ruang ini pada jam yang sama; kursi bersebelahan (kiri-kanan dan depan-belakang) diusahakan beda kelas. Nomor peserta, daftar hadir, dan kartu tetap per kelas. <button class="btn btn-soft" style="font-size:11px;padding:2px 8px;" onclick="aujToggleGabung()">↩️ Kembali ke denah per kelas</button></p>`;
  return `<p style="font-size:12px;background:#fffbeb;color:#92400e;border-radius:6px;padding:6px 10px;margin-bottom:8px;">⚠️ Ruang ini juga dipakai ${daftar} pada jam yang sama, jadi denah per kelas bisa bertabrakan kursinya. <button class="btn btn-soft" style="font-size:11px;padding:2px 8px;" onclick="aujToggleGabung()">🧩 Pakai denah gabungan</button></p>`;
}
// Terapkan denah TERSIMPAN ruang ini ke semua sesi lain di ruang yang sama (asesmen yang sama), supaya tiap siswa duduk di kursi yang sama sepanjang ujian.
// Tiap sesi hanya menerima kursi siswa kelasnya sendiri; kursi kelas yang tidak ujian pada sesi itu dibiarkan kosong.
function aujDenahKeSemua() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  const rec = aujRec(); if (!rec) return;
  if (aujDraftBeda('denah', rec)) return toast('Ada perubahan denah yang belum disimpan. Simpan dulu, baru terapkan ke sesi lain.', true, 5000);
  const grup = aujGrupRuang(rec), sumber = grup.length > 1 ? aujKursiGabungan(grup) : (rec.kursi || {});
  if (!Object.keys(sumber).length) return toast('Denah ruang ini belum tersimpan atau masih kosong. Susun dan simpan dulu.', true);
  const totalKursi = grup.reduce((n, r) => n + Object.keys(r.kursi || {}).length, 0);   // gabungan membuang kursi kelas kedua yang bentrok; jangan menimpa sesi lain dengan denah yang kehilangan siswa
  if (grup.length > 1 && Object.keys(sumber).length < totalKursi) return toast('Denah per kelas di ruang ini saling berebut kursi, jadi ada siswa yang kehilangan kursi bila diterapkan. Buka mode denah gabungan, simpan, lalu terapkan lagi.', true, 7000);
  const tutup = new Set(grup.map(r => r.key)), n = aujNormNama;
  const target = allAdmUjian.filter(x => !tutup.has(x.key) && n(x.ruang) === n(rec.ruang) && n(x.nama) === n(rec.nama));
  if (!target.length) return toast('Tidak ada sesi lain di ruang ini untuk asesmen yang sama.', true);
  if (isBusy('aujDenahSemua')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  if (!confirm(`Terapkan denah ${rec.ruang} ini ke ${aujLipatRuang(target).length} sesi lain di ruang yang sama (semua tanggal)?\n\nDenah lama di sesi-sesi itu akan DITIMPA. Siswa tiap kelas tetap duduk di kursi yang sama; kursi kelas yang tidak ujian pada sesi itu dibiarkan kosong.`)) return;
  const dasar = {}; ['denahBaris', 'denahKolom', 'denahPerBangku', 'denahPintu', 'lokasiDenah', 'lokasiCatatan'].forEach(f => { dasar[f] = (rec[f] == null || rec[f] === '') ? null : rec[f]; });
  const patch = {}, upd = {};
  target.forEach(t => {
    const sah = new Set(aujPeserta(t.kelas, t).map(p => p.key)), kt = {};
    Object.keys(sumber).forEach(k => { if (sah.has(sumber[k])) kt[k] = sumber[k]; });
    patch[t.key] = Object.assign({}, dasar, { kursi: Object.keys(kt).length ? kt : null });
    Object.keys(patch[t.key]).forEach(f => { upd[t.key + '/' + f] = patch[t.key][f]; });
  });
  setBusy('aujDenahSemua');
  db.ref(AUJ_NODE).update(upd, err => {   // satu tulisan atomik
    clearBusy('aujDenahSemua');
    if (err) return toast('Gagal: ' + (err.message || err), true, 6000);
    target.forEach(t => { Object.keys(patch[t.key]).forEach(f => { if (patch[t.key][f] == null) delete t[f]; else t[f] = patch[t.key][f]; }); });
    addLog('ubah_administrasi_ujian', `denah ${rec.ruang} diterapkan ke ${target.length} sesi lain`);
    toast(`✅ Denah ${rec.ruang} diterapkan ke ${target.length} sesi lain (${aujLipatRuang(target).length} ruang-sesi).`, false, 5000);
    aujRenderSemua();
  });
}
function aujToggleGabung() {
  const rec = aujRec(); if (!rec) return;
  const grup = aujGrupRuang(rec);
  if (!aujGabung && grup.length < 2) return toast('Tidak ada kelas lain di ruang dan jam yang sama.', true);
  if (aujDraftBeda('denah', rec) && !confirm('Ada perubahan denah yang belum disimpan. Ganti tampilan dan buang perubahan itu?')) return;
  aujGabung = !aujGabung;
  if (aujGabung) {
    aujKursi = aujKursiGabungan(grup);
    const total = grup.reduce((n, r) => n + Object.keys(r.kursi || {}).length, 0), lepas = total - Object.keys(aujKursi).length;
    if (lepas > 0) toast(`ℹ️ ${lepas} siswa berebut kursi yang sama dengan kelas lain dan dilepas dari kursinya (belum disimpan). Klik Susun Selang-seling untuk menata ulang.`, false, 6000);
  } else aujKursi = Object.assign({}, rec.kursi || {});
  aujSel = null; aujRenderTab();
}
// Menata kursi selang-seling: tiap kursi diisi dari kelas dengan sisa siswa terbanyak yang berbeda dari kursi kiri dan depannya.
// Bila tidak ada pilihan: kursi dikosongkan selama kursi masih lebih banyak daripada siswa, kalau tidak terpaksa bersebelahan (ditandai merah).
function aujDenahGabungOtomatis(acak) {
  const rec = aujRec(); if (!rec) return;
  const grup = aujGrupRuang(rec), ps = aujPesertaGabungan(grup), { B, K, P } = aujDimensi(rec), W = K * P;   // W = jumlah kursi per baris (bangku x siswa per bangku)
  if (ps.length > B * W) return toast(`Kursi (${B * W}) kurang dari jumlah peserta (${ps.length}). Tambah baris/kolom dulu.`, true);
  if (Object.keys(aujKursi).length && !confirm('Susunan kursi saat ini akan ditimpa. Lanjutkan?')) return;
  const antre = {};
  grup.forEach(g => {
    const a = ps.filter(p => p.recKey === g.key);
    if (acak) for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    antre[g.key] = a;
  });
  const dari = {}; let sisa = ps.length, spare = B * W - sisa, bentrok = 0;
  aujKursi = {};
  for (let r = 1; r <= B && sisa > 0; r++) for (let w = 1; w <= W && sisa > 0; w++) {
    const kiri = dari[r + '_' + (w - 1)], atas = dari[(r - 1) + '_' + w];
    let pilih = null;
    grup.forEach(g => { const n = antre[g.key].length; if (n && g.key !== kiri && g.key !== atas && (!pilih || n > antre[pilih].length)) pilih = g.key; });
    if (pilih) {   // sisa seri: utamakan kelas di kursi serong kiri-atas (pola diagonal: A B C / C A B / B C A) supaya tidak berbenturan di baris berikutnya
      const diag = dari[(r - 1) + '_' + (w > 1 ? w - 1 : W)];
      if (diag && diag !== kiri && diag !== atas && antre[diag].length === antre[pilih].length) pilih = diag;
    }
    if (!pilih) {
      if (spare > 0) { spare--; continue; }
      grup.forEach(g => { const n = antre[g.key].length; if (n && (!pilih || n > antre[pilih].length)) pilih = g.key; });
      bentrok++;
    }
    const p = antre[pilih].shift();
    aujKursi[aujKunciKursi(r, Math.ceil(w / P), ((w - 1) % P) + 1)] = p.key; dari[r + '_' + w] = pilih; sisa--;
  }
  aujSel = null; aujRenderTab();
  toast(bentrok ? `⚠️ Tersusun, tetapi ${bentrok} kursi terpaksa bersebelahan sama kelas (kelas terlalu timpang atau kursi kurang). Tambah baris/kolom atau tukar manual.` : (P === 2 ? '✅ Tersusun: teman satu bangku dan kursi di sekitarnya diusahakan beda kelas. Periksa lalu klik Simpan Denah Gabungan.' : '✅ Kursi tersusun selang-seling antar kelas. Periksa lalu klik Simpan Denah Gabungan.'), !!bentrok, 5000);
}
function aujSimpanDenahGabung() {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa mengubah administrasi ASAS/ASAT!', true);
  const rec = aujRec(); if (!rec) return;
  const grup = aujGrupRuang(rec); if (grup.length < 2) return toast('Tidak ada kelas lain di ruang dan jam yang sama.', true);
  if (isBusy('aujTulis')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Penyimpanan administrasi ASAS/ASAT butuh koneksi internet — coba lagi setelah online.', true);
  const B = aujInt(aujVal('aujBaris'), 6, 1, 15), K = aujInt(aujVal('aujKolom'), 5, 1, 8), P = aujVal('aujPerBangku') === '2' ? 2 : 1, pintu = aujVal('aujPintu') === 'kiri' ? 'kiri' : 'kanan';
  const lokasi = aujKosongJadiNull(aujVal('aujLokasiDenah')), catatan = aujKosongJadiNull(aujVal('aujLokasiCatatan'));
  const now = new Date().toISOString(), updates = {}, hasil = {};
  grup.forEach(r => {
    const sah = new Set(aujPeserta(r.kelas, r).map(p => p.key)), kursi = {};
    Object.keys(aujKursi).forEach(k => { const m = k.split('_'), s = m[2] === '2' ? 2 : 1; if (+m[0] <= B && +m[1] <= K && s <= P && sah.has(aujKursi[k])) kursi[k] = aujKursi[k]; });
    const d = { lokasiDenah: lokasi, lokasiCatatan: catatan, denahBaris: B, denahKolom: K, denahPerBangku: P === 2 ? 2 : null, denahPintu: pintu, kursi: Object.keys(kursi).length ? kursi : null, updatedBy: currentUser.name, updatedAt: now };
    hasil[r.key] = d;
    Object.keys(d).forEach(f => { updates[r.key + '/' + f] = d[f]; });
  });
  setBusy('aujTulis');
  db.ref(AUJ_NODE).update(updates, err => {
    clearBusy('aujTulis');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    grup.forEach(r => Object.keys(hasil[r.key]).forEach(f => { if (hasil[r.key][f] === null) delete r[f]; else r[f] = hasil[r.key][f]; }));
    aujKursi = aujKursiGabungan(grup); aujSel = null; aujDenahAsli = aujFotoDenah(rec);
    toast('✅ Denah gabungan tersimpan untuk ' + grup.length + ' kelas!'); addLog('simpan_denah_ujian', aujLogDetail(rec.nama, grup.map(r => r.kelas).join(' + '), rec.ruang));
    aujRenderSemua();
  });
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
      <button class="btn btn-soft" onclick="aujCetakSatu('ba0')" title="Berita acara dengan angka dan catatan dikosongkan, untuk diisi tangan pengawas">📝 Berita Acara Kosongan</button>
      <button class="btn btn-soft" onclick="aujCetakSatu('sampul')" title="Sampul amplop naskah soal dan lembar jawaban untuk ruang/sesi ini">✉️ Sampul Amplop</button>
      <button class="btn btn-soft" onclick="aujCetakKosonganHari()" title="Daftar Hadir + Berita Acara kosong untuk semua ruang pada tanggal sesi ini">📚 Kosongan Semua Ruang (tanggal ini)</button>
    </div>
    ${aujBarKosongan(rec)}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px;">
      <strong>Rekap otomatis dari Daftar Hadir:</strong> peserta seharusnya <strong>${rk.total}</strong> · hadir <strong>${rk.h}</strong> · tidak hadir <strong>${rk.s + rk.i + rk.a}</strong> (sakit ${rk.s}, izin ${rk.i}, alpa ${rk.a})${rk.belum ? ` · <span style="color:#b45309;">${rk.belum} belum diisi statusnya</span>` : ''}
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      ${ed ? `<div style="grid-column:1/-1;"><label class="label">Pelaksanaan</label><select id="aujBaWaktuPilih" class="field" onchange="aujBaWaktuPilih(this.value)"><option value="">-- Pilih (mengisi jam aktual di bawah) --</option><option value="0">Tepat waktu sesuai jadwal</option><option value="5">Mulai terlambat 5 menit</option><option value="10">Mulai terlambat 10 menit</option><option value="15">Mulai terlambat 15 menit</option><option value="30">Mulai terlambat 30 menit</option></select></div>` : ''}
      ${f('aujBaMulai', 'ASAS/ASAT Dimulai Pukul (aktual)', rec.baMulai || rec.jamMulai, 'time')}
      ${f('aujBaSelesai', 'ASAS/ASAT Selesai Pukul (aktual)', rec.baSelesai || rec.jamSelesai, 'time')}
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      ${f('aujBaNaskah', 'Jumlah Naskah Soal Diterima', rec.baNaskah, 'number', 'min="0" step="1" inputmode="numeric"')}
      ${f('aujBaLjk', 'Jumlah Lembar Jawaban Dikumpulkan', rec.baLjk, 'number', 'min="0" step="1" inputmode="numeric"')}
    </div>
    <div style="margin-bottom:12px;"><label class="label">Catatan Selama Pelaksanaan ASAS/ASAT</label>
      ${ed ? `<select id="aujBaPreset" class="field" style="margin-bottom:4px;" onchange="aujBaCatatanPilih(this.value)"><option value="">-- Tambah catatan siap pakai --</option>${AUJ_CATATAN_BA.map((t, i) => `<option value="${i}">${escapeHtml(t)}</option>`).join('')}</select>` : ''}
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
// Nomor peserta (p.nomor, lihat AUJ_FORMAT_NOMOR) SAMA dengan yang tampil di Daftar Hadir, Denah, dan Label Meja; p.no = urut abjad dalam kelas.
// Kursi diambil dari denah TERSIMPAN (rec.kursi: { 'baris_kolom': siswaKey }). Baris 1 = terdepan
// (dekat meja pengawas / papan tulis), sesuai gambar denah.
// UKURAN KARTU untuk eblek dengan ukuran DALAM 11 x 8 cm: kartu jadi 105 x 77 mm, mendatar. Gunting mengikuti garis putus-putus.
// Kertas F4 MENDATAR (330 x 215 mm): 3 kolom x 2 baris = 6 kartu per halaman.
// Isi kartu dirancang pada lebar 85 mm lalu diperbesar ke 105 mm saat PDF dibuat (huruf, foto, dan QR ikut membesar).
// Ganti eblek: ubah AUJ_KARTU_CETAK_W / AUJ_KARTU_CETAK_H (pastikan 3 x 2 kartu masih muat di 330 x 215 mm).
const AUJ_KARTU_CETAK_W = 105, AUJ_KARTU_CETAK_H = 77;
const AUJ_KARTU_SKALA = AUJ_KARTU_CETAK_W / 85;
const AUJ_KARTU_W = 85, AUJ_KARTU_H = AUJ_KARTU_CETAK_H / AUJ_KARTU_SKALA, AUJ_KARTU_JARAK_X = 2 / AUJ_KARTU_SKALA, AUJ_KARTU_JARAK_Y = 4 / AUJ_KARTU_SKALA;
const AUJ_KARTU_KOLOM = 3, AUJ_KARTU_BARIS = 2;
const AUJ_KARTU_PER_HALAMAN = AUJ_KARTU_KOLOM * AUJ_KARTU_BARIS;
const AUJ_KARTU_LEBAR_ISI = AUJ_KARTU_KOLOM * AUJ_KARTU_W + (AUJ_KARTU_KOLOM - 1) * AUJ_KARTU_JARAK_X;   // lebar satu halaman sebelum diperbesar
// Tata letak halaman PDF (mm). lebarIsi = lebar rancangan, lebar = lebar di kertas.
const AUJ_PDF_KARTU = { format: [330, 215], arah: 'landscape', x: (330 - AUJ_KARTU_LEBAR_ISI * AUJ_KARTU_SKALA) / 2, y: 10, lebar: AUJ_KARTU_LEBAR_ISI * AUJ_KARTU_SKALA, lebarIsi: AUJ_KARTU_LEBAR_ISI };
const AUJ_PDF_LABEL = { format: [215, 330], arah: 'portrait', x: 10, y: 10, lebar: 195, lebarIsi: 195 };
// Aturan kartu (dipakai di pratinjau layar DAN di jendela cetak). Semua kelas berawalan kp- agar tidak bentrok.
const AUJ_KARTU_CSS = `
  .kp-halaman { display: grid; grid-template-columns: repeat(${AUJ_KARTU_KOLOM}, ${AUJ_KARTU_W}mm); grid-auto-rows: ${AUJ_KARTU_H}mm; gap: ${AUJ_KARTU_JARAK_Y}mm ${AUJ_KARTU_JARAK_X}mm; justify-content: center; align-content: start; page-break-after: always; break-after: page; }
  .kp-halaman:last-child { page-break-after: auto; break-after: auto; }
  .kp-kartu { box-sizing: border-box; width: ${AUJ_KARTU_W}mm; height: ${AUJ_KARTU_H}mm; border: 0.3mm dashed #555; padding: 0.8mm; display: flex; flex-direction: column; overflow: hidden; break-inside: avoid; page-break-inside: avoid; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; text-align: left; }
  .kp-bingkai { box-sizing: border-box; flex: 1; min-height: 0; display: flex; flex-direction: column; border: 1mm double #0f5c66; border-radius: 1.5mm; padding: 0.6mm 1.4mm; overflow: hidden; }   /* bingkai kartu; garis putus-putus di luarnya = garis gunting */
  .kp-kepala { box-sizing: border-box; display: flex; align-items: center; gap: 2mm; border-bottom: 0.4mm solid #000; padding-bottom: 0.8mm; height: 11mm; flex: none; }
  .kp-logo { width: 7.5mm; height: 7.5mm; object-fit: contain; flex: none; }
  .kp-judul { min-width: 0; flex: 1; }
  .kp-madrasah { font-size: 8.9pt; font-weight: 700; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kp-jenis { font-size: 7.2pt; font-weight: 700; letter-spacing: 0.3pt; line-height: 1.15; }
  .kp-ujian { font-size: 6.3pt; font-weight: 600; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kp-isi { display: flex; gap: 2mm; flex: 1; padding-top: 1.2mm; min-height: 0; }
  .kp-data { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .kp-data table { border-collapse: collapse; width: 100%; }
  .kp-data td { font-size: 8.4pt; line-height: 1.2; padding: 0.25mm 0; vertical-align: top; border: none; }
  .kp-data td:first-child { width: 19.5mm; white-space: nowrap; }
  .kp-data td:nth-child(2) { width: 1.8mm; }
  .kp-no { font-size: 11pt; font-weight: 700; line-height: 1.1; }
  .kp-data td.kp-no { font-size: 12pt; line-height: 1.1; }
  .kp-nama { font-weight: 700; text-transform: uppercase; }
  .kp-data td.kp-nama-panjang { font-size: 7.2pt; line-height: 1.1; }   /* nama > 28 karakter: sedikit lebih kecil supaya tidak makan 4 baris */
  .kp-kanan { width: 23mm; flex: none; display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .kp-foto { box-sizing: border-box; width: 22mm; height: 28mm; border: 0.4mm solid #0f5c66; padding: 0.7mm; background: #fff; font-size: 5.5pt; color: #666; display: flex; align-items: center; justify-content: center; text-align: center; line-height: 1.2; flex: none; }
  .kp-foto img { outline: 0.15mm solid #94a3b8; }   /* bingkai sederhana: garis tebal hijau-tosca di luar, pinggir putih tipis, garis abu halus di sekeliling foto */
  .kp-ttd { display: flex; align-items: center; gap: 1.5mm; margin-top: auto; padding-top: 0.5mm; flex: none; font-size: 6.2pt; line-height: 1.2; }   /* menempel di dasar kolom data, di atas catatan */
  .kp-ttd-ruang { width: 10mm; height: 10mm; flex: none; display: flex; align-items: center; justify-content: center; }
  .kp-ttd-teks { min-width: 0; }
  .kp-ttd b { display: table; border-bottom: 0.2mm solid #000; padding-bottom: 0.4mm; }
  .kp-catatan { margin-top: auto; border-top: 0.2mm solid #999; padding-top: 0.8mm; font-size: 6.4pt; line-height: 1.2; text-align: center; color: #333; flex: none; }
`;
const AUJ_KARTU_CSS_CETAK = `
  @page { size: 330mm 215mm; margin: 5mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
` + AUJ_KARTU_CSS;

// { siswaKey: 'Baris 2 / Kolom 3' } dari denah tersimpan; siswa tanpa kursi tidak ada di peta.
function aujPetaKursi(rec) {
  const peta = {};
  Object.keys(rec.kursi || {}).forEach(k => {
    const m = /^(\d+)_(\d+)(_2)?$/.exec(k); if (!m) return;
    peta[rec.kursi[k]] = `Baris ${m[1]} / Kolom ${m[2]}` + (rec.denahPerBangku === 2 ? (m[3] ? ' (kanan)' : ' (kiri)') : '');
  });
  return peta;
}
// qr: 'cetak' = tempat QR Kepala (diisi skrip di jendela cetak), 'pratinjau' = kotak penanda di layar, selain itu kosong.
// ---------- Foto siswa untuk kartu ----------
// Disimpan TERPISAH di node `siswa_foto/{kunciSiswa}` = { base64, updatedBy, updatedAt } (bukan di node `siswa`, supaya data siswa yang
// dimuat tiap membuka aplikasi tetap ringan; pola yang sama dengan foto check-in). Foto dipotong 4:5 dan dikecilkan (240x300 px, JPEG).
// Diunggah Admin dari tab Kartu Peserta (bagian "Foto Siswa"). Butuh Rules node siswa_foto (lihat catatan di bawah fungsi aujFotoUnggah).
let aujFotoCache = {}, aujFotoMuatSedang = false, aujFotoBuka = false;
function aujFotoSiswa(key) { return aujFotoCache[key] || ''; }
function aujFotoMuat(ps) {
  if (!db || !isReallyOnline() || aujFotoMuatSedang) return;
  const perlu = ps.filter(p => !(p.key in aujFotoCache)); if (!perlu.length) return;
  aujFotoMuatSedang = true;
  Promise.all(perlu.map(p => db.ref('siswa_foto/' + p.key).once('value').then(sn => {
    const v = sn.val(), b64 = (v && typeof v.base64 === 'string' && /^data:image\//.test(v.base64)) ? v.base64 : '';
    if (!b64) { aujFotoCache[p.key] = ''; return; }
    return aujFotoPangkas(b64).then(x => { aujFotoCache[p.key] = x; });
  }).catch(() => { aujFotoCache[p.key] = ''; }))).then(() => { aujFotoMuatSedang = false; if (aujTabAktif === 'kartu' || aujTabAktif === 'siap') aujRenderTab(); });
}
// Foto dari studio/aplikasi pas foto sering punya bingkai putih tipis di tepinya, sehingga di kotak foto kartu tampak ada strip putih.
// Tepi yang hampir putih (>= 90% piksel di baris/kolom itu) dipangkas, hanya bila lebarnya < 12% dan disusul area berwarna.
// Foto berlatar putih utuh TIDAK dipangkas (tidak ada batas berwarna dalam 12% dari tepi).
function aujFotoHitungPangkas(im) {
  const nw = im.naturalWidth, nh = im.naturalHeight, tanpa = { sx: 0, sy: 0, sw: nw, sh: nh, ubah: false };
  if (!nw || !nh) return tanpa;
  const sk = Math.min(1, 300 / Math.max(nw, nh)), w = Math.max(1, Math.round(nw * sk)), h = Math.max(1, Math.round(nh * sk));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d'); cx.drawImage(im, 0, 0, w, h);
  let d; try { d = cx.getImageData(0, 0, w, h).data; } catch (e) { return tanpa; }
  const putih = (x, y) => { const i = (y * w + x) * 4; return d[i] >= 225 && d[i + 1] >= 225 && d[i + 2] >= 225; };
  const kol = x => { let n = 0; for (let y = 0; y < h; y++) if (putih(x, y)) n++; return n / h >= 0.9; };
  const bar = y => { let n = 0; for (let x = 0; x < w; x++) if (putih(x, y)) n++; return n / w >= 0.9; };
  const cari = (jml, cek) => { const batas = Math.floor(jml * 0.12); let n = 0; while (n < batas && cek(n)) n++; return (n > 0 && n < batas) ? n + 1 : 0; };   // +1: buang piksel tepi yang tercampur warna
  const l = cari(w, n => kol(n)), r = cari(w, n => kol(w - 1 - n)), t = cari(h, n => bar(n)), b = cari(h, n => bar(h - 1 - n));
  const fx = nw / w, fy = nh / h;
  return { sx: Math.round(l * fx), sy: Math.round(t * fy), sw: Math.round(nw - (l + r) * fx), sh: Math.round(nh - (t + b) * fy), ubah: !!(l || r || t || b) };
}
function aujFotoGambarKeData(im, mutu, pangkas) {
  const W = 240, H = 300, p = pangkas || aujFotoHitungPangkas(im), c = document.createElement('canvas'); c.width = W; c.height = H;
  const r = Math.max(W / p.sw, H / p.sh), dw = p.sw * r, dh = p.sh * r, cx = c.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H);
  cx.drawImage(im, p.sx, p.sy, p.sw, p.sh, (W - dw) / 2, (H - dh) / 4, dw, dh);   // potong rata tengah; sedikit condong ke atas supaya wajah tidak terpotong
  return c.toDataURL('image/jpeg', mutu || 0.82);
}
// Foto yang SUDAH tersimpan (dengan bingkai putih) dipangkas saat dimuat, jadi tidak perlu diunggah ulang.
function aujFotoPangkas(src) {
  return new Promise(ok => {
    const im = new Image();
    im.onload = () => { try { const p = aujFotoHitungPangkas(im); ok(p.ubah ? aujFotoGambarKeData(im, 0.88, p) : src); } catch (e) { ok(src); } };
    im.onerror = () => ok(src);
    im.src = src;
  });
}
function aujFotoOlah(file) {
  return new Promise((ok, gagal) => {
    const fr = new FileReader();
    fr.onerror = () => gagal(new Error('Gagal membaca file.'));
    fr.onload = e => {
      const im = new Image();
      im.onerror = () => gagal(new Error('Gagal membaca gambar.'));
      im.onload = () => {
        try {
          ok(aujFotoGambarKeData(im, 0.82));
        } catch (err) { gagal(err); }
      };
      im.src = e.target.result;
    };
    fr.readAsDataURL(file);
  });
}
function aujFotoUnggah(key, input) {
  const f = input.files && input.files[0]; input.value = '';
  if (!f) return;
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa mengunggah foto siswa!', true);
  if (!/^image\//.test(f.type)) return toast('File harus berupa gambar (JPG/PNG).', true);
  if (f.size > 10 * 1024 * 1024) return toast('Ukuran foto maksimal 10 MB.', true);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Unggah foto butuh koneksi internet.', true);
  if (isBusy('aujFoto')) return toast('Sedang menyimpan foto...', false, 1500);
  const s = (allSiswa || []).find(x => x.key === key);
  setBusy('aujFoto'); toast('⏳ Memproses foto…', false, 1500);
  aujFotoOlah(f).then(b64 => {
    const tulis = () => db.ref('siswa_foto/' + key).set({ base64: b64, updatedBy: currentUser.name || '', updatedAt: new Date().toISOString() }, err => {
      clearBusy('aujFoto');
      if (err) return toast('Gagal menyimpan foto: ' + (err.message || err) + ' (periksa Rules node siswa_foto).', true, 7000);
      aujFotoCache[key] = b64; aujFotoBuka = true;
      toast('✅ Foto tersimpan.'); addLog('upload_foto_siswa', s ? s.name + ' - ' + s.kelas : key);
      aujRenderTab();
    });
    if (typeof tulisAdmin === 'function') tulisAdmin(null, null, tulis, () => clearBusy('aujFoto')); else tulis();
  }).catch(e => { clearBusy('aujFoto'); toast('Gagal: ' + (e && e.message ? e.message : e), true); });
}
function aujFotoHapus(key) {
  if (!aujCanEdit()) return;
  const s = (allSiswa || []).find(x => x.key === key);
  if (!confirm('Hapus foto ' + (s ? s.name : 'siswa ini') + '?')) return;
  if (!isReallyOnline()) return toast('📡 Sedang offline.', true);
  const hapus = () => db.ref('siswa_foto/' + key).remove(err => {
    if (err) return toast('Gagal: ' + (err.message || err), true);
    aujFotoCache[key] = ''; aujFotoBuka = true; toast('Foto dihapus.'); addLog('hapus_foto_siswa', s ? s.name + ' - ' + s.kelas : key); aujRenderTab();
  });
  if (typeof tulisAdmin === 'function') tulisAdmin(null, null, hapus); else hapus();
}
function aujHtmlFotoSiswa(ps) {
  const ed = aujCanEdit(), ada = ps.filter(p => aujFotoSiswa(p.key)).length;
  const baris = ps.map(p => {
    const f = aujFotoSiswa(p.key);
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid #f1f5f9;">
      <div style="width:32px;height:40px;flex:none;border:1px solid #cbd5e1;border-radius:3px;overflow:hidden;background:#f8fafc;font-size:9px;color:#94a3b8;display:flex;align-items:center;justify-content:center;">${f ? `<img src="${escapeHtml(f)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : '—'}</div>
      <div style="flex:1;min-width:0;font-size:13px;">${p.nomor}. ${escapeHtml(p.nama)}</div>
      ${ed ? `<label class="btn btn-soft" style="font-size:11px;padding:3px 8px;cursor:pointer;margin:0;">${f ? '🔄 Ganti' : '📷 Pilih'}<input type="file" accept="image/*" style="display:none;" onchange="aujFotoUnggah('${escapeJs(p.key)}', this)"></label>${f ? `<button class="btn btn-soft" style="font-size:11px;padding:3px 8px;" onclick="aujFotoHapus('${escapeJs(p.key)}')">🗑️</button>` : ''}` : ''}
    </div>`;
  }).join('');
  return `<details ${aujFotoBuka ? 'open' : ''} ontoggle="aujFotoBuka=this.open" style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;margin-bottom:10px;">
    <summary style="cursor:pointer;font-size:13px;font-weight:600;">📷 Foto Siswa — ${ada} dari ${ps.length} sudah ada${aujFotoMuatSedang ? ' (memuat…)' : ''}</summary>
    <p style="font-size:12px;color:#6b7280;margin:6px 0;">${ed ? 'Pilih foto per siswa (di HP bisa langsung memotret). Foto otomatis dipotong rasio 4:5 dan dikecilkan, lalu tercetak di kotak pas foto kartu. Siswa tanpa foto tetap tercetak dengan kotak kosong.' : 'Foto diunggah oleh Admin.'}</p>${baris}
  </details>`;
}
// Rules Firebase (tambahkan, samakan syarat tulis/baca dengan node `siswa`):
//   "siswa_foto": { "$siswaKey": { ".read": <sama dengan baca siswa>, ".write": <hanya Admin>,
//                   ".validate": "newData.child('base64').isString() && newData.child('base64').val().length < 60000" } }
// Rentang tanggal pelaksanaan di kartu: dari SEMUA sesi kelas itu pada asesmen yang sama (bukan hanya sesi yang sedang dibuka).
function aujKartuPelaksanaan(rec) {
  const tgl = allAdmUjian.filter(r => r.nama === rec.nama && r.kelas === rec.kelas).concat(rec)
    .map(r => String(r.tanggal || '')).filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t)).sort();
  if (!tgl.length) return '-';
  const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const [y1, m1, d1] = tgl[0].split('-').map(Number), [y2, m2, d2] = tgl[tgl.length - 1].split('-').map(Number);
  const akhir = `${d2} ${bln[m2 - 1]} ${y2}`;
  if (tgl[0] === tgl[tgl.length - 1]) return akhir;
  if (y1 !== y2) return `${d1} ${bln[m1 - 1]} ${y1} \u2013 ${akhir}`;
  return (m1 !== m2 ? `${d1} ${bln[m1 - 1]}` : String(d1)) + ` \u2013 ${akhir}`;
}
function aujKartuHtml(rec, p, kursiTeks, qr) {
  const logo = new URL('logo/logo-lembaga.png', location.href).href;
  const baris = (label, isi, kls) => `<tr><td>${label}</td><td>:</td><td${kls ? ` class="${kls}"` : ''}>${isi}</td></tr>`;
  return `<div class="kp-kartu"><div class="kp-bingkai">
    <div class="kp-kepala">
      <img class="kp-logo" src="${escapeHtml(logo)}" alt="" onerror="this.style.display='none'">
      <div class="kp-judul">
        <div class="kp-madrasah">${escapeHtml(MADRASAH.nama || '')}</div>
        <div class="kp-jenis">KARTU PESERTA</div>
        <div class="kp-ujian">${escapeHtml(aujJudulAsesmen(rec.nama))} &middot; TA ${escapeHtml(currentTahunAjaran || '')}</div>
      </div>
    </div>
    <div class="kp-isi">
      <div class="kp-data"><table>
        ${baris('No. Peserta', escapeHtml(String(p.nomor)), 'kp-no')}
        ${baris('Nama', escapeHtml(p.nama), p.nama.length > 28 ? 'kp-nama kp-nama-panjang' : 'kp-nama')}
        ${baris('Kelas / Ruang', escapeHtml(p.kelas || '-') + ' / ' + escapeHtml(rec.ruang || '-'))}
        ${baris('Kursi', escapeHtml(kursiTeks || '-'))}
        ${baris('Pelaksanaan', escapeHtml(aujKartuPelaksanaan(rec)))}
      </table>
        <div class="kp-ttd">
          <div class="kp-ttd-ruang">${qr === 'cetak' ? '<span class="kp-qr-tujuan"></span>' : (qr === 'pratinjau' ? '<span style="display:inline-block;width:10mm;height:10mm;border:0.3mm dashed #999;font-size:5pt;line-height:10mm;color:#999;text-align:center;">QR</span>' : '')}</div>
          <div class="kp-ttd-teks">Kepala Madrasah,<b>${escapeHtml(MADRASAH.kepala_sekolah || '(........................)')}</b></div>
        </div>
      </div>
      <div class="kp-kanan">
        <div class="kp-foto">${aujFotoSiswa(p.key) ? `<img src="${escapeHtml(aujFotoSiswa(p.key))}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">` : 'Pas foto'}</div>
      </div>
    </div>
    <div class="kp-catatan">Kartu wajib dibawa setiap hari ASAS/ASAT. Hadir 15 menit sebelum ujian dimulai.</div>
  </div></div>`;
}
function aujHtmlKartu(rec) {
  const ps = aujPeserta(rec.kelas, rec), peta = aujPetaKursi(rec);
  aujFotoMuat(ps);   // foto dimuat di latar belakang, tampilan digambar ulang bila selesai
  const tanpaKursi = ps.filter(p => !peta[p.key]).length;
  const halaman = Math.ceil(ps.length / AUJ_KARTU_PER_HALAMAN);
  const judul = `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">🎫 Kartu Peserta \u2014 ${escapeHtml(rec.kelas || '')} \u00b7 ${escapeHtml(rec.ruang || '')}</h4>
      <button class="btn btn-primary" onclick="aujCetakKartu()" ${ps.length ? '' : 'disabled'}>📄 Unduh PDF Kartu (F4)</button>
      <button class="btn btn-soft" onclick="aujCetakKartuGabungan()" title="Kartu semua kelas pada asesmen ini dalam satu file PDF; kelas disambung tanpa ganti halaman">📄 Unduh PDF Semua Kelas</button>
    </div>`;
  if (!ps.length) return judul + `<p style="font-size:13px;color:#dc2626;">Belum ada siswa di ${escapeHtml(rec.kelas || 'kelas ini')} pada Data Siswa${aujCanEdit() ? '' : ' (atau bukan kelas yang Anda ampu)'}.</p>`;
  const contoh = ps.slice(0, 2).map(p => aujKartuHtml(rec, p, peta[p.key], aujKartuPakaiQr() ? 'pratinjau' : '')).join('');
  return judul + `
    <p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Kertas <strong>F4 mendatar (330 \u00d7 215 mm)</strong>, ${AUJ_KARTU_PER_HALAMAN} kartu per halaman (${AUJ_KARTU_KOLOM} kolom \u00d7 ${AUJ_KARTU_BARIS} baris). Ukuran tiap kartu <strong>${AUJ_KARTU_CETAK_W} \u00d7 ${AUJ_KARTU_CETAK_H} mm</strong>, untuk eblek / card case berukuran dalam 11 \u00d7 8 cm. Gunting mengikuti garis putus-putus. Nomor peserta sama dengan nomor urut di Daftar Hadir dan Denah. Kursi mengikuti denah yang sudah disimpan. Kartu dicetak terpisah dan tidak ikut "Cetak Semua Berkas". Untuk semua kelas sekaligus pakai tombol "Unduh PDF Semua Kelas".</p>
    <p style="font-size:13px;font-weight:600;margin-bottom:6px;">Akan tercetak ${ps.length} kartu = ${halaman} halaman F4.</p>
    ${tanpaKursi ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;padding:6px 10px;border-radius:6px;margin-bottom:8px;">\u26A0\uFE0F ${tanpaKursi} dari ${ps.length} peserta belum punya kursi di denah \u2014 kolom Kursi tertulis "-". Atur di tab Denah lalu simpan.</p>` : ''}
    ${aujHtmlFotoSiswa(ps)}
    ${aujHtmlKartuPengganti(ps)}
    <p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Pratinjau (2 kartu pertama):</p>
    <style>${AUJ_KARTU_CSS}</style>
    <div style="display:flex;flex-wrap:wrap;gap:10px;overflow-x:auto;">${contoh}</div>
    <p style="font-size:11px;color:#6b7280;margin-top:8px;">Tombol di atas langsung mengunduh file PDF berukuran F4 (butuh internet untuk memuat pembuat PDF). Saat mencetak file itu, pilih kertas F4 / Folio (kartu: mendatar; label meja: tegak) dan skala 100% (ukuran asli).</p>`;
}
// QR pengesahan Kepala di kartu: hanya bila ttd-digital.js termuat dan yang mencetak Admin/Kepsek (sama dengan dokumen lain).
function aujKartuPakaiQr() { return !!(window.TTD && TTD.penanda && aujBolehTtdKepala()); }
// Foto dimuat di latar belakang. Bila belum lengkap saat tombol unduh ditekan: tunggu, lalu lanjutkan otomatis (maksimal AUJ_FOTO_BATAS).
// Mengembalikan true bila PDF boleh langsung dibuat sekarang.
const AUJ_FOTO_BATAS = 30000;
let aujFotoMenunggu = false, aujFotoLewati = false;
function aujFotoSiap(ps, lanjut) {
  const belum = () => ps.filter(p => !(p.key in aujFotoCache)).length;
  if (aujFotoLewati || !belum()) return true;
  if (!db || !isReallyOnline()) { toast('📡 Sedang offline: foto yang belum dimuat tidak ikut di PDF.', true, 5000); return true; }
  if (aujFotoMenunggu) { toast('Foto masih dimuat, mohon tunggu...', false, 2000); return false; }
  aujFotoMenunggu = true;
  const sesi = aujAktifKey, mulai = Date.now();
  toast(`⏳ Memuat ${belum()} foto siswa, PDF dibuat otomatis setelah selesai…`, false, 5000);
  const cek = () => {
    if (aujAktifKey !== sesi) { aujFotoMenunggu = false; return toast('Sesi berganti, unduhan kartu dibatalkan.', true); }
    const sisa = belum();
    if (sisa && Date.now() - mulai < AUJ_FOTO_BATAS) { aujFotoMuat(ps); return setTimeout(cek, 300); }   // aujFotoMuat diabaikan selama pemuatan lain masih berjalan
    aujFotoMenunggu = false;
    if (sisa && !confirm(sisa + ' foto belum selesai dimuat (koneksi lambat).\n\nOK = buat PDF sekarang tanpa foto tersebut.\nBatal = jangan buat PDF, coba lagi nanti.')) return;
    aujFotoLewati = true;
    try { lanjut(); } finally { aujFotoLewati = false; }
  };
  aujFotoMuat(ps); setTimeout(cek, 300);
  return false;
}
function aujCetakKartu() {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  const ps = aujPeserta(rec.kelas, rec);
  if (!ps.length) return toast('Belum ada siswa di kelas ini.', true);
  if (aujCanEdit() && JSON.stringify(aujKursi) !== JSON.stringify(rec.kursi || {})) toast('\u26A0\uFE0F Ada perubahan denah yang belum disimpan \u2014 kursi pada kartu mengikuti denah tersimpan.', false, 4500);
  if (!aujFotoSiap(ps, aujCetakKartu)) return;
  const pakaiQr = aujKartuPakaiQr(), peta = aujPetaKursi(rec), kartu = ps.map(p => aujKartuHtml(rec, p, peta[p.key], pakaiQr ? 'cetak' : ''));
  let isi = '';
  for (let i = 0; i < kartu.length; i += AUJ_KARTU_PER_HALAMAN) isi += `<div class="kp-halaman">${kartu.slice(i, i + AUJ_KARTU_PER_HALAMAN).join('')}</div>`;
  if (pakaiQr) {   // satu QR pengesahan Kepala untuk seluruh kartu (satu catatan verifikasi), disalin ke tiap kartu oleh skrip kecil di jendela cetak
    const meta = { jenis: 'Kartu Peserta ' + (rec.nama || 'ASAS/ASAT'), ket: [rec.nama, rec.kelas, rec.ruang, 'TA ' + currentTahunAjaran].filter(Boolean).join(' | ') };
    isi += `<div id="kpQrSumber" style="display:none">${TTD.penanda('kepala', meta, { mm: 10, hanyaPimpinan: true })}</div><script>(function(){var s=document.getElementById('kpQrSumber');if(!s)return;var h=s.innerHTML;Array.prototype.forEach.call(document.querySelectorAll('.kp-qr-tujuan'),function(e){e.innerHTML=h;});})();<\/script>`;
  }
  aujUnduhKartuPdf(isi, `Kartu Peserta ASAS/ASAT - ${rec.kelas || ''} ${rec.ruang || ''}`);
}

// ---------- Unduh kartu langsung sebagai PDF (tanpa popup dan tanpa dialog cetak) ----------
// Tiap .kp-halaman digambar di bingkai tersembunyi lalu dimasukkan ke satu halaman F4. Pustaka dimuat dari CDN saat pertama dipakai.
const AUJ_PDF_PUSTAKA = [
  ['html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'],
  ['jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js']
];
let aujPdfSedang = false;
function aujBatasWaktu(janji, ms, pesan) {
  return new Promise((ok, gagal) => {
    const t = setTimeout(() => gagal(new Error(pesan)), ms);
    Promise.resolve(janji).then(x => { clearTimeout(t); ok(x); }, e => { clearTimeout(t); gagal(e); });
  });
}
function aujMuatPustaka(nama, url) {
  if (window[nama]) return Promise.resolve();
  return aujBatasWaktu(new Promise((ok, gagal) => {
    const s = document.createElement('script'); s.src = url;
    s.onload = () => ok();
    s.onerror = () => { s.remove(); gagal(new Error('Pembuat PDF tidak bisa dimuat. Periksa koneksi internet.')); };
    document.head.appendChild(s);
  }), 20000, 'Pembuat PDF terlalu lama dimuat. Periksa koneksi internet.');
}
async function aujUnduhKartuPdf(bodyHtml, judul, css, tata) {
  tata = tata || AUJ_PDF_KARTU;
  if (aujPdfSedang) return toast('PDF masih dibuat, mohon tunggu...', false, 2000);
  aujPdfSedang = true;
  let bingkai = null;
  try {
    toast('⏳ Menyiapkan PDF…', false, 3000);
    await Promise.all(AUJ_PDF_PUSTAKA.map(p => aujMuatPustaka(p[0], p[1])));
    let html = aujSusunTeks(bodyHtml);
    const nama = aujSusunTeks(judul).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() + '.pdf';
    if (/\[\[TTD:/.test(html)) {
      try {
        if (!(window.TTD && TTD.isiHtml)) throw new Error('TTD tidak tersedia');
        html = await aujBatasWaktu(TTD.isiHtml(html), 15000, 'QR terlalu lama');
      } catch (e) {
        console.warn('QR kartu gagal:', e);
        html = html.replace(/\[\[TTD:[^\]]*\]\]/g, '');
        toast('⚠️ QR Kepala gagal dibuat, PDF dibuat tanpa QR.', true, 7000);
      }
    }
    bingkai = document.createElement('iframe');
    bingkai.setAttribute('aria-hidden', 'true');
    bingkai.style.cssText = 'position:fixed;left:-10000px;top:0;width:330mm;height:330mm;border:0;';
    document.body.appendChild(bingkai);
    const d = bingkai.contentDocument;
    d.open();
    d.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><style>${css || AUJ_KARTU_CSS_CETAK} body { width: ${tata.lebarIsi}mm; background: #fff; }</style></head><body>${html}</body></html>`);
    d.close();
    // Foto dijadikan latar (cover) karena pembuat PDF tidak mengenal object-fit.
    d.querySelectorAll('.kp-foto img').forEach(im => {
      const k = d.createElement('div');
      k.style.cssText = 'width:100%;height:100%;background:center/cover no-repeat;';
      k.style.backgroundImage = 'url("' + im.getAttribute('src') + '")';
      im.replaceWith(k);
    });
    // Tunggu logo/QR selesai dimuat (maksimal 8 detik per gambar).
    await Promise.all(Array.from(d.images).map(im => im.complete ? null : aujBatasWaktu(new Promise(ok => { im.onload = im.onerror = ok; }), 8000, '').catch(() => {})));
    const halaman = Array.from(d.querySelectorAll('.kp-halaman'));
    const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: tata.format, orientation: tata.arah, compress: true });
    for (let i = 0; i < halaman.length; i++) {
      if (halaman.length > 1) toast(`⏳ Membuat PDF: halaman ${i + 1} dari ${halaman.length}…`, false, 2000);
      const el = halaman[i], kotak = el.getBoundingClientRect();
      const kanvas = await window.html2canvas(el, { scale: 3 * tata.lebar / tata.lebarIsi, backgroundColor: '#ffffff', useCORS: true, logging: false });
      if (i) pdf.addPage(tata.format, tata.arah);
      pdf.addImage(kanvas.toDataURL('image/jpeg', 0.92), 'JPEG', tata.x, tata.y, tata.lebar, tata.lebar * kotak.height / kotak.width);
      kanvas.width = kanvas.height = 0;   // lepaskan memori (penting di HP)
    }
    pdf.save(nama);
    toast('✅ PDF diunduh: ' + nama, false, 5000);
  } catch (e) {
    console.error(e);
    toast('Gagal membuat PDF: ' + (e && e.message ? e.message : e), true, 7000);
  } finally {
    if (bingkai) bingkai.remove();
    aujPdfSedang = false;
  }
}

// Nama resmi asesmen untuk judul dokumen cetak. ASAS = Asesmen Sumatif Akhir Semester, dipakai pada semester Gasal (Ganjil);
// ASAT = Asesmen Sumatif Akhir Tahun, hanya berlaku pada semester Genap. Data tersimpan (rec.nama, mis. "ASAS Ganjil") tidak diubah.
function aujJudulAsesmen(nama) {
  const n = String(nama || '').trim(), sem = String(typeof currentSemesterAktif !== 'undefined' ? currentSemesterAktif || '' : '');
  const genapAktif = /genap/i.test(sem) || /^\s*2\s*$/.test(sem);
  if (/ASAT/i.test(n)) return 'ASAT (Asesmen Sumatif Akhir Tahun) Genap';
  if (/ASAS/i.test(n)) return 'ASAS (Asesmen Sumatif Akhir Semester) ' + ((/genap/i.test(n) || (!/ganjil|gasal/i.test(n) && genapAktif)) ? 'Genap' : 'Gasal');
  if (n) return n;   // nama lain (mis. "Ujian Madrasah") dipakai apa adanya
  return genapAktif ? 'ASAT (Asesmen Sumatif Akhir Tahun) Genap' : 'ASAS (Asesmen Sumatif Akhir Semester) Gasal';
}
function aujKodeAsesmen(nama) { const j = aujJudulAsesmen(nama), m = /^(ASAS|ASAT)\b/.exec(j); return m ? m[1] : j; }

// ---- Kartu Peserta GABUNGAN: semua kelas pada asesmen yang sama dalam satu cetakan (satu PDF, banyak lembar F4) ----
// Satu kelas = satu record sesi (kartu memuat ruang dan kursi dari record itu; tanggal pelaksanaan dari semua sesi kelas itu): sesi kelas yang sedang dibuka bila ada, selain itu sesi paling awal.
// Kelas disambung tanpa ganti halaman; saat menggunting, pilah kartu per kelas.
function aujKartuGrupGabungan(rec) {
  const sesi = allAdmUjian.filter(r => r.nama === rec.nama && r.kelas);
  if (!sesi.some(r => r.key === rec.key) && rec.kelas) sesi.push(rec);
  const per = {};
  sesi.slice().sort((a, b) => String(a.tanggal || '').localeCompare(String(b.tanggal || '')) || String(a.jamMulai || '').localeCompare(String(b.jamMulai || '')))
    .forEach(r => { if (!per[r.kelas]) per[r.kelas] = r; });
  if (rec.kelas) per[rec.kelas] = rec;
  return Object.keys(per).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
    .map(k => ({ kelas: k, rec: per[k], ps: aujPeserta(k, per[k]) })).filter(g => g.ps.length);
}
function aujKartuGabunganIsi(grup, pakaiQr) {
  let isi = '', total = 0, halaman = 0, tanpaKursi = 0, kartu = [];
  grup.forEach(g => {   // kelas disambung tanpa ganti halaman (hemat kertas)
    const peta = aujPetaKursi(g.rec);
    kartu = kartu.concat(g.ps.map(p => aujKartuHtml(g.rec, p, peta[p.key], pakaiQr ? 'cetak' : '')));
    total += g.ps.length; tanpaKursi += g.ps.filter(p => !peta[p.key]).length;
  });
  for (let i = 0; i < kartu.length; i += AUJ_KARTU_PER_HALAMAN) { isi += `<div class="kp-halaman">${kartu.slice(i, i + AUJ_KARTU_PER_HALAMAN).join('')}</div>`; halaman++; }
  return { isi, total, halaman, tanpaKursi };
}
function aujCetakKartuGabungan() {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  const grup = aujKartuGrupGabungan(rec);
  if (!grup.length) return toast('Belum ada siswa pada kelas-kelas di asesmen ini.', true);
  if (aujCanEdit() && JSON.stringify(aujKursi) !== JSON.stringify(rec.kursi || {})) toast('\u26A0\uFE0F Ada perubahan denah yang belum disimpan \u2014 kursi pada kartu mengikuti denah tersimpan.', false, 4500);
  const semua = grup.reduce((a, g) => a.concat(g.ps), []);
  if (!aujFotoSiap(semua, aujCetakKartuGabungan)) return;
  const pakaiQr = aujKartuPakaiQr(), h = aujKartuGabunganIsi(grup, pakaiQr);
  if (!confirm('Cetak kartu ' + h.total + ' peserta dari ' + grup.length + ' kelas (' + grup.map(g => g.kelas).join(', ') + ') = ' + h.halaman + ' halaman F4?\n\nKelas disambung tanpa ganti halaman.' + (h.tanpaKursi ? '\n\n\u26A0\uFE0F ' + h.tanpaKursi + ' peserta belum punya kursi di denah (kolom Kursi tertulis "-").' : '') + '\n\nHasilnya satu file PDF yang otomatis terunduh.')) return;
  let isi = h.isi;
  if (pakaiQr) {
    const meta = { jenis: 'Kartu Peserta ' + (rec.nama || 'ASAS/ASAT'), ket: [rec.nama, 'Semua kelas', 'TA ' + currentTahunAjaran].filter(Boolean).join(' | ') };
    isi += `<div id="kpQrSumber" style="display:none">${TTD.penanda('kepala', meta, { mm: 10, hanyaPimpinan: true })}</div><script>(function(){var s=document.getElementById('kpQrSumber');if(!s)return;var h=s.innerHTML;Array.prototype.forEach.call(document.querySelectorAll('.kp-qr-tujuan'),function(e){e.innerHTML=h;});})();<\/script>`;
  }
  aujUnduhKartuPdf(isi, `Kartu Peserta ${rec.nama || 'ASAS/ASAT'} - Semua Kelas`);
}

// ---- Cek Kesiapan: satu panel yang menunjukkan kekurangan sebelum berkas dicetak massal ----
// Tingkat: kritis (merah) = berkas pasti salah/kosong; peringatan (kuning) = sebaiknya dilengkapi; info (biru) = opsional (foto).
function aujTemuanSiap() {
  const kritis = [], peringatan = [], info = [];
  const daftar = (allAdmUjian || []).filter(r => r && r.key);
  const urut = daftar.slice().sort((a, b) => String(a.tanggal || '').localeCompare(String(b.tanggal || '')) || String(a.jamMulai || '').localeCompare(String(b.jamMulai || '')));
  const labelSesi = r => `${aujAdaTanggal(r.tanggal) ? aujTglIndo(r.tanggal) : 'tanpa tanggal'} · ${aujLabelSesi(r)}`;
  urut.forEach(r => {
    const wajib = [];
    if (!aujAdaTanggal(r.tanggal)) wajib.push('tanggal');
    if (!r.ruang) wajib.push('ruang');
    if (aujMenit(r.jamMulai) == null || aujMenit(r.jamSelesai) == null) wajib.push('jam mulai/selesai');
    if (!r.pengawas1 && !r.pengawas2) wajib.push('pengawas');
    if (wajib.length) kritis.push({ teks: `${labelSesi(r)} — belum diisi: ${wajib.join(', ')}.`, key: r.key, tab: 'sesi' });
    if (!r.mapel) peringatan.push({ teks: `${labelSesi(r)} — mata pelajaran belum diisi.`, key: r.key, tab: 'sesi' });
    const takTerhubung = [r.pengawas1, r.pengawas2].filter(Boolean).filter(n => !aujGuruDari(n));
    if (takTerhubung.length) peringatan.push({ teks: `${labelSesi(r)} — pengawas belum cocok dengan Data Guru: ${takTerhubung.join(', ')} (check-in honor dan cek bentrok bisa tidak jalan).`, key: r.key, tab: 'sesi' });
    if (r.kelas && !aujPeserta(r.kelas, r).length) kritis.push({ teks: `${labelSesi(r)} — tidak ada siswa di ${r.kelas}.`, key: r.key, tab: 'sesi' });
  });
  aujCariBentrok(daftar).pasangan.forEach(p => kritis.push({ teks: `Pengawas ${p.nama} bentrok: ${labelSesi(p.a)}  ⇄  ${labelSesi(p.b)}.`, key: p.a.key, tab: 'sesi' }));
  let memuatFoto = false, jmlKelas = 0, jmlSiswa = 0;
  [...new Set(daftar.map(r => r.nama).filter(Boolean))].forEach(nama => {
    aujKartuGrupGabungan(daftar.find(r => r.nama === nama)).forEach(g => {
      const peta = aujPetaKursi(g.rec), tanpa = g.ps.filter(p => !peta[p.key]).length;
      jmlKelas++; jmlSiswa += g.ps.length;
      if (tanpa === g.ps.length) kritis.push({ teks: `${nama} · ${g.kelas} (${g.rec.ruang || 'tanpa ruang'}) — denah belum disimpan, ${tanpa} siswa belum punya kursi.`, key: g.rec.key, tab: 'denah' });
      else if (tanpa) peringatan.push({ teks: `${nama} · ${g.kelas} (${g.rec.ruang || 'tanpa ruang'}) — ${tanpa} dari ${g.ps.length} siswa belum punya kursi di denah.`, key: g.rec.key, tab: 'denah' });
      if (g.ps.some(p => !(p.key in aujFotoCache))) memuatFoto = true;
      else {
        const tf = g.ps.filter(p => !aujFotoSiswa(p.key)).length;
        if (tf) info.push({ teks: `${g.kelas} — ${tf} dari ${g.ps.length} siswa belum ada pas foto (kotak foto di kartu akan kosong).`, key: g.rec.key, tab: 'kartu' });
      }
    });
  });
  return { kritis, peringatan, info, memuatFoto, jmlSesi: daftar.length, jmlKelas, jmlSiswa };
}
function aujHtmlSiap() {
  const t = aujTemuanSiap();
  if (t.memuatFoto) {   // kelas yang fotonya belum dicek dimuat di latar belakang, panel digambar ulang bila selesai
    const semua = []; [...new Set((allAdmUjian || []).map(r => r.nama).filter(Boolean))].forEach(nama => aujKartuGrupGabungan(allAdmUjian.find(r => r.nama === nama)).forEach(g => g.ps.forEach(p => semua.push(p))));
    aujFotoMuat(semua);
  }
  if (!t.jmlSesi) return '<p style="font-size:13px;color:#6b7280;">Belum ada sesi ASAS/ASAT untuk diperiksa. Buat sesi di tab Data Sesi atau Jadwal Ujian dulu.</p>';
  const blok = (judul, warna, latar, arr) => arr.length ? `<div style="border:1px solid ${warna};background:${latar};border-radius:10px;padding:8px 12px;margin-bottom:10px;">
      <div style="font-size:13px;font-weight:700;color:${warna};margin-bottom:4px;">${judul} (${arr.length})</div>
      ${arr.map(x => `<div style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between;padding:4px 0;border-top:1px solid rgba(0,0,0,.06);font-size:12.5px;">
        <span style="flex:1;min-width:0;">${escapeHtml(x.teks)}</span>
        ${x.key ? `<button class="btn btn-soft" style="font-size:11px;padding:3px 9px;flex:none;" onclick="aujBukaSesiTab('${escapeHtml(x.key)}','${x.tab}')">Buka</button>` : ''}</div>`).join('')}</div>` : '';
  const aman = !t.kritis.length && !t.peringatan.length;
  const ringkas = aman
    ? `<div style="border:1px solid #16a34a;background:#f0fdf4;color:#166534;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px;font-weight:600;">✅ Tidak ada kekurangan penting yang ditemukan. Berkas siap dicetak.</div>`
    : `<div style="border:1px solid ${t.kritis.length ? '#dc2626' : '#d97706'};background:${t.kritis.length ? '#fef2f2' : '#fffbeb'};border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px;font-weight:600;">${t.kritis.length ? '⛔ ' + t.kritis.length + ' hal harus diperbaiki sebelum cetak massal' : '⚠️ Tidak ada yang kritis'}${t.peringatan.length ? ' · ' + t.peringatan.length + ' peringatan' : ''}.</div>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h4 style="font-weight:700;">✔️ Cek Kesiapan</h4>
      <button class="btn btn-soft" onclick="aujRenderTab()">🔄 Periksa ulang</button></div>
    <p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Memeriksa ${t.jmlSesi} sesi dan ${t.jmlSiswa} siswa di ${t.jmlKelas} kelas. Yang diperiksa adalah data yang sudah <strong>tersimpan</strong>.${t.memuatFoto ? ' Foto siswa sedang dimuat…' : ''}</p>
    ${ringkas}
    ${blok('⛔ Harus diperbaiki', '#dc2626', '#fef2f2', t.kritis)}
    ${blok('⚠️ Peringatan', '#d97706', '#fffbeb', t.peringatan)}
    ${blok('ℹ️ Info', '#2563eb', '#eff6ff', t.info)}`;
}
function aujBukaSesiTab(key, tab) { aujPilihSesi(key); if (aujAktifKey === key) aujPilihTab(tab); }

// ---- Kartu pengganti: cetak kartu hanya untuk siswa yang dicentang (kartu hilang/rusak) dalam satu lembar F4 ----
let aujKartuPilih = {}, aujKartuGantiBuka = false;
function aujKartuGantiSegar() {
  const rec = aujRec(), ps = rec ? aujPeserta(rec.kelas, rec) : [], n = ps.filter(p => aujKartuPilih[p.key]).length;
  const a = aujEl('aujKgJml'); if (a) a.textContent = n;
  const b = aujEl('aujKgCetak'); if (b) b.disabled = !n;
}
function aujKartuToggle(key, on) { if (on) aujKartuPilih[key] = 1; else delete aujKartuPilih[key]; aujKartuGantiSegar(); }
function aujKartuPilihSemua(on) {
  const rec = aujRec(); if (!rec) return;
  aujPeserta(rec.kelas, rec).forEach(p => { if (on) aujKartuPilih[p.key] = 1; else delete aujKartuPilih[p.key]; });
  aujRenderTab();
}
function aujHtmlKartuPengganti(ps) {
  const n = ps.filter(p => aujKartuPilih[p.key]).length;
  return `<details ${aujKartuGantiBuka ? 'open' : ''} ontoggle="aujKartuGantiBuka=this.open" style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;margin-bottom:10px;">
    <summary style="cursor:pointer;font-size:13px;font-weight:600;">🪪 Kartu Pengganti (per siswa) — <span id="aujKgJml">${n}</span> dipilih</summary>
    <p style="font-size:12px;color:#6b7280;margin:6px 0;">Centang siswa yang kartunya hilang atau rusak, lalu cetak. Kartu terpilih tercetak dalam satu lembar F4 dengan nomor peserta, ruang, dan kursi yang sama seperti kartu asli. Nomor peserta mengikuti daftar siswa sesi ini.</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
      <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujKartuPilihSemua(true)">Pilih semua</button>
      <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujKartuPilihSemua(false)">Kosongkan</button>
      <button id="aujKgCetak" class="btn btn-primary" style="font-size:12px;padding:3px 12px;" onclick="aujCetakKartuTerpilih()" ${n ? '' : 'disabled'}>📄 Unduh PDF Kartu Terpilih</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 10px;max-height:240px;overflow:auto;">
      ${ps.map(p => `<label style="font-size:13px;display:flex;gap:6px;align-items:center;cursor:pointer;"><input type="checkbox" ${aujKartuPilih[p.key] ? 'checked' : ''} onchange="aujKartuToggle('${escapeHtml(p.key)}',this.checked)"> ${escapeHtml(String(p.nomor))}. ${escapeHtml(p.nama)}</label>`).join('')}</div>
  </details>`;
}
function aujCetakKartuTerpilih() {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  const ps = aujPeserta(rec.kelas, rec).filter(p => aujKartuPilih[p.key]);
  if (!ps.length) return toast('Centang siswa yang kartunya akan dicetak.', true);
  if (aujCanEdit() && JSON.stringify(aujKursi) !== JSON.stringify(rec.kursi || {})) toast('\u26A0\uFE0F Ada perubahan denah yang belum disimpan \u2014 kursi pada kartu mengikuti denah tersimpan.', false, 4500);
  if (!aujFotoSiap(ps, aujCetakKartuTerpilih)) return;
  const pakaiQr = aujKartuPakaiQr(), peta = aujPetaKursi(rec), kartu = ps.map(p => aujKartuHtml(rec, p, peta[p.key], pakaiQr ? 'cetak' : ''));
  let isi = '';
  for (let i = 0; i < kartu.length; i += AUJ_KARTU_PER_HALAMAN) isi += `<div class="kp-halaman">${kartu.slice(i, i + AUJ_KARTU_PER_HALAMAN).join('')}</div>`;
  if (pakaiQr) {
    const meta = { jenis: 'Kartu Peserta ' + (rec.nama || 'ASAS/ASAT'), ket: [rec.nama, rec.kelas, rec.ruang, 'Kartu pengganti', 'TA ' + currentTahunAjaran].filter(Boolean).join(' | ') };
    isi += `<div id="kpQrSumber" style="display:none">${TTD.penanda('kepala', meta, { mm: 10, hanyaPimpinan: true })}</div><script>(function(){var s=document.getElementById('kpQrSumber');if(!s)return;var h=s.innerHTML;Array.prototype.forEach.call(document.querySelectorAll('.kp-qr-tujuan'),function(e){e.innerHTML=h;});})();<\/script>`;
  }
  aujUnduhKartuPdf(isi, `Kartu Pengganti ASAS/ASAT - ${rec.kelas || ''} (${ps.length} siswa)`);
}

// =====================================================
// CETAK
// =====================================================
const AUJ_CSS = `
  @page { size: 215mm 330mm; margin: 20mm 20mm 25mm 30mm; }   /* F4 (Folio) 215 x 330 mm */   /* PMA 12/2026: atas 2, kanan 2, bawah 2,5, kiri 3 cm */
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
// Tanda tangan PANITIA untuk Jadwal, Rekap Beban, dan Jadwal Mengawas (bukan Kepala, tanpa QR). Nama Ketua Panitia diingat di perangkat ini
// (localStorage, tanpa Rules); kosong -> titik-titik untuk diisi tangan.
const AUJ_KETUA_KEY = 'auj_ketua_panitia';
function aujKetuaPanitia() { return aujSkNamaKetua() || (function () { try { return String(localStorage.getItem(AUJ_KETUA_KEY) || '').trim(); } catch (e) { return ''; } })(); }
function aujUbahKetuaPanitia() {
  if (aujSkNamaKetua()) return toast('Nama Ketua Panitia mengikuti SK Panitia (' + aujSkNamaKetua() + '). Ubah di tab SK Panitia.', false, 5000);
  const n = prompt('Nama Ketua Panitia ASAS/ASAT (tercetak di Jadwal, Rekap Beban, dan Jadwal Mengawas).\nKosongkan untuk diisi tangan:', aujKetuaPanitia());
  if (n === null) return;
  try { localStorage.setItem(AUJ_KETUA_KEY, n.trim().slice(0, 80)); toast(n.trim() ? '✅ Ketua Panitia: ' + n.trim().slice(0, 80) : 'Nama Ketua Panitia dikosongkan (diisi tangan saat dicetak).'); } catch (e) { toast('Penyimpanan perangkat diblokir browser.', true); }
}
function aujTtdPanitiaHtml() {
  return `<td><div>&nbsp;</div><div>Ketua Panitia ASAS/ASAT</div><div class="ruang"></div>
    <div style="font-weight:700;text-decoration:underline;">${escapeHtml(aujKetuaPanitia() || '(............................)')}</div></td>`;
}
function aujTtdPengawasHtml(nama, no, lebar) {
  return `<td${lebar ? ` style="width:${lebar};"` : ''}><div>&nbsp;</div><div>Pengawas ${no}</div><div class="ruang"></div>
    <div style="font-weight:700;text-decoration:underline;">${escapeHtml(nama || '(............................)')}</div></td>`;
}

// ---- 1. Daftar Hadir ----
function aujCetakHadirHtml(rec, kosong) {
  const ps = aujPeserta(rec.kelas, rec), st = rec.hadirPeserta || {};
  const baris = ps.map(p => {
    const v = st[p.key];
    return `<tr><td style="text-align:center;width:42px;">${p.nomor}</td><td>${escapeHtml(p.nama)}</td><td style="width:34%;height:26px;"></td><td style="width:16%;text-align:center;">${!kosong && v ? AUJ_STATUS[v] : ''}</td></tr>`;
  }).join('') || '<tr><td colspan="4" style="text-align:center;">Belum ada data siswa.</td></tr>';
  const pw = [[rec.pengawas1, 'p1'], [rec.pengawas2, 'p2']].filter(x => x[0]);
  if (!pw.length) pw.push(['', 'p1'], ['', 'p2']);
  const bPw = pw.map((x, i) => `<tr><td style="text-align:center;width:34px;">${i + 1}</td><td>${escapeHtml(x[0])}</td><td style="width:34%;height:30px;"></td><td style="width:16%;text-align:center;">${!kosong && x[0] && aujPwHadirEfektif(rec)[x[1]] ? 'Hadir' : ''}</td></tr>`).join('');
  return `<div class="halaman">${aujKopHtml()}
    <h1>Daftar Hadir Peserta dan Pengawas ${escapeHtml(aujJudulAsesmen(rec.nama))}</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    ${aujInfoHtml(rec)}
    <h2>A. Daftar Hadir Pengawas</h2>
    <table class="data"><thead><tr><th>No</th><th>Nama Pengawas</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead><tbody>${bPw}</tbody></table>
    <h2>B. Daftar Hadir Peserta</h2>
    <table class="data"><thead><tr><th>No</th><th>Nama Peserta</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead><tbody>${baris}</tbody></table>
    ${kosong ? '<p class="muted" style="margin-top:4px;">Kolom Keterangan diisi tangan oleh pengawas: Hadir / Sakit / Izin / Alpa.</p>' : ''}
  </div>`;
}
// ---- 2. Tata Tertib ----
function aujCetakTatibHtml(rec) {
  const daftar = jenis => `<ol class="tatib">${aujBarisTeks(aujTatibTeks(rec, jenis)).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>`;
  return `<div class="halaman">${aujKopHtml()}
    <h1>Tata Tertib Peserta dan Pengawas ${escapeHtml(aujJudulAsesmen(rec.nama))}</h1>
    <div class="sub">${escapeHtml(rec.nama || '')} — Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}</div>
    <div><h2>A. Tata Tertib Peserta ASAS/ASAT</h2>${daftar('peserta')}</div>
    <div><h2>B. Tata Tertib Pengawas ASAS/ASAT</h2>${daftar('pengawas')}</div>
  </div>`;
}
// ---- 3. Denah ----
function aujCetakDenahHtml(rec) {
  const grup = aujGrupRuang(rec), gab = grup.length > 1 && grup.some(r => r.kursi && Object.keys(r.kursi).length);
  const kursiCetak = gab ? aujKursiGabungan(grup) : (rec.kursi || {}), psCetak = gab ? aujPesertaGabungan(grup) : aujPeserta(rec.kelas, rec);
  return `<div class="halaman">${aujKopHtml()}
    <h1>Denah Lokasi dan Denah Tempat Duduk Ruang ${escapeHtml(aujJudulAsesmen(rec.nama))}</h1>
    <div class="sub">${escapeHtml(rec.nama || '')} — ${escapeHtml(gab ? grup.map(r => r.kelas).join(' + ') : (rec.kelas || ''))} — ${escapeHtml(rec.ruang || '')}</div>
    <div class="blok"><h2>A. Denah Lokasi</h2>${aujLokasiHtml(rec).replace(/<p style="font-size:11px;color:#dc2626[^>]*>[^<]*<\/p>/, '')}</div>
    <div class="blok"><h2>B. Denah Tempat Duduk — ${escapeHtml(rec.ruang || '')}</h2>${aujGridHtml(rec, kursiCetak, psCetak, false)}${gab ? '<div style="margin-top:6px;">' + aujLegendaKelas(grup) + '</div>' : ''}</div>
  </div>`;
}
// ---- 4. Berita Acara ----
function aujCetakBAHtml(rec, bl) {
  if (bl) rec = Object.assign({}, rec, { hadirPeserta: {}, baNaskah: '', baLjk: '', baCatatan: '', baMulai: '', baSelesai: '' });   // kosongan: hasil dikosongkan, jadwal tetap
  const rk = aujRekapHadir(rec), p = aujBagianTgl(rec.tanggal) || { hari: '...', d: '...', bulan: '...', y: '...' };
  const kosong = !!bl || (rk.belum === rk.total && rk.total > 0);
  const orang = n => kosong ? '.......... orang' : `${n} orang`;
  const titik = v => (v == null || v === '') ? '..........' : escapeHtml(String(v));
  const mulai = bl ? '' : (rec.baMulai || rec.jamMulai), selesai = bl ? '' : (rec.baSelesai || rec.jamSelesai);
  const tdkHadir = rk.tidakHadir.length
    ? `<table class="data" style="margin-top:4px;"><thead><tr><th style="width:34px;">No</th><th>Nama Peserta</th><th style="width:20%;">Keterangan</th></tr></thead><tbody>${rk.tidakHadir.map((x, i) => `<tr><td style="text-align:center;">${i + 1}</td><td>${escapeHtml(x.nama)}</td><td style="text-align:center;">${x.ket}</td></tr>`).join('')}</tbody></table>`
    : (bl
      ? `<table class="data" style="margin-top:4px;"><thead><tr><th style="width:34px;">No</th><th>Nama Peserta</th><th style="width:20%;">Keterangan</th></tr></thead><tbody>${[1, 2, 3, 4, 5].map(n => `<tr><td style="text-align:center;height:24px;">${n}</td><td></td><td></td></tr>`).join('')}</tbody></table>`
      : `<span>${kosong ? '' : '– (nihil)'}</span>`);
  const tempat = aujTempat();
  return `<div class="halaman">${aujKopHtml()}
    <h1>Berita Acara Pelaksanaan ${escapeHtml(aujJudulAsesmen(rec.nama))}</h1>
    <div class="sub">${escapeHtml(rec.nama || '')}<br>Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    <p style="text-align:justify;line-height:1.5;">Pada hari ini <strong>${escapeHtml(p.hari)}</strong> tanggal <strong>${escapeHtml(String(p.d))}</strong> bulan <strong>${escapeHtml(p.bulan)}</strong> tahun <strong>${escapeHtml(String(p.y))}</strong>, telah dilaksanakan <strong>${escapeHtml(rec.nama || '')}</strong>${rec.mapel ? ' mata pelajaran <strong>' + escapeHtml(rec.mapel) + '</strong>' : ''} untuk <strong>${escapeHtml(rec.kelas || '')}</strong> di ${escapeHtml(MADRASAH.nama || 'madrasah')}, ruang <strong>${escapeHtml(rec.ruang || '')}</strong>, mulai pukul <strong>${escapeHtml(mulai || '.....')}</strong> sampai dengan pukul <strong>${escapeHtml(selesai || '.....')}</strong> WIB, dengan keterangan sebagai berikut:</p>
    <table class="info" style="margin-left:6px;">
      <tr><td style="width:24px;">1.</td><td style="width:250px;">Jumlah peserta seharusnya</td><td>: ${bl ? rk.total + ' orang' : orang(rk.total)}</td></tr>
      <tr><td>2.</td><td>Jumlah peserta hadir</td><td>: ${orang(rk.h)}</td></tr>
      <tr><td>3.</td><td>Jumlah peserta tidak hadir</td><td>: ${kosong ? '.......... orang' : `${rk.s + rk.i + rk.a} orang (sakit ${rk.s}, izin ${rk.i}, alpa ${rk.a})`}</td></tr>
      <tr><td>4.</td><td>Jumlah naskah soal yang diterima</td><td>: ${titik(rec.baNaskah)} eksemplar</td></tr>
      <tr><td>5.</td><td>Jumlah lembar jawaban dikumpulkan</td><td>: ${titik(rec.baLjk)} lembar</td></tr>
    </table>
    <div class="blok" style="margin-top:8px;padding-left:6px;"><div style="margin-bottom:2px;">Peserta yang tidak hadir:</div>${tdkHadir}</div>
    <div class="blok" style="margin-top:10px;padding-left:6px;"><div>Catatan selama pelaksanaan ASAS/ASAT:</div>
      <div style="border:1px solid #000;min-height:${bl ? 110 : 80}px;padding:6px 8px;margin-top:3px;white-space:pre-wrap;font-size:11.5pt;">${escapeHtml(rec.baCatatan || '')}</div></div>
    <p style="margin-top:12px;">Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
    <div style="text-align:right;margin-top:6px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(rec.tanggal))}</div>
    <table class="ttd"><tr>${aujTtdPengawasHtml(rec.pengawas1, 1, '50%')}${aujTtdPengawasHtml(rec.pengawas2, 2, '50%')}</tr></table>
  </div>`;
}

// Label Meja: nomor peserta untuk DITEMPEL di bangku, diunduh sebagai PDF F4 dengan bingkai seperti Kartu Peserta.
// 3 kolom x 9 baris = 27 label per halaman, ukuran 63 x 32 mm. Disambung tanpa ganti halaman antar kelas/ruang.
const AUJ_LABEL_PER_HALAMAN = 27;
const AUJ_CSS_LABEL = `
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  .lm-halaman { display: grid; grid-template-columns: repeat(3, 63mm); grid-auto-rows: 32mm; gap: 2mm 3mm; justify-content: center; align-content: start; }
  .lb { box-sizing: border-box; width: 63mm; height: 32mm; border: 0.3mm dashed #555; padding: 0.8mm; display: flex; flex-direction: column; overflow: hidden; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; text-align: center; }
  .lb-bingkai { box-sizing: border-box; flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; border: 1mm double #0f5c66; border-radius: 1.5mm; padding: 0.5mm 1.5mm; overflow: hidden; }
  .lb .kl { font-size: 8pt; font-weight: 700; text-transform: uppercase; line-height: 1.2; white-space: nowrap; overflow: hidden; }
  .lb .no { font-size: 21pt; font-weight: 700; line-height: 1.15; }
  .lb .nm { font-size: 8pt; font-weight: 700; line-height: 1.15; text-transform: uppercase; }
  .lb .ps { font-size: 7pt; line-height: 1.2; margin-top: 0.8mm; color: #333; }
`;
// Satu label per siswa yang sudah punya kursi, urut baris terdepan -> kolom -> kiri/kanan.
function aujLabelDariKursi(rec, kursi, ps) {
  const byKey = {}, out = [];
  ps.forEach(p => { byKey[p.key] = p; });
  Object.keys(kursi || {}).forEach(k => {
    const m = /^(\d+)_(\d+)(_2)?$/.exec(k), p = m && byKey[kursi[k]]; if (!p) return;
    const r = +m[1], c = +m[2], posisi = `Baris ${r} / Kolom ${c}` + (rec.denahPerBangku === 2 ? (m[3] ? ' (kanan)' : ' (kiri)') : '');
    out.push({ urut: r * 1000 + c * 10 + (m[3] ? 1 : 0), ruang: rec.ruang || '', key: p.key,
      html: `<div class="lb"><div class="lb-bingkai"><div class="kl">${escapeHtml(p.kelas || '-')} &middot; ${escapeHtml(rec.ruang || '-')}</div><div class="no">${escapeHtml(String(p.nomor))}</div><div class="nm">${escapeHtml(p.nama)}</div><div class="ps">${posisi}</div></div></div>` });
  });
  return out.sort((a, b) => a.urut - b.urut);
}
// semua = false: ruang sesi yang dibuka (termasuk kelas gabungan); semua = true: semua kelas pada asesmen yang sama, urut per ruang lalu kursi.
function aujUnduhLabelPdf(semua) {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  let label = [], tanpa = 0;
  if (semua) {
    aujKartuGrupGabungan(rec).forEach(g => {
      const l = aujLabelDariKursi(g.rec, g.rec.kursi, g.ps);
      tanpa += g.ps.length - l.length; label = label.concat(l);
    });
    label.sort((a, b) => (aujKunciRuang(a.ruang) - aujKunciRuang(b.ruang)) || a.ruang.localeCompare(b.ruang, 'id', { numeric: true }) || a.urut - b.urut);
  } else {
    aujPeringatDraft(['denah'], rec);
    const grup = aujGrupRuang(rec), gab = grup.length > 1 && grup.some(r => r.kursi && Object.keys(r.kursi).length);
    const ps = gab ? aujPesertaGabungan(grup) : aujPeserta(rec.kelas, rec);
    label = aujLabelDariKursi(rec, gab ? aujKursiGabungan(grup) : rec.kursi, ps);
    tanpa = ps.length - label.length;
  }
  if (!label.length) return toast('Belum ada kursi pada denah yang tersimpan. Susun dan simpan denah dulu.', true, 5000);
  if (tanpa > 0 && !confirm(tanpa + ' siswa belum punya kursi di denah, jadi labelnya TIDAK ikut dibuat.\n\nTetap unduh ' + label.length + ' label?')) return;
  let isi = '';
  for (let i = 0; i < label.length; i += AUJ_LABEL_PER_HALAMAN) isi += `<div class="kp-halaman lm-halaman">${label.slice(i, i + AUJ_LABEL_PER_HALAMAN).map(x => x.html).join('')}</div>`;
  aujUnduhKartuPdf(isi, `Label Meja ASAS/ASAT - ${semua ? 'Semua Ruang' : (rec.ruang || rec.kelas || '')}`, AUJ_CSS_LABEL, AUJ_PDF_LABEL);
}

// Nomor Ruang untuk ditempel di PINTU: satu lembar F4 per ruang (semua ruang pada asesmen yang sama), memuat nama ruang besar,
// kelas yang menempati, dan rentang nomor peserta supaya siswa mudah mencari ruangnya.
const AUJ_CSS_PINTU = AUJ_CSS + `
  .pt { box-sizing: border-box; height: 262mm; border: 1.2mm solid #000; padding: 10mm 8mm; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-after: always; break-after: page; }
  .pt:last-child { page-break-after: auto; break-after: auto; }
  .pt img { width: 30mm; height: 30mm; object-fit: contain; margin-bottom: 4mm; }
  .pt .mad { font-size: 17pt; font-weight: 700; text-transform: uppercase; line-height: 1.2; }
  .pt .ases { font-size: 14pt; margin-top: 2mm; }
  .pt .garis { width: 70%; border-top: 0.8mm solid #000; margin: 10mm 0 8mm; }
  .pt .ruang { font-weight: 700; line-height: 1.05; text-transform: uppercase; word-break: break-word; }
  .pt .kls { margin-top: 12mm; }
  .pt .kls .k { font-size: 30pt; font-weight: 700; line-height: 1.15; }
  .pt .kls .n { font-size: 18pt; margin-bottom: 3mm; }
  .pt .ket { margin-top: 14mm; font-size: 11pt; color: #333; }
`;
// Kunci urut ruang: angka kalau ada ("Ruang 3"), angka Romawi kalau ada ("Ruang III"), selain itu terakhir.
function aujKunciRuang(nama) {
  const t = String(nama || ''), d = /(\d+)/.exec(t);
  if (d) return +d[1];
  const m = /(?:^|\s)([IVXLC]+)(?:\s|$)/i.exec(t);
  if (m) {
    const v = { I: 1, V: 5, X: 10, L: 50, C: 100 }, r = m[1].toUpperCase();
    let tot = 0;
    for (let i = 0; i < r.length; i++) { const a = v[r[i]], b = v[r[i + 1]] || 0; tot += a < b ? -a : a; }
    return tot;
  }
  return 9999;
}
// { peta: { 'Ruang I': { 'Kelas 4': recordSesi } }, ruangs: [nama ruang terurut] } untuk semua sesi pada asesmen yang sama.
function aujPetaRuang(rec) {
  const sama = allAdmUjian.filter(r => r.ruang && r.nama === rec.nama);
  if (!sama.some(r => r.key === rec.key) && rec.ruang) sama.push(rec);
  const peta = {};
  sama.forEach(r => {
    const e = peta[r.ruang] || (peta[r.ruang] = {});
    if (r.kelas && !e[r.kelas]) e[r.kelas] = r;
  });
  const ruangs = Object.keys(peta).sort((a, b) => aujKunciRuang(a) - aujKunciRuang(b) || a.localeCompare(b, 'id', { numeric: true }));
  return { peta, ruangs };
}
// Daftar nama + nomor peserta (+ kursi bila denah sudah disimpan) per ruang, satu halaman per ruang, untuk ditempel di dekat pintu.
function aujCetakPintuNamaHtml(rec) {
  const { peta, ruangs } = aujPetaRuang(rec);
  if (!ruangs.length) return '<p style="text-align:center;padding:20mm 0;">Belum ada ruang pada sesi ini. Isi Ruang di tab Data Sesi dulu.</p>';
  return ruangs.map(nm => {
    const baris = [];
    Object.keys(peta[nm]).sort((a, b) => a.localeCompare(b, 'id', { numeric: true })).forEach(k => {
      const r = peta[nm][k], kursi = aujPetaKursi(r);
      aujPeserta(k, r).forEach(p => baris.push(`<tr><td style="text-align:center;width:70px;">${escapeHtml(String(p.nomor))}</td><td>${escapeHtml(p.nama)}</td><td style="text-align:center;width:90px;">${escapeHtml(k)}</td><td style="width:130px;">${escapeHtml(kursi[p.key] || '')}</td></tr>`));
    });
    return `<div class="halaman" style="text-align:center;">
      <div style="font-size:12pt;font-weight:700;text-transform:uppercase;">${escapeHtml(MADRASAH.nama || '')}</div>
      <div style="font-size:11pt;margin-top:1mm;">${escapeHtml(aujJudulAsesmen(rec.nama))} · TA ${escapeHtml(currentTahunAjaran || '')}</div>
      <div style="font-size:36pt;font-weight:700;text-transform:uppercase;line-height:1.1;margin:4mm 0 2mm;">${escapeHtml(nm)}</div>
      <div style="font-size:11pt;margin-bottom:3mm;">Daftar Peserta · ${baris.length} siswa</div>
      <table class="data" style="text-align:left;"><thead><tr><th>No. Peserta</th><th>Nama</th><th>Kelas</th><th>Kursi</th></tr></thead><tbody>${baris.join('') || '<tr><td colspan="4" style="text-align:center;">Belum ada data siswa.</td></tr>'}</tbody></table>
    </div>`;
  }).join('');
}
function aujCetakPintuHtml(rec) {
  const { peta, ruangs } = aujPetaRuang(rec);
  if (!ruangs.length) return '<p style="text-align:center;padding:20mm 0;">Belum ada ruang pada sesi ini. Isi Ruang di tab Data Sesi dulu.</p>';
  const logo = new URL('logo/logo-lembaga.png', location.href).href;
  return ruangs.map(nm => {
    const ukuran = nm.length <= 8 ? 78 : (nm.length <= 12 ? 56 : 40);
    const kelasHtml = Object.keys(peta[nm]).sort((a, b) => a.localeCompare(b, 'id', { numeric: true })).map(k => {
      const ps = aujPeserta(k, peta[nm][k]);
      const rentang = ps.length ? `No. Peserta ${escapeHtml(String(ps[0].nomor))}${ps.length > 1 ? ' – ' + escapeHtml(String(ps[ps.length - 1].nomor)) : ''}` : '';
      return `<div class="k">${escapeHtml(k)}</div>${rentang ? `<div class="n">${rentang}</div>` : ''}`;
    }).join('');
    return `<div class="pt"><img src="${escapeHtml(logo)}" alt="" onerror="this.style.display='none'">
      <div class="mad">${escapeHtml(MADRASAH.nama || '')}</div>
      <div class="ases">${escapeHtml(aujJudulAsesmen(rec.nama))} · TA ${escapeHtml(currentTahunAjaran || '')}</div>
      <div class="garis"></div>
      <div class="ruang" style="font-size:${ukuran}pt;">${escapeHtml(nm)}</div>
      <div class="kls">${kelasHtml}</div>
      <div class="ket">Cari ruangan sesuai nomor peserta pada kartu peserta.</div></div>`;
  }).join('');
}
// Kosongan banyak ruang: Daftar Hadir + Berita Acara kosong tiap sesi pada asesmen yang sama, urut tanggal, jam, lalu ruang.
function aujCetakKosongan(dari, sampai) {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  if (!aujAdaTanggal(dari) || !aujAdaTanggal(sampai)) return toast('Isi tanggal Dari dan Sampai dulu.', true);
  if (dari > sampai) return toast('Tanggal Dari tidak boleh sesudah tanggal Sampai.', true);
  const daftar = allAdmUjian.filter(r => r.nama === rec.nama && aujAdaTanggal(r.tanggal) && r.tanggal >= dari && r.tanggal <= sampai)
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.jamMulai || '').localeCompare(String(b.jamMulai || '')) || aujKunciRuang(a.ruang) - aujKunciRuang(b.ruang) || String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }));
  if (!daftar.length) return toast('Tidak ada sesi pada rentang tanggal itu.', true);
  const hari = new Set(daftar.map(r => r.tanggal)).size;
  if (!confirm('Cetak Daftar Hadir + Berita Acara KOSONGAN untuk ' + daftar.length + ' sesi pada ' + hari + ' hari (' + aujTglIndo(dari) + ' s.d. ' + aujTglIndo(sampai) + ')?\n\nKira-kira ' + (daftar.length * 3) + ' lembar F4. Pastikan kertas cukup.')) return;
  aujCetakHtml(daftar.map(r => aujCetakHadirHtml(r, true) + aujCetakBAHtml(r, true)).join(''), `Berkas Kosongan ASAS/ASAT - ${aujTglIndo(dari)} s.d. ${aujTglIndo(sampai)}`);
}
function aujCetakKosonganHari() { const rec = aujRec(); if (rec) aujCetakKosongan(rec.tanggal, rec.tanggal); }
function aujCetakKosonganRentang() { aujCetakKosongan(aujVal('aujKosDari'), aujVal('aujKosSampai')); }
// Baris pilihan rentang tanggal (bawaan: seluruh masa asesmen yang sama), dipasang di tab Daftar Hadir dan Berita Acara.
function aujBarKosongan(rec) {
  const tgl = allAdmUjian.filter(r => r.nama === rec.nama && aujAdaTanggal(r.tanggal)).map(r => r.tanggal).sort();
  const dari = tgl[0] || rec.tanggal || '', sampai = tgl[tgl.length - 1] || rec.tanggal || '';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;border:1px dashed #cbd5e1;border-radius:8px;padding:6px 10px;margin-bottom:10px;">
    <span>📚 Cetak banyak hari:</span>
    <input id="aujKosDari" class="field" type="date" value="${escapeHtml(dari)}" style="width:auto;padding:3px 6px;font-size:12px;"> s.d.
    <input id="aujKosSampai" class="field" type="date" value="${escapeHtml(sampai)}" style="width:auto;padding:3px 6px;font-size:12px;">
    <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujCetakKosonganRentang()" title="Daftar Hadir + Berita Acara kosong semua ruang pada rentang tanggal ini">🖨️ Hadir + BA Kosongan</button>
    <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujCetakSampulRentang()" title="Sampul amplop naskah dan lembar jawaban, satu lembar per sesi pada rentang tanggal ini">✉️ Sampul Amplop</button>
    <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujCetakRekapBARentang()" title="Rekap Berita Acara semua ruang, satu halaman mendatar per tanggal">📋 Rekap BA</button>
    <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujCetakPengawasHariRentang()" title="Daftar hadir pengawas per hari (tanda tangan), satu halaman per tanggal">✍️ Hadir Pengawas</button></div>`;
}
// ---- Sampul amplop naskah & lembar jawaban (satu lembar per sesi/ruang) ----
function aujSesiRentang(dari, sampai, rec) {
  return allAdmUjian.filter(r => r.nama === rec.nama && aujAdaTanggal(r.tanggal) && r.tanggal >= dari && r.tanggal <= sampai)
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.jamMulai || '').localeCompare(String(b.jamMulai || '')) || aujKunciRuang(a.ruang) - aujKunciRuang(b.ruang) || String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }));
}
function aujCetakSampulHtml(rec) {
  const jml = aujPeserta(rec.kelas, rec).length, titik = '..............';
  const baris = (a, b) => `<tr><td style="width:42%;">${a}</td><td style="width:2%;text-align:center;">:</td><td>${b}</td></tr>`;
  const kol = (judul, nama) => `<td><div>${judul}</div><div class="ruang"></div><div style="font-weight:700;text-decoration:underline;">${escapeHtml(nama || '(............................)')}</div></td>`;
  return `<div class="halaman">${aujKopHtml()}
    <h1>Sampul Naskah Soal dan Lembar Jawaban</h1>
    <div class="sub">${escapeHtml(aujJudulAsesmen(rec.nama))} — Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}</div>
    <div style="text-align:center;font-size:34pt;font-weight:700;text-transform:uppercase;line-height:1.1;margin:8px 0 2px;">${escapeHtml(rec.ruang || '-')}</div>
    <div style="text-align:center;font-size:18pt;font-weight:700;margin-bottom:10px;">${escapeHtml(rec.kelas || '')}${rec.mapel ? ' · ' + escapeHtml(rec.mapel) : ''}</div>
    ${aujInfoHtml(rec)}
    <table class="info" style="margin-top:2px;"><tr><td style="width:120px;">Jumlah Peserta</td><td style="width:10px;">:</td><td>${jml} siswa</td></tr></table>
    <h2>Rincian Naskah dan Lembar Jawaban</h2>
    <table class="data"><thead><tr><th>Keterangan</th><th style="width:30%;">Jumlah</th></tr></thead><tbody>
      <tr><td>Naskah soal diterima pengawas dari panitia</td><td style="height:30px;">${titik} eksemplar</td></tr>
      <tr><td>Naskah soal dikembalikan ke panitia</td><td style="height:30px;">${titik} eksemplar</td></tr>
      <tr><td>Lembar jawaban dibagikan</td><td style="height:30px;">${titik} lembar</td></tr>
      <tr><td>Lembar jawaban dikumpulkan</td><td style="height:30px;">${titik} lembar</td></tr>
      <tr><td>Peserta tidak hadir</td><td style="height:30px;">${titik} orang</td></tr>
    </tbody></table>
    <table class="ttd"><tr>${kol('Diserahkan oleh Panitia,', '')}${kol('Diterima Pengawas 1,', rec.pengawas1)}${kol('Dikembalikan ke Panitia,', '')}</tr></table>
  </div>`;
}
function aujCetakSampulRentang() {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  const dari = aujVal('aujKosDari'), sampai = aujVal('aujKosSampai');
  if (!aujAdaTanggal(dari) || !aujAdaTanggal(sampai)) return toast('Isi tanggal Dari dan Sampai dulu.', true);
  if (dari > sampai) return toast('Tanggal Dari tidak boleh sesudah tanggal Sampai.', true);
  const daftar = aujSesiRentang(dari, sampai, rec);
  if (!daftar.length) return toast('Tidak ada sesi pada rentang tanggal itu.', true);
  if (!confirm('Cetak sampul amplop untuk ' + daftar.length + ' sesi (' + aujTglIndo(dari) + ' s.d. ' + aujTglIndo(sampai) + ')? Satu lembar F4 per sesi.')) return;
  aujCetakHtml(daftar.map(aujCetakSampulHtml).join(''), `Sampul Amplop ASAS/ASAT - ${aujTglIndo(dari)} s.d. ${aujTglIndo(sampai)}`);
}

// ---- Rekap kehadiran peserta per kelas selama masa asesmen (F4 mendatar): baris = siswa, kolom = tiap sesi ----
const AUJ_CSS_REKAP = AUJ_CSS + `
  @page { size: 330mm 215mm; margin: 12mm 15mm; }
  table.rk { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.rk th, table.rk td { border: 1px solid #000; padding: 1.5px 3px; font-size: 8pt; text-align: center; line-height: 1.2; }
  table.rk th { background: #eee; font-size: 7.5pt; }
  table.rk td.nm { text-align: left; white-space: nowrap; }
  table.rk thead { display: table-header-group; }
  table.rk tr { page-break-inside: avoid; }
  table.rk td.x { font-weight: 700; }
`;
function aujRekapKelasHtml(kelas, daftar) {
  const ps = [], ada = {};
  daftar.forEach(r => aujPeserta(kelas, r).forEach(p => { if (!ada[p.key]) { ada[p.key] = 1; ps.push(p); } }));
  ps.sort((a, b) => a.no - b.no);
  const kolom = daftar.map(r => {
    const t = aujBagianTgl(r.tanggal);
    return `<th>${t ? escapeHtml(t.hari.slice(0, 3)) + '<br>' + t.d + ' ' + escapeHtml(t.bulan.slice(0, 3)) : ''}<br><span style="font-weight:400;">${escapeHtml(r.mapel || '')}</span></th>`;
  }).join('');
  const baris = ps.map(p => {
    const c = { H: 0, S: 0, I: 0, A: 0 };
    const sel = daftar.map(r => {
      const v = (r.hadirPeserta || {})[p.key];
      if (v && c[v] != null) c[v]++;
      return `<td${v && v !== 'H' ? ' class="x"' : ''}>${v && c[v] != null ? v : ''}</td>`;
    }).join('');
    return `<tr><td>${escapeHtml(String(p.nomor))}</td><td class="nm">${escapeHtml(p.nama)}</td>${sel}<td>${c.H}</td><td>${c.S}</td><td>${c.I}</td><td>${c.A}</td></tr>`;
  }).join('') || `<tr><td colspan="${daftar.length + 6}">Belum ada data siswa.</td></tr>`;
  return `<div class="halaman">${aujKopHtml()}
    <h1>Rekap Kehadiran Peserta ${escapeHtml(daftar[0].nama || 'ASAS/ASAT')} — ${escapeHtml(kelas)}</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    <table class="rk"><thead><tr><th style="width:36px;">No. Peserta</th><th>Nama</th>${kolom}<th style="width:24px;">H</th><th style="width:24px;">S</th><th style="width:24px;">I</th><th style="width:24px;">A</th></tr></thead><tbody>${baris}</tbody></table>
    <p class="muted" style="margin-top:4px;">H = Hadir, S = Sakit, I = Izin, A = Alpa. Sel kosong = status belum diisi di Daftar Hadir.</p>
  </div>`;
}
function aujCetakRekapHtml(rec, semua) {
  const sesi = allAdmUjian.filter(r => r.nama === rec.nama && r.kelas && aujAdaTanggal(r.tanggal));
  if (!sesi.some(r => r.key === rec.key) && rec.kelas && aujAdaTanggal(rec.tanggal)) sesi.push(rec);
  const kelasList = semua ? [...new Set(sesi.map(r => r.kelas))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true })) : [rec.kelas];
  const hasil = kelasList.map(k => {
    const d = sesi.filter(r => r.kelas === k).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.jamMulai || '').localeCompare(String(b.jamMulai || '')));
    return d.length ? aujRekapKelasHtml(k, d) : '';
  }).join('');
  return hasil || '<p style="text-align:center;padding:20mm 0;">Belum ada sesi bertanggal untuk direkap.</p>';
}
// ---- Rekap Berita Acara semua ruang (satu halaman F4 mendatar per tanggal) & Daftar Hadir Pengawas per hari ----
// Keduanya memakai rentang tanggal di baris "Cetak banyak hari" (bawaan: seluruh masa asesmen yang sama).
function aujAmbilRentang() {
  const rec = aujRec(); if (!rec) { toast('Pilih sesi ASAS/ASAT dulu.', true); return null; }
  const dari = aujVal('aujKosDari'), sampai = aujVal('aujKosSampai');
  if (!aujAdaTanggal(dari) || !aujAdaTanggal(sampai)) { toast('Isi tanggal Dari dan Sampai dulu.', true); return null; }
  if (dari > sampai) { toast('Tanggal Dari tidak boleh sesudah tanggal Sampai.', true); return null; }
  const daftar = aujSesiRentang(dari, sampai, rec);
  if (!daftar.length) { toast('Tidak ada sesi pada rentang tanggal itu.', true); return null; }
  return { rec, daftar, dari, sampai };
}
function aujPerTanggal(daftar) {
  const g = {}; daftar.forEach(r => (g[r.tanggal] = g[r.tanggal] || []).push(r));
  return Object.keys(g).sort().map(t => ({ tanggal: t, sesi: g[t] }));
}
function aujCetakRekapBAHtml(daftar) {
  return aujPerTanggal(daftar).map(h => {
    const tot = { p: 0, h: 0, s: 0, i: 0, a: 0, belum: 0 };
    const baris = h.sesi.map((r, n) => {
      const rk = aujRekapHadir(r), terisi = !(rk.belum === rk.total && rk.total > 0);
      tot.p += rk.total; tot.belum += terisi ? rk.belum : rk.total;
      if (terisi) { tot.h += rk.h; tot.s += rk.s; tot.i += rk.i; tot.a += rk.a; }
      const v = x => terisi ? x : '–', ada = x => (x === 0 || x) ? escapeHtml(String(x)) : '–';
      return `<tr><td>${n + 1}</td><td>${escapeHtml(aujWaktu(r))}</td><td>${escapeHtml(r.ruang || '-')}</td><td>${escapeHtml(r.kelas || '-')}</td><td class="nm">${escapeHtml(r.mapel || '-')}</td>
        <td>${rk.total}</td><td>${v(rk.h)}</td><td>${v(rk.s)}</td><td>${v(rk.i)}</td><td>${v(rk.a)}</td><td>${ada(r.baNaskah)}</td><td>${ada(r.baLjk)}</td>
        <td class="nm" style="white-space:normal;">${escapeHtml([r.pengawas1, r.pengawas2].filter(Boolean).join(', ') || '-')}</td>
        <td class="nm" style="white-space:normal;">${escapeHtml(r.baCatatan || '')}</td></tr>`;
    }).join('');
    const ket = tot.belum ? `<p class="muted" style="margin-top:4px;">Tanda – = belum diisi di Berita Acara/Daftar Hadir. Siswa belum terisi statusnya: ${tot.belum} dari ${tot.p}.</p>` : '';
    return `<div class="halaman">${aujKopHtml()}
      <h1>Rekap Berita Acara ${escapeHtml(h.sesi[0].nama || 'ASAS/ASAT')}</h1>
      <div class="sub">${escapeHtml(aujTglIndo(h.tanggal, true))} — Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}</div>
      <table class="rk"><thead><tr><th style="width:24px;">No</th><th>Waktu</th><th>Ruang</th><th>Kelas</th><th>Mapel</th><th>Peserta</th><th>Hadir</th><th>S</th><th>I</th><th>A</th><th>Naskah</th><th>LJK</th><th>Pengawas</th><th style="width:22%;">Catatan</th></tr></thead>
      <tbody>${baris}<tr style="font-weight:700;"><td colspan="5" style="text-align:right;">Jumlah</td><td>${tot.p}</td><td>${tot.h}</td><td>${tot.s}</td><td>${tot.i}</td><td>${tot.a}</td><td colspan="4"></td></tr></tbody></table>
      ${ket}
      <table class="ttd"><tr>${aujTtdPanitiaHtml()}<td><div>Mengetahui,</div><div>Kepala Madrasah</div><div class="ruang"></div><div style="font-weight:700;text-decoration:underline;">${escapeHtml(MADRASAH.kepala_sekolah || '(............................)')}</div></td></tr></table>
    </div>`;
  }).join('');
}
function aujCetakRekapBARentang() {
  const x = aujAmbilRentang(); if (!x) return;
  aujCetakHtml(aujCetakRekapBAHtml(x.daftar), `Rekap Berita Acara - ${aujTglIndo(x.dari)} s.d. ${aujTglIndo(x.sampai)}`, AUJ_CSS_REKAP);
}
function aujCetakPengawasHariHtml(daftar) {
  const halaman = aujPerTanggal(daftar).map(h => {
    const baris = [];
    h.sesi.forEach(r => {
      const hadir = aujPwHadirEfektif(r);
      [[r.pengawas1, 'p1'], [r.pengawas2, 'p2']].filter(x => x[0]).forEach(x => baris.push(
        `<tr><td style="text-align:center;width:30px;">${baris.length + 1}</td><td>${escapeHtml(x[0])}</td><td style="text-align:center;white-space:nowrap;">${escapeHtml(aujWaktu(r))}</td><td style="text-align:center;">${escapeHtml(r.ruang || '-')}</td><td style="text-align:center;">${escapeHtml(r.kelas || '-')}</td><td>${escapeHtml(r.mapel || '-')}</td><td style="width:30%;height:32px;"></td><td style="width:11%;text-align:center;">${hadir[x[1]] ? 'Hadir' : ''}</td></tr>`));
    });
    if (!baris.length) return '';
    return `<div class="halaman">${aujKopHtml()}
      <h1>Daftar Hadir Pengawas ${escapeHtml(h.sesi[0].nama || 'ASAS/ASAT')}</h1>
      <div class="sub">${escapeHtml(aujTglIndo(h.tanggal, true))} — Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}</div>
      <table class="data"><thead><tr><th>No</th><th>Nama Pengawas</th><th>Waktu</th><th>Ruang</th><th>Kelas</th><th>Mata Pelajaran</th><th>Tanda Tangan</th><th>Ket.</th></tr></thead><tbody>${baris.join('')}</tbody></table>
      <p class="muted" style="margin-top:4px;">Kolom Ket. terisi "Hadir" bila pengawas sudah check-in atau ditandai hadir di tab Daftar Hadir.</p>
      <table class="ttd"><tr><td style="width:50%;"></td>${aujTtdPanitiaHtml()}</tr></table>
    </div>`;
  }).join('');
  return halaman || '<p style="text-align:center;padding:20mm 0;">Belum ada pengawas pada sesi di rentang tanggal itu.</p>';
}
function aujCetakPengawasHariRentang() {
  const x = aujAmbilRentang(); if (!x) return;
  aujCetakHtml(aujCetakPengawasHariHtml(x.daftar), `Daftar Hadir Pengawas - ${aujTglIndo(x.dari)} s.d. ${aujTglIndo(x.sampai)}`, AUJ_CSS_REKAP);
}
const AUJ_CETAK = { hadir: aujCetakHadirHtml, tatib: aujCetakTatibHtml, denah: aujCetakDenahHtml, ba: aujCetakBAHtml, 
  hadir0: r => aujCetakHadirHtml(r, true), ba0: r => aujCetakBAHtml(r, true), pintu: aujCetakPintuHtml, pintuNama: aujCetakPintuNamaHtml,
  sampul: aujCetakSampulHtml, rekap: r => aujCetakRekapHtml(r, false), rekapSemua: r => aujCetakRekapHtml(r, true) };
const AUJ_JUDUL = { hadir: 'Daftar Hadir ASAS/ASAT', tatib: 'Tata Tertib ASAS/ASAT', denah: 'Denah Ruang ASAS/ASAT', ba: 'Berita Acara ASAS/ASAT', hadir0: 'Daftar Hadir Kosongan ASAS/ASAT', ba0: 'Berita Acara Kosongan ASAS/ASAT', pintu: 'Nomor Ruang ASAS/ASAT', pintuNama: 'Daftar Peserta per Ruang ASAS/ASAT', sampul: 'Sampul Amplop ASAS/ASAT', rekap: 'Rekap Kehadiran ASAS/ASAT', rekapSemua: 'Rekap Kehadiran Semua Kelas ASAS/ASAT' };
// Cetak selalu memakai data TERSIMPAN. Fungsi ini mendeteksi isian/draft di layar yang belum disimpan.
function aujDraftBeda(jenis, rec) {
  const j = JSON.stringify, v = x => (x == null ? '' : String(x)).trim();
  if (jenis === 'hadir') {
    const pw = o => Object.keys(o || {}).filter(k => o[k]).sort().join(',');
    return j(aujHadir) !== j(rec.hadirPeserta || {}) || pw(aujHadirPengawas) !== pw(aujPwHadirEfektif(rec));
  }
  if (jenis === 'denah' && aujDenahAsli !== null && aujFotoDenah(rec) !== aujDenahAsli) return true;
  if (jenis === 'denah') return aujGabung ? !aujKursiSama(aujKursi, aujKursiGabungan(aujGrupRuang(rec))) : j(aujKursi) !== j(rec.kursi || {});
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
  aujPeringatDraft([{ rekap: 'hadir', rekapSemua: 'hadir' }[jenis] || jenis], rec);
  aujCetakHtml(AUJ_CETAK[jenis](rec), `${AUJ_JUDUL[jenis]} - ${rec.kelas || ''} ${rec.ruang || ''}`, { pintu: AUJ_CSS_PINTU, rekap: AUJ_CSS_REKAP, rekapSemua: AUJ_CSS_REKAP }[jenis]);
}
function aujCetakSemua() {
  const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
  if (!aujKonfirmasiBA(rec)) return;
  aujPeringatDraft(['hadir', 'tatib', 'denah', 'ba'], rec);
  const sertakanSk = aujSkMuatKey === aujSkKunci() && !!aujSk && confirm('Sertakan SK Panitia + Lampiran I dan II di awal paket ini?\n\nOK = ikut dicetak, Batal = hanya berkas ruang.');
  aujCetakHtml((sertakanSk ? aujCetakSkHtml(Object.assign(aujSkDefault(), aujSk)) : '') + ['hadir', 'tatib', 'denah', 'ba'].map(j => AUJ_CETAK[j](rec)).join(''), `Berkas Administrasi ASAS/ASAT - ${rec.kelas || ''} ${rec.ruang || ''}`);
}
// Teks umum "ASAS/ASAT" di berkas cetak diganti sesuai asesmen aktif (ASAS pada Gasal, ASAT pada Genap); istilah "Ganjil" dicetak "Gasal".
function aujSusunTeks(t) {
  const kodeA = aujKodeAsesmen((aujRec() || {}).nama);
  return String(t == null ? '' : t).replace(/ASAS\/ASAT/g, kodeA).replace(/\bGanjil\b/g, 'Gasal').replace(/\bGANJIL\b/g, 'GASAL');
}
function aujCetakHtml(bodyHtml, judul, cssKhusus) {
  bodyHtml = aujSusunTeks(bodyHtml); judul = aujSusunTeks(judul);
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
// Dua sesi "satu ruang": tanggal, nama asesmen, dan ruang sama, jam bertumpuk (atau sama). Kelas-kelas seperti ini mengawas bersama:
// bukan bentrok, pengawasnya sama, dan honornya dibayar sekali per ruang.
function aujSatuRuang(a, b) {
  if (!a || !b || !a.ruang || !b.ruang || !a.tanggal || a.tanggal !== b.tanggal || aujNormNama(a.nama) !== aujNormNama(b.nama)) return false;
  if (aujNormNama(a.ruang) !== aujNormNama(b.ruang)) return false;
  return aujTumpang(a, b) || (!!a.jamMulai && a.jamMulai === b.jamMulai);
}
// Aturan: kelas-kelas yang satu ruang pada jam yang sama HARUS mengerjakan mapel yang sama (1 sesi = 1 mapel = 1 ruang).
// Mengembalikan pasangan sesi satu ruang yang mapelnya berbeda. Sesi tanpa mapel diabaikan. wajibSalahSatu: hanya pasangan yang melibatkan sesi dengan _baru.
function aujMapelBedaSatuRuang(daftar, hanyaBaru) {
  const out = [], perTgl = {};
  (daftar || []).forEach(r => { if (r && r.tanggal && r.ruang) (perTgl[r.tanggal] = perTgl[r.tanggal] || []).push(r); });
  Object.keys(perTgl).sort().forEach(t => {
    const g = perTgl[t];
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = g[i], b = g[j];
      if (hanyaBaru && !a._baru && !b._baru) continue;
      if (!a.mapel || !b.mapel || aujNormNama(a.mapel) === aujNormNama(b.mapel) || !aujSatuRuang(a, b)) continue;
      out.push({ a, b });
    }
  });
  return out;
}
function aujTeksMapelBeda(x) {
  return `Ruang ${x.a.ruang}, ${aujTglPendek(x.a.tanggal)} ${x.a.jamMulai || ''}: ${x.a.kelas || '-'} = ${x.a.mapel} sedangkan ${x.b.kelas || '-'} = ${x.b.mapel}`;
}
// Lipat sesi satu ruang menjadi satu baris (kelas digabung "Kelas 1 + Kelas 2"; pengawas dari anggota pertama yang punya).
// Dipakai untuk hitungan beban dan jadwal mengawas guru, supaya satu ruang tidak dihitung dobel.
function aujLipatRuang(daftar) {
  const out = [];
  (daftar || []).forEach(r => {
    const i = out.findIndex(y => aujSatuRuang(y, r));
    if (i < 0) { out.push(Object.assign({}, r, { _anggota: [r] })); return; }
    out[i]._anggota.push(r);
  });
  return out.map(o => {
    if (o._anggota.length < 2) { delete o._anggota; return o; }
    const a = o._anggota, kelas = [], mapel = [];
    a.forEach(x => { if (x.kelas && kelas.indexOf(x.kelas) < 0) kelas.push(x.kelas); if (x.mapel && mapel.indexOf(x.mapel) < 0) mapel.push(x.mapel); });
    const p1 = a.find(x => x.pengawas1), p1id = p1 ? aujIdPengawas(p1.pengawas1) : '';
    const p2 = a.find(x => x.pengawas2 && aujIdPengawas(x.pengawas2) !== p1id);
    delete o._anggota;
    return Object.assign(o, { kelas: kelas.join(' + '), mapel: mapel.join(' / ') || o.mapel,
      pengawas1: p1 ? p1.pengawas1 : null, pengawas1Key: p1 ? p1.pengawas1Key : null, pengawas2: p2 ? p2.pengawas2 : null, pengawas2Key: p2 ? p2.pengawas2Key : null });
  });
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
      if (!aujTumpang(g[i], g[j]) || aujSatuRuang(g[i], g[j])) continue;   // satu ruang = mengawas bersama, bukan bentrok
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
  const c = { key: '__form__', kelas: cand.kelas, tanggal: cand.tanggal, jamMulai: cand.jamMulai, jamSelesai: cand.jamSelesai, pengawas1: cand.pengawas1, pengawas2: cand.pengawas2, ruang: cand.ruang, nama: cand.nama, mapel: cand.mapel };
  const msgs = [];
  const n1 = aujIdPengawas(c.pengawas1), n2 = aujIdPengawas(c.pengawas2);
  if (n1 && n1 === n2) msgs.push('Pengawas 1 dan Pengawas 2 adalah orang yang sama.');
  lain.forEach(x => {   // kelas yang sama tidak boleh punya dua sesi bertumpuk; satu ruang dipakai asesmen berbeda pada jam bertumpuk = bentrok
    if (!c.tanggal || x.tanggal !== c.tanggal || !aujTumpang(c, x)) return;
    if (c.kelas && x.kelas === c.kelas) msgs.push(`${c.kelas} sudah punya sesi pada jam bertumpuk: ${aujLabelSesi(x)}.`);
    else if (c.ruang && aujNormNama(x.ruang) === aujNormNama(c.ruang) && !aujSatuRuang(c, x)) msgs.push(`Ruang ${x.ruang} sudah dipakai ${aujLabelSesi(x)} pada jam bertumpuk.`);
  });
  aujMapelBedaSatuRuang(lain.concat([c])).filter(x => x.a === c || x.b === c).forEach(x => msgs.push('Satu ruang harus mapel yang sama — ' + aujTeksMapelBeda(x) + '.'));
  (aujCariBentrok(lain.concat([c])).perKey.__form__ || []).forEach(h => msgs.push(`${h.nama} juga mengawas ${aujLabelSesi(h.lawan)} pada ${aujTglIndo(h.lawan.tanggal, true)}.`));
  return msgs;
}
// Isian awal sesi baru (denah lokasi + tata tertib): tiap isian diambil dari sesi terbaru yang MEMILIKI isian itu.
function aujAcuanSesi() {
  const u = aujUrutSesi(), ambil = f => { const x = u.find(r => r && r[f]); return x ? x[f] : null; };
  return { lokasiDenah: ambil('lokasiDenah'), lokasiCatatan: ambil('lokasiCatatan'), tatibPeserta: ambil('tatibPeserta'), tatibPengawas: ambil('tatibPengawas') };
}
// Denah kursi diwarisi: sesi baru memakai denah (ukuran, pintu, kursi) dari sesi lain yang ruang & kelasnya sama (asesmen mana pun,
// yang terbaru lebih dulu), jadi denah tidak perlu disusun ulang tiap asesmen/sesi. Hanya siswa yang ada di daftar peserta sesi baru yang
// dibawa. Bila kursinya bertabrakan dengan kelas lain yang satu ruang & jam, sesi itu dibiarkan tanpa denah (susun di tab Denah, mode gabungan).
// Mengubah objek yang dikirim (data sesi yang belum disimpan); tidak menyentuh database.
function aujWarisiDenah(daftar) {
  const urut = aujUrutSesi(), sudah = [];
  (daftar || []).forEach(d => {
    if (!d || !d.ruang || !d.kelas || !d.pesertaSnap || typeof d.pesertaSnap !== 'object') return;
    const sah = new Set(Object.keys(d.pesertaSnap)), ruangN = aujNormNama(d.ruang);
    const sumber = urut.find(x => x.kursi && Object.keys(x.kursi).length && x.kelas === d.kelas && aujNormNama(x.ruang) === ruangN);
    if (!sumber) return;
    const kt = {}; Object.keys(sumber.kursi).forEach(k => { if (sah.has(sumber.kursi[k])) kt[k] = sumber.kursi[k]; });
    if (!Object.keys(kt).length) return;
    const dipakai = new Set();
    allAdmUjian.forEach(x => { if (aujSatuRuang(x, d)) Object.keys(x.kursi || {}).forEach(k => dipakai.add(k)); });
    sudah.forEach(t => { if (aujSatuRuang(t, d)) Object.keys(t.kursi).forEach(k => dipakai.add(k)); });
    if (Object.keys(kt).some(k => dipakai.has(k))) return;
    d.kursi = kt;
    ['denahBaris', 'denahKolom', 'denahPerBangku', 'denahPintu'].forEach(f => { if (sumber[f] != null && sumber[f] !== '') d[f] = sumber[f]; });
    sudah.push(d);
  });
}
// Bentrok kelas & ruang untuk sesi yang akan dibuat massal / salin (sama dengan yang dicek form Sesi Baru): dibandingkan dengan sesi tersimpan
// dan dengan sesi baru lain di daftar yang sama. Kelas yang sama tidak boleh punya dua sesi bertumpuk; satu ruang dipakai asesmen lain pada
// jam bertumpuk = bentrok (kelas lain dari asesmen yang sama di ruang yang sama = satu ruang, bukan bentrok).
function aujCekTumpangBaru(baru) {
  const perBaris = [], contoh = [];
  (baru || []).forEach((b, i) => {
    const msgs = [];
    allAdmUjian.concat(baru.slice(0, i)).forEach(x => {
      if (!b.tanggal || x.tanggal !== b.tanggal || !aujTumpang(b, x)) return;
      if (b.kelas && x.kelas === b.kelas) msgs.push(`${b.kelas} sudah punya sesi pada jam bertumpuk: ${aujLabelSesi(x)}`);
      else if (b.ruang && aujNormNama(x.ruang) === aujNormNama(b.ruang) && !aujSatuRuang(b, x)) msgs.push(`Ruang ${x.ruang} sudah dipakai ${aujLabelSesi(x)}`);
    });
    perBaris.push(msgs);
    msgs.forEach(m => { if (contoh.length < 3 && contoh.indexOf(m) < 0) contoh.push(m); });
  });
  return { perBaris, jumlah: perBaris.filter(m => m.length).length, contoh };
}
function aujCekBentrokForm() {
  const box = aujEl('aujWarnBentrok'); if (!box) return;
  const c = { kelas: aujVal('aujKelas'), tanggal: aujVal('aujTanggal'), jamMulai: aujVal('aujJamMulai'), jamSelesai: aujVal('aujJamSelesai'), pengawas1: aujVal('aujPengawas1'), pengawas2: aujVal('aujPengawas2'), ruang: aujVal('aujRuang'), nama: aujVal('aujNama'), mapel: aujVal('aujMapel') };
  const msgs = aujPesanBentrokSesi(c);
  if (msgs.length) {
    box.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;">
      <strong>⚠️ Jadwal bentrok</strong><ul style="margin:4px 0 0 18px;">${msgs.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
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
  aujBaru = true; aujAktifKey = null; aujTabAktif = 'sesi'; aujKursi = {}; aujGabung = false; aujHadir = {}; aujHadirPengawas = {}; aujSel = null;
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
  if (aujJdwNama && !uniq('nama').includes(aujJdwNama)) aujJdwNama = '';     // filter yang opsinya sudah tidak ada (sesi dihapus/diurungkan) di-reset
  if (aujJdwKelas && !uniq('kelas').includes(aujJdwKelas)) aujJdwKelas = '';
  const lain = `${ed ? '<button class="btn btn-soft" onclick="aujToggleSalin()" title="Salin jadwal satu asesmen ke asesmen baru (mis. ASAS ke ASAT)">📑 Salin Jadwal</button>' : ''}${ed ? '<button class="btn btn-soft" onclick="aujIsiPengawasKosong()" title="Isi slot pengawas yang kosong, dibagi rata (mengikuti filter di bawah)">🤖 Isi Pengawas Kosong</button>' : ''}${ed ? '<button class="btn btn-soft" onclick="aujToggleBh()" title="Ganti satu guru yang berhalangan di semua sesi mengawasnya">🙋 Pengawas Berhalangan</button>' : ''}${ed ? '<button class="btn btn-soft" style="color:#b91c1c;" onclick="aujHapusSemua()" ' + (allAdmUjian.length ? '' : 'disabled') + ' title="Hapus semua sesi pada daftar (mengikuti filter Asesmen/Kelas). Sesi yang sudah punya check-in honor dilewati.">🗑️ Hapus Semua Sesi (' + aujJadwalTersaring().length + ')</button>' : ''}${ed ? '<button class="btn btn-soft" onclick="aujTampilPeriksa()" title="Cocokkan jadwal, Daftar Hadir, check-in, dan susulan">🔎 Periksa Honor</button>' : ''}${ed ? '<button class="btn btn-primary" onclick="aujBuatSesiHonor()" title="Buat sesi honor pengawas dari jadwal (mengikuti filter di bawah)">💰 Buat Sesi Honor</button>' : ''}${ed ? aujHtmlTombolUrungkan() : ''}${ed && aujSesiBedaDurasi(aujJadwalTersaring()).length ? `<button class="btn btn-soft" onclick="aujSeragamkanDurasi()" title="Ubah jam selesai semua sesi yang tampil menjadi jam mulai + ${AUJ_DURASI_MENIT} menit">⏱️ Seragamkan ${AUJ_DURASI_MENIT} menit (${aujSesiBedaDurasi(aujJadwalTersaring()).length})</button>` : ''}${ed || aujEsKepsek() ? '<button class="btn btn-soft" onclick="aujToggleBeban()" title="Jumlah sesi & jam mengawas tiap guru (mengikuti filter di bawah)">📊 Rekap Beban</button>' : ''}${aujHanyaGuru() ? '' : '<button class="btn btn-soft" onclick="aujToggleGuru()" title="Jadwal mengawas per guru, bisa dicetak">👤 Jadwal per Guru</button>'}${aujHanyaGuru() ? '' : '<button class="btn btn-soft" onclick="aujUbahKetuaPanitia()" title="Nama Ketua Panitia yang tercetak di tanda tangan Jadwal, Rekap Beban, dan Jadwal Mengawas">✍️ Ketua Panitia</button>'}`.trim();
  const opt = (arr, sel, semua) => `<option value="">${semua}</option>` + arr.map(v => `<option value="${escapeHtml(v)}" ${v === sel ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">📅 Jadwal Ujian — TA ${escapeHtml(currentTahunAjaran || '')}</h4>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${ed ? '<button class="btn btn-success" onclick="aujToggleMassal()">🗓️ Jadwal Massal</button>' : ''}
        <button class="btn btn-primary" onclick="aujCetakJadwal()" ${allAdmUjian.length ? '' : 'disabled'}>🖨️ Cetak Jadwal</button>
        <button class="btn btn-soft" onclick="aujCetakJadwal('ringkas')" ${allAdmUjian.length ? '' : 'disabled'} title="Semua ruang dalam satu tabel (tanggal/jam x ruang), biasanya muat satu lembar F4">📄 Cetak Ringkas</button>
      </div>
    </div>
    ${lain ? `<details style="margin-bottom:10px;"><summary style="cursor:pointer;font-size:12px;color:#475569;">⚙️ Alat lainnya</summary><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">${lain}</div></details>` : ''}
    <div id="aujPeriksaIsi"></div>
    <div id="aujJdwMassal">${ed && aujMassalBuka ? aujHtmlMassal() : ''}</div>
    <div id="aujJdwSalin">${ed && aujSalinBuka ? aujHtmlSalin() : ''}</div>
    <div id="aujJdwBhl">${ed && aujBhBuka ? aujHtmlBh() : ''}</div>
    <div id="aujBebanBox">${(ed || aujEsKepsek()) && aujBebanBuka ? aujHtmlBeban() : ''}</div>
    <div id="aujGuruBox">${aujHanyaGuru() || aujGuruBuka ? aujHtmlPerGuru() : ''}</div>
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
  aujSegarkanPanelJadwal();   // rekap beban & jadwal per guru ikut filter
}
function aujHtmlJadwalIsi() {
  if (!allAdmUjian.length) return `<p style="color:#6b7280;font-size:13px;">Belum ada jadwal.${aujCanEdit() ? ' Klik <strong>🗓️ Jadwal Massal</strong> untuk membuat banyak sesi sekaligus, atau <strong>➕ Sesi Baru</strong> untuk satu sesi.' : ' Admin perlu membuatnya dulu.'}</p>`;
  const daftar = aujJadwalTersaring(), ed = aujCanEdit();
  const bt = aujCariBentrok(allAdmUjian);
  const urut = bt.pasangan.slice().sort((x, y) => (x.a.tanggal || '').localeCompare(y.a.tanggal || '') || (x.a.jamMulai || '').localeCompare(y.a.jamMulai || ''));
  const banner = urut.length ? `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px;">
      <strong>⚠️ ${urut.length} pengawas bentrok</strong> (mengawas dua sesi yang jamnya bertumpuk):
      <ul style="margin:4px 0 0 18px;">${urut.slice(0, 3).map(p => `<li><strong>${escapeHtml(p.nama)}</strong> — ${escapeHtml(aujTglIndo(p.a.tanggal, true))}: ${escapeHtml(aujLabelSesi(p.a))} ⇄ ${escapeHtml(aujLabelSesi(p.b))}</li>`).join('')}${urut.length > 3 ? `<li>…dan ${urut.length - 3} lainnya (lihat tanda ⚠️ di daftar)</li>` : ''}</ul></div>` : '';
  // Daftar hanya menampilkan kelas yang SUDAH punya sesi. Tunjukkan kelas yang belum, supaya tidak dikira daftarnya terpotong.
  const namaAcuan = aujJdwNama || (new Set(allAdmUjian.map(x => x.nama).filter(Boolean)).size === 1 ? allAdmUjian[0].nama : '');
  let petunjuk = '';
  if (namaAcuan && typeof KELAS_LIST !== 'undefined' && Array.isArray(KELAS_LIST)) {
    const sudah = new Set(allAdmUjian.filter(x => x.nama === namaAcuan).map(x => x.kelas)), belum = KELAS_LIST.filter(k => !sudah.has(k));
    if (sudah.size && belum.length) petunjuk = `<div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:10px;">ℹ️ <strong>${escapeHtml(namaAcuan)}</strong> baru punya sesi untuk ${[...sudah].map(escapeHtml).join(', ')}. Belum ada sesi untuk <strong>${belum.map(escapeHtml).join(', ')}</strong>.${ed ? ' Buat lewat <strong>🗓️ Jadwal Massal</strong> dengan mencentang <strong>🏫 Beberapa kelas sekaligus</strong> (tanpa centang itu, hanya satu kelas yang dibuat).' : ''}</div>`;
  }
  if (!daftar.length) return petunjuk + banner + '<p style="color:#6b7280;font-size:13px;">Tidak ada sesi untuk filter ini.</p>';
  const th = 'padding:4px 8px;border-bottom:1px solid #cbd5e1;text-align:left;white-space:nowrap;font-weight:600;font-size:11px;color:#64748b;';
  let tglLalu = null;
  const baris = daftar.map(r => {
    const baru = r.tanggal !== tglLalu; tglLalu = r.tanggal;
    const bn = (bt.perKey[r.key] || []).map(h => aujIdPengawas(h.nama));
    const pwArr = [r.pengawas1, r.pengawas2].filter(Boolean);
    const pw = pwArr.length ? pwArr.map(n => bn.includes(aujIdPengawas(n)) ? `<span style="color:#b91c1c;font-weight:600;" title="Bentrok dengan sesi lain pada jam yang sama">⚠️ ${escapeHtml(n)}</span>` : escapeHtml(n)).join(' · ') : '<span style="color:#9ca3af;">belum ada pengawas</span>';
    const kepala = baru ? `<tr><td colspan="5" style="padding:12px 8px 4px;font-weight:700;font-size:13px;color:#0f172a;">${escapeHtml(aujTglIndo(r.tanggal, true))}</td></tr>` : '';
    const td = 'padding:5px 8px;vertical-align:top;border-top:1px solid #f1f5f9;';
    return kepala + `<tr style="${bn.length ? 'background:#fef2f2;' : ''}">
      <td style="${td}white-space:nowrap;color:#475569;">${r.jamMulai && r.jamSelesai ? escapeHtml(r.jamMulai) + '–' + escapeHtml(r.jamSelesai) : '—'}</td>
      <td style="${td}font-weight:600;">${escapeHtml(r.mapel || r.nama || '-')}</td>
      <td style="${td}white-space:nowrap;">${escapeHtml(r.kelas || '-')} · ${escapeHtml(r.ruang || '-')}</td>
      <td style="${td}font-size:12px;color:#64748b;">${pw}${aujSesiHonorDari(r.key) ? ' <span title="Sesi honor sudah dibuat">💰</span>' : ''}</td>
      <td style="${td}white-space:nowrap;text-align:right;"><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="aujBukaSesi('${escapeJs(r.key)}')">${ed ? 'Buka' : 'Lihat'}</button>${ed ? ` <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="aujDuplikat('${escapeJs(r.key)}')" title="Duplikat sesi">📑</button>` : ''}</td>
    </tr>`;
  }).join('');
  return petunjuk + banner + `<p style="font-size:12px;color:#6b7280;margin-bottom:2px;">${daftar.length} sesi${daftar.length !== allAdmUjian.length ? ` (dari ${allAdmUjian.length}, filter aktif: ${escapeHtml(aujKetFilter())})` : ''}</p>
    <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr><th style="${th}">Jam</th><th style="${th}">Mata Pelajaran</th><th style="${th}">Kelas · Ruang</th><th style="${th}">Pengawas</th><th style="${th}"></th></tr></thead>
      <tbody>${baris}</tbody></table></div>`;
}

// ---------- Jadwal massal ----------
const AUJ_MASSAL_MAKS_HARI = 90;
const AUJ_HARI_URUT = [1, 2, 3, 4, 5, 6, 0];   // Senin..Minggu (angka = Date.getDay())
function aujFmtTgl(dt) { const p = n => String(n).padStart(2, '0'); return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`; }

// Murni (tidak menyentuh layar/database) supaya mudah diuji. p = { nama, kelas, ruang, tglMulai, tglSelesai, hari:[0-6],
// libur:'teks berisi YYYY-MM-DD', slot1:{m,s}, slot2:{m,s}, mapelTeks, p1, p2 }.
// Mapel diisi berurutan: slot 1 hari ke-1, slot 2 hari ke-1, slot 1 hari ke-2, dst.
// Fase Kurikulum Merdeka untuk MI: A = kelas 1-2, B = kelas 3-4, C = kelas 5-6 (nama kelas boleh "Kelas 3", "3A", atau "III").
function aujFaseKelas(nama) {
  const t = String(nama || ''), m = /(\d+)/.exec(t); let n = m ? +m[1] : 0;
  if (!n) { const r = /\b(VI|IV|V|III|II|I)\b/i.exec(t); n = r ? { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }[r[1].toUpperCase()] : 0; }
  return n >= 1 && n <= 2 ? 'A' : (n >= 3 && n <= 4 ? 'B' : (n >= 5 && n <= 6 ? 'C' : null));
}
// Tanggal LIBUR dari Kalender Akademik (jenis 'libur', rentang tanggalMulai-tanggalSelesai diperluas per hari; sama aturannya dengan honor-guru.js).
function aujTanggalLiburKalender() {
  const out = new Set(), sumber = (typeof allKalenderAkademik !== 'undefined' && allKalenderAkademik) ? allKalenderAkademik : [];
  const daftar = Array.isArray(sumber) ? sumber : Object.values(sumber), murni = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  daftar.forEach(e => {
    if (!e || typeof e !== 'object' || e.jenis !== 'libur') return;
    const mulai = e.tanggalMulai, akhir = e.tanggalSelesai || e.tanggalMulai;
    if (!murni(mulai) || !murni(akhir) || akhir < mulai) return;
    if ((Date.parse(akhir + 'T00:00:00Z') - Date.parse(mulai + 'T00:00:00Z')) / 86400000 > 62) return;   // rentang > 62 hari hampir pasti salah ketik
    let cur = mulai;
    for (let i = 0; i < 63 && cur <= akhir; i++) { out.add(cur); const x = new Date(cur + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); cur = x.toISOString().slice(0, 10); }
  });
  return out;
}
const AUJ_FASE = { A: 'Fase A (Kelas 1–2)', B: 'Fase B (Kelas 3–4)', C: 'Fase C (Kelas 5–6)' };
const AUJ_BUKAN_MAPEL = /istirahat|upacara|\bapel\b|pramuka|ekskul|ekstra|dhuha|dzuhur|zuhur|ishoma|kegiatan/i;   // baris Jadwal yang jelas bukan mata pelajaran ujian
// Mapel unik (urutan kemunculan) dari Jadwal Pelajaran untuk sekumpulan kelas.
function aujMapelDariJadwal(kelasArr) {
  const jd = (typeof allJadwal !== 'undefined' && Array.isArray(allJadwal)) ? allJadwal : [], ada = new Set(kelasArr), lihat = {}, out = [];
  jd.forEach(j => {
    if (!j || !ada.has(j.kelas)) return;
    const m = String(j.mapel || '').trim(), k = aujNormNama(m);
    if (!m || AUJ_BUKAN_MAPEL.test(m) || lihat[k]) return;
    lihat[k] = 1; out.push(m);
  });
  return out;
}
// Jarak ketikan (Levenshtein) untuk menebak nama mapel di Jadwal Pelajaran yang paling mirip.
function aujJarakTeks(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = []; for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function aujSaranMapel(mapel) {
  const jd = (typeof allJadwal !== 'undefined' && Array.isArray(allJadwal)) ? allJadwal : [], n = aujNormNama(mapel), lihat = {}; let terbaik = '', skor = 1e9;
  jd.forEach(j => {
    const nm = String((j && j.mapel) || '').trim(), k = aujNormNama(nm);
    if (!nm || lihat[k] || AUJ_BUKAN_MAPEL.test(nm)) return; lihat[k] = 1;
    const d = (k.indexOf(n) >= 0 || n.indexOf(k) >= 0) ? 1 : aujJarakTeks(n, k);
    if (d < skor) { skor = d; terbaik = nm; }
  });
  return terbaik && skor <= Math.max(2, Math.floor(n.length * 0.15)) ? terbaik : '';
}
// Himpunan mapel (nama dinormalisasi) yang diampu satu kelas menurut Jadwal Pelajaran; null bila kelas itu belum punya data jadwal.
function aujMapelDiampu(kelas) {
  const jd = (typeof allJadwal !== 'undefined' && Array.isArray(allJadwal)) ? allJadwal : [], out = new Set();
  jd.forEach(j => { if (j && j.kelas === kelas && j.mapel && !AUJ_BUKAN_MAPEL.test(String(j.mapel))) out.add(aujNormNama(j.mapel)); });
  return out.size ? out : null;
}
function aujIsiMapelJadwal(tujuan) {
  // Mode "Beberapa kelas sekaligus": kelas diambil dari kelas yang dicentang (kolom pilihan satu kelas tidak dipakai di mode itu).
  const multi = !!(aujEl('aujMsMulti') && aujEl('aujMsMulti').checked);
  const kelas = tujuan === 'single'
    ? (multi ? [...document.querySelectorAll('.aujMsKelasCek')].filter(c => c.checked).map(c => c.value) : [aujVal('aujMsKelas')].filter(Boolean))
    : KELAS_LIST.filter(k => aujFaseKelas(k) === tujuan);
  if (!kelas.length) return toast(tujuan === 'single' ? (multi ? 'Centang minimal satu kelas dulu.' : 'Pilih kelas dulu.') : 'Tidak ada kelas di fase ini.', true);
  const daftar = aujMapelDariJadwal(kelas);
  if (!daftar.length) return toast('Belum ada mapel di Jadwal Pelajaran untuk kelas ini (atau jadwal belum dimuat). Ketik manual.', true);
  const ta = aujEl(tujuan === 'single' ? 'aujMsMapel' : 'aujMsMapelFase_' + tujuan); if (!ta) return;
  if (ta.value.trim() && !confirm('Daftar mapel yang sekarang akan diganti. Lanjutkan?')) return;
  ta.value = daftar.join('\n'); aujMassalSimpanDraft();
  toast(`✅ ${daftar.length} mapel diambil dari Jadwal. Periksa urutannya dan hapus yang bukan mapel ujian.`, false, 5000);
}
// Aturan lewat manual: "Kelas 1, Kelas 2: Mapel A; Mapel B". Kelas: nama, angka, rentang 1-3, atau "semua". Mapel dipisah titik koma (nama mapel boleh memuat koma).
function aujParseLewat(teks) {
  const out = [];
  String(teks || '').split(/\r?\n/).forEach(l => {
    const m = /^(.+?)\s*:\s*(.+)$/.exec(l.trim()); if (!m) return;
    const kelas = []; m[1].split(/\s*(?:,|\+|&)\s*/).forEach(g => {
      g = g.trim(); if (!g) return;
      const r = /^(?:kelas\s*)?(\d+)\s*[-–]\s*(?:kelas\s*)?(\d+)$/i.exec(g);
      if (r) { for (let i = +r[1]; i <= +r[2] && i - r[1] < 12; i++) kelas.push(String(i)); } else kelas.push(g);
    });
    const mapel = m[2].split(/\s*[;|]\s*/).map(x => x.trim()).filter(Boolean);
    if (kelas.length && mapel.length) out.push({ teks: l.trim(), kelas, mapel, dipakai: false });
  });
  return out;
}
function aujLewatCocokKelas(aturan, kelas) {
  const n = aujNormNama;
  return aturan.kelas.some(g => n(g) === 'semua' || n(g) === n(kelas) || n('Kelas ' + g) === n(kelas));
}
// Aturan pengganti: satu per baris, "Kelas 1: Bahasa Arab = Tahfidz Quran" atau tanpa kelas (berlaku semua kelas). Pemisah: = => -> → >
function aujParsePengganti(teks) {
  const out = [];
  String(teks || '').split(/\r?\n/).forEach(l => {
    const m = /^(?:(.+?)\s*[:|]\s*)?(.+?)\s*(?:=>|->|→|=|>)\s*(.+)$/.exec(l.trim());
    if (m && m[2].trim() && m[3].trim()) out.push({ kelas: m[1] ? m[1].trim() : '', dari: m[2].trim(), ke: m[3].trim() });
  });
  return out;
}
function aujCariPengganti(aturan, kelas, mapel) {
  const n = aujNormNama, cocokKelas = g => n(g) === n(kelas) || n('Kelas ' + g) === n(kelas), dari = n(mapel);
  return aturan.find(a => a.kelas && cocokKelas(a.kelas) && n(a.dari) === dari) || aturan.find(a => !a.kelas && n(a.dari) === dari) || null;
}
// Isi slot yang dilewati (kelas tidak mengampu) dengan mapel pengganti, hanya bila aman. Mengubah gabung.baris; mengembalikan { diganti, gagal }.
function aujTerapkanPengganti(baris, dilewati, aturan) {
  const n = aujNormNama, diganti = [], gagal = [];
  dilewati.forEach(r => {
    const a = aujCariPengganti(aturan, r.kelas, r.mapel); if (!a) return;
    const rep = a.ke, ampu = aujMapelDiampu(r.kelas), gagalKarena = alasan => gagal.push({ kelas: r.kelas, dari: r.mapel, ke: rep, tanggal: r.tanggal, alasan });
    if (ampu && !ampu.has(n(rep))) return gagalKarena('kelas ini tidak mengampu ' + rep);
    if (baris.some(b => b.kelas === r.kelas && n(b.mapel) === n(rep))) return gagalKarena(rep + ' sudah dijadwalkan untuk kelas ini');
    const lain = baris.find(b => b.kelas !== r.kelas && n(b.ruang) === n(r.ruang) && b.tanggal === r.tanggal && b.jamMulai === r.jamMulai && n(b.mapel) !== n(rep));
    if (lain) return gagalKarena('ruang ' + r.ruang + ' dipakai ' + lain.kelas + ' untuk ' + lain.mapel + ' pada jam yang sama');
    baris.push(Object.assign({}, r, { mapel: rep, _pengganti: true }));
    diganti.push({ kelas: r.kelas, dari: r.mapel, ke: rep, tanggal: r.tanggal });
  });
  return { diganti, gagal };
}
function aujHitungMassal(p) {
  if (!p.multi) return aujHitungMassal1(p);
  const err = m => ({ error: m }), daftar = p.kelasList || [];
  if (!daftar.length) return err('Centang minimal satu kelas.');
  const ruangDipakai = {}, ruangSama = [];   // ruang yang sama untuk >1 kelas = peringatan di pratinjau, bukan larangan
  for (const x of daftar) {
    if (!x.ruang) return err(`Isi ruang untuk kelas ${x.kelas}.`);
    const rn = aujNormNama(x.ruang);
    if (ruangDipakai[rn]) ruangSama.push('Ruang "' + x.ruang + '": ' + ruangDipakai[rn] + ' dan ' + x.kelas); else ruangDipakai[rn] = x.kelas;
  }
  if ((p.p1 || p.p2) && Object.keys(ruangDipakai).length > 1) return err('Pengawas manual (Pengawas 1/2) hanya bisa dipakai bila semua kelas berada di SATU ruang yang sama. Untuk ruang berbeda pasti bentrok: kosongkan, lalu pakai pengawas otomatis atau isi per sesi nanti.');
  const adaDiJadwal = new Set(); daftar.forEach(x => { const a = aujMapelDiampu(x.kelas); if (a) a.forEach(m => adaDiJadwal.add(m)); });   // mapel yang diampu minimal satu kelas; di luar itu = mapel tambahan (tidak ada di Jadwal Pelajaran), tidak dilewati otomatis
  let gabung = null; const lewatTakAmpu = [], tanpaJadwal = [], dilewatiBaris = [], mapelDaftar = [], kelasBerjadwal = [], lewatManual = [], aturanLewat = aujParseLewat(p.lewatTeks);
  // Pengelompokan: mapel yang TIDAK diikuti semua kelas (menurut Jadwal Pelajaran atau aturan "tidak diujikan") dikumpulkan di hari-hari terakhir,
  // supaya kelas yang tidak mengikutinya selesai lebih awal dan tidak punya hari yang hanya berisi satu mapel.
  let kelompokInfo = null, teksSeragam = p.mapelTeks, sebarSeragam = p.sebar;
  if (p.kelompok && !p.perFase) {
    const seen = {}, daftarMapel = aujBarisTeks(p.mapelTeks).filter(m => { const k = aujNormNama(m); if (seen[k]) return false; seen[k] = 1; return true; });
    const slotKe = (p.slot2 && p.slot2.m && p.slot2.s) ? 2 : 1;
    const ikut = (kelas, m) => {
      const k = aujNormNama(m);
      if (aturanLewat.some(a => aujLewatCocokKelas(a, kelas) && a.mapel.some(z => aujNormNama(z) === k))) return false;
      if (p.lewatTakAmpu) { const ampu = aujMapelDiampu(kelas); if (ampu && adaDiJadwal.has(k) && !ampu.has(k)) return false; }
      return true;
    };
    const info = daftarMapel.map((m, i) => { const sig = daftar.map(x => ikut(x.kelas, m)); return { m, i, sig, jml: sig.filter(Boolean).length, kunci: sig.map(v => v ? '1' : '0').join('') }; });
    const awalKunci = {}; info.forEach(x => { if (x.jml < daftar.length && !(x.kunci in awalKunci)) awalKunci[x.kunci] = x.i; });   // kelompok dengan peserta kelas sama berdampingan; urutan antar kelompok mengikuti daftar mapel Anda
    const terbatas = info.filter(x => x.jml < daftar.length).sort((a, b) => (awalKunci[a.kunci] - awalKunci[b.kunci]) || (a.i - b.i)), biasa = info.filter(x => x.jml === daftar.length).map(x => x.m);
    if (terbatas.length && biasa.length) {
      let urutBiasa = biasa, sus = null;
      const berat = new Set(String(p.berat || '').split('|').map(aujNormNama).filter(Boolean));
      if (p.sebar !== false && biasa.some(m => berat.has(aujNormNama(m)))) { sus = aujSusunMapel(biasa, berat, slotKe); urutBiasa = sus.tempat.slice().sort((a, b) => (a.d - b.d) || (a.j - b.j)).map(t => t.m); }
      teksSeragam = urutBiasa.concat(terbatas.map(x => x.m)).join('\n'); sebarSeragam = false;
      kelompokInfo = { mapel: terbatas.map(x => ({ nama: x.m, kelas: daftar.filter((_, k) => x.sig[k]).map(z => z.kelas) })), bertumpuk: sus ? sus.bertumpuk : 0, nBerat: sus ? sus.nBerat : 0, awalGanjil: slotKe > 1 && biasa.length % slotKe !== 0 };
    }
  }
  for (const x of daftar) {
    const fase = aujFaseKelas(x.kelas), mapelFase = p.perFase && fase && p.mapelFase ? String(p.mapelFase[fase] || '').trim() : '';
    const h = aujHitungMassal1(Object.assign({}, p, { kelas: x.kelas, ruang: x.ruang, mapelTeks: mapelFase || teksSeragam, sebar: mapelFase ? p.sebar : sebarSeragam }));
    if (h.error) return err(`${x.kelas}: ${h.error}`);
    if (aturanLewat.length) {   // mapel yang tidak diujikan untuk kelas ini menurut aturan Admin (berlaku di atas Jadwal Pelajaran)
      const dilewat = new Set();
      aturanLewat.forEach(a => { if (aujLewatCocokKelas(a, x.kelas)) a.mapel.forEach(m => dilewat.add(aujNormNama(m))); });
      const buang = h.baris.filter(b => dilewat.has(aujNormNama(b.mapel)));
      if (buang.length) {
        dilewatiBaris.push(...buang); h.baris = h.baris.filter(b => !dilewat.has(aujNormNama(b.mapel)));
        lewatManual.push({ kelas: x.kelas, mapel: buang.map(b => b.mapel).filter((v, i, a) => a.indexOf(v) === i) });
        aturanLewat.forEach(a => { if (aujLewatCocokKelas(a, x.kelas) && a.mapel.some(m => buang.some(b => aujNormNama(b.mapel) === aujNormNama(m)))) a.dipakai = true; });
      }
    }
    if (p.lewatTakAmpu && !mapelFase) {   // satu daftar mapel untuk semua kelas; sesi mapel yang tidak diampu kelas ini dibuang (slot lain tidak bergeser)
      const ampu = aujMapelDiampu(x.kelas);
      h.baris.forEach(b => { if (b.mapel && mapelDaftar.indexOf(b.mapel) < 0) mapelDaftar.push(b.mapel); });
      if (!ampu) tanpaJadwal.push(x.kelas);
      else {
        kelasBerjadwal.push(x.kelas);
        const buang = h.baris.filter(b => !ampu.has(aujNormNama(b.mapel)) && adaDiJadwal.has(aujNormNama(b.mapel))), buangSet = new Set(buang);
        if (buang.length) { dilewatiBaris.push(...buang); h.baris = h.baris.filter(b => !buangSet.has(b)); lewatTakAmpu.push({ kelas: x.kelas, mapel: buang.map(b => b.mapel).filter((v, i, a) => a.indexOf(v) === i) }); }
      }
    }
    if (!gabung) gabung = h; else { gabung.baris = gabung.baris.concat(h.baris); gabung.kapasitas += h.kapasitas; gabung.slotKosong += h.slotKosong; gabung.beratBertumpuk = (gabung.beratBertumpuk || 0) + (h.beratBertumpuk || 0); gabung.durasiBeda = (gabung.durasiBeda || []).concat(h.durasiBeda || []).filter((v, i, a) => a.indexOf(v) === i); gabung.hariTerpakai = Math.max(gabung.hariTerpakai, h.hariTerpakai); }
  }
  gabung.diganti = []; gabung.gagalGanti = [];
  if (dilewatiBaris.length) { const aturan = aujParsePengganti(p.penggantiTeks); if (aturan.length) { const r = aujTerapkanPengganti(gabung.baris, dilewatiBaris, aturan); gabung.diganti = r.diganti; gabung.gagalGanti = r.gagal; } }
  gabung.baris.sort((a, b) => (a.tanggal + (a.jamMulai || '') + a.kelas).localeCompare(b.tanggal + (b.jamMulai || '') + b.kelas));
  gabung.nKelas = daftar.length;
  gabung.ruangSama = ruangSama;
  gabung.lewatTakAmpu = lewatTakAmpu; gabung.tanpaJadwal = tanpaJadwal;
  gabung.kelompok = kelompokInfo; if (kelompokInfo) { gabung.beratBertumpuk = kelompokInfo.bertumpuk; gabung.nBerat = kelompokInfo.nBerat; }
  gabung.lewatManual = lewatManual; gabung.aturanLewatSia = aturanLewat.filter(a => !a.dipakai).map(a => a.teks);   // aturan yang tidak mengenai satu sesi pun (biasanya salah tulis)
  gabung.mapelTakCocok = [];   // mapel di daftar yang tidak ada di Jadwal Pelajaran kelas mana pun (biasanya beda penulisan) -> terlewati untuk semua kelas berjadwal
  if (kelasBerjadwal.length) mapelDaftar.forEach(m => { if (!kelasBerjadwal.some(k => aujMapelDiampu(k).has(aujNormNama(m)))) gabung.mapelTakCocok.push({ mapel: m, saran: aujSaranMapel(m) }); });
  return gabung;
}
function aujHitungMassal1(p) {
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
  const liburKal = p.liburKal ? aujTanggalLiburKalender() : new Set(), liburDilewati = [];
  const aw = aujBagianTgl(p.tglMulai), tanggal = [];
  for (let i = 0; ; i++) {
    if (i > AUJ_MASSAL_MAKS_HARI) return err(`Rentang tanggal terlalu panjang (maksimal ${AUJ_MASSAL_MAKS_HARI} hari).`);
    const dt = new Date(aw.y, aw.mo - 1, aw.d + i, 12), s = aujFmtTgl(dt);
    if (s > p.tglSelesai) break;
    if (p.hari.indexOf(dt.getDay()) >= 0 && !libur.has(s)) { if (liburKal.has(s)) liburDilewati.push(s); else tanggal.push(s); }
  }
  if (!tanggal.length) return err('Tidak ada hari ujian pada rentang tanggal itu (periksa hari yang dipilih dan tanggal libur).');
  const durasiBeda = slots.filter(x => aujMenit(x.s) - aujMenit(x.m) !== AUJ_DURASI_MENIT).map(x => `${x.m}–${x.s} (${aujMenit(x.s) - aujMenit(x.m)} menit)`);
  const kapasitas = tanggal.length * slots.length;
  if (mapel.length > kapasitas) return err(`Ada ${mapel.length} mata pelajaran, tetapi rentang ini hanya memuat ${kapasitas} slot (${tanggal.length} hari × ${slots.length} slot). Perpanjang rentang tanggal, tambahkan slot 2, atau kurangi mapel.`);
  const berat = new Set(String(p.berat || '').split('|').map(aujNormNama).filter(Boolean));
  const sebar = p.sebar !== false && mapel.some(m => berat.has(aujNormNama(m))) ? aujSusunMapel(mapel, berat, slots.length) : null;
  const tempat = sebar ? sebar.tempat : mapel.map((m, i) => ({ m, d: Math.floor(i / slots.length), j: i % slots.length }));
  const baris = tempat.map(t => ({
    nama: p.nama, kelas: p.kelas, ruang: p.ruang, mapel: t.m,
    tanggal: tanggal[t.d], jamMulai: slots[t.j].m, jamSelesai: slots[t.j].s,
    pengawas1: gm1 ? gm1.name : null, pengawas1Key: gm1 ? gm1.key : null, pengawas2: gm2 ? gm2.name : null, pengawas2Key: gm2 ? gm2.key : null
  }));
  return { baris, durasiBeda, beratBertumpuk: sebar ? sebar.bertumpuk : 0, nBerat: sebar ? sebar.nBerat : 0, kapasitas, hariTerpakai: Math.ceil(mapel.length / slots.length), slotKosong: kapasitas - mapel.length, liburDilewati, kalenderKosong: !!p.liburKal && liburKal.size === 0 };
}
function aujMassalAmbil() {
  const cek = [...document.querySelectorAll('.aujMsHari')];
  return {
    nama: aujVal('aujMsNama'), kelas: aujVal('aujMsKelas'), ruang: aujVal('aujMsRuang'),
    tglMulai: aujVal('aujMsTglMulai'), tglSelesai: aujVal('aujMsTglSelesai'),
    hari: cek.filter(c => c.checked).map(c => +c.value), libur: aujVal('aujMsLibur'),
    slot1: { m: aujVal('aujMsJam1M'), s: aujVal('aujMsJam1S') }, slot2: { m: aujVal('aujMsJam2M'), s: aujVal('aujMsJam2S') },
    berat: aujVal('aujMsBerat'), sebar: !(aujEl('aujMsSebar') && !aujEl('aujMsSebar').checked),
    mapelTeks: aujVal('aujMsMapel'), p1: aujVal('aujMsPengawas1'), p2: aujVal('aujMsPengawas2'),
    auto: !!(aujEl('aujMsAuto') && aujEl('aujMsAuto').checked), jmlPw: aujInt(aujVal('aujMsJmlPw'), 2, 1, 2),
    liburKal: !!(aujEl('aujMsLiburKal') && aujEl('aujMsLiburKal').checked),
    honorOtomatis: !!(aujEl('aujMsHonor') && aujEl('aujMsHonor').checked), honorNominal: aujInt(aujVal('aujMsHonorNominal'), 0, 0, 100000000),
    multi: !!(aujEl('aujMsMulti') && aujEl('aujMsMulti').checked),
    perFase: !!(aujEl('aujMsPerFase') && aujEl('aujMsPerFase').checked),
    lewatTakAmpu: !(aujEl('aujMsLewatTakAmpu') && !aujEl('aujMsLewatTakAmpu').checked),
    penggantiTeks: aujVal('aujMsPengganti'),
    lewatTeks: aujVal('aujMsLewat'),
    kelompok: !(aujEl('aujMsKelompok') && !aujEl('aujMsKelompok').checked),
    mapelFase: { A: aujVal('aujMsMapelFase_A'), B: aujVal('aujMsMapelFase_B'), C: aujVal('aujMsMapelFase_C') },
    kelasList: [...document.querySelectorAll('.aujMsKelasCek')].filter(c => c.checked).map(c => ({ kelas: c.value, ruang: aujVal('aujMsRuangK_' + c.dataset.i) })),
    ruangK: [...document.querySelectorAll('.aujMsKelasCek')].reduce((o, c) => { o[c.value] = aujVal('aujMsRuangK_' + c.dataset.i); return o; }, {})
  };
}
// Setiap isian berubah: simpan draft (supaya tidak hilang kalau layar digambar ulang) dan buang pratinjau lama.
function aujMassalSimpanDraft() {
  aujMassalDraft = aujMassalAmbil();
  aujIsiOpsiLibur();
  if (aujMassalHasil) { aujMassalHasil = null; const pv = aujEl('aujMassalPrev'); if (pv) pv.innerHTML = '<p style="font-size:12px;color:#6b7280;">Isian berubah — klik Pratinjau lagi sebelum menyimpan.</p>'; }
}
// Ruang yang terakhir dipakai sebuah kelas (sesi dengan tanggal paling baru).
function aujRuangTerakhir(kelas) {
  const r = allAdmUjian.filter(x => x.kelas === kelas && x.ruang).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b.jamMulai || '').localeCompare(a.jamMulai || ''))[0];
  return r ? r.ruang : '';
}
function aujRuangDariKelas() { const k = aujVal('aujMsKelas'), el = aujEl('aujMsRuang'); if (k && el && !el.value.trim()) aujSetPilihan('aujMsRuang', aujRuangTerakhir(k)); }
function aujRuangKelasCek(cek) { if (!cek.checked) return; const el = aujEl('aujMsRuangK_' + cek.dataset.i); if (el && !el.value.trim()) el.value = aujRuangTerakhir(cek.value); }
function aujIsiRuangOtomatis() {
  let n = 0;
  document.querySelectorAll('.aujMsKelasCek').forEach(c => { const el = aujEl('aujMsRuangK_' + c.dataset.i); if (el && !el.value.trim()) { const r = aujRuangTerakhir(c.value); if (r) { el.value = r; n++; } } });
  aujMassalSimpanDraft();
  toast(n ? `✅ ${n} ruang diisi dari sesi sebelumnya. Periksa kembali (tiap kelas harus beda ruang).` : 'Tidak ada ruang yang bisa diisi (belum ada sesi sebelumnya, atau semua sudah terisi).', !n, 4500);
}
function aujMassalToggleMulti() {
  const m = !!(aujEl('aujMsMulti') && aujEl('aujMsMulti').checked), tampil = (id, on) => { const e = aujEl(id); if (e) e.style.display = on ? '' : 'none'; };
  tampil('aujMsKelasWrap', !m); tampil('aujMsRuangWrap', !m); tampil('aujMsMultiBox', m); tampil('aujMsFaseBox', m && !!(aujEl('aujMsPerFase') && aujEl('aujMsPerFase').checked));
}
function aujToggleMassal() {
  if (!aujCanEdit()) return;
  aujMassalBuka = !aujMassalBuka;
  const el = aujEl('aujJdwMassal'); if (el) el.innerHTML = aujMassalBuka ? aujHtmlMassal() : '';
  aujIsiOpsiLibur();
}
function aujHtmlMassal() {
  const d = aujMassalDraft || {}, val = (k, def) => escapeHtml(d[k] != null ? d[k] : (def == null ? '' : def));
  const s1 = d.slot1 || { m: '07:30', s: '08:40' }, s2 = d.slot2 || { m: '09:10', s: '10:20' };
  const hariDipilih = d.hari || [1, 2, 3, 4, 5];
  const kelasOpt = KELAS_LIST.map(k => `<option value="${escapeHtml(k)}" ${d.kelas === k ? 'selected' : ''}>${escapeHtml(k)}</option>`).join('');
  const guruOpt = (allGuru || []).map(g => `<option value="${escapeHtml(g.name || '')}"></option>`).join('');
  const f = (id, label, v, type, extra) => `<div><label class="label">${label}</label><input id="${id}" class="field" type="${type || 'text'}" value="${v}" ${extra || ''}></div>`;
  return `<div id="aujMassalForm" oninput="aujMassalSimpanDraft()" onchange="aujMassalSimpanDraft()" style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:12px;">
    <datalist id="aujGuruListMs">${guruOpt}</datalist>
    <h5 style="font-weight:700;font-size:14px;margin-bottom:4px;">🗓️ Jadwal Massal</h5>
    <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">Untuk <strong>satu kelas di satu ruang</strong> (atau beberapa kelas sekaligus bila dicentang di bawah). Mata pelajaran diisi berurutan: slot 1 hari pertama, slot 2 hari pertama, slot 1 hari kedua, dan seterusnya. Ulangi untuk kelas lain. Belum ada yang tersimpan sebelum Anda klik Simpan di pratinjau.</p>
    <div class="grid-3" style="margin-bottom:10px;">
      ${aujPilihanHtml('aujMsNama', 'Nama Asesmen *', d.nama, aujOpsiNama(), { input: 'maxlength="100" placeholder="Nama asesmen"' })}
      <div id="aujMsKelasWrap" style="${d.multi ? 'display:none;' : ''}"><label class="label">Kelas (peserta) *</label><select id="aujMsKelas" class="field" onchange="aujRuangDariKelas()"><option value="">-- Pilih Kelas --</option>${kelasOpt}</select></div>
      <div id="aujMsRuangWrap" style="${d.multi ? 'display:none;' : ''}">${aujPilihanHtml('aujMsRuang', 'Ruang *', d.ruang, aujOpsiRuang(), { input: 'maxlength="40" placeholder="Nama ruang"' })}</div>
    </div>
    <div style="margin-bottom:10px;">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;"><input type="checkbox" id="aujMsMulti" ${d.multi ? 'checked' : ''} onchange="aujMassalToggleMulti()"> 🏫 Beberapa kelas sekaligus</label>
      <div id="aujMsMultiBox" style="${d.multi ? '' : 'display:none;'}margin-top:6px;padding:8px 10px;background:#fff;border:1px dashed #86efac;border-radius:8px;">
        <button type="button" class="btn btn-soft" style="font-size:11px;padding:2px 8px;margin-bottom:6px;" onclick="aujIsiRuangOtomatis()">🏫 Isi ruang dari sesi sebelumnya</button>
        <p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Centang kelas yang ujian di jam yang sama, lalu isi ruangnya (tiap kelas harus beda ruang). Tanggal, jam, dan daftar mapel di bawah berlaku untuk semua kelas yang dicentang.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;">${KELAS_LIST.map((k, i) => {
          const dipilih = (d.kelasList || []).find(x => x.kelas === k), rv = dipilih ? dipilih.ruang : ((d.ruangK || {})[k] || '');
          return `<div style="display:flex;align-items:center;gap:6px;"><label style="display:flex;align-items:center;gap:4px;font-size:13px;min-width:70px;"><input type="checkbox" class="aujMsKelasCek" data-i="${i}" value="${escapeHtml(k)}" ${dipilih ? 'checked' : ''} onchange="aujRuangKelasCek(this)"> ${escapeHtml(k)}</label><input id="aujMsRuangK_${i}" class="field" type="text" maxlength="40" placeholder="Ruang" value="${escapeHtml(rv)}" style="flex:1;min-width:0;"></div>`;
        }).join('')}</div>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;margin-top:8px;"><input type="checkbox" id="aujMsPerFase" ${d.perFase ? 'checked' : ''} onchange="aujMassalToggleMulti()"> 📚 Mapel mengikuti fase</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;margin-top:6px;"><input type="checkbox" id="aujMsLewatTakAmpu" ${d.lewatTakAmpu === false ? '' : 'checked'}> ✂️ Lewati mapel yang tidak diampu kelas</label>
        <p style="font-size:12px;color:#6b7280;margin:2px 0 0 22px;">Berlaku bila "Mapel mengikuti fase" mati: semua kelas memakai satu daftar mapel, tetapi sesi mapel yang tidak ada di Jadwal Pelajaran kelas itu tidak dibuat. Kelas tanpa data Jadwal Pelajaran tetap mendapat semua mapel.</p>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;margin-top:6px;"><input type="checkbox" id="aujMsKelompok" ${d.kelompok === false ? '' : 'checked'}> 🗂️ Kelompokkan mapel yang tidak diikuti semua kelas</label>
        <p style="font-size:12px;color:#6b7280;margin:2px 0 0 22px;">Mapel yang hanya diikuti sebagian kelas (misalnya IPAS dan SKI tidak untuk Kelas 1-2) ditaruh berdampingan di hari-hari terakhir. Kelas yang tidak mengikutinya selesai lebih awal, bukan punya hari berisi satu mapel. Berlaku bila "Mapel mengikuti fase" mati. Mapel lain tetap mengikuti urutan dan penyebaran mapel berat.</p>
        <label class="label" style="margin-top:6px;">Mapel yang tidak diujikan untuk kelas tertentu (opsional, satu aturan per baris)</label>
        <textarea id="aujMsLewat" class="field" rows="3" placeholder="Kelas 1, Kelas 2: Ilmu Pengetahuan Alam dan Sosial&#10;Kelas 1-3: Bahasa Inggris; Seni dan Budaya  (pisahkan beberapa mapel dengan titik koma)">${val('lewatTeks')}</textarea>
        <p style="font-size:12px;color:#6b7280;margin:2px 0 0;">Kelas bisa ditulis "Kelas 1, Kelas 2", "1, 2", rentang "1-3", atau "semua". Berlaku di atas Jadwal Pelajaran, jadi mapel ini dilewati walau data jadwalnya belum rapi. Slot yang ditinggalkan bisa diisi lewat kotak mapel pengganti di bawah.</p>
        <label class="label" style="margin-top:6px;">Mapel pengganti untuk slot yang dilewati (opsional, satu aturan per baris)</label>
        <textarea id="aujMsPengganti" class="field" rows="3" placeholder="Kelas 1: Bahasa Arab = Tahfidz Quran&#10;Bahasa Arab = Seni dan Budaya  (tanpa nama kelas = berlaku untuk semua kelas)">${val('penggantiTeks')}</textarea>
        <p style="font-size:12px;color:#6b7280;margin:2px 0 0;">Pengganti dipakai hanya bila kelas itu mengampu mapel penggantinya, belum punya sesi mapel itu, dan ruangnya tidak sedang dipakai kelas lain dengan mapel berbeda pada jam yang sama. Kalau tidak memenuhi, slot dibiarkan kosong dan alasannya ditulis di pratinjau.</p>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:10px;">
      ${f('aujMsTglMulai', 'Tanggal Mulai *', val('tglMulai'), 'date')}
      ${f('aujMsTglSelesai', 'Tanggal Selesai *', val('tglSelesai'), 'date')}
    </div>
    <div style="margin-bottom:10px;"><label class="label">Hari ujian</label>
      <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;">${AUJ_HARI_URUT.map(h => `<label style="display:flex;align-items:center;gap:4px;"><input type="checkbox" class="aujMsHari" value="${h}" ${hariDipilih.indexOf(h) >= 0 ? 'checked' : ''}> ${AUJ_HARI[h]}</label>`).join('')}</div></div>
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:6px;"><input type="checkbox" id="aujMsLiburKal" ${d.liburKal === false ? '' : 'checked'}> 📅 Lewati hari libur dari Kalender Akademik</label>
    <div style="margin-bottom:10px;"><label class="label">Tanggal libur / dilewati (opsional)</label>
      <input id="aujMsLibur" class="field" type="text" value="${val('libur')}" placeholder="Format 2026-12-25, pisahkan dengan koma">
      <select id="aujMsLiburPilih" class="field" style="margin-top:4px;" onchange="aujLiburTambah(this.value)"><option value="">＋ Pilih tanggal yang dilewati…</option></select></div>
    <div class="grid-2" style="margin-bottom:10px;">
      <div><label class="label">Slot 1 *</label><div style="display:flex;gap:6px;align-items:center;">${aujSelectJam('aujMsJam1M', s1.m, '', 'onchange="aujJamUbah(\'aujMsJam1M\',\'aujMsJam1S\')"')} <span>–</span> <input id="aujMsJam1S" class="field" type="time" value="${escapeHtml(s1.s || '')}"></div></div>
      <div><label class="label">Slot 2 (kosongkan kalau hanya satu slot per hari)</label><div style="display:flex;gap:6px;align-items:center;">${aujSelectJam('aujMsJam2M', s2.m, '', 'onchange="aujJamUbah(\'aujMsJam2M\',\'aujMsJam2S\')"', '-- tidak ada --')} <span>–</span> <input id="aujMsJam2S" class="field" type="time" value="${escapeHtml(s2.s || '')}"></div></div>
    </div>
    <div style="margin-bottom:10px;"><label class="label">Daftar mata pelajaran * (satu per baris, urut sesuai jadwal) <button type="button" class="btn btn-soft" style="font-size:11px;padding:2px 8px;" onclick="aujIsiMapelJadwal('single')">📥 Ambil dari Jadwal Pelajaran (kelas terpilih)</button></label>
      <textarea id="aujMsMapel" class="field" rows="6" placeholder="Matematika&#10;Bahasa Indonesia&#10;Fikih">${val('mapelTeks')}</textarea>
      <div style="margin-top:6px;"><label class="label" style="margin-bottom:4px;">Mapel berat <span style="font-weight:400;color:#6b7280;">(opsional, ketuk untuk menandai)</span></label>
        <div id="aujMsBeratBox" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
        <input type="hidden" id="aujMsBerat" value="${val('berat')}">
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#4b5563;margin-top:6px;"><input type="checkbox" id="aujMsSebar" ${d.sebar === false ? '' : 'checked'}> Sebar mapel berat: usahakan tidak ada dua mapel berat di hari yang sama (mapel berat diletakkan di slot pertama)</label></div></div>
    <div id="aujMsFaseBox" style="${d.multi && d.perFase ? '' : 'display:none;'}margin-bottom:10px;padding:8px 10px;background:#fff;border:1px dashed #86efac;border-radius:8px;">
      <p style="font-size:12px;color:#6b7280;margin-bottom:6px;">Tiap kelas memakai daftar mapel fasenya. Fase yang dikosongkan memakai daftar di atas. Tombol 📥 mengambil mapel dari Jadwal Pelajaran semua kelas di fase itu; periksa dan hapus yang bukan mata pelajaran ujian.</p>
      ${['A', 'B', 'C'].map(f => `<div style="margin-bottom:8px;"><label class="label">${AUJ_FASE[f]} <button type="button" class="btn btn-soft" style="font-size:11px;padding:2px 8px;" onclick="aujIsiMapelJadwal('${f}')">📥 Ambil dari Jadwal</button></label>
        <textarea id="aujMsMapelFase_${f}" class="field" rows="4" placeholder="Satu mapel per baris">${escapeHtml(((d.mapelFase || {})[f]) || '')}</textarea></div>`).join('')}
    </div>
    <div class="grid-2" style="margin-bottom:12px;">
      <div><label class="label">Pengawas 1 (opsional, berlaku untuk semua sesi)</label>${aujSelectGuru('aujMsPengawas1', d.p1, '', '')}</div>
      <div><label class="label">Pengawas 2 (opsional)</label>${aujSelectGuru('aujMsPengawas2', d.p2, '', '')}</div>
    </div>
    <div style="margin-bottom:12px;padding:8px 10px;background:#fff;border:1px dashed #86efac;border-radius:8px;">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;"><input type="checkbox" id="aujMsAuto" ${d.auto ? 'checked' : ''}> 🤖 Isi pengawas otomatis (bagi rata)</label>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:#4b5563;flex-wrap:wrap;">Pengawas per sesi
        <select id="aujMsJmlPw" class="field" style="width:auto;"><option value="1" ${d.jmlPw === 1 ? 'selected' : ''}>1 orang</option><option value="2" ${d.jmlPw === 1 ? '' : 'selected'}>2 orang</option></select>
        <span>Diambil dari guru &amp; wali kelas, dibagi merata dan menghindari jam bentrok. Isian Pengawas 1/2 di atas tetap dipakai bila diisi. Hasil bisa diganti per sesi di pratinjau.</span></div>
    </div>
    <div style="margin-bottom:12px;padding:8px 10px;background:#fff;border:1px dashed #fcd34d;border-radius:8px;">
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;"><input type="checkbox" id="aujMsHonor" ${d.honorOtomatis ? 'checked' : ''}> 💰 Langsung buat sesi honor pengawas</label>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:#4b5563;flex-wrap:wrap;">Honor per pengawas per sesi (Rp)
        <input id="aujMsHonorNominal" class="field" type="number" min="0" style="width:140px;" value="${escapeHtml(String(d.honorNominal != null && d.honorNominal !== 0 ? d.honorNominal : ((typeof V4 !== 'undefined' && V4.rates && V4.rates.activity) || '')))}">
        <span>Awal diambil dari Tarif Honor Terpusat. Hanya sesi yang pengawasnya sudah terisi yang dibuat honornya, dan ada konfirmasi sebelum disimpan.</span></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="aujPratinjauMassal()">👁️ Pratinjau</button><button class="btn btn-soft" onclick="aujToggleMassal()">✖ Tutup</button></div>
    <div id="aujMassalPrev" style="margin-top:12px;">${aujMassalHasil ? aujHtmlPratinjauMassal() : ''}</div>
  </div>`;
}
// Pembagian pengawas bagi rata. Murni (tidak menyentuh layar/database). baris = sesi baru (urutan jadwal), pool = [{key,name}],
// existing = sesi tersimpan, jml = 1|2 pengawas per sesi, nama = nama asesmen (beban dihitung per asesmen yang sama).
// Slot yang sudah terisi (pengawas manual) dipertahankan. Aturan, berurutan:
//  1. KELANJUTAN SESI: guru yang bertugas di sesi sebelumnya pada hari yang sama (mis. sesi 1) dibawa lagi ke sesi berikutnya (sesi 2),
//     walau ruangnya berbeda. Bila slot sesi berikutnya kurang dari jumlah guru yang harus lanjut, sisanya dihitung di `tanpaLanjut`.
//  2. Slot yang belum terisi dilengkapi guru dengan beban paling sedikit, lalu yang paling lama menganggur, dan hanya guru yang
//     jamnya tidak bertabrakan. Kalau semua bentrok, dipilih yang bebannya paling ringan (ditandai di pratinjau).
//  3. PASANGAN: guru-guru sesi itu disebar ke ruang-ruang supaya pasangan yang sudah pernah berdua (di hari yang sama lebih berat,
//     di hari/sesi lain lebih ringan) sebisa mungkin tidak terulang. Pasangan yang terpaksa terulang dihitung di `pasanganUlang`.
function aujBagiPengawas(baris, pool, existing, jml, nama) {
  if (!pool.length) return { error: 'Tidak ada guru/wali kelas di Data Guru untuk dibagi.' };
  if (pool.length < jml) return { error: `Pengawas per sesi ${jml} orang, tetapi guru yang tersedia hanya ${pool.length}.` };
  const beban = {}, terakhir = {}; pool.forEach(g => { beban[g.key] = 0; terakhir[g.key] = 0; });
  const poolByKey = {}; pool.forEach(g => { poolByKey[g.key] = g; });
  const dihitung = [];   // satu ruang dihitung sekali untuk beban
  const kunciBaris = new Set(baris.map(b => b.key).filter(Boolean));   // sesi yang sedang diisi sudah dihitung lewat slot yang terisi
  (existing || []).forEach(x => { if ((nama && x.nama !== nama) || kunciBaris.has(x.key)) return; if (dihitung.some(y => aujSatuRuang(y, x))) return; dihitung.push(x); aujPengawasDari(x).forEach(pw => { if (pw.k in beban) beban[pw.k]++; }); });
  const urut = baris.filter(b => !b.sudahAda).sort((a, b) => (a.tanggal + (a.jamMulai || '')).localeCompare(b.tanggal + (b.jamMulai || '')));
  const terpakai = (existing || []).slice();   // untuk cek bentrok jam: sesi tersimpan + sesi baru yang sudah dibagi
  const riwayat = (existing || []).filter(x => !(x.key && kunciBaris.has(x.key)));   // untuk kelanjutan sesi & riwayat pasangan (salinan lama sesi yang sedang diisi tidak ikut)
  let seq = 0, tanpaCelah = 0, tanpaLanjut = 0, pasanganUlang = 0;
  const bebasDi = (id, b) => !terpakai.some(x => x.tanggal === b.tanggal && aujTumpang(x, b) && !aujSatuRuang(x, b) && aujPengawasDari(x).some(pw => pw.k === id));
  // Riwayat pasangan: berapa kali dua orang sudah berdua (satu ruang-sesi dihitung sekali), dan apakah sudah berdua pada tanggal itu.
  const pk = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  const histSemua = {}, histHari = {};
  const catat = (x, hitungUlang) => {
    const ids = aujPengawasDari(x).map(p => p.k); if (ids.length < 2) return;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const k = pk(ids[i], ids[j]);
      if (hitungUlang && histSemua[k]) pasanganUlang++;
      histSemua[k] = (histSemua[k] || 0) + 1; histHari[x.tanggal + '#' + k] = true;
    }
  };
  dihitung.forEach(x => catat(x, false));
  const biayaPasangan = (a, b, tgl) => { const k = pk(a, b), c = histSemua[k] || 0; return c * c * 10 + (histHari[tgl + '#' + k] ? 50 : 0); };
  const slotPw = [['pengawas1', 'pengawas1Key'], ['pengawas2', 'pengawas2Key']];

  // Susun ruang-sesi (kelas satu ruang & jam = satu unit, pengawasnya sama), lalu kelompokkan per sesi (tanggal + jam mulai).
  const units = [];
  urut.forEach(b => {
    let u = units.find(z => aujSatuRuang(z.rep, b));
    if (!u) { u = { rep: b, anggota: [], tetap: [] }; units.push(u); }
    u.anggota.push(b);
  });
  const sesiList = [];
  units.forEach(u => {
    const kunci = u.rep.tanggal + '#' + (u.rep.jamMulai || '');
    let s = sesiList.find(z => z.kunci === kunci);
    if (!s) { s = { kunci, tanggal: u.rep.tanggal, jamMulai: u.rep.jamMulai || '', units: [] }; sesiList.push(s); }
    s.units.push(u);
  });
  // Pengawas yang sudah ditentukan (manual / kelas lain satu ruang yang sudah tersimpan) per unit.
  units.forEach(u => {
    const tambah = (n, key) => {
      if (!n) return; const id = key || aujIdPengawas(n);
      if (id && !u.tetap.some(t => t.k === id)) u.tetap.push({ k: id, nama: n, key: key || (poolByKey[id] ? id : null) });
    };
    u.anggota.forEach(b => slotPw.forEach(f => { if (b[f[0]]) { const n0 = u.tetap.length; tambah(b[f[0]], b[f[1]]); if (u.tetap.length > n0 && u.tetap[n0].k in beban) beban[u.tetap[n0].k]++; } }));
    const kem = terpakai.find(x => !u.anggota.includes(x) && !(x.key && u.anggota.some(b => b.key === x.key)) && aujSatuRuang(x, u.rep) && (x.pengawas1 || x.pengawas2));
    if (kem) slotPw.forEach(f => tambah(kem[f[0]], kem[f[1]]));
  });

  sesiList.forEach(S => {
    const sisaUnit = S.units.map(u => Math.max(0, jml - u.tetap.length));
    const kapasitas = sisaUnit.reduce((a, b) => a + b, 0);
    const tetapIds = new Set(); S.units.forEach(u => u.tetap.forEach(t => tetapIds.add(t.k)));
    // (1) Kelanjutan: orang dari sesi sebelumnya (jam mulai terdekat sebelum ini, hari & asesmen sama).
    const sebelum = riwayat.filter(x => x.tanggal === S.tanggal && S.jamMulai && x.jamMulai && x.jamMulai < S.jamMulai && aujNormNama(x.nama) === aujNormNama(S.units[0].rep.nama));
    let lanjutKandidat = [];
    if (sebelum.length) {
      const jamAkhir = sebelum.reduce((m, x) => x.jamMulai > m ? x.jamMulai : m, '');
      sebelum.filter(x => x.jamMulai === jamAkhir).forEach(x => aujPengawasDari(x).forEach(p => { if (!lanjutKandidat.some(q => q.k === p.k)) lanjutKandidat.push({ k: p.k, nama: p.nama, key: poolByKey[p.k] ? p.k : null }); }));
    }
    const lanjut = [];
    lanjutKandidat.forEach(p => {
      if (tetapIds.has(p.k)) return;   // sudah bertugas di sesi ini (manual / kelas satu ruang)
      if (lanjut.length >= kapasitas || !S.units.some(u => bebasDi(p.k, u.rep))) { tanpaLanjut++; return; }
      lanjut.push(p);
    });
    // (2) Sisa slot: guru dengan beban paling ringan.
    const dipilih = new Set(lanjut.map(p => p.k)), perlu = kapasitas - lanjut.length, pengisi = [];
    if (perlu > 0) {
      const kand = pool.filter(g => !tetapIds.has(g.key) && !dipilih.has(g.key)).sort((x, y) => (beban[x.key] - beban[y.key]) || ((terakhir[x.key] || 0) - (terakhir[y.key] || 0)) || (pool.indexOf(x) - pool.indexOf(y)));
      const bebas = kand.filter(g => S.units.some(u => bebasDi(g.key, u.rep))), sibuk = kand.filter(g => !bebas.includes(g));
      bebas.concat(sibuk).slice(0, perlu).forEach(g => { if (sibuk.includes(g)) tanpaCelah++; pengisi.push({ k: g.key, nama: g.name, key: g.key }); });
    }
    const orang = lanjut.concat(pengisi);
    orang.forEach(p => { if (p.k in beban) beban[p.k]++; terakhir[p.k] = ++seq; });
    // (3) Sebar ke ruang: kurangi pasangan yang berulang (tukar-tukar sampai tidak ada perbaikan; deterministik).
    const slot = []; sisaUnit.forEach((n, ui) => { for (let i = 0; i < n; i++) slot.push(ui); });
    const asg = orang.slice(); while (asg.length < slot.length) asg.push(null);
    const biaya = a => {
      const per = S.units.map(u => u.tetap.map(t => t.k)); slot.forEach((ui, i) => { if (a[i]) per[ui].push(a[i].k); });
      let t = 0; per.forEach(ids => { for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) t += biayaPasangan(ids[i], ids[j], S.tanggal); });
      return t;
    };
    if (jml > 1 && slot.length > 1) {
      const perbaiki = a => {   // tukar dua orang di ruang berbeda selama biaya turun
        let c0 = biaya(a), lagi = true, putaran = 0;
        while (lagi && putaran++ < 60) {
          lagi = false;
          for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
            if (slot[i] === slot[j] || a[i] === a[j]) continue;
            [a[i], a[j]] = [a[j], a[i]];
            const c = biaya(a);
            if (c < c0) { c0 = c; lagi = true; } else [a[i], a[j]] = [a[j], a[i]];
          }
        }
        return c0;
      };
      let terbaik = perbaiki(asg), hasil = asg.slice(), rnd = 12345;   // beberapa susunan awal acak semu (tetap sama tiap dijalankan)
      for (let r = 0; r < 40 && terbaik > 0; r++) {
        const a = orang.slice(); while (a.length < slot.length) a.push(null);
        for (let i = a.length - 1; i > 0; i--) { rnd = (rnd * 1103515245 + 12345) % 2147483648; const j = rnd % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
        const c = perbaiki(a); if (c < terbaik) { terbaik = c; hasil = a.slice(); }
      }
      for (let i = 0; i < asg.length; i++) asg[i] = hasil[i];
    }
    S.units.forEach((u, ui) => {
      const akhir = u.tetap.slice(); slot.forEach((uj, i) => { if (uj === ui && asg[i]) akhir.push(asg[i]); });
      u.anggota.forEach(b => {
        const ada = []; slotPw.forEach(f => { if (b[f[0]]) ada.push(b[f[1]] || aujIdPengawas(b[f[0]])); });
        slotPw.forEach((f, si) => {
          if (si >= jml || b[f[0]]) return;
          const p = akhir.find(z => ada.indexOf(z.k) < 0 && ada.indexOf(z.key) < 0); if (!p) return;
          b[f[0]] = p.nama; b[f[1]] = p.key; ada.push(p.k);
        });
        terpakai.push(b); riwayat.push(b);
      });
      catat(u.anggota[0], true);   // pasangan dicatat sekali per ruang
    });
  });
  return { beban, tanpaCelah, tanpaLanjut, pasanganUlang };
}
function aujPoolPengawas() { return (allGuru || []).filter(g => g && g.key && g.name && (g.role === 'guru' || g.role === 'wali_kelas')); }
// Guru yang TIDAK ikut dibagi otomatis sebagai pengawas (tulis sesuai Data Guru; besar/kecil huruf & spasi ganda diabaikan).
// Hanya berlaku untuk pembagian otomatis; Admin tetap bisa memilih mereka manual, dan Rekap Beban tetap menampilkan semua guru.
const AUJ_KECUALI_PENGAWAS = ['Achmad Syauqi'];
function aujPoolOtomatis() {
  const kecuali = new Set(AUJ_KECUALI_PENGAWAS.map(aujNormNama));
  return aujPoolPengawas().filter(g => !kecuali.has(aujNormNama(g.name)));
}
// Periksa aturan penugasan pengawas (independen dari pembagi otomatis, jadi ikut berlaku untuk isian manual):
//  - putus: guru yang bertugas di satu sesi tetapi TIDAK bertugas lagi di sesi berikutnya pada hari yang sama (beda ruang tidak masalah)
//  - ulang: pasangan dua guru yang sama muncul di lebih dari satu ruang-sesi
// daftar = sesi yang diperiksa (satu asesmen). Hanya tanggal di `tanggalFokus` (Set) yang dilaporkan bila diberikan.
function aujCekLanjutSesi(daftar, tanggalFokus) {
  const putus = [], ulang = [], perHari = {}, pasangan = {};
  aujLipatRuang((daftar || []).filter(r => r && r.tanggal && r.jamMulai)).forEach(r => { (perHari[r.tanggal] = perHari[r.tanggal] || {}); (perHari[r.tanggal][r.jamMulai] = perHari[r.tanggal][r.jamMulai] || []).push(r); });
  Object.keys(perHari).sort().forEach(t => {
    const jam = Object.keys(perHari[t]).sort(), orang = jam.map(j => { const m = new Map(); perHari[t][j].forEach(r => aujPengawasDari(r).forEach(p => m.set(p.k, p.nama))); return m; });
    for (let i = 0; i < jam.length - 1; i++) orang[i].forEach((nm, k) => { if (!orang[i + 1].has(k) && (!tanggalFokus || tanggalFokus.has(t))) putus.push({ nama: nm, tanggal: t, dari: jam[i], ke: jam[i + 1] }); });
    jam.forEach(j => perHari[t][j].forEach(r => { const ids = aujPengawasDari(r); if (ids.length < 2) return; const k = [ids[0].k, ids[1].k].sort().join('|'); (pasangan[k] = pasangan[k] || []).push({ tanggal: t, jam: j, ruang: r.ruang || '-', a: ids[0].nama, b: ids[1].nama }); }));
  });
  Object.keys(pasangan).forEach(k => { const g = pasangan[k]; if (g.length > 1 && (!tanggalFokus || g.some(x => tanggalFokus.has(x.tanggal)))) ulang.push({ a: g[0].a, b: g[0].b, kali: g.length, contoh: g.slice(0, 3).map(x => aujTglPendek(x.tanggal) + ' ' + x.jam).join(', ') }); });
  return { putus, ulang };
}
// Hitung ulang bentrok untuk sesi baru pada pratinjau (dipanggil saat pratinjau dibuat dan saat pengawas diganti manual).
function aujHitungBentrokMassal(h) {
  const baru = h.baris.filter(b => !b.sudahAda);
  baru.forEach((b, i) => { b.key = '__baru' + i; });
  const bt = aujCariBentrok(allAdmUjian.concat(baru));
  baru.forEach(b => { b.bentrok = bt.perKey[b.key] || []; });
  h.nBentrok = bt.pasangan.filter(p => String(p.a.key).indexOf('__baru') === 0 || String(p.b.key).indexOf('__baru') === 0).length;
  const tb = aujCekTumpangBaru(baru); baru.forEach((b, i) => { b.tumpang = tb.perBaris[i]; }); h.nTumpang = tb.jumlah; h.contohTumpang = tb.contoh;   // kelas/ruang bertabrakan
  const rekap = {}; aujLipatRuang(baru).forEach(b => [b.pengawas1, b.pengawas2].forEach(n => { if (n) rekap[n] = (rekap[n] || 0) + 1; }));   // kelas satu ruang dihitung sekali (sama seperti honor & Rekap Beban)
  h.rekap = Object.keys(rekap).map(n => ({ nama: n, n: rekap[n] })).sort((a, b) => b.n - a.n || a.nama.localeCompare(b.nama));
  const nmAsesmen = aujNormNama((baru[0] || {}).nama), tglBaru = new Set(baru.map(b => b.tanggal));
  h.cekSesi = aujCekLanjutSesi(allAdmUjian.filter(x => aujNormNama(x.nama) === nmAsesmen).concat(baru), tglBaru);
}
function aujPratinjauMassal() {
  if (!aujCanEdit()) return;
  aujMassalDraft = aujMassalAmbil(); aujMassalHasil = null;
  const pv = aujEl('aujMassalPrev'); if (!pv) return;
  const h = aujHitungMassal(aujMassalDraft);
  const tampilError = m => { pv.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;">${escapeHtml(m)}</div>`; };
  if (h.error) return tampilError(h.error);
  if (aujMassalDraft.honorOtomatis && !(aujMassalDraft.honorNominal > 0)) return tampilError('Honor pengawas harus lebih dari 0 (atau hilangkan centang 💰 Langsung buat sesi honor).');
  const ada = b => allAdmUjian.some(x => aujNormNama(x.nama) === aujNormNama(b.nama) && x.kelas === b.kelas && aujNormNama(x.ruang) === aujNormNama(b.ruang) && x.tanggal === b.tanggal && (x.jamMulai || null) === (b.jamMulai || null));
  h.baris.forEach(b => { b.sudahAda = ada(b); });
  const bedaMapel = aujMapelBedaSatuRuang(allAdmUjian.concat(h.baris.filter(b => !b.sudahAda).map(b => Object.assign({}, b, { _baru: true }))), true);
  if (bedaMapel.length) return tampilError('Satu ruang harus mengerjakan mapel yang sama pada jam yang sama (1 sesi = 1 mapel = 1 ruang), tetapi: ' + bedaMapel.slice(0, 3).map(aujTeksMapelBeda).join('; ') + (bedaMapel.length > 3 ? '; dan ' + (bedaMapel.length - 3) + ' lainnya' : '') + '. Matikan "Mapel mengikuti fase" (pakai satu daftar mapel), atau pisahkan ruangnya.');
  if (aujMassalDraft.auto) {
    const r = aujBagiPengawas(h.baris, aujPoolOtomatis(), allAdmUjian, aujMassalDraft.jmlPw, aujMassalDraft.nama);
    if (r.error) return tampilError(r.error);
    h.tanpaCelah = r.tanpaCelah;
  }
  aujHitungBentrokMassal(h);   // bentrok dihitung hanya untuk sesi yang benar-benar akan dibuat (yang sudah ada tidak dihitung dua kali)
  h.p = aujMassalDraft; aujMassalHasil = h;
  pv.innerHTML = aujHtmlPratinjauMassal();
}
// Ganti pengawas satu baris di pratinjau (slot 1|2; key kosong = kosongkan). Tidak menyentuh database.
function aujGantiPwMassal(idx, slot, key) {
  const h = aujMassalHasil; if (!h || !h.baris[idx]) return;
  const b = h.baris[idx], g = key ? (allGuru || []).find(x => x.key === key) : null;
  const lain = slot === 1 ? b.pengawas2Key : b.pengawas1Key;
  if (g && lain && lain === g.key) { toast('Pengawas 1 dan 2 tidak boleh orang yang sama.', true); aujEl('aujMassalPrev').innerHTML = aujHtmlPratinjauMassal(); return; }
  if (slot === 1) { b.pengawas1 = g ? g.name : null; b.pengawas1Key = g ? g.key : null; } else { b.pengawas2 = g ? g.name : null; b.pengawas2Key = g ? g.key : null; }
  aujHitungBentrokMassal(h);
  aujEl('aujMassalPrev').innerHTML = aujHtmlPratinjauMassal();
}
function aujHtmlPratinjauMassal() {
  const h = aujMassalHasil; if (!h) return '';
  const baru = h.baris.filter(b => !b.sudahAda), lewat = h.baris.length - baru.length;
  const td = 'padding:4px 8px;border-top:1px solid #d1fae5;';
  const pool = aujPoolPengawas();
  const merah = t => `<span style="color:#b91c1c;">⚠️ ${escapeHtml(t)}</span>`;
  const statusBaris = b => {
    const q = [];
    if (b.bentrok && b.bentrok.length) q.push(merah(b.bentrok.map(x => x.nama + ' bentrok dengan ' + aujLabelSesi(x.lawan)).join('; ')));
    if (b.tumpang && b.tumpang.length) q.push(merah(b.tumpang.join('; ')));
    return q.length ? q.join('<br>') : '✓';
  };
  const sel = (i, slot, b) => {
    const cur = slot === 1 ? b.pengawas1Key : b.pengawas2Key;
    const opt = pool.map(g => `<option value="${escapeHtml(g.key)}" ${g.key === cur ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('');
    return `<select class="field" style="font-size:12px;padding:2px 4px;min-width:120px;margin-bottom:2px;" oninput="event.stopPropagation()" onchange="event.stopPropagation();aujGantiPwMassal(${i},${slot},this.value)"><option value="">— kosong —</option>${opt}</select>`;
  };
  const pwSel = (i, b) => h.p.auto ? sel(i, 1, b) + '<br>' + (h.p.jmlPw === 2 || b.pengawas2 ? sel(i, 2, b) : '') : escapeHtml([b.pengawas1, b.pengawas2].filter(Boolean).join(', ') || '—');
  const rows = h.baris.map((b, i) => `<tr style="${b.sudahAda ? 'color:#9ca3af;' : ''}">
      <td style="${td}">${i + 1}</td><td style="${td}white-space:nowrap;">${escapeHtml(aujTglPendek(b.tanggal))}</td>
      <td style="${td}white-space:nowrap;">${escapeHtml(b.jamMulai)}–${escapeHtml(b.jamSelesai)}</td>${h.p.multi ? `<td style="${td}white-space:nowrap;">${escapeHtml(b.kelas)} · ${escapeHtml(b.ruang)}</td>` : ''}<td style="${td}">${escapeHtml(b.mapel)}${b._pengganti ? ' <span style="font-size:11px;color:#065f46;">🔁 pengganti</span>' : ''}</td>
      <td style="${td}">${b.sudahAda ? '—' : pwSel(i, b)}</td>
      <td style="${td}">${b.sudahAda ? 'sudah ada — dilewati' : statusBaris(b)}</td></tr>`).join('');
  return `<p style="font-size:13px;margin-bottom:6px;"><strong>${baru.length} sesi</strong> akan dibuat untuk ${h.p.multi ? `<strong>${h.nKelas} kelas</strong> (${escapeHtml(h.p.kelasList.map(x => x.kelas + ' di ' + x.ruang).join(', '))})` : `<strong>${escapeHtml(h.p.kelas)}</strong> di <strong>${escapeHtml(h.p.ruang)}</strong>`}, memakai ${h.hariTerpakai} hari${lewat ? `; ${lewat} sesi dilewati karena sudah ada` : ''}${h.slotKosong ? `; ${h.slotKosong} slot di hari terakhir kosong` : ''}.</p>
    ${h.beratBertumpuk ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚖️ ${h.beratBertumpuk} hari tetap berisi dua mapel berat karena jumlah mapel berat lebih banyak daripada hari ujian. Tambah hari atau kurangi tanda berat.</p>` : (h.nBerat ? `<p style="font-size:12px;color:#065f46;background:#ecfdf5;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚖️ Mapel berat sudah disebar: tidak ada hari dengan dua mapel berat.</p>` : '')}
    ${h.durasiBeda && h.durasiBeda.length ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⏱️ Lama sesi di MI ditetapkan ${AUJ_DURASI_MENIT} menit, tetapi slot ${h.durasiBeda.map(escapeHtml).join(', ')} berbeda. Masih bisa disimpan; ubah jamnya bila tidak disengaja.</p>` : ''}
    ${h.liburDilewati && h.liburDilewati.length ? `<p style="font-size:12px;color:#1d4ed8;background:#eff6ff;border-radius:6px;padding:6px 10px;margin-bottom:6px;">📅 ${h.liburDilewati.length} tanggal dilewati karena libur di Kalender Akademik: ${h.liburDilewati.map(t => escapeHtml(aujTglPendek(t))).join(', ')}.</p>` : ''}
    ${h.kelompok ? `<p style="font-size:12px;color:#065f46;background:#ecfdf5;border-radius:6px;padding:6px 10px;margin-bottom:6px;">🗂️ Mapel yang tidak diikuti semua kelas dikumpulkan di hari-hari terakhir (urutannya mengikuti daftar mapel Anda): ${h.kelompok.mapel.map(x => '<strong>' + escapeHtml(x.nama) + '</strong> (hanya ' + x.kelas.map(escapeHtml).join(', ') + ')').join('; ')}. Kelas lain selesai lebih awal. Mapel berat pada bagian ini tidak dijamin tersebar.${h.kelompok.awalGanjil ? ' Jumlah mapel biasa ganjil, jadi satu hari berisi campuran.' : ''}</p>` : ''}
    ${h.lewatManual && h.lewatManual.length ? `<p style="font-size:12px;color:#1d4ed8;background:#eff6ff;border-radius:6px;padding:6px 10px;margin-bottom:6px;">✂️ Dilewati sesuai aturan Anda (tidak diujikan): ${h.lewatManual.map(x => escapeHtml(x.kelas) + ' — ' + x.mapel.map(escapeHtml).join(', ')).join('; ')}.</p>` : ''}
    ${h.aturanLewatSia && h.aturanLewatSia.length ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ Aturan "tidak diujikan" ini tidak mengenai sesi mana pun (cek penulisan kelas atau nama mapel): ${h.aturanLewatSia.map(x => '<em>' + escapeHtml(x) + '</em>').join('; ')}.</p>` : ''}
    ${h.mapelTakCocok && h.mapelTakCocok.length ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">ℹ️ Tidak ada di Jadwal Pelajaran kelas mana pun, jadi dianggap <strong>mapel tambahan</strong> dan DIUJIKAN untuk semua kelas: ${h.mapelTakCocok.map(x => '<strong>' + escapeHtml(x.mapel) + '</strong>' + (x.saran ? ' (kalau salah ketik, mungkin maksudnya "' + escapeHtml(x.saran) + '")' : '')).join('; ')}. Kelas yang tidak mengikutinya bisa ditulis di kotak "tidak diujikan".</p>` : ''}
    ${h.lewatTakAmpu && h.lewatTakAmpu.length ? `<p style="font-size:12px;color:#1d4ed8;background:#eff6ff;border-radius:6px;padding:6px 10px;margin-bottom:6px;">✂️ Dilewati karena kelas tidak mengampu mapel itu (menurut Jadwal Pelajaran): ${h.lewatTakAmpu.map(x => escapeHtml(x.kelas) + ' — ' + x.mapel.map(escapeHtml).join(', ')).join('; ')}. Kalau ada yang salah (mis. beda penulisan nama mapel), samakan namanya di Jadwal Pelajaran.</p>` : ''}
    ${h.tanpaJadwal && h.tanpaJadwal.length ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ ${h.tanpaJadwal.map(escapeHtml).join(', ')} belum punya data Jadwal Pelajaran, jadi mendapat semua mapel di daftar.</p>` : ''}
    ${h.diganti && h.diganti.length ? `<p style="font-size:12px;color:#065f46;background:#ecfdf5;border-radius:6px;padding:6px 10px;margin-bottom:6px;">🔁 ${h.diganti.length} slot yang dilewati diisi mapel pengganti: ${h.diganti.slice(0, 6).map(x => escapeHtml(x.kelas) + ' ' + escapeHtml(aujTglPendek(x.tanggal)) + ' (' + escapeHtml(x.dari) + ' → ' + escapeHtml(x.ke) + ')').join('; ')}${h.diganti.length > 6 ? '; dan ' + (h.diganti.length - 6) + ' lainnya' : ''}.</p>` : ''}
    ${h.gagalGanti && h.gagalGanti.length ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ ${h.gagalGanti.length} slot tidak bisa diganti dan dibiarkan kosong: ${h.gagalGanti.slice(0, 4).map(x => escapeHtml(x.kelas) + ' ' + escapeHtml(aujTglPendek(x.tanggal)) + ' (' + escapeHtml(x.dari) + ' → ' + escapeHtml(x.ke) + '): ' + escapeHtml(x.alasan)).join('; ')}${h.gagalGanti.length > 4 ? '; dan ' + (h.gagalGanti.length - 4) + ' lainnya' : ''}.</p>` : ''}
    ${h.ruangSama && h.ruangSama.length ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ Satu ruang dipakai beberapa kelas pada jam yang sama (${escapeHtml(h.ruangSama.join('; '))}). Boleh dilanjutkan: pengawas kelas-kelas ini dibuat sama dan honor pengawasnya dihitung sekali per ruang (sesi honor dibuat di kelas pertama). Denah gabungan diatur di tab Denah.</p>` : ''}
    ${h.kalenderKosong ? '<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">ℹ️ Kalender Akademik belum memuat tanggal libur (kosong atau belum pernah dibuka). Buka menu Kalender Akademik sekali, lalu Pratinjau lagi bila ingin hari libur dilewati otomatis.</p>' : ''}
    ${h.p.honorOtomatis ? (() => { const kamar = aujLipatRuang(baru), lengkap = kamar.filter(b => Object.keys(aujKunciPengawasSesi(b).map).length).length; return `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">💰 ${lengkap} dari ${kamar.length} sesi honor${kamar.length < baru.length ? ' (satu per ruang)' : ''} akan langsung dibuat @ Rp ${h.p.honorNominal.toLocaleString('id-ID')} per pengawas${kamar.length - lengkap ? `; ${kamar.length - lengkap} sesi tanpa pengawas dilewati` : ''}.</p>`; })() : ''}
    ${h.p.auto && h.rekap && h.rekap.length ? `<p style="font-size:12px;color:#065f46;background:#ecfdf5;border-radius:6px;padding:6px 10px;margin-bottom:6px;">🤖 Pembagian pengawas (jumlah ruang-sesi; kelas satu ruang dihitung sekali): ${h.rekap.map(x => escapeHtml(x.nama) + ' (' + x.n + ')').join(', ')}.${h.tanpaCelah ? ` ${h.tanpaCelah} penugasan tidak menemukan guru yang bebas jam — lihat tanda ⚠️ dan ganti manual.` : ''}</p>` : ''}
    ${h.cekSesi && h.cekSesi.putus.length ? `<p style="font-size:12px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ ${h.cekSesi.putus.length} pengawas bertugas di satu sesi tetapi tidak dijadwalkan lagi di sesi berikutnya pada hari yang sama, mis. ${escapeHtml(h.cekSesi.putus.slice(0, 3).map(x => x.nama + ' (' + aujTglPendek(x.tanggal) + ', ' + x.dari + ' → ' + x.ke + ')').join('; '))}. Sesi berikutnya mungkin punya ruang lebih sedikit; atur manual bila perlu.</p>` : (h.p.auto && h.cekSesi ? `<p style="font-size:12px;color:#065f46;background:#ecfdf5;border-radius:6px;padding:6px 10px;margin-bottom:6px;">🔗 Semua pengawas sesi sebelumnya sudah dijadwalkan lagi di sesi berikutnya pada hari yang sama.</p>` : '')}
    ${h.cekSesi && h.cekSesi.ulang.length ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:6px 10px;margin-bottom:6px;">👥 ${h.cekSesi.ulang.length} pasangan pengawas sama muncul lebih dari sekali, mis. ${escapeHtml(h.cekSesi.ulang.slice(0, 3).map(x => x.a + ' & ' + x.b + ' (' + x.kali + '×: ' + x.contoh + ')').join('; '))}. Pasangan tidak bisa dihindari bila jumlah guru atau ruang terlalu sedikit.</p>` : ''}
    ${h.nTumpang ? `<p style="font-size:12px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ ${h.nTumpang} sesi bertabrakan kelas atau ruangnya dengan sesi lain pada jam yang sama, mis. ${escapeHtml((h.contohTumpang || []).join('; '))}. Masih bisa disimpan; periksa tanggal, jam, dan ruangnya dulu.</p>` : ''}
    ${h.nBentrok ? `<p style="font-size:12px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ ${h.nBentrok} bentrok pengawas dengan sesi lain. Masih bisa disimpan; ${h.p.auto ? 'ganti pengawasnya di tabel ini atau di Data Sesi sesudahnya' : 'ubah pengawasnya di Data Sesi sesudahnya'}.</p>` : ''}
    <div style="overflow-x:auto;background:#fff;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;"><th style="padding:4px 8px;">No</th><th style="padding:4px 8px;">Tanggal</th><th style="padding:4px 8px;">Waktu</th>${h.p.multi ? '<th style="padding:4px 8px;">Kelas · Ruang</th>' : ''}<th style="padding:4px 8px;">Mapel</th><th style="padding:4px 8px;">Pengawas</th><th style="padding:4px 8px;">Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="margin-top:10px;"><button class="btn btn-success" id="btnAujMassal" onclick="aujSimpanMassal()" ${baru.length ? '' : 'disabled'}>💾 Simpan ${baru.length} Sesi</button></div>`;
}
function aujSimpanMassal() {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa membuat jadwal!', true);
  const h = aujMassalHasil; if (!h) return toast('Klik Pratinjau dulu.', true);
  const baru = h.baris.filter(b => !b.sudahAda);
  if (!baru.length) return toast('Semua sesi pada pratinjau sudah ada.', true);
  if (isBusy('aujMassal')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  if (!confirm(`Buat ${baru.length} sesi ${h.p.nama} untuk ${h.p.multi ? h.nKelas + ' kelas' : h.p.kelas + ' (' + h.p.ruang + ')'}?${h.nBentrok ? `\n\n⚠️ ${h.nBentrok} bentrok pengawas terdeteksi.` : ''}${h.nTumpang ? `\n\n⚠️ ${h.nTumpang} sesi bertabrakan kelas/ruangnya dengan sesi lain.` : ''}${h.p.honorOtomatis ? `\n\n💰 Sesi honor pengawas juga akan dibuat @ Rp ${h.p.honorNominal.toLocaleString('id-ID')} per pengawas per sesi (hanya sesi yang pengawasnya sudah terisi).` : ''}`)) return;
  const acuan = aujAcuanSesi(), snapKelas = {}, now = new Date().toISOString();
  const updates = {}, tersimpan = [], daftarBaru = [];
  const bersih = o => { Object.keys(o).forEach(k => { if (o[k] == null) delete o[k]; }); return o; };
  baru.forEach(b => {
    const key = db.ref(AUJ_NODE).push().key;
    // Isi sama seperti sesi baru lewat form: mewarisi denah lokasi & tata tertib sesi terbaru, daftar peserta dibekukan.
    const data = bersih({
      nama: b.nama, kelas: b.kelas, ruang: b.ruang, tanggal: b.tanggal, mapel: b.mapel, jamMulai: b.jamMulai, jamSelesai: b.jamSelesai,
      pengawas1: b.pengawas1, pengawas1Key: b.pengawas1Key, pengawas2: b.pengawas2, pengawas2Key: b.pengawas2Key,
      lokasiDenah: acuan.lokasiDenah, lokasiCatatan: acuan.lokasiCatatan, tatibPeserta: acuan.tatibPeserta, tatibPengawas: acuan.tatibPengawas,
      pesertaSnap: (snapKelas[b.kelas] = snapKelas[b.kelas] || aujBuatSnapPeserta(b.kelas)), tahunAjaran: currentTahunAjaran, semester: currentSemesterAktif || null,
      inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: now
    });
    daftarBaru.push({ key, data });
  });
  aujWarisiDenah(daftarBaru.map(x => x.data));   // denah kursi ikut diwarisi dari sesi lain di ruang & kelas yang sama
  daftarBaru.forEach(x => { updates[x.key] = x.data; tersimpan.push(Object.assign({ key: x.key }, x.data)); });
  const btn = aujEl('btnAujMassal');
  setBusy('aujMassal', btn);
  db.ref(AUJ_NODE).update(updates, err => {   // satu tulisan atomik: semua sesi masuk atau tidak sama sekali
    clearBusy('aujMassal', btn);
    if (err) return toast('Gagal: ' + (err.message || err), true);
    tersimpan.forEach(r => allAdmUjian.push(r));
    aujUndoSimpan({ jenis: 'buat', label: `Jadwal Massal ${h.p.nama}`, buat: tersimpan.map(r => r.key) });
    toast(`✅ ${tersimpan.length} sesi jadwal dibuat!`);
    addLog('buat_administrasi_ujian', aujLogDetail(h.p.nama, h.p.multi ? h.p.kelasList.map(x => x.kelas).join('/') : h.p.kelas, h.p.multi ? 'banyak ruang' : h.p.ruang) + ` (massal ${tersimpan.length} sesi)`);
    const honorNominal = h.p.honorOtomatis ? h.p.honorNominal : 0;
    aujMassalHasil = null; aujMassalDraft = null; aujMassalBuka = false;
    aujPastikanAktif(); aujRenderSemua();
    aujSinkronHonorGabung(tersimpan);   // kelas baru di ruang yang sudah punya sesi honor: honor ruang itu ikut diperbarui
    if (honorNominal > 0) {   // sesi honor dibuat sesudah jadwal tersimpan; kalau gagal, jadwal tetap aman dan tombol "Buat Sesi Honor" masih bisa dipakai
      const sp = aujSiapHonor(tersimpan);
      if (sp.layak.length) aujTulisHonor(sp.layak, honorNominal, () => aujLaporHonor(tersimpan, sp));
      else toast('Sesi honor tidak dibuat: belum ada sesi yang pengawasnya lengkap.' + (sp.lewati.length ? ' Contoh: ' + sp.lewati[0] : ''), true, 8000);
    }
  });
}

// ---------- (4) Salin jadwal asesmen (mis. ASAS -> ASAT) ----------
let aujSalinBuka = false, aujSalinDraft = null, aujSalinHasil = null;
function aujGeserTgl(tgl, n) { const q = aujBagianTgl(tgl); return new Date(Date.UTC(q.y, q.mo - 1, q.d + n)).toISOString().slice(0, 10); }
function aujSelisihHari(a, b) { const x = aujBagianTgl(a), y = aujBagianTgl(b); return Math.round((Date.UTC(y.y, y.mo - 1, y.d) - Date.UTC(x.y, x.mo - 1, x.d)) / 86400000); }
// Murni. p = { sumber, namaBaru, tglMulai, salinPw }. daftar = semua sesi tersimpan; libur = Set tanggal libur.
function aujHitungSalin(p, daftar, libur) {
  const err = m => ({ error: m });
  if (!p.sumber) return err('Pilih asesmen sumber.');
  if (!p.namaBaru || p.namaBaru.length < 3) return err('Nama asesmen baru wajib diisi (minimal 3 karakter).');
  if (p.namaBaru.length > 100) return err('Nama asesmen maksimal 100 karakter.');
  if (!aujAdaTanggal(p.tglMulai)) return err('Isi tanggal mulai jadwal baru.');
  const src = daftar.filter(x => x.nama === p.sumber && aujAdaTanggal(x.tanggal));
  if (!src.length) return err('Asesmen sumber belum punya sesi.');
  const awal = src.map(x => x.tanggal).sort()[0], selisih = aujSelisihHari(awal, p.tglMulai);
  const baris = aujUrutJadwal(src).map(x => {
    const t = aujGeserTgl(x.tanggal, selisih), b = {
      nama: p.namaBaru, kelas: x.kelas, ruang: x.ruang, mapel: x.mapel || null, tanggal: t, jamMulai: x.jamMulai || null, jamSelesai: (p.durasi70 && aujMenit(x.jamMulai) != null) ? aujFmtMenit(aujMenit(x.jamMulai) + AUJ_DURASI_MENIT) : (x.jamSelesai || null),
      pengawas1: p.salinPw ? (x.pengawas1 || null) : null, pengawas1Key: p.salinPw ? (x.pengawas1Key || null) : null,
      pengawas2: p.salinPw ? (x.pengawas2 || null) : null, pengawas2Key: p.salinPw ? (x.pengawas2Key || null) : null
    };
    b.sudahAda = daftar.some(y => aujNormNama(y.nama) === aujNormNama(b.nama) && y.kelas === b.kelas && aujNormNama(y.ruang) === aujNormNama(b.ruang) && y.tanggal === b.tanggal && (y.jamMulai || null) === (b.jamMulai || null));
    b.hariMinggu = new Date(t + 'T12:00:00Z').getUTCDay() === 0; b.libur = !!(libur && libur.has(t));
    return b;
  });
  const tgls = baris.map(b => b.tanggal).sort();
  return { baris, selisih, awal, akhir: tgls[tgls.length - 1], hariSumber: aujBagianTgl(awal).hari, hariBaru: aujBagianTgl(p.tglMulai).hari,
    nMinggu: baris.filter(b => !b.sudahAda && b.hariMinggu).length, nLibur: baris.filter(b => !b.sudahAda && b.libur).length };
}
function aujToggleSalin() {
  if (!aujCanEdit()) return;
  aujSalinBuka = !aujSalinBuka;
  const el = aujEl('aujJdwSalin'); if (el) el.innerHTML = aujSalinBuka ? aujHtmlSalin() : '';
}
function aujSalinAmbil() { return { sumber: aujVal('aujSlSumber'), namaBaru: aujVal('aujSlNama'), tglMulai: aujVal('aujSlTgl'), salinPw: !!(aujEl('aujSlPw') && aujEl('aujSlPw').checked), durasi70: !!(aujEl('aujSlDurasi') && aujEl('aujSlDurasi').checked) }; }
function aujSalinDraftSimpan() {
  aujSalinDraft = aujSalinAmbil();
  if (aujSalinHasil) { aujSalinHasil = null; const pv = aujEl('aujSalinPrev'); if (pv) pv.innerHTML = '<p style="font-size:12px;color:#6b7280;">Isian berubah — klik Pratinjau lagi sebelum menyalin.</p>'; }
}
function aujSalinSumberUbah() {
  const nm = aujEl('aujSlNama'), sm = aujVal('aujSlSumber');
  if (nm && !nm.value.trim() && sm) nm.value = sm.replace(/ASAS/i, 'ASAT').replace(/Ganjil/i, 'Genap');
}
function aujHtmlSalin() {
  const d = aujSalinDraft || {}, nama = [...new Set(allAdmUjian.map(x => x.nama).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
  if (!nama.length) return '<div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:12px;margin-bottom:12px;font-size:13px;">Belum ada jadwal yang bisa disalin.</div>';
  return `<div id="aujSalinForm" oninput="aujSalinDraftSimpan()" onchange="aujSalinDraftSimpan()" style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:12px;margin-bottom:12px;">
    <h5 style="font-weight:700;font-size:14px;margin-bottom:4px;">📑 Salin Jadwal</h5>
    <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">Menyalin semua sesi satu asesmen (mis. ASAS) menjadi asesmen baru (mis. ASAT). Tanggal digeser mengikuti tanggal mulai baru; jam, kelas, ruang, dan mapel tetap sama. Ganti mapel di Data Sesi bila berbeda. Belum ada yang tersimpan sebelum Anda klik Salin di pratinjau.</p>
    <div class="grid-3" style="margin-bottom:10px;">
      <div><label class="label">Asesmen sumber *</label><select id="aujSlSumber" class="field" onchange="aujSalinSumberUbah()"><option value="">-- Pilih --</option>${nama.map(n => `<option value="${escapeHtml(n)}" ${d.sumber === n ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}</select></div>
      <div><label class="label">Nama asesmen baru *</label><input id="aujSlNama" class="field" type="text" maxlength="100" value="${escapeHtml(d.namaBaru || '')}" placeholder="Contoh: ASAT Genap"></div>
      <div><label class="label">Tanggal mulai baru *</label><input id="aujSlTgl" class="field" type="date" value="${escapeHtml(d.tglMulai || '')}"></div>
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:6px;"><input type="checkbox" id="aujSlDurasi" ${d.durasi70 === false ? '' : 'checked'}> Atur ulang lama sesi menjadi ${AUJ_DURASI_MENIT} menit (jam selesai = jam mulai + ${AUJ_DURASI_MENIT}; jam mulai tetap)</label>
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:10px;"><input type="checkbox" id="aujSlPw" ${d.salinPw ? 'checked' : ''}> Ikut salin pengawas (kosongkan bila ingin dibagi ulang dengan 🤖 Isi Pengawas Kosong)</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="aujSalinPratinjau()">👁️ Pratinjau</button><button class="btn btn-soft" onclick="aujToggleSalin()">✖ Tutup</button></div>
    <div id="aujSalinPrev" style="margin-top:12px;">${aujSalinHasil ? aujHtmlSalinHasil() : ''}</div>
  </div>`;
}
function aujSalinPratinjau() {
  if (!aujCanEdit()) return;
  aujSalinDraft = aujSalinAmbil(); aujSalinHasil = null;
  const pv = aujEl('aujSalinPrev'); if (!pv) return;
  const h = aujHitungSalin(aujSalinDraft, allAdmUjian, aujTanggalLiburKalender());
  if (h.error) { pv.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;">${escapeHtml(h.error)}</div>`; return; }
  const baru = h.baris.filter(b => !b.sudahAda);
  const bt = aujCariBentrok(allAdmUjian.concat(baru.map((b, i) => Object.assign({ key: '__salin' + i }, b))));
  h.nBentrok = bt.pasangan.filter(x => String(x.a.key).indexOf('__salin') === 0 || String(x.b.key).indexOf('__salin') === 0).length;
  const tb = aujCekTumpangBaru(baru); h.nTumpang = tb.jumlah; h.contohTumpang = tb.contoh;   // kelas/ruang bertabrakan
  h.p = aujSalinDraft; aujSalinHasil = h;
  pv.innerHTML = aujHtmlSalinHasil();
}
function aujHtmlSalinHasil() {
  const h = aujSalinHasil; if (!h) return '';
  const baru = h.baris.filter(b => !b.sudahAda), lewat = h.baris.length - baru.length;
  const warn = (t, w) => `<p style="font-size:12px;color:${w ? '#991b1b' : '#92400e'};background:${w ? '#fef2f2' : '#fffbeb'};border-radius:6px;padding:6px 10px;margin-bottom:6px;">${t}</p>`;
  const td = 'padding:4px 8px;border-top:1px solid #dbeafe;';
  const rows = h.baris.slice(0, 10).map(b => `<tr style="${b.sudahAda ? 'color:#9ca3af;' : ''}"><td style="${td}white-space:nowrap;">${escapeHtml(aujTglPendek(b.tanggal))}</td><td style="${td}white-space:nowrap;">${escapeHtml(b.jamMulai || '')}–${escapeHtml(b.jamSelesai || '')}</td><td style="${td}">${escapeHtml(b.kelas)} · ${escapeHtml(b.ruang)}</td><td style="${td}">${escapeHtml(b.mapel || '-')}</td><td style="${td}">${b.sudahAda ? 'sudah ada — dilewati' : (b.hariMinggu ? '⚠️ hari Minggu' : (b.libur ? '⚠️ libur Kalender' : '✓'))}</td></tr>`).join('');
  return `<p style="font-size:13px;margin-bottom:6px;"><strong>${baru.length} sesi</strong> akan dibuat sebagai <strong>${escapeHtml(h.p.namaBaru)}</strong>, tanggal ${escapeHtml(aujTglPendek(h.awal === h.baris[0].tanggal ? h.awal : h.baris[0].tanggal))} sampai ${escapeHtml(aujTglPendek(h.akhir))}${lewat ? `; ${lewat} sesi dilewati karena sudah ada` : ''}.</p>
    ${h.hariSumber !== h.hariBaru ? warn(`Hari pertama jadwal sumber ${escapeHtml(h.hariSumber)}, sedangkan tanggal mulai baru jatuh pada ${escapeHtml(h.hariBaru)}. Seluruh jadwal ikut bergeser, jadi hari ujian berubah.`, false) : ''}
    ${h.nMinggu ? warn(`⚠️ ${h.nMinggu} sesi jatuh pada hari Minggu.`, true) : ''}${h.nLibur ? warn(`⚠️ ${h.nLibur} sesi jatuh pada hari libur di Kalender Akademik.`, true) : ''}
    ${h.nBentrok ? warn(`⚠️ ${h.nBentrok} bentrok pengawas dengan sesi lain.`, true) : ''}${h.nTumpang ? warn(`⚠️ ${h.nTumpang} sesi bertabrakan kelas atau ruangnya dengan sesi lain pada jam yang sama, mis. ${escapeHtml((h.contohTumpang || []).join('; '))}.`, true) : ''}
    <div style="overflow-x:auto;background:#fff;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;"><th style="padding:4px 8px;">Tanggal</th><th style="padding:4px 8px;">Waktu</th><th style="padding:4px 8px;">Kelas · Ruang</th><th style="padding:4px 8px;">Mapel</th><th style="padding:4px 8px;">Status</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${h.baris.length > 10 ? `<p style="font-size:12px;color:#6b7280;margin-top:4px;">…dan ${h.baris.length - 10} sesi lainnya.</p>` : ''}
    <div style="margin-top:10px;"><button class="btn btn-success" id="btnAujSalin" onclick="aujSimpanSalin()" ${baru.length ? '' : 'disabled'}>💾 Salin ${baru.length} Sesi</button></div>`;
}
function aujSimpanSalin() {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa menyalin jadwal!', true);
  const h = aujSalinHasil; if (!h) return toast('Klik Pratinjau dulu.', true);
  const baru = h.baris.filter(b => !b.sudahAda);
  if (!baru.length) return toast('Semua sesi pada pratinjau sudah ada.', true);
  if (isBusy('aujSalin')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  if (!confirm(`Salin ${baru.length} sesi menjadi ${h.p.namaBaru}?${h.nMinggu || h.nLibur ? `\n\n⚠️ ${h.nMinggu} sesi di hari Minggu, ${h.nLibur} sesi di hari libur Kalender.` : ''}${h.nBentrok ? `\n\n⚠️ ${h.nBentrok} bentrok pengawas.` : ''}${h.nTumpang ? `\n\n⚠️ ${h.nTumpang} sesi bertabrakan kelas/ruangnya dengan sesi lain.` : ''}`)) return;
  const acuan = aujAcuanSesi(), snapKelas = {}, now = new Date().toISOString(), updates = {}, tersimpan = [], daftarBaru = [];
  const bersih = o => { Object.keys(o).forEach(k => { if (o[k] == null) delete o[k]; }); return o; };
  baru.forEach(b => {
    const key = db.ref(AUJ_NODE).push().key;
    const data = bersih({
      nama: b.nama, kelas: b.kelas, ruang: b.ruang, tanggal: b.tanggal, mapel: b.mapel, jamMulai: b.jamMulai, jamSelesai: b.jamSelesai,
      pengawas1: b.pengawas1, pengawas1Key: b.pengawas1Key, pengawas2: b.pengawas2, pengawas2Key: b.pengawas2Key,
      lokasiDenah: acuan.lokasiDenah, lokasiCatatan: acuan.lokasiCatatan, tatibPeserta: acuan.tatibPeserta, tatibPengawas: acuan.tatibPengawas,
      pesertaSnap: (snapKelas[b.kelas] = snapKelas[b.kelas] || aujBuatSnapPeserta(b.kelas)), tahunAjaran: currentTahunAjaran, semester: currentSemesterAktif || null,
      inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: now
    });
    daftarBaru.push({ key, data });
  });
  aujWarisiDenah(daftarBaru.map(x => x.data));   // denah kursi ikut diwarisi dari sesi lain di ruang & kelas yang sama
  daftarBaru.forEach(x => { updates[x.key] = x.data; tersimpan.push(Object.assign({ key: x.key }, x.data)); });
  const btn = aujEl('btnAujSalin');
  setBusy('aujSalin', btn);
  db.ref(AUJ_NODE).update(updates, err => {   // satu tulisan atomik
    clearBusy('aujSalin', btn);
    if (err) return toast('Gagal: ' + (err.message || err), true);
    tersimpan.forEach(r => allAdmUjian.push(r));
    aujUndoSimpan({ jenis: 'buat', label: `Salin Jadwal ke ${h.p.namaBaru}`, buat: tersimpan.map(r => r.key) });
    toast(`✅ ${tersimpan.length} sesi disalin ke ${h.p.namaBaru}!`);
    addLog('buat_administrasi_ujian', `${h.p.namaBaru} (salin dari ${h.p.sumber}, ${tersimpan.length} sesi)`);
    aujSalinHasil = null; aujSalinDraft = null; aujSalinBuka = false;
    aujSinkronHonorGabung(tersimpan);   // kelas baru di ruang yang sudah punya sesi honor: honor ruang itu ikut diperbarui
    aujPastikanAktif(); aujRenderSemua();
  });
}

// ---------- Cetak jadwal ----------
// Sama dengan AUJ_CSS (margin PMA) tetapi F4 tegak (portrait) dan dirapatkan agar ~14 baris muat 1 halaman; kepala tabel diulang di tiap halaman.
const AUJ_CSS_JADWAL = AUJ_CSS.replace(/@page \{[^}]*\}/, '@page { size: 215mm 330mm; margin: 20mm 20mm 25mm 30mm; }') + `
  thead { display: table-header-group; } tr { page-break-inside: avoid; }
  table.jadwal td, table.jadwal th { font-size: 9.5pt; vertical-align: top; }
  h1 { font-size: 12pt; } .sub { font-size: 10pt; margin-bottom: 6px; } .ttd .ruang { min-height: 46px; } .kop-garis { margin: 4px 0 8px; }
  /* Tampilan minimalis: tanpa kotak, hanya garis tipis; tanggal jadi baris penanda */
  table.data.jadwal th, table.data.jadwal td { border: 0; border-bottom: 0.5pt solid #bbb; padding: 2.5px 5px; }
  table.data.jadwal th { background: none; border-bottom: 1.2pt solid #000; text-align: left; }
  table.data.jadwal tr.hari td { background: #f2f2f2; font-weight: 700; border-bottom: 0.5pt solid #bbb; padding-top: 4px; }
  table.data.jadwal tr.hari { page-break-after: avoid; }
`;
function aujCetakJadwalHtml(daftar) {
  // Dikelompokkan per RUANG; tiap baris = satu sesi, satu mapel, satu ruang. Kelas yang satu ruang, tanggal, jam, dan mapel
  // yang sama digabung ("Kelas 1 + Kelas 2"); bila mapelnya berbeda, tetap baris terpisah (tidak ditulis "A / B").
  const kunci = r => [aujNormNama(r.ruang), r.tanggal, r.jamMulai || '', r.jamSelesai || '', aujNormNama(r.mapel || r.nama)].join('|');
  const peta = {}, urutKunci = [];
  daftar.forEach(r => {
    const k = kunci(r);
    if (!peta[k]) { peta[k] = Object.assign({}, r, { _kelas: [], _pw: [] }); urutKunci.push(k); }
    const g = peta[k];
    if (r.kelas && g._kelas.indexOf(r.kelas) < 0) g._kelas.push(r.kelas);
    [r.pengawas1, r.pengawas2].forEach(n => { if (n && !g._pw.some(x => aujIdPengawas(x) === aujIdPengawas(n))) g._pw.push(n); });
  });
  const sesi = urutKunci.map(k => peta[k]).sort((x, y) => String(x.ruang || '').localeCompare(String(y.ruang || ''), 'id', { numeric: true })
    || (x.tanggal || '').localeCompare(y.tanggal || '') || (x.jamMulai || '').localeCompare(y.jamMulai || '') || 0);
  const grup = [];
  sesi.forEach(r => { const l = grup[grup.length - 1]; if (l && aujNormNama(l.ruang) === aujNormNama(r.ruang)) l.r.push(r); else grup.push({ ruang: r.ruang, r: [r] }); });
  const baris = grup.map(g => `<tr class="hari"><td colspan="5">Ruang ${escapeHtml(g.ruang || '-')}</td></tr>` + g.r.map(r => {
    const pw = r._pw.slice(0, 2).map(escapeHtml).join(' / ') || '-';
    return `<tr><td style="white-space:nowrap;width:78px;">${escapeHtml(aujTglPendek(r.tanggal))}</td><td style="white-space:nowrap;width:78px;">${r.jamMulai && r.jamSelesai ? escapeHtml(r.jamMulai) + ' - ' + escapeHtml(r.jamSelesai) : '-'}</td>
      <td>${escapeHtml(r.mapel || r.nama || '-')}</td><td>${escapeHtml(r._kelas.join(' + ') || '-')}</td><td>${pw}</td></tr>`;
  }).join('')).join('');
  const judul = 'Jadwal ' + aujJudulAsesmen(aujJdwNama);
  const tempat = aujTempat();
  return `<div class="halaman">${aujKopHtml()}
    <h1>${escapeHtml(judul)}</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}${aujJdwKelas ? ' — ' + escapeHtml(aujJdwKelas) : ''}</div>
    <table class="data jadwal"><thead><tr><th>Tanggal</th><th>Waktu (WIB)</th><th>Mata Pelajaran</th><th>Kelas</th><th>Pengawas</th></tr></thead><tbody>${baris}</tbody></table>
    <div style="text-align:right;margin-top:10px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(tglLokal()))}</div>
    <table class="ttd"><tr><td style="width:67%;"></td>${aujTtdPanitiaHtml()}</tr></table>
  </div>`;
}
// Cetak ringkas: SEMUA ruang dalam satu tabel (baris = tanggal + jam, kolom = ruang). Tiap sel: mapel, kelas, pengawas.
// Dirancang muat satu lembar F4 untuk beberapa ruang dan belasan slot; bila slotnya lebih banyak, mengalir ke halaman berikutnya (judul kolom diulang).
const AUJ_CSS_RINGKAS = AUJ_CSS_JADWAL + `
  body { width: 165mm; }   /* sama dengan lebar area cetak, supaya ukuran di layar = hasil cetak (dipakai penyesuaian otomatis) */
  table.rgk { width: 100%; border-collapse: collapse; table-layout: fixed; --fs: 7.5pt; }
  table.rgk th, table.rgk td { border: 0.5pt solid #777; padding: 1.5px 3px; font-size: var(--fs); vertical-align: top; text-align: left; line-height: 1.2; }
  table.rgk th { background: #eee; text-align: center; font-weight: 700; }
  table.rgk td.tgl { font-weight: 700; text-align: center; vertical-align: middle; }
  table.rgk td.jam { text-align: center; }
  table.rgk .mp { font-weight: 700; } table.rgk .kl { font-weight: 400; font-size: 0.93em; color: #333; }
  table.rgk .pw { font-size: 0.93em; font-style: italic; color: #222; }
  table.rgk hr { border: 0; border-top: 0.5pt dotted #888; margin: 1.5px 0; }
  table.rgk .kosong { color: #999; text-align: center; display: block; }
  .ket-rgk { font-size: 7.5pt; margin-top: 3px; color: #333; }
`;
function aujCetakJadwalRingkasHtml(daftar) {
  const n = aujNormNama, peta = {}, urutSlot = [], ruangList = [];
  const kls = a => (a.length > 1 && a.every(x => /^kelas\s+\S+$/i.test(x))) ? 'Kelas ' + a.map(x => x.replace(/^kelas\s+/i, '')).join('+') : a.join(' + ');   // "Kelas 1 + Kelas 2" -> "Kelas 1+2"
  daftar.forEach(r => {   // satu entri per (jam, ruang, mapel); kelas satu ruang dengan mapel sama digabung
    const slot = [r.tanggal || '', r.jamMulai || '', r.jamSelesai || ''].join('|'), ruang = r.ruang || '-', rk = n(ruang);
    if (!ruangList.some(x => n(x) === rk)) ruangList.push(ruang);
    if (urutSlot.indexOf(slot) < 0) urutSlot.push(slot);
    const k = slot + '#' + rk + '#' + n(r.mapel || r.nama), g = peta[k] || (peta[k] = { slot, rk, mapel: r.mapel || r.nama || '-', kelas: [], pw: [] });
    if (r.kelas && g.kelas.indexOf(r.kelas) < 0) g.kelas.push(r.kelas);
    [r.pengawas1, r.pengawas2].forEach(nm => { if (nm && !g.pw.some(x => aujIdPengawas(x) === aujIdPengawas(nm))) g.pw.push(nm); });
  });
  ruangList.sort((a, b) => String(a).localeCompare(String(b), 'id', { numeric: true }));
  urutSlot.sort();
  const perSlot = {}, jmlTgl = {};
  Object.keys(peta).forEach(k => { const g = peta[k]; (perSlot[g.slot] = perSlot[g.slot] || []).push(g); });
  urutSlot.forEach(sl => { const t = sl.split('|')[0]; jmlTgl[t] = (jmlTgl[t] || 0) + 1; });
  let tglLalu = null;
  const baris = urutSlot.map(sl => {
    const p = sl.split('|'), kolTgl = p[0] !== tglLalu ? `<td class="tgl" rowspan="${jmlTgl[p[0]]}">${escapeHtml(aujTglPendek(p[0]))}</td>` : ''; tglLalu = p[0];
    const sel = ruangList.map(ru => {
      const isi = (perSlot[sl] || []).filter(g => g.rk === n(ru));
      return '<td>' + (isi.length ? isi.map(g => `<div class="mp">${escapeHtml(g.mapel)}${g.kelas.length ? ` <span class="kl">(${escapeHtml(kls(g.kelas))})</span>` : ''}</div><div class="pw">${g.pw.slice(0, 2).map(escapeHtml).join(' / ') || '-'}</div>`).join('<hr>') : '<span class="kosong">–</span>') + '</td>';
    }).join('');
    return `<tr>${kolTgl}<td class="jam">${p[1] && p[2] ? escapeHtml(p[1]) + '–' + escapeHtml(p[2]) : '-'}</td>${sel}</tr>`;
  }).join('');
  const judul = 'Jadwal ' + aujJudulAsesmen(aujJdwNama), tempat = aujTempat();
  return `<div class="halaman">${aujKopHtml()}
    <h1>${escapeHtml(judul)}</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}${aujJdwKelas ? ' — ' + escapeHtml(aujJdwKelas) : ''}</div>
    <table class="rgk"><thead><tr><th style="width:13%;">Tanggal</th><th style="width:11%;">Waktu</th>${ruangList.map(ru => `<th>Ruang ${escapeHtml(String(ru).replace(/^ruang\s*/i, ''))}</th>`).join('')}</tr></thead><tbody>${baris}</tbody></table>
    <div class="ket-rgk">Keterangan tiap kotak: <strong>mata pelajaran</strong> (kelas), lalu <em>nama pengawas</em>.</div>
    <div style="text-align:right;margin-top:8px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(tglLokal()))}</div>
    <table class="ttd"><tr><td style="width:67%;"></td>${aujTtdPanitiaHtml()}</tr></table>
  </div>
  <script>(function(){var t=document.querySelector('table.rgk'),h=document.querySelector('.halaman');if(!t||!h)return;var fs=7.5;while(h.offsetHeight>1045&&fs>6.25){fs-=0.25;t.style.setProperty('--fs',fs+'pt');}})();</script>`;
}
function aujCetakJadwal(mode) {
  const daftar = aujJadwalTersaring();
  if (!daftar.length) return toast('Belum ada jadwal untuk dicetak.', true);
  const nb = aujCariBentrok(daftar).pasangan.length;
  if (nb) toast(`⚠️ Ada ${nb} pengawas bentrok di jadwal ini — periksa dulu sebelum dibagikan.`, false, 5000);
  if (!aujKetuaPanitia() && !aujHanyaGuru()) {   // nama Ketua belum ada (SK Panitia belum diisi): tanya sekali, diingat di perangkat ini
    const n = prompt('Nama Ketua Panitia belum diisi.\nKetik namanya agar tercetak di tanda tangan jadwal (diingat di perangkat ini; atau isi di tab SK Panitia).\nKosongkan untuk diisi tangan:', '');
    if (n && n.trim()) { try { localStorage.setItem(AUJ_KETUA_KEY, n.trim().slice(0, 80)); } catch (e) { /* abaikan */ } }
  }
  aujCetakHtml(mode === 'ringkas' ? aujCetakJadwalRingkasHtml(daftar) : aujCetakJadwalHtml(daftar), `Jadwal Ujian${mode === 'ringkas' ? ' (Ringkas)' : ''}${aujJdwNama ? ' - ' + aujJdwNama : ''}${aujJdwKelas ? ' - ' + aujJdwKelas : ''}`, mode === 'ringkas' ? AUJ_CSS_RINGKAS : AUJ_CSS_JADWAL);
}


// =====================================================
// HONOR PENGAWAS DARI JADWAL -- jadwal = sumber tunggal penugasan
// =====================================================
// Tombol "Buat Sesi Honor" membuat sesi di node `ujian` (halaman Honor Ujian) dari tiap sesi jadwal. Kunci sesi tetap
// (adm_<kunciJadwal>) sehingga menekan tombol dua kali tidak membuat sesi ganda. Yang disimpan: pengawas: { kunciGuru: true },
// serta mulaiMs/selesaiMs (epoch, WIB) supaya Firebase Rules bisa memeriksa jendela check-in. Check-in guru (event-ujian.js)
// hanya diterima Rules bila guru itu tercantum di `pengawas` dan waktunya dalam jendela.
const AUJ_HONOR_PREFIX = 'adm_';
// Kelas-kelas satu ruang & jam memakai SATU sesi honor (dipegang sesi "pemilik"), jadi honor pengawas dibayar sekali per ruang.
function aujSesiHonorDari(jadwalKey) {
  const au = (typeof allUjian !== 'undefined' && allUjian) || [], rec = allAdmUjian.find(x => x.key === jadwalKey);
  const pemilik = rec ? aujPemilikHonor(rec).key : jadwalKey;
  return au.find(u => u.key === AUJ_HONOR_PREFIX + pemilik) || null;
}
// Pemilik sesi honor satu ruang: anggota yang sudah punya sesi honor; kalau belum ada, anggota pertama (urut kelas).
function aujPemilikHonor(r) {
  const g = aujGrupRuang(r); if (g.length < 2) return r;
  const au = (typeof allUjian !== 'undefined' && allUjian) || [];
  return g.find(x => au.some(u => u.key === AUJ_HONOR_PREFIX + x.key)) || g[0];
}
function aujMsWIB(tgl, jam) { if (!tgl || !jam) return null; const t = Date.parse(`${tgl}T${String(jam).slice(0, 5)}:00+07:00`); return isNaN(t) ? null : t; }
function aujNamaHonor(r) {
  const g = aujGrupRuang(r);
  if (g.length > 1) return ('Pengawas ' + (r.nama || '-') + ' · ' + g.map(x => x.kelas || '-').join(' + ') + ' · ' + (r.ruang || '-')).slice(0, 120);
  return ('Pengawas ' + (r.mapel || r.nama || '-') + ' · ' + (r.kelas || '-') + ' · ' + (r.ruang || '-')).slice(0, 120);
}
// Pengawas satu ruang = gabungan pengawas semua kelas di ruang itu (tiap orang satu honor).
function aujKunciPengawasRuang(r) {
  const map = {}, tidakDikenal = [];
  aujGrupRuang(r).forEach(x => { const h = aujKunciPengawasSesi(x); Object.assign(map, h.map); h.tidakDikenal.forEach(n => { if (tidakDikenal.indexOf(n) < 0) tidakDikenal.push(n); }); });
  return { map, tidakDikenal };
}
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
  const waktuBerubah = u.key === AUJ_HONOR_PREFIX + rec.key && ((rec.tanggal || '') !== (isi.tanggal || '') || (rec.jamMulai || null) !== (isi.jamMulai || null) || (rec.jamSelesai || null) !== (isi.jamSelesai || null));   // jam hanya dikunci di sesi pemilik honor
  const tetap = new Set([isi.pengawas1Key, isi.pengawas2Key].filter(Boolean));
  aujGrupRuang(rec).filter(x => x.key !== rec.key).forEach(x => Object.keys(aujKunciPengawasSesi(x).map).forEach(k => tetap.add(k)));   // pengawas yang tetap bertugas di kelas lain satu ruang bukan "dicopot"
  const dicopot = hadir.filter(a => !tetap.has(a.guruKey)).map(a => a.guru || a.guruKey);
  if (!waktuBerubah && !dicopot.length) return true;
  toast('⛔ Sesi ini sudah punya check-in honor pengawas' + (dicopot.length ? ' (' + dicopot.join(', ') + ' sudah check-in)' : '') + '. Tanggal/jam dan pengawas yang sudah check-in tidak bisa diubah; hapus check-in-nya dulu di Honor Ujian bila memang salah.', true, 7000);
  return false;
}
// Dipanggil sesudah sesi jadwal berhasil diubah: samakan sesi honornya (kalau ada).
function aujSinkronHonor(rec) {
  const u = aujSesiHonorDari(rec.key); if (!u) return;
  if (!isReallyOnline()) return toast('⚠️ Sesi honor belum ikut diperbarui (offline). Tekan "Buat Sesi Honor" lagi nanti atau periksa di Honor Ujian.', true, 6000);
  const pm = aujPemilikHonor(rec), { map, tidakDikenal } = aujKunciPengawasRuang(rec);
  const mulaiMs = aujMsWIB(pm.tanggal, pm.jamMulai), selesaiMs = aujMsWIB(pm.tanggal, pm.jamSelesai);
  if (!Object.keys(map).length && !tidakDikenal.length) {   // semua pengawas dicopot: sesi honor lama tidak boleh tetap membuka check-in
    const sudahCheckin = ((typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || []).some(x => x.ujianKey === u.key);
    if (sudahCheckin) return toast('⚠️ Sesi honor tetap dipertahankan karena sudah ada check-in. Periksa di Honor Ujian.', true, 7000);
    return db.ref('ujian/' + u.key).remove(err => {
      if (err) return toast('⚠️ Pengawas dicopot, tetapi sesi honor gagal dihapus: ' + (err.message || err) + '. Periksa di Honor Ujian.', true, 8000);
      if (typeof allUjian !== 'undefined') allUjian = allUjian.filter(z => z.key !== u.key);
      toast('ℹ️ Sesi honor dihapus karena tidak ada pengawas tersisa.', false, 4000); aujRenderSemua();
    });
  }
  if (!Object.keys(map).length || tidakDikenal.length || mulaiMs == null || selesaiMs == null) return toast('⚠️ Sesi honor TIDAK diperbarui: pengawas atau jam belum lengkap / tidak dikenal. Periksa di Honor Ujian.', true, 7000);
  const data = { pengawas: map, tanggal: pm.tanggal, jamMulai: pm.jamMulai, jamSelesai: pm.jamSelesai, mulaiMs, selesaiMs, nama: aujNamaHonor(pm), updatedAt: new Date().toISOString() };
  db.ref('ujian/' + u.key).update(data, err => { if (err) return toast('⚠️ Sesi honor gagal diperbarui: ' + (err.message || err), true, 7000); Object.assign(u, data); });
}
// Honor satu ruang harus dipegang SATU sesi honor. Bila sesi berpindah ruang/jam dan bergabung dengan kelas yang sudah punya sesi honor,
// jadilah dua sesi honor untuk satu ruang (honor ganda + dua jendela check-in). Fungsi ini menghapus yang berlebih: yang sudah ada check-in /
// pengajuan susulan TIDAK dihapus (hanya diperingatkan), dan bila tidak ada yang terkunci, yang dipertahankan adalah sesi pemilik ruang.
// `sesudah` dipanggil setelah selesai (atau langsung bila tidak ada yang perlu dirapikan).
function aujBersihkanHonorGanda(rec, sesudah) {
  const selesai = () => { if (typeof sesudah === 'function') sesudah(); };
  const au = (typeof allUjian !== 'undefined' && allUjian) || [], grup = aujGrupRuang(rec);
  const punya = grup.map(x => au.find(u => u.key === AUJ_HONOR_PREFIX + x.key)).filter(Boolean);
  if (punya.length < 2) return selesai();
  const att = (typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || [], sus = (typeof allUjianSusulan !== 'undefined' && allUjianSusulan) || [];
  const terkunci = u => att.some(a => a.ujianKey === u.key) || sus.some(z => z.ujianKey === u.key);
  const kunciPemilik = AUJ_HONOR_PREFIX + aujPemilikHonor(rec).key;
  const ada = punya.filter(terkunci);
  const simpan = ada.length ? ada.map(u => u.key) : [kunciPemilik];
  const buang = punya.filter(u => simpan.indexOf(u.key) < 0 && !terkunci(u));
  if (ada.length > 1) toast('⚠️ Ruang ' + (rec.ruang || '') + ' punya ' + ada.length + ' sesi honor yang sama-sama sudah ada check-in/susulan. Periksa di Honor Ujian agar honor tidak dobel.', true, 8000);
  if (!buang.length) return selesai();
  if (!isReallyOnline()) { toast('⚠️ Ruang ini punya lebih dari satu sesi honor, tetapi belum dirapikan karena offline. Periksa di Honor Ujian.', true, 7000); return selesai(); }
  const upd = {}; buang.forEach(u => { upd[u.key] = null; });
  db.ref('ujian').update(upd, err => {
    if (err) { toast('⚠️ Sesi honor ganda gagal dihapus: ' + (err.message || err) + '. Periksa di Honor Ujian.', true, 8000); return selesai(); }
    const gone = new Set(buang.map(u => u.key)); allUjian = allUjian.filter(u => !gone.has(u.key));
    toast('ℹ️ ' + buang.length + ' sesi honor ganda untuk ruang ' + (rec.ruang || '') + ' dihapus; honor dibayar sekali per ruang.', false, 5000);
    selesai();
  });
}
// Dipanggil sesudah sesi jadwal berhasil diubah: rapikan honor ganda lalu samakan sesi honornya.
function aujSesudahUbahSesi(rec) { aujBersihkanHonorGanda(rec, () => aujSinkronHonor(rec)); }
// Sesi baru (Jadwal Massal / Salin) yang masuk ke ruang yang SUDAH punya sesi honor (kelas lain, ruang & jam sama): sesi honor itu harus ikut
// memuat pengawas dan nama kelas barunya, kalau tidak pengawas kelas baru tidak bisa check-in. Satu sesi honor cukup disinkronkan sekali.
function aujSinkronHonorGabung(sesiBaru) {
  const dilihat = {};
  (sesiBaru || []).forEach(r => { const u = aujSesiHonorDari(r.key); if (u && !dilihat[u.key]) { dilihat[u.key] = true; aujSinkronHonor(r); } });
}
// Ringkasan sesudah sesi honor dibuat dari jadwal: kelas satu ruang & jam digabung jadi SATU sesi honor, dan sesi yang dilewati disebut alasannya
// (dulu alasan hanya muncul bila tidak ada satu pun sesi honor yang terbuat).
function aujLaporHonor(sesi, sp) {
  const bagian = [];
  if (sp.ruangSesi < sesi.length) bagian.push(`${sesi.length} sesi jadwal menjadi ${sp.ruangSesi} sesi honor: kelas yang satu ruang dan jam digabung dalam satu sesi honor (honor dibayar sekali per ruang)`);
  if (sp.lewati.length) bagian.push(`${sp.lewati.length} sesi dilewati, mis. ${sp.lewati[0]}`);
  if (bagian.length) toast('ℹ️ ' + bagian.join('. ') + '.', false, 10000);
}
// Pilih sesi jadwal yang layak dibuatkan sesi honor (punya pengawas dikenal + jam lengkap, belum punya sesi honor).
function aujSiapHonor(daftar) {
  const layak = [], lewati = [], pemilik = [], lihat = new Set();
  daftar.forEach(r => { const o = aujPemilikHonor(r); if (!lihat.has(o.key)) { lihat.add(o.key); pemilik.push(o); } });   // satu sesi honor per ruang
  pemilik.forEach(r => {
    const label = aujLabelSesi(r) + ' · ' + aujTglPendek(r.tanggal);
    if (aujSesiHonorDari(r.key)) return;   // sudah dibuat sebelumnya (diam-diam dilewati, bukan masalah)
    const { map, tidakDikenal } = aujKunciPengawasRuang(r);
    const mulaiMs = aujMsWIB(r.tanggal, r.jamMulai), selesaiMs = aujMsWIB(r.tanggal, r.jamSelesai);
    if (!Object.keys(map).length && !tidakDikenal.length) return lewati.push(label + ' — belum ada pengawas');
    if (tidakDikenal.length) return lewati.push(label + ' — pengawas "' + tidakDikenal.join('", "') + '" tidak cocok dengan Data Guru');
    if (mulaiMs == null || selesaiMs == null || selesaiMs <= mulaiMs) return lewati.push(label + ' — jam mulai/selesai belum lengkap');
    layak.push({ r, map, mulaiMs, selesaiMs });
  });
  return { layak, lewati, ruangSesi: pemilik.length };
}
// Tulis sesi honor (satu tulisan atomik). Dipakai tombol "Buat Sesi Honor" dan opsi honor otomatis di Jadwal Massal.
function aujTulisHonor(layak, honor, selesai) {
  if (isBusy('aujHonor')) return toast('Sedang menyimpan...', false, 1500);
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
    if (err) return toast('Gagal membuat sesi honor: ' + (err.message || err) + '. Jadwal tetap tersimpan; coba tombol "Buat Sesi Honor".', true, 7000);
    baru.forEach(u => { allUjian = allUjian.filter(e => e.key !== u.key); allUjian.push(u); });
    toast(`✅ ${baru.length} sesi honor pengawas dibuat!`); addLog('buat_sesi_honor_ujian', `${baru.length} sesi @ Rp ${honor}`);
    aujRenderSemua();
    if (typeof selesai === 'function') selesai(baru);
  });
}
function aujBuatSesiHonor() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  if (isBusy('aujHonor')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  const daftar = aujJadwalTersaring();
  if (!daftar.length) return toast('Tidak ada sesi jadwal (periksa filter).', true);
  const { layak, lewati } = aujSiapHonor(daftar);
  if (!layak.length) return toast(lewati.length ? 'Tidak ada sesi yang bisa dibuat:\n• ' + lewati.slice(0, 6).join('\n• ') : 'Semua sesi pada daftar ini sudah punya sesi honor.', true, 7000);
  const def = (typeof V4 !== 'undefined' && V4.rates && V4.rates.activity) || '';
  const masuk = prompt(`Honor per pengawas untuk SATU sesi (Rp)?\n\n${layak.length} sesi akan dibuat${lewati.length ? `, ${lewati.length} dilewati (lengkapi pengawas/jamnya dulu)` : ''}.`, def);
  if (masuk === null) return;
  const honor = parseInt(String(masuk).replace(/[^0-9]/g, ''), 10) || 0;
  if (honor <= 0) return toast('Honor harus lebih dari 0!', true);
  const bt = aujCariBentrok(allAdmUjian), kunciBentrok = new Set();
  layak.forEach(x => { if (bt.perKey[x.r.key] && bt.perKey[x.r.key].length) kunciBentrok.add(x.r.key); });
  if (!confirm(`Buat ${layak.length} sesi honor pengawas @ Rp ${honor.toLocaleString('id-ID')}?` + (kunciBentrok.size ? `\n\n⚠️ ${kunciBentrok.size} sesi punya pengawas yang bentrok jam. Orang yang sama bisa terbayar dua kali untuk jam yang bertumpuk — sebaiknya rapikan jadwal dulu.` : '') + (lewati.length ? `\n\nDilewati (${lewati.length}):\n• ` + lewati.slice(0, 5).join('\n• ') + (lewati.length > 5 ? '\n• …' : '') : ''))) return;
  aujTulisHonor(layak, honor);
}

// ---------- (1) Isi pengawas kosong pada sesi yang sudah tersimpan ----------
// Murni. daftar = sesi yang akan diisi (hasil filter), pool = [{key,name}], semua = seluruh sesi tersimpan, jml = 1|2.
// Mengembalikan { target, patch:{ key:{pengawas1,pengawas1Key,pengawas2,pengawas2Key} }, kini, tanpaCelah } atau { error }.
function aujRencanaIsiPengawas(daftar, pool, semua, jml) {
  const target = daftar.filter(r => ((r.pengawas1 ? 1 : 0) + (r.pengawas2 ? 1 : 0)) < jml);
  if (!target.length) return { error: 'Semua sesi pada daftar sudah punya pengawas sesuai jumlah yang dipilih.' };
  const ganti = {}; let kini = semua.slice(), tanpaCelah = 0;
  for (const nm of [...new Set(target.map(r => r.nama || ''))]) {
    const grup = target.filter(r => (r.nama || '') === nm).map(r => Object.assign({}, r));
    const hasil = aujBagiPengawas(grup, pool, kini, jml, nm);
    if (hasil.error) return hasil;
    tanpaCelah += hasil.tanpaCelah;
    grup.forEach(g => { ganti[g.key] = g; });
    kini = kini.map(x => ganti[x.key] || x);
  }
  const patch = {};
  target.forEach(r => {
    const g = ganti[r.key], u = {};
    if ((g.pengawas1 || null) !== (r.pengawas1 || null)) { u.pengawas1 = g.pengawas1 || null; u.pengawas1Key = g.pengawas1Key || null; }
    if ((g.pengawas2 || null) !== (r.pengawas2 || null)) { u.pengawas2 = g.pengawas2 || null; u.pengawas2Key = g.pengawas2Key || null; }
    if (Object.keys(u).length) patch[r.key] = u;
  });
  return { target, patch, kini, tanpaCelah };
}
function aujIsiPengawasKosong() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  if (isBusy('aujIsiPw')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  const daftar = aujJadwalTersaring();
  if (!daftar.length) return toast('Tidak ada sesi jadwal (periksa filter).', true);
  const masuk = prompt(`Isi pengawas yang masih kosong pada ${daftar.length} sesi yang tampil (mengikuti filter di bawah).\n\nJumlah pengawas per sesi (1 atau 2)?`, '2');
  if (masuk === null) return;
  const jml = String(masuk).trim() === '1' ? 1 : (String(masuk).trim() === '2' ? 2 : 0);
  if (!jml) return toast('Isi 1 atau 2.', true);
  const rencana = aujRencanaIsiPengawas(daftar, aujPoolOtomatis(), allAdmUjian, jml);
  if (rencana.error) return toast(rencana.error, true, 6000);
  const kunci = Object.keys(rencana.patch);
  if (!kunci.length) return toast('Tidak ada perubahan yang bisa dibuat.', true);
  const set = new Set(kunci), bt = aujCariBentrok(rencana.kini);
  const nBentrok = bt.pasangan.filter(x => set.has(x.a.key) || set.has(x.b.key)).length;
  if (!confirm(`Isi pengawas otomatis (bagi rata) pada ${kunci.length} sesi?` + (nBentrok ? `\n\n⚠️ ${nBentrok} bentrok pengawas akan muncul (guru yang bebas jam tidak cukup). Bisa diganti manual sesudahnya.` : '') + (rencana.tanpaCelah ? `\n\n${rencana.tanpaCelah} penugasan tidak menemukan guru yang bebas jam.` : '') + '\n\nHanya slot pengawas yang kosong yang diisi; yang sudah terisi tidak diubah.')) return;
  const updates = {};
  kunci.forEach(k => Object.keys(rencana.patch[k]).forEach(f => { updates[k + '/' + f] = rencana.patch[k][f]; }));
  setBusy('aujIsiPw');
  db.ref(AUJ_NODE).update(updates, err => {
    clearBusy('aujIsiPw');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    let honorBelum = 0;
    const catatUbah = {};
    kunci.forEach(k => {
      const rec = allAdmUjian.find(x => x.key === k); if (!rec) return;
      const sebelum = {}; Object.keys(rencana.patch[k]).forEach(f => { sebelum[f] = rec[f] == null ? null : rec[f]; });   // untuk Urungkan
      catatUbah[k] = { before: sebelum, after: Object.assign({}, rencana.patch[k]) };
      Object.assign(rec, rencana.patch[k]);
      if (aujSesiHonorDari(k)) aujSinkronHonor(rec); else honorBelum++;   // sesi honor yang sudah ada ikut diperbarui
    });
    toast(`✅ Pengawas terisi pada ${kunci.length} sesi.${honorBelum ? ' Sesi honor belum dibuat: pakai 💰 Buat Sesi Honor.' : ''}`, false, 5000);
    addLog('ubah_administrasi_ujian', `isi pengawas otomatis ${kunci.length} sesi`);
    aujUndoSimpan({ jenis: 'ubah', label: 'Isi Pengawas Kosong', ubah: catatUbah });
    aujRenderSemua();
  });
}

// =====================================================
// PENGAWAS BERHALANGAN -- ganti satu guru di banyak sesi sekaligus
// =====================================================
// Hanya mengubah field pengawas yang sudah ada (pengawas1/2 + Key) lewat satu update, lalu sesi honor ikut disinkronkan
// (jalur yang sama dengan Isi Pengawas Kosong). Sesi yang pengawas lamanya sudah check-in / punya susulan / dicentang Hadir dilewati.
// Kelas-kelas satu ruang diganti bersama supaya ruang tidak berisi tiga pengawas.
let aujBhBuka = false, aujBhDraft = null, aujBhHasil = null;
function aujSlotGuru(rec, guruKey) {   // slot (1|2) yang dipegang guru itu di sesi ini; 0 bila tidak ada
  if (!rec || !guruKey) return 0;
  const k1 = rec.pengawas1 ? (rec.pengawas1Key || aujKunciGuru(rec.pengawas1)) : null, k2 = rec.pengawas2 ? (rec.pengawas2Key || aujKunciGuru(rec.pengawas2)) : null;
  return k1 === guruKey ? 1 : (k2 === guruKey ? 2 : 0);
}
// Alasan satu baris tidak boleh diganti (membaca data terbaru yang ada di memori saat dipanggil).
function aujBhKunci(row, guruKey) {
  const alasan = [], att = (typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || [], sus = (typeof allUjianSusulan !== 'undefined' && allUjianSusulan) || [];
  const u = aujSesiHonorDari(row.recs[0].key);
  if (u && att.some(c => c.ujianKey === u.key && c.guruKey === guruKey)) alasan.push('sudah check-in honor');
  if (u && sus.some(z => z.ujianKey === u.key && z.guruKey === guruKey)) alasan.push('ada pengajuan susulan honor');
  if (row.recs.some(r => (r.pengawasHadir || {})['p' + aujSlotGuru(r, guruKey)])) alasan.push('sudah dicentang Hadir di Daftar Hadir');
  return alasan;
}
// Pasang pengganti g pada satu baris: patch per sesi { key: { pengawasN, pengawasNKey } }. kini (opsional) = peta sesi yang ikut diperbarui.
function aujBhPasang(row, g, guruKey, kini) {
  row.baru = { key: g.key, name: g.name }; row.patch = {};
  row.recs.forEach(r => {
    const s = aujSlotGuru(r, guruKey), pt = {}; if (!s) return;
    pt['pengawas' + s] = g.name; pt['pengawas' + s + 'Key'] = g.key; row.patch[r.key] = pt;
    if (kini) kini[r.key] = Object.assign({}, r, pt);
  });
}
function aujRencanaGantiPengawas(p) {
  const err = m => ({ error: m });
  if (!p.guruKey) return err('Pilih guru yang berhalangan.');
  if (!aujAdaTanggal(p.dari) || !aujAdaTanggal(p.sampai)) return err('Isi rentang tanggal dengan benar.');
  if (p.dari > p.sampai) return err('Tanggal "sampai" tidak boleh sebelum tanggal "dari".');
  const guru = (allGuru || []).find(g => g.key === p.guruKey), nama = guru ? guru.name : p.guruKey;
  const terkena = allAdmUjian.filter(r => r.tanggal && r.tanggal >= p.dari && r.tanggal <= p.sampai && aujSlotGuru(r, p.guruKey))
    .sort((a, b) => (a.tanggal + (a.jamMulai || '')).localeCompare(b.tanggal + (b.jamMulai || '')) || String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }));
  if (!terkena.length) return err(`${nama} tidak tercatat mengawas pada rentang tanggal itu.`);
  const lihat = new Set(), rows = [];
  terkena.forEach(r => {
    if (lihat.has(r.key)) return;
    const grup = aujGrupRuang(r); grup.forEach(x => lihat.add(x.key));
    const recs = grup.filter(x => aujSlotGuru(x, p.guruKey));
    const mapel = []; recs.forEach(x => { if (x.mapel && mapel.indexOf(x.mapel) < 0) mapel.push(x.mapel); });
    rows.push({ recs, rec0: r, tanggal: r.tanggal, jamMulai: r.jamMulai, jamSelesai: r.jamSelesai, ruang: r.ruang, kelas: recs.map(x => x.kelas || '-').join(' + '), mapel: mapel.join(' / '), baru: null, patch: null, status: 'ok', alasan: '', bentrok: [] });
  });
  const beban = {}; aujLipatRuang(allAdmUjian).forEach(x => aujPengawasDari(x).forEach(pw => { beban[pw.k] = (beban[pw.k] || 0) + 1; }));
  const poolOto = aujPoolOtomatis().filter(g => g.key !== p.guruKey), kini = {};
  const siagaSet = new Set(p.siaga || []), kandSiaga = aujPoolPengawas().filter(g => siagaSet.has(g.key) && g.key !== p.guruKey);   // siaga yang dipilih Admin tetap dipakai walau termasuk daftar pengecualian
  allAdmUjian.forEach(x => { kini[x.key] = x; });
  rows.forEach(row => {
    const kunci = aujBhKunci(row, p.guruKey);
    if (kunci.length) { row.status = 'lewat'; row.alasan = kunci.join(', '); return; }
    const ada = new Set(); aujGrupRuang(row.rec0).forEach(x => aujPengawasDari(x).forEach(pw => ada.add(pw.k)));
    let pilih = null;
    if (p.penggantiKey) {
      pilih = (allGuru || []).find(g => g.key === p.penggantiKey) || null;
      if (pilih && ada.has(pilih.key)) { row.status = 'lewat'; row.alasan = pilih.name + ' sudah mengawas di ruang ini'; return; }
    } else {
      const bebas = g => !Object.keys(kini).some(k => { const x = kini[k]; return x.tanggal === row.tanggal && aujTumpang(x, row.rec0) && !aujSatuRuang(x, row.rec0) && aujPengawasDari(x).some(pw => pw.k === g.key); });
      const urut = arr => arr.filter(g => !ada.has(g.key)).sort((a, b) => ((beban[a.key] || 0) - (beban[b.key] || 0)) || (arr.indexOf(a) - arr.indexOf(b))).find(bebas) || null;
      pilih = urut(kandSiaga);
      if (pilih) row.sumber = 'siaga'; else { pilih = urut(poolOto); if (pilih && kandSiaga.length) row.sumber = 'umum'; }
    }
    if (!pilih) { row.status = 'tanpa'; row.alasan = 'tidak ada guru lain yang bebas jam (pilih manual)'; return; }
    aujBhPasang(row, pilih, p.guruKey, kini); beban[pilih.key] = (beban[pilih.key] || 0) + 1;
  });
  const h = { p, nama, rows };
  aujBhHitungBentrok(h);
  return h;
}
// Bentrok pengawas pengganti terhadap sesi lain (dihitung dari jadwal setelah semua penggantian diterapkan).
function aujBhHitungBentrok(h) {
  const peta = {}; allAdmUjian.forEach(x => { peta[x.key] = x; });
  h.rows.forEach(row => { if (row.baru && row.status === 'ok') Object.keys(row.patch).forEach(k => { peta[k] = Object.assign({}, peta[k], row.patch[k]); }); });
  const bt = aujCariBentrok(Object.keys(peta).map(k => peta[k]));
  h.nBentrok = 0;
  h.rows.forEach(row => {
    row.bentrok = []; if (!row.baru || row.status !== 'ok') return;
    row.recs.forEach(r => (bt.perKey[r.key] || []).filter(x => aujIdPengawas(x.nama) === aujIdPengawas(row.baru.name)).forEach(x => row.bentrok.push(x)));
    if (row.bentrok.length) h.nBentrok++;
  });
}
function aujToggleBh() {
  if (!aujCanEdit()) return;
  aujBhBuka = !aujBhBuka; if (!aujBhBuka) aujBhHasil = null;
  const el = aujEl('aujJdwBhl'); if (el) el.innerHTML = aujBhBuka ? aujHtmlBh() : '';
}
const AUJ_SIAGA_KEY = 'si-mamba-auj-siaga';
function aujSiagaBaca() { try { const v = JSON.parse(localStorage.getItem(AUJ_SIAGA_KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch (e) { return []; } }
function aujSiagaSimpan(arr) { try { localStorage.setItem(AUJ_SIAGA_KEY, JSON.stringify(arr || [])); } catch (e) { /* penyimpanan penuh/diblokir: daftar siaga hanya tidak diingat */ } }
function aujBhAmbil() { return { guruKey: aujVal('aujBhGuru'), dari: aujVal('aujBhDari'), sampai: aujVal('aujBhSampai'), penggantiKey: aujVal('aujBhPengganti'), siaga: [...document.querySelectorAll('.aujBhSiagaCek')].filter(c => c.checked).map(c => c.value) }; }
function aujBhSimpanDraft() {
  aujBhDraft = aujBhAmbil(); aujSiagaSimpan(aujBhDraft.siaga);   // daftar siaga diingat di perangkat ini
  if (aujBhHasil) { aujBhHasil = null; const pv = aujEl('aujBhPrev'); if (pv) pv.innerHTML = '<p style="font-size:12px;color:#6b7280;">Isian berubah — klik Pratinjau lagi sebelum menerapkan.</p>'; }
}
function aujHtmlBh() {
  const d = aujBhDraft || {}, hariIni = (typeof tglLokal === 'function') ? tglLokal() : '';
  const guruSesi = {};
  allAdmUjian.forEach(r => [[r.pengawas1, r.pengawas1Key], [r.pengawas2, r.pengawas2Key]].forEach(x => { if (!x[0]) return; const k = x[1] || aujKunciGuru(x[0]); if (k) guruSesi[k] = x[0]; }));
  const optG = Object.keys(guruSesi).sort((a, b) => guruSesi[a].localeCompare(guruSesi[b], 'id')).map(k => `<option value="${escapeHtml(k)}" ${d.guruKey === k ? 'selected' : ''}>${escapeHtml(guruSesi[k])}</option>`).join('');
  const optP = aujPoolPengawas().map(g => `<option value="${escapeHtml(g.key)}" ${d.penggantiKey === g.key ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('');
  const siagaPilih = new Set(d.siaga || aujSiagaBaca());
  const siagaHtml = aujPoolPengawas().map(g => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="checkbox" class="aujBhSiagaCek" value="${escapeHtml(g.key)}" ${siagaPilih.has(g.key) ? 'checked' : ''}> ${escapeHtml(g.name)}</label>`).join('');
  return `<div style="margin-bottom:12px;">
    <div id="aujBhForm" oninput="aujBhSimpanDraft()" onchange="aujBhSimpanDraft()" style="border:1px solid #fecaca;background:#fef2f2;border-radius:10px;padding:12px;">
      <h5 style="font-weight:700;font-size:14px;margin-bottom:4px;">🙋 Pengawas Berhalangan</h5>
      <p style="font-size:12px;color:#6b7280;margin-bottom:10px;">Ganti satu guru di semua sesi mengawasnya pada rentang tanggal tertentu. Pengganti dipilih otomatis (beban paling ringan dan jam bebas), atau pilih sendiri. Kelas-kelas satu ruang diganti bersama. Sesi yang pengawas lamanya sudah check-in dilewati. Belum ada yang tersimpan sebelum Anda klik Terapkan.</p>
      <div class="grid-2" style="margin-bottom:10px;">
        <div><label class="label">Guru yang berhalangan *</label><select id="aujBhGuru" class="field"><option value="">-- Pilih guru --</option>${optG}</select></div>
        <div><label class="label">Pengganti (opsional)</label><select id="aujBhPengganti" class="field"><option value="">Otomatis</option>${optP}</select></div>
        <div><label class="label">Dari tanggal *</label><input id="aujBhDari" class="field" type="date" value="${escapeHtml(d.dari || hariIni)}"></div>
        <div><label class="label">Sampai tanggal *</label><input id="aujBhSampai" class="field" type="date" value="${escapeHtml(d.sampai || d.dari || hariIni)}"></div>
      </div>
      <div style="margin-bottom:10px;"><label class="label">Guru siaga (opsional)</label>
        <div style="display:flex;flex-wrap:wrap;gap:4px 14px;max-height:110px;overflow-y:auto;padding:6px 8px;background:#fff;border:1px dashed #fca5a5;border-radius:8px;">${siagaHtml}</div>
        <p style="font-size:12px;color:#6b7280;margin-top:3px;">Bila ada yang dicentang, pengganti otomatis diambil dari guru siaga lebih dulu (yang jamnya bebas dan bebannya paling ringan); kalau tidak ada yang bebas, baru dari guru lain dan ditandai "di luar daftar siaga". Daftar ini diingat di perangkat ini saja.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="aujBhPratinjau()">👁️ Pratinjau</button><button class="btn btn-soft" onclick="aujToggleBh()">✖ Tutup</button></div>
    </div>
    <div id="aujBhPrev" style="margin-top:10px;">${aujBhHasil ? aujHtmlBhPratinjau() : ''}</div>
  </div>`;
}
function aujBhPratinjau() {
  if (!aujCanEdit()) return;
  aujBhDraft = aujBhAmbil(); aujBhHasil = null;
  const pv = aujEl('aujBhPrev'); if (!pv) return;
  const h = aujRencanaGantiPengawas(aujBhDraft);
  if (h.error) { pv.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:8px;padding:8px 12px;font-size:13px;">${escapeHtml(h.error)}</div>`; return; }
  aujBhHasil = h; pv.innerHTML = aujHtmlBhPratinjau();
}
function aujBhGanti(idx, key) {
  const h = aujBhHasil; if (!h || !h.rows[idx]) return;
  const row = h.rows[idx], tampil = () => { aujEl('aujBhPrev').innerHTML = aujHtmlBhPratinjau(); };
  if (!key) { row.baru = null; row.patch = null; row.status = 'tanpa'; row.alasan = 'belum ada pengganti (pengawas lama tetap)'; aujBhHitungBentrok(h); return tampil(); }
  const g = (allGuru || []).find(x => x.key === key); if (!g) return;
  const ada = new Set(); aujGrupRuang(row.rec0).forEach(x => aujPengawasDari(x).forEach(pw => ada.add(pw.k)));
  if (ada.has(g.key)) { toast(g.name + ' sudah mengawas di ruang ini.', true); return tampil(); }
  aujBhPasang(row, g, h.p.guruKey); row.status = 'ok'; row.alasan = ''; row.sumber = '';
  aujBhHitungBentrok(h); tampil();
}
function aujHtmlBhPratinjau() {
  const h = aujBhHasil; if (!h) return '';
  const ok = h.rows.filter(r => r.baru && r.status === 'ok'), lewat = h.rows.filter(r => r.status === 'lewat'), tanpa = h.rows.filter(r => r.status === 'tanpa');
  const td = 'padding:4px 8px;border-top:1px solid #fecaca;vertical-align:top;';
  const pool = aujPoolPengawas();
  const baris = h.rows.map((r, i) => {
    const sel = r.status === 'lewat' ? '<span style="color:#9ca3af;">—</span>' : `<select class="field" style="font-size:12px;padding:2px 4px;min-width:130px;" onchange="aujBhGanti(${i},this.value)"><option value="">— belum dipilih —</option>${pool.filter(g => g.key !== h.p.guruKey).map(g => `<option value="${escapeHtml(g.key)}" ${r.baru && r.baru.key === g.key ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select>`;
    const st = r.status === 'lewat' ? `<span style="color:#9ca3af;">dilewati: ${escapeHtml(r.alasan)}</span>` : (r.status === 'tanpa' ? `<span style="color:#92400e;">${escapeHtml(r.alasan)}</span>` : (r.bentrok.length ? `<span style="color:#b91c1c;">⚠️ ${escapeHtml(r.baru.name)} bentrok dengan ${escapeHtml(r.bentrok.map(x => aujLabelSesi(x.lawan)).join('; '))}</span>` : ('✓' + (r.sumber === 'siaga' ? ' <span style="font-size:11px;color:#065f46;">siaga</span>' : (r.sumber === 'umum' ? ' <span style="font-size:11px;color:#92400e;">di luar daftar siaga</span>' : '')))));
    return `<tr style="${r.status === 'lewat' ? 'color:#9ca3af;' : ''}"><td style="${td}">${i + 1}</td><td style="${td}white-space:nowrap;">${escapeHtml(aujTglPendek(r.tanggal))}</td><td style="${td}white-space:nowrap;">${escapeHtml(r.jamMulai || '')}–${escapeHtml(r.jamSelesai || '')}</td><td style="${td}white-space:nowrap;">${escapeHtml(r.kelas)} · ${escapeHtml(r.ruang || '-')}</td><td style="${td}">${escapeHtml(r.mapel || '-')}</td><td style="${td}">${sel}</td><td style="${td}">${st}</td></tr>`;
  }).join('');
  return `<p style="font-size:13px;margin-bottom:6px;"><strong>${escapeHtml(h.nama)}</strong> mengawas di <strong>${h.rows.length} ruang-sesi</strong>: ${ok.length} akan diganti${lewat.length ? `, ${lewat.length} dilewati` : ''}${tanpa.length ? `, ${tanpa.length} belum ada pengganti` : ''}.</p>
    ${h.nBentrok ? `<p style="font-size:12px;color:#991b1b;background:#fef2f2;border-radius:6px;padding:6px 10px;margin-bottom:6px;">⚠️ ${h.nBentrok} pengganti bentrok dengan sesi lain. Masih bisa diterapkan; ganti pengawasnya di tabel bila perlu.</p>` : ''}
    <div style="overflow-x:auto;background:#fff;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="text-align:left;"><th style="padding:4px 8px;">No</th><th style="padding:4px 8px;">Tanggal</th><th style="padding:4px 8px;">Waktu</th><th style="padding:4px 8px;">Kelas · Ruang</th><th style="padding:4px 8px;">Mapel</th><th style="padding:4px 8px;">Pengganti</th><th style="padding:4px 8px;">Status</th></tr></thead><tbody>${baris}</tbody></table></div>
    <div style="margin-top:10px;"><button class="btn btn-success" id="btnAujBh" onclick="aujBhTerapkan()" ${ok.length ? '' : 'disabled'}>💾 Terapkan ${ok.length} Penggantian</button></div>`;
}
function aujBhTerapkan() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  const h = aujBhHasil; if (!h) return toast('Klik Pratinjau dulu.', true);
  if (isBusy('aujBh')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  toast('⏳ Memeriksa data check-in terbaru…', false, 2500);
  // Check-in / susulan bisa masuk dari perangkat lain sesudah pratinjau dibuat: muat ulang dulu, lalu cek kunci sekali lagi.
  const tugas = [typeof reloadDataset === 'function' ? reloadDataset(['ujian', 'ujianAttendance']) : null, typeof muatUjianSusulan === 'function' ? muatUjianSusulan(true) : null];
  Promise.all(tugas).catch(() => {}).then(() => aujBhSimpanKe(h));
}
function aujBhSimpanKe(h) {
  const terkunciBaru = [];
  const ok = h.rows.filter(r => r.baru && r.status === 'ok').filter(r => { const k = aujBhKunci(r, h.p.guruKey); if (k.length) { r.status = 'lewat'; r.alasan = k.join(', '); terkunciBaru.push(r); return false; } return true; });
  if (terkunciBaru.length) { aujBhHitungBentrok(h); aujEl('aujBhPrev').innerHTML = aujHtmlBhPratinjau(); return toast(`⛔ ${terkunciBaru.length} sesi baru saja punya check-in/susulan dan dilewati. Periksa tabel, lalu klik Terapkan lagi.`, true, 7000); }
  if (!ok.length) return toast('Tidak ada penggantian yang bisa diterapkan.', true);
  if (!confirm(`Ganti ${h.nama} pada ${ok.length} ruang-sesi?` + (h.nBentrok ? `\n\n⚠️ ${h.nBentrok} pengganti bentrok dengan sesi lain.` : '') + '\n\nSesi honor yang sudah ada ikut diperbarui. Sesi yang pengawas lamanya sudah check-in tidak diubah.')) return;
  const updates = {}; ok.forEach(r => Object.keys(r.patch).forEach(k => Object.keys(r.patch[k]).forEach(f => { updates[k + '/' + f] = r.patch[k][f]; })));
  setBusy('aujBh');
  db.ref(AUJ_NODE).update(updates, err => {
    clearBusy('aujBh');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    const catatUbah = {}; let honorBelum = 0, n = 0;
    ok.forEach(r => {
      r.recs.forEach(rec => {
        const pt = r.patch[rec.key]; if (!pt) return;
        const sebelum = {}; Object.keys(pt).forEach(f => { sebelum[f] = rec[f] == null ? null : rec[f]; });   // untuk Urungkan
        catatUbah[rec.key] = { before: sebelum, after: Object.assign({}, pt) }; Object.assign(rec, pt); n++;
      });
      if (aujSesiHonorDari(r.recs[0].key)) aujSinkronHonor(r.recs[0]); else honorBelum++;   // semua kelas satu ruang sudah diperbarui di memori
    });
    toast(`✅ ${h.nama} diganti pada ${ok.length} ruang-sesi.${honorBelum ? ' Sesi honor belum dibuat: pakai 💰 Buat Sesi Honor.' : ''}`, false, 5000);
    addLog('ubah_administrasi_ujian', `pengawas berhalangan ${h.nama}: ${ok.length} ruang-sesi diganti`);
    aujUndoSimpan({ jenis: 'ubah', label: 'Pengawas Berhalangan', ubah: catatUbah });
    aujBhBuka = false; aujBhHasil = null; aujBhDraft = null; aujRenderSemua();
  });
}

// =====================================================
// HAPUS SEMUA SESI (mengikuti filter Asesmen/Kelas pada daftar jadwal)
// =====================================================
// Aman: sesi yang sesi honornya sudah punya check-in/susulan DILEWATI; wajib mengetik HAPUS; cadangan JSON diunduh dulu.
// Sesi honor milik sesi yang dihapus ikut dibersihkan; bila kelas lain satu ruang masih tersisa, sesi honor dipindah (sama seperti hapus satu sesi).
function aujUnduhCadangan(nama, objek) {
  try {
    const blob = new Blob([JSON.stringify(objek, null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
    setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) { /* abaikan */ } }, 1500);
    return true;
  } catch (e) { return false; }
}
function aujHapusSemua() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  if (isBusy('aujHapusSemua')) return toast('Sedang menghapus...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  if (!aujJadwalTersaring().length) return toast('Tidak ada sesi untuk dihapus.', true);
  toast('⏳ Memeriksa data check-in terbaru…', false, 2500);
  // Check-in/susulan bisa masuk dari perangkat lain: muat ulang dulu sebelum memutuskan sesi mana yang aman dihapus.
  const tugas = [typeof reloadDataset === 'function' ? reloadDataset(['ujian', 'ujianAttendance']) : null, typeof muatUjianSusulan === 'function' ? muatUjianSusulan(true) : null];
  Promise.all(tugas).catch(() => {}).then(aujHapusSemuaLanjut);
}
function aujHapusSemuaLanjut() {
  const scope = aujJadwalTersaring(), att = (typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || [], sus = (typeof allUjianSusulan !== 'undefined' && allUjianSusulan) || [];
  if (!scope.length) return toast('Tidak ada sesi untuk dihapus.', true);
  const kunci = new Set();   // sesi honor yang sudah dipakai: seluruh ruang-sesinya dipertahankan
  scope.forEach(r => { const u = aujSesiHonorDari(r.key); if (u && (att.some(c => c.ujianKey === u.key) || sus.some(z => z.ujianKey === u.key))) kunci.add(u.key); });
  const hapus = [], tahan = [];
  scope.forEach(r => { const u = aujSesiHonorDari(r.key); (u && kunci.has(u.key) ? tahan : hapus).push(r); });
  if (!hapus.length) return toast('Semua sesi pada daftar ini sudah punya check-in honor, jadi tidak ada yang dihapus. Hapus dulu check-in-nya di Honor Ujian bila memang perlu.', true, 8000);
  const nHadir = hapus.filter(r => Object.keys(r.hadirPeserta || {}).length || Object.keys(r.pengawasHadir || {}).length).length;
  const lingkup = (!aujJdwNama && !aujJdwKelas) ? 'SEMUA sesi' : 'sesi pada filter' + (aujJdwNama ? ' "' + aujJdwNama + '"' : '') + (aujJdwKelas ? ' · ' + aujJdwKelas : '');
  const ketik = prompt(`⚠️ HAPUS ${hapus.length} sesi (${lingkup}) beserta daftar hadir, denah, dan berita acaranya.` + (nHadir ? `\n\n${nHadir} sesi sudah punya isian Daftar Hadir yang ikut hilang.` : '') + (tahan.length ? `\n\n${tahan.length} sesi DIPERTAHANKAN karena sudah ada check-in/susulan honor pengawas.` : '') + '\n\nCadangan (file JSON) akan diunduh otomatis sebelum menghapus. Tindakan ini tidak bisa diurungkan.\n\nKetik HAPUS (huruf besar) untuk melanjutkan:');
  if (String(ketik || '').trim() !== 'HAPUS') return toast('Dibatalkan, tidak ada yang dihapus.', false, 2500);
  const hapusSet = new Set(hapus.map(r => r.key)), honorHapus = [], honorPindah = [], diproses = new Set();
  hapus.forEach(r => {
    const u = aujSesiHonorDari(r.key); if (!u || diproses.has(u.key) || u.key !== AUJ_HONOR_PREFIX + r.key) return;   // hanya pemilik yang memegang sesi honor ruang
    diproses.add(u.key);
    const saudara = aujGrupRuang(r).filter(x => x.key !== r.key && !hapusSet.has(x.key));
    if (saudara.length) honorPindah.push({ u, saudara }); else honorHapus.push(u);
  });
  const stempel = new Date().toISOString().slice(0, 10), honorCadangan = honorHapus.concat(honorPindah.map(x => x.u));
  const adaCadangan = aujUnduhCadangan(`cadangan-sesi-ujian-${stempel}.json`, { dibuat: new Date().toISOString(), tahunAjaran: currentTahunAjaran, jumlahSesi: hapus.length, sesi: hapus, sesiHonor: honorCadangan });
  if (!adaCadangan && !confirm('Cadangan gagal diunduh di perangkat ini. Tetap hapus tanpa cadangan?')) return;
  const upd = {}; hapus.forEach(r => { upd[r.key] = null; });
  setBusy('aujHapusSemua');
  db.ref(AUJ_NODE).update(upd, err => {   // satu tulisan atomik: semua terhapus atau tidak sama sekali
    clearBusy('aujHapusSemua');
    if (err) return toast('Gagal menghapus: ' + (err.message || err), true, 7000);
    allAdmUjian = allAdmUjian.filter(x => !hapusSet.has(x.key));
    addLog('hapus_semua_administrasi_ujian', `${hapus.length} sesi dihapus${tahan.length ? `, ${tahan.length} dipertahankan` : ''}`);
    toast(`✅ ${hapus.length} sesi dihapus.${tahan.length ? ` ${tahan.length} sesi dipertahankan (sudah ada check-in honor).` : ''}`, false, 6000);
    aujUndoBuang();   // riwayat Urungkan merujuk sesi yang kini sudah tidak ada
    const u2 = {}, baruLokal = [];
    honorHapus.forEach(u => { u2[u.key] = null; });
    honorPindah.forEach(x => {
      const peta = {}; x.saudara.forEach(y => Object.assign(peta, aujKunciPengawasSesi(y).map));
      u2[x.u.key] = null; if (!Object.keys(peta).length) return;
      const kb = AUJ_HONOR_PREFIX + x.saudara[0].key, baru = Object.assign({}, x.u, { jadwalKey: x.saudara[0].key, pengawas: peta, updatedAt: new Date().toISOString() }); delete baru.key;
      baru.nama = aujNamaHonor(x.saudara[0]); u2[kb] = baru; baruLokal.push(Object.assign({ key: kb }, baru));
    });
    aujAktifKey = null; aujPastikanAktif(); aujRenderSemua();
    if (!Object.keys(u2).length) return;
    db.ref('ujian').update(u2, e2 => {
      if (e2) return toast('⚠️ Sesi jadwal sudah terhapus, tetapi sesi honornya gagal dibersihkan: ' + (e2.message || e2) + '. Periksa di Honor Ujian (hapus sesi berawalan "Pengawas" yang tersisa).', true, 9000);
      if (typeof allUjian !== 'undefined') { allUjian = allUjian.filter(x => !(x.key in u2)); baruLokal.forEach(u => allUjian.push(u)); }
      aujRenderSemua();
    });
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
      // check-in tanpa centang manual TIDAK lagi ditandai: Daftar Hadir otomatis mencentang pengawas yang sudah check-in (aujPwHadirEfektif).
      else if (!ck && !centang && lewat && !pending) hasil.push({ tingkat: 'info', teks: `${label}: ${x[1]} tidak tercatat hadir (tidak check-in, tidak dicentang) — tidak mendapat honor.` });
      else if (!ck && pending) hasil.push({ tingkat: 'info', teks: `${label}: ${x[1]} punya pengajuan susulan yang menunggu keputusan.` });
    });
  });
  const auAll = (typeof allUjian !== 'undefined' && allUjian) || [], dilihat = new Set();
  allAdmUjian.forEach(r => {   // satu ruang dengan beberapa sesi honor = pengawas bisa terbayar ganda
    if (dilihat.has(r.key)) return;
    const g = aujGrupRuang(r); g.forEach(x => dilihat.add(x.key));
    if (g.length < 2) return;
    const punya = g.filter(x => auAll.some(u => u.key === AUJ_HONOR_PREFIX + x.key));
    if (punya.length > 1) hasil.push({ tingkat: 'salah', teks: `${aujLabelSesi(r)} · ${aujTglPendek(r.tanggal)}: ruang ini dipakai ${g.length} kelas tetapi punya ${punya.length} sesi honor — pengawas bisa terbayar ganda. Hapus sesi honor yang berlebih di Honor Ujian (honor dibayar sekali per ruang).` });
  });
  const mb = aujMapelBedaSatuRuang(allAdmUjian);
  if (mb.length) hasil.push({ tingkat: 'periksa', teks: `${mb.length} ruang dipakai kelas dengan mapel berbeda pada jam yang sama (aturan: 1 sesi = 1 mapel = 1 ruang), mis. ${mb.slice(0, 2).map(aujTeksMapelBeda).join('; ')}.` });
  const beda = allAdmUjian.filter(r => { const d = aujDurMenit(r); return d != null && d !== AUJ_DURASI_MENIT; });
  if (beda.length) hasil.push({ tingkat: 'periksa', teks: `${beda.length} sesi tidak berdurasi ${AUJ_DURASI_MENIT} menit (ketentuan MI), mis. ${beda.slice(0, 3).map(r => aujLabelSesi(r) + ' · ' + aujTglPendek(r.tanggal) + ' = ' + aujDurMenit(r) + ' menit').join('; ')}.` });
  // Honor dua kegiatan pada jam yang bertumpuk (ujian x ujian, ujian x rapat/lembur) berdasarkan check-in yang benar-benar tercatat.
  const iv = [];
  att.forEach(c => { const u = (allUjian || []).find(z => z.key === c.ujianKey); if (u && c.guruKey) iv.push({ gk: c.guruKey, nama: c.guru, tanggal: u.tanggal, jamMulai: u.jamMulai, jamSelesai: u.jamSelesai, label: 'ujian "' + u.nama + '"' }); });
  ((typeof allEventAttendance !== 'undefined' && allEventAttendance) || []).forEach(c => { const e = ((typeof allEvents !== 'undefined' && allEvents) || []).find(z => z.key === c.eventKey); if (e && c.guruKey) iv.push({ gk: c.guruKey, nama: c.guru, tanggal: e.tanggal, jamMulai: e.jamMulai, jamSelesai: e.jamSelesai, label: 'acara "' + e.nama + '"' }); });
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


// =====================================================
// (A) KEHADIRAN PENGAWAS DARI CHECK-IN HONOR
// =====================================================
// Pengawas yang sudah check-in honor (node ujian_attendance, lewat sesi honor adm_<kunciJadwal>) otomatis dianggap Hadir di
// Daftar Hadir. Tidak ada tulisan tambahan ke Firebase: status "efektif" = centang manual (rec.pengawasHadir) + check-in,
// dihitung saat layar digambar, saat Daftar Hadir dicetak, dan saat Simpan Kehadiran (jadi ikut tersimpan di situ).
function aujEsKepsek() { return !!currentUser && typeof isKepsek === 'function' && isKepsek(); }
function aujCheckinPengawas(rec) {
  const out = {}; if (!rec) return out;
  const u = aujSesiHonorDari(rec.key); if (!u) return out;
  const att = (typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || [];
  [['p1', rec.pengawas1, rec.pengawas1Key], ['p2', rec.pengawas2, rec.pengawas2Key]].forEach(x => {
    if (!x[1]) return;
    const k = x[2] || aujKunciGuru(x[1]); if (!k) return;
    if (att.some(c => c.ujianKey === u.key && c.guruKey === k)) out[x[0]] = true;
  });
  return out;
}
function aujPwHadirEfektif(rec) { return Object.assign({}, rec && rec.pengawasHadir || {}, aujCheckinPengawas(rec)); }
// Tombol "Muat check-in terbaru" di Daftar Hadir: hanya memuat ulang sesi honor + check-in (bukan seluruh data).
function aujMuatCheckin() {
  if (typeof reloadDataset !== 'function') return toast('Pemuat data tidak tersedia.', true);
  if (!isReallyOnline()) return toast('📡 Sedang offline.', true);
  let selesai = false;
  const sesudah = () => {
    if (selesai) return; selesai = true;
    const rec = aujRec(); if (rec) Object.assign(aujHadirPengawas, aujCheckinPengawas(rec));
    aujRenderTab(); toast('✅ Data check-in dimuat ulang.');
  };
  const r = reloadDataset(['ujian', 'ujianAttendance'], sesudah);
  if (r && typeof r.then === 'function') r.then(sesudah, () => toast('Gagal memuat data check-in.', true));
}

// =====================================================
// (B) REKAP BEBAN PENGAWAS PER GURU
// =====================================================
let aujBebanBuka = false, aujGuruBuka = false, aujGuruPilih = '';
function aujDurMenit(r) { const a = aujMenit(r.jamMulai), b = aujMenit(r.jamSelesai); return (a != null && b != null && b > a) ? b - a : null; }
function aujFmtDurasi(m) { if (!m) return '0 jam'; const j = Math.floor(m / 60), s = m % 60; return s ? `${j} jam ${s} mnt` : `${j} jam`; }
// Murni. daftar = sesi yang dihitung, pool = [{key,name}] (guru yang ikut dibagi; yang belum bertugas tampil dengan 0).
function aujRekapBeban(daftar, pool) {
  daftar = aujLipatRuang(daftar);   // kelas satu ruang dihitung satu sesi
  const per = {};
  const ambil = (k, nama) => (per[k] = per[k] || { k, nama, sesi: 0, p1: 0, p2: 0, menit: 0, tanpaJam: 0, tgl: new Set() });
  pool.forEach(g => ambil(g.key, g.name));
  daftar.forEach(r => {
    const id1 = aujIdPengawas(r.pengawas1);
    [['p1', r.pengawas1], ['p2', r.pengawas2]].forEach(x => {
      if (!x[1]) return;
      const k = aujIdPengawas(x[1]); if (!k || (x[0] === 'p2' && k === id1)) return;   // orang yang sama di dua slot dihitung sekali
      const g = aujGuruDari(x[1]), o = ambil(k, g ? g.name : String(x[1]).trim());
      o.sesi++; o[x[0]]++;
      const d = aujDurMenit(r); if (d == null) o.tanpaJam++; else o.menit += d;
      if (r.tanggal) o.tgl.add(r.tanggal);
    });
  });
  const idPool = new Set(pool.map(g => g.key));
  const baris = Object.keys(per).map(k => { const o = per[k]; return { k, nama: o.nama, sesi: o.sesi, p1: o.p1, p2: o.p2, menit: o.menit, tanpaJam: o.tanpaJam, hari: o.tgl.size, dalamPool: idPool.has(k) }; })
    .sort((a, b) => b.sesi - a.sesi || b.menit - a.menit || a.nama.localeCompare(b.nama, 'id'));
  const dalam = baris.filter(b => b.dalamPool);
  const rata = dalam.length ? dalam.reduce((t, b) => t + b.sesi, 0) / dalam.length : 0;
  const maks = dalam.length ? Math.max.apply(null, dalam.map(b => b.sesi)) : 0, min = dalam.length ? Math.min.apply(null, dalam.map(b => b.sesi)) : 0;
  return { baris, rata, maks, min, merata: maks - min <= 1, nSesi: daftar.length, tanpaPengawas: daftar.filter(r => !r.pengawas1 && !r.pengawas2).length, totalPenugasan: baris.reduce((t, b) => t + b.sesi, 0) };
}
function aujKetFilter() { return [aujJdwNama, aujJdwKelas].filter(Boolean).join(' · ') || 'semua asesmen & kelas'; }
function aujHtmlBeban() {
  const rk = aujRekapBeban(aujJadwalTersaring(), aujPoolPengawas());
  const th = 'padding:5px 8px;border-bottom:2px solid #cbd5e1;text-align:left;white-space:nowrap;', td = 'padding:5px 8px;border-top:1px solid #e2e8f0;vertical-align:middle;';
  const baris = rk.baris.map((b, i) => {
    const sel = b.dalamPool ? b.sesi - rk.rata : null, lebar = rk.maks ? Math.round(b.sesi / rk.maks * 100) : 0;
    const warna = !b.dalamPool ? '#6b7280' : (b.sesi === 0 ? '#b91c1c' : (b.sesi - rk.rata >= 1.5 ? '#b45309' : '#0f766e'));
    return `<tr><td style="${td}text-align:center;">${i + 1}</td><td style="${td}">${escapeHtml(b.nama)}${b.dalamPool ? '' : ' <span style="font-size:11px;color:#6b7280;">(di luar daftar guru/wali kelas)</span>'}</td>
      <td style="${td}min-width:110px;"><div style="display:flex;align-items:center;gap:6px;"><span style="font-weight:700;min-width:18px;">${b.sesi}</span><span style="display:block;height:8px;border-radius:4px;background:${warna};width:${lebar}px;max-width:90px;"></span></div></td>
      <td style="${td}text-align:center;">${b.p1} / ${b.p2}</td><td style="${td}text-align:center;">${b.hari}</td>
      <td style="${td}white-space:nowrap;">${escapeHtml(aujFmtDurasi(b.menit))}${b.tanpaJam ? ` <span style="font-size:11px;color:#92400e;" title="Sesi tanpa jam lengkap tidak dihitung jamnya">+${b.tanpaJam} tanpa jam</span>` : ''}</td>
      <td style="${td}text-align:right;color:${warna};white-space:nowrap;">${sel == null ? '—' : (sel > 0 ? '+' : '') + sel.toFixed(1).replace('.', ',')}</td></tr>`;
  }).join('');
  const nilai = rk.merata ? `<span style="color:#065f46;">✅ Merata — selisih terbanyak dan tersedikit ${rk.maks - rk.min} sesi.</span>` : `<span style="color:#b45309;">⚠️ Belum merata — terbanyak ${rk.maks} sesi, tersedikit ${rk.min} sesi. Pakai 🤖 Isi Pengawas Kosong atau ganti pengawas di Data Sesi.</span>`;
  return `<div style="border:1px solid #bae6fd;background:#f0f9ff;border-radius:10px;padding:12px;margin-bottom:12px;">
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <h4 style="font-weight:700;">📊 Rekap Beban Pengawas</h4>
      <div style="display:flex;gap:6px;"><button class="btn btn-primary" style="font-size:12px;padding:4px 10px;" onclick="aujCetakBeban()" ${rk.nSesi ? '' : 'disabled'}>🖨️ Cetak</button><button class="btn btn-soft" style="font-size:12px;padding:4px 10px;" onclick="aujToggleBeban()">✕ Tutup</button></div></div>
    <p style="font-size:12px;color:#475569;margin-bottom:6px;">${rk.nSesi} sesi (${escapeHtml(aujKetFilter())}); rata-rata ${rk.rata.toFixed(1).replace('.', ',')} sesi per guru. ${rk.nSesi ? nilai : ''}${rk.tanpaPengawas ? ` <span style="color:#92400e;">${rk.tanpaPengawas} sesi belum punya pengawas.</span>` : ''}</p>
    ${rk.baris.length ? `<div style="overflow-x:auto;background:#fff;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f1f5f9;"><th style="${th}">No</th><th style="${th}">Guru</th><th style="${th}">Sesi</th><th style="${th}" title="Sebagai Pengawas 1 / Pengawas 2">P1 / P2</th><th style="${th}">Hari</th><th style="${th}">Total Jam</th><th style="${th}text-align:right;" title="Selisih sesi dari rata-rata guru">± rata-rata</th></tr></thead><tbody>${baris}</tbody></table></div>` : '<p style="font-size:13px;color:#6b7280;">Belum ada data guru/pengawas.</p>'}</div>`;
}
function aujToggleBeban() { aujBebanBuka = !aujBebanBuka; aujSegarkanPanelJadwal(); }
function aujSegarkanPanelJadwal() {
  const b = aujEl('aujBebanBox'); if (b) b.innerHTML = (aujCanEdit() || aujEsKepsek()) && aujBebanBuka ? aujHtmlBeban() : '';
  const g = aujEl('aujGuruBox'); if (g) g.innerHTML = aujHanyaGuru() || aujGuruBuka ? aujHtmlPerGuru() : '';
}
function aujCetakBebanHtml(rk) {
  const tempat = aujTempat(), pseudo = { nama: 'Rekap Beban Pengawas', tanggal: tglLokal() };
  const baris = rk.baris.map((b, i) => `<tr><td style="text-align:center;width:30px;">${i + 1}</td><td>${escapeHtml(b.nama)}</td><td style="text-align:center;">${b.sesi}</td><td style="text-align:center;">${b.p1} / ${b.p2}</td><td style="text-align:center;">${b.hari}</td><td style="text-align:center;">${escapeHtml(aujFmtDurasi(b.menit))}${b.tanpaJam ? ' *' : ''}</td><td style="text-align:center;">${b.dalamPool ? ((b.sesi - rk.rata) > 0 ? '+' : '') + (b.sesi - rk.rata).toFixed(1).replace('.', ',') : '-'}</td></tr>`).join('');
  return `<div class="halaman">${aujKopHtml()}
    <h1>Rekap Beban Pengawas ASAS/ASAT</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}<br>${escapeHtml(aujKetFilter())}</div>
    <table class="data"><thead><tr><th>No</th><th>Nama Guru</th><th>Jumlah Sesi</th><th>P1 / P2</th><th>Hari</th><th>Total Jam</th><th>± Rata-rata</th></tr></thead><tbody>${baris}</tbody></table>
    <p style="font-size:10.5pt;margin-top:6px;">Jumlah sesi: ${rk.nSesi}. Rata-rata ${rk.rata.toFixed(1).replace('.', ',')} sesi per guru; terbanyak ${rk.maks}, tersedikit ${rk.min} sesi. P1 / P2 = jumlah tugas sebagai Pengawas 1 / Pengawas 2.${rk.baris.some(b => b.tanpaJam) ? ' * Ada sesi tanpa jam lengkap yang tidak dihitung jamnya.' : ''}</p>
    <div style="text-align:right;margin-top:10px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(tglLokal()))}</div>
    <table class="ttd"><tr><td style="width:67%;"></td>${aujTtdPanitiaHtml()}</tr></table>
  </div>`;
}
function aujCetakBeban() {
  const daftar = aujJadwalTersaring(); if (!daftar.length) return toast('Belum ada jadwal untuk direkap.', true);
  aujCetakHtml(aujCetakBebanHtml(aujRekapBeban(daftar, aujPoolPengawas())), 'Rekap Beban Pengawas' + (aujJdwNama ? ' - ' + aujJdwNama : ''));
}

// =====================================================
// (C) JADWAL MENGAWAS PER GURU
// =====================================================
// Guru melihat sesi mengawasnya sendiri (otomatis terbuka di tab Jadwal Ujian); Admin/Kepala memilih guru atau mencetak
// semua guru sekaligus (satu halaman per guru, untuk ditempel/dibagikan). Mengikuti filter Asesmen/Kelas di tab Jadwal.
function aujHanyaGuru() { return !aujCanEdit() && !aujEsKepsek(); }
function aujGuruSayaId() { return currentUser ? (currentUser.key || aujIdPengawas(currentUser.name)) : ''; }
function aujDaftarGuruBertugas(daftar) {
  const m = {};
  daftar.forEach(r => aujPengawasDari(r).forEach(x => { if (!m[x.k]) { const g = aujGuruDari(x.nama); m[x.k] = g ? g.name : x.nama; } }));
  return Object.keys(m).map(k => ({ k, nama: m[k] })).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}
function aujSesiGuru(daftar, id) { return aujUrutJadwal(aujLipatRuang(daftar).filter(r => aujPengawasDari(r).some(x => x.k === id))); }
function aujRekanDari(r, id) { return aujPengawasDari(r).filter(x => x.k !== id).map(x => { const g = aujGuruDari(x.nama); return g ? g.name : x.nama; }); }
function aujJumlahMenit(sesi) { return sesi.reduce((t, r) => t + (aujDurMenit(r) || 0), 0); }
function aujHtmlPerGuru() {
  const daftar = aujJadwalTersaring(), saya = aujHanyaGuru(), bertugas = aujDaftarGuruBertugas(daftar);
  let id = saya ? aujGuruSayaId() : aujGuruPilih;
  if (!saya && (!id || !bertugas.some(g => g.k === id))) id = bertugas.length ? bertugas[0].k : '';
  const g = bertugas.find(x => x.k === id), nama = saya ? (currentUser.name || 'Saya') : (g ? g.nama : '');
  const sesi = id ? aujSesiGuru(daftar, id) : [];
  const td = 'padding:5px 8px;border-top:1px solid #e2e8f0;vertical-align:top;';
  const baris = sesi.map(r => `<tr><td style="${td}white-space:nowrap;font-weight:600;">${escapeHtml(aujTglPendek(r.tanggal))}</td><td style="${td}white-space:nowrap;">${r.jamMulai && r.jamSelesai ? escapeHtml(r.jamMulai) + '–' + escapeHtml(r.jamSelesai) : '—'}</td><td style="${td}">${escapeHtml(r.mapel || r.nama || '-')}</td><td style="${td}white-space:nowrap;">${escapeHtml(r.kelas || '-')}</td><td style="${td}white-space:nowrap;">${escapeHtml(r.ruang || '-')}</td><td style="${td}">${escapeHtml(aujRekanDari(r, id).join(', ') || '—')}</td></tr>`).join('');
  const pilih = saya ? '' : `<select class="field" style="max-width:260px;" onchange="aujGuruGanti(this.value)">${bertugas.length ? bertugas.map(x => `<option value="${escapeHtml(x.k)}" ${x.k === id ? 'selected' : ''}>${escapeHtml(x.nama)}</option>`).join('') : '<option value="">(belum ada pengawas)</option>'}</select>`;
  return `<div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:12px;">
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h4 style="font-weight:700;">${saya ? '📌 Jadwal Mengawas Saya' : '👤 Jadwal Mengawas per Guru'}</h4>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">${pilih}
        <button class="btn btn-primary" style="font-size:12px;padding:4px 10px;" onclick="aujCetakGuru()" ${sesi.length ? '' : 'disabled'}>🖨️ Cetak</button>
        <button class="btn btn-soft" style="font-size:12px;padding:4px 10px;" onclick="aujBagikanGuru()" ${sesi.length ? '' : 'disabled'} title="Bagikan jadwal ini sebagai teks (WhatsApp dll.) atau salin">📤 Bagikan</button>
        ${saya ? '' : `<button class="btn btn-soft" style="font-size:12px;padding:4px 10px;" onclick="aujCetakGuruSemua()" ${bertugas.length ? '' : 'disabled'} title="Satu halaman per guru, untuk ditempel atau dibagikan">🖨️ Cetak Semua Guru</button><button class="btn btn-soft" style="font-size:12px;padding:4px 10px;" onclick="aujToggleGuru()">✕ Tutup</button>`}</div></div>
    ${sesi.length ? `<p style="font-size:12px;color:#475569;margin-bottom:6px;"><strong>${escapeHtml(nama)}</strong> — ${sesi.length} sesi, ${escapeHtml(aujFmtDurasi(aujJumlahMenit(sesi)))} (${escapeHtml(aujKetFilter())}).</p>
      <div style="overflow-x:auto;background:#fff;border-radius:8px;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f1f5f9;text-align:left;"><th style="padding:5px 8px;">Tanggal</th><th style="padding:5px 8px;">Waktu</th><th style="padding:5px 8px;">Mata Pelajaran</th><th style="padding:5px 8px;">Kelas</th><th style="padding:5px 8px;">Ruang</th><th style="padding:5px 8px;">Rekan Pengawas</th></tr></thead><tbody>${baris}</tbody></table></div>`
      : `<p style="font-size:13px;color:#6b7280;">${saya ? 'Anda belum tercatat sebagai pengawas pada jadwal ini' : 'Belum ada guru yang tercatat sebagai pengawas'} (${escapeHtml(aujKetFilter())}).</p>`}</div>`;
}
function aujToggleGuru() { aujGuruBuka = !aujGuruBuka; aujSegarkanPanelJadwal(); }
function aujGuruGanti(k) { aujGuruPilih = k; aujSegarkanPanelJadwal(); }
function aujCetakGuruHalaman(nama, sesi, id) {
  const tempat = aujTempat(), pseudo = { nama: 'Jadwal Mengawas ' + nama, tanggal: tglLokal() };
  const baris = sesi.map((r, i) => { const p = aujBagianTgl(r.tanggal); return `<tr><td style="text-align:center;width:30px;">${i + 1}</td><td>${p ? escapeHtml(p.hari) + ', ' + p.d + ' ' + escapeHtml(p.bulan) + ' ' + p.y : escapeHtml(r.tanggal || '-')}</td><td style="white-space:nowrap;text-align:center;">${r.jamMulai && r.jamSelesai ? escapeHtml(r.jamMulai) + ' - ' + escapeHtml(r.jamSelesai) : '-'}</td><td>${escapeHtml(r.mapel || r.nama || '-')}</td><td style="text-align:center;">${escapeHtml(r.kelas || '-')}</td><td style="text-align:center;">${escapeHtml(r.ruang || '-')}</td><td>${escapeHtml(aujRekanDari(r, id).join(', ') || '-')}</td></tr>`; }).join('');
  return `<div class="halaman">${aujKopHtml()}
    <h1>Jadwal Mengawas ASAS/ASAT</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    <table class="info"><tr><td style="width:120px;">Nama Pengawas</td><td style="width:10px;">:</td><td><strong>${escapeHtml(nama)}</strong></td></tr><tr><td>Jumlah Tugas</td><td>:</td><td>${sesi.length} sesi (${escapeHtml(aujFmtDurasi(aujJumlahMenit(sesi)))})</td></tr></table>
    <table class="data"><thead><tr><th>No</th><th>Hari / Tanggal</th><th>Waktu (WIB)</th><th>Mata Pelajaran</th><th>Kelas</th><th>Ruang</th><th>Rekan Pengawas</th></tr></thead><tbody>${baris}</tbody></table>
    <div style="text-align:right;margin-top:10px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(tglLokal()))}</div>
    <table class="ttd"><tr><td style="width:67%;"></td>${aujTtdPanitiaHtml()}</tr></table>
  </div>`;
}
function aujIdGuruTercetak() {
  const daftar = aujJadwalTersaring(), saya = aujHanyaGuru(), bertugas = aujDaftarGuruBertugas(daftar);
  let id = saya ? aujGuruSayaId() : aujGuruPilih;
  if (!saya && (!id || !bertugas.some(g => g.k === id))) id = bertugas.length ? bertugas[0].k : '';
  const g = bertugas.find(x => x.k === id);
  return { daftar, id, nama: saya ? (currentUser.name || 'Saya') : (g ? g.nama : '') };
}
function aujCetakGuru() {
  const x = aujIdGuruTercetak(), sesi = x.id ? aujSesiGuru(x.daftar, x.id) : [];
  if (!sesi.length) return toast('Tidak ada sesi mengawas untuk dicetak.', true);
  aujCetakHtml(aujCetakGuruHalaman(x.nama, sesi, x.id), 'Jadwal Mengawas - ' + x.nama);
}
function aujCetakGuruSemua() {
  const daftar = aujJadwalTersaring(), bertugas = aujDaftarGuruBertugas(daftar);
  if (!bertugas.length) return toast('Belum ada guru yang tercatat sebagai pengawas.', true);
  aujCetakHtml(bertugas.map(g => aujCetakGuruHalaman(g.nama, aujSesiGuru(daftar, g.k), g.k)).join(''), 'Jadwal Mengawas per Guru' + (aujJdwNama ? ' - ' + aujJdwNama : ''));
}

// =====================================================
// (D) URUNGKAN PROSES MASSAL TERAKHIR (Jadwal Massal, Salin Jadwal, Isi Pengawas Kosong)
// =====================================================
// Yang diingat hanya SATU proses terakhir, di perangkat ini saja (localStorage), bukan di Firebase -- jadi tidak perlu Rules
// baru. Sesi buatan proses itu dihapus (beserta sesi honornya yang belum dipakai); untuk Isi Pengawas, pengawas dikembalikan
// seperti sebelum proses. Sesi yang sudah punya check-in honor, pengajuan susulan, atau Daftar Hadir yang terisi DILEWATI.
const AUJ_UNDO_KEY = 'simambaAujUndo';
function aujUndoOleh() { return currentUser ? String(currentUser.key || currentUser.name || '') : ''; }
function aujUndoBaca() {
  try {
    const s = localStorage.getItem(AUJ_UNDO_KEY); if (!s) return null;
    const o = JSON.parse(s);
    if (!o || o.ta !== currentTahunAjaran || o.oleh !== aujUndoOleh()) return null;
    return o;
  } catch (e) { return null; }
}
function aujUndoSimpan(o) {
  try { o.ta = currentTahunAjaran; o.ts = Date.now(); o.oleh = aujUndoOleh(); localStorage.setItem(AUJ_UNDO_KEY, JSON.stringify(o)); } catch (e) { /* penyimpanan penuh/diblokir: hanya tombol Urungkan yang tidak tersedia */ }
}
function aujUndoBuang() { try { localStorage.removeItem(AUJ_UNDO_KEY); } catch (e) { /* abaikan */ } }
function aujUndoJumlah(o) { return o ? (o.jenis === 'ubah' ? Object.keys(o.ubah || {}).length : (o.buat || []).length) : 0; }
function aujHtmlTombolUrungkan() {
  const o = aujUndoBaca(); if (!o || !aujUndoJumlah(o)) return '';
  const w = new Date(o.ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `<button class="btn btn-soft" onclick="aujUndoTerakhir()" title="Urungkan proses massal terakhir (${escapeHtml(w)}). Sesi yang sudah punya check-in honor atau Daftar Hadir terisi dilewati.">↩️ Urungkan: ${escapeHtml(o.label || 'proses terakhir')} (${aujUndoJumlah(o)})</button>`;
}
function aujAlasanTerkunci(rec, tanpaHadir) {
  const alasan = [], u = aujSesiHonorDari(rec.key);
  const att = (typeof allUjianAttendance !== 'undefined' && allUjianAttendance) || [];
  const sus = (typeof allUjianSusulan !== 'undefined' && allUjianSusulan) || [];
  if (u && att.some(c => c.ujianKey === u.key)) alasan.push('sudah ada check-in honor');
  if (u && sus.some(z => z.ujianKey === u.key)) alasan.push('ada pengajuan susulan honor');
  if (!tanpaHadir && (Object.keys(rec.hadirPeserta || {}).length || Object.keys(rec.pengawasHadir || {}).length)) alasan.push('Daftar Hadir sudah terisi');
  return alasan;
}
function aujUndoRencana(o) {
  const r = { hapus: [], kembali: [], lewati: [], hilang: 0 }, label = x => aujLabelSesi(x) + ' · ' + aujTglPendek(x.tanggal);
  if (o.jenis === 'ubah') {
    Object.keys(o.ubah || {}).forEach(k => {
      const rec = allAdmUjian.find(x => x.key === k); if (!rec) { r.hilang++; return; }
      const u = o.ubah[k];
      if (!Object.keys(u.after).every(f => (rec[f] == null ? null : rec[f]) === (u.after[f] == null ? null : u.after[f]))) { r.lewati.push({ k, teks: label(rec), alasan: 'pengawasnya sudah diubah lagi sesudah proses itu' }); return; }
      const kunci = aujAlasanTerkunci(rec); if (kunci.length) { r.lewati.push({ k, teks: label(rec), alasan: kunci.join(', ') }); return; }
      r.kembali.push({ rec, before: u.before });
    });
  } else {
    (o.buat || []).forEach(k => {
      const rec = allAdmUjian.find(x => x.key === k); if (!rec) { r.hilang++; return; }
      const kunci = aujAlasanTerkunci(rec); if (kunci.length) { r.lewati.push({ k, teks: label(rec), alasan: kunci.join(', ') }); return; }
      r.hapus.push(rec);
    });
  }
  return r;
}
function aujUndoTerakhir() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  if (isBusy('aujUndo')) return toast('Sedang memproses...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  const o = aujUndoBaca(); if (!o || !aujUndoJumlah(o)) { aujRenderSemua(); return toast('Tidak ada proses yang bisa diurungkan.', true); }
  toast('⏳ Memeriksa data terbaru…', false, 2500);
  // Data dimuat ulang dulu: check-in/Daftar Hadir bisa terisi dari perangkat lain sesudah proses massal tadi.
  const tugas = [aujMuat(), typeof reloadDataset === 'function' ? reloadDataset(['ujian', 'ujianAttendance']) : null, typeof muatUjianSusulan === 'function' ? muatUjianSusulan(true) : null];
  Promise.all(tugas).catch(() => {}).then(() => aujUndoKonfirmasi(o));
}
function aujUndoKonfirmasi(o) {
  const rc = aujUndoRencana(o), n = rc.hapus.length + rc.kembali.length;
  if (!n) {
    if (!rc.lewati.length) { aujUndoBuang(); aujRenderSemua(); return toast('Sesi dari proses itu sudah tidak ada; tidak ada yang perlu diurungkan.'); }
    return toast('Tidak ada sesi yang bisa diurungkan:\n• ' + rc.lewati.slice(0, 5).map(x => x.teks + ' — ' + x.alasan).join('\n• '), true, 8000);
  }
  const aksi = o.jenis === 'ubah' ? `Pengawas ${rc.kembali.length} sesi akan DIKEMBALIKAN seperti sebelum proses.` : `${rc.hapus.length} sesi akan DIHAPUS beserta denah, Berita Acara, dan sesi honornya yang belum dipakai.`;
  const pesan = `Urungkan "${o.label}"?\n\n${aksi}` + (rc.lewati.length ? `\n\n${rc.lewati.length} sesi DILEWATI (tetap ada):\n• ` + rc.lewati.slice(0, 5).map(x => x.teks + ' — ' + x.alasan).join('\n• ') + (rc.lewati.length > 5 ? '\n• …' : '') : '');
  if (!doubleConfirm(pesan)) return;
  const updates = {}, honorUbah = {};
  rc.hapus.forEach(rec => { updates[rec.key] = null; const u = aujSesiHonorDari(rec.key); if (u) honorUbah[u.key] = null; });
  rc.kembali.forEach(x => {
    Object.keys(x.before).forEach(f => { updates[x.rec.key + '/' + f] = x.before[f]; });
    const u = aujSesiHonorDari(x.rec.key); if (!u) return;
    const salinan = Object.assign({}, x.rec, x.before), map = aujKunciPengawasSesi(salinan).map;
    if (Object.keys(map).length) { honorUbah[u.key + '/pengawas'] = map; honorUbah[u.key + '/updatedAt'] = new Date().toISOString(); } else honorUbah[u.key] = null;
  });
  setBusy('aujUndo');
  db.ref(AUJ_NODE).update(updates, err => {
    clearBusy('aujUndo');
    if (err) return toast('Gagal mengurungkan: ' + (err.message || err), true);
    const hapusKey = new Set(rc.hapus.map(r => r.key));
    allAdmUjian = allAdmUjian.filter(x => !hapusKey.has(x.key));
    rc.kembali.forEach(x => Object.assign(x.rec, x.before));
    addLog('hapus_administrasi_ujian', `urungkan ${o.label}: ${n} sesi`);
    if (Object.keys(honorUbah).length) {   // sesi honor menyusul (jadwal sudah aman bila ini gagal; periksa lewat Honor Ujian)
      db.ref('ujian').update(honorUbah, e2 => {
        if (e2) return toast('⚠️ Jadwal diurungkan, tetapi sesi honor belum ikut dibersihkan: ' + (e2.message || e2) + '. Periksa di Honor Ujian.', true, 8000);
        Object.keys(honorUbah).forEach(p => {
          const k = p.split('/')[0];
          if (honorUbah[p] === null && p.indexOf('/') < 0) allUjian = allUjian.filter(u => u.key !== k);
          else { const u = allUjian.find(z => z.key === k); if (u && p.indexOf('/pengawas') > 0) u.pengawas = honorUbah[p]; }
        });
        aujRenderSemua();
      });
    }
    // Yang dilewati tetap tercatat (bisa dicoba lagi setelah check-in/daftar hadirnya dibereskan); kalau tidak ada sisa, catatan dibuang.
    if (rc.lewati.length) {
      const sisa = new Set(rc.lewati.map(x => x.k));
      if (o.jenis === 'ubah') { Object.keys(o.ubah).forEach(k => { if (!sisa.has(k)) delete o.ubah[k]; }); } else o.buat = (o.buat || []).filter(k => sisa.has(k));
      aujUndoSimpan(o);
    } else aujUndoBuang();
    toast(`↩️ ${n} sesi diurungkan.${rc.lewati.length ? ' ' + rc.lewati.length + ' dilewati.' : ''}`, false, 5000);
    aujPastikanAktif(); aujRenderSemua();
  });
}


// =====================================================
// ISIAN PILIHAN (drop down) -- pembantu
// =====================================================
// Pola: <select id="X Sel"> + <input id="X"> tersembunyi. Nilai SELALU dibaca dari input id="X" (aujVal tetap bekerja),
// input hanya tampil bila memilih "Lainnya (ketik sendiri)". Jam & pengawas memakai <select> langsung (nilainya sudah teks).
function aujPilihanHtml(id, label, nilai, opsi, o) {
  o = o || {};
  const dis = o.dis || '', v = nilai == null ? '' : String(nilai), extra = o.input || '';
  if (!opsi.length && !o.selalu) return `<div><label class="label">${label}</label><input id="${id}" class="field" type="text" value="${escapeHtml(v)}" ${dis} ${extra}></div>`;
  const lain = !!v && opsi.indexOf(v) < 0;
  return `<div><label class="label">${label}</label>
    <select id="${id}Sel" class="field" ${dis} onchange="aujPilihanUbah('${id}')"><option value="">-- Pilih --</option>${opsi.map(x => `<option value="${escapeHtml(x)}" ${x === v ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('')}<option value="__lain" ${lain ? 'selected' : ''}>✏️ Lainnya (ketik sendiri)…</option></select>
    <input id="${id}" class="field" type="text" value="${escapeHtml(v)}" ${dis} ${extra} style="margin-top:4px;${lain ? '' : 'display:none;'}"></div>`;
}
function aujPilihanUbah(id) {
  const s = aujEl(id + 'Sel'), i = aujEl(id); if (!s || !i) return;
  if (s.value === '__lain') { i.style.display = ''; i.value = ''; i.focus(); } else { i.style.display = 'none'; i.value = s.value; }
  i.dispatchEvent(new Event('input', { bubbles: true }));
}
// Mengisi nilai lewat kode (mis. ruang otomatis dari kelas) sambil menyamakan pilihan di drop down.
function aujSetPilihan(id, v) {
  const s = aujEl(id + 'Sel'), i = aujEl(id); if (!i) return;
  i.value = v || '';
  if (!s) return;
  const ada = !v || Array.from(s.options).some(o => o.value === v && o.value !== '__lain');
  s.value = ada ? (v || '') : '__lain'; i.style.display = ada ? 'none' : '';
}
// Mengganti daftar pilihan (mis. mapel ikut kelas) tanpa menghilangkan nilai yang sudah dipilih.
function aujOpsiPerbarui(id, opsi) {
  const s = aujEl(id + 'Sel'), i = aujEl(id); if (!s || !i) return;
  const v = i.value, lain = !!v && opsi.indexOf(v) < 0;
  s.innerHTML = '<option value="">-- Pilih --</option>' + opsi.map(x => `<option value="${escapeHtml(x)}" ${x === v ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('') + `<option value="__lain" ${lain ? 'selected' : ''}>✏️ Lainnya (ketik sendiri)…</option>`;
  i.style.display = lain ? '' : 'none';
}
function aujOpsiUnik(bidang) {
  const ada = {}, out = [];
  allAdmUjian.forEach(r => { const v = String(r[bidang] || '').trim(), k = v.toLowerCase(); if (v && !ada[k]) { ada[k] = 1; out.push(v); } });
  return out.sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
}
function aujOpsiRuang() { return aujOpsiUnik('ruang'); }
function aujOpsiNama() {
  const sem = String(typeof currentSemesterAktif !== 'undefined' ? currentSemesterAktif || '' : ''), genap = /genap/i.test(sem) || /^\s*2\s*$/.test(sem);
  const dasar = genap ? ['ASAS Genap', 'ASAT Genap', 'ASAS Ganjil'] : ['ASAS Ganjil', 'ASAS Genap', 'ASAT Genap'];
  const out = dasar.slice();
  aujOpsiUnik('nama').forEach(n => { if (out.indexOf(n) < 0) out.push(n); });
  return out;
}
// Mapel untuk sebuah kelas: dari Jadwal Pelajaran + yang pernah dipakai di sesi kelas itu (tanpa kelas: semua yang pernah dipakai).
function aujOpsiMapel(kelas) {
  const out = [], lihat = {}, tambah = m => { m = String(m || '').trim(); const k = aujNormNama(m); if (m && !lihat[k]) { lihat[k] = 1; out.push(m); } };
  if (kelas) aujMapelDariJadwal([kelas]).forEach(tambah);
  allAdmUjian.forEach(r => { if (!kelas || r.kelas === kelas) tambah(r.mapel); });
  return out.sort((a, b) => a.localeCompare(b, 'id'));
}
// ---- jam
function aujFmtMenit(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function aujSelectJam(id, nilai, dis, extra, kosong) {
  const set = new Set(); for (let m = 7 * 60; m <= 13 * 60; m += 10) set.add(aujFmtMenit(m));
  allAdmUjian.forEach(r => { if (aujMenit(r.jamMulai) != null) set.add(String(r.jamMulai).slice(0, 5)); });
  const v = aujMenit(nilai) != null ? String(nilai).slice(0, 5) : ''; if (v) set.add(v);
  return `<select id="${id}" class="field" ${dis || ''} data-prev="${escapeHtml(v)}" ${extra || ''}><option value="">${kosong || '-- jam --'}</option>${Array.from(set).sort().map(j => `<option value="${j}" ${j === v ? 'selected' : ''}>${j}</option>`).join('')}</select>`;
}
// Jam selesai ikut jam mulai + AUJ_DURASI_MENIT, kecuali sudah diubah manual (beda dari hasil otomatis sebelumnya).
function aujJamUbah(idM, idS, cek) {
  const m = aujEl(idM), s = aujEl(idS); if (!m || !s) return;
  const prev = m.dataset.prev || '', lama = aujMenit(prev) != null ? aujFmtMenit(aujMenit(prev) + AUJ_DURASI_MENIT) : '';
  if (aujMenit(m.value) != null) { if (!s.value || s.value === lama) s.value = aujFmtMenit(aujMenit(m.value) + AUJ_DURASI_MENIT); }
  else if (s.value === lama) s.value = '';
  m.dataset.prev = m.value;
  s.dispatchEvent(new Event('input', { bubbles: true }));
  if (cek && typeof aujCekBentrokForm === 'function') aujCekBentrokForm();
}
// ---- pengawas: hanya nama yang ada di Data Guru
function aujSelectGuru(id, nilai, dis, extra) {
  const v = nilai == null ? '' : String(nilai).trim(), ada = {}, nama = [];
  (typeof allGuru !== 'undefined' && Array.isArray(allGuru) ? allGuru : []).forEach(g => { const n = String(g && g.name || '').trim(); if (n && !ada[n]) { ada[n] = 1; nama.push(n); } });
  nama.sort((a, b) => a.localeCompare(b, 'id'));
  return `<select id="${id}" class="field" ${dis || ''} ${extra || ''}><option value="">— kosong —</option>${v && !ada[v] ? `<option value="${escapeHtml(v)}" selected>${escapeHtml(v)} (tidak ada di Data Guru)</option>` : ''}${nama.map(n => `<option value="${escapeHtml(n)}" ${n === v ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}</select>`;
}
// ---- tanggal libur tambahan (Jadwal Massal): hari ujian yang terpilih di rentang tanggal, belum libur kalender
function aujIsiOpsiLibur() {
  aujRenderBerat();   // tombol mapel berat ikut disegarkan setiap form Jadwal Massal berubah
  const sel = aujEl('aujMsLiburPilih'); if (!sel) return;
  const d = aujMassalAmbil(), out = [];
  if (aujAdaTanggal(d.tglMulai) && aujAdaTanggal(d.tglSelesai) && d.tglMulai <= d.tglSelesai) {
    const aw = aujBagianTgl(d.tglMulai), sudah = new Set(String(d.libur || '').match(/\d{4}-\d{2}-\d{2}/g) || []), kal = d.liburKal ? aujTanggalLiburKalender() : new Set();
    for (let i = 0; i <= AUJ_MASSAL_MAKS_HARI; i++) {
      const dt = new Date(aw.y, aw.mo - 1, aw.d + i, 12), t = aujFmtTgl(dt);
      if (t > d.tglSelesai) break;
      if (d.hari.indexOf(dt.getDay()) >= 0 && !sudah.has(t) && !kal.has(t)) out.push(t);
    }
  }
  sel.innerHTML = '<option value="">＋ Pilih tanggal yang dilewati…</option>' + out.map(t => `<option value="${t}">${escapeHtml(aujTglIndo(t, true))}</option>`).join('');
}
function aujLiburTambah(v) {
  const i = aujEl('aujMsLibur'); if (!v || !i) return;
  const cur = i.value.trim().replace(/[,\s]+$/, ''); i.value = cur ? cur + ', ' + v : v;
  aujMassalSimpanDraft();
}
// ---- Berita Acara
const AUJ_CATATAN_BA = [
  'ASAS/ASAT berjalan tertib dan lancar.',
  'Tidak ada kejadian khusus selama ASAS/ASAT berlangsung.',
  'Ada peserta yang terlambat hadir dan tetap mengikuti ASAS/ASAT sesuai tata tertib.',
  'Ada peserta yang izin keluar ruangan sebentar dan diawasi.',
  'Ada peserta yang sakit saat ASAS/ASAT berlangsung dan ditangani petugas.',
  'Terjadi gangguan listrik/jaringan; waktu ditambah sesuai lamanya gangguan.',
  'Ada naskah/lembar jawaban yang rusak dan diganti dengan yang baru.'
];
function aujBaCatatanPilih(i) {
  const ta = aujEl('aujBaCatatan'), t = AUJ_CATATAN_BA[+i], pilih = aujEl('aujBaPreset');
  if (pilih) pilih.value = '';
  if (!ta || !t) return;
  const cur = ta.value.trim(); if (cur.indexOf(t) >= 0) return;
  ta.value = (cur ? cur + '\n' + t : t).slice(0, 800);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function aujBaWaktuPilih(v) {
  const rec = aujRec(), pilih = aujEl('aujBaWaktuPilih'); if (pilih) pilih.value = '';
  if (!rec || v === '') return;
  const m = aujMenit(rec.jamMulai); if (m == null) return toast('Jam mulai pada jadwal sesi belum diisi.', true);
  const dur = aujDurMenit(rec) || AUJ_DURASI_MENIT, a = aujEl('aujBaMulai'), b = aujEl('aujBaSelesai');
  if (a) a.value = aujFmtMenit(m + (+v || 0)); if (b) b.value = aujFmtMenit(m + (+v || 0) + dur);
  [a, b].forEach(x => { if (x) x.dispatchEvent(new Event('input', { bubbles: true })); });
}


// =====================================================
// SERAGAMKAN DURASI SESI KE 70 MENIT
// =====================================================
function aujSesiBedaDurasi(daftar) { return daftar.filter(r => { const d = aujDurMenit(r); return d != null && d !== AUJ_DURASI_MENIT; }); }
function aujSeragamkanDurasi() {
  if (!aujCanEdit()) return toast('Hanya Admin!', true);
  if (isBusy('aujSeragam')) return toast('Sedang memproses...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  toast('⏳ Memeriksa data terbaru…', false, 2500);
  const tugas = [aujMuat(), typeof reloadDataset === 'function' ? reloadDataset(['ujian', 'ujianAttendance']) : null];
  Promise.all(tugas).catch(() => {}).then(aujSeragamkanKonfirmasi);
}
function aujSeragamkanKonfirmasi() {
  const beda = aujSesiBedaDurasi(aujJadwalTersaring()), ubah = [], lewati = [];
  beda.forEach(r => {
    const kunci = aujAlasanTerkunci(r, true);   // Daftar Hadir tidak menghalangi; check-in honor & susulan menghalangi (jendela check-in sudah berjalan)
    if (kunci.length) lewati.push({ teks: aujLabelSesi(r) + ' · ' + aujTglPendek(r.tanggal), alasan: kunci.join(', ') }); else ubah.push(r);
  });
  if (!ubah.length) return toast(lewati.length ? 'Tidak ada yang bisa diubah:\n• ' + lewati.slice(0, 5).map(x => x.teks + ' — ' + x.alasan).join('\n• ') : 'Semua sesi yang tampil sudah berdurasi ' + AUJ_DURASI_MENIT + ' menit.', !!lewati.length, 7000);
  const contoh = ubah.slice(0, 3).map(r => `${aujLabelSesi(r)} · ${aujTglPendek(r.tanggal)}: ${r.jamMulai}–${r.jamSelesai} → ${r.jamMulai}–${aujFmtMenit(aujMenit(r.jamMulai) + AUJ_DURASI_MENIT)}`).join('\n• ');
  const pesan = `Ubah jam selesai ${ubah.length} sesi menjadi jam mulai + ${AUJ_DURASI_MENIT} menit?\n\n• ${contoh}${ubah.length > 3 ? '\n• …' : ''}\n\nSesi honor yang belum dipakai ikut disesuaikan.` + (lewati.length ? `\n\n${lewati.length} sesi DILEWATI karena ${lewati.slice(0, 2).map(x => x.alasan).join(' / ')}.` : '') + '\n\nCek bentrok pengawas lewat Periksa Honor sesudahnya (sesi yang lebih pendek tidak menambah bentrok).';
  if (!confirm(pesan)) return;
  const now = new Date().toISOString(), updates = {}, honor = {};
  ubah.forEach(r => {
    const akhir = aujFmtMenit(aujMenit(r.jamMulai) + AUJ_DURASI_MENIT);
    updates[r.key + '/jamSelesai'] = akhir; updates[r.key + '/updatedBy'] = currentUser.name; updates[r.key + '/updatedAt'] = now;
    const u = aujSesiHonorDari(r.key), ms = aujMsWIB(r.tanggal, akhir);
    if (u && ms != null) { honor[u.key + '/jamSelesai'] = akhir; honor[u.key + '/selesaiMs'] = ms; honor[u.key + '/updatedAt'] = now; }
  });
  setBusy('aujSeragam');
  db.ref(AUJ_NODE).update(updates, err => {
    clearBusy('aujSeragam');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    ubah.forEach(r => { r.jamSelesai = updates[r.key + '/jamSelesai']; r.updatedBy = currentUser.name; r.updatedAt = now; });
    addLog('ubah_administrasi_ujian', `seragamkan durasi ${AUJ_DURASI_MENIT} menit: ${ubah.length} sesi`);
    const selesai = () => { toast(`⏱️ ${ubah.length} sesi diseragamkan ke ${AUJ_DURASI_MENIT} menit.${lewati.length ? ' ' + lewati.length + ' dilewati.' : ''}`, false, 5000); aujRenderSemua(); };
    if (!Object.keys(honor).length) return selesai();
    db.ref('ujian').update(honor, e2 => {
      if (e2) toast('⚠️ Jadwal diubah, tetapi sesi honor belum ikut disesuaikan: ' + (e2.message || e2) + '. Periksa di Honor Ujian.', true, 8000);
      else Object.keys(honor).forEach(pth => { const [k, f] = pth.split('/'), u = allUjian.find(z => z.key === k); if (u) u[f] = honor[pth]; });
      selesai();
    });
  });
}


// Bagikan jadwal mengawas satu guru sebagai teks (lembar bagikan HP bila ada, kalau tidak disalin ke papan klip).
function aujTeksGuru(nama, sesi, id) {
  const baris = sesi.map((r, i) => {
    const p = aujBagianTgl(r.tanggal), tgl = p ? `${p.hari}, ${p.d} ${p.bulan} ${p.y}` : (r.tanggal || '-'), rekan = aujRekanDari(r, id);
    return `${i + 1}. ${tgl}, ${r.jamMulai && r.jamSelesai ? r.jamMulai + '–' + r.jamSelesai : 'jam belum diisi'}\n   ${[r.mapel || r.nama, r.kelas, r.ruang].filter(Boolean).join(' · ')}${rekan.length ? '\n   Rekan: ' + rekan.join(', ') : ''}`;
  }).join('\n');
  return `*Jadwal Mengawas ${nama}*\nTahun Pelajaran ${currentTahunAjaran || ''}\n\n${baris}\n\nTotal ${sesi.length} sesi (${aujFmtDurasi(aujJumlahMenit(sesi))}).`;
}
function aujBagikanGuru() {
  const x = aujIdGuruTercetak(), sesi = x.id ? aujSesiGuru(x.daftar, x.id) : [];
  if (!sesi.length) return toast('Tidak ada sesi mengawas untuk dibagikan.', true);
  const teks = aujTeksGuru(x.nama, sesi, x.id);
  if (navigator.share) { navigator.share({ text: teks }).catch(() => {}); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(() => toast('📋 Jadwal disalin. Tempel di WhatsApp.'), () => toast('Gagal menyalin jadwal.', true));
  else toast('Peramban ini tidak mendukung salin otomatis.', true);
}


// =====================================================
// MAPEL BERAT: sebar supaya tidak menumpuk di hari yang sama
// =====================================================
// Tingkat kesulitan mapel tidak ada di data aplikasi; Admin menandainya sendiri di form Jadwal Massal. Mapel berat dibagi
// merata ke hari-hari ujian (bagian "hari" = urutan tanggal), diletakkan di slot pertama, mapel ringan mengisi sisanya
// dengan tetap mengikuti urutan daftar. Bila mapel berat lebih banyak dari hari, sebagian hari terpaksa berisi dua mapel berat.
function aujSusunMapel(mapel, berat, S) {
  const N = mapel.length, D = Math.max(1, Math.ceil(N / S)), hari = Array.from({ length: D }, () => []);
  const isB = m => berat.has(aujNormNama(m)), bm = mapel.filter(isB), rm = mapel.filter(m => !isB(m));
  bm.forEach((m, k) => {
    let d = bm.length <= D ? Math.floor((k + 0.5) * D / bm.length) : k % D;
    for (let t = 0; t < D && hari[d].length >= S; t++) d = (d + 1) % D;
    hari[d].push(m);
  });
  const tempat = []; let r = 0;
  hari.forEach((isi, d) => { while (isi.length < S && r < rm.length) isi.push(rm[r++]); isi.forEach((m, j) => tempat.push({ m, d, j })); });
  return { tempat, bertumpuk: hari.filter(isi => isi.filter(isB).length > 1).length, nBerat: bm.length };
}
function aujDaftarMapelForm() {
  const ids = ['aujMsMapel', 'aujMsMapelFase_A', 'aujMsMapelFase_B', 'aujMsMapelFase_C'], ada = {}, out = [];
  ids.forEach(id => aujBarisTeks(aujVal(id)).forEach(m => { const k = aujNormNama(m); if (m && !ada[k]) { ada[k] = 1; out.push(m); } }));
  return out;
}
function aujRenderBerat() {
  const box = aujEl('aujMsBeratBox'); if (!box) return;
  const daftar = aujDaftarMapelForm(), berat = new Set(String(aujVal('aujMsBerat') || '').split('|').map(aujNormNama).filter(Boolean));
  box.innerHTML = daftar.length ? daftar.map((m, i) => { const on = berat.has(aujNormNama(m)); return `<button type="button" class="btn ${on ? '' : 'btn-soft'}" style="font-size:12px;padding:3px 9px;${on ? 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;' : ''}" onclick="aujToggleBerat(${i})">${on ? '⚖️ ' : ''}${escapeHtml(m)}</button>`; }).join('') : '<span style="font-size:12px;color:#6b7280;">Isi daftar mata pelajaran dulu.</span>';
}
function aujToggleBerat(i) {
  const m = aujDaftarMapelForm()[i], h = aujEl('aujMsBerat'); if (!m || !h) return;
  const k = aujNormNama(m), ada = String(h.value || '').split('|').filter(Boolean), sisa = ada.filter(x => aujNormNama(x) !== k);
  if (sisa.length === ada.length) sisa.push(m);
  h.value = sisa.join('|'); aujMassalSimpanDraft();
}


// ============================================================
// PORTAL ORTU: JADWAL UJIAN OTOMATIS
// Setiap kali daftar sesi digambar ulang (sesudah simpan / duplikat / hapus / jadwal massal / urungkan), ringkasan jadwal
// (nama, mapel, tanggal, jam, ruang) per kelas disalin ke node `portal_jadwal_ujian/<kelas>/<key>` yang boleh dibaca orang tua.
// Node `administrasi_ujian` sendiri (daftar peserta, hadir, denah, pengawas) TIDAK pernah dibuka untuk orang tua.
// Hanya Admin yang menulis, hanya bila data tahun ajaran aktif sudah termuat, dan hanya bila isinya benar-benar berubah.
// ============================================================
const AUJ_PORTAL_NODE = 'portal_jadwal_ujian';
let aujPortalTtd = '', aujPortalTimer = null;
function aujPortalPeta() {
  const peta = {};
  (allAdmUjian || []).forEach(r => {
    if (!r || !r.key || !r.kelas || !aujAdaTanggal(r.tanggal)) return;
    const k = String(r.kelas).replace(/[.#$\[\]\/]/g, '_').trim(); if (!k) return;
    (peta[k] = peta[k] || {})[r.key] = { nama: r.nama || null, mapel: r.mapel || null, tanggal: r.tanggal, jamMulai: r.jamMulai || null, jamSelesai: r.jamSelesai || null, ruang: r.ruang || null };
  });
  return peta;
}
function aujSinkronPortal() {
  try {
    if (!db || !aujCanEdit() || aujTahunDimuat !== currentTahunAjaran || !isReallyOnline()) return;
    const peta = aujPortalPeta(), ttd = JSON.stringify(peta);
    if (ttd === aujPortalTtd) return;
    // Pengaman: daftar kosong sebelum pernah ada isi yang tersinkron = kemungkinan gagal muat (error baca / offline), bukan "semua sesi dihapus".
    // Tanpa ini, set(null) akan menghapus seluruh jadwal di Portal Ortu.
    if (!Object.keys(peta).length && aujPortalTtd === '') return;
    db.ref(AUJ_PORTAL_NODE).set(Object.keys(peta).length ? peta : null)
      .then(() => { aujPortalTtd = ttd; })
      .catch(e => console.warn('[SI MAMBA] Jadwal ujian belum tersalin ke Portal Ortu (tidak fatal):', (e && e.message) || e));
  } catch (e) { console.warn('[SI MAMBA] aujSinkronPortal:', e); }
}
(function () {
  const asli = aujRenderSemua;
  aujRenderSemua = function () {
    const r = asli.apply(this, arguments);
    clearTimeout(aujPortalTimer); aujPortalTimer = setTimeout(aujSinkronPortal, 1500);
    return r;
  };
})();

// =====================================================
// SK PANITIA ASAS/ASAT -- Surat Keputusan pembentukan panitia + Lampiran I (susunan panitia) + Lampiran II (pembagian ruang)
// Tab "📜 SK Panitia". Tidak tergantung sesi terpilih. Satu SK per tahun ajaran + semester, disimpan di node
// `administrasi_ujian_sk/{tahun}_{semester}` (butuh Rules, lihat rules-sk-panitia-ujian.txt). Lampiran II diambil otomatis dari sesi
// (ruang, kelas, jumlah peserta, nomor peserta, pengawas). Nama Ketua di SK dipakai juga untuk tanda tangan Jadwal/Rekap Beban/Jadwal Mengawas.
// =====================================================
const AUJ_SK_NODE = 'administrasi_ujian_sk';
let aujSk = null, aujSkMuatKey = '', aujSkGen = 0, aujSkGagal = false;   // aujSk = data TERSIMPAN (null = belum ada)
function aujSkKunci() {
  const s = v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return (s(currentTahunAjaran) || 'x') + '_' + (s(currentSemesterAktif) || 'x');
}
function aujSkMuat(sesudah) {
  const key = aujSkKunci();
  if (aujSkMuatKey === key) { if (sesudah) sesudah(); return; }
  if (!db || !isReallyOnline() || !aujCanOpenMenu()) return;
  const g = ++aujSkGen;
  db.ref(AUJ_SK_NODE + '/' + key).once('value')
    .then(snap => { if (g !== aujSkGen) return; aujSk = snap.val() || null; aujSkGagal = false; })
    .catch(e => { if (g !== aujSkGen) return; aujSk = null; aujSkGagal = true; console.warn('[SI MAMBA] SK Panitia gagal dimuat (cek Rules administrasi_ujian_sk):', e); })
    .then(() => { if (g !== aujSkGen) return; aujSkMuatKey = key; if (sesudah) sesudah(); });
}
const AUJ_SK_PANITIA_DEFAULT = ['Penanggung Jawab | ', 'Ketua | ', 'Sekretaris | ', 'Bendahara | ', 'Seksi Naskah Soal dan Penggandaan | ', 'Seksi Pengawas dan Ruang | ', 'Seksi Keamanan dan Ketertiban | ', 'Seksi Konsumsi dan Perlengkapan | '];
const AUJ_SK_MENIMBANG_DEFAULT = [
  'bahwa untuk kelancaran dan ketertiban pelaksanaan {nama} Tahun Pelajaran {ta} di {madrasah}, perlu dibentuk panitia pelaksana;',
  'bahwa nama-nama yang tercantum dalam lampiran keputusan ini dipandang mampu dan memenuhi syarat untuk diberi tugas sebagai panitia.'
].join('\n');
const AUJ_SK_MENGINGAT_DEFAULT = [
  'Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;',
  'Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 4 Tahun 2022;',
  'Kalender Pendidikan Madrasah Tahun Pelajaran {ta}.'
].join('\n');
function aujSkDefault() {
  const kepala = MADRASAH.kepala_sekolah || '';
  return { nomor: '', tanggalSk: '', nama: aujOpsiNama()[0] || 'ASAS', panitia: AUJ_SK_PANITIA_DEFAULT.map(l => l.indexOf('Penanggung Jawab') === 0 ? 'Penanggung Jawab | ' + kepala : l).join('\n'), menimbang: AUJ_SK_MENIMBANG_DEFAULT, mengingat: AUJ_SK_MENGINGAT_DEFAULT };
}
function aujSkEfektif() { return Object.assign(aujSkDefault(), aujSkMuatKey === aujSkKunci() && aujSk ? aujSk : {}); }
function aujSkIsi(t, sk) {
  return String(t || '').replace(/\{nama\}/g, sk.nama || 'ASAS/ASAT').replace(/\{ta\}/g, currentTahunAjaran || '').replace(/\{madrasah\}/g, MADRASAH.nama || 'madrasah').replace(/\{semester\}/g, currentSemesterAktif || '');
}
function aujSkBarisPanitia(teks) {
  return String(teks || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf('|'); return i < 0 ? { jab: l, nama: '' } : { jab: l.slice(0, i).trim(), nama: l.slice(i + 1).trim() }; });
}
// Nama Ketua dari SK tersimpan (dipakai tanda tangan Jadwal/Rekap Beban/Jadwal Mengawas). Kosong -> pakai nama isian manual di perangkat.
function aujSkNamaKetua() {
  if (!aujSk || aujSkMuatKey !== aujSkKunci()) return '';
  const b = aujSkBarisPanitia(aujSk.panitia).find(x => /^ketua(\s+panitia)?$/i.test(x.jab) && x.nama);
  return b ? b.nama : '';
}
// Lampiran II: satu baris per ruang + kelas, dari sesi (sesi ber-nama sama dengan SK; kalau tidak ada yang cocok, semua sesi tahun ini).
function aujSkRuang(sk) {
  const semua = allAdmUjian.filter(r => r && r.ruang), cocok = semua.filter(r => String(r.nama || '') === String(sk.nama || '')), pakai = cocok.length ? cocok : semua;
  const peta = {}, tgl = [];
  pakai.forEach(r => {
    const k = r.ruang + '|' + (r.kelas || ''), b = peta[k] = peta[k] || { ruang: r.ruang, kelas: r.kelas || '-', n: aujPeserta(r.kelas, r).length, pw: [] };
    [r.pengawas1, r.pengawas2].forEach(n => { if (n && b.pw.indexOf(n) < 0) b.pw.push(n); });
    if (aujAdaTanggal(r.tanggal)) tgl.push(r.tanggal);
  });
  const baris = Object.keys(peta).map(k => peta[k]).sort((a, b) => String(a.ruang).localeCompare(String(b.ruang), 'id', { numeric: true }) || String(a.kelas).localeCompare(String(b.kelas), 'id', { numeric: true }));
  tgl.sort();
  const guru = new Set(); baris.forEach(b => b.pw.forEach(n => guru.add(n)));
  return { baris, mulai: tgl[0] || '', akhir: tgl[tgl.length - 1] || '', nRuang: new Set(baris.map(b => b.ruang)).size, nPeserta: baris.reduce((t, b) => t + b.n, 0), nPengawas: guru.size, semuaSesi: !cocok.length && semua.length > 0 };
}
function aujHtmlSk() {
  const ed = aujCanEdit(), sk = aujSkEfektif(), dis = ed ? '' : 'disabled', ada = aujSkMuatKey === aujSkKunci() && !!aujSk, kunci = aujSkKunci();
  if (aujSkMuatKey !== kunci) aujSkMuat(() => { if (aujTabAktif === 'sk') aujRenderTab(); });
  const rg = aujSkRuang(sk), ta = 'class="field" style="width:100%;font-family:inherit;" ' + dis;
  if (ed) setTimeout(aujSkIntip, 0);   // tampilkan nomor otomatis berikutnya (setelah HTML terpasang)
  return `
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <h4 style="font-weight:700;">📜 SK Panitia ${escapeHtml(sk.nama || 'ASAS/ASAT')} — TA ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' / ' + escapeHtml(currentSemesterAktif) : ''}</h4>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${ed ? '<button class="btn btn-success" onclick="aujSimpanSk()">💾 Simpan SK</button>' : ''}
        <button class="btn btn-primary" onclick="aujCetakSk()" ${ada ? '' : 'disabled'} title="${ada ? 'Mencetak data SK yang sudah tersimpan' : 'Simpan SK dulu'}">🖨️ Cetak SK + Lampiran</button>
      </div>
    </div>
    ${aujSkGagal ? '<p style="font-size:12px;color:#b91c1c;background:#fef2f2;padding:6px 10px;border-radius:6px;margin-bottom:8px;">⚠️ SK Panitia gagal dimuat. Periksa Rules node <strong>administrasi_ujian_sk</strong> (lihat rules-sk-panitia-ujian.txt).</p>' : ''}
    ${!ada && !aujSkGagal ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;padding:6px 10px;border-radius:6px;margin-bottom:8px;">${ed ? 'SK belum disimpan untuk tahun ajaran/semester ini. Isian di bawah masih bawaan — lengkapi nomor, tanggal, dan nama panitia, lalu Simpan.' : 'Admin belum membuat SK Panitia untuk tahun ajaran/semester ini.'}</p>` : ''}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-bottom:8px;">
      <div><label class="label">Nomor SK${ed ? ' (kosongkan = otomatis)' : ''}</label><input id="aujSkNomor" class="field" type="text" maxlength="80" value="${escapeHtml(sk.nomor)}" placeholder="${ed ? 'otomatis saat Simpan SK; boleh diketik manual' : ''}" oninput="aujSkIntip()" ${dis}></div>
      <div><label class="label">Tanggal SK</label><input id="aujSkTgl" class="field" type="date" value="${escapeHtml(sk.tanggalSk)}" onchange="aujSkIntip()" ${dis}></div>
      ${aujPilihanHtml('aujSkNama', 'Nama Asesmen', sk.nama, aujOpsiNama(), { dis })}
      ${ed && window.SIMambaNomor ? `<div><label class="label">Kode Klasifikasi (nomor otomatis)</label><select id="aujSkKlas" class="field" onchange="aujSkKlasUbah()">${window.SIMambaNomor.klasPilihan().map(k => `<option value="${escapeHtml(k.kode)}" ${k.kode === aujSkKlasPilih() ? 'selected' : ''}>${escapeHtml(k.kode)} — ${escapeHtml(k.label)}</option>`).join('')}</select></div>` : ''}
    </div>
    ${ed ? '<p id="aujSkNomorInfo" style="font-size:11px;color:#6b7280;margin:-2px 0 8px;"></p>' : ''}
    <label class="label">Susunan Panitia — satu per baris: <em>Jabatan | Nama</em> (baris "Ketua" dipakai untuk tanda tangan Jadwal/Rekap Beban)</label>
    <textarea id="aujSkPanitia" rows="9" ${ta}>${escapeHtml(sk.panitia)}</textarea>
    <label class="label" style="margin-top:8px;">Menimbang — satu butir per baris (huruf a, b, … otomatis)</label>
    <textarea id="aujSkMenimbang" rows="4" ${ta}>${escapeHtml(sk.menimbang)}</textarea>
    <label class="label" style="margin-top:8px;">Mengingat (dasar hukum) — satu butir per baris. Periksa dan sesuaikan dengan ketentuan yang berlaku bagi madrasah Anda.</label>
    <textarea id="aujSkMengingat" rows="5" ${ta}>${escapeHtml(sk.mengingat)}</textarea>
    <p style="font-size:11px;color:#6b7280;margin:4px 0 12px;">Kata kunci otomatis: {nama} = nama asesmen, {ta} = tahun pelajaran, {madrasah} = nama madrasah, {semester}.</p>
    <h5 style="font-weight:700;font-size:13px;margin:6px 0;">Lampiran II — Pembagian Ruang (otomatis dari sesi${rg.semuaSesi ? '; tidak ada sesi bernama "' + escapeHtml(sk.nama) + '", jadi semua sesi dipakai' : ''})</h5>
    ${rg.baris.length ? `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:4px 6px;border:1px solid #e5e7eb;">Ruang</th><th style="text-align:left;padding:4px 6px;border:1px solid #e5e7eb;">Kelas</th><th style="padding:4px 6px;border:1px solid #e5e7eb;">Peserta</th><th style="text-align:left;padding:4px 6px;border:1px solid #e5e7eb;">Pengawas</th></tr></thead><tbody>${rg.baris.map(b => `<tr><td style="padding:4px 6px;border:1px solid #e5e7eb;">${escapeHtml(b.ruang)}</td><td style="padding:4px 6px;border:1px solid #e5e7eb;">${escapeHtml(b.kelas)}</td><td style="padding:4px 6px;border:1px solid #e5e7eb;text-align:center;">${b.n}</td><td style="padding:4px 6px;border:1px solid #e5e7eb;">${escapeHtml(b.pw.join(', ') || '-')}</td></tr>`).join('')}</tbody></table></div>
      <p style="font-size:12px;color:#6b7280;margin-top:6px;">${rg.nRuang} ruang · ${rg.nPeserta} peserta · ${rg.nPengawas} pengawas.</p>` : '<p style="font-size:12px;color:#6b7280;">Belum ada sesi dengan ruang. Buat sesi di tab Data Sesi / Jadwal Ujian dulu, Lampiran II akan terisi sendiri.</p>'}`;
}
// Nomor SK otomatis: memakai API SIMambaNomor (js/surat-guru.js) -- seri yang SAMA dengan SK Kepala Madrasah lain
// (counter nomor_surat/<tahun>/MI-MU_SK, kode klasifikasi KP.01). intip = hanya melihat; kunci = counter +1 (saat Simpan SK).
let aujSkIntipGen = 0;
// Kode klasifikasi arsip untuk nomor SK otomatis: pilihan dari SIMambaNomor.klasPilihan() (daftar di js/surat-guru.js), diingat per perangkat.
const AUJ_SK_KLAS_KEY = 'aujSkKlas', AUJ_SK_KLAS_BAWAAN = 'UM.01';
function aujSkKlasPilih() { try { const v = localStorage.getItem(AUJ_SK_KLAS_KEY); if (v) return v; } catch (e) {} return AUJ_SK_KLAS_BAWAAN; }
function aujSkKlasDipakai() { const e = aujEl('aujSkKlas'); return e && e.value ? e.value : aujSkKlasPilih(); }
function aujSkKlasUbah() { const e = aujEl('aujSkKlas'); if (e) { try { localStorage.setItem(AUJ_SK_KLAS_KEY, e.value); } catch (x) {} } aujSkIntip(); }
function aujSkTglNomor() { const t = aujVal('aujSkTgl'); return aujAdaTanggal(t) ? t : tglLokal(); }
function aujSkIntip() {
  const info = aujEl('aujSkNomorInfo'); if (!info) return;
  const no = aujEl('aujSkNomor'), g = ++aujSkIntipGen, set = (teks, warna) => { info.textContent = teks; info.style.color = warna || '#6b7280'; };
  if (no && no.value.trim()) return set('Nomor diisi/tersimpan — dipakai apa adanya. Kosongkan kolom lalu Simpan SK untuk meminta nomor otomatis baru (nomor lama terlewat, tidak dipakai lagi).');
  if (!window.SIMambaNomor) return set('Penomoran otomatis belum tersedia (js/surat-guru.js belum termuat). Isi nomor manual.', '#b45309');
  set('Menghitung nomor otomatis…');
  window.SIMambaNomor.intip('sk-tugas', aujSkTglNomor(), aujSkKlasDipakai())
    .then(n => { if (g === aujSkIntipGen) set('🔢 Nomor otomatis berikutnya: ' + n + ' — dikunci saat Simpan SK; bulan/tahun mengikuti Tanggal SK (kosong = hari ini). Seri sama dengan SK Kepala Madrasah lainnya.'); })
    .catch(e => { if (g === aujSkIntipGen) set('Gagal membaca penomoran (' + (e && e.message ? e.message : e) + '). Isi nomor manual, atau cek Rules node nomor_surat.', '#b91c1c'); });
}
function aujSimpanSk() {
  if (!aujCanEdit()) return toast('Hanya Admin yang bisa mengubah SK Panitia.', true);
  if (isBusy('aujSkSimpan')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Menyimpan SK butuh koneksi internet.', true);
  const bataS = (v, n) => String(v || '').slice(0, n);
  const data = { nomor: bataS(aujVal('aujSkNomor'), 80), tanggalSk: aujAdaTanggal(aujVal('aujSkTgl')) ? aujVal('aujSkTgl') : '', nama: bataS(aujVal('aujSkNama'), 80),
    panitia: bataS(aujVal('aujSkPanitia'), 3000), menimbang: bataS(aujVal('aujSkMenimbang'), 2000), mengingat: bataS(aujVal('aujSkMengingat'), 2000),
    tahunAjaran: currentTahunAjaran || '', semester: currentSemesterAktif || '', updatedBy: currentUser.name || '', updatedAt: new Date().toISOString() };
  if (!data.nama) return toast('Isi nama asesmen dulu.', true);
  if (!aujSkBarisPanitia(data.panitia).length) return toast('Isi susunan panitia dulu.', true);
  setBusy('aujSkSimpan');
  const key = aujSkKunci();
  const tulis = () => db.ref(AUJ_SK_NODE + '/' + key).set(data, err => {
    clearBusy('aujSkSimpan');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    aujSk = data; aujSkMuatKey = key; aujSkGagal = false;
    toast('✅ SK Panitia tersimpan!'); addLog('simpan_sk_panitia_ujian', `${data.nama} - ${data.nomor || 'tanpa nomor'}`);
    if (aujTabAktif === 'sk') aujRenderTab();
  });
  if (data.nomor || !window.SIMambaNomor) return tulis();   // nomor diisi manual / sudah tersimpan -> dipakai apa adanya
  window.SIMambaNomor.kunci('sk-tugas', data.tanggalSk || tglLokal(), aujSkKlasDipakai()).then(n => { data.nomor = bataS(n, 80); tulis(); })
    .catch(e => { clearBusy('aujSkSimpan'); toast('❌ Nomor otomatis gagal: ' + (e && e.message ? e.message : e) + '. Isi nomor manual atau cek Rules node nomor_surat.', true); });
}
function aujSkTtdHtml(sk, final) {
  const isi = !final
    ? (aujBolehTtdKepala() ? '<div style="border:1px solid #b91c1c;color:#b91c1c;font-size:8.5pt;padding:3px 5px;line-height:1.25;display:inline-block;max-width:95%;">BELUM FINAL — QR pengesahan Kepala belum dicetak (lengkapi nomor SK, tanggal, dan nama Ketua)</div>' : '')
    : ((window.TTD && TTD.penanda)
      ? TTD.penanda('kepala', { jenis: 'SK Panitia ' + (sk.nama || 'ASAS/ASAT'), ket: [sk.nomor, sk.nama, currentTahunAjaran].filter(Boolean).join(' | ') }, { mm: 17, hanyaPimpinan: true })
      : ((MADRASAH.ttdKepalaBase64 && aujBolehTtdKepala()) ? `<img src="${escapeHtml(MADRASAH.ttdKepalaBase64)}" style="height:58px;max-width:150px;" alt="">` : ''));
  return `<table class="ttd"><tr><td style="width:50%;"></td><td><div>Kepala Madrasah,</div><div class="ruang">${isi}</div>
    <div style="font-weight:700;text-decoration:underline;">${escapeHtml(MADRASAH.kepala_sekolah || '(............................)')}</div>
    ${MADRASAH.nip_kepala_sekolah ? `<div>NIP. ${escapeHtml(MADRASAH.nip_kepala_sekolah)}</div>` : ''}</td></tr></table>`;
}
function aujCetakSkHtml(sk) {
  const mad = MADRASAH.nama || 'Madrasah', tempat = aujTempat(), tgl = sk.tanggalSk ? aujTglIndo(sk.tanggalSk) : '..........................',
    rg = aujSkRuang(sk), pan = aujSkBarisPanitia(sk.panitia), final = !!(sk.nomor && sk.tanggalSk && aujSkBarisPanitia(sk.panitia).some(x => /^ketua(\s+panitia)?$/i.test(x.jab) && x.nama));
  const butir = (t, jenis) => `<ol type="${jenis}" style="margin:0;padding-left:22px;">${aujBarisTeks(aujSkIsi(t, sk)).map(x => `<li style="text-align:justify;line-height:1.4;">${escapeHtml(x)}</li>`).join('')}</ol>`;
  const baris3 = (a, b) => `<tr><td style="width:105px;vertical-align:top;font-weight:700;">${a}</td><td style="width:12px;vertical-align:top;">:</td><td>${b}</td></tr>`;
  const judulSk = `PEMBENTUKAN PANITIA ${escapeHtml(String(sk.nama || 'ASAS/ASAT').toUpperCase())} TAHUN PELAJARAN ${escapeHtml(currentTahunAjaran || '')}`;
  const periode = rg.mulai ? ` yang dilaksanakan pada ${escapeHtml(aujTglIndo(rg.mulai))}${rg.akhir && rg.akhir !== rg.mulai ? ' sampai dengan ' + escapeHtml(aujTglIndo(rg.akhir)) : ''}` : '';
  const kepalaLamp = `<div style="text-align:right;font-size:10.5pt;line-height:1.35;margin-bottom:8px;">Lampiran %L Keputusan Kepala ${escapeHtml(mad)}<br>Nomor : ${escapeHtml(sk.nomor || '..........')}<br>Tanggal : ${escapeHtml(tgl)}</div>`;
  const ttdLamp = aujSkTtdHtml(sk, final);   // lampiran memakai blok yang sama dengan SK (QR Kepala identik di ketiga halaman; penanda sama = satu QR)
  const sk1 = `<div class="halaman">${aujKopHtml()}
    <h1>Keputusan Kepala ${escapeHtml(mad)}</h1>
    <div class="sub">Nomor : ${escapeHtml(sk.nomor || '..........')}<br>tentang<br><strong>${judulSk}</strong><br><br><strong>KEPALA ${escapeHtml(mad.toUpperCase())}</strong></div>
    <table class="info" style="width:100%;">
      ${baris3('Menimbang', butir(sk.menimbang, 'a'))}
      ${baris3('Mengingat', butir(sk.mengingat, '1'))}
    </table>
    <div style="text-align:center;font-weight:700;margin:12px 0 6px;">MEMUTUSKAN</div>
    <table class="info" style="width:100%;">
      ${baris3('Menetapkan', `<strong>KEPUTUSAN KEPALA ${escapeHtml(mad.toUpperCase())} TENTANG ${judulSk}.</strong>`)}
      ${baris3('KESATU', `Membentuk Panitia ${escapeHtml(sk.nama || 'ASAS/ASAT')} Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${periode} dengan susunan sebagaimana tercantum dalam Lampiran I keputusan ini.`)}
      ${baris3('KEDUA', `Panitia bertugas mempersiapkan, melaksanakan, mengawasi, dan melaporkan pelaksanaan ${escapeHtml(sk.nama || 'ASAS/ASAT')}, termasuk pembagian ruang dan pengawas sebagaimana tercantum dalam Lampiran II keputusan ini.`)}
      ${baris3('KETIGA', 'Masa tugas panitia berakhir setelah seluruh pelaksanaan dan pelaporan kegiatan selesai.')}
      ${baris3('KEEMPAT', 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.')}
    </table>
    <div style="margin:14px 0 0 50%;line-height:1.4;">Ditetapkan di : ${escapeHtml(tempat || '..........................')}<br>pada tanggal : ${escapeHtml(tgl)}</div>
    ${aujSkTtdHtml(sk, final)}
  </div>`;
  const dataRuang = rg.baris.map((b, i) => `<tr><td style="text-align:center;width:30px;">${i + 1}</td><td style="text-align:center;">${escapeHtml(b.ruang)}</td><td style="text-align:center;">${escapeHtml(b.kelas)}</td><td style="text-align:center;">${b.n}</td><td style="text-align:center;">${b.n ? '1 – ' + b.n : '-'}</td><td>${b.pw.map(n => escapeHtml(n)).join('<br>') || '-'}</td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">Belum ada data ruang.</td></tr>';
  const l1 = `<div class="halaman">${kepalaLamp.replace('%L', 'I')}
    <h1>Susunan Panitia ${escapeHtml(sk.nama || 'ASAS/ASAT')}</h1><div class="sub">${escapeHtml(mad)} — Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}</div>
    <table class="data"><thead><tr><th>No</th><th>Jabatan</th><th>Nama</th></tr></thead><tbody>${pan.map((p, i) => `<tr><td style="text-align:center;width:30px;">${i + 1}</td><td>${escapeHtml(p.jab)}</td><td>${escapeHtml(p.nama || '(............................)')}</td></tr>`).join('')}</tbody></table>
    ${ttdLamp}</div>`;
  const l2 = `<div class="halaman">${kepalaLamp.replace('%L', 'II')}
    <h1>Pembagian Ruang dan Pengawas ${escapeHtml(sk.nama || 'ASAS/ASAT')}</h1><div class="sub">${escapeHtml(mad)} — Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}</div>
    <table class="data"><thead><tr><th>No</th><th>Ruang</th><th>Kelas</th><th>Jumlah Peserta</th><th>Nomor Peserta</th><th>Pengawas</th></tr></thead><tbody>${dataRuang}</tbody></table>
    <p style="font-size:11pt;margin-top:6px;">Jumlah: ${rg.nRuang} ruang, ${rg.nPeserta} peserta, ${rg.nPengawas} pengawas.</p>
    ${ttdLamp}</div>`;
  return sk1 + l1 + l2;
}
function aujCetakSk() {
  if (aujSkMuatKey !== aujSkKunci() || !aujSk) return toast('Simpan SK Panitia dulu.', true);
  if (aujCanEdit() && ['aujSkNomor', 'aujSkPanitia', 'aujSkMenimbang', 'aujSkMengingat'].some(id => aujEl(id) && aujVal(id) !== String(aujSk[{ aujSkNomor: 'nomor', aujSkPanitia: 'panitia', aujSkMenimbang: 'menimbang', aujSkMengingat: 'mengingat' }[id]] || '').trim())) toast('ℹ️ Ada perubahan SK yang belum disimpan — yang dicetak adalah data tersimpan.', false, 5000);
  aujCetakHtml(aujCetakSkHtml(Object.assign(aujSkDefault(), aujSk)), `SK Panitia ${aujSk.nama || 'ASAS/ASAT'} - TA ${currentTahunAjaran || ''}`);
}
