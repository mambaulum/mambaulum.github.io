/* ============================================================
   SI MAMBA - js/kas.js
   Menu "Kas Madrasah" (halaman #page-kas-umum), dipisah dari js/app.js:
     1. Kas Umum        : Dana BOS, bantuan, donasi + pengeluaran operasional
     2. Kas Infaq       : pemasukan otomatis dari Infaq Mingguan + pengeluaran khusus infaq
     3. Setoran Infaq   : pencatatan setoran infaq per kelas oleh petugas, per rentang
                          tanggal dalam satu semester (node Firebase `setoran_infaq`)

   CARA KERJA / KETERGANTUNGAN
   - Script klasik biasa (bukan ES module), dimuat SEBELUM js/app.js (lihat index.html). Semua
     fungsi di sini hanya MENDEFINISIKAN sesuatu saat dimuat; variabel & fungsi milik app.js
     (daftar lengkap di bawah) baru dipakai saat fungsi dipanggil, yaitu setelah app.js selesai dimuat.
   - Yang MASIH tinggal di app.js hanya "sambungan"-nya: pemanggilan setupKasUmumPage() di
     showPage(), aturan tampil menu (kasCanOpenMenu) di menuRules, dan pemuatan dataset
     kasUmum/infaqSiswa (loadAllData/DATASET_LOADERS). Data setoran dimuat sendiri di sini.
   - PENGATURAN SETORAN (diatur Admin): aturan tenggat setor + PENERIMA setoran (bendahara atau orang lain yang
     ditunjuk, bisa per kelas) disimpan di node Firebase `setoran_pengaturan`
     (satu dokumen, bukan per tahun ajaran). Kartu pengaturannya dibuat lewat JS (setoranRenderTenggat)
     di atas #setoranRingkasArea, jadi index.html tidak perlu diubah. Node ini perlu aturan baca/tulis
     di firebase-security-rules.json (tulis: Admin saja, sama seperti setoran_infaq).
   - Kalau menambah fitur Kas Madrasah, tempatkan di file ini, bukan di app.js.

   DAFTAR KETERGANTUNGAN (dipakai file ini, TIDAK didefinisikan di sini; bentuk pemakaian sesuai
   yang tertulis di bawah). Kalau salah satunya diganti nama / dihapus di app.js, Kas Madrasah ikut rusak.
   - Variabel global : currentUser, currentTahunAjaran ('2026/2027'), currentSemesterAktif ('Ganjil'|'Genap'),
                       allKasUmum, allInfaqSiswa (cache di sini bergantung pada penggantian dengan array
                       BARU, bukan mutasi di tempat), db (Firebase Realtime Database),
                       MADRASAH (nama, nsm, alamat, telp, email, website, bendahara, nip_bendahara,
                       kepala_sekolah, nip_kepala_sekolah), KELAS_LIST.
                       allKasUmum juga DITULIS dari sini (kasResetState: allKasUmum = []), jadi di app.js
                       harus let/var, bukan const.
   - Hak akses       : isAdmin(), isKepsek(), infaqMyKelasList() -> [kelas], infaqPetugasNama(kelas),
                       iuranTerkunci(rec) (aturan 24 jam)
   - Data            : reloadDataset(nama | [nama], callback) dengan nama 'kasUmum' & 'infaqSiswa';
                       _fetchList(ref, filterFn) -> Promise<array|null> dan _byTahun(node)
                       (dipakai setoranMuat untuk node `setoran_infaq`)
   - Tanggal         : tglLokal(date?) -> 'YYYY-MM-DD', bulanLokal(date?) -> 'YYYY-MM',
                       mingguKeTanggal(kodeMinggu) -> { senin: Date, ... }
   - UI & status     : toast(pesan, isError?, ms?), doubleConfirm(pesan), escapeHtml(teks), escapeJs(teks),
                       isBusy(kunci), setBusy(kunci, tombol?), clearBusy(kunci, tombol?),
                       isReallyOnline(), addLog(aksi, detail)
   - Pustaka & PDF   : ensureLib('pdf' | 'xlsx') -> window.jspdf (+ jspdf-autotable) / XLSX (SheetJS),
                       v4LoadLogoForPdf(), v4LoadTtdKepalaForPdf(), v4TambahLogoKeKopPdf(doc, logo, offY)
   - Markup          : elemen berid kas* dan setoran* di #page-kas-umum (index.html).
   DIPAKAI app.js DARI FILE INI: setupKasUmumPage() (showPage), kasCanOpenMenu() (menuRules),
   kasResetState() (logout / ganti pengguna), serta handler onclick di index.html.
============================================================ */

