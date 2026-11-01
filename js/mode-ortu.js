// ============================================================
// MODE WALI MURID (PWA khusus orang tua)
// Aktif bila halaman dibuka lewat  https://<domain>/?app=ortu  (start_url manifest-ortu.json).
// Penanda mode dipasang lebih awal oleh skrip kecil di <head> index.html (window.SIMAMBA_MODE_ORTU + kelas
// html.mode-ortu). Di mode ini: pilihan "Guru / Staff" & form login staf disembunyikan (CSS di index.html),
// aplikasi langsung membuka Portal Orang Tua, dan "Keluar" kembali ke form masuk wali (bukan menu awal).
// Di luar mode ini (web biasa) file ini hanya menambah tautan "Pasang aplikasi Wali Murid" di form portal.
// CATATAN: ini penyederhanaan tampilan, bukan pengamanan -- login staf tetap dilindungi PIN & Rules Firebase.
// ============================================================
(function () {
  'use strict';
  var ORTU = !!window.SIMAMBA_MODE_ORTU;
  function el(id) { return document.getElementById(id); }
  function standalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  var iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var promptSiap = false;

  // ---- Buka Portal Orang Tua langsung (dipanggil ulang aman) ----
  function bukaPortal() {
    if (!ORTU) return;
    if (typeof currentUser !== 'undefined' && currentUser) return;          // ada sesi staf tersimpan: jangan diganggu
    var login = el('portalOrtuLogin'), dash = el('portalOrtuDashboard');
    if (!login || !dash) return;
    if (login.style.display === 'flex' || dash.style.display === 'block' || (dash.style.display && dash.style.display !== 'none')) return;
    if (typeof bukaPortalOrtuForm === 'function') bukaPortalOrtuForm();
  }

  if (ORTU) {
    // "Keluar" dari portal / tombol kembali: tetap di form masuk wali, jangan ke menu awal (yang berisi login guru).
    window.kembaliKeChooser = function () {
      ['loginPage', 'loginChooser', 'portalOrtuDashboard'].forEach(function (id) { var e = el(id); if (e) e.style.display = 'none'; });
      if (typeof bukaPortalOrtuForm === 'function') bukaPortalOrtuForm();
    };
    window.pilihLoginGuru = function () { bukaPortal(); };   // jaga-jaga bila terpanggil dari tempat lain
  }

  // ---- Kotak "Pasang aplikasi" di form masuk Portal Orang Tua ----
  function kotakPasang() {
    var kartu = document.querySelector('#portalOrtuLogin .auth-card');
    if (!kartu || el('poPasangBox') || standalone()) return;
    var box = document.createElement('div');
    box.id = 'poPasangBox';
    box.style.cssText = 'margin-top:14px;padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:12px;color:#065f46;text-align:center;';
    var ujung = kartu.lastElementChild;
    kartu.insertBefore(box, ujung);
    isiKotak();
  }
  function isiKotak() {
    var box = el('poPasangBox'); if (!box) return;
    if (!ORTU) {
      box.innerHTML = '📲 <a href="?app=ortu" style="color:#047857;font-weight:700;">Pasang aplikasi khusus Wali Murid</a><br><span style="font-size:11px;">Satu ketukan dari layar utama, tanpa menu guru.</span>';
    } else if (promptSiap) {
      box.innerHTML = '<button type="button" class="btn btn-primary" style="width:100%;font-size:13px;" onclick="installApp()">📲 Pasang Aplikasi di HP</button>';
    } else if (iOS) {
      box.innerHTML = '📲 <strong>Pasang di iPhone/iPad:</strong> buka lewat Safari, ketuk tombol Bagikan (⬆️), lalu pilih <em>Tambahkan ke Layar Utama</em>.';
    } else {
      box.innerHTML = '📲 <strong>Pasang di HP:</strong> ketuk menu ⋮ pada browser, lalu pilih <em>Instal aplikasi</em> atau <em>Tambahkan ke layar utama</em>.';
    }
  }
  window.addEventListener('beforeinstallprompt', function () { promptSiap = true; isiKotak(); });
  window.addEventListener('appinstalled', function () { var b = el('poPasangBox'); if (b) b.remove(); });

  function mulai() { kotakPasang(); bukaPortal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.addEventListener('load', function () { kotakPasang(); bukaPortal(); setTimeout(bukaPortal, 400); });
})();
