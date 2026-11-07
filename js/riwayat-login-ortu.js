// ============================================================
// RIWAYAT LOGIN ORANG TUA (tampilan Admin) -- js/riwayat-login-ortu.js
// Membaca node ortu_login_log yang ditulis portal-ortu.js (ortuCatatRiwayatLogin). Cara masuk: pin / pertama / otomatis / link (link WhatsApp).
// Tampil sebagai kartu di halaman Admin (#riwayatLoginOrtuCard), hanya untuk Admin.
// Dimuat SESUDAH app.js. Nomor WA disamarkan di layar dan di CSV.
// Data dibaca sekali per sesi (300 catatan terbaru) dan saat tombol Muat Ulang ditekan, untuk menghemat kuota.
// ============================================================
(function () {
  'use strict';
  var BATAS_BACA = 300, BATAS_TAMPIL = 100;
  var data = [], tampil = BATAS_TAMPIL, terikat = false, sudahMuat = false, sedang = false, sedangBersih = false;
  var CARA = { pin: 'PIN', pertama: 'Masuk pertama kali', otomatis: 'Otomatis (perangkat diingat)', link: 'Link WhatsApp' };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    s = String(s == null ? '' : s);
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function adminAktif() { return typeof isAdmin === 'function' && isAdmin(); }
  function nomorLokal(wa) { var d = String(wa || ''); return d.indexOf('62') === 0 ? '0' + d.slice(2) : d; }
  function samar(wa) { var l = nomorLokal(wa); return l.length < 8 ? l : l.slice(0, 4) + '-xxxx-' + l.slice(-4); }
  function waktuTeks(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '-' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function hariIni(iso) { var a = new Date(iso); return !isNaN(a) && a.toDateString() === new Date().toDateString(); }

  // nomor WA -> nama anak dari data siswa (dipakai bila catatan tidak membawa nama, mis. PIN salah)
  function petaNama() {
    var m = {};
    try {
      (typeof allSiswa !== 'undefined' ? allSiswa : []).forEach(function (s) {
        if (!s || s.aktif === false) return;
        var k = s.noWaKey || (s.noWaOrtu && typeof formatNomorWa === 'function' ? formatNomorWa(s.noWaOrtu) : null);
        if (k && s.name) (m[k] = m[k] || []).push(s.name);
      });
    } catch (e) {}
    return m;
  }
  function namaAnak(x, peta) { return x.anak || (peta[x.wa] ? peta[x.wa].join(', ') : ''); }

  function saring(peta) {
    var q = (el('rloCari') ? el('rloCari').value : '').trim().toLowerCase();
    var f = el('rloFilter') ? el('rloFilter').value : '';
    return data.filter(function (x) {
      if (f && x.hasil !== f) return false;
      if (!q) return true;
      return (namaAnak(x, peta) + ' ' + (x.kelas || '') + ' ' + String(x.wa || '').slice(-4)).toLowerCase().indexOf(q) >= 0;
    });
  }

  function ringkas(peta) {
    var ok = 0, gagal = 0, akun = {}, gagalWa = {};
    data.forEach(function (x) {
      if (!hariIni(x.waktu)) return;
      if (x.hasil === 'berhasil') { ok++; akun[x.wa] = 1; } else { gagal++; gagalWa[x.wa] = (gagalWa[x.wa] || 0) + 1; }
    });
    var h = 'Hari ini: <b>' + ok + '</b> login berhasil dari <b>' + Object.keys(akun).length + '</b> akun, <b>' + gagal + '</b> gagal. <span style="color:#6b7280;">(dari ' + data.length + ' catatan terbaru)</span>';
    var perhatian = Object.keys(gagalWa).filter(function (k) { return gagalWa[k] >= 3; });
    if (perhatian.length) {
      h += '<div style="margin-top:6px;color:#92400e;">Perlu dicek, 3 kali gagal atau lebih hari ini: ' + perhatian.slice(0, 5).map(function (k) {
        var n = peta[k] ? ' (' + esc(peta[k].join(', ')) + ')' : '';
        return esc(samar(k)) + n + ' ' + gagalWa[k] + 'x';
      }).join('; ') + '</div>';
    }
    return h;
  }

  function render() {
    var l = el('rloList'); if (!l) return;
    var peta = petaNama(), baris = saring(peta);
    var rg = el('rloRingkas'); if (rg) rg.innerHTML = ringkas(peta);
    if (!baris.length) {
      l.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px;">' + (data.length ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan login. Catatan mulai terisi sejak versi ini dipasang.') + '</p>';
      return;
    }
    var h = baris.slice(0, tampil).map(function (x) {
      var ok = x.hasil === 'berhasil', nama = namaAnak(x, peta);
      var judul = nama ? esc(nama) + (x.kelas ? ' (' + esc(x.kelas) + ')' : '') : 'No. ' + esc(samar(x.wa));
      var sub = [ok ? (CARA[x.cara] || x.cara) : 'Gagal' + (x.detail ? ': ' + x.detail : ''), x.perangkat, nama ? samar(x.wa) : '', waktuTeks(x.waktu)].filter(Boolean).map(esc).join(' · ');
      return '<div class="log-item"><span><span class="log-icon">' + (ok ? '✅' : '❌') + '</span> <span class="log-user">' + judul + '</span>' +
        '<div style="font-size:12px;color:#6b7280;">' + sub + '</div></span></div>';
    }).join('');
    if (baris.length > tampil) h += '<button class="btn btn-soft" id="rloLagi" type="button" style="margin:8px 0;">Tampilkan lebih banyak (' + (baris.length - tampil) + ')</button>';
    l.innerHTML = h;
    var lg = el('rloLagi'); if (lg) lg.addEventListener('click', function () { tampil += BATAS_TAMPIL; render(); });
  }

  function muat() {
    if (!adminAktif() || typeof db === 'undefined') return Promise.resolve();
    if (navigator.onLine === false) { toast('📡 Butuh koneksi internet.', true); return Promise.resolve(); }
    if (sedang) return Promise.resolve();
    sedang = true;
    var l = el('rloList'); if (l) l.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px;">Memuat riwayat...</p>';
    return db.ref('ortu_login_log').orderByChild('waktu').limitToLast(BATAS_BACA).once('value').then(function (snap) {
      data = [];
      snap.forEach(function (c) { var v = c.val(); if (v) { v.key = c.key; data.push(v); } });
      data.reverse(); sudahMuat = true; tampil = BATAS_TAMPIL; render();
    }).catch(function (e) {
      console.error('[SI MAMBA] Gagal memuat ortu_login_log:', e);
      if (l) l.innerHTML = '<p style="font-size:13px;color:#b91c1c;padding:8px;">Gagal memuat riwayat. Pastikan Rules untuk ortu_login_log sudah dipasang.</p>';
    }).then(function () { sedang = false; });
  }

  function unduhCsv() {
    if (!data.length) return toast('Belum ada data untuk diunduh.', true);
    var peta = petaNama();
    // Isi node ortu_login_log bisa ditulis siapa pun yang login anonim, jadi sel yang diawali = + - @ (atau tab/CR) diberi
    // apostrof di depan supaya Excel tidak menjalankannya sebagai rumus.
    var q = function (v) { var t = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
    var baris = [['Waktu', 'Hasil', 'Cara', 'Perangkat', 'Versi', 'Anak', 'Kelas', 'Nomor WA (disamarkan)', 'Keterangan'].map(q).join(',')];
    saring(peta).forEach(function (x) {
      baris.push([waktuTeks(x.waktu), x.hasil, CARA[x.cara] || x.cara, x.perangkat, x.versi, namaAnak(x, peta), x.kelas, samar(x.wa), x.detail].map(q).join(','));
    });
    var blob = new Blob(['\ufeff' + baris.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'riwayat-login-ortu-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function bersihkan() {
    if (!adminAktif()) return toast('Hanya Admin!', true);
    if (sedangBersih) return;
    if (!confirm('Hapus catatan login orang tua yang lebih lama dari 90 hari? Tindakan ini tidak bisa dibatalkan.')) return;
    sedangBersih = true;
    var tombol = el('rloBersih'); if (tombol) tombol.disabled = true;
    var batas = new Date(Date.now() - 90 * 86400000).toISOString();
    db.ref('ortu_login_log').orderByChild('waktu').endAt(batas).limitToFirst(500).once('value').then(function (snap) {
      var tugas = [];
      snap.forEach(function (c) { tugas.push(c.ref.remove()); });
      return Promise.all(tugas).then(function () { return tugas.length; });
    }).then(function (n) {
      toast(n ? n + ' catatan lama dihapus.' + (n >= 500 ? ' Ulangi bila masih ada.' : '') : 'Tidak ada catatan yang lebih lama dari 90 hari.');
      return muat();
    }).catch(function (e) { console.error(e); toast('Gagal menghapus catatan lama.', true); })
      .then(function () { sedangBersih = false; var t2 = el('rloBersih'); if (t2) t2.disabled = false; });
  }

  function setupRiwayatLoginOrtu() {
    var kartu = el('riwayatLoginOrtuCard'); if (!kartu) return;
    var admin = adminAktif();
    kartu.style.display = admin ? 'block' : 'none';
    if (!admin) return;
    pasangKartuVersi();
    if (!terikat) {
      terikat = true;
      var on = function (id, ev, fn) { var e = el(id); if (e) e.addEventListener(ev, fn); };
      on('rloMuat', 'click', function () { muat(); });
      on('rloCsv', 'click', unduhCsv);
      on('rloBersih', 'click', bersihkan);
      on('rloCari', 'input', function () { tampil = BATAS_TAMPIL; render(); });
      on('rloFilter', 'change', function () { tampil = BATAS_TAMPIL; render(); });
    }
    if (sudahMuat) render(); else muat();
  }
  // ---------- Pembaruan Aplikasi Wali: pantau versi dari log + pengingat WhatsApp ----------
  // Tiap catatan login membawa versi aplikasi (v8.<build>). Perangkat = nomor WA + jenis perangkat; yang dihitung "sudah" bila
  // catatan TERBARU perangkat itu berversi >= BUILD_MIN. Wali yang belum memuat versi baru tidak mengirim versi, jadi tampil "belum".
  // Syarat memasang Rules Tahap B: daftar "belum" kosong (atau tinggal wali yang memang sudah tidak dipakai).
  // Pengingat TIDAK terkirim otomatis: tombol membuka WhatsApp (wa.me) dengan pesan terisi, pengirim menekan Kirim.
  // Tanda "diingatkan" disimpan di perangkat Admin ini saja.
  var BUILD_MIN = 378, vHasil = null, vTampil = 30;
  function buildDari(v) { var m = String(v == null ? '' : v).match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; }
  function digitWa(wa) { return String(wa == null ? '' : wa).replace(/\D/g, ''); }
  function namaMadrasah() { try { if (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) return MADRASAH.nama; } catch (e) {} return 'Madrasah'; }
  function basisUrl() { return location.origin + location.pathname.replace(/[^\/]*$/, ''); }
  // daftar catatan -> { perangkat, sudah, belum, akunBelum:[{wa, anak, kelas, perangkat:[..], terakhir}], akunTotal }
  function hitungVersi(daftar, buildMin) {
    var unit = {};
    daftar.forEach(function (x) {
      if (!x || !x.wa) return;
      var k = x.wa + '|' + (x.perangkat || '-');
      if (!unit[k] || String(x.waktu) > String(unit[k].waktu)) unit[k] = x;
    });
    var akun = {}, sudah = 0, belum = 0;
    Object.keys(unit).forEach(function (k) {
      var x = unit[k], baru = buildDari(x.versi) >= buildMin;
      if (baru) sudah++; else belum++;
      var a = akun[x.wa] = akun[x.wa] || { wa: x.wa, anak: '', kelas: '', perangkat: [], terakhir: '', adaBelum: false };
      if (x.anak && !a.anak) a.anak = x.anak;
      if (x.kelas && !a.kelas) a.kelas = x.kelas;
      if (!baru) { a.adaBelum = true; a.perangkat.push(x.perangkat || '-'); }
      if (String(x.waktu) > String(a.terakhir)) a.terakhir = x.waktu;
    });
    var daftarAkun = Object.keys(akun).map(function (k) { return akun[k]; });
    return { perangkat: sudah + belum, sudah: sudah, belum: belum, akunTotal: daftarAkun.length,
      akunBelum: daftarAkun.filter(function (a) { return a.adaBelum; }).sort(function (a, b) { return String(b.terakhir).localeCompare(String(a.terakhir)); }) };
  }
  function pesanPribadi(anak) {
    return 'Assalamu\u2019alaikum Bapak/Ibu' + (anak ? ' wali dari ' + anak : ' wali murid') + '.\n\n' +
      'Aplikasi Portal Wali Murid SI MAMBA ada pembaruan keamanan. Mohon buka aplikasi dengan internet aktif, lalu tekan "Perbarui aplikasi" bila muncul (atau tutup aplikasi lalu buka kembali):\n' + basisUrl() + '?app=ortu\n\n' +
      'Bila setelah itu tidak bisa masuk, mohon hubungi madrasah agar dikirimi link masuk yang baru.\n\nTerima kasih.\n' + namaMadrasah();
  }
  function pesanGrup() {
    return 'Assalamu\u2019alaikum Bapak/Ibu wali murid ' + namaMadrasah() + '.\n\n' +
      'Portal Wali Murid SI MAMBA diperbarui demi keamanan data. Mohon semua wali:\n' +
      '1. Buka aplikasi dengan internet aktif.\n' +
      '2. Tekan "Perbarui aplikasi" bila muncul, atau tutup aplikasi lalu buka kembali.\n\n' +
      'Alamat: ' + basisUrl() + '?app=ortu\n\n' +
      'Setelah diperbarui, bila tidak bisa masuk, silakan hubungi madrasah agar dikirimi link masuk yang baru.\n\nTerima kasih.\n' + namaMadrasah();
  }
  function tandaIngat(wa) { try { return +localStorage.getItem('rloIngat_' + wa) || 0; } catch (e) { return 0; } }
  function setIngat(wa) { try { localStorage.setItem('rloIngat_' + wa, String(Date.now())); } catch (e) {} }
  function bukaWa(nomor, teks) { window.open('https://wa.me/' + (nomor || '') + '?text=' + encodeURIComponent(teks), '_blank', 'noopener'); }

  function renderVersi() {
    var w = el('rloVersiHasil'); if (!w) return;
    if (!vHasil) { w.innerHTML = ''; return; }
    var r = vHasil, peta = petaNama();
    var aman = r.belum === 0;
    var h = '<div style="font-size:13px;margin:8px 0;">Dari <b>' + r.akunTotal + '</b> akun (<b>' + r.perangkat + '</b> perangkat) yang masuk dalam ' + esc(vHasil.hari) + ' hari terakhir: ' +
      '<b style="color:#047857;">' + r.sudah + ' sudah</b> memakai versi terbaru, <b style="color:' + (aman ? '#047857' : '#b45309') + ';">' + r.belum + ' belum</b>.</div>';
    h += aman && r.perangkat ? '<div style="font-size:13px;margin:6px 0;padding:8px 10px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;">Semua perangkat yang aktif sudah memakai versi terbaru. Aman memasang Rules Tahap B.</div>'
      : r.belum ? '<div style="font-size:13px;margin:6px 0;padding:8px 10px;border-radius:10px;background:#fffbeb;border:1px solid #fcd34d;">Tahap B sebaiknya menunggu sampai daftar "belum" di bawah kosong. Wali yang belum memperbarui tidak bisa masuk setelah Tahap B.</div>' : '';
    if (!r.perangkat) h += '<div style="font-size:13px;color:#6b7280;">Tidak ada catatan login pada rentang ini.</div>';
    // pengingat grup
    h += '<div style="margin:10px 0 4px;font-weight:700;font-size:13px;">Pengingat untuk grup WhatsApp</div>' +
      '<textarea id="rloPesanGrup" class="field" readonly style="width:100%;min-height:150px;font-size:12px;">' + esc(pesanGrup()) + '</textarea>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px;"><button class="btn btn-soft" type="button" id="rloSalinGrup">📋 Salin pesan</button>' +
      '<button class="btn btn-primary" type="button" id="rloWaGrup">💬 Buka WhatsApp (pilih grup)</button></div>';
    // pengingat pribadi
    if (r.belum) {
      h += '<div style="margin:6px 0 4px;font-weight:700;font-size:13px;">Belum memperbarui (' + r.akunBelum.length + ' akun)</div>';
      h += r.akunBelum.slice(0, vTampil).map(function (a, i) {
        var nama = a.anak || (peta[a.wa] ? peta[a.wa].join(', ') : ''), judul = nama ? esc(nama) + (a.kelas ? ' (' + esc(a.kelas) + ')' : '') : 'No. ' + esc(samar(a.wa));
        var t = tandaIngat(a.wa), sub = [a.perangkat.join(', '), nama ? samar(a.wa) : '', 'terakhir ' + waktuTeks(a.terakhir), t ? 'diingatkan ' + waktuTeks(new Date(t).toISOString()) : ''].filter(Boolean).map(esc).join(' · ');
        return '<div class="log-item" style="align-items:center;"><span style="flex:1;"><span class="log-user">' + judul + '</span><div style="font-size:12px;color:#6b7280;">' + sub + '</div></span>' +
          '<button class="btn ' + (t ? 'btn-soft' : 'btn-primary') + '" type="button" data-rlo-ingat="' + i + '" style="padding:3px 10px;font-size:12px;">💬 ' + (t ? 'Ingatkan lagi' : 'Ingatkan') + '</button></div>';
      }).join('');
      if (r.akunBelum.length > vTampil) h += '<button class="btn btn-soft" id="rloVersiLagi" type="button" style="margin:8px 0;">Tampilkan lebih banyak (' + (r.akunBelum.length - vTampil) + ')</button>';
    }
    w.innerHTML = h;
    var salin = el('rloSalinGrup'); if (salin) salin.addEventListener('click', function () {
      var ta = el('rloPesanGrup'), teks = ta ? ta.value : pesanGrup();
      var ok = function () { toast('Pesan disalin. Tempel di grup WhatsApp.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(ok, function () { ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} });
      else { ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Salin manual dari kotak pesan.', true); } }
    });
    var wg = el('rloWaGrup'); if (wg) wg.addEventListener('click', function () { bukaWa('', pesanGrup()); });
    Array.prototype.forEach.call(w.querySelectorAll('[data-rlo-ingat]'), function (b) {
      b.addEventListener('click', function () {
        var a = r.akunBelum[+b.getAttribute('data-rlo-ingat')]; if (!a) return;
        var nomor = digitWa(a.wa); if (!nomor) return toast('Nomor WA tidak valid.', true);
        var nama = a.anak || (peta[a.wa] ? peta[a.wa].join(', ') : '');
        bukaWa(nomor, pesanPribadi(nama)); setIngat(a.wa); renderVersi();
      });
    });
    var lg = el('rloVersiLagi'); if (lg) lg.addEventListener('click', function () { vTampil += 30; renderVersi(); });
  }

  function periksaVersi() {
    if (!adminAktif() || typeof db === 'undefined') return;
    if (navigator.onLine === false) return toast('📡 Butuh koneksi internet.', true);
    var hari = parseInt((el('rloVersiHari') || {}).value, 10) || 14, w = el('rloVersiHasil'), b = el('rloVersiCek');
    if (b) b.disabled = true;
    if (w) w.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px;">Memeriksa...</p>';
    var sejak = new Date(Date.now() - hari * 86400000).toISOString();
    db.ref('ortu_login_log').orderByChild('waktu').startAt(sejak).limitToLast(3000).once('value').then(function (snap) {
      var daftar = []; snap.forEach(function (c) { var v = c.val(); if (v) daftar.push(v); });
      vHasil = hitungVersi(daftar, BUILD_MIN); vHasil.hari = hari; vHasil.terpotong = daftar.length >= 3000; vTampil = 30;
      renderVersi();
      if (vHasil.terpotong && w) w.insertAdjacentHTML('afterbegin', '<div style="font-size:12px;color:#b45309;">Catatan: ada lebih dari 3000 catatan pada rentang ini, hanya 3000 terbaru yang dihitung. Persempit rentang hari.</div>');
    }).catch(function (e) {
      console.error('[SI MAMBA] Gagal memeriksa versi wali:', e);
      if (w) w.innerHTML = '<p style="font-size:13px;color:#b91c1c;padding:8px;">Gagal membaca riwayat login. Periksa koneksi atau Rules ortu_login_log.</p>';
    }).then(function () { var b2 = el('rloVersiCek'); if (b2) b2.disabled = false; });
  }
  function pasangKartuVersi() {
    var kartu = el('riwayatLoginOrtuCard'); if (!kartu || el('rloVersi')) return;
    var d = document.createElement('div'); d.id = 'rloVersi'; d.style.cssText = 'margin-bottom:14px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;';
    d.innerHTML = '<div style="font-weight:700;font-size:14px;margin-bottom:2px;">📲 Pembaruan Aplikasi Wali</div>' +
      '<div style="font-size:12px;color:#6b7280;margin-bottom:8px;">Memantau wali yang sudah memuat versi terbaru (v8.' + BUILD_MIN + ' ke atas) dari catatan login, sebagai syarat memasang Rules Tahap B. Wali yang belum membuka aplikasi sejak pembaruan tampil sebagai "belum".</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><select id="rloVersiHari" class="field" style="width:auto;"><option value="7">7 hari terakhir</option><option value="14" selected>14 hari terakhir</option><option value="30">30 hari terakhir</option></select>' +
      '<button class="btn btn-primary" type="button" id="rloVersiCek">🔍 Periksa versi wali</button></div><div id="rloVersiHasil"></div>';
    var ringkas = el('rloRingkas'); if (ringkas && ringkas.parentNode === kartu) kartu.insertBefore(d, ringkas); else kartu.appendChild(d);
    el('rloVersiCek').addEventListener('click', periksaVersi);
  }

  window.setupRiwayatLoginOrtu = setupRiwayatLoginOrtu;
})();