// =====================================================
// BUKU KAS (kas masuk-keluar madrasah) -- DUA BUKU TERPISAH: Kas Umum & Kas Infaq
// =====================================================
// Sebelumnya menu Infaq Mingguan hanya punya rekap PEMASUKAN (iuran_siswa) dan tidak ada
// catatan pengeluaran sama sekali, jadi saldo kas madrasah tidak bisa diketahui. Buku Kas
// melengkapinya, dengan dua buku yang saldonya TIDAK bercampur (dikonfirmasi user: infaq
// punya peruntukan sendiri, mis. kegiatan siswa/sosial):
//  - Kas Umum : Dana BOS, bantuan, donasi, dll. + pengeluaran operasional. Infaq siswa TIDAK
//               ikut di sini.
//  - Kas Infaq: pemasukannya otomatis dari iuran_siswa (infaq mingguan siswa, digabung per
//               HARI pencatatan lunas, tampil "🔄 Otomatis") + pengeluaran khusus infaq yang
//               dicatat manual Admin.
//  - Entri manual kedua buku disimpan di node kas_umum yang sama, dibedakan field `buku`
//    ('umum' | 'infaq'). Catatan tanpa field buku (data lama) dianggap 'umum'.
//  - Admin: kelola penuh (tambah/ubah/hapus, termasuk memindahkan catatan antar buku lewat
//    Edit). Kepsek: lihat + unduh saja (pola sama dengan Infaq).
//  - Saldo AWAL tahun ajaran dicatat sebagai pemasukan berkategori "Saldo Awal" (per buku).
//  - Data per tahun ajaran (field tahunAjaran). Saldo dihitung berjalan dari seluruh entri
//    tahun ajaran aktif PER BUKU; filter bulan hanya menyaring tampilan (saldo awal bulan
//    tetap benar karena ikut menghitung bulan-bulan sebelumnya).
const KAS_KATEGORI = {
  umum: {
    masuk: ['Saldo Awal', 'Bantuan / Dana BOS', 'Bantuan Yayasan', 'Donasi / Sumbangan', 'Lainnya'],
    keluar: ['ATK & Perlengkapan', 'Listrik, Air & Internet', 'Kebersihan & Keamanan', 'Perawatan & Perbaikan', 'Kegiatan & Acara', 'Konsumsi', 'Honor / Transport / Insentif', 'Santunan & Sosial', 'Pembelian Inventaris', 'Lainnya']
  },
  infaq: {
    masuk: ['Saldo Awal', 'Infaq Lain-lain', 'Lainnya'],
    keluar: ['Kegiatan Siswa', 'Santunan & Sosial', 'Hadiah & Perlengkapan Siswa', 'Konsumsi Kegiatan', 'Lainnya']
  }
};
const KAS_NAMA_BUKU = { umum: 'Kas Umum', infaq: 'Kas Infaq' };
const KAS_NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let kasEditingKey = null;
let kasBukuAktif = 'umum';                // buku yang dipakai tabel/PDF/Excel: 'umum' | 'infaq'
let kasTabAktif = 'umum';                 // tab yang sedang dibuka: 'umum' | 'infaq' | 'setoran'
// Jenis bawaan form catat kas = jenis yang terakhir berhasil disimpan di perangkat ini ('keluar' kalau belum
// ada) -- pengeluaran memang paling sering dicatat, dan pencatatan beruntun biasanya sejenis.
const KAS_JENIS_KEY = 'simamba_kas_jenis_terakhir';
function kasJenisBawaan() { try { return localStorage.getItem(KAS_JENIS_KEY) === 'masuk' ? 'masuk' : 'keluar'; } catch (e) { return 'keluar'; } }
function kasSimpanJenisBawaan(jenis) { try { localStorage.setItem(KAS_JENIS_KEY, jenis === 'masuk' ? 'masuk' : 'keluar'); } catch (e) { /* penyimpanan diblokir -> abaikan */ } }
let kasTerakhirSegar = 0;                 // epoch ms penyegaran data kas+infaq terakhir dari Firebase
const KAS_SEGAR_MS = 3 * 60 * 1000;       // jangan unduh ulang kalau penyegaran terakhir < 3 menit lalu
function kasCanView() { return !!currentUser && (isAdmin() || isKepsek()); }
function kasCanEdit() { return !!currentUser && isAdmin(); }
function kasBukuDari(rec) { return rec && rec.buku === 'infaq' ? 'infaq' : 'umum'; }
function kasRp(n) { n = Number(n) || 0; return (n < 0 ? '-Rp ' : 'Rp ') + Math.abs(n).toLocaleString('id-ID'); }
// 'YYYY-MM-DD' -> '5 Sep 2026' (dipecah manual, bukan new Date(str), supaya tidak geser hari karena zona waktu)
function kasTglIndo(tgl) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || '');
  if (!m) return tgl || '-';
  return `${parseInt(m[3], 10)} ${KAS_NAMA_BULAN[parseInt(m[2], 10) - 1].slice(0, 3)} ${m[1]}`;
}
// Tanggal sebuah pembayaran infaq mingguan = HARI dicatat lunas (inputAt); kalau tidak ada, Senin
// minggu itu. Dipakai baris otomatis Kas Infaq DAN perhitungan "terkumpul" di Setoran Infaq,
// supaya kedua angka itu selalu sejalan.
function kasTanggalIuran(it) {
  let tgl = '';
  if (it.inputAt) { const d = new Date(it.inputAt); if (!isNaN(d.getTime())) tgl = tglLokal(d); }
  if (!tgl && it.minggu) { try { tgl = tglLokal(mingguKeTanggal(it.minggu).senin); } catch (e) { /* format minggu tak dikenal -> lewati */ } }
  return tgl;
}
// Nominal satu pembayaran infaq -> bilangan bulat rupiah (dibulatkan ke rupiah terdekat). Menangani:
//  - angka asli (number): 5000 -> 5000, 5000.5 -> 5001
//  - teks berformat ribuan: "5.000", "1,500,000" (parseInt polos membaca "5.000" sebagai 5)
//  - teks berdesimal, format Indonesia maupun Inggris: "5.000,50", "1,500,000.50", "5000.5", "5,5"
//    (pemisah TERAKHIR dianggap desimal bila diikuti 1-2 digit; tepat 3 digit = pemisah ribuan)
//  - awalan "Rp" dan spasi: "Rp 5.000"
// Dipakai baris otomatis Kas Infaq DAN setoranIndeksIuran supaya kedua angka tetap sejalan.
function kasNominalIuran(it) {
  const v = it ? it.nominal : 0;
  if (typeof v === 'number') return isFinite(v) ? Math.round(v) : 0;
  const s = String(v == null ? '' : v).trim().replace(/^Rp\.?\s*/i, '').replace(/\s+/g, '');
  const m = /^(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,2}))?$/.exec(s);
  if (m) return Math.round(Number(m[1].replace(/[.,]/g, '') + '.' + (m[2] || '0'))) || 0;
  return parseInt(s, 10) || 0;   // format tak dikenal: perilaku lama
}
function kasSamaKelas(a, b) { return String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim(); }
function kasUrutkan(arr) {
  return arr.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '')
    || (a.jenis === b.jenis ? 0 : (a.jenis === 'masuk' ? -1 : 1))   // pemasukan dulu di hari yang sama, supaya saldo sesaat tidak tampak minus
    || (a.urut || '').localeCompare(b.urut || ''));
}
// Entri satu BUKU (manual dari kas_umum + khusus buku infaq: baris otomatis Infaq Mingguan), terurut.
// Hasil di-cache per buku: sebelumnya tiap render menyusun ulang semua entri, dan untuk buku infaq
// memutar SELURUH allInfaqSiswa (parse tanggal + pengelompokan per hari; bisa ~ribuan baris di akhir
// tahun ajaran) lalu mengurutkannya lagi. allKasUmum & allInfaqSiswa di app.js hanya diganti lewat
// penugasan array BARU (loader/reloadDataset/cache) -- tidak pernah dimutasi di tempat -- jadi
// perbandingan referensi cukup untuk mendeteksi data berubah. Selalu mengembalikan salinan dangkal.
const _kasSusunCache = {};
function kasSusunEntri(buku) {
  buku = buku || kasBukuAktif;
  const iuranRef = buku === 'infaq' ? allInfaqSiswa : null;
  const c = _kasSusunCache[buku];
  if (c && c.kas === allKasUmum && c.iuran === iuranRef) return c.hasil.slice();
  const hasil = kasUrutkan(kasSusunEntriBaru(buku));
  _kasSusunCache[buku] = { kas: allKasUmum, iuran: iuranRef, hasil };
  return hasil.slice();
}
function kasSusunEntriBaru(buku) {
  const rows = (allKasUmum || []).filter(k => kasBukuDari(k) === buku).map(k => ({
    key: k.key, tanggal: k.tanggal || '', jenis: k.jenis === 'keluar' ? 'keluar' : 'masuk',
    kategori: k.kategori || '-', uraian: k.uraian || '', buktiNo: k.buktiNo || '',
    nominal: parseInt(k.nominal, 10) || 0, otomatis: false, urut: k.inputAt || ''
  }));
  if (buku === 'infaq') {
    const perHari = {};
    (allInfaqSiswa || []).forEach(it => {
      const nom = kasNominalIuran(it);
      if (nom <= 0) return;   // dibebaskan/Rp 0 = tidak ada uang masuk
      const tgl = kasTanggalIuran(it);
      if (!tgl) return;
      if (!perHari[tgl]) perHari[tgl] = { total: 0, jumlah: 0 };
      perHari[tgl].total += nom; perHari[tgl].jumlah += 1;
    });
    Object.keys(perHari).forEach(tgl => rows.push({
      key: 'auto_' + tgl, tanggal: tgl, jenis: 'masuk', kategori: 'Infaq Mingguan',
      uraian: `Infaq mingguan siswa (${perHari[tgl].jumlah} pembayaran)`, buktiNo: '',
      nominal: perHari[tgl].total, otomatis: true, urut: tgl + 'T23:59:59'
    }));
  }
  return rows;
}
// Entri yang tanggalnya tidak valid ('' / bukan YYYY-MM-DD) tidak bisa ditempatkan di bulan mana pun.
// Dulu ikut terurut paling awal lalu diam-diam terhitung di "saldo sebelumnya" SEMUA bulan, padahal tidak
// pernah tampil di bulan mana pun. Sekarang dipisah eksplisit: TIDAK ikut saldo/total, tapi dikembalikan
// terpisah supaya diperingatkan di layar & bisa diperbaiki Admin. (kasSimpan selalu mewajibkan tanggal
// valid, jadi entri seperti ini hanya mungkin dari data lama / suntingan manual di Firebase.)
function kasPisahTanggal(buku) {
  const semua = kasSusunEntri(buku);
  return { valid: semua.filter(e => kasAdaTanggal(e.tanggal)), tanpaTanggal: semua.filter(e => !kasAdaTanggal(e.tanggal)) };
}
function kasPeringatanTanpaTanggal(d) {
  if (!d.tanpaTanggal.length) return '';
  const baris = d.tanpaTanggal.map(e => `<li>${escapeHtml(e.kategori)}: ${escapeHtml(e.uraian || '-')} (${e.jenis === 'masuk' ? 'masuk' : 'keluar'} ${kasRp(e.nominal)})${kasCanEdit() ? ` <button class="btn btn-edit" style="padding:2px 8px;font-size:11px;" onclick="kasEdit('${escapeJs(e.key)}')">✏️ Isi tanggal</button>` : ''}</li>`).join('');
  return `<div style="margin-top:8px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:8px 12px;font-size:12px;color:#92400e;">⚠️ ${d.tanpaTanggal.length} catatan ${escapeHtml(d.namaBuku)} tidak punya tanggal valid, jadi <strong>tidak dihitung</strong> di saldo & total di atas. Lengkapi tanggalnya:<ul style="margin:6px 0 0 16px;">${baris}</ul></div>`;
}
function kasHitungSaldo(entries) {
  let saldo = 0;
  return entries.map(e => { saldo += e.jenis === 'masuk' ? e.nominal : -e.nominal; return Object.assign({}, e, { saldo }); });
}
function kasSaldoTerendah(entries) {
  const h = kasHitungSaldo(entries);
  return h.length ? Math.min.apply(null, h.map(e => e.saldo)) : 0;
}
function kasIsiBulanSelect(entries) {
  const sel = document.getElementById('kasBulan'); if (!sel) return;
  const prev = sel.value;
  const thn = parseInt(String(currentTahunAjaran).split('/')[0], 10) || new Date().getFullYear();
  const set = new Set();
  for (let i = 0; i < 12; i++) set.add(bulanLokal(new Date(thn, 6 + i, 1)));   // Juli s.d. Juni tahun ajaran
  entries.forEach(e => { if (e.tanggal && e.tanggal.length >= 7) set.add(e.tanggal.slice(0, 7)); });
  const keys = Array.from(set).filter(k => /^\d{4}-(0[1-9]|1[0-2])$/.test(k)).sort();   // hanya format YYYY-MM valid (aman untuk atribut value & nama bulan)
  sel.innerHTML = '<option value="ALL">Seluruh Tahun Ajaran</option>' + keys.map(k => {
    const [y, m] = k.split('-');
    return `<option value="${k}">${KAS_NAMA_BULAN[parseInt(m, 10) - 1]} ${y}</option>`;
  }).join('');
  const kini = bulanLokal();
  sel.value = (prev && (prev === 'ALL' || keys.indexOf(prev) >= 0)) ? prev : (keys.indexOf(kini) >= 0 ? kini : 'ALL');
}
// Satu sumber data untuk tampilan layar, PDF & Excel supaya angkanya selalu sama (buku yang sedang dibuka).
function kasDataPeriode() {
  const pisah = kasPisahTanggal(kasBukuAktif);
  const semua = kasHitungSaldo(pisah.valid);
  const sel = document.getElementById('kasBulan');
  const bulan = (sel && sel.value && sel.value !== 'ALL') ? sel.value : 'ALL';
  let tampil = semua, saldoSebelum = 0, label = `Tahun Ajaran ${currentTahunAjaran}`, slug = 'TA_' + String(currentTahunAjaran).replace('/', '-');
  if (bulan !== 'ALL') {
    tampil = semua.filter(e => e.tanggal.slice(0, 7) === bulan);
    const sebelum = semua.filter(e => e.tanggal.slice(0, 7) < bulan);
    saldoSebelum = sebelum.length ? sebelum[sebelum.length - 1].saldo : 0;
    const [y, m] = bulan.split('-');
    label = `${KAS_NAMA_BULAN[parseInt(m, 10) - 1]} ${y}`; slug = bulan;
  }
  const totalMasuk = tampil.filter(e => e.jenis === 'masuk').reduce((s, e) => s + e.nominal, 0);
  const totalKeluar = tampil.filter(e => e.jenis === 'keluar').reduce((s, e) => s + e.nominal, 0);
  return { buku: kasBukuAktif, namaBuku: KAS_NAMA_BUKU[kasBukuAktif], semua, tampil, tanpaTanggal: pisah.tanpaTanggal, bulan, label, slug, saldoSebelum, totalMasuk, totalKeluar, saldoAkhir: saldoSebelum + totalMasuk - totalKeluar };
}
function kasOnJenisChange() {
  const jenis = (document.getElementById('kasJenis') || {}).value === 'masuk' ? 'masuk' : 'keluar';
  const buku = (document.getElementById('kasBukuForm') || {}).value === 'infaq' ? 'infaq' : 'umum';
  const sel = document.getElementById('kasKategori'); if (!sel) return;
  const prev = sel.value;
  const list = KAS_KATEGORI[buku][jenis];
  sel.innerHTML = list.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  if (list.indexOf(prev) >= 0) sel.value = prev;
}
function kasResetForm() {
  kasEditingKey = null;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('kasBukuForm', kasBukuAktif); set('kasJenis', kasJenisBawaan()); kasOnJenisChange();
  set('kasTanggal', tglLokal()); set('kasUraian', ''); set('kasNominal', ''); set('kasBukti', '');
  const btn = document.getElementById('btnSimpanKas'); if (btn) btn.textContent = '💾 Simpan';
  const batal = document.getElementById('btnBatalKas'); if (batal) batal.style.display = 'none';
  const judul = document.getElementById('kasFormTitle'); if (judul) judul.textContent = '➕ Catat Kas';
}
// Menu "Kas Madrasah" bisa dibuka Admin & Kepsek (semua tab) dan petugas infaq kelas (tab Setoran saja).
function kasCanOpenMenu() { return kasCanView() || setoranCanView(); }
function kasRenderTabAktif() {
  if (kasTabAktif === 'setoran') { if (setoranCanView()) setoranRender(); }
  else if (kasCanView()) renderKasUmum();
}
function kasUpdateHeader() {
  const punyaBuku = kasCanView(), punyaSetoran = setoranCanView(), setoran = kasTabAktif === 'setoran';
  const tampil = (id, ok) => { const el = document.getElementById(id); if (el) el.style.display = ok ? '' : 'none'; };
  const tandai = (id, aktif) => { const el = document.getElementById(id); if (el) el.className = 'btn ' + (aktif ? 'btn-primary' : 'btn-soft'); };
  tampil('kasTabUmum', punyaBuku); tampil('kasTabInfaq', punyaBuku); tampil('kasTabSetoran', punyaSetoran);
  tandai('kasTabUmum', kasTabAktif === 'umum'); tandai('kasTabInfaq', kasTabAktif === 'infaq'); tandai('kasTabSetoran', setoran);
  tampil('kasPeriodeWrap', !setoran && punyaBuku); tampil('kasBukuWrap', !setoran && punyaBuku); tampil('kasSetoranWrap', setoran && punyaSetoran);
  const intro = document.getElementById('kasIntroText');
  if (!intro) return;
  if (setoran) { intro.textContent = setoranIntroTeks(); return; }
  const uraianBuku = kasBukuAktif === 'infaq'
    ? 'Kas Infaq: pemasukan otomatis dari Infaq Mingguan siswa; pengeluaran khusus infaq (kegiatan siswa, sosial, dll.) dicatat di sini. Saldonya terpisah dari Kas Umum.'
    : 'Kas Umum: Dana BOS, bantuan, donasi, dan pengeluaran operasional madrasah. Infaq siswa TIDAK termasuk — lihat tab Kas Infaq.';
  intro.textContent = uraianBuku + (kasCanEdit() ? '' : ' (Lihat & unduh saja; pencatatan dilakukan oleh Admin.)');
}
function kasPilihBuku(buku) {
  if (buku === 'setoran') {
    if (!setoranCanView()) return;
    kasTabAktif = 'setoran';
    kasUpdateHeader(); setoranInitForm(); setoranRender();
    return;
  }
  if (buku !== 'umum' && buku !== 'infaq') return;
  if (!kasCanView()) return;
  kasTabAktif = buku; kasBukuAktif = buku;
  if (kasCanEdit()) kasResetForm();   // batalkan edit yang sedang berjalan & arahkan form ke buku yang dibuka
  kasUpdateHeader();
  renderKasUmum();
}
function setupKasUmumPage() {
  const tabel = document.getElementById('kasTableArea');
  if (!kasCanOpenMenu()) { if (tabel) tabel.innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin, Kepala Madrasah & petugas infaq kelas.</p>'; return; }
  if (!kasCanView()) kasTabAktif = 'setoran';   // petugas infaq: hanya tab Setoran
  // Pilihan semester manual (dataset.user='1') hanya berlaku selama halaman ini dibuka; setiap kali menu
  // dibuka lagi (termasuk setelah logout/ganti user atau semester aktif berubah) kembali mengikuti semester
  // aktif. Jangan direset kalau sedang mengubah setoran, supaya semester form tetap sama dengan catatannya.
  { const _semSel = kasEl('setoranSemester'); if (_semSel && !setoranEditingKey) delete _semSel.dataset.user; }
  const formCard = document.getElementById('kasFormCard'); if (formCard) formCard.style.display = kasCanEdit() ? '' : 'none';
  kasUpdateHeader();
  if (kasCanEdit() && !kasEditingKey) kasResetForm();
  setoranInitForm();
  kasRenderTabAktif();
  // Data kas, infaq & setoran bisa berubah dari perangkat lain (Admin/petugas lain) sejak login --
  // segarkan di latar belakang supaya saldo tidak basi. TAPI hanya kalau penyegaran terakhir
  // sudah lewat KAS_SEGAR_MS: data infaq bisa ~1 MB di akhir tahun ajaran, jadi jangan
  // diunduh ulang setiap kali halaman dibuka/ditutup berulang. Waktu dicatat di AWAL supaya
  // buka-tutup cepat tidak memicu unduhan ganda saat unduhan pertama belum selesai.
  if (isReallyOnline() && Date.now() - kasTerakhirSegar > KAS_SEGAR_MS) {
    kasTerakhirSegar = Date.now();
    reloadDataset(kasCanView() ? ['kasUmum', 'infaqSiswa'] : ['infaqSiswa'], () => { kasTerakhirSegar = Date.now(); kasRenderTabAktif(); if (kasTabAktif === 'setoran') setoranOnRentangChange(); });
  }
  if (isReallyOnline() && setoranCanView() && (setoranTahunDimuat !== currentTahunAjaran || Date.now() - setoranTerakhirSegar > KAS_SEGAR_MS)) {
    setoranTerakhirSegar = Date.now();
    setoranMuat(() => { if (kasTabAktif === 'setoran') { setoranRender(); if (!setoranEditingKey) setoranSetRentangDefault(); } });
  }
}
function renderKasUmum() {
  const sumBox = document.getElementById('kasSummaryArea'), tabel = document.getElementById('kasTableArea'), katBox = document.getElementById('kasKategoriArea');
  if (!tabel) return;
  if (!kasCanView()) { tabel.innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin & Kepala Madrasah.</p>'; if (sumBox) sumBox.innerHTML = ''; if (katBox) katBox.innerHTML = ''; return; }
  kasIsiBulanSelect(kasSusunEntri(kasBukuAktif));
  const d = kasDataPeriode();
  const kartu = (judul, nilai, warna, bg) => `<div style="flex:1;min-width:140px;background:${bg};border-radius:12px;padding:10px 12px;"><div style="font-size:11px;color:#6b7280;">${judul}</div><div style="font-size:16px;font-weight:800;color:${warna};margin-top:2px;">${nilai}</div></div>`;
  if (sumBox) sumBox.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px;">
    ${kartu('💰 Total Pemasukan', kasRp(d.totalMasuk), '#059669', '#f0fdf4')}
    ${kartu('💸 Total Pengeluaran', kasRp(d.totalKeluar), '#dc2626', '#fef2f2')}
    ${kartu('🏦 Saldo Akhir ' + escapeHtml(d.namaBuku), kasRp(d.saldoAkhir), d.saldoAkhir < 0 ? '#dc2626' : '#1e40af', '#eff6ff')}
  </div><p style="font-size:11px;color:#6b7280;margin-top:6px;">${escapeHtml(d.namaBuku)} — Periode: <strong>${escapeHtml(d.label)}</strong>${d.bulan !== 'ALL' ? ` — saldo awal bulan ${kasRp(d.saldoSebelum)}` : ''}</p>${kasPeringatanTanpaTanggal(d)}`;
  if (d.tampil.length === 0 && d.saldoSebelum === 0) {
    tabel.innerHTML = `<p style="color:#6b7280;font-size:13px;">Belum ada catatan ${escapeHtml(d.namaBuku)} untuk periode ini.</p>`;
  } else {
    const rows = d.tampil.map(e => {
      const badge = e.otomatis ? ' <span style="font-size:10px;background:#dbeafe;color:#1e40af;border-radius:8px;padding:1px 6px;white-space:nowrap;">🔄 Otomatis</span>' : '';
      const aksi = (kasCanEdit() && !e.otomatis)
        ? `<button class="btn btn-edit" style="padding:2px 8px;font-size:11px;" onclick="kasEdit('${escapeJs(e.key)}')">✏️</button> <button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="kasHapus('${escapeJs(e.key)}')">🗑️</button>`
        : '';
      return `<tr${e.otomatis ? ' style="background:#f8fafc;"' : ''}>
        <td style="white-space:nowrap;">${escapeHtml(kasTglIndo(e.tanggal))}</td>
        <td>${escapeHtml(e.uraian)}${badge}<div style="font-size:11px;color:#6b7280;">${escapeHtml(e.kategori)}${e.buktiNo ? ' • Bukti: ' + escapeHtml(e.buktiNo) : ''}</div></td>
        <td style="text-align:right;color:#059669;white-space:nowrap;">${e.jenis === 'masuk' ? kasRp(e.nominal) : ''}</td>
        <td style="text-align:right;color:#dc2626;white-space:nowrap;">${e.jenis === 'keluar' ? kasRp(e.nominal) : ''}</td>
        <td style="text-align:right;font-weight:600;white-space:nowrap;${e.saldo < 0 ? 'color:#dc2626;' : ''}">${kasRp(e.saldo)}</td>
        <td style="white-space:nowrap;">${aksi}</td>
      </tr>`;
    }).join('');
    const barisAwal = d.bulan !== 'ALL' ? `<tr style="background:#fffbeb;"><td colspan="4" style="font-style:italic;">Saldo sebelumnya (dibawa dari bulan-bulan sebelum ${escapeHtml(d.label)})</td><td style="text-align:right;font-weight:600;">${kasRp(d.saldoSebelum)}</td><td></td></tr>` : '';
    tabel.innerHTML = `<div style="overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Uraian</th><th style="text-align:right;">Masuk</th><th style="text-align:right;">Keluar</th><th style="text-align:right;">Saldo</th><th></th></tr></thead>
      <tbody>${barisAwal}${rows}</tbody>
      <tfoot><tr style="background:#f3f4f6;font-weight:700;"><th colspan="2" style="text-align:right;">TOTAL PERIODE</th><th style="text-align:right;color:#059669;">${kasRp(d.totalMasuk)}</th><th style="text-align:right;color:#dc2626;">${kasRp(d.totalKeluar)}</th><th style="text-align:right;">${kasRp(d.saldoAkhir)}</th><th></th></tr></tfoot></table></div>`;
  }
  if (katBox) {
    const per = {};
    d.tampil.forEach(e => { const k = e.jenis + '|' + e.kategori; per[k] = (per[k] || 0) + e.nominal; });
    const daftar = Object.keys(per).map(k => { const [jenis, ...sisa] = k.split('|'); return { jenis, kategori: sisa.join('|'), total: per[k] }; })
      .sort((a, b) => (a.jenis === b.jenis ? 0 : (a.jenis === 'masuk' ? -1 : 1)) || b.total - a.total);
    katBox.innerHTML = daftar.length === 0 ? '<p style="color:#6b7280;font-size:13px;">Belum ada data.</p>'
      : `<div style="overflow-x:auto;"><table><thead><tr><th>Kategori</th><th>Jenis</th><th style="text-align:right;">Total</th></tr></thead><tbody>${daftar.map(x => `<tr><td>${escapeHtml(x.kategori)}</td><td>${x.jenis === 'masuk' ? '💰 Pemasukan' : '💸 Pengeluaran'}</td><td style="text-align:right;">${kasRp(x.total)}</td></tr>`).join('')}</tbody></table></div>`;
  }
}
function kasEdit(key) {
  if (!kasCanEdit()) return toast('Hanya Admin!', true);
  const k = allKasUmum.find(x => x.key === key);
  if (!k) return toast('Catatan tidak ditemukan — muat ulang halaman.', true);
  kasEditingKey = key;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('kasBukuForm', kasBukuDari(k)); set('kasJenis', k.jenis === 'keluar' ? 'keluar' : 'masuk'); kasOnJenisChange();
  // Kategori lama yang sudah tidak ada di daftar tetap ditampilkan supaya tidak berganti diam-diam.
  const selKat = document.getElementById('kasKategori');
  if (selKat && k.kategori && Array.from(selKat.options).every(o => o.value !== k.kategori)) selKat.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(k.kategori)}">${escapeHtml(k.kategori)}</option>`);
  set('kasKategori', k.kategori || ''); /* tanpa tanggal valid: kosongkan, Admin wajib mengisi (jangan diganti hari ini diam-diam) */ set('kasTanggal', kasAdaTanggal(k.tanggal) ? k.tanggal : ''); set('kasUraian', k.uraian || '');
  set('kasNominal', k.nominal != null ? k.nominal : ''); set('kasBukti', k.buktiNo || '');
  const btn = document.getElementById('btnSimpanKas'); if (btn) btn.textContent = '💾 Simpan Perubahan';
  const batal = document.getElementById('btnBatalKas'); if (batal) batal.style.display = '';
  const judul = document.getElementById('kasFormTitle'); if (judul) judul.textContent = '✏️ Ubah Catatan Kas';
  const card = document.getElementById('kasFormCard'); if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function kasSimpan() {
  if (!kasCanEdit()) return toast('Hanya Admin yang bisa mencatat kas!', true);
  if (isBusy('kasSimpan')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Pencatatan kas butuh koneksi internet supaya saldo tidak keliru — coba lagi setelah online.', true);
  const buku = document.getElementById('kasBukuForm').value === 'infaq' ? 'infaq' : 'umum';
  const jenis = document.getElementById('kasJenis').value === 'masuk' ? 'masuk' : 'keluar';
  const tanggal = document.getElementById('kasTanggal').value;
  const kategori = document.getElementById('kasKategori').value;
  const uraian = document.getElementById('kasUraian').value.trim();
  const nominal = Number(document.getElementById('kasNominal').value);
  const buktiNo = document.getElementById('kasBukti').value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return toast('Isi tanggal dengan benar!', true);
  if (tanggal > tglLokal()) return toast('Tanggal tidak boleh di masa depan — kas dicatat setelah uangnya benar-benar masuk/keluar.', true);
  if (!kategori) return toast('Pilih kategori!', true);
  if (uraian.length < 3) return toast('Uraian wajib diisi (minimal 3 karakter)!', true);
  if (!Number.isInteger(nominal) || nominal <= 0) return toast('Nominal harus bilangan bulat lebih dari 0!', true);
  if (nominal > 1000000000) return toast('Nominal terlalu besar (> Rp 1 miliar) — periksa lagi jumlah nolnya.', true);
  const lama = kasEditingKey ? allKasUmum.find(x => x.key === kasEditingKey) : null;
  if (kasEditingKey && !lama) return toast('Catatan yang diubah sudah tidak ada — muat ulang halaman.', true);
  // Memindah catatan ke buku lain mengubah saldo DUA buku sekaligus -- minta konfirmasi supaya tidak
  // terjadi karena salah pilih di dropdown "Buku" saat mengubah catatan.
  if (lama && kasBukuDari(lama) !== buku && !confirm(`Pindahkan catatan ini dari ${KAS_NAMA_BUKU[kasBukuDari(lama)]} ke ${KAS_NAMA_BUKU[buku]}?\n\n${kasTglIndo(tanggal)} • ${kategori}\n${uraian}\n${jenis === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}: ${kasRp(nominal)}\n\nSaldo kedua buku akan dihitung ulang.`)) return;
  if (jenis === 'masuk' && kategori === 'Saldo Awal' && allKasUmum.some(x => x.key !== kasEditingKey && x.kategori === 'Saldo Awal' && kasBukuDari(x) === buku)) {
    if (!confirm(`${KAS_NAMA_BUKU[buku]} tahun ajaran ini sudah punya catatan "Saldo Awal". Tetap tambahkan satu lagi?\n\n(Kalau maksudnya mengoreksi, batalkan lalu ubah catatan yang lama.)`)) return;
  }
  // Peringatan (bukan blokir) kalau catatan ini membuat saldo sebuah buku jadi minus -- biasanya
  // tandanya saldo awal / pemasukan lain belum dicatat. Kalau catatan DIPINDAH antar buku, buku
  // asal juga dicek (saldonya berkurang karena catatan itu keluar dari sana).
  const entriTujuan = kasPisahTanggal(buku).valid;
  const daftarBaru = entriTujuan.filter(e => e.key !== kasEditingKey);
  daftarBaru.push({ key: kasEditingKey || '__baru__', tanggal, jenis, kategori, uraian, buktiNo, nominal, otomatis: false, urut: new Date().toISOString() });
  let minus = null;
  const sesudahMin = kasSaldoTerendah(kasUrutkan(daftarBaru));
  if (sesudahMin < 0 && kasSaldoTerendah(entriTujuan) >= 0) minus = { buku, nilai: sesudahMin };
  if (!minus && lama && kasBukuDari(lama) !== buku) {
    const bukuAsal = kasBukuDari(lama), entriAsal = kasPisahTanggal(bukuAsal).valid;
    const minAsal = kasSaldoTerendah(entriAsal.filter(e => e.key !== kasEditingKey));
    if (minAsal < 0 && kasSaldoTerendah(entriAsal) >= 0) minus = { buku: bukuAsal, nilai: minAsal };
  }
  if (minus && !confirm(`Dengan perubahan ini saldo ${KAS_NAMA_BUKU[minus.buku]} akan menjadi MINUS (${kasRp(minus.nilai)}).\n\nBiasanya ini tanda saldo awal atau pemasukan lain belum dicatat. Tetap simpan?`)) return;
  const btn = document.getElementById('btnSimpanKas');
  setBusy('kasSimpan', btn);
  const selesai = (err, pesanOk, aksiLog) => {
    clearBusy('kasSimpan', btn);
    if (err) return toast('Gagal: ' + (err.message || err), true);
    toast(pesanOk + (buku !== kasBukuAktif ? ` (tercatat di ${KAS_NAMA_BUKU[buku]})` : '')); addLog(aksiLog, `${KAS_NAMA_BUKU[buku]} - ${jenis} - ${kategori} - ${kasRp(nominal)} - ${uraian}`);
    kasSimpanJenisBawaan(jenis);
    kasResetForm();
    reloadDataset('kasUmum', () => renderKasUmum());
  };
  if (lama) {
    db.ref('kas_umum/' + kasEditingKey).update({ buku, tanggal, jenis, kategori, uraian, buktiNo: buktiNo || null, nominal, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => selesai(err, '✅ Catatan kas diperbarui!', 'ubah_kas'));
  } else {
    db.ref('kas_umum').push().set({ buku, tanggal, jenis, kategori, uraian, buktiNo: buktiNo || null, nominal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: new Date().toISOString() }, err => selesai(err, '✅ Catatan kas tersimpan!', 'catat_kas'));
  }
}
function kasHapus(key) {
  if (!kasCanEdit()) return toast('Hanya Admin!', true);
  if (isBusy('kasHapus')) return;
  const k = allKasUmum.find(x => x.key === key);
  if (!k) return toast('Catatan tidak ditemukan — muat ulang halaman.', true);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  if (!doubleConfirm(`Hapus catatan ${KAS_NAMA_BUKU[kasBukuDari(k)]} ini?\n\n${kasTglIndo(k.tanggal)} • ${k.kategori}\n${k.uraian}\n${k.jenis === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}: ${kasRp(k.nominal)}\n\nSaldo akan dihitung ulang.`)) return;
  setBusy('kasHapus');
  db.ref('kas_umum/' + key).remove(err => {
    clearBusy('kasHapus');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    toast('✅ Catatan kas dihapus.'); addLog('hapus_kas', `${KAS_NAMA_BUKU[kasBukuDari(k)]} - ${k.jenis} - ${k.kategori} - ${kasRp(k.nominal)} - ${k.uraian}`);
    if (kasEditingKey === key) kasResetForm();
    reloadDataset('kasUmum', () => renderKasUmum());
  });
}
async function kasExportPDF() {
  if (!kasCanView()) return toast('Tidak diizinkan!', true);
  const d = kasDataPeriode();
  if (d.tampil.length === 0 && d.saldoSebelum === 0) return toast(`Belum ada data ${d.namaBuku} untuk periode ini.`, true);
  try { await ensureLib('pdf'); } catch (e) { console.error('[SI MAMBA] Gagal memuat modul PDF', e); return toast('❌ Modul PDF belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
  const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth();
  if (typeof doc.autoTable !== 'function') { console.error('[SI MAMBA] jspdf-autotable tidak tersedia setelah ensureLib("pdf")'); return toast('❌ Modul tabel PDF (autotable) belum termuat. Muat ulang halaman lalu coba lagi.', true); }
  const logoData = await v4LoadLogoForPdf();
  // Kop (label teks biasa, tanpa emoji -- font bawaan jsPDF tidak punya glyph emoji)
  const offY = MADRASAH.nsm ? 5 : 0;
  v4TambahLogoKeKopPdf(doc, logoData, offY);
  doc.setFontSize(16); doc.text(MADRASAH.nama || '', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  if (MADRASAH.nsm) { doc.setFont(undefined, 'bold'); doc.text(`NSM: ${MADRASAH.nsm}`, pageWidth / 2, 25, { align: 'center' }); doc.setFont(undefined, 'normal'); }
  doc.text(MADRASAH.alamat || '', pageWidth / 2, 27 + offY, { align: 'center' });
  const kontak = [MADRASAH.telp ? 'Telp. ' + MADRASAH.telp : '', MADRASAH.email || '', MADRASAH.website || ''].filter(Boolean).join(' | ');
  if (kontak) doc.text(kontak, pageWidth / 2, 33 + offY, { align: 'center' });
  doc.setDrawColor(0); doc.setLineWidth(0.5);
  doc.line(15, 38 + offY, pageWidth - 15, 38 + offY); doc.line(15, 40 + offY, pageWidth - 15, 40 + offY);
  let y = 49 + offY;
  doc.setFontSize(14); doc.text('BUKU ' + d.namaBuku.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  doc.setFontSize(11); doc.text(`Periode: ${d.label}`, pageWidth / 2, y + 6, { align: 'center' });
  const body = [];
  if (d.bulan !== 'ALL') body.push(['', '', 'Saldo sebelumnya', '', '', kasRp(d.saldoSebelum)]);
  d.tampil.forEach((e, i) => body.push([
    String(i + 1), kasTglIndo(e.tanggal),
    `${e.kategori}: ${e.uraian}${e.buktiNo ? ' [Bukti: ' + e.buktiNo + ']' : ''}${e.otomatis ? ' (otomatis)' : ''}`,
    e.jenis === 'masuk' ? kasRp(e.nominal) : '', e.jenis === 'keluar' ? kasRp(e.nominal) : '', kasRp(e.saldo)
  ]));
  doc.autoTable({
    startY: y + 11, head: [['No', 'Tanggal', 'Uraian', 'Masuk', 'Keluar', 'Saldo']], body,
    foot: [['', '', 'TOTAL PERIODE', kasRp(d.totalMasuk), kasRp(d.totalKeluar), kasRp(d.saldoAkhir)]],
    theme: 'grid', showFoot: 'lastPage', styles: { fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 24 }, 3: { halign: 'right', cellWidth: 27 }, 4: { halign: 'right', cellWidth: 27 }, 5: { halign: 'right', cellWidth: 28 } },
    margin: { left: 15, right: 15 }
  });
  let ySign = doc.lastAutoTable.finalY + 10;
  if (ySign > 225) { doc.addPage(); ySign = 20; }
  doc.setFontSize(10);
  doc.text(`Saldo awal periode : ${kasRp(d.saldoSebelum)}`, 15, ySign);
  doc.text(`Total pemasukan    : ${kasRp(d.totalMasuk)}`, 15, ySign + 5);
  doc.text(`Total pengeluaran  : ${kasRp(d.totalKeluar)}`, 15, ySign + 10);
  doc.setFont(undefined, 'bold'); doc.text(`Saldo akhir             : ${kasRp(d.saldoAkhir)}`, 15, ySign + 15); doc.setFont(undefined, 'normal');
  if (d.tanpaTanggal.length) { doc.setFontSize(8); doc.text(`Catatan: ${d.tanpaTanggal.length} catatan tanpa tanggal valid tidak ikut dihitung.`, 15, ySign + 20); }
  ySign += 26;
  if (ySign > 235) { doc.addPage(); ySign = 20; }
  const xKiri = 50, xKanan = pageWidth - 50;
  doc.setFontSize(10);
  doc.text('Dibuat oleh,', xKiri, ySign, { align: 'center' }); doc.text('Bendahara Madrasah', xKiri, ySign + 5, { align: 'center' });
  doc.text('Mengetahui,', xKanan, ySign, { align: 'center' }); doc.text('Kepala Madrasah', xKanan, ySign + 5, { align: 'center' });
  // Tanda tangan QR / gambar (js/ttd-digital.js)
  const metaBuku = { jenis: `Buku ${d.namaBuku}`, ket: d.label };
  if (MADRASAH.bendahara) await TTD.tandai(doc, 'bendahara', xKiri, ySign + 7, { lebar: 32, tinggiMaks: 20, meta: Object.assign({ nama: MADRASAH.bendahara, jabatan: 'Bendahara Madrasah', nip: MADRASAH.nip_bendahara || '' }, metaBuku) });
  await TTD.tandai(doc, 'kepala', xKanan, ySign + 7, { lebar: 32, tinggiMaks: 20, hanyaPimpinan: true, meta: Object.assign({ nama: MADRASAH.kepala_sekolah || '', jabatan: 'Kepala Madrasah', nip: MADRASAH.nip_kepala_sekolah || '' }, metaBuku) });
  const yNama = ySign + 31;
  doc.text(MADRASAH.bendahara || '(............................)', xKiri, yNama, { align: 'center' });
  if (MADRASAH.bendahara && MADRASAH.nip_bendahara) doc.text('NIP. ' + MADRASAH.nip_bendahara, xKiri, yNama + 5, { align: 'center' });
  doc.text(MADRASAH.kepala_sekolah || '', xKanan, yNama, { align: 'center' });
  if (MADRASAH.nip_kepala_sekolah) doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, xKanan, yNama + 5, { align: 'center' });
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 15, doc.internal.pageSize.getHeight() - 10);
  doc.save(`Buku_${d.namaBuku.replace(' ', '_')}_${d.slug}.pdf`); toast(`📥 PDF Buku ${d.namaBuku} berhasil diunduh!`);
}
async function kasExportExcel() {
  if (!kasCanView()) return toast('Tidak diizinkan!', true);
  const d = kasDataPeriode();
  if (d.tampil.length === 0 && d.saldoSebelum === 0) return toast(`Belum ada data ${d.namaBuku} untuk periode ini.`, true);
  try { await ensureLib('xlsx'); } catch (e) { console.error('[SI MAMBA] Gagal memuat modul Excel', e); return toast('❌ Modul Excel belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
  if (typeof XLSX === 'undefined' || !XLSX.utils) return toast('❌ Modul Excel belum termuat. Muat ulang halaman lalu coba lagi.', true);
  const aoa = [[MADRASAH.nama || ''], ['BUKU ' + d.namaBuku.toUpperCase()], [`Periode: ${d.label}`], [],
    ['No', 'Tanggal', 'Kategori', 'Uraian', 'No. Bukti', 'Masuk', 'Keluar', 'Saldo']];
  if (d.bulan !== 'ALL') aoa.push(['', '', '', 'Saldo sebelumnya', '', '', '', d.saldoSebelum]);
  d.tampil.forEach((e, i) => aoa.push([i + 1, e.tanggal, e.kategori, e.uraian + (e.otomatis ? ' (otomatis)' : ''), e.buktiNo, e.jenis === 'masuk' ? e.nominal : '', e.jenis === 'keluar' ? e.nominal : '', e.saldo]));
  aoa.push(['', '', '', 'TOTAL PERIODE', '', d.totalMasuk, d.totalKeluar, d.saldoAkhir]);
  if (d.tanpaTanggal.length) aoa.push([], [`Catatan: ${d.tanpaTanggal.length} catatan tanpa tanggal valid tidak ikut dihitung.`]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 26 }, { wch: 44 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, d.namaBuku);
  XLSX.writeFile(wb, `Buku_${d.namaBuku.replace(' ', '_')}_${d.slug}.xlsx`); toast(`📥 Excel Buku ${d.namaBuku} berhasil diunduh!`);
}

// ============================================================
// SETORAN INFAQ PER KELAS (petugas -> Bendahara), per RENTANG TANGGAL dalam satu semester
// ============================================================
// Alur: petugas infaq kelas (ditunjuk Admin di menu Infaq Mingguan) mengumpulkan infaq dari
// siswa, lalu menyetorkannya ke Bendahara. Tiap penyetoran dicatat di sini: kelas, rentang
// tanggal infaq yang disetor (harus di dalam satu semester), jumlah yang disetor, tanggal
// setor, dan penerima. Jumlah "terkumpul" dihitung OTOMATIS dari Infaq Mingguan (iuran_siswa)
// pada rentang itu, jadi selisih (kurang/lebih setor) langsung kelihatan.
//
//  - Data disimpan di node Firebase `setoran_infaq` (per tahun ajaran, field tahunAjaran).
//  - Petugas: catat setoran KELASNYA SENDIRI; boleh ubah/hapus selama < 24 jam (aturan yang
//    sama dengan iuran: iuranTerkunci()). Admin: semua kelas, tanpa batas waktu.
//    Kepsek: lihat saja.
//  - Setoran TIDAK menambah saldo Kas Infaq. Pemasukan Kas Infaq sudah otomatis dihitung dari
//    Infaq Mingguan saat siswa dicatat lunas -- kalau setoran ikut menambah saldo, uangnya
//    terhitung dua kali. Setoran hanya alat pencocokan "terkumpul vs disetor".
//  - Semester: Ganjil = 1 Jul - 31 Des (tahun awal TA), Genap = 1 Jan - 30 Jun (tahun akhir TA),
//    sama dengan pembagian bulan tahun ajaran di Buku Kas (Juli s.d. Juni).
//  - Data dimuat sendiri di file ini (setoranMuat), tidak lewat loadAllData()/reloadDataset()
//    di app.js, supaya modul ini tetap mandiri.
let allSetoranInfaq = [];
let setoranTahunDimuat = null, setoranGen = 0, setoranTerakhirSegar = 0;
let setoranEditingKey = null, setoranNominalManual = false;
let setoranTenggat = setoranTenggatBawaan();   // aturan tenggat setor aktif (dimuat dari node setoran_pengaturan)

// Dipanggil app.js saat logout / ganti pengguna: kosongkan semua state modul Kas supaya pengguna
// berikutnya tidak melihat data (atau tab/mode edit) milik sesi sebelumnya sebelum data barunya
// dimuat. Aman dipanggil kapan saja.
function kasResetState() {
  try { allKasUmum = []; } catch (e) { /* allKasUmum milik app.js; abaikan bila belum ada */ }
  // Cache hasil susun entri memegang referensi ke array kas/iuran LAMA + hasil hitungannya (data sesi
  // sebelumnya). Perbandingan referensi di kasSusunEntri() memang membuatnya tidak dipakai lagi, tapi
  // isinya tetap tertahan di memori sampai buku itu dihitung ulang -- kosongkan di tempat (const, tak bisa diganti).
  Object.keys(_kasSusunCache).forEach(k => { delete _kasSusunCache[k]; });
  allSetoranInfaq = []; setoranTahunDimuat = null; setoranGen++; setoranTenggat = setoranTenggatBawaan();
  // Indeks iuran per kelas (setoranIndeksIuran) dibangun dari data iuran sesi sebelumnya; walau perbandingan
  // referensi array membuatnya tidak dipakai lagi, isinya tetap tertahan di memori -- kosongkan di tempat.
  _setoranIdx.ref = null; _setoranIdx.map = null;
  kasTerakhirSegar = 0; setoranTerakhirSegar = 0;
  kasEditingKey = null; setoranEditingKey = null; setoranNominalManual = false;
  kasBukuAktif = 'umum'; kasTabAktif = 'umum';
}
const SETORAN_SEMESTER = ['Ganjil', 'Genap'];

function kasEl(id) { return document.getElementById(id); }
function kasAdaTanggal(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
// 'YYYY-MM-DD' + n hari (dipecah manual, bukan new Date(str), supaya tidak geser hari karena zona waktu)
function kasTambahHari(tgl, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || '');
  if (!m) return tgl;
  return tglLokal(new Date(+m[1], +m[2] - 1, +m[3] + n));
}
// Selisih hari (b - a) antara dua 'YYYY-MM-DD'; dihitung lewat UTC supaya tidak terpengaruh jam musim panas/zona waktu.
function kasSelisihHari(a, b) {
  const pa = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a || ''), pb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || '');
  if (!pa || !pb) return 0;
  return Math.round((Date.UTC(+pb[1], +pb[2] - 1, +pb[3]) - Date.UTC(+pa[1], +pa[2] - 1, +pa[3])) / 86400000);
}
function kasRentangSemester(semester, ta) {
  const thn = parseInt(String(ta || currentTahunAjaran).split('/')[0], 10) || new Date().getFullYear();
  return semester === 'Genap'
    ? { dari: `${thn + 1}-01-01`, sampai: `${thn + 1}-06-30` }
    : { dari: `${thn}-07-01`, sampai: `${thn}-12-31` };
}

// ---- Hak akses ----
function setoranCanView() { return kasCanView() || (!!currentUser && infaqMyKelasList().length > 0); }
function setoranBolehCatat(kelas) { return !!currentUser && (isAdmin() || infaqMyKelasList().includes(kelas)); }
function setoranKelasDicatat() { return isAdmin() ? [...KELAS_LIST] : infaqMyKelasList(); }
function setoranKelasDilihat() { return kasCanView() ? [...KELAS_LIST] : infaqMyKelasList(); }
// Admin: selalu. Petugas kelas itu: selama belum lewat 24 jam sejak dicatat (iuranTerkunci di app.js).
function setoranBolehUbah(rec) { return !!rec && setoranBolehCatat(rec.kelas) && !iuranTerkunci(rec); }

// ---- Semester & perhitungan ----
function setoranSemesterDipilih() {
  const el = kasEl('setoranSemester');
  return (el && SETORAN_SEMESTER.includes(el.value)) ? el.value : (currentSemesterAktif === 'Genap' ? 'Genap' : 'Ganjil');
}
// Batas akhir penghitungan: hari ini atau akhir semester, mana yang lebih awal.
function setoranBatasSampai(sem) {
  const r = kasRentangSemester(sem), hari = tglLokal();
  return hari < r.sampai ? hari : r.sampai;
}
// Batas akhir rentang yang BOLEH disetor: KEMARIN atau akhir semester (mana lebih awal). Infaq hari
// ini masih bisa bertambah sampai hari berganti; kalau hari ini ikut disetor, infaq yang dicatat
// sesudah setoran (hari yang sama) jatuh di celah antar rentang dan tidak pernah tertagih.
function setoranBatasSetor(sem) {
  const r = kasRentangSemester(sem), kemarin = kasTambahHari(tglLokal(), -1);
  return kemarin < r.sampai ? kemarin : r.sampai;
}
// Total infaq lunas kelas pada rentang [dari, sampai] -- tanggal tiap pembayaran memakai aturan
// yang sama dengan baris otomatis Kas Infaq (kasTanggalIuran).
// Indeks pembayaran infaq per kelas: { kelas(trim): { rows: [{tgl, nom}], tanpaTanggal } }.
// Sebelumnya tiap hitungan (per kelas di rekap, lalu 2-3x per perubahan rentang, lalu tiap ketikan
// nominal) memutar SELURUH allInfaqSiswa dan mem-parse tanggal tiap barisnya. Sekarang parse
// dilakukan sekali per data; hitungan tinggal menyaring baris milik satu kelas. Deteksi data berubah
// memakai perbandingan referensi array, sama seperti cache kasSusunEntri (allInfaqSiswa hanya
// diganti dengan array BARU di app.js, tidak dimutasi di tempat).
const _setoranIdx = { ref: null, map: null };
function setoranIndeksIuran() {
  if (_setoranIdx.map && _setoranIdx.ref === allInfaqSiswa) return _setoranIdx.map;
  const map = {};
  (allInfaqSiswa || []).forEach(it => {
    const nom = kasNominalIuran(it);
    if (nom <= 0) return;   // dibebaskan/Rp 0 = tidak ada uang masuk
    const k = String(it.kelas == null ? '' : it.kelas).trim();
    if (!map[k]) map[k] = { rows: [], tanpaTanggal: 0 };
    const tgl = kasTanggalIuran(it);
    if (!tgl) map[k].tanpaTanggal += 1; else map[k].rows.push({ tgl, nom });
  });
  _setoranIdx.ref = allInfaqSiswa; _setoranIdx.map = map;
  return map;
}
// `tanpaTanggal` = pembayaran kelas ini yang tidak punya tanggal terbaca: tidak bisa masuk rentang
// mana pun, jadi dihitung terpisah dan diberitahukan di layar (bukan hilang diam-diam).
function setoranHitungTerkumpul(kelas, dari, sampai) {
  const b = setoranIndeksIuran()[String(kelas == null ? '' : kelas).trim()];
  if (!b) return { total: 0, jumlah: 0, tanpaTanggal: 0 };
  let total = 0, jumlah = 0;
  for (let i = 0; i < b.rows.length; i++) {
    const r = b.rows[i];
    if (r.tgl < dari || r.tgl > sampai) continue;
    total += r.nom; jumlah += 1;
  }
  return { total, jumlah, tanpaTanggal: b.tanpaTanggal };
}
function setoranTotalDisetor(kelas, sem, kecualiKey) {
  return allSetoranInfaq
    .filter(s => s.kelas === kelas && s.semester === sem && s.key !== kecualiKey)
    .reduce((a, s) => a + (parseInt(s.nominalSetor, 10) || 0), 0);
}
function setoranStatus(terkumpul, disetor) {
  const belum = terkumpul - disetor;
  if (terkumpul === 0 && disetor === 0) return { teks: 'Belum ada infaq', warna: '#6b7280', bg: '#f3f4f6' };
  if (belum > 0) return { teks: '⏳ Belum disetor', warna: '#92400e', bg: '#fef3c7' };
  if (belum === 0) return { teks: '✅ Sudah disetor semua', warna: '#065f46', bg: '#d1fae5' };
  return { teks: '⚠️ Setoran melebihi terkumpul', warna: '#991b1b', bg: '#fee2e2' };
}
function setoranIntroTeks() {
  let awal;
  if (isAdmin()) awal = 'Catat dan pantau setoran infaq tiap kelas ke Bendahara madrasah, per rentang tanggal dalam satu semester.';
  else if (isKepsek()) awal = 'Pantau setoran infaq tiap kelas ke Bendahara madrasah (lihat saja).';
  else awal = `Catat setoran infaq kelas ${infaqMyKelasList().join(', ')} ke Bendahara madrasah, per rentang tanggal dalam satu semester.`;
  return awal + ' Jumlah terkumpul dihitung otomatis dari Infaq Mingguan. Setoran tidak menambah saldo Kas Infaq (infaq sudah otomatis masuk ke sana), hanya untuk mencocokkan uang terkumpul dengan yang disetor.';
}

// =====================================================
// TENGGAT SETOR -- aturan fleksibel yang diatur Admin (node Firebase `setoran_pengaturan`)
// =====================================================
// Prinsip: sebuah pembayaran infaq dianggap SUDAH DISETOR kalau tanggalnya berada di dalam rentang
// (dari-sampai) salah satu setoran kelas itu pada semester yang sama; selainnya BELUM DISETOR dan punya
// "umur" (hari sejak infaq dicatat). Tiap pembayaran yang belum disetor punya tanggal JATUH TEMPO menurut
// aturan; lewat dari jatuh tempo (+ toleransi) = TERLAMBAT. Empat cara menetapkan tenggat:
//   'hari'     : maksimal N hari sejak infaq dicatat (bergulir; cocok bila tak ada jadwal tetap)
//   'mingguan' : hari tertentu (1=Senin..7=Minggu) pada minggu BERIKUTNYA dari minggu infaq dicatat
//   'bulanan'  : tanggal tertentu (1-31; 31 = akhir bulan) pada bulan BERIKUTNYA dari bulan infaq dicatat
//   'tanggal'  : daftar tanggal tenggat bebas (mis. mengikuti kalender madrasah); sebuah pembayaran jatuh
//                tempo pada tanggal tenggat pertama SETELAH tanggal pencatatannya
// Ditambah: toleransi (hari) dan daftar kelas yang dikecualikan. Selama `aktif` = false (bawaan) tidak ada
// yang dinilai terlambat -- tampilan lama tidak berubah; "belum disetor sejak ..." tetap tampil.
// Catatan: pembayaran yang tercakup rentang setoran dianggap tersetor walau jumlah setorannya kurang;
// kekurangan itu tampil sebagai "Kurang" di riwayat (selisih), bukan sebagai keterlambatan.
const SETORAN_TENGGAT_NODE = 'setoran_pengaturan';
const SETORAN_TENGGAT_MODE = ['hari', 'mingguan', 'bulanan', 'tanggal'];
const SETORAN_NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
function setoranTenggatBawaan() { return { aktif: false, mode: 'bulanan', nilai: 5, toleransi: 0, tanggalKhusus: [], kelasBebas: [], penerimaNama: '', penerimaJabatan: '', penerimaNip: '', penerimaKunci: false, penerimaKelas: [] }; }
// Rapikan data dari Firebase / form: nilai di luar rentang dijepit, tanggal tak valid dibuang.
function setoranTenggatNormal(raw) {
  const b = setoranTenggatBawaan();
  if (!raw || typeof raw !== 'object') return b;
  const daftar = v => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.keys(v).map(k => v[k]) : []);
  const mode = SETORAN_TENGGAT_MODE.includes(raw.mode) ? raw.mode : b.mode;
  const rentang = { hari: [1, 365, 7], mingguan: [1, 7, 1], bulanan: [1, 31, 5], tanggal: [0, 0, 0] }[mode];
  let nilai = parseInt(raw.nilai, 10); if (!isFinite(nilai)) nilai = rentang[2];
  nilai = Math.min(rentang[1], Math.max(rentang[0], nilai));
  let toleransi = parseInt(raw.toleransi, 10); if (!isFinite(toleransi)) toleransi = 0;
  toleransi = Math.min(365, Math.max(0, toleransi));
  const tgl = Array.from(new Set(daftar(raw.tanggalKhusus).map(x => String(x == null ? '' : x).trim()).filter(kasAdaTanggal))).sort();
  const bebas = Array.from(new Set(daftar(raw.kelasBebas).map(x => String(x == null ? '' : x).trim()).filter(Boolean)));
  const teks = (v, maks) => String(v == null ? '' : v).trim().slice(0, maks);
  // Penerima khusus per kelas disimpan sebagai daftar {kelas, nama} (bukan peta kelas->nama) karena nama kelas
  // bisa memuat karakter yang dilarang sebagai kunci Firebase ('.', '#', '$', '/', '[', ']').
  const pk = daftar(raw.penerimaKelas).filter(o => o && typeof o === 'object').map(o => ({ kelas: teks(o.kelas, 60), nama: teks(o.nama, 80) })).filter(o => o.kelas && o.nama);
  return { aktif: raw.aktif === true, mode, nilai, toleransi, tanggalKhusus: tgl, kelasBebas: bebas,
    penerimaNama: teks(raw.penerimaNama, 80), penerimaJabatan: teks(raw.penerimaJabatan, 60), penerimaNip: teks(raw.penerimaNip, 30), penerimaKunci: raw.penerimaKunci === true, penerimaKelas: pk };
}
// Tanggal terakhir sebuah infaq (dicatat pada `tgl`) masih tepat waktu disetor; '' bila tak bisa ditentukan.
function setoranJatuhTempo(tgl, cfg) {
  cfg = cfg || setoranTenggat;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || ''); if (!m) return '';
  const y = +m[1], mo = +m[2] - 1, dd = +m[3];
  let due = '';
  if (cfg.mode === 'hari') due = kasTambahHari(tgl, cfg.nilai);
  else if (cfg.mode === 'mingguan') {
    const hariKe = (new Date(y, mo, dd).getDay() + 6) % 7 + 1;           // 1=Senin .. 7=Minggu
    due = kasTambahHari(tgl, (7 - hariKe) + cfg.nilai);                   // Minggu itu + N hari = hari ke-N minggu berikutnya
  } else if (cfg.mode === 'bulanan') {
    const akhirBulan = new Date(y, mo + 2, 0).getDate();                  // jumlah hari bulan berikutnya
    due = tglLokal(new Date(y, mo + 1, Math.min(cfg.nilai, akhirBulan)));
  } else if (cfg.mode === 'tanggal') {
    due = (cfg.tanggalKhusus || []).find(t => t > tgl) || '';
  }
  return due ? kasTambahHari(due, cfg.toleransi || 0) : '';
}
function setoranTenggatRingkas(cfg) {
  cfg = cfg || setoranTenggat;
  if (!cfg.aktif) return 'Tenggat setor belum diaktifkan oleh Admin.';
  let a;
  if (cfg.mode === 'hari') a = `Infaq disetor paling lambat ${cfg.nilai} hari setelah dicatat`;
  else if (cfg.mode === 'mingguan') a = `Infaq tiap minggu disetor paling lambat hari ${SETORAN_NAMA_HARI[cfg.nilai - 1]} minggu berikutnya`;
  else if (cfg.mode === 'bulanan') a = cfg.nilai >= 31 ? 'Infaq tiap bulan disetor paling lambat akhir bulan berikutnya' : `Infaq tiap bulan disetor paling lambat tanggal ${cfg.nilai} bulan berikutnya`;
  else a = cfg.tanggalKhusus.length ? `Tenggat setor: ${cfg.tanggalKhusus.slice(0, 6).map(kasTglIndo).join(', ')}${cfg.tanggalKhusus.length > 6 ? ', …' : ''}` : 'Tenggat setor: (belum ada tanggal diisi)';
  if (cfg.toleransi > 0) a += `, toleransi ${cfg.toleransi} hari`;
  if (cfg.kelasBebas.length) a += `. Dikecualikan: ${cfg.kelasBebas.join(', ')}`;
  return a + '.';
}
// Pembayaran infaq satu kelas (dalam semester, s.d. `batas`) yang BELUM tercakup rentang setoran mana pun.
function setoranHitungTunggakan(kelas, sem, r, batas) {
  const cfg = setoranTenggat, hari = tglLokal();
  const out = { aktif: !!cfg.aktif && !cfg.kelasBebas.includes(kelas), belumJumlah: 0, belumNominal: 0, tertua: '', umurHari: 0,
    terlambatJumlah: 0, terlambatNominal: 0, terlambatSejak: '', hariTerlambat: 0, tenggatBerikut: '' };
  const b = setoranIndeksIuran()[String(kelas == null ? '' : kelas).trim()];
  if (!b) return out;
  const recs = allSetoranInfaq.filter(s => kasSamaKelas(s.kelas, kelas) && s.semester === sem && kasAdaTanggal(s.dari) && kasAdaTanggal(s.sampai));
  b.rows.forEach(row => {
    if (row.tgl < r.dari || row.tgl > batas) return;
    if (recs.some(s => row.tgl >= s.dari && row.tgl <= s.sampai)) return;   // sudah tercakup setoran
    out.belumJumlah += 1; out.belumNominal += row.nom;
    if (!out.tertua || row.tgl < out.tertua) out.tertua = row.tgl;
    if (!out.aktif) return;
    const due = setoranJatuhTempo(row.tgl, cfg);
    if (!due) return;
    if (due < hari) {
      out.terlambatJumlah += 1; out.terlambatNominal += row.nom;
      if (!out.terlambatSejak || due < out.terlambatSejak) out.terlambatSejak = due;
    } else if (!out.tenggatBerikut || due < out.tenggatBerikut) out.tenggatBerikut = due;
  });
  if (out.tertua) out.umurHari = Math.max(0, kasSelisihHari(out.tertua, hari));
  if (out.terlambatSejak) out.hariTerlambat = Math.max(1, kasSelisihHari(out.terlambatSejak, hari));
  return out;
}
// ---- Penerima setoran ----
// Urutan: penerima khusus kelas itu -> penerima umum yang ditunjuk Admin -> Bendahara (data madrasah).
// `kelas` kosong = penerima umum (dipakai tanda tangan PDF "Semua Kelas").
function setoranPenerimaInfo(kelas, cfg) {
  cfg = cfg || setoranTenggat;
  const o = kelas ? (cfg.penerimaKelas || []).find(x => kasSamaKelas(x.kelas, kelas)) : null;
  if (o && o.nama) return { nama: o.nama, jabatan: cfg.penerimaJabatan || 'Penerima Setoran', nip: '', ditunjuk: true };
  if (cfg.penerimaNama) return { nama: cfg.penerimaNama, jabatan: cfg.penerimaJabatan || 'Penerima Setoran', nip: cfg.penerimaNip || '', ditunjuk: true };
  return { nama: (MADRASAH && MADRASAH.bendahara) || '', jabatan: 'Bendahara Madrasah', nip: (MADRASAH && MADRASAH.nip_bendahara) || '', ditunjuk: false };
}
function setoranPenerimaDari(kelas, cfg) { return setoranPenerimaInfo(kelas, cfg).nama; }
// Terkunci = Admin mewajibkan nama penerima & yang mengisi bukan Admin. Dipakai di form (readOnly) dan setoranSimpan.
function setoranPenerimaTerkunci(kelas) { return !!setoranTenggat.penerimaKunci && !isAdmin() && !!setoranPenerimaDari(kelas); }
// Isi kolom penerima di form. paksa=true: selalu ganti (form baru / ganti kelas); paksa=false: hanya bila masih
// kosong atau terkunci (mis. setelah aturan selesai dimuat, supaya ketikan petugas tidak tertimpa).
function setoranTerapkanPenerima(paksa) {
  const el = kasEl('setoranPenerima'); if (!el) return;
  const kelas = (kasEl('setoranKelas') || {}).value, kunci = setoranPenerimaTerkunci(kelas);
  if (paksa || kunci || !el.value) el.value = setoranPenerimaDari(kelas);
  el.readOnly = kunci;
}
function setoranPenerimaRingkas(cfg) {
  cfg = cfg || setoranTenggat;
  const umum = cfg.penerimaNama ? `${cfg.penerimaNama}${cfg.penerimaJabatan ? ' (' + cfg.penerimaJabatan + ')' : ''}` : '';
  const khusus = cfg.penerimaKelas.map(o => `${o.kelas}: ${o.nama}`).join(', ');
  if (!umum && !khusus) return '';
  return 'Penerima setoran: ' + (umum || 'Bendahara') + (khusus ? `; khusus ${khusus}` : '') + (cfg.penerimaKunci ? ' (nama dikunci)' : '') + '.';
}
function setoranPengaturanRingkas(cfg) { return [setoranTenggatRingkas(cfg), setoranPenerimaRingkas(cfg)].filter(Boolean).join(' '); }
function setoranTeksSejak(x) {
  return (x.belum > 0 && x.tg && x.tg.tertua) ? `${kasTglIndo(x.tg.tertua)} (${x.tg.umurHari} hari)` : '-';
}
function setoranMuatTenggat(g) {
  try {
    return Promise.resolve(db.ref(SETORAN_TENGGAT_NODE).once('value')).then(snap => {
      if (g !== setoranGen) return;   // sesi/tahun sudah berganti selama menunggu
      setoranTenggat = setoranTenggatNormal(snap && snap.val ? snap.val() : null);
      const card = kasEl('setoranTenggatCard'); if (card) card.dataset.form = '';   // paksa form diisi ulang dengan nilai terbaru
      if (!setoranEditingKey) setoranTerapkanPenerima(false);
    }).catch(e => { console.warn('[SI MAMBA] Gagal memuat aturan tenggat setor (tetap memakai aturan yang ada):', e); });
  } catch (e) { return Promise.resolve(); }
}
// ---- Kartu aturan tenggat (dibuat lewat JS; Admin mengubah, yang lain hanya membaca ringkasannya) ----
function setoranRenderTenggat() {
  const ringkas = kasEl('setoranRingkasArea'); if (!ringkas || !ringkas.parentNode) return;
  let card = kasEl('setoranTenggatCard');
  if (!card) { card = document.createElement('div'); card.id = 'setoranTenggatCard'; card.style.cssText = 'margin-bottom:10px;'; ringkas.parentNode.insertBefore(card, ringkas); }
  const teks = escapeHtml(setoranPengaturanRingkas());
  if (!isAdmin()) { card.dataset.form = ''; card.innerHTML = `<div style="font-size:12px;color:#374151;">⏰ ${teks}</div>`; return; }
  if (card.dataset.form === '1') { const i = kasEl('setoranTgInfo'); if (i) i.textContent = '— ' + setoranPengaturanRingkas(); return; }
  const lama = card.querySelector ? card.querySelector('details') : null, buka = !!(lama && lama.open);
  const gaya = 'padding:6px 8px;border:1px solid #d1d5db;border-radius:8px;max-width:100%;';
  const optMode = [['bulanan', 'Per bulan (tanggal tertentu bulan berikutnya)'], ['mingguan', 'Per minggu (hari tertentu minggu berikutnya)'], ['hari', 'Maksimal N hari setelah infaq dicatat'], ['tanggal', 'Tanggal tenggat bebas (daftar tanggal)']]
    .map(o => `<option value="${o[0]}">${o[1]}</option>`).join('');
  const optHari = SETORAN_NAMA_HARI.map((h, i) => `<option value="${i + 1}">${h}</option>`).join('');
  const cbKelas = KELAS_LIST.map((k, i) => `<label style="font-size:12px;margin-right:12px;white-space:nowrap;"><input type="checkbox" id="setoranTgBebas${i}"> ${escapeHtml(k)}</label>`).join('');
  const inpPK = KELAS_LIST.map((k, i) => `<label style="font-size:12px;display:block;margin-bottom:4px;">${escapeHtml(k)}: <input type="text" id="setoranTgPK${i}" maxlength="80" placeholder="(ikut penerima umum)" style="${gaya}width:200px;"></label>`).join('');
  card.innerHTML = `<details${buka ? ' open' : ''} style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;">
    <summary style="cursor:pointer;font-size:13px;font-weight:600;">⏰ Pengaturan Setoran: Tenggat & Penerima <span id="setoranTgInfo" style="font-weight:400;font-size:12px;color:#374151;">— ${teks}</span></summary>
    <div style="margin-top:10px;display:grid;gap:10px;font-size:13px;">
      <label><input type="checkbox" id="setoranTgAktif" onchange="setoranTgPratinjau()"> Aktifkan tenggat setor (kelas yang lewat tenggat diberi status Terlambat)</label>
      <label>Cara menetapkan tenggat<br><select id="setoranTgMode" onchange="setoranTgOnMode()" style="${gaya}">${optMode}</select></label>
      <div id="setoranTgNilaiWrap"><span id="setoranTgNilaiLabel"></span><br>
        <input type="number" id="setoranTgNilai" min="1" max="365" oninput="setoranTgPratinjau()" style="${gaya}width:110px;">
        <select id="setoranTgHari" onchange="setoranTgPratinjau()" style="${gaya}">${optHari}</select></div>
      <label id="setoranTgTglWrap">Tanggal tenggat (satu per baris atau pisahkan koma, format YYYY-MM-DD)<br><textarea id="setoranTgTanggal" rows="4" oninput="setoranTgPratinjau()" style="${gaya}width:100%;max-width:320px;"></textarea></label>
      <label>Toleransi (hari) — kelonggaran setelah tenggat sebelum dinilai terlambat<br><input type="number" id="setoranTgToleransi" min="0" max="365" oninput="setoranTgPratinjau()" style="${gaya}width:110px;"></label>
      <div>Kelas yang dikecualikan dari tenggat (centang):<br>${cbKelas}</div>
      <div id="setoranTgPratinjau" style="font-size:12px;color:#6b7280;"></div>
      <hr style="border:0;border-top:1px solid #e5e7eb;width:100%;">
      <div style="font-weight:600;">Penerima setoran</div>
      <div style="font-size:12px;color:#6b7280;">Kosongkan nama untuk memakai Bendahara dari data madrasah. Nama ini terisi otomatis di form setoran dan tertulis di tanda tangan PDF.</div>
      <label>Nama penerima<br><input type="text" id="setoranTgPenerima" maxlength="80" style="${gaya}width:100%;max-width:320px;"></label>
      <label>Jabatan di PDF (mis. Wali Kelas / Petugas Infaq; kosong = "Penerima Setoran")<br><input type="text" id="setoranTgJabatan" maxlength="60" style="${gaya}width:100%;max-width:320px;"></label>
      <label>NIP (opsional)<br><input type="text" id="setoranTgNip" maxlength="30" style="${gaya}width:100%;max-width:320px;"></label>
      <div>Penerima khusus per kelas (opsional, menggantikan penerima umum):<br>${inpPK}</div>
      <label><input type="checkbox" id="setoranTgKunci"> Petugas kelas tidak boleh mengubah nama penerima</label>
      <div><button class="btn btn-primary" id="btnSimpanTenggat" onclick="setoranTenggatSimpan()">💾 Simpan Aturan</button></div>
    </div></details>`;
  card.dataset.form = '1';
  const c = setoranTenggat, set = (id, v) => { const el = kasEl(id); if (el) el.value = v; };
  const ck = kasEl('setoranTgAktif'); if (ck) ck.checked = !!c.aktif;
  set('setoranTgMode', c.mode); set('setoranTgNilai', c.mode === 'mingguan' ? '' : c.nilai);
  set('setoranTgHari', c.mode === 'mingguan' ? c.nilai : 1);
  set('setoranTgTanggal', c.tanggalKhusus.join('\n')); set('setoranTgToleransi', c.toleransi);
  set('setoranTgPenerima', c.penerimaNama); set('setoranTgJabatan', c.penerimaJabatan); set('setoranTgNip', c.penerimaNip);
  const kk = kasEl('setoranTgKunci'); if (kk) kk.checked = !!c.penerimaKunci;
  KELAS_LIST.forEach((k, i) => { const o = c.penerimaKelas.find(x => kasSamaKelas(x.kelas, k)); set('setoranTgPK' + i, o ? o.nama : ''); });
  KELAS_LIST.forEach((k, i) => { const el = kasEl('setoranTgBebas' + i); if (el) el.checked = c.kelasBebas.includes(k); });
  setoranTgOnMode(true);
}
// Baca isi form -> { cfg (sudah dirapikan), salah: [baris tanggal tak valid] }
function setoranTgBaca() {
  const v = id => (kasEl(id) || {}).value, mode = SETORAN_TENGGAT_MODE.includes(v('setoranTgMode')) ? v('setoranTgMode') : 'bulanan';
  const baris = String(v('setoranTgTanggal') || '').split(/[\s,;]+/).map(x => x.trim()).filter(Boolean);
  const salah = baris.filter(x => !kasAdaTanggal(x) || isNaN(new Date(x + 'T00:00:00').getTime()));
  const bebas = KELAS_LIST.filter((k, i) => (kasEl('setoranTgBebas' + i) || {}).checked);
  const cfg = setoranTenggatNormal({ aktif: !!(kasEl('setoranTgAktif') || {}).checked, mode, nilai: mode === 'mingguan' ? v('setoranTgHari') : v('setoranTgNilai'),
    toleransi: v('setoranTgToleransi'), tanggalKhusus: baris.filter(x => salah.indexOf(x) < 0), kelasBebas: bebas,
    penerimaNama: v('setoranTgPenerima'), penerimaJabatan: v('setoranTgJabatan'), penerimaNip: v('setoranTgNip'), penerimaKunci: !!(kasEl('setoranTgKunci') || {}).checked,
    penerimaKelas: KELAS_LIST.map((k, i) => ({ kelas: k, nama: v('setoranTgPK' + i) })) });
  return { cfg, salah };
}
function setoranTgOnMode(tanpaPratinjau) {
  const mode = (kasEl('setoranTgMode') || {}).value;
  const tampil = (id, ok) => { const el = kasEl(id); if (el) el.style.display = ok ? '' : 'none'; };
  tampil('setoranTgNilaiWrap', mode !== 'tanggal'); tampil('setoranTgNilai', mode !== 'mingguan'); tampil('setoranTgHari', mode === 'mingguan'); tampil('setoranTgTglWrap', mode === 'tanggal');
  const lbl = kasEl('setoranTgNilaiLabel');
  if (lbl) lbl.textContent = mode === 'hari' ? 'Maksimal berapa hari setelah infaq dicatat? (1–365)'
    : (mode === 'mingguan' ? 'Setor paling lambat hari (pada minggu berikutnya)' : 'Setor paling lambat tanggal (bulan berikutnya; 31 = akhir bulan)');
  if (!tanpaPratinjau) {
    // Ganti cara: isi nilai bawaan cara itu supaya tidak membawa angka dari cara lain (mis. 5 hari -> "tanggal 5").
    const bawaan = { hari: 7, bulanan: 5 }[mode]; const n = kasEl('setoranTgNilai'); if (n && bawaan) n.value = bawaan;
  }
  setoranTgPratinjau();
}
function setoranTgPratinjau() {
  const box = kasEl('setoranTgPratinjau'); if (!box) return;
  const b = setoranTgBaca(), hari = tglLokal(), due = setoranJatuhTempo(hari, b.cfg);
  box.textContent = (b.cfg.mode === 'tanggal' && !b.cfg.tanggalKhusus.length ? 'Isi minimal satu tanggal tenggat. ' : '')
    + (due ? `Contoh: infaq yang dicatat hari ini (${kasTglIndo(hari)}) jatuh tempo ${kasTglIndo(due)}${b.cfg.toleransi ? ' (sudah termasuk toleransi)' : ''}.` : (b.cfg.mode === 'tanggal' ? 'Infaq setelah tanggal tenggat terakhir belum punya tenggat.' : ''))
    + (b.salah.length ? ` ⚠️ Tanggal tidak valid: ${b.salah.join(', ')}` : '');
}
function setoranTenggatSimpan() {
  if (!isAdmin()) return toast('Hanya Admin yang bisa mengubah pengaturan setoran!', true);
  if (isBusy('setoranTenggat')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Menyimpan pengaturan butuh koneksi internet — coba lagi setelah online.', true);
  const baca = setoranTgBaca(), cfg = baca.cfg;
  if (baca.salah.length) return toast(`Tanggal tidak valid: ${baca.salah.join(', ')}. Gunakan format YYYY-MM-DD.`, true);
  if (cfg.aktif && cfg.mode === 'tanggal' && !cfg.tanggalKhusus.length) return toast('Isi minimal satu tanggal tenggat.', true);
  const btn = kasEl('btnSimpanTenggat');
  setBusy('setoranTenggat', btn);
  db.ref(SETORAN_TENGGAT_NODE).set(Object.assign({}, cfg, { updatedBy: currentUser.name, updatedAt: new Date().toISOString() }), err => {
    clearBusy('setoranTenggat', btn);
    if (err) return toast('Gagal: ' + (err.message || err), true);
    setoranTenggat = cfg;
    toast('✅ Pengaturan setoran disimpan!'); addLog('ubah_tenggat_setoran', setoranPengaturanRingkas(cfg));
    const card = kasEl('setoranTenggatCard'); if (card) card.dataset.form = '';
    if (!setoranEditingKey) setoranTerapkanPenerima(true);
    setoranRender();
  });
}

// ---- Data ----
function setoranMuat(onDone) {
  if (!setoranCanView()) { if (typeof onDone === 'function') onDone(); return Promise.resolve(); }
  const g = ++setoranGen, ta = currentTahunAjaran;
  const semua = kasCanView(), kelasSaya = infaqMyKelasList();
  return Promise.all([_fetchList(_byTahun('setoran_infaq'), x => semua || kelasSaya.includes(x.kelas)), setoranMuatTenggat(g)]).then(hasil => {
    const a = hasil[0];
    if (a && g === setoranGen) { allSetoranInfaq = a; setoranTahunDimuat = ta; setoranTerakhirSegar = Date.now(); }
    if (typeof onDone === 'function') onDone();
  });
}

// ---- Tampilan rekap & riwayat ----
// Satu sumber data untuk tampilan layar, PDF & Excel supaya angkanya selalu sama.
function setoranDataRekap() {
  const sem = setoranSemesterDipilih(), r = kasRentangSemester(sem), batas = setoranBatasSampai(sem);
  const kelasSemua = setoranKelasDilihat();
  const selKelas = kasEl('setoranKelasFilter');
  const filter = (selKelas && kelasSemua.includes(selKelas.value)) ? selKelas.value : 'ALL';
  const daftar = filter === 'ALL' ? kelasSemua : [filter];
  const semRecs = allSetoranInfaq.filter(s => s.semester === sem);
  const belumMulai = batas < r.dari;
  let totT = 0, totS = 0;
  const rekap = daftar.map(kelas => {
    const t = belumMulai ? { total: 0, jumlah: 0 } : setoranHitungTerkumpul(kelas, r.dari, batas);
    const recs = semRecs.filter(s => s.kelas === kelas);
    const disetor = recs.reduce((a, s) => a + (parseInt(s.nominalSetor, 10) || 0), 0);
    const terakhir = recs.reduce((a, s) => ((s.tanggalSetor || '') > a ? s.tanggalSetor : a), '');
    totT += t.total; totS += disetor;
    const belum = t.total - disetor, tg = setoranHitungTunggakan(kelas, sem, r, batas);
    let status = setoranStatus(t.total, disetor);
    const terlambat = tg.aktif && belum > 0 && tg.terlambatJumlah > 0;   // hanya bila memang masih ada uang belum disetor
    if (terlambat) status = { teks: `⚠️ Terlambat ${tg.hariTerlambat} hari`, warna: '#991b1b', bg: '#fee2e2' };
    return { kelas, petugas: infaqPetugasNama(kelas), terkumpul: t.total, jumlahBayar: t.jumlah, tanpaTanggal: t.tanpaTanggal || 0, disetor, jumlahSetor: recs.length, belum, status, terakhir, tg, terlambat };
  });
  const riwayat = semRecs.filter(s => daftar.includes(s.kelas))
    .sort((a, b) => (b.tanggalSetor || '').localeCompare(a.tanggalSetor || '') || (b.inputAt || '').localeCompare(a.inputAt || ''));
  const slugKelas = filter === 'ALL' ? 'Semua_Kelas' : filter.replace(/[^A-Za-z0-9]+/g, '_');
  return { sem, r, batas, belumMulai, daftar, rekap, riwayat, totT, totS, totBelum: totT - totS, slug: `Setoran_Infaq_${slugKelas}_${sem}_${String(currentTahunAjaran).replace('/', '-')}`, labelKelas: filter === 'ALL' ? 'Semua Kelas' : filter };
}
// Baris kecil di bawah status: umur tunggakan + info tenggat (hanya bila memang masih ada yang belum disetor).
function setoranSubStatus(x) {
  const tg = x.tg; if (!tg || x.belum <= 0) return '';
  const baris = [];
  if (tg.tertua) baris.push(`Belum disetor sejak ${escapeHtml(kasTglIndo(tg.tertua))} (${tg.umurHari} hari)`);
  if (tg.aktif && tg.terlambatJumlah > 0) baris.push(`<span style="color:#991b1b;">Lewat tenggat: ${escapeHtml(kasRp(tg.terlambatNominal))} (${tg.terlambatJumlah} pembayaran)</span>`);
  if (tg.aktif && tg.tenggatBerikut) baris.push(`Tenggat berikutnya: ${escapeHtml(kasTglIndo(tg.tenggatBerikut))}`);
  return baris.length ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;">${baris.join('<br>')}</div>` : '';
}
function setoranRender() {
  const ringkas = kasEl('setoranRingkasArea'), riwayat = kasEl('setoranRiwayatArea');
  if (!ringkas || !riwayat) return;
  if (!setoranCanView()) {
    ringkas.innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin, Kepala Madrasah & petugas infaq kelas.</p>'; riwayat.innerHTML = ''; return;
  }
  setoranRenderTenggat();
  const d = setoranDataRekap(), sem = d.sem, r = d.r, batas = d.batas, belumMulai = d.belumMulai, totT = d.totT, totS = d.totS;
  const baris = d.rekap.map(x => {
    const st = x.status, petugas = x.petugas, belum = x.belum;
    return `<tr>
      <td style="font-weight:600;white-space:nowrap;">${escapeHtml(x.kelas)}</td>
      <td style="font-size:12px;">${petugas ? escapeHtml(petugas) : '<span style="color:#d97706;">belum ditunjuk</span>'}</td>
      <td style="text-align:right;white-space:nowrap;">${kasRp(x.terkumpul)}<div style="font-size:10px;color:#6b7280;">${x.jumlahBayar} pembayaran</div>${x.tanpaTanggal ? `<div style="font-size:10px;color:#b45309;">⚠️ ${x.tanpaTanggal} pembayaran tanpa tanggal tidak terhitung</div>` : ''}</td>
      <td style="text-align:right;white-space:nowrap;color:#059669;">${kasRp(x.disetor)}<div style="font-size:10px;color:#6b7280;">${x.jumlahSetor}x setor</div></td>
      <td style="text-align:right;white-space:nowrap;font-weight:600;color:${belum > 0 ? '#b45309' : (belum < 0 ? '#dc2626' : '#065f46')};">${kasRp(belum)}</td>
      <td><span style="font-size:11px;background:${st.bg};color:${st.warna};border-radius:8px;padding:2px 8px;white-space:nowrap;">${st.teks}</span>${setoranSubStatus(x)}</td>
      <td style="white-space:nowrap;font-size:12px;">${x.terakhir ? escapeHtml(kasTglIndo(x.terakhir)) : '-'}</td>
    </tr>`;
  }).join('');
  const totBelum = d.totBelum;
  const telat = d.rekap.filter(x => x.terlambat);
  const banner = telat.length ? `<div style="margin-bottom:8px;background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:8px 12px;font-size:12px;color:#991b1b;">⚠️ ${telat.length} kelas melewati tenggat setor: ${telat.map(x => escapeHtml(x.kelas) + ' (' + x.tg.hariTerlambat + ' hari, ' + escapeHtml(kasRp(x.tg.terlambatNominal)) + ')').join(', ')}</div>` : '';
  ringkas.innerHTML = `${banner}<p style="font-size:11px;color:#6b7280;margin-bottom:8px;">Semester <strong>${sem}</strong> ${escapeHtml(currentTahunAjaran)} (${escapeHtml(kasTglIndo(r.dari))} – ${escapeHtml(kasTglIndo(r.sampai))})${belumMulai ? ' — semester ini belum dimulai.' : ' — terkumpul dihitung s.d. ' + escapeHtml(kasTglIndo(batas)) + '.'}</p>
    <div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Petugas</th><th style="text-align:right;">Terkumpul</th><th style="text-align:right;">Disetor</th><th style="text-align:right;">Belum Disetor</th><th>Status</th><th>Setor Terakhir</th></tr></thead>
    <tbody>${baris || '<tr><td colspan="7" style="color:#6b7280;">Tidak ada kelas.</td></tr>'}</tbody>
    <tfoot><tr style="background:#f3f4f6;font-weight:700;"><th colspan="2" style="text-align:right;">TOTAL</th><th style="text-align:right;">${kasRp(totT)}</th><th style="text-align:right;color:#059669;">${kasRp(totS)}</th><th style="text-align:right;">${kasRp(totBelum)}</th><th colspan="2"></th></tr></tfoot></table></div>`;

  const list = d.riwayat;
  if (list.length === 0) {
    riwayat.innerHTML = `<p style="color:#6b7280;font-size:13px;">Belum ada setoran infaq tercatat untuk semester ${sem}.</p>`; return;
  }
  const rows = list.map(s => {
    const sel = parseInt(s.selisih, 10) || 0;
    const selTeks = sel === 0 ? '<span style="color:#059669;">✅ Pas</span>' : `<span style="color:${sel < 0 ? '#dc2626' : '#b45309'};">${sel < 0 ? 'Kurang ' : 'Lebih '}${kasRp(Math.abs(sel))}</span>`;
    const aksi = setoranBolehUbah(s)
      ? `<button class="btn btn-edit" style="padding:2px 8px;font-size:11px;" onclick="setoranEdit('${escapeJs(s.key)}')">✏️</button> <button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="setoranHapus('${escapeJs(s.key)}')">🗑️</button>`
      : '';
    const ket = [s.keterangan, s.buktiNo ? 'Bukti: ' + s.buktiNo : '', s.penerima ? 'Diterima: ' + s.penerima : ''].filter(Boolean).map(escapeHtml).join(' • ');
    const sedangDiubah = !!setoranEditingKey && s.key === setoranEditingKey;
    return `<tr${sedangDiubah ? ' style="background:#fffbeb;"' : ''}>
      <td style="white-space:nowrap;">${escapeHtml(kasTglIndo(s.tanggalSetor))}</td>
      <td style="white-space:nowrap;font-weight:600;">${escapeHtml(s.kelas)}</td>
      <td style="white-space:nowrap;font-size:12px;">${escapeHtml(kasTglIndo(s.dari))} – ${escapeHtml(kasTglIndo(s.sampai))}</td>
      <td style="text-align:right;white-space:nowrap;">${kasRp(s.nominalTerkumpul)}</td>
      <td style="text-align:right;white-space:nowrap;font-weight:600;color:#059669;">${kasRp(s.nominalSetor)}</td>
      <td style="white-space:nowrap;font-size:12px;">${selTeks}</td>
      <td style="font-size:11px;color:#6b7280;">${ket}<div>Dicatat: ${escapeHtml(s.inputBy || '-')}</div>${sedangDiubah ? '<div style="color:#b45309;font-weight:600;">✏️ Sedang diubah</div>' : ''}</td>
      <td style="white-space:nowrap;">${aksi}</td>
    </tr>`;
  }).join('');
  riwayat.innerHTML = `<div style="overflow-x:auto;"><table><thead><tr><th>Tgl Setor</th><th>Kelas</th><th>Rentang Infaq</th><th style="text-align:right;">Terkumpul</th><th style="text-align:right;">Disetor</th><th>Selisih</th><th>Keterangan</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---- Form ----
// Dipanggil saat halaman/tab dibuka: isi pilihan kelas & semester, lalu siapkan form.
function setoranInitForm() {
  if (!setoranCanView()) return;
  const semSel = kasEl('setoranSemester');
  if (semSel && semSel.dataset.user !== '1') semSel.value = currentSemesterAktif === 'Genap' ? 'Genap' : 'Ganjil';
  const lihat = setoranKelasDilihat();
  const f = kasEl('setoranKelasFilter');
  if (f) {
    const prev = f.value;
    f.innerHTML = (lihat.length > 1 ? '<option value="ALL">Semua Kelas</option>' : '') + lihat.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
    if (Array.from(f.options).some(o => o.value === prev)) f.value = prev;
  }
  const dicatat = setoranKelasDicatat();
  const card = kasEl('setoranFormCard');
  if (card) card.style.display = dicatat.length ? '' : 'none';
  const sk = kasEl('setoranKelas');
  if (sk && dicatat.length) {
    const prev = sk.value;
    sk.innerHTML = dicatat.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
    if (dicatat.includes(prev)) sk.value = prev;
  }
  if (dicatat.length && !setoranEditingKey) setoranResetForm();
}
function setoranResetForm() {
  setoranEditingKey = null; setoranNominalManual = false;
  const set = (id, v) => { const el = kasEl(id); if (el) el.value = v; };
  set('setoranNominal', ''); set('setoranTanggal', tglLokal()); set('setoranBukti', ''); set('setoranKet', '');
  const sk = kasEl('setoranKelas'); if (sk) sk.disabled = false;
  const btn = kasEl('btnSimpanSetoran'); if (btn) btn.textContent = '💾 Simpan Setoran';
  const batal = kasEl('btnBatalSetoran'); if (batal) batal.style.display = 'none';
  const judul = kasEl('setoranFormTitle'); if (judul) judul.textContent = '➕ Catat Setoran Infaq';
  setoranTerapkanPenerima(true);
  setoranSetRentangDefault();
}
// Rentang bawaan: dari sehari setelah akhir setoran sebelumnya (atau awal semester) sampai
// KEMARIN (atau akhir semester) -- petugas tinggal cek angkanya lalu simpan.
// Kalau memang belum ada rentang yang boleh disetor, kolom dikosongkan beserta alasannya. Kasus: hari
// pertama semester / semester belum mulai (batas setor jatuh sebelum awal semester) dan semua infaq
// sampai batas sudah disetor. Dulu "sampai" dipaksa = awal semester (= hari ini) dan "dari" ditarik
// mundur ke "sampai", sehingga bawaannya pasti ditolak setoranSimpan ("paling lambat kemarin") atau
// menumpang di hari yang sudah disetor.
function setoranSetRentangDefault() {
  const kelas = (kasEl('setoranKelas') || {}).value;
  const sem = setoranSemesterDipilih(), r = kasRentangSemester(sem), batas = setoranBatasSetor(sem);
  const dariEl = kasEl('setoranDari'), sampaiEl = kasEl('setoranSampai'); if (!dariEl || !sampaiEl) return;
  dariEl.min = sampaiEl.min = r.dari; dariEl.max = sampaiEl.max = r.sampai;
  const info = kasEl('setoranFormSemesterInfo');
  if (info) info.textContent = `Semester ${sem} ${currentTahunAjaran}: ${kasTglIndo(r.dari)} – ${kasTglIndo(r.sampai)}. Ganti semester di kartu rekap di atas.`;
  const sebelumnya = allSetoranInfaq.filter(s => s.kelas === kelas && s.semester === sem && s.key !== setoranEditingKey).map(s => s.sampai || '').filter(Boolean).sort();
  const terakhir = sebelumnya.length ? sebelumnya[sebelumnya.length - 1] : '';
  let dari = '', sampai = '', alasan = '';
  if (batas < r.dari) {
    alasan = tglLokal() < r.dari
      ? `Semester ${sem} belum dimulai (mulai ${kasTglIndo(r.dari)}) — belum ada infaq yang bisa disetor.`
      : `Semester ${sem} baru dimulai hari ini — infaq hari ini baru bisa disetor mulai besok.`;
  } else {
    dari = terakhir ? kasTambahHari(terakhir, 1) : r.dari;
    if (dari > batas) {
      dari = '';
      alasan = `Infaq ${kelas || ''} sampai ${kasTglIndo(batas)} sudah tercatat disetor semua${batas < r.sampai ? ' — rentang berikutnya tersedia mulai besok' : ''}.`;
    } else sampai = batas;
  }
  dariEl.value = dari; sampaiEl.value = sampai;
  if (alasan && !setoranNominalManual) { const nomEl = kasEl('setoranNominal'); if (nomEl) nomEl.value = ''; }
  setoranOnRentangChange();
  if (alasan) { const hitung = kasEl('setoranHitungInfo'); if (hitung) hitung.textContent = alasan; }
}
function setoranOnKelasChange() { if (setoranEditingKey) return; setoranNominalManual = false; setoranTerapkanPenerima(true); setoranSetRentangDefault(); }
function setoranOnSemesterChange() {
  const s = kasEl('setoranSemester'); if (s) s.dataset.user = '1';
  setoranResetForm(); setoranRender();
}
function setoranNominalDiketik() { setoranNominalManual = true; setoranUpdateSelisih(); }
function setoranOnRentangChange() {
  const kelas = (kasEl('setoranKelas') || {}).value, dari = (kasEl('setoranDari') || {}).value, sampai = (kasEl('setoranSampai') || {}).value;
  const info = kasEl('setoranHitungInfo'); if (!info) return;
  if (!kelas || !kasAdaTanggal(dari) || !kasAdaTanggal(sampai) || dari > sampai) { info.innerHTML = 'Isi rentang tanggal dengan benar.'; setoranUpdateSelisih(); return; }
  const sem = setoranSemesterDipilih(), r = kasRentangSemester(sem);
  const t = setoranHitungTerkumpul(kelas, dari, sampai);
  const terkumpulSem = setoranHitungTerkumpul(kelas, r.dari, setoranBatasSampai(sem)).total;
  const sudah = setoranTotalDisetor(kelas, sem, setoranEditingKey);
  info.innerHTML = `Infaq lunas tercatat pada rentang ini: <strong>${kasRp(t.total)}</strong> (${t.jumlah} pembayaran).<br>Total semester ${sem} untuk ${escapeHtml(kelas)}: terkumpul ${kasRp(terkumpulSem)} • sudah disetor ${kasRp(sudah)}${setoranEditingKey ? ' (tidak termasuk setoran yang sedang diubah)' : ''} • belum disetor <strong>${kasRp(terkumpulSem - sudah)}</strong>.${t.tanpaTanggal ? `<br><span style="color:#b45309;">⚠️ ${t.tanpaTanggal} pembayaran infaq kelas ini tidak punya tanggal terbaca sehingga tidak terhitung — periksa di menu Infaq Mingguan.</span>` : ''}`;
  const nomEl = kasEl('setoranNominal');
  if (nomEl && !setoranNominalManual) nomEl.value = t.total > 0 ? t.total : '';
  setoranUpdateSelisih();
}
function setoranUpdateSelisih() {
  const box = kasEl('setoranSelisihInfo'); if (!box) return;
  const kelas = (kasEl('setoranKelas') || {}).value, dari = (kasEl('setoranDari') || {}).value, sampai = (kasEl('setoranSampai') || {}).value;
  const nominal = Number((kasEl('setoranNominal') || {}).value);
  if (!kelas || !kasAdaTanggal(dari) || !kasAdaTanggal(sampai) || !nominal) { box.textContent = ''; return; }
  const sel = nominal - setoranHitungTerkumpul(kelas, dari, sampai).total;
  if (sel === 0) { box.style.color = '#059669'; box.textContent = '✅ Pas dengan jumlah terkumpul.'; }
  else { box.style.color = sel < 0 ? '#dc2626' : '#b45309'; box.textContent = `${sel < 0 ? '⚠️ Kurang' : '⚠️ Lebih'} ${kasRp(Math.abs(sel))} dari jumlah terkumpul — isi keterangan alasannya.`; }
}
function setoranEdit(key) {
  const s = allSetoranInfaq.find(x => x.key === key);
  if (!s) return toast('Setoran tidak ditemukan — muat ulang halaman.', true);
  if (!setoranBolehUbah(s)) return toast('🔒 Setoran ini tidak bisa diubah (bukan kelas Anda, atau sudah lewat 24 jam — hubungi Admin).', true);
  const semSel = kasEl('setoranSemester');
  if (semSel && SETORAN_SEMESTER.includes(s.semester)) { semSel.value = s.semester; semSel.dataset.user = '1'; }
  const sk = kasEl('setoranKelas');
  if (sk && Array.from(sk.options).every(o => o.value !== s.kelas)) sk.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s.kelas)}">${escapeHtml(s.kelas)}</option>`);
  setoranEditingKey = key; setoranNominalManual = true;
  const set = (id, v) => { const el = kasEl(id); if (el) el.value = v; };
  set('setoranKelas', s.kelas); if (sk) sk.disabled = true;   // kelas tidak bisa dipindah saat ubah -- hapus & catat ulang kalau salah kelas
  const r = kasRentangSemester(s.semester);
  const dariEl = kasEl('setoranDari'), sampaiEl = kasEl('setoranSampai');
  if (dariEl && sampaiEl) { dariEl.min = sampaiEl.min = r.dari; dariEl.max = sampaiEl.max = r.sampai; }
  set('setoranDari', s.dari || ''); set('setoranSampai', s.sampai || '');
  set('setoranNominal', s.nominalSetor != null ? s.nominalSetor : ''); set('setoranTanggal', s.tanggalSetor || tglLokal());
  set('setoranPenerima', s.penerima || ''); { const pe = kasEl('setoranPenerima'); if (pe) pe.readOnly = setoranPenerimaTerkunci(s.kelas); } set('setoranBukti', s.buktiNo || ''); set('setoranKet', s.keterangan || '');
  const info = kasEl('setoranFormSemesterInfo');
  if (info) info.textContent = `Semester ${s.semester} ${currentTahunAjaran}: ${kasTglIndo(r.dari)} – ${kasTglIndo(r.sampai)}.`;
  const btn = kasEl('btnSimpanSetoran'); if (btn) btn.textContent = '💾 Simpan Perubahan';
  const batal = kasEl('btnBatalSetoran'); if (batal) batal.style.display = '';
  const judul = kasEl('setoranFormTitle'); if (judul) judul.textContent = '✏️ Ubah Setoran Infaq';
  setoranOnRentangChange(); setoranRender();
  const card = kasEl('setoranFormCard'); if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setoranSimpan() {
  const kelas = (kasEl('setoranKelas') || {}).value;
  if (!setoranBolehCatat(kelas)) return toast('Anda hanya bisa mencatat setoran untuk kelas yang ditugaskan Admin ke Anda!', true);
  if (isBusy('setoranSimpan')) return toast('Sedang menyimpan...', false, 1500);
  if (!isReallyOnline()) return toast('📡 Sedang offline. Pencatatan setoran butuh koneksi internet supaya angkanya tidak keliru — coba lagi setelah online.', true);
  const sem = setoranSemesterDipilih(), r = kasRentangSemester(sem), hari = tglLokal();
  const dari = kasEl('setoranDari').value, sampai = kasEl('setoranSampai').value, tanggalSetor = kasEl('setoranTanggal').value;
  const nominal = Number(kasEl('setoranNominal').value);
  let penerima = kasEl('setoranPenerima').value.trim(); const buktiNo = kasEl('setoranBukti').value.trim(), keterangan = kasEl('setoranKet').value.trim();
  // Nama penerima dikunci Admin: setoran BARU selalu memakai penerima yang ditunjuk (setoran lama tetap apa adanya).
  if (!setoranEditingKey && setoranPenerimaTerkunci(kelas)) penerima = setoranPenerimaDari(kelas);
  if (!kelas) return toast('Pilih kelas!', true);
  if (!setoranEditingKey && setoranBatasSetor(sem) < r.dari) return toast(`Belum ada rentang yang bisa disetor untuk semester ${sem} — infaq hari ini baru bisa disetor mulai besok.`, true);
  if (!kasAdaTanggal(dari) || !kasAdaTanggal(sampai) || !kasAdaTanggal(tanggalSetor)) return toast('Isi semua tanggal dengan benar!', true);
  if (dari > sampai) return toast('Tanggal awal rentang tidak boleh setelah tanggal akhir.', true);
  if (dari < r.dari || sampai > r.sampai) return toast(`Rentang harus berada di dalam semester ${sem} (${kasTglIndo(r.dari)} – ${kasTglIndo(r.sampai)}).`, true);
  if (sampai > setoranBatasSetor(sem)) return toast('Akhir rentang paling lambat kemarin — infaq hari ini masih bisa bertambah, jadi disetor di rentang berikutnya.', true);
  if (tanggalSetor > hari) return toast('Tanggal setor tidak boleh di masa depan.', true);
  if (tanggalSetor < sampai) return toast('Tanggal setor tidak boleh lebih awal dari akhir rentang infaq yang disetor.', true);
  if (!Number.isInteger(nominal) || nominal <= 0) return toast('Jumlah disetor harus bilangan bulat lebih dari 0!', true);
  if (nominal > 1000000000) return toast('Jumlah terlalu besar (> Rp 1 miliar) — periksa lagi jumlah nolnya.', true);
  const lama = setoranEditingKey ? allSetoranInfaq.find(x => x.key === setoranEditingKey) : null;
  if (setoranEditingKey && !lama) return toast('Setoran yang diubah sudah tidak ada — muat ulang halaman.', true);
  if (lama && !setoranBolehUbah(lama)) return toast('🔒 Setoran ini sudah tidak bisa diubah (lewat 24 jam) — hubungi Admin.', true);
  const t = setoranHitungTerkumpul(kelas, dari, sampai), selisih = nominal - t.total;
  if (selisih !== 0 && keterangan.length < 3) return toast(`Jumlah disetor berbeda ${kasRp(Math.abs(selisih))} dari yang terkumpul (${kasRp(t.total)}). Isi keterangan alasannya (minimal 3 karakter).`, true);
  // Peringatan hanya kalau IRISAN rentang benar-benar berisi infaq (risiko dihitung dua kali). Rentang yang
  // cuma berimpit di hari tanpa pembayaran tidak memengaruhi angka, jadi tidak perlu mengganggu petugas.
  // Setoran lama tanpa tanggal valid dilewati (tidak bisa dinilai) -- bukan dianggap beririsan.
  const tumpang = allSetoranInfaq
    .filter(x => kasSamaKelas(x.kelas, kelas) && x.semester === sem && x.key !== setoranEditingKey && kasAdaTanggal(x.dari) && kasAdaTanggal(x.sampai) && x.dari <= sampai && x.sampai >= dari)
    .map(x => { const a = x.dari > dari ? x.dari : dari, b = x.sampai < sampai ? x.sampai : sampai; return { x, a, b, uang: setoranHitungTerkumpul(kelas, a, b) }; })
    .filter(o => o.uang.jumlah > 0);
  if (tumpang.length && !confirm(`Rentang ini beririsan dengan setoran ${kelas} yang sudah dicatat, dan di irisannya ada infaq yang bisa terhitung dua kali:\n${tumpang.map(o => '• ' + kasTglIndo(o.x.dari) + ' – ' + kasTglIndo(o.x.sampai) + ' (irisan ' + kasTglIndo(o.a) + ' – ' + kasTglIndo(o.b) + ': ' + kasRp(o.uang.total) + ')').join('\n')}\n\nTetap simpan?`)) return;
  if (t.total === 0 && !confirm(`Tidak ada infaq lunas tercatat untuk ${kelas} pada rentang ini. Tetap catat setoran sebesar ${kasRp(nominal)}?`)) return;
  const data = { kelas, semester: sem, dari, sampai, tanggalSetor, nominalSetor: nominal, nominalTerkumpul: t.total, jumlahBayar: t.jumlah, selisih, penerima: penerima || null, buktiNo: buktiNo || null, keterangan: keterangan || null };
  const btn = kasEl('btnSimpanSetoran');
  setBusy('setoranSimpan', btn);
  const selesai = (err, pesanOk, aksiLog) => {
    clearBusy('setoranSimpan', btn);
    if (err) return toast('Gagal: ' + (err.message || err), true);
    toast(pesanOk); addLog(aksiLog, `${kelas} - ${sem} - ${dari} s.d. ${sampai} - setor ${kasRp(nominal)} (terkumpul ${kasRp(t.total)})`);
    setoranMuat(() => { setoranResetForm(); setoranRender(); });
  };
  if (lama) {
    db.ref('setoran_infaq/' + setoranEditingKey).update(Object.assign({}, data, { updatedBy: currentUser.name, updatedAt: new Date().toISOString() }), err => selesai(err, '✅ Setoran infaq diperbarui!', 'ubah_setoran_infaq'));
  } else {
    db.ref('setoran_infaq').push().set(Object.assign({}, data, { tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputByKey: currentUser.key || null, inputAt: new Date().toISOString(), inputAtMs: Date.now() }), err => selesai(err, '✅ Setoran infaq tercatat!', 'catat_setoran_infaq'));
  }
}
function setoranHapus(key) {
  const s = allSetoranInfaq.find(x => x.key === key);
  if (!s) return toast('Setoran tidak ditemukan — muat ulang halaman.', true);
  if (!setoranBolehUbah(s)) return toast('🔒 Setoran ini tidak bisa dihapus (bukan kelas Anda, atau sudah lewat 24 jam — hubungi Admin).', true);
  if (isBusy('setoranHapus')) return;
  if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
  if (!doubleConfirm(`Hapus setoran infaq ini?\n\n${s.kelas} • ${kasTglIndo(s.dari)} – ${kasTglIndo(s.sampai)}\nDisetor ${kasTglIndo(s.tanggalSetor)}: ${kasRp(s.nominalSetor)}`)) return;
  setBusy('setoranHapus');
  db.ref('setoran_infaq/' + key).remove(err => {
    clearBusy('setoranHapus');
    if (err) return toast('Gagal: ' + (err.message || err), true);
    toast('✅ Setoran infaq dihapus.'); addLog('hapus_setoran_infaq', `${s.kelas} - ${s.semester} - ${s.dari} s.d. ${s.sampai} - ${kasRp(s.nominalSetor)}`);
    if (setoranEditingKey === key) setoranResetForm();
    setoranMuat(() => { setoranRender(); setoranOnRentangChange(); });
  });
}

// ---- Ekspor rekap & riwayat setoran ----
async function setoranExportPDF() {
  if (!setoranCanView()) return toast('Tidak diizinkan!', true);
  const d = setoranDataRekap();
  if (d.rekap.length === 0) return toast('Tidak ada kelas untuk diekspor.', true);
  if (d.belumMulai && d.riwayat.length === 0) return toast(`Semester ${d.sem} belum dimulai dan belum ada setoran.`, true);
  try { await ensureLib('pdf'); } catch (e) { console.error('[SI MAMBA] Gagal memuat modul PDF', e); return toast('❌ Modul PDF belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
  const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'mm', 'a4'); const pw = doc.internal.pageSize.getWidth();
  if (typeof doc.autoTable !== 'function') { console.error('[SI MAMBA] jspdf-autotable tidak tersedia setelah ensureLib("pdf")'); return toast('❌ Modul tabel PDF (autotable) belum termuat. Muat ulang halaman lalu coba lagi.', true); }
  const logoData = await v4LoadLogoForPdf();
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
  doc.setFontSize(14); doc.text('REKAP SETORAN INFAQ PER KELAS', pw / 2, y, { align: 'center' });
  doc.setFontSize(11); doc.text(`Semester ${d.sem} Tahun Ajaran ${currentTahunAjaran} (${kasTglIndo(d.r.dari)} - ${kasTglIndo(d.r.sampai)}) - ${d.labelKelas}`, pw / 2, y + 6, { align: 'center' });
  const gaya = { theme: 'grid', showFoot: 'lastPage', styles: { fontSize: 8.5, cellPadding: 1.8 }, headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' }, footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }, margin: { left: 15, right: 15 } };
  const teksStatus = st => st.teks.replace(/^[^A-Za-z]+/, '');   // buang emoji (font bawaan jsPDF tidak punya glyph emoji)
  doc.autoTable(Object.assign({}, gaya, {
    startY: y + 11,
    head: [['Kelas', 'Petugas', 'Terkumpul', 'Disetor', 'Belum Disetor', 'Status', 'Belum Disetor Sejak', 'Setor Terakhir']],
    body: d.rekap.map(x => [x.kelas, x.petugas || '-', kasRp(x.terkumpul), kasRp(x.disetor), kasRp(x.belum), teksStatus(x.status), setoranTeksSejak(x), x.terakhir ? kasTglIndo(x.terakhir) : '-']),
    foot: [['TOTAL', '', kasRp(d.totT), kasRp(d.totS), kasRp(d.totBelum), '', '', '']],
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
  }));
  if (d.riwayat.length) {
    let y2 = doc.lastAutoTable.finalY + 8;
    if (y2 > 175) { doc.addPage(); y2 = 20; }
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Riwayat Setoran', 15, y2); doc.setFont(undefined, 'normal');
    doc.autoTable(Object.assign({}, gaya, {
      startY: y2 + 3,
      head: [['No', 'Tgl Setor', 'Kelas', 'Rentang Infaq', 'Terkumpul', 'Disetor', 'Selisih', 'Keterangan', 'Dicatat oleh']],
      body: d.riwayat.map((s, i) => [String(i + 1), kasTglIndo(s.tanggalSetor), s.kelas, `${kasTglIndo(s.dari)} - ${kasTglIndo(s.sampai)}`, kasRp(s.nominalTerkumpul), kasRp(s.nominalSetor), kasRp(s.selisih),
        [s.keterangan, s.buktiNo ? 'Bukti: ' + s.buktiNo : '', s.penerima ? 'Diterima: ' + s.penerima : ''].filter(Boolean).join('; ') || '-', s.inputBy || '-']),
      columnStyles: { 0: { cellWidth: 9 }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
    }));
  }
  let ySign = doc.lastAutoTable.finalY + 12;
  if (ySign > 160) { doc.addPage(); ySign = 20; }
  const xKiri = 70, xKanan = pw - 70;
  const pen = setoranPenerimaInfo(d.daftar.length === 1 ? d.daftar[0] : '');   // satu kelas -> penerima kelas itu; semua kelas -> penerima umum
  doc.setFontSize(10);
  doc.text('Dibuat oleh,', xKiri, ySign, { align: 'center' }); doc.text(pen.jabatan, xKiri, ySign + 5, { align: 'center' });
  doc.text('Mengetahui,', xKanan, ySign, { align: 'center' }); doc.text('Kepala Madrasah', xKanan, ySign + 5, { align: 'center' });
  // Tanda tangan QR / gambar (js/ttd-digital.js)
  const metaSetoran = { jenis: 'Rekap Setoran Infaq', ket: `Semester ${d.sem} ${currentTahunAjaran} | ${d.labelKelas}` };
  if (pen.nama) await TTD.tandai(doc, pen.nama === MADRASAH.bendahara ? 'bendahara' : 'umum', xKiri, ySign + 7, { lebar: 32, tinggiMaks: 20, meta: Object.assign({ nama: pen.nama, jabatan: pen.jabatan, nip: pen.nip || '' }, metaSetoran) });
  await TTD.tandai(doc, 'kepala', xKanan, ySign + 7, { lebar: 32, tinggiMaks: 20, hanyaPimpinan: true, meta: Object.assign({ nama: MADRASAH.kepala_sekolah || '', jabatan: 'Kepala Madrasah', nip: MADRASAH.nip_kepala_sekolah || '' }, metaSetoran) });
  const yNama = ySign + 31;
  doc.text(pen.nama || '(............................)', xKiri, yNama, { align: 'center' });
  if (pen.nama && pen.nip) doc.text('NIP. ' + pen.nip, xKiri, yNama + 5, { align: 'center' });
  doc.text(MADRASAH.kepala_sekolah || '', xKanan, yNama, { align: 'center' });
  if (MADRASAH.nip_kepala_sekolah) doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, xKanan, yNama + 5, { align: 'center' });
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 15, doc.internal.pageSize.getHeight() - 8);
  doc.save(`${d.slug}.pdf`); toast('📥 PDF Setoran Infaq berhasil diunduh!');
}
async function setoranExportExcel() {
  if (!setoranCanView()) return toast('Tidak diizinkan!', true);
  const d = setoranDataRekap();
  if (d.rekap.length === 0) return toast('Tidak ada kelas untuk diekspor.', true);
  if (d.belumMulai && d.riwayat.length === 0) return toast(`Semester ${d.sem} belum dimulai dan belum ada setoran.`, true);
  try { await ensureLib('xlsx'); } catch (e) { console.error('[SI MAMBA] Gagal memuat modul Excel', e); return toast('❌ Modul Excel belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true); }
  if (typeof XLSX === 'undefined' || !XLSX.utils) return toast('❌ Modul Excel belum termuat. Muat ulang halaman lalu coba lagi.', true);
  const judul = [[MADRASAH.nama || ''], ['REKAP SETORAN INFAQ PER KELAS'], [`Semester ${d.sem} Tahun Ajaran ${currentTahunAjaran} (${d.r.dari} s.d. ${d.r.sampai}) - ${d.labelKelas}`], []];
  const aoa1 = judul.concat([['Kelas', 'Petugas', 'Terkumpul', 'Jumlah Pembayaran', 'Disetor', 'Jumlah Setoran', 'Belum Disetor', 'Status', 'Belum Disetor Sejak', 'Umur (hari)', 'Terlambat (hari)', 'Nominal Terlambat', 'Setor Terakhir']]);
  d.rekap.forEach(x => { const lihat = x.belum > 0 && x.tg; aoa1.push([x.kelas, x.petugas || '', x.terkumpul, x.jumlahBayar, x.disetor, x.jumlahSetor, x.belum, x.status.teks.replace(/^[^A-Za-z]+/, ''), lihat ? x.tg.tertua : '', lihat ? x.tg.umurHari : '', lihat && x.terlambat ? x.tg.hariTerlambat : '', lihat && x.terlambat ? x.tg.terlambatNominal : '', x.terakhir || '']); });
  aoa1.push(['TOTAL', '', d.totT, '', d.totS, '', d.totBelum, '', '', '', '', '', '']);
  const aoa2 = judul.concat([['No', 'Tanggal Setor', 'Kelas', 'Infaq Dari', 'Infaq Sampai', 'Terkumpul', 'Disetor', 'Selisih', 'Diterima Oleh', 'No. Bukti', 'Keterangan', 'Dicatat Oleh']]);
  d.riwayat.forEach((s, i) => aoa2.push([i + 1, s.tanggalSetor || '', s.kelas, s.dari || '', s.sampai || '', s.nominalTerkumpul, s.nominalSetor, s.selisih, s.penerima || '', s.buktiNo || '', s.keterangan || '', s.inputBy || '']));
  const ws1 = XLSX.utils.aoa_to_sheet(aoa1), ws2 = XLSX.utils.aoa_to_sheet(aoa2);
  ws1['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 18 }, { wch: 11 }, { wch: 15 }, { wch: 16 }, { wch: 14 }];
  ws2['!cols'] = [{ wch: 5 }, { wch: 13 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 34 }, { wch: 18 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws1, 'Rekap'); XLSX.utils.book_append_sheet(wb, ws2, 'Riwayat');
  XLSX.writeFile(wb, `${d.slug}.xlsx`); toast('📥 Excel Setoran Infaq berhasil diunduh!');
}
