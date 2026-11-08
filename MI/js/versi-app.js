// ============================================================
// versi-app.js -- PENAMPIL VERSI APLIKASI + "Cek pembaruan" (fix_45)
// ============================================================
// Menampilkan nomor versi Service Worker yang AKTIF di footer menu samping (#versiAppInfo, tulisan "SI MAMBA 4.0 • Versi <nomor>").
// Klik tulisan itu -> panel: versi aktif, ada/tidaknya versi baru yang menunggu, tombol "Cek ulang" dan "Perbarui sekarang".
// TIDAK mengubah tombol "🔄 Perbarui" di kanan atas (#swUpdateBtn, milik app.js) dan tidak memaksa reload: pembaruan hanya
// dipasang setelah pengguna menekan "Perbarui sekarang" + konfirmasi (supaya isian absensi/jurnal tidak hilang).
// Cara kerja: nomor versi diminta lewat postMessage {type:'GET_VERSION'} ke sw.js (lihat listener 'message' di sw.js).
// Pengecekan ke server memakai registration.update() (perbandingan byte sw.js oleh browser) -- tidak mengunduh/menyimpan apa pun ke cache.
// Pengecekan senyap otomatis: 8 detik setelah dibuka, saat aplikasi kembali ke layar (paling sering 1x/15 menit), dan saat koneksi kembali.
// Tidak bergantung pada app.js; dimuat dengan defer.
// ============================================================
(function () {
  'use strict';
  var TIMEOUT_TANYA_MS = 1500, TIMEOUT_PASANG_MS = 20000, JEDA_CEK_MS = 15 * 60 * 1000, TUNDA_AWAL_MS = 8000;
  var terakhirCek = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function adaSW() { return typeof navigator !== 'undefined' && 'serviceWorker' in navigator; }
  function info(pesan, galat) { if (typeof toast === 'function') toast(pesan, !!galat, 6000); else alert(pesan); }

  // Tanya nomor versi ke satu Service Worker. null = tidak menjawab (mis. versi lama yang belum punya GET_VERSION).
  function tanyaVersi(sw) {
    return new Promise(function (res) {
      if (!sw) return res(null);
      var selesai = false, ch;
      try { ch = new MessageChannel(); } catch (e) { return res(null); }
      function beres(v) { if (selesai) return; selesai = true; clearTimeout(t); try { ch.port1.close(); } catch (e) { /* diabaikan */ } res(v); }
      var t = setTimeout(function () { beres(null); }, TIMEOUT_TANYA_MS);
      ch.port1.onmessage = function (e) { beres((e.data && e.data.version) || null); };
      try { sw.postMessage({ type: 'GET_VERSION' }, [ch.port2]); } catch (e) { beres(null); }
    });
  }

  function tungguTerpasang(sw, ms) {
    return new Promise(function (res) {
      if (!sw || sw.state !== 'installing') return res();
      var t = setTimeout(selesai, ms);
      function selesai() { clearTimeout(t); sw.removeEventListener('statechange', onUbah); res(); }
      function onUbah() { if (sw.state !== 'installing') selesai(); }
      sw.addEventListener('statechange', onUbah);
    });
  }

  // cekServer=true: minta browser membandingkan sw.js di server dengan yang terpasang (perlu online).
  async function ambilStatus(cekServer) {
    var st = { didukung: adaSW(), online: navigator.onLine !== false, aktif: null, menunggu: null, adaAktif: false, adaMenunggu: false, tidakTerdaftar: false, galat: '' };
    if (!st.didukung) return st;
    var reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { st.tidakTerdaftar = true; return st; }
    if (cekServer && st.online) {
      try {
        await reg.update();
        if (reg.installing) await tungguTerpasang(reg.installing, TIMEOUT_PASANG_MS);
      } catch (e) { st.galat = (e && e.message) || String(e); }
    }
    st.adaAktif = !!reg.active; st.adaMenunggu = !!reg.waiting;
    var v = await Promise.all([tanyaVersi(reg.active), tanyaVersi(reg.waiting)]);
    st.aktif = v[0]; st.menunggu = v[1];
    return st;
  }

  // Ringkasan status -> { t: 'ok'|'baru'|'galat'|'info', teks (HTML tepercaya) }. dicek = sudah memeriksa server pada pengecekan ini.
  function ringkas(st, dicek) {
    if (!st.didukung) return { t: 'info', teks: 'Browser ini tidak mendukung Service Worker, jadi aplikasi tidak memakai cache dan selalu memuat dari jaringan.' };
    if (st.tidakTerdaftar) return { t: 'info', teks: 'Service Worker belum terdaftar. Buka ulang aplikasi saat online.' };
    if (st.adaMenunggu) return { t: 'baru', teks: 'Versi baru ' + (st.menunggu ? '<b>' + esc(st.menunggu) + '</b> ' : '') + 'sudah diunduh dan menunggu diaktifkan. Simpan dulu isian yang sedang dikerjakan, lalu tekan <b>Perbarui sekarang</b>.' };
    if (dicek && !st.online) return { t: 'info', teks: 'Sedang offline, jadi server tidak bisa diperiksa. Versi di perangkat tetap bisa dipakai.' };
    if (st.galat) return { t: 'galat', teks: 'Gagal memeriksa server: ' + esc(st.galat) };
    if (!dicek) return { t: 'info', teks: 'Tekan <b>Cek ulang</b> untuk memeriksa server.' };
    if (st.aktif) return { t: 'ok', teks: 'Sudah versi terbaru: server tidak punya versi yang lebih baru dari yang aktif di perangkat ini.' };
    return { t: 'info', teks: 'Versi aktif belum melaporkan nomornya (versi lama, sebelum fitur ini) dan tidak ada versi baru yang terdeteksi di server. Bila baru saja memasang pembaruan, tutup aplikasi sepenuhnya lalu buka lagi.' };
  }

  function perbaruiLabel(st) {
    var el = document.getElementById('versiAppNo'), box = document.getElementById('versiAppInfo');
    if (!el) return;
    var teks = '–', baru = false;
    if (st && st.didukung && !st.tidakTerdaftar) {
      teks = st.aktif || 'lama';
      if (st.adaMenunggu) { teks += ' ⬆ ' + (st.menunggu || 'baru'); baru = true; }
    }
    el.textContent = teks;
    el.style.color = baru ? '#b45309' : '';
    el.style.fontWeight = baru ? '700' : '';
    if (box) box.style.opacity = baru ? '1' : '';
  }

  function jam() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  function bukaPanel() {
    if (document.getElementById('versiAppPanel')) return;
    var ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'versiAppPanel';
    ov.innerHTML = '<div class="modal-box" style="max-width:440px;" role="dialog" aria-modal="true" aria-labelledby="versiAppJudul">'
      + '<h3 id="versiAppJudul" style="font-size:18px;font-weight:700;margin-bottom:12px;">🔄 Versi &amp; Pembaruan Aplikasi</h3>'
      + '<div id="versiAppIsi" style="font-size:14px;line-height:1.6;">⏳ Memeriksa…</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">'
      + '<button type="button" class="btn btn-success" data-aksi="perbarui" style="flex:1;display:none;">⬆ Perbarui sekarang</button>'
      + '<button type="button" class="btn btn-soft" data-aksi="cek" style="flex:1;">🔍 Cek ulang</button>'
      + '<button type="button" class="btn btn-soft" data-aksi="tutup" style="flex:1;">Tutup</button></div></div>';
    document.body.appendChild(ov);
    var tutup = function () { document.removeEventListener('keydown', onKey, true); ov.classList.remove('show'); ov.remove(); };
    var onKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); tutup(); } };
    document.addEventListener('keydown', onKey, true);

    var periksa = async function () {
      var isi = ov.querySelector('#versiAppIsi'), btnPerbarui = ov.querySelector('[data-aksi="perbarui"]');
      isi.textContent = '⏳ Memeriksa…'; btnPerbarui.style.display = 'none';
      var st;
      try { st = await ambilStatus(true); } catch (e) { st = { didukung: true, online: navigator.onLine !== false, galat: (e && e.message) || String(e) }; }
      terakhirCek = Date.now(); perbaruiLabel(st);
      if (!ov.isConnected) return;   // panel sudah ditutup selama menunggu
      var r = ringkas(st, true);
      var warna = { ok: ['#dcfce7', '#166534', '✅'], baru: ['#fef3c7', '#92400e', '⬆'], galat: ['#fee2e2', '#991b1b', '❌'], info: ['#f3f4f6', '#374151', 'ℹ️'] }[r.t];
      isi.innerHTML = '<div>Versi aktif di perangkat ini: <b>' + esc(st.aktif || 'tidak melaporkan nomor') + '</b></div>'
        + (st.adaMenunggu ? '<div>Versi baru menunggu: <b>' + esc(st.menunggu || '?') + '</b></div>' : '')
        + '<div style="margin-top:8px;padding:10px 12px;border-radius:10px;background:' + warna[0] + ';color:' + warna[1] + ';">' + warna[2] + ' ' + r.teks + '</div>'
        + '<div style="margin-top:8px;font-size:12px;color:#6b7280;">Terakhir diperiksa: ' + jam() + '</div>';
      btnPerbarui.style.display = st.adaMenunggu ? '' : 'none';
    };
    ov.addEventListener('click', function (e) {
      if (e.target === ov) return tutup();
      var a = e.target.closest && e.target.closest('[data-aksi]'); if (!a) return;
      var aksi = a.getAttribute('data-aksi');
      if (aksi === 'tutup') tutup(); else if (aksi === 'cek') periksa(); else if (aksi === 'perbarui') perbaruiSekarang();
    });
    requestAnimationFrame(function () { ov.classList.add('show'); });
    periksa();
  }

  // Aktifkan versi yang menunggu: hanya setelah konfirmasi pengguna. Reload satu kali setelah Service Worker baru mengambil alih.
  async function perbaruiSekarang() {
    var reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.waiting) return info('Tidak ada versi baru yang menunggu.', true);
    if (!confirm('Aplikasi akan dimuat ulang untuk memakai versi baru.\n\nPastikan tidak ada isian (absensi, jurnal, dll.) yang belum disimpan. Lanjutkan?')) return;
    var sudah = false;
    var muat = function () { if (sudah) return; sudah = true; location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', muat);
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(muat, 6000);   // cadangan bila controllerchange tidak datang
  }

  // Pengecekan senyap: hanya memperbarui tulisan versi (+ satu pemberitahuan per versi baru). Tidak mengganggu pekerjaan.
  async function cekSenyap() {
    if (!adaSW() || navigator.onLine === false) return;
    try {
      var st = await ambilStatus(true);
      terakhirCek = Date.now(); perbaruiLabel(st);
      if (st.adaMenunggu) {
        var k = st.menunggu || 'baru', sudah = false;
        try { sudah = sessionStorage.getItem('versiAppBeritahu') === k; sessionStorage.setItem('versiAppBeritahu', k); } catch (e) { /* storage tidak tersedia */ }
        if (!sudah) info('🔄 Versi baru aplikasi tersedia. Tekan 🔄 Perbarui (kanan atas) atau klik nomor versi di menu samping.');
      }
    } catch (e) { console.warn('[SI MAMBA] cek versi senyap gagal:', e && e.message || e); }
  }

  function init() {
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#versiAppInfo')) bukaPanel(); });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.id === 'versiAppInfo') { e.preventDefault(); bukaPanel(); }
    });
    if (!adaSW()) { perbaruiLabel({ didukung: false }); return; }
    ambilStatus(false).then(perbaruiLabel).catch(function () { /* label tetap "cek versi" */ });
    setTimeout(cekSenyap, TUNDA_AWAL_MS);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && Date.now() - terakhirCek > JEDA_CEK_MS) cekSenyap(); });
    window.addEventListener('online', cekSenyap);
    navigator.serviceWorker.addEventListener('controllerchange', function () { ambilStatus(false).then(perbaruiLabel).catch(function () { /* diabaikan */ }); });
  }

  window.__versiApp = { ambilStatus: ambilStatus, ringkas: ringkas, tanyaVersi: tanyaVersi };   // untuk pengujian/debug di Console
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
