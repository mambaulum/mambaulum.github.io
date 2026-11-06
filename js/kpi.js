// ============================================================
// KPI MADRASAH -- js/kpi.js  (halaman "KPI Madrasah", hanya Admin & Kepala Madrasah)
// Dimuat SESUDAH js/app.js dan js/infaq.js. Hanya MEMBACA data; tidak menulis apa pun ke Firebase.
//
// Sumber data (semua sudah dimuat app.js untuk tahun ajaran aktif):
//   allAttendance          -> kehadiran siswa. Satu catatan per kelas per tanggal: { tanggal, kelas, data:{siswaKey:'H'|'S'|'I'|'A'} }
//   allInfaqSiswa + allSiswa -> infaq mingguan: { siswaKey, kelas, minggu:'YYYY-Www', status:'lunas' }; siswa gratis tidak dihitung
//   allJadwal + allJournals  -> jurnal terisi: slot jadwal (kelas, hari, jam) dicocokkan ke jurnal (kelas, tanggal, jam_ke)
//   allTeacherAttendance   -> absensi guru: { tanggal, guruKey, type:'Datang'|'Pulang'|'Izin'|'Sakit'|'Alpha', keterangan:'Telat N menit' }
//   ortu_login_log (dibaca sekali, log ~31 hari terakhir lewat startAt pada kunci push, maks 20000) + noWaOrtu siswa -> orang tua aktif: nomor WA unik yang login berhasil <= 30 hari
//   angket_keunggulan/{periode} (dibaca sekali) -> jumlah responden
//
// "Hari sekolah" = tanggal yang punya minimal satu catatan absensi siswa (jadi hari libur otomatis tidak dihitung).
// Target di KPI_TARGET di bawah bisa diubah langsung.
// ============================================================
(function () {
  'use strict';

  var KPI_TARGET = { hadirSiswa: 95, infaq: 90, jurnal: 90, jurnalHariSama: 80, hadirGuru: 95, telatGuru: 5, ortuAktif: 70 };
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var ORTU_AKTIF_HARI = 30;

  // ---------- util ----------
  function el(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(a, b) { return b > 0 ? a / b * 100 : null; }
  function f1(v) { return v == null ? '-' : v.toFixed(1).replace('.', ',') + '%'; }
  function bolehLihat() {
    try { return !!(typeof currentUser !== 'undefined' && currentUser && (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.HEADMASTER)); } catch (e) { return false; }
  }
  function hariIniStr() { try { return tglLokal(); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function namaHari(tgl) { var p = String(tgl).split('-'); return HARI[new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay()]; }
  function tglDariIso(iso) {
    try { return tglLokal(new Date(iso)); } catch (e) { return String(iso || '').slice(0, 10); }
  }
  function adaStatus(v) { var s = String(v || '').toUpperCase(); return s === 'H' || s === 'S' || s === 'I' || s === 'A' ? s : ''; }

  // ---------- perhitungan murni (diuji terpisah) ----------
  // Kehadiran siswa. att = daftar catatan absensi; ym = 'YYYY-MM'; today = 'YYYY-MM-DD'.
  // nonaktif = objek {siswaKey:true} siswa non aktif; catatan mereka dilewati (tidak masuk Hadir/Sakit/Izin/Alfa).
  function hitungSiswa(att, ym, today, nonaktif) {
    nonaktif = nonaktif || {};
    var kelas = {}, total = { H: 0, S: 0, I: 0, A: 0 }, hari = {};
    (att || []).forEach(function (a) {
      if (!a || !a.tanggal || String(a.tanggal).indexOf(ym) !== 0 || a.tanggal > today) return;
      hari[a.tanggal] = true;
      var k = kelas[a.kelas] || (kelas[a.kelas] = { H: 0, S: 0, I: 0, A: 0, hari: {} });
      k.hari[a.tanggal] = true;
      Object.keys(a.data || {}).forEach(function (sk) {
        if (nonaktif[sk]) return;
        var s = adaStatus(a.data[sk]); if (!s) return;
        k[s]++; total[s]++;
      });
    });
    return { kelas: kelas, total: total, hariSekolah: Object.keys(hari).sort() };
  }

  // Infaq. weeks = daftar kunci minggu 'YYYY-Www' milik bulan itu yang sudah dimulai.
  function hitungInfaq(iuran, siswa, kelasList, weeks, gratisFn) {
    var set = {}; weeks.forEach(function (w) { set[w] = true; });
    var out = { kelas: {}, wajib: 0, lunas: 0, minggu: weeks.length };
    kelasList.forEach(function (k) {
      var wajib = {}; var n = 0;
      (siswa || []).forEach(function (s) { if (s.kelas === k && !gratisFn(s)) { wajib[s.key] = true; n++; } });
      var lunas = 0;
      (iuran || []).forEach(function (it) { if (it && it.kelas === k && set[it.minggu] && wajib[it.siswaKey] && (!it.status || it.status === 'lunas')) lunas++; });
      var pembagi = n * weeks.length;
      out.kelas[k] = { siswa: n, lunas: lunas, pembagi: pembagi };
      out.wajib += pembagi; out.lunas += lunas;
    });
    return out;
  }

  // Jurnal. hariList = tanggal hari sekolah yang sudah lewat (tanpa hari ini).
  function hitungJurnal(jadwal, journals, hariList) {
    var idx = {};
    (journals || []).forEach(function (j) {
      if (!j || (j.status && j.status !== 'approved')) return;
      idx[j.tanggal + '|' + j.kelas + '|' + String(j.jam_ke)] = j;
    });
    var tot = { exp: 0, fill: 0, tepat: 0, tepatDen: 0 }, guru = {};
    hariList.forEach(function (d) {
      var h = namaHari(d);
      (jadwal || []).forEach(function (s) {
        if (!s || s.hari !== h) return;
        var kunci = s.guruKey || s.guru || '-';
        var g = guru[kunci] || (guru[kunci] = { nama: s.guru || '-', exp: 0, fill: 0 });
        tot.exp++; g.exp++;
        var j = idx[d + '|' + s.kelas + '|' + String(s.jam)];
        if (!j) return;
        tot.fill++; g.fill++;
        if (j.dibuat) { tot.tepatDen++; if (tglDariIso(j.dibuat) === d) tot.tepat++; }
      });
    });
    return { total: tot, guru: guru };
  }

  // Absensi guru. hariSet = {tanggal:true} hari sekolah bulan itu (<= hari ini).
  function hitungGuru(teacherAtt, guruList, ym, hariSet) {
    var jmlHari = Object.keys(hariSet).length, baris = [], sumHadir = 0, sumDatang = 0, sumTelat = 0;
    guruList.forEach(function (g) {
      var hadir = {}, telat = 0, izin = 0, sakit = 0, alpha = 0;
      (teacherAtt || []).forEach(function (a) {
        if (!a || !a.tanggal || String(a.tanggal).indexOf(ym) !== 0 || !hariSet[a.tanggal]) return;
        if (!(a.guruKey ? a.guruKey === g.key : a.guru === g.name)) return;
        if (a.type === 'Datang') { hadir[a.tanggal] = true; if (/telat/i.test(a.keterangan || '')) telat++; }
        else if (a.type === 'Izin') izin++; else if (a.type === 'Sakit') sakit++; else if (a.type === 'Alpha') alpha++;
      });
      var n = Object.keys(hadir).length;
      sumHadir += n; sumDatang += n; sumTelat += telat;
      baris.push({ nama: g.name, hadir: n, hari: jmlHari, telat: telat, izin: izin, sakit: sakit, alpha: alpha });
    });
    return { baris: baris, hadirPct: pct(sumHadir, guruList.length * jmlHari), telatPct: pct(sumTelat, sumDatang), hari: jmlHari };
  }

  // Orang tua aktif: nomor WA unik (dari noWaOrtu siswa aktif) yang punya login BERHASIL dalam 30 hari terakhir di ortu_login_log.
  // waFn = fungsi normalisasi nomor (ortuWaKey dari portal-ortu.js); tanpa itu dipakai noWaKey / nomor apa adanya.
  function hitungOrtu(logs, siswa, sekarang, waFn) {
    var norm = function (x) { try { return waFn ? (waFn(x) || '') : String(x || ''); } catch (e) { return ''; } };
    var target = {}, tanpaWa = 0;
    (siswa || []).forEach(function (s) {
      var k = s.noWaKey || norm(s.noWaOrtu);
      if (k) target[k] = true; else tanpaWa++;
    });
    var batas = sekarang - ORTU_AKTIF_HARI * 86400000, aktif = {};
    (logs || []).forEach(function (l) {
      if (!l || l.hasil !== 'berhasil' || !l.wa) return;
      var t = Date.parse(l.waktu); if (isNaN(t) || t < batas) return;
      aktif[String(l.wa)] = true;
    });
    var total = Object.keys(target).length, n = 0;
    Object.keys(aktif).forEach(function (k) { if (target[k]) n++; });
    return { total: total, aktif: n, tanpaWa: tanpaWa, pct: pct(n, total) };
  }

  // ---------- status warna ----------
  function status(v, target, mode) {
    if (v == null) return { w: '#6b7280', t: 'Belum ada data' };
    if (mode === 'max') return v <= target ? { w: '#059669', t: 'Tercapai' } : v <= target * 2 ? { w: '#d97706', t: 'Mendekati' } : { w: '#dc2626', t: 'Belum tercapai' };
    return v >= target ? { w: '#059669', t: 'Tercapai' } : v >= target - 10 ? { w: '#d97706', t: 'Mendekati' } : { w: '#dc2626', t: 'Belum tercapai' };
  }

  // ---------- tampilan ----------
  var CSS = '.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0 16px;}' +
    '.kpi-card{border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:12px;}' +
    '.kpi-nama{font-size:12px;opacity:.75;margin-bottom:4px;}' +
    '.kpi-val{font-size:26px;font-weight:800;line-height:1.1;}' +
    '.kpi-sub{font-size:11px;opacity:.75;margin-top:4px;line-height:1.4;}' +
    '#kpiBulan{padding:8px 36px 8px 12px;min-height:40px;max-width:100%;}' +
    '.kpi-badge{display:inline-block;font-size:11px;font-weight:700;color:#fff;border-radius:999px;padding:2px 8px;margin-top:6px;}' +
    '.kpi-h{font-size:14px;font-weight:700;margin:16px 0 6px;}' +
    '.kpi-tbl{width:100%;border-collapse:collapse;font-size:12px;}' +
    '.kpi-tbl th,.kpi-tbl td{border:1px solid rgba(128,128,128,.3);padding:6px 8px;text-align:left;}' +
    '.kpi-scroll{overflow-x:auto;}.kpi-cat{font-size:11px;opacity:.7;margin:6px 0;line-height:1.5;}';
  function pasangCss() {
    if (el('kpiCss')) return;
    var s = document.createElement('style'); s.id = 'kpiCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  function kartu(nama, nilai, target, mode, sub) {
    var st = status(nilai, target, mode);
    return '<div class="kpi-card"><div class="kpi-nama">' + esc(nama) + '</div><div class="kpi-val" style="color:' + st.w + ';">' + f1(nilai) + '</div>' +
      '<div class="kpi-sub">Target ' + (mode === 'max' ? 'maksimal ' : 'minimal ') + target + '%' + (sub ? '<br>' + esc(sub) : '') + '</div><span class="kpi-badge" style="background:' + st.w + ';">' + st.t + '</span></div>';
  }
  function warna(v, target, mode) { return status(v, target, mode).w; }

  function daftarBulan() {
    var m = /^(\d{4})\/(\d{4})$/.exec(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '') || [null, String(new Date().getFullYear()), ''];
    var y0 = +m[1], now = hariIniStr(), out = [];
    for (var i = 0; i < 12; i++) {
      var bulan = 6 + i, y = y0 + (bulan > 11 ? 1 : 0), mm = bulan % 12;
      var ym = y + '-' + ('0' + (mm + 1)).slice(-2);
      if (ym + '-01' <= now) out.push({ ym: ym, y: y, m: mm, label: NAMA_BULAN[mm] + ' ' + y });
    }
    return out.reverse();
  }

  var terakhir = null; // hasil terakhir untuk CSV

  // Absensi guru dimuat belakangan oleh app.js (setelah data inti). Bila KPI dibuka sebelum selesai (atau pemuatannya sempat timeout),
  // allTeacherAttendance masih kosong -> kartu guru kosong. Di sini dimuat ulang sekali per pembukaan halaman, lalu tampilan dirender ulang.
  var guruMuat = { sedang: false, coba: false };
  function adaAbsenGuru() { try { return !!(allTeacherAttendance && allTeacherAttendance.length); } catch (e) { return false; } }
  function pastikanAbsenGuru() {
    if (adaAbsenGuru() || guruMuat.sedang || guruMuat.coba || typeof reloadDataset !== 'function') return;
    guruMuat.sedang = true;
    var selesai = false;
    function akhir() {
      if (selesai) return; selesai = true; guruMuat.sedang = false; guruMuat.coba = true;
      var pg = el('page-kpi'); if (pg && !pg.classList.contains('hidden')) { try { render(); } catch (e) {} }
    }
    try { reloadDataset('teacherAttendance', akhir); } catch (e) { akhir(); }
    setTimeout(akhir, 15000);
  }

  // allGuru hanya diisi oleh loadGuruListForLogin() di layar login (app.js), bukan oleh loadAllData(). Bila login lewat sesi tersimpan,
  // pemuatan itu timeout, atau cache offline-nya kosong, allGuru kosong -> kartu guru "Daftar guru belum termuat".
  // Di sini daftar guru dibaca sekali (hanya baca) dari node 'guru' dan dipakai sebagai cadangan; allGuru milik app.js tidak diubah.
  var guruCadangan = { data: [], sedang: false, coba: false };
  function adaDaftarGuru() { try { return !!(allGuru && allGuru.length); } catch (e) { return false; } }
  function pastikanDaftarGuru() {
    if (adaDaftarGuru() || guruCadangan.sedang || guruCadangan.coba || typeof db === 'undefined') return;
    guruCadangan.sedang = true;
    var selesai = false;
    function akhir(list) {
      if (selesai) return; selesai = true; guruCadangan.sedang = false; guruCadangan.coba = true;
      if (list && list.length) guruCadangan.data = list;
      var pg = el('page-kpi'); if (pg && !pg.classList.contains('hidden')) { try { render(); } catch (e) {} }
    }
    try {
      db.ref('guru').once('value').then(function (sn) {
        var list = []; sn.forEach(function (c) { var g = c.val(); if (g) { g.key = c.key; list.push(g); } });
        akhir(list);
      }, function () { akhir(null); });
    } catch (e) { akhir(null); }
    setTimeout(function () { akhir(null); }, 15000);
  }

  function render() {
    var p = el('page-kpi'); if (!p) return;
    pasangCss();
    if (!bolehLihat()) { p.innerHTML = '<div class="card"><p class="text-muted">Halaman ini hanya untuk Admin dan Kepala Madrasah.</p></div>'; return; }
    var bulan = daftarBulan();
    var pilih = (el('kpiBulan') && el('kpiBulan').value) || (bulan[0] && bulan[0].ym);
    if (!pilih) { p.innerHTML = '<div class="card"><p class="text-muted">Belum ada bulan berjalan pada tahun ajaran ini.</p></div>'; return; }
    var b = bulan.filter(function (x) { return x.ym === pilih; })[0] || bulan[0];
    var today = hariIniStr();

    var dataSiap = (allAttendance && allAttendance.length) || (allGuru && allGuru.length);
    var nonaktif = {};   // siswa non aktif (allSiswaSemua memuat semua siswa; allSiswa hanya yang aktif)
    try { (typeof allSiswaSemua !== 'undefined' ? allSiswaSemua : []).forEach(function (x) { if (x && x.aktif === false) nonaktif[x.key] = true; }); } catch (e) {}
    var sis = hitungSiswa(allAttendance, b.ym, today, nonaktif);
    var hariSet = {}; sis.hariSekolah.forEach(function (d) { hariSet[d] = true; });
    var hariLalu = sis.hariSekolah.filter(function (d) { return d < today; });

    // infaq
    var inf = null, infaqBerjalan = false;
    try {
      var weeks = infaqMingguBulan(b.y, b.m).filter(function (k) { return tglLokal(mingguKeTanggal(k).senin) <= today; });
      inf = hitungInfaq(allInfaqSiswa, allSiswa, KELAS_LIST, weeks, iuranGratis);
      if (weeks.length) infaqBerjalan = tglLokal(mingguKeTanggal(weeks[weeks.length - 1]).minggu) >= today;   // minggu terakhir belum selesai
    } catch (e) { inf = null; }
    var jur = hitungJurnal(allJadwal, allJournals, hariLalu);
    if (!adaDaftarGuru()) pastikanDaftarGuru();
    var guruList = (adaDaftarGuru() ? allGuru : guruCadangan.data).filter(function (g) { return g.role === 'guru' || g.role === 'wali_kelas' || !g.role; })
      .sort(function (a, c) { return String(a.name || '').localeCompare(String(c.name || ''), 'id'); });
    var hariSetLalu = {}; hariLalu.forEach(function (d) { hariSetLalu[d] = true; });   // hari ini belum dihitung: guru bisa saja belum absen
    var gr = hitungGuru(allTeacherAttendance, guruList, b.ym, hariSetLalu);
    var adaTA = adaAbsenGuru();
    if (!adaTA) { gr.hadirPct = null; gr.telatPct = null; pastikanAbsenGuru(); }   // jangan tampil 0% yang menyesatkan saat datanya belum ada
    var ketGuru = (guruMuat.sedang || guruCadangan.sedang) ? 'Memuat data guru…' : (!adaTA ? 'Catatan absensi guru belum ada / belum bisa dimuat' : (!guruList.length ? 'Daftar guru belum termuat' : null));

    var pSiswa = pct(sis.total.H, sis.total.H + sis.total.S + sis.total.I + sis.total.A);
    var pInfaq = inf ? pct(inf.lunas, inf.wajib) : null;
    var pJur = pct(jur.total.fill, jur.total.exp);
    var pJurHari = pct(jur.total.tepat, jur.total.tepatDen);

    var h = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📊 Indikator Kinerja Utama Madrasah</h3>' +
      '<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Dihitung otomatis dari data aplikasi. Periode: <select id="kpiBulan">' +
      bulan.map(function (x) { return '<option value="' + x.ym + '"' + (x.ym === b.ym ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select> ' +
      '<button type="button" class="btn btn-soft" id="kpiCsv" title="CSV = Comma-Separated Values">Unduh CSV</button></p>' +
      '<div class="kpi-cat">Singkatan: <b>KPI</b> (nama di menu) = Key Performance Indicator, yaitu Indikator Kinerja Utama; <b>CSV</b> = Comma-Separated Values (berkas tabel yang bisa dibuka di Excel); <b>WA</b> = WhatsApp.</div>' +
      (dataSiap ? '' : '<div class="kpi-cat" style="color:#b45309;">Data belum termuat sepenuhnya. Tunggu sebentar atau muat ulang aplikasi.</div>') +
      '<div class="kpi-cat">Hari sekolah bulan ini (ada absensi siswa): <b>' + sis.hariSekolah.length + '</b> hari. Siswa non aktif tidak dihitung.</div>' +
      '<div class="kpi-grid">' +
      kartu('Kehadiran siswa', pSiswa, KPI_TARGET.hadirSiswa, 'min', 'Alfa: ' + sis.total.A + ' siswa-hari') +
      kartu('Infaq lunas', pInfaq, KPI_TARGET.infaq, 'min', inf ? inf.minggu + ' minggu dihitung' + (infaqBerjalan ? ' (termasuk minggu berjalan, belum selesai)' : '') : 'Data infaq belum termuat') +
      kartu('Jurnal terisi', pJur, KPI_TARGET.jurnal, 'min', jur.total.fill + ' dari ' + jur.total.exp + ' jam terjadwal') +
      kartu('Jurnal di hari yang sama', pJurHari, KPI_TARGET.jurnalHariSama, 'min', 'dari jurnal yang tercatat waktu buatnya') +
      kartu('Kehadiran guru', gr.hadirPct, KPI_TARGET.hadirGuru, 'min', ketGuru || (guruList.length + ' guru, ' + gr.hari + ' hari tanpa hari ini')) +
      kartu('Guru datang terlambat', gr.telatPct, KPI_TARGET.telatGuru, 'max', ketGuru || 'dari semua catatan Datang') +
      '</div>' +
      '<div id="kpiOrtu" class="kpi-grid"><div class="kpi-card"><div class="kpi-nama">Orang tua aktif</div><div class="kpi-sub">Memuat...</div></div></div>';

    // per kelas
    h += '<div class="kpi-h">Per Kelas</div><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Kelas</th><th>Hadir siswa</th><th>Alfa</th><th>Hari absensi</th><th>Infaq lunas</th></tr>' +
      KELAS_LIST.map(function (k) {
        var s = sis.kelas[k], i = inf && inf.kelas[k];
        var ps = s ? pct(s.H, s.H + s.S + s.I + s.A) : null, pi = i ? pct(i.lunas, i.pembagi) : null;
        return '<tr><td>' + esc(k) + '</td><td style="color:' + warna(ps, KPI_TARGET.hadirSiswa, 'min') + ';font-weight:700;">' + f1(ps) + '</td><td>' + (s ? s.A : '-') + '</td><td>' + (s ? Object.keys(s.hari).length : 0) + '</td><td style="color:' + warna(pi, KPI_TARGET.infaq, 'min') + ';font-weight:700;">' + f1(pi) + (i ? ' <span style="opacity:.7;font-weight:400;">(' + i.siswa + ' siswa)</span>' : '') + '</td></tr>';
      }).join('') + '</table></div>';

    // jurnal per guru (terendah dulu)
    var jg = Object.keys(jur.guru).map(function (k) { var g = jur.guru[k]; return { nama: g.nama, exp: g.exp, fill: g.fill, p: pct(g.fill, g.exp) }; })
      .sort(function (a, c) { return (a.p == null ? 101 : a.p) - (c.p == null ? 101 : c.p); });
    h += '<div class="kpi-h">Jurnal per Guru</div><details open><summary style="cursor:pointer;font-size:12px;">' + jg.length + ' guru terjadwal (terendah di atas)</summary><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Guru</th><th>Terisi</th><th>Terjadwal</th><th>%</th></tr>' +
      jg.map(function (g) { return '<tr><td>' + esc(g.nama) + '</td><td>' + g.fill + '</td><td>' + g.exp + '</td><td style="color:' + warna(g.p, KPI_TARGET.jurnal, 'min') + ';font-weight:700;">' + f1(g.p) + '</td></tr>'; }).join('') + '</table></div></details>' +
      '<div class="kpi-cat">Jam terjadwal dihitung untuk hari sekolah yang sudah lewat. Jurnal dianggap terisi bila ada jurnal berstatus disetujui untuk kelas, tanggal, dan jam ke yang sama.</div>';

    // guru
    var gb = gr.baris.slice().sort(function (a, c) { return (pct(a.hadir, a.hari) == null ? 101 : pct(a.hadir, a.hari)) - (pct(c.hadir, c.hari) == null ? 101 : pct(c.hadir, c.hari)); });
    h += '<div class="kpi-h">Kehadiran Guru</div><details><summary style="cursor:pointer;font-size:12px;">' + gb.length + ' guru (terendah di atas)</summary><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Guru</th><th>Hadir</th><th>Telat</th><th>Izin</th><th>Sakit</th><th>Alpha</th></tr>' +
      gb.map(function (g) { var pg = pct(g.hadir, g.hari); return '<tr><td>' + esc(g.nama) + '</td><td style="color:' + warna(pg, KPI_TARGET.hadirGuru, 'min') + ';font-weight:700;">' + g.hadir + '/' + g.hari + ' (' + f1(pg) + ')</td><td>' + g.telat + '</td><td>' + g.izin + '</td><td>' + g.sakit + '</td><td>' + g.alpha + '</td></tr>'; }).join('') + '</table></div></details>' +
      '<div class="kpi-cat">Kehadiran guru dihitung dari catatan Datang dibanding hari sekolah yang sudah lewat (hari ini belum dihitung). Izin, sakit, dan alpha ditampilkan terpisah.</div>';
    h += '</div>';
    p.innerHTML = h;
    el('kpiBulan').addEventListener('change', render);
    terakhir = { b: b, sis: sis, inf: inf, jur: jur, gr: gr, pSiswa: pSiswa, pInfaq: pInfaq, pJur: pJur, pJurHari: pJurHari, ortu: null };
    el('kpiCsv').addEventListener('click', unduhCsv);
    muatOrtu();
  }

  // Kunci push Firebase diawali 8 karakter waktu (urut naik), jadi log 30 hari terakhir bisa diambil dengan startAt() pada kunci tanpa indeks.
  var PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  function kunciDariWaktu(ms) {
    var out = '';
    for (var i = 0; i < 8; i++) { out = PUSH_CHARS.charAt(ms % 64) + out; ms = Math.floor(ms / 64); }
    return out;
  }

  function muatOrtu() {
    var w = el('kpiOrtu'); if (!w || typeof db === 'undefined') return;
    var akunP = db.ref('ortu_login_log').orderByKey().startAt(kunciDariWaktu(Date.now() - (ORTU_AKTIF_HARI + 1) * 86400000)).limitToLast(20000).once('value').then(function (sn) {
      var logs = []; sn.forEach(function (c) { logs.push(c.val()); });
      return hitungOrtu(logs, allSiswa, Date.now(), (typeof ortuWaKey === 'function') ? ortuWaKey : null);
    }, function () { return null; });
    var angketP = db.ref('angket_keunggulan_status').once('value').then(function (sn) {
      var per = (sn.val() || {}).periode; if (!per) return null;
      return db.ref('angket_keunggulan/' + per).once('value').then(function (s2) {
        var v = s2.val() || {}, r = {}; ['guru', 'kepala', 'ortu', 'siswa'].forEach(function (j) { r[j] = Object.keys(v[j] || {}).length; });
        r.periode = per; return r;
      });
    }).catch(function () { return null; });
    Promise.all([akunP, angketP]).then(function (r) {
      if (el('kpiOrtu') !== w) return;
      if (terakhir) terakhir.ortu = r[0];
      var h = r[0] ? kartu('Orang tua aktif', r[0].pct, KPI_TARGET.ortuAktif, 'min', r[0].aktif + ' dari ' + r[0].total + ' nomor WhatsApp (WA) login ≤ ' + ORTU_AKTIF_HARI + ' hari' + (r[0].tanpaWa ? ' (' + r[0].tanpaWa + ' siswa belum punya nomor WA)' : '')) :
        '<div class="kpi-card"><div class="kpi-nama">Orang tua aktif</div><div class="kpi-sub">Riwayat login orang tua tidak bisa dibaca (izin akses).</div></div>';
      var a = r[1];
      h += a ? '<div class="kpi-card"><div class="kpi-nama">Angket Keunggulan</div><div class="kpi-val">' + (a.guru + a.kepala + a.ortu + a.siswa) + '</div><div class="kpi-sub">responden<br>Guru ' + a.guru + ' · Kepala ' + a.kepala + '<br>Orang tua ' + a.ortu + ' · Siswa ' + a.siswa + '</div></div>' :
        '<div class="kpi-card"><div class="kpi-nama">Angket Keunggulan</div><div class="kpi-sub">Belum ada data atau tidak bisa dibaca.</div></div>';
      w.innerHTML = h;
    });
  }

  function unduhCsv() {
    var t = terakhir; if (!t) return;
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var n1 = function (v) { return v == null ? '' : v.toFixed(1).replace('.', ','); };
    var baris = [['KPI Madrasah', t.b.label], [], ['Indikator', 'Nilai (%)', 'Target (%)'],
      ['Kehadiran siswa', n1(t.pSiswa), '>= ' + KPI_TARGET.hadirSiswa], ['Infaq lunas', n1(t.pInfaq), '>= ' + KPI_TARGET.infaq],
      ['Jurnal terisi', n1(t.pJur), '>= ' + KPI_TARGET.jurnal], ['Jurnal di hari yang sama', n1(t.pJurHari), '>= ' + KPI_TARGET.jurnalHariSama],
      ['Kehadiran guru', n1(t.gr.hadirPct), '>= ' + KPI_TARGET.hadirGuru], ['Guru datang terlambat', n1(t.gr.telatPct), '<= ' + KPI_TARGET.telatGuru],
      ['Orang tua aktif', t.ortu ? n1(t.ortu.pct) : '', '>= ' + KPI_TARGET.ortuAktif], [], ['Kelas', 'Hadir siswa (%)', 'Alfa', 'Infaq lunas (%)']];
    KELAS_LIST.forEach(function (k) {
      var s = t.sis.kelas[k], i = t.inf && t.inf.kelas[k];
      baris.push([k, s ? n1(pct(s.H, s.H + s.S + s.I + s.A)) : '', s ? s.A : '', i ? n1(pct(i.lunas, i.pembagi)) : '']);
    });
    var csv = '\ufeff' + baris.map(function (r) { return r.map(q).join(';'); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'kpi-madrasah_' + t.b.ym + '.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  // ---------- sambungan ke menu & halaman ----------
  // Tidak membungkus navigateTo (sudah dibungkus beberapa kali di app.js): cukup memantau halaman #page-kpi.
  function aturMenu() {
    var ok = bolehLihat();
    Array.prototype.forEach.call(document.querySelectorAll('.menu-item[data-page="kpi"]'), function (m) { m.classList.toggle('hidden-tab', !ok); });
  }
  function pasang() {
    var pg = el('page-kpi'); if (!pg) return;
    var tampilSebelumnya = false;
    new MutationObserver(function () {
      var tampil = !pg.classList.contains('hidden');
      if (tampil && !tampilSebelumnya) {
        var t = el('pageTitle'); if (t) t.textContent = 'KPI Madrasah';
        guruMuat.coba = false; guruCadangan.coba = false;
        try { render(); } catch (e) { pg.innerHTML = '<div class="card"><p class="text-muted">KPI gagal dimuat: ' + esc(e && e.message ? e.message : e) + '</p></div>'; try { console.error('[kpi]', e); } catch (e2) {} }
      }
      tampilSebelumnya = tampil;
    }).observe(pg, { attributes: true, attributeFilter: ['class'] });
    var judul = el('pageTitle');
    if (judul) new MutationObserver(function () {
      if (pg.classList.contains('hidden')) return;
      if (judul.textContent !== 'KPI Madrasah') judul.textContent = 'KPI Madrasah';
    }).observe(judul, { childList: true, characterData: true, subtree: true });
    aturMenu(); setInterval(aturMenu, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();

  window.KPI = { hitungSiswa: hitungSiswa, hitungInfaq: hitungInfaq, hitungJurnal: hitungJurnal, hitungGuru: hitungGuru, hitungOrtu: hitungOrtu, target: KPI_TARGET };
})();
