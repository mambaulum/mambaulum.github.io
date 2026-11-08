/* ============================================================
   SI MAMBA - js/absen-manual-gps.js (v2: lencana jumlah permintaan di menu "Absen Guru" + toast saat ada permintaan baru, khusus Admin/Kepala)
   Jalur KONFIRMASI MANUAL oleh Admin untuk guru yang GPS-nya bermasalah saat scan QR Absen.

   ALUR
   1) Guru scan QR Absensi resmi (QR terbaca & cocok), tetapi langkah GPS gagal ("terlalu jauh", "gagal mengambil lokasi",
      "perangkat tidak mendukung GPS"). Di bawah status muncul tombol "Minta Konfirmasi Admin".
   2) Permintaan disimpan di node absen_manual_requests/<tanggal>_<guruKey>_<Datang|Pulang> (key tetap -> tidak ganda),
      status PENDING, berisi jam scan QR, jenis (Datang/Pulang) dan pesan GPS yang muncul.
   3) Admin / Kepala Madrasah melihat kartu "Permintaan Konfirmasi Absen" di halaman Absen Guru -> Setujui / Tolak.
      Setujui = menulis teacher_attendance/<tanggal>_<guruKey>_<jenis> (metode 'qr_manual_admin', jam = jam scan QR guru),
      Tolak = hanya mengubah status (alasan opsional).

   SYARAT: node absen_manual_requests perlu Rules (lihat CATATAN-DEPLOY.txt). Dimuat SESUDAH js/app.js.
   Bergantung pada (app.js): db, currentUser, toast, tglLokal, menitWIB, getJamAbsenWindow, v4DeteksiTipeAbsenGuru, currentTahunAjaran,
   addLog, bumpTaRev, allTeacherAttendance, isAdmin, isKepsek, isTeacher, isWaliKelas, isReallyOnline, escapeHtml.
   ============================================================ */
