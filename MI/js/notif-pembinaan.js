/* ============================================================
   SI MAMBA - js/notif-pembinaan.js (v1)
   Notifikasi lonceng untuk WALI KELAS, KEPALA MADRASAH, dan ADMIN bila total poin pelanggaran seorang siswa (tahun ajaran ini) mencapai ambang
   pembinaan (school_settings/sikapAmbang, diatur Admin di kartu Sikap & Kedisiplinan).

   Cara kerja:
   - Tidak mengubah app.js / v4-pengaturan-notif-rapor.js. Memakai node 'notifications_v4' yang SUDAH dipakai lonceng
     (field sama persis: userKey, title, message, type, referenceType, referenceId, isRead, createdAt, tahunAjaran).
   - Pemeriksaan dijalankan di akhir render kartu Sikap (js/dashboard-sikap.js v5 memanggil window.SIMambaNotifPembinaan)
     dan setelah v4LoadNotifications() selesai. Data yang dipakai sudah ada di memori (allKedisiplinan, allGuru, V4.notifications),
     jadi TIDAK ada query baca tambahan.
   - [v2] Penerima: Wali Kelas siswa (kunci pb_<siswa>_<TA>), Kepala Madrasah (userKey __kepsek__, akhiran _kep), dan Admin (userKey __admin__,
     akhiran _adm). Pemeriksaan juga dipicu langsung saat catatan sikap disimpan (js/sikap-buku.js v3), jadi lonceng tidak menunggu dashboard dibuka.
   - Satu notifikasi per siswa per tahun ajaran per penerima: kunci tetap pb_<siswaKey>_<TA>[_kep|_adm]. Dibuat lewat transaction "buat bila belum ada",
     jadi Admin dan Wali Kelas yang membuka aplikasi bersamaan tidak menggandakan notifikasi, dan notifikasi yang sudah
     dibaca tidak muncul lagi. Menaikkan/menurunkan ambang tidak menghasilkan notifikasi ulang untuk siswa yang sudah diberi.
   - Wali = guru yang waliKelasOf-nya sama dengan kelas siswa (data allGuru); kelas tanpa wali tidak membuat notifikasi wali (Kepsek & Admin tetap).
   - Yang membuat notifikasi: siapa pun yang datanya memuat siswa itu (Admin/Kepsek: semua kelas; Wali Kelas: kelasnya).
     Bila Firebase Rules menolak penulisan ke notifications_v4 untuk penerima lain, hanya console.warn (tidak mengganggu pengguna).
   - Dimuat SESUDAH app.js, v4-pengaturan-notif-rapor.js, dan dashboard-sikap.js.
============================================================ */
(function () {
  'use strict';

  var notifSiap = false;          // true setelah v4LoadNotifications() selesai (supaya pengecekan lokal V4.notifications valid)
  var mulaiCek = 0;               // waktu pengecekan pertama; bila lonceng tak kunjung dimuat, lanjut setelah BATAS_TUNGGU
  var BATAS_TUNGGU = 10000;
  var sudah = {};                 // kunci notifikasi yang sudah diproses sesi ini
  var sibuk = false;

  function kunciNotif(siswaKey, ta) {
    return ('pb_' + siswaKey + '_' + String(ta || '')).replace(/[^A-Za-z0-9_-]/g, '');
  }

  function waliKelas(kelas) {
    var daftar = (typeof allGuru !== 'undefined' && Array.isArray(allGuru)) ? allGuru : [];
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i] && daftar[i].waliKelasOf && daftar[i].waliKelasOf === kelas) return daftar[i];
    }
    return null;
  }

  function adaLokal(id) {
    try { return !!(V4 && Array.isArray(V4.notifications) && V4.notifications.some(function (n) { return n && n.key === id; })); }
    catch (e) { return false; }
  }

  function kunciAdmin() { return (typeof ADMIN_USER_KEY !== 'undefined') ? ADMIN_USER_KEY : '__admin__'; }
  function kunciKepsek() { return (typeof KEPSEK_USER_KEY !== 'undefined') ? KEPSEK_USER_KEY : '__kepsek__'; }

  function pesanUntuk(peran, x, wali) {
    var inti = (x.nama || 'Siswa') + ' (' + (x.kelas || '-') + ') mencapai ' + x.poin + ' poin pelanggaran, batas pembinaan ' + x.ambang + ' poin.';
    if (peran === 'wali') return inti + ' Buka kartu Sikap & Kedisiplinan di Dashboard, lalu buat surat panggilan orang tua bila perlu.';
    return inti + (wali ? ' Wali Kelas: ' + (wali.name || '-') + '.' : ' Kelas ini belum punya Wali Kelas.') + ' Surat panggilan orang tua tersedia di menu Surat & Ijin.';
  }

  function buat(id, tujuan, pesan, x, ta) {
    var data = {
      userKey: tujuan,
      title: 'Siswa perlu pembinaan',
      message: pesan,
      type: 'ACTION',
      referenceType: 'PEMBINAAN',
      referenceId: x.key,
      isRead: false,
      createdAt: new Date().toISOString(),
      tahunAjaran: ta || ''
    };
    return db.ref('notifications_v4/' + id).transaction(function (cur) { return cur ? undefined : data; }).then(function (hasil) {
      if (hasil && hasil.committed && currentUser && (tujuan === currentUser.key || tujuan === currentUser.name)) {
        // notifikasi untuk diri sendiri: tampilkan di lonceng tanpa unduh ulang
        try {
          if (!adaLokal(id)) V4.notifications.push(Object.assign({ key: id }, data));
          if (typeof v4RenderNotifications === 'function') v4RenderNotifications();
        } catch (e) { /* tampilan akan menyusul pada pemuatan berikutnya */ }
      }
    });
  }

  var ulang = false;              // cek() dipanggil lagi saat masih menulis -> jalankan sekali lagi setelah selesai
  function cek() {
    if (sibuk) { ulang = true; return; }
    try {
      if (typeof currentUser === 'undefined' || !currentUser) return;
      if (typeof window.SIMambaSikapPembinaan !== 'function' || typeof db === 'undefined') return;
      if (!notifSiap) {
        if (!mulaiCek) mulaiCek = Date.now();
        if (Date.now() - mulaiCek < BATAS_TUNGGU) { setTimeout(cek, 1500); return; }
      }
      var ta = (typeof currentTahunAjaran !== 'undefined') ? currentTahunAjaran : '';
      var antri = [];
      window.SIMambaSikapPembinaan().forEach(function (x) {
        var dasar = kunciNotif(x.key, ta), wali = waliKelas(x.kelas);
        var penerima = [];
        if (wali) penerima.push({ id: dasar, tujuan: wali.key || wali.name, peran: 'wali' });
        penerima.push({ id: dasar + '_kep', tujuan: kunciKepsek(), peran: 'kepsek' });
        penerima.push({ id: dasar + '_adm', tujuan: kunciAdmin(), peran: 'admin' });
        penerima.forEach(function (r) {
          if (!r.tujuan || sudah[r.id]) return;
          sudah[r.id] = true;                               // tandai dulu: jangan diulang walau gagal (hindari badai penulisan)
          if (adaLokal(r.id)) return;
          antri.push({ id: r.id, tujuan: r.tujuan, pesan: pesanUntuk(r.peran, x, wali), x: x });
        });
      });
      if (!antri.length) return;
      sibuk = true;
      Promise.all(antri.map(function (a) {
        return buat(a.id, a.tujuan, a.pesan, a.x, ta).catch(function (err) { console.warn('[SI MAMBA] Notifikasi pembinaan gagal (' + a.id + '):', err && err.message || err); });
      })).then(function () { sibuk = false; if (ulang) { ulang = false; cek(); } }, function () { sibuk = false; });
    } catch (e) { sibuk = false; console.warn('[SI MAMBA] notif-pembinaan gagal:', e); }
  }

  window.SIMambaNotifPembinaan = cek;

  function pasang() {
    var asli = window.v4LoadNotifications;
    if (typeof asli === 'function' && !asli._npb) {
      var baru = function () {
        var p = asli.apply(this, arguments);
        Promise.resolve(p).then(function () { notifSiap = true; setTimeout(cek, 0); }, function () { /* lonceng gagal dimuat: cek() lanjut sendiri setelah batas tunggu */ });
        return p;
      };
      baru._npb = true;
      window.v4LoadNotifications = baru;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
