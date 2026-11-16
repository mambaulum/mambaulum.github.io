/* ============================================================
   SI MAMBA - js/dashboard-status.js  (v8.463)
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
      var offset = 0;
      seg.forEach(function (s) {
        if (s.n <= 0) return;
        var len = (s.n / total) * K;
        lingkar += '<circle cx="42" cy="42" r="' + R + '" fill="none" stroke="' + s.warna + '" stroke-width="12" stroke-dasharray="' + len.toFixed(2) + ' ' + (K - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
        offset += len;
      });
    }
    return '<div class="ds-donat"><svg viewBox="0 0 84 84" aria-hidden="true">' + lingkar + '</svg><div class="ds-tengah"><b>' + esc(tengah) + '</b><span>' + esc(label) + '</span></div></div>';
  }
  function legenda(baris) {
    return '<ul class="ds-legenda">' + baris.map(function (b) {
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

  function kunciGuruDariJadwal(j, daftarGuru) {
    if (j.guruKey) return j.guruKey;
    var g = null;
    try { if (typeof samaNamaGuru === 'function') g = daftarGuru.filter(function (x) { return samaNamaGuru(j.guru, x.name); })[0]; } catch (e) { g = null; }
    if (!g) g = daftarGuru.filter(function (x) { return x.name === j.guru; })[0];
    return g ? g.key : (j.guru || '');
  }
  function hitungGuru() {
    var today = tanggalHariIni(), ta = tAjaran(), hari = hariIniNama();
    var peta = {};   // kunci guru -> 'hadir' | 'Izin' | 'Sakit' | 'Alpha'
    arr(typeof allTeacherAttendance !== 'undefined' ? allTeacherAttendance : []).forEach(function (a) {
      if (!a || a.tanggal !== today || (ta && a.tahunAjaran !== ta)) return;
      var k = a.guruKey || a.guru; if (!k) return;
      if (a.type === 'Datang') peta[k] = 'hadir';
      else if (peta[k] !== 'hadir' && (a.type === 'Izin' || a.type === 'Sakit' || a.type === 'Alpha')) peta[k] = a.type;
    });
    var daftarGuru = arr(typeof allGuru !== 'undefined' ? allGuru : []);
    var berjadwal = {};
    arr(typeof allJadwal !== 'undefined' ? allJadwal : []).forEach(function (j) { if (j && j.hari === hari) berjadwal[kunciGuruDariJadwal(j, daftarGuru)] = true; });
    var c = { hadir: 0, Izin: 0, Sakit: 0, Alpha: 0, belum: 0 };
    Object.keys(peta).forEach(function (k) { c[peta[k]]++; });
    Object.keys(berjadwal).forEach(function (k) { if (!peta[k]) c.belum++; });
    var total = c.hadir + c.Izin + c.Sakit + c.Alpha + c.belum;
    return { c: c, total: total, adaJadwal: Object.keys(berjadwal).length > 0 };
  }

  function menitSekarang() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function menitDari(hhmm) { var m = /^(\d{1,2})[:.](\d{2})/.exec(String(hhmm || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function hitungJurnal() {
    var today = tanggalHariIni(), ta = tAjaran(), hari = hariIniNama(), sudahIsi = {};
    arr(typeof allJournals !== 'undefined' ? allJournals : []).forEach(function (j) {
      if (!j || j.tanggal !== today || (ta && j.tahunAjaran !== ta) || j.status === 'ditolak') return;
      sudahIsi[String(j.kelas) + '|' + String(j.jam_ke)] = true;
    });
    var jam = (typeof jamSettings !== 'undefined' && jamSettings) ? jamSettings : {};
    var c = { terisi: 0, belum: 0, akan: 0 }, kini = menitSekarang();
    arr(typeof allJadwal !== 'undefined' ? allJadwal : []).forEach(function (j) {
      if (!j || j.hari !== hari) return;
      if (sudahIsi[String(j.kelas) + '|' + String(j.jam)]) { c.terisi++; return; }
      var mulai = jam[j.jam] ? menitDari(jam[j.jam].mulai) : null;
      if (mulai !== null && mulai <= kini) c.belum++; else c.akan++;
    });
    return { c: c, total: c.terisi + c.belum + c.akan };
  }

  function hitungPetugas() {
    try {
      if (typeof monitorSusun !== 'function') return null;
      var s = monitorSusun();
      if (!s || !s.stat) return null;
      var st = s.stat, beres = Math.max(0, st.total - st.belum - st.lama);
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
    var el = wadah(); if (!el) return;
    if (!boleh()) { el.innerHTML = ''; el.style.display = 'none'; return; }
    css();
    el.style.display = '';
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
      ], g.total ? g.c.hadir + '/' + g.total : '-', 'guru',
      g.adaJadwal ? 'Belum absen = guru berjadwal hari ini tanpa catatan' : 'Tidak ada guru berjadwal hari ini');

      var j = hitungJurnal();
      html += kartu('📓 Jurnal Hari Ini', [
        { nama: 'Terisi', n: j.c.terisi, warna: HIJAU }, { nama: 'Belum diisi', n: j.c.belum, warna: MERAH },
        { nama: 'Akan datang', n: j.c.akan, warna: ABU }
      ], j.total ? j.c.terisi + '/' + j.total : '-', 'jam',
      j.total ? 'Belum diisi = jam pelajaran sudah mulai, jurnal belum ada' : 'Tidak ada jadwal hari ini');

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
    setInterval(function () { if (!document.hidden) render(); }, 30000);   // jam berjalan -> status "Belum diisi" ikut berubah
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
