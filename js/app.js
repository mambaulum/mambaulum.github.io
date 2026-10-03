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
      iuranMingguanNominal: null // null = belum diatur Admin; 0 = sengaja diatur gratis (dibedakan)
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
    // PIN Admin & Kepsek disimpan dalam bentuk hash SHA-256 TANPA salt (hardcode di source,
    // beda dari PIN guru yang sekarang sudah bergaram per-akun -- lihat hashPinSalted/verifyGuruPin
    // di atas). Tidak bisa diberi salt di sini karena hanya hash yang tersimpan, PIN aslinya
    // tidak diketahui siapa pun termasuk Claude -- hash tidak bisa "dibalik". Dua hash di bawah
    // ini SAMA PERSIS, artinya Admin & Kepsek memakai PIN yang identik saat ini.
    // Untuk mengganti (disarankan, terutama karena dua akun berbagi PIN yang sama): di komputer
    // Anda sendiri (BUKAN ke Claude/chat ini), buka console browser di halaman app, jalankan
    // CryptoJS.SHA256("PIN_BARU_ANDA").toString() lalu tempel hasilnya menggantikan nilai di bawah.
    const ADMIN_PIN_HASH = 'a9a634b2a16124e4cfc3d9b1ad4f772e865cbfed2eaf2025752cd0e3df15e37b';
    const KEPSEK_PIN_HASH = '4d9749d1e2616cbce46c84ac26cdc6cf8180e6e1678e4160008a8cd2fffd6d7a';
    // FIX: kedua hash di atas saat ini IDENTIK -- kemungkinan masih nilai default yang belum
    // diganti sejak deploy, yang berarti Admin & Kepsek login pakai PIN yang sama persis.
    // Peringatan ini cuma pengingat di Console (tidak mengubah perilaku apa pun); kalau memang
    // sudah sengaja diganti jadi PIN yang kebetulan sama, boleh diabaikan.
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
    let jamSettings = {};
    let cameraStream = null;
    let editingGuruKey = null, editingSiswaKey = null, editingJadwalKey = null;
    let dataLoaded = false;
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
    function isBusy(key) { return !!_busyLocks[key]; }
    function setBusy(key, btn) {
      _busyLocks[key] = true;
      if (btn) { btn.disabled = true; if (!btn.dataset.origText) btn.dataset.origText = btn.textContent; btn.style.opacity = '0.6'; }
    }
    function clearBusy(key, btn) {
      _busyLocks[key] = false;
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; if (btn.dataset.origText) { btn.textContent = btn.dataset.origText; delete btn.dataset.origText; } }
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
    function tglLokal(d) {
      d = d || new Date();
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), t = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${t}`;
    }
    function bulanLokal(d) {
      d = d || new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
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
      const jamSekarang = now.getHours();
      const menitSekarang = now.getMinutes();
      const sekarangMenit = jamSekarang * 60 + menitSekarang;

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
      const logoDark = 'logo/logo-lembaga-white.png';
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
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
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
      try { doc.addImage(logoData, 'PNG', 15, 8 + (offsetY || 0), 22, 22); }
      catch (e) { console.error('[SI MAMBA] Gagal menambahkan logo ke PDF:', e); }
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
      const upd = {};
      upd['school_assets/ttdKepala'] = { base64: MADRASAH.ttdKepalaBase64, updatedBy: currentUser.name, updatedAt: new Date().toISOString(), migrasi: true };
      upd['school_settings/ttdKepalaBase64'] = null;
      db.ref().update(upd).catch(err => console.warn('[SI MAMBA] Migrasi TTD Kepala gagal:', err && err.message ? err.message : err));
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
            db.ref().update({ 'school_assets/ttdKepala': { base64: base64, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, 'school_settings/ttdKepalaBase64': null, 'school_settings/ttdKepalaUpdatedBy': null, 'school_settings/ttdKepalaUpdatedAt': null }, err => {
              event.target.disabled = false; event.target.value = '';
              if (err) return toast('Gagal simpan: ' + err.message, true);
              MADRASAH.ttdKepalaBase64 = base64; _ttdPromise = Promise.resolve(base64);
              toast('✅ Tanda tangan Kepala Sekolah berhasil disimpan!');
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
      db.ref().update({ 'school_assets/ttdKepala': null, 'school_settings/ttdKepalaBase64': null, 'school_settings/ttdKepalaUpdatedBy': null, 'school_settings/ttdKepalaUpdatedAt': null }, err => {
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

    function showUpdateAvailableToast(reg) {
      toast('🔄 Versi baru SI MAMBA tersedia. Klik tombol Perbarui untuk memuat ulang.', false, 15000);
      const btn = document.getElementById('swUpdateBtn');
      if (btn) {
        btn.style.display = 'inline-flex';
        btn.onclick = () => {
          btn.style.display = 'none';
          // Ada worker baru menunggu -> minta aktif (controllerchange lalu memuat ulang halaman).
          // Tidak ada yang menunggu (sudah aktif di tab lain) -> cukup muat ulang; jangan diam saja.
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          else window.location.reload();
        };
      }
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
        db.ref('guru/' + guru.key).update({ pin: saltedHash }).catch(() => {});
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
    // itu tetap tugas Firebase Security Rules (server-side, belum ada di app ini -- lihat catatan
    // di ADMIN_PIN_HASH). Tujuan tanda tangan ini cuma menaikkan "batas kesulitan": mencegah orang
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
    function saveSession(user) {
      try {
        if (isPrivilegedSession(user)) { localStorage.removeItem('sim_session'); return; }
        const timestamp = Date.now(); localStorage.setItem('sim_session', JSON.stringify({ user, timestamp, sig: v4SignSession(user, timestamp) }));
      } catch(e) {}
    }
    function loadSession() {
      try {
        const d = localStorage.getItem('sim_session'); if (!d) return null;
        const p = JSON.parse(d);
        if (Date.now() - p.timestamp > 24*60*60*1000) { localStorage.removeItem('sim_session'); return null; }
        if (p.sig !== v4SignSession(p.user, p.timestamp)) { console.warn('[SI MAMBA] sim_session tidak valid (diubah manual?), sesi dihapus.'); localStorage.removeItem('sim_session'); return null; }
        if (isPrivilegedSession(p.user)) { console.warn('[SI MAMBA] sesi Admin/Kepsek tidak boleh dipulihkan dari localStorage, sesi dihapus (login ulang dengan PIN).'); localStorage.removeItem('sim_session'); return null; }
        return p.user;
      } catch(e) { return null; }
    }
    function clearSession() { localStorage.removeItem('sim_session'); }
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
      const parts = String(tanggalStr).split('-');
      const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
      if (!y || !m) return null;
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
      return inferred ? inferred === currentTahunAjaran : true; // kalau tetap tak bisa dihitung, biarkan tampil (fallback lama) drpd hilang total
    }
    function updateTahunAjaranBadge() {
      const badge = document.getElementById('tahunAjaranBadge');
      if (badge) badge.textContent = `📅 ${currentTahunAjaran} · ${currentSemesterAktif}`;
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
      } catch (e) { /* localStorage diblokir/rusak -> pakai default kode */ }
    }
    function simpanMirrorPengaturan() {
      try { localStorage.setItem(SCHOOL_SETTINGS_MIRROR_KEY, JSON.stringify({ tahun: currentTahunAjaran, semester: currentSemesterAktif, kelasList: [...KELAS_LIST] })); } catch (e) {}
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
      db.ref('school_settings').update({ kelasList: newList, kelasListUpdatedBy: currentUser.name, kelasListUpdatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        setKelasList(newList);
        refreshAllKelasDropdowns();
        renderKelasListEditor();
        toast('✅ Daftar kelas berhasil diperbarui di seluruh aplikasi!');
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
      db.ref('school_settings').update({ tahunAjaranAktif: tahunAjaranBaru, semesterAktif: semesterBaru, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Tahun Ajaran & Semester berhasil disimpan!'); addLog('ubah_profil_sekolah', `${tahunAjaranBaru} - ${semesterBaru}`);
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
      db.ref('school_settings').update(data, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        applyMadrasahProfileFromSnapshot(data);
        renderStrukturRingkasan();
        renderKopSuratPreview();
        toast('✅ Identitas & struktur madrasah tersimpan! Kop surat otomatis ikut terbarui.');
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
      const totalItems = filtered.length, totalPages = Math.ceil(totalItems/PAGE_SIZE);
      if (logFullPage > totalPages) logFullPage = totalPages; if (logFullPage < 1) logFullPage = 1;
      const start = (logFullPage-1)*PAGE_SIZE, end = Math.min(start+PAGE_SIZE, totalItems), pageItems = filtered.slice(start,end);
      let html = '';
      pageItems.forEach(log => {
        const icon = iconMap[log.action] || '📌';
        const waktu = log.waktu ? new Date(log.waktu).toLocaleString('id-ID', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short',year:'numeric'}) : '-';
        const detail = log.detail ? ' - ' + escapeHtml(log.detail) : '';
        html += `<div class="log-item"><span><span class="log-icon">${icon}</span> <span class="log-user">${escapeHtml(log.user||'Sistem')}</span> <span class="log-action">${escapeHtml(log.action)}${detail}</span></span><span class="log-time">${waktu}</span></div>`;
      });
      container.innerHTML = html;
      document.getElementById('logFullPagination').innerHTML = `<button onclick="logFullPage--; renderLogsFull();" ${logFullPage <= 1 ? 'disabled' : ''}>◀ Prev</button><span class="page-info">${logFullPage} / ${totalPages} (${totalItems} log)</span><button onclick="logFullPage++; renderLogsFull();" ${logFullPage >= totalPages ? 'disabled' : ''}>Next ▶</button>`;
    }
    // ============================================================
    function showGantiPinModal() { if (!currentUser) return toast('Login dulu!', true); document.getElementById('gantiPinModal').classList.add('show'); document.getElementById('oldPin').value=''; document.getElementById('newPin').value=''; document.getElementById('confirmPin').value=''; }
    function closeGantiPinModal() { document.getElementById('gantiPinModal').classList.remove('show'); }
    function saveGantiPin() {
      if (!currentUser) return toast('Login dulu!', true);
      const pinLama = document.getElementById('oldPin').value.trim(), pinBaru = document.getElementById('newPin').value.trim(), pinKonfirmasi = document.getElementById('confirmPin').value.trim();
      if (!pinLama || !pinBaru || !pinKonfirmasi) return toast('Semua field wajib diisi!', true);
      if (!/^\d{6}$/.test(pinBaru)) return toast('PIN baru harus 6 digit!', true);
      if (pinBaru !== pinKonfirmasi) return toast('PIN baru tidak cocok!', true);
      const guru = allGuru.find(g => g.key === currentUser.key);
      if (!guru) return toast('Guru tidak ditemukan!', true);
      if (!verifyGuruPin(guru, pinLama)) return toast('PIN lama salah!', true);
      db.ref('guru/' + currentUser.key).update({ pin: hashPinSalted(pinBaru, currentUser.key) }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ PIN berhasil diganti!'); addLog('ganti_pin', 'PIN diganti'); closeGantiPinModal(); reloadDataset('logs'); loadGuruListForLogin(); }
      });
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
      const key = document.getElementById('resetPinGuruKey').value;
      const guru = allGuru.find(g => g.key === key);
      if (!guru) return toast('Guru tidak ditemukan!', true);
      const pinBaru = document.getElementById('resetPinNew').value.trim(), pinKonfirmasi = document.getElementById('resetPinConfirm').value.trim();
      if (!/^\d{6}$/.test(pinBaru)) return toast('PIN harus 6 digit!', true);
      if (pinBaru !== pinKonfirmasi) return toast('Konfirmasi PIN baru tidak cocok!', true);
      db.ref('guru/' + key).update({ pin: hashPinSalted(pinBaru, key) }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ PIN berhasil direset!'); addLog('reset_pin', `Reset PIN ${guru.name}`); closeResetPinModal(); reloadDataset('logs'); loadGuruListForLogin(() => renderUserList()); }
      });
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
        else { toast('✅ Pengumuman ditambahkan!'); addLog('tambah_pengumuman', teks.substring(0,30)+(teks.length>30?'...':'')); document.getElementById('pengumumanInput').value = ''; loadPengumuman(); }
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
    function renderRingkasanKepsekKartu() {
      const grid = document.getElementById('dashboardRingkasanGrid');
      if (!grid) return;
      const now = new Date();
      const monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
      // Kehadiran guru bulan ini -- rumus persis sama dengan renderGuruChart() supaya angka di
      // kartu ringkasan selalu konsisten dengan yang ditampilkan di grafik.
      const attendanceGuruBulan = allTeacherAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && a.tahunAjaran === currentTahunAjaran);
      const hariAktifGuru = new Set(attendanceGuruBulan.map(a => a.tanggal)).size;
      const totalGuru = allGuru.length;
      const persenGuru = (hariAktifGuru > 0 && totalGuru > 0) ? Math.min(100, Math.round((attendanceGuruBulan.length / (hariAktifGuru * totalGuru)) * 100)) : 0;
      // Kehadiran siswa bulan ini -- rumus persis sama dengan hitungPersen() di renderSiswaChart()
      const attendanceSiswaBulan = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && a.tahunAjaran === currentTahunAjaran);
      let totalHadirSiswa = 0, totalSiswaTercatat = 0;
      attendanceSiswaBulan.forEach(a => { if (a.data) { const values = Object.values(a.data); totalHadirSiswa += values.filter(v => v === 'H').length; totalSiswaTercatat += values.length; } });
      const persenSiswa = totalSiswaTercatat > 0 ? Math.round((totalHadirSiswa / totalSiswaTercatat) * 100) : 0;
      // Rata-rata nilai rapor -- digabung semua mapel & semester tahun ajaran berjalan, sekadar
      // indikator cepat di dashboard (bukan pengganti tampilan detail per-mapel yang sudah ada).
      const raporValues = allGrades.map(g => calculateRapor(g.data || {})).filter(v => v > 0);
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
        const nilaiKelas = allGrades.filter(g => g.kelas === k).map(g => calculateRapor(g.data || {})).filter(v => v > 0);
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
          let list = allAttendance.filter(a => a.tanggal === tgl && a.tahunAjaran === currentTahunAjaran);
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
          const list = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && a.tahunAjaran === currentTahunAjaran && a.kelas === k);
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
            const list = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(b.monthStr) && a.tahunAjaran === currentTahunAjaran && a.kelas === k);
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
          let list = allAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && a.tahunAjaran === currentTahunAjaran);
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
            const recBulanIni = allTeacherAttendance.filter(a => a.tanggal && a.tanggal.startsWith(b.monthStr) && a.tahunAjaran === currentTahunAjaran);
            const hariAktifBulanIni = new Set(recBulanIni.map(a => a.tanggal)).size;
            const hariHadirGuruIni = new Set(recBulanIni.filter(a => (a.guruKey ? a.guruKey === g.key : a.guru === g.name)).map(a => a.tanggal)).size;
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
        const attendanceGuru = allTeacherAttendance.filter(a => a.tanggal && a.tanggal.startsWith(monthStr) && a.tahunAjaran === currentTahunAjaran);
        const hariAktif = new Set(attendanceGuru.map(a => a.tanggal)).size;
        const totalGuru = allGuru.length;
        let rataHadir = 0;
        if (hariAktif > 0 && totalGuru > 0) { const totalAbsen = attendanceGuru.length; rataHadir = Math.round((totalAbsen / (hariAktif * totalGuru)) * 100); }
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
        let needMigration = false;
        snap.forEach(child => { const g = child.val(); g.key = child.key; allGuru.push(g); if (g.pin && /^\d{6}$/.test(g.pin)) needMigration = true; });
        if (needMigration) {
          const updates = {};
          allGuru.forEach(g => { if (g.pin && /^\d{6}$/.test(g.pin)) updates[g.key] = { ...g, pin: hashPinSalted(g.pin, g.key) }; });
          db.ref('guru').update(updates).then(() => { console.log('✅ Migrasi PIN selesai'); loadGuruListForLogin(callback); }).catch(err => { console.error(err); toast('Gagal migrasi', true); loading.style.display = 'none'; });
          return;
        }
        if (allGuru.length === 0) { seedDefaultGuru(); setTimeout(() => loadGuruListForLogin(callback), 1500); return; }
        select.innerHTML = '<option value="">-- Pilih --</option>';
        allGuru.sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
        allGuru.forEach(g => { select.innerHTML += `<option value="${g.key}">${escapeHtml(g.name)}</option>`; });
        select.innerHTML += `<option value="admin">🛠️ Admin</option><option value="kepsek">👑 Kepala Sekolah</option>`;
        loading.style.display = 'none';
        if (window.SIMambaOfflineDB) SIMambaOfflineDB.setCache('allGuru', allGuru).catch(() => {});
        if (callback) callback();
      }).catch(err => { if (settled) return; settled = true; clearTimeout(timeoutTimer); console.error(err); loadGuruListForLoginFromCache(select, loading, callback); });
    }
    const DEFAULT_GURU = [
      { name: 'Achmad Syauqi', pin: '111111', kelas: ['Kelas 1','Kelas 2'], role: 'guru' },
      { name: 'Ach Khomaidi', pin: '222222', kelas: ['Kelas 3'], role: 'guru' },
      { name: 'Ahmad Farhan Maulidi', pin: '333333', kelas: ['Kelas 4'], role: 'guru' },
      { name: 'Dia Gina Rahmani, S.Pd.', pin: '444444', kelas: ['Kelas 5'], role: 'wali_kelas' },
      { name: 'Jamilatul Jannah', pin: '555555', kelas: ['Kelas 6'], role: 'wali_kelas' },
      { name: 'Layyuda', pin: '666666', kelas: ['Kelas 1'], role: 'guru' },
      { name: 'Muhammad Imron, S.Pd.', pin: '777777', kelas: ['Kelas 2'], role: 'guru' },
      { name: 'Naufilah Halimi, S.Pd.', pin: '888888', kelas: ['Kelas 3'], role: 'guru' },
      { name: 'Noval Maulana', pin: '999999', kelas: ['Kelas 4'], role: 'guru' }
    ];
    function seedDefaultGuru() { DEFAULT_GURU.forEach(guru => { const ref = db.ref('guru').push(); ref.set({ name: guru.name, pin: hashPinSalted(guru.pin, ref.key), kelas: guru.kelas, role: guru.role, dibuat: new Date().toISOString() }); }); }

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

      const canEditTeacher = isTeacher() || isWaliKelas();
      document.getElementById('btnTambahSiswa').disabled = !isAdmin();
      document.getElementById('btnSaveAttendance').disabled = !canEditTeacher || isKepsek();
      document.getElementById('btnSaveJournal').disabled = !canEditTeacher;
      document.getElementById('btnVerifyFace').disabled = !canEditTeacher;
      document.getElementById('siswaNote').textContent = isAdmin() ? '✅ Admin - Bisa kelola semua siswa' : '🔒 Hanya Admin yang bisa mengelola siswa';

      document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        const page = item.dataset.page;
        if (page === 'admin' || page === 'setting-jam' || page === 'promotion' || page === 'profil-sekolah') {
          if (isAdmin()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else if (page === 'rekap' || page === 'honor') {
          if (isAdmin() || isKepsek()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else if (page === 'rekap-nilai') {
          if (isAdmin() || isKepsek() || isWaliKelas()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else if (page === 'teacher-attendance' || page === 'journal' || page === 'religi') {
          if (isAdmin() || isKepsek()) item.classList.add('hidden-tab');
          else item.classList.remove('hidden-tab');
        } else if (page === 'students') {
          if (isTeacher() && !isAdmin() && !isKepsek()) item.classList.add('hidden-tab');
          else item.classList.remove('hidden-tab');
        } else if (page === 'surat') {
          if (isAdmin() || isWaliKelas()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else if (page === 'modul-ajar') {
          if (isAdmin() || isKepsek() || isTeacher() || isWaliKelas()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else if (page === 'jadwal') {
          if (isAdmin() || isKepsek() || isWaliKelas() || isTeacher()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else if (page === 'laporan' || page === 'kelola-absen-guru') {
          if (isAdmin() || isKepsek()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else if (page === 'user-management') {
          if (isAdmin()) item.classList.remove('hidden-tab');
          else item.classList.add('hidden-tab');
        } else {
          item.classList.remove('hidden-tab');
        }
      });

      navigateTo('dashboard');
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
        if (typeof v4ActOpenTypeKey !== 'undefined') { v4ActOpenTypeKey = null; v4ActAttendanceDraft = {}; v4ActDateSel = {}; v4ActKelasSel = {}; v4PanelSiswaCache = {}; v4PanelSiswaGagal = {}; v4TfKelasSel = ''; }
      } catch (e) { console.error('[SI MAMBA] Gagal reset state v4 saat logout:', e); }
      try { if (typeof kasResetState === 'function') kasResetState(); } catch (e) { console.error('[SI MAMBA] Gagal reset state Kas saat logout:', e); }
    }

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('show');
    }
    function toggleMenuGroup(groupName) {
      const group = document.querySelector(`.menu-group[data-group="${groupName}"]`);
      if (group) group.classList.toggle('collapsed');
    }

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
      const titleMap = { 'profile-v4':'Profil Saya', 'activities-v4':'Amalan & Kegiatan', 'tahfidz-v4':'Tahfidz', 'ekskul-v4':'Ekstrakurikuler', 'pramuka-v4':'Pramuka (SKU)', 'approval-v4':'Approval', 'notifications-v4':'Notifikasi', 'tasks-v4':'Task Center', 'raport-v4':'Raport', dashboard:'Dashboard', students:'Data Siswa', attendance:'Absensi', grades:'Nilai', journal:'Jurnal Mengajar', 'teacher-attendance':'Absen Guru', religi:'Absen Religi Saya', events:'Lembur & Rapat', ujian:'Honor Ujian', 'profil-sekolah':'Profil Sekolah', rekap:'Rekap', 'rekap-nilai':'Rekap Nilai', honor:'Honor', surat:'Surat & Ijin', jadwal:'Jadwal', promotion:'Kenaikan Kelas', 'setting-jam':'Setting Jam', admin:'Admin', laporan:'Laporan', 'user-management':'Manajemen User', 'honor-slip':'Slip Honor Saya', 'infaq-madrasah':'Iuran Mingguan', 'kas-umum':'Kas Madrasah', 'sikap-siswa':'Sikap Siswa', 'buku-penghubung':'Buku Penghubung', 'materi-belajar':'Materi Belajar', 'tugas-siswa':'Tugas Siswa', 'kalender-akademik':'Kalender Akademik', 'saran-kritik':'Saran & Kritik', 'kelola-absen-guru':'Kelola Absen Guru', 'administrasi-ujian':'Administrasi Ujian' };
      document.getElementById('pageTitle').innerHTML = titleMap[page] || 'Dashboard';
      if (window.innerWidth <= 768) { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }
      flushRenderTertunda(page); // render yang ditunda saat halaman ini tersembunyi (lihat renderAll)
      if (page === 'attendance') { loadAttendance(); renderAttendanceLateBlock(); }
      if (page === 'grades') loadGrades();
      if (page === 'journal') { renderJournals(); cancelEditJournal(); }
      if (page === 'kelola-absen-guru') setupKelolaAbsenGuruPage();
      if (page === 'teacher-attendance') { updateLabelJamPulang(); renderTeacherAttendance(); renderEarlyLeaveBlock(); renderEarlyLeaveApprovals(); }
      if (page === 'info-ortu') { renderInfoOrtuPage(); }
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
      if (page === 'jadwal') { loadJadwal(); setJadwalView('harian'); }
      if (page === 'laporan') { loadReportPreview(); }
      if (page === 'user-management') { renderUserList(); }
      if (page === 'honor-slip') { const y=document.getElementById('honorSlipYear'); if(y) y.value=new Date().getFullYear(); const m=document.getElementById('honorSlipMonth'); if(m) m.value=String(new Date().getMonth()+1); renderHonorSlip(); }
      if (page === 'infaq-madrasah') { setupInfaqPage(); }
      if (page === 'kas-umum') { setupKasUmumPage(); }
      if (page === 'sikap-siswa') { ensureLazyDatasets(LAZY_PAGE_DATASETS['sikap-siswa'], () => { setupSikapPage(); }); }
      if (page === 'buku-penghubung') { setupBukuPenghubungPage(); }
      if (page === 'materi-belajar') { ensureLazyDatasets(LAZY_PAGE_DATASETS['materi-belajar'], () => { setupMateriPage(); }); }
      if (page === 'tugas-siswa') { ensureLazyDatasets(LAZY_PAGE_DATASETS['tugas-siswa'], () => { setupTugasPage(); }); }
      if (page === 'kalender-akademik') { ensureLazyDatasets(LAZY_PAGE_DATASETS['kalender-akademik'], () => { setupKalenderAkademikPage(); }); }
      if (page === 'saran-kritik') { setupSaranKritikPage(); }
      if (page === 'administrasi-ujian') { if (typeof setupAdministrasiUjianPage === 'function') setupAdministrasiUjianPage(); }
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
      db.ref('jam_settings').set(newSettings, err => { if (err) toast('Gagal: '+err.message, true); else { toast('✅ Pengaturan jam disimpan!'); jamSettings = newSettings; renderJamSettings(); updateJamDisplay(); populateJournalJamOptions(); addLog('setting_jam','Jam pelajaran diubah'); } });
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
      const cocokSayaSendiri = j => j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name;
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
      const jamSekarang = now.getHours(), menitSekarang = now.getMinutes();
      const sekarangMenit = jamSekarang * 60 + menitSekarang;
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
      return currentUser.kelas || [];
    }

    function populateClassFilterDropdowns() {
      const attendanceSelect = document.getElementById('attendanceClassFilter'), gradesSelect = document.getElementById('gradesClassFilter'), sikapSelect = document.getElementById('sikapKelasFilter');
      let kelasListAttendance = [], kelasListGrades = [];
      if (isAdmin() || isKepsek()) { kelasListAttendance = [...KELAS_LIST]; kelasListGrades = kelasListAttendance; }
      else { kelasListAttendance = getKelasSaatIni(); kelasListGrades = currentUser.kelas || []; }
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
        allSiswa, allAttendance, allGrades, allJournals,
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
    function cacheDatasetsToIndexedDB(owner) {
      if (!window.SIMambaOfflineDB) return;
      const pre = offlineCachePrefix();
      if (!pre) return;                                   // tidak ada user aktif -> jangan simpan apa pun
      if (owner && currentUser.key !== owner) return;     // ganti akun saat loading: data ini bukan milik user aktif
      const snap = snapshotOfflineDatasets(), out = {};
      Object.keys(snap).forEach(k => { out[pre + k] = snap[k]; });
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
      SIMambaOfflineDB.getCacheAll().then(all => {
        if (opts.skipIf && opts.skipIf()) { if (callback) callback(); return; }
        const cache = {};
        Object.keys(all || {}).forEach(k => { if (k.indexOf(pre) === 0) cache[k.slice(pre.length)] = all[k]; });
        const found = Object.keys(cache).length > 0;
        if (cache.allSiswa) allSiswa = cache.allSiswa;
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

    function setOfflineBannerVisible(show) {
      isOfflineMode = show;
      const banner = document.getElementById('offlineBanner');
      if (banner) banner.style.display = show ? 'block' : 'none';
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
        SIMambaOfflineDB.addPendingWrite('journal', payload).then(id => {
          localRecord._pendingId = id;
          updatePendingBadge();
          registerBackgroundSyncTag();
        }).catch(err => console.error('[Offline] Gagal antre jurnal:', err));
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
      if (window.SIMambaOfflineDB && record._pendingId != null) {
        SIMambaOfflineDB.deletePendingWrite(record._pendingId).then(updatePendingBadge).catch(() => {});
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
      if (existingIdx > -1) allAttendance[existingIdx] = localRecord; else allAttendance.push(localRecord);
      if (window.SIMambaOfflineDB) {
        SIMambaOfflineDB.addPendingWrite('attendance', payload).then(id => {
          localRecord._pendingId = id;
          updatePendingBadge();
          registerBackgroundSyncTag();
        }).catch(err => console.error('[Offline] Gagal antre absensi:', err));
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
        let idx = 0, gagal = 0;
        function next() {
          // [PATCH] koneksi putus di tengah sinkron -> berhenti, sisa antrian dicoba lagi nanti
          if (idx < items.length && !isReallyOnline()) { isFlushingPendingWrites = false; updatePendingBadge(); return; }
          if (idx >= items.length) {
            isFlushingPendingWrites = false;
            updatePendingBadge();
            loadAllData();
            if (gagal > 0) toast(`⚠️ ${gagal} data belum berhasil disinkron, akan dicoba lagi otomatis.`, true, 4000);
            else if (manual) toast('✅ Semua data berhasil disinkronkan!', false, 3000);
            return;
          }
          const item = items[idx++];
          flushOnePendingWrite(item).then(() => next()).catch(err => {
            gagal++;
            console.warn('[Offline] Gagal sinkron 1 item, akan dicoba lagi nanti:', err);
            // [PATCH] Timeout karena jaringan macet BUKAN kegagalan data -- jangan dihitung sebagai
            // percobaan gagal (supaya item tidak dibuang gara-gara sinyal jelek).
            if (err && err.isDeadline) next();
            else SIMambaOfflineDB.bumpAttempt(item.id).finally(next);
          });
        }
        next();
      }).catch(err => { isFlushingPendingWrites = false; console.error('[Offline] Gagal baca antrian:', err); });
    }

    function flushOnePendingWrite(item) {
      if (item.type === 'journal') return promiseDeadline(flushPendingJournal(item), FLUSH_ITEM_DEADLINE_MS);
      if (item.type === 'attendance') return promiseDeadline(flushPendingAttendance(item), FLUSH_ITEM_DEADLINE_MS);
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
        db.ref('attendance').orderByChild('tanggal').equalTo(p.tanggal).once('value', snap => {
          let existingKey = null;
          snap.forEach(child => { if (child.val().kelas === p.kelas) existingKey = child.key; });
          kirim(existingKey ? db.ref('attendance/' + existingKey) : db.ref('attendance').push());
        }, reject);
      });
    }

    // ---------- Event koneksi browser ----------
    function handleBrowserOnline() {
      setOfflineBannerVisible(false);
      toast('🌐 Koneksi internet kembali tersambung.', false, 2500);
      if (currentUser) { flushPendingWrites(); loadAllData(); }
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

    function loadAllData(callbackRaw, onFullyLoaded) {
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
      corePromises.push(fbTimeout(new Promise((resolve) => { infaqPetugasP.then(() => bacaSiswaSesuaiScope()).then(list => { allSiswa = list; resolve(); }).catch(err => { console.warn('[SI MAMBA] Query ditolak/gagal (siswa):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'siswa'));
      corePromises.push(fbTimeout(new Promise((resolve) => { const todayStr = tglLokal(); db.ref('teacher_attendance').orderByChild('tanggal').equalTo(todayStr).once('value', snap => { allTeacherAttendanceToday = []; snap.forEach(child => { const ta = child.val(); ta.key = child.key; if (ta.tahunAjaran === currentTahunAjaran) allTeacherAttendanceToday.push(ta); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (teacher_attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'teacher_attendance'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('guru_terajin').once('value', snap => { allGuruTerajin = snap.val() || {}; resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (guru_terajin):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'guru_terajin'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('pengumuman').once('value', snap => { allPengumuman = []; snap.forEach(child => { const p = child.val(); p.key = child.key; allPengumuman.push(p); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (pengumuman):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'pengumuman'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('jadwal').once('value', snap => { allJadwal = []; snap.forEach(child => { const j = child.val(); j.key = child.key; allJadwal.push(j); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (jadwal):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'jadwal'));
      corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('absen_qr_settings').once('value', snap => { if (typeof V4 !== 'undefined') V4.absenQr = snap.val() || null; resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (absen_qr_settings):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'absen_qr_settings'));
      if (isAdmin()) {
        corePromises.push(fbTimeout(new Promise((resolve) => { db.ref('logs').orderByChild('waktu').limitToLast(30).once('value', snap => { allLogs = []; snap.forEach(child => { const log = child.val(); log.key = child.key; allLogs.push(log); }); allLogs.reverse(); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (logs):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'logs'));
      } else { allLogs = []; }

      // ---- FASE 2: khusus halaman masing-masing, dimuat di background ----
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allAttendance = []; snap.forEach(child => { const a = child.val(); a.key = child.key; if (loaderScopeKelas().includes(a.kelas)) allAttendance.push(a); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'attendance'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('grades').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allGrades = []; snap.forEach(child => { const g = child.val(); g.key = child.key; if (loaderScopeKelas().includes(g.kelas)) allGrades.push(g); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (grades):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'grades'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('journal').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allJournals = []; snap.forEach(child => { const j = child.val(); j.key = child.key; if (loaderScopeKelas().includes(j.kelas)) allJournals.push(j); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (journal):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'journal'));
      secondaryPromises.push(fbTimeout(new Promise((resolve) => { db.ref('teacher_attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { if (_basi()) { resolve(); return; } allTeacherAttendance = []; snap.forEach(child => { const ta = child.val(); ta.key = child.key; if (isAdmin() || isKepsek() || (ta.guruKey ? ta.guruKey === currentUser.key : ta.guru === currentUser.name)) allTeacherAttendance.push(ta); }); resolve(); }, err => { console.warn('[SI MAMBA] Query ditolak/gagal (teacher_attendance):', err && err.message ? err.message : err); resolve(); }); }), undefined, 'teacher_attendance'));
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
        setOfflineBannerVisible(true);
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
        if (isAdmin() && !alphaAutoCheckedThisSession) { autoMarkAlphaGuru(() => { alphaAutoCheckedThisSession = true; }); }
      }

      Promise.all(corePromises).then(() => {
        if (settled) return; // timeout/offline fallback sudah lebih dulu ambil alih
        clearTimeout(timeoutTimer);
        setOfflineBannerVisible(false);
        settled = true;
        const _tR1 = performance.now();
        renderCoreUI();
        perfLog('FASE 1 selesai', Math.round(_tR1 - _tStart) + 'ms sejak loadAllData mulai | renderCoreUI', Math.round(performance.now() - _tR1) + 'ms');
        if (callback) callback(); // sembunyikan loading & tampilkan dashboard SEKARANG

        // FASE 2 lanjut di background -- tidak menahan tampilan yang sudah muncul.
        Promise.all(secondaryPromises).then(() => {
          cacheDatasetsToIndexedDB(_owner);
          dataLoaded = true;
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
          setOfflineBannerVisible(true);
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
      siswa:            () => fbTimeout(bacaSiswaSesuaiScope()).then(a => { if (a) allSiswa = a; }),
      attendance:       () => _fetchList(_byTahun('attendance'), _scopeKelasFn()).then(a => { if (a) allAttendance = a; }),
      grades:           () => _fetchList(_byTahun('grades'), _scopeKelasFn()).then(a => { if (a) allGrades = a; }),
      journal:          () => _fetchList(_byTahun('journal'), _scopeKelasFn()).then(a => { if (a) { allJournals = a; scheduleStatusBarRefresh(); } }),
      teacherAttendance: () => Promise.all([
        _fetchList(_byTahun('teacher_attendance'), _scopeGuru).then(a => { if (a) { allTeacherAttendance = a; scheduleStatusBarRefresh(); } }),
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
      let jadwalHariIni = allJadwal.filter(j => j.hari === hariIni && (j.guruKey ? j.guruKey === keyGuru : j.guru === namaGuru));
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
    let _siswaSortedSrc = null, _siswaSortedLen = -1, _siswaSorted = [];
    function getSiswaTerurut() {
      if (_siswaSortedSrc !== allSiswa || _siswaSortedLen !== allSiswa.length) {
        _siswaSortedSrc = allSiswa; _siswaSortedLen = allSiswa.length;
        _siswaSorted = allSiswa.slice().sort((a, b) => _siswaCollator.compare(a.name, b.name));
      }
      return _siswaSorted;
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
      totalDisplay.textContent = `Total: ${filtered.length} siswa`;
      list.innerHTML = '';
      if (filtered.length === 0) { list.innerHTML = `<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada siswa yang sesuai.</p>`; document.getElementById('siswaPagination').innerHTML = ''; return; }
      const totalItems = filtered.length, totalPages = Math.ceil(totalItems/PAGE_SIZE);
      if (siswaPage > totalPages) siswaPage = totalPages; if (siswaPage < 1) siswaPage = 1;
      const start = (siswaPage-1)*PAGE_SIZE, end = Math.min(start+PAGE_SIZE, totalItems), pageItems = filtered.slice(start,end);
      let html = `<div style="overflow-x:auto;"><table><thead><tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;"><th style="padding:8px 12px;text-align:left;width:50px;">No</th><th style="padding:8px 12px;text-align:left;">Nama</th><th style="padding:8px 12px;text-align:left;width:120px;">Kelas</th><th style="padding:8px 12px;text-align:center;width:140px;">Aksi</th></tr></thead><tbody>`;
      pageItems.forEach((s, idx) => {
        const btnEdit = isAdmin() ? `<button class="btn btn-edit" style="padding:2px 10px;font-size:12px;" onclick="openEditSiswaModal('${s.key}')">✏️</button>` : '';
        const delBtn = isAdmin() ? `<button class="btn btn-danger" style="padding:2px 10px;font-size:12px;" onclick="hapusDataWithConfirm('siswa','${s.key}','Siswa ${escapeJs(s.name)}')">🗑️</button>` : '';
        html += `<tr><td class="text-muted" style="padding:8px 12px;">${start+idx+1}</td><td style="padding:8px 12px;font-weight:500;">${escapeHtml(s.name)}</td><td class="text-medium" style="padding:8px 12px;">${escapeHtml(s.kelas)}</td><td style="padding:8px 12px;text-align:center;">${btnEdit} ${delBtn}</td></tr>`;
      });
      html += `</tbody></table></div>`;
      list.innerHTML = html;
      document.getElementById('siswaPagination').innerHTML = `<button onclick="siswaPage--; renderSiswa();" ${siswaPage <= 1 ? 'disabled' : ''}>◀ Prev</button><span class="page-info">${siswaPage} / ${totalPages}</span><button onclick="siswaPage++; renderSiswa();" ${siswaPage >= totalPages ? 'disabled' : ''}>Next ▶</button>`;
    }
    function openEditSiswaModal(key) {
      const siswa = allSiswa.find(s => s.key === key);
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
      if (!editingSiswaKey) return toast('Error: tidak ada siswa yang diedit!', true);
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
      db.ref('siswa/'+editingSiswaKey).update({ name, kelas, nominalIuranKhusus, noWaOrtu, noWaKey }, err => {
        if (err) toast('Gagal update: '+err.message, true);
        else { toast('✅ Data siswa berhasil diupdate!'); addLog('edit_siswa', name + ' - ' + kelas); closeEditSiswaModal(); reloadDataset('siswa', () => { populateClassFilterDropdowns(); loadAttendance(); loadGrades(); }); }
      });
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
      db.ref('siswa').push().set({ name, kelas, guru: 'Admin', guruKey: currentUser.key || null, dibuat: new Date().toISOString() }, err => {
        clearBusy('tambahSiswa', btn);
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ Siswa ditambahkan!'); addLog('tambah_siswa', name + ' - ' + kelas); document.getElementById('studentName').value = ''; document.getElementById('filterKelasSiswa').value = ''; reloadDataset('siswa', () => { populateClassFilterDropdowns(); loadAttendance(); loadGrades(); }); }
      });
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
      lines.forEach(line => {
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
      });
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
      attendanceDraft = existing.length > 0 ? existing[0].data || {} : {};
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
      siswa.forEach(s => {
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
      return allTeacherAttendance.some(a => a.tanggal === today && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
    }
    function bolehIsiAbsensiSiswa() {
      if (isAdmin() || isKepsek()) return true;
      return sudahAbsenDatangHariIni();
    }
    function renderAttendanceLateBlock() {
      const block = document.getElementById('attendanceLateBlock');
      if (!block || !currentUser) return;
      block.style.display = bolehIsiAbsensiSiswa() ? 'none' : 'block';
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
      const type = v4DeteksiTipeAbsenGuru();
      if (type !== 'Pulang' || isAdmin()) { block.style.display = 'none'; if (rapatBox) rapatBox.style.display = 'none'; return; }
      const window_ = getJamAbsenWindow('Pulang');
      const now = new Date(), sekarangMenit = now.getHours()*60 + now.getMinutes();
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
    function approveEarlyLeave(key) {
      if (!isKepsek() && !isAdmin()) return toast('Hanya Kepala Madrasah/Admin!', true);
      db.ref('early_leave_requests/'+key).update({ status: 'approved', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ Catatan pulang duluan ditandai disetujui!'); addLog('setujui_pulang_duluan', key); reloadDataset('earlyLeave'); }
      });
    }
    function rejectEarlyLeave(key) {
      if (!isKepsek() && !isAdmin()) return toast('Hanya Kepala Madrasah/Admin!', true);
      const note = prompt('Catatan penolakan (opsional):') || '';
      db.ref('early_leave_requests/'+key).update({ status: 'rejected', rejectedBy: currentUser.name, rejectedAt: new Date().toISOString(), rejectedNote: note }, err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('📝 Catatan pulang duluan ditandai perlu tindak lanjut.'); addLog('tolak_pulang_duluan', key); reloadDataset('earlyLeave'); }
      });
    }
    function renderEarlyLeaveApprovals() {
      const section = document.getElementById('earlyLeaveApprovalSection'), list = document.getElementById('earlyLeaveApprovalList');
      if (!section || !list) return;
      if (!isKepsek() && !isAdmin()) { section.style.display = 'none'; return; }
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
      if (!bolehIsiAbsensiSiswa()) { renderAttendanceLateBlock(); return toast('🔒 Absen datang dulu di menu Absen Guru. Kalau tidak bisa absen, minta Admin mencatatnya di Kelola Absen Guru.', true); }
      const date = document.getElementById('attendanceDate').value || tglLokal();
      const filterKelas = document.getElementById('attendanceClassFilter').value;
      if (!filterKelas) return toast('Pilih kelas terlebih dahulu!', true);
      const siswa = allSiswa.filter(s => s.kelas === filterKelas);
      if (siswa.length === 0) return toast('Tidak ada siswa di kelas tersebut.', true);
      const belumDiisi = siswa.filter(s => !attendanceDraft[s.key]);
      if (belumDiisi.length > 0) { const namaBelum = belumDiisi.map(s => s.name).join(', '); if (!confirm(`⚠️ ${belumDiisi.length} siswa belum diisi: ${namaBelum}. Lanjutkan menyimpan?`)) return; }
      const today = tglLokal();
      if (date > today) return toast('Tidak bisa mengisi absensi untuk tanggal di masa depan!', true);
      const now = new Date(), jamSekarang = now.getHours(), menitSekarang = now.getMinutes(), sekarangMenit = jamSekarang * 60 + menitSekarang;
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
          else { toast('✅ Absensi tersimpan!'); addLog('simpan_absensi', filterKelas + ' - ' + date); reloadDataset('attendance', () => { loadAttendance(); }); }
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
      mewakiliAttendanceKelas = kelas; mewakiliAttendanceTanggal = tanggal; mewakiliAttendanceSiswa = []; mewakiliAttendanceDraft = {};
      document.getElementById('mewakiliAbsensiTitle').textContent = `Absensi ${kelas} -- ${tanggal}`;
      document.getElementById('mewakiliAbsensiList').innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">⏳ Memuat data siswa...</p>';
      document.getElementById('mewakiliAbsensiModal').classList.add('show');
      db.ref('siswa').orderByChild('kelas').equalTo(kelas).once('value', snap => {
        snap.forEach(child => { const s = child.val(); s.key = child.key; mewakiliAttendanceSiswa.push(s); });
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
      let html = '';
      mewakiliAttendanceSiswa.forEach(s => {
        const status = mewakiliAttendanceDraft[s.key] || '', hasStatus = status !== '', bgColor = hasStatus ? '#eff6ff' : '#f9fafb';
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${bgColor};border-radius:8px;margin-bottom:4px;border:1px solid ${hasStatus ? '#e5e7eb' : '#f3f4f6'};flex-wrap:wrap;gap:4px;">
          <span><strong>${escapeHtml(s.name)}</strong></span>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">${['H','S','I','A'].map(st => `<button class="status-choice ${status===st?'selected':''} ${!hasStatus ? 'border-muted text-muted' : ''}" data-status="${st}" onclick="setMewakiliAbsensi('${s.key}','${st}')">${st}</button>`).join('')}${!hasStatus ? `<span class="text-muted" style="font-size:11px;margin-left:4px;">(belum)</span>` : ''}</div>
        </div>`;
      });
      html += `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-soft" style="padding:4px 12px;font-size:12px;" onclick="fillAllMewakiliAbsensi('H')">✅ Isi Semua Hadir</button></div>`;
      list.innerHTML = html;
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
          toast(`✅ Absensi kelas ${kelas} tersimpan! Silakan simpan jurnal lagi.`);
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
      const siswa = allSiswa.filter(s => kelasList.includes(s.kelas));
      if (siswa.length === 0) { container.innerHTML = `<p class="text-muted" style="text-align:center;padding:12px;">Tidak ada siswa di kelas ${escapeHtml(kelasList.join(', '))}.</p>`; return; }
      const subject = document.getElementById('gradeSubject').value, semester = document.getElementById('gradeSemester').value;
      const filteredGrades = allGrades.filter(g => g.subject === subject && g.semester === semester);
      let html = `<div style="overflow-x:auto;"><table><thead><tr><th>Nama</th><th>NH1</th><th>NH2</th><th>NH3</th><th>MID</th><th>PAS</th><th>Rapor</th></tr></thead><tbody>`;
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
        html += `<tr><td style="font-weight:600;">${escapeHtml(s.name)}</td>`;
        ['h1','h2','h3','mid','pas'].forEach(key => {
          html += `<td><input class="field grade-input" style="width:60px;padding:4px 8px;" data-siswa="${s.key}" data-key="${key}" data-gradekey="${escapeHtml(gradeKey)}" data-version="${gradeVersion}" value="${escapeHtml(data[key]||'')}" ${disabled}></td>`;
        });
        const rapor = calculateRapor(data);
        html += `<td style="font-weight:700;color:#059669;">${rapor}</td></tr>`;
      });
      html += '</tbody></table></div>';
      if (canEdit() && !isKepsek()) { html += `<button id="btnSaveGrades" class="btn btn-success" style="margin-top:12px;" onclick="saveGrades()">💾 Simpan Nilai</button>`; }
      container.innerHTML = html;
    }
    function calculateRapor(data) {
      const h1 = Number(data.h1)||0, h2 = Number(data.h2)||0, h3 = Number(data.h3)||0, mid = Number(data.mid)||0, pas = Number(data.pas)||0;
      const daily = (h1+h2+h3)/3;
      return Math.round(daily*0.4 + mid*0.3 + pas*0.3);
    }
    function saveGrades() {
      if (!canEdit() || isKepsek()) return toast('Tidak bisa menyimpan!', true);
      if (isBusy('saveGrades')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 2000);
      const subject = document.getElementById('gradeSubject').value, semester = document.getElementById('gradeSemester').value;
      const inputs = document.querySelectorAll('.grade-input');
      const gradeMap = {};
      // gradeKey & version diambil dari data-attribute yang di-render di renderGrades() --
      // itu persis versi data yang guru lihat/edit sekarang di layar (baseline).
      inputs.forEach(inp => {
        const key = inp.dataset.siswa;
        if (!gradeMap[key]) gradeMap[key] = { data: {}, gradeKey: inp.dataset.gradekey || '', baseVersion: parseInt(inp.dataset.version, 10) || 0 };
        gradeMap[key].data[inp.dataset.key] = inp.value;
      });
      let total = Object.keys(gradeMap).length;
      if (total === 0) return toast('Tidak ada data.', true);
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
        const tulis = savedCount > 0 ? db.ref().update(updates) : Promise.resolve();
        return tulis.then(() => ({ savedCount, conflictNames }));
      }).then(({ savedCount, conflictNames }) => {
        clearBusy('saveGrades', btnSave);
        if (conflictNames.length === 0) {
          toast('✅ Nilai tersimpan!');
        } else {
          let msg = `✅ ${savedCount} nilai tersimpan.`;
          msg += ` ⚠️ ${conflictNames.length} nilai (${conflictNames.join(', ')}) TIDAK disimpan karena sudah diubah guru lain terlebih dahulu -- silakan cek ulang & simpan lagi untuk siswa tersebut.`;
          toast(msg, true, 8000);
        }
        if (savedCount > 0) addLog('simpan_nilai', subject + ' - ' + semester);
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
      const totalItems = sorted.length, totalPages = Math.ceil(totalItems/PAGE_SIZE);
      if (journalPage > totalPages) journalPage = totalPages; if (journalPage < 1) journalPage = 1;
      const start = (journalPage-1)*PAGE_SIZE, end = Math.min(start+PAGE_SIZE, totalItems), pageItems = sorted.slice(start,end);

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
      document.getElementById('journalPagination').innerHTML = `<button onclick="journalPage--; renderJournals();" ${journalPage <= 1 ? 'disabled' : ''}>◀ Prev</button><span class="page-info">${journalPage} / ${totalPages}</span><button onclick="journalPage++; renderJournals();" ${journalPage >= totalPages ? 'disabled' : ''}>Next ▶</button>`;
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
        const sudahAbsenDatangJurnal = allTeacherAttendance.some(a => a.tanggal === tanggal && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && a.type === 'Datang');
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
          const pulangMenit = pulangDate.getHours() * 60 + pulangDate.getMinutes();
          const settingJamIni = jamSettings[jam_ke];
          if (settingJamIni) {
            const selesaiArr = settingJamIni.selesai.split(':');
            const jamSelesaiMenit = parseInt(selesaiArr[0]) * 60 + parseInt(selesaiArr[1]);
            const dalamGraceSatuJam = jamSelesaiMenit <= pulangMenit && jamSelesaiMenit >= pulangMenit - 60;
            if (!dalamGraceSatuJam) {
              const jamPulangStr = pulangDate.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
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
        const jadwalGuruDiwakili = allJadwal.find(j => (mewakiliKey ? j.guruKey === mewakiliKey : j.guru === mewakili) && j.kelas === kelas && j.jam === jam_ke && j.hari === hariTanggal);
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
        const sudahLewatJam8 = tanggal < todayB2 || (tanggal === todayB2 && new Date().getHours() >= 8);
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
        const _sudahLewatJam8C = tanggal < _todayC || (tanggal === _todayC && new Date().getHours() >= 8);
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
          else { toast('✅ Jurnal berhasil diupdate!'); addLog('edit_jurnal', subject + ' - ' + kelas); cancelEditJournal(); reloadDataset('journal'); }
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
        const nowOffline = new Date(), menitSekarangOffline = nowOffline.getHours()*60 + nowOffline.getMinutes();
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

      const now = new Date(), jamSekarang = now.getHours(), menitSekarang = now.getMinutes(), sekarangMenit = jamSekarang*60 + menitSekarang;
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
            toast('✅ Jurnal tersimpan!'); addLog('simpan_jurnal', subject + ' - ' + kelas + (mewakili ? ' (mewakili '+mewakili+')' : '') + (isManualOverride ? ' [MANUAL OVERRIDE oleh '+currentUser.name+']' : ''));
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
      if (type === 'Non-Reguler' && mewakili && navigator.onLine) {
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
        db.ref('teacher_attendance').orderByChild('tanggal').equalTo(tanggal).once('value', snap => {
          const teacherAttendanceHariItu = [];
          snap.forEach(child => { const v = child.val(); v.key = child.key; teacherAttendanceHariItu.push(v); });
          clearBusy('saveJournal', btnSaveJournalQuery);
          lanjutkanSaveJournal(teacherAttendanceHariItu);
        }, err => {
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
      setBusy('saveJournal', btnSusulan);
      const data = pendingSusulanData;
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
        else { toast('✅ Jurnal susulan disetujui!'); addLog('setujui_jurnal_susulan', key); reloadDataset('journal'); }
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
    let qrScanDetectedType = null; // 'Datang' | 'Pulang', diisi setelah QR & lokasi tervalidasi, siap dikonfirmasi
    let qrScanKeteranganTelat = null; // mis. "Telat 12 menit", diisi kalau Absen Datang lewat dari jam window
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
      function dalamJendela(type) {
        const w = getJamAbsenWindow(type);
        const now = new Date(), sekarangMenit = now.getHours() * 60 + now.getMinutes();
        const mulai = w.mulai.split(':'), selesai = w.selesai.split(':');
        const mulaiMenit = parseInt(mulai[0]) * 60 + parseInt(mulai[1]), selesaiMenit = parseInt(selesai[0]) * 60 + parseInt(selesai[1]);
        return sekarangMenit >= mulaiMenit && sekarangMenit <= selesaiMenit;
      }
      if (!datangRec && dalamJendela('Datang')) return 'Datang';
      if (!pulangRec && dalamJendela('Pulang')) return 'Pulang';
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
      if (!V4.absenQr || !V4.absenQr.token) return toast('⚠️ QR Absensi belum diatur Admin. Hubungi Admin.', true);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigateTo('teacher-attendance');
      startCamera();
    }
    function startCamera() {
      if (!isTeacher() && !isWaliKelas()) return toast('Hanya Guru & Wali Kelas!', true);
      if (typeof jsQR !== 'function') { toast('⚠️ Modul scan QR gagal dimuat. Cek koneksi internet lalu refresh halaman.', true); return; }
      const izinSakitHariIni = allTeacherAttendance.find(a => a.tanggal === tglLokal() && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name) && (a.type === 'Izin' || a.type === 'Sakit'));
      if (izinSakitHariIni) { toast(`⚠️ Anda sudah melaporkan ${izinSakitHariIni.type} hari ini.`, true); return; }
      if (!V4.absenQr || !V4.absenQr.token) { toast('⚠️ QR Absensi belum diatur Admin. Hubungi Admin.', true); return; }
      const video = document.getElementById('video'), container = document.getElementById('videoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast('⚠️ Browser tidak support kamera!', true);
        v4SetFaceStatus('⚠️ Browser tidak support kamera. Hubungi Admin.', '#fee2e2', '#991b1b', '#dc2626');
        return;
      }
      document.getElementById('btnStartQrScan').style.display = 'none';
      document.getElementById('btnVerifyFace').style.display = 'none';
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 480 }, height: { ideal: 360 } }, audio: false })
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
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) { v4HandleQrDetected(code.data); return; }
        } catch (e) { console.error('Gagal baca frame QR:', e); }
      }
      qrScanRAF = requestAnimationFrame(v4TickQrScan);
    }
    function v4HandleQrDetected(data) {
      if (data !== V4.absenQr.token) {
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
      navigator.geolocation.getCurrentPosition(pos => {
        const jarak = v4HitungJarakMeter(pos.coords.latitude, pos.coords.longitude, V4.absenQr.lat, V4.absenQr.lng);
        const radius = V4.absenQr.radius || 150;
        if (jarak > radius) {
          v4SetFaceStatus(`❌ Anda terlalu jauh dari madrasah (±${Math.round(jarak)}m, maksimal ${radius}m). Absen harus dilakukan di lokasi madrasah.`, '#fee2e2', '#991b1b', '#dc2626');
          document.getElementById('btnStartQrScan').style.display = 'block';
          return;
        }
        const type = v4DeteksiTipeAbsenGuru();
        if (!type) {
          v4SetFaceStatus('✅ Anda sudah absen Datang & Pulang hari ini.', '#dcfce7', '#065f46', '#059669');
          document.getElementById('btnStartQrScan').style.display = 'none';
          return;
        }
        const now = new Date(), sekarangMenit = now.getHours() * 60 + now.getMinutes();
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
        const telatMsg = keteranganTelat ? ` <span style="color:#dc2626;font-weight:700;">(⚠️ ${keteranganTelat})</span>` : '';
        v4SetFaceStatus(`✅ Lokasi terverifikasi (±${Math.round(jarak)}m dari madrasah). Siap absen <b>${type}</b> pukul ${now.toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}${telatMsg}. Klik "Konfirmasi Absen".`, '#dcfce7', '#065f46', '#059669');
        document.getElementById('btnVerifyFace').textContent = `✅ Konfirmasi Absen ${type}`;
        document.getElementById('btnVerifyFace').style.display = 'block';
        document.getElementById('btnStartQrScan').style.display = 'none';
        // Ring hijau berkedip 3x supaya mata langsung tertuju ke tombol konfirmasi begitu
        // muncul -- class dilepas lagi setelah animasi selesai (~2.7s) supaya tidak berkedip
        // terus-menerus dan tidak mengganggu tap berikutnya.
        const btnConfirm = document.getElementById('btnVerifyFace');
        btnConfirm.classList.add('btn-confirm-pulse');
        setTimeout(() => btnConfirm.classList.remove('btn-confirm-pulse'), 2700);
      }, err => {
        console.error(err);
        v4SetFaceStatus('❌ Gagal mengambil lokasi GPS: ' + err.message + '. Pastikan izin lokasi diaktifkan lalu coba lagi.', '#fee2e2', '#991b1b', '#dc2626');
        document.getElementById('btnStartQrScan').style.display = 'block';
      }, { enableHighAccuracy: true, timeout: 10000 });
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
      const btnStart = document.getElementById('btnStartQrScan'), btnVerify = document.getElementById('btnVerifyFace');
      if (btnStart) btnStart.style.display = 'block';
      if (btnVerify) btnVerify.style.display = 'none';
      v4SetFaceStatus('⏳ Klik "Mulai Scan QR" untuk absen', '#fef3c7', '#92400e', '#d97706');
    }

    // ============================================================
    // LEMBUR & RAPAT (acara di luar jam pelajaran, ada honornya)
    // ============================================================
    function renderEventAdminForm() {
      const card = document.getElementById('eventAdminFormCard');
      if (!card) return;
      card.style.display = isAdmin() ? 'block' : 'none';
      // Isi otomatis default "Honor Kegiatan/sesi" dari ⚙️ Tarif Honor Terpusat, kalau field masih kosong & bukan mode edit.
      const honorInput = document.getElementById('eventHonor'), editKeyInput = document.getElementById('eventEditKey');
      if (isAdmin() && honorInput && editKeyInput && !editKeyInput.value && !honorInput.value && V4.rates && V4.rates.activity) honorInput.value = V4.rates.activity;
    }
    function submitEvent() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('submitEvent')) return toast('Sedang menyimpan...', false, 1500);
      const nama = document.getElementById('eventNama').value.trim();
      const jenis = document.getElementById('eventJenis').value;
      const tanggal = document.getElementById('eventTanggal').value;
      const jamMulai = document.getElementById('eventJamMulai').value;
      const jamSelesai = document.getElementById('eventJamSelesai').value;
      const honor = parseInt(document.getElementById('eventHonor').value) || 0;
      const editKey = document.getElementById('eventEditKey').value;
      if (!nama || !tanggal || !jamMulai || !jamSelesai) return toast('Lengkapi semua data!', true);
      if (honor <= 0) return toast('Honor harus lebih dari 0!', true);
      const data = { nama, jenis, tanggal, jamMulai, jamSelesai, honor, tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() };
      const ref = editKey ? db.ref('events/' + editKey) : db.ref('events').push();
      if (!editKey) { data.createdBy = currentUser.name; data.guruKey = currentUser.key || null; data.createdAt = new Date().toISOString(); }
      const btnSubmitEvent = document.getElementById('btnSubmitEvent');
      setBusy('submitEvent', btnSubmitEvent);
      ref.update(data, err => {
        clearBusy('submitEvent', btnSubmitEvent);
        if (err) return toast('Gagal: ' + err.message, true);
        toast(editKey ? '✅ Acara diperbarui!' : '✅ Acara dibuat!');
        addLog(editKey ? 'edit_event' : 'buat_event', nama);
        document.getElementById('eventNama').value = ''; document.getElementById('eventTanggal').value = ''; document.getElementById('eventJamMulai').value = ''; document.getElementById('eventJamSelesai').value = ''; document.getElementById('eventHonor').value = (V4.rates && V4.rates.activity) || ''; document.getElementById('eventEditKey').value = '';
        reloadDataset('events');
      });
    }
    function editEvent(key) {
      const ev = allEvents.find(e => e.key === key);
      if (!ev) return;
      document.getElementById('eventNama').value = ev.nama; document.getElementById('eventJenis').value = ev.jenis; document.getElementById('eventTanggal').value = ev.tanggal; document.getElementById('eventJamMulai').value = ev.jamMulai; document.getElementById('eventJamSelesai').value = ev.jamSelesai; document.getElementById('eventHonor').value = ev.honor; document.getElementById('eventEditKey').value = key;
      toast('✏️ Mode edit acara — ubah data lalu klik Simpan.');
    }
    function deleteEvent(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!confirm('Hapus acara ini? Catatan check-in yang sudah ada tidak akan terhapus.')) return;
      db.ref('events/' + key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('🗑️ Acara dihapus.'); addLog('hapus_event', key); reloadDataset('events');
      });
    }
    // Galeri peserta check-in (Acara/Ujian) berikut foto buktinya -- sebelumnya foto tersimpan
    // tapi tidak pernah ditampilkan di mana pun, cuma dihitung jumlahnya. Read-only, jadi
    // dibuka untuk Admin & Kepsek (sama seperti akses rekap lain), bukan cuma Admin.
    function tampilkanPesertaCheckin(daftar, judul) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const overlay = document.createElement('div');
      overlay.id = 'pesertaCheckinOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;';
      const sorted = [...daftar].sort((a,b) => waktuMs(a.waktu) - waktuMs(b.waktu));
      const rows = sorted.length
        ? sorted.map(a => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e5e7eb;">
            ${a.foto ? `<img src="${a.foto}" alt="Foto" style="width:44px;height:44px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="lihatFotoBesar(this.src)">` : `<div style="width:44px;height:44px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;">${escapeHtml(a.guru || '-')}</div>
              <div class="text-muted" style="font-size:12px;">${a.waktu ? new Date(a.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '-'}</div>
            </div>
          </div>`).join('')
        : `<p class="text-muted" style="text-align:center;padding:20px 0;">Belum ada yang check-in.</p>`;
      overlay.innerHTML = `<div style="background:white;border-radius:12px;padding:16px;max-width:400px;width:100%;max-height:80vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;">
            <p style="font-weight:700;font-size:14px;">👥 Peserta: ${escapeHtml(judul)}</p>
            <button class="btn" style="padding:2px 10px;font-size:12px;flex-shrink:0;" onclick="document.getElementById('pesertaCheckinOverlay').remove()">✕ Tutup</button>
          </div>
          ${rows}
        </div>`;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }
    function lihatPesertaEvent(eventKey) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const ev = allEvents.find(e => e.key === eventKey);
      toast('⏳ Memuat foto...', false, 1500);
      // Ambil ULANG langsung dari Firebase (bukan dari allEventAttendance yang sudah dibuang
      // foto-nya, lihat catatan di v4LoadCore) -- supaya foto cuma diunduh saat benar-benar
      // dibutuhkan, bukan oleh semua orang di setiap pembukaan aplikasi. (Opsional: tambahkan
      // rule .indexOn:["eventKey"] pada path event_attendance di Firebase Rules kalau data
      // sudah sangat banyak, supaya query ini lebih cepat di sisi server.)
      db.ref('event_attendance').orderByChild('eventKey').equalTo(eventKey).once('value', snap => {
        const daftar = [];
        snap.forEach(child => { const ea = child.val(); ea.key = child.key; daftar.push(ea); });
        lampirkanFoto('event_attendance', daftar).then(() => tampilkanPesertaCheckin(daftar, ev ? ev.nama : 'Acara'));
      }, err => toast('Gagal memuat: ' + err.message, true));
    }
    function lihatPesertaUjian(ujianKey) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const u = allUjian.find(e => e.key === ujianKey);
      toast('⏳ Memuat foto...', false, 1500);
      db.ref('ujian_attendance').orderByChild('ujianKey').equalTo(ujianKey).once('value', snap => {
        const daftar = [];
        snap.forEach(child => { const ua = child.val(); ua.key = child.key; daftar.push(ua); });
        lampirkanFoto('ujian_attendance', daftar).then(() => tampilkanPesertaCheckin(daftar, u ? u.nama : 'Ujian'));
      }, err => toast('Gagal memuat: ' + err.message, true));
    }
    function renderEventList() {
      const list = document.getElementById('eventList');
      if (!list) return;
      const sorted = [...allEvents].sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (sorted.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada acara.</p>'; return; }
      let html = '';
      sorted.forEach(ev => {
        const jumlahHadir = allEventAttendance.filter(a => a.eventKey === ev.key).length;
        const icon = ev.jenis === 'Lembur' ? '⏰' : '🗓️';
        const tombolAdmin = isAdmin() ? `<button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="editEvent('${ev.key}')">✏️</button> <button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="deleteEvent('${ev.key}')">🗑️</button>` : '';
        html += `<div style="padding:10px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <span><strong>${icon} ${escapeHtml(ev.nama)}</strong></span>
            <span>${tombolAdmin}</span>
          </div>
          <div class="text-muted" style="margin-top:2px;">${escapeHtml(ev.tanggal)} | ${escapeHtml(ev.jamMulai)}-${escapeHtml(ev.jamSelesai)} | Rp ${(ev.honor||0).toLocaleString()} | ${(isAdmin()||isKepsek()) ? `<span style="color:#2563eb;cursor:pointer;text-decoration:underline;" onclick="lihatPesertaEvent('${ev.key}')">👥 ${jumlahHadir} hadir</span>` : `👥 ${jumlahHadir} hadir`}</div>
        </div>`;
      });
      list.innerHTML = html;
    }
    function renderEventsToday() {
      const list = document.getElementById('eventTodayList');
      if (!list || !currentUser) return;
      const today = tglLokal();
      const eventsToday = allEvents.filter(e => e.tanggal === today);
      if (eventsToday.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada acara hari ini.</p>'; return; }
      let html = '';
      eventsToday.forEach(ev => {
        const sudahCheckin = allEventAttendance.find(a => a.eventKey === ev.key && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
        const icon = ev.jenis === 'Lembur' ? '⏰' : '🗓️';
        const tombol = sudahCheckin
          ? `<span style="color:#065f46;font-weight:600;">✅ Sudah Check-in ${sudahCheckin.waktu ? new Date(sudahCheckin.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : ''}</span>`
          : `<button class="btn btn-success" style="padding:4px 14px;font-size:12px;" onclick="openEventCheckin('${ev.key}')">📸 Check-in</button>`;
        html += `<div style="padding:10px 12px;background:#eff6ff;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span><strong>${icon} ${escapeHtml(ev.nama)}</strong><br><span class="text-muted" style="font-size:12px;">${escapeHtml(ev.jamMulai)}-${escapeHtml(ev.jamSelesai)} · Rp ${(ev.honor||0).toLocaleString()}</span></span>
          ${tombol}
        </div>`;
      });
      list.innerHTML = html;
    }
    let eventCameraStream = null, activeEventKey = null;
    function openEventCheckin(eventKey) {
      activeEventKey = eventKey;
      const ev = allEvents.find(e => e.key === eventKey);
      document.getElementById('eventCameraCard').style.display = 'block';
      document.getElementById('eventCameraTitle').textContent = `📸 Check-in: ${ev ? ev.nama : ''}`;
      document.getElementById('eventCameraCard').scrollIntoView({ behavior: 'smooth' });
    }
    function cancelEventCheckin() {
      stopEventCamera();
      activeEventKey = null;
      document.getElementById('eventCameraCard').style.display = 'none';
    }
    function startEventCamera() {
      const video = document.getElementById('eventVideo'), container = document.getElementById('eventVideoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
        .then(stream => {
          eventCameraStream = stream; video.srcObject = stream; container.style.display = 'block'; video.style.display = 'block'; video.play();
          document.getElementById('eventFaceStatus').innerHTML = '✅ Kamera aktif. Klik "Ambil Foto & Check-in"';
          document.getElementById('eventFaceStatus').style.background = '#dcfce7'; document.getElementById('eventFaceStatus').style.color = '#065f46';
        })
        .catch(err => { console.error(err); toast('❌ Gagal akses kamera.', true); });
    }
    function stopEventCamera() {
      if (eventCameraStream) { eventCameraStream.getTracks().forEach(t => t.stop()); eventCameraStream = null; }
      const video = document.getElementById('eventVideo'), container = document.getElementById('eventVideoContainer');
      if (video) { video.srcObject = null; video.style.display = 'none'; }
      if (container) container.style.display = 'none';
    }
    function checkinEvent() {
      if (!activeEventKey) return;
      const ev = allEvents.find(e => e.key === activeEventKey);
      if (!ev) return toast('Acara tidak ditemukan.', true);
      const sudahCheckin = allEventAttendance.find(a => a.eventKey === activeEventKey && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      if (sudahCheckin) return toast('Anda sudah check-in acara ini!', true);
      if (!eventCameraStream) return toast('⚠️ Aktifkan kamera terlebih dahulu!', true);
      const btn = document.getElementById('btnEventCheckin');
      btn.disabled = true; btn.textContent = '⏳ Memproses...';
      const video = document.getElementById('eventVideo'), canvas = document.getElementById('eventSnapshotCanvas');
      let fotoDataUrl = null;
      try {
        // Foto diperkecil dulu (maks 480px sisi terpanjang) lalu disimpan LANGSUNG sebagai data URL
        // di field `foto` pada record event_attendance (bukan diunggah ke Storage, yang butuh plan
        // berbayar Blaze -- project ini di plan gratis Spark).
        const maxSisi = 480;
        const skala = Math.min(1, maxSisi / Math.max(video.videoWidth || 320, video.videoHeight || 240));
        canvas.width = Math.round((video.videoWidth || 320) * skala);
        canvas.height = Math.round((video.videoHeight || 240) * skala);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        fotoDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      } catch (e) { console.error('Gagal ambil snapshot:', e); }
      const today = tglLokal();
      // KEY TETAP (eventKey+guru) + transaction() -- sama seperti perbaikan absen Datang/Pulang,
      // supaya "sudah check-in atau belum" dijamin atomik di server, bukan cuma dicek di memori
      // browser (yang bisa race kalau dibuka di 2 device/tab hampir bersamaan).
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const dbRef = db.ref(`event_attendance/${activeEventKey}_${guruKeyAman}`);
      const dataBaru = { eventKey: activeEventKey, eventNama: ev.nama, jenis: ev.jenis, guru: currentUser.name, guruKey: currentUser.key, tanggal: today, waktu: new Date().toISOString(), honor: ev.honor, tahunAjaran: currentTahunAjaran, hasFoto: !!fotoDataUrl }; // foto disimpan terpisah (lihat simpanFotoTerpisah)
      dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        btn.disabled = false; btn.textContent = '✅ Ambil Foto & Check-in';
        if (err) return toast('Gagal: ' + err.message, true);
        if (!committed) { toast('⚠️ Anda sudah check-in acara ini (tercatat dari sesi lain).', true); reloadDataset(['events','eventAttendance'], () => { renderEventsToday(); renderEventList(); }); return; }
        toast('✅ Check-in berhasil!'); addLog('checkin_event', ev.nama);
        simpanFotoTerpisah('event_attendance', snapshot.key, fotoDataUrl);
        allEventAttendance.push({ ...dataBaru, key: snapshot.key });
        renderEventsToday(); renderEventList();
        cancelEventCheckin();
      });
    }

    // ============================================================
    // HONOR UJIAN (sistem terpisah dari Lembur & Rapat)
    // ============================================================
    function renderUjianAdminForm() {
      const card = document.getElementById('ujianAdminFormCard');
      if (!card) return;
      card.style.display = isAdmin() ? 'block' : 'none';
      // Isi otomatis default "Honor Kegiatan/sesi" dari ⚙️ Tarif Honor Terpusat, kalau field masih kosong & bukan mode edit.
      const honorInput = document.getElementById('ujianHonor'), editKeyInput = document.getElementById('ujianEditKey');
      if (isAdmin() && honorInput && editKeyInput && !editKeyInput.value && !honorInput.value && V4.rates && V4.rates.activity) honorInput.value = V4.rates.activity;
    }
    function submitUjian() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('submitUjian')) return toast('Sedang menyimpan...', false, 1500);
      const nama = document.getElementById('ujianNama').value.trim();
      const jenis = document.getElementById('ujianJenis').value;
      const tanggal = document.getElementById('ujianTanggal').value;
      const jamMulai = document.getElementById('ujianJamMulai').value;
      const jamSelesai = document.getElementById('ujianJamSelesai').value;
      const honor = parseInt(document.getElementById('ujianHonor').value) || 0;
      const editKey = document.getElementById('ujianEditKey').value;
      if (!nama || !tanggal || !jamMulai || !jamSelesai) return toast('Lengkapi semua data!', true);
      if (honor <= 0) return toast('Honor harus lebih dari 0!', true);
      const data = { nama, jenis, tanggal, jamMulai, jamSelesai, honor, tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() };
      const ref = editKey ? db.ref('ujian/' + editKey) : db.ref('ujian').push();
      if (!editKey) { data.createdBy = currentUser.name; data.guruKey = currentUser.key || null; data.createdAt = new Date().toISOString(); }
      const btnSubmitUjian = document.getElementById('btnSubmitUjian');
      setBusy('submitUjian', btnSubmitUjian);
      ref.update(data, err => {
        clearBusy('submitUjian', btnSubmitUjian);
        if (err) return toast('Gagal: ' + err.message, true);
        toast(editKey ? '✅ Sesi ujian diperbarui!' : '✅ Sesi ujian dibuat!');
        addLog(editKey ? 'edit_ujian' : 'buat_ujian', nama);
        document.getElementById('ujianNama').value = ''; document.getElementById('ujianTanggal').value = ''; document.getElementById('ujianJamMulai').value = ''; document.getElementById('ujianJamSelesai').value = ''; document.getElementById('ujianHonor').value = (V4.rates && V4.rates.activity) || ''; document.getElementById('ujianEditKey').value = '';
        reloadDataset('ujian');
      });
    }
    function editUjian(key) {
      const u = allUjian.find(e => e.key === key);
      if (!u) return;
      document.getElementById('ujianNama').value = u.nama; document.getElementById('ujianJenis').value = u.jenis; document.getElementById('ujianTanggal').value = u.tanggal; document.getElementById('ujianJamMulai').value = u.jamMulai; document.getElementById('ujianJamSelesai').value = u.jamSelesai; document.getElementById('ujianHonor').value = u.honor; document.getElementById('ujianEditKey').value = key;
      toast('✏️ Mode edit sesi ujian — ubah data lalu klik Simpan.');
    }
    function deleteUjian(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!confirm('Hapus sesi ujian ini? Catatan check-in yang sudah ada tidak akan terhapus.')) return;
      db.ref('ujian/' + key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('🗑️ Sesi ujian dihapus.'); addLog('hapus_ujian', key); reloadDataset('ujian');
      });
    }
    function renderUjianList() {
      const list = document.getElementById('ujianList');
      if (!list) return;
      const sorted = [...allUjian].sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (sorted.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada sesi ujian.</p>'; return; }
      let html = '';
      sorted.forEach(u => {
        const jumlahHadir = allUjianAttendance.filter(a => a.ujianKey === u.key).length;
        const icon = u.jenis === 'Koreksi' ? '✏️' : u.jenis === 'Pembuat Soal' ? '📄' : '👁️';
        const tombolAdmin = isAdmin() ? `<button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="editUjian('${u.key}')">✏️</button> <button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="deleteUjian('${u.key}')">🗑️</button>` : '';
        html += `<div style="padding:10px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <span><strong>${icon} ${escapeHtml(u.nama)}</strong> <span style="font-size:11px;color:#7c3aed;">(${escapeHtml(u.jenis)})</span></span>
            <span>${tombolAdmin}</span>
          </div>
          <div class="text-muted" style="margin-top:2px;">${escapeHtml(u.tanggal)} | ${escapeHtml(u.jamMulai)}-${escapeHtml(u.jamSelesai)} | Rp ${(u.honor||0).toLocaleString()} | ${(isAdmin()||isKepsek()) ? `<span style="color:#7c3aed;cursor:pointer;text-decoration:underline;" onclick="lihatPesertaUjian('${u.key}')">👥 ${jumlahHadir} hadir</span>` : `👥 ${jumlahHadir} hadir`}</div>
        </div>`;
      });
      list.innerHTML = html;
    }
    function renderUjianToday() {
      const list = document.getElementById('ujianTodayList');
      if (!list || !currentUser) return;
      const today = tglLokal();
      const ujianToday = allUjian.filter(u => u.tanggal === today);
      if (ujianToday.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada sesi ujian hari ini.</p>'; return; }
      let html = '';
      ujianToday.forEach(u => {
        const sudahCheckin = allUjianAttendance.find(a => a.ujianKey === u.key && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
        const icon = u.jenis === 'Koreksi' ? '✏️' : u.jenis === 'Pembuat Soal' ? '📄' : '👁️';
        const tombol = sudahCheckin
          ? `<span style="color:#065f46;font-weight:600;">✅ Sudah Check-in ${sudahCheckin.waktu ? new Date(sudahCheckin.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : ''}</span>`
          : `<button class="btn btn-success" style="padding:4px 14px;font-size:12px;" onclick="openUjianCheckin('${u.key}')">📸 Check-in</button>`;
        html += `<div style="padding:10px 12px;background:#f3e8ff;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span><strong>${icon} ${escapeHtml(u.nama)}</strong> <span style="font-size:11px;color:#7c3aed;">(${escapeHtml(u.jenis)})</span><br><span class="text-muted" style="font-size:12px;">${escapeHtml(u.jamMulai)}-${escapeHtml(u.jamSelesai)} · Rp ${(u.honor||0).toLocaleString()}</span></span>
          ${tombol}
        </div>`;
      });
      list.innerHTML = html;
    }
    let ujianCameraStream = null, activeUjianKey = null;
    function openUjianCheckin(ujianKey) {
      activeUjianKey = ujianKey;
      const u = allUjian.find(e => e.key === ujianKey);
      document.getElementById('ujianCameraCard').style.display = 'block';
      document.getElementById('ujianCameraTitle').textContent = `📸 Check-in: ${u ? u.nama : ''}`;
      document.getElementById('ujianCameraCard').scrollIntoView({ behavior: 'smooth' });
    }
    function cancelUjianCheckin() {
      stopUjianCamera();
      activeUjianKey = null;
      document.getElementById('ujianCameraCard').style.display = 'none';
    }
    function startUjianCamera() {
      const video = document.getElementById('ujianVideo'), container = document.getElementById('ujianVideoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
        .then(stream => {
          ujianCameraStream = stream; video.srcObject = stream; container.style.display = 'block'; video.style.display = 'block'; video.play();
          document.getElementById('ujianFaceStatus').innerHTML = '✅ Kamera aktif. Klik "Ambil Foto & Check-in"';
          document.getElementById('ujianFaceStatus').style.background = '#dcfce7'; document.getElementById('ujianFaceStatus').style.color = '#065f46';
        })
        .catch(err => { console.error(err); toast('❌ Gagal akses kamera.', true); });
    }
    function stopUjianCamera() {
      if (ujianCameraStream) { ujianCameraStream.getTracks().forEach(t => t.stop()); ujianCameraStream = null; }
      const video = document.getElementById('ujianVideo'), container = document.getElementById('ujianVideoContainer');
      if (video) { video.srcObject = null; video.style.display = 'none'; }
      if (container) container.style.display = 'none';
    }
    function checkinUjian() {
      if (!activeUjianKey) return;
      const u = allUjian.find(e => e.key === activeUjianKey);
      if (!u) return toast('Sesi ujian tidak ditemukan.', true);
      const sudahCheckin = allUjianAttendance.find(a => a.ujianKey === activeUjianKey && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      if (sudahCheckin) return toast('Anda sudah check-in sesi ujian ini!', true);
      if (!ujianCameraStream) return toast('⚠️ Aktifkan kamera terlebih dahulu!', true);
      const btn = document.getElementById('btnUjianCheckin');
      btn.disabled = true; btn.textContent = '⏳ Memproses...';
      const video = document.getElementById('ujianVideo'), canvas = document.getElementById('ujianSnapshotCanvas');
      let fotoDataUrl = null;
      try {
        // Sama seperti checkinEvent(): foto tidak lagi lewat Firebase Storage (butuh Blaze),
        // langsung disimpan sebagai data URL yang diperkecil (maks 480px sisi terpanjang).
        const maxSisi = 480;
        const skala = Math.min(1, maxSisi / Math.max(video.videoWidth || 320, video.videoHeight || 240));
        canvas.width = Math.round((video.videoWidth || 320) * skala);
        canvas.height = Math.round((video.videoHeight || 240) * skala);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        fotoDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      } catch (e) { console.error('Gagal ambil snapshot:', e); }
      const today = tglLokal();
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const dbRef = db.ref(`ujian_attendance/${activeUjianKey}_${guruKeyAman}`);
      const dataBaru = { ujianKey: activeUjianKey, ujianNama: u.nama, jenis: u.jenis, guru: currentUser.name, guruKey: currentUser.key, tanggal: today, waktu: new Date().toISOString(), honor: u.honor, tahunAjaran: currentTahunAjaran, hasFoto: !!fotoDataUrl }; // foto disimpan terpisah (lihat simpanFotoTerpisah)
      dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        btn.disabled = false; btn.textContent = '✅ Ambil Foto & Check-in';
        if (err) return toast('Gagal: ' + err.message, true);
        if (!committed) { toast('⚠️ Anda sudah check-in sesi ujian ini (tercatat dari sesi lain).', true); reloadDataset(['ujian','ujianAttendance'], () => { renderUjianToday(); renderUjianList(); }); return; }
        toast('✅ Check-in berhasil!'); addLog('checkin_ujian', u.nama);
        simpanFotoTerpisah('ujian_attendance', snapshot.key, fotoDataUrl);
        allUjianAttendance.push({ ...dataBaru, key: snapshot.key });
        renderUjianToday(); renderUjianList();
        cancelUjianCheckin();
      });
    }
    // Cek apakah suatu "jam ke-N" ditandai sebagai Ekstrakurikuler — dinamis dari jamSettings
    // (bukan hardcode "jam ke-4" lagi), supaya Admin bebas atur jumlah jam & jam mana yang ekstra.
    function isJamEkstra(jamKe) {
      return !!(jamSettings[jamKe] && jamSettings[jamKe].isEkstra);
    }
    function getJamAbsenWindow(type) {
      if (type === 'Datang') return { mulai: '06:00', selesai: '07:30' };
      // Jendela Absen Pulang: beda untuk Jumat & Sabtu (pulang lebih awal), hari lain tetap normal.
      const hari = new Date().getDay(); // 0=Minggu, 5=Jumat, 6=Sabtu
      if (hari === 5) return { mulai: '10:00', selesai: '12:00' };
      if (hari === 6) return { mulai: '10:30', selesai: '12:00' };
      return { mulai: '11:00', selesai: '12:30' };
    }
    function updateLabelJamPulang() {
      const w = getJamAbsenWindow('Pulang');
      const teks = `${w.mulai}-${w.selesai}`;
      ['labelJamPulangInfo','labelJamPulangRadio','labelJamPulangBlock','labelJamPulangQuota'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = teks;
      });
    }
    function sudahAbsenTipeIni(type, today) {
      const todayAbsen = allTeacherAttendance.filter(a => a.tanggal === today && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      return todayAbsen.find(a => a.type === type) || null;
    }
    
    function renderAdminTeacherAttendance() {
      const list = document.getElementById('adminTeacherAttendanceList');
      const summary = document.getElementById('adminTeacherAttendanceSummary');
      if (!list) return;
      const today = tglLokal();
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      if (guruAktif.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada data guru.</p>'; return; }

      let html = '';
      let sudahHadir = 0, belumHadir = 0;

      guruAktif.forEach(g => {
        const absenHariIni = allTeacherAttendance.find(a => a.tanggal === today && (a.guruKey ? a.guruKey === g.key : a.guru === g.name));
        if (absenHariIni) {
          sudahHadir++;
          const type = absenHariIni.type || 'Datang';
          const waktu = absenHariIni.waktu ? new Date(absenHariIni.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          const metode = absenHariIni.metode === 'qr_lokasi' ? '📍 QR+Lokasi' : (absenHariIni.metode === 'kamera_validasi' ? '📸 Kamera' : (absenHariIni.metode === 'otomatis_sistem' ? '🤖 Otomatis' : '📝 Manual'));
          const telat = absenHariIni.keterangan ? ` <span style="color:#dc2626;">⚠️ ${escapeHtml(absenHariIni.keterangan)}</span>` : '';
          const bg = type === 'Izin' || type === 'Sakit' ? '#fef3c7' : (absenHariIni.keterangan ? '#fee2e2' : '#f0fdf4');
          const border = type === 'Izin' || type === 'Sakit' ? '#d97706' : (absenHariIni.keterangan ? '#dc2626' : '#059669');
          const icon = type === 'Izin' ? '📝' : (type === 'Sakit' ? '🤒' : (absenHariIni.keterangan ? '⚠️' : '✅'));
          html += `<div style="padding:8px 12px;background:${bg};border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid ${border};"><span>${icon} ${escapeHtml(g.name)}</span><span style="color:#065f46;font-weight:600;">${escapeHtml(type)} ${escapeHtml(waktu)} ${escapeHtml(metode)}${telat}</span></div>`;
        } else {
          belumHadir++;
          html += `<div style="padding:8px 12px;background:#fee2f2;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid #dc2626;"><span>👤 ${escapeHtml(g.name)}</span><span style="color:#991b1b;font-weight:600;">❌ Belum Absen</span></div>`;
        }
      });

      list.innerHTML = html;
      if (summary) {
        summary.innerHTML = `
          <span style="background:#f0fdf4;padding:4px 12px;border-radius:20px;color:#065f46;font-weight:600;">✅ Hadir: ${sudahHadir}</span>
          <span style="background:#fee2f2;padding:4px 12px;border-radius:20px;color:#991b1b;font-weight:600;">❌ Belum: ${belumHadir}</span>
          <span class="text-strong" style="background:#f3f4f6;padding:4px 12px;border-radius:20px;font-weight:600;">📊 Total: ${guruAktif.length}</span>
        `;
      }
    }
    // ============================================================
    // PENGINGAT OTOMATIS DARI SISTEM (dipicu oleh sesi siapa pun yang
    // sedang membuka aplikasi setelah jendela Datang/Pulang tutup).
    // Pakai Firebase transaction supaya hanya terkirim SEKALI per hari
    // per jenis, meski ada beberapa orang buka app di jam yang sama.
    // ============================================================
    const SISTEM_OTOMATIS_LABEL = '🤖 Sistem Otomatis';
    function cekDanKirimPengingatOtomatis() {
      if (!currentUser) return;
      const now = new Date(), sekarangMenit = now.getHours() * 60 + now.getMinutes();
      const today = tglLokal(now);
      ['Datang', 'Pulang'].forEach(jenis => {
        const window_ = getJamAbsenWindow(jenis);
        const selesai = window_.selesai.split(':');
        const bufferMenit = parseInt(selesai[0]) * 60 + parseInt(selesai[1]) + 5;
        if (sekarangMenit < bufferMenit) return;
        const markerRef = db.ref('auto_reminder_sent/' + today + '/' + jenis);
        markerRef.transaction(current => {
          if (current) return; // batalkan, sudah pernah dikirim hari ini
          return { sentAt: new Date().toISOString(), sentBy: currentUser.name };
        }, (err, committed) => {
          if (err || !committed) return; // gagal, atau kalah cepat dari sesi lain
          kirimPengingatMassal(jenis);
        });
      });
    }
    function kirimPengingatMassal(jenis) {
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      const today = tglLokal();
      guruAktif.forEach(g => {
        const recs = allTeacherAttendanceToday.filter(a => (a.guruKey ? a.guruKey === g.key : a.guru === g.name));
        if (recs.find(a => a.type === 'Izin' || a.type === 'Sakit')) return;
        if (recs.find(a => a.type === jenis)) return;
        const ref = db.ref('reminders/' + today).push();
        ref.set({ to: g.name, toKey: g.key || null, from: SISTEM_OTOMATIS_LABEL, jenis: jenis, otomatis: true, createdAt: new Date().toISOString() });
      });
    }
    function renderBelumAbsen() {
      const section = document.getElementById('belumAbsenSection'), list = document.getElementById('belumAbsenList');
      if (!section || !list || !currentUser) return;
      // Info level-sekolah (semua guru) -- disembunyikan total untuk guru biasa, pola yang sama
      // dengan cek role di renderLogs().
      if (!isAdmin() && !isKepsek()) { section.style.display = 'none'; return; }
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      if (guruAktif.length === 0) { section.style.display = 'none'; return; }

      section.style.display = 'block';
      const now = new Date(), sekarangMenit = now.getHours() * 60 + now.getMinutes();
      const winPulang = getJamAbsenWindow('Pulang');
      const pulangMulai = winPulang.mulai.split(':'), pulangMulaiMenit = parseInt(pulangMulai[0]) * 60 + parseInt(pulangMulai[1]);
      const sudahMasukJamPulang = sekarangMenit >= pulangMulaiMenit;

      let html = '';
      let selesai = 0, prosesBelumPulang = 0, belumDatang = 0;

      guruAktif.forEach(g => {
        const recs = allTeacherAttendanceToday.filter(a => (a.guruKey ? a.guruKey === g.key : a.guru === g.name));
        const izinSakit = recs.find(a => a.type === 'Izin' || a.type === 'Sakit');
        if (izinSakit) {
          selesai++;
          const waktu = izinSakit.waktu ? new Date(izinSakit.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          const icon = izinSakit.type === 'Izin' ? '📝' : '🤒';
          html += `<div style="padding:8px 12px;background:#fef3c7;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid #d97706;"><span>${icon} ${escapeHtml(g.name)}</span><span style="color:#92400e;font-weight:600;">${escapeHtml(izinSakit.type)} ${escapeHtml(waktu)}</span></div>`;
          return;
        }
        const datangRec = recs.find(a => a.type === 'Datang');
        const pulangRec = recs.find(a => a.type === 'Pulang');
        const isSelf = g.key === currentUser.key;
        let statusDatang, statusPulang;
        if (datangRec) {
          const waktu = datangRec.waktu ? new Date(datangRec.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          statusDatang = `<span style="color:#065f46;">✅ Datang ${escapeHtml(waktu)}</span>`;
        } else {
          const tombol = isSelf ? '' : ` <button class="btn btn-soft" style="padding:1px 8px;font-size:11px;" onclick="kirimIngatkan('${escapeJs(g.name)}','${escapeJs(g.key||'')}','Datang')">🔔</button>`;
          statusDatang = `<span style="color:#991b1b;">❌ Datang</span>${tombol}`;
        }
        if (pulangRec) {
          const waktu = pulangRec.waktu ? new Date(pulangRec.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          statusPulang = `<span style="color:#065f46;">✅ Pulang ${escapeHtml(waktu)}</span>`;
        } else if (sudahMasukJamPulang) {
          const tombol = isSelf ? '' : ` <button class="btn btn-soft" style="padding:1px 8px;font-size:11px;" onclick="kirimIngatkan('${escapeJs(g.name)}','${escapeJs(g.key||'')}','Pulang')">🔔</button>`;
          statusPulang = `<span style="color:#991b1b;">❌ Pulang</span>${tombol}`;
        } else {
          statusPulang = `<span class="text-muted">⏳ Pulang</span>`;
        }
        const lengkap = datangRec && pulangRec;
        if (lengkap) selesai++; else if (datangRec) prosesBelumPulang++; else belumDatang++;
        const bg = lengkap ? '#f0fdf4' : '#fee2f2';
        const border = lengkap ? '#059669' : '#dc2626';
        html += `<div style="padding:8px 12px;background:${bg};border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid ${border};flex-wrap:wrap;gap:4px;"><span>👤 ${escapeHtml(g.name)}</span><span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">${statusDatang}${statusPulang}</span></div>`;
      });

      const ringkasan = `<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;font-size:12px;">
        <span style="background:#f0fdf4;padding:4px 12px;border-radius:20px;color:#065f46;font-weight:600;">✅ Selesai: ${selesai}</span>
        <span style="background:#fef3c7;padding:4px 12px;border-radius:20px;color:#92400e;font-weight:600;">🕒 Blm Pulang: ${prosesBelumPulang}</span>
        <span style="background:#fee2f2;padding:4px 12px;border-radius:20px;color:#991b1b;font-weight:600;">❌ Blm Datang: ${belumDatang}</span>
        <span class="text-strong" style="background:#f3f4f6;padding:4px 12px;border-radius:20px;font-weight:600;">📊 Total: ${guruAktif.length}</span>
      </div>`;

      list.innerHTML = ringkasan + html;
    }
    function kirimIngatkan(namaGuru, guruKeyTarget, jenis) {
      if (!currentUser) return;
      // Cek "diri sendiri" pakai key kalau tersedia (nama bisa duplikat/berubah) -- fallback nama untuk data lama.
      const isTargetSelf = guruKeyTarget ? guruKeyTarget === currentUser.key : namaGuru === currentUser.name;
      if (isTargetSelf) return;
      jenis = jenis === 'Pulang' ? 'Pulang' : 'Datang';
      const today = tglLokal();
      const ref = db.ref('reminders/' + today).push();
      ref.set({ to: namaGuru, toKey: guruKeyTarget || null, from: currentUser.name, guruKey: currentUser.key || null, jenis: jenis, createdAt: new Date().toISOString() }, err => {
        if (err) toast('❌ Gagal mengirim pengingat: ' + err.message, true);
        else { toast(`🔔 Pengingat absen ${jenis} terkirim ke ${namaGuru}!`); addLog('kirim_pengingat_absen', namaGuru + ' - ' + jenis); }
      });
    }
    let remindersWatchAttached = false;
    let remindersListenerRef = null;
    // Tanggal (WIB) saat listener reminders terakhir dipasang -- lihat refreshRemindersWatchIfDayChanged().
    let remindersWatchDate = null;
    function watchMyReminders() {
      if (remindersWatchAttached || !currentUser) return;
      remindersWatchAttached = true;
      const today = tglLokal();
      remindersWatchDate = today;
      const remindersQuery = currentUser.key ? db.ref('reminders/' + today).orderByChild('toKey').equalTo(currentUser.key) : db.ref('reminders/' + today).orderByChild('to').equalTo(currentUser.name);
      remindersListenerRef = remindersQuery;
      remindersQuery.on('child_added', snap => {
        const val = snap.val();
        if (!val || !val.from) return;
        const jenis = val.jenis || 'Datang';
        const msg = val.otomatis ? `🔔 Sistem mengingatkan: Anda belum absen ${jenis} hari ini!` : `🔔 ${val.from} mengingatkan Anda untuk segera absen ${jenis} hari ini!`;
        toast(msg, false, 6000);
      });
    }
    // FIX: watchMyReminders() cuma dipanggil SEKALI saat login (query-nya terikat ke tanggal
    // hari itu, mis. reminders/2026-09-28). Kalau sesi dibiarkan terbuka melewati tengah malam,
    // listener lama diam-diam terus memantau node tanggal KEMARIN -- pengingat baru yang ditulis
    // ke node hari ini tidak akan pernah memicu toast, tanpa ada error yang terlihat. Dipanggil
    // dari startReminderScheduler() (sudah jalan tiap 2 menit) supaya begitu tanggal WIB berganti,
    // listener lama di-off() lalu dipasang ulang untuk tanggal baru.
    function refreshRemindersWatchIfDayChanged() {
      if (!currentUser || !remindersWatchAttached) return;
      const today = tglLokal();
      if (remindersWatchDate === today) return;
      if (remindersListenerRef) { remindersListenerRef.off(); remindersListenerRef = null; }
      remindersWatchAttached = false;
      watchMyReminders();
    }
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
      let lastCheck = localStorage.getItem('alphaCheckLastDate');
      let startDate;
      if (lastCheck) { startDate = new Date(lastCheck); startDate.setDate(startDate.getDate() + 1); }
      else { startDate = new Date(today); startDate.setDate(startDate.getDate() - 14); }
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      if (guruAktif.length === 0) { localStorage.setItem('alphaCheckLastDate', tglLokal(new Date(today.getTime() - 86400000))); alphaAutoCheckRunning = false; if (onDone) onDone(); return; }
      const tanggalList = [];
      for (let d = new Date(startDate); d < today; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0) continue; // lewati hari Minggu
        tanggalList.push(tglLokal(new Date(d)));
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
            tugas.push(ref.set({ tanggal: tgl, guru: g.name, guruKey: g.key || null, kelas: g.kelas || [], type: 'Alpha', keterangan: 'Tidak ada laporan kehadiran (ditandai otomatis sistem)', tahunAjaran: currentTahunAjaran, waktu: new Date(tgl + 'T23:59:00').getTime(), metode: 'otomatis_sistem' }));
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
      const dbRef = db.ref(`teacher_attendance/${today}_${guruKeyAman}_${type}`);
      dbRef.transaction(existing => {
        if (existing !== null) return; // sudah ada -- batalkan transaksi, jangan ditimpa
        return { tanggal: today, guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, waktu: firebase.database.ServerValue.TIMESTAMP, type: type, tahunAjaran: currentTahunAjaran, metode: 'qr_lokasi', verified: true, keterangan: keteranganTelat || null };
      }, (err, committed, snapshot) => {
        isVerifying = false; clearBusy('verifyAndAbsen', btnVerify);
        qrScanDetectedType = null; qrScanKeteranganTelat = null;
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
      });
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
        const telatBadge = a.keterangan ? `<span class="metode-badge" style="background:#fee2e2;color:#991b1b;">⚠️ ${escapeHtml(a.keterangan)}</span>` : '';
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
      dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        clearBusy('submitIzinSakit', btn);
        if (err) return toast('Gagal: '+err.message, true);
        if (!committed) { toast('⚠️ Anda sudah punya catatan kehadiran hari ini (tercatat dari sesi lain).', true); reloadDataset('teacherAttendance', () => renderTeacherAttendance()); return; }
        toast(`✅ Laporan ${type} berhasil dikirim.`);
        addLog('lapor_izin_sakit', type + (keterangan ? ' - ' + keterangan : ''));
        document.getElementById('izinSakitKeterangan').value = '';
        document.getElementById('izinSakitForm').style.display = 'none';
        const newRecord = { tanggal: today, guru: currentUser.name, guruKey: currentUser.key, kelas: currentUser.kelas, waktu: (snapshot && snapshot.val() && snapshot.val().waktu) || Date.now(), type: type, keterangan: keterangan || null, key: snapshot.key, tahunAjaran: currentTahunAjaran, metode: 'lapor_sendiri' };
        allTeacherAttendance.push(newRecord); bumpTaRev();
        renderTeacherAttendance(); renderJikaAktif('dashboard', updateDashboard);
      });
    }

    // ============================================================
    // RELIGI
    // ============================================================
    function loadReligi() { renderReligi(allReligiAttendance); }
    function renderReligi(data) {
      const today = tglLokal(), bulanIni = today.slice(0,7);
      let filtered = data;
      if (!isAdmin() && !isKepsek()) filtered = filtered.filter(item => (item.guruKey ? item.guruKey === currentUser.key : item.guru === currentUser.name));
      const todayList = filtered.filter(item => item.tanggal === today);
      const todayContainer = document.getElementById('religiTodayList');
      if (todayList.length === 0) { todayContainer.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada absensi religi hari ini.</p>'; }
      else { let html = ''; todayList.forEach(item => { const dluha = item.sholat_dluha || { status: '-', waktu: '-' }; const dzuhur = item.sholat_dzuhur || { status: '-', waktu: '-' }; html += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;flex-wrap:wrap;gap:4px;"><span><strong>${escapeHtml(item.guru)}</strong></span><span>☀️ Dluha: ${escapeHtml(dluha.status)} ${dluha.waktu ? new Date(dluha.waktu).toLocaleTimeString() : ''}</span><span>🕌 Dzuhur: ${escapeHtml(dzuhur.status)} ${dzuhur.waktu ? new Date(dzuhur.waktu).toLocaleTimeString() : ''}</span></div>`; }); todayContainer.innerHTML = html; }
      const monthList = filtered.filter(item => item.tanggal && item.tanggal.startsWith(bulanIni));
      const monthContainer = document.getElementById('religiMonthList'), paginationEl = document.getElementById('religiPagination');
      if (monthList.length === 0) { monthContainer.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada absensi religi bulan ini.</p>'; paginationEl.innerHTML = ''; return; }
      const sorted = monthList.sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      const totalItems = sorted.length, totalPages = Math.ceil(totalItems / PAGE_SIZE);
      if (religiPage > totalPages) religiPage = totalPages; if (religiPage < 1) religiPage = 1;
      const start = (religiPage - 1) * PAGE_SIZE, end = Math.min(start + PAGE_SIZE, totalItems), pageItems = sorted.slice(start, end);
      const grouped = {};
      pageItems.forEach(item => { if (!grouped[item.tanggal]) grouped[item.tanggal] = []; grouped[item.tanggal].push(item); });
      let html = ''; const sortedDates = Object.keys(grouped).sort((a,b) => COLLATOR_ID.compare(b, a));
      sortedDates.forEach(tgl => { const items = grouped[tgl]; html += `<div style="margin-top:6px;"><strong>${escapeHtml(tgl)}</strong>`; items.forEach(item => { const dluha = item.sholat_dluha || { status: '-', waktu: '-' }, dzuhur = item.sholat_dzuhur || { status: '-', waktu: '-' }; html += `<div class="text-medium" style="display:flex;justify-content:space-between;padding:2px 0 2px 16px;font-size:13px;flex-wrap:wrap;gap:4px;"><span>${escapeHtml(item.guru)}</span><span>☀️ ${escapeHtml(dluha.status)}</span><span>🕌 ${escapeHtml(dzuhur.status)}</span></div>`; }); html += `</div>`; });
      monthContainer.innerHTML = html;
      paginationEl.innerHTML = `<button onclick="religiPage--; renderReligi(allReligiAttendance);" ${religiPage <= 1 ? 'disabled' : ''}>◀ Prev</button><span class="page-info">${religiPage} / ${totalPages}</span><button onclick="religiPage++; renderReligi(allReligiAttendance);" ${religiPage >= totalPages ? 'disabled' : ''}>Next ▶</button><span class="text-muted" style="font-size:12px;">Total: ${totalItems} data</span>`;
    }
    function getJamReligi(type) {
      return type === 'sholat_dluha' ? { mulai: '07:00', selesai: '10:00' } : { mulai: '11:00', selesai: '12:30' };
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
    // Cari jenis kegiatan di "Amalan & Kegiatan" (v4) yang namanya cocok dengan sholat Dluha/Dzuhur.
    // Dicocokkan lewat NAMA (bukan ID tetap) karena jenis kegiatan v4 dibuat bebas oleh Admin --
    // jadi Admin WAJIB membuat jenis kegiatan yang namanya mengandung kata "dhuha"/"dluha" atau
    // "dzuhur" di menu Amalan & Kegiatan supaya validasi di bawah ini bisa jalan.
    function v4CariJenisKegiatanSholat(namaSholat) {
      const keywords = namaSholat === 'Dluha' ? ['dhuha', 'dluha'] : ['dzuhur', 'dhuhur', 'zuhur'];
      return (V4.activityTypes || []).filter(a => {
        const n = String(a.name || '').toLowerCase();
        return keywords.some(k => n.includes(k));
      });
    }
    // null = jenis kegiatannya belum dibuat sama sekali oleh Admin di Amalan & Kegiatan.
    // false = sudah dibuat, tapi absensi siswa untuk tanggal ini belum ada yang mengisi.
    // true = absensi siswa untuk sholat ini sudah diisi hari ini (oleh siapapun PJ-nya).
    function v4AbsensiSiswaSholatSudahDiisi(namaSholat, tanggal) {
      const jenis = v4CariJenisKegiatanSholat(namaSholat);
      if (jenis.length === 0) return null;
      const keys = jenis.map(j => j.key);
      return (V4.activityAttendance || []).some(r => keys.includes(r.activityTypeId) && r.tanggal === tanggal);
    }
    function saveReligi() {
      if (!isTeacher() && !isWaliKelas() && !isAdmin() && !isKepsek()) return toast('Hanya Guru, Wali Kelas, Admin & Kepsek!', true);
      if (isBusy('saveReligi')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      const type = document.getElementById('religiType').value, status = document.getElementById('religiStatus').value, today = tglLokal();
      if (!type || !status) return toast('Pilih sholat dan status!', true);
      const namaSholat = type === 'sholat_dluha' ? 'Dluha' : 'Dzuhur';
      // Validasi hari: Dzuhur cuma Senin-Kamis, Dluha semua hari kecuali Minggu (kecuali Admin/Kepsek
      // yang perlu koreksi data lama).
      if (!isAdmin() && !isKepsek() && !v4HariDiizinkanSholat(type, today)) {
        const pesanHari = type === 'sholat_dzuhur' ? 'Absen Sholat Dzuhur hanya berlaku Senin-Kamis!' : 'Hari Minggu madrasah libur, absen religi tidak bisa dicatat!';
        return toast(pesanHari, true);
      }
      // Validasi jendela waktu: cuma bisa dicatat pada rentang jam sholat yang sesuai (kecuali Admin/Kepsek).
      const window_ = getJamReligi(type);
      const now = new Date(), sekarangMenit = now.getHours()*60 + now.getMinutes();
      const mulai = window_.mulai.split(':'), mulaiMenit = parseInt(mulai[0])*60 + parseInt(mulai[1]);
      const selesai = window_.selesai.split(':'), selesaiMenit = parseInt(selesai[0])*60 + parseInt(selesai[1]);
      const isDalamJendela = sekarangMenit >= mulaiMenit && sekarangMenit <= selesaiMenit;
      if (!isDalamJendela && !isAdmin() && !isKepsek()) return toast(`Absen ${namaSholat} hanya bisa dicatat jam ${window_.mulai}-${window_.selesai}!`, true);
      // Wajib: absensi SISWA untuk sholat ini harus sudah diisi dulu di menu Amalan & Kegiatan
      // hari ini, baru guru boleh mencatat absen pribadinya sendiri (dasar Honor).
      const statusAbsenSiswa = v4AbsensiSiswaSholatSudahDiisi(namaSholat, today);
      if (statusAbsenSiswa === null) return toast(`Admin belum membuat jenis kegiatan "Sholat ${namaSholat}" di menu Amalan & Kegiatan!`, true);
      if (statusAbsenSiswa === false) return toast(`Absensi siswa untuk Sholat ${namaSholat} hari ini belum diisi di menu Amalan & Kegiatan. Isi dulu absensi siswanya.`, true);
      const existing = allReligiAttendance.find(item => item.tanggal === today && (item.guruKey ? item.guruKey === currentUser.key : item.guru === currentUser.name));
      const ref = existing ? db.ref('religi_attendance/' + existing.key) : db.ref('religi_attendance').push();
      const data = { tanggal: today, guru: currentUser.name, guruKey: currentUser.key || null, tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() };
      data[type] = { status: status, waktu: new Date().toISOString() };
      if (existing) { const otherType = type === 'sholat_dluha' ? 'sholat_dzuhur' : 'sholat_dluha'; if (existing[otherType]) data[otherType] = existing[otherType]; }
      const btn = document.getElementById('btnSaveReligi');
      setBusy('saveReligi', btn);
      try {
        ref.update(data, err => {
          clearBusy('saveReligi', btn);
          if (err) toast('Gagal: ' + err.message, true);
          else { toast('✅ Absensi religi tersimpan!'); addLog('simpan_religi', type + ' - ' + status); db.ref('religi_attendance').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => { allReligiAttendance = []; snap.forEach(child => { const item = child.val(); item.key = child.key; allReligiAttendance.push(item); }); renderReligi(allReligiAttendance); }); }
        });
      } catch (e) {
        clearBusy('saveReligi', btn);
        toast('Gagal: '+(e && e.message || e), true);
      }
    }

    // ============================================================
    // REKAP
    // ============================================================
    function populateRekapFilters() {
      // FIX: dulu value = nama -- 2 guru bernama sama otomatis "digabung" jadi satu baris rekap
      // (lihat renderRekap: grouped[...] dikunci pakai NAMA). Sekarang value = guruKey (fallback
      // nama untuk guru lama yang belum punya key), label tampilan tetap nama.
      const select = document.getElementById('rekapFilterGuru');
      select.innerHTML = '<option value="">Semua Guru</option>';
      allGuru.forEach(g => { select.innerHTML += `<option value="${escapeHtml(g.key || g.name)}">${escapeHtml(g.name)}</option>`; });
    }
    function renderRekap() {
      if (!currentUser) return; if (!isAdmin() && !isKepsek()) return;
      const filterGuru = document.getElementById('rekapFilterGuru').value, filterKelas = document.getElementById('rekapFilterKelas').value, filterTanggal = document.getElementById('rekapFilterTanggal').value;
      let guruList = allGuru, siswaList = allSiswa, journalList = allJournals, attendanceList = allTeacherAttendance;
      // FIX: dulu filterGuru & pengelompokan rekap sama-sama pakai NAMA guru -- kalau ada 2 guru
      // bernama sama, memilih salah satu di filter menampilkan data GABUNGAN keduanya, dan tanpa
      // filter pun rekap per-guru di bawah menggabung jurnal/absen/siswa keduanya jadi satu baris
      // (grouped dikunci pakai nama). Sekarang dicocokkan & dikelompokkan pakai guruKey (fallback
      // nama untuk guru/records lama yang belum punya guruKey).
      const uidGuru = g => g.key || g.name;
      const uidRec = r => r.guruKey || r.guru;
      // FIX 2: siswaList (wali kelas) cuma simpan NAMA guru, tidak ada guruKey. Kalau langsung
      // dikelompokkan pakai s.guru (nama mentah) sementara jurnal/absen/guru dikelompokkan pakai
      // guruKey, maka guru yang SUDAH punya guruKey akan pecah jadi 2 baris: satu grup key=nama
      // (isinya cuma siswa wali kelas), satu grup key=guruKey (isinya jurnal/absen). Makanya
      // resolve dulu nama -> guruKey lewat allGuru sebelum dipakai sebagai key grup.
      const namaGuruToKeyRekap = {};
      (allGuru || []).forEach(g => { if (g.key) namaGuruToKeyRekap[g.name] = g.key; });
      const uidSiswaGuru = s => namaGuruToKeyRekap[s.guru] || s.guru;
      // Data siswa (wali kelas) cuma menyimpan NAMA guru, tidak ada guruKey sama sekali (beda
      // fitur dari jadwal/jurnal/absensi guru) -- jadi filterGuru (sekarang berisi guruKey) perlu
      // di-resolve balik ke nama supaya pencocokan s.guru tetap jalan. Catatan: ini artinya
      // filter siswa tetap belum bisa membedakan 2 guru kembar sebagai wali kelas -- itu perlu
      // field guruKey baru di data siswa sendiri (di luar cakupan perbaikan jadwal ini).
      const filterGuruNama = filterGuru ? ((allGuru || []).find(g => uidGuru(g) === filterGuru)?.name || filterGuru) : '';
      if (filterGuru) { guruList = guruList.filter(g => uidGuru(g) === filterGuru); siswaList = siswaList.filter(s => s.guru === filterGuruNama); journalList = journalList.filter(j => uidRec(j) === filterGuru); attendanceList = attendanceList.filter(a => uidRec(a) === filterGuru); }
      if (filterKelas) { siswaList = siswaList.filter(s => s.kelas === filterKelas); journalList = journalList.filter(j => j.kelas === filterKelas); attendanceList = attendanceList.filter(a => a.kelas && a.kelas.includes(filterKelas)); }
      if (filterTanggal) { journalList = journalList.filter(j => j.tanggal === filterTanggal); attendanceList = attendanceList.filter(a => a.tanggal === filterTanggal); }
      document.getElementById('rekapTotalGuru').textContent = guruList.length;
      document.getElementById('rekapTotalSiswa').textContent = siswaList.length;
      document.getElementById('rekapTotalJurnal').textContent = journalList.length;
      const today = filterTanggal || tglLokal();
      const hadirToday = allTeacherAttendance.filter(a => a.tanggal === today);
      document.getElementById('rekapGuruHadir').textContent = hadirToday.length;
      const list = document.getElementById('rekapList');
      list.innerHTML = '';
      const grouped = {};
      siswaList.forEach(s => { const uid = uidSiswaGuru(s); if (!grouped[uid]) grouped[uid] = { nama: s.guru, siswa: [], jurnal: [], absen: 0 }; grouped[uid].siswa.push(s); });
      journalList.forEach(j => { const uid = uidRec(j); if (!grouped[uid]) grouped[uid] = { nama: j.guru, siswa: [], jurnal: [], absen: 0 }; grouped[uid].jurnal.push(j); });
      attendanceList.forEach(a => { const uid = uidRec(a); if (grouped[uid]) { grouped[uid].absen = (grouped[uid].absen || 0) + 1; } });
      guruList.forEach(g => { const uid = uidGuru(g); if (!grouped[uid]) grouped[uid] = { nama: g.name, siswa: [], jurnal: [], absen: 0 }; });
      const entries = Object.entries(grouped);
      if (entries.length === 0) { list.innerHTML = '<p class="text-muted">Tidak ada data yang sesuai filter.</p>'; document.getElementById('rekapPagination').innerHTML = ''; return; }
      const totalItems = entries.length, totalPages = Math.ceil(totalItems/PAGE_SIZE);
      if (rekapPage > totalPages) rekapPage = totalPages; if (rekapPage < 1) rekapPage = 1;
      const start = (rekapPage-1)*PAGE_SIZE, end = Math.min(start+PAGE_SIZE, totalItems), pageItems = entries.slice(start,end);
      let html = '';
      for (const [, data] of pageItems) {
        const guruName = data.nama;
        const kelasList = [...new Set(data.siswa.map(s=>s.kelas))].join(', ') || '-';
        html += `<div style="background:white;border-radius:12px;padding:16px;border-left:4px solid #2E7D32;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:start;gap:8px;">
            <div><div class="text-muted" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Guru</div><div style="font-size:18px;font-weight:700;">${escapeHtml(guruName)}</div><div class="text-muted" style="font-size:14px;">Kelas: ${escapeHtml(kelasList)}</div></div>
            <div style="display:flex;gap:16px;font-size:14px;"><div><span style="font-weight:700;">${data.siswa.length}</span> Siswa</div><div><span style="font-weight:700;">${data.jurnal.length}</span> Jurnal</div><div><span style="font-weight:700;">${data.absen || 0}</span> Absen</div></div>
          </div>
          ${data.jurnal.slice(0,3).map(j => `<div class="text-medium" style="font-size:14px;margin-top:4px;">📓 ${escapeHtml(j.tanggal)} - ${escapeHtml(j.subject)}: ${escapeHtml(j.activity.substring(0,50))}${j.activity.length > 50 ? '...' : ''}</div>`).join('')}
          ${data.jurnal.length > 3 ? `<div class="text-muted" style="font-size:12px;margin-top:4px;">+ ${data.jurnal.length - 3} jurnal lainnya</div>` : ''}
        </div>`;
      }
      list.innerHTML = html;
      document.getElementById('rekapPagination').innerHTML = `<button onclick="rekapPage--; renderRekap();" ${rekapPage <= 1 ? 'disabled' : ''}>◀ Prev</button><span class="page-info">${rekapPage} / ${totalPages}</span><button onclick="rekapPage++; renderRekap();" ${rekapPage >= totalPages ? 'disabled' : ''}>Next ▶</button><span class="text-muted" style="font-size:12px;">Total: ${totalItems} guru</span>`;
    }

    // ============================================================
    // REKAP NILAI
    // ============================================================
    function renderRekapNilai() {
      const view = document.getElementById('rekapNilaiView').value, kelas = document.getElementById('rekapNilaiKelas').value, semester = document.getElementById('rekapNilaiSemester').value, siswaKey = document.getElementById('rekapNilaiSiswa').value;
      document.getElementById('rekapNilaiSiswaContainer').style.display = view === 'siswa' ? 'block' : 'none';
      if (view === 'siswa') renderRekapPerSiswa(kelas, semester, siswaKey);
      else renderRekapPerKelas(kelas, semester);
    }
    function renderRekapPerKelas(kelas, semester) {
      const thead = document.getElementById('rekapNilaiHead'), tbody = document.getElementById('rekapNilaiBody'), tfoot = document.getElementById('rekapNilaiFoot'), info = document.getElementById('rekapNilaiInfo');
      const siswa = allSiswa.filter(s => s.kelas === kelas);
      if (siswa.length === 0) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Tidak ada siswa di kelas ${escapeHtml(kelas)}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const grades = allGrades.filter(g => g.kelas === kelas && g.semester === semester);
      const subjects = [...new Set(grades.map(g => g.subject))].sort();
      if (subjects.length === 0) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Belum ada nilai untuk kelas ${escapeHtml(kelas)} semester ${escapeHtml(semester)}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const nilaiMap = {};
      grades.forEach(g => { if (!nilaiMap[g.siswaKey]) nilaiMap[g.siswaKey] = {}; if (g.data) nilaiMap[g.siswaKey][g.subject] = calculateRapor(g.data); });
      rekapNilaiDataCache = { siswa, subjects, nilaiMap, semester, kelas };
      let headerHtml = `<tr><th style="text-align:center;width:30px;">No</th><th style="text-align:left;min-width:120px;">Nama Siswa</th>`;
      subjects.forEach(sub => { headerHtml += `<th style="text-align:center;min-width:60px;">${escapeHtml(sub)}</th>`; });
      headerHtml += `<th style="text-align:center;min-width:70px;">Rata-rata</th></tr>`;
      thead.innerHTML = headerHtml;
      let bodyHtml = '', totalNilaiPerMapel = {}, jumlahSiswa = 0;
      siswa.forEach((s, idx) => {
        const nilai = nilaiMap[s.key] || {}; let totalSiswa = 0, countSiswa = 0; let rowHtml = `<tr class="siswa-row"><td style="text-align:center;">${idx + 1}</td><td style="text-align:left;">${escapeHtml(s.name)}</td>`;
        subjects.forEach(sub => {
          const n = nilai[sub];
          if (n !== undefined && n !== null && n !== '') {
            const num = Number(n); const color = num >= 75 ? 'nilai-hadir' : (num < 60 ? 'nilai-rendah' : '');
            rowHtml += `<td class="${color}">${num}</td>`; totalSiswa += num; countSiswa++;
            if (!totalNilaiPerMapel[sub]) totalNilaiPerMapel[sub] = { total: 0, count: 0 };
            totalNilaiPerMapel[sub].total += num; totalNilaiPerMapel[sub].count += 1;
          } else rowHtml += `<td class="text-muted">-</td>`;
        });
        const rataSiswa = countSiswa > 0 ? (totalSiswa / countSiswa) : 0;
        const colorRata = rataSiswa >= 75 ? 'nilai-hadir' : (rataSiswa < 60 ? 'nilai-rendah' : '');
        rowHtml += `<td class="${colorRata}" style="font-weight:700;">${rataSiswa > 0 ? Math.round(rataSiswa) : '-'}</td></tr>`;
        bodyHtml += rowHtml; jumlahSiswa++;
      });
      tbody.innerHTML = bodyHtml;
      let footHtml = `<tr class="rata-rata-row"><td colspan="2" style="text-align:right;font-weight:700;">Rata-rata Kelas</td>`;
      let totalRataKelas = 0, countRataKelas = 0;
      subjects.forEach(sub => {
        const data = totalNilaiPerMapel[sub];
        if (data && data.count > 0) { const rata = Math.round(data.total / data.count); footHtml += `<td style="font-weight:700;">${rata}</td>`; totalRataKelas += rata; countRataKelas++; }
        else footHtml += `<td class="text-muted">-</td>`;
      });
      const rataKelas = countRataKelas > 0 ? Math.round(totalRataKelas / countRataKelas) : 0;
      footHtml += `<td style="font-weight:700;color:#059669;">${rataKelas > 0 ? rataKelas : '-'}</td></tr>`;
      tfoot.innerHTML = footHtml;
      info.textContent = `📊 ${jumlahSiswa} siswa, ${subjects.length} mata pelajaran | Semester ${semester}`;
    }
    function renderRekapPerSiswa(kelas, semester, siswaKey) {
      const thead = document.getElementById('rekapNilaiHead'), tbody = document.getElementById('rekapNilaiBody'), tfoot = document.getElementById('rekapNilaiFoot'), info = document.getElementById('rekapNilaiInfo');
      const select = document.getElementById('rekapNilaiSiswa');
      const siswaList = allSiswa.filter(s => s.kelas === kelas);
      if (siswaList.length === 0) { select.innerHTML = '<option value="">-- Tidak ada siswa --</option>'; thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Tidak ada siswa di kelas ${escapeHtml(kelas)}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
      siswaList.forEach(s => { select.innerHTML += `<option value="${s.key}" ${s.key === siswaKey ? 'selected' : ''}>${escapeHtml(s.name)}</option>`; });
      if (!siswaKey) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Pilih siswa untuk melihat rekap nilai.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Siswa tidak ditemukan.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      const grades = allGrades.filter(g => g.siswaKey === siswaKey && g.semester === semester);
      if (grades.length === 0) { thead.innerHTML = `<tr><td colspan="10" class="text-muted" style="text-align:center;padding:20px;">Belum ada nilai untuk ${escapeHtml(siswa.name)} semester ${semester}.</td></tr>`; tbody.innerHTML = ''; tfoot.innerHTML = ''; info.textContent = ''; return; }
      thead.innerHTML = `<tr><th style="text-align:center;">No</th><th style="text-align:left;">Mata Pelajaran</th><th style="text-align:center;">NH1</th><th style="text-align:center;">NH2</th><th style="text-align:center;">NH3</th><th style="text-align:center;">MID</th><th style="text-align:center;">PAS</th><th style="text-align:center;font-weight:700;">Rapor</th></tr>`;
      let bodyHtml = '', totalRapor = 0, countRapor = 0;
      grades.forEach((g, idx) => {
        const data = g.data || {}, h1 = data.h1 || '-', h2 = data.h2 || '-', h3 = data.h3 || '-', mid = data.mid || '-', pas = data.pas || '-', rapor = calculateRapor(data);
        const color = rapor >= 75 ? 'nilai-hadir' : (rapor < 60 ? 'nilai-rendah' : '');
        bodyHtml += `<tr class="siswa-row"><td style="text-align:center;">${idx + 1}</td><td style="text-align:left;font-weight:600;">${escapeHtml(g.subject)}</td><td>${h1}</td><td>${h2}</td><td>${h3}</td><td>${mid}</td><td>${pas}</td><td class="${color}" style="font-weight:700;">${rapor}</td></tr>`;
        totalRapor += rapor; countRapor++;
      });
      tbody.innerHTML = bodyHtml;
      const rataSiswa = countRapor > 0 ? Math.round(totalRapor / countRapor) : 0;
      const colorRata = rataSiswa >= 75 ? 'nilai-hadir' : (rataSiswa < 60 ? 'nilai-rendah' : '');
      tfoot.innerHTML = `<tr class="rata-rata-row"><td colspan="7" style="text-align:right;font-weight:700;">Rata-rata Seluruh Mapel</td><td style="font-weight:700;color:#059669;" class="${colorRata}">${rataSiswa}</td></tr>`;
      rekapNilaiDataCache = { siswa, grades, semester, mode: 'siswa' };
      info.textContent = `👤 ${siswa.name} | ${grades.length} mata pelajaran | Semester ${semester}`;
    }
    function populateRekapSiswaDropdown(kelas) {
      const select = document.getElementById('rekapNilaiSiswa');
      const siswaList = allSiswa.filter(s => s.kelas === kelas);
      select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
      siswaList.forEach(s => { select.innerHTML += `<option value="${s.key}">${escapeHtml(s.name)}</option>`; });
    }
    // rekapNilaiDataCache hanya ditulis di jalur render yang SUKSES; jalur early-return (kelas tanpa
    // siswa/nilai, siswa belum dipilih, dst) tidak mengosongkannya. Akibatnya ekspor bisa mengunduh data
    // filter SEBELUMNYA dengan nama file/judul dari filter SAAT INI (mis. data kelas 3A berlabel kelas 4B).
    // Solusi: sebelum ekspor, kosongkan cache lalu render ulang dari allSiswa/allGrades + filter yang
    // sedang dipilih -- cache pasti sinkron dengan filter & data terkini; kalau tidak ada data, tetap kosong.
    function segarkanCacheRekapNilai() {
      rekapNilaiDataCache = {};
      renderRekapNilai();
      return rekapNilaiDataCache;
    }
    // Nama siswa untuk judul/nama file ekspor mode "per siswa" (kosong kalau mode per kelas).
    function rekapNilaiNamaSiswa(view) {
      return (view === 'siswa' && rekapNilaiDataCache && rekapNilaiDataCache.siswa && rekapNilaiDataCache.siswa.name) || '';
    }
    function namaFileAman(teks) {
      return String(teks || '').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '_');
    }
    function exportRekapNilaiPDF() {
      const view = document.getElementById('rekapNilaiView').value, kelas = document.getElementById('rekapNilaiKelas').value, semester = document.getElementById('rekapNilaiSemester').value;
      segarkanCacheRekapNilai();
      const namaSiswa = rekapNilaiNamaSiswa(view);
      const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(18); doc.text('REKAP NILAI', pageWidth/2, 20, { align: 'center' });
      doc.setFontSize(14); doc.text(namaSiswa ? `${namaSiswa} - Kelas ${kelas} - Semester ${semester}` : `Kelas ${kelas} - Semester ${semester}`, pageWidth/2, 30, { align: 'center' });
      doc.setFontSize(10); doc.text(`Dicetak: ${new Date().toLocaleString()}`, pageWidth - 20, 38, { align: 'right' });
      doc.line(20, 42, pageWidth - 20, 42);
      let rows = [], head = [];
      if (view === 'kelas') {
        const data = rekapNilaiDataCache; if (!data || !data.subjects) return toast('Tidak ada data untuk diekspor.', true);
        head = ['No', 'Nama Siswa', ...data.subjects, 'Rata-rata'];
        data.siswa.forEach((s, idx) => {
          const nilai = data.nilaiMap[s.key] || {}; const row = [idx+1, s.name]; let total = 0, count = 0;
          data.subjects.forEach(sub => { const n = nilai[sub]; if (n !== undefined && n !== null && n !== '') { row.push(Number(n)); total += Number(n); count++; } else row.push('-'); });
          const rata = count > 0 ? Math.round(total / count) : '-'; row.push(rata); rows.push(row);
        });
        if (rows.length > 0) {
          const footer = ['', 'Rata-rata Kelas']; let totalRata = 0, countRata = 0;
          data.subjects.forEach(sub => { let sum = 0, cnt = 0; data.siswa.forEach(s => { const n = data.nilaiMap[s.key]?.[sub]; if (n !== undefined && n !== null && n !== '') { sum += Number(n); cnt++; } }); const rata = cnt > 0 ? Math.round(sum / cnt) : '-'; footer.push(rata); if (rata !== '-') { totalRata += rata; countRata++; } });
          const rataKelas = countRata > 0 ? Math.round(totalRata / countRata) : '-'; footer.push(rataKelas); rows.push(footer);
        }
      } else {
        const data = rekapNilaiDataCache; if (!data || !data.grades) return toast('Tidak ada data untuk diekspor.', true);
        head = ['No', 'Mata Pelajaran', 'NH1', 'NH2', 'NH3', 'MID', 'PAS', 'Rapor'];
        data.grades.forEach((g, idx) => { const d = g.data || {}; rows.push([idx+1, g.subject, d.h1 || '-', d.h2 || '-', d.h3 || '-', d.mid || '-', d.pas || '-', calculateRapor(d)]); });
      }
      if (rows.length === 0) return toast('Tidak ada data untuk diekspor.', true);
      doc.autoTable({ startY: 48, head: [head], body: rows, theme: 'striped', styles: { fontSize: 9 }, headStyles: { fillColor: [37,99,235], textColor: [255,255,255], fontSize: 10, fontStyle: 'bold' }, didParseCell: function(data) { if (data.section === 'body' && data.column.index > 1 && typeof data.cell.raw === 'number') { if (data.cell.raw < 60) data.cell.styles.textColor = [220,38,38]; else if (data.cell.raw >= 75) data.cell.styles.textColor = [5,150,105]; } if (data.section === 'body' && data.row.index === rows.length - 1 && data.cell.raw === 'Rata-rata Kelas') { data.cell.styles.fillColor = [254,243,199]; data.cell.styles.fontStyle = 'bold'; } }, margin: { left: 15, right: 15 } });
      doc.save(namaSiswa ? `Rekap_Nilai_${namaFileAman(namaSiswa)}_${kelas}_${semester}.pdf` : `Rekap_Nilai_${kelas}_${semester}.pdf`);
      toast('📥 Rekap nilai berhasil diunduh!'); addLog('export_rekap_nilai', namaSiswa ? `${namaSiswa} - ${kelas} - ${semester}` : `${kelas} - ${semester}`);
    }
    function exportRekapNilaiExcel() {
      const view = document.getElementById('rekapNilaiView').value, kelas = document.getElementById('rekapNilaiKelas').value, semester = document.getElementById('rekapNilaiSemester').value;
      segarkanCacheRekapNilai();
      const namaSiswa = rekapNilaiNamaSiswa(view);
      if (typeof XLSX === 'undefined') { toast('⚠️ Library Excel belum dimuat. Coba refresh.', true); return; }
      let data = [], headers = [];
      if (view === 'kelas') {
        const d = rekapNilaiDataCache; if (!d || !d.subjects) return toast('Tidak ada data untuk diekspor.', true);
        headers = ['No', 'Nama Siswa', ...d.subjects, 'Rata-rata']; data.push(headers);
        d.siswa.forEach((s, idx) => {
          const nilai = d.nilaiMap[s.key] || {}; const row = [idx+1, s.name]; let total = 0, count = 0;
          d.subjects.forEach(sub => { const n = nilai[sub]; if (n !== undefined && n !== null && n !== '') { row.push(Number(n)); total += Number(n); count++; } else row.push('-'); });
          const rata = count > 0 ? Math.round(total / count) : '-'; row.push(rata); data.push(row);
        });
        if (data.length > 1) {
          const footer = ['', 'Rata-rata Kelas']; d.subjects.forEach(sub => { let sum = 0, cnt = 0; d.siswa.forEach(s => { const n = d.nilaiMap[s.key]?.[sub]; if (n !== undefined && n !== null && n !== '') { sum += Number(n); cnt++; } }); footer.push(cnt > 0 ? Math.round(sum / cnt) : '-'); }); let totalRata = 0, countRata = 0; d.subjects.forEach((sub, i) => { const val = footer[i+2]; if (val !== '-') { totalRata += val; countRata++; } }); footer.push(countRata > 0 ? Math.round(totalRata / countRata) : '-'); data.push(footer);
        }
      } else {
        const d = rekapNilaiDataCache; if (!d || !d.grades) return toast('Tidak ada data untuk diekspor.', true);
        headers = ['No', 'Mata Pelajaran', 'NH1', 'NH2', 'NH3', 'MID', 'PAS', 'Rapor']; data.push(headers);
        d.grades.forEach((g, idx) => { const dg = g.data || {}; data.push([idx+1, g.subject, dg.h1 || '-', dg.h2 || '-', dg.h3 || '-', dg.mid || '-', dg.pas || '-', calculateRapor(dg)]); });
      }
      const wb = XLSX.utils.book_new();
      const colWidths = []; data[0].forEach((_, i) => { let maxLen = 10; data.forEach(row => { if (row[i] !== undefined && row[i] !== null) { const len = String(row[i]).length; if (len > maxLen) maxLen = len; } }); colWidths.push({ wch: Math.min(maxLen + 3, 30) }); });
      // Mode per siswa: baris identitas di atas tabel (lebar kolom dihitung SEBELUM baris ini ditambah, supaya kolom "No" tidak melebar).
      if (namaSiswa) data.unshift(['Nama Siswa', namaSiswa], ['Kelas', kelas], ['Semester', semester], []);
      const ws = XLSX.utils.aoa_to_sheet(data); ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
      XLSX.writeFile(wb, namaSiswa ? `Rekap_Nilai_${namaFileAman(namaSiswa)}_${kelas}_${semester}.xlsx` : `Rekap_Nilai_${kelas}_${semester}.xlsx`);
      toast('📊 Rekap nilai berhasil diunduh!'); addLog('export_rekap_nilai_excel', namaSiswa ? `${namaSiswa} - ${kelas} - ${semester}` : `${kelas} - ${semester}`);
    }

    // ============================================================
    // HONOR
    // ============================================================
    // ============================================================
    // RATE EKSTRAKURIKULER PER KEGIATAN
    // ============================================================
    const RATE_EKSTRA_DEFAULT = 20000;
    function namaKegiatanKey(nama) { return nama.trim().toLowerCase().replace(/[.#$\[\]\/]/g, '_'); }
    function getEkstraRate(namaKegiatan) {
      if (!namaKegiatan) return RATE_EKSTRA_DEFAULT;
      const key = namaKegiatanKey(namaKegiatan);
      return (ekskulRates[key] !== undefined) ? ekskulRates[key].rate : RATE_EKSTRA_DEFAULT;
    }
    function renderEkskulRateList() {
      const container = document.getElementById('ekskulRateList');
      if (!container) return;
      const namaDariJurnal = new Set(allJournals.filter(j => isJamEkstra(j.jam_ke) && j.subject).map(j => j.subject));
      Object.values(ekskulRates).forEach(r => { if (r.nama) namaDariJurnal.add(r.nama); });
      if (namaDariJurnal.size === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada kegiatan ekstrakurikuler tercatat.</p>'; return; }
      let html = '';
      [...namaDariJurnal].sort().forEach(nama => {
        const key = namaKegiatanKey(nama);
        const rate = ekskulRates[key] ? ekskulRates[key].rate : RATE_EKSTRA_DEFAULT;
        const isDefault = !ekskulRates[key];
        html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="flex:1;min-width:120px;font-weight:600;font-size:13px;">${escapeHtml(nama)} ${isDefault ? '<span class="text-muted" style="font-size:11px;font-weight:400;">(default)</span>' : ''}</span>
          <input type="number" class="field" style="width:130px;padding:4px 8px;" id="ekskulRateInput_${escapeHtml(key)}" value="${rate}" min="0" step="1000">
          <button class="btn btn-success" style="padding:4px 12px;font-size:12px;" onclick="simpanEkskulRate('${escapeJs(nama)}')">💾</button>
          ${!isDefault ? `<button class="btn btn-danger" style="padding:4px 12px;font-size:12px;" onclick="hapusEkskulRate('${escapeJs(nama)}')">🗑️</button>` : ''}
        </div>`;
      });
      container.innerHTML = html;
    }
    function simpanEkskulRate(nama) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const key = namaKegiatanKey(nama);
      const input = document.getElementById('ekskulRateInput_' + key);
      const rate = parseInt(input.value) || 0;
      if (rate < 0) return toast('Rate tidak valid!', true);
      db.ref('ekskul_rates/' + key).set({ nama, rate, tahunAjaran: currentTahunAjaran, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`✅ Rate "${nama}" diperbarui ke Rp ${rate.toLocaleString()}/jam!`); addLog('ubah_rate_ekskul', nama + ': Rp ' + rate);
        reloadDataset('ekskulRates', () => renderHonor());
      });
    }
    function hapusEkskulRate(nama) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const key = namaKegiatanKey(nama);
      if (!confirm(`Kembalikan "${nama}" ke rate default (Rp ${RATE_EKSTRA_DEFAULT.toLocaleString()}/jam)?`)) return;
      db.ref('ekskul_rates/' + key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Rate dikembalikan ke default.'); addLog('hapus_rate_ekskul', nama); reloadDataset('ekskulRates', () => renderHonor());
      });
    }
    function tambahEkskulRate() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const nama = document.getElementById('ekskulRateNamaBaru').value.trim();
      const rate = parseInt(document.getElementById('ekskulRateNilaiBaru').value) || 0;
      if (!nama) return toast('Isi nama kegiatan!', true);
      if (rate <= 0) return toast('Isi rate lebih dari 0!', true);
      const key = namaKegiatanKey(nama);
      db.ref('ekskul_rates/' + key).set({ nama, rate, tahunAjaran: currentTahunAjaran, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`✅ Kegiatan "${nama}" ditambahkan dengan rate Rp ${rate.toLocaleString()}/jam!`); addLog('tambah_rate_ekskul', nama);
        document.getElementById('ekskulRateNamaBaru').value = ''; document.getElementById('ekskulRateNilaiBaru').value = '';
        reloadDataset('ekskulRates', () => renderHonor());
      });
    }

    // ============================================================
    // GURU TERAJIN (ranking kedisiplinan otomatis + honor fleksibel)
    // ============================================================
    let allGuruTerajin = {};
    function hitungRankingKedisiplinan(month, year) {
      const monthStr = String(month).padStart(2,'0');
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      const winDatang = getJamAbsenWindow('Datang');
      const toMenit = (str) => { const p = str.split(':'); return parseInt(p[0])*60 + parseInt(p[1]); };
      const datangMulai = toMenit(winDatang.mulai), datangSelesai = toMenit(winDatang.selesai);
      const todayStr = tglLokal();
      const recsBulanIni = allTeacherAttendance.filter(a => { if (!a.tanggal) return false; const parts = a.tanggal.split('-'); return parts[0] === String(year) && parts[1] === monthStr; });
      const ranking = guruAktif.map(g => {
        const recs = recsBulanIni.filter(a => (a.guruKey ? a.guruKey === g.key : a.guru === g.name));
        let datangTepat = 0, alpha = 0, hadirHari = 0;
        recs.forEach(a => {
          if (a.type === 'Alpha') alpha++;
          if (a.type === 'Datang' && a.waktu) {
            const t = new Date(a.waktu), menit = t.getHours()*60 + t.getMinutes();
            if (menit >= datangMulai && menit <= datangSelesai) datangTepat++;
          }
        });
        hadirHari = new Set(recs.filter(a => a.type === 'Datang').map(a => a.tanggal)).size;
        // Hari-hari guru ini sudah Absen Datang tapi TIDAK PERNAH Absen Pulang di tanggal yang
        // sama -- dikecualikan hari INI (todayStr), karena guru yang absen ranking sedang dihitung
        // hari ini mungkin memang belum waktunya pulang, bukan berarti dia lalai.
        let tanpaPulang = 0;
        new Set(recs.filter(a => a.type === 'Datang').map(a => a.tanggal)).forEach(tgl => {
          if (tgl === todayStr) return;
          const sudahPulang = recs.some(a => a.type === 'Pulang' && a.tanggal === tgl);
          if (!sudahPulang) tanpaPulang++;
        });
        const skor = (datangTepat * 2) - (alpha * 5) - (tanpaPulang * 2);
        return { guru: g.name, datangTepat, alpha, hadirHari, tanpaPulang, skor };
      }).filter(r => r.hadirHari > 0 || r.alpha > 0);
      ranking.sort((a,b) => b.skor - a.skor);
      return ranking;
    }
    function renderGuruTerajinRanking() {
      const month = document.getElementById('honorMonth').value, year = document.getElementById('honorYear').value;
      const container = document.getElementById('guruTerajinRanking');
      const ranking = hitungRankingKedisiplinan(month, year);
      const key = year + '-' + String(month).padStart(2,'0');
      const sudahDitetapkan = allGuruTerajin[key];
      if (ranking.length === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada data absen guru bulan ini.</p>'; document.getElementById('guruTerajinSetForm').style.display = 'none'; document.getElementById('guruTerajinSudahDitetapkan').style.display = 'none'; return; }
      let html = '<div style="overflow-x:auto;"><table style="font-size:12px;"><thead><tr><th>Rank</th><th>Nama</th><th>Datang Tepat Waktu</th><th>Alpha</th><th>Tanpa Pulang</th><th>Skor</th></tr></thead><tbody>';
      ranking.slice(0,5).forEach((r, idx) => {
        const medali = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx+1);
        html += `<tr ${idx===0 ? 'style="background:#fef3c7;font-weight:600;"' : ''}><td>${medali}</td><td>${escapeHtml(r.guru)}</td><td>${r.datangTepat}x</td><td>${r.alpha}x</td><td>${r.tanpaPulang}x</td><td>${r.skor}</td></tr>`;
      });
      html += '</tbody></table></div>';
      container.innerHTML = html;
      if (!isAdmin()) { document.getElementById('guruTerajinSetForm').style.display = 'none'; }
      else {
        const setForm = document.getElementById('guruTerajinSetForm');
        setForm.style.display = 'block';
        const select = document.getElementById('guruTerajinPilih');
        select.innerHTML = ranking.map(r => `<option value="${escapeHtml(r.guru)}">${escapeHtml(r.guru)} (Skor: ${r.skor})</option>`).join('');
      }
      const doneBox = document.getElementById('guruTerajinSudahDitetapkan');
      if (sudahDitetapkan) {
        doneBox.style.display = 'block';
        doneBox.innerHTML = `✅ <strong>${escapeHtml(sudahDitetapkan.guru)}</strong> ditetapkan sebagai Guru Terajin bulan ini — Honor: Rp ${(sudahDitetapkan.honor||0).toLocaleString()} <span style="font-size:11px;color:#065f46;">(oleh ${escapeHtml(sudahDitetapkan.ditetapkanOleh||'-')})</span>`;
      } else { doneBox.style.display = 'none'; }
    }
    function tetapkanGuruTerajin() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const month = document.getElementById('honorMonth').value, year = document.getElementById('honorYear').value;
      const guru = document.getElementById('guruTerajinPilih').value;
      const honor = parseInt(document.getElementById('guruTerajinHonor').value) || 0;
      if (!guru) return toast('Pilih guru terlebih dahulu!', true);
      if (honor <= 0) return toast('Isi honor terlebih dahulu!', true);
      const key = year + '-' + String(month).padStart(2,'0');
      db.ref('guru_terajin/' + key).set({ guru, honor, tahunAjaran: currentTahunAjaran, ditetapkanOleh: currentUser.name, ditetapkanAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`🏆 ${guru} ditetapkan sebagai Guru Terajin!`); addLog('tetapkan_guru_terajin', guru + ' - ' + key);
        document.getElementById('guruTerajinHonor').value = '';
        reloadDataset('guruTerajin', () => renderHonor());
      });
    }
    // -------- Honor: rate & rumus terpusat --------
    // SATU sumber kebenaran untuk rate & rumus honor, dipakai bersama oleh renderHonor,
    // renderHonorSlip, downloadHonorPDF, dan generateHonorReport (sebelumnya rumus yang sama
    // di-copy-paste 4x -- risiko salah satu kelewat kalau nanti rumus/rate berubah).
    const V4_TARIF_DEFAULT = { original: 7000, substitute: 5000, activity: 0, dluha: 5000, dzuhur: 5000 };
    // Menormalkan isi honor_rates_v4: nilai harus angka hingga (>0; khusus `activity` boleh 0). Yang tidak valid
    // (0, kosong, teks, NEGATIF) diganti tarif default -- dulu 0 diam-diam jatuh ke default lewat `||`, tapi
    // nilai NEGATIF lolos & memotong honor. `rusak` = field yang ADA di database tapi tidak valid (field yang
    // memang belum pernah disimpan bukan "rusak", cukup memakai default).
    function v4NormalisasiRates(raw) {
      const src = raw && typeof raw === 'object' ? raw : {}, rates = {}, rusak = [];
      Object.keys(V4_TARIF_DEFAULT).forEach(k => {
        const v = src[k];
        let n = NaN;
        if (typeof v === 'number') n = v; else if (typeof v === 'string' && v.trim() !== '') n = Number(v);
        const valid = isFinite(n) && (k === 'activity' ? n >= 0 : n > 0);
        if (valid) rates[k] = n;
        else { rates[k] = V4_TARIF_DEFAULT[k]; if (v !== undefined && v !== null) rusak.push(k); }
      });
      if (src.updatedBy !== undefined) rates.updatedBy = src.updatedBy;
      if (src.updatedAt !== undefined) rates.updatedAt = src.updatedAt;
      return { rates, rusak };
    }
    // Perbaikan sekali per sesi (hanya Admin): tulis balik tarif yang efektif dipakai ke database, supaya isi
    // database = perilaku hitung honor & form Pengaturan Tarif. Tidak mengubah nominal yang valid.
    let v4TarifDiperbaikiSesiIni = false;
    function v4PerbaikiTarifRusak(rusak, ratesValid, rawLama) {
      if (v4TarifDiperbaikiSesiIni || !isAdmin() || !rusak.length) return;
      v4TarifDiperbaikiSesiIni = true;
      const patch = { perbaikanTarifAt: new Date().toISOString() }, lama = {};
      rusak.forEach(k => { patch[k] = ratesValid[k]; lama[k] = rawLama[k]; });
      db.ref('honor_rates_v4').update(patch).then(() => {
        v4Audit('REPAIR_HONOR_RATES', 'HONOR_RATE', 'global', lama, patch);
        toast(`⚠️ Tarif honor tidak valid di database (${rusak.join(', ')}) dipulihkan ke tarif yang berlaku. Periksa di Pengaturan Tarif.`, true, 7000);
      }).catch(err => console.warn('[SI MAMBA] Gagal memperbaiki tarif honor:', err && err.message || err));
    }
    function v4GetHonorRates(){
      const r = v4NormalisasiRates(V4.rates).rates;
      return { reguler: r.original, nonReguler: r.substitute, dluha: r.dluha, dzuhur: r.dzuhur };
    }
    // b = breakdown honor satu guru: {reguler, nonReguler, ekstraHonor, dluha, dzuhur, eventHonor,
    // ujianHonor, tunjangan, transport} -- field yang tidak diisi dianggap 0. rates opsional,
    // default ambil dari v4GetHonorRates() (tarif yang diatur Admin di halaman Honor).
    function v4HitungHonor(b, rates){
      rates = rates || v4GetHonorRates();
      const reguler=b.reguler||0, nonReguler=b.nonReguler||0, ekstraHonor=b.ekstraHonor||0,
            dluha=b.dluha||0, dzuhur=b.dzuhur||0, eventHonor=b.eventHonor||0, ujianHonor=b.ujianHonor||0,
            tunjangan=b.tunjangan||0, transport=b.transport||0;
      return reguler*rates.reguler + nonReguler*rates.nonReguler + ekstraHonor + dluha*rates.dluha + dzuhur*rates.dzuhur + eventHonor + ujianHonor + tunjangan + transport;
    }
    function renderHonor() {
      renderEkskulRateList();
      renderGuruTerajinRanking();
      const month = document.getElementById('honorMonth').value.padStart(2,'0'), year = document.getElementById('honorYear').value;
      const container = document.getElementById('honorResult'), btnPdf = document.getElementById('btnDownloadHonorPDF'), paginationEl = document.getElementById('honorPagination');
      const filteredJournals = allJournals.filter(j => { if (!j.tanggal) return false; const parts = j.tanggal.split('-'); return parts[0] === year && parts[1] === month && j.tahunAjaran === currentTahunAjaran; }).filter(j => j.status !== 'ditolak');
      const filteredReligi = allReligiAttendance.filter(r => { if (!r.tanggal) return false; const parts = r.tanggal.split('-'); return parts[0] === year && parts[1] === month && r.tahunAjaran === currentTahunAjaran; });
      const filteredEvents = allEventAttendance.filter(e => { if (!e.tanggal) return false; const parts = e.tanggal.split('-'); return parts[0] === year && parts[1] === month && e.tahunAjaran === currentTahunAjaran; });
      const filteredUjian = allUjianAttendance.filter(u => { if (!u.tanggal) return false; const parts = u.tanggal.split('-'); return parts[0] === year && parts[1] === month && u.tahunAjaran === currentTahunAjaran; });
      const filteredEkskulPic = allEkskulPicHonor.filter(x => { if (!x.tanggal) return false; const parts = x.tanggal.split('-'); return parts[0] === year && parts[1] === month && x.tahunAjaran === currentTahunAjaran; });
      const guruAktifTunjangan = (allGuru || []).filter(g => (g.role === 'guru' || g.role === 'wali_kelas') && ((g.tunjanganMasaKerja||0) > 0 || (g.bantuanTransportasi||0) > 0));
      const guruTerajinKey = year + '-' + month;
      const guruTerajinBulanIni = allGuruTerajin[guruTerajinKey];
      if (filteredJournals.length === 0 && filteredReligi.length === 0 && filteredEvents.length === 0 && filteredUjian.length === 0 && guruAktifTunjangan.length === 0 && !guruTerajinBulanIni) { container.innerHTML = '<p class="text-muted">Tidak ada data jurnal, religi, lembur/rapat, ujian, atau tunjangan untuk bulan ini.</p>'; btnPdf.style.display = 'none'; paginationEl.innerHTML = ''; return; }
      // ===== PENGELOMPOKAN PER GURU =====
      // Dikelompokkan pakai guruKey (Firebase key guru, unik per akun) sebagai key utama, BUKAN
      // nama guru -- dua guru dengan nama persis sama tidak akan tergabung jadi satu baris. Nama
      // guru tetap disimpan di tiap grup HANYA untuk ditampilkan. Fallback ke nama guru dipertahankan
      // untuk record lama yang mungkin belum punya guruKey, supaya tidak "hilang" dari rekap honor.
      // PENTING: semua sumber (jurnal/religi/event/ujian/ekskul PIC) HARUS resolve guruKey lewat
      // helper yang SAMA (bukan `x.guruKey || x.guru` sendiri-sendiri per sumber) -- kalau tidak,
      // guru yang sebagian recordnya sudah punya guruKey dan sebagian belum akan pecah jadi 2 baris
      // (satu di key=guruKey, satu di key=nama) dengan rincian honor berbeda-beda. Helper ini: pakai
      // guruKey kalau ada, kalau
      // tidak coba cari guruKey lewat nama via allGuru (guru itu sendiri PASTI unik by key),
      // baru fallback ke nama mentah kalau memang tidak ketemu guru manapun dgn nama itu.
      const namaGuruToKeyHonor = {};
      (allGuru || []).forEach(g => { if (g.key) namaGuruToKeyHonor[g.name] = g.key; });
      const resolveGuruKey = (guruKey, namaGuru) => guruKey || namaGuruToKeyHonor[namaGuru] || namaGuru;
      const groupedJurnal = {};
      filteredJournals.forEach(j => { const gk = resolveGuruKey(j.guruKey, j.guru); if (!groupedJurnal[gk]) groupedJurnal[gk] = { nama: j.guru, reguler: 0, nonReguler: 0, ekstra: 0, ekstraHonor: 0 }; if (isJamEkstra(j.jam_ke)) { groupedJurnal[gk].ekstra += 1; groupedJurnal[gk].ekstraHonor += getEkstraRate(j.subject); } else if (j.type === 'Non-Reguler') groupedJurnal[gk].nonReguler += 1; else groupedJurnal[gk].reguler += 1; });
      const groupedReligi = {};
      filteredReligi.forEach(r => { const gk = resolveGuruKey(r.guruKey, r.guru); if (!groupedReligi[gk]) groupedReligi[gk] = { nama: r.guru, dluha: 0, dzuhur: 0 }; if (r.sholat_dluha && r.sholat_dluha.status === 'Hadir') groupedReligi[gk].dluha += 1; if (r.sholat_dzuhur && r.sholat_dzuhur.status === 'Hadir') groupedReligi[gk].dzuhur += 1; });
      const groupedEvents = {};
      filteredEvents.forEach(e => { const gk = resolveGuruKey(e.guruKey, e.guru); if (!groupedEvents[gk]) groupedEvents[gk] = { nama: e.guru, jumlah: 0, honor: 0 }; groupedEvents[gk].jumlah += 1; groupedEvents[gk].honor += (e.honor || 0); });
      const groupedUjian = {};
      filteredUjian.forEach(u => { const gk = resolveGuruKey(u.guruKey, u.guru); if (!groupedUjian[gk]) groupedUjian[gk] = { nama: u.guru, jumlah: 0, honor: 0 }; groupedUjian[gk].jumlah += 1; groupedUjian[gk].honor += (u.honor || 0); });
      const groupedEkskulPic = {};
      filteredEkskulPic.forEach(x => { const gk = resolveGuruKey(x.guruKey, x.guru); if (!groupedEkskulPic[gk]) groupedEkskulPic[gk] = { nama: x.guru, jumlah: 0, honor: 0 }; groupedEkskulPic[gk].jumlah += 1; groupedEkskulPic[gk].honor += (x.honor || 0); });
      const rates = v4GetHonorRates(), HONOR_KEPSEK = 300000, HONOR_KETUA_YAYASAN = 350000;
      const allTeacherKeys = new Set([...Object.keys(groupedJurnal), ...Object.keys(groupedReligi), ...Object.keys(groupedEvents), ...Object.keys(groupedUjian), ...Object.keys(groupedEkskulPic), ...guruAktifTunjangan.map(g => g.key || g.name)]);
      let bonusList = []; bonusList.push({ label: 'Kepala Madrasah', amount: HONOR_KEPSEK }); bonusList.push({ label: 'Ketua Yayasan', amount: HONOR_KETUA_YAYASAN });
      if (guruTerajinBulanIni) bonusList.push({ label: `🏆 Guru Terajin - ${guruTerajinBulanIni.guru}`, amount: guruTerajinBulanIni.honor });
      // Kepala Madrasah & Ketua Yayasan (2 item pertama bonusList) SENGAJA ditaruh di baris paling
      // atas tabel honor (bukan lagi di bawah) -- Guru Terajin (kalau ada) tetap di bawah bersama
      // baris guru lain, karena itu memang penghargaan tambahan atas honor mengajar biasa mereka.
      let tableData = []; let totalHonor = 0; let totalReguler = 0, totalNonReguler = 0, totalEkstra = 0, totalEkstraHonor = 0, totalDluha = 0, totalDzuhur = 0, totalEventJumlah = 0, totalEventHonor = 0, totalUjianJumlah = 0, totalUjianHonor = 0, totalTunjangan = 0, totalTransport = 0;
      const pimpinanList = bonusList.slice(0, 2), bonusLainnya = bonusList.slice(2);
      pimpinanList.forEach(bonus => { tableData.push({ guru: bonus.label, reguler: '-', nonReguler: '-', ekstra: '-', ekstraHonor: 0, dluha: '-', dzuhur: '-', eventJumlah: '-', eventHonor: 0, ujianJumlah: '-', ujianHonor: 0, tunjangan: 0, transport: 0, honor: bonus.amount, isBonus: true }); totalHonor += bonus.amount; });
      for (const guruKey of allTeacherKeys) {
        const j = groupedJurnal[guruKey] || { reguler: 0, nonReguler: 0, ekstra: 0, ekstraHonor: 0 }, r = groupedReligi[guruKey] || { dluha: 0, dzuhur: 0 }, ev = groupedEvents[guruKey] || { jumlah: 0, honor: 0 }, uj = groupedUjian[guruKey] || { jumlah: 0, honor: 0 }, ekpic = groupedEkskulPic[guruKey] || { jumlah: 0, honor: 0 };
        // guruObj dicari lewat key dulu (akurat), fallback cari lewat nama untuk kompatibilitas
        // data lama yang cuma punya guru (nama) sebagai identitas grup.
        const guruObj = allGuru.find(g => g.key === guruKey) || allGuru.find(g => g.name === guruKey);
        const guru = j.nama || r.nama || ev.nama || uj.nama || ekpic.nama || (guruObj && guruObj.name) || guruKey;
        const tunjangan = (guruObj && guruObj.tunjanganMasaKerja) || 0, transport = (guruObj && guruObj.bantuanTransportasi) || 0;
        // ekstraHonor = jurnal "Ekstra" manual + kredit otomatis PIC/pengganti ekskul (lihat
        // v4SaveEkskulAttendance) -- disatukan supaya PIC/pengganti tidak perlu isi jurnal lagi.
        // totalEkstra (JUMLAH JAM) sengaja TIDAK ikut ditambah ekpic.jumlah, supaya rekap jam
        // mengajar tetap murni dari jurnal, tidak tercampur jumlah sesi ekskul.
        const honor = v4HitungHonor({ reguler: j.reguler, nonReguler: j.nonReguler, ekstraHonor: j.ekstraHonor + ekpic.honor, dluha: r.dluha, dzuhur: r.dzuhur, eventHonor: ev.honor, ujianHonor: uj.honor, tunjangan, transport }, rates);
        totalHonor += honor; totalReguler += j.reguler; totalNonReguler += j.nonReguler; totalEkstra += j.ekstra; totalEkstraHonor += j.ekstraHonor + ekpic.honor; totalDluha += r.dluha; totalDzuhur += r.dzuhur; totalEventJumlah += ev.jumlah; totalEventHonor += ev.honor; totalUjianJumlah += uj.jumlah; totalUjianHonor += uj.honor; totalTunjangan += tunjangan; totalTransport += transport;
        // FIX: sebelumnya ekstraHonor di sini cuma j.ekstraHonor (murni jurnal), padahal
        // `honor` & totalEkstraHonor di atas sudah +ekpic.honor (kredit PIC/pengganti ekskul).
        // Sel "Ekstra" jadi tampil lebih kecil dari yang benar-benar dijumlah ke Total Honor
        // baris ini maupun ke footer TOTAL -- bikin bingung saat audit manual. Disamakan di sini.
        tableData.push({ guru, reguler: j.reguler, nonReguler: j.nonReguler, ekstra: j.ekstra, ekstraHonor: j.ekstraHonor + ekpic.honor, dluha: r.dluha, dzuhur: r.dzuhur, eventJumlah: ev.jumlah, eventHonor: ev.honor, ujianJumlah: uj.jumlah, ujianHonor: uj.honor, tunjangan, transport, honor });
      }
      bonusLainnya.forEach(bonus => { tableData.push({ guru: bonus.label, reguler: '-', nonReguler: '-', ekstra: '-', ekstraHonor: 0, dluha: '-', dzuhur: '-', eventJumlah: '-', eventHonor: 0, ujianJumlah: '-', ujianHonor: 0, tunjangan: 0, transport: 0, honor: bonus.amount, isBonus: true }); totalHonor += bonus.amount; });
      const totalItems = tableData.length, totalPages = Math.ceil(totalItems / PAGE_SIZE);
      if (honorPage > totalPages) honorPage = totalPages; if (honorPage < 1) honorPage = 1;
      const start = (honorPage - 1) * PAGE_SIZE, end = Math.min(start + PAGE_SIZE, totalItems), pageItems = tableData.slice(start, end);
      let html = `<div style="overflow-x:auto;"><table><thead><tr><th>No</th><th>Nama Guru</th><th>Reguler</th><th>Non-Reguler</th><th>Ekstra</th><th>☀️ Dluha</th><th>🕌 Dzuhur</th><th>⏰ Lembur/Rapat</th><th>📝 Ujian</th><th>💰 Tunjangan</th><th>🛵 Transport</th><th>Total Honor</th></tr></thead><tbody>`;
      let no = start + 1;
      for (const item of pageItems) {
        const isBonus = item.isBonus || false, bgStyle = isBonus ? 'style="background:#fef3c7;font-weight:600;"' : '';
        const eventCell = isBonus ? '-' : `${item.eventJumlah}x (Rp ${item.eventHonor.toLocaleString()})`;
        const ujianCell = isBonus ? '-' : `${item.ujianJumlah}x (Rp ${item.ujianHonor.toLocaleString()})`;
        const tunjanganCell = isBonus ? '-' : `Rp ${item.tunjangan.toLocaleString()}`;
        const transportCell = isBonus ? '-' : `Rp ${item.transport.toLocaleString()}`;
        const ekstraCell = isBonus ? '-' : `${item.ekstra}x (Rp ${item.ekstraHonor.toLocaleString()})`;
        html += `<tr ${bgStyle}><td>${no++}</td><td>${escapeHtml(item.guru)}</td><td>${item.reguler}</td><td>${item.nonReguler}</td><td>${ekstraCell}</td><td>${item.dluha}</td><td>${item.dzuhur}</td><td>${eventCell}</td><td>${ujianCell}</td><td>${tunjanganCell}</td><td>${transportCell}</td><td>Rp ${item.honor.toLocaleString()}</td></tr>`;
      }
      html += `</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th colspan="2" style="text-align:right;">TOTAL</th><th>${totalReguler}</th><th>${totalNonReguler}</th><th>${totalEkstra}x (Rp ${totalEkstraHonor.toLocaleString()})</th><th>${totalDluha}</th><th>${totalDzuhur}</th><th>${totalEventJumlah}x (Rp ${totalEventHonor.toLocaleString()})</th><th>${totalUjianJumlah}x (Rp ${totalUjianHonor.toLocaleString()})</th><th>Rp ${totalTunjangan.toLocaleString()}</th><th>Rp ${totalTransport.toLocaleString()}</th><th style="color:#059669;">Rp ${totalHonor.toLocaleString()}</th></tr></tfoot></table></div>`;
      const mewakiliList = filteredJournals.filter(j => j.type === 'Non-Reguler' && j.mewakili).sort((a,b) => COLLATOR_ID.compare((a.tanggal||''), b.tanggal||''));
      if (mewakiliList.length > 0) {
        html += `<details style="margin-top:16px;background:#eff6ff;border-radius:12px;padding:12px;border:1px solid #93c5fd;"><summary style="font-weight:700;cursor:pointer;color:#1e40af;">🔄 Rincian Mewakili Guru Lain (${mewakiliList.length})</summary><div style="margin-top:10px;overflow-x:auto;"><table><thead><tr><th>Tanggal</th><th>Guru Pengganti</th><th>Mewakili</th><th>Kelas</th><th>Jam</th><th>Mapel</th></tr></thead><tbody>`;
        mewakiliList.forEach(j => { html += `<tr><td>${escapeHtml(j.tanggal)}</td><td>${escapeHtml(j.guru)}</td><td>${escapeHtml(j.mewakili)}</td><td>${escapeHtml(j.kelas)}</td><td>Jam ${escapeHtml(j.jam_ke)}</td><td>${escapeHtml(j.subject)}</td></tr>`; });
        html += `</tbody></table></div></details>`;
      }
      container.innerHTML = html; btnPdf.style.display = 'inline-block';
      paginationEl.innerHTML = `<button onclick="honorPage--; renderHonor();" ${honorPage <= 1 ? 'disabled' : ''}>◀ Prev</button><span class="page-info">${honorPage} / ${totalPages}</span><button onclick="honorPage++; renderHonor();" ${honorPage >= totalPages ? 'disabled' : ''}>Next ▶</button><span class="text-muted" style="font-size:12px;">Total: ${totalItems} data</span>`;
      window._honorData = { groupedJurnal, groupedReligi, groupedEvents, groupedUjian, groupedEkskulPic, totalHonor, month, year, totalReguler, totalNonReguler, totalEkstra, totalEkstraHonor, totalDluha, totalDzuhur, totalEventJumlah, totalEventHonor, totalUjianJumlah, totalUjianHonor, totalTunjangan, totalTransport, bonusList };
    }
    // Slip Honor pribadi (Guru/Wali Kelas) — read-only, hanya data milik currentUser sendiri.
    // Tidak ada input tarif/edit di halaman ini; semua tarif tetap ditentukan Admin di halaman Honor.
    function renderHonorSlip() {
      const monthSel = document.getElementById('honorSlipMonth'), yearSel = document.getElementById('honorSlipYear');
      const month = monthSel.value.padStart(2,'0'), year = yearSel.value;
      const container = document.getElementById('honorSlipResult');
      const namaSaya = currentUser.name;
      // Identitas dicocokkan pakai guruKey (Firebase key unik currentUser) kalau record punya guruKey --
      // supaya slip honor tidak tertukar antar guru yang kebetulan bernama sama / namanya pernah diubah Admin.
      // Fallback ke nama dipertahankan untuk record lama yang belum punya guruKey.
      const cocokSaya = (rec) => rec.guruKey ? rec.guruKey === currentUser.key : rec.guru === namaSaya;
      const inBulan = (tgl) => { if (!tgl) return false; const p = tgl.split('-'); return p[0] === year && p[1] === month; };
      const fJournals = allJournals.filter(j => cocokSaya(j) && inBulan(j.tanggal) && j.tahunAjaran === currentTahunAjaran && j.status !== 'ditolak');
      const fReligi = allReligiAttendance.filter(r => cocokSaya(r) && inBulan(r.tanggal) && r.tahunAjaran === currentTahunAjaran);
      const fEvents = allEventAttendance.filter(e => cocokSaya(e) && inBulan(e.tanggal) && e.tahunAjaran === currentTahunAjaran);
      const fUjian = allUjianAttendance.filter(u => cocokSaya(u) && inBulan(u.tanggal) && u.tahunAjaran === currentTahunAjaran);
      const fEkskulPic = allEkskulPicHonor.filter(x => cocokSaya(x) && inBulan(x.tanggal) && x.tahunAjaran === currentTahunAjaran);
      const rates = v4GetHonorRates();
      let reguler=0, nonReguler=0, ekstra=0, ekstraHonor=0;
      fJournals.forEach(j => { if (isJamEkstra(j.jam_ke)) { ekstra+=1; ekstraHonor+=getEkstraRate(j.subject); } else if (j.type==='Non-Reguler') nonReguler+=1; else reguler+=1; });
      let dluha=0, dzuhur=0;
      fReligi.forEach(r => { if (r.sholat_dluha && r.sholat_dluha.status==='Hadir') dluha+=1; if (r.sholat_dzuhur && r.sholat_dzuhur.status==='Hadir') dzuhur+=1; });
      const eventJumlah = fEvents.length, eventHonor = fEvents.reduce((s,e)=>s+(e.honor||0),0);
      const ujianJumlah = fUjian.length, ujianHonor = fUjian.reduce((s,u)=>s+(u.honor||0),0);
      // Kredit honor otomatis krn jadi PIC/pengganti ekskul yang mencatat absensi (lihat
      // v4SaveEkskulAttendance) -- ditampilkan baris terpisah di slip biar transparan, tapi
      // tetap dijumlahkan ke ekstraHonor saat dikirim ke v4HitungHonor.
      const ekskulPicJumlah = fEkskulPic.length, ekskulPicHonorTotal = fEkskulPic.reduce((s,x)=>s+(x.honor||0),0);
      const guruObj = (allGuru||[]).find(g => g.key === currentUser.key) || (allGuru||[]).find(g => g.name === namaSaya) || {};
      const tunjangan = guruObj.tunjanganMasaKerja||0, transport = guruObj.bantuanTransportasi||0;
      const gt = allGuruTerajin[year+'-'+month];
      const bonusTerajin = (gt && (gt.guruKey ? gt.guruKey === currentUser.key : gt.guru === namaSaya)) ? (gt.honor||0) : 0;
      const total = v4HitungHonor({ reguler, nonReguler, ekstraHonor: ekstraHonor + ekskulPicHonorTotal, dluha, dzuhur, eventHonor, ujianHonor, tunjangan, transport }, rates) + bonusTerajin;
      const namaBulan = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)];
      if (fJournals.length===0 && fReligi.length===0 && fEvents.length===0 && fUjian.length===0 && fEkskulPic.length===0 && total===0) {
        container.innerHTML = `<p class="text-muted">Belum ada data honor untuk ${namaBulan} ${year}.</p>`;
        return;
      }
      const baris = (label, ket, nilai) => `<tr><td style="padding:5px 0;">${escapeHtml(label)}</td><td class="text-muted" style="padding:5px 0;text-align:center;">${escapeHtml(String(ket))}</td><td style="padding:5px 0;text-align:right;">Rp ${nilai.toLocaleString()}</td></tr>`;
      let rows = '';
      if (reguler>0) rows += baris('Mengajar Reguler', reguler+' jam', reguler*rates.reguler);
      if (nonReguler>0) rows += baris('Mengajar Non-Reguler', nonReguler+' jam', nonReguler*rates.nonReguler);
      if (ekstra>0) rows += baris('Ekstrakurikuler', ekstra+' jam', ekstraHonor);
      if (dluha>0) rows += baris('Sholat Dhuha', dluha+' hari', dluha*rates.dluha);
      if (dzuhur>0) rows += baris('Sholat Dzuhur', dzuhur+' hari', dzuhur*rates.dzuhur);
      if (eventJumlah>0) rows += baris('Lembur/Rapat', eventJumlah+'x', eventHonor);
      if (ujianJumlah>0) rows += baris('Honor Ujian', ujianJumlah+'x', ujianHonor);
      if (ekskulPicJumlah>0) rows += baris('PIC/Pengganti Ekskul', ekskulPicJumlah+'x', ekskulPicHonorTotal);
      if (tunjangan>0) rows += baris('Tunjangan Masa Kerja', '-', tunjangan);
      if (transport>0) rows += baris('Bantuan Transportasi', '-', transport);
      if (bonusTerajin>0) rows += baris('🏆 Guru Terajin', '-', bonusTerajin);
      // FIX: slip honor pribadi sebelumnya cuma menampilkan TOTAL jam "Mengajar Non-Reguler"
      // tanpa rincian tanggal/kelas/mewakili siapa -- guru tidak bisa mengecek sendiri apakah
      // jumlah itu benar, beda dengan halaman Honor Admin yang sudah punya detail "Rincian
      // Mewakili Guru Lain". Sekarang ditambahkan rincian yang sama (dipersempit ke data milik
      // guru ybs sendiri) supaya slip ini bisa dicek sendiri sebelum tanya ke Admin.
      const mewakiliListSaya = fJournals.filter(j => j.type === 'Non-Reguler' && j.mewakili).sort((a,b) => COLLATOR_ID.compare((a.tanggal||''), b.tanggal||''));
      let mewakiliHtml = '';
      if (mewakiliListSaya.length > 0) {
        mewakiliHtml = `<details style="margin-top:12px;background:#eff6ff;border-radius:10px;padding:10px;border:1px solid #93c5fd;"><summary style="font-weight:700;cursor:pointer;color:#1e40af;font-size:13px;">🔄 Rincian Mengajar Non-Reguler (${mewakiliListSaya.length})</summary><div style="margin-top:8px;overflow-x:auto;"><table style="width:100%;font-size:12px;border-collapse:collapse;"><thead><tr><th style="text-align:left;">Tanggal</th><th style="text-align:left;">Mewakili</th><th style="text-align:left;">Kelas</th><th style="text-align:center;">Jam</th><th style="text-align:left;">Mapel</th></tr></thead><tbody>`;
        mewakiliListSaya.forEach(j => { mewakiliHtml += `<tr><td>${escapeHtml(j.tanggal)}</td><td>${escapeHtml(j.mewakili)}</td><td>${escapeHtml(j.kelas)}</td><td style="text-align:center;">${escapeHtml(j.jam_ke)}</td><td>${escapeHtml(j.subject)}</td></tr>`; });
        mewakiliHtml += `</tbody></table></div></details>`;
      }
      container.innerHTML = `
        <div style="max-width:480px;margin:0 auto;background:#fff;border:1px dashed #94a3b8;border-radius:12px;padding:20px;">
          <div style="text-align:center;margin-bottom:12px;">
            <div style="font-weight:800;font-size:16px;">🧾 SLIP HONOR</div>
            <div class="text-muted" style="font-size:12px;">${escapeHtml(namaSaya)} • ${namaBulan} ${year}</div>
          </div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">${rows}</table>
          ${mewakiliHtml}
          <div style="border-top:2px dashed #94a3b8;margin-top:10px;padding-top:10px;display:flex;justify-content:space-between;font-weight:800;font-size:15px;">
            <span>TOTAL</span><span style="color:#059669;">Rp ${total.toLocaleString()}</span>
          </div>
          <p class="text-muted" style="font-size:11px;margin-top:12px;text-align:center;">Slip ini dihitung otomatis oleh sistem berdasarkan tarif dari Admin. Untuk koreksi, hubungi Admin.</p>
        </div>`;
    }

    // ============================================================
    // INFAQ MADRASAH (per siswa, mingguan) — Admin kelola semua kelas;
    // Wali Kelas hanya jadi petugas pencatat: input & lihat rekap kelasnya sendiri.
    // ============================================================
    // INFAQ MADRASAH (per siswa, mingguan) — Admin kelola semua kelas & MENENTUKAN sendiri
    // siapa petugas pencatat per kelas (bukan otomatis wali kelas -- karena tidak semua wali
    // kelas kebagian pegang infaq). Petugas yang ditunjuk bisa guru siapa saja, dan satu guru
    // bisa ditunjuk untuk lebih dari satu kelas.
    // ============================================================
    function infaqMyKelasList() {
      if (!currentUser) return [];
      const uid = currentUser.key || currentUser.name;
      return KELAS_LIST.filter(k => {
        const p = allInfaqPetugas && allInfaqPetugas[k];
        return p && (p.key === uid || p.name === currentUser.name);
      });
    }
    function infaqCanAccess() { return isAdmin() || infaqMyKelasList().length > 0; }
    // Badge notifikasi "belum lunas" di menu Infaq Mingguan -- menyala kalau ada siswa yang
    // relevan (kelas yang ditugaskan ke user ini, atau semua kelas untuk Admin/Kepsek) belum
    // tercatat lunas untuk minggu berjalan. Dipanggil ulang setiap kali data direfresh (lihat
    // pemanggilnya di renderAllCore), jadi otomatis update tanpa perlu reload halaman.
    function updateInfaqNotifDot() {
      const dot = document.getElementById('infaqNotifDot');
      if (!dot) return;
      if (!currentUser || (!isAdmin() && !isKepsek() && !infaqCanAccess())) { dot.classList.remove('show'); return; }
      const kelasRelevan = isAdmin() || isKepsek() ? KELAS_LIST : infaqMyKelasList();
      const mingguIni = isoMingguKey();
      const sudahLunasKey = new Set(
        allInfaqSiswa.filter(it => it.minggu === mingguIni).map(it => it.siswaKey)
      );
      const adaBelumLunas = allSiswa.some(s => kelasRelevan.includes(s.kelas) && !sudahLunasKey.has(s.key));
      dot.classList.toggle('show', adaBelumLunas);
    }
    function infaqPetugasNama(kelas) { const p = allInfaqPetugas && allInfaqPetugas[kelas]; return p ? p.name : null; }
    function renderInfaqPetugasAdmin() {
      const box = document.getElementById('infaqPetugasArea'); if (!box) return;
      if (!isAdmin()) { box.innerHTML = ''; return; }
      const rows = KELAS_LIST.map(k => {
        const p = (allInfaqPetugas && allInfaqPetugas[k]) || {};
        const options = (allGuru||[]).map(g => `<option value="${escapeHtml(g.key||g.name)}" ${(g.key||g.name)===p.key?'selected':''}>${escapeHtml(g.name)}</option>`).join('');
        return `<tr><td style="font-weight:600;white-space:nowrap;">${escapeHtml(k)}</td><td><select class="field" style="font-size:12px;padding:5px;" onchange="simpanInfaqPetugas('${k}', this.value)"><option value="">-- Belum Ditentukan --</option>${options}</select></td></tr>`;
      }).join('');
      box.innerHTML = `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin-bottom:14px;">
        <h4 style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1e40af;">👤 Petugas Pencatat Infaq per Kelas</h4>
        <p style="font-size:12px;color:#3b5f8a;margin-bottom:10px;">Admin menentukan sendiri siapa petugas pencatat infaq tiap kelas — tidak harus wali kelas.</p>
        <div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Petugas</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    }
    function simpanInfaqPetugas(kelas, guruValue) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa menentukan petugas!', true);
      if (!guruValue) {
        db.ref('infaq_petugas_v4/'+kelas).remove().then(() => { toast('Petugas infaq '+kelas+' dihapus'); delete allInfaqPetugas[kelas]; renderInfaqPetugasAdmin(); setupInfaqPage(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
        return;
      }
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return;
      const data = { kelas, key: guru.key||guru.name, name: guru.name, updatedBy: currentUser.name, updatedAt: new Date().toISOString() };
      db.ref('infaq_petugas_v4/'+kelas).set(data).then(() => {
        toast('✅ Petugas infaq '+kelas+' ditentukan: '+guru.name);
        addLog('tentukan_petugas_infaq', kelas+' - '+guru.name);
        allInfaqPetugas[kelas] = data;
        renderInfaqPetugasAdmin();
        setupInfaqPage();
      }).catch(err => toast('Gagal: '+err.message, true));
    }
    // ============================================================
    // IURAN MINGGUAN (dulu "Infaq" mingguan nominal-bebas per siswa -> sempat diubah jadi
    // iuran TETAP BULANAN -> sekarang dikembalikan ke periode MINGGUAN lagi tapi tetap nominal
    // TETAP + status Lunas/Belum (bukan nominal bebas seperti Infaq yang paling awal). Klik
    // centang = langsung tersimpan (tidak ada tombol "Simpan" batch lagi, lihat
    // toggleLunasSatuSiswa()), dan status yang sudah >24 jam terkunci untuk non-Admin (lihat
    // iuranTerkunci()). Struktur petugas pencatat per kelas (ditunjuk Admin) TIDAK berubah --
    // lihat infaqMyKelasList/infaqCanAccess/infaqPetugasNama/renderInfaqPetugasAdmin/
    // simpanInfaqPetugas di atas, masih dipakai apa adanya.
    // ============================================================
    // Nominal iuran mingguan bersifat TETAP (bukan bebas per-minggu) -- Admin bisa mengubahnya
    // sewaktu-waktu, tapi pembayaran yang SUDAH tercatat lunas tetap menyimpan nominal saat itu
    // dibayar (snapshot per record), jadi riwayat lama tidak ikut berubah kalau nominal
    // dinaikkan/diturunkan di kemudian hari.
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
    function renderIuranNominalArea() {
      const box = document.getElementById('infaqTargetArea'); if (!box) return;
      // FIX: nominal 0 dulu jatuh ke '' (input) dan ke pesan "belum diatur" (non-admin) karena
      // dicek pakai truthiness. Sekarang yang dianggap "belum diatur" hanya null/undefined.
      const nominalRaw = MADRASAH.iuranMingguanNominal;
      const sudahDiatur = nominalRaw !== null && nominalRaw !== undefined;
      const nominal = sudahDiatur ? nominalRaw : 0;
      if (isAdmin()) {
        box.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;">
          <span style="font-size:13px;font-weight:600;color:#065f46;">💵 Nominal Infaq Mingguan (standar semua siswa):</span>
          <input id="infaqTargetInput" type="number" class="field" style="width:140px;" min="0" step="500" value="${sudahDiatur ? nominal : ''}" placeholder="Belum diatur">
          <button class="btn btn-success" style="padding:7px 14px;font-size:12px;" onclick="simpanIuranNominal()">💾 Simpan</button>
          <span class="text-muted" style="font-size:11px;">Berlaku untuk semua siswa & minggu berikutnya. Pembayaran yang sudah tercatat lunas tidak ikut berubah. Untuk siswa dengan nominal beda (mis. keringanan siswa bersaudara), atur lewat tombol ✏️ Edit di halaman Data Siswa — ditandai ✨ di daftar bawah.</span>
        </div>`;
      } else {
        box.innerHTML = sudahDiatur
          ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;color:#065f46;font-weight:600;">💵 Infaq Mingguan: <strong>Rp ${nominal.toLocaleString('id-ID')}</strong> / siswa / minggu <span class="text-muted" style="font-weight:400;font-size:11px;">(siswa bertanda ✨ di bawah punya nominal berbeda)</span></div>`
          : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:12px;color:#92400e;">⚠️ Admin belum mengatur nominal infaq mingguan.</div>`;
      }
    }
    function simpanIuranNominal() {
      if (!isAdmin()) return toast('Hanya Admin yang bisa mengubah nominal!', true);
      const rawNominal = document.getElementById('infaqTargetInput').value.trim();
      const nominal = parseInt(rawNominal, 10);
      // Kosong ditolak (bukan diam-diam jadi 0) supaya "belum diatur" dan "0" tidak tercampur.
      if (rawNominal === '' || isNaN(nominal) || nominal < 0) return toast('Isi nominal yang valid (0 atau lebih)!', true);
      db.ref('school_settings').update({ iuranMingguanNominal: nominal, iuranNominalUpdatedBy: currentUser.name, iuranNominalUpdatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Nominal infaq mingguan disimpan!');
        addLog('simpan_nominal_iuran', 'Rp' + nominal);
        MADRASAH.iuranMingguanNominal = nominal;
        renderIuranNominalArea();
      });
    }
    // Batas kunci: petugas/Wali Kelas TIDAK BISA lagi mengubah status lunas yang sudah tercatat
    // lebih dari 24 jam (dihitung dari inputAt) -- supaya rekap tidak diarmak-armik lama setelah
    // dicatat. Admin dikecualikan, tetap bebas ubah kapan pun (lihat cekKuncI24Jam() dipakai di
    // render checkbox & toggleLunasSatuSiswa()).
    const KUNCI_IURAN_MS = 24 * 60 * 60 * 1000;
    function iuranTerkunci(record) {
      if (!record || !record.inputAt) return false;
      if (isAdmin()) return false;
      return (Date.now() - new Date(record.inputAt).getTime()) > KUNCI_IURAN_MS;
    }
    function setupInfaqPage() {
      renderInfaqPetugasAdmin();
      if (!infaqCanAccess()) {
        const wrap = document.getElementById('infaqInputArea');
        if (wrap) wrap.innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditunjuk sebagai petugas pencatat infaq kelas manapun — hubungi Admin.</p>';
        const belumSetorArea = document.getElementById('infaqBelumSetorArea'); if (belumSetorArea) belumSetorArea.innerHTML = '';
        const targetArea = document.getElementById('infaqTargetArea'); if (targetArea) targetArea.innerHTML = '';
        document.getElementById('infaqKelas').innerHTML = '<option value="">-</option>';
        document.getElementById('infaqKelas').disabled = true;
        renderIuranRekap();
        return;
      }
      const kelasSelect = document.getElementById('infaqKelas'), intro = document.getElementById('infaqIntroText');
      const mingguInput = document.getElementById('infaqRekapMinggu');
      populateMingguSelect();
      if (mingguInput && !mingguInput.value) mingguInput.value = isoMingguKey();
      if (isAdmin()) {
        intro.textContent = 'Kelola status lunas infaq mingguan seluruh kelas. Setiap siswa wajib bayar infaq tiap minggu dengan nominal yang sama. Klik centang langsung tersimpan. Pilih kelas tertentu untuk input, atau "Semua Kelas" untuk melihat rekap gabungan.';
        kelasSelect.innerHTML = '<option value="ALL">Semua Kelas (rekap saja)</option>' + KELAS_LIST.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
        kelasSelect.disabled = false;
      } else {
        const myKelasList = infaqMyKelasList();
        intro.textContent = `Anda ditunjuk Admin sebagai petugas pencatat infaq untuk: ${myKelasList.join(', ')}. Setiap siswa wajib bayar infaq tiap minggu. Klik centang langsung tersimpan begitu ada yang bayar. ⚠️ Status yang sudah tercatat lebih dari 24 jam tidak bisa diubah lagi — hubungi Admin kalau ada koreksi. Untuk mengubah nominal atau penugasan, hubungi Admin.`;
        kelasSelect.innerHTML = myKelasList.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
        kelasSelect.disabled = myKelasList.length <= 1;
      }
      renderIuranNominalArea();
      loadIuranInput();
    }
    function loadIuranInput() {
      const area = document.getElementById('infaqInputArea');
      const belumLunasArea = document.getElementById('infaqBelumSetorArea');
      const kelas = document.getElementById('infaqKelas').value;
      const mingguInput = document.getElementById('infaqRekapMinggu');
      const mingguKey = (mingguInput && mingguInput.value) || isoMingguKey();
      renderIuranNominalArea();
      if (!infaqCanAccess() || !kelas || !mingguKey) { area.innerHTML = ''; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return; }
      if (!isAdmin() && !infaqMyKelasList().includes(kelas)) { area.innerHTML = '<p style="color:#dc2626;">🔒 Anda hanya bisa mencatat infaq kelas yang ditugaskan Admin ke Anda.</p>'; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return; }
      if (kelas === 'ALL') { area.innerHTML = '<p class="text-muted" style="font-size:13px;">Pilih satu kelas tertentu di atas untuk mencatat status lunas per siswa.</p>'; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return; }
      const siswaKelas = allSiswa.filter(s => s.kelas === kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      if (siswaKelas.length === 0) { area.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada data siswa di kelas ini.</p>'; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return; }
      const existingMap = new Map(allInfaqSiswa.filter(it => it.kelas === kelas && it.minggu === mingguKey).map(it => [it.siswaKey, it]));
      let rows = siswaKelas.map(s => {
        const rec = existingMap.get(s.key);
        const lunas = !!rec;
        const terkunci = iuranTerkunci(rec);
        // Nominal khusus (mis. keringanan siswa bersaudara) diatur per siswa lewat Edit Siswa di
        // halaman Data Siswa -- kalau diisi, dipakai menggantikan nominal standar KHUSUS untuk
        // siswa ini saja saat disimpan (lihat toggleLunasSatuSiswa), dan ditampilkan di sini
        // supaya petugas tidak bingung kenapa nominalnya beda dari siswa lain.
        const punyaNominalKhusus = iuranAngka(s.nominalIuranKhusus) !== null; // 0 (gratis) juga "khusus"
        const nominalDipakai = iuranNominalSiswa(s); // null = nominal standar belum diatur
        const badgeKhusus = punyaNominalKhusus ? `<span style="background:#ede9fe;color:#6d28d9;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;margin-left:6px;">✨ ${iuranRp(nominalDipakai)}</span>` : '';
        const labelKunci = terkunci ? ` <span class="text-muted" title="Sudah lebih dari 24 jam sejak dicatat, hanya Admin yang bisa mengubah">🔒</span>` : '';
        return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
        <span style="flex:1;font-size:13px;">${escapeHtml(s.name)}${badgeKhusus}</span>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;${terkunci?'':'cursor:pointer;'}color:${lunas?'#059669':'#dc2626'};">
          <input type="checkbox" class="infaq-lunas-checkbox" data-siswa-key="${s.key}" data-siswa-nama="${escapeHtml(s.name)}" data-nominal="${nominalDipakai === null ? '' : nominalDipakai}" ${lunas?'checked':''} ${terkunci?'disabled':''} onchange="toggleLunasSatuSiswa(this,'${escapeJs(kelas)}','${mingguKey}')" style="width:16px;height:16px;">
          ${lunas?'✅ Lunas':'⏳ Belum Lunas'}${labelKunci}
        </label>
      </div>`;
      }).join('');
      const petugasInfo = isAdmin() ? (infaqPetugasNama(kelas) ? ` — Petugas: <strong>${escapeHtml(infaqPetugasNama(kelas))}</strong>` : ' — <span style="color:#d97706;">⚠️ belum ada petugas ditunjuk</span>') : '';
      area.innerHTML = `<div style="margin-top:8px;"><p class="text-muted" style="font-size:12px;margin-bottom:8px;">Minggu: <strong>${escapeHtml(mingguLabel(mingguKey))}</strong> — Kelas: <strong>${escapeHtml(kelas)}</strong>${petugasInfo}</p><p class="text-muted" style="font-size:11px;margin-bottom:8px;">💡 Klik centang saat siswa bayar — langsung tersimpan, tidak perlu tombol Simpan lagi.</p>${rows}</div>`;
      renderIuranBelumLunas(kelas, siswaKelas, existingMap, mingguKey);
      renderIuranRekap();
    }
    // Klik centang = langsung tersimpan (tidak ada lagi tombol "Simpan" terpisah). Kunci
    // KUNCI_IURAN_MS (24 jam) dicek DUA kali: (1) di render checkbox di atas (disabled kalau
    // sudah lewat 24 jam), (2) di sini lagi sebagai jaga-jaga kalau ada yang lolos lewat cara
    // lain -- pola yang sama dengan guard-guard lain di file ini (mis. isBusy).
    function toggleLunasSatuSiswa(checkbox, kelas, mingguKey) {
      if (!infaqCanAccess()) { checkbox.checked = !checkbox.checked; return toast('Tidak diizinkan!', true); }
      if (!isAdmin() && !infaqMyKelasList().includes(kelas)) { checkbox.checked = !checkbox.checked; return toast('Hanya bisa mencatat infaq kelas yang ditugaskan Admin ke Anda!', true); }
      const siswaKey = checkbox.dataset.siswaKey, siswaNama = checkbox.dataset.siswaNama;
      // '' = nominal belum diatur -> null (field nominal tidak ikut tersimpan); '0' = gratis -> 0.
      const nominal = iuranAngka(checkbox.dataset.nominal);
      const checked = checkbox.checked;
      const existing = allInfaqSiswa.find(it => it.kelas === kelas && it.minggu === mingguKey && it.siswaKey === siswaKey);
      if (!checked && iuranTerkunci(existing)) { checkbox.checked = true; return toast('🔒 Sudah lebih dari 24 jam sejak dicatat, tidak bisa diubah lagi. Hubungi Admin.', true); }
      const path = `iuran_siswa/${mingguKey}_${siswaKey}`;
      checkbox.disabled = true;
      if (checked) {
        db.ref(path).set({ siswaKey, siswaNama, kelas, minggu: mingguKey, status: 'lunas', nominal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() }, err => {
          if (err) { checkbox.checked = false; checkbox.disabled = false; return toast('Gagal: '+err.message, true); }
          toast(`✅ ${siswaNama} ditandai lunas.`); addLog('simpan_iuran', `${kelas} - ${mingguKey} - ${siswaNama} lunas`);
          reloadDataset('infaqSiswa', () => { loadIuranInput(); if (typeof updateInfaqNotifDot === 'function') updateInfaqNotifDot(); });
        });
      } else {
        db.ref(path).remove(err => {
          if (err) { checkbox.checked = true; checkbox.disabled = false; return toast('Gagal: '+err.message, true); }
          toast(`↩️ Status lunas ${siswaNama} dibatalkan.`); addLog('batal_iuran', `${kelas} - ${mingguKey} - ${siswaNama}`);
          reloadDataset('infaqSiswa', () => { loadIuranInput(); if (typeof updateInfaqNotifDot === 'function') updateInfaqNotifDot(); });
        });
      }
    }
    // Daftar siswa yang BELUM lunas minggu ini -- supaya petugas/admin langsung tahu siapa yang
    // perlu ditagih, bukan cuma melihat angka "X dari Y siswa".
    function renderIuranBelumLunas(kelas, siswaKelas, existingMap, mingguKey) {
      const box = document.getElementById('infaqBelumSetorArea'); if (!box) return;
      const belum = siswaKelas.filter(s => !existingMap.has(s.key));
      if (belum.length === 0) { box.innerHTML = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:12px;color:#065f46;">🎉 Semua siswa ${escapeHtml(kelas)} sudah lunas iuran minggu ini!</div>`; return; }
      const namaMinggu = mingguLabel(mingguKey);
      box.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;">
        <div style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:6px;">⏳ Belum Lunas Minggu Ini (${belum.length} siswa) — wajib ditagih:</div>
        <div style="display:flex;flex-direction:column;gap:6px;">${belum.map(s => {
          const pesan = `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${s.name}* (Kelas ${s.kelas}).\n\nKami informasikan bahwa infaq mingguan untuk minggu *${namaMinggu}* belum tercatat lunas. Mohon kesediaannya untuk melunasi secepatnya. Terima kasih.\n\n- ${MADRASAH.nama}`;
          return `<div style="display:flex;align-items:center;gap:8px;background:#fee2e2;border-radius:20px;padding:3px 6px 3px 10px;">
            <span style="color:#991b1b;font-size:11px;font-weight:600;">${escapeHtml(s.name)}</span>
            ${s.noWaOrtu ? `<button class="btn" style="padding:2px 8px;font-size:10px;background:#25D366;color:white;" onclick="kirimWaSiswaKey('${s.key}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : `<span class="text-muted" style="font-size:10px;" title="Nomor WA wali belum diisi">📵</span>`}
          </div>`;
        }).join('')}</div>
      </div>`;
    }
    // Satu tampilan rekap saja (menggantikan renderInfaqRekap + renderInfaqRekapBulanan yang
    // dulu terpisah). renderInfaqRekapBulanan() masih ada di bawah sebagai alias kompatibilitas
    // nama fungsi lama saja -- isinya sudah sama-sama pakai periode mingguan sekarang.
    // Daftar siswa dengan nominal khusus (mis. keringanan siswa bersaudara) -- ditampilkan di
    // rekap supaya Admin/Kepsek bisa lihat sekilas siapa saja yang dikecualikan, tanpa perlu
    // buka satu-satu di Data Siswa. Ikut kelasList yang sedang dilihat (ALL = seluruh madrasah).
    function daftarNominalKhususHtml(kelasList) {
      const nominalStandar = iuranNominalStandar(); // null = belum diatur
      const siswaKhusus = allSiswa.filter(s => (kelasList.length === 0 || kelasList.includes(s.kelas)) && iuranAngka(s.nominalIuranKhusus) !== null).sort((a,b) => COLLATOR_ID.compare(a.kelas, b.kelas) || COLLATOR_ID.compare(a.name, b.name));
      if (siswaKhusus.length === 0) return '';
      const rows = siswaKhusus.map(s => {
        const k = iuranAngka(s.nominalIuranKhusus);
        const selisih = nominalStandar === null ? '<span title="Nominal standar belum diatur">—</span>' : (k < nominalStandar ? '−Rp '+(nominalStandar - k).toLocaleString('id-ID') : (k > nominalStandar ? '+Rp '+(k - nominalStandar).toLocaleString('id-ID') : '-'));
        return `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.kelas)}</td><td style="text-align:right;">${iuranRp(k)}</td><td class="text-muted" style="text-align:right;">${selisih}</td></tr>`;
      }).join('');
      return `<div style="margin-top:18px;">
        <p style="font-size:13px;font-weight:700;color:#6d28d9;margin-bottom:6px;">✨ Siswa dengan Nominal Infaq Khusus (${siswaKhusus.length})</p>
        <div style="overflow-x:auto;"><table><thead><tr><th>Nama</th><th>Kelas</th><th>Nominal</th><th>Selisih dari standar</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    }
    // Daftar siswa belum lunas MINGGU YANG SEDANG DILIHAT DI REKAP, lengkap dengan tombol WA --
    // supaya Admin/Kepsek bisa langsung kirim pengingat dari tampilan Rekap (termasuk saat lihat
    // "Semua Kelas" sekaligus), tidak perlu masuk mode "isi per kelas" satu-satu dulu seperti
    // sebelumnya (WA di situ cuma muncul kalau sedang pilih 1 kelas spesifik untuk input).
    function daftarBelumLunasRekapHtml(kelasList, mingguKey) {
      const daftarKelas = kelasList.length ? kelasList : KELAS_LIST;
      const namaMinggu = mingguLabel(mingguKey);
      let rows = '';
      daftarKelas.forEach(kelas => {
        const siswaKelas = allSiswa.filter(s => s.kelas === kelas);
        const sudahLunasSet = new Set(allInfaqSiswa.filter(it => it.kelas === kelas && it.minggu === mingguKey).map(it => it.siswaKey));
        const belum = siswaKelas.filter(s => !sudahLunasSet.has(s.key));
        belum.forEach(s => {
          const pesan = `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${s.name}* (Kelas ${s.kelas}).\n\nKami informasikan bahwa infaq mingguan untuk minggu *${namaMinggu}* belum tercatat lunas. Mohon kesediaannya untuk melunasi secepatnya. Terima kasih.\n\n- ${MADRASAH.nama}`;
          rows += `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
            <span>${escapeHtml(s.name)} <span class="text-muted" style="font-size:11px;">(${escapeHtml(s.kelas)})</span></span>
            ${s.noWaOrtu ? `<button class="btn" style="padding:2px 8px;font-size:11px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaSiswaKey('${s.key}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : `<span class="text-muted" style="font-size:10px;" title="Nomor WA wali belum diisi">📵</span>`}
          </div>`;
        });
      });
      if (!rows) return `<div style="margin-top:18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:12px;color:#065f46;">🎉 Semua siswa sudah lunas untuk minggu ${escapeHtml(namaMinggu)}!</div>`;
      return `<div style="margin-top:18px;">
        <p style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:6px;">📲 Kirim Pengingat WA — Belum Lunas Minggu ${escapeHtml(namaMinggu)}</p>
        <div style="max-height:280px;overflow-y:auto;">${rows}</div>
      </div>`;
    }
    function renderIuranRekap() {
      const area = document.getElementById('infaqRekapArea');
      const areaBulananLama = document.getElementById('infaqRekapBulananArea'); // elemen lama (kalau masih ada di index.html) ikut diisi supaya tidak kosong menggantung
      const setHtml = (html) => { if (area) area.innerHTML = html; if (areaBulananLama) areaBulananLama.innerHTML = html; };
      if (!infaqCanAccess()) { setHtml(''); return; }
      const mingguInput = document.getElementById('infaqRekapMinggu');
      const mingguKey = (mingguInput && mingguInput.value) || isoMingguKey();
      const nominal = iuranNominalStandar(); // null = belum diatur, 0 = gratis
      const nominalInfo = nominal !== null ? `<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Nominal infaq per siswa/minggu: <strong>Rp ${nominal.toLocaleString('id-ID')}</strong>${nominal === 0 ? ' (gratis)' : ''}</p>` : `<p style="font-size:12px;color:#92400e;margin-bottom:8px;">⚠️ Nominal iuran belum diatur Admin.</p>`;
      const kelasPilih = document.getElementById('infaqKelas').value;
      if (isAdmin() && kelasPilih === 'ALL') {
        let totalMadrasah = 0, totalLunasMadrasah = 0, totalSiswaMadrasah = 0;
        let rows = KELAS_LIST.map(k => {
          const items = allInfaqSiswa.filter(it => it.kelas === k && it.minggu === mingguKey);
          const total = items.reduce((s,it) => s + (it.nominal||0), 0);
          const jumlahSiswaKelas = allSiswa.filter(s => s.kelas === k).length;
          totalMadrasah += total; totalLunasMadrasah += items.length; totalSiswaMadrasah += jumlahSiswaKelas;
          const kurang = jumlahSiswaKelas > 0 && items.length < jumlahSiswaKelas;
          return `<tr ${kurang?'style="background:#fffbeb;"':''}><td>${escapeHtml(k)}</td><td>${items.length} / ${jumlahSiswaKelas} siswa lunas</td><td style="text-align:right;">Rp ${total.toLocaleString('id-ID')}</td></tr>`;
        }).join('');
        setHtml(`${nominalInfo}<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Rekap minggu: <strong>${escapeHtml(mingguLabel(mingguKey))}</strong> — Kepatuhan madrasah: <strong>${totalSiswaMadrasah>0?Math.round((totalLunasMadrasah/totalSiswaMadrasah)*100):0}%</strong></p><div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Status Lunas</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th style="text-align:left;">TOTAL MADRASAH</th><th style="text-align:left;">${totalLunasMadrasah} / ${totalSiswaMadrasah} siswa lunas</th><th style="text-align:right;color:#059669;">Rp ${totalMadrasah.toLocaleString('id-ID')}</th></tr></tfoot></table></div>${daftarNominalKhususHtml([])}${daftarBelumLunasRekapHtml([], mingguKey)}${iuranTtdBendahara()}`);
        return;
      }
      const kelasList = isAdmin() ? (kelasPilih && kelasPilih!=='ALL' ? [kelasPilih] : []) : infaqMyKelasList();
      if (kelasList.length === 0) { setHtml(nominalInfo); return; }
      // Riwayat per minggu untuk kelas ini (beberapa minggu terakhir yang ada datanya), supaya
      // kelihatan siswa mana yang menunggak berminggu-minggu -- bukan cuma status minggu berjalan.
      let totalKeseluruhan = 0, totalLunasSemua = 0, totalSlotSemua = 0, rowsGabungan = '';
      kelasList.forEach(kelas => {
        const jumlahSiswaKelas = allSiswa.filter(s => s.kelas === kelas).length;
        const byMinggu = {};
        allInfaqSiswa.filter(it => it.kelas === kelas).forEach(it => { if (!byMinggu[it.minggu]) byMinggu[it.minggu] = { total: 0, jumlah: 0 }; byMinggu[it.minggu].total += (it.nominal||0); byMinggu[it.minggu].jumlah += 1; });
        const mingguList = Object.keys(byMinggu).sort().reverse();
        if (mingguList.length === 0) { rowsGabungan += `<tr><td colspan="4" class="text-muted">Belum ada riwayat infaq untuk kelas ${escapeHtml(kelas)}.</td></tr>`; return; }
        mingguList.forEach(mg => {
          const kurang = byMinggu[mg].jumlah < jumlahSiswaKelas;
          totalKeseluruhan += byMinggu[mg].total; totalLunasSemua += byMinggu[mg].jumlah; totalSlotSemua += jumlahSiswaKelas;
          rowsGabungan += `<tr ${kurang?'style="background:#fffbeb;"':''}><td>${escapeHtml(kelas)}</td><td>${escapeHtml(mingguLabel(mg))}</td><td>${byMinggu[mg].jumlah} / ${jumlahSiswaKelas} siswa lunas</td><td style="text-align:right;">Rp ${byMinggu[mg].total.toLocaleString('id-ID')}</td></tr>`;
        });
      });
      setHtml(`${nominalInfo}<div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Minggu</th><th>Status Lunas</th><th>Total</th></tr></thead><tbody>${rowsGabungan}</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th colspan="2" style="text-align:left;">TOTAL KESELURUHAN</th><th style="text-align:left;">${totalLunasSemua} / ${totalSlotSemua} siswa lunas</th><th style="text-align:right;color:#059669;">Rp ${totalKeseluruhan.toLocaleString('id-ID')}</th></tr></tfoot></table></div>${daftarNominalKhususHtml(kelasList)}${daftarBelumLunasRekapHtml(kelasList, mingguKey)}${iuranTtdBendahara()}`);
    }
    // Blok tanda tangan Bendahara -- menghubungkan data "Struktur Pengurus" (diisi Admin di
    // halaman Profil Sekolah) ke rekap keuangan iuran secara nyata, bukan sekadar tersimpan.
    function iuranTtdBendahara() {
      return MADRASAH.bendahara ? `<div style="margin-top:18px;display:flex;justify-content:flex-end;">
        <div style="text-align:center;font-size:12px;min-width:220px;">
          <p>Mengetahui,</p><p style="margin-bottom:56px;">Bendahara Madrasah</p>
          <p style="font-weight:700;text-decoration:underline;">${escapeHtml(MADRASAH.bendahara)}</p>
          ${MADRASAH.nip_bendahara ? `<p>NIP/NUPTK. ${escapeHtml(MADRASAH.nip_bendahara)}</p>` : ''}
        </div>
      </div>` : `<p class="text-muted" style="margin-top:14px;font-size:11px;">💡 Isi nama Bendahara di halaman Profil Sekolah supaya rekap ini otomatis punya blok tanda tangan.</p>`;
    }
    // Alias kompatibilitas: berjaga-jaga kalau index.html (yang tidak ikut diunggah di sesi ini)
    // masih punya atribut onchange/onclick statis yang memanggil nama fungsi LAMA sebelum modul
    // Infaq diubah jadi Iuran Mingguan -- supaya tidak tiba-tiba error "function is not defined"
    // kalau ternyata masih ada rujukan lama di HTML yang tidak saya lihat.
    function loadInfaqInput() { return loadIuranInput(); }
    function renderInfaqRekapBulanan() { return renderIuranRekap(); }

    // ============================================================
    // SIKAP & KEDISIPLINAN SISWA
    // ============================================================
    // Poin pelanggaran & prestasi per siswa, terakumulasi per tahun ajaran, ikut tampil di
    // Raport. Kategori & poin sekarang bisa diatur Admin lewat kartu "Kelola Kategori" di
    // halaman ini (tersimpan di kedisiplinan_kategori/) -- daftar di bawah ini HANYA dipakai
    // sebagai fallback bawaan kalau Admin belum pernah mengatur apa-apa (lihat kategoriSikapList()).
    const KATEGORI_PELANGGARAN_DEFAULT = [
      { label: 'Terlambat masuk sekolah', poin: 5 },
      { label: 'Tidak mengerjakan PR/tugas', poin: 5 },
      { label: 'Tidak berseragam lengkap', poin: 5 },
      { label: 'Tidak mengikuti sholat berjamaah', poin: 10 },
      { label: 'Berkata tidak sopan', poin: 10 },
      { label: 'Membolos / tidak masuk tanpa keterangan', poin: 15 },
      { label: 'Berkelahi dengan teman', poin: 25 },
      { label: 'Merusak fasilitas sekolah', poin: 25 },
      { label: 'Lainnya', poin: 5 }
    ];
    const KATEGORI_PRESTASI_DEFAULT = [
      { label: 'Membantu teman / guru', poin: 5 },
      { label: 'Aktif dalam kegiatan sekolah', poin: 10 },
      { label: 'Hafalan tambahan / tahfidz', poin: 10 },
      { label: 'Juara lomba tingkat sekolah', poin: 15 },
      { label: 'Juara lomba tingkat kecamatan/kabupaten ke atas', poin: 25 },
      { label: 'Lainnya', poin: 5 }
    ];
    // Sumber kategori yang SEBENARNYA dipakai di seluruh aplikasi (form input, dropdown, dst) --
    // pakai daftar dari Firebase kalau Admin sudah mengisi, kalau masih kosong fallback ke
    // daftar bawaan di atas supaya fitur tetap bisa langsung dipakai sebelum Admin sempat atur.
    function kategoriSikapList(jenis) {
      const dariFirebase = allKedisiplinanKategori[jenis];
      return (dariFirebase && dariFirebase.length) ? dariFirebase : (jenis === 'prestasi' ? KATEGORI_PRESTASI_DEFAULT : KATEGORI_PELANGGARAN_DEFAULT);
    }
    function sikapCanAccess() { return !!currentUser && (isAdmin() || isKepsek() || (currentUser.kelas && currentUser.kelas.length > 0)); }
    function setupSikapPage() {
      if (!sikapCanAccess()) {
        document.getElementById('sikapFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>';
        document.getElementById('sikapRiwayatArea').innerHTML = ''; document.getElementById('sikapTotalBadge').textContent = '';
        renderSikapRekap();
        return;
      }
      const kategoriCard = document.getElementById('sikapKategoriAdminCard');
      if (kategoriCard) kategoriCard.style.display = isAdmin() ? '' : 'none';
      if (isAdmin()) renderSikapKategoriAdmin();
      renderSikapRekap();
    }
    function loadSikapKelas() {
      const kelas = document.getElementById('sikapKelasFilter').value;
      const siswaSelect = document.getElementById('sikapSiswaFilter');
      document.getElementById('sikapFormArea').innerHTML = ''; document.getElementById('sikapRiwayatArea').innerHTML = ''; document.getElementById('sikapTotalBadge').textContent = '';
      if (!kelas) { siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>'; return; }
      const siswaKelas = allSiswa.filter(s => s.kelas === kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>' + siswaKelas.map(s => `<option value="${s.key}">${escapeHtml(s.name)}</option>`).join('');
      renderSikapRekap();
    }
    function onSikapKategoriChange() {
      const jenis = document.getElementById('sikapJenis').value;
      const kategoriSelect = document.getElementById('sikapKategori');
      const found = kategoriSikapList(jenis).find(k => k.label === kategoriSelect.value);
      if (found) document.getElementById('sikapPoin').value = found.poin;
    }
    function onSikapJenisChange() {
      const jenis = document.getElementById('sikapJenis').value;
      document.getElementById('sikapKategori').innerHTML = kategoriSikapList(jenis).map(k => `<option value="${escapeHtml(k.label)}">${escapeHtml(k.label)}</option>`).join('');
      onSikapKategoriChange();
    }
    function loadSikapSiswa() {
      const kelas = document.getElementById('sikapKelasFilter').value;
      const siswaKey = document.getElementById('sikapSiswaFilter').value;
      const formArea = document.getElementById('sikapFormArea'), riwayatArea = document.getElementById('sikapRiwayatArea'), badge = document.getElementById('sikapTotalBadge');
      if (!siswaKey) { formArea.innerHTML = ''; riwayatArea.innerHTML = ''; badge.textContent = ''; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) return;
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">➕ Catat untuk ${escapeHtml(siswa.name)}</p>
        <div class="grid-3" style="margin-bottom:10px;">
          <div><label class="label">Jenis</label><select id="sikapJenis" class="field" onchange="onSikapJenisChange()"><option value="pelanggaran">⚠️ Pelanggaran</option><option value="prestasi">🌟 Prestasi</option></select></div>
          <div><label class="label">Kategori</label><select id="sikapKategori" class="field" onchange="onSikapKategoriChange()"></select></div>
          <div><label class="label">Poin</label><input id="sikapPoin" type="number" class="field" min="1" value="5"></div>
        </div>
        <div style="margin-bottom:10px;"><label class="label">Keterangan (opsional)</label><input id="sikapKeterangan" class="field" placeholder="Detail kejadian..."></div>
        <div style="margin-bottom:10px;"><label class="label">Tanggal</label><input id="sikapTanggal" type="date" class="field" value="${tglLokal()}"></div>
        <button class="btn btn-success" id="btnSimpanSikap" onclick="simpanSikap('${siswa.key}','${escapeJs(siswa.name)}','${kelas}')">💾 Simpan Catatan</button>
      </div>`;
      onSikapJenisChange();
      renderSikapRiwayat(siswaKey);
    }
    function renderSikapRiwayat(siswaKey) {
      const riwayatArea = document.getElementById('sikapRiwayatArea'), badge = document.getElementById('sikapTotalBadge');
      const items = allKedisiplinan.filter(d => d.siswaKey === siswaKey).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      const totalPelanggaran = items.filter(d => d.jenis === 'pelanggaran').reduce((s,d) => s+(d.poin||0), 0);
      const totalPrestasi = items.filter(d => d.jenis === 'prestasi').reduce((s,d) => s+(d.poin||0), 0);
      const net = totalPrestasi - totalPelanggaran;
      badge.innerHTML = `<span style="color:${net>=0?'#059669':'#dc2626'};">Net Poin: ${net >= 0 ? '+' : ''}${net}</span> <span class="text-muted" style="font-weight:400;">(⚠️ ${totalPelanggaran} / 🌟 ${totalPrestasi})</span>`;
      if (items.length === 0) { riwayatArea.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada catatan sikap.</p>'; return; }
      riwayatArea.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Riwayat</p>` + items.map(d => {
        const siswa = allSiswa.find(s => s.key === siswaKey);
        const pesan = d.jenis === 'prestasi'
          ? `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${d.siswaNama}*.\n\nDengan bangga kami sampaikan bahwa ananda mendapat catatan prestasi: *${d.kategori}* (+${d.poin} poin) pada ${d.tanggal}.${d.keterangan ? '\nKeterangan: ' + d.keterangan : ''}\n\nTerima kasih atas kerja samanya.\n\n- ${MADRASAH.nama}`
          : `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${d.siswaNama}*.\n\nKami informasikan bahwa ananda mendapat catatan pelanggaran: *${d.kategori}* (${d.poin} poin) pada ${d.tanggal}.${d.keterangan ? '\nKeterangan: ' + d.keterangan : ''}\n\nMohon kerja samanya untuk membimbing ananda. Terima kasih.\n\n- ${MADRASAH.nama}`;
        const tombolWa = siswa && siswa.noWaOrtu ? `<button class="btn" style="padding:2px 8px;font-size:11px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaSiswaKey('${siswaKey}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
          <div>
            <span style="font-weight:600;color:${d.jenis==='prestasi'?'#059669':'#dc2626'};">${d.jenis==='prestasi'?'🌟':'⚠️'} ${escapeHtml(d.kategori||'-')}</span>
            <span class="text-muted"> (${d.poin||0} poin) — ${escapeHtml(d.tanggal||'-')}</span>
            ${d.keterangan ? `<div class="text-muted" style="font-size:12px;">${escapeHtml(d.keterangan)}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">${tombolWa}${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusSikap('${d.key}','${siswaKey}')">🗑️</button>` : ''}</div>
        </div>`;
      }).join('');
    }
    function simpanSikap(siswaKey, siswaNama, kelas) {
      if (!sikapCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa mencatat sikap siswa di kelas yang Anda ampu!', true);
      if (isBusy('simpanSikap')) return toast('Sedang menyimpan...', false, 1500);
      const jenis = document.getElementById('sikapJenis').value;
      const kategori = document.getElementById('sikapKategori').value;
      const poin = parseInt(document.getElementById('sikapPoin').value) || 0;
      const keterangan = document.getElementById('sikapKeterangan').value.trim();
      const tanggal = document.getElementById('sikapTanggal').value || tglLokal();
      if (poin <= 0) return toast('Poin harus lebih dari 0!', true);
      const btnSimpanSikap = document.getElementById('btnSimpanSikap');
      setBusy('simpanSikap', btnSimpanSikap);
      const ref = db.ref('kedisiplinan_siswa').push();
      ref.set({ siswaKey, siswaNama, kelas, jenis, kategori, poin, keterangan, tanggal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() }, err => {
        clearBusy('simpanSikap', btnSimpanSikap);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan sikap tersimpan!'); addLog('catat_sikap', `${siswaNama} - ${kategori}`);
        const data = { key: ref.key, siswaKey, siswaNama, kelas, jenis, kategori, poin, keterangan, tanggal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
        allKedisiplinan.push(data);
        document.getElementById('sikapKeterangan').value = '';
        renderSikapRiwayat(siswaKey);
        renderSikapRekap();
      });
    }
    function hapusSikap(key, siswaKey) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa menghapus catatan sikap!', true);
      if (!doubleConfirm('Hapus catatan sikap ini?')) return;
      db.ref('kedisiplinan_siswa/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan dihapus.'); addLog('hapus_sikap', key);
        allKedisiplinan = allKedisiplinan.filter(d => d.key !== key);
        renderSikapRiwayat(siswaKey);
        renderSikapRekap();
      });
    }
    function renderSikapRekap() {
      const area = document.getElementById('sikapRekapArea'); if (!area) return;
      const kelasList = (isAdmin() || isKepsek()) ? KELAS_LIST : (currentUser.kelas || []);
      let rows = '';
      kelasList.forEach(kelas => {
        const siswaKelas = allSiswa.filter(s => s.kelas === kelas);
        const perSiswa = siswaKelas.map(s => {
          const items = allKedisiplinan.filter(d => d.siswaKey === s.key);
          const pel = items.filter(d => d.jenis === 'pelanggaran').reduce((sum,d) => sum+(d.poin||0), 0);
          const pres = items.filter(d => d.jenis === 'prestasi').reduce((sum,d) => sum+(d.poin||0), 0);
          return { nama: s.name, pel, pres, net: pres - pel };
        }).filter(x => x.pel > 0 || x.pres > 0).sort((a,b) => a.net - b.net);
        if (perSiswa.length === 0) return;
        rows += `<h4 style="font-size:13px;margin:12px 0 6px;">${escapeHtml(kelas)}</h4><div style="overflow-x:auto;"><table><thead><tr><th>Siswa</th><th>⚠️ Pelanggaran</th><th>🌟 Prestasi</th><th>Net Poin</th></tr></thead><tbody>${perSiswa.map(x => `<tr ${x.net<-20?'style="background:#fef2f2;"':''}><td>${escapeHtml(x.nama)}</td><td>${x.pel}</td><td>${x.pres}</td><td style="font-weight:700;color:${x.net>=0?'#059669':'#dc2626'};">${x.net>=0?'+':''}${x.net}</td></tr>`).join('')}</tbody></table></div>`;
      });
      area.innerHTML = rows || '<p class="text-muted" style="font-size:13px;">Belum ada catatan sikap tahun ajaran ini.</p>';
    }
    // ---- Kelola Kategori (Admin) ----
    function renderSikapKategoriAdmin() {
      const area = document.getElementById('sikapKategoriAdminArea'); if (!area) return;
      const buatBagian = (jenis, judul, warna) => {
        const list = allKedisiplinanKategori[jenis] || [];
        const pakaiDefault = list.length === 0;
        const daftarTampil = pakaiDefault ? (jenis === 'prestasi' ? KATEGORI_PRESTASI_DEFAULT : KATEGORI_PELANGGARAN_DEFAULT) : list;
        const rows = daftarTampil.map(k => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
            <span style="flex:1;">${escapeHtml(k.label)}</span>
            ${pakaiDefault
              ? `<span class="text-muted" style="font-size:12px;">${k.poin} poin (bawaan)</span>`
              : `<input type="number" class="field" style="width:80px;padding:4px 6px;" value="${k.poin}" min="1" onchange="ubahPoinKategoriSikap('${jenis}','${k.key}',this.value)">
                 <button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusKategoriSikap('${jenis}','${k.key}')">🗑️</button>`}
          </div>`).join('');
        return `<div style="margin-bottom:16px;">
          <p style="font-weight:700;font-size:13px;color:${warna};margin-bottom:6px;">${judul}</p>
          ${pakaiDefault ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:8px;padding:8px;margin-bottom:8px;">⚠️ Masih pakai daftar bawaan (belum diatur). Klik "Muat sebagai awal" untuk mulai mengeditnya, atau langsung tambah kategori baru di bawah.</p>` : ''}
          ${rows}
          ${pakaiDefault ? `<button class="btn btn-soft" style="margin-top:8px;font-size:12px;" onclick="muatKategoriBawaan('${jenis}')">📥 Muat sebagai awal (bisa diedit)</button>` : ''}
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
            <input id="sikapKategoriBaru_${jenis}" class="field" style="flex:1;min-width:160px;" placeholder="Nama kategori baru...">
            <input id="sikapPoinBaru_${jenis}" type="number" class="field" style="width:90px;" min="1" value="5" placeholder="Poin">
            <button class="btn btn-success" id="btnTambahKategoriSikap_${jenis}" style="font-size:12px;" onclick="tambahKategoriSikap('${jenis}')">➕ Tambah</button>
          </div>
        </div>`;
      };
      area.innerHTML = buatBagian('pelanggaran', '⚠️ Kategori Pelanggaran', '#dc2626') + buatBagian('prestasi', '🌟 Kategori Prestasi', '#059669');
    }
    function muatKategoriBawaan(jenis) {
      if (!isAdmin()) return;
      const defaultList = jenis === 'prestasi' ? KATEGORI_PRESTASI_DEFAULT : KATEGORI_PELANGGARAN_DEFAULT;
      const obj = {};
      defaultList.forEach(k => { const key = db.ref('kedisiplinan_kategori/'+jenis).push().key; obj[key] = { label: k.label, poin: k.poin }; });
      db.ref('kedisiplinan_kategori/'+jenis).update(obj, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Kategori bawaan dimuat, sekarang bisa diedit!');
        allKedisiplinanKategori[jenis] = Object.entries(obj).map(([k,v]) => ({ key: k, ...v }));
        renderSikapKategoriAdmin();
      });
    }
    function tambahKategoriSikap(jenis) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('tambahKategoriSikap_'+jenis)) return toast('Sedang menyimpan...', false, 1500);
      const labelInput = document.getElementById('sikapKategoriBaru_'+jenis), poinInput = document.getElementById('sikapPoinBaru_'+jenis);
      const label = labelInput.value.trim(), poin = parseInt(poinInput.value) || 0;
      if (!label) return toast('Nama kategori tidak boleh kosong!', true);
      if (poin <= 0) return toast('Poin harus lebih dari 0!', true);
      const btnTambahKategori = document.getElementById('btnTambahKategoriSikap_'+jenis);
      setBusy('tambahKategoriSikap_'+jenis, btnTambahKategori);
      const ref = db.ref('kedisiplinan_kategori/'+jenis).push();
      ref.set({ label, poin }, err => {
        clearBusy('tambahKategoriSikap_'+jenis, btnTambahKategori);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Kategori ditambahkan!'); addLog('tambah_kategori_sikap', jenis+' - '+label);
        allKedisiplinanKategori[jenis].push({ key: ref.key, label, poin });
        labelInput.value = ''; poinInput.value = '5';
        renderSikapKategoriAdmin();
      });
    }
    function ubahPoinKategoriSikap(jenis, key, poinBaru) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const poin = parseInt(poinBaru) || 0;
      if (poin <= 0) return toast('Poin harus lebih dari 0!', true);
      db.ref(`kedisiplinan_kategori/${jenis}/${key}`).update({ poin }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        const item = allKedisiplinanKategori[jenis].find(k => k.key === key); if (item) item.poin = poin;
        toast('✅ Poin diperbarui.');
      });
    }
    function hapusKategoriSikap(jenis, key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus kategori ini? Catatan sikap yang sudah tercatat dengan kategori ini tidak ikut terhapus.')) return;
      db.ref(`kedisiplinan_kategori/${jenis}/${key}`).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Kategori dihapus.'); addLog('hapus_kategori_sikap', jenis+' - '+key);
        allKedisiplinanKategori[jenis] = allKedisiplinanKategori[jenis].filter(k => k.key !== key);
        renderSikapKategoriAdmin();
      });
    }
    // ============================================================
    // BUKU PENGHUBUNG
    // ============================================================
    function bukuCanAccess() { return sikapCanAccess(); } // aturan akses sama persis dengan Sikap Siswa
    // ============================================================
    // INFO KE ORTU -- daftar siap-kirim (buku penghubung + pelanggaran) yang belum dikirim ke
    // WA orang tua. Semi-otomatis: bukan benar-benar auto-kirim (itu butuh Cloud Functions +
    // WA gateway berbayar, di luar cakupan static hosting gratis ini), tapi begitu Wali
    // Kelas/Admin membuka halaman ini, daftar yang perlu dikirim langsung tersaji tanpa perlu
    // dicari manual ke menu Sikap Siswa/Buku Penghubung satu per satu seperti sebelumnya.
    // Status "sudah dikirim" ditandai lewat field notifSent di record itu sendiri (mirip pola
    // status lunas di Infaq Mingguan) -- begitu diklik "Kirim WA", item itu hilang dari daftar.
    function infoOrtuKelasRelevan() {
      if (!currentUser) return [];
      return (isAdmin() || isKepsek()) ? KELAS_LIST : (currentUser.kelas || []);
    }
    function infoOrtuItemsBelumKirim() {
      const kelasRelevan = infoOrtuKelasRelevan();
      if (!kelasRelevan.length) return [];
      const buku = (allBukuPenghubung || []).filter(b => kelasRelevan.includes(b.kelas) && !b.notifSent).map(b => ({ ...b, _tipe: 'buku' }));
      const pelanggaran = (allKedisiplinan || []).filter(d => d.jenis === 'pelanggaran' && kelasRelevan.includes(d.kelas) && !d.notifSent).map(d => ({ ...d, _tipe: 'sikap' }));
      return [...buku, ...pelanggaran].sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
    }
    function updateInfoOrtuNotifDot() {
      const dot = document.getElementById('infoOrtuNotifDot');
      if (!dot) return;
      dot.classList.toggle('show', infoOrtuItemsBelumKirim().length > 0);
    }
    function infoOrtuPesanWa(item) {
      if (item._tipe === 'buku') {
        return `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${item.siswaNama}*.\n\nCatatan buku penghubung tanggal ${item.tanggal}:\n${item.catatan}\n\n- ${MADRASAH.nama}`;
      }
      return `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${item.siswaNama}*.\n\nKami informasikan bahwa ananda mendapat catatan pelanggaran: *${item.kategori}* (${item.poin} poin) pada ${item.tanggal}.${item.keterangan ? '\nKeterangan: ' + item.keterangan : ''}\n\nMohon kerja samanya untuk membimbing ananda. Terima kasih.\n\n- ${MADRASAH.nama}`;
    }
    function kirimWaInfoOrtu(tipe, key, siswaKey) {
      const arr = tipe === 'buku' ? allBukuPenghubung : allKedisiplinan;
      const item = arr.find(x => x.key === key);
      if (!item) return toast('Data tidak ditemukan!', true);
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) return toast('Data siswa tidak ditemukan!', true);
      kirimWA(siswa.noWaOrtu, infoOrtuPesanWa({ ...item, _tipe: tipe }));
      const node = tipe === 'buku' ? 'buku_penghubung' : 'kedisiplinan_siswa';
      db.ref(node + '/' + key).update({ notifSent: true, notifSentAt: new Date().toISOString(), notifSentBy: currentUser.name }, err => {
        if (err) return toast('Terkirim ke WA, tapi gagal menandai status di sistem: ' + err.message, true);
        item.notifSent = true;
        renderInfoOrtuPage();
        updateInfoOrtuNotifDot();
      });
    }
    function renderInfoOrtuPage() {
      const box = document.getElementById('infoOrtuListArea');
      if (!box) return;
      if (!sikapCanAccess()) { box.innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin, Kepsek, atau Wali Kelas.</p>'; return; }
      const items = infoOrtuItemsBelumKirim();
      if (items.length === 0) { box.innerHTML = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;font-size:13px;color:#065f46;">🎉 Tidak ada catatan yang perlu dikirim. Semua sudah beres.</div>'; return; }
      box.innerHTML = items.map(item => {
        const siswa = allSiswa.find(s => s.key === item.siswaKey);
        const tombolWa = siswa && siswa.noWaOrtu
          ? `<button class="btn" style="padding:6px 12px;font-size:12px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaInfoOrtu('${item._tipe}','${item.key}','${item.siswaKey}')">📲 Kirim WA</button>`
          : `<span class="text-muted" style="font-size:11px;">Nomor WA belum diisi</span>`;
        const label = item._tipe === 'buku'
          ? `<span style="color:#2563eb;font-weight:600;">📖 Buku Penghubung</span>`
          : `<span style="color:#dc2626;font-weight:600;">⚠️ Pelanggaran: ${escapeHtml(item.kategori||'-')} (${item.poin||0} poin)</span>`;
        const isi = item._tipe === 'buku' ? item.catatan : item.keterangan;
        return `<div style="display:flex;justify-content:space-between;align-items:start;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div>
              <div class="text-muted" style="font-size:12px;margin-bottom:2px;">${escapeHtml(item.siswaNama||'-')} — Kelas ${escapeHtml(item.kelas||'-')} — ${escapeHtml(item.tanggal||'-')}</div>
              <div style="font-size:13px;">${label}</div>
              ${isi ? `<div class="text-strong" style="font-size:12px;margin-top:2px;">${escapeHtml(isi)}</div>` : ''}
            </div>
            <div style="flex-shrink:0;">${tombolWa}</div>
          </div>`;
      }).join('');
    }
    function setupBukuPenghubungPage() {
      if (!bukuCanAccess()) {
        document.getElementById('bukuFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>';
        document.getElementById('bukuRiwayatArea').innerHTML = '';
      }
    }
    function loadBukuKelas() {
      const kelas = document.getElementById('bukuKelasFilter').value;
      const siswaSelect = document.getElementById('bukuSiswaFilter');
      document.getElementById('bukuFormArea').innerHTML = ''; document.getElementById('bukuRiwayatArea').innerHTML = '';
      if (!kelas) { siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>'; return; }
      const siswaKelas = allSiswa.filter(s => s.kelas === kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>' + siswaKelas.map(s => `<option value="${s.key}">${escapeHtml(s.name)}</option>`).join('');
    }
    function loadBukuSiswa() {
      const kelas = document.getElementById('bukuKelasFilter').value;
      const siswaKey = document.getElementById('bukuSiswaFilter').value;
      const formArea = document.getElementById('bukuFormArea');
      if (!siswaKey) { formArea.innerHTML = ''; document.getElementById('bukuRiwayatArea').innerHTML = ''; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) return;
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">✍️ Catatan Baru untuk ${escapeHtml(siswa.name)}</p>
        <div style="margin-bottom:10px;"><label class="label">Tanggal</label><input id="bukuTanggal" type="date" class="field" value="${tglLokal()}"></div>
        <div style="margin-bottom:10px;"><label class="label">Catatan</label><textarea id="bukuCatatan" class="field" rows="3" placeholder="Contoh: PR Matematika halaman 12, bawa alat gambar besok, ananda aktif bertanya hari ini..."></textarea></div>
        <button class="btn btn-success" id="btnSimpanBukuPenghubung" onclick="simpanBukuPenghubung('${siswa.key}','${escapeJs(siswa.name)}','${kelas}')">💾 Simpan Catatan</button>
      </div>`;
      renderBukuRiwayat(siswaKey);
    }
    function simpanBukuPenghubung(siswaKey, siswaNama, kelas) {
      if (!bukuCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa menulis untuk siswa di kelas yang Anda ampu!', true);
      if (isBusy('simpanBukuPenghubung')) return toast('Sedang menyimpan...', false, 1500);
      const catatan = document.getElementById('bukuCatatan').value.trim();
      const tanggal = document.getElementById('bukuTanggal').value || tglLokal();
      if (!catatan) return toast('Catatan tidak boleh kosong!', true);
      const btnSimpanBuku = document.getElementById('btnSimpanBukuPenghubung');
      setBusy('simpanBukuPenghubung', btnSimpanBuku);
      const ref = db.ref('buku_penghubung').push();
      ref.set({ siswaKey, siswaNama, kelas, tanggal, catatan, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() }, err => {
        clearBusy('simpanBukuPenghubung', btnSimpanBuku);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan tersimpan!'); addLog('catat_buku_penghubung', siswaNama);
        allBukuPenghubung.push({ key: ref.key, siswaKey, siswaNama, kelas, tanggal, catatan, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() });
        document.getElementById('bukuCatatan').value = '';
        renderBukuRiwayat(siswaKey);
      });
    }
    function renderBukuRiwayat(siswaKey) {
      const box = document.getElementById('bukuRiwayatArea'); if (!box) return;
      const items = allBukuPenghubung.filter(b => b.siswaKey === siswaKey).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada catatan buku penghubung.</p>'; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      box.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Riwayat Catatan</p>` + items.map(b => {
        const pesan = `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${b.siswaNama}*.\n\nCatatan buku penghubung tanggal ${b.tanggal}:\n${b.catatan}\n\n- ${MADRASAH.nama}`;
        const tombolWa = siswa && siswa.noWaOrtu ? `<button class="btn" style="padding:2px 8px;font-size:11px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaSiswaKey('${siswaKey}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : '';
        return `<div style="display:flex;justify-content:space-between;align-items:start;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
            <div><div class="text-muted" style="font-size:12px;margin-bottom:2px;">${escapeHtml(b.tanggal||'-')} — ${escapeHtml(b.inputBy||'-')}</div><div>${escapeHtml(b.catatan||'-')}</div></div>
            <div style="display:flex;gap:6px;flex-shrink:0;">${tombolWa}${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusBukuPenghubung('${b.key}','${siswaKey}')">🗑️</button>` : ''}</div>
          </div>`;
      }).join('');
    }
    function hapusBukuPenghubung(key, siswaKey) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa menghapus catatan!', true);
      if (!doubleConfirm('Hapus catatan buku penghubung ini?')) return;
      db.ref('buku_penghubung/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan dihapus.'); addLog('hapus_buku_penghubung', key);
        allBukuPenghubung = allBukuPenghubung.filter(b => b.key !== key);
        renderBukuRiwayat(siswaKey);
      });
    }

    // ============================================================
    // MATERI BELAJAR
    // ============================================================
    function setupMateriPage() {
      if (!bukuCanAccess()) { document.getElementById('materiFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>'; return; }
      renderMateriForm();
    }
    function loadMateriKelas() { renderMateriForm(); renderMateriList(); }
    function renderMateriForm() {
      const kelas = document.getElementById('materiKelasFilter').value;
      const formArea = document.getElementById('materiFormArea');
      if (!kelas) { formArea.innerHTML = ''; document.getElementById('materiListArea').innerHTML = ''; return; }
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) { formArea.innerHTML = '<p style="color:#dc2626;">🔒 Anda hanya bisa membagikan materi untuk kelas yang Anda ampu.</p>'; renderMateriList(); return; }
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">➕ Materi Baru</p>
        <div style="margin-bottom:10px;"><label class="label">Judul</label><input id="materiJudul" class="field" placeholder="Contoh: Bab 3 - Pecahan"></div>
        <div style="margin-bottom:10px;"><label class="label">Isi / Ringkasan Materi</label><textarea id="materiIsi" class="field" rows="4" placeholder="Tulis ringkasan materi, penjelasan, atau instruksi belajar mandiri..."></textarea></div>
        <div style="margin-bottom:10px;"><label class="label">Link Tambahan (opsional)</label><input id="materiLink" class="field" placeholder="Link Google Drive/YouTube/dll (opsional)"></div>
        <button class="btn btn-success" id="btnSimpanMateri" onclick="simpanMateri('${escapeJs(kelas)}')">💾 Bagikan Materi</button>
      </div>`;
      renderMateriList();
    }
    function simpanMateri(kelas) {
      if (!bukuCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa membagikan materi untuk kelas yang Anda ampu!', true);
      if (isBusy('simpanMateri')) return toast('Sedang menyimpan...', false, 1500);
      const mapel = document.getElementById('materiMapelFilter').value;
      const judul = document.getElementById('materiJudul').value.trim();
      const isi = document.getElementById('materiIsi').value.trim();
      const link = document.getElementById('materiLink').value.trim();
      if (!judul || !isi) return toast('Judul & isi materi wajib diisi!', true);
      if (link && !/^https?:\/\//i.test(link)) return toast('Link harus diawali http:// atau https://', true);
      const btnSimpanMateri = document.getElementById('btnSimpanMateri');
      setBusy('simpanMateri', btnSimpanMateri);
      const ref = db.ref('materi_belajar').push();
      const data = { kelas, mapel, judul, isi, link: link || null, tanggal: tglLokal(), tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      ref.set(data, err => {
        clearBusy('simpanMateri', btnSimpanMateri);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Materi berhasil dibagikan!'); addLog('bagikan_materi', kelas + ' - ' + judul);
        allMateri.push({ key: ref.key, ...data });
        document.getElementById('materiJudul').value = ''; document.getElementById('materiIsi').value = ''; document.getElementById('materiLink').value = '';
        renderMateriList();
      });
    }
    function renderMateriList() {
      const box = document.getElementById('materiListArea'); if (!box) return;
      const kelas = document.getElementById('materiKelasFilter').value;
      if (!kelas) { box.innerHTML = ''; return; }
      const items = allMateri.filter(m => m.kelas === kelas).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada materi dibagikan untuk kelas ini.</p>'; return; }
      box.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Materi Dibagikan</p>` + items.map(m => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <div>
            <div style="font-weight:600;font-size:13px;">${escapeHtml(m.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(m.mapel||'-')} — ${escapeHtml(m.tanggal||'-')}</span></div>
            <div class="text-muted" style="font-size:12px;margin-top:2px;">${escapeHtml(m.isi)}</div>
            ${m.link ? `<a href="${escapeHtml(m.link)}" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb;">🔗 Buka Link</a>` : ''}
          </div>
          ${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;flex-shrink:0;" onclick="hapusMateri('${m.key}')">🗑️</button>` : ''}
        </div>`).join('');
    }
    function hapusMateri(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus materi ini?')) return;
      db.ref('materi_belajar/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Materi dihapus.'); addLog('hapus_materi', key);
        allMateri = allMateri.filter(m => m.key !== key);
        renderMateriList();
      });
    }

    // ============================================================
    // TUGAS SISWA
    // ============================================================
    function setupTugasPage() {
      if (!bukuCanAccess()) { document.getElementById('tugasFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>'; return; }
      renderTugasForm();
    }
    function loadTugasKelas() { renderTugasForm(); renderTugasList(); }
    function renderTugasForm() {
      const kelas = document.getElementById('tugasKelasFilter').value;
      const formArea = document.getElementById('tugasFormArea');
      document.getElementById('tugasDetailCard').style.display = 'none';
      if (!kelas) { formArea.innerHTML = ''; document.getElementById('tugasListArea').innerHTML = ''; return; }
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) { formArea.innerHTML = '<p style="color:#dc2626;">🔒 Anda hanya bisa membuat tugas untuk kelas yang Anda ampu.</p>'; renderTugasList(); return; }
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">➕ Tugas Baru</p>
        <div style="margin-bottom:10px;"><label class="label">Judul Tugas</label><input id="tugasJudul" class="field" placeholder="Contoh: Latihan Soal Bab 3"></div>
        <div style="margin-bottom:10px;"><label class="label">Deskripsi / Instruksi</label><textarea id="tugasDeskripsi" class="field" rows="4" placeholder="Jelaskan tugas yang harus dikerjakan siswa..."></textarea></div>
        <div style="margin-bottom:10px;"><label class="label">Batas Waktu Kumpul</label><input id="tugasDeadline" type="date" class="field"></div>
        <button class="btn btn-success" id="btnSimpanTugas" onclick="simpanTugas('${escapeJs(kelas)}')">💾 Buat Tugas</button>
      </div>`;
      renderTugasList();
    }
    function simpanTugas(kelas) {
      if (!bukuCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa membuat tugas untuk kelas yang Anda ampu!', true);
      if (isBusy('simpanTugas')) return toast('Sedang menyimpan...', false, 1500);
      const mapel = document.getElementById('tugasMapelFilter').value;
      const judul = document.getElementById('tugasJudul').value.trim();
      const deskripsi = document.getElementById('tugasDeskripsi').value.trim();
      const deadline = document.getElementById('tugasDeadline').value;
      if (!judul || !deskripsi) return toast('Judul & deskripsi tugas wajib diisi!', true);
      const btnSimpanTugas = document.getElementById('btnSimpanTugas');
      setBusy('simpanTugas', btnSimpanTugas);
      const ref = db.ref('tugas').push();
      const data = { kelas, mapel, judul, deskripsi, deadline: deadline || null, tanggal: tglLokal(), tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      ref.set(data, err => {
        clearBusy('simpanTugas', btnSimpanTugas);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Tugas berhasil dibuat!'); addLog('buat_tugas', kelas + ' - ' + judul);
        allTugas.push({ key: ref.key, ...data });
        document.getElementById('tugasJudul').value = ''; document.getElementById('tugasDeskripsi').value = ''; document.getElementById('tugasDeadline').value = '';
        renderTugasList();
      });
    }
    function renderTugasList() {
      const box = document.getElementById('tugasListArea'); if (!box) return;
      const kelas = document.getElementById('tugasKelasFilter').value;
      if (!kelas) { box.innerHTML = ''; return; }
      const items = allTugas.filter(t => t.kelas === kelas).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada tugas dibuat untuk kelas ini.</p>'; return; }
      const jumlahSiswaKelas = allSiswa.filter(s => s.kelas === kelas).length;
      box.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Daftar Tugas</p>` + items.map(t => {
        const jumlahKumpul = allTugasSubmission.filter(sub => sub.tugasKey === t.key).length;
        return `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="cursor:pointer;flex:1;" onclick="lihatDetailTugas('${t.key}')">
            <div style="font-weight:600;font-size:13px;">${escapeHtml(t.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(t.mapel||'-')}</span></div>
            <div class="text-muted" style="font-size:12px;">Deadline: ${escapeHtml(t.deadline||'Tidak ditentukan')} — <span style="color:#2563eb;font-weight:600;">${jumlahKumpul} / ${jumlahSiswaKelas} siswa sudah kumpul</span></div>
          </div>
          ${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;flex-shrink:0;" onclick="event.stopPropagation();hapusTugas('${t.key}')">🗑️</button>` : ''}
        </div>`;
      }).join('');
    }
    function hapusTugas(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus tugas ini? Semua jawaban siswa yang sudah kumpul untuk tugas ini juga akan hilang.')) return;
      db.ref('tugas/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Tugas dihapus.'); addLog('hapus_tugas', key);
        allTugas = allTugas.filter(t => t.key !== key);
        renderTugasList();
      });
    }
    // Detail tugas: fetch ULANG langsung dari Firebase (termasuk foto) khusus untuk 1 tugas ini
    // saja -- sama alasannya dengan galeri foto check-in Acara/Ujian, supaya foto tidak ikut
    // terbawa ke semua guru di setiap sesi buka aplikasi.
    function lihatDetailTugas(tugasKey) {
      const tugas = allTugas.find(t => t.key === tugasKey);
      if (!tugas) return;
      document.getElementById('tugasDetailCard').style.display = 'block';
      document.getElementById('tugasDetailTitle').textContent = '📝 ' + tugas.judul;
      const area = document.getElementById('tugasDetailArea');
      area.innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">⏳ Memuat jawaban siswa...</p>';
      const siswaKelas = allSiswa.filter(s => s.kelas === tugas.kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      db.ref('tugas_submission').orderByChild('tugasKey').equalTo(tugasKey).once('value', snap => {
        const submissions = {};
        const daftarSub = [];
        snap.forEach(child => { const s = child.val(); s.key = child.key; submissions[s.siswaKey] = s; daftarSub.push(s); });
        lampirkanFoto('tugas_submission', daftarSub).then(() => { area.innerHTML = `<p class="text-muted" style="font-size:13px;margin-bottom:10px;">${escapeHtml(tugas.deskripsi)}</p>` + siswaKelas.map(s => {
          const sub = submissions[s.key];
          if (!sub) return `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;">${escapeHtml(s.name)}</span><span class="text-muted" style="font-size:11px;">⏳ Belum kumpul</span></div>`;
          return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:600;">${escapeHtml(s.name)}</span><span style="font-size:11px;color:#059669;font-weight:600;">✅ ${escapeHtml((sub.waktuKumpul||'').slice(0,16).replace('T',' '))}</span></div>
            ${sub.jawabanTeks ? `<div class="text-strong" style="font-size:13px;margin-top:4px;">${escapeHtml(sub.jawabanTeks)}</div>` : ''}
            ${sub.foto ? `<img src="${sub.foto}" alt="Foto jawaban" style="max-width:120px;border-radius:8px;margin-top:6px;cursor:pointer;" onclick="lihatFotoBesar(this.src)">` : ''}
          </div>`;
        }).join('');
        });
      }, err => { area.innerHTML = `<p style="color:#dc2626;">Gagal memuat: ${err.message}</p>`; });
    }
    function tutupDetailTugas() { document.getElementById('tugasDetailCard').style.display = 'none'; }

    // ============================================================
    // KALENDER AKADEMIK
    // ============================================================
    // Menggabungkan 3 sumber: agenda manual (kalender_akademik, diisi Admin/Kepsek: Libur &
    // Agenda Akademik), Acara (allEvents, sudah ada dari fitur lain), dan Ujian (allUjian,
    // sudah ada). Jadi kalender ini otomatis lengkap tanpa perlu input ulang Acara/Ujian yang
    // sudah dicatat di menu lain.
    let kalenderBulanAktif = new Date().getMonth(), kalenderTahunAktif = new Date().getFullYear();
    function setupKalenderAkademikPage() {
      const now = new Date();
      kalenderBulanAktif = now.getMonth(); kalenderTahunAktif = now.getFullYear();
      const formCard = document.getElementById('kalenderAdminFormCard');
      if (formCard) formCard.style.display = (isAdmin() || isKepsek()) ? 'block' : 'none';
      renderKalenderAkademik();
    }
    function ubahBulanKalender(delta) {
      kalenderBulanAktif += delta;
      if (kalenderBulanAktif > 11) { kalenderBulanAktif = 0; kalenderTahunAktif++; }
      else if (kalenderBulanAktif < 0) { kalenderBulanAktif = 11; kalenderTahunAktif--; }
      renderKalenderAkademik();
    }
    function kembaliKeBulanIni() {
      const now = new Date();
      kalenderBulanAktif = now.getMonth(); kalenderTahunAktif = now.getFullYear();
      renderKalenderAkademik();
    }
    // Ambil semua "agenda" (dari 3 sumber) yang jatuh pada tanggal tertentu (YYYY-MM-DD).
    function agendaPadaTanggal(dateStr) {
      const hasil = [];
      allKalenderAkademik.forEach(k => {
        const mulai = k.tanggalMulai, selesai = k.tanggalSelesai || k.tanggalMulai;
        if (dateStr >= mulai && dateStr <= selesai) hasil.push({ jenis: k.jenis, judul: k.judul, keterangan: k.keterangan, key: k.key, sumber: 'manual' });
      });
      allEvents.forEach(e => { if (e.tanggal === dateStr) hasil.push({ jenis: 'acara', judul: e.nama, keterangan: e.jenis, sumber: 'acara' }); });
      allUjian.forEach(u => { if (u.tanggal === dateStr) hasil.push({ jenis: 'ujian', judul: u.nama, keterangan: u.jenis, sumber: 'ujian' }); });
      return hasil;
    }
    function renderKalenderAkademik() {
      const label = document.getElementById('kalenderBulanLabel');
      const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][kalenderBulanAktif];
      label.textContent = `${namaBulan} ${kalenderTahunAktif}`;
      const grid = document.getElementById('kalenderGrid');
      const warnaJenis = { libur: '#dc2626', ujian: '#7c3aed', acara: '#f59e0b', akademik: '#059669' };
      const hariHeader = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(h => `<div class="text-muted" style="text-align:center;font-size:11px;font-weight:700;padding:4px 0;">${h}</div>`).join('');
      const tanggal1 = new Date(kalenderTahunAktif, kalenderBulanAktif, 1);
      const jumlahHari = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();
      const offsetAwal = tanggal1.getDay();
      const todayStr = tglLokal();
      let sel = '';
      for (let i = 0; i < offsetAwal; i++) sel += '<div></div>';
      for (let d = 1; d <= jumlahHari; d++) {
        const dateStr = `${kalenderTahunAktif}-${String(kalenderBulanAktif+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const agenda = agendaPadaTanggal(dateStr);
        const dots = [...new Set(agenda.map(a=>a.jenis))].map(j => `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${warnaJenis[j]||'#9ca3af'};margin:0 1px;"></span>`).join('');
        const isToday = dateStr === todayStr;
        sel += `<div onclick="lihatHariKalender('${dateStr}')" style="cursor:pointer;text-align:center;padding:6px 2px;border-radius:8px;background:${isToday?'#eff6ff':'transparent'};border:${isToday?'1px solid #93c5fd':'1px solid transparent'};">
          <div style="font-size:12px;font-weight:${isToday?'700':'400'};color:${isToday?'#2563eb':'#374151'};">${d}</div>
          <div style="height:8px;">${dots}</div>
        </div>`;
      }
      grid.innerHTML = hariHeader + sel;
      renderKalenderList(null);
    }
    function lihatHariKalender(dateStr) { renderKalenderList(dateStr); }
    function renderKalenderList(filterTanggal) {
      const box = document.getElementById('kalenderListArea'), title = document.getElementById('kalenderListTitle');
      const warnaJenis = { libur: '#dc2626', ujian: '#7c3aed', acara: '#f59e0b', akademik: '#059669' };
      const iconJenis = { libur: '🔴', ujian: '🟣', acara: '🟠', akademik: '🟢' };
      let daftar = [];
      if (filterTanggal) {
        title.innerHTML = `Agenda ${escapeHtml(filterTanggal)} <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:8px;" onclick="renderKalenderList(null)">✕ Lihat sebulan</button>`;
        daftar = agendaPadaTanggal(filterTanggal).map(a => ({ ...a, tanggal: filterTanggal }));
      } else {
        const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][kalenderBulanAktif];
        title.textContent = `Agenda Bulan ${namaBulan} ${kalenderTahunAktif}`;
        const jumlahHari = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();
        for (let d = 1; d <= jumlahHari; d++) {
          const dateStr = `${kalenderTahunAktif}-${String(kalenderBulanAktif+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          agendaPadaTanggal(dateStr).forEach(a => daftar.push({ ...a, tanggal: dateStr }));
        }
      }
      if (daftar.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada agenda.</p>'; return; }
      box.innerHTML = daftar.map(a => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;">
          <div>
            <span style="font-size:13px;">${iconJenis[a.jenis]||'📌'} <strong>${escapeHtml(a.judul)}</strong></span>
            <span class="text-muted" style="font-size:11px;"> — ${escapeHtml(a.tanggal)}${a.keterangan ? ' — ' + escapeHtml(a.keterangan) : ''}</span>
          </div>
          ${(a.sumber === 'manual' && isAdmin()) ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;flex-shrink:0;" onclick="hapusAgendaKalender('${a.key}')">🗑️</button>` : ''}
        </div>`).join('');
    }
    // Data resmi: SKB 3 Menteri (Kemenag+Kemenaker+KemenPANRB) ttg Hari Libur Nasional & Cuti
    // Bersama 2026 (ditetapkan 19 Sept 2025) dan 2027 (No. 1205/3/2 Tahun 2026, ditetapkan
    // 15 Sept 2026; sumber: Setneg, dicek 21 Sept 2026), digabung dengan Kalender Pendidikan Madrasah TA
    // 2026/2027 (SK Dirjen Pendis Kemenag No. 4860 Tahun 2026, ditetapkan 13 Juni 2026). Dicek
    // ulang lewat pencarian web tanggal 14 Sept 2026 -- kalau ada perubahan resmi susulan
    // (mis. tanggal Idul Fitri 1448H yg masih "menyesuaikan ketetapan pemerintah"), perlu
    // diperbarui manual nanti oleh Admin.
    const KALENDER_NASIONAL_SEED = [
      // --- Libur Nasional 2026 (17 hari, SKB 3 Menteri) ---
      { jenis:'libur', judul:'Tahun Baru Masehi 2026', tanggalMulai:'2026-01-01', tanggalSelesai:'2026-01-01' },
      { jenis:'libur', judul:'Isra Mikraj Nabi Muhammad SAW', tanggalMulai:'2026-01-16', tanggalSelesai:'2026-01-16' },
      { jenis:'libur', judul:'Tahun Baru Imlek 2577 Kongzili', tanggalMulai:'2026-02-17', tanggalSelesai:'2026-02-17' },
      { jenis:'libur', judul:'Hari Suci Nyepi (Tahun Baru Saka 1948)', tanggalMulai:'2026-03-19', tanggalSelesai:'2026-03-19' },
      { jenis:'libur', judul:'Hari Raya Idul Fitri 1447 H', tanggalMulai:'2026-03-21', tanggalSelesai:'2026-03-22' },
      { jenis:'libur', judul:'Wafat Yesus Kristus', tanggalMulai:'2026-04-03', tanggalSelesai:'2026-04-03' },
      { jenis:'libur', judul:'Kebangkitan Yesus Kristus (Paskah)', tanggalMulai:'2026-04-05', tanggalSelesai:'2026-04-05' },
      { jenis:'libur', judul:'Hari Buruh Internasional', tanggalMulai:'2026-05-01', tanggalSelesai:'2026-05-01' },
      { jenis:'libur', judul:'Kenaikan Yesus Kristus', tanggalMulai:'2026-05-14', tanggalSelesai:'2026-05-14' },
      { jenis:'libur', judul:'Hari Raya Idul Adha 1447 H', tanggalMulai:'2026-05-27', tanggalSelesai:'2026-05-27' },
      { jenis:'libur', judul:'Hari Raya Waisak 2570 BE', tanggalMulai:'2026-05-31', tanggalSelesai:'2026-05-31' },
      { jenis:'libur', judul:'Hari Lahir Pancasila', tanggalMulai:'2026-06-01', tanggalSelesai:'2026-06-01' },
      { jenis:'libur', judul:'Tahun Baru Islam 1448 H (1 Muharram)', tanggalMulai:'2026-06-16', tanggalSelesai:'2026-06-16' },
      { jenis:'libur', judul:'Hari Proklamasi Kemerdekaan RI', tanggalMulai:'2026-08-17', tanggalSelesai:'2026-08-17' },
      { jenis:'libur', judul:'Maulid Nabi Muhammad SAW', tanggalMulai:'2026-08-25', tanggalSelesai:'2026-08-25' },
      { jenis:'libur', judul:'Kelahiran Yesus Kristus (Natal)', tanggalMulai:'2026-12-25', tanggalSelesai:'2026-12-25' },
      // --- Cuti Bersama 2026 (8 hari, SKB 3 Menteri) ---
      { jenis:'libur', judul:'Cuti Bersama Tahun Baru Imlek', tanggalMulai:'2026-02-16', tanggalSelesai:'2026-02-16' },
      { jenis:'libur', judul:'Cuti Bersama Hari Suci Nyepi', tanggalMulai:'2026-03-18', tanggalSelesai:'2026-03-18' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1447 H', tanggalMulai:'2026-03-20', tanggalSelesai:'2026-03-20' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1447 H', tanggalMulai:'2026-03-23', tanggalSelesai:'2026-03-24' },
      { jenis:'libur', judul:'Cuti Bersama Kenaikan Yesus Kristus', tanggalMulai:'2026-05-15', tanggalSelesai:'2026-05-15' },
      { jenis:'libur', judul:'Cuti Bersama Idul Adha 1447 H', tanggalMulai:'2026-05-28', tanggalSelesai:'2026-05-28' },
      { jenis:'libur', judul:'Cuti Bersama Natal', tanggalMulai:'2026-12-24', tanggalSelesai:'2026-12-24' },
      // --- Kalender Pendidikan Madrasah TA 2026/2027 (Kemenag, agenda akademik non-libur-nasional) ---
      { jenis:'akademik', judul:'Awal Masuk Tahun Ajaran 2026/2027', tanggalMulai:'2026-07-13', tanggalSelesai:'2026-07-13' },
      { jenis:'akademik', judul:'Pengenalan Lingkungan Madrasah (Matsama)', tanggalMulai:'2026-07-13', tanggalSelesai:'2026-07-18' },
      { jenis:'akademik', judul:'Asesmen Sumatif Akhir Semester (ASAS) Gasal', tanggalMulai:'2026-11-23', tanggalSelesai:'2026-12-05' },
      { jenis:'akademik', judul:'Penyerahan Rapor Semester Gasal', tanggalMulai:'2026-12-18', tanggalSelesai:'2026-12-18' },
      { jenis:'libur', judul:'Libur Semester Gasal', tanggalMulai:'2026-12-21', tanggalSelesai:'2027-01-02' },
      { jenis:'akademik', judul:'Awal Masuk Semester Genap', tanggalMulai:'2027-01-04', tanggalSelesai:'2027-01-04' },
      { jenis:'libur', judul:'Libur Idul Fitri 1448 H (menyesuaikan ketetapan pemerintah)', tanggalMulai:'2027-03-06', tanggalSelesai:'2027-03-13', keterangan: 'Rentang libur madrasah menurut Kaldik. SKB 3 Menteri (15 Sep 2026): Idul Fitri 10-11 Mar 2027 + cuti bersama 9, 12, 15 Mar; tanggal final Idul Fitri ditetapkan Menteri Agama' },
      { jenis:'libur', judul:'Libur Akhir Tahun Ajaran 2026/2027', tanggalMulai:'2027-06-21', tanggalSelesai:'2027-07-10' },
      // --- Libur Nasional 2027 (18 hari, SKB 3 Menteri No. 1205/3/2 Tahun 2026, ditetapkan 15 Sept 2026) ---
      // Tanggal Idul Fitri/Idul Adha 1448 H final ditetapkan dengan Keputusan Menteri Agama.
      { jenis:'libur', judul:'Tahun Baru 2027 Masehi', tanggalMulai:'2027-01-01', tanggalSelesai:'2027-01-01' },
      { jenis:'libur', judul:'Isra Mikraj Nabi Muhammad SAW', tanggalMulai:'2027-01-05', tanggalSelesai:'2027-01-05' },
      { jenis:'libur', judul:'Tahun Baru Imlek 2578 Kongzili', tanggalMulai:'2027-02-06', tanggalSelesai:'2027-02-06' },
      { jenis:'libur', judul:'Hari Suci Nyepi (Tahun Baru Saka 1949)', tanggalMulai:'2027-03-08', tanggalSelesai:'2027-03-08' },
      { jenis:'libur', judul:'Hari Raya Idul Fitri 1448 H', tanggalMulai:'2027-03-10', tanggalSelesai:'2027-03-11' },
      { jenis:'libur', judul:'Wafat Yesus Kristus', tanggalMulai:'2027-03-26', tanggalSelesai:'2027-03-26' },
      { jenis:'libur', judul:'Kebangkitan Yesus Kristus (Paskah)', tanggalMulai:'2027-03-28', tanggalSelesai:'2027-03-28' },
      { jenis:'libur', judul:'Hari Buruh Internasional', tanggalMulai:'2027-05-01', tanggalSelesai:'2027-05-01' },
      { jenis:'libur', judul:'Kenaikan Yesus Kristus', tanggalMulai:'2027-05-06', tanggalSelesai:'2027-05-06' },
      { jenis:'libur', judul:'Hari Raya Idul Adha 1448 H', tanggalMulai:'2027-05-17', tanggalSelesai:'2027-05-17' },
      { jenis:'libur', judul:'Hari Raya Waisak 2571 BE', tanggalMulai:'2027-05-20', tanggalSelesai:'2027-05-20' },
      { jenis:'libur', judul:'Hari Lahir Pancasila', tanggalMulai:'2027-06-01', tanggalSelesai:'2027-06-01' },
      { jenis:'libur', judul:'Tahun Baru Islam 1449 H (1 Muharram)', tanggalMulai:'2027-06-06', tanggalSelesai:'2027-06-06' },
      { jenis:'libur', judul:'Hari Proklamasi Kemerdekaan RI', tanggalMulai:'2027-08-17', tanggalSelesai:'2027-08-17' },
      { jenis:'libur', judul:'Maulid Nabi Muhammad SAW', tanggalMulai:'2027-08-15', tanggalSelesai:'2027-08-15' },
      { jenis:'libur', judul:'Kelahiran Yesus Kristus (Natal)', tanggalMulai:'2027-12-25', tanggalSelesai:'2027-12-25' },
      { jenis:'libur', judul:'Isra Mikraj Nabi Muhammad SAW', tanggalMulai:'2027-12-26', tanggalSelesai:'2027-12-26' },
      // --- Cuti Bersama 2027 (8 hari, SKB 3 Menteri) ---
      { jenis:'libur', judul:'Cuti Bersama Tahun Baru Imlek', tanggalMulai:'2027-02-05', tanggalSelesai:'2027-02-05' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1448 H', tanggalMulai:'2027-03-09', tanggalSelesai:'2027-03-09' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1448 H', tanggalMulai:'2027-03-12', tanggalSelesai:'2027-03-12' },
      { jenis:'libur', judul:'Cuti Bersama Idul Fitri 1448 H', tanggalMulai:'2027-03-15', tanggalSelesai:'2027-03-15' },
      { jenis:'libur', judul:'Cuti Bersama Wafat Yesus Kristus', tanggalMulai:'2027-03-25', tanggalSelesai:'2027-03-25' },
      { jenis:'libur', judul:'Cuti Bersama Idul Adha 1448 H', tanggalMulai:'2027-05-18', tanggalSelesai:'2027-05-18' },
      { jenis:'libur', judul:'Cuti Bersama Waisak', tanggalMulai:'2027-05-19', tanggalSelesai:'2027-05-19' },
      { jenis:'libur', judul:'Cuti Bersama Natal', tanggalMulai:'2027-12-24', tanggalSelesai:'2027-12-24' }
    ];
    function imporKalenderNasional() {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const belumAda = KALENDER_NASIONAL_SEED.filter(k => !allKalenderAkademik.some(existing => existing.judul === k.judul && existing.tanggalMulai === k.tanggalMulai));
      if (belumAda.length === 0) { toast('✅ Semua agenda resmi ini sudah ada di kalender.'); return; }
      if (!doubleConfirm(`Impor ${belumAda.length} agenda resmi (Libur Nasional 2026-2027 & Kaldik Madrasah 2026/2027)? Yang sudah ada di kalender akan dilewati otomatis.`)) return;
      const updates = {};
      belumAda.forEach(k => {
        const key = db.ref('kalender_akademik').push().key;
        updates[key] = { jenis: k.jenis, judul: k.judul, tanggalMulai: k.tanggalMulai, tanggalSelesai: k.tanggalSelesai, keterangan: k.keterangan || null, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      });
      db.ref('kalender_akademik').update(updates, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast(`✅ ${belumAda.length} agenda resmi berhasil diimpor!`); addLog('impor_kalender_nasional', belumAda.length + ' agenda');
        Object.entries(updates).forEach(([key, val]) => allKalenderAkademik.push({ key, ...val }));
        renderKalenderAkademik();
      });
    }

    // ===== BEGIN CHOOSER-HARIINI =====
    // "Ucapan hari ini" di halaman awal (sebelum login): Isra Mi'raj -> "Selamat memperingati Isra Mi'raj",
    // Minggu -> "Selamat berlibur", masa ujian -> "Selamat menempuh ...", dst.
    // Sumber: (1) KALENDER_NASIONAL_SEED yang tertanam di app (jalan offline & tanpa Firebase),
    // (2) hari peringatan tetap di bawah, (3) Kalender Akademik/Acara/Ujian dari Firebase (dibaca setelah
    // auth anonim siap, di-cache di localStorage supaya tetap tampil saat offline).
    // Kalau ada beberapa agenda pada hari yang sama, dipilih yang paling spesifik (skor tertinggi).
    // Semua teks dari Firebase dirender dengan textContent (bukan innerHTML) -> aman dari XSS.
    const HARIINI_TETAP = {   // 'BB-HH' -> hari peringatan/libur tetap (fallback untuk tahun yang belum ada di seed)
      '01-01': { score: 100, emoji: '🎉', text: y => `Selamat Tahun Baru ${y}! Semoga tahun ini penuh berkah` },
      '04-21': { score: 60,  emoji: '🌺', text: () => 'Selamat Hari Kartini' },
      '05-01': { score: 100, emoji: '🛠️', text: () => 'Selamat Hari Buruh Internasional' },
      '05-02': { score: 60,  emoji: '📚', text: () => 'Selamat Hari Pendidikan Nasional. Mari terus belajar dan mendidik dengan hati' },
      '06-01': { score: 100, emoji: '🦅', text: () => 'Selamat Hari Lahir Pancasila' },
      '07-23': { score: 60,  emoji: '🧒', text: () => 'Selamat Hari Anak Nasional' },
      '08-17': { score: 100, emoji: '🇮🇩', text: y => `Dirgahayu Republik Indonesia ke-${y - 1945}! Selamat Hari Kemerdekaan` },
      '10-22': { score: 60,  emoji: '🕌', text: () => 'Selamat Hari Santri' },
      '10-28': { score: 60,  emoji: '✊', text: () => 'Selamat Hari Sumpah Pemuda' },
      '11-10': { score: 60,  emoji: '🎖️', text: () => 'Selamat Hari Pahlawan. Mari teladani semangat para pahlawan' },
      '11-25': { score: 60,  emoji: '🙏', text: () => 'Selamat Hari Guru Nasional. Terima kasih, Bapak/Ibu Guru' },
      '12-22': { score: 60,  emoji: '💐', text: () => 'Selamat Hari Ibu' },
      '12-25': { score: 100, emoji: '🕊️', text: () => 'Libur nasional: Hari Natal. Selamat merayakan bagi yang merayakan, dan selamat berlibur!' }
    };
    // Aturan per judul agenda (yang cocok pertama menang). j = judul, y = tahun tanggal yang dicek.
    const HARIINI_ATURAN = [
      { re: /isra\s*mi['’`]?(kraj|raj)/i,               score: 100, emoji: '🌙', text: () => "Selamat memperingati Isra Mi'raj Nabi Muhammad SAW" },
      { re: /cuti\s*bersama/i,                          score: 55,  emoji: '🗓️', text: j => j.replace(/^\s*cuti\s*bersama\s*/i, 'Cuti bersama ').trim() + '. Selamat berlibur!' },
      { re: /^\s*(hari\s*raya\s*)?idul\s*fitri/i,       score: 100, emoji: '🌙', text: () => 'Selamat Hari Raya Idul Fitri. Taqabbalallahu minna wa minkum, mohon maaf lahir dan batin' },
      { re: /^\s*(hari\s*raya\s*)?idul\s*adha/i,        score: 100, emoji: '🕋', text: () => 'Selamat Hari Raya Idul Adha. Taqabbalallahu minna wa minkum' },
      { re: /tahun\s*baru\s*islam|1\s*mu?harram?/i,     score: 100, emoji: '🌙', text: () => 'Selamat Tahun Baru Islam 1 Muharram. Semoga tahun yang baru penuh berkah' },
      { re: /maulid/i,                                  score: 100, emoji: '🕌', text: () => 'Selamat memperingati Maulid Nabi Muhammad SAW' },
      { re: /^\s*tahun\s*baru(\s*masehi|\s*\d{4})/i,    score: 100, emoji: '🎉', text: (j, y) => `Selamat Tahun Baru ${y}! Semoga tahun ini penuh berkah` },
      { re: /proklamasi|kemerdekaan/i,                  score: 100, emoji: '🇮🇩', text: (j, y) => `Dirgahayu Republik Indonesia ke-${y - 1945}! Selamat Hari Kemerdekaan` },
      { re: /lahir\s*pancasila/i,                       score: 100, emoji: '🦅', text: () => 'Selamat Hari Lahir Pancasila' },
      { re: /buruh/i,                                   score: 100, emoji: '🛠️', text: () => 'Selamat Hari Buruh Internasional' },
      { re: /imlek|nyepi|waisak|natal|kelahiran\s*yesus|wafat\s*yesus|paskah|kebangkitan\s*yesus|kenaikan\s*yesus/i,
                                                        score: 100, emoji: '🕊️', text: j => `Libur nasional: ${j.replace(/\s*\(.*?\)\s*/g, ' ').trim()}. Selamat merayakan bagi yang merayakan, dan selamat berlibur!` },
      { re: /asesmen|\basas\b|ujian|penilaian\s*(tengah|akhir)|sumatif|\b(pts|pas|sts|sas|pat)\b|ulangan/i,
                                                        score: 90,  emoji: '📝', text: j => `Selamat menempuh ${j}. Semoga sukses dan diberi kemudahan` },
      { re: /rapor|raport/i,                            score: 80,  emoji: '📄', text: j => `${j}. Terima kasih atas dukungan Bapak/Ibu wali murid` },
      { re: /awal\s*masuk|masuk\s*tahun\s*ajaran|matsama|pengenalan\s*lingkungan/i,
                                                        score: 80,  emoji: '🎒', text: j => `Selamat datang kembali! ${j}` },
      { re: /libur/i,                                   score: 50,  emoji: '🌴', text: j => `Selamat berlibur! ${j.replace(/\s*\(.*?\)\s*/g, ' ').trim()}` }
    ];
    const HARIINI = { items: [], el: null, emoji: null, text: null, chooser: null, lastDate: '', lastFetch: 0, fetching: false, obs: null };
    const HARIINI_CACHE_KEY = 'simambaHariIniCache';

    function hariIniKandidat(it, y) {
      const j = String(it.judul || '').trim();
      if (!j) return null;
      if (it.jenis === 'ujian') return { score: 90, emoji: '📝', text: `Selamat menempuh ${j}. Semoga sukses dan diberi kemudahan` };
      for (let i = 0; i < HARIINI_ATURAN.length; i++) {
        const r = HARIINI_ATURAN[i];
        if (r.re.test(j)) return { score: r.score, emoji: r.emoji, text: r.text(j, y) };
      }
      if (it.jenis === 'libur') return { score: 50, emoji: '🌴', text: `Selamat berlibur! ${j}` };
      if (it.jenis === 'acara' || it.sumber === 'acara') return { score: 70, emoji: '🎉', text: `Hari ini: ${j}. Selamat mengikuti kegiatan!` };
      return { score: 40, emoji: '📌', text: `Hari ini: ${j}` };
    }
    // dateStr 'YYYY-MM-DD' -> {emoji, text} paling spesifik untuk tanggal itu, atau null kalau hari biasa.
    function hariIniPilih(dateStr) {
      const y = parseInt(dateStr.slice(0, 4), 10), md = dateStr.slice(5);
      const cands = [];
      KALENDER_NASIONAL_SEED.concat(HARIINI.items).forEach(it => {
        const mulai = it.tanggalMulai, sel = it.tanggalSelesai || mulai;
        if (!mulai || dateStr < mulai || dateStr > sel) return;
        const c = hariIniKandidat(it, y);
        if (c) cands.push(c);
      });
      const tetap = HARIINI_TETAP[md];
      if (tetap) cands.push({ score: tetap.score, emoji: tetap.emoji, text: tetap.text(y) });
      if (new Date(y, parseInt(md.slice(0, 2), 10) - 1, parseInt(md.slice(3), 10)).getDay() === 0) {
        cands.push({ score: 10, emoji: '🌴', text: 'Selamat berlibur! Selamat menikmati hari Minggu bersama keluarga' });
      }
      cands.sort((a, b) => b.score - a.score);
      return cands[0] || null;
    }
    function hariIniRender() {
      if (!HARIINI.el) return;
      const tgl = tglLokal();
      HARIINI.lastDate = tgl;
      const p = hariIniPilih(tgl);
      if (!p) { HARIINI.el.style.display = 'none'; return; }
      HARIINI.emoji.textContent = p.emoji;
      HARIINI.text.textContent = p.text;
      HARIINI.el.style.display = 'flex';
    }
    function hariIniSimpanCache() {
      try {
        const batas = tglLokal();
        const ringkas = HARIINI.items.filter(it => (it.tanggalSelesai || it.tanggalMulai) >= batas).slice(0, 250);
        localStorage.setItem(HARIINI_CACHE_KEY, JSON.stringify(ringkas));
      } catch (e) {}
    }
    function hariIniMuatCache() {
      try {
        const raw = JSON.parse(localStorage.getItem(HARIINI_CACHE_KEY) || '[]');
        if (Array.isArray(raw)) HARIINI.items = raw.filter(it => it && it.tanggalMulai && it.judul);
      } catch (e) {}
    }
    // Baca agenda dari Firebase (kalender_akademik, events, ujian) SETELAH auth anonim siap. Gagal/offline -> diam,
    // tetap pakai seed + cache. Maksimal sekali per 30 menit.
    function hariIniMuat() {
      if (HARIINI.fetching || !navigator.onLine || !HARIINI.chooser || HARIINI.chooser.style.display === 'none') return;
      if (HARIINI.lastFetch && Date.now() - HARIINI.lastFetch < 30 * 60 * 1000) return;
      HARIINI.fetching = true;
      setTimeout(() => { HARIINI.fetching = false; }, 30000);   // pengaman kalau auth tak kunjung siap
      const jalankan = () => {
        const ambil = (path, n) => Promise.race([
          db.ref(path).limitToLast(n).once('value'),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))
        ]).catch(() => null);
        Promise.all([ambil('kalender_akademik', 300), ambil('events', 150), ambil('ujian', 150)]).then(([k, e, u]) => {
          if (!k && !e && !u) return;
          const out = [];
          if (k) k.forEach(c => { const v = c.val() || {}; if (v.tanggalMulai) out.push({ jenis: v.jenis, judul: String(v.judul || ''), tanggalMulai: v.tanggalMulai, tanggalSelesai: v.tanggalSelesai || v.tanggalMulai, sumber: 'manual' }); });
          if (e) e.forEach(c => { const v = c.val() || {}; if (v.tanggal) out.push({ jenis: 'acara', judul: String(v.nama || ''), tanggalMulai: v.tanggal, tanggalSelesai: v.tanggal, sumber: 'acara' }); });
          if (u) u.forEach(c => { const v = c.val() || {}; if (v.tanggal) out.push({ jenis: 'ujian', judul: String(v.nama || ''), tanggalMulai: v.tanggal, tanggalSelesai: v.tanggal, sumber: 'ujian' }); });
          HARIINI.items = out; HARIINI.lastFetch = Date.now();
          hariIniSimpanCache(); hariIniRender();
        }).then(() => { HARIINI.fetching = false; }, () => { HARIINI.fetching = false; });
      };
      if (auth.currentUser) jalankan();
      else { const off = auth.onAuthStateChanged(u => { if (u) { off(); jalankan(); } }); }
    }
    function hariIniInit() {
      HARIINI.el = document.getElementById('cxHariIni');
      HARIINI.chooser = document.getElementById('loginChooser');
      if (!HARIINI.el || !HARIINI.chooser) return;
      HARIINI.emoji = HARIINI.el.querySelector('.cx-today-emoji');
      HARIINI.text = HARIINI.el.querySelector('.cx-today-text');
      hariIniMuatCache();
      hariIniRender();
      setTimeout(hariIniMuat, 1500);   // beri waktu boot memutuskan: auto-login (halaman awal disembunyikan) tidak perlu baca ini
      // Halaman awal muncul lagi (mis. setelah logout) -> segarkan; ganti hari saat app dibiarkan terbuka -> ganti ucapan.
      new MutationObserver(() => { if (HARIINI.chooser.style.display !== 'none') { hariIniRender(); hariIniMuat(); } })
        .observe(HARIINI.chooser, { attributes: true, attributeFilter: ['style'] });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (tglLokal() !== HARIINI.lastDate) hariIniRender(); hariIniMuat(); } });
      window.addEventListener('online', hariIniMuat);
      setInterval(() => { if (tglLokal() !== HARIINI.lastDate) hariIniRender(); }, 60000);
    }
    hariIniInit();
    // ===== END CHOOSER-HARIINI =====
    function simpanAgendaKalender() {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      if (isBusy('simpanAgendaKalender')) return toast('Sedang menyimpan...', false, 1500);
      const jenis = document.getElementById('kalenderJenis').value;
      const judul = document.getElementById('kalenderJudul').value.trim();
      const tanggalMulai = document.getElementById('kalenderTanggalMulai').value;
      const tanggalSelesai = document.getElementById('kalenderTanggalSelesai').value || null;
      const keterangan = document.getElementById('kalenderKeterangan').value.trim();
      if (!judul || !tanggalMulai) return toast('Judul & tanggal mulai wajib diisi!', true);
      if (tanggalSelesai && tanggalSelesai < tanggalMulai) return toast('Tanggal selesai tidak boleh sebelum tanggal mulai!', true);
      const btnSimpanAgenda = document.getElementById('btnSimpanAgendaKalender');
      setBusy('simpanAgendaKalender', btnSimpanAgenda);
      const ref = db.ref('kalender_akademik').push();
      const data = { jenis, judul, tanggalMulai, tanggalSelesai, keterangan: keterangan || null, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      ref.set(data, err => {
        clearBusy('simpanAgendaKalender', btnSimpanAgenda);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Agenda tersimpan!'); addLog('tambah_agenda_kalender', judul);
        allKalenderAkademik.push({ key: ref.key, ...data });
        document.getElementById('kalenderJudul').value = ''; document.getElementById('kalenderKeterangan').value = ''; document.getElementById('kalenderTanggalSelesai').value = '';
        renderKalenderAkademik();
      });
    }
    function hapusAgendaKalender(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus agenda ini?')) return;
      db.ref('kalender_akademik/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Agenda dihapus.'); addLog('hapus_agenda_kalender', key);
        allKalenderAkademik = allKalenderAkademik.filter(k => k.key !== key);
        renderKalenderAkademik();
      });
    }

    // ============================================================
    // SARAN & KRITIK (dari Portal Orang Tua) -- khusus Admin/Kepsek
    // ============================================================
    function saranKritikCanAccess() { return isAdmin() || isKepsek(); }
    function setupSaranKritikPage() {
      if (!saranKritikCanAccess()) { document.getElementById('saranKritikListArea').innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin & Kepsek.</p>'; return; }
      renderSaranKritikList();
    }
    function updateSaranKritikNotifDot() {
      const dot = document.getElementById('saranKritikNotifDot');
      if (!dot) return;
      const adaBaru = allSaranKritik.some(s => s.status === 'baru');
      dot.classList.toggle('show', adaBaru);
    }
    function renderSaranKritikList() {
      const box = document.getElementById('saranKritikListArea'); if (!box) return;
      const items = [...allSaranKritik].sort((a,b) => COLLATOR_ID.compare((b.waktuKirim||''), a.waktuKirim||''));
      updateSaranKritikNotifDot();
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada saran/kritik masuk.</p>'; return; }
      box.innerHTML = items.map(s => `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;${s.status==='baru'?'background:#fffbeb;':''}">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
            <div>
              <span style="font-size:13px;font-weight:600;">${s.anonim ? '🕶️ Anonim' : escapeHtml(s.siswaNama||'-') + ' (Kelas ' + escapeHtml(s.kelas||'-') + ')'}</span>
              ${s.status==='baru' ? '<span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;margin-left:6px;">BARU</span>' : ''}
              <div class="text-muted" style="font-size:11px;">${escapeHtml((s.waktuKirim||'').slice(0,16).replace('T',' '))}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              ${s.status==='baru' ? `<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="tandaDibacaSaranKritik('${s.key}')">✓ Tandai dibaca</button>` : ''}
              ${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusSaranKritik('${s.key}')">🗑️</button>` : ''}
            </div>
          </div>
          <div style="font-size:13px;margin-top:6px;">${escapeHtml(s.pesan)}</div>
        </div>`).join('');
    }
    function tandaDibacaSaranKritik(key) {
      if (!saranKritikCanAccess()) return;
      db.ref('saran_kritik/'+key).update({ status: 'dibaca' }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        const item = allSaranKritik.find(s => s.key === key); if (item) item.status = 'dibaca';
        renderSaranKritikList();
      });
    }
    function hapusSaranKritik(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus saran/kritik ini?')) return;
      db.ref('saran_kritik/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Dihapus.'); addLog('hapus_saran_kritik', key);
        allSaranKritik = allSaranKritik.filter(s => s.key !== key);
        renderSaranKritikList();
      });
    }

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
      const h = new Date().getHours();
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
      document.getElementById('loginChooser').style.display = 'none';
      bukaPortalOrtuForm();
    }
    function kembaliKeChooser() {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('portalOrtuLogin').style.display = 'none';
      document.getElementById('portalOrtuDashboard').style.display = 'none';
      document.getElementById('loginChooser').style.display = 'flex';
    }
    // ---------- Portal Orang Tua: login No. WA + PIN buatan sendiri ----------
    const ORTU_PIN_ITER = 5000, ORTU_MAX_GAGAL = 5, ORTU_KUNCI_MENIT = 10;
    let portalOrtuWaKey = null, portalOrtuAnak = [], portalOrtuBusy = false;
    function ortuEl(id) { return document.getElementById(id); }
    function ortuWaKey(noWa) { const k = formatNomorWa(noWa); return /^62[0-9]{8,13}$/.test(k) ? k : null; }
    function ortuPinValid(pin) { return /^[0-9]{6}$/.test(pin); }
    function ortuPinTerlaluMudah(pin) { return /^(\d)\1{5}$/.test(pin) || '01234567890123456789'.includes(pin) || '98765432109876543210'.includes(pin); }
    // PBKDF2 (bukan SHA-256 polos) supaya menebak PIN 6 angka dari hash yang bocor jauh lebih lambat.
    function ortuHashPin(pin, waKey) {
      return CryptoJS.PBKDF2(String(pin), 'simamba-ortu::' + waKey, { keySize: 256 / 32, iterations: ORTU_PIN_ITER, hasher: CryptoJS.algo.SHA256 }).toString(CryptoJS.enc.Hex);
    }
    function ortuTampilJam(ms) { return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
    function ortuPesanError(e) { return '❌ ' + ((e && e.tampil) || ('Gagal: ' + ((e && e.message) || e))); }
    function bukaPortalOrtuForm() {
      document.getElementById('loginChooser').style.display = 'none';
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('portalOrtuLogin').style.display = 'flex';
      document.getElementById('portalOrtuDashboard').style.display = 'none';
      ['portalOrtuNoWa', 'portalOrtuPin', 'portalOrtuPinBaru', 'portalOrtuPinBaru2'].forEach(id => { ortuEl(id).value = ''; });
      tampilFormBuatPinOrtu(false);
    }
    function tampilFormBuatPinOrtu(buat) {
      ortuEl('portalOrtuFormMasuk').style.display = buat ? 'none' : 'block';
      ortuEl('portalOrtuFormBuat').style.display = buat ? 'block' : 'none';
      ortuEl('portalOrtuError').textContent = '';
    }
    function tutupPortalOrtu() {
      portalOrtuWaKey = null; portalOrtuAnak = [];
      ortuEl('portalOrtuContent').innerHTML = '';
      ['portalOrtuPinLama', 'portalOrtuPinGanti1', 'portalOrtuPinGanti2'].forEach(id => { ortuEl(id).value = ''; });
      kembaliKeChooser();
    }
    // Semua siswa yang nomor WA-nya sama (kakak-adik bisa berbagi satu nomor orang tua).
    // Cari anak berdasarkan nomor WA wali. Dulu: unduh SELURUH node siswa lalu cocokkan di browser (boros
    // kuota unduhan Spark, apalagi tiap wali murid login). Sekarang: query terindeks siswa/noWaKey
    // (butuh ".indexOn": ["noWaKey"] pada Rules path siswa, dan data diisi lewat migrasiNoWaKeyV1()).
    // Pengaman: kalau query terindeks tidak menemukan apa pun (mis. data belum dimigrasi), jatuh ke
    // pemindaian penuh lama -- tapi hanya SEKALI per sesi halaman, supaya salah ketik nomor berulang
    // tidak terus mengunduh semua siswa.
    let _ortuFallbackDipakai = false;
    function ortuBentukHasilAnak(snap, waKey, cocokkanManual) {
      const hasil = [];
      snap.forEach(c => {
        const x = c.val();
        if (!x) return;
        if (cocokkanManual ? (x.noWaOrtu && formatNomorWa(x.noWaOrtu) === waKey) : true) hasil.push({ key: c.key, ...x });
      });
      return hasil.sort((a, b) => COLLATOR_ID.compare((a.name || ''), b.name || ''));
    }
    function ortuCariAnak(waKey) {
      return db.ref('siswa').orderByChild('noWaKey').equalTo(waKey).once('value').then(snap => {
        const hasil = ortuBentukHasilAnak(snap, waKey, false);
        if (hasil.length || _ortuFallbackDipakai) return hasil;
        _ortuFallbackDipakai = true;
        return db.ref('siswa').once('value').then(semua => ortuBentukHasilAnak(semua, waKey, true));
      });
    }
    // Admin, sekali jalan: isi siswa/{key}/noWaKey untuk semua siswa yang sudah punya noWaOrtu valid.
    // Aman diulang (hanya menulis yang berbeda). Panggil dari Console: await migrasiNoWaKeyV1()
    async function migrasiNoWaKeyV1() {
      if (!isAdmin()) { toast('Hanya Admin!', true); return null; }
      if (!navigator.onLine) { toast('📡 Butuh koneksi internet untuk migrasi.', true); return null; }
      const snap = await db.ref('siswa').once('value');
      const updates = {}; let perlu = 0, total = 0;
      snap.forEach(c => {
        total++;
        const x = c.val() || {};
        const baru = x.noWaOrtu ? (ortuWaKey(x.noWaOrtu) || null) : null;
        if ((x.noWaKey || null) !== baru) { updates['siswa/' + c.key + '/noWaKey'] = baru; perlu++; }
      });
      if (perlu) await db.ref().update(updates);
      const ringkas = { totalSiswa: total, diperbarui: perlu };
      console.log('[SI MAMBA] migrasiNoWaKeyV1 selesai:', ringkas);
      toast(perlu ? ('✅ ' + perlu + ' data siswa diberi noWaKey.') : '✅ Semua data siswa sudah punya noWaKey.');
      return ringkas;
    }
    // Catat 1x salah PIN di server (bukan cuma di browser) -> terkunci 10 menit setelah 5x salah.
    function ortuCatatGagal(waKey) {
      return db.ref('ortu_akun/' + waKey).transaction(cur => {
        if (!cur) return cur;
        const n = (cur.gagal || 0) + 1;
        if (n >= ORTU_MAX_GAGAL) { cur.gagal = 0; cur.kunciSampai = Date.now() + ORTU_KUNCI_MENIT * 60000; }
        else { cur.gagal = n; }
        return cur;
      }).then(res => {
        const v = res.snapshot.val() || {};
        if (v.kunciSampai && v.kunciSampai > Date.now()) return { tampil: `PIN salah terlalu sering. Akun dikunci sampai pukul ${ortuTampilJam(v.kunciSampai)}.` };
        return { tampil: `PIN salah. Sisa percobaan: ${Math.max(0, ORTU_MAX_GAGAL - (v.gagal || 0))}.` };
      }).catch(() => ({ tampil: 'PIN salah.' }));
    }
    function loginPortalOrtu() {
      const errEl = ortuEl('portalOrtuError');
      if (portalOrtuBusy) return;
      if (typeof CryptoJS === 'undefined') { errEl.textContent = '❌ Komponen keamanan belum termuat. Muat ulang halaman lalu coba lagi.'; return; }
      const waKey = ortuWaKey(ortuEl('portalOrtuNoWa').value);
      const pin = ortuEl('portalOrtuPin').value.trim();
      if (!waKey) { errEl.textContent = '⚠️ Nomor WhatsApp tidak valid.'; return; }
      if (!ortuPinValid(pin)) { errEl.textContent = '⚠️ PIN harus 6 angka.'; return; }
      portalOrtuBusy = true; errEl.textContent = '⏳ Memeriksa...';
      db.ref('ortu_akun/' + waKey).once('value').then(snap => {
        const akun = snap.val();
        if (!akun || !akun.pin) throw { tampil: 'Belum ada PIN untuk nomor ini. Klik "Belum punya PIN? Buat PIN".' };
        if (akun.kunciSampai && akun.kunciSampai > Date.now()) throw { tampil: `Akun dikunci karena PIN salah terlalu sering. Coba lagi pukul ${ortuTampilJam(akun.kunciSampai)}, atau minta Admin mereset PIN.` };
        if (ortuHashPin(pin, waKey) !== akun.pin) return ortuCatatGagal(waKey).then(pesan => { throw pesan; });
        db.ref('ortu_akun/' + waKey).update({ gagal: 0, kunciSampai: null, terakhirLogin: new Date().toISOString() }).catch(() => {});
        return ortuCariAnak(waKey).then(anak => {
          if (!anak.length) throw { tampil: 'Nomor ini tidak lagi terdaftar di data siswa. Hubungi wali kelas/Admin.' };
          bukaDashboardPortalOrtu(waKey, anak);
        });
      }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    function buatPinOrtu() {
      const errEl = ortuEl('portalOrtuError');
      if (portalOrtuBusy) return;
      if (typeof CryptoJS === 'undefined') { errEl.textContent = '❌ Komponen keamanan belum termuat. Muat ulang halaman lalu coba lagi.'; return; }
      const waKey = ortuWaKey(ortuEl('portalOrtuNoWa').value);
      const pin1 = ortuEl('portalOrtuPinBaru').value.trim(), pin2 = ortuEl('portalOrtuPinBaru2').value.trim();
      if (!waKey) { errEl.textContent = '⚠️ Nomor WhatsApp tidak valid.'; return; }
      if (!ortuPinValid(pin1)) { errEl.textContent = '⚠️ PIN harus 6 angka.'; return; }
      if (ortuPinTerlaluMudah(pin1)) { errEl.textContent = '⚠️ PIN terlalu mudah ditebak (mis. 123456 / 111111). Pilih PIN lain.'; return; }
      if (pin1 !== pin2) { errEl.textContent = '⚠️ Ulangi PIN tidak sama.'; return; }
      portalOrtuBusy = true; errEl.textContent = '⏳ Memeriksa nomor...';
      ortuCariAnak(waKey).then(anak => {
        if (!anak.length) throw { tampil: 'Nomor WA ini belum terdaftar di data siswa. Hubungi wali kelas/Admin agar nomor Anda diisi di data siswa.' };
        const hash = ortuHashPin(pin1, waKey), sekarang = new Date().toISOString();
        return db.ref('ortu_akun/' + waKey).transaction(cur => cur ? undefined : { pin: hash, v: 1, dibuat: sekarang, terakhirLogin: sekarang }).then(res => {
          if (!res.committed) throw { tampil: 'PIN untuk nomor ini sudah pernah dibuat. Silakan masuk dengan PIN Anda. Lupa PIN? Hubungi Admin untuk reset.' };
          bukaDashboardPortalOrtu(waKey, anak);
        });
      }).catch(e => { errEl.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    function bukaDashboardPortalOrtu(waKey, anak) {
      portalOrtuWaKey = waKey; portalOrtuAnak = anak;
      ortuEl('portalOrtuError').textContent = '';
      ['portalOrtuPin', 'portalOrtuPinBaru', 'portalOrtuPinBaru2'].forEach(id => { ortuEl(id).value = ''; });
      ortuEl('portalOrtuLogin').style.display = 'none';
      ortuEl('portalOrtuDashboard').style.display = 'block';
      ortuEl('portalOrtuGantiPin').style.display = 'none';
      const sel = ortuEl('portalOrtuAnakSelect');
      sel.innerHTML = anak.map(a => `<option value="${escapeHtml(a.key)}">${escapeHtml(a.name || '-')} — ${escapeHtml(a.kelas || '-')}</option>`).join('');
      ortuEl('portalOrtuAnakWrap').style.display = anak.length > 1 ? 'block' : 'none';
      renderPortalOrtuDashboard(anak[0]);
    }
    function pilihAnakPortalOrtu(key) {
      const a = portalOrtuAnak.find(x => x.key === key);
      if (a) renderPortalOrtuDashboard(a);
    }
    function toggleGantiPinOrtu() {
      const box = ortuEl('portalOrtuGantiPin');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
      ortuEl('portalOrtuGantiPinMsg').textContent = '';
    }
    function gantiPinOrtu() {
      const msg = ortuEl('portalOrtuGantiPinMsg');
      if (portalOrtuBusy || !portalOrtuWaKey) return;
      const lama = ortuEl('portalOrtuPinLama').value.trim(), baru1 = ortuEl('portalOrtuPinGanti1').value.trim(), baru2 = ortuEl('portalOrtuPinGanti2').value.trim();
      msg.style.color = '#dc2626';
      if (!ortuPinValid(lama) || !ortuPinValid(baru1)) { msg.textContent = '⚠️ PIN harus 6 angka.'; return; }
      if (ortuPinTerlaluMudah(baru1)) { msg.textContent = '⚠️ PIN baru terlalu mudah ditebak. Pilih PIN lain.'; return; }
      if (baru1 !== baru2) { msg.textContent = '⚠️ Ulangi PIN baru tidak sama.'; return; }
      const waKey = portalOrtuWaKey;
      portalOrtuBusy = true; msg.textContent = '⏳ Menyimpan...';
      db.ref('ortu_akun/' + waKey).once('value').then(snap => {
        const akun = snap.val();
        if (!akun || !akun.pin) throw { tampil: 'Akun tidak ditemukan (mungkin sudah direset Admin). Silakan masuk ulang.' };
        if (akun.kunciSampai && akun.kunciSampai > Date.now()) throw { tampil: `Akun dikunci sampai pukul ${ortuTampilJam(akun.kunciSampai)}.` };
        if (ortuHashPin(lama, waKey) !== akun.pin) return ortuCatatGagal(waKey).then(pesan => { throw pesan; });
        return db.ref('ortu_akun/' + waKey).update({ pin: ortuHashPin(baru1, waKey), diubah: new Date().toISOString(), gagal: 0, kunciSampai: null }).then(() => {
          msg.style.color = '#059669'; msg.textContent = '✅ PIN berhasil diganti.';
          ['portalOrtuPinLama', 'portalOrtuPinGanti1', 'portalOrtuPinGanti2'].forEach(id => { ortuEl(id).value = ''; });
        });
      }).catch(e => { msg.style.color = '#dc2626'; msg.textContent = ortuPesanError(e); })
        .finally(() => { portalOrtuBusy = false; });
    }
    // ---------- Admin: daftar akun portal + Reset PIN ----------
    let ortuAkunCache = [];
    function renderOrtuAkunAdmin() {
      const card = ortuEl('ortuAkunCard'); if (!card) return;
      card.style.display = isAdmin() ? 'block' : 'none';
      if (!isAdmin()) return;
      const list = ortuEl('ortuAkunList');
      list.innerHTML = '<p class="text-muted" style="font-size:13px;">Memuat akun...</p>';
      db.ref('ortu_akun').once('value').then(snap => {
        ortuAkunCache = []; snap.forEach(c => { ortuAkunCache.push({ wa: c.key, ...(c.val() || {}) }); });
        renderOrtuAkunList();
      }).catch(err => { list.innerHTML = `<p style="color:#dc2626;font-size:13px;">Gagal memuat: ${escapeHtml(err.message)}</p>`; });
    }
    function renderOrtuAkunList() {
      const list = ortuEl('ortuAkunList'); if (!list) return;
      const q = (ortuEl('ortuAkunCari').value || '').trim().toLowerCase();
      const qDigit = q.replace(/[^0-9]/g, '');
      const fmtTgl = iso => iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      const rows = ortuAkunCache.map(a => ({ ...a, anak: (allSiswa || []).filter(x => x.noWaOrtu && formatNomorWa(x.noWaOrtu) === a.wa) }))
        .filter(a => !q || a.anak.some(x => (x.name || '').toLowerCase().includes(q)) || (qDigit && (a.wa.includes(qDigit) || a.wa.includes('62' + qDigit.replace(/^0/, '')))))
        .sort((x, y) => COLLATOR_ID.compare((x.anak[0] ? x.anak[0].name : 'zzz'), y.anak[0] ? y.anak[0].name : 'zzz'));
      if (!rows.length) { list.innerHTML = `<p class="text-muted" style="font-size:13px;">${ortuAkunCache.length ? 'Tidak ada yang cocok.' : 'Belum ada orang tua yang membuat PIN.'}</p>`; return; }
      list.innerHTML = rows.map(a => {
        const nama = a.anak.length ? a.anak.map(x => x.name).join(', ') : '(nama siswa tidak ditemukan)';
        const terkunci = a.kunciSampai && a.kunciSampai > Date.now() ? ' • <span style="color:#dc2626;font-weight:600;">🔒 terkunci</span>' : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;flex-wrap:wrap;">
          <div style="min-width:0;"><div style="font-weight:600;font-size:14px;">${escapeHtml(nama)}</div>
          <div class="text-muted" style="font-size:12px;">📱 0${escapeHtml(a.wa.slice(2))} • PIN dibuat ${escapeHtml(fmtTgl(a.dibuat))} • login terakhir ${escapeHtml(fmtTgl(a.terakhirLogin))}${terkunci}</div></div>
          <button class="btn btn-warning" style="padding:6px 12px;font-size:12px;" data-wa="${escapeHtml(a.wa)}" onclick="resetPinOrtu(this.dataset.wa)">🔄 Reset PIN</button></div>`;
      }).join('');
    }
    function resetPinOrtu(waKey, onDone) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!/^62[0-9]{8,13}$/.test(waKey || '')) return toast('Nomor tidak valid!', true);
      const tampil = '0' + waKey.slice(2);
      if (!confirm(`Reset PIN Portal Orang Tua untuk nomor ${tampil}?\n\nPIN lama dihapus. Orang tua harus membuat PIN baru lewat "Belum punya PIN? Buat PIN" di Portal Orang Tua.`)) return;
      db.ref('ortu_akun/' + waKey).remove().then(() => {
        toast('✅ PIN direset. Minta orang tua membuat PIN baru.');
        addLog('reset_pin_ortu', tampil);
        if (typeof onDone === 'function') onDone(); else renderOrtuAkunAdmin();
      }).catch(err => toast('Gagal reset: ' + err.message, true));
    }
    // ---------- Edit Siswa: status & Reset PIN portal orang tua ----------
    let editSiswaPinWaKey = null, editSiswaPinToken = 0;
    function editSiswaCekPinOrtu(siswa) {
      const box = ortuEl('editSiswaPinBox'); if (!box) return;
      editSiswaPinWaKey = null;
      const btn = ortuEl('editSiswaPinResetBtn'), st = ortuEl('editSiswaPinStatus');
      box.style.display = isAdmin() ? 'block' : 'none';
      btn.style.display = 'none';
      if (!isAdmin()) return;
      const waKey = siswa && siswa.noWaOrtu ? ortuWaKey(siswa.noWaOrtu) : null;
      if (!waKey) { st.textContent = 'Belum ada nomor WA yang valid tersimpan. Isi nomor WA lalu simpan; orang tua baru bisa membuat PIN setelah itu.'; return; }
      const token = ++editSiswaPinToken;
      st.textContent = 'Memeriksa...';
      db.ref('ortu_akun/' + waKey).once('value').then(snap => {
        if (token !== editSiswaPinToken) return;
        const akun = snap.val();
        const sekawan = (allSiswa || []).filter(x => x.noWaOrtu && formatNomorWa(x.noWaOrtu) === waKey);
        const info = sekawan.length > 1 ? ` Nomor ini dipakai ${sekawan.length} anak (${sekawan.map(x => x.name).join(', ')}); reset berlaku untuk semuanya.` : '';
        if (akun && akun.pin) {
          editSiswaPinWaKey = waKey; btn.style.display = 'inline-block';
          const tgl = akun.dibuat ? new Date(akun.dibuat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
          st.textContent = `✅ Sudah dibuat (${tgl}).${akun.kunciSampai && akun.kunciSampai > Date.now() ? ' 🔒 Sedang terkunci.' : ''}${info} Status berdasarkan nomor yang tersimpan.`;
        } else {
          st.textContent = `Belum dibuat. Orang tua membuatnya sendiri lewat "Belum punya PIN? Buat PIN" di Portal Orang Tua.${info}`;
        }
      }).catch(err => { if (token === editSiswaPinToken) st.textContent = 'Gagal memeriksa: ' + err.message; });
    }
    function resetPinOrtuDariEditSiswa() {
      if (!editSiswaPinWaKey) return;
      const siswa = allSiswa.find(x => x.key === editingSiswaKey);
      resetPinOrtu(editSiswaPinWaKey, () => editSiswaCekPinOrtu(siswa));
    }
    // ============================================================
    // KELOLA ABSEN GURU (Admin: lihat + edit + tambah + hapus | Kepala Madrasah: lihat saja)
    // ============================================================
    // Key catatan absen guru = `${tanggal}_${guru.key}_${jenis}` (sama dengan yang dipakai verifyAndAbsen) --
    // menjamin 1 catatan per jenis per guru per hari. Karena itu ubah tanggal/jenis/guru = tulis ke key
    // baru + hapus key lama dalam SATU update atomik, dan ditolak kalau key baru sudah terisi.
    const KAG_TIPE = ['Datang', 'Pulang', 'Izin', 'Sakit', 'Alpha'];
    const KAG_HARI_PENUH = ['Izin', 'Sakit', 'Alpha'];
    let kagRows = [], kagEditKey = null, kagLoading = false, kagSaving = false;
    function kagEl(id) { return document.getElementById(id); }
    function kagGuruList() { return (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas').sort((a, b) => COLLATOR_ID.compare((a.name || ''), b.name || '')); }
    function kagCocokGuru(a, g) { return a.guruKey ? a.guruKey === g.key : a.guru === g.name; }
    function setupKelolaAbsenGuruPage() {
      if (!isAdmin() && !isKepsek()) return;
      const dari = kagEl('kagDari'), sampai = kagEl('kagSampai');
      if (!dari.value || !sampai.value) { const n = new Date(); dari.value = tglLokal(new Date(n.getFullYear(), n.getMonth(), 1)); sampai.value = tglLokal(n); }
      const sel = kagEl('kagFilterGuru'), cur = sel.value;
      sel.innerHTML = '<option value="">-- Semua Guru --</option>' + kagGuruList().map(g => `<option value="${escapeHtml(g.key)}">${escapeHtml(g.name)}</option>`).join('');
      sel.value = cur;
      kagEl('kagTambahBtn').style.display = isAdmin() ? '' : 'none';
      kagEl('kagModeInfo').textContent = isAdmin() ? '' : '👁️ Mode lihat saja (hanya Admin yang dapat mengubah).';
      loadKelolaAbsenGuru();
    }
    function loadKelolaAbsenGuru() {
      if (kagLoading) return;
      const dari = kagEl('kagDari').value, sampai = kagEl('kagSampai').value, list = kagEl('kagList');
      if (!dari || !sampai) return toast('Isi rentang tanggal!', true);
      if (dari > sampai) return toast('Tanggal "Dari" tidak boleh setelah "Sampai"!', true);
      if ((new Date(sampai) - new Date(dari)) / 86400000 > 92) return toast('Rentang maksimal 3 bulan. Persempit tanggalnya.', true);
      kagLoading = true;
      list.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;">Memuat catatan absen...</p>';
      db.ref('teacher_attendance').orderByChild('tanggal').startAt(dari).endAt(sampai).once('value').then(snap => {
        kagRows = []; snap.forEach(c => { const v = c.val() || {}; v.key = c.key; kagRows.push(v); });
        kagLoading = false; renderKelolaAbsenGuru();
      }).catch(err => { kagLoading = false; list.innerHTML = `<p style="color:#dc2626;font-size:13px;">Gagal memuat: ${escapeHtml(err.message)}</p>`; });
    }
    function renderKelolaAbsenGuru() {
      const list = kagEl('kagList'), ringkas = kagEl('kagSummary'); if (!list) return;
      const fg = kagEl('kagFilterGuru').value, ft = kagEl('kagFilterJenis').value;
      const gObj = fg ? kagGuruList().find(g => g.key === fg) : null;
      const hitung = {};
      kagRows.forEach(a => { const k = a.tanggal + '|' + (a.guruKey || a.guru) + '|' + a.type; hitung[k] = (hitung[k] || 0) + 1; });
      const urutan = { Datang: 1, Pulang: 2, Izin: 3, Sakit: 3, Alpha: 4 };
      let rows = kagRows.filter(a => (!gObj || kagCocokGuru(a, gObj)) && (!ft || a.type === ft))
        .sort((x, y) => COLLATOR_ID.compare((y.tanggal || ''), x.tanggal || '') || COLLATOR_ID.compare((x.guru || ''), y.guru || '') || (urutan[x.type] || 9) - (urutan[y.type] || 9));
      const dobel = rows.filter(a => hitung[a.tanggal + '|' + (a.guruKey || a.guru) + '|' + a.type] > 1).length;
      const cnt = t => rows.filter(a => a.type === t).length;
      ringkas.innerHTML = `<span style="padding:4px 10px;border-radius:999px;background:#dcfce7;color:#065f46;">🌅 Datang ${cnt('Datang')}</span><span style="padding:4px 10px;border-radius:999px;background:#dbeafe;color:#1e40af;">🌇 Pulang ${cnt('Pulang')}</span><span style="padding:4px 10px;border-radius:999px;background:#fef3c7;color:#92400e;">📝 Izin ${cnt('Izin')} · 🤒 Sakit ${cnt('Sakit')}</span><span style="padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;">❌ Alpha ${cnt('Alpha')}</span>${dobel ? `<span style="padding:4px 10px;border-radius:999px;background:#fecaca;color:#7f1d1d;font-weight:700;">⚠️ Dobel ${dobel}</span>` : ''}`;
      if (!rows.length) { list.innerHTML = '<div class="text-muted border-muted" style="padding:16px;text-align:center;background:#f9fafb;border-radius:8px;">📭 Tidak ada catatan pada rentang/filter ini</div>'; return; }
      const terpotong = rows.length > 500; if (terpotong) rows = rows.slice(0, 500);
      const warna = { Datang: ['#dcfce7', '#065f46'], Pulang: ['#dbeafe', '#1e40af'], Izin: ['#fef3c7', '#92400e'], Sakit: ['#fef3c7', '#92400e'], Alpha: ['#fee2e2', '#991b1b'] };
      const metodeLabel = { qr_lokasi: '📍 QR+Lokasi', kamera_validasi: '📸 Kamera', otomatis_sistem: '🤖 Otomatis', manual_admin: '✍️ Admin' };
      const bisaUbah = isAdmin(), th = 'padding:8px 6px;';
      const body = rows.map(a => {
        const w = warna[a.type] || ['#f3f4f6', '#374151'];
        const wkt = a.waktu ? new Date(a.waktu) : null;
        const jam = (!KAG_HARI_PENUH.includes(a.type) && wkt && !isNaN(wkt)) ? wkt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
        const tgl = new Date(a.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        const isDobel = hitung[a.tanggal + '|' + (a.guruKey || a.guru) + '|' + a.type] > 1;
        const ket = [a.keterangan ? escapeHtml(a.keterangan) : '', a.catatanKoreksi ? '<span class="text-muted">Koreksi: ' + escapeHtml(a.catatanKoreksi) + '</span>' : ''].filter(Boolean).join('<br>') || '-';
        const aksi = bisaUbah ? `<td style="${th}white-space:nowrap;"><button class="btn btn-soft" style="padding:3px 8px;font-size:12px;" data-key="${escapeHtml(a.key)}" onclick="kagBuka(this.dataset.key)" title="Edit">✏️</button> <button class="btn btn-danger" style="padding:3px 8px;font-size:12px;" data-key="${escapeHtml(a.key)}" onclick="kagHapus(this.dataset.key)" title="Hapus">🗑️</button></td>` : '';
        return `<tr style="border-bottom:1px solid #f1f5f9;${isDobel ? 'background:#fef2f2;' : ''}"><td style="${th}white-space:nowrap;">${escapeHtml(tgl)}</td><td style="${th}">${escapeHtml(a.guru || '-')}</td><td style="${th}"><span style="padding:2px 8px;border-radius:999px;background:${w[0]};color:${w[1]};font-weight:600;">${escapeHtml(a.type || '-')}</span>${isDobel ? ' <span style="color:#dc2626;font-weight:700;font-size:11px;">DOBEL</span>' : ''}</td><td style="${th}">${jam}</td><td style="${th}font-size:12px;">${metodeLabel[a.metode] || '📝 Manual'}${a.dikoreksi ? ' ✏️' : ''}</td><td style="${th}font-size:12px;">${ket}</td>${aksi}</tr>`;
      }).join('');
      list.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:640px;"><thead><tr style="background:#f3f4f6;text-align:left;"><th style="${th}">Tanggal</th><th style="${th}">Guru</th><th style="${th}">Jenis</th><th style="${th}">Jam</th><th style="${th}">Metode</th><th style="${th}">Keterangan</th>${bisaUbah ? `<th style="${th}">Aksi</th>` : ''}</tr></thead><tbody>${body}</tbody></table>${terpotong ? '<p style="font-size:12px;color:#92400e;margin-top:8px;">Menampilkan 500 catatan pertama. Persempit rentang tanggal atau pilih guru.</p>' : ''}`;
    }
    function kagToggleJam() { kagEl('kagJamWrap').style.display = KAG_HARI_PENUH.includes(kagEl('kagJenis').value) ? 'none' : 'block'; }
    function kagBuka(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const rec = key ? kagRows.find(r => r.key === key) : null;
      if (key && !rec) return toast('Catatan tidak ditemukan. Muat ulang daftar.', true);
      const guruList = kagGuruList();
      let guruTerpilih = '';
      if (rec) {
        const g = guruList.find(x => kagCocokGuru(rec, x));
        if (!g) return toast('Guru pada catatan ini sudah tidak ada di daftar guru. Catatan hanya bisa dihapus.', true);
        guruTerpilih = g.key;
      }
      kagEditKey = key || null;
      kagEl('kagModalTitle').textContent = rec ? '✏️ Edit Catatan Absen Guru' : '➕ Tambah Catatan Absen Guru';
      kagEl('kagGuru').innerHTML = guruList.map(g => `<option value="${escapeHtml(g.key)}">${escapeHtml(g.name)}</option>`).join('');
      if (guruTerpilih) kagEl('kagGuru').value = guruTerpilih;
      kagEl('kagTanggal').value = rec ? rec.tanggal : tglLokal();
      kagEl('kagJenis').value = rec ? rec.type : 'Datang';
      let jam = '';
      if (rec && rec.waktu && !KAG_HARI_PENUH.includes(rec.type)) { const d = new Date(rec.waktu); if (!isNaN(d)) jam = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
      kagEl('kagJam').value = jam;
      kagEl('kagKet').value = rec ? (rec.keterangan || '') : '';
      kagEl('kagAlasan').value = '';
      kagToggleJam();
      kagEl('kagModal').classList.add('show');
    }
    function kagTutup() { kagEl('kagModal').classList.remove('show'); kagEditKey = null; }
    function kagSimpan() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (kagSaving) return;
      const guru = kagGuruList().find(g => g.key === kagEl('kagGuru').value);
      const tanggal = kagEl('kagTanggal').value, jenis = kagEl('kagJenis').value, jam = kagEl('kagJam').value;
      const ket = kagEl('kagKet').value.trim(), alasan = kagEl('kagAlasan').value.trim();
      if (!guru || !tanggal || !KAG_TIPE.includes(jenis)) return toast('Lengkapi guru, tanggal, dan jenis!', true);
      if (!KAG_HARI_PENUH.includes(jenis) && !jam) return toast('Isi jam untuk Datang/Pulang!', true);
      if (!alasan) return toast('Isi alasan koreksi (jejak audit)!', true);
      const lama = kagEditKey ? kagRows.find(r => r.key === kagEditKey) : null;
      const oldKey = kagEditKey, newKey = `${tanggal}_${guru.key}_${jenis}`;
      kagSaving = true;
      db.ref('teacher_attendance/' + newKey).once('value').then(snap => {
        if (snap.exists() && newKey !== oldKey) throw { tampil: `Sudah ada catatan ${jenis} untuk ${guru.name} pada ${tanggal}. Edit atau hapus catatan itu dulu.` };
        return db.ref('teacher_attendance').orderByChild('tanggal').equalTo(tanggal).once('value');
      }).then(snap => {
        const lain = [];
        snap.forEach(c => { const v = c.val() || {}; if (c.key === oldKey || c.key === newKey) return; if (kagCocokGuru(v, guru)) lain.push(v.type); });
        const bentrok = KAG_HARI_PENUH.includes(jenis) ? lain.length > 0 : lain.some(t => KAG_HARI_PENUH.includes(t));
        if (bentrok && !confirm(`Di tanggal ini ${guru.name} juga punya catatan: ${lain.join(', ')}.\n\nIzin/Sakit/Alpha adalah status satu hari penuh, jadi bisa bertabrakan dengan catatan lain.\n\nTetap simpan?`)) return false;
        const waktuIso = new Date(`${tanggal}T${KAG_HARI_PENUH.includes(jenis) ? '00:00' : jam}:00`).toISOString();
        const rec = {
          tanggal, guru: guru.name, guruKey: guru.key, kelas: guru.kelas || [], waktu: waktuIso, type: jenis,
          tahunAjaran: (lama && lama.tahunAjaran) || currentTahunAjaran,
          metode: lama ? (lama.metode || 'manual_admin') : 'manual_admin',
          keterangan: ket || null, catatanKoreksi: alasan, dikoreksi: true,
          diubahOleh: currentUser.name, diubahAt: new Date().toISOString()
        };
        const updates = {}; updates['teacher_attendance/' + newKey] = rec;
        if (oldKey && oldKey !== newKey) updates['teacher_attendance/' + oldKey] = null;
        return db.ref().update(updates).then(() => true);
      }).then(ok => {
        if (!ok) return;
        toast(oldKey ? '✅ Catatan absen diperbarui.' : '✅ Catatan absen ditambahkan.');
        addLog(oldKey ? 'edit_absen_guru' : 'tambah_absen_guru', `${guru.name} - ${tanggal} - ${jenis}: ${alasan}`);
        kagTutup(); reloadDataset('teacherAttendance'); loadKelolaAbsenGuru();
      }).catch(e => toast('❌ ' + ((e && e.tampil) || ('Gagal menyimpan: ' + ((e && e.message) || e))), true))
        .finally(() => { kagSaving = false; });
    }
    function kagHapus(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const a = kagRows.find(r => r.key === key); if (!a) return toast('Catatan tidak ditemukan. Muat ulang daftar.', true);
      if (!doubleConfirm(`Hapus catatan ${a.type} untuk ${a.guru} (${a.tanggal})?\n\nTidak bisa dibatalkan.`)) return;
      db.ref('teacher_attendance/' + key).remove().then(() => {
        toast('🗑️ Catatan dihapus.');
        addLog('hapus_absen_guru', `${a.guru} - ${a.tanggal} - ${a.type}`);
        reloadDataset('teacherAttendance'); loadKelolaAbsenGuru();
      }).catch(err => toast('Gagal menghapus: ' + err.message, true));
    }
    function renderPortalOrtuDashboard(siswa) {
      const content = document.getElementById('portalOrtuContent');
      content.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">⏳ Memuat data...</p>';
      const now = new Date();
      const monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
      Promise.all([
        db.ref('grades').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        db.ref('kedisiplinan_siswa').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        db.ref('iuran_siswa').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        db.ref('buku_penghubung').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        // Hanya absensi BULAN INI (dulu seluruh riwayat kelas, semua tahun). Filter kelas dilakukan di bawah.
        db.ref('attendance').orderByChild('tanggal').startAt(monthStr + '-01').endAt(monthStr + '-31').once('value'),
        db.ref('materi_belajar').orderByChild('kelas').equalTo(siswa.kelas).once('value'),
        db.ref('tugas').orderByChild('kelas').equalTo(siswa.kelas).once('value'),
        db.ref('tugas_submission').orderByChild('siswaKey').equalTo(siswa.key).once('value'),
        // Hanya jurnal HARI INI (dulu seluruh riwayat jurnal kelas). Filter kelas dilakukan di bawah.
        db.ref('journal').orderByChild('tanggal').equalTo(tglLokal()).once('value'),
        db.ref('kalender_akademik').once('value'),
        db.ref('events').once('value'),
        db.ref('ujian').once('value')
      ]).then(([gradesSnap, sikapSnap, iuranSnap, bukuSnap, absenSnap, materiSnap, tugasSnap, submissionSnap, journalSnap, kalenderSnap, eventsSnap, ujianSnap]) => {
        // Semua query di atas cuma bisa orderByChild SATU field di Firebase RTDB (siswaKey/kelas),
        // jadi filter tahunAjaran-nya WAJIB ditambahkan manual di sini -- tanpa ini, portal ortu
        // menampilkan data dari SEMUA tahun ajaran tergabung jadi satu (nilai rapor tahun lalu
        // ikut nongol di tabel Nilai, poin pelanggaran/prestasi terus terakumulasi tanpa pernah
        // "reset" tiap tahun ajaran baru, dan daftar Tugas berisi tugas dari kelas yang sama di
        // tahun-tahun sebelumnya yang sudah tidak relevan lagi buat siswa sekarang).
        // FIX: dulu `!x.tahunAjaran ||` membuat data lama (sebelum field tahunAjaran ada) SELALU
        // lolos filter dan nongol lagi di tahun ajaran manapun yang sedang aktif -- bukan cuma di
        // tahun ajaran waktu data itu sebenarnya dibuat. Sekarang data lama dicocokkan ke tahun
        // ajaran yang dihitung dari tanggalnya sendiri (lihat sesuaiTahunAjaranTermasukDataLama).
        const sesuaiTahunAjaran = sesuaiTahunAjaranTermasukDataLama;
        const grades = []; gradesSnap.forEach(c => { const g = c.val(); if (sesuaiTahunAjaran(g)) grades.push(g); });
        const sikap = []; sikapSnap.forEach(c => { const d = c.val(); if (sesuaiTahunAjaran(d)) sikap.push(d); });
        const iuran = []; iuranSnap.forEach(c => { const it = c.val(); if (sesuaiTahunAjaran(it)) iuran.push(it); });
        const buku = []; bukuSnap.forEach(c => { const b = c.val(); if (sesuaiTahunAjaran(b)) buku.push(b); });
        const materi = []; materiSnap.forEach(c => { const m = c.val(); if (sesuaiTahunAjaran(m)) materi.push(m); });
        const tugasList = []; tugasSnap.forEach(c => { const t = c.val(); if (sesuaiTahunAjaran(t)) tugasList.push({ key: c.key, ...t }); });
        const submissionMap = {}; submissionSnap.forEach(c => { const s = c.val(); if (sesuaiTahunAjaran(s)) submissionMap[s.tugasKey] = s; });
        // Hasil Belajar Hari Ini -- jurnal mengajar (per jam pelajaran) untuk kelas anak,
        // difilter tanggal HARI INI saja & status 'approved' (jurnal susulan yang masih
        // menunggu approval Admin sengaja tidak ditampilkan dulu ke orang tua, supaya yang
        // tampil hanya yang sudah dikonfirmasi benar-benar terjadi sesuai jamnya).
        const todayStrJurnal = tglLokal();
        const journalHariIni = [];
        journalSnap.forEach(c => { const j = c.val(); if (j.kelas === siswa.kelas && j.tanggal === todayStrJurnal && j.status === 'approved' && sesuaiTahunAjaran(j)) journalHariIni.push(j); });
        journalHariIni.sort((a,b) => (a.jam_ke||0) - (b.jam_ke||0));
        const journalRows = journalHariIni.map(j => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <div class="text-muted" style="font-size:11px;">Jam ke-${j.jam_ke} — ${escapeHtml(j.subject||'-')}</div>
          <div style="font-size:13px;margin-top:2px;">${escapeHtml(j.activity||'-')}</div>
          <div class="text-muted" style="font-size:11px;margin-top:2px;">Oleh: ${escapeHtml(j.guru||'-')}</div>
        </div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada jurnal pelajaran tercatat untuk hari ini.</p>';
        // Agenda terdekat -- gabungan 3 sumber sama seperti Kalender Akademik di menu staf
        // (kalender_akademik manual + Acara + Ujian), tapi cuma yang tanggalnya HARI INI atau
        // setelahnya, diurutkan, dibatasi 8 item -- supaya orang tua lihat yang relevan ke depan,
        // bukan riwayat lama.
        const todayStr0 = tglLokal();
        const iconJenisAgenda = { libur: '🔴', ujian: '🟣', acara: '🟠', akademik: '🟢' };
        let agendaList = [];
        kalenderSnap.forEach(c => { const k = c.val(); const mulai = k.tanggalMulai, selesai = k.tanggalSelesai || k.tanggalMulai; if (selesai >= todayStr0) agendaList.push({ jenis: k.jenis, judul: k.judul, tanggal: mulai, keterangan: k.keterangan }); });
        eventsSnap.forEach(c => { const e = c.val(); if (e.tanggal >= todayStr0) agendaList.push({ jenis: 'acara', judul: e.nama, tanggal: e.tanggal, keterangan: e.jenis }); });
        ujianSnap.forEach(c => { const u = c.val(); if (u.tanggal >= todayStr0) agendaList.push({ jenis: 'ujian', judul: u.nama, tanggal: u.tanggal, keterangan: u.jenis }); });
        agendaList.sort((a,b) => COLLATOR_ID.compare((a.tanggal||''), b.tanggal||''));
        agendaList = agendaList.slice(0, 8);
        const agendaRows = agendaList.map(a => `<div style="padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">${iconJenisAgenda[a.jenis]||'📌'} <strong>${escapeHtml(a.judul)}</strong> <span class="text-muted" style="font-size:11px;">— ${escapeHtml(a.tanggal)}${a.keterangan ? ' — ' + escapeHtml(a.keterangan) : ''}</span></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada agenda mendatang.</p>';
        let hadir=0, sakit=0, izin=0, alfa=0;
        absenSnap.forEach(c => {
          const rec = c.val();
          if (rec.kelas === siswa.kelas && rec.tanggal && rec.tanggal.startsWith(monthStr) && rec.data && rec.data[siswa.key] && sesuaiTahunAjaran(rec)) {
            const st = rec.data[siswa.key];
            if (st === 'H') hadir++; else if (st === 'S') sakit++; else if (st === 'I') izin++; else if (st === 'A') alfa++;
          }
        });
        const nilaiRows = grades.map(g => `<tr><td>${escapeHtml(g.subject||'-')}</td><td>${escapeHtml(g.semester||'-')}</td><td style="text-align:right;font-weight:700;">${calculateRapor(g.data||{})}</td></tr>`).join('');
        const totalPelanggaran = sikap.filter(d=>d.jenis==='pelanggaran').reduce((s,d)=>s+(d.poin||0),0);
        const totalPrestasi = sikap.filter(d=>d.jenis==='prestasi').reduce((s,d)=>s+(d.poin||0),0);
        const netSikap = totalPrestasi - totalPelanggaran;
        const sikapRows = [...sikap].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(d => `<div style="padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;"><span style="color:${d.jenis==='prestasi'?'#059669':'#dc2626'};font-weight:600;">${d.jenis==='prestasi'?'🌟':'⚠️'} ${escapeHtml(d.kategori||'-')}</span> <span class="text-muted">(${d.poin||0} poin) — ${escapeHtml(d.tanggal||'-')}</span></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada catatan.</p>';
        const iuranMingguIni = iuran.find(it => it.minggu === isoMingguKey());
        const bukuRows = [...buku].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(b => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><div class="text-muted" style="font-size:12px;">${escapeHtml(b.tanggal||'-')}</div><div style="font-size:13px;">${escapeHtml(b.catatan||'-')}</div></div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada catatan dari guru.</p>';
        const materiRows = [...materi].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,5).map(m => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;"><div style="font-size:13px;font-weight:600;">${escapeHtml(m.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(m.mapel||'-')} — ${escapeHtml(m.tanggal||'-')}</span></div><div class="text-muted" style="font-size:12px;margin-top:2px;">${escapeHtml(m.isi)}</div>${m.link ? `<a href="${escapeHtml(m.link)}" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb;">🔗 Buka Link</a>` : ''}</div>`).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada materi dibagikan.</p>';
        const tugasRows = [...tugasList].sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).map(t => {
          const sub = submissionMap[t.key];
          if (sub) {
            return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <div style="font-size:13px;font-weight:600;">${escapeHtml(t.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(t.mapel||'-')}</span></div>
              <div style="font-size:11px;color:#059669;font-weight:600;margin-top:2px;">✅ Sudah dikumpulkan (${escapeHtml((sub.waktuKumpul||'').slice(0,16).replace('T',' '))})</div>
            </div>`;
          }
          return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:13px;font-weight:600;">${escapeHtml(t.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(t.mapel||'-')}</span></div>
            <div class="text-muted" style="font-size:12px;margin:4px 0;">${escapeHtml(t.deskripsi)}</div>
            <div style="font-size:11px;color:#d97706;margin-bottom:6px;">⏳ Belum dikumpulkan${t.deadline ? ' — batas waktu: ' + escapeHtml(t.deadline) : ''}</div>
            <textarea id="jawabanTeks_${t.key}" class="field" rows="2" placeholder="Tulis jawaban di sini (opsional kalau cuma kirim foto)..." style="margin-bottom:6px;"></textarea>
            <input id="jawabanFoto_${t.key}" type="file" accept="image/*" style="font-size:12px;margin-bottom:6px;">
            <button class="btn btn-success" style="font-size:12px;padding:6px 12px;" onclick="kumpulTugasOrtu('${t.key}','${siswa.key}','${escapeJs(siswa.name)}','${escapeJs(siswa.kelas)}')">📤 Kumpulkan Tugas</button>
          </div>`;
        }).join('') || '<p class="text-muted" style="font-size:13px;">Belum ada tugas untuk kelas ini.</p>';
        content.innerHTML = `
          <div class="card" style="margin-bottom:12px;">
            <p style="font-size:16px;font-weight:700;">${escapeHtml(siswa.name)}</p>
            <p class="text-muted" style="font-size:13px;">Kelas ${escapeHtml(siswa.kelas)}</p>
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📅 Kehadiran Bulan Ini</p>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
              <div><div style="font-size:20px;font-weight:800;color:#059669;">${hadir}</div><div class="text-muted" style="font-size:11px;">Hadir</div></div>
              <div><div style="font-size:20px;font-weight:800;color:#d97706;">${sakit}</div><div class="text-muted" style="font-size:11px;">Sakit</div></div>
              <div><div style="font-size:20px;font-weight:800;color:#2563eb;">${izin}</div><div class="text-muted" style="font-size:11px;">Izin</div></div>
              <div><div style="font-size:20px;font-weight:800;color:#dc2626;">${alfa}</div><div class="text-muted" style="font-size:11px;">Alfa</div></div>
            </div>
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📆 Agenda Terdekat</p>
            ${agendaRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📘 Hasil Belajar Hari Ini</p>
            ${journalRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📚 Materi Belajar Terbaru</p>
            ${materiRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📝 Tugas</p>
            ${tugasRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📝 Nilai Terakhir</p>
            ${grades.length ? `<div style="overflow-x:auto;"><table><thead><tr><th>Mapel</th><th>Semester</th><th>Nilai</th></tr></thead><tbody>${nilaiRows}</tbody></table></div>` : '<p class="text-muted" style="font-size:13px;">Belum ada nilai tercatat.</p>'}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">🌟 Sikap &amp; Kedisiplinan</p>
            <p style="font-size:13px;margin-bottom:6px;">Net Poin: <strong style="color:${netSikap>=0?'#059669':'#dc2626'};">${netSikap>=0?'+':''}${netSikap}</strong> (⚠️ ${totalPelanggaran} / 🌟 ${totalPrestasi})</p>
            ${sikapRows}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">💵 Infaq Minggu Ini</p>
            ${iuranMingguIni ? `<p style="color:#059669;font-weight:600;font-size:13px;">✅ Lunas${iuranAngka(iuranMingguIni.nominal) !== null ? ' (' + iuranRp(iuranAngka(iuranMingguIni.nominal)) + ')' : ''}</p>` : `<p style="color:#dc2626;font-weight:600;font-size:13px;">⏳ Belum tercatat lunas minggu ini</p>`}
          </div>
          <div class="card" style="margin-bottom:12px;">
            <p style="font-weight:700;margin-bottom:8px;">📖 Buku Penghubung Terbaru</p>
            ${bukuRows}
          </div>
          <div class="card">
            <p style="font-weight:700;margin-bottom:8px;">💬 Saran &amp; Kritik untuk Madrasah</p>
            <p class="text-muted" style="font-size:12px;margin-bottom:8px;">Masukan Bapak/Ibu membantu madrasah menjadi lebih baik. Bisa dikirim dengan nama, atau anonim kalau memang lebih nyaman.</p>
            <textarea id="saranKritikTeks" class="field" rows="3" placeholder="Tulis saran atau kritik di sini..."></textarea>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin:8px 0;cursor:pointer;">
              <input type="checkbox" id="saranKritikAnonim"> Kirim sebagai anonim (nama &amp; kelas tidak disertakan)
            </label>
            <button class="btn btn-primary" id="btnKirimSaranKritik" style="font-size:12px;padding:7px 14px;" onclick="kirimSaranKritik('${siswa.key}','${escapeJs(siswa.name)}','${escapeJs(siswa.kelas)}')">📤 Kirim ke Madrasah</button>
            <div id="saranKritikStatus" style="margin-top:8px;font-size:12px;"></div>
          </div>
        `;
      }).catch(err => { content.innerHTML = `<p style="color:#dc2626;text-align:center;padding:20px;">Gagal memuat data: ${err.message}</p>`; });
    }
    // Saran & Kritik dari Portal Orang Tua -- disimpan terpisah dari data siswa lain (tidak ikut
    // di-load lagi ke portal setelah kirim, sekali kirim langsung selesai) supaya orang tua tidak
    // bisa lihat balik kiriman orang lain. Opsi anonim: siswaKey/siswaNama/kelas cuma diisi kalau
    // TIDAK anonim -- kalau anonim, field itu sengaja null (Admin tidak akan tahu identitasnya).
    function kirimSaranKritik(siswaKey, siswaNama, kelas) {
      if (isBusy('kirimSaranKritik')) return;
      const teks = document.getElementById('saranKritikTeks').value.trim();
      const anonim = document.getElementById('saranKritikAnonim').checked;
      const statusEl = document.getElementById('saranKritikStatus');
      if (!teks) { statusEl.innerHTML = '<span style="color:#dc2626;">⚠️ Tulis dulu saran/kritiknya.</span>'; return; }
      statusEl.innerHTML = '<span class="text-muted">⏳ Mengirim...</span>';
      const btnKirimSaran = document.getElementById('btnKirimSaranKritik');
      setBusy('kirimSaranKritik', btnKirimSaran);
      const ref = db.ref('saran_kritik').push();
      ref.set({
        pesan: teks,
        anonim,
        siswaKey: anonim ? null : siswaKey,
        siswaNama: anonim ? null : siswaNama,
        kelas: anonim ? null : kelas,
        waktuKirim: new Date().toISOString(),
        status: 'baru'
      }, err => {
        clearBusy('kirimSaranKritik', btnKirimSaran);
        if (err) { statusEl.innerHTML = `<span style="color:#dc2626;">❌ Gagal mengirim: ${err.message}</span>`; return; }
        statusEl.innerHTML = '<span style="color:#059669;font-weight:600;">✅ Terkirim, terima kasih atas masukannya!</span>';
        document.getElementById('saranKritikTeks').value = '';
        document.getElementById('saranKritikAnonim').checked = false;
      });
    }
    // Kumpul tugas dari Portal Orang Tua -- foto (kalau diisi) diperkecil dulu (maks 640px sisi
    // terpanjang, JPEG q0.5) sebelum disimpan sebagai data URL, sama seperti pola foto check-in
    // acara/ujian, supaya tidak membengkak di database. Key deterministik (tugasKey_siswaKey)
    // supaya kumpul ulang otomatis MENGGANTIKAN jawaban sebelumnya (bukan menumpuk).
    function kumpulTugasOrtu(tugasKey, siswaKey, siswaNama, kelas) {
      const jawabanTeks = (document.getElementById('jawabanTeks_'+tugasKey).value || '').trim();
      const fileInput = document.getElementById('jawabanFoto_'+tugasKey);
      const file = fileInput.files && fileInput.files[0];
      if (!jawabanTeks && !file) { toast('⚠️ Isi jawaban teks atau lampirkan foto dulu.', true); return; }
      const simpanKumpul = (fotoDataUrl) => {
        const ref = db.ref(`tugas_submission/${tugasKey}_${siswaKey}`);
        ref.set({ tugasKey, siswaKey, siswaNama, kelas, jawabanTeks: jawabanTeks || null, hasFoto: !!fotoDataUrl, waktuKumpul: new Date().toISOString(), tahunAjaran: currentTahunAjaran }, err => {
          if (err) { toast('❌ Gagal mengumpulkan: ' + err.message, true); return; }
          simpanFotoTerpisah('tugas_submission', tugasKey + '_' + siswaKey, fotoDataUrl); // set / hapus foto (kumpul ulang tanpa foto = foto lama dihapus)
          toast('✅ Tugas berhasil dikumpulkan!');
          const siswa = { key: siswaKey, name: siswaNama, kelas };
          renderPortalOrtuDashboard(siswa);
        });
      };
      if (!file) { simpanKumpul(null); return; }
      if (!/^image\//.test(file.type)) { toast('⚠️ File harus berupa gambar!', true); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const maxSisi = 640;
          const skala = Math.min(1, maxSisi / Math.max(img.naturalWidth, img.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.naturalWidth * skala); canvas.height = Math.round(img.naturalHeight * skala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          simpanKumpul(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.onerror = () => toast('Gagal memproses foto.', true);
        img.src = e.target.result;
      };
      reader.onerror = () => toast('Gagal membaca file.', true);
      reader.readAsDataURL(file);
    }
    async function downloadHonorPDF() {
      const data = window._honorData; if (!data) return toast('Hitung honor terlebih dahulu!', true);
      const { groupedJurnal, groupedReligi, groupedEvents, groupedUjian, groupedEkskulPic, totalHonor, month, year, totalReguler, totalNonReguler, totalEkstra, totalEkstraHonor, totalDluha, totalDzuhur, totalEventJumlah, totalEventHonor, totalUjianJumlah, totalUjianHonor, totalTunjangan, totalTransport, bonusList } = data;
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(16); doc.text('REKAP HONOR GURU', pageWidth/2, 20, { align: 'center' });
      doc.setFontSize(12); doc.text(`MI Mambaul Ulum - ${monthName} ${year}`, pageWidth/2, 28, { align: 'center' });
      const rates = v4GetHonorRates();
      doc.setFontSize(9); doc.text(`Reguler: Rp ${rates.reguler} | Non-Reguler: Rp ${rates.nonReguler} | Dluha: Rp ${rates.dluha} | Dzuhur: Rp ${rates.dzuhur}`, pageWidth/2, 34, { align: 'center' });
      doc.text(`Ekstra: sesuai rate per kegiatan | Lembur/Rapat, Ujian, Tunjangan & Transport: sesuai pengaturan masing-masing`, pageWidth/2, 40, { align: 'center' }); doc.line(20, 44, pageWidth - 20, 44);
      // Sama seperti renderHonor(): Kepala Madrasah & Ketua Yayasan (2 item pertama bonusList)
      // ditaruh di baris PALING ATAS tabel, Guru Terajin (kalau ada, item sisanya) tetap di
      // bawah. Deteksi baris "bonus" untuk pewarnaan kuning di bawah tidak lagi dari teks label
      // (karena teks "(Bonus)" sudah dihapus) melainkan dari nomor baris (bonusRowIndices).
      const pimpinanListPdf = bonusList.slice(0, 2), bonusLainnyaPdf = bonusList.slice(2);
      const rows = []; let no = 1; const bonusRowIndices = new Set();
      pimpinanListPdf.forEach(bonus => { bonusRowIndices.add(rows.length); rows.push([no++, bonus.label, '-', '-', '-', '-', '-', '-', '-', '-', `Rp ${bonus.amount.toLocaleString()}`]); });
      const allTeacherKeysPdf = new Set([...Object.keys(groupedJurnal), ...Object.keys(groupedReligi), ...Object.keys(groupedEvents), ...Object.keys(groupedUjian), ...Object.keys(groupedEkskulPic||{}), ...allGuru.filter(g => (g.role === 'guru' || g.role === 'wali_kelas') && ((g.tunjanganMasaKerja||0) > 0 || (g.bantuanTransportasi||0) > 0)).map(g => g.key || g.name)]);
      for (const guruKey of allTeacherKeysPdf) { const j = groupedJurnal[guruKey] || { reguler: 0, nonReguler: 0, ekstra: 0, ekstraHonor: 0 }, r = groupedReligi[guruKey] || { dluha: 0, dzuhur: 0 }, ev = groupedEvents[guruKey] || { jumlah: 0, honor: 0 }, uj = groupedUjian[guruKey] || { jumlah: 0, honor: 0 }, ekpic = (groupedEkskulPic||{})[guruKey] || { jumlah: 0, honor: 0 }; const guruObj = allGuru.find(g => g.key === guruKey) || allGuru.find(g => g.name === guruKey); const guru = j.nama || r.nama || ev.nama || uj.nama || ekpic.nama || (guruObj && guruObj.name) || guruKey; const tunjangan = (guruObj && guruObj.tunjanganMasaKerja) || 0, transport = (guruObj && guruObj.bantuanTransportasi) || 0; const honor = v4HitungHonor({ reguler: j.reguler, nonReguler: j.nonReguler, ekstraHonor: j.ekstraHonor + ekpic.honor, dluha: r.dluha, dzuhur: r.dzuhur, eventHonor: ev.honor, ujianHonor: uj.honor, tunjangan, transport }, rates); rows.push([no++, guru, j.reguler, j.nonReguler, `${j.ekstra}x`, r.dluha, r.dzuhur, `${ev.jumlah}x`, `${uj.jumlah}x`, `${(tunjangan+transport).toLocaleString()}`, `Rp ${honor.toLocaleString()}`]); }
      bonusLainnyaPdf.forEach(bonus => { bonusRowIndices.add(rows.length); rows.push([no++, bonus.label, '-', '-', '-', '-', '-', '-', '-', '-', `Rp ${bonus.amount.toLocaleString()}`]); });
      doc.autoTable({ startY: 48, head: [['No', 'Guru', 'Reg', 'Non-Reg', 'Ekstra', 'Dluha', 'Dzuhur', 'Lembur', 'Ujian', 'Tunj+Trans', 'Honor']], body: rows, foot: [['', 'TOTAL', totalReguler, totalNonReguler, `${totalEkstra}x`, totalDluha, totalDzuhur, `${totalEventJumlah}x`, `${totalUjianJumlah}x`, `${(totalTunjangan+totalTransport).toLocaleString()}`, `Rp ${totalHonor.toLocaleString()}`]], theme: 'striped', styles: { fontSize: 8 }, headStyles: { fillColor: [37,99,235], textColor: [255,255,255], fontSize: 9, fontStyle: 'bold' }, footStyles: { fillColor: [209,213,219], textColor: [0,0,0], fontStyle: 'bold', fontSize: 9 }, didParseCell: function(data) { if (data.section === 'foot' && data.column.index === 10) { data.cell.styles.fillColor = [5,150,105]; data.cell.styles.textColor = [255,255,255]; data.cell.styles.fontSize = 10; data.cell.styles.fontStyle = 'bold'; } if (data.section === 'body' && bonusRowIndices.has(data.row.index)) { data.cell.styles.fillColor = [254,243,199]; data.cell.styles.fontStyle = 'bold'; } }, margin: { left: 15, right: 15 } });
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10); doc.text(`Dicetak: ${new Date().toLocaleString()}`, pageWidth - 20, finalY, { align: 'right' });
      doc.setFontSize(12); doc.text(`Total Honor Keseluruhan: Rp ${totalHonor.toLocaleString()}`, pageWidth/2, finalY + 10, { align: 'center' });
      // Tanda tangan Kepala (sebelumnya slip honor tidak punya blok tanda tangan sama sekali)
      const ttdKepalaDataHonor = await v4LoadTtdKepalaForPdf();
      let ySignHonor = finalY + 24;
      if (ySignHonor > 255) { doc.addPage(); ySignHonor = 20; }
      doc.setFontSize(11);
      doc.text('Mengetahui,', pageWidth - 60, ySignHonor, { align: 'center' });
      doc.text('Kepala ' + MADRASAH.nama, pageWidth - 60, ySignHonor + 6, { align: 'center' });
      if (ttdKepalaDataHonor) {
        try {
          const ttdW = 32;
          const propsTtd = doc.getImageProperties(ttdKepalaDataHonor);
          const ttdH = Math.min(16, ttdW * (propsTtd.height / propsTtd.width));
          doc.addImage(ttdKepalaDataHonor, 'PNG', pageWidth - 60 - ttdW/2, ySignHonor + 9, ttdW, ttdH);
        } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF Honor:', e); }
        ySignHonor += 20;
      } else {
        ySignHonor += 18;
      }
      doc.text(MADRASAH.kepala_sekolah, pageWidth - 60, ySignHonor + 6, { align: 'center' });
      doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, pageWidth - 60, ySignHonor + 12, { align: 'center' });
      doc.save(`Honor_Guru_${monthName}_${year}.pdf`); toast('📥 PDF Honor berhasil diunduh!');
    }

    // ============================================================
    // SURAT & IJIN (DENGAN KOP RESMI)
    // ============================================================
    function generateKopSuratHTML() {
      return `
        <div class="kop-surat">
          <div class="logo-kop">
            <img src="logo/logo-lembaga.png" alt="Logo" class="logo-kop-img" onerror="v4LogoFallback(this)">
            <div>
              <div class="nama-sekolah">${escapeHtml(MADRASAH.nama)}</div>
              ${MADRASAH.nsm ? `<div class="nsm-sekolah text-strong" style="font-size:11px;font-weight:600;">NSM: ${escapeHtml(MADRASAH.nsm)}</div>` : ''}
              <div class="alamat-sekolah">${escapeHtml(MADRASAH.alamat)}</div>
              <div class="detail-sekolah">📞 ${escapeHtml(MADRASAH.telp)} | ✉ ${escapeHtml(MADRASAH.email)} | 🌐 ${escapeHtml(MADRASAH.website)}</div>
            </div>
          </div>
        </div>
      `;
    }

    function loadSiswaSuratDropdown() {
      const select = document.getElementById('suratSiswaSelect');
      select.innerHTML = '<option value="">-- Pilih Siswa --</option>';
      // Wali Kelas cuma boleh buat surat untuk siswa di kelas yang dia ampu -- Admin tetap
      // bisa untuk semua siswa.
      const scoped = (isAdmin() || isKepsek()) ? allSiswa : allSiswa.filter(s => siswaScopeKelas().includes(s.kelas));
      const sorted = [...scoped].sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      sorted.forEach(s => { select.innerHTML += `<option value="${s.key}">${escapeHtml(s.name)} - ${escapeHtml(s.kelas)}</option>`; });
    }
    function isiDataSurat() {
      const key = document.getElementById('suratSiswaSelect').value;
      if (!key) { selectedSiswaSurat = null; document.getElementById('suratPreview').innerHTML = generateKopSuratHTML() + '<p class="text-muted" style="text-align:center;padding:40px 0;">Pilih siswa untuk melihat preview.</p>'; return; }
      selectedSiswaSurat = allSiswa.find(s => s.key === key);
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
    function previewSurat() {
      const siswa = selectedSiswaSurat;
      if (!siswa) { toast('Pilih siswa terlebih dahulu!', true); return; }
      const jenis = document.getElementById('suratJenisSelect').value;
      const perluTanggalIjin = (jenis === 'ijin' || jenis === 'sakit');
      const tanggalIjinRaw = document.getElementById('suratTanggalIjin') ? document.getElementById('suratTanggalIjin').value : '';
      if (perluTanggalIjin && !tanggalIjinRaw) { toast('Pilih tanggal ijin/sakit terlebih dahulu!', true); return; }
      const tanggal = perluTanggalIjin
        ? new Date(tanggalIjinRaw + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
        : new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
      const tahun = new Date().getFullYear();
      let judul = '', isi = '', penutup = '';
      const namaAman = escapeHtml(siswa.name), kelasAman = escapeHtml(siswa.kelas);
      switch(jenis) {
        case 'aktif': judul = 'SURAT KETERANGAN AKTIF';
          isi = `Yang bertanda tangan di bawah ini, Kepala ${MADRASAH.nama}, menerangkan bahwa:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Bahwa siswa tersebut adalah benar-benar siswa aktif di ${MADRASAH.nama} pada tahun ajaran ${currentTahunAjaran}.<br><br>Surat keterangan ini diberikan untuk keperluan administrasi dan digunakan sebagaimana mestinya.`;
          penutup = `Demikian surat keterangan ini dibuat dengan sebenarnya.`; break;
        case 'pindah': judul = 'SURAT KETERANGAN PINDAH';
          isi = `Yang bertanda tangan di bawah ini, Kepala ${MADRASAH.nama}, menerangkan bahwa:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Bahwa siswa tersebut adalah benar-benar siswa aktif di ${MADRASAH.nama} dan telah menyelesaikan proses administrasi kepindahan.<br><br>Surat keterangan ini diberikan sebagai bukti kepindahan siswa untuk keperluan pendaftaran di sekolah baru.`;
          penutup = `Demikian surat keterangan ini dibuat dengan sebenarnya.`; break;
        case 'ijin': judul = 'SURAT IJIN TIDAK MASUK SEKOLAH';
          isi = `Yang bertanda tangan di bawah ini, orang tua/wali dari:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Dengan ini mengijinkan anak kami untuk tidak masuk sekolah pada tanggal ${tanggal} dikarenakan keperluan keluarga / kesehatan.<br><br>Demikian surat ijin ini kami buat untuk digunakan sebagaimana mestinya.`;
          penutup = `Mengetahui,<br>Orang Tua/Wali`; break;
        case 'sakit': judul = 'SURAT KETERANGAN SAKIT';
          isi = `Yang bertanda tangan di bawah ini, orang tua/wali dari:<br><br>Nama : <strong>${namaAman}</strong><br>Kelas : ${kelasAman}<br><br>Menerangkan bahwa anak kami tidak dapat mengikuti kegiatan belajar mengajar pada tanggal ${tanggal} karena sedang sakit.<br><br>Demikian surat keterangan ini dibuat dengan sebenarnya.`;
          penutup = `Mengetahui,<br>Orang Tua/Wali`; break;
      }
      const html = `
        ${generateKopSuratHTML()}
        <div class="judul-surat">${judul}</div>
        <div class="nomor-surat">Nomor: ${Math.floor(Math.random()*1000)+1}/MI-MU/${tahun}</div>
        <div class="body">
          <p>${isi}</p>
          <br>
          <p>${penutup}</p>
        </div>
        <div class="footer">
          <div style="width:100%;display:flex;justify-content:space-between;margin-top:30px;">
            <div>
              <p>Dikeluarkan di : Mambaul Ulum</p>
              <p>Tanggal : ${tanggal}</p>
            </div>
            <div style="text-align:center;">
              <p>Kepala ${MADRASAH.nama}</p>
              ${MADRASAH.ttdKepalaBase64
                ? `<img src="${MADRASAH.ttdKepalaBase64}" alt="Tanda tangan" style="max-height:45px;display:block;margin:6px auto;">`
                : '<br><br><br>'}
              <p><u>${MADRASAH.kepala_sekolah}</u></p>
              <p>NIP. ${MADRASAH.nip_kepala_sekolah}</p>
            </div>
          </div>
        </div>
      `;
      document.getElementById('suratPreview').innerHTML = html;
    }
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
    async function downloadSuratPDF() {
      const siswa = selectedSiswaSurat;
      if (!siswa) { toast('Pilih siswa terlebih dahulu!', true); return; }
      const jenis = document.getElementById('suratJenisSelect').value;
      const namaJenis = { 'aktif':'Keterangan_Aktif','pindah':'Keterangan_Pindah','ijin':'Surat_Ijin','sakit':'Surat_Sakit' }[jenis] || 'Surat';
      const perluTanggalIjin = (jenis === 'ijin' || jenis === 'sakit');
      const tanggalIjinRaw = document.getElementById('suratTanggalIjin') ? document.getElementById('suratTanggalIjin').value : '';
      const tanggal = perluTanggalIjin && tanggalIjinRaw
        ? new Date(tanggalIjinRaw + 'T00:00:00').toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
        : new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
      const { jsPDF } = window.jspdf; 
      const doc = new jsPDF('p', 'mm', 'a4'); 
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginKiri = 25, marginKanan = 25, lebarIsi = pageWidth - marginKiri - marginKanan;
      const [logoData, ttdKepalaData] = await Promise.all([v4LoadLogoForPdf(), v4LoadTtdKepalaForPdf()]);
      
      // Kop surat di PDF
      const offsetY1 = MADRASAH.nsm ? 5 : 0;
      v4TambahLogoKeKopPdf(doc, logoData, offsetY1);
      doc.setFontSize(16);
      doc.text(MADRASAH.nama, pageWidth/2, 20, { align: 'center' });
      doc.setFontSize(10);
      if (MADRASAH.nsm) { doc.setFont(undefined, 'bold'); doc.text(`NSM: ${MADRASAH.nsm}`, pageWidth/2, 25, { align: 'center' }); doc.setFont(undefined, 'normal'); }
      doc.text(MADRASAH.alamat, pageWidth/2, 27 + offsetY1, { align: 'center' });
      // Label teks biasa dipakai (bukan emoji) -- font default jsPDF tidak punya glyph emoji,
      // sebelumnya render jadi kotak/simbol rusak.
      doc.text(`Telp: ${MADRASAH.telp}  |  Email: ${MADRASAH.email}  |  Web: ${MADRASAH.website}`, pageWidth/2, 33 + offsetY1, { align: 'center' });
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(20, 38 + offsetY1, pageWidth - 20, 38 + offsetY1);
      doc.line(20, 40 + offsetY1, pageWidth - 20, 40 + offsetY1);
      
      // Judul surat
      const judulMap = {
        'aktif': 'SURAT KETERANGAN AKTIF',
        'pindah': 'SURAT KETERANGAN PINDAH',
        'ijin': 'SURAT IJIN TIDAK MASUK SEKOLAH',
        'sakit': 'SURAT KETERANGAN SAKIT'
      };
      doc.setFontSize(14);
      doc.text(judulMap[jenis] || 'SURAT KETERANGAN', pageWidth/2, 52 + offsetY1, { align: 'center', underline: true });
      doc.setFontSize(10);
      doc.text(`Nomor: ${Math.floor(Math.random()*1000)+1}/MI-MU/${new Date().getFullYear()}`, pageWidth/2, 60 + offsetY1, { align: 'center' });
      
      // Isi surat -- dibangun dari teks terstruktur (buatIsiSuratPlain), bukan dibaca ulang
      // dari innerHTML preview, dan setiap paragraf di-word-wrap pakai splitTextToSize supaya
      // tidak ada baris yang keluar dari tepi halaman.
      doc.setFontSize(12);
      let y = 72 + offsetY1;
      const cetakParagraf = (teks, opts) => {
        opts = opts || {};
        const paragraf = teks.split('\n\n');
        paragraf.forEach((p, idx) => {
          if (!p.trim()) return;
          const wrapped = doc.splitTextToSize(p.trim(), lebarIsi);
          wrapped.forEach(baris => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(baris, opts.tengah ? pageWidth/2 : marginKiri, y, opts.tengah ? { align: 'center' } : undefined);
            y += 6.5;
          });
          if (idx < paragraf.length - 1) y += 3; // jarak antar paragraf
        });
      };
      const konten = buatIsiSuratPlain(jenis, siswa, tanggal);
      cetakParagraf(konten.pembuka);
      y += 3;
      konten.identitas.forEach(baris => { if (y > 270) { doc.addPage(); y = 20; } doc.text(baris, marginKiri + 4, y); y += 6.5; });
      y += 3;
      cetakParagraf(konten.isi);
      y += 6;
      cetakParagraf(konten.penutup);
      
      // Dikeluarkan di & tanggal
      if (y > 265) { doc.addPage(); y = 20; }
      y += 8;
      doc.text('Dikeluarkan di : Mambaul Ulum', marginKiri, y);
      y += 6.5;
      doc.text('Tanggal : ' + tanggal, marginKiri, y);
      
      // Tanda tangan (satu-satunya blok tanda tangan, tidak ada duplikasi)
      if (y > 250) { doc.addPage(); y = 20; }
      y += 14;
      doc.text('Kepala ' + MADRASAH.nama, pageWidth/2, y, { align: 'center' });
      if (ttdKepalaData) {
        // Tanda tangan digital ditempel di ruang antara jabatan & nama. Rasio lebar:tinggi
        // gambar asli dijaga (bukan dipaksa kotak) supaya tidak gepeng/melar.
        try {
          const ttdW = 35;
          const propsTtd = doc.getImageProperties(ttdKepalaData);
          const ttdH = Math.min(18, ttdW * (propsTtd.height / propsTtd.width));
          doc.addImage(ttdKepalaData, 'PNG', pageWidth/2 - ttdW/2, y + 3, ttdW, ttdH);
        } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF:', e); }
        y += 22;
      } else {
        y += 20;
      }
      doc.text(MADRASAH.kepala_sekolah, pageWidth/2, y, { align: 'center' });
      y += 6;
      doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, pageWidth/2, y, { align: 'center' });
      
      doc.save(`Surat_${namaJenis}_${siswa.name}_${tglLokal()}.pdf`);
      toast('📥 Surat berhasil diunduh!'); 
      addLog('download_surat', `${jenis} - ${siswa.name}`);
    }
    function simpanSurat() {
      if (!isAdmin() && !isWaliKelas()) return toast('Hanya Admin & Wali Kelas!', true);
      const siswa = selectedSiswaSurat;
      if (!siswa) { toast('Pilih siswa terlebih dahulu!', true); return; }
      const jenis = document.getElementById('suratJenisSelect').value;
      const namaJenis = { 'aktif':'Keterangan Aktif','pindah':'Keterangan Pindah','ijin':'Surat Ijin','sakit':'Surat Sakit' }[jenis] || 'Surat';
      if (isBusy('simpanSurat')) return toast('Sedang menyimpan...', false, 1500);
      const html = document.getElementById('suratPreview').innerHTML;
      const btnSimpanSurat = document.getElementById('btnSimpanSurat');
      setBusy('simpanSurat', btnSimpanSurat);
      const ref = db.ref('surat').push();
      ref.set({ siswaKey: siswa.key, siswaName: siswa.name, kelas: siswa.kelas, jenis, jenisLabel: namaJenis, tanggal: new Date().toISOString(), tahunAjaran: currentTahunAjaran, dibuatOleh: currentUser.name, guruKey: currentUser.key || null, htmlContent: html, createdAt: new Date().toISOString() }, err => {
        clearBusy('simpanSurat', btnSimpanSurat);
        if (err) toast('Gagal simpan: '+err.message, true);
        else { toast('✅ Surat berhasil disimpan!'); addLog('simpan_surat', `${namaJenis} - ${siswa.name}`); loadSuratRiwayat(); }
      });
    }
    function loadSuratRiwayat() {
      db.ref('surat').orderByChild('createdAt').limitToLast(50).once('value', snap => {
        allSurat = []; snap.forEach(child => { const s = child.val(); s.key = child.key; if (isWaliKelas() && !loaderScopeKelas().includes(s.kelas)) return; allSurat.push(s); }); allSurat.reverse(); renderSuratRiwayat();
      });
    }
    function renderSuratRiwayat() {
      const container = document.getElementById('suratRiwayatList'), pagination = document.getElementById('suratPagination');
      if (allSurat.length === 0) { container.innerHTML = '<p class="text-muted" style="font-size:13px;padding:8px;">Belum ada surat yang dibuat.</p>'; pagination.innerHTML = ''; return; }
      const totalItems = allSurat.length, totalPages = Math.ceil(totalItems / PAGE_SIZE);
      if (suratPage > totalPages) suratPage = totalPages; if (suratPage < 1) suratPage = 1;
      const start = (suratPage - 1) * PAGE_SIZE, end = Math.min(start + PAGE_SIZE, totalItems), pageItems = allSurat.slice(start, end);
      let html = '';
      pageItems.forEach(s => {
        const tgl = s.tanggal ? new Date(s.tanggal).toLocaleDateString('id-ID') : '-', warna = { 'aktif':'#059669','pindah':'#d97706','ijin':'#2563eb','sakit':'#dc2626' }[s.jenis] || '#6b7280';
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f9fafb;border-radius:6px;margin-bottom:4px;border-left:4px solid ${warna};flex-wrap:wrap;gap:4px;"><div><span style="font-weight:600;">${escapeHtml(s.siswaName)}</span> <span class="text-muted" style="font-size:12px;">${escapeHtml(s.kelas)}</span> <span class="text-muted" style="font-size:12px;"> | ${escapeHtml(s.jenisLabel)}</span> <span class="text-muted" style="font-size:11px;">${tgl}</span></div><div style="display:flex;gap:4px;"><button class="btn btn-soft" style="padding:2px 10px;font-size:11px;" onclick="lihatSurat('${s.key}')">👁️</button>${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusSurat('${s.key}')">🗑️</button>` : ''}</div></div>`;
      });
      container.innerHTML = html;
      pagination.innerHTML = `<button onclick="suratPage--; renderSuratRiwayat();" ${suratPage <= 1 ? 'disabled' : ''}>◀ Prev</button><span class="page-info">${suratPage} / ${totalPages}</span><button onclick="suratPage++; renderSuratRiwayat();" ${suratPage >= totalPages ? 'disabled' : ''}>Next ▶</button><span class="text-muted" style="font-size:12px;">Total: ${totalItems}</span>`;
    }
    function lihatSurat(key) {
      const surat = allSurat.find(s => s.key === key);
      if (!surat) return toast('Surat tidak ditemukan!', true);
      document.getElementById('suratPreview').innerHTML = surat.htmlContent || '<p>Konten tidak tersedia</p>';
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

    // ============================================================
    // JADWAL PELAJARAN
    // ============================================================
    function populateJadwalGuruFilter() {
      // FIX: dulu opsi filter dibangun dari SET NAMA unik (allJadwal.map(j=>j.guru)) -- kalau ada
      // 2 guru bernama sama, cuma muncul 1 opsi di dropdown ini dan memilihnya menampilkan jadwal
      // GABUNGAN keduanya (lihat renderJadwal di bawah), padahal Admin mengira sedang melihat
      // jadwal satu orang saja. Sekarang opsi dibangun per guruKey unik (fallback ke nama untuk
      // baris jadwal lama yang belum punya guruKey), value = guruKey, label tetap nama guru.
      const select = document.getElementById('jadwalGuruFilter');
      select.innerHTML = '<option value="">Semua Guru</option>';
      const seen = new Map(); // value (guruKey/nama) -> nama tampilan
      allJadwal.forEach(j => { if (!j.guru) return; const val = j.guruKey || j.guru; if (!seen.has(val)) seen.set(val, j.guru); });
      [...seen.entries()].sort((a, b) => COLLATOR_ID.compare(a[1], b[1])).forEach(([val, nama]) => {
        select.innerHTML += `<option value="${escapeHtml(val)}">${escapeHtml(nama)}</option>`;
      });
    }
    function setJadwalView(view) {
      jadwalView = view;
      { const btnH = document.getElementById('btnViewHarian'); btnH.style.background = view === 'harian' ? '#2563eb' : '#e5e7eb';
        if (view === 'harian') { btnH.style.color = 'white'; btnH.classList.remove('text-strong'); } else { btnH.style.color = ''; btnH.classList.add('text-strong'); } }
      { const btnM = document.getElementById('btnViewMingguan'); btnM.style.background = view === 'mingguan' ? '#2563eb' : '#e5e7eb';
        if (view === 'mingguan') { btnM.style.color = 'white'; btnM.classList.remove('text-strong'); } else { btnM.style.color = ''; btnM.classList.add('text-strong'); } }
      renderJadwal();
    }
    function renderJadwal() {
      const kelas = document.getElementById('jadwalKelasFilter').value;
      const hari = document.getElementById('jadwalHariFilter').value;
      const filterGuru = document.getElementById('jadwalGuruFilter').value;
      const container = document.getElementById('jadwalTableWrapper');
      const isAdminUser = isAdmin();

      document.getElementById('btnTambahJadwal').style.display = isAdminUser ? 'inline-flex' : 'none';

      let filtered = allJadwal.filter(j => j.kelas === kelas);
      if (filterGuru) {
        filtered = filtered.filter(j => (j.guruKey || j.guru) === filterGuru);
      }

      if (jadwalView === 'mingguan') {
        // Label tampilan pakai NAMA guru (dari teks opsi terpilih), sedangkan filterGuru sendiri
        // (guruKey) tetap dipakai untuk pencocokan data -- supaya tidak menampilkan guruKey mentah
        // ("-Nabc123...") ke Admin di pesan "Menampilkan jadwal untuk guru: ...".
        const guruSelect = document.getElementById('jadwalGuruFilter');
        const filterGuruNama = guruSelect && guruSelect.selectedIndex > 0 ? guruSelect.options[guruSelect.selectedIndex].textContent : '';
        renderJadwalMingguan(filtered, kelas, filterGuruNama);
        return;
      }

      filtered = filtered.filter(j => j.hari === hari);
      filtered.sort((a, b) => (a.jam || 0) - (b.jam || 0));

      if (filtered.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;">Tidak ada jadwal untuk filter ini.</p>`;
        document.getElementById('jadwalPagination').innerHTML = '';
        return;
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / PAGE_SIZE);
      if (jadwalPage > totalPages) jadwalPage = totalPages;
      if (jadwalPage < 1) jadwalPage = 1;
      const start = (jadwalPage - 1) * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, totalItems);
      const pageItems = filtered.slice(start, end);

      let html = `<table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;">Jam ke-</th>
            <th style="padding:10px 12px;text-align:left;">Waktu</th>
            <th style="padding:10px 12px;text-align:left;">Mata Pelajaran</th>
            <th style="padding:10px 12px;text-align:left;">Guru</th>
            ${isAdminUser ? `<th style="padding:10px 12px;text-align:center;width:100px;">Aksi</th>` : ''}
          </tr>
        </thead>
        <tbody>`;

      pageItems.forEach(j => {
        const jamKe = j.jam || '-';
        const waktu = jamSettings[jamKe] ? `${jamSettings[jamKe].mulai} - ${jamSettings[jamKe].selesai}` : '-';
        const mapel = j.mapel || '-';
        const guru = j.guru || '-';
        const btnEdit = isAdminUser ? `<button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="editJadwal('${j.key}')">✏️</button>` : '';
        const btnDel = isAdminUser ? `<button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="hapusJadwal('${j.key}')">🗑️</button>` : '';
        html += `<tr class="jadwal-item">
          <td style="padding:8px 12px;font-weight:600;">${jamKe}</td>
          <td class="text-medium" style="padding:8px 12px;">${waktu}</td>
          <td style="padding:8px 12px;">${escapeHtml(mapel)}</td>
          <td style="padding:8px 12px;">${escapeHtml(guru)}</td>
          ${isAdminUser ? `<td style="padding:8px 12px;text-align:center;" class="jadwal-actions">${btnEdit} ${btnDel}</td>` : ''}
        </tr>`;
      });

      html += `</tbody></table>`;
      container.innerHTML = html;

      const paginationEl = document.getElementById('jadwalPagination');
      if (totalPages > 1) {
        paginationEl.innerHTML = `
          <button onclick="jadwalPage--; renderJadwal();" ${jadwalPage <= 1 ? 'disabled' : ''}>◀ Prev</button>
          <span class="page-info">${jadwalPage} / ${totalPages}</span>
          <button onclick="jadwalPage++; renderJadwal();" ${jadwalPage >= totalPages ? 'disabled' : ''}>Next ▶</button>
          <span class="text-muted" style="font-size:12px;">Total: ${totalItems}</span>
        `;
      } else {
        paginationEl.innerHTML = '';
      }
    }
    function renderJadwalMingguan(filtered, kelas, filterGuru) {
      const container = document.getElementById('jadwalTableWrapper');
      const isAdminUser = isAdmin();

      const hariOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      // Admin (tanpa filter guru) melihat SEMUA hari & SEMUA jam dari pengaturan jam, supaya ➕ bisa dipakai juga
      // untuk hari/jam yang belum punya jadwal sama sekali (mis. Sabtu, atau jam ke-6). Pengguna lain &
      // tampilan terfilter guru tetap ringkas: hanya hari/jam yang terisi.
      const tampilGridPenuh = isAdminUser && !filterGuru;
      const hariList = tampilGridPenuh ? hariOrder : hariOrder.filter(h => filtered.some(j => j.hari === h));

      if (hariList.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;">Tidak ada jadwal untuk kelas ${escapeHtml(kelas)}${filterGuru ? ' dengan guru '+escapeHtml(filterGuru) : ''}.</p>`;
        document.getElementById('jadwalPagination').innerHTML = '';
        return;
      }

      const jamSet = new Set();
      filtered.forEach(j => { if (j.jam) jamSet.add(j.jam); });
      if (tampilGridPenuh) Object.keys(jamSettings || {}).forEach(k => { const n = parseInt(k, 10); if (n > 0) jamSet.add(n); });
      const jamList = [...jamSet].sort((a,b) => a-b);

      if (jamList.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center;padding:20px;">Tidak ada data jam.</p>`;
        return;
      }

      let html = `<div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 10px;text-align:center;min-width:70px;">Jam ke-</th>
              ${hariList.map(h => `<th style="padding:8px 10px;text-align:center;min-width:100px;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;

      jamList.forEach(jam => {
        html += `<tr>`;
        const waktu = jamSettings[jam] ? `${jamSettings[jam].mulai} - ${jamSettings[jam].selesai}` : `Jam ${jam}`;
        html += `<td style="padding:8px 10px;font-weight:600;text-align:center;">${jam}<br><span class="text-muted" style="font-size:10px;">${waktu}</span></td>`;

        hariList.forEach(hari => {
          const jadwal = filtered.find(j => j.jam === jam && j.hari === hari);
          if (jadwal) {
            html += `<td style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb;">
              <div style="font-weight:500;">${escapeHtml(jadwal.mapel || '-')}</div>
              <div class="text-muted" style="font-size:10px;">${escapeHtml(jadwal.guru || '-')}</div>
            </td>`;
          } else {
            // Slot kosong: tombol ➕ per SEL (hari & jam sel itu sendiri). `filtered` bisa sudah disaring
            // per guru, jadi sel "kosong" belum tentu kosong di kelas -- cek ke allJadwal (semua guru).
            const slotTerisi = allJadwal.some(j => j.kelas === kelas && j.hari === hari && j.jam === jam);
            if (isAdminUser && !slotTerisi) {
              html += `<td style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb;"><button class="btn btn-edit" style="padding:2px 8px;font-size:10px;" title="Tambah jadwal ${hari} jam ke-${jam}" onclick="tambahJadwalCepat('${escapeJs(kelas)}', '${escapeJs(hari)}', ${jam})">➕</button></td>`;
            } else {
              html += `<td class="text-muted" style="padding:8px 10px;text-align:center;border:1px solid #e5e7eb;">-</td>`;
            }
          }
        });
        html += `</tr>`;
      });

      html += `</tbody></table></div>`;

      if (filterGuru) {
        html += `<p class="text-muted" style="font-size:12px;margin-top:8px;">📌 Menampilkan jadwal untuk guru: <strong>${filterGuru}</strong></p>`;
      }

      container.innerHTML = html;
      document.getElementById('jadwalPagination').innerHTML = '';
    }
    function tambahJadwalCepat(kelas, hari, jam) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      document.getElementById('jadwalFormContainer').style.display = 'block';
      document.getElementById('jadwalFormTitle').textContent = '➕ Tambah Jadwal';
      document.getElementById('editJadwalKey').value = '';
      document.getElementById('jadwalFormKelas').value = kelas;
      document.getElementById('jadwalFormHari').value = hari;
      document.getElementById('jadwalFormJam').value = jam;
      document.getElementById('jadwalFormMapel').value = '';
      document.getElementById('jadwalFormGuru').value = '';
      document.getElementById('jadwalFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
    function loadJadwal() {
      db.ref('jadwal').once('value', snap => {
        allJadwal = [];
        snap.forEach(child => {
          const j = child.val();
          j.key = child.key;
          allJadwal.push(j);
        });
        populateJadwalGuruFilter();
        renderJadwal();
        populateGuruDropdown();
        renderJadwalHariIni();
      });
    }
    function populateGuruDropdown() {
      // FIX: value dulu = nama guru -> kalau ada 2 guru dengan nama sama persis (kembar/senama),
      // sistem jadwal (bentrok-cek, "Jadwal Hari Ini" di dashboard) tidak bisa membedakan
      // keduanya sama sekali, sehingga jadwal salah satunya bisa "ketimpa" tampil punya yang lain.
      // Sekarang value = KEY unik guru (g.key), nama cuma jadi label tampilan. Guru tanpa key
      // (data lama) tetap fallback ke nama supaya tidak hilang dari daftar.
      const select = document.getElementById('jadwalFormGuru');
      select.innerHTML = '<option value="">-- Pilih Guru --</option>';
      allGuru.sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      allGuru.forEach(g => { const val = g.key || g.name; select.innerHTML += `<option value="${escapeHtml(val)}" data-nama="${escapeHtml(g.name)}">${escapeHtml(g.name)}</option>`; });
    }
    function showTambahJadwal() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      document.getElementById('jadwalFormContainer').style.display = 'block';
      document.getElementById('jadwalFormTitle').textContent = '➕ Tambah Jadwal';
      document.getElementById('editJadwalKey').value = '';
      document.getElementById('jadwalFormKelas').value = document.getElementById('jadwalKelasFilter').value;
      document.getElementById('jadwalFormHari').value = document.getElementById('jadwalHariFilter').value;
      document.getElementById('jadwalFormJam').value = '1';
      document.getElementById('jadwalFormMapel').value = '';
      document.getElementById('jadwalFormGuru').value = '';
      document.getElementById('jadwalFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
    function simpanJadwal() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('simpanJadwal')) return toast('Sedang menyimpan...', false, 1500);
      const key = document.getElementById('editJadwalKey').value, kelas = document.getElementById('jadwalFormKelas').value, hari = document.getElementById('jadwalFormHari').value, jam = parseInt(document.getElementById('jadwalFormJam').value), mapel = document.getElementById('jadwalFormMapel').value;
      const guruSelect = document.getElementById('jadwalFormGuru');
      const guruOpt = guruSelect.options[guruSelect.selectedIndex];
      const guruValue = guruSelect.value; // key guru (atau nama, fallback utk guru tanpa key)
      const guru = guruOpt && guruOpt.dataset.nama ? guruOpt.dataset.nama : guruValue; // nama utk tampilan
      const guruDipilih = (allGuru || []).find(g => (g.key || g.name) === guruValue);
      const guruKey = guruDipilih ? (guruDipilih.key || null) : null;
      if (!kelas || !hari || !jam || !mapel || !guruValue) return toast('Semua field wajib diisi!', true);
      const existing = allJadwal.find(j => j.kelas === kelas && j.hari === hari && j.jam === jam && j.key !== key);
      if (existing) return toast(`⚠️ Jadwal ${kelas} - ${hari} jam ke-${jam} sudah terisi!`, true);
      // ===== VALIDASI TAMBAHAN: guru yang sama tidak boleh dijadwalkan di KELAS LAIN pada
      // hari & jam yang sama -- sebelumnya hanya slot (kelas+hari+jam) yang dicek, jadi Admin
      // bisa tanpa sadar menjadwalkan satu guru mengajar 2 kelas sekaligus di jam yang sama
      // (yang secara fisik tidak mungkin dilakukan guru tersebut).
      // FIX: dulu dicocokkan lewat NAMA (j.guru === guru) -- kalau ada 2 guru bernama sama,
      // jadwal guru A dianggap "bentrok" dengan jadwal guru B yang sebenarnya orang lain, dan
      // "Jadwal Hari Ini" di dashboard ikut mencampur jadwal keduanya. Sekarang dicocokkan lewat
      // guruKey (unik per guru); fallback ke nama hanya kalau guru itu memang tidak punya key.
      const cocokGuruSama = j => guruKey ? j.guruKey === guruKey : (!j.guruKey && j.guru === guru);
      const bentrokGuru = allJadwal.find(j => cocokGuruSama(j) && j.hari === hari && j.jam === jam && j.key !== key && j.kelas !== kelas);
      if (bentrokGuru) return toast(`⚠️ ${guru} sudah dijadwalkan mengajar ${bentrokGuru.kelas} pada ${hari} jam ke-${jam}! Satu guru tidak bisa mengajar 2 kelas di jam yang sama.`, true);
      const data = { kelas, hari, jam, mapel, guru, guruKey: guruKey || null, updatedAt: new Date().toISOString() };
      const ref = key ? db.ref('jadwal/' + key) : db.ref('jadwal').push();
      const btnSimpanJadwal = document.getElementById('btnSimpanJadwal');
      setBusy('simpanJadwal', btnSimpanJadwal);
      ref.set(data, err => {
        clearBusy('simpanJadwal', btnSimpanJadwal);
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ Jadwal tersimpan!'); addLog('simpan_jadwal', `${kelas} - ${hari} - Jam ${jam} - ${mapel}`); batalJadwal(); loadJadwal(); }
      });
    }
    function editJadwal(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const j = allJadwal.find(item => item.key === key);
      if (!j) return toast('Jadwal tidak ditemukan!', true);
      document.getElementById('editJadwalKey').value = key;
      document.getElementById('jadwalFormContainer').style.display = 'block';
      document.getElementById('jadwalFormTitle').textContent = '✏️ Edit Jadwal';
      document.getElementById('jadwalFormKelas').value = j.kelas;
      document.getElementById('jadwalFormHari').value = j.hari;
      document.getElementById('jadwalFormJam').value = j.jam || 1;
      document.getElementById('jadwalFormMapel').value = j.mapel || '';
      document.getElementById('jadwalFormGuru').value = j.guruKey || j.guru || '';
      document.getElementById('jadwalFormContainer').scrollIntoView({ behavior: 'smooth' });
    }
    function batalJadwal() { document.getElementById('jadwalFormContainer').style.display = 'none'; document.getElementById('editJadwalKey').value = ''; }
    function hapusJadwal(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus jadwal ini?')) return;
      db.ref('jadwal/' + key).remove(err => {
        if (err) toast('Gagal: '+err.message, true);
        else { toast('✅ Jadwal dihapus.'); addLog('hapus_jadwal', 'Jadwal dihapus'); loadJadwal(); }
      });
    }
    function exportJadwalPDF() {
      const kelas = document.getElementById('jadwalKelasFilter').value, hari = document.getElementById('jadwalHariFilter').value;
      const filtered = allJadwal.filter(j => j.kelas === kelas && j.hari === hari);
      filtered.sort((a, b) => (a.jam || 0) - (b.jam || 0));
      if (filtered.length === 0) return toast(`Tidak ada jadwal untuk ${kelas} - ${hari}`, true);
      const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4'); const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(18); doc.text('JADWAL PELAJARAN', pageWidth/2, 20, { align: 'center' });
      doc.setFontSize(14); doc.text(`Kelas ${kelas} - ${hari}`, pageWidth/2, 30, { align: 'center' });
      doc.setFontSize(10); doc.text(`Dicetak: ${new Date().toLocaleString()}`, pageWidth - 20, 38, { align: 'right' });
      doc.line(20, 42, pageWidth - 20, 42);
      const rows = filtered.map(j => { const waktu = jamSettings[j.jam] ? `${jamSettings[j.jam].mulai} - ${jamSettings[j.jam].selesai}` : '-'; return [`Jam ke-${j.jam}`, waktu, j.mapel || '-', j.guru || '-']; });
      doc.autoTable({ startY: 48, head: [['Jam ke-', 'Waktu', 'Mata Pelajaran', 'Guru']], body: rows, theme: 'striped', styles: { fontSize: 10 }, headStyles: { fillColor: [37,99,235], textColor: [255,255,255], fontSize: 11, fontStyle: 'bold' }, margin: { left: 15, right: 15 } });
      doc.save(`Jadwal_${kelas}_${hari}.pdf`); toast('📥 Jadwal berhasil diunduh!');
    }

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
        return db.ref('teacher_attendance').update(updates);
      }).then(() => {
        clearBusy('simpanKoreksiAbsenGuru', null);
        toast(`✅ Koreksi absen ${jenis} untuk ${guru} tersimpan!`);
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
      if (!editingGuruKey) return toast('Error: tidak ada guru yang diedit!', true);
      const name = document.getElementById('editGuruName').value.trim(), pin = document.getElementById('editGuruPin').value.trim();
      if (!name) return toast('Nama wajib!', true);
      let updateData = { name };
      if (pin) { if (!/^\d{6}$/.test(pin)) return toast('PIN 6 digit!', true); updateData.pin = hashPinSalted(pin, editingGuruKey); }
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
      db.ref('guru/' + editingGuruKey).update(updateData, err => {
        if (err) toast('Gagal update: '+err.message, true);
        else { toast('✅ Data guru diupdate!'); addLog('edit_guru', name); closeEditGuruModal(); reloadDataset('logs'); loadGuruListForLogin(() => renderUserList()); }
      });
    }
    // ============================================================
    // NAIK KELAS & LULUS
    // ============================================================
    function promoteClass() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const kelasAsal = document.getElementById('promoteClass').value;
      if (kelasAsal === 'Kelas 6') return toast('Kelas 6 tidak bisa naik, gunakan tombol Lulus!', true);
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
      siswaDiKelas.forEach(s => { db.ref('siswa/'+s.key).update({ kelas: kelasTujuan, updatedAt: new Date().toISOString() }, err => { processed++; if (err) console.error('Gagal update:', s.name, err); if (processed === total) { hideLoading(); toast(`✅ ${total} siswa berhasil naik ke ${kelasTujuan}!`); addLog('promosi_kelas', kelasAsal + ' → ' + kelasTujuan + ' (' + total + ' siswa)'); reloadDataset('siswa', () => { populateClassFilterDropdowns(); renderSiswa(); }); } }); });
    }
    function graduateClass() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('graduateClass')) return toast('Sedang memproses, mohon tunggu...', false, 1500);
      const kelas = 'Kelas 6';
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

    // ============================================================
    // REKAP DOWNLOADS
    // ============================================================
    function downloadRekapAbsensiSiswa() { if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const today = document.getElementById('rekapFilterTanggal').value || tglLokal();
      const filterGuru = document.getElementById('rekapFilterGuru').value, filterKelas = document.getElementById('rekapFilterKelas').value;
      let data = allAttendance.filter(a => a.tanggal === today);
      // FIX: record absensi siswa sudah punya guruKey (lihat simpanAbsensi) -- filterGuru sekarang
      // berisi guruKey, jadi cocokkan lewat itu supaya tidak salah tembak antar guru bernama sama.
      if (filterGuru) data = data.filter(a => (a.guruKey || a.guru) === filterGuru); if (filterKelas) data = data.filter(a => a.kelas === filterKelas);
      let csv = 'Tanggal,Kelas,Guru,Siswa,Status\n';
      data.forEach(a => { if (a.data) { Object.entries(a.data).forEach(([siswaKey, status]) => { const siswa = allSiswa.find(s => s.key === siswaKey); const namaSiswa = siswa ? siswa.name : siswaKey; csv += `${a.tanggal},${a.kelas},${a.guru},${namaSiswa},${status}\n`; }); } });
      downloadFile(csv, `rekap_absensi_siswa_${today}.csv`, 'text/csv'); toast('📥 Rekap absensi siswa diunduh.');
    }
    function downloadRekapAbsensiGuru() { if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const today = document.getElementById('rekapFilterTanggal').value || tglLokal();
      const filterGuru = document.getElementById('rekapFilterGuru').value;
      let data = allTeacherAttendance.filter(a => a.tanggal === today);
      if (filterGuru) data = data.filter(a => (a.guruKey || a.guru) === filterGuru);
      let csv = 'Tanggal,Guru,Kelas,Waktu,Type,Ke,Metode,Jam,Keterangan\n';
      data.forEach(a => { const kelasStr = Array.isArray(a.kelas) ? a.kelas.join(', ') : a.kelas || '-'; const waktu = a.waktu ? new Date(a.waktu).toLocaleString() : '-'; csv += `${a.tanggal},${a.guru},${kelasStr},${waktu},${a.type||'Reguler'},${a.ke||1},${a.metode||'manual'},${a.jam_ke||'-'},${a.keterangan||'-'}\n`; });
      downloadFile(csv, `rekap_absensi_guru_${today}.csv`, 'text/csv'); toast('📥 Rekap absensi guru diunduh.');
    }
    function downloadRekapSemua() { if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const filterGuru = document.getElementById('rekapFilterGuru').value, filterKelas = document.getElementById('rekapFilterKelas').value;
      let siswa = allSiswa, guru = allGuru, jurnal = allJournals, absenSiswa = allAttendance, absenGuru = allTeacherAttendance;
      // Siswa (wali kelas) cuma simpan nama, tidak ada guruKey -- resolve filterGuru (key) balik
      // ke nama khusus untuk baris ini. Jurnal & absen guru sudah punya guruKey, cocokkan lewat itu.
      const filterGuruNama = filterGuru ? ((allGuru || []).find(g => (g.key || g.name) === filterGuru)?.name || filterGuru) : '';
      if (filterGuru) { siswa = siswa.filter(s => s.guru === filterGuruNama); jurnal = jurnal.filter(j => (j.guruKey || j.guru) === filterGuru); absenGuru = absenGuru.filter(a => (a.guruKey || a.guru) === filterGuru); }
      if (filterKelas) { siswa = siswa.filter(s => s.kelas === filterKelas); jurnal = jurnal.filter(j => j.kelas === filterKelas); absenSiswa = absenSiswa.filter(a => a.kelas === filterKelas); }
      let csv = '=== DATA GURU ===\nNama,Kelas,SemuaKelas,Role\n';
      guru.forEach(g => { const kelasStr = Array.isArray(g.kelas) ? g.kelas.join('; ') : g.kelas || '-'; csv += `${g.name},${kelasStr},${g.semuaKelas ? 'Ya' : 'Tidak'},${g.role||'guru'}\n`; });
      csv += '\n=== DATA SISWA ===\nNama,Kelas,Guru\n';
      siswa.forEach(s => { csv += `${s.name},${s.kelas},${s.guru || '-'}\n`; });
      csv += '\n=== JURNAL ===\nTanggal,Guru,Kelas,Subject,Kegiatan,Jam,Type\n';
      jurnal.forEach(j => { csv += `${j.tanggal},${j.guru},${j.kelas},${j.subject},"${j.activity}",${j.jam_ke||'-'},${j.type||'Reguler'}\n`; });
      csv += '\n=== ABSENSI SISWA ===\nTanggal,Kelas,Guru,Siswa,Status\n';
      absenSiswa.forEach(a => { if (a.data) { Object.entries(a.data).forEach(([siswaKey, status]) => { const siswa = allSiswa.find(s => s.key === siswaKey); const namaSiswa = siswa ? siswa.name : siswaKey; csv += `${a.tanggal},${a.kelas},${a.guru},${namaSiswa},${status}\n`; }); } });
      csv += '\n=== ABSENSI GURU ===\nTanggal,Guru,Kelas,Waktu,Type,Ke,Metode,Jam\n';
      absenGuru.forEach(a => { const kelasStr = Array.isArray(a.kelas) ? a.kelas.join('; ') : a.kelas || '-'; const waktu = a.waktu ? new Date(a.waktu).toLocaleString() : '-'; csv += `${a.tanggal},${a.guru},${kelasStr},${waktu},${a.type||'Reguler'},${a.ke||1},${a.metode||'manual'},${a.jam_ke||'-'}\n`; });
      csv += '\n=== ABSENSI RELIGI ===\nTanggal,Guru,Dluha,Dzuhur\n';
      // FIX: seksi ini sebelumnya SELALU memuat semua guru, tidak ikut kena filterGuru --
      // padahal semua seksi lain di atas (jurnal, absenGuru, dst) sudah taat pada filter yang
      // dipilih Admin/Kepsek di halaman Rekap. Sekarang dicocokkan sama seperti jurnal/absenGuru:
      // guruKey dulu (record baru), fallback ke nama (record lama yang belum punya guruKey).
      let religi = allReligiAttendance;
      if (filterGuru) religi = religi.filter(r => (r.guruKey || r.guru) === filterGuru);
      religi.forEach(r => { const dluha = r.sholat_dluha ? r.sholat_dluha.status : '-'; const dzuhur = r.sholat_dzuhur ? r.sholat_dzuhur.status : '-'; csv += `${r.tanggal},${r.guru},${dluha},${dzuhur}\n`; });
      const today = tglLokal();
      downloadFile(csv, `rekap_semua_data_${today}.csv`, 'text/csv'); toast('📥 Rekap semua data diunduh.');
    }

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
    // Backup rutin (manualBackup/autoBackup) TETAP jalan seperti biasa -- itu cuma BACA root,
    // bukan tulis, dan root ".read" sengaja tetap dibiarkan terbuka untuk kenyamanan backup.
    function resetSemua() { toast('Fitur ini sudah dipindah ke Firebase Console demi keamanan data. Hubungi pengelola akun project.', true); }
    function exportData() { toast('Fitur ini sudah dipindah ke Firebase Console demi keamanan data. Hubungi pengelola akun project.', true); }
    function importData(event) { if (event && event.target) event.target.value = ''; toast('Fitur ini sudah dipindah ke Firebase Console demi keamanan data. Hubungi pengelola akun project.', true); }

    // ============================================================
    // NEW FEATURE: LAPORAN FORMAL
    // ============================================================
    function loadReportPreview() {
      const type = document.getElementById('reportType').value;
      const kelas = document.getElementById('reportClass').value;
      const month = document.getElementById('reportMonth').value;
      const year = document.getElementById('reportYear').value;
      const container = document.getElementById('reportPreviewContainer');
      
      if (!container) return;

      let html = generateKopSuratHTML() + '<div style="padding-top:10px;">';
      switch(type) {
        case 'kehadiran':
          html += generateKehadiranReport(kelas, month, year);
          break;
        case 'nilai':
          html += generateNilaiReport(kelas, month, year);
          break;
        case 'honor':
          html += generateHonorReport(month, year);
          break;
        case 'jurnal':
          html += generateJurnalReport(month, year);
          break;
        case 'absensi-guru':
          html += generateAbsensiGuruReport(month, year);
          break;
        default:
          html = '<p class="text-muted" style="text-align:center;padding:20px 0;">Pilih jenis laporan.</p>';
      }
      html += '</div>';
      container.innerHTML = html;
    }

    function generateKehadiranReport(kelas, month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const siswa = allSiswa.filter(s => s.kelas === kelas);
      const monthStr = year + '-' + String(month).padStart(2, '0');
      
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">LAPORAN KEHADIRAN SISWA</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">Kelas ${escapeHtml(kelas)} - ${monthName} ${year}</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>
              <th>Hadir</th>
              <th>Sakit</th>
              <th>Izin</th>
              <th>Alfa</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>`;

      let totalHadir = 0, totalSakit = 0, totalIzin = 0, totalAlfa = 0;
      siswa.forEach((s, idx) => {
        const attendanceData = allAttendance.filter(a => a.tanggal.startsWith(monthStr) && a.kelas === kelas);
        let hadir = 0, sakit = 0, izin = 0, alfa = 0;
        attendanceData.forEach(a => {
          if (a.data && a.data[s.key]) {
            const status = a.data[s.key];
            if (status === 'H') hadir++;
            else if (status === 'S') sakit++;
            else if (status === 'I') izin++;
            else if (status === 'A') alfa++;
          }
        });
        const total = hadir + sakit + izin + alfa;
        totalHadir += hadir; totalSakit += sakit; totalIzin += izin; totalAlfa += alfa;
        html += `<tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${hadir}</td>
          <td>${sakit}</td>
          <td>${izin}</td>
          <td>${alfa}</td>
          <td>${total}</td>
        </tr>`;
      });

      html += `
          </tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="2">TOTAL</td>
              <td>${totalHadir}</td>
              <td>${totalSakit}</td>
              <td>${totalIzin}</td>
              <td>${totalAlfa}</td>
              <td>${totalHadir + totalSakit + totalIzin + totalAlfa}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">
          Dicetak: ${new Date().toLocaleString()}
        </div>
      `;
      return html;
    }

    function generateNilaiReport(kelas, month, year) {
      const semester = parseInt(month) <= 6 ? 'Genap' : 'Ganjil';
      const siswa = allSiswa.filter(s => s.kelas === kelas);
      const grades = allGrades.filter(g => g.kelas === kelas && g.semester === semester);
      const subjects = [...new Set(grades.map(g => g.subject))].sort();

      if (subjects.length === 0) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Belum ada data nilai untuk kelas ${escapeHtml(kelas)} semester ${escapeHtml(semester)}.</p>`;
      }

      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">LAPORAN NILAI RAPOR</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">Kelas ${escapeHtml(kelas)} - Semester ${escapeHtml(semester)}<br>Tahun Ajaran ${currentTahunAjaran}</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Siswa</th>`;
      
      subjects.forEach(sub => {
        html += `<th>${sub}</th>`;
      });
      html += `<th>Rata-rata</th></tr></thead><tbody>`;

      let totalNilaiMap = {};
      siswa.forEach((s, idx) => {
        const gradeData = grades.filter(g => g.siswaKey === s.key);
        const nilaiMap = {};
        gradeData.forEach(g => {
          if (g.data) nilaiMap[g.subject] = calculateRapor(g.data);
        });
        let totalSiswa = 0, countSiswa = 0;
        html += `<tr><td>${idx + 1}</td><td>${escapeHtml(s.name)}</td>`;
        subjects.forEach(sub => {
          const n = nilaiMap[sub];
          if (n !== undefined) {
            html += `<td>${n}</td>`;
            totalSiswa += n;
            countSiswa++;
            if (!totalNilaiMap[sub]) totalNilaiMap[sub] = { total: 0, count: 0 };
            totalNilaiMap[sub].total += n;
            totalNilaiMap[sub].count++;
          } else {
            html += `<td class="text-muted">-</td>`;
          }
        });
        const rata = countSiswa > 0 ? Math.round(totalSiswa / countSiswa) : '-';
        html += `<td style="font-weight:700;${rata !== '-' && rata >= 75 ? 'color:#059669;' : rata !== '-' && rata < 60 ? 'color:#dc2626;' : ''}">${rata}</td></tr>`;
      });

      html += `</tbody><tfoot><tr style="font-weight:700;background:#fef3c7;"><td colspan="2">Rata-rata Kelas</td>`;
      let totalRataKelas = 0, countRataKelas = 0;
      subjects.forEach(sub => {
        const data = totalNilaiMap[sub];
        if (data && data.count > 0) {
          const rata = Math.round(data.total / data.count);
          html += `<td>${rata}</td>`;
          totalRataKelas += rata;
          countRataKelas++;
        } else {
          html += `<td>-</td>`;
        }
      });
      const rataKelas = countRataKelas > 0 ? Math.round(totalRataKelas / countRataKelas) : '-';
      html += `<td style="color:#059669;">${rataKelas}</td></tr></tfoot></table>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">
          Dicetak: ${new Date().toLocaleString()}
        </div>
      `;
      return html;
    }

    function generateHonorReport(month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const monthStr = String(month).padStart(2, '0');
      
      const filteredJournals = allJournals.filter(j => {
        if (!j.tanggal) return false;
        const parts = j.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && j.tahunAjaran === currentTahunAjaran && j.status !== 'ditolak';
      });
      const filteredReligi = allReligiAttendance.filter(r => {
        if (!r.tanggal) return false;
        const parts = r.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && r.tahunAjaran === currentTahunAjaran;
      });
      const filteredEvents = allEventAttendance.filter(e => {
        if (!e.tanggal) return false;
        const parts = e.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && e.tahunAjaran === currentTahunAjaran;
      });
      const filteredUjian = allUjianAttendance.filter(u => {
        if (!u.tanggal) return false;
        const parts = u.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && u.tahunAjaran === currentTahunAjaran;
      });
      const filteredEkskulPic = allEkskulPicHonor.filter(x => {
        if (!x.tanggal) return false;
        const parts = x.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && x.tahunAjaran === currentTahunAjaran;
      });
      const guruAktifTunjangan = (allGuru || []).filter(g => (g.role === 'guru' || g.role === 'wali_kelas') && ((g.tunjanganMasaKerja||0) > 0 || (g.bantuanTransportasi||0) > 0));
      // FIX: dulu fungsi ini return kosong kalau kelima sumber data guru kosong, PADAHAL
      // renderHonor() tetap menampilkan (dan menjumlahkan) bonus tetap Kepala Madrasah & Ketua
      // Yayasan setiap bulan, terlepas ada tidaknya data guru lain -- lihat guruTerajinBulanIni
      // di bawah, yang juga harus ikut jadi syarat "ada data" seperti di renderHonor().
      const guruTerajinKeyReport = year + '-' + monthStr;
      const guruTerajinBulanIniReport = allGuruTerajin[guruTerajinKeyReport];
      if (filteredJournals.length === 0 && filteredReligi.length === 0 && filteredEvents.length === 0 && filteredUjian.length === 0 && guruAktifTunjangan.length === 0 && !guruTerajinBulanIniReport) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Tidak ada data untuk bulan ${monthName} ${year}.</p>`;
      }

      // FIX: dulu dikelompokkan pakai `j.guruKey || j.guru` polos -- ini justru menghidupkan lagi
      // bug yang sudah diperbaiki di renderHonor() (lihat catatan di sana): kalau untuk satu guru
      // yang sama sebagian record sudah punya guruKey dan sebagian belum (mis. jurnal sudah,
      // religi/event yang dicatat fitur lebih lama belum), guru itu pecah jadi 2 baris di laporan
      // cetak ini dengan rincian honor berbeda-beda -- dan TOTAL HONOR laporan jadi tidak sama
      // dengan yang tampil di layar Honor untuk bulan yang sama. Sekarang pakai resolveGuruKey
      // yang SAMA seperti renderHonor(): guruKey dulu, kalau tidak ada coba cari lewat nama di
      // allGuru, baru fallback ke nama mentah.
      const namaGuruToKeyReport = {};
      (allGuru || []).forEach(g => { if (g.key) namaGuruToKeyReport[g.name] = g.key; });
      const resolveGuruKeyReport = (guruKey, namaGuru) => guruKey || namaGuruToKeyReport[namaGuru] || namaGuru;
      const groupedJurnal = {};
      filteredJournals.forEach(j => {
        const gk = resolveGuruKeyReport(j.guruKey, j.guru);
        if (!groupedJurnal[gk]) groupedJurnal[gk] = { nama: j.guru, reguler: 0, nonReguler: 0, ekstra: 0, ekstraHonor: 0 };
        if (isJamEkstra(j.jam_ke)) { groupedJurnal[gk].ekstra += 1; groupedJurnal[gk].ekstraHonor += getEkstraRate(j.subject); }
        else if (j.type === 'Non-Reguler') groupedJurnal[gk].nonReguler += 1;
        else groupedJurnal[gk].reguler += 1;
      });

      const groupedReligi = {};
      filteredReligi.forEach(r => {
        const gk = resolveGuruKeyReport(r.guruKey, r.guru);
        if (!groupedReligi[gk]) groupedReligi[gk] = { nama: r.guru, dluha: 0, dzuhur: 0 };
        if (r.sholat_dluha && r.sholat_dluha.status === 'Hadir') groupedReligi[gk].dluha += 1;
        if (r.sholat_dzuhur && r.sholat_dzuhur.status === 'Hadir') groupedReligi[gk].dzuhur += 1;
      });

      const groupedEvents = {};
      filteredEvents.forEach(e => {
        const gk = resolveGuruKeyReport(e.guruKey, e.guru);
        if (!groupedEvents[gk]) groupedEvents[gk] = { nama: e.guru, jumlah: 0, honor: 0 };
        groupedEvents[gk].jumlah += 1;
        groupedEvents[gk].honor += (e.honor || 0);
      });

      const groupedUjian = {};
      filteredUjian.forEach(u => {
        const gk = resolveGuruKeyReport(u.guruKey, u.guru);
        if (!groupedUjian[gk]) groupedUjian[gk] = { nama: u.guru, jumlah: 0, honor: 0 };
        groupedUjian[gk].jumlah += 1;
        groupedUjian[gk].honor += (u.honor || 0);
      });

      const groupedEkskulPic = {};
      filteredEkskulPic.forEach(x => {
        const gk = resolveGuruKeyReport(x.guruKey, x.guru);
        if (!groupedEkskulPic[gk]) groupedEkskulPic[gk] = { nama: x.guru, jumlah: 0, honor: 0 };
        groupedEkskulPic[gk].jumlah += 1;
        groupedEkskulPic[gk].honor += (x.honor || 0);
      });

      const rates = v4GetHonorRates(), HONOR_KEPSEK_REPORT = 300000, HONOR_KETUA_YAYASAN_REPORT = 350000;
      const allTeacherKeys = new Set([...Object.keys(groupedJurnal), ...Object.keys(groupedReligi), ...Object.keys(groupedEvents), ...Object.keys(groupedUjian), ...Object.keys(groupedEkskulPic), ...guruAktifTunjangan.map(g => g.key || g.name)]);
      // FIX: bonus tetap Kepala Madrasah & Ketua Yayasan, plus Guru Terajin bulan ini kalau ada --
      // sebelumnya TIDAK ADA di laporan cetak sama sekali, padahal renderHonor() selalu
      // menyertakan & menjumlahkannya ke totalHonor. Baris ini yang membuat TOTAL HONOR di
      // laporan cetak selalu lebih kecil ±Rp 650.000 (+ bonus guru terajin bila ada) dibanding
      // yang tampil di layar Honor untuk bulan yang sama.
      let bonusListReport = [{ label: 'Kepala Madrasah', amount: HONOR_KEPSEK_REPORT }, { label: 'Ketua Yayasan', amount: HONOR_KETUA_YAYASAN_REPORT }];
      if (guruTerajinBulanIniReport) bonusListReport.push({ label: `🏆 Guru Terajin - ${guruTerajinBulanIniReport.guru}`, amount: guruTerajinBulanIniReport.honor });
      
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">LAPORAN HONOR GURU</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">${monthName} ${year}</div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Guru</th>
              <th>Reguler</th>
              <th>Non-Reg</th>
              <th>Ekstra</th>
              <th>Dluha</th>
              <th>Dzuhur</th>
              <th>Lembur/Rapat</th>
              <th>Ujian</th>
              <th>Tunjangan</th>
              <th>Transport</th>
              <th>Total Honor</th>
            </tr>
          </thead>
          <tbody>`;

      let no = 1, totalHonor = 0;
      bonusListReport.forEach(bonus => {
        totalHonor += bonus.amount;
        html += `<tr style="background:#fef3c7;font-weight:600;">
          <td>${no++}</td>
          <td>${escapeHtml(bonus.label)}</td>
          <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
          <td>-</td><td>-</td>
          <td style="font-weight:700;color:#059669;">Rp ${bonus.amount.toLocaleString()}</td>
        </tr>`;
      });
      for (const guruKey of allTeacherKeys) {
        const j = groupedJurnal[guruKey] || { reguler: 0, nonReguler: 0, ekstra: 0, ekstraHonor: 0 };
        const r = groupedReligi[guruKey] || { dluha: 0, dzuhur: 0 };
        const ev = groupedEvents[guruKey] || { jumlah: 0, honor: 0 };
        const uj = groupedUjian[guruKey] || { jumlah: 0, honor: 0 };
        const ekpic = groupedEkskulPic[guruKey] || { jumlah: 0, honor: 0 };
        const guruObj = allGuru.find(g => g.key === guruKey) || allGuru.find(g => g.name === guruKey);
        const guru = j.nama || r.nama || ev.nama || uj.nama || ekpic.nama || (guruObj && guruObj.name) || guruKey;
        const tunjangan = (guruObj && guruObj.tunjanganMasaKerja) || 0, transport = (guruObj && guruObj.bantuanTransportasi) || 0;
        const honor = v4HitungHonor({ reguler: j.reguler, nonReguler: j.nonReguler, ekstraHonor: j.ekstraHonor + ekpic.honor, dluha: r.dluha, dzuhur: r.dzuhur, eventHonor: ev.honor, ujianHonor: uj.honor, tunjangan, transport }, rates);
        totalHonor += honor;
        html += `<tr>
          <td>${no++}</td>
          <td>${escapeHtml(guru)}</td>
          <td>${j.reguler}</td>
          <td>${j.nonReguler}</td>
          <td>${j.ekstra}x (Rp ${(j.ekstraHonor + ekpic.honor).toLocaleString()})</td>
          <td>${r.dluha}</td>
          <td>${r.dzuhur}</td>
          <td>${ev.jumlah}x (Rp ${ev.honor.toLocaleString()})</td>
          <td>${uj.jumlah}x (Rp ${uj.honor.toLocaleString()})</td>
          <td>Rp ${tunjangan.toLocaleString()}</td>
          <td>Rp ${transport.toLocaleString()}</td>
          <td style="font-weight:700;color:#059669;">Rp ${honor.toLocaleString()}</td>
        </tr>`;
      }

      html += `
          </tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="11" style="text-align:right;">TOTAL HONOR</td>
              <td style="color:#059669;font-size:14px;">Rp ${totalHonor.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:8px;font-size:10px;">
          * Reguler: Rp ${rates.reguler}/jam | Non-Reguler: Rp ${rates.nonReguler}/jam | Ekstra: sesuai rate per kegiatan<br>
          * Dluha: Rp ${rates.dluha}/hadir | Dzuhur: Rp ${rates.dzuhur}/hadir | Lembur/Rapat & Ujian: sesuai honor per sesi | Tunjangan & Transport: sesuai pengaturan per guru
        </div>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">
          Dicetak: ${new Date().toLocaleString()}
        </div>
      `;
      return html;
    }

    function generateJurnalReport(month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const monthStr = String(month).padStart(2, '0');
      const filteredJournals = allJournals.filter(j => {
        if (!j.tanggal) return false;
        const parts = j.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && j.tahunAjaran === currentTahunAjaran && j.status !== 'ditolak';
      });
      if (filteredJournals.length === 0) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Tidak ada data jurnal untuk bulan ${monthName} ${year}.</p>`;
      }
      const grouped = {};
      // FIX: dulu dikelompokkan pakai NAMA (grouped[j.guru]) -- kalau ada 2 guru bernama sama,
      // jumlah jam Reguler/Non-Reguler/Ekstra keduanya SILANG TERGABUNG jadi satu baris di
      // laporan cetak ini. generateHonorReport() di atas sudah dibenahi pakai guruKey; sekarang
      // laporan ini disamakan.
      filteredJournals.forEach(j => {
        const gk = j.guruKey || j.guru;
        if (!grouped[gk]) grouped[gk] = { nama: j.guru, reguler: 0, nonReguler: 0, ekstra: 0 };
        if (isJamEkstra(j.jam_ke)) grouped[gk].ekstra += 1;
        else if (j.type === 'Non-Reguler') grouped[gk].nonReguler += 1;
        else grouped[gk].reguler += 1;
      });
      const guruList = Object.keys(grouped).sort((a,b) => COLLATOR_ID.compare(grouped[a].nama, grouped[b].nama));
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">REKAP JURNAL MENGAJAR</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">${monthName} ${year}</div>
        <table>
          <thead>
            <tr><th>No</th><th>Nama Guru</th><th>Reguler</th><th>Non-Reguler</th><th>Ekstra</th><th>Total Jam</th></tr>
          </thead>
          <tbody>`;
      let no = 1, tReguler = 0, tNonReguler = 0, tEkstra = 0, tTotal = 0;
      guruList.forEach(guru => {
        const g = grouped[guru]; const total = g.reguler + g.nonReguler + g.ekstra;
        tReguler += g.reguler; tNonReguler += g.nonReguler; tEkstra += g.ekstra; tTotal += total;
        html += `<tr><td>${no++}</td><td>${escapeHtml(g.nama)}</td><td>${g.reguler}</td><td>${g.nonReguler}</td><td>${g.ekstra}</td><td style="font-weight:700;">${total}</td></tr>`;
      });
      html += `</tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="2" style="text-align:right;">TOTAL</td><td>${tReguler}</td><td>${tNonReguler}</td><td>${tEkstra}</td><td>${tTotal}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">Dicetak: ${new Date().toLocaleString()}</div>`;
      return html;
    }

    function generateAbsensiGuruReport(month, year) {
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      const monthStr = String(month).padStart(2, '0');
      const filtered = allTeacherAttendance.filter(a => {
        if (!a.tanggal) return false;
        const parts = a.tanggal.split('-');
        return parts[0] === year && parts[1] === monthStr && a.tahunAjaran === currentTahunAjaran;
      });
      if (filtered.length === 0) {
        return `<p class="text-muted" style="text-align:center;padding:20px 0;">Tidak ada data absensi guru untuk bulan ${monthName} ${year}.</p>`;
      }
      const grouped = {};
      // FIX: sama seperti generateJurnalReport di atas -- dulu dikelompokkan pakai NAMA, kalau
      // ada 2 guru bernama sama statistik Datang/Telat/Izin/Sakit/Alpha keduanya tergabung jadi
      // satu baris. Sekarang dikelompokkan pakai guruKey.
      filtered.forEach(a => {
        const gk = a.guruKey || a.guru;
        if (!grouped[gk]) grouped[gk] = { nama: a.guru, datang: 0, telat: 0, izin: 0, sakit: 0, alpha: 0 };
        if (a.type === 'Datang') { grouped[gk].datang += 1; if (a.keterangan && a.keterangan.startsWith('Telat')) grouped[gk].telat += 1; }
        else if (a.type === 'Izin') grouped[gk].izin += 1;
        else if (a.type === 'Sakit') grouped[gk].sakit += 1;
        else if (a.type === 'Alpha') grouped[gk].alpha += 1;
      });
      const guruList = Object.keys(grouped).sort((a,b) => COLLATOR_ID.compare(grouped[a].nama, grouped[b].nama));
      let html = `<div style="text-align:center;font-size:14px;font-weight:700;margin-bottom:8px;">REKAP ABSENSI GURU</div>
        <div style="text-align:center;font-size:12px;margin-bottom:16px;">${monthName} ${year}</div>
        <table>
          <thead>
            <tr><th>No</th><th>Nama Guru</th><th>Datang</th><th>Telat</th><th>Izin</th><th>Sakit</th><th>Alpha</th></tr>
          </thead>
          <tbody>`;
      let no = 1, tDatang = 0, tTelat = 0, tIzin = 0, tSakit = 0, tAlpha = 0;
      guruList.forEach(guru => {
        const g = grouped[guru];
        tDatang += g.datang; tTelat += g.telat; tIzin += g.izin; tSakit += g.sakit; tAlpha += g.alpha;
        html += `<tr><td>${no++}</td><td>${escapeHtml(g.nama)}</td><td>${g.datang}</td><td${g.telat>0?' style="color:#dc2626;font-weight:600;"':''}>${g.telat}</td><td>${g.izin}</td><td>${g.sakit}</td><td${g.alpha>0?' style="color:#dc2626;font-weight:700;"':''}>${g.alpha}</td></tr>`;
      });
      html += `</tbody>
          <tfoot>
            <tr style="font-weight:700;background:#f3f4f6;">
              <td colspan="2" style="text-align:right;">TOTAL</td><td>${tDatang}</td><td>${tTelat}</td><td>${tIzin}</td><td>${tSakit}</td><td>${tAlpha}</td>
            </tr>
          </tfoot>
        </table>
        <div class="text-muted" style="margin-top:8px;font-size:10px;">* "Telat" adalah bagian dari "Datang" yang melewati jam masuk sesuai jadwal. "Alpha" ditandai otomatis sistem jika guru sama sekali tidak melapor kehadiran pada hari itu.</div>
        <div class="text-muted" style="margin-top:16px;font-size:10px;text-align:right;">Dicetak: ${new Date().toLocaleString()}</div>`;
      return html;
    }

    async function downloadReportPDF() {
      const type = document.getElementById('reportType').value;
      const kelas = document.getElementById('reportClass').value;
      const month = document.getElementById('reportMonth').value;
      const year = document.getElementById('reportYear').value;
      const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][parseInt(month)-1];
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoData = await v4LoadLogoForPdf();
      const ttdKepalaDataLap = await v4LoadTtdKepalaForPdf();
      let title = '';
      let filename = '';
      switch(type) {
        case 'kehadiran':
          title = `LAPORAN KEHADIRAN SISWA\nKelas ${kelas} - ${monthName} ${year}`;
          filename = `Kehadiran_${kelas}_${monthName}_${year}`;
          break;
        case 'nilai':
          const semester = parseInt(month) <= 6 ? 'Genap' : 'Ganjil';
          title = `LAPORAN NILAI RAPOR\nKelas ${kelas} - Semester ${semester}\nTahun Ajaran ${currentTahunAjaran}`;
          filename = `Nilai_${kelas}_${semester}_${year}`;
          break;
        case 'honor':
          title = `LAPORAN HONOR GURU\n${monthName} ${year}`;
          filename = `Honor_Guru_${monthName}_${year}`;
          break;
        case 'jurnal':
          title = `REKAP JURNAL MENGAJAR\n${monthName} ${year}`;
          filename = `Jurnal_Mengajar_${monthName}_${year}`;
          break;
        case 'absensi-guru':
          title = `REKAP ABSENSI GURU\n${monthName} ${year}`;
          filename = `Absensi_Guru_${monthName}_${year}`;
          break;
        default:
          return toast('Pilih jenis laporan!', true);
      }

      const previewEl = document.getElementById('reportPreviewContainer');
      const text = previewEl ? previewEl.textContent || '' : '';

      // Kop surat di PDF
      const offsetY2 = MADRASAH.nsm ? 5 : 0;
      v4TambahLogoKeKopPdf(doc, logoData, offsetY2);
      doc.setFontSize(16);
      doc.text(MADRASAH.nama, pageWidth/2, 20, { align: 'center' });
      doc.setFontSize(10);
      if (MADRASAH.nsm) { doc.setFont(undefined, 'bold'); doc.text(`NSM: ${MADRASAH.nsm}`, pageWidth/2, 25, { align: 'center' }); doc.setFont(undefined, 'normal'); }
      doc.text(MADRASAH.alamat, pageWidth/2, 27 + offsetY2, { align: 'center' });
      doc.text(`📞 ${MADRASAH.telp} | ✉ ${MADRASAH.email} | 🌐 ${MADRASAH.website}`, pageWidth/2, 33 + offsetY2, { align: 'center' });
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(20, 38 + offsetY2, pageWidth - 20, 38 + offsetY2);
      doc.line(20, 40 + offsetY2, pageWidth - 20, 40 + offsetY2);

      doc.setFontSize(16);
      const lines = title.split('\n');
      let y = 48 + offsetY2;
      lines.forEach(line => {
        doc.text(line, pageWidth/2, y, { align: 'center' });
        y += 8;
      });
      
      doc.setFontSize(10);
      doc.text(`Dicetak: ${new Date().toLocaleString()}`, pageWidth - 20, y + 8, { align: 'right' });
      
      // PENTING: parsing SEBELUMNYA membaca previewEl.textContent lalu men-split per '\t' --
      // padahal markup tabel laporan (lihat generateKehadiranReport dkk.) menaruh tiap <td>
      // pada baris template-literal TERPISAH, bukan dipisah tab. Akibatnya baris "No" dan
      // "Nama" tidak pernah ketemu jadi SATU baris teks yang sama, deteksi header selalu
      // gagal, headers & tableData selalu kosong -- PDF jatuh ke mode cadangan yang menumpuk
      // SETIAP isi sel sebagai baris teks lepas satu-satu tanpa label kolom (hasil PDF jadi
      // daftar angka/nama tak beraturan, bukan tabel). Sekarang tabel dibaca LANGSUNG dari
      // elemen DOM <table> yang sudah dirender (thead/tbody/tfoot), termasuk menghormati
      // atribut colspan supaya kolom tetap sejajar dengan header.
      function domRowToArray(tr) {
        const row = [];
        Array.from(tr.children).forEach(cell => {
          const span = parseInt(cell.getAttribute('colspan'), 10) || 1;
          row.push(cell.textContent.trim());
          for (let i = 1; i < span; i++) row.push('');
        });
        return row;
      }
      let headers = [];
      const bodyRows = [];
      let footRow = null;
      const tableEl = previewEl ? previewEl.querySelector('table') : null;
      if (tableEl) {
        const headTr = tableEl.querySelector('thead tr');
        if (headTr) headers = domRowToArray(headTr);
        tableEl.querySelectorAll('tbody tr').forEach(tr => bodyRows.push(domRowToArray(tr)));
        const footTr = tableEl.querySelector('tfoot tr');
        if (footTr) footRow = domRowToArray(footTr);
      }

      if (bodyRows.length > 0 && headers.length > 0) {
        const startY = y + 16;
        doc.autoTable({
          head: [headers],
          body: bodyRows,
          foot: footRow ? [footRow] : undefined,
          startY: startY,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
          footStyles: { fillColor: [209, 213, 219], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { left: 15, right: 15 }
        });
      } else {
        doc.setFontSize(10);
        const textLines = text.split('\n').filter(l => l.trim() !== '');
        let textY = y + 16;
        textLines.forEach(line => {
          if (textY > 270) { doc.addPage(); textY = 20; }
          doc.text(line.substring(0, 80), 20, textY);
          textY += 6;
        });
      }

      // Tanda tangan
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : y + 40;
      if (finalY < 260) {
        doc.setFontSize(12);
        doc.text('Kepala ' + MADRASAH.nama, pageWidth/2, finalY + 10, { align: 'center' });
        let yNamaKepalaLap = finalY + 20;
        if (ttdKepalaDataLap) {
          try {
            const ttdW = 35;
            const propsTtd = doc.getImageProperties(ttdKepalaDataLap);
            const ttdH = Math.min(18, ttdW * (propsTtd.height / propsTtd.width));
            doc.addImage(ttdKepalaDataLap, 'PNG', pageWidth/2 - ttdW/2, finalY + 13, ttdW, ttdH);
          } catch (e) { console.error('[SI MAMBA] Gagal menambahkan tanda tangan digital ke PDF Laporan:', e); }
          yNamaKepalaLap = finalY + 22;
        }
        doc.text(MADRASAH.kepala_sekolah, pageWidth/2, yNamaKepalaLap, { align: 'center' });
        doc.text('NIP. ' + MADRASAH.nip_kepala_sekolah, pageWidth/2, yNamaKepalaLap + 8, { align: 'center' });
      }

      doc.save(`${filename}.pdf`);
      toast('📥 Laporan berhasil diunduh!');
      addLog('download_report', `${type} - ${kelas} - ${monthName} ${year}`);
    }

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
      const totalPages = Math.ceil(totalItems / PAGE_SIZE);
      let page = parseInt(localStorage.getItem('userPage') || '1');
      if (page > totalPages) page = totalPages;
      if (page < 1) page = 1;
      const start = (page - 1) * PAGE_SIZE;
      const end = Math.min(start + PAGE_SIZE, totalItems);
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
        pagination.innerHTML = `
          <button onclick="localStorage.setItem('userPage', ${page - 1}); renderUserList();" ${page <= 1 ? 'disabled' : ''}>◀ Prev</button>
          <span class="page-info">${page} / ${totalPages}</span>
          <button onclick="localStorage.setItem('userPage', ${page + 1}); renderUserList();" ${page >= totalPages ? 'disabled' : ''}>Next ▶</button>
          <span class="text-muted" style="font-size:12px;">Total: ${totalItems} pengguna</span>
        `;
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

      const btnTambahUser = document.getElementById('btnTambahUser');
      setBusy('tambahUser', btnTambahUser);
      const ref = db.ref('guru').push();
      ref.set({
        name,
        pin: hashPinSalted(pin, ref.key),
        kelas: checkedClasses,
        semuaKelas: allClass,
        role: role,
        waliKelasOf: waliKelasOf || null,
        dibuat: new Date().toISOString()
      }, err => {
        clearBusy('tambahUser', btnTambahUser);
        if (err) toast('Gagal: ' + err.message, true);
        else {
          toast('✅ Pengguna berhasil ditambahkan!');
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
      const jurnalHariIni = allJournals.filter(j => j.tanggal === today && (isAdmin() || isKepsek() || (j.guruKey ? j.guruKey === currentUser.key : j.guru === currentUser.name)) && j.tahunAjaran === currentTahunAjaran);
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
      connStatus.textContent = '⏳ Menghubungkan ke Firebase...'; connStatus.style.background = '#fef3c7'; connStatus.style.color = '#92400e';
      db.ref('.info/connected').on('value', snap => {
        if (snap.val()) {
          statusEl.className = 'status-badge'; statusEl.textContent = '✅ Terhubung';
          connStatus.textContent = '✅ Terhubung ke Firebase'; connStatus.style.background = '#dcfce7'; connStatus.style.color = '#065f46';
          if (!document.getElementById('loginGuru').innerHTML.includes('Admin')) loadGuruListForLogin();
          if (currentUser && !dataLoaded) { loadAllData(() => { hideLoading(); toast('Data dimuat ulang'); }); }
          if (!backupInterval) { backupInterval = setInterval(() => { if (currentUser && isAdmin()) autoBackup(); }, 6 * 60 * 60 * 1000); }
        } else {
          statusEl.className = 'status-badge disconnected'; statusEl.textContent = '❌ Putus';
          connStatus.textContent = '❌ Tidak terhubung ke Firebase'; connStatus.style.background = '#fee2e2'; connStatus.style.color = '#991b1b';
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
        'events':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'ujian':v4IsTeacher()||v4IsAdmin()||v4IsHead(),'administrasi-ujian':(typeof aujCanOpenMenu === 'function' ? aujCanOpenMenu() : false),
        'honor':v4IsAdmin()||v4IsHead(),'honor-slip':v4IsTeacher(),'infaq-madrasah':infaqCanAccess(),'kas-umum':(typeof kasCanOpenMenu === 'function' ? kasCanOpenMenu() : false),'sikap-siswa':sikapCanAccess(),'buku-penghubung':bukuCanAccess(),'info-ortu':sikapCanAccess(),'modul-ajar':(v4IsTeacher()||v4IsAdmin()||v4IsHead()),'buku-tamu':(v4IsAdmin()||v4IsHead()),'materi-belajar':bukuCanAccess(),'tugas-siswa':bukuCanAccess(),'kalender-akademik':true,'saran-kritik':saranKritikCanAccess(),'approval-v4':v4CanHead(),'raport-v4':v4IsAdmin()||v4IsHead()||isWaliKelasAssigned(),
        'laporan':v4CanHead(),'surat':v4IsAdmin()||isWaliKelasAssigned(),'notifications-v4':true,'tasks-v4':true,'user-management':v4IsAdmin(),'kelola-absen-guru':v4IsAdmin()||v4IsHead(),'admin':v4IsAdmin(),'profil-sekolah':v4IsAdmin(),'rekap-nilai':v4IsAdmin()||v4IsHead()||isWaliKelasAssigned(),
        'promotion':v4IsAdmin(),'setting-jam':v4IsAdmin(),'rekap':v4CanHead(),'religi':v4IsTeacher()
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
        if(currentUser){ clearSession(); currentUser=null; }
        const key=document.getElementById('loginGuru').value, pin=document.getElementById('loginPIN').value.trim(), remember=document.getElementById('rememberMe').checked;
        if(!key) return toast('Pilih user!',true);
        if(key==='admin' || key==='kepsek'){
          const lock = adminLoginLockState();
          if (lock.kunciSampai && Date.now() < lock.kunciSampai) {
            const sisaMenit = Math.ceil((lock.kunciSampai - Date.now()) / 60000);
            return toast(`🔒 Terlalu banyak percobaan PIN salah. Coba lagi dalam ${sisaMenit} menit.`, true);
          }
        }
        if(key==='admin'){
          if(hashPin(pin)!==ADMIN_PIN_HASH) { adminLoginCatatGagal(); return toast('PIN Admin salah!',true); }
          adminLoginResetGagal();
          currentUser={name:'Admin',role:ROLES.ADMIN,baseRole:ROLES.ADMIN,kelas:[...KELAS_LIST]};
        } else if(key==='kepsek'){
          if(hashPin(pin)!==KEPSEK_PIN_HASH) { adminLoginCatatGagal(); return toast('PIN Kepsek salah!',true); }
          adminLoginResetGagal();
          currentUser={name:'Kepala Madrasah',role:ROLES.HEADMASTER,baseRole:ROLES.HEADMASTER,kelas:[...KELAS_LIST]};
        } else {
          const guru=(allGuru||[]).find(g=>g.key===key); if(!guru) return toast('Guru tidak ditemukan!',true); if(!verifyGuruPin(guru, pin)) return toast('PIN salah!',true);
          let kelasList=guru.semuaKelas?[...KELAS_LIST]:(Array.isArray(guru.kelas)?guru.kelas:(guru.kelas?String(guru.kelas).split(',').map(x=>x.trim()):[])); if(!kelasList.length) kelasList=[KELAS_LIST[0]];
          currentUser={name:guru.name,role:ROLES.TEACHER,baseRole:ROLES.TEACHER,kelas:kelasList,key:guru.key,semuaKelas:!!guru.semuaKelas,waliKelasOf:guru.waliKelasOf||null};
        }
        if(remember){
          if(isPrivilegedSession(currentUser)) toast('ℹ️ Admin/Kepsek selalu diminta PIN saat membuka aplikasi ("Ingat Saya" tidak berlaku).', false, 3500);
          else saveSession(currentUser);
        }
        v4BootShowChooser = true;
        showApp();
        addLog('login',currentUser.name+' login');
      } catch (e) {
        v4BootShowChooser = false; // login gagal di tengah jalan -> jangan biarkan flag ini "bocor" ke boot berikutnya
        console.error('[SI MAMBA] login() (override V4) gagal dengan error tak terduga:', e);
        toast('⚠️ Login gagal karena error teknis. Coba muat ulang halaman (refresh) lalu coba lagi.', true, 6000);
      }
    };

    // -------- Activity / Amalan --------
    function v4LoadList(path,assign,seq){ return fbTimeout(db.ref(path).once('value').then(s=>{const arr=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;arr.push(x)});if(seq!==undefined&&seq!==v4CoreSeq)return arr;assign(arr);if(path==='activity_types_v4')v4CoreFresh++;return arr;}), 7000, path); }
    // -------- Activity / Amalan (jenis kegiatan TETAP, absensi siswa saja, PJ ditentukan Admin) --------
    let v4ActOpenTypeKey = null;
    let v4ActDateSel = {};        // typeKey -> tanggal aktif
    let v4ActKelasSel = {};       // typeKey -> kelas aktif
    let v4ActAttendanceDraft = {};// studentKey -> {status} untuk panel yang sedang dibuka
    // Filter untuk Rekap Absensi Sholat Siswa (Dhuha & Dzuhur) -- terpisah dari state
    // pengisian absensi harian di atas.
    let v4RekapReligiState = { kelas: '', bulan: null, tahun: null, view: 'kelas' };
    let v4PanelSiswaCache = {};   // kelas -> siswa[] (dipakai bersama Activities & Tahfidz)
    let v4PanelSiswaGagal = {};   // kelas -> pesan error, diisi kalau query siswa gagal/timeout (dihapus saat coba lagi)
    const V4_PANEL_SISWA_TIMEOUT_MS = 10000;

    // FIX: query ini dulu TANPA callback error dan TANPA timeout. Kalau Firebase menolak query-nya
    // (permission denied / koneksi putus) atau tidak pernah membalas, cache tidak pernah terisi
    // dan callback tidak pernah jalan -> panel Kegiatan/Tahfidz/Pramuka nyangkut di
    // "⏳ Memuat daftar siswa..." SELAMANYA tanpa jalan keluar. Sekarang gagal/timeout dicatat di
    // v4PanelSiswaGagal, lalu `onError` (default: cb) dipanggil supaya panel dirender ulang dan
    // menampilkan pesan gagal + tombol "Coba lagi". Hasil yang datang terlambat (setelah timeout)
    // tetap diterima -- tampilan memperbaiki dirinya sendiri tanpa perlu klik apa pun.
    function v4FetchSiswaByKelas(kelas, cb, onError){
      if (v4PanelSiswaCache[kelas]) { cb(v4PanelSiswaCache[kelas]); return; }
      delete v4PanelSiswaGagal[kelas];
      let gagalDicatat = false, timer = null;
      const gagal = (pesan) => {
        if (gagalDicatat || v4PanelSiswaCache[kelas]) return; gagalDicatat = true;
        clearTimeout(timer);
        v4PanelSiswaGagal[kelas] = pesan || 'tidak diketahui';
        console.warn('[SI MAMBA] Gagal memuat siswa kelas', kelas, '-', pesan);
        try { (typeof onError === 'function' ? onError : cb)(); } catch (e) { console.warn('[SI MAMBA] render setelah gagal muat siswa:', e); }
      };
      timer = setTimeout(() => gagal('waktu tunggu habis'), V4_PANEL_SISWA_TIMEOUT_MS);
      // Query siswa LANGSUNG per-kelas dari Firebase (bukan dari allSiswa yang sudah dibatasi
      // ke kelas guru login) - supaya PJ kegiatan sekolah-wide (mis. Shalat Dhuha bersama)
      // tetap bisa melihat & mengisi siswa dari kelas manapun, bukan cuma kelas yang dia ampu.
      try {
        db.ref('siswa').orderByChild('kelas').equalTo(kelas).once('value', snap => {
          clearTimeout(timer);
          const arr = []; snap.forEach(child => { const s = child.val(); s.key = child.key; arr.push(s); });
          v4PanelSiswaCache[kelas] = arr;
          delete v4PanelSiswaGagal[kelas];
          cb(arr);
        }, err => gagal(err && err.message ? err.message : String(err)));
      } catch (e) { gagal(e && e.message ? e.message : String(e)); }
    }
    // Isi panel saat daftar siswa belum ada di cache: "Memuat..." kalau masih jalan, atau pesan
    // gagal + tombol coba lagi kalau query-nya sudah gagal/timeout. `retryJs` = potongan JS untuk onclick.
    function v4PanelSiswaMemuatHtml(kelas, retryJs, style){
      const st = style || 'padding:10px;background:#f9fafb;border-radius:8px;';
      if (v4PanelSiswaGagal[kelas]) return `<div style="${st}">⚠️ Gagal memuat daftar siswa ${v4Safe(kelas)} (${v4Safe(v4PanelSiswaGagal[kelas])}). <button class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin-left:6px;" onclick="${retryJs}">🔄 Coba lagi</button></div>`;
      return `<div style="${st}">⏳ Memuat daftar siswa ${v4Safe(kelas)}...</div>`;
    }
    // Solusi kalau PJ (penanggung jawab) tetap suatu kegiatan tidak bisa hadir: Admin/Kepsek
    // bisa menunjuk "Pengganti Hari Ini" untuk TANGGAL TERTENTU saja (PJ tetapnya tidak berubah,
    // cuma untuk hari itu digantikan). Selain itu, Admin & Kepsek MEMANG SELALU bisa mengisi
    // absensi kegiatan apa pun kapan saja sebagai jalan pintas darurat -- lihat myTypes filter
    // di v4RenderActivities (v4IsAdmin()||v4IsHead()||v4IsActivityPic(a)).
    function v4IsActivityPic(type, tanggal){
      if (!currentUser || !type) return false;
      if (type.picKey===currentUser.key || (currentUser.name && type.picName===currentUser.name)) return true;
      const tgl = tanggal || v4Date();
      const sub = V4.activitySubstitutes && V4.activitySubstitutes[type.key+'_'+tgl];
      return !!(sub && (sub.guruKey===currentUser.key || (currentUser.name && sub.guruName===currentUser.name)));
    }
    function v4ActivitySubstituteToday(typeKey){ return V4.activitySubstitutes && V4.activitySubstitutes[typeKey+'_'+v4Date()]; }
    function v4ToggleAppointSubstitute(typeKey){
      if (!v4IsAdmin() && !v4IsHead()) return toast('Hanya Admin/Kepala Madrasah yang bisa menunjuk pengganti!', true);
      v4SubstituteFormOpenFor = (v4SubstituteFormOpenFor===typeKey) ? null : typeKey;
      v4RenderActivities();
    }
    function v4AppointActivitySubstitute(typeKey){
      if (!v4IsAdmin() && !v4IsHead()) return toast('Hanya Admin/Kepala Madrasah yang bisa menunjuk pengganti untuk guru lain! Kalau Anda sendiri yang ingin menggantikan, pakai tombol "Saya Gantikan Hari Ini".', true);
      const sel = document.getElementById('v4SubstitutePick_'+typeKey);
      const guruValue = sel.value; if (!guruValue) return toast('Pilih guru pengganti dulu!', true);
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return;
      const tgl = v4Date();
      db.ref('activity_substitute_v4/'+typeKey+'_'+tgl).set({ typeId: typeKey, tanggal: tgl, guruKey: guru.key||guru.name, guruName: guru.name, appointedBy: currentUser.name, appointedAt: new Date().toISOString() }).then(() => {
        toast('✅ '+guru.name+' ditunjuk sebagai pengganti hari ini');
        addLog('tunjuk_pengganti_kegiatan', typeKey+' - '+guru.name);
        V4.activitySubstitutes[typeKey+'_'+tgl] = { typeId: typeKey, tanggal: tgl, guruKey: guru.key||guru.name, guruName: guru.name };
        v4SubstituteFormOpenFor = null;
        v4RenderActivities();
      }).catch(err => toast('Gagal: '+err.message, true));
    }
    // Longgar: guru mana pun (asal bukan PIC kegiatan itu sendiri, dan belum ada pengganti lain
    // hari itu) boleh mencalonkan DIRINYA SENDIRI sebagai pengganti PIC tanpa perlu Admin/Kepala
    // -- supaya tidak macet kalau PIC berhalangan mendadak sementara Admin sedang tidak di tempat.
    function v4VolunteerAsSubstitute(typeKey){
      const type = (V4.activityTypes||[]).find(t => t.key===typeKey); if (!type) return;
      if (v4IsActivityPic(type)) return toast('Anda sudah PIC kegiatan ini.', true);
      const tgl = v4Date();
      db.ref('activity_substitute_v4/'+typeKey+'_'+tgl).transaction(cur => {
        if (cur) return; // sudah ada pengganti duluan, batalkan (jangan menimpa)
        return { typeId: typeKey, tanggal: tgl, guruKey: currentUser.key||currentUser.name, guruName: currentUser.name, appointedBy: currentUser.name, appointedAt: new Date().toISOString(), volunteer: true };
      }).then(result => {
        if (!result.committed) return toast('Sudah ada guru lain yang lebih dulu menjadi pengganti hari ini.', true);
        toast('✅ Anda tercatat sebagai pengganti PIC hari ini');
        addLog('mencalonkan_diri_pengganti_kegiatan', typeKey+' - '+currentUser.name);
        V4.activitySubstitutes[typeKey+'_'+tgl] = result.snapshot.val();
        v4RenderActivities();
      }).catch(err => toast('Gagal: '+(err.message||err), true));
    }
    function v4RemoveActivitySubstitute(typeKey){
      const tgl = v4Date();
      const sub = V4.activitySubstitutes && V4.activitySubstitutes[typeKey+'_'+tgl];
      // Selain Admin/Kepala, guru yang tercatat sebagai pengganti hari itu (baik ditunjuk Admin
      // maupun mencalonkan diri sendiri) juga boleh membatalkan penunjukannya sendiri.
      const sayaPengganti = sub && (sub.guruKey===currentUser?.key || sub.guruName===currentUser?.name);
      if (!v4IsAdmin() && !v4IsHead() && !sayaPengganti) return toast('Hanya Admin/Kepala Madrasah atau guru yang bersangkutan yang bisa membatalkan!', true);
      db.ref('activity_substitute_v4/'+typeKey+'_'+tgl).remove().then(() => {
        toast('Penunjukan pengganti dibatalkan');
        delete V4.activitySubstitutes[typeKey+'_'+tgl];
        v4RenderActivities();
      }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }
    let v4SubstituteFormOpenFor = null;
    function v4OpenActivityTypeForm(){
      if(!v4CanAdmin()) return toast('Hanya Admin!',true);
      const box=document.getElementById('v4ActivityTypeForm'); if(!box) return;
      box.style.display = box.style.display==='none' ? 'block' : 'none';
      const pic=document.getElementById('v4NewActPic');
      if(pic) pic.innerHTML=(allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}" data-name="${v4Safe(g.name)}">${v4Safe(g.name)}</option>`).join('');
      const nameEl=document.getElementById('v4NewActName'); if(nameEl) nameEl.value='';
      const honorEl=document.getElementById('v4NewActHonor'); if(honorEl) honorEl.checked=false;
    }
    function v4SaveNewActivityType(){
      if(!v4CanAdmin()) return toast('Hanya Admin!',true);
      if (isBusy('v4SaveNewActivityType')) return toast('Sedang menyimpan...', false, 1500);
      const name=(document.getElementById('v4NewActName').value||'').trim();
      if(!name) return toast('Nama kegiatan wajib diisi!',true);
      const category=document.getElementById('v4NewActCategory').value;
      const picSel=document.getElementById('v4NewActPic');
      const picKey=picSel.value, picOpt=picSel.selectedOptions[0];
      const picName=picOpt ? (picOpt.dataset.name || picOpt.textContent) : '';
      if(!picKey) return toast('Pilih penanggung jawab!',true);
      const honor=document.getElementById('v4NewActHonor').checked;
      const btnSaveNewAct = document.getElementById('btnSaveNewActivityType');
      setBusy('v4SaveNewActivityType', btnSaveNewAct);
      db.ref('activity_types_v4').push().set({name,category,honorEnabled:honor,picKey,picName,createdAt:new Date().toISOString(),createdBy:currentUser.name}).then(()=>{
        clearBusy('v4SaveNewActivityType', btnSaveNewAct);
        toast('✅ Jenis kegiatan ditambahkan');
        document.getElementById('v4ActivityTypeForm').style.display='none';
        v4LoadCore();
      }).catch(err => { clearBusy('v4SaveNewActivityType', btnSaveNewAct); console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }
    function v4ChangeActivityPic(key, picValue){
      if(!v4CanAdmin()) return toast('Hanya Admin!',true);
      const guru=(allGuru||[]).find(g=>(g.key||g.name)===picValue); if(!guru) return;
      db.ref('activity_types_v4/'+key).update({picKey:guru.key||guru.name,picName:guru.name,updatedAt:new Date().toISOString()}).then(()=>{
        toast('✅ Penanggung jawab diperbarui'); v4LoadCore();
      }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }
    function v4ToggleActivityHonor(key){ if(!v4CanAdmin()) return toast('Hanya Admin!',true); const a=V4.activityTypes.find(x=>x.key===key); if(!a)return; db.ref('activity_types_v4/'+key).update({honorEnabled:!a.honorEnabled,updatedAt:new Date().toISOString()}).then(()=>{toast('Honor kegiatan diperbarui');v4LoadCore();}).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); }); }
    function v4DeleteActivityType(key){
      if(!v4CanAdmin()) return toast('Hanya Admin!',true);
      if(!confirm('Hapus jenis kegiatan ini? Data absensi yang sudah tercatat sebelumnya tidak akan ikut terhapus.')) return;
      db.ref('activity_types_v4/'+key).remove().then(()=>{ toast('Jenis kegiatan dihapus'); v4LoadCore(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }

    function v4RenderActivities(){
      const box=document.getElementById('v4ActivityConfig'); if(!box) return;
      box.innerHTML=V4.activityTypes.length?V4.activityTypes.map(a=>{
        const picOptions=(allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}" ${(g.key||g.name)===a.picKey?'selected':''}>${v4Safe(g.name)}</option>`).join('');
        const sub = v4ActivitySubstituteToday(a.key);
        const subFormOpen = v4SubstituteFormOpenFor===a.key;
        const sayaPic = v4IsActivityPic(a);
        let subBlock = '';
        if (v4IsAdmin() || v4IsHead()) {
          // Admin/Kepala: bisa menunjuk SIAPA SAJA lewat dropdown penuh, seperti sebelumnya.
          if (sub) {
            subBlock = `<div style="margin-top:7px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:6px 8px;font-size:11px;color:#92400e;">🔄 Pengganti hari ini: <strong>${v4Safe(sub.guruName)}</strong> <button class="btn btn-soft" style="padding:2px 7px;font-size:10px;min-height:22px;margin-left:4px;" onclick="v4RemoveActivitySubstitute('${a.key}')">Batalkan</button></div>`;
          } else {
            const subOptions=(allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}">${v4Safe(g.name)}</option>`).join('');
            subBlock = `<div style="margin-top:7px;">
              <button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:28px;" onclick="v4ToggleAppointSubstitute('${a.key}')">🔄 PJ Tidak Bisa Hadir? Tunjuk Pengganti Hari Ini</button>
              ${subFormOpen?`<div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;"><select id="v4SubstitutePick_${a.key}" class="field" style="font-size:11px;padding:5px;flex:1;min-width:120px;"><option value="">-- Pilih Guru --</option>${subOptions}</select><button class="btn btn-success" style="padding:4px 10px;font-size:10px;" onclick="v4AppointActivitySubstitute('${a.key}')">✔️ Tunjuk</button></div>`:''}
            </div>`;
          }
        } else if (sub) {
          // Guru yang sedang jadi pengganti hari ini boleh batalkan sendiri kalau ternyata dia
          // juga berhalangan -- tidak perlu tunggu Admin/Kepala.
          const sayaPengganti = sub.guruKey===currentUser?.key || sub.guruName===currentUser?.name;
          subBlock = `<div style="margin-top:7px;font-size:11px;color:#92400e;">🔄 Pengganti hari ini: <strong>${v4Safe(sub.guruName)}</strong>${sayaPengganti?` <button class="btn btn-soft" style="padding:2px 7px;font-size:10px;min-height:22px;margin-left:4px;" onclick="v4RemoveActivitySubstitute('${a.key}')">Batalkan</button>`:''}</div>`;
        } else if (!sayaPic) {
          // Longgar: guru mana pun (bukan PIC, bukan Admin/Kepala) boleh MENCALONKAN DIRI
          // SENDIRI sebagai pengganti PIC hari itu, tanpa perlu menunggu Admin/Kepala --
          // supaya tidak macet kalau kebetulan Admin sedang tidak di tempat pas jam sholat.
          // Tidak bisa menunjuk ORANG LAIN (itu tetap wewenang Admin/Kepala di atas).
          subBlock = `<div style="margin-top:7px;"><button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:28px;" onclick="v4VolunteerAsSubstitute('${a.key}')">🙋 PJ Tidak Hadir? Saya Gantikan Hari Ini</button></div>`;
        }
        return `<div class="v4-card">
          <h4>${v4Safe(a.name)}</h4>
          <div class="v4-muted">${v4Safe(a.category||'Kegiatan')} · Absensi siswa</div>
          <div style="margin-top:7px;"><span class="v4-chip blue">👤 PJ: ${v4Safe(a.picName||'-')}</span></div>
          ${v4IsAdmin()?`<div style="margin-top:7px;"><select class="field" style="font-size:11px;padding:5px;" onchange="v4ChangeActivityPic('${a.key}', this.value)">${picOptions}</select></div>`:''}
          ${subBlock}
          <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;">
            <span class="v4-chip ${a.honorEnabled?'orange':''}">${a.honorEnabled?'💰 Honor aktif':'Tanpa honor'}</span>
            ${v4IsAdmin()?`<button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:30px;" onclick="v4ToggleActivityHonor('${a.key}')">Ubah Honor</button><button class="btn btn-soft" style="padding:4px 8px;font-size:10px;min-height:30px;color:#b91c1c;" onclick="v4DeleteActivityType('${a.key}')">🗑️</button>`:''}
          </div>
        </div>`;
      }).join(''):'<div class="v4-card"><h4>Belum ada jenis kegiatan</h4><div class="v4-muted">Admin dapat menambahkan amalan/kegiatan (mis. Shalat Dhuha, Shalat Dzuhur) beserta penanggung jawabnya.</div></div>';

      const fillBox=document.getElementById('v4ActivityFillSection'); if(!fillBox) return;
      const myTypes=V4.activityTypes.filter(a=>v4IsAdmin()||v4IsHead()||v4IsActivityPic(a));
      if(myTypes.length===0){
        fillBox.innerHTML = V4.activityTypes.length ? '<p class="v4-muted">Anda belum ditunjuk sebagai penanggung jawab kegiatan apa pun. Kalau PJ tetap berhalangan hadir, minta Admin/Kepala Madrasah menunjuk Anda sebagai pengganti hari ini di kartu kegiatan di atas.</p>' : '';
        v4RenderRekapReligiSiswa();
        return;
      }
      fillBox.innerHTML = myTypes.map(type=>{
        const isOpen = v4ActOpenTypeKey===type.key;
        const dateVal = v4ActDateSel[type.key] || v4Date();
        v4ActDateSel[type.key] = dateVal;
        const countToday=(V4.activityAttendance||[]).filter(r=>r.activityTypeId===type.key && r.tanggal===dateVal && r.status).length;
        const sub = v4ActivitySubstituteToday(type.key);
        const subNote = sub ? ` · 🔄 diisi sbg pengganti ${v4Safe(sub.guruName)} hari ini` : '';
        return `<div class="v4-task" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <div class="v4-task-main"><div class="v4-task-title">🕌 ${v4Safe(type.name)}</div><div class="v4-task-meta">PJ: ${v4Safe(type.picName||'-')} · ${countToday} siswa tercatat tgl ${v4Safe(dateVal)}${subNote}</div></div>
            <button class="btn btn-soft" style="padding:4px 10px;font-size:11px;" onclick="v4ToggleActivityFill('${type.key}')">${isOpen?'✖️ Tutup':'📋 Isi Absensi'}</button>
          </div>
          ${isOpen?v4RenderActivityFillPanel(type):''}
        </div>`;
      }).join('');
      v4RenderRekapReligiSiswa();
    }
    // Rekap absensi SISWA untuk Sholat Dhuha/Dzuhur -- dua tampilan:
    // - "kelas": per tanggal dalam bulan terpilih, persentase kehadiran kelas itu.
    // - "siswa": per siswa dalam kelas terpilih, jumlah hadir dibanding hari yang benar-benar
    //   tercatat (bukan dibanding hari kalender -- supaya tidak perlu tahu kalender libur madrasah).
    // Kelas yang bisa dipilih dibatasi siswaScopeKelas() -- sama seperti Data Siswa/Rekap Nilai,
    // Wali Kelas cuma lihat kelasnya sendiri, Admin/Kepsek lihat semua.
    function v4RenderRekapReligiSiswa() {
      const host = document.getElementById('v4RekapReligiSiswa');
      if (!host) return;
      const scope = siswaScopeKelas();
      if (!scope.length) { host.innerHTML = '<div class="v4-card"><div class="v4-muted">Tidak ada kelas dalam jangkauan Anda.</div></div>'; return; }
      if (!v4RekapReligiState.kelas || !scope.includes(v4RekapReligiState.kelas)) v4RekapReligiState.kelas = scope[0];
      const now = new Date();
      if (!v4RekapReligiState.bulan) v4RekapReligiState.bulan = now.getMonth() + 1;
      if (!v4RekapReligiState.tahun) v4RekapReligiState.tahun = now.getFullYear();

      const dluhaTypes = v4CariJenisKegiatanSholat('Dluha').map(t => t.key);
      const dzuhurTypes = v4CariJenisKegiatanSholat('Dzuhur').map(t => t.key);
      if (!dluhaTypes.length && !dzuhurTypes.length) {
        host.innerHTML = '<div class="v4-card"><div class="v4-muted">Jenis kegiatan Sholat Dhuha/Dzuhur belum dibuat di atas, rekap belum bisa ditampilkan.</div></div>';
        return;
      }

      const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const bulanOptions = namaBulan.map((n,i) => `<option value="${i+1}" ${v4RekapReligiState.bulan===i+1?'selected':''}>${n}</option>`).join('');
      const tahunSekarang = now.getFullYear();
      const tahunOptions = [tahunSekarang-1, tahunSekarang, tahunSekarang+1].map(t => `<option value="${t}" ${v4RekapReligiState.tahun===t?'selected':''}>${t}</option>`).join('');
      const kelasOptions = scope.map(k => `<option value="${v4Safe(k)}" ${v4RekapReligiState.kelas===k?'selected':''}>${v4Safe(k)}</option>`).join('');

      const monthStr = String(v4RekapReligiState.bulan).padStart(2,'0');
      const inBulan = (tgl) => { if (!tgl) return false; const p = tgl.split('-'); return p[0] === String(v4RekapReligiState.tahun) && p[1] === monthStr; };
      const siswaKelas = (allSiswa || []).filter(s => s.kelas === v4RekapReligiState.kelas);
      const siswaKeyKelas = new Set(siswaKelas.map(s => s.key));
      const recsBulanIni = (V4.activityAttendance || []).filter(r => inBulan(r.tanggal) && siswaKeyKelas.has(r.studentId));

      const controlsHtml = `<div class="v4-card"><div class="v4-grid-3">
        <div><label class="label">Kelas</label><select class="field" onchange="v4RekapReligiState.kelas=this.value;v4RenderRekapReligiSiswa();">${kelasOptions}</select></div>
        <div><label class="label">Bulan</label><select class="field" onchange="v4RekapReligiState.bulan=Number(this.value);v4RenderRekapReligiSiswa();">${bulanOptions}</select></div>
        <div><label class="label">Tahun</label><select class="field" onchange="v4RekapReligiState.tahun=Number(this.value);v4RenderRekapReligiSiswa();">${tahunOptions}</select></div>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn ${v4RekapReligiState.view==='kelas'?'btn-success':'btn-soft'}" onclick="v4RekapReligiState.view='kelas';v4RenderRekapReligiSiswa();">📅 Per Hari (Kelas)</button>
        <button class="btn ${v4RekapReligiState.view==='siswa'?'btn-success':'btn-soft'}" onclick="v4RekapReligiState.view='siswa';v4RenderRekapReligiSiswa();">🧑‍🎓 Per Siswa</button>
      </div></div>`;

      let bodyHtml = '';
      if (v4RekapReligiState.view === 'kelas') {
        const tanggalSet = [...new Set(recsBulanIni.map(r => r.tanggal))].sort();
        if (!tanggalSet.length) {
          bodyHtml = '<div class="v4-card"><div class="v4-muted">Belum ada data absensi sholat untuk kelas & bulan ini.</div></div>';
        } else {
          const rows = tanggalSet.map(tgl => {
            const totalDluha = recsBulanIni.filter(r => dluhaTypes.includes(r.activityTypeId) && r.tanggal===tgl).length;
            const hadirDluha = recsBulanIni.filter(r => dluhaTypes.includes(r.activityTypeId) && r.tanggal===tgl && r.status==='Hadir').length;
            const totalDzuhur = recsBulanIni.filter(r => dzuhurTypes.includes(r.activityTypeId) && r.tanggal===tgl).length;
            const hadirDzuhur = recsBulanIni.filter(r => dzuhurTypes.includes(r.activityTypeId) && r.tanggal===tgl && r.status==='Hadir').length;
            const selDluha = totalDluha ? `${hadirDluha}/${totalDluha} (${Math.round(hadirDluha/totalDluha*100)}%)` : '-';
            const selDzuhur = totalDzuhur ? `${hadirDzuhur}/${totalDzuhur} (${Math.round(hadirDzuhur/totalDzuhur*100)}%)` : '-';
            return `<tr><td>${v4Safe(tgl)}</td><td>${selDluha}</td><td>${selDzuhur}</td></tr>`;
          }).join('');
          bodyHtml = `<div class="v4-card" style="overflow-x:auto;margin-top:10px;"><table style="font-size:12px;"><thead><tr><th>Tanggal</th><th>☀️ Dhuha (Hadir/Tercatat)</th><th>🕌 Dzuhur (Hadir/Tercatat)</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        }
      } else {
        if (!siswaKelas.length) {
          bodyHtml = '<div class="v4-card"><div class="v4-muted">Tidak ada siswa di kelas ini.</div></div>';
        } else {
          const rows = siswaKelas.slice().sort((a,b)=>COLLATOR_ID.compare(a.name, b.name)).map(s => {
            const recSiswa = recsBulanIni.filter(r => r.studentId === s.key);
            const dluhaTotal = recSiswa.filter(r => dluhaTypes.includes(r.activityTypeId)).length;
            const dluhaHadir = recSiswa.filter(r => dluhaTypes.includes(r.activityTypeId) && r.status==='Hadir').length;
            const dzuhurTotal = recSiswa.filter(r => dzuhurTypes.includes(r.activityTypeId)).length;
            const dzuhurHadir = recSiswa.filter(r => dzuhurTypes.includes(r.activityTypeId) && r.status==='Hadir').length;
            const selDluha = dluhaTotal ? `${dluhaHadir}/${dluhaTotal}` : '-';
            const selDzuhur = dzuhurTotal ? `${dzuhurHadir}/${dzuhurTotal}` : '-';
            return `<tr><td>${v4Safe(s.name)}</td><td>${selDluha}</td><td>${selDzuhur}</td></tr>`;
          }).join('');
          bodyHtml = `<div class="v4-card" style="overflow-x:auto;margin-top:10px;"><table style="font-size:12px;"><thead><tr><th>Nama Siswa</th><th>☀️ Dhuha (Hadir/Tercatat)</th><th>🕌 Dzuhur (Hadir/Tercatat)</th></tr></thead><tbody>${rows}</tbody></table></div>`;
        }
      }
      host.innerHTML = controlsHtml + bodyHtml;
    }
    function v4ToggleActivityFill(typeKey){
      if (v4ActOpenTypeKey === typeKey) { v4ActOpenTypeKey = null; }
      else { v4ActOpenTypeKey = typeKey; v4ActAttendanceDraft = {}; if (!v4ActKelasSel[typeKey]) v4ActKelasSel[typeKey] = ''; }
      v4RenderActivities();
    }
    function v4RenderActivityFillPanel(type){
      const dateVal = v4ActDateSel[type.key] || v4Date();
      const kelasVal = v4ActKelasSel[type.key] || '';
      const kelasOptions = KELAS_LIST.map(k => `<option value="${escapeHtml(k)}" ${kelasVal===k?'selected':''}>${escapeHtml(k)}</option>`).join('');
      if (!kelasVal) {
        return `<div class="border-muted" style="margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;">
          <label class="label">Pilih kelas untuk mulai mengisi</label>
          <select class="field" style="max-width:220px;" onchange="v4SetActivityKelas('${type.key}', this.value)"><option value="">-- Pilih Kelas --</option>${kelasOptions}</select>
        </div>`;
      }
      if (!v4PanelSiswaCache[kelasVal]) {
        return v4PanelSiswaMemuatHtml(kelasVal, `v4SetActivityKelas('${escapeJs(type.key)}','${escapeJs(kelasVal)}')`, 'margin-top:10px;padding:10px;background:#f9fafb;border-radius:8px;');
      }
      const siswa = v4PanelSiswaCache[kelasVal].slice().sort((a,b)=>COLLATOR_ID.compare(a.name, b.name));
      const existingMap = {};
      (V4.activityAttendance||[]).filter(r => r.activityTypeId===type.key && r.tanggal===dateVal).forEach(r => { existingMap[r.studentId] = r; });
      let rows = siswa.map(s => {
        const draft = v4ActAttendanceDraft[s.key] || existingMap[s.key] || {};
        const statusBtns = ['H','S','I','A'].map(st => `<button class="status-choice ${draft.status===st?'selected':''}" data-status="${st}" onclick="v4SetActivityField('${type.key}','${s.key}','${st}')">${st}</button>`).join('');
        return `<tr><td style="font-weight:600;white-space:nowrap;">${v4Safe(s.name)}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap;">${statusBtns}</div></td></tr>`;
      }).join('');
      if (siswa.length === 0) rows = `<tr><td colspan="2" class="text-muted" style="text-align:center;padding:12px;">Belum ada siswa di kelas ini.</td></tr>`;
      return `<div style="margin-top:10px;">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
          <label class="label" style="margin:0;">Tanggal:</label>
          <input type="date" class="field" style="max-width:150px;" value="${dateVal}" onchange="v4SetActivityDate('${type.key}', this.value)">
          <label class="label" style="margin:0;">Kelas:</label>
          <select class="field" style="max-width:170px;" onchange="v4SetActivityKelas('${type.key}', this.value)"><option value="">-- Pilih Kelas --</option>${kelasOptions}</select>
        </div>
        <div style="overflow-x:auto;"><table><thead><tr><th>Nama</th><th>Kehadiran</th></tr></thead><tbody>${rows}</tbody></table></div>
        ${siswa.length>0?`<button id="btnSaveV4Act_${type.key}" class="btn btn-success" style="margin-top:10px;" onclick="v4SaveActivityAttendance('${type.key}')">💾 Simpan Absensi (${kelasVal})</button>`:''}
      </div>`;
    }
    function v4SetActivityDate(typeKey, date){
      v4ActDateSel[typeKey] = date || v4Date();
      v4ActAttendanceDraft = {};
      v4RenderActivities();
    }
    function v4SetActivityKelas(typeKey, kelas){
      v4ActKelasSel[typeKey] = kelas;
      v4ActAttendanceDraft = {};
      if (!kelas) { v4RenderActivities(); return; }
      v4FetchSiswaByKelas(kelas, () => v4RenderActivities());
      v4RenderActivities();
    }
    function v4SetActivityField(typeKey, studentKey, status){
      if (!v4ActAttendanceDraft[studentKey]) {
        const dateVal = v4ActDateSel[typeKey] || v4Date();
        const existing = (V4.activityAttendance||[]).find(r => r.activityTypeId===typeKey && r.studentId===studentKey && r.tanggal===dateVal) || {};
        v4ActAttendanceDraft[studentKey] = { status: existing.status||null };
      }
      v4ActAttendanceDraft[studentKey].status = (v4ActAttendanceDraft[studentKey].status === status) ? null : status;
      v4RenderActivities();
    }
    function v4SaveActivityAttendance(typeKey){
      const type = V4.activityTypes.find(x => x.key === typeKey);
      if (!type) return toast('Kegiatan tidak ditemukan!', true);
      if (!v4IsAdmin() && !v4IsHead() && !v4IsActivityPic(type)) return toast('Hanya penanggung jawab yang bisa mengisi absensi ini!', true);
      if (isBusy('v4SaveAct_'+typeKey)) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      // Offline: write Firebase baru selesai (resolve) setelah server mengonfirmasi, jadi saat offline
      // promise-nya menggantung dan kunci busy tidak pernah dilepas (tombol macet selamanya).
      if (!navigator.onLine) return toast('📡 Sedang offline. Simpan absensi kegiatan butuh koneksi internet.', true);
      const kelasVal = v4ActKelasSel[typeKey] || '', dateVal = v4ActDateSel[typeKey] || v4Date();
      const siswa = v4PanelSiswaCache[kelasVal] || [];
      if (siswa.length === 0) return toast('Tidak ada siswa di kelas ini.', true);

      // RACE #1 (lost update antar-guru): dulu SEMUA siswa satu kelas ditulis ulang dari salinan lokal
      // yang bisa sudah basi. PJ asli & PJ pengganti yang mengisi kelas/tanggal yang sama hampir
      // bersamaan saling menimpa -- siswa yang tidak disentuh guru B ikut ditimpa dengan status basi
      // atau null, menghapus isian guru A. Sekarang hanya siswa yang benar-benar diubah (ada di draft)
      // yang ditulis. Snapshot diambil SEKARANG, sebelum ada await apa pun.
      const snap = {};
      siswa.forEach(st => { const d = v4ActAttendanceDraft[st.key]; if (d) snap[st.key] = d.status || null; });
      const touched = siswa.filter(st => Object.prototype.hasOwnProperty.call(snap, st.key));
      if (touched.length === 0) return toast('Belum ada perubahan absensi untuk disimpan.', false, 2000);

      const getBtn = () => document.getElementById('btnSaveV4Act_'+typeKey); // tombol bisa dirender ulang saat menunggu
      setBusy('v4SaveAct_'+typeKey, getBtn());
      const nowIso = new Date().toISOString();
      const records = {};
      try {
        touched.forEach(st => {
          records[`${typeKey}_${dateVal}_${st.key}`] = { activityTypeId: typeKey, studentId: st.key, studentName: st.name, kelas: st.kelas, tanggal: dateVal, status: snap[st.key], recordedBy: currentUser.name, guruKey: currentUser.key || null, recordedAt: nowIso, tahunAjaran: currentTahunAjaran };
        });
      } catch (e) {
        clearBusy('v4SaveAct_'+typeKey, getBtn());
        return toast('Gagal: '+(e && e.message || e), true);
      }
      // RACE #2 (partial write): dulu satu db.ref().set() per siswa -- kalau koneksi putus di tengah,
      // sebagian tersimpan dan sebagian tidak, sementara pesan error tampil seolah semuanya gagal.
      // Satu update() multi-path bersifat atomik: semua tersimpan atau tidak sama sekali.
      db.ref('activity_attendance_v4').update(records).then(() => {
        clearBusy('v4SaveAct_'+typeKey, getBtn());
        toast('✅ Absensi tersimpan!');
        v4Audit('SAVE_ACTIVITY_ATTENDANCE','ACTIVITY_TYPE',typeKey,null,{kelas:kelasVal,tanggal:dateVal,jumlah:touched.length});
        // Perbarui salinan lokal SEKARANG supaya tampilan langsung benar, tidak menunggu v4LoadCore().
        if (!Array.isArray(V4.activityAttendance)) V4.activityAttendance = [];
        Object.keys(records).forEach(id => {
          const rec = Object.assign({ key: id }, records[id]);
          const i = V4.activityAttendance.findIndex(r => r.activityTypeId===typeKey && r.studentId===rec.studentId && r.tanggal===dateVal);
          if (i >= 0) V4.activityAttendance[i] = rec; else V4.activityAttendance.push(rec);
        });
        // RACE #3 (lost edit): dulu v4ActAttendanceDraft = {} tanpa syarat. Ketukan H/S/I/A (atau ganti
        // tanggal/kelas) yang terjadi SELAMA menunggu konfirmasi server ikut terhapus diam-diam.
        // Sekarang hanya entri yang sudah tersimpan DAN belum berubah sejak snapshot yang dibuang,
        // dan hanya kalau panel masih menampilkan kelas+tanggal yang sama.
        const sameContext = v4ActOpenTypeKey === typeKey && (v4ActKelasSel[typeKey] || '') === kelasVal && (v4ActDateSel[typeKey] || v4Date()) === dateVal;
        if (sameContext) {
          touched.forEach(st => { const d = v4ActAttendanceDraft[st.key]; if (d && (d.status || null) === snap[st.key]) delete v4ActAttendanceDraft[st.key]; });
        }
        v4RenderActivities();
        v4LoadCore();
      }).catch(err => {
        clearBusy('v4SaveAct_'+typeKey, getBtn());
        console.error('[SI MAMBA] Gagal simpan absensi kegiatan:', err);
        toast('❌ Gagal menyimpan (tidak ada data yang tersimpan, draft dipertahankan): '+(err && err.message || err), true);
      });
    }

    // -------- Tahfidz (nama siswa per kelas, PJ per kelas ditentukan Admin) --------
    let v4TfKelasSel = '';
    function v4TfMyKelas(){
      if (v4IsAdmin() || v4IsHead()) return KELAS_LIST.slice();
      return KELAS_LIST.filter(k => { const pic = V4.tahfidzPic && V4.tahfidzPic[k]; return pic && currentUser && (pic.key===currentUser.key || pic.name===currentUser.name); });
    }
    function v4RenderTahfidzPicAdmin(){
      const box=document.getElementById('v4TahfidzPicAdmin'); if(!box) return;
      if (!v4IsAdmin()) { box.innerHTML=''; return; }
      const rows = KELAS_LIST.map(k => {
        const pic = (V4.tahfidzPic && V4.tahfidzPic[k]) || {};
        const options = (allGuru||[]).map(g => `<option value="${v4Safe(g.key||g.name)}" ${(g.key||g.name)===pic.key?'selected':''}>${v4Safe(g.name)}</option>`).join('');
        return `<tr><td style="font-weight:600;white-space:nowrap;">${k}</td><td><select class="field" style="font-size:12px;padding:5px;" onchange="v4SetTahfidzPic('${k}', this.value)"><option value="">-- Belum Ditentukan --</option>${options}</select></td></tr>`;
      }).join('');
      box.innerHTML = `<div class="v4-card"><h4>👤 Penanggung Jawab Tahfidz per Kelas</h4><div class="v4-muted" style="margin-bottom:8px;">Admin menentukan satu guru penanggung jawab tahfidz untuk tiap kelas.</div><div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Penanggung Jawab</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    function v4SetTahfidzPic(kelas, guruValue){
      if (!v4IsAdmin()) return toast('Hanya Admin!', true);
      if (!guruValue) { db.ref('tahfidz_pic_v4/'+kelas).remove().then(()=>{ toast('Penanggung jawab dihapus'); v4LoadCore(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); }); return; }
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return;
      db.ref('tahfidz_pic_v4/'+kelas).set({ kelas, key: guru.key||guru.name, name: guru.name, updatedAt: new Date().toISOString(), updatedBy: currentUser.name }).then(() => {
        toast('✅ Penanggung jawab tahfidz diperbarui'); v4LoadCore();
      }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }
    function v4RenderTahfidz(){
      v4RenderTahfidzPicAdmin();
      const sel=document.getElementById('v4TahfidzKelas'); if(!sel) return;
      const myKelas = v4TfMyKelas();
      if (v4TfKelasSel && !myKelas.includes(v4TfKelasSel)) v4TfKelasSel = '';
      sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + myKelas.map(k => `<option value="${k}" ${v4TfKelasSel===k?'selected':''}>${k}</option>`).join('');
      v4RenderTahfidzKelasPanel();
      const list=document.getElementById('v4TahfidzList');
      if (list) {
        const hist = (V4.tahfidz||[]).filter(x => !v4TfKelasSel || x.kelas===v4TfKelasSel).slice().reverse().slice(0,30);
        list.innerHTML = hist.map(x=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">📖 ${v4Safe(x.studentName)} · ${v4Safe(x.surah)} ${v4Safe(x.ayat)}</div><div class="v4-task-meta">${v4Safe(x.type)} · ${v4Safe(x.tanggal)} · ${v4Safe(x.note||'-')}</div></div><span class="v4-chip blue">${v4Safe(x.kelas||'')}</span></div>`).join('')||'<p class="v4-muted">Belum ada catatan tahfidz.</p>';
      }
    }
    function v4SetTahfidzKelas(kelas){
      v4TfKelasSel = kelas;
      if (!kelas) { v4RenderTahfidz(); return; }
      v4FetchSiswaByKelas(kelas, () => v4RenderTahfidz());
      v4RenderTahfidz();
    }
    function v4RenderTahfidzKelasPanel(){
      const box=document.getElementById('v4TahfidzKelasPanel'); if(!box) return;
      if (!v4TfKelasSel) { box.innerHTML = '<p class="v4-muted">Pilih kelas untuk mulai mencatat tahfidz siswa.</p>'; return; }
      if (!v4PanelSiswaCache[v4TfKelasSel]) { box.innerHTML = v4PanelSiswaMemuatHtml(v4TfKelasSel, `v4SetTahfidzKelas('${escapeJs(v4TfKelasSel)}')`); return; }
      const siswa = v4PanelSiswaCache[v4TfKelasSel].slice().sort((a,b)=>COLLATOR_ID.compare(a.name, b.name));
      if (siswa.length === 0) { box.innerHTML = '<p class="v4-muted">Belum ada siswa di kelas ini.</p>'; return; }
      const rows = siswa.map(s => {
        const last = (V4.tahfidz||[]).filter(x => x.studentId===s.key).slice().sort((a,b)=>COLLATOR_ID.compare((a.tanggal||''), b.tanggal||'')).pop();
        const lastInfo = last ? `<div class="v4-muted" style="margin-top:2px;font-weight:normal;">Terakhir: ${v4Safe(last.surah)} ${v4Safe(last.ayat)} · ${v4Safe(last.tanggal)}</div>` : '';
        return `<tr>
          <td style="font-weight:600;white-space:nowrap;vertical-align:top;">${v4Safe(s.name)}${lastInfo}</td>
          <td><input id="v4TfSurah_${s.key}" class="field" style="min-width:100px;" placeholder="Surah"></td>
          <td><input id="v4TfAyat_${s.key}" class="field" style="min-width:70px;" placeholder="Ayat"></td>
          <td><select id="v4TfType_${s.key}" class="field" style="min-width:100px;"><option value="setoran">Setoran</option><option value="murojaah">Murojaah</option></select></td>
          <td><input id="v4TfNote_${s.key}" class="field" style="min-width:110px;" placeholder="Catatan"></td>
          <td><button class="btn btn-success" id="btnV4Tahfidz_${s.key}" style="padding:6px 12px;font-size:11px;" onclick="v4SaveTahfidzRow('${s.key}')">💾</button></td>
        </tr>`;
      }).join('');
      box.innerHTML = `<div style="overflow-x:auto;"><table><thead><tr><th>Nama Siswa</th><th>Surah</th><th>Ayat</th><th>Jenis</th><th>Catatan</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    function v4SaveTahfidzRow(studentKey){
      if (!v4CanClass()) return toast('Tidak memiliki akses!', true);
      const pic = V4.tahfidzPic && V4.tahfidzPic[v4TfKelasSel];
      const isPic = pic && currentUser && (pic.key===currentUser.key || pic.name===currentUser.name);
      if (!v4IsAdmin() && !v4IsHead() && !isPic) return toast('Hanya penanggung jawab tahfidz kelas ini yang bisa mencatat!', true);
      if (isBusy('v4SaveTahfidzRow_'+studentKey)) return toast('Sedang menyimpan...', false, 1500);
      const student = (v4PanelSiswaCache[v4TfKelasSel]||[]).find(s => s.key===studentKey); if (!student) return;
      const surah = (document.getElementById('v4TfSurah_'+studentKey).value||'').trim();
      if (!surah) return toast('Surah wajib diisi!', true);
      const data = { studentId: studentKey, studentName: student.name, kelas: student.kelas, surah, ayat: (document.getElementById('v4TfAyat_'+studentKey).value||'').trim(), type: document.getElementById('v4TfType_'+studentKey).value, note: (document.getElementById('v4TfNote_'+studentKey).value||'').trim(), guru: currentUser.name, guruKey: currentUser.key || null, tanggal: v4Date(), tahunAjaran: currentTahunAjaran };
      const btnTahfidz = document.getElementById('btnV4Tahfidz_'+studentKey);
      try {
        setBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz);
        db.ref('tahfidz_v4').push().set(data).then(() => { clearBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz); toast('✅ Capaian tahfidz disimpan'); v4LoadCore(); }).catch(err => { clearBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz); console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
      } catch (e) {
        clearBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz);
        console.error('[SI MAMBA] Gagal simpan:', e);
        toast('❌ Gagal menyimpan: ' + (e && e.message || e), true);
      }
    }


    // -------- Ekstrakurikuler: Pramuka (SKU per kelas) --------
    // CATATAN: daftar poin SKU (Syarat Kecakapan Umum) di bawah adalah kerangka RINGKAS &
    // REPRESENTATIF mengikuti struktur umum SKU Pramuka SD/MI (Siaga utk Kelas 1-3, Penggalang
    // utk Kelas 4-6), dikelompokkan per bidang. Ini BUKAN salinan resmi kwartir/gudep tertentu --
    // kalau madrasah punya kisi-kisi SKU resmi sendiri yang berbeda, poin di bawah bisa
    // disesuaikan (tinggal ubah array PRAMUKA_SKU ini).
    const PRAMUKA_SKU = {
      siaga: { label: 'Siaga (Kelas 1-3)', groups: [
        { name: 'Keagamaan', items: [
          { id:'s_agama1', label:'Dapat berdoa menurut agamanya masing-masing' },
          { id:'s_agama2', label:'Rajin beribadah sesuai agama & kepercayaannya' },
        ]},
        { name: 'Kepribadian & Sosial', items: [
          { id:'s_pri1', label:'Dapat mengucapkan Dwisatya dan Dwidarma serta memahami artinya' },
          { id:'s_pri2', label:'Hafal dan dapat menyebutkan isi Pancasila' },
          { id:'s_pri3', label:'Terbiasa menjaga kebersihan diri & lingkungan' },
        ]},
        { name: 'Kesehatan & Jasmani', items: [
          { id:'s_jas1', label:'Dapat mengikuti baris-berbaris sederhana' },
          { id:'s_jas2', label:'Mengetahui & membiasakan kesehatan pribadi (mandi, gosok gigi, dll)' },
        ]},
        { name: 'Kecakapan Kepramukaan', items: [
          { id:'s_pram1', label:'Dapat menyanyikan lagu Indonesia Raya' },
          { id:'s_pram2', label:'Dapat menyebutkan tanda pengenal Pramuka Siaga' },
          { id:'s_pram3', label:'Dapat membuat salah satu hasil karya (kerajinan tangan)' },
        ]},
      ]},
      penggalang: { label: 'Penggalang (Kelas 4-6)', groups: [
        { name: 'Keagamaan', items: [
          { id:'p_agama1', label:'Dapat menjelaskan dan menjalankan ibadah sesuai agamanya' },
        ]},
        { name: 'Kepribadian & Sosial', items: [
          { id:'p_pri1', label:'Dapat mengucapkan Trisatya dan Dasadarma serta memahami artinya' },
          { id:'p_pri2', label:'Dapat menjelaskan lambang gerakan Pramuka (tunas kelapa)' },
          { id:'p_pri3', label:'Aktif bergotong royong di lingkungan sekolah/rumah' },
        ]},
        { name: 'Kesehatan & Jasmani', items: [
          { id:'p_jas1', label:'Dapat melakukan salah satu cabang olahraga' },
          { id:'p_jas2', label:'Dapat memberikan pertolongan pertama (P3K) sederhana' },
        ]},
        { name: 'Kecakapan Kepramukaan', items: [
          { id:'p_pram1', label:'Dapat baris-berbaris' },
          { id:'p_pram2', label:'Dapat menggunakan kompas untuk menentukan arah mata angin' },
          { id:'p_pram3', label:'Dapat membuat simpul & ikatan tali-temali dasar' },
          { id:'p_pram4', label:'Dapat menyanyikan lagu wajib nasional & salah satu lagu daerah' },
        ]},
      ]},
    };
    function pramukaTingkatForKelas(kelas) { const num = parseInt(String(kelas).replace(/\D/g,''),10) || 0; return num <= 3 ? 'siaga' : 'penggalang'; }
    function v4PramukaMyKelas() {
      if (v4IsAdmin() || v4IsHead()) return KELAS_LIST.slice();
      return KELAS_LIST.filter(k => { const p = V4.pramukaPic && V4.pramukaPic[k]; return p && currentUser && (p.key===currentUser.key || p.name===currentUser.name); });
    }
    function v4RenderPramukaPicAdmin(){
      const box=document.getElementById('v4PramukaPicAdmin'); if(!box) return;
      if (!v4IsAdmin()) { box.innerHTML=''; return; }
      const rows = KELAS_LIST.map(k => {
        const pic = (V4.pramukaPic && V4.pramukaPic[k]) || {};
        const options=(allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}" ${(g.key||g.name)===pic.key?'selected':''}>${v4Safe(g.name)}</option>`).join('');
        return `<tr><td style="font-weight:600;white-space:nowrap;">${k} <span class="v4-muted" style="font-weight:normal;">(${pramukaTingkatForKelas(k)==='siaga'?'Siaga':'Penggalang'})</span></td><td><select class="field" style="font-size:12px;padding:5px;" onchange="v4SetPramukaPic('${k}', this.value)"><option value="">-- Belum Ditentukan --</option>${options}</select></td></tr>`;
      }).join('');
      box.innerHTML = `<div class="v4-card"><h4>👤 Pembina Pramuka per Kelas</h4><div class="v4-muted" style="margin-bottom:8px;">Admin menentukan satu guru pembina Pramuka untuk tiap kelas (tidak harus wali kelas).</div><div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Pembina</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    function v4SetPramukaPic(kelas, guruValue){
      if (!v4IsAdmin()) return toast('Hanya Admin!', true);
      if (!guruValue) { db.ref('pramuka_pic_v4/'+kelas).remove().then(() => { toast('Pembina Pramuka '+kelas+' dihapus'); delete V4.pramukaPic[kelas]; v4RenderPramuka(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); }); return; }
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return;
      const data = { kelas, key: guru.key||guru.name, name: guru.name, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
      db.ref('pramuka_pic_v4/'+kelas).set(data).then(() => { toast('✅ Pembina Pramuka '+kelas+' ditentukan: '+guru.name); addLog('tentukan_pembina_pramuka', kelas+' - '+guru.name); V4.pramukaPic[kelas]=data; v4RenderPramuka(); }).catch(err=>toast('Gagal: '+err.message,true));
    }
    let v4PramukaKelasSel = '';
    let v4PramukaOpenStudent = null;
    function v4PramukaProgress(studentKey, tingkat){
      const rec = (V4.pramukaSku||[]).find(x=>x.studentId===studentKey);
      const items = (rec && rec.items) || {};
      const totalItems = PRAMUKA_SKU[tingkat].groups.reduce((s,g)=>s+g.items.length,0);
      const done = Object.values(items).filter(Boolean).length;
      return { done, totalItems, pct: totalItems ? Math.round(done/totalItems*100) : 0, items };
    }
    function v4RenderPramuka(){
      v4RenderPramukaPicAdmin();
      const sel=document.getElementById('v4PramukaKelas'); if(!sel) return;
      const myKelas = v4PramukaMyKelas();
      if (v4PramukaKelasSel && !myKelas.includes(v4PramukaKelasSel)) v4PramukaKelasSel = '';
      sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + myKelas.map(k => `<option value="${k}" ${v4PramukaKelasSel===k?'selected':''}>${k} (${pramukaTingkatForKelas(k)==='siaga'?'Siaga':'Penggalang'})</option>`).join('');
      v4RenderPramukaKelasPanel();
    }
    function v4SetPramukaKelas(kelas){
      v4PramukaKelasSel = kelas; v4PramukaOpenStudent = null;
      if (!kelas) { v4RenderPramuka(); return; }
      v4FetchSiswaByKelas(kelas, () => v4RenderPramuka());
      v4RenderPramuka();
    }
    function v4RenderPramukaKelasPanel(){
      const box=document.getElementById('v4PramukaKelasPanel'); if(!box) return;
      if (!v4PramukaKelasSel) { box.innerHTML = '<p class="v4-muted">Pilih kelas untuk mulai menilai SKU Pramuka siswa.</p>'; return; }
      if (!v4PanelSiswaCache[v4PramukaKelasSel]) { box.innerHTML = v4PanelSiswaMemuatHtml(v4PramukaKelasSel, `v4SetPramukaKelas('${escapeJs(v4PramukaKelasSel)}')`); return; }
      const tingkat = pramukaTingkatForKelas(v4PramukaKelasSel);
      const siswa = v4PanelSiswaCache[v4PramukaKelasSel].slice().sort((a,b)=>COLLATOR_ID.compare(a.name, b.name));
      if (siswa.length === 0) { box.innerHTML = '<p class="v4-muted">Belum ada siswa di kelas ini.</p>'; return; }
      const rows = siswa.map(s => {
        const prog = v4PramukaProgress(s.key, tingkat);
        const isOpen = v4PramukaOpenStudent === s.key;
        let checklistHtml = '';
        if (isOpen) {
          checklistHtml = PRAMUKA_SKU[tingkat].groups.map(g => `
            <div style="margin-top:8px;">
              <div style="font-weight:700;font-size:12px;color:#0f3b2c;margin-bottom:4px;">${v4Safe(g.name)}</div>
              ${g.items.map(it => `<label style="display:flex;align-items:center;gap:6px;font-weight:normal;font-size:12px;padding:3px 0;"><input type="checkbox" id="v4Sku_${s.key}_${it.id}" ${prog.items[it.id]?'checked':''} style="width:auto;"> ${v4Safe(it.label)}</label>`).join('')}
            </div>`).join('') + `<button class="btn btn-success" style="margin-top:10px;padding:6px 14px;font-size:11px;" onclick="v4SavePramukaChecklist('${s.key}','${tingkat}')">💾 Simpan Checklist</button>`;
        }
        return `<div class="v4-task" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <div class="v4-task-main"><div class="v4-task-title">🏕️ ${v4Safe(s.name)}</div><div class="v4-task-meta">SKU ${prog.done}/${prog.totalItems} poin (${prog.pct}%)</div></div>
            <button class="btn btn-soft" style="padding:4px 10px;font-size:11px;" onclick="v4TogglePramukaStudent('${s.key}')">${isOpen?'✖️ Tutup':'📋 Isi SKU'}</button>
          </div>
          ${checklistHtml}
        </div>`;
      }).join('');
      box.innerHTML = `<p class="v4-muted" style="margin-bottom:8px;">Tingkat: <strong>${PRAMUKA_SKU[tingkat].label}</strong></p>${rows}`;
    }
    function v4TogglePramukaStudent(studentKey){ v4PramukaOpenStudent = (v4PramukaOpenStudent===studentKey) ? null : studentKey; v4RenderPramukaKelasPanel(); }
    function v4SavePramukaChecklist(studentKey, tingkat){
      const pic = V4.pramukaPic && V4.pramukaPic[v4PramukaKelasSel];
      const isPic = pic && currentUser && (pic.key===currentUser.key || pic.name===currentUser.name);
      if (!v4IsAdmin() && !v4IsHead() && !isPic) return toast('Hanya pembina Pramuka kelas ini yang bisa menilai!', true);
      const student = (v4PanelSiswaCache[v4PramukaKelasSel]||[]).find(s=>s.key===studentKey); if (!student) return;
      const items = {};
      PRAMUKA_SKU[tingkat].groups.forEach(g => g.items.forEach(it => { const el = document.getElementById('v4Sku_'+studentKey+'_'+it.id); items[it.id] = !!(el && el.checked); }));
      const data = { studentId: studentKey, studentName: student.name, kelas: student.kelas, tingkat, items, updatedBy: currentUser.name, guruKey: currentUser.key || null, updatedAt: new Date().toISOString() };
      try {
        db.ref('pramuka_sku_v4/'+studentKey).set(data).then(() => {
          toast('✅ Checklist SKU '+student.name+' disimpan');
          const idx = (V4.pramukaSku||[]).findIndex(x=>x.studentId===studentKey);
          if (idx>=0) V4.pramukaSku[idx] = {...data, key:studentKey}; else V4.pramukaSku.push({...data, key:studentKey});
          v4RenderPramukaKelasPanel();
        }).catch(err => toast('Gagal: '+err.message, true));
      } catch (e) {
        toast('Gagal: '+(e && e.message || e), true);
      }
    }

    // -------- Ekstrakurikuler --------
    // Setiap ekskul (Pramuka, Drumband, dll) punya 2 tingkat -- rendah (Kelas 1-3) & tinggi
    // (Kelas 4-6) -- masing-masing dengan deskripsi kegiatan sendiri & PIC (pembina) sendiri.
    // Pola PIC-per-tingkat ini sengaja dibuat mirip pramuka_pic_v4 (lihat v4SetPramukaPic di atas)
    // supaya konsisten, tapi generik untuk semua ekskul, bukan cuma Pramuka.
    function v4EkskulTierForKelas(kelas) { const num = parseInt(String(kelas).replace(/\D/g,''),10) || 0; return num <= 3 ? 'rendah' : 'tinggi'; }
    function v4EkskulDefaultTiers() { return { rendah: { label:'Kelas 1-3', desc:'', picKey:'', picName:'' }, tinggi: { label:'Kelas 4-6', desc:'', picKey:'', picName:'' } }; }
    // -------- PIC "tidak hadir hari ini": pengganti harian (generik) --------
    // Pola yang sama dipakai PIC Kegiatan (activity_substitute_v4, lihat v4ToggleAppointSubstitute
    // dkk di atas): Admin/Kepsek bisa menunjuk pengganti, guru lain boleh mencalonkan diri sendiri
    // (aman dari race condition lewat transaction, hanya kalau belum ada pengganti lain hari itu),
    // dan bisa dibatalkan oleh Admin/Kepsek atau si pengganti sendiri. PIC tetapnya TIDAK berubah,
    // cuma untuk HARI INI (v4Date()) saja yang digantikan. Ditulis generik (parameter node &
    // scopeKey) supaya PIC Ekskul per-tingkat tidak perlu menduplikasi logika ini dari nol.
    function v4SubToday(store, scopeKey){ return store && store[scopeKey+'_'+v4Date()]; }
    function v4IsPicWithSub(picKey, picName, store, scopeKey){
      if (!currentUser) return false;
      if ((picKey && picKey===currentUser.key) || (picName && picName===currentUser.name)) return true;
      const sub = v4SubToday(store, scopeKey);
      return !!(sub && (sub.guruKey===currentUser.key || (currentUser.name && sub.guruName===currentUser.name)));
    }
    function v4AppointSub(node, scopeKey, guruValue, onDone){
      if (!v4IsAdmin() && !v4IsHead()) return toast('Hanya Admin/Kepala Madrasah yang bisa menunjuk pengganti untuk guru lain! Kalau Anda sendiri ingin menggantikan, pakai opsi "Saya Gantikan Hari Ini".', true);
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return toast('Pilih guru pengganti dulu!', true);
      const tgl = v4Date();
      db.ref(node+'/'+scopeKey+'_'+tgl).set({ scopeKey, tanggal: tgl, guruKey: guru.key||guru.name, guruName: guru.name, appointedBy: currentUser.name, appointedAt: new Date().toISOString() }).then(() => { toast('✅ '+guru.name+' ditunjuk sebagai pengganti hari ini'); onDone && onDone(); }).catch(err => toast('Gagal: '+err.message, true));
    }
    function v4VolunteerSub(node, scopeKey, onDone){
      const tgl = v4Date();
      db.ref(node+'/'+scopeKey+'_'+tgl).transaction(cur => { if (cur) return; return { scopeKey, tanggal: tgl, guruKey: currentUser.key||currentUser.name, guruName: currentUser.name, appointedBy: currentUser.name, appointedAt: new Date().toISOString(), volunteer: true }; }).then(result => { if (!result.committed) return toast('Sudah ada guru lain yang lebih dulu menjadi pengganti hari ini.', true); toast('✅ Anda tercatat sebagai pengganti hari ini'); onDone && onDone(); }).catch(err => toast('Gagal: '+(err.message||err), true));
    }
    function v4RemoveSub(node, scopeKey, store, onDone){
      const tgl = v4Date();
      const sub = v4SubToday(store, scopeKey);
      const sayaPengganti = sub && (sub.guruKey===currentUser?.key || sub.guruName===currentUser?.name);
      if (!v4IsAdmin() && !v4IsHead() && !sayaPengganti) return toast('Hanya Admin/Kepala Madrasah atau guru yang bersangkutan yang bisa membatalkan!', true);
      db.ref(node+'/'+scopeKey+'_'+tgl).remove().then(() => { toast('Penunjukan pengganti dibatalkan'); onDone && onDone(); }).catch(err => toast('❌ Gagal: '+(err.message||err), true));
    }
    let v4EkskulSubFormOpenFor = null;
    function v4EkskulScopeKey(ekskulKey, tierKey){ return ekskulKey+'_'+tierKey; }
    function v4ToggleEkskulSubForm(ekskulKey, tierKey){ const k=v4EkskulScopeKey(ekskulKey,tierKey); v4EkskulSubFormOpenFor = (v4EkskulSubFormOpenFor===k)?null:k; v4RenderEkskul(); }
    function v4AppointEkskulSub(ekskulKey, tierKey){ const scopeKey=v4EkskulScopeKey(ekskulKey,tierKey); const sel=document.getElementById('v4EkskulSubPick_'+scopeKey); v4AppointSub('ekskul_pic_substitute_v4', scopeKey, sel?sel.value:'', ()=>{ V4.ekskulSubstitutes[scopeKey+'_'+v4Date()]={}; v4EkskulSubFormOpenFor=null; v4LoadCore(); }); }
    function v4VolunteerEkskulSub(ekskulKey, tierKey){ const ekskul=(V4.ekskuls||[]).find(x=>x.key===ekskulKey); if (ekskul && v4IsEkskulPic(ekskul, tierKey==='rendah'?'Kelas 1':'Kelas 4')) return toast('Anda sudah PIC tingkat ini.', true); v4VolunteerSub('ekskul_pic_substitute_v4', v4EkskulScopeKey(ekskulKey,tierKey), ()=>v4LoadCore()); }
    function v4RemoveEkskulSub(ekskulKey, tierKey){ v4RemoveSub('ekskul_pic_substitute_v4', v4EkskulScopeKey(ekskulKey,tierKey), V4.ekskulSubstitutes, ()=>v4LoadCore()); }
    // PIC ekskul untuk tingkat yang sesuai kelas siswa (atau Admin/Kepsek, yang selalu boleh),
    // TERMASUK pengganti hari ini kalau PIC tetapnya berhalangan (lihat blok pengganti di atas).
    function v4IsEkskulPic(ekskul, kelas) {
      if (v4IsAdmin() || v4IsHead()) return true;
      if (!ekskul || !ekskul.tiers) return false;
      const tierKey = v4EkskulTierForKelas(kelas), tier = ekskul.tiers[tierKey];
      if (!tier) return false;
      return v4IsPicWithSub(tier.picKey, tier.picName, V4.ekskulSubstitutes, v4EkskulScopeKey(ekskul.key, tierKey));
    }
    let v4EkskulEditKey = null;
    function v4RenderEkskul(){
      const box=document.getElementById('v4EkskulConfig'); if(!box)return;
      box.innerHTML=V4.ekskuls.length?V4.ekskuls.map(x=>{
        const t = x.tiers || v4EkskulDefaultTiers();
        const tierHtml = ['rendah','tinggi'].map(k => {
          const scopeKey = v4EkskulScopeKey(x.key, k);
          const sub = v4SubToday(V4.ekskulSubstitutes, scopeKey);
          const formOpen = v4EkskulSubFormOpenFor === scopeKey;
          const sayaPengganti = sub && (sub.guruKey===currentUser?.key || sub.guruName===currentUser?.name);
          let subControl = '';
          if (sub && sub.guruName) {
            subControl = `<div class="v4-chip orange" style="margin-top:4px;">🔁 Pengganti hari ini: ${v4Safe(sub.guruName)} ${(v4IsAdmin()||v4IsHead()||sayaPengganti)?`<span style="cursor:pointer;font-weight:700;" onclick="v4RemoveEkskulSub('${x.key}','${k}')"> ✕</span>`:''}</div>`;
          } else if (v4IsAdmin() || v4IsHead()) {
            subControl = formOpen
              ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;"><select id="v4EkskulSubPick_${scopeKey}" class="field" style="flex:1;min-width:140px;"><option value="">-- Pilih guru pengganti --</option>${(allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}">${v4Safe(g.name)}</option>`).join('')}</select><button class="btn btn-warning" style="padding:3px 10px;font-size:11px;" onclick="v4AppointEkskulSub('${x.key}','${k}')">Tunjuk</button><button class="btn btn-soft" style="padding:3px 10px;font-size:11px;" onclick="v4ToggleEkskulSubForm('${x.key}','${k}')">Batal</button></div>`
              : `<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-top:4px;" onclick="v4ToggleEkskulSubForm('${x.key}','${k}')">PIC tidak hadir? Tunjuk pengganti</button>`;
          } else if (!v4IsEkskulPic(x, k==='rendah'?'Kelas 1':'Kelas 4')) {
            subControl = `<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-top:4px;" onclick="v4VolunteerEkskulSub('${x.key}','${k}')">PIC tidak hadir? Saya gantikan hari ini</button>`;
          }
          return `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #e5e7eb;"><div style="font-weight:600;font-size:12px;">${v4Safe(t[k].label||(k==='rendah'?'Kelas 1-3':'Kelas 4-6'))}</div><div class="v4-muted" style="font-size:12px;">PIC: ${v4Safe(t[k].picName||'-- Belum ditentukan --')}</div>${t[k].desc?`<div class="v4-muted" style="font-size:12px;margin-top:2px;">${v4Safe(t[k].desc)}</div>`:''}${subControl}</div>`;
        }).join('');
        return `<div class="v4-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;"><h4>🎯 ${v4Safe(x.name)}</h4>${v4IsAdmin()?`<button class="btn btn-soft" style="padding:3px 10px;font-size:11px;white-space:nowrap;" onclick="v4EditEkskul('${x.key}')">✏️ Edit</button>`:''}</div><span class="v4-chip ${x.honorEnabled?'orange':''}" style="margin-top:4px;">${x.honorEnabled?'💰 Honor aktif':'Honor opsional'}</span>${tierHtml}</div>`;
      }).join(''):'<div class="v4-card"><h4>Belum ada ekskul</h4><div class="v4-muted">Admin dapat menambahkan ekstrakurikuler.</div></div>';
      const s=document.getElementById('v4EkskulSelect'); if(s)s.innerHTML=V4.ekskuls.map(x=>`<option value="${v4Safe(x.key)}">${v4Safe(x.name)}</option>`).join('');
      const st=document.getElementById('v4EkskulStudent'); if(st)st.innerHTML=(allSiswa||[]).map(x=>`<option value="${v4Safe(x.key)}">${v4Safe(x.name)} — ${v4Safe(x.kelas)}</option>`).join('');
      const list=document.getElementById('v4EkskulList'); if(list)list.innerHTML=(V4.ekskuls.length?'<p class="v4-muted">Gunakan form di atas untuk mencatat kehadiran.</p>':'');
    }
    function v4AddEkskul(){ if(!v4CanAdmin())return toast('Hanya Admin!',true); v4EkskulEditKey=null; v4OpenEkskulModal(null); }
    function v4EditEkskul(key){ if(!v4CanAdmin())return toast('Hanya Admin!',true); v4EkskulEditKey=key; v4OpenEkskulModal((V4.ekskuls||[]).find(x=>x.key===key)); }
    function v4OpenEkskulModal(ekskul){
      const t = (ekskul && ekskul.tiers) || v4EkskulDefaultTiers();
      document.getElementById('ekskulModalTitle').textContent = ekskul ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler';
      document.getElementById('ekskulName').value = (ekskul && ekskul.name) || '';
      document.getElementById('ekskulHonor').checked = !!(ekskul && ekskul.honorEnabled);
      const picOptions = '<option value="">-- Belum ditentukan --</option>' + (allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}">${v4Safe(g.name)}</option>`).join('');
      document.getElementById('ekskulRendahDesc').value = t.rendah.desc || '';
      document.getElementById('ekskulTinggiDesc').value = t.tinggi.desc || '';
      const selR = document.getElementById('ekskulRendahPic'); selR.innerHTML = picOptions; selR.value = t.rendah.picKey || '';
      const selT = document.getElementById('ekskulTinggiPic'); selT.innerHTML = picOptions; selT.value = t.tinggi.picKey || '';
      document.getElementById('ekskulModal').classList.add('show');
    }
    function closeEkskulModal(){ document.getElementById('ekskulModal').classList.remove('show'); }
    function v4SaveEkskulModal(){
      if (!v4CanAdmin()) return toast('Hanya Admin!', true);
      const name = document.getElementById('ekskulName').value.trim();
      if (!name) return toast('Nama ekskul wajib diisi!', true);
      const honorEnabled = document.getElementById('ekskulHonor').checked;
      const mkTier = (label, descId, picId) => { const picKey = document.getElementById(picId).value; const guru = (allGuru||[]).find(g=>(g.key||g.name)===picKey); return { label, desc: document.getElementById(descId).value.trim(), picKey: picKey||'', picName: guru?guru.name:'' }; };
      const tiers = { rendah: mkTier('Kelas 1-3', 'ekskulRendahDesc', 'ekskulRendahPic'), tinggi: mkTier('Kelas 4-6', 'ekskulTinggiDesc', 'ekskulTinggiPic') };
      if (v4EkskulEditKey) {
        db.ref('extracurriculars_v4/'+v4EkskulEditKey).update({ name, honorEnabled, tiers }).then(()=>{ toast('✅ Ekskul diperbarui'); closeEkskulModal(); v4LoadCore(); }).catch(err=>toast('Gagal: '+err.message, true));
      } else {
        db.ref('extracurriculars_v4').push().set({ name, honorEnabled, active:true, tiers, createdAt:new Date().toISOString() }).then(()=>{ toast('✅ Ekskul ditambahkan'); closeEkskulModal(); v4LoadCore(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
      }
    }
    function v4SaveEkskulAttendance(){
      const ex=V4.ekskuls.find(x=>x.key===document.getElementById('v4EkskulSelect').value),st=(allSiswa||[]).find(x=>x.key===document.getElementById('v4EkskulStudent').value);
      if(!ex||!st)return toast('Pilih ekskul dan siswa!',true);
      if(!v4IsEkskulPic(ex, st.kelas)) return toast('Hanya PIC ekskul tingkat ini (atau Admin/Kepsek) yang bisa mencatat!', true);
      if (isBusy('v4SaveEkskulAttendance')) return toast('Sedang menyimpan...', false, 1500);
      const btnSaveEkskulAtt = document.getElementById('btnSaveEkskulAttendance');
      setBusy('v4SaveEkskulAttendance', btnSaveEkskulAtt);
      const tglSesi = v4Date(); // dihitung sekali supaya record & key honor tidak beda hari kalau kebetulan lewat tengah malam
      const attRef = db.ref('extracurricular_attendance_v4').push();
      const attRec = {ekskulId:ex.key,ekskulName:ex.name,studentId:st.key,studentName:st.name,kelas:st.kelas,status:document.getElementById('v4EkskulStatus').value,tanggal:tglSesi,recordedBy:currentUser.name,tahunAjaran:currentTahunAjaran};
      attRef.set(attRec).then(()=>{
        clearBusy('v4SaveEkskulAttendance', btnSaveEkskulAtt);
        toast('✅ Absensi ekskul tersimpan');
        // FIX: state lokal tidak ikut diperbarui -- V4.ekskulAttendance cuma diisi ulang oleh
        // v4LoadCore(), jadi ringkasan Ekskul di Preview Raport (v4HitungEkskulSiswa) baru memuat
        // absensi yang baru dicatat setelah reload halaman/data. Sekarang record baru langsung
        // dimasukkan (key dari push() yang sama, jadi tidak dobel kalau nanti dimuat ulang).
        try {
          if (!Array.isArray(V4.ekskulAttendance)) V4.ekskulAttendance = [];
          if (!V4.ekskulAttendance.some(r => r.key === attRef.key)) V4.ekskulAttendance.push(Object.assign({ key: attRef.key }, attRec));
          v4RenderReportPreview();
        } catch (e) { console.warn('[SI MAMBA] Gagal memperbarui state lokal absensi ekskul:', e); }
        // Kredit honor otomatis utk siapa pun yang benar mencatat sesi ini hari ini (PIC tetap
        // ATAU pengganti hari itu, sudah dipastikan lolos v4IsEkskulPic di atas) -- supaya PIC/
        // pengganti tidak perlu lagi mengisi Jurnal Mengajar terpisah demi dapat honor Ekstra.
        // Key deterministik (bukan push()) per ekskul+tingkat+tanggal, sengaja BUKAN per siswa,
        // supaya mencatat banyak siswa dalam 1 sesi yang sama tidak melipatgandakan honor.
        if (ex.honorEnabled) {
          const tierKey = v4EkskulTierForKelas(st.kelas), scopeKey = v4EkskulScopeKey(ex.key, tierKey);
          const tierLabel = (ex.tiers && ex.tiers[tierKey] && ex.tiers[tierKey].label) || (tierKey==='rendah'?'Kelas 1-3':'Kelas 4-6');
          const honorKey = scopeKey+'_'+tglSesi;
          const honorRec = { ekskulId: ex.key, ekskulName: ex.name, tierKey, tierLabel, tanggal: tglSesi, guru: currentUser.name, guruKey: currentUser.key||currentUser.name, honor: getEkstraRate(ex.name), tahunAjaran: currentTahunAjaran, recordedAt: new Date().toISOString() };
          db.ref('ekskul_pic_honor_v4/'+honorKey).set(honorRec).then(() => {
            // FIX: sama seperti di atas -- allEkskulPicHonor (sumber halaman Honor, Slip Honor &
            // Laporan Honor) sebelumnya baru berisi honor sesi ini setelah reload data. Key-nya
            // deterministik, jadi cukup upsert per key (bukan push) supaya tidak dobel.
            try {
              const rec = Object.assign({ key: honorKey }, honorRec);
              const idx = allEkskulPicHonor.findIndex(x => x.key === honorKey);
              if (idx >= 0) allEkskulPicHonor[idx] = rec; else allEkskulPicHonor.push(rec);
            } catch (e) { console.warn('[SI MAMBA] Gagal memperbarui state lokal honor PIC ekskul:', e); }
          }).catch(err => console.error('[SI MAMBA] Gagal simpan honor PIC ekskul:', err));
        }
      }).catch(err => { clearBusy('v4SaveEkskulAttendance', btnSaveEkskulAtt); console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }

    // -------- Guru Pengganti (jadwal mengajar): DIHAPUS --------
    // Sistem request/offer/accept/eskalasi V4 (substitution_requests_v4,
    // substitution_daily_claims_v4) dihapus karena duplikat & tidak sinkron dengan
    // validasi "mewakili" yang sudah berjalan di Jurnal Mengajar (lihat
    // lookupJadwalUntukJurnal, terapkanJadwalPilihan, checkBentrokJurnal, dan
    // VALIDASI B/C/E di dalam simpanJurnal): guru diwakili wajib punya jadwal di
    // kelas+jam itu, dibatasi MAX_MEWAKILI_PER_HARI per hari, dan dicek bentrok jam.
    // Jalur jurnal itu sekarang SATU-SATUNYA cara mencatat "mewakili guru lain",
    // dan tetap dihonor lewat rate V4.rates.substitute (lihat v4GetHonorRates()/v4HitungHonor())
    // yang diatur di halaman Honor > Tarif Honor Terpusat.
    // (Fitur "Pengganti PIC Kegiatan" -- v4ToggleAppointSubstitute /
    // v4RemoveActivitySubstitute, state V4.activitySubstitutes -- TIDAK ikut dihapus,
    // itu fitur berbeda untuk kegiatan/amalan harian, bukan jadwal mengajar.)

    // -------- Honor configuration: guru asli, pengganti, kegiatan --------
    function v4RenderHonorConfig(){
      const card=document.getElementById('ekskulRateCard'); if(!card)return;
      if(v4IsAdmin()||v4IsHead()){
        let host=document.getElementById('v4HonorConfig');
        if(!host){host=document.createElement('div');host.id='v4HonorConfig';host.className='card';card.parentElement.insertBefore(host,card);}
        host.innerHTML=`<div class="v4-section-title"><h3>⚙️ Tarif Honor Terpusat</h3><span class="v4-chip blue">Admin</span></div><div class="v4-grid-3"><div><label class="label">Honor Guru Asli / sesi</label><input id="v4RateOriginal" type="number" class="field" value="${V4.rates.original||7000}"></div><div><label class="label">Honor Guru Pengganti / sesi</label><input id="v4RateSubstitute" type="number" class="field" value="${V4.rates.substitute||5000}"></div><div><label class="label">Honor Kegiatan / sesi (Lembur-Rapat &amp; Ujian)</label><input id="v4RateActivity" type="number" class="field" value="${V4.rates.activity||0}"></div><div><label class="label">Honor Sholat Dhuha / hadir</label><input id="v4RateDluha" type="number" class="field" value="${V4.rates.dluha||5000}"></div><div><label class="label">Honor Sholat Dzuhur / hadir</label><input id="v4RateDzuhur" type="number" class="field" value="${V4.rates.dzuhur||5000}"></div></div><p class="v4-muted" style="margin-top:8px;">Honor Guru Asli &amp; Guru Pengganti langsung berlaku ke semua perhitungan honor. Honor Kegiatan hanya jadi <strong>nilai default</strong> yang otomatis terisi saat Admin membuat acara Lembur/Rapat atau Ujian baru di menu masing-masing -- tetap bisa diubah manual per acara, dan tidak mengubah honor acara yang sudah dibuat sebelumnya. Honor Sholat Dhuha &amp; Dzuhur langsung berlaku ke semua perhitungan honor bulan berjalan (dihitung per kehadiran "Hadir" guru pada absen religi).</p><button class="btn btn-success" style="margin-top:9px;" onclick="v4SaveHonorRates()">💾 Simpan Tarif</button>`;
      }
    }
    // Validasi tarif: kosong / bukan angka / negatif SELALU ditolak; nilai 0 ditolak untuk tarif yang
    // dipakai v4GetHonorRates() (original, substitute, dluha, dzuhur) karena pembacanya memakai
    // `|| 7000/5000` -- nilai 0 yang tersimpan akan DIAM-DIAM dibaca sebagai tarif default, sementara
    // toast tetap bilang "diperbarui". Hanya `activity` (default prefill acara) yang boleh 0.
    function v4SaveHonorRates(){
      if(!v4CanAdmin())return toast('Hanya Admin!',true);
      const defs=[
        ['original','v4RateOriginal','Honor Guru Asli',false,null],
        ['substitute','v4RateSubstitute','Honor Guru Pengganti',false,null],
        ['activity','v4RateActivity','Honor Kegiatan',true,null],
        ['dluha','v4RateDluha','Honor Sholat Dhuha',false,5000],
        ['dzuhur','v4RateDzuhur','Honor Sholat Dzuhur',false,5000]
      ];
      const rates={};
      for(const [k,id,label,bolehNol,fallback] of defs){
        const el=document.getElementById(id);
        if(!el&&fallback!==null){rates[k]=(V4.rates&&V4.rates[k])||fallback;continue;} // input tak ada di DOM: pertahankan nilai lama
        const raw=String(el.value).trim(),n=Number(raw);
        if(raw===''||!isFinite(n)||n<0||(!bolehNol&&n===0)){
          toast(`⚠️ ${label} harus berupa angka ${bolehNol?'0 atau lebih':'lebih dari 0'}.`,true);
          el.focus();
          return;
        }
        rates[k]=n;
      }
      rates.updatedBy=currentUser.name;rates.updatedAt=new Date().toISOString();
      db.ref('honor_rates_v4').set(rates).then(()=>{V4.rates=rates;v4Audit('UPDATE_HONOR_RATES','HONOR_RATE','global',null,rates);toast('✅ Tarif honor diperbarui');}).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }

    // ============================================================
    // ABSEN GURU VIA QR + LOKASI (tanpa foto)
    // ============================================================
    function v4GenerateAbsenQrToken(){
      return 'SIMAMBA-ABSEN-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,10).toUpperCase();
    }
    function v4LoadAbsenQrSettings(){
      return db.ref('absen_qr_settings').once('value').then(s => { V4.absenQr = s.val() || null; });
    }
    function v4RenderAbsenQrSettingsForm(){
      if(!isAdmin()) return;
      const q = V4.absenQr;
      document.getElementById('absenQrLat').value = q && q.lat != null ? q.lat : '';
      document.getElementById('absenQrLng').value = q && q.lng != null ? q.lng : '';
      document.getElementById('absenQrRadius').value = q && q.radius != null ? q.radius : 150;
      const info = document.getElementById('absenQrTokenInfo');
      if (q && q.token) info.textContent = `Token QR aktif: ...${q.token.slice(-8)} (dibuat ${q.updatedBy || '-'}, ${q.updatedAt ? new Date(q.updatedAt).toLocaleString('id-ID') : '-'})`;
      else info.textContent = 'Token QR: belum dibuat. Klik "Buat Token QR Baru" lalu "Simpan Lokasi & QR".';
    }
    function v4GunakanLokasiSaya(){
      if (!navigator.geolocation) return toast('⚠️ Perangkat tidak mendukung GPS.', true);
      toast('📍 Mengambil lokasi Anda...', false, 2000);
      navigator.geolocation.getCurrentPosition(pos => {
        document.getElementById('absenQrLat').value = pos.coords.latitude.toFixed(6);
        document.getElementById('absenQrLng').value = pos.coords.longitude.toFixed(6);
        toast('✅ Lokasi saat ini terisi. Pastikan Anda sedang berada di madrasah sebelum menyimpan.');
      }, err => {
        toast('❌ Gagal ambil lokasi: ' + err.message, true);
      }, { enableHighAccuracy: true, timeout: 10000 });
    }
    function v4RegenerateAbsenQrToken(){
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!confirm('QR lama yang sudah dicetak/ditempel akan langsung tidak berlaku lagi. Lanjutkan buat token baru?')) return;
      V4.absenQr = V4.absenQr || {};
      V4.absenQr.token = v4GenerateAbsenQrToken();
      v4RenderAbsenQrSettingsForm();
      toast('🔄 Token baru dibuat. Klik "Simpan Lokasi & QR" untuk menerapkan, lalu cetak QR yang baru.');
    }
    function v4SaveAbsenQrSettings(){
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const lat = parseFloat(document.getElementById('absenQrLat').value);
      const lng = parseFloat(document.getElementById('absenQrLng').value);
      const radius = parseInt(document.getElementById('absenQrRadius').value) || 150;
      if (isNaN(lat) || isNaN(lng)) return toast('⚠️ Isi Latitude & Longitude dulu (atau klik "Pakai Lokasi Saya Sekarang").', true);
      const token = (V4.absenQr && V4.absenQr.token) || v4GenerateAbsenQrToken();
      const data = { lat, lng, radius, token, updatedBy: currentUser.name, updatedAt: new Date().toISOString() };
      db.ref('absen_qr_settings').set(data, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        V4.absenQr = data;
        v4RenderAbsenQrSettingsForm();
        v4Audit('UPDATE_ABSEN_QR_SETTINGS','ABSEN_QR','global',null,data);
        toast('✅ Lokasi & QR Absensi disimpan!');
      });
    }
    function v4CetakQrAbsensi(){
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const token = V4.absenQr && V4.absenQr.token;
      if (!token) return toast('⚠️ Token QR belum dibuat. Klik "Buat Token QR Baru" lalu "Simpan Lokasi & QR" dulu.', true);
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
      document.body.appendChild(tmp);
      try { new QRCode(tmp, { text: token, width: 300, height: 300, correctLevel: QRCode.CorrectLevel.H }); }
      catch (e) { document.body.removeChild(tmp); return toast('❌ Gagal membuat QR: ' + e.message, true); }
      setTimeout(() => {
        const canvasEl = tmp.querySelector('canvas'), imgEl = tmp.querySelector('img');
        const dataUrl = canvasEl ? canvasEl.toDataURL('image/png') : (imgEl ? imgEl.src : '');
        document.body.removeChild(tmp);
        if (!dataUrl) return toast('❌ Gagal membuat gambar QR.', true);
        const w = window.open('', '_blank', 'width=700,height=900');
        if (!w) return toast('Popup diblokir browser.', true);
        w.document.write(`<html><head><title>QR Absensi Guru - SI MAMBA</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#111}img{width:320px;height:320px;border:1px solid #ddd;padding:12px;border-radius:12px;}h1{font-size:22px;margin-bottom:4px;}p{color:#444;}@media print{button{display:none}}</style></head><body><h1>📍 QR Absensi Guru</h1><p>MI Mambaul Ulum — tempel di lokasi madrasah</p><img src="${dataUrl}"><p style="margin-top:20px;font-size:13px;color:#666;max-width:360px;margin-left:auto;margin-right:auto;">Scan QR ini lewat menu <b>Absen Guru</b> di aplikasi SI MAMBA. Lokasi GPS akan diverifikasi otomatis saat scan — pastikan absen dilakukan di lokasi ini.</p><button onclick="window.print()" style="margin-top:20px;padding:10px 24px;font-size:14px;">🖨️ Cetak</button></body></html>`);
        w.document.close();
      }, 150);
    }
    function v4HitungJarakMeter(lat1, lng1, lat2, lng2){
      const R = 6371000, toRad = d => d * Math.PI / 180;
      const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // -------- Notifications / tasks / approval --------
    function v4LoadNotifications(){if(!currentUser)return Promise.resolve();const seq=++v4NotifSeq;return fbTimeout(db.ref('notifications_v4').once('value').then(s=>{if(seq!==v4NotifSeq)return;V4.notifications=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;if(x.userKey===currentUser.key||x.userKey===currentUser.name||x.userKey==='system'||v4IsAdmin()||v4IsHead())V4.notifications.push(x)});v4RenderNotifications();}), 7000, 'notifications_v4');}
    function v4RenderNotifications(){const el=document.getElementById('v4NotificationList');if(!el)return;const unread=V4.notifications.filter(x=>!x.isRead).length;document.getElementById('v4NotifDot')?.classList.toggle('show',unread>0);el.innerHTML=V4.notifications.slice().sort((a,b)=>COLLATOR_ID.compare(String(b.createdAt), String(a.createdAt))).slice(0,100).map(x=>`<div class="v4-notif ${x.isRead?'':'unread'}"><div class="v4-notif-icon">${x.type==='ACTION'?'🚨':x.type==='SUCCESS'?'✅':x.type==='ALERT'?'⚠️':x.type==='REMINDER'?'⏰':'🔔'}</div><div style="flex:1"><div style="font-weight:800;font-size:13px;">${v4Safe(x.title)}</div><div style="font-size:12px;margin-top:3px;line-height:1.45;">${v4Safe(x.message)}</div><div class="v4-muted" style="margin-top:4px;">${x.createdAt?new Date(x.createdAt).toLocaleString('id-ID'):''}</div></div></div>`).join('')||'<p class="v4-muted">Belum ada notifikasi.</p>';}
    function v4MarkAllNotificationsRead(){if(!currentUser)return;const updates={};V4.notifications.filter(x=>!x.isRead && (x.userKey===currentUser.key||x.userKey===currentUser.name)).forEach(x=>updates[x.key+'/isRead']=true);if(Object.keys(updates).length)db.ref('notifications_v4').update(updates).then(()=>{v4NotifSeq++;V4.notifications.forEach(x=>x.isRead=true);v4RenderNotifications();toast('✓ Semua notifikasi dibaca');}).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });}
    function v4LoadApprovals(){const seq=++v4ApprSeq;return fbTimeout(db.ref('approval_requests_v4').once('value').then(s=>{if(seq!==v4ApprSeq)return;V4.approvals=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;if(v4CanHead()||x.requestedByKey===currentUser?.key)V4.approvals.push(x)});v4RenderApprovals();}), 7000, 'approval_requests_v4');}
    // Pusat Approval: gabungan permintaan yang menunggu -- Jurnal Susulan, Pulang Duluan, Koreksi Raport.
    // Tombol memanggil fungsi approve/reject yang sama dengan halaman asalnya (satu sumber logika).
    function v4RenderApprovals(){
      const el=document.getElementById('v4ApprovalList'); if(!el||!currentUser) return;
      const head=v4CanHead(), me=currentUser;
      const milikku=o=>head||(o.guruKey?o.guruKey===me.key:o.guru===me.name);
      const jam=k=>(typeof jamSettings==='object'&&jamSettings&&jamSettings[k])||{mulai:'-',selesai:'-'};
      const items=[];
      (allJournals||[]).filter(j=>j.status==='pending'&&milikku(j)).forEach(j=>items.push({jenis:'JURNAL',key:j.key,ikon:'📓',judul:`Jurnal susulan — ${j.subject||'-'} (${j.kelas||'-'})`,meta:`${j.tanggal||'-'} · Jam ke-${j.jam_ke||'-'} (${jam(j.jam_ke).mulai}–${jam(j.jam_ke).selesai}) · 👤 ${j.guru||'-'}`,isi:j.activity||'',waktu:j.requestedAt||j.dibuat||''}));
      (allEarlyLeaveRequests||[]).filter(r=>r.status==='pending'&&milikku(r)).forEach(r=>items.push({jenis:'PULANG',key:r.key,ikon:'🚪',judul:`Pulang duluan — ${r.guru||'-'}`,meta:`${r.tanggal||'-'}`,isi:r.alasan||'',waktu:r.createdAt||''}));
      (V4.approvals||[]).filter(x=>x.status==='PENDING').forEach(x=>items.push({jenis:'RAPORT',key:x.key,ikon:'↩️',judul:x.title||'Koreksi raport',meta:`Pengaju: ${x.requestedBy||'-'}`,isi:x.reason||'',waktu:x.createdAt||''}));
      items.sort((a,b)=>COLLATOR_ID.compare(String(b.waktu), String(a.waktu)));
      const cnt=t=>items.filter(x=>x.jenis===t).length;
      const chip=document.getElementById('v4ApprovalCount'); if(chip) chip.textContent=items.length+' menunggu';
      const sum=document.getElementById('v4ApprovalSummary');
      if(sum) sum.innerHTML=`<div class="v4-card"><div class="v4-muted">Jurnal Susulan</div><div class="v4-kpi">${cnt('JURNAL')}</div></div><div class="v4-card"><div class="v4-muted">Pulang Duluan</div><div class="v4-kpi">${cnt('PULANG')}</div></div><div class="v4-card"><div class="v4-muted">Koreksi Raport</div><div class="v4-kpi">${cnt('RAPORT')}</div></div>`;
      const btn=(cls,label,fn,key)=>`<button class="btn ${cls}" style="padding:5px 9px;font-size:11px;min-height:34px;" data-key="${escapeHtml(key)}" onclick="${fn}">${label}</button>`;
      const aksi=x=>{
        if(!head) return '<span class="v4-final-badge">⏳ Menunggu</span>';
        if(x.jenis==='JURNAL') return btn('btn-success','Setujui','approveJournal(this.dataset.key)',x.key)+btn('btn-danger','Tolak','rejectJournal(this.dataset.key)',x.key);
        if(x.jenis==='PULANG') return btn('btn-success','Setujui','approveEarlyLeave(this.dataset.key)',x.key)+btn('btn-danger','Tolak','rejectEarlyLeave(this.dataset.key)',x.key);
        return btn('btn-success','Setujui',"v4ProcessApproval(this.dataset.key,'APPROVED')",x.key)+btn('btn-danger','Tolak',"v4ProcessApproval(this.dataset.key,'REJECTED')",x.key);
      };
      let html=items.length?items.map(x=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">${x.ikon} ${escapeHtml(x.judul)}</div><div class="v4-task-meta">${escapeHtml(x.meta)}</div>${x.isi?`<div class="text-strong" style="font-size:13px;margin-top:4px;white-space:pre-wrap;">${escapeHtml(x.isi)}</div>`:''}</div><div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">${aksi(x)}</div></div>`).join(''):'<div class="text-muted border-muted" style="padding:16px;text-align:center;background:#f9fafb;border-radius:8px;">✅ Tidak ada permintaan yang menunggu persetujuan.</div>';
      const riwayat=(V4.approvals||[]).filter(x=>x.status!=='PENDING').slice().reverse().slice(0,10);
      if(riwayat.length) html+=`<h4 style="font-weight:700;margin:16px 0 8px;">🕘 Riwayat Koreksi Raport (10 terakhir)</h4>`+riwayat.map(x=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">↩️ ${escapeHtml(x.title||x.type||'Koreksi raport')}</div><div class="v4-task-meta">Pengaju: ${escapeHtml(x.requestedBy||'-')} · ${x.createdAt?escapeHtml(new Date(x.createdAt).toLocaleString('id-ID')):''}${x.reason?' · '+escapeHtml(x.reason):''}</div></div><span class="v4-final-badge">${escapeHtml(x.status)}</span></div>`).join('');
      el.innerHTML=html;
    }
    function v4ProcessApproval(key,status){
      if(!v4CanHead())return toast('Tidak berwenang!',true);
      const x=V4.approvals.find(a=>a.key===key); if(!x)return;
      const reason=status==='REJECTED'?prompt('Alasan penolakan/perbaikan:')||'Tanpa catatan':'';
      const approvedAt=new Date().toISOString();
      db.ref('approval_requests_v4/'+key).update({status,approvedBy:currentUser.name,approvedAt,reason}).then(()=>{
        const statusLama=x.status;
        // FIX: perbarui salinan lokal & render halaman SEKARANG JUGA, tidak menunggu v4LoadCore()
        // (~15 query) selesai -- kartu langsung pindah dari daftar menunggu ke riwayat.
        x.status=status; x.approvedBy=currentUser.name; x.approvedAt=approvedAt; x.reason=reason;
        v4RenderApprovals();
        // FIX: notifikasi & audit dibungkus terpisah. Dulu kalau salah satunya melempar error,
        // .catch() di bawah menampilkan "Gagal menyimpan" padahal status SUDAH tersimpan, dan
        // v4LoadCore() (yang menyegarkan halaman) di baris berikutnya TIDAK PERNAH jalan.
        try{
          v4Notify(status==='APPROVED'?'Approval disetujui':'Approval ditolak',`${x.title||x.type}: ${status}.`,'SUCCESS',x.requestedByKey,x.type,key);
          v4Audit('APPROVAL_'+status,x.type,key,{status:statusLama},{status});
        }catch(e){ console.warn('[SI MAMBA] Notifikasi/audit approval gagal (status sudah tersimpan):',e); }
        toast(status==='APPROVED'?'✅ Disetujui':'↩️ Ditolak');
        v4LoadCore();
      }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }
    function v4RefreshTasks(){
      const tasks=[]; const today=v4Date();
      const journals=(allJournals||[]).filter(x=>x.tanggal===today&&(x.guruKey?x.guruKey===currentUser?.key:x.guru===currentUser?.name)&&(!x.status||x.status==='DRAFT'));
      journals.forEach(x=>tasks.push({title:'Jurnal belum selesai',meta:`${x.kelas||'-'} · ${x.mataPelajaran||x.subject||'-'}`,page:'journal',type:'ACTION'}));
      V4.approvals.filter(x=>x.status==='PENDING'&&v4CanHead()).forEach(x=>tasks.push({title:`Approval ${x.type}`,meta:x.title||'Menunggu tindakan',page:'approval-v4',type:'APPROVAL'}));
      if(v4CanHead()){ (allJournals||[]).filter(j=>j.status==='pending').forEach(j=>tasks.push({title:'Approval jurnal susulan',meta:`${j.guru||'-'} · ${j.kelas||'-'} · ${j.tanggal||''}`,page:'approval-v4',type:'APPROVAL'})); (allEarlyLeaveRequests||[]).filter(r=>r.status==='pending').forEach(r=>tasks.push({title:'Approval pulang duluan',meta:`${r.guru||'-'} · ${r.tanggal||''}`,page:'approval-v4',type:'APPROVAL'})); }
      V4.tasks=tasks;const summary=document.getElementById('v4TaskSummary');if(summary)summary.innerHTML=`<div class="v4-card"><div class="v4-muted">Perlu tindakan</div><div class="v4-kpi">${tasks.length}</div></div><div class="v4-card"><div class="v4-muted">Hari ini</div><div class="v4-kpi">${tasks.filter(x=>x.meta?.includes(today)).length}</div></div>`;const list=document.getElementById('v4TaskList');if(list)list.innerHTML=tasks.map(t=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">${t.type==='APPROVAL'?'👑':'📝'} ${v4Safe(t.title)}</div><div class="v4-task-meta">${v4Safe(t.meta)}</div></div><button class="btn btn-primary" style="padding:6px 10px;font-size:11px;min-height:36px;" onclick="navigateTo('${t.page}')">Buka</button></div>`).join('')||'<p class="v4-muted">🎉 Tidak ada tugas mendesak.</p>';
    }

    // -------- Raport --------
    function v4PopulateReport(){const c=document.getElementById('v4ReportClass'),s=document.getElementById('v4ReportStudent');if(!c||!s)return;const scope=siswaScopeKelas();const classes=[...new Set((allSiswa||[]).map(x=>x.kelas).filter(k=>k&&scope.includes(k)))];c.innerHTML=classes.map(x=>`<option>${v4Safe(x)}</option>`).join('');const cls=c.value;s.innerHTML=(allSiswa||[]).filter(x=>x.kelas===cls).map(x=>`<option value="${v4Safe(x.key)}">${v4Safe(x.name)}</option>`).join('');v4RenderReportPreview();}
    // Ringkasan absensi Sholat Dhuha/Dzuhur seorang siswa untuk tahun ajaran berjalan --
    // dipakai di preview raport & disimpan ke snapshot saat raport difinalisasi.
    function v4HitungSholatSiswa(studentKey) {
      const dluhaTypes = v4CariJenisKegiatanSholat('Dluha').map(t => t.key);
      const dzuhurTypes = v4CariJenisKegiatanSholat('Dzuhur').map(t => t.key);
      const recs = (V4.activityAttendance || []).filter(r => r.studentId === studentKey && r.tahunAjaran === currentTahunAjaran);
      const dluhaRecs = recs.filter(r => dluhaTypes.includes(r.activityTypeId));
      const dzuhurRecs = recs.filter(r => dzuhurTypes.includes(r.activityTypeId));
      return {
        dluhaHadir: dluhaRecs.filter(r => r.status === 'Hadir').length, dluhaTotal: dluhaRecs.length,
        dzuhurHadir: dzuhurRecs.filter(r => r.status === 'Hadir').length, dzuhurTotal: dzuhurRecs.length,
        records: recs
      };
    }
    // Ringkasan progres SKU Pramuka seorang siswa -- dipakai di preview raport & snapshot
    // finalisasi. Pakai v4PramukaProgress() yang sama dengan yang dipakai di halaman Pramuka,
    // supaya angka yang tampil di raport selalu konsisten dengan yang pembina isi di sana.
    function v4HitungPramukaSiswa(studentKey, kelas) {
      const tingkat = pramukaTingkatForKelas(kelas);
      const prog = v4PramukaProgress(studentKey, tingkat);
      return { tingkat, tingkatLabel: PRAMUKA_SKU[tingkat].label, done: prog.done, totalItems: prog.totalItems, pct: prog.pct };
    }
    // Ringkasan kehadiran Ekskul (di luar Pramuka) seorang siswa untuk tahun ajaran berjalan --
    // dikelompokkan per nama ekskul, karena satu siswa bisa ikut lebih dari satu ekskul sekaligus
    // (mis. Drumband & Silat). Sumbernya V4.ekskulAttendance, yang sebelumnya ditulis oleh
    // v4SaveEkskulAttendance tapi tidak pernah dimuat balik ke aplikasi -- sekarang dimuat di
    // v4LoadCore() supaya bisa dipakai di sini.
    function v4HitungEkskulSiswa(studentKey) {
      const recs = (V4.ekskulAttendance || []).filter(r => r.studentId === studentKey && r.tahunAjaran === currentTahunAjaran);
      const grouped = {};
      recs.forEach(r => {
        if (!grouped[r.ekskulName]) grouped[r.ekskulName] = { nama: r.ekskulName, hadir: 0, total: 0 };
        grouped[r.ekskulName].total += 1;
        if (r.status === 'Hadir') grouped[r.ekskulName].hadir += 1;
      });
      return Object.values(grouped);
    }
    function v4RenderReportPreview(){const c=document.getElementById('v4ReportClass'),s=document.getElementById('v4ReportStudent'),el=document.getElementById('v4ReportPreview');if(!c||!s||!el)return;const st=(allSiswa||[]).find(x=>x.key===s.value);if(!st){el.innerHTML='<p class="v4-muted">Pilih siswa.</p>';return;}
      // FIX: filter nilai sebelumnya cek field x.siswa/x.studentId/x.nama/x.name -- field itu TIDAK
      // PERNAH ada di record 'grades' (skema aslinya: siswaKey, kelas, subject, semester, data:{h1,h2,
      // h3,mid,pas} -- lihat saveGrades()/renderRekapPerSiswa()). Akibatnya filter ini selalu kosong
      // dan Nilai di preview raport selalu tampil "Belum ada nilai." walau siswa sudah punya nilai.
      // Field skor per baris juga sebelumnya baca g.nilai/g.score (tidak ada) -- diganti calculateRapor(g.data)
      // seperti yang dipakai di Rekap Nilai. Kolom Status dihapus krn record grades tidak punya field
      // status per mapel (status Draft/Final cuma ada di level laporan lewat report_cards_v4, bukan per nilai).
      const grades=(allGrades||[]).filter(x=>x.siswaKey===st.key&&(!x.semester||x.semester===currentSemesterAktif)&&sesuaiTahunAjaranTermasukDataLama(x));const att=(allAttendance||[]).filter(x=>x.kelas===st.kelas&&sesuaiTahunAjaranTermasukDataLama(x));const t=(V4.tahfidz||[]).filter(x=>x.studentId===st.key);const sholat=v4HitungSholatSiswa(st.key);const pramuka=v4HitungPramukaSiswa(st.key,st.kelas);const ekskulList=v4HitungEkskulSiswa(st.key);const ekskulHtml=ekskulList.length?ekskulList.map(x=>`<p class="v4-muted">${v4Safe(x.nama)}: ${x.hadir}/${x.total} hadir${x.total?` (${Math.round(x.hadir/x.total*100)}%)`:''}</p>`).join(''):'<p class="v4-muted">Belum ada catatan kehadiran ekskul.</p>';el.innerHTML=`${typeof generateKopSuratHTML==='function'?generateKopSuratHTML():''}<div class="header">RAPORT PESERTA DIDIK</div><div class="sub-header">${v4Safe(st.name)} · ${v4Safe(st.kelas)}</div><h4 style="margin:10px 0 6px;">Nilai</h4><div class="v4-table-wrap"><table><thead><tr><th>Mapel</th><th>Nilai</th></tr></thead><tbody>${grades.slice(0,30).map(g=>`<tr><td>${v4Safe(g.subject||'-')}</td><td>${v4Safe(g.data?calculateRapor(g.data):'-')}</td></tr>`).join('')||'<tr><td colspan="2">Belum ada nilai.</td></tr>'}</tbody></table></div><h4 style="margin:12px 0 6px;">Kehadiran</h4><p class="v4-muted">Data kehadiran kelas: ${att.length} catatan.</p><h4 style="margin:12px 0 6px;">Tahfidz</h4><p class="v4-muted">${t.length} catatan setoran/murojaah.</p><h4 style="margin:12px 0 6px;">☀️🕌 Sholat Dhuha &amp; Dzuhur</h4><p class="v4-muted">Dhuha: ${sholat.dluhaHadir}/${sholat.dluhaTotal} hadir${sholat.dluhaTotal?` (${Math.round(sholat.dluhaHadir/sholat.dluhaTotal*100)}%)`:''} · Dzuhur: ${sholat.dzuhurHadir}/${sholat.dzuhurTotal} hadir${sholat.dzuhurTotal?` (${Math.round(sholat.dzuhurHadir/sholat.dzuhurTotal*100)}%)`:''}</p><h4 style="margin:12px 0 6px;">🏕️ Pramuka (${v4Safe(pramuka.tingkatLabel)})</h4><p class="v4-muted">SKU tercapai: ${pramuka.done}/${pramuka.totalItems} poin (${pramuka.pct}%)</p><h4 style="margin:12px 0 6px;">🎯 Ekstrakurikuler Lain</h4>${ekskulHtml}${v4RaporSikapHtml(st.key)}<div style=\"margin-top:24px;text-align:right;padding-right:20px;\"><p>Mengetahui,<br>Kepala ${v4Safe(MADRASAH.nama)}</p>${MADRASAH.ttdKepalaBase64?`<img src=\"${MADRASAH.ttdKepalaBase64}\" alt=\"Tanda tangan\" style=\"max-height:45px;display:block;margin:6px 0 6px auto;\">`:'<br><br><br>'}<p style=\"text-decoration:underline;\">${v4Safe(MADRASAH.kepala_sekolah)}</p><p>NIP. ${v4Safe(MADRASAH.nip_kepala_sekolah)}</p></div>`;}
    // Bagian "Sikap & Kedisiplinan" di Raport -- ringkasan poin + predikat otomatis, dipanggil
    // dari v4RenderReportPreview(). Predikat sekadar panduan cepat wali kelas, bukan nilai baku.
    function v4RaporSikapHtml(siswaKey) {
      const items = (allKedisiplinan||[]).filter(d => d.siswaKey === siswaKey);
      const totalPelanggaran = items.filter(d => d.jenis === 'pelanggaran').reduce((s,d)=>s+(d.poin||0),0);
      const totalPrestasi = items.filter(d => d.jenis === 'prestasi').reduce((s,d)=>s+(d.poin||0),0);
      const net = totalPrestasi - totalPelanggaran;
      const predikat = net >= 0 ? 'Baik' : (net >= -20 ? 'Cukup' : 'Perlu Perhatian Khusus');
      const warna = net >= 0 ? '#059669' : (net >= -20 ? '#d97706' : '#dc2626');
      const rincian = items.length ? items.sort((a,b)=>COLLATOR_ID.compare((b.tanggal||''), a.tanggal||'')).slice(0,10).map(d => `<p class="v4-muted">${d.jenis==='prestasi'?'🌟':'⚠️'} ${v4Safe(d.kategori||'-')} (${d.poin||0} poin) — ${v4Safe(d.tanggal||'-')}</p>`).join('') : '<p class="v4-muted">Belum ada catatan sikap.</p>';
      return `<h4 style="margin:12px 0 6px;">🌟 Sikap &amp; Kedisiplinan</h4><p>Predikat: <strong style="color:${warna};">${predikat}</strong> (Poin pelanggaran: ${totalPelanggaran}, Poin prestasi: ${totalPrestasi})</p>${rincian}`;
    }
    function v4FinalizeReport(){const s=document.getElementById('v4ReportStudent');const st=(allSiswa||[]).find(x=>x.key===s?.value);if(!st)return toast('Pilih siswa!',true);
      // Wali Kelas hanya boleh finalisasi raport siswa DI KELAS YANG DIA AMPU -- sebelumnya
      // cek cuma "apakah dia wali kelas di kelas mana pun" (isWaliKelasAssigned()), sehingga
      // wali kelas 1A misalnya bisa mengunci raport siswa 6B kalau tahu cara memanggil fungsi
      // ini langsung. Sekarang harus cocok persis dengan kelas siswa yang dipilih.
      if(!(v4IsAdmin()||v4IsHead()||(isWaliKelasAssigned()&&currentUser.waliKelasOf===st.kelas)))return toast('Hanya Wali Kelas dari kelas siswa ini/Admin/Kepala!',true);
      const ref=db.ref('report_cards_v4').push();const snapshot={studentId:st.key,studentName:st.name,kelas:st.kelas,finalizedBy:currentUser.name,finalizedAt:new Date().toISOString(),status:'LOCKED',tahunAjaran:currentTahunAjaran,semester:currentSemesterAktif,source:{grades:(allGrades||[]).filter(g=>g.kelas===st.kelas),attendance:(allAttendance||[]).filter(a=>a.kelas===st.kelas),tahfidz:(V4.tahfidz||[]).filter(t=>t.studentId===st.key),sholat:v4HitungSholatSiswa(st.key),pramuka:v4HitungPramukaSiswa(st.key,st.kelas),ekskul:v4HitungEkskulSiswa(st.key)}};ref.set(snapshot).then(()=>{v4Audit('FINALIZE_REPORT','REPORT',ref.key,null,snapshot);v4Notify('Raport difinalisasi',`Raport ${st.name} telah dikunci.`,'SUCCESS',currentUser.key,'REPORT',ref.key);toast('🔒 Raport difinalisasi');v4RenderReportPreview();});}
    function v4RequestReportCorrection(){const s=document.getElementById('v4ReportStudent');const st=(allSiswa||[]).find(x=>x.key===s?.value);if(!st)return toast('Pilih siswa!',true);const reason=prompt('Bagian raport yang perlu dikoreksi:');if(!reason)return;db.ref('approval_requests_v4').push().set({type:'CORRECTION',title:`Koreksi raport ${st.name}`,requestedBy:currentUser.name,requestedByKey:currentUser.key||currentUser.name,status:'PENDING',reason,createdAt:new Date().toISOString(),tahunAjaran:currentTahunAjaran}).then(()=>{v4Notify('Pengajuan koreksi raport','Pengajuan koreksi telah dikirim.','ACTION',null,'REPORT_CORRECTION','');toast('📤 Pengajuan koreksi dikirim');v4LoadCore();}).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });}
    function v4PrintReport(){const el=document.getElementById('v4ReportPreview');if(!el)return;const w=window.open('','_blank','width=900,height=700');if(!w)return toast('Popup diblokir browser.',true);
      // FIX: jendela popup kosong (window.open('', ...)) berbasis "about:blank", BUKAN alamat
      // halaman aplikasi. Akibatnya path relatif di dalam el.innerHTML (mis. logo kop surat
      // <img src="logo/logo-lembaga.png">) gagal dimuat di jendela cetak ini walau tampil normal
      // di preview halaman utama. Tag <base href> di bawah membuat SEMUA path relatif di jendela
      // cetak ini di-resolve relatif terhadap lokasi halaman utama, sehingga logo (dan aset
      // relatif lain) ikut muncul saat dicetak.
      // FIX: sebelumnya ikut menempelkan blok "Aturan Honor Guru Pengganti" (#aturan-honor-pengganti-v4)
      w.document.write(`<html><head><base href="${document.baseURI}"><title>Raport SI MAMBA</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:7px}th{background:#eee}@media print{button{display:none}}</style></head><body>${el.innerHTML}</body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300);}

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
    function v4InvalidateLoads(){ v4CoreSeq++; v4NotifSeq++; v4ApprSeq++; }
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
    function v4RenderAllCore(){ v4RenderActivities();v4RenderTahfidz();v4RenderEkskul();v4RenderPramuka();v4RenderHonorConfig();v4PopulateReport();v4RefreshTasks(); }
    function v4RestoreCoreFromCache(seq){
      const key = v4CacheKey();
      if (!window.SIMambaOfflineDB || !key) return Promise.resolve();
      v4NotifSeq++; v4ApprSeq++; // load online yang masih menggantung tidak boleh menimpa hasil cache
      return SIMambaOfflineDB.getCache(key).then(c => {
        if (seq !== v4CoreSeq) return; // sudah ada v4LoadCore() yang lebih baru
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
      fbTimeout(db.ref('activity_attendance_v4').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value').then(s=>{if(seq!==v4CoreSeq)return;const arr=[];s.forEach(c=>{const x=c.val()||{};x.key=c.key;arr.push(x)});V4.activityAttendance=arr;}), 7000, 'activity_attendance_v4'),
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
    ]).then(()=>{if(seq!==v4CoreSeq)return;v4CacheCore();v4RenderAllCore();}).catch(err=>{console.error('[SI MAMBA] v4LoadCore gagal total (seharusnya jarang terjadi karena tiap query sudah dibungkus fbTimeout):',err);});}

    // Hook navigation for new pages without changing legacy functions.
    const v4OriginalNavigate=window.navigateTo;
    window.navigateTo=function(page){
      v4OriginalNavigate(page);
      const titleMap={'profile-v4':'Profil Saya','activities-v4':'Amalan & Kegiatan','tahfidz-v4':'Tahfidz','ekskul-v4':'Ekstrakurikuler','pramuka-v4':'Pramuka (SKU)','approval-v4':'Approval','notifications-v4':'Notifikasi','tasks-v4':'Task Center','raport-v4':'Raport'};
      if(titleMap[page]) document.getElementById('pageTitle').innerHTML=titleMap[page];
      if(page==='profile-v4') v4ApplyMode();
      if(page==='activities-v4') v4RenderActivities();
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
    (function simambaLazyExportWrappers() {
      var defs = [
        ['exportRekapNilaiPDF', 'pdf', 'PDF'], ['exportRekapNilaiExcel', 'xlsx', 'Excel'],
        ['downloadHonorPDF', 'pdf', 'PDF'], ['downloadSuratPDF', 'pdf', 'PDF'],
        ['exportJadwalPDF', 'pdf', 'PDF'], ['downloadReportPDF', 'pdf', 'PDF']
      ];
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
    })();

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
