/* ============================================================
   SI MAMBA - js/kredensial.js  (v1)
   Pengamanan login guru (tahap 2 dari login-kode.js).

   MASALAH YANG DISELESAIKAN
   Sebelumnya hash PIN guru ada di guru/{key}/pin dan ikut terunduh oleh siapa pun yang membuka app
   (daftar guru dibaca penuh SEBELUM login). PIN 6 digit bisa ditebak offline dalam hitungan detik, dan
   karena penulisan terbuka, orang luar juga bisa menimpa PIN guru.

   RANCANGAN
   - guru/{key}            : data guru TANPA hash PIN (kode login tetap di sini).
   - login_kredensial/{h}  : h = hashPinSalted(PIN, key). Nilainya = key guru. Rules melarang membaca DAFTAR
                             node ini; hanya satu path yang boleh dibaca. Login = baca path hasil hash PIN
                             yang diketik: ada dan nilainya = key guru -> PIN benar. Tidak ada hash yang
                             bisa diunduh untuk ditebak offline.
   - kred_guru/{key}       : kebalikannya (key -> h). HANYA bisa dibaca Admin (dipakai untuk reset PIN).
   - rahasia/kunciAdmin    : string acak panjang, diisi lewat Firebase Console (tidak bisa ditulis/dibaca dari app).
   - sesi_admin/{uid}      : Admin menaruh "Kunci Admin" miliknya di sini; Rules membandingkannya dengan
                             rahasia/kunciAdmin. Cocok -> boleh menulis kredensial. (Kunci disimpan di perangkat
                             Admin; bukan PIN Admin karena hash PIN Admin ada di source.)
   - sesi_guru/{uid}       : guru yang mengganti PIN sendiri menaruh hash PIN lamanya di sini sebagai bukti.
                             Rules hanya mengizinkan ia mengubah entri yang menunjuk ke key-nya sendiri.

   MASA TRANSISI (aman untuk dipasang bertahap)
   - Kalau guru belum dimigrasi (path tidak ada), login memakai guru.pin lama (hanya baca).
   - Admin menjalankan "1. Migrasi kredensial", lalu setelah dites "2. Hapus hash lama dari data guru".
   - Login offline memakai penanda per-perangkat (IndexedDB 'kredLokal') yang diisi saat login ONLINE berhasil.

   KETERGANTUNGAN (app.js): db, authReady, hashPin, hashPinSalted, allGuru, isAdmin, toast, addLog,
   loadGuruListForLogin, SIMambaOfflineDB (opsional).
============================================================ */
(function () {
  'use strict';

  var KUNCI_LS = 'sim_kunci_admin';
  var CACHE_LOKAL = 'kredLokal';
  var WAKTU_BACA_MS = 8000;

  // ---------- util ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { try { var u = firebase.auth().currentUser; return u ? u.uid : null; } catch (e) { return null; } }
  function siapAuth() {
    var p = (typeof authReady !== 'undefined') ? authReady : Promise.resolve();
    return p.then(function () { var u = uid(); if (!u) throw new Error('Belum tersambung ke Firebase (login anonim belum selesai).'); return u; });
  }
  function dalamWaktu(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function galat(e) {
    var kode = e && e.code ? String(e.code) : '', pesan = e && e.message ? String(e.message) : String(e || 'galat');
    if (/PERMISSION_DENIED/i.test(kode + pesan)) return new Error('Ditolak Firebase. Periksa Kunci Admin (tombol 🛡️ Keamanan Login) dan pastikan Rules tahap 1 sudah dipasang.');
    return new Error(pesan);
  }
  function hashOk(h) { return typeof h === 'string' && /^[A-Za-z0-9]{16,100}$/.test(h); }

  // ---------- penanda login offline per perangkat ----------
  function bacaLokal() {
    if (!window.SIMambaOfflineDB || typeof SIMambaOfflineDB.getCache !== 'function') return Promise.resolve({});
    return Promise.resolve(SIMambaOfflineDB.getCache(CACHE_LOKAL)).then(function (v) { return (v && typeof v === 'object') ? v : {}; }, function () { return {}; });
  }
  function simpanLokal(key, hash) {
    if (!window.SIMambaOfflineDB || typeof SIMambaOfflineDB.setCache !== 'function' || !key || !hash) return Promise.resolve();
    return bacaLokal().then(function (m) { m[key] = hash; return SIMambaOfflineDB.setCache(CACHE_LOKAL, m); }).catch(function () {});
  }

  // ---------- verifikasi PIN guru ----------
  // Hasil: { ok, hash, legacy, sumber: 'server'|'lokal'|'lama'|null, pesan }
  function kandidat(pin, key) { return { salted: hashPinSalted(pin, key), legacy: hashPin(pin) }; }
  function cekLama(guru, k) {   // masa transisi: hash masih di data guru (HANYA baca, tidak menulis apa pun)
    if (guru && typeof guru.pin === 'string' && guru.pin) {
      if (guru.pin === k.salted) return { ok: true, hash: k.salted, legacy: false, sumber: 'lama' };
      if (guru.pin === k.legacy) return { ok: true, hash: k.legacy, legacy: true, sumber: 'lama' };
    }
    return null;
  }
  window.kredVerifikasi = function (guru, pin) {
    var k, gagalPesan = 'PIN salah!';
    try { k = kandidat(pin, guru.key); } catch (e) { return Promise.resolve({ ok: false, pesan: 'Gagal memeriksa PIN (modul hash belum siap).' }); }
    var lama = cekLama(guru, k);

    function dariLokal() {
      return bacaLokal().then(function (m) {
        var h = m[guru.key];
        if (h && (h === k.salted || h === k.legacy)) return { ok: true, hash: h, legacy: h === k.legacy, sumber: 'lokal' };
        if (lama) return lama;
        if (h) return { ok: false, pesan: gagalPesan };       // ada penanda lokal tapi PIN beda -> memang salah
        return { ok: false, pesan: navigator.onLine
          ? 'Tidak bisa memeriksa PIN sekarang (koneksi lemah). Coba lagi sebentar.'
          : 'Perangkat ini belum pernah login online dengan akun ini. Sambungkan internet sekali, lalu coba lagi.' };
      });
    }

    if (!navigator.onLine) return dariLokal();
    return siapAuth().then(function () {
      function baca(h) { return db.ref('login_kredensial/' + h).once('value').then(function (s) { return s.val(); }); }
      return dalamWaktu(Promise.all([baca(k.salted), baca(k.legacy)]), WAKTU_BACA_MS);
    }).then(function (v) {
      if (v[0] === guru.key) return { ok: true, hash: k.salted, legacy: false, sumber: 'server' };
      if (v[1] === guru.key) return { ok: true, hash: k.legacy, legacy: true, sumber: 'server' };
      if (lama) return lama;                                  // belum dimigrasi
      return { ok: false, pesan: gagalPesan };
    }, function () { return dariLokal(); });                  // jaringan/timeout/Rules -> penanda lokal
  };

  // Dipanggil setelah login guru BERHASIL (tidak memblokir login).
  window.kredSetelahLogin = function (guru, pin, hasil) {
    if (!hasil || !hasil.ok || !hasil.hash) return;
    simpanLokal(guru.key, hasil.hash);
    // Hash lama tanpa garam yang sudah terdaftar di indeks -> tingkatkan ke hash bergaram (bukti = hash lama itu sendiri).
    if (hasil.legacy && hasil.sumber === 'server' && navigator.onLine) {
      gantiPinSendiri(guru, pin, pin, hasil).catch(function (e) { console.warn('[SI MAMBA] upgrade hash lama gagal:', e && e.message); });
    }
  };

  // ---------- ganti PIN sendiri (guru) ----------
  function gantiPinSendiri(guru, pinLama, pinBaru, hasil) {
    var key = guru.key, baru = hashPinSalted(pinBaru, key);
    if (hasil && hasil.sumber === 'server') {
      var lamaHash = hasil.hash, u;
      return siapAuth().then(function (id) { u = id; return db.ref('sesi_guru/' + u).set(lamaHash); }).then(function () {
        var upd = {};
        if (lamaHash !== baru) upd['login_kredensial/' + lamaHash] = null;
        upd['login_kredensial/' + baru] = key;
        upd['kred_guru/' + key] = baru;
        upd['guru/' + key + '/pin'] = null;                   // jangan sisakan hash lama di data guru
        return db.ref().update(upd);
      }).then(function () {
        db.ref('sesi_guru/' + u).remove().catch(function () {});
        return simpanLokal(key, baru);
      }, function (e) { throw galat(e); });
    }
    // Masa transisi: akun belum dimigrasi (tidak ada bukti di indeks) -> cara lama; Admin akan memigrasi nanti.
    return db.ref('guru/' + key).update({ pin: baru }).then(function () { return simpanLokal(key, baru); }, function (e) { throw galat(e); });
  }
  window.kredGantiPinSendiri = gantiPinSendiri;

  // ---------- Kunci Admin ----------
  function kunciAdmin() { try { return localStorage.getItem(KUNCI_LS) || ''; } catch (e) { return ''; } }
  function setKunciAdmin(v) { try { if (v) localStorage.setItem(KUNCI_LS, v); else localStorage.removeItem(KUNCI_LS); } catch (e) {} }
  function tanyaKunci(paksa) {
    var k = paksa ? '' : kunciAdmin();
    if (k) return k;
    var v = window.prompt('Masukkan KUNCI ADMIN (string panjang yang Anda isi di Firebase Console pada rahasia/kunciAdmin). Disimpan hanya di perangkat ini:');
    v = (v || '').trim();
    if (!v) return '';
    setKunciAdmin(v);
    return v;
  }
  function adminSiap(paksaTanya) {
    if (typeof isAdmin !== 'function' || !isAdmin()) return Promise.reject(new Error('Hanya Admin.'));
    var k = tanyaKunci(!!paksaTanya);
    if (!k) return Promise.reject(new Error('Kunci Admin belum diisi.'));
    return siapAuth().then(function (u) { return db.ref('sesi_admin/' + u).set(k); }).then(function () { return true; }, function (e) { throw galat(e); });
  }

  // Dipakai modul lain (tarif honor, rapat, dinas luar Kepala) SEBELUM menulis ke node yang di Rules dikunci "hanya sesi Admin".
  // Pertama kali di tiap perangkat Admin diminta Kunci Admin (disimpan di perangkat ini); sesudah itu sesi_admin/{uid} cukup
  // diperbarui diam-diam. Hasil sukses diingat 5 menit supaya beruntun tidak menulis sesi berulang.
  var adminSiapTerakhir = 0;
  window.kredAdminSiap = function (paksa) {
    if (!paksa && Date.now() - adminSiapTerakhir < 5 * 60 * 1000) return Promise.resolve(true);
    return adminSiap(!!paksa).then(function (ok) { adminSiapTerakhir = Date.now(); return ok; }, function (e) { adminSiapTerakhir = 0; throw e; });
  };

  // Admin: tambah guru baru + kredensialnya (atomik).
  window.kredAdminTambahGuru = function (key, data, pin, cb) {
    adminSiap().then(function () {
      var h = hashPinSalted(pin, key), upd = {};
      upd['guru/' + key] = data;
      upd['login_kredensial/' + h] = key;
      upd['kred_guru/' + key] = h;
      return db.ref().update(upd);
    }).then(function () { cb(null); }, function (e) { cb(galat(e)); });
  };

  // Admin: atur/reset PIN seorang guru. Mengembalikan Promise.
  window.kredAdminSetPin = function (key, pinBaru) {
    return adminSiap().then(function () { return db.ref('kred_guru/' + key).once('value'); }).then(function (snap) {
      var lama = snap.val(), baru = hashPinSalted(pinBaru, key), upd = {};
      if (hashOk(lama) && lama !== baru) upd['login_kredensial/' + lama] = null;
      upd['login_kredensial/' + baru] = key;
      upd['kred_guru/' + key] = baru;
      upd['guru/' + key + '/pin'] = null;                     // hapus sisa hash lama di data guru (masa transisi)
      return db.ref().update(upd);
    }).then(function () { return true; }, function (e) { throw galat(e); });
  };

  // ---------- Migrasi (Admin) ----------
  function migrasi(lapor) {
    var snapGuru;
    return adminSiap().then(function () { return db.ref('guru').once('value'); }).then(function (snap) {
      snapGuru = snap;
      var item = [], dipakai = {};
      snap.forEach(function (c) {
        var g = c.val() || {}, key = c.key, nama = g.name || key;
        if (!g.pin) { lapor('• ' + nama + ': tidak ada hash di data guru (lewati)'); return; }
        var plain = /^\d{6}$/.test(g.pin);
        var h = plain ? hashPinSalted(g.pin, key) : String(g.pin);
        if (!hashOk(h)) { lapor('⚠️ ' + nama + ': format hash tidak dikenali (lewati)'); return; }
        if (dipakai[h] && dipakai[h] !== key) { lapor('⚠️ ' + nama + ': hash sama dengan guru lain (PIN lama tanpa garam kembar). Reset PIN guru ini lewat tombol Reset PIN.'); return; }
        dipakai[h] = key;
        item.push({ key: key, nama: nama, h: h, plain: plain });
      });
      // cek bentrok dengan entri indeks yang sudah ada milik guru lain
      return Promise.all(item.map(function (it) {
        return db.ref('login_kredensial/' + it.h).once('value').then(function (s) { it.ada = s.val(); return it; });
      }));
    }).then(function (item) {
      var upd = {}, jalan = [];
      item.forEach(function (it) {
        if (it.ada && it.ada !== it.key) { lapor('⚠️ ' + it.nama + ': hash bentrok dengan akun lain (lewati). Reset PIN guru ini.'); return; }
        upd['login_kredensial/' + it.h] = it.key;
        upd['kred_guru/' + it.key] = it.h;
        if (it.plain) upd['guru/' + it.key + '/pin'] = it.h;  // PIN polos (sisa lama) -> hash
        jalan.push(it);
      });
      if (!jalan.length) { lapor('Tidak ada yang perlu dimigrasi.'); return 0; }
      return db.ref().update(upd).then(function () {
        // baca balik untuk memastikan
        return Promise.all(jalan.map(function (it) {
          return Promise.all([db.ref('login_kredensial/' + it.h).once('value'), db.ref('kred_guru/' + it.key).once('value')]).then(function (v) {
            var ok = v[0].val() === it.key && v[1].val() === it.h;
            lapor((ok ? '✅ ' : '❌ ') + it.nama + (ok ? ': terdaftar' : ': GAGAL diverifikasi'));
            return ok ? 1 : 0;
          });
        })).then(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
      });
    }).catch(function (e) { throw galat(e); });
  }

  // ---------- Bersihkan hash lama dari data guru (Admin) ----------
  function bersihkan(lapor) {
    return adminSiap().then(function () { return db.ref('guru').once('value'); }).then(function (snap) {
      var tugas = [];
      snap.forEach(function (c) { var g = c.val() || {}; if (g.pin) tugas.push({ key: c.key, nama: g.name || c.key }); });
      if (!tugas.length) { lapor('Tidak ada hash PIN yang tersisa di data guru.'); return 0; }
      return Promise.all(tugas.map(function (t) {
        return db.ref('kred_guru/' + t.key).once('value').then(function (s) {
          var h = s.val();
          if (!hashOk(h)) return { t: t, ok: false, alasan: 'belum punya kredensial terdaftar' };
          return db.ref('login_kredensial/' + h).once('value').then(function (s2) { return { t: t, ok: s2.val() === t.key, alasan: 'entri kredensial tidak cocok' }; });
        });
      })).then(function (hasil) {
        var upd = {}, n = 0;
        hasil.forEach(function (r) {
          if (r.ok) { upd['guru/' + r.t.key + '/pin'] = null; n++; lapor('🧹 ' + r.t.nama + ': hash dihapus dari data guru'); }
          else lapor('⏭️ ' + r.t.nama + ': DILEWATI (' + r.alasan + ')');
        });
        if (!n) return 0;
        return db.ref().update(upd).then(function () { return n; });
      });
    }).catch(function (e) { throw galat(e); });
  }

  window.kredMigrasi = migrasi;
  window.kredBersihkan = bersihkan;

  // ---------- UI: panel Keamanan Login ----------
  function statusPin() {
    var daftar = (typeof allGuru !== 'undefined' && allGuru) ? allGuru : [];
    var sisa = daftar.filter(function (g) { return g && g.pin; }).length;
    return { total: daftar.length, sisa: sisa };
  }
  function bukaPanel() {
    if (typeof isAdmin !== 'function' || !isAdmin()) return toast('Hanya Admin!', true);
    var lama = $('kredPanel'); if (lama) lama.remove();
    var st = statusPin();
    var el = document.createElement('div');
    el.id = 'kredPanel';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10050;display:flex;align-items:center;justify-content:center;padding:14px;';
    el.innerHTML =
      '<div style="background:#fff;color:#111;border-radius:14px;max-width:560px;width:100%;max-height:92vh;overflow:auto;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.3);">' +
      '<h3 style="margin:0 0 8px;">🛡️ Keamanan Login Guru</h3>' +
      '<p style="margin:0 0 10px;font-size:13px;color:#444;">Kunci Admin di perangkat ini: <b id="kredStKunci">' + (kunciAdmin() ? '✅ tersimpan' : '❌ belum diisi') + '</b><br>' +
      'Guru yang hash PIN-nya masih ada di data guru: <b id="kredStSisa">' + st.sisa + '</b> dari ' + st.total + '</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
      '<button class="btn btn-soft" id="kredBtnKunci">🔐 Atur / ganti Kunci Admin di perangkat ini</button>' +
      '<button class="btn btn-primary" id="kredBtnMigrasi">1. Migrasi kredensial guru</button>' +
      '<button class="btn btn-soft" id="kredBtnBersih">2. Hapus hash lama dari data guru (setelah dites)</button>' +
      '</div>' +
      '<pre id="kredLaporan" style="margin:12px 0 0;padding:10px;background:#f5f5f5;border-radius:8px;font-size:12px;white-space:pre-wrap;max-height:240px;overflow:auto;display:none;"></pre>' +
      '<div style="text-align:right;margin-top:12px;"><button class="btn btn-soft" id="kredTutup">Tutup</button></div>' +
      '</div>';
    document.body.appendChild(el);
    var lap = $('kredLaporan'), sibuk = false;
    function lapor(t) { lap.style.display = 'block'; lap.textContent += (lap.textContent ? '\n' : '') + t; lap.scrollTop = lap.scrollHeight; }
    function segarkan() {
      var s = statusPin();
      if ($('kredStSisa')) $('kredStSisa').textContent = s.sisa;
      if ($('kredStKunci')) $('kredStKunci').textContent = kunciAdmin() ? '✅ tersimpan' : '❌ belum diisi';
    }
    function jalankan(fn, judul) {
      if (sibuk) return; sibuk = true; lap.textContent = ''; lapor('⏳ ' + judul + '...');
      fn().then(function (n) {
        lapor('Selesai.' + (typeof n === 'number' ? ' (' + n + ' akun)' : ''));
        if (typeof addLog === 'function') { try { addLog('keamanan_login', judul); } catch (e) {} }
        if (typeof loadGuruListForLogin === 'function') loadGuruListForLogin(segarkan);
      }, function (e) { lapor('❌ ' + (e && e.message ? e.message : e)); }).then(function () { sibuk = false; segarkan(); });
    }
    $('kredTutup').addEventListener('click', function () { el.remove(); });
    el.addEventListener('click', function (ev) { if (ev.target === el) el.remove(); });
    $('kredBtnKunci').addEventListener('click', function () {
      var k = tanyaKunci(true);
      if (!k) return;
      lap.textContent = ''; lapor('⏳ Memeriksa Kunci Admin...');
      adminSiap().then(function () {
        // uji: tulis entri uji ke kred_guru (ditolak Rules kalau kunci salah), lalu hapus
        return db.ref('kred_guru/_uji').set('uji').then(function () { return db.ref('kred_guru/_uji').remove(); });
      }).then(function () { lapor('✅ Kunci Admin dikenali Firebase.'); segarkan(); }, function (e) {
        lapor('❌ Kunci ditolak atau Rules belum dipasang: ' + (e && e.message ? e.message : e)); setKunciAdmin(''); segarkan();
      });
    });
    $('kredBtnMigrasi').addEventListener('click', function () {
      if (!confirm('Migrasi akan mendaftarkan hash PIN setiap guru ke indeks kredensial. Data guru yang ada tidak dihapus. Lanjutkan?')) return;
      jalankan(function () { return migrasi(lapor); }, 'Migrasi kredensial');
    });
    $('kredBtnBersih').addEventListener('click', function () {
      if (!confirm('Pastikan SUDAH mencoba login sebagai beberapa guru setelah migrasi. Langkah ini menghapus hash PIN dari data guru (hanya untuk akun yang kredensialnya terverifikasi). Lanjutkan?')) return;
      jalankan(function () { return bersihkan(lapor); }, 'Hapus hash lama dari data guru');
    });
  }
  window.bukaKeamananLogin = bukaPanel;

  function pasangTombol() {
    if ($('btnKeamananLogin')) return;
    var jangkar = $('umAdminActions');
    if (!jangkar) { console.warn('[SI MAMBA] kredensial: anchor #umAdminActions tidak ditemukan, tombol Keamanan Login tidak dipasang.'); return; }
    jangkar.insertAdjacentHTML('beforeend', ' <button class="btn btn-soft" id="btnKeamananLogin">🛡️ Keamanan Login</button>');
    $('btnKeamananLogin').addEventListener('click', bukaPanel);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasangTombol); else pasangTombol();
})();
