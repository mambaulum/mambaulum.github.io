/* ============================================================
   SI MAMBA - js/login-kode.js
   Login guru dengan KODE (mis. MAMBA-K7M4Q) + PIN, menggantikan daftar nama di layar login.

   - Layar login: pilihan nama disembunyikan (<select id="loginGuru"> tetap ada di DOM karena dipakai
     app.js), diganti kolom "Kode Guru". Admin/Kepsek: ketik "admin" / "kepsek" di kolom yang sama.
   - Pesan gagal dibuat umum ("Kode atau PIN salah!") supaya tidak membocorkan kode mana yang valid.
   - Panel Admin: Manajemen Pengguna > "Kode Login Guru" (buat kode yang kosong, buat ulang, salin, cetak/PDF, unduh CSV).
   - Profil Saya: kartu "Kode Login Saya" (lihat, salin, ingat di HP ini) supaya guru bisa menyimpan kodenya sendiri.
   - Guru BARU (Tambah Pengguna) otomatis diberi kode; kodenya ditampilkan 12 detik dan ada di panel/rekap.
   - Data: field `kode` ditambahkan pada guru/<key>. Tidak ada data lain yang diubah/dihapus.
   - TAHAP 1: daftar guru masih dimuat app.js seperti sebelumnya (hanya tampilannya yang disembunyikan);
     login offline memakai cache allGuru yang sama. Pembatasan unduhan lewat Rules menyusul (tahap 2).
   - v5: opsi admin/kepsek dipastikan ada di <select> tersembunyi sebelum login (sebelumnya bisa gagal senyap).
   - v6: sanitasi pesan "PIN salah" tidak lagi bergantung pada login() sinkron (filter toast permanen + jendela waktu).
   - v7: login offline: pesan jelas bila cache belum berisi kode + backfill cache saat online; cache ditulis SETELAH g.kode
         terisi; LAST_KEY disimpan SEBELUM login (dipulihkan kalau login gagal).
   - v8: tombol admin dipasang lewat anchor #umAdminActions; CSV diberi prefix ' (cegah formula injection);
         "Kode Login Saya" di-cache di memori (hemat baca Firebase).
   - v9: Enter = Masuk (kode & PIN); tanpa handler inline (CSP); iframe cetak dibuang lewat afterprint.
   - v10: norm() hanya potong awalan pada bentuk lengkap + cocokKode() toleran; panel kode dikunci selama simpan (anti klik ganda);
         auto-kode guru baru via hook loadGuruListForLogin, semua guru baru sekaligus, + lencana jumlah guru tanpa kode.
   KETERGANTUNGAN (app.js): allGuru, db, toast, escapeHtml, isAdmin, addLog, login, sinkronRememberMe, tambahUser, loadGuruListForLogin.
============================================================ */
(function () {
  'use strict';
  var PREFIX = 'MAMBA-', LEN = 5, LAST_KEY = 'sim_last_kode';
  var CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';        // tanpa 0 O 1 I L

  function $(id) { return document.getElementById(id); }
  var PFX = 'MAMBA';                                     // PREFIX tanpa tanda hubung
  function bersih(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  // Awalan "MAMBA" dibuang HANYA bila sisanya tepat LEN karakter (bentuk lengkap "MAMBA-XXXXX").
  // Dulu aturannya "diawali MAMBA dan lebih panjang dari 5", sehingga kode polos yang kebetulan diawali
  // MAMBA (mis. "MAMBA1" atau hasil edit manual di Firebase) ikut terpotong dan tidak pernah cocok.
  function norm(s) {                                     // "mamba-k7m4q" / "K7M4Q" -> "K7M4Q"
    s = bersih(s);
    return (s.indexOf(PFX) === 0 && s.length === PFX.length + LEN) ? s.slice(PFX.length) : s;
  }
  // Pencocokan kode tersimpan vs yang diketik, tahan terhadap ada/tidaknya awalan di KEDUA sisi,
  // tanpa memotong apa pun: sama persis, atau salah satunya = awalan + yang lain.
  function cocokKode(kode, ketik) {
    var a = bersih(kode), b = bersih(ketik);
    return !!a && !!b && (a === b || a === PFX + b || PFX + a === b);
  }
  function tampil(n) { return PREFIX + n; }
  function acak() {
    var out = '', buf = new Uint8Array(1), lim = 256 - (256 % CHARS.length);
    while (out.length < LEN) { crypto.getRandomValues(buf); if (buf[0] < lim) out += CHARS[buf[0] % CHARS.length]; }
    return out;
  }
  // <select id="loginGuru"> baru berisi opsi admin/kepsek SETELAH daftar guru termuat. Kalau belum
  // (masih "Memuat...", Firebase lambat/gagal, offline tanpa cache), sel.value = 'admin' diam-diam
  // jadi '' dan login() asli membalas "Pilih user!" -- padahal selectnya disembunyikan. Pastikan opsinya ada.
  function pastikanOpsi(sel, v) {
    if (!sel.querySelector('option[value="' + v + '"]')) {
      var o = document.createElement('option'); o.value = v; o.textContent = v; sel.appendChild(o);
    }
  }
  function kodeBaru(dipakai) { var k; do { k = acak(); } while (dipakai[k]); dipakai[k] = 1; return tampil(k); }

  // ---------- Layar login ----------
  function pasangLogin() {
    var sel = $('loginGuru'); if (!sel || $('loginKode')) return;
    var blok = sel.parentElement && sel.parentElement.parentElement;
    if (blok) blok.style.display = 'none';
    var html = '<div style="margin-bottom:12px;"><label class="label">Kode Guru</label>' +
      '<input id="loginKode" class="field" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" ' +
      'placeholder="' + PREFIX + 'XXXXX" maxlength="16">' +
      '<div style="font-size:11px;color:#9ca3af;margin-top:4px;">Kode dari Admin. Admin/Kepsek: ketik admin atau kepsek.</div></div>';
    (blok || sel).insertAdjacentHTML('beforebegin', html);
    var inp = $('loginKode');
    try { var last = localStorage.getItem(LAST_KEY); if (last) inp.value = last; } catch (e) {}
    // Enter = Masuk (tanpa atribut onkeydown inline -> aman untuk CSP). Di kolom kode: kalau PIN sudah terisi
    // (autofill / kode diingat lalu PIN diketik duluan) langsung login, kalau belum pindah ke PIN.
    // Di kolom PIN: langsung login. Dulu Enter di kolom kode hanya memindahkan fokus, dan handler Enter di PIN
    // adalah atribut inline di index.html.
    var pin = $('loginPIN');
    function enterLogin(e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      if (e.repeat) return;                                // tahan Enter tidak memicu login berulang
      window.login();
    }
    inp.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      if (pin && !pin.value) { e.preventDefault(); pin.focus(); return; }
      enterLogin(e);
    });
    if (pin && !pin._enterLogin) { pin._enterLogin = true; pin.addEventListener('keydown', enterLogin); }
    inp.addEventListener('input', function () {          // matikan "Ingat Saya" begitu terketik admin/kepsek
      var n = norm(inp.value);
      if (n === 'ADMIN' || n === 'KEPSEK') { pastikanOpsi(sel, n.toLowerCase()); sel.value = n.toLowerCase(); }
      else sel.value = '';
      if (typeof sinkronRememberMe === 'function') sinkronRememberMe();
    });
  }

  // ---------- Sanitasi pesan gagal login ----------
  // "PIN salah" dari login() asli membuktikan bahwa KODE-nya valid -> bocor untuk penebak kode.
  // Dulu toast dibungkus hanya selama loginAsli() berjalan sinkron lalu dipulihkan di `finally`;
  // kalau login() jadi asinkron (await/Promise/setTimeout), toast "PIN salah" baru dipanggil SETELAH
  // dipulihkan dan lolos tanpa sanitasi. Sekarang filter dipasang SEKALI & permanen, tapi hanya aktif
  // dalam jendela waktu singkat setelah tombol Masuk ditekan, jadi tidak bergantung pada
  // sinkron/asinkronnya login() dan tidak mengubah toast lain (mis. "PIN lama salah!" di Ubah PIN).
  var loginSejak = 0, JENDELA_LOGIN_MS = 30000;
  var RE_PIN_SALAH = /^PIN( Admin| Kepsek)? salah!?$/i;
  (function pasangSanitasiToast() {
    var t0 = window.toast;
    if (typeof t0 !== 'function' || t0._sanitasiLogin) return;
    var bungkus = function (m, e, d) {
      if (typeof m === 'string' && Date.now() - loginSejak < JENDELA_LOGIN_MS) {
        if (RE_PIN_SALAH.test(m)) m = 'Kode atau PIN salah!';
        else if (m === 'Pilih user!') m = 'Kode tidak dikenali. Periksa kembali kode Anda.';
      }
      return t0.call(this, m, e, d);
    };
    bungkus._sanitasiLogin = true;
    window.toast = bungkus;
  })();

  var loginAsli = window.login;
  window.login = function () {
    var inp = $('loginKode'), sel = $('loginGuru');
    if (!inp || !sel || typeof loginAsli !== 'function') return loginAsli && loginAsli.apply(this, arguments);
    var n = norm(inp.value);
    if (!n) return toast('Isi kode guru!', true);
    var istimewa = (n === 'ADMIN' || n === 'KEPSEK'), kodeSimpan = null;
    if (istimewa) { pastikanOpsi(sel, n.toLowerCase()); sel.value = n.toLowerCase(); }
    else {
      if (!allGuru || !allGuru.length) return toast('Data belum siap, coba lagi sebentar.', true);
      var gs = allGuru.filter(function (x) { return x.kode && cocokKode(x.kode, inp.value); });
      var g = gs.filter(function (x) { return bersih(x.kode) === bersih(inp.value); })[0] || gs[0];   // persis > toleran
      if (!g) {
        // Belum ADA satu pun kode di data (cache offline lama dari sebelum fitur kode, atau data belum termuat):
        // jangan pura-pura "Kode atau PIN salah!" -- itu menyesatkan & tidak bisa diperbaiki guru. Pesan ini tidak
        // membocorkan kode mana pun karena berlaku sama untuk SEMUA input.
        if (!allGuru.some(function (x) { return x.kode; })) {
          return toast(navigator.onLine
            ? 'Data kode guru belum termuat. Tunggu sebentar lalu coba lagi.'
            : 'Data offline di HP ini belum berisi kode login. Sambungkan internet sekali, buka aplikasi, lalu coba lagi.', true, 6000);
        }
        return toast('Kode atau PIN salah!', true);
      }
      if (!sel.querySelector('option[value="' + g.key + '"]')) {
        var o = document.createElement('option'); o.value = g.key; sel.appendChild(o);
      }
      sel.value = g.key;
      kodeSimpan = g.kode;                               // simpan bentuk ASLI (bukan hasil norm) -> prefill selalu cocok lagi
    }
    if (typeof sinkronRememberMe === 'function') sinkronRememberMe();

    // Simpan kode terakhir SEBELUM login dijalankan (bukan sesudahnya): kalau login() asinkron, pindah halaman,
    // atau tab tertutup/reload tepat saat masuk, penyimpanan sesudahnya tidak pernah sempat jalan dan prefill
    // kode / "Ingat Saya" terasa tidak bekerja. Kode ini hanya sampai sini kalau cocok dengan seorang guru.
    // Kalau ternyata login gagal (PIN salah dsb.), nilai sebelumnya dipulihkan.
    var kodeSebelumnya = null, adaSebelumnya = false;
    if (!istimewa) {
      try { kodeSebelumnya = localStorage.getItem(LAST_KEY); adaSebelumnya = kodeSebelumnya !== null; localStorage.setItem(LAST_KEY, kodeSimpan || tampil(n)); } catch (e) {}
    }
    var pulihkan = function () {
      if (istimewa) return;
      try {
        if (typeof currentUser !== 'undefined' && currentUser) return;          // login sukses -> biarkan
        if (adaSebelumnya) localStorage.setItem(LAST_KEY, kodeSebelumnya); else localStorage.removeItem(LAST_KEY);
      } catch (e) {}
    };

    loginSejak = Date.now();                             // buka jendela sanitasi toast (lihat pasangSanitasiToast)
    var hasil;
    try { hasil = loginAsli.apply(this, arguments); } catch (err) { pulihkan(); throw err; }
    if (hasil && typeof hasil.then === 'function') hasil.then(pulihkan, pulihkan); else pulihkan();
    return hasil;
  };

  // ---------- Panel Admin ----------
  // Perubahan kode diterapkan ke allGuru yang berlaku SAAT INI, per key, sebelum cache offline ditulis.
  // (1) cache tidak lagi tertulis tanpa kode baru; (2) tetap benar walau allGuru sudah diganti array baru oleh
  // loadGuruListForLogin() di tengah jalan (referensi objek lama tidak dipakai lagi).
  function simpan(updates, ket) {
    return db.ref('guru').update(updates).then(function () {
      Object.keys(updates).forEach(function (path) {
        var p = path.split('/'); if (p.length !== 2 || p[1] !== 'kode') return;
        (allGuru || []).forEach(function (g) { if (g.key === p[0]) g.kode = updates[path]; });
      });
      kodeSayaCache = {};                                   // kode berubah -> buang cache memori "Kode Login Saya"
      if (window.SIMambaOfflineDB) SIMambaOfflineDB.setCache('allGuru', allGuru).catch(function () {});
      if (typeof addLog === 'function') addLog('kode_guru', ket);
      perbaruiLencana();
    });
  }

  // Satu operasi tulis kode pada satu waktu. Tanpa ini klik ganda "Buat kode yang kosong" mengirim dua pembaruan
  // dengan kode acak berbeda untuk guru yang sama (balapan: yang menang tergantung urutan jaringan, dan
  // kode yang tampil di layar bisa beda dengan yang tersimpan). Semua tombol di panel dikunci selama proses.
  var sibuk = false;
  function kunciPanel(on) {
    sibuk = on;
    var box = $('kodeGuruBody'); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
      if (on) { if (!b.disabled) { b.disabled = true; b.setAttribute('data-kunci', '1'); } }
      else if (b.getAttribute('data-kunci')) { b.disabled = false; b.removeAttribute('data-kunci'); }   // tombol hasil render ulang tak tersentuh
    });
  }
  function eksklusif(kerja) {
    if (sibuk) return;
    kunciPanel(true);
    var selesai = function () { kunciPanel(false); }, p;
    try { p = kerja(); } catch (e) { selesai(); throw e; }
    return Promise.resolve(p).then(selesai, selesai);
  }
  function dipakaiMap() { var m = {}; (allGuru || []).forEach(function (g) { if (g.kode) m[norm(g.kode)] = 1; }); return m; }

  function renderPanel() {
    var box = $('kodeGuruBody'); if (!box) return;
    var rows = (allGuru || []).map(function (g) {
      return '<tr><td style="padding:6px 8px;">' + escapeHtml(g.name) + '</td>' +
        '<td style="padding:6px 8px;font-family:monospace;font-weight:700;">' + (g.kode ? escapeHtml(g.kode) : '<span style="color:#9ca3af;">belum ada</span>') + '</td>' +
        '<td style="padding:6px 8px;text-align:right;"><button class="btn btn-secondary" style="font-size:12px;padding:4px 10px;" data-kg="' + escapeHtml(g.key) + '">' + (g.kode ? 'Buat ulang' : 'Buat') + '</button></td></tr>';
    }).join('');
    var kosong = (allGuru || []).filter(function (g) { return !g.kode; }).length;
    box.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<button class="btn btn-primary" id="kgSemua"' + (kosong ? '' : ' disabled') + '>Buat kode yang kosong (' + kosong + ')</button>' +
      '<button class="btn btn-secondary" id="kgSalin">Salin daftar</button>' +
      '<button class="btn btn-secondary" id="kgCetak">Cetak / PDF</button>' +
      '<button class="btn btn-secondary" id="kgCsv">Unduh CSV</button></div>' +
      '<div style="overflow:auto;max-height:55vh;"><table style="width:100%;border-collapse:collapse;font-size:14px;">' + rows + '</table></div>' +
      '<p style="font-size:12px;color:#6b7280;margin-top:10px;">Bagikan kode ke tiap guru lewat pesan pribadi. PIN tidak berubah. Guru baru otomatis mendapat kode. Kode yang sudah dibuat tidak pernah ditimpa kecuali dengan "Buat ulang".</p>';
    $('kgSemua').addEventListener('click', function () {
      if (sibuk) return;
      var m = dipakaiMap(), up = {}, n = 0;
      allGuru.forEach(function (g) { if (!g.kode) { up[g.key + '/kode'] = kodeBaru(m); n++; } });
      if (!n) return;
      eksklusif(function () {
        return simpan(up, 'buat ' + n + ' kode').then(
          function () { toast('✅ ' + n + ' kode dibuat'); renderPanel(); },
          function () { toast('Gagal menyimpan kode', true); });
      });
    });
    $('kgSalin').addEventListener('click', function () {
      var teks = allGuru.filter(function (g) { return g.kode; }).map(function (g) { return g.name + ': ' + g.kode; }).join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(function () { toast('Daftar disalin'); }, function () { toast('Gagal menyalin', true); });
    });
    $('kgCetak').addEventListener('click', cetakDaftar);
    $('kgCsv').addEventListener('click', unduhCsv);
    box.querySelectorAll('[data-kg]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (sibuk) return;
        var g = allGuru.filter(function (x) { return x.key === b.getAttribute('data-kg'); })[0]; if (!g) return;
        if (g.kode && !confirm('Buat ulang kode untuk ' + g.name + '? Kode lama tidak berlaku lagi.')) return;
        var k = kodeBaru(dipakaiMap()), up = {}; up[g.key + '/kode'] = k;
        eksklusif(function () {
          return simpan(up, 'kode ' + g.name).then(function () { renderPanel(); }, function () { toast('Gagal menyimpan kode', true); });
        });
      });
    });
  }

  // ---------- Rekap: cetak/PDF & CSV (PIN tidak pernah ikut) ----------
  function labelPeran(g) { return g.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru'; }
  function labelKelas(g) { return g.semuaKelas ? 'Semua kelas' : (g.kelas || []).join(', '); }
  function daftarKode() { return (allGuru || []).filter(function (g) { return g.kode; }); }

  function unduhCsv() {
    var d = daftarKode(); if (!d.length) return toast('Belum ada kode.', true);
    // Cegah CSV/formula injection: sel yang diawali = + - @ (atau TAB/CR) dieksekusi Excel/Sheets sebagai rumus.
    // Nama guru diinput Admin (bisa disalin dari sumber lain), jadi awali dengan ' supaya terbaca sebagai teks.
    var q = function (v) {
      var t = String(v == null ? '' : v);
      if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
      return '"' + t.replace(/"/g, '""') + '"';
    };
    var baris = [['Nama', 'Peran', 'Kelas', 'Kode'].map(q).join(',')].concat(d.map(function (g) {
      return [g.name, labelPeran(g), labelKelas(g), g.kode].map(q).join(',');
    }));
    var blob = new Blob(['\ufeff' + baris.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kode-login-guru.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function cetakDaftar() {
    var d = daftarKode(); if (!d.length) return toast('Belum ada kode.', true);
    var rows = d.map(function (g, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(g.name) + '</td><td>' + labelPeran(g) + '</td><td>' +
        escapeHtml(labelKelas(g)) + '</td><td class="k">' + escapeHtml(g.kode) + '</td></tr>';
    }).join('');
    var html = '<!doctype html><meta charset="utf-8"><title>Kode Login Guru</title><style>body{font-family:sans-serif;padding:24px}' +
      'h2{margin:0 0 4px}p{color:#555;font-size:12px}table{border-collapse:collapse;width:100%;margin-top:12px}' +
      'td,th{border:1px solid #999;padding:6px 8px;font-size:13px;text-align:left}.k{font-family:monospace;font-weight:700}</style>' +
      '<h2>Kode Login Guru - SI MAMBA</h2><p>Dicetak ' + new Date().toLocaleDateString('id-ID') +
      '. Dokumen RAHASIA: simpan aman dan jangan disebar. PIN tidak tercantum.</p>' +
      '<table><tr><th>No</th><th>Nama</th><th>Peran</th><th>Kelas</th><th>Kode</th></tr>' + rows + '</table>';
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    // Iframe dibuang SESUDAH dialog cetak ditutup (event afterprint), bukan dengan timer 3 dtk setelah print():
    // di sebagian browser (mis. Safari/iOS, Firefox) print() langsung kembali sementara dialog masih terbuka,
    // sehingga iframe yang sudah dihapus membuat cetakan kosong/gagal. Timer panjang hanya jaring pengaman
    // untuk browser lama yang tidak mengirim afterprint.
    var bersih = function () {
      if (bersih.selesai) return; bersih.selesai = true;
      try { window.removeEventListener('afterprint', bersih); } catch (e) {}
      try { f.contentWindow.removeEventListener('afterprint', bersih); } catch (e) {}
      try { f.remove(); } catch (e) {}
    };
    f.contentWindow.addEventListener('afterprint', bersih);   // dipasang SETELAH document.close() (open() menghapus listener)
    window.addEventListener('afterprint', bersih);            // sebagian browser mengirimnya ke window induk
    setTimeout(function () {
      try { f.contentWindow.focus(); f.contentWindow.print(); }
      catch (e) { bersih(); toast('Gagal membuka dialog cetak. Coba "Unduh CSV".', true); return; }
      setTimeout(bersih, 120000);                              // jaring pengaman: 2 menit
    }, 300);
  }

  // ---------- Guru baru otomatis dapat kode ----------
  // tambahUser() di app.js berbasis callback (mengembalikan undefined) dan baru SETELAH tulis sukses memanggil
  // loadGuruListForLogin(cb) untuk me-refresh allGuru (yang MENGGANTI array & objeknya). Versi lama hanya
  // polling 14 dtk, hanya memberi kode ke guru baru PERTAMA, dan menyimpan referensi objek lama. Sekarang:
  //  - menunggu lewat HOOK pada loadGuruListForLogin (dipanggil tepat saat allGuru selesai di-refresh), plus
  //    polling cadangan 90 dtk yang hanya membaca memori (0 baca Firebase);
  //  - bila tambahUser kelak mengembalikan Promise, ikut ditunggu;
  //  - SEMUA guru baru yang belum berkode diberi kode sekaligus dalam satu pembaruan multi-path;
  //  - `klaim` mencegah guru yang sama diberi kode dua kali oleh pemicu yang berbeda.
  var menunggu = null, klaim = {}, pollIv = null, POLL_MS = 1000, POLL_MAKS = 90;
  function hentikanPoll() { if (pollIv) { clearInterval(pollIv); pollIv = null; } }

  function beriKodeGuruBaru() {
    if (!menunggu) return false;
    var mt = menunggu;
    var baru = (allGuru || []).filter(function (g) {
      if (mt.sebelum[g.key] || g.kode || klaim[g.key]) return false;
      if (mt.snapshotKosong) {                              // daftar belum termuat saat tambahUser dipanggil: jangan salah sasaran ke guru lama
        var t = Date.parse(g.dibuat || ''); return !isNaN(t) && t >= mt.sejak - 5 * 60 * 1000;
      }
      return true;
    });
    if (!baru.length) return false;
    menunggu = null; hentikanPoll();
    var m = dipakaiMap(), up = {}, hasil = [];
    baru.forEach(function (g) { klaim[g.key] = 1; var k = kodeBaru(m); up[g.key + '/kode'] = k; hasil.push(g.name + ': ' + k); });
    var lepas = function () { baru.forEach(function (g) { delete klaim[g.key]; }); };
    simpan(up, 'kode ' + baru.map(function (g) { return g.name; }).join(', ')).then(function () {
      lepas(); toast('🔑 Kode login ' + hasil.join(' | '), false, 12000);
    }, function () {
      lepas(); toast('Guru ditambahkan, tapi kodenya gagal dibuat. Buat lewat "Kode Login Guru".', true, 6000);
    });
    return true;
  }

  function mulaiMenunggu(sebelum, kosong) {
    menunggu = { sebelum: sebelum, snapshotKosong: kosong, sejak: Date.now() };
    hentikanPoll();
    var coba = 0;
    pollIv = setInterval(function () {
      coba++;
      if (beriKodeGuruBaru()) return;
      if (coba >= POLL_MAKS) { hentikanPoll(); menunggu = null; perbaruiLencana(); }
    }, POLL_MS);
  }

  var tambahUserAsli = window.tambahUser;
  if (typeof tambahUserAsli === 'function') {
    window.tambahUser = function () {
      var sebelum = {}; (allGuru || []).forEach(function (g) { sebelum[g.key] = 1; });
      var kosong = !(allGuru && allGuru.length);
      var hasil = tambahUserAsli.apply(this, arguments);
      mulaiMenunggu(sebelum, kosong);
      if (hasil && typeof hasil.then === 'function') hasil.then(function () { setTimeout(beriKodeGuruBaru, 0); }, function () {});
      return hasil;
    };
  }
  var loadGuruAsli = window.loadGuruListForLogin;
  if (typeof loadGuruAsli === 'function' && !loadGuruAsli._kodeHook) {
    window.loadGuruListForLogin = function (callback) {
      return loadGuruAsli.call(this, function () {
        try { if (typeof callback === 'function') callback.apply(this, arguments); }
        finally { setTimeout(function () { beriKodeGuruBaru(); perbaruiLencana(); }, 0); }
      });
    };
    window.loadGuruListForLogin._kodeHook = true;
  }

  // Jaring pengaman terakhir: label tombol admin menampilkan jumlah guru yang belum punya kode.
  function perbaruiLencana() {
    var b = $('btnKodeGuru'); if (!b) return;
    var n = (allGuru || []).filter(function (g) { return !g.kode; }).length;
    b.textContent = '🔑 Kode Login Guru' + (n ? ' (' + n + ' belum punya kode)' : '');
  }
  function pasangLencana() {
    perbaruiLencana();
    var hal = $('page-user-management');
    if (hal && !hal._lencana) {
      hal._lencana = true;
      new MutationObserver(function () { if (!hal.classList.contains('hidden')) perbaruiLencana(); })
        .observe(hal, { attributes: true, attributeFilter: ['class'] });
    }
  }

  window.bukaKodeGuruAdmin = function () {
    if (typeof isAdmin !== 'function' || !isAdmin()) return toast('Hanya Admin yang bisa membuka ini.', true);
    var ov = $('kodeGuruOverlay');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'kodeGuruOverlay';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
      ov.innerHTML = '<div class="card" style="max-width:560px;width:100%;max-height:90vh;overflow:auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
        '<h3 style="font-size:16px;font-weight:700;margin:0;">🔑 Kode Login Guru</h3><button class="btn btn-secondary" id="kgTutup" style="padding:4px 12px;">Tutup</button></div><div id="kodeGuruBody"></div></div>';
      document.body.appendChild(ov);
      $('kgTutup').addEventListener('click', function () { ov.style.display = 'none'; });
    }
    ov.style.display = 'flex'; renderPanel();
  };

  // Tombol dipasang di anchor #umAdminActions (ada di index.html, tepat di bawah paragraf pengantar halaman
  // Manajemen Pengguna). Dulu dicari lewat selector struktural '#page-user-management .card > p' yang diam-diam
  // tidak menemukan apa-apa begitu markup halaman berubah (mis. <p> dipindah/diganti) -> tombol tidak muncul.
  // Selector lama tetap jadi cadangan (dan membuat anchor-nya) kalau index.html lama belum punya anchor.
  function pasangTombolAdmin() {
    if ($('btnKodeGuru')) return;
    var tombol = '<button class="btn btn-primary" id="btnKodeGuru">🔑 Kode Login Guru</button>';
    var kaitkan = function () { var b = $('btnKodeGuru'); if (b) b.addEventListener('click', function () { window.bukaKodeGuruAdmin(); }); pasangLencana(); };
    var jangkar = $('umAdminActions');
    if (jangkar) { jangkar.insertAdjacentHTML('beforeend', tombol); kaitkan(); return; }
    var p = document.querySelector('#page-user-management .card > p');
    if (p) { p.insertAdjacentHTML('afterend', '<div id="umAdminActions" style="margin-bottom:14px;">' + tombol + '</div>'); kaitkan(); return; }
    console.warn('[SI MAMBA] login-kode: anchor #umAdminActions tidak ditemukan, tombol "Kode Login Guru" tidak dipasang.');
  }

  // ---------- Profil Saya: guru melihat/menyimpan kodenya sendiri ----------
  // Dibaca langsung dari guru/<key>/kode (allGuru bisa kosong kalau sesi dipulihkan lewat "Ingat Saya").
  // Cache di memori (per key guru, TTL 10 menit) supaya membuka Profil berkali-kali tidak memicu baca Firebase
  // berulang. Urutan: (1) allGuru yang sudah ada di memori -> 0 baca, (2) cache -> 0 baca, (3) baca SEKALI
  // (permintaan yang sedang jalan dipakai bersama). Dikosongkan setiap Admin membuat/menimpa kode (lihat simpan()).
  var kodeSayaCache = {}, kodeSayaSedangBaca = {}, KODE_SAYA_TTL = 10 * 60 * 1000;
  function tampilKodeSaya(kartu, k) {
    if (!k) { kartu.style.display = 'none'; return; }
    $('kodeSayaNilai').textContent = k; kartu.style.display = 'block';
  }
  function segarkanKodeSaya() {
    var kartu = $('kodeSayaCard'); if (!kartu) return;
    var u = (typeof currentUser !== 'undefined') ? currentUser : null;
    if (!u || !u.key || u.key === 'admin' || u.key === 'kepsek') { kartu.style.display = 'none'; return; }
    var key = u.key;
    var g = (allGuru || []).filter(function (x) { return x.key === key; })[0];
    if (g && g.kode) { kodeSayaCache[key] = { v: g.kode, t: Date.now() }; return tampilKodeSaya(kartu, g.kode); }
    var c = kodeSayaCache[key];
    if (c && Date.now() - c.t < KODE_SAYA_TTL) return tampilKodeSaya(kartu, c.v);
    if (kodeSayaSedangBaca[key]) return;
    kodeSayaSedangBaca[key] = true;
    db.ref('guru/' + key + '/kode').once('value').then(function (snap) {
      var k = snap.val() || null;
      kodeSayaCache[key] = { v: k, t: Date.now() };
      tampilKodeSaya(kartu, k);
    }, function () { kartu.style.display = 'none'; })        // gagal: tidak di-cache, dicoba lagi saat Profil dibuka berikutnya
      .then(function () { delete kodeSayaSedangBaca[key]; });
  }

  function pasangKodeSaya() {
    var halaman = $('page-profile-v4'); if (!halaman || $('kodeSayaCard')) return;
    var shell = halaman.querySelector('.v4-shell'); if (!shell) return;
    shell.insertAdjacentHTML('afterend',
      '<div class="v4-card" id="kodeSayaCard" style="display:none;margin-top:12px;"><h4>🔑 Kode Login Saya</h4>' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0;">' +
      '<span id="kodeSayaNilai" style="font-family:monospace;font-size:20px;font-weight:700;">-</span>' +
      '<button class="btn btn-soft" id="kodeSayaSalin">Salin</button>' +
      '<button class="btn btn-soft" id="kodeSayaIngat">Ingat di HP ini</button></div>' +
      '<div class="v4-muted" style="font-size:12px;">Untuk masuk dibutuhkan kode + PIN. Simpan kode ini dan jangan dibagikan.</div></div>');
    $('kodeSayaSalin').addEventListener('click', function () {
      var k = $('kodeSayaNilai').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(k) : Promise.reject()).then(function () { toast('Kode disalin'); }, function () { toast('Gagal menyalin', true); });
    });
    $('kodeSayaIngat').addEventListener('click', function () {
      try { localStorage.setItem(LAST_KEY, $('kodeSayaNilai').textContent); toast('Kode diingat di HP ini. Saat login cukup isi PIN.'); } catch (e) { toast('Gagal menyimpan', true); }
    });
    new MutationObserver(function () { if (!halaman.classList.contains('hidden')) segarkanKodeSaya(); })
      .observe(halaman, { attributes: true, attributeFilter: ['class'] });
    if (!halaman.classList.contains('hidden')) segarkanKodeSaya();
  }

  // ---------- Backfill cache offline ----------
  // Cache IndexedDB 'allGuru' yang ditulis versi lama (sebelum ada field `kode`) tidak punya kode, sehingga login
  // offline dengan kode selalu gagal. Begitu ONLINE dan data guru segar sudah termuat, tulis ulang cache bila
  // jumlah kode di cache berbeda dengan yang ada di data. Hanya menulis kalau memang ada yang beda.
  function backfillCacheKode() {
    if (!navigator.onLine || !window.SIMambaOfflineDB || !allGuru || !allGuru.length) return Promise.resolve(false);
    var jml = allGuru.filter(function (g) { return g.kode; }).length;
    if (!jml) return Promise.resolve(false);
    return SIMambaOfflineDB.getCache('allGuru').then(function (c) {
      var jmlCache = (c || []).filter(function (g) { return g && g.kode; }).length;
      if (jmlCache === jml) return false;
      return SIMambaOfflineDB.setCache('allGuru', allGuru).then(function () { return true; });
    }).catch(function () { return false; });
  }
  (function jadwalkanBackfill() {
    var coba = 0, iv = setInterval(function () {            // allGuru dimuat async oleh app.js -> tunggu (maks ~30 dtk)
      coba++;
      if (typeof allGuru !== 'undefined' && allGuru && allGuru.length && navigator.onLine) {
        clearInterval(iv); backfillCacheKode();
      } else if (coba >= 20) clearInterval(iv);
    }, 1500);
    window.addEventListener('online', function () { setTimeout(backfillCacheKode, 2500); });
  })();

  pasangLogin();
  pasangTombolAdmin();
  pasangKodeSaya();
})();