(function () {
  'use strict';
  var NODE = 'absen_manual_requests';
  var qrOkAt = 0;                       // kapan QR resmi terakhir terbaca di perangkat ini
  var statusGpsTerakhir = '';           // teks status GPS bermasalah (disimpan sebagai bukti)

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bolehAdmin() { try { return isAdmin() || (typeof isKepsek === 'function' && isKepsek()); } catch (e) { return false; } }
  function guruKeyAman() { return currentUser.key || String(currentUser.name || '').replace(/[^a-zA-Z0-9]/g, '_'); }
  function teksBersih(html) { var d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300); }
  // Rules teacher_attendance butuh sesi Admin terisi sebelum Admin/Kepala menulis catatan absen guru. Tidak pernah menolak.
  // Admin -> kredAdminSiap (sesi_admin); Kepala Madrasah -> kredKepsekSiap (sesi_kepsek, Kunci Kepala terpisah). Galat jelas (mis. Kunci belum diisi)
  // diteruskan supaya pengguna tahu sebabnya; bila penyiapan hanya LAMBAT (>8 dtk) penulisan tetap dicoba dan server yang memutuskan.
  function siapAdmin() {
    try {
      var kep = (typeof isKepsek === 'function' && isKepsek()) && !(typeof isAdmin === 'function' && isAdmin());
      var fn = kep ? window.kredKepsekSiap : window.kredAdminSiap;
      if (typeof fn !== 'function') return Promise.resolve(true);
      return Promise.race([Promise.resolve(fn()), new Promise(function (r) { setTimeout(r, 8000); })]);
    } catch (e) { return Promise.resolve(true); }
  }
  function jamTeks(ms) { try { return new Date(Number(ms)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }); } catch (e) { return '-'; } }

  // ---------- Sisi GURU ----------
  function pasangTombolGuru() {
    var st = $('faceStatus'); if (!st || st.dataset.amg === '1') return;
    st.dataset.amg = '1';
    var obs = new MutationObserver(function () { sesuaikanTombol(st); });
    obs.observe(st, { childList: true, characterData: true, subtree: true });
  }
  function sesuaikanTombol(st) {
    var teks = (st.textContent || '').replace(/\s+/g, ' ');
    var gpsBermasalah = /terlalu jauh|Gagal mengambil lokasi GPS|tidak mendukung GPS/i.test(teks);
    var tb = $('btnMintaKonfirmasiAbsen');
    var perluTombol = gpsBermasalah && qrOkAt && (Date.now() - qrOkAt) < 5 * 60 * 1000 && currentUser && (isTeacher() || isWaliKelas());
    if (!perluTombol) { if (tb) tb.style.display = 'none'; return; }
    statusGpsTerakhir = teksBersih(st.innerHTML);
    if (!tb) {
      tb = document.createElement('button'); tb.id = 'btnMintaKonfirmasiAbsen'; tb.type = 'button'; tb.className = 'btn btn-warning';
      tb.style.cssText = 'display:block;width:100%;margin-top:10px;';
      tb.textContent = '📨 Minta Konfirmasi Admin (GPS bermasalah)';
      tb.addEventListener('click', mintaKonfirmasi);
      st.parentNode.insertBefore(tb, st.nextSibling);
    }
    tb.style.display = 'block';
  }
  function mintaKonfirmasi() {
    if (!currentUser) return;
    if (!(qrOkAt && (Date.now() - qrOkAt) < 5 * 60 * 1000)) return toast('⚠️ Scan QR Absensi dulu (QR harus terbaca resmi), lalu ajukan lagi.', true);
    if (typeof isReallyOnline === 'function' && !isReallyOnline()) return toast('📡 Butuh internet untuk mengirim permintaan ke Admin.', true);
    var jenis = (typeof v4DeteksiTipeAbsenGuru === 'function') ? v4DeteksiTipeAbsenGuru() : 'Datang';
    if (!jenis) return toast('✅ Anda sudah absen Datang & Pulang hari ini.', true);
    var alasan = prompt('Kirim permintaan konfirmasi absen ' + jenis + ' ke Admin?\n\nTulis keterangan singkat (mis. "GPS tidak aktif di HP saya"):', 'GPS HP bermasalah');
    if (alasan === null) return;
    var today = tglLokal(), key = today + '_' + guruKeyAman() + '_' + jenis, ref = db.ref(NODE + '/' + key), tb = $('btnMintaKonfirmasiAbsen');
    if (tb) { tb.disabled = true; tb.textContent = '⏳ Mengirim...'; }
    var data = {
      tanggal: today, guru: currentUser.name, guruKey: currentUser.key || null, kelas: currentUser.kelas || [], type: jenis, waktu: qrOkAt,
      alasan: String(alasan || '').trim().slice(0, 200), infoGps: statusGpsTerakhir, tahunAjaran: (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : ''),
      requestedBy: currentUser.name, status: 'PENDING', createdAt: new Date().toISOString()
    };
    ref.transaction(function (cur) { if (cur && cur.status === 'PENDING') return; return data; }, function (err, committed) {
      if (tb) { tb.disabled = false; tb.textContent = '📨 Minta Konfirmasi Admin (GPS bermasalah)'; }
      if (err) return toast('❌ Gagal mengirim permintaan: ' + err.message, true);
      var st = $('faceStatus');
      if (!committed) { toast('ℹ️ Permintaan ' + jenis + ' hari ini sudah terkirim dan menunggu Admin.', false, 4000); return; }
      if (st) { st.innerHTML = '📨 Permintaan konfirmasi absen <b>' + esc(jenis) + '</b> terkirim ke Admin. Mohon tunggu persetujuan.'; st.style.background = '#dbeafe'; st.style.color = '#1e3a8a'; st.style.borderColor = '#2563eb'; }
      if (tb) tb.style.display = 'none';
      toast('📨 Permintaan terkirim ke Admin.');
      try { addLog('minta_konfirmasi_absen_gps', currentUser.name + ' - ' + key); } catch (e) {}
    });
  }

  // ---------- Sisi ADMIN / KEPALA ----------
  var daftar = {};   // key -> data (PENDING)
  function pastikanKartu() {
    var kartu = $('absenManualCard'); if (kartu) return kartu;
    var anchor = $('earlyLeaveApprovalSection'); if (!anchor || !anchor.parentNode) return null;
    kartu = document.createElement('div'); kartu.id = 'absenManualCard'; kartu.style.cssText = 'display:none;margin-bottom:14px;';
    kartu.innerHTML = '<div class="card" style="border:1px solid #fcd34d;background:#fffbeb;"><h3 style="margin:0 0 6px;">📨 Permintaan Konfirmasi Absen (GPS bermasalah)</h3>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 10px;">Guru ini sudah scan QR Absensi resmi tetapi GPS-nya gagal/terlalu jauh. Setujui bila Anda yakin guru memang hadir di madrasah. Jam absen = jam scan QR guru.</p>' +
      '<div id="absenManualList"></div></div>';
    anchor.parentNode.insertBefore(kartu, anchor);
    return kartu;
  }
  function renderAdmin() {
    if (!bolehAdmin()) return;
    var kartu = pastikanKartu(); if (!kartu) return;
    if (typeof db === 'undefined' || !db) return;
    db.ref(NODE).orderByChild('status').equalTo('PENDING').once('value').then(function (snap) {
      daftar = {}; snap.forEach(function (ch) { var v = ch.val() || {}; v._key = ch.key; daftar[ch.key] = v; });
      var keys = Object.keys(daftar).sort();
      var el = $('absenManualList');
      kartu.style.display = keys.length ? 'block' : 'none';
      if (!el) return;
      el.innerHTML = keys.map(function (k) {
        var d = daftar[k];
        return '<div style="border-top:1px solid #fde68a;padding:10px 0;">' +
          '<div><b>' + esc(d.guru) + '</b> &bull; ' + esc(d.type) + ' &bull; ' + esc(d.tanggal) + ' pukul ' + esc(jamTeks(d.waktu)) + ' WIB</div>' +
          (d.alasan ? '<div style="font-size:13px;">Keterangan guru: ' + esc(d.alasan) + '</div>' : '') +
          (d.infoGps ? '<div class="text-muted" style="font-size:12px;">Info GPS: ' + esc(d.infoGps) + '</div>' : '') +
          '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-success" style="padding:5px 12px;font-size:12px;" data-amg-ok="' + esc(k) + '">✅ Setujui</button>' +
          '<button class="btn btn-danger" style="padding:5px 12px;font-size:12px;" data-amg-no="' + esc(k) + '">✖ Tolak</button></div></div>';
      }).join('');
      el.querySelectorAll('[data-amg-ok]').forEach(function (b) { b.addEventListener('click', function () { setujui(b.getAttribute('data-amg-ok'), b); }); });
      el.querySelectorAll('[data-amg-no]').forEach(function (b) { b.addEventListener('click', function () { tolak(b.getAttribute('data-amg-no'), b); }); });
    }).catch(function (e) { console.warn('[SI MAMBA] Permintaan konfirmasi absen gagal dimuat:', e && e.message ? e.message : e); });
  }
  function keteranganJam(d) {
    var w = new Date(Number(d.waktu)), menit = menitWIB(w), win, a;
    try {
      if (d.type === 'Datang') {
        win = getJamAbsenWindow('Datang'); a = win.selesai.split(':'); var sel = parseInt(a[0], 10) * 60 + parseInt(a[1], 10);
        if (menit > sel) return 'Telat ' + (menit - sel) + ' menit';
      } else {
        win = getJamAbsenWindow('Pulang'); a = win.mulai.split(':'); var mul = parseInt(a[0], 10) * 60 + parseInt(a[1], 10);
        var b = win.selesai.split(':'), sel2 = parseInt(b[0], 10) * 60 + parseInt(b[1], 10);
        if (menit < mul) return 'Pulang lebih awal ' + (mul - menit) + ' menit dari jadwal (' + win.mulai + ')';
        if (menit > sel2) return 'Pulang lebih lambat ' + (menit - sel2) + ' menit dari jadwal (' + win.selesai + ')';
      }
    } catch (e) { /* jendela jam tidak terbaca: tanpa keterangan telat */ }
    return '';
  }
  function setujui(key, btn) {
    var d = daftar[key]; if (!d || !bolehAdmin()) return;
    if (!confirm('Setujui absen ' + d.type + ' ' + d.guru + ' (' + d.tanggal + ' pukul ' + jamTeks(d.waktu) + ' WIB)?')) return;
    if (btn) btn.disabled = true;
    var kunciAbsen = d.tanggal + '_' + (d.guruKey || String(d.guru || '').replace(/[^a-zA-Z0-9]/g, '_')) + '_' + d.type;
    var telat = keteranganJam(d);
    var ket = 'Dikonfirmasi Admin (GPS bermasalah) oleh ' + currentUser.name + (telat ? ' · ' + telat : '') + (d.alasan ? ' · Alasan guru: ' + d.alasan : '');
    var baru = { tanggal: d.tanggal, guru: d.guru, guruKey: d.guruKey || null, kelas: d.kelas || [], waktu: Number(d.waktu), type: d.type, tahunAjaran: d.tahunAjaran || (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : ''), metode: 'qr_manual_admin', verified: true, keterangan: ket };
    siapAdmin().then(function () { db.ref('teacher_attendance/' + kunciAbsen).transaction(function (cur) { if (cur !== null) return; return baru; }, function (err, committed, snap) {
      if (err) { if (btn) btn.disabled = false; return toast('❌ Gagal menyimpan absen: ' + err.message, true); }
      var catatan = committed ? '' : 'Absen ' + d.type + ' sudah tercatat sebelumnya (tidak ditimpa)';
      db.ref(NODE + '/' + key).update({ status: 'APPROVED', approvedBy: currentUser.name, approvedAt: new Date().toISOString(), catatan: catatan }).then(function () {
        if (committed) { try { allTeacherAttendance.push(Object.assign({ key: kunciAbsen }, baru)); bumpTaRev(); } catch (e) {} }
        toast(committed ? '✅ Absen ' + d.type + ' ' + d.guru + ' dicatat.' : 'ℹ️ ' + catatan + '. Permintaan ditutup.');
        try { addLog('setuju_absen_manual_gps', d.guru + ' - ' + kunciAbsen); } catch (e) {}
        renderAdmin(); try { if (typeof renderTeacherAttendance === 'function') renderTeacherAttendance(); } catch (e) {}
      }).catch(function (e) { toast('❌ Absen tersimpan, tetapi status permintaan gagal diubah: ' + e.message, true); renderAdmin(); });
    }); }, function (e) { if (btn) btn.disabled = false; toast('❌ ' + ((e && e.message) || 'Sesi belum siap.'), true); });
  }
  function tolak(key, btn) {
    var d = daftar[key]; if (!d || !bolehAdmin()) return;
    var alasan = prompt('Tolak permintaan absen ' + d.type + ' ' + d.guru + '?\n\nAlasan penolakan (opsional):', '');
    if (alasan === null) return;
    if (btn) btn.disabled = true;
    db.ref(NODE + '/' + key).update({ status: 'REJECTED', approvedBy: currentUser.name, approvedAt: new Date().toISOString(), catatan: String(alasan || '').slice(0, 200) }).then(function () {
      toast('Permintaan ditolak.'); try { addLog('tolak_absen_manual_gps', d.guru + ' - ' + key); } catch (e) {}
      renderAdmin();
    }).catch(function (e) { if (btn) btn.disabled = false; toast('❌ Gagal: ' + e.message, true); });
  }

  // ---------- Kait ke app.js (dipasang setelah semua skrip termuat) ----------
  function pasang() {
    // QR resmi terbaca? (sama dengan pencocokan token di v4HandleQrDetected)
    if (typeof v4HandleQrDetected === 'function' && !v4HandleQrDetected._amg) {
      var asli = v4HandleQrDetected;
      var bungkus = function (data) {
        try { if (V4 && V4.absenQr && V4.absenQr.token && String(data).trim() === String(V4.absenQr.token).trim()) qrOkAt = Date.now(); } catch (e) {}
        return asli.apply(this, arguments);
      };
      bungkus._amg = true; window.v4HandleQrDetected = bungkus;
    }
    // Kartu Admin ikut dimuat saat halaman Absen Guru dirender.
    if (typeof renderEarlyLeaveApprovals === 'function' && !renderEarlyLeaveApprovals._amg) {
      var asli2 = renderEarlyLeaveApprovals;
      var bungkus2 = function () { var r = asli2.apply(this, arguments); try { renderAdmin(); } catch (e) {} return r; };
      bungkus2._amg = true; window.renderEarlyLeaveApprovals = bungkus2;
    }
    pasangTombolGuru();
  }
  window.addEventListener('load', function () {
    pasang();
    var n = 0, t = setInterval(function () { n++; pasangTombolGuru(); if ((($('faceStatus') || {}).dataset || {}).amg === '1' || n > 60) clearInterval(t); }, 1000);
  });
  // ---------- Lencana & pemberitahuan untuk Admin / Kepala ----------
  // Satu pendengar (listener) realtime pada permintaan berstatus PENDING saja: hanya perubahan kecil yang diunduh, bukan seluruh node.
  var pendengar = null, jumlahPending = -1, sudahToast = false;
  function pasangLencana(n) {
    var item = document.querySelectorAll('.menu-item[data-page="teacher-attendance"]');
    Array.prototype.forEach.call(item, function (m) {
      var b = m.querySelector('.amg-badge');
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('span'); b.className = 'amg-badge'; b.style.cssText = 'margin-left:6px;background:#dc2626;color:#fff;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:700;'; m.appendChild(b); }
      b.textContent = n; b.title = n + ' permintaan konfirmasi absen menunggu persetujuan';
    });
  }
  function pasangPendengar() {
    if (pendengar || typeof db === 'undefined' || !db) return;
    try {
      pendengar = db.ref(NODE).orderByChild('status').equalTo('PENDING');
      pendengar.on('value', function (snap) {
        var n = snap.numChildren(), lama = jumlahPending; jumlahPending = n; pasangLencana(n);
        if (n > 0 && (lama < n) && (!sudahToast || lama >= 0)) {
          sudahToast = true;
          toast('📨 ' + n + ' permintaan konfirmasi absen guru menunggu persetujuan (menu Absen Guru).', false, 6000);
        }
        var kartu = $('absenManualCard'); if (kartu && kartu.style.display !== 'none' || (n > 0 && $('absenManualCard'))) { try { renderAdmin(); } catch (e) {} }
      }, function (err) { console.warn('[SI MAMBA] Pendengar permintaan konfirmasi absen ditolak:', err && err.message ? err.message : err); pendengar = null; });
    } catch (e) { pendengar = null; }
  }
  function lepasPendengar() {
    if (pendengar) { try { pendengar.off(); } catch (e) {} pendengar = null; }
    jumlahPending = -1; sudahToast = false; pasangLencana(0);
  }
  setInterval(function () {
    try {
      if (typeof currentUser === 'undefined' || !currentUser || !bolehAdmin()) { if (pendengar) lepasPendengar(); return; }
      pasangPendengar();
      if (jumlahPending > 0) pasangLencana(jumlahPending);   // menu bisa dibangun ulang oleh skrip lain
    } catch (e) { /* abaikan */ }
  }, 3000);

  window.AbsenManualGps = { muat: renderAdmin };
})();
