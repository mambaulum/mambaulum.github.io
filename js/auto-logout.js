/* ============================================================
   SI MAMBA - js/auto-logout.js
   Logout otomatis kalau pengguna tidak beraktivitas.

   CARA KERJA
   - Script klasik biasa, dimuat SESUDAH js/app.js (butuh currentUser, toast, logout).
   - Memakai jam sistem (Date.now) yang dicek berkala, BUKAN setTimeout panjang, karena
     timer di tab latar / HP yang tidur bisa tertunda. Saat tab kembali tampil
     (visibilitychange) pengecekan dijalankan langsung.
   - Hanya aktif kalau currentUser terisi; tidak perlu dipanggil dari login().
   - Batas tidak aktif BERBEDA PER PERAN (lihat AUTO_LOGOUT_MENIT_PER_PERAN): Admin & Kepala Madrasah
     15 menit (akun berhak akses penuh), guru & wali kelas 30 menit (sering mengisi absensi/nilai sambil
     mengajar). Peran tak dikenal memakai AUTO_LOGOUT_MENIT_DEFAULT. Satu menit sebelum batas muncul
     peringatan; sentuhan/ketikan apa pun membatalkannya.
   - Kamera scan QR yang aktif dihitung sebagai aktivitas.
============================================================ */
// Batas tidak aktif (menit) per nilai currentUser.role (lihat ROLES di app.js). Ubah angka di sini saja.
const AUTO_LOGOUT_MENIT_PER_PERAN = { admin: 15, headmaster: 15, teacher: 30, wali_kelas: 30 };
const AUTO_LOGOUT_MENIT_DEFAULT = 15;
const AUTO_LOGOUT_PERINGATAN_MS = 60 * 1000;    // peringatan sebelum logout
const AUTO_LOGOUT_CEK_MS = 15 * 1000;           // interval pengecekan

function autoLogoutBatasMs() {
  const peran = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.role : null;
  const menit = (peran && AUTO_LOGOUT_MENIT_PER_PERAN[peran]) || AUTO_LOGOUT_MENIT_DEFAULT;
  return menit * 60 * 1000;
}

let _alTerakhir = Date.now();
let _alPeringatan = false;

function autoLogoutAktivitas() {
  _alTerakhir = Date.now();
  _alPeringatan = false;
}

function autoLogoutCek() {
  if (typeof currentUser === 'undefined' || !currentUser) {   // belum login / sudah logout
    _alTerakhir = Date.now(); _alPeringatan = false; return;
  }
  // Kamera scan QR aktif = guru sedang bertugas memindai (tidak menyentuh layar), jadi dihitung aktivitas.
  if (typeof cameraStream !== 'undefined' && cameraStream) { _alTerakhir = Date.now(); _alPeringatan = false; return; }
  const idle = Date.now() - _alTerakhir, batas = autoLogoutBatasMs();
  if (idle >= batas) {
    _alPeringatan = false; _alTerakhir = Date.now();
    if (typeof logout === 'function') logout();   // logout() menampilkan toast sendiri; pesan alasan ditampilkan SESUDAHNYA
    try { toast('🔒 Anda keluar otomatis karena lama tidak beraktivitas.', true, 6000); } catch (e) { /* toast belum siap */ }
    return;
  }
  if (idle >= batas - AUTO_LOGOUT_PERINGATAN_MS && !_alPeringatan) {
    _alPeringatan = true;
    toast('⏳ Tidak ada aktivitas. Anda akan keluar otomatis dalam 1 menit — sentuh layar untuk tetap masuk.', true, 8000);
  }
}

['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(ev =>
  document.addEventListener(ev, autoLogoutAktivitas, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) autoLogoutCek(); });
setInterval(autoLogoutCek, AUTO_LOGOUT_CEK_MS);
