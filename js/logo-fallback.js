/* ============================================================
   SI MAMBA - js/logo-fallback.js
   Fallback logo yang aman: TIDAK menyentuh parentElement.innerHTML (yang bisa
   menghapus elemen sibling lain di dalam parent yang sama). Cukup sisipkan
   elemen placeholder baru setelah <img>, dengan guard supaya tidak dobel
   kalau onerror kepanggil lebih dari sekali. Ukuran/warna diatur lewat CSS
   custom properties (--logo-size / --logo-font-size / --logo-border) di
   masing-masing container (lihat css/styles.css), bukan inline style yang
   diulang di 4 tempat berbeda.
   Dimuat paling awal di <head> karena dipakai oleh atribut onerror="..."
   pada elemen <img> logo yang ada di HTML (sidebar, dashboard, login, kop
   surat) sebelum js/app.js sempat dimuat.
============================================================ */
    function v4LogoFallback(img) {
      if (img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = '1';
      img.onerror = null;
      img.style.display = 'none';
      const ph = document.createElement('div');
      ph.className = 'logo-fallback-placeholder';
      ph.textContent = '📚';
      img.insertAdjacentElement('afterend', ph);
    }
