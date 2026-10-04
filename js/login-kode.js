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
   KETERGANTUNGAN (app.js): allGuru, db, toast, escapeHtml, isAdmin, addLog, login, sinkronRememberMe.
============================================================ */
(function () {
  'use strict';
  var PREFIX = 'MAMBA-', LEN = 5, LAST_KEY = 'sim_last_kode';
  var CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';        // tanpa 0 O 1 I L

  function $(id) { return document.getElementById(id); }
  function norm(s) {                                     // "mamba-k7m4q" / "K7M4Q" -> "K7M4Q"
    s = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return s.indexOf('MAMBA') === 0 && s.length > 5 ? s.slice(5) : s;
  }
  function tampil(n) { return PREFIX + n; }
  function acak() {
    var out = '', buf = new Uint8Array(1), lim = 256 - (256 % CHARS.length);
    while (out.length < LEN) { crypto.getRandomValues(buf); if (buf[0] < lim) out += CHARS[buf[0] % CHARS.length]; }
    return out;
  }
  function kodeBaru(dipakai) { var k; do { k = acak(); } while (dipakai[k]); dipakai[k] = 1; return tampil(k); }

  // ---------- Layar login ----------
  function pasangLogin() {
    var sel = $('loginGuru'); if (!sel || $('loginKode')) return;
    var blok = sel.parentElement && sel.parentElement.parentElement;
    if (blok) blok.style.display = 'none';
    var html = '<div style="margin-bottom:12px;"><label class="label">Kode Guru</label>' +
      '<input id="loginKode" class="field" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" ' +
      'placeholder="' + PREFIX + 'XXXXX" maxlength="16" onkeydown="if(event.key===\'Enter\')document.getElementById(\'loginPIN\').focus()">' +
      '<div style="font-size:11px;color:#9ca3af;margin-top:4px;">Kode dari Admin. Admin/Kepsek: ketik admin atau kepsek.</div></div>';
    (blok || sel).insertAdjacentHTML('beforebegin', html);
    var inp = $('loginKode');
    try { var last = localStorage.getItem(LAST_KEY); if (last) inp.value = last; } catch (e) {}
    inp.addEventListener('input', function () {          // matikan "Ingat Saya" begitu terketik admin/kepsek
      var n = norm(inp.value);
      sel.value = (n === 'ADMIN' || n === 'KEPSEK') ? n.toLowerCase() : '';
      if (typeof sinkronRememberMe === 'function') sinkronRememberMe();
    });
  }

  var loginAsli = window.login;
  window.login = function () {
    var inp = $('loginKode'), sel = $('loginGuru');
    if (!inp || !sel || typeof loginAsli !== 'function') return loginAsli && loginAsli.apply(this, arguments);
    var n = norm(inp.value);
    if (!n) return toast('Isi kode guru!', true);
    var istimewa = (n === 'ADMIN' || n === 'KEPSEK');
    if (istimewa) { sel.value = n.toLowerCase(); }
    else {
      if (!allGuru || !allGuru.length) return toast('Data belum siap, coba lagi sebentar.', true);
      var g = allGuru.filter(function (x) { return x.kode && norm(x.kode) === n; })[0];
      if (!g) return toast('Kode atau PIN salah!', true);
      if (!sel.querySelector('option[value="' + g.key + '"]')) {
        var o = document.createElement('option'); o.value = g.key; sel.appendChild(o);
      }
      sel.value = g.key;
    }
    if (typeof sinkronRememberMe === 'function') sinkronRememberMe();
    var t0 = window.toast;                               // samarkan "PIN salah" -> pesan umum, hanya selama login berjalan
    window.toast = function (m, e, d) { return t0(typeof m === 'string' && /^PIN( Admin| Kepsek)? salah!?$/i.test(m) ? 'Kode atau PIN salah!' : m, e, d); };
    try { loginAsli.apply(this, arguments); } finally { window.toast = t0; }
    try { if (!istimewa && typeof currentUser !== 'undefined' && currentUser) localStorage.setItem(LAST_KEY, tampil(n)); } catch (e) {}
  };

  // ---------- Panel Admin ----------
  function simpan(updates, ket) {
    return db.ref('guru').update(updates).then(function () {
      if (window.SIMambaOfflineDB) SIMambaOfflineDB.setCache('allGuru', allGuru).catch(function () {});
      if (typeof addLog === 'function') addLog('kode_guru', ket);
    });
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
    $('kgSemua').onclick = function () {
      var m = dipakaiMap(), up = {}, n = 0;
      allGuru.forEach(function (g) { if (!g.kode) { var k = kodeBaru(m); up[g.key + '/kode'] = k; g._k = k; n++; } });
      if (!n) return;
      simpan(up, 'buat ' + n + ' kode').then(function () { allGuru.forEach(function (g) { if (g._k) { g.kode = g._k; delete g._k; } }); toast('✅ ' + n + ' kode dibuat'); renderPanel(); })
        .catch(function () { allGuru.forEach(function (g) { delete g._k; }); toast('Gagal menyimpan kode', true); });
    };
    $('kgSalin').onclick = function () {
      var teks = allGuru.filter(function (g) { return g.kode; }).map(function (g) { return g.name + ': ' + g.kode; }).join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(teks) : Promise.reject()).then(function () { toast('Daftar disalin'); }, function () { toast('Gagal menyalin', true); });
    };
    $('kgCetak').onclick = cetakDaftar;
    $('kgCsv').onclick = unduhCsv;
    box.querySelectorAll('[data-kg]').forEach(function (b) {
      b.onclick = function () {
        var g = allGuru.filter(function (x) { return x.key === b.getAttribute('data-kg'); })[0]; if (!g) return;
        if (g.kode && !confirm('Buat ulang kode untuk ' + g.name + '? Kode lama tidak berlaku lagi.')) return;
        var k = kodeBaru(dipakaiMap()), up = {}; up[g.key + '/kode'] = k;
        simpan(up, 'kode ' + g.name).then(function () { g.kode = k; renderPanel(); }, function () { toast('Gagal menyimpan kode', true); });
      };
    });
  }

  // ---------- Rekap: cetak/PDF & CSV (PIN tidak pernah ikut) ----------
  function labelPeran(g) { return g.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru'; }
  function labelKelas(g) { return g.semuaKelas ? 'Semua kelas' : (g.kelas || []).join(', '); }
  function daftarKode() { return (allGuru || []).filter(function (g) { return g.kode; }); }

  function unduhCsv() {
    var d = daftarKode(); if (!d.length) return toast('Belum ada kode.', true);
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
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
    setTimeout(function () { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(function () { f.remove(); }, 3000); }, 300);
  }

  // ---------- Guru baru otomatis dapat kode ----------
  // tambahUser() menyimpan guru lalu me-refresh allGuru secara asinkron, jadi kita tunggu (maks ~14 dtk)
  // sampai guru baru muncul di allGuru, lalu beri kode. Hanya guru yang BARU muncul yang diberi kode.
  var tambahUserAsli = window.tambahUser;
  if (typeof tambahUserAsli === 'function') {
    window.tambahUser = function () {
      var sebelum = {}; (allGuru || []).forEach(function (g) { sebelum[g.key] = 1; });
      var hasil = tambahUserAsli.apply(this, arguments), coba = 0;
      var iv = setInterval(function () {
        coba++;
        var baru = (allGuru || []).filter(function (g) { return !sebelum[g.key] && !g.kode; })[0];
        if (baru) {
          clearInterval(iv);
          var k = kodeBaru(dipakaiMap()), up = {}; up[baru.key + '/kode'] = k;
          simpan(up, 'kode ' + baru.name).then(function () {
            baru.kode = k; toast('🔑 Kode login ' + baru.name + ': ' + k, false, 12000);
          }, function () { toast('Guru ditambahkan, tapi kodenya gagal dibuat. Buat lewat "Kode Login Guru".', true, 6000); });
        } else if (coba >= 20) clearInterval(iv);
      }, 700);
      return hasil;
    };
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
      $('kgTutup').onclick = function () { ov.style.display = 'none'; };
    }
    ov.style.display = 'flex'; renderPanel();
  };

  function pasangTombolAdmin() {
    var p = document.querySelector('#page-user-management .card > p');
    if (!p || $('btnKodeGuru')) return;
    p.insertAdjacentHTML('afterend', '<div style="margin-bottom:14px;"><button class="btn btn-primary" id="btnKodeGuru" onclick="bukaKodeGuruAdmin()">🔑 Kode Login Guru</button></div>');
  }

  // ---------- Profil Saya: guru melihat/menyimpan kodenya sendiri ----------
  // Dibaca langsung dari guru/<key>/kode (allGuru bisa kosong kalau sesi dipulihkan lewat "Ingat Saya").
  function segarkanKodeSaya() {
    var kartu = $('kodeSayaCard'); if (!kartu) return;
    var u = (typeof currentUser !== 'undefined') ? currentUser : null;
    if (!u || !u.key || u.key === 'admin' || u.key === 'kepsek') { kartu.style.display = 'none'; return; }
    db.ref('guru/' + u.key + '/kode').once('value').then(function (snap) {
      var k = snap.val(); if (!k) { kartu.style.display = 'none'; return; }
      $('kodeSayaNilai').textContent = k; kartu.style.display = 'block';
    }, function () { kartu.style.display = 'none'; });
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
    $('kodeSayaSalin').onclick = function () {
      var k = $('kodeSayaNilai').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(k) : Promise.reject()).then(function () { toast('Kode disalin'); }, function () { toast('Gagal menyalin', true); });
    };
    $('kodeSayaIngat').onclick = function () {
      try { localStorage.setItem(LAST_KEY, $('kodeSayaNilai').textContent); toast('Kode diingat di HP ini. Saat login cukup isi PIN.'); } catch (e) { toast('Gagal menyimpan', true); }
    };
    new MutationObserver(function () { if (!halaman.classList.contains('hidden')) segarkanKodeSaya(); })
      .observe(halaman, { attributes: true, attributeFilter: ['class'] });
    if (!halaman.classList.contains('hidden')) segarkanKodeSaya();
  }

  pasangLogin();
  pasangTombolAdmin();
  pasangKodeSaya();
})();
