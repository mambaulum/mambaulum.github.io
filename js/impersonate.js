/* ============================================================
   SI MAMBA - js/impersonate.js  (v1)
   Admin "melihat sebagai guru" (impersonasi, MODE LIHAT SAJA).

   Cara kerja:
   - Admin tetap login sebagai Admin. Tombol "👁️ Lihat sebagai Guru" muncul di Manajemen Pengguna
     (anchor #umAdminActions, hanya untuk Admin asli).
   - Saat dimulai: dibuat currentUser guru (sama seperti login guru) dengan baseRole = ADMIN dan
     penanda impersonasi:true, disimpan lewat saveSession() -> karena baseRole ADMIN, sesi masuk ke
     sessionStorage (hanya tab ini, kedaluwarsa 15 menit, TIDAK pernah ke localStorage), lalu halaman
     dimuat ulang. Aplikasi bangun dari nol sebagai guru itu (data, menu, modul sesuai guru).
   - Semua tulis ke Firebase DIBLOKIR selama impersonasi (set/update/remove/push berisi nilai/
     transaction/setPriority). Pembacaan tetap jalan. Bila pemblokir gagal terpasang, impersonasi
     tidak ditawarkan; kalau sesi impersonasi ditemukan tanpa pemblokir, Admin dikembalikan.
   - Spanduk merah di atas layar + tombol "Kembali ke Admin". Awal & akhir dicatat di audit_logs_v4
     (ditulis lewat fungsi Firebase ASLI, bukan yang diblokir).
   - Logout / tab ditutup / 15 menit tanpa aktivitas = sesi berakhir (mekanisme sesi Admin yang ada).

   KETERGANTUNGAN (app.js): currentUser, ROLES, KELAS_LIST, allGuru, db, toast, saveSession,
   currentTahunAjaran, firebase (compat). Dimuat SESUDAH app.js dan login-kode.js.
   BATASAN: pembatasan "lihat saja" ada di sisi aplikasi; Firebase Rules (auth != null) tidak bisa
   membedakan admin yang sedang impersonasi dari guru asli.
============================================================ */
(function () {
  'use strict';
  var METODE = ['set', 'update', 'remove', 'setWithPriority', 'setPriority', 'transaction'];
  var origs = {}, guardOk = false, toastTerakhir = 0;

  function $(id) { return document.getElementById(id); }
  function aktif() { try { return !!(currentUser && currentUser.impersonasi); } catch (e) { return false; } }
  function adminAsli() { try { return !!(currentUser && !currentUser.impersonasi && currentUser.role === ROLES.ADMIN); } catch (e) { return false; } }
  function teks(el, s) { el.textContent = s; return el; }

  // ---------- Pemblokir tulis Firebase ----------
  function refSenyap(ref) {                       // jalur log/notifikasi: gagal tanpa toast (bukan aksi pengguna)
    var u = ''; try { u = String(ref); } catch (e) {}
    return /\/(logs|audit_logs_v4|notifications_v4)(\/|$)/.test(u);
  }
  function tolak(nama, ref, args) {
    var err = new Error('Mode lihat saja: perubahan tidak disimpan.');
    err.code = 'impersonate/view-only';
    if (!refSenyap(ref) && Date.now() - toastTerakhir > 6000) {
      toastTerakhir = Date.now();
      try { toast('👁️ Mode lihat saja: perubahan tidak disimpan.', true); } catch (e) {}
    }
    var cb = null;
    for (var i = args.length - 1; i >= 0; i--) { if (typeof args[i] === 'function') { cb = args[i]; break; } }
    if (cb) setTimeout(function () { try { nama === 'transaction' ? cb(err, false, null) : cb(err); } catch (e) {} }, 0);
    var p = Promise.reject(err); p.catch(function () {});
    return p;
  }
  function pasangGuard() {
    if (guardOk) return true;
    try {
      var R = window.firebase && firebase.database && firebase.database.Reference;
      if (!R || !R.prototype) return false;
      var P = R.prototype;
      METODE.forEach(function (m) {
        var asli = P[m];
        if (typeof asli !== 'function') return;
        if (asli._impGuard) { origs[m] = asli._impAsli; return; }
        var g = function () { if (aktif()) return tolak(m, this, arguments); return asli.apply(this, arguments); };
        g._impGuard = true; g._impAsli = asli; origs[m] = asli; P[m] = g;
      });
      var pushAsli = P.push;
      if (typeof pushAsli === 'function' && !pushAsli._impGuard) {
        var gp = function () {
          if (aktif() && arguments.length && arguments[0] !== undefined) return tolak('push', this, arguments);
          return pushAsli.apply(this, arguments);                       // push() tanpa nilai = hanya membuat key
        };
        gp._impGuard = true; gp._impAsli = pushAsli; P.push = gp;
      }
      guardOk = typeof origs.set === 'function' && P.set._impGuard === true && P.update._impGuard === true && P.remove._impGuard === true;
    } catch (e) { guardOk = false; }
    return guardOk;
  }

  // ---------- Audit (lewat set() asli, tidak ikut diblokir) ----------
  function catatAudit(aksi, g, selesai) {
    var done = false; function fin() { if (!done) { done = true; selesai(); } }
    try {
      var ref = db.ref('audit_logs_v4').push();
      var p = origs.set.call(ref, {
        userKey: 'Admin', userName: 'Admin', role: 'admin', action: aksi, entityType: 'USER', entityId: g.key || '',
        oldData: null, newData: { guru: g.name || '' }, createdAt: new Date().toISOString(),
        tahunAjaran: (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '')
      });
      Promise.resolve(p).then(fin, fin);
    } catch (e) { fin(); }
    setTimeout(fin, 3000);                          // jangan menahan pengguna bila server lambat
  }

  // ---------- Mulai / berhenti ----------
  function userAdmin() { return { name: 'Admin', role: ROLES.ADMIN, baseRole: ROLES.ADMIN, kelas: [].concat(KELAS_LIST) }; }
  function mulai(g) {
    if (!adminAsli() || !pasangGuard()) return toast('Impersonasi tidak tersedia.', true);
    var kelas = g.semuaKelas ? [].concat(KELAS_LIST)
      : (Array.isArray(g.kelas) ? g.kelas : (g.kelas ? String(g.kelas).split(',').map(function (x) { return x.trim(); }) : []));
    if (!kelas.length) kelas = [KELAS_LIST[0]];
    var u = { name: g.name, role: ROLES.TEACHER, baseRole: ROLES.ADMIN, kelas: kelas, key: g.key, semuaKelas: !!g.semuaKelas,
              waliKelasOf: g.waliKelasOf || null, impersonasi: true, adminAsli: userAdmin() };
    catatAudit('IMPERSONATE_START', g, function () { saveSession(u); location.reload(); });
  }
  function berhenti() {
    var u = currentUser; if (!u || !u.impersonasi) return;
    var kembali = u.adminAsli || userAdmin();
    if (!origs.set) { saveSession(kembali); location.reload(); return; }
    catatAudit('IMPERSONATE_END', { key: u.key, name: u.name }, function () { saveSession(kembali); location.reload(); });
  }

  // ---------- UI ----------
  function spanduk() {
    var b = $('impBanner');
    if (!aktif()) { if (b) { b.remove(); document.body.style.paddingTop = ''; } return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'impBanner';
      b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483000;background:#b91c1c;color:#fff;font-size:13px;' +
        'display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:6px 10px;' +
        'padding-top:calc(6px + env(safe-area-inset-top,0px));box-sizing:border-box;';
      var t = document.createElement('span'); t.id = 'impTeks'; b.appendChild(t);
      var k = document.createElement('button'); k.id = 'impKembali'; k.type = 'button'; k.textContent = 'Kembali ke Admin';
      k.style.cssText = 'background:#fff;color:#b91c1c;border:0;border-radius:6px;padding:4px 10px;font-weight:700;cursor:pointer;';
      k.addEventListener('click', berhenti); b.appendChild(k);
      document.body.appendChild(b);
    }
    teks($('impTeks'), '👁️ Mode lihat saja — Anda melihat sebagai ' + currentUser.name + '. Perubahan tidak disimpan.');
    document.body.style.paddingTop = b.offsetHeight + 'px';
  }
  function bukaPilih() {
    var daftar = (typeof allGuru !== 'undefined' && allGuru) ? allGuru.slice() : [];
    if (!daftar.length) return toast('Data guru belum termuat. Coba lagi sebentar.', true);
    daftar.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'id'); });
    var ov = $('impPilih'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'impPilih';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;';
    var kotak = document.createElement('div');
    kotak.style.cssText = 'background:#fff;border-radius:12px;padding:18px;max-width:360px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.25);';
    var h = document.createElement('h3'); h.textContent = '👁️ Lihat sebagai Guru'; h.style.cssText = 'margin:0 0 6px;font-size:16px;font-weight:700;';
    var p = document.createElement('p'); p.textContent = 'Anda akan melihat aplikasi seperti guru ini. Mode lihat saja: tidak ada data yang bisa diubah.'; p.style.cssText = 'margin:0 0 12px;font-size:12px;color:#6b7280;';
    var sel = document.createElement('select'); sel.className = 'field'; sel.style.cssText = 'width:100%;margin-bottom:12px;';
    daftar.forEach(function (g) { var o = document.createElement('option'); o.value = g.key; o.textContent = g.name || g.key; sel.appendChild(o); });
    var baris = document.createElement('div'); baris.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    var batal = document.createElement('button'); batal.type = 'button'; batal.className = 'btn btn-secondary'; batal.textContent = 'Batal';
    var ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn btn-primary'; ok.textContent = 'Mulai';
    batal.addEventListener('click', function () { ov.remove(); });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    ok.addEventListener('click', function () {
      var g = daftar.filter(function (x) { return x.key === sel.value; })[0];
      if (!g) return; ok.disabled = true; ok.textContent = 'Memuat…'; mulai(g);
    });
    baris.appendChild(batal); baris.appendChild(ok);
    kotak.appendChild(h); kotak.appendChild(p); kotak.appendChild(sel); kotak.appendChild(baris);
    ov.appendChild(kotak); document.body.appendChild(ov);
  }
  function tombol() {
    if ($('btnLihatSebagai') || !adminAsli() || !guardOk) return;
    var j = $('umAdminActions'); if (!j) return;
    var b = document.createElement('button'); b.id = 'btnLihatSebagai'; b.type = 'button'; b.className = 'btn btn-soft';
    b.textContent = '👁️ Lihat sebagai Guru'; b.style.marginLeft = '8px';
    b.addEventListener('click', bukaPilih); j.appendChild(b);
  }

  function tick() {
    try {
      if (!guardOk) pasangGuard();
      if (aktif() && !guardOk) {                    // jaminan lihat-saja tidak bisa ditegakkan -> kembalikan ke Admin
        var kembali = currentUser.adminAsli || userAdmin();
        try { toast('Mode lihat saja tidak dapat diaktifkan. Kembali ke Admin.', true); } catch (e) {}
        saveSession(kembali); location.reload(); return;
      }
      spanduk(); tombol();
    } catch (e) { /* app.js belum siap */ }
  }
  pasangGuard();
  setInterval(tick, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick); else tick();
})();
