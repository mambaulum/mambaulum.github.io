/* ============================================================
   SI MAMBA - js/dashboard-ringkas.js (v8.471)
   GABUNGAN (isi tidak berubah) dari empat berkas Dashboard sebelumnya, masing-masing tetap sebagai IIFE terpisah:
     1) dashboard-lipat.js   panel pelengkap bisa dilipat
     2) dashboard-status.js  baris donat status + penyembunyian elemen ganda untuk Admin/Kepala
     3) dashboard-donat.js   donat Kehadiran Siswa/Guru bulan ini
     4) dashboard-grafik.js  grafik batang/garis sebagai SVG (pengganti Chart.js)
   Dimuat SESUDAH js/app.js dan js/monitor-petugas.js. Satu <script>, satu entri precache.
============================================================ */

/* ======================= [dashboard-lipat.js] ======================= */
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

/* ======================= [dashboard-status.js] ======================= */
/* ============================================================
   SI MAMBA - js/dashboard-status.js  (v8.470)
   Baris "status sekilas" di paling atas Dashboard (gaya kartu donat), hanya Admin & Kepala Madrasah:
     1. Kehadiran Siswa   - Hadir / Izin / Sakit / Alpha dari absensi hari ini (+ jumlah kelas yang sudah diabsen)
     2. Kehadiran Guru    - Hadir / Izin / Sakit / Alpha / Belum absen (hanya guru yang berjadwal hari ini)
     3. Jurnal Hari Ini   - Terisi / Belum (jam pelajaran sudah mulai) / Akan datang
     4. Petugas & PJ      - Beres / Lama tidak input / Belum ditunjuk (dari js/monitor-petugas.js); ketuk -> halaman rincian
   Hanya MEMBACA data yang sudah dimuat aplikasi (allAttendance, allTeacherAttendance, allJadwal, allJournals, jamSettings,
   monitorSusun) -- tidak ada query Firebase baru, tidak mengubah panel lain. Donat digambar SVG (tanpa Chart.js).
   Dimuat SESUDAH js/app.js dan js/monitor-petugas.js. Hapus satu baris <script> untuk membatalkan.
============================================================ */
(function () {
  'use strict';

  var HIJAU = '#059669', KUNING = '#d97706', MERAH = '#dc2626', BIRU = '#2563eb', UNGU = '#7c3aed', ABU = '#cbd5e1';

  function esc(s) {
    return (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s))
      : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function boleh() { try { return (typeof isAdmin === 'function' && isAdmin()) || (typeof isKepsek === 'function' && isKepsek()); } catch (e) { return false; } }
  function tAjaran() { try { return typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : null; } catch (e) { return null; } }
  function arr(v) { return Array.isArray(v) ? v : []; }

  /* ---------- CSS ---------- */
  function css() {
    if (document.getElementById('dashStatusCss')) return;
    var st = document.createElement('style');
    st.id = 'dashStatusCss';
    st.textContent =
      '#dashboardStatusRow.tk-hide{display:grid !important;}' +
      /* v8.467: Admin & Kepala -> ringkasan "hari ini" cukup di baris donat; elemen TETAP ada di DOM (diisi app.js), hanya disembunyikan */
      'body.dash-ringkas #page-dashboard .mp-dash-cards,body.dash-ringkas #page-dashboard #statusBar,body.dash-ringkas #page-dashboard #dashboardPetugasWrap,' +
      'body.dash-ringkas #page-dashboard #dashDetailSection>h3.dash-section-title:first-of-type,' +
      'body.dash-ringkas #page-dashboard #dashDetailSection>.dashboard-grid:first-of-type{display:none !important;}' +
      '@media (max-width:768px){.ds-row{grid-template-columns:1fr 1fr !important;gap:8px !important;}.ds-isi{flex-direction:column;align-items:flex-start;gap:6px;}.ds-judul{font-size:12px;}}' +
      '.ds-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px;margin-top:16px;}' +
      '.ds-card{padding:12px 14px;margin:0;}' +
      '.ds-card.ds-klik{cursor:pointer;}' +
      '.ds-judul{font-size:13px;font-weight:700;margin:0 0 8px;display:flex;align-items:center;justify-content:space-between;gap:6px;}' +
      '.ds-isi{display:flex;align-items:center;gap:12px;}' +
      '.ds-donat{flex:0 0 auto;width:84px;height:84px;position:relative;}' +
      '.ds-donat svg{width:84px;height:84px;display:block;transform:rotate(-90deg);}' +
      '.ds-tengah{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;}' +
      '.ds-tengah b{font-size:18px;font-weight:800;}' +
      '.ds-tengah span{font-size:10px;color:#6b7280;}' +
      '.ds-legenda{list-style:none;margin:0;padding:0;font-size:12px;flex:1;min-width:0;}' +
      '.ds-legenda li{display:flex;align-items:center;gap:6px;padding:1px 0;}' +
      '.ds-legenda i{display:inline-block;width:9px;height:9px;border-radius:50%;flex:0 0 auto;}' +
      '.ds-legenda em{font-style:normal;margin-left:auto;font-weight:700;}' +
      '.ds-kaki{font-size:11px;color:#6b7280;margin-top:8px;line-height:1.4;}' +
      '.ds-lihat{font-size:11px;color:#2563eb;white-space:nowrap;font-weight:600;}';
    document.head.appendChild(st);
  }

  /* ---------- donat SVG ---------- */
  // seg: [{n, warna}]; tengah: angka besar; label kecil di bawahnya
  function donat(seg, tengah, label) {
    var R = 34, K = 2 * Math.PI * R, total = seg.reduce(function (a, s) { return a + s.n; }, 0);
    var lingkar = '<circle cx="42" cy="42" r="' + R + '" fill="none" stroke="' + ABU + '" stroke-width="12" opacity=".45"/>';
    if (total > 0) {
      var offset = 0, banyak = seg.filter(function (s) { return s.n > 0; }).length, celah = banyak > 1 ? 1.6 : 0;
      seg.forEach(function (s) {
        if (s.n <= 0) return;
        var len = (s.n / total) * K, tampak = Math.max(len - celah, 0.5);
        lingkar += '<circle cx="42" cy="42" r="' + R + '" fill="none" stroke="' + s.warna + '" stroke-width="12" stroke-dasharray="' + tampak.toFixed(2) + ' ' + (K - tampak).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
        offset += len;
      });
    }
    return '<div class="ds-donat"><svg viewBox="0 0 84 84" aria-hidden="true">' + lingkar + '</svg><div class="ds-tengah"><b>' + esc(tengah) + '</b><span>' + esc(label) + '</span></div></div>';
  }
  function legenda(baris) {
    // v8.469: baris bernilai 0 tidak ditampilkan (lebih ringkas); semua nol -> satu keterangan singkat
    var isi = baris.filter(function (b) { return b.n > 0; });
    if (!isi.length) return '<ul class=\"ds-legenda\"><li style=\"color:#6b7280\">Belum ada catatan</li></ul>';
    return '<ul class=\"ds-legenda\">' + isi.map(function (b) {
      return '<li><i style="background:' + b.warna + '"></i>' + esc(b.nama) + '<em>' + b.n + '</em></li>';
    }).join('') + '</ul>';
  }
  function kartu(judul, seg, tengah, label, kaki, opsi) {
    opsi = opsi || {};
    var ringkasan = judul + ': ' + seg.map(function (s) { return s.nama + ' ' + s.n; }).join(', ');
    return '<div class="dash-panel ds-card' + (opsi.klik ? ' ds-klik' : '') + '"' + (opsi.klik ? ' role="button" tabindex="0" data-ds-klik="' + opsi.klik + '"' : '') + ' aria-label="' + esc(ringkasan) + '">' +
      '<div class="ds-judul"><span>' + esc(judul) + '</span>' + (opsi.klik ? '<span class="ds-lihat">Rincian →</span>' : '') + '</div>' +
      '<div class="ds-isi">' + donat(seg, tengah, label) + legenda(seg) + '</div>' +
      (kaki ? '<div class="ds-kaki">' + kaki + '</div>' : '') + '</div>';
  }

  /* ---------- perhitungan (hanya membaca data yang sudah dimuat) ---------- */
  function hariIniNama() { try { if (typeof getHariIni === 'function') return getHariIni(); } catch (e) { /* abaikan */ } return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()]; }
  function tanggalHariIni() { try { if (typeof tglLokal === 'function') return tglLokal(); } catch (e) { /* abaikan */ } var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // v8.464: hari libur Kalender Akademik (memakai monitorLiburSet dari monitor-petugas.js) -> tidak ada alarm palsu
  function hariLibur() {
    try { if (typeof monitorLiburSet === 'function') return monitorLiburSet().has(tanggalHariIni()); } catch (e) { /* abaikan */ }
    return false;
  }

  function hitungSiswa() {
    var today = tanggalHariIni(), ta = tAjaran(), c = { H: 0, I: 0, S: 0, A: 0 }, kelasSudah = {};
    arr(typeof allAttendance !== 'undefined' ? allAttendance : []).forEach(function (a) {
      if (!a || a.tanggal !== today || (ta && a.tahunAjaran !== ta) || !a.data) return;
      kelasSudah[a.kelas] = true;
      Object.keys(a.data).forEach(function (k) { var v = a.data[k]; if (c[v] !== undefined) c[v]++; });
    });
    var total = c.H + c.I + c.S + c.A;
    var kelasTotal = arr(typeof KELAS_LIST !== 'undefined' ? KELAS_LIST : []).length;
    return { c: c, total: total, kelasSudah: Object.keys(kelasSudah).length, kelasTotal: kelasTotal };
  }

  // v8.464: kunci guru dinormalkan ke g.key (dari kunci atau nama) untuk catatan absen DAN jadwal, supaya satu guru tidak terhitung dua kali
  function kunciGuru(kunci, nama, daftarGuru) {
    var g = null;
    if (kunci) g = daftarGuru.filter(function (x) { return x.key === kunci; })[0];
    if (!g && nama) {
      try { if (typeof samaNamaGuru === 'function') g = daftarGuru.filter(function (x) { return samaNamaGuru(nama, x.name); })[0]; } catch (e) { g = null; }
      if (!g) g = daftarGuru.filter(function (x) { return x.name === nama; })[0];
    }
    return g ? g.key : (kunci || nama || '');
  }
  function hitungGuru() {
    var today = tanggalHariIni(), ta = tAjaran(), hari = hariIniNama(), libur = hariLibur();
    var daftarGuru = arr(typeof allGuru !== 'undefined' ? allGuru : []);
    var peta = {};   // kunci guru -> 'hadir' | 'Izin' | 'Sakit' | 'Alpha'
    arr(typeof allTeacherAttendance !== 'undefined' ? allTeacherAttendance : []).forEach(function (a) {
      if (!a || a.tanggal !== today || (ta && a.tahunAjaran !== ta)) return;
      var k = kunciGuru(a.guruKey, a.guru, daftarGuru); if (!k) return;
      if (a.type === 'Datang') peta[k] = 'hadir';
      else if (peta[k] !== 'hadir' && (a.type === 'Izin' || a.type === 'Sakit' || a.type === 'Alpha')) peta[k] = a.type;
    });
    var berjadwal = {};
    if (!libur) arr(typeof allJadwal !== 'undefined' ? allJadwal : []).forEach(function (j) { if (j && j.hari === hari) berjadwal[kunciGuru(j.guruKey, j.guru, daftarGuru)] = true; });
    var adaJadwal = Object.keys(berjadwal).length > 0;
    var c = { hadir: 0, Izin: 0, Sakit: 0, Alpha: 0, belum: 0 }, luar = 0;
    Object.keys(peta).forEach(function (k) {
      if (adaJadwal && !berjadwal[k]) { luar++; return; }   // hadir tetapi tidak berjadwal hari ini: tidak masuk donat
      c[peta[k]]++;
    });
    Object.keys(berjadwal).forEach(function (k) { if (!peta[k]) c.belum++; });
    var total = c.hadir + c.Izin + c.Sakit + c.Alpha + c.belum;
    return { c: c, total: total, adaJadwal: adaJadwal, luar: luar, libur: libur };
  }

  function menitSekarang() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function menitDari(hhmm) { var m = /^(\d{1,2})[:.](\d{2})/.exec(String(hhmm || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function hitungJurnal() {
    var today = tanggalHariIni(), ta = tAjaran(), hari = hariIniNama(), sudahIsi = {};
    if (hariLibur()) return { c: { terisi: 0, belum: 0, akan: 0 }, total: 0, libur: true };
    arr(typeof allJournals !== 'undefined' ? allJournals : []).forEach(function (j) {
      if (!j || j.tanggal !== today || (ta && j.tahunAjaran !== ta) || j.status === 'ditolak') return;
      sudahIsi[String(j.kelas) + '|' + String(j.jam_ke)] = true;
    });
    var jam = (typeof jamSettings !== 'undefined' && jamSettings) ? jamSettings : {};
    var c = { terisi: 0, belum: 0, akan: 0 }, kini = menitSekarang();
    arr(typeof allJadwal !== 'undefined' ? allJadwal : []).forEach(function (j) {
      if (!j || j.hari !== hari) return;
      if (sudahIsi[String(j.kelas) + '|' + String(j.jam)]) { c.terisi++; return; }
      var js = jam[j.jam] || {};
      var mulai = menitDari(js.mulai);
      var selesai = menitDari(js.selesai || js.akhir || js.end);
      // v8.464: "Belum diisi" (merah) baru setelah jam SELESAI; jam yang masih berlangsung dihitung "Akan datang".
      // Bila waktu selesai tidak tersedia di pengaturan jam, pakai waktu mulai seperti sebelumnya.
      var lewat = selesai !== null ? selesai <= kini : (mulai !== null && mulai <= kini);
      if (lewat) c.belum++; else c.akan++;
    });
    return { c: c, total: c.terisi + c.belum + c.akan, libur: false };
  }

  function hitungPetugas() {
    try {
      var st = null;
      if (typeof monitorStat === 'function') st = monitorStat();
      else if (typeof monitorSusun === 'function') { var s0 = monitorSusun(); st = s0 && s0.stat; }
      if (!st) return null;
      var beres = Math.max(0, st.total - st.belum - st.lama);
      return { total: st.total, belum: st.belum, lama: st.lama, beres: beres };
    } catch (e) { return null; }
  }

  /* ---------- render ---------- */
  function wadah() {
    var el = document.getElementById('dashboardStatusRow');
    if (el) return el;
    var anchor = document.getElementById('statusBar');
    if (!anchor) return null;
    el = document.createElement('div');
    el.id = 'dashboardStatusRow';
    el.className = 'ds-row';
    anchor.insertAdjacentElement('afterend', el);
    el.addEventListener('click', klik);
    el.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.getAttribute && e.target.getAttribute('data-ds-klik')) { e.preventDefault(); klik(e); } });
    return el;
  }
  function klik(e) {
    var k = e.target && e.target.closest ? e.target.closest('[data-ds-klik]') : null;
    if (!k) return;
    try { if (typeof navigateTo === 'function') navigateTo(k.getAttribute('data-ds-klik')); } catch (err) { console.error('[dashboard-status]', err); }
  }

  function render() {
    try { document.body.classList.toggle('dash-ringkas', !!boleh()); } catch (e) { /* abaikan */ }
    var el = wadah(); if (!el) return;
    if (!boleh()) { el.innerHTML = ''; el.style.display = 'none'; return; }
    css();
    el.style.display = '';
    el.classList.remove('tk-hide');
    var html = '';
    try {
      var s = hitungSiswa();
      html += kartu('🎒 Kehadiran Siswa', [
        { nama: 'Hadir', n: s.c.H, warna: HIJAU }, { nama: 'Izin', n: s.c.I, warna: BIRU },
        { nama: 'Sakit', n: s.c.S, warna: KUNING }, { nama: 'Alpha', n: s.c.A, warna: MERAH }
      ], s.total ? Math.round(s.c.H / s.total * 100) + '%' : '-', 'hadir',
      s.kelasTotal ? s.kelasSudah + ' dari ' + s.kelasTotal + ' kelas sudah diabsen' : '');

      var g = hitungGuru();
      html += kartu('👩‍🏫 Kehadiran Guru', [
        { nama: 'Hadir', n: g.c.hadir, warna: HIJAU }, { nama: 'Izin', n: g.c.Izin, warna: BIRU },
        { nama: 'Sakit', n: g.c.Sakit, warna: KUNING }, { nama: 'Alpha', n: g.c.Alpha, warna: MERAH },
        { nama: 'Belum absen', n: g.c.belum, warna: ABU }
      ], g.libur && !g.total ? 'Libur' : (g.total ? g.c.hadir + '/' + g.total : '-'), 'guru',
      g.libur ? 'Hari libur (Kalender Akademik)' : (g.adaJadwal ? (g.luar ? '+' + g.luar + ' hadir di luar jadwal' : '') : 'Tidak ada guru berjadwal hari ini'));

      var j = hitungJurnal();
      html += kartu('📓 Jurnal Hari Ini', [
        { nama: 'Terisi', n: j.c.terisi, warna: HIJAU }, { nama: 'Belum diisi', n: j.c.belum, warna: MERAH },
        { nama: 'Akan datang', n: j.c.akan, warna: ABU }
      ], j.libur ? 'Libur' : (j.total ? j.c.terisi + '/' + j.total : '-'), 'jam',
      j.libur ? 'Hari libur (Kalender Akademik)' : (j.total ? '' : 'Tidak ada jadwal hari ini'));

      var p = hitungPetugas();
      if (p) {
        html += kartu('👥 Petugas & PJ', [
          { nama: 'Beres', n: p.beres, warna: HIJAU }, { nama: 'Lama tidak input', n: p.lama, warna: KUNING },
          { nama: 'Belum ditunjuk', n: p.belum, warna: MERAH }
        ], p.total ? p.beres + '/' + p.total : '-', 'beres',
        (p.lama + p.belum) ? 'Ada yang perlu ditindaklanjuti' : 'Semua petugas beres', { klik: 'monitor-petugas' });
      }
    } catch (e) { console.error('[dashboard-status]', e); html = ''; }
    el.innerHTML = html;
    el.style.display = html ? '' : 'none';
  }

  function init() {
    css();
    render();
    var orig = window.updateDashboard;
    if (typeof orig === 'function' && !orig.__dashStatus) {
      var w = function () { var r = orig.apply(this, arguments); try { render(); } catch (e) { console.error('[dashboard-status]', e); } return r; };
      w.__dashStatus = true; window.updateDashboard = w;
    }
    setInterval(function () { if (!document.hidden) render(); }, 60000);   // jam berjalan -> status "Belum diisi" ikut berubah
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ======================= [dashboard-donat.js] ======================= */
/* ============================================================
   SI MAMBA - js/dashboard-donat.js (v8.469)
   Grafik "Kehadiran Siswa" & "Kehadiran Guru" di Dashboard: tampilan bawaan sekarang DONAT (bulan ini),
   digambar SVG sendiri -> tidak butuh Chart.js (tidak perlu unduh CDN), langsung tampil di HP.
   - Tren 6 bulan / per hari / per kelas / per guru TETAP ada di pilihan dropdown (memakai Chart.js seperti semula).
   - Hanya membungkus renderSiswaChart() & renderGuruChart(); data & fungsi lain tidak diubah. Tanpa query Firebase baru.
   Dimuat SESUDAH app.js dan dashboard-status.js.
============================================================ */
(function () {
  'use strict';
  var HIJAU = '#10b981', BIRU = '#3b82f6', KUNING = '#f59e0b', MERAH = '#ef4444';
  function $(id) { return document.getElementById(id); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bulanIni() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function tahunOk(a) { try { return typeof sesuaiTahunAjaranTermasukDataLama === 'function' ? sesuaiTahunAjaranTermasukDataLama(a) : true; } catch (e) { return true; } }
  function boleh() { try { return isAdmin() || isKepsek(); } catch (e) { return false; } }

  function donatHtml(judul, segs, tengah, sub, kaki) {
    var total = segs.reduce(function (t, s) { return t + s.n; }, 0), R = 36, K = 2 * Math.PI * R, off = 0, lingkar = '';
    var banyak = segs.filter(function (s) { return s.n > 0; }).length, celah = banyak > 1 ? 1.6 : 0;
    segs.forEach(function (s) {
      if (!s.n || !total) return;
      var len = s.n / total * K, tampak = Math.max(len - celah, 0.5);
      lingkar += '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="' + s.warna + '" stroke-width="14" stroke-dasharray="' + tampak.toFixed(2) + ' ' + (K - tampak).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
      off += len;
    });
    var leg = segs.filter(function (s) { return s.n > 0; }).map(function (s) {
      return '<li><i style="background:' + s.warna + '"></i>' + esc(s.nama) + '<em>' + s.n + (total ? ' · ' + Math.round(s.n / total * 100) + '%' : '') + '</em></li>';
    }).join('');
    return '<div class="ds-judul" style="font-weight:600;">' + esc(judul) + '</div>' +
      '<div class="ds-isi"><div class="ds-donat" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="' + R + '" fill="none" stroke="#e5e7eb" stroke-width="14"/>' + lingkar + '</svg>' +
      '<div class="ds-tengah"><b>' + esc(tengah) + '</b><span>' + esc(sub) + '</span></div></div><ul class="ds-legenda">' + leg + '</ul></div>' +
      (kaki ? '<div class="ds-kaki">' + esc(kaki) + '</div>' : '');
  }

  function wadah(id, anchorId) {
    var el = $(id); if (el) return el;
    var anchor = $(anchorId); if (!anchor) return null;
    var cont = anchor.closest('.chart-container') || anchor.parentNode;
    if (!cont || !cont.parentNode) return null;
    el = document.createElement('div'); el.id = id; el.className = 'ds-donat-wrap';
    cont.parentNode.insertBefore(el, cont);
    return el;
  }
  function tampilkan(id, anchorId, html) {
    var el = wadah(id, anchorId); if (!el) return;
    var cont = $(anchorId) ? ($(anchorId).closest('.chart-container') || $(anchorId).parentNode) : null;
    if (cont) cont.style.display = 'none';
    el.style.display = ''; el.innerHTML = html;
  }
  function sembunyikan(id, anchorId) {
    var el = $(id); if (el) { el.style.display = 'none'; el.innerHTML = ''; }
    var a = $(anchorId); var cont = a && (a.closest('.chart-container') || a.parentNode); if (cont) cont.style.display = '';
  }

  function donatSiswa() {
    var bln = bulanIni(), kelasSel = $('siswaChartKelas'), kelas = kelasSel ? kelasSel.value : '';
    var c = { H: 0, I: 0, S: 0, A: 0 }, hari = {};
    arr(typeof allAttendance !== 'undefined' ? allAttendance : []).forEach(function (a) {
      if (!a || !a.data || !a.tanggal || a.tanggal.indexOf(bln) !== 0 || !tahunOk(a)) return;
      if (kelas && a.kelas !== kelas) return;
      hari[a.tanggal] = true;
      Object.keys(a.data).forEach(function (k) { var v = a.data[k]; if (c[v] !== undefined) c[v]++; });
    });
    var total = c.H + c.I + c.S + c.A;
    tampilkan('dsDonatSiswa', 'siswaChart', donatHtml('Kehadiran siswa bulan ini' + (kelas ? ' · ' + kelas : ''), [
      { nama: 'Hadir', n: c.H, warna: HIJAU }, { nama: 'Izin', n: c.I, warna: BIRU }, { nama: 'Sakit', n: c.S, warna: KUNING }, { nama: 'Alpha', n: c.A, warna: MERAH }
    ], total ? Math.round(c.H / total * 100) + '%' : '-', 'hadir', Object.keys(hari).length + ' hari ada absensi'));
  }

  function donatGuru() {
    var bln = bulanIni(), peta = {}, hari = {};
    arr(typeof allTeacherAttendance !== 'undefined' ? allTeacherAttendance : []).forEach(function (a) {
      if (!a || !a.tanggal || a.tanggal.indexOf(bln) !== 0 || !tahunOk(a)) return;
      var k = (a.guruKey || a.guru || '') + '|' + a.tanggal; if (!a.guruKey && !a.guru) return;
      hari[a.tanggal] = true;
      if (a.type === 'Datang') peta[k] = 'hadir';
      else if (peta[k] !== 'hadir' && (a.type === 'Izin' || a.type === 'Sakit' || a.type === 'Alpha')) peta[k] = a.type;
    });
    var c = { hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
    Object.keys(peta).forEach(function (k) { c[peta[k]]++; });
    var total = c.hadir + c.Izin + c.Sakit + c.Alpha;
    tampilkan('dsDonatGuru', 'guruChart', donatHtml('Kehadiran guru bulan ini', [
      { nama: 'Hadir', n: c.hadir, warna: HIJAU }, { nama: 'Izin', n: c.Izin, warna: BIRU }, { nama: 'Sakit', n: c.Sakit, warna: KUNING }, { nama: 'Alpha', n: c.Alpha, warna: MERAH }
    ], total ? Math.round(c.hadir / total * 100) + '%' : '-', 'hadir', Object.keys(hari).length + ' hari ada absensi'));
  }

  function tambahOpsi(selId, nilai, teks) {
    var s = $(selId); if (!s || s.querySelector('option[value="' + nilai + '"]')) return false;
    var o = document.createElement('option'); o.value = nilai; o.textContent = teks;
    s.insertBefore(o, s.firstChild); return true;
  }
  function bungkus(nama, modeId, wrapId, anchorId, fungsiDonat, khususPimpinan) {
    var orig = window[nama];
    if (typeof orig !== 'function' || orig.__donat) return;
    var w = function () {
      var sel = $(modeId);
      if (sel && sel.value === 'donat-bulan') {
        if (khususPimpinan && !boleh()) return;       // panel disembunyikan untuk guru biasa (sama seperti fungsi asli)
        try { fungsiDonat(); } catch (e) { console.error('[dashboard-donat]', e); }
        return;
      }
      sembunyikan(wrapId, anchorId);
      return orig.apply(this, arguments);
    };
    w.__donat = true; window[nama] = w;
  }

  // Tampilan umum grafik Chart.js (tren, Nilai, Infaq): legenda bulat, tooltip lebih rapi, batang membulat, garis halus,
  // animasi singkat (ringan untuk HP lama), sentuhan mudah. Hanya DEFAULT; opsi yang sudah ditulis app.js tetap menang.
  function setelanChart() {
    if (typeof Chart === 'undefined' || !Chart.defaults || Chart.__miSetelan) return;
    Chart.__miSetelan = true;
    try {
      var d = Chart.defaults;
      d.font.family = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"; d.font.size = 11;
      d.animation = { duration: 350 };
      d.interaction = { mode: 'index', intersect: false };
      d.plugins.legend.labels.usePointStyle = true; d.plugins.legend.labels.boxWidth = 8; d.plugins.legend.labels.boxHeight = 8; d.plugins.legend.labels.padding = 12;
      d.plugins.tooltip.padding = 10; d.plugins.tooltip.cornerRadius = 10; d.plugins.tooltip.boxPadding = 4; d.plugins.tooltip.backgroundColor = 'rgba(15,23,42,.92)';
      d.elements.bar.borderRadius = 6;
      d.elements.line.tension = 0.35; d.elements.line.borderWidth = 2.5;
      d.elements.point.radius = 3; d.elements.point.hoverRadius = 6; d.elements.point.hitRadius = 12;
      if (d.scale && d.scale.border) d.scale.border.display = false;
      if (d.scale && d.scale.grid) d.scale.grid.color = 'rgba(148,163,184,.25)';
    } catch (e) { console.warn('[dashboard-donat] setelan chart', e); }
  }
  function bungkusChart() {
    var orig = window.v4RenderChart;
    if (typeof orig !== 'function' || orig.__donat) return;
    var w = function () { setelanChart(); return orig.apply(this, arguments); };
    w.__donat = true; window.v4RenderChart = w;
  }

  function init() {
    bungkusChart();
    var baruS = tambahOpsi('siswaChartMode', 'donat-bulan', '🍩 Bulan ini (donat)');
    var baruG = tambahOpsi('guruChartMode', 'donat-bulan', '🍩 Bulan ini (donat)');
    if (baruS && $('siswaChartMode')) $('siswaChartMode').value = 'donat-bulan';   // bawaan: donat; tren tetap dapat dipilih
    if (baruG && $('guruChartMode')) $('guruChartMode').value = 'donat-bulan';
    bungkus('renderSiswaChart', 'siswaChartMode', 'dsDonatSiswa', 'siswaChart', donatSiswa, false);
    bungkus('renderGuruChart', 'guruChartMode', 'dsDonatGuru', 'guruChart', donatGuru, true);
    try { if ($('siswaChartMode') && $('siswaChartMode').value === 'donat-bulan') donatSiswa(); } catch (e) { /* data belum siap */ }
    try { if (boleh() && $('guruChartMode') && $('guruChartMode').value === 'donat-bulan') donatGuru(); } catch (e) { /* data belum siap */ }
    if (typeof window.renderCharts === 'function') { try { window.renderCharts(); } catch (e) { /* abaikan */ } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* ======================= [dashboard-grafik.js] ======================= */
/* ============================================================
   SI MAMBA - js/dashboard-grafik.js (v8.468)
   Menggambar grafik batang & garis Dashboard sebagai SVG buatan sendiri, MENGGANTIKAN Chart.js untuk grafik-grafik itu:
   Kehadiran Siswa (bulanan / per kelas / harian), Kehadiran Guru, Rata-rata Nilai, Infaq.
   - Tidak perlu unduh CDN -> tampil langsung, jalan offline, ringan di HP lama.
   - Cara kerja: membungkus v4RenderChart(instance, canvas, config). Data & konfigurasi tetap dari app.js (label, dataset, min/max,
     format angka, teks tooltip); file ini hanya menggambar. Tanpa query Firebase baru.
   - Sentuh/klik sebuah kolom untuk melihat nilainya (tooltip). Legenda tampil bila konfigurasi memintanya.
   - Konfigurasi yang tidak didukung (bukan batang/garis, horizontal, bertumpuk, >12 dataset, >60 titik) diserahkan ke
     v4RenderChart asli (Chart.js), jadi tidak ada fitur yang hilang.
   Dimuat SESUDAH app.js (dan dashboard-donat.js).
============================================================ */
(function () {
  'use strict';
  var W = 360, H = 224, MR = 12, MT = 16, MB = 28;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function pendek(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function css() {
    if (document.getElementById('miGrafikCss')) return;
    var st = document.createElement('style'); st.id = 'miGrafikCss';
    st.textContent =
      '.mi-svgchart{position:relative;width:100%;}' +
      '.mi-svgchart svg{display:block;width:100%;max-width:560px;height:auto;margin:0 auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}' +
      '.mi-svgchart .mi-hit{fill:transparent;cursor:pointer;}' +
      '.mi-leg{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;font-size:11px;margin-top:6px;}' +
      '.mi-leg span{display:inline-flex;align-items:center;}' +
      '.mi-leg i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;flex:0 0 auto;}' +
      '.mi-tip{position:absolute;z-index:5;pointer-events:none;background:rgba(15,23,42,.94);color:#fff;font-size:12px;line-height:1.35;padding:7px 10px;border-radius:10px;max-width:230px;box-shadow:0 4px 14px rgba(0,0,0,.25);}' +
      '.mi-tip b{display:block;margin-bottom:2px;}' +
      '.mi-tip i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;}' +
      '.mi-kosong{padding:28px 8px;text-align:center;font-size:13px;color:#6b7280;}';
    document.head.appendChild(st);
  }

  function skalaNice(maks) {
    if (!(maks > 0)) return { step: 1, max: 4 };
    var kasar = maks / 4, p = Math.pow(10, Math.floor(Math.log10(kasar))), f = kasar / p;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
    return { step: step, max: step * Math.ceil(maks / step) };
  }

  function bangun(config) {
    var d = config.data || {}, o = config.options || {}, sc = o.scales || {}, yo = sc.y || {}, xo = sc.x || {};
    var labels = d.labels || [], ds = d.datasets || [], n = labels.length, tipe = config.type;
    var warnaTeks = (yo.ticks && yo.ticks.color) || '#6b7280', warnaGaris = (yo.grid && yo.grid.color) || '#e5e7eb';
    var yMin = typeof yo.min === 'number' ? yo.min : 0, yMax, step;
    var semua = []; ds.forEach(function (s) { (s.data || []).forEach(function (v) { semua.push(num(v)); }); });
    var dataMax = semua.length ? Math.max.apply(null, semua) : 0;
    if (typeof yo.max === 'number') { yMax = yo.max; step = (yMax - yMin) / 4; }
    else { var sk = skalaNice(dataMax - yMin); step = sk.step; yMax = yMin + sk.max; }
    if (yMax <= yMin) yMax = yMin + 1;

    var cb = yo.ticks && typeof yo.ticks.callback === 'function' ? yo.ticks.callback : null;
    function fmt(v) {
      var t; try { t = cb ? cb.call(null, v, 0, []) : v; } catch (e) { t = v; }
      if (typeof t === 'string' && /^Rp/.test(t)) {
        var a = Math.abs(v);
        return 'Rp ' + (a >= 1e6 ? (Math.round(v / 1e5) / 10) + ' jt' : a >= 1e3 ? Math.round(v / 1e3) + ' rb' : Math.round(v));
      }
      if (typeof t === 'number') t = Math.round(t * 10) / 10;
      return String(t);
    }
    var ticks = [], t, nT = Math.max(1, Math.round((yMax - yMin) / step));
    for (t = 0; t <= nT; t++) ticks.push(yMin + (yMax - yMin) * t / nT);
    var maxLen = 0; ticks.forEach(function (v) { maxLen = Math.max(maxLen, fmt(v).length); });
    var ML = Math.max(32, Math.round(maxLen * 5.6 + 10));
    var plotW = W - ML - MR, plotH = H - MT - MB, base = MT + plotH;
    function yPos(v) { var r = (num(v) - yMin) / (yMax - yMin); return base - Math.max(0, Math.min(1, r)) * plotH; }
    var band = n ? plotW / n : plotW;

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc((ds[0] && ds[0].label) || 'Grafik') + '" xmlns="http://www.w3.org/2000/svg" font-family="Inter,system-ui,-apple-system,Segoe UI,sans-serif">';
    // garis kisi + label sumbu Y
    ticks.forEach(function (v) {
      var y = yPos(v).toFixed(1);
      s += '<line x1="' + ML + '" x2="' + (W - MR) + '" y1="' + y + '" y2="' + y + '" stroke="' + esc(warnaGaris) + '" stroke-width="1"' + (v === yMin ? '' : ' stroke-dasharray="3 3"') + ' opacity="' + (v === yMin ? 1 : 0.7) + '"/>';
      s += '<text x="' + (ML - 6) + '" y="' + (Number(y) + 3.5) + '" text-anchor="end" font-size="10" fill="' + esc(warnaTeks) + '">' + esc(fmt(v)) + '</text>';
    });
    // label sumbu X (dilewati selang-seling bila terlalu rapat)
    var panjangLabel = 0; labels.forEach(function (l) { panjangLabel = Math.max(panjangLabel, Math.min(String(l).length, 10)); });
    var perLabel = Math.max(1, Math.ceil((panjangLabel * 5.6 + 6) / (band || 1)));
    if (typeof (xo.ticks && xo.ticks.maxTicksLimit) === 'number') perLabel = Math.max(perLabel, Math.ceil(n / xo.ticks.maxTicksLimit));
    labels.forEach(function (l, i) {
      if (i % perLabel !== 0) return;
      s += '<text x="' + (ML + band * (i + 0.5)).toFixed(1) + '" y="' + (base + 16) + '" text-anchor="middle" font-size="10" fill="' + esc(warnaTeks) + '">' + esc(pendek(l, 10)) + '</text>';
    });

    var jmlDs = ds.length || 1;
    if (tipe === 'bar') {
      var grup = band * 0.72, bw = grup / jmlDs, labelNilai = n * jmlDs <= 14;
      ds.forEach(function (set, j) {
        (set.data || []).forEach(function (v, i) {
          var x = ML + band * i + (band - grup) / 2 + j * bw, y = yPos(v), h = base - y, r = Math.min(6, bw / 2, h);
          var warna = Array.isArray(set.backgroundColor) ? set.backgroundColor[i % set.backgroundColor.length] : (set.backgroundColor || '#059669');
          if (h > 0.5) s += '<path d="M' + x.toFixed(1) + ',' + base + 'L' + x.toFixed(1) + ',' + (y + r).toFixed(1) + 'Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + r).toFixed(1) + ',' + y.toFixed(1) +
            'L' + (x + bw - r).toFixed(1) + ',' + y.toFixed(1) + 'Q' + (x + bw).toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + bw).toFixed(1) + ',' + (y + r).toFixed(1) + 'L' + (x + bw).toFixed(1) + ',' + base + 'Z" fill="' + esc(warna) + '"/>';
          if (labelNilai && num(v) > 0) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" font-size="9.5" font-weight="600" fill="' + esc(warnaTeks) + '">' + esc(fmt(num(v))) + '</text>';
        });
      });
    } else {
      ds.forEach(function (set) {
        var pts = (set.data || []).map(function (v, i) { return { x: ML + band * (i + 0.5), y: yPos(v) }; });
        if (!pts.length) return;
        var warna = set.borderColor || '#059669', lebar = Math.min(set.borderWidth || 2.5, 3), jalur = 'M' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);
        for (var k = 0; k < pts.length - 1; k++) {
          var a = pts[k], b = pts[k + 1], dx = (b.x - a.x) / 3, lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
          var c1y = Math.max(lo, Math.min(hi, a.y)), c2y = Math.max(lo, Math.min(hi, b.y));
          jalur += 'C' + (a.x + dx).toFixed(1) + ',' + c1y.toFixed(1) + ' ' + (b.x - dx).toFixed(1) + ',' + c2y.toFixed(1) + ' ' + b.x.toFixed(1) + ',' + b.y.toFixed(1);
        }
        if (set.fill && ds.length === 1) s += '<path d="' + jalur + 'L' + pts[pts.length - 1].x.toFixed(1) + ',' + base + 'L' + pts[0].x.toFixed(1) + ',' + base + 'Z" fill="' + esc(set.backgroundColor || 'rgba(5,150,105,.12)') + '"/>';
        s += '<path d="' + jalur + '" fill="none" stroke="' + esc(warna) + '" stroke-width="' + lebar + '" stroke-linecap="round" stroke-linejoin="round"/>';
        var r = pts.length > 20 ? 0 : (jmlDs > 3 ? 2.5 : 3.5);
        if (r) pts.forEach(function (p) { s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + r + '" fill="#fff" stroke="' + esc(warna) + '" stroke-width="2"/>'; });
      });
    }
    // garis penanda + area sentuh per kolom
    s += '<line class="mi-guide" x1="0" x2="0" y1="' + MT + '" y2="' + base + '" stroke="' + esc(warnaTeks) + '" stroke-width="1" stroke-dasharray="2 3" opacity="0" pointer-events="none"/>';
    for (var i = 0; i < n; i++) s += '<rect class="mi-hit" data-i="' + i + '" x="' + (ML + band * i).toFixed(1) + '" y="' + MT + '" width="' + band.toFixed(1) + '" height="' + plotH + '"/>';
    s += '</svg>';

    var tampilLegenda = !!(o.plugins && o.plugins.legend && o.plugins.legend.display === true);
    if (tampilLegenda) {
      s += '<div class="mi-leg" style="color:' + esc(warnaTeks) + '">' + ds.map(function (set) {
        var w = set.borderColor || (Array.isArray(set.backgroundColor) ? set.backgroundColor[0] : set.backgroundColor) || '#059669';
        return '<span><i style="background:' + esc(w) + '"></i>' + esc(set.label || '') + '</span>';
      }).join('') + '</div>';
    }
    return { html: s, ML: ML, band: band, n: n, labels: labels, ds: ds, o: o };
  }

  function pasangInteraksi(box, info) {
    var svg = box.querySelector('svg'), tip = document.createElement('div'), guide = box.querySelector('.mi-guide');
    tip.className = 'mi-tip'; tip.style.display = 'none'; box.appendChild(tip);
    var cbT = info.o.plugins && info.o.plugins.tooltip && info.o.plugins.tooltip.callbacks && info.o.plugins.tooltip.callbacks.label;
    function tutup() { tip.style.display = 'none'; if (guide) guide.setAttribute('opacity', '0'); }
    function buka(i) {
      if (!(i >= 0 && i < info.n)) return;
      tip.textContent = '';
      var jud = document.createElement('b'); jud.textContent = String(info.labels[i]); tip.appendChild(jud);
      info.ds.forEach(function (set, j) {
        var v = (set.data || [])[i]; if (v == null) return;
        var teks;
        try { teks = cbT ? cbT({ dataset: set, datasetIndex: j, dataIndex: i, label: info.labels[i], raw: v, parsed: { x: i, y: v } }) : (set.label ? set.label + ': ' : '') + v; } catch (e) { teks = String(v); }
        if (Array.isArray(teks)) teks = teks.join(' ');
        var baris = document.createElement('div'), pt = document.createElement('i');
        pt.style.background = set.borderColor || (Array.isArray(set.backgroundColor) ? set.backgroundColor[i % set.backgroundColor.length] : set.backgroundColor) || '#10b981';
        baris.appendChild(pt); baris.appendChild(document.createTextNode(String(teks))); tip.appendChild(baris);
      });
      var rs = svg.getBoundingClientRect(), rb = box.getBoundingClientRect(), lebarSvg = rs.width || W, skala = lebarSvg / W;
      var px = (rs.left - rb.left) + (info.ML + info.band * (i + 0.5)) * skala;
      tip.style.display = 'block';
      var tw = tip.offsetWidth, kiri = Math.max(2, Math.min(px - tw / 2, rb.width - tw - 2));
      // di atas kolom bila muat; bila tidak (mis. grafik pendek), tepat di bawah garis atas area gambar
      var atas = (rs.top - rb.top) + MT * skala - tip.offsetHeight - 6;
      tip.style.left = kiri + 'px'; tip.style.top = Math.max(0, atas) + 'px';
      if (guide) { var gx = (info.ML + info.band * (i + 0.5)).toFixed(1); guide.setAttribute('x1', gx); guide.setAttribute('x2', gx); guide.setAttribute('opacity', '.6'); }
    }
    function indeks(e) { var el = e.target && e.target.closest ? e.target.closest('.mi-hit') : null; return el ? Number(el.getAttribute('data-i')) : -1; }
    svg.addEventListener('mouseover', function (e) { var i = indeks(e); if (i >= 0) buka(i); });
    svg.addEventListener('mouseleave', tutup);
    svg.addEventListener('click', function (e) { var i = indeks(e); if (i >= 0) buka(i); else tutup(); });
    box.__miTutup = tutup;
  }
  // sentuh di luar grafik -> tutup tooltip
  document.addEventListener('click', function (e) {
    var boxes = document.querySelectorAll('.mi-svgchart');
    for (var k = 0; k < boxes.length; k++) if (!boxes[k].contains(e.target) && boxes[k].__miTutup) boxes[k].__miTutup();
  });

  function bolehSvg(config) {
    try {
      var o = config.options || {}, sc = o.scales || {};
      if (!config || (config.type !== 'bar' && config.type !== 'line')) return false;
      if (o.indexAxis === 'y') return false;
      if ((sc.x && sc.x.stacked) || (sc.y && sc.y.stacked)) return false;
      var ds = config.data && config.data.datasets || [];
      if (ds.length > 12 || ((config.data && config.data.labels) || []).length > 60) return false;
      return true;
    } catch (e) { return false; }
  }

  function gambar(ctx, config) {
    css();
    var induk = ctx.parentNode; if (!induk) return null;
    var box = ctx.__miBox;
    if (!box || !box.parentNode) {
      box = document.createElement('div'); box.className = 'mi-svgchart';
      induk.insertBefore(box, ctx.nextSibling); ctx.__miBox = box;
    }
    ctx.style.display = 'none';
    induk.style.height = 'auto'; induk.style.minHeight = '0';
    if (!((config.data && config.data.labels) || []).length) { box.innerHTML = '<div class="mi-kosong">Belum ada data</div>'; return box; }
    var info = bangun(config);
    box.innerHTML = info.html;
    pasangInteraksi(box, info);
    return box;
  }

  function stub(ctx, config) {
    return {
      __mi: true, config: { type: config.type }, data: { labels: config.data.labels, datasets: config.data.datasets },
      update: function () {}, resize: function () {},
      destroy: function () {
        try { if (ctx.__miBox) { ctx.__miBox.remove(); ctx.__miBox = null; } ctx.style.display = ''; if (ctx.parentNode) ctx.parentNode.style.height = ''; } catch (e) { /* abaikan */ }
      }
    };
  }

  function init() {
    var orig = window.v4RenderChart;
    if (typeof orig !== 'function' || orig.__grafik) return;
    var w = function (existing, ctx, config) {
      try {
        if (ctx && config && bolehSvg(config)) {
          var kotak = gambar(ctx, config);
          if (kotak) return (existing && existing.__mi) ? (existing.data = { labels: config.data.labels, datasets: config.data.datasets }, existing.config.type = config.type, existing) : stub(ctx, config);
        }
      } catch (e) { console.warn('[dashboard-grafik] gagal, pakai Chart.js:', e); }
      // jalur cadangan: Chart.js asli (instance SVG lama dibersihkan dulu)
      if (existing && existing.__mi) { existing.destroy(); existing = null; }
      if (ctx && ctx.__miBox) { try { ctx.__miBox.remove(); ctx.__miBox = null; ctx.style.display = ''; } catch (e) { /* abaikan */ } }
      return orig.call(this, existing, ctx, config);
    };
    w.__grafik = true; window.v4RenderChart = w;
    if (typeof window.renderCharts === 'function') { try { window.renderCharts(); } catch (e) { /* data belum siap */ } }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
