/* ============================================================
   SI MAMBA - js/peran-ganda.js  (v1)
   PERAN GANDA: Kepala Madrasah yang juga mengajar bisa beralih Guru <-> Kepala TANPA logout.

   Cara kerja
   - Penanda ada di data guru: guru/<key>/kepalaMerangkap = true. Hanya SATU guru yang boleh bertanda ini.
     Admin mengaturnya lewat tombol "Kepala Merangkap Guru" di halaman Manajemen Pengguna.
     Pergantian kepala: ganti PIN Kepsek seperti biasa, lalu pilih guru lain (atau "Tidak ada") di panel ini.
     Kode TIDAK menyebut nama siapa pun, jadi tidak perlu diubah saat kepala diganti.
   - Guru bertanda -> muncul tombol "Beralih ke Kepala" -> wajib PIN Kepala + (bila belum tersimpan di perangkat)
     Kunci Kepala (rahasia/kunciKepsek). Penanda saja TIDAK memberi wewenang kepala; Rules tetap meminta sesi_kepsek.
   - Kepala -> tombol "Beralih ke Guru" memakai identitas guru bertanda (key, kelas, wali kelas asli). Bila perangkat
     ini belum pernah menyimpan bukti login guru itu, diminta PIN guru satu kali.
   - Setelah PIN benar, sesi disimpan lalu halaman dimuat ulang. Pemulihan sesi bawaan app.js yang membangun ulang
     seluruh tampilan (menu, data, sidebar) sesuai peran baru, jadi tidak ada logika tampilan yang ditiru di sini.
   - TIDAK memanggil logout()/kredBersihkanSesi(): sesi_kepsek dan sesi_guru boleh hidup berdampingan di uid yang sama.

   KETERGANTUNGAN (app.js/kredensial.js): currentUser, ROLES, KELAS_LIST, KEPSEK_PIN_HASH, KEPSEK_USER_KEY, hashPin,
   adminLoginLockState, adminLoginCatatGagal, adminLoginResetGagal, saveSession, isPrivilegedSession, ADMIN_SESI_KEY,
   HALAMAN_KEY, allGuru, db, toast, escapeHtml, isAdmin, addLog, kredKepsekSiap, kredGuruSiap, kredVerifikasi,
   kredSetelahLogin, kredAdminSiap. Dimuat SESUDAH js/app.js dan js/kredensial.js.
============================================================ */
(function () {
  'use strict';
  var FLAG_PESAN = 'sim_peran_ganda_pesan';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function info(t, err, ms) { try { toast(t, !!err, ms); } catch (e) { console.log(t); } }
  function fn(n) { try { return (typeof window[n] === 'function') ? window[n] : null; } catch (e) { return null; } }

  // ---------- Data ----------
  function guruMerangkap() {
    var l = (typeof allGuru !== 'undefined' && allGuru) ? allGuru : [];
    for (var i = 0; i < l.length; i++) if (l[i] && l[i].kepalaMerangkap === true) return l[i];
    return null;
  }
  function bangunUserGuru(g, baseRole) {
    var kelas = g.semuaKelas ? KELAS_LIST.slice() : (Array.isArray(g.kelas) ? g.kelas : (g.kelas ? String(g.kelas).split(',').map(function (x) { return x.trim(); }) : []));
    if (!kelas.length) kelas = [KELAS_LIST[0]];
    return { name: g.name, role: ROLES.TEACHER, baseRole: baseRole || ROLES.TEACHER, kelas: kelas, key: g.key, semuaKelas: !!g.semuaKelas, waliKelasOf: g.waliKelasOf || null };
  }
  function bangunUserKepala(baseRole) {
    return { name: 'Kepala Madrasah', role: ROLES.HEADMASTER, baseRole: baseRole || ROLES.TEACHER, key: KEPSEK_USER_KEY, kelas: KELAS_LIST.slice() };
  }

  // ---------- Modal PIN ----------
  var pinBusy = false;
  function modalPin(judul, ket, proses) {
    if ($('pgOverlay')) $('pgOverlay').remove();
    var ov = document.createElement('div');
    ov.id = 'pgOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = '<div role="dialog" aria-modal="true" style="background:#fff;color:#111827;border-radius:14px;max-width:360px;width:100%;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.3);">' +
      '<h3 style="margin:0 0 6px;font-size:17px;">' + esc(judul) + '</h3>' +
      '<p style="margin:0 0 10px;font-size:13px;color:#4b5563;">' + esc(ket) + '</p>' +
      '<input id="pgPin" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;">' +
      '<div id="pgGalat" style="color:#b91c1c;font-size:13px;min-height:18px;margin-top:6px;"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">' +
      '<button type="button" id="pgBatal" class="btn btn-soft">Batal</button>' +
      '<button type="button" id="pgLanjut" class="btn btn-primary">Lanjut</button></div></div>';
    document.body.appendChild(ov);
    var inp = $('pgPin'); inp.focus();
    function tutup() { if (pinBusy) return; ov.remove(); }
    function jalan() {
      if (pinBusy) return;
      var pin = (inp.value || '').trim();
      if (!pin) { $('pgGalat').textContent = 'Isi PIN dulu.'; return; }
      pinBusy = true; $('pgLanjut').disabled = true; $('pgGalat').textContent = 'Memeriksa...';
      Promise.resolve().then(function () { return proses(pin); }).then(function (hasil) {
        pinBusy = false;
        if (hasil === true) { ov.remove(); return; }
        $('pgLanjut').disabled = false; inp.value = ''; inp.focus();
        $('pgGalat').textContent = hasil || 'Gagal.';
      }, function (e) {
        pinBusy = false; $('pgLanjut').disabled = false;
        $('pgGalat').textContent = (e && e.message) || 'Gagal.';
      });
    }
    $('pgBatal').addEventListener('click', tutup);
    $('pgLanjut').addEventListener('click', jalan);
    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') jalan(); else if (ev.key === 'Escape') tutup(); });
  }

  // ---------- Terapkan peran baru ----------
  function terapkan(user, label, logTeks) {
    currentUser = user;
    try { saveSession(user); } catch (e) { }
    // Sesi guru biasa memakai localStorage; sisa sesi Admin/Kepsek di sessionStorage harus dibuang supaya tidak
    // memulihkan peran kepala setelah kembali ke guru.
    try { if (!isPrivilegedSession(user)) sessionStorage.removeItem(ADMIN_SESI_KEY); } catch (e) { }
    try { sessionStorage.removeItem(HALAMAN_KEY); } catch (e) { }
    try { sessionStorage.setItem(FLAG_PESAN, 'Sekarang bekerja sebagai ' + label + '.'); } catch (e) { }
    try { if (typeof addLog === 'function') addLog('ganti_peran', logTeks); } catch (e) { }
    info('Beralih ke ' + label + '...', false, 2500);
    setTimeout(function () { location.reload(); }, 250);
  }

  // ---------- Guru -> Kepala ----------
  function keKepala() {
    var asal = currentUser, g = guruMerangkap();
    if (!asal || !g || asal.key !== g.key) return info('Akun ini tidak ditandai sebagai kepala merangkap guru.', true);
    var lock = adminLoginLockState();
    if (lock.kunciSampai && Date.now() < lock.kunciSampai) return info('🔒 Terlalu banyak percobaan PIN salah. Coba lagi dalam ' + Math.ceil((lock.kunciSampai - Date.now()) / 60000) + ' menit.', true);
    modalPin('Beralih ke Kepala Madrasah', 'Masukkan PIN Kepala Madrasah.', function (pin) {
      if (hashPin(pin) !== KEPSEK_PIN_HASH) { adminLoginCatatGagal(); return 'PIN Kepala salah.'; }
      adminLoginResetGagal();
      var kepala = bangunUserKepala(asal.baseRole);
      var siap = fn('kredKepsekSiap');
      if (!siap) { terapkan(kepala, 'Kepala Madrasah', g.name + ' beralih ke Kepala Madrasah'); return true; }
      currentUser = kepala;                                  // kredKepsekSiap() memeriksa isKepsek()
      return siap().then(function () {
        terapkan(kepala, 'Kepala Madrasah', g.name + ' beralih ke Kepala Madrasah'); return true;
      }, function (e) { currentUser = asal; return (e && e.message) || 'Kunci Kepala belum benar.'; });
    });
  }

  // ---------- Kepala -> Guru ----------
  function keGuru() {
    var asal = currentUser, g = guruMerangkap();
    if (!asal || !g) return info('Belum ada guru yang ditandai sebagai kepala merangkap guru. Minta Admin mengaturnya.', true);
    var user = bangunUserGuru(g, asal.baseRole);              // asal peran dipertahankan (Kepala atau Guru)
    var siap = fn('kredGuruSiap');
    function selesai() { terapkan(user, 'Guru (' + g.name + ')', g.name + ' beralih ke Guru'); return true; }
    if (!siap) return selesai();
    // kredGuruSiap() membaca currentUser.key: set sementara, kembalikan bila gagal.
    function coba() {
      currentUser = user;
      return siap().then(function () { return true; }, function (e) { currentUser = asal; throw e; });
    }
    coba().then(selesai, function () {
      // Perangkat ini belum punya bukti login guru itu -> minta PIN guru satu kali.
      var verif = fn('kredVerifikasi'), sesudah = fn('kredSetelahLogin');
      if (!verif) return info('Sesi guru belum siap di perangkat ini. Login sekali sebagai guru lebih dulu.', true);
      modalPin('PIN ' + g.name, 'Perangkat ini belum menyimpan bukti login guru. Masukkan PIN guru satu kali.', function (pin) {
        return verif(g, pin).then(function (hasil) {
          if (!hasil || !hasil.ok) return (hasil && hasil.pesan) || 'PIN salah.';
          try { if (sesudah) sesudah(g, pin, hasil); } catch (e) { }
          return new Promise(function (r) { setTimeout(r, 500); }).then(coba).then(selesai, function (e) {
            return (e && e.message) || 'Sesi guru belum bisa disiapkan.';
          });
        });
      });
    });
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

  function segarkan() {
    var tampil = false, aksi = '', teks = '';
    try {
      if (currentUser && currentUser.baseRole !== ROLES.ADMIN && $('appPage') && $('appPage').style.display !== 'none') {   // baseRole Admin = impersonasi "Lihat sebagai Guru": tidak ditawari beralih
        var r = currentUser.role, g = guruMerangkap();
        if (g && r === ROLES.HEADMASTER) { tampil = true; aksi = 'guru'; teks = '🔁 Beralih ke Guru'; }
        else if (g && (r === ROLES.TEACHER || r === ROLES.WALI_KELAS) && currentUser.key === g.key) { tampil = true; aksi = 'kepala'; teks = '🔁 Beralih ke Kepala'; }
      }
    } catch (e) { }
    btn.style.display = tampil ? 'block' : 'none';
    if (tampil) { btn.dataset.aksi = aksi; btn.textContent = teks; }
  }

  // ---------- Panel Admin: pilih guru yang merangkap ----------
  window.peranGandaBukaPengaturan = function () {
    if (typeof isAdmin !== 'function' || !isAdmin()) return info('Hanya Admin!', true);
    var daftar = (allGuru || []).slice().sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'id'); });
    var sekarang = guruMerangkap();
    if ($('pgPanel')) $('pgPanel').remove();
    var ov = document.createElement('div');
    ov.id = 'pgPanel';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;';
    ov.innerHTML = '<div style="background:#fff;color:#111827;border-radius:14px;max-width:420px;width:100%;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.3);">' +
      '<h3 style="margin:0 0 6px;font-size:17px;">👑 Kepala Merangkap Guru</h3>' +
      '<p style="margin:0 0 10px;font-size:13px;color:#4b5563;">Pilih guru yang juga menjabat Kepala Madrasah. Orang ini bisa beralih Guru ↔ Kepala tanpa keluar akun. Hanya satu guru. Saat kepala diganti, ubah pilihan ini (atau pilih "Tidak ada" bila kepala baru tidak mengajar) dan ganti PIN/Kunci Kepala seperti biasa.</p>' +
      '<select id="pgPilih" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:15px;"><option value="">— Tidak ada —</option>' +
      daftar.map(function (g) { return '<option value="' + esc(g.key) + '"' + (sekarang && sekarang.key === g.key ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') +
      '</select><div id="pgInfo" style="font-size:13px;min-height:18px;margin-top:8px;"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;"><button type="button" id="pgTutup2" class="btn btn-soft">Tutup</button><button type="button" id="pgSimpan" class="btn btn-primary">Simpan</button></div></div>';
    document.body.appendChild(ov);
    $('pgTutup2').addEventListener('click', function () { ov.remove(); });
    var sibuk = false;
    $('pgSimpan').addEventListener('click', function () {
      if (sibuk) return; sibuk = true; $('pgSimpan').disabled = true;
      var baru = $('pgPilih').value, upd = {}, ada = [];
      (allGuru || []).forEach(function (g) { if (g.kepalaMerangkap === true && g.key !== baru) { upd['guru/' + g.key + '/kepalaMerangkap'] = null; ada.push(g); } });
      if (baru) upd['guru/' + baru + '/kepalaMerangkap'] = true;
      var siapAdmin = fn('kredAdminSiap') ? window.kredAdminSiap() : Promise.resolve(true);
      Promise.resolve(siapAdmin).then(function () { return db.ref().update(upd); }).then(function () {
        ada.forEach(function (g) { delete g.kepalaMerangkap; });
        var gb = (allGuru || []).filter(function (g) { return g.key === baru; })[0];
        if (gb) gb.kepalaMerangkap = true;
        try { addLog('atur_kepala_merangkap', baru ? ((gb && gb.name) || baru) : 'tidak ada'); } catch (e) { }
        info(baru ? '✅ Kepala merangkap guru: ' + ((gb && gb.name) || baru) : '✅ Tidak ada kepala merangkap guru.');
        ov.remove();
      }, function (e) {
        sibuk = false; $('pgSimpan').disabled = false;
        $('pgInfo').style.color = '#b91c1c'; $('pgInfo').textContent = 'Gagal menyimpan: ' + ((e && e.message) || e);
      });
    });
  };
  function pasangTombolAdmin() {
    if ($('btnPeranGandaAdmin') || typeof isAdmin !== 'function' || !currentUser || !isAdmin()) return;
    var j = $('umAdminActions'); if (!j) return;
    j.insertAdjacentHTML('beforeend', '<button class="btn btn-primary" id="btnPeranGandaAdmin" style="margin-left:6px;">👑 Kepala Merangkap Guru</button>');
    $('btnPeranGandaAdmin').addEventListener('click', function () { window.peranGandaBukaPengaturan(); });
  }

  // Pesan sesudah muat ulang karena beralih peran.
  try {
    var m = sessionStorage.getItem(FLAG_PESAN);
    if (m) { sessionStorage.removeItem(FLAG_PESAN); setTimeout(function () { info(m, false, 4000); }, 4500); }
  } catch (e) { }

  setInterval(function () { segarkan(); pasangTombolAdmin(); }, 2500);
})();
