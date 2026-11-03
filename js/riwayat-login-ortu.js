// ============================================================
// RIWAYAT LOGIN ORANG TUA (tampilan Admin) -- js/riwayat-login-ortu.js
// Membaca node ortu_login_log yang ditulis portal-ortu.js (ortuCatatRiwayatLogin).
// Tampil sebagai kartu di halaman Admin (#riwayatLoginOrtuCard), hanya untuk Admin.
// Dimuat SESUDAH app.js. Nomor WA disamarkan di layar dan di CSV.
// Data dibaca sekali per sesi (300 catatan terbaru) dan saat tombol Muat Ulang ditekan, untuk menghemat kuota.
// ============================================================
(function () {
  'use strict';
  var BATAS_BACA = 300, BATAS_TAMPIL = 100;
  var data = [], tampil = BATAS_TAMPIL, terikat = false, sudahMuat = false, sedang = false;
  var CARA = { pin: 'PIN', pertama: 'Masuk pertama kali', otomatis: 'Otomatis (perangkat diingat)' };

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
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var baris = [['Waktu', 'Hasil', 'Cara', 'Perangkat', 'Anak', 'Kelas', 'Nomor WA (disamarkan)', 'Keterangan'].map(q).join(',')];
    saring(peta).forEach(function (x) {
      baris.push([waktuTeks(x.waktu), x.hasil, CARA[x.cara] || x.cara, x.perangkat, namaAnak(x, peta), x.kelas, samar(x.wa), x.detail].map(q).join(','));
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
    if (!confirm('Hapus catatan login orang tua yang lebih lama dari 90 hari? Tindakan ini tidak bisa dibatalkan.')) return;
    var batas = new Date(Date.now() - 90 * 86400000).toISOString();
    db.ref('ortu_login_log').orderByChild('waktu').endAt(batas).limitToFirst(500).once('value').then(function (snap) {
      var tugas = [];
      snap.forEach(function (c) { tugas.push(c.ref.remove()); });
      return Promise.all(tugas).then(function () { return tugas.length; });
    }).then(function (n) {
      toast(n ? n + ' catatan lama dihapus.' + (n >= 500 ? ' Ulangi bila masih ada.' : '') : 'Tidak ada catatan yang lebih lama dari 90 hari.');
      return muat();
    }).catch(function (e) { console.error(e); toast('Gagal menghapus catatan lama.', true); });
  }

  function setupRiwayatLoginOrtu() {
    var kartu = el('riwayatLoginOrtuCard'); if (!kartu) return;
    var admin = adminAktif();
    kartu.style.display = admin ? 'block' : 'none';
    if (!admin) return;
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
  window.setupRiwayatLoginOrtu = setupRiwayatLoginOrtu;
})();
