/* ============================================================
   SI MAMBA - js/app.js
   Logic utama aplikasi (Firebase, state, semua fungsi halaman: absensi,
   nilai, jurnal, honor guru, surat, dll).
   Dimuat di akhir <body> (setelah seluruh HTML dirender) agar semua
   document.getElementById(...) yang dipanggil saat inisialisasi sudah
   menemukan elemennya - persis seperti posisi <script> inline sebelumnya.
============================================================ */
    // ============================================================
    // DAFTAR KELAS - SATU SUMBER KEBENARAN UNTUK SELURUH APLIKASI
    // ============================================================
    // Sebelumnya daftar "Kelas 1".."Kelas 6" di-hardcode berulang di ~30 tempat berbeda
    // (16 di HTML sebagai <option> statis, 14 di JS sebagai array literal, termasuk salinan
    // terpisah bernama KELAS_LIST) -- kalau madrasah menambah kelas atau mengubah penamaan,
    // semua tempat itu harus diedit manual satu-satu, rawan ada yang kelewat/tidak konsisten.
    // Sekarang SEMUA bagian aplikasi membaca dari array `KELAS_LIST` ini SAJA. Nilai defaultnya
    // di bawah ini dipakai sampai Admin mengubahnya lewat halaman Profil Sekolah (tersimpan di
    // Firebase school_settings.kelasList) -- lihat applyKelasListFromSnapshot() & populateKelasSelect().
    // `let` (bukan `const`) supaya ISI-nya bisa ditimpa saat Admin menyimpan daftar kelas baru,
    // TANPA perlu redeklarasi ulang variabel (semua kode lain yang sudah menyimpan referensi ke
    // array ini -- misalnya lewat spread [...KELAS_LIST] -- otomatis konsisten karena kita
    // menimpa ISI array pakai splice(), bukan membuat array baru yang memutus referensi lama).
    let KELAS_LIST = ['Kelas 1','Kelas 2','Kelas 3','Kelas 4','Kelas 5','Kelas 6'];
    function setKelasList(newList) {
      if (!Array.isArray(newList) || newList.length === 0) return;
      KELAS_LIST.splice(0, KELAS_LIST.length, ...newList);
    }
    // Jendela jam Absen Datang/Pulang guru (WIB). Bawaan di bawah; Admin dapat mengubahnya di Profil Sekolah
    // (disimpan di school_settings/jendelaAbsen). Nilai tidak valid per-jendela diabaikan -> kembali ke bawaan.
    const JENDELA_ABSEN_DEFAULT = {
      datang: { mulai: '06:00', selesai: '07:30' },
      pulang: { mulai: '11:00', selesai: '12:30' },        // Senin-Kamis (dan Minggu)
      pulangJumat: { mulai: '10:00', selesai: '12:00' },
      pulangSabtu: { mulai: '10:30', selesai: '12:00' }
    };
    let JENDELA_ABSEN = JSON.parse(JSON.stringify(JENDELA_ABSEN_DEFAULT));
    function jendelaAbsenValid(w) {
      const re = /^([01]\d|2[0-3]):[0-5]\d$/;
      return !!(w && re.test(String(w.mulai)) && re.test(String(w.selesai)) && String(w.mulai) < String(w.selesai));
    }
    function setJendelaAbsen(obj) {
      const baru = JSON.parse(JSON.stringify(JENDELA_ABSEN_DEFAULT));
      if (obj && typeof obj === 'object') Object.keys(baru).forEach(k => { if (jendelaAbsenValid(obj[k])) baru[k] = { mulai: obj[k].mulai, selesai: obj[k].selesai }; });
      JENDELA_ABSEN = baru;
    }
    // Isi ulang SEBUAH <select> dengan <option> untuk tiap kelas di KELAS_LIST. `extraFirst`
    // opsional untuk menambah satu <option> tetap di paling atas (mis. "Semua Kelas").
    // `selected` opsional untuk mempertahankan pilihan yang sedang aktif setelah re-render.
    function populateKelasSelect(selectEl, opts) {
      if (!selectEl) return;
      opts = opts || {};
      const source = opts.list || KELAS_LIST;
      const prevValue = opts.selected != null ? opts.selected : selectEl.value;
      let html = '';
      if (opts.extraFirst) html += `<option value="${escapeHtml(opts.extraFirstValue != null ? opts.extraFirstValue : '')}">${escapeHtml(opts.extraFirst)}</option>`;
      html += source.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
      selectEl.innerHTML = html;
      if (prevValue && source.includes(prevValue)) selectEl.value = prevValue;
      else if (opts.extraFirst) selectEl.value = opts.extraFirstValue != null ? opts.extraFirstValue : '';
      else if (source.length === 1) selectEl.value = source[0];
    }
    // Isi ulang SEKUMPULAN checkbox (dipakai di form Tambah/Edit Guru & User Management) dengan
    // satu <label><input type=checkbox></label> per kelas di KELAS_LIST.
    function populateKelasCheckboxes(containerEl, checkboxClass, checkedList) {
      if (!containerEl) return;
      checkedList = checkedList || [];
      containerEl.innerHTML = KELAS_LIST.map(k => `<label><input type="checkbox" class="${checkboxClass}" value="${escapeHtml(k)}" ${checkedList.includes(k) ? 'checked' : ''}> ${escapeHtml(k)}</label>`).join('');
    }
    // Panggil semua <select>/checkbox kelas yang ada di halaman supaya konsisten dengan
    // KELAS_LIST terbaru -- dipanggil saat login/refresh data, dan setelah Admin mengubah
    // daftar kelas. Mencakup SEMUA 15 lokasi yang dulu hardcode "Kelas 1".."Kelas 6" manual.
    function refreshAllKelasDropdowns() {
      // Select biasa, tanpa opsi tambahan di awal
      ['studentClass','jadwalKelasFilter','jadwalFormKelas','promoteClass','editSiswaClass','reportClass'].forEach(id => {
        populateKelasSelect(document.getElementById(id));
      });
      perbaruiLabelTombolLulus();
      // rekapNilaiKelas dibatasi ke kelas yang benar-benar boleh dilihat user (siswaScopeKelas):
      // Admin/Kepsek semua kelas, Wali Kelas cuma kelas yang dia ampu -- bukan semua kelas yang
      // kebetulan dia ajar sebagai guru mapel.
      populateKelasSelect(document.getElementById('rekapNilaiKelas'), { list: siswaScopeKelas() });
      // Select dengan opsi "Semua Kelas" di awal
      populateKelasSelect(document.getElementById('filterKelasSiswa'), { list: siswaScopeKelas(), extraFirst: '📋 Semua Kelas', extraFirstValue: '' });
      populateKelasSelect(document.getElementById('rekapFilterKelas'), { extraFirst: 'Semua Kelas', extraFirstValue: '' });
      // Select "Wali Kelas dari Kelas Berapa?" dengan opsi "-- Pilih Kelas --" di awal
      ['adminWaliKelasOf','userWaliKelasOf','editWaliKelasOf'].forEach(id => {
        populateKelasSelect(document.getElementById(id), { extraFirst: '-- Pilih Kelas --', extraFirstValue: '' });
      });
      // Checkbox "Kelas yang Diajar" di form yang masih ada (User Management, Edit Guru).
      populateKelasCheckboxes(document.getElementById('userClassCheckboxes'), 'user-class-check');
      populateKelasCheckboxes(document.getElementById('editClassCheckboxes'), 'edit-class-check');
    }

    // ============================================================
    // DATA MADRASAH - MUDAH DIUBAH
    // ============================================================
    const MADRASAH = {
      nama: 'MADRASAH IBTIDAIYAH MAMBAUL ULUM',
      nsm: '',
      jalan: 'Jl. Raya Mambaul Ulum No. 1',
      desa: '', kecamatan: 'Kecamatan ...', kabupaten: 'Kabupaten ...', provinsi: '', kodePos: '',
      alamat: 'Jl. Raya Mambaul Ulum No. 1, Kecamatan ... Kabupaten ...',
      telp: '(031) 1234567',
      email: 'mi.mambaululum@gmail.com',
      website: 'www.mimambaululum.sch.id',
      // ============================================================
      // NILAI DI BAWAH INI SEKARANG HANYA JADI DEFAULT AWAL -- begitu Admin mengisi & menyimpan
      // lewat halaman Profil Sekolah, nilai dari Firebase (school_settings) akan menimpa nilai
      // ini secara otomatis di applyMadrasahProfileFromSnapshot(), dan langsung dipakai di semua
      // kop surat / surat keterangan / PDF raport tanpa perlu ubah kode.
      // ============================================================
      kepala_sekolah: 'Drs. H. Ahmad Fauzi, M.Pd.',
      nip_kepala_sekolah: '196512311990031001',
      bendahara: '', nip_bendahara: '',
      operator: '', nip_operator: '',
      // Gambar tanda tangan digital Kepala Sekolah, disimpan sebagai base64 langsung (bukan
      // URL Storage -- lihat catatan di v4LoadTtdKepalaForPdf soal Firebase Storage yang kini
      // wajib Blaze). Kosong = surat tetap pakai tanda tangan teks biasa, tidak wajib diisi.
      ttdKepalaBase64: '',
      // Nominal Iuran Mingguan TETAP per siswa (sama rata semua siswa madrasah), diatur Admin
      // lewat halaman Profil Sekolah. null = belum diatur, 0 = sengaja gratis (JANGAN dicek pakai || atau truthiness).
      iuranMingguanNominal: null, // null = belum diatur Admin; 0 = sengaja diatur gratis (dibedakan)
      // Jadwal pembayaran honor (pengingat catat ke Kas Umum): tanggal tiap bulan (1-31; 0/null = pengingat mati) dan honor bulan apa
      // yang dibayar pada tanggal itu ('lalu' = bulan sebelumnya, 'ini' = bulan berjalan). Diatur Admin di halaman Honor.
      honorTanggalBayar: null,
      honorBulanBayar: 'lalu'
    };
    // Menyusun alamat lengkap dari komponen-komponen detail (jalan, desa, kecamatan, kabupaten,
    // provinsi, kode pos) jadi satu baris alamat siap pakai di kop surat. Kalau komponen detail
    // belum diisi sama sekali, biarkan null supaya caller bisa fallback ke alamat lama.
    function composeAlamatLengkap(s) {
      const parts = [
        s.jalan || '',
        s.desa ? 'Desa/Kel. ' + s.desa : '',
        s.kecamatan ? 'Kec. ' + s.kecamatan : '',
        s.kabupaten ? 'Kab./Kota ' + s.kabupaten : '',
        s.provinsi || '',
        s.kodePos || ''
      ].filter(Boolean);
      return parts.length ? parts.join(', ') : null;
    }
    // Menimpa (mutate in-place) objek MADRASAH dengan data dari Firebase (school_settings).
    // MADRASAH sengaja TIDAK dideklarasikan ulang (tetap const) -- semua kode lain yang sudah
    // menulis MADRASAH.nama / MADRASAH.alamat dsb tetap otomatis melihat nilai terbaru karena
    // mereka memegang referensi ke objek yang SAMA, cukup properti-nya yang diubah di sini.
    function applyMadrasahProfileFromSnapshot(s) {
      s = s || {};
      MADRASAH.nama = s.namaMadrasah || MADRASAH.nama;
      MADRASAH.nsm = s.nsm != null ? s.nsm : MADRASAH.nsm;
      MADRASAH.jalan = s.jalan != null ? s.jalan : MADRASAH.jalan;
      MADRASAH.desa = s.desa != null ? s.desa : MADRASAH.desa;
      MADRASAH.kecamatan = s.kecamatan != null ? s.kecamatan : MADRASAH.kecamatan;
      MADRASAH.kabupaten = s.kabupaten != null ? s.kabupaten : MADRASAH.kabupaten;
      MADRASAH.provinsi = s.provinsi != null ? s.provinsi : MADRASAH.provinsi;
      MADRASAH.kodePos = s.kodePos != null ? s.kodePos : MADRASAH.kodePos;
      const composed = composeAlamatLengkap(MADRASAH);
      MADRASAH.alamat = composed || MADRASAH.alamat;
      MADRASAH.telp = s.telp || MADRASAH.telp;
      MADRASAH.email = s.email || MADRASAH.email;
      MADRASAH.website = s.website || MADRASAH.website;
      MADRASAH.kepala_sekolah = s.kepalaSekolah || MADRASAH.kepala_sekolah;
      MADRASAH.nip_kepala_sekolah = s.nipKepalaSekolah != null ? s.nipKepalaSekolah : MADRASAH.nip_kepala_sekolah;
      MADRASAH.bendahara = s.bendahara != null ? s.bendahara : MADRASAH.bendahara;
      MADRASAH.nip_bendahara = s.nipBendahara != null ? s.nipBendahara : MADRASAH.nip_bendahara;
      MADRASAH.operator = s.operator != null ? s.operator : MADRASAH.operator;
      MADRASAH.nip_operator = s.nipOperator != null ? s.nipOperator : MADRASAH.nip_operator;
      MADRASAH.ttdKepalaBase64 = s.ttdKepalaBase64 != null ? s.ttdKepalaBase64 : MADRASAH.ttdKepalaBase64;
      MADRASAH.iuranMingguanNominal = s.iuranMingguanNominal != null ? s.iuranMingguanNominal : MADRASAH.iuranMingguanNominal;
      MADRASAH.honorTanggalBayar = s.honorTanggalBayar != null ? s.honorTanggalBayar : MADRASAH.honorTanggalBayar;
      MADRASAH.honorBulanBayar = s.honorBulanBayar === 'ini' ? 'ini' : (s.honorBulanBayar === 'lalu' ? 'lalu' : MADRASAH.honorBulanBayar);
    }

    // ============================================================
    // KONFIGURASI & INISIALISASI FIREBASE
    // ============================================================
    const firebaseConfig = {
      apiKey: "AIzaSyDavQuImJuJmskAbcqeFL3rkxFaKVFS4HI",
      authDomain: "administrasi-madrasah-46c72.firebaseapp.com",
      databaseURL: "https://administrasi-madrasah-46c72-default-rtdb.firebaseio.com",
      projectId: "administrasi-madrasah-46c72",
      storageBucket: "administrasi-madrasah-46c72.firebasestorage.app",
      messagingSenderId: "515893476502",
      appId: "1:515893476502:web:7141669c4158a4678c16b7",
      measurementId: "G-42M20494DY"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    // CATATAN: firebase.storage() SENGAJA tidak diinisialisasi lagi di sini -- sejak proyek ini
    // dipastikan tetap di plan gratis Spark, semua fitur sudah dialihkan supaya tidak butuh
    // Cloud Storage sama sekali (lihat komentar di v4LoadTtdKepalaForPdf, autoBackup/manualBackup,
    // checkinEvent/checkinUjian). Kalau index.html masih memuat script SDK firebase-storage,
    // itu aman dibiarkan (tidak dipakai) atau boleh dihapus untuk sedikit menghemat waktu muat.
    const auth = firebase.auth();
    // Wajib login anonim ke Firebase SEBELUM baca/tulis data apa pun.
    // Ini dipasangkan dengan Security Rules yang mensyaratkan auth != null,
    // supaya database tidak bisa diakses siapa pun yang belum pernah membuka
    // aplikasi ini (misal lewat script yang langsung menembak REST API Firebase).
    // CATATAN PENTING: ini BUKAN pengganti kontrol role admin/guru/kepsek —
    // itu perlu Firebase Auth per-user (bukan anonim) + custom claims di
    // Cloud Functions kalau mau ditegakkan di sisi server. Lihat catatan di
    // firebase-security-rules.json yang disertakan.
    // authReady: resolve begitu login anonim selesai (maks. 5 detik, supaya tidak menggantung kalau offline).
    // Dengan Rules "auth != null", membaca database SEBELUM login anonim selesai ditolak (PERMISSION_DENIED)
    // -> daftar guru kosong & app mengira offline. Bacaan pertama (daftar guru, pemulihan sesi) menunggu ini.
    const authReady = new Promise(resolve => {
      const t = setTimeout(resolve, 5000);
      const off = auth.onAuthStateChanged(u => { if (u) { clearTimeout(t); off(); resolve(u); } });
    });
    auth.signInAnonymously().catch(err => {
      console.error('Gagal auth anonim:', err);
      const pesan = (err && err.code === 'auth/operation-not-allowed')
        ? 'Login Anonim belum diaktifkan di Firebase (Authentication > Sign-in method > Anonymous).'
        : 'Gagal login anonim ke Firebase: ' + ((err && (err.code || err.message)) || err);
      setTimeout(() => { try { toast('⚠️ ' + pesan, true, 10000); } catch (e) {} }, 1500);
    });

    const ROLES = { TEACHER: 'teacher', HEADMASTER: 'headmaster', ADMIN: 'admin', WALI_KELAS: 'wali_kelas' };
    // PIN Admin & Kepsek: hash SHA-256 TANPA salt yang ditanam di source (dua konstanta di bawah). Berbeda dari
    // PIN guru, yang bergaram per-akun (hashPinSalted/verifyGuruPin) dan disimpan lewat js/kredensial.js.
    // Konsekuensinya: siapa pun yang bisa membuka source (View Source/DevTools) dapat menebak PIN secara offline
    // tanpa batas percobaan, dan PIN pendek/berupa angka biasanya ketemu dalam hitungan detik. Jadi hash ini hanya
    // "pintu depan" di sisi client; perlindungan data yang sebenarnya harus datang dari Firebase Security Rules
    // (firebase-security-rules.json). Batas percobaan di form login hanya per-perangkat (lihat ADMIN_LOGIN_LOCK_KEY).
    // Kedua hash di bawah BERBEDA (Admin dan Kepsek tidak berbagi PIN); bila suatu hari identik, console.warn
    // di bawah memberi peringatan.
    // Mengganti PIN: di komputer Anda sendiri (jangan di chat/AI), buka Console browser di halaman aplikasi,
    // jalankan CryptoJS.SHA256("PIN_BARU").toString(), lalu tempel hasilnya menggantikan nilai konstanta.
    const ADMIN_PIN_HASH = 'a9a634b2a16124e4cfc3d9b1ad4f772e865cbfed2eaf2025752cd0e3df15e37b';
    const KEPSEK_PIN_HASH = '4d9749d1e2616cbce46c84ac26cdc6cf8180e6e1678e4160008a8cd2fffd6d7a';
    // Pengingat Console saja (tidak mengubah perilaku apa pun) bila kedua hash sama persis.
    if (ADMIN_PIN_HASH === KEPSEK_PIN_HASH) {
      console.warn('[SI MAMBA] PERINGATAN: ADMIN_PIN_HASH dan KEPSEK_PIN_HASH masih sama persis. Kalau ini bukan disengaja, ganti salah satunya: jalankan CryptoJS.SHA256("PIN_BARU_ANDA").toString() di Console lalu tempel hasilnya menggantikan salah satu konstanta di atas.');
    }
    const DEFAULT_JAM = { 1: { mulai: '07:30', selesai: '08:15', label: 'Reguler', isEkstra: false }, 2: { mulai: '08:20', selesai: '09:05', label: 'Reguler', isEkstra: false }, 3: { mulai: '09:10', selesai: '09:55', label: 'Reguler', isEkstra: false }, 4: { mulai: '10:00', selesai: '10:45', label: 'Ekstrakurikuler', isEkstra: true } };

    let currentUser = null;
    // Tahun Ajaran & Semester Aktif sekarang terpusat di Firebase (school_settings),
    // diatur cuma oleh Admin lewat menu Profil Sekolah — bukan localStorage per-browser lagi,
    // supaya semua user (guru/kepsek) selalu melihat data tahun ajaran yang sama.
    // Default dipakai SEMENTARA saat boot (tidak menunggu school_settings) -- lihat pakaiPengaturanTerakhir()
    // & listener school_settings di watchSchoolSettings(): begitu nilai asli dari Firebase datang, nilai ini
    // diganti & data dimuat ulang kalau ternyata berbeda.
    let currentTahunAjaran = '2026/2027';
    let currentSemesterAktif = 'Ganjil';
    // Collator tunggal (di-cache) untuk semua pengurutan teks -- menggantikan String.localeCompare() yang
    // membuat Collator baru di setiap pemanggilan (mahal di dalam comparator sort()).
    const COLLATOR_ID = new Intl.Collator('id');
    let allGuru = [], allSiswa = [], allAttendance = [], allGrades = [], allJournals = [], allTeacherAttendance = [], allTeacherAttendanceToday = [], allEarlyLeaveRequests = [], allEvents = [], allEventAttendance = [], ekskulRates = {}, allUjian = [], allUjianAttendance = [], allInfaqSiswa = [], allKasUmum = [], allInfaqPetugas = {}, allEkskulPicHonor = [], allKedisiplinan = [], allKedisiplinanKategori = { pelanggaran: [], prestasi: [] }, allBukuPenghubung = [], allMateri = [], allTugas = [], allTugasSubmission = [], allKalenderAkademik = [], allSaranKritik = [];
    let allReligiAttendance = [], allPengumuman = [], allLogs = [], allSurat = [], allJadwal = [];
    let attendanceDraft = {};
    let attFastMode = true;   // Absensi harian: DEFAULT Mode Cepat (ketuk nama ganti status H->A->S->I); false = Mode Tabel (tombol H/S/I/A per siswa)
    let jamSettings = {};
    let cameraStream = null;
    let editingGuruKey = null, editingSiswaKey = null, editingJadwalKey = null;
    let dataLoaded = false;
    let lastFullLoadAt = 0;   // kapan Fase 2 loadAllData() terakhir selesai (dipakai menahan muat ulang berulang saat sinyal naik-turun)
    const MUAT_ULANG_MIN_MS = 10 * 60 * 1000;
    let siswaPage = 1, journalPage = 1, rekapPage = 1, religiPage = 1, honorPage = 1, suratPage = 1, jadwalPage = 1, logFullPage = 1;
    let journalFilterMode = 'mine'; // Filter Riwayat Jurnal (khusus guru/wali kelas): 'mine' | 'all'
    let allLogsFull = [];
    const PAGE_SIZE = 10;
    let backupInterval = null;
    let selectedAttendanceClass = '';
    let editingJournalKey = null;
    let alphaAutoCheckedThisSession = false;
    // FIX: alphaAutoCheckedThisSession baru di-set true SETELAH autoMarkAlphaGuru() selesai
    // (sengaja, supaya retry otomatis kalau gagal -- lihat komentar di renderFullUI()). Ini
    // menyisakan celah: loadAllData() punya beberapa titik pemanggilan tanpa saling menunggu
    // (reconnect handler, tombol Refresh manual, dll) -- kalau dua di antaranya tumpang tindih,
    // renderFullUI() bisa terpanggil 2x sebelum panggilan pertama autoMarkAlphaGuru() selesai,
    // dan keduanya lolos guard "!alphaAutoCheckedThisSession" lalu jalan bersamaan. Flag ini
    // menandai "sedang berjalan" secara terpisah dari "sudah pernah sukses", supaya panggilan
    // kedua ditolak sejak awal, bukan cuma dicegah lewat urutan waktu penyelesaian.
    let alphaAutoCheckRunning = false;
    // Retry berjeda utk autoMarkAlphaGuru kalau gagal (dulu retry baru terjadi pada renderFullUI berikutnya,
    // yang bisa lama/tak pernah datang): 30 dtk, 2 mnt, 10 mnt, lalu menyerah + memberi tahu Admin.
    let alphaRetryCount = 0, alphaRetryTimer = null;
    const ALPHA_RETRY_DELAYS_MS = [30000, 120000, 600000];
    let pendingSusulanData = null;
    let isVerifying = false;
    // ============================================================
    // ANTI DOUBLE-SUBMIT (cegah data dobel ke Firebase saat jaringan lambat)
    // Pakai: di awal fungsi simpan -> if (isBusy('kunciUnik')) return toast('...',false,1500);
    // lalu setBusy('kunciUnik', tombolElement) sebelum kirim ke Firebase,
    // dan clearBusy('kunciUnik', tombolElement) di callback/then/selesai (baik sukses maupun gagal).
    // ============================================================
    const _busyLocks = {};
    // Admin wajib membawa sesi_admin (kredAdminSiap) sebelum menulis ke siswa/guru (Rules v2).
    function tulisAdmin(key, btn, fn, onFail) {
      const siap = (typeof window.kredAdminSiap === 'function') ? window.kredAdminSiap() : Promise.resolve(true);
      return siap.then(() => { fn(); }, (e) => {
        if (key) clearBusy(key, btn);
        if (onFail) onFail();
        toast('🔒 ' + ((e && e.message) || 'Sesi admin gagal'), true);
      });
    }
    // PATCH v8.97: tulis ke node yang di Rules dikunci 'hanya sesi Admin' (school_settings, school_assets, honor_rates_v4).
    // Memastikan sesi_admin/{uid} terisi dulu (kredAdminSiap); kalau gagal, callback menerima galat yang jelas (bukan PERMISSION_DENIED samar).
    // path kosong = update multi-path dari root.
    function tulisSettingsAdmin(path, data, cb) {
      adminSesi().then(() => (path ? db.ref(path) : db.ref()).update(data, cb), (e) => {
        if (typeof cb === 'function') cb({ message: '🔒 ' + ((e && e.message) || 'Sesi admin gagal') });
      });
    }
    // Rules teacher_attendance mengikat catatan guru ke sesi_guru/{uid}: pastikan bukti sesi guru terisi dulu. Tidak pernah menolak:
    // bila gagal, penulisan tetap dicoba (server yang memutuskan) supaya alur absen tidak macet karena modul kredensial.
    // Sama untuk Admin: tulis ke teacher_attendance (alpha otomatis, koreksi, migrasi, Kelola Absen Guru) butuh sesi_admin terisi. Tidak pernah menolak.
    // Batas tunggu 8 dtk: sinyal setengah putus tidak boleh menggantung aksi Admin; setelah batas, penulisan tetap dicoba (server yang memutuskan).
    // Mode diam (proses latar belakang, mis. Alpha otomatis): TIDAK memunculkan prompt Kunci Admin. Sesi hanya diperbarui bila Kunci masih tersimpan di
    // perangkat (kredensial.js menyimpannya 12 jam); bila tidak, penulisan tetap dicoba memakai sesi_admin yang masih ada di server dan, bila ditolak,
    // dicoba ulang oleh mekanisme percobaan ulang Alpha (checkpoint tidak maju).
    function adminKunciTersimpan() { try { if (sessionStorage.getItem('sim_kunci_admin')) return true; const o = JSON.parse(localStorage.getItem('sim_kunci_admin') || 'null'); return !!(o && o.k && o.exp > Date.now()); } catch (e) { return false; } }
    function adminSesiSiap(diam) { try { if (diam && !adminKunciTersimpan()) return Promise.resolve(true); return Promise.race([Promise.resolve((typeof window.kredAdminSiap === 'function') ? window.kredAdminSiap() : true).catch(() => true), new Promise(r => setTimeout(r, 8000))]); } catch (e) { return Promise.resolve(true); } }
    function guruSesiSiap() { try { return Promise.race([Promise.resolve((typeof window.kredGuruSiap === 'function') ? window.kredGuruSiap() : true).catch(() => true), new Promise(r => setTimeout(r, 8000))]); } catch (e) { return Promise.resolve(true); } }
    function isBusy(key) { return !!_busyLocks[key]; }
    function setBusy(key, btn) {
      _busyLocks[key] = true;
      if (btn) { btn.disabled = true; if (!btn.dataset.origText) btn.dataset.origText = btn.textContent; btn.style.opacity = '0.6'; }
    }
    function clearBusy(key, btn) {
      _busyLocks[key] = false;
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; if (btn.dataset.origText) { btn.textContent = btn.dataset.origText; delete btn.dataset.origText; } }
    }
    // Kunci tombol Simpan di jendela pop up (anti ketuk ganda). Mengembalikan fungsi `lepas` (aman dipanggil berkali-kali):
    // panggil di SEMUA jalan keluar (sukses, gagal, galat). Cadangan: bila server belum menjawab dalam 20 dtk (sinyal lemah),
    // tombol dilepas otomatis supaya tidak macet; pesan meminta Admin mengecek data dulu sebelum menyimpan ulang.
    function kunciSimpanModal(key, modalId, namaFungsi) {
      const btn = document.querySelector('#' + modalId + ' [onclick^="' + namaFungsi + '("]');
      setBusy(key, btn);
      if (btn) btn.textContent = '⏳ Menyimpan...';
      let selesai = false;
      const t = setTimeout(() => {
        if (selesai) return; selesai = true; clearBusy(key, btn);
        toast('⚠️ Server belum menjawab. Periksa sinyal, lalu cek dulu apakah data sudah tersimpan sebelum menyimpan ulang.', true, 7000);
      }, 20000);
      return function lepas() { if (selesai) return; selesai = true; clearTimeout(t); clearBusy(key, btn); };
    }
    // ============================================================
    // TANGGAL LOKAL (WIB), BUKAN UTC
    // Bug lama: banyak tempat pakai `tglLokal()` untuk
    // dapat "tanggal hari ini". toISOString() SELALU mengonversi ke UTC dulu, padahal
    // WIB = UTC+7 -- artinya dari jam 00:00 s/d 06:59 WIB, toISOString() masih
    // menunjukkan tanggal KEMARIN (versi UTC). Akibatnya key absen dsb (yang dibentuk
    // dari tanggal ini) bentrok dengan record hari sebelumnya, sehingga aksi APAPUN
    // yang bikin/cek "tanggal hari ini" sebelum jam 07:00 pagi WIB bisa salah/tertolak
    // (mis. Absen QR Guru dianggap "sudah absen" padahal belum). tglLokal()/bulanLokal()
    // menggantikan SEMUA pemakaian toISOString().slice(0,10 atau 0,7) di file ini.
    // ============================================================
    // Semua tanggal/jam absen dihitung dalam WIB (Asia/Jakarta), BUKAN zona waktu HP. HP yang zona waktunya salah
    // (mis. UTC / "waktu otomatis" mati) sebelumnya mendapat tanggal KEMARIN antara 00:00-07:00 WIB, sehingga absen
    // Datang dianggap "sudah absen" dan guru tidak bisa absen sebelum jam 7 pagi.
    let _wibFmt = null;
    try { _wibFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }); } catch (e) { _wibFmt = null; }
    function wibParts(d) {
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) { const q = d.split('-'); return { year: q[0], month: q[1], day: q[2], hour: '00', minute: '00', weekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(+q[0], +q[1] - 1, +q[2]).getDay()] }; }
      d = (d instanceof Date) ? d : (d === undefined || d === null ? new Date() : new Date(d));
      if (isNaN(d.getTime())) return { year: 'NaN', month: 'NaN', day: 'NaN', hour: 'NaN', minute: 'NaN', weekday: 'NaN' }; // sama seperti perilaku lama: tidak melempar error
      if (_wibFmt) {
        const p = {}; _wibFmt.formatToParts(d).forEach(x => { p[x.type] = x.value; });
        if (p.hour === '24') p.hour = '00';
        return p;
      }
      const w = new Date(d.getTime() + 7 * 3600000 + d.getTimezoneOffset() * 60000); // cadangan: geser manual ke WIB
      const z = n => String(n).padStart(2, '0');
      return { year: String(w.getFullYear()), month: z(w.getMonth() + 1), day: z(w.getDate()), hour: z(w.getHours()), minute: z(w.getMinutes()), weekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][w.getDay()] };
    }
    function tglLokal(d) { const p = wibParts(d); return `${p.year}-${p.month}-${p.day}`; }
    function bulanLokal(d) { const p = wibParts(d); return `${p.year}-${p.month}`; }
    function menitWIB(d) { const p = wibParts(d); return parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10); }
    function hariWIB(d) { return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wibParts(d).weekday]; }
    // Field `waktu` di teacher_attendance/event_attendance/ujian_attendance bercampur dua format:
    // angka epoch-ms (ServerValue.TIMESTAMP, dari absen QR & lapor Izin/Sakit) dan string ISO
    // (semua jalur lain: koreksi admin, Alpha otomatis, data lama). new Date(x) menerima keduanya,
    // tapi (x||'').localeCompare() error kalau x angka. waktuMs() menyeragamkan jadi epoch-ms
    // supaya aman dipakai untuk sort/selisih. Nilai kosong/tidak valid -> 0.
    function waktuMs(v) {
      if (v === null || v === undefined || v === '') return 0;
      if (typeof v === 'number') return v;
      const t = new Date(v).getTime();
      return isNaN(t) ? 0 : t;
    }
    // ===== MIGRASI SEKALI JALAN: teacher_attendance/*/waktu -> epoch-ms (angka) =====
    // Bentuk baku `waktu` di teacher_attendance sekarang ANGKA epoch-ms (absen QR & lapor Izin/Sakit lewat
    // ServerValue.TIMESTAMP; koreksi Admin & Alpha otomatis juga menulis angka). Catatan lama yang masih
    // string ISO diubah lewat fungsi ini. Dipanggil dari console browser oleh Admin:
    //   migrasiWaktuAbsenGuru()                   -> DRY-RUN: hanya melaporkan, tidak mengubah apa pun
    //   migrasiWaktuAbsenGuru({ terapkan: true }) -> menerapkan (minta konfirmasi + mengunduh berkas cadangan)
    // Aman diulang (idempotent). URUTAN: pasang versi app.js terbaru di SEMUA perangkat dulu (bump versi
    // service worker/cache), baru jalankan migrasi -- versi lama memakai (waktu||'').localeCompare() yang
    // error kalau waktu berupa angka.
    async function migrasiWaktuAbsenGuru(opts) {
      opts = opts || {};
      if (!isAdmin()) { toast('Hanya Admin!', true); return null; }
      if (!navigator.onLine) { toast('📡 Butuh koneksi internet untuk migrasi.', true); return null; }
      const terapkan = opts.terapkan === true;
      const snap = await db.ref('teacher_attendance').once('value');
      const rencana = {}, cadangan = {}, rusak = [];
      let total = 0, sudahAngka = 0, tanpaWaktu = 0;
      snap.forEach(child => { // callback tidak boleh me-return nilai truthy
        total++;
        const w = (child.val() || {}).waktu;
        if (typeof w === 'number') { sudahAngka++; }
        else if (typeof w === 'string' && w.trim() !== '') {
          const t = new Date(w).getTime();
          if (isNaN(t)) rusak.push(child.key);
          else { rencana[child.key + '/waktu'] = t; cadangan[child.key] = w; }
        } else { tanpaWaktu++; }
      });
      const paths = Object.keys(rencana);
      const ringkasan = { total, sudahAngka, akanDiubah: paths.length, tanpaWaktu, tidakTerbaca: rusak, terapkan, diubah: 0 };
      console.info('[SI MAMBA] Migrasi waktu absen guru:', ringkasan);
      if (!terapkan) { toast(`ℹ️ Dry-run: ${paths.length} dari ${total} catatan perlu diubah ke angka (${rusak.length} tidak terbaca). Jalankan migrasiWaktuAbsenGuru({terapkan:true}) untuk menerapkan.`, false, 6000); return ringkasan; }
      if (paths.length === 0) { toast('✅ Tidak ada yang perlu dimigrasi.'); return ringkasan; }
      if (!confirm(`Ubah field waktu pada ${paths.length} catatan absensi guru menjadi angka epoch-ms?\n\nPastikan SEMUA perangkat sudah memakai versi aplikasi terbaru. Berkas cadangan (nilai lama) akan diunduh dulu.`)) return ringkasan;
      try { // cadangan: {key: waktuLama} -- bisa dipulihkan manual dari berkas ini bila perlu
        const blob = new Blob([JSON.stringify(cadangan, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cadangan_waktu_absen_guru_${tglLokal()}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } catch (e) { // tanpa cadangan -> JANGAN lanjut menulis
        console.warn('[SI MAMBA] Gagal mengunduh cadangan:', e);
        toast('❌ Cadangan gagal diunduh, migrasi dibatalkan (tidak ada data yang diubah).', true, 6000);
        return ringkasan;
      }
      try {
        for (let i = 0; i < paths.length; i += 200) { // 200 path/update: tiap potongan atomik, seluruhnya idempotent
          const potongan = {}; paths.slice(i, i + 200).forEach(pp => { potongan[pp] = rencana[pp]; });
          await adminSesiSiap();
          await db.ref('teacher_attendance').update(potongan);
          ringkasan.diubah += Object.keys(potongan).length;
        }
      } catch (err) {
        console.error('[SI MAMBA] Migrasi waktu terhenti:', err);
        toast(`❌ Migrasi terhenti setelah ${ringkasan.diubah} catatan: ${err && err.message || err}. Aman dijalankan ulang.`, true, 7000);
        return ringkasan;
      }
      addLog('migrasi_waktu_absen_guru', `${ringkasan.diubah} catatan`);
      toast(`✅ Migrasi selesai: ${ringkasan.diubah} catatan diubah ke angka.`);
      reloadDataset('teacherAttendance');
      return ringkasan;
    }
    // ===== MIGRASI SEKALI JALAN: isi field tahunAjaran pada DATA LAMA =====
    // Data lama (dibuat sebelum field tahunAjaran ada) tidak pernah ikut query loader (orderByChild('tahunAjaran')
    // .equalTo(...)), jadi tidak muncul di Rekap Nilai/Raport staf -- tapi muncul di Portal Ortu lewat fallback
    // sesuaiTahunAjaranTermasukDataLama(). Fungsi ini MENAMBAH field tahunAjaran ke record lama (hasil hitung dari
    // tanggalnya, aturan sama dgn tahunAjaranDariTanggal(): Jul-Des = tahun itu, Jan-Jun = tahun sebelumnya) supaya
    // semua jalur memberi hasil yang sama. Dipanggil dari console browser oleh Admin:
    //   migrasiTahunAjaranDataLama()                                  -> DRY-RUN: hanya melaporkan, tidak mengubah apa pun
    //   migrasiTahunAjaranDataLama({ terapkan: true })                -> menerapkan (konfirmasi + unduh berkas pembatalan)
    //   opsi: koleksi: ['attendance', ...] (batasi koleksi) | tahunAjaranDefault: '2024/2025' (untuk record TANPA tanggal)
    //   batalkanMigrasiTahunAjaran(<isi berkas cadangan>)             -> menghapus field yang ditambahkan migrasi
    // Aman diulang (idempotent): record yang SUDAH punya tahunAjaran tidak pernah disentuh. Hanya MENAMBAH field.
    // Ketepatan: tanggal asli (tanggal/minggu) = "kuat"; turunan dari waktu simpan/ubah = "perkiraan" (mis. nilai
    // yang diedit ulang di tahun ajaran berikutnya bisa meleset) -- periksa angka 'perkiraan' di hasil dry-run.
    const MIGRASI_TA_KOLEKSI = ['attendance', 'grades', 'journal', 'teacher_attendance', 'early_leave_requests', 'events',
      'event_attendance', 'ujian', 'ujian_attendance', 'ekskul_pic_honor_v4', 'iuran_siswa', 'kedisiplinan_siswa',
      'buku_penghubung', 'tugas', 'tugas_submission', 'materi_belajar', 'religi_attendance', 'kas_umum',
      'activity_attendance_v4', 'extracurricular_attendance_v4'];
    function _migTglString(v) {
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'number') return v > 1e11 ? tglLokal(new Date(v)) : null; // epoch-ms
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const t = new Date(s).getTime();
      return isNaN(t) ? null : tglLokal(new Date(t)); // ISO/timestamp -> tanggal LOKAL (WIB)
    }
    function _migTaPantas(ta) {
      const y = parseInt(ta, 10);
      return /^\d{4}\/\d{4}$/.test(ta) && y >= 2000 && y <= new Date().getFullYear() + 1 && parseInt(ta.slice(5), 10) === y + 1;
    }
    // Balikan { ta, kuat } atau null kalau tidak ada tanggal yang bisa dipakai.
    function _migHitungTa(path, x, key, taTugas) {
      if (path === 'iuran_siswa') { // kunci "YYYY-Www_siswaKey": pakai Kamis minggu itu (patokan ISO, sama dgn isoMingguKey)
        const mk = x.minggu || ((/^(\d{4}-W\d{2})_/.exec(key) || [])[1]);
        if (mk) {
          try {
            const d = mingguKeTanggal(mk).senin; d.setDate(d.getDate() + 3);
            const ta = tahunAjaranDariTanggal(tglLokal(d));
            if (ta) return { ta, kuat: true };
          } catch (e) { /* lanjut ke fallback umum */ }
        }
      }
      for (const f of ['tanggal', 'tanggalKirim']) {
        const tgl = _migTglString(x[f]);
        const ta = tgl && tahunAjaranDariTanggal(tgl);
        if (ta) return { ta, kuat: true };
      }
      if (path === 'tugas_submission' && x.tugasKey && taTugas && taTugas[x.tugasKey]) return { ta: taTugas[x.tugasKey], kuat: true }; // ikut tugas induknya
      for (const f of ['waktuKirim', 'submittedAt', 'dibuat', 'createdAt', 'requestedAt', 'waktu', 'updatedAt']) {
        const tgl = _migTglString(x[f]);
        let ta = tgl && tahunAjaranDariTanggal(tgl);
        if (!ta) continue;
        // Nilai Semester Genap yang disimpan/diubah Jul-Des (susulan) sebenarnya milik tahun ajaran sebelumnya.
        if (path === 'grades' && x.semester === 'Genap' && parseInt(tgl.slice(5, 7), 10) >= 7) { const y = parseInt(tgl.slice(0, 4), 10); ta = `${y - 1}/${y}`; }
        return { ta, kuat: false };
      }
      return null;
    }
    async function migrasiTahunAjaranDataLama(opts) {
      opts = opts || {};
      if (!isAdmin()) { toast('Hanya Admin!', true); return null; }
      if (!navigator.onLine) { toast('📡 Butuh koneksi internet untuk migrasi.', true); return null; }
      const terapkan = opts.terapkan === true;
      const daftar = (Array.isArray(opts.koleksi) && opts.koleksi.length ? opts.koleksi : MIGRASI_TA_KOLEKSI).filter(p => MIGRASI_TA_KOLEKSI.includes(p));
      let taDefault = null;
      if (opts.tahunAjaranDefault) {
        if (!_migTaPantas(String(opts.tahunAjaranDefault))) { toast('❌ tahunAjaranDefault harus berformat "2024/2025".', true); return null; }
        taDefault = String(opts.tahunAjaranDefault);
      }
      const rencana = {};            // path koleksi -> { 'key/tahunAjaran': 'YYYY/YYYY' }
      const cadangan = {};           // 'path/key/tahunAjaran' -> nilai (untuk pembatalan)
      const ringkasan = { terapkan, koleksi: {}, akanDiisi: 0, perkiraan: 0, tanpaTanggal: 0, distribusi: {}, diubah: 0 };
      const taTugas = {};
      // 'tugas' harus diproses lebih dulu karena tugas_submission ikut tahun ajaran tugas induknya
      const urut = daftar.slice().sort((a, b) => (a === 'tugas' ? -1 : 0) - (b === 'tugas' ? -1 : 0));
      for (const path of urut) {
        const snap = await db.ref(path).once('value');
        const r = { total: 0, sudahAda: 0, akanDiisi: 0, perkiraan: 0, tanpaTanggal: 0, contohTanpaTanggal: [] };
        rencana[path] = {};
        snap.forEach(child => { // callback tidak boleh me-return nilai truthy
          const x = child.val() || {}, key = child.key;
          r.total++;
          if (x.tahunAjaran) { r.sudahAda++; if (path === 'tugas') taTugas[key] = x.tahunAjaran; return; }
          let h = _migHitungTa(path, x, key, taTugas);
          if (h && !_migTaPantas(h.ta)) h = null; // tanggal ngawai (mis. tahun 1970/2099) -> perlakukan sebagai tanpa tanggal
          if (!h && taDefault) h = { ta: taDefault, kuat: false };
          if (!h) { r.tanpaTanggal++; if (r.contohTanpaTanggal.length < 5) r.contohTanpaTanggal.push(key); return; }
          rencana[path][key + '/tahunAjaran'] = h.ta;
          cadangan[path + '/' + key + '/tahunAjaran'] = h.ta;
          r.akanDiisi++; if (!h.kuat) r.perkiraan++;
          ringkasan.distribusi[h.ta] = (ringkasan.distribusi[h.ta] || 0) + 1;
          if (path === 'tugas') taTugas[key] = h.ta;
        });
        ringkasan.koleksi[path] = r;
        ringkasan.akanDiisi += r.akanDiisi; ringkasan.perkiraan += r.perkiraan; ringkasan.tanpaTanggal += r.tanpaTanggal;
      }
      console.info('[SI MAMBA] Migrasi tahunAjaran data lama:', ringkasan);
      if (typeof console.table === 'function') console.table(ringkasan.koleksi);
      if (!terapkan) {
        toast(`ℹ️ Dry-run: ${ringkasan.akanDiisi} record akan diberi tahunAjaran (${ringkasan.perkiraan} perkiraan), ${ringkasan.tanpaTanggal} tanpa tanggal & dilewati. Lihat console, lalu jalankan migrasiTahunAjaranDataLama({terapkan:true}).`, false, 9000);
        return ringkasan;
      }
      if (ringkasan.akanDiisi === 0) { toast('✅ Tidak ada yang perlu dimigrasi.'); return ringkasan; }
      const sebaran = Object.entries(ringkasan.distribusi).sort().map(([k, v]) => `${k}: ${v}`).join('\n');
      if (!confirm(`Tambahkan field tahunAjaran ke ${ringkasan.akanDiisi} record lama?\n\n${sebaran}\n\n(${ringkasan.perkiraan} di antaranya perkiraan dari waktu simpan; ${ringkasan.tanpaTanggal} record tanpa tanggal dilewati.)\n\nSangat disarankan Backup Manual dulu. Berkas pembatalan akan diunduh.`)) return ringkasan;
      try { // berkas pembatalan: {path: tahunAjaran} -- batalkanMigrasiTahunAjaran() menghapus persis path ini
        const blob = new Blob([JSON.stringify(cadangan, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `cadangan_migrasi_tahun_ajaran_${tglLokal()}.json`;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      } catch (e) { // tanpa berkas pembatalan -> JANGAN lanjut menulis
        console.warn('[SI MAMBA] Gagal mengunduh berkas pembatalan:', e);
        toast('❌ Berkas pembatalan gagal diunduh, migrasi dibatalkan (tidak ada data yang diubah).', true, 6000);
        return ringkasan;
      }
      try {
        for (const path of urut) {
          const paths = Object.keys(rencana[path]);
          for (let i = 0; i < paths.length; i += 200) { // tiap potongan atomik & idempotent; update di bawah node koleksi (bukan root)
            const potongan = {}; paths.slice(i, i + 200).forEach(pp => { potongan[pp] = rencana[path][pp]; });
            await db.ref(path).update(potongan);
            ringkasan.diubah += Object.keys(potongan).length;
          }
        }
      } catch (err) {
        console.error('[SI MAMBA] Migrasi tahunAjaran terhenti:', err);
        toast(`❌ Migrasi terhenti setelah ${ringkasan.diubah} record: ${err && err.message || err}. Aman dijalankan ulang.`, true, 8000);
        return ringkasan;
      }
      addLog('migrasi_tahun_ajaran', `${ringkasan.diubah} record`);
      toast(`✅ Migrasi selesai: ${ringkasan.diubah} record diberi tahunAjaran. Memuat ulang data...`, false, 5000);
      loadAllData(null, function () { if (typeof v4LoadCore === 'function') v4LoadCore(); });
      return ringkasan;
    }
    async function batalkanMigrasiTahunAjaran(cadangan) {
      if (!isAdmin()) { toast('Hanya Admin!', true); return null; }
      if (!cadangan || typeof cadangan !== 'object') { toast('❌ Berikan isi berkas cadangan_migrasi_tahun_ajaran_*.json.', true); return null; }
      const per = {};
      for (const p of Object.keys(cadangan)) {
        const m = /^([a-z_0-9]+)\/([^/]+)\/tahunAjaran$/.exec(p);
        if (!m || !MIGRASI_TA_KOLEKSI.includes(m[1])) continue; // hanya path yang memang bisa dibuat migrasi
        (per[m[1]] = per[m[1]] || {})[m[2] + '/tahunAjaran'] = null;
      }
      const total = Object.values(per).reduce((s, o) => s + Object.keys(o).length, 0);
      if (total === 0) { toast('Tidak ada path valid di berkas tersebut.', true); return null; }
      if (!confirm(`Hapus field tahunAjaran dari ${total} record (membatalkan migrasi)?`)) return null;
      let diubah = 0;
      try {
        for (const [path, obj] of Object.entries(per)) {
          const ks = Object.keys(obj);
          for (let i = 0; i < ks.length; i += 200) { const pt = {}; ks.slice(i, i + 200).forEach(k => { pt[k] = null; }); await db.ref(path).update(pt); diubah += Object.keys(pt).length; }
        }
      } catch (err) { toast(`❌ Pembatalan terhenti: ${err && err.message || err}`, true, 7000); return { diubah }; }
      addLog('batal_migrasi_tahun_ajaran', `${diubah} record`);
      toast(`✅ ${diubah} record dikembalikan. Memuat ulang data...`);
      loadAllData(null, function () { if (typeof v4LoadCore === 'function') v4LoadCore(); });
      return { diubah };
    }
    // Kunci MINGGU (dipakai fitur Iuran, sejak Infaq diubah dari bulanan jadi mingguan) --
    // format ISO week "YYYY-Www" (sama dengan value <option> di #infaqRekapMinggu, lihat
    // populateMingguSelect()), jadi tidak perlu konversi apa pun antara value pilihan & key Firebase.
    function isoMingguKey(d) {
      d = d || new Date();
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayNum = (date.getDay() + 6) % 7; // Senin=0 ... Minggu=6
      date.setDate(date.getDate() - dayNum + 3); // geser ke Kamis minggu ini (patokan standar ISO)
      const firstThursday = new Date(date.getFullYear(), 0, 4);
      const firstDayNum = (firstThursday.getDay() + 6) % 7;
      firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
      const weekNum = 1 + Math.round((date - firstThursday) / (7 * 24 * 60 * 60 * 1000));
      return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }
    // Kebalikan isoMingguKey(): dari "YYYY-Www" -> {senin, minggu} (Date awal & akhir minggu itu).
    function mingguKeTanggal(mingguKey) {
      const [yStr, wStr] = mingguKey.split('-W');
      const y = parseInt(yStr, 10), w = parseInt(wStr, 10);
      const jan4 = new Date(y, 0, 4);
      const jan4Day = (jan4.getDay() + 6) % 7;
      const seninMinggu1 = new Date(y, 0, 4 - jan4Day);
      const senin = new Date(seninMinggu1); senin.setDate(seninMinggu1.getDate() + (w - 1) * 7);
      const minggu = new Date(senin); minggu.setDate(senin.getDate() + 6);
      return { senin, minggu };
    }
    function mingguLabel(mingguKey) {
      if (!mingguKey) return '-';
      const { senin, minggu } = mingguKeTanggal(mingguKey);
      const nb = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
      const fmt = (d, tahun) => `${d.getDate()} ${nb[d.getMonth()]}${tahun ? ' ' + d.getFullYear() : ''}`;
      const tahunSama = senin.getFullYear() === minggu.getFullYear() && senin.getMonth() === minggu.getMonth();
      return tahunSama ? `${senin.getDate()} - ${fmt(minggu, true)}` : `${fmt(senin, senin.getFullYear() !== minggu.getFullYear())} - ${fmt(minggu, true)}`;
    }
    // Isi <select id="infaqRekapMinggu"> dengan daftar minggu ISO sepanjang tahun ajaran aktif
    // (sampai 2 minggu ke depan). Menggantikan <input type="week"> yang TIDAK didukung Safari/iOS.
    // Nilai option = "YYYY-Www" (sama persis dengan isoMingguKey()), terbaru di paling atas.
    function populateMingguSelect() {
      const sel = document.getElementById('infaqRekapMinggu');
      if (!sel || sel.tagName !== 'SELECT') return;
      const prev = sel.value;
      const thn = parseInt(String(currentTahunAjaran).split('/')[0], 10) || new Date().getFullYear();
      const awal = new Date(thn, 6, 1), batasAkhir = new Date(thn + 1, 5, 30);
      const sekarang = new Date();
      let akhir = new Date(sekarang); akhir.setDate(akhir.getDate() + 14);
      if (akhir > batasAkhir) akhir = batasAkhir;
      if (akhir < awal) akhir = awal;
      const keys = [];
      const d = new Date(awal); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // mundur ke hari Senin
      while (d <= akhir) { const k = isoMingguKey(d); if (keys.indexOf(k) < 0) keys.push(k); d.setDate(d.getDate() + 7); }
      const kini = isoMingguKey(sekarang);
      if (keys.indexOf(kini) < 0) keys.push(kini);
      if (prev && keys.indexOf(prev) < 0) keys.push(prev);
      keys.sort().reverse();                                                        // "YYYY-Www" urut leksikografis = kronologis
      sel.innerHTML = keys.map(k => `<option value="${k}">${escapeHtml(mingguLabel(k))}${k === kini ? ' (minggu ini)' : ''}</option>`).join('');
      sel.value = (prev && keys.indexOf(prev) >= 0) ? prev : kini;
    }
    let darkMode = false;
    let siswaChartInstance = null, guruChartInstance = null;
    let deferredPrompt = null;
    let rekapNilaiDataCache = {};
    let selectedSiswaSurat = null;
    let jadwalView = 'harian';
    // Batas mewakili per hari -- cuma berlaku kalau guru izin/sakit/alfa hari itu MASIH kurang dari 2
    // orang (lihat VALIDASI C di saveJournal()). Kalau guru izin/sakit/alfa hari itu sudah 2 orang
    // atau lebih, batas ini dilewati total (mewakili sebanyak apapun diizinkan).
    const MAX_MEWAKILI_PER_HARI = 2;

    // ============================================================
    // NOTIFIKASI REMINDER
    // ============================================================
    let notificationInterval = null;
    let notificationTimeout = null;
    let lastNotificationTime = 0;
    const NOTIFICATION_COOLDOWN = 5 * 60 * 1000;

    function showNotification(title, message, type = 'info') {
      const popup = document.getElementById('notificationPopup');
      const titleEl = document.getElementById('notifTitle');
      const bodyEl = document.getElementById('notifBody');
      const timeEl = document.getElementById('notifTime');

      const now = Date.now();
      if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) return;
      lastNotificationTime = now;

      titleEl.textContent = title;
      bodyEl.textContent = message;
      timeEl.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      popup.className = 'notification-popup ' + type;
      if (type === 'penting') {
        popup.style.borderLeftColor = '#dc2626';
      } else if (type === 'peringatan') {
        popup.style.borderLeftColor = '#d97706';
      } else {
        popup.style.borderLeftColor = '#2563eb';
      }

      popup.classList.add('show');
      clearTimeout(notificationTimeout);
      notificationTimeout = setTimeout(() => {
        popup.classList.remove('show');
      }, 8000);

      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqF');
        audio.play().catch(() => {});
      } catch(e) {}
    }

    function closeNotification() {
      document.getElementById('notificationPopup').classList.remove('show');
      clearTimeout(notificationTimeout);
    }

    function checkReminders() {
      if (!currentUser) return;
      if (isAdmin() || isKepsek()) return;

      const today = tglLokal();
      const now = new Date();
      const sekarangMenit = menitWIB(now);
      const jamSekarang = Math.floor(sekarangMenit / 60), menitSekarang = sekarangMenit % 60;

      const jamPertama = jamSettings[1] || { mulai: '07:30', selesai: '08:15' };
      const mulai = jamPertama.mulai.split(':');
      const selesai = jamPertama.selesai.split(':');
      const mulaiMenit = parseInt(mulai[0]) * 60 + parseInt(mulai[1]);
      const selesaiMenit = parseInt(selesai[0]) * 60 + parseInt(selesai[1]);

      const isJamPertama = sekarangMenit >= mulaiMenit && sekarangMenit <= selesaiMenit;

      const windowDatang = getJamAbsenWindow('Datang');
      const mulaiDatang = windowDatang.mulai.split(':'), selesaiDatang = windowDatang.selesai.split(':');
      const mulaiDatangMenit = parseInt(mulaiDatang[0]) * 60 + parseInt(mulaiDatang[1]), selesaiDatangMenit = parseInt(selesaiDatang[0]) * 60 + parseInt(selesaiDatang[1]);
      const isDalamJendelaDatang = sekarangMenit >= mulaiDatangMenit && sekarangMenit <= selesaiDatangMenit;

      // Scope SAMA dengan loader data & cek izin tulis (kelas ajar UNION kelas wali) -- jangan pakai currentUser.kelas
      // mentah: wali yang kelas walinya tidak ada di daftar kelas ajarnya tidak akan pernah diingatkan, padahal
      // datanya dimuat & ia boleh mengisinya. loaderScopeKelas() juga aman kalau currentUser.kelas undefined.
      const kelasScope = loaderScopeKelas();
      const absensiHariIni = allAttendance.filter(a => a.tanggal === today && kelasScope.includes(a.kelas));
      const kelasBelumAbsen = kelasScope.filter(k => !absensiHariIni.some(a => a.kelas === k));

      const jurnalHariIni = getJurnalSayaHariIni(today);
      const kelasBelumJurnal = kelasScope.filter(k => !jurnalHariIni.some(j => j.kelas === k));

      const absenGuruHariIni = getAbsenGuruSayaHariIni(today);
      const sudahLaporHariIni = absenGuruHariIni.length > 0;

      if (isJamPertama && kelasBelumAbsen.length > 0 && !isAdmin() && !isKepsek()) {
        const kelasList = kelasBelumAbsen.join(', ');
        showNotification(
          '📅 Pengingat Absensi',
          `Belum mengisi absensi untuk kelas: ${kelasList}. Segera isi di jam pertama!`,
          'peringatan'
        );
        return;
      }

      if (sekarangMenit > selesaiMenit + 5 && sekarangMenit < selesaiMenit + 30 && kelasBelumJurnal.length > 0) {
        const kelasList = kelasBelumJurnal.join(', ');
        showNotification(
          '📓 Pengingat Jurnal',
          `Belum mengisi jurnal untuk kelas: ${kelasList}. Jangan lupa catat kegiatan pembelajaran!`,
          'info'
        );
        return;
      }

      if (isDalamJendelaDatang && !sudahLaporHariIni && !isAdmin() && !isKepsek()) {
        const sisaMenit = selesaiDatangMenit - sekarangMenit;
        showNotification(
          '📸 Pengingat Absen Guru',
          `Jangan lupa absen Datang hari ini! Batas waktu jam ${windowDatang.selesai} (${sisaMenit} menit lagi). Aktifkan kamera dan lakukan verifikasi, atau laporkan Izin/Sakit kalau tidak masuk.`,
          'peringatan'
        );
        return;
      }

      const pengumumanPenting = allPengumuman.filter(p => 
        p.prioritas === 'penting' && 
        p.aktif !== false &&
        p.tanggal && 
        new Date(p.tanggal) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      if (pengumumanPenting.length > 0 && !isAdmin()) {
        const p = pengumumanPenting[0];
        showNotification(
          '🔴 Pengumuman Penting',
          p.teks || 'Ada pengumuman penting baru!',
          'penting'
        );
      }
    }

    function startReminderScheduler() {
      if (notificationInterval) {
        clearInterval(notificationInterval);
      }
      notificationInterval = setInterval(() => {
        refreshRemindersWatchIfDayChanged();
        checkReminders();
        cekDanKirimPengingatOtomatis();
      }, 2 * 60 * 1000);
      setTimeout(() => { checkReminders(); cekDanKirimPengingatOtomatis(); }, 5000);
    }

    // ============================================================
    // FUNGSI LOGO - FIX ERROR HANDLING
    // ============================================================
    function updateLogoByMode() {
      const logoLight = 'logo/logo-lembaga.png';
      const logoDark = 'logo/logo-lembaga.png'; // versi putih belum ada di repo; pakai logo biasa
      const sidebarLogo = document.getElementById('sidebarLogo');
      const dashboardLogo = document.getElementById('dashboardLogo');
      
      if (sidebarLogo) {
        sidebarLogo.onerror = function() { 
          this.style.display = 'none'; 
        };
        sidebarLogo.src = darkMode ? logoDark : logoLight;
      }
      if (dashboardLogo) {
        dashboardLogo.onerror = function() { 
          this.style.display = 'none'; 
        };
        dashboardLogo.src = darkMode ? logoDark : logoLight;
      }
    }
    // v4LogoFallback(img) sengaja TIDAK didefinisikan di sini: satu-satunya definisi ada di
    // js/logo-fallback.js (dimuat di <head>). Definisi ganda di app.js akan menimpanya karena
    // app.js dimuat belakangan.

    // ============================================================
    // LOGO UNTUK PDF (jsPDF) -- BUG FIX: doc.addImage() butuh data gambar
    // (base64/binary) yang SUDAH DIMUAT, bukan sekadar path file seperti pada
    // <img src="...">. Sebelumnya semua fungsi export PDF (downloadSuratPDF,
    // downloadReportPDF, dst) hanya menulis teks kop surat (nama/alamat madrasah)
    // dan TIDAK PERNAH memanggil doc.addImage() sama sekali -- makanya logo selalu
    // hilang di PDF walau tampil normal di preview HTML.
    // Fungsi ini memuat logo (selalu versi TERANG, supaya tetap terlihat di kertas
    // putih walau aplikasi sedang dark mode), mengubahnya ke base64 lewat canvas,
    // lalu meng-cache hasilnya supaya export PDF berikutnya tidak perlu memuat ulang.
    // ============================================================
    let v4LogoPdfBase64Cache = null;
    function v4LoadLogoForPdf() {
      if (v4LogoPdfBase64Cache) return Promise.resolve(v4LogoPdfBase64Cache);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
          try {
            const canvas = document.createElement('canvas');
            // Perkecil: logo tampil 22 mm di PDF, jadi 300 px sudah tajam (~350 dpi). Dulu dipakai ukuran asli
            // berkas (bisa ribuan px) -> jsPDF menyimpannya mentah tanpa kompresi, PDF membengkak sampai ratusan MB.
            const skalaLogo = Math.min(1, 300 / Math.max(img.naturalWidth, img.naturalHeight));
            canvas.width = Math.max(1, Math.round(img.naturalWidth * skalaLogo));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * skalaLogo));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            v4LogoPdfBase64Cache = canvas.toDataURL('image/png');
            resolve(v4LogoPdfBase64Cache);
          } catch (e) {
            console.error('[SI MAMBA] Gagal konversi logo ke base64 untuk PDF:', e);
            resolve(null);
          }
        };
        img.onerror = function() {
          console.error('[SI MAMBA] Gagal memuat file logo untuk PDF.');
          resolve(null);
        };
        img.src = 'logo/logo-lembaga.png';
      });
    }
    // Menaruh logo di pojok kiri kop surat PDF. Dipanggil setelah logo selesai
    // dimuat (lihat pemanggil: await v4LoadLogoForPdf()). Kalau logo gagal dimuat
    // (mis. file belum ada), kop surat tetap tampil dengan teks saja seperti semula
    // -- tidak membuat proses export PDF gagal total.
    function v4TambahLogoKeKopPdf(doc, logoData, offsetY) {
      if (!logoData) return;
      try { doc.addImage(logoData, 'PNG', 15, 8 + (offsetY || 0), 22, 22, undefined, 'FAST'); }
      catch (e) { console.error('[SI MAMBA] Gagal menambahkan logo ke PDF:', e); }
    }

    // Kop madrasah di PDF TANPA tumpang tindih: logo punya kotak 26 mm di kiri, teks dipusatkan di kolom KANAN logo;
    // baris panjang (alamat, telp/email/web) diperkecil (min 8 pt) lalu dipecah. Mengembalikan y garis bawah kop (>= 40).
    // m = margin kiri/kanan kop (mm). Dulu teks dipusatkan di tengah HALAMAN sehingga baris panjang menabrak logo.
    function v4KopMadrasahPdf(doc, pw, logoData, m) {
      m = m || 20;
      const ukuran = 26, y0 = 10, xt = m + ukuran + 4, xr = pw - m, tengah = (xt + xr) / 2, lebarTeks = xr - xt;
      let y = 16;
      if (logoData) {
        try {
          const fmt = /^data:image\/jpe?g/i.test(logoData) ? 'JPEG' : 'PNG';
          const pr = doc.getImageProperties(logoData), r = pr.width / pr.height;
          const lw = r >= 1 ? ukuran : ukuran * r, lh = r >= 1 ? ukuran / r : ukuran;
          doc.addImage(logoData, fmt, m + (ukuran - lw) / 2, y0 + (ukuran - lh) / 2, lw, lh, undefined, 'FAST');
        } catch (e) { console.error('[SI MAMBA] Gagal menambahkan logo ke kop PDF:', e); }
      }
      doc.setTextColor(0);
      const baris = (teks, gaya, ukur, dy, boleh2) => {
        if (!teks) return;
        doc.setFont('helvetica', gaya); doc.setFontSize(ukur);
        while (doc.getTextWidth(teks) > lebarTeks && ukur > (boleh2 ? 8 : 6)) { ukur -= 0.25; doc.setFontSize(ukur); }
        (doc.getTextWidth(teks) > lebarTeks ? doc.splitTextToSize(teks, lebarTeks) : [teks]).forEach(t => { doc.text(t, tengah, y, { align: 'center' }); y += dy; });
      };
      baris(String(MADRASAH.nama || '').toUpperCase(), 'bold', 16, 5.5, false);
      if (MADRASAH.nsm) baris('NSM: ' + MADRASAH.nsm, 'bold', 10, 4.6, false);
      baris(MADRASAH.alamat, 'normal', 10, 4.4, true);
      baris('Telp: ' + MADRASAH.telp + '  |  Email: ' + MADRASAH.email + '  |  Web: ' + MADRASAH.website, 'normal', 10, 4.4, true);
      const yb = Math.max(y + 0.5, y0 + ukuran + 2, 38);
      doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(m, yb, pw - m, yb); doc.line(m, yb + 2, pw - m, yb + 2);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      return yb + 2;
    }

    // ============================================================
    // TANDA TANGAN DIGITAL KEPALA SEKOLAH
    // Gambar tanda tangan disimpan langsung sebagai data URL di database (BUKAN diunggah ke
    // Firebase Storage), karena project ini memakai plan gratis Spark yang tidak mendukung Storage.
    // tanpa batas di Spark, hanya dibatasi total 1GB tersimpan). Gambar diperkecil dulu ke
    // maks lebar 400px via canvas sebelum disimpan, supaya ukurannya tetap kecil -- school_settings
    // dimuat lewat listener .on('value') yang aktif untuk SEMUA pengguna sejak app dibuka
    // (dipakai untuk info kop surat dll), jadi kalau gambarnya besar, semua orang ikut
    // mengunduh blob besar itu di setiap sesi.
    // TTD kini disimpan di node terpisah `school_assets/ttdKepala` ({base64, updatedBy, updatedAt}) -- BUKAN lagi di
    // school_settings, supaya listener .on('value') school_settings (aktif untuk semua pengguna) tidak ikut mengunduh
    // blob base64. Dimuat sekali (memoized) & ditaruh di MADRASAH.ttdKepalaBase64 agar semua pemakai lama tetap jalan.
    let _ttdPromise = null;
    function ensureTtdKepala(force) {
      if (!_ttdPromise || force) {
        _ttdPromise = db.ref('school_assets/ttdKepala').once('value').then(snap => {
          const v = snap.val();
          if (v && v.base64) MADRASAH.ttdKepalaBase64 = v.base64;
          else if (MADRASAH.ttdKepalaBase64 && currentUser && isAdmin()) migrasiTtdKepalaLama();
          return MADRASAH.ttdKepalaBase64 || '';
        }).catch(err => {
          console.warn('[SI MAMBA] Gagal memuat tanda tangan Kepala:', err && err.message ? err.message : err);
          _ttdPromise = null;
          return MADRASAH.ttdKepalaBase64 || '';
        });
      }
      return _ttdPromise;
    }
    // Migrasi satu kali (oleh Admin): pindahkan TTD lama dari school_settings ke school_assets. Satu update
    // multi-path = atomik, jadi TTD lama baru terhapus kalau yang baru benar-benar tertulis.
    function migrasiTtdKepalaLama() {
      if (!isAdmin()) return;
      const upd = {};
      upd['school_assets/ttdKepala'] = { base64: MADRASAH.ttdKepalaBase64, updatedBy: currentUser.name, updatedAt: new Date().toISOString(), migrasi: true };
      upd['school_settings/ttdKepalaBase64'] = null;
      adminSesi().then(() => db.ref().update(upd)).catch(err => console.warn('[SI MAMBA] Migrasi TTD Kepala gagal:', err && err.message ? err.message : err));
    }
    function v4LoadTtdKepalaForPdf() {
      return ensureTtdKepala().then(v => v || null);
    }
    // Menyuntikkan kartu upload tanda tangan ke halaman Profil Sekolah lewat DOM langsung
    // (bukan lewat index.html) -- ditaruh tepat setelah kartu "Struktur Pengurus" yang sudah
    // ada. Idempotent: kalau kartu sudah pernah dibuat, cukup isi ulang kontennya.
    function renderTtdKepalaPreview() {
      _renderTtdKepalaPreviewNow();
      ensureTtdKepala().then(_renderTtdKepalaPreviewNow);
    }
    function _renderTtdKepalaPreviewNow() {
      let box = document.getElementById('ttdKepalaBox');
      if (!box) {
        const anchor = document.getElementById('profilStrukturRingkasan');
        if (!anchor || !anchor.parentNode) return;
        box = document.createElement('div');
        box.id = 'ttdKepalaBox';
        box.style.cssText = 'margin-top:14px;padding:12px;border:1px dashed #a7f3d0;border-radius:10px;background:#f0fdf4;';
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
      }
      const previewImg = MADRASAH.ttdKepalaBase64
        ? `<img src="${MADRASAH.ttdKepalaBase64}" alt="Tanda tangan Kepala Sekolah" style="max-height:60px;max-width:180px;display:block;margin-bottom:8px;background:white;border-radius:4px;padding:4px;">`
        : `<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Belum ada tanda tangan digital — surat masih memakai tanda tangan teks biasa (nama digarisbawahi).</p>`;
      box.innerHTML = `<p style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:6px;">✍️ Tanda Tangan Digital Kepala Sekolah</p>
        ${previewImg}
        <input type="file" id="inputTtdKepala" accept="image/png,image/jpeg" onchange="uploadTandaTanganKepala(event)" style="font-size:12px;">
        ${MADRASAH.ttdKepalaBase64 ? `<button class="btn btn-danger" style="padding:2px 10px;font-size:11px;margin-left:8px;" onclick="hapusTandaTanganKepala()">🗑️ Hapus</button>` : ''}
        <p class="text-muted" style="font-size:11px;margin-top:6px;">PNG latar transparan disarankan, maks 1MB. Otomatis diperkecil & ditempel di atas nama Kepala Sekolah saat Surat/Raport/Honor diunduh sebagai PDF.</p>`;
    }
    function uploadTandaTanganKepala(event) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!/^image\/(png|jpe?g)$/.test(file.type)) { toast('⚠️ File harus berupa gambar PNG/JPG!', true); event.target.value = ''; return; }
      if (file.size > 1024 * 1024) { toast('⚠️ Ukuran file maksimal 1MB!', true); event.target.value = ''; return; }
      event.target.disabled = true;
      toast('⏳ Memproses tanda tangan...', false, 2000);
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          try {
            // Perkecil ke maks lebar 400px (cukup untuk kualitas cetak PDF) supaya base64
            // yang tersimpan di Realtime Database tetap kecil -- lihat catatan di atas.
            const maxW = 400;
            const scale = Math.min(1, maxW / img.naturalWidth);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.naturalWidth * scale);
            canvas.height = Math.round(img.naturalHeight * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/png');
            tulisSettingsAdmin('', { 'school_assets/ttdKepala': { base64: base64, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, 'school_settings/ttdKepalaBase64': null, 'school_settings/ttdKepalaUpdatedBy': null, 'school_settings/ttdKepalaUpdatedAt': null }, err => {
              event.target.disabled = false; event.target.value = '';
              if (err) return toast('Gagal simpan: ' + err.message, true);
              MADRASAH.ttdKepalaBase64 = base64; _ttdPromise = Promise.resolve(base64);
              toastTersimpan('Tanda tangan Kepala Sekolah');
              addLog('upload_ttd_kepala', MADRASAH.kepala_sekolah);
              renderTtdKepalaPreview();
            });
          } catch (e) {
            event.target.disabled = false; event.target.value = '';
            toast('Gagal memproses gambar: ' + e.message, true);
          }
        };
        img.onerror = function() {
          event.target.disabled = false; event.target.value = '';
          toast('Gagal membaca gambar.', true);
        };
        img.src = e.target.result;
      };
      reader.onerror = function() {
        event.target.disabled = false; event.target.value = '';
        toast('Gagal membaca file.', true);
      };
      reader.readAsDataURL(file);
    }
    function hapusTandaTanganKepala() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus tanda tangan digital Kepala Sekolah? Surat akan kembali memakai tanda tangan teks biasa.')) return;
      tulisSettingsAdmin('', { 'school_assets/ttdKepala': null, 'school_settings/ttdKepalaBase64': null, 'school_settings/ttdKepalaUpdatedBy': null, 'school_settings/ttdKepalaUpdatedAt': null }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        MADRASAH.ttdKepalaBase64 = ''; _ttdPromise = Promise.resolve('');
        toast('✅ Tanda tangan digital dihapus.');
        addLog('hapus_ttd_kepala', '');
        renderTtdKepalaPreview();
      });
    }

    // ============================================================
    // DARK MODE
    // ============================================================
    function toggleDarkMode() {
      darkMode = !darkMode;
      document.body.classList.toggle('dark-mode', darkMode);
      document.querySelector('.dark-toggle').textContent = darkMode ? '☀️' : '🌙';
      localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
      updateLogoByMode();
      renderCharts();
    }

    function loadDarkMode() {
      const saved = localStorage.getItem('darkMode');
      if (saved === 'true') {
        darkMode = true;
        document.body.classList.add('dark-mode');
        document.querySelector('.dark-toggle').textContent = '☀️';
      }
    }

    // ============================================================
    // PWA - SERVICE WORKER & INSTALL
    // ============================================================
    function registerServiceWorker() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
          .then(reg => {
            // Cek pembaruan setiap kali app dibuka, dan juga secara berkala
            // selama app dibuka lama (mis. dipakai seharian tanpa ditutup).
            reg.update();
            setInterval(() => reg.update(), 60 * 60 * 1000); // tiap 1 jam
            // Versi baru yang sudah terunduh di sesi sebelumnya dan masih menunggu TIDAK memicu 'updatefound' lagi
            // (sw.js sengaja tidak skipWaiting) -> tawarkan sekarang, kalau tidak user tidak pernah diberi tahu.
            if (reg.waiting && navigator.serviceWorker.controller) showUpdateAvailableToast(reg);
            // App terpasang di HP jarang dimuat ulang: cek pembaruan juga saat kembali dibuka/difokuskan.
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') { try { reg.update().catch(() => {}); } catch (e) {} }
            });

            // Ada worker baru yang sedang diunduh (kode sw.js/app shell berubah)?
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                // 'installed' + sudah ada controller aktif = versi baru siap,
                // menunggu izin user untuk menggantikan versi yang sedang jalan.
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showUpdateAvailableToast(reg);
                }
              });
            });
          })
          .catch(err => console.error('[SI MAMBA] Service Worker registration failed:', err));

        // Setelah versi baru aktif mengambil alih, reload sekali supaya semua
        // tab memakai app shell yang sama (dipicu dari showUpdateAvailableToast).
        let reloadedForUpdate = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!window._swUserUpdate) return;   // dulu: reload otomatis tiap SW baru mengambil alih (mis. dipicu tab/jendela lain)
          if (reloadedForUpdate) return;
          reloadedForUpdate = true;
          window.location.reload();
        });

        // Dipicu dari sw.js saat event 'sync' (Background Sync API) berjalan di background —
        // tab ini diminta segera mengirim antrian absensi/jurnal yang masih tertunda lewat
        // koneksi Firebase SDK yang sudah aktif di halaman ini (lihat catatan di sw.js).
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data && event.data.type === 'FLUSH_PENDING_QUEUE') {
            flushPendingWrites();
          }
        });
      }
    }

    let _updateDialogDitunda = false;
    // Aktifkan versi baru. Bila controllerchange (reload otomatis) tak terpicu dalam 4 dtk, muat ulang manual.
    function terapkanUpdateSW(reg) {
      window._swUserUpdate = true;   // controllerchange hanya me-reload bila pengguna sendiri menekan Perbarui
      if (reg.waiting) { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => window.location.reload(), 4000); }
      else window.location.reload();
    }
    function showUpdateAvailableToast(reg) {
      // Tombol kecil di topbar tetap ada sebagai cadangan (mis. setelah user memilih "Nanti").
      const btn = document.getElementById('swUpdateBtn');
      if (btn) {
        btn.style.display = 'inline-flex';
        btn.onclick = () => { btn.style.display = 'none'; terapkanUpdateSW(reg); };
      }
      if (_updateDialogDitunda || document.getElementById('swUpdateDialog')) return;
      tampilkanDialogUpdate(reg);
    }
    // Pop up "Versi baru tersedia". Memuat ulang bisa menghilangkan isian yang belum disimpan, jadi user yang memutuskan kapan.
    function tampilkanDialogUpdate(reg) {
      const gelap = document.body.classList.contains('dark-mode');
      const ov = document.createElement('div');
      ov.id = 'swUpdateDialog';
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'swUpdateJudul');
      ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;';
      ov.innerHTML = '<div style="width:100%;max-width:380px;box-sizing:border-box;border-radius:16px;padding:22px 20px 18px;box-shadow:0 12px 40px rgba(0,0,0,.35);background:' + (gelap ? '#1f2937' : '#ffffff') + ';color:' + (gelap ? '#f3f4f6' : '#1c2b24') + ';font-family:inherit;">' +
        '<div id="swUpdateJudul" style="font-size:18px;font-weight:700;margin-bottom:8px;">🔄 Versi baru tersedia</div>' +
        '<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:' + (gelap ? '#d1d5db' : '#4b5563') + ';">Pembaruan SI MAMBA sudah siap. Simpan dulu data yang sedang diisi, lalu tekan <b>Perbarui sekarang</b>. Aplikasi akan dimuat ulang sebentar.</p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">' +
        '<button type="button" id="swUpdateNanti" style="min-height:44px;padding:0 18px;border-radius:10px;border:1px solid ' + (gelap ? '#4b5563' : '#cbd5d0') + ';background:transparent;color:inherit;font-size:14px;cursor:pointer;">Nanti</button>' +
        '<button type="button" id="swUpdateYa" style="min-height:44px;padding:0 18px;border-radius:10px;border:0;background:#00543f;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Perbarui sekarang</button>' +
        '</div></div>';
      document.body.appendChild(ov);
      const tutup = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
      const nanti = () => {
        tutup(); _updateDialogDitunda = true;
        toast('Tekan tombol 🔄 Perbarui di bagian atas kapan saja.', false, 5000);
        // Tawarkan lagi 30 menit kemudian bila masih belum diperbarui.
        setTimeout(() => { _updateDialogDitunda = false; if (reg.waiting) showUpdateAvailableToast(reg); }, 30 * 60 * 1000);
      };
      const onKey = e => { if (e.key === 'Escape') nanti(); };
      document.addEventListener('keydown', onKey);
      ov.addEventListener('click', e => { if (e.target === ov) nanti(); });
      ov.querySelector('#swUpdateNanti').onclick = nanti;
      const ya = ov.querySelector('#swUpdateYa');
      ya.onclick = () => {
        ya.disabled = true; ya.textContent = 'Memperbarui...';
        ov.querySelector('#swUpdateNanti').disabled = true;
        const btn = document.getElementById('swUpdateBtn'); if (btn) btn.style.display = 'none';
        terapkanUpdateSW(reg);
      };
      ya.focus();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      document.getElementById('installBtn').style.display = 'inline-flex';
    });

    window.addEventListener('appinstalled', () => {
      document.getElementById('installBtn').style.display = 'none';
      toast('✅ Aplikasi berhasil diinstall!');
      addLog('pwa_install', 'Aplikasi diinstall');
    });

    function installApp() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') { toast('✅ Aplikasi berhasil diinstall!'); addLog('pwa_install', 'Aplikasi diinstall'); }
          else toast('⏳ Install dibatalkan');
          deferredPrompt = null;
          document.getElementById('installBtn').style.display = 'none';
        });
      } else {
        toast('📱 Buka Chrome/Safari dan pilih "Add to Home Screen"', false, 4000);
      }
    }

    // ============================================================
    // FUNGSI BANTU
    // ============================================================
    // `loadingStartedAt` dipakai untuk mendeteksi loading yang "macet" -- lihat listener
    // visibilitychange di bawah, dekat stopCamera(). Root cause aslinya: setTimeout (termasuk
    // timeout keamanan di fbTimeout()) DITUNDA browser saat tab/app di-minimize, jadi kalau
    // request Firebase kebetulan sedang berjalan pas diminimize, baik hasil asli maupun
    // timeout-nya bisa sama-sama tertahan sampai app dibuka lagi -- overlay loading jadi
    // terkesan "macet selamanya" walau sebenarnya cuma tertunda oleh browser.
    let loadingStartedAt = null;
    function showLoading() { loadingStartedAt = Date.now(); document.getElementById('loadingOverlay').classList.add('show'); }
    function hideLoading() { loadingStartedAt = null; document.getElementById('loadingOverlay').classList.remove('show'); }
    function setLoadingMessage(msg) { const el = document.querySelector('#loadingOverlay p'); if (el) el.textContent = msg; }

    // ============================================================
    // fbTimeout(): pembungkus AMAN untuk setiap query Firebase individual.
    // Sebelumnya, satu query yang macet (permission-denied, index belum ada, jaringan putus
    // di tengah jalan) akan membuat SELURUH Promise.all() ikut macet TANPA BATAS WAKTU --
    // karena promise-promise itu ditulis manual (`new Promise((resolve)=>{...})`) tanpa jalur
    // reject/error sama sekali, dan yang berbasis `.once('value').then()` juga tidak punya
    // `.catch()`. fbTimeout() menjamin SETIAP query SELALU selesai (resolve) dalam waktu
    // terbatas, entah berhasil, gagal, atau timeout -- supaya proses login/loading tidak
    // pernah menggantung selamanya karena satu bagian data yang bermasalah.
    // ============================================================
    // Diagnostik performa (OPT-IN, default mati). Nyalakan: buka Console, ketik
    //   localStorage.setItem('simambaPerf','1')   lalu refresh & login.
    // Matikan: localStorage.removeItem('simambaPerf'). Hasilnya berupa baris "[SI MAMBA perf] ..."
    // di Console: waktu tiap query Firebase, waktu Fase 1/Fase 2, dan lama render.
    // ============================================================
    // [PATCH JARINGAN LEMAH] STATUS KONEKSI SUNGGUHAN + KONSTANTA TIMEOUT
    // ============================================================
    // navigator.onLine cuma tahu "perangkat tersambung ke Wi-Fi/data seluler", BUKAN "internet
    // benar-benar jalan". Di sinyal lemah / putus-putus nilainya tetap true, sehingga semua jalur
    // offline (antrian, cache) tidak pernah aktif dan aplikasi menunggu Firebase sampai timeout.
    // fbConnected memakai .info/connected -- status koneksi Firebase yang sebenarnya.
    let fbConnected = false;
    function isReallyOnline() { return navigator.onLine && fbConnected; }
    const FB_QUERY_TIMEOUT_MS    = 5000;   // batas tunggu 1 query Firebase (dulu 7000)
    const FB_LOAD_FALLBACK_MS    = 5500;   // batas tunggu Fase 1 sebelum pakai cache (dulu 9000)
    const SAVE_DEADLINE_MS       = 8000;   // batas tunggu simpan absensi/jurnal sebelum masuk antrian
    const FLUSH_ITEM_DEADLINE_MS = 20000;  // batas tunggu kirim 1 item antrian (supaya kunci sinkron tidak nyangkut)
    // Promise dengan batas waktu. Error-nya diberi tanda isDeadline supaya pemanggil bisa
    // membedakan "jaringan macet" dari "ditolak server".
    function promiseDeadline(p, ms) {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => { const e = new Error('Timeout ' + ms + 'ms'); e.isDeadline = true; reject(e); }, ms);
        Promise.resolve(p).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
      });
    }
    db.ref('.info/connected').on('value', snap => {
      const was = fbConnected;
      fbConnected = !!snap.val();
      // Begitu Firebase benar-benar tersambung lagi, langsung kirim antrian yang tertunda
      // (tidak menunggu interval 30 detik).
      if (fbConnected && !was && typeof currentUser !== 'undefined' && currentUser) {
        try { flushPendingWrites(); } catch (e) { console.warn('[SI MAMBA] flush setelah tersambung:', e); }
      }
    });

    // Hemat koneksi (Spark: maks. 100 koneksi serentak). Tab yang tersembunyi >10 menit (HP dikunci, tab lupa
    // ditutup di komputer sekolah) memutus koneksi Firebase-nya; begitu tab terlihat lagi, tersambung kembali
    // dan antrian tulis tertunda dikirim otomatis lewat listener .info/connected di atas. Tidak ada
    // onDisconnect/presence di app ini, jadi memutus koneksi tidak mengubah data apa pun di server.
    (function hematKoneksiFirebase() {
      const IDLE_MS = 10 * 60 * 1000;
      let timer = null, terputus = false;
      function sambungLagi() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (terputus) { terputus = false; try { db.goOnline(); } catch (e) { console.warn('[SI MAMBA] goOnline gagal:', e); } }
      }
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { sambungLagi(); return; }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          if (document.hidden && !terputus) { terputus = true; try { db.goOffline(); } catch (e) { terputus = false; } }
        }, IDLE_MS);
      });
      window.addEventListener('online', sambungLagi);
    })();

    let fbCompletedCount = 0; // dinaikkan tiap query fbTimeout sukses: dipakai mendeteksi "data dari jaringan sudah mulai masuk"
    const SIMAMBA_PERF = (() => { try { return localStorage.getItem('simambaPerf') === '1'; } catch (e) { return false; } })();
    function perfLog() { if (SIMAMBA_PERF) console.log.apply(console, ['[SI MAMBA perf]'].concat([].slice.call(arguments))); }
    function perfTime(label, fn) {
      if (!SIMAMBA_PERF) return fn();
      const t = performance.now();
      try { return fn(); } finally { console.log('[SI MAMBA perf]', 'render', label, (Math.round((performance.now() - t) * 10) / 10) + 'ms'); }
    }
    // Bandingkan nama guru tanpa peduli huruf besar/kecil, titik, koma, dan spasi, supaya
    // "Muhammad Imron, S.Pd." dan "Muhammad Imron, S.Pd" dianggap orang yang sama. Dipakai HANYA
    // sebagai cadangan untuk baris Jadwal lama yang belum punya guruKey.
    function samaNamaGuru(a, b) {
      const norm = x => String(x || '').toLowerCase().replace(/[\s.,]+/g, '');
      const na = norm(a), nb = norm(b);
      return !!na && na === nb;
    }
    function fbTimeout(promiseLike, ms, label) {
      ms = ms || FB_QUERY_TIMEOUT_MS;
      let settled = false;
      const t0 = Date.now();
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (settled) return; settled = true;
          console.warn('[SI MAMBA] Timeout memuat data' + (label ? ' (' + label + ')' : '') + ' setelah ' + ms + 'ms -- lanjut tanpa data ini, tidak memblokir yang lain.');
          perfLog(label || '(tanpa label)', 'TIMEOUT', ms + 'ms');
          resolve();
        }, ms);
        Promise.resolve(promiseLike).then((val) => {
          if (settled) return; settled = true; clearTimeout(timer); fbCompletedCount++; perfLog(label || '(tanpa label)', (Date.now() - t0) + 'ms'); resolve(val);
        }).catch((err) => {
          if (settled) return; settled = true; clearTimeout(timer);
          console.error('[SI MAMBA] Gagal memuat data' + (label ? ' (' + label + ')' : '') + ':', err && err.message ? err.message : err);
          resolve();
        });
      });
    }
    // Bungkus db.ref(...).once('value', successCb) versi callback-style (dipakai luas di
    // loadAllData()) supaya juga punya jalur error eksplisit dari Firebase (parameter ke-3
    // pada .once), bukan cuma mengandalkan timeout kalau errornya instan (mis. permission-denied).
    function fbOnceSafe(ref, onSuccess, ms, label) {
      return fbTimeout(new Promise((resolve, reject) => {
        ref.once('value', snap => { try { onSuccess(snap); } finally { resolve(); } }, err => reject(err));
      }), ms, label);
    }

    // Jaring pengaman terakhir: kalau ada error JS tak tertangani atau Promise yang reject
    // tanpa .catch() di MANA PUN (bukan cuma saat loading), catat ke console supaya bisa
    // ditelusuri, dan jangan biarkan layar loading nyangkut kalau errornya terjadi di tengah
    // proses login/memuat data.
    window.addEventListener('unhandledrejection', function(ev) {
      console.error('[SI MAMBA] Unhandled promise rejection:', ev.reason);
      const overlay = document.getElementById('loadingOverlay');
      if (overlay && overlay.classList.contains('show')) {
        setTimeout(() => { if (overlay.classList.contains('show')) { hideLoading(); toast('⚠️ Terjadi kendala saat memuat sebagian data. Silakan tekan 🔄 Refresh kalau ada yang tidak lengkap.', true, 6000); } }, 500);
      }
    });
    window.addEventListener('error', function(ev) {
      console.error('[SI MAMBA] Uncaught error:', ev.error || ev.message);
    });

    function toast(msg, err = false, duration = 3500) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show' + (err ? ' error' : ' success');
      if (err) { t.className += ' error'; duration = 7000; }
      clearTimeout(window.toastTimer);
      window.toastTimer = setTimeout(() => t.className = 'toast', duration);
    }

    // Pesan seragam setelah tombol Simpan berhasil. Dipanggil HANYA pada cabang sukses (setelah server menerima data),
    // sebelum jendela ditutup. `tambahan` (opsional) hanya untuk info yang memang perlu dibaca pengguna.
    const PESAN_TERSIMPAN = '✅ Data tersimpan';
    function toastTersimpan(tambahan) { toast(PESAN_TERSIMPAN + (tambahan ? ' · ' + tambahan : '')); }

    // FIX: dulu tanda tangan fungsinya (action, message) tapi HANYA `message` yang dipakai untuk
    // teks konfirmasi -- `action` sama sekali tidak disentuh di dalam fungsi. Semua pemanggil di
    // seluruh app (kecuali satu, hapus catatan absensi guru) memanggil doubleConfirm() dengan SATU
    // argumen saja (pesan spesifiknya, mis. "Hapus surat ini?"), yang otomatis jatuh ke parameter
    // `action` yang diabaikan -- sehingga user SELALU melihat pesan generik "Tindakan ini akan
    // menghapus data secara permanen..." padahal maksudnya mau kasih tahu APA yang akan dihapus.
    // Untuk aksi hapus yang tidak bisa dibatalkan, pesan spesifik itu penting (mis. nama siswa/
    // surat/jadwal yang benar-benar akan hilang) -- sekarang parameter disederhanakan jadi satu
    // (message) sesuai pola yang dipakai hampir di semua tempat.
    function doubleConfirm(message) {
      const defaultMsg = '⚠️ Tindakan ini akan menghapus data secara permanen dan tidak bisa dibatalkan!';
      const msg1 = message || defaultMsg;
      if (!confirm(msg1)) return false;
      if (!confirm('🔄 KONFIRMASI AKHIR: Apakah Anda benar-benar yakin ingin melanjutkan?')) return false;
      return true;
    }

    function hapusDataWithConfirm(path, key, itemName = '') {
      const name = itemName || 'data ini';
      // PENTING: sebelumnya fungsi ini TIDAK mengecek izin sama sekali -- yang membatasi
      // hanya tombol hapus di UI yang disembunyikan untuk non-Admin (siswa/guru) atau non-
      // pemilik (journal). Tombol yang disembunyikan tidak menghentikan siapa pun yang sudah
      // login memanggil fungsi ini langsung (mis. lewat console browser) untuk menghapus data
      // siswa/guru/jurnal MILIK ORANG LAIN. Sekarang izin yang SAMA seperti syarat tombol di
      // atas dicek ULANG di sini, di dalam fungsi yang benar-benar melakukan penghapusan.
      let diizinkan = isAdmin();
      if (!diizinkan && path === 'journal') {
        const j = (typeof allJournals !== 'undefined' ? allJournals : []).find(x => x.key === key);
        diizinkan = !!j && (j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name);
      }
      if (!diizinkan) return toast('Anda tidak punya izin menghapus data ini!', true);
      if (!doubleConfirm(`Hapus ${name}?`)) return;
      db.ref(path + '/' + key).remove(err => {
        if (err) toast('Gagal hapus: ' + err.message, true);
        else { toast('✅ ' + name + ' berhasil dihapus.'); reloadByPath(path); if (path === 'guru') loadGuruListForLogin(); }
      });
    }

    // Key unik untuk akun Admin & Kepsek (bukan key guru Firebase, jadi tidak mungkin bentrok). Tanpa ini
    // currentUser.key = undefined untuk keduanya, sehingga cache offline (offlineCachePrefix), cek pemilik data
    // (currentUser.key === owner) dan kunci mode kerja (sim_mode_*) tercampur antara Admin dan Kepsek.
    const ADMIN_USER_KEY = '__admin__', KEPSEK_USER_KEY = '__kepsek__';
    function isAdmin() { return currentUser && currentUser.role === ROLES.ADMIN; }
    function isKepsek() { return currentUser && currentUser.role === ROLES.HEADMASTER; }
    function isTeacher() { return currentUser && currentUser.role === ROLES.TEACHER; }
    function isWaliKelas() { return currentUser && currentUser.role === ROLES.WALI_KELAS; }
    function canEdit() { return isTeacher() || isAdmin() || isWaliKelas(); }
    // Dipakai untuk cek "apakah guru ini punya penugasan Wali Kelas" berdasarkan data guru
    // (field waliKelasOf yang diisi Admin), BUKAN berdasarkan mode kerja yang sedang aktif
    // (currentUser.role bisa 'teacher' walau dia wali kelas, kalau mode kerjanya sedang di-set
    // ke Guru). Supaya menu & data khusus wali kelas (Data Siswa, Surat, Raport, Rekap Nilai)
    // tetap muncul & terfilter ke kelasnya walau dia sedang bekerja dalam mode Guru biasa.
    function isWaliKelasAssigned() { return !!(currentUser && currentUser.waliKelasOf); }
    // Daftar kelas yang boleh dilihat user saat ini untuk fitur seputar data siswa (Data
    // Siswa, Surat, Raport, Rekap Nilai): Admin & Kepsek lihat semua kelas; wali kelas
    // (siapa pun mode kerjanya sekarang) dibatasi ke SATU kelas yang dia ampu sebagai wali;
    // selain itu (guru biasa yang entah bagaimana sampai ke fitur ini) dibatasi ke kelas yang
    // dia ajar.
    function siswaScopeKelas() {
      if (isAdmin() || isKepsek()) return [...KELAS_LIST];
      if (isWaliKelasAssigned()) return [currentUser.waliKelasOf];
      return currentUser && currentUser.kelas ? [...currentUser.kelas] : [];
    }
    // Scope kelas untuk LOADER data (siswa, absensi, nilai, jurnal, tugas, materi, dst) dan
    // pengecekan izin tulis per-kelas -- BEDA dari siswaScopeKelas() di atas (yang sengaja
    // dipersempit ke SATU kelas wali saja, khusus fitur Data Siswa/Surat/Raport/Rekap Nilai).
    // Di sini scope-nya UNION currentUser.kelas (semua kelas yang diajar guru itu) DENGAN
    // currentUser.waliKelasOf (kelas yang dia wali-i) -- supaya guru yang wali kelas 4A tapi
    // juga mengajar di 5A tetap bisa mengakses & mengelola data 5A (kelas yang dia ajar) MAUPUN
    // 4A (kelas walinya), bukan cuma salah satu. Sebelumnya beberapa loader & cek izin pakai
    // currentUser.kelas mentah (tidak ikut waliKelasOf kalau entah bagaimana tidak masuk daftar
    // kelas yang diajar), yang lain re-implementasi manual berulang-ulang dengan pola sedikit
    // beda -- sekarang disatukan lewat satu fungsi ini supaya konsisten di semua tempat.
    function loaderScopeKelas() {
      if (isAdmin() || isKepsek()) return [...KELAS_LIST];
      const kelasAjar = currentUser && currentUser.kelas ? currentUser.kelas : [];
      const kelasWali = currentUser && currentUser.waliKelasOf ? [currentUser.waliKelasOf] : [];
      return [...new Set([...kelasAjar, ...kelasWali])];
    }
    // Scope kelas khusus PEMUATAN data siswa & iuran_siswa: scope biasa UNION kelas tugas Petugas Infaq. Admin boleh
    // menunjuk guru mana pun sebagai petugas ('tidak harus wali kelas'), jadi tanpa ini petugas yang tidak mengajar/
    // mewali kelas tugasnya tidak mendapat siswa & iuran kelas itu (rekap infaq/setoran 0). SENGAJA tidak mengubah
    // loaderScopeKelas(): fungsi itu juga dipakai cek izin tulis (jurnal, sikap, tugas, materi) yang tidak boleh melebar.
    function scopeKelasData() { return [...new Set([...loaderScopeKelas(), ...infaqMyKelasList()])]; }
    function hashPin(pin) { return CryptoJS.SHA256(pin).toString(CryptoJS.enc.Hex); }
    // -------- Salt PIN per-guru (2026-09) --------
    // hashPin() di atas (TANPA salt) dipertahankan hanya untuk: (a) PIN Admin/Kepsek yang hash-nya
    // di-hardcode di ADMIN_PIN_HASH/KEPSEK_PIN_HASH (lihat catatan di dekat konstanta itu -- tidak
    // bisa diberi salt tanpa tahu PIN aslinya), dan (b) mendeteksi + memigrasi hash guru versi lama.
    // Hash BARU untuk PIN guru memakai guru.key sebagai salt, supaya dua guru yang pakai PIN sama
    // tidak punya hash yang identik, dan hash lama tidak bisa dipakai lintas-akun kalau bocor.
    function hashPinSalted(pin, salt) { return CryptoJS.SHA256(String(pin) + '::' + String(salt)).toString(CryptoJS.enc.Hex); }
    // Verifikasi PIN guru. Kalau guru.pin ternyata masih hash versi lama (tanpa salt) dan cocok,
    // upgrade diam-diam ke hash baru bergaram -- ini SATU-SATUNYA momen sistem tahu PIN asli guru,
    // karena hash lama tidak bisa "dibalik" untuk tahu PIN aslinya di luar momen login/verifikasi ini.
    function verifyGuruPin(guru, pinInput) {
      if (!guru) return false;
      const saltedHash = hashPinSalted(pinInput, guru.key);
      if (guru.pin === saltedHash) return true;
      if (guru.pin === hashPin(pinInput)) {
        // Penulisan PIN ke data guru dihapus (Rules v2 menolak field pin). PIN dimigrasi lewat kredMigrasi.
        guru.pin = saltedHash;
        return true;
      }
      return false;
    }
    // Mencegah XSS: gunakan escapeHtml(...) setiap kali menyisipkan data yang berasal dari
    // input pengguna (nama siswa/guru, pengumuman, jurnal, dll) ke dalam innerHTML.
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    // Untuk menyisipkan data (nama siswa/guru dll) ke dalam argumen string JS di dalam atribut
    // onclick="fn('...')" -- mencegah nama yang mengandung tanda kutip (mis. "Robi'atul") merusak
    // kode JS atau disalahgunakan untuk menyisipkan JS lain.
    //
    // SATU lewatan (single-pass) lewat tabel karakter dipakai supaya urutan escape tidak pernah
    // bisa salah: rantai .replace() berurutan gampang salah urutan (mis. & harus di-escape sebelum
    // entity lain, backslash harus paling awal) dan gampang double-escape kalau ada yang menambah
    // satu .replace() lagi tanpa memperhatikan urutan. Di sini tiap karakter berbahaya diganti tepat
    // sekali dan hasil penggantian tidak pernah diproses ulang, lewat tabel
    // karakter: tiap karakter berbahaya diganti tepat sekali, hasil penggantian tidak pernah
    // diproses ulang, jadi tidak ada urutan yang bisa salah. Semua karakter yang berarti bagi
    // JS *maupun* HTML (\ ' " & < >) ditulis sebagai escape \uXXXX -- output murni ASCII tanpa
    // satu pun karakter spesial HTML, sehingga parser HTML tidak mengubah apa pun (tak ada
    // entity yang bisa terbentuk dari data mentah seperti "&quot;"/"&#39;") dan aman terlepas
    // dari kutip pembungkus (tunggal/ganda) maupun konteks pemakaian.
    // U+2028/U+2029 juga di-escape: di engine lama keduanya dianggap akhir baris dan merusak
    // literal string JS.
    const _JS_ESC_MAP = {
      '\\': '\\\\', "'": '\\u0027', '"': '\\u0022', '&': '\\u0026', '<': '\\u003C', '>': '\\u003E',
      '\u2028': '\\u2028', '\u2029': '\\u2029'
    };
    const _JS_ESC_RE = /[\\'"&<>\u2028\u2029]/g;
    function _jsEscBase(str) {
      return String(str).replace(/\r\n?/g, '\n').replace(_JS_ESC_RE, ch => _JS_ESC_MAP[ch]);
    }
    function escapeJs(str) {
      if (str === null || str === undefined) return '';
      return _jsEscBase(str).replace(/\n/g, ' ');
    }
    // Sama seperti escapeJs(), tapi baris baru TIDAK diratakan jadi spasi -- diubah jadi urutan
    // escape "\n" yang sah secara sintaks JS, supaya waktu kode di dalam onclick="..." dieksekusi
    // browser, string-nya balik utuh multi-baris. Dipakai khusus untuk pesan WhatsApp
    // (kirimWA/kirimWaSiswaKey) yang memang perlu format berparagraf.
    function escapeJsMultiline(str) {
      if (str === null || str === undefined) return '';
      return _jsEscBase(str).replace(/\n/g, '\\n');
    }
    // -------- Tanda tangan session localStorage (2026-09) --------
    // PENTING: SESSION_SECRET ini tertanam di kode client (bisa dilihat siapa pun lewat DevTools/
    // "View Source"), jadi ini BUKAN proteksi sungguhan terhadap orang yang niat & tahu caranya --
    // itu tetap tugas Firebase Security Rules (server-side; lihat firebase-security-rules.json
    // dan catatan di ADMIN_PIN_HASH). Tujuan tanda tangan ini cuma menaikkan "batas kesulitan": mencegah orang
    // asal-edit sim_session di DevTools (mis. ganti role jadi admin) lolos begitu saja -- kalau
    // sim_session diubah manual tanpa ikut menghitung ulang signature, sistem akan mendeteksinya
    // dan memaksa login ulang, bukan diam-diam mempercayainya seperti sebelumnya.
    const SESSION_SECRET = 'SIMAMBA-v4-session-2026';
    function v4SignSession(user, timestamp) { return CryptoJS.SHA256(JSON.stringify(user) + '|' + timestamp + '|' + SESSION_SECRET).toString(CryptoJS.enc.Hex); }
    // Sesi Admin/Kepsek TIDAK PERNAH disimpan ("Ingat Saya" tidak berlaku untuk keduanya) -- PIN diminta tiap
    // buka aplikasi. Dicek lewat role SAAT INI maupun baseRole (Admin yang sedang di "mode guru" tetap
    // baseRole-nya Admin). loadSession() juga menolak sesi berhak istimewa yang sudah ada/dipalsukan di
    // localStorage, walau tanda tangannya valid (SESSION_SECRET terlihat di source, jadi tanda tangan saja
    // tidak cukup untuk role yang bisa mengelola seluruh data).
    function isPrivilegedSession(u) {
      return !!u && [u.role, u.baseRole].some(r => r === ROLES.ADMIN || r === ROLES.HEADMASTER);
    }
    // Sesi Admin/Kepsek (diubah 2026-10): TIDAK lagi ditolak total. Disimpan di sessionStorage (hanya hidup
    // di tab/jendela ini, hilang saat tab ditutup), kedaluwarsa ADMIN_SESI_MS sejak aktivitas/ditinggalkannya
    // tab terakhir. Tujuannya: pindah tab/aplikasi lalu kembali dalam 15 menit tidak diminta PIN lagi, termasuk
    // saat browser HP membuang tab dari memori lalu memuatnya ulang. Tidak pernah masuk localStorage.
    const ADMIN_SESI_KEY = 'sim_session_adm';
    const ADMIN_SESI_MS = 30 * 60 * 1000;
    function saveSession(user) {
      try {
        const timestamp = Date.now();
        if (isPrivilegedSession(user)) {
          localStorage.removeItem('sim_session');
          sessionStorage.setItem(ADMIN_SESI_KEY, JSON.stringify({ user, timestamp, sig: v4SignSession(user, timestamp) }));
          return;
        }
        localStorage.setItem('sim_session', JSON.stringify({ user, timestamp, sig: v4SignSession(user, timestamp) }));
      } catch(e) {}
    }
    // Dipanggil auto-logout.js (aktivitas / tab ditinggalkan) untuk menggeser waktu kedaluwarsa sesi Admin/Kepsek.
    window.perpanjangSesiPrivileged = function() {
      try { if (typeof currentUser !== 'undefined' && currentUser && isPrivilegedSession(currentUser)) saveSession(currentUser); } catch (e) {}
    };
    // Sesi yang disimpan sebelum baseRole/key Admin-Kepsek ada tidak punya field itu, sehingga isPrivilegedSession()
    // (yang memeriksa baseRole) bisa meloloskan sesi lama. Dilengkapi SETELAH tanda tangan lolos, SEBELUM dicek.
    function lengkapiSesiLama(u) {
      if (!u || typeof u !== 'object') return u;
      if (!u.baseRole) u.baseRole = (u.role === ROLES.ADMIN || u.role === ROLES.HEADMASTER) ? u.role : ROLES.TEACHER;
      if (!u.key) {
        if (u.baseRole === ROLES.ADMIN) u.key = ADMIN_USER_KEY;
        else if (u.baseRole === ROLES.HEADMASTER) u.key = KEPSEK_USER_KEY;
      }
      return u;
    }
    function loadSession() {
      try {
        // 1) Sesi Admin/Kepsek (sessionStorage, 15 menit).
        const da = sessionStorage.getItem(ADMIN_SESI_KEY);
        if (da) {
          const pa = JSON.parse(da);
          if (!pa || Date.now() - pa.timestamp > ADMIN_SESI_MS) { sessionStorage.removeItem(ADMIN_SESI_KEY); }
          else if (pa.sig !== v4SignSession(pa.user, pa.timestamp)) { console.warn('[SI MAMBA] sesi Admin tidak valid, dihapus.'); sessionStorage.removeItem(ADMIN_SESI_KEY); }
          else if (isPrivilegedSession(lengkapiSesiLama(pa.user))) return pa.user;
          else sessionStorage.removeItem(ADMIN_SESI_KEY);
        }
        // 2) Sesi guru (localStorage, 24 jam).
        const d = localStorage.getItem('sim_session'); if (!d) return null;
        const p = JSON.parse(d);
        if (Date.now() - p.timestamp > 24*60*60*1000) { localStorage.removeItem('sim_session'); return null; }
        if (p.sig !== v4SignSession(p.user, p.timestamp)) { console.warn('[SI MAMBA] sim_session tidak valid (diubah manual?), sesi dihapus.'); localStorage.removeItem('sim_session'); return null; }
        lengkapiSesiLama(p.user);
        if (isPrivilegedSession(p.user)) { console.warn('[SI MAMBA] sesi Admin/Kepsek tidak boleh dipulihkan dari localStorage, sesi dihapus (login ulang dengan PIN).'); localStorage.removeItem('sim_session'); return null; }
        return p.user;
      } catch(e) { return null; }
    }
    // ---- INGAT HALAMAN TERAKHIR ----
    // Reload / pembaruan versi (SKIP_WAITING) / tab dihidupkan ulang tidak lagi selalu kembali ke Dashboard.
    // Disimpan per tab (sessionStorage), dihapus saat logout (clearSession) sehingga login baru tetap mulai di Dashboard.
    const HALAMAN_KEY = 'simamba_halaman_terakhir';
    let navBoot = false, navUser = false;          // navBoot: navigateTo milik proses boot (jangan dicatat); navUser: pengguna/halaman sudah pindah sendiri
    function catatHalaman(page) { try { sessionStorage.setItem(HALAMAN_KEY, String(page)); } catch (e) {} }
    function halamanPulih() {                      // nama halaman yang aman dipulihkan, atau null
      try {
        const p = sessionStorage.getItem(HALAMAN_KEY);
        if (!p || p === 'dashboard' || !document.getElementById('page-' + p)) return null;
        const mi = document.querySelector('.sidebar-menu .menu-item[data-page="' + p + '"]');
        for (let n = mi; n && n !== document.body; n = n.parentElement) {   // menu disembunyikan untuk peran/mode ini -> jangan dibuka
          if (n.classList.contains('hidden-tab') || n.classList.contains('hidden') || n.style.display === 'none') return null;
        }
        return p;
      } catch (e) { return null; }
    }
    function clearSession() { try { localStorage.removeItem('sim_session'); } catch (e) {} try { sessionStorage.removeItem(ADMIN_SESI_KEY); } catch (e) {} try { sessionStorage.removeItem(HALAMAN_KEY); } catch (e) {} }
    // Checkbox "Ingat Saya" dinonaktifkan (dan dimatikan) saat akun Admin/Kepsek dipilih di form login;
    // pilihan sebelumnya dipulihkan begitu pindah ke akun guru.
    function sinkronRememberMe() {
      const sel = document.getElementById('loginGuru'), cb = document.getElementById('rememberMe');
      if (!sel || !cb) return;
      const istimewa = sel.value === 'admin' || sel.value === 'kepsek';
      if (istimewa && !cb.disabled) { cb.dataset.prev = cb.checked ? '1' : ''; cb.checked = false; cb.disabled = true; cb.title = 'Admin/Kepsek wajib memasukkan PIN setiap kali masuk'; }
      else if (!istimewa && cb.disabled) { cb.disabled = false; cb.checked = cb.dataset.prev === '1'; cb.title = ''; }
    }

    function getTahunAjaran() { return currentTahunAjaran; }

    // ============================================================
    // TAHUN AJARAN & SEMESTER AKTIF (terpusat di Firebase, cuma Admin yang atur)
    // ============================================================
    function getSemesterOtomatis() {
      const bulan = new Date().getMonth() + 1;
      return bulan <= 6 ? 'Genap' : 'Ganjil';
    }
    // Menghitung tahun ajaran (format "YYYY/YYYY+1", sama seperti currentTahunAjaran) dari
    // sebuah tanggal "YYYY-MM-DD" -- tahun ajaran baru dianggap mulai bulan Juli (konsisten
    // dengan getSemesterOtomatis di atas: Jan-Jun = Genap/paruh kedua, Jul-Des = Ganjil/paruh
    // pertama tahun ajaran). Dipakai supaya DATA LAMA (dibuat sebelum field tahunAjaran ada di
    // record) ditaruh ke tahun ajaran yang SESUAI TANGGALNYA, bukan ikut nongol di rekap tahun
    // ajaran manapun yang sedang aktif -- lihat sesuaiTahunAjaranTermasukDataLama() di bawah.
    function tahunAjaranDariTanggal(tanggalStr) {
      if (!tanggalStr) return null;
      // Guard format: hanya terima "YYYY-M[M][-D...]" (termasuk ISO "YYYY-MM-DDTHH:mm..."). Teks lain, angka
      // epoch, atau tahun/bulan di luar jangkauan wajar dianggap tidak bisa dihitung (null), bukan ditebak.
      const mt = /^(\d{4})-(\d{1,2})(?:\D|$)/.exec(String(tanggalStr).trim());
      if (!mt) return null;
      const y = parseInt(mt[1], 10), m = parseInt(mt[2], 10);
      if (y < 2000 || y > 2100 || m < 1 || m > 12) return null;
      return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
    }
    // Ganti langsung untuk pola `!x.tahunAjaran || x.tahunAjaran === currentTahunAjaran` yang
    // sebelumnya dipakai di beberapa tempat (portal ortu, preview raport dsb): pola lama membuat
    // data lama tanpa field tahunAjaran SELALU lolos filter, sehingga nongol lagi di rekap tahun
    // ajaran manapun yang sedang aktif (bukan cuma tahun ajaran asalnya) -- setiap kali admin
    // pindah tahun ajaran aktif, data lama itu "ikut pindah" juga seolah data tahun ini.
    // Sekarang data lama dicocokkan ke tahun ajaran hasil hitung dari tanggalnya sendiri.
    function sesuaiTahunAjaranTermasukDataLama(x) {
      if (x.tahunAjaran) return x.tahunAjaran === currentTahunAjaran;
      const inferred = tahunAjaranDariTanggal(x.tanggal || x.dibuat || x.createdAt || x.updatedAt);
      if (inferred) return inferred === currentTahunAjaran;
      // Tidak ada tahunAjaran DAN tanggal tak bisa dihitung: dulu dibiarkan tampil di tahun ajaran mana pun
      // (fallback true) sehingga "ikut pindah" tiap ganti tahun ajaran. Sekarang disembunyikan & dilaporkan.
      laporRecordTanpaTanggal(x);
      return false;
    }
    let _taTanpaTanggalHitung = 0, _taTanpaTanggalDiberitahu = false;
    function laporRecordTanpaTanggal(x) {
      _taTanpaTanggalHitung++;
      if (_taTanpaTanggalHitung === 1) console.warn('[SI MAMBA] Ada record tanpa tahunAjaran & tanpa tanggal yang bisa dihitung; disembunyikan dari tampilan tahun ajaran aktif. Contoh:', x);
      if (!_taTanpaTanggalDiberitahu && currentUser && isAdmin()) {
        _taTanpaTanggalDiberitahu = true;
        try { toast('⚠️ Ada data lama tanpa tahun ajaran & tanpa tanggal, sehingga disembunyikan. Jalankan migrasiTahunAjaranDataLama() (dry-run) di console, atau beri opsi tahunAjaranDefault.', true, 9000); } catch (e) {}
      }
    }
    // Peringatan dini untuk Admin: loader memakai query orderByChild('tahunAjaran').equalTo(...) sehingga record
    // lama TANPA field itu tidak pernah dimuat di aplikasi staf, padahal Portal Ortu (sesuaiTahunAjaranTermasukDataLama)
    // bisa menampilkannya -> angka kedua sisi berbeda. Cek ringan (1 record per koleksi, hanya yang sudah terindeks).
    const CEK_MIGRASI_TA_KOLEKSI = ['attendance', 'grades', 'journal', 'teacher_attendance', 'early_leave_requests', 'events',
      'event_attendance', 'ujian', 'ujian_attendance', 'ekskul_pic_honor_v4', 'iuran_siswa', 'kedisiplinan_siswa',
      'buku_penghubung', 'religi_attendance', 'activity_attendance_v4', 'extracurricular_attendance_v4'];
    let _cekMigrasiTaSudah = false;
    function cekDataLamaBelumMigrasi() {
      if (_cekMigrasiTaSudah || !db || !currentUser || !isAdmin() || !navigator.onLine) return;
      // Cukup sekali per 7 hari per perangkat supaya Admin tidak dipelototi toast yang sama tiap login.
      const KUNCI_CEK = 'simambaCekMigrasiTA';
      try { const t = parseInt(localStorage.getItem(KUNCI_CEK) || '0', 10); if (t && Date.now() - t < 7 * 864e5) return; } catch (e) {}
      _cekMigrasiTaSudah = true;
      Promise.all(CEK_MIGRASI_TA_KOLEKSI.map(path =>
        db.ref(path).orderByChild('tahunAjaran').equalTo(null).limitToFirst(1).once('value')
          .then(snap => snap.exists() ? path : null).catch(() => null)
      )).then(hasil => {
        const ada = hasil.filter(Boolean);
        // Tandai dicek hanya bila bersih ATAU peringatan sudah ditampilkan.
        try { localStorage.setItem(KUNCI_CEK, String(Date.now())); } catch (e) {}
        if (!ada.length) return;
        console.warn('[SI MAMBA] Data lama tanpa field tahunAjaran ditemukan di:', ada);
        toast(`⚠️ Admin: ada data lama belum bertahun ajaran di ${ada.length} koleksi (${ada.slice(0, 3).join(', ')}${ada.length > 3 ? ', …' : ''}). Data itu tidak muncul di rekap staf tetapi bisa muncul di Portal Ortu. Jalankan migrasiTahunAjaranDataLama() di console (dry-run dulu).`, true, 12000);
      }).catch(() => {});
    }
    function updateTahunAjaranBadge() {
      const badge = document.getElementById('tahunAjaranBadge');
      if (badge) {
        // bentuk pendek (26/27) dipakai CSS di layar HP supaya topbar tidak melebar
        const ta = String(currentTahunAjaran || ''), taPendek = ta.replace(/^\d{2}(\d{2})\/\d{2}(\d{2})$/, '$1/$2');
        badge.innerHTML = `📅 <span class="ta-full">${escapeHtml(ta)}</span><span class="ta-short">${escapeHtml(taPendek)}</span> · ${escapeHtml(String(currentSemesterAktif || ''))}`;
      }
    }
    // Mirror sinkron (localStorage) dari pengaturan sekolah terakhir yang diketahui di perangkat ini, supaya
    // boot bisa mulai memuat data SEKETIKA dengan tebakan terbaik (bukan nunggu school_settings ~ratusan ms
    // sampai 3,5 detik). Isinya: tahun ajaran, semester, & daftar kelas (KELAS_LIST ikut menentukan filter
    // loaderScopeKelas() utk Admin/Kepsek, jadi harus benar dari awal juga).
    const SCHOOL_SETTINGS_MIRROR_KEY = 'simambaSchoolSettingsLast';
    function pakaiPengaturanTerakhir() {
      try {
        const m = JSON.parse(localStorage.getItem(SCHOOL_SETTINGS_MIRROR_KEY) || 'null');
        if (!m) return;
        if (m.tahun) currentTahunAjaran = m.tahun;
        if (m.semester) currentSemesterAktif = m.semester;
        if (Array.isArray(m.kelasList) && m.kelasList.length > 0) setKelasList(m.kelasList);
        if (m.jendelaAbsen) setJendelaAbsen(m.jendelaAbsen);
      } catch (e) { /* localStorage diblokir/rusak -> pakai default kode */ }
    }
    function simpanMirrorPengaturan() {
      try { localStorage.setItem(SCHOOL_SETTINGS_MIRROR_KEY, JSON.stringify({ tahun: currentTahunAjaran, semester: currentSemesterAktif, kelasList: [...KELAS_LIST], jendelaAbsen: JENDELA_ABSEN })); } catch (e) {}
    }
    function terapkanSemesterKeInput() {
      const g = document.getElementById('gradeSemester'); if (g) g.value = currentSemesterAktif;
      const r = document.getElementById('rekapNilaiSemester'); if (r) r.value = currentSemesterAktif;
    }
    let schoolSettingsListenerAttached = false;
    function watchSchoolSettings(onReady) {
      if (schoolSettingsListenerAttached) { if (onReady) onReady(); return; }
      if (!db) { console.error('[SI MAMBA] Firebase belum siap (db kosong) -- lewati watchSchoolSettings.'); if (onReady) onReady(); return; }
      schoolSettingsListenerAttached = true;
      let firstLoad = true;
      let readyCalled = false;
      function callReadyOnce() { if (readyCalled) return; readyCalled = true; if (onReady) onReady(); }

      // Kalau sedang offline, ATAU listener Firebase tidak kunjung dapat data pertama dalam
      // beberapa detik (koneksi ada tapi lemot/nyangkut), jangan biarkan app "loading"
      // selamanya -- pakai Tahun Ajaran/Semester terakhir yang tersimpan di IndexedDB (kalau
      // ada), lalu tetap lanjut ke loadAllData() yang akan sendiri mendeteksi offline dan
      // memuat sisa data dari cache. Diturunkan dari 6 detik -> 3.5 detik: ini cuma baca satu
      // node kecil (school_settings), tidak perlu waktu selama itu di kondisi normal, dan makin
      // cepat fallback-nya = makin cepat proses login lanjut ke tahap berikutnya.
      const fallbackTimer = !onReady ? null : setTimeout(() => {
        if (readyCalled) return;
        if (window.SIMambaOfflineDB) {
          SIMambaOfflineDB.getCache('schoolSettings').then(saved => {
            if (saved) { currentTahunAjaran = saved.tahunAjaran || currentTahunAjaran; currentSemesterAktif = saved.semester || currentSemesterAktif; updateTahunAjaranBadge(); }
            callReadyOnce();
          }).catch(() => callReadyOnce());
        } else callReadyOnce();
      }, navigator.onLine ? 3500 : 300);

      // Nilai yang dipakai loadAllData() saat boot (tebakan dari mirror/default) -- dibandingkan dgn nilai asli
      // dari snapshot pertama utk memutuskan perlu muat ulang atau tidak.
      const tahunAwal = currentTahunAjaran, semesterAwal = currentSemesterAktif, kelasAwal = JSON.stringify(KELAS_LIST);
      db.ref('school_settings').on('value', snap => {
        const s = snap.val() || {};
        const newTahun = s.tahunAjaranAktif || currentTahunAjaran;
        const newSemester = s.semesterAktif || currentSemesterAktif;
        applyMadrasahProfileFromSnapshot(s);
        // Daftar kelas ("Kelas 1".."Kelas 6" secara default) sekarang bisa diubah Admin dari
        // Firebase -- kalau ada & valid, timpa KELAS_LIST dan langsung refresh semua dropdown
        // yang menampilkannya di seluruh aplikasi, supaya berubah otomatis tanpa reload manual.
        if (Array.isArray(s.kelasList) && s.kelasList.length > 0) {
          const berubah = JSON.stringify(s.kelasList) !== JSON.stringify(KELAS_LIST);
          setKelasList(s.kelasList);
          if (berubah && !firstLoad) refreshAllKelasDropdowns();
          if (berubah) simpanMirrorPengaturan();
        }
        { // jendela jam absen guru (null/tidak ada -> bawaan)
          const sebelum = JSON.stringify(JENDELA_ABSEN);
          setJendelaAbsen(s.jendelaAbsen);
          if (JSON.stringify(JENDELA_ABSEN) !== sebelum) { simpanMirrorPengaturan(); updateLabelJamPulang(); }
        }
        if (document.getElementById('page-profil-sekolah') && !document.getElementById('page-profil-sekolah').classList.contains('hidden')) { renderKopSuratPreview(); renderKelasListEditor(); renderStrukturRingkasan(); }
        if (firstLoad) {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          currentTahunAjaran = newTahun; currentSemesterAktif = newSemester;
          updateTahunAjaranBadge();
          terapkanSemesterKeInput();
          simpanMirrorPengaturan();
          if (window.SIMambaOfflineDB) SIMambaOfflineDB.setCache('schoolSettings', { tahunAjaran: newTahun, semester: newSemester }).catch(() => {});
          firstLoad = false;
          callReadyOnce();
          // REKONSILIASI (boot tanpa menunggu school_settings): kalau tebakan awal ternyata beda dari nilai asli
          // (tahun/semester ATAU daftar kelas -- yang terakhir ikut menentukan filter loaderScopeKelas()),
          // data yang sudah/sedang dimuat memakai nilai salah -> muat ulang SEKARANG, diam-diam (tanpa toast
          // "diubah Admin", karena ini bukan perubahan oleh Admin, hanya koreksi tebakan).
          const beda = newTahun !== tahunAwal || newSemester !== semesterAwal || JSON.stringify(KELAS_LIST) !== kelasAwal;
          if (beda && !onReady && currentUser) {
            if (JSON.stringify(KELAS_LIST) !== kelasAwal) refreshAllKelasDropdowns();
            // v4LoadCore() hanya dipanggil dari sini kalau BUKAN lagi dijadwalkan oleh boot (v4BootPending/
            // v4CoreDeferred) -- keduanya akan memanggilnya sendiri begitu Fase 2 selesai. Dievaluasi SEKARANG,
            // bukan di dalam callback, supaya tidak dobel dgn pembungkus window.loadAllData.
            const perluV4 = !v4BootPending && !v4CoreDeferred && typeof v4LoadCore === 'function';
            loadAllData(null, function () { if (perluV4) v4LoadCore(); });
          }
          return;
        }
        // Perubahan setelah initial load (Admin ubah dari sesi lain) -> beri tahu & refresh semua data
        if (newTahun !== currentTahunAjaran || newSemester !== currentSemesterAktif) {
          currentTahunAjaran = newTahun; currentSemesterAktif = newSemester;
          updateTahunAjaranBadge();
          terapkanSemesterKeInput();
          simpanMirrorPengaturan();
          if (window.SIMambaOfflineDB) SIMambaOfflineDB.setCache('schoolSettings', { tahunAjaran: newTahun, semester: newSemester }).catch(() => {});
          toast(`🔄 Tahun Ajaran/Semester aktif diubah Admin menjadi ${newTahun} · ${newSemester}. Data diperbarui otomatis.`, false, 7000);
          // PENTING: v4LoadCore() (data modul V4 -- aktivitas, tahfidz, ekskul, honor, dll,
          // semuanya difilter berdasarkan currentTahunAjaran) TIDAK otomatis ikut ter-refresh
          // hanya dengan memanggil loadAllData() di sini. Wrapper window.loadAllData() cuma
          // memanggil v4LoadCore() kalau flag v4CoreDeferred masih true, dan flag itu cuma
          // di-set true SEKALI saat boot awal lalu langsung dipakai/direset -- jadi tanpa baris
          // di bawah ini, data V4 akan tetap memakai tahun ajaran LAMA setelah Admin ganti tahun
          // ajaran aktif, walau seluruh dataset non-V4 lainnya sudah benar ter-refresh.
          loadAllData(null, function () { if (typeof v4LoadCore === 'function') v4LoadCore(); });
        }
      }, err => {
        // Error eksplisit (mis. permission-denied) -- langsung lanjut ke fallback SEKARANG,
        // tidak usah menunggu fallbackTimer 3.5 detik habis dulu kalau errornya sudah pasti.
        console.error('[SI MAMBA] Gagal memuat school_settings:', err && err.message);
        clearTimeout(fallbackTimer);
        callReadyOnce();
      });
    }
    function renderProfilSekolah() {
      if (!isAdmin()) return;
      document.getElementById('profilTahunAjaran').value = currentTahunAjaran;
      document.getElementById('profilSemester').value = currentSemesterAktif;
      document.getElementById('profilNamaMadrasah').value = MADRASAH.nama || '';
      document.getElementById('profilNsm').value = MADRASAH.nsm || '';
      document.getElementById('profilJalan').value = MADRASAH.jalan || '';
      document.getElementById('profilDesa').value = MADRASAH.desa || '';
      document.getElementById('profilKecamatan').value = (MADRASAH.kecamatan||'').replace(/^Kecamatan \.\.\.$/,'');
      document.getElementById('profilKabupaten').value = (MADRASAH.kabupaten||'').replace(/^Kabupaten \.\.\.$/,'');
      document.getElementById('profilProvinsi').value = MADRASAH.provinsi || '';
      document.getElementById('profilKodePos').value = MADRASAH.kodePos || '';
      document.getElementById('profilTelp').value = MADRASAH.telp || '';
      document.getElementById('profilEmail').value = MADRASAH.email || '';
      document.getElementById('profilWebsite').value = MADRASAH.website || '';
      document.getElementById('profilKepsekNama').value = MADRASAH.kepala_sekolah || '';
      document.getElementById('profilKepsekNip').value = MADRASAH.nip_kepala_sekolah || '';
      document.getElementById('profilBendaharaNama').value = MADRASAH.bendahara || '';
      document.getElementById('profilBendaharaNip').value = MADRASAH.nip_bendahara || '';
      document.getElementById('profilOperatorNama').value = MADRASAH.operator || '';
      document.getElementById('profilOperatorNip').value = MADRASAH.nip_operator || '';
      db.ref('school_settings').once('value', snap => {
        const s = snap.val();
        const info = document.getElementById('profilSekolahInfo');
        const infoMadrasah = document.getElementById('profilMadrasahInfo');
        const teks = (s && s.updatedBy) ? `Terakhir diubah oleh ${s.updatedBy} pada ${new Date(s.updatedAt).toLocaleString('id-ID')}` : 'Belum pernah diubah — masih memakai nilai default.';
        if (info) info.textContent = teks;
        if (infoMadrasah) infoMadrasah.textContent = (s && s.profilUpdatedBy) ? `Terakhir diubah oleh ${s.profilUpdatedBy} pada ${new Date(s.profilUpdatedAt).toLocaleString('id-ID')}` : 'Belum pernah diubah — masih memakai nilai default.';
      });
      renderKopSuratPreview();
      renderKelasListEditor();
      renderStrukturRingkasan();
      renderTtdKepalaPreview();
      const qrCard = document.getElementById('absenQrSettingsCard');
      if (qrCard) qrCard.style.display = 'block';
      v4RenderAbsenQrSettingsForm();
    }
    // Pratinjau kop surat -- pakai fungsi generateKopSuratHTML() yang SAMA dengan yang dipakai
    // di surat/raport sungguhan, supaya pratinjau ini benar-benar mewakili tampilan aslinya
    // (bukan markup terpisah yang bisa beda/ketinggalan zaman).
    function renderKelasListEditor() {
      renderJendelaAbsenEditor();
      const box = document.getElementById('kelasListEditor'); if (!box) return;
      box.value = KELAS_LIST.join('\n');
      const info = document.getElementById('kelasListInfo');
      if (info) {
        db.ref('school_settings').once('value', snap => {
          const s = snap.val();
          info.textContent = (s && s.kelasListUpdatedBy) ? `Terakhir diubah oleh ${s.kelasListUpdatedBy} pada ${new Date(s.kelasListUpdatedAt).toLocaleString('id-ID')}` : `Masih memakai daftar default (${KELAS_LIST.length} kelas).`;
        });
      }
    }
    // ---- Editor jendela jam absen guru (kartu "Jendela Absen Guru" di Profil Sekolah) ----
    const JA_FIELDS = [['datang','jaDatang'],['pulang','jaPulang'],['pulangJumat','jaPulangJumat'],['pulangSabtu','jaPulangSabtu']];
    function renderJendelaAbsenEditor() {
      JA_FIELDS.forEach(([k, id]) => {
        const m = document.getElementById(id + 'Mulai'), e = document.getElementById(id + 'Selesai');
        if (m) m.value = JENDELA_ABSEN[k].mulai;
        if (e) e.value = JENDELA_ABSEN[k].selesai;
      });
      const info = document.getElementById('jendelaAbsenInfo');
      if (info) {
        db.ref('school_settings').once('value', snap => {
          const s = snap.val() || {};
          info.textContent = s.jendelaAbsenUpdatedBy ? `Terakhir diubah oleh ${s.jendelaAbsenUpdatedBy} pada ${new Date(s.jendelaAbsenUpdatedAt).toLocaleString('id-ID')}` : 'Masih memakai jam bawaan.';
        });
      }
    }
    function simpanJendelaAbsen() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const baru = {};
      for (const [k, id] of JA_FIELDS) {
        const m = (document.getElementById(id + 'Mulai') || {}).value, e = (document.getElementById(id + 'Selesai') || {}).value;
        if (!jendelaAbsenValid({ mulai: m, selesai: e })) return toast('⚠️ Isi jam mulai dan selesai dengan benar (jam mulai harus lebih awal dari jam selesai).', true);
        baru[k] = { mulai: m, selesai: e };
      }
      tulisSettingsAdmin('school_settings', { jendelaAbsen: baru, jendelaAbsenUpdatedBy: currentUser.name, jendelaAbsenUpdatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        setJendelaAbsen(baru); simpanMirrorPengaturan(); updateLabelJamPulang(); renderJendelaAbsenEditor();
        toastTersimpan();
        addLog('ubah_jendela_absen', JSON.stringify(baru));
      });
    }
    function resetJendelaAbsen() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!confirm('Kembalikan jendela jam absen guru ke jam bawaan (Datang 06:00-07:30; Pulang 11:00-12:30, Jumat 10:00-12:00, Sabtu 10:30-12:00)?')) return;
      tulisSettingsAdmin('school_settings', { jendelaAbsen: null, jendelaAbsenUpdatedBy: currentUser.name, jendelaAbsenUpdatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        setJendelaAbsen(null); simpanMirrorPengaturan(); updateLabelJamPulang(); renderJendelaAbsenEditor();
        toast('✅ Jam absen guru dikembalikan ke bawaan.');
        addLog('reset_jendela_absen', '');
      });
    }
    // Menyimpan daftar kelas baru dari textarea (satu nama kelas per baris) ke Firebase, lalu
    // langsung menerapkannya ke SELURUH aplikasi (semua dropdown/checkbox kelas ikut ter-refresh
    // otomatis) tanpa perlu reload halaman. Ini menggantikan ~30 titik hardcode "Kelas 1".."Kelas
    // 6" sebelumnya -- sekarang Admin cukup edit di SINI, satu tempat.
    function simpanKelasList() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const raw = document.getElementById('kelasListEditor').value;
      const newList = raw.split('\n').map(s => s.trim()).filter(Boolean);
      if (newList.length === 0) return toast('⚠️ Daftar kelas tidak boleh kosong!', true);
      const unique = new Set(newList);
      if (unique.size !== newList.length) return toast('⚠️ Ada nama kelas yang duplikat, mohon perbaiki dulu.', true);
      if (!confirm(`Yakin ubah daftar kelas jadi ${newList.length} kelas berikut?\n\n${newList.join(', ')}\n\nSemua dropdown & data yang merujuk nama kelas LAMA (siswa, jadwal, dll) TIDAK ikut berubah otomatis -- kalau ada nama kelas yang diubah/dihapus, pastikan data terkait sudah disesuaikan juga.`)) return;
      tulisSettingsAdmin('school_settings', { kelasList: newList, kelasListUpdatedBy: currentUser.name, kelasListUpdatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        setKelasList(newList);
        refreshAllKelasDropdowns();
        renderKelasListEditor();
        toastTersimpan('Daftar kelas diperbarui');
        addLog('ubah_daftar_kelas', newList.join(', '));
      });
    }
    // Pratinjau kop surat -- pakai fungsi generateKopSuratHTML() yang SAMA dengan yang dipakai
    // di surat/raport sungguhan, supaya pratinjau ini benar-benar mewakili tampilan aslinya
    // (bukan markup terpisah yang bisa beda/ketinggalan zaman).
    // Ringkasan "Struktur Pengurus" yang terlihat LANGSUNG setelah disimpan -- supaya Admin
    // punya konfirmasi visual jelas bahwa data Bendahara/Operator (yang sebelumnya tersimpan
    // tapi tidak ditampilkan di mana pun, sehingga terasa seperti "tidak bisa diedit") benar-benar
    // tersimpan dan dipakai. Kepala Sekolah sudah otomatis dipakai di tanda tangan semua surat;
    // Bendahara ditampilkan juga sebagai tanda tangan di rekap Iuran Mingguan (lihat
    // iuranTtdBendahara()).
    function renderStrukturRingkasan() {
      const box = document.getElementById('profilStrukturRingkasan'); if (!box) return;
      const baris = (label, nama, nip, dipakaiDi) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #dcfce7;font-size:13px;">
        <div><strong>${escapeHtml(label)}:</strong> ${nama ? escapeHtml(nama) : '<span style="color:#dc2626;">belum diisi</span>'}${nip?' <span class="text-muted">(NIP '+escapeHtml(nip)+')</span>':''}</div>
        <span style="font-size:11px;color:#059669;">${dipakaiDi}</span>
      </div>`;
      box.innerHTML = `<p style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:6px;">✅ Struktur Pengurus Tersimpan & Aktif Dipakai:</p>
        ${baris('Kepala Sekolah', MADRASAH.kepala_sekolah, MADRASAH.nip_kepala_sekolah, '📄 tanda tangan semua surat & raport')}
        ${baris('Bendahara', MADRASAH.bendahara, MADRASAH.nip_bendahara, '🕌 tanda tangan rekap Infaq mingguan')}
        ${baris('Operator Madrasah', MADRASAH.operator, MADRASAH.nip_operator, '📋 dicatat di profil, siap dipakai fitur mendatang')}`;
    }
    function renderKopSuratPreview() {
      const box = document.getElementById('profilKopSuratPreview'); if (!box) return;
      box.innerHTML = generateKopSuratHTML();
    }
    function deteksiSemesterOtomatis() {
      document.getElementById('profilSemester').value = getSemesterOtomatis();
    }
    function simpanProfilSekolah() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const tahunAjaranBaru = document.getElementById('profilTahunAjaran').value;
      const semesterBaru = document.getElementById('profilSemester').value;
      if (!confirm(`Yakin ubah Tahun Ajaran Aktif jadi ${tahunAjaranBaru} dan Semester jadi ${semesterBaru}?\n\nSemua user akan otomatis melihat data tahun ajaran ini.`)) return;
      // Pakai update() (bukan set()) supaya field identitas madrasah / struktur pengurus yang
      // disimpan lewat simpanProfilMadrasah() tidak ikut terhapus saat form ini disimpan terpisah.
      tulisSettingsAdmin('school_settings', { tahunAjaranAktif: tahunAjaranBaru, semesterAktif: semesterBaru, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toastTersimpan(); addLog('ubah_profil_sekolah', `${tahunAjaranBaru} - ${semesterBaru}`);
      });
    }
    function simpanProfilMadrasah() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const nsm = document.getElementById('profilNsm').value.trim();
      if (nsm && !/^\d{6,20}$/.test(nsm)) return toast('⚠️ NSM harus berupa angka (6-20 digit).', true);
      const data = {
        namaMadrasah: document.getElementById('profilNamaMadrasah').value.trim() || MADRASAH.nama,
        nsm,
        jalan: document.getElementById('profilJalan').value.trim(),
        desa: document.getElementById('profilDesa').value.trim(),
        kecamatan: document.getElementById('profilKecamatan').value.trim(),
        kabupaten: document.getElementById('profilKabupaten').value.trim(),
        provinsi: document.getElementById('profilProvinsi').value.trim(),
        kodePos: document.getElementById('profilKodePos').value.trim(),
        telp: document.getElementById('profilTelp').value.trim(),
        email: document.getElementById('profilEmail').value.trim(),
        website: document.getElementById('profilWebsite').value.trim(),
        kepalaSekolah: document.getElementById('profilKepsekNama').value.trim(),
        nipKepalaSekolah: document.getElementById('profilKepsekNip').value.trim(),
        bendahara: document.getElementById('profilBendaharaNama').value.trim(),
        nipBendahara: document.getElementById('profilBendaharaNip').value.trim(),
        operator: document.getElementById('profilOperatorNama').value.trim(),
        nipOperator: document.getElementById('profilOperatorNip').value.trim(),
        profilUpdatedBy: currentUser.name,
        profilUpdatedAt: new Date().toISOString()
      };
      if (!data.kepalaSekolah) return toast('⚠️ Nama Kepala Sekolah wajib diisi (dipakai untuk tanda tangan surat).', true);
      tulisSettingsAdmin('school_settings', data, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        applyMadrasahProfileFromSnapshot(data);
        renderStrukturRingkasan();
        renderKopSuratPreview();
        toastTersimpan('Kop surat ikut terbarui');
        addLog('ubah_identitas_madrasah', data.namaMadrasah);
      });
    }

    // ============================================================
    // LOG AKTIVITAS
    // ============================================================
    function addLog(action, detail = '') {
      if (!currentUser) return;
      // PENTING: dibungkus try/catch supaya kegagalan mencatat log (mis. Firebase belum
      // siap/koneksi lambat) TIDAK PERNAH menghentikan fungsi pemanggil (login/logout dll).
      // Sebelumnya addLog() dipanggil sebagai baris pertama di login()/logout() TANPA
      // penanganan error -- kalau db.ref() melempar error di sini, seluruh sisa fungsi
      // pemanggil ikut berhenti, membuat tombol Masuk/Keluar terlihat "tidak responsif"
      // (klik tidak berefek apa pun, tanpa pesan error ke user).
      try {
        const log = { user: currentUser.name, guruKey: currentUser.key, role: currentUser.role, action, detail, waktu: new Date().toISOString(), tanggal: tglLokal(), tahunAjaran: currentTahunAjaran };
        const ref = db.ref('logs').push();
        ref.set(JSON.parse(JSON.stringify(log)), err => { if (err) console.error('Gagal simpan log:', err); });
      } catch (e) {
        console.error('[SI MAMBA] addLog gagal (tidak fatal, aksi utama tetap lanjut):', e);
      }
    }

    function loadLogs(callback) {
      if (!isAdmin()) { allLogs = []; renderLogs(); if(callback) callback(); return; }
      db.ref('logs').orderByChild('waktu').limitToLast(30).once('value', snap => {
        allLogs = [];
        snap.forEach(child => { const log = child.val(); log.key = child.key; allLogs.push(log); });
        allLogs.reverse();
        renderLogs();
        if(callback) callback();
      });
    }

    function renderLogs() {
      const container = document.getElementById('logList');
      if (!container) return;
      if (!isAdmin()) { container.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;text-align:center;">🔒 Hanya Admin yang bisa melihat log aktivitas.</p>'; return; }
      if (allLogs.length === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;">Belum ada aktivitas.</p>'; return; }
      const iconMap = { 'login':'🔑','logout':'🚪','tambah_siswa':'➕','edit_siswa':'✏️','hapus_siswa':'🗑️','tambah_guru':'👨‍🏫','edit_guru':'✏️','hapus_guru':'🗑️','reset_pin':'🔄','ganti_pin':'🔑','simpan_absensi':'📅','simpan_jurnal':'📓','absen_guru':'📸','simpan_religi':'🕌','backup':'💾','import':'📥','export':'📤','reset_data':'⚠️','promosi_kelas':'📚','kelulusan':'🎓','simpan_surat':'📄','simpan_jadwal':'📅','export_rekap_nilai':'📊' };
      let html = '';
      allLogs.slice(0,10).forEach(log => {
        const icon = iconMap[log.action] || '📌';
        const waktu = log.waktu ? new Date(log.waktu).toLocaleString('id-ID', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}) : '-';
        const detail = log.detail ? ' - ' + escapeHtml(log.detail) : '';
        html += `<div class="log-item"><span><span class="log-icon">${icon}</span> <span class="log-user">${escapeHtml(log.user||'Sistem')}</span> <span class="log-action">${escapeHtml(log.action)}${detail}</span></span><span class="log-time">${waktu}</span></div>`;
      });
      container.innerHTML = html;
    }
    function loadLogsFull() {
      if (!isAdmin()) return;
      document.getElementById('logListFull').innerHTML = '<p class="text-muted" style="font-size:13px;">Memuat log...</p>';
      db.ref('logs').orderByChild('waktu').limitToLast(500).once('value', snap => {
        allLogsFull = [];
        snap.forEach(child => { const log = child.val(); log.key = child.key; allLogsFull.push(log); });
        allLogsFull.reverse();
        const userSelect = document.getElementById('logFilterUser');
        if (userSelect) {
          const currentVal = userSelect.value;
          const namaSet = new Set(allLogsFull.map(l => l.user).filter(Boolean));
          userSelect.innerHTML = '<option value="">-- Semua Pengguna --</option>' + [...namaSet].sort().map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
          userSelect.value = currentVal;
        }
        logFullPage = 1;
        renderLogsFull();
      });
    }
    function renderLogsFull() {
      const container = document.getElementById('logListFull');
      if (!container) return;
      if (!isAdmin()) { container.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;text-align:center;">🔒 Hanya Admin yang bisa melihat log aktivitas.</p>'; return; }
      const filterUser = document.getElementById('logFilterUser').value, filterAction = document.getElementById('logFilterAction').value;
      const filtered = allLogsFull.filter(log => (!filterUser || log.user === filterUser) && (!filterAction || log.action === filterAction));
      if (filtered.length === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;">Tidak ada log yang cocok.</p>'; document.getElementById('logFullPagination').innerHTML = ''; return; }
      const iconMap = { 'login':'🔑','logout':'🚪','tambah_siswa':'➕','edit_siswa':'✏️','hapus_siswa':'🗑️','tambah_guru':'👨‍🏫','edit_guru':'✏️','hapus_guru':'🗑️','tambah_user':'➕','reset_pin':'🔄','ganti_pin':'🔑','simpan_absensi':'📅','simpan_jurnal':'📓','edit_jurnal':'✏️','ajukan_jurnal_susulan':'📤','setujui_jurnal_susulan':'✅','tolak_jurnal_susulan':'❌','absen_guru':'📸','simpan_nilai':'📊','simpan_religi':'🕌','backup':'💾','import':'📥','export':'📤','reset_data':'⚠️','promosi_kelas':'📚','kelulusan':'🎓','simpan_surat':'📄','simpan_jadwal':'📅','export_rekap_nilai':'📊' };
      const totalItems = filtered.length, ps = pagerSize('log') || totalItems, totalPages = Math.max(1, Math.ceil(totalItems/ps));
      if (logFullPage > totalPages) logFullPage = totalPages; if (logFullPage < 1) logFullPage = 1;
      const start = (logFullPage-1)*ps, end = Math.min(start+ps, totalItems), pageItems = filtered.slice(start,end);
      let html = '';
      pageItems.forEach(log => {
        const icon = iconMap[log.action] || '📌';
        const waktu = log.waktu ? new Date(log.waktu).toLocaleString('id-ID', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short',year:'numeric'}) : '-';
        const detail = log.detail ? ' - ' + escapeHtml(log.detail) : '';
        html += `<div class="log-item"><span><span class="log-icon">${icon}</span> <span class="log-user">${escapeHtml(log.user||'Sistem')}</span> <span class="log-action">${escapeHtml(log.action)}${detail}</span></span><span class="log-time">${waktu}</span></div>`;
      });
      container.innerHTML = html;
      document.getElementById('logFullPagination').innerHTML = pagerHtml('log', totalItems, totalPages, start, end, 'log');
    }
    // ============================================================
    function showGantiPinModal() { if (!currentUser) return toast('Login dulu!', true); document.getElementById('gantiPinModal').classList.add('show'); document.getElementById('oldPin').value=''; document.getElementById('newPin').value=''; document.getElementById('confirmPin').value=''; }
    function closeGantiPinModal() { document.getElementById('gantiPinModal').classList.remove('show'); }
    function saveGantiPin() {
      if (!currentUser) return toast('Login dulu!', true);
      if (isBusy('saveGantiPin')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      const pinLama = document.getElementById('oldPin').value.trim(), pinBaru = document.getElementById('newPin').value.trim(), pinKonfirmasi = document.getElementById('confirmPin').value.trim();
      if (!pinLama || !pinBaru || !pinKonfirmasi) return toast('Semua field wajib diisi!', true);
      if (!/^\d{6}$/.test(pinBaru)) return toast('PIN baru harus 6 digit!', true);
      if (pinBaru !== pinKonfirmasi) return toast('PIN baru tidak cocok!', true);
      const guru = allGuru.find(g => g.key === currentUser.key);
      if (!guru) return toast('Guru tidak ditemukan!', true);
      if (typeof kredVerifikasi !== 'function') return toast('Modul kredensial belum termuat. Muat ulang halaman lalu coba lagi.', true);
      // [KREDENSIAL v1] PIN lama diperiksa lewat indeks kredensial; hash tidak lagi ditulis ke data guru.
      const lepas = kunciSimpanModal('saveGantiPin', 'gantiPinModal', 'saveGantiPin');   // FIX: kunci tombol Simpan (anti ketuk ganda)
      kredVerifikasi(guru, pinLama).then(h => {
        if (!h.ok) return toast('PIN lama salah!', true);
        return kredGantiPinSendiri(guru, pinLama, pinBaru, h).then(() => {
          toastTersimpan('PIN berhasil diganti'); addLog('ganti_pin', 'PIN diganti'); closeGantiPinModal(); reloadDataset('logs'); loadGuruListForLogin();
        });
      }).catch(err => toast('Gagal: ' + (err && err.message ? err.message : err), true)).finally(lepas);
    }

    function resetPinGuru(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const guru = allGuru.find(g => g.key === key);
      if (!guru) return toast('Guru tidak ditemukan!', true);
      document.getElementById('resetPinGuruKey').value = key;
      document.getElementById('resetPinGuruName').textContent = guru.name;
      document.getElementById('resetPinNew').value = '';
      document.getElementById('resetPinConfirm').value = '';
      document.getElementById('resetPinModal').classList.add('show');
    }
    function closeResetPinModal() { document.getElementById('resetPinModal').classList.remove('show'); }
    function saveResetPin() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('saveResetPin')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      const key = document.getElementById('resetPinGuruKey').value;
      const guru = allGuru.find(g => g.key === key);
      if (!guru) return toast('Guru tidak ditemukan!', true);
      const pinBaru = document.getElementById('resetPinNew').value.trim(), pinKonfirmasi = document.getElementById('resetPinConfirm').value.trim();
      if (!/^\d{6}$/.test(pinBaru)) return toast('PIN harus 6 digit!', true);
      if (pinBaru !== pinKonfirmasi) return toast('Konfirmasi PIN baru tidak cocok!', true);
      if (typeof kredAdminSetPin !== 'function') return toast('Modul kredensial belum termuat. Muat ulang halaman lalu coba lagi.', true);
      const lepas = kunciSimpanModal('saveResetPin', 'resetPinModal', 'saveResetPin');   // FIX: kunci tombol Reset PIN (anti ketuk ganda)
      kredAdminSetPin(key, pinBaru).then(() => {
        toastTersimpan('PIN berhasil direset'); addLog('reset_pin', `Reset PIN ${guru.name}`); closeResetPinModal(); reloadDataset('logs'); loadGuruListForLogin(() => renderUserList());
      }).catch(err => toast('Gagal: ' + (err && err.message ? err.message : err), true)).finally(lepas);
    }

    // ============================================================
    // PENGUMUMAN
    // ============================================================
    let pengumumanListenerAttached = false;
    function loadPengumuman() {
      // Guard: hanya daftarkan listener SEKALI per sesi login. Sebelum ini, setiap pemanggilan
      // (tiap login & tiap tambah/hapus pengumuman) mendaftarkan listener 'value' baru tanpa
      // pernah melepas yang lama -> listener menumpuk -> toast pengumuman muncul berkali-kali
      // dan memory leak. Listener ini dilepas di logout() (lihat db.ref('pengumuman').off()).
      if (pengumumanListenerAttached) return;
      pengumumanListenerAttached = true;
      db.ref('pengumuman').on('value', snap => {
        allPengumuman = [];
        snap.forEach(child => { const p = child.val(); p.key = child.key; allPengumuman.push(p); });
        allPengumuman.sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
        renderPengumuman();
        renderMarquee();
        checkPengumumanNotif();
      });
    }
    function renderPengumuman() {
      const list = document.getElementById('pengumumanList');
      if (!isAdmin()) { list.innerHTML = ''; return; }
      if (allPengumuman.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;">Belum ada pengumuman.</p>'; return; }
      let html = '';
      allPengumuman.forEach(p => {
        const prioritasClass = p.prioritas || 'umum';
        const prioritasLabel = { 'umum':'📌 Umum','info':'ℹ️ Info','penting':'🔴 Penting' }[prioritasClass] || '📌 Umum';
        const tanggal = p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : '-';
        const waktu = p.tanggal ? new Date(p.tanggal).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '-';
        html += `<div class="pengumuman-item ${prioritasClass}"><div class="teks">${escapeHtml(p.teks||'-')}</div><div class="meta"><span style="background:#e5e7eb;padding:2px 8px;border-radius:12px;font-size:10px;">${prioritasLabel}</span>${pengumumanTargetSelectHtml(p)}<span style="margin-left:6px;">${tanggal} ${waktu}</span></div><div class="aksi"><button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusPengumuman('${escapeJs(p.key)}')">🗑️</button></div></div>`;
      });
      list.innerHTML = html;
    }
    function renderMarquee() {
      const container = document.getElementById('marqueeContent');
      const aktif = allPengumuman.filter(p => p.aktif !== false);
      if (aktif.length === 0) { container.innerHTML = '<span class="marquee-empty">📢 Tidak ada pengumuman saat ini</span>'; return; }
      let html = '';
      aktif.forEach(p => {
        const badgeClass = p.prioritas || 'umum';
        const badgeLabel = { 'umum':'Umum','info':'Info','penting':'Penting' }[badgeClass] || 'Umum';
        html += `<span class="marquee-item"><span class="badge ${badgeClass}">${badgeLabel}</span> ${pengumumanUntukOrtu(p) ? '<span title="Tampil juga untuk orang tua">👨‍👩‍👧</span> ' : ''}${escapeHtml(p.teks||'-')} <span class="date-badge">${p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : '-'}</span></span>`;
      });
      container.innerHTML = html + html;
    }
    function tambahPengumuman() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('tambahPengumuman')) return toast('Sedang menyimpan...', false, 1500);
      const teks = document.getElementById('pengumumanInput').value.trim();
      if (!teks) return toast('Tulis pengumuman terlebih dahulu!', true);
      const prioritas = document.getElementById('pengumumanPrioritas').value;
      const targetEl = document.getElementById('pengumumanTarget');
      const target = (targetEl && ['guru', 'ortu', 'semua'].indexOf(targetEl.value) >= 0) ? targetEl.value : 'guru';
      const btnTambahPengumuman = document.getElementById('btnTambahPengumuman');
      setBusy('tambahPengumuman', btnTambahPengumuman);
      const newKey = db.ref('pengumuman').push().key;
      const dataBaru = { teks, prioritas, target, aktif: true, dibuatOleh: currentUser.name, guruKey: currentUser.key || null, tanggal: new Date().toISOString() };
      const updates = {}; updates['pengumuman/' + newKey] = dataBaru;
      // Yang ditujukan ke orang tua juga disalin (atomik) ke node publik yang dibaca halaman awal sebelum login.
      if (target !== 'guru') updates['pengumuman_publik/' + newKey] = pengumumanPublikData(dataBaru);
      db.ref().update(updates, err => {
        clearBusy('tambahPengumuman', btnTambahPengumuman);
        if (err) toast('Gagal: ' + err.message, true);
        else { toastTersimpan(); addLog('tambah_pengumuman', teks.substring(0,30)+(teks.length>30?'...':'')); document.getElementById('pengumumanInput').value = ''; loadPengumuman(); }
      });
    }
    function hapusPengumuman(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus pengumuman ini?')) return;
      db.ref().update({ ['pengumuman/' + key]: null, ['pengumuman_publik/' + key]: null }, err => {
        if (err) toast('Gagal: ' + err.message, true);
        else { toast('✅ Pengumuman dihapus.'); addLog('hapus_pengumuman'); loadPengumuman(); }
      });
    }
    function checkPengumumanNotif() {
      const dot = document.getElementById('adminNotifDot');
      if (!dot) return;
      if (!isAdmin()) { dot.classList.remove('show'); return; }
      const lastRead = localStorage.getItem('lastPengumumanRead') || '0';
      const hasNew = allPengumuman.some(p => { const tgl = p.tanggal || '0'; return tgl > lastRead; });
      dot.classList.toggle('show', hasNew && allPengumuman.length > 0);
    }
    function markPengumumanRead() {
      if (allPengumuman.length > 0 && allPengumuman[0].tanggal) {
        localStorage.setItem('lastPengumumanRead', allPengumuman[0].tanggal);
        document.getElementById('adminNotifDot')?.classList.remove('show');
      }
    }

    // ===== BEGIN CHOOSER-EXTRAS =====
    // ============================================================
    // HALAMAN AWAL (chooser Guru/Orang Tua): kata inspiratif + pengumuman untuk orang tua
    // ============================================================
    // Markup ada di index.html (#cxPengumuman & #cxQuote di dalam #loginChooser), gayanya di
    // styles.css (.cx-*). Modul ini hanya mengisi & menghidupkannya:
    // - Kata inspiratif: SELALU tampil, berganti otomatis.
    // - Pengumuman orang tua: kotak teks berjalan; DISEMBUNYIKAN kalau tidak ada pengumuman untuk
    //   orang tua (kosong / semua khusus guru / dinonaktifkan).
    // - Data publik dibaca dari node TERPISAH `pengumuman_publik` (salinan ringan pengumuman yang
    //   ditandai untuk orang tua). Halaman awal diakses SEBELUM login, jadi node `pengumuman` yang
    //   berisi pengumuman internal guru tidak pernah dibaca/dibuka ke publik.
    // - Pengumuman lama (belum punya field `target`) dianggap KHUSUS GURU.
    const CHOOSER_QUOTES = [
      { t: 'Sesungguhnya bersama kesulitan ada kemudahan.', s: 'QS. Al-Insyirah: 6' },
      { t: 'Ya Tuhanku, tambahkanlah ilmu kepadaku.', s: 'QS. Thaha: 114' },
      { t: 'Bacalah dengan menyebut nama Tuhanmu yang menciptakan.', s: 'QS. Al-\u2018Alaq: 1' },
      { t: 'Sesungguhnya Allah bersama orang-orang yang sabar.', s: 'QS. Al-Baqarah: 153' },
      { t: 'Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.', s: 'QS. Al-Baqarah: 286' },
      { t: 'Manusia hanya memperoleh apa yang telah diusahakannya.', s: 'QS. An-Najm: 39' },
      { t: 'Allah akan meninggikan orang-orang beriman dan orang-orang berilmu beberapa derajat.', s: 'QS. Al-Mujadilah: 11' },
      { t: 'Berbuat baiklah, sesungguhnya Allah menyukai orang-orang yang berbuat baik.', s: 'QS. Al-Baqarah: 195' },
      { t: 'Allah tidak akan mengubah keadaan suatu kaum sebelum mereka mengubah keadaan diri mereka sendiri.', s: 'QS. Ar-Ra\u2018d: 11' },
      { t: 'Apabila engkau telah selesai dari suatu urusan, tetaplah bekerja keras untuk urusan yang lain.', s: 'QS. Al-Insyirah: 7' },
      { t: 'Menuntut ilmu itu wajib bagi setiap muslim.', s: 'HR. Ibnu Majah' },
      { t: 'Barangsiapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan menuju surga.', s: 'HR. Muslim' },
      { t: 'Sebaik-baik kalian adalah yang belajar Al-Qur\u2019an dan mengajarkannya.', s: 'HR. Bukhari' },
      { t: 'Sebaik-baik manusia adalah yang paling bermanfaat bagi orang lain.', s: 'HR. Ahmad & Thabrani' },
      { t: 'Senyummu di hadapan saudaramu adalah sedekah.', s: 'HR. Tirmidzi' },
      { t: 'Sesungguhnya setiap amal tergantung pada niatnya.', s: 'HR. Bukhari & Muslim' },
      { t: 'Siapa yang tidak menyayangi, ia tidak akan disayangi.', s: 'HR. Bukhari & Muslim' },
      { t: 'Permudahlah dan jangan mempersulit, berilah kabar gembira dan jangan membuat orang lari.', s: 'HR. Bukhari & Muslim' },
      { t: 'Orang yang kuat bukanlah yang pandai bergulat, tetapi yang mampu menahan diri ketika marah.', s: 'HR. Bukhari & Muslim' },
      { t: 'Apabila manusia meninggal, terputus amalnya kecuali tiga: sedekah jariyah, ilmu yang bermanfaat, dan anak saleh yang mendoakannya.', s: 'HR. Muslim' },
      { t: 'Siapa yang menunjukkan kepada kebaikan, ia mendapat pahala seperti pelakunya.', s: 'HR. Muslim' },
      { t: 'Dua nikmat yang sering dilalaikan manusia: kesehatan dan waktu luang.', s: 'HR. Bukhari' },
      { t: 'Allah mencintai orang yang apabila bekerja, ia mengerjakannya dengan sebaik-baiknya.', s: 'HR. Baihaqi' },
      { t: 'Man jadda wajada \u2014 siapa bersungguh-sungguh, ia akan berhasil.', s: 'Pepatah Arab' },
      { t: 'Man shabara zhafira \u2014 siapa bersabar, ia akan beruntung.', s: 'Pepatah Arab' },
      { t: 'Man sara \u2018ala darbi washala \u2014 siapa berjalan di jalannya, ia akan sampai.', s: 'Pepatah Arab' },
      { t: 'Anak-anak belajar dari apa yang mereka lihat. Jadilah teladan yang ingin mereka tiru.' },
      { t: 'Setiap anak istimewa, dan setiap anak tumbuh dengan caranya sendiri.' },
      { t: 'Kerja sama guru dan orang tua adalah fondasi masa depan anak.' },
      { t: 'Ilmu yang paling berharga dimulai dari adab.' },
      { t: 'Hari ini lebih baik dari kemarin, esok lebih baik dari hari ini.' },
      { t: 'Kesalahan adalah bagian dari belajar. Yang penting, bangkit lagi.' },
      { t: 'Pujian yang tulus menumbuhkan semangat lebih kuat daripada seribu perintah.' },
      { t: 'Mendidik bukan sekadar mengisi bejana, tetapi menyalakan pelita.' },
      { t: 'Disiplin kecil yang dilakukan setiap hari mengalahkan semangat besar yang hanya sesekali.' },
      { t: 'Membaca membuka jendela dunia.' },
      { t: 'Doa orang tua dan kesungguhan guru adalah bekal terbaik seorang murid.' },
      { t: 'Terus belajar, terus tumbuh, terus bermanfaat.' },
    ];
    let CX_QUOTE_INTERVAL_MS = 20000;   // ganti kutipan tiap 20 dtk
    let CX_SPEED_PX_PER_S = 55;         // kecepatan teks berjalan (nyaman dibaca di HP)
    const CX_MAX_ITEMS = 10;

    function pengumumanTargetOf(p) { return (p && (p.target === 'ortu' || p.target === 'semua')) ? p.target : 'guru'; }
    function pengumumanUntukOrtu(p) { const t = pengumumanTargetOf(p); return t === 'ortu' || t === 'semua'; }
    // Salinan publik: HANYA field yang aman ditampilkan ke orang tua (tanpa nama pembuat/guruKey).
    function pengumumanPublikData(p) {
      return { teks: String((p && p.teks) || '').slice(0, 500), prioritas: (p && p.prioritas) || 'umum', aktif: !p || p.aktif !== false, tanggal: (p && p.tanggal) || new Date().toISOString() };
    }


    const cx = { ready: false, chooser: null, bar: null, track: null, viewport: null, quote: null, qtext: null, qsrc: null,
      fadeTimer: null, list: [], listening: false, handler: null, qTimer: null, qIndex: 0, staticTimer: null, staticIndex: 0, resizeTimer: null, obs: null, lastW: 0 };

    function cxReducedMotion() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
    function cxEl(tag, cls, text) { const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; }

    function cxFind() {
      if (cx.ready) return true;
      cx.chooser = document.getElementById('loginChooser');
      cx.bar = document.getElementById('cxPengumuman');
      cx.quote = document.getElementById('cxQuote');
      if (!cx.chooser || !cx.bar || !cx.quote) return false;   // index.html lama tanpa markup baru: fitur tidak aktif, tidak error
      cx.track = cx.bar.querySelector('.cx-track'); cx.viewport = cx.bar.querySelector('.cx-viewport');
      cx.qtext = cx.quote.querySelector('.cx-qtext'); cx.qsrc = cx.quote.querySelector('.cx-qsrc');
      cx.ready = !!(cx.track && cx.viewport && cx.qtext && cx.qsrc);
      return cx.ready;
    }

    // ---------- kata inspiratif ----------
    function cxShowQuote(i, animate) {
      const q = CHOOSER_QUOTES[((i % CHOOSER_QUOTES.length) + CHOOSER_QUOTES.length) % CHOOSER_QUOTES.length];
      const apply = () => { cx.qtext.textContent = '\u201C' + q.t + '\u201D'; cx.qsrc.textContent = q.s ? '\u2014 ' + q.s : ''; };
      if (!animate || cxReducedMotion()) { apply(); return; }
      cx.quote.classList.add('cx-fade');
      clearTimeout(cx.fadeTimer);
      cx.fadeTimer = setTimeout(() => { apply(); cx.quote.classList.remove('cx-fade'); }, 350);
    }
    function cxStartQuotes() {
      if (cx.qTimer) return;
      // Kutipan awal berganti tiap hari; lalu berganti otomatis selama halaman awal terbuka.
      cx.qIndex = Math.floor(Date.now() / 86400000) % CHOOSER_QUOTES.length;
      cxShowQuote(cx.qIndex, false);
      cx.qTimer = setInterval(() => { if (document.hidden) return; cx.qIndex++; cxShowQuote(cx.qIndex, true); }, CX_QUOTE_INTERVAL_MS);
    }
    function cxStopQuotes() { if (cx.qTimer) { clearInterval(cx.qTimer); cx.qTimer = null; } clearTimeout(cx.fadeTimer); if (cx.quote) cx.quote.classList.remove('cx-fade'); }

    // ---------- pengumuman berjalan ----------
    function cxItemNode(p) {
      const it = cxEl('span', 'cx-item');
      const pr = ['penting', 'info'].indexOf(p.prioritas) >= 0 ? p.prioritas : 'umum';
      it.appendChild(cxEl('span', 'cx-badge ' + pr, { umum: 'Umum', info: 'Info', penting: 'Penting' }[pr]));
      it.appendChild(cxEl('span', 'cx-text', String(p.teks || '')));   // textContent: aman dari XSS
      if (p.tanggal) { const d = new Date(p.tanggal); if (!isNaN(d)) it.appendChild(cxEl('span', 'cx-date', d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }))); }
      return it;
    }
    function cxStopStatic() { if (cx.staticTimer) { clearInterval(cx.staticTimer); cx.staticTimer = null; } }
    function cxRenderPengumuman() {
      if (!cx.ready) return;
      cxStopStatic();
      const list = cx.list;
      if (!list.length) { cx.bar.style.display = 'none'; cx.track.textContent = ''; return; }   // tidak ada pengumuman ortu -> sembunyi
      cx.bar.style.display = 'flex';
      cx.track.textContent = '';
      if (cxReducedMotion()) {                        // tanpa gerak: tampilkan satu per satu
        cx.bar.classList.add('cx-static');
        const show = () => { cx.track.textContent = ''; cx.track.appendChild(cxItemNode(list[cx.staticIndex % list.length])); cx.staticIndex++; };
        cx.staticIndex = 0; show();
        if (list.length > 1) cx.staticTimer = setInterval(show, 8000);
        return;
      }
      cx.bar.classList.remove('cx-static');
      // Susun 1 "unit" (semua pengumuman), ulangi sampai melebihi lebar layar, lalu gandakan untuk loop mulus.
      const makeUnit = () => { const f = document.createDocumentFragment(); list.forEach(p => f.appendChild(cxItemNode(p))); return f; };
      const probe = cxEl('span', 'cx-half'); probe.appendChild(makeUnit()); cx.track.appendChild(probe);
      const unitW = probe.getBoundingClientRect().width || 1;
      const vw = cx.viewport.clientWidth || window.innerWidth || 360;
      const k = Math.max(1, Math.ceil(vw / unitW));
      cx.track.textContent = '';
      const half = cxEl('span', 'cx-half'); for (let i = 0; i < k; i++) half.appendChild(makeUnit());
      cx.track.appendChild(half); cx.track.appendChild(half.cloneNode(true));
      const halfW = half.getBoundingClientRect().width || unitW;
      cx.track.style.setProperty('--cx-dur', Math.max(10, halfW / CX_SPEED_PX_PER_S).toFixed(1) + 's');
      cx.lastW = window.innerWidth;
    }
    function cxOnData(snap) {
      const arr = [];
      snap.forEach(c => { const p = c.val(); if (p && p.teks && p.aktif !== false) arr.push(p); });
      arr.sort((a, b) => COLLATOR_ID.compare(String(b.tanggal || ''), String(a.tanggal || '')));
      cx.list = arr.slice(0, CX_MAX_ITEMS);
      cxRenderPengumuman();
    }
    function cxListen() {
      if (cx.listening) return;
      cx.listening = true;
      cx.handler = cxOnData;
      // Gagal baca (mis. Rules menutup node ini) -> bar tetap tersembunyi, halaman awal tetap normal.
      db.ref('pengumuman_publik').on('value', cx.handler, () => { cx.list = []; cxRenderPengumuman(); });
    }
    function cxUnlisten() {
      if (!cx.listening) return;
      cx.listening = false;
      try { db.ref('pengumuman_publik').off('value', cx.handler); } catch (e) {}
      cxStopStatic();
    }

    // Aktif hanya selama halaman awal (#loginChooser) terlihat: hemat bandwidth & baterai setelah login.
    function cxSync() {
      if (!cxFind()) return;
      const visible = window.getComputedStyle(cx.chooser).display !== 'none';
      if (visible) { cxStartQuotes(); cxListen(); } else { cxStopQuotes(); cxUnlisten(); }
    }
    function cxInit() {
      if (!cxFind()) return;
      cxSync();
      if (window.MutationObserver) { cx.obs = new MutationObserver(cxSync); cx.obs.observe(cx.chooser, { attributes: true, attributeFilter: ['style', 'class'] }); }
      window.addEventListener('resize', () => {           // hitung ulang lebar teks berjalan (rotasi layar HP)
        clearTimeout(cx.resizeTimer);
        cx.resizeTimer = setTimeout(() => { if (cx.list.length && Math.abs(window.innerWidth - cx.lastW) > 40) cxRenderPengumuman(); }, 250);
      });
    }

    // ---------- sisi Admin: pilih siapa yang melihat pengumuman ----------
    function pengumumanTargetSelectHtml(p) {
      const cur = pengumumanTargetOf(p);
      const opt = (v, label) => `<option value="${v}"${cur === v ? ' selected' : ''}>${label}</option>`;
      return `<select onchange="ubahTargetPengumuman('${escapeJs(p.key)}', this.value)" title="Siapa yang melihat pengumuman ini" style="margin-left:6px;font-size:10px;padding:1px 4px;border-radius:8px;border:1px solid #d1d5db;">${opt('guru', '\uD83E\uDDD1\u200D\uD83C\uDFEB Guru')}${opt('ortu', '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 Orang Tua')}${opt('semua', '\uD83D\uDC65 Guru & Ortu')}</select>`;
    }
    function ensurePengumumanTargetSelect() {
      const prioritas = document.getElementById('pengumumanPrioritas');
      if (!prioritas || document.getElementById('pengumumanTarget')) return;
      const sel = document.createElement('select');
      sel.id = 'pengumumanTarget'; sel.className = prioritas.className; sel.style.cssText = prioritas.style.cssText; sel.style.marginLeft = '6px';
      sel.title = 'Siapa yang melihat pengumuman ini';
      [['guru', '\uD83E\uDDD1\u200D\uD83C\uDFEB Hanya Guru'], ['ortu', '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67 Orang Tua (halaman awal)'], ['semua', '\uD83D\uDC65 Guru & Orang Tua']]
        .forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; sel.appendChild(o); });
      prioritas.insertAdjacentElement('afterend', sel);   // default "Hanya Guru": tidak ada yang tampil publik tanpa sengaja
    }
    function ubahTargetPengumuman(key, target) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (['guru', 'ortu', 'semua'].indexOf(target) < 0) return;
      const p = allPengumuman.find(x => x.key === key);
      if (!p) return;
      const updates = {};
      updates['pengumuman/' + key + '/target'] = target;
      updates['pengumuman_publik/' + key] = (target === 'guru') ? null : pengumumanPublikData(p);
      db.ref().update(updates, err => {
        if (err) { toast('Gagal: ' + err.message, true); renderPengumuman(); }
        else { p.target = target; toast(target === 'guru' ? '\u2705 Pengumuman hanya untuk guru.' : '\u2705 Pengumuman tampil untuk orang tua di halaman awal.'); addLog('ubah_target_pengumuman', target); renderPengumuman(); renderMarquee(); }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { cxInit(); ensurePengumumanTargetSelect(); });
    else { cxInit(); ensurePengumumanTargetSelect(); }
    // ===== END CHOOSER-EXTRAS =====

    // ============================================================
    // LAZY-LOAD LIBRARY BESAR: Chart.js, SheetJS (Excel), jsPDF + AutoTable (PDF)
    // ============================================================
    // Dulu ketiganya ~1,5MB dimuat lewat <script defer> di index.html pada SETIAP pembukaan app --
    // boros di koneksi lambat (madrasah pedesaan), padahal jarang dipakai (grafik dashboard hanya
    // muncul setelah "Lihat Detail" dibuka; PDF/Excel hanya saat menekan Export). Kini dimuat saat
    // dibutuhkan lewat ensureLib(). Service Worker meng-cache-nya (Stale-While-Revalidate), jadi
    // pemakaian berikutnya (termasuk offline) langsung dari cache.
    const LAZY_LIB_SRC = {
      chart: ['https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'],
      xlsx:  ['https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'],
      pdf:   ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
              'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js']   // berurutan: plugin butuh jsPDF
    };
    const LAZY_LIB_READY = {
      chart: () => typeof Chart !== 'undefined',
      xlsx:  () => typeof XLSX !== 'undefined',
      pdf:   () => !!(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && typeof window.jspdf.jsPDF.API.autoTable === 'function')
    };
    const _lazyLibPromise = {};
    function _loadScriptOnce(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.async = true;
        const timer = setTimeout(() => { s.remove(); reject(new Error('Timeout memuat ' + src)); }, 45000);
        s.onload = () => { clearTimeout(timer); resolve(); };
        s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('Gagal memuat ' + src)); };
        document.head.appendChild(s);
      });
    }
    // Mengembalikan Promise yang resolve saat library siap. Aman dipanggil berulang (satu unduhan).
    // Gagal (offline/timeout) -> reject dan boleh dicoba lagi nanti.
    function ensureLib(name) {
      const ready = LAZY_LIB_READY[name];
      if (!ready) return Promise.reject(new Error('Library tidak dikenal: ' + name));
      if (ready()) return Promise.resolve();
      if (!_lazyLibPromise[name]) {
        _lazyLibPromise[name] = LAZY_LIB_SRC[name].reduce((p, src) => p.then(() => _loadScriptOnce(src)), Promise.resolve())
          .then(() => { if (!ready()) throw new Error('Library ' + name + ' termuat tetapi belum siap'); })
          .catch(err => { delete _lazyLibPromise[name]; throw err; });
      }
      return _lazyLibPromise[name];
    }
    // Pemanasan cache HANYA di jaringan cepat (4g, bukan mode hemat data): supaya Export/grafik tetap
    // bisa dipakai offline nanti. Di jaringan lambat/tidak diketahui dilewati -> hemat kuota.
    function _warmLazyLibs() {
      try {
        const c = navigator.connection;
        if (!navigator.onLine || !c || c.saveData || c.effectiveType !== '4g') return;
      } catch (e) { return; }
      ensureLib('pdf').catch(() => {}).then(() => ensureLib('xlsx')).catch(() => {}).then(() => ensureLib('chart')).catch(() => {});
    }
    window.addEventListener('load', () => setTimeout(_warmLazyLibs, 20000));

    // ============================================================
    // GRAFIK DASHBOARD
    // ============================================================
    // Chart di-update in-place (chart.update()) kalau tipe & jumlah dataset sama dengan
    // sebelumnya (kasus paling umum: data berubah real-time tapi mode/filter tetap sama).
    // Destroy+recreate hanya kalau tipe chart atau jumlah dataset berubah (ganti mode/filter),
    // karena Chart.js tidak aman di-diff otomatis untuk perubahan struktur seperti itu.
    let _chartLibRenderPending = false;
    function v4RenderChart(existingInstance, ctx, config) {
      if (typeof Chart === 'undefined') {
        // Chart.js dimuat malas: hanya diunduh kalau kanvasnya benar-benar terlihat (panel "Lihat
        // Detail" dashboard terbuka). Selama masih tersembunyi -> lewati; begitu library siap,
        // renderCharts() dijalankan ulang SEKALI untuk semua grafik.
        if (ctx && ctx.offsetParent !== null && !_chartLibRenderPending) {
          _chartLibRenderPending = true;
          ensureLib('chart').then(() => { _chartLibRenderPending = false; try { renderCharts(); } catch (e) { console.warn('[SI MAMBA] renderCharts', e); } },
                                  () => { _chartLibRenderPending = false; toast('⚠️ Grafik belum bisa dimuat. Cek koneksi internet.', true, 4000); });
        }
        return existingInstance || null;
      }
      if (existingInstance && existingInstance.config.type === config.type && existingInstance.data.datasets.length === config.data.datasets.length) {
        existingInstance.data.labels = config.data.labels;
        config.data.datasets.forEach((ds, i) => { Object.assign(existingInstance.data.datasets[i], ds); });
        existingInstance.options = config.options;
        existingInstance.update();
        return existingInstance;
      }
      if (existingInstance) existingInstance.destroy();
      return new Chart(ctx, config);
    }
    // Panel "Kehadiran Guru" (chart), "Daftar Hadir Guru Hari Ini", dan "Absen Guru Hari Ini"
    // adalah info LEVEL-SEKOLAH (semua guru), bukan relevan buat guru biasa melihat dashboard-nya
    // sendiri -- disembunyikan TOTAL (bukan cuma dikosongkan isinya) memakai pola cek role yang
    // sama seperti renderLogs(). Kalau panel guru chart disembunyikan, panel siswa chart
    // di sebelahnya otomatis melebar penuh (1 kolom) supaya tidak menyisakan ruang kosong.
    function updateDashboardSchoolLevelPanelsVisibility() {
      const boleh = isAdmin() || isKepsek();
      const guruChartPanel = document.getElementById('guruChart') ? document.getElementById('guruChart').closest('.dash-panel') : null;
      const siswaChartPanel = document.getElementById('siswaChart') ? document.getElementById('siswaChart').closest('.dash-panel') : null;
      const teacherTodayPanel = document.getElementById('dashboardTeacherAttendanceList') ? document.getElementById('dashboardTeacherAttendanceList').closest('.dash-panel') : null;
      const logPanel = document.getElementById('logList') ? document.getElementById('logList').closest('.dash-panel') : null;
      if (guruChartPanel) guruChartPanel.style.display = boleh ? '' : 'none';
      if (siswaChartPanel) siswaChartPanel.style.gridColumn = boleh ? '' : '1 / -1';
      if (teacherTodayPanel) teacherTodayPanel.style.display = boleh ? '' : 'none';
      if (logPanel) logPanel.style.display = boleh ? '' : 'none';
    }
    // ============================================================
    // DASHBOARD KEPALA MADRASAH -- KARTU RINGKASAN + GRAFIK NILAI & INFAQ
    // ============================================================
    // Panel di bawah ini DISUNTIKKAN lewat DOM (index.html sudah dicek langsung) sebagai baris
    // BARU tepat SETELAH blok <div class="grid-2"> yang berisi grafik Kehadiran Siswa & Guru --
    // bukan disisipkan KE DALAM grid-2 itu, supaya tidak numpang 3 panel tambahan ke grid 2 kolom
    // yang sudah berisi 2 item (yang bikin tata letak jadi asimetris/berantakan). Ringkasan dibuat
    // full-width, lalu grafik Nilai & Iuran dibungkus grid-2 baru sendiri (sama polanya dengan
    // yang sudah ada). Hanya untuk Admin & Kepsek.
    let dashboardNilaiChartInstance = null, dashboardInfaqChartInstance = null;
    function renderDashboardKepsekExtra() {
      const boleh = isAdmin() || isKepsek();
      let wadah = document.getElementById('dashboardKepsekExtraWrap');
      if (!boleh) {
        if (wadah) wadah.style.display = 'none';
        // FIX: dulu instance Chart.js dibiarkan hidup (cuma wadahnya disembunyikan) saat role
        // berubah jadi bukan admin/kepsek (mis. lewat ganti mode V4 tanpa logout). Canvas yang
        // sempat display:none lalu ditampilkan lagi tidak selalu terukur ulang otomatis oleh
        // Chart.js (v4RenderChart() cuma .update(), tidak pernah .resize()), jadi grafik bisa
        // tampil gepeng/salah ukuran begitu role balik lagi. Sekarang di-destroy tuntas di sini
        // supaya kalau panel muncul lagi, v4RenderChart() membuat instance baru dari ukuran
        // canvas yang sudah benar (wadah.style.display='' dulu, baru chart dibuat).
        if (dashboardNilaiChartInstance) { dashboardNilaiChartInstance.destroy(); dashboardNilaiChartInstance = null; }
        if (dashboardInfaqChartInstance) { dashboardInfaqChartInstance.destroy(); dashboardInfaqChartInstance = null; }
        return;
      }
      if (!wadah) {
        const guruPanel = document.getElementById('guruChart') ? document.getElementById('guruChart').closest('.dash-panel') : null;
        const outerGrid = guruPanel ? guruPanel.closest('.grid-2') : null;
        if (!outerGrid || !outerGrid.parentNode) return;
        wadah = document.createElement('div');
        wadah.id = 'dashboardKepsekExtraWrap';
        wadah.innerHTML = `<div class="dash-panel" id="dashboardRingkasanKepsek" style="margin-top:22px;">
            <h3 style="margin-bottom:10px;">📊 Ringkasan Madrasah</h3>
            <div id="dashboardRingkasanGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;"></div>
          </div>
          <div class="grid-2" style="margin-top:20px;">
            <div class="dash-panel" id="dashboardNilaiPanel">
              <h3 style="margin-bottom:10px;">📝 Rata-rata Nilai Rapor per Kelas</h3>
              <div style="position:relative;height:220px;"><canvas id="dashboardNilaiChart"></canvas></div>
            </div>
            <div class="dash-panel" id="dashboardInfaqPanel">
              <h3 style="margin-bottom:10px;">💰 Total Infaq Mingguan per Minggu</h3>
              <div style="position:relative;height:220px;"><canvas id="dashboardInfaqChart"></canvas></div>
            </div>
          </div>`;
        outerGrid.insertAdjacentElement('afterend', wadah);
      }
      wadah.style.display = '';
      renderRingkasanKepsekKartu();
      renderDashboardNilaiChart();
      renderDashboardInfaqChart();
    }
    // Kehadiran guru = HANYA catatan bertipe 'Datang' (Telat adalah bagian dari Datang). Catatan Izin, Sakit, dan
    // Alpha (termasuk Alpha otomatis sistem) BUKAN hadir. Dihitung per guru per hari (Datang ganda di hari yang
    // sama tidak dihitung dua kali). Dulu semua catatan dihitung -> persen kehadiran selalu 100%.
    function hariHadirGuruUnik(list) {
      return new Set((list || []).filter(a => a && a.type === 'Datang').map(a => (a.guruKey || a.guru) + '|' + a.tanggal)).size;
    }
    function renderRingkasanKepsekKartu() {
      const grid = document.getElementById('dashboardRingkasanGrid');
      if (!grid) return;
      const now = new Date();
      const monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
      // Kehadiran guru bulan ini -- rumus persis sama dengan renderGuruChart() supaya angka di
      // kartu ringkasan selalu konsisten dengan yang ditampilkan di grafik.
      const attendanceGuruBulan = allTeacherAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && sesuaiTahunAjaranTermasukDataLama(a));
      const hariAktifGuru = new Set(attendanceGuruBulan.map(a => a.tanggal)).size;
      const totalGuru = allGuru.length;
      const persenGuru = (hariAktifGuru > 0 && totalGuru > 0) ? Math.min(100, Math.round((hariHadirGuruUnik(attendanceGuruBulan) / (hariAktifGuru * totalGuru)) * 100)) : 0;
      // Kehadiran siswa bulan ini -- rumus persis sama dengan hitungPersen() di renderSiswaChart()
      const attendanceSiswaBulan = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && sesuaiTahunAjaranTermasukDataLama(a));
      let totalHadirSiswa = 0, totalSiswaTercatat = 0;
      attendanceSiswaBulan.forEach(a => { if (a.data) { const values = Object.values(a.data); totalHadirSiswa += values.filter(v => v === 'H').length; totalSiswaTercatat += values.length; } });
      const persenSiswa = totalSiswaTercatat > 0 ? Math.round((totalHadirSiswa / totalSiswaTercatat) * 100) : 0;
      // Rata-rata nilai rapor -- digabung semua mapel & semester tahun ajaran berjalan, sekadar
      // indikator cepat di dashboard (bukan pengganti tampilan detail per-mapel yang sudah ada).
      const raporValues = allGrades.filter(g => mapelDiizinkanNilai(g.kelas || ((allSiswa.find(x => x.key === g.siswaKey) || {}).kelas), g.subject)).map(g => calculateRapor(g.data || {})).filter(v => v > 0);
      const rataNilai = raporValues.length ? Math.round(raporValues.reduce((a,b)=>a+b,0) / raporValues.length) : 0;
      const infaqMingguIni = allInfaqSiswa.filter(it => it.minggu === isoMingguKey()).reduce((s,it)=>s+(it.nominal||0), 0);
      const kartu = [
        { label: 'Total Siswa', value: allSiswa.length, warna: '#2563eb' },
        { label: 'Total Guru', value: totalGuru, warna: '#7c3aed' },
        { label: 'Kehadiran Guru (bulan ini)', value: persenGuru + '%', warna: '#059669' },
        { label: 'Kehadiran Siswa (bulan ini)', value: persenSiswa + '%', warna: '#0891b2' },
        { label: 'Rata-rata Nilai Rapor', value: rataNilai || '-', warna: '#f59e0b' },
        { label: 'Infaq Minggu Ini', value: 'Rp ' + infaqMingguIni.toLocaleString(), warna: '#dc2626' }
      ];
      grid.innerHTML = kartu.map(k => `<div style="background:${k.warna}15;border-radius:10px;padding:10px 12px;">
          <div class="text-muted" style="font-size:11px;margin-bottom:4px;">${k.label}</div>
          <div style="font-size:18px;font-weight:700;color:${k.warna};">${k.value}</div>
        </div>`).join('');
    }
    function renderDashboardNilaiChart() {
      const ctx = document.getElementById('dashboardNilaiChart');
      if (!ctx) return;
      const isDark = document.body.classList.contains('dark-mode');
      const textColor = isDark ? '#94a3b8' : '#6b7280';
      const gridColor = isDark ? '#334155' : '#e5e7eb';
      const kelasUnik = [...new Set(allSiswa.map(s => s.kelas))].filter(Boolean).sort();
      const barPalette = ['#f59e0b','#fbbf24','#fcd34d','#d97706','#b45309','#92400e','#f97316','#ea580c','#c2410c','#78350f'];
      const dataValues = kelasUnik.map(k => {
        const nilaiKelas = allGrades.filter(g => g.kelas === k && mapelDiizinkanNilai(k, g.subject)).map(g => calculateRapor(g.data || {})).filter(v => v > 0);
        return nilaiKelas.length ? Math.round(nilaiKelas.reduce((a,b)=>a+b,0) / nilaiKelas.length) : 0;
      });
      dashboardNilaiChartInstance = v4RenderChart(dashboardNilaiChartInstance, ctx, {
        type: 'bar',
        data: { labels: kelasUnik, datasets: [{ label: 'Rata-rata Nilai', data: dataValues, backgroundColor: kelasUnik.map((_,i) => barPalette[i % barPalette.length]), borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } } }
      });
    }
    function renderDashboardInfaqChart() {
      const ctx = document.getElementById('dashboardInfaqChart');
      if (!ctx) return;
      const isDark = document.body.classList.contains('dark-mode');
      const textColor = isDark ? '#94a3b8' : '#6b7280';
      const gridColor = isDark ? '#334155' : '#e5e7eb';
      // 8 minggu terakhir (dulu 6 bulan terakhir, sejak Iuran diubah dari bulanan jadi mingguan).
      const nbSingkat = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
      const mingguInfo = [];
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i * 7);
        const key = isoMingguKey(d);
        const { senin } = mingguKeTanggal(key);
        mingguInfo.push({ label: `${senin.getDate()} ${nbSingkat[senin.getMonth()]}`, mingguKey: key });
      }
      const dataValues = mingguInfo.map(b => allInfaqSiswa.filter(it => it.minggu === b.mingguKey).reduce((s,it)=>s+(it.nominal||0), 0));
      dashboardInfaqChartInstance = v4RenderChart(dashboardInfaqChartInstance, ctx, {
        type: 'line',
        data: { labels: mingguInfo.map(b=>b.label), datasets: [{ label: 'Total Infaq', data: dataValues, borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', borderWidth: 3, fill: true, tension: 0.3, pointBackgroundColor: '#dc2626', pointRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return 'Rp ' + c.parsed.y.toLocaleString(); } } } }, scales: { y: { ticks: { color: textColor, callback: function(v){ return 'Rp ' + v.toLocaleString(); } }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } } }
      });
    }
    // renderCharts() dulu dipanggil 4-5x berurutan saat boot (renderAll->updateDashboard, renderCoreUI/FullUI
    // langsung, updateDashboard kedua, + sisa pemanggil lain), padahal updateDashboard() sendiri sudah memanggilnya.
    // Dua lapis perbaikan: (1) pemanggil duplikat dihapus (lihat renderCoreUI/renderFullUI dst), (2) renderCharts()
    // sekarang di-debounce -- panggilan beruntun dalam <=60 ms digabung jadi SATU render (data dibaca saat render
    // jalan, jadi selalu yang terbaru). Render sungguhan ada di renderChartsNow().
    let _renderChartsTimer = null;
    function renderCharts() {
      clearTimeout(_renderChartsTimer);
      _renderChartsTimer = setTimeout(renderChartsNow, 60);
    }
    function renderChartsNow() {
      _renderChartsTimer = null;
      try { updateDashboardSchoolLevelPanelsVisibility(); renderSiswaChart(); renderGuruChart(); renderDashboardKepsekExtra(); }
      catch (e) { console.warn('[SI MAMBA] renderCharts gagal:', e); }
      try { if (typeof petugasMonitorRender === 'function') petugasMonitorRender(); } catch (e) { console.warn('[SI MAMBA] petugasMonitorRender gagal:', e); }
    }
    // Debounce: listener realtime Firebase & pergantian filter bisa memanggil ini berkali-kali dalam
    // hitungan milidetik -- gabungkan jadi satu render supaya Chart.js tidak menghitung ulang terus.
    let _siswaChartDebounce = null;
    function renderSiswaChart() {
      clearTimeout(_siswaChartDebounce);
      _siswaChartDebounce = setTimeout(renderSiswaChartNow, 150);
    }
    function renderSiswaChartNow() {
      const ctx = document.getElementById('siswaChart');
      if (!ctx) return;
      const modeSelect = document.getElementById('siswaChartMode'), kelasSelect = document.getElementById('siswaChartKelas');
      const mode = modeSelect ? modeSelect.value : 'bulanan';
      const kelasUnikAll = [...new Set(allSiswa.map(s => s.kelas))].filter(Boolean).sort();
      if (kelasSelect) {
        const currentVal = kelasSelect.value;
        kelasSelect.innerHTML = '<option value="">Semua Kelas</option>' + kelasUnikAll.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
        kelasSelect.value = kelasUnikAll.includes(currentVal) ? currentVal : '';
        kelasSelect.style.display = (mode === 'kelas' || mode === 'bulanan-perkelas') ? 'none' : 'inline-block';
      }
      const filterKelas = kelasSelect ? kelasSelect.value : '';
      function hitungPersen(list) {
        let totalHadir = 0, totalSiswa = 0;
        list.forEach(a => { if (a.data) { const values = Object.values(a.data); totalHadir += values.filter(v => v === 'H').length; totalSiswa += values.length; } });
        return totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 0;
      }
      let labels = [], dataValues = [], chartType = 'line', chartLabel = 'Kehadiran Siswa', multiDatasets = null;
      const barPalette = ['#059669','#10b981','#34d399','#6ee7b7','#0d9488','#14b8a6','#2dd4bf','#5eead4','#0891b2','#0284c7'];
      if (mode === 'harian') {
        chartLabel = 'Kehadiran Harian' + (filterKelas ? ' - ' + filterKelas : '');
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now); d.setDate(d.getDate() - i);
          const tgl = tglLokal(d);
          labels.push(d.getDate() + '/' + (d.getMonth()+1));
          let list = allAttendance.filter(a => a.tanggal === tgl && sesuaiTahunAjaranTermasukDataLama(a));
          if (filterKelas) list = list.filter(a => a.kelas === filterKelas);
          dataValues.push(hitungPersen(list));
        }
      } else if (mode === 'kelas') {
        chartType = 'bar';
        chartLabel = 'Kehadiran per Kelas (bulan ini)';
        const now = new Date();
        const monthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        kelasUnikAll.forEach(k => {
          labels.push(k);
          const list = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && sesuaiTahunAjaranTermasukDataLama(a) && a.kelas === k);
          dataValues.push(hitungPersen(list));
        });
      } else if (mode === 'bulanan-perkelas') {
        chartLabel = 'Kehadiran per Kelas per Bulan';
        const now = new Date(), bulanInfo = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][d.getMonth()];
          bulanInfo.push({ label: namaBulan + ' ' + d.getFullYear(), monthStr: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') });
        }
        labels = bulanInfo.map(b => b.label);
        multiDatasets = kelasUnikAll.map((k, idx) => {
          const color = barPalette[idx % barPalette.length];
          const data = bulanInfo.map(b => {
            const list = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(b.monthStr) && sesuaiTahunAjaranTermasukDataLama(a) && a.kelas === k);
            return hitungPersen(list);
          });
          return { label: k, data: data, borderColor: color, backgroundColor: color, borderWidth: 2, fill: false, tension: 0.3, pointRadius: 3, pointBackgroundColor: color };
        });
      } else {
        chartLabel = 'Kehadiran Bulanan' + (filterKelas ? ' - ' + filterKelas : '');
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][d.getMonth()];
          labels.push(namaBulan + ' ' + d.getFullYear());
          const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
          let list = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && sesuaiTahunAjaranTermasukDataLama(a));
          if (filterKelas) list = list.filter(a => a.kelas === filterKelas);
          dataValues.push(hitungPersen(list));
        }
      }
      const isDark = document.body.classList.contains('dark-mode');
      const textColor = isDark ? '#94a3b8' : '#6b7280';
      const gridColor = isDark ? '#334155' : '#e5e7eb';
      const datasets = multiDatasets || [{
        label: chartLabel,
        data: dataValues,
        borderColor: '#059669',
        backgroundColor: chartType === 'bar' ? labels.map((_,i) => barPalette[i % barPalette.length]) : 'rgba(5,150,105,0.1)',
        borderWidth: chartType === 'bar' ? 1 : 3,
        fill: chartType === 'line',
        tension: 0.3,
        pointBackgroundColor: '#059669',
        pointRadius: chartType === 'line' ? (mode === 'harian' ? 3 : 5) : 0,
        borderRadius: chartType === 'bar' ? 6 : 0
      }];
      siswaChartInstance = v4RenderChart(siswaChartInstance, ctx, {
        type: chartType,
        data: { labels: labels, datasets: datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: !!multiDatasets, labels: { color: textColor, boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + c.parsed.y + '%'; } } } }, scales: { y: { min: 0, max: 100, ticks: { color: textColor, callback: function(v) { return v + '%'; } }, grid: { color: gridColor } }, x: { ticks: { color: textColor, maxRotation: mode === 'harian' ? 60 : 0, autoSkip: true, maxTicksLimit: mode === 'harian' ? 15 : undefined }, grid: { color: gridColor } } } }
      });
    }
    function renderGuruChart() {
      const ctx = document.getElementById('guruChart');
      if (!ctx) return;
      // Panel ini disembunyikan total untuk guru biasa (lihat updateDashboardSchoolLevelPanelsVisibility)
      // -- tidak perlu buang resource menggambar chart yang toh tidak akan terlihat.
      if (!isAdmin() && !isKepsek()) return;
      const modeSelect = document.getElementById('guruChartMode');
      const perguruOption = modeSelect ? modeSelect.querySelector('option[value="perguru"]') : null;
      if (perguruOption) {
        const bolehPerGuru = isAdmin() || isKepsek();
        perguruOption.style.display = bolehPerGuru ? '' : 'none';
        if (!bolehPerGuru && modeSelect.value === 'perguru') modeSelect.value = 'bulanan';
      }
      const mode = modeSelect ? modeSelect.value : 'bulanan';
      const isDark = document.body.classList.contains('dark-mode');
      const textColor = isDark ? '#94a3b8' : '#6b7280';
      const gridColor = isDark ? '#334155' : '#e5e7eb';
      if (mode === 'perguru' && (isAdmin() || isKepsek())) {
        const linePalette = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];
        const bulanInfo = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][d.getMonth()];
          bulanInfo.push({ label: namaBulan + ' ' + d.getFullYear(), monthStr: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') });
        }
        const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
        const datasets = guruAktif.map((g, idx) => {
          const color = linePalette[idx % linePalette.length];
          const data = bulanInfo.map(b => {
            const recBulanIni = allTeacherAttendance.filter(a => a.tanggal && a.tanggal.startsWith(b.monthStr) && sesuaiTahunAjaranTermasukDataLama(a));
            const hariAktifBulanIni = new Set(recBulanIni.map(a => a.tanggal)).size;
            const hariHadirGuruIni = new Set(recBulanIni.filter(a => a.type === 'Datang' && (a.guruKey ? a.guruKey === g.key : a.guru === g.name)).map(a => a.tanggal)).size;
            return hariAktifBulanIni > 0 ? Math.round((hariHadirGuruIni / hariAktifBulanIni) * 100) : 0;
          });
          return { label: g.name, data: data, borderColor: color, backgroundColor: color, borderWidth: 2, fill: false, tension: 0.3, pointRadius: 3, pointBackgroundColor: color };
        });
        guruChartInstance = v4RenderChart(guruChartInstance, ctx, {
          type: 'line',
          data: { labels: bulanInfo.map(b => b.label), datasets: datasets },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: textColor, boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + c.parsed.y + '%'; } } } }, scales: { y: { min: 0, max: 100, ticks: { color: textColor, callback: function(v) { return v + '%'; } }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } } }
        });
        return;
      }
      const bulan = [], dataHadir = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const namaBulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][d.getMonth()];
        bulan.push(namaBulan + ' ' + d.getFullYear());
        const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        const attendanceGuru = allTeacherAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && sesuaiTahunAjaranTermasukDataLama(a));
        const hariAktif = new Set(attendanceGuru.map(a => a.tanggal)).size;
        const totalGuru = allGuru.length;
        let rataHadir = 0;
        if (hariAktif > 0 && totalGuru > 0) { const totalAbsen = hariHadirGuruUnik(attendanceGuru); rataHadir = Math.round((totalAbsen / (hariAktif * totalGuru)) * 100); }
        dataHadir.push(Math.min(rataHadir, 100));
      }
      guruChartInstance = v4RenderChart(guruChartInstance, ctx, {
        type: 'bar',
        data: { labels: bulan, datasets: [{ label: 'Kehadiran Guru', data: dataHadir, backgroundColor: ['#3b82f6','#60a5fa','#93c5fd','#3b82f6','#60a5fa','#93c5fd'], borderRadius: 6, borderColor: '#2563eb', borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return c.parsed.y + '%'; } } } }, scales: { y: { min: 0, max: 100, ticks: { color: textColor, callback: function(v) { return v + '%'; } }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } } }
      });
    }

    // ============================================================
    // STATUS BAR DASHBOARD
    // ============================================================
    // Status bar hanya menampilkan jam:menit -> cukup diperbarui sekali per menit (dijajarkan ke detik :00),
    // dilewati saat tab disembunyikan, dan disegarkan seketika saat tab kembali tampil. Perubahan data
    // (jurnal/absen) memicu scheduleStatusBarRefresh() yang di-debounce, jadi tidak perlu polling per detik.
    let _statusBarTimer = null, _statusBarVisHooked = false, _sbRefreshT = null;
    function startStatusBarTimer() {
      if (_statusBarTimer) return;
      const tick = () => { if (currentUser && !document.hidden) updateStatusBar(); };
      const schedule = () => { _statusBarTimer = setTimeout(() => { tick(); schedule(); }, 60000 - (Date.now() % 60000) + 50); };
      schedule();
      if (!_statusBarVisHooked) { _statusBarVisHooked = true; document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); }); }
    }
    function scheduleStatusBarRefresh() {
      if (_sbRefreshT) return;
      _sbRefreshT = setTimeout(() => { _sbRefreshT = null; if (currentUser) updateStatusBar(); }, 60);
    }
    function updateStatusBar() {
      const now = new Date();
      const today = tglLokal(now);

      document.getElementById('currentTime').textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const jurnalHariIni = getJurnalSayaHariIni(today);
      const jurnalVal = document.getElementById('jurnalStatusValue');
      const jurnalDot = document.getElementById('jurnalStatusDot');
      if (jurnalHariIni.length > 0) {
        jurnalVal.textContent = `✅ ${jurnalHariIni.length} jurnal`;
        jurnalVal.classList.remove('text-muted'); jurnalVal.style.color = '#059669';
        jurnalDot.className = 'status-dot green';
      } else if (isTeacher() || isWaliKelas()) {
        jurnalVal.textContent = '⚠️ Belum diisi';
        jurnalVal.classList.remove('text-muted'); jurnalVal.style.color = '#dc2626';
        jurnalDot.className = 'status-dot red';
      } else {
        jurnalVal.textContent = '⏳ -';
        jurnalVal.style.color = ''; jurnalVal.classList.add('text-muted');
        jurnalDot.className = 'status-dot gray';
      }

      const absenGuruHariIni = getAbsenGuruSayaHariIni(today);
      const absenVal = document.getElementById('absenGuruStatusValue');
      const absenDot = document.getElementById('absenGuruStatusDot');
      if (absenGuruHariIni.length > 0) {
        absenVal.textContent = `✅ ${absenGuruHariIni.length}x absen`;
        absenVal.classList.remove('text-muted'); absenVal.style.color = '#059669';
        absenDot.className = 'status-dot green';
      } else if (isTeacher() || isWaliKelas()) {
        absenVal.textContent = '⏳ Belum';
        absenVal.classList.remove('text-muted'); absenVal.style.color = '#d97706';
        absenDot.className = 'status-dot yellow';
      } else {
        absenVal.textContent = '⏳ -';
        absenVal.style.color = ''; absenVal.classList.add('text-muted');
        absenDot.className = 'status-dot gray';
      }

      document.getElementById('todayDate').textContent = now.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }

    // ============================================================
    // QUICK ATTENDANCE (tetap ada untuk tombol di jurnal)
    // ============================================================
    function quickAttendance() {
      // FIX: dulu cuma isTeacher()||isWaliKelas() -- Admin terkunci di sini walau canEdit() &
      // bolehIsiAbsensiSiswa() sudah membolehkan Admin isi absensi. currentUser.kelas juga dipakai
      // langsung di bawah, yang kosong/undefined utk Admin (Admin tidak py .kelas), jadi kalaupun
      // lolos pengecekan tadi tetap akan error. Sekarang pakai canEdit() + siswaScopeKelas()
      // (sudah otomatis mengembalikan SEMUA kelas utk Admin/Kepsek).
      if (!canEdit()) {
        toast('🔒 Hanya Guru, Wali Kelas & Admin yang bisa mengisi absensi!', true);
        return;
      }
      const today = tglLokal();
      const kelasBelumAbsen = siswaScopeKelas().filter(k => 
        !allAttendance.some(a => a.tanggal === today && a.kelas === k)
      );
      if (kelasBelumAbsen.length === 0) {
        toast('✅ Semua kelas sudah diisi absensi hari ini!');
        return;
      }
      navigateTo('attendance');
      const select = document.getElementById('attendanceClassFilter');
      select.value = kelasBelumAbsen[0];
      loadAttendance();
      toast(`📅 Isi absensi untuk ${kelasBelumAbsen[0]} (${kelasBelumAbsen.length} kelas belum diisi)`, false, 3000);
    }

    // ============================================================
    // LOAD GURU & MIGRASI
    // ============================================================
    function loadGuruListForLogin(callback) {
      if (!navigator.onLine) return loadGuruListForLoginNow(callback);
      authReady.then(() => loadGuruListForLoginNow(callback));
    }
    function loadGuruListForLoginNow(callback) {
      const select = document.getElementById('loginGuru'), loading = document.getElementById('loginLoading');
      if (!navigator.onLine) { return loadGuruListForLoginFromCache(select, loading, callback); }
      let settled = false;
      const timeoutTimer = setTimeout(() => { if (!settled) { settled = true; loadGuruListForLoginFromCache(select, loading, callback); } }, 6000);
      db.ref('guru').once('value', snap => {
        if (settled) return; settled = true; clearTimeout(timeoutTimer);
        allGuru = [];
        // [KREDENSIAL v1] Migrasi PIN polos & auto-seed guru bawaan DIHAPUS dari alur pra-login: keduanya menulis
        // PIN dari sisi anonim. Migrasi kini dilakukan Admin lewat js/kredensial.js (tombol Keamanan Login).
        snap.forEach(child => { const g = child.val(); g.key = child.key; allGuru.push(g); });
        select.innerHTML = '<option value="">-- Pilih --</option>';
        allGuru.sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
        allGuru.forEach(g => { select.innerHTML += `<option value="${g.key}">${escapeHtml(g.name)}</option>`; });
        select.innerHTML += `<option value="admin">🛠️ Admin</option><option value="kepsek">👑 Kepala Sekolah</option>`;
        loading.style.display = 'none';
        if (window.SIMambaOfflineDB) SIMambaOfflineDB.setCache('allGuru', allGuru).catch(() => {});
        if (callback) callback();
      }).catch(err => { if (settled) return; settled = true; clearTimeout(timeoutTimer); console.error(err); loadGuruListForLoginFromCache(select, loading, callback); });
    }
    // [KREDENSIAL v1] Daftar guru bawaan (dengan PIN 111111 dst.) dan auto-seed dihapus: PIN bawaan di source berbahaya
    // dan penulisan kredensial kini hanya boleh dari Admin (js/kredensial.js). Admin menambah guru lewat Manajemen Pengguna.
    function seedDefaultGuru() { console.warn('[SI MAMBA] seedDefaultGuru dinonaktifkan.'); }

    // ============================================================
    // TOGGLE ALL CLASS
    // ============================================================
    function toggleEditAllClass() {
      const checked = document.getElementById('editAllClassCheck').checked;
      document.querySelectorAll('.edit-class-check').forEach(cb => { cb.checked = checked; cb.disabled = checked; });
      document.getElementById('editClassCheckboxes').classList.toggle('class-checkboxes-disabled', checked);
    }
    function toggleWaliKelasField(ctx) {
      const roleId = ctx === 'user' ? 'userRole' : 'editTeacherRole';
      const containerId = ctx === 'user' ? 'userWaliKelasOfContainer' : 'editWaliKelasOfContainer';
      const role = document.getElementById(roleId).value;
      const container = document.getElementById(containerId);
      container.style.display = role === 'wali_kelas' ? 'block' : 'none';
    }

    // ============================================================
    // LOGIN, SHOW APP, LOGOUT (DENGAN START REMINDER)
    // ============================================================
    // Catatan: implementasi login() yang aktif ada di window.login (lihat lebih bawah, dekat
    // ADMIN_LOGIN_LOCK_KEY) -- versi lama di sini sudah dihapus karena dead code (fungsi global
    // bernama sama di bawah menimpanya saat script dimuat, jadi versi ini tidak pernah jalan).

    function showApp() {
      document.getElementById('loginChooser').style.display = 'none';
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('appPage').style.display = 'block';
      document.getElementById('sidebarName').textContent = currentUser.name;
      let roleText = isAdmin() ? 'Administrator' : isKepsek() ? 'Kepala Sekolah' : isWaliKelas() ? 'Wali Kelas 🌟' : 'Guru';
      if (currentUser.semuaKelas) roleText += ' (Semua Kelas)';
      document.getElementById('sidebarRole').textContent = roleText;
      document.getElementById('sidebarAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
      document.getElementById('bioNama').textContent = currentUser.name;
      document.getElementById('bioKelas').textContent = isAdmin() || isKepsek() ? 'Semua Kelas' : currentUser.kelas.join(', ');
      document.getElementById('lastUpdate').textContent = 'Data terakhir diupdate: ' + new Date().toLocaleString();
      
      updateLogoByMode();
      
      document.getElementById('pengumumanAdmin').style.display = isAdmin() ? 'block' : 'none';
      const headerBackupBtn = document.getElementById('headerBackupBtn'); if (headerBackupBtn) headerBackupBtn.style.display = isAdmin() ? '' : 'none';

      const canEditTeacher = isTeacher() || isWaliKelas();
      document.getElementById('btnTambahSiswa').disabled = !isAdmin();
      document.getElementById('btnSaveAttendance').disabled = !canEditTeacher || isKepsek();
      document.getElementById('btnSaveJournal').disabled = !canEditTeacher;
      document.getElementById('btnVerifyFace').disabled = !canEditTeacher;
      document.getElementById('siswaNote').textContent = isAdmin() ? '✅ Admin - Bisa kelola semua siswa' : '🔒 Hanya Admin yang bisa mengelola siswa';

      // Visibilitas menu ditentukan SATU tempat saja: menuRules di v4ApplyMode(). Blok lama di sini
      // (aturan per-role terpisah) dihapus karena bertabrakan dengan menuRules (mis. wali kelas murni
      // atau mode Guru tidak konsisten antara dua sistem itu).
      if (typeof v4ApplyMode === 'function') v4ApplyMode();

      navUser = false;
      const halamanKembali = halamanPulih();      // dibaca SEBELUM navigateTo('dashboard'), dipulihkan sesudah data selesai dimuat
      navBoot = true; try { navigateTo('dashboard'); } finally { navBoot = false; }
      const today = tglLokal();
      document.getElementById('attendanceDate').value = today;
      document.getElementById('journalDate').value = today;
      document.getElementById('rekapFilterTanggal').value = today;
      populateJournalJamOptions();
      populateClassFilterDropdowns();
      refreshAllKelasDropdowns();
      loadJamSettings();
      loadPengumuman();
      showLoading();
      setLoadingMessage('Memuat data...');
      // Indikator "masih diproses" untuk koneksi lambat, supaya user tidak mengira aplikasi
      // macet total kalau loading agak lama (bukan diam saja tanpa keterangan apa pun).
      const slowHintTimer = setTimeout(() => { setLoadingMessage('Koneksi agak lambat, mohon tunggu sebentar lagi...'); }, 4000);
      // Jaring pengaman TERAKHIR/mutlak: apa pun yang terjadi (termasuk skenario tak terduga
      // yang belum tertangani jalur lain di atas), layar loading TIDAK BOLEH nyangkut selamanya.
      // Semua jalur normal sudah jauh lebih cepat dari ini (watchSchoolSettings ~3.5 detik +
      // loadAllData ~9 detik maksimal) -- timer 13 detik ini murni cadangan darurat terakhir.
      let hardStopFired = false;
      const hardStopTimer = setTimeout(() => {
        if (hardStopFired) return; hardStopFired = true;
        console.error('[SI MAMBA] Hard-stop loading timeout tercapai -- ada jalur yang belum tertangani.');
        clearTimeout(slowHintTimer);
        hideLoading();
        toast('⚠️ Memuat data lebih lama dari biasanya. Sebagian data mungkin belum lengkap — tekan 🔄 Refresh untuk mencoba lagi.', true, 8000);
      }, 13000);
      // Pastikan Tahun Ajaran & Semester Aktif (dari school_settings) sudah dimuat
      // SEBELUM loadAllData() jalan, supaya semua data yang difilter pakai currentTahunAjaran benar dari awal.
      // BOOT TANPA MENUNGGU school_settings: pakai tebakan terbaik (mirror perangkat / default kode),
      // lalu listener di bawah mengoreksi & memuat ulang data kalau nilai aslinya ternyata berbeda.
      pakaiPengaturanTerakhir();
      updateTahunAjaranBadge();
      watchSchoolSettings(null);
      (() => {
        terapkanSemesterKeInput();
        watchMyReminders();
        useCacheFirstOnce = true; // login/pulihkan sesi: boleh tampil dari cache milik user ini dulu
        loadAllData(() => {
          if (hardStopFired) return; // sudah keburu ditangani hard-stop, jangan dobel proses
          clearTimeout(hardStopTimer); clearTimeout(slowHintTimer);
          hideLoading();
          if (halamanKembali && !navUser) { try { navigateTo(halamanKembali); } catch (e) { console.error('[SI MAMBA] Gagal memulihkan halaman terakhir:', e); } }
          toast('Selamat datang, ' + currentUser.name);
          // renderCoreUI()/renderOfflineDataUI() baru saja menjalankan tiga render ini -- jangan diulang.
          if (!coreRenderedJustNow()) { renderCharts(); checkPengumumanNotif(); updateStatusBar(); }
          if(isAdmin()) setTimeout(markPengumumanRead,2000);
          startReminderScheduler();
          // (interval 30 dtk dihapus: ditumpuk setiap login & digantikan startStatusBarTimer())
          setTimeout(() => { try { ensureTtdKepala(); } catch (e) {} }, 1500); // prefetch TTD Kepala di luar jalur kritis boot
        });
      })();
    }

    function logout() {
      // PENTING: urutan sengaja diubah -- reset UI & sesi (aksi UTAMA yang user tunggu saat
      // klik "Keluar") sekarang dijalankan PALING AWAL dan TANPA bergantung pada Firebase.
      // Sebelumnya addLog('logout',...) & db.ref(...).off() dipanggil DULUAN tanpa try/catch;
      // kalau salah satunya melempar error (mis. Firebase belum siap/koneksi bermasalah),
      // seluruh baris di bawahnya (termasuk balik ke halaman login) tidak pernah jalan --
      // itulah kenapa tombol "Keluar" bisa terlihat tidak merespon sama sekali.
      const wasUser = currentUser;
      currentUser = null;
      try { if (typeof kredBersihkanSesi === 'function') kredBersihkanSesi(); } catch (e) { console.error('[SI MAMBA] kredBersihkanSesi gagal saat logout:', e); }   // hapus Kunci Admin/Kepsek + sesi_* (jangan tertinggal di perangkat)
      Object.keys(_flushAttKeyByItem).forEach(k => { delete _flushAttKeyByItem[k]; });   // memo key flush absensi tidak boleh terbawa ke akun berikutnya
      clearSession();
      document.getElementById('appPage').style.display = 'none';
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('loginChooser').style.display = 'flex';
      document.getElementById('loginPIN').value = '';
      document.getElementById('loginGuru').value = '';
      sinkronRememberMe();
      dataLoaded = false;
      toast('Logout berhasil.');

      // Sisanya adalah cleanup best-effort: tetap dijalankan seperti biasa, tapi tiap
      // kelompok dibungkus try/catch sendiri-sendiri supaya kegagalan salah satu bagian
      // (mis. Firebase) tidak membatalkan logout yang secara visual sudah terjadi di atas.
      try { stopCamera(); } catch (e) { console.error('[SI MAMBA] stopCamera gagal saat logout:', e); }
      try { if (wasUser) addLog('logout', wasUser.name + ' logout'); } catch (e) { console.error('[SI MAMBA] addLog gagal saat logout:', e); }
      try {
        if (backupInterval) { clearInterval(backupInterval); backupInterval = null; }
        if (notificationInterval) { clearInterval(notificationInterval); notificationInterval = null; }
      } catch (e) { console.error('[SI MAMBA] Gagal clear interval saat logout:', e); }
      try {
        // ============================================================
        // BERSIHKAN SEMUA LISTENER FIREBASE ('on') SAAT LOGOUT
        // Ini mencegah memory leak & toast pengumuman/jam/tahun-ajaran muncul
        // dobel-dobel kalau user login lagi di sesi yang sama (listener lama
        // yang tidak pernah di-off() akan terus aktif menumpuk).
        // ============================================================
        db.ref('pengumuman').off(); pengumumanListenerAttached = false;
        db.ref('jam_settings').off(); jamSettingsListenerAttached = false;
        db.ref('school_settings').off(); schoolSettingsListenerAttached = false;
        if (earlyLeaveListenerRef) { earlyLeaveListenerRef.off(); earlyLeaveListenerRef = null; earlyLeaveListenerKey = null; }
        if (remindersListenerRef) { remindersListenerRef.off(); remindersListenerRef = null; }
        remindersWatchAttached = false;
        remindersWatchDate = null;
      } catch (e) { console.error('[SI MAMBA] Gagal melepas listener Firebase saat logout:', e); }
      try {
        if (typeof v4InvalidateLoads === 'function') v4InvalidateLoads();
        if (typeof amalanKegiatanResetState === 'function') amalanKegiatanResetState();
        if (typeof bacaanShalatResetState === 'function') bacaanShalatResetState();
        if (typeof v4PanelSiswaCache !== 'undefined') { v4PanelSiswaCache = {}; v4PanelSiswaGagal = {}; v4TfKelasSel = ''; }
      } catch (e) { console.error('[SI MAMBA] Gagal reset state v4 saat logout:', e); }
      try { if (typeof kasResetState === 'function') kasResetState(); } catch (e) { console.error('[SI MAMBA] Gagal reset state Kas saat logout:', e); }
      // PATCH v8.97: reset state Buku Tamu & Modul Ajar (masing-masing try sendiri supaya satu gagal tidak menghentikan yang lain)
      try { if (typeof bukuTamuResetState === 'function') bukuTamuResetState(); } catch (e) { console.error('[SI MAMBA] Gagal reset state Buku Tamu saat logout:', e); }
      try { if (typeof modulAjarResetState === 'function') modulAjarResetState(); } catch (e) { console.error('[SI MAMBA] Gagal reset state Modul Ajar saat logout:', e); }
    }

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('show');
    }
    // Sidebar model akordeon: hanya satu grup terbuka dalam satu waktu supaya menu tetap ringkas.
    function toggleMenuGroup(groupName) {
      const group = document.querySelector(`.menu-group[data-group="${groupName}"]`);
      if (!group) return;
      const willOpen = group.classList.contains('collapsed');
      document.querySelectorAll('#v4SidebarMenu .menu-group').forEach(g => g.classList.add('collapsed'));
      if (willOpen) group.classList.remove('collapsed');
    }
    // Sembunyikan header grup yang tidak punya entri tampil: semua item kena hidden-tab (hak akses peran),
    // atau hanya berisi anggota hub yang disembunyikan / hub kosong (lihat menu-hub.js).
    function syncMenuGroupVisibility() {
      document.querySelectorAll('#v4SidebarMenu .menu-group').forEach(g => {
        const ada = !!g.querySelector('.menu-item:not(.hidden-tab):not(.hub-member):not(.hub-empty)');
        g.style.display = ada ? '' : 'none';
      });
    }
    (function initMenuGroupSync() {
      const run = () => {
        const nav = document.getElementById('v4SidebarMenu');
        if (!nav) return;
        let t = null;
        new MutationObserver(() => { clearTimeout(t); t = setTimeout(syncMenuGroupVisibility, 0); })
          .observe(nav, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
        syncMenuGroupVisibility();
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
    })();

    // Progress bar tipis di atas layar, dipicu tiap kali navigateTo() dipanggil. Pakai trik
    // "force reflow" (baca offsetWidth di tengah-tengah) supaya transisi CSS-nya benar-benar
    // sempat digambar browser walau kode di bawahnya berjalan sinkron & cepat -- tanpa trik ini,
    // browser bisa "meloncat" langsung ke frame terakhir tanpa sempat menampilkan animasinya.
    let routeProgressTimer = null;
    function showRouteProgress() {
      const bar = document.getElementById('routeProgressBar'); if (!bar) return;
      clearTimeout(routeProgressTimer);
      bar.classList.remove('done');
      bar.style.width = '0%';
      void bar.offsetWidth; // force reflow
      bar.classList.add('active');
      bar.style.width = '65%';
    }
    function finishRouteProgress() {
      const bar = document.getElementById('routeProgressBar'); if (!bar) return;
      bar.classList.add('done');
      bar.style.width = '100%';
      routeProgressTimer = setTimeout(() => { bar.classList.remove('active','done'); bar.style.width = '0%'; }, 260);
    }
    function navigateTo(page) {
      if (!navBoot) { navUser = true; catatHalaman(page); }
      showRouteProgress();
      stopCamera();
      document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById('page-' + page);
      if (target) target.classList.remove('hidden');
      document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => el.classList.remove('active'));
      const menuItem = document.querySelector(`.sidebar-menu .menu-item[data-page="${page}"]`);
      if (menuItem) menuItem.classList.add('active');
      document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
      const bottomItem = document.querySelector(`.bottom-nav-item[data-bottom-page="${page}"]`);
      if (bottomItem) bottomItem.classList.add('active');
      const titleMap = { 'profile-v4':'Profil Saya', 'activities-v4':'Amalan Yaumiyah', 'tahfidz-v4':'Tahfidz', 'bacaan-shalat':'Bacaan Sholat', 'ekskul-v4':'Ekstrakurikuler', 'pramuka-v4':'Pramuka (SKU)', 'approval-v4':'Approval', 'notifications-v4':'Notifikasi', 'tasks-v4':'Task Center', 'raport-v4':'Raport', dashboard:'Dashboard', students:'Data Siswa', attendance:'Absensi', grades:'Nilai', journal:'Jurnal Mengajar', 'teacher-attendance':'Absen Guru', religi:'Absen Religi Saya', events:'Lembur & Rapat', ujian:'Honor Ujian', 'profil-sekolah':'Profil Madrasah', rekap:'Ringkasan Sekolah', 'rekap-nilai':'Rekap Nilai', honor:'Honor', surat:'Surat & Ijin', jadwal:'Jadwal', promotion:'Kenaikan Kelas', 'setting-jam':'Setting Jam', admin:'Admin', laporan:'Laporan Resmi', 'user-management':'Manajemen User', 'honor-slip':'Slip Honor Saya', 'infaq-madrasah':'Infaq', 'kas-umum':'Kas Madrasah', 'sikap-siswa':'Sikap Siswa', 'buku-penghubung':'Buku Penghubung', 'materi-belajar':'Materi Belajar', 'tugas-siswa':'Tugas Siswa', 'kalender-akademik':'Kalender Akademik', 'saran-kritik':'Saran & Kritik', 'kelola-absen-guru':'Kelola Absen Guru', 'administrasi-ujian':'Administrasi Ujian' };
      document.getElementById('pageTitle').innerHTML = titleMap[page] || 'Dashboard';
      if (window.innerWidth <= 768) { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }
      flushRenderTertunda(page); // render yang ditunda saat halaman ini tersembunyi (lihat renderAll)
      if (page === 'attendance') { loadAttendance(); renderAttendanceLateBlock(); }
      if (page === 'grades') loadGrades();
      if (page === 'journal') { renderJournals(); cancelEditJournal(); }
      if (page === 'kelola-absen-guru') setupKelolaAbsenGuruPage();
      if (page === 'teacher-attendance') { updateLabelJamPulang(); renderTeacherAttendance(); renderEarlyLeaveBlock(); renderEarlyLeaveApprovals(); }
      if (page === 'info-ortu') { if (typeof renderInfoOrtuPage === 'function') renderInfoOrtuPage(); else komponenBelumTermuat('Info ke Ortu'); }
      if (page === 'events') { renderEventAdminForm(); renderEventsToday(); renderEventList(); }
      if (page === 'ujian') { renderUjianAdminForm(); renderUjianToday(); renderUjianList(); }
      if (page === 'profil-sekolah') { renderProfilSekolah(); }
      if (page === 'religi') loadReligi();
      if (page === 'rekap') renderRekap();
      if (page === 'honor') { const y=document.getElementById('honorYear'); if(y) y.value=new Date().getFullYear(); const m=document.getElementById('honorMonth'); if(m) m.value=String(new Date().getMonth()+1); renderHonor(); }
      if (page === 'rekap-nilai') { const kelas = document.getElementById('rekapNilaiKelas').value; populateRekapSiswaDropdown(kelas); renderRekapNilai(); }
      if (page === 'setting-jam') loadJamSettings();
      if (page === 'admin') { document.getElementById('koreksiAbsenGuruCard').style.display = (isAdmin() || isKepsek()) ? 'block' : 'none'; populateKoreksiAbsenGuruDropdown(); markPengumumanRead(); loadLogsFull(); renderAdminTeacherAttendance(); renderOrtuAkunAdmin(); }
      if (page === 'students') renderSiswa();
      if (page === 'surat') { loadSiswaSuratDropdown(); loadSuratRiwayat(); document.getElementById('suratPreview').innerHTML = generateKopSuratHTML() + '<p class="text-muted" style="text-align:center;padding:40px 0;">Pilih siswa dan jenis surat untuk melihat preview.</p>'; selectedSiswaSurat = null; }
      if (page === 'jadwal') {
        // Buka halaman Jadwal langsung di HARI INI (Minggu tidak ada jadwal -> Senin), bukan selalu Senin.
        { const selHari = document.getElementById('jadwalHariFilter'); const hIni = getHariIni(); if (selHari) selHari.value = (hIni === 'Minggu') ? 'Senin' : hIni; }
        loadJadwal(); setJadwalView('harian');
      }
      if (page === 'laporan') { loadReportPreview(); }
      if (page === 'user-management') { renderUserList(); }
      if (page === 'honor-slip') { const y=document.getElementById('honorSlipYear'); if(y) y.value=new Date().getFullYear(); const m=document.getElementById('honorSlipMonth'); if(m) m.value=String(new Date().getMonth()+1); renderHonorSlip(); }
      if (page === 'infaq-madrasah') { if (typeof setupInfaqPage === 'function') setupInfaqPage(); else toast('Komponen Infaq belum termuat. Muat ulang halaman, lalu coba lagi.', true); }
      if (page === 'kas-umum') { setupKasUmumPage(); }
      if (page === 'sikap-siswa') { ensureLazyDatasets(LAZY_PAGE_DATASETS['sikap-siswa'], () => { if (typeof setupSikapPage === 'function') setupSikapPage(); else komponenBelumTermuat('Sikap Siswa'); }); }
      if (page === 'buku-penghubung') { if (typeof setupBukuPenghubungPage === 'function') setupBukuPenghubungPage(); else komponenBelumTermuat('Buku Penghubung'); }
      if (page === 'materi-belajar') { ensureLazyDatasets(LAZY_PAGE_DATASETS['materi-belajar'], () => { setupMateriPage(); }); }
      if (page === 'tugas-siswa') { ensureLazyDatasets(LAZY_PAGE_DATASETS['tugas-siswa'], () => { setupTugasPage(); }); }
      if (page === 'kalender-akademik') { ensureLazyDatasets(LAZY_PAGE_DATASETS['kalender-akademik'], () => { setupKalenderAkademikPage(); }); }
      if (page === 'saran-kritik') { setupSaranKritikPage(); }
      if (page === 'administrasi-ujian') { if (typeof setupAdministrasiUjianPage === 'function') setupAdministrasiUjianPage(); }
      if (page === 'bacaan-shalat') { if (typeof setupBacaanShalatPage === 'function') setupBacaanShalatPage(); }
      finishRouteProgress();
    }

    // ============================================================
    // LOAD JAM & SETTINGS
    // ============================================================
    let jamSettingsListenerAttached = false;
    function loadJamSettings() {
      // Guard sama seperti loadPengumuman(): cegah listener 'value' menumpuk setiap kali
      // halaman "Setting Jam" dibuka atau setiap login. Kalau listener sudah aktif, cukup
      // render ulang dari data yang sudah ada (jamSettings sudah tersinkron realtime).
      if (jamSettingsListenerAttached) {
        renderJamSettings(); updateJamDisplay(); populateJournalJamOptions(); updateStatusBar();
        return;
      }
      jamSettingsListenerAttached = true;
      db.ref('jam_settings').on('value', snap => {
        const data = snap.val();
        if (data) { jamSettings = data; }
        else { jamSettings = JSON.parse(JSON.stringify(DEFAULT_JAM)); db.ref('jam_settings').set(jamSettings); }
        const jumlahInput = document.getElementById('jumlahJamPelajaran');
        if (jumlahInput) jumlahInput.value = Object.keys(jamSettings).length || 4;
        renderJamSettings();
        updateJamDisplay();
        populateJournalJamOptions();
        updateStatusBar();
      });
    }
    function renderJamSettings() {
      const container = document.getElementById('jamList');
      const jumlahInput = document.getElementById('jumlahJamPelajaran');
      const jumlahJam = jumlahInput ? (parseInt(jumlahInput.value) || 4) : Object.keys(jamSettings).length || 4;
      container.innerHTML = '';
      for (let i=1; i<=jumlahJam; i++) {
        const j = jamSettings[i] || { mulai: '07:30', selesai: '08:15', label: 'Reguler', isEkstra: false };
        const isExtra = !!j.isEkstra;
        container.innerHTML += `<div class="jam-item ${isExtra ? 'extra' : ''}" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;">
          <span style="font-weight:600;width:80px;">Jam ke-${i}</span>
          <input type="time" id="jam_mulai_${i}" value="${j.mulai||'07:30'}" style="width:110px;">
          <span>-</span>
          <input type="time" id="jam_selesai_${i}" value="${j.selesai||'08:15'}" style="width:110px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;background:${isExtra ? '#f3e8ff' : '#f3f4f6'};padding:4px 10px;border-radius:8px;">
            <input type="checkbox" id="jam_ekstra_${i}" ${isExtra ? 'checked' : ''}> ⭐ Ekstrakurikuler
          </label>
        </div>`;
      }
    }
    function updateJamDisplay() {
      const select = document.getElementById('journalJam');
      const jam = document.getElementById('jamTimeDisplay');
      const val = parseInt(select.value);
      const j = jamSettings[val];
      if (j) { const label = isJamEkstra(val) ? '⭐ Ekstrakurikuler' : 'Reguler'; jam.textContent = `⏰ ${j.mulai} - ${j.selesai} (${label})`; }
      else jam.textContent = '';
    }
    function populateJournalJamOptions() {
      const select = document.getElementById('journalJam');
      if (!select) return;
      const currentVal = select.value;
      const jumlahJam = Object.keys(jamSettings).length || 4;
      let html = '';
      for (let i=1; i<=jumlahJam; i++) {
        const label = isJamEkstra(i) ? `⭐ Jam ke-${i} (Ekstrakurikuler)` : `Jam ke-${i} (Reguler)`;
        html += `<option value="${i}">${label}</option>`;
      }
      select.innerHTML = html;
      if (currentVal && parseInt(currentVal) <= jumlahJam) select.value = currentVal;
    }
    function saveJamSettings() { if (!isAdmin()) return toast('Hanya Admin!', true);
      const jumlahInput = document.getElementById('jumlahJamPelajaran');
      const jumlahJam = jumlahInput ? (parseInt(jumlahInput.value) || 4) : 4;
      if (jumlahJam < 1 || jumlahJam > 12) return toast('Jumlah jam harus antara 1-12!', true);
      const newSettings = {};
      for (let i=1; i<=jumlahJam; i++) {
        const mulai = document.getElementById(`jam_mulai_${i}`).value;
        const selesai = document.getElementById(`jam_selesai_${i}`).value;
        const isEkstra = document.getElementById(`jam_ekstra_${i}`).checked;
        if (!mulai || !selesai) { toast(`Jam ke-${i} belum diisi!`, true); return; }
        if (mulai >= selesai) { toast(`Jam ke-${i}: mulai harus sebelum selesai!`, true); return; }
        newSettings[i] = { mulai, selesai, label: isEkstra ? 'Ekstrakurikuler' : 'Reguler', isEkstra };
      }
      db.ref('jam_settings').set(newSettings, err => { if (err) toast('Gagal: '+err.message, true); else { toastTersimpan(); jamSettings = newSettings; renderJamSettings(); updateJamDisplay(); populateJournalJamOptions(); addLog('setting_jam','Jam pelajaran diubah'); } });
    }
    function resetJamDefault() { if (!isAdmin()) return toast('Hanya Admin!', true);
      db.ref('jam_settings').set(DEFAULT_JAM, err => { if (err) toast('Gagal: '+err.message, true); else { toast('✅ Reset ke default!'); jamSettings = JSON.parse(JSON.stringify(DEFAULT_JAM)); const jumlahInput = document.getElementById('jumlahJamPelajaran'); if (jumlahInput) jumlahInput.value = 4; renderJamSettings(); updateJamDisplay(); populateJournalJamOptions(); addLog('setting_jam','Reset jam default'); } });
    }

    // Jurnal sekarang WAJIB mengambil Kelas & Mapel dari data Jadwal (guru tidak bisa pilih
    // bebas lagi) -- dipicu saat Tanggal/Jam/Status berubah. Untuk Non-Reguler (mewakili),
    // "guru yang digantikan" juga otomatis terambil dari Jadwal (bukan pilihan bebas), supaya
    // tidak ada lagi salah input atau perubahan jadwal secara tidak sengaja lewat jurnal.
    // Jalur darurat khusus Admin/Kepsek: kalau Jadwal belum/salah diisi tapi jurnal tetap harus
    // dicatat, mereka bisa centang "Isi manual" untuk melewati penguncian Jadwal -- guru biasa
    // TIDAK punya opsi ini sama sekali (checkbox-nya cuma dimunculkan untuk Admin/Kepsek).
    function toggleJournalOverride() {
      const manual = document.getElementById('journalOverrideManual').checked;
      document.getElementById('journalJadwalPilihanWrap').style.display = manual ? 'none' : '';
      document.getElementById('journalManualWrap').style.display = manual ? '' : 'none';
      const mewakiliDisplay = document.getElementById('journalMewakiliGuru'), mewakiliManual = document.getElementById('journalManualMewakiliGuru'), hint = document.getElementById('journalMewakiliHint');
      const type = document.getElementById('journalType').value;
      if (manual) {
        mewakiliDisplay.style.display = 'none'; mewakiliManual.style.display = type === 'Non-Reguler' ? 'block' : 'none';
        hint.textContent = 'Mode manual aktif -- pilih sendiri kelas, mapel, dan guru yang digantikan (kalau ada).';
        const kelasSel = document.getElementById('journalManualKelas');
        kelasSel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + KELAS_LIST.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
        mewakiliManual.innerHTML = '<option value="">-- Pilih Guru yang Diwakili --</option>' + (allGuru || []).filter(g => g.name !== currentUser.name).map(g => `<option value="${escapeHtml(g.key || g.name)}" data-nama="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`).join('');
        document.getElementById('journalClass').value = ''; document.getElementById('journalSubject').value = ''; document.getElementById('journalMewakiliGuru').value = ''; window._journalMewakiliKey = null;
      } else {
        mewakiliDisplay.style.display = 'block'; mewakiliManual.style.display = 'none';
        hint.textContent = 'Diambil otomatis dari Jadwal berdasarkan kelas & mapel yang dipilih di atas -- tidak bisa dipilih manual, supaya tidak salah input.';
        lookupJadwalUntukJurnal();
      }
    }
    function terapkanJournalManual() {
      const kelas = document.getElementById('journalManualKelas').value, mapel = document.getElementById('journalManualMapel').value, type = document.getElementById('journalType').value;
      document.getElementById('journalClass').value = kelas;
      document.getElementById('journalSubject').value = mapel;
      if (type === 'Non-Reguler') {
        const sel = document.getElementById('journalManualMewakiliGuru');
        const opt = sel.options[sel.selectedIndex];
        document.getElementById('journalMewakiliGuru').value = opt && opt.dataset.nama ? opt.dataset.nama : sel.value;
        window._journalMewakiliKey = (allGuru || []).find(g => (g.key || g.name) === sel.value)?.key || null;
      }
      checkBentrokJurnal();
    }
    function lookupJadwalUntukJurnal() {
      const overrideWrap = document.getElementById('journalOverrideToggleWrap');
      if (overrideWrap) overrideWrap.style.display = (isAdmin() || isKepsek()) ? 'block' : 'none';
      if (document.getElementById('journalOverrideManual') && document.getElementById('journalOverrideManual').checked) return; // mode manual aktif, lewati pengambilan dari Jadwal
      const tanggal = document.getElementById('journalDate').value;
      const jam = parseInt(document.getElementById('journalJam').value);
      const type = document.getElementById('journalType').value;
      const pilihan = document.getElementById('journalJadwalPilihan');
      const kosongWarning = document.getElementById('jadwalKosongWarning');
      document.getElementById('journalMewakiliContainer').style.display = type === 'Non-Reguler' ? 'block' : 'none';
      document.getElementById('journalClass').value = '';
      document.getElementById('journalSubject').value = '';
      document.getElementById('journalMewakiliGuru').value = '';
      window._journalMewakiliKey = null;
      document.getElementById('bentrokWarning').style.display = 'none';
      document.getElementById('bentrokSuccess').style.display = 'none';
      kosongWarning.style.display = 'none';
      window._journalJadwalKandidat = null;
      if (!tanggal || !jam) { pilihan.innerHTML = '<option value="">-- Pilih Tanggal & Jam dulu --</option>'; return; }
      updateJamDisplay();
      const namaHari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const hari = namaHari[new Date(tanggal + 'T00:00:00').getDay()];
      // FIX: dulu cocokkan HANYA lewat nama (j.guru === currentUser.name) -- kalau ada guru lain
      // bernama sama persis, guru yang isi jurnal ini bisa melihat & tanpa sadar memilih jadwal
      // milik guru lain itu sebagai "jadwal Reguler saya", atau (untuk Non-Reguler/menggantikan)
      // jadwal dirinya sendiri malah ikut muncul sebagai kandidat yang "bisa digantikan".
      const cocokSayaSendiri = j => j.guruKey ? j.guruKey === currentUser.key : samaNamaGuru(j.guru, currentUser.name);
      const kandidat = (allJadwal || []).filter(j => j.hari === hari && j.jam === jam && (type === 'Reguler' ? cocokSayaSendiri(j) : (j.guru && !cocokSayaSendiri(j))));
      if (kandidat.length === 0) {
        pilihan.innerHTML = '<option value="">-- Tidak ada di Jadwal --</option>';
        kosongWarning.style.display = 'block';
        document.getElementById('jadwalKosongDetail').textContent = type === 'Reguler'
          ? `Anda tidak terjadwal mengajar pada hari ${hari} jam ke-${jam}. Jurnal tidak bisa disimpan untuk kombinasi ini — hubungi Admin kalau Jadwal belum/salah diisi.`
          : `Tidak ada guru lain yang terjadwal pada hari ${hari} jam ke-${jam} untuk digantikan.`;
        return;
      }
      window._journalJadwalKandidat = kandidat;
      pilihan.innerHTML = '<option value="">-- Pilih --</option>' + kandidat.map((k, idx) => {
        const label = type === 'Reguler' ? `${k.kelas} - ${k.mapel}` : `${k.kelas} - ${k.mapel} (Menggantikan: ${k.guru})`;
        return `<option value="${idx}">${escapeHtml(label)}</option>`;
      }).join('');
      if (kandidat.length === 1) { pilihan.value = '0'; terapkanJadwalPilihan(); }
    }
    function terapkanJadwalPilihan() {
      const pilihan = document.getElementById('journalJadwalPilihan');
      const idx = pilihan.value;
      const type = document.getElementById('journalType').value;
      if (idx === '' || !window._journalJadwalKandidat || !window._journalJadwalKandidat[parseInt(idx)]) {
        document.getElementById('journalClass').value = '';
        document.getElementById('journalSubject').value = '';
        document.getElementById('journalMewakiliGuru').value = '';
        window._journalMewakiliKey = null;
        document.getElementById('bentrokWarning').style.display = 'none';
        document.getElementById('bentrokSuccess').style.display = 'none';
        return;
      }
      const k = window._journalJadwalKandidat[parseInt(idx)];
      document.getElementById('journalClass').value = k.kelas;
      document.getElementById('journalSubject').value = k.mapel;
      // FIX terkait: simpan guruKey dari jadwal yang dipilih (bukan cuma nama k.guru) supaya
      // validasi "guru yang diwakili" saat simpan jurnal bisa cocokkan lewat key -- lihat
      // window._journalMewakiliKey dipakai di simpanJurnal().
      if (type === 'Non-Reguler') { document.getElementById('journalMewakiliGuru').value = k.guru || ''; window._journalMewakiliKey = k.guruKey || null; }
      checkBentrokJurnal();
    }

    // Helper bersama: hitung status bentrok jadwal guru saat ini pada satu slot tanggal/jam.
    // Dipakai oleh checkBentrokJurnal() (preview di form) DAN saveJournal() (Validasi E saat
    // submit sungguhan), supaya keduanya SELALU memakai kondisi yang sama persis -- sebelumnya
    // dua fungsi ini menulis ulang logika yang sama secara terpisah dan pernah "drift" (lihat
    // riwayat catatan FIX di bawah), berisiko terulang tiap kali salah satu diubah tanpa
    // mengubah yang lain.
    function getBentrokJurnalInfo(tanggal, jam_ke, kelas, type, excludeKey) {
      const bentrokList = allJournals.filter(j => j.tanggal === tanggal && j.jam_ke === jam_ke && (j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name) && j.status !== 'ditolak' && j.key !== excludeKey);
      const maxKelas = type === 'Reguler' ? 1 : 2;
      const sudahAdaKelasSama = bentrokList.some(j => j.kelas === kelas);
      return { bentrokList, maxKelas, sudahAdaKelasSama };
    }
    function checkBentrokJurnal() {
      const tanggal = document.getElementById('journalDate').value, jam = parseInt(document.getElementById('journalJam').value), kelas = document.getElementById('journalClass').value, subject = document.getElementById('journalSubject').value, type = document.getElementById('journalType').value;
      const warningEl = document.getElementById('bentrokWarning'), successEl = document.getElementById('bentrokSuccess');
      warningEl.style.display = 'none'; successEl.style.display = 'none';
      document.getElementById('journalLateWarning').style.display = 'none'; pendingSusulanData = null;
      if (!tanggal || !jam || !kelas || !subject) return;
      if (editingJournalKey) return;
      // FIX: disamakan persis dengan VALIDASI E di saveJournal() lewat getBentrokJurnalInfo() --
      // sebelumnya preview ini beda logika dari validasi saat Simpan sungguhan, sehingga badge di
      // sini bisa menyesatkan:
      // (1) jurnal berstatus 'ditolak' ikut dihitung sebagai "bentrok" di sini padahal saveJournal()
      //     mengecualikannya (jurnal yang sudah ditolak bukan lagi konflik nyata), dan
      // (2) preview cuma menghitung JUMLAH entri bentrok, tidak mengecek apakah KELAS yang sedang
      //     dipilih persis sama dengan yang sudah tercatat -- akibatnya untuk Non-Reguler, preview
      //     bisa menunjukkan hijau "✅ masih boleh 1 kelas lagi" walau kelas yang dipilih sekarang
      //     sama persis dengan yang sudah ada, padahal saveJournal() pasti menolaknya.
      const { bentrokList, maxKelas, sudahAdaKelasSama } = getBentrokJurnalInfo(tanggal, jam, kelas, type, editingJournalKey);
      if (sudahAdaKelasSama) {
        warningEl.style.display = 'block';
        document.getElementById('bentrokDetail').textContent = `⚠️ Anda sudah mengajar ${kelas} pada jam ke-${jam} tanggal ${tanggal}.`;
      } else if (bentrokList.length >= maxKelas) {
        const kelasBentrok = bentrokList.map(j=>j.kelas).join(', ');
        warningEl.style.display = 'block';
        document.getElementById('bentrokDetail').textContent = `⚠️ Anda sudah mengajar di kelas ${kelasBentrok} pada jam ke-${jam} tanggal ${tanggal}. ` + (type === 'Reguler' ? 'Guru Reguler tidak boleh mengajar lebih dari 1 kelas di jam yang sama.' : 'Non-Reguler maksimal 2 kelas di jam yang sama.');
      } else if (bentrokList.length > 0) {
        successEl.style.display = 'block';
        document.getElementById('bentrokDetailSuccess').textContent = `✅ Non-Reguler: Anda sudah mengajar ${bentrokList.length} kelas di jam ini. Masih boleh ${maxKelas - bentrokList.length} kelas lagi (max ${maxKelas}).`;
      } else {
        successEl.style.display = 'block';
        document.getElementById('bentrokDetailSuccess').textContent = `✅ Jam ke-${jam} pada tanggal ${tanggal} tersedia.`;
      }
    }

    function getKelasSaatIni() {
      const today = tglLokal();
      const now = new Date();
      const sekarangMenit = menitWIB(now); // WIB (bukan jam perangkat) -- jamSettings ditulis dalam WIB
      for (const j of allJournals) {
        if (j.tanggal !== today || (j.guruKey ? j.guruKey !== currentUser.key : j.guru !== currentUser.name)) continue;
        const jamKe = j.jam_ke;
        const settingJam = jamSettings[jamKe];
        if (!settingJam) continue;
        const mulai = settingJam.mulai.split(':'), selesai = settingJam.selesai.split(':');
        const mulaiMenit = parseInt(mulai[0])*60 + parseInt(mulai[1]);
        const selesaiMenit = parseInt(selesai[0])*60 + parseInt(selesai[1]);
        if (sekarangMenit >= mulaiMenit && sekarangMenit <= selesaiMenit) return [j.kelas];
      }
      let lastJournal = null;
      for (const j of allJournals) {
        if (j.tanggal !== today || (j.guruKey ? j.guruKey !== currentUser.key : j.guru !== currentUser.name)) continue;
        const jamKe = j.jam_ke;
        const settingJam = jamSettings[jamKe];
        if (!settingJam) continue;
        const selesai = settingJam.selesai.split(':');
        const selesaiMenit = parseInt(selesai[0])*60 + parseInt(selesai[1]);
        if (sekarangMenit <= selesaiMenit + 5) lastJournal = j;
      }
      if (lastJournal) return [lastJournal.kelas];
      return loaderScopeKelas();
    }

    function populateClassFilterDropdowns() {
      const attendanceSelect = document.getElementById('attendanceClassFilter'), gradesSelect = document.getElementById('gradesClassFilter'), sikapSelect = document.getElementById('sikapKelasFilter');
      let kelasListAttendance = [], kelasListGrades = [];
      if (isAdmin() || isKepsek()) { kelasListAttendance = [...KELAS_LIST]; kelasListGrades = kelasListAttendance; }
      else { kelasListAttendance = getKelasSaatIni(); kelasListGrades = loaderScopeKelas(); }
      attendanceSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
      gradesSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
      kelasListAttendance.forEach(k => { attendanceSelect.innerHTML += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`; });
      kelasListGrades.forEach(k => { gradesSelect.innerHTML += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`; });
      if (sikapSelect) { sikapSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>'; kelasListGrades.forEach(k => { sikapSelect.innerHTML += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`; }); }
      const bukuSelect = document.getElementById('bukuKelasFilter');
      if (bukuSelect) { bukuSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>'; kelasListGrades.forEach(k => { bukuSelect.innerHTML += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`; }); }
      const materiSelect = document.getElementById('materiKelasFilter');
      if (materiSelect) { materiSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>'; kelasListGrades.forEach(k => { materiSelect.innerHTML += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`; }); }
      const tugasSelect = document.getElementById('tugasKelasFilter');
      if (tugasSelect) { tugasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>'; kelasListGrades.forEach(k => { tugasSelect.innerHTML += `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`; }); }
      if (kelasListAttendance.length > 0) { attendanceSelect.value = kelasListAttendance[0]; selectedAttendanceClass = kelasListAttendance[0]; loadAttendance(); } else { document.getElementById('attendanceList').innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada kelas yang tersedia.</p>'; }
      if (kelasListGrades.length > 0) { gradesSelect.value = kelasListGrades[0]; loadGrades(); } else { document.getElementById('gradesContainer').innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada kelas yang tersedia.</p>'; }
    }

    // ============================================================
    // LOAD ALL DATA
    // ============================================================
    // ============================================================
    // OFFLINE SUPPORT: CACHE DATA FIREBASE (IndexedDB) & ANTRIAN SINKRONISASI
    // ============================================================
    // Ditopang oleh js/offline-db.js (window.SIMambaOfflineDB) + sw.js.
    // Tiga bagian di bawah ini:
    //   1) Cache data Firebase ke IndexedDB supaya bisa dibaca lagi saat offline.
    //   2) Antrian tulis (pendingWrites) untuk absensi & jurnal yang diisi saat offline.
    //   3) Helper UI (banner offline, badge jumlah belum tersinkron).
    let isOfflineMode = false;
    // Cache-first (login / pulihkan sesi): tampilkan data tersimpan milik user INI seketika, lalu segarkan
    // dari Firebase di belakang layar. Matikan dengan localStorage.setItem('simambaCacheFirst','0').
    let useCacheFirstOnce = false;   // diset true oleh showApp() tepat sebelum loadAllData() pertama
    let lastCoreRenderTs = 0;        // waktu render dashboard terakhir (untuk membuang render ganda saat boot)
    const SIMAMBA_CACHE_FIRST = (() => { try { return localStorage.getItem('simambaCacheFirst') !== '0'; } catch (e) { return true; } })();
    function coreRenderedJustNow() { return Date.now() - lastCoreRenderTs < 1500; }
    // Cache dipisah PER USER: kunci diberi awalan 'u:<key user>:'. Sebelumnya semua user berbagi satu
    // cache, jadi di perangkat yang dipakai bergantian, data guru sebelumnya bisa tampil saat
    // offline/timeout. Cache lama (tanpa awalan) tidak pernah dipakai lagi.
    function offlineCachePrefix() { return (currentUser && currentUser.key) ? 'u:' + currentUser.key + ':' : null; }
    let pendingWriteCount = 0;
    let isFlushingPendingWrites = false;

    // Dataset LAZY (dimuat saat halamannya dibuka, bukan saat boot) -- lihat LAZY_DATASETS di bawah loadAllData().
    // Peta: nama dataset -> kunci di snapshot cache. Kalau belum dimuat dari jaringan di sesi ini, JANGAN ikut
    // disimpan ke cache offline: isinya masih [] bawaan dan akan menimpa cache lama yang valid.
    const LAZY_CACHE_KEYS = { tugas: 'allTugas', tugasSubmission: 'allTugasSubmission', materi: 'allMateri', kalenderAkademik: 'allKalenderAkademik', kedisiplinanKategori: 'allKedisiplinanKategori' };
    const lazyLoadedSet = new Set();
    function snapshotOfflineDatasets() {
      const snap = snapshotOfflineDatasetsAll();
      Object.keys(LAZY_CACHE_KEYS).forEach(ds => { if (!lazyLoadedSet.has(ds)) delete snap[LAZY_CACHE_KEYS[ds]]; });
      delete snap.allSurat; // allSurat tidak lagi dimuat saat boot (loadSuratRiwayat() query sendiri saat halaman dibuka)
      return snap;
    }
    function snapshotOfflineDatasetsAll() {
      return {
        allSiswa, allSiswaSemua, allAttendance, allGrades, allJournals,
        allTeacherAttendance, allTeacherAttendanceToday,
        allEarlyLeaveRequests, allEvents, allEventAttendance, ekskulRates, allEkskulPicHonor,
        allUjian, allUjianAttendance, allInfaqSiswa, allInfaqPetugas, allReligiAttendance, allKedisiplinan, allKedisiplinanKategori, allBukuPenghubung, allMateri, allTugas, allTugasSubmission, allKalenderAkademik, allSaranKritik,
        allPengumuman, allLogs, allSurat, allJadwal,
        allGuruTerajin: (typeof allGuruTerajin !== 'undefined' ? allGuruTerajin : {}),
        jamSettings,
      };
    }

    // Dipanggil setiap kali loadAllData() berhasil ambil data dari Firebase, supaya
    // salinan terbaru selalu siap dipakai kalau nanti app dibuka tanpa koneksi.
    function cacheDatasetsToIndexedDB(owner, tandaiSegar) {
      if (!window.SIMambaOfflineDB) return;
      const pre = offlineCachePrefix();
      if (!pre) return;                                   // tidak ada user aktif -> jangan simpan apa pun
      if (owner && currentUser.key !== owner) return;     // ganti akun saat loading: data ini bukan milik user aktif
      const snap = snapshotOfflineDatasets(), out = {};
      Object.keys(snap).forEach(k => { out[pre + k] = snap[k]; });
      // Cap "segar" HANYA ditulis saat pemuatan penuh (Fase 2) selesai -- bukan saat satu dataset di-reload -- supaya cache
      // yang sebagian basi tidak tampak baru. Dipakai loadAllData() untuk melewati unduhan ulang saat buka-ulang cepat.
      if (tandaiSegar) out[pre + '__segarAt'] = { t: Date.now(), tahun: currentTahunAjaran, hari: tglLokal() };
      SIMambaOfflineDB.setCacheMany(out).then(purgeCacheLamaSekali).catch(err => console.warn('[Offline] Gagal menyimpan cache:', err));
    }

    // Sekali per perangkat: kosongkan kunci cache LAMA (tanpa awalan user) yang masih menyimpan data
    // guru sebelumnya. Aplikasi ini tidak lagi membacanya, tapi datanya masih tersimpan di IndexedDB.
    // Ditimpa dengan null (offline-db.js tidak diketahui punya fungsi hapus).
    function purgeCacheLamaSekali() {
      try { if (localStorage.getItem('simambaCachePurgedV2') === '1') return; } catch (e) { return; }
      const kosong = {};
      Object.keys(snapshotOfflineDatasetsAll()).forEach(k => { kosong[k] = null; });
      return SIMambaOfflineDB.setCacheMany(kosong).then(() => { try { localStorage.setItem('simambaCachePurgedV2', '1'); } catch (e) {} });
    }

    // Pulihkan seluruh dataset dari IndexedDB (dipakai saat app dibuka tanpa internet,
    // atau saat Firebase tidak kunjung merespons dalam waktu wajar).
    // opts.skipIf(): dicek SETELAH cache terbaca; true = jangan terapkan (data jaringan sudah lebih dulu masuk).
    // opts.cacheFirst: pemulihan awal login -- jangan tandai dataLoaded (Firebase masih dalam perjalanan).
    // callback(found): found=true kalau cache milik user ini ditemukan & diterapkan.
    function restoreDatasetsFromIndexedDB(callback, opts) {
      opts = opts || {};
      const pre = offlineCachePrefix();
      if (!window.SIMambaOfflineDB || !pre) { if (callback) callback(); return; }
      Promise.all([
        SIMambaOfflineDB.getCacheAll(),
        SIMambaOfflineDB.getAllPendingWrites().then(items => new Set((items || []).map(x => x.id)), () => null)
      ]).then(([all, pendingIds]) => {
        if (opts.skipIf && opts.skipIf()) { if (callback) callback(); return; }
        const cache = {};
        Object.keys(all || {}).forEach(k => { if (k.indexOf(pre) === 0) cache[k.slice(pre.length)] = all[k]; });
        // Buang record pendingSync yatim: sudah tidak ada di antrean (terkirim/dibatalkan) tapi masih tertinggal di cache.
        if (pendingIds) {
          ['allJournals', 'allAttendance', 'allTeacherAttendance', 'allTeacherAttendanceToday'].forEach(k => {
            if (Array.isArray(cache[k])) cache[k] = cache[k].filter(r => !(r && r.pendingSync) || pendingIds.has(r._pendingId));
          });
        }
        if (opts.syarat && !opts.syarat(cache)) { if (callback) callback(false); return; }   // cache tidak memenuhi syarat: jangan diterapkan
        const found = Object.keys(cache).length > 0;
        if (cache.allSiswaSemua) setAllSiswa(cache.allSiswaSemua); else if (cache.allSiswa) setAllSiswa(cache.allSiswa);   // cache lama (tanpa allSiswaSemua) = semua dianggap aktif
        if (cache.allAttendance) allAttendance = cache.allAttendance;
        if (cache.allGrades) allGrades = cache.allGrades;
        if (cache.allJournals) allJournals = cache.allJournals;
        if (cache.allTeacherAttendance) allTeacherAttendance = cache.allTeacherAttendance;
        if (cache.allTeacherAttendanceToday) allTeacherAttendanceToday = cache.allTeacherAttendanceToday;
        if (cache.allEarlyLeaveRequests) allEarlyLeaveRequests = cache.allEarlyLeaveRequests;
        if (cache.allEvents) allEvents = cache.allEvents;
        if (cache.allEventAttendance) allEventAttendance = cache.allEventAttendance;
        if (cache.ekskulRates) ekskulRates = cache.ekskulRates;
        if (cache.allEkskulPicHonor) allEkskulPicHonor = cache.allEkskulPicHonor;
        if (cache.allUjian) allUjian = cache.allUjian;
        if (cache.allUjianAttendance) allUjianAttendance = cache.allUjianAttendance;
        if (cache.allInfaqSiswa) allInfaqSiswa = cache.allInfaqSiswa;
        if (cache.allInfaqPetugas) allInfaqPetugas = cache.allInfaqPetugas;
        if (cache.allKedisiplinan) allKedisiplinan = cache.allKedisiplinan;
        if (cache.allKedisiplinanKategori) allKedisiplinanKategori = cache.allKedisiplinanKategori;
        if (cache.allBukuPenghubung) allBukuPenghubung = cache.allBukuPenghubung;
        if (cache.allMateri) allMateri = cache.allMateri;
        if (cache.allTugas) allTugas = cache.allTugas;
        if (cache.allTugasSubmission) allTugasSubmission = cache.allTugasSubmission;
        if (cache.allKalenderAkademik) allKalenderAkademik = cache.allKalenderAkademik;
        if (cache.allSaranKritik) allSaranKritik = cache.allSaranKritik;
        if (cache.allReligiAttendance) allReligiAttendance = cache.allReligiAttendance;
        if (cache.allPengumuman) allPengumuman = cache.allPengumuman;
        if (cache.allLogs) allLogs = cache.allLogs;
        if (cache.allSurat) allSurat = cache.allSurat;
        if (cache.allJadwal) allJadwal = cache.allJadwal;
        if (cache.allGuruTerajin && typeof allGuruTerajin !== 'undefined') allGuruTerajin = cache.allGuruTerajin;
        if (cache.jamSettings) jamSettings = cache.jamSettings;
        if (!opts.cacheFirst) dataLoaded = found;
        if (found) renderOfflineDataUI();
        if (callback) callback(found);
      }).catch(err => { console.warn('[Offline] Gagal memuat cache:', err); if (callback) callback(); });
    }

    // Pipeline render yang sama seperti setelah loadAllData() online berhasil, supaya
    // tampilan konsisten baik data berasal dari Firebase langsung maupun dari cache.
    function renderOfflineDataUI() {
      renderAll(); // sudah memanggil updateDashboard() utk halaman aktif
      populateRekapFilters();
      renderJikaAktif('rekap', renderRekap, false);
      populateClassFilterDropdowns();
      renderPengumuman();
      renderMarquee();
      // renderLogs/renderCharts/renderJadwalHariIni/updateStatusBar sudah dijalankan renderAll() -> updateDashboard()
      // (renderCharts kini juga aman dari error Chart.js belum termuat: try/catch ada di renderChartsNow()).
      if (typeof updateSaranKritikNotifDot === 'function') { try { updateSaranKritikNotifDot(); } catch (e) {} }
      if (typeof updateInfaqNotifDot === 'function') { try { updateInfaqNotifDot(); } catch (e) {} }
      if (typeof updateInfoOrtuNotifDot === 'function') { try { updateInfoOrtuNotifDot(); } catch (e) {} }
      checkPengumumanNotif();
      lastCoreRenderTs = Date.now();
    }

    // lambat=true: perangkat ONLINE tetapi pemuatan dari server melewati batas waktu (sinyal lemah) -> teks banner jujur ("Koneksi lambat"),
    // bukan "Mode Offline". Teks asli di HTML disimpan di data-asli dan dipulihkan untuk mode offline sungguhan.
    function setOfflineBannerVisible(show, lambat) {
      isOfflineMode = show;
      const banner = document.getElementById('offlineBanner');
      if (!banner) return;
      if (!banner.dataset.asli) banner.dataset.asli = banner.innerHTML;
      banner.innerHTML = (show && lambat) ? '⏳ Koneksi lambat — menampilkan data tersimpan terakhir, sedang memperbarui dari server. Absensi & jurnal yang diisi sekarang tetap aman.' : banner.dataset.asli;
      banner.style.display = show ? 'block' : 'none';
    }

    function updatePendingBadge() {
      if (!window.SIMambaOfflineDB) return;
      SIMambaOfflineDB.countPendingWrites().then(count => {
        pendingWriteCount = count;
        const badge = document.getElementById('pendingSyncBadge');
        if (!badge) return;
        if (count > 0) { badge.style.display = 'inline-flex'; badge.textContent = `🕓 ${count} belum tersinkron`; }
        else { badge.style.display = 'none'; }
      }).catch(() => {});
    }

    // Minta browser membangunkan Service Worker begitu koneksi kembali, walau tab ini
    // sudah ditutup (kalau didukung -- Chrome/Edge/Android). Lihat catatan keterbatasan
    // di sw.js bagian 'sync': tanpa tab terbuka, pengiriman tetap menunggu app dibuka lagi.
    function registerBackgroundSyncTag() {
      if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
      navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-si-mamba')).catch(err => console.warn('[Offline] Background Sync tidak tersedia:', err));
    }

    // ---------- Antrian: JURNAL ----------
    // Promise penyimpanan antrean per tempKey jurnal: dipakai cancelPendingJournal() kalau _pendingId belum terisi
    // (addPendingWrite masih berjalan). Sengaja di luar record supaya tidak ikut ter-clone ke cache IndexedDB.
    const _pendingAddByKey = {};
    function queueOfflineJournal(payload, customMsg) {
      // [PATCH] Tetapkan key Firebase SEKARANG (push() tanpa set() tidak menulis apa pun & tidak
      // butuh jaringan). Dengan key tetap, pengiriman ulang antrian bersifat idempoten.
      payload = Object.assign({}, payload, { _fbKey: payload._fbKey || db.ref('journal').push().key });
      // Random suffix ditambahkan di belakang Date.now() supaya tempKey TETAP unik walau 2 jurnal
      // offline disimpan tepat di milidetik yang sama (jarang, tapi mungkin di perangkat cepat) --
      // tanpa ini, tempKey bisa bentrok dan record kedua menimpa yang pertama di allJournals
      // (findIndex mencari key yang sama, jadi ketiban ke entri yang salah).
      const tempKey = 'pending-journal-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const localRecord = Object.assign({ key: tempKey, pendingSync: true }, payload);
      allJournals.push(localRecord); bumpJournalRev();
      if (window.SIMambaOfflineDB) {
        const addP = SIMambaOfflineDB.addPendingWrite('journal', payload);
        _pendingAddByKey[tempKey] = addP;
        addP.then(id => {
          delete _pendingAddByKey[tempKey];
          localRecord._pendingId = id;
          updatePendingBadge();
          registerBackgroundSyncTag();
        }).catch(err => {
          delete _pendingAddByKey[tempKey];
          console.error('[Offline] Gagal antre jurnal:', err);
          // Rollback: record tidak ada di antrean, jadi jangan dibiarkan tampil seolah tersimpan.
          const i = allJournals.indexOf(localRecord); if (i > -1) allJournals.splice(i, 1);
          bumpJournalRev();
          const actEl = document.getElementById('journalActivity');
          if (actEl && !actEl.value) { actEl.value = payload.activity || ''; updateJournalActivityCounter(); }
          renderJournals();
          toast('❌ Gagal menyimpan jurnal offline. Isi jurnal dikembalikan ke form, coba simpan lagi.', true, 5000);
        });
      }
      document.getElementById('journalActivity').value = '';
      updateJournalActivityCounter();
      document.getElementById('bentrokWarning').style.display = 'none';
      document.getElementById('bentrokSuccess').style.display = 'none';
      renderJournals();
      // Pesan disesuaikan kalau entri ini disimpan sebagai Jurnal Susulan (status 'pending')
      // karena dibuat offline di luar jam pelajaran -- lihat catatan FIX di saveJournal().
      toast(customMsg || (payload.status === 'pending'
        ? '📥 Offline & di luar jam pelajaran: jurnal disimpan sebagai Jurnal Susulan, menunggu approval Admin setelah tersinkron.'
        : '📥 Offline: jurnal disimpan di perangkat ini, akan otomatis dikirim saat online kembali.'), false, 4500);
    }

    function cancelPendingJournal(tempKey) {
      const idx = allJournals.findIndex(j => j.key === tempKey);
      if (idx === -1) return;
      if (!confirm('Batalkan jurnal offline ini? Data yang sudah diketik akan hilang.')) return;
      const record = allJournals[idx];
      allJournals.splice(idx, 1); bumpJournalRev();
      if (window.SIMambaOfflineDB) {
        if (record._pendingId != null) {
          SIMambaOfflineDB.deletePendingWrite(record._pendingId).then(updatePendingBadge).catch(() => {});
        } else if (_pendingAddByKey[tempKey]) {
          // _pendingId belum siap (antrean masih menyimpan): tunggu id-nya lalu hapus, supaya tidak terkirim diam-diam.
          _pendingAddByKey[tempKey].then(id => SIMambaOfflineDB.deletePendingWrite(id)).then(updatePendingBadge).catch(() => {});
        }
      }
      renderJournals();
      toast('✖️ Jurnal offline dibatalkan.', false, 2000);
    }

    // ---------- Antrian: ABSENSI ----------
    function queueOfflineAttendance(payload, customMsg) {
      // Perbarui juga draft lokal allAttendance supaya validasi lain yang bergantung padanya
      // (mis. cek "absensi siswa sudah diisi" di form Jurnal) tetap konsisten walau data ini
      // belum benar-benar terkirim ke Firebase.
      const existingIdx = allAttendance.findIndex(a => a.tanggal === payload.tanggal && a.kelas === payload.kelas);
      const localRecord = Object.assign({ key: 'pending-attendance-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), pendingSync: true }, payload);
      const prevRecord = existingIdx > -1 ? allAttendance[existingIdx] : null;
      if (existingIdx > -1) allAttendance[existingIdx] = localRecord; else allAttendance.push(localRecord);
      if (window.SIMambaOfflineDB) {
        SIMambaOfflineDB.addPendingWrite('attendance', payload).then(id => {
          localRecord._pendingId = id;
          updatePendingBadge();
          registerBackgroundSyncTag();
        }).catch(err => {
          console.error('[Offline] Gagal antre absensi:', err);
          // Rollback: kembalikan record lama (kalau ada) atau buang record sementara.
          const i = allAttendance.indexOf(localRecord);
          if (i > -1) { if (prevRecord) allAttendance[i] = prevRecord; else allAttendance.splice(i, 1); }
          try { loadAttendance(); } catch (e) {}
          toast('❌ Gagal menyimpan absensi offline. Coba simpan lagi.', true, 5000);
        });
      }
      toast(customMsg || '📥 Offline: absensi disimpan di perangkat ini, akan otomatis dikirim saat online kembali.', false, 4500);
    }

    // ---------- Flush (kirim antrian ke Firebase begitu online) ----------
    function flushPendingWrites(manual) {
      if (!window.SIMambaOfflineDB) return;
      if (!isReallyOnline()) { if (manual) toast('📡 Masih offline / sinyal belum stabil, coba lagi sebentar lagi.', true); return; }
      if (isFlushingPendingWrites) { if (manual) toast('⏳ Sinkronisasi sedang berjalan...', false, 2000); return; }
      isFlushingPendingWrites = true;
      SIMambaOfflineDB.getAllPendingWrites().then(items => {
        if (items.length === 0) { isFlushingPendingWrites = false; if (manual) toast('✅ Tidak ada data yang menunggu sinkronisasi.', false, 2000); return; }
        if (manual) toast(`🔄 Menyinkronkan ${items.length} data tertunda...`, false, 3000);
        let idx = 0, gagal = 0, tertunda = 0, berhasil = 0;
        function next() {
          // [PATCH] koneksi putus di tengah sinkron -> berhenti, sisa antrian dicoba lagi nanti
          if (idx < items.length && !isReallyOnline()) { isFlushingPendingWrites = false; updatePendingBadge(); return; }
          if (idx >= items.length) {
            isFlushingPendingWrites = false;
            updatePendingBadge();
            // Cache offline sebelum flush masih memuat record pendingSync; kosongkan dulu supaya tidak jadi
            // "yatim" kalau app dibuka offline setelah ini. loadAllData() menulis ulang cache dari data server.
            (berhasil > 0 ? invalidasiCachePendingSetelahFlush() : Promise.resolve()).then(() => loadAllData());
            if (gagal > 0) toast(`⚠️ ${gagal} data belum berhasil disinkron, akan dicoba lagi otomatis.`, true, 4000);
            else if (tertunda > 0) toast(`⏳ ${tertunda} data masih menunggu sinyal yang lebih stabil, akan dicoba lagi otomatis.`, false, 4000);
            else if (manual) toast('✅ Semua data berhasil disinkronkan!', false, 3000);
            return;
          }
          const item = items[idx++];
          flushOnePendingWrite(item).then(() => { berhasil++; next(); }).catch(err => {
            console.warn('[Offline] Gagal sinkron 1 item, akan dicoba lagi nanti:', err);
            // [PATCH] Timeout karena jaringan macet BUKAN kegagalan data -- jangan dihitung sebagai
            // percobaan gagal (supaya item tidak dibuang gara-gara sinyal jelek).
            if (err && err.isDeadline) { tertunda++; next(); }
            else { gagal++; SIMambaOfflineDB.bumpAttempt(item.id).finally(next); }
          });
        }
        next();
      }).catch(err => { isFlushingPendingWrites = false; console.error('[Offline] Gagal baca antrian:', err); });
    }

    // Kosongkan salinan cache dataset yang bisa memuat record pendingSync (milik user aktif).
    function invalidasiCachePendingSetelahFlush() {
      const pre = offlineCachePrefix();
      if (!window.SIMambaOfflineDB || !pre) return Promise.resolve();
      const kosong = {};
      ['allJournals', 'allAttendance', 'allTeacherAttendance', 'allTeacherAttendanceToday'].forEach(k => { kosong[pre + k] = null; });
      return SIMambaOfflineDB.setCacheMany(kosong).catch(err => console.warn('[Offline] Gagal invalidasi cache:', err));
    }

    function flushOnePendingWrite(item) {
      if (item.type === 'journal') return promiseDeadline(flushPendingJournal(item), FLUSH_ITEM_DEADLINE_MS);
      if (item.type === 'attendance') return promiseDeadline(flushPendingAttendance(item), FLUSH_ITEM_DEADLINE_MS);
      if (item.type === 'teacher_attendance') return promiseDeadline(flushPendingTeacherAttendance(item), FLUSH_ITEM_DEADLINE_MS);
      // Tipe tak dikenal (mis. dari versi lama) -> buang saja supaya antrian tidak macet permanen.
      return SIMambaOfflineDB.deletePendingWrite(item.id);
    }

    function flushPendingJournal(item) {
      return new Promise((resolve, reject) => {
        // [PATCH] key Firebase sudah ditentukan saat antre (_fbKey) -> kirim ulang berkali-kali
        // tetap menimpa node yang SAMA, tidak membuat jurnal dobel.
        const p = Object.assign({}, item.payload); const fbKey = p._fbKey; delete p._fbKey;
        const ref = fbKey ? db.ref('journal/' + fbKey) : db.ref('journal').push();
        ref.set(p, err => {
          if (err) return reject(err);
          const idx = allJournals.findIndex(j => j._pendingId === item.id);
          if (idx > -1) { allJournals[idx] = Object.assign({ key: ref.key }, p); bumpJournalRev(); }
          SIMambaOfflineDB.deletePendingWrite(item.id).then(resolve).catch(resolve);
        });
      });
    }

    const _flushAttKeyByItem = {};
    function flushPendingAttendance(item) {
      return new Promise((resolve, reject) => {
        const p = Object.assign({}, item.payload); const fbKey = p._fbKey; delete p._fbKey;
        const kirim = (ref) => {
          ref.set(p, err => {
            if (err) return reject(err);
            const idx = allAttendance.findIndex(a => a._pendingId === item.id);
            if (idx > -1) allAttendance[idx] = Object.assign({ key: ref.key }, p);
            SIMambaOfflineDB.deletePendingWrite(item.id).then(resolve).catch(resolve);
          });
        };
        // [PATCH] Kalau key sudah diketahui saat antre, langsung tulis ke node itu (idempoten).
        if (fbKey) return kirim(db.ref('attendance/' + fbKey));
        // Item lama tanpa _fbKey: ingat key yang dipilih untuk item ini selama sesi, supaya percobaan ulang
        // (mis. kena batas waktu padahal tulisan pertama masih berjalan) menulis ke node yang SAMA, bukan push() baru.
        if (_flushAttKeyByItem[item.id]) return kirim(db.ref('attendance/' + _flushAttKeyByItem[item.id]));
        db.ref('attendance').orderByChild('tanggal').equalTo(p.tanggal).once('value', snap => {
          let existingKey = null;
          snap.forEach(child => { if (child.val().kelas === p.kelas) existingKey = child.key; });
          const ref = existingKey ? db.ref('attendance/' + existingKey) : db.ref('attendance').push();
          _flushAttKeyByItem[item.id] = ref.key;
          kirim(ref);
        }, reject);
      });
    }

    // Kirim absen QR guru yang tersimpan offline. Key tetap (tanggal_guru_tipe) + transaction: kalau sudah ada
    // catatan (mis. absen dari perangkat lain / sudah terkirim sebelumnya), TIDAK ditimpa dan item dianggap selesai.
    function flushPendingTeacherAttendance(item) {
      return new Promise((resolve, reject) => {
        const p = Object.assign({}, item.payload); const fbKey = p._fbKey; delete p._fbKey;
        if (!fbKey) { SIMambaOfflineDB.deletePendingWrite(item.id).then(resolve).catch(resolve); return; } // item rusak, buang
        guruSesiSiap().then(() => db.ref('teacher_attendance/' + fbKey).transaction(existing => {
          if (existing !== null) return; // sudah ada -- batalkan, jangan timpa
          return p;
        }, (err) => {
          if (err) return reject(err);
          const idx = allTeacherAttendance.findIndex(a => a._pendingId === item.id);
          if (idx > -1) { allTeacherAttendance[idx] = Object.assign({ key: fbKey }, p); bumpTaRev(); }
          SIMambaOfflineDB.deletePendingWrite(item.id).then(resolve).catch(resolve);
        }, false));
      });
    }

    // HEMAT KUOTA: sinyal HP yang naik-turun memicu event 'online' berkali-kali, dan dulu tiap kali itu
    // mengunduh ulang semua data. Kalau data lengkap baru dimuat < 10 menit lalu, cukup dipakai apa adanya
    // (pengumuman & pengaturan tetap sinkron lewat listener; penulisan sendiri tidak terpengaruh).
    function muatUlangBilaBasi() {
      if (dataLoaded && lastFullLoadAt && (Date.now() - lastFullLoadAt) < MUAT_ULANG_MIN_MS) return;
      loadAllData();
    }
    // ---------- Event koneksi browser ----------
    function handleBrowserOnline() {
      setOfflineBannerVisible(false);
      toast('🌐 Koneksi internet kembali tersambung.', false, 2500);
      if (currentUser) {
        // Kalau masih ada antrean offline, JANGAN loadAllData() sekarang: loader mengganti seluruh array
        // (allJournals/allAttendance/allTeacherAttendance) dengan data server yang belum memuat data antrean,
        // sehingga entri yang baru dibuat offline "hilang" sesaat & bisa tersimpan dobel. flushPendingWrites()
        // sendiri memanggil loadAllData() setelah antrean selesai.
        if (window.SIMambaOfflineDB) {
          SIMambaOfflineDB.countPendingWrites().then(n => { if (n > 0) flushPendingWrites(); else muatUlangBilaBasi(); }).catch(() => muatUlangBilaBasi());
        } else { muatUlangBilaBasi(); }
      }
      else { loadGuruListForLogin(); } // belum login -- aman di-refresh di background siapa pun tampilannya (chooser/form PIN/Portal Ortu)
    }
    function handleBrowserOffline() {
      setOfflineBannerVisible(true);
      toast('📡 Koneksi internet terputus. Mode offline aktif — perubahan tetap bisa disimpan dan akan otomatis dikirim nanti.', true, 5000);
    }

    function loadGuruListForLoginFromCache(select, loading, callback) {
      if (!window.SIMambaOfflineDB) { select.innerHTML = '<option value="">-- Tidak ada koneksi --</option>'; if (loading) loading.style.display = 'none'; if (callback) callback(); return; }
      SIMambaOfflineDB.getCache('allGuru').then(cached => {
        if (cached && cached.length) {
          allGuru = cached;
          select.innerHTML = '<option value="">-- Pilih (mode offline) --</option>';
          allGuru.slice().sort((a,b) => COLLATOR_ID.compare(a.name, b.name)).forEach(g => { select.innerHTML += `<option value="${g.key}">${escapeHtml(g.name)}</option>`; });
          select.innerHTML += `<option value="admin">🛠️ Admin</option><option value="kepsek">👑 Kepala Sekolah</option>`;
          setOfflineBannerVisible(true);
        } else {
          select.innerHTML = '<option value="">-- Offline & belum ada data tersimpan --</option>';
        }
        if (loading) loading.style.display = 'none';
        if (callback) callback();
      }).catch(() => { select.innerHTML = '<option value="">-- Tidak ada koneksi --</option>'; if (loading) loading.style.display = 'none'; if (callback) callback(); });
    }

    // BATAS USIA CACHE (hemat kuota Firebase): saat aplikasi dibuka ulang (login/pulihkan sesi, mis. reload atau pembaruan
    // versi) dan salinan lengkap di IndexedDB masih baru (< N menit, tahun ajaran & hari sama, milik user yang sama),
    // pakai salinan itu dan LEWATI unduhan ulang. Pemuatan lain (tombol "Muat ulang data", ganti tahun ajaran, kembali
    // online) tetap mengunduh penuh. Atur lewat localStorage 'simambaCacheTtlMenit' (bawaan 5; 0 = matikan).
    function cacheTtlMs() {
      try { const v = localStorage.getItem('simambaCacheTtlMenit'); if (v !== null && v !== '' && !isNaN(Number(v))) return Math.max(0, Math.min(60, Number(v))) * 60000; } catch (e) {}
      return 5 * 60000;
    }
    let cekCacheTtlJalan = false;   // pemeriksaan cache sedang berjalan: panggilan loadAllData() lain pada saat itu (mis. dari checkFirebase) diabaikan agar tidak mengunduh ganda
    function loadAllData(callback, onFullyLoaded) {
      if (cekCacheTtlJalan) return;
      const ttl = cacheTtlMs();
      if (!(useCacheFirstOnce && ttl > 0 && SIMAMBA_CACHE_FIRST && db && currentUser && navigator.onLine && window.SIMambaOfflineDB)) return loadAllDataPenuh(callback, onFullyLoaded);
      const owner = currentUser.key;
      cekCacheTtlJalan = true;
      restoreDatasetsFromIndexedDB(found => {
        cekCacheTtlJalan = false;
        if (!found || !currentUser || currentUser.key !== owner) { loadAllDataPenuh(callback, onFullyLoaded); return; }
        useCacheFirstOnce = false;
        lazyLoadedSet.clear();
        dataLoaded = true; lastFullLoadAt = Date.now();
        setOfflineBannerVisible(false);
        perfLog('cache masih segar (< ' + Math.round(ttl / 60000) + ' mnt): unduhan ulang dilewati');
        if (callback) callback();
        if (onFullyLoaded) onFullyLoaded();
      }, {
        syarat: c => {
          const m = c && c.__segarAt, umur = m ? Date.now() - m.t : -1;
          return !!m && umur >= 0 && umur < ttl && m.tahun === currentTahunAjaran && m.hari === tglLokal();
        }
      });
    }
    function loadAllDataPenuh(callbackRaw, onFullyLoaded) {
      // callback hanya boleh jalan SEKALI, walau cache-first, fallback timeout, dan Fase 1 semuanya mencoba memanggilnya.
      let cbFired = false;
      const callback = callbackRaw ? () => { if (cbFired) return; cbFired = true; callbackRaw(); } : null;
      const _owner = currentUser ? currentUser.key : null;
      // Kalau tahun ajaran berubah selagi query berjalan (rekonsiliasi school_settings), hasil query LAMA
      // jangan sampai menimpa hasil query baru: callback yang basi cukup resolve tanpa menyentuh data.
      const _tahunMulai = currentTahunAjaran;
      const _basi = () => _tahunMulai !== currentTahunAjaran;
      lazyLoadedSet.clear();
      // [PATCH] cache-first juga dipakai saat data belum pernah dimuat & Firebase belum tersambung
      // (sinyal lemah), bukan hanya sekali saat login -- dashboard langsung tampil dari cache.
      const cacheFirst = useCacheFirstOnce || (!dataLoaded && !fbConnected); useCacheFirstOnce = false;
      if (!db || !currentUser) { if (callback) callback(); if (onFullyLoaded) onFullyLoaded(); return; }

      // OFFLINE: kalau browser mendeteksi tidak ada koneksi sama sekali, jangan buang waktu
      // menunggu Firebase (yang tidak akan pernah tersambung) -- langsung pakai data hasil
      // cache IndexedDB dari sinkronisasi terakhir yang berhasil.
      if (!navigator.onLine) {
        setOfflineBannerVisible(true);
        restoreDatasetsFromIndexedDB(() => { if (callback) callback(); if (onFullyLoaded) onFullyLoaded(); });
        return;
      }

      // ============================================================
      // PEMUATAN 2 FASE -- dibuat supaya loading awal terasa lebih cepat.
      // Sebelumnya SEMUA (~31) query Firebase harus selesai dulu baru
      // dashboard ditampilkan. Sekarang dipisah:
      //   FASE 1 (corePromises)   -- data yang langsung kelihatan begitu
      //     dashboard terbuka (siswa, jadwal hari ini, pengumuman, absen
      //     guru hari ini, guru terajin, log admin). callback() dipanggil
      //     SEGERA setelah fase ini selesai -- loading disembunyikan,
      //     dashboard tampil, TANPA menunggu sisanya.
      //   FASE 2 (secondaryPromises) -- lanjut jalan di BACKGROUND begitu
      //     Fase 1 selesai (absensi, nilai, jurnal, tugas, dll -- data
      //     yang baru benar-benar dipakai kalau halaman terkait dibuka).
      //     Begitu selesai, seluruh halaman di-render ulang dengan data
      //     lengkap. Tidak ada data yang dihilangkan -- cuma diatur ulang
      //     KAPAN masing-masing dimuat & dirender.
      //   PARAMETER onFullyLoaded (opsional) -- dipanggil setelah FASE 2
      //     benar-benar selesai (bukan cuma fase 1). WAJIB dipakai kalau
      //     kode pemanggil butuh allAttendance/allGrades/dll yang baru
      //     (mis. loadAttendance()/loadGrades() setelah tambah/edit siswa)
      //     -- JANGAN pakai setTimeout(...,angka) untuk menebak-nebak fase
      //     2 sudah selesai, karena di koneksi lambat tebakan itu bisa
      //     meleset dan merender data yang masih kosong/basi.
      // Catatan performa lanjutan (kalau nanti masih terasa perlu lebih
      // cepat lagi): renderAll() di bawah tetap merender SEMUA halaman
      // sekaligus (termasuk yang sedang tidak dibuka) -- baru fase
      // berikutnya adalah membuat render per-halaman juga jadi malas
      // (lazy), bukan cuma query-nya.
      // ============================================================
      const corePromises = [];
      const secondaryPromises = [];
      // infaq_petugas_v4 dimuat paling awal & paralel: filter siswa/iuran_siswa butuh daftar petugas (scopeKelasData).
      const infaqPetugasP = new Promise((resolve) => { db.ref('infaq_petugas_v4').once('value', snap => { allInfaqPetugas = snap.val() || {}; resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (infaq_petugas_v4):', err && err.message ? err.message : err); resolve(); }); });
      const _tStart = performance.now();

      // ---- FASE 1: dibutuhkan dashboard & layar login ----
      corePromises.push(fbTimeout(new Promise((resolve) => { infaqPetugasP.then(() => bacaSiswaSesuaiScope()).then(list => { setAllSiswa(list); resolve(); }).catch(err => { console.warn('[SI MAMBA] Query ditolak/gagal (siswa):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'siswa'));
      corePromises.push(fbTimeout(new Promise((resolve) => { const todayStr = tglLokal(); db.ref('teacher_attendance').orderByChild('tanggal').equalTo(todayStr).once('value', snap => { allTeacherAttendanceToday = []; snap.forEach(child => { const ta = child.val(); ta.key = child.key; if (ta.tahunAjaran === currentTahunAjaran) allTeacherAttendanceToday.push(ta); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (teacher_attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'teacher_attendance'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('guru_terajin').once('value', snap => { allGuruTerajin = snap.val() || {}; resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (guru_terajin):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'guru_terajin'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('pengumuman').once('value', snap => { allPengumuman = []; snap.forEach(child => { const p = child.val(); p.key = child.key; allPengumuman.push(p); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (pengumuman):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'pengumuman'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('jadwal').once('value', snap => { allJadwal = []; snap.forEach(child => { const j = child.val(); j.key = child.key; allJadwal.push(j); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (jadwal):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'jadwal'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('absen_qr_settings').once('value', snap => { if (typeof V4 !== 'undefined') { V4.absenQr = snap.val() || null; v4CacheAbsenQr(V4.absenQr); } resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (absen_qr_settings):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'absen_qr_settings'));
      if (isAdmin()) {
        corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('logs').orderByChild('waktu').limitToLast(30).once('value', snap => { allLogs = []; snap.forEach(child => { const log = child.val(); log.key = child.key; allLogs.push(log); }); allLogs.reverse(); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (logs):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'logs'));
      } else { allLogs = []; }

      // ---- FASE 2: khusus halaman masing-masing, dimuat di background ----
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allAttendance = []; snap.forEach(child => { const a = child.val(); a.key = child.key; if (loaderScopeKelas().includes(a.kelas)) allAttendance.push(a); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'attendance'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('grades').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allGrades = []; snap.forEach(child => { const g = child.val(); g.key = child.key; if (loaderScopeKelas().includes(g.kelas)) allGrades.push(g); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (grades):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'grades'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('journal').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allJournals = []; snap.forEach(child => { const j = child.val(); j.key = child.key; if (loaderScopeKelas().includes(j.kelas)) allJournals.push(j); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (journal):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'journal'));
      secondaryPromises.push(_muatAbsenGuruSaya().then(a => { if (_basi()) return; if (a) allTeacherAttendance = a; }).catch(err => { console.warn('[SI MAMBA] Query ditolak/gagal (teacher_attendance):', err && err.message ? err.message : err); }));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('early_leave_requests').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allEarlyLeaveRequests = []; snap.forEach(child => { const r = child.val(); r.key = child.key; if (isAdmin() || isKepsek() || (r.guruKey ? r.guruKey === currentUser.key : r.guru === currentUser.name)) allEarlyLeaveRequests.push(r); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (early_leave_requests):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'early_leave_requests'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('events').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allEvents = []; snap.forEach(child => { const ev = child.val(); ev.key = child.key; allEvents.push(ev); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (events):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'events'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('ekskul_rates').once('value', snap => { ekskulRates = snap.val() || {}; resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (ekskul_rates):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'ekskul_rates'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('ujian').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allUjian = []; snap.forEach(child => { const u = child.val(); u.key = child.key; allUjian.push(u); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (ujian):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'ujian'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('ujian_attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allUjianAttendance = []; snap.forEach(child => { const ua = child.val(); ua.key = child.key; delete ua.foto; allUjianAttendance.push(ua); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (ujian_attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'ujian_attendance'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('event_attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allEventAttendance = []; snap.forEach(child => { const ea = child.val(); ea.key = child.key; delete ea.foto; allEventAttendance.push(ea); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (event_attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'event_attendance'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('ekskul_pic_honor_v4').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allEkskulPicHonor = []; snap.forEach(child => { const eh = child.val(); eh.key = child.key; allEkskulPicHonor.push(eh); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (ekskul_pic_honor_v4):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'ekskul_pic_honor_v4'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('religi_attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allReligiAttendance = []; snap.forEach(child => { const item = child.val(); item.key = child.key; allReligiAttendance.push(item); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (religi_attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'religi_attendance'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('iuran_siswa').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', async snap => { await infaqPetugasP; if (_basi()) { resolve(); return; } allInfaqSiswa = []; const _sc = new Set(scopeKelasData()); snap.forEach(child => { const it = child.val(); it.key = child.key; if (_sc.has(it.kelas)) allInfaqSiswa.push(it); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (iuran_siswa):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'iuran_siswa'));
      secondaryPromises.push(fbTimeout(infaqPetugasP, undefined, 'infaq_petugas_v4')); // fetch-nya sudah jalan di atas
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('kedisiplinan_siswa').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allKedisiplinan = []; snap.forEach(child => { const d = child.val(); d.key = child.key; if (loaderScopeKelas().includes(d.kelas)) allKedisiplinan.push(d); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (kedisiplinan_siswa):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'kedisiplinan_siswa'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('buku_penghubung').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allBukuPenghubung = []; snap.forEach(child => { const b = child.val(); b.key = child.key; if (loaderScopeKelas().includes(b.kelas)) allBukuPenghubung.push(b); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (buku_penghubung):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'buku_penghubung'));
      if (isAdmin() || isKepsek()) {
        secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('saran_kritik').once('value', snap => { allSaranKritik = []; snap.forEach(child => { const s = child.val(); s.key = child.key; allSaranKritik.push(s); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (saran_kritik):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'saran_kritik'));
      }

      let settled = false;
      // Kalau koneksi ada tapi macet/lambat (sinyal lemah, captive portal, dsb), jangan biarkan
      // app "loading" selamanya -- setelah 9 detik, tetap tampilkan data dari cache terakhir
      // supaya app tetap terpakai. Promise Firebase yang asli tetap jalan di background dan akan
      // memperbarui tampilan begitu selesai (lihat guard `settled` di bawah).
      const timeoutTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        setOfflineBannerVisible(true, navigator.onLine);   // online tapi lambat -> "Koneksi lambat", bukan "Mode Offline"
        restoreDatasetsFromIndexedDB(() => { if (callback) callback(); if (onFullyLoaded) onFullyLoaded(); });
      }, FB_LOAD_FALLBACK_MS);

      // CACHE-FIRST: cache dibaca paralel dengan query jaringan. Hanya diterapkan kalau belum ada data
      // jaringan yang masuk (supaya data lama tidak pernah menimpa data baru) dan cache-nya milik user ini.
      if (cacheFirst && SIMAMBA_CACHE_FIRST && callback) {
        const fbCountAtStart = fbCompletedCount;
        restoreDatasetsFromIndexedDB((found) => { if (found) { perfLog('cache-first: dashboard dari cache'); callback(); } }, {
          cacheFirst: true,
          skipIf: () => settled || fbCompletedCount !== fbCountAtStart
        });
      }

      function renderCoreUI() {
        if (typeof v4ApplyMode === 'function') v4ApplyMode();
        perfTime('renderAll', renderAll);
        perfTime('renderPengumuman', renderPengumuman);
        perfTime('renderMarquee', renderMarquee);
        // renderLogs / renderCharts / renderJadwalHariIni / updateStatusBar / updateDashboard TIDAK dipanggil
        // lagi di sini: renderAll() -> updateDashboard() sudah menjalankan semuanya (sekali, dan hanya kalau
        // dashboard sedang aktif; kalau tidak, ditunda sampai dashboard dibuka).
        perfTime('checkPengumumanNotif', checkPengumumanNotif);
        lastCoreRenderTs = Date.now();
      }

      function renderFullUI() {
        // Refresh visibilitas menu sidebar (mis. "Infaq Madrasah") setelah data selesai dimuat.
        if (typeof v4ApplyMode === 'function') v4ApplyMode();
        perfTime('renderAll', renderAll);
        perfTime('populateRekapFilters', populateRekapFilters);
        renderJikaAktif('rekap', () => perfTime('renderRekap', renderRekap), false); // navigateTo('rekap') sudah memanggil renderRekap()
        perfTime('populateClassFilterDropdowns', populateClassFilterDropdowns);
        perfTime('renderPengumuman', renderPengumuman);
        perfTime('renderMarquee', renderMarquee);
        // renderLogs/renderCharts/renderJadwalHariIni/updateStatusBar sudah dijalankan renderAll() -> updateDashboard().
        perfTime('checkPengumumanNotif', checkPengumumanNotif);
        if (document.getElementById('page-jadwal') && !document.getElementById('page-jadwal').classList.contains('hidden')) { loadJadwal(); setJadwalView('harian'); }
        if (document.getElementById('page-rekap-nilai') && !document.getElementById('page-rekap-nilai').classList.contains('hidden')) { renderRekapNilai(); }
        if (document.getElementById('page-laporan') && !document.getElementById('page-laporan').classList.contains('hidden')) { loadReportPreview(); }
        if (document.getElementById('page-user-management') && !document.getElementById('page-user-management').classList.contains('hidden')) { renderUserList(); }
        // FIX: dulu alphaAutoCheckedThisSession di-set true SEBELUM tahu autoMarkAlphaGuru()
        // berhasil/gagal -- kalau sebagian penulisan gagal (mis. koneksi putus di tengah),
        // checkpoint tanggal (alphaCheckLastDate) memang tidak maju (lihat autoMarkAlphaGuru),
        // tapi flag sesi ini sudah kadung true sehingga fungsi TIDAK akan dicoba lagi sepanjang
        // sesi tsb -- retry baru terjadi kalau Admin logout/reload. Sekarang flag hanya di-set
        // setelah autoMarkAlphaGuru() betul-betul selesai (resolve), lewat callback di dalamnya.
        if (isAdmin() && !alphaAutoCheckedThisSession) { autoMarkAlphaGuru(() => { alphaAutoCheckedThisSession = true; bersihkanAlphaKeliru(); }); }
      }

      Promise.all(corePromises).then(() => {
        if (settled) {
          // Fallback cache (sinyal lambat) sudah tampil lebih dulu. Dulu di sini langsung return, sehingga banner "Mode Offline" TIDAK PERNAH dicabut
          // walau data dari server akhirnya masuk lengkap. Kini: bila memang tersambung, cabut banner, segarkan tampilan, lalu lanjutkan fase 2.
          if (navigator.onLine && fbConnected) {
            setOfflineBannerVisible(false);
            try { renderCoreUI(); } catch (e) { console.warn('[SI MAMBA] render susulan (core) gagal:', e); }
            Promise.all(secondaryPromises).then(() => {
              cacheDatasetsToIndexedDB(_owner, true);
              dataLoaded = true; lastFullLoadAt = Date.now();
              try { renderFullUI(); } catch (e) { console.warn('[SI MAMBA] render susulan (penuh) gagal:', e); }
            }).catch(err => console.warn('[SI MAMBA] Load data susulan (sekunder) gagal:', err));
          }
          return;
        }
        clearTimeout(timeoutTimer);
        setOfflineBannerVisible(false);
        settled = true;
        const _tR1 = performance.now();
        renderCoreUI();
        perfLog('FASE 1 selesai', Math.round(_tR1 - _tStart) + 'ms sejak loadAllData mulai | renderCoreUI', Math.round(performance.now() - _tR1) + 'ms');
        if (callback) callback(); // sembunyikan loading & tampilkan dashboard SEKARANG

        // FASE 2 lanjut di background -- tidak menahan tampilan yang sudah muncul.
        Promise.all(secondaryPromises).then(() => {
          cacheDatasetsToIndexedDB(_owner, true);
          dataLoaded = true; lastFullLoadAt = Date.now();
          try { if (isAdmin()) cekDataLamaBelumMigrasi(); } catch (e) {}
          const _tR2 = performance.now();
          renderFullUI();
          perfLog('FASE 2 selesai', Math.round(_tR2 - _tStart) + 'ms sejak loadAllData mulai | renderFullUI', Math.round(performance.now() - _tR2) + 'ms');
          if (onFullyLoaded) onFullyLoaded();
        }).catch(err => {
          console.error('Load data (fase 2/sekunder) gagal:', err);
          // Dashboard (fase 1) sudah tampil & tetap terpakai; kegagalan fase 2 cukup
          // dicatat di console -- akan dicoba ulang otomatis saat checkFirebase()
          // berikutnya mendeteksi koneksi (lihat pengecekan dataLoaded di sana).
          // onFullyLoaded TETAP dipanggil (bukan digantung selamanya) supaya kode
          // pemanggil yang menunggu (mis. loadAttendance()) tetap jalan dengan data
          // yang ada, alih-alih macet tanpa render sama sekali.
          if (onFullyLoaded) onFullyLoaded();
        });
      }).catch(err => {
        clearTimeout(timeoutTimer);
        console.error('Load data (fase 1/core) gagal:', err);
        if (!settled) {
          settled = true;
          toast('⚠️ Gagal memuat dari server, menampilkan data tersimpan terakhir.', true);
          setOfflineBannerVisible(true, navigator.onLine);
          restoreDatasetsFromIndexedDB(() => { if (callback) callback(); if (onFullyLoaded) onFullyLoaded(); });
        }
      });
    }
    // ============================================================
    // reloadDataset() -- muat ulang HANYA dataset yang baru berubah
    // ============================================================
    // TEMPEL tepat SETELAH penutup fungsi loadAllData() (sebelum `function renderAll()`).
    //
    // Kenapa: setelah simpan absensi/jurnal/dll, kode lama memanggil loadAllData() yang
    // mengunduh ulang ~30 query (Fase 1 + Fase 2) padahal yang berubah cuma 1 node.
    // reloadDataset('attendance', cb) hanya mengunduh node itu.
    //
    // Aturan filter/scope SAMA PERSIS dengan loadAllData() -- kalau nanti Anda mengubah
    // filter di loadAllData(), ubah juga di sini (atau nanti loadAllData dirombak supaya
    // memakai DATASET_LOADERS ini juga, jadi hanya ada satu sumber kebenaran).
    //
    // Pemakaian:
    //   reloadDataset('attendance', () => loadAttendance());
    //   reloadDataset(['events','eventAttendance'], () => { renderEventsToday(); renderEventList(); });
    //   reloadDataset('nama-tak-dikenal')  // otomatis fallback ke loadAllData() penuh
    // ============================================================
    // Filter kelas untuk SEMUA loader ber-scope kelas. WAJIB sama dengan loadAllData(): keduanya memakai
    // loaderScopeKelas() (kelas yang diajar UNION kelas yang diwali-i; Admin/Kepsek = KELAS_LIST). Dulu di sini
    // hanya currentUser.kelas, jadi wali kelas yang kelas walinya tidak ada di daftar kelas ajarnya kehilangan
    // data kelas wali setiap reloadDataset(), dan Admin ikut menerima kelas di luar KELAS_LIST.
    // Predikat dibuat per-fetch & scope dihitung SEKALI (lazy, saat baris pertama difilter), bukan per baris.
    function _scopeKelasFn(denganInfaq) { // denganInfaq=true utk siswa & iuran_siswa (lihat scopeKelasData)
      let set = null;
      return (x) => { if (!set) set = new Set(denganInfaq ? scopeKelasData() : loaderScopeKelas()); return set.has(x.kelas); };
    }
    const _scopeGuru  = (r) => isAdmin() || isKepsek() || (r.guruKey ? r.guruKey === currentUser.key : r.guru === currentUser.name);
    const _byTahun    = (path) => db.ref(path).orderByChild('tahunAjaran').equalTo(currentTahunAjaran);

    // Ambil snapshot -> array [{key, ...data}]. Balikannya `undefined` kalau timeout/error
    // (fbTimeout meresolve tanpa nilai), supaya pemanggil TIDAK menimpa data lama dengan kosong.
    function _fetchList(query, filterFn, stripFields) {
      return fbTimeout(query.once('value').then(snap => {
        const arr = [];
        snap.forEach(child => {
          const x = child.val() || {};
          x.key = child.key;
          (stripFields || []).forEach(f => delete x[f]);
          if (!filterFn || filterFn(x)) arr.push(x);
        });
        return arr;
      }));
    }

    // Absen guru tahun ajaran aktif. Admin/Kepsek membutuhkan semua guru (query per tahunAjaran). Guru/Wali Kelas HANYA butuh catatannya
    // sendiri: dulu tiap guru mengunduh absen SELURUH guru setahun lalu menyaringnya di HP (berat di sinyal lemah, sering timeout sehingga
    // data kosong & guru ditahan "absen datang dulu"). Kini memakai query terindeks guruKey (+ nama untuk catatan lama tanpa guruKey).
    // Hasil `undefined` bila semua query timeout/gagal (data lama tidak ditimpa kosong).
    function _muatAbsenGuruSaya() {
      if (isAdmin() || isKepsek()) return _fetchList(_byTahun('teacher_attendance'), _scopeGuru);
      const ref = db.ref('teacher_attendance');
      const filter = r => r.tahunAjaran === currentTahunAjaran && _scopeGuru(r);
      const q = [];
      if (currentUser && currentUser.key) q.push(_fetchList(ref.orderByChild('guruKey').equalTo(currentUser.key), filter));
      if (currentUser && currentUser.name) q.push(_fetchList(ref.orderByChild('guru').equalTo(currentUser.name), filter));
      if (!q.length) return Promise.resolve(undefined);
      return Promise.all(q).then(hasil => {
        const ada = hasil.filter(Array.isArray); if (!ada.length) return undefined;
        const peta = {}; ada.forEach(arr => arr.forEach(x => { peta[x.key] = x; }));
        return Object.keys(peta).map(k => peta[k]);
      });
    }

    // Muat data siswa sesuai scope kelas pengguna (scopeKelasData: kelas ajar + wali + tugas Petugas Infaq).
    // Dulu: SEMUA siswa diunduh lalu disaring di browser -- guru kelas 3 pun mengunduh siswa kelas 1-6, tiap
    // login. Sekarang guru dengan <= 3 kelas memakai satu query terindeks per kelas (siswa/kelas, butuh
    // ".indexOn": ["kelas"] pada Rules path siswa -- sudah dipakai juga oleh alur absensi). Admin/Kepsek
    // (butuh semua kelas) dan scope besar tetap membaca node penuh: lebih murah daripada banyak query.
    const SISWA_MAKS_QUERY_PER_KELAS = 3;
    function bacaSiswaSesuaiScope() {
      const kls = scopeKelasData();
      const keluarkan = (snaps, saringKelas) => {
        const sc = new Set(kls), seen = new Set(), out = [];
        snaps.forEach(snap => {
          snap.forEach(child => {
            if (seen.has(child.key)) return;
            const x = child.val();
            if (!x || (saringKelas && !sc.has(x.kelas))) return;
            seen.add(child.key); x.key = child.key; out.push(x);
          });
        });
        return out;
      };
      if (isAdmin() || isKepsek() || kls.length > SISWA_MAKS_QUERY_PER_KELAS) {
        return db.ref('siswa').once('value').then(snap => keluarkan([snap], true));
      }
      return Promise.all(kls.map(k => db.ref('siswa').orderByChild('kelas').equalTo(k).once('value'))).then(snaps => keluarkan(snaps, false));
    }

    const DATASET_LOADERS = {
      siswa:            () => fbTimeout(bacaSiswaSesuaiScope()).then(a => { if (a) setAllSiswa(a); }),
      attendance:       () => _fetchList(_byTahun('attendance'), _scopeKelasFn()).then(a => { if (a) allAttendance = a; }),
      grades:           () => _fetchList(_byTahun('grades'), _scopeKelasFn()).then(a => { if (a) allGrades = a; }),
      journal:          () => _fetchList(_byTahun('journal'), _scopeKelasFn()).then(a => { if (a) { allJournals = a; scheduleStatusBarRefresh(); } }),
      teacherAttendance: () => Promise.all([
        _muatAbsenGuruSaya().then(a => { if (a) { allTeacherAttendance = a; scheduleStatusBarRefresh(); } }),
        _fetchList(db.ref('teacher_attendance').orderByChild('tanggal').equalTo(tglLokal()), ta => ta.tahunAjaran === currentTahunAjaran)
          .then(a => { if (a) allTeacherAttendanceToday = a; })
      ]),
      earlyLeave:       () => _fetchList(_byTahun('early_leave_requests'), _scopeGuru).then(a => { if (a) allEarlyLeaveRequests = a; }),
      events:           () => _fetchList(_byTahun('events')).then(a => { if (a) allEvents = a; }),
      eventAttendance:  () => _fetchList(_byTahun('event_attendance'), null, ['foto']).then(a => { if (a) allEventAttendance = a; }),
      ujian:            () => _fetchList(_byTahun('ujian')).then(a => { if (a) allUjian = a; }),
      ujianAttendance:  () => _fetchList(_byTahun('ujian_attendance'), null, ['foto']).then(a => { if (a) allUjianAttendance = a; }),
      ekskulPicHonor:   () => _fetchList(_byTahun('ekskul_pic_honor_v4')).then(a => { if (a) allEkskulPicHonor = a; }),
      ekskulRates:      () => fbTimeout(db.ref('ekskul_rates').once('value').then(s => { ekskulRates = s.val() || {}; })),
      guruTerajin:      () => fbTimeout(db.ref('guru_terajin').once('value').then(s => { allGuruTerajin = s.val() || {}; })),
      logs:             () => isAdmin() ? _fetchList(db.ref('logs').orderByChild('waktu').limitToLast(30)).then(a => { if (a) allLogs = a.reverse(); }) : Promise.resolve(),
      infaqSiswa:       () => _fetchList(_byTahun('iuran_siswa'), _scopeKelasFn(true)).then(a => { if (a) allInfaqSiswa = a; }),
      // ---- Dataset LAZY: dimuat saat halaman terkait dibuka (lihat ensureLazyDatasets) ----
      tugas:            () => _fetchList(_byTahun('tugas'), _scopeKelasFn()).then(a => { if (a) allTugas = a; return !!a; }),
      tugasSubmission:  () => _fetchList(_byTahun('tugas_submission'), _scopeKelasFn(), ['foto']).then(a => { if (a) allTugasSubmission = a; return !!a; }),
      materi:           () => _fetchList(_byTahun('materi_belajar'), _scopeKelasFn()).then(a => { if (a) allMateri = a; return !!a; }),
      kalenderAkademik: () => _fetchList(db.ref('kalender_akademik')).then(a => { if (a) allKalenderAkademik = a; return !!a; }),
      kedisiplinanKategori: () => fbTimeout(db.ref('kedisiplinan_kategori').once('value').then(snap => {
        const v = snap.val() || {};
        const ke = o => o ? Object.entries(o).map(([k, val]) => ({ key: k, ...val })) : [];
        allKedisiplinanKategori = { pelanggaran: ke(v.pelanggaran), prestasi: ke(v.prestasi) };
        return true;
      })),
      // Kas Madrasah (js/kas.js): hanya Admin/Kepsek. Untuk peran lain diabaikan (tidak query, tidak error).
      kasUmum:          () => (typeof kasCanView === 'function' && kasCanView())
                                ? _fetchList(_byTahun('kas_umum')).then(a => { if (a) allKasUmum = a; })
                                : Promise.resolve()
    };

    // ============================================================
    // LAZY LOADING dataset khusus-halaman (menggantikan sebagian Fase 2 di loadAllData)
    // ============================================================
    // Dataset di bawah dulu ikut diunduh di background setiap login (6 query), padahal hanya dipakai
    // SATU halaman dan tidak dibaca fungsi lain / saat boot (sudah dicek per fungsi pemakai):
    //   tugas, tugas_submission -> Tugas Siswa    | materi_belajar -> Materi Belajar
    //   kalender_akademik       -> Kalender Akademik | kedisiplinan_kategori -> Sikap Siswa
    //   surat -> sudah di-query sendiri oleh loadSuratRiwayat() (jadi query boot-nya duplikat, dihapus)
    // SENGAJA TIDAK ikut lazy (dipakai lintas halaman / notifikasi saat boot): attendance, grades, journal,
    // teacher_attendance, early_leave, events, ujian*, religi, iuran_siswa, infaq_petugas, ekskul_*,
    // kedisiplinan_siswa & buku_penghubung (titik notifikasi Info Ortu + Raport), saran_kritik (badge).
    const LAZY_PAGE_DATASETS = {
      'tugas-siswa': ['tugas', 'tugasSubmission'],
      'materi-belajar': ['materi'],
      'kalender-akademik': ['kalenderAkademik'],
      'sikap-siswa': ['kedisiplinanKategori']
    };
    // Pastikan dataset lazy sebuah halaman sudah dimuat, lalu panggil cb. Hanya mengunduh yang BELUM
    // pernah sukses dimuat di sesi ini. Offline / gagal / timeout -> cb tetap jalan dgn data yang ada
    // (dari cache IndexedDB atau kosong), dan percobaan berikutnya mengulang lagi karena belum ditandai.
    function ensureLazyDatasets(names, cb) {
      const perlu = (names || []).filter(n => !lazyLoadedSet.has(n) && DATASET_LOADERS[n]);
      if (!perlu.length || !db || !currentUser || !navigator.onLine) { if (cb) cb(); return; }
      const owner = currentUser.key;
      Promise.all(perlu.map(n => DATASET_LOADERS[n]().then(ok => { if (ok && currentUser && currentUser.key === owner) lazyLoadedSet.add(n); })))
        .catch(err => console.warn('[SI MAMBA] ensureLazyDatasets gagal:', err))
        .then(() => { if (currentUser && currentUser.key === owner) { if (dataLoaded) cacheDatasetsToIndexedDB(owner); /* jangan tulis cache sebelum Fase 2 selesai: dataset lain masih [] */ if (cb) cb(); } });
    }

    // Peta path Firebase -> nama dataset, untuk dipakai di hapusDataWithConfirm(path, ...)
    // dan tempat generik lain yang hanya tahu path-nya.
    const PATH_TO_DATASET = {
      siswa: 'siswa', attendance: 'attendance', grades: 'grades', journal: 'journal',
      teacher_attendance: 'teacherAttendance',
      early_leave_requests: 'earlyLeave', events: 'events', event_attendance: 'eventAttendance',
      ujian: 'ujian', ujian_attendance: 'ujianAttendance', iuran_siswa: 'infaqSiswa', kas_umum: 'kasUmum'
    };
    function reloadByPath(path, onDone) {
      const ds = PATH_TO_DATASET[path];
      if (ds) return reloadDataset(ds, onDone);
      return loadAllData(null, onDone); // path belum dipetakan -> aman: muat semua seperti dulu
    }

    function reloadDataset(names, onDone) {
      const done = () => { if (typeof onDone === 'function') onDone(); };
      if (!db || !currentUser) { done(); return Promise.resolve(); }
      names = [].concat(names);
      const owner = currentUser.key;

      // v4PanelSiswaCache (kelas -> siswa[], dipakai v4FetchSiswaByKelas() di panel Kegiatan/
      // Tahfidz/Pramuka) TIDAK pernah kedaluwarsa sendiri -- sekali sebuah kelas di-fetch,
      // hasilnya nempel di cache SELAMANYA sampai reload halaman. Kalau tidak dibersihkan di
      // sini, setiap kali dataset 'siswa' berubah (tambah/edit/hapus siswa, naik kelas, atau
      // lulus/kelulusan lewat promoteClass()/graduateClass()/tambahSiswa()/saveEditSiswa(),
      // yang semuanya berakhir memanggil reloadDataset('siswa', ...)), panel-panel V4 itu akan
      // terus menampilkan daftar siswa LAMA per kelas -- siswa yang sudah pindah/lulus/dihapus
      // masih nongol, siswa baru tidak muncul -- sampai user reload manual. Reset di sini
      // supaya v4FetchSiswaByKelas() query ulang ke Firebase begitu dataset siswa berubah.
      if (names.includes('siswa') && typeof v4PanelSiswaCache !== 'undefined') { v4PanelSiswaCache = {}; if (typeof v4PanelSiswaGagal !== 'undefined') v4PanelSiswaGagal = {}; }

      // Nama tak dikenal -> jangan menebak, fallback ke perilaku lama (muat semua).
      const unknown = names.filter(n => !DATASET_LOADERS[n]);
      if (unknown.length) {
        console.warn('[SI MAMBA] reloadDataset: dataset tak dikenal', unknown, '-> fallback loadAllData()');
        return loadAllData(null, onDone);
      }
      // Offline: data lokal sudah diperbarui oleh penulisan lokal/antrean; cukup render ulang.
      if (!navigator.onLine) { _renderAfterReload(names); done(); return Promise.resolve(); }

      return Promise.all(names.map(n => DATASET_LOADERS[n]())).then(() => {
        cacheDatasetsToIndexedDB(owner);
        _renderAfterReload(names);
        done();
      }).catch(err => {
        console.error('[SI MAMBA] reloadDataset gagal:', err);
        done(); // jangan menggantung kode pemanggil
      });
    }

    // Render ringan pengganti renderFullUI(): hanya bagian yang bergantung pada dataset di atas.
    // Halaman lain (jadwal, rekap nilai, laporan, user management) tidak ikut berubah karena
    // datasetnya tidak dimuat ulang, jadi tidak perlu dirender ulang.
    function _renderAfterReload(names) {
      const call = (fn) => { try { if (typeof window[fn] === 'function') window[fn](); } catch (e) { console.warn('[SI MAMBA] render', fn, e); } };
      const visible = (id) => { const el = document.getElementById(id); return !!el && !el.classList.contains('hidden'); };
      renderAll();
      renderJikaAktif('rekap', () => call('renderRekap'), false);
      // renderCharts & updateStatusBar sudah dijalankan renderAll() -> updateDashboard() (halaman aktif saja).
      if (names && names.indexOf('logs') >= 0) call('renderLogs');
      // FIX: Setujui/Tolak Jurnal Susulan & Pulang Duluan dari halaman Approval V4 memanggil
      // approveJournal()/rejectJournal()/approveEarlyLeave()/rejectEarlyLeave() -> reloadDataset()
      // -> _renderAfterReload(). Fungsi ini cuma merender halaman-halaman lama (renderAll dst),
      // TIDAK PERNAH v4RenderApprovals(), jadi kartu yang baru saja diproses tetap nongol di
      // Pusat Approval (dan badge "x menunggu" tak berubah) sampai pindah halaman & balik lagi.
      // v4RenderApprovals() aman dipanggil kapan pun (langsung return kalau halamannya belum
      // pernah dirender), begitu juga v4RefreshTasks() untuk hitungan "Perlu tindakan".
      call('v4RenderApprovals');
      if (names && (names.indexOf('journal') >= 0 || names.indexOf('earlyLeave') >= 0)) call('v4RefreshTasks');
      // Sama seperti renderFullUI(): halaman berat hanya dirender ulang kalau SEDANG dibuka.
      if (visible('page-rekap-nilai')) call('renderRekapNilai');
      if (visible('page-laporan')) call('loadReportPreview');
    }

    // ============================================================
    // FOTO TERPISAH -- foto check-in/tugas tidak lagi disimpan DI DALAM record
    // ============================================================
    // Masalah lama: foto (data URL base64, ~20-60 KB per foto) disimpan di field `foto` pada
    // event_attendance, ujian_attendance & tugas_submission. Firebase Realtime Database tidak bisa
    // mengunduh "sebagian field", jadi query massal di loadAllData() ikut mengunduh SEMUA foto
    // lalu membuangnya di klien (`delete ea.foto`) -- bandwidth terbuang di setiap pembukaan app.
    //
    // Sekarang: record hanya menyimpan `hasFoto: true`, sedangkan fotonya ada di node terpisah
    //   event_attendance_foto/{key}, ujian_attendance_foto/{key}, tugas_submission_foto/{key}
    // (key SAMA dengan record induknya). Foto hanya diunduh saat galeri/detail dibuka.
    // Record LAMA yang masih menyimpan foto inline tetap tampil normal (kompatibel) sampai
    // dimigrasi lewat migrasiFotoV1().
    function fotoNodePath(path, key) { return path + '_foto/' + key; }

    function simpanFotoTerpisah(path, key, dataUrl) {
      if (!db || !key) return Promise.resolve(false);
      const ref = db.ref(fotoNodePath(path, key));
      return Promise.resolve(dataUrl ? ref.set(dataUrl) : ref.remove()).then(() => true).catch(err => {
        console.error('[SI MAMBA] Gagal menyimpan foto terpisah', path, key, err);
        toast('⚠️ Data tersimpan, tetapi foto gagal diunggah.', true);
        return false;
      });
    }

    // Isi item.foto untuk item yang punya `hasFoto` tapi belum memuat foto inline.
    // Item tanpa foto TIDAK memicu pembacaan sama sekali. Gagal/timeout -> item dilewati.
    function lampirkanFoto(path, list) {
      const perlu = (list || []).filter(x => x && !x.foto && x.hasFoto && x.key);
      if (!perlu.length) return Promise.resolve(list);
      return Promise.all(perlu.map(x => fbTimeout(
        db.ref(fotoNodePath(path, x.key)).once('value').then(s => { const v = s.val(); if (v) x.foto = v; }),
        10000, fotoNodePath(path, '*')
      ))).then(() => list);
    }

    // MIGRASI SEKALI JALAN (Admin, dari Console browser -- sebaiknya dari komputer, bukan HP):
    //   migrasiFotoV1({ dryRun: true })   // hanya menghitung, TIDAK mengubah apa pun
    //   migrasiFotoV1()                   // memindahkan foto lama ke node terpisah
    // Aman diulang (record yang sudah dimigrasi dilewati). Tiap 20 record dipindah dengan SATU
    // update multi-path atomik: foto baru ditulis & field lama dihapus bersamaan, jadi tidak ada
    // momen foto "hilang". WAJIB Backup Manual dulu dan uji di project staging.
    async function migrasiFotoV1(opts) {
      opts = opts || {};
      if (!db || !currentUser || !isAdmin()) { toast('Hanya Admin!', true); return null; }
      if (!opts.dryRun && !confirm('Pindahkan foto lama ke node terpisah?\n\nPastikan Backup Manual sudah dibuat. Proses ini mengunduh seluruh data absensi acara/ujian/tugas sekali.')) return null;
      const ringkasan = {};
      for (const path of ['event_attendance', 'ujian_attendance', 'tugas_submission']) {
        const snap = await db.ref(path).once('value');
        const batches = []; let cur = {}, curN = 0, jumlah = 0, chars = 0, dipindah = 0;
        snap.forEach(child => {
          const v = child.val() || {};
          if (typeof v.foto !== 'string' || !v.foto) return;
          jumlah++; chars += v.foto.length;
          if (opts.dryRun) return;
          cur[fotoNodePath(path, child.key)] = v.foto;
          cur[path + '/' + child.key + '/foto'] = null;
          cur[path + '/' + child.key + '/hasFoto'] = true;
          if (++curN >= 20) { batches.push(cur); cur = {}; curN = 0; }
        });
        if (curN) batches.push(cur);
        for (const b of batches) { await db.ref().update(b); dipindah += Object.keys(b).length / 3; }
        ringkasan[path] = { recordBerfoto: jumlah, ukuranKB: Math.round(chars / 1024), dipindah };
      }
      console.log('[SI MAMBA] Ringkasan migrasi foto' + (opts.dryRun ? ' (DRY RUN)' : '') + ':', ringkasan);
      toast(opts.dryRun ? '🔍 Dry run selesai, lihat Console.' : '✅ Migrasi foto selesai, lihat Console.');
      return ringkasan;
    }

    // ============================================================
    // RENDER HANYA HALAMAN AKTIF (+ tunda sisanya sampai dibuka)
    // ============================================================
    // Dulu renderAll()/renderFullUI() merender SEMUA halaman (siswa, absensi, nilai, jurnal, absen guru,
    // dashboard, rekap, grafik...) tiap kali data selesai dimuat, walau user cuma melihat satu halaman.
    // Sekarang: elemen/halaman yang sedang disembunyikan (.page-content.hidden) TIDAK dirender; render-nya
    // dicatat di _renderTertunda[pageId] dan dijalankan oleh flushRenderTertunda() di awal navigateTo() saat
    // halaman itu dibuka (sebelum render khusus-halaman di navigateTo, supaya yang terakhir tetap menang).
    // Halaman asal sebuah render ditentukan dari elemen penampungnya (.closest('.page-content')) -- bukan
    // ditebak dari nama fungsi -- jadi tetap benar apa pun letak blok itu di index.html.
    const _renderTertunda = {};
    function halamanDariElemen(el) {
      const pg = el && el.closest ? el.closest('.page-content') : null;
      return pg && pg.id ? pg.id.replace(/^page-/, '') : null;
    }
    function halamanAktif(pageId) {
      const el = document.getElementById('page-' + pageId);
      return !!el && !el.classList.contains('hidden');
    }
    // fn dirender sekarang kalau halamannya aktif; kalau tidak -> ditunda (tandaiTertunda=false: cukup lewati,
    // dipakai utk render yang SUDAH selalu dipanggil navigateTo() sendiri saat halaman dibuka).
    function renderJikaAktif(pageId, fn, tandaiTertunda) {
      if (!pageId || halamanAktif(pageId)) { fn(); return; }
      if (tandaiTertunda !== false) (_renderTertunda[pageId] = _renderTertunda[pageId] || new Set()).add(fn);
    }
    function renderElemenJikaAktif(containerId, fn) {
      const el = document.getElementById(containerId);
      if (!el) return; // elemen tak ada: dulu melempar TypeError & memutus rantai renderAll -- sekarang dilewati
      renderJikaAktif(halamanDariElemen(el), fn);
    }
    function flushRenderTertunda(pageId) {
      const set = _renderTertunda[pageId];
      if (!set) return;
      delete _renderTertunda[pageId];
      set.forEach(fn => { try { fn(); } catch (e) { console.warn('[SI MAMBA] render tertunda gagal (' + pageId + '):', e); } });
    }
    function renderAll() {
      // [id elemen penampung, fungsi render] -- urutan sama seperti renderAll() lama.
      [['siswaList', renderSiswa], ['attendanceList', renderAttendance], ['gradesContainer', renderGrades],
       ['journalList', renderJournals], ['journalApprovalList', renderJournalApprovals],
       ['teacherAttendanceHistory', renderTeacherAttendance], ['attendanceLateBlock', renderAttendanceLateBlock],
       ['earlyLeaveBlock', renderEarlyLeaveBlock], ['earlyLeaveApprovalList', renderEarlyLeaveApprovals]]
        .forEach(([id, fn]) => renderElemenJikaAktif(id, fn));
      renderJikaAktif('dashboard', updateDashboard);
      try { if (typeof v4RenderApprovals === 'function') v4RenderApprovals(); } catch (e) { console.warn('[SI MAMBA] render approval', e); }
    }

    function renderJadwalHariIni() {
      const container = document.getElementById('dashboardJadwalList');
      if (!container) return;

      const hariIni = getHariIni();
      const namaGuru = currentUser ? currentUser.name : '';
      const keyGuru = currentUser ? currentUser.key : null;

      // FIX: dulu cocokkan HANYA lewat nama (j.guru === namaGuru) -- kalau ada 2 guru dengan
      // nama sama persis, keduanya melihat jadwal gabungan/tertukar punya satu sama lain.
      // Sekarang cocokkan lewat guruKey (unik) kalau jadwalnya sudah punya guruKey; fallback ke
      // nama hanya untuk baris jadwal lama yang dibuat sebelum field guruKey ada.
      let jadwalHariIni = allJadwal.filter(j => j.hari === hariIni && (j.guruKey ? j.guruKey === keyGuru : samaNamaGuru(j.guru, namaGuru)));
      jadwalHariIni.sort((a, b) => (a.jam || 0) - (b.jam || 0));

      if (jadwalHariIni.length === 0) {
        container.innerHTML = `<p class="text-muted" style="font-size:13px;padding:8px;">📭 Tidak ada jadwal mengajar hari ini.</p>`;
        return;
      }

      let html = '';
      jadwalHariIni.forEach(j => {
        const jamKe = j.jam || '-';
        const waktu = jamSettings[jamKe] ? `${jamSettings[jamKe].mulai} - ${jamSettings[jamKe].selesai}` : '-';
        const mapel = j.mapel || '-';
        const kelas = j.kelas || '-';
        const bgColor = jamKe % 2 === 0 ? '#f9fafb' : '#ffffff';
        html += `<div style="display:flex;justify-content:space-between;padding:6px 10px;background:${bgColor};border-radius:6px;margin-bottom:2px;border-left:3px solid #2563eb;font-size:13px;">
          <span style="font-weight:600;min-width:70px;">Jam ${escapeHtml(jamKe)}</span>
          <span class="text-medium" style="min-width:100px;">${escapeHtml(waktu)}</span>
          <span style="font-weight:500;flex:1;">${escapeHtml(mapel)}</span>
          <span class="text-muted" style="min-width:80px;">${escapeHtml(kelas)}</span>
        </div>`;
      });

      container.innerHTML = html;
    }

    function getHariIni() {
      const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      return days[new Date().getDay()];
    }

    // ============================================================
    // SISWA
    // ============================================================
    // Urutan nama siswa di-cache per referensi array allSiswa. Semua penugasan allSiswa mengganti referensinya
    // (tidak ada push/splice di tempat), jadi cek referensi + panjang cukup. Salinan -> allSiswa tidak termutasi.
    const _siswaCollator = new Intl.Collator('id');
    // ---- STATUS SISWA (aktif / nonaktif) ----
    // allSiswa  = hanya siswa AKTIF -> dipakai absensi, nilai, jurnal, dashboard, laporan, dst. (semua kode lama otomatis
    //             tidak melihat siswa nonaktif tanpa perlu diubah satu per satu).
    // allSiswaSemua = semua siswa termasuk nonaktif -> khusus halaman Data Siswa (Admin/Kepsek) & Surat.
    // Field di Firebase: siswa/<key>/aktif (false = nonaktif). Tidak ada field / true = aktif, jadi data lama tetap aktif.
    let allSiswaSemua = [];
    function siswaAktif(s) { return !s || s.aktif !== false; }
    function setAllSiswa(list) { allSiswaSemua = Array.isArray(list) ? list : []; allSiswa = allSiswaSemua.filter(siswaAktif); }
    let _siswaSortedSrc = null, _siswaSortedLen = -1, _siswaSorted = [];
    function getSiswaTerurut() {
      // Admin/Kepsek melihat SEMUA siswa (termasuk nonaktif, untuk mengelola status); pengguna lain hanya yang aktif.
      const sumber = (isAdmin() || isKepsek()) ? allSiswaSemua : allSiswa;
      if (_siswaSortedSrc !== sumber || _siswaSortedLen !== sumber.length) {
        _siswaSortedSrc = sumber; _siswaSortedLen = sumber.length;
        _siswaSorted = sumber.slice().sort((a, b) => _siswaCollator.compare(a.name, b.name));
      }
      return _siswaSorted;
    }
    // Pager bersama (Siswa, Jurnal, Religi, Surat, Pengguna, Log, Honor, Jadwal, Rekap Nilai).
    // Ukuran halaman dipilih pengguna (10/25/50/0=Semua), diingat per daftar di perangkat; bawaan 25.
    const MP_PAGERS = {
      siswa:   { get: () => siswaPage,   set: v => { siswaPage = v; },   render: () => renderSiswa(),       scroll: 'siswaList' },
      journal: { get: () => journalPage, set: v => { journalPage = v; }, render: () => renderJournals(),    scroll: 'journalList' },
      religi:  { get: () => religiPage,  set: v => { religiPage = v; },  render: () => renderReligi(allReligiAttendance), scroll: 'religiMonthList' },
      surat:   { get: () => suratPage,   set: v => { suratPage = v; },   render: () => renderSuratRiwayat(), scroll: 'suratRiwayatList' },
      users:   { get: () => parseInt(localStorage.getItem('userPage') || '1'), set: v => { localStorage.setItem('userPage', v); }, render: () => renderUserList(), scroll: 'userList' },
      log:     { get: () => logFullPage, set: v => { logFullPage = v; }, render: () => renderLogsFull(),    scroll: 'logListFull' },
      honor:   { get: () => honorPage,   set: v => { honorPage = v; },   render: () => renderHonor(),       scroll: 'honorResult' },
      jadwal:  { get: () => jadwalPage,  set: v => { jadwalPage = v; },  render: () => renderJadwal(),      scroll: 'jadwalTableWrapper' },
      rekap:   { get: () => rekapPage,   set: v => { rekapPage = v; },   render: () => renderRekap(),       scroll: 'rekapList' }
    };
    const _pagerSizeCache = {};
    function pagerSize(key) {
      if (_pagerSizeCache[key] === undefined) {
        let v = 25;
        try { const x = parseInt(localStorage.getItem('mamba_ps_' + key), 10); if ([10, 25, 50, 0].includes(x)) v = x; } catch (e) { /* diabaikan */ }
        _pagerSizeCache[key] = v;
      }
      return _pagerSizeCache[key];
    }
    function pagerGo(key, p) {
      const c = MP_PAGERS[key]; if (!c) return;
      c.set(p); c.render();
      const el = document.getElementById(c.scroll);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    function pagerSetSize(key, v) {
      const c = MP_PAGERS[key]; if (!c) return;
      _pagerSizeCache[key] = parseInt(v, 10) || 0;
      try { localStorage.setItem('mamba_ps_' + key, String(_pagerSizeCache[key])); } catch (e) { /* diabaikan */ }
      c.set(1); c.render();
    }
    function pagerHtml(key, total, pages, start, end, label) {
      const c = MP_PAGERS[key], cur = c ? c.get() : 1, size = pagerSize(key), nums = [];
      const info = `<span>Menampilkan ${total ? start + 1 : 0}–${end} dari ${total}${label ? ' ' + label : ''}</span>`;
      const meta = inner => `<div class="mp-pager-row mp-pager-meta">${inner}</div>`;
      if (total <= 10) return meta(info); // 10 = ukuran terkecil: tidak ada yang perlu dipilih
      for (let i = 1; i <= pages; i++) { if (i === 1 || i === pages || Math.abs(i - cur) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…'); }
      const num = n => n === '…' ? '<span class="mp-pager-gap">…</span>'
        : `<button onclick="pagerGo('${key}',${n})" ${n === cur ? 'aria-current="page"' : ''}>${n}</button>`;
      const opt = (v, t) => `<option value="${v}" ${size === v ? 'selected' : ''}>${t}</option>`;
      return `<div class="mp-pager-row">` +
        (pages > 1 ? `<button onclick="pagerGo('${key}',${cur - 1})" ${cur <= 1 ? 'disabled' : ''}>◀ Prev</button>${nums.map(num).join('')}<button onclick="pagerGo('${key}',${cur + 1})" ${cur >= pages ? 'disabled' : ''}>Next ▶</button>` : '') + `</div>` +
        meta(info + `<label class="mp-pager-size">Per halaman <select class="field" onchange="pagerSetSize('${key}',this.value)">${opt(10, '10')}${opt(25, '25')}${opt(50, '50')}${opt(0, 'Semua')}</select></label>`);
    }
    function renderSiswa() {
      const list = document.getElementById('siswaList'), searchQuery = document.getElementById('searchSiswa').value.toLowerCase().trim(), filterKelas = document.getElementById('filterKelasSiswa').value, totalDisplay = document.getElementById('totalSiswaDisplay');
      let filtered = getSiswaTerurut();
      // Wali Kelas (dan siapa pun yang bukan Admin/Kepsek) hanya boleh lihat siswa dari kelas
      // yang benar-benar dalam scope-nya (siswaScopeKelas), apa pun nilai dropdown filter --
      // jadi tidak mengandalkan dropdown saja untuk membatasi data yang sensitif.
      if (!isAdmin() && !isKepsek()) filtered = filtered.filter(s => siswaScopeKelas().includes(s.kelas));
      if (filterKelas) filtered = filtered.filter(s => s.kelas === filterKelas);
      if (searchQuery) filtered = filtered.filter(s => s.name.toLowerCase().includes(searchQuery) || s.kelas.toLowerCase().includes(searchQuery));
      // Filter status (aktif/nonaktif/semua) -- hanya relevan bagi Admin/Kepsek; pengguna lain memang hanya menerima siswa aktif.
      const filterStatusEl = document.getElementById('filterStatusSiswa'), bisaKelolaStatus = isAdmin() || isKepsek();
      if (filterStatusEl && filterStatusEl.parentElement) filterStatusEl.parentElement.style.display = bisaKelolaStatus ? '' : 'none';
      const filterStatus = (filterStatusEl && bisaKelolaStatus) ? filterStatusEl.value : 'semua';
      const jmlNonaktif = filtered.filter(s => !siswaAktif(s)).length, jmlAktif = filtered.length - jmlNonaktif;
      if (filterStatus === 'aktif') filtered = filtered.filter(siswaAktif);
      else if (filterStatus === 'nonaktif') filtered = filtered.filter(s => !siswaAktif(s));
      totalDisplay.textContent = (isAdmin() || isKepsek()) ? `Total: ${filtered.length} siswa • ${jmlAktif} aktif, ${jmlNonaktif} nonaktif` : `Total: ${filtered.length} siswa`;
      list.innerHTML = '';
      if (filtered.length === 0) { list.innerHTML = `<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada siswa yang sesuai.</p>`; document.getElementById('siswaPagination').innerHTML = ''; return; }
      const totalItems = filtered.length, ps = pagerSize('siswa') || totalItems, totalPages = Math.max(1, Math.ceil(totalItems/ps));
      if (siswaPage > totalPages) siswaPage = totalPages; if (siswaPage < 1) siswaPage = 1;
      const start = (siswaPage-1)*ps, end = Math.min(start+ps, totalItems), pageItems = filtered.slice(start,end);
      let html = `<div class="siswa-rows">`;
      pageItems.forEach((s, idx) => {
        const btnEdit = isAdmin() ? `<button type="button" class="btn btn-edit siswa-btn" title="Edit" aria-label="Edit ${escapeHtml(s.name)}" onclick="openEditSiswaModal('${s.key}')">✏️</button>` : '';
        const delBtn = isAdmin() ? `<button type="button" class="btn btn-danger siswa-btn" title="Hapus" aria-label="Hapus ${escapeHtml(s.name)}" onclick="hapusDataWithConfirm('siswa','${s.key}','Siswa ${escapeJs(s.name)}')">🗑️</button>` : '';
        const aktif = siswaAktif(s);
        // Tombol geser (Admin): bisa digeser/di-drag maupun diketuk (lihat inisialisasi drag .sw-aktif). Kepsek hanya melihat lencana.
        const statusCell = isAdmin()
          ? `<label class="sw-aktif${aktif ? ' on' : ''}" data-key="${s.key}" title="${aktif ? 'Aktif — geser untuk menonaktifkan' : 'Nonaktif — geser untuk mengaktifkan'}"><input type="checkbox" ${aktif ? 'checked' : ''} onchange="toggleStatusSiswa('${s.key}', this.checked)" aria-label="Status aktif ${escapeHtml(s.name)}"><span class="sw-aktif-slider"></span></label>`
          : `<span style="font-size:12px;font-weight:600;color:${aktif ? '#059669' : '#9ca3af'};">${aktif ? 'Aktif' : 'Nonaktif'}</span>`;
        html += `<div class="siswa-row${aktif ? '' : ' nonaktif'}"><span class="siswa-no">${start+idx+1}</span><div class="siswa-nama"><div class="siswa-nama-t">${escapeHtml(s.name)}</div><div class="siswa-kelas">${escapeHtml(s.kelas)}${aktif ? '' : ' · Nonaktif'}</div></div>${statusCell}${btnEdit}${delBtn}</div>`;
      });
      html += `</div>`;
      list.innerHTML = html;
      document.getElementById('siswaPagination').innerHTML = pagerHtml('siswa', totalItems, totalPages, start, end, 'siswa');
    }
    // Tombol geser Aktif/Nonaktif: bisa di-drag (geser kiri/kanan) di HP & desktop, atau diketuk.
    (function initSwAktifDrag() {
      if (window.__swAktifDrag) return; window.__swAktifDrag = true;
      let cur = null;
      document.addEventListener('pointerdown', e => {
        const lb = e.target.closest && e.target.closest('.sw-aktif'); if (!lb || e.button > 0) return;
        cur = { lb, x0: e.clientX, moved: false, id: e.pointerId, startOn: lb.classList.contains('on'), on: lb.classList.contains('on') };
        try { lb.setPointerCapture(e.pointerId); } catch (_) {}
      });
      document.addEventListener('pointermove', e => {
        if (!cur || e.pointerId !== cur.id) return;
        const dx = e.clientX - cur.x0;
        if (Math.abs(dx) > 6) cur.moved = true;
        if (cur.moved) { cur.on = dx > 0 ? true : false; if (Math.abs(dx) < 6) cur.on = cur.startOn; cur.lb.classList.toggle('on', cur.on); }
      });
      const end = (e, cancel) => {
        if (!cur || e.pointerId !== cur.id) return;
        const c = cur; cur = null;
        try { c.lb.releasePointerCapture(e.pointerId); } catch (_) {}
        if (cancel) { c.lb.classList.toggle('on', c.startOn); return; }
        const target = c.moved ? c.on : !c.startOn;       // geser = arah geser; ketuk = kebalikan status
        c.lb.classList.toggle('on', target);
        const inp = c.lb.querySelector('input'); if (inp) inp.checked = target;
        if (target !== c.startOn) toggleStatusSiswa(c.lb.dataset.key, target);
      };
      document.addEventListener('pointerup', e => end(e, false));
      document.addEventListener('pointercancel', e => end(e, true));
      document.addEventListener('click', e => { const lb = e.target.closest && e.target.closest('.sw-aktif'); if (lb) e.preventDefault(); }, true);
    })();
    // Aktifkan / nonaktifkan siswa (Admin). Data lama (absensi, nilai, infaq, dst.) TIDAK dihapus; siswa nonaktif hanya
    // tidak muncul di daftar kerja (absensi, nilai, jurnal, dashboard). Bisa diaktifkan kembali kapan saja.
    function toggleStatusSiswa(key, aktifBaru) {
      if (!isAdmin()) { toast('🔒 Hanya Admin!', true); return renderSiswa(); }
      const s = allSiswaSemua.find(x => x.key === key);
      if (!s) { toast('Siswa tidak ditemukan!', true); return renderSiswa(); }
      if (isBusy('statusSiswa')) { toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500); return renderSiswa(); }
      if (!isReallyOnline()) { toast('📡 Sedang offline. Status siswa baru bisa diubah saat online.', true); return renderSiswa(); }
      if (!aktifBaru && !confirm('Nonaktifkan ' + s.name + ' (' + s.kelas + ')?\n\nSiswa tidak akan muncul di absensi, nilai, jurnal, dan dashboard. Data lama tetap tersimpan, dan siswa bisa diaktifkan kembali kapan saja.')) return renderSiswa();
      setBusy('statusSiswa');
      tulisAdmin('statusSiswa', null, () => {
        db.ref('siswa/' + key).update({ aktif: !!aktifBaru, statusDiubah: new Date().toISOString(), statusOleh: currentUser.name || null }, err => {
          clearBusy('statusSiswa');
          if (err) { toast('Gagal mengubah status: ' + err.message, true); return renderSiswa(); }
          toast(aktifBaru ? '✅ ' + s.name + ' diaktifkan.' : '⏸️ ' + s.name + ' dinonaktifkan.');
          addLog(aktifBaru ? 'aktifkan_siswa' : 'nonaktifkan_siswa', s.name + ' - ' + s.kelas);
          reloadDataset('siswa', () => { populateClassFilterDropdowns(); loadAttendance(); loadGrades(); renderSiswa(); });
        });
      }, () => renderSiswa());
    }
    function openEditSiswaModal(key) {
      const siswa = allSiswaSemua.find(s => s.key === key);
      if (!siswa) return toast('Siswa tidak ditemukan!', true);
      editingSiswaKey = key;
      document.getElementById('editSiswaKey').value = key;
      document.getElementById('editSiswaName').value = siswa.name;
      document.getElementById('editSiswaClass').value = siswa.kelas;
      document.getElementById('editSiswaNoWa').value = siswa.noWaOrtu || '';
      const nominalKhususAda = iuranAngka(siswa.nominalIuranKhusus); // 0 = khusus gratis, jangan jadi kosong
      document.getElementById('editSiswaNominalKhusus').value = nominalKhususAda === null ? '' : nominalKhususAda;
      document.getElementById('editSiswaModal').classList.add('show');
      editSiswaCekPinOrtu(siswa);
    }
    function closeEditSiswaModal() { document.getElementById('editSiswaModal').classList.remove('show'); editingSiswaKey = null; }
    function saveEditSiswa() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('saveEditSiswa')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      if (!editingSiswaKey) return toast('Error: tidak ada siswa yang diedit!', true);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Simpan data siswa butuh koneksi internet, coba lagi saat online.', true);
      const name = document.getElementById('editSiswaName').value.trim(), kelas = document.getElementById('editSiswaClass').value;
      if (!name) return toast('Nama wajib diisi!', true);
      const nominalKhususRaw = document.getElementById('editSiswaNominalKhusus').value.trim();
      // Kosong = tidak ada nominal khusus (pakai nominal standar) -> null. "0" = khusus GRATIS -> 0.
      // Dulu isian tak valid ("abc", negatif) diam-diam jadi 0 (gratis); sekarang ditolak.
      let nominalIuranKhusus = null;
      if (nominalKhususRaw !== '') {
        if (!/^\d+$/.test(nominalKhususRaw)) return toast('Nominal khusus harus angka bulat 0 atau lebih (kosongkan kalau memakai nominal standar)!', true);
        nominalIuranKhusus = parseInt(nominalKhususRaw, 10);
      }
      const noWaOrtu = document.getElementById('editSiswaNoWa').value.trim() || null;
      // noWaKey = nomor WA yang sudah dinormalisasi (62xxxxxxxxxx) -- dipakai Portal Orang Tua untuk
      // mencari anak lewat query terindeks, bukan mengunduh seluruh node siswa. null kalau tak valid.
      const noWaKey = noWaOrtu ? (ortuWaKey(noWaOrtu) || null) : null;
      const lepas = kunciSimpanModal('saveEditSiswa', 'editSiswaModal', 'saveEditSiswa');   // FIX: kunci tombol Simpan (anti ketuk ganda)
      tulisAdmin(null, null, () => { db.ref('siswa/'+editingSiswaKey).update({ name, kelas, nominalIuranKhusus, noWaOrtu, noWaKey }, err => {
        lepas();
        if (err) toast('Gagal update: '+err.message, true);
        else { toastTersimpan(); addLog('edit_siswa', name + ' - ' + kelas); closeEditSiswaModal(); reloadDataset('siswa', () => { populateClassFilterDropdowns(); loadAttendance(); loadGrades(); }); }
      }); }, lepas);
    }
    // ============================================================
    // NOTIFIKASI WHATSAPP KE WALI MURID
    // ============================================================
    // Tanpa API berbayar/Cloud Functions: cukup buka wa.me dengan nomor & pesan sudah terisi,
    // guru/Admin tinggal tekan kirim di WhatsApp mereka sendiri. Perlu nomor WA wali (noWaOrtu)
    // sudah diisi lewat Edit Siswa -- kalau belum diisi, tombol WA menampilkan pesan supaya diisi
    // dulu, tidak membuka wa.me dengan nomor kosong.
    function formatNomorWa(nomor) {
      let n = String(nomor||'').replace(/[^0-9]/g, '');
      if (n.startsWith('0')) n = '62' + n.slice(1);
      else if (!n.startsWith('62')) n = '62' + n;
      return n;
    }
    function kirimWA(nomor, pesan) {
      if (!nomor) { toast('⚠️ Nomor WhatsApp wali belum diisi. Isi lewat Edit Siswa di Data Siswa.', true); return; }
      const nomorFormat = formatNomorWa(nomor);
      if (nomorFormat.length < 10) { toast('⚠️ Nomor WhatsApp wali tidak valid.', true); return; }
      window.open(`https://wa.me/${nomorFormat}?text=${encodeURIComponent(pesan)}`, '_blank');
    }
    function kirimWaSiswaKey(siswaKey, pesan) {
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) return toast('Data siswa tidak ditemukan!', true);
      kirimWA(siswa.noWaOrtu, pesan);
    }
    function tambahSiswa() {
      if (!isAdmin()) return toast('🔒 Hanya Admin!', true);
      if (isBusy('tambahSiswa')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      const name = document.getElementById('studentName').value.trim(), kelas = document.getElementById('studentClass').value;
      if (!name) return toast('Nama wajib!', true);
      if (allSiswa.filter(s => s.kelas === kelas).length >= 30) return toast(`⚠️ Kelas ${kelas} sudah penuh (maks 30 siswa)!`, true);
      const btn = document.getElementById('btnTambahSiswa');
      setBusy('tambahSiswa', btn);
      tulisAdmin('tambahSiswa', btn, () => {       db.ref('siswa').push().set({ name, kelas, guru: 'Admin', guruKey: currentUser.key || null, dibuat: new Date().toISOString() }, err => {
        clearBusy('tambahSiswa', btn);
        if (err) toast('Gagal: '+err.message, true);
        else { toastTersimpan(); addLog('tambah_siswa', name + ' - ' + kelas); document.getElementById('studentName').value = ''; document.getElementById('filterKelasSiswa').value = ''; reloadDataset('siswa', () => { populateClassFilterDropdowns(); loadAttendance(); loadGrades(); }); }
      }); });
    }
    function bulkImportSiswa() {
      if (!isAdmin()) return toast('🔒 Hanya Admin!', true);
      const text = document.getElementById('bulkStudentInput').value.trim();
      if (!text) return toast('Masukkan daftar siswa!', true);
      const lines = text.split('\n').filter(line => line.trim() !== '');
      let success = 0, error = 0;
      // FIX: sebelumnya cek "≥30" pakai allSiswa langsung -- itu snapshot SEBELUM impor mulai,
      // tidak ikut bertambah tiap baris di batch yang sama diterima. Akibatnya kelas yang sudah
      // 25 siswa & di-bulk-import 10 baris lagi, SEMUA baris lolos cek (krn allSiswa masih
      // terbaca 25 di semua baris), hasil akhir 35 siswa -- batas 30 kebobolan di dalam batch.
      // Sekarang pakai counter lokal per kelas yang dimulai dari jumlah aktual & ikut naik
      // setiap baris DITERIMA (bukan baru setelah semua selesai/reload).
      const jumlahPerKelas = {};
      allSiswa.forEach(s => { jumlahPerKelas[s.kelas] = (jumlahPerKelas[s.kelas] || 0) + 1; });
      tulisAdmin(null, null, () => {       lines.forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 2) { error++; return; }
        const name = parts[0], kelas = parts[1];
        if (!name || !kelas) { error++; return; }
        if ((jumlahPerKelas[kelas] || 0) >= 30) { error++; toast(`⚠️ Kelas ${kelas} sudah penuh (maks 30 siswa)!`, true); return; }
        jumlahPerKelas[kelas] = (jumlahPerKelas[kelas] || 0) + 1;
        db.ref('siswa').push().set({ name, kelas, guru: 'Admin', guruKey: currentUser.key || null, dibuat: new Date().toISOString() }, err => {
          if (err) error++; else success++;
          if (success + error === lines.length) { toast(`✅ ${success} siswa berhasil diimport, ${error} gagal.`); addLog('import_siswa', success + ' siswa diimport'); document.getElementById('filterKelasSiswa').value = ''; reloadDataset('siswa', () => { populateClassFilterDropdowns(); loadAttendance(); loadGrades(); }); document.getElementById('bulkStudentInput').value = ''; }
        });
      }); });
    }

    // ============================================================
    // ABSENSI
    // ============================================================
    function onAttendanceDateChange() { attendanceDraft = {}; loadAttendance(); }
    function loadAttendance() {
      const date = document.getElementById('attendanceDate').value || tglLokal();
      const filterKelas = document.getElementById('attendanceClassFilter').value;
      selectedAttendanceClass = filterKelas;
      if (!filterKelas) { document.getElementById('attendanceList').innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">Silakan pilih kelas terlebih dahulu.</p>'; return; }
      const existing = allAttendance.filter(a => a.tanggal === date && a.kelas === filterKelas);
      attendanceDraft = existing.length > 0 ? JSON.parse(JSON.stringify(existing[0].data || {})) : {}; // salinan: klik status tidak boleh mengubah allAttendance (& cache offline) sebelum disimpan
      renderAttendance([filterKelas]);
    }
    function renderAttendance(kelasList) {
      const list = document.getElementById('attendanceList');
      if (!kelasList || kelasList.length === 0) {
        if (selectedAttendanceClass) kelasList = [selectedAttendanceClass];
        else { list.innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">Silakan pilih kelas.</p>'; return; }
      }
      const siswa = allSiswa.filter(s => kelasList.includes(s.kelas));
      if (siswa.length === 0) { list.innerHTML = `<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada siswa di kelas ${escapeHtml(kelasList.join(', '))}.</p>`; return; }
      const disabled = canEdit() && !isKepsek() ? '' : 'disabled';
      const jamPertama = jamSettings[1] || { mulai: '07:30', selesai: '08:15' };
      let html = `<div class="attendance-warning">ℹ️ Klik status di bawah untuk mengisi absensi siswa.<br><span style="font-weight:600;">H</span> = Hadir, <span style="font-weight:600;">S</span> = Sakit, <span style="font-weight:600;">I</span> = Izin, <span style="font-weight:600;">A</span> = Alfa<br><strong>⚠️ Disarankan mengisi di jam pertama (${jamPertama.mulai} - ${jamPertama.selesai}).</strong><br><span style="color:#2563eb;">💡 Jika di luar jam pertama, Anda tetap bisa mengisi dengan konfirmasi.</span></div>`;
      html += attModeBarHtml();
      if (attFastMode) html += attFastHtml(siswa, disabled);
      else siswa.forEach(s => {
        const status = attendanceDraft[s.key] || '', hasStatus = status !== '', bgColor = hasStatus ? '#eff6ff' : '#f9fafb';
        html += `<div data-skey="${escapeHtml(s.key)}" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${bgColor};border-radius:8px;margin-bottom:4px;border:1px solid ${hasStatus ? '#e5e7eb' : '#f3f4f6'};flex-wrap:wrap;gap:4px;">
          <span><strong>${escapeHtml(s.name)}</strong> (${escapeHtml(s.kelas)})</span>
          <div class="att-btns" style="display:flex;gap:4px;flex-wrap:wrap;">${['H','S','I','A'].map(st => `<button class="status-choice ${status===st?'selected':''} ${!hasStatus ? 'border-muted text-muted' : ''}" data-status="${st}" onclick="setAttendance('${s.key}','${st}')" ${disabled}>${st}</button>`).join('')}${!hasStatus ? `<span class="att-belum text-muted" style="font-size:11px;margin-left:4px;">(belum)</span>` : ''}</div>
        </div>`;
      });
      if (canEdit() && !isKepsek()) {
        html += `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-soft" style="padding:4px 12px;font-size:12px;" onclick="fillAllAttendance('H')">✅ Isi Semua Hadir</button><button class="btn btn-soft" style="padding:4px 12px;font-size:12px;" onclick="fillAllAttendance('S')">🤒 Isi Semua Sakit</button><button class="btn btn-soft" style="padding:4px 12px;font-size:12px;" onclick="fillAllAttendance('I')">📝 Isi Semua Izin</button><button class="btn btn-soft" style="padding:4px 12px;font-size:12px;" onclick="fillAllAttendance('A')">❌ Isi Semua Alfa</button><button class="btn btn-danger" style="padding:4px 12px;font-size:12px;" onclick="clearAllAttendance()">🗑️ Kosongkan Semua</button></div>`;
      }
      list.innerHTML = html;
    }
    // ---- Mode Cepat absensi harian: ketuk nama = ganti status H -> A -> S -> I -> H ----
    const ATT_FAST_WARNA = { H: ['#dcfce7', '#86efac', '#166534'], A: ['#fee2e2', '#fca5a5', '#991b1b'], S: ['#fef9c3', '#fde047', '#854d0e'], I: ['#dbeafe', '#93c5fd', '#1e40af'] };
    const ATT_FAST_LABEL = { H: 'Hadir', A: 'Alfa', S: 'Sakit', I: 'Izin' };
    function attModeBarHtml(fn) {
      return `<div style="margin:8px 0;"><button type="button" class="btn ${attFastMode ? 'btn-success' : 'btn-soft'}" style="padding:6px 12px;font-size:12px;" onclick="${fn || 'toggleAttendanceFast'}()">${attFastMode ? '⚡ Mode Cepat (aktif) · ketuk untuk ganti ke Tabel' : '📋 Mode Tabel · ketuk untuk ganti ke Mode Cepat'}</button></div>`;
    }
    function attFastChipStyle(status, disabled) {
      const c = ATT_FAST_WARNA[status] || ['#f3f4f6', '#d1d5db', '#374151'];
      return `display:flex;align-items:center;justify-content:space-between;gap:6px;text-align:left;min-height:38px;padding:4px 8px;border-radius:8px;border:1.5px solid ${c[1]};background:${c[0]};color:${c[2]};cursor:${disabled ? 'default' : 'pointer'};font-size:12px;line-height:1.2;`;
    }
    function attFastSummaryHtml(siswa, draft) {
      draft = draft || attendanceDraft;
      const cnt = { H: 0, A: 0, S: 0, I: 0, kosong: 0 };
      siswa.forEach(s => { const st = draft[s.key]; if (cnt[st] !== undefined && st !== 'kosong') cnt[st]++; else cnt.kosong++; });
      return `✅ Hadir ${cnt.H} · ❌ Alfa ${cnt.A} · 🤒 Sakit ${cnt.S} · 📝 Izin ${cnt.I}${cnt.kosong ? ` · ⬜ Belum ${cnt.kosong}` : ''}`;
    }
    function attFastChipInner(s, draft) {
      const st = (draft || attendanceDraft)[s.key] || '';
      return `<strong style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.name)}</strong><span style="font-weight:700;flex-shrink:0;">${st ? escapeHtml(ATT_FAST_LABEL[st] || st) : '—'}</span>`;
    }
    // o (opsional) = { draft, fn, gid, sid } supaya dipakai juga oleh absensi guru pengganti (mewakili).
    function attFastHtml(siswa, disabled, o) {
      o = o || {};
      const draft = o.draft || attendanceDraft, fn = o.fn || 'cycleAttendance', gid = o.gid || 'attFastGrid', sid = o.sid || 'attFastSummary';
      const chips = siswa.map(s => `<button type="button" data-skey="${escapeHtml(s.key)}" ${disabled} onclick="${fn}('${escapeJs(s.key)}')" style="${attFastChipStyle(draft[s.key] || '', disabled)}">${attFastChipInner(s, draft)}</button>`).join('');
      return `<div id="${sid}" style="font-size:12px;margin-bottom:6px;color:#374151;">${attFastSummaryHtml(siswa, draft)}</div><div id="${gid}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px;">${chips}</div>`;
    }
    function toggleAttendanceFast() {
      attFastMode = !attFastMode;
      const el = document.getElementById('attendanceClassFilter');
      renderAttendance([(el && el.value) || selectedAttendanceClass]);
    }
    function cycleAttendance(studentKey) {
      if (!canEdit() || isKepsek()) return toast('Tidak bisa mengubah!', true);
      const el = document.getElementById('attendanceClassFilter');
      const kelasAktif = (el && el.value) || selectedAttendanceClass;
      if (!kelasAktif) return;
      selectedAttendanceClass = kelasAktif;
      const sk = allSiswa.find(x => x.key === studentKey);
      if (!sk || sk.kelas !== kelasAktif) return;   // daftar basi: abaikan ketukan
      attendanceDraft[studentKey] = { H: 'A', A: 'S', S: 'I', I: 'H' }[attendanceDraft[studentKey] || ''] || 'H';
      // Perbarui SATU kotak + ringkasan di tempat (posisi scroll terjaga); kalau tidak ketemu -> render penuh.
      const grid = document.getElementById('attFastGrid');
      const chip = grid && grid.querySelector('[data-skey="' + CSS.escape(studentKey) + '"]');
      if (!chip) return renderAttendance([kelasAktif]);
      chip.setAttribute('style', attFastChipStyle(attendanceDraft[studentKey], false));
      chip.innerHTML = attFastChipInner(sk);
      const sum = document.getElementById('attFastSummary');
      if (sum) sum.innerHTML = attFastSummaryHtml(allSiswa.filter(s => s.kelas === kelasAktif));
    }
    // Update SATU baris siswa di tempat (tanpa membangun ulang seluruh daftar): fokus tombol & posisi scroll
    // tetap terjaga. Return false kalau barisnya tidak ada di DOM -> pemanggil jatuh ke renderAttendance() penuh.
    function updateAttendanceRowUI(studentKey) {
      const list = document.getElementById('attendanceList');
      if (!list) return false;
      const row = list.querySelector('[data-skey="' + CSS.escape(studentKey) + '"]');
      if (!row) return false;
      const status = attendanceDraft[studentKey] || '', hasStatus = status !== '';
      row.style.background = hasStatus ? '#eff6ff' : '#f9fafb';
      row.style.borderColor = hasStatus ? '#e5e7eb' : '#f3f4f6';
      row.querySelectorAll('.status-choice').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.status === status);
        btn.classList.toggle('border-muted', !hasStatus);
        btn.classList.toggle('text-muted', !hasStatus);
      });
      const box = row.querySelector('.att-btns'), belum = row.querySelector('.att-belum');
      if (hasStatus && belum) belum.remove();
      else if (!hasStatus && !belum && box) {
        const sp = document.createElement('span');
        sp.className = 'att-belum text-muted'; sp.style.cssText = 'font-size:11px;margin-left:4px;'; sp.textContent = '(belum)';
        box.appendChild(sp);
      }
      return true;
    }
    function fillAllAttendance(status) {
      if (!canEdit() || isKepsek()) return toast('Tidak bisa mengubah!', true);
      const filterKelas = document.getElementById('attendanceClassFilter').value;
      if (!filterKelas) return toast('Pilih kelas terlebih dahulu!', true);
      const siswa = allSiswa.filter(s => s.kelas === filterKelas);
      if (siswa.length === 0) return toast('Tidak ada siswa di kelas ini.', true);
      if (!confirm(`Isi semua siswa dengan status "${status}"?`)) return;
      siswa.forEach(s => { attendanceDraft[s.key] = status; });
      renderAttendance([filterKelas]); toast(`✅ Semua siswa diisi status ${status}`);
    }
    function clearAllAttendance() {
      if (!canEdit() || isKepsek()) return toast('Tidak bisa mengubah!', true);
      const filterKelas = document.getElementById('attendanceClassFilter').value;
      if (!filterKelas) return toast('Pilih kelas terlebih dahulu!', true);
      const siswa = allSiswa.filter(s => s.kelas === filterKelas);
      if (siswa.length === 0) return toast('Tidak ada siswa di kelas ini.', true);
      if (!confirm('Kosongkan semua status absensi?')) return;
      siswa.forEach(s => { delete attendanceDraft[s.key]; });
      renderAttendance([filterKelas]); toast('✅ Semua status dikosongkan');
    }
    function setAttendance(studentKey, status) {
      if (!canEdit() || isKepsek()) return toast('Tidak bisa mengubah!', true);
      if (attendanceDraft[studentKey] === status) delete attendanceDraft[studentKey];
      else attendanceDraft[studentKey] = status;
      // Baca dropdown LANGSUNG sebagai sumber utama (paling akurat/terkini), selectedAttendanceClass
      // cuma fallback kalau dropdown entah kenapa kosong -- sebelumnya renderAttendance() di sini
      // selalu pakai selectedAttendanceClass, yang bisa basi/kosong kalau ada render lain (mis.
      // refresh data fase 2 di background) menimpanya tepat di antara ganti dropdown & klik status.
      const attendanceClassFilterEl = document.getElementById('attendanceClassFilter');
      const kelasAktif = (attendanceClassFilterEl && attendanceClassFilterEl.value) || selectedAttendanceClass;
      if (!kelasAktif) return;
      selectedAttendanceClass = kelasAktif;
      // Daftar yang tampil harus memang milik kelas aktif; kalau tidak (kasus basi di komentar atas) -> render penuh.
      const sk = allSiswa.find(x => x.key === studentKey);
      if (sk && sk.kelas === kelasAktif && updateAttendanceRowUI(studentKey)) return;
      renderAttendance([kelasAktif]);
    }
    // ============================================================
    // WAJIB ABSEN DATANG SEBELUM ISI ABSENSI SISWA
    // (Alur "Ajukan Konfirmasi Telat" + persetujuannya sudah DIHAPUS -- keterlambatan guru sudah tercatat di
    //  Absen Guru. Kalau guru tidak bisa absen (kamera/GPS bermasalah), Admin mencatatkan kehadirannya lewat
    //  menu Kelola Absen Guru, dan pengunci ini otomatis terbuka.)
    // ============================================================
    function sudahAbsenDatangHariIni() {
      const today = tglLokal();
      const cocok = a => a.tanggal === today && a.type === 'Datang' && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name);
      // allTeacherAttendanceToday (query per tanggal) ikut dicek: allTeacherAttendance disaring per tahunAjaran, sehingga catatan Datang
      // yang tahunAjaran-nya kosong/berbeda (mis. hasil koreksi/edit manual) tidak terhitung walau sudah ada di server.
      const ada = allTeacherAttendance.some(cocok) || (allTeacherAttendanceToday || []).some(cocok);
      // Penanda di perangkat: begitu catatan Datang hari ini pernah terlihat (di memori/server), ingat sampai ganti hari. Data memori bisa
      // kosong lagi saat muat ulang di sinyal lemah/offline; tanpa penanda ini guru yang sudah absen ditahan lagi.
      const kunciPenanda = 'simamba_datang_' + today + '_' + (currentUser.key || currentUser.name);
      try { if (ada) localStorage.setItem(kunciPenanda, '1'); else if (localStorage.getItem(kunciPenanda) === '1') return true; } catch (e) {}
      return ada;
    }
    function bolehIsiAbsensiSiswa() {
      if (isAdmin() || isKepsek()) return true;
      return sudahAbsenDatangHariIni();
    }
    let _lateCekTs = 0;
    function renderAttendanceLateBlock() {
      const block = document.getElementById('attendanceLateBlock');
      if (!block || !currentUser) return;
      const boleh = bolehIsiAbsensiSiswa();
      block.style.display = boleh ? 'none' : 'block';
      // Data absen guru di memori bisa basi (dimuat dari cache perangkat, atau Datang dicatat dari perangkat lain / Admin). Sebelum menahan guru,
      // cek langsung ke server (maks 1x per 30 dtk) lalu buka kuncinya bila catatan Datang hari ini ternyata sudah ada.
      if (!boleh && Date.now() - _lateCekTs > 30000 && typeof v4SegarkanAbsenHariIni === 'function') {
        _lateCekTs = Date.now();
        v4SegarkanAbsenHariIni().then(() => { if (bolehIsiAbsensiSiswa()) block.style.display = 'none'; }).catch(() => {});
      }
    }

    // ============================================================
    // KONFIRMASI PULANG DULUAN (guru pulang di luar jendela 11:00-12:30)
    // ============================================================
    function earlyLeaveStatusHariIni() {
      const today = tglLokal();
      const req = allEarlyLeaveRequests.filter(r => r.tanggal === today && (r.guruKey ? r.guruKey === currentUser.key : r.guru === currentUser.name)).sort((a,b) => COLLATOR_ID.compare((b.createdAt||''), a.createdAt||''))[0];
      return req || null;
    }
    function earlyLeaveDisetujui() {
      const req = earlyLeaveStatusHariIni();
      return req && req.status === 'approved';
    }
    let earlyLeaveListenerRef = null, earlyLeaveListenerKey = null;
    function watchEarlyLeaveRequest(key) {
      if (earlyLeaveListenerKey === key) return;
      if (earlyLeaveListenerRef) { earlyLeaveListenerRef.off(); }
      earlyLeaveListenerKey = key;
      earlyLeaveListenerRef = db.ref('early_leave_requests/' + key);
      earlyLeaveListenerRef.on('value', snap => {
        const val = snap.val();
        if (!val || val.status === 'pending') return;
        const msg = val.status === 'approved' ? '✅ Catatan pulang duluan Anda ditinjau & disetujui.' : '📝 Catatan pulang duluan Anda ditinjau, ada catatan dari Admin/Kepala Madrasah.';
        toast(msg, val.status !== 'approved', 5000);
        if (earlyLeaveListenerRef) { earlyLeaveListenerRef.off(); earlyLeaveListenerRef = null; earlyLeaveListenerKey = null; }
        reloadDataset('earlyLeave');
      });
    }
    function pilihAlasanRapat(eventKey) {
      // Dipanggil saat guru klik tombol saran "🗓️ Ada tugas rapat..." di form Izin Pulang Duluan --
      // mengisi otomatis kotak alasan dengan detail acara Rapat yang benar-benar tercatat di menu
      // Lembur & Rapat, supaya alasannya konsisten dengan data resmi (bukan ketikan bebas yang
      // tidak bisa diverifikasi). Guru tetap harus klik "Kirim" sendiri di submitEarlyLeaveRequest().
      const ev = (allEvents || []).find(e => e.key === eventKey);
      if (!ev) return;
      const alasanEl = document.getElementById('earlyLeaveAlasan');
      if (alasanEl) { alasanEl.value = `Tugas Rapat: ${ev.nama} (${ev.jamMulai}-${ev.jamSelesai})`; alasanEl.focus(); }
    }
    function renderEarlyLeaveRapatSuggestion(form) {
      // FITUR BARU: kalau ada Acara berjenis "Rapat" (dari menu Lembur & Rapat, lihat submitEvent())
      // yang terjadwal HARI INI, tampilkan tombol cepat untuk memakainya sebagai alasan "Pulang
      // Duluan" -- lebih cepat daripada mengetik manual, dan alasannya otomatis merujuk ke acara
      // resmi yang sudah dicatat Admin (bukan klaim tanpa bukti). Kotak ini dibuat & disisipkan
      // secara dinamis lewat JS (bukan bagian statis index.html), supaya tidak perlu ubah markup
      // HTML yang sudah ada -- kalau tidak ada Rapat hari ini, kotak ini disembunyikan/tidak dibuat.
      const today = tglLokal();
      const rapatHariIni = (allEvents || []).filter(e => e.tanggal === today && e.jenis === 'Rapat');
      let box = document.getElementById('earlyLeaveRapatSuggestion');
      if (rapatHariIni.length === 0) { if (box) box.style.display = 'none'; return; }
      if (!box) {
        box = document.createElement('div');
        box.id = 'earlyLeaveRapatSuggestion';
        box.style.cssText = 'margin-bottom:10px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;';
        if (form && form.parentNode) form.parentNode.insertBefore(box, form);
      }
      box.style.display = 'block';
      box.innerHTML = `<div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:6px;">🗓️ Ada tugas rapat terjadwal hari ini -- klik untuk memakainya sebagai alasan:</div>` +
        rapatHariIni.map(ev => `<button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin:2px 4px 2px 0;" onclick="pilihAlasanRapat('${ev.key}')">📌 ${escapeHtml(ev.nama)} (${escapeHtml(ev.jamMulai)}-${escapeHtml(ev.jamSelesai)})</button>`).join('');
    }
    function renderEarlyLeaveBlock() {
      const block = document.getElementById('earlyLeaveBlock');
      const rapatBox = document.getElementById('earlyLeaveRapatSuggestion');
      if (!block || !currentUser) return;
      // PERBAIKAN: kotak ini hanya untuk peran yang BISA absen (Guru & Wali Kelas) -- syarat yang sama dengan
      // startCamera()/verifyAndAbsen(). Dulu hanya Admin yang disembunyikan (isAdmin()), sehingga Kepala Madrasah,
      // yang juga tidak bisa absen, masih melihat formnya.
      const type = (isTeacher() || isWaliKelas()) ? v4DeteksiTipeAbsenGuru() : null;
      if (type !== 'Pulang') { block.style.display = 'none'; if (rapatBox) rapatBox.style.display = 'none'; return; }
      const window_ = getJamAbsenWindow('Pulang');
      const now = new Date(), sekarangMenit = menitWIB(now);
      const mulai = window_.mulai.split(':'), mulaiMenit = parseInt(mulai[0])*60 + parseInt(mulai[1]);
      const selesai = window_.selesai.split(':'), selesaiMenit = parseInt(selesai[0])*60 + parseInt(selesai[1]);
      const isDalamJendela = sekarangMenit >= mulaiMenit && sekarangMenit <= selesaiMenit;
      // Catatan: absen Pulang di luar jendela SEKARANG SELALU BISA langsung dilakukan (tidak
      // diblokir). Kotak ini hanya tampil sebagai ajakan opsional untuk mencatat alasan --
      // begitu sudah pernah diajukan hari ini (status apa pun), tidak perlu ditampilkan lagi.
      const req = earlyLeaveStatusHariIni();
      if (isDalamJendela || req) { block.style.display = 'none'; if (rapatBox) rapatBox.style.display = 'none'; return; }
      block.style.display = 'block';
      const pendingNotice = document.getElementById('earlyLeavePendingNotice');
      const rejectedNotice = document.getElementById('earlyLeaveRejectedNotice');
      const form = document.getElementById('earlyLeaveForm');
      pendingNotice.style.display = 'none'; rejectedNotice.style.display = 'none'; form.style.display = 'block';
      renderEarlyLeaveRapatSuggestion(form);
    }
    function submitEarlyLeaveRequest() {
      if (!isTeacher() && !isWaliKelas()) return toast('Hanya Guru & Wali Kelas!', true);
      if (isBusy('submitEarlyLeaveRequest')) return toast('⏳ Sedang mengirim, mohon tunggu...', false, 1500);
      const alasan = document.getElementById('earlyLeaveAlasan').value.trim();
      if (!alasan) return toast('Isi alasan terlebih dahulu!', true);
      const today = tglLokal();
      const data = { guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, tanggal: today, alasan: alasan, status: 'pending', tahunAjaran: currentTahunAjaran, createdAt: new Date().toISOString() };
      const ref = db.ref('early_leave_requests').push();
      setBusy('submitEarlyLeaveRequest', null);
      ref.set(data, err => {
        clearBusy('submitEarlyLeaveRequest', null);
        if (err) toast('❌ Gagal: '+err.message, true);
        else { toast('📤 Alasan pulang duluan tercatat. Anda tetap bisa langsung absen Pulang.'); addLog('ajukan_pulang_duluan', today); document.getElementById('earlyLeaveAlasan').value = ''; reloadDataset('earlyLeave'); }
      });
    }
    // Penyetuju catatan pulang duluan: satu definisi dipakai render, setujui, dan tolak (dulu ditulis ulang di tiga tempat).
    function bolehSetujuiPulangDuluan() { return isKepsek() || isAdmin(); }
    function approveEarlyLeave(key) {
      if (!bolehSetujuiPulangDuluan()) return toast('Hanya Kepala Madrasah/Admin!', true);
      db.ref('early_leave_requests/'+key).update({ status: 'approved', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toastTersimpan('Pulang duluan disetujui'); addLog('setujui_pulang_duluan', key); reloadDataset('earlyLeave'); }
      });
    }
    function rejectEarlyLeave(key) {
      if (!bolehSetujuiPulangDuluan()) return toast('Hanya Kepala Madrasah/Admin!', true);
      const note = prompt('Catatan penolakan (opsional):') || '';
      db.ref('early_leave_requests/'+key).update({ status: 'rejected', rejectedBy: currentUser.name, rejectedAt: new Date().toISOString(), rejectedNote: note }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('📝 Catatan pulang duluan ditandai perlu tindak lanjut.'); addLog('tolak_pulang_duluan', key); reloadDataset('earlyLeave'); }
      });
    }
    function renderEarlyLeaveApprovals() {
      const section = document.getElementById('earlyLeaveApprovalSection'), list = document.getElementById('earlyLeaveApprovalList');
      if (!section || !list) return;
      if (!bolehSetujuiPulangDuluan()) { section.style.display = 'none'; return; }
      const pending = allEarlyLeaveRequests.filter(r => r.status === 'pending');
      if (pending.length === 0) { section.style.display = 'none'; return; }
      section.style.display = 'block';
      list.innerHTML = '';
      pending.sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).forEach(r => {
        list.innerHTML += `<div style="padding:12px;background:#fef3c7;border-radius:8px;border-left:4px solid #d97706;margin-bottom:8px;">
          <div style="font-weight:700;">👤 ${escapeHtml(r.guru)} - ${escapeHtml(r.tanggal)}</div>
          <div class="text-strong" style="font-size:14px;margin:4px 0;">${escapeHtml(r.alasan)}</div>
          <div style="margin-top:8px;"><button class="btn btn-success" style="padding:4px 14px;font-size:12px;" onclick="approveEarlyLeave('${r.key}')">✅ Setujui</button> <button class="btn btn-danger" style="padding:4px 14px;font-size:12px;margin-left:6px;" onclick="rejectEarlyLeave('${r.key}')">❌ Tolak</button></div>
        </div>`;
      });
    }

    function saveAttendance() {
      if (!canEdit() || isKepsek()) return toast('Tidak bisa menyimpan!', true);
      if (isBusy('saveAttendance')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 2000);
      if (!bolehIsiAbsensiSiswa()) {
        // Jangan langsung menolak: data di memori bisa basi. Periksa catatan Datang hari ini langsung di server dulu, lalu ulangi simpan bila ada.
        if (!saveAttendance._cekDatang) {
          saveAttendance._cekDatang = true;
          toast('⏳ Memeriksa absen datang Anda...', false, 1500);
          return v4SegarkanAbsenHariIni().catch(() => {}).then(() => {
            saveAttendance._cekDatang = false;
            if (bolehIsiAbsensiSiswa()) { renderAttendanceLateBlock(); return saveAttendance(); }
            renderAttendanceLateBlock();
            toast('🔒 Absen datang dulu di menu Absen Guru. Kalau tidak bisa absen, minta Admin mencatatnya di Kelola Absen Guru.', true);
          });
        }
        return;
      }
      const date = document.getElementById('attendanceDate').value || tglLokal();
      const filterKelas = document.getElementById('attendanceClassFilter').value;
      if (!filterKelas) return toast('Pilih kelas terlebih dahulu!', true);
      const siswa = allSiswa.filter(s => s.kelas === filterKelas);
      if (siswa.length === 0) return toast('Tidak ada siswa di kelas tersebut.', true);
      const belumDiisi = siswa.filter(s => !attendanceDraft[s.key]);
      if (belumDiisi.length > 0) { const namaBelum = belumDiisi.map(s => s.name).join(', '); if (!confirm(`⚠️ ${belumDiisi.length} siswa belum diisi: ${namaBelum}. Lanjutkan menyimpan?`)) return; }
      const today = tglLokal();
      if (date > today) return toast('Tidak bisa mengisi absensi untuk tanggal di masa depan!', true);
      const now = new Date(), sekarangMenit = menitWIB(now), jamSekarang = Math.floor(sekarangMenit / 60), menitSekarang = sekarangMenit % 60;
      const jamPertama = jamSettings[1] || { mulai: '07:30', selesai: '08:15' };
      const mulai = jamPertama.mulai.split(':'), selesai = jamPertama.selesai.split(':');
      const mulaiMenit = parseInt(mulai[0])*60 + parseInt(mulai[1]), selesaiMenit = parseInt(selesai[0])*60 + parseInt(selesai[1]);
      const isJamPertama = sekarangMenit >= mulaiMenit && sekarangMenit <= selesaiMenit;
      if (!isJamPertama && !isAdmin()) { if (!confirm(`⚠️ Absensi siswa sebaiknya diisi di jam pertama (${jamPertama.mulai} - ${jamPertama.selesai}). Lanjutkan?`)) return; }
      const btnSaveAttendance = document.getElementById('btnSaveAttendance');
      setBusy('saveAttendance', btnSaveAttendance);
      if (btnSaveAttendance) btnSaveAttendance.textContent = '⏳ Menyimpan...';
      function selesaiSimpan() {
        clearBusy('saveAttendance', btnSaveAttendance);
      }
      // ===== OFFLINE: absensi diantre di perangkat, tidak menunggu Firebase =====
      // Tidak bisa cek "apakah sudah ada record untuk kelas & tanggal ini" tanpa koneksi, jadi
      // pengecekan itu (existingKey) ditunda dan baru dilakukan saat data ini dikirim ulang ke
      // Firebase (lihat flushPendingAttendance) -- supaya tidak membuat data dobel di server.
      if (!isReallyOnline()) {
        selesaiSimpan();
        return queueOfflineAttendance({ tanggal: date, kelas: filterKelas, guru: currentUser.name, guruKey: currentUser.key, data: JSON.parse(JSON.stringify(attendanceDraft)), tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() });
      }
      // [PATCH JARINGAN LEMAH] Online menurut browser + Firebase, tapi bisa saja lambat. Beri batas
      // waktu (SAVE_DEADLINE_MS): kalau server belum membalas, absensi masuk antrian perangkat &
      // dikirim otomatis begitu jaringan pulih, tombol tidak lagi tertahan di "Menyimpan...".
      // attRefKey mengunci node tujuan (kalau sudah ditentukan) supaya pengiriman ulang tidak dobel.
      let attSettled = false, attRefKey = null;
      const attPayload = { tanggal: date, kelas: filterKelas, guru: currentUser.name, guruKey: currentUser.key, data: JSON.parse(JSON.stringify(attendanceDraft)), tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() };
      const attTimer = setTimeout(() => {
        if (attSettled) return; attSettled = true;
        selesaiSimpan();
        queueOfflineAttendance(attRefKey ? Object.assign({ _fbKey: attRefKey }, attPayload) : attPayload,
          '📶 Sinyal lemah: absensi disimpan di perangkat ini & akan otomatis dikirim saat jaringan pulih.');
      }, SAVE_DEADLINE_MS);
      db.ref('attendance').orderByChild('tanggal').equalTo(date).once('value', snap => {
        if (attSettled) return; // sudah dialihkan ke antrian -- jangan menulis lagi
        let existingKey = null;
        snap.forEach(child => { if (child.val().kelas === filterKelas) existingKey = child.key; });
        const ref = existingKey ? db.ref('attendance/' + existingKey) : db.ref('attendance').push();
        attRefKey = ref.key;
        const data = attPayload;
        ref.set(data, err => {
          if (attSettled) return; attSettled = true; clearTimeout(attTimer);
          selesaiSimpan();
          if (err) {
            // Fallback: kalau gagal karena koneksi putus tepat saat menulis, selamatkan datanya
            // ke antrian offline alih-alih hilang begitu saja.
            if (!isReallyOnline()) queueOfflineAttendance(Object.assign({ _fbKey: ref.key }, data));
            else toast('❌ Gagal: '+err.message, true);
          }
          else { toastTersimpan(); addLog('simpan_absensi', filterKelas + ' - ' + date); reloadDataset('attendance', () => { loadAttendance(); }); }
        });
      }, err => {
        if (attSettled) return; attSettled = true; clearTimeout(attTimer);
        selesaiSimpan();
        if (!isReallyOnline()) queueOfflineAttendance(attPayload);
        else toast('❌ Gagal: '+err.message, true);
      });
    }

    // ============================================================
    // ABSENSI CEPAT UNTUK GURU PENGGANTI (MEWAKILI)
    // Dipakai saat guru mewakili guru lain yang tidak hadir, dan kelas yang diwakili itu
    // BUKAN salah satu kelas yang di-assign ke akun guru pengganti (currentUser.kelas) --
    // sehingga tidak muncul & tidak bisa diisi lewat menu Absensi Siswa biasa. Lihat VALIDASI D
    // di saveJournal(). Siswa diambil on-demand langsung dari Firebase (bukan dari allSiswa
    // yang sudah difilter ke currentUser.kelas) -- ini konsisten dengan limitasi keamanan yang
    // sudah diketahui/didokumentasikan: Security Rules memang belum membatasi baca data
    // per-kelas, jadi query ad-hoc ini tidak membuka celah baru.
    // ============================================================
    let mewakiliAttendanceDraft = {}, mewakiliAttendanceKelas = null, mewakiliAttendanceTanggal = null, mewakiliAttendanceSiswa = [];
    function bukaAbsensiUntukJurnal() {
      // Dipanggil dari tombol "Isi Absensi Sekarang" di form Jurnal -- pilih jalur yang tepat:
      // kalau lagi mengisi jurnal Non-Reguler untuk kelas di luar currentUser.kelas, pakai
      // jendela absensi cepat khusus guru pengganti; selain itu pakai jalur biasa (quickAttendance).
      const type = document.getElementById('journalType').value;
      const kelas = document.getElementById('journalClass').value;
      const tanggal = document.getElementById('journalDate').value || tglLokal();
      if (type === 'Non-Reguler' && kelas && !(currentUser.kelas || []).includes(kelas)) {
        bukaAbsensiMewakili(kelas, tanggal);
      } else {
        quickAttendance();
      }
    }
    function bukaAbsensiMewakili(kelas, tanggal) {
      if (!kelas || !tanggal) return;
      if (!isReallyOnline()) return toast('📡 Absensi untuk kelas yang diwakili butuh koneksi internet (data siswa kelas itu diambil langsung dari server). Coba lagi saat online.', true);
      mewakiliAttendanceKelas = kelas; mewakiliAttendanceTanggal = tanggal; mewakiliAttendanceSiswa = []; mewakiliAttendanceDraft = {};
      document.getElementById('mewakiliAbsensiTitle').textContent = `Absensi ${kelas} -- ${tanggal}`;
      document.getElementById('mewakiliAbsensiList').innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">⏳ Memuat data siswa...</p>';
      document.getElementById('mewakiliAbsensiModal').classList.add('show');
      db.ref('siswa').orderByChild('kelas').equalTo(kelas).once('value', snap => {
        snap.forEach(child => { const s = child.val(); s.key = child.key; if (siswaAktif(s)) mewakiliAttendanceSiswa.push(s); });
        db.ref('attendance').orderByChild('tanggal').equalTo(tanggal).once('value', snap2 => {
          snap2.forEach(child => { const a = child.val(); if (a.kelas === kelas) mewakiliAttendanceDraft = a.data || {}; });
          renderMewakiliAbsensi();
        }, () => renderMewakiliAbsensi());
      }, err => {
        document.getElementById('mewakiliAbsensiList').innerHTML = `<p style="color:#dc2626;text-align:center;padding:12px;">❌ Gagal memuat data siswa: ${escapeHtml(err.message)}</p>`;
      });
    }
    function renderMewakiliAbsensi() {
      const list = document.getElementById('mewakiliAbsensiList');
      if (!list) return;
      if (mewakiliAttendanceSiswa.length === 0) { list.innerHTML = `<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada siswa terdaftar di kelas ${escapeHtml(mewakiliAttendanceKelas || '')}.</p>`; return; }
      let html = attModeBarHtml('toggleMewakiliFast');
      if (attFastMode) html += attFastHtml(mewakiliAttendanceSiswa, '', { draft: mewakiliAttendanceDraft, fn: 'cycleMewakili', gid: 'mewFastGrid', sid: 'mewFastSummary' });
      else mewakiliAttendanceSiswa.forEach(s => {
        const status = mewakiliAttendanceDraft[s.key] || '', hasStatus = status !== '', bgColor = hasStatus ? '#eff6ff' : '#f9fafb';
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${bgColor};border-radius:8px;margin-bottom:4px;border:1px solid ${hasStatus ? '#e5e7eb' : '#f3f4f6'};flex-wrap:wrap;gap:4px;">
          <span><strong>${escapeHtml(s.name)}</strong></span>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">${['H','S','I','A'].map(st => `<button class="status-choice ${status===st?'selected':''} ${!hasStatus ? 'border-muted text-muted' : ''}" data-status="${st}" onclick="setMewakiliAbsensi('${s.key}','${st}')">${st}</button>`).join('')}${!hasStatus ? `<span class="text-muted" style="font-size:11px;margin-left:4px;">(belum)</span>` : ''}</div>
        </div>`;
      });
      html += `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-soft" style="padding:4px 12px;font-size:12px;" onclick="fillAllMewakiliAbsensi('H')">✅ Isi Semua Hadir</button></div>`;
      list.innerHTML = html;
    }
    function toggleMewakiliFast() { attFastMode = !attFastMode; renderMewakiliAbsensi(); }
    // Mode Cepat guru pengganti: ketuk nama = ganti status H -> A -> S -> I -> H (kotak & ringkasan diperbarui di tempat).
    function cycleMewakili(studentKey) {
      const sk = mewakiliAttendanceSiswa.find(x => x.key === studentKey);
      if (!sk) return;
      mewakiliAttendanceDraft[studentKey] = { H: 'A', A: 'S', S: 'I', I: 'H' }[mewakiliAttendanceDraft[studentKey] || ''] || 'H';
      const grid = document.getElementById('mewFastGrid');
      const chip = grid && grid.querySelector('[data-skey="' + CSS.escape(studentKey) + '"]');
      if (!chip) return renderMewakiliAbsensi();
      chip.setAttribute('style', attFastChipStyle(mewakiliAttendanceDraft[studentKey], ''));
      chip.innerHTML = attFastChipInner(sk, mewakiliAttendanceDraft);
      const sum = document.getElementById('mewFastSummary');
      if (sum) sum.innerHTML = attFastSummaryHtml(mewakiliAttendanceSiswa, mewakiliAttendanceDraft);
    }
    function setMewakiliAbsensi(studentKey, status) {
      if (mewakiliAttendanceDraft[studentKey] === status) delete mewakiliAttendanceDraft[studentKey];
      else mewakiliAttendanceDraft[studentKey] = status;
      renderMewakiliAbsensi();
    }
    function fillAllMewakiliAbsensi(status) {
      if (mewakiliAttendanceSiswa.length === 0) return;
      if (!confirm(`Isi semua siswa dengan status "${status}"?`)) return;
      mewakiliAttendanceSiswa.forEach(s => { mewakiliAttendanceDraft[s.key] = status; });
      renderMewakiliAbsensi();
    }
    function closeMewakiliAbsensiModal() { document.getElementById('mewakiliAbsensiModal').classList.remove('show'); }
    function simpanMewakiliAbsensi() {
      if (isBusy('simpanMewakiliAbsensi')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 2000);
      const kelas = mewakiliAttendanceKelas, tanggal = mewakiliAttendanceTanggal;
      if (!kelas || !tanggal) return;
      if (mewakiliAttendanceSiswa.length === 0) return toast('Tidak ada siswa untuk disimpan.', true);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Absensi guru pengganti butuh koneksi internet, coba lagi saat online.', true);
      const belumDiisi = mewakiliAttendanceSiswa.filter(s => !mewakiliAttendanceDraft[s.key]);
      if (belumDiisi.length > 0) { const namaBelum = belumDiisi.map(s => s.name).join(', '); if (!confirm(`⚠️ ${belumDiisi.length} siswa belum diisi: ${namaBelum}. Lanjutkan menyimpan?`)) return; }
      const btn = document.getElementById('btnSimpanMewakiliAbsensi');
      setBusy('simpanMewakiliAbsensi', btn);
      db.ref('attendance').orderByChild('tanggal').equalTo(tanggal).once('value', snap => {
        let existingKey = null;
        snap.forEach(child => { if (child.val().kelas === kelas) existingKey = child.key; });
        const ref = existingKey ? db.ref('attendance/' + existingKey) : db.ref('attendance').push();
        const data = { tanggal, kelas, guru: currentUser.name, guruKey: currentUser.key || null, data: mewakiliAttendanceDraft, tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString(), isiOlehGuruPengganti: true };
        ref.set(data, err => {
          clearBusy('simpanMewakiliAbsensi', btn);
          if (err) return toast('❌ Gagal: '+err.message, true);
          // Masukkan ke allAttendance di memori supaya VALIDASI D di saveJournal() langsung lolos
          // tanpa reload penuh -- reloadDataset('attendance') tidak cukup di sini karena query
          // attendance juga difilter ke currentUser.kelas, jadi kelas ini tidak akan ikut termuat
          // ulang lewat jalur biasa untuk guru pengganti ini.
          const key = existingKey || ref.key;
          const idx = allAttendance.findIndex(a => a.tanggal === tanggal && a.kelas === kelas);
          const record = { key, tanggal, kelas, guru: data.guru, guruKey: data.guruKey, data: data.data, tahunAjaran: data.tahunAjaran, updatedAt: data.updatedAt, isiOlehGuruPengganti: true };
          if (idx >= 0) allAttendance[idx] = record; else allAttendance.push(record);
          toastTersimpan(`Absensi kelas ${kelas}. Silakan simpan jurnal lagi.`);
          addLog('simpan_absensi', kelas + ' - ' + tanggal + ' (guru pengganti)');
          closeMewakiliAbsensiModal();
        });
      }, err => { clearBusy('simpanMewakiliAbsensi', btn); toast('❌ Gagal: '+err.message, true); });
    }

    // ============================================================
    // GRADES
    // ============================================================
    function loadGrades() {
      const filterKelas = document.getElementById('gradesClassFilter').value;
      if (!filterKelas) { document.getElementById('gradesContainer').innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">Silakan pilih kelas.</p>'; return; }
      renderGrades([filterKelas]);
    }
    function renderGrades(kelasList) {
      const container = document.getElementById('gradesContainer');
      if (!kelasList || kelasList.length === 0) { container.innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">Silakan pilih kelas.</p>'; return; }
      if (!kelasList.some(kelasDiizinkanNilai)) { container.innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">⛔ Anda tidak punya akses ke nilai kelas ini.</p>'; return; }
      if (!terapkanMapelGuru(kelasList[0])) { container.innerHTML = `<p class="text-muted" style="text-align:center;padding:12px;">Belum ada mata pelajaran Anda di Jadwal untuk kelas ${escapeHtml(kelasList[0])}. Hubungi Admin untuk melengkapi Jadwal.</p>`; return; }
      const siswa = allSiswa.filter(s => kelasList.includes(s.kelas) && kelasDiizinkanNilai(s.kelas));
      if (siswa.length === 0) { container.innerHTML = `<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada siswa di kelas ${escapeHtml(kelasList.join(', '))}.</p>`; return; }
      const subject = document.getElementById('gradeSubject').value, semester = document.getElementById('gradeSemester').value;
      const filteredGrades = allGrades.filter(g => g.subject === subject && g.semester === semester);
      const bolehBukaKunci = kelasList.some(bolehBukaKunciNilai);
      const catatanKunci = (canEdit() && !isKepsek())
        ? `<p class="text-muted" style="font-size:.85rem;margin:0 0 8px;">🔒 Nilai yang sudah tersimpan terkunci. Isi kolom berikutnya secara bertahap (NH1 → NH2 → NH3 → MID → PAS).${bolehBukaKunci ? ' Anda dapat mengoreksi nilai terkunci di kelas ini (Admin/Wali Kelas); setiap koreksi dicatat di log.' : ' Untuk koreksi, hubungi Wali Kelas atau Admin.'}</p>` : '';
      let html = catatanKunci + `<div style="overflow-x:auto;"><table><thead><tr><th>Nama</th><th>NH1</th><th>NH2</th><th>NH3</th><th>MID</th><th>PAS</th><th>Rapor</th></tr></thead><tbody>`;
      siswa.forEach(s => {
        const grade = filteredGrades.find(g => g.siswaKey === s.key) || {};
        const data = grade.data || {};
        // OPTIMISTIC LOCKING: gradeKey & version "dibawa" via data-attribute pada tiap input,
        // merekam persis versi data yang guru LIHAT sekarang. Saat Simpan, versi ini dibandingkan
        // lagi dengan versi TERBARU di server (lihat saveGrades()) -- kalau sudah berubah artinya
        // ada guru lain yang menyimpan lebih dulu, dan penyimpanan versi ini DIBATALKAN alih-alih
        // menimpa. Ini mencegah race condition "guru A tidak sadar menghapus perubahan guru B"
        // saat berdua kebetulan mengedit mapel & kelas yang sama secara bersamaan.
        const gradeKey = grade.key || '';
        const gradeVersion = grade.version || 0;
        const disabled = canEdit() && !isKepsek() ? '' : 'disabled';
        const bolehBukaS = bolehBukaKunciNilai(s.kelas);
        html += `<tr><td style="font-weight:600;">${escapeHtml(s.name)}</td>`;
        ['h1','h2','h3','mid','pas'].forEach(key => {
          const terisi = nilaiTerkunci(data[key]);
          const kunci = terisi && !bolehBukaS;
          const attrDis = disabled || (kunci ? 'disabled' : '');
          const gaya = kunci ? 'background:#f3f4f6;color:#6b7280;' : (terisi && bolehBukaS ? 'border-color:#d97706;' : '');
          const judul = kunci ? 'Terkunci. Hubungi Admin untuk koreksi.' : (terisi && bolehBukaS ? 'Nilai terkunci: koreksi Anda akan dicatat di log.' : '');
          html += `<td style="white-space:nowrap;"><input class="field grade-input" type="number" min="0" max="100" step="any" inputmode="decimal" style="width:70px;padding:4px 8px;${gaya}" title="${judul}" data-siswa="${s.key}" data-key="${key}" data-gradekey="${escapeHtml(gradeKey)}" data-version="${gradeVersion}" data-terkunci="${terisi ? '1' : ''}" data-lama="${escapeHtml(nilaiTampilInput(data[key]))}" value="${escapeHtml(nilaiTampilInput(data[key]))}" ${attrDis}>${kunci ? '<span title="Terkunci" style="font-size:.75rem;margin-left:2px;">🔒</span>' : ''}</td>`;
        });
        const rapor = calculateRapor(data);
        html += `<td style="font-weight:700;color:#059669;">${rapor}</td></tr>`;
      });
      html += '</tbody></table></div>';
      if (canEdit() && !isKepsek()) { html += `<button id="btnSaveGrades" class="btn btn-success" style="margin-top:12px;" onclick="saveGrades()">💾 Simpan Nilai</button>`; }
      if (typeof isAdmin === 'function' && isAdmin()) { html += `<button class="btn" style="margin-top:12px;margin-left:8px;" onclick="cekDataNilaiLama()">🔎 Cek Data Nilai Lama</button>`; }
      container.innerHTML = html;
    }
    // Nilai dianggap "sudah terisi & terkunci" bila angka valid 0-100. Teks tak valid / di luar rentang
    // (data lama bermasalah) TIDAK dikunci, supaya guru masih bisa mengisinya ulang dengan benar.
    function nilaiTerkunci(v) {
      const n = nilaiAngka(v);
      return n !== null && n >= 0 && n <= 100;
    }
    // Kebijakan akses nilai per kelas.
    // - Lihat/isi: Admin & Kepsek semua kelas; Guru/Wali hanya kelas yang diajar ATAU diwali-i (loaderScopeKelas()).
    // - Buka kunci / koreksi nilai terkunci: Admin (semua kelas) dan Wali Kelas (hanya KELAS YANG DIA WALI-I).
    function kelasDiizinkanNilai(kelas) {
      if (isAdmin() || isKepsek()) return true;
      return loaderScopeKelas().includes(kelas);
    }
    function bolehBukaKunciNilai(kelas) {
      if (isAdmin()) return true;
      return !!(typeof isWaliKelasAssigned === 'function' && isWaliKelasAssigned() && currentUser.waliKelasOf === kelas);
    }
    // Kebijakan MAPEL per guru (sumber: Jadwal -> kelas + mapel yang tercatat untuk guru itu).
    // - Admin & Kepsek: semua mapel. Wali Kelas: semua mapel di KELAS YANG DIA WALI-I.
    // - Guru lain / Wali Kelas di kelas ajar non-walinya: hanya mapel yang ada di Jadwal-nya untuk kelas tsb.
    // Mengembalikan null (= semua mapel) atau Set nama mapel ternormalisasi.
    function normMapel(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }
    function mapelGuruUntukKelas(kelas) {
      if (isAdmin() || isKepsek()) return null;
      if (typeof isWaliKelasAssigned === 'function' && isWaliKelasAssigned() && currentUser.waliKelasOf === kelas) return null;
      const saya = j => j.guruKey ? j.guruKey === currentUser.key : samaNamaGuru(j.guru, currentUser.name);
      const set = new Set();
      (allJadwal || []).forEach(j => { if (j && j.kelas === kelas && j.mapel && saya(j)) set.add(normMapel(j.mapel)); });
      return set;
    }
    function mapelDiizinkanNilai(kelas, subject) {
      const boleh = mapelGuruUntukKelas(kelas);
      return boleh === null || boleh.has(normMapel(subject));
    }
    // Daftar mapel lengkap (HTML asli <select id="gradeSubject">) disimpan sekali sebelum disaring.
    function daftarMapelNilaiAsli() {
      const sel = document.getElementById('gradeSubject');
      if (!sel) return '';
      if (window._gradeSubjectAsli === undefined) window._gradeSubjectAsli = sel.innerHTML;
      return window._gradeSubjectAsli;
    }
    // Saring pilihan mapel sesuai Jadwal guru untuk kelas ini. false = tidak ada mapel yang boleh.
    function terapkanMapelGuru(kelas) {
      const sel = document.getElementById('gradeSubject');
      if (!sel) return true;
      const asli = daftarMapelNilaiAsli();
      const prev = sel.value;
      const boleh = mapelGuruUntukKelas(kelas);
      sel.innerHTML = asli;
      if (boleh !== null) {
        Array.from(sel.querySelectorAll('option')).forEach(o => { if (!boleh.has(normMapel(o.value))) o.remove(); });
        Array.from(sel.querySelectorAll('optgroup')).forEach(g => { if (!g.querySelector('option')) g.remove(); });
      }
      const ada = Array.from(sel.options).map(o => o.value);
      if (ada.length === 0) return false;
      sel.value = ada.includes(prev) ? prev : ada[0];
      return true;
    }
    // Isi kotak angka dari data lama: "85,5" -> "85.5"; teks tak valid -> kosong (dilaporkan oleh cekDataNilaiLama).
    function nilaiTampilInput(v) {
      const n = nilaiAngka(v);
      return n === null ? '' : String(n);
    }
    // Pindai nilai bermasalah. Murni (tanpa DOM) supaya mudah diuji.
    // Jenis: 'koma' (85,5 - masih terbaca benar), 'bukan_angka' (abc), 'di_luar_rentang' (<0 atau >100).
    function pindaiNilaiBermasalah(grades) {
      const hasil = [];
      (grades || []).forEach(g => {
        const d = g && g.data ? g.data : {};
        ['h1','h2','h3','mid','pas'].forEach(f => {
          const raw = d[f];
          if (raw === undefined || raw === null || String(raw).trim() === '') return;
          const t = String(raw).trim();
          const n = nilaiAngka(t);
          let jenis = '';
          if (n === null) jenis = 'bukan_angka';
          else if (n < 0 || n > 100) jenis = 'di_luar_rentang';
          else if (t.indexOf(',') >= 0) jenis = 'koma';
          if (jenis) hasil.push({ siswa: g.siswaName || g.siswaKey || '-', kelas: g.kelas || '-', subject: g.subject || '-', semester: g.semester || '-', field: f.toUpperCase(), nilai: t, jenis });
        });
      });
      return hasil;
    }
    function cekDataNilaiLama() {
      const hasil = pindaiNilaiBermasalah(allGrades);
      const label = { koma: 'Koma desimal (terbaca benar)', bukan_angka: 'Bukan angka (dihitung 0)', di_luar_rentang: 'Di luar 0-100' };
      const hitung = { koma: 0, bukan_angka: 0, di_luar_rentang: 0 };
      hasil.forEach(h => hitung[h.jenis]++);
      let html = `<h3 style="margin:0 0 8px;">Cek Data Nilai Lama (TA ${escapeHtml(String(currentTahunAjaran || ''))})</h3>`;
      html += `<p style="margin:0 0 8px;">${allGrades.length} catatan nilai diperiksa.</p>`;
      if (hasil.length === 0) {
        html += '<p style="color:#059669;font-weight:600;">✅ Tidak ada nilai bermasalah.</p>';
      } else {
        html += `<p>Ditemukan <b>${hasil.length}</b> nilai bermasalah: ${hitung.koma} koma, ${hitung.bukan_angka} bukan angka, ${hitung.di_luar_rentang} di luar 0-100.</p>`;
        html += '<p style="font-size:.85rem;">Koma otomatis tampil sebagai titik di kotak nilai. Dua jenis lainnya perlu diisi ulang oleh guru yang bersangkutan, lalu Simpan.</p>';
        html += '<div style="overflow:auto;max-height:50vh;"><table><thead><tr><th>Siswa</th><th>Kelas</th><th>Mapel</th><th>Smt</th><th>Kolom</th><th>Isi</th><th>Masalah</th></tr></thead><tbody>';
        hasil.slice(0, 300).forEach(h => {
          html += `<tr><td>${escapeHtml(h.siswa)}</td><td>${escapeHtml(h.kelas)}</td><td>${escapeHtml(h.subject)}</td><td>${escapeHtml(h.semester)}</td><td>${h.field}</td><td>${escapeHtml(h.nilai)}</td><td>${label[h.jenis]}</td></tr>`;
        });
        html += '</tbody></table></div>';
        if (hasil.length > 300) html += `<p style="font-size:.85rem;">Menampilkan 300 baris pertama dari ${hasil.length}.</p>`;
      }
      // Kecocokan nama mapel di Jadwal dengan daftar mapel Input Nilai (penting: pembatasan mapel guru memakai Jadwal).
      try {
        const tmp = document.createElement('select'); tmp.innerHTML = daftarMapelNilaiAsli();
        const std = new Set(Array.from(tmp.options).map(o => normMapel(o.value)));
        const tdkCocok = {};
        (allJadwal || []).forEach(j => { if (j && j.mapel && !std.has(normMapel(j.mapel))) { const k = String(j.mapel).trim(); (tdkCocok[k] = tdkCocok[k] || new Set()).add(j.guru || '-'); } });
        const nama = Object.keys(tdkCocok);
        html += '<hr style="margin:12px 0;"><h3 style="margin:0 0 8px;">Mapel di Jadwal vs daftar mapel Nilai</h3>';
        if (nama.length === 0) html += '<p style="color:#059669;font-weight:600;">✅ Semua mapel di Jadwal cocok dengan daftar mapel Input Nilai.</p>';
        else {
          html += '<p style="font-size:.85rem;">Mapel berikut ada di Jadwal tetapi TIDAK ada di daftar mapel Input Nilai, sehingga guru terkait tidak bisa memilihnya. Samakan penulisannya di Jadwal:</p><ul>';
          nama.slice(0, 40).forEach(n => { html += `<li><b>${escapeHtml(n)}</b> - ${escapeHtml(Array.from(tdkCocok[n]).join(', '))}</li>`; });
          html += '</ul>';
        }
      } catch (e) { console.warn('[SI MAMBA] cek mapel Jadwal gagal:', e); }
      const lama = document.getElementById('cekNilaiLamaOverlay'); if (lama) lama.remove();
      const ov = document.createElement('div');
      ov.id = 'cekNilaiLamaOverlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:12px;';
      ov.innerHTML = `<div style="background:#fff;color:#111;border-radius:12px;padding:16px;max-width:760px;width:100%;max-height:90vh;overflow:auto;">${html}<button class="btn" style="margin-top:12px;" onclick="document.getElementById('cekNilaiLamaOverlay').remove()">Tutup</button></div>`;
      document.body.appendChild(ov);
    }
    // Ubah isi kotak nilai jadi angka; kosong / bukan angka -> null. Koma desimal ("85,5") diterima.
    function nilaiAngka(v) {
      if (v === undefined || v === null) return null;
      const t = String(v).trim().replace(',', '.');
      if (t === '') return null;
      const n = Number(t);
      return isFinite(n) ? n : null;
    }
    // NH yang KOSONG dilewati dari rata-rata (dibagi jumlah NH yang terisi), bukan dihitung 0.
    // MID/PAS kosong tetap dihitung 0 (komponen wajib; rapor memang belum lengkap sampai diisi).
    function calculateRapor(data) {
      data = data || {};
      const nh = [data.h1, data.h2, data.h3].map(nilaiAngka).filter(n => n !== null);
      const daily = nh.length ? nh.reduce((a, b) => a + b, 0) / nh.length : 0;
      const mid = nilaiAngka(data.mid) || 0, pas = nilaiAngka(data.pas) || 0;
      return Math.round(daily*0.4 + mid*0.3 + pas*0.3);
    }
    function saveGrades() {
      if (!canEdit() || isKepsek()) return toast('Tidak bisa menyimpan!', true);
      if (isBusy('saveGrades')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 2000);
      const subject = document.getElementById('gradeSubject').value, semester = document.getElementById('gradeSemester').value;
      const inputs = document.querySelectorAll('.grade-input');
      const gradeMap = {};
      const koreksiDisimpan = [];
      // Validasi: nilai harus angka 0-100 (kosong boleh).
      for (const inp of inputs) {
        if (inp.validity && inp.validity.badInput) { inp.focus(); return toast('⚠️ Nilai harus angka 0-100. Periksa kotak yang diberi fokus.', true, 5000); }
        const raw = String(inp.value || '').trim();
        if (raw === '') continue;
        const n = nilaiAngka(raw);
        if (n === null || n < 0 || n > 100) {
          inp.focus();
          return toast('⚠️ Nilai harus angka 0-100. Periksa kotak yang diberi fokus.', true, 5000);
        }
      }
      // gradeKey & version diambil dari data-attribute yang di-render di renderGrades() --
      // itu persis versi data yang guru lihat/edit sekarang di layar (baseline).
      inputs.forEach(inp => {
        const key = inp.dataset.siswa;
        if (!gradeMap[key]) gradeMap[key] = { data: {}, koreksi: [], gradeKey: inp.dataset.gradekey || '', baseVersion: parseInt(inp.dataset.version, 10) || 0 };
        gradeMap[key].data[inp.dataset.key] = inp.value;
        // Catat perubahan pada kolom yang tadinya terkunci (hanya mungkin dilakukan Admin; kotak guru disabled).
        if (inp.dataset.terkunci === '1' && nilaiAngka(inp.dataset.lama) !== nilaiAngka(inp.value)) {
          gradeMap[key].koreksi.push({ field: inp.dataset.key.toUpperCase(), lama: inp.dataset.lama, baru: String(inp.value || '').trim() === '' ? '(kosong)' : inp.value });
        }
      });
      // Batasi ke kelas yang diizinkan (jaga-jaga bila DOM diutak-atik / kelas tidak termasuk scope).
      let ditolakScope = 0;
      Object.keys(gradeMap).forEach(k => {
        const sw = allSiswa.find(x => x.key === k);
        if (!sw || !kelasDiizinkanNilai(sw.kelas) || !mapelDiizinkanNilai(sw.kelas, subject)) { delete gradeMap[k]; ditolakScope++; }
      });
      if (ditolakScope > 0 && Object.keys(gradeMap).length === 0) return toast('⛔ Anda tidak punya akses menyimpan nilai kelas/mapel ini (sesuai Jadwal).', true);
      // Jangan membuat record baru untuk siswa yang SEMUA kotaknya masih kosong (sebelumnya tiap Simpan
      // membuat record kosong untuk seluruh siswa di kelas). Record yang sudah ada tetap disimpan,
      // supaya guru masih bisa mengosongkan nilai.
      Object.keys(gradeMap).forEach(k => {
        const g = gradeMap[k];
        if (!g.gradeKey && Object.values(g.data).every(v => String(v || '').trim() === '')) delete gradeMap[k];
      });
      let total = Object.keys(gradeMap).length;
      if (total === 0) return toast('Belum ada nilai yang diisi.', true);
      // Konfirmasi koreksi nilai terkunci (hanya mungkin muncul bila kotaknya terbuka: Admin / Wali Kelas kelasnya).
      {
        const baris = [];
        Object.keys(gradeMap).forEach(k => {
          const sw = allSiswa.find(x => x.key === k);
          (gradeMap[k].koreksi || []).forEach(c => baris.push(`${sw ? sw.name : k} - ${c.field}: ${c.lama} → ${c.baru}`));
        });
        if (baris.length > 0) {
          const tampil = baris.slice(0, 15).join('\n') + (baris.length > 15 ? `\n... dan ${baris.length - 15} lainnya` : '');
          if (!window.confirm(`Anda akan MENGUBAH ${baris.length} nilai yang sudah terkunci:\n\n${tampil}\n\nPerubahan dicatat di log. Lanjutkan?`)) return;
        }
      }
      const btnSave = document.getElementById('btnSaveGrades');
      setBusy('saveGrades', btnSave);
      if (btnSave) btnSave.textContent = '⏳ Menyimpan...';
      const nowIso = new Date().toISOString();
      const entries = Object.entries(gradeMap).map(([siswaKey, entry]) => {
        const siswa = allSiswa.find(s => s.key === siswaKey);
        return { siswaKey, siswa, siswaName: siswa ? siswa.name : siswaKey, ...entry };
      });
      // ===== OPTIMISTIC LOCKING, versi batch =====
      // Sebelumnya: 1 transaction() per siswa (30 siswa = 30 round-trip + retry). Sekarang:
      //  1) baca versi TERBARU semua record yang sudah ada secara paralel (satu koneksi, payload kecil),
      //  2) siswa yang versinya berbeda dari baseVersion (diubah guru lain / sudah dihapus) DIKELUARKAN dari
      //     batch & dilaporkan sebagai bentrok -- perilaku per-siswa tetap sama seperti sebelumnya,
      //  3) sisanya ditulis SEKALIGUS lewat 1 update() multi-path (atomik: semua tersimpan atau tidak sama sekali).
      // Catatan: pengecekan (1) dan penulisan (3) tidak atomik satu sama lain -- celahnya hanya beberapa ms.
      // Untuk jaminan keras, tambahkan .validate pada rules `grades/$id` (lihat catatan di balasan).
      Promise.all(entries.map(e => e.gradeKey
        ? db.ref('grades/' + e.gradeKey).once('value').then(s => ({ e, cur: s.val() }))
        : Promise.resolve({ e, cur: undefined })
      )).then(results => {
        const updates = {}, conflictNames = [];
        let savedCount = 0;
        results.forEach(({ e, cur }) => {
          if (e.gradeKey) {
            if (cur === null || (cur.version || 0) !== e.baseVersion) { conflictNames.push(e.siswaName); return; }
            // Penjaga sisi aplikasi: selain Admin, kolom yang SUDAH terisi di server tidak boleh berubah.
            if (!bolehBukaKunciNilai(e.siswa ? e.siswa.kelas : '')) {
              ['h1','h2','h3','mid','pas'].forEach(f => { if (cur.data && nilaiTerkunci(cur.data[f])) e.data[f] = cur.data[f]; });
            } else {
              (e.koreksi || []).forEach(c => koreksiDisimpan.push({ ...c, siswaName: e.siswaName }));
            }
            const p = 'grades/' + e.gradeKey + '/';
            updates[p + 'data'] = e.data;
            updates[p + 'guru'] = currentUser.name;
            updates[p + 'updatedAt'] = nowIso;
            updates[p + 'version'] = (cur.version || 0) + 1;
          } else {
            const newKey = db.ref('grades').push().key;
            updates['grades/' + newKey] = { siswaKey: e.siswaKey, siswaName: e.siswaName, kelas: e.siswa ? e.siswa.kelas : '', subject, semester, guru: currentUser.name, guruKey: currentUser.key, data: e.data, tahunAjaran: currentTahunAjaran, updatedAt: nowIso, version: 1 };
          }
          savedCount++;
        });
        // Sesi tulis untuk Rules v2: Admin -> sesi_admin, Guru -> sesi_guru (sama seperti perangkat-rpe.js).
        const siapTulis = (typeof isAdmin === 'function' && isAdmin())
          ? ((typeof window.kredAdminSiap === 'function') ? window.kredAdminSiap() : Promise.resolve(true))
          : ((typeof window.kredGuruSiap === 'function') ? window.kredGuruSiap() : Promise.resolve(true));
        const tulis = savedCount > 0 ? siapTulis.then(() => db.ref().update(updates)) : Promise.resolve();
        return tulis.then(() => ({ savedCount, conflictNames }));
      }).then(({ savedCount, conflictNames }) => {
        clearBusy('saveGrades', btnSave);
        if (conflictNames.length === 0) {
          toastTersimpan();
        } else {
          let msg = `✅ ${savedCount} nilai tersimpan.`;
          msg += ` ⚠️ ${conflictNames.length} nilai (${conflictNames.join(', ')}) TIDAK disimpan karena sudah diubah guru lain terlebih dahulu -- silakan cek ulang & simpan lagi untuk siswa tersebut.`;
          toast(msg, true, 8000);
        }
        if (savedCount > 0) addLog('simpan_nilai', subject + ' - ' + semester);
        koreksiDisimpan.forEach(c => addLog('koreksi_nilai', `${subject} ${semester} | ${c.siswaName} ${c.field}: ${c.lama} → ${c.baru}`));
        reloadDataset('grades');
      }).catch(err => {
        clearBusy('saveGrades', btnSave);
        if (btnSave) btnSave.textContent = '💾 Simpan Nilai';
        console.error('[SI MAMBA] Gagal simpan nilai (batch):', err);
        toast('❌ Nilai GAGAL disimpan (error jaringan/server): ' + (err && err.message ? err.message : err) + '. Tidak ada nilai yang tersimpan -- coba lagi.', true, 8000);
      });
    }

    // ============================================================
    // JURNAL
    // ============================================================
    function setJournalFilter(mode) {
      // Filter tampilan Riwayat Jurnal khusus role Guru/Wali Kelas: "Jurnal Saya" (default,
      // supaya tidak tercampur jurnal guru lain di kelas yang sama) vs "Semua Guru".
      journalFilterMode = mode;
      journalPage = 1;
      renderJournals();
    }
    const JOURNAL_ACTIVITY_MAX_LEN = 500;
    // Minimal 4 kata + wajib memuat 1 kata kerja -- menggantikan validasi lama yang cuma
    // mengandalkan jumlah karakter (20 karakter bisa saja diisi "aaaaaaaaaaaaaaaaaaaa" atau
    // sekadar nama topik tanpa menjelaskan APA yang dilakukan guru). Dengan aturan baru, guru
    // dipaksa menulis minimal 1 kata kerja aktif (menjelaskan, melatih, dst) supaya jurnal
    // benar-benar menggambarkan kegiatan, bukan cuma label materi.
    const JOURNAL_ACTIVITY_MIN_WORDS = 4;
    // Daftar kata kerja/aktivitas yang umum dipakai guru saat mengisi jurnal mengajar. Ini
    // BUKAN kamus linguistik lengkap -- cuma daftar praktis yang mencakup kegiatan yang lazim
    // ditulis (menjelaskan, melatih, praktik, diskusi, dst). Kalau ada kata kerja wajar yang
    // guru pakai tapi belum masuk daftar ini dan tetap tertolak, tambahkan saja ke sini.
    const JOURNAL_VERB_WHITELIST = new Set([
      'menjelaskan','mengajarkan','mengajar','melatih','membimbing','mendampingi','memandu',
      'mendiskusikan','berdiskusi','diskusi','mempraktikkan','mempraktekkan','mempraktikan',
      'praktik','praktek','menugaskan','mengevaluasi','evaluasi','menilai','mengoreksi',
      'membahas','mengulas','mereview','review','memperkenalkan','mengenalkan',
      'mendemonstrasikan','menerangkan','mencontohkan','mengajak','mengarahkan',
      'memfasilitasi','mengecek','memeriksa','mengulang','mengulangi','menyimak',
      'membacakan','mendiktekan','mengetes','menguji','tes','kuis','ulangan','mengadakan',
      'melaksanakan','menyampaikan','mendalami','memperdalam','berlatih','latihan',
      'bercerita','menceritakan','menyanyikan','bernyanyi','menghafal','menghafalkan',
      'murojaah',"muroja'ah",'mewarnai','mendongeng','menulis','membaca','menggambar',
      'menghitung','berhitung','memberikan','memberi','mengamati','mengobservasi',
      'observasi','mensimulasikan','menyimulasikan','simulasi','mempresentasikan',
      'presentasi','melakukan','menonton','memutar','mendengarkan','merangkum',
      'menyimpulkan','memperagakan','belajar','mempelajari','mengerjakan','membuat',
      'menyusun','memainkan','bermain','merangkai','mengembangkan','menerapkan'
    ]);
    // Kata yang KEBETULAN berawalan "me"/"ber" tapi BUKAN kata kerja aktivitas pembelajaran --
    // supaya tidak salah lolos lewat aturan cadangan di bawah (mis. "mereka" = kata ganti,
    // "meja"/"media" = kata benda).
    const JOURNAL_VERB_PREFIX_BLACKLIST = new Set([
      'mereka','meski','meskipun','media','meja','mesin','meter','menit','merah','mental',
      'metode','materi','mewah','medali','merdeka','memori','mentor','menara','merek',
      'berikut','berupa','berarti','bersama','berbagai','beberapa','bersih'
    ]);
    function journalPecahKata(text) {
      return (text || '').trim().split(/\s+/).filter(Boolean);
    }
    function journalPunyaKataKerja(kataList) {
      return kataList.some(k => {
        const kata = k.toLowerCase().replace(/[^a-z']/g, '');
        if (!kata) return false;
        if (JOURNAL_VERB_WHITELIST.has(kata)) return true;
        if (JOURNAL_VERB_PREFIX_BLACKLIST.has(kata)) return false;
        // Cadangan: kata cukup panjang & berawalan me-/ber- (ciri khas kata kerja aktif
        // Bahasa Indonesia) supaya kata kerja wajar yang belum ada di whitelist tetap lolos.
        return kata.length >= 6 && /^(me|ber)/.test(kata);
      });
    }
    function updateJournalActivityCounter() {
      // Penghitung karakter live untuk field "Kegiatan Pembelajaran" -- dipanggil lewat
      // oninput saat guru mengetik, dan juga dipanggil manual di tiap tempat yang mengisi
      // value textarea ini lewat JS (edit jurnal, reset form, dst) karena set .value lewat
      // JS tidak memicu event 'input' secara otomatis.
      //
      // SENGAJA TIDAK pakai atribut HTML maxlength: kalau dibatasi keras saat mengetik,
      // begitu tembus batas, huruf berikutnya langsung ditolak browser di tengah kata --
      // kalimat bisa terpotong ganjil tanpa guru sadar. Jadi guru dibiarkan menulis sampai
      // selesai, counter cuma memberi peringatan visual, dan baru benar-benar ditolak
      // (dengan pesan jelas) saat klik Simpan lewat validasi di saveJournal() -- supaya
      // guru bisa lihat teks utuh dan memilih sendiri bagian mana yang mau dipangkas.
      const el = document.getElementById('journalActivity'), counter = document.getElementById('journalActivityCounter');
      if (!el || !counter) return;
      const len = el.value.length, over = len - JOURNAL_ACTIVITY_MAX_LEN;
      const kataList = journalPecahKata(el.value);
      const kurangKata = kataList.length < JOURNAL_ACTIVITY_MIN_WORDS;
      const belumAdaKerja = !kurangKata && !journalPunyaKataKerja(kataList);
      if (over > 0) { counter.textContent = `${len}/${JOURNAL_ACTIVITY_MAX_LEN} (kelebihan ${over} karakter)`; counter.classList.remove('text-muted'); counter.style.color = '#dc2626'; counter.style.fontWeight = '700'; }
      else if (len > 0 && kurangKata) { counter.textContent = `${kataList.length} kata (minimal ${JOURNAL_ACTIVITY_MIN_WORDS} kata + 1 kata kerja, mis. "menjelaskan")`; counter.classList.remove('text-muted'); counter.style.color = '#d97706'; counter.style.fontWeight = '700'; }
      else if (len > 0 && belumAdaKerja) { counter.textContent = `⚠️ Belum ada kata kerja (mis. "menjelaskan", "melatih", "membimbing")`; counter.classList.remove('text-muted'); counter.style.color = '#d97706'; counter.style.fontWeight = '700'; }
      else if (len >= JOURNAL_ACTIVITY_MAX_LEN * 0.9) { counter.textContent = `${len}/${JOURNAL_ACTIVITY_MAX_LEN}`; counter.style.fontWeight = '400'; counter.classList.remove('text-muted'); counter.style.color = '#d97706'; }
      else { counter.textContent = `${len}/${JOURNAL_ACTIVITY_MAX_LEN}`; counter.style.fontWeight = '400'; counter.style.color = ''; counter.classList.add('text-muted'); }
    }
    // allJournals DIUBAH di tempat di beberapa tempat (push/splice/ganti elemen: antrean offline, simpan, susulan,
    // sinkron). Karena itu cache urutan dikunci oleh referensi + panjang + _journalRev; setiap titik mutasi
    // memanggil bumpJournalRev(). Tanggal berformat ISO (YYYY-MM-DD) -> cukup dibandingkan sebagai string.
    let _journalRev = 0, _jSortedSrc = null, _jSortedLen = -1, _jSortedRev = -1, _jSorted = [];
    function bumpJournalRev() { _journalRev++; scheduleStatusBarRefresh(); }
    // Revisi absen guru: allTeacherAttendance di-push di tempat (absen datang/pulang, izin/sakit).
    let _taRev = 0;
    function bumpTaRev() { _taRev++; scheduleStatusBarRefresh(); }
    // Cache hasil filter "jurnal & absen guru SAYA hari ini" -- sebelumnya dihitung ulang dari seluruh
    // allJournals/allTeacherAttendance di setiap tick status bar & pengingat. Kunci cache: tanggal + user +
    // referensi array + panjang + revisi (naik tiap ada mutasi di tempat). Array hasil JANGAN dimutasi pemanggil.
    const _myToday = { day: '', uid: null, jSrc: null, jLen: -1, jRev: -1, jVal: [], aSrc: null, aLen: -1, aRev: -1, aVal: [] };
    function _punyaUser(x, u) { return x.guruKey ? x.guruKey === (u && u.key) : x.guru === (u && u.name); }
    function _myTodayReset(today) {
      const u = currentUser, uid = u ? (u.key || u.name) : null;
      if (_myToday.day !== today || _myToday.uid !== uid) { _myToday.day = today; _myToday.uid = uid; _myToday.jSrc = null; _myToday.aSrc = null; }
      return u;
    }
    function getJurnalSayaHariIni(today) {
      const u = _myTodayReset(today), c = _myToday;
      if (c.jSrc !== allJournals || c.jLen !== allJournals.length || c.jRev !== _journalRev) {
        c.jSrc = allJournals; c.jLen = allJournals.length; c.jRev = _journalRev;
        c.jVal = allJournals.filter(j => j.tanggal === today && _punyaUser(j, u));
      }
      return c.jVal;
    }
    function getAbsenGuruSayaHariIni(today) {
      const u = _myTodayReset(today), c = _myToday;
      if (c.aSrc !== allTeacherAttendance || c.aLen !== allTeacherAttendance.length || c.aRev !== _taRev) {
        c.aSrc = allTeacherAttendance; c.aLen = allTeacherAttendance.length; c.aRev = _taRev;
        c.aVal = allTeacherAttendance.filter(a => a.tanggal === today && _punyaUser(a, u));
      }
      return c.aVal;
    }
    function getJurnalTerurut() {
      if (_jSortedSrc !== allJournals || _jSortedLen !== allJournals.length || _jSortedRev !== _journalRev) {
        _jSortedSrc = allJournals; _jSortedLen = allJournals.length; _jSortedRev = _journalRev;
        _jSorted = allJournals.slice().sort((a, b) => {
          const ta = a.tanggal || '', tb = b.tanggal || '';
          return ta === tb ? (b.jam_ke || 0) - (a.jam_ke || 0) : (ta < tb ? 1 : -1);
        });
      }
      return _jSorted;
    }
    function renderJournals() {
      const list = document.getElementById('journalList');
      const isGuruRole = !isAdmin() && !isKepsek();
      const sortedAll = getJurnalTerurut();
      // Guru/Wali Kelas: default hanya tampilkan jurnal miliknya sendiri -- riwayat sebelumnya
      // mencampur SEMUA guru yang mengajar di kelas yang sama, jadi jurnal sendiri "tenggelam"
      // di antara jurnal guru lain. Admin/Kepsek tetap melihat semua seperti biasa.
      const sorted = (isGuruRole && journalFilterMode === 'mine')
        ? sortedAll.filter(j => (j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name))
        : sortedAll;
      const showOwnerBadge = !(isGuruRole && journalFilterMode === 'mine');

      const filterBarHtml = isGuruRole ? `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button class="btn ${journalFilterMode==='mine' ? 'btn-primary' : 'btn-soft'}" style="padding:5px 16px;font-size:12px;" onclick="setJournalFilter('mine')">👤 Jurnal Saya</button>
        <button class="btn ${journalFilterMode==='all' ? 'btn-primary' : 'btn-soft'}" style="padding:5px 16px;font-size:12px;" onclick="setJournalFilter('all')">👥 Semua Guru (kelas saya)</button>
      </div>` : '';

      if (sorted.length === 0) {
        list.innerHTML = filterBarHtml + `<p class="text-muted">${(isGuruRole && journalFilterMode === 'mine') ? 'Anda belum punya jurnal. Coba lihat "Semua Guru" kalau mau cek jurnal rekan di kelas yang sama.' : 'Belum ada jurnal.'}</p>`;
        document.getElementById('journalPagination').innerHTML = '';
        return;
      }
      const totalItems = sorted.length, ps = pagerSize('journal') || totalItems, totalPages = Math.max(1, Math.ceil(totalItems/ps));
      if (journalPage > totalPages) journalPage = totalPages; if (journalPage < 1) journalPage = 1;
      const start = (journalPage-1)*ps, end = Math.min(start+ps, totalItems), pageItems = sorted.slice(start,end);

      // Kelompokkan entri dalam 1 halaman berdasarkan tanggal, supaya tanggal tidak diulang-ulang
      // di tiap kartu seperti sebelumnya -- cukup 1 header tanggal per hari. Aman dikelompokkan
      // dalam 1 pass karena pageItems sudah terurut tanggal terbaru -> terlama.
      const groups = [];
      pageItems.forEach(j => {
        let g = groups[groups.length-1];
        if (!g || g.tanggal !== j.tanggal) { g = { tanggal: j.tanggal, items: [] }; groups.push(g); }
        g.items.push(j);
      });
      const hariNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const formatTanggalPanjang = tgl => { const d = new Date(tgl + 'T00:00:00'); return isNaN(d) ? tgl : `${hariNames[d.getDay()]}, ${d.getDate()} ${bulanNames[d.getMonth()]} ${d.getFullYear()}`; };

      let html = filterBarHtml;
      groups.forEach(g => {
        html += `<div style="display:flex;align-items:center;gap:8px;margin:16px 0 6px;">
          <span class="text-strong" style="font-weight:700;font-size:13px;white-space:nowrap;">📅 ${formatTanggalPanjang(g.tanggal)}</span>
          <span class="text-muted" style="font-size:11px;white-space:nowrap;">(${g.items.length} jurnal)</span>
          <span style="flex:1;border-bottom:1px dashed #e5e7eb;"></span>
        </div>`;
        g.items.forEach(j => {
          const isOwn = (j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name), borderColor = j.pendingSync ? '#d97706' : (isOwn ? '#059669' : '#6b7280'), bgColor = j.pendingSync ? '#fffbeb' : (isOwn ? '#f0fdf4' : '#f9fafb'), label = isOwn ? '✅ Saya' : '📌 Guru Lain', typeLabel = j.type || 'Reguler', isExtra = isJamEkstra(j.jam_ke), extraBadge = isExtra ? '⭐ Ekstra' : '', isTahfidz = j.subject === 'Tahfidzul Quran', tahfidzBadge = isTahfidz ? '<span class="badge-tahfidz">📖 Tahfidz</span>' : '';
          const statusBadge = j.pendingSync ? '<span style="font-size:11px;padding:2px 10px;border-radius:12px;background:#fef3c7;color:#92400e;">🕓 Offline</span>' : j.status === 'pending' ? '<span style="font-size:11px;padding:2px 10px;border-radius:12px;background:#fef3c7;color:#92400e;">⏳ Menunggu</span>' : j.status === 'ditolak' ? '<span style="font-size:11px;padding:2px 10px;border-radius:12px;background:#fee2e2;color:#991b1b;">❌ Ditolak</span>' : '';
          const mewakiliBadge = j.mewakili ? `<span style="font-size:11px;padding:2px 10px;border-radius:12px;background:#dbeafe;color:#1e40af;">🔄 ${escapeHtml(j.mewakili)}</span>` : '';
          const manualOverrideBadge = j.isManualOverride ? `<span style="font-size:11px;padding:2px 10px;border-radius:12px;background:#fef3c7;color:#92400e;" title="Diisi manual oleh ${escapeHtml(j.manualOverrideBy||'-')}, melewati penguncian Jadwal">⚠️ Manual (${escapeHtml(j.manualOverrideBy||'-')})</span>` : '';
          const actionButtons = j.pendingSync
            ? `<button class="btn btn-danger" style="padding:2px 12px;font-size:12px;" onclick="cancelPendingJournal('${j.key}')">✖️</button>`
            : (isOwn ? `<button class="btn btn-edit" style="padding:2px 12px;font-size:12px;" onclick="editJournal('${j.key}')">✏️</button><button class="btn btn-danger" style="padding:2px 12px;font-size:12px;" onclick="hapusDataWithConfirm('journal','${j.key}','Jurnal ${escapeJs(j.subject)}')">🗑️</button>` : '');
          // Baris "👤 nama guru" hanya ditampilkan saat mode Semua Guru -- di mode "Jurnal Saya"
          // itu 100% pasti nama sendiri jadi cuma noise, dibuang supaya lebih ringkas.
          const metaLine = showOwnerBadge ? `👤 ${escapeHtml(j.guru)} · ${escapeHtml(typeLabel)}` : escapeHtml(typeLabel);
          html += `<div style="padding:10px 12px;background:${bgColor};border-radius:8px;border-left:4px solid ${borderColor};margin-bottom:6px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
              <div style="min-width:200px;flex:1;">
                <div style="font-weight:700;font-size:14px;">🕐 Jam ke-${escapeHtml(j.jam_ke)} · ${escapeHtml(j.subject)} ${tahfidzBadge} · ${escapeHtml(j.kelas)} ${extraBadge}</div>
                <div class="text-strong" style="font-size:13px;margin-top:2px;">${escapeHtml(j.activity)}</div>
                <div class="text-muted" style="font-size:12px;margin-top:3px;">${metaLine}</div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${statusBadge}${mewakiliBadge}${manualOverrideBadge}${showOwnerBadge ? `<span style="font-size:11px;padding:2px 10px;border-radius:12px;background:${isOwn ? '#dcfce7' : '#f3f4f6'};color:${isOwn ? '#065f46' : '#4b5563'};">${label}</span>` : ''}${actionButtons}</div>
            </div>
          </div>`;
        });
      });
      list.innerHTML = html;
      document.getElementById('journalPagination').innerHTML = pagerHtml('journal', totalItems, totalPages, start, end, 'jurnal');
    }
    function editJournal(key) {
      const journal = allJournals.find(j => j.key === key);
      if (!journal) return toast('Jurnal tidak ditemukan!', true);
      if ((journal.guruKey ? journal.guruKey !== currentUser.key : journal.guru !== currentUser.name) && !isAdmin()) return toast('Hanya pemilik jurnal yang bisa mengedit!', true);
      editingJournalKey = key;
      document.getElementById('editJournalKey').value = key;
      document.getElementById('journalDate').value = journal.tanggal;
      document.getElementById('journalJam').value = journal.jam_ke;
      document.getElementById('journalType').value = journal.type || 'Reguler';
      lookupJadwalUntukJurnal();
      // Coba cocokkan entri jurnal lama ke salah satu opsi Jadwal SAAT INI (kelas+mapel sama
      // persis). Kalau ketemu, pilih otomatis. Kalau TIDAK ketemu (mis. Jadwal sudah berubah
      // sejak jurnal ini dibuat), tetap tampilkan nilai ASLI jurnal apa adanya -- supaya data
      // lama tidak terlihat rusak/hilang hanya karena Jadwal-nya sudah beda sekarang.
      const pilihan = document.getElementById('journalJadwalPilihan');
      const idxCocok = (window._journalJadwalKandidat || []).findIndex(k => k.kelas === journal.kelas && k.mapel === journal.subject);
      if (idxCocok >= 0) { pilihan.value = String(idxCocok); terapkanJadwalPilihan(); }
      else {
        pilihan.innerHTML += `<option value="__original__" selected>${escapeHtml(journal.kelas)} - ${escapeHtml(journal.subject)} (data asli, sudah tidak ada di Jadwal saat ini)</option>`;
        document.getElementById('journalClass').value = journal.kelas;
        document.getElementById('journalSubject').value = journal.subject;
        if (journal.mewakili) { document.getElementById('journalMewakiliGuru').value = journal.mewakili; window._journalMewakiliKey = journal.mewakiliKey || (allGuru || []).find(g => g.name === journal.mewakili)?.key || null; }
      }
      document.getElementById('journalActivity').value = journal.activity;
      updateJournalActivityCounter();
      document.getElementById('btnSaveJournal').textContent = '💾 Update Jurnal';
      document.getElementById('btnSaveJournal').className = 'btn btn-warning';
      document.getElementById('btnCancelEditJournal').style.display = 'inline-block';
      document.getElementById('bentrokWarning').style.display = 'none';
      document.getElementById('bentrokSuccess').style.display = 'none';
      toast('✏️ Edit jurnal. Perbaiki kesalahan dan klik Update.', false, 3000);
      window.scrollTo({ top: document.getElementById('journalForm').offsetTop - 20, behavior: 'smooth' });
    }
    function cancelEditJournal() {
      editingJournalKey = null; document.getElementById('editJournalKey').value = ''; document.getElementById('journalDate').value = tglLokal(); document.getElementById('journalJam').value = '1'; document.getElementById('journalType').value = 'Reguler';
      if (document.getElementById('journalOverrideManual')) document.getElementById('journalOverrideManual').checked = false;
      document.getElementById('journalJadwalPilihanWrap').style.display = ''; document.getElementById('journalManualWrap').style.display = 'none';
      lookupJadwalUntukJurnal(); document.getElementById('journalActivity').value = ''; updateJournalActivityCounter(); document.getElementById('btnSaveJournal').textContent = '💾 Simpan Jurnal'; document.getElementById('btnSaveJournal').className = 'btn btn-success'; document.getElementById('btnCancelEditJournal').style.display = 'none'; toast('✖️ Edit dibatalkan', false, 2000);
    }
    function saveJournal() {
      if (!isTeacher() && !isWaliKelas() && !isAdmin() && !isKepsek()) return toast('Hanya Guru, Wali Kelas, Admin & Kepsek!', true);
      if (isBusy('saveJournal')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 2000);
      const tanggal = document.getElementById('journalDate').value, jam_ke = parseInt(document.getElementById('journalJam').value), kelas = document.getElementById('journalClass').value, subject = document.getElementById('journalSubject').value, type = document.getElementById('journalType').value, activity = document.getElementById('journalActivity').value.trim();
      const jumlahJamTersedia = Object.keys(jamSettings).length || 4;
      const isManualOverride = (isAdmin() || isKepsek()) && document.getElementById('journalOverrideManual') && document.getElementById('journalOverrideManual').checked;
      if (!tanggal) return toast('Pilih tanggal!', true); if (!jam_ke) return toast('Pilih jam!', true); if (!kelas) return toast('Pilih kelas!', true); if (!subject) return toast('Pilih mata pelajaran!', true); if (!activity) return toast('Kegiatan wajib diisi!', true); if (activity.length > JOURNAL_ACTIVITY_MAX_LEN) return toast(`Kegiatan pembelajaran maksimal ${JOURNAL_ACTIVITY_MAX_LEN} karakter!`, true); const journalKataList = journalPecahKata(activity); if (journalKataList.length < JOURNAL_ACTIVITY_MIN_WORDS) return toast(`Kegiatan pembelajaran terlalu singkat, minimal ${JOURNAL_ACTIVITY_MIN_WORDS} kata (sekarang ${journalKataList.length} kata). Tulis kegiatan lebih lengkap, misal: "Menjelaskan penjumlahan pecahan dan latihan soal halaman 12".`, true); if (!journalPunyaKataKerja(journalKataList)) return toast(`Kegiatan pembelajaran wajib memuat kata kerja, mis. "menjelaskan", "melatih", "membimbing", "mempraktikkan". Tulis APA yang dilakukan, bukan cuma nama topiknya.`, true); if (jam_ke < 1 || jam_ke > jumlahJamTersedia) return toast(`Jam pelajaran hanya 1-${jumlahJamTersedia}!`, true);
      // ===== VALIDASI: Guru yang sudah lapor Izin/Sakit hari itu tidak bisa isi jurnal =====
      if (!isAdmin() && !isKepsek()) {
        const izinSakitHariIniJurnal = allTeacherAttendance.find(a => a.tanggal === tanggal && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && (a.type === 'Izin' || a.type === 'Sakit'));
        if (izinSakitHariIniJurnal) return toast(`⚠️ Anda sudah melaporkan ${izinSakitHariIniJurnal.type} tanggal ${tanggal}, tidak bisa mengisi jurnal mengajar.`, true);
      }
      // ===== VALIDASI: Wajib sudah Absen Datang (guru) -- HANYA dicek untuk jurnal JAM PERTAMA =====
      // Sebelumnya dicek di SETIAP jam (jam 1, 2, 3, dst), padahal absen datang guru itu satu kali
      // untuk sehari penuh, bukan per jam pelajaran -- akibatnya guru yang sudah absen & sudah
      // berhasil isi jurnal jam 1 tetap diminta lagi saat isi jurnal jam 2, 3, dst. Sekarang cukup
      // divalidasi sekali di jam pertama; jam-jam berikutnya tidak perlu cek ulang.
      if (!isAdmin() && !isKepsek() && jam_ke === 1) {
        const sudahAbsenDatangJurnal = allTeacherAttendance.some(a => a.tanggal === tanggal && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && a.type === 'Datang') || (tanggal === tglLokal() && sudahAbsenDatangHariIni());
        if (!sudahAbsenDatangJurnal && tanggal === tglLokal() && !saveJournal._cekDatang) {
          // Memori bisa basi: periksa langsung ke server dulu, lalu ulangi simpan bila catatan Datang ternyata ada.
          saveJournal._cekDatang = true; toast('⏳ Memeriksa absen datang Anda...', false, 1500);
          return v4SegarkanAbsenHariIni().catch(() => {}).then(() => { try { return saveJournal(); } finally { saveJournal._cekDatang = false; } }); // flag tetap true selama ulangan: tidak berputar
        }
        if (!sudahAbsenDatangJurnal) return toast(`⚠️ Anda belum Absen Datang untuk tanggal ${tanggal}. Silakan Absen Guru dulu sebelum mengisi jurnal.`, true);
      }
      // ===== VALIDASI: Setelah Absen Pulang, jurnal tidak bisa diisi lagi -- KECUALI untuk jam
      // pelajaran yang jam SELESAI-nya berada dalam rentang 1 jam SEBELUM waktu Absen Pulang
      // (jam terakhir yang baru saja diajarkan sebelum pulang, yang mungkin belum sempat
      // dicatat). Ini mencegah guru "mengaku mengajar" pada jam yang sebenarnya sudah lewat
      // waktu dia pulang, tapi tetap memberi keleluasaan melengkapi jurnal jam terakhir.
      if (!isAdmin() && !isKepsek()) {
        const pulangHariIni = allTeacherAttendance.find(a => a.tanggal === tanggal && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && a.type === 'Pulang');
        if (pulangHariIni && pulangHariIni.waktu) {
          const pulangDate = new Date(pulangHariIni.waktu);
          const pulangMenit = menitWIB(pulangDate); // WIB, sama dengan jamSettings
          const settingJamIni = jamSettings[jam_ke];
          if (settingJamIni) {
            const selesaiArr = settingJamIni.selesai.split(':');
            const jamSelesaiMenit = parseInt(selesaiArr[0]) * 60 + parseInt(selesaiArr[1]);
            const dalamGraceSatuJam = jamSelesaiMenit <= pulangMenit && jamSelesaiMenit >= pulangMenit - 60;
            if (!dalamGraceSatuJam) {
              const jamPulangStr = pulangDate.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'});
              return toast(`⚠️ Anda sudah Absen Pulang pukul ${jamPulangStr}. Jurnal hanya bisa diisi untuk jam yang berakhir maksimal 1 jam sebelum waktu pulang.`, true);
            }
          }
        }
      }
      let mewakili = '';
      if (type === 'Non-Reguler') { mewakili = document.getElementById('journalMewakiliGuru').value; if (!mewakili) return toast('Pilih guru yang Anda wakili!', true); }

      // ===== VALIDASI A: Wali Kelas hanya boleh Reguler di kelasnya sendiri =====
      if (isWaliKelas() && type === 'Reguler' && !loaderScopeKelas().includes(kelas)) {
        return toast(`⚠️ Sebagai Wali Kelas, Anda hanya bisa mengajar Reguler di kelas: ${loaderScopeKelas().join(', ')}!`, true);
      }

      // ===== VALIDASI B/B2/C (di dalam lanjutkanSaveJournal di bawah) butuh data absensi GURU
      // LAIN (guru yang di-"mewakili"). allTeacherAttendance yang sudah dimuat di awal sesi SENGAJA
      // di-scope hanya ke absensi guru yang sedang login sendiri untuk non-Admin (lihat loader
      // teacher_attendance) -- supaya non-Admin tidak diam-diam mengunduh absensi SELURUH guru ke
      // perangkatnya. Akibatnya, sebelum perbaikan ini, VALIDASI B2 & C (yang perlu tahu apakah
      // GURU LAIN sudah Izin/Sakit/Pulang/Datang) SELALU gagal menemukan datanya untuk guru
      // non-Admin -- absensiGuruDigantikan selalu kosong & guruIzinSakitHariIni selalu 0-1, membuat
      // validasi itu praktis mustahil lolos dengan bukti yang sebenarnya valid. Sekarang, KHUSUS
      // saat mengisi jurnal Non-Reguler (mewakili guru lain), absensi guru utk TANGGAL itu SAJA
      // di-query on-demand langsung ke Firebase saat validasi -- bukan mengandalkan
      // allTeacherAttendance yang sudah ter-scope -- supaya validasi melihat data yang sebenarnya.
      // Untuk jurnal Reguler (tidak butuh data guru lain sama sekali) tidak ada query tambahan;
      // lanjut sinkron seperti biasa, tanpa menambah latensi.
      function lanjutkanSaveJournal(teacherAttendanceUntukValidasi) {
      // ===== VALIDASI B: Guru yang diwakili harus punya jadwal di kelas & jam tersebut =====
      if (type === 'Non-Reguler' && mewakili) {
        const namaHari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
        const hariTanggal = namaHari[new Date(tanggal + 'T00:00:00').getDay()];
        // FIX: dulu dicocokkan HANYA lewat nama (j.guru === mewakili) -- kalau ada 2 guru bernama
        // sama, jurnal ini bisa lolos validasi dengan mengacu ke jadwal MILIK GURU YANG SALAH
        // (twin-nya), bukan guru yang sungguh-sungguh dimaksud dipilih dari dropdown. Sekarang
        // diutamakan cocok lewat guruKey (window._journalMewakiliKey, diisi saat memilih jadwal/
        // guru yang diwakili); fallback ke nama hanya kalau guruKey tidak tersedia.
        const mewakiliKey = window._journalMewakiliKey || null;
        const jadwalGuruDiwakili = allJadwal.find(j => (mewakiliKey ? j.guruKey === mewakiliKey : samaNamaGuru(j.guru, mewakili)) && j.kelas === kelas && j.jam === jam_ke && j.hari === hariTanggal);
        if (!jadwalGuruDiwakili) {
          return toast(`⚠️ Guru "${mewakili}" tidak memiliki jadwal mengajar di ${kelas} - ${hariTanggal} jam ke-${jam_ke}!`, true);
        }
      }

      // ===== VALIDASI B2: Guru yang diwakili harus TERBUKTI TIDAK MASUK -- sebelumnya jurnal
      // Non-Reguler bisa disimpan asal guru yang digantikan punya jadwal di slot itu (VALIDASI B),
      // TANPA mengecek sama sekali apakah guru tersebut benar-benar tidak hadir. Akibatnya siapa
      // pun bisa menulis "menggantikan Pak/Bu X" walau Pak/Bu X sebenarnya masuk normal hari itu --
      // celah untuk klaim honor pengganti yang tidak sah. Sekarang diwajibkan salah satu bukti:
      //  (1) guru yang digantikan sudah lapor Izin/Sakit tanggal ini, ATAU
      //  (2) guru yang digantikan sudah Absen Pulang tanggal ini (sudah pulang lebih dulu), ATAU
      //  (3) guru yang digantikan BELUM Absen Datang sama sekali tanggal ini, DAN sekarang sudah
      //      lewat jam 08:00 -- dianggap tidak masuk tanpa perlu menunggu laporan resmi apa pun.
      // Jalur darurat Admin/Kepsek "Isi Manual" tetap bisa melewati ini (isManualOverride), sama
      // seperti pola pengecualian yang sudah dipakai di VALIDASI A untuk situasi di luar kebiasaan.
      if (type === 'Non-Reguler' && mewakili && !isManualOverride) {
        // FIX: dulu (allGuru||[]).find(g => g.name === mewakili) mengambil guru PERTAMA yang
        // namanya cocok -- kalau ada 2 guru bernama sama, bisa salah ambil objek guru (dan
        // absensinya) untuk menentukan "terbukti tidak masuk". Sekarang diutamakan guruKey yang
        // sudah diketahui dari pemilihan jadwal (window._journalMewakiliKey).
        const mewakiliKeyB2 = window._journalMewakiliKey || null;
        const guruDigantikanObj = mewakiliKeyB2 ? (allGuru || []).find(g => g.key === mewakiliKeyB2) : (allGuru || []).find(g => g.name === mewakili);
        // FIX: dulu difilter dari allTeacherAttendance (ter-scope ke absensi guru sendiri utk
        // non-Admin) -- sekarang dari teacherAttendanceUntukValidasi hasil query on-demand di atas,
        // yang berisi absensi SEMUA guru utk tanggal ini, bukan cuma milik guru yang sedang login.
        const absensiGuruDigantikan = teacherAttendanceUntukValidasi.filter(a => a.tanggal === tanggal && (guruDigantikanObj && a.guruKey ? a.guruKey === guruDigantikanObj.key : a.guru === mewakili));
        const sudahIzinSakit = absensiGuruDigantikan.some(a => a.type === 'Izin' || a.type === 'Sakit');
        const sudahPulangDuluan = absensiGuruDigantikan.some(a => a.type === 'Pulang');
        const sudahAbsenDatang = absensiGuruDigantikan.some(a => a.type === 'Datang');
        const todayB2 = tglLokal();
        const sudahLewatJam8 = tanggal < todayB2 || (tanggal === todayB2 && menitWIB() >= 8 * 60);
        const terbuktiTidakMasuk = sudahIzinSakit || sudahPulangDuluan || (!sudahAbsenDatang && sudahLewatJam8);
        if (!terbuktiTidakMasuk) {
          return toast(`⚠️ Guru "${mewakili}" belum tercatat Izin/Sakit/Pulang untuk tanggal ${tanggal}, dan belum lewat jam 08:00 tanpa Absen Datang. Jurnal "mewakili" hanya bisa dicatat kalau guru yang digantikan terbukti tidak masuk -- kalau memang mendadak & belum ada laporan, tunggu setelah jam 08:00, atau minta guru bersangkutan lapor Izin/Sakit dulu.`, true);
        }
      }

      // ===== VALIDASI C: Maksimal mewakili 2x per hari, KECUALI kalau guru yang izin/sakit/alfa
      // hari itu berjumlah 2 orang atau lebih -- dalam kondisi itu batasnya dilewati total,
      // karena wajar satu guru perlu mewakili lebih banyak kalau memang banyak rekan yang absen.
      if (type === 'Non-Reguler') {
        // FIX: sama seperti VALIDASI B2 -- dulu dari allTeacherAttendance (cuma berisi absensi
        // guru sendiri utk non-Admin, jadi hasilnya selalu 0 atau 1, hampir tidak pernah bisa
        // ≥2), sekarang dari teacherAttendanceUntukValidasi (hasil query on-demand, semua guru).
        // FIX: dulu HANYA menghitung catatan Izin/Sakit. Guru yang alfa tidak ikut terhitung, padahal
        // catatan Alpha otomatis cuma dibuat utk hari-hari SEBELUM hari ini (lihat autoMarkAlphaGuru),
        // jadi di hari berjalan guru yang tidak masuk tanpa kabar tidak punya catatan apa pun --
        // akibatnya batas 2x tetap menghalangi walau banyak guru tidak hadir. Sekarang dihitung sebagai
        // "tidak hadir": (1) catatan Izin/Sakit/Alpha, DAN (2) guru aktif yang sama sekali belum punya
        // catatan kehadiran hari itu setelah lewat jam 08:00 (kriteria sama dgn VALIDASI B2).
        const _idGuruC = a => a.guruKey || a.guru;
        const _catatanHariC = teacherAttendanceUntukValidasi.filter(a => a.tanggal === tanggal);
        const guruTidakHadirC = new Set(_catatanHariC.filter(a => a.type === 'Izin' || a.type === 'Sakit' || a.type === 'Alpha').map(_idGuruC));
        const _todayC = tglLokal();
        const _sudahLewatJam8C = tanggal < _todayC || (tanggal === _todayC && menitWIB() >= 8 * 60);
        if (_sudahLewatJam8C) {
          const _adaCatatanC = new Set();
          _catatanHariC.forEach(a => { if (a.guruKey) _adaCatatanC.add(a.guruKey); if (a.guru) _adaCatatanC.add(a.guru); });
          (allGuru || []).filter(g => (g.role === 'guru' || g.role === 'wali_kelas') && g.key !== currentUser.key).forEach(g => {
            if (!_adaCatatanC.has(g.key) && !_adaCatatanC.has(g.name)) guruTidakHadirC.add(g.key || g.name);
          });
        }
        const guruIzinSakitHariIni = guruTidakHadirC.size;
        if (guruIzinSakitHariIni < 2) {
          const jumlahNonRegulerHariIni = allJournals.filter(j => (j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name) && j.type === 'Non-Reguler' && j.tanggal === tanggal && j.status !== 'ditolak' && j.key !== editingJournalKey).length;
          if (jumlahNonRegulerHariIni >= MAX_MEWAKILI_PER_HARI) {
            return toast(`⚠️ Batas mewakili ${MAX_MEWAKILI_PER_HARI}x per hari sudah tercapai (batas ini otomatis dilewati kalau guru yang izin/sakit/alfa hari ini ≥2 orang). Anda sudah mewakili ${jumlahNonRegulerHariIni}x hari ini (${tanggal}).`, true);
          }
        }
      }

      const today = tglLokal();
      if (tanggal > today) return toast('Tidak bisa membuat jurnal untuk tanggal di masa depan!', true);

      // ===== VALIDASI D: Absensi siswa sudah diisi untuk kelas & tanggal ini =====
      // HANYA diwajibkan untuk jurnal JAM PERTAMA. Kehadiran siswa itu satu kali untuk sehari
      // penuh (per kelas), bukan per jam pelajaran -- kalau dicek ulang di tiap jam, guru yang
      // sudah benar mengisi absensi & jurnal jam 1 tetap "diminta lagi" saat isi jurnal jam 2, 3,
      // dst. Berlaku juga saat edit jurnal jam pertama (lihat catatan versi sebelumnya).
      const todayAbsen = allAttendance.find(a => a.tanggal === tanggal && a.kelas === kelas);
      // FIX: sebelumnya di sini hanya Admin yang dikecualikan, sedangkan validasi "wajib Absen
      // Datang" di atas (jam pertama) mengecualikan Admin & Kepsek berdua -- inkonsisten yang
      // membuat Kepsek tetap terhambat mengisi/mengoreksi jurnal darurat gara-gara syarat
      // absensi siswa. Disamakan supaya kedua validasi punya pengecualian role yang sama.
      // Kasus khusus guru PENGGANTI (Non-Reguler/mewakili): kelas yang diwakili sering di LUAR
      // currentUser.kelas milik guru pengganti (itu memang daftar kelas dia sendiri, bukan kelas
      // yang kebetulan dia gantikan hari ini) -- akibatnya menu Absensi Siswa biasa TIDAK
      // menampilkan kelas itu sama sekali (dropdown & allSiswa keduanya difilter ke
      // currentUser.kelas), jadi guru pengganti tidak bisa memenuhi syarat absensi lewat jalur
      // normal sama sekali (buntu). Untuk kasus ini dibukakan jendela absensi cepat khusus
      // (bukaAbsensiMewakili) yang mengambil data siswa kelas tsb langsung dari Firebase,
      // bukan dari allSiswa yang sudah difilter.
      if (jam_ke === 1 && !todayAbsen && !isAdmin() && !isKepsek()) {
        if (type === 'Non-Reguler' && mewakili && kelas) {
          bukaAbsensiMewakili(kelas, tanggal);
          return toast(`⚠️ Sebagai guru pengganti, isi dulu absensi siswa kelas ${kelas} lewat jendela yang baru muncul, lalu simpan jurnal ini lagi.`, true);
        }
        return toast('⚠️ Isi absensi siswa dulu sebelum membuat jurnal!', true);
      }

      // ===== VALIDASI E: Bentrok jadwal =====
      // Sama seperti di atas: sebelumnya HANYA dicek saat membuat jurnal baru. Sekarang berlaku juga
      // saat edit, dengan entri yang sedang diedit dikecualikan dari daftar pembanding (supaya tidak
      // dianggap bentrok dengan dirinya sendiri).
      const { bentrokList, maxKelas } = getBentrokJurnalInfo(tanggal, jam_ke, kelas, type, editingJournalKey);
      if (bentrokList.length >= maxKelas) { const kelasBentrok = bentrokList.map(j=>j.kelas).join(', '); return toast(`⚠️ Bentrok! Anda sudah mengajar di ${kelasBentrok} pada jam ke-${jam_ke}. ${type} maksimal ${maxKelas} kelas per jam.`, true); }
      if (bentrokList.some(j => j.kelas === kelas)) return toast(`⚠️ Anda sudah mengajar ${kelas} pada jam ke-${jam_ke} tanggal ${tanggal}.`, true);

      document.getElementById('journalLateWarning').style.display = 'none'; pendingSusulanData = null;
      if (editingJournalKey) {
        if (!navigator.onLine) return toast('📡 Sedang offline. Edit jurnal butuh koneksi internet supaya tidak bentrok dengan data terbaru — coba lagi setelah online.', true);
        const btnSaveEdit = document.getElementById('btnSaveJournal');
        setBusy('saveJournal', btnSaveEdit);
        db.ref('journal/'+editingJournalKey).update({ tanggal, jam_ke, subject, activity, kelas, type, mewakili: mewakili || null, mewakiliKey: window._journalMewakiliKey || null, updatedAt: new Date().toISOString() }, err => {
          clearBusy('saveJournal', btnSaveEdit);
          if (err) toast('Gagal update: '+err.message, true);
          else { toastTersimpan(); addLog('edit_jurnal', subject + ' - ' + kelas); cancelEditJournal(); reloadDataset('journal'); }
        });
        return;
      }

      // ===== OFFLINE: jurnal baru langsung diantre di perangkat, tidak menunggu Firebase =====
      // FIX: sebelumnya jalur offline SELALU disimpan sebagai status 'approved', apa pun jam
      // sekarang -- beda dengan jalur online di bawah yang mewajibkan "Jurnal Susulan" (status
      // 'pending', perlu approval Admin) kalau disimpan di luar rentang jam pelajaran. Ini celah:
      // guru bisa mematikan koneksi supaya jurnal yang sebetulnya telat tetap langsung
      // ter-approve tanpa sepengetahuan Admin. Sekarang status offline dihitung dengan logika jam
      // yang SAMA seperti jalur online (berdasarkan jam device saat entri DIBUAT, sama seperti
      // yang sudah dipakai di seluruh validasi jurnal lain) -- kalau masih dalam rentang jam
      // pelajaran tetap 'approved' seperti biasa, kalau sudah di luar jam maka disimpan sebagai
      // 'pending' (susulan) supaya tetap masuk antrian approval Admin begitu berhasil tersinkron.
      // Admin tetap dikecualikan, sama seperti jalur online (`!isJamSesuai && !isAdmin()` di bawah).
      if (!isReallyOnline()) {
        // FIX: sebelumnya jalur offline ini TIDAK dikunci isBusy/setBusy sama sekali (beda dari
        // jalur online & edit di bawah) -- klik "Simpan" 2x dengan cepat saat offline bisa membuat
        // 2 entri jurnal offline yang identik ter-antre (queueOfflineJournal tidak melakukan
        // dedupe apa pun, selalu push entri baru). Sekarang dikunci sesaat dengan cara yang sama
        // supaya konsisten dengan pola anti double-submit yang dipakai di seluruh aplikasi.
        const btnSaveOffline = document.getElementById('btnSaveJournal');
        setBusy('saveJournal', btnSaveOffline);
        try { // try/finally: queueOfflineJournal menyentuh DOM & bisa melempar -> lock tak boleh nyangkut
        const nowOffline = new Date(), menitSekarangOffline = menitWIB(nowOffline);
        const settingJamOffline = jamSettings[jam_ke];
        // Sama dgn jalur online: tanpa pengaturan jam, jurnal tak bisa diverifikasi -> tolak. Dulu jalur offline
        // melewati seluruh cek jam kalau settingnya tidak ada & menyimpan langsung 'approved'.
        if (!settingJamOffline) return toast('Pengaturan jam tidak ditemukan!', true);
        let statusOffline = 'approved', requestedAtOffline = null;
        if (!isAdmin()) {
          // Disamakan dengan logika jalur online di bawah (lihat catatan di sana): batas ATAS
          // (selesaiMenit) dilepas -- guru yang masih di sekolah tidak lagi dipaksa susulan cuma
          // karena lewat beberapa menit dari jam selesai. Backdate (tanggal bukan hari ini) tetap
          // selalu susulan, karena statusnya tidak bisa diverifikasi dari jam device saat ini.
          const mulaiOffline = settingJamOffline.mulai.split(':');
          const mulaiMenitOffline = parseInt(mulaiOffline[0])*60 + parseInt(mulaiOffline[1]);
          const isBackdateOffline = tanggal < tglLokal(nowOffline);
          const isJamSesuaiOffline = isBackdateOffline ? false : menitSekarangOffline >= mulaiMenitOffline;
          if (!isJamSesuaiOffline) { statusOffline = 'pending'; requestedAtOffline = new Date().toISOString(); }
        }
        queueOfflineJournal({ tanggal, jam_ke, subject, activity, kelas, guru: currentUser.name, guruKey: currentUser.key || null, type, mewakili: mewakili || null, mewakiliKey: window._journalMewakiliKey || null, tahunAjaran: currentTahunAjaran, status: statusOffline, requestedAt: requestedAtOffline, dibuat: new Date().toISOString(), isManualOverride: isManualOverride || null, manualOverrideBy: isManualOverride ? currentUser.name : null }); // flag override IKUT terkirim (dulu hilang di jalur offline -> badge/audit "Manual" tak muncul)
        } finally { clearBusy('saveJournal', btnSaveOffline); }
        return;
      }

      const now = new Date(), sekarangMenit = menitWIB(now), jamSekarang = Math.floor(sekarangMenit / 60), menitSekarang = sekarangMenit % 60;
      const settingJam = jamSettings[jam_ke];
      if (!settingJam) return toast('Pengaturan jam tidak ditemukan!', true);
      const mulai = settingJam.mulai.split(':');
      const mulaiMenit = parseInt(mulai[0])*60 + parseInt(mulai[1]);
      // Sebelumnya jurnal jam ke-N WAJIB disimpan PERSIS dalam rentang mulai-selesai jam itu --
      // begitu lewat waktu selesai walau cuma beberapa menit (guru lupa, masih sibuk di kelas,
      // dll), tetap dipaksa lewat jalur "Jurnal Susulan" (perlu approval Admin), padahal guru itu
      // jelas masih hadir di sekolah. Batas yang lebih akurat untuk itu sebenarnya SUDAH dicek di
      // dua validasi lain di atas: guru wajib sudah Absen Datang (jam pertama), dan begitu guru
      // sudah Absen Pulang, jurnal ditolak kecuali untuk jam yang berakhir maksimal 1 jam sebelum
      // waktu pulang. Jadi batas ATAS (selesaiMenit) di sini dilepas -- cukup jaga batas BAWAH
      // (jam belum dimulai = belum bisa diisi, mencegah guru "mengisi jurnal" untuk pelajaran yang
      // belum berlangsung sama sekali). Backdate (tanggal bukan hari ini) TETAP selalu wajib lewat
      // Susulan, karena kehadiran guru pada tanggal itu tidak bisa diverifikasi dari jam sekarang.
      const isBackdate = tanggal < today;
      const isJamSesuai = isBackdate ? false : sekarangMenit >= mulaiMenit;
      if (!isJamSesuai && !isAdmin()) {
        pendingSusulanData = { tanggal, jam_ke, subject, activity, kelas, guru: currentUser.name, guruKey: currentUser.key || null, type, mewakili: mewakili || null, mewakiliKey: window._journalMewakiliKey || null, tahunAjaran: currentTahunAjaran };
        document.getElementById('journalLateDetail').textContent = isBackdate
          ? `Tanggal ${tanggal} bukan hari ini, sehingga tidak bisa diverifikasi otomatis. Klik tombol di bawah untuk mengajukan jurnal ini sebagai jurnal susulan ke Admin.`
          : `Jam ke-${jam_ke} baru mulai pukul ${settingJam.mulai}, sedangkan sekarang masih sebelum itu. Klik tombol di bawah untuk mengajukan jurnal ini sebagai jurnal susulan ke Admin.`;
        document.getElementById('journalLateWarning').style.display = 'block';
        return toast(isBackdate ? '⚠️ Tanggal bukan hari ini. Ajukan sebagai jurnal susulan di bawah.' : '⚠️ Jam pelajaran belum dimulai. Ajukan sebagai jurnal susulan di bawah.', true);
      }
      const btnSaveJournal = document.getElementById('btnSaveJournal');
      setBusy('saveJournal', btnSaveJournal);
      if (btnSaveJournal) btnSaveJournal.textContent = '⏳ Menyimpan...';
      const newJournalRef = db.ref('journal').push();
      const jrnPayload = { tanggal, jam_ke, subject, activity, kelas, guru: currentUser.name, guruKey: currentUser.key || null, type, mewakili: mewakili || null, mewakiliKey: window._journalMewakiliKey || null, tahunAjaran: currentTahunAjaran, status: 'approved', dibuat: new Date().toISOString(), isManualOverride: isManualOverride || null, manualOverrideBy: isManualOverride ? currentUser.name : null };
      // [PATCH JARINGAN LEMAH] Batas waktu simpan: kalau server tak membalas dalam SAVE_DEADLINE_MS,
      // jurnal masuk antrian perangkat DENGAN key yang sama (newJournalRef.key) -> aman walau
      // Firebase ikut mengirim ulang sendiri di belakang layar (tidak jadi dobel).
      let jrnSettled = false;
      const jrnTimer = setTimeout(() => {
        if (jrnSettled) return; jrnSettled = true;
        clearBusy('saveJournal', btnSaveJournal);
        queueOfflineJournal(Object.assign({}, jrnPayload, { _fbKey: newJournalRef.key }),
          '📶 Sinyal lemah: jurnal disimpan di perangkat ini & akan otomatis dikirim saat jaringan pulih.');
      }, SAVE_DEADLINE_MS);
      try {
        newJournalRef.set(jrnPayload, err => {
          if (jrnSettled) return; jrnSettled = true; clearTimeout(jrnTimer);
          clearBusy('saveJournal', btnSaveJournal);
          if (err) {
            // Kalau ternyata gagal karena koneksi putus tepat saat menulis (bukan navigator.onLine
            // yang salah baca, tapi race kondisi jaringan), tetap selamatkan datanya ke antrian
            // offline alih-alih data hilang begitu saja.
            if (!isReallyOnline()) { queueOfflineJournal(Object.assign({}, jrnPayload, { _fbKey: newJournalRef.key })); }
            else toast('Gagal: '+err.message, true);
          }
          else {
            toastTersimpan(); addLog('simpan_jurnal', subject + ' - ' + kelas + (mewakili ? ' (mewakili '+mewakili+')' : '') + (isManualOverride ? ' [MANUAL OVERRIDE oleh '+currentUser.name+']' : ''));
            // Update cache lokal SEKARANG JUGA (bukan menunggu loadAllData() yang butuh waktu network) —
            // supaya kalau tombol Simpan diklik lagi dalam 1-2 detik berikutnya, cek bentrok jam yang sama
            // langsung mendeteksi jurnal yang baru saja tersimpan ini, bukan data lama.
            bumpJournalRev(); allJournals.push({ key: newJournalRef.key, tanggal, jam_ke, subject, activity, kelas, guru: currentUser.name, guruKey: currentUser.key || null, type, mewakili: mewakili || null, mewakiliKey: window._journalMewakiliKey || null, tahunAjaran: currentTahunAjaran, status: 'approved', dibuat: new Date().toISOString() });
            document.getElementById('journalActivity').value = ''; updateJournalActivityCounter(); document.getElementById('bentrokWarning').style.display = 'none'; document.getElementById('bentrokSuccess').style.display = 'none'; reloadDataset('journal');
          }
        });
      } catch (e) {
        jrnSettled = true; clearTimeout(jrnTimer);
        clearBusy('saveJournal', btnSaveJournal);
        toast('Gagal: '+(e && e.message || e), true);
      }
      } // -- akhir lanjutkanSaveJournal --

      // Jurnal Reguler tidak butuh data absensi guru lain sama sekali -> lanjut sinkron seperti
      // biasa, tanpa query tambahan. Non-Reguler (mewakili) butuh data absensi guru LAIN yang
      // tidak ada di allTeacherAttendance milik non-Admin (lihat catatan panjang di atas) -> query
      // on-demand dulu ke Firebase, khusus tanggal jurnal ini, baru lanjutkan validasi & simpan.
      if (type === 'Non-Reguler' && mewakili && isReallyOnline()) {
        // FIX: setBusy/clearBusy di blok ini sebelumnya dipanggil TANPA argumen tombol (btnSaveJournal
        // baru dideklarasikan di dalam lanjutkanSaveJournal, tidak terjangkau di scope ini) --
        // _busyLocks['saveJournal'] memang sudah terkunci (klik ganda tetap tertolak lewat
        // isBusy() di awal fungsi), TAPI tombol "Simpan" secara VISUAL tetap tampak aktif
        // (tidak disabled/redup) selama query on-demand ke Firebase ini berlangsung, baru
        // benar-benar terlihat "sibuk" setelah lanjutkanSaveJournal jalan. Di koneksi lambat ini
        // bisa terasa seperti tombol tidak merespons klik pertama. Sekarang tombol yang sama
        // diambil & dikirim ke setBusy/clearBusy di sini juga, supaya feedback visualnya muncul
        // sejak awal, sebelum lanjutkanSaveJournal mengambil-alih dengan referensi yang sama.
        const btnSaveJournalQuery = document.getElementById('btnSaveJournal');
        setBusy('saveJournal', btnSaveJournalQuery);
        if (btnSaveJournalQuery) btnSaveJournalQuery.textContent = '⏳ Memeriksa data...';
        // Batas waktu: kalau server tak menjawab (sinyal lemah), jangan biarkan tombol terkunci selamanya.
        let queryMewakiliSelesai = false;
        const timerQueryMewakili = setTimeout(() => {
          if (queryMewakiliSelesai) return; queryMewakiliSelesai = true;
          clearBusy('saveJournal', btnSaveJournalQuery);
          toast('⚠️ Sinyal lemah, data absensi guru lain tidak sempat diperiksa. Memakai data lokal sebagai cadangan.', false, 4000);
          lanjutkanSaveJournal(allTeacherAttendance);
        }, SAVE_DEADLINE_MS);
        db.ref('teacher_attendance').orderByChild('tanggal').equalTo(tanggal).once('value', snap => {
          if (queryMewakiliSelesai) return; queryMewakiliSelesai = true; clearTimeout(timerQueryMewakili);
          const teacherAttendanceHariItu = [];
          snap.forEach(child => { const v = child.val(); v.key = child.key; teacherAttendanceHariItu.push(v); });
          clearBusy('saveJournal', btnSaveJournalQuery);
          lanjutkanSaveJournal(teacherAttendanceHariItu);
        }, err => {
          if (queryMewakiliSelesai) return; queryMewakiliSelesai = true; clearTimeout(timerQueryMewakili);
          clearBusy('saveJournal', btnSaveJournalQuery);
          console.warn('[SI MAMBA] Gagal query on-demand teacher_attendance utk validasi mewakili:', err && err.message ? err.message : err);
          // Fallback: kalau query on-demand gagal (mis. jaringan putus di tengah jalan), tetap
          // lanjutkan pakai allTeacherAttendance yang sudah ada (mundur ke perilaku lama) drpd
          // guru pengganti buntu total tidak bisa menyimpan jurnal sama sekali.
          toast('⚠️ Gagal memeriksa data absensi guru lain, memakai data lokal sebagai cadangan.', false, 4000);
          lanjutkanSaveJournal(allTeacherAttendance);
        });
      } else {
        // Reguler, atau Non-Reguler tapi sedang offline (queueOfflineJournal di dalam
        // lanjutkanSaveJournal akan menangani jalur offline-nya sendiri) -> allTeacherAttendance
        // lokal sudah cukup (untuk Reguler tidak dipakai sama sekali di VALIDASI B/B2/C).
        lanjutkanSaveJournal(allTeacherAttendance);
      }
    }
    function submitJournalSusulan() {
      if (!pendingSusulanData) return toast('Data tidak lengkap, silakan isi ulang form jurnal.', true);
      if (isBusy('saveJournal')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 2000);
      const btnSusulan = document.getElementById('btnAjukanSusulan');
      const data = pendingSusulanData;
      // Offline: tanpa ini tombol terkunci tanpa umpan balik & pengajuan hilang kalau tab ditutup.
      if (!isReallyOnline()) {
        const nowIso = new Date().toISOString();
        queueOfflineJournal(Object.assign({}, data, { status: 'pending', requestedAt: nowIso, dibuat: nowIso }),
          '📥 Offline: pengajuan jurnal susulan disimpan di perangkat ini, dikirim otomatis saat online.');
        document.getElementById('journalLateWarning').style.display = 'none';
        pendingSusulanData = null;
        return;
      }
      setBusy('saveJournal', btnSusulan);
      const susulanRef = db.ref('journal').push();
      susulanRef.set({ ...data, status: 'pending', requestedAt: new Date().toISOString(), dibuat: new Date().toISOString() }, err => {
        clearBusy('saveJournal', btnSusulan);
        if (err) toast('Gagal mengajukan: '+err.message, true);
        else {
          toast('📤 Jurnal susulan diajukan! Menunggu persetujuan Admin.');
          addLog('ajukan_jurnal_susulan', data.subject + ' - ' + data.kelas);
          bumpJournalRev(); allJournals.push({ key: susulanRef.key, ...data, status: 'pending', requestedAt: new Date().toISOString(), dibuat: new Date().toISOString() });
          document.getElementById('journalActivity').value = '';
          updateJournalActivityCounter();
          document.getElementById('journalLateWarning').style.display = 'none';
          pendingSusulanData = null;
          reloadDataset('journal');
        }
      });
    }
    function approveJournal(key) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      db.ref('journal/'+key).update({ status: 'approved', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toastTersimpan('Jurnal susulan disetujui'); addLog('setujui_jurnal_susulan', key); reloadDataset('journal'); }
      });
    }
    function rejectJournal(key) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      if (!confirm('Tolak jurnal susulan ini?')) return;
      db.ref('journal/'+key).update({ status: 'ditolak', rejectedBy: currentUser.name, rejectedAt: new Date().toISOString() }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('❌ Jurnal susulan ditolak.'); addLog('tolak_jurnal_susulan', key); reloadDataset('journal'); }
      });
    }
    function renderJournalApprovals() {
      const section = document.getElementById('journalApprovalSection'), list = document.getElementById('journalApprovalList');
      if (!section || !list) return;
      if (!isAdmin() && !isKepsek()) { section.style.display = 'none'; return; }
      const pending = allJournals.filter(j => j.status === 'pending');
      if (pending.length === 0) { section.style.display = 'none'; return; }
      section.style.display = 'block';
      list.innerHTML = '';
      pending.sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).forEach(j => {
        const jam = jamSettings[j.jam_ke] || { mulai: '-', selesai: '-' };
        list.innerHTML += `<div style="padding:12px;background:#fef3c7;border-radius:8px;border-left:4px solid #d97706;margin-bottom:8px;">
          <div style="font-weight:700;">${escapeHtml(j.subject)} - ${escapeHtml(j.kelas)}</div>
          <div style="font-size:13px;color:#92400e;">${escapeHtml(j.tanggal)} | Jam ke-${escapeHtml(j.jam_ke)} (${escapeHtml(jam.mulai)} - ${escapeHtml(jam.selesai)}) | 👤 ${escapeHtml(j.guru)}</div>
          <div class="text-strong" style="font-size:14px;margin:4px 0;">${escapeHtml(j.activity)}</div>
          <div style="margin-top:8px;"><button class="btn btn-success" style="padding:4px 14px;font-size:12px;" onclick="approveJournal('${j.key}')">✅ Setujui</button> <button class="btn btn-danger" style="padding:4px 14px;font-size:12px;margin-left:6px;" onclick="rejectJournal('${j.key}')">❌ Tolak</button></div>
        </div>`;
      });
    }

    // ============================================================
    // TEACHER ATTENDANCE (QR + Lokasi, tanpa foto)
    // ============================================================
    let qrScanRAF = null;
    let qrLastScan = 0, qrScanCount = 0; // pembatas laju decode jsQR
    let qrScanDetectedType = null; // 'Datang' | 'Pulang', diisi setelah QR & lokasi tervalidasi, siap dikonfirmasi
    let qrScanKeteranganTelat = null; // mis. "Telat 12 menit", diisi kalau Absen Datang lewat dari jam window
    let qrScanDetectedAt = null; // epoch ms saat QR + lokasi tervalidasi; dipakai sebagai jam absen kalau disimpan OFFLINE
    // Cache token & lokasi QR Absensi di perangkat supaya scan tetap bisa dimulai saat aplikasi dibuka
    // dalam keadaan offline (V4.absenQr normalnya hanya dimuat dari Firebase saat login).
    const ABSEN_QR_CACHE_KEY = 'simamba_absen_qr_cache';
    function v4CacheAbsenQr(data) {
      try { if (data && data.token) localStorage.setItem(ABSEN_QR_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
    }
    function v4PulihkanAbsenQrDariCache() {
      if (V4.absenQr && V4.absenQr.token) return true;
      if (isReallyOnline()) return false; // online: percaya data Firebase (null = memang belum diatur Admin)
      try {
        const raw = localStorage.getItem(ABSEN_QR_CACHE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw);
        if (d && d.token) { V4.absenQr = d; return true; }
      } catch (e) {}
      return false;
    }
    // Pastikan token QR Absensi ada di memori. Dulu: bila pembacaan saat login gagal/timeout (sinyal lemah), V4.absenQr tetap null dan guru
    // itu terus diberi "QR Absensi belum diatur Admin" walau Admin sudah mengatur -- padahal online dianggap "percaya Firebase". Sekarang bila token
    // kosong dan online, dibaca ulang dari Firebase (maks 8 dtk); bila gagal/timeout, pakai salinan di perangkat (localStorage) bila ada.
    let v4AbsenQrMuat = null, v4AbsenQrAlasan = '';   // alasan terakhir token tidak tersedia (ditampilkan di pesan supaya mudah dilacak)
    function v4PastikanAbsenQr() {
      if (V4.absenQr && V4.absenQr.token) return Promise.resolve(true);
      const dariCache = () => { try { const raw = localStorage.getItem(ABSEN_QR_CACHE_KEY), d = raw && JSON.parse(raw); if (d && d.token) { V4.absenQr = d; return true; } } catch (e) {} return false; };
      if (!isReallyOnline() || typeof db === 'undefined' || !db) { v4AbsenQrAlasan = navigator.onLine ? 'Firebase belum tersambung' : 'perangkat offline'; return Promise.resolve(dariCache()); }
      if (!v4AbsenQrMuat) v4AbsenQrMuat = new Promise(res => {
        let selesai = false;
        const fin = ok => { if (selesai) return; selesai = true; clearTimeout(t); v4AbsenQrMuat = null; res(ok); };
        const t = setTimeout(() => { v4AbsenQrAlasan = 'server tidak menjawab dalam 8 detik'; fin(dariCache()); }, 8000);
        db.ref('absen_qr_settings').once('value').then(snap => {
          const d = snap.val();
          if (d && d.token) { V4.absenQr = d; v4CacheAbsenQr(d); fin(true); } else { v4AbsenQrAlasan = d ? 'data QR ada tetapi token kosong' : 'node absen_qr_settings kosong di server'; fin(false); }   // kosong = benar-benar belum diatur Admin
        }).catch(e => { v4AbsenQrAlasan = 'gagal membaca (' + ((e && e.message) || e) + ')'; fin(dariCache()); });
      });
      return v4AbsenQrMuat;
    }
    function v4SetFaceStatus(html, bg, color, border) {
      const el = document.getElementById('faceStatus');
      if (!el) return;
      el.innerHTML = html; el.style.background = bg; el.style.color = color; el.style.borderColor = border;
    }
    function v4DeteksiTipeAbsenGuru() {
      if (!currentUser) return 'Datang';
      const today = tglLokal();
      const todayAbsen = allTeacherAttendance.filter(a => a.tanggal === today && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      const datangRec = todayAbsen.find(a => a.type === 'Datang');
      const pulangRec = todayAbsen.find(a => a.type === 'Pulang');
      if (datangRec && pulangRec) return null;
      // PERBAIKAN: Pulang hanya sah setelah Datang tercatat. Dulu guru yang belum Datang tetapi scan di jendela
      // Pulang (11:00-12:30) tercatat 'Pulang' tanpa Datang, lalu hilang dari hitungan hadir. Sekarang tanpa
      // catatan Datang selalu jadi 'Datang' (di luar jam: otomatis dicatat "Telat X menit"), jam tidak lagi menentukan.
      if (!datangRec) return 'Datang';
      return 'Pulang';
    }
    // Aksi cepat tombol FAB tengah bottom nav (gaya QRIS BRImo/e-wallet) -- langsung pindah ke
    // halaman Absen Guru DAN langsung memicu kamera, jadi guru tidak perlu 2 ketukan (buka
    // halaman lalu klik "Mulai Scan QR") kalau memang mau langsung scan absen.
    function bottomNavScanQr() {
      // Semua pengecekan yang sama dengan startCamera() (peran, sudah izin/sakit hari ini, QR
      // belum diatur Admin, browser tidak dukung kamera) dijalankan DULU sebelum pindah halaman.
      // Kalau memang tidak bisa scan, toast langsung muncul tanpa "terlempar" ke halaman Absen
      // Guru dulu. Kalau semua syarat terpenuhi, langsung ke kamera tanpa langkah tambahan.
      if (!isTeacher() && !isWaliKelas()) return toast('Hanya Guru & Wali Kelas!', true);
      if (typeof jsQR !== 'function') return toast('⚠️ Modul scan QR gagal dimuat. Cek koneksi internet lalu refresh halaman.', true);
      const izinSakitHariIni = allTeacherAttendance.find(a => a.tanggal === tglLokal() && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && (a.type === 'Izin' || a.type === 'Sakit'));
      if (izinSakitHariIni) return toast(`⚠️ Anda sudah melaporkan ${izinSakitHariIni.type} hari ini.`, true);
      v4PulihkanAbsenQrDariCache();
      if (!(V4.absenQr && V4.absenQr.token)) {   // token belum ada di memori: baca ulang dulu sebelum menyerah
        toast('⏳ Memuat data QR Absensi...', false, 1500);
        return v4PastikanAbsenQr().then(ok => { if (ok) bottomNavScanQr(); else toast(isReallyOnline() ? '⚠️ QR Absensi belum bisa dimuat' + (v4AbsenQrAlasan ? ' [' + v4AbsenQrAlasan + ']' : '') + '. Cek sinyal lalu coba lagi; bila tetap begini, hubungi Admin dan sebutkan tulisan di dalam kurung.' : '⚠️ Data QR Absensi belum tersimpan di perangkat ini. Sambungkan internet sekali lalu coba lagi.', true); });
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigateTo('teacher-attendance');
      startCamera();
    }
    function startCamera() {
      if (!isTeacher() && !isWaliKelas()) return toast('Hanya Guru & Wali Kelas!', true);
      if (typeof jsQR !== 'function') { toast('⚠️ Modul scan QR gagal dimuat. Cek koneksi internet lalu refresh halaman.', true); return; }
      const izinSakitHariIni = allTeacherAttendance.find(a => a.tanggal === tglLokal() && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && (a.type === 'Izin' || a.type === 'Sakit'));
      if (izinSakitHariIni) { toast(`⚠️ Anda sudah melaporkan ${izinSakitHariIni.type} hari ini.`, true); return; }
      v4PulihkanAbsenQrDariCache();
      if (!(V4.absenQr && V4.absenQr.token)) { v4PastikanAbsenQr().then(ok => { if (ok) startCamera(); else toast(isReallyOnline() ? '⚠️ QR Absensi belum bisa dimuat' + (v4AbsenQrAlasan ? ' [' + v4AbsenQrAlasan + ']' : '') + '. Cek sinyal lalu coba lagi; bila tetap begini, hubungi Admin dan sebutkan tulisan di dalam kurung.' : '⚠️ Data QR Absensi belum tersimpan di perangkat ini. Sambungkan internet sekali lalu coba lagi.', true); }); return; }
      const video = document.getElementById('video'), container = document.getElementById('videoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast('⚠️ Browser tidak support kamera!', true);
        v4SetFaceStatus('⚠️ Browser tidak support kamera. Hubungi Admin.', '#fee2e2', '#991b1b', '#dc2626');
        return;
      }
      // Segarkan token & lokasi QR dari Firebase di latar belakang (kalau Admin baru membuat token baru setelah
      // guru login, token di memori basi dan QR yang benar malah dibilang "tidak dikenali").
      if (isReallyOnline()) {
        try { db.ref('absen_qr_settings').once('value').then(snap => { const d = snap.val(); if (d && d.token) { V4.absenQr = d; v4CacheAbsenQr(d); } }).catch(() => {}); } catch (e) {}
      }
      document.getElementById('btnStartQrScan').style.display = 'none';
      document.getElementById('btnVerifyFace').style.display = 'none';
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(stream => {
          cameraStream = stream; video.srcObject = stream; container.style.display = 'block'; video.style.display = 'block'; video.play();
          v4SetFaceStatus('🔎 Arahkan kamera ke QR Absensi yang ditempel di madrasah...', '#dcfce7', '#065f46', '#059669');
          qrScanRAF = requestAnimationFrame(v4TickQrScan);
        })
        .catch(err => {
          console.error(err);
          toast('❌ Gagal akses kamera. Coba izinkan akses kamera.', true);
          v4SetFaceStatus('❌ Gagal akses kamera. Coba izinkan akses kamera.', '#fee2e2', '#991b1b', '#dc2626');
          document.getElementById('btnStartQrScan').style.display = 'block';
        });
    }
    function v4TickQrScan() {
      const video = document.getElementById('video'), canvas = document.getElementById('snapshotCanvas');
      if (!cameraStream) return; // sudah dihentikan
      const now = performance.now();
      // readyState >= 2 (bukan harus 4): banyak HP Android berhenti di 2/3 saat kamera sudah tampil.
      if (video.readyState >= 2 && video.videoWidth > 0 && now - qrLastScan >= 90) {
        qrLastScan = now; qrScanCount++;
        const skala = Math.min(1, 720 / video.videoWidth);
        const w = Math.round(video.videoWidth * skala), h = Math.round(video.videoHeight * skala);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, w, h);
        try {
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, w, h, { inversionAttempts: (qrScanCount % 4 === 0) ? 'attemptBoth' : 'dontInvert' });
          if (code && code.data) { v4HandleQrDetected(code.data); return; }
        } catch (e) { console.error('Gagal baca frame QR:', e); }
      }
      qrScanRAF = requestAnimationFrame(v4TickQrScan);
    }
    function v4HandleQrDetected(data) {
      if (!V4.absenQr || !V4.absenQr.token) { // Admin menghapus/mengganti QR saat guru sedang scan
        v4SetFaceStatus('⚠️ QR Absensi belum diatur Admin atau baru diubah. Muat ulang halaman lalu coba lagi.', '#fee2e2', '#991b1b', '#dc2626');
        stopCamera();
        return;
      }
      if (String(data).trim() !== String(V4.absenQr.token).trim()) {
        v4SetFaceStatus('❌ QR tidak dikenali, bukan QR Absensi resmi. Coba lagi...', '#fee2e2', '#991b1b', '#dc2626');
        qrScanRAF = requestAnimationFrame(v4TickQrScan);
        return;
      }
      // Pakai releaseCameraResources() (bukan stop-kamera manual inline, dan BUKAN stopCamera()
      // penuh -- stopCamera() juga mereset tombol "Mulai Scan QR" & status jadi idle, yang justru
      // bikin tombol itu muncul lagi & bisa diklik ulang selagi GPS masih diperiksa di bawah ini)
      // supaya cameraStream DAN qrScanRAF selalu dibersihkan BERSAMAAN dari satu tempat -- sebelumnya
      // di sini cameraStream di-null-kan sendiri tanpa ikut cancelAnimationFrame(qrScanRAF), jadi
      // qrScanRAF bisa menyimpan ID yang sudah tidak relevan/tidak pernah dibatalkan dengan benar.
      releaseCameraResources();
      document.getElementById('video').style.display = 'none';
      document.getElementById('videoContainer').style.display = 'none';
      v4SetFaceStatus('📍 QR terbaca! Memeriksa lokasi GPS...', '#fef3c7', '#92400e', '#d97706');
      if (!navigator.geolocation) {
        v4SetFaceStatus('⚠️ Perangkat tidak mendukung GPS. Absen tidak bisa dilanjutkan.', '#fee2e2', '#991b1b', '#dc2626');
        document.getElementById('btnStartQrScan').style.display = 'block';
        return;
      }
      const segarAbsen = v4SegarkanAbsenHariIni(); // dijalankan BERSAMAAN dengan pengambilan GPS (tidak menambah waktu tunggu)
      v4AmbilLokasiAbsen(pos => {
        const jarak = v4HitungJarakMeter(pos.coords.latitude, pos.coords.longitude, V4.absenQr.lat, V4.absenQr.lng);
        const radius = V4.absenQr.radius || 150;
        if (jarak > radius) {
          v4SetFaceStatus(`❌ Anda terlalu jauh dari madrasah (±${Math.round(jarak)}m, maksimal ${radius}m; akurasi GPS ±${Math.round(pos.coords.accuracy || 0)}m). Absen harus dilakukan di lokasi madrasah. Bila Anda sudah di madrasah, aktifkan GPS/lokasi akurasi tinggi lalu coba lagi.`, '#fee2e2', '#991b1b', '#dc2626');
          document.getElementById('btnStartQrScan').style.display = 'block';
          return;
        }
        segarAbsen.then(() => {
        const type = v4DeteksiTipeAbsenGuru();
        if (!type) {
          v4SetFaceStatus('✅ Anda sudah absen Datang & Pulang hari ini.', '#dcfce7', '#065f46', '#059669');
          document.getElementById('btnStartQrScan').style.display = 'none';
          return;
        }
        const now = new Date(), sekarangMenit = menitWIB(now);
        let keteranganTelat = null;
        if (type === 'Datang') {
          // Absen Datang lewat QR selalu diizinkan (tidak diblokir jam) — kalau lewat jam
          // window, cukup dicatat sebagai "Telat X menit", tidak perlu approval lagi.
          const window_ = getJamAbsenWindow('Datang');
          const selesai = window_.selesai.split(':'), selesaiMenit = parseInt(selesai[0]) * 60 + parseInt(selesai[1]);
          if (sekarangMenit > selesaiMenit) keteranganTelat = `Telat ${sekarangMenit - selesaiMenit} menit`;
        } else {
          // Absen Pulang SEKARANG SELALU DIIZINKAN begitu Absen Datang sudah tercatat -- sama
          // seperti Absen Datang, tidak lagi diblokir jendela jam. Kalau di luar jendela jam
          // Pulang normal, cukup dicatat sebagai keterangan ("Pulang lebih awal/lebih lambat X
          // menit"), TANPA perlu menunggu persetujuan Kepala Madrasah dulu untuk bisa absen.
          // Form "Ajukan Pulang Duluan" di halaman Absen Guru tetap tersedia sebagai catatan
          // alasan (opsional, untuk transparansi) yang ditinjau Admin/Kepala Madrasah setelahnya
          // -- bukan lagi syarat WAJIB sebelum bisa pulang.
          const window_ = getJamAbsenWindow('Pulang');
          const mulai = window_.mulai.split(':'), selesai = window_.selesai.split(':');
          const mulaiMenit = parseInt(mulai[0]) * 60 + parseInt(mulai[1]), selesaiMenit = parseInt(selesai[0]) * 60 + parseInt(selesai[1]);
          if (sekarangMenit < mulaiMenit) keteranganTelat = `Pulang lebih awal ${mulaiMenit - sekarangMenit} menit dari jadwal (${window_.mulai})`;
          else if (sekarangMenit > selesaiMenit) keteranganTelat = `Pulang lebih lambat ${sekarangMenit - selesaiMenit} menit dari jadwal (${window_.selesai})`;
        }
        qrScanDetectedType = type;
        qrScanKeteranganTelat = keteranganTelat;
        qrScanDetectedAt = now.getTime();
        const telatMsg = keteranganTelat ? ` <span style="color:#dc2626;font-weight:700;">(⚠️ ${keteranganTelat})</span>` : '';
        v4SetFaceStatus(`✅ Lokasi terverifikasi (±${Math.round(jarak)}m dari madrasah). Siap absen <b>${type}</b> pukul ${now.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})} WIB${telatMsg}. Klik "Konfirmasi Absen".`, '#dcfce7', '#065f46', '#059669');
        document.getElementById('btnVerifyFace').textContent = `✅ Konfirmasi Absen ${type}`;
        document.getElementById('btnVerifyFace').style.display = 'block';
        document.getElementById('btnStartQrScan').style.display = 'none';
        // Ring hijau berkedip 3x supaya mata langsung tertuju ke tombol konfirmasi begitu
        // muncul -- class dilepas lagi setelah animasi selesai (~2.7s) supaya tidak berkedip
        // terus-menerus dan tidak mengganggu tap berikutnya.
        const btnConfirm = document.getElementById('btnVerifyFace');
        btnConfirm.classList.add('btn-confirm-pulse');
        setTimeout(() => btnConfirm.classList.remove('btn-confirm-pulse'), 2700);
        });
      }, err => {
        console.error(err);
        const hint = err && err.code === 1 ? 'Izin lokasi ditolak: buka pengaturan situs/browser, izinkan Lokasi untuk aplikasi ini.' : 'Pastikan GPS aktif dan izin lokasi diberikan, lalu coba lagi.';
        v4SetFaceStatus('❌ Gagal mengambil lokasi GPS' + (err && err.message ? ' (' + err.message + ')' : '') + '. ' + hint, '#fee2e2', '#991b1b', '#dc2626');
        document.getElementById('btnStartQrScan').style.display = 'block';
      });
    }
    // GPS akurasi tinggi dulu (10 dtk); bila timeout/tidak tersedia, ulangi dengan akurasi biasa & lokasi tersimpan <=2 menit
    // (di dalam gedung GPS akurasi tinggi sering timeout padahal lokasi jaringan cukup untuk radius madrasah).
    function v4AmbilLokasiAbsen(sukses, gagal) {
      navigator.geolocation.getCurrentPosition(sukses, err => {
        if (err && err.code === 1) { gagal(err); return; } // izin ditolak: tidak ada gunanya mengulang
        navigator.geolocation.getCurrentPosition(sukses, gagal, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }
    // Pastikan catatan Datang/Pulang hari ini yang SUDAH ada di Firebase ikut diperhitungkan sebelum menentukan jenis absen
    // (key catatan tetap: tanggal_guru_tipe). Tanpa ini, bila dataset belum termuat, guru yang sudah Datang bisa dianggap
    // "Datang" lagi dan Pulang-nya tidak pernah tercatat.
    function v4SegarkanAbsenHariIni() {
      if (!currentUser || !navigator.onLine) return v4CekAntreanAbsenHariIni();
      const today = tglLokal(), g = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g, '_');
      const punyaSaya = a => a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name;
      const tambah = (v, key) => {
        if (!v || (v.type !== 'Datang' && v.type !== 'Pulang') || v.tanggal !== today || !punyaSaya(v)) return;
        if (!allTeacherAttendance.some(a => a.tanggal === today && a.type === v.type && punyaSaya(a))) { v.key = key; allTeacherAttendance.push(v); bumpTaRev(); }
      };
      const baca = tipe => db.ref(`teacher_attendance/${today}_${g}_${tipe}`).once('value').then(snap => tambah(snap.val(), snap.key)).catch(() => {});
      // Cadangan (jalan BERSAMAAN, bukan menunggu baca() selesai): catatan dengan key di luar pola tanggal_guruKey_tipe (hasil edit/koreksi,
      // key lama berbasis nama, push-id) tidak ketemu lewat baca(). Query per tanggal lalu cocokkan guruKey/nama -- tanpa syarat tahunAjaran.
      const cadangan = db.ref('teacher_attendance').orderByChild('tanggal').equalTo(today).once('value').then(snap => {
        snap.forEach(child => { tambah(child.val(), child.key); }); // callback TIDAK boleh me-return nilai truthy
      }).catch(() => {});
      return Promise.race([Promise.all([baca('Datang'), baca('Pulang'), cadangan, v4CekAntreanAbsenHariIni()]), new Promise(r => setTimeout(r, 7000))]);
    }
    // Absen Datang/Pulang yang diantre offline di perangkat ini (belum terkirim) tetap dihitung sebagai "sudah absen".
    function v4CekAntreanAbsenHariIni() {
      try {
        if (!currentUser || !window.SIMambaOfflineDB || !SIMambaOfflineDB.getAllPendingWrites) return Promise.resolve();
        const today = tglLokal();
        return SIMambaOfflineDB.getAllPendingWrites().then(items => {
          (items || []).forEach(it => {
            const p = it && it.type === 'teacher_attendance' && it.payload; if (!p || p.tanggal !== today) return;
            if (!(p.guruKey ? p.guruKey === currentUser.key : p.guru === currentUser.name)) return;
            if (!allTeacherAttendance.some(a => a.tanggal === today && a.type === p.type && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name))) {
              allTeacherAttendance.push(Object.assign({ key: 'pending-' + it.id, pendingSync: true }, p)); bumpTaRev();
            }
          });
        }).catch(() => {});
      } catch (e) { return Promise.resolve(); }
    }
    // Lepas stream kamera + batalkan RAF scan QR SAJA, tanpa reset tombol/status ke kondisi idle
    // -- dipakai bersama oleh stopCamera() (reset penuh, dipanggil saat user batal/keluar halaman)
    // dan v4HandleQrDetected() (QR sudah kebaca, lanjut ke tahap verifikasi GPS -- tombol "Mulai
    // Scan QR" TIDAK boleh dimunculkan lagi selagi proses itu berjalan).
    function releaseCameraResources() {
      if (qrScanRAF) { cancelAnimationFrame(qrScanRAF); qrScanRAF = null; }
      if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
    }
    function stopCamera() {
      releaseCameraResources();
      const video = document.getElementById('video'), container = document.getElementById('videoContainer');
      if (video) { video.srcObject = null; video.style.display = 'none'; }
      if (container) container.style.display = 'none';
      qrScanDetectedType = null;
      qrScanKeteranganTelat = null;
      qrScanDetectedAt = null;
      const btnStart = document.getElementById('btnStartQrScan'), btnVerify = document.getElementById('btnVerifyFace');
      if (btnStart) btnStart.style.display = 'block';
      if (btnVerify) btnVerify.style.display = 'none';
      v4SetFaceStatus('⏳ Klik "Mulai Scan QR" untuk absen', '#fef3c7', '#92400e', '#d97706');
    }
    // [Dipindah ke js/event-ujian.js] Event & Ujian (form admin, daftar, daftar hadir, check-in kamera).
    // Cek apakah suatu "jam ke-N" ditandai sebagai Ekstrakurikuler — dinamis dari jamSettings
    // (bukan hardcode "jam ke-4" lagi), supaya Admin bebas atur jumlah jam & jam mana yang ekstra.
    function isJamEkstra(jamKe) {
      return !!(jamSettings[jamKe] && jamSettings[jamKe].isEkstra);
    }
    function getJamAbsenWindow(type) {
      if (type === 'Datang') return Object.assign({}, JENDELA_ABSEN.datang);
      // Jendela Absen Pulang: beda untuk Jumat & Sabtu (pulang lebih awal), hari lain memakai jendela normal.
      const hari = hariWIB(); // 0=Minggu, 5=Jumat, 6=Sabtu (WIB)
      if (hari === 5) return Object.assign({}, JENDELA_ABSEN.pulangJumat);
      if (hari === 6) return Object.assign({}, JENDELA_ABSEN.pulangSabtu);
      return Object.assign({}, JENDELA_ABSEN.pulang);
    }
    function updateLabelJamPulang() {
      const w = getJamAbsenWindow('Pulang');
      const teks = `${w.mulai}-${w.selesai}`;
      const wd = getJamAbsenWindow('Datang'), elD = document.getElementById('labelJamDatangQuota');
      if (elD) elD.textContent = `${wd.mulai}-${wd.selesai}`;
      ['labelJamPulangInfo','labelJamPulangRadio','labelJamPulangBlock','labelJamPulangQuota'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = teks;
      });
    }
    function sudahAbsenTipeIni(type, today) {
      const todayAbsen = allTeacherAttendance.filter(a => a.tanggal === today && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      return todayAbsen.find(a => a.type === type) || null;
    }
    // [Dipindah ke js/pengingat-absen-guru.js] tabel absen guru Admin.
    // [Dipindah ke js/pengingat-absen-guru.js] pengingat otomatis/massal, Belum Absen, watchMyReminders.
    function tanganiGagalAlpha(onDone) {
      if (alphaAutoCheckedThisSession || alphaRetryTimer) return;
      if (alphaRetryCount >= ALPHA_RETRY_DELAYS_MS.length) {
        toast('⚠️ Penandaan Alpha otomatis belum berhasil setelah beberapa percobaan. Muat ulang halaman saat koneksi stabil.', true, 7000);
        return;
      }
      if (alphaRetryCount === 0) toast('⚠️ Penandaan Alpha guru gagal tersimpan, akan dicoba ulang otomatis.', true, 5000);
      const tunda = ALPHA_RETRY_DELAYS_MS[alphaRetryCount++];
      alphaRetryTimer = setTimeout(() => {
        alphaRetryTimer = null;
        if (!isAdmin() || alphaAutoCheckedThisSession) return;
        autoMarkAlphaGuru(onDone);
      }, tunda);
    }
    function autoMarkAlphaGuru(onDone) {
      if (!isAdmin()) return;
      if (alphaAutoCheckRunning) return; // sudah ada proses lain yang jalan, jangan tumpang tindih
      alphaAutoCheckRunning = true;
      // Flag dilepas oleh .finally() di ujung Promise.all (menungguAsync=true). Semua jalur lain -- early return
      // maupun EXCEPTION SINKRON sebelum Promise.all terbentuk (mis. localStorage diblokir, ref.set() melempar
      // karena ada nilai undefined) -- dilepas oleh finally di bawah. Dulu exception sinkron membuat flag
      // nyangkut true selamanya: pemanggilan berikutnya diam-diam `return` & Alpha tak pernah ditandai lagi
      // sampai halaman di-reload, sementara error-nya menjalar ke pemanggil (renderFullUI).
      let menungguAsync = false;
      try {
      const today = new Date();
      const todayStr = tglLokal(today);
      // PERBAIKAN: rentang tanggal dihitung sebagai STRING tanggal WIB (YYYY-MM-DD), bukan objek Date berjam.
      // Dulu loop memakai `d < today` (today = sekarang, berjam): untuk startDate jam 00:00 HARI INI kondisi itu
      // benar, sehingga hari ini ikut ditandai Alpha pagi-pagi sebelum guru sempat absen.
      const tambahHari = (str, n) => { const x = new Date(str + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
      let lastCheck = localStorage.getItem('alphaCheckLastDate');
      if (lastCheck && !/^\d{4}-\d{2}-\d{2}$/.test(lastCheck)) lastCheck = null; // nilai rusak -> anggap belum pernah
      let startStr = lastCheck ? tambahHari(lastCheck, 1) : tambahHari(todayStr, -14);
      const batasAwalStr = tambahHari(todayStr, -60); // pengaman: perangkat lama tidak dibuka berbulan-bulan tidak memicu ratusan tulisan
      if (startStr < batasAwalStr) startStr = batasAwalStr;


      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      if (guruAktif.length === 0) { localStorage.setItem('alphaCheckLastDate', tglLokal(new Date(today.getTime() - 86400000))); alphaAutoCheckRunning = false; if (onDone) onDone(); return; }
      const tanggalList = [];
      for (let tgl = startStr; tgl < todayStr; tgl = tambahHari(tgl, 1)) { // strictly < hari ini (WIB)
        if (new Date(tgl + 'T00:00:00Z').getUTCDay() === 0) continue; // lewati hari Minggu
        tanggalList.push(tgl);
      }
      if (tanggalList.length === 0) { localStorage.setItem('alphaCheckLastDate', tglLokal(new Date(today.getTime() - 86400000))); alphaAutoCheckRunning = false; if (onDone) onDone(); return; }
      let jumlahDitandai = 0;
      const tugas = [];
      tanggalList.forEach(tgl => {
        guruAktif.forEach(g => {
          // FIX: dulu fallback ke cocokkan lewat NAMA kalau catatan absensi (a) tidak punya
          // guruKey -- ini cuma melihat sisi record lama, bukan sisi guru g yang sedang diproses.
          // Kalau ada 2 guru bernama sama (g.key beda) dan salah satunya SUDAH punya catatan hari
          // itu (dengan/tanpa guruKey), guru satunya ikut dianggap "sudah ada" gara-gara nama
          // sama, jadi Alpha-nya tidak pernah ditandai -- kelihatan seperti "gagal permanen"
          // padahal ketimpa false-positive nama kembar. Sekarang: kalau guru yg diproses (g)
          // punya key, WAJIB cocokkan lewat key (bukan fallback nama); fallback nama hanya kalau
          // guru itu sendiri memang tidak punya key sama sekali.
          const sudahAda = allTeacherAttendance.some(a => a.tanggal === tgl && (g.key ? a.guruKey === g.key : (!a.guruKey && a.guru === g.name)));
          if (!sudahAda) {
            jumlahDitandai++;
            // FIX: dulu pakai push() (key acak) -- kalau fungsi ini kepanggil 2x hampir bersamaan
            // (mis. dua tab admin, atau interval jalan lagi sebelum allTeacherAttendance sempat
            // ter-reload), keduanya sama2 lolos cek "sudahAda" di atas & bikin 2 record Alpha
            // dobel utk guru+tanggal yang sama. Sekarang pakai KEY TETAP (sama polanya dengan
            // verifyAndAbsen di atas) supaya penulisan kedua otomatis menimpa yang pertama, bukan
            // bikin record baru -- Alpha utk 1 guru di 1 tanggal dijamin cuma ada 1 di database.
            const guruKeyAman = g.key || (g.name || '').replace(/[^a-zA-Z0-9]/g,'_');
            const ref = db.ref(`teacher_attendance/${tgl}_${guruKeyAman}_Alpha`);
            tugas.push(adminSesiSiap(true).then(() => ref.set({ tanggal: tgl, guru: g.name, guruKey: g.key || null, kelas: g.kelas || [], type: 'Alpha', keterangan: 'Tidak ada laporan kehadiran (ditandai otomatis sistem)', tahunAjaran: currentTahunAjaran, waktu: new Date(tgl + 'T23:59:00').getTime(), metode: 'otomatis_sistem' })));
          }
        });
      });
      menungguAsync = true;
      Promise.all(tugas).then(() => {
        alphaRetryCount = 0; if (alphaRetryTimer) { clearTimeout(alphaRetryTimer); alphaRetryTimer = null; }
        localStorage.setItem('alphaCheckLastDate', tglLokal(new Date(today.getTime() - 86400000)));
        if (jumlahDitandai > 0) { toast(`🔔 ${jumlahDitandai} catatan Alpha guru ditandai otomatis untuk hari-hari sebelumnya.`); addLog('auto_tandai_alpha', jumlahDitandai + ' catatan'); reloadDataset('teacherAttendance'); }
        if (onDone) onDone();
      }).catch(err => {
        // SENGAJA tidak memanggil onDone() di sini dan tidak memajukan alphaCheckLastDate:
        // kalau sebagian penulisan gagal (mis. koneksi putus), checkpoint dibiarkan tetap di
        // tanggal lama supaya seluruh rentang tanggal ini dicoba ulang dari awal -- baik oleh
        // percobaan otomatis berikutnya (lihat alphaAutoCheckedThisSession) maupun dipanggil
        // manual. Menulis ulang record yang sudah sukses tidak masalah karena key-nya deterministik
        // (tgl_guruKey_Alpha), jadi retry ini idempotent, bukan bikin duplikat.
        console.error('Gagal auto-tandai alpha (akan dicoba ulang pada kesempatan berikutnya):', err);
        tanganiGagalAlpha(onDone);
      }).finally(() => { alphaAutoCheckRunning = false; });
      } catch (err) {
        // Checkpoint alphaCheckLastDate belum maju -> seluruh rentang dicoba ulang di kesempatan berikutnya (idempotent).
        console.error('[SI MAMBA] autoMarkAlphaGuru gagal sebelum selesai menulis:', err);
        tanganiGagalAlpha(onDone);
      } finally {
        if (!menungguAsync) alphaAutoCheckRunning = false;
      }
    }
    // Membersihkan catatan Alpha OTOMATIS yang keliru (warisan bug lama): (a) Alpha bertanggal hari ini atau
    // sesudahnya, (b) Alpha pada tanggal yang guru itu ternyata punya catatan Datang/Pulang/Izin/Sakit.
    // Hanya menyentuh catatan buatan sistem (keterangan "ditandai otomatis sistem", key ..._Alpha, tanpa field metode);
    // koreksi manual Admin tidak pernah dihapus.
    function bersihkanAlphaKeliru() {
      if (!isAdmin() || !isReallyOnline()) return;
      try {
        const todayStr = tglLokal();
        const idGuru = a => a.guruKey || a.guru;
        const adaCatatanLain = new Set();
        allTeacherAttendance.forEach(a => { if (a.type === 'Datang' || a.type === 'Pulang' || a.type === 'Izin' || a.type === 'Sakit') adaCatatanLain.add(a.tanggal + '|' + idGuru(a)); });
        const hapus = allTeacherAttendance.filter(a => a.type === 'Alpha' && a.key && /_Alpha$/.test(String(a.key)) && !a.metode &&
          String(a.keterangan || '').indexOf('ditandai otomatis sistem') >= 0 &&
          ((a.tanggal || '') >= todayStr || adaCatatanLain.has(a.tanggal + '|' + idGuru(a))));
        if (hapus.length === 0) return;
        const updates = {}; hapus.forEach(a => { updates[a.key] = null; });
        adminSesiSiap(true).then(() => db.ref('teacher_attendance').update(updates)).then(() => {
          addLog('bersihkan_alpha_keliru', hapus.length + ' catatan');
          toast(`🧹 ${hapus.length} catatan Alpha otomatis yang keliru dibersihkan.`);
          reloadDataset('teacherAttendance');
        }).catch(err => console.error('[SI MAMBA] Gagal membersihkan Alpha keliru:', err));
      } catch (err) { console.error('[SI MAMBA] bersihkanAlphaKeliru:', err); }
    }
    function verifyAndAbsen() {
      if (!isTeacher() && !isWaliKelas()) return toast('Hanya Guru & Wali Kelas!', true);
      const btnVerify = document.getElementById('btnVerifyFace');
      // Guard ganda: cek tombol disabled DAN flag isBusy terpisah, supaya walau ada dua event klik
      // yang nyaris bersamaan (mis. double-tap di layar sentuh), keduanya tetap tidak bisa lolos
      // sama-sama menyimpan absen (memastikan guru benar-benar hanya 1x Datang & 1x Pulang per hari).
      if (btnVerify.disabled || isBusy('verifyAndAbsen')) { toast('⏳ Proses sedang berjalan...', false, 2000); return; }
      if (!qrScanDetectedType) { toast('⚠️ Scan QR dulu sebelum konfirmasi!', true); return; }
      const today0 = tglLokal();
      const izinSakitHariIni = allTeacherAttendance.find(a => a.tanggal === today0 && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && (a.type === 'Izin' || a.type === 'Sakit'));
      if (izinSakitHariIni) { toast(`⚠️ Anda sudah melaporkan ${izinSakitHariIni.type} hari ini, tidak bisa absen Datang/Pulang.`, true); return; }
      const type = qrScanDetectedType, keteranganTelat = qrScanKeteranganTelat, today = tglLokal();
      // ===== Batas 1x Datang & 1x Pulang per hari — dicek di sini SEBELUM titik async manapun,
      // sehingga tidak ada celah waktu bagi klik kedua untuk lolos sebelum tombol ter-disable. =====
      const absenSebelumnya = sudahAbsenTipeIni(type, today);
      if (absenSebelumnya) { const waktu = absenSebelumnya.waktu ? new Date(absenSebelumnya.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'; v4SetFaceStatus(`⚠️ Anda sudah absen ${type} hari ini pada ${waktu}!`, '#fee2e2', '#991b1b', '#dc2626'); toast(`⚠️ Sudah absen ${type} hari ini pada ${waktu}`, true); return; }
      isVerifying = true; setBusy('verifyAndAbsen', btnVerify); btnVerify.textContent = '⏳ Memproses...';
      v4SetFaceStatus('⏳ Menyimpan absen... <span class="loading-spinner"></span>', '#fef3c7', '#92400e', '#d97706');
      // PENTING: sebelumnya pakai db.ref('teacher_attendance').push() -- key-nya acak, jadi
      // pengecekan "sudah absen atau belum" di atas (sudahAbsenTipeIni) HANYA mengandalkan data
      // di memori browser. Kalau guru buka aplikasi di 2 perangkat/tab hampir bersamaan, atau
      // koneksi sempat lag, keduanya bisa lolos pengecekan sebelum salah satu selesai tersimpan
      // -- hasilnya DUA catatan "Datang" di hari yang sama (tumpang tindih). Sekarang pakai KEY
      // TETAP (tanggal+guru+type) + transaction() Firebase, supaya keunikannya dijamin betul-betul
      // di database, bukan cuma di memori satu sesi browser -- siapapun yang menulis LEBIH DULU
      // menang, yang belakangan otomatis ditolak walau lolos pengecekan awal di kliennya masing-masing.
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const fbKeyAbsen = `${today}_${guruKeyAman}_${type}`;
      const dbRef = db.ref(`teacher_attendance/${fbKeyAbsen}`);
      const waktuScan = qrScanDetectedAt || Date.now();
      // ---- Simpan OFFLINE: masuk antrean perangkat, dikirim otomatis saat online (key tetap = idempoten) ----
      function simpanAbsenOffline() {
        isVerifying = false; clearBusy('verifyAndAbsen', btnVerify);
        if (!window.SIMambaOfflineDB) {
          v4SetFaceStatus('❌ Offline & penyimpanan offline tidak tersedia di perangkat ini. Sambungkan internet lalu coba lagi.', '#fee2e2', '#991b1b', '#dc2626');
          toast('❌ Offline: absen tidak bisa disimpan. Sambungkan internet lalu coba lagi.', true);
          return;
        }
        const ketOffline = (keteranganTelat ? keteranganTelat + ' · ' : '') + 'Absen offline, dikirim saat online';
        const payload = { tanggal: today, guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, waktu: waktuScan, type: type, tahunAjaran: currentTahunAjaran, metode: 'qr_lokasi', verified: true, keterangan: ketOffline, _fbKey: fbKeyAbsen };
        const localRecord = Object.assign({ key: 'pending-teacher-attendance-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), pendingSync: true }, payload);
        delete localRecord._fbKey;
        allTeacherAttendance.push(localRecord); bumpTaRev();
        qrScanDetectedType = null; qrScanKeteranganTelat = null; qrScanDetectedAt = null;
        SIMambaOfflineDB.addPendingWrite('teacher_attendance', payload).then(id => {
          localRecord._pendingId = id;
          updatePendingBadge(); registerBackgroundSyncTag();
        }).catch(err => {
          console.error('[Offline] Gagal antre absen guru:', err);
          const i = allTeacherAttendance.indexOf(localRecord); if (i > -1) allTeacherAttendance.splice(i, 1); bumpTaRev();
          renderTeacherAttendance();
          toast('❌ Gagal menyimpan absen offline. Coba lagi.', true);
        });
        v4SetFaceStatus(`📥 Absen ${type} tersimpan di perangkat${keteranganTelat ? ' (' + keteranganTelat + ')' : ''} — akan otomatis terkirim saat online.`, '#fef3c7', '#92400e', '#d97706');
        toast(`📥 Offline: absen ${type} disimpan di perangkat ini, dikirim otomatis saat online.`, false, 4500);
        renderTeacherAttendance(); renderJikaAktif('dashboard', updateDashboard); stopCamera();
      }
      if (!isReallyOnline()) { simpanAbsenOffline(); return; }
      // Sinyal bisa putus SETELAH pengecekan di atas -- transaction() Firebase lalu menggantung tanpa error.
      // Kalau 15 detik tak ada jawaban, alihkan ke antrean offline. Aman dari dobel: key sama + pengiriman
      // ulang memakai transaction yang menolak kalau data sudah ada.
      let transaksiSelesai = false, dialihkanOffline = false;
      const timerFallback = setTimeout(() => { if (transaksiSelesai) return; dialihkanOffline = true; simpanAbsenOffline(); }, 15000);
      guruSesiSiap().then(() => dbRef.transaction(existing => {
        if (existing !== null) return; // sudah ada -- batalkan transaksi, jangan ditimpa
        return { tanggal: today, guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, waktu: firebase.database.ServerValue.TIMESTAMP, type: type, tahunAjaran: currentTahunAjaran, metode: 'qr_lokasi', verified: true, keterangan: keteranganTelat || null };
      }, (err, committed, snapshot) => {
        if (dialihkanOffline) return; // sudah masuk antrean offline; pengiriman ulang akan merapikan sisanya
        transaksiSelesai = true; clearTimeout(timerFallback);
        isVerifying = false; clearBusy('verifyAndAbsen', btnVerify);
        qrScanDetectedType = null; qrScanKeteranganTelat = null; qrScanDetectedAt = null;
        if (err) { toast('Gagal: '+err.message, true); v4SetFaceStatus('❌ Gagal: ' + err.message, '#fee2e2', '#991b1b', '#dc2626'); console.error(err); return; }
        if (!committed) {
          // Kalah transaksi -- artinya sudah ada catatan tersimpan lebih dulu (dari perangkat/tab
          // lain, atau klik lain), bukan error biasa. Tampilkan seperti kondisi "sudah absen".
          toast(`⚠️ Sudah absen ${type} hari ini (tercatat dari sesi lain).`, true);
          v4SetFaceStatus(`⚠️ Sudah absen ${type} hari ini.`, '#fee2e2', '#991b1b', '#dc2626');
          reloadDataset('teacherAttendance', () => renderTeacherAttendance());
          return;
        }
        v4SetFaceStatus(`✅ Absen ${type} berhasil${keteranganTelat ? ' (' + keteranganTelat + ')' : ''}! 🎉`, '#dcfce7', '#065f46', '#059669'); toast(`✅ Absen ${type} berhasil!` + (keteranganTelat ? ' ⚠️ ' + keteranganTelat : '')); addLog('absen_guru', type + (keteranganTelat ? ' - ' + keteranganTelat : ''));
        const newAttendance = { tanggal: today, guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, waktu: (snapshot && snapshot.val() && snapshot.val().waktu) || Date.now(), type: type, key: snapshot.key, tahunAjaran: currentTahunAjaran, metode: 'qr_lokasi', keterangan: keteranganTelat || null };
        allTeacherAttendance.push(newAttendance); bumpTaRev();
        renderTeacherAttendance(); renderJikaAktif('dashboard', updateDashboard); stopCamera();
      }));
    }
    function renderTeacherAttendance() {
      const container = document.getElementById('teacherAttendanceHistory');
      if (!isTeacher() && !isWaliKelas()) { container.innerHTML = '<p style="color:#dc2626;text-align:center;padding:12px;">🔒 Hanya Guru & Wali Kelas yang bisa absen</p>'; return; }
      const today = tglLokal();
      let todayAbsen = allTeacherAttendance.filter(a => a.tanggal === today && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      // RAPIKAN: (1) urutan tampil dipaksa Datang -> Pulang -> Izin/Sakit -> lainnya, tidak lagi
      // mengandalkan urutan data mentah dari Firebase. (2) kalau ada data DOBEL untuk tipe yang
      // sama (mis. sisa dari sebelum perbaikan anti-tumpang-tindih di atas, atau data lama),
      // histori pribadi ini cuma menampilkan SATU per tipe (Datang = paling awal, Pulang = paling
      // akhir) supaya tidak terlihat tumpang tindih -- data mentahnya tidak dihapus, cuma
      // tampilannya dirapikan; kalau Admin perlu melihat/membersihkan data dobel itu sendiri,
      // itu perlu dicek terpisah di menu Kelola Absensi Guru.
      const urutanTipe = { 'Datang': 1, 'Pulang': 2, 'Izin': 3, 'Sakit': 3 };
      const ambilSatu = (tipe, pilihPalingAkhir) => {
        const list = todayAbsen.filter(a => a.type === tipe).sort((a,b) => waktuMs(a.waktu) - waktuMs(b.waktu));
        return list.length ? (pilihPalingAkhir ? list[list.length-1] : list[0]) : null;
      };
      const adaDobel = ['Datang','Pulang'].some(t => todayAbsen.filter(a => a.type === t).length > 1);
      todayAbsen = [ambilSatu('Datang', false), ambilSatu('Pulang', true), ambilSatu('Izin', false), ambilSatu('Sakit', false)]
        .filter(Boolean)
        .sort((a,b) => (urutanTipe[a.type]||9) - (urutanTipe[b.type]||9));
      container.innerHTML = '';
      const izinSakit = todayAbsen.find(a => a.type === 'Izin' || a.type === 'Sakit');
      const btnVerify = document.getElementById('btnVerifyFace'), izinSakitBtn = document.querySelector('button[onclick="toggleIzinSakitForm()"]');
      if (izinSakit) { if (btnVerify) btnVerify.disabled = true; if (izinSakitBtn) izinSakitBtn.disabled = true; }
      else { if (btnVerify) btnVerify.disabled = !(isTeacher() || isWaliKelas()); if (izinSakitBtn) izinSakitBtn.disabled = false; }
      if (todayAbsen.length === 0) { container.innerHTML = '<div class="text-muted border-muted" style="padding:12px;text-align:center;background:#f9fafb;border-radius:8px;">📭 Belum ada absen hari ini</div>'; return; }
      if (izinSakit) {
        const icon = izinSakit.type === 'Sakit' ? '🤒' : '📝';
        container.innerHTML = `<div style="padding:12px;background:#fef3c7;border-radius:8px;border-left:4px solid #d97706;"><div style="font-weight:700;">${icon} ${escapeHtml(izinSakit.type)}</div>${izinSakit.keterangan ? `<div style="font-size:13px;color:#92400e;margin-top:4px;">${escapeHtml(izinSakit.keterangan)}</div>` : ''}<div class="text-muted" style="font-size:12px;margin-top:4px;">Dilaporkan ${izinSakit.waktu ? new Date(izinSakit.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'}</div></div>`;
        return;
      }
      const datang = todayAbsen.find(a => a.type === 'Datang'), pulang = todayAbsen.find(a => a.type === 'Pulang');
      let jamKerjaHtml = '';
      if (datang && pulang && datang.waktu && pulang.waktu) {
        const menit = Math.max(0, Math.round((waktuMs(pulang.waktu) - waktuMs(datang.waktu)) / 60000));
        jamKerjaHtml = `<span style="color:#2563eb;">⏱️ ${Math.floor(menit/60)} jam ${menit%60} menit</span>`;
      }
      let html = `<div class="text-muted" style="margin-bottom:8px;font-size:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;"><span>${datang ? '✅' : '⬜'} Datang</span><span>${pulang ? '✅' : '⬜'} Pulang</span>${jamKerjaHtml}</div>`;
      if (adaDobel) html += `<div style="margin-bottom:8px;padding:6px 10px;background:#fffbeb;border-radius:6px;font-size:11px;color:#92400e;">ℹ️ Ada lebih dari satu catatan untuk hari ini di data — hanya yang paling relevan ditampilkan di sini.</div>`;
      todayAbsen.forEach((a) => {
        const isDatang = a.type === 'Datang', bgColor = isDatang ? '#f0fdf4' : '#fef3c7', borderColor = isDatang ? '#059669' : '#d97706', typeLabel = isDatang ? '🌅 Datang' : '🌇 Pulang', metode = a.metode === 'qr_lokasi' ? '📍 QR+Lokasi' : (a.metode === 'kamera_validasi' ? '📸 Kamera' : '📌 Manual');
        const fotoThumb = a.foto ? `<img src="${a.foto}" alt="Foto absen" style="width:40px;height:40px;object-fit:cover;border-radius:6px;cursor:pointer;" onclick="lihatFotoBesar(this.src)">` : '';
        const telatBadge = (a.keterangan ? `<span class="metode-badge" style="background:#fee2e2;color:#991b1b;">⚠️ ${escapeHtml(a.keterangan)}</span>` : '') + (a.pendingSync ? '<span class="metode-badge" style="background:#fef3c7;color:#92400e;">🕓 Belum tersinkron</span>' : '');
        html += `<div class="teacher-attendance-item ${isDatang ? 'reguler' : 'non-reguler'}"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">${fotoThumb}<div><div style="font-weight:600;font-size:14px;">${typeLabel}</div><div class="text-muted" style="font-size:12px;">${a.waktu ? new Date(a.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-'}</div></div></div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${telatBadge}<span class="metode-badge">${metode}</span></div></div>`;
      });
      container.innerHTML = html;
    }
    // Lightbox sederhana buat lihat foto absen/check-in ukuran besar. Dipakai menggantikan
    // window.open(dataUrl) -- banyak browser memblokir/tidak konsisten membuka data: URL
    // lewat window.open, sedangkan overlay ini murni DOM jadi selalu jalan.
    function lihatFotoBesar(dataUrl) {
      if (!dataUrl) return;
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;';
      overlay.innerHTML = `<img src="${dataUrl}" style="max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.5);">`;
      overlay.onclick = () => overlay.remove();
      document.body.appendChild(overlay);
    }
    function toggleIzinSakitForm() {
      const form = document.getElementById('izinSakitForm');
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
    function submitIzinSakit() {
      if (!isTeacher() && !isWaliKelas()) return toast('Hanya Guru & Wali Kelas!', true);
      if (isBusy('submitIzinSakit')) return toast('⏳ Sedang mengirim, mohon tunggu...', false, 1500);
      const today = tglLokal();
      const sudahAda = allTeacherAttendance.find(a => a.tanggal === today && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      if (sudahAda) return toast('⚠️ Anda sudah punya catatan kehadiran hari ini!', true);
      const type = document.querySelector('input[name="izinSakitType"]:checked').value;
      const keterangan = document.getElementById('izinSakitKeterangan').value.trim();
      const btn = document.getElementById('btnSubmitIzinSakit');
      setBusy('submitIzinSakit', btn);
      // Sama seperti absen Datang/Pulang & check-in Acara/Ujian: key tetap + transaction() supaya
      // laporan dobel (mis. tombol terpencet 2x lewat tab/device berbeda) tertolak atomik di server.
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const dbRef = db.ref(`teacher_attendance/${today}_${guruKeyAman}_${type}`);
      const dataBaru = { tanggal: today, guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, waktu: firebase.database.ServerValue.TIMESTAMP, type: type, keterangan: keterangan || null, tahunAjaran: currentTahunAjaran, metode: 'lapor_sendiri' };
      guruSesiSiap().then(() => dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        clearBusy('submitIzinSakit', btn);
        if (err) return toast('Gagal: '+err.message, true);
        if (!committed) { toast('⚠️ Anda sudah punya catatan kehadiran hari ini (tercatat dari sesi lain).', true); reloadDataset('teacherAttendance', () => renderTeacherAttendance()); return; }
        toastTersimpan(`Laporan ${type} terkirim`);
        addLog('lapor_izin_sakit', type + (keterangan ? ' - ' + keterangan : ''));
        document.getElementById('izinSakitKeterangan').value = '';
        document.getElementById('izinSakitForm').style.display = 'none';
        const newRecord = { tanggal: today, guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, waktu: (snapshot && snapshot.val() && snapshot.val().waktu) || Date.now(), type: type, keterangan: keterangan || null, key: snapshot.key, tahunAjaran: currentTahunAjaran, metode: 'lapor_sendiri' };
        allTeacherAttendance.push(newRecord); bumpTaRev();
        renderTeacherAttendance(); renderJikaAktif('dashboard', updateDashboard);
      }));
    }

    // ============================================================
    // RELIGI
    // ============================================================
    function loadReligi() { if (!document.getElementById('religiTodayList')) return; renderReligi(allReligiAttendance); }   // halaman Absen Religi sudah dicabut dari index.html
    function renderReligi(data) {
      const today = tglLokal(), bulanIni = today.slice(0,7);
      // Label jam di halaman selalu mengikuti getJamReligi() supaya tidak berbeda dari aturan yang benar-benar dipakai saveReligi().
      try {
        const jd = getJamReligi('sholat_dluha'), jz = getJamReligi('sholat_dzuhur');
        const ld = document.getElementById('jamReligiDluhaLabel'), lz = document.getElementById('jamReligiDzuhurLabel');
        if (ld) ld.textContent = jd.mulai + '-' + jd.selesai;
        if (lz) lz.textContent = jz.mulai + '-' + jz.selesai;
      } catch (e) { /* label hanya tampilan */ }
      let filtered = data;
      if (!isAdmin() && !isKepsek()) filtered = filtered.filter(item => (item.guruKey ? item.guruKey === currentUser.key : item.guru === currentUser.name));
      const todayList = filtered.filter(item => item.tanggal === today);
      const todayContainer = document.getElementById('religiTodayList');
      if (todayList.length === 0) { todayContainer.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada absensi religi hari ini.</p>'; }
      else { let html = ''; todayList.forEach(item => { const dluha = item.sholat_dluha || { status: '-', waktu: '-' }; const dzuhur = item.sholat_dzuhur || { status: '-', waktu: '-' }; html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;flex-wrap:wrap;gap:4px;"><span><strong>${escapeHtml(item.guru)}</strong></span><span>☀️ Dhuha: ${escapeHtml(dluha.status)} ${dluha.waktu ? new Date(dluha.waktu).toLocaleTimeString() : ''}</span><span>🕌 Dzuhur: ${escapeHtml(dzuhur.status)} ${dzuhur.waktu ? new Date(dzuhur.waktu).toLocaleTimeString() : ''}</span></div>`; }); todayContainer.innerHTML = html; }
      const monthList = filtered.filter(item => item.tanggal && item.tanggal.startsWith(bulanIni));
      const monthContainer = document.getElementById('religiMonthList'), paginationEl = document.getElementById('religiPagination');
      if (monthList.length === 0) { monthContainer.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada absensi religi bulan ini.</p>'; paginationEl.innerHTML = ''; return; }
      const sorted = monthList.sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      const totalItems = sorted.length, ps = pagerSize('religi') || totalItems, totalPages = Math.max(1, Math.ceil(totalItems / ps));
      if (religiPage > totalPages) religiPage = totalPages; if (religiPage < 1) religiPage = 1;
      const start = (religiPage - 1) * ps, end = Math.min(start + ps, totalItems), pageItems = sorted.slice(start, end);
      const grouped = {};
      pageItems.forEach(item => { if (!grouped[item.tanggal]) grouped[item.tanggal] = []; grouped[item.tanggal].push(item); });
      let html = ''; const sortedDates = Object.keys(grouped).sort((a,b) => COLLATOR_ID.compare(b, a));
      sortedDates.forEach(tgl => { const items = grouped[tgl]; html += `<div style="margin-top:6px;"><strong>${escapeHtml(tgl)}</strong>`; items.forEach(item => { const dluha = item.sholat_dluha || { status: '-', waktu: '-' }, dzuhur = item.sholat_dzuhur || { status: '-', waktu: '-' }; html += `<div class="text-medium" style="display:flex;justify-content:space-between;padding:2px 0 2px 16px;font-size:13px;flex-wrap:wrap;gap:4px;"><span>${escapeHtml(item.guru)}</span><span>☀️ ${escapeHtml(dluha.status)}</span><span>🕌 ${escapeHtml(dzuhur.status)}</span></div>`; }); html += `</div>`; });
      monthContainer.innerHTML = html;
      paginationEl.innerHTML = pagerHtml('religi', totalItems, totalPages, start, end, 'data');
    }
    function getJamReligi(type) {
      return type === 'sholat_dluha' ? { mulai: '06:30', selesai: '09:00' } : { mulai: '11:00', selesai: '12:30' };
    }
    // Hari diizinkan untuk masing-masing sholat: Dluha setiap hari KECUALI Minggu (madrasah
    // libur); Dzuhur HANYA Senin-Kamis (Jumat & Sabtu tidak ada Dzuhur berjamaah di madrasah,
    // Minggu ikut libur juga). getDay(): 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu.
    function v4HariDiizinkanSholat(type, tanggalStr) {
      const hari = new Date(tanggalStr + 'T00:00:00').getDay();
      if (hari === 0) return false; // Minggu libur untuk semua jenis sholat
      if (type === 'sholat_dzuhur') return hari >= 1 && hari <= 4; // Senin-Kamis saja
      return true; // Dluha: Senin-Sabtu
    }
    // Cari jenis kegiatan di "Amalan Yaumiyah" (v4) yang namanya cocok dengan sholat Dluha/Dzuhur.
    // Dicocokkan lewat NAMA (bukan ID tetap) karena jenis kegiatan v4 dibuat bebas oleh Admin --
    // jadi Admin WAJIB membuat jenis kegiatan yang namanya mengandung kata "dhuha"/"dluha" atau
    // "dzuhur" di menu Amalan Yaumiyah supaya validasi di bawah ini bisa jalan.
    function v4CariJenisKegiatanSholat(namaSholat) {
      const keywords = v4KataKunciSholat(namaSholat);
      return (V4.activityTypes || []).filter(a => {
        const n = String(a.name || '').toLowerCase();
        return keywords.some(k => n.includes(k));
      });
    }
    // Ejaan umum diperluas (mis. "Dluhur", "Duhur", "Dhuhr", "Duha") supaya tidak gagal hanya karena beda penulisan nama.
    function v4KataKunciSholat(namaSholat) {
      return namaSholat === 'Dluha' ? ['dhuha', 'dluha', 'duha'] : ['dzuhur', 'dhuhur', 'zuhur', 'dluhur', 'duhur', 'dzuhr', 'dhuhr', 'zuhr'];
    }
    // Sholat Dhuha & Dzuhur adalah kegiatan rutin -- dibuat OTOMATIS (sekali) kalau belum ada, jadi Admin tidak
    // perlu membuatnya manual. ID tetap + transaction = aman dari duplikat walau beberapa akun memicunya bersamaan.
    // PJ sengaja kosong (picName '' -> monitor-petugas menandainya "Belum ditunjuk"; picKey '-' dipakai karena Rules mewajibkan picKey; Admin menunjuk PJ lewat dropdown di kartu kegiatan; sementara itu Admin/Kepala
    // bisa mengisi, dan guru mana pun bisa mencalonkan diri jadi pengganti hari itu). Tanpa honor kegiatan:
    // honor sholat guru dihitung dari absen sholat guru (tarif Dluha/Dzuhur), bukan dari jenis kegiatan ini.
    let v4SholatSeedDone = false;
    function v4SeedJenisSholatRutin() {
      if (v4SholatSeedDone || !navigator.onLine || !db || !currentUser) return;
      v4SholatSeedDone = true;
      const seeds = [{ nama: 'Dluha', id: 'sholat_dhuha', name: 'Sholat Dhuha' }, { nama: 'Dzuhur', id: 'sholat_dzuhur', name: 'Sholat Dzuhur' }];
      db.ref('activity_types_v4').once('value').then(snap => {
        const names = []; snap.forEach(c => { names.push(String((c.val() || {}).name || '').toLowerCase()); });
        const perluDibuat = seeds.filter(sd => !v4KataKunciSholat(sd.nama).some(k => names.some(n => n.includes(k))));
        if (!perluDibuat.length) return;
        return Promise.all(perluDibuat.map(sd => db.ref('activity_types_v4/' + sd.id).transaction(cur => (cur === null || cur === undefined)
          ? { name: sd.name, category: 'Amalan', honorEnabled: false, picKey: '-', picName: '', rutin: true, createdAt: new Date().toISOString(), createdBy: 'sistem' }
          : undefined))).then(res => { if (res.some(r => r && r.committed)) v4LoadCore(); });
      }).catch(err => { v4SholatSeedDone = false; console.warn('[SI MAMBA] Gagal menyiapkan kegiatan sholat rutin:', err); });
    }
    // null = jenis kegiatannya belum dibuat sama sekali oleh Admin di Amalan Yaumiyah.
    // false = sudah dibuat, tapi absensi siswa untuk tanggal ini belum ada yang mengisi.
    // true = absensi siswa untuk sholat ini sudah diisi hari ini (oleh siapapun PJ-nya).
    function v4AbsensiSiswaSholatSudahDiisi(namaSholat, tanggal) {
      const jenis = v4CariJenisKegiatanSholat(namaSholat);
      if (jenis.length === 0) return null;
      const keys = jenis.map(j => j.key);
      // Defensif: abaikan record tanpa status (kalau ada) supaya tidak dihitung sebagai "sudah diisi".
      return (V4.activityAttendance || []).some(r => r.status && keys.includes(r.activityTypeId) && r.tanggal === tanggal);
    }
    // [Dipindah ke js/honor-guru.js] konstanta & cache honor sholat (saveReligi di bawah tetap di sini).

    function saveReligi() {
      toast('Absen Religi pribadi sudah tidak dipakai. Honor sholat dihitung dari check-in petugas (scan QR) di Amalan Yaumiyah.', true, 6000);
    }
    // [Dipindah ke js/rekap-nilai.js] Rekap Absensi/Nilai (filter, tabel, ekspor PDF & Excel).
    // [Dipindah ke js/honor-guru.js] tarif ekstra/ekskul, Guru Terajin, tarif honor V4, renderHonor, panjar, slip honor.

    // [Dipindah ke js/infaq.js] seluruh fitur Infaq/Iuran Mingguan. Yang tetap di sini hanya helper kecil
    // yang juga dipakai di luar fitur ini (menu akses, form edit siswa, Portal Orang Tua).
    function infaqMyKelasList() {
      if (!currentUser) return [];
      const uid = currentUser.key || currentUser.name;
      return KELAS_LIST.filter(k => {
        const p = allInfaqPetugas && allInfaqPetugas[k];
        return p && (p.key === uid || p.name === currentUser.name);
      });
    }
    function infaqCanAccess() { return isAdmin() || infaqMyKelasList().length > 0; }
    // ---- Helper nominal iuran: null = belum diatur / tidak ada, 0 = GRATIS (nilai yang sah) ----
    // Jangan pakai `x || 0`, `x ? ... : ...` atau `x || ''` pada nominal iuran: semuanya menyamakan
    // 0 (gratis) dengan null (belum diatur). Selalu lewat helper ini.
    function iuranAngka(v) {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    function iuranNominalStandar() { return iuranAngka(MADRASAH.iuranMingguanNominal); }
    function iuranNominalSiswa(s) { // nominal khusus siswa kalau ada (termasuk 0), kalau tidak nominal standar (bisa null)
      const khusus = iuranAngka(s && s.nominalIuranKhusus);
      return khusus !== null ? khusus : iuranNominalStandar();
    }
    function iuranRp(n) { return n === null ? '—' : 'Rp ' + n.toLocaleString('id-ID'); }
    // Siswa yang dibebaskan (nominal khusus Rp 0, atau nominal standar madrasah Rp 0) tidak ditagih:
    // tidak masuk daftar belum lunas/pengingat WA, titik notifikasi, maupun pembagi "siswa lunas".
    function iuranGratis(s) { return iuranNominalSiswa(s) === 0; }
    // [Dipindah ke js/sikap-buku.js] fitur Sikap & Kedisiplinan, Buku Penghubung, dan Info ke Ortu.
    // Yang tetap di sini hanya helper akses (dipakai peta akses menu) dan penanda komponen.
    function sikapCanAccess() { return !!currentUser && (isAdmin() || isKepsek() || loaderScopeKelas().length > 0); }
    function bukuCanAccess() { return sikapCanAccess(); } // aturan akses sama persis dengan Sikap Siswa
    function komponenBelumTermuat(nama) { toast('Komponen ' + nama + ' belum termuat. Muat ulang halaman, lalu coba lagi.', true); }
    // [Dipindah ke js/materi-tugas.js] halaman Materi Belajar & Tugas.
    // [Dipindah ke js/kalender-akademik.js] Kalender Akademik, Kalender Nasional, panel "Hari Ini" (hariIniInit dipanggil dari berkas itu).
    // [Dipindah ke js/saran-kritik.js] Saran & Kritik dari Portal Orang Tua (Admin/Kepsek).

    // ============================================================
    // PORTAL ORANG TUA
    // ============================================================
    // Terpisah total dari sistem login staf (Guru/Admin/Kepsek). Orang tua masuk dengan nomor WA yang
    // terdaftar di data siswa + PIN 6 angka yang mereka buat sendiri (hash disimpan di ortu_akun/{noWa}).
    // Lupa PIN -> Admin klik "Reset PIN" (menu Admin). Query Firebase di sini TIDAK memakai
    // allSiswa/allGrades/dst (yang scoped untuk staf yang login) -- portal ini query langsung ke
    // Firebase karena diakses SEBELUM ada currentUser sama sekali.
    // Halaman awal (chooser) -- salam dinamis sesuai jam, lalu 2 pilihan: Guru/Staff atau Orang
    // Tua. loadGuruListForLogin() tetap dipanggil di background seperti biasa (elemen #loginGuru
    // ada di DOM walau #loginPage sedang disembunyikan), jadi begitu user pilih "Guru/Staff"
    // dropdown-nya sudah terisi, tidak perlu nunggu lagi.
    function salamWaktu() {
      const h = Math.floor(menitWIB() / 60); // WIB
      if (h < 10) return 'Selamat Pagi';
      if (h < 15) return 'Selamat Siang';
      if (h < 18) return 'Selamat Sore';
      return 'Selamat Malam';
    }
    function pilihLoginGuru() {
      document.getElementById('loginChooser').style.display = 'none';
      document.getElementById('loginPage').style.display = 'flex';
    }
    function pilihLoginOrtu() {
      if (typeof bukaPortalOrtuForm !== 'function') { toast('Komponen Portal Orang Tua belum termuat. Muat ulang halaman, lalu coba lagi.', true); return; }
      document.getElementById('loginChooser').style.display = 'none';
      bukaPortalOrtuForm();
    }
    function kembaliKeChooser() {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('portalOrtuLogin').style.display = 'none';
      document.getElementById('portalOrtuDashboard').style.display = 'none';
      document.getElementById('loginChooser').style.display = 'flex';
    }
    // [Dipindah ke js/portal-ortu.js] login/PIN/ingat perangkat/ganti PIN Portal Orang Tua.
    // ortuEl() dan ortuWaKey() sengaja tetap di sini: dipakai juga oleh sisi Admin & form edit siswa.
    function ortuEl(id) { return document.getElementById(id); }
    function ortuWaKey(noWa) { const k = formatNomorWa(noWa); return /^62[0-9]{8,13}$/.test(k) ? k : null; }
    // [Dipindah ke js/ortu-akun-admin.js] daftar akun portal + Reset PIN (Admin) dan cek PIN dari Edit Siswa.
    // [Dipindah ke js/kelola-absen-guru.js] Kelola Absen Guru (kag*) dan Koreksi Honor Sholat (krg*).
    // [Dipindah ke js/portal-ortu.js] portalOrtuInfaqHtml, renderPortalOrtuDashboard, kirimSaranKritik, kumpulTugasOrtu.
    // [Dipindah ke js/honor-guru.js] downloadHonorPDF (PDF Rekap Honor Guru).

    // ============================================================
    // SURAT & IJIN (DENGAN KOP RESMI)
    // ============================================================
    function generateKopSuratHTML() {
      // Inline style (tidak bergantung CSS): logo di kolom kiri, teks di kolom sendiri -> tidak bisa tumpang tindih.
      const t = [`<div style="font-size:19px;font-weight:700;line-height:1.2;">${escapeHtml(String(MADRASAH.nama || '').toUpperCase())}</div>`];
      if (MADRASAH.nsm) t.push(`<div style="font-size:12px;font-weight:700;">NSM: ${escapeHtml(MADRASAH.nsm)}</div>`);
      t.push(`<div style="font-size:12px;">${escapeHtml(MADRASAH.alamat || '')}</div>`);
      t.push(`<div style="font-size:12px;overflow-wrap:anywhere;">Telp: ${escapeHtml(MADRASAH.telp || '')} | Email: ${escapeHtml(MADRASAH.email || '')} | Web: ${escapeHtml(MADRASAH.website || '')}</div>`);
      return `
        <div class="kop-surat" style="margin-bottom:14px;color:#000;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:0 0 80px;"><img src="logo/logo-lembaga.png" alt="Logo" class="logo-kop-img" style="width:80px;height:80px;object-fit:contain;" onerror="v4LogoFallback(this)"></div>
            <div style="flex:1;min-width:0;text-align:center;line-height:1.3;font-family:Arial,Helvetica,sans-serif;">${t.join('')}</div>
          </div>
          <div style="border-top:3px double #000;margin-top:8px;"></div>
        </div>
      `;
    }

    function loadSiswaSuratDropdown() {
      const select = document.getElementById('suratSiswaSelect');
      select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
      // Wali Kelas cuma boleh buat surat untuk siswa di kelas yang dia ampu -- Admin tetap
      // bisa untuk semua siswa.
      const scoped = (isAdmin() || isKepsek()) ? allSiswaSemua : allSiswa.filter(s => siswaScopeKelas().includes(s.kelas));   // Admin/Kepsek: termasuk siswa nonaktif (mis. surat pindah)
      const sorted = [...scoped].sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      sorted.forEach(s => { select.innerHTML += `<option value="${s.key}">${escapeHtml(s.name)} - ${escapeHtml(s.kelas)}${siswaAktif(s) ? '' : ' (nonaktif)'}</option>`; });
    }
    function isiDataSurat() {
      const key = document.getElementById('suratSiswaSelect').value;
      if (!key) { selectedSiswaSurat = null; document.getElementById('suratPreview').innerHTML = generateKopSuratHTML() + '<p class="text-muted" style="text-align:center;padding:40px 0;">Pilih siswa untuk melihat preview.</p>'; return; }
      selectedSiswaSurat = allSiswaSemua.find(s => s.key === key) || allSiswa.find(s => s.key === key);
      if (selectedSiswaSurat) previewSurat();
    }
    function ubahTemplateSurat() {
      const jenis = document.getElementById('suratJenisSelect').value;
      const tglContainer = document.getElementById('suratTanggalContainer');
      // PENTING: field tanggal HANYA relevan untuk Surat Ijin/Sakit -- surat ini menyatakan
      // siswa tidak masuk pada tanggal TERTENTU, yang bisa berbeda dari tanggal surat dibuat/
      // dicetak (mis. dibuat H+1). Sebelumnya tanggal SELALU ikut tanggal hari ini tanpa bisa
      // diubah, jadi salah kalau surat dibuat bukan di hari yang sama dengan izin/sakitnya.
      if (tglContainer) tglContainer.style.display = (jenis === 'ijin' || jenis === 'sakit') ? 'block' : 'none';
      const tglInput = document.getElementById('suratTanggalIjin');
      if (tglInput && !tglInput.value) tglInput.value = tglLokal();
      if (selectedSiswaSurat) previewSurat();
    }
    // previewSurat(), downloadSuratPDF(), simpanSurat() (surat siswa) dipindah ke js/surat-guru.js (v4+) bersama
    // penomoran otomatis. WAJIB memuat js/surat-guru.js sesudah app.js; tombol Preview/Download/Simpan memanggilnya.
    // Isi surat versi TEKS POLOS (tanpa tag HTML), disusun paralel dengan switch-case di
    // previewSurat() supaya kata-kata di preview & di PDF selalu sama persis. Dipisah ke
    // sini (bukan "membaca ulang" innerHTML preview) karena innerHTML/.textContent tidak
    // pernah menyisipkan baris baru di posisi tag <br>/<p> yang berdempetan dalam satu baris
    // kode -- itu sebabnya versi lama sering mencetak isi surat sebagai satu kalimat raksasa
    // yang keluar dari tepi halaman, dan bahkan ke-skip total oleh filter kata kunci.
    function buatIsiSuratPlain(jenis, siswa, tanggal) {
      const pembuka = (jenis === 'ijin' || jenis === 'sakit')
        ? 'Yang bertanda tangan di bawah ini, orang tua/wali dari:'
        : `Yang bertanda tangan di bawah ini, Kepala ${MADRASAH.nama}, menerangkan bahwa:`;
      const identitas = [`Nama\u00A0\u00A0: ${siswa.name}`, `Kelas : ${siswa.kelas}`];
      let isi = '', penutup = '';
      switch (jenis) {
        case 'aktif':
          isi = `Bahwa siswa tersebut adalah benar-benar siswa aktif di ${MADRASAH.nama} pada tahun ajaran ${currentTahunAjaran}.\n\nSurat keterangan ini diberikan untuk keperluan administrasi dan digunakan sebagaimana mestinya.`;
          penutup = 'Demikian surat keterangan ini dibuat dengan sebenarnya.';
          break;
        case 'pindah':
          isi = `Bahwa siswa tersebut adalah benar-benar siswa aktif di ${MADRASAH.nama} dan telah menyelesaikan proses administrasi kepindahan.\n\nSurat keterangan ini diberikan sebagai bukti kepindahan siswa untuk keperluan pendaftaran di sekolah baru.`;
          penutup = 'Demikian surat keterangan ini dibuat dengan sebenarnya.';
          break;
        case 'ijin':
          isi = `Dengan ini mengijinkan anak kami untuk tidak masuk sekolah pada tanggal ${tanggal} dikarenakan keperluan keluarga / kesehatan.`;
          penutup = 'Demikian surat ijin ini kami buat untuk digunakan sebagaimana mestinya.';
          break;
        case 'sakit':
          isi = `Menerangkan bahwa anak kami tidak dapat mengikuti kegiatan belajar mengajar pada tanggal ${tanggal} karena sedang sakit.`;
          penutup = 'Demikian surat keterangan ini dibuat dengan sebenarnya.';
          break;
      }
      return { pembuka, identitas, isi, penutup };
    }
    function loadSuratRiwayat() {
      db.ref('surat').orderByChild('createdAt').limitToLast(50).once('value', snap => {
        allSurat = []; snap.forEach(child => { const s = child.val(); s.key = child.key; if (!isAdmin() && !isKepsek() && (isWaliKelas() || isWaliKelasAssigned()) && !loaderScopeKelas().includes(s.kelas)) return; allSurat.push(s); }); allSurat.reverse(); renderSuratRiwayat();
      });
    }
    function renderSuratRiwayat() {
      const container = document.getElementById('suratRiwayatList'), pagination = document.getElementById('suratPagination');
      if (allSurat.length === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;">Belum ada surat yang dibuat.</p>'; pagination.innerHTML = ''; return; }
      const totalItems = allSurat.length, ps = pagerSize('surat') || totalItems, totalPages = Math.max(1, Math.ceil(totalItems / ps));
      if (suratPage > totalPages) suratPage = totalPages; if (suratPage < 1) suratPage = 1;
      const start = (suratPage - 1) * ps, end = Math.min(start + ps, totalItems), pageItems = allSurat.slice(start, end);
      let html = '';
      pageItems.forEach(s => {
        const tgl = s.tanggal ? new Date(s.tanggal).toLocaleDateString('id-ID') : '-', warna = { 'aktif':'#059669','pindah':'#d97706','ijin':'#2563eb','sakit':'#dc2626' }[s.jenis] || '#6b7280';
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f9fafb;border-radius:6px;margin-bottom:4px;border-left:4px solid ${warna};flex-wrap:wrap;gap:4px;"><div><span style="font-weight:600;">${escapeHtml(s.siswaName)}</span> <span class="text-muted" style="font-size:12px;">${escapeHtml(s.kelas)}</span> <span class="text-muted" style="font-size:12px;"> | ${escapeHtml(s.jenisLabel)}</span> <span class="text-muted" style="font-size:11px;">${tgl}</span></div><div style="display:flex;gap:4px;"><button class="btn btn-soft" style="padding:2px 10px;font-size:11px;" onclick="lihatSurat('${s.key}')">👁️</button>${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusSurat('${s.key}')">🗑️</button>` : ''}</div></div>`;
      });
      container.innerHTML = html;
      pagination.innerHTML = pagerHtml('surat', totalItems, totalPages, start, end, 'surat');
    }
    // htmlContent dibaca dari Firebase (bisa ditulis siapa pun yang punya akses tulis ke node 'surat'), jadi WAJIB
    // disanitasi sebelum masuk innerHTML (cegah stored XSS). PERBAIKAN: sebelumnya daftar-hitam (hapus tag/atribut
    // yang "diketahui berbahaya"; <style> dan class bebas lolos). Sekarang DAFTAR-PUTIH: hanya tag & atribut yang
    // dikenal aman yang dipertahankan; tag lain dilepas (isi teksnya tetap), tag aktif dibuang beserta isinya.
    // Tanpa dependensi luar. Bila suatu hari DOMPurify dipasang di vendor/, ganti isi bersihkanHtmlSurat dengannya.
    const SURAT_TAG_OK = new Set(['a','abbr','b','blockquote','br','caption','center','code','col','colgroup','dd','div','dl','dt','em','font','h1','h2','h3','h4','h5','h6','hr','i','img','li','ol','p','pre','s','small','span','strike','strong','sub','sup','table','tbody','td','tfoot','th','thead','tr','u','ul']);
    const SURAT_TAG_BUANG = new Set(['script','style','iframe','frame','frameset','object','embed','applet','link','meta','base','form','input','button','textarea','select','option','svg','math','template','noscript','title','head','audio','video','source','track','canvas','dialog','portal','xmp','plaintext','noembed','noframes']);
    const SURAT_ATTR_OK = new Set(['align','valign','colspan','rowspan','width','height','border','cellpadding','cellspacing','bgcolor','color','face','size','alt','title','dir','lang','nowrap','span','data-ttd']);
    // Skema URL yang boleh: relatif (mis. logo/logo-lembaga.png), http(s); mailto/tel hanya untuk <a>; data:image base64 hanya untuk <img>.
    function suratUrlAman(tag, nm, nilai) {
      const v = String(nilai == null ? '' : nilai).replace(/[\s\u0000-\u001f]+/g, '').toLowerCase();
      if (!/^[a-z][a-z0-9+.\-]*:/.test(v)) return true; // relatif
      if (v.startsWith('http://') || v.startsWith('https://')) return true;
      if (tag === 'a' && nm === 'href' && (v.startsWith('mailto:') || v.startsWith('tel:'))) return true;
      if (tag === 'img' && nm === 'src' && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+\/=]+$/.test(v)) return true;
      return false;
    }
    // Saring deklarasi CSS inline: buang url(), expression, @import, binding, posisi melayang (fixed/absolute/sticky; cegah
    // overlay palsu yang menutupi aplikasi), z-index. Escape CSS (\75rl) dan komentar dinormalkan dulu sebelum diperiksa.
    function suratStyleAman(css) {
      return String(css == null ? '' : css).split(';').map(d => d.trim()).filter(Boolean).filter(d => {
        const i = d.indexOf(':'); if (i < 1) return false;
        const prop = d.slice(0, i).trim().toLowerCase();
        const val = d.slice(i + 1).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([0-9a-f]{1,6})\s?/gi, (m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return ''; } }).replace(/\\/g, '').replace(/\s+/g, '').toLowerCase();
        if (!/^-?[a-z][a-z-]*$/.test(prop) || prop.startsWith('-moz-') || prop === 'behavior' || prop === 'z-index' || prop === 'content') return false;
        if (/url\(|expression|javascript:|vbscript:|@import|binding|image-set|<|>/.test(val)) return false;
        if (prop === 'position' && /fixed|absolute|sticky/.test(val)) return false;
        return true;
      }).join('; ');
    }
    function suratBersihkanNode(induk) {
      Array.from(induk.childNodes).forEach(n => {
        if (n.nodeType === 3) return; // teks
        if (n.nodeType !== 1) { n.remove(); return; } // komentar, CDATA, dsb.
        const tag = n.localName.toLowerCase();
        if (SURAT_TAG_BUANG.has(tag)) { n.remove(); return; }
        suratBersihkanNode(n); // anak dibersihkan lebih dulu
        if (!SURAT_TAG_OK.has(tag)) { while (n.firstChild) induk.insertBefore(n.firstChild, n); n.remove(); return; }
        Array.from(n.attributes).forEach(a => {
          const nm = a.name.toLowerCase();
          if (nm === 'style') { const st = suratStyleAman(a.value); if (st) n.setAttribute('style', st); else n.removeAttribute(a.name); return; }
          if (nm === 'class') { const kl = String(a.value).split(/\s+/).filter(t => t && !/modal|overlay|toast|popup|sidebar|loading|notif|boot|fixed/i.test(t)).join(' '); if (kl) n.setAttribute('class', kl); else n.removeAttribute(a.name); return; }
          if ((nm === 'href' && tag === 'a') || (nm === 'src' && tag === 'img')) { if (!suratUrlAman(tag, nm, a.value)) n.removeAttribute(a.name); return; }
          if (!SURAT_ATTR_OK.has(nm)) n.removeAttribute(a.name);
        });
        if (tag === 'a') n.setAttribute('rel', 'noopener noreferrer');
      });
    }
    function bersihkanHtmlSurat(html) {
      try {
        const doc = new DOMParser().parseFromString('<body>' + String(html == null ? '' : html) + '</body>', 'text/html');
        suratBersihkanNode(doc.body);
        return doc.body.innerHTML;
      } catch (e) { return '<p>Konten tidak dapat ditampilkan dengan aman.</p>'; }
    }
    function lihatSurat(key) {
      const surat = allSurat.find(s => s.key === key);
      if (!surat) return toast('Surat tidak ditemukan!', true);
      document.getElementById('suratPreview').innerHTML = surat.htmlContent ? bersihkanHtmlSurat(surat.htmlContent) : '<p>Konten tidak tersedia</p>';
      // Gambar TTD tidak disimpan di riwayat (hemat kuota Firebase): pulihkan dari gambar TTD terkini.
      document.querySelectorAll('#suratPreview img[data-ttd]').forEach(im => {
        const role = im.getAttribute('data-ttd') === 'yayasan' ? 'yayasan' : 'kepala';
        if (role === 'kepala' && MADRASAH.ttdKepalaBase64) { im.src = MADRASAH.ttdKepalaBase64; return; }
        if (window.TTD && typeof window.TTD.muat === 'function') window.TTD.muat(role).then(d => { if (d) im.src = d; }).catch(() => {});
      });
      toast('📄 Menampilkan surat: ' + surat.jenisLabel);
    }
    function hapusSurat(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus surat ini?')) return;
      db.ref('surat/' + key).remove(err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ Surat dihapus.'); loadSuratRiwayat(); if (allSurat.length === 0) document.getElementById('suratPreview').innerHTML = generateKopSuratHTML() + '<p class="text-muted" style="text-align:center;padding:40px 0;">Pilih siswa untuk melihat preview.</p>'; }
      });
    }
    // [Dipindah ke js/jadwal.js] seluruh halaman Jadwal Pelajaran (render, simpan, ekspor PDF).

    // ============================================================
    // ADMIN GURU
    // ============================================================
    // ============================================================
    // KOREKSI ABSEN GURU MANUAL (Admin/Kepsek — untuk kasus lupa absen / salah Alpha)
    // ============================================================
    function populateKoreksiAbsenGuruDropdown() {
      // FIX: dulu value = nama -- kalau ada 2 guru bernama sama, Admin memilih salah satu
      // di dropdown ini TIDAK BISA membedakan keduanya sama sekali, dan simpanKoreksiAbsenGuru()
      // di bawah mencocokkan/menghapus catatan lama lewat NAMA juga -- resikonya koreksi absen
      // guru A bisa nimpa/menghapus catatan absen guru B yang kebetulan namanya sama.
      const select = document.getElementById('koreksiAbsenGuru');
      if (!select) return;
      const currentVal = select.value;
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas').sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      select.innerHTML = guruAktif.map(g => `<option value="${escapeHtml(g.key || g.name)}">${escapeHtml(g.name)}</option>`).join('');
      if (currentVal) select.value = currentVal;
    }
    function simpanKoreksiAbsenGuru() {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin/Kepsek!', true);
      if (isBusy('simpanKoreksiAbsenGuru')) return toast('⏳ Sedang menyimpan koreksi, mohon tunggu...', false, 1500);
      const guruVal = document.getElementById('koreksiAbsenGuru').value; // guruKey (fallback nama utk guru lama tanpa key)
      const guruObjTerpilih = (allGuru || []).find(g => (g.key || g.name) === guruVal);
      const guru = guruObjTerpilih ? guruObjTerpilih.name : guruVal; // nama utk tampilan & field 'guru'
      const guruKeyTerpilih = guruObjTerpilih ? (guruObjTerpilih.key || null) : null;
      const tanggal = document.getElementById('koreksiAbsenTanggal').value;
      const jenis = document.getElementById('koreksiAbsenJenis').value;
      const jam = document.getElementById('koreksiAbsenJam').value;
      const catatan = document.getElementById('koreksiAbsenCatatan').value.trim();
      if (!guru || !tanggal || !jenis) return toast('Lengkapi guru, tanggal, dan jenis!', true);
      if (!catatan) return toast('Isi catatan/alasan koreksi!', true);
      if (!confirm(`Yakin catat \"${jenis}\" untuk ${guru} tanggal ${tanggal}?\n\nCatatan lama yang bentrok di tanggal ini akan diganti.`)) return;
      setBusy('simpanKoreksiAbsenGuru', null);
      // ATOMIK: dulu catatan lama di-remove() satu per satu (Promise.all) BARU catatan koreksi di-push() --
      // kalau push gagal (koneksi putus/ditolak) catatan lama sudah terlanjur hilang & koreksinya tidak ada
      // (guru tanpa catatan Datang/Pulang sama sekali, honor & rekap ikut salah); kalau salah satu remove gagal,
      // sebagian catatan lama terhapus tapi koreksi tidak masuk. Sekarang hapus + tambah digabung dalam SATU
      // update() multi-path: semua berhasil, atau tidak ada yang berubah sama sekali.
      // Key catatan koreksi juga DETERMINISTIK (tanggal_guruKey_jenis, pola yang sama dgn absen QR/lapor
      // Izin-Sakit/Alpha otomatis), bukan push-id acak -- klik ganda/ulang menimpa catatan yang sama, bukan dobel.
      const guruObj = guruObjTerpilih || (allGuru || []).find(g => g.name === guru);
      const guruKeyAman = (guruObj && guruObj.key) || guru.replace(/[^a-zA-Z0-9]/g, '_');
      const keyBaru = `${tanggal}_${guruKeyAman}_${jenis}`;
      const waktuBaru = (jam ? new Date(`${tanggal}T${jam}:00`) : new Date(`${tanggal}T00:00:00`)).getTime(); // epoch-ms, seragam dgn absen QR/lapor (ServerValue.TIMESTAMP)
      const dataBaru = { tanggal, guru, guruKey: (guruObj && guruObj.key) || null, kelas: (guruObj && guruObj.kelas) || [], waktu: waktuBaru, type: jenis, tahunAjaran: currentTahunAjaran, metode: 'manual_admin', catatanKoreksi: catatan, inputOleh: currentUser.name, inputAt: new Date().toISOString(), verified: true };
      db.ref('teacher_attendance').orderByChild('tanggal').equalTo(tanggal).once('value').then(snap => {
        const updates = {};
        snap.forEach(child => { // callback TIDAK boleh me-return nilai truthy (itu menghentikan iterasi forEach Firebase)
          const v = child.val();
          // FIX: dulu dicocokkan lewat nama (v.guru !== guru) -- sekarang lewat guruKey kalau
          // guru terpilih punya key (fallback nama hanya utk guru lama tanpa key, atau kalau
          // catatan lamanya sendiri belum punya guruKey).
          const cocok = guruKeyTerpilih ? v.guruKey === guruKeyTerpilih : v.guru === guru;
          if (!cocok) return;
          // Alpha/Izin/Sakit adalah status satu-hari-penuh -> ganti semua catatan hari itu.
          // Datang/Pulang cuma menggantikan catatan jenis yang sama, atau catatan Alpha yang sudah tidak relevan.
          if (jenis === 'Alpha' || jenis === 'Izin' || jenis === 'Sakit') updates[child.key] = null;
          else if (v.type === jenis || v.type === 'Alpha') updates[child.key] = null;
        });
        updates[keyBaru] = dataBaru; // diset TERAKHIR: kalau catatan lama memakai key yang sama, ditimpa (bukan dihapus)
        return adminSesiSiap().then(() => db.ref('teacher_attendance').update(updates));
      }).then(() => {
        clearBusy('simpanKoreksiAbsenGuru', null);
        toastTersimpan(`Koreksi absen ${jenis} untuk ${guru}`);
        addLog('koreksi_absen_manual', `${guru} - ${tanggal} - ${jenis}: ${catatan}`);
        document.getElementById('koreksiAbsenCatatan').value = '';
        document.getElementById('koreksiAbsenJam').value = '';
        reloadDataset('teacherAttendance');
      }).catch(err => {
        clearBusy('simpanKoreksiAbsenGuru', null);
        console.error('[SI MAMBA] Gagal simpan koreksi absen:', err);
        toast('❌ Gagal menyimpan koreksi (catatan lama tidak diubah): ' + (err && err.message || err), true);
      });
    }
    function openEditGuruModal(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const guru = allGuru.find(g => g.key === key);
      if (!guru) return toast('Guru tidak ditemukan!', true);
      editingGuruKey = key;
      document.getElementById('editGuruKey').value = key;
      document.getElementById('editGuruName').value = guru.name;
      document.getElementById('editGuruPin').value = '';
      document.getElementById('editTeacherRole').value = guru.role || 'guru';
      document.getElementById('editWaliKelasOf').value = guru.waliKelasOf || '';
      document.getElementById('editWaliKelasOfContainer').style.display = (guru.role === 'wali_kelas') ? 'block' : 'none';
      document.getElementById('editGuruTunjanganMasaKerja').value = guru.tunjanganMasaKerja || '';
      document.getElementById('editGuruNoWa').value = guru.noWa || '';
      document.getElementById('editGuruBantuanTransportasi').value = guru.bantuanTransportasi || '';
      document.querySelectorAll('.edit-class-check').forEach(cb => { cb.checked = false; cb.disabled = false; });
      document.getElementById('editAllClassCheck').checked = false;
      document.getElementById('editClassCheckboxes').classList.remove('class-checkboxes-disabled');
      if (guru.semuaKelas === true) {
        document.getElementById('editAllClassCheck').checked = true;
        document.querySelectorAll('.edit-class-check').forEach(cb => { cb.checked = true; cb.disabled = true; });
        document.getElementById('editClassCheckboxes').classList.add('class-checkboxes-disabled');
      } else if (guru.kelas) {
        const kelasList = Array.isArray(guru.kelas) ? guru.kelas : [guru.kelas];
        document.querySelectorAll('.edit-class-check').forEach(cb => { if (kelasList.includes(cb.value)) cb.checked = true; });
      }
      document.getElementById('editGuruModal').classList.add('show');
    }
    function closeEditGuruModal() { document.getElementById('editGuruModal').classList.remove('show'); editingGuruKey = null; }
    function saveEditGuru() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('saveEditGuru')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      if (!editingGuruKey) return toast('Error: tidak ada guru yang diedit!', true);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Simpan data guru butuh koneksi internet, coba lagi saat online.', true);
      const name = document.getElementById('editGuruName').value.trim(), pin = document.getElementById('editGuruPin').value.trim();
      if (!name) return toast('Nama wajib!', true);
      let updateData = { name };
      let pinBaruEdit = '';
      if (pin) { if (!/^\d{6}$/.test(pin)) return toast('PIN 6 digit!', true); pinBaruEdit = pin; }   // [KREDENSIAL v1] PIN tidak lagi ditulis ke data guru
      const role = document.getElementById('editTeacherRole').value;
      updateData.role = role;
      let waliKelasOf = '';
      if (role === 'wali_kelas') {
        waliKelasOf = document.getElementById('editWaliKelasOf').value;
        if (!waliKelasOf) return toast('Pilih Wali Kelas dari kelas berapa!', true);
      }
      updateData.waliKelasOf = waliKelasOf || null;
      const allClass = document.getElementById('editAllClassCheck').checked;
      let checkedClasses = [];
      if (allClass) checkedClasses = [...KELAS_LIST];
      else document.querySelectorAll('.edit-class-check:checked').forEach(cb => checkedClasses.push(cb.value));
      if (waliKelasOf && !checkedClasses.includes(waliKelasOf)) checkedClasses.push(waliKelasOf);
      if (checkedClasses.length === 0) return toast('Pilih minimal 1 kelas!', true);
      updateData.kelas = checkedClasses; updateData.semuaKelas = allClass;
      updateData.tunjanganMasaKerja = parseInt(document.getElementById('editGuruTunjanganMasaKerja').value) || 0;
      updateData.bantuanTransportasi = parseInt(document.getElementById('editGuruBantuanTransportasi').value) || 0;
      const noWaGuru = (document.getElementById('editGuruNoWa').value || '').trim();
      if (noWaGuru && formatNomorWa(noWaGuru).length < 10) return toast('Nomor WhatsApp guru tidak valid!', true);
      updateData.noWa = noWaGuru || null;
      const guruKeyEdit = editingGuruKey;
      if (pinBaruEdit && typeof kredAdminSetPin !== 'function') return toast('Modul kredensial belum termuat. Muat ulang halaman lalu coba lagi.', true);
      // FIX: tombol Simpan dikunci selama menyimpan (dulu bisa diketuk berkali-kali dan jendela baru menutup setelah server menjawab).
      const lepas = kunciSimpanModal('saveEditGuru', 'editGuruModal', 'saveEditGuru');
      const simpanDataGuru = () => tulisAdmin(null, null, () => { db.ref('guru/' + guruKeyEdit).update(updateData, err => {
        lepas();
        if (err) toast('Gagal update: '+err.message, true);
        else { toastTersimpan(); addLog('edit_guru', name); closeEditGuruModal(); reloadDataset('logs'); loadGuruListForLogin(() => renderUserList()); }
      }); }, lepas);
      if (pinBaruEdit) {
        kredAdminSetPin(guruKeyEdit, pinBaruEdit).then(simpanDataGuru).catch(err => { lepas(); toast('Gagal mengganti PIN: ' + (err && err.message ? err.message : err), true); });
      } else simpanDataGuru();
    }
    // ============================================================
    // NAIK KELAS & LULUS
    // ============================================================
    // Kelas tertinggi = elemen TERAKHIR KELAS_LIST (urutan diatur Admin di Profil Sekolah), bukan teks 'Kelas 6' yang
    // di-hardcode -- kalau Admin mengganti nama/jumlah kelas, naik kelas & kelulusan ikut menyesuaikan.
    function kelasTertinggi() { return KELAS_LIST[KELAS_LIST.length - 1]; }
    function perbaruiLabelTombolLulus() { const b = document.getElementById('btnGraduateClass'); if (b) b.textContent = '🎓 Luluskan ' + kelasTertinggi(); }
    function promoteClass() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const kelasAsal = document.getElementById('promoteClass').value;
      const kelasAkhir = kelasTertinggi();
      if (kelasAsal === kelasAkhir) return toast(`${kelasAkhir} tidak bisa naik, gunakan tombol Lulus!`, true);
      // kelasMap dibangun otomatis dari KELAS_LIST (memetakan tiap kelas ke kelas SESUDAHNYA
      // dalam urutan array) -- kalau Admin menambah/mengubah nama kelas, mapping ini otomatis ikut.
      const kelasMap = {}; for (let i = 0; i < KELAS_LIST.length - 1; i++) kelasMap[KELAS_LIST[i]] = KELAS_LIST[i+1];
      const kelasTujuan = kelasMap[kelasAsal];
      if (!kelasTujuan) return toast('Kelas tidak valid!', true);
      const siswaDiKelas = allSiswa.filter(s => s.kelas === kelasAsal);
      if (siswaDiKelas.length === 0) return toast(`Tidak ada siswa di ${kelasAsal} untuk dinaikkan.`, true);
      if (!doubleConfirm(`Naikkan ${siswaDiKelas.length} siswa dari ${kelasAsal} ke ${kelasTujuan}?`)) return;
      showLoading();
      let processed = 0; const total = siswaDiKelas.length;
      tulisAdmin(null, null, () => {       siswaDiKelas.forEach(s => { db.ref('siswa/'+s.key).update({ kelas: kelasTujuan, updatedAt: new Date().toISOString() }, err => { processed++; if (err) console.error('Gagal update:', s.name, err); if (processed === total) { hideLoading(); toast(`✅ ${total} siswa berhasil naik ke ${kelasTujuan}!`); addLog('promosi_kelas', kelasAsal + ' → ' + kelasTujuan + ' (' + total + ' siswa)'); reloadDataset('siswa', () => { populateClassFilterDropdowns(); renderSiswa(); }); } }); }); }, () => hideLoading());
    }
    function graduateClass() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('graduateClass')) return toast('Sedang memproses, mohon tunggu...', false, 1500);
      const kelas = kelasTertinggi();
      const siswaLulus = allSiswa.filter(s => s.kelas === kelas);
      if (siswaLulus.length === 0) return toast(`Tidak ada siswa di ${kelas} untuk diluluskan.`, true);
      if (!doubleConfirm(`Luluskan ${siswaLulus.length} siswa dari ${kelas}? Siswa akan dipindahkan ke alumni.`)) return;
      const btnGraduate = document.getElementById('btnGraduateClass');
      setBusy('graduateClass', btnGraduate);
      showLoading();
      let processed = 0; const total = siswaLulus.length; const tahunLulus = new Date().getFullYear();
      const gagalPindah = [];
      // PENTING: siswa/{key} HANYA dihapus kalau penyalinan ke node alumni BERHASIL
      // (else). Sebelumnya remove() dipanggil tanpa syarat di dalam callback set(),
      // jadi kalau simpan ke alumni gagal (jaringan/permission), siswa tetap terhapus
      // dari node siswa padahal tidak pernah tersimpan sebagai alumni -- data hilang
      // permanen. Sekarang kegagalan dilaporkan & siswa TETAP ada di node siswa supaya
      // Admin bisa coba lagi.
      siswaLulus.forEach(s => { db.ref('alumni').push().set({ name: s.name, kelas: s.kelas, tahunLulus: tahunLulus, guru: s.guru || 'Admin', lulusPada: new Date().toISOString(), dataAsli: s }, err => {
        if (err) {
          console.error('Gagal pindah ke alumni:', s.name, err);
          gagalPindah.push(s.name);
          processed++;
          if (processed === total) selesaiProsesLulus();
        } else {
          db.ref('siswa/'+s.key).remove(err2 => { processed++; if (err2) { console.error('Gagal hapus siswa:', s.name, err2); gagalPindah.push(s.name); } if (processed === total) selesaiProsesLulus(); });
        }
      }); });
      function selesaiProsesLulus() {
        hideLoading();
        clearBusy('graduateClass', btnGraduate);
        const berhasil = total - gagalPindah.length;
        if (gagalPindah.length === 0) {
          toast(`🎓 ${total} siswa berhasil diluluskan!`);
        } else {
          toast(`🎓 ${berhasil} siswa diluluskan. ⚠️ ${gagalPindah.length} siswa (${gagalPindah.join(', ')}) GAGAL dipindah -- data tetap di daftar siswa, silakan coba lagi.`, true, 8000);
        }
        addLog('kelulusan', tahunLulus + ' - ' + berhasil + ' siswa' + (gagalPindah.length ? ` (${gagalPindah.length} gagal)` : ''));
        reloadDataset('siswa', () => { populateClassFilterDropdowns(); renderSiswa(); });
      }
    }
    function showAlumni() {
      const container = document.getElementById('alumniContainer'), list = document.getElementById('alumniList');
      if (container.style.display === 'block') { container.style.display = 'none'; return; }
      container.style.display = 'block'; list.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px;">Memuat data alumni...</td></tr>';
      db.ref('alumni').once('value', snap => { const data = snap.val(); if (!data) { list.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px;">Belum ada alumni.</td></tr>'; return; } let html = ''; let no = 1; const entries = Object.entries(data).reverse(); entries.forEach(([key, val]) => { html += `<tr><td style="padding:8px 12px;">${no++}</td><td style="padding:8px 12px;font-weight:500;">${escapeHtml(val.name||'-')}</td><td style="padding:8px 12px;">${escapeHtml(val.kelas||'-')}</td><td style="padding:8px 12px;">${escapeHtml(val.tahunLulus||'-')}</td><td style="padding:8px 12px;text-align:center;"><button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusAlumni('${key}')">🗑️</button></td></tr>`; }); list.innerHTML = html; });
    }
    function hapusAlumni(key) { if (!isAdmin()) return toast('Hanya Admin!', true); if (!doubleConfirm('Hapus data alumni ini?')) return; db.ref('alumni/'+key).remove(err => { if (err) toast('Gagal: '+err.message, true); else toast('✅ Alumni dihapus.'); showAlumni(); }); }
    function clearAlumni() { if (!isAdmin()) return toast('Hanya Admin!', true); if (!doubleConfirm('Hapus SEMUA data alumni? Tindakan ini permanen!')) return; db.ref('alumni').remove(err => { if (err) toast('Gagal: '+err.message, true); else toast('✅ Semua alumni dihapus.'); showAlumni(); }); }
    function exportAlumni() { if (!isAdmin()) return toast('Hanya Admin!', true); db.ref('alumni').once('value', snap => { const data = snap.val(); if (!data) return toast('Tidak ada data alumni.', true); let csv = 'No,Nama,Kelas,Tahun Lulus,Tanggal Lulus\n'; let no = 1; Object.values(data).forEach(val => { const tanggal = val.lulusPada ? new Date(val.lulusPada).toLocaleDateString('id-ID') : '-'; csv += `${no++},${val.name||'-'},${val.kelas||'-'},${val.tahunLulus||'-'},${tanggal}\n`; }); downloadFile(csv, `alumni_${new Date().getFullYear()}.csv`, 'text/csv'); toast('📥 Export alumni berhasil!'); }); }

    // ============================================================
    // DOWNLOAD FILE
    // ============================================================
    function downloadFile(content, filename, type) {
      const blob = new Blob(['\uFEFF' + content], { type: type + ';charset=utf-8' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    }
    // [Dipindah ke js/laporan-rekap.js] pembantu PDF rekap + Rekap Absensi Siswa/Guru/Jurnal/Semua.

    // ============================================================
    // BACKUP, RESET, EKSPOR, IMPOR
    // ============================================================
    // Backup diunduh LANGSUNG ke perangkat Admin (file .json ke folder Downloads browser), bukan
    // diunggah ke Firebase Storage (butuh plan berbayar Blaze; project ini di plan gratis Spark).
    // Konsekuensinya: backup tidak otomatis "tersimpan di cloud" -- Admin sebaiknya sesekali
    // memindahkan file .json hasil backup ke tempat lebih aman (Google Drive, email ke diri
    // sendiri, dll), karena folder Downloads di satu perangkat bukan penyimpanan cadangan yang
    // tahan hilang/rusak.
    function unduhBackupJson(data, filename) {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }
    function autoBackup() { if (!isAdmin()) return;
      console.log('🔄 Auto backup (6 jam) dimulai...');
      db.ref().once('value', snap => {
        const data = snap.val() || {};
        const now = new Date();
        const filename = `backup_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}.json`;
        try {
          unduhBackupJson(data, filename);
          console.log('✅ Backup otomatis diunduh:', filename);
          toast('💾 Backup otomatis diunduh ke perangkat ini.');
          addLog('backup', 'Auto backup');
        } catch (err) { console.error('❌ Auto backup gagal:', err); }
      });
    }
    function manualBackup() { if (!isAdmin()) return toast('Hanya Admin!', true);
      showLoading();
      db.ref().once('value', snap => {
        const data = snap.val() || {};
        const now = new Date();
        const filename = `backup_manual_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}.json`;
        try {
          unduhBackupJson(data, filename);
          hideLoading();
          toast('✅ Backup berhasil diunduh ke perangkat ini!');
          console.log('✅ Backup manual:', filename);
          addLog('backup', 'Manual backup');
        } catch (err) { hideLoading(); toast('❌ Backup gagal: '+err.message, true); console.error(err); }
      });
    }
    // resetSemua(), exportData() dan importData() SENGAJA DICABUT -- ketiganya butuh
    // akses tulis/baca ke ROOT database (db.ref() tanpa path), dan karena semua user login
    // lewat signInAnonymously() (tidak ada perbedaan identitas asli di level Firebase Auth),
    // izin tulis di root otomatis berlaku untuk SIAPA SAJA yang sudah membuka aplikasi ini --
    // bukan cuma Admin. Baris `if (!isAdmin())` di bawah cuma cek di JavaScript, gampang
    // dilewati lewat DevTools/Console. Database Rules sekarang mengunci ".write" di root jadi
    // false, sehingga 3 fungsi ini TIDAK akan berfungsi lagi lewat app. Reset/Export/Import
    // data sekarang HARUS dilakukan manual oleh pemegang akun Google project lewat Firebase
    // Console (Realtime Database → Data → titik tiga di kanan atas → Import/Export JSON).
    // manualBackup TETAP jalan (autoBackup 6 jam sudah dinonaktifkan, tidak lagi dijadwalkan) -- itu cuma BACA root,
    // bukan tulis, dan root ".read" sengaja tetap dibiarkan terbuka untuk kenyamanan backup.
    function resetSemua() { toast('Fitur ini sudah dipindah ke Firebase Console demi keamanan data. Hubungi pengelola akun project.', true); }
    function exportData() { toast('Fitur ini sudah dipindah ke Firebase Console demi keamanan data. Hubungi pengelola akun project.', true); }
    function importData(event) { if (event && event.target) event.target.value = ''; toast('Fitur ini sudah dipindah ke Firebase Console demi keamanan data. Hubungi pengelola akun project.', true); }
    // [Dipindah ke js/laporan-rekap.js] halaman Laporan (pratinjau, generator laporan, downloadReportPDF).

    // ============================================================
    // NEW FEATURE: MANAJEMEN USER
    // ============================================================
    function renderUserList() {
      const list = document.getElementById('userList');
      const pagination = document.getElementById('userPagination');
      
      if (!isAdmin()) {
        if (list) list.innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin yang bisa mengakses halaman ini.</p>';
        if (pagination) pagination.innerHTML = '';
        return;
      }

      if (!allGuru || allGuru.length === 0) {
        if (list) list.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">Belum ada data pengguna. Silakan tambahkan pengguna baru.</p>';
        if (pagination) pagination.innerHTML = '';
        return;
      }

      const sorted = [...allGuru].sort((a, b) => COLLATOR_ID.compare(a.name, b.name));
      const totalItems = sorted.length;
      const ps = pagerSize('users') || totalItems || 1, totalPages = Math.max(1, Math.ceil(totalItems / ps));
      let page = parseInt(localStorage.getItem('userPage') || '1');
      if (page > totalPages) page = totalPages;
      if (page < 1) page = 1;
      const start = (page - 1) * ps;
      const end = Math.min(start + ps, totalItems);
      const pageItems = sorted.slice(start, end);

      if (list) {
        let html = `<div style="overflow-x:auto;"><table>
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;">No</th>
              <th style="padding:8px 12px;">Nama</th>
              <th style="padding:8px 12px;">Role</th>
              <th style="padding:8px 12px;">Kelas</th>
              <th style="padding:8px 12px;text-align:center;">Aksi</th>
            </tr>
          </thead>
          <tbody>`;

        pageItems.forEach((g, idx) => {
          const roleLabel = getRoleLabel(g.role);
          const roleClass = g.role || 'guru';
          const kelasStr = g.semuaKelas ? '🌟 Semua Kelas' : (Array.isArray(g.kelas) ? g.kelas.join(', ') : g.kelas || '-');
          const waliInfo = g.role === 'wali_kelas' && g.waliKelasOf ? `<br>👑 Wali: ${escapeHtml(g.waliKelasOf)}` : '';
          const tunjanganInfo = (g.tunjanganMasaKerja || g.bantuanTransportasi) ? `<br>💰 Rp ${(g.tunjanganMasaKerja||0).toLocaleString()} | 🛵 Rp ${(g.bantuanTransportasi||0).toLocaleString()}` : '';
          html += `<tr>
            <td style="padding:8px 12px;">${start + idx + 1}</td>
            <td style="padding:8px 12px;font-weight:500;">${escapeHtml(g.name)}</td>
            <td style="padding:8px 12px;"><span class="role-badge ${roleClass}">${roleLabel}</span></td>
            <td class="text-muted" style="padding:8px 12px;font-size:12px;">${escapeHtml(kelasStr)}${waliInfo}${tunjanganInfo}</td>
            <td style="padding:8px 12px;text-align:center;">
              <button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="openEditGuruModal('${g.key}')">✏️</button>
              <button class="btn btn-warning" style="padding:2px 10px;font-size:11px;" onclick="resetPinGuru('${g.key}')">🔄</button>
              <button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusDataWithConfirm('guru','${g.key}','Pengguna ${escapeJs(g.name)}')">🗑️</button>
            </td>
          </tr>`;
        });

        html += `</tbody></table></div>`;
        list.innerHTML = html;
      }

      if (pagination) {
        pagination.innerHTML = pagerHtml('users', totalItems, totalPages, start, end, 'pengguna');
      }
    }

    function getRoleLabel(role) {
      const map = {
        'guru': 'Guru',
        'wali_kelas': 'Wali Kelas'
      };
      return map[role] || 'Guru';
    }

    function toggleUserAllClass() {
      const checked = document.getElementById('userAllClass').checked;
      document.querySelectorAll('.user-class-check').forEach(cb => {
        cb.checked = checked;
        cb.disabled = checked;
      });
    }

    function tambahUser() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('tambahUser')) return toast('Sedang menyimpan...', false, 1500);
      const name = document.getElementById('userName').value.trim();
      const pin = document.getElementById('userPin').value.trim();
      const role = document.getElementById('userRole').value;
      
      if (!name) return toast('Nama wajib diisi!', true);
      if (!pin || !/^\d{6}$/.test(pin)) return toast('PIN harus 6 digit angka!', true);
      
      let waliKelasOf = '';
      if (role === 'wali_kelas') {
        waliKelasOf = document.getElementById('userWaliKelasOf').value;
        if (!waliKelasOf) return toast('Pilih Wali Kelas dari kelas berapa!', true);
      }

      const allClass = document.getElementById('userAllClass').checked;
      let checkedClasses = [];
      if (allClass) {
        checkedClasses = [...KELAS_LIST];
      } else {
        document.querySelectorAll('.user-class-check:checked').forEach(cb => checkedClasses.push(cb.value));
      }
      if (waliKelasOf && !checkedClasses.includes(waliKelasOf)) checkedClasses.push(waliKelasOf);
      if (checkedClasses.length === 0) return toast('Pilih minimal 1 kelas!', true);

      if (typeof kredAdminTambahGuru !== 'function') return toast('Modul kredensial belum termuat. Muat ulang halaman lalu coba lagi.', true);
      const btnTambahUser = document.getElementById('btnTambahUser');
      setBusy('tambahUser', btnTambahUser);
      // [KREDENSIAL v1] guru baru + kredensial PIN-nya ditulis atomik oleh js/kredensial.js (hash tidak masuk ke data guru).
      kredAdminTambahGuru(db.ref('guru').push().key, {
        name,
        kelas: checkedClasses,
        semuaKelas: allClass,
        role: role,
        waliKelasOf: waliKelasOf || null,
        dibuat: new Date().toISOString()
      }, pin, err => {
        clearBusy('tambahUser', btnTambahUser);
        if (err) toast('Gagal: ' + err.message, true);
        else {
          toastTersimpan('Pengguna ditambahkan');
          addLog('tambah_user', `${name} - ${role}`);
          document.getElementById('userName').value = '';
          document.getElementById('userPin').value = '';
          document.querySelectorAll('.user-class-check').forEach(cb => cb.checked = false);
          document.getElementById('userAllClass').checked = false;
          document.getElementById('userWaliKelasOf').value = '';
          document.getElementById('userWaliKelasOfContainer').style.display = 'none';
          document.getElementById('userRole').value = 'guru';
          reloadDataset('logs');
          // PENTING: allGuru TIDAK dimuat oleh loadAllData() sama sekali -- itu cuma diisi oleh
          // loadGuruListForLogin() (dipanggil sekali di layar login). Sebelumnya di sini cuma
          // setTimeout(renderUserList,500) tanpa refresh allGuru -- user baru yang baru ditambah
          // TIDAK PERNAH muncul di daftar sampai Admin logout+login ulang (bukan soal timing,
          // datanya memang tidak pernah diambil ulang). Fix: refresh allGuru dulu via
          // loadGuruListForLogin(), BARU renderUserList() setelah itu selesai.
          loadGuruListForLogin(() => renderUserList());
        }
      });
    }

    // ============================================================
    // DASHBOARD UPDATE
    // ============================================================
    // Pintasan cepat di atas Dashboard -- disesuaikan per role, supaya tidak menampilkan
    // tombol yang tidak relevan/tidak bisa dipakai (mis. Admin tidak punya Absen Guru sendiri).
    function renderDashboardQuickActions() {
      const box = document.getElementById('dashQuickActions'); if (!box || !currentUser) return;
      const items = [];
      if (isTeacher() || isWaliKelas()) {
        items.push({ icon:'📷', label:'Absen QR', primary:true, onclick:'quickShortcutAbsenQr()' });
        items.push({ icon:'📝', label:'Isi Jurnal', onclick:"navigateTo('journal')" });
        items.push({ icon:'✅', label:'Absensi Siswa', onclick:"navigateTo('attendance')" });
      }
      if (isAdmin() || isKepsek()) {
        items.push({ icon:'📋', label:'Absen Guru Hari Ini', onclick:"navigateTo('teacher-attendance')" });
        items.push({ icon:'🧑‍🎓', label:'Data Siswa', onclick:"navigateTo('students')" });
      }
      if (isAdmin()) items.push({ icon:'📢', label:'Kelola Pengumuman', onclick:"document.getElementById('pengumumanAdmin').scrollIntoView({behavior:'smooth'})" });
      if (items.length === 0) return;
      box.innerHTML = items.map(it => `<button type="button" class="dash-quick-btn${it.primary?' primary':''}" onclick="${it.onclick}"><span class="dash-quick-icon">${it.icon}</span><span>${it.label}</span></button>`).join('');
    }
    // Pintasan "Absen QR" dari Dashboard: langsung pindah ke halaman Absen Guru dan otomatis
    // membuka kamera scan QR, supaya guru tidak perlu 2 langkah (buka menu, lalu klik scan).
    function quickShortcutAbsenQr() {
      if (!isTeacher() && !isWaliKelas()) return toast('Hanya Guru & Wali Kelas!', true);
      // navigateTo() sudah merender halaman Absen Guru secara SINKRON (bukan async), jadi
      // startCamera() aman dipanggil langsung setelahnya tanpa perlu setTimeout menebak-nebak
      // durasi -- konsisten dengan bottomNavScanQr() yang dibuat belakangan.
      navigateTo('teacher-attendance');
      startCamera();
    }
    // Panel STATISTIK/GRAFIK/JADWAL/dll dibungkus collapsible (dashDetailSection) supaya
    // tampilan awal Dashboard ringkas. Chart.js TIDAK bisa menghitung ukuran dengan benar kalau
    // canvas-nya dibuat/diupdate selagi induknya display:none (lebar/tinggi kebaca 0) -- makanya
    // begitu panel dibuka, instance chart yang sudah ada di-resize() manual (bukan cuma update())
    // supaya tidak muncul kosong/gepeng. setTimeout kecil dipakai supaya browser sempat
    // menghitung ulang layout (reflow) SEBELUM Chart.js membaca ukuran barunya.
    function toggleDashDetail() {
      const sec = document.getElementById('dashDetailSection'), btn = document.getElementById('btnToggleDashDetail');
      const akanDibuka = sec.style.display === 'none';
      sec.style.display = akanDibuka ? '' : 'none';
      if (btn) btn.innerHTML = akanDibuka ? '📊 Sembunyikan Detail &amp; Statistik ▲' : '📊 Lihat Detail &amp; Statistik ▾';
      if (akanDibuka) {
        if (typeof Chart === 'undefined') { try { renderCharts(); } catch (e) {} }   // memicu pemuatan Chart.js (lazy)
        setTimeout(() => {
          [siswaChartInstance, guruChartInstance, dashboardNilaiChartInstance, dashboardInfaqChartInstance].forEach(inst => { if (inst) inst.resize(); });
        }, 50);
      }
    }
    function updateDashboard() {
      renderDashboardQuickActions();
      // Statistik "Kehadiran Hari Ini" (%) dan "Guru Hadir Hari Ini" adalah ringkasan LEVEL-SEKOLAH
      // -- disembunyikan untuk guru biasa (pola sama seperti panel lain di dashboard), tersisa
      // cuma 2 kartu yang relevan buat dia: jumlah siswa di kelasnya & jurnal yang sudah dia isi.
      // Grid disesuaikan dari 4 kolom -> 2 kolom supaya 2 kartu yang tersisa tidak menyisakan
      // ruang kosong di sebelah kanan.
      const bolehLihatSemua = isAdmin() || isKepsek();
      const statHadirCard = document.getElementById('statHadir') ? document.getElementById('statHadir').closest('.stat-card') : null;
      const statAbsenGuruCard = document.getElementById('statAbsenGuru') ? document.getElementById('statAbsenGuru').closest('.stat-card') : null;
      const statsGrid = document.querySelector('.dashboard-grid');
      if (statHadirCard) statHadirCard.style.display = bolehLihatSemua ? '' : 'none';
      if (statAbsenGuruCard) statAbsenGuruCard.style.display = bolehLihatSemua ? '' : 'none';
      if (statsGrid) statsGrid.style.gridTemplateColumns = bolehLihatSemua ? '' : 'repeat(2,1fr)';
      const statSiswaLabelEl = document.getElementById('statSiswa') ? document.getElementById('statSiswa').parentElement.querySelector('.stat-label') : null;
      if (statSiswaLabelEl) statSiswaLabelEl.textContent = bolehLihatSemua ? 'Total Siswa' : 'Siswa di Kelas Saya';
      const statJurnalLabelEl = document.getElementById('statJurnal') ? document.getElementById('statJurnal').parentElement.querySelector('.stat-label') : null;
      if (statJurnalLabelEl) statJurnalLabelEl.textContent = bolehLihatSemua ? 'Jurnal Hari Ini' : 'Jurnal Saya Hari Ini';

      document.getElementById('statSiswa').textContent = allSiswa.length;
      const today = tglLokal();
      const hadir = allAttendance.filter(a => a.tanggal === today && loaderScopeKelas().includes(a.kelas) && a.tahunAjaran === currentTahunAjaran);
      let totalHadir = 0, totalSiswa = 0;
      hadir.forEach(a => { if (a.data) { const values = Object.values(a.data); totalHadir += values.filter(v => v === 'H').length; totalSiswa += values.length; } });
      document.getElementById('statHadir').textContent = totalSiswa > 0 ? Math.round((totalHadir/totalSiswa)*100) + '%' : '0%';
      const jurnalHariIni = allJournals.filter(j => j.tanggal === today && (isAdmin() || isKepsek() || (j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name)) && j.tahunAjaran === currentTahunAjaran && j.status !== 'ditolak');
      document.getElementById('statJurnal').textContent = jurnalHariIni.length;
      const guruHadir = allTeacherAttendance.filter(a => a.tanggal === today && a.tahunAjaran === currentTahunAjaran);
      document.getElementById('statAbsenGuru').textContent = guruHadir.length;
      document.getElementById('lastUpdate').textContent = 'Data terakhir diupdate: ' + new Date().toLocaleString();

      const journalList = document.getElementById('dashboardJournalList');
      if (jurnalHariIni.length === 0) journalList.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada jurnal hari ini.</p>';
      else { let html = ''; jurnalHariIni.slice(0,5).forEach(j => { html += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb;font-size:13px;"><span>${escapeHtml(j.subject)} - ${escapeHtml(j.kelas)}</span><span class="text-muted">Jam ${escapeHtml(j.jam_ke)}</span></div>`; }); if (jurnalHariIni.length > 5) html += `<div class="text-muted" style="font-size:12px;margin-top:4px;">+ ${jurnalHariIni.length - 5} lainnya</div>`; journalList.innerHTML = html; }

      const teacherList = document.getElementById('dashboardTeacherAttendanceList');
      if (isAdmin() || isKepsek()) {
        const guruHadirToday = allTeacherAttendance.filter(a => a.tanggal === today && a.tahunAjaran === currentTahunAjaran);
        if (guruHadirToday.length === 0) teacherList.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada absen guru hari ini.</p>';
        else { let html = ''; guruHadirToday.forEach(a => { const label = a.type === 'Sakit' ? '🤒 Sakit' : a.type === 'Izin' ? '📝 Izin' : a.type === 'Alpha' ? '❌ Alpha' : a.type || '-'; html += `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e5e7eb;font-size:13px;"><span>${escapeHtml(a.guru)}</span><span class="text-muted">${escapeHtml(label)}</span></div>`; }); teacherList.innerHTML = html; }
      }

      renderBelumAbsen();
      renderJadwalHariIni();
      renderLogs();
      renderCharts();
      updateStatusBar();
    }

    // ============================================================
    // REFRESH & DEBUG
    // ============================================================
    // Refresh cukup memuat ulang data. (Sebelumnya juga memanggil showDebug() yang mengunduh SELURUH database
    // -- termasuk foto & hash PIN semua guru -- setiap kali tombol Refresh ditekan siapa pun.)
    function refreshAllData() { toast('🔄 Memuat ulang data...'); showLoading(); loadAllData(() => { hideLoading(); toast('✅ Data diperbarui'); }); }
    // Debug: hanya Admin, hanya RINGKASAN (jumlah data & sesi). Tidak lagi membaca/menampilkan seluruh database
    // (boros kuota Firebase dan membuka hash PIN + data siswa di layar). Untuk isi mentah pakai Firebase Console.
    function showDebug() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const box = document.getElementById('debugBox'); box.style.display = 'block';
      const content = document.getElementById('debugContent');
      let output = '=== STATISTIK ===\n';
      output += `Total Guru: ${allGuru.length}\nTotal Siswa: ${allSiswa.length}\nTotal Attendance: ${allAttendance.length}\nTotal Grades: ${allGrades.length}\nTotal Journals: ${allJournals.length}\nTotal Teacher Attendance: ${allTeacherAttendance.length}\nTotal Religi Attendance: ${allReligiAttendance.length}\nTotal Pengumuman: ${allPengumuman.length}\nTotal Logs: ${allLogs.length}\nTotal Surat: ${allSurat.length}\nTotal Jadwal: ${allJadwal.length}\n`;
      output += `\nCurrent User: ${currentUser ? currentUser.name : 'None'}\nRole: ${currentUser ? currentUser.role : 'None'}\nKelas: ${currentUser ? currentUser.kelas.join(', ') : 'None'}\nSemua Kelas: ${currentUser ? currentUser.semuaKelas : false}\nTahun Ajaran: ${currentTahunAjaran}`;
      content.textContent = output;
    }


    // ============================================================
    // CEK KONEKSI
    // ============================================================
    function checkFirebase() {
      const statusEl = document.getElementById('firebaseStatus'), connStatus = document.getElementById('connectionStatus');
      statusEl.className = 'status-badge'; statusEl.textContent = '⏳ Mengecek...';
      connStatus.textContent = '⏳ Menghubungkan ke SI MAMBA...'; connStatus.style.background = '#fef3c7'; connStatus.style.color = '#92400e';
      db.ref('.info/connected').on('value', snap => {
        if (snap.val()) {
          statusEl.className = 'status-badge'; statusEl.textContent = '✅ Terhubung ke SI MAMBA';
          connStatus.textContent = '✅ Terhubung ke SI MAMBA'; connStatus.style.background = '#dcfce7'; connStatus.style.color = '#065f46';
          if (!document.getElementById('loginGuru').innerHTML.includes('Admin')) loadGuruListForLogin();
          if (currentUser && !dataLoaded) { loadAllData(() => { hideLoading(); toast('Data dimuat ulang'); }); }
          // Auto backup 6 jam DINONAKTIFKAN (hemat bandwidth Firebase). Backup dilakukan manual 1x/minggu lewat Firebase Console.
        } else {
          statusEl.className = 'status-badge disconnected'; statusEl.textContent = '❌ Tidak terhubung ke SI MAMBA';
          connStatus.textContent = '❌ Tidak terhubung ke SI MAMBA'; connStatus.style.background = '#fee2e2'; connStatus.style.color = '#991b1b';
        }
      });
    }

    // ============================================================
    // INISIALISASI
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
      registerServiceWorker();
      loadDarkMode();
      const _loginGuruEl = document.getElementById('loginGuru');
      if (_loginGuruEl) { _loginGuruEl.addEventListener('change', sinkronRememberMe); sinkronRememberMe(); }

      // ===== OFFLINE SUPPORT: status koneksi & antrian sinkronisasi =====
      setOfflineBannerVisible(!navigator.onLine);
      updatePendingBadge();
      window.addEventListener('online', handleBrowserOnline);
      window.addEventListener('offline', handleBrowserOffline);
      // Cadangan untuk browser yang tidak mendukung Background Sync API (mis. iOS Safari):
      // selama tab ini terbuka, coba kirim ulang antrian tiap 30 detik ketika online.
      setInterval(() => { if (isReallyOnline() && pendingWriteCount > 0) flushPendingWrites(); }, 30000);

      document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', function() { const page = this.dataset.page; if (page) navigateTo(page); });
      });

      document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('sidebarOverlay'), hamburger = document.querySelector('.hamburger');
        // Tombol pemicu sidebar (hamburger & tab "Menu" di bottom nav) dikecualikan: onclick-nya sudah
        // memanggil toggleSidebar(); tanpa pengecualian, handler ini langsung menutup lagi sidebar yang baru dibuka.
        const isSidebarTrigger = !!(e.target.closest && e.target.closest('.hamburger, .bottom-nav'));
        if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !(hamburger && hamburger.contains(e.target)) && !isSidebarTrigger) {
          sidebar.classList.remove('open'); overlay.classList.remove('show');
        }
      });

      const savedUser = loadSession();
      if (savedUser) { currentUser = savedUser; (navigator.onLine ? authReady : Promise.resolve()).then(() => showApp()); }
      else {
        document.getElementById('loginChooser').style.display = 'flex'; document.getElementById('appPage').style.display = 'none';
        const greetEl = document.getElementById('loginGreeting');
        if (greetEl) greetEl.textContent = salamWaktu() + '! Selamat datang di SI MAMBA 👋';
        // App dibuka offline & belum pernah login di perangkat ini -- checkFirebase() di bawah
        // tidak akan sempat memanggil loadGuruListForLogin() (butuh '.info/connected'=true dulu),
        // jadi panggil langsung di sini supaya dropdown login tetap terisi dari cache IndexedDB.
        if (!navigator.onLine) loadGuruListForLogin();
      }
      checkFirebase();
      const today = tglLokal();
      document.getElementById('attendanceDate').value = today;
      document.getElementById('journalDate').value = today;
      document.getElementById('rekapFilterTanggal').value = today;
      document.getElementById('journalJam')?.addEventListener('change', () => { updateJamDisplay(); checkBentrokJurnal(); });
      if (typeof lucide !== 'undefined') lucide.createIcons();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { stopCamera(); return; }
        // Kembali dari minimize/background -- kalau overlay loading sudah "nyangkut" lebih dari
        // 8 detik (jauh lebih lama dari kondisi normal), paksa tutup & coba muat ulang data,
        // daripada membiarkan pengguna terjebak layar loading selamanya. 8 detik dipilih supaya
        // tidak mengganggu loading yang memang masih wajar berjalan saat app baru dibuka lagi.
        if (loadingStartedAt && (Date.now() - loadingStartedAt > 8000)) {
          hideLoading();
          toast('⏳ Memuat ulang data setelah aplikasi aktif kembali...', false, 2500);
          if (currentUser) loadAllData(); // renderAll() -> updateDashboard() sudah memanggil renderCharts()
        }
      });
      startStatusBarTimer();
    });


    /* ============================================================
       SI MAMBA 4.0 — ARCHITECTURE / WORKFLOW LAYER
       Catatan: layer ini kompatibel dengan Firebase schema lama.
       Data baru disimpan pada namespace *_v4 agar tidak merusak data lama.
    ============================================================ */
    const V4 = { version:'4.0', mode:null, baseRole:null, notifications:[], tasks:[], activityTypes:[], activityAttendance:[], activitySubstitutes:{}, ekskulSubstitutes:{}, tahfidzPic:{}, ekskuls:[], ekskulAttendance:[], tahfidz:[], approvals:[], rates:{}, absenQr:null, pramukaPic:{}, pramukaSku:[] };
    // V4_ROLES dulu duplikat persis dari ROLES (didefinisikan di dekat awal file, dekat
    // hashPin) -- sekarang semua fungsi v4* di bawah ini memakai ROLES yang sama supaya
    // hanya ada SATU sumber kebenaran untuk nilai role, bukan dua konstanta terpisah yang
    // kebetulan nilainya sama dan harus diupdate manual di dua tempat kalau berubah.
    function v4LabelRole(role){ return role===ROLES.ADMIN?'Administrator':role===ROLES.HEADMASTER?'Kepala Madrasah':role===ROLES.WALI_KELAS?'Wali Kelas':'Guru'; }
    function v4IsAdmin(){ return currentUser && currentUser.role===ROLES.ADMIN; }
    function v4IsHead(){ return currentUser && currentUser.role===ROLES.HEADMASTER; }
    function v4IsTeacher(){ return currentUser && (currentUser.role===ROLES.TEACHER || currentUser.role===ROLES.WALI_KELAS); }
    function v4CanAdmin(){ return v4IsAdmin(); }
    function v4CanHead(){ return v4IsAdmin() || v4IsHead(); }
    function v4CanClass(){ return v4IsAdmin() || v4IsHead() || v4IsTeacher(); }
    function v4Safe(s){ return typeof escapeHtml==='function' ? escapeHtml(s==null?'':String(s)) : String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    function v4Date(){ return tglLokal(); }
    function v4Notify(title,message,type='INFO',userKey=null,referenceType='',referenceId=''){
      const target = userKey || (currentUser && currentUser.key) || 'system';
      return db.ref('notifications_v4').push().set({userKey:target,title,message,type,referenceType,referenceId,isRead:false,createdAt:new Date().toISOString(),tahunAjaran:currentTahunAjaran});
    }
    function v4Audit(action,entityType,entityId,oldData=null,newData=null){
      if(!currentUser) return;
      return db.ref('audit_logs_v4').push().set({userKey:currentUser.key||currentUser.name,userName:currentUser.name,role:currentUser.role,action,entityType,entityId,oldData,newData,createdAt:new Date().toISOString(),tahunAjaran:currentTahunAjaran});
    }

    // -------- Role chooser: satu akun dapat Guru + Wali Kelas --------
    function v4AvailableModes(){
      if(!currentUser) return [];
      if(v4IsAdmin()) return [{id:'admin',title:'Administrator',desc:'Kelola master data, permission, honor, konfigurasi dan sistem.',emoji:'⚙️'}];
      if(v4IsHead()) return [{id:'headmaster',title:'Kepala Madrasah',desc:'Monitoring dan approval tingkat madrasah.',emoji:'👑'}];
      const guru = (allGuru||[]).find(g=>g.key===currentUser.key) || {};
      const modes=[{id:'teacher',title:'Guru',desc:'Mengajar, absensi, jurnal, nilai dan tugas kegiatan.',emoji:'👨‍🏫'}];
      // FIX: sebelumnya cuma baca guru.waliKelasOf/isWaliKelas/assignmentWaliKelas dari lookup
      // allGuru di atas -- kalau fungsi ini dipanggil sebelum allGuru selesai dimuat (mis. race
      // condition tepat setelah login/refresh), guru jadi {} dan opsi "Wali Kelas" hilang dari
      // pilihan mode walau guru itu memang wali kelas. currentUser.waliKelasOf sudah pasti terisi
      // sejak login() (lihat fix di sana), jadi dipakai sebagai fallback saat data guru live
      // belum/tidak ketemu.
      const kelasWaliFallback = guru.waliKelasOf || currentUser.waliKelasOf || null;
      if(guru.waliKelasOf || guru.isWaliKelas || guru.assignmentWaliKelas || currentUser.waliKelasOf) modes.push({id:'wali_kelas',title:'Wali Kelas',desc:`Mengelola kelas ${escapeHtml(kelasWaliFallback||'yang ditugaskan')}, raport dan monitoring siswa.`,emoji:'🌟'});
      return modes;
    }
    function v4OpenRoleChooser(){
      if(!currentUser) return;
      const options=document.getElementById('v4RoleOptions'); if(!options) return;
      const modes=v4AvailableModes();
      options.innerHTML=modes.map(m=>`<button type="button" class="v4-role-option ${V4.mode===m.id?'selected':''}" data-mode="${m.id}" onclick="v4SelectRoleMode('${m.id}')"><div class="emoji">${m.emoji}</div><strong>${m.title}</strong><span>${m.desc}</span></button>`).join('');
      document.getElementById('v4RoleModal').classList.add('show');
    }
    function v4SelectRoleMode(mode){ V4.mode=mode; document.querySelectorAll('.v4-role-option').forEach(x=>x.classList.toggle('selected',x.dataset.mode===mode)); }
    function v4ModeStorageKey(){ return 'sim_mode_' + ((currentUser && (currentUser.key||currentUser.name)) || 'anon'); }
    function v4ConfirmRoleMode(){
      if(!V4.mode) V4.mode=v4AvailableModes()[0]?.id;
      if(!V4.mode) return;
      const old=currentUser.role;
      currentUser.role=V4.mode;
      // FIX: dulu `V4.baseRole||old` -- V4.baseRole tidak pernah diisi di mana pun (selalu null),
      // dan `old` diambil dari currentUser.role SAAT INI, yang pada perubahan mode KEDUA sudah
      // berisi mode sebelumnya (bukan role asli lagi, krn sudah ditimpa di perubahan pertama).
      // Akibatnya baseRole ikut berubah tiap ganti mode, padahal seharusnya tetap sama (role asli
      // guru, ditetapkan sekali saat login). Sekarang currentUser.baseRole yang SUDAH ada (dari
      // login) dipertahankan, tidak ditimpa lagi oleh perubahan mode berikutnya.
      currentUser.baseRole=currentUser.baseRole||V4.baseRole||old;
      // Kunci localStorage per-akun (bukan global) supaya di perangkat yang dipakai
      // bergantian oleh beberapa guru, mode kerja satu akun tidak "menular"/menimpa
      // mode akun lain saat mereka login di perangkat yang sama.
      localStorage.setItem(v4ModeStorageKey(),V4.mode);
      v4ApplyMode();
      v4CloseRoleChooser();
      if(currentUser) saveSession(currentUser);
      v4Audit('CHANGE_WORK_MODE','USER',currentUser.key||currentUser.name,{role:old},{role:currentUser.role});
      if(old!==V4.mode){
        toast('✅ Mode kerja diubah ke '+v4LabelRole(currentUser.role));
        // Kembali ke Dashboard supaya halaman yang sedang dibuka (yang bisa saja
        // khusus untuk mode sebelumnya, mis. halaman Wali Kelas) tidak tetap
        // tampil apa adanya -- tanpa ini, perpindahan mode terkesan "tidak
        // berfungsi" karena konten yang terlihat tidak berubah sama sekali.
        navigateTo('dashboard');
      }
      v4LoadCore();
    }
    function v4CloseRoleChooser(){ document.getElementById('v4RoleModal')?.classList.remove('show'); }
    function v4ApplyMode(){
      if(!currentUser) return;
      const roleText=v4LabelRole(currentUser.role)+(currentUser.role===ROLES.WALI_KELAS && currentUser.waliKelasOf?` • ${currentUser.waliKelasOf}`:'');
      document.getElementById('sidebarRole').textContent=roleText;
      // Badge mode di halaman Profil dibuat bisa diklik supaya guru yang punya lebih dari 1
      // mode kerja (Guru & Wali Kelas) bisa buka ulang popup pilih mode kapan saja -- bukan
      // cuma sekali muncul otomatis waktu login manual seperti sebelumnya. Kalau cuma punya
      // 1 mode (guru biasa / kepala / admin), badge tetap tampil tapi tidak bisa diklik.
      const modeBadge = document.getElementById('v4ProfileModeBadge');
      if (modeBadge) {
        modeBadge.replaceChildren(document.createTextNode(roleText));
        const bisaGantiMode = v4AvailableModes().length > 1;
        modeBadge.style.cursor = bisaGantiMode ? 'pointer' : '';
        modeBadge.title = bisaGantiMode ? 'Klik untuk ganti mode kerja (Guru / Wali Kelas)' : '';
        modeBadge.onclick = bisaGantiMode ? v4OpenRoleChooser : null;
      }
      document.getElementById('v4ProfileRole') && (document.getElementById('v4ProfileRole').textContent=roleText);
      const menuRules={
        'profile-v4':true,'dashboard':true,'teacher-attendance':v4IsTeacher(),'journal':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'grades':v4IsTeacher(),'attendance':v4IsTeacher()||v4IsAdmin(),'jadwal':v4CanClass(),'students':v4IsAdmin()||v4IsHead()||isWaliKelasAssigned(),
        'activities-v4':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'tahfidz-v4':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'ekskul-v4':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'pramuka-v4':v4IsAdmin()||v4IsHead()||v4PramukaMyKelas().length>0,
        'events':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'ujian':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'administrasi-ujian':(typeof aujCanOpenMenu === 'function' ? aujCanOpenMenu() : false),'bacaan-shalat':(typeof bsCanOpenMenu === 'function' ? bsCanOpenMenu() : false),
        'honor':v4IsAdmin()||v4IsHead(),'honor-slip':v4IsTeacher(),'infaq-madrasah':(infaqCanAccess()||isKepsek()),'kas-umum':(typeof kasCanOpenMenu === 'function' ? kasCanOpenMenu() : false),'sikap-siswa':sikapCanAccess(),'buku-penghubung':bukuCanAccess(),'info-ortu':sikapCanAccess(),'modul-ajar':(v4IsTeacher()||v4IsAdmin()||v4IsHead()),'buku-tamu':(v4IsAdmin()||v4IsHead()),'materi-belajar':bukuCanAccess(),'tugas-siswa':bukuCanAccess(),'kalender-akademik':true,'saran-kritik':saranKritikCanAccess(),'approval-v4':v4CanHead(),'raport-v4':v4IsAdmin()||v4IsHead()||isWaliKelasAssigned(),
        'laporan':v4CanHead(),'surat':v4IsAdmin()||v4IsHead()||isWaliKelasAssigned(),'notifications-v4':true,'tasks-v4':true,'user-management':v4IsAdmin(),'kelola-absen-guru':v4IsAdmin()||v4IsHead(),'admin':v4IsAdmin(),'profil-sekolah':v4IsAdmin(),'rekap-nilai':v4IsAdmin()||v4IsHead()||isWaliKelasAssigned(),
        'promotion':v4IsAdmin(),'setting-jam':v4IsAdmin(),'rekap':v4CanHead(),'rekap-jurnal':v4CanHead(),'religi':v4IsTeacher()
      };
      document.querySelectorAll('#v4SidebarMenu .menu-item').forEach(item=>{ const p=item.dataset.page; item.classList.toggle('hidden-tab',menuRules[p]===false); });
      // Tombol "Absensi" & FAB "Scan QR" di bottom-nav (mobile) sebelumnya selalu tampil untuk
      // semua peran, padahal menu sidebar yang setara ('attendance'/'teacher-attendance') sudah
      // disembunyikan untuk Admin/Kepsek lewat menuRules di atas. Disamakan di sini supaya kedua
      // navigasi konsisten.
      const bottomAbsensi = document.querySelector('.bottom-nav-item[data-bottom-page="attendance"]');
      if (bottomAbsensi) bottomAbsensi.style.display = menuRules['attendance'] === false ? 'none' : '';
      const bottomScanQrFab = document.querySelector('.bottom-nav-fab-wrap');
      if (bottomScanQrFab) bottomScanQrFab.style.display = menuRules['teacher-attendance'] === false ? 'none' : '';
      // Setiap kali menu diterapkan ulang (login, ganti mode, refresh), pastikan dropdown &
      // daftar siswa di fitur khusus wali kelas ikut terbatasi ke kelas yang benar-benar dia
      // ampu (lihat siswaScopeKelas()) -- tidak menunggu user buka halamannya dulu, supaya
      // begitu dibuka datanya sudah benar sejak awal.
      if (typeof refreshAllKelasDropdowns === 'function') refreshAllKelasDropdowns();
      if (typeof loadSiswaSuratDropdown === 'function' && document.getElementById('suratSiswaSelect')) loadSiswaSuratDropdown();
      document.getElementById('v4ProfileName')&&(document.getElementById('v4ProfileName').textContent=currentUser.name);
      document.getElementById('v4ProfileScope')&&(document.getElementById('v4ProfileScope').textContent=(v4IsAdmin()||v4IsHead())?'Semua Kelas':(currentUser.kelas||[]).join(', ')||'-');
      const guru=(allGuru||[]).find(g=>g.key===currentUser.key)||{};
      const assigns=[]; if(guru.waliKelasOf) assigns.push('🌟 Wali Kelas: '+guru.waliKelasOf); if(guru.kelas) assigns.push('📚 Mengajar: '+(Array.isArray(guru.kelas)?guru.kelas.join(', '):guru.kelas)); if(guru.assignmentActivity) assigns.push('🕌 Petugas kegiatan'); if(guru.assignmentEkskul) assigns.push('🎯 Pembina ekskul');
      document.getElementById('v4Assignments')&&(document.getElementById('v4Assignments').innerHTML=assigns.length?assigns.map(x=>`<div style="margin-bottom:6px;">${v4Safe(x)}</div>`).join(''):'<span>Belum ada assignment tambahan.</span>');
      // Bacaan Sholat: guru PJ per kelas (bs_pj_kelas) ikut menentukan menu. Data PJ dimuat SEKALI di sini, lalu menu
      // diterapkan ulang (satu kali saja, supaya tidak berputar). Hanya guru yang perlu; Admin/Kepala sudah pasti.
      if (typeof bsMuatPjAwal === 'function' && typeof bsPjMap !== 'undefined' && bsPjMap === null && v4IsTeacher() && !window.__bsPjDiterapkan) {
        window.__bsPjDiterapkan = true;
        bsMuatPjAwal(false).then(() => { try { v4ApplyMode(); } catch (e) { /* menu tetap seperti semula */ } });
      }
    }

    // ============================================================
    // V4 BOOT HOOK -- satu jalur tunggal untuk "pilih mode kerja + terapkan + muat data V4"
    // setelah login/pemulihan sesi.
    // Sebelumnya logika ini terserak di 3 tempat dengan setTimeout angka-ajaib berbeda-beda
    // (50ms di window.showApp, 900ms fallback di DOMContentLoaded, ditambah langsung+180ms
    // di window.login) -- semuanya menebak "loadAllData() harusnya sudah selesai dalam X ms".
    // Itu SALAH di kedua arah: di koneksi lambat, guru/jadwal (allGuru/allJadwal) bisa
    // BELUM selesai dimuat saat timer 50-900ms itu bunyi (loadAllData sendiri punya jaring
    // pengaman sampai ~13 detik -- lihat showApp()), sehingga v4AvailableModes() salah
    // menyimpulkan guru itu bukan Wali Kelas; di koneksi cepat, ada jeda sesaat menu tampil
    // untuk role yang salah sebelum timer sempat bunyi.
    // Sekarang v4RunBootHook() HANYA dipanggil dari dalam callback asli loadAllData() (lihat
    // pembungkus window.loadAllData di bawah), jadi selalu tepat waktu apa pun kecepatan
    // koneksinya -- v4BootPending memastikan ini jalan PERSIS SEKALI per boot.
    // ============================================================
    let v4BootPending = false;
    // true = boot hook sudah jalan, tapi v4LoadCore() sengaja DITUNDA sampai Fase 2 loadAllData()
    // selesai (lihat pembungkus window.loadAllData di bawah), supaya ~15 query data V4 tidak
    // berebut bandwidth dengan ~25 query Fase 2 yang sedang jalan.
    let v4CoreDeferred = false;
    let v4BootShowChooser = false; // true hanya utk login manual yg baru, bukan pemulihan sesi
    function v4RunBootHook(){
      if (!v4BootPending || !currentUser) return;
      v4BootPending = false;
      const showChooser = v4BootShowChooser; v4BootShowChooser = false;
      const saved = localStorage.getItem(v4ModeStorageKey());
      const modes = v4AvailableModes();
      if (saved && modes.some(x=>x.id===saved)) V4.mode = saved;
      // Default mode kerja selalu "Guru" (modes[0]) supaya begitu login langsung bisa absensi,
      // isi jurnal, input nilai, dll tanpa perlu pilih mode dulu. Akses ke fitur khusus Wali
      // Kelas (Data Siswa/Surat/Raport/Rekap Nilai) TIDAK lagi bergantung pada mode kerja yang
      // aktif -- itu sekarang dicek lewat isWaliKelasAssigned()/siswaScopeKelas() berdasarkan
      // field waliKelasOf di data guru, jadi tetap muncul & terfilter ke kelasnya walau mode
      // kerja yang sedang aktif adalah "Guru". Popup pilih mode & badge di halaman Profil
      // tetap ada untuk guru yang mau eksplisit menandai dirinya "sedang bekerja sebagai Wali
      // Kelas" (misalnya untuk label saja), tapi itu sekarang murni kosmetik.
      else if (!V4.mode) V4.mode = modes[0]?.id;
      if (V4.mode) currentUser.role = V4.mode;
      v4ApplyMode();
      // Modal pilih mode HANYA muncul untuk login manual yang baru & kalau guru punya >1
      // mode kerja -- dibuka di sini (setelah data siap), bukan lewat setTimeout(180) yang
      // menebak "dashboard pasti sudah selesai render dalam 180ms".
      if (showChooser && modes.length > 1) v4OpenRoleChooser();
      v4CoreDeferred = true; // v4LoadCore() dipanggil dari onFullyLoaded (Fase 2 selesai)
    }
    // Override login so the selected mode is applied after authentication while preserving existing showApp.
    // FIX: override ini MENGGANTI TOTAL login() asli (window.login = function... -- bukan
    // membungkusnya), sehingga jaring pengaman try/catch milik login() asli ikut hilang: error tak
    // terduga apa pun di sini (mis. CryptoJS gagal load -> hashPin melempar, elemen DOM tak
    // ditemukan, showApp() gagal) lolos jadi exception mentah tanpa umpan balik apa pun --
    // tombol "Masuk" terkesan macet, persis masalah yang dulu diperbaiki lewat try/catch di login().
    // Sekarang dibungkus lagi dengan penanganan yang sama, dan urutan showApp()->addLog() juga
    // disamakan dengan versi asli (pindah halaman = aksi utama, logging = sekunder).
    // FIX: login Admin/Kepsek dulu tidak punya batas percobaan sama sekali -- beda dengan PIN
    // Orang Tua yang sudah punya counter gagal + kunci sementara (lihat ortuCatatGagal). Ini
    // BUKAN pengaman utama (ADMIN_PIN_HASH/KEPSEK_PIN_HASH tetap hash statis di source, jadi
    // tetap bisa di-brute-force offline lewat DevTools oleh siapa pun yang punya source) --
    // tujuannya cuma menaikkan "batas kesulitan" untuk percobaan lewat form login biasa, sama
    // semangatnya dengan alasan PIN guru digaramkan di hashPinSalted(). Disimpan per-perangkat
    // (localStorage), bukan per-akun, karena tidak ada verifikasi server-side untuk PIN ini.
    const ADMIN_LOGIN_LOCK_KEY = 'simambaAdminLoginLock';
    const ADMIN_LOGIN_MAX_GAGAL = 5;
    const ADMIN_LOGIN_LOCK_MS = 5 * 60 * 1000; // 5 menit
    function adminLoginLockState() {
      try { return JSON.parse(localStorage.getItem(ADMIN_LOGIN_LOCK_KEY) || 'null') || { gagal: 0, kunciSampai: 0 }; }
      catch (e) { return { gagal: 0, kunciSampai: 0 }; }
    }
    function adminLoginCatatGagal() {
      const st = adminLoginLockState();
      st.gagal = (st.gagal || 0) + 1;
      if (st.gagal >= ADMIN_LOGIN_MAX_GAGAL) { st.kunciSampai = Date.now() + ADMIN_LOGIN_LOCK_MS; st.gagal = 0; }
      try { localStorage.setItem(ADMIN_LOGIN_LOCK_KEY, JSON.stringify(st)); } catch (e) {}
    }
    function adminLoginResetGagal() {
      try { localStorage.removeItem(ADMIN_LOGIN_LOCK_KEY); } catch (e) {}
    }
    window.login = function(){
      try {
        if(currentUser){ clearSession(); currentUser=null; try { if (typeof kredBersihkanSesi === 'function') kredBersihkanSesi(); } catch (e) {} }
        const key=document.getElementById('loginGuru').value, pin=document.getElementById('loginPIN').value.trim(), remember=document.getElementById('rememberMe').checked;
        if(!key) return toast('Pilih user!',true);
        if(key==='admin' || key==='kepsek'){
          const lock = adminLoginLockState();
          if (lock.kunciSampai && Date.now() < lock.kunciSampai) {
            const sisaMenit = Math.ceil((lock.kunciSampai - Date.now()) / 60000);
            return toast(`🔒 Terlalu banyak percobaan PIN salah. Coba lagi dalam ${sisaMenit} menit.`, true);
          }
        }
        // Bagian akhir login (sama untuk Admin/Kepsek/guru): ingat saya -> showApp -> log.
        const selesaiLogin = () => {
          try {
            if(isPrivilegedSession(currentUser)) saveSession(currentUser);   // Admin/Kepsek: sesi 15 menit di tab ini (sessionStorage)
            else if(remember) saveSession(currentUser);
            v4BootShowChooser = true;
            showApp();
            addLog('login',currentUser.name+' login');
          } catch (e) {
            v4BootShowChooser = false;
            console.error('[SI MAMBA] login() (override V4) gagal dengan error tak terduga:', e);
            toast('⚠️ Login gagal karena error teknis. Coba muat ulang halaman (refresh) lalu coba lagi.', true, 6000);
          }
        };
        const bangunUserGuru = (guru) => {
          let kelasList=guru.semuaKelas?[...KELAS_LIST]:(Array.isArray(guru.kelas)?guru.kelas:(guru.kelas?String(guru.kelas).split(',').map(x=>x.trim()):[])); if(!kelasList.length) kelasList=[KELAS_LIST[0]];
          currentUser={name:guru.name,role:ROLES.TEACHER,baseRole:ROLES.TEACHER,kelas:kelasList,key:guru.key,semuaKelas:!!guru.semuaKelas,waliKelasOf:guru.waliKelasOf||null};
        };
        if(key==='admin'){
          if(hashPin(pin)!==ADMIN_PIN_HASH) { adminLoginCatatGagal(); return toast('PIN Admin salah!',true); }
          adminLoginResetGagal();
          currentUser={name:'Admin',role:ROLES.ADMIN,baseRole:ROLES.ADMIN,key:ADMIN_USER_KEY,kelas:[...KELAS_LIST]};
          if (typeof window.kredAdminSiap === 'function') window.kredAdminSiap().catch(function () {});   // siapkan sesi_admin untuk Rules v2/v3
        } else if(key==='kepsek'){
          if(hashPin(pin)!==KEPSEK_PIN_HASH) { adminLoginCatatGagal(); return toast('PIN Kepsek salah!',true); }
          adminLoginResetGagal();
          currentUser={name:'Kepala Madrasah',role:ROLES.HEADMASTER,baseRole:ROLES.HEADMASTER,key:KEPSEK_USER_KEY,kelas:[...KELAS_LIST]};
        } else {
          const guru=(allGuru||[]).find(g=>g.key===key); if(!guru) return toast('Guru tidak ditemukan!',true);
          // [KREDENSIAL v1] PIN guru diperiksa lewat js/kredensial.js (indeks login_kredensial), bukan hash di data guru.
          if (typeof kredVerifikasi !== 'function') {
            if(!verifyGuruPin(guru, pin)) return toast('PIN salah!',true);    // cadangan bila modul gagal termuat
            bangunUserGuru(guru); selesaiLogin(); return;
          }
          if (window._loginGuruSedangDiperiksa) return;
          window._loginGuruSedangDiperiksa = true;
          const tPesanPeriksa = setTimeout(() => { try { toast('⏳ Memeriksa PIN...', false, 2500); } catch (e) {} }, 1200);   // koneksi lambat: beri tanda
          return kredVerifikasi(guru, pin).then(hasil => {
            clearTimeout(tPesanPeriksa);
            if (!hasil || !hasil.ok) { toast((hasil && hasil.pesan) || 'PIN salah!', true); return; }
            bangunUserGuru(guru);
            selesaiLogin();
            try { kredSetelahLogin(guru, pin, hasil); } catch (e) { console.warn('[SI MAMBA] kredSetelahLogin:', e); }
          }).catch(e => {
            clearTimeout(tPesanPeriksa);
            console.error('[SI MAMBA] pemeriksaan PIN gagal:', e);
            toast('⚠️ Login gagal karena error teknis. Coba muat ulang halaman (refresh) lalu coba lagi.', true, 6000);
          }).then(() => { window._loginGuruSedangDiperiksa = false; });
        }
        selesaiLogin();
      } catch (e) {
        v4BootShowChooser = false; // login gagal di tengah jalan -> jangan biarkan flag ini "bocor" ke boot berikutnya
        console.error('[SI MAMBA] login() (override V4) gagal dengan error tak terduga:', e);
        toast('⚠️ Login gagal karena error teknis. Coba muat ulang halaman (refresh) lalu coba lagi.', true, 6000);
      }
    };

    // -------- Activity / Amalan --------
    function v4LoadList(path,assign,seq){ return fbTimeout(db.ref(path).once('value').then(s=>{const arr=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;arr.push(x)});if(seq!==undefined&&seq!==v4CoreSeq)return arr;assign(arr);if(path==='activity_types_v4')v4CoreFresh++;return arr;}), 7000, path); }
    // [Dipindah ke js/v4-tahfidz-pramuka-ekskul.js] panel siswa V4, Tahfidz, Pramuka, Ekskul (+ absensi ekskul).
    // [Dipindah ke js/v4-pengaturan-notif-rapor.js] tarif honor V4 + pengaturan Absen QR (token, lokasi, cetak QR).
    function v4HitungJarakMeter(lat1, lng1, lat2, lng2){
      const R = 6371000, toRad = d => d * Math.PI / 180;
      const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    // [Dipindah ke js/v4-pengaturan-notif-rapor.js] notifikasi V4, persetujuan, tugas, dan Rapor V4.

    // -------- Core loader --------
    // -------- Cache data V4 untuk mode offline --------
    // Data V4 (aktivitas, tahfidz, ekskul, honor, notifikasi, approval) TIDAK ikut di
    // snapshotOfflineDatasets(), dan query Firebase .once('value') tidak pernah selesai saat
    // offline -- jadi dulu v4LoadCore() di jalur offline/cache cuma menunggu ~7 detik lalu
    // merender data kosong. Sekarang disimpan/dipulihkan lewat IndexedDB (per user).
    let v4CoreFresh = 0; // naik 1 tiap query kunci (activity_types_v4, honor_rates_v4) sukses; 2 = load segar
    // -------- Penjaga urutan (anti out-of-order) --------
    // Tiap v4LoadCore() mengambil nomor urut. Query dari load LAMA yang selesai belakangan tidak
    // boleh menimpa V4.* hasil load yang lebih BARU (mis. load lama dimulai sebelum penulisan tapi
    // selesai sesudah load baru -> tampilan mundur ke data lama), dan load lama tidak boleh
    // merender ulang / menulis cache. Loader notifikasi & approval punya nomor sendiri karena juga
    // dipanggil terpisah (mis. saat buka halaman Approval). Nomor juga dinaikkan saat logout supaya
    // load milik akun sebelumnya tidak mengisi V4 untuk akun berikutnya.
    let v4CoreSeq = 0, v4NotifSeq = 0, v4ApprSeq = 0;
    function v4InvalidateLoads(){ v4CoreSeq++; v4NotifSeq++; v4ApprSeq++; v4ActBulanMuat = {}; v4ActGagalMuat = {}; }
    // ---- Absensi kegiatan (activity_attendance_v4) dimuat PER BULAN, bukan setahun penuh ----
    // v4LoadCore() hanya memuat BULAN BERJALAN (satu query berindeks 'tanggal'). Bulan lain dimuat saat dibutuhkan
    // (rekap, tanggal lampau di form absensi, raport) lewat v4ActPastikan() lalu digabung ke V4.activityAttendance
    // (record yang sudah ada -- termasuk perubahan antrean offline -- tidak ditimpa).
    let v4ActBulanMuat = {};   // 'YYYY-MM' -> true (sudah termuat) | Promise (sedang dimuat)
    let v4ActGagalMuat = {};   // 'YYYY-MM' -> waktu gagal terakhir (dicoba lagi setelah 60 detik; mencegah render berulang)
    function v4ActBulanIni() { return v4Date().slice(0, 7); }
    // 12 bulan tahun ajaran aktif (Juli tahun awal s.d. Juni tahun akhir).
    function v4ActBulanTahunAjaran() {
      const m = String(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '').match(/(\d{4})\D+(\d{4})/);
      if (!m) return [v4ActBulanIni()];
      const out = [];
      for (let b = 7; b <= 12; b++) out.push(m[1] + '-' + String(b).padStart(2, '0'));
      for (let b = 1; b <= 6; b++) out.push(m[2] + '-' + String(b).padStart(2, '0'));
      return out;
    }
    // true = semua bulan sudah termuat (atau sedang offline / baru gagal dimuat -> pakai data lokal apa adanya).
    function v4ActSiap(daftar) {
      if (!navigator.onLine) return true;
      return daftar.every(ym => v4ActBulanMuat[ym] === true || (v4ActGagalMuat[ym] && Date.now() - v4ActGagalMuat[ym] < 60000));
    }
    function v4ActMuatBulan(ym) {
      const cur = v4ActBulanMuat[ym];
      if (cur === true) return Promise.resolve(true);
      if (cur) return cur;
      if (!db || !navigator.onLine) return Promise.resolve(false);
      const seq = v4CoreSeq;
      const p = fbTimeout(db.ref('activity_attendance_v4').orderByChild('tanggal').startAt(ym + '-01').endAt(ym + '-31').once('value'), 15000, 'activity_attendance_v4 ' + ym).then(s => {
        if (seq !== v4CoreSeq) { delete v4ActBulanMuat[ym]; return false; }   // v4LoadCore() baru sudah mengganti datanya
        if (!s) { delete v4ActBulanMuat[ym]; v4ActGagalMuat[ym] = Date.now(); return false; }   // timeout / ditolak Rules
        if (!Array.isArray(V4.activityAttendance)) V4.activityAttendance = [];
        const ada = new Set(V4.activityAttendance.map(r => r.key));
        s.forEach(c => { if (!ada.has(c.key)) { const x = c.val() || {}; x.key = c.key; V4.activityAttendance.push(x); } });
        v4ActBulanMuat[ym] = true; delete v4ActGagalMuat[ym];
        return true;
      });
      v4ActBulanMuat[ym] = p;
      return p;
    }
    // -> Promise<boolean>: true kalau SEMUA bulan berhasil dimuat.
    function v4ActPastikan(daftar) { return Promise.all(daftar.map(v4ActMuatBulan)).then(r => r.every(Boolean)); }
    const V4_CACHE_FIELDS = ['activityTypes','activityAttendance','activitySubstitutes','ekskulSubstitutes','tahfidz','tahfidzPic','ekskuls','ekskulAttendance','pramukaPic','pramukaSku','rates','notifications','approvals'];
    function v4CacheKey(){ const pre = (typeof offlineCachePrefix === 'function') ? offlineCachePrefix() : null; return pre ? pre + 'v4Core' : null; }
    function v4CacheCore(){
      // Jangan timpa cache bagus dengan data kosong akibat timeout (sinyal lemah).
      if (v4CoreFresh < 2 || !window.SIMambaOfflineDB) return;
      const key = v4CacheKey(); if (!key) return;
      const out = { tahunAjaran: currentTahunAjaran };
      V4_CACHE_FIELDS.forEach(f => { out[f] = V4[f]; });
      SIMambaOfflineDB.setCache(key, out).catch(err => console.warn('[SI MAMBA] Gagal cache data V4:', err));
    }
    function v4RenderAllCore(){ try{ if(typeof v4RenderActivities==='function') v4RenderActivities(); else console.warn('[SI MAMBA] js/amalan-kegiatan.js belum termuat -- menu Amalan Yaumiyah dilewati.'); }catch(e){ console.error('[SI MAMBA] v4RenderActivities gagal:', e); } v4RenderTahfidz();v4RenderEkskul();v4RenderPramuka();v4RenderHonorConfig();v4PopulateReport();v4RefreshTasks(); }
    function v4RestoreCoreFromCache(seq){
      const key = v4CacheKey();
      if (!window.SIMambaOfflineDB || !key) return Promise.resolve();
      v4NotifSeq++; v4ApprSeq++; // load online yang masih menggantung tidak boleh menimpa hasil cache
      return SIMambaOfflineDB.getCache(key).then(c => {
        if (seq !== v4CoreSeq) return; // sudah ada v4LoadCore() yang lebih baru
        // Cache dari tahun ajaran lain (atau cache lama tanpa penanda) jangan dipakai: data tahun lalu bisa tampil
        // sebagai data tahun ajaran aktif saat offline.
        if (c && c.tahunAjaran !== currentTahunAjaran) {
          console.warn('[SI MAMBA] Cache V4 milik tahun ajaran', c.tahunAjaran || '(tanpa penanda)', 'bukan', currentTahunAjaran, '-- diabaikan.');
          c = null;
        }
        if (c) V4_CACHE_FIELDS.forEach(f => { if (c[f] !== undefined && c[f] !== null) V4[f] = c[f]; });
        else console.warn('[SI MAMBA] Offline & belum ada cache data V4 -- modul V4 kosong sampai online sekali.');
        v4RenderAllCore(); v4RenderNotifications(); v4RenderApprovals();
      }).catch(err => { console.warn('[SI MAMBA] Gagal memulihkan cache V4:', err); });
    }

    function v4LoadCore(){if(!currentUser||!db)return Promise.resolve();
      // Offline: jangan tunggu query Firebase yang tidak akan pernah selesai -- pakai cache.
      const seq=++v4CoreSeq; // penjaga urutan: hanya load TERBARU yang boleh mengisi V4 & merender
      if(!navigator.onLine)return v4RestoreCoreFromCache(seq);
      v4CoreFresh=0;
      return Promise.all([
      v4LoadList('activity_types_v4',a=>V4.activityTypes=a,seq),
      fbTimeout(db.ref('activity_attendance_v4').orderByChild('tanggal').startAt(v4ActBulanIni()+'-01').endAt(v4ActBulanIni()+'-31').once('value').then(s=>{if(seq!==v4CoreSeq)return;const arr=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;arr.push(x)});V4.activityAttendance=arr;v4ActBulanMuat={};v4ActGagalMuat={};v4ActBulanMuat[v4ActBulanIni()]=true;}), 7000, 'activity_attendance_v4'),
      fbTimeout(db.ref('activity_substitute_v4').once('value').then(s=>{if(seq!==v4CoreSeq)return;V4.activitySubstitutes=s.val()||{};}), 7000, 'activity_substitute_v4'),
      fbTimeout(db.ref('ekskul_pic_substitute_v4').once('value').then(s=>{if(seq!==v4CoreSeq)return;V4.ekskulSubstitutes=s.val()||{};}), 7000, 'ekskul_pic_substitute_v4'),
      v4LoadList('tahfidz_v4',a=>V4.tahfidz=a,seq),
      fbTimeout(db.ref('tahfidz_pic_v4').once('value').then(s=>{if(seq!==v4CoreSeq)return;V4.tahfidzPic=s.val()||{};}), 7000, 'tahfidz_pic_v4'),
      v4LoadList('extracurriculars_v4',a=>V4.ekskuls=a,seq),
      // extracurricular_attendance_v4 ditulis di v4SaveEkskulAttendance tapi sebelumnya TIDAK
      // PERNAH dibaca lagi di mana pun -- data absensi ekskul per siswa jadi "hilang" (tidak
      // pernah muncul di layar mana pun). Dimuat di sini supaya bisa dipakai di Raport (progres
      // Ekskul per siswa) dan tempat lain yang butuh riwayat absensi ekskul ke depannya.
      fbTimeout(db.ref('extracurricular_attendance_v4').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value').then(s=>{if(seq!==v4CoreSeq)return;const arr=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;arr.push(x)});V4.ekskulAttendance=arr;}), 7000, 'extracurricular_attendance_v4'),
      fbTimeout(db.ref('pramuka_pic_v4').once('value').then(s=>{if(seq!==v4CoreSeq)return;V4.pramukaPic=s.val()||{};}), 7000, 'pramuka_pic_v4'),
      v4LoadList('pramuka_sku_v4',a=>V4.pramukaSku=a,seq),
      fbTimeout(db.ref('honor_rates_v4').once('value').then(s=>{if(seq!==v4CoreSeq)return;const _rawRates=s.val(),_norm=v4NormalisasiRates(_rawRates);V4.rates=_norm.rates;if(_rawRates&&_norm.rusak.length)v4PerbaikiTarifRusak(_norm.rusak,_norm.rates,_rawRates);v4CoreFresh++}), 7000, 'honor_rates_v4'),v4LoadNotifications(),v4LoadApprovals()
    ]).then(()=>{if(seq!==v4CoreSeq)return;v4CacheCore();v4RenderAllCore();v4SeedJenisSholatRutin();}).catch(err=>{console.error('[SI MAMBA] v4LoadCore gagal total (seharusnya jarang terjadi karena tiap query sudah dibungkus fbTimeout):',err);});}

    // Hook navigation for new pages without changing legacy functions.
    const v4OriginalNavigate=window.navigateTo;
    window.navigateTo=function(page){
      v4OriginalNavigate(page);
      const titleMap={'profile-v4':'Profil Saya','activities-v4':'Amalan Yaumiyah','tahfidz-v4':'Tahfidz', 'bacaan-shalat':'Bacaan Sholat','ekskul-v4':'Ekstrakurikuler','pramuka-v4':'Pramuka (SKU)','approval-v4':'Approval','notifications-v4':'Notifikasi','tasks-v4':'Task Center','raport-v4':'Raport'};
      if(titleMap[page]) document.getElementById('pageTitle').innerHTML=titleMap[page];
      if(page==='profile-v4') v4ApplyMode();
      if(page==='activities-v4' && typeof v4RenderActivities==='function') v4RenderActivities();
      if(page==='tahfidz-v4') v4RenderTahfidz();
      if(page==='ekskul-v4') v4RenderEkskul();
      if(page==='pramuka-v4') v4RenderPramuka();
      if(page==='approval-v4'){ v4RenderApprovals(); v4LoadApprovals(); reloadDataset(['journal','earlyLeave'], v4RenderApprovals); }
      if(page==='notifications-v4') v4RenderNotifications();
      if(page==='tasks-v4') v4RefreshTasks();
      if(page==='raport-v4') v4PopulateReport();
    };

    // Ensure newly inserted menu items receive click handlers.
    document.addEventListener('DOMContentLoaded',()=>{
      setTimeout(()=>{document.querySelectorAll('#v4SidebarMenu .menu-item').forEach(item=>{item.addEventListener('click',()=>{const p=item.dataset.page;if(p)navigateTo(p);});});},0);
    });

    // Patch existing showApp by wrapping it: old UI remains functional, then V4 permissions/data are applied.
    const v4OriginalShowApp=window.showApp;
    window.showApp=function(){ v4BootPending=true; v4OriginalShowApp(); };

    // v4RunBootHook() dipicu di sini -- PERSIS saat loadAllData() (dipanggil dari dalam
    // showApp()) benar-benar selesai, apa pun lama waktunya. Ini menggantikan setTimeout(...,900)
    // fallback yang dulu ada terpisah di listener DOMContentLoaded lain di bawah.
    const v4OriginalLoadAllData=window.loadAllData;
    // PENTING: parameter ke-2 (onFullyLoaded) dulu TIDAK diteruskan ke loadAllData() asli,
    // sehingga semua pemanggilan bentuk loadAllData(null, () => {...}) diam-diam tidak pernah
    // menjalankan callback-nya. Sekarang diteruskan.
    window.loadAllData=function(callback, onFullyLoaded){
      return v4OriginalLoadAllData(function(){
        v4RunBootHook();
        if (callback) callback();
      }, function(){
        if (v4CoreDeferred) { v4CoreDeferred = false; v4LoadCore(); }
        if (typeof honorPengingatCek === 'function') setTimeout(honorPengingatCek, 2500);   // pengingat bayar honor (Admin)
        if (onFullyLoaded) onFullyLoaded();
      });
    };


    (function(){
      function simambaResetView(){
        try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){window.scrollTo(0,0);}
        document.documentElement.scrollLeft=0;
        document.body.scrollLeft=0;
        document.querySelectorAll('.main-content,.page-content,.card,.v4-shell,.v4-grid-2,.v4-grid-3')
          .forEach(function(el){if(el.scrollLeft)el.scrollLeft=0;});
      }
      var oldNavigate=window.navigateTo;
      if(typeof oldNavigate==='function' && !oldNavigate.__uiFinalV2){
        var wrapped=function(page){
          oldNavigate(page);
          // requestAnimationFrame dua kali, bukan setTimeout(20)/setTimeout(180): rAF pertama
          // dijadwalkan tepat sebelum browser repaint frame berikutnya, rAF kedua (di dalamnya)
          // dijadwalkan setelah repaint itu benar-benar terjadi -- jadi reset scroll selalu pas
          // setelah konten halaman baru selesai dirender, bukan menebak "20ms/180ms biasanya cukup".
          requestAnimationFrame(function(){ simambaResetView(); requestAnimationFrame(simambaResetView); });
        };
        wrapped.__uiFinalV2=true;
        window.navigateTo=wrapped;
      }
      function hideInstallIfStandalone(){
        var standalone=window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
        if(window.navigator.standalone) standalone=true;
        var b=document.getElementById('installBtn');
        if(b && standalone) b.style.display='none';
      }
      document.addEventListener('DOMContentLoaded',function(){
        hideInstallIfStandalone();
        simambaResetView();
        setTimeout(hideInstallIfStandalone,500);
      });
      window.addEventListener('pageshow',hideInstallIfStandalone);
    })();


    // ============================================================
    // EXPORT PDF/EXCEL: library dimuat malas sebelum fungsi dijalankan
    // ============================================================
    // Enam fungsi export di bawah dipanggil hanya dari tombol (onclick). Dibungkus di sini: kalau
    // jsPDF+AutoTable / SheetJS belum termuat, unduh dulu (ensureLib) lalu jalankan fungsi aslinya.
    // Gagal memuat (offline & belum ter-cache) -> pesan jelas, bukan tombol yang diam saja.
    // Fungsi pembungkus dipakai juga oleh berkas hasil pecahan (jadwal.js, laporan-rekap.js) untuk fungsi export
    // yang sudah dipindah ke sana: berkas itu memanggil simambaBungkusExportLazy([...]) di bagian bawahnya.
    window.simambaBungkusExportLazy = function simambaBungkusExportLazy(defs) {
      defs.forEach(function (d) {
        var name = d[0], lib = d[1], label = d[2], orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function () {
          var self = this, args = arguments;
          if (LAZY_LIB_READY[lib]()) return orig.apply(self, args);
          toast('⏳ Memuat modul ' + label + '...', false, 2500);
          return ensureLib(lib).then(
            function () { return orig.apply(self, args); },
            function (err) {
              console.error('[SI MAMBA] Gagal memuat modul ' + label, err);
              toast('❌ Modul ' + label + ' belum bisa dimuat. Cek koneksi internet lalu coba lagi.', true);
            }
          );
        };
      });
    };
    // Semua fungsi export kini ada di berkas pecahannya (jadwal.js, laporan-rekap.js, honor-guru.js, rekap-nilai.js);
    // masing-masing membungkus fungsinya sendiri lewat simambaBungkusExportLazy([...]) di baris paling bawah berkasnya.

    // (Penyisip tombol "Jurnal (PDF)" di Ringkasan Sekolah dihapus: rekap jurnal kini ada di Pembelajaran > Jurnal Mengajar > Rekap Jurnal.)

    // ============================================================
    // AKSESIBILITAS: dialog modal (role/fokus/Esc) + nama untuk tombol yang isinya cuma emoji
    // ============================================================
    (function simambaA11y() {
      var MODALS = {   // id overlay -> nama fungsi penutupnya (dipakai untuk tombol Esc)
        editGuruModal: 'closeEditGuruModal', editSiswaModal: 'closeEditSiswaModal', gantiPinModal: 'closeGantiPinModal',
        resetPinModal: 'closeResetPinModal', ekskulModal: 'closeEkskulModal', v4RoleModal: 'v4CloseRoleChooser'
      };
      var OPEN_SEL = '.modal-overlay.show, .v4-modal-backdrop.show';
      var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
      var lastActivator = null;

      function dialogOf(overlay) { return overlay.querySelector('.modal-box, .v4-role-modal') || overlay; }
      function isVisible(el) { return el.offsetParent !== null || el === document.activeElement; }
      function focusables(root) { return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), isVisible); }

      // Elemen pemicu (untuk mengembalikan fokus saat modal ditutup): tombol/tautan yang terakhir diklik/difokus di luar modal.
      function noteActivator(e) {
        var t = e.target && e.target.closest ? e.target.closest('button,a,[role="button"],input,select,textarea') : null;
        if (t && !t.closest('.modal-overlay, .v4-modal-backdrop')) lastActivator = t;
      }
      document.addEventListener('click', noteActivator, true);
      document.addEventListener('focusin', noteActivator, true);

      function onOpen(overlay) {
        var dlg = dialogOf(overlay);
        overlay._returnFocusTo = lastActivator;
        if (!dlg.hasAttribute('tabindex')) dlg.setAttribute('tabindex', '-1');
        if (!dlg.contains(document.activeElement)) {          // jangan merebut fokus kalau fungsi pembuka sudah memfokuskan isian
          var f = focusables(dlg)[0];
          try { (f || dlg).focus({ preventScroll: true }); } catch (e) {}
        }
      }
      function onClose(overlay) {
        var back = overlay._returnFocusTo; overlay._returnFocusTo = null;
        if (back && document.body.contains(back) && back.offsetParent !== null) { try { back.focus({ preventScroll: true }); } catch (e) {} }
      }

      // Jebakan fokus + Esc selama ada modal terbuka
      document.addEventListener('keydown', function (e) {
        var open = document.querySelector(OPEN_SEL);
        if (!open) return;
        var dlg = dialogOf(open);
        if (e.key === 'Escape') {
          var fn = window[MODALS[open.id]];
          if (typeof fn === 'function') { e.preventDefault(); fn(); }
          return;
        }
        if (e.key !== 'Tab') return;
        var f = focusables(dlg);
        if (!f.length) { e.preventDefault(); dlg.focus(); return; }
        var first = f[0], last = f[f.length - 1], cur = document.activeElement;
        if (!dlg.contains(cur)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && (cur === first || cur === dlg)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
      }, true);

      function setupModals() {
        Object.keys(MODALS).forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          var dlg = dialogOf(el);
          if (!dlg.hasAttribute('role')) dlg.setAttribute('role', 'dialog');
          if (!dlg.hasAttribute('aria-modal')) dlg.setAttribute('aria-modal', 'true');
          if (!dlg.hasAttribute('aria-labelledby') && !dlg.hasAttribute('aria-label')) {
            var h = dlg.querySelector('h1,h2,h3');
            if (h) { if (!h.id) h.id = id + 'Title'; dlg.setAttribute('aria-labelledby', h.id); }
          }
          var was = el.classList.contains('show');
          new MutationObserver(function () {
            var now = el.classList.contains('show');
            if (now === was) return;
            was = now;
            if (now) onOpen(el); else onClose(el);
          }).observe(el, { attributes: true, attributeFilter: ['class'] });
        });
      }

      // ---- nama (aria-label) untuk tombol yang isinya cuma ikon/emoji ----
      var ICON_LABEL = {
        '🗑': 'Hapus', '✏': 'Edit', '✕': 'Tutup', '✖': 'Tutup', '❌': 'Tutup', '☰': 'Buka menu', '🌙': 'Ganti mode gelap',
        '☀': 'Ganti mode terang', '←': 'Sebelumnya', '→': 'Berikutnya', '🔔': 'Notifikasi', '💾': 'Simpan', '👁': 'Lihat',
        '➕': 'Tambah', '🔄': 'Muat ulang', '📥': 'Unduh', '📤': 'Kirim', '🖨': 'Cetak', '📷': 'Kamera', '🔍': 'Cari'
      };
      function labelButton(btn) {
        if (btn.hasAttribute('aria-label') || btn.hasAttribute('aria-labelledby')) return;
        var raw = (btn.textContent || '').replace(/[\uFE0F\u200D\s]/g, '');
        if (!raw || /[A-Za-z0-9\u00C0-\u024F]/.test(raw)) return;   // kosong, atau sudah ada teks yang terbaca
        var chars = Array.from(raw);
        var label = btn.getAttribute('title') || (chars.length === 1 ? ICON_LABEL[chars[0]] : '');
        if (label) btn.setAttribute('aria-label', label);
      }
      function scan(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.tagName === 'BUTTON') labelButton(node);
        if (node.querySelectorAll) Array.prototype.forEach.call(node.querySelectorAll('button'), labelButton);
      }
      function watchButtons() {
        scan(document.body);
        var pending = [], queued = false;
        new MutationObserver(function (muts) {
          muts.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) pending.push(n); }); });
          if (pending.length && !queued) {
            queued = true;
            requestAnimationFrame(function () { queued = false; var list = pending; pending = []; list.forEach(scan); });
          }
        }).observe(document.body, { childList: true, subtree: true });
      }

      function init() { setupModals(); watchButtons(); }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    })();
