/* SI MAMBA - js/kag-fix.js (v1)
   Perbaikan Kelola Absen Guru: Simpan/Hapus catatan ditolak "PERMISSION_DENIED".
   Penyebab umum: sesi Admin (sesi_admin/{uid}) belum aktif saat menulis ke teacher_attendance (Rules v2). Skrip ini
   memastikan sesi Admin siap (kredAdminSiap) SEBELUM kagSimpan()/kagHapus() jalan. Dimuat SESUDAH kelola-absen-guru.js. */
(function () {
  'use strict';
  function bungkus(nama) {
    var asli = window[nama];
    if (typeof asli !== 'function' || asli.__kagFix) return;
    var baru = function () {
      var self = this, args = arguments;
      var siap = (typeof window.kredAdminSiap === 'function') ? window.kredAdminSiap() : Promise.resolve(true);
      return Promise.resolve(siap).then(function () { return asli.apply(self, args); }, function (e) {
        try { toast('🔒 Sesi Admin gagal disiapkan: ' + ((e && e.message) || e) + ' — coba login ulang sebagai Admin.', true, 6000); } catch (x) {}
      });
    };
    baru.__kagFix = true;
    window[nama] = baru;
  }
  function pasang() { bungkus('kagSimpan'); bungkus('kagHapus'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
  window.addEventListener('load', pasang);
})();
