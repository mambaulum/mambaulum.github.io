/* ============================================================
   SI MAMBA - js/peran-ganda.js  (v4)
   PERAN GANDA: Kepala Madrasah yang juga mengajar bisa beralih Guru <-> Kepala TANPA logout.

   Cara kerja
   - Penanda ada di data guru: guru/<key>/kepalaMerangkap = true. Hanya SATU guru yang boleh bertanda ini.
     Admin mengaturnya lewat tombol "Kepala Merangkap Guru" di halaman Manajemen Pengguna.
     Pergantian kepala: ganti PIN & Kunci Kepala seperti biasa, LALU ubah penanda di panel ini
     (atau pilih "Tidak ada"). Aplikasi tidak bisa memeriksa kecocokan penanda dengan pemegang PIN Kepala,
     jadi kedua langkah itu harus dilakukan bersamaan (ada banner peringatan di panel).
     Kode TIDAK menyebut nama siapa pun, jadi tidak perlu diubah saat kepala diganti.
   - Guru bertanda -> muncul tombol "Beralih ke Kepala" -> wajib PIN Kepala + Kunci Kepala (kredKepsekSiap).
     Penanda saja TIDAK memberi wewenang kepala; Rules tetap meminta sesi_kepsek.
   - Kepala -> tombol "Beralih ke Guru" memakai identitas guru bertanda (key, kelas, wali kelas asli). Bila perangkat
     ini belum pernah menyimpan bukti login guru itu, diminta PIN guru satu kali.
   - Peran TIDAK PERNAH diterapkan tanpa sesi: kredKepsekSiap/kredGuruSiap wajib ada dan berhasil, dan sesi yang
     disimpan diperiksa ulang (saveSession milik app.js menelan galatnya sendiri, jadi hasilnya dibaca balik).
   - Setelah itu halaman dimuat ulang; pemulihan sesi bawaan app.js membangun ulang seluruh tampilan sesuai peran baru.
   - TIDAK memanggil logout()/kredBersihkanSesi(): sesi_kepsek dan sesi_guru boleh hidup berdampingan di uid yang sama.

   Rate-limit PIN: modal PIN Kepala dan PIN guru memakai SATU pencacah dengan form login Admin/Kepsek
   (adminLoginLockState/CatatGagal/ResetGagal). Pencacah hanya di-reset oleh PIN Kepala yang benar, bukan oleh
   PIN guru yang benar (supaya PIN guru yang diketahui tidak bisa dipakai menghapus hitungan gagal PIN Kepala).

   PERUBAHAN v3
   - terapkan(): bila gagal, KEDUA storage (sessionStorage ADMIN_SESI_KEY dan localStorage 'sim_session') dikembalikan
     persis ke keadaan sebelum percobaan (snapshot), jadi tidak ada sisa sesi peran baru yang bisa terpulihkan.
   - Probe kontrak saat dimuat (dan sebelum tiap peralihan): memeriksa hashPin, isPrivilegedSession, kunci & bentuk sesi,
     format KEPSEK_PIN_HASH. Galat kontrak ditampilkan spesifik, bukan "PIN salah"/"Sesi gagal" generik.
     Jalankan window.peranGandaUjiKontrak() di konsol untuk laporan lengkap.
   - pesanKunci/galatAwal/catat/reset-gagal dibungkus try/catch (gagal-tertutup).
   - bangunUserGuru: guard KELAS_LIST kosong dan salinan array (tidak memutasi allGuru).
   - keGuru membedakan "belum punya kredensial" (minta PIN) dari "koneksi lambat/terputus" (tidak minta PIN).
   - keKepala/keGuru menahan ketukan ganda selama pemeriksaan (flag memeriksa); panel Admin bisa ditutup dengan Escape.
   - A11y modal: aria-labelledby/describedby, jebakan fokus (Tab), fokus dikembalikan saat ditutup;
     appTampil() memakai getClientRects() sehingga ikut mendeteksi induk yang disembunyikan.

   KETERGANTUNGAN (app.js/kredensial.js): currentUser, ROLES, KELAS_LIST, KEPSEK_PIN_HASH, KEPSEK_USER_KEY, hashPin,
   adminLoginLockState, adminLoginCatatGagal, adminLoginResetGagal, saveSession, isPrivilegedSession, ADMIN_SESI_KEY,
   HALAMAN_KEY, (localStorage 'sim_session'), allGuru, db, toast, escapeHtml, isAdmin, addLog, kredKepsekSiap,
   kredGuruSiap, kredVerifikasi, kredSetelahLogin, kredAdminSiap. Dimuat SESUDAH js/app.js dan js/kredensial.js.
============================================================ */
(function () {
  'use strict';
  var VERSI = 4;
  var FLAG_PESAN = 'sim_peran_ganda_pesan';
  var BATAS_SIAP_MS = 15000;   // batas tunggu kredKepsekSiap/kredGuruSiap sebelum dianggap gagal
  var memeriksa = false;       // cegah ketukan/proses ganda selama pemeriksaan sesi atau PIN berjalan
  var modalAktif = null;       // modal PIN yang sedang terbuka (hanya satu pada satu waktu)

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function info(t, err, ms) { try { toast(t, !!err, ms); } catch (e) { console.log(t); } }
  function fn(n) { try { return (typeof window[n] === 'function') ? window[n] : null; } catch (e) { return null; } }
  function pesanGalat(e) { return (e && e.message) || (e == null ? '' : String(e)); }

  // ---------- Util storage ----------
  // Uji tulis-baca-hapus pada satu storage. false bila penuh, diblokir, atau aksesnya melempar galat.
  function simpanTes(st) {
    try {
      var k = '__pg_tes';
      st.setItem(k, '1');
      var ok = st.getItem(k) === '1';
      st.removeItem(k);
      return ok;
    } catch (e) { return false; }
  }
  function stOk(nama) { try { return simpanTes(window[nama]); } catch (e) { return false; } }
  // Tempat saveSession app.js menyimpan sesi untuk `user` (menurut isPrivilegedSession).
  function targetStorage(user) {
    return isPrivilegedSession(user)
      ? { nama: 'sessionStorage', st: sessionStorage, kunci: ADMIN_SESI_KEY }
      : { nama: 'localStorage', st: localStorage, kunci: 'sim_session' };
  }
  // Foto kedua storage sebelum percobaan; undefined = storage itu tidak bisa dibaca (jangan disentuh saat pemulihan).
  function ambilSnapshot() {
    var s = { admin: undefined, lokal: undefined };
    try { s.admin = sessionStorage.getItem(ADMIN_SESI_KEY); } catch (e) { }
    try { s.lokal = localStorage.getItem('sim_session'); } catch (e) { }
    return s;
  }
  function pulihkanSnapshot(s) {
    try {
      if (s.admin === null) sessionStorage.removeItem(ADMIN_SESI_KEY);
      else if (s.admin !== undefined) sessionStorage.setItem(ADMIN_SESI_KEY, s.admin);
    } catch (e) { }
    try {
      if (s.lokal === null) localStorage.removeItem('sim_session');
      else if (s.lokal !== undefined) localStorage.setItem('sim_session', s.lokal);
    } catch (e) { }
  }
  // Mengembalikan '' bila sesi `user` benar-benar tersimpan; selain itu, teks alasan yang spesifik.
  function diagnosaSesi(user) {
    var t;
    try { t = targetStorage(user); } catch (e) { return 'isPrivilegedSession() melempar galat: ' + pesanGalat(e) + '.'; }
    if (!t.kunci) return 'kunci penyimpanan sesi kosong (ADMIN_SESI_KEY tidak terdefinisi di app.js).';
    if (!simpanTes(t.st)) return t.nama + ' tidak bisa ditulis (penuh, atau diblokir browser/mode privat).';
    var raw;
    try { raw = t.st.getItem(t.kunci); } catch (e) { return t.nama + ' tidak bisa dibaca: ' + pesanGalat(e) + '.'; }
    if (!raw) return 'saveSession() tidak menulis apa pun ke ' + t.nama + '["' + t.kunci + '"] (app.js mungkin menyimpan di kunci/tempat lain, atau menelan galat).';
    var p;
    try { p = JSON.parse(raw); } catch (e) { return 'isi ' + t.nama + '["' + t.kunci + '"] bukan JSON yang valid.'; }
    if (!p || typeof p !== 'object' || !p.user || typeof p.user !== 'object') {
      return 'isi sesi tersimpan tidak punya objek "user" (field terbaca: ' + (p && typeof p === 'object' ? Object.keys(p).join(', ') || 'kosong' : typeof p) + '). Modul ini mengharapkan {user:{key,role}}.';
    }
    if (p.user.key !== user.key) return 'user.key tersimpan ("' + p.user.key + '") tidak sama dengan yang diterapkan ("' + user.key + '").';
    if (p.user.role !== user.role) return 'user.role tersimpan ("' + p.user.role + '") tidak sama dengan yang diterapkan ("' + user.role + '").';
    return '';
  }

  // ---------- Probe kontrak dengan app.js / kredensial.js ----------
  // cakupan: 'kepala' | 'guru' | 'semua'. Mengembalikan {galat:[teks], peringatan:[teks]}.
  // galat = pasti merusak peralihan; peringatan = asumsi yang tampak berbeda, perlu dicek manusia. Tanpa efek samping
  // selain uji tulis-hapus satu kunci sementara pada kedua storage.
  function probeKontrak(cakupan) {
    var G = [], P = [];
    function g(c, t) { G.push({ c: c, t: t }); }
    function w(c, t) { P.push({ c: c, t: t }); }
    var rolesOk = false;

    try {
      if (typeof ROLES !== 'object' || !ROLES) g('umum', 'ROLES tidak terdefinisi atau bukan objek (app.js).');
      else {
        rolesOk = true;
        ['ADMIN', 'HEADMASTER', 'TEACHER', 'WALI_KELAS'].forEach(function (n) {
          if (typeof ROLES[n] !== 'string' || !ROLES[n]) { rolesOk = false; g('umum', 'ROLES.' + n + ' tidak ada atau bukan teks.'); }
        });
      }
    } catch (e) { g('umum', 'ROLES tidak bisa dibaca: ' + pesanGalat(e)); }

    try {
      if (!Array.isArray(KELAS_LIST) || !KELAS_LIST.length) w('umum', 'KELAS_LIST kosong atau bukan array; kelas peran akan kosong.');
    } catch (e) { w('umum', 'KELAS_LIST tidak terdefinisi.'); }

    if (typeof ADMIN_SESI_KEY !== 'string' || !ADMIN_SESI_KEY) g('umum', 'ADMIN_SESI_KEY tidak terdefinisi atau bukan teks (app.js).');
    if (typeof HALAMAN_KEY !== 'string' || !HALAMAN_KEY) w('umum', 'HALAMAN_KEY tidak terdefinisi; halaman terakhir tidak akan direset.');
    if (typeof saveSession !== 'function') g('umum', 'saveSession() tidak ada (app.js).');

    if (!stOk('localStorage')) g('umum', 'localStorage tidak bisa ditulis (penuh, atau diblokir browser/mode privat).');
    if (!stOk('sessionStorage')) g('umum', 'sessionStorage tidak bisa ditulis (penuh, atau diblokir browser).');

    // Bentuk sesi yang sudah ada di perangkat ini (hanya dibandingkan bila ada).
    [['localStorage', 'sim_session'], ['sessionStorage', (typeof ADMIN_SESI_KEY === 'string') ? ADMIN_SESI_KEY : '']].forEach(function (x) {
      if (!x[1]) return;
      try {
        var raw = window[x[0]].getItem(x[1]);
        if (!raw) return;
        var p = JSON.parse(raw);
        if (!p || typeof p !== 'object' || !p.user || typeof p.user.key === 'undefined' || typeof p.user.role === 'undefined') {
          w('umum', 'Sesi yang ada di ' + x[0] + '["' + x[1] + '"] tidak berbentuk {user:{key,role}}; pembacaan-balik peralihan akan selalu gagal.');
        }
      } catch (e) { w('umum', 'Sesi yang ada di ' + x[0] + '["' + x[1] + '"] tidak bisa di-parse sebagai JSON.'); }
    });

    if (typeof isPrivilegedSession !== 'function') g('umum', 'isPrivilegedSession() tidak ada (app.js).');
    else if (rolesOk) {
      try {
        if (!isPrivilegedSession({ name: 'probe', role: ROLES.HEADMASTER, baseRole: ROLES.TEACHER, key: (typeof KEPSEK_USER_KEY === 'string' ? KEPSEK_USER_KEY : '__probe') })) {
          w('kepala', 'isPrivilegedSession(Kepala) bernilai false: sesi Kepala akan dicari di localStorage, bukan sessionStorage; asumsi modul ini tidak berlaku.');
        }
        if (isPrivilegedSession({ name: 'probe', role: ROLES.TEACHER, baseRole: ROLES.TEACHER, key: '__probe' })) {
          w('guru', 'isPrivilegedSession(Guru) bernilai true: sesi guru akan dicari di sessionStorage, bukan localStorage; asumsi modul ini tidak berlaku.');
        }
      } catch (e) { g('umum', 'isPrivilegedSession() melempar galat saat diuji: ' + pesanGalat(e)); }
    }

    // --- khusus Kepala ---
    if (typeof KEPSEK_USER_KEY !== 'string' || !KEPSEK_USER_KEY) g('kepala', 'KEPSEK_USER_KEY tidak terdefinisi atau bukan teks.');
    if (typeof KEPSEK_PIN_HASH !== 'string' || !/^[0-9a-f]{64}$/i.test(KEPSEK_PIN_HASH)) {
      g('kepala', 'KEPSEK_PIN_HASH bukan SHA-256 hex 64 karakter (terbaca: ' + (typeof KEPSEK_PIN_HASH === 'string' ? 'teks sepanjang ' + KEPSEK_PIN_HASH.length : typeof KEPSEK_PIN_HASH) + ').');
    }
    if (typeof hashPin !== 'function') g('kepala', 'hashPin() tidak ada (app.js/kredensial.js).');
    else {
      try {
        var h = hashPin('0');
        if (h && typeof h.then === 'function') {
          w('kepala', 'hashPin() mengembalikan Promise; ditangani, tetapi pastikan memang disengaja.');
          try { h.then(null, function () { }); } catch (x) { }
        } else if (typeof h !== 'string' || !/^[0-9a-f]{64}$/i.test(h)) {
          g('kepala', 'hashPin() mengembalikan ' + (typeof h === 'string' ? 'teks sepanjang ' + h.length : typeof h) + ', bukan SHA-256 hex 64 karakter, sehingga tidak akan pernah cocok dengan KEPSEK_PIN_HASH.');
        }
      } catch (e) { g('kepala', 'hashPin() melempar galat saat dipanggil: ' + pesanGalat(e)); }
    }
    if (typeof adminLoginLockState !== 'function' || typeof adminLoginCatatGagal !== 'function' || typeof adminLoginResetGagal !== 'function') {
      g('umum', 'Fungsi pengaman PIN (adminLoginLockState/CatatGagal/ResetGagal) belum lengkap.');
    }
    if (typeof kredKepsekSiap !== 'function') g('kepala', 'kredKepsekSiap() tidak ada (kredensial.js).');

    // --- khusus Guru ---
    if (typeof kredGuruSiap !== 'function') g('guru', 'kredGuruSiap() tidak ada (kredensial.js).');
    if (typeof kredVerifikasi !== 'function') w('guru', 'kredVerifikasi() tidak ada; PIN guru tidak bisa diminta bila perangkat belum punya bukti login.');

    function pilih(L) {
      return L.filter(function (x) { return x.c === 'umum' || cakupan === 'semua' || x.c === cakupan; }).map(function (x) { return x.t; });
    }
    return { galat: pilih(G), peringatan: pilih(P) };
  }
  window.peranGandaUjiKontrak = function (opsi) {
    var r = probeKontrak('semua');
    var h = { versi: VERSI, galat: r.galat, peringatan: r.peringatan, sesiAktif: '(belum login)' };
    try {
      if (currentUser) {
        if (opsi && opsi.tulis) saveSession(currentUser);   // opsional: simpan ulang sesi SAAT INI (tidak mengubah peran)
        h.sesiAktif = diagnosaSesi(currentUser) || 'OK (sesi terbaca-balik sesuai)';
      }
    } catch (e) { h.sesiAktif = 'galat: ' + pesanGalat(e); }
    try { console.log('[peran-ganda v' + VERSI + '] uji kontrak', h); } catch (e) { }
    return h;
  };

  // ---------- Data ----------
  function guruMerangkap() {
    var l = (typeof allGuru !== 'undefined' && allGuru) ? allGuru : [];
    for (var i = 0; i < l.length; i++) if (l[i] && l[i].kepalaMerangkap === true) return l[i];
    return null;
  }
  function daftarKelas() { return Array.isArray(KELAS_LIST) ? KELAS_LIST : []; }
  function bangunUserGuru(g, baseRole) {
    var semua = daftarKelas(), kelas;
    if (g.semuaKelas) kelas = semua.slice();
    else if (Array.isArray(g.kelas)) kelas = g.kelas.slice();                       // salinan: jangan memutasi allGuru
    else if (g.kelas) kelas = String(g.kelas).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    else kelas = [];
    if (!kelas.length && semua.length) kelas = [semua[0]];                            // guard: KELAS_LIST bisa kosong
    return { name: g.name, role: ROLES.TEACHER, baseRole: baseRole || ROLES.TEACHER, kelas: kelas, key: g.key, semuaKelas: !!g.semuaKelas, waliKelasOf: g.waliKelasOf || null };
  }
  function bangunUserKepala(baseRole) {
    return { name: 'Kepala Madrasah', role: ROLES.HEADMASTER, baseRole: baseRole || ROLES.TEACHER, key: KEPSEK_USER_KEY, kelas: daftarKelas().slice() };
  }

  // ---------- Rate-limit PIN (satu pencacah dengan form login Admin/Kepsek) ----------
  function pengamanSiap() {
    return typeof adminLoginLockState === 'function' && typeof adminLoginCatatGagal === 'function' && typeof adminLoginResetGagal === 'function';
  }
  // '' bila tidak terkunci. Gagal-tertutup: bila pembacaan status kunci melempar galat, hasilnya pesan galat (bukan '').
  function pesanKunci() {
    try {
      var lock = adminLoginLockState();
      if (lock && lock.kunciSampai && Date.now() < lock.kunciSampai) {
        return '🔒 Terlalu banyak percobaan PIN salah. Coba lagi dalam ' + Math.ceil((lock.kunciSampai - Date.now()) / 60000) + ' menit.';
      }
      return '';
    } catch (e) {
      return 'Pengaman percobaan PIN galat (' + pesanGalat(e) + '). Muat ulang halaman, lalu coba lagi.';
    }
  }
  // Galat yang menghalangi percobaan PIN (string), atau '' bila boleh lanjut. Gagal-tertutup bila pengaman tidak ada.
  function galatAwal() {
    if (!pengamanSiap()) return 'Pengaman percobaan PIN belum termuat. Muat ulang halaman, lalu coba lagi.';
    return pesanKunci();
  }
  function pinSalah(pesan) {
    try { adminLoginCatatGagal(); } catch (e) { return 'Pengaman percobaan PIN galat saat mencatat percobaan (' + pesanGalat(e) + '). Muat ulang halaman, lalu coba lagi.'; }
    return pesanKunci() || pesan;
  }
  function resetGagal() {
    try { adminLoginResetGagal(); } catch (e) { try { console.warn('[peran-ganda] adminLoginResetGagal gagal:', e); } catch (x) { } }
  }

  // ---------- Util async ----------
  // `jeda` (opsional): fungsi yang mengembalikan ms yang dihabiskan pengguna di kotak prompt sejak panggilan terakhir.
  // Waktu mengetik Kunci Kepala tidak boleh dihitung sebagai "jaringan lambat": bila ada, batas dipasang ulang penuh.
  function denganBatas(p, ms, pesan, jeda) {
    return new Promise(function (res, rej) {
      var t, selesai = false;
      function pasang() {
        t = setTimeout(function () {
          if (!selesai && jeda && jeda() > 0) return pasang();
          var er = new Error(pesan); er.kode = 'timeout'; rej(er);
        }, ms);
      }
      pasang();
      p.then(function (v) { selesai = true; clearTimeout(t); res(v); }, function (e) { selesai = true; clearTimeout(t); rej(e); });
    });
  }
  // 'timeout' | 'jaringan' | 'kredensial'. Hanya 'kredensial' yang berarti perangkat ini memang belum punya bukti login.
  function jenisGalat(e) {
    if (e && e.kode === 'timeout') return 'timeout';
    try { if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'jaringan'; } catch (x) { }
    var m = String((e && (e.message || e.code)) || '');
    if (/network|jaringan|offline|unavailable|failed to fetch|disconnect|koneksi/i.test(m)) return 'jaringan';
    return 'kredensial';
  }
  // Satu pemeriksaan pada satu waktu: flag `memeriksa` aktif sampai proses selesai (berhasil maupun gagal).
  function kunci(f) {
    memeriksa = true;
    return Promise.resolve().then(f).then(function (v) { memeriksa = false; return v; }, function (e) { memeriksa = false; throw e; });
  }
  // Pasang `user` sebagai currentUser supaya siap() (kredKepsekSiap/kredGuruSiap membaca currentUser) bekerja,
  // lalu panggil siap() DI DALAM rantai promise: galat sinkron maupun hasil non-promise ikut tertangani.
  // Bila gagal, currentUser dipulihkan ke `asal` langsung di handler penolakan, sebelum galat diteruskan.
  function siapkanSesi(siap, user, asal, pesanBatas) {
    currentUser = user;
    var menitPrompt = 0, asliPrompt = null;
    try {
      if (typeof window.prompt === 'function') {
        asliPrompt = window.prompt;
        window.prompt = function () {
          var t0 = Date.now();
          try { return asliPrompt.apply(window, arguments); } finally { menitPrompt += Date.now() - t0; }
        };
      }
    } catch (e) { asliPrompt = null; }
    function pulihPrompt() { try { if (asliPrompt) { window.prompt = asliPrompt; asliPrompt = null; } } catch (e) { } }
    function jeda() { var x = menitPrompt; menitPrompt = 0; return x; }
    return denganBatas(Promise.resolve().then(function () { return siap(); }), BATAS_SIAP_MS, pesanBatas, jeda)
      .then(function (v) { pulihPrompt(); return v; }, function (e) {
        pulihPrompt();
        if (currentUser === user) currentUser = asal;
        throw e;
      });
  }

  // ---------- A11y: jebakan fokus ----------
  function fokusable(root) {
    return Array.prototype.slice.call(root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter(function (el) { return el.getClientRects().length > 0; });
  }
  function jebakTab(ev, root) {
    if (ev.key !== 'Tab') return;
    var f = fokusable(root);
    if (!f.length) { ev.preventDefault(); root.focus(); return; }
    var i = f.indexOf(document.activeElement);
    if (ev.shiftKey) { if (i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); } }
    else if (i === -1 || i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
  }
  function kembalikanFokus(el) {
    try { if (el && typeof el.focus === 'function' && document.body.contains(el)) el.focus(); } catch (e) { }
  }

  // ---------- Modal PIN ----------
  // proses(pin, ctx) -> true (sukses, modal ditutup) | string (pesan galat) | Promise dari keduanya.
  // ctx.dibatalkan() bernilai true bila pengguna menekan Batal / Esc / klik di luar: proses wajib berhenti
  // dan tidak boleh menerapkan peran. mode: 'text' (keyboard huruf+angka) atau 'numeric' (default).
  function modalPin(judul, ket, proses, mode) {
    if (modalAktif) modalAktif.batal();
    var fokusAsal = document.activeElement;
    var ov = document.createElement('div');
    ov.id = 'pgOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;';
    var im = (mode === 'text') ? 'text' : 'numeric';
    ov.innerHTML = '<div id="pgDialog" role="dialog" aria-modal="true" aria-labelledby="pgJudul" aria-describedby="pgKet" tabindex="-1" style="outline:none;background:#fff;color:#111827;border-radius:14px;max-width:360px;width:100%;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.3);">' +
      '<h3 id="pgJudul" style="margin:0 0 6px;font-size:17px;">' + esc(judul) + '</h3>' +
      '<p id="pgKet" style="margin:0 0 10px;font-size:13px;color:#4b5563;">' + esc(ket) + '</p>' +
      '<input id="pgPin" type="password" inputmode="' + im + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="PIN" aria-label="PIN" aria-describedby="pgKet pgGalat" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;">' +
      '<div id="pgGalat" role="alert" style="color:#b91c1c;font-size:13px;min-height:18px;margin-top:6px;"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">' +
      '<button type="button" id="pgBatal" class="btn btn-soft">Batal</button>' +
      '<button type="button" id="pgLanjut" class="btn btn-primary">Lanjut</button></div></div>';
    document.body.appendChild(ov);
    var dlg = ov.querySelector('#pgDialog');
    var inp = ov.querySelector('#pgPin'), galatEl = ov.querySelector('#pgGalat');
    var btnLanjut = ov.querySelector('#pgLanjut'), btnBatal = ov.querySelector('#pgBatal');
    var sibuk = false, dibatalkan = false;          // per-modal, bukan variabel modul
    var modal = { batal: tutup };
    var ctx = { dibatalkan: function () { return dibatalkan; } };
    modalAktif = modal;
    function tutup() {
      dibatalkan = true;                            // proses yang masih berjalan akan melihat ini dan berhenti
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      if (modalAktif === modal) modalAktif = null;
      kembalikanFokus(fokusAsal);
    }
    function jalan() {
      if (sibuk || dibatalkan) return;
      var pin = (inp.value || '').trim();
      if (!pin) { galatEl.textContent = 'Isi PIN dulu.'; return; }
      sibuk = true; btnLanjut.disabled = true; galatEl.textContent = 'Memeriksa...';
      dlg.focus();                                  // fokus tidak hilang ke <body> saat tombol dinonaktifkan (Esc/Tab tetap bekerja)
      Promise.resolve().then(function () { return proses(pin, ctx); }).then(function (hasil) {
        sibuk = false;
        if (dibatalkan) return;
        if (hasil === true) { tutup(); return; }
        btnLanjut.disabled = false; inp.value = ''; inp.focus();
        galatEl.textContent = (typeof hasil === 'string' && hasil) || 'Gagal.';
      }, function (e) {
        sibuk = false;
        if (dibatalkan) return;
        btnLanjut.disabled = false; inp.focus();
        galatEl.textContent = pesanGalat(e) || 'Gagal.';
      });
    }
    btnBatal.addEventListener('click', tutup);       // selalu aktif, juga saat pemeriksaan berjalan
    btnLanjut.addEventListener('click', jalan);
    ov.addEventListener('click', function (ev) { if (ev.target === ov) tutup(); });
    ov.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { tutup(); return; }
      jebakTab(ev, dlg);
    });
    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') jalan(); });
    inp.focus();
  }

  // ---------- Terapkan peran baru ----------
  // Mengembalikan true bila sesi baru benar-benar tersimpan, atau string pesan galat (peran TIDAK diganti,
  // kedua storage dikembalikan ke keadaan semula).
  function terapkan(user, asal, label, logTeks) {
    var snap = ambilSnapshot();
    currentUser = user;
    try {
      saveSession(user);   // saveSession app.js menelan galatnya sendiri -> keberhasilan DIPERIKSA dengan membaca balik
      var d = diagnosaSesi(user);
      if (d) throw new Error('Sesi baru tidak tersimpan: ' + d + ' Peran tidak diganti.');
      // Sesi guru biasa memakai localStorage; sisa sesi Admin/Kepsek di sessionStorage harus hilang supaya tidak
      // memulihkan peran kepala setelah kembali ke guru. Bila tidak bisa dihapus, jangan lanjut.
      if (!isPrivilegedSession(user)) {
        sessionStorage.removeItem(ADMIN_SESI_KEY);
        if (sessionStorage.getItem(ADMIN_SESI_KEY)) throw new Error('Sisa sesi Kepala di sessionStorage tidak bisa dibersihkan. Peran tidak diganti.');
      }
    } catch (e) {
      currentUser = asal;
      pulihkanSnapshot(snap);   // bersihkan sisa di KEDUA storage: sesi lama persis seperti semula, tanpa sisa peran baru
      return pesanGalat(e) || 'Gagal menyimpan sesi. Peran tidak diganti.';
    }
    // Bagian kosmetik: gagal di sini tidak membatalkan peralihan.
    try { sessionStorage.removeItem(HALAMAN_KEY); } catch (e) { }
    try { sessionStorage.setItem(FLAG_PESAN, 'Sekarang bekerja sebagai ' + label + '.'); } catch (e) { }
    try { if (typeof addLog === 'function') addLog('ganti_peran', logTeks); } catch (e) { }
    info('Beralih ke ' + label + '...', false, 2500);
    setTimeout(function () { location.reload(); }, 250);
    return true;
  }

  // ---------- Guru -> Kepala ----------
  function keKepala() {
    if (memeriksa) return info('Sedang memeriksa, tunggu sebentar.');
    var asal = currentUser, g = guruMerangkap();
    if (!asal || !g || asal.key !== g.key) return info('Akun ini tidak ditandai sebagai kepala merangkap guru.', true);
    var siap = fn('kredKepsekSiap');
    if (!siap) return info('Modul kredensial Kepala belum termuat. Muat ulang halaman, lalu coba lagi.', true);
    var kg = probeKontrak('kepala');
    if (kg.galat.length) return info('Peralihan dibatalkan (kontrak modul tidak cocok): ' + kg.galat[0] + ' Hubungi Admin.', true, 8000);
    var galat = galatAwal();
    if (galat) return info(galat, true);
    modalPin('Beralih ke Kepala Madrasah', 'Masukkan PIN Kepala Madrasah.', function (pin, ctx) {
      return kunci(function () {
        var lagi = galatAwal();
        if (lagi) return lagi;
        return Promise.resolve().then(function () { return hashPin(pin); }).then(function (h) {
          if (ctx.dibatalkan()) return true;
          if (typeof h !== 'string' || !/^[0-9a-f]{64}$/i.test(h)) {
            // Galat konfigurasi, BUKAN PIN salah: tidak dihitung sebagai percobaan gagal.
            return 'hashPin() menghasilkan ' + (typeof h === 'string' ? 'teks sepanjang ' + h.length : typeof h) + ', bukan hash SHA-256 hex. Ini galat konfigurasi, bukan PIN salah. Hubungi Admin.';
          }
          if (h.toLowerCase() !== KEPSEK_PIN_HASH.toLowerCase()) return pinSalah('PIN Kepala salah.');
          var kepala = bangunUserKepala(asal.baseRole);
          return siapkanSesi(siap, kepala, asal, 'Kunci Kepala tidak merespons. Periksa koneksi lalu coba lagi.').then(function () {
            if (ctx.dibatalkan()) { if (currentUser === kepala) currentUser = asal; return true; }
            resetGagal();                              // reset hanya setelah PIN Kepala DAN Kunci Kepala terbukti benar
            return terapkan(kepala, asal, 'Kepala Madrasah', g.name + ' beralih ke Kepala Madrasah');
          }, function (e) { return pesanGalat(e) || 'Kunci Kepala belum benar atau belum tersimpan di perangkat ini.'; });
        }, function (e) { return 'hashPin() gagal dijalankan: ' + pesanGalat(e) + '. Hubungi Admin.'; });
      });
    }, 'text');
  }

  // ---------- Kepala -> Guru ----------
  function keGuru() {
    if (memeriksa) return info('Sedang memeriksa, tunggu sebentar.');
    var asal = currentUser, g = guruMerangkap();
    if (!asal || !g) return info('Belum ada guru yang ditandai sebagai kepala merangkap guru. Minta Admin mengaturnya.', true);
    var siap = fn('kredGuruSiap');
    if (!siap) return info('Modul kredensial Guru belum termuat. Muat ulang halaman, lalu coba lagi.', true);
    var kg = probeKontrak('guru');
    if (kg.galat.length) return info('Peralihan dibatalkan (kontrak modul tidak cocok): ' + kg.galat[0] + ' Hubungi Admin.', true, 8000);
    var user = bangunUserGuru(g, asal.baseRole);              // asal peran dipertahankan (Kepala atau Guru)
    memeriksa = true;
    // Coba dulu tanpa PIN (bukti login guru mungkin sudah tersimpan di perangkat ini).
    siapkanSesi(siap, user, asal, 'Sesi guru tidak merespons.').then(function () {
      memeriksa = false;
      var r = terapkan(user, asal, 'Guru (' + g.name + ')', g.name + ' beralih ke Guru');
      if (r !== true) info(r, true, 8000);
    }, function (e) {
      memeriksa = false;
      var j = jenisGalat(e);
      if (j === 'timeout' || j === 'jaringan') {
        // Bukan berarti kredensial hilang: jangan minta PIN, cukup minta coba lagi.
        return info('Sesi guru belum bisa diperiksa karena koneksi ' + (j === 'timeout' ? 'lambat/tidak merespons' : 'terputus') + '. Periksa koneksi lalu coba lagi.', true, 6000);
      }
      mintaPinGuru(g, user, asal, siap);
    });
  }
  // Perangkat ini belum punya bukti login guru itu -> minta PIN guru satu kali.
  function mintaPinGuru(g, user, asal, siap) {
    var verif = fn('kredVerifikasi'), sesudah = fn('kredSetelahLogin');
    if (!verif) return info('Sesi guru belum siap di perangkat ini dan kredVerifikasi() tidak tersedia. Login sekali sebagai guru lebih dulu.', true);
    var galat = galatAwal();
    if (galat) return info(galat, true);
    modalPin('PIN ' + g.name, 'Perangkat ini belum menyimpan bukti login guru. Masukkan PIN guru satu kali.', function (pin, ctx) {
      return kunci(function () {
        var lagi = galatAwal();
        if (lagi) return lagi;
        return Promise.resolve().then(function () { return verif(g, pin); }).then(function (hasil) {
          if (ctx.dibatalkan()) return true;
          if (!hasil || !hasil.ok) return pinSalah((hasil && hasil.pesan) || 'PIN salah.');
          try { if (sesudah) sesudah(g, pin, hasil); } catch (e) { }
          return new Promise(function (r) { setTimeout(r, 500); }).then(function () {
            if (ctx.dibatalkan()) return true;
            return siapkanSesi(siap, user, asal, 'Sesi guru tidak merespons. Periksa koneksi lalu coba lagi.').then(function () {
              if (ctx.dibatalkan()) { if (currentUser === user) currentUser = asal; return true; }
              return terapkan(user, asal, 'Guru (' + g.name + ')', g.name + ' beralih ke Guru');
            }, function (e) { return pesanGalat(e) || 'Sesi guru belum bisa disiapkan.'; });
          });
        }, function (e) { return 'Gagal memeriksa PIN guru: ' + (pesanGalat(e) || 'galat tidak dikenal') + '.'; });
      });
    });                                                       // PIN guru 6 digit angka -> keyboard numerik
  }

  // ---------- Tombol beralih ----------
  var stl = document.createElement('style');
  stl.textContent = '#btnPeranGanda{position:fixed;right:14px;bottom:20px;z-index:950;display:none;padding:9px 14px;border:0;border-radius:999px;background:#047857;color:#fff;font-weight:600;font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.28);cursor:pointer}' +
    '@media (max-width:768px){#btnPeranGanda{bottom:84px}}';
  var btn = document.createElement('button');
  btn.id = 'btnPeranGanda'; btn.type = 'button';
  function pasangUI() { document.head.appendChild(stl); document.body.appendChild(btn); }
  if (document.body) pasangUI(); else document.addEventListener('DOMContentLoaded', pasangUI);
  btn.addEventListener('click', function () { if (btn.dataset.aksi === 'kepala') keKepala(); else if (btn.dataset.aksi === 'guru') keGuru(); });

  // Halaman utama dianggap tampil bila appPage tidak hidden dan benar-benar punya kotak tata letak.
  // getClientRects() kosong bila elemen ATAU induknya display:none (getComputedStyle elemen saja tidak mendeteksi induk).
  function appTampil() {
    var el = $('appPage');
    if (!el || el.hidden) return false;
    try {
      if (el.getClientRects().length === 0) return false;
      var cs = window.getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    } catch (e) { return false; }
  }
  function segarkan() {
    var tampil = false, aksi = '', teks = '';
    try {
      if (currentUser && currentUser.baseRole !== ROLES.ADMIN && appTampil()) {   // baseRole Admin = impersonasi "Lihat sebagai Guru": tidak ditawari beralih
        var r = currentUser.role, g = guruMerangkap();
        if (g && r === ROLES.HEADMASTER) { tampil = true; aksi = 'guru'; teks = '🔁 Beralih ke Guru'; }
        else if (g && (r === ROLES.TEACHER || r === ROLES.WALI_KELAS) && currentUser.key === g.key) { tampil = true; aksi = 'kepala'; teks = '🔁 Beralih ke Kepala'; }
      }
    } catch (e) { }
    btn.style.display = tampil ? 'block' : 'none';
    if (tampil) { btn.dataset.aksi = aksi; btn.textContent = teks; }
  }

  // ---------- Panel Admin: pilih guru yang merangkap ----------
  function adminAktif() {
    try { return typeof isAdmin === 'function' && !!currentUser && !!isAdmin(); } catch (e) { return false; }
  }
  window.peranGandaBukaPengaturan = function () {
    if (!adminAktif()) return info('Hanya Admin!', true);
    var daftar = (allGuru || []).slice().sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'id'); });
    var sekarang = guruMerangkap();
    if ($('pgPanel')) $('pgPanel').remove();
    var fokusAsal = document.activeElement;
    var kg = probeKontrak('semua');
    var kontrakHtml = '';
    if (kg.galat.length || kg.peringatan.length) {
      kontrakHtml = '<div style="background:#fef2f2;border:1px solid #ef4444;color:#7f1d1d;border-radius:8px;padding:9px 11px;font-size:12.5px;line-height:1.45;margin:0 0 10px;">' +
        '<b>Diagnostik kontrak modul (v' + VERSI + ')</b><ul style="margin:4px 0 0 18px;padding:0;">' +
        kg.galat.map(function (t) { return '<li><b>Galat:</b> ' + esc(t) + '</li>'; }).join('') +
        kg.peringatan.map(function (t) { return '<li>Peringatan: ' + esc(t) + '</li>'; }).join('') +
        '</ul></div>';
    }
    var ov = document.createElement('div');
    ov.id = 'pgPanel';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = '<div id="pgPanelDlg" role="dialog" aria-modal="true" aria-labelledby="pgPanelJudul" tabindex="-1" style="outline:none;background:#fff;color:#111827;border-radius:14px;max-width:420px;width:100%;max-height:92vh;overflow:auto;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.3);">' +
      '<h3 id="pgPanelJudul" style="margin:0 0 6px;font-size:17px;">👑 Kepala Merangkap Guru</h3>' +
      '<p style="margin:0 0 10px;font-size:13px;color:#4b5563;">Pilih guru yang juga menjabat Kepala Madrasah. Orang ini bisa beralih Guru ↔ Kepala tanpa keluar akun. Hanya satu guru; pilih "Tidak ada" bila kepala tidak mengajar.</p>' +
      '<div style="background:#fffbeb;border:1px solid #f59e0b;color:#78350f;border-radius:8px;padding:9px 11px;font-size:12.5px;line-height:1.45;margin:0 0 10px;">' +
      '<b>⚠️ Penanda ini harus selalu cocok dengan pemegang PIN Kepala.</b><br>' +
      'Penanda hanya menentukan siapa yang ditawari tombol "Beralih ke Kepala". Penanda tidak mengganti PIN/Kunci Kepala dan tidak memberi wewenang (wewenang tetap dari PIN + Kunci Kepala). Aplikasi tidak bisa memeriksa kecocokannya.<br>' +
      '<b>Saat kepala diganti</b>, lakukan keduanya pada hari yang sama: (1) ganti PIN &amp; Kunci Kepala, (2) ubah pilihan di bawah. Bila terlewat, guru lama tetap ditawari tombol, dan kepala baru yang mengajar tidak.</div>' +
      kontrakHtml +
      '<select id="pgPilih" aria-label="Guru yang merangkap Kepala" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;"><option value="">— Tidak ada —</option>' +
      daftar.map(function (g) { return '<option value="' + esc(g.key) + '"' + (sekarang && sekarang.key === g.key ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') +
      '</select><div id="pgInfo" role="status" style="font-size:13px;min-height:18px;margin-top:8px;"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;"><button type="button" id="pgTutup2" class="btn btn-soft">Tutup</button><button type="button" id="pgSimpan" class="btn btn-primary">Simpan</button></div></div>';
    document.body.appendChild(ov);
    var dlg = ov.querySelector('#pgPanelDlg');
    var btnSimpan = ov.querySelector('#pgSimpan'), infoEl = ov.querySelector('#pgInfo'), pilihEl = ov.querySelector('#pgPilih');
    function tutupPanel() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      kembalikanFokus(fokusAsal);
    }
    ov.querySelector('#pgTutup2').addEventListener('click', tutupPanel);
    ov.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { tutupPanel(); return; }
      jebakTab(ev, dlg);
    });
    pilihEl.focus();
    var sibuk = false;
    btnSimpan.addEventListener('click', function () {
      if (sibuk) return;
      if (!adminAktif()) { tutupPanel(); return info('Hanya Admin!', true); }
      var baru = pilihEl.value, upd = {}, ada = [];
      (allGuru || []).forEach(function (g) { if (g.kepalaMerangkap === true && g.key !== baru) { upd['guru/' + g.key + '/kepalaMerangkap'] = null; ada.push(g); } });
      if (baru && !(sekarang && sekarang.key === baru)) upd['guru/' + baru + '/kepalaMerangkap'] = true;
      // update({}) ditolak Firebase; tidak ada yang berubah -> tutup saja tanpa menulis.
      if (!Object.keys(upd).length) { info('Tidak ada perubahan.'); tutupPanel(); return; }
      sibuk = true; btnSimpan.disabled = true; dlg.focus();
      infoEl.style.color = '#4b5563'; infoEl.textContent = 'Menyimpan...';
      Promise.resolve().then(function () {
        var siapAdmin = fn('kredAdminSiap');
        return siapAdmin ? siapAdmin() : true;
      }).then(function () { return db.ref().update(upd); }).then(function () {
        ada.forEach(function (g) { delete g.kepalaMerangkap; });
        var gb = (allGuru || []).filter(function (g) { return g.key === baru; })[0];
        if (gb) gb.kepalaMerangkap = true;
        try { addLog('atur_kepala_merangkap', baru ? ((gb && gb.name) || baru) : 'tidak ada'); } catch (e) { }
        info(baru ? '✅ Kepala merangkap guru: ' + ((gb && gb.name) || baru) : '✅ Tidak ada kepala merangkap guru.');
        tutupPanel();
      }, function (e) {
        infoEl.style.color = '#b91c1c'; infoEl.textContent = 'Gagal menyimpan: ' + pesanGalat(e);
      }).finally(function () {
        sibuk = false; btnSimpan.disabled = false;      // memakai referensi lokal: aman walau panel sudah ditutup
      });
    });
  };

  // Tombol di halaman Manajemen Pengguna: dipasang hanya untuk Admin, dibuang bila bukan Admin / wadah berganti.
  function sinkronTombolAdmin() {
    var ada = $('btnPeranGandaAdmin');
    if (!adminAktif()) {                                // logout, ganti peran, atau impersonasi
      if (ada) ada.remove();
      var p = $('pgPanel'); if (p) p.remove();
      return;
    }
    var j = $('umAdminActions');
    if (!j) { if (ada) ada.remove(); return; }
    if (ada && ada.parentNode === j) return;            // sudah terpasang di wadah yang aktif
    if (ada) ada.remove();                              // sisa dari wadah lama (halaman dirender ulang)
    j.insertAdjacentHTML('beforeend', '<button class="btn btn-primary" id="btnPeranGandaAdmin" style="margin-left:6px;">👑 Kepala Merangkap Guru</button>');
    var b = $('btnPeranGandaAdmin');
    if (b) b.addEventListener('click', function () { window.peranGandaBukaPengaturan(); });
  }

  // Pesan sesudah muat ulang karena beralih peran.
  try {
    var m = sessionStorage.getItem(FLAG_PESAN);
    if (m) { sessionStorage.removeItem(FLAG_PESAN); setTimeout(function () { info(m, false, 4000); }, 4500); }
  } catch (e) { }

  // Probe kontrak saat dimuat: hasilnya ke konsol (tampilan ke pengguna muncul saat peralihan dicoba / di panel Admin).
  setTimeout(function () {
    try {
      var r = probeKontrak('semua');
      if (r.galat.length) console.error('[peran-ganda v' + VERSI + '] kontrak TIDAK cocok:', r.galat);
      if (r.peringatan.length) console.warn('[peran-ganda v' + VERSI + '] peringatan kontrak:', r.peringatan);
    } catch (e) { }
  }, 0);

  setInterval(function () {
    try { segarkan(); } catch (e) { }
    try { sinkronTombolAdmin(); } catch (e) { }
  }, 2500);
})();
