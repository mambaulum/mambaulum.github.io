/* ============================================================
   SI MAMBA - js/pkg.js  (v82: Lembar Observasi: badge komponen kini menghitung hanya catatan jenis Observasi (sama dengan bar atas) dan indikator yang belum punya catatan observasi diberi tanda; v81: Ajukan menampilkan konfirmasi bila ada indikator berskor 1-2 yang belum punya bukti (tidak memblokir); v80: hitung angket per jenis dibungkus try/catch (tarikAngket dibatalkan utuh dengan pesan jelas bila ada jenis rusak; peta angket di wawancara melewati jenis rusak), Bagi otomatis: jadwal dilewati bila periode sudah berakhir dan jadwal bentrok diberi tahu; v79: Lembar Observasi: skor usulan juga diambil dari butir Supervisi (Tahap 2) bila indikator tak punya lembar penanda, indikator yang tidak teramati diberi keterangan "dinilai dari dokumen atau wawancara", catatan pengamatan ganda tidak lagi tercetak (hanya yang terbaru) dan simpan pengamatan yang sama dua kali ditolak; v78: kolom Skor Lembar Observasi memakai skor akhir penilai (usulan penanda bertanda * bila belum dinilai), semua 37 indikator pengamatan terisi; logo/logo-lembaga.png diganti versi kecil (20 KB, sebelumnya 831 KB) sehingga kop cetak ringan; v77: tombol Cetak skor sementara (menu Lainnya di daftar guru & bar bawah form penilaian; draft/belum lengkap, tanda air, tanpa QR); v75: cetak Lembar Observasi memuat bukti dulu & mengisi kolom Skor/Catatan dari hasil pengamatan; Kesimpulan observasi kini di Firebase pkg_v4_obskes/{periodeId}/{guruKey} {baik, perbaikan, tindak, diperbarui, diperbaruiOleh} (lihat rules-obskes-pkg.txt); v73/v72: Observasi, kartu Kesimpulan observasi dengan usulan otomatis dari lembar penanda dan tercetak di Lembar Observasi; catatan kejadian di lembar penanda pengamatan kelas terisi otomatis dari penanda yang dicentang (tidak menimpa ketikan sendiri); tombol Isi otomatis pada form Tambah catatan observasi (judul + kerangka catatan dari jadwal, data SI MAMBA, indikator); v71: kolom progres khusus di tab Supervisi, Wawancara, Observasi, Angket, dan tab baru Penilaian Diri (dibaca per bagian, bukan seluruh Kelengkapan); tanda umur data ("data dimuat 25 menit lalu") di Kelengkapan dan tab; tab terakhir diingat per pengguna di perangkat; cadangan JSON per periode di tab Pengaturan; v70: kolom Teman sejawat di Kelengkapan (Ringkasan) diperbarui otomatis: saat tab Ringkasan dibuka, saat sejawat ditunjuk atau dibatalkan, dan saat form Wawancara guru itu dibuka; v69: tab Bukti (Isian Bukti langsung dari menu PKG, daftar guru + kotak cari nama); v68: tab Observasi dan tab Angket langsung dari menu PKG (daftar guru + tombol Buka, pola sama dengan Supervisi/Wawancara; halaman Observasi berisi indikator pengamatan + lembar penanda + catatan fakta, halaman Angket berisi pengelolaan angket online); tanpa perubahan Rules; v66: Kelengkapan PKG: tombol Unduh Excel, tampil kartu per guru di HP, tombol Ingatkan hanya bila ada tujuan nyata + jeda 6 jam, kolom tidak terbaca (Rules) tidak dihitung lengkap; v58-v65: pembaruan lain yang tidak dicatat di header ini; v57: tabel Kelengkapan PKG per guru di tab Ringkasan (Admin/Kepala); tab Supervisi dan Wawancara langsung dari menu PKG; bilah tombol Simpan/Cetak supervisi dan wawancara menempel di bawah layar (sticky); Tahap 1 supervisi punya pilihan cepat + isian otomatis Perangkat dan Waktu/cara pengamatan, nama sejawat tersimpan otomatis setelah Tunjuk; memilih guru di dropdown Tunjuk sejawat tidak lagi dianggap perubahan belum disimpan + nama otomatis mengisi kolom nama narasumber sejawat; v56: wawancara teman sejawat diisi sendiri oleh guru yang ditunjuk, Kepala/wakil tetap diwawancarai; v54: Pengendalian D + catatan sampel terisi dari hasil verifikasi, SK Penetapan: Ditetapkan di dari profil + dasar hukum awal; v53: usulan kalimat Tahap 3 supervisi dari nilai Tahap 2; v52: tombol Ganti Kunci Kepala + tawaran otomatis saat ditolak; v51: simpan draf ditolak -> tulis per bagian + diagnosa bagian yang ditolak; v50: cek panjang catatan sebelum simpan; v49: tombol Ingatkan, salin penilai dari periode lain; v48: penetapan massal Kepala, kotak Langkah berikutnya untuk Admin/Kepala, tombol Unduh Excel; v47: catatan indikator maks. 1000 karakter sesuai Rules; v46: formulir keberatan di halaman + Tarik Kembali pengajuan; v45: menu disederhanakan - guru/penilai tanpa tab, satu tombol utama per baris, kotak Langkah berikutnya; tanpa perubahan Rules)
   Menu "PKG Guru" (Penilaian Kinerja Guru MI) -- mengikuti Juknis PKG Madrasah
   (Kepdirjen Pendis 1843/2021), instrumen Guru Kelas/Mata Pelajaran (Lampiran I).

   WAJIB dimuat SESUDAH: js/data-pkg-mi.js, js/app.js, js/menu-hub.js
   Halaman (#page-pkg) dan item menu dibuat sendiri oleh file ini.

   Dependensi dari app.js (global): db, currentUser, allGuru, toast, escapeHtml,
   doubleConfirm, isAdmin, isKepsek, navigateTo, MADRASAH, currentTahunAjaran,
   addLog, KEPSEK_USER_KEY; fitur kirim angket ke WA wali juga memakai allSiswa, kirimWA, formatNomorWa.

   NODE FIREBASE (semua baru -- WAJIB ditambah di Firebase Rules, lihat catatan):
     pkg_v4_periode/{periodeId}            : {nama, jenis, mulai, selesai, dibuatOleh, dibuatAt}
     pkg_v4_tugas/{periodeId}/{guruKey}    : {penilaiKey, penilaiNama, jadwal}
     pkg_v4_nilai/{periodeId}/{guruKey}    : {skor:{"k_i":0|1|2}, catatan:{"k_i":".."},
                                              status, hasil:{...}, penilaiKey, penilaiNama,
                                              persetujuan:{...}, diperbarui, ...}
     pkg_v4_rtl/{periodeId}/{guruKey}      : (BARU v34) rekomendasi & rencana tindak lanjut {kekuatan, perbaikan, rekomendasi, tindakLanjut, targetWaktu, diperbarui, diperbaruiOleh}; tulis penilai/Kepala/Admin sebelum ditetapkan; lihat rules-rtl-pkg.txt
     pkg_v4_skpen/{penilaiKey}             : (BARU v35) SK penugasan penilai {nomor, tanggal, akhir, diperbarui, diperbaruiOleh}; berlaku 4 tahun; Admin/Kepala menulis; lihat rules-sk-pkg.txt
     pkg_v4_supervisi/{periodeId}/{guruKey}: (BARU v37) supervisi digital {t1:{fokus,perangkat,waktu,tanggal}, k:{"1":{s:0|1|2,c,b:{"1":0|1|2}}}, t3:{refleksi,baik,perbaikan,tindak,tanggal}}; tulis penilai/Kepala/Admin
     pkg_v4_wawancara/{periodeId}/{guruKey}: (BARU v44) wawancara digital 5 narasumber (g4 = teman sejawat, v56) {n:{g0..g4:{nama,tgl}}, j:{"g_k_i":{s:0|1|2,c}}}; hanya penilai/Kepala/Admin (rahasia, guru tidak membaca); lihat rules-wawancara-pkg.txt
     pkg_v4_wsejawat/{periodeId}/{guruDinilai}/{guruSejawat}: (BARU v56) wawancara teman sejawat: penilai/Kepala/Admin menunjuk SATU guru ({tunjuk,oleh,nama}); guru itu mengisi sendiri jawabannya di akunnya ({a:{"k_i":teks}, isi}); rahasia, guru yang dinilai tidak membaca; lihat rules-wawancara-sejawat.txt
     pkg_v4_angket_penerima/{periodeId}/{guruDinilai}/{siswa|ortu}/{token}: (BARU v56) siapa menerima tautan sekali pakai {sk,n,kls,at}; dipakai daftar Sudah/Belum mengisi + pengingat WA; hanya penilai/Kepala/Admin; lihat rules-angket-penerima.txt
     pkg_v4_kendali/{periodeId}            : (BARU v37) pengendalian internal (Juknis III.F.1) {cek, sampel, temuan, tindak}; hanya Admin/Kepala; lihat rules-supervisi-kendali-pkg.txt
     pkg_v4_skset/{periodeId}              : (BARU v35) data SK Kepala Madrasah penetapan hasil PKG {nomor, tanggal, tempat, dasar, ...}
     pkg_v4_bukti/{periodeId}/{guruKey}    : (BARU v7) isian + bukti yang diisi langsung di aplikasi
        item/{k_i}/{pushId}   : {jenis:'dokumen'|'observasi'|'wawancara', judul, tautan, ket, oleh, olehKey, at}
        (item observasi dari lembar penanda memuat tambahan pn:{t:'indeks,penanda,terlihat', n:jumlah, s:usulan skor 0|1|2})
        angket/{k_i}          : {j:'siswa'|'ortu'|'sejawat', pct, n, saran:0|1|2|null}  hasil hitung angket online (js/data-pkg-angket.js)
        diri                  : {j:{G1..G12:'y'|'k'|'t'}, r:{r1..r3}} penilaian diri guru (pembanding angket siswa) + diriAt, diriOleh
        angketBanding/{S9..}  : {pct, n, ind}  butir pembanding observasi; angketN, angketAt, angketOleh
   NODE ANGKET (jawaban dari angket.html): pkg_v4_angket_info/{periodeId}/{guruKey} {nama, aktif, dibuat}; pkg_v4_angket/{periodeId}/{guruKey}/{jenis}/{pushId} {j:{S1:'y'|'k'|'t'|'x'}, kls, at}
   JATAH SEJAWAT (v22): pkg_v4_angket_jatah/{periodeId}/{guruDinilai}/{guruSejawat} = token kupon jenis 'sejawat' milik guru sejawat itu.
        Ditulis penilai/Kepala/Admin; dibaca penilai/Kepala/Admin dan guru sejawat pemilik jatah. Dipakai kartu "Angket sejawat untuk Anda isi".
        siap/{g0..gN}         : true  (centang kesiapan bukti, per kelompok pada daftar bukti)
        otomatis/{k_i}        : {s:'absensi,jurnal', saran:0|1|2|null}   (indikator yang bisa dibuktikan data SI MAMBA)
        sumberOto/{id}        : hasil tarikan per sumber {ok, ringkas, saran, dasar, rincian, angka, alasan, at}
        otoAt, otoOleh, otoDari, otoSampai
   ALUR BUKTI -> PENILAIAN: guru/penilai mengisi bukti (tombol 📂 di Daftar Guru) -> penilai membuka form penilaian ->
        tiap indikator menampilkan bukti yang sudah masuk + USULAN skor dari data SI MAMBA (js/pkg-sumber.js)
        -> penilai klik "Pakai saran" (tidak pernah menimpa skor otomatis tanpa klik) -> catatan fakta terisi
        -> ikut tercetak di Laporan sebagai Lampiran Bukti. Wawancara bersifat rahasia: tidak ditampilkan ke guru.
   Skor disimpan sebagai peta datar "komponen_indikator" (bukan array) agar aman dari
   perilaku Firebase yang membuang elemen kosong pada array. Pemisah HARUS garis bawah:
   Firebase RTDB menolak kunci yang mengandung titik (. $ # [ ] /). Label tampilan
   ("1.1") dibuat terpisah dari kunci data ("1_1").

   ALUR STATUS (Juknis Bab III): belum -> draft -> diajukan (menunggu persetujuan guru)
        -> disetujui | keberatan (kembali ke penilai) -> ditetapkan (Kepala Madrasah)

   HAK AKSES (UI dan Firebase Rules berperan, sejak v16: Rules membuktikan peran lewat sesi_admin / sesi_kepsek / sesi_guru;
     lihat CATATAN-RULES-BERPERAN-v16.md. Cek di sisi klien tetap ada demi tampilan, tetapi bukan satu-satunya penghalang):
     Admin / Kepala Madrasah : kelola periode & penugasan, lihat semua, cetak rekap
     Penilai (guru/Kepala)   : mengisi nilai untuk guru yang ditugaskan padanya
     Guru                    : hanya melihat hasil sendiri, menyetujui / mengajukan keberatan
     Penilai tidak boleh menilai dirinya sendiri; satu penilai maks. 10 guru (Juknis).
============================================================ */
(function () {
  'use strict';
  if (window.__pkgLoaded) return;
  window.__pkgLoaded = true;

  var P = window.PKG_MI;
  if (!P || !P.komponen || typeof P.hitungPKG !== 'function' || typeof P.totalIndikator !== 'function') { console.warn('[PKG] js/data-pkg-mi.js belum dimuat / tidak lengkap.'); return; }

  var N = { obsKes: 'pkg_v4_obskes', rtl: 'pkg_v4_rtl', periode: 'pkg_v4_periode', tugas: 'pkg_v4_tugas', nilai: 'pkg_v4_nilai', bukti: 'pkg_v4_bukti', angket: 'pkg_v4_angket', angketInfo: 'pkg_v4_angket_info', angketKupon: 'pkg_v4_angket_kupon', angketJatah: 'pkg_v4_angket_jatah', skpen: 'pkg_v4_skpen', skset: 'pkg_v4_skset', sv: 'pkg_v4_supervisi', kendali: 'pkg_v4_kendali', ww: 'pkg_v4_wawancara', wsj: 'pkg_v4_wsejawat', penerima: 'pkg_v4_angket_penerima' };
  var MAKS_ITEM = 10;                 // maks. bukti manual per indikator
  var JENIS_ITEM = { dokumen: '📄 Dokumen', observasi: '👁️ Observasi', wawancara: '🎤 Wawancara' };
  var MAKS_GURU_PER_PENILAI = 10;
  var STATUS_LABEL = {
    belum: 'Belum dinilai', draft: 'Sedang dinilai', diajukan: 'Menunggu persetujuan guru',
    disetujui: 'Disetujui guru', keberatan: 'Guru keberatan', ditetapkan: 'Ditetapkan'
  };
  var STATUS_WARNA = {
    belum: '#6b7280', draft: '#b45309', diajukan: '#1d4ed8', disetujui: '#15803d', keberatan: '#b91c1c', ditetapkan: '#166534'
  };

  var S = { periodeList: {}, periodeId: null, tugas: {}, nilai: {}, tab: 'daftar', view: 'list', gk: null, draft: null, memuat: false, reqId: 0, userKey: null, menyimpan: false, bukti: {}, obsKes: {}, obsKesGagal: {}, obsKesMuat: {}, rtl: {}, rtlGagal: {}, rtlMuat: {}, angket: {}, jatah: [], jatahId: 0, otoDari: '', otoSampai: '', skpen: {}, skset: null, skGagal: false, sv: {}, svGagal: {}, svKotor: false, kd: null, kdMuat: false, ww: {}, wwGagal: {}, wwKotor: false, wsj: {}, wsjGagal: {}, tunjuk: [], tunjukId: 0, wsjDraft: {} };

  // ---------- util ----------
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function root() { return $('page-pkg'); }
  function me() { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; }
  function adm() { return typeof isAdmin === 'function' && isAdmin(); }
  function kep() { return typeof isKepsek === 'function' && isKepsek(); }
  function pesan(m, err) { if (typeof toast === 'function') toast(m, !!err); else alert(m); }
  function nowIso() { return new Date().toISOString(); }
  function fmtTgl(s) {
    if (!s) return '-';
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    return isNaN(d) ? esc(s) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }

  function guruAktif() {
    return (typeof allGuru !== 'undefined' ? allGuru : []).filter(function (g) { return g.role === 'guru' || g.role === 'wali_kelas'; })
      .sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
  }
  // Nama asli Kepala dari Pengaturan Madrasah (Profil > Kepala Sekolah). Kosong bila belum diisi.
  function namaKepala() { var M = (typeof MADRASAH !== 'undefined' && MADRASAH) ? MADRASAH : {}; return String(M.kepala_sekolah || '').trim(); }
  // Label jabatan generik (data lama / akun Kepala) -> nama orangnya bila sudah diisi; selain itu apa adanya.
  function tampil(s) { return (s && /^(kepala (madrasah|sekolah)|kepsek)$/i.test(String(s).trim()) && namaKepala()) ? namaKepala() : s; }
  // Nama yang dicatat sebagai pengisi/penilai: untuk Kepala = nama orangnya, bukan jabatan.
  function pengisi(u) { return (kep() && !adm() && namaKepala()) ? namaKepala() : String((u && u.name) || 'Admin'); }
  function namaGuru(key) {
    if (key === 'kepsek' || key === (typeof KEPSEK_USER_KEY !== 'undefined' ? KEPSEK_USER_KEY : '__kepsek__')) return namaKepala() || 'Kepala Madrasah';
    var g = guruAktif().filter(function (x) { return x.key === key; })[0];
    return g ? g.name : key;
  }

  // peta datar -> array per komponen (untuk P.hitungPKG)
  function skorKeArray(skorMap) {
    var o = {};
    P.komponen.forEach(function (k) {
      o[k.no] = k.indikator.map(function (_, i) { var v = skorMap && skorMap[k.no + '_' + (i + 1)]; return (v === 0 || v === 1 || v === 2) ? v : null; });
    });
    return o;
  }
  function hitung(skorMap) { return P.hitungPKG(skorKeArray(skorMap)); }
  function jumlahTerisi(skorMap) { var h = hitung(skorMap), t = 0; h.komponen.forEach(function (c) { t += c.terisi; }); return t; }

  function statusDari(n) {
    if (!n || !n.skor || Object.keys(n.skor).length === 0) return n && n.status && n.status !== 'draft' ? n.status : 'belum';
    return n.status || 'draft';
  }
  function selesai(st) { return st === 'disetujui' || st === 'ditetapkan'; }

  // ---------- hak akses ----------
  function tugasDari(gk) { return S.tugas[gk] || null; }
  function penilaiYa(gk) { var u = me(), t = tugasDari(gk); return !!(u && t && t.penilaiKey === u.key); }
  function bolehMenilai(gk) { var u = me(); if (!u || gk === u.key) return false; return kep() || penilaiYa(gk); }
  function bolehKelola() { return adm() || kep(); }
  function lihatSemua() { return bolehKelola(); }
  function guruTampil() {
    var u = me(), semua = guruAktif();
    if (lihatSemua()) return semua;
    return semua.filter(function (g) { return g.key === u.key || penilaiYa(g.key); });
  }

  // ---------- sesi server (Rules berperan, v16) ----------
  // Rules PKG membuktikan peran lewat sesi_admin / sesi_kepsek / sesi_guru (js/kredensial.js). Sesi HARUS terpasang
  // sebelum membaca atau menulis node pkg_v4_*. Fungsi kred*Siap mengingat hasil 5 menit, jadi murah dipanggil berulang.
  function siapSesi() {
    try {
      if (adm()) return typeof window.kredAdminSiap === 'function' ? window.kredAdminSiap() : Promise.resolve(true);
      if (kep()) return typeof window.kredKepsekSiap === 'function' ? window.kredKepsekSiap() : Promise.reject(new Error('js/kredensial.js (v2) belum dimuat: sesi Kepala Madrasah tidak bisa disiapkan.'));
      return typeof window.kredGuruSiap === 'function' ? window.kredGuruSiap() : Promise.resolve(true);
    } catch (e) { return Promise.reject(e); }
  }

  // ---------- muat data ----------
  function muat(cb) {
    var u = me(); if (!u) return;
    var rid = ++S.reqId;                                   // hanya pemuatan TERBARU yang boleh mengubah state
    var basi = function () { return rid !== S.reqId; };
    S.memuat = true; render();
    siapSesi().then(function () { return db.ref(N.periode).once('value'); }).then(function (s) {
      if (basi()) return null;
      var list = s.val() || {};
      S.periodeList = list;
      if (!S.periodeId || !list[S.periodeId]) {
        var ids = Object.keys(list).sort(function (a, b) { return (list[a].dibuatAt || '').localeCompare(list[b].dibuatAt || ''); });
        S.periodeId = ids.length ? ids[ids.length - 1] : null;
      }
      var pid = S.periodeId;
      if (!pid) { S.tugas = {}; S.nilai = {}; return null; }
      return db.ref(N.tugas + '/' + pid).once('value').then(function (ts) {
        if (basi()) return null;
        var tugas = ts.val() || {};
        // Hak baca per anak: guru biasa hanya membaca nilainya sendiri.
        if (lihatSemua()) {
          return db.ref(N.nilai + '/' + pid).once('value').then(function (ns) {
            if (basi()) return;
            S.tugas = tugas; S.nilai = ns.val() || {};
          });
        }
        var kunci = {}; kunci[u.key] = 1;
        Object.keys(tugas).forEach(function (gk) { if (tugas[gk] && tugas[gk].penilaiKey === u.key) kunci[gk] = 1; });
        var nilai = {};
        return Promise.all(Object.keys(kunci).map(function (gk) {
          return db.ref(N.nilai + '/' + pid + '/' + gk).once('value').then(function (x) { if (x.val()) nilai[gk] = x.val(); }).catch(function () { /* ditolak Rules: abaikan */ });
        })).then(function () {
          if (basi()) return;
          S.tugas = tugas; S.nilai = nilai;
        });
      });
    }).then(function () { if (basi()) return; return muatSk(); })
    .then(function () { if (basi()) return; S.memuat = false; render(); muatJatah(); muatTunjuk(); if (cb) cb(); })
      .catch(function (e) {
        if (basi()) return;
        S.memuat = false; render();
        if (/permission_denied/i.test(String((e && e.message) || e))) tawarGantiKunciKepala();
        pesan('PKG: gagal memuat data (' + ((e && e.message) || e) + '). Pastikan Rules pkg_v4_* sudah dipublikasikan dan sesi login Anda aktif (keluar lalu masuk lagi bila perlu).', true);
      });
  }

  // ---------- gaya ----------
  function suntikGaya() {
    if ($('pkgStyle')) return;
    var st = document.createElement('style'); st.id = 'pkgStyle';
    st.textContent =
      '#page-pkg .pkg-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}' +
      '#page-pkg .pkg-tab{padding:7px 14px;border-radius:999px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:13px;font-weight:600;color:#374151}' +
      '#page-pkg .pkg-tab.on{background:#15803d;border-color:#15803d;color:#fff}' +
      '#page-pkg .pkg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}' +
      '#page-pkg .pkg-stat{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:12px}' +
      '#page-pkg .pkg-stat b{display:block;font-size:22px;color:#15803d}' +
      '#page-pkg .pkg-stat span{font-size:12px;color:#6b7280}' +
      '#page-pkg .pkg-chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;color:#fff}' +
      '#page-pkg .pkg-bar{height:10px;border-radius:6px;background:#e5e7eb;overflow:hidden}' +
      '#page-pkg .pkg-bar i{display:block;height:100%;background:#15803d}' +
      '#page-pkg .pkg-komp{border:1px solid #e5e7eb;border-radius:14px;margin-bottom:10px;background:#fff}' +
      '#page-pkg .pkg-komp>summary{cursor:pointer;padding:11px 14px;font-weight:700;font-size:14px;list-style:none;display:flex;justify-content:space-between;gap:8px;align-items:center}' +
      '#page-pkg .pkg-ind{padding:10px 14px;border-top:1px solid #f3f4f6}' +
      '#page-pkg .pkg-ind p{margin:0 0 6px;font-size:13px}' +
      '#page-pkg .pkg-bukti{font-size:11.5px;color:#6b7280;margin:0 0 8px;padding-left:16px}' +
      '#page-pkg .pkg-opt{display:inline-flex;align-items:center;gap:5px;margin-right:8px;padding:5px 10px;border:1px solid #d1d5db;border-radius:10px;font-size:12.5px;cursor:pointer}' +
      '#page-pkg .pkg-opt input{margin:0}' +
      '#page-pkg .pkg-cat{width:100%;margin-top:6px;font-size:12px}' +
      '#page-pkg .pkg-sticky{position:sticky;bottom:0;background:#fff;border-top:1px solid #e5e7eb;padding:10px 4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;z-index:5}' +
      '#page-pkg table{width:100%}' +
      '@media (max-width:640px){#page-pkg .kl-tabel thead{display:none}#page-pkg .kl-tabel,#page-pkg .kl-tabel tbody,#page-pkg .kl-tabel tr{display:block;width:100%}' +
      '#page-pkg .kl-tabel tr{border:1px solid #e5e7eb;border-radius:12px;margin-bottom:10px;padding:8px 10px;box-sizing:border-box}' +
      '#page-pkg .kl-tabel td{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;border:0;padding:3px 0;white-space:normal!important}' +
      '#page-pkg .kl-tabel td[data-label]::before{content:attr(data-label);color:#6b7280;font-size:11.5px;flex:0 0 36%}' +
      '#page-pkg .kl-tabel td.kl-nama{display:block;padding-bottom:6px;margin-bottom:4px;border-bottom:1px solid #f3f4f6}' +
      '#page-pkg .kl-tabel td.kl-aksi{display:block;margin-top:4px;padding-top:6px;border-top:1px solid #f3f4f6}' +
      '#page-pkg .kl-tabel td.kl-aksi::before{display:block;margin-bottom:2px}' +
      '#page-pkg .kl-tabel .kl-v{text-align:right}}' +
      '#page-pkg .pkg-oto{background:#ecfeff;border:1px solid #a5f3fc;border-radius:10px;padding:8px 10px;margin:0 0 8px;font-size:12.5px}' +
      '#page-pkg .pkg-oto-baris{margin:3px 0}' +
      '#page-pkg .pkg-meta{font-size:11px;color:#6b7280}' +
      '#page-pkg .pkg-ket{font-size:12px;margin:2px 0 0;white-space:pre-wrap}' +
      '#page-pkg .pkg-items{list-style:none;margin:0 0 8px;padding:0}' +
      '#page-pkg .pkg-item{border:1px solid #e5e7eb;border-radius:10px;padding:7px 9px;margin:0 0 6px;font-size:12.5px;background:#fafafa}' +
      '#page-pkg .pkg-jenis{font-size:11px;color:#374151;background:#e5e7eb;border-radius:6px;padding:1px 6px}' +
      '#page-pkg .pkg-bk>summary,#page-pkg .pkg-add>summary{cursor:pointer;font-size:12px;font-weight:600;color:#15803d;margin:0 0 6px}' +
      '#page-pkg .pkg-siap{display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:13px}' +
      '#page-pkg .pkg-siap input{margin-top:3px}' +
      // Mode gelap (body.dark-mode, sama dengan bagian lain aplikasi)
      'body.dark-mode #page-pkg .pkg-tab,body.dark-mode #page-pkg .pkg-stat,body.dark-mode #page-pkg .pkg-komp,body.dark-mode #page-pkg .pkg-sticky{background:#1f2937;border-color:#374151;color:#e5e7eb}' +
      'body.dark-mode #page-pkg .pkg-tab.on{background:#15803d;border-color:#15803d;color:#fff}' +
      'body.dark-mode #page-pkg .pkg-opt{border-color:#4b5563}' +
      'body.dark-mode #page-pkg .pkg-ind{border-top-color:#374151}' +
      'body.dark-mode #page-pkg .pkg-bar{background:#374151}' +
      'body.dark-mode #page-pkg .pkg-stat b{color:#4ade80}' +
      'body.dark-mode #page-pkg .pkg-stat span,body.dark-mode #page-pkg .pkg-bukti,body.dark-mode #page-pkg .pkg-meta{color:#9ca3af}' +
      'body.dark-mode #page-pkg .pkg-oto{background:#083344;border-color:#155e75;color:#e5e7eb}' +
      'body.dark-mode #page-pkg .pkg-item{background:#111827;border-color:#374151}' +
      'body.dark-mode #page-pkg .pkg-jenis{background:#374151;color:#e5e7eb}';
    document.head.appendChild(st);
  }

  // ---------- render ----------
  // Status pengesahan Kepala untuk layar (guru melihat apakah dokumennya sudah berhak QR Kepala).
  var KET_SAH = {
    diajukan: ['#fffbeb', '#92400e', '⏳ Belum final — menunggu persetujuan guru, lalu penetapan Kepala Madrasah. QR Kepala belum terbit.'],
    disetujui: ['#fffbeb', '#92400e', '⏳ Menunggu pengesahan Kepala Madrasah. QR Kepala pada cetakan baru terbit setelah ditetapkan.'],
    keberatan: ['#fef2f2', '#b91c1c', '⚠️ Belum final — keberatan guru sedang ditindaklanjuti. QR Kepala belum terbit.'],
    ditetapkan: ['#ecfdf5', '#047857', '✅ Sudah ditetapkan Kepala Madrasah. Cetakan resmi ber-QR dapat dicetak oleh Admin atau Kepala.']
  };
  function pengesahanHtml(st) {
    var k = KET_SAH[st]; if (!k) return '';
    return '<div style="margin-top:10px;padding:8px 12px;border-radius:10px;background:' + k[0] + ';color:' + k[1] + ';font-size:12.5px">' + k[2] + '</div>';
  }
  function chip(st) { return '<span class="pkg-chip" style="background:' + (STATUS_WARNA[st] || '#6b7280') + '">' + esc(STATUS_LABEL[st] || st) + '</span>'; }
  function predChip(h) {
    var w = { 'Sangat Baik': '#15803d', 'Baik': '#2563eb', 'Cukup': '#b45309', 'Kurang': '#c2410c', 'Buruk': '#b91c1c' }[h.sebutan] || '#6b7280';
    return '<span class="pkg-chip" style="background:' + w + '">' + esc(h.sebutan) + '</span>';
  }

  function render() {
    var r = root(); if (!r) return;
    suntikGaya();
    if (S.view !== 'form' && S.view !== 'bukti' && S.view !== 'observasi') r.removeAttribute('data-v');
    var u = me();
    if (!u) { r.innerHTML = ''; return; }
    if (S.memuat) { r.innerHTML = '<div class="card"><p class="text-muted">Memuat data PKG…</p></div>'; return; }
    if (S.view !== 'list' && S.gk) S.pgSentuh = S.gk;   // v71: sepulang dari form guru, progres di daftar dihitung ulang dari cache
    var h = '<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<div><h3 style="margin:0;font-size:17px">📋 Penilaian Kinerja Guru (PKG)</h3>' +
      '<div class="text-muted" style="font-size:12px">Instrumen Guru Kelas/Mata Pelajaran &bull; Juknis PKG Madrasah (Kepdirjen Pendis 1843/2021)</div></div>' +
      '<div>' + periodeSelectHtml() + '</div></div></div>';
    if (!S.periodeId) {
      h += '<div class="card"><p>Belum ada periode PKG.' + (bolehKelola() ? ' Buat periode baru di bawah ini.' : ' Hubungi Admin / Kepala Madrasah.') + '</p></div>';
      if (bolehKelola()) h += pengaturanHtml();
      r.innerHTML = h; return;
    }
    if (S.view === 'form' || S.view === 'bukti' || S.view === 'observasi') {
      // Render ulang tidak boleh menutup komponen yang sedang dibuka / menggeser layar (mis. sesudah "Pakai saran" atau tambah bukti).
      var terbuka = [], sy = window.pageYOffset || 0, ada = (r.getAttribute('data-v') === S.view + '|' + S.gk) && r.querySelector('details.pkg-komp');
      r.setAttribute('data-v', S.view + '|' + S.gk);
      if (ada) Array.prototype.forEach.call(r.querySelectorAll('details.pkg-komp'), function (d, i) { if (d.open) terbuka.push(i); });
      r.innerHTML = h + (S.view === 'form' ? formHtml() : (S.view === 'observasi' ? obsForm(S.gk) : buktiViewHtml(S.gk)));
      if (ada) Array.prototype.forEach.call(r.querySelectorAll('details.pkg-komp'), function (d, i) { d.open = terbuka.indexOf(i) >= 0; });
      if (S.view === 'form') recalc();
      if (ada && sy) window.scrollTo(0, sy);
      return;
    }
    if (S.view === 'hasil') { r.innerHTML = h + hasilHtml(S.gk); return; }
    if (S.view === 'perangkat') { r.innerHTML = h + perangkatHtml(S.gk); return; }
    if (S.view === 'supervisi') { r.innerHTML = h + svForm(S.gk); return; }
    if (S.view === 'wawancara') { r.innerHTML = h + wwForm(S.gk); return; }
    if (S.view === 'angket') { r.innerHTML = h + angketForm(S.gk); return; }
    if (S.view === 'diri') { r.innerHTML = h + diriView(S.gk); return; }
    if (S.view === 'wsejawat') { r.innerHTML = h + wsjForm(S.gk); return; }
    if (S.pgSentuh) { pgDariCache(S.pgSentuh); S.pgSentuh = null; }
    if (!tabBoleh(S.tab)) S.tab = 'daftar';   // v71: tab tersimpan yang tak lagi tersedia kembali ke Guru
    h += tabsHtml();
    var tb = S.tab;
    if (PG_DARI_TAB[tb]) pgPastikan(tb);
    if (tb === 'supervisi' || tb === 'wawancara') h += svWwTabHtml(tb);
    else if (tb === 'observasi' || tb === 'angket' || tb === 'bukti' || tb === 'diri') h += obsAngketTabHtml(tb);
    else if (tb === 'pengaturan' && bolehKelola()) h += pengaturanHtml();
    else if (tb === 'analisis') h += analisisHtml();
    else if (tb === 'kendali') h += kendaliHtml();
    else if (tb === 'ringkasan') h += ringkasanHtml();
    else h += jatahKartu() + tunjukKartu() + pengingatJadwalHtml() + langkahHtml() + daftarHtml();
    r.innerHTML = h;
  }

  function periodeSelectHtml() {
    var ids = Object.keys(S.periodeList);
    if (!ids.length) return '';
    return '<select class="field" data-act="ganti-periode" style="min-width:190px">' + ids.sort().map(function (id) {
      return '<option value="' + esc(id) + '"' + (id === S.periodeId ? ' selected' : '') + '>' + esc(S.periodeList[id].nama || id) + '</option>';
    }).join('') + '</select>';
  }
  // v57: tab Supervisi / Wawancara: daftar guru yang boleh dinilai/dilihat pengguna, tombol Buka langsung ke formulir
  function adaAksesSvWw() { try { return barisGuru().some(function (x) { return bolehPerangkat('observasi', x.g.key); }); } catch (e) { return false; } }
  function svWwTabHtml(jenis) {
    var sv = jenis === 'supervisi', j = sv ? 'sv' : 'ww', rows = pgBaris();
    var jdl = sv ? '🔎 Supervisi Pembelajaran' : '🎤 Wawancara';
    if (!rows.length) return '<div class="card"><p class="text-muted">Tidak ada guru yang bisa Anda isi untuk ' + (sv ? 'supervisi' : 'wawancara') + ' pada periode ini.</p></div>';
    var h = '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 4px">' + jdl + '</h4><p class="text-muted" style="font-size:12px;margin:0 0 8px">Pilih guru lalu tekan <b>Buka</b>. ' + (sv ? 'Isian supervisi' : 'Isian wawancara') + ' tersimpan setelah tombol Simpan ditekan.</p>' +
      pgBarHtml(j, rows) + '<table><thead><tr><th>Guru</th><th>Penilai &bull; Jadwal</th><th>' + PG[j].judul + '</th><th></th></tr></thead><tbody>';
    rows.forEach(function (x) {
      var gk = x.g.key, t = x.t, info = [];
      info.push(t ? esc(tampil(t.penilaiNama) || namaGuru(t.penilaiKey)) : 'belum ditugaskan');
      if (t && t.jadwal) info.push(fmtTgl(t.jadwal));
      h += '<tr><td><b>' + esc(x.g.name) + '</b><div style="font-size:11px">' + chip(x.st) + '</div></td><td class="text-muted" style="font-size:12px">' + info.join(' &bull; ') + '</td>' + pgSel(j, gk) +
        '<td style="white-space:nowrap"><button class="btn btn-success" style="padding:5px 12px;font-size:12px" data-act="' + (sv ? 'supervisi' : 'wawancara') + '" data-gk="' + esc(gk) + '">Buka</button></td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  // v68: tab Observasi dan tab Angket langsung dari menu PKG, pola sama dengan tab Supervisi / Wawancara
  // (daftar guru yang boleh Anda isi + tombol Buka ke halaman khusus). Tanpa perubahan Rules: memakai data bukti dan angket yang sama.
  function obsAngketTabHtml(jenis) {
    var ob = jenis === 'observasi', bk = jenis === 'bukti', dr = jenis === 'diri', j = bk ? null : (ob ? 'ob' : (dr ? 'di' : 'ak'));
    var rows = barisGuru().filter(function (x) { return bolehPerangkat(bk ? 'bukti' : 'observasi', x.g.key); });
    var jdl = ob ? '👁️ Observasi Pembelajaran' : (bk ? '📂 Isian Bukti' : (dr ? '📝 Penilaian Diri' : '📝 Angket Online'));
    if (!rows.length) return '<div class="card"><p class="text-muted">Tidak ada guru yang bisa Anda isi untuk ' + (ob ? 'observasi' : (bk ? 'bukti' : (dr ? 'penilaian diri' : 'angket'))) + ' pada periode ini.</p></div>';
    var ket = ob ? 'Hasil pengamatan kelas dan catatan faktanya tersimpan sebagai bukti observasi pada indikator yang diamati.' : (bk ? 'Bukti otomatis dari SI MAMBA, daftar kesiapan, pra-wawancara, penilaian diri, dan bukti per indikator.' :
      (dr ? 'Lihat penilaian diri guru sebelum supervisi, beserta perbandingannya dengan angket peserta didik. Guru mengisinya sendiri di akunnya.' : 'Buka angket, buat tautan untuk responden, lalu hitung hasilnya ke bukti.'));
    var h = '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 4px">' + jdl + '</h4><p class="text-muted" style="font-size:12px;margin:0 0 8px">Pilih guru lalu tekan <b>Buka</b>. ' + ket + '</p>' +
      (j ? pgBarHtml(j, rows) : '') +
      (rows.length > 5 ? '<input type="search" class="field" data-cari-guru="1" placeholder="🔍 Cari nama guru…" style="max-width:260px;margin:0 0 8px" aria-label="Cari nama guru">' : '') +
      '<table><thead><tr><th>Guru</th><th>Penilai &bull; Jadwal</th><th>' + (j ? PG[j].judul : 'Status') + '</th><th></th></tr></thead><tbody>';
    rows.forEach(function (x) {
      var gk = x.g.key, t = x.t, info = [];
      info.push(t ? esc(tampil(t.penilaiNama) || namaGuru(t.penilaiKey)) : 'belum ditugaskan');
      if (t && t.jadwal) info.push(fmtTgl(t.jadwal));
      h += '<tr data-nama="' + esc(String(x.g.name || '').toLowerCase()) + '"><td><b>' + esc(x.g.name) + '</b>' + (j ? '<div style="font-size:11px">' + chip(x.st) + '</div>' : '') + '</td><td class="text-muted" style="font-size:12px">' + info.join(' &bull; ') + '</td>' + (j ? pgSel(j, gk) : '<td>' + chip(x.st) + '</td>') +
        '<td style="white-space:nowrap"><button class="btn btn-success" style="padding:5px 12px;font-size:12px" data-act="' + (ob ? 'obs-buka' : (bk ? 'bukti' : (dr ? 'diri-buka' : 'angket-buka'))) + '" data-gk="' + esc(gk) + '">Buka</button></td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function bukaObs(gk) {
    if (!bolehPerangkat('observasi', gk)) return pesan('Tidak tersedia untuk Anda.', true);
    S.gk = gk; S.view = 'observasi';
    render();
    muatBukti(gk, function () { if (S.view === 'observasi' && S.gk === gk) render(); });
    if (!(kb(gk) in S.sv)) muatSv(gk, function () { if (S.view === 'observasi' && S.gk === gk) render(); });   // v79: butir Supervisi dipakai untuk usulan skor
  }
  function bukaAngket(gk) {
    if (!bolehPerangkat('observasi', gk)) return pesan('Tidak tersedia untuk Anda.', true);
    S.gk = gk; S.view = 'angket'; S.wa = null;
    render();
    muatBukti(gk, function () { if (S.view === 'angket' && S.gk === gk) render(); });
    muatAngket(gk, function () { if (S.view === 'angket' && S.gk === gk) render(); });
  }
  function adaObs(gk, key) { return daftarItem(gk, key).some(function (it) { return it.jenis === 'observasi'; }); }   // v82: satu aturan untuk bar atas dan badge komponen
  function obsForm(gk) {
    var d = dataBukti(gk), t = tugasDari(gk) || {}, boleh = bolehUbahBukti(gk), pen = adaPenilai(gk), ja = { pada: [], mapel: [], hariTgl: '' };
    try { ja = jadwalAjar(gk) || ja; } catch (e) { }
    var pn = tampil(t.penilaiNama) || (t.penilaiKey ? namaGuru(t.penilaiKey) : 'belum ditugaskan');
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><h4 style="margin:0">👁️ Observasi Pembelajaran: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Penilai: ' + esc(pn) + (t.jadwal ? ' &bull; Jadwal: ' + fmtTgl(t.jadwal) : '') + '. Tulis <b>fakta yang teramati</b> (apa yang dikatakan dan dilakukan guru dan peserta didik), bukan kesimpulan. Tersimpan sebagai bukti observasi pada indikator yang diamati.</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-soft" data-act="cetak-perangkat" data-jenis="observasi" data-gk="' + esc(gk) + '">🖨️ Cetak lembar</button><button class="btn btn-soft" data-act="kembali">← Kembali</button></div></div>';
    if (ja.pada && ja.pada.length) o += '<div class="pkg-meta" style="margin-top:6px">Jadwal mengajar pada hari pengamatan' + (ja.hariTgl ? ' (' + esc(ja.hariTgl) + ')' : '') + ': ' +
      ja.pada.map(function (j) { return esc(j.kelas) + ' &mdash; ' + esc(j.mapel) + (j.jam ? ' (jam ke ' + esc(j.jam) + ')' : ''); }).join('; ') + '</div>';
    o += '</div>';
    if (!d) return o + '<div class="card"><p class="text-muted">Memuat bukti…</p></div>';
    if (!boleh) o += '<div class="card" style="background:#fffbeb"><p style="margin:0;font-size:13px">' + (selesai(statusDari(S.nilai[gk])) ? 'Penilaian sudah final; catatan observasi tidak dapat diubah lagi.' : 'Anda hanya dapat melihat catatan ini.') + '</p></div>';
    var diamati = function (ind) { return ind.b.some(function (b) { return RE_OBS.test(b); }); }, total = 0, terisi = 0;
    P.komponen.forEach(function (k) {
      k.indikator.forEach(function (ind, i) {
        if (!diamati(ind)) return;
        total++;
        if (adaObs(gk, k.no + '_' + (i + 1))) terisi++;
      });
    });
    o += '<div class="card"><div style="display:flex;justify-content:space-between;font-size:13px"><b>Indikator pengamatan yang sudah dicatat</b><span>' + terisi + ' / ' + total + '</span></div>' +
      '<div class="pkg-bar" style="margin-top:6px"><i style="width:' + (total ? terisi / total * 100 : 0) + '%"></i></div>' +
      '<div class="pkg-meta" style="margin-top:6px">Catatan dari tab Supervisi (Tahap 2) ikut terhitung bila sudah dijadikan bukti observasi.</div></div>';
    P.komponen.forEach(function (k) {
      var idx = []; k.indikator.forEach(function (ind, i) { if (diamati(ind)) idx.push(i); });
      if (!idx.length) return;
      var nk = 0; idx.forEach(function (i) { if (adaObs(gk, k.no + '_' + (i + 1))) nk++; });
      o += '<details class="pkg-komp"><summary><span>' + k.no + '. ' + esc(k.nama) + ' <span class="text-muted" style="font-weight:400;font-size:11px">(' + esc(k.kompetensi) + ')</span></span><span class="pkg-chip" style="background:' + (nk === idx.length ? '#15803d' : '#6b7280') + '">' + nk + '/' + idx.length + '</span></summary>';
      idx.forEach(function (i) {
        var ind = k.indikator[i], key = k.no + '_' + (i + 1), items = daftarItem(gk, key);
        o += '<div class="pkg-ind"><p><b>' + k.no + '.' + (i + 1) + '</b> ' + esc(ind.t) + (adaObs(gk, key) ? '' : ' <span class="pkg-meta" style="color:#b45309">&bull; belum ada catatan observasi' + (items.length ? ' (baru ada bukti jenis lain)' : '') + '</span>') + '</p><ul class="pkg-bukti">' +
          ind.b.filter(function (b) { return RE_OBS.test(b); }).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
        if (items.length) o += '<ul class="pkg-items">' + items.map(function (it) { it.key = key; return itemHtml(it, gk); }).join('') + '</ul>';
        if (boleh) {
          o += '<details class="pkg-add"><summary>➕ Tambah catatan observasi</summary><div data-bform="' + esc(key) + '">' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap"><select class="field" data-f="jenis" style="max-width:170px">' + (pen ? ['observasi', 'dokumen'] : ['dokumen']).map(function (j) { return '<option value="' + j + '">' + JENIS_ITEM[j] + '</option>'; }).join('') + '</select>' +
            '<input class="field" data-f="judul" maxlength="120" placeholder="Judul / ringkasan pengamatan (wajib)" style="flex:1;min-width:180px"></div>' +
            '<input class="field" data-f="tautan" placeholder="Tautan foto atau dokumen (opsional)" style="margin-top:6px">' +
            '<textarea class="field" data-f="ket" rows="2" maxlength="500" placeholder="Catatan fakta yang teramati (opsional)" style="margin-top:6px"></textarea>' +
            '<button type="button" class="btn btn-soft" style="margin-top:6px;margin-right:6px;padding:5px 14px;font-size:12.5px" data-act="obs-isi" data-key="' + esc(key) + '" title="Mengisi judul dan kerangka catatan dari jadwal mengajar, data SI MAMBA, dan indikator. Kolom yang sudah terisi tidak ditimpa.">✨ Isi otomatis</button>' +
            '<button type="button" class="btn btn-success" style="margin-top:6px;padding:5px 14px;font-size:12.5px" data-act="bukti-tambah" data-key="' + esc(key) + '">💾 Simpan catatan</button></div></details>';
          if (pen) o += penandaHtml(key);
        }
        o += '</div>';
      });
      o += '</details>';
    });
    if (!(kb(gk) in S.obsKes) && !S.obsKesMuat[kb(gk)]) { S.obsKesMuat[kb(gk)] = 1; muatObsKes(gk, function () { if (S.view === 'observasi' && S.gk === gk) render(); }); }
    if (boleh) {   // v73: kesimpulan observasi (usulan otomatis dari hasil lembar penanda; tersimpan di perangkat ini dan ikut tercetak di Lembar Observasi)
      var kes = obsKesAmbil(gk);
      o += '<div class="card"><h4 style="margin:0 0 4px">Kesimpulan observasi</h4><div class="pkg-meta" style="margin-bottom:6px">Usulan disusun dari hasil lembar penanda (terpenuhi seluruhnya, sebagian, atau belum ada bukti). Periksa dan sesuaikan bersama guru. Tekan Simpan kesimpulan agar tersimpan di server dan tercetak pada Lembar Observasi dari perangkat atau akun mana pun.' + (S.obsKesGagal[kb(gk)] ? ' <b style="color:#b91c1c">Data tersimpan tidak terbaca: pastikan Firebase Rules pkg_v4_obskes sudah dipasang.</b>' : '') + '</div>' +
        OBS_KES.map(function (x) { return '<label style="display:block;font-size:12.5px;font-weight:600;margin-top:8px">' + x[1] + '</label><textarea class="field" id="pkgObsK_' + x[0] + '" rows="3" maxlength="' + OBS_KES_MAKS + '" style="width:100%">' + esc(kes[x[0]] || '') + '</textarea>'; }).join('') +
        '<button type="button" class="btn btn-soft" style="margin-top:8px" data-act="obs-kes-isi" data-gk="' + esc(gk) + '" title="Mengisi kolom yang masih kosong dari hasil lembar penanda. Kolom yang sudah terisi tidak ditimpa.">✨ Isi usulan kesimpulan</button> <button type="button" class="btn btn-success" style="margin-top:8px" data-act="obs-kes-simpan" data-gk="' + esc(gk) + '">💾 Simpan kesimpulan</button></div>';
    }
    return o;
  }
  function angketForm(gk) {
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><h4 style="margin:0">📝 Angket Online: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Buka angket, bagikan tautan ke peserta didik, orang tua/komite, atau sejawat, lalu hitung hasilnya ke bukti. Jawaban hanya tampil sebagai rekap, tidak per orang.</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      (bolehPerangkat('angkethasil', gk) ? '<button class="btn btn-soft" data-act="cetak-perangkat" data-jenis="angkethasil" data-gk="' + esc(gk) + '">🖨️ Rekap hasil</button>' : '') +
      (bolehPerangkat('angketkertas', gk) ? '<button class="btn btn-soft" data-act="cetak-perangkat" data-jenis="angketkertas" data-gk="' + esc(gk) + '">🖨️ Angket kertas</button>' : '') +
      '<button class="btn btn-soft" data-act="kembali">← Kembali</button></div></div></div>';
    if (!AK()) return o + '<div class="card"><p class="text-muted">Modul <code>js/data-pkg-angket.js</code> belum dimuat, sehingga angket tidak tersedia.</p></div>';
    if (!adaPenilai(gk)) return o + '<div class="card"><p class="text-muted">Angket hanya dikelola penilai guru ini, Kepala Madrasah, atau Admin.</p></div>';
    return o + angketKartu(gk);
  }
  function tabsHtml() {
    var kel = bolehKelola(), ak = adaAksesSvWw();
    if (!kel && !ak) return '';
    var t = [['daftar', '👨‍🏫 Guru']];   // v57: Supervisi dan Wawancara jadi tab sendiri (tanpa masuk Perangkat cetak dulu)
    if (ak) t.push(['bukti', '📂 Bukti'], ['diri', '📝 Penilaian Diri'], ['observasi', '👁️ Observasi'], ['supervisi', '🔎 Supervisi'], ['wawancara', '🎤 Wawancara'], ['angket', '📝 Angket']);
    if (kel) t.push(['ringkasan', '📊 Ringkasan'], ['pengaturan', '⚙️ Pengaturan'], ['analisis', '🧰 Lainnya']);
    var tmb = function (x, on) { return '<button type="button" class="pkg-tab' + (on ? ' on' : '') + '" data-act="tab" data-tab="' + x[0] + '">' + x[1] + '</button>'; };
    var h = '<div class="pkg-tabs">' + t.map(function (x) { return tmb(x, S.tab === x[0] || (x[0] === 'analisis' && S.tab === 'kendali')); }).join('') + '</div>';
    if (kel && (S.tab === 'analisis' || S.tab === 'kendali')) h += '<div class="pkg-tabs">' + [['analisis', '📊 Analisis'], ['kendali', '🧪 Pengendalian']].map(function (x) { return tmb(x, S.tab === x[0]); }).join('') + '</div>';
    return h;
  }

  // ----- Ringkasan -----
  function barisGuru() {
    return guruTampil().map(function (g) {
      var n = S.nilai[g.key], st = statusDari(n), t = tugasDari(g.key);
      var hs = (n && n.skor && Object.keys(n.skor).length && hasilTerlihat(g.key, st)) ? hitung(n.skor) : null;   // guru tidak melihat draft sendiri
      return { g: g, n: n, t: t, st: st, h: hs };
    });
  }
  // Notifikasi dalam aplikasi (best-effort; hasil tulis ditentukan Rules notifications_v4, kegagalan diabaikan).
  function kabari(kunciTujuan, judul, isi) {
    try {
      var u = me(), kp = (typeof KEPSEK_USER_KEY !== 'undefined' ? KEPSEK_USER_KEY : '__kepsek__');
      if (typeof v4Notify !== 'function' || !kunciTujuan || kunciTujuan === 'kepsek' || kunciTujuan === kp || (u && kunciTujuan === u.key)) return;
      var p = v4Notify(judul, isi, 'INFO', kunciTujuan, 'pkg', S.periodeId || '');
      if (p && typeof p.catch === 'function') p.catch(function () { });
    } catch (e) { }
  }
  // Jadwal mengajar guru (allJadwal di app.js) untuk mengisi Lembar Observasi: pada hari jadwal pengamatan bila sudah ditentukan.
  function jadwalAjar(gk) {
    var all = (typeof allJadwal !== 'undefined' && Array.isArray(allJadwal)) ? allJadwal : [];
    var g = guruAktif().filter(function (x) { return x.key === gk; })[0], gn = g ? g.name : '';
    var norm = function (x) { return String(x || '').toLowerCase().replace(/[\s.,]+/g, ''); };
    var milik = all.filter(function (j) { return j && (j.guruKey ? j.guruKey === gk : (!!gn && norm(j.guru) === norm(gn))); });
    var t = tugasDari(gk) || {}, tgl = t.jadwal, nama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], hari = '', hariTgl = '';
    if (tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl)) { var d = new Date(tgl + 'T00:00:00'); if (!isNaN(d)) { hari = nama[d.getDay()]; hariTgl = hari + ', ' + fmtTgl(tgl); } }
    var pada = hari ? milik.filter(function (j) { return j.hari === hari; }).sort(function (a, b) { return (+a.jam || 0) - (+b.jam || 0); }) : [];
    var mapel = {}; milik.forEach(function (j) { if (j.mapel) mapel[j.mapel] = 1; });
    return { hariTgl: hariTgl, pada: pada, mapel: Object.keys(mapel) };
  }
  // Identitas guru untuk cetakan, dari data SI MAMBA: NIP (bila ada di data guru), jabatan, mata pelajaran (dari Jadwal), kelas.
  // Data guru di aplikasi belum punya NIP/mapel sendiri, jadi NIP bertitik-titik untuk diisi tangan bila kosong.
  function identitasBaris(gk) {
    var g = guruAktif().filter(function (x) { return x.key === gk; })[0] || {};
    var nip = String(g.nip || '').trim();
    var kls = Array.isArray(g.kelas) ? g.kelas.filter(Boolean) : (g.kelas ? [String(g.kelas)] : []);
    var jab = g.waliKelasOf ? 'Guru / Wali Kelas ' + g.waliKelasOf : (g.role === 'wali_kelas' ? 'Guru / Wali Kelas' : 'Guru');
    var mp = jadwalAjar(gk).mapel;
    return '<tr><td>NIP</td><td>' + (nip ? esc(nip) : '................................') + '</td></tr>' +
      '<tr><td>Jabatan</td><td>' + esc(jab) + '</td></tr>' +
      '<tr><td>Mata pelajaran</td><td>' + (mp.length ? mp.map(esc).join(', ') : '-') + '</td></tr>' +
      '<tr><td>Kelas diampu</td><td>' + (g.semuaKelas ? 'Semua kelas' : (kls.length ? kls.map(esc).join(', ') : '-')) + '</td></tr>';
  }
  // Pengingat di layar: jadwal pengamatan hari ini / besok milik guru yang login (dinilai) atau yang ia nilai.
  function pengingatJadwalHtml() {
    var u = me(); if (!u) return '';
    var fi = function (d) { var m = d.getMonth() + 1, t = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (t < 10 ? '0' : '') + t; };
    var sk = new Date(), h0 = fi(sk), h1 = fi(new Date(sk.getTime() + 86400000)), baris = [];
    Object.keys(S.tugas || {}).forEach(function (gk) {
      var t = S.tugas[gk]; if (!t || (t.jadwal !== h0 && t.jadwal !== h1)) return;
      var st = statusDari(S.nilai[gk]); if (st === 'diajukan' || selesai(st)) return;
      var saya = u.key && gk === u.key;
      if (!saya && !bolehMenilai(gk)) return;
      baris.push((t.jadwal === h0 ? 'Hari ini' : 'Besok') + ': pengamatan pembelajaran ' + (saya ? 'Anda' : esc(namaGuru(gk))));
    });
    if (!baris.length) return '';
    return '<div class="card" style="background:#fffbeb;border:1px solid #fde68a"><b>🔔 Pengingat jadwal pengamatan</b><ul style="margin:6px 0 0 18px;font-size:13px">' + baris.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul></div>';
  }
  // ----- v57: tabel Kelengkapan PKG per guru (Admin/Kepala) di tab Ringkasan -----
  // Dibaca langsung dari server saat tombol ditekan (tidak mengubah cache form). Kolom: bukti, penilaian diri, angket, supervisi, wawancara, teman sejawat.
  function klBaca(ref) { return db.ref(ref).once('value').then(function (x) { return { ok: true, v: x.val() }; }, function () { return { ok: false, v: null }; }); }
  function klHitung(gk, rb, rs, rw, rj, ra) {
    var kunci = kb(gk), o = {};
    if (rb.ok) {   // bukti (memakai pembaca bukti yang sama dengan form; cache dipinjam sebentar lalu dikembalikan)
      var lama = S.bukti[kunci], ada = Object.prototype.hasOwnProperty.call(S.bukti, kunci);
      S.bukti[kunci] = rb.v || {};
      try { var ib = indikatorBerbukti(gk); o.bukti = { n: ib.n, t: ib.total }; } catch (e) { }
      if (ada) S.bukti[kunci] = lama; else delete S.bukti[kunci];
      var D = DR(), jd = (rb.v && rb.v.diri && rb.v.diri.j) || {};
      if (D) o.diri = { n: D.diri.butir.filter(function (x) { return jd[x.k]; }).length, t: D.diri.butir.length };
    }
    if (rs.ok) {
      var v = rs.v || {}, k = v.k || {}, t1 = v.t1 || {}, t3 = v.t3 || {};
      var isi = function (m) { return Object.keys(m).some(function (q) { return q !== 'tanggal' && m[q]; }); };
      o.sv = { n: P.komponen.filter(function (km) { var x = k[String(km.no)]; return x && x.s != null; }).length, t: P.komponen.length, t1: isi(t1), t3: isi(t3) };
    }
    if (rw.ok) {
      var jw = (rw.v && rw.v.j) || {}, bt = wwButir();
      o.ww = { n: bt.filter(function (b) { return jw[b.key] && jw[b.key].s != null; }).length, t: bt.length };
    }
    if (rj.ok) {
      var m = rj.v || {}, ks = Object.keys(m).filter(function (q) { return m[q] && m[q].tunjuk; });
      o.sj = ks.length ? { key: ks[0], nama: m[ks[0]].nama || namaGuru(ks[0]), isi: !!m[ks[0]].isi } : null;
      o.sjOk = true;
    }
    if (ra.ok) {
      var rr = ra.v || {}, A = AK(); o.ak = {};
      ['siswa', 'ortu', 'sejawat'].forEach(function (j) {
        var mm = rr[j] || {}, arr = Object.keys(mm).map(function (id) { return mm[id]; }).filter(function (z) { return z && typeof z === 'object'; }), mn = 0;
        try { var h = (A && arr.length) ? A.hitung(j, arr) : null; mn = (h && h.min) || 0; } catch (e) { }
        o.ak[j] = { n: arr.length, min: mn };
      });
    }
    return o;
  }
  // status tiap kolom: ok | sb (sebagian) | ko (kosong) | ? (tidak terbaca)
  function klStatus(gk, o) {
    var st = {}, t = tugasDari(gk) || {};
    var an = function (x) { return !x ? '?' : (x.t && x.n >= x.t ? 'ok' : (x.n > 0 ? 'sb' : 'ko')); };
    st.bukti = an(o.bukti); st.diri = o.diri ? an(o.diri) : '?';
    st.sv = !o.sv ? '?' : ((o.sv.n >= o.sv.t && o.sv.t3) ? 'ok' : ((o.sv.n || o.sv.t1 || o.sv.t3) ? 'sb' : 'ko'));
    st.ww = an(o.ww);
    st.sj = !o.sjOk ? '?' : (!o.sj ? 'ko' : (o.sj.isi ? 'ok' : 'sb'));
    if (!o.ak) st.ak = '?';
    else {
      var a = o.ak, cukup = function (j) { return a[j].n > 0 && a[j].n >= (a[j].min || 0); };
      st.ak = (cukup('siswa') && cukup('ortu')) ? 'ok' : ((a.siswa.n + a.ortu.n + a.sejawat.n) > 0 ? 'sb' : 'ko');
    }
    var kurang = [], tak = [], nm = { bukti: 'Bukti', diri: 'Penilaian diri', ak: 'Angket', sv: 'Supervisi', ww: 'Wawancara', sj: 'Teman sejawat' };
    ['bukti', 'diri', 'ak', 'sv', 'ww', 'sj'].forEach(function (c) { if (st[c] === 'sb' || st[c] === 'ko') kurang.push(nm[c]); else if (st[c] === '?') tak.push(nm[c]); });
    if (!t.penilaiKey) kurang.unshift('Penilai belum ditugaskan');
    return { st: st, kurang: kurang, tak: tak };
  }
  function klSel(st, utama, sub, label) {
    var w = { ok: '#15803d', sb: '#b45309', ko: '#b91c1c', '?': '#6b7280' }[st], ik = { ok: '✔', sb: '◐', ko: '✖', '?': '?' }[st];
    return '<td data-label="' + (label || '') + '" style="font-size:12px;white-space:nowrap"><span class="kl-v"><b style="color:' + w + '">' + ik + ' ' + utama + '</b>' + (sub ? '<div class="text-muted" style="font-size:10.5px">' + sub + '</div>' : '') + '</span></td>';
  }
  function klHtml() {
    if (!bolehKelola()) return '';
    var kl = (S.kl && S.kl.pid === S.periodeId) ? S.kl : null, ms = S.klMuat;
    var h = '<div class="card" style="overflow-x:auto"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><h4 style="margin:0">📋 Kelengkapan PKG per guru</h4>' +
      '<div class="text-muted" style="font-size:12px">Bukti, penilaian diri, angket, supervisi, wawancara, dan teman sejawat. Data dibaca dari server saat tombol ditekan.</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' + (kl ? '<button type="button" class="btn btn-soft" data-act="kl-xls">📥 Unduh Excel</button><button type="button" class="btn btn-soft" data-act="kl-pdf">📄 Unduh PDF</button><button type="button" class="btn btn-soft" data-act="kl-filter">' + (S.klKurang ? 'Tampilkan semua guru' : 'Hanya yang kurang') + '</button>' : '') +
      '<button type="button" class="btn btn-success" data-act="kl-muat">' + (kl ? '↻ Muat ulang' : 'Muat kelengkapan') + '</button></div></div>';
    if (ms) h += '<p class="text-muted" style="font-size:12px;margin:8px 0 0">Memuat… ' + ms.n + ' dari ' + ms.t + ' guru</p>';
    if (!kl) return h + (ms ? '' : '<p class="text-muted" style="font-size:12px;margin:8px 0 0">Tekan <b>Muat kelengkapan</b> untuk melihat kondisi tiap guru.</p>') + '</div>';
    var rows = barisGuru().filter(function (x) { return kl.d[x.g.key]; }), tab = '', lengkap = 0;
    rows.forEach(function (x) {
      var gk = x.g.key, o = kl.d[gk], r = klStatus(gk, o), st = r.st, a = o.ak || {};
      var beres = !r.kurang.length && !r.tak.length;   // kolom '?' (tidak terbaca) bukan berarti lengkap
      if (beres) lengkap++;
      if (S.klKurang && beres) return;
      var ak = o.ak ? 'S ' + a.siswa.n + ' &bull; O ' + a.ortu.n + (a.sejawat.n ? ' &bull; Sj ' + a.sejawat.n : '') : '';
      tab += '<tr' + (!beres ? '' : ' style="background:rgba(21,128,61,.06)"') + '><td class="kl-nama"><b>' + esc(x.g.name) + '</b><div style="font-size:11px">' + chip(x.st) + '</div></td>' +
        klSel(st.bukti, o.bukti ? o.bukti.n + '/' + o.bukti.t : 'tdk terbaca', '', 'Bukti') +
        klSel(st.diri, o.diri ? o.diri.n + '/' + o.diri.t : 'tdk terbaca', '', 'Penilaian diri') +
        klSel(st.ak, o.ak ? (st.ak === 'ok' ? 'cukup' : (st.ak === 'ko' ? 'kosong' : 'kurang')) : 'tdk terbaca', ak, 'Angket') +
        klSel(st.sv, o.sv ? o.sv.n + '/' + o.sv.t + ' komp.' : 'tdk terbaca', o.sv ? 'T1 ' + (o.sv.t1 ? '✔' : '–') + ' &bull; T3 ' + (o.sv.t3 ? '✔' : '–') : '', 'Supervisi') +
        klSel(st.ww, o.ww ? o.ww.n + '/' + o.ww.t + ' butir' : 'tdk terbaca', '', 'Wawancara') +
        klSel(st.sj, !o.sjOk ? 'tdk terbaca' : (!o.sj ? 'belum ditunjuk' : (o.sj.isi ? 'sudah isi' : 'belum isi')), o.sj ? esc(o.sj.nama) : '', 'Teman sejawat') +
        '<td class="kl-aksi" data-label="Perlu dilengkapi" style="font-size:12px">' + (beres ? '<span style="color:#15803d">✔ Lengkap</span>' : esc(r.kurang.join(', ')) + (r.tak.length ? (r.kurang.length ? ' ' : '') + '<span style="color:#6b7280">(tidak terbaca: ' + esc(r.tak.join(', ')) + ')</span>' : '') + (r.kurang.length && klTujuan(gk, o).ada ? ' <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px" data-act="kl-ingat" data-gk="' + esc(gk) + '">🔔 Ingatkan</button>' + (klTerakhir(gk) && Date.now() - klTerakhir(gk) < 24 * 3600 * 1000 ? '<div class="text-muted" style="font-size:10.5px">diingatkan ' + klLalu(Date.now() - klTerakhir(gk)) + '</div>' : '') : '')) + '</td></tr>';
    });
    var jam = kl.at ? kl.at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
    h += '<p style="font-size:12.5px;margin:8px 0 6px"><b>' + lengkap + '</b> dari ' + rows.length + ' guru sudah lengkap' + (jam ? ' <span class="text-muted">(dimuat ' + jam + ')</span>' : '') + (kl.at ? ' ' + umurHtml(kl.at) : '') + (kl.sjAt ? ' <span class="text-muted">(kolom Teman sejawat diperbarui ' + kl.sjAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ')</span>' : '') + '</p>';
    h += '<table class="kl-tabel"><thead><tr><th>Guru</th><th>Bukti</th><th>Penilaian diri</th><th>Angket</th><th>Supervisi</th><th>Wawancara</th><th>Teman sejawat</th><th>Perlu dilengkapi</th></tr></thead><tbody>' + (tab || '<tr><td colspan="8" class="text-muted">Semua guru sudah lengkap.</td></tr>') + '</tbody></table>';
    h += '<div class="text-muted" style="font-size:11px;margin-top:6px">✔ lengkap &bull; ◐ sebagian &bull; ✖ kosong &bull; ? tidak terbaca (periksa Firebase Rules). Angket: S = siswa, O = orang tua, Sj = sejawat; dianggap cukup bila siswa dan orang tua mencapai batas minimal responden. Kolom Bukti menghitung bukti manual dan data otomatis SI MAMBA yang sudah ditarik.</div>';
    return h + '</div>';
  }
  // v70: kolom Teman sejawat di Kelengkapan tidak lagi basi. Penunjukan sejawat kecil dan murah dibaca, jadi diperbarui sendiri
  // tanpa harus Muat ulang seluruh tabel: (1) langsung dari data yang sudah ada saat form Wawancara guru itu dibuka / sejawat ditunjuk / dibatalkan,
  // (2) dibaca ulang dari server untuk semua guru saat tab Ringkasan dibuka.
  function klCatatSj(gk) {
    var kl = S.kl; if (!kl || kl.pid !== S.periodeId || !kl.d || !kl.d[gk]) return;
    var r = wsjRec(gk);
    kl.d[gk].sj = r ? { key: r.key, nama: r.nama, isi: !!r.isi } : null; kl.d[gk].sjOk = true;
  }
  function klSegarSj() {
    var kl = S.kl; if (!kl || kl.pid !== S.periodeId || !bolehKelola() || typeof db === 'undefined' || S.klSj || S.klMuat) return;
    var pid = S.periodeId, antre = Object.keys(kl.d), n = 0; S.klSj = true;
    var kerja = function () {
      var gk = antre.shift(); if (!gk) return Promise.resolve();
      return db.ref(N.wsj + '/' + pid + '/' + gk).once('value').then(function (x) {
        if (pid !== S.periodeId || !S.kl || S.kl.pid !== pid || !S.kl.d[gk]) return;
        var m = x.val() || {}, ks = Object.keys(m).filter(function (q) { return m[q] && m[q].tunjuk; });
        S.kl.d[gk].sj = ks.length ? { key: ks[0], nama: m[ks[0]].nama || namaGuru(ks[0]), isi: !!m[ks[0]].isi } : null; S.kl.d[gk].sjOk = true; n++;
      }, function () { }).then(kerja);   // gagal baca: nilai lama dibiarkan
    };
    siapSesi().then(function () { return Promise.all([kerja(), kerja(), kerja(), kerja()]); }).catch(function () { }).then(function () {
      S.klSj = false;
      if (S.kl && S.kl.pid === pid && n) S.kl.sjAt = new Date();
      if (pid === S.periodeId && S.view === 'list' && S.tab === 'ringkasan') render();
    });
  }
  function klMuat() {
    if (!bolehKelola() || !S.periodeId || typeof db === 'undefined') return;
    if (S.klMuat) return pesan('Masih memuat, tunggu sebentar.', true);
    var pid = S.periodeId, rows = barisGuru(), d = {};
    S.klMuat = { n: 0, t: rows.length }; render();
    var satu = function (x) {
      if (pid !== S.periodeId) return Promise.resolve();
      var gk = x.g.key;
      return Promise.all([klBaca(nodeBukti(gk)), klBaca(nodeSv(gk)), klBaca(nodeWw(gk)), klBaca(nodeWsj(gk)), klBaca(N.angket + '/' + pid + '/' + gk)]).then(function (r) {
        if (pid !== S.periodeId) return;
        d[gk] = klHitung(gk, r[0], r[1], r[2], r[3], r[4]); if (S.klMuat) S.klMuat.n++;
      });
    };
    siapSesi().then(function () {
      var antre = rows.slice(), kerja = function () { var x = antre.shift(); return x ? satu(x).then(kerja) : Promise.resolve(); };
      return Promise.all([kerja(), kerja(), kerja(), kerja()]);
    }).then(function () { if (pid === S.periodeId) S.kl = { pid: pid, d: d, at: new Date() }; })
      .catch(function (e) { try { console.error('[SI MAMBA][PKG] kelengkapan gagal:', e); } catch (x) { } pesan('Gagal memuat kelengkapan: ' + ((e && e.message) || e), true); })
      .then(function () { S.klMuat = null; if (S.view === 'list' && S.tab === 'ringkasan') render(); });
  }
  // Siapa yang benar-benar bisa menerima pengingat (kabari() melewati Kepala dan pengguna yang sedang login).
  function klTujuan(gk, o) {
    var st = klStatus(gk, o).st, t = tugasDari(gk) || {}, nm = namaGuru(gk), tujuan = {}, label = [], u = me();
    var kp = (typeof KEPSEK_USER_KEY !== 'undefined' ? KEPSEK_USER_KEY : '__kepsek__');
    var bisa = function (k) { return !!k && k !== 'kepsek' && k !== kp && !(u && k === u.key); };
    var kurang = function (c) { return st[c] === 'sb' || st[c] === 'ko'; };
    var tambah = function (k, teks, lab) { if (!bisa(k)) return; if (!tujuan[k]) { tujuan[k] = []; label.push(lab); } tujuan[k].push(teks); };
    if (kurang('bukti')) tambah(gk, 'bukti', nm);
    if (kurang('diri')) tambah(gk, 'penilaian diri', nm);
    var pn = t.penilaiKey, pl = tampil(t.penilaiNama) || (pn ? namaGuru(pn) : '');
    if (kurang('ak')) tambah(pn, 'angket', pl);
    if (kurang('sv')) tambah(pn, 'supervisi', pl);
    if (kurang('ww')) tambah(pn, 'wawancara', pl);
    var sj = o.sj && !o.sj.isi && bisa(o.sj.key) ? o.sj : null;
    return { nm: nm, tujuan: tujuan, label: label, sj: sj, ada: Object.keys(tujuan).length > 0 || !!sj };
  }
  // Jeda pengingat per guru per periode (disimpan di perangkat ini) supaya penerima tidak dibanjiri notifikasi ganda.
  var KL_JEDA = 6 * 3600 * 1000;
  function klCatatKey(gk) { return 'pkg_ingat_' + S.periodeId + '_' + gk; }
  function klTerakhir(gk) { try { var v = parseInt(localStorage.getItem(klCatatKey(gk)), 10); return v > 0 ? v : 0; } catch (e) { return 0; } }
  function klCatat(gk) { try { localStorage.setItem(klCatatKey(gk), String(Date.now())); } catch (e) { } }
  function klLalu(ms) { var m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? m + ' menit lalu' : Math.floor(m / 60) + ' jam lalu'; }
  function klIngatkan(gk) {
    var kl = (S.kl && S.kl.pid === S.periodeId) ? S.kl : null, o = kl && kl.d[gk]; if (!o || !bolehKelola()) return;
    var tj = klTujuan(gk, o), nm = tj.nm, tujuan = tj.tujuan, sj = tj.sj;
    if (!tj.ada) return pesan('Tidak ada pihak yang bisa diingatkan (penilai belum ditugaskan, penilai adalah Anda sendiri, atau data belum terbaca).', true);
    var lalu = klTerakhir(gk) ? Date.now() - klTerakhir(gk) : 0;
    var tanya = (lalu > 0 && lalu < KL_JEDA ? 'Pengingat untuk ' + nm + ' sudah dikirim ' + klLalu(lalu) + '. Kirim lagi ke: ' : 'Kirim pengingat PKG ' + nm + ' ke: ') + tj.label.concat(sj ? [sj.nama + ' (teman sejawat)'] : []).join(', ') + '?';
    if (!confirm(tanya)) return;
    Object.keys(tujuan).forEach(function (k) {
      if (k === gk) kabari(k, 'PKG: mohon lengkapi data Anda', 'Mohon lengkapi: ' + tujuan[k].join(', ') + ' di menu PKG Guru.');
      else kabari(k, 'PKG: kelengkapan ' + nm + ' perlu dilengkapi', 'Mohon lengkapi untuk ' + nm + ': ' + tujuan[k].join(', ') + ' di menu PKG Guru.');
    });
    if (sj) kabari(sj.key, 'PKG: Anda diminta mengisi wawancara sejawat', 'Anda ditunjuk sebagai teman sejawat untuk penilaian ' + nm + '. Buka menu PKG Guru untuk mengisinya.');
    klCatat(gk);
    if (typeof addLog === 'function') addLog('PKG pengingat kelengkapan', nm);
    pesan('Pengingat terkirim untuk ' + nm + '.');
    if (S.view === 'list' && S.tab === 'ringkasan') render();
  }
  // Unduh Excel kelengkapan: semua guru pada periode terpilih (tidak mengikuti filter "Hanya yang kurang"). Berkas HTML-tabel .xls: terbuka di Excel, LibreOffice, dan Google Sheets.
  function klExcel() {
    var kl = (S.kl && S.kl.pid === S.periodeId) ? S.kl : null;
    if (!bolehKelola()) return;
    if (!kl) return pesan('Tekan Muat kelengkapan dahulu.', true);
    var per = S.periodeList[S.periodeId] || {}, LAB = { ok: 'Lengkap', sb: 'Sebagian', ko: 'Kosong', '?': 'Tidak terbaca' };
    var T = function (v) { return '<td style="mso-number-format:\'\\@\'">' + esc(v == null ? '' : v) + '</td>'; };   // teks murni (bukan rumus)
    var Nm = function (v) { return '<td>' + (typeof v === 'number' ? v : '') + '</td>'; };
    var head = ['No', 'Guru', 'Status penilaian', 'Penilai', 'Bukti terisi', 'Bukti total', 'Status bukti', 'Penilaian diri terisi', 'Penilaian diri total', 'Status penilaian diri',
      'Angket siswa', 'Angket orang tua', 'Angket sejawat', 'Status angket', 'Supervisi komponen terisi', 'Supervisi komponen total', 'Supervisi Tahap 1', 'Supervisi Tahap 3', 'Status supervisi',
      'Wawancara terisi', 'Wawancara total', 'Status wawancara', 'Teman sejawat', 'Status teman sejawat', 'Kelengkapan', 'Perlu dilengkapi', 'Tidak terbaca'];
    var rows = barisGuru().filter(function (x) { return kl.d[x.g.key]; }), no = 0, out = '';
    rows.forEach(function (x) {
      var gk = x.g.key, o = kl.d[gk], r = klStatus(gk, o), st = r.st, t = tugasDari(gk) || {}, a = o.ak || null, beres = !r.kurang.length && !r.tak.length;
      var pen = t.penilaiKey ? (tampil(t.penilaiNama) || namaGuru(t.penilaiKey)) : '';
      var sjSt = !o.sjOk ? '?' : (!o.sj ? 'ko' : (o.sj.isi ? 'ok' : 'sb'));
      no++;
      out += '<tr>' + Nm(no) + T(x.g.name) + T(STATUS_LABEL[x.st] || x.st) + T(pen) +
        Nm(o.bukti && o.bukti.n) + Nm(o.bukti && o.bukti.t) + T(LAB[st.bukti]) + Nm(o.diri && o.diri.n) + Nm(o.diri && o.diri.t) + T(LAB[st.diri]) +
        Nm(a && a.siswa.n) + Nm(a && a.ortu.n) + Nm(a && a.sejawat.n) + T(LAB[st.ak]) +
        Nm(o.sv && o.sv.n) + Nm(o.sv && o.sv.t) + T(o.sv ? (o.sv.t1 ? 'Ya' : 'Belum') : '') + T(o.sv ? (o.sv.t3 ? 'Ya' : 'Belum') : '') + T(LAB[st.sv]) +
        Nm(o.ww && o.ww.n) + Nm(o.ww && o.ww.t) + T(LAB[st.ww]) + T(o.sj ? o.sj.nama : '') + T(LAB[sjSt]) +
        T(beres ? 'Lengkap' : (r.tak.length && !r.kurang.length ? 'Belum bisa dipastikan' : 'Belum lengkap')) + T(r.kurang.join(', ')) + T(r.tak.join(', ')) + '</tr>';
    });
    var jam = kl.at ? kl.at.toLocaleString('id-ID') : '';
    var html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Kelengkapan PKG</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>' +
      '<table border="1"><tr><td colspan="' + head.length + '" style="font-weight:bold;font-size:14pt">Kelengkapan PKG per guru - ' + esc(per.nama || '') + '</td></tr>' +
      '<tr><td colspan="' + head.length + '">' + esc((typeof MADRASAH !== 'undefined' && MADRASAH.nama) || '') + (jam ? ' | data dimuat ' + esc(jam) : '') + '</td></tr>' +
      '<tr style="font-weight:bold;background:#e5e7eb">' + head.map(function (h) { return '<td>' + esc(h) + '</td>'; }).join('') + '</tr>' + out + '</table></body></html>';
    var slug = String(per.nama || S.periodeId || 'periode').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'periode';
    var nama = 'kelengkapan-pkg-' + slug + '-' + nowIso().slice(0, 10) + '.xls';
    try {
      var blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), url = URL.createObjectURL(blob), el = document.createElement('a');
      el.href = url; el.download = nama; document.body.appendChild(el); el.click(); document.body.removeChild(el);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      if (typeof addLog === 'function') addLog('PKG unduh kelengkapan', (per.nama || '') + ' (' + rows.length + ' guru)');
      pesan('Excel kelengkapan diunduh (' + rows.length + ' guru).');
    } catch (e) { pesan('Gagal membuat berkas Excel: ' + ((e && e.message) || e), true); }
  }

  // ----- v71: umur data, progres per tab, tab terakhir, cadangan per periode -----
  var UMUR_BASI = 10 * 60 * 1000;   // data tabel dianggap lama setelah 10 menit
  function umurTeks(t) {
    var ms = Date.now() - t, basi = ms > UMUR_BASI;
    return (basi ? '⚠ ' : '') + 'data dimuat ' + (ms < 60000 ? 'baru saja' : klLalu(ms)) + (basi ? ', tekan Muat ulang' : '');
  }
  function umurHtml(at) {
    if (!at) return '';
    var t = at instanceof Date ? at.getTime() : +at, basi = Date.now() - t > UMUR_BASI;
    return '<span class="pkg-umur" data-at="' + t + '" style="font-size:12px;' + (basi ? 'color:#b45309;font-weight:600' : 'color:#6b7280') + '">' + umurTeks(t) + '</span>';
  }
  setInterval(function () {   // teks umur diperbarui tiap menit tanpa render ulang
    try {
      Array.prototype.forEach.call(document.querySelectorAll('.pkg-umur[data-at]'), function (e) {
        var t = +e.getAttribute('data-at'), basi = Date.now() - t > UMUR_BASI;
        e.textContent = umurTeks(t); e.style.color = basi ? '#b45309' : '#6b7280'; e.style.fontWeight = basi ? '600' : '';
      });
    } catch (x) { }
  }, 60000);

  var TAB_ISI = ['bukti', 'diri', 'observasi', 'supervisi', 'wawancara', 'angket'], TAB_KELOLA = ['ringkasan', 'pengaturan', 'analisis', 'kendali'];
  function tabBoleh(t) {
    if (t === 'daftar') return true;
    if (TAB_ISI.indexOf(t) >= 0) return bolehKelola() || adaAksesSvWw();
    if (TAB_KELOLA.indexOf(t) >= 0) return bolehKelola();
    return false;
  }
  function tabIngat(u) {
    try { var v = localStorage.getItem('pkg_tab_' + (u && u.key)); return (TAB_ISI.indexOf(v) >= 0 || TAB_KELOLA.indexOf(v) >= 0) ? v : 'daftar'; } catch (e) { return 'daftar'; }
  }
  function tabSimpan(t) { try { var u = me(); if (u && u.key) localStorage.setItem('pkg_tab_' + u.key, String(t)); } catch (e) { } }

  // Progres khusus per tab. Tiap bagian dibaca sendiri (satu node per guru), jadi lebih ringan daripada Muat kelengkapan.
  var PG = {
    sv: { tab: 'supervisi', judul: 'Supervisi', ref: function (gk) { return nodeSv(gk); } },
    ww: { tab: 'wawancara', judul: 'Wawancara', ref: function (gk) { return nodeWw(gk); } },
    ob: { tab: 'observasi', judul: 'Observasi', ref: function (gk) { return nodeBukti(gk) + '/item'; } },
    ak: { tab: 'angket', judul: 'Angket', ref: function (gk) { return N.angket + '/' + S.periodeId + '/' + gk; } },
    di: { tab: 'diri', judul: 'Penilaian diri', ref: function (gk) { return nodeBukti(gk) + '/diri'; } }
  };
  var PG_DARI_TAB = { supervisi: 'sv', wawancara: 'ww', observasi: 'ob', angket: 'ak', diri: 'di' };
  function pgState() {
    if (!S.pg || S.pg.pid !== S.periodeId) S.pg = { pid: S.periodeId, d: { sv: {}, ww: {}, ob: {}, ak: {}, di: {} }, at: {}, muat: {}, coba: {} };
    return S.pg;
  }
  function pgBaris() { return barisGuru().filter(function (x) { return bolehPerangkat('observasi', x.g.key); }); }
  // v = nilai mentah dari server (atau dari cache form); hasil {o, st} dengan st: ok | sb | ko | ?
  function pgHitung(j, gk, v) {
    var F = { ok: false }, o = null, st = '?';
    if (j === 'sv') { o = klHitung(gk, F, { ok: true, v: v }, F, F, F).sv; if (o) st = klStatus(gk, { sv: o }).st.sv; }
    else if (j === 'ww') { o = klHitung(gk, F, F, { ok: true, v: v }, F, F).ww; if (o) st = klStatus(gk, { ww: o }).st.ww; }
    else if (j === 'ak') { o = klHitung(gk, F, F, F, F, { ok: true, v: v }).ak; if (o) st = klStatus(gk, { ak: o }).st.ak; }
    else if (j === 'ob') {
      var kunci = kb(gk), lama = S.bukti[kunci], ada = Object.prototype.hasOwnProperty.call(S.bukti, kunci), n = 0, t = 0;
      S.bukti[kunci] = { item: v || {} };   // cache dipinjam sebentar, seperti klHitung
      try {
        P.komponen.forEach(function (k) {
          k.indikator.forEach(function (ind, i) {
            if (!ind.b.some(function (b) { return RE_OBS.test(b); })) return;
            t++; if (daftarItem(gk, k.no + '_' + (i + 1)).some(function (it) { return it.jenis === 'observasi'; })) n++;
          });
        });
      } finally { if (ada) S.bukti[kunci] = lama; else delete S.bukti[kunci]; }
      o = { n: n, t: t }; st = t && n >= t ? 'ok' : (n > 0 ? 'sb' : 'ko');
    } else if (j === 'di') {
      var D = DR();
      if (D) { var jd = (v && v.j) || {}, nn = D.diri.butir.filter(function (x) { return jd[x.k]; }).length, tt = D.diri.butir.length; o = { n: nn, t: tt }; st = nn >= tt ? 'ok' : (nn > 0 ? 'sb' : 'ko'); }
    }
    return o ? { o: o, st: st } : null;
  }
  // Sesudah penilai membuka / menyimpan isian satu guru, angka di daftar ikut diperbarui dari cache form (tanpa membaca server lagi).
  function pgDariCache(gk) {
    var kunci = kb(gk), st = pgState(), b = S.bukti[kunci], a = S.angket[kunci];
    var set = function (j, r) { st.d[j][gk] = { r: r, t: Date.now() }; };
    try {
      if (S.sv[kunci] && !S.svGagal[kunci]) set('sv', pgHitung('sv', gk, S.sv[kunci]));
      if (S.ww[kunci] && !S.wwGagal[kunci]) set('ww', pgHitung('ww', gk, S.ww[kunci]));
      if (b) { set('ob', pgHitung('ob', gk, b.item || {})); set('di', pgHitung('di', gk, b.diri || {})); }
      if (a && a.mentah && !a.galat) set('ak', pgHitung('ak', gk, a.resp));
    } catch (e) { }
  }
  function pgMuat(j) {
    var def = PG[j], pid = S.periodeId, st = pgState();
    if (!def || !pid || typeof db === 'undefined' || st.muat[j]) return;
    var rows = pgBaris(), t0 = Date.now();
    st.coba[j] = 1; st.muat[j] = { n: 0, t: rows.length };
    var satu = function (x) {
      if (pid !== S.periodeId) return Promise.resolve();
      var gk = x.g.key;
      return klBaca(def.ref(gk)).then(function (r) {
        if (pid !== S.periodeId || S.pg !== st) return;
        var ada = st.d[j][gk];
        if (!(ada && ada.t > t0)) st.d[j][gk] = { r: r.ok ? pgHitung(j, gk, r.v) : null, t: Date.now() };   // jangan menimpa hasil yang lebih baru dari cache form
        if (st.muat[j]) st.muat[j].n++;
      });
    };
    siapSesi().then(function () {
      var antre = rows.slice(), kerja = function () { var x = antre.shift(); return x ? satu(x).then(kerja) : Promise.resolve(); };
      return Promise.all([kerja(), kerja(), kerja(), kerja()]);
    }).then(function () { if (pid === S.periodeId && S.pg === st) st.at[j] = new Date(); })
      .catch(function (e) { try { console.error('[SI MAMBA][PKG] progres ' + j + ' gagal:', e); } catch (x) { } pesan('Gagal memuat progres ' + def.judul.toLowerCase() + ': ' + ((e && e.message) || e), true); })
      .then(function () { st.muat[j] = null; if (pid === S.periodeId && S.view === 'list' && S.tab === def.tab) render(); });
  }
  // Dimuat otomatis sekali saat tab pertama dibuka; berikutnya manual (Muat ulang) atau otomatis bila pindah tab dan datanya sudah lama.
  function pgPastikan(tab, segar) {
    var j = PG_DARI_TAB[tab]; if (!j) return;
    var st = pgState(); if (st.muat[j]) return;
    if (!st.coba[j]) return pgMuat(j);
    if (segar && st.at[j] && Date.now() - st.at[j].getTime() > UMUR_BASI) pgMuat(j);
  }
  function pgBarHtml(j, rows) {
    var st = pgState(), m = st.muat[j], def = PG[j], ok = 0, ada = 0;
    rows.forEach(function (x) { var e = st.d[j][x.g.key]; if (e) { ada++; if (e.r && e.r.st === 'ok') ok++; } });
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 8px;font-size:12.5px">' +
      (m ? '<span class="text-muted">Memuat ' + def.judul.toLowerCase() + '… ' + m.n + ' dari ' + m.t + ' guru</span>' : (ada ? '<span><b>' + ok + '</b> dari ' + rows.length + ' guru sudah lengkap</span>' : '')) +
      (st.at[j] ? umurHtml(st.at[j]) : '') +
      '<button type="button" class="btn btn-soft" style="padding:3px 10px;font-size:12px" data-act="pg-muat" data-jenis="' + j + '"' + (m ? ' disabled' : '') + '>↻ Muat ulang</button></div>';
  }
  function pgSel(j, gk) {
    var st = pgState(), e = st.d[j][gk], lab = PG[j].judul, r = e && e.r;
    if (!e) return '<td data-label="' + lab + '" class="text-muted" style="font-size:12px">' + (st.muat[j] ? 'memuat…' : '–') + '</td>';
    if (!r) return klSel('?', 'tdk terbaca', '', lab);
    var o = r.o;
    if (j === 'sv') return klSel(r.st, o.n + '/' + o.t + ' komp.', 'T1 ' + (o.t1 ? '✔' : '–') + ' &bull; T3 ' + (o.t3 ? '✔' : '–'), lab);
    if (j === 'ww') return klSel(r.st, o.n + '/' + o.t + ' butir', '', lab);
    if (j === 'ob') return klSel(r.st, o.n + '/' + o.t + ' indikator', '', lab);
    if (j === 'di') return klSel(r.st, o.n + '/' + o.t + ' butir', '', lab);
    return klSel(r.st, o.siswa.n + ' siswa, ' + o.ortu.n + ' ortu', o.sejawat.n ? o.sejawat.n + ' sejawat' : '', lab);
  }

  // Tab Penilaian Diri: daftar guru + Buka (hanya baca; guru mengisi sendiri di akunnya).
  function bukaDiri(gk) {
    if (!bolehPerangkat('observasi', gk)) return pesan('Tidak tersedia untuk Anda.', true);
    S.gk = gk; S.view = 'diri'; S.wa = null;
    render();
    muatBukti(gk, function () { if (S.view === 'diri' && S.gk === gk) render(); });
    muatAngket(gk, function () { if (S.view === 'diri' && S.gk === gk) render(); });
  }
  function diriView(gk) {
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><h4 style="margin:0">📝 Penilaian Diri: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Hanya dibaca. Guru mengisi penilaian diri di akunnya sendiri; pembanding dengan angket peserta didik tampil bila angket sudah terisi.</div></div>' +
      '<button class="btn btn-soft" data-act="kembali">← Kembali</button></div></div>';
    return o + (diriKartu(gk) || '<div class="card"><p class="text-muted">Penilaian diri tidak tersedia (modul angket belum dimuat atau Anda tidak berhak melihatnya).</p></div>');
  }

  // Cadangan per periode (JSON): penugasan, nilai, bukti, supervisi, wawancara (+ sejawat), dan JUMLAH angket per jenis. Jawaban angket per orang tidak ikut.
  function unduhBerkas(nama, isi, tipe) {
    var blob = new Blob([isi], { type: tipe }), url = URL.createObjectURL(blob), el = document.createElement('a');
    el.href = url; el.download = nama; document.body.appendChild(el); el.click(); document.body.removeChild(el);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function cadanganKartuHtml() {
    var m = S.cdMuat;
    return '<div class="card"><h4 style="margin:0 0 4px">💾 Cadangan data periode</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Satu berkas JSON berisi penugasan, nilai, bukti, supervisi, wawancara (termasuk sejawat), dan jumlah angket per jenis untuk semua guru pada periode terpilih. Jawaban angket per orang tidak ikut. ' +
      'Simpan sebagai arsip sebelum hasil ditetapkan. Unduh berkala: bila Firebase Rules berubah, data tidak bisa dibaca lagi dari sini.</p>' +
      '<button type="button" class="btn btn-soft" data-act="cd-unduh"' + (m ? ' disabled' : '') + '>📥 Unduh cadangan periode ini (JSON)</button>' +
      (m ? ' <span class="text-muted" style="font-size:12px">Menyiapkan… ' + m.n + ' dari ' + m.t + ' guru</span>' : '') + '</div>';
  }
  function cadanganUnduh() {
    if (!bolehKelola() || !S.periodeId || typeof db === 'undefined') return;
    if (S.cdMuat) return pesan('Cadangan sedang disiapkan, tunggu sebentar.', true);
    var pid = S.periodeId, per = S.periodeList[pid] || {}, rows = barisGuru(), guru = {}, gagal = 0;
    S.cdMuat = { n: 0, t: rows.length }; render();
    var hitungAk = function (v) {
      var r = v || {}, o = {};
      ['siswa', 'ortu', 'sejawat'].forEach(function (j) { var mm = r[j] || {}; o[j] = Object.keys(mm).filter(function (id) { return mm[id] && typeof mm[id] === 'object'; }).length; });
      return o;
    };
    var satu = function (x) {
      if (pid !== S.periodeId) return Promise.resolve();
      var gk = x.g.key;
      return Promise.all([klBaca(nodeBukti(gk)), klBaca(nodeSv(gk)), klBaca(nodeWw(gk)), klBaca(nodeWsj(gk)), klBaca(N.angket + '/' + pid + '/' + gk), klBaca(N.angketInfo + '/' + pid + '/' + gk)]).then(function (r) {
        var terbaca = { bukti: r[0].ok, supervisi: r[1].ok, wawancara: r[2].ok, sejawat: r[3].ok, angket: r[4].ok };
        Object.keys(terbaca).forEach(function (k) { if (!terbaca[k]) gagal++; });
        guru[gk] = { nama: x.g.name, tugas: S.tugas[gk] || null, nilai: S.nilai[gk] || null, bukti: r[0].v, supervisi: r[1].v, wawancara: r[2].v, wawancaraSejawat: r[3].v,
          angket: { info: r[5].ok ? r[5].v : null, jumlah: r[4].ok ? hitungAk(r[4].v) : null }, terbaca: terbaca };
        if (S.cdMuat) S.cdMuat.n++;
      });
    };
    siapSesi().then(function () {
      var antre = rows.slice(), kerja = function () { var x = antre.shift(); return x ? satu(x).then(kerja) : Promise.resolve(); };
      return Promise.all([kerja(), kerja(), kerja(), kerja()]);
    }).then(function () {
      if (pid !== S.periodeId) return;
      var isi = { format: 'simamba-pkg-cadangan', versi: 1, dibuat: nowIso(), madrasah: (typeof MADRASAH !== 'undefined' && MADRASAH.nama) || '', periodeId: pid, periode: per, guru: guru };
      var slug = String(per.nama || pid).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'periode';
      unduhBerkas('cadangan-pkg-' + slug + '-' + nowIso().slice(0, 10) + '.json', JSON.stringify(isi), 'application/json;charset=utf-8');
      if (typeof addLog === 'function') addLog('PKG unduh cadangan', (per.nama || '') + ' (' + rows.length + ' guru)');
      pesan('Cadangan diunduh (' + rows.length + ' guru)' + (gagal ? '. ' + gagal + ' bagian tidak terbaca (periksa Firebase Rules); ditandai di berkas.' : '.'), !!gagal);
    }).catch(function (e) { pesan('Gagal menyiapkan cadangan: ' + ((e && e.message) || e), true); })
      .then(function () { S.cdMuat = null; if (S.view === 'list' && S.tab === 'pengaturan') render(); });
  }
  // v71: PDF kelengkapan lewat jendela cetak (pilih "Simpan sebagai PDF"), lanskap. Semua guru, tidak mengikuti filter "Hanya yang kurang".
  function klPdf() {
    var kl = (S.kl && S.kl.pid === S.periodeId) ? S.kl : null;
    if (!bolehKelola()) return;
    if (!kl) return pesan('Tekan Muat kelengkapan dahulu.', true);
    var per = S.periodeList[S.periodeId] || {}, LAB = { ok: 'Lengkap', sb: 'Sebagian', ko: 'Kosong', '?': 'Tdk terbaca' };
    var rows = barisGuru().filter(function (x) { return kl.d[x.g.key]; }), lengkap = 0, tr = '';
    var sel = function (st, teks) { return '<td style="text-align:center">' + esc(LAB[st]) + (teks ? '<br><span style="font-size:9px">' + teks + '</span>' : '') + '</td>'; };
    rows.forEach(function (x, i) {
      var gk = x.g.key, o = kl.d[gk], r = klStatus(gk, o), st = r.st, a = o.ak;
      var beres = !r.kurang.length && !r.tak.length; if (beres) lengkap++;
      tr += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.g.name) + '</td>' +
        sel(st.bukti, o.bukti ? o.bukti.n + '/' + o.bukti.t : '') + sel(st.diri, o.diri ? o.diri.n + '/' + o.diri.t : '') +
        sel(st.ak, a ? 'S ' + a.siswa.n + ', O ' + a.ortu.n + (a.sejawat.n ? ', Sj ' + a.sejawat.n : '') : '') +
        sel(st.sv, o.sv ? o.sv.n + '/' + o.sv.t + ' komp.' : '') + sel(st.ww, o.ww ? o.ww.n + '/' + o.ww.t + ' butir' : '') +
        sel(st.sj, o.sj ? esc(o.sj.nama) : '') +
        '<td>' + (beres ? 'Lengkap' : esc(r.kurang.join(', ')) + (r.tak.length ? ' (tdk terbaca: ' + esc(r.tak.join(', ')) + ')' : '')) + '</td></tr>';
    });
    var jam = kl.at ? kl.at.toLocaleString('id-ID') : '';
    var o2 = '<style>@page{size:A4 landscape;margin:12mm}</style><h3>KELENGKAPAN PKG PER GURU<br>' + esc(per.nama || '') + '</h3>' +
      '<p style="font-size:11px">' + lengkap + ' dari ' + rows.length + ' guru sudah lengkap' + (jam ? ' &bull; data dimuat ' + esc(jam) : '') + '</p>' +
      '<table><thead><tr><th>No</th><th>Guru</th><th>Bukti</th><th>Penilaian diri</th><th>Angket</th><th>Supervisi</th><th>Wawancara</th><th>Teman sejawat</th><th>Perlu dilengkapi</th></tr></thead><tbody>' + tr + '</tbody></table>' +
      '<p style="font-size:10px">Angket: S = siswa, O = orang tua, Sj = sejawat; cukup bila siswa dan orang tua mencapai batas minimal responden.</p>';
    if (typeof addLog === 'function') addLog('PKG cetak kelengkapan PDF', (per.nama || '') + ' (' + rows.length + ' guru)');
    bukaCetak('Kelengkapan PKG', o2);
  }
  function ringkasanHtml() { return pengingatJadwalHtml() + klHtml() + ringkasanIsiHtml(); }
  function ringkasanIsiHtml() {
    var rows = barisGuru(), lengkap = rows.filter(function (x) { return x.h && x.h.lengkap; });
    var cnt = { belum: 0, proses: 0, selesai: 0 }, dist = { 'Sangat Baik': 0, 'Baik': 0, 'Cukup': 0, 'Kurang': 0, 'Buruk': 0 }, rata = 0;
    rows.forEach(function (x) {
      if (selesai(x.st)) cnt.selesai++; else if (x.st === 'belum') cnt.belum++; else cnt.proses++;
      if (x.h && x.h.lengkap) { dist[x.h.sebutan]++; rata += x.h.nilai100; }
    });
    var h = '<div class="pkg-grid">' +
      stat(rows.length, 'Jumlah guru') + stat(cnt.belum, 'PKG belum dilaksanakan') + stat(cnt.proses, 'Sedang dinilai / menunggu guru') + stat(cnt.selesai, 'Sudah selesai') +
      stat(lengkap.length ? f1(rata / lengkap.length) : '-', 'Nilai rata-rata') + '</div>';
    h += '<div class="card"><h4 style="margin:0 0 8px">Distribusi predikat</h4>' + ['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Buruk'].map(function (p) {
      var pct = lengkap.length ? dist[p] / lengkap.length * 100 : 0;
      return '<div style="display:flex;gap:8px;align-items:center;margin:5px 0;font-size:13px"><span style="width:90px">' + p + '</span><div class="pkg-bar" style="flex:1"><i style="width:' + pct + '%"></i></div><b style="width:28px;text-align:right">' + dist[p] + '</b></div>';
    }).join('') + '<div class="text-muted" style="font-size:11px;margin-top:6px">Hanya guru dengan penilaian lengkap (semua indikator terisi) yang dihitung.</div></div>';
    // rata-rata nilai komponen (1-4)
    if (lengkap.length) {
      h += '<div class="card"><h4 style="margin:0 0 8px">Rata-rata nilai per komponen (skala 1–4)</h4>' + P.komponen.map(function (k, idx) {
        var s = 0; lengkap.forEach(function (x) { s += x.h.komponen[idx].nilai; });
        var avg = s / lengkap.length;
        return '<div style="display:flex;gap:8px;align-items:center;margin:5px 0;font-size:12px"><span style="flex:0 0 46%">' + k.no + '. ' + esc(k.nama) + '</span><div class="pkg-bar" style="flex:1"><i style="width:' + (avg / 4 * 100) + '%"></i></div><b style="width:32px;text-align:right">' + f1(avg) + '</b></div>';
      }).join('') + '</div>';
    }
    return h;
  }
  function stat(v, l) { return '<div class="pkg-stat"><b>' + esc(String(v)) + '</b><span>' + esc(String(l)) + '</span></div>'; }
  // Guru yang dinilai baru boleh melihat/mencetak hasilnya setelah diajukan penilai (bukan saat masih draft).
  function hasilTerlihat(gk, st) {
    var u = me();
    if (u && gk === u.key) return st !== 'belum' && st !== 'draft';
    return true;
  }

  // Kemajuan penilaian untuk guru yang dinilai SEBELUM diajukan: hanya JUMLAH indikator yang sudah diisi penilai,
  // tidak pernah skor/predikat. Murni tampilan (tanpa Rules baru). Mode: 'angka' | 'bar' | 'keduanya'.
  var PROGRES_GURU_MODE = 'keduanya';
  function progresGuruHtml(x, boleh) {
    var u = me();
    if (!u || x.g.key !== u.key || boleh || !x.n || !x.n.skor) return null;
    var t = P.totalIndikator(), j = jumlahTerisi(x.n.skor);
    if (!j) return null;
    var teks = '<span class="text-muted">Penilai sedang menilai: ' + j + '/' + t + ' indikator</span>';
    var bar = '<div class="pkg-bar" style="margin-top:4px;min-width:90px"><i style="width:' + Math.round(j / t * 100) + '%"></i></div>';
    return PROGRES_GURU_MODE === 'bar' ? bar : PROGRES_GURU_MODE === 'keduanya' ? teks + bar : teks;
  }

  // Ringkasan untuk penilai: berapa guru yang ia nilai sudah diajukan/final (tampilan saja).
  function ringkasanPenilaiHtml(rows) {
    var mine = rows.filter(function (x) { return penilaiYa(x.g.key); });
    if (!mine.length || lihatSemua()) return '';
    var sudah = mine.filter(function (x) { return x.st === 'diajukan' || selesai(x.st); }).length, t = P.totalIndikator(), isi = 0;
    mine.forEach(function (x) { isi += (x.n && x.n.skor) ? jumlahTerisi(x.n.skor) : 0; });
    var pct = Math.round(isi / (mine.length * t) * 100);
    return '<div class="card"><b>Progres penilaian Anda:</b> ' + sudah + ' dari ' + mine.length + ' guru sudah diajukan/final &bull; ' + pct + '% indikator terisi' +
      '<div class="pkg-bar" style="margin-top:6px"><i style="width:' + pct + '%"></i></div></div>';
  }

  // ----- Daftar guru (v45: satu tombol utama per baris; sisanya di menu "Lainnya") -----
  // Siapa yang perlu diingatkan untuk baris ini (null bila tidak ada yang menunggu).
  function targetIngat(x) {
    var gk = x.g.key, t = x.t;
    if (x.st === 'diajukan') return { k: gk, j: 'PKG: menunggu persetujuan Anda', i: 'Hasil penilaian kinerja Anda sudah diajukan. Mohon buka menu PKG Guru lalu pilih Setuju atau Keberatan.' };
    if ((x.st === 'belum' || x.st === 'draft' || x.st === 'keberatan') && t && t.penilaiKey) return { k: t.penilaiKey, j: 'PKG: penilaian ' + namaGuru(gk) + ' menunggu Anda', i: (x.st === 'keberatan' ? namaGuru(gk) + ' mengajukan keberatan; mohon direvisi di menu PKG Guru.' : 'Mohon lanjutkan penilaian ' + namaGuru(gk) + ' di menu PKG Guru.') };
    return null;
  }
  function aksiUtama(x, u) {
    var gk = x.g.key, boleh = hasilTerlihat(gk, x.st);
    if (gk === u.key && x.st === 'diajukan') return ['hasil', '✅ Tinjau & Setujui', 'btn-success'];
    if (kep() && x.st === 'disetujui') return ['hasil', '📌 Tinjau & Tetapkan', 'btn-success'];
    if (bolehMenilai(gk) && !selesai(x.st) && x.st !== 'diajukan') return ['nilai', x.st === 'belum' ? '✏️ Nilai' : (x.st === 'keberatan' ? '✏️ Revisi' : '✏️ Lanjut'), 'btn-primary'];
    if (x.h && boleh) return ['hasil', '👁️ Lihat', 'btn-soft'];
    if (gk === u.key) return ['bukti', '📂 Isi Bukti', 'btn-soft'];
    return null;
  }
  function aksiLain(x, u, ut) {
    var gk = x.g.key, boleh = hasilTerlihat(gk, x.st), akses = gk === u.key || bolehMenilai(gk) || lihatSemua(), a = [];
    var tmb = function (act, teks) { return (ut && ut[0] === act) ? '' : '<button class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="' + act + '" data-gk="' + esc(gk) + '">' + teks + '</button>'; };
    if (x.h && boleh) a.push(tmb('hasil', '👁️ Lihat hasil'));
    if (x.h && boleh && akses) a.push(tmb('cetak', '🖨️ Cetak laporan'));
    if (x.h && boleh && akses && !selesai(x.st)) a.push(tmb('cetak-sementara', '🖨️ Cetak skor sementara'));   // v77: draft / belum lengkap / belum final
    if (bolehMenilai(gk) && x.st === 'diajukan') a.push(tmb('tarik', '↩️ Tarik kembali'));
    if (lihatSemua() && targetIngat(x)) a.push(tmb('ingatkan', '🔔 Ingatkan'));
    if (akses) { a.push(tmb('bukti', '📂 Bukti')); a.push(tmb('perangkat', '📋 Perangkat cetak')); }
    return a.join('');
  }
  // Satu kotak "Langkah berikutnya": apa yang perlu dilakukan pengguna ini sekarang.
  function langkahHtml() {
    var u = me(); if (!u) return '';
    var rows = barisGuru(), p = [], nilai = 0, tetap = 0;
    rows.forEach(function (x) {
      var gk = x.g.key;
      if (gk === u.key) {
        if (x.st === 'diajukan') p.push('Hasil penilaian Anda sudah masuk. Tekan <b>Tinjau &amp; Setujui</b>, lalu pilih Setuju atau Keberatan.');
        else if (x.st === 'belum' || x.st === 'draft') p.push('Siapkan bukti Anda lewat tombol <b>Isi Bukti</b>' + (x.t && x.t.jadwal ? ' sebelum pengamatan ' + fmtTgl(x.t.jadwal) : '') + '. Penilai akan menilai sesudahnya.');
        else if (x.st === 'keberatan') p.push('Keberatan Anda sedang ditinjau penilai dan Kepala Madrasah.');
        else if (x.st === 'disetujui') p.push('Anda sudah setuju. Menunggu penetapan Kepala Madrasah.');
        else if (x.st === 'ditetapkan') p.push('PKG Anda sudah ditetapkan. Laporan bisa dicetak lewat <b>Lihat</b>.');
      }
      if (penilaiYa(gk) && !selesai(x.st) && x.st !== 'diajukan') nilai++;
      if (kep() && x.st === 'disetujui') tetap++;
    });
    if (nilai) p.push('Anda perlu menilai <b>' + nilai + '</b> guru. Tekan tombol <b>Nilai</b> / <b>Lanjut</b> pada barisnya.');
    if (tetap) p.push('<b>' + tetap + '</b> hasil menunggu penetapan Anda. Centang lalu tekan <b>Tetapkan yang dipilih</b> di bawah daftar.');
    if (bolehKelola()) {
      var cn = function (f) { return rows.filter(f).length; };
      var tbn = function (tab, teks) { return ' <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:12px" data-act="tab" data-tab="' + tab + '">' + teks + '</button>'; };
      var bp = cn(function (x) { return !x.t; }), bm = cn(function (x) { return x.t && x.st === 'belum'; }), bd = cn(function (x) { return x.st === 'draft'; });
      var bj = cn(function (x) { return x.st === 'diajukan'; }), bk = cn(function (x) { return x.st === 'keberatan'; }), ds = cn(function (x) { return x.st === 'disetujui'; });
      if (bp) p.push('<b>' + bp + '</b> guru belum punya penilai.' + tbn('pengaturan', 'Atur penilai'));
      if (bm) p.push(bm + ' guru belum mulai dinilai.');
      if (bd) p.push(bd + ' guru sedang dinilai (draft).');
      if (bj) p.push(bj + ' hasil menunggu persetujuan guru.');
      if (bk) p.push('<b>' + bk + '</b> guru mengajukan keberatan; penilai perlu merevisi.');
      if (ds && !kep()) p.push(ds + ' hasil menunggu penetapan Kepala Madrasah.');
      if (rows.length && cn(function (x) { return x.st === 'ditetapkan'; }) === rows.length) p.push('✅ Semua guru sudah ditetapkan. <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:12px" data-act="cetak-skset">Cetak SK Penetapan</button>');
    }
    if (!p.length) return '';
    return '<div class="card" style="background:#ecfdf5;border:1px solid #a7f3d0"><b>📌 Langkah berikutnya</b><ul style="margin:6px 0 0 18px;font-size:13px">' + p.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul></div>';
  }
  function daftarHtml() {
    var rows = barisGuru(), u = me();
    if (!rows.length) return '<div class="card"><p class="text-muted">Tidak ada guru yang bisa ditampilkan untuk Anda pada periode ini.</p></div>';
    var h = ringkasanPenilaiHtml(rows) + '<div class="card" style="overflow-x:auto"><table><thead><tr><th>Guru</th><th>Status</th><th></th></tr></thead><tbody>';
    rows.forEach(function (x) {
      var gk = x.g.key, boleh = hasilTerlihat(gk, x.st), ut = aksiUtama(x, u), lain = aksiLain(x, u, ut), info = [], nl = '';
      info.push(x.t ? 'Penilai: ' + esc(tampil(x.t.penilaiNama) || namaGuru(x.t.penilaiKey)) : 'belum ditugaskan');
      if (x.t && x.t.jadwal) info.push('Jadwal: ' + fmtTgl(x.t.jadwal));
      if (x.h && boleh) nl = x.h.lengkap ? '<div style="font-size:12px;margin-top:3px"><b>' + f1(x.h.nilai100) + '</b> ' + predChip(x.h) + '</div>' : '<div class="text-muted" style="font-size:11px;margin-top:3px">' + jumlahTerisi(x.n.skor) + '/' + P.totalIndikator() + ' terisi</div>';
      else { var pg = progresGuruHtml(x, boleh); if (pg) nl = '<div style="margin-top:3px">' + pg + '</div>'; }
      h += '<tr><td>' + (kep() && x.st === 'disetujui' ? '<input type="checkbox" data-pilih="' + esc(gk) + '" style="margin-right:6px">' : '') + '<b>' + esc(x.g.name) + '</b><div class="text-muted" style="font-size:11px">' + info.join(' &bull; ') + '</div></td>' +
        '<td>' + chip(x.st) + (x.st === 'disetujui' ? '<div class="text-muted" style="font-size:11px;margin-top:3px">menunggu pengesahan Kepala</div>' : '') + nl + '</td>' +
        '<td style="white-space:nowrap">' + (ut ? '<button class="btn ' + ut[2] + '" style="padding:5px 12px;font-size:12px" data-act="' + ut[0] + '" data-gk="' + esc(gk) + '">' + ut[1] + '</button>' : '') +
        (lain ? ' <details style="display:inline-block;position:relative;vertical-align:middle"><summary style="cursor:pointer;list-style:none;padding:5px 9px;border-radius:8px;background:#f3f4f6;font-size:12px">⋯ Lainnya</summary><div style="position:absolute;right:0;z-index:5;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:6px;display:flex;flex-direction:column;gap:4px;min-width:170px;box-shadow:0 4px 14px rgba(0,0,0,.12)">' + lain + '</div></details>' : '') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    if (kep() && rows.some(function (x) { return x.st === 'disetujui'; })) h += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-soft" data-act="pilih-semua">☑️ Pilih semua yang siap</button><button class="btn btn-success" data-act="tetapkan-pilih">📌 Tetapkan yang dipilih</button></div>';
    if (kep() && !adm()) h += '<div style="margin-top:8px"><button class="btn btn-soft" data-act="ganti-kunci-kepala">🔑 Ganti Kunci Kepala</button></div>';
    if (lihatSemua()) h += '<div style="margin-top:8px"><button class="btn btn-success" data-act="cetak-rekap">🖨️ Cetak Rekap Nilai (semua guru)</button> <button type="button" class="btn btn-soft" data-pa="excel">📥 Unduh Excel</button> <button type="button" class="btn btn-soft" data-act="ingatkan-semua">🔔 Ingatkan yang tertunda</button> <button class="btn btn-soft" data-act="cetak-skset">📄 Cetak SK Penetapan Hasil PKG</button></div>';
    return h;
  }

  // ----- Pengaturan (admin / kepala) -----
  // v55: nilai awal form Periode baru dari tahun ajaran berjalan (semester ganjil: 1 Juli s.d. 15 Desember; sesuai anjuran Juknis laporan selesai pertengahan Desember). Semua tetap bisa diubah.
  function periodeAwal() {
    var ta = (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) ? String(currentTahunAjaran) : '', m = /(\d{4})\s*[\/\-]\s*(\d{4})/.exec(ta);
    return { nama: ta ? 'PKG ' + ta : '', mulai: m ? m[1] + '-07-01' : '', selesai: m ? m[1] + '-12-15' : '' };
  }
  function pengaturanHtml() {
    var pa = periodeAwal();
    var h = '<div class="card"><h4 style="margin:0 0 8px">➕ Periode PKG baru</h4><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<div style="flex:2;min-width:170px"><label class="label">Nama periode</label><input id="pkgPerNama" class="field" maxlength="80" value="' + esc(pa.nama) + '" placeholder="PKG ' + esc(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '') + '"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Jenis</label><select id="pkgPerJenis" class="field"><option value="PKG">PKG (tahunan)</option><option value="PKG Awal">PKG Awal (guru baru/mutasi)</option></select></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Mulai</label><input id="pkgPerMulai" type="date" class="field" value="' + esc(pa.mulai) + '"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Selesai</label><input id="pkgPerSelesai" type="date" class="field" value="' + esc(pa.selesai) + '"></div></div>' +
      '<button class="btn btn-success" style="margin-top:8px" data-act="buat-periode">💾 Buat Periode</button>' +
      '<p class="text-muted" style="font-size:11.5px;margin:8px 0 0">Menurut Juknis, PKG dilaksanakan sepanjang tahun; penilaian akhir mulai 8 minggu sebelum akhir tahun anggaran dan laporan dianjurkan selesai pertengahan Desember.</p></div>';
    if (!S.periodeId) return h;
    var gurus = guruAktif(), opsi = [{ key: (typeof KEPSEK_USER_KEY !== 'undefined' ? KEPSEK_USER_KEY : '__kepsek__'), name: (namaKepala() ? namaKepala() + ' (Kepala Madrasah)' : 'Kepala Madrasah') }].concat(gurus.map(function (g) { return { key: g.key, name: g.name }; }));
    h += '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 8px">👥 Penugasan Penilai &mdash; ' + esc(S.periodeList[S.periodeId].nama || '') + '</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Penilai tidak boleh menilai dirinya sendiri, dan satu penilai maksimal ' + MAKS_GURU_PER_PENILAI + ' guru (Juknis). Kepala Madrasah dapat menjadi penilai.</p>' +
      '<table><thead><tr><th>Guru</th><th>Penilai</th><th>Jadwal pengamatan</th></tr></thead><tbody>';
    gurus.forEach(function (g) {
      var t = S.tugas[g.key] || {};
      h += '<tr><td>' + esc(g.name) + '</td><td><select class="field" data-pen="' + esc(g.key) + '"><option value="">— belum ditugaskan —</option>' +
        opsi.filter(function (o) { return o.key !== g.key; }).map(function (o) { return '<option value="' + esc(o.key) + '"' + (t.penilaiKey === o.key ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('') +
        '</select></td><td><input type="date" class="field" data-jad="' + esc(g.key) + '" value="' + esc(t.jadwal || '') + '"></td></tr>';
    });
    h += '</tbody></table>' + salinTugasHtml() + bagiTugasHtml() + '<button class="btn btn-success" style="margin-top:8px" data-act="simpan-tugas">💾 Simpan Penugasan</button></div>';
    h += skPenCardHtml() + skSetCardHtml() + cadanganKartuHtml();
    return h;
  }

  function salinTugasHtml() {
    var lain = Object.keys(S.periodeList).filter(function (id) { return id !== S.periodeId; }).sort().reverse();
    if (!lain.length) return '';
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px"><span style="font-size:12px">Salin penilai dari periode:</span><select id="pkgSalinDari" class="field" style="min-width:170px">' + lain.map(function (id) { return '<option value="' + esc(id) + '">' + esc(S.periodeList[id].nama || id) + '</option>'; }).join('') + '</select><button type="button" class="btn btn-soft" data-act="salin-tugas">📋 Salin ke isian</button></div><div class="text-muted" style="font-size:11px;margin-top:4px">Hanya mengisi yang masih kosong; jadwal tidak disalin. Periksa lalu tekan Simpan Penugasan.</div>';
  }
  function bagiTugasHtml() {
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px"><button type="button" class="btn btn-soft" data-act="bagi-tugas">⚖️ Bagi otomatis penilai &amp; jadwal</button></div>' +
      '<div class="text-muted" style="font-size:11px;margin-top:4px">Hanya mengisi baris yang masih kosong. Penilai: Kepala Madrasah lebih dulu sampai batas ' + MAKS_GURU_PER_PENILAI + ' guru, sisanya ke guru dengan beban paling sedikit; tidak ada yang menilai dirinya sendiri. Jadwal pengamatan disebar di hari Senin&ndash;Kamis dalam rentang periode, satu hari per penilai hanya satu guru. Tanggal merah/libur belum diperhitungkan; periksa lalu tekan Simpan Penugasan.</div>';
  }
  function bagiTugas() {
    if (!bolehKelola() || !S.periodeId) return;
    var r = root(); if (!r) return;
    var selA = Array.prototype.slice.call(r.querySelectorAll('select[data-pen]')), jadA = {};
    Array.prototype.forEach.call(r.querySelectorAll('input[data-jad]'), function (i) { jadA[i.getAttribute('data-jad')] = i; });
    if (!selA.length) return pesan('Belum ada guru.', true);
    var kepKey = (typeof KEPSEK_USER_KEY !== 'undefined' ? KEPSEK_USER_KEY : '__kepsek__');
    var ada = function (sel, k) { return Array.prototype.some.call(sel.options, function (o) { return o.value === k; }); };
    var beban = {}; selA.forEach(function (sel) { if (sel.value) beban[sel.value] = (beban[sel.value] || 0) + 1; });
    var guruKeys = selA.map(function (sel) { return sel.getAttribute('data-pen'); });
    var calon = [kepKey].concat(guruKeys);
    var nPen = 0, penuh = 0;
    selA.forEach(function (sel) {
      var gk = sel.getAttribute('data-pen'), n = S.nilai[gk];
      if (sel.value) return;
      if (n && n.status === 'ditetapkan') return;               // terkunci: tidak disentuh
      var pilih = null;
      calon.forEach(function (k) {
        if (k === gk || !ada(sel, k) || (beban[k] || 0) >= MAKS_GURU_PER_PENILAI) return;
        if (!pilih) { pilih = k; return; }
        if (pilih === kepKey) return;                           // Kepala didahulukan sampai penuh
        if (k === kepKey || (beban[k] || 0) < (beban[pilih] || 0)) pilih = k;
      });
      if (!pilih) { penuh++; return; }
      sel.value = pilih; beban[pilih] = (beban[pilih] || 0) + 1; nPen++;
    });
    // jadwal: hari kerja Senin-Kamis dalam rentang periode (mulai dari besok bila periode sudah berjalan)
    var per = S.periodeList[S.periodeId] || {}, nJad = 0, tanpaRentang = false, lewat = false, bentrok = 0, hariIni = skHariIni();
    var a = per.mulai || '', b = per.selesai || '';
    if (a && b && a <= b) {
      if (a <= hariIni) { var bs = new Date(); bs.setDate(bs.getDate() + 1); var besok = tglIso(bs); if (besok <= b) a = besok; else lewat = true; }
      var hari = [], d = new Date(a + 'T00:00:00'), akhir = new Date(b + 'T00:00:00');
      while (!lewat && d <= akhir && hari.length < 800) { var w = d.getDay(); if (w >= 1 && w <= 4) hari.push(tglIso(d)); d.setDate(d.getDate() + 1); }
      if (hari.length) {
        var perPen = {}, pakai = {};
        selA.forEach(function (sel) {
          var gk = sel.getAttribute('data-pen'), pk = sel.value; if (!pk) return;
          var j = jadA[gk];
          (perPen[pk] = perPen[pk] || []).push(gk);
          if (j && j.value) (pakai[pk] = pakai[pk] || {})[j.value] = 1;
        });
        Object.keys(perPen).forEach(function (pk) {
          var kosong = perPen[pk].filter(function (gk) { return jadA[gk] && !jadA[gk].value && !(S.nilai[gk] && S.nilai[gk].status === 'ditetapkan'); });
          var m = kosong.length; if (!m) return;
          var dipakai = pakai[pk] || (pakai[pk] = {});
          kosong.forEach(function (gk, i) {
            var idx = Math.min(hari.length - 1, Math.floor((i + 0.5) * hari.length / m)), tries = 0;
            while (dipakai[hari[idx]] && tries < hari.length) { idx = (idx + 1) % hari.length; tries++; }
            if (dipakai[hari[idx]]) bentrok++;
            jadA[gk].value = hari[idx]; dipakai[hari[idx]] = 1; nJad++;
          });
        });
      }
    } else tanpaRentang = true;
    var ket = [];
    ket.push(nPen ? nPen + ' penilai diisi' : 'tidak ada penilai baru yang diisi');
    ket.push(nJad ? nJad + ' jadwal diisi' : (tanpaRentang ? 'jadwal dilewati karena periode belum punya tanggal Mulai dan Selesai' : (lewat ? 'jadwal dilewati karena periode sudah berakhir' : 'tidak ada jadwal baru')));
    if (bentrok) ket.push(bentrok + ' jadwal terpaksa sama harinya dengan guru lain dari penilai yang sama (hari Senin\u2013Kamis tidak cukup); atur manual');
    if (penuh) ket.push(penuh + ' guru belum kebagian karena semua penilai sudah mencapai batas ' + MAKS_GURU_PER_PENILAI);
    pesan('Bagi otomatis: ' + ket.join('; ') + '. Periksa lalu tekan Simpan Penugasan.', !nPen && !nJad);
  }
  // ----- Form penilaian -----
  function formHtml() {
    var gk = S.gk, g = guruAktif().filter(function (x) { return x.key === gk; })[0], d = S.draft;
    var h = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><h4 style="margin:0">Penilaian: ' + esc(g ? g.name : gk) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Skor: 0 = tidak ada bukti &bull; 1 = terpenuhi sebagian &bull; 2 = terpenuhi seluruhnya</div></div>' +
      '<button class="btn btn-soft" data-act="kembali">← Kembali</button></div></div>';
    h += panelAtasForm(gk);
    if (bolehMenilai(gk)) h += '<div class="card" style="padding:8px 12px"><button type="button" class="btn btn-soft" style="padding:5px 12px;font-size:12px" data-act="cat-isi-semua" title="Mengisi catatan yang masih kosong dari judul bukti yang sudah diunggah. Catatan yang sudah terisi tidak ditimpa; skor tidak diubah.">✨ Isi semua catatan kosong dari bukti</button></div>';
    P.komponen.forEach(function (k) {
      h += '<details class="pkg-komp"' + (k.no === 1 ? ' open' : '') + '><summary><span>' + k.no + '. ' + esc(k.nama) + ' <span class="text-muted" style="font-weight:400;font-size:11px">(' + esc(k.kompetensi) + ')</span></span><span id="pkgKomp' + k.no + '" class="pkg-chip" style="background:#6b7280">–</span></summary>';
      k.indikator.forEach(function (ind, i) {
        var key = k.no + '_' + (i + 1), label = k.no + '.' + (i + 1), v = d.skor[key];
        h += '<div class="pkg-ind"><p><b>' + label + '</b> ' + esc(ind.t) + '</p><ul class="pkg-bukti">' + ind.b.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' + panelBuktiForm(gk, key) +
          [0, 1, 2].map(function (s) { return '<label class="pkg-opt"><input type="radio" name="sk_' + k.no + '_' + (i + 1) + '" data-k="' + k.no + '" data-i="' + (i + 1) + '" value="' + s + '"' + (v === s ? ' checked' : '') + '> ' + s + '</label>'; }).join('') +
          '<input class="field pkg-cat" maxlength="1000" data-cat="' + key + '" placeholder="Catatan fakta / bukti yang ditemukan (opsional)" value="' + esc(d.catatan[key] || '') + '">' + (bolehMenilai(gk) ? '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-top:4px" data-act="cat-isi" data-key="' + key + '" title="Menyusun catatan dari judul bukti yang sudah diunggah. Tidak menimpa catatan yang sudah ada.">✨ Isi dari bukti</button>' : '') + '</div>';
      });
      h += '</details>';
    });
    h += '<div class="pkg-sticky"><div id="pkgTotal" style="font-size:13px"></div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-soft" data-act="simpan-draft">💾 Simpan Draft</button>' +
      '<button class="btn btn-soft" data-act="cetak-sementara" data-form="1" data-gk="' + esc(gk) + '" title="Cetak isian yang sedang tampil di form ini (belum perlu disimpan)">🖨️ Cetak Sementara</button>' +
      '<button class="btn btn-success" data-act="ajukan">📨 Ajukan ke Guru</button></div>' +
      '<div class="text-muted" style="flex-basis:100%;font-size:11px">ℹ️ Progres penilaian baru terlihat oleh guru yang dinilai setelah draft disimpan.</div></div>';
    return h;
  }

  function recalc() {
    if (S.view !== 'form' || !S.draft) return;
    var h = hitung(S.draft.skor);
    h.komponen.forEach(function (c, i) {
      var e = $('pkgKomp' + (i + 1)); if (!e) return;
      e.textContent = c.terisi === 0 ? '–' : (c.total + '/' + c.maks + ' → nilai ' + c.nilai);
      e.style.background = c.lengkap ? '#15803d' : '#6b7280';
    });
    var t = $('pkgTotal');
    if (t) t.innerHTML = '<b>' + jumlahTerisi(S.draft.skor) + '/' + P.totalIndikator() + '</b> indikator terisi' + (h.lengkap ? ' &bull; Jumlah <b>' + h.jumlah + '/' + h.tertinggi + '</b> &bull; Nilai <b>' + f1(h.nilai100) + '</b> (' + esc(h.sebutan) + ')' : '');
  }

  // ----- Hasil (guru / penilai / kepala) -----
  // ---------- rekomendasi & rencana tindak lanjut (RTL) ----------
  var RTL_FIELD = [['kekuatan', 'Kekuatan / hal yang sudah baik', 1000], ['perbaikan', 'Hal yang perlu ditingkatkan', 1000], ['rekomendasi', 'Rekomendasi penilai', 1000], ['tindakLanjut', 'Rencana tindak lanjut / PKB (kegiatan yang akan dilakukan)', 1000], ['targetWaktu', 'Target waktu', 200]];
  function muatRtl(gk, cb) {
    if (!S.periodeId || typeof db === 'undefined') { if (cb) cb(); return; }
    var kunci = kb(gk), pid = S.periodeId;
    siapSesi().then(function () { return db.ref(nodeRtl(gk)).once('value'); }).then(function (s) {
      if (pid !== S.periodeId) return; S.rtl[kunci] = s.val() || {}; S.rtlGagal[kunci] = false;
    }).catch(function () { if (!S.rtl[kunci]) S.rtl[kunci] = {}; S.rtlGagal[kunci] = true; }).then(function () { if (cb) cb(); });
  }
  function bolehRtl(gk) {
    var n = S.nilai[gk]; if (!n || !me()) return false;
    return (bolehMenilai(gk) || lihatSemua()) && statusDari(n) !== 'ditetapkan' && hitung(n.skor || {}).lengkap;
  }
  // Usulan teks dari skor (fakta dari skor saja; penilai wajib memeriksa dan menyesuaikan).
  function rtlSaran(gk) {
    var n = S.nilai[gk]; if (!n || !n.skor) return null; var h = hitung(n.skor); if (!h.lengkap) return null;
    var kmp = h.komponen.map(function (c, i) { return { k: P.komponen[i], p: c.persen }; });
    var kuat = kmp.filter(function (x) { return x.p >= 75; }).sort(function (a, b) { return b.p - a.p; }).slice(0, 4);
    var lemah = kmp.filter(function (x) { return x.p < 60; }).sort(function (a, b) { return a.p - b.p; }).slice(0, 4);
    var nol = []; P.komponen.forEach(function (k) { k.indikator.forEach(function (x, i) { if (n.skor[k.no + '_' + (i + 1)] === 0) nol.push(k.no + '.' + (i + 1)); }); });
    var fmt = function (x) { return x.k.no + '. ' + x.k.nama + ' (' + f1(x.p) + '%)'; };
    return {
      kekuatan: kuat.length ? 'Capaian baik (≥75%) pada: ' + kuat.map(fmt).join('; ') + '.' : '',
      perbaikan: (lemah.length ? 'Capaian terendah (<60%) pada: ' + lemah.map(fmt).join('; ') + '.' : '') + (nol.length ? (lemah.length ? ' ' : '') + 'Indikator berskor 0: ' + nol.slice(0, 10).join(', ') + (nol.length > 10 ? ' dan ' + (nol.length - 10) + ' lainnya' : '') + '.' : ''),
      rekomendasi: lemah.length ? 'Prioritaskan penguatan komponen ' + lemah.map(function (x) { return x.k.no; }).join(', ') + ' melalui PKB (KKG/MGMP, pelatihan, atau pendampingan sejawat).' : 'Pertahankan kinerja dan bagikan praktik baik kepada sejawat.'
    };
  }
  function rtlIsi(gk) {
    var sr = rtlSaran(gk); if (!sr) return pesan('Usulan hanya tersedia setelah penilaian lengkap.', true);
    var n = 0; ['kekuatan', 'perbaikan', 'rekomendasi'].forEach(function (f) { var el = $('pkgRtl_' + f); if (el && !el.value.trim() && sr[f]) { el.value = sr[f]; n++; } });
    pesan(n ? 'Usulan diisi dari skor. Periksa, sesuaikan, lalu simpan.' : 'Kolom yang sudah terisi tidak ditimpa.');
  }
  function rtlSimpan(gk) {
    var u = me(); if (!u || !bolehRtl(gk)) return pesan('Tidak dapat menyimpan: penilaian sudah ditetapkan atau Anda tidak berhak.', true);
    var val = {}, ada = false, salah = '';
    RTL_FIELD.forEach(function (f) {
      var el = $('pkgRtl_' + f[0]), t = el ? el.value.trim() : '';
      if (t.length > f[2]) salah = f[1] + ' terlalu panjang (' + t.length + ' karakter; maksimal ' + f[2] + ').';
      if (t) { val[f[0]] = t; ada = true; }
    });
    if (salah) return pesan(salah, true);
    if (ada) { val.diperbarui = nowIso(); val.diperbaruiOleh = pengisi(u); }
    var kunci = kb(gk);
    kerjakan(function () { return db.ref(nodeRtl(gk)).set(ada ? aman(val) : null); }, function () {
      S.rtl[kunci] = ada ? val : {}; S.rtlGagal[kunci] = false;
      if (typeof addLog === 'function') addLog('PKG rekomendasi', namaGuru(gk));
      pesan('Rekomendasi dan rencana tindak lanjut tersimpan.'); render();
    }, 'Gagal menyimpan rekomendasi: ');
  }
  function rtlTeks(t) { return esc(t).replace(/\n/g, '<br>'); }
  function rtlKartu(gk) {
    var n = S.nilai[gk]; if (!n || !me()) return '';
    var kunci = kb(gk), d = S.rtl[kunci], boleh = bolehRtl(gk);
    if (d === undefined) {
      if (!S.rtlMuat[kunci]) { S.rtlMuat[kunci] = 1; muatRtl(gk, function () { if (S.view === 'hasil' && S.gk === gk) render(); }); }
      return boleh ? '<div class="card"><p class="text-muted">Memuat rekomendasi…</p></div>' : '';
    }
    var o = '<div class="card"><h4 style="margin:0 0 6px">🧭 Rekomendasi dan rencana tindak lanjut</h4>';
    if (boleh) {
      o += '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Diisi penilai sebelum hasil ditetapkan; ikut tercetak di Laporan PKG dan terlihat oleh guru. Tombol usulan hanya mengisi kolom yang masih kosong dari skor penilaian.</p>';
      RTL_FIELD.forEach(function (f) {
        var v = (d && d[f[0]]) || '';
        o += '<label style="display:block;font-size:12.5px;font-weight:600;margin-top:8px">' + esc(f[1]) + '</label>' +
          (f[0] === 'targetWaktu' ? '<input type="text" id="pkgRtl_' + f[0] + '" maxlength="' + f[2] + '" value="' + esc(v) + '" style="width:100%">'
            : '<textarea id="pkgRtl_' + f[0] + '" rows="3" maxlength="' + f[2] + '" style="width:100%">' + esc(v) + '</textarea>');
      });
      o += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-soft" data-act="rtl-isi" data-gk="' + esc(gk) + '">✨ Isi usulan dari skor</button><button class="btn btn-success" data-act="rtl-simpan" data-gk="' + esc(gk) + '">💾 Simpan rekomendasi</button></div>';
      if (S.rtlGagal[kunci]) o += '<div style="margin-top:8px;font-size:12px;color:#b91c1c">Data rekomendasi tidak terbaca. Pastikan Firebase Rules untuk pkg_v4_rtl sudah dipasang (lihat rules-rtl-pkg.txt).</div>';
      return o + '</div>';
    }
    var ada = RTL_FIELD.filter(function (f) { return d && d[f[0]]; });
    if (!ada.length) return '';
    ada.forEach(function (f) { o += '<div style="margin-top:8px;font-size:13px"><b>' + esc(f[1]) + '</b><div>' + rtlTeks(d[f[0]]) + '</div></div>'; });
    return o + '</div>';
  }
  // Cetakan: terisi bila sudah ada; bila kosong tetap tercetak sebagai kolom isian tulis tangan.
  function rtlCetakHtml(gk) {
    var d = S.rtl[kb(gk)] || {};
    var rows = RTL_FIELD.map(function (f) {
      var v = d[f[0]]; return '<tr style="page-break-inside:avoid"><td style="width:30%">' + esc(f[1]) + '</td><td' + (v ? '' : ' style="height:' + (f[0] === 'targetWaktu' ? 24 : 46) + 'px"') + '>' + (v ? rtlTeks(v) : '&nbsp;') + '</td></tr>';
    }).join('');
    return '<h4 style="margin:14px 0 4px;page-break-after:avoid">REKOMENDASI DAN RENCANA TINDAK LANJUT</h4><table>' + rows + '</table>';
  }

  function hasilHtml(gk) {
    var n = S.nilai[gk], u = me();
    if (!u) return '';
    if (!n || !n.skor || !hasilTerlihat(gk, statusDari(n))) return '<div class="card"><p>Belum ada hasil.</p><button class="btn btn-soft" data-act="kembali">← Kembali</button></div>';
    var st = statusDari(n), h = hitung(n.skor);
    var lemah = h.komponen.map(function (c, i) { return { k: P.komponen[i], c: c }; }).filter(function (x) { return x.c.lengkap && x.c.nilai <= 2; });
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><h4 style="margin:0">Hasil PKG: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Penilai: ' + esc(tampil(n.penilaiNama) || namaGuru(n.penilaiKey)) + ' &bull; ' + chip(st) + '</div></div>' +
      '<button class="btn btn-soft" data-act="kembali">← Kembali</button></div>' + pengesahanHtml(st);
    if (h.lengkap) o += '<div class="pkg-grid" style="margin-top:10px">' + stat(h.jumlah + ' / ' + h.tertinggi, 'Jumlah nilai komponen') + stat(f1(h.nilai100), 'Nilai PKG (skala 100)') + '<div class="pkg-stat"><span>Predikat</span><br>' + predChip(h) + '</div>' + stat(h.npk + '%', 'NPK') + '</div>';
    else o += '<p class="text-muted">Penilaian belum lengkap (' + jumlahTerisi(n.skor) + '/' + P.totalIndikator() + ' indikator).</p>';
    o += '<table><thead><tr><th>No</th><th>Komponen</th><th>Skor</th><th>%</th><th>Nilai (1–4)</th></tr></thead><tbody>' + h.komponen.map(function (c, i) {
      var k = P.komponen[i];
      return '<tr><td>' + k.no + '</td><td>' + esc(k.nama) + ' <span class="text-muted" style="font-size:11px">(' + esc(k.kompetensi) + ')</span></td><td>' + c.total + '/' + c.maks + '</td><td>' + f1(c.persen) + '%</td><td><b>' + (c.terisi ? c.nilai : '-') + '</b></td></tr>';
    }).join('') + '</tbody></table>';
    if (lemah.length) o += '<div style="margin-top:10px;font-size:13px"><b>Komponen yang perlu diprioritaskan dalam PKB</b> (nilai 1–2): ' + lemah.map(function (x) { return x.k.no + '. ' + esc(x.k.nama); }).join('; ') + '.</div>';
    o += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">';
    if (gk === u.key && st === 'diajukan') o += '<button class="btn btn-success" data-act="setuju">✅ Saya Setuju</button><button class="btn btn-warning" data-act="kb-buka">⚠️ Ajukan Keberatan</button>' + (S.kbForm ? '<div style="flex-basis:100%;padding:10px;border-radius:10px;background:#fffbeb"><label class="label">Alasan keberatan (wajib, maks. 1000 karakter)</label><textarea id="pkgKbAlasan" class="field" rows="4" maxlength="1000" style="width:100%">' + esc(S.kbTeks || '') + '</textarea><div style="margin-top:6px;display:flex;gap:6px"><button class="btn btn-warning" data-act="keberatan">Kirim Keberatan</button><button class="btn btn-soft" data-act="kb-batal">Batal</button></div></div>' : '');
    if (kep() && st === 'disetujui') o += '<button class="btn btn-success" data-act="tetapkan" data-gk="' + esc(gk) + '">📌 Tetapkan (Kepala Madrasah)</button>';
    if (kep() && st === 'keberatan') o += '<button class="btn btn-soft" data-act="nilai" data-gk="' + esc(gk) + '">✏️ Buka untuk direvisi penilai</button>';
    if (bolehMenilai(gk) && st === 'diajukan') o += '<button class="btn btn-soft" data-act="tarik" data-gk="' + esc(gk) + '">↩️ Tarik Kembali</button>';
    o += '<button class="btn btn-soft" data-act="cetak" data-gk="' + esc(gk) + '">🖨️ Cetak Laporan</button></div>';
    if (st === 'keberatan' && n.persetujuan && n.persetujuan.alasan) o += '<div style="margin-top:10px;padding:10px;border-radius:10px;background:#fef2f2;font-size:13px"><b>Alasan keberatan guru:</b> ' + esc(n.persetujuan.alasan) + '<br><span class="text-muted">Juknis: difasilitasi internal oleh Kepala Madrasah; bila belum selesai, dilaporkan ke Kantor Kemenag untuk penilaian ulang.</span></div>';
    return o + '</div>' + rtlKartu(gk) + bandingKartuHasil(gk);
  }

  // ---------- BUKTI: isian dan bukti diisi langsung di aplikasi ----------
  function kb(gk) { return (S.periodeId || '') + '/' + gk; }
  function dataBukti(gk) { return S.bukti[kb(gk)] || null; }
  function nodeBukti(gk) { return N.bukti + '/' + S.periodeId + '/' + gk; }
  function nodeObsKes(gk) { return N.obsKes + '/' + S.periodeId + '/' + gk; }
  function nodeRtl(gk) { return N.rtl + '/' + S.periodeId + '/' + gk; }
  function sumberDef() { return (window.PKG_SUMBER && window.PKG_SUMBER.daftar) || null; }
  function tglIso(d) { var m = d.getMonth() + 1, t = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (t < 10 ? '0' : '') + t; }
  function aman(o) { return JSON.parse(JSON.stringify(o)); }                  // buang undefined (ditolak Firebase)
  function potong(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  // Tautan hanya http/https. Tanpa skema ditambah https://. "javascript:" dan sejenisnya ditolak.
  function amanUrl(u) {
    u = String(u || '').trim(); if (!u) return '';
    if (!/^https?:\/\//i.test(u)) { if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^[^\s\/]+:\d+(\/|$)/.test(u)) return ''; u = 'https://' + u; }
    try { var x = new URL(u); return (x.protocol === 'http:' || x.protocol === 'https:') && x.hostname.indexOf('.') > 0 ? x.href : ''; } catch (e) { return ''; }
  }
  function adaPenilai(gk) { return bolehMenilai(gk) || lihatSemua(); }
  // Bukti boleh diubah oleh yang berhak sampai penilaian final (disetujui / ditetapkan).
  function bolehUbahBukti(gk) { return bolehPerangkat('bukti', gk) && !selesai(statusDari(S.nilai[gk])); }
  // Guru hanya mengisi dokumen; observasi dan wawancara hanya penilai / Kepala Madrasah / Admin.
  function bolehJenis(jenis, gk) { return bolehUbahBukti(gk) && (jenis === 'dokumen' || adaPenilai(gk)); }

  function muatBukti(gk, cb) {
    if (!S.periodeId || typeof db === 'undefined') { if (cb) cb(); return; }
    var kunci = kb(gk), pid = S.periodeId;
    siapSesi().then(function () { return db.ref(nodeBukti(gk)).once('value'); }).then(function (s) {
      if (pid !== S.periodeId) return;
      S.bukti[kunci] = s.val() || {};
    }).catch(function (e) {
      if (!S.bukti[kunci]) S.bukti[kunci] = {};
      if (/permission_denied/i.test(String((e && e.message) || e))) tawarGantiKunciKepala();
      pesan('Bukti PKG: gagal memuat (' + ((e && e.message) || e) + '). Pastikan Firebase Rules untuk pkg_v4_bukti sudah ditambahkan.', true);
    }).then(function () { if (cb) cb(); });
  }

  // Wawancara bersifat rahasia -> tidak pernah tampil bagi guru yang dinilai. Observasi tampil setelah hasil diajukan.
  function itemTampil(it, gk) {
    if (adaPenilai(gk)) return true;
    if (it.jenis === 'wawancara') return false;
    if (it.jenis === 'observasi') return hasilTerlihat(gk, statusDari(S.nilai[gk]));
    return true;
  }
  function daftarItem(gk, key) {
    var d = dataBukti(gk), m = (d && d.item && d.item[key]) || {}, a = [];
    Object.keys(m).forEach(function (id) { var it = m[id]; if (it && typeof it === 'object' && itemTampil(it, gk)) { var c = {}; Object.keys(it).forEach(function (f) { c[f] = it[f]; }); c.id = id; a.push(c); } });
    return a.sort(function (x, y) { return String(x.at || '').localeCompare(String(y.at || '')); });
  }
  function itemTotal(gk, key) { var d = dataBukti(gk), m = (d && d.item && d.item[key]) || {}; return Object.keys(m).length; }
  function adaOto(gk, key) { var d = dataBukti(gk); return !!(d && d.otomatis && d.otomatis[key]); }
  function indikatorBerbukti(gk) {
    var n = 0, tot = 0;
    P.komponen.forEach(function (k) { k.indikator.forEach(function (_, i) { tot++; var key = k.no + '_' + (i + 1); if (daftarItem(gk, key).length || adaOto(gk, key)) n++; }); });
    return { n: n, total: tot };
  }
  // indikator -> sumber data SI MAMBA yang dapat membuktikannya (daftar eksplisit di PKG_SUMBER.daftar[id].indikator)
  function petaOto() {
    var def = sumberDef(), m = {}; if (!def) return m;
    P.komponen.forEach(function (k) {
      k.indikator.forEach(function (x, i) {
        var kunciInd = k.no + '_' + (i + 1);
        var ids = Object.keys(def).filter(function (id) { return (def[id].indikator || []).indexOf(kunciInd) > -1; });
        if (ids.length) m[k.no + '_' + (i + 1)] = ids;
      });
    });
    return m;
  }
  function pertanyaanWawancara(key) {
    var lab = key.replace('_', '.'), r = [];
    WAWANCARA.forEach(function (g) { if (g.sembunyi) return; g.q.forEach(function (x) { if (x[0] === lab) r.push({ who: g.who, q: x[1] }); }); });
    return r;
  }
  function teksOto(d, o) {
    var t = String(o.s || '').split(',').map(function (id) { var s = d.sumberOto && d.sumberOto[id]; return s && s.ok ? ((sumberDef() && sumberDef()[id] ? sumberDef()[id].label : id) + ': ' + s.ringkas) : ''; }).filter(Boolean);
    return t.length ? 'Bukti otomatis SI MAMBA — ' + t.join('; ') : '';
  }
  function rentangOto() {
    var per = S.periodeList[S.periodeId] || {}, hari = tglIso(new Date()), dari = '', sampai = '';
    var ta = (typeof currentTahunAjaran !== 'undefined' ? String(currentTahunAjaran) : ''), m = /(\d{4})\s*[\/\-]\s*(\d{4})/.exec(ta);
    var awalTa = m ? m[1] + '-07-01' : tglIso(new Date(Date.now() - 180 * 86400000));
    dari = per.mulai || awalTa; sampai = per.selesai && per.selesai < hari ? per.selesai : hari;
    if (dari > sampai) dari = awalTa;
    if (dari > sampai) dari = sampai;
    return { dari: dari, sampai: sampai };
  }

  // ----- potongan tampilan -----
  function itemHtml(it, gk, bacaSaja) {
    var u = me(), url = amanUrl(it.tautan);
    var boleh = !bacaSaja && bolehUbahBukti(gk) && u && (it.olehKey === u.key || lihatSemua());
    return '<li class="pkg-item"><span class="pkg-jenis">' + (JENIS_ITEM[it.jenis] || '') + '</span> <b>' + esc(it.judul || '') + '</b>' +
      (url ? ' <a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">🔗 buka</a>' : '') +
      (it.pn && typeof it.pn === 'object' ? '<div class="pkg-meta">Penanda terlihat ' + esc(String(it.pn.t ? String(it.pn.t).split(',').length : 0)) + ' dari ' + esc(String(it.pn.n || 0)) + ' &bull; usulan skor ' + esc(String(it.pn.s)) + '</div>' : '') +
      (it.ket ? '<div class="pkg-ket">' + esc(it.ket) + '</div>' : '') +
      '<div class="pkg-meta">' + esc(tampil(it.oleh) || '') + (it.at ? ' &bull; ' + fmtTgl(String(it.at).slice(0, 10)) : '') +
      (boleh ? ' &bull; <a href="#" data-act="bukti-hapus" data-key="' + esc(it.key || '') + '" data-id="' + esc(it.id) + '" style="color:#b91c1c">hapus</a>' : '') + '</div></li>';
  }
  function otoBaris(d, o) {
    var def = sumberDef() || {};
    return String(o.s || '').split(',').map(function (id) {
      var s = d.sumberOto && d.sumberOto[id]; if (!s || !s.ok) return '';
      return '<div class="pkg-oto-baris">' + (def[id] ? def[id].ikon + ' <b>' + esc(def[id].label) + '</b>: ' : '') + esc(s.ringkas) +
        (s.dasar ? '<div class="pkg-meta">Dasar usulan: ' + esc(s.dasar) + '</div>' : '') + '</div>';
    }).join('');
  }

  // Panel bukti pada tiap indikator di FORM PENILAIAN: bukti yang sudah masuk + usulan skor dari data SI MAMBA.
  function panelBuktiForm(gk, key) {
    var d = dataBukti(gk); if (!d) return '';
    var items = daftarItem(gk, key), o = d.otomatis && d.otomatis[key], h = '';
    if (o) {
      var teks = otoBaris(d, o);
      if (teks) {
        h += '<div class="pkg-oto">🤖 <b>Bukti otomatis dari SI MAMBA</b>' + teks;
        if (o.saran != null) h += '<div style="margin-top:6px">Usulan skor <b>' + o.saran + '</b> <button type="button" class="btn btn-soft" style="padding:3px 10px;font-size:12px" data-act="pakai-saran" data-key="' + esc(key) + '">✔ Pakai saran</button> <span class="pkg-meta">penilai tetap yang memutuskan</span></div>';
        h += '</div>';
      }
    }
    var ak = d.angket && d.angket[key];
    if (ak) h += angketBaris(ak, key);
    if (items.length) {
      var c = {}; items.forEach(function (it) { c[it.jenis] = (c[it.jenis] || 0) + 1; });
      var ring = Object.keys(c).map(function (j) { return (JENIS_ITEM[j] || j) + ' ' + c[j]; }).join(' &bull; ');
      h += '<details class="pkg-bk"><summary>' + ring + '</summary><ul class="pkg-items">' + items.map(function (it) { it.key = key; return itemHtml(it, gk, true); }).join('') + '</ul></details>';
    } else if (!h) h = '<div class="pkg-meta" style="margin:0 0 6px">Belum ada bukti terlampir untuk indikator ini.</div>';
    return h;
  }
  // Bilah di atas form penilaian: ringkasan bukti + tarik otomatis + pakai semua saran.
  function panelAtasForm(gk) {
    var d = dataBukti(gk);
    if (!d) return '<div class="card"><p class="text-muted" style="margin:0;font-size:12px">Memuat bukti guru…</p></div>';
    var rb = indikatorBerbukti(gk), saran = 0;
    Object.keys(d.otomatis || {}).forEach(function (k) { if (d.otomatis[k].saran != null && S.draft.skor[k] == null) saran++; });
    Object.keys(d.angket || {}).forEach(function (k) { if (d.angket[k].saran != null && S.draft.skor[k] == null && !(d.otomatis && d.otomatis[k] && d.otomatis[k].saran != null)) saran++; });
    var h = '<div class="card"><div style="font-size:13px"><b>📂 Bukti guru:</b> ' + rb.n + ' dari ' + rb.total + ' indikator sudah punya bukti.' +
      (d.otoAt ? ' <span class="text-muted">Data otomatis ditarik ' + fmtTgl(String(d.otoAt).slice(0, 10)) + ' (' + fmtTgl(d.otoDari) + ' s.d. ' + fmtTgl(d.otoSampai) + ').</span>' : ' <span class="text-muted">Data otomatis belum ditarik.</span>') + '</div>' +
      '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
    if (sumberDef() && adaPenilai(gk)) h += '<button class="btn btn-soft" style="padding:5px 12px;font-size:12px" data-act="bukti-tarik">🔄 Tarik bukti otomatis</button>';
    if (saran) h += '<button class="btn btn-success" style="padding:5px 12px;font-size:12px" data-act="pakai-semua-saran">⚡ Pakai ' + saran + ' saran untuk indikator yang masih kosong</button>';
    return h + '</div></div>';
  }

  // ----- layar Bukti (guru / penilai / admin) -----
  function buktiViewHtml(gk) {
    var d = dataBukti(gk), u = me();
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><h4 style="margin:0">📂 Isian Bukti: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Isi bukti langsung di sini; tersimpan otomatis dan tampil di form penilaian. Wawancara bersifat rahasia (tidak terlihat oleh guru yang dinilai).</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-soft" data-act="cetak-perangkat" data-jenis="bukti" data-gk="' + esc(gk) + '">🖨️ Cetak (terisi)</button><button class="btn btn-soft" data-act="kembali">← Kembali</button></div></div></div>';
    if (!d) return o + '<div class="card"><p class="text-muted">Memuat bukti…</p></div>';
    var boleh = bolehUbahBukti(gk), rb = indikatorBerbukti(gk);
    if (!boleh) o += '<div class="card" style="background:#fffbeb"><p style="margin:0;font-size:13px">' + (selesai(statusDari(S.nilai[gk])) ? 'Penilaian sudah final; bukti tidak dapat diubah lagi.' : 'Anda hanya dapat melihat bukti ini.') + '</p></div>';
    o += '<div class="card"><div style="display:flex;justify-content:space-between;font-size:13px"><b>Kelengkapan bukti</b><span>' + rb.n + ' / ' + rb.total + ' indikator</span></div><div class="pkg-bar" style="margin-top:6px"><i style="width:' + (rb.total ? rb.n / rb.total * 100 : 0) + '%"></i></div></div>';

    // --- bukti otomatis dari SI MAMBA ---
    var def = sumberDef();
    o += '<div class="card"><h4 style="margin:0 0 6px">🤖 Bukti otomatis dari SI MAMBA</h4>';
    if (!def) o += '<p class="text-muted" style="font-size:12px;margin:0">Modul <code>js/pkg-sumber.js</code> belum dimuat, sehingga bukti otomatis tidak tersedia. Bukti manual tetap bisa diisi.</p>';
    else {
      var rg = rentangOto(), dr = S.otoDari || (d.otoDari || rg.dari), sp = S.otoSampai || (d.otoSampai || rg.sampai);
      o += !adaPenilai(gk) ? '<p class="text-muted" style="font-size:12px;margin:0">Bukti otomatis (absensi, jurnal, nilai, perangkat pembelajaran, buku penghubung, kegiatan madrasah, materi/tugas daring, penilaian diri) ditarik oleh penilai.</p>' : '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Mengambil data <b>absensi guru</b>, <b>jurnal mengajar</b>, <b>nilai siswa</b>, serta <b>perangkat pembelajaran dan modul ajar</b> milik guru ini pada rentang tanggal di bawah, lalu menempelkannya sebagai bukti pada indikator yang relevan beserta usulan skor.</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><div><label class="label">Dari</label><input id="pkgOtoDari" type="date" class="field" value="' + esc(dr) + '"></div>' +
        '<div><label class="label">Sampai</label><input id="pkgOtoSampai" type="date" class="field" value="' + esc(sp) + '"></div>' +
        (boleh && adaPenilai(gk) ? '<button class="btn btn-success" data-act="bukti-tarik">🔄 Tarik bukti otomatis</button>' : '') + '</div>';
      var so = d.sumberOto || {};
      if (Object.keys(so).length) {
        o += '<div style="margin-top:10px;font-size:12.5px">' + urutSumber(def).map(function (id) {
          var s = so[id]; if (!s) return '';
          return '<div style="margin:5px 0">' + def[id].ikon + ' <b>' + esc(def[id].label) + '</b> ' + (s.ok
            ? '<span style="color:#15803d">✔</span> ' + esc(s.ringkas) + (s.saran != null ? ' <span class="pkg-chip" style="background:#15803d">usulan skor ' + s.saran + '</span>' : '')
            : '<span style="color:#b45309">⚠ tidak terbaca</span> <span class="text-muted">' + esc(s.alasan || '') + '</span>') + '</div>';
        }).join('') + '<div class="pkg-meta">Ditarik ' + (d.otoAt ? fmtTgl(String(d.otoAt).slice(0, 10)) : '-') + (d.otoOleh ? ' oleh ' + esc(tampil(d.otoOleh)) : '') + '</div></div>';
      }
    }
    o += '</div>';

    // --- checklist kesiapan bukti ---
    o += '<div class="card"><h4 style="margin:0 0 6px">☑ Daftar kesiapan bukti</h4><p class="text-muted" style="font-size:12px;margin:0 0 6px">Centang bukti yang sudah disiapkan. A1 disiapkan guru, A2 diminta ke TU / wakil kepala madrasah, A3 dihasilkan penilai.</p>';
    [['guru', 'A1. Disiapkan oleh guru yang dinilai'], ['madrasah', 'A2. Disediakan madrasah'], ['penilai', 'A3. Dihasilkan oleh penilai']].forEach(function (g) {
      var rows = '';
      GRUP_BUKTI.forEach(function (b, gi) {
        if (b[0] !== g[0]) return;
        var ks = komponenDari(b[2]); if (!ks.length) return;
        var cek = d.siap && d.siap['g' + gi], dis = !boleh || (g[0] === 'penilai' && !adaPenilai(gk));
        rows += '<label class="pkg-siap"><input type="checkbox" data-siap="g' + gi + '"' + (cek ? ' checked' : '') + (dis ? ' disabled' : '') + '> <span>' + esc(b[1]) + ' <span class="pkg-meta">komponen ' + ks.join(', ') + '</span></span></label>';
      });
      if (rows) o += '<div style="font-weight:700;font-size:12.5px;margin:8px 0 2px">' + esc(g[1]) + '</div>' + rows;
    });
    o += '</div>';

    o += praKartu(gk);
    o += diriKartu(gk);
    o += angketKartu(gk);
    // --- bukti per indikator ---
    o += '<div class="card" style="padding-bottom:4px"><h4 style="margin:0 0 4px">📋 Bukti per indikator</h4><p class="text-muted" style="font-size:12px;margin:0">Buka komponen, lalu tambahkan bukti (judul + tautan Google Drive / foto bila ada).</p></div>';
    var peta = petaOto();
    P.komponen.forEach(function (k) {
      var nk = 0; k.indikator.forEach(function (_, i) { var key = k.no + '_' + (i + 1); if (daftarItem(gk, key).length || adaOto(gk, key)) nk++; });
      o += '<details class="pkg-komp"><summary><span>' + k.no + '. ' + esc(k.nama) + ' <span class="text-muted" style="font-weight:400;font-size:11px">(' + esc(k.kompetensi) + ')</span></span><span class="pkg-chip" style="background:' + (nk === k.indikator.length ? '#15803d' : '#6b7280') + '">' + nk + '/' + k.indikator.length + '</span></summary>';
      k.indikator.forEach(function (ind, i) {
        var key = k.no + '_' + (i + 1), label = k.no + '.' + (i + 1), items = daftarItem(gk, key), oto = d.otomatis && d.otomatis[key];
        var diamati = ind.b.some(function (b) { return RE_OBS.test(b); });
        o += '<div class="pkg-ind"><p><b>' + label + '</b> ' + esc(ind.t) + (diamati ? ' <span class="pkg-chip" style="background:#7c3aed">👁️ diamati</span>' : '') + (peta[key] ? ' <span class="pkg-chip" style="background:#0e7490">🤖 data SI MAMBA</span>' : '') + '</p>' +
          '<ul class="pkg-bukti">' + ind.b.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
        if (oto) { var t = otoBaris(d, oto); if (t) o += '<div class="pkg-oto">🤖 <b>Bukti otomatis</b>' + t + (oto.saran != null ? '<div class="pkg-meta">Usulan skor ' + oto.saran + ' (dipakai penilai di form penilaian)</div>' : '') + '</div>'; }
        var pj = adaPenilai(gk) && d.pra && d.pra[key];
        if (pj) o += '<div class="pkg-oto" style="background:#fffbeb">🗣️ <b>Jawaban guru (pra-wawancara)</b><div style="white-space:pre-wrap;margin-top:2px">' + esc(pj) + '</div></div>';
        if (items.length) o += '<ul class="pkg-items">' + items.map(function (it) { it.key = key; return itemHtml(it, gk); }).join('') + '</ul>';
        if (boleh) {
          var jenisOpsi = ['dokumen'].concat(adaPenilai(gk) ? ['observasi', 'wawancara'] : []);
          var tanya = adaPenilai(gk) ? pertanyaanWawancara(key) : [];
          o += '<details class="pkg-add"><summary>➕ Tambah bukti</summary><div data-bform="' + esc(key) + '">' +
            (tanya.length ? '<div class="pkg-meta" style="margin:4px 0">Pertanyaan wawancara: ' + tanya.map(function (x) { return '<i>' + esc(x.who) + '</i> — ' + esc(x.q); }).join(' &#9679; ') + '</div>' : '') +
            '<div style="display:flex;gap:6px;flex-wrap:wrap"><select class="field" data-f="jenis" style="max-width:170px">' + jenisOpsi.map(function (j) { return '<option value="' + j + '">' + JENIS_ITEM[j] + '</option>'; }).join('') + '</select>' +
            '<input class="field" data-f="judul" maxlength="120" placeholder="Judul bukti / narasumber (wajib)" style="flex:1;min-width:180px"></div>' +
            '<input class="field" data-f="tautan" placeholder="Tautan (Google Drive, foto, dokumen) — opsional" style="margin-top:6px">' +
            '<textarea class="field" data-f="ket" rows="2" maxlength="500" placeholder="Catatan fakta / isi bukti / jawaban + contoh kejadian — opsional" style="margin-top:6px"></textarea>' +
            '<button type="button" class="btn btn-success" style="margin-top:6px;padding:5px 14px;font-size:12.5px" data-act="bukti-tambah" data-key="' + esc(key) + '">💾 Simpan bukti</button></div></details>';
          if (adaPenilai(gk)) o += penandaHtml(key);
        }
        o += '</div>';
      });
      o += '</details>';
    });
    return o;
  }
  function urutSumber(def) { return ((window.PKG_SUMBER && window.PKG_SUMBER.urut) || Object.keys(def)).filter(function (id) { return def[id]; }); }

  // ----- Isian pra-wawancara: guru yang dinilai mengisi sendiri jawaban tertulis; penilai membacanya sebelum bertemu -----
  // Tersimpan di pkg_v4_bukti/{periode}/{guru}/pra/{k_i} (teks) + praAt + praOleh. Bukan pengganti wawancara tatap muka.
  var MAKS_PRA = 1000;
  function soalPra() { return (WAWANCARA[0] && WAWANCARA[0].q) || []; }          // pertanyaan untuk guru yang dinilai
  function jawabPra(gk, key) {
    var dr = S.praDraft && S.praDraft[gk + '|' + key];
    if (dr != null) return dr;
    var d = dataBukti(gk); return (d && d.pra && d.pra[key]) || '';
  }
  function praKartu(gk) {
    var u = me(), saya = !!(u && gk === u.key), soal = soalPra();
    if (!soal.length || (!saya && !adaPenilai(gk))) return '';
    var d = dataBukti(gk), o = '<div class="card"><h4 style="margin:0 0 6px">🗣️ Isian pra-wawancara</h4>';
    if (!d) return o + '<p class="text-muted" style="font-size:12px;margin:0">Memuat…</p></div>';
    var boleh = saya && bolehUbahBukti(gk), pra = d.pra || {}, terisi = 0;
    soal.forEach(function (x) { var v = pra[x[0].replace('.', '_')]; if (v && String(v).trim()) terisi++; });
    o += saya
      ? '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Jawab pertanyaan berikut dengan <b>contoh nyata</b> (siapa, kapan, apa yang Anda lakukan). Isian ini dibaca penilai, Kepala Madrasah, dan Admin; tidak ditampilkan ke guru lain di aplikasi. Penilai tetap akan menemui Anda untuk menggali jawaban.</p>'
      : '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Jawaban tertulis dari guru, sebagai bahan wawancara. Terisi <b>' + terisi + '</b> dari ' + soal.length + ' pertanyaan' + (d.praAt ? ' (disimpan ' + fmtTgl(String(d.praAt).slice(0, 10)) + ')' : '') + '. Jawaban ini tidak menggantikan wawancara tatap muka.</p>';
    o += '<div data-praform="1">' + soal.map(function (x) {
      var key = x[0].replace('.', '_'), v = jawabPra(gk, key);
      return '<div style="margin:8px 0"><div style="font-size:13px"><b>' + esc(x[0]) + '</b> ' + esc(x[1]) + '</div>' +
        (boleh ? '<textarea class="field" data-pra="' + esc(key) + '" rows="3" maxlength="' + MAKS_PRA + '" placeholder="Tulis jawaban dan contoh kejadian…" style="margin-top:4px">' + esc(v) + '</textarea>'
          : '<div style="white-space:pre-wrap;font-size:13px;margin-top:3px;padding:6px 8px;background:#f9fafb;border-radius:8px">' + (v ? esc(v) : '<span class="text-muted">(belum diisi)</span>') + '</div>') + '</div>';
    }).join('');
    if (boleh) o += '<button type="button" class="btn btn-success" data-act="pra-simpan" style="margin-top:4px">💾 Simpan isian</button>' + (d.praAt ? ' <span class="pkg-meta">Terakhir disimpan ' + fmtTgl(String(d.praAt).slice(0, 10)) + '</span>' : '');
    else if (saya) o += '<div class="pkg-meta">Isian terkunci karena penilaian sudah final.</div>';
    return o + '</div></div>';
  }
  function simpanPra(el) {
    var gk = S.gk, u = me();
    if (!u || gk !== u.key || !bolehUbahBukti(gk)) return pesan('Isian hanya dapat diubah oleh guru yang dinilai, sebelum penilaian final.', true);
    if (!dataBukti(gk)) return pesan('Data masih dimuat, coba lagi sebentar.', true);
    var box = el.closest('[data-praform]'); if (!box) return;
    var pra = {}, n = 0;
    Array.prototype.forEach.call(box.querySelectorAll('textarea[data-pra]'), function (t) {
      var v = String(t.value || '').trim(); if (v) { pra[t.getAttribute('data-pra')] = potong(v, MAKS_PRA); n++; }
    });
    var upd = aman({ pra: n ? pra : null, praAt: n ? nowIso() : null, praOleh: n ? pengisi(u) : null });
    pesan('Menyimpan isian…');
    kerjakan(function () { return db.ref(nodeBukti(gk)).update(upd); }, function () {
      var d = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {});
      d.pra = upd.pra || null; d.praAt = upd.praAt || null; d.praOleh = upd.praOleh || null; S.praDraft = {};
      if (typeof addLog === 'function') addLog('PKG pra-wawancara', namaGuru(gk));
      pesan(n ? 'Isian tersimpan (' + n + ' jawaban).' : 'Isian dikosongkan.'); render();
    }, 'Gagal menyimpan isian: ');
  }

  // ----- Penilaian diri guru (pembanding angket siswa; tidak memengaruhi usulan skor) -----
  // Tersimpan di pkg_v4_bukti/{periode}/{guru}/diri = {j:{G1:'y'|'k'|'t'}, r:{r1,r2,r3}} + diriAt + diriOleh.
  var MAKS_DIRI = 600, PIL_DIRI = [['y', 'Ya'], ['k', 'Kadang-kadang'], ['t', 'Tidak']];
  function DR() { return window.PKG_ANGKET && window.PKG_ANGKET.diri ? window.PKG_ANGKET : null; }
  function nilaiDiri(gk, jenis, key) {
    var dr = S.diriDraft && S.diriDraft[gk + '|' + jenis + '|' + key]; if (dr != null) return dr;
    var d = dataBukti(gk), x = d && d.diri && d.diri[jenis]; return (x && x[key]) || '';
  }
  function warnaSel(v) { return v == null ? '' : (v >= 15 ? 'color:#b45309;font-weight:700' : (v <= -15 ? 'color:#1d4ed8;font-weight:700' : '')); }
  function diriBanding(gk) {
    var A = DR(), d = dataBukti(gk), a = dataAngket(gk);
    if (!A || !d || !d.diri || !d.diri.j) return '';
    var b = A.banding(d.diri.j, a && a.resp && a.resp.siswa);
    var o = '<div style=\"overflow-x:auto;margin-top:10px\"><table style=\"font-size:12.5px\"><thead><tr><th>Butir</th><th>Indikator</th><th>Diri</th><th>Siswa</th><th>Selisih</th></tr></thead><tbody>' + b.baris.map(function (r) {
      return '<tr><td title=\"' + esc(r.t) + '\">' + r.k + (r.s ? ' / ' + r.s : ' <span class=\"pkg-meta\">khusus guru</span>') + (r.resmi || !r.s ? '' : ' <span class=\"pkg-meta\">pembanding</span>') + '</td><td>' + r.ind + '</td><td>' + (r.diri == null ? '-' : f1(r.diri) + '%') + '</td><td>' + (r.siswa == null ? '-' : f1(r.siswa) + '%') + '</td><td style=\"' + warnaSel(r.selisih) + '\">' + (r.selisih == null ? '-' : (r.selisih > 0 ? '+' : '') + f1(r.selisih)) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return o + '<div class=\"pkg-meta\" style=\"margin-top:4px\">Berdasarkan ' + b.nSiswa + ' jawaban peserta didik. Selisih = diri dikurangi siswa; oranye bila guru menilai dirinya jauh lebih tinggi (&ge; 15), biru bila jauh lebih rendah. Hanya pembanding, tidak mengubah skor.</div>';
  }
  function diriKartu(gk) {
    var A = DR(), u = me(), saya = !!(u && gk === u.key);
    if (!A || (!saya && !adaPenilai(gk))) return '';
    var d = dataBukti(gk), D = A.diri, o = '<div class=\"card\"><h4 style=\"margin:0 0 6px\">📝 Penilaian diri guru</h4>';
    if (!d) return o + '<p class=\"text-muted\" style=\"font-size:12px;margin:0\">Memuat…</p></div>';
    var boleh = saya && bolehUbahBukti(gk), j = (d.diri && d.diri.j) || {}, terisi = D.butir.filter(function (x) { return j[x.k]; }).length;
    o += '<p class=\"text-muted\" style=\"font-size:12px;margin:0 0 8px\">' + (saya ? esc(D.pembuka) : 'Jawaban guru atas ' + D.butir.length + ' butir yang sama dengan angket peserta didik. Terisi <b>' + terisi + '</b> dari ' + D.butir.length + (d.diriAt ? ' (disimpan ' + fmtTgl(String(d.diriAt).slice(0, 10)) + ')' : '') + '. Hanya pembanding, tidak memengaruhi usulan skor.') + '</p>';
    if (boleh) {
      o += '<div data-diriform=\"1\">' + D.butir.map(function (x, i) {
        var v = nilaiDiri(gk, 'j', x.k);
        return '<div style=\"margin:8px 0\"><div style=\"font-size:13px\"><b>' + (i + 1) + '.</b> ' + esc(x.t) + '</div><div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-top:4px\">' + PIL_DIRI.map(function (p) {
          return '<label style=\"flex:1 1 90px;border:2px solid ' + (v === p[0] ? '#0f766e' : '#d1d5db') + ';border-radius:10px;padding:7px;text-align:center;font-size:13px;cursor:pointer;' + (v === p[0] ? 'background:#0f766e;color:#fff;font-weight:700' : '') + '\"><input type=\"radio\" name=\"dj_' + x.k + '\" value=\"' + p[0] + '\" data-diri=\"' + x.k + '\"' + (v === p[0] ? ' checked' : '') + ' style=\"position:absolute;opacity:0\">' + p[1] + '</label>';
        }).join('') + '</div></div>';
      }).join('') + D.refleksi.map(function (r) {
        return '<div style=\"margin:8px 0\"><div style=\"font-size:13px\"><b>' + esc(r[1]) + '</b></div><textarea class=\"field\" data-diri-r=\"' + r[0] + '\" rows=\"2\" maxlength=\"' + MAKS_DIRI + '\" style=\"margin-top:4px\">' + esc(nilaiDiri(gk, 'r', r[0])) + '</textarea></div>';
      }).join('') + '<button type=\"button\" class=\"btn btn-success\" data-act=\"diri-simpan\" style=\"margin-top:4px\">💾 Simpan penilaian diri</button>' + (d.diriAt ? ' <span class=\"pkg-meta\">Terakhir disimpan ' + fmtTgl(String(d.diriAt).slice(0, 10)) + '</span>' : '') + '</div>';
    } else {
      if (saya) o += '<div class=\"pkg-meta\">Penilaian diri terkunci karena penilaian sudah final.</div>';
      var r = (d.diri && d.diri.r) || {};
      if (!saya) o += diriBanding(gk) + D.refleksi.map(function (x) { return r[x[0]] ? '<div style=\"margin-top:8px;font-size:13px\"><b>' + esc(x[1]) + '</b><div style=\"white-space:pre-wrap;padding:6px 8px;background:#f9fafb;border-radius:8px;margin-top:2px\">' + esc(r[x[0]]) + '</div></div>' : ''; }).join('');
      else if (terisi) o += '<div style=\"font-size:13px\">Terisi ' + terisi + ' dari ' + D.butir.length + ' butir.</div>';
    }
    return o + '</div>';
  }
  function simpanDiri(el) {
    var gk = S.gk, u = me(), A = DR();
    if (!A || !u || gk !== u.key || !bolehUbahBukti(gk)) return pesan('Penilaian diri hanya dapat diubah oleh guru yang dinilai, sebelum penilaian final.', true);
    if (!dataBukti(gk)) return pesan('Data masih dimuat, coba lagi sebentar.', true);
    var box = el.closest('[data-diriform]'); if (!box) return;
    var j = {}, r = {}, n = 0;
    Array.prototype.forEach.call(box.querySelectorAll('input[data-diri]:checked'), function (i) { j[i.getAttribute('data-diri')] = i.value; n++; });
    Array.prototype.forEach.call(box.querySelectorAll('textarea[data-diri-r]'), function (t) { var v = String(t.value || '').trim(); if (v) r[t.getAttribute('data-diri-r')] = potong(v, MAKS_DIRI); });
    if (n && n < A.diri.butir.length && !confirm('Baru ' + n + ' dari ' + A.diri.butir.length + ' butir terjawab. Simpan dulu?')) return;
    var ada = n || Object.keys(r).length;
    var upd = aman({ diri: ada ? { j: n ? j : null, r: Object.keys(r).length ? r : null } : null, diriAt: ada ? nowIso() : null, diriOleh: ada ? pengisi(u) : null });
    kerjakan(function () { return db.ref(nodeBukti(gk)).update(upd); }, function () {
      var d = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {});
      d.diri = upd.diri || null; d.diriAt = upd.diriAt || null; d.diriOleh = upd.diriOleh || null; S.diriDraft = {};
      if (typeof addLog === 'function') addLog('PKG penilaian diri', namaGuru(gk));
      pesan(ada ? 'Penilaian diri tersimpan.' : 'Penilaian diri dikosongkan.'); render();
    }, 'Gagal menyimpan penilaian diri: ');
  }

  // ----- aksi bukti -----
  function bukaBukti(gk) {
    if (!bolehPerangkat('bukti', gk)) return pesan('Tidak tersedia untuk Anda.', true);
    S.gk = gk; S.view = 'bukti'; S.otoDari = ''; S.otoSampai = ''; S.praDraft = {}; S.diriDraft = {}; S.wa = null;
    render();
    muatBukti(gk, function () { if (S.view === 'bukti' && S.gk === gk) render(); });
    muatAngket(gk, function () { if (S.view === 'bukti' && S.gk === gk) render(); });
  }
  // v73: kesimpulan observasi. Kalimat templat berbasis aturan dari skor lembar penanda (item.pn.s: 2 seluruhnya, 1 sebagian, 0 tidak ada); bukan AI.
  var OBS_KES = [['baik', 'Hal yang sudah baik'], ['perbaikan', 'Hal yang perlu diperbaiki'], ['tindak', 'Kesepakatan tindak lanjut bersama guru']];
  var OBS_KES_MAKS = 800;
  // v75: kesimpulan disimpan di Firebase (pkg_v4_obskes/{periode}/{guru}) supaya ikut tercetak di perangkat/akun mana pun.
  // localStorage hanya menyimpan DRAFT ketikan yang belum disimpan (dihapus setelah berhasil simpan); draft lama v73 ikut terbaca sebagai draft.
  function obsKesKunci(gk) { var u = me(); return 'pkg_obskes_' + kb(gk) + '_' + (u ? u.key : ''); }
  function obsKesLokal(gk) {
    var v = {}; try { v = JSON.parse(localStorage.getItem(obsKesKunci(gk)) || '{}') || {}; } catch (e) { v = {}; }
    return v;
  }
  function obsKesAmbil(gk) {
    var fb = S.obsKes[kb(gk)] || {}, lk = obsKesLokal(gk), r = {};
    OBS_KES.forEach(function (x) { var l = lk[x[0]]; r[x[0]] = (typeof l === 'string' && l !== '') ? l : (fb[x[0]] || ''); });   // draft lokal yang belum disimpan menang
    return r;
  }
  function obsKesSimpan(gk, v) { try { localStorage.setItem(obsKesKunci(gk), JSON.stringify(v)); } catch (e) { } }
  function muatObsKes(gk, cb) {
    if (!S.periodeId || typeof db === 'undefined') { if (cb) cb(); return; }
    var kunci = kb(gk), pid = S.periodeId;
    siapSesi().then(function () { return db.ref(nodeObsKes(gk)).once('value'); }).then(function (sn) {
      if (pid !== S.periodeId) return; S.obsKes[kunci] = sn.val() || {}; S.obsKesGagal[kunci] = false;
    }).catch(function () { if (!S.obsKes[kunci]) S.obsKes[kunci] = {}; S.obsKesGagal[kunci] = true; }).then(function () { if (cb) cb(); });
  }
  function obsKesSimpanFb(gk) {
    var u = me(); if (!u || !bolehUbahBukti(gk)) return pesan('Tidak dapat menyimpan: penilaian sudah final atau Anda tidak berhak.', true);
    var val = {}, ada = false, salah = '';
    OBS_KES.forEach(function (x) {
      var el = $('pkgObsK_' + x[0]), t = el ? String(el.value || '').trim() : '';
      if (t.length > OBS_KES_MAKS) salah = x[1] + ' terlalu panjang (' + t.length + ' karakter; maksimal ' + OBS_KES_MAKS + ').';
      if (t) { val[x[0]] = t; ada = true; }
    });
    if (salah) return pesan(salah, true);
    if (ada) { val.diperbarui = nowIso(); val.diperbaruiOleh = pengisi(u); }
    var kunci = kb(gk);
    kerjakan(function () { return db.ref(nodeObsKes(gk)).set(ada ? aman(val) : null); }, function () {
      S.obsKes[kunci] = ada ? val : {}; S.obsKesGagal[kunci] = false;
      try { localStorage.removeItem(obsKesKunci(gk)); } catch (e) { }
      if (typeof addLog === 'function') addLog('PKG kesimpulan observasi', namaGuru(gk));
      pesan('Kesimpulan observasi tersimpan.'); render();
    }, 'Gagal menyimpan kesimpulan observasi: ');
  }
  // v79: usulan skor satu indikator pengamatan. Hasil lembar penanda terbaru diutamakan; bila tidak ada dipakai butir Supervisi (Tahap 2).
  // Mengembalikan {s: 0|1|2, dari: 'penanda'|'supervisi'} atau null bila belum ada.
  function usulanSkorObs(gk, no, idx) {
    var key = no + '_' + (idx + 1), s = null;
    daftarItem(gk, key).forEach(function (it) { if (it.jenis === 'observasi' && it.pn && (it.pn.s === 0 || it.pn.s === 1 || it.pn.s === 2)) s = it.pn.s; });   // terurut waktu: yang terakhir dipakai
    if (s !== null) return { s: s, dari: 'penanda' };
    var sv = S.sv[kb(gk)], kk = sv && sv.k && sv.k[String(no)], v = (kk && kk.b) ? kk.b[String(idx + 1)] : undefined;
    return (v === 0 || v === 1 || v === 2) ? { s: v, dari: 'supervisi' } : null;
  }
  function obsKesUsulan(gk) {
    var penuh = [], sebagian = [], belum = [], kosong = [];
    P.komponen.forEach(function (k) {
      k.indikator.forEach(function (ind, i) {
        if (!ind.b.some(function (b) { return RE_OBS.test(b); })) return;
        var key = k.no + '_' + (i + 1), lab = k.no + '.' + (i + 1) + ' ' + potong(ind.t, 70), us = usulanSkorObs(gk, k.no, i), sk = us ? us.s : null;   // v79: penanda, lalu butir Supervisi
        if (sk === 2) penuh.push(lab); else if (sk === 1) sebagian.push(lab); else if (sk === 0) belum.push(lab);
        else if (!daftarItem(gk, key).some(function (it) { return it.jenis === 'observasi'; })) kosong.push(lab);
      });
    });
    var gab = function (a, m) { return a.slice(0, m).join('; ') + (a.length > m ? '; dan ' + (a.length - m) + ' indikator lain' : ''); };
    var r = { baik: '', perbaikan: '', tindak: '' }, perlu = sebagian.concat(belum);
    if (penuh.length) r.baik = potong('Pada pengamatan kelas, indikator berikut terpenuhi seluruhnya: ' + gab(penuh, 4) + '.', OBS_KES_MAKS);
    if (perlu.length || kosong.length) {
      var q = [];
      if (sebagian.length) q.push('terpenuhi sebagian: ' + gab(sebagian, 3));
      if (belum.length) q.push('belum terlihat pada pengamatan: ' + gab(belum, 3));
      if (kosong.length) q.push(kosong.length + ' indikator pengamatan belum dicatat');
      r.perbaikan = potong('Perlu ditingkatkan atau dilengkapi: ' + q.join('; ') + '.', OBS_KES_MAKS);
    }
    if (perlu.length) r.tindak = potong('Guru dan penilai membahas indikator ' + gab(perlu.map(function (x) { return x.split(' ')[0]; }), 4) + ' (contoh praktik dan dukungan yang dibutuhkan), lalu dilakukan pengamatan ulang pada pertemuan berikutnya.', OBS_KES_MAKS);
    else if (kosong.length) r.tindak = 'Penilai melengkapi catatan pengamatan pada indikator yang belum dicatat, lalu hasilnya dibahas bersama guru.';
    return r;
  }
  function obsKesIsi(gk) {
    if (!bolehUbahBukti(gk)) return;
    var us = obsKesUsulan(gk), v = obsKesLokal(gk), n = 0;
    OBS_KES.forEach(function (x) {
      var e = $('pkgObsK_' + x[0]);
      if (e && !String(e.value || '').trim() && us[x[0]]) { e.value = us[x[0]]; v[x[0]] = e.value; n++; }
    });
    obsKesSimpan(gk, v);
    pesan(n ? 'Usulan kesimpulan diisi dari hasil lembar penanda. Periksa, sesuaikan, lalu tekan Simpan kesimpulan.' : 'Tidak ada usulan baru: kolom sudah terisi, atau belum ada hasil pengamatan yang bisa dirangkum.', !n);
  }
  // v72: tombol "Isi otomatis" pada form Tambah catatan observasi. Hanya kerangka dari data yang sudah ada (jadwal, data SI MAMBA, indikator);
  // fakta pengamatan tetap ditulis penilai. Kolom yang sudah terisi tidak ditimpa.
  function obsIsi(el) {
    var gk = S.gk, key = el.getAttribute('data-key'), box = el.closest('[data-bform]');
    if (!box || !key || !bolehUbahBukti(gk)) return;
    var ind = petaIndikator()[String(key).replace('_', '.')];
    if (!ind) return;
    var je = box.querySelector('[data-f="judul"]'), ke = box.querySelector('[data-f="ket"]'), n = 0;
    if (je && !String(je.value || '').trim()) { je.value = 'Pengamatan kelas: ' + potong(ind.t, 90); n++; }
    if (ke && !String(ke.value || '').trim()) {
      var p = [], ja = { pada: [], hariTgl: '' }, d = dataBukti(gk);
      try { ja = jadwalAjar(gk) || ja; } catch (e) { }
      if (ja.pada && ja.pada.length) p.push('Kelas/mapel: ' + ja.pada.map(function (j) { return String(j.kelas || '') + (j.mapel ? ' ' + j.mapel : ''); }).join(', ') + (ja.hariTgl ? ' (' + ja.hariTgl + ')' : '') + '.');
      var o = d && d.otomatis && d.otomatis[key], to = o ? teksOto(d, o) : '';
      if (to) p.push(to + '.');
      ke.value = potong(p.join(' '), 440) + (p.length ? ' ' : '') + 'Fakta teramati: '; n++;
      try { ke.focus(); ke.setSelectionRange(ke.value.length, ke.value.length); } catch (e) { }
    }
    pesan(n ? 'Kerangka catatan diisi. Lengkapi dengan fakta yang teramati, lalu Simpan catatan.' : 'Judul dan catatan sudah terisi; tidak ditimpa.', !n);
  }
  function tambahBukti(el) {
    var gk = S.gk, u = me(), key = el.getAttribute('data-key'), box = el.closest('[data-bform]');
    if (!u || !box || !key) return;
    var f = function (n) { var e = box.querySelector('[data-f="' + n + '"]'); return e ? String(e.value || '').trim() : ''; };
    var jenis = f('jenis') || 'dokumen', judul = f('judul'), tautan = f('tautan'), ket = f('ket');
    if (!bolehJenis(jenis, gk)) return pesan('Anda tidak berhak menambahkan bukti jenis ini.', true);
    if (!judul) return pesan('Judul bukti wajib diisi.', true);
    var url = amanUrl(tautan);
    if (tautan && !url) return pesan('Tautan tidak valid. Gunakan alamat http/https (mis. Google Drive).', true);
    if (url && url.length > 1000) return pesan('Tautan terlalu panjang (maksimal 1000 karakter). Pakai tautan pendek.', true);
    if (itemTotal(gk, key) >= MAKS_ITEM) return pesan('Maksimal ' + MAKS_ITEM + ' bukti per indikator.', true);
    var ref = db.ref(nodeBukti(gk) + '/item/' + key).push();
    var item = { jenis: jenis, judul: potong(judul, 120), oleh: pengisi(u), olehKey: u.key, at: nowIso() };
    if (url) item.tautan = url;
    if (ket) item.ket = potong(ket, 500);
    kerjakan(function () { return ref.set(item); }, function () {
      var d = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {});
      d.item = d.item || {}; d.item[key] = d.item[key] || {}; d.item[key][ref.key] = item;
      if (typeof addLog === 'function') addLog('PKG bukti tambah', namaGuru(gk) + ' ' + key.replace('_', '.'));
      pesan('Bukti tersimpan.'); render();
    }, 'Gagal menyimpan bukti: ');
  }
  function hapusBukti(el) {
    var gk = S.gk, key = el.getAttribute('data-key'), id = el.getAttribute('data-id');
    if (!key || !id || !bolehUbahBukti(gk)) return;
    if (!confirm('Hapus bukti ini?')) return;
    kerjakan(function () { return db.ref(nodeBukti(gk) + '/item/' + key + '/' + id).remove(); }, function () {
      var d = S.bukti[kb(gk)]; if (d && d.item && d.item[key]) { delete d.item[key][id]; if (!Object.keys(d.item[key]).length) delete d.item[key]; }
      if (typeof addLog === 'function') addLog('PKG bukti hapus', namaGuru(gk) + ' ' + key.replace('_', '.'));
      render();
    }, 'Gagal menghapus bukti: ');
  }
  function simpanSiap(gi, nilai) {
    var gk = S.gk;
    if (!bolehUbahBukti(gk)) return render();
    if (S.menyimpan) { render(); return pesan('Sedang menyimpan, coba lagi sebentar.', true); }
    kerjakan(function () { return db.ref(nodeBukti(gk) + '/siap/' + gi).set(nilai ? true : null); }, function () {
      var d = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {}); d.siap = d.siap || {};
      if (nilai) d.siap[gi] = true; else delete d.siap[gi];
      render();
    }, 'Gagal menyimpan centang: ');
  }
  function tarikOtomatis() {
    var gk = S.gk, u = me(), SM = window.PKG_SUMBER;
    if (!SM || typeof SM.jalankan !== 'function') return pesan('Modul js/pkg-sumber.js belum dimuat.', true);
    if (!bolehUbahBukti(gk) || !adaPenilai(gk)) return pesan('Hanya penilai, Kepala Madrasah, atau Admin yang boleh menarik bukti otomatis / penilaian sudah final.', true);
    var rg = rentangOto(), eD = $('pkgOtoDari'), eS = $('pkgOtoSampai');
    var dari = (eD && eD.value) || rg.dari, sampai = (eS && eS.value) || rg.sampai;
    if (dari > sampai) return pesan('Tanggal "Dari" tidak boleh sesudah "Sampai".', true);
    S.otoDari = dari; S.otoSampai = sampai;
    var ctx = { db: db, guruKey: gk, guruNama: namaGuru(gk), dari: dari, sampai: sampai };
    var AD = DR(), bd = dataBukti(gk) || {}, dj = (bd.diri && bd.diri.j) || {};
    if (AD) ctx.diri = { r: (bd.diri && bd.diri.r) || {}, kunciRefleksi: AD.diri.refleksi.map(function (x) { return x[0]; }), butir: AD.diri.butir.length, terjawab: AD.diri.butir.filter(function (x) { return dj[x.k]; }).length };
    pesan('Menarik data absensi, jurnal, nilai, perangkat pembelajaran, buku penghubung, kegiatan madrasah, materi/tugas daring, kehadiran rapat, tugas administratif (10.5), dan penilaian diri…');
    kerjakan(function () {
      return SM.jalankan(ctx).then(function (hasil) {
        var peta = petaOto(), sumber = {}, oto = {}, waktu = nowIso(), adaOk = false;
        Object.keys(hasil).forEach(function (id) {
          var h = hasil[id] || {};
          if (h.ok) { adaOk = true; sumber[id] = { ok: true, ringkas: potong(h.ringkas, 300), saran: (h.saran === 0 || h.saran === 1 || h.saran === 2) ? h.saran : null, dasar: potong(h.dasar || '', 200), rincian: (h.rincian || []).slice(0, 8).map(function (x) { return potong(x, 200); }), angka: h.angka || null, at: waktu }; }
          else sumber[id] = { ok: false, alasan: potong(h.alasan || 'Tidak terbaca.', 400), at: waktu };
        });
        Object.keys(peta).forEach(function (key) {
          var ids = peta[key].filter(function (id) { return sumber[id] && sumber[id].ok; });
          if (!ids.length) return;
          var sr = ids.map(function (id) { var hh = hasil[id], pi = hh && hh.perInd; return (pi && (pi[key] === 0 || pi[key] === 1 || pi[key] === 2)) ? pi[key] : sumber[id].saran; }).filter(function (x) { return x != null; });   // sumber yang menghitung per indikator (perInd) menimpa saran tunggal
          oto[key] = { s: ids.join(','), saran: sr.length ? Math.max.apply(null, sr) : null };   // bukti boleh alternatif -> ambil yang terkuat
        });
        var upd = aman({ otomatis: Object.keys(oto).length ? oto : null, sumberOto: sumber, otoAt: waktu, otoOleh: pengisi(u), otoDari: dari, otoSampai: sampai });
        return db.ref(nodeBukti(gk)).update(upd).then(function () { return { upd: upd, adaOk: adaOk }; });
      });
    }, function (r) {
      var d = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {});
      d.otomatis = r.upd.otomatis || null; d.sumberOto = r.upd.sumberOto; d.otoAt = r.upd.otoAt; d.otoOleh = r.upd.otoOleh; d.otoDari = r.upd.otoDari; d.otoSampai = r.upd.otoSampai;
      if (typeof addLog === 'function') addLog('PKG bukti otomatis', namaGuru(gk));
      pesan(r.adaOk ? 'Bukti otomatis berhasil ditarik.' : 'Tidak ada sumber yang terbaca. Lihat alasannya pada kartu Bukti otomatis.', !r.adaOk);
      render();
    }, 'Gagal menarik bukti otomatis: ', 90000);
  }


  // ----- angket online (peserta didik / orang tua / sejawat) -----
  // Jawaban diisi lewat angket.html (login anonim). Di sini: buka/tutup, bagikan tautan, hitung hasil -> usulan skor.
  function AK() { return window.PKG_ANGKET && typeof window.PKG_ANGKET.hitung === 'function' ? window.PKG_ANGKET : null; }
  function dataAngket(gk) { return S.angket[kb(gk)] || null; }
  function tautanAngket(gk, jenis, tok) {
    try { var u = new URL('angket.html', location.href); u.search = ''; u.hash = ''; u.searchParams.set('p', S.periodeId); u.searchParams.set('g', gk); u.searchParams.set('j', jenis); if (tok) u.searchParams.set('t', tok); return u.toString(); } catch (e) { return ''; }
  }
  // ----- Tautan sekali pakai (kupon) -----
  // Mode 'kupon' (info.mode): jawaban hanya diterima bila id-nya = token yang dibuat penilai di pkg_v4_angket_kupon, dan tiap token
  // hanya bisa dipakai SEKALI (Rules). Jawaban disimpan pada pkg_v4_angket/{p}/{g}/{jenis}/{token}. Mode lain/warisan: tautan terbuka.
  var MAKS_KUPON = 500;                                       // maks. kupon per jenis angket per guru
  function modeKupon(a) { return !!(a && a.info && a.info.mode === 'kupon'); }
  function buatToken() {
    var cs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', b = new Uint8Array(24), t = '';
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < b.length; i++) t += cs.charAt(b[i] % 62);
    return t;
  }
  function kuponSisa(a, j) {                                  // token yang belum dipakai jawaban
    var k = (a && a.kupon && a.kupon[j]) || {}, ids = (a && a.ids && a.ids[j]) || {};
    return Object.keys(k).filter(function (t) { return !ids[t]; }).sort(function (x, y) { return String(k[x]).localeCompare(String(k[y])); });
  }
  function kuponBuat(gk, j, n) {                              // Promise<[token]>; menulis ke Firebase
    var a = dataAngket(gk), upd = {}, tok = [], now = nowIso();
    for (var i = 0; i < n; i++) { var t = buatToken(); tok.push(t); upd[j + '/' + t] = now; }
    return db.ref(N.angketKupon + '/' + S.periodeId + '/' + gk).update(upd).then(function () {
      a.kupon = a.kupon || {}; a.kupon[j] = a.kupon[j] || {};
      tok.forEach(function (t) { a.kupon[j][t] = now; });
      return tok;
    });
  }
  function kuponBoleh(a, j, n) { var ada = Object.keys((a && a.kupon && a.kupon[j]) || {}).length; return ada + n <= MAKS_KUPON; }
  function muatAngket(gk, cb) {
    if (!S.periodeId || typeof db === 'undefined') { if (cb) cb(); return; }
    var kunci = kb(gk), pid = S.periodeId;
    // Jawaban mentah dan kupon hanya bisa dibaca Admin / Kepala / penilai (Rules). Guru yang dinilai hanya membaca info angket;
    // perbandingan Diri vs Siswa untuknya memakai ringkasan per butir di pkg_v4_bukti/.../angketSiswa (diisi penilai saat "Hitung hasil").
    var mentah = adaPenilai(gk);
    siapSesi().then(function () {
      var info = db.ref(N.angketInfo + '/' + pid + '/' + gk).once('value');
      if (!mentah) return Promise.all([info, null, null, null]);
      return Promise.all([info, db.ref(N.angket + '/' + pid + '/' + gk).once('value'),
        db.ref(N.angketKupon + '/' + pid + '/' + gk).once('value').then(function (x) { return x.val() || {}; }, function () { return {}; }),
        db.ref(N.angketJatah + '/' + pid + '/' + gk).once('value').then(function (x) { return x.val() || {}; }, function () { return null; }),   // null = Rules jatah belum dipublikasikan
        db.ref(N.penerima + '/' + pid + '/' + gk).once('value').then(function (x) { return x.val() || {}; }, function () { return null; })]);     // null = Rules penerima belum dipublikasikan
    }).then(function (h) {
      if (pid !== S.periodeId) return;
      var resp = (h[1] && h[1].val()) || {}, daftar = {}, ids = {};
      ['siswa', 'ortu', 'sejawat'].forEach(function (j) {
        var m = resp[j] || {}; ids[j] = {};
        daftar[j] = Object.keys(m).filter(function (id) { return m[id] && typeof m[id] === 'object'; }).map(function (id) { ids[j][id] = 1; return m[id]; });
      });
      S.angket[kunci] = { info: h[0].val() || null, resp: daftar, ids: ids, kupon: h[2] || {}, jatah: h[3] || {}, jatahOk: !!mentah && h[3] !== null && h[3] !== undefined, mentah: mentah, penerima: h[4] };
    }).catch(function (e) {
      console.warn('[PKG] angket gagal dimuat:', e);
      S.angket[kunci] = { info: null, resp: { siswa: [], ortu: [], sejawat: [] }, galat: true };
    }).then(function () { if (cb) cb(); });
  }
  function teksAngket(ak) {
    var A = AK(), J = A && A.jenis[ak.j];
    return 'Angket ' + (J ? J.judul.replace(/^Angket\s+/, '') : ak.j) + ': ' + f1(ak.pct) + '% dari ' + ak.n + ' responden';
  }
  function angketBaris(ak, key) {
    var h = '<div class="pkg-oto">📝 <b>Angket online</b><div class="pkg-oto-baris">' + esc(teksAngket(ak)) + '</div>';
    if (ak.saran != null) h += '<div style="margin-top:6px">Usulan skor <b>' + ak.saran + '</b> <button type="button" class="btn btn-soft" style="padding:3px 10px;font-size:12px" data-act="pakai-saran" data-key="' + esc(key) + '" data-src="angket">✔ Pakai saran</button> <span class="pkg-meta">penilai tetap yang memutuskan</span></div>';
    else h += '<div class="pkg-meta">Belum ada usulan skor: responden kurang dari batas minimum.</div>';
    return h + '</div>';
  }
  function ringkasAngket(d) {
    var A = AK(), n = d.angketN || {}, t = [];
    if (A) A.urut.forEach(function (j) { t.push(A.jenis[j].judul.replace(/^Angket\s+/, '') + ' ' + (n[j] || 0)); });
    var b = d.angketBanding || {}, bk = Object.keys(b).sort(function (x, y) { return parseInt(x.slice(1), 10) - parseInt(y.slice(1), 10); });
    return 'Responden: ' + t.join(', ') + '.' + (bk.length ? ' Pembanding observasi: ' + bk.map(function (k) { return k + ' (' + b[k].ind + ') ' + f1(b[k].pct) + '%'; }).join(', ') + '.' : '');
  }
  function angketKartu(gk) {
    var A = AK(); if (!A || !adaPenilai(gk)) return '';
    var a = dataAngket(gk), boleh = bolehUbahBukti(gk), d = dataBukti(gk);
    var o = '<div class="card"><h4 style="margin:0 0 4px">📝 Angket online</h4><p class="text-muted" style="font-size:12px;margin:0 0 8px">Bagikan tautan ke peserta didik, orang tua/komite, atau sejawat. Madrasah hanya mencatat sudah atau belum mengisi; jawaban hanya tampil sebagai rekap, tidak per orang.</p>';
    if (!a) return o + '<p class="text-muted" style="margin:0">Memuat angket…</p></div>';
    if (a.galat) o += '<p style="color:#b91c1c;font-size:12.5px;margin:0 0 6px">Data angket belum bisa dibaca. Pastikan firebase-rules-pkg.json (versi berperan) sudah dipublikasikan dan Anda penilai guru ini / Kepala / Admin.</p>';
    var aktif = !!(a.info && a.info.aktif);
    o += '<div style="font-size:13px;margin-bottom:6px">Status angket: ' + (aktif ? '<b style="color:#15803d">dibuka</b>' : '<b>ditutup / belum dibuka</b>') + '</div>';
    var kup = !a.info || modeKupon(a);                          // angket baru otomatis mode tautan sekali pakai
    if (a.info && !kup) o += '<div style="font-size:12.5px;margin:0 0 8px;padding:8px 10px;border-radius:8px;background:#fef3c7;color:#92400e">⚠️ Mode <b>tautan terbuka</b> (warisan): satu tautan bisa diisi berulang kali oleh siapa pun. ' + (boleh ? '<button type="button" class="btn btn-soft" style="padding:3px 10px;font-size:12px" data-act="angket-mode">Ganti ke tautan sekali pakai</button>' : '') + '</div>';
    else if (kup) o += '<div class="pkg-meta" style="margin-bottom:6px">🎟️ Mode <b>tautan sekali pakai</b>: tiap responden menerima tautan sendiri; satu tautan hanya bisa mengirim satu jawaban.</div>';
    A.urut.forEach(function (j) {
      var J = A.jenis[j], n = (a.resp[j] || []).length;
      o += '<div class="pkg-ind" style="margin:6px 0"><div><b>' + esc(J.judul) + '</b> <span class="text-muted" style="font-size:12px">— ' + n + ' jawaban (minimal ' + J.min + ' untuk usulan skor)</span></div><div class="pkg-meta">' + esc(J.sasaran) + '</div>';
      if (aktif && !kup) o += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="angket-salin" data-j="' + j + '">📋 Salin tautan</button><button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="angket-wa" data-j="' + j + '">💬 Kirim via WhatsApp</button></div>';
      if (aktif && kup && a.info) {
        var tot = Object.keys((a.kupon && a.kupon[j]) || {}).length, sisa = kuponSisa(a, j).length;
        o += '<div class="pkg-meta" style="margin-top:4px">Tautan dibuat <b>' + tot + '</b>, terpakai <b>' + (tot - sisa) + '</b>, tersisa <b>' + sisa + '</b>.</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;align-items:center"><input type="number" min="1" max="200" value="' + (j === 'siswa' ? 30 : (j === 'ortu' ? 10 : 5)) + '" class="field" data-kupon-n="' + j + '" style="width:70px;padding:4px;font-size:12px" aria-label="Jumlah tautan">' +
          '<button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="kupon-buat" data-j="' + j + '"' + (boleh ? '' : ' disabled') + '>🎟️ Buat tautan</button>' +
          '<button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="kupon-salin" data-j="' + j + '" data-m="satu"' + (sisa ? '' : ' disabled') + '>📋 Salin 1 tautan</button>' +
          '<button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="kupon-salin" data-j="' + j + '" data-m="semua"' + (sisa ? '' : ' disabled') + '>📋 Salin semua tersisa</button></div>';
      }
      if (aktif && kup && a.info && a.mentah && j !== 'sejawat') o += penerimaHtml(gk, a, j);
      if (aktif && a.info && a.mentah) o += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center"><input type="text" class="field" data-kode="' + j + '" maxlength="12" placeholder="Kode bukti, mis. ABCD-EFGH" style="width:190px;padding:4px;font-size:12px" aria-label="Kode bukti pengisian"><button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="kode-cek" data-j="' + j + '">🔎 Cek kode bukti</button></div>';
      if (aktif && kup && a.info && j === 'sejawat') o += jatahPenilaiHtml(gk, a, boleh);
      o += '</div>';
    });
    if (aktif) o += waPanel(gk);
    if (boleh) o += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
      '<button type="button" class="btn ' + (aktif ? 'btn-soft' : 'btn-success') + '" style="padding:5px 12px;font-size:12.5px" data-act="angket-toggle">' + (aktif ? '⏹ Tutup angket' : '▶ Buka angket') + '</button>' +
      '<button type="button" class="btn btn-soft" style="padding:5px 12px;font-size:12.5px" data-act="angket-muat">🔄 Muat ulang jawaban</button>' +
      '<button type="button" class="btn btn-success" style="padding:5px 12px;font-size:12.5px" data-act="angket-tarik">📊 Hitung hasil ke bukti</button></div>';
    if (d && d.angketAt) o += '<div class="pkg-meta" style="margin-top:6px">Hasil terakhir dihitung ' + fmtTgl(String(d.angketAt).slice(0, 10)) + '. ' + esc(ringkasAngket(d)) + '</div>';
    return o + '</div>';
  }

  // ----- Kirim angket siswa ke WhatsApp wali murid (antrean: satu klik = satu chat WA terbuka) -----
  // Memakai kirimWA / allSiswa / formatNomorWa milik app.js, pola sama dengan antrean tunggakan infaq.
  // WhatsApp tidak mengizinkan kirim massal otomatis. Penanda "terkirim" hanya berlaku selama sesi (hilang saat muat ulang).
  function waSiap() { return typeof allSiswa !== 'undefined' && Array.isArray(allSiswa) && typeof kirimWA === 'function' && typeof formatNomorWa === 'function'; }
  function waAdaNo(x) { return !!(x && x.noWaOrtu) && formatNomorWa(x.noWaOrtu).length >= 10; }
  function waKelas456(k) { return /^\s*(kelas\s*)?([456]|IV|VI|V)(?![0-9IVXivx])/i.test(String(k || '')); }
  function waState(gk) { if (!S.wa || S.wa.gk !== gk) S.wa = { gk: gk, jenis: 'siswa', kelas: '', sent: { siswa: {}, ortu: {} }, ant: null }; return S.wa; }
  function waNo(x) { return formatNomorWa(x.noWaOrtu); }
  function waJudul(jenis) { return jenis === 'ortu' ? 'orang tua' : 'siswa'; }
  function waDaftarKelas(jenis) {
    var m = {}; allSiswa.forEach(function (x) { if (x && x.kelas) m[x.kelas] = 1; });
    var semua = Object.keys(m).sort();
    if (jenis === 'ortu') return semua;                         // angket orang tua: semua kelas boleh (orang tua kelas 1\u20133 juga bisa menjawab)
    var sub = semua.filter(waKelas456); return sub.length ? sub : semua;
  }
  function waItems(gk) {
    var st = waState(gk); if (!st.kelas) return [];
    var sent = st.sent[st.jenis], lihat = {};
    return allSiswa.filter(function (x) {
      if (!x || x.kelas !== st.kelas || !waAdaNo(x)) return false;
      if (st.jenis === 'ortu') { var n = waNo(x); if (sent['n' + n] || lihat[n]) return false; lihat[n] = 1; return true; }   // satu pesan per nomor WA wali
      return !sent[x.key];
    }).map(function (x) { return x.key; });
  }
  function waPesan(x, gk, tok, jenis) {
    var nm = (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) ? MADRASAH.nama : 'Madrasah';
    var isi = jenis === 'ortu'
      ? 'Dalam rangka penilaian kinerja guru, mohon Bapak/Ibu mengisi angket singkat tentang guru *' + namaGuru(gk) + '* berikut (sekitar 3 menit; madrasah hanya mencatat sudah atau belum mengisi, jawaban hanya tampil sebagai rekap; tautan ini khusus untuk satu kali pengisian). Pilih \u201cTidak tahu\u201d bila belum mengetahuinya:\n'
      : 'Dalam rangka penilaian kinerja guru, mohon ananda dibantu mengisi angket singkat tentang guru *' + namaGuru(gk) + '* berikut (sekitar 3 menit; madrasah hanya mencatat sudah atau belum mengisi, jawaban hanya tampil sebagai rekap; tautan ini khusus untuk satu kali pengisian). Mohon ananda menjawab jujur sesuai yang ia rasakan:\n';
    return 'Assalamu\u2019alaikum, Bapak/Ibu wali dari ananda *' + x.name + '* (' + x.kelas + ').\n\n' + isi + tautanAngket(gk, jenis === 'ortu' ? 'ortu' : 'siswa', tok) + '\n\nTerima kasih.\nWassalamu\u2019alaikum warahmatullahi wabarakatuh.\n\n- ' + nm;
  }
  function waPanel(gk) {
    if (!waSiap()) return '';
    var st = waState(gk), a = st.ant, jn = a ? a.jenis : st.jenis, kls = waDaftarKelas(jn);
    var o = '<div class="pkg-ind" style="margin:6px 0;border:1px solid #25D366;border-radius:10px"><div><b>\ud83d\udcf2 Kirim ke wali murid lewat WhatsApp</b></div><div class="pkg-meta">Pilih jenis angket dan kelas, lalu tekan tombol satu per satu. Setiap klik membuka satu chat WhatsApp berisi tautan angket; Anda tinggal menekan Kirim di WhatsApp. ' +
      (jn === 'ortu' ? 'Angket orang tua: satu pesan per nomor WA (wali yang punya beberapa anak hanya dikirimi sekali). Semua kelas boleh.' : 'Kelas 1\u20133 sebaiknya tidak dikirimi angket siswa (dibacakan guru lain).') + '</div>';
    o += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center">';
    if (!a) o += '<select class="field" data-act="wa-jenis" aria-label="Jenis angket" style="font-size:12px;padding:5px;max-width:170px"><option value="siswa"' + (st.jenis === 'siswa' ? ' selected' : '') + '>Angket siswa</option><option value="ortu"' + (st.jenis === 'ortu' ? ' selected' : '') + '>Angket orang tua</option></select>' +
      '<select class="field" data-act="wa-kelas" style="font-size:12px;padding:5px;max-width:170px"><option value="">Pilih kelas\u2026</option>' + kls.map(function (k) { return '<option value="' + esc(k) + '"' + (k === st.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>';
    if (st.kelas && !a) {
      var n = waItems(gk).length, tanpa = allSiswa.filter(function (x) { return x && x.kelas === st.kelas && !waAdaNo(x); }).length;
      o += n ? '<button type="button" class="btn" style="padding:5px 12px;font-size:12px;background:#25D366;color:#fff" data-act="wa-mulai">\u25b6 Mulai antrean (' + n + ' wali)</button>' : '<span class="pkg-meta">Tidak ada wali yang belum dikirimi.</span>';
      if (tanpa) o += '<span class="pkg-meta">' + tanpa + ' siswa tanpa nomor WA wali valid.</span>';
    }
    o += '</div>';
    if (a) {
      var kotak;
      if (a.i >= a.items.length) kotak = '<div style="font-size:12px">\u2705 Antrean ' + waJudul(a.jenis) + ' selesai: <b>' + a.kirim + '</b> chat dibuka, <b>' + a.lewat + '</b> dilewati.</div><button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:11px;margin-top:6px" data-act="wa-tutup">Tutup</button>';
      else {
        var x = allSiswa.filter(function (y) { return y && y.key === a.items[a.i]; })[0];
        kotak = '<div class="pkg-meta">Antrean WA ' + waJudul(a.jenis) + ' ' + (a.i + 1) + ' dari ' + a.items.length + '</div><div style="font-size:13px;margin:2px 0 8px"><b>' + esc(x ? x.name : '-') + '</b> (' + esc(x ? x.kelas : '') + ')</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn" style="padding:5px 12px;font-size:12px;background:#25D366;color:#fff" data-act="wa-buka">\ud83d\udcf2 Buka WA &amp; lanjut</button><button type="button" class="btn btn-soft" style="padding:5px 12px;font-size:12px" data-act="wa-lewati">\u23ed\ufe0f Lewati</button><button type="button" class="btn btn-soft" style="padding:5px 12px;font-size:12px" data-act="wa-tutup">\u2716 Berhenti</button></div>';
      }
      o += '<div style="background:rgba(37,211,102,.12);border-radius:10px;padding:10px 12px;margin-top:8px">' + kotak + '</div>';
    }
    return o + '</div>';
  }
  // ----- v56: catatan penerima tautan -> daftar Sudah/Belum mengisi + pengingat (isi jawaban tidak pernah ditampilkan per orang) -----
  function catatPenerima(gk, jenis, tok, x) {
    var pid = S.periodeId, rec = { sk: potong(x.key, 60), n: potong(x.name, 120), kls: potong(x.kelas, 40), at: nowIso() }, ak = dataAngket(gk);
    if (ak) { if (!ak.penerima) ak.penerima = {}; (ak.penerima[jenis] = ak.penerima[jenis] || {})[tok] = rec; }
    siapSesi().then(function () { return db.ref(N.penerima + '/' + pid + '/' + gk + '/' + jenis + '/' + tok).set(aman(rec)); }).catch(function (e) {
      console.warn('[PKG] catat penerima gagal:', e);
      pesan('Penerima tidak tercatat (daftar Sudah/Belum tidak akan lengkap). Pasang Rules pkg_v4_angket_penerima (lihat rules-angket-penerima.txt).', true);
    });
  }
  function urutPenerima(m) { return Object.keys(m).sort(function (a, b) { return String(m[a].kls || '').localeCompare(String(m[b].kls || '')) || String(m[a].n || '').localeCompare(String(m[b].n || '')); }); }
  function penerimaHtml(gk, a, j) {
    if (a.penerima === null) return '<div style="font-size:12px;color:#b91c1c;margin-top:4px">Catatan penerima belum bisa dibaca. Pasang Rules pkg_v4_angket_penerima (lihat rules-angket-penerima.txt).</div>';
    if (a.penerima === undefined) return '';
    var m = a.penerima[j] || {}, ids = (a.ids && a.ids[j]) || {}, toks = urutPenerima(m);
    if (!toks.length) return '<div class="pkg-meta" style="margin-top:4px">Belum ada penerima tercatat. Penerima tercatat otomatis saat tautan dikirim lewat tombol WhatsApp di bawah.</div>';
    var sudah = toks.filter(function (t) { return ids[t]; }).length, belum = toks.length - sudah, bisaIngat = !!(a.info && a.info.aktif) && waSiap();
    var o = '<details' + (S.pnBuka && S.pnBuka[j] ? ' open' : '') + ' style="margin-top:6px"><summary style="font-size:12.5px;cursor:pointer"><b>👥 Status pengisian</b>: ' + sudah + ' dari ' + toks.length + ' sudah mengisi</summary>' +
      '<div class="pkg-meta" style="margin:4px 0">Hanya status sudah atau belum; isi jawaban tidak ditampilkan per orang. Bila baru ada yang mengisi, tekan Muat ulang.</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0"><button type="button" class="btn btn-soft" style="padding:3px 10px;font-size:12px" data-act="angket-muat">🔄 Muat ulang</button>' +
      (belum && bisaIngat ? '<button type="button" class="btn" style="padding:3px 10px;font-size:12px;background:#25D366;color:#fff" data-act="ingat-wa" data-j="' + j + '" data-t="">💬 Ingatkan berikutnya (' + belum + ' belum)</button>' : '') + '</div>';
    toks.forEach(function (t) {
      var r = m[t], ok = !!ids[t];
      o += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:3px 0;border-top:1px solid #f3f4f6;font-size:12.5px"><span>' + (ok ? '✔' : '⏳') + ' wali dari <b>' + esc(r.n || '-') + '</b> <span class="text-muted">(' + esc(r.kls || '') + ')</span>' + (!ok && S.ingat && S.ingat[t] ? ' <span class="pkg-meta">sudah diingatkan</span>' : '') + '</span>' +
        (!ok && bisaIngat ? '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px" data-act="ingat-wa" data-j="' + j + '" data-t="' + esc(t) + '">💬 Ingatkan</button>' : '') + '</div>';
    });
    return o + '</details>';
  }
  function ingatWa(el) {
    var gk = S.gk, j = el.getAttribute('data-j'), t = el.getAttribute('data-t'), a = dataAngket(gk);
    if (!a || !a.penerima || !adaPenilai(gk)) return pesan('Tidak tersedia untuk Anda.', true);
    if (!(a.info && a.info.aktif)) return pesan('Angket sedang ditutup. Buka angket dulu bila ingin mengingatkan.', true);
    if (!waSiap()) return pesan('Fitur WhatsApp belum tersedia.', true);
    var m = a.penerima[j] || {}, ids = (a.ids && a.ids[j]) || {}; S.ingat = S.ingat || {};
    if (!t) { t = urutPenerima(m).filter(function (k) { return !ids[k] && !S.ingat[k]; })[0]; if (!t) return pesan('Semua yang belum mengisi sudah diingatkan pada sesi ini. Muat ulang untuk melihat yang terbaru.'); }
    var r = m[t]; if (!r) return; if (ids[t]) return pesan('Responden ini sudah mengisi.');
    var x = allSiswa.filter(function (y) { return y && y.key === r.sk; })[0];
    if (!x || !waAdaNo(x)) return pesan('Nomor WA wali tidak ditemukan atau tidak valid.', true);
    S.ingat[t] = true; (S.pnBuka = S.pnBuka || {})[j] = true;
    kirimWA(x.noWaOrtu, waIngatPesan(x, gk, t, j));
    try { if (typeof addLog === 'function') addLog('PKG angket ingatkan', (j === 'ortu' ? 'ortu ' : '') + x.kelas + ' - ' + x.name); } catch (e) { }
    render();
  }
  function waIngatPesan(x, gk, tok, jenis) {
    var nm = (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) ? MADRASAH.nama : 'Madrasah';
    return 'Assalamu\u2019alaikum, Bapak/Ibu wali dari ananda *' + x.name + '* (' + x.kelas + ').\n\nMengingatkan dengan hormat: angket penilaian kinerja guru *' + namaGuru(gk) + '* belum terisi. ' + (jenis === 'ortu' ? 'Mohon Bapak/Ibu berkenan mengisinya' : 'Mohon ananda dibantu mengisinya') + ' (sekitar 3 menit) lewat tautan khusus berikut:\n' + tautanAngket(gk, jenis === 'ortu' ? 'ortu' : 'siswa', tok) + '\n\nMadrasah hanya mencatat sudah atau belum mengisi; jawaban hanya tampil sebagai rekap.\nTerima kasih.\n\n- ' + nm;
  }
  function waBuka() {
    var gk = S.gk, st = waState(gk), a = st.ant, ak = dataAngket(gk);
    if (!a || a.i >= a.items.length) return;
    if (!adaPenilai(gk)) return pesan('Anda tidak berhak mengirim angket untuk guru ini.', true);
    if (!(ak && ak.info && ak.info.aktif)) return pesan('Angket belum dibuka. Buka angket dulu.', true);
    var key = a.items[a.i], x = allSiswa.filter(function (y) { return y && y.key === key; })[0];
    if (!x || !waAdaNo(x)) { a.i++; a.lewat++; return render(); }
    var tokS = a.tok ? a.tok[key] : '';
    if (a.tok && !tokS) { a.i++; a.lewat++; return render(); }
    a.i++; a.kirim++; st.sent[a.jenis][a.jenis === 'ortu' ? 'n' + waNo(x) : key] = true;   // maju dulu, lalu buka WA (harus di dalam klik agar tidak diblokir popup)
    if (tokS) catatPenerima(gk, a.jenis, tokS, x);
    kirimWA(x.noWaOrtu, waPesan(x, gk, tokS, a.jenis));
    try { if (typeof addLog === 'function') addLog('PKG angket WA', (a.jenis === 'ortu' ? 'ortu ' : '') + x.kelas + ' - ' + x.name); } catch (e) { console.error('[PKG] addLog angket WA gagal:', e); }
    render();
  }

  // ----- Jatah angket sejawat (v22): tautan sekali pakai otomatis di akun tiap guru sejawat -----
  // Penilai menekan satu tombol -> tiap guru lain mendapat token sendiri (pkg_v4_angket_jatah/{p}/{guruDinilai}/{guruSejawat})
  // yang sekaligus terdaftar sebagai kupon jenis 'sejawat'. Guru sejawat melihat tautannya di menu PKG (kartu \"Angket sejawat untuk Anda isi\").
  var AMAN_KEY = /^[A-Za-z0-9_\-]+$/;
  function jatahPenilaiHtml(gk, a, boleh) {
    var lain = guruAktif().filter(function (g) { return g.key && g.key !== gk && AMAN_KEY.test(g.key); });
    var ada = lain.filter(function (g) { return a.jatah && a.jatah[g.key]; }).length, kurang = lain.length - ada;
    var o = '<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(15,118,110,.08)"><div style="font-size:12.5px"><b>\ud83d\udc65 Tautan otomatis di akun guru</b>: ' + ada + ' dari ' + lain.length + ' guru lain sudah mendapat tautan sendiri. Tautan muncul di menu PKG masing-masing guru.</div>';
    if (!a.jatahOk) o += '<div style="font-size:12px;color:#b91c1c;margin-top:4px">Data jatah belum bisa dibaca. Publikasikan firebase-rules-pkg.json (versi v22, node pkg_v4_angket_jatah) lebih dulu.</div>';
    else if (boleh && kurang > 0) o += '<button type="button" class="btn btn-soft" style="margin-top:6px;padding:4px 10px;font-size:12px" data-act="jatah-buat">\ud83d\udc65 Bagikan ke ' + kurang + ' guru</button>';
    if (a.jatahOk) {
      var tok = (a.jatah || {}), ids = (a.ids && a.ids.sejawat) || {}, ada2 = lain.filter(function (g) { return tok[g.key]; }), blm = ada2.filter(function (g) { return !ids[tok[g.key]]; });
      if (ada2.length) o += '<details style="margin-top:6px"><summary style="font-size:12.5px;cursor:pointer"><b>👥 Status pengisian</b>: ' + (ada2.length - blm.length) + ' dari ' + ada2.length + ' guru sudah mengisi</summary>' +
        '<div class="pkg-meta" style="margin:4px 0">Hanya status sudah atau belum; isi jawaban tidak ditampilkan per orang.</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0"><button type="button" class="btn btn-soft" style="padding:3px 10px;font-size:12px" data-act="angket-muat">🔄 Muat ulang</button>' + (blm.length && boleh ? '<button type="button" class="btn btn-soft" style="padding:3px 10px;font-size:12px" data-act="jatah-ingat">🔔 Ingatkan ' + blm.length + ' guru yang belum</button>' : '') + '</div>' +
        ada2.map(function (g) { return '<div style="padding:3px 0;border-top:1px solid #f3f4f6;font-size:12.5px">' + (ids[tok[g.key]] ? '✔' : '⏳') + ' ' + esc(g.name || g.key) + '</div>'; }).join('') + '</details>';
    }
    return o + '</div>';
  }
  function jatahIngat() {
    var gk = S.gk, a = dataAngket(gk);
    if (!a || !a.jatahOk || !adaPenilai(gk)) return pesan('Tidak tersedia untuk Anda.', true);
    var ids = (a.ids && a.ids.sejawat) || {}, blm = guruAktif().filter(function (g) { return g.key && g.key !== gk && a.jatah && a.jatah[g.key] && !ids[a.jatah[g.key]]; });
    if (!blm.length) return pesan('Semua guru sudah mengisi.');
    if (!confirm('Kirim pengingat dalam aplikasi ke ' + blm.length + ' guru yang belum mengisi angket sejawat untuk ' + namaGuru(gk) + '?')) return;
    blm.forEach(function (g) { kabari(g.key, 'PKG: angket sejawat belum diisi', 'Mohon isi angket sejawat untuk ' + namaGuru(gk) + ' di menu PKG Guru (kartu \"Angket sejawat untuk Anda isi\"). Sekitar 3 menit.'); });
    if (typeof addLog === 'function') addLog('PKG angket ingatkan sejawat', namaGuru(gk) + ' x' + blm.length);
    pesan('Pengingat dikirim ke ' + blm.length + ' guru.');
  }
  function jatahBuat() {
    var gk = S.gk, a = dataAngket(gk), pid = S.periodeId;
    if (!a || !a.info || !modeKupon(a)) return pesan('Angket harus memakai tautan sekali pakai.', true);
    if (!a.info.aktif) return pesan('Buka angket dulu.', true);
    if (!bolehUbahBukti(gk) || !adaPenilai(gk)) return pesan('Anda tidak berhak membagikan tautan angket untuk guru ini / penilaian sudah final.', true);
    if (!a.jatahOk) return pesan('Data jatah belum bisa dibaca. Publikasikan Rules v22 (pkg_v4_angket_jatah) lebih dulu.', true);
    var baru = guruAktif().filter(function (g) { return g.key && g.key !== gk && AMAN_KEY.test(g.key) && !(a.jatah && a.jatah[g.key]); });
    if (!baru.length) return pesan('Semua guru lain sudah mendapat tautan.');
    if (!kuponBoleh(a, 'sejawat', baru.length)) return pesan('Batas ' + MAKS_KUPON + ' tautan sejawat per guru terlampaui.', true);
    if (!confirm('Bagikan tautan angket sejawat ke ' + baru.length + ' guru lain? Tiap guru akan melihat tautannya sendiri di menu PKG.')) return;
    var upd = {}, peta = {}, now = nowIso(), updKupon = {}, updJatah = {};
    baru.forEach(function (g) {
      var t = buatToken(); peta[g.key] = t;
      updJatah[g.key] = t; updKupon['sejawat/' + t] = now;
      upd[N.angketJatah + '/' + pid + '/' + gk + '/' + g.key] = t; upd[N.angketKupon + '/' + pid + '/' + gk + '/sejawat/' + t] = now;
    });
    var nodeJatah = N.angketJatah + '/' + pid + '/' + gk, nodeKupon = N.angketKupon + '/' + pid + '/' + gk;
    function ditolak(e) { return !!e && (e.code === 'PERMISSION_DENIED' || /permission[_ ]denied/i.test(String(e.message || e))); }
    // v38: bila tulis atomik ditolak Rules, ulangi bertahap (kupon dulu, lalu jatah) supaya jelas node mana yang ditolak
    // dan supaya Rules jatah yang memeriksa keberadaan kupon ikut terpenuhi.
    function bertahap(e0) {
      return db.ref(nodeKupon).update(updKupon).then(function () {
        return db.ref(nodeJatah).update(updJatah).catch(function (e2) {
          // gagal di jatah: batalkan kupon yatim (best-effort) agar tidak menghabiskan batas kupon
          var undo = {}; Object.keys(updKupon).forEach(function (k) { undo[k] = null; });
          db.ref(nodeKupon).update(undo).catch(function () {});
          if (ditolak(e2)) throw new Error('Rules MENOLAK menulis ' + nodeJatah + '/<guru>. Tempel/publikasikan Rules node pkg_v4_angket_jatah (lihat rules-angket-jatah.txt), lalu coba lagi.');
          throw e2;
        });
      }, function (e1) {
        if (ditolak(e1)) throw new Error('Rules MENOLAK menulis ' + nodeKupon + '/sejawat/<token>. Periksa Rules pkg_v4_angket_kupon untuk jenis "sejawat" (lihat rules-angket-jatah.txt).');
        throw e1;
      });
    }
    kerjakan(function () { return db.ref().update(upd).catch(function (e) { if (!ditolak(e)) throw e; return bertahap(e); }); }, function () {
      a.jatah = a.jatah || {}; a.kupon = a.kupon || {}; a.kupon.sejawat = a.kupon.sejawat || {};
      Object.keys(peta).forEach(function (k) { a.jatah[k] = peta[k]; a.kupon.sejawat[peta[k]] = now; });
      if (typeof addLog === 'function') addLog('PKG angket jatah', namaGuru(gk) + ' sejawat x' + baru.length);
      pesan('Tautan dibagikan ke ' + baru.length + ' guru. Mereka melihatnya di menu PKG.'); render();
    }, 'Gagal membagikan tautan: ');
  }
  // sisi guru sejawat: cari angket sejawat yang aktif untuk guru lain yang sedang dinilai, lalu baca jatah milik sendiri
  function muatJatah() {
    var u = me(), pid = S.periodeId, id = ++S.jatahId;
    S.jatah = [];
    if (!u || adm() || kep() || !pid) return;
    var daftar = Object.keys(S.tugas || {}).filter(function (g) { var t = S.tugas[g]; return g !== u.key && t && t.penilaiKey && AMAN_KEY.test(g); });
    if (!daftar.length) return;
    siapSesi().then(function () {
      return Promise.all(daftar.map(function (g) {
        return db.ref(N.angketInfo + '/' + pid + '/' + g).once('value').then(function (s) {
          var i = s.val(); if (!i || i.aktif !== true || i.mode !== 'kupon') return null;
          return db.ref(N.angketJatah + '/' + pid + '/' + g + '/' + u.key).once('value').then(function (x) {
            var t = x.val(); return (typeof t === 'string' && /^[A-Za-z0-9]{20,40}$/.test(t)) ? { gk: g, nama: i.nama || namaGuru(g), token: t } : null;
          });
        }).catch(function () { return null; });       // ditolak Rules / belum ada: lewati
      }));
    }).then(function (hasil) {
      if (id !== S.jatahId || pid !== S.periodeId) return;
      S.jatah = hasil.filter(Boolean).sort(function (x, y) { return String(x.nama).localeCompare(String(y.nama)); });
      if (S.jatah.length && S.view === 'list') render();
    }).catch(function (e) { console.warn('[PKG] jatah angket sejawat gagal dimuat:', e); });
  }
  function jatahSudah(tok) { try { return localStorage.getItem('pkgAngket_' + tok) === '1'; } catch (e) { return false; } }
  function jatahKartu() {
    if (!S.jatah || !S.jatah.length || bolehKelola()) return '';
    var sisa = S.jatah.filter(function (x) { return !jatahSudah(x.token); }).length;
    var o = '<div class="card" style="border:1px solid #0f766e"><h4 style="margin:0 0 4px">\ud83d\udcdd Angket sejawat untuk Anda isi' + (sisa ? ' <span class="pkg-chip" style="background:#0f766e">' + sisa + '</span>' : '') + '</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Penilaian kinerja rekan sedang berjalan. Mohon isi angket untuk rekan di bawah ini (sekitar 3 menit). Jawaban tidak memuat nama Anda. Tautan ini khusus untuk Anda dan hanya bisa dipakai sekali; jangan dibagikan.</p>';
    S.jatah.forEach(function (x) {
      var sudah = jatahSudah(x.token), url = tautanAngket(x.gk, 'sejawat', x.token);
      o += '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:6px 0;border-top:1px solid #f3f4f6"><span style="font-size:13px"><b>' + esc(x.nama) + '</b>' + (sudah ? ' <span class="pkg-meta">\u2714 sudah diisi di perangkat ini</span>' : '') + '</span>' +
        (sudah ? '' : '<a class="btn btn-success" style="padding:5px 12px;font-size:12px;text-decoration:none" href="' + esc(url) + '" target="_blank" rel="noopener">Isi angket</a>') + '</div>';
    });
    return o + '</div>';
  }

  function angketToggle() {
    var gk = S.gk, a = dataAngket(gk), u = me();
    if (!a || !bolehUbahBukti(gk) || !adaPenilai(gk) || !u) return pesan('Anda tidak berhak mengubah status angket ini.', true);
    var buka = !(a.info && a.info.aktif);
    var info = { nama: potong(namaGuru(gk), 120), aktif: buka, dibuat: (a.info && a.info.dibuat) || nowIso(), mode: a.info ? (a.info.mode || 'terbuka') : 'kupon' };
    kerjakan(function () { return db.ref(N.angketInfo + '/' + S.periodeId + '/' + gk).set(aman(info)); }, function () {
      a.info = info; if (typeof addLog === 'function') addLog('PKG angket ' + (buka ? 'buka' : 'tutup'), namaGuru(gk));
      pesan(buka ? 'Angket dibuka. Bagikan tautannya.' : 'Angket ditutup.'); render();
    }, 'Gagal mengubah status angket: ');
  }
  function angketMode() {
    var gk = S.gk, a = dataAngket(gk);
    if (!a || !a.info || !bolehUbahBukti(gk) || !adaPenilai(gk)) return pesan('Anda tidak berhak mengubah mode angket ini.', true);
    if (!confirm('Ganti ke tautan sekali pakai? Tautan terbuka lama berhenti menerima jawaban baru; jawaban yang sudah masuk tetap tersimpan. Buat tautan baru untuk tiap responden.')) return;
    var info = { nama: a.info.nama || potong(namaGuru(gk), 120), aktif: !!a.info.aktif, dibuat: a.info.dibuat || nowIso(), mode: 'kupon' };
    kerjakan(function () { return db.ref(N.angketInfo + '/' + S.periodeId + '/' + gk).set(aman(info)); }, function () {
      a.info = info; if (typeof addLog === 'function') addLog('PKG angket mode', namaGuru(gk) + ' kupon');
      pesan('Mode tautan sekali pakai aktif. Buat tautan untuk responden.'); render();
    }, 'Gagal mengganti mode angket: ');
  }
  function kuponBuatAksi(el) {
    var gk = S.gk, a = dataAngket(gk), j = el.getAttribute('data-j'), A = AK();
    if (!a || !a.info || !A || !A.jenis[j] || !modeKupon(a)) return;
    if (!bolehUbahBukti(gk) || !adaPenilai(gk)) return pesan('Anda tidak berhak membuat tautan angket untuk guru ini.', true);
    var inp = root() && root().querySelector('[data-kupon-n="' + j + '"]'), n = Math.floor(Number(inp && inp.value));
    if (!(n >= 1 && n <= 200)) return pesan('Jumlah tautan 1\u2013200.', true);
    if (!kuponBoleh(a, j, n)) return pesan('Batas ' + MAKS_KUPON + ' tautan per jenis terlampaui.', true);
    kerjakan(function () { return kuponBuat(gk, j, n); }, function (tok) {
      if (typeof addLog === 'function') addLog('PKG angket kupon', namaGuru(gk) + ' ' + j + ' x' + n);
      pesan(n + ' tautan sekali pakai dibuat. Gunakan "Salin" untuk membagikannya.'); render();
    }, 'Gagal membuat tautan: ');
  }
  function kuponSalin(el) {
    var gk = S.gk, a = dataAngket(gk), j = el.getAttribute('data-j'), semua = el.getAttribute('data-m') === 'semua';
    if (!a || !modeKupon(a)) return;
    var sisa = kuponSisa(a, j);
    if (!semua) { S.kuponDiberi = S.kuponDiberi || {}; sisa = sisa.filter(function (t) { return !S.kuponDiberi[t]; }).slice(0, 1); }   // 1 tautan: jangan beri yang sama dua kali dalam sesi
    if (!sisa.length) return pesan('Tidak ada tautan tersisa yang belum diberikan. Buat tautan baru.', true);
    var teks = sisa.map(function (t) { return tautanAngket(gk, j, t); }).join('\n');
    sisa.forEach(function (t) { (S.kuponDiberi = S.kuponDiberi || {})[t] = 1; });
    var ok = function () { pesan(sisa.length + ' tautan disalin.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(ok, function () { window.prompt('Salin tautan ini:', teks); });
    else window.prompt('Salin tautan ini:', teks);
  }
  function angketSalin(el) {
    var url = tautanAngket(S.gk, el.getAttribute('data-j')); if (!url) return pesan('Tautan tidak dapat dibuat.', true);
    var ok = function () { pesan('Tautan disalin.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { window.prompt('Salin tautan ini:', url); });
    else window.prompt('Salin tautan ini:', url);
  }
  function angketWa(el) {
    var j = el.getAttribute('data-j'), A = AK(), url = tautanAngket(S.gk, j); if (!url || !A) return;
    var teks = 'Mohon bantu mengisi ' + A.jenis[j].judul.toLowerCase() + ' untuk ' + namaGuru(S.gk) + ' (hanya beberapa menit, tanpa nama):\n' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank', 'noopener');
  }
  function tarikAngket() {
    var gk = S.gk, u = me(), A = AK(), a = dataAngket(gk);
    if (!A || !a) return pesan('Data angket belum dimuat.', true);
    if (!bolehUbahBukti(gk) || !adaPenilai(gk) || !u) return pesan('Anda tidak berhak menghitung angket untuk guru ini / penilaian sudah final.', true);
    var map = {}, ban = {}, nn = {}, total = 0, rusak = [];
    A.urut.forEach(function (j) {
      var rs = a.resp[j] || []; nn[j] = rs.length; total += rs.length; if (!rs.length) return;
      var h = null; try { h = A.hitung(j, rs); } catch (e) { rusak.push(j); return; }
      if (!h) return;
      Object.keys(h.indikator).forEach(function (lab) { var x = h.indikator[lab]; map[lab.replace('.', '_')] = { j: j, pct: x.pct, n: x.n, saran: x.saran }; });
      Object.keys(h.pembanding).forEach(function (k) { ban[k] = h.pembanding[k]; });
    });
    if (!total) return pesan('Belum ada jawaban angket yang masuk.', true);
    if (rusak.length) return pesan('Perhitungan angket dibatalkan: data jenis ' + rusak.join(', ') + ' tidak dapat dihitung (ada jawaban rusak). Tidak ada data yang diubah.', true);
    // Ringkasan per butir angket siswa untuk perbandingan Diri vs Siswa yang dibaca guru (guru tidak boleh membaca jawaban mentah).
    // Hanya disimpan bila responden >= batas minimum, supaya kerahasiaan jawaban terjaga.
    var sis = {}, rsS = a.resp.siswa || [], minS = A.jenis.siswa.min;
    if (rsS.length >= minS) A.jenis.siswa.butir.forEach(function (x) {
      var jm = 0, c = 0;
      rsS.forEach(function (r) { var v = r && r.j && r.j[x.k]; if (v === 'y' || v === 'k' || v === 't') { jm += A.nilai[v]; c++; } });
      if (c >= minS) sis[x.k] = { pct: Math.round(jm / c * 1000) / 10, n: c };   // per butir juga harus >= minimum (jawaban 'tidak tahu' tidak dihitung)
    });
    var waktu = nowIso();
    var upd = aman({ angket: Object.keys(map).length ? map : null, angketBanding: Object.keys(ban).length ? ban : null, angketSiswa: Object.keys(sis).length ? sis : null, angketN: nn, angketAt: waktu, angketOleh: pengisi(u) });
    kerjakan(function () { return db.ref(nodeBukti(gk)).update(upd); }, function () {
      var d = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {});
      d.angket = upd.angket || null; d.angketBanding = upd.angketBanding || null; d.angketSiswa = upd.angketSiswa || null; d.angketN = upd.angketN; d.angketAt = upd.angketAt; d.angketOleh = upd.angketOleh;
      if (typeof addLog === 'function') addLog('PKG angket hitung', namaGuru(gk));
      pesan('Hasil angket dihitung (' + total + ' jawaban). Usulan skor tampil di form penilaian.'); render();
    }, 'Gagal menyimpan hasil angket: ');
  }

  // ----- bukti -> penilaian -----
  function sumberSaran(d, key, src) {
    if (src === 'angket') { var a = d.angket && d.angket[key]; return (a && a.saran != null) ? { saran: a.saran, teks: teksAngket(a) } : null; }
    var o = d.otomatis && d.otomatis[key]; return (o && o.saran != null) ? { saran: o.saran, teks: teksOto(d, o) } : null;
  }
  function terapkanSaran(key, tanya, src) {
    var d = dataBukti(S.gk), ss = d && sumberSaran(d, key, src);
    if (!ss || !S.draft) return false;
    var lama = S.draft.skor[key];
    if (tanya && lama != null && lama !== ss.saran && !confirm('Indikator ' + key.replace('_', '.') + ' sudah diberi skor ' + lama + '. Ganti dengan saran ' + ss.saran + '?')) return false;
    S.draft.skor[key] = ss.saran;
    var cat = S.draft.catatan[key], r = root();
    if (!cat && ss.teks) S.draft.catatan[key] = potong(ss.teks, 450);
    if (r) {                                             // perbarui layar tanpa render ulang (menjaga posisi dan komponen yang terbuka)
      var rad = r.querySelector('input[type=radio][name="sk_' + key + '"][value="' + ss.saran + '"]'); if (rad) rad.checked = true;
      var ci = r.querySelector('input[data-cat="' + key + '"]'); if (ci && S.draft.catatan[key] != null) ci.value = S.draft.catatan[key];
    }
    return true;
  }
  // v55: susun catatan indikator dari judul bukti manual yang sudah diunggah (bukan skor, bukan isi wawancara rahasia). Tidak menimpa catatan yang sudah ada.
  var JENIS_KATA = { dokumen: 'dokumen', observasi: 'observasi' };
  function catDariBukti(gk, key) {
    var judul = [], seen = {};
    daftarItem(gk, key).forEach(function (it) {
      if (it.jenis === 'wawancara') return;                       // wawancara bersifat rahasia
      var j = String(it.judul || '').trim(); if (!j || seen[j.toLowerCase()]) return; seen[j.toLowerCase()] = 1;
      judul.push((JENIS_KATA[it.jenis] ? JENIS_KATA[it.jenis] + ' ' : '') + '"' + potong(j, 60) + '"');
    });
    if (!judul.length) return '';
    var tampil3 = judul.slice(0, 3).join('; '), sisa = judul.length - 3;
    return potong('Bukti terlampir: ' + tampil3 + (sisa > 0 ? '; dan ' + sisa + ' bukti lain' : '') + '.', 450);
  }
  function catTulis(key, teks) {
    if (!S.draft || !teks || String(S.draft.catatan[key] || '').trim()) return false;
    S.draft.catatan[key] = teks;
    var r = root(), ci = r ? r.querySelector('input[data-cat="' + key + '"]') : null; if (ci) ci.value = teks;
    return true;
  }
  function catIsi(key) {
    if (!S.draft || !key || !bolehMenilai(S.gk)) return;
    if (String(S.draft.catatan[key] || '').trim()) return pesan('Catatan indikator ' + key.replace('_', '.') + ' sudah terisi; tidak ditimpa.', true);
    var t = catDariBukti(S.gk, key);
    if (!t) return pesan('Indikator ' + key.replace('_', '.') + ' belum punya bukti terlampir untuk dirangkum.', true);
    catTulis(key, t); simpanLokal(); pesan('Catatan diisi dari judul bukti. Periksa, lalu Simpan Draft.');
  }
  function catIsiSemua() {
    if (!S.draft || !bolehMenilai(S.gk)) return;
    var n = 0;
    P.komponen.forEach(function (k) { k.indikator.forEach(function (_, i) { var key = k.no + '_' + (i + 1); if (catTulis(key, catDariBukti(S.gk, key))) n++; }); });
    if (n) simpanLokal();
    pesan(n ? n + ' catatan diisi dari judul bukti. Periksa, lalu Simpan Draft.' : 'Tidak ada yang diisi: catatan sudah terisi atau belum ada bukti terlampir.', !n);
  }
  function pakaiSaran(el) {
    var key = el.getAttribute('data-key');
    if (terapkanSaran(key, true, el.getAttribute('data-src') || '')) { simpanLokal(); recalc(); pesan('Saran dipakai untuk indikator ' + key.replace('_', '.') + '. Jangan lupa Simpan Draft.'); }
  }
  function pakaiSemuaSaran() {
    var d = dataBukti(S.gk); if (!d || (!d.otomatis && !d.angket)) return;
    var n = 0;
    var kunciSemua = {}; Object.keys(d.otomatis || {}).forEach(function (k) { kunciSemua[k] = 1; }); Object.keys(d.angket || {}).forEach(function (k) { kunciSemua[k] = 1; });
    Object.keys(kunciSemua).forEach(function (key) { if (S.draft.skor[key] == null && (terapkanSaran(key, false, '') || terapkanSaran(key, false, 'angket'))) n++; });
    if (n) { simpanLokal(); recalc(); render(); pesan(n + ' indikator diisi dari saran. Periksa dulu, lalu Simpan Draft.'); } else pesan('Tidak ada indikator kosong yang punya saran.');
  }

  // ---------- aksi ----------
  function bukaForm(gk) {
    if (!bolehMenilai(gk)) return pesan('Anda tidak ditugaskan sebagai penilai untuk guru ini.', true);
    var st0 = statusDari(S.nilai[gk]);
    if (selesai(st0) || st0 === 'diajukan') return pesan('Penilaian ini sudah diajukan / final dan tidak dapat diubah.', true);
    var n = S.nilai[gk] || {};
    S.gk = gk; S.view = 'form';
    S.draft = { skor: JSON.parse(JSON.stringify(n.skor || {})), catatan: JSON.parse(JSON.stringify(n.catatan || {})) };
    // Bukti guru ini (dokumen, observasi, wawancara, data otomatis) dimuat di belakang layar lalu tampil di tiap indikator.
    muatBukti(gk, function () { if (S.view === 'form' && S.gk === gk) render(); });
    // Pulihkan draft lokal yang belum sempat tersimpan ke server (mis. halaman tertutup di tengah pengisian).
    var lok = null;
    try { lok = JSON.parse(localStorage.getItem(kunciLokal()) || 'null'); } catch (e) { lok = null; }
    if (lok && lok.d && lok.d.skor && Object.keys(lok.d.skor).length && (!n.diperbarui || lok.t > Date.parse(n.diperbarui))) {
      S.draft = { skor: lok.d.skor, catatan: lok.d.catatan || {} };
      pesan('Draft yang belum tersimpan dipulihkan dari perangkat ini.');
    }
    render();
  }
  // Simpan otomatis ke perangkat selama form terbuka; dihapus begitu berhasil disimpan ke server.
  function kunciLokal() { var u = me(); return 'pkg_draft_' + (S.periodeId || '') + '_' + (S.gk || '') + '_' + (u ? u.key : ''); }
  function simpanLokal() { try { if (S.view === 'form' && S.draft) localStorage.setItem(kunciLokal(), JSON.stringify({ t: Date.now(), d: S.draft })); } catch (e) { /* penyimpanan penuh/diblokir: abaikan */ } }
  function hapusLokal() { try { localStorage.removeItem(kunciLokal()); } catch (e) { } }
  // Draft lokal berisi catatan penilaian; hapus yang sudah > 14 hari supaya tidak menumpuk di perangkat bersama.
  function bersihkanDraftLama() {
    try {
      var batas = Date.now() - 14 * 24 * 3600 * 1000, hapus = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!k || k.indexOf('pkg_draft_') !== 0) continue;
        var v = null; try { v = JSON.parse(localStorage.getItem(k)); } catch (e) { v = null; }
        if (!v || !v.t || v.t < batas) hapus.push(k);
      }
      hapus.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { }
  }
  function rekamHasil(skor) { var h = hitung(skor); return { jumlah: h.jumlah, tertinggi: h.tertinggi, nilai100: Math.round(h.nilai100 * 100) / 100, sebutan: h.sebutan, npk: h.npk, lengkap: h.lengkap }; }

  // Batas waktu: set()/update() Firebase tidak pernah selesai saat offline -> tanpa batas, tombol macet.
  function denganBatas(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('Koneksi lambat atau terputus. Coba lagi.')); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  // Satu aksi tulis pada satu waktu (cegah klik ganda / simpan ganda).
  // Kepala ditolak Firebase hampir selalu karena Kunci Kepala di perangkat salah/berubah (panel Keamanan Login hanya untuk Admin).
  function tawarGantiKunciKepala() {
    if (!kep() || adm() || typeof window.kredKepsekGantiKunci !== 'function') return;
    if (S.tawarSejak && Date.now() - S.tawarSejak < 60000) return;
    S.tawarSejak = Date.now();
    setTimeout(function () {
      if (!confirm('Akses ditolak Firebase. Kunci Kepala di perangkat ini mungkin salah atau sudah berubah.\n\nMasukkan ulang Kunci Kepala sekarang?')) return;
      window.kredKepsekGantiKunci().then(function () { pesan('Kunci Kepala diperbarui. Silakan coba lagi.'); muat(); }, function (e) { pesan((e && e.message) || 'Gagal memperbarui Kunci Kepala.', true); });
    }, 600);
  }
  function kerjakan(buat, ok, awalan, batasMs) {
    if (S.menyimpan) {   // dulu diam saja: kini selalu ada keterangan, dan kunci yang macet >25 dtk dilepas
      if (Date.now() - (S.menyimpanSejak || 0) < 25000) { pesan('Masih menyimpan, tunggu sebentar lalu coba lagi.', true); return; }
      S.menyimpan = false;
    }
    S.menyimpan = true; S.menyimpanSejak = Date.now();
    var p; try { p = denganBatas(siapSesi().then(function () { return buat(); }), batasMs || 20000); } catch (e) { p = Promise.reject(e); }
    return p.then(function (v) { S.menyimpan = false; if (ok) ok(v); },
      function (e) {
        S.menyimpan = false;
        try { console.error('[SI MAMBA][PKG] simpan gagal:', e); } catch (x) { }
        var m = String((e && e.message) || e);
        if (/permission_denied|permission denied/i.test(m)) m = 'Ditolak Firebase (hak akses). Keluar lalu masuk lagi; bila tetap, minta Admin memeriksa kredensial akun ini (🛡️ Keamanan Login) dan Rules. Rincian: ' + m;
        pesan((awalan || 'Gagal: ') + m, true);
        if (/Ditolak Firebase \(hak akses\)|Bagian dasar/.test(m)) tawarGantiKunciKepala();
      });
  }
  // Baca ulang data terbaru, pastikan perubahan status MASIH diizinkan, baru tulis. Mencegah menimpa status
  // yang sudah berubah dari perangkat lain (mis. guru sudah menyetujui, penilai masih memegang form lama).
  // Ini best-effort di sisi klien, bukan pengganti Rules/auth per-user.
  function ubahNilai(uid, izin, perubahan) {
    var ref = db.ref(N.nilai + '/' + S.periodeId + '/' + uid);
    return ref.once('value').then(function (s) {
      var cur = s.val() || {};
      if (!izin(cur)) throw new Error('Status data sudah berubah (mungkin dari perangkat lain). Muat ulang halaman.');
      return ref.update(perubahan).then(function () { return Object.assign({}, cur, perubahan); });
    });
  }

  // Dipanggil hanya bila simpan draf ditolak Firebase: menulis per bagian supaya kelihatan bagian mana yang ditolak Rules
  // (dan menyimpan bagian yang diterima). Semua bagian lolos -> dianggap tersimpan.
  function diagnosaDraf(gk, data) {
    var ref = db.ref(N.nilai + '/' + S.periodeId + '/' + gk), gagal = [];
    var coba = function (nama, perubahan) { return ref.update(perubahan).then(function () { return true; }, function () { gagal.push(nama); return false; }); };
    var inti = { status: data.status, penilaiKey: data.penilaiKey, penilaiNama: data.penilaiNama, diperbarui: data.diperbarui, diperbaruiOleh: data.diperbaruiOleh };
    return coba('data dasar', inti).then(function (ok) {
      if (!ok) return { ok: false, pesan: 'Bagian dasar (status & penilai) ditolak Rules: akun ini belum dikenali Firebase sebagai penilai/Kepala untuk guru ini. Periksa sesi (keluar lalu masuk lagi), Kunci Kepala, dan penugasan penilai.' };
      var kerja = [coba('hasil', { hasil: data.hasil })];
      Object.keys(data.skor || {}).forEach(function (k) { var o = {}; o['skor/' + k] = data.skor[k]; kerja.push(coba('skor ' + k.replace('_', '.'), o)); });
      Object.keys(data.catatan || {}).forEach(function (k) { var o = {}; o['catatan/' + k] = data.catatan[k]; kerja.push(coba('catatan ' + k.replace('_', '.'), o)); });
      return Promise.all(kerja).then(function () {
        if (!gagal.length) return { ok: true };
        return { ok: false, pesan: 'Sebagian tersimpan. Bagian yang ditolak Rules: ' + gagal.slice(0, 8).join(', ') + (gagal.length > 8 ? ' (+' + (gagal.length - 8) + ' lagi)' : '') + '. Periksa isian tersebut (nilai harus 0/1/2, catatan maks. 1000 karakter) atau kirim pesan ini ke pengembang.' };
      });
    });
  }
  function simpanNilai(status, ok) {
    var gk = S.gk, u = me(), t = tugasDari(gk) || {};
    if (!u || !bolehMenilai(gk)) return pesan('Tidak berhak menilai guru ini.', true);
    var cp = S.draft.catatan || {}, pj = Object.keys(cp).filter(function (k) { return String(cp[k] || '').length > 1000; });
    if (pj.length) return pesan('Catatan indikator ' + pj.map(function (k) { return k.replace('_', '.'); }).join(', ') + ' lebih dari 1000 karakter (batas Rules). Persingkat dulu agar bisa disimpan.', true);
    var data = {
      skor: S.draft.skor, catatan: S.draft.catatan, status: status, hasil: rekamHasil(S.draft.skor),
      penilaiKey: t.penilaiKey || u.key, penilaiNama: tampil(t.penilaiNama) || namaGuru(t.penilaiKey || u.key),
      diperbarui: nowIso(), diperbaruiOleh: pengisi(u)
    };
    if (status === 'diajukan') { data.persetujuan = null; data.diajukanAt = nowIso(); }
    kerjakan(function () {
      return ubahNilai(gk, function (cur) { var st = statusDari(cur); return !(selesai(st) || st === 'diajukan'); }, data).catch(function (e) {
        if (status !== 'draft' || !/permission_denied|permission denied/i.test(String((e && e.message) || e))) throw e;
        return diagnosaDraf(gk, data).then(function (r) { if (r.ok) return Object.assign({}, S.nilai[gk] || {}, data); throw new Error(r.pesan); });
      });
    }, function (baru) {
      S.nilai[gk] = baru;
      hapusLokal();
      if (typeof addLog === 'function') addLog('PKG ' + status, namaGuru(gk));
      if (status === 'diajukan') kabari(gk, 'PKG: hasil penilaian diajukan', 'Hasil penilaian kinerja Anda sudah diajukan penilai. Mohon periksa lalu beri persetujuan atau keberatan di menu PKG Guru.');
      if (ok) ok();
    }, 'Gagal menyimpan: ', 45000);
  }

  function aksi(act, el) {
    var gk = el.getAttribute('data-gk') || S.gk, u = me();
    if (act === 'tab') { S.tab = el.getAttribute('data-tab'); tabSimpan(S.tab); S.view = 'list'; if (PG_DARI_TAB[S.tab]) pgPastikan(S.tab, true); render(); if (S.tab === 'ringkasan') klSegarSj(); return; }
    if (act === 'kembali') { S.view = 'list'; S.kbForm = false; return render(); }
    if (act === 'kb-buka') { S.kbForm = true; return render(); }
    if (act === 'kb-batal') { S.kbForm = false; return render(); }
    if (act === 'nilai') return bukaForm(gk);
    if (act === 'hasil') {
      if (!hasilTerlihat(gk, statusDari(S.nilai[gk]))) return pesan('Hasil belum diajukan oleh penilai.', true);
      S.gk = gk; S.view = 'hasil'; S.kbForm = false; S.kbTeks = ''; render();
      muatBukti(gk, function () { if (S.view === 'hasil' && S.gk === gk) render(); });
      muatAngket(gk, function () { if (S.view === 'hasil' && S.gk === gk) render(); });
      return;
    }
    if (act === 'cetak') return cetakLaporan(gk);
    if (act === 'cetak-sementara') return cetakSkorSementara(gk, el.getAttribute('data-form') === '1');
    if (act === 'rtl-isi') return rtlIsi(gk);
    if (act === 'rtl-simpan') return rtlSimpan(gk);
    if (act === 'cetak-rekap') return cetakRekap();
    if (act === 'simpan-draft') return simpanNilai('draft', function () { pesan('Draft tersimpan.'); });
    if (act === 'ajukan') {
      var terisi = jumlahTerisi(S.draft.skor);
      if (terisi < P.totalIndikator()) return pesan('Masih ada ' + (P.totalIndikator() - terisi) + ' indikator yang belum diberi skor.', true);
      // v81: peringatan (bukan blokir) untuk skor 1-2 tanpa bukti apa pun; skor 0 memang berarti tidak ada bukti, jadi tidak diperingatkan.
      var tb = 0; try { Object.keys(S.draft.skor || {}).forEach(function (kk) { if (S.draft.skor[kk] > 0 && !daftarItem(gk, kk).length && !adaOto(gk, kk)) tb++; }); } catch (e) { tb = 0; }
      if (tb && !confirm(tb + ' indikator berskor 1\u20132 belum punya bukti apa pun (tab Kendali akan menandainya).\n\nTetap ajukan ke guru?')) return;
      return simpanNilai('diajukan', function () { pesan('Hasil diajukan ke guru untuk persetujuan.'); S.view = 'hasil'; render(); });
    }
    if (act === 'ganti-kunci-kepala') {
      if (typeof window.kredKepsekGantiKunci !== 'function') return pesan('Fitur belum tersedia (js/kredensial.js).', true);
      return window.kredKepsekGantiKunci().then(function () { pesan('Kunci Kepala diperbarui.'); muat(); }, function (e) { pesan((e && e.message) || 'Gagal memperbarui Kunci Kepala.', true); });
    }
    if (act === 'ingatkan' || act === 'ingatkan-semua') {
      if (!bolehKelola()) return;
      var dI = act === 'ingatkan' ? barisGuru().filter(function (x) { return x.g.key === gk; }) : barisGuru(), kirim = 0, lewat = 0;
      dI.forEach(function (x) {
        var tg = targetIngat(x); if (!tg) return;
        var lk = 'pkgIng_' + S.periodeId + '_' + x.g.key, t0 = 0;
        try { t0 = parseInt(localStorage.getItem(lk) || '0', 10) || 0; } catch (e) { }
        if (Date.now() - t0 < 12 * 3600 * 1000) { lewat++; return; }
        kabari(tg.k, tg.j, tg.i); kirim++;
        try { localStorage.setItem(lk, String(Date.now())); } catch (e) { }
      });
      if (kirim && typeof addLog === 'function') addLog('PKG pengingat', kirim + ' pengingat');
      return pesan(kirim ? kirim + ' pengingat dikirim ke notifikasi aplikasi' + (lewat ? ' (' + lewat + ' dilewati: sudah diingatkan <12 jam lalu)' : '') + '.' : (lewat ? 'Semua sudah diingatkan kurang dari 12 jam lalu.' : 'Tidak ada yang perlu diingatkan.'));
    }
    if (act === 'bagi-tugas') return bagiTugas();
    if (act === 'skpen-sama') return skPenSama();
    if (act === 'ww-tanggal') return wwIsiTanggal();
    if (act === 'kd-j-usul') return kdTerapkanJ();
    if (act === 'cat-isi') return catIsi(el.getAttribute('data-key'));
    if (act === 'cat-isi-semua') return catIsiSemua();
    if (act === 'salin-tugas') {
      if (!bolehKelola()) return;
      var rsl = root(), sel = $('pkgSalinDari'); if (!rsl || !sel || !sel.value) return pesan('Pilih periode sumber dulu.', true);
      return kerjakan(function () { return db.ref(N.tugas + '/' + sel.value).once('value'); }, function (sn) {
        var t = sn.val() || {}, n = 0, lw = 0;
        Array.prototype.forEach.call(rsl.querySelectorAll('select[data-pen]'), function (e) {
          var pk = t[e.getAttribute('data-pen')] && t[e.getAttribute('data-pen')].penilaiKey;
          if (e.value || !pk) return;
          if (Array.prototype.some.call(e.options, function (o) { return o.value === pk; })) { e.value = pk; n++; } else lw++;
        });
        pesan(n ? n + ' penilai disalin' + (lw ? ' (' + lw + ' dilewati: penilai sudah tidak aktif)' : '') + '. Periksa lalu tekan Simpan Penugasan.' : 'Tidak ada yang bisa disalin.', !n);
      }, 'Gagal membaca periode sumber: ');
    }
    if (act === 'pilih-semua') { var rs = root(); if (rs) Array.prototype.forEach.call(rs.querySelectorAll('input[data-pilih]'), function (c) { c.checked = true; }); return; }
    if (act === 'tetapkan-pilih') {
      if (!u || !kep()) return;
      var rt = root(), pilih = [];
      if (rt) Array.prototype.forEach.call(rt.querySelectorAll('input[data-pilih]:checked'), function (c) { pilih.push(c.getAttribute('data-pilih')); });
      if (!pilih.length) return pesan('Centang dulu guru yang akan ditetapkan.', true);
      if (!confirm('Tetapkan hasil PKG untuk ' + pilih.length + ' guru?\n' + pilih.map(namaGuru).join(', ') + '\n\nSetelah ditetapkan, hasil tidak bisa diubah lagi.')) return;
      var pid2 = S.periodeId, tt = nowIso(), oleh = pengisi(u);
      return kerjakan(function () {
        return Promise.all(pilih.map(function (k) { return db.ref(N.nilai + '/' + pid2 + '/' + k + '/status').once('value'); })).then(function (sn) {
          var upd = {}, ok = [];
          sn.forEach(function (x, i) { if (x.val() === 'disetujui') { var k = pilih[i]; upd[k + '/status'] = 'ditetapkan'; upd[k + '/ditetapkanAt'] = tt; upd[k + '/ditetapkanOleh'] = oleh; ok.push(k); } });
          if (!ok.length) throw new Error('Tidak ada yang berstatus disetujui (mungkin sudah berubah). Muat ulang halaman.');
          return db.ref(N.nilai + '/' + pid2).update(upd).then(function () { return ok; });
        });
      }, function (ok) {
        if (typeof addLog === 'function') addLog('PKG tetapkan massal', ok.length + ' guru');
        ok.forEach(function (k) { kabari(k, 'PKG: hasil ditetapkan', 'Hasil PKG Anda telah ditetapkan Kepala Madrasah.'); kabari((tugasDari(k) || {}).penilaiKey, 'PKG: hasil ditetapkan', 'Hasil PKG ' + namaGuru(k) + ' telah ditetapkan Kepala Madrasah.'); });
        pesan(ok.length + ' hasil ditetapkan.'); muat();
      }, 'Gagal menetapkan: ', 30000);
    }
    if (act === 'tarik') {
      if (!u || !bolehMenilai(gk)) return pesan('Anda tidak berhak menarik pengajuan ini.', true);
      if (!confirm('Tarik kembali hasil yang sudah diajukan? Hasil kembali menjadi draft dan tidak terlihat oleh guru sampai Anda mengajukan ulang.')) return;
      var upd4 = { status: 'draft', persetujuan: null, diajukanAt: null, diperbarui: nowIso(), diperbaruiOleh: pengisi(u) };
      return kerjakan(function () { return ubahNilai(gk, function (c) { return statusDari(c) === 'diajukan'; }, upd4); },
        function (baru) { S.nilai[gk] = baru; if (typeof addLog === 'function') addLog('PKG tarik pengajuan', namaGuru(gk)); kabari(gk, 'PKG: pengajuan ditarik', 'Penilai menarik kembali hasil penilaian untuk diperbaiki. Anda akan diberi tahu saat diajukan ulang.'); S.view = 'list'; render(); pesan('Pengajuan ditarik; kembali ke draft.'); }, 'Gagal menarik kembali: ');
    }
    if (act === 'setuju') {
      if (!u) return;
      var upd = { status: 'disetujui', persetujuan: { setuju: true, tanggal: nowIso(), oleh: pengisi(u) } };
      return kerjakan(function () { return ubahNilai(u.key, function (c) { return statusDari(c) === 'diajukan'; }, upd); },
        function (baru) { S.nilai[u.key] = baru; if (typeof addLog === 'function') addLog('PKG setuju', namaGuru(u.key)); kabari((tugasDari(u.key) || {}).penilaiKey, 'PKG: guru menyetujui hasil', namaGuru(u.key) + ' menyetujui hasil penilaiannya. Menunggu penetapan Kepala Madrasah.'); pesan('Terima kasih, persetujuan tercatat.'); render(); });
    }
    if (act === 'keberatan') {
      if (!u) return;
      var ta = $('pkgKbAlasan'); if (!ta) { S.kbForm = true; return render(); }
      var alasan = ta.value.trim(); if (!alasan) return pesan('Alasan keberatan wajib diisi.', true);
      if (alasan.length > 1000) return pesan('Alasan keberatan terlalu panjang (' + alasan.length + ' karakter; maksimal 1000). Mohon diringkas.', true);
      var upd2 = { status: 'keberatan', persetujuan: { setuju: false, alasan: alasan, tanggal: nowIso(), oleh: pengisi(u) } };
      return kerjakan(function () { return ubahNilai(u.key, function (c) { return statusDari(c) === 'diajukan'; }, upd2); },
        function (baru) { S.nilai[u.key] = baru; S.kbForm = false; S.kbTeks = ''; if (typeof addLog === 'function') addLog('PKG keberatan', namaGuru(u.key)); kabari((tugasDari(u.key) || {}).penilaiKey, 'PKG: guru mengajukan keberatan', namaGuru(u.key) + ' mengajukan keberatan atas hasil penilaiannya. Lihat alasannya di menu PKG Guru.'); pesan('Keberatan tercatat dan diteruskan ke Kepala Madrasah.'); render(); });
    }
    if (act === 'tetapkan') {
      if (!u || !kep()) return;
      var upd3 = { status: 'ditetapkan', ditetapkanAt: nowIso(), ditetapkanOleh: pengisi(u) };
      return kerjakan(function () { return ubahNilai(gk, function (c) { return statusDari(c) === 'disetujui'; }, upd3); },
        function (baru) { S.nilai[gk] = baru; if (typeof addLog === 'function') addLog('PKG tetapkan', namaGuru(gk)); kabari(gk, 'PKG: hasil ditetapkan', 'Hasil PKG Anda telah ditetapkan Kepala Madrasah.'); kabari((tugasDari(gk) || {}).penilaiKey, 'PKG: hasil ditetapkan', 'Hasil PKG untuk ' + namaGuru(gk) + ' telah ditetapkan Kepala Madrasah.'); pesan('Hasil PKG ditetapkan.'); render(); });
    }
    if (act === 'perangkat') { if (!bolehPerangkat('bukti', gk)) return pesan('Tidak tersedia untuk Anda.', true); S.gk = gk; S.view = 'perangkat'; return render(); }
    if (act === 'cetak-perangkat') return cetakPerangkat(el.getAttribute('data-jenis'), gk);
    if (act === 'bukti') return bukaBukti(gk);
    if (act === 'bukti-tambah') return tambahBukti(el);
    if (act === 'obs-isi') return obsIsi(el);
    if (act === 'obs-kes-isi') return obsKesIsi(el.getAttribute('data-gk') || S.gk);
    if (act === 'obs-kes-simpan') return obsKesSimpanFb(el.getAttribute('data-gk') || S.gk);
    if (act === 'pra-simpan') return simpanPra(el);
    if (act === 'diri-simpan') return simpanDiri(el);
    if (act === 'bukti-pengamatan') return simpanPengamatan(el);
    if (act === 'angket-toggle') return angketToggle();
    if (act === 'wa-mulai') {
      var st1 = waState(S.gk), jn = st1.jenis, it = waItems(S.gk), ak1 = dataAngket(S.gk); if (!it.length) return pesan('Tidak ada wali yang belum dikirimi.', true);
      if (!(ak1 && ak1.info && modeKupon(ak1))) { st1.ant = { jenis: jn, items: it, i: 0, kirim: 0, lewat: 0 }; return render(); }
      if (!bolehUbahBukti(S.gk) || !adaPenilai(S.gk)) return pesan('Anda tidak berhak membuat tautan angket untuk guru ini.', true);
      if (!kuponBoleh(ak1, jn, it.length)) return pesan('Batas ' + MAKS_KUPON + ' tautan ' + waJudul(jn) + ' per guru terlampaui.', true);
      var gk1 = S.gk;
      return kerjakan(function () { return kuponBuat(gk1, jn, it.length); }, function (tok) {
        var peta = {}; it.forEach(function (k, i) { peta[k] = tok[i]; });
        st1.ant = { jenis: jn, items: it, i: 0, kirim: 0, lewat: 0, tok: peta }; render();
      }, 'Gagal membuat tautan sekali pakai: ');
    }
    if (act === 'jatah-buat') return jatahBuat();
    if (act === 'ingat-wa') return ingatWa(el);
    if (act === 'jatah-ingat') return jatahIngat();
    if (act === 'kode-cek') {             // v56: cocokkan kode bukti dari responden dengan jawaban yang tercatat (isi jawaban tidak dibuka)
      var jk = el.getAttribute('data-j'), ak = dataAngket(S.gk), rk = root(), inp = rk ? rk.querySelector('input[data-kode="' + jk + '"]') : null;
      var kd = String(inp ? inp.value : '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
      if (!ak || !ak.ids || kd.length < 8) return pesan('Ketik kode bukti lengkap (8 karakter).', true);
      var cocok = Object.keys(ak.ids[jk] || {}).filter(function (id) { var l = id.toLowerCase(); return l.slice(0, 8) === kd || l.slice(-8) === kd; });
      return pesan(cocok.length === 1 ? '✔ Kode ' + kd.slice(0, 4).toUpperCase() + '-' + kd.slice(4).toUpperCase() + ' tercatat sebagai jawaban terkirim.' : (cocok.length > 1 ? 'Kode cocok dengan lebih dari satu jawaban; mintalah responden menunjukkan kode lengkapnya.' : 'Kode tidak ditemukan pada angket ini.'), cocok.length !== 1);
    }
    if (act === 'angket-mode') return angketMode();
    if (act === 'kupon-buat') return kuponBuatAksi(el);
    if (act === 'kupon-salin') return kuponSalin(el);
    if (act === 'wa-buka') return waBuka();
    if (act === 'wa-lewati') { var a2 = waState(S.gk).ant; if (a2) { a2.i++; a2.lewat++; } return render(); }
    if (act === 'wa-tutup') { waState(S.gk).ant = null; return render(); }
    if (act === 'angket-salin') return angketSalin(el);
    if (act === 'angket-wa') return angketWa(el);
    if (act === 'angket-muat') { S.pnBuka = { siswa: true, ortu: true }; } if (act === 'angket-muat') return muatAngket(S.gk, function () { pesan('Jawaban angket dimuat ulang.'); render(); });
    if (act === 'angket-tarik') return tarikAngket();
    if (act === 'bukti-hapus') return hapusBukti(el);
    if (act === 'bukti-tarik') return tarikOtomatis();
    if (act === 'pakai-saran') return pakaiSaran(el);
    if (act === 'pakai-semua-saran') return pakaiSemuaSaran();
    if (act === 'buat-periode') return buatPeriode();
    if (act === 'simpan-tugas') return simpanTugas();
    if (act === 'simpan-skpen') return simpanSkPen();
    if (act === 'simpan-skset') return simpanSkSet();
    if (act === 'cetak-skset') return cetakSkPenetapan();
    if (act === 'supervisi') return bukaSv(gk);
    if (act === 'sv-kembali') { S.view = S.tab === 'supervisi' ? 'list' : 'perangkat'; return render(); }
    if (act === 'sv-kosong') {            // v38: kosongkan pilihan Terlihat/Sebagian/Belum pada satu komponen (radio tidak bisa dibatalkan sendiri)
      var rr = root(), no = el.getAttribute('data-no');
      if (rr) Array.prototype.forEach.call(rr.querySelectorAll('input[name="pkgSvS_' + no + '"]'), function (e) { e.checked = false; });
      S.svKotor = true; return;
    }
    if (act === 'sv-kosong-b') {          // v43: kosongkan semua butir satu komponen
      var rb = root(), nb = el.getAttribute('data-no');
      if (rb) Array.prototype.forEach.call(rb.querySelectorAll('input[data-svb="' + nb + '"]'), function (e) { e.checked = false; });
      S.svKotor = true; return svSegar(nb, false);
    }
    if (act === 'sv-pakai') {             // v43: pakai usulan skor dari persen butir
      var rp = root(), np = el.getAttribute('data-no'), kp = P.komponen[parseInt(np, 10) - 1], bp = {};
      if (!rp || !kp) return;
      svButir(kp).forEach(function (y) { var q = rp.querySelector('input[name="pkgSvB_' + np + '_' + y.n + '"]:checked'); if (q) bp[String(y.n)] = parseInt(q.value, 10); });
      var hp = svHitung(kp, bp); if (!hp.isi) return pesan('Nilai minimal satu butir dahulu.', true);
      Array.prototype.forEach.call(rp.querySelectorAll('input[name="pkgSvS_' + np + '"]'), function (e) { e.checked = parseInt(e.value, 10) === hp.usulan; });
      (S.svAuto = S.svAuto || {})[np] = true; S.svKotor = true; return;
    }
    if (act === 'sv-simpan') return svSimpan(S.gk);
    if (act === 'kl-muat') return klMuat();
    if (act === 'kl-xls') return klExcel();
    if (act === 'kl-pdf') return klPdf();
    if (act === 'kl-ingat') return klIngatkan(gk);
    if (act === 'kl-filter') { S.klKurang = !S.klKurang; return render(); }
    if (act === 'sv-pilih') return svPilihToken(el);
    if (act === 'sv-usulan') return svIsiUsulan(S.gk);
    if (act === 'sv-usulan3') return svIsiUsulan3(S.gk);
    if (act === 'sv-bukti') return svSimpan(S.gk, function () { svBuktiTulis(S.gk); });
    if (act === 'sv-rtl') return svSimpan(S.gk, function () { svKeRtl(S.gk); });
    if (act === 'sv-cetak') return cetakPerangkat('supervisi', S.gk);
    if (act === 'wawancara') return bukaWw(gk);
    if (act === 'obs-buka') return bukaObs(gk);
    if (act === 'angket-buka') return bukaAngket(gk);
    if (act === 'diri-buka') return bukaDiri(gk);
    if (act === 'pg-muat') { pgMuat(el.getAttribute('data-jenis')); return render(); }
    if (act === 'cd-unduh') return cadanganUnduh();
    if (act === 'ww-kembali') { S.view = S.tab === 'wawancara' ? 'list' : 'perangkat'; return render(); }
    if (act === 'ww-simpan') return wwSimpan(S.gk);
    if (act === 'ww-salin') return wwSalin(S.gk, el.getAttribute('data-key') || '', el.getAttribute('data-g'));
    if (act === 'wsj-tunjuk') return wsjTunjuk();
    if (act === 'wsj-batal') return wsjBatal();
    if (act === 'wsj-buka') { if (!S.tunjuk.some(function (t) { return t.gk === gk; })) return pesan('Penunjukan tidak ditemukan.', true); S.gk = gk; S.view = 'wsejawat'; return render(); }
    if (act === 'wsj-kembali') { S.view = 'list'; return render(); }
    if (act === 'wsj-simpan') return wsjSimpan(el);
    if (act === 'ww-bukti') return wwSimpan(S.gk, function () { wwBuktiTulis(S.gk); });
    if (act === 'ww-cetak') return cetakPerangkat('wawancara', S.gk);
    if (act === 'ww-kosong') {
      var rw = root(), gi0 = el.getAttribute('data-g');
      if (rw) Array.prototype.forEach.call(rw.querySelectorAll('input[data-wwg="' + gi0 + '"]'), function (e) { e.checked = false; });
      S.wwKotor = true; return wwSegar();
    }
    if (act === 'kd-acak') return kdAcak();
    if (act === 'kd-usulan') return kdIsiUsulan();
    if (act === 'kd-simpan') return kdSimpan();
    if (act === 'kd-cetak') return kdCetak();
  }

  function buatPeriode() {
    if (!bolehKelola()) return;
    var eNama = $('pkgPerNama'), eJenis = $('pkgPerJenis'), eMulai = $('pkgPerMulai'), eSel = $('pkgPerSelesai');
    if (!eNama || !eJenis || !eMulai || !eSel) return;
    var nama = (eNama.value || '').trim() || ('PKG ' + (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : new Date().getFullYear()));
    var jenis = eJenis.value, mulai = eMulai.value, sel = eSel.value;
    if (mulai && sel && sel < mulai) return pesan('Tanggal selesai tidak boleh sebelum tanggal mulai.', true);
    var dobel = Object.keys(S.periodeList).some(function (id) { return String(S.periodeList[id].nama || '').toLowerCase() === nama.toLowerCase() && S.periodeList[id].jenis === jenis; });
    if (dobel && !confirm('Periode dengan nama dan jenis yang sama sudah ada. Tetap buat periode baru?')) return;
    var ref = db.ref(N.periode).push(), u = me();
    kerjakan(function () {
      return ref.set({ nama: nama, jenis: jenis, mulai: mulai || null, selesai: sel || null, dibuatOleh: pengisi(u), dibuatAt: nowIso() });
    }, function () {
      S.periodeId = ref.key; if (typeof addLog === 'function') addLog('PKG buat periode', nama);
      pesan('Periode dibuat.'); muat();
    }, 'Gagal membuat periode: ');
  }

  function simpanTugas() {
    if (!bolehKelola() || !S.periodeId) return;
    var r = root(); if (!r) return;
    var jad = {}, upd = {}, hitungPen = {}, masalah = null, diganti = [], dicabut = [], terkunci = [];
    Array.prototype.forEach.call(r.querySelectorAll('input[data-jad]'), function (i) { jad[i.getAttribute('data-jad')] = i.value; });
    Array.prototype.forEach.call(r.querySelectorAll('select[data-pen]'), function (sel) {
      var gk = sel.getAttribute('data-pen'), pk = sel.value;   // dibaca dari atribut: aman untuk kunci berkarakter khusus
      var lama = S.tugas[gk], n = S.nilai[gk], jb = jad[gk] ? jad[gk] : null;
      if (pk === gk) masalah = namaGuru(gk) + ' tidak boleh menilai dirinya sendiri.';
      if (pk) hitungPen[pk] = (hitungPen[pk] || 0) + 1;
      var sama = pk ? !!(lama && lama.penilaiKey === pk && (lama.jadwal || null) === jb) : !lama;
      if (sama) return;                                         // tidak berubah: jangan ditulis ulang
      // Rules menolak SEMUA perubahan tugas guru yang penilaiannya sudah "ditetapkan"; satu entri ditolak = seluruh update gagal.
      if (n && n.status === 'ditetapkan') { terkunci.push(namaGuru(gk)); return; }
      if (!pk) { if (n && statusDari(n) !== 'belum') dicabut.push(namaGuru(gk)); upd[gk] = null; return; }
      if (lama && lama.penilaiKey !== pk && n && statusDari(n) !== 'belum') diganti.push(namaGuru(gk));
      upd[gk] = { penilaiKey: pk, penilaiNama: namaGuru(pk), jadwal: jb };
    });
    if (masalah) return pesan(masalah, true);
    var lebih = Object.keys(hitungPen).filter(function (k) { return hitungPen[k] > MAKS_GURU_PER_PENILAI; });
    if (lebih.length) return pesan(namaGuru(lebih[0]) + ' ditugaskan menilai ' + hitungPen[lebih[0]] + ' guru; batas Juknis maksimal ' + MAKS_GURU_PER_PENILAI + ' guru per penilai.', true);
    if (!Object.keys(upd).length) return pesan(terkunci.length ? 'Tidak ada perubahan yang bisa disimpan: penugasan ' + terkunci.join(', ') + ' sudah terkunci (hasil ditetapkan).' : 'Tidak ada perubahan penugasan.', !!terkunci.length);
    if (diganti.length && !confirm('Penilai untuk ' + diganti.join(', ') + ' diganti padahal penilaiannya sudah berjalan. Lanjutkan?')) return;
    if (dicabut.length && !confirm('Penilai untuk ' + dicabut.join(', ') + ' dicabut padahal penilaiannya sudah berjalan; penilai lama tidak bisa lagi mengakses guru itu. Lanjutkan?')) return;
    var pid = S.periodeId;
    kerjakan(function () { return db.ref(N.tugas + '/' + pid).update(upd); }, function () {
      if (typeof addLog === 'function') addLog('PKG penugasan penilai', (S.periodeList[pid] || {}).nama || pid);
      pesan(terkunci.length ? 'Penugasan tersimpan. Tidak diubah (sudah ditetapkan): ' + terkunci.join(', ') + '.' : 'Penugasan tersimpan.'); muat();
    }, 'Gagal menyimpan: ');
  }

  // ---------- cetak (A4) ----------
  // isiAtauFn: string HTML, atau fungsi yang mengembalikan string / Promise<string> (mis. perlu memuat bukti dulu).
  // Jendela tetap dibuka SINKRON dari klik supaya tidak diblokir popup; isinya ditulis sesudah siap.
  function bukaCetak(judul, isiAtauFn) {
    var w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return pesan('Popup diblokir browser.', true);
    var logo = ''; try { logo = new URL('logo/logo-lembaga.png', location.href).href; } catch (e) { }
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : { nama: 'MADRASAH', alamat: '' };
    var kop = '<div style="display:flex;gap:12px;align-items:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:12px">' +
      (logo ? '<img src="' + esc(logo) + '" style="width:64px;height:64px;object-fit:contain" onerror="this.style.display=\'none\'">' : '') +
      '<div style="text-align:center;flex:1"><div style="font-weight:700;font-size:15px">' + esc(M.nama) + '</div><div style="font-size:11px">' + esc(M.alamat || M.jalan || '') + '</div></div></div>';
    var rakit = function (isi) { return ('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(judul) + '</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;font-size:12px;color:#000}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #000;padding:4px 6px;vertical-align:top}th{background:#eee}h3{text-align:center;margin:6px 0 10px;font-size:14px}.ttd{display:flex;justify-content:space-around;margin-top:28px;text-align:center}.ttd>div{width:30%}.noprint{margin-bottom:10px}.ket{font-size:10.5px;color:#333}@media print{.noprint{display:none}}</style></head><body><div class="noprint"><button onclick="window.print()">🖨️ Cetak</button></div>' + kop + isi + '</body></html>'); };
    // Tanda tangan QR (ttd-digital.js): penanda [[TTD:...]] diganti QR/gambar. Jendela sudah dibuka sinkron
    // di atas supaya tidak diblokir popup; isinya ditulis setelah QR selesai dibuat.
    var tanpaTtd = function (t) { return t.replace(/\[\[TTD:[a-z_]+:[^\]\s]+\]\]/g, ''); };
    w.document.write('<!doctype html><meta charset="utf-8"><title>' + esc(judul) + '</title><body style="font-family:Arial,sans-serif;padding:24px">Menyiapkan dokumen…</body>');
    w.document.close();
    Promise.resolve().then(function () { return typeof isiAtauFn === 'function' ? isiAtauFn() : isiAtauFn; }).then(function (isi) {
      var dokAwal = rakit(isi);
      return (window.TTD && typeof window.TTD.isiHtml === 'function')
        ? window.TTD.isiHtml(dokAwal).catch(function () { return tanpaTtd(dokAwal); })
        : tanpaTtd(dokAwal);
    }).then(function (dok) { w.document.open(); w.document.write(dok); w.document.close(); })
      .catch(function (e) { try { w.document.body.textContent = 'Gagal menyiapkan dokumen: ' + ((e && e.message) || e); } catch (x) { } });
  }

  // Blok Kepala Madrasah pada cetakan. QR verifikasi hanya dibuat bila diminta DAN yang mencetak Admin/Kepsek
  // (opsi hanyaPimpinan); selain itu tersedia ruang kosong untuk tanda tangan basah.
  function blokKepalaCetak(denganQr, jenis, ket) {
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : {};
    var nama = M.kepala_sekolah || '................................';
    var qr = (denganQr && window.TTD && typeof window.TTD.penanda === 'function')
      ? window.TTD.penanda('kepala', { jenis: jenis, ket: ket }, { hanyaPimpinan: true }) : '';
    // Penanda status: cetakan tanpa QR Kepala diberi tulisan agar tidak dikira dokumen yang sudah disahkan.
    var tanda = '';
    if (!denganQr) tanda = 'BELUM FINAL &mdash; belum disahkan Kepala Madrasah';
    else if (!(kep() || adm())) tanda = 'Tanpa QR pengesahan &mdash; cetak resmi oleh Admin / Kepala Madrasah';
    return '<div>Kepala Madrasah/Atasan Langsung<div style="min-height:22mm;display:flex;align-items:flex-end;justify-content:center">' + qr + '</div>(' + esc(nama) + ')' +
      (M.nip_kepala_sekolah ? '<br>NIP. ' + esc(M.nip_kepala_sekolah) : '') +
      (tanda ? '<div style="margin-top:6px;font-size:10px;font-weight:700;color:#b91c1c;border:1px solid #b91c1c;border-radius:4px;padding:2px 6px;display:inline-block">' + tanda + '</div>' : '') + '</div>';
  }


  // ----- perbandingan Diri vs Siswa untuk guru yang dinilai (setelah hasil diajukan) dan untuk laporan -----
  // Hanya persentase per butir. Persentase siswa ditampilkan bila responden >= batas minimum angket siswa (anonimitas).
  function bandingData(gk) {
    var A = DR(), d = dataBukti(gk), a = dataAngket(gk);
    if (!A || !d || !d.diri || !d.diri.j) return null;
    var rs = (a && a.resp && a.resp.siswa) || [], min = (A.jenis && A.jenis.siswa && A.jenis.siswa.min) || 10, b, belumHitung = false;
    if (rs.length) b = A.banding(d.diri.j, rs);                // penilai / Kepala / Admin: dari jawaban mentah (terkini)
    else {
      // Guru yang dinilai tidak boleh membaca jawaban mentah (Rules). Ia memakai ringkasan per butir yang disimpan penilai
      // saat "Hitung hasil ke bukti" (angketSiswa); tanpa ini tabel selalu kosong karena jawaban mentah tidak terbaca.
      var ag = d.angketSiswa || {}, ns = (d.angketN && Number(d.angketN.siswa)) || 0;
      b = A.banding(d.diri.j, []); b.nSiswa = ns; belumHitung = !d.angketAt;
      b.baris.forEach(function (r) {
        var x = r.s && ag[r.s];
        if (x && typeof x.pct === 'number') { r.siswa = x.pct; r.n = x.n; r.selisih = (r.diri != null) ? Math.round((r.diri - x.pct) * 10) / 10 : null; }
      });
    }
    var tampil = b.nSiswa >= min;
    if (!tampil) b.baris.forEach(function (r) { r.siswa = null; r.selisih = null; });
    return { b: b, min: min, tampil: tampil, belumHitung: belumHitung, refleksi: d.diri.r || {}, D: A.diri };
  }
  function bandingTabel(x, cetak) {
    var th = cetak ? '' : ' style="text-align:left"';
    return '<div style="overflow-x:auto"><table' + (cetak ? '' : ' class="table" style="width:100%;font-size:12.5px"') + '><thead><tr><th' + th + '>Butir</th><th>Indikator</th><th>Diri</th><th>Peserta didik</th><th>Selisih</th></tr></thead><tbody>' +
      x.b.baris.map(function (r) {
        return '<tr' + (cetak ? ' style="page-break-inside:avoid"' : '') + '><td title="' + esc(r.t) + '">' + esc(r.t.length > 70 && !cetak ? r.t.slice(0, 68) + '…' : r.t) + '</td><td style="text-align:center">' + r.ind + '</td><td style="text-align:center">' + (r.diri == null ? '-' : f1(r.diri) + '%') + '</td><td style="text-align:center">' + (r.siswa == null ? '-' : f1(r.siswa) + '%') + '</td><td style="text-align:center">' + (r.selisih == null ? '-' : (r.selisih > 0 ? '+' : '') + f1(r.selisih)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function bandingCatatan(x) {
    if (x.belumHitung && !x.tampil) return 'Hasil angket peserta didik belum dihitung oleh penilai, jadi persentase peserta didik belum tersedia.';
    return x.tampil ? 'Berdasarkan ' + x.b.nSiswa + ' jawaban peserta didik (anonim). Selisih = diri dikurangi peserta didik. Hanya pembanding untuk refleksi dan PKB, tidak mengubah nilai PKG.'
      : 'Persentase peserta didik belum ditampilkan karena responden baru ' + x.b.nSiswa + ' dari minimal ' + x.min + ' (menjaga kerahasiaan jawaban).';
  }
  function bandingKartuHasil(gk) {
    var u = me(), saya = !!(u && gk === u.key), x = bandingData(gk);
    if (!dataBukti(gk)) return '<div class="card"><p class="text-muted" style="margin:0;font-size:12.5px">Memuat perbandingan penilaian diri…</p></div>';
    if (!x) return saya ? '<div class="card"><h4 style="margin:0 0 4px">📝 Penilaian diri dan angket peserta didik</h4><p class="text-muted" style="font-size:12.5px;margin:0">Anda belum mengisi penilaian diri. Isi lewat 📂 Bukti agar perbandingan dengan angket peserta didik tersedia.</p></div>' : '';
    return '<div class="card"><h4 style="margin:0 0 4px">📝 Penilaian diri dan angket peserta didik</h4><p class="text-muted" style="font-size:12px;margin:0 0 8px">' + esc(bandingCatatan(x)) + '</p>' + bandingTabel(x, false) + '</div>';
  }
  function bandingLaporan(gk) {
    var x = bandingData(gk); if (!x) return '';
    var ref = x.D.refleksi.map(function (r) { return x.refleksi[r[0]] ? '<tr><td style="width:30%;vertical-align:top">' + esc(r[1]) + '</td><td style="white-space:pre-wrap">' + esc(x.refleksi[r[0]]) + '</td></tr>' : ''; }).join('');
    return '<h3 style="page-break-before:always">HASIL PENILAIAN DIRI DAN ANGKET PESERTA DIDIK</h3>' + bandingTabel(x, true) + '<p class="ket">' + esc(bandingCatatan(x)) + '</p>' +
      (ref ? '<h4 style="margin:12px 0 2px">Refleksi guru</h4><table>' + ref + '</table>' : '');
  }
  function sampulLaporan(gk, n, h, per, ada) {
    var M = (typeof MADRASAH !== 'undefined' && MADRASAH) ? MADRASAH : {}, pen = tampil(n.penilaiNama) || namaGuru(n.penilaiKey);
    var daftar = ['Laporan dan evaluasi penilaian per indikator', 'Rekap hasil penilaian kinerja guru'];
    if (ada.banding) daftar.push('Hasil penilaian diri dan angket peserta didik');
    if (ada.lampiran) daftar.push('Lampiran: bukti kinerja per indikator');
    var tahun = (per.mulai ? String(per.mulai).slice(0, 4) : '') + (per.selesai && String(per.selesai).slice(0, 4) !== String(per.mulai || '').slice(0, 4) ? '/' + String(per.selesai).slice(0, 4) : '');
    return '<div style="height:238mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;page-break-after:always">' +
      '<div style="font-size:14px;letter-spacing:4px">LAPORAN</div>' +
      '<div style="font-size:26px;font-weight:700;line-height:1.25;margin:8px 0 4px">PENILAIAN KINERJA GURU</div>' +
      '<div style="font-size:14px">Guru Kelas/Mata Pelajaran</div>' +
      '<div style="width:62%;border-top:3px double #000;margin:26px 0"></div>' +
      '<div style="font-size:12px">Nama Guru</div><div style="font-size:21px;font-weight:700;margin:2px 0 16px">' + esc(namaGuru(gk)) + '</div>' +
      '<div style="font-size:12px">Periode Penilaian</div><div style="font-size:15px;font-weight:700;margin:2px 0 16px">' + esc(per.nama || '') + (per.jenis ? ' (' + esc(per.jenis) + ')' : '') + '</div>' +
      '<div style="font-size:12px">Penilai</div><div style="font-size:15px;font-weight:700;margin:2px 0 16px">' + esc(pen) + '</div>' +
      '<div style="font-size:12px">Hasil</div><div style="font-size:15px;font-weight:700">Nilai ' + f1(h.nilai100) + ' &mdash; ' + esc(h.sebutan) + '</div>' +
      '<div style="width:62%;border-top:1px solid #000;margin:26px 0 10px"></div>' +
      '<div style="font-size:12px;text-align:left;width:62%"><b>Isi laporan</b><ol style="margin:4px 0 0 18px;padding:0">' + daftar.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>' +
      '<div style="margin-top:36px;font-size:13px;font-weight:700">' + esc(M.nama || '') + (tahun ? '<br>' + esc(tahun) : '') + '</div></div>';
  }

  function cetakLaporan(gk) {
    var n = S.nilai[gk]; if (!n || !n.skor || !hasilTerlihat(gk, statusDari(n))) return pesan('Belum ada hasil untuk dicetak.', true);
    var per = S.periodeList[S.periodeId] || {}, h = hitung(n.skor), t = tugasDari(gk) || {};
    if (!h.lengkap) return pesan('Laporan belum bisa dicetak: penilaian belum lengkap (' + jumlahTerisi(n.skor) + '/' + P.totalIndikator() + ' indikator terisi).', true);
    var o = '<h3>LAPORAN DAN EVALUASI<br>PENILAIAN KINERJA GURU KELAS/MATA PELAJARAN</h3>' +
      '<table><tr><td style="width:30%">Nama Guru</td><td>' + esc(namaGuru(gk)) + '</td></tr>' + identitasBaris(gk) + '<tr><td>Nama Madrasah</td><td>' + esc((typeof MADRASAH !== 'undefined' && MADRASAH.nama) || '') + '</td></tr>' +
      '<tr><td>Periode penilaian</td><td>' + esc(per.nama || '') + ' (' + esc(per.jenis || 'PKG') + ')' + (per.mulai ? ', ' + fmtTgl(per.mulai) + ' s.d. ' + fmtTgl(per.selesai) : '') + '</td></tr>' +
      '<tr><td>Penilai</td><td>' + esc(tampil(n.penilaiNama) || namaGuru(n.penilaiKey)) + '</td></tr>' +
      '<tr><td>SK penugasan penilai</td><td>' + skPenTeks(n.penilaiKey) + '</td></tr>' +
      (t.jadwal ? '<tr><td>Tanggal pengamatan</td><td>' + fmtTgl(t.jadwal) + '</td></tr>' : '') + '</table>';
    o += '<table><thead><tr><th>No</th><th>Indikator kinerja</th><th style="width:40px">Skor</th><th style="width:30%">Catatan</th></tr></thead><tbody>';
    P.komponen.forEach(function (k, ki) {
      var c = h.komponen[ki];
      o += '<tr><td colspan="4" style="background:#f5f5f5"><b>' + k.no + '. ' + esc(k.nama) + '</b> (' + esc(k.kompetensi) + ') &mdash; skor ' + c.total + '/' + c.maks + ' &bull; ' + f1(c.persen) + '% &bull; <b>nilai ' + c.nilai + '</b></td></tr>';
      k.indikator.forEach(function (ind, i) {
        var key = k.no + '_' + (i + 1), label = k.no + '.' + (i + 1), v = n.skor[key];
        o += '<tr><td>' + label + '</td><td>' + esc(ind.t) + '</td><td style="text-align:center">' + (v == null ? '-' : v) + '</td><td>' + esc((n.catatan && n.catatan[key]) || '') + '</td></tr>';
      });
    });
    o += '</tbody></table><!--SISIP-->';
    o += '<h3 style="page-break-before:always">REKAP HASIL PENILAIAN KINERJA GURU KELAS/MATA PELAJARAN</h3>' +
      '<table><thead><tr><th>No</th><th>Kompetensi / Komponen</th><th style="width:60px">Nilai (1–4)</th></tr></thead><tbody>';
    var last = '';
    P.komponen.forEach(function (k, ki) {
      if (k.kompetensi !== last) { o += '<tr><td colspan="3"><b>' + esc(k.kompetensi) + '</b></td></tr>'; last = k.kompetensi; }
      o += '<tr><td>' + k.no + '</td><td>' + esc(k.nama) + '</td><td style="text-align:center">' + h.komponen[ki].nilai + '</td></tr>';
    });
    o += '<tr><td colspan="2"><b>Jumlah (hasil penilaian kinerja guru)</b></td><td style="text-align:center"><b>' + h.jumlah + '</b></td></tr></tbody></table>' +
      '<p>Nilai PKG (skala 100) = ' + h.jumlah + ' / ' + h.tertinggi + ' &times; 100 = <b>' + f1(h.nilai100) + '</b> &mdash; Sebutan: <b>' + esc(h.sebutan) + '</b> (NPK ' + h.npk + '%)</p>';
    o += '<p style="font-size:11px">Persetujuan: ' + (n.persetujuan && n.persetujuan.setuju ? 'guru yang dinilai telah menyatakan setuju pada ' + fmtTgl(n.persetujuan.tanggal) + '.' : 'belum ada persetujuan guru.') + '</p>';
    o += '<!--RTL-->';
    o += '<div class="ttd"><div>Guru yang Dinilai<br><br><br><br>(' + esc(namaGuru(gk)) + ')</div><div>Penilai<br><br><br><br>(' + esc(tampil(n.penilaiNama) || namaGuru(n.penilaiKey)) + ')</div>' + blokKepalaCetak(statusDari(n) === 'ditetapkan', 'Laporan PKG', 'PKG ' + namaGuru(gk) + ' | ' + (per.nama || '') + ' | Nilai ' + f1(h.nilai100) + ' (' + h.sebutan + ')') + '</div>';
    bukaCetak('Laporan PKG - ' + namaGuru(gk), function () {
      return Promise.all([new Promise(function (res) { muatBukti(gk, res); }), new Promise(function (res) { muatAngket(gk, res); }), new Promise(function (res) { muatRtl(gk, res); })]).then(function () {
        var bd = bandingLaporan(gk), lp = lampiranLaporan(gk);
        return sampulLaporan(gk, n, h, per, { banding: !!bd, lampiran: !!lp }) + o.replace('<!--SISIP-->', bd).replace('<!--RTL-->', rtlCetakHtml(gk)) + lp;
      });
    });
  }
  // v77: Cetak SKOR SEMENTARA (draft / belum lengkap / belum final). Bukan laporan resmi: tanpa QR & pengesahan, diberi tanda air.
  // dariForm=true -> memakai isian yang sedang tampil di form penilaian (S.draft, belum tentu sudah disimpan); selain itu memakai data tersimpan.
  // Hak akses sama dengan Cetak laporan; guru yang dinilai tidak bisa mencetak skor drafnya sendiri (hasilTerlihat).
  function cetakSkorSementara(gk, dariForm) {
    var u = me(), n = S.nilai[gk] || {}, st = statusDari(n);
    if (!u || !(gk === u.key || bolehMenilai(gk) || lihatSemua()) || !hasilTerlihat(gk, st)) return pesan('Anda tidak berhak mencetak skor sementara guru ini.', true);
    var pakaiForm = !!(dariForm && S.draft && S.gk === gk && bolehMenilai(gk));
    var skor = (pakaiForm ? S.draft.skor : n.skor) || {}, cat = (pakaiForm ? S.draft.catatan : n.catatan) || {};
    if (!Object.keys(skor).length) return pesan('Belum ada skor yang terisi untuk dicetak.', true);
    var per = S.periodeList[S.periodeId] || {}, t = tugasDari(gk) || {}, h = hitung(skor), total = P.totalIndikator(), terisi = jumlahTerisi(skor);
    var pkey = n.penilaiKey || t.penilaiKey, pen = tampil(n.penilaiNama || t.penilaiNama) || (pkey ? namaGuru(pkey) : '-');
    var label = { belum: 'Belum dinilai', draft: 'Draft', diajukan: 'Diajukan ke guru, menunggu persetujuan', disetujui: 'Disetujui guru, menunggu penetapan', ditetapkan: 'Ditetapkan', keberatan: 'Keberatan guru, sedang direvisi' };
    var jml = 0, o = '<div style="position:fixed;top:38%;left:0;right:0;text-align:center;font-size:96px;font-weight:700;color:rgba(0,0,0,.07);transform:rotate(-28deg);z-index:-1">SEMENTARA</div>' +
      '<h3>SKOR SEMENTARA<br>PENILAIAN KINERJA GURU KELAS/MATA PELAJARAN</h3>' +
      '<p style="text-align:center;font-weight:700;border:1px solid #000;padding:4px">BELUM FINAL &mdash; bukan hasil resmi PKG; skor masih dapat berubah</p>' +
      '<table><tr><td style="width:30%">Nama Guru</td><td>' + esc(namaGuru(gk)) + '</td></tr>' + identitasBaris(gk) +
      '<tr><td>Periode penilaian</td><td>' + esc(per.nama || '') + (per.jenis ? ' (' + esc(per.jenis) + ')' : '') + '</td></tr>' +
      '<tr><td>Penilai</td><td>' + esc(pen) + '</td></tr>' +
      '<tr><td>Status</td><td>' + (pakaiForm ? 'Draft (isian form saat dicetak, belum tentu sudah disimpan)' : esc(label[st] || st)) + '</td></tr>' +
      '<tr><td>Indikator terisi</td><td>' + terisi + ' dari ' + total + '</td></tr>' +
      '<tr><td>Dicetak</td><td>' + esc(new Date().toLocaleString('id-ID')) + ' oleh ' + esc(tampil(pengisi(u))) + '</td></tr></table>' +
      '<table><thead><tr><th>No</th><th>Indikator kinerja</th><th style="width:40px">Skor</th><th style="width:30%">Catatan</th></tr></thead><tbody>';
    P.komponen.forEach(function (k) {
      var tk = 0, ik = 0;
      k.indikator.forEach(function (x, i) { var v = skor[k.no + '_' + (i + 1)]; if (v === 0 || v === 1 || v === 2) { tk += v; ik++; } });
      jml += tk;
      o += '<tr><td colspan="4" style="background:#f5f5f5"><b>' + k.no + '. ' + esc(k.nama) + '</b> (' + esc(k.kompetensi) + ') &mdash; terisi ' + ik + '/' + k.indikator.length + ' &bull; skor ' + tk + ' dari maks ' + (k.indikator.length * 2) + '</td></tr>';
      k.indikator.forEach(function (x, i) {
        var key = k.no + '_' + (i + 1), v = skor[key], ada = (v === 0 || v === 1 || v === 2);
        o += '<tr style="page-break-inside:avoid"><td>' + k.no + '.' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td style="text-align:center">' + (ada ? v : '-') + '</td><td>' + esc(cat[key] || '') + '</td></tr>';
      });
    });
    o += '</tbody></table><p><b>Jumlah skor terisi:</b> ' + jml + ' dari maks ' + (total * 2) + '.</p>';
    o += h.lengkap
      ? '<p>Semua indikator sudah terisi. Nilai sementara (skala 100) = <b>' + f1(h.nilai100) + '</b> &mdash; ' + esc(h.sebutan) + '. Nilai resmi hanya pada Laporan PKG setelah diajukan, disetujui, dan ditetapkan.</p>'
      : '<p>Nilai skala 100 dan sebutan baru dihitung setelah seluruh ' + total + ' indikator terisi.</p>';
    o += '<p class="ket">Dokumen kerja untuk pemantauan. Tidak memuat tanda tangan, QR, atau pengesahan Kepala Madrasah.</p>';
    if (typeof addLog === 'function') addLog('PKG cetak skor sementara', namaGuru(gk) + (pakaiForm ? ' (form)' : ''));
    bukaCetak('Skor Sementara PKG - ' + namaGuru(gk), o);
  }
  // Lampiran: bukti per indikator yang mendasari skor (dokumen, observasi, data otomatis). Tanpa wawancara.
  function lampiranLaporan(gk) {
    var d = dataBukti(gk); if (!d) return '';
    var rows = '';
    P.komponen.forEach(function (k) {
      k.indikator.forEach(function (x, i) {
        var l = lampiranCetak(gk, k.no + '_' + (i + 1)); if (!l) return;
        rows += '<tr style="page-break-inside:avoid"><td>' + k.no + '.' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td class="ket">' + l + '</td></tr>';
      });
    });
    if (!rows) return '';
    return '<h3 style="page-break-before:always">LAMPIRAN: BUKTI KINERJA PER INDIKATOR</h3><table><thead><tr><th style="width:38px">No</th><th style="width:34%">Indikator</th><th>Bukti terlampir</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="ket">Bukti dihimpun melalui aplikasi SI MAMBA' + (d.otoAt ? '; data otomatis (absensi, jurnal, nilai, perangkat pembelajaran, buku penghubung, kegiatan madrasah, materi/tugas daring, penilaian diri) ditarik ' + fmtTgl(String(d.otoAt).slice(0, 10)) + ' untuk rentang ' + fmtTgl(d.otoDari) + ' s.d. ' + fmtTgl(d.otoSampai) : '') + '. Catatan wawancara bersifat rahasia dan tidak dilampirkan.</p>';
  }

  function cetakRekap() {
    if (!lihatSemua()) return;
    var per = S.periodeList[S.periodeId] || {}, rows = barisGuru();
    var o = '<h3>REKAP NILAI PENILAIAN KINERJA GURU<br>' + esc(per.nama || '') + '</h3><table><thead><tr><th>No</th><th>Nama Guru</th><th>Penilai</th>' +
      P.komponen.map(function (k) { return '<th>' + k.no + '</th>'; }).join('') + '<th>Jumlah</th><th>Nilai</th><th>Sebutan</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(function (x, i) {
      var h = x.h;
      o += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.g.name) + '</td><td>' + esc(x.t ? (tampil(x.t.penilaiNama) || namaGuru(x.t.penilaiKey)) : '-') + '</td>' +
        P.komponen.map(function (k, ki) { return '<td style="text-align:center">' + (h && h.komponen[ki].terisi ? h.komponen[ki].nilai : '-') + '</td>'; }).join('') +
        '<td style="text-align:center">' + (h && h.lengkap ? h.jumlah : '-') + '</td><td style="text-align:center">' + (h && h.lengkap ? f1(h.nilai100) : '-') + '</td><td>' + (h && h.lengkap ? esc(h.sebutan) : '-') + '</td><td>' + esc(STATUS_LABEL[x.st] || x.st) + '</td></tr>';
    });
    o += '</tbody></table><p style="font-size:10px">Kolom 1–' + P.komponen.length + ' = nilai komponen (1–4). Nilai = jumlah / ' + (P.komponen.length * 4) + ' × 100. Sebutan: ≥91 Sangat Baik, 76–90 Baik, 61–75 Cukup, 51–60 Kurang, ≤50 Buruk.</p>' +
      '<div class="ttd"><div></div><div></div>' + blokKepalaCetak(true, 'Rekap Nilai PKG', 'Rekap ' + (per.nama || '') + ' | ' + rows.length + ' guru') + '</div>';
    bukaCetak('Rekap PKG', o);
  }

  // ---------- perangkat penilaian: daftar bukti, lembar observasi, pedoman wawancara ----------
  // Dibentuk dari instrumen (P.komponen), jadi nomor indikator dan bukti selalu sama dengan aplikasi.
  var RE_OBS = /supervisi|pengamatan|observasi|kunjungan kelas|mengamati/i;
  // [penyedia, nama bukti, pola pencocokan pada teks bukti instrumen]
  var GRUP_BUKTI = [
    ['guru', 'Dokumen RPP terbaru', /^(Dokumen RPP|RPP)/i],
    ['guru', 'Silabus terbaru', /silabus/i],
    ['guru', 'Pemetaan / analisis KI dan KD', /pemetaan|analisis KI|^KI/i],
    ['guru', 'Daftar catatan harian guru', /catatan harian/i],
    ['guru', 'Jurnal pembelajaran', /jurnal/i],
    ['guru', 'Daftar nilai / buku nilai / leger / hasil penilaian harian terakhir', /daftar nilai|buku nilai|leger|penilaian harian/i],
    ['guru', 'Perangkat penilaian (kisi-kisi, sebaran soal, kartu soal)', /perangkat penilaian/i],
    ['guru', 'Analisis hasil penilaian (ketuntasan / daya serap tiap KD)', /analisis (hasil )?penilaian|daya serap/i],
    ['guru', 'Program remedial dan pengayaan', /remedial/i],
    ['guru', 'Lembar jawaban tes yang ditandatangani orang tua', /lembar jawaban/i],
    ['guru', 'Daftar hadir peserta didik (terakhir)', /daftar hadir terakhir peserta/i],
    ['guru', 'Daftar catatan evaluasi diri guru', /evaluasi diri/i],
    ['guru', 'Rencana / program PKB dan bukti kegiatan PKB (termasuk akses laman PKB)', /PKB/i],
    ['guru', 'Bukti keaktifan KKG/MGMP atau organisasi guru (surat tugas, dokumen kegiatan, foto)', /KKG|MGMP|organisasi guru|foto kegiatan guru|anggota profesi/i],
    ['guru', 'Piagam / sertifikat prestasi atau lomba guru berprestasi', /piagam/i],
    ['guru', 'Hasil karya tulis ilmiah / karya inovatif', /karya/i],
    ['guru', 'Dokumentasi upacara bendera / PHBN dan surat pernyataan tidak terlibat organisasi terlarang', /upacara|surat pernyataan/i],
    ['guru', 'Surat keterangan / surat cuti / surat tugas (alasan tidak hadir)', /surat keterangan/i],
    ['madrasah', 'Rekap daftar hadir guru', /daftar hadir guru/i],
    ['madrasah', 'Catatan piket madrasah', /piket/i],
    ['madrasah', 'SK kegiatan di madrasah dan di luar madrasah', /^SK kegiatan/i],
    ['penilai', 'Dokumen / laporan / catatan hasil supervisi akademik dan observasi pembelajaran', /supervisi/i],
    ['penilai', 'Pengamatan atau kunjungan kelas', /pengamatan|mengamati|kunjungan kelas/i],
    ['penilai', 'Telaah RPP (dokumen hasil telaah RPP)', /telaah RPP|hasil telaah/i],
    ['penilai', 'Wawancara (guru, sejawat, kepala madrasah, peserta didik, orang tua, komite)', /wawancara/i],
    ['penilai', 'Telaah jejak digital guru dalam penggunaan TIK', /jejak digital/i]
  ];
  // Pertanyaan inti wawancara per narasumber (rancangan; narasumber mengikuti yang disebut pada instrumen).
  var WAWANCARA = [
    { who: 'Guru yang dinilai', q: [
      ['1.1', 'Bagaimana Bapak/Ibu mengetahui gaya dan kesulitan belajar tiap peserta didik? Berikan contoh satu anak dan tindakan Anda.'],
      ['1.2', 'Apa yang Bapak/Ibu lakukan agar peserta didik dengan kemampuan atau kondisi berbeda, termasuk yang berkebutuhan khusus, tetap ikut aktif?'],
      ['1.3', 'Ceritakan satu kasus perilaku menyimpang peserta didik. Bagaimana Anda mencari penyebabnya dan apa tindak lanjutnya?'],
      ['2.3', 'Pada pembelajaran terakhir, apa yang berbeda dari rencana dan mengapa Anda mengubahnya?'],
      ['12.2', 'Kegiatan madrasah atau masyarakat apa yang Bapak/Ibu ikuti dalam setahun terakhir, dan apa peran Anda?'],
      ['14.2', 'Tunjukkan jurnal pembelajaran atau catatan masukan sejawat. Perbaikan apa yang pernah Anda lakukan dari catatan itu?'],
      ['14.5', 'Penelitian, karya inovasi, atau kegiatan ilmiah apa yang pernah Anda ikuti atau hasilkan?'],
      ['14.6', 'Bagaimana Bapak/Ibu memanfaatkan TIK untuk berkomunikasi dan mengikuti kegiatan PKB?']
    ] },
    { who: 'Kepala madrasah atau wakil kepala madrasah (diwawancarai penilai)', q: [
      ['8.1', 'Bagaimana sikap guru ini terhadap nilai-nilai Pancasila dalam kegiatan madrasah, misalnya upacara dan peringatan hari nasional?'],
      ['8.2', 'Bagaimana kerja sama guru ini dengan rekan tanpa membedakan suku, agama, atau latar belakang?'],
      ['9.1', 'Bagaimana kesantunan guru ini dalam berbicara dan berpenampilan terhadap peserta didik, orang tua, dan rekan?'],
      ['9.2', 'Apakah guru ini mau berbagi pengalaman atau mengundang rekan mengamati pembelajarannya? Berikan contoh.'],
      ['9.3', 'Bagaimana wibawa guru ini di depan kelas dan keaktifan peserta didik saat ia mengajar?'],
      ['9.4', 'Bagaimana guru ini menerima masukan, termasuk dari peserta didik?'],
      ['9.5', 'Apakah perilaku guru ini menjaga nama baik madrasah? Berikan contoh.'],
      ['10.5', '(Wakil kepala madrasah bidang kurikulum) Apakah tugas administrasi dan non-pembelajaran guru ini selesai tepat waktu dan sesuai standar?'],
      ['10.8', 'Apa yang menunjukkan bahwa guru ini bangga dengan profesinya?'],
      ['11.2', 'Bagaimana kontribusi guru ini dalam diskusi formal maupun informal dengan rekan?']
    ] },
    { who: 'Peserta didik (bahasa sederhana, tanpa kehadiran guru)', q: [
      ['2.4', 'Apa yang dilakukan Bapak/Ibu guru supaya kamu semangat belajar?'],
      ['11.1', 'Apakah guru memperlakukan semua teman dengan adil? Ceritakan contohnya.'],
      ['11.3', 'Apakah guru sering mengajak bicara semua teman, bukan hanya yang pandai atau dekat dengannya?'],
      ['14.4', 'Apakah cara guru mengajar sekarang terasa lebih baik dibanding sebelumnya? Apa yang berubah?'],
      ['14.6', 'Apakah guru memakai komputer, HP, atau internet saat mengajar atau memberi tugas? Seperti apa?']
    ] },
    { who: 'Orang tua atau komite madrasah', q: [
      ['12.1', 'Seberapa sering dan lewat cara apa guru memberi kabar tentang kemajuan, kesulitan, dan potensi anak Anda?'],
      ['12.2', 'Bagaimana peran guru ini dalam kegiatan madrasah dan masyarakat yang Anda ketahui?']
    ] }
  ];
  // v56: teman sejawat = SATU guru yang ditunjuk penilai; mengisi sendiri di akunnya (bukan diwawancarai). Indeks 4 (ditambah di belakang
  // agar kunci data lama g0..g3 tidak bergeser). Pertanyaan sama dengan narasumber Kepala/wakil, kecuali butir khusus wakil kepala (10.5).
  var WW_SEJ = 4;
  // v56 (opsi C): wawancara hanya dengan Guru yang dinilai dan Teman sejawat (diisi sendiri). Kepala = penilai sendiri, orang tua/komite
  // sudah tercakup angket, jadi keduanya disembunyikan (tetap di array agar indeks g0..g4 tidak bergeser; data lama tidak dibaca lagi).
  WAWANCARA[1].sembunyi = true; WAWANCARA[2].sembunyi = true; WAWANCARA[3].sembunyi = true;   // peserta didik juga disembunyikan: seluruh butirnya (2.4, 11.1, 11.3, 14.4, 14.6) sudah dicakup angket siswa kelas 4-6
  WAWANCARA.push({ who: 'Teman sejawat (satu guru yang ditunjuk; mengisi sendiri di akunnya)', sejawat: true, q: WAWANCARA[1].q.filter(function (x) { return x[0] !== '10.5'; }) });


  // Penanda pengamatan kelas per indikator (diisi PENILAI saat melihat langsung). Tiap penanda yang terlihat dicentang.
  // Usulan skor: semua terlihat -> 2; sebagian -> 1; tidak ada -> 0. Keputusan skor tetap di tangan penilai.
  var PENANDA = {
    '1.1': ['Guru memanggil murid dengan nama', 'Memberi penjelasan atau tugas berbeda bagi murid yang cepat dan yang lambat', 'Menyebut kebiasaan atau kesulitan murid tertentu'],
    '1.2': ['Semua murid, termasuk yang pendiam atau berkebutuhan khusus, mendapat giliran', 'Kegiatan memungkinkan semua murid ikut', 'Tidak ada murid yang dibiarkan pasif terus-menerus'],
    '1.3': ['Perilaku menyimpang ditanggapi dengan mencari tahu penyebab, bukan langsung menghukum', 'Murid lain tidak dirugikan', 'Ada tindak lanjut yang tenang'],
    '2.1': ['Kegiatan bervariasi (menjelaskan, diskusi, praktik, latihan)', 'Sesuai usia dan kemampuan murid', 'Murid punya waktu menguasai materi'],
    '2.2': ['Guru mengecek pemahaman di tengah pelajaran (tanya, tanda jari, soal singkat)', 'Langkah berikutnya disesuaikan dengan hasil pengecekan'],
    '2.4': ['Memakai lebih dari satu cara memotivasi (cerita, permainan, pujian spesifik, tantangan)', 'Murid tampak antusias'],
    '2.6': ['Murid yang belum paham dijelaskan ulang dengan cara lain', 'Kegiatan berikutnya disesuaikan'],
    '4.1': ['Langkah pelajaran (pembuka, inti, penutup) sesuai rancangan', 'Tujuan pembelajaran disampaikan', 'Informasi baru disampaikan dengan benar'],
    '4.2': ['Suasana tidak menekan', 'Pertanyaan guru membantu belajar, bukan menguji atau menjatuhkan', 'Murid berani mencoba'],
    '4.3': ['Jawaban salah dijadikan bahan belajar (mis. meminta tanggapan murid lain dulu)', 'Murid tidak dipermalukan'],
    '4.4': ['Materi sesuai kurikulum', 'Dikaitkan dengan contoh kehidupan sehari-hari murid'],
    '4.5': ['Metode berganti sesuai kondisi kelas', 'Pembagian waktu wajar', 'Perhatian murid terjaga'],
    '4.6': ['Waktu murid terpakai produktif', 'Guru tidak mendominasi atau sibuk sendiri', 'Peralihan kegiatan tertib'],
    '4.7': ['Murid diberi kesempatan bertanya', 'Murid diberi kesempatan mempraktikkan', 'Murid berinteraksi dengan teman'],
    '4.8': ['Urutan kegiatan runtut', 'Informasi baru diberikan setelah memastikan materi sebelumnya dipahami'],
    '4.9': ['Memakai alat bantu atau media (benda nyata, gambar, audio-visual/TIK)', 'Media menambah semangat dan sesuai tujuan pelajaran'],
    '5.2': ['Murid dapat menyesuaikan cara atau tingkat tugas dengan kecakapannya', 'Tugas mengakomodasi pola belajar yang berbeda'],
    '5.3': ['Ada tugas atau pertanyaan yang meminta murid bernalar, membandingkan, atau membuat sesuatu sendiri'],
    '5.4': ['Guru berkeliling dan memperhatikan murid satu per satu', 'Memberi umpan balik pribadi'],
    '6.1': ['Guru bertanya untuk mengecek pemahaman dan menjaga keterlibatan', 'Ada pertanyaan terbuka yang menuntut ide murid'],
    '6.2': ['Guru mendengarkan sampai selesai', 'Tidak memotong tanpa alasan', 'Memperhatikan semua murid yang berbicara'],
    '6.3': ['Jawaban guru atas pertanyaan murid benar dan mutakhir', 'Sesuai tujuan pembelajaran', 'Penanya tidak dipermalukan'],
    '6.4': ['Ada kegiatan berpasangan atau berkelompok', 'Murid saling membantu', 'Peran murid jelas'],
    '6.5': ['Guru menyimak semua jawaban murid', 'Guru merespons jawaban yang tepat maupun yang kurang tepat'],
    '9.3': ['Murid memperhatikan guru', 'Murid mengikuti arahan tanpa ditegur berulang', 'Murid aktif berpartisipasi'],
    '10.1': ['Pembelajaran dimulai tepat jadwal', 'Pembelajaran diakhiri tepat jadwal'],
    '13.1': ['Materi dikaitkan dengan ayat Al-Qur\u2019an atau Hadits yang sesuai', 'Kaitannya tepat, bukan sekadar tempelan'],
    '13.3': ['Informasi dan konsep yang disampaikan tepat dan mutakhir', 'Penjelasan membantu murid memahami konsep']
  };
  function skorDariPenanda(t, n) { return n > 0 && t >= n ? 2 : (t > 0 ? 1 : 0); }
  // v72: catatan kejadian pada lembar penanda terisi otomatis dari penanda yang dicentang (bisa diedit; tidak menimpa ketikan penilai)
  function catatanDariPenanda(arr, t) {
    var on = {}, ada = [], belum = [];
    t.forEach(function (i) { on[i] = 1; });
    arr.forEach(function (p, i) { (on[i] ? ada : belum).push(p); });
    var o = ada.length ? 'Teramati: ' + ada.join('; ') + '.' : 'Belum ada penanda yang teramati.';
    if (ada.length && belum.length) o += ' Belum teramati: ' + belum.join('; ') + '.';
    return potong(o, 400);
  }
  function penandaHtml(key) {
    var lab = key.replace('_', '.'), arr = PENANDA[lab];
    if (!arr) return '';
    return '<details class="pkg-add"><summary>👁️ Lembar penanda pengamatan kelas</summary><div data-pform="' + esc(key) + '">' +
      '<div class="pkg-meta" style="margin:4px 0">Centang penanda yang <b>terlihat</b> saat Anda mengamati pembelajaran.</div>' +
      arr.map(function (p, i) { return '<label style="display:flex;gap:6px;align-items:flex-start;margin:3px 0;font-size:13px"><input type="checkbox" data-pn="' + i + '" style="margin-top:3px"><span>' + esc(p) + '</span></label>'; }).join('') +
      '<textarea class="field" data-f="catatan" rows="2" maxlength="400" placeholder="Catatan kejadian (wajib): terisi otomatis dari penanda yang dicentang. Tambahkan apa yang dilihat/didengar" style="margin-top:6px"></textarea>' +
      '<button type="button" class="btn btn-success" style="margin-top:6px;padding:5px 14px;font-size:12.5px" data-act="bukti-pengamatan" data-key="' + esc(key) + '">💾 Simpan hasil pengamatan</button></div></details>';
  }
  function simpanPengamatan(el) {
    var gk = S.gk, u = me(), key = el.getAttribute('data-key'), box = el.closest('[data-pform]'), arr = PENANDA[String(key || '').replace('_', '.')];
    if (!u || !box || !key || !arr) return;
    if (!bolehJenis('observasi', gk)) return pesan('Hanya penilai yang boleh mengisi hasil pengamatan.', true);
    var ce = box.querySelector('[data-f="catatan"]'), cat = ce ? String(ce.value || '').trim() : '';
    if (!cat) return pesan('Catatan kejadian wajib diisi.', true);
    if (itemTotal(gk, key) >= MAKS_ITEM) return pesan('Maksimal ' + MAKS_ITEM + ' bukti per indikator.', true);
    var t = [];
    Array.prototype.forEach.call(box.querySelectorAll('input[data-pn]'), function (c) { if (c.checked) t.push(c.getAttribute('data-pn')); });
    var n = arr.length, sk = skorDariPenanda(t.length, n);
    // v79: cegah catatan ganda. Hasil yang persis sama ditolak; hasil berbeda perlu konfirmasi (yang terbaru dipakai untuk skor dan cetakan).
    var lama = daftarItem(gk, key).filter(function (it) { return it.jenis === 'observasi' && it.pn; });
    if (lama.length) {
      var lt = lama[lama.length - 1];
      if (String(lt.pn.t || '') === t.join(',') && String(lt.ket || '') === potong(cat, 400)) return pesan('Hasil pengamatan yang sama sudah tersimpan untuk indikator ini.', true);
      if (!window.confirm('Indikator ini sudah punya ' + lama.length + ' hasil pengamatan tersimpan. Hasil yang baru akan dipakai untuk skor usulan dan catatan di Lembar Observasi (yang lama tidak ikut tercetak). Simpan hasil baru?')) return;
    }
    var ref = db.ref(nodeBukti(gk) + '/item/' + key).push();
    var item = { jenis: 'observasi', judul: 'Pengamatan kelas (' + t.length + '/' + n + ' penanda)', ket: potong(cat, 400), pn: { t: t.join(','), n: n, s: sk }, oleh: pengisi(u), olehKey: u.key, at: nowIso() };
    kerjakan(function () { return ref.set(aman(item)); }, function () {
      var d = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {});
      d.item = d.item || {}; d.item[key] = d.item[key] || {}; d.item[key][ref.key] = item;
      if (typeof addLog === 'function') addLog('PKG pengamatan', namaGuru(gk) + ' ' + key.replace('_', '.'));
      pesan('Hasil pengamatan tersimpan.'); render();
    }, 'Gagal menyimpan pengamatan: ');
  }

  function petaIndikator() {
    var m = {};
    P.komponen.forEach(function (k) { k.indikator.forEach(function (x, i) { m[k.no + '.' + (i + 1)] = x; }); });
    return m;
  }
  function komponenDari(rx) {
    var r = [];
    P.komponen.forEach(function (k) { if (k.indikator.some(function (x) { return x.b.some(function (b) { return rx.test(b); }); })) r.push(k.no); });
    return r;
  }
  // Daftar bukti: guru untuk dirinya sendiri; observasi & wawancara hanya untuk penilai / Admin / Kepala Madrasah.
  function bolehPerangkat(jenis, gk) {
    var u = me(); if (!u) return false;
    if (jenis === 'bukti' || jenis === 'diri') return gk === u.key || bolehMenilai(gk) || lihatSemua();
    return bolehMenilai(gk) || lihatSemua();
  }
  function perangkatHeader(gk, judul) {
    var per = S.periodeList[S.periodeId] || {}, t = tugasDari(gk) || {};
    var pen = tampil(t.penilaiNama) || (t.penilaiKey ? namaGuru(t.penilaiKey) : '');
    return '<h3>' + judul + '</h3><table><tr><td style="width:30%">Nama Guru</td><td>' + esc(namaGuru(gk)) + '</td></tr>' + identitasBaris(gk) +
      '<tr><td>Nama Madrasah</td><td>' + esc((typeof MADRASAH !== 'undefined' && MADRASAH.nama) || '') + '</td></tr>' +
      '<tr><td>Periode penilaian</td><td>' + esc(per.nama || '') + ' (' + esc(per.jenis || 'PKG') + ')</td></tr>' +
      '<tr><td>Penilai</td><td>' + esc(pen) + '</td></tr>' +
      (t.jadwal ? '<tr><td>Jadwal pengamatan</td><td>' + fmtTgl(t.jadwal) + '</td></tr>' : '') + '</table>';
  }
  // QR Kepala hanya bila penilaian guru ini sudah FINAL (disetujui / ditetapkan) dan yang mencetak Admin/Kepala
  // (ditegakkan blokKepalaCetak -> hanyaPimpinan). Selain itu ruang kosong untuk tanda tangan basah.
  function ttdPerangkat(gk, denganGuru, judul) {
    var t = tugasDari(gk) || {}, pen = tampil(t.penilaiNama) || (t.penilaiKey ? namaGuru(t.penilaiKey) : '................................');
    var per = S.periodeList[S.periodeId] || {}, final = selesai(statusDari(S.nilai[gk]));
    var kepala = blokKepalaCetak(final, judul || 'Perangkat PKG', (judul || 'Perangkat PKG') + ' | ' + namaGuru(gk) + ' | ' + (per.nama || ''));
    return '<div class="ttd">' + (denganGuru ? '<div>Guru yang Dinilai<br><br><br><br>(' + esc(namaGuru(gk)) + ')</div>' : '<div></div>') +
      '<div>Penilai<br><br><br><br>(' + esc(pen) + ')</div>' + kepala + '</div>';
  }
  // Lampiran bukti per indikator untuk cetakan. Wawancara bersifat rahasia -> tidak pernah dicetak.
  function lampiranCetak(gk, key) {
    var d = dataBukti(gk); if (!d) return '';
    var a = daftarItem(gk, key).filter(function (it) { return it.jenis !== 'wawancara'; }).map(function (it) {
      var url = amanUrl(it.tautan);
      return (JENIS_ITEM[it.jenis] || '') + ' ' + esc(it.judul || '') + (it.ket ? ' &mdash; ' + esc(potong(it.ket, 200)) : '') + (url ? ' <span style="word-break:break-all">(' + esc(url) + ')</span>' : '');
    });
    var o = d.otomatis && d.otomatis[key];
    if (o) { var t = teksOto(d, o); if (t) a.push('🤖 ' + esc(potong(t, 260))); }
    return a.join('<br>');
  }
  function buktiHtml(gk) {
    var o = perangkatHeader(gk, 'DAFTAR BUKTI KINERJA<br>PENILAIAN KINERJA GURU KELAS/MATA PELAJARAN');
    var d = dataBukti(gk);
    o += '<p style="font-size:11px">' + (d ? 'Kotak yang sudah dicentang berasal dari isian di aplikasi SI MAMBA. ' : '') + 'A1 disiapkan guru, A2 diminta ke TU / wakil kepala madrasah, A3 dihasilkan penilai. Penilai boleh menggantinya dengan pengamatan langsung di kelas bila instrumen mengizinkan.</p>';
    [['guru', 'A1. Disiapkan oleh guru yang dinilai'], ['madrasah', 'A2. Disediakan madrasah'], ['penilai', 'A3. Dihasilkan oleh penilai']].forEach(function (g) {
      var rows = '';
      GRUP_BUKTI.forEach(function (b, gi) {
        if (b[0] !== g[0]) return;
        var ks = komponenDari(b[2]); if (!ks.length) return;
        rows += '<tr style="page-break-inside:avoid"><td style="width:38px;text-align:center">' + (d && d.siap && d.siap['g' + gi] ? '&#9745;' : '&#9744;') + '</td><td>' + esc(b[1]) + '</td><td style="width:22%">' + ks.join(', ') + '</td></tr>';
      });
      if (rows) o += '<h4 style="margin:10px 0 2px">' + esc(g[1]) + '</h4><table><thead><tr><th>Siap</th><th>Bukti</th><th>Komponen</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
    o += '<h3 style="page-break-before:always">RINCIAN BUKTI PER INDIKATOR</h3>';
    P.komponen.forEach(function (k) {
      o += '<h4 style="margin:10px 0 2px">Komponen ' + k.no + '. ' + esc(k.nama) + ' (' + esc(k.kompetensi) + ')</h4><table><thead><tr><th style="width:38px">No</th><th style="width:30%">Indikator</th><th>Bukti yang dapat dipakai</th>' + (d ? '<th style="width:26%">Bukti terlampir (isian aplikasi)</th>' : '') + '<th style="width:42px">Ada</th></tr></thead><tbody>';
      k.indikator.forEach(function (x, i) {
        var key = k.no + '_' + (i + 1), lamp = d ? lampiranCetak(gk, key) : '';
        o += '<tr style="page-break-inside:avoid"><td>' + k.no + '.' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td>' +
          x.b.map(function (b, j) { return (j + 1) + ') ' + esc(b); }).join('<br>') + '</td>' + (d ? '<td class="ket">' + lamp + '</td>' : '') + '<td style="text-align:center">' + (lamp ? '&#9745;' : '&#9744;') + '</td></tr>';
      });
      o += '</tbody></table>';
    });
    return o + ttdPerangkat(gk, true, 'Daftar Bukti PKG');
  }
  function observasiHtml(gk) {
    var adaUsulanO = false;
    var o = perangkatHeader(gk, 'LEMBAR OBSERVASI PEMBELAJARAN');
    var ja = jadwalAjar(gk);
    var isiKelas = ja.pada.length ? ja.pada.map(function (j) { return esc(j.kelas) + ' &mdash; ' + esc(j.mapel); }).join('<br>') + '<div style="font-size:10px;color:#64748b">Jadwal mengajar pada hari pengamatan; coret yang tidak diamati.</div>'
      : (ja.mapel.length ? 'Mapel diampu: ' + ja.mapel.slice(0, 8).map(esc).join(', ') : '&nbsp;');
    var isiHari = (ja.hariTgl ? esc(ja.hariTgl) : '&nbsp;') + (ja.pada.length ? '<div style="font-size:11px">Jam ke: ' + ja.pada.map(function (j) { return esc(j.jam); }).join(', ') + '</div>' : '');
    o += '<table><tr><td style="width:30%">Kelas dan mata pelajaran</td><td>' + isiKelas + '</td></tr><tr><td>Hari, tanggal, dan jam ke</td><td>' + isiHari + '</td></tr>' +
      '<tr><td>Kompetensi dasar / materi</td><td>&nbsp;</td></tr><tr><td>Jumlah peserta didik hadir</td><td>&nbsp;</td></tr></table>' +
      '<p style="font-size:11px">Tulis <b>fakta yang teramati</b> (apa yang dikatakan dan dilakukan guru dan peserta didik), bukan kesimpulan. Skor: 0 = tidak ada bukti, 1 = terpenuhi sebagian, 2 = terpenuhi seluruhnya. Indikator yang tidak teramati dikosongkan, lalu dicari buktinya dari dokumen atau wawancara.</p>';
    P.komponen.forEach(function (k) {
      var rows = '';
      k.indikator.forEach(function (x, i) {
        if (x.b.some(function (b) { return RE_OBS.test(b); })) {
          // v75: skor & catatan diambil dari hasil pengamatan yang tersimpan (item jenis observasi); kosong bila belum ada
          var its = daftarItem(gk, k.no + '_' + (i + 1)).filter(function (it) { return it.jenis === 'observasi'; });
          // v78/v79: skor akhir penilai (tab Penilaian) diutamakan; bila belum dinilai, dipakai usulan (lembar penanda, lalu butir Supervisi) diberi tanda *
          var skorO = '', catO = '', nl = S.nilai[gk], sf = nl && nl.skor ? nl.skor[k.no + '_' + (i + 1)] : null;
          if (sf === 0 || sf === 1 || sf === 2) skorO = String(sf);
          else { var us = usulanSkorObs(gk, k.no, i); if (us) { skorO = String(us.s) + '*'; adaUsulanO = true; } }
          // v79: hasil lembar penanda lebih dari satu -> hanya yang terbaru yang tercetak (sama dengan yang dipakai untuk skor); "Fakta teramati:" kosong dibuang
          var idxPn = -1; its.forEach(function (it, j) { if (it.pn) idxPn = j; });
          var cats = [];
          its.forEach(function (it, j) {
            if (it.pn && j !== idxPn) return;
            var tx = String(it.ket || it.judul || '').replace(/\s*Fakta teramati:\s*$/i, '').trim();
            if (tx && cats.indexOf(tx) < 0) cats.push(tx);
          });
          catO = cats.map(esc).join('<br>');
          if (!skorO) {   // v79: tidak ada skor dari sumber mana pun -> beri keterangan agar tidak tampak terlupa
            skorO = '&ndash;';
            catO += (catO ? '<br>' : '') + '<i style="color:#64748b">Tidak diskor dari pengamatan kelas; dinilai dari dokumen atau wawancara.</i>';
          }
          rows += '<tr style="page-break-inside:avoid"><td>' + k.no + '.' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td style="width:50px;text-align:center;font-weight:bold">' + skorO + '</td><td style="width:32%;height:38px;font-size:11px">' + catO + '</td></tr>';
        }
      });
      if (rows) o += '<h4 style="margin:10px 0 2px">Komponen ' + k.no + '. ' + esc(k.nama) + '</h4><table><thead><tr><th style="width:38px">No</th><th>Aspek yang diamati</th><th>Skor</th><th>Catatan fakta yang teramati</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
    if (adaUsulanO) o += '<p style="font-size:10.5px;margin:4px 0">* Usulan skor dari lembar penanda pengamatan atau butir Supervisi; penilai belum menetapkan skor akhir indikator ini.</p>';
    o += '<table style="page-break-inside:avoid"><tr><td style="width:30%;height:44px">Hal yang sudah baik</td><td>' + esc(obsKesAmbil(gk).baik || '') + '</td></tr><tr><td style="height:44px">Hal yang perlu diperbaiki</td><td>' + esc(obsKesAmbil(gk).perbaikan || '') + '</td></tr>' +
      '<tr><td style="height:44px">Kesepakatan tindak lanjut bersama guru</td><td>' + esc(obsKesAmbil(gk).tindak || '') + '</td></tr><tr><td>Tanggal pertemuan tindak lanjut</td><td></td></tr></table>';
    return o + ttdPerangkat(gk, true, 'Lembar Observasi PKG');
  }
  function wawancaraHtml(gk) {
    var peta = petaIndikator(), o = perangkatHeader(gk, 'PEDOMAN WAWANCARA<br>PENILAIAN KINERJA GURU'), n = 0;
    o += '<p style="font-size:11px">Catat <b>jawaban nyata dan contoh kejadian</b>. Jawaban umum tanpa contoh belum cukup menjadi dasar skor 2. Wawancara dilakukan di tempat yang tenang dan tidak didengar guru yang dinilai; identitas peserta didik, orang tua, dan sejawat dirahasiakan dalam laporan.</p>';
    WAWANCARA.forEach(function (g) {
      if (g.sembunyi) return;
      var rows = '';
      g.q.forEach(function (x) {
        var ind = peta[x[0]]; if (!ind) return;
        var db0 = dataBukti(gk), pj = (g === WAWANCARA[0] && db0 && db0.pra && db0.pra[x[0].replace('.', '_')]) || '';
        rows += '<tr style="page-break-inside:avoid"><td>' + x[0] + '</td><td>' + esc(x[1]) + '</td><td style="font-size:10.5px">' + esc(ind.t) + '</td><td style="width:28%;height:44px">' + wwCetakSel(gk, g, x) + (pj && !wwAdaCat(gk, g, x) ? '<div style="font-size:10px;color:#444"><i>Jawaban tertulis guru:</i> ' + esc(pj) + '</div>' : '') + '</td></tr>';
        n++;
      });
      if (!rows) return;
      o += '<h4 style="margin:14px 0 2px' + (n > g.q.length ? ';page-break-before:always' : '') + '">Narasumber: ' + esc(g.who) + '</h4>' +
        '<table><tr><td style="width:30%">Nama narasumber</td><td>' + wwCetakN(gk, g, 'nama') + '</td></tr><tr><td>Hari dan tanggal</td><td>' + wwCetakN(gk, g, 'tgl') + '</td></tr></table>' +
        '<table><thead><tr><th style="width:38px">No</th><th>Pertanyaan inti</th><th style="width:28%">Indikator</th><th>Catatan jawaban dan contoh</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
    return n ? o + ttdPerangkat(gk, false, 'Pedoman Wawancara PKG') : '';
  }

  // ----- cetak: formulir angket kertas, rekap hasil angket, penilaian diri guru -----
  var KOTAK = '&#9744;', KOTAK_ISI = '&#9745;';
  function angketKertasHtml(gk) {
    var A = AK(); if (!A) return '';
    var per = S.periodeList[S.periodeId] || {}, o = '';
    A.urut.forEach(function (j, ji) {
      var J = A.jenis[j], adaX = J.butir.some(function (x) { return x.x; });
      o += '<div' + (ji ? ' style="page-break-before:always"' : '') + '><h3 style="text-align:center;margin:0 0 6px">' + esc(J.judul.toUpperCase()) + '</h3>' +
        '<table><tr><td style="width:28%">Untuk guru</td><td>' + esc(namaGuru(gk)) + '</td></tr><tr><td>Periode</td><td>' + esc(per.nama || '') + '</td></tr>' +
        (j === 'siswa' ? '<tr><td>Kelas</td><td>&nbsp;</td></tr>' : '') + '</table>' +
        '<p style="font-size:11px">' + esc(J.pembuka) + ' Jangan menulis nama. Beri tanda (&#10003;) pada satu pilihan di setiap baris.</p>' +
        '<table><thead><tr><th style="width:34px">No</th><th>Pernyataan</th><th style="width:48px">Ya</th><th style="width:78px">Kadang-kadang</th><th style="width:48px">Tidak</th>' + (adaX ? '<th style="width:60px">Tidak tahu</th>' : '') + '</tr></thead><tbody>' +
        J.butir.map(function (x, i) {
          return '<tr style="page-break-inside:avoid"><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td style="text-align:center">' + KOTAK + '</td><td style="text-align:center">' + KOTAK + '</td><td style="text-align:center">' + KOTAK + '</td>' + (adaX ? '<td style="text-align:center">' + (x.x ? KOTAK : '-') + '</td>' : '') + '</tr>';
        }).join('') + '</tbody></table>' +
        '<p style="font-size:11px">Lipat lembar ini dan serahkan dalam amplop tertutup. Terima kasih.</p></div>';
    });
    return o;
  }
  function angketHasilHtml(gk) {
    var A = AK(), a = dataAngket(gk); if (!A || !a) return '';
    var peta = petaIndikator(), per = S.periodeList[S.periodeId] || {};
    var o = perangkatHeader(gk, 'REKAP HASIL ANGKET<br>PENILAIAN KINERJA GURU');
    var urutLabel = function (x, y) { var p = x.split('.'), q = y.split('.'); return (parseInt(p[0], 10) - parseInt(q[0], 10)) || (parseInt(p[1], 10) - parseInt(q[1], 10)); };
    A.urut.forEach(function (j) {
      var J = A.jenis[j], rs = a.resp[j] || [];
      o += '<h4 style="margin:14px 0 2px">' + esc(J.judul) + ' &mdash; ' + rs.length + ' responden (minimal ' + J.min + ' untuk usulan skor)</h4>';
      var h = rs.length ? A.hitung(j, rs) : null;
      if (!h || !Object.keys(h.indikator).length) { o += '<p style="font-size:11px">Belum ada jawaban.</p>'; return; }
      o += '<table><thead><tr><th style="width:44px">Indikator</th><th>Aspek</th><th style="width:52px">Persen</th><th style="width:56px">Responden</th><th style="width:70px">Usulan skor</th></tr></thead><tbody>' +
        Object.keys(h.indikator).sort(urutLabel).map(function (lab) {
          var x = h.indikator[lab], ind = peta[lab];
          return '<tr style="page-break-inside:avoid"><td>' + lab + '</td><td>' + esc(ind ? ind.t : '') + '</td><td style="text-align:center">' + f1(x.pct) + '%</td><td style="text-align:center">' + x.n + '</td><td style="text-align:center">' + (x.saran != null ? x.saran : 'belum cukup responden') + '</td></tr>';
        }).join('') + '</tbody></table>';
      var pk = Object.keys(h.pembanding);
      if (pk.length) o += '<p style="font-size:11px">Butir pembanding (tidak untuk usulan skor): ' + pk.sort(function (x, y) { return parseInt(x.slice(1), 10) - parseInt(y.slice(1), 10); }).map(function (k) { return k + ' (' + h.pembanding[k].ind + ') ' + f1(h.pembanding[k].pct) + '%'; }).join(', ') + '.</p>';
    });
    o += '<p style="font-size:11px">Skala: Ya = 1, Kadang-kadang = 0,5, Tidak = 0; &ldquo;Tidak tahu&rdquo; tidak dihitung. Usulan skor: &ge; ' + A.ambang.baik + '% = 2, &ge; ' + A.ambang.cukup + '% = 1, di bawahnya = 0. Penilai tetap yang memutuskan. Jawaban responden anonim.</p>';
    return o + ttdPerangkat(gk, false, 'Rekap Hasil Angket PKG');
  }
  function diriHtml(gk) {
    var A = DR(); if (!A) return '';
    var D = A.diri, d = dataBukti(gk) || {}, j = (d.diri && d.diri.j) || {}, r = (d.diri && d.diri.r) || {}, a = dataAngket(gk), u = me();
    var o = perangkatHeader(gk, 'PENILAIAN DIRI GURU<br>(PEMBANDING ANGKET PESERTA DIDIK)');
    o += '<p style="font-size:11px">' + esc(D.pembuka) + '</p>';
    o += '<table><thead><tr><th style="width:34px">No</th><th>Pernyataan</th><th style="width:48px">Indikator</th><th style="width:40px">Ya</th><th style="width:70px">Kadang-kadang</th><th style="width:44px">Tidak</th></tr></thead><tbody>' +
      D.butir.map(function (x, i) {
        var m = function (k) { return j[x.k] === k ? KOTAK_ISI : KOTAK; };
        return '<tr style="page-break-inside:avoid"><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.t) + '</td><td style="text-align:center">' + x.ind + '</td><td style="text-align:center">' + m('y') + '</td><td style="text-align:center">' + m('k') + '</td><td style="text-align:center">' + m('t') + '</td></tr>';
      }).join('') + '</tbody></table>';
    o += D.refleksi.map(function (x) {
      return '<table style="page-break-inside:avoid"><tr><td style="width:30%;vertical-align:top">' + esc(x[1]) + '</td><td style="min-height:40px;height:40px;white-space:pre-wrap">' + esc(r[x[0]] || '') + '</td></tr></table>';
    }).join('');
    if (adaPenilai(gk) && d.diri && d.diri.j) {
      var b = A.banding(j, a && a.resp && a.resp.siswa);
      o += '<h4 style="margin:14px 0 2px;page-break-before:auto">Perbandingan Diri vs Peserta Didik</h4><table><thead><tr><th>Butir</th><th style="width:60px">Indikator</th><th style="width:56px">Diri</th><th style="width:56px">Siswa</th><th style="width:56px">Selisih</th></tr></thead><tbody>' +
        b.baris.map(function (x) { return '<tr style="page-break-inside:avoid"><td>' + x.k + (x.s ? ' / ' + x.s : ' (khusus guru)') + '</td><td style="text-align:center">' + x.ind + '</td><td style="text-align:center">' + (x.diri == null ? '-' : f1(x.diri) + '%') + '</td><td style="text-align:center">' + (x.siswa == null ? '-' : f1(x.siswa) + '%') + '</td><td style="text-align:center">' + (x.selisih == null ? '-' : (x.selisih > 0 ? '+' : '') + f1(x.selisih)) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<p style="font-size:11px">Berdasarkan ' + b.nSiswa + ' jawaban peserta didik. Selisih = diri dikurangi siswa. Hanya pembanding, tidak mengubah skor penilaian.</p>';
    }
    return o + ttdPerangkat(gk, true, 'Penilaian Diri Guru');
  }

  function cetakPerangkat(jenis, gk) {
    if (!bolehPerangkat(jenis, gk)) return pesan('Anda tidak berhak mencetak lembar ini untuk guru tersebut.', true);
    var judul, isi;
    if (jenis === 'bukti') {
      judul = 'Daftar Bukti PKG';
      return bukaCetak(judul + ' - ' + namaGuru(gk), function () { return new Promise(function (res) { muatBukti(gk, res); }).then(function () { return buktiHtml(gk); }); });
    }
    else if (jenis === 'observasi') {
      judul = 'Lembar Observasi PKG';
      return bukaCetak(judul + ' - ' + namaGuru(gk), function () { return (dataBukti(gk) ? Promise.resolve() : new Promise(function (res) { muatBukti(gk, res); })).then(function () { return (kb(gk) in S.obsKes) ? null : new Promise(function (res) { muatObsKes(gk, res); }); }).then(function () { return observasiHtml(gk); }); });
    }
    else if (jenis === 'supervisi') {
      judul = 'Lembar Supervisi Guru';
      return bukaCetak(judul + ' - ' + namaGuru(gk), function () { return new Promise(function (res) { muatSv(gk, res); }).then(function () { return supervisiHtml(gk); }); });
    }
    else if (jenis === 'wawancara') {
      judul = 'Pedoman Wawancara PKG';
      return bukaCetak(judul + ' - ' + namaGuru(gk), function () { return (dataBukti(gk) ? Promise.resolve() : new Promise(function (res) { muatBukti(gk, res); })).then(function () { return new Promise(function (res) { muatWw(gk, res); }); }).then(function () { return wawancaraHtml(gk) || '<p>Tidak ada isi untuk dicetak.</p>'; }); });
    }
    else if (jenis === 'diri' || jenis === 'angkethasil' || jenis === 'angketkertas') {
      var fn = { diri: diriHtml, angkethasil: angketHasilHtml, angketkertas: angketKertasHtml }[jenis];
      judul = { diri: 'Penilaian Diri Guru', angkethasil: 'Rekap Hasil Angket PKG', angketkertas: 'Angket PKG (Kertas)' }[jenis];
      return bukaCetak(judul + ' - ' + namaGuru(gk), function () {
        return Promise.all([new Promise(function (res) { muatBukti(gk, res); }), new Promise(function (res) { muatAngket(gk, res); })]).then(function () { return fn(gk) || '<p>Tidak ada isi untuk dicetak.</p>'; });
      });
    }
    else return;
    if (!isi) return pesan('Tidak ada isi untuk dicetak.', true);
    bukaCetak(judul + ' - ' + namaGuru(gk), isi);
  }
  function perangkatHtml(gk) {
    var u = me();
    var item = [
      ['bukti', '📂 Daftar Bukti (cetak)', 'Bukti yang perlu disiapkan per penyedia dan per indikator. Bila bukti sudah diisi di aplikasi, kotak dan lampiran tercetak terisi.'],
      ['observasi', '👁️ Lembar Observasi Pembelajaran', 'Lembar pengamatan kelas berisi indikator yang diukur lewat pengamatan, dengan kolom skor dan catatan fakta.'],
      ['supervisi', '🔎 Lembar Supervisi Guru (cetak)', 'Lembar tiga tahap: pertemuan awal, pengamatan kelas per komponen, dan umpan balik. Tercetak terisi bila sudah diisi di aplikasi; bila belum, kolomnya kosong untuk tulis tangan.'],
      ['wawancara', '🎤 Pedoman Wawancara', 'Pertanyaan inti per narasumber (guru yang dinilai dan teman sejawat yang ditunjuk; peserta didik dan orang tua dicakup angket online).'],
      ['angkethasil', '📊 Rekap Hasil Angket', 'Jumlah responden, persentase per indikator, dan usulan skor dari angket online (peserta didik, orang tua/komite, sejawat).'],
      ['diri', '🪞 Penilaian Diri Guru', 'Jawaban penilaian diri, refleksi, dan perbandingan dengan angket peserta didik (perbandingan hanya tercetak untuk penilai).'],
      ['angketkertas', '📝 Angket Kertas (siswa, orang tua, sejawat)', 'Formulir angket kosong untuk responden yang tidak memakai HP. Jawaban kertas belum bisa dimasukkan ke aplikasi.']
    ].filter(function (x) { return u && bolehPerangkat(x[0], gk); });
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><h4 style="margin:0">📋 Perangkat Penilaian: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Nama guru, periode, penilai, dan jadwal terisi otomatis. Cetak lalu isi saat penilaian.</div></div>' +
      '<button class="btn btn-soft" data-act="kembali">← Kembali</button></div></div>';
    if (!item.length) return o + '<div class="card"><p class="text-muted">Tidak tersedia untuk Anda.</p></div>';
    o += '<div class="card" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;border:2px solid #15803d"><div style="flex:1;min-width:200px"><b>📂 Isi Bukti Langsung di Aplikasi</b><div class="text-muted" style="font-size:12px">Tidak perlu cetak kosong: bukti, tautan, observasi, dan wawancara diisi di sini, tersimpan otomatis, dan muncul di form penilaian. Absensi, jurnal, dan nilai bisa ditarik otomatis dari SI MAMBA.</div></div><button class="btn btn-success" data-act="bukti" data-gk="' + esc(gk) + '">Buka</button></div>';
    if (bolehPerangkat('wawancara', gk)) o += '<div class="card" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;border:2px solid #7c3aed"><div style="flex:1;min-width:200px"><b>🎤 Isi Wawancara Langsung di Aplikasi</b><div class="text-muted" style="font-size:12px">25 butir untuk 4 narasumber, dinilai seperti angket (persen dan usulan skor otomatis). Jawaban pra-wawancara guru ikut tampil dan bisa disalin ke catatan. Rahasia: tidak terbaca oleh guru yang dinilai.</div></div><button class="btn btn-success" data-act="wawancara" data-gk="' + esc(gk) + '">Buka</button></div>';
    if (bolehPerangkat('observasi', gk)) o += '<div class="card" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;border:2px solid #1d4ed8"><div style="flex:1;min-width:200px"><b>🔎 Isi Supervisi Langsung di Aplikasi</b><div class="text-muted" style="font-size:12px">Tiga tahap supervisi diisi di sini. Catatan pengamatan bisa dijadikan bukti observasi, dan Tahap 3 bisa disalin ke Rekomendasi dan Rencana Tindak Lanjut.</div></div><button class="btn btn-success" data-act="supervisi" data-gk="' + esc(gk) + '">Buka</button></div>';
    item.forEach(function (x) {
      o += '<div class="card" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:200px"><b>' + x[1] + '</b><div class="text-muted" style="font-size:12px">' + x[2] + '</div></div>' +
        '<button class="btn btn-success" data-act="cetak-perangkat" data-jenis="' + x[0] + '" data-gk="' + esc(gk) + '">🖨️ Cetak</button></div>';
    });
    return o;
  }

  // ---------- v35: SK penugasan penilai, SK penetapan hasil PKG, Lembar Supervisi ----------
  // SK penugasan penilai: per PENILAI (bukan per periode), berlaku empat tahun -> pkg_v4_skpen/{penilaiKey}.
  // SK penetapan hasil PKG: per periode -> pkg_v4_skset/{periodeId}. Rules: lihat rules-sk-pkg.txt.
  function skHariIni() { return tglIso(new Date()); }
  function skAkhirDefault(tgl) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tgl || '')); if (!m) return '';
    var d = new Date(+m[1] + 4, +m[2] - 1, +m[3] - 1); return isNaN(d) ? '' : tglIso(d);
  }
  function skPen(key) { return (key && S.skpen && S.skpen[key]) || null; }
  function skPenTeks(key) {
    var s = skPen(key), t = '................';
    if (!s || !s.nomor) return 'Nomor ' + t + ' tanggal ' + t;
    return 'Nomor ' + esc(s.nomor) + (s.tanggal ? ', tanggal ' + fmtTgl(s.tanggal) : '') + (s.akhir ? ' (berlaku s.d. ' + fmtTgl(s.akhir) + ')' : '');
  }
  function skPenChip(key) {
    var s = skPen(key);
    if (!s || !s.nomor) return '<span class="pkg-chip" style="background:#b91c1c">Belum dicatat</span>';
    if (s.akhir && s.akhir < skHariIni()) return '<span class="pkg-chip" style="background:#b45309">Kedaluwarsa</span>';
    return '<span class="pkg-chip" style="background:#15803d">Berlaku</span>';
  }
  function muatSk() {
    var pid = S.periodeId; S.skGagal = false;
    var a = db.ref(N.skpen).once('value').then(function (s) { return s.val() || {}; }).catch(function () { S.skGagal = true; return {}; });
    var b = pid ? db.ref(N.skset + '/' + pid).once('value').then(function (s) { return s.val() || null; }).catch(function () { S.skGagal = true; return null; }) : Promise.resolve(null);
    return Promise.all([a, b]).then(function (r) { S.skpen = r[0]; S.skset = r[1]; });
  }
  function skPenCardHtml() {
    var jml = {}; Object.keys(S.tugas).forEach(function (gk) { var t = S.tugas[gk]; if (t && t.penilaiKey) jml[t.penilaiKey] = (jml[t.penilaiKey] || 0) + 1; });
    var ids = Object.keys(jml);
    var o = '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 8px">📜 SK Penugasan Penilai</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Penilai harus memiliki SK penugasan. Untuk madrasah swasta, SK diterbitkan Kepala Kantor Kemenag dan berlaku empat tahun. Nomor dan tanggal dicatat di sini, lalu tercetak pada Laporan PKG dan Lembar Supervisi. Kosongkan &quot;Berlaku s.d.&quot; agar otomatis empat tahun sejak tanggal SK.</p>';
    if (!ids.length) return o + '<p class="text-muted" style="margin:0">Belum ada penilai. Simpan penugasan penilai di atas lebih dulu.</p></div>';
    o += '<table><thead><tr><th>Penilai</th><th>Guru</th><th>Nomor SK</th><th>Tanggal SK</th><th>Berlaku s.d.</th><th>Status</th></tr></thead><tbody>';
    ids.forEach(function (k) {
      var s = skPen(k) || {};
      o += '<tr><td>' + esc(tampil(namaGuru(k))) + '</td><td style="text-align:center">' + jml[k] + '</td>' +
        '<td><input class="field" data-skn="' + esc(k) + '" maxlength="100" value="' + esc(s.nomor || '') + '" placeholder="Nomor SK"></td>' +
        '<td><input type="date" class="field" data-skt="' + esc(k) + '" value="' + esc(s.tanggal || '') + '"></td>' +
        '<td><input type="date" class="field" data-ska="' + esc(k) + '" value="' + esc(s.akhir || '') + '"></td>' +
        '<td>' + skPenChip(k) + '</td></tr>';
    });
    o += '</tbody></table><button class="btn btn-success" style="margin-top:8px" data-act="simpan-skpen">💾 Simpan SK Penilai</button>' + (ids.length > 1 ? ' <button type="button" class="btn btn-soft" style="margin-top:8px" data-act="skpen-sama" title="Menyalin Nomor, Tanggal, dan Berlaku s.d. dari baris pertama yang sudah terisi ke baris penilai lain yang masih kosong. Isian yang sudah ada tidak ditimpa.">📋 Isi sama untuk semua penilai</button>' : '');
    if (S.skGagal) o += '<div style="margin-top:8px;font-size:12px;color:#b91c1c">Data SK tidak terbaca/tersimpan. Pastikan Firebase Rules untuk pkg_v4_skpen sudah dipasang (lihat rules-sk-pkg.txt).</div>';
    return o + '</div>';
  }
  // v55: satu SK biasanya mencakup banyak penilai. Nomor SK tetap diketik manusia (di baris pertama); di sini hanya disalin ke baris kosong.
  function skPenSama() {
    if (!bolehKelola()) return;
    var r = root(); if (!r) return;
    var baris = [], ambil = function (sel, attr) { var m = {}; Array.prototype.forEach.call(r.querySelectorAll(sel), function (i) { m[i.getAttribute(attr)] = i; }); return m; };
    var N1 = ambil('input[data-skn]', 'data-skn'), T1 = ambil('input[data-skt]', 'data-skt'), A1 = ambil('input[data-ska]', 'data-ska');
    var keys = Object.keys(N1), sumber = null;
    keys.forEach(function (k) { if (!sumber && N1[k].value.trim()) sumber = k; });
    if (!sumber) return pesan('Isi dulu Nomor SK pada salah satu baris penilai, lalu tekan tombol ini.', true);
    var n = 0, nom = N1[sumber].value.trim(), tg = T1[sumber] ? T1[sumber].value : '', ak = A1[sumber] ? A1[sumber].value : '';
    keys.forEach(function (k) {
      if (k === sumber) return;
      var ubah = false;
      if (!N1[k].value.trim()) { N1[k].value = nom; ubah = true; }
      if (T1[k] && !T1[k].value && tg) { T1[k].value = tg; ubah = true; }
      if (A1[k] && !A1[k].value && ak) { A1[k].value = ak; ubah = true; }
      if (ubah) n++;
    });
    pesan(n ? 'SK dari ' + namaGuru(sumber) + ' disalin ke ' + n + ' penilai lain (yang sudah terisi tidak ditimpa). Periksa lalu tekan Simpan SK Penilai.' : 'Tidak ada yang disalin: semua baris penilai sudah terisi.', !n);
  }
  function simpanSkPen() {
    if (!bolehKelola()) return;
    var r = root(); if (!r) return;
    var tgl = {}, akh = {}, upd = {}, salah = '', u = me();
    Array.prototype.forEach.call(r.querySelectorAll('input[data-skt]'), function (i) { tgl[i.getAttribute('data-skt')] = i.value; });
    Array.prototype.forEach.call(r.querySelectorAll('input[data-ska]'), function (i) { akh[i.getAttribute('data-ska')] = i.value; });
    Array.prototype.forEach.call(r.querySelectorAll('input[data-skn]'), function (i) {
      var k = i.getAttribute('data-skn'), nomor = (i.value || '').trim(), t = tgl[k] || '', a = akh[k] || '', lama = skPen(k);
      if (!nomor && !t && !a) { if (lama) upd[k] = null; return; }
      if (!nomor) { salah = salah || ('Nomor SK ' + namaGuru(k) + ' wajib diisi.'); return; }
      if (nomor.length > 100) { salah = salah || ('Nomor SK ' + namaGuru(k) + ' terlalu panjang (maksimal 100 karakter).'); return; }
      if (!t) { salah = salah || ('Tanggal SK ' + namaGuru(k) + ' wajib diisi.'); return; }
      if (!a) a = skAkhirDefault(t);
      if (a < t) { salah = salah || ('Tanggal berlaku SK ' + namaGuru(k) + ' tidak boleh sebelum tanggal SK.'); return; }
      if (lama && lama.nomor === nomor && lama.tanggal === t && lama.akhir === a) return;
      upd[k] = { nomor: nomor, tanggal: t, akhir: a, diperbarui: nowIso(), diperbaruiOleh: pengisi(u) };
    });
    if (salah) return pesan(salah, true);
    if (!Object.keys(upd).length) return pesan('Tidak ada perubahan SK penilai.');
    kerjakan(function () { return db.ref(N.skpen).update(aman(upd)); }, function () {
      Object.keys(upd).forEach(function (k) { if (upd[k]) S.skpen[k] = upd[k]; else delete S.skpen[k]; });
      if (typeof addLog === 'function') addLog('PKG SK penilai', Object.keys(upd).length + ' penilai');
      pesan('SK penugasan penilai tersimpan.'); render();
    }, 'Gagal menyimpan SK penilai: ');
  }

  // v54: nilai awal SK Penetapan. Tempat diambil dari profil madrasah (Kabupaten/Kota); dasar hukum awal boleh diedit Admin.
  var SK_DASAR_AWAL = 'Undang-Undang Nomor 14 Tahun 2005 tentang Guru dan Dosen\nPeraturan Pemerintah Nomor 74 Tahun 2008 tentang Guru';
  function skTempatProfil() {
    var M = (typeof MADRASAH !== 'undefined' && MADRASAH) ? MADRASAH : {};
    return String(M.kabupaten || M.kota || M.kabupaten_kota || M.kab || '').trim().replace(/^(kabupaten|kab\.?|kota)\s+/i, '').slice(0, 60);
  }
  function skSetCardHtml() {
    var d = S.skset || {}, ada = guruAktif().filter(function (g) { var n = S.nilai[g.key]; return n && n.status === 'ditetapkan'; }).length;
    return '<div class="card"><h4 style="margin:0 0 8px">📄 SK Kepala Madrasah: Penetapan Hasil PKG</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Menurut Juknis (Bab IV.D.9), hasil PKG ditetapkan dengan SK Kepala Madrasah. Surat memuat daftar guru yang statusnya sudah Ditetapkan (saat ini ' + ada + ' guru). Nomor SK diisi manual sesuai penomoran madrasah (boleh dikosongkan, nanti ditulis tangan). Tempat terisi awal dari profil madrasah.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div style="flex:2;min-width:170px"><label class="label">Nomor SK</label><input id="pkgSkNomor" class="field" maxlength="100" value="' + esc(d.nomor || '') + '"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Tanggal SK</label><input id="pkgSkTgl" type="date" class="field" value="' + esc(d.tanggal || '') + '"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Ditetapkan di</label><input id="pkgSkTempat" class="field" maxlength="60" placeholder="Kota/kabupaten" value="' + esc(d.tempat || skTempatProfil()) + '"></div></div>' +
      '<label class="label" style="margin-top:8px">Dasar hukum tambahan (satu per baris; sudah terisi awal, silakan ubah)</label><textarea id="pkgSkDasar" class="field" rows="3" maxlength="600" style="width:100%">' + esc(d.dasar || SK_DASAR_AWAL) + '</textarea>' +
      '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-success" data-act="simpan-skset">💾 Simpan</button><button class="btn btn-soft" data-act="cetak-skset">🖨️ Cetak SK Penetapan</button></div>' +
      (S.skGagal ? '<div style="margin-top:8px;font-size:12px;color:#b91c1c">Data SK tidak terbaca/tersimpan. Pastikan Firebase Rules untuk pkg_v4_skset sudah dipasang (lihat rules-sk-pkg.txt).</div>' : '') + '</div>';
  }
  function simpanSkSet() {
    if (!bolehKelola() || !S.periodeId) return;
    var g = function (id) { var e = $(id); return e ? e.value.trim() : ''; };
    var v = { nomor: g('pkgSkNomor'), tanggal: g('pkgSkTgl'), tempat: g('pkgSkTempat'), dasar: g('pkgSkDasar') }, u = me(), pid = S.periodeId;
    if (v.nomor.length > 100) return pesan('Nomor SK terlalu panjang (maksimal 100 karakter).', true);
    if (v.tempat.length > 60) return pesan('Nama tempat terlalu panjang (maksimal 60 karakter).', true);
    if (v.dasar.length > 600) return pesan('Dasar hukum tambahan terlalu panjang (' + v.dasar.length + ' karakter; maksimal 600).', true);
    var val = null;
    if (v.nomor || v.tanggal || v.tempat || v.dasar) { val = {}; Object.keys(v).forEach(function (k) { if (v[k]) val[k] = v[k]; }); val.diperbarui = nowIso(); val.diperbaruiOleh = pengisi(u); }
    kerjakan(function () { return db.ref(N.skset + '/' + pid).set(val); }, function () {
      S.skset = val; if (typeof addLog === 'function') addLog('PKG SK penetapan', (S.periodeList[pid] || {}).nama || pid);
      pesan('SK penetapan tersimpan.'); render();
    }, 'Gagal menyimpan SK penetapan: ');
  }
  // Cetak SK Kepala Madrasah + lampiran daftar hasil. Hanya guru berstatus Ditetapkan yang dimasukkan.
  function cetakSkPenetapan() {
    if (!bolehKelola() || !S.periodeId) return;
    var per = S.periodeList[S.periodeId] || {}, M = (typeof MADRASAH !== 'undefined' && MADRASAH) ? MADRASAH : {}, d = S.skset || {};
    var semua = guruAktif(), rows = semua.map(function (g) { var n = S.nilai[g.key]; return (n && n.status === 'ditetapkan' && n.skor) ? { g: g, n: n, h: hitung(n.skor) } : null; }).filter(Boolean);
    if (!rows.length) return pesan('Belum ada hasil PKG berstatus Ditetapkan pada periode ini.', true);
    var belum = semua.length - rows.length;
    if (belum > 0 && !confirm(belum + ' guru belum berstatus Ditetapkan dan tidak dimasukkan ke lampiran. Tetap cetak?')) return;
    var titik = '................', nama = String(M.nama || 'MADRASAH'), NAMA = esc(nama.toUpperCase()), perNama = esc(per.nama || '');
    var nomor = d.nomor ? esc(d.nomor) : titik, tgl = d.tanggal ? fmtTgl(d.tanggal) : titik, tempat = (d.tempat || skTempatProfil()) ? esc(d.tempat || skTempatProfil()) : titik;
    var dasar = ['Keputusan Direktur Jenderal Pendidikan Islam Nomor 1843 Tahun 2021 tentang Petunjuk Teknis Penilaian Kinerja Guru Madrasah'];
    String(d.dasar || SK_DASAR_AWAL).split(/\r?\n/).forEach(function (s) { s = s.trim(); if (s) dasar.push(s); });
    var nb = 'border:0;padding:2px 4px;vertical-align:top';
    var judul = '<div style="text-align:center;font-weight:700;line-height:1.5">KEPUTUSAN KEPALA ' + NAMA + '<br>NOMOR ' + nomor + '<br>TENTANG<br>PENETAPAN HASIL PENILAIAN KINERJA GURU<br>' + perNama + '</div>' +
      '<div style="text-align:center;font-weight:700;margin:10px 0 6px">KEPALA ' + NAMA + ',</div>';
    var menimbang = '<table style="border:0"><tr><td style="' + nb + ';width:96px">Menimbang</td><td style="' + nb + ';width:10px">:</td><td style="' + nb + '">' +
      'a. bahwa penilaian kinerja guru pada ' + esc(nama) + ' periode ' + perNama + ' telah dilaksanakan dan hasilnya telah disetujui oleh guru yang dinilai;<br>' +
      'b. bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a, perlu menetapkan hasil penilaian kinerja guru dengan Keputusan Kepala ' + esc(nama) + '.</td></tr>' +
      '<tr><td style="' + nb + '">Mengingat</td><td style="' + nb + '">:</td><td style="' + nb + '">' + dasar.map(function (s, i) { return (i + 1) + '. ' + esc(s) + (i < dasar.length - 1 ? ';' : '.'); }).join('<br>') + '</td></tr></table>';
    var diktum = function (a, b) { return '<tr><td style="' + nb + ';width:96px">' + a + '</td><td style="' + nb + ';width:10px">:</td><td style="' + nb + '">' + b + '</td></tr>'; };
    var memutuskan = '<div style="text-align:center;font-weight:700;margin:12px 0 6px">MEMUTUSKAN:</div>' +
      '<table style="border:0"><tr><td style="' + nb + ';width:96px">Menetapkan</td><td style="' + nb + ';width:10px">:</td><td style="' + nb + '">KEPUTUSAN KEPALA ' + NAMA + ' TENTANG PENETAPAN HASIL PENILAIAN KINERJA GURU ' + perNama + '.</td></tr>' +
      diktum('KESATU', 'Menetapkan hasil penilaian kinerja guru pada ' + esc(nama) + ' periode ' + perNama + ' untuk ' + rows.length + ' guru sebagaimana tercantum dalam Lampiran yang merupakan bagian tidak terpisahkan dari Keputusan ini.') +
      diktum('KEDUA', 'Hasil penilaian kinerja guru sebagaimana dimaksud dalam Diktum KESATU digunakan sebagai dasar penyusunan rencana pengembangan keprofesian berkelanjutan dan tindak lanjut pembinaan guru.') +
      diktum('KETIGA', 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diperbaiki sebagaimana mestinya.') + '</table>';
    var ket = 'SK Penetapan PKG | ' + (per.nama || '') + ' | Nomor ' + (d.nomor || '-') + ' | ' + rows.length + ' guru';
    var qr = (window.TTD && typeof window.TTD.penanda === 'function') ? window.TTD.penanda('kepala', { jenis: 'SK Penetapan PKG', ket: ket }, { hanyaPimpinan: true }) : '';
    var blok = '<div style="margin-left:52%;text-align:center;margin-top:18px;page-break-inside:avoid">Ditetapkan di ' + tempat + '<br>pada tanggal ' + tgl + '<br>Kepala ' + esc(nama) + ',' +
      '<div style="min-height:24mm;display:flex;align-items:flex-end;justify-content:center">' + qr + '</div><b>' + esc(M.kepala_sekolah || titik) + '</b>' + (M.nip_kepala_sekolah ? '<br>NIP. ' + esc(M.nip_kepala_sekolah) : '') + '</div>';
    var lamp = '<div style="page-break-before:always"><div style="margin-left:52%;font-size:11px;line-height:1.5">LAMPIRAN<br>Keputusan Kepala ' + esc(nama) + '<br>Nomor : ' + nomor + '<br>Tanggal : ' + tgl + '<br>Tentang : Penetapan Hasil Penilaian Kinerja Guru ' + perNama + '</div>' +
      '<h3>DAFTAR HASIL PENILAIAN KINERJA GURU</h3><table><thead><tr><th style="width:34px">No</th><th>Nama Guru</th><th>NIP</th><th>Penilai</th><th style="width:60px">Jumlah</th><th style="width:60px">Nilai</th><th>Sebutan</th></tr></thead><tbody>' +
      rows.map(function (x, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(x.g.name) + '</td><td>' + (x.g.nip ? esc(x.g.nip) : '-') + '</td><td>' + esc(tampil(x.n.penilaiNama) || namaGuru(x.n.penilaiKey)) + '</td><td style="text-align:center">' + x.h.jumlah + '/' + x.h.tertinggi + '</td><td style="text-align:center">' + f1(x.h.nilai100) + '</td><td>' + esc(x.h.sebutan) + '</td></tr>'; }).join('') +
      '</tbody></table><p class="ket">Nilai = jumlah / ' + (P.komponen.length * 4) + ' &times; 100. Sebutan: &ge;91 Sangat Baik, 76&ndash;90 Baik, 61&ndash;75 Cukup, 51&ndash;60 Kurang, &le;50 Buruk.</p>' +
      '<div style="margin-left:52%;text-align:center;margin-top:18px;page-break-inside:avoid">Kepala ' + esc(nama) + ',<div style="min-height:22mm"></div><b>' + esc(M.kepala_sekolah || titik) + '</b></div></div>';
    bukaCetak('SK Penetapan Hasil PKG - ' + (per.nama || ''), judul + menimbang + memutuskan + blok + lamp);
  }

  // ---------- v37: Supervisi digital (pkg_v4_supervisi) ----------
  // Diisi penilai/Kepala/Admin; guru yang dinilai TIDAK menulis (refleksi guru dicatat penilai saat pertemuan umpan balik).
  var SV_T1 = [['fokus', 'Fokus yang disepakati untuk diamati', 600], ['perangkat', 'Perangkat pembelajaran yang disiapkan guru', 600], ['waktu', 'Waktu dan cara pengamatan', 300]];
  var SV_T3 = [['refleksi', 'Refleksi guru', 800], ['baik', 'Hal yang sudah baik', 800], ['perbaikan', 'Hal yang perlu ditingkatkan', 800], ['tindak', 'Kesepakatan pembinaan / tindak lanjut', 800]];
  var SV_NILAI = [[2, 'Terlihat'], [1, 'Sebagian'], [0, 'Belum terlihat']];
  var SV_MAKS_C = 600;
  // v43: supervisi bentuk angket. Tiap indikator yang buktinya berupa pengamatan menjadi satu butir (pilihan 2/1/0).
  // Persen = total skor / (butir terisi x 2); usulan skor aspek: >75% Terlihat(2), >25% Sebagian(1), selain itu Belum(0).
  var SV_LAB = ['Belum terlihat', 'Sebagian', 'Terlihat'];
  function svButir(km) { var r = []; km.indikator.forEach(function (x, i) { if (x.b.some(function (b) { return RE_OBS.test(b); })) r.push({ n: i + 1, t: x.t }); }); return r; }
  function svHitung(km, b) {
    var ls = svButir(km), tot = 0, isi = 0;
    ls.forEach(function (x) { var v = b ? b[String(x.n)] : undefined; if (v === 0 || v === 1 || v === 2) { tot += v; isi++; } });
    var persen = isi ? tot / (isi * 2) * 100 : 0;
    return { jumlah: ls.length, isi: isi, total: tot, maks: isi * 2, persen: persen, usulan: persen > 75 ? 2 : persen > 25 ? 1 : 0 };
  }
  function svRingkas(km, bx, boleh) {
    var h = svHitung(km, bx);
    if (!h.isi) return 'Belum ada butir yang dinilai (' + h.jumlah + ' butir pengamatan).';
    return 'Butir dinilai <b>' + h.isi + '/' + h.jumlah + '</b> &bull; skor <b>' + h.total + '/' + h.maks + '</b> &bull; <b>' + Math.round(h.persen) + '%</b> &bull; usulan skor aspek: <b>' + h.usulan + ' (' + SV_LAB[h.usulan] + ')</b>' +
      (h.isi < h.jumlah ? ' <i>(sementara: ' + (h.jumlah - h.isi) + ' butir belum dinilai)</i>' : '') +
      (boleh ? ' <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px" data-act="sv-pakai" data-no="' + km.no + '">Pakai usulan</button>' : '');
  }
  // Perbarui ringkasan persen satu komponen; bila otomatis, pilihan aspek ikut terisi selama belum dipilih manual.
  function svSegar(no, otomatis) {
    var r = root(), km = P.komponen[parseInt(no, 10) - 1]; if (!r || !km) return;
    var bx = {}; svButir(km).forEach(function (y) { var rd = r.querySelector('input[name="pkgSvB_' + no + '_' + y.n + '"]:checked'); if (rd) bx[String(y.n)] = parseInt(rd.value, 10); });
    var box = $('pkgSvR_' + no), c = $('pkgSvC_' + no), boleh = !(c && c.disabled);
    if (box) box.innerHTML = svRingkas(km, bx, boleh);
    if (otomatis && boleh) {
      var h = svHitung(km, bx), ada = r.querySelector('input[name="pkgSvS_' + no + '"]:checked'); S.svAuto = S.svAuto || {};
      if (h.isi && (!ada || S.svAuto[no])) { Array.prototype.forEach.call(r.querySelectorAll('input[name="pkgSvS_' + no + '"]'), function (e) { e.checked = parseInt(e.value, 10) === h.usulan; }); S.svAuto[no] = true; }
    }
  }
  function nodeSv(gk) { return N.sv + '/' + S.periodeId + '/' + gk; }
  function muatSv(gk, cb) {
    if (!S.periodeId || typeof db === 'undefined') { if (cb) cb(); return; }
    var kunci = kb(gk), pid = S.periodeId;
    siapSesi().then(function () { return db.ref(nodeSv(gk)).once('value'); }).then(function (s) {
      if (pid !== S.periodeId) return; S.sv[kunci] = s.val() || {}; S.svGagal[kunci] = false;
    }).catch(function () { if (!S.sv[kunci]) S.sv[kunci] = {}; S.svGagal[kunci] = true; }).then(function () { if (cb) cb(); });
  }
  function bolehSvTulis(gk) { return !!me() && (bolehMenilai(gk) || lihatSemua()) && statusDari(S.nilai[gk]) !== 'ditetapkan'; }
  function svAdaObs(gk, k) {          // [jumlah indikator pengamatan, yang belum ada catatan pengamatan / data otomatis]
    var tot = 0, tanpa = 0;
    k.indikator.forEach(function (x, i) {
      if (!x.b.some(function (b) { return RE_OBS.test(b); })) return;
      var key = k.no + '_' + (i + 1); tot++;
      if (!daftarItem(gk, key).some(function (it) { return it.jenis === 'observasi'; }) && !adaOto(gk, key)) tanpa++;
    });
    return [tot, tanpa];
  }
  // Usulan untuk Tahap 1 dari data aplikasi. Hanya usulan awal; penilai wajib memeriksa dan menyesuaikan bersama guru.
  function svUsulan(gk) {
    var fokus = [];
    P.komponen.forEach(function (k) { var r = svAdaObs(gk, k); if (r[1]) fokus.push({ k: k, tot: r[0], tanpa: r[1] }); });
    fokus.sort(function (a, b) { return b.tanpa - a.tanpa; });
    var f = fokus.slice(0, 4).map(function (x) { return 'Komponen ' + x.k.no + '. ' + x.k.nama + ' (' + x.tanpa + ' dari ' + x.tot + ' indikator pengamatan belum berbukti)'; });
    var d = dataBukti(gk), per = [], def = sumberDef();
    if (d && d.sumberOto) Object.keys(d.sumberOto).forEach(function (id) {
      var s = d.sumberOto[id], lab = def && def[id] ? def[id].label : id;
      if (s && s.ok && /perangkat|rpp|modul|ajar|atp/i.test(lab + ' ' + id)) per.push(lab + ': ' + potong(s.ringkas, 160));
    });
    return { fokus: f.length ? potong('Usulan dari data aplikasi (periksa dan sesuaikan): ' + f.join('; ') + '.', 600) : '', perangkat: per.length ? potong('Data SI MAMBA: ' + per.join('; ') + '.', 600) : '' };
  }
  function svTanggal(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : ''; }
  // v57: pilihan cepat (tombol) dan isian otomatis untuk 'Perangkat pembelajaran yang disiapkan guru' dan 'Waktu dan cara pengamatan'
  var SV_PILIH = {
    perangkat: ['Modul ajar / RPP', 'ATP (alur tujuan pembelajaran)', 'Prota dan Promes', 'KKTP / rubrik asesmen', 'Bahan ajar dan media', 'LKPD', 'Instrumen asesmen (soal dan rubrik)', 'Daftar hadir dan daftar nilai'],
    waktu: ['Pengamatan langsung di kelas', 'Satu sesi pembelajaran penuh', 'Catatan fakta pada instrumen supervisi', 'Pengamatan daring / rekaman']
  };
  function svJadwalToken(gk) {
    var ja = jadwalAjar(gk); if (!ja.hariTgl) return '';
    var p = [ja.hariTgl];
    if (ja.pada.length) {
      var jam = []; ja.pada.forEach(function (j) { if (j.jam && jam.indexOf(String(j.jam)) < 0) jam.push(String(j.jam)); });
      if (jam.length) p.push('jam ke-' + jam.join(','));
      p.push(ja.pada.map(function (j) { return String(j.kelas || '') + (j.mapel ? ' ' + j.mapel : ''); }).join(', '));
    }
    return p.join(', ').replace(/;/g, ',');
  }
  function svWaktuDefault(gk) {
    var jt = svJadwalToken(gk), a = [];
    if (jt) a.push(jt); a.push(SV_PILIH.waktu[0], SV_PILIH.waktu[1]);
    return potong(a.join('; '), 300);
  }
  function svChipKelas(aktif) { return aktif ? 'btn btn-success' : 'btn btn-soft'; }
  function svChips(gk, id, nilai, boleh) {
    if (!boleh) return '';
    var daftar = SV_PILIH[id].slice(), jt = id === 'waktu' ? svJadwalToken(gk) : ''; if (jt) daftar.unshift(jt);
    var ada = String(nilai || '').split(/\s*;\s*/).map(function (x) { return x.trim(); });
    return '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px"><span class="text-muted" style="font-size:11px;align-self:center">Pilih (klik lagi untuk batal):</span>' +
      daftar.map(function (t, i) {
        return '<button type="button" class="' + svChipKelas(ada.indexOf(t) >= 0) + '" style="padding:2px 8px;font-size:11px" data-act="sv-pilih" data-id="' + id + '" data-v="' + esc(t) + '">' + (id === 'waktu' && jt && i === 0 ? '📅 ' : '') + esc(t) + '</button>';
      }).join('') + '</div>';
  }
  function svPilihToken(el) {
    var id = el.getAttribute('data-id'), tok = el.getAttribute('data-v'), e = $('pkgSv1_' + id); if (!e || e.disabled || !SV_PILIH[id]) return;
    var mx = 600; SV_T1.forEach(function (f) { if (f[0] === id) mx = f[2]; });
    var arr = String(e.value || '').split(/\s*;\s*/).map(function (x) { return x.trim(); }).filter(Boolean), i = arr.indexOf(tok);
    if (i >= 0) arr.splice(i, 1); else arr.push(tok);
    var v = arr.join('; ');
    if (v.length > mx) return pesan('Teks melebihi batas ' + mx + ' karakter. Batalkan sebagian pilihan dulu.', true);
    e.value = v; S.svKotor = true;
    var r = root(); if (r) Array.prototype.forEach.call(r.querySelectorAll('[data-act="sv-pilih"][data-id="' + id + '"]'), function (b) { b.className = svChipKelas(arr.indexOf(b.getAttribute('data-v')) >= 0); });
  }
  function svForm(gk) {
    var u = me(), kunci = kb(gk), d = S.sv[kunci];
    if (d === undefined) return '<div class="card"><p class="text-muted">Memuat supervisi…</p></div>';
    var boleh = bolehSvTulis(gk), t = tugasDari(gk) || {}, ja = jadwalAjar(gk), dis = boleh ? '' : ' disabled';
    var t1 = d.t1 || {}, k = d.k || {}, t3 = d.t3 || {};
    var kelas = ja.pada.length ? ja.pada.map(function (j) { return esc(j.kelas) + ' &mdash; ' + esc(j.mapel); }).join('; ') : (ja.mapel.length ? 'Mapel diampu: ' + ja.mapel.slice(0, 8).map(esc).join(', ') : '-');
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><h4 style="margin:0">🔎 Supervisi Pembelajaran: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Penilai: ' + esc(tampil(t.penilaiNama) || (t.penilaiKey ? namaGuru(t.penilaiKey) : '-')) + ' &bull; SK: ' + skPenTeks(t.penilaiKey) + '<br>Jadwal pengamatan: ' + (ja.hariTgl ? esc(ja.hariTgl) : '-') + ' &bull; ' + kelas + '</div></div>' +
      '<button class="btn btn-soft" data-act="sv-kembali">← Kembali</button></div>' +
      '<p class="text-muted" style="font-size:12px;margin:8px 0 0">Isi dari fakta yang benar-benar teramati. Usulan dari data aplikasi hanya membantu menentukan fokus; skor dan catatan pengamatan tetap dari penilai. ' + (boleh ? 'Tersimpan ke server hanya setelah tombol Simpan ditekan.' : 'Penilaian sudah ditetapkan atau Anda tidak berhak mengubah; tampilan hanya baca.') + '</p></div>';
    var f = function (pre, def, src, id, lab, mx) { return '<label style="display:block;font-size:12.5px;font-weight:600;margin-top:8px">' + esc(lab) + '</label><textarea id="' + pre + id + '" rows="3" maxlength="' + mx + '" style="width:100%"' + dis + '>' + esc(src[id] || '') + '</textarea>'; };
    o += '<div class="card"><h4 style="margin:0 0 4px">Tahap 1. Pertemuan awal (sebelum pengamatan)</h4>';
    var t1v = {}; Object.keys(t1).forEach(function (kk) { t1v[kk] = t1[kk]; });
    if (boleh) {   // v57: bila belum pernah diisi, tampilkan isian otomatis (baru tersimpan setelah Simpan)
      if (!t1v.waktu) t1v.waktu = svWaktuDefault(gk);
      if (!t1v.perangkat) { var usv = svUsulan(gk); if (usv.perangkat) t1v.perangkat = usv.perangkat; }
    }
    SV_T1.forEach(function (x) { o += f('pkgSv1_', '', t1v, x[0], x[1], x[2]) + (SV_PILIH[x[0]] ? svChips(gk, x[0], t1v[x[0]], boleh) : ''); });
    o += '<label style="display:block;font-size:12.5px;font-weight:600;margin-top:8px">Tanggal pertemuan awal</label><input type="date" id="pkgSv1_tanggal" value="' + esc(svTanggal(t1.tanggal)) + '"' + dis + '></div>';
    o += '<div class="card"><h4 style="margin:0 0 4px">Tahap 2. Pengamatan pembelajaran di kelas</h4><p class="text-muted" style="font-size:12px;margin:0 0 6px">Nilai tiap butir (Terlihat = 2, Sebagian = 1, Belum terlihat = 0). Persen dan usulan skor aspek dihitung otomatis dan mengisi pilihan aspek selama belum Anda pilih sendiri; Anda tetap bisa mengubahnya. Butir atau aspek yang tidak teramati dikosongkan.</p>';
    P.komponen.forEach(function (km) {
      var x = k[String(km.no)] || {}, h = svAdaObs(gk, km), bt = svButir(km), bx = x.b || {};
      o += '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;margin-top:8px"><b>' + km.no + '. ' + esc(km.nama) + '</b> <span class="text-muted" style="font-size:11px">(' + esc(km.kompetensi) + ')</span>' +
        (h[0] ? '<div class="text-muted" style="font-size:11px">Data aplikasi: ' + (h[0] - h[1]) + ' dari ' + h[0] + ' indikator pengamatan sudah ada catatan pengamatan atau data otomatis.</div>' : '') +
        (bt.length ? bt.map(function (y) { return '<div style="padding:6px 0;border-top:1px dashed #e5e7eb"><div style="font-size:12.5px"><b>' + km.no + '.' + y.n + '</b> ' + esc(y.t) + '</div><div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:3px">' + SV_NILAI.map(function (sv) { return '<label style="font-size:13px"><input type="radio" name="pkgSvB_' + km.no + '_' + y.n + '" value="' + sv[0] + '" data-svb="' + km.no + '"' + (bx[String(y.n)] === sv[0] ? ' checked' : '') + dis + '> ' + sv[1] + '</label>'; }).join('') + '</div></div>'; }).join('') +
          '<div id="pkgSvR_' + km.no + '" class="text-muted" style="font-size:12px;margin:4px 0 2px">' + svRingkas(km, bx, boleh) + '</div>' +
          (boleh ? '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px" data-act="sv-kosong-b" data-no="' + km.no + '">✖ Kosongkan butir</button>' : '') +
          '<div style="font-size:12px;font-weight:600;margin-top:6px">Penilaian aspek (keseluruhan)</div>' : '') +
        '<div style="display:flex;gap:14px;flex-wrap:wrap;margin:6px 0">' + SV_NILAI.map(function (s) { return '<label style="font-size:13px"><input type="radio" name="pkgSvS_' + km.no + '" value="' + s[0] + '"' + (x.s === s[0] ? ' checked' : '') + dis + '> ' + s[1] + '</label>'; }).join('') + (boleh ? '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px" data-act="sv-kosong" data-no="' + km.no + '">✖ Kosongkan</button>' : '') + '</div>' +
        '<textarea id="pkgSvC_' + km.no + '" rows="2" maxlength="' + SV_MAKS_C + '" placeholder="Catatan fakta yang teramati" style="width:100%"' + dis + '>' + esc(x.c || '') + '</textarea></div>';
    });
    o += '</div>';
    o += '<div class="card"><h4 style="margin:0 0 4px">Tahap 3. Pertemuan umpan balik (sesudah pengamatan)</h4>';
    SV_T3.forEach(function (x) { o += f('pkgSv3_', '', t3, x[0], x[1], x[2]); });
    o += '<label style="display:block;font-size:12.5px;font-weight:600;margin-top:8px">Tanggal pertemuan umpan balik / supervisi ulang</label><input type="date" id="pkgSv3_tanggal" value="' + esc(svTanggal(t3.tanggal)) + '"' + dis + '></div>';
    o += '<div class="card pkg-sticky" style="justify-content:flex-start;padding:8px 10px;box-shadow:0 -2px 8px rgba(0,0,0,.08)">';   // v57: bilah tombol menempel di bawah layar
    if (boleh) o += '<button class="btn btn-success" data-act="sv-simpan">💾 Simpan</button><button class="btn btn-soft" data-act="sv-usulan">✨ Isi usulan Tahap 1</button><button class="btn btn-soft" data-act="sv-usulan3" title="Menyusun kalimat Hal yang sudah baik, Hal yang perlu ditingkatkan, dan Kesepakatan tindak lanjut dari nilai Tahap 2. Kolom yang sudah terisi tidak ditimpa.">✨ Isi usulan Tahap 3</button><button class="btn btn-soft" data-act="sv-bukti" title="Menyimpan catatan fakta tiap komponen sebagai bukti observasi pada indikator pengamatan">📎 Simpan + jadikan bukti observasi</button><button class="btn btn-soft" data-act="sv-rtl" title="Menyalin Tahap 3 ke kolom Rekomendasi yang masih kosong">🧭 Simpan + salin ke Rekomendasi</button>';
    o += '<button class="btn btn-soft" data-act="sv-cetak">🖨️ Cetak (terisi)</button></div>';
    if (S.svGagal[kunci]) o += '<div style="font-size:12px;color:#b91c1c;margin:0 4px">Data supervisi tidak terbaca/tersimpan. Pastikan Firebase Rules untuk pkg_v4_supervisi sudah dipasang (lihat rules-supervisi-kendali-pkg.txt).</div>';
    return o;
  }
  function svAmbil() {
    var r = root(), v = { t1: {}, k: {}, t3: {} }, salah = '';
    var g = function (id) { var e = $(id); return e ? String(e.value || '').trim() : ''; };
    SV_T1.forEach(function (f) { var t = g('pkgSv1_' + f[0]); if (t.length > f[2]) salah = salah || (f[1] + ' terlalu panjang (' + t.length + ' karakter; maksimal ' + f[2] + ').'); if (t) v.t1[f[0]] = t; });
    SV_T3.forEach(function (f) { var t = g('pkgSv3_' + f[0]); if (t.length > f[2]) salah = salah || (f[1] + ' terlalu panjang (' + t.length + ' karakter; maksimal ' + f[2] + ').'); if (t) v.t3[f[0]] = t; });
    var tg1 = svTanggal(g('pkgSv1_tanggal')), tg3 = svTanggal(g('pkgSv3_tanggal')); if (tg1) v.t1.tanggal = tg1; if (tg3) v.t3.tanggal = tg3;
    P.komponen.forEach(function (km) {
      var rd = r ? r.querySelector('input[name="pkgSvS_' + km.no + '"]:checked') : null, c = g('pkgSvC_' + km.no);
      if (c.length > SV_MAKS_C) salah = salah || ('Catatan komponen ' + km.no + ' terlalu panjang (' + c.length + ' karakter; maksimal ' + SV_MAKS_C + ').');
      var bb = {}; svButir(km).forEach(function (y) { var rb = r ? r.querySelector('input[name="pkgSvB_' + km.no + '_' + y.n + '"]:checked') : null; if (rb) bb[String(y.n)] = parseInt(rb.value, 10); });
      if (rd || c || Object.keys(bb).length) { var x = {}; if (rd) x.s = parseInt(rd.value, 10); if (c) x.c = c; if (Object.keys(bb).length) x.b = bb; v.k[String(km.no)] = x; }
    });
    return { v: v, salah: salah };
  }
  function svSimpan(gk, sesudah) {
    if (!bolehSvTulis(gk)) return pesan('Tidak dapat menyimpan: penilaian sudah ditetapkan atau Anda tidak berhak.', true);
    // v38: bila data lama gagal dibaca, jangan simpan (set() akan menimpa data server dengan isian parsial)
    if (S.svGagal[kb(gk)]) { muatSv(gk, function () { if (S.view === 'supervisi' && S.gk === gk && !S.svKotor) render(); }); return pesan('Data supervisi yang tersimpan belum berhasil dimuat, jadi penyimpanan dibatalkan agar data lama tidak tertimpa. Periksa koneksi dan Firebase Rules (rules-supervisi-kendali-pkg.txt), lalu coba lagi.', true); }
    var a = svAmbil(); if (a.salah) return pesan(a.salah, true);
    var v = a.v, u = me(), kunci = kb(gk), val = null;
    if (Object.keys(v.t1).length || Object.keys(v.k).length || Object.keys(v.t3).length) {
      val = {}; ['t1', 'k', 't3'].forEach(function (f) { if (Object.keys(v[f]).length) val[f] = v[f]; });
      val.diperbarui = nowIso(); val.diperbaruiOleh = pengisi(u);
    }
    kerjakan(function () { return db.ref(nodeSv(gk)).set(val ? aman(val) : null); }, function () {
      S.sv[kunci] = val || {}; S.svGagal[kunci] = false; S.svKotor = false;
      if (typeof addLog === 'function') addLog('PKG supervisi', namaGuru(gk));
      if (sesudah) sesudah(); else { pesan('Supervisi tersimpan.'); render(); }
    }, 'Gagal menyimpan supervisi: ');
  }
  // v55: usulan tanggal. Pertemuan awal: hari ini, atau tanggal jadwal pengamatan bila jadwal lebih awal. Umpan balik: hari ini, atau jadwal pengamatan bila jadwal lebih akhir (selalu tidak sebelum pengamatan).
  function svIsiTanggal(gk, tahap) {
    var e = $(tahap === 1 ? 'pkgSv1_tanggal' : 'pkgSv3_tanggal'); if (!e || e.value || e.disabled) return 0;
    var jd = svTanggal((tugasDari(gk) || {}).jadwal), hari = skHariIni(), tg = hari;
    if (jd) tg = tahap === 1 ? (jd < hari ? jd : hari) : (jd > hari ? jd : hari);
    e.value = tg; return 1;
  }
  function svIsiUsulan(gk) {
    var us = svUsulan(gk), n = 0;
    n += svIsiTanggal(gk, 1);
    [['pkgSv1_fokus', us.fokus], ['pkgSv1_perangkat', us.perangkat], ['pkgSv1_waktu', svWaktuDefault(gk)]].forEach(function (p) { var e = $(p[0]); if (e && !e.value.trim() && p[1]) { e.value = p[1]; n++; } });
    S.svKotor = S.svKotor || n > 0;
    pesan(n ? 'Usulan diisi dari data aplikasi. Periksa, sesuaikan, lalu simpan.' : 'Tidak ada usulan baru (kolom sudah terisi atau data bukti belum cukup).');
  }
  // v53: usulan kalimat Tahap 3 (umpan balik) dari isian Tahap 2 di layar. Kalimat templat berbasis aturan, bukan AI;
  // penilai wajib memeriksa & mengubah. Hanya mengisi kolom yang masih kosong. "Refleksi guru" TIDAK diisi (itu jawaban guru sendiri).
  function svPilih(daftar, n) {
    var out = [], pakai = {};
    daftar.forEach(function (x) { if (out.length < n && !pakai[x.no]) { out.push(x); pakai[x.no] = 1; } });
    daftar.forEach(function (x) { if (out.length < n && out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  function svUsulanT3(v) {
    var kuat = [], lemah = [], k = v.k || {}, ada = false;
    P.komponen.forEach(function (km) {
      var x = k[String(km.no)]; if (!x) return;
      var h = svHitung(km, x.b), cat = x.c ? potong(x.c, 110) : '';
      if (h.isi) {
        ada = true;
        svButir(km).forEach(function (y) {
          var n = x.b ? x.b[String(y.n)] : undefined, it = { no: km.no, p: n, txt: potong(y.t, 110), cat: cat, km: km.nama };
          if (n === 2) kuat.push(it); else if (n === 0 || n === 1) lemah.push(it);
        });
      } else if (x.s === 0 || x.s === 1 || x.s === 2) {
        ada = true;
        var it2 = { no: km.no, p: x.s, txt: 'komponen ' + km.no + '. ' + km.nama, cat: cat, km: km.nama };
        if (x.s === 2) kuat.push(it2); else lemah.push(it2);
      }
    });
    if (!ada) return null;
    lemah.sort(function (a, b) { return a.p - b.p; });
    var pk = svPilih(kuat, 3), pl = svPilih(lemah, 3);
    var baik = 'Terima kasih atas kesediaan Bapak/Ibu dalam pengamatan pembelajaran. ' + (pk.length
      ? 'Dari pengamatan, yang sudah baik dan perlu dipertahankan: ' + pk.map(function (x, i) { return (i + 1) + ') ' + x.txt; }).join('; ') + '.'
      : 'Belum ada butir yang terlihat sepenuhnya; mohon disampaikan secara membangun dan dimulai dari upaya yang sudah dilakukan guru.');
    var catPakai = {};
    var perbaikan = pl.length
      ? 'Hal yang perlu ditingkatkan: ' + pl.map(function (x, i) { var c = x.cat && !catPakai[x.no]; catPakai[x.no] = 1; return (i + 1) + ') ' + x.txt + (x.p === 0 ? ' (belum terlihat)' : ' (baru sebagian terlihat)') + (c ? ' (catatan: ' + x.cat + ')' : ''); }).join('; ') + '.'
      : 'Dari pengamatan ini tidak ada butir yang menonjol perlu diperbaiki; tetap jaga konsistensi pada kegiatan sehari-hari.';
    var tindak, kom = pl.map(function (x) { return x.no; }).filter(function (n, i, a) { return a.indexOf(n) === i; });
    if (!pl.length) tindak = 'Guru diminta berbagi praktik baik pada KKG atau rapat guru. Pembinaan berkala tetap berjalan sesuai jadwal madrasah.';
    else if (pl.some(function (x) { return x.p === 0; })) tindak = 'Disepakati pembinaan pada komponen ' + kom.join(', ') + ': pendampingan penyusunan/penerapan langkah yang belum terlihat, mengamati praktik baik rekan sejawat atau berdiskusi di KKG, lalu supervisi ulang untuk melihat perkembangan.';
    else tindak = 'Disepakati penguatan pada komponen ' + kom.join(', ') + ': guru melengkapi bagian yang baru sebagian terlihat, dengan umpan balik singkat dari penilai pada pengamatan berikutnya.';
    var tg = svTanggal(($('pkgSv3_tanggal') || {}).value);
    if (tg) tindak += ' Rencana pembinaan / supervisi ulang: ' + fmtTgl(tg) + '.';
    var ref = 'Pertanyaan pemandu (tanyakan lisan, lalu tulis jawaban guru sendiri): Menurut Bapak/Ibu, bagian mana yang paling berhasil hari ini? ' +
      (pl.length ? 'Apa yang membuat "' + potong(pl[0].txt, 80) + '" belum optimal, dan bantuan apa yang dibutuhkan? ' : '') + 'Apa rencana Bapak/Ibu untuk pembelajaran berikutnya?';
    return { baik: potong(baik, 800), perbaikan: potong(perbaikan, 800), tindak: potong(tindak, 800), refleksi: ref };
  }
  function svIsiUsulan3(gk) {
    if (!bolehSvTulis(gk)) return pesan('Tidak dapat mengisi: penilaian sudah ditetapkan atau Anda tidak berhak.', true);
    var us = svUsulanT3(svAmbil().v);
    if (!us) return pesan('Isi dulu nilai Tahap 2 (butir atau penilaian aspek), baru usulan Tahap 3 bisa disusun.', true);
    var n = 0;
    [['pkgSv3_baik', us.baik], ['pkgSv3_perbaikan', us.perbaikan], ['pkgSv3_tindak', us.tindak]].forEach(function (q) { var e = $(q[0]); if (e && !e.value.trim() && q[1]) { e.value = q[1]; n++; } });
    var r = $('pkgSv3_refleksi'); if (r && !r.value.trim()) r.placeholder = us.refleksi;
    n += svIsiTanggal(gk, 3);                                 // setelah kalimat tindak lanjut disusun, agar tanggal otomatis tidak ikut tertulis sebagai "rencana supervisi ulang"
    S.svKotor = S.svKotor || n > 0;
    pesan(n ? 'Usulan Tahap 3 diisi dari nilai Tahap 2. Periksa, sesuaikan dengan hasil diskusi, lalu simpan.' : 'Tidak ada yang diisi: kolom Tahap 3 sudah berisi (tidak ditimpa).');
  }
  // Catatan fakta per komponen -> satu bukti observasi (kunci tetap "supervisi") pada indikator pengamatan pertama komponen itu.
  function svBuktiTulis(gk) {
    if (!bolehJenis('observasi', gk)) return pesan('Anda tidak berhak menambah bukti observasi untuk guru ini (atau penilaian sudah final).', true);
    var d = S.sv[kb(gk)] || {}, k = d.k || {}, upd = {}, n = 0, lewat = [], u = me(), bd = dataBukti(gk) || {};
    P.komponen.forEach(function (km) {
      var x = k[String(km.no)]; if (!x || !x.c) return;
      var idx = -1; km.indikator.forEach(function (ind, i) { if (idx < 0 && ind.b.some(function (b) { return RE_OBS.test(b); })) idx = i; });
      if (idx < 0) { lewat.push(km.no); return; }
      var key = km.no + '_' + (idx + 1), ada = !!(bd.item && bd.item[key] && bd.item[key].supervisi);
      if (!ada && itemTotal(gk, key) >= MAKS_ITEM) { lewat.push(km.no); return; }
      var lab = x.s == null ? 'Tanpa penilaian' : (SV_NILAI.filter(function (s) { return s[0] === x.s; })[0] || [0, ''])[1];
      upd[key + '/supervisi'] = { jenis: 'observasi', judul: 'Supervisi pembelajaran: komponen ' + km.no, ket: potong(lab + (svHitung(km, x.b).isi ? ' (' + Math.round(svHitung(km, x.b).persen) + '% dari ' + svHitung(km, x.b).isi + ' butir)' : '') + '. ' + x.c, 500), oleh: pengisi(u), olehKey: u.key, at: nowIso() };
      n++;
    });
    if (!n) return pesan('Belum ada catatan fakta pada komponen mana pun' + (lewat.length ? ' yang bisa dijadikan bukti.' : '.'), true);
    kerjakan(function () { return db.ref(nodeBukti(gk) + '/item').update(aman(upd)); }, function () {
      var b = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {}); b.item = b.item || {};
      Object.keys(upd).forEach(function (p) { var q = p.split('/'); b.item[q[0]] = b.item[q[0]] || {}; b.item[q[0]][q[1]] = upd[p]; });
      if (typeof addLog === 'function') addLog('PKG supervisi jadi bukti', namaGuru(gk));
      pesan(n + ' bukti observasi disimpan' + (lewat.length ? '; komponen ' + lewat.join(', ') + ' dilewati (tidak ada indikator pengamatan atau bukti sudah penuh).' : '.')); render();
    }, 'Gagal menyimpan bukti observasi: ');
  }
  function svKeRtl(gk) {
    if (!bolehRtl(gk)) return pesan('Rekomendasi hanya bisa diisi setelah penilaian lengkap dan sebelum ditetapkan.', true);
    muatRtl(gk, function () {
      var t3 = (S.sv[kb(gk)] || {}).t3 || {}, ada = S.rtl[kb(gk)] || {}, upd = {};
      [['kekuatan', 'baik'], ['perbaikan', 'perbaikan'], ['tindakLanjut', 'tindak']].forEach(function (m) { if (!ada[m[0]] && t3[m[1]]) upd[m[0]] = t3[m[1]]; });
      if (!ada.targetWaktu && t3.tanggal) upd.targetWaktu = potong('Pembinaan / supervisi ulang: ' + fmtTgl(t3.tanggal), 200);
      if (!Object.keys(upd).length) { pesan('Tidak ada yang disalin: Tahap 3 kosong atau kolom Rekomendasi yang sesuai sudah terisi (tidak ditimpa).'); return render(); }
      upd.diperbarui = nowIso(); upd.diperbaruiOleh = pengisi(me());
      kerjakan(function () { return db.ref(nodeRtl(gk)).update(aman(upd)); }, function () {
        var c = S.rtl[kb(gk)] = S.rtl[kb(gk)] || {}; Object.keys(upd).forEach(function (f) { c[f] = upd[f]; });
        if (typeof addLog === 'function') addLog('PKG supervisi ke rekomendasi', namaGuru(gk));
        pesan('Tahap 3 disalin ke Rekomendasi dan Rencana Tindak Lanjut (kolom yang sudah terisi tidak ditimpa).'); render();
      }, 'Gagal menyalin ke rekomendasi: ');
    });
  }
  function bukaSv(gk) {
    if (!bolehPerangkat('supervisi', gk)) return pesan('Tidak tersedia untuk Anda.', true);
    S.gk = gk; S.view = 'supervisi'; S.svKotor = false; S.svAuto = {}; render();
    var lagi = function () { if (S.view === 'supervisi' && S.gk === gk && !S.svKotor) render(); };
    muatBukti(gk, lagi); muatSv(gk, lagi); muatRtl(gk, function () { });
  }
  // Cetak: terisi bila sudah ada data tersimpan; kolom kosong tetap tercetak sebagai isian tulis tangan.
  function supervisiHtml(gk) {
    var d = S.sv[kb(gk)] || {}, t1 = d.t1 || {}, k = d.k || {}, t3 = d.t3 || {};
    var o = perangkatHeader(gk, 'LEMBAR SUPERVISI GURU<br>PEMBELAJARAN'), t = tugasDari(gk) || {}, ja = jadwalAjar(gk), kot = '&#9744;', cek = '&#9745;';
    var isiKelas = ja.pada.length ? ja.pada.map(function (j) { return esc(j.kelas) + ' &mdash; ' + esc(j.mapel); }).join('<br>') + '<div style="font-size:10px;color:#64748b">Jadwal mengajar pada hari pengamatan; coret yang tidak diamati.</div>'
      : (ja.mapel.length ? 'Mapel diampu: ' + ja.mapel.slice(0, 8).map(esc).join(', ') : '&nbsp;');
    var isiHari = (ja.hariTgl ? esc(ja.hariTgl) : '&nbsp;') + (ja.pada.length ? '<div style="font-size:11px">Jam ke: ' + ja.pada.map(function (j) { return esc(j.jam); }).join(', ') + '</div>' : '');
    var baris = function (arr, src) { return '<table style="page-break-inside:avoid">' + arr.map(function (x) { var v = src[x[0]]; return '<tr><td style="width:34%;height:44px">' + esc(x[1]) + '</td><td>' + (v ? rtlTeks(v) : '') + '</td></tr>'; }).join('') + '</table>'; };
    var tgl = function (lab, v) { return '<table style="page-break-inside:avoid"><tr><td style="width:34%;height:24px">' + lab + '</td><td>' + (v ? fmtTgl(v) : '') + '</td></tr></table>'; };
    var h4 = function (s) { return '<h4 style="margin:12px 0 2px;page-break-after:avoid">' + s + '</h4>'; };
    o += '<table><tr><td style="width:30%">SK penugasan penilai</td><td>' + skPenTeks(t.penilaiKey) + '</td></tr><tr><td>Kelas dan mata pelajaran</td><td>' + isiKelas + '</td></tr>' +
      '<tr><td>Hari, tanggal, dan jam ke</td><td>' + isiHari + '</td></tr><tr><td>Kompetensi dasar / materi</td><td>&nbsp;</td></tr></table>';
    o += h4('TAHAP 1. PERTEMUAN AWAL (SEBELUM PENGAMATAN)') + baris(SV_T1, t1) + tgl('Tanggal pertemuan awal', t1.tanggal);
    o += h4('TAHAP 2. PENGAMATAN PEMBELAJARAN DI KELAS') + '<p class="ket">Tulis fakta yang teramati, bukan kesimpulan. Beri tanda pada satu kolom per aspek; aspek yang tidak teramati dibiarkan kosong.</p>' +
      '<table><thead><tr><th style="width:38px">No</th><th>Aspek (komponen kinerja)</th><th style="width:48px">Terlihat</th><th style="width:48px">Sebagian</th><th style="width:48px">Belum</th><th style="width:30%">Catatan fakta</th></tr></thead><tbody>' +
      P.komponen.map(function (km) { var x = k[String(km.no)] || {}, hb = svHitung(km, x.b), btl = svButir(km); var brs = btl.map(function (y) { var v = x.b ? x.b[String(y.n)] : undefined; return '<tr style="page-break-inside:avoid"><td style="font-size:11px">' + km.no + '.' + y.n + '</td><td style="font-size:11px">' + esc(y.t) + '</td><td style="text-align:center">' + (v === 2 ? cek : kot) + '</td><td style="text-align:center">' + (v === 1 ? cek : kot) + '</td><td style="text-align:center">' + (v === 0 ? cek : kot) + '</td><td>&nbsp;</td></tr>'; }).join(''); return '<tr style="page-break-inside:avoid"><td>' + km.no + '</td><td>' + esc(km.nama) + ' <span class="ket">(' + esc(km.kompetensi) + ')</span>' + (hb.isi ? '<div class="ket">Butir dinilai ' + hb.isi + '/' + hb.jumlah + ' &bull; skor ' + hb.total + '/' + hb.maks + ' &bull; ' + Math.round(hb.persen) + '%</div>' : '') + '</td><td style="text-align:center">' + (x.s === 2 ? cek : kot) + '</td><td style="text-align:center">' + (x.s === 1 ? cek : kot) + '</td><td style="text-align:center">' + (x.s === 0 ? cek : kot) + '</td><td style="height:34px">' + (x.c ? rtlTeks(x.c) : '') + '</td></tr>'; }).join('') + '</tbody></table>';
    o += h4('TAHAP 3. PERTEMUAN UMPAN BALIK (SESUDAH PENGAMATAN)') + baris(SV_T3, t3) + tgl('Tanggal pertemuan umpan balik / supervisi ulang', t3.tanggal);
    return o + ttdPerangkat(gk, true, 'Lembar Supervisi Guru');
  }

  // ---------- v44: Wawancara digital seperti angket (pkg_v4_wawancara) ----------
  // butir dari WAWANCARA (5 narasumber sejak v56). Hanya penilai/Kepala/Admin yang membaca dan menulis: wawancara rahasia, guru yang dinilai tidak membacanya.
  // Skor tiap butir memakai skala indikator PKG (2/1/0). Jawaban pra-wawancara guru hanya bahan; skor dipilih penilai sesudah bertemu.
  var WW_MAKS_C = 1200, WW_MAKS_N = 100;
  var WW_NILAI = [[2, 'Seluruhnya, ada contoh nyata'], [1, 'Sebagian / jawaban umum'], [0, 'Tidak ada bukti']];
  var WW_LAB = ['Tidak ada bukti', 'Sebagian', 'Seluruhnya'];
  var WW_SINGKAT = ['Guru', 'Kepala/wakil', 'Peserta didik', 'Orang tua/komite', 'Sejawat'];
  function nodeWw(gk) { return N.ww + '/' + S.periodeId + '/' + gk; }
  function wwKey(g, no) { return g + '_' + String(no).replace('.', '_'); }
  function wwButir() {
    var peta = petaIndikator(), r = [];
    WAWANCARA.forEach(function (gr, gi) { if (gr.sembunyi) return; gr.q.forEach(function (x) { if (peta[x[0]]) r.push({ g: gi, no: x[0], q: x[1], key: wwKey(gi, x[0]), ind: String(x[0]).replace('.', '_') }); }); });
    return r;
  }
  function muatWw(gk, cb) {
    if (!S.periodeId || typeof db === 'undefined') { if (cb) cb(); return; }
    var kunci = kb(gk), pid = S.periodeId;
    siapSesi().then(function () { return db.ref(nodeWw(gk)).once('value'); }).then(function (sn) {
      if (pid !== S.periodeId) return; S.ww[kunci] = sn.val() || {}; S.wwGagal[kunci] = false;
    }).catch(function () { if (!S.ww[kunci]) S.ww[kunci] = {}; S.wwGagal[kunci] = true; })
    .then(function () { return db.ref(nodeWsj(gk)).once('value').then(function (sn) { if (pid === S.periodeId) { S.wsj[kunci] = sn.val() || {}; S.wsjGagal[kunci] = false; klCatatSj(gk); } }, function () { if (!S.wsj[kunci]) S.wsj[kunci] = {}; S.wsjGagal[kunci] = true; }); })
    .then(function () { if (cb) cb(); });
  }
  // ----- v56: wawancara teman sejawat (satu guru ditunjuk, mengisi sendiri di akunnya) -----
  function nodeWsj(gk) { return N.wsj + '/' + S.periodeId + '/' + gk; }
  function wsjRec(gk) {                       // penunjukan aktif (satu guru) -> {key, nama, tunjuk, a, isi} atau null
    var m = S.wsj[kb(gk)] || {}, ks = Object.keys(m).filter(function (k) { return m[k] && m[k].tunjuk; });
    if (!ks.length) return null; var r = m[ks[0]]; return { key: ks[0], nama: r.nama || namaGuru(ks[0]), tunjuk: r.tunjuk, a: r.a || {}, isi: r.isi || null };
  }
  function wsjJawab(gk) { var r = wsjRec(gk); return (r && r.a) || {}; }
  function wsjPenilaiHtml(gk, boleh) {
    var rec = wsjRec(gk), o = '<div id="pkgWsjBox" style="margin:6px 0 8px;padding:8px 10px;border-radius:8px;background:rgba(15,118,110,.08);font-size:12.5px">';
    o += '<div><b>👥 Teman sejawat mengisi sendiri di akunnya.</b> Tunjuk <b>satu</b> guru; pertanyaannya muncul di menu PKG guru itu dan jawabannya tampil di bawah tiap pertanyaan di sini.</div>';
    if (S.wsjGagal[kb(gk)]) o += '<div style="color:#b91c1c;margin-top:4px">Data penunjukan sejawat tidak terbaca. Pasang Firebase Rules pkg_v4_wsejawat (lihat rules-wawancara-sejawat.txt).</div>';
    if (rec) o += '<div style="margin-top:6px">Ditunjuk: <b>' + esc(rec.nama) + '</b> &bull; ' + (rec.isi ? '<b style="color:#15803d">✔ sudah mengisi</b> (' + fmtTgl(String(rec.isi).slice(0, 10)) + ')' : '<b style="color:#b45309">belum mengisi</b>') + '</div>';
    if (boleh) {
      var lain = guruAktif().filter(function (g) { return g.key && g.key !== gk && AMAN_KEY.test(g.key) && (!rec || g.key !== rec.key); });
      o += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><select class="field" id="pkgWsjPilih" style="min-width:200px"><option value="">' + (rec ? '— Ganti dengan guru lain —' : '— Pilih teman sejawat —') + '</option>' + lain.map(function (g) { return '<option value="' + esc(g.key) + '">' + esc(g.name || g.key) + '</option>'; }).join('') + '</select>' +
        '<button type="button" class="btn btn-success" style="padding:4px 10px;font-size:12px" data-act="wsj-tunjuk">' + (rec ? 'Ganti' : 'Tunjuk') + '</button>' +
        (rec ? '<button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="wsj-batal">Batalkan penunjukan</button>' : '') + '</div>';
    }
    return o + '</div>';
  }
  function wsjIdx() { for (var i = 0; i < WAWANCARA.length; i++) if (WAWANCARA[i].sejawat) return i; return -1; }
  // v57: nama guru yang dipilih di dropdown langsung mengisi kolom nama narasumber sejawat (sejajar dengan tanggal)
  function wsjIsiNama(pk) {
    var gi = wsjIdx(), e = gi < 0 ? null : $('pkgWwN_' + gi); if (!e || !pk || !AMAN_KEY.test(pk) || e.disabled) return;
    var rec = S.gk ? wsjRec(S.gk) : null, v = String(e.value || '').trim();
    if (v && v !== S.wsjAuto && !(rec && v === rec.nama)) return;   // sudah diketik manual: jangan ditimpa
    S.wsjAuto = potong(namaGuru(pk), 120); e.value = S.wsjAuto;
  }
  function wsjTunjuk() {
    var gk = S.gk, u = me(); if (!bolehWwTulis(gk)) return pesan('Tidak dapat menunjuk: penilaian sudah ditetapkan atau Anda tidak berhak.', true);
    if (S.wwKotor) return pesan('Simpan dulu isian wawancara (tombol Simpan di bawah), lalu tunjuk teman sejawat.', true);
    if (S.wsjGagal[kb(gk)]) return pesan('Data penunjukan sejawat belum terbaca. Periksa koneksi dan Firebase Rules (rules-wawancara-sejawat.txt).', true);
    var sel = $('pkgWsjPilih'), pk = sel ? sel.value : ''; if (!pk || !AMAN_KEY.test(pk) || pk === gk) return pesan('Pilih satu guru sebagai teman sejawat.', true);
    var lama = wsjRec(gk);
    if (lama && lama.isi && !confirm('Guru yang ditunjuk sebelumnya (' + lama.nama + ') sudah mengisi. Jawabannya akan terhapus bila diganti. Lanjutkan?')) return;
    var nama = potong(namaGuru(pk), 120), upd = {}; if (lama) upd[lama.key] = null;
    upd[pk] = { tunjuk: nowIso(), oleh: pengisi(u), nama: nama };
    kerjakan(function () { return db.ref(nodeWsj(gk)).update(aman(upd)); }, function () {
      var m = {}; m[pk] = upd[pk]; S.wsj[kb(gk)] = m; klCatatSj(gk);
      var gi = wsjIdx(), dw = S.ww[kb(gk)]; if (gi >= 0 && dw && typeof dw === 'object') { dw.n = dw.n || {}; dw.n['g' + gi] = dw.n['g' + gi] || {}; dw.n['g' + gi].nama = potong(nama, WW_MAKS_N); }   // v57: kolom nama ikut guru yang baru ditunjuk
      if (gi >= 0 && !S.wwGagal[kb(gk)]) {   // v57: nama narasumber sejawat langsung tersimpan juga (hanya bidang nama; isian lain tidak disentuh)
        var up = {}; up['n/g' + gi + '/nama'] = potong(nama, WW_MAKS_N); up.diperbarui = nowIso(); up.diperbaruiOleh = pengisi(u);
        siapSesi().then(function () { return db.ref(nodeWw(gk)).update(aman(up)); }).catch(function (e) {
          try { console.error('[SI MAMBA][PKG] simpan nama sejawat gagal:', e); } catch (x) { }
          pesan('Penunjukan tersimpan, tetapi nama narasumber belum tersimpan otomatis. Tekan Simpan di bagian bawah.', true);
        });
      }
      if (typeof addLog === 'function') addLog('PKG wawancara sejawat tunjuk', namaGuru(gk) + ' -> ' + nama);
      kabari(pk, 'PKG: Anda diminta mengisi wawancara sejawat', 'Anda ditunjuk sebagai teman sejawat untuk penilaian ' + namaGuru(gk) + '. Buka menu PKG Guru untuk mengisinya.');
      pesan('Teman sejawat ditunjuk: ' + nama + '. Ia mengisi dari menu PKG di akunnya.'); render();
    }, 'Gagal menunjuk teman sejawat: ');
  }
  function wsjBatal() {
    var gk = S.gk, rec = wsjRec(gk); if (!rec) return;
    if (!bolehWwTulis(gk)) return pesan('Tidak dapat membatalkan: penilaian sudah ditetapkan atau Anda tidak berhak.', true);
    if (S.wwKotor) return pesan('Simpan dulu isian wawancara (tombol Simpan di bawah), lalu batalkan penunjukan.', true);
    if (!confirm('Batalkan penunjukan ' + rec.nama + (rec.isi ? ' dan hapus jawabannya?' : '?'))) return;
    kerjakan(function () { return db.ref(nodeWsj(gk) + '/' + rec.key).remove(); }, function () {
      S.wsj[kb(gk)] = {}; klCatatSj(gk); if (typeof addLog === 'function') addLog('PKG wawancara sejawat batal', namaGuru(gk));
      pesan('Penunjukan dibatalkan.'); render();
    }, 'Gagal membatalkan penunjukan: ');
  }
  // sisi guru sejawat: cari penunjukan atas dirinya pada guru lain yang sedang dinilai
  function muatTunjuk() {
    var u = me(), pid = S.periodeId, id = ++S.tunjukId;
    S.tunjuk = [];
    if (!u || adm() || kep() || !pid) return;
    var daftar = Object.keys(S.tugas || {}).filter(function (g) { var t = S.tugas[g]; return g !== u.key && t && t.penilaiKey && AMAN_KEY.test(g); });
    if (!daftar.length) return;
    siapSesi().then(function () {
      return Promise.all(daftar.map(function (g) {
        return db.ref(N.wsj + '/' + pid + '/' + g + '/' + u.key).once('value').then(function (x) {
          var v = x.val(); return (v && v.tunjuk) ? { gk: g, nama: namaGuru(g), rec: v } : null;
        }).catch(function () { return null; });       // ditolak Rules / belum ada: lewati
      }));
    }).then(function (hasil) {
      if (id !== S.tunjukId || pid !== S.periodeId) return;
      S.tunjuk = hasil.filter(Boolean).sort(function (x, y) { return String(x.nama).localeCompare(String(y.nama)); });
      if (S.tunjuk.length && S.view === 'list') render();
    }).catch(function (e) { console.warn('[PKG] penunjukan wawancara sejawat gagal dimuat:', e); });
  }
  function tunjukKartu() {
    if (!S.tunjuk || !S.tunjuk.length || bolehKelola()) return '';
    var sisa = S.tunjuk.filter(function (x) { return !x.rec.isi; }).length;
    var o = '<div class="card" style="border:1px solid #0f766e"><h4 style="margin:0 0 4px">🎤 Wawancara sejawat untuk Anda isi' + (sisa ? ' <span class="pkg-chip" style="background:#0f766e">' + sisa + '</span>' : '') + '</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Anda ditunjuk sebagai teman sejawat dalam penilaian kinerja rekan berikut. Jawab pertanyaan singkat dengan contoh nyata. Jawaban hanya dibaca penilai, Kepala Madrasah, dan Admin; rekan yang dinilai tidak membacanya.</p>';
    S.tunjuk.forEach(function (x) {
      o += '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:6px 0;border-top:1px solid #f3f4f6"><span style="font-size:13px"><b>' + esc(x.nama) + '</b>' + (x.rec.isi ? ' <span class="pkg-meta">✔ sudah diisi (' + fmtTgl(String(x.rec.isi).slice(0, 10)) + ')</span>' : '') + '</span>' +
        '<button type="button" class="btn ' + (x.rec.isi ? 'btn-soft' : 'btn-success') + '" style="padding:5px 12px;font-size:12px" data-act="wsj-buka" data-gk="' + esc(x.gk) + '">' + (x.rec.isi ? 'Lihat / ubah jawaban' : 'Isi sekarang') + '</button></div>';
    });
    return o + '</div>';
  }
  function wsjSoal() { return (WAWANCARA[WW_SEJ] && WAWANCARA[WW_SEJ].q) || []; }
  function wsjForm(gk) {
    var u = me(), x = S.tunjuk.filter(function (t) { return t.gk === gk; })[0];
    if (!u || !x) return '<div class="card"><p class="text-muted">Penunjukan tidak ditemukan.</p><button class="btn btn-soft" data-act="wsj-kembali">← Kembali</button></div>';
    var a = x.rec.a || {}, o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><h4 style="margin:0">🎤 Wawancara sejawat: ' + esc(x.nama) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Anda diminta mengisi sebagai teman sejawat.</div></div><button class="btn btn-soft" data-act="wsj-kembali">← Kembali</button></div>' +
      '<p class="text-muted" style="font-size:12px;margin:8px 0 0">Jawab dengan jujur dan sertakan <b>contoh nyata</b> (siapa, kapan, apa yang terjadi). Jawaban umum tanpa contoh kurang membantu penilai. Jawaban ini <b>rahasia</b>: hanya dibaca penilai, Kepala Madrasah, dan Admin. Tidak ada jawaban benar atau salah; kosongkan bila Anda tidak mengetahuinya.</p></div>' +
      '<div class="card" data-wsjform="1">' + wsjSoal().map(function (q) {
        var key = q[0].replace('.', '_'), dr = S.wsjDraft[gk + '|' + key], v = dr != null ? dr : (a[key] || '');
        return '<div style="margin:8px 0"><div style="font-size:13px"><b>' + esc(q[0]) + '</b> ' + esc(q[1]) + '</div><textarea class="field" data-wsj="' + esc(key) + '" rows="3" maxlength="' + MAKS_PRA + '" placeholder="Tulis jawaban dan contoh kejadian…" style="margin-top:4px">' + esc(v) + '</textarea></div>';
      }).join('') +
      '<button type="button" class="btn btn-success" data-act="wsj-simpan" data-gk="' + esc(gk) + '" style="margin-top:4px">💾 Simpan jawaban</button>' + (x.rec.isi ? ' <span class="pkg-meta">Terakhir disimpan ' + fmtTgl(String(x.rec.isi).slice(0, 10)) + '</span>' : '') + '</div>';
    return o;
  }
  function wsjSimpan(el) {
    var gk = el.getAttribute('data-gk') || S.gk, u = me(), x = S.tunjuk.filter(function (t) { return t.gk === gk; })[0];
    if (!u || !x) return pesan('Penunjukan tidak ditemukan.', true);
    var box = el.closest('[data-wsjform]'); if (!box) return;
    var a = {}, n = 0;
    Array.prototype.forEach.call(box.querySelectorAll('textarea[data-wsj]'), function (t) { var v = String(t.value || '').trim(); if (v) { a[t.getAttribute('data-wsj')] = potong(v, MAKS_PRA); n++; } });
    var isi = n ? nowIso() : null, upd = aman({ a: n ? a : null, isi: isi });
    pesan('Menyimpan jawaban…');
    kerjakan(function () { return db.ref(N.wsj + '/' + S.periodeId + '/' + gk + '/' + u.key).update(upd); }, function () {
      x.rec.a = upd.a || null; x.rec.isi = isi; S.wsjDraft = {};
      if (typeof addLog === 'function') addLog('PKG wawancara sejawat isi', namaGuru(gk));
      pesan(n ? 'Jawaban tersimpan (' + n + ' jawaban). Terima kasih.' : 'Jawaban dikosongkan.'); S.view = 'list'; render();
    }, 'Gagal menyimpan jawaban: ');
  }
  function bolehWwTulis(gk) { return !!me() && (bolehMenilai(gk) || lihatSemua()) && statusDari(S.nilai[gk]) !== 'ditetapkan'; }
  function wwSkorValid(v) { return v === 0 || v === 1 || v === 2; }
  function wwHitung(j, saring) {
    var tot = 0, isi = 0, n = 0;
    wwButir().forEach(function (b) { if (saring && !saring(b)) return; n++; var v = j && j[b.key] ? j[b.key].s : undefined; if (wwSkorValid(v)) { tot += v; isi++; } });
    var persen = isi ? tot / (isi * 2) * 100 : 0;
    return { jumlah: n, isi: isi, total: tot, maks: isi * 2, persen: persen, usulan: persen > 75 ? 2 : persen > 25 ? 1 : 0 };
  }
  function wwRingkasG(gi, j) {
    var h = wwHitung(j, function (b) { return b.g === gi; });
    if (!h.isi) return 'Belum ada butir yang dinilai (' + h.jumlah + ' butir).';
    return 'Butir dinilai <b>' + h.isi + '/' + h.jumlah + '</b> &bull; skor <b>' + h.total + '/' + h.maks + '</b> &bull; <b>' + Math.round(h.persen) + '%</b> &bull; kecenderungan: <b>' + h.usulan + ' (' + WW_LAB[h.usulan] + ')</b>' + (h.isi < h.jumlah ? ' <i>(sementara)</i>' : '');
  }
  // Usulan skor per indikator = gabungan butir dari semua narasumber yang menyentuh indikator itu.
  function wwAgregat(j) {
    var ag = {}, urut = [];
    wwButir().forEach(function (b) {
      var sk = j && j[b.key] ? j[b.key].s : undefined; if (!wwSkorValid(sk)) return;
      if (!ag[b.ind]) { ag[b.ind] = { tot: 0, isi: 0 }; urut.push(b.ind); }
      ag[b.ind].tot += sk; ag[b.ind].isi++;
    });
    urut.sort(function (a, c) { var x = a.split('_').map(Number), y = c.split('_').map(Number); return x[0] - y[0] || x[1] - y[1]; });
    return urut.map(function (id) { var a = ag[id], persen = a.tot / (a.isi * 2) * 100; return { id: id, isi: a.isi, total: a.tot, maks: a.isi * 2, persen: persen, usulan: persen > 75 ? 2 : persen > 25 ? 1 : 0 }; });
  }
  function wwUsulanHtml(j) {
    var rows = wwAgregat(j), peta = petaIndikator();
    if (!rows.length) return '<span class="text-muted" style="font-size:12px">Belum ada butir yang dinilai.</span>';
    return '<div style="overflow-x:auto"><table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="text-align:left"><th style="padding:3px 4px">Indikator</th><th style="padding:3px 4px">Butir</th><th style="padding:3px 4px">Skor</th><th style="padding:3px 4px">Persen</th><th style="padding:3px 4px">Usulan skor</th></tr></thead><tbody>' +
      rows.map(function (r) { var ind = peta[r.id.replace('_', '.')]; return '<tr style="border-top:1px solid #e5e7eb"><td style="padding:3px 4px"><b>' + r.id.replace('_', '.') + '</b> ' + esc(potong(ind ? ind.t : '', 70)) + '</td><td style="padding:3px 4px">' + r.isi + '</td><td style="padding:3px 4px">' + r.total + '/' + r.maks + '</td><td style="padding:3px 4px">' + Math.round(r.persen) + '%</td><td style="padding:3px 4px"><b>' + r.usulan + '</b> (' + WW_LAB[r.usulan] + ')</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function wwBacaJ() {
    var r = root(), j = {};
    wwButir().forEach(function (b) { var rd = r ? r.querySelector('input[name="pkgWwS_' + b.key + '"]:checked') : null; if (rd) j[b.key] = { s: parseInt(rd.value, 10) }; });
    return j;
  }
  function wwSegar() {
    if (!root()) return;
    var j = wwBacaJ();
    WAWANCARA.forEach(function (gr, gi) { if (gr.sembunyi) return; var e = $('pkgWwR_' + gi); if (e) e.innerHTML = wwRingkasG(gi, j); });
    var u = $('pkgWwU'); if (u) u.innerHTML = wwUsulanHtml(j);
  }
  // v56: usulan skor OTOMATIS dari angket online (siswa/ortu/sejawat) untuk indikator yang sama, ditampilkan di tiap butir wawancara sebagai pembanding.
  function wwAngketPeta(gk) {
    var A = AK(), a = dataAngket(gk), peta = {};
    if (!A || !a || !a.resp) return null;
    (A.urut || []).forEach(function (j) {
      var rs = a.resp[j] || []; if (!rs.length) return;
      var h = null; try { h = A.hitung(j, rs); } catch (e) { return; }
      if (!h) return;
      Object.keys(h.indikator).forEach(function (ind) { (peta[ind] = peta[ind] || []).push({ j: j, judul: A.jenis[j].judul.replace(/^Angket\s+/, ''), pct: h.indikator[ind].pct, n: h.indikator[ind].n, saran: h.indikator[ind].saran, min: h.min }); });
    });
    return peta;
  }
  function wwAngketHtml(peta, no) {
    if (!peta) return '';
    var l = peta[no]; if (!l || !l.length) return '<div class="text-muted" style="font-size:11px">📊 Angket online: belum ada jawaban untuk indikator ini.</div>';
    return '<div style="font-size:11.5px;margin:2px 0;padding:3px 8px;border-radius:6px;background:rgba(15,118,110,.08)">📊 <b>Angket online (otomatis)</b>: ' + l.map(function (x) {
      return esc(x.judul) + ' <b>' + f1(x.pct) + '%</b> (' + x.n + ' responden) ' + (x.saran != null ? '→ usulan skor <b>' + x.saran + '</b>' : '→ <i>belum cukup responden (min. ' + x.min + ')</i>');
    }).join(' &bull; ') + '</div>';
  }
  // v58: usulan OTOMATIS dari data SI MAMBA (absensi, jurnal, kegiatan, TIK, buku penghubung, dst.) untuk indikator butir, hasil "Tarik bukti otomatis".
  function wwOtoHtml(bk, ind) {
    var o = bk && bk.otomatis && bk.otomatis[ind]; if (!o) return '';
    var t = otoBaris(bk, o); if (!t) return '';
    return '<div class="pkg-oto" style="margin:2px 0">🤖 <b>Data SI MAMBA (otomatis)</b>' + t + (o.saran != null ? '<div style="margin-top:2px">Usulan skor <b>' + o.saran + '</b></div>' : '') + '</div>';
  }
  function wwForm(gk) {
    var kunci = kb(gk), d = S.ww[kunci];
    if (d === undefined) return '<div class="card"><p class="text-muted">Memuat wawancara…</p></div>';
    var boleh = bolehWwTulis(gk), t = tugasDari(gk) || {}, dis = boleh ? '' : ' disabled', j = d.j || {}, n = d.n || {}, bk = dataBukti(gk) || {}, pra = bk.pra || {};
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><h4 style="margin:0">🎤 Wawancara: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Penilai: ' + esc(tampil(t.penilaiNama) || (t.penilaiKey ? namaGuru(t.penilaiKey) : '-')) + ' &bull; SK: ' + skPenTeks(t.penilaiKey) + '</div></div>' +
      '<button class="btn btn-soft" data-act="ww-kembali">← Kembali</button></div>' +
      '<p class="text-muted" style="font-size:12px;margin:8px 0 0">Tiap butir dinilai dari jawaban nyata dan contoh kejadian: <b>2</b> bila ada contoh nyata, <b>1</b> bila jawaban umum, <b>0</b> bila tidak ada bukti. Pra-wawancara hanya bahan; skor dipilih sesudah bertemu narasumber. Data ini rahasia, hanya terbaca penilai, Kepala, dan Admin. Untuk teman sejawat tulis nama atau inisial seperlunya. ' + (boleh ? 'Tersimpan ke server hanya setelah tombol Simpan ditekan.' : 'Penilaian sudah ditetapkan atau Anda tidak berhak mengubah; tampilan hanya baca.') + '</p></div>';
    var peta = petaIndikator(), semua = wwButir(), angPeta = wwAngketPeta(gk);
    WAWANCARA.forEach(function (gr, gi) {
      if (gr.sembunyi) return;
      var nn = n['g' + gi] || {}, sjw = gr.sejawat ? wsjJawab(gk) : {}, adaPra = (gi === 0 && Object.keys(pra).length) || (gr.sejawat && Object.keys(sjw).length);
      o += '<div class="card"><h4 style="margin:0 0 4px">Narasumber: ' + esc(gr.who) + '</h4>' +
        (gr.sejawat ? wsjPenilaiHtml(gk, boleh) : '') +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="field" id="pkgWwN_' + gi + '" maxlength="' + WW_MAKS_N + '" placeholder="' + (gi === 0 ? 'Nama narasumber' : 'Nama / kode / inisial narasumber') + '" value="' + esc(nn.nama || (gi === 0 && boleh ? namaGuru(gk) : (gr.sejawat && wsjRec(gk) ? wsjRec(gk).nama : ''))) + '" style="flex:1;min-width:180px"' + dis + '><input class="field" type="date" id="pkgWwT_' + gi + '" value="' + esc(svTanggal(nn.tgl)) + '" style="max-width:170px"' + dis + '></div>' +
        '<div id="pkgWwR_' + gi + '" class="text-muted" style="font-size:12px;margin:6px 0">' + wwRingkasG(gi, j) + '</div>';
      semua.filter(function (b) { return b.g === gi; }).forEach(function (b) {
        var v = j[b.key] || {}, pj = (gi === 0 && pra[b.ind]) || (gr.sejawat && sjw[b.ind]);
        o += '<div style="border-top:1px dashed #e5e7eb;padding:8px 0"><div style="font-size:13px"><b>' + esc(b.no) + '</b> ' + esc(b.q) + '</div>' +
          '<div class="text-muted" style="font-size:11px">Indikator: ' + esc(potong((peta[b.no] || {}).t || '', 140)) + '</div>' + wwAngketHtml(angPeta, b.no) + wwOtoHtml(bk, b.ind) +
          (pj ? '<div class="pkg-oto" style="background:#fffbeb">🗣️ <b>' + (gr.sejawat ? 'Jawaban teman sejawat (diisi sendiri)' : 'Jawaban guru (pra-wawancara)') + '</b><div style="white-space:pre-wrap;margin-top:2px">' + esc(pj) + '</div></div>' : '') +
          '<div style="display:flex;gap:14px;flex-wrap:wrap;margin:6px 0">' + WW_NILAI.map(function (sv) { return '<label style="font-size:13px"><input type="radio" name="pkgWwS_' + b.key + '" value="' + sv[0] + '" data-wws="1" data-wwg="' + gi + '"' + (v.s === sv[0] ? ' checked' : '') + dis + '> ' + sv[1] + '</label>'; }).join('') + '</div>' +
          '<textarea id="pkgWwC_' + b.key + '" rows="2" maxlength="' + WW_MAKS_C + '" placeholder="Jawaban nyata dan contoh kejadian" style="width:100%"' + dis + '>' + esc(v.c || '') + '</textarea>' +
          (pj && boleh ? '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-top:3px" data-act="ww-salin" data-key="' + esc(b.key) + '">📥 Salin jawaban ' + (gr.sejawat ? 'sejawat' : 'guru') + ' ke catatan</button>' : '') + '</div>';
      });
      if (boleh) o += '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px" data-act="ww-kosong" data-g="' + gi + '">✖ Kosongkan skor narasumber ini</button>' + (adaPra ? ' <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px" data-act="ww-salin" data-key="" data-g="' + gi + '">📥 Salin semua jawaban ' + (gr.sejawat ? 'teman sejawat' : 'pra-wawancara') + '</button>' : '');
      o += '</div>';
    });
    o += '<div class="card"><h4 style="margin:0 0 4px">Usulan skor per indikator</h4><p class="text-muted" style="font-size:12px;margin:0 0 6px">Gabungan butir dari semua narasumber untuk indikator yang sama. Hanya usulan; skor akhir dipilih penilai di form penilaian.</p><div id="pkgWwU">' + wwUsulanHtml(j) + '</div></div>';
    o += '<div class="card pkg-sticky" style="justify-content:flex-start;padding:8px 10px;box-shadow:0 -2px 8px rgba(0,0,0,.08)">';   // v57: bilah tombol menempel di bawah layar
    if (boleh) o += '<button class="btn btn-success" data-act="ww-simpan">💾 Simpan</button><button class="btn btn-soft" data-act="ww-tanggal" title="Mengisi tanggal wawancara dengan hari ini untuk narasumber yang sudah ada nama atau skornya. Tanggal yang sudah terisi tidak ditimpa.">📅 Isi tanggal hari ini</button><button class="btn btn-soft" data-act="ww-bukti" title="Menyimpan ringkasan tiap indikator sebagai bukti wawancara (rahasia, tidak tampil ke guru dan tidak tercetak di Laporan)">📎 Simpan + jadikan bukti wawancara</button>';
    o += '<button class="btn btn-soft" data-act="ww-cetak">🖨️ Cetak (terisi)</button></div>';
    if (S.wwGagal[kunci]) o += '<div style="font-size:12px;color:#b91c1c;margin:0 4px">Data wawancara tidak terbaca/tersimpan. Pastikan Firebase Rules untuk pkg_v4_wawancara sudah dipasang (lihat rules-wawancara-pkg.txt).</div>';
    return o;
  }
  function wwBaca() {
    var r = root(), v = { n: {}, j: {} }, salah = '', g = function (id) { var e = $(id); return e ? String(e.value || '').trim() : ''; };
    WAWANCARA.forEach(function (gr, gi) {
      if (gr.sembunyi) return;
      var nm = g('pkgWwN_' + gi), tg = svTanggal(g('pkgWwT_' + gi)), x = {};
      if (nm.length > WW_MAKS_N) salah = salah || ('Nama narasumber (' + gr.who + ') terlalu panjang (maksimal ' + WW_MAKS_N + ' karakter).');
      if (nm) x.nama = nm; if (tg) x.tgl = tg;
      if (Object.keys(x).length) v.n['g' + gi] = x;
    });
    wwButir().forEach(function (b) {
      var rd = r ? r.querySelector('input[name="pkgWwS_' + b.key + '"]:checked') : null, c = g('pkgWwC_' + b.key);
      if (c.length > WW_MAKS_C) salah = salah || ('Catatan butir ' + b.no + ' (' + WW_SINGKAT[b.g] + ') terlalu panjang (' + c.length + ' karakter; maksimal ' + WW_MAKS_C + ').');
      if (rd || c) { var x = {}; if (rd) x.s = parseInt(rd.value, 10); if (c) x.c = c; v.j[b.key] = x; }
    });
    return { v: v, salah: salah };
  }
  function wwSimpan(gk, sesudah) {
    if (!bolehWwTulis(gk)) return pesan('Tidak dapat menyimpan: penilaian sudah ditetapkan atau Anda tidak berhak.', true);
    if (S.wwGagal[kb(gk)]) { muatWw(gk, function () { if (S.view === 'wawancara' && S.gk === gk && !S.wwKotor) render(); }); return pesan('Data wawancara yang tersimpan belum berhasil dimuat, jadi penyimpanan dibatalkan agar data lama tidak tertimpa. Periksa koneksi dan Firebase Rules (rules-wawancara-pkg.txt), lalu coba lagi.', true); }
    var a = wwBaca(); if (a.salah) return pesan(a.salah, true);
    var v = a.v, u = me(), kunci = kb(gk), val = null;
    if (Object.keys(v.n).length || Object.keys(v.j).length) {
      val = {}; ['n', 'j'].forEach(function (f) { if (Object.keys(v[f]).length) val[f] = v[f]; });
      val.diperbarui = nowIso(); val.diperbaruiOleh = pengisi(u);
    }
    kerjakan(function () { return db.ref(nodeWw(gk)).set(val ? aman(val) : null); }, function () {
      S.ww[kunci] = val || {}; S.wwGagal[kunci] = false; S.wwKotor = false;
      if (typeof addLog === 'function') addLog('PKG wawancara', namaGuru(gk));
      if (sesudah) sesudah(); else { pesan('Wawancara tersimpan.'); render(); }
    }, 'Gagal menyimpan wawancara: ');
  }
  // v55: tanggal wawancara = hari ini untuk narasumber yang sudah ada isinya (nama atau skor) dan tanggalnya masih kosong.
  function wwIsiTanggal() {
    var gk = S.gk; if (!bolehWwTulis(gk)) return pesan('Tidak dapat mengisi: penilaian sudah ditetapkan atau Anda tidak berhak.', true);
    var j = wwBacaJ(), n = 0, hari = skHariIni();
    WAWANCARA.forEach(function (gr, gi) {
      if (gr.sembunyi) return;
      var e = $('pkgWwT_' + gi), nm = $('pkgWwN_' + gi); if (!e || e.value) return;
      var adaSkor = wwButir().some(function (b) { return b.g === gi && j[b.key]; });
      if ((nm && nm.value.trim() && gi !== 0) || adaSkor) { e.value = hari; n++; }
    });
    if (n) S.wwKotor = true;
    pesan(n ? 'Tanggal diisi hari ini untuk ' + n + ' narasumber. Ubah bila wawancara dilakukan di hari lain, lalu simpan.' : 'Tidak ada yang diisi: tanggal sudah terisi, atau narasumber belum ada nama/skornya.', !n);
  }
  // Salin jawaban pra-wawancara guru ke catatan butir yang masih kosong (tidak menimpa, skor tidak ikut terisi).
  function wwSalin(gk, satuKey, gSaja) {
    var d = dataBukti(gk); if (!d) return pesan('Data pra-wawancara masih dimuat, coba lagi sebentar.', true);
    var pra = d.pra || {}, sjw = wsjJawab(gk), n = 0;
    wwButir().forEach(function (b) {
      if ((b.g !== 0 && b.g !== WW_SEJ) || (satuKey && b.key !== satuKey) || (gSaja !== '' && gSaja != null && String(b.g) !== String(gSaja))) return;
      var tx = (b.g === 0 ? pra : sjw)[b.ind], e = $('pkgWwC_' + b.key);
      if (e && !e.disabled && tx && !String(e.value).trim()) { e.value = potong((b.g === 0 ? 'Jawaban tertulis guru: ' : 'Jawaban tertulis teman sejawat: ') + tx, WW_MAKS_C); n++; }
    });
    if (n) S.wwKotor = true;
    pesan(n ? n + ' catatan diisi dari jawaban tertulis. Lengkapi dengan hasil wawancara/konfirmasi, lalu pilih skor tiap butir.' : 'Tidak ada yang disalin: jawaban tertulis kosong atau catatan sudah terisi.', !n);
  }
  // Ringkasan tiap indikator -> satu bukti wawancara (kunci tetap "wawancara"); rahasia: tidak tampil ke guru dan tidak tercetak di Laporan.
  function wwBuktiTulis(gk) {
    if (!bolehJenis('wawancara', gk)) return pesan('Anda tidak berhak menambah bukti wawancara untuk guru ini (atau penilaian sudah final).', true);
    var d = S.ww[kb(gk)] || {}, j = d.j || {}, upd = {}, n = 0, lewat = [], u = me(), bd = dataBukti(gk) || {}, per = {};
    wwButir().forEach(function (b) { var v = j[b.key]; if (v && (wwSkorValid(v.s) || v.c)) (per[b.ind] = per[b.ind] || []).push({ b: b, v: v }); });
    Object.keys(per).forEach(function (id) {
      var ada = !!(bd.item && bd.item[id] && bd.item[id].wawancara);
      if (!ada && itemTotal(gk, id) >= MAKS_ITEM) { lewat.push(id.replace('_', '.')); return; }
      var ag = wwAgregat(j).filter(function (r) { return r.id === id; })[0];
      var bagian = per[id].map(function (x) { return '[' + WW_SINGKAT[x.b.g] + (wwSkorValid(x.v.s) ? ' ' + x.v.s : '') + ']' + (x.v.c ? ' ' + x.v.c : ''); }).join(' ');
      upd[id + '/wawancara'] = { jenis: 'wawancara', judul: 'Wawancara terstruktur (' + per[id].length + ' butir)', ket: potong((ag ? 'Usulan skor ' + ag.usulan + ' (' + Math.round(ag.persen) + '%). ' : '') + bagian, 500), oleh: pengisi(u), olehKey: u.key, at: nowIso() };
      n++;
    });
    if (!n) return pesan('Belum ada butir yang bisa dijadikan bukti' + (lewat.length ? '; indikator ' + lewat.join(', ') + ' sudah penuh.' : '.'), true);
    kerjakan(function () { return db.ref(nodeBukti(gk) + '/item').update(aman(upd)); }, function () {
      var b = S.bukti[kb(gk)] || (S.bukti[kb(gk)] = {}); b.item = b.item || {};
      Object.keys(upd).forEach(function (pt) { var q = pt.split('/'); b.item[q[0]] = b.item[q[0]] || {}; b.item[q[0]][q[1]] = upd[pt]; });
      if (typeof addLog === 'function') addLog('PKG wawancara jadi bukti', namaGuru(gk));
      pesan(n + ' bukti wawancara disimpan' + (lewat.length ? '; indikator ' + lewat.join(', ') + ' dilewati (bukti sudah penuh).' : '.')); render();
    }, 'Gagal menyimpan bukti wawancara: ');
  }
  function bukaWw(gk) {
    if (!bolehPerangkat('wawancara', gk)) return pesan('Tidak tersedia untuk Anda.', true);
    S.gk = gk; S.view = 'wawancara'; S.wwKotor = false; render();
    var lagi = function () { if (S.view === 'wawancara' && S.gk === gk && !S.wwKotor) render(); };
    muatBukti(gk, lagi); muatWw(gk, lagi); if (adaPenilai(gk)) muatAngket(gk, lagi);
  }
  // Cetak Pedoman Wawancara: terisi bila sudah ada data tersimpan (dokumen kerja penilai, simpan sebagai arsip internal).
  function wwDataCetak(gk, g, x) { var d = S.ww[kb(gk)] || {}; return d.j && d.j[wwKey(WAWANCARA.indexOf(g), x[0])]; }
  function wwAdaCat(gk, g, x) { var v = wwDataCetak(gk, g, x); return !!(v && v.c); }
  function wwCetakSel(gk, g, x) {
    var v = wwDataCetak(gk, g, x); if (!v) return '';
    return (wwSkorValid(v.s) ? '<div style="font-size:11px"><b>Skor ' + v.s + '</b> (' + WW_LAB[v.s] + ')</div>' : '') + (v.c ? '<div style="font-size:10.5px">' + rtlTeks(v.c) + '</div>' : '');
  }
  function wwCetakN(gk, g, f) { var d = S.ww[kb(gk)] || {}, nn = (d.n && d.n['g' + WAWANCARA.indexOf(g)]) || {}, v = nn[f]; return v ? (f === 'tgl' ? fmtTgl(v) : esc(v)) : '&nbsp;'; }

  // ---------- v37: Pengendalian internal (pkg_v4_kendali), Juknis Bab III.F.1 ----------
  // Hanya Admin / Kepala Madrasah. Pemeriksaan otomatis dihitung dari data aplikasi; daftar periksa, sampel, dan temuan diisi manual.
  var KD_CEK = [
    ['a', 'Pertemuan pertama dengan penilai di awal proses PKG (III.F.1.a)', 1],
    ['b', 'Pada pertemuan pertama diperiksa: semua kegiatan PKG sudah dijadwalkan, setiap penilai memiliki perangkat penilaian lengkap, dan penilai mengikuti prosedur (III.F.1.b)', 0],
    ['c', 'Penilai dipantau selama pelaksanaan PKG dan penilai yang tidak mengikuti prosedur dicatat (III.F.1.c)', 0],
    ['h', 'Penilai melaporkan kegiatan penilaian dan masalah yang ditemui (III.F.1.h)', 0],
    ['i', 'Data yang dikumpulkan dibandingkan dengan skor yang diberikan agar adil dan transparan (III.F.1.i)', 0],
    ['j', 'Verifikasi ke guru atas sampel acak (III.F.1.j)', 0],
    ['k', 'Bila data tidak cukup mendukung skor: penilai dipanggil dan diminta melengkapi (III.F.1.k–l)', 0],
    ['g', 'Pertemuan kedua bila ditemukan masalah: masalah dijelaskan tanpa menunjuk penilai tertentu (III.F.1.f–g)', 1],
    ['m', 'Guru yang masih keberatan ditangani lewat mediasi (III.F.1.m)', 0]
  ];
  function kdMuat(cb) {
    var pid = S.periodeId, gurus = guruAktif(), gagal = 0;
    if (!pid) { S.kd = { pid: null, d: {}, gagal: false, buktiGagal: 0 }; if (cb) cb(); return; }
    siapSesi().then(function () {
      var a = db.ref(N.kendali + '/' + pid).once('value').then(function (s) { return { ok: true, v: s.val() || {} }; }).catch(function () { return { ok: false, v: {} }; });
      var b = Promise.all(gurus.map(function (g) {
        return db.ref(nodeBukti(g.key)).once('value').then(function (s) { if (pid === S.periodeId) S.bukti[pid + '/' + g.key] = s.val() || {}; }).catch(function () { gagal++; });
      }));
      return Promise.all([a, b]).then(function (r) { S.kd = { pid: pid, d: r[0].v, gagal: !r[0].ok, buktiGagal: gagal }; });
    }).catch(function () { S.kd = { pid: pid, d: {}, gagal: true, buktiGagal: 0 }; }).then(function () { if (cb) cb(); });
  }
  function kdOtomatis() {
    var gurus = guruAktif(), out = [], hariIni = skHariIni(), per = S.periodeList[S.periodeId] || {};
    var nm = function (a) { return a.map(function (g) { return esc(typeof g === 'string' ? g : g.name); }).join(', '); };
    var adaT = function (g) { var t = S.tugas[g.key]; return t && t.penilaiKey ? t : null; };
    var muatOk = function (g) { return S.bukti[kb(g.key)] !== undefined; };
    var tambah = function (rj, j, ok, d) { out.push({ rj: rj, j: j, ok: ok, d: d }); };
    var tanpaPen = gurus.filter(function (g) { return !adaT(g); }), tanpaJad = gurus.filter(function (g) { var t = adaT(g); return t && !t.jadwal; });
    tambah('III.F.1.a–b', 'Semua guru memiliki penilai dan jadwal pengamatan', !tanpaPen.length && !tanpaJad.length,
      (!tanpaPen.length && !tanpaJad.length) ? gurus.length + ' guru sudah punya penilai dan jadwal.' : (tanpaPen.length ? 'Belum ada penilai: ' + nm(tanpaPen) + '. ' : '') + (tanpaJad.length ? 'Belum ada jadwal pengamatan: ' + nm(tanpaJad) + '.' : ''));
    var jml = {}; gurus.forEach(function (g) { var t = adaT(g); if (t) jml[t.penilaiKey] = (jml[t.penilaiKey] || 0) + 1; });
    var pk = Object.keys(jml), lebih = pk.filter(function (k) { return jml[k] > MAKS_GURU_PER_PENILAI; });
    tambah('III.A.1.a.2', 'Setiap penilai menilai paling banyak ' + MAKS_GURU_PER_PENILAI + ' guru', !lebih.length, lebih.length ? 'Melebihi batas: ' + nm(lebih.map(function (k) { return namaGuru(k) + ' (' + jml[k] + ' guru)'; })) + '.' : pk.length + ' penilai, beban terbanyak ' + (pk.length ? Math.max.apply(null, pk.map(function (k) { return jml[k]; })) : 0) + ' guru.');
    var sk = pk.filter(function (k) { var s = skPen(k); return !s || !s.nomor || (s.akhir && s.akhir < hariIni); });
    tambah('III.A.1.a.1.j', 'Setiap penilai memiliki SK penugasan yang masih berlaku', !sk.length, sk.length ? 'SK belum dicatat atau kedaluwarsa: ' + nm(sk.map(function (k) { return namaGuru(k); })) + '.' : 'SK semua penilai tercatat dan masih berlaku.');
    var tdkMuat = gurus.filter(function (g) { return !muatOk(g); });
    var tanpaBukti = gurus.filter(function (g) { return muatOk(g) && !indikatorBerbukti(g.key).n; });
    tambah('III.F.1.b', 'Bukti kinerja tiap guru sudah terhimpun di aplikasi', !tanpaBukti.length && !tdkMuat.length, tdkMuat.length ? 'Data bukti tidak terbaca untuk: ' + nm(tdkMuat) + '.' : (tanpaBukti.length ? 'Belum ada bukti sama sekali: ' + nm(tanpaBukti) + '.' : 'Semua guru memiliki bukti.'));
    var adaObs = function (gk) { return P.komponen.some(function (km) { return km.indikator.some(function (_, i) { return daftarItem(gk, km.no + '_' + (i + 1)).some(function (it) { return it.jenis === 'observasi'; }); }); }); };
    var tanpaObs = gurus.filter(function (g) { return muatOk(g) && !adaObs(g.key); });
    tambah('III.B', 'Pengamatan pembelajaran sudah dicatat untuk tiap guru', !tanpaObs.length && !tdkMuat.length, tdkMuat.length ? 'Data bukti tidak terbaca untuk sebagian guru.' : (tanpaObs.length ? 'Belum ada catatan pengamatan: ' + nm(tanpaObs) + '.' : 'Semua guru memiliki catatan pengamatan.'));
    var tb = [], jauh = [];
    gurus.forEach(function (g) {
      var n = S.nilai[g.key]; if (!n || !n.skor || !muatOk(g)) return;
      var x = 0, y = 0, d = dataBukti(g.key) || {};
      P.komponen.forEach(function (km) { km.indikator.forEach(function (_, i) {
        var key = km.no + '_' + (i + 1), s = n.skor[key]; if (s == null) return;
        if (s >= 1 && !daftarItem(g.key, key).length && !adaOto(g.key, key)) x++;
        var o = d.otomatis && d.otomatis[key]; if (o && (o.saran === 0 || o.saran === 1 || o.saran === 2) && Math.abs(s - o.saran) >= 2) y++;
      }); });
      if (x) tb.push(g.name + ' (' + x + ' indikator)'); if (y) jauh.push(g.name + ' (' + y + ' indikator)');
    });
    tambah('III.F.1.i, k', 'Skor yang diberikan didukung bukti', !tb.length, tb.length ? 'Skor 1–2 tanpa bukti apa pun: ' + nm(tb) + '.' : 'Tidak ada skor yang tanpa bukti.');
    tambah('III.F.1.i', 'Skor tidak jauh menyimpang dari usulan data otomatis', !jauh.length, jauh.length ? 'Selisih 2 poin dari usulan data: ' + nm(jauh) + '. Periksa alasan penilai.' : 'Tidak ada selisih besar.');
    var keb = gurus.filter(function (g) { return statusDari(S.nilai[g.key]) === 'keberatan'; }), dja = gurus.filter(function (g) { return statusDari(S.nilai[g.key]) === 'diajukan'; });
    tambah('III.F.1.m', 'Tidak ada guru yang masih keberatan', !keb.length, keb.length ? 'Keberatan belum selesai: ' + nm(keb) + '. Fasilitasi internal; bila belum selesai, laporkan ke Kantor Kemenag.' : (dja.length ? dja.length + ' guru belum menyatakan setuju/keberatan.' : 'Tidak ada keberatan.'));
    var th = String(per.selesai || per.mulai || hariIni).slice(0, 4), batas = th + '-12-15';
    var sisa = Math.round((new Date(batas + 'T00:00:00') - new Date(hariIni + 'T00:00:00')) / 86400000);
    var belum = gurus.filter(function (g) { return statusDari(S.nilai[g.key]) !== 'ditetapkan'; });
    tambah('II.E.3', 'Hasil PKG semua guru sudah Ditetapkan (laporan dianjurkan selesai pertengahan Desember)', !belum.length, belum.length ? belum.length + ' dari ' + gurus.length + ' guru belum Ditetapkan; ' + (sisa >= 0 ? 'sisa ' + sisa + ' hari menuju ' + fmtTgl(batas) + '.' : 'sudah lewat ' + (-sisa) + ' hari dari ' + fmtTgl(batas) + '.') : 'Semua hasil sudah Ditetapkan.');
    return out;
  }
  // ---------- v54: usulan otomatis Pengendalian Internal (bagian C catatan sampel, bagian D temuan & tindak lanjut) ----------
  // Hanya mengisi kolom yang masih kosong. Tidak menyebut nama penilai; yang disebut hanya jumlah guru dan nomor komponen.
  function kdGabung(a) { a = a.map(String); return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' dan ' + a[a.length - 1]; }
  function kdBukti(gk) {            // null bila data bukti guru belum terbaca
    if (S.bukti[kb(gk)] === undefined) return null;
    var per = {}, belum = 0, b = indikatorBerbukti(gk);
    P.komponen.forEach(function (km) { km.indikator.forEach(function (_, i) {
      var key = km.no + '_' + (i + 1);
      if (!daftarItem(gk, key).length && !adaOto(gk, key)) { per[km.no] = (per[km.no] || 0) + 1; belum++; }
    }); });
    return { n: b.n, total: b.total, per: per, belum: belum };
  }
  function kdNoKomp(per) { return Object.keys(per).map(Number).sort(function (x, y) { return x - y; }); }
  function kdCatatanSampel(gk) {
    var r = kdBukti(gk); if (!r) return '';
    var t = r.n + '/' + r.total + ' indikator berbukti';
    var ks = kdNoKomp(r.per);
    t += ks.length ? '; belum berbukti pada komponen ' + kdGabung(ks) : '; semua indikator berbukti';
    return potong(t, 300);
  }
  function kdUsulanD(sam, otm) {
    var gk = Object.keys(sam), sesuai = 0, perlu = 0, tanpa = 0, jmlN = 0, jmlT = 0, perAll = {}, perPerlu = {};
    gk.forEach(function (k) {
      var h = sam[k] && sam[k].h;
      if (h === 'sesuai') sesuai++; else if (h === 'perlu') perlu++; else tanpa++;
      var r = kdBukti(k); if (!r) return;
      jmlN += r.n; jmlT += r.total;
      Object.keys(r.per).forEach(function (no) { perAll[no] = (perAll[no] || 0) + r.per[no]; if (h === 'perlu') perPerlu[no] = (perPerlu[no] || 0) + r.per[no]; });
    });
    var tm = [], tl = [];
    if (gk.length) {
      tm.push('Verifikasi atas ' + gk.length + ' guru sampel acak: ' + sesuai + ' Sesuai' + (perlu ? ', ' + perlu + ' Perlu dilengkapi' : '') + (tanpa ? ', ' + tanpa + ' belum diverifikasi' : '') + '.');
      if (jmlT) {
        var ks = Object.keys(perAll).map(Number).sort(function (a, b) { return perAll[b] - perAll[a] || a - b; });
        tm.push(ks.length ? 'Pada sampel, ' + jmlN + ' dari ' + jmlT + ' indikator berbukti; indikator yang belum berbukti terbanyak pada komponen ' + kdGabung(ks.slice(0, 4).sort(function (a, b) { return a - b; })) + '.' : 'Pada sampel, seluruh indikator (' + jmlT + ') berbukti.');
      }
    }
    var gagal = otm.filter(function (x) { return !x.ok; });
    if (otm.length) {
      tm.push('Pemeriksaan otomatis: ' + (otm.length - gagal.length) + ' dari ' + otm.length + ' butir sesuai' + (gagal.length ? '; perlu perhatian pada ' + gagal.slice(0, 3).map(function (x) { return x.j.charAt(0).toLowerCase() + x.j.slice(1); }).join('; ') + (gagal.length > 3 ? ' dan ' + (gagal.length - 3) + ' butir lain' : '') : '') + '.');
    }
    if (perlu) {
      var kp = kdNoKomp(perPerlu);
      tl.push('Penilai terkait diminta melengkapi bukti pada indikator yang belum berbukti' + (kp.length ? ' (komponen ' + kdGabung(kp) + ')' : '') + ', lalu dilakukan verifikasi ulang kepada guru sampel.');
    }
    if (tanpa) tl.push('Verifikasi guru sampel yang belum diverifikasi diselesaikan.');
    if (gagal.length) tl.push('Butir pemeriksaan otomatis yang perlu perhatian ditindaklanjuti Kepala Madrasah bersama penilai.');
    if (!tl.length && gk.length) tl.push('Tidak ada tindak lanjut khusus; hasil verifikasi sampel sesuai.');
    return { temuan: potong(tm.join(' '), 1000), tindak: potong(tl.join(' '), 1000) };
  }
  // v55: butir j (verifikasi sampel) hanya DIUSULKAN; Kepala menekan tombol, tidak dicentang diam-diam.
  function kdTerapkanJ() {
    if (!bolehKelola() || !S.kd || S.kd.pid !== S.periodeId) return;
    var a = kdAmbil(), sam = a.v.sampel || {}, ks = Object.keys(sam);
    if (!ks.length) return pesan('Belum ada sampel verifikasi. Ambil sampel acak dulu.', true);
    var belum = ks.filter(function (k) { return !sam[k].h; }), perlu = ks.filter(function (k) { return sam[k].h === 'perlu'; }).length;
    if (belum.length) return pesan(belum.length + ' dari ' + ks.length + ' guru sampel belum diverifikasi (' + belum.slice(0, 3).map(namaGuru).join(', ') + (belum.length > 3 ? ', dst.' : '') + '). Isi hasil verifikasinya dulu.', true);
    var r = root(), cb = null, nt = null;
    Array.prototype.forEach.call(r ? r.querySelectorAll('input[data-kc]') : [], function (e) { if (e.getAttribute('data-kc') === 'j') cb = e; });
    Array.prototype.forEach.call(r ? r.querySelectorAll('input[data-kn]') : [], function (e) { if (e.getAttribute('data-kn') === 'j') nt = e; });
    if (!cb) return;
    cb.checked = true;
    if (nt && !nt.value.trim()) nt.value = potong('Verifikasi ' + ks.length + ' guru sampel: ' + (ks.length - perlu) + ' sesuai' + (perlu ? ', ' + perlu + ' perlu dilengkapi' : '') + '.', 300);
    pesan('Butir verifikasi sampel dicentang. Periksa, lalu tekan Simpan.');
  }
  function kdIsiUsulan() {
    if (!bolehKelola() || !S.kd || S.kd.pid !== S.periodeId) return;
    var a = kdAmbil(), sam = a.v.sampel || {}, u = kdUsulanD(sam, kdOtomatis()), n = 0, r = root();
    Array.prototype.forEach.call(r ? r.querySelectorAll('input[data-sc]') : [], function (e) {
      if (e.value.trim()) return; var c = kdCatatanSampel(e.getAttribute('data-sc')); if (c) { e.value = c; n++; }
    });
    [['pkgKdTemuan', u.temuan], ['pkgKdTindak', u.tindak]].forEach(function (q) { var e = $(q[0]); if (e && !e.value.trim() && q[1]) { e.value = q[1]; n++; } });
    pesan(n ? 'Usulan diisi dari hasil verifikasi sampel dan data bukti (' + n + ' kolom). Periksa dan sesuaikan, lalu tekan Simpan.' : 'Tidak ada yang diisi: kolom sudah berisi (tidak ditimpa) atau belum ada sampel/hasil yang bisa dirangkum.');
  }
  function kendaliHtml() {
    var pid = S.periodeId;
    if (!S.kd || S.kd.pid !== pid) {
      if (!S.kdMuat) { S.kdMuat = true; kdMuat(function () { S.kdMuat = false; if (S.tab === 'kendali' && S.view === 'list') render(); }); }
      return '<div class="card"><p class="text-muted">Memuat data pengendalian…</p></div>';
    }
    var d = S.kd.d || {}, cek = d.cek || {}, sam = d.sampel || {}, otm = kdOtomatis(), sesuai = otm.filter(function (x) { return x.ok; }).length;
    var o = '<div class="card"><h4 style="margin:0 0 4px">🧪 Pengendalian Internal PKG</h4><div class="text-muted" style="font-size:12px">Juknis Bab III.F.1: dilakukan Kepala Madrasah dan/atau pengawas madrasah. Bagian A dihitung otomatis dari data aplikasi; bagian B–D diisi manual.</div></div>';
    o += '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 6px">A. Pemeriksaan otomatis <span class="pkg-chip" style="background:' + (sesuai === otm.length ? '#15803d' : '#b45309') + '">' + sesuai + ' / ' + otm.length + ' sesuai</span></h4>' +
      '<table><thead><tr><th>Butir</th><th>Rujukan</th><th>Hasil</th><th>Rincian</th></tr></thead><tbody>' +
      otm.map(function (x) { return '<tr><td>' + esc(x.j) + '</td><td style="white-space:nowrap;font-size:11px">' + esc(x.rj) + '</td><td>' + (x.ok ? '<span class="pkg-chip" style="background:#15803d">Sesuai</span>' : '<span class="pkg-chip" style="background:#b45309">Perlu perhatian</span>') + '</td><td style="font-size:12px">' + x.d + '</td></tr>'; }).join('') + '</tbody></table>' +
      (S.kd.buktiGagal ? '<div style="margin-top:6px;font-size:12px;color:#b91c1c">Bukti ' + S.kd.buktiGagal + ' guru tidak terbaca (periksa Rules pkg_v4_bukti dan sesi login).</div>' : '') + '</div>';
    o += '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 6px">B. Daftar periksa dan catatan pertemuan</h4><table><thead><tr><th style="width:34px">Ya</th><th>Butir</th><th>Tanggal</th><th>Catatan</th></tr></thead><tbody>' +
      KD_CEK.map(function (c) { var x = cek[c[0]] || {}; return '<tr><td style="text-align:center"><input type="checkbox" data-kc="' + c[0] + '"' + (x.ok ? ' checked' : '') + '></td><td style="font-size:12.5px">' + esc(c[1]) + (c[0] === 'j' && Object.keys(sam).length && !x.ok ? '<div style="margin-top:4px"><button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px" data-act="kd-j-usul" title="Usulan: centang bila semua guru sampel sudah punya hasil verifikasi. Tidak dicentang otomatis; Kepala yang memutuskan.">💡 Usulan: terapkan setelah semua sampel diverifikasi</button></div>' : '') + '</td><td>' + (c[2] ? '<input type="date" data-kt="' + c[0] + '" value="' + esc(svTanggal(x.t)) + '">' : '') + '</td><td><input class="field" data-kn="' + c[0] + '" maxlength="300" value="' + esc(x.c || '') + '" placeholder="Catatan"></td></tr>'; }).join('') + '</tbody></table></div>';
    var ks = Object.keys(sam);
    o += '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 6px">C. Sampel verifikasi acak</h4>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><label class="label" style="margin:0">Jumlah guru</label><input id="pkgKdJml" type="number" min="1" max="10" value="' + (ks.length || 3) + '" style="width:70px"><button class="btn btn-soft" data-act="kd-acak">🎲 Ambil sampel acak</button>' + (d.sampelAt ? '<span class="text-muted" style="font-size:11px">diambil ' + fmtTgl(String(d.sampelAt).slice(0, 10)) + '</span>' : '') + '</div>';
    if (!ks.length) o += '<p class="text-muted" style="margin:0;font-size:12px">Belum ada sampel. Pilih jumlah guru lalu ambil sampel; hanya guru yang sudah dinilai yang ikut diundi.</p>';
    else {
      o += '<table><thead><tr><th>Guru</th><th>Penilai</th><th>Nilai</th><th>Hasil verifikasi</th><th>Catatan</th></tr></thead><tbody>';
      ks.forEach(function (gk) {
        var n = S.nilai[gk], h = n && n.skor ? hitung(n.skor) : null, x = sam[gk] || {}, t = tugasDari(gk) || {}, b = indikatorBerbukti(gk);
        o += '<tr><td>' + esc(namaGuru(gk)) + '</td><td>' + esc(t.penilaiKey ? (tampil(t.penilaiNama) || namaGuru(t.penilaiKey)) : '-') + '</td><td style="font-size:12px">' + (h && h.lengkap ? f1(h.nilai100) + ' (' + esc(h.sebutan) + ')' : 'belum lengkap') + '<br><span class="text-muted">' + b.n + '/' + b.total + ' indikator berbukti</span></td>' +
          '<td><select data-sh="' + esc(gk) + '"><option value="">—</option><option value="sesuai"' + (x.h === 'sesuai' ? ' selected' : '') + '>Sesuai</option><option value="perlu"' + (x.h === 'perlu' ? ' selected' : '') + '>Perlu dilengkapi</option></select></td>' +
          '<td><input class="field" data-sc="' + esc(gk) + '" maxlength="300" value="' + esc(x.c || '') + '" placeholder="Catatan"></td></tr>';
      });
      o += '</tbody></table>';
    }
    o += '</div><div class="card"><h4 style="margin:0 0 6px">D. Temuan dan tindak lanjut</h4><label style="display:block;font-size:12.5px;font-weight:600">Temuan (tanpa menunjuk penilai tertentu bila disampaikan di pertemuan kedua)</label><textarea id="pkgKdTemuan" rows="3" maxlength="1000" style="width:100%">' + esc(d.temuan || '') + '</textarea>' +
      '<label style="display:block;font-size:12.5px;font-weight:600;margin-top:8px">Tindak lanjut</label><textarea id="pkgKdTindak" rows="3" maxlength="1000" style="width:100%">' + esc(d.tindak || '') + '</textarea>' +
      '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-success" data-act="kd-simpan">💾 Simpan</button><button class="btn btn-soft" data-act="kd-usulan" title="Menyusun kalimat Temuan dan Tindak lanjut serta Catatan tiap guru sampel dari hasil verifikasi dan data bukti. Kolom yang sudah terisi tidak ditimpa.">✨ Isi usulan dari hasil verifikasi</button><button class="btn btn-soft" data-act="kd-cetak">🖨️ Cetak Lembar Pengendalian</button></div>' +
      (S.kd.gagal ? '<div style="margin-top:8px;font-size:12px;color:#b91c1c">Data pengendalian tidak terbaca/tersimpan. Pastikan Firebase Rules untuk pkg_v4_kendali sudah dipasang (lihat rules-supervisi-kendali-pkg.txt).</div>' : '') + '</div>';
    return o;
  }
  function kdAmbil() {
    var r = root(), d = (S.kd && S.kd.d) || {}, v = { cek: {}, sampel: {} }, salah = '';
    var sem = function (sel, attr, k) { var l = r ? r.querySelectorAll(sel) : [], x = null; Array.prototype.forEach.call(l, function (e) { if (e.getAttribute(attr) === k) x = e; }); return x; };
    KD_CEK.forEach(function (c) {
      var cb = sem('input[data-kc]', 'data-kc', c[0]), nt = sem('input[data-kn]', 'data-kn', c[0]), tg = sem('input[data-kt]', 'data-kt', c[0]), o = {};
      var cat = nt ? nt.value.trim() : '', t = tg ? svTanggal(tg.value) : '';
      if (cat.length > 300) salah = salah || ('Catatan terlalu panjang (maksimal 300 karakter): ' + c[1].slice(0, 40) + '…');
      if (cb && cb.checked) o.ok = true; if (cat) o.c = cat; if (t) o.t = t;
      if (Object.keys(o).length) v.cek[c[0]] = o;
    });
    Object.keys(d.sampel || {}).forEach(function (gk) {
      var sh = sem('select[data-sh]', 'data-sh', gk), sc = sem('input[data-sc]', 'data-sc', gk), o = { p: true }, c = sc ? sc.value.trim() : '';
      if (c.length > 300) salah = salah || ('Catatan sampel ' + namaGuru(gk) + ' terlalu panjang (maksimal 300 karakter).');
      if (sh && sh.value) o.h = sh.value; if (c) o.c = c; v.sampel[gk] = o;
    });
    var g = function (id) { var e = $(id); return e ? e.value.trim() : ''; };
    v.temuan = g('pkgKdTemuan'); v.tindak = g('pkgKdTindak');
    if (v.temuan.length > 1000 || v.tindak.length > 1000) salah = salah || 'Temuan / tindak lanjut terlalu panjang (maksimal 1000 karakter).';
    v.sampelAt = d.sampelAt || null; v.sampelOleh = d.sampelOleh || null;
    return { v: v, salah: salah };
  }
  function kdSimpan() {
    if (!bolehKelola() || !S.kd || S.kd.pid !== S.periodeId) return;
    if (S.kd.gagal) return pesan('Data pengendalian yang tersimpan belum berhasil dimuat, jadi penyimpanan dibatalkan agar data lama tidak tertimpa. Periksa koneksi dan Firebase Rules pkg_v4_kendali, lalu muat ulang.', true);   // v38
    var a = kdAmbil(); if (a.salah) return pesan(a.salah, true);
    var v = a.v, u = me(), pid = S.periodeId, val = {};
    if (Object.keys(v.cek).length) val.cek = v.cek;
    if (Object.keys(v.sampel).length) { val.sampel = v.sampel; if (v.sampelAt) val.sampelAt = v.sampelAt; if (v.sampelOleh) val.sampelOleh = v.sampelOleh; }
    if (v.temuan) val.temuan = v.temuan; if (v.tindak) val.tindak = v.tindak;
    var ada = Object.keys(val).length; if (ada) { val.diperbarui = nowIso(); val.diperbaruiOleh = pengisi(u); }
    kerjakan(function () { return db.ref(N.kendali + '/' + pid).set(ada ? aman(val) : null); }, function () {
      S.kd.d = ada ? val : {}; S.kd.gagal = false;
      if (typeof addLog === 'function') addLog('PKG pengendalian internal', (S.periodeList[pid] || {}).nama || pid);
      pesan('Lembar pengendalian tersimpan.'); render();
    }, 'Gagal menyimpan pengendalian: ');
  }
  function kdAcak() {
    if (!bolehKelola() || !S.kd || S.kd.pid !== S.periodeId) return;
    var d = S.kd.d || {}, sudah = Object.keys(d.sampel || {}).some(function (k) { return d.sampel[k] && d.sampel[k].h; });
    if (sudah && !confirm('Sampel lama sudah ada hasil verifikasinya dan akan diganti. Lanjutkan?')) return;
    var e = $('pkgKdJml'), n = Math.max(1, Math.min(10, parseInt(e && e.value, 10) || 3));
    var el = guruAktif().filter(function (g) { var x = S.nilai[g.key]; return x && x.skor && Object.keys(x.skor).length; });
    if (!el.length) return pesan('Belum ada guru yang sudah dinilai untuk diambil sampelnya.', true);
    for (var i = el.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = el[i]; el[i] = el[j]; el[j] = tmp; }
    var sam = {}; el.slice(0, Math.min(n, el.length)).forEach(function (g) { sam[g.key] = { p: true }; });
    var u = me(), pid = S.periodeId, at = nowIso(), oleh = pengisi(u);
    kerjakan(function () { return db.ref(N.kendali + '/' + pid).update({ sampel: sam, sampelAt: at, sampelOleh: oleh, diperbarui: at, diperbaruiOleh: oleh }); }, function () {
      S.kd.d = S.kd.d || {}; S.kd.d.sampel = sam; S.kd.d.sampelAt = at; S.kd.d.sampelOleh = oleh;
      pesan(Object.keys(sam).length + ' guru terpilih sebagai sampel verifikasi.'); render();
    }, 'Gagal menyimpan sampel: ');
  }
  function kdCetak() {
    if (!bolehKelola() || !S.kd || S.kd.pid !== S.periodeId) return;
    var a = kdAmbil(); if (a.salah) return pesan(a.salah, true);
    var v = a.v, per = S.periodeList[S.periodeId] || {}, otm = kdOtomatis(), kot = '&#9744;', cek = '&#9745;';
    var h4 = function (s) { return '<h4 style="margin:14px 0 4px;page-break-after:avoid">' + s + '</h4>'; };
    var o = '<h3>LEMBAR PENGENDALIAN INTERNAL<br>PENILAIAN KINERJA GURU MADRASAH<br>' + esc(per.nama || '') + '</h3><p class="ket">Dasar: Juknis PKG Madrasah (Keputusan Dirjen Pendidikan Islam Nomor 1843 Tahun 2021) Bab III.F.1. Pengendalian internal dilakukan oleh Kepala Madrasah dan/atau Pengawas Madrasah.</p>';
    o += h4('A. PEMERIKSAAN OTOMATIS DARI DATA SI MAMBA (' + fmtTgl(skHariIni()) + ')') + '<table><thead><tr><th style="width:28px">No</th><th>Butir yang diperiksa</th><th style="width:66px">Rujukan</th><th style="width:78px">Hasil</th><th style="width:34%">Rincian</th></tr></thead><tbody>' +
      otm.map(function (x, i) { return '<tr style="page-break-inside:avoid"><td>' + (i + 1) + '</td><td>' + esc(x.j) + '</td><td class="ket">' + esc(x.rj) + '</td><td>' + (x.ok ? '&#9745; Sesuai' : '&#9888; Perlu perhatian') + '</td><td class="ket">' + x.d + '</td></tr>'; }).join('') + '</tbody></table>';
    o += h4('B. DAFTAR PERIKSA DAN CATATAN PERTEMUAN') + '<table><thead><tr><th style="width:28px">No</th><th>Butir</th><th style="width:34px">Ya</th><th style="width:80px">Tanggal</th><th style="width:30%">Catatan</th></tr></thead><tbody>' +
      KD_CEK.map(function (c, i) { var x = v.cek[c[0]] || {}; return '<tr style="page-break-inside:avoid"><td>' + (i + 1) + '</td><td>' + esc(c[1]) + '</td><td style="text-align:center">' + (x.ok ? cek : kot) + '</td><td>' + (x.t ? fmtTgl(x.t) : '') + '</td><td style="height:26px">' + (x.c ? esc(x.c) : '') + '</td></tr>'; }).join('') + '</tbody></table>';
    var ks = Object.keys(v.sampel);
    o += h4('C. SAMPEL VERIFIKASI ACAK') + '<table><thead><tr><th style="width:28px">No</th><th>Guru</th><th>Penilai</th><th style="width:70px">Nilai</th><th style="width:90px">Hasil</th><th style="width:28%">Catatan</th></tr></thead><tbody>' +
      (ks.length ? ks.map(function (gk, i) {
        var n = S.nilai[gk], h = n && n.skor ? hitung(n.skor) : null, x = v.sampel[gk], t = tugasDari(gk) || {};
        return '<tr style="page-break-inside:avoid"><td>' + (i + 1) + '</td><td>' + esc(namaGuru(gk)) + '</td><td>' + esc(t.penilaiKey ? (tampil(t.penilaiNama) || namaGuru(t.penilaiKey)) : '-') + '</td><td style="text-align:center">' + (h && h.lengkap ? f1(h.nilai100) : '-') + '</td><td>' + (x.h === 'sesuai' ? 'Sesuai' : (x.h === 'perlu' ? 'Perlu dilengkapi' : '')) + '</td><td>' + (x.c ? esc(x.c) : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="6" style="height:40px">Belum ada sampel.</td></tr>') + '</tbody></table>';
    o += h4('D. TEMUAN DAN TINDAK LANJUT') + '<table><tr><td style="width:24%;height:56px">Temuan</td><td>' + (v.temuan ? rtlTeks(v.temuan) : '') + '</td></tr><tr><td style="height:56px">Tindak lanjut</td><td>' + (v.tindak ? rtlTeks(v.tindak) : '') + '</td></tr></table>';
    o += '<div class="ttd"><div>Pengawas Madrasah<br><br><br><br>(................................)</div>' + blokKepalaCetak(true, 'Pengendalian Internal PKG', 'Pengendalian Internal PKG | ' + (per.nama || '') + ' | ' + otm.filter(function (x) { return x.ok; }).length + '/' + otm.length + ' sesuai') + '</div>';
    bukaCetak('Pengendalian Internal PKG - ' + (per.nama || ''), o);
  }

  // ---------- pemasangan ke aplikasi ----------
  function pasang() {
    bersihkanDraftLama();
    var dash = $('page-dashboard');
    if (dash && !root()) {
      var div = document.createElement('div'); div.id = 'page-pkg'; div.className = 'page-content hidden';
      dash.parentNode.appendChild(div);
      div.addEventListener('click', function (ev) {
        var el = ev.target.closest('[data-act]'); if (!el || !div.contains(el)) return;
        if (el.tagName === 'SELECT') return;
        if (el.tagName === 'A') ev.preventDefault();
        aksi(el.getAttribute('data-act'), el);
      });
      div.addEventListener('change', function (ev) {
        if (ev.target && ev.target.id === 'pkgWsjPilih') return wsjIsiNama(ev.target.value);
        var t = ev.target, bukanIsian = t && t.id === 'pkgWsjPilih'; if (!bukanIsian && S.view === 'supervisi') S.svKotor = true; if (!bukanIsian && S.view === 'wawancara') S.wwKotor = true;   // v57: dropdown penunjukan sejawat bukan isian wawancara
        if (S.view === 'wawancara' && t.getAttribute && t.getAttribute('data-wws')) return wwSegar();
        if (S.view === 'supervisi' && t.getAttribute) {
          if (t.getAttribute('data-svb')) return svSegar(t.getAttribute('data-svb'), true);
          if (String(t.name || '').indexOf('pkgSvS_') === 0) { (S.svAuto = S.svAuto || {})[t.name.slice(7)] = false; return; }
        }
        if (S.tab === 'kendali' && t.matches && t.matches('input[type=checkbox][data-kc]') && t.checked) {   // v55: tanggal butir yang bertanggal terisi hari ini saat dicentang
          var kc = t.getAttribute('data-kc'), rr = root(); Array.prototype.forEach.call(rr ? rr.querySelectorAll('input[data-kt]') : [], function (e) { if (e.getAttribute('data-kt') === kc && !e.value) e.value = skHariIni(); });
        }
        if (t.getAttribute && t.getAttribute('data-act') === 'wa-jenis' && S.gk) { var w1 = waState(S.gk); w1.jenis = t.value === 'ortu' ? 'ortu' : 'siswa'; w1.kelas = ''; w1.ant = null; return render(); }
        if (t.getAttribute && t.getAttribute('data-act') === 'wa-kelas' && S.gk) { var w0 = waState(S.gk); w0.kelas = t.value; w0.ant = null; return render(); }
        if (t.getAttribute && t.getAttribute('data-act') === 'ganti-periode') { S.periodeId = t.value; S.view = 'list'; S.bukti = {}; S.sv = {}; S.ww = {}; S.wsj = {}; S.wsjDraft = {}; S.kd = null; S.kdMuat = false; return muat(); }
        if (t.matches && t.matches('input[type=checkbox][data-pn]')) {   // v72: catatan pengamatan otomatis dari penanda yang dicentang
          var pbx = t.closest('[data-pform]'), pta = pbx ? pbx.querySelector('textarea[data-f="catatan"]') : null, parr = pbx ? PENANDA[String(pbx.getAttribute('data-pform') || '').replace('_', '.')] : null;
          if (pta && parr && (!String(pta.value || '').trim() || pta.getAttribute('data-auto') === '1')) {
            var pcs = []; Array.prototype.forEach.call(pbx.querySelectorAll('input[data-pn]'), function (c) { if (c.checked) pcs.push(parseInt(c.getAttribute('data-pn'), 10)); });
            pta.value = pcs.length ? catatanDariPenanda(parr, pcs) : ''; pta.setAttribute('data-auto', '1');
          }
          return;
        }
        if (t.matches && t.matches('input[type=checkbox][data-siap]') && S.view === 'bukti') return simpanSiap(t.getAttribute('data-siap'), t.checked);
        if (t.matches && t.matches('input[type=radio][data-diri]') && S.gk) { (S.diriDraft = S.diriDraft || {})[S.gk + '|j|' + t.getAttribute('data-diri')] = t.value; return render(); }
        if (t.matches && t.matches('input[type=radio][data-k]') && S.draft) { S.draft.skor[t.getAttribute('data-k') + '_' + t.getAttribute('data-i')] = parseInt(t.value, 10); simpanLokal(); recalc(); }
      });
      div.addEventListener('input', function (ev) {
        var t = ev.target, bukanIsian = t && t.id === 'pkgWsjPilih'; if (!bukanIsian && S.view === 'supervisi') S.svKotor = true; if (!bukanIsian && S.view === 'wawancara') S.wwKotor = true;   // v57: dropdown penunjukan sejawat bukan isian wawancara
        if (t.id === 'pkgKbAlasan') S.kbTeks = t.value;
        if (t.getAttribute && t.getAttribute('data-cari-guru')) {   // v69: kotak cari nama guru di tab Bukti/Observasi/Angket (menyaring baris tanpa render ulang)
          var q = String(t.value || '').trim().toLowerCase(), tb = t.closest('.card');
          if (tb) Array.prototype.forEach.call(tb.querySelectorAll('tr[data-nama]'), function (tr) { tr.style.display = !q || tr.getAttribute('data-nama').indexOf(q) >= 0 ? '' : 'none'; });
          return;
        }
        if (t.getAttribute && t.getAttribute('data-f') === 'catatan' && t.closest && t.closest('[data-pform]')) t.removeAttribute('data-auto');   // v72: penilai mengetik sendiri -> tidak ditimpa lagi
        if (t.id && t.id.indexOf('pkgObsK_') === 0 && S.gk) { var vk = obsKesLokal(S.gk); vk[t.id.slice(8)] = t.value; obsKesSimpan(S.gk, vk); }   // v73: kesimpulan observasi
        if (t.getAttribute && t.getAttribute('data-cat') && S.draft) { S.draft.catatan[t.getAttribute('data-cat')] = t.value; simpanLokal(); }
        if (t.getAttribute && t.getAttribute('data-diri-r') && S.gk) { (S.diriDraft = S.diriDraft || {})[S.gk + '|r|' + t.getAttribute('data-diri-r')] = t.value; }
        if (t.getAttribute && t.getAttribute('data-wsj') && S.gk) { S.wsjDraft[S.gk + '|' + t.getAttribute('data-wsj')] = t.value; }
        if (t.getAttribute && t.getAttribute('data-pra') && S.gk) { (S.praDraft = S.praDraft || {})[S.gk + '|' + t.getAttribute('data-pra')] = t.value; }
      });
    }
    var grup = document.querySelector('.menu-group[data-group="operasional-v4"] .menu-group-items');
    if (grup && !grup.querySelector('[data-page="pkg"]')) {
      var item = document.createElement('div'); item.className = 'menu-item'; item.setAttribute('data-page', 'pkg');
      item.innerHTML = '<span class="icon">📋</span> PKG Guru';
      item.addEventListener('click', function () { if (typeof navigateTo === 'function') navigateTo('pkg'); });
      grup.appendChild(item);
    }
    aturMenu();
  }

  // app.js (menuRules) hanya menyembunyikan item bernilai false; 'pkg' tidak ada di sana sehingga tampil untuk semua peran.
  // Hanya Admin, Kepala Madrasah, dan guru (termasuk wali kelas) yang relevan.
  function bolehMenu() {
    var u = me(); if (!u) return true;
    return adm() || kep() || u.role === 'teacher' || u.role === 'wali_kelas';
  }
  function aturMenu() {
    var it = document.querySelector('#v4SidebarMenu .menu-item[data-page="pkg"]');
    if (it) it.classList.toggle('hidden-tab', !bolehMenu());
  }

  function bukaHalaman() {
    var t = $('pageTitle'); if (t) t.textContent = 'PKG Guru';
    var u = me();
    // Pengguna berganti (logout/login) di tab yang sama: jangan bawa data/draft pengguna sebelumnya.
    if (u && S.userKey !== u.key) { S.userKey = u.key; S.kl = null; S.klMuat = null; S.periodeList = {}; S.periodeId = null; S.tugas = {}; S.nilai = {}; S.bukti = {}; S.obsKes = {}; S.obsKesMuat = {}; S.skpen = {}; S.skset = null; S.sv = {}; S.ww = {}; S.wsj = {}; S.wsjDraft = {}; S.tunjuk = []; S.kd = null; S.kdMuat = false; S.draft = null; S.gk = null; S.pg = null; S.pgSentuh = null; S.tab = tabIngat(u); }
    S.view = 'list';
    if (u && !bolehKelola() && (S.tab === 'pengaturan' || S.tab === 'analisis' || S.tab === 'kendali')) S.tab = 'daftar';
    muat();
  }

  var terakhirBuka = 0;
  var navAsli = window.navigateTo;
  if (typeof navAsli === 'function') {
    window.navigateTo = function (page) {
      var hasil = navAsli.apply(this, arguments);
      if (page === 'pkg') {
        // Cegah pemuatan ganda bila klik menu juga ditangani pendengar lain (app.js/menu-hub.js).
        var sekarang = Date.now();
        if (sekarang - terakhirBuka > 400) { terakhirBuka = sekarang; bukaHalaman(); }
      }
      return hasil;
    };
  }

  // v4ApplyMode (app.js) menghitung ulang kelas hidden-tab tiap login / ganti mode kerja -> terapkan lagi aturan PKG sesudahnya.
  var modeAsli = window.v4ApplyMode;
  if (typeof modeAsli === 'function') {
    window.v4ApplyMode = function () { var r = modeAsli.apply(this, arguments); try { aturMenu(); } catch (e) { } return r; };
  }

  // ----- Analisis (js/pkg-analisis.js): tab 📊 Analisis, hanya Admin / Kepala Madrasah -----
  function analisisHtml() {
    if (window.PKG_ANALISIS && typeof window.PKG_ANALISIS.html === 'function') return window.PKG_ANALISIS.html();
    return '<div class="card"><p class="text-muted">Modul js/pkg-analisis.js belum dimuat.</p></div>';
  }
  window.__pkgCtx = function () {
    return { S: S, P: P, N: N, db: db, esc: esc, f1: f1, stat: stat, hitung: hitung, statusDari: statusDari, guruAktif: guruAktif, namaGuru: namaGuru,
      pesan: pesan, siapSesi: siapSesi, bukaCetak: bukaCetak, blokKepalaCetak: blokKepalaCetak, bolehKelola: bolehKelola, render: render, STATUS_LABEL: STATUS_LABEL, STATUS_WARNA: STATUS_WARNA };
  };
  window.pkgRender = render;
  window.pkgMuat = muat;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
