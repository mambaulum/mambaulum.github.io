/* ============================================================
   SI MAMBA - js/impersonate.js  (v7)
   Admin "melihat sebagai guru" (impersonasi, MODE LIHAT SAJA).

   Cara kerja:
   - Admin tetap login sebagai Admin. Tombol "👁️ Lihat sebagai Guru" muncul di Manajemen Pengguna
     (anchor #umAdminActions, hanya untuk Admin asli).
   - Saat dimulai: dibuat currentUser guru (sama seperti login guru) dengan baseRole = ADMIN dan
     penanda impersonasi:true + SNAPSHOT akun Admin asli (adminAsli), disimpan lewat saveSession()
     -> karena baseRole ADMIN, sesi masuk ke sessionStorage (hanya tab ini, kedaluwarsa 15 menit,
     TIDAK pernah ke localStorage), lalu halaman dimuat ulang.
   - Semua tulis ke Firebase DIBLOKIR selama impersonasi: Reference.set/update/remove/
     setWithPriority/setPriority/transaction/push(nilai) DAN OnDisconnect.set/update/remove/
     setWithPriority. Pembacaan tetap jalan.
   - Pemblokir diverifikasi ulang setiap tick(): bila patch dilepas/ditimpa, dipasang ulang; bila
     gagal dipulihkan, impersonasi tidak ditawarkan / sesi impersonasi dikembalikan ke Admin.
   - Spanduk merah + tombol "Kembali ke Admin". Audit (audit_logs_v4) ditulis lewat fungsi Firebase
     ASLI: IMPERSONATE_START dicatat SETELAH reload (hanya bila impersonasi benar-benar aktif),
     IMPERSONATE_END dicatat sebelum kembali ke Admin.
   - Logout / tab ditutup / 15 menit tanpa aktivitas = sesi berakhir (mekanisme sesi Admin yang ada).

   BERKAS PENDAMPING: css/impersonate.css (otomatis dimuat dari folder css/ di sebelah js/;
   atau tambahkan <link rel="stylesheet" href="css/impersonate.css"> sendiri di HTML).

   KETERGANTUNGAN (app.js): currentUser, ROLES, KELAS_LIST, allGuru, db, toast, saveSession,
   currentTahunAjaran, firebase (compat). Dimuat SESUDAH app.js dan login-kode.js.

   ATURAN UNTUK SKRIP LAIN (penting):
   JANGAN patch/bungkus Reference.prototype (set, update, remove, setWithPriority, setPriority,
   transaction, push) atau OnDisconnect.prototype dari skrip lain SESUDAH impersonate.js dimuat.
   Skrip ini tidak akan menimpa pembungkus asing; bila ia menemukan fungsi yang bukan miliknya
   (dan bukan fungsi asli yang ia bungkus), jaminan lihat-saja dianggap tidak dapat ditegakkan:
   tombol "Lihat sebagai Guru" dicabut dan sesi impersonasi yang berjalan dikembalikan ke Admin.
   Bila perlu membungkus fungsi-fungsi itu, muat skrip pembungkus SEBELUM impersonate.js.

   BATAS KEAMANAN (WAJIB DIPAHAMI / DICATAT DI SOP ADMIN):
   Pembatasan "lihat saja" hanya ada di sisi klien. Firebase Rules (auth != null) tidak bisa
   membedakan admin yang sedang impersonasi dari guru asli, dan pengguna dengan akses DevTools
   tetap bisa menulis lewat REST/SDK lain. Jangan jadikan fitur ini kontrol keamanan; ia adalah
   pengaman kecelakaan (mencegah salah-simpan), bukan penghalang penyerang. Juga: onDisconnect()
   yang SUDAH didaftarkan ke server sebelum impersonasi tidak dapat dibatalkan dari sini.
============================================================ */
(function () {
  'use strict';

  // Cegah dimuat ganda (pembungkusan ganda akan membuat origs menunjuk ke guard dan audit terblokir)
  if (window.__impMuat) return;
  try { Object.defineProperty(window, '__impMuat', { value: true }); } catch (e) {}

  var skripIni = document.currentScript;
  var METODE_REF = ['set', 'update', 'remove', 'setWithPriority', 'setPriority', 'transaction'];
  var METODE_OD = ['set', 'update', 'remove', 'setWithPriority'];
  var INTI = ['set', 'update', 'remove'];            // wajib ada & terpasang (Reference dan OnDisconnect)
  var KUNCI_CIUT = 'si_mamba_imp_ciut';              // sessionStorage: spanduk diciutkan ('1') atau tidak
  var KUNCI_START = 'si_mamba_imp_start';            // flag sessionStorage: audit START tertunda sampai setelah reload

  var asliDari = new WeakMap();                      // fungsi guard -> fungsi asli (tidak terekspos sebagai properti)
  var terpasang = [];                                // [{P, m, g}] daftar patch milik kita
  var origs = {};                                    // fungsi asli Reference yang dipakai untuk audit
  var guardOk = false, toastTerakhir = 0, sedangKembali = false;
  var protoODCache = null, tundaKembaliSampai = 0, peringatanOrigs = false;

  function $(id) { return document.getElementById(id); }
  function aktif() { try { return !!(currentUser && currentUser.impersonasi); } catch (e) { return false; } }
  function adminAsli() { try { return !!(currentUser && !currentUser.impersonasi && currentUser.role === ROLES.ADMIN); } catch (e) { return false; } }
  function teks(el, s) { el.textContent = s; return el; }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function daftarKelas() { try { return Array.isArray(KELAS_LIST) ? KELAS_LIST.slice() : []; } catch (e) { return []; } }

  // ---------- CSS (tanpa inline style, ramah CSP) ----------
  function muatCss() {
    if (document.querySelector('link[href*="impersonate.css"]')) return;
    var href = 'css/impersonate.css';
    try {
      if (skripIni && skripIni.src) href = skripIni.src.replace(/[^\/]*$/, '').replace(/js\/$/, 'css/') + 'impersonate.css';
    } catch (e) {}
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.id = 'impCss';
    (document.head || document.documentElement).appendChild(l);
  }

  // ---------- Pemblokir tulis Firebase ----------
  function refSenyap(ref) {                       // jalur log/notifikasi: gagal tanpa toast (bukan aksi pengguna)
    var u = ''; try { u = String(ref); } catch (e) {}
    return /\/(logs|audit_logs_v4|notifications_v4)(\/|$)/.test(u);
  }
  function tolak(nama, ref, args, senyap) {
    var err = new Error('Mode lihat saja: perubahan tidak disimpan.');
    err.code = 'impersonate/view-only';
    if (!senyap && !refSenyap(ref) && Date.now() - toastTerakhir > 6000) {
      toastTerakhir = Date.now();
      try { toast('👁️ Mode lihat saja: perubahan tidak disimpan.', true); } catch (e) {}
    }
    // Callback penyelesaian. transaction(updateFn, onComplete, applyLocally): hanya argumen ke-2 yang callback
    // penyelesaian (argumen ke-1 adalah fungsi pembaruan dan TIDAK boleh dipanggil dengan error).
    var cb = null, i;
    if (nama === 'transaction') { if (typeof args[1] === 'function') cb = args[1]; }
    else { for (i = args.length - 1; i >= 0; i--) { if (typeof args[i] === 'function') { cb = args[i]; break; } } }
    if (cb) setTimeout(function () { try { nama === 'transaction' ? cb(err, false, null) : cb(err); } catch (e) {} }, 0);
    var p = Promise.reject(err); p.catch(function () {});
    return p;
  }
  function buatGuard(asli, nama, senyap, khususPush) {
    return function () {
      if (aktif()) {
        if (!khususPush) return tolak(nama, this, arguments, senyap);
        if (arguments.length && arguments[0] !== undefined) return tolak(nama, this, arguments, senyap); // push() tanpa nilai = hanya membuat key
      }
      return asli.apply(this, arguments);
    };
  }
  // Pulihkan satu patch bila perlu. TIDAK menimpa pembungkus skrip lain: dipulihkan hanya bila patch kita
  // dilepas (P[m] kembali ke fungsi asli yang kita bungkus) atau hilang. Fungsi lain di P[m] dianggap
  // pembungkus asing -> dibiarkan, dan jaminan lihat-saja dinyatakan tidak utuh (return false).
  function pulihkan(r) {
    var cur = r.P[r.m];
    if (cur === r.g) { r.asing = false; return true; }
    if (cur === r.asli || typeof cur !== 'function') {
      try { r.P[r.m] = r.g; } catch (e) {}
      if (r.P[r.m] === r.g) { r.asing = false; return true; }
      return false;
    }
    if (!r.asing) {
      r.asing = true;
      try { console.warn('[impersonate] ' + r.m + ' ditimpa skrip lain; patch tidak dipulihkan agar tidak menimpa skrip itu. Mode lihat saja tidak dapat dijamin.'); } catch (e) {}
    }
    return false;
  }
  // Pasang satu guard pada P[m]. Bila sudah pernah dipasang oleh kita, hanya dipulihkan (tidak dibungkus ulang).
  function bungkus(P, m, senyap, khususPush) {
    var i, r;
    for (i = 0; i < terpasang.length; i++) {
      r = terpasang[i];
      if (r.P === P && r.m === m) return pulihkan(r);
    }
    var cur = P[m];
    if (typeof cur !== 'function') return false;
    if (asliDari.has(cur)) return true;
    var g = buatGuard(cur, m, senyap, khususPush);
    asliDari.set(g, cur);
    try { P[m] = g; } catch (e) { return false; }
    if (P[m] !== g) return false;
    terpasang.push({ P: P, m: m, g: g, asli: cur, asing: false });
    return true;
  }
  // Semua patch masih utuh? Yang dilepas dipulihkan; yang ditimpa skrip lain dilaporkan (tidak ditimpa balik).
  function utuh() {
    if (!terpasang.length) return false;
    var ok = true;
    for (var i = 0; i < terpasang.length; i++) { if (!pulihkan(terpasang[i])) ok = false; }
    return ok;
  }
  function protoOnDisconnect() {                     // hasil pertama di-cache (tidak membuat objek OnDisconnect tiap tick)
    if (protoODCache) return protoODCache;
    try { var C = firebase.database.OnDisconnect; if (C && C.prototype && typeof C.prototype.set === 'function') return (protoODCache = C.prototype); } catch (e) {}
    try { var o = db.ref().onDisconnect(); var pr = Object.getPrototypeOf(o); if (pr && typeof pr.set === 'function') return (protoODCache = pr); } catch (e) {}
    return null;
  }
  // Peringatan (hanya console.warn, heuristik) bila origs.set tampaknya BUKAN fungsi asli Firebase:
  // (a) guard milik skrip ini sendiri, (b) membawa properti penanda wrapper umum, (c) tanpa parameter terdeklarasi.
  var PENANDA_WRAPPER = ['__wrapped__', '_wrapped', '__original', '_original', '__orig', '_orig', 'original', '_impAsli', '_impGuard'];
  function periksaOrigs() {
    if (peringatanOrigs || typeof origs.set !== 'function') return;
    var f = origs.set, alasan = '', i;
    if (asliDari.has(f)) alasan = 'ini guard milik skrip ini sendiri (audit akan ikut terblokir)';
    else {
      for (i = 0; i < PENANDA_WRAPPER.length; i++) {
        if (Object.prototype.hasOwnProperty.call(f, PENANDA_WRAPPER[i])) { alasan = 'ada properti penanda wrapper "' + PENANDA_WRAPPER[i] + '"'; break; }
      }
      if (!alasan && f.length === 0) alasan = 'tanpa parameter terdeklarasi (ciri wrapper generik; set() asli menerima value, onComplete)';
    }
    if (!alasan) return;
    peringatanOrigs = true;
    try { console.warn('[impersonate] origs.set mungkin bukan fungsi Firebase asli: ' + alasan + '. Pastikan tidak ada skrip lain yang membungkus Reference.prototype.set sebelum impersonate.js dimuat.'); } catch (e) {}
  }
  // Pasang (atau verifikasi ulang + pulihkan). Mengembalikan true hanya bila jaminan lihat-saja berlaku penuh.
  function pasangGuard() {
    if (guardOk && utuh()) return true;
    guardOk = false;
    try {
      var R = window.firebase && firebase.database && firebase.database.Reference;
      var O = protoOnDisconnect();
      if (!R || !R.prototype || !O) return false;
      var P = R.prototype, ok = true;
      METODE_REF.forEach(function (m) { if (!bungkus(P, m, false, false) && INTI.indexOf(m) >= 0) ok = false; });
      if (!bungkus(P, 'push', false, true)) ok = false;
      METODE_OD.forEach(function (m) { if (!bungkus(O, m, true, false) && INTI.indexOf(m) >= 0) ok = false; });
      origs.set = asliDari.get(P.set);
      periksaOrigs();
      guardOk = ok && typeof origs.set === 'function' && utuh();
    } catch (e) { guardOk = false; }
    return guardOk;
  }

  // ---------- Audit (lewat set() asli, tidak ikut diblokir) ----------
  function catatAudit(aksi, admin, g, selesai) {
    var done = false; function fin() { if (!done) { done = true; selesai(); } }
    try {
      if (!origs.set) return fin();
      var a = admin || {};
      var ref = db.ref('audit_logs_v4').push();
      var p = origs.set.call(ref, {
        userKey: a.key || a.name || 'Admin', userName: a.name || 'Admin', role: 'admin', action: aksi,
        entityType: 'USER', entityId: g.key || '',
        oldData: null, newData: { guru: g.name || '' }, createdAt: new Date().toISOString(),
        tahunAjaran: (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '')
      });
      Promise.resolve(p).then(fin, fin);
    } catch (e) { fin(); }
    setTimeout(fin, 3000);                          // jangan menahan pengguna bila server lambat
  }
  function hapusFlagStart() { try { sessionStorage.removeItem(KUNCI_START); } catch (e) {} }
  // START dicatat setelah reload, saat sesi impersonasi benar-benar aktif dan pemblokir terpasang.
  function auditMulaiTertunda() {
    var raw = null, d = null;
    try { raw = sessionStorage.getItem(KUNCI_START); } catch (e) { return; }
    if (!raw) return;
    try { d = JSON.parse(raw); } catch (e) { d = null; }
    if (!aktif()) {                                  // flag basi (impersonasi tidak jadi dimulai)
      if (!d || Date.now() - (d.ts || 0) > 60000) hapusFlagStart();
      return;
    }
    if (!guardOk || !origs.set || typeof db === 'undefined') return;   // tunggu sampai siap
    hapusFlagStart();                                // hapus dulu supaya tidak tercatat dua kali
    if (!d || d.key !== currentUser.key) return;
    catatAudit('IMPERSONATE_START', currentUser.adminAsli, { key: currentUser.key, name: currentUser.name }, function () {});
  }

  // Simpan sesi lalu muat ulang, dengan pengaman supaya sesi tidak tertimpa sebelum halaman benar-benar dimuat ulang.
  // Penyebab "balik lagi ke Admin": penyimpan sesi lain (mis. auto-logout.js -> perpanjangSesiPrivileged()) menyimpan
  // currentUser yang MASIH Admin saat tab ditinggalkan / halaman ditutup, sehingga sesi impersonasi tertimpa.
  // Maka: (1) currentUser diganti dulu di memori, (2) disimpan lagi di pagehide (dijalankan terakhir).
  function simpanLaluMuat(user) {                   // true bila reload dipicu; false bila gagal (keadaan dipulihkan)
    var sebelum; try { sebelum = currentUser; } catch (e) {}
    var saatPagehide = function () { try { saveSession(user); } catch (e) {} };
    try {
      currentUser = user;
      saveSession(user);
      window.addEventListener('pagehide', saatPagehide);
      location.reload();
      return true;
    } catch (e) {
      try { window.removeEventListener('pagehide', saatPagehide); } catch (e1) {}
      try { currentUser = sebelum; } catch (e2) {}   // jangan tinggalkan currentUser setengah beralih
      sedangKembali = false;                         // jangan terkunci: klik "Kembali ke Admin" / tick() boleh mencoba lagi
      tundaKembaliSampai = Date.now() + 5000;        // beri jeda agar tick() tidak mengulang tiap detik
      hapusFlagStart();
      try { toast('Gagal menyimpan sesi. Silakan coba lagi.', true); } catch (e3) {}
      return false;
    }
  }

  // ---------- Mulai / berhenti ----------
  function userAdmin() { return { name: 'Admin', role: ROLES.ADMIN, baseRole: ROLES.ADMIN, kelas: daftarKelas() }; }
  function salin(o) {                               // structuredClone bila ada; fallback JSON
    if (typeof structuredClone === 'function') { try { return structuredClone(o); } catch (e) {} }
    return JSON.parse(JSON.stringify(o));
  }
  // Salinan akun Admin yang sedang login (bukan objek generik), tanpa penanda impersonasi.
  function snapshotAdmin() {
    try {
      var s = salin(currentUser);
      delete s.impersonasi; delete s.adminAsli;
      if (s && s.role === ROLES.ADMIN) return s;
    } catch (e) {}
    return userAdmin();
  }
  function mulai(g) {                                // true bila impersonasi dimulai (halaman akan dimuat ulang)
    if (!adminAsli() || !pasangGuard()) { toast('Impersonasi tidak tersedia.', true); return false; }
    var semua = daftarKelas();
    var kelas = g.semuaKelas ? semua
      : (Array.isArray(g.kelas) ? g.kelas.slice() : (g.kelas ? String(g.kelas).split(',') : []));
    kelas = kelas.map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean);
    if (!kelas.length && semua.length) kelas = [semua[0]];
    if (!kelas.length) { toast('Daftar kelas belum tersedia. Coba lagi sebentar.', true); return false; }
    var u = { name: g.name, role: ROLES.TEACHER, baseRole: ROLES.ADMIN, kelas: kelas, key: g.key, semuaKelas: !!g.semuaKelas,
              waliKelasOf: g.waliKelasOf || null, impersonasi: true, adminAsli: snapshotAdmin() };
    try { sessionStorage.removeItem(KUNCI_CIUT); } catch (e) {}
    try { sessionStorage.setItem(KUNCI_START, JSON.stringify({ key: g.key, name: g.name, ts: Date.now() })); } catch (e) {}
    return simpanLaluMuat(u);
  }
  function berhenti() {
    var u = currentUser; if (!u || !u.impersonasi || sedangKembali) return;
    sedangKembali = true;
    var kembali = u.adminAsli || userAdmin();
    hapusFlagStart();
    if (!origs.set) { simpanLaluMuat(kembali); return; }
    catatAudit('IMPERSONATE_END', kembali, { key: u.key, name: u.name }, function () { simpanLaluMuat(kembali); });
  }

  // ---------- UI ----------
  function ciutTersimpan() { try { return sessionStorage.getItem(KUNCI_CIUT) === '1'; } catch (e) { return false; } }
  function aturCiut(b, ciut) {                       // ciut = spanduk jadi garis tipis + tab kecil "Lihat saja"
    b.classList.toggle('imp-banner--ciut', !!ciut);
    var buka = b.querySelector('.imp-banner__buka'); if (buka) buka.setAttribute('aria-expanded', ciut ? 'false' : 'true');
    try { if (ciut) sessionStorage.setItem(KUNCI_CIUT, '1'); else sessionStorage.removeItem(KUNCI_CIUT); } catch (e) {}
    document.body.style.paddingTop = b.offsetHeight + 'px';
  }
  function spanduk() {
    var b = $('impBanner');
    if (!aktif()) { if (b) { b.remove(); document.body.style.paddingTop = ''; } return; }
    if (!b) {
      b = el('div', 'imp-banner'); b.id = 'impBanner'; b.setAttribute('role', 'status');
      var t = el('span', 'imp-banner__teks'); t.id = 'impTeks';
      var ik = el('span', 'imp-banner__ikon'); ik.textContent = '👁️'; ik.setAttribute('aria-hidden', 'true');
      var lb = el('span'); lb.textContent = 'Melihat sebagai ';
      var nm = el('strong'); nm.id = 'impNama';
      var kt = el('span', 'imp-banner__ket'); kt.textContent = ' · mode lihat saja, perubahan tidak disimpan';
      t.appendChild(ik); t.appendChild(lb); t.appendChild(nm); t.appendChild(kt); b.appendChild(t);
      var k = el('button', 'imp-banner__btn'); k.id = 'impKembali'; k.type = 'button'; k.textContent = 'Kembali ke Admin';
      k.addEventListener('click', berhenti); b.appendChild(k);
      var c = el('button', 'imp-banner__ciut'); c.type = 'button'; c.textContent = '▴';
      c.setAttribute('aria-label', 'Ciutkan spanduk'); c.title = 'Ciutkan spanduk';
      c.addEventListener('click', function () { aturCiut(b, true); }); b.appendChild(c);
      var o = el('button', 'imp-banner__buka'); o.type = 'button'; o.textContent = '👁️ Lihat saja ▾';
      o.setAttribute('aria-label', 'Tampilkan spanduk mode lihat saja'); o.setAttribute('aria-expanded', 'false');
      o.addEventListener('click', function () { aturCiut(b, false); }); b.appendChild(o);
      document.body.appendChild(b);
      aturCiut(b, ciutTersimpan());
    }
    teks($('impNama'), String(currentUser.name || ''));
    document.body.style.paddingTop = b.offsetHeight + 'px';   // CSSOM (bukan atribut style), aman untuk CSP
  }
  function bukaPilih() {
    if (!pasangGuard()) return toast('Pemblokir mode lihat saja tidak aktif. Impersonasi tidak tersedia.', true);
    var daftar = (typeof allGuru !== 'undefined' && allGuru) ? allGuru.slice() : [];
    if (!daftar.length) return toast('Data guru belum termuat. Coba lagi sebentar.', true);
    daftar.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'id'); });
    var ov = $('impPilih'); if (ov) ov.remove();
    var pemicu = document.activeElement;

    ov = el('div', 'imp-overlay'); ov.id = 'impPilih';
    var kotak = el('div', 'imp-dialog');
    kotak.setAttribute('role', 'dialog'); kotak.setAttribute('aria-modal', 'true');
    kotak.setAttribute('aria-labelledby', 'impJudul'); kotak.setAttribute('aria-describedby', 'impDesk');
    var h = el('h3', 'imp-title'); h.id = 'impJudul'; h.textContent = '👁️ Lihat sebagai Guru';
    var p = el('p', 'imp-desc'); p.id = 'impDesk';
    p.textContent = 'Anda akan melihat aplikasi seperti guru ini. Mode lihat saja: tidak ada data yang bisa diubah.';
    var sel = el('select', 'field imp-select'); sel.setAttribute('aria-label', 'Pilih guru');
    daftar.forEach(function (g) { var o = document.createElement('option'); o.value = g.key; o.textContent = g.name || g.key; sel.appendChild(o); });
    var baris = el('div', 'imp-actions');
    var batal = el('button', 'btn btn-secondary'); batal.type = 'button'; batal.textContent = 'Batal';
    var ok = el('button', 'btn btn-primary'); ok.type = 'button'; ok.textContent = 'Mulai';

    function tutup() {
      ov.removeEventListener('keydown', tombolKeyboard);
      ov.remove();
      try { if (pemicu && pemicu.focus) pemicu.focus(); } catch (e) {}
    }
    function tombolKeyboard(e) {
      if (e.key === 'Escape') { e.preventDefault(); tutup(); return; }
      if (e.key !== 'Tab') return;
      var f = [sel, batal, ok].filter(function (x) { return !x.disabled; });
      if (!f.length) { e.preventDefault(); return; }
      var pertama = f[0], terakhir = f[f.length - 1], sekarang = document.activeElement;
      if (e.shiftKey && (sekarang === pertama || f.indexOf(sekarang) < 0)) { e.preventDefault(); terakhir.focus(); }
      else if (!e.shiftKey && (sekarang === terakhir || f.indexOf(sekarang) < 0)) { e.preventDefault(); pertama.focus(); }
    }
    batal.addEventListener('click', tutup);
    ov.addEventListener('click', function (e) { if (e.target === ov) tutup(); });
    ov.addEventListener('keydown', tombolKeyboard);
    ok.addEventListener('click', function () {
      var g = daftar.filter(function (x) { return x.key === sel.value; })[0];
      if (!g) return;
      ok.disabled = true; ok.textContent = 'Memuat…';
      if (mulai(g) === false) { ok.disabled = false; ok.textContent = 'Mulai'; }
    });
    baris.appendChild(batal); baris.appendChild(ok);
    kotak.appendChild(h); kotak.appendChild(p); kotak.appendChild(sel); kotak.appendChild(baris);
    ov.appendChild(kotak); document.body.appendChild(ov);
    sel.focus();
  }
  function tombol() {
    var ada = $('btnLihatSebagai');
    if (ada && (!adminAsli() || !guardOk)) { ada.remove(); return; }   // pemblokir lepas -> tawaran ditarik
    if (ada || !adminAsli() || !guardOk) return;
    var j = $('umAdminActions'); if (!j) return;
    var b = el('button', 'btn btn-soft imp-tombol'); b.id = 'btnLihatSebagai'; b.type = 'button';
    b.textContent = '👁️ Lihat sebagai Guru';
    b.addEventListener('click', bukaPilih); j.appendChild(b);
  }

  function tick() {
    try {
      var sehat = pasangGuard();                     // verifikasi ulang setiap tick; memulihkan patch yang dilepas
      if (aktif() && !sehat) {                       // jaminan lihat-saja tidak bisa ditegakkan -> kembalikan ke Admin
        if (sedangKembali || Date.now() < tundaKembaliSampai) return;
        sedangKembali = true;
        var kembali = currentUser.adminAsli || userAdmin();
        try { toast('Mode lihat saja tidak dapat dijamin. Kembali ke Admin.', true); } catch (e) {}
        hapusFlagStart();
        simpanLaluMuat(kembali); return;
      }
      spanduk(); tombol(); auditMulaiTertunda();
    } catch (e) { /* app.js belum siap */ }
  }

  muatCss();
  pasangGuard();
  setInterval(tick, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick); else tick();
})();
