/* ============================================================
   SI MAMBA - js/dashboard-lipat.js  (v8.460)
   Dashboard lebih ringkas: dua panel pelengkap di dalam "Detail & Statistik" bisa dilipat dan TERTUTUP bawaannya:
     - 📸 Absen Guru Hari Ini        (#dashboardTeacherAttendanceList)
     - 📋 Aktivitas Terbaru          (#logList)
   Klik/ketuk judul panel untuk membuka atau menutup; pilihan diingat per perangkat (localStorage mamba_dash_lipat).
   Panel lain TIDAK diubah. "Daftar Hadir Guru Hari Ini" sengaja tetap terbuka: panel itu hanya muncul saat ada guru
   yang belum absen (peringatan). Hanya mengatur tampil/sembunyi lewat class; isi & pemuat data di app.js tidak disentuh.
   Dimuat SESUDAH js/app.js.
============================================================ */
(function () {
  'use strict';
  var KEY = 'mamba_dash_lipat';
  var TARGET = [
    { list: 'dashboardTeacherAttendanceList', buka: false },
    { list: 'logList', buka: false }
  ];

  function baca() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function tulis(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* abaikan */ } }
  function css() {
    if (document.getElementById('dashLipatCss')) return;
    var st = document.createElement('style');
    st.id = 'dashLipatCss';
    st.textContent = '.lipat-tutup{display:none!important;}' +
      '.lipat-judul{cursor:pointer;user-select:none;-webkit-user-select:none;display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
      '.lipat-judul .lipat-chev{font-size:12px;color:#6b7280;flex:0 0 auto;}';
    document.head.appendChild(st);
  }

  function terapkan(box, h, buka) {
    box.classList.toggle('lipat-tutup', !buka);
    h.setAttribute('aria-expanded', buka ? 'true' : 'false');
    var c = h.querySelector('.lipat-chev'); if (c) c.textContent = buka ? '▾ tutup' : '▸ buka';
  }

  function pasang() {
    css();
    var st = baca();
    TARGET.forEach(function (t) {
      var box = document.getElementById(t.list);
      if (!box || box.getAttribute('data-lipat') === '1') return;
      var panel = box.closest ? box.closest('.dash-panel') : null;
      var h = panel ? panel.querySelector('.dash-section-title') : null;
      if (!h) return;
      box.setAttribute('data-lipat', '1');
      h.classList.add('lipat-judul');
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      var c = document.createElement('span'); c.className = 'lipat-chev'; h.appendChild(c);
      var buka = Object.prototype.hasOwnProperty.call(st, t.list) ? !!st[t.list] : t.buka;
      terapkan(box, h, buka);
      var balik = function () {
        var skrg = !box.classList.contains('lipat-tutup');
        terapkan(box, h, !skrg);
        var s2 = baca(); s2[t.list] = !skrg; tulis(s2);
      };
      h.addEventListener('click', balik);
      h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); balik(); } });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
