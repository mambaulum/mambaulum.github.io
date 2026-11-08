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
//
// Periode: per bulan, Semester 1 (Jul-Des), Semester 2 (Jan-Jun), atau satu tahun ajaran. Setiap kartu menampilkan selisih (poin persen)
// terhadap periode pembanding: bulan -> bulan sebelumnya; Semester 2 -> Semester 1. Juli, Semester 1, dan Tahun Ajaran tidak punya
// pembanding karena data tahun ajaran lama tidak dimuat. Kartu Orang tua aktif selalu 30 hari terakhir (tidak mengikuti periode).
// "Tidak absen pulang" = hari wajib hadir yang punya catatan Datang tetapi tidak punya catatan Pulang (hari ini tidak dihitung).
// Target & arsip (BARU): node Firebase kpi_v4 (target/{umum,s1,s2}, arsip/{TA}/bulan/{YYYY-MM}, arsip/{TA}/ortu/{YYYY-MM}). Dibaca sekali per
// pembukaan halaman; ditulis HANYA oleh Admin. Arsip menyimpan pembilang & penyebut tiap bulan (bukan hanya persen) supaya semester/tahun lalu bisa
// dijumlahkan dengan tepat dan dipakai sebagai pembanding lintas tahun ajaran. Perlu blok Rules kpi_v4 (lihat _catatan/rules-kpi_v4.txt).
// Keluaran: tampilan layar, CSV, dan PDF ringkasan 1 halaman untuk Kepala Madrasah (jsPDF lewat ensureLib('pdf') milik app.js).
// ============================================================
(function () {
  'use strict';

  var KPI_TARGET = { hadirSiswa: 95, infaq: 90, jurnal: 90, jurnalHariSama: 80, hadirGuru: 95, telatGuru: 5, tanpaPulang: 5, ortuAktif: 70 };
  var KPI_DEFAULT = {}; Object.keys(KPI_TARGET).forEach(function (k) { KPI_DEFAULT[k] = KPI_TARGET[k]; });
  var LABEL_TARGET = [['hadirSiswa', 'Kehadiran siswa (min. %)'], ['infaq', 'Infaq lunas (min. %)'], ['jurnal', 'Jurnal terisi (min. %)'], ['jurnalHariSama', 'Jurnal di hari yang sama (min. %)'],
    ['hadirGuru', 'Kehadiran guru (min. %)'], ['telatGuru', 'Guru datang terlambat (maks. %)'], ['tanpaPulang', 'Guru tidak absen pulang (maks. %)'], ['ortuAktif', 'Orang tua aktif (min. %)']];
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
  // ym boleh satu bulan 'YYYY-MM' atau daftar bulan ['YYYY-MM', ...] (semester / tahun ajaran).
  function bulanSet(ym) { var o = {}; (Array.isArray(ym) ? ym : [ym]).forEach(function (x) { o[x] = true; }); return o; }
  function adaStatus(v) { var s = String(v || '').toUpperCase(); return s === 'H' || s === 'S' || s === 'I' || s === 'A' ? s : ''; }

  // ---------- perhitungan murni (diuji terpisah) ----------
  // Kehadiran siswa. att = daftar catatan absensi; ym = 'YYYY-MM'; today = 'YYYY-MM-DD'.
  // nonaktif = objek {siswaKey:true} siswa non aktif; catatan mereka dilewati (tidak masuk Hadir/Sakit/Izin/Alfa).
  function hitungSiswa(att, ym, today, nonaktif) {
    nonaktif = nonaktif || {};
    var bs = bulanSet(ym);
    var kelas = {}, total = { H: 0, S: 0, I: 0, A: 0 }, hari = {};
    (att || []).forEach(function (a) {
      if (!a || !a.tanggal || !bs[String(a.tanggal).slice(0, 7)] || a.tanggal > today) return;
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
  // teacherAtt (opsional) = absensi guru: jam terjadwal pada hari guru itu tercatat Izin/Sakit DIKECUALIKAN (tidak masuk terjadwal
  // maupun terisi), karena ketidakhadirannya sah. Tanpa teacherAtt semua jam dihitung (perilaku lama).
  function hitungJurnal(jadwal, journals, hariList, teacherAtt) {
    var normNama = function (x) { return String(x || '').toLowerCase().replace(/[\s.,]+/g, ''); };
    var izinKey = {}, izinNamaTanpaKey = {}, izinNamaSemua = {};
    (teacherAtt || []).forEach(function (a) {
      if (!a || !a.tanggal || (a.type !== 'Izin' && a.type !== 'Sakit')) return;
      var n = normNama(a.guru);
      if (a.guruKey) izinKey[a.tanggal + '|' + a.guruKey] = true; else if (n) izinNamaTanpaKey[a.tanggal + '|' + n] = true;
      if (n) izinNamaSemua[a.tanggal + '|' + n] = true;
    });
    function guruIzinSakit(d, s) {
      if (s.guruKey) return !!(izinKey[d + '|' + s.guruKey] || izinNamaTanpaKey[d + '|' + normNama(s.guru)]);   // slot punya key: jangan cocokkan nama dengan guru lain yang berkey
      return !!izinNamaSemua[d + '|' + normNama(s.guru)];
    }
    var idx = {}, idxMenunggu = {};
    (journals || []).forEach(function (j) {
      if (!j) return;
      var kunciJ = j.tanggal + '|' + j.kelas + '|' + String(j.jam_ke);
      if (j.status === 'pending') { idxMenunggu[kunciJ] = true; return; }   // sudah diisi guru, belum disetujui: dihitung terpisah
      if (j.status && j.status !== 'approved') return;
      idx[kunciJ] = j;
    });
    var tot = { exp: 0, fill: 0, tepat: 0, tepatDen: 0, menunggu: 0, kecuali: 0 }, guru = {};
    hariList.forEach(function (d) {
      var h = namaHari(d);
      (jadwal || []).forEach(function (s) {
        if (!s || s.hari !== h) return;
        if (guruIzinSakit(d, s)) { tot.kecuali++; return; }   // guru Izin/Sakit: jam ini tidak dihitung
        var kunci = s.guruKey || s.guru || '-';
        var g = guru[kunci] || (guru[kunci] = { nama: s.guru || '-', exp: 0, fill: 0, menunggu: 0 });
        tot.exp++; g.exp++;
        var kunciS = d + '|' + s.kelas + '|' + String(s.jam);
        var j = idx[kunciS];
        if (!j) { if (idxMenunggu[kunciS]) { tot.menunggu++; g.menunggu++; } return; }
        tot.fill++; g.fill++;
        if (j.dibuat) { tot.tepatDen++; if (tglDariIso(j.dibuat) === d) tot.tepat++; }
      });
    });
    return { total: tot, guru: guru };
  }

  // Absensi guru. hariSet = {tanggal:true} hari sekolah bulan itu (<= hari ini).
  // Penyebut kehadiran = HARI WAJIB HADIR tiap guru (sama dengan aturan Alpha otomatis & pengingat di app.js):
  // Minggu / tanggal merah tidak dihitung; guru yang punya jadwal hanya dihitung di hari jadwalnya; guru tanpa jadwal sama sekali
  // dihitung semua hari sekolah. Kalau fungsi aturan itu tidak ada, semua hari sekolah dianggap wajib (perilaku lama).
  function wajibHadirHari(g, tgl) {
    try { if (typeof hariLiburSinkron === 'function' && hariLiburSinkron(tgl)) return false; } catch (e) {}
    try { return typeof guruWajibHadirHari === 'function' ? !!guruWajibHadirHari(g, namaHari(tgl)) : true; } catch (e) { return true; }
  }
  function hitungGuru(teacherAtt, guruList, ym, hariSet) {
    var bs = bulanSet(ym);
    var hariSemua = Object.keys(hariSet), jmlHari = hariSemua.length, baris = [], sumHadir = 0, sumWajib = 0, sumDatang = 0, sumTelat = 0, sumTanpa = 0;
    guruList.forEach(function (g) {
      var wajib = {}, hadir = {}, pulang = {}, telat = 0, izin = 0, sakit = 0, alpha = 0;
      hariSemua.forEach(function (d) { if (wajibHadirHari(g, d)) wajib[d] = true; });
      (teacherAtt || []).forEach(function (a) {
        if (!a || !a.tanggal || !bs[String(a.tanggal).slice(0, 7)] || !hariSet[a.tanggal] || !wajib[a.tanggal]) return;
        if (!(a.guruKey ? a.guruKey === g.key : a.guru === g.name)) return;
        if (a.type === 'Datang') { hadir[a.tanggal] = true; if (/telat/i.test(a.keterangan || '')) telat++; }
        else if (a.type === 'Pulang') pulang[a.tanggal] = true;
        else if (a.type === 'Izin') izin++; else if (a.type === 'Sakit') sakit++; else if (a.type === 'Alpha') alpha++;
      });
      var n = Object.keys(hadir).length, nWajib = Object.keys(wajib).length;
      var tanpa = Object.keys(hadir).filter(function (d) { return !pulang[d]; }).length;   // hari Datang tanpa catatan Pulang
      sumHadir += n; sumWajib += nWajib; sumDatang += n; sumTelat += telat; sumTanpa += tanpa;
      baris.push({ key: g.key, noWa: g.noWa || '', nama: g.name, hadir: n, hari: nWajib, telat: telat, izin: izin, sakit: sakit, alpha: alpha, tanpaPulang: tanpa });
    });
    return { baris: baris, hadirPct: pct(sumHadir, sumWajib), telatPct: pct(sumTelat, sumDatang), tanpaPulangPct: pct(sumTanpa, sumHadir), tanpaPulang: sumTanpa, hadirTotal: sumHadir, wajibTotal: sumWajib, telatTotal: sumTelat, hari: jmlHari };
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
    '#kpiPeriode{padding:8px 36px 8px 12px;min-height:40px;max-width:100%;}' +
    '.kpi-bd{font-size:11px;margin-top:6px;line-height:1.4;}.kpi-bd b{font-weight:800;}' +
    '.kpi-badge{display:inline-block;font-size:11px;font-weight:700;color:#fff;border-radius:999px;padding:2px 8px;margin-top:6px;}' +
    '.kpi-h{font-size:14px;font-weight:700;margin:16px 0 6px;}' +
    '.kpi-tbl{width:100%;border-collapse:collapse;font-size:12px;}' +
    '.kpi-tbl th,.kpi-tbl td{border:1px solid rgba(128,128,128,.3);padding:6px 8px;text-align:left;}' +
    '.kpi-scroll{overflow-x:auto;}.kpi-cat{font-size:11px;opacity:.7;margin:6px 0;line-height:1.5;}';
  function pasangCss() {
    if (el('kpiCss')) return;
    var s = document.createElement('style'); s.id = 'kpiCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  // Selisih dalam poin persen. mode 'min': naik = baik; mode 'max' (telat, tanpa absen pulang): naik = buruk.
  function selisih(now, prev) { return (now == null || prev == null) ? null : now - prev; }
  function fPoin(d) { return Math.abs(d).toFixed(1).replace('.', ',') + ' poin'; }
  function teksPembanding(d, mode) {   // teks polos (dipakai CSV/PDF): 'Naik 2,3 poin (membaik)'
    if (d == null) return 'Belum ada pembanding';
    if (Math.abs(d) < 0.05) return 'Sama';
    var baik = mode === 'max' ? d < 0 : d > 0;
    return (d > 0 ? 'Naik ' : 'Turun ') + fPoin(d) + (baik ? ' (membaik)' : ' (memburuk)');
  }
  // pb = { ada: apakah periode pembanding ada, label: nama periode pembanding, prev: nilai pembanding }
  function barisPembanding(nilai, mode, pb) {
    if (!pb || !pb.ada) return '';
    var d = selisih(nilai, pb.prev);
    if (d == null) return '<div class="kpi-bd" style="color:#6b7280;">Belum ada pembanding vs ' + esc(pb.label) + '</div>';
    if (Math.abs(d) < 0.05) return '<div class="kpi-bd" style="color:#6b7280;"><b>● Sama</b><br>vs ' + esc(pb.label) + '</div>';
    var baik = mode === 'max' ? d < 0 : d > 0, w = baik ? '#059669' : '#dc2626';
    return '<div class="kpi-bd" style="color:' + w + ';" aria-label="' + esc(teksPembanding(d, mode)) + '"><b>' + (d > 0 ? '▲' : '▼') + ' ' + fPoin(d) + '</b> · ' + (baik ? 'membaik' : 'memburuk') +
      '<br><span style="opacity:.8;color:inherit;">vs ' + esc(pb.label) + ' (' + f1(pb.prev) + ')</span></div>';
  }
  function kartu(nama, nilai, target, mode, sub, pb) {
    var st = status(nilai, target, mode);
    return '<div class="kpi-card"><div class="kpi-nama">' + esc(nama) + '</div><div class="kpi-val" style="color:' + st.w + ';">' + f1(nilai) + '</div>' +
      '<div class="kpi-sub">Target ' + (mode === 'max' ? 'maksimal ' : 'minimal ') + target + '%' + (sub ? '<br>' + esc(sub) : '') + '</div><span class="kpi-badge" style="background:' + st.w + ';">' + st.t + '</span>' +
      barisPembanding(nilai, mode, pb) + '</div>';
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

  // ---------- periode: bulan / semester / tahun ajaran ----------
  function daftarPeriode() {
    var bl = daftarBulan(), asc = bl.slice().reverse(), todayYm = hariIniStr().slice(0, 7);
    var s1 = asc.filter(function (x) { return x.m >= 6; }), s2 = asc.filter(function (x) { return x.m < 6; });
    var bulanList = bl.map(function (x) { return { kode: 'b:' + x.ym, jenis: 'bulan', label: x.label, bulan: [x] }; });
    var lain = [];
    function sem(arr, no, rentang) {
      if (!arr.length) return null;
      var berjalan = arr.length < 6 || arr[arr.length - 1].ym === todayYm;
      return { kode: 's' + no, jenis: 'semester', label: 'Semester ' + no + ' (' + rentang + ' ' + arr[0].y + ')' + (berjalan ? ' - berjalan' : ''), pendek: 'Semester ' + no, bulan: arr };
    }
    var p1 = sem(s1, 1, 'Jul-Des'), p2 = sem(s2, 2, 'Jan-Jun');
    if (p2) lain.push(p2);
    if (p1) lain.push(p1);
    if (asc.length > 1) lain.push({ kode: 'ta', jenis: 'ta', label: 'Satu tahun ajaran ' + (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : ''), pendek: 'Tahun ajaran', bulan: asc });
    var semua = bulanList.concat(lain), peta = {};
    semua.forEach(function (x) { peta[x.kode] = x; });
    return { bulanList: bulanList, lain: lain, peta: peta, p1: p1 };
  }
  // ---------- arsip bulanan & target (Firebase kpi_v4) ----------
  function pad2(n) { return ('0' + n).slice(-2); }
  function ymSebelum(ym) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7); return m === 1 ? (y - 1) + '-12' : y + '-' + pad2(m - 1); }
  function taKeyDariYm(ym) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7), y0 = m >= 7 ? y : y - 1; return y0 + '-' + (y0 + 1); }
  function taKeyAktif() { var m = /^(\d{4})\/(\d{4})$/.exec(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : ''); return m ? m[1] + '-' + m[2] : null; }
  function ymTA(y0) { var o = [], i; for (i = 7; i <= 12; i++) o.push(y0 + '-' + pad2(i)); for (i = 1; i <= 6; i++) o.push((y0 + 1) + '-' + pad2(i)); return o; }
  function labelYm(ym) { return NAMA_BULAN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
  function isAdminKpi() { try { return !!(currentUser && currentUser.role === ROLES.ADMIN); } catch (e) { return false; } }

  var arsip = { data: null, sedang: false, coba: false, galat: null, gagalTulis: null, sedangTulis: false };
  function arsipBulan(ta, ym) { var d = arsip.data; return d && d.arsip && d.arsip[ta] && d.arsip[ta].bulan && d.arsip[ta].bulan[ym] || null; }
  function arsipOrtu(ym) { var d = arsip.data, ta = taKeyDariYm(ym); return d && d.arsip && d.arsip[ta] && d.arsip[ta].ortu && d.arsip[ta].ortu[ym] || null; }
  var KUNCI_C = ['sH', 'sTot', 'iN', 'iD', 'jF', 'jE', 'jT', 'jTD', 'gH', 'gW', 'gTel', 'gTP', 'hari'];
  function sumC(list) { var o = {}; KUNCI_C.forEach(function (k) { o[k] = 0; list.forEach(function (c) { o[k] += +(c && c[k]) || 0; }); }); return o; }
  function persenDariC(c) {
    return { pSiswa: pct(c.sH, c.sTot), pInfaq: pct(c.iN, c.iD), pJur: pct(c.jF, c.jE), pJurHari: pct(c.jT, c.jTD),
      pHadirGuru: pct(c.gH, c.gW), pTelat: pct(c.gTel, c.gH), pTanpaPulang: pct(c.gTP, c.gH) };
  }
  function setLokal(path, val) {   // cerminkan penulisan ke arsip.data supaya tidak perlu baca ulang
    if (!arsip.data) arsip.data = {};
    var seg = path.replace(/^kpi_v4\//, '').split('/'), o = arsip.data, i;
    for (i = 0; i < seg.length - 1; i++) { if (!o[seg[i]] || typeof o[seg[i]] !== 'object') o[seg[i]] = {}; o = o[seg[i]]; }
    if (val == null) delete o[seg[seg.length - 1]]; else o[seg[seg.length - 1]] = val;
  }
  // diam = true: proses latar belakang, tidak memunculkan prompt Kunci Admin (memakai adminSesiSiap milik app.js).
  function tulisKpi(path, data, cb, diam) {
    var siap;
    try { siap = diam ? ((typeof adminSesiSiap === 'function') ? adminSesiSiap(true) : Promise.resolve(true)) : ((typeof adminSesi === 'function') ? adminSesi() : Promise.resolve(true)); } catch (e) { siap = Promise.reject(e); }
    Promise.resolve(siap).then(function () { return db.ref(path).set(data); })
      .then(function () { setLokal(path, data); if (cb) cb(null); }, function (e) { if (cb) cb(e || new Error('gagal')); });
  }
  function muatArsip() {
    if (arsip.sedang || arsip.coba || typeof db === 'undefined') return;
    arsip.sedang = true;
    var selesai = false;
    function akhir(val, err) {
      if (selesai) return; selesai = true; arsip.sedang = false; arsip.coba = true;
      if (err) { arsip.galat = err; arsip.data = null; } else { arsip.galat = null; arsip.data = val || {}; }
      var pg = el('page-kpi'); if (pg && !pg.classList.contains('hidden')) { try { render(); } catch (e) {} }
    }
    try { db.ref('kpi_v4').once('value').then(function (sn) { akhir(sn.val() || {}, null); }, function (e) { akhir(null, (e && e.message) || 'ditolak'); }); } catch (e) { akhir(null, 'gagal'); }
    setTimeout(function () { akhir(null, 'timeout'); }, 15000);
  }

  // Simpan otomatis arsip bulan yang sudah lewat (hanya Admin, hanya bila data inti sudah lengkap & arsip bulan itu belum ada).
  function arsipOtomatis(dp, today, nonaktif, guruList) {
    if (!isAdminKpi() || arsip.galat || arsip.data == null || arsip.sedangTulis || arsip.gagalTulis) return;
    if (!(allAttendance && allAttendance.length) || !adaAbsenGuru() || !guruList.length || guruMuat.sedang || guruCadangan.sedang) return;
    var ta = taKeyAktif(); if (!ta) return;
    var ada = (arsip.data.arsip && arsip.data.arsip[ta] && arsip.data.arsip[ta].bulan) || {}, ymNow = today.slice(0, 7);
    var antre = dp.bulanList.map(function (x) { return x.bulan[0]; }).filter(function (x) { return x.ym < ymNow && !ada[x.ym]; });
    if (!antre.length) return;
    arsip.sedangTulis = true;
    antre.reduce(function (pr, b) {
      return pr.then(function () {
        return new Promise(function (res) {
          var m = hitungPeriode([b], today, nonaktif, guruList);
          if (!m.c.hari || m.inf == null) { res(); return; }
          var payload = {}; KUNCI_C.forEach(function (k) { payload[k] = m.c[k] || 0; }); payload.ts = new Date().toISOString();
          tulisKpi('kpi_v4/arsip/' + ta + '/bulan/' + b.ym, payload, function (err) { if (err) arsip.gagalTulis = (err && err.message) || 'ditolak'; res(); }, true);
        });
      });
    }, Promise.resolve()).then(function () { arsip.sedangTulis = false; });
  }
  // Admin menimpa arsip semua bulan yang sudah lewat (mis. setelah data diperbaiki).
  function arsipkanUlang(dp, today, nonaktif, guruList, btn) {
    var ta = taKeyAktif(), ymNow = today.slice(0, 7); if (!ta) return;
    if (!adaAbsenGuru() || !guruList.length) { pesan('Data guru/absensi belum termuat. Tunggu sebentar lalu coba lagi.', true); return; }
    var antre = dp.bulanList.slice().reverse().map(function (x) { return x.bulan[0]; }).filter(function (x) { return x.ym < ymNow; });
    if (!antre.length) { pesan('Belum ada bulan yang sudah lewat pada tahun ajaran ini.'); return; }
    if (typeof confirm === 'function' && !confirm('Timpa arsip ' + antre.length + ' bulan yang sudah lewat dengan angka terbaru?')) return;
    if (btn) btn.disabled = true;
    var ok = 0, gagal = null;
    antre.reduce(function (pr, b, i) {
      return pr.then(function () {
        return new Promise(function (res) {
          var m = hitungPeriode([b], today, nonaktif, guruList), payload = {}; KUNCI_C.forEach(function (k) { payload[k] = m.c[k] || 0; }); payload.ts = new Date().toISOString();
          if (!m.c.hari) { res(); return; }
          tulisKpi('kpi_v4/arsip/' + ta + '/bulan/' + b.ym, payload, function (err) { if (err) gagal = gagal || ((err && err.message) || 'ditolak'); else ok++; res(); }, i > 0);
        });
      });
    }, Promise.resolve()).then(function () {
      if (btn) btn.disabled = false;
      pesan(gagal ? 'Arsip gagal disimpan: ' + gagal : 'Arsip diperbarui: ' + ok + ' bulan.', !!gagal);
      try { render(); } catch (e) {}
    });
  }
  // Snapshot "Orang tua aktif" (selalu 30 hari terakhir): disimpan per bulan (nilai terakhir bulan itu jadi pembanding bulan berikutnya).
  function simpanOrtuSnap(r) {
    if (!isAdminKpi() || arsip.galat || arsip.data == null || !r || r.pct == null) return;
    var ym = hariIniStr().slice(0, 7), kunci = 'kpiOrtuSnap';
    try { var o = (localStorage.getItem(kunci) || '').split('|'); if (o[0] === ym && Date.now() - (+o[1] || 0) < 6 * 3600000) return; } catch (e) {}
    tulisKpi('kpi_v4/arsip/' + taKeyDariYm(ym) + '/ortu/' + ym, { pct: r.pct, aktif: r.aktif, total: r.total, ts: new Date().toISOString() }, function (err) {
      if (!err) { try { localStorage.setItem(kunci, ym + '|' + Date.now()); } catch (e) {} }
    }, true);
  }

  // ---------- target yang dipakai periode ini ----------
  function terapkanTarget(per) {
    var kode = per.jenis === 'bulan' ? (per.bulan[0].m >= 6 ? 's1' : 's2') : (per.jenis === 'semester' ? per.kode : 'umum');
    var d = (arsip.data && arsip.data.target) || {};
    Object.keys(KPI_DEFAULT).forEach(function (k) { KPI_TARGET[k] = KPI_DEFAULT[k]; });
    [d.umum, d[kode]].forEach(function (o) {
      if (!o) return;
      Object.keys(KPI_DEFAULT).forEach(function (k) { var v = +o[k]; if (o[k] != null && o[k] !== '' && isFinite(v) && v >= 0 && v <= 100) KPI_TARGET[k] = v; });
    });
    return { kode: kode, ada: !!(Object.keys(d.umum || {}).length || Object.keys(d[kode] || {}).length) };
  }

  // Pembanding: bulan -> bulan sebelumnya (data termuat; Juli -> Juni dari arsip); Semester 2 -> Semester 1;
  // Semester 1 -> Semester 2 tahun ajaran lalu (arsip, harus lengkap 6 bulan); Tahun ajaran -> tahun ajaran lalu (arsip, lengkap 12 bulan).
  // Mengembalikan { pemb: {label, prev:{pSiswa...}} | null, alasan: teks | null }
  function ambilPembanding(per, dp, today, nonaktif, guruList) {
    var y0 = +(taKeyAktif() || '0-0').split('-')[0], taLalu = (y0 - 1) + '-' + y0, tanpaArsip = arsip.galat ? ' (arsip KPI belum bisa dibaca: periksa Rules kpi_v4)' : '';
    function dariArsip(daftarYm, label, nama) {
      var cs = daftarYm.map(function (ym) { return arsipBulan(taKeyDariYm(ym), ym); }).filter(Boolean);
      if (cs.length === daftarYm.length) return { pemb: { label: label, prev: persenDariC(sumC(cs)) }, alasan: null };
      return { pemb: null, alasan: nama + ' belum ada di arsip KPI (' + cs.length + ' dari ' + daftarYm.length + ' bulan tersimpan; arsip mulai terisi sejak fitur ini dipasang)' + tanpaArsip + '.' };
    }
    if (per.jenis === 'bulan') {
      var i = dp.bulanList.indexOf(per), prev = dp.bulanList[i + 1];
      if (prev) return { pemb: { label: prev.label, prev: hitungPeriode(prev.bulan, today, nonaktif, guruList) }, alasan: null };
      var ymL = ymSebelum(per.bulan[0].ym);
      return dariArsip([ymL], labelYm(ymL), labelYm(ymL));
    }
    if (per.kode === 's2' && dp.p1) return { pemb: { label: dp.p1.pendek, prev: hitungPeriode(dp.p1.bulan, today, nonaktif, guruList) }, alasan: null };
    if (per.kode === 's1') return dariArsip(ymTA(y0 - 1).slice(6), 'Semester 2 ' + (y0 - 1) + '/' + y0, 'Semester 2 tahun ajaran ' + (y0 - 1) + '/' + y0);
    if (per.jenis === 'ta') return dariArsip(ymTA(y0 - 1), 'Tahun ajaran ' + (y0 - 1) + '/' + y0, 'Tahun ajaran ' + (y0 - 1) + '/' + y0);
    return { pemb: null, alasan: 'Pembanding tidak tersedia untuk periode ini.' };
  }

  // Seluruh angka KPI untuk sekumpulan bulan (satu bulan, semester, atau tahun ajaran).
  function hitungPeriode(bulanList, today, nonaktif, guruList) {
    var yms = bulanList.map(function (x) { return x.ym; });
    var sis = hitungSiswa(allAttendance, yms, today, nonaktif);
    var hariLalu = sis.hariSekolah.filter(function (d) { return d < today; });
    var hariSetLalu = {}; hariLalu.forEach(function (d) { hariSetLalu[d] = true; });   // hari ini belum dihitung: guru bisa saja belum absen
    var inf = null, infaqBerjalan = false;
    try {
      var seen = {}, weeks = [];
      bulanList.forEach(function (b) {
        infaqMingguBulan(b.y, b.m).forEach(function (k) {
          if (!seen[k] && tglLokal(mingguKeTanggal(k).senin) <= today) { seen[k] = true; weeks.push(k); }
        });
      });
      weeks.sort();
      inf = hitungInfaq(allInfaqSiswa, allSiswa, KELAS_LIST, weeks, iuranGratis);
      if (weeks.length) infaqBerjalan = tglLokal(mingguKeTanggal(weeks[weeks.length - 1]).minggu) >= today;   // minggu terakhir belum selesai
    } catch (e) { inf = null; }
    var jur = hitungJurnal(allJadwal, allJournals, hariLalu, allTeacherAttendance);
    var gr = hitungGuru(allTeacherAttendance, guruList, yms, hariSetLalu);
    if (!adaAbsenGuru()) { gr.hadirPct = null; gr.telatPct = null; gr.tanpaPulangPct = null; }   // jangan tampil 0% yang menyesatkan saat datanya belum ada
    var ta0 = adaAbsenGuru();
    var c = { sH: sis.total.H, sTot: sis.total.H + sis.total.S + sis.total.I + sis.total.A, iN: inf ? inf.lunas : 0, iD: inf ? inf.wajib : 0,
      jF: jur.total.fill, jE: jur.total.exp, jT: jur.total.tepat, jTD: jur.total.tepatDen,
      gH: ta0 ? gr.hadirTotal : 0, gW: ta0 ? gr.wajibTotal : 0, gTel: ta0 ? gr.telatTotal : 0, gTP: ta0 ? gr.tanpaPulang : 0, hari: sis.hariSekolah.length };
    return {
      c: c, yms: yms, sis: sis, inf: inf, infaqBerjalan: infaqBerjalan, jur: jur, gr: gr,
      pSiswa: pct(sis.total.H, sis.total.H + sis.total.S + sis.total.I + sis.total.A),
      pInfaq: inf ? pct(inf.lunas, inf.wajib) : null,
      pJur: pct(jur.total.fill, jur.total.exp), pJurHari: pct(jur.total.tepat, jur.total.tepatDen),
      pHadirGuru: gr.hadirPct, pTelat: gr.telatPct, pTanpaPulang: gr.tanpaPulangPct
    };
  }

  var terakhir = null; // hasil terakhir untuk CSV & PDF

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

  var ENTRI_INDIKATOR = [   // urutan & nama indikator (layar, CSV, PDF)
    { k: 'pSiswa',      nama: 'Kehadiran siswa',          target: 'hadirSiswa',     mode: 'min' },
    { k: 'pInfaq',      nama: 'Infaq lunas',              target: 'infaq',          mode: 'min' },
    { k: 'pJur',        nama: 'Jurnal terisi',            target: 'jurnal',         mode: 'min' },
    { k: 'pJurHari',    nama: 'Jurnal di hari yang sama', target: 'jurnalHariSama', mode: 'min' },
    { k: 'pHadirGuru',  nama: 'Kehadiran guru',           target: 'hadirGuru',      mode: 'min' },
    { k: 'pTelat',      nama: 'Guru datang terlambat',    target: 'telatGuru',      mode: 'max' },
    { k: 'pTanpaPulang', nama: 'Guru tidak absen pulang', target: 'tanpaPulang',    mode: 'max' }
  ];

  function render() {
    var p = el('page-kpi'); if (!p) return;
    pasangCss();
    if (!bolehLihat()) { p.innerHTML = '<div class="card"><p class="text-muted">Halaman ini hanya untuk Admin dan Kepala Madrasah.</p></div>'; return; }
    var dp = daftarPeriode();
    if (!dp.bulanList.length) { p.innerHTML = '<div class="card"><p class="text-muted">Belum ada bulan berjalan pada tahun ajaran ini.</p></div>'; return; }
    var pilih = (el('kpiPeriode') && el('kpiPeriode').value) || dp.bulanList[0].kode;
    var per = dp.peta[pilih] || dp.bulanList[0];
    var today = hariIniStr();
    if (!arsip.coba) muatArsip();
    var tg = terapkanTarget(per);

    var dataSiap = (allAttendance && allAttendance.length) || (allGuru && allGuru.length);
    var nonaktif = {};   // siswa non aktif (allSiswaSemua memuat semua siswa; allSiswa hanya yang aktif)
    try { (typeof allSiswaSemua !== 'undefined' ? allSiswaSemua : []).forEach(function (x) { if (x && x.aktif === false) nonaktif[x.key] = true; }); } catch (e) {}
    if (!adaDaftarGuru()) pastikanDaftarGuru();
    var guruList = (adaDaftarGuru() ? allGuru : guruCadangan.data).filter(function (g) { return g.role === 'guru' || g.role === 'wali_kelas' || !g.role; })
      .sort(function (a, c) { return String(a.name || '').localeCompare(String(c.name || ''), 'id'); });

    var cur = hitungPeriode(per.bulan, today, nonaktif, guruList);
    var sis = cur.sis, inf = cur.inf, jur = cur.jur, gr = cur.gr;
    var adaTA = adaAbsenGuru();
    if (!adaTA) pastikanAbsenGuru();
    var ketGuru = (guruMuat.sedang || guruCadangan.sedang) ? 'Memuat data guru…' : (!adaTA ? 'Catatan absensi guru belum ada / belum bisa dimuat' : (!guruList.length ? 'Daftar guru belum termuat' : null));

    // pembanding
    var pbr = ambilPembanding(per, dp, today, nonaktif, guruList), pemb = pbr.pemb, prev = pemb ? pemb.prev : null;
    function pb(k) { return pemb ? { ada: true, label: pemb.label, prev: prev[k] } : null; }
    arsipOtomatis(dp, today, nonaktif, guruList);

    var h = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📊 Indikator Kinerja Utama Madrasah</h3>' +
      '<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Dihitung otomatis dari data aplikasi. Periode: <select id="kpiPeriode">' +
      '<optgroup label="Per bulan">' + dp.bulanList.map(function (x) { return '<option value="' + x.kode + '"' + (x.kode === per.kode ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</optgroup>' +
      (dp.lain.length ? '<optgroup label="Semester dan tahun ajaran">' + dp.lain.map(function (x) { return '<option value="' + x.kode + '"' + (x.kode === per.kode ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</optgroup>' : '') +
      '</select> ' +
      '<button type="button" class="btn btn-soft" id="kpiPdf" title="PDF ringkasan 1 halaman untuk Kepala Madrasah">Unduh PDF</button> ' +
      '<label style="font-size:12px;white-space:nowrap;"><input type="checkbox" id="kpiPdfNama"> sertakan nama guru di PDF</label> ' +
      '<button type="button" class="btn btn-soft" id="kpiCsv" title="CSV = Comma-Separated Values">Unduh CSV</button></p>' +
      '<div class="kpi-cat">Singkatan: <b>KPI</b> (nama di menu) = Key Performance Indicator, yaitu Indikator Kinerja Utama; <b>CSV</b> = Comma-Separated Values (berkas tabel yang bisa dibuka di Excel); <b>PDF</b> = Portable Document Format; <b>WA</b> = WhatsApp.</div>' +
      (dataSiap ? '' : '<div class="kpi-cat" style="color:#b45309;">Data belum termuat sepenuhnya. Tunggu sebentar atau muat ulang aplikasi.</div>') +
      '<div class="kpi-cat">Hari sekolah pada periode ini (ada absensi siswa): <b>' + sis.hariSekolah.length + '</b> hari. Siswa non aktif tidak dihitung.</div>' +
      '<div class="kpi-cat">' + (pemb ? 'Panah ▲▼ = selisih dalam poin persen terhadap <b>' + esc(pemb.label) + '</b>. Hijau = membaik, merah = memburuk (untuk indikator yang makin kecil makin baik, turun berarti membaik). Periode berjalan dibandingkan dengan periode pembanding yang sudah penuh.' : esc(pbr.alasan || 'Pembanding tidak tersedia untuk periode ini.')) + '</div>' +
      (arsip.galat ? '<div class="kpi-cat" style="color:#b45309;">Target tersimpan dan arsip KPI belum bisa dibaca (' + esc(arsip.galat) + '). Tambahkan blok Rules kpi_v4 (lihat catatan deploy); sementara dipakai target bawaan dan tanpa pembanding lintas tahun.</div>' : '') +
      (arsip.gagalTulis ? '<div class="kpi-cat" style="color:#b45309;">Arsip bulanan gagal disimpan (' + esc(arsip.gagalTulis) + '). Periksa Rules kpi_v4 dan sesi Admin.</div>' : '') +
      '<div class="kpi-grid">' +
      kartu('Kehadiran siswa', cur.pSiswa, KPI_TARGET.hadirSiswa, 'min', 'Alfa: ' + sis.total.A + ' siswa-hari', pb('pSiswa')) +
      kartu('Infaq lunas', cur.pInfaq, KPI_TARGET.infaq, 'min', inf ? inf.minggu + ' minggu dihitung' + (cur.infaqBerjalan ? ' (termasuk minggu berjalan, belum selesai)' : '') : 'Data infaq belum termuat', pb('pInfaq')) +
      kartu('Jurnal terisi', cur.pJur, KPI_TARGET.jurnal, 'min', jur.total.fill + ' dari ' + jur.total.exp + ' jam terjadwal' + (jur.total.menunggu ? ' · ' + jur.total.menunggu + ' jam menunggu persetujuan (belum dihitung)' : '') + (jur.total.kecuali ? ' · ' + jur.total.kecuali + ' jam dikecualikan (guru izin/sakit)' : ''), pb('pJur')) +
      kartu('Jurnal di hari yang sama', cur.pJurHari, KPI_TARGET.jurnalHariSama, 'min', 'dari jurnal yang tercatat waktu buatnya', pb('pJurHari')) +
      kartu('Kehadiran guru', cur.pHadirGuru, KPI_TARGET.hadirGuru, 'min', ketGuru || (guruList.length + ' guru, ' + gr.hari + ' hari tanpa hari ini'), pb('pHadirGuru')) +
      kartu('Guru datang terlambat', cur.pTelat, KPI_TARGET.telatGuru, 'max', ketGuru || 'dari semua catatan Datang', pb('pTelat')) +
      kartu('Guru tidak absen pulang', cur.pTanpaPulang, KPI_TARGET.tanpaPulang, 'max', ketGuru || (gr.tanpaPulang + ' dari ' + gr.hadirTotal + ' hari hadir tanpa catatan Pulang'), pb('pTanpaPulang')) +
      '</div>' +
      '<div id="kpiOrtu" class="kpi-grid"><div class="kpi-card"><div class="kpi-nama">Orang tua aktif</div><div class="kpi-sub">Memuat...</div></div></div>';

    // rincian per bulan (semester / tahun ajaran)
    var rincian = null;
    if (per.jenis !== 'bulan') {
      rincian = per.bulan.map(function (b) { return { b: b, m: hitungPeriode([b], today, nonaktif, guruList) }; });
      var sel = function (v, tk, mode) { return '<td style="color:' + warna(v, KPI_TARGET[tk], mode) + ';font-weight:700;">' + f1(v) + '</td>'; };
      h += '<div class="kpi-h">Rincian per Bulan</div><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Bulan</th><th>Hadir siswa</th><th>Infaq</th><th>Jurnal</th><th>Jurnal hari sama</th><th>Hadir guru</th><th>Telat</th><th>Tanpa absen pulang</th></tr>' +
        rincian.map(function (r) {
          var m = r.m;
          return '<tr><td>' + esc(r.b.label) + '</td>' + sel(m.pSiswa, 'hadirSiswa', 'min') + sel(m.pInfaq, 'infaq', 'min') + sel(m.pJur, 'jurnal', 'min') + sel(m.pJurHari, 'jurnalHariSama', 'min') +
            sel(m.pHadirGuru, 'hadirGuru', 'min') + sel(m.pTelat, 'telatGuru', 'max') + sel(m.pTanpaPulang, 'tanpaPulang', 'max') + '</tr>';
        }).join('') + '</table></div>' +
        '<div class="kpi-cat">Angka di baris Semester/Tahun ajaran (kartu di atas) dihitung dari seluruh hari dan minggu pada periode itu, bukan rata-rata angka bulanan.</div>';
    }

    // per kelas
    h += '<div class="kpi-h">Per Kelas</div><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Kelas</th><th>Hadir siswa</th><th>Alfa</th><th>Hari absensi</th><th>Infaq lunas</th></tr>' +
      KELAS_LIST.map(function (k) {
        var s = sis.kelas[k], i = inf && inf.kelas[k];
        var ps = s ? pct(s.H, s.H + s.S + s.I + s.A) : null, pi = i ? pct(i.lunas, i.pembagi) : null;
        return '<tr><td>' + esc(k) + '</td><td style="color:' + warna(ps, KPI_TARGET.hadirSiswa, 'min') + ';font-weight:700;">' + f1(ps) + '</td><td>' + (s ? s.A : '-') + '</td><td>' + (s ? Object.keys(s.hari).length : 0) + '</td><td style="color:' + warna(pi, KPI_TARGET.infaq, 'min') + ';font-weight:700;">' + f1(pi) + (i ? ' <span style="opacity:.7;font-weight:400;">(' + i.siswa + ' siswa)</span>' : '') + '</td></tr>';
      }).join('') + '</table></div>';

    // jurnal per guru (terendah dulu)
    var jg = Object.keys(jur.guru).map(function (k) { var g = jur.guru[k]; return { nama: g.nama, exp: g.exp, fill: g.fill, menunggu: g.menunggu || 0, p: pct(g.fill, g.exp) }; })
      .sort(function (a, c) { return (a.p == null ? 101 : a.p) - (c.p == null ? 101 : c.p); });
    h += '<div class="kpi-h">Jurnal per Guru</div><details open><summary style="cursor:pointer;font-size:12px;">' + jg.length + ' guru terjadwal (terendah di atas)</summary><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Guru</th><th>Terisi</th><th>Menunggu</th><th>Terjadwal</th><th>%</th></tr>' +
      jg.map(function (g) { return '<tr><td>' + esc(g.nama) + '</td><td>' + g.fill + '</td><td>' + (g.menunggu || 0) + '</td><td>' + g.exp + '</td><td style="color:' + warna(g.p, KPI_TARGET.jurnal, 'min') + ';font-weight:700;">' + f1(g.p) + '</td></tr>'; }).join('') + '</table></div></details>' +
      '<div class="kpi-cat">Jam terjadwal dihitung untuk hari sekolah yang sudah lewat. Jurnal dianggap terisi bila ada jurnal berstatus disetujui untuk kelas, tanggal, dan jam ke yang sama. Jam saat guru tercatat Izin/Sakit dikecualikan dari hitungan. Kolom Menunggu = jurnal sudah diisi guru tetapi belum disetujui (belum dihitung terisi; akan naik begitu disetujui).</div>';

    // guru
    var gb = gr.baris.slice().sort(function (a, c) { return (pct(a.hadir, a.hari) == null ? 101 : pct(a.hadir, a.hari)) - (pct(c.hadir, c.hari) == null ? 101 : pct(c.hadir, c.hari)); });
    h += '<div class="kpi-h">Kehadiran Guru</div><details><summary style="cursor:pointer;font-size:12px;">' + gb.length + ' guru (terendah di atas)</summary><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Guru</th><th>Hadir</th><th>Telat</th><th>Tanpa absen pulang</th><th>Izin</th><th>Sakit</th><th>Alpha</th><th>Pengingat</th></tr>' +
      gb.map(function (g, ix) { var pg = pct(g.hadir, g.hari); return '<tr><td>' + esc(g.nama) + '</td><td style="color:' + warna(pg, KPI_TARGET.hadirGuru, 'min') + ';font-weight:700;">' + g.hadir + '/' + g.hari + ' (' + f1(pg) + ')</td><td>' + g.telat + '</td><td>' + g.tanpaPulang + '</td><td>' + g.izin + '</td><td>' + g.sakit + '</td><td>' + g.alpha + '</td><td>' + (g.tanpaPulang > 0 ? '<button type="button" class="btn btn-soft" data-wa="' + ix + '" title="Kirim pengingat lewat WhatsApp">WA</button>' : '-') + '</td></tr>'; }).join('') + '</table></div></details>' +
      '<div class="kpi-cat">Kehadiran guru dihitung dari catatan Datang dibanding hari wajib hadir guru (hari sekolah yang sudah lewat; guru berjadwal hanya dihitung di hari jadwalnya; Minggu/tanggal merah tidak dihitung; hari ini belum dihitung). Tidak absen pulang = hari hadir (ada catatan Datang) tanpa catatan Pulang. Izin, sakit, dan alpha ditampilkan terpisah.</div>';
    h += htmlPengaturan(tg);
    h += '</div>';
    p.innerHTML = h;
    el('kpiPeriode').addEventListener('change', render);
    terakhir = { per: per, pemb: pemb, cur: cur, prev: prev, rincian: rincian, ortu: null, gb: gb };
    el('page-kpi').onclick = function (ev) {   // satu penangan klik untuk tombol WA di tabel guru
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-wa]') : null;
      if (b) ingatkanWa(+b.getAttribute('data-wa'));
    };
    pasangPengaturan(tg, dp, today, nonaktif, guruList);
    el('kpiCsv').addEventListener('click', unduhCsv);
    el('kpiPdf').addEventListener('click', unduhPdf);
    muatOrtu();
  }

  // Kunci push Firebase diawali 8 karakter waktu (urut naik), jadi log 30 hari terakhir bisa diambil dengan startAt() pada kunci tanpa indeks.
  var PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  function kunciDariWaktu(ms) {
    var out = '';
    for (var i = 0; i < 8; i++) { out = PUSH_CHARS.charAt(ms % 64) + out; ms = Math.floor(ms / 64); }
    return out;
  }

  var ortuCache = null;   // hasil baca log login disimpan 2 menit: render() bisa terpanggil berkali-kali (periode, muat data guru, arsip)
  function ambilOrtu() {
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
    return Promise.all([akunP, angketP]);
  }
  function muatOrtu() {
    var w = el('kpiOrtu'); if (!w || typeof db === 'undefined') return;
    var pr = (ortuCache && Date.now() - ortuCache.t < 120000) ? Promise.resolve(ortuCache.r) : ambilOrtu().then(function (r) { ortuCache = { t: Date.now(), r: r }; return r; });
    pr.then(function (r) {
      if (el('kpiOrtu') !== w) return;
      if (terakhir) terakhir.ortu = r[0];
      if (r[0]) simpanOrtuSnap(r[0]);
      // pembanding: nilai terakhir yang tersimpan di arsip untuk bulan lalu (dibandingkan dengan angka 30 hari terakhir sekarang)
      var ymL = ymSebelum(hariIniStr().slice(0, 7)), sn0 = arsipOrtu(ymL);
      var pbO = (arsip.data != null && !arsip.galat) ? { ada: true, label: 'akhir ' + labelYm(ymL), prev: sn0 ? sn0.pct : null } : null;
      var h = r[0] ? kartu('Orang tua aktif', r[0].pct, KPI_TARGET.ortuAktif, 'min', r[0].aktif + ' dari ' + r[0].total + ' nomor WhatsApp (WA) login ≤ ' + ORTU_AKTIF_HARI + ' hari' + (r[0].tanpaWa ? ' (' + r[0].tanpaWa + ' siswa belum punya nomor WA)' : '') + ' · selalu 30 hari terakhir, tidak mengikuti periode', pbO) :
        '<div class="kpi-card"><div class="kpi-nama">Orang tua aktif</div><div class="kpi-sub">Riwayat login orang tua tidak bisa dibaca (izin akses).</div></div>';
      var a = r[1];
      h += a ? '<div class="kpi-card"><div class="kpi-nama">Angket Keunggulan</div><div class="kpi-val">' + (a.guru + a.kepala + a.ortu + a.siswa) + '</div><div class="kpi-sub">responden<br>Guru ' + a.guru + ' · Kepala ' + a.kepala + '<br>Orang tua ' + a.ortu + ' · Siswa ' + a.siswa + '</div></div>' :
        '<div class="kpi-card"><div class="kpi-nama">Angket Keunggulan</div><div class="kpi-sub">Belum ada data atau tidak bisa dibaca.</div></div>';
      w.innerHTML = h;
    });
  }

  // ---------- pengaturan target (Admin) & arsip ----------
  function htmlPengaturan(tg) {
    var admin = isAdminKpi();
    var h = '<div class="kpi-h">Target KPI dan Arsip</div><div class="kpi-cat">Target yang dipakai pada periode ini: <b>' + (tg.ada ? 'disesuaikan' : 'bawaan') + '</b> (berlaku untuk ' + (tg.kode === 'umum' ? 'seluruh periode' : 'Semester ' + tg.kode.slice(1)) + ').</div>';
    if (!admin) return h + '<div class="kpi-cat">Target hanya dapat diubah oleh Admin.</div>';
    h += '<details><summary style="cursor:pointer;font-size:12px;">⚙️ Atur target dan arsip (Admin)</summary><div style="margin-top:8px;">' +
      '<div class="kpi-cat">Kosongkan kolom untuk memakai nilai bawaan / nilai "Semua periode". Target Semester 1 atau 2 menimpa target "Semua periode".</div>' +
      '<p style="font-size:12px;margin:6px 0;">Berlaku untuk: <select id="kpiTScope"><option value="umum">Semua periode</option><option value="s1">Semester 1 (Jul-Des)</option><option value="s2">Semester 2 (Jan-Jun)</option></select></p>' +
      '<div class="kpi-grid">' + LABEL_TARGET.map(function (x) { return '<label style="font-size:12px;display:block;">' + esc(x[1]) + '<input type="number" min="0" max="100" step="0.5" inputmode="decimal" id="kpiT_' + x[0] + '" style="width:100%;margin-top:2px;"></label>'; }).join('') + '</div>' +
      '<p style="margin-top:8px;"><button type="button" class="btn btn-primary" id="kpiTSimpan">Simpan target</button> <button type="button" class="btn btn-soft" id="kpiTReset">Kembalikan ke bawaan</button></p>' +
      '<div class="kpi-cat" style="margin-top:10px;">Arsip bulanan tersimpan otomatis untuk bulan yang sudah lewat saat Admin membuka halaman ini, dan dipakai sebagai pembanding Juli, Semester 1, dan tahun ajaran berikutnya.</div>' +
      '<p><button type="button" class="btn btn-soft" id="kpiArsipUlang">Timpa arsip bulan yang sudah lewat</button></p></div></details>';
    return h;
  }
  function pasangPengaturan(tg, dp, today, nonaktif, guruList) {
    var sc = el('kpiTScope'); if (!sc) return;
    function isi() {
      var d = (arsip.data && arsip.data.target && arsip.data.target[sc.value]) || {}, umum = (arsip.data && arsip.data.target && arsip.data.target.umum) || {};
      LABEL_TARGET.forEach(function (x) {
        var inp = el('kpiT_' + x[0]); if (!inp) return;
        inp.value = d[x[0]] != null ? d[x[0]] : '';
        inp.placeholder = String(sc.value !== 'umum' && umum[x[0]] != null ? umum[x[0]] : KPI_DEFAULT[x[0]]);
      });
    }
    sc.value = tg.kode === 'umum' ? 'umum' : tg.kode; isi();
    sc.addEventListener('change', isi);
    el('kpiTSimpan').addEventListener('click', function () {
      var o = {}, salah = null;
      LABEL_TARGET.forEach(function (x) {
        var v = String(el('kpiT_' + x[0]).value).trim().replace(',', '.'); if (v === '') return;
        var n = +v; if (!isFinite(n) || n < 0 || n > 100) salah = x[1]; else o[x[0]] = n;
      });
      if (salah) { pesan('Nilai target "' + salah + '" harus antara 0 dan 100.', true); return; }
      var b = el('kpiTSimpan'); b.disabled = true;
      tulisKpi('kpi_v4/target/' + sc.value, Object.keys(o).length ? o : null, function (err) {
        b.disabled = false;
        if (err) pesan('Target gagal disimpan: ' + ((err && err.message) || err) + '. Periksa Rules kpi_v4.', true);
        else { pesan('Target tersimpan.'); try { if (typeof addLog === 'function') addLog('ubah_target_kpi', sc.value); } catch (e) {} render(); }
      });
    });
    el('kpiTReset').addEventListener('click', function () {
      if (typeof confirm === 'function' && !confirm('Hapus target yang disesuaikan untuk pilihan ini dan kembali ke bawaan?')) return;
      tulisKpi('kpi_v4/target/' + sc.value, null, function (err) {
        if (err) pesan('Gagal mengembalikan target: ' + ((err && err.message) || err), true); else { pesan('Target dikembalikan ke bawaan.'); render(); }
      });
    });
    el('kpiArsipUlang').addEventListener('click', function () { arsipkanUlang(dp, today, nonaktif, guruList, el('kpiArsipUlang')); });
  }

  // ---------- pengingat WhatsApp ke guru (buka wa.me; pesan terkirim dari WhatsApp Admin/Kepala sendiri) ----------
  function ingatkanWa(ix) {
    var t = terakhir, g = t && t.gb && t.gb[ix]; if (!g) return;
    if (!g.noWa) { pesan('Nomor WhatsApp ' + g.nama + ' belum diisi. Isi lewat Edit Guru.', true); return; }
    var n = (typeof formatNomorWa === 'function') ? formatNomorWa(g.noWa) : String(g.noWa).replace(/\D/g, '');
    if (String(n).length < 10) { pesan('Nomor WhatsApp ' + g.nama + ' tidak valid.', true); return; }
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : {};
    var msg = 'Assalamu\'alaikum Bapak/Ibu ' + g.nama + ', ini pengingat dari ' + (M.nama || 'madrasah') + '.\n\nPada periode ' + t.per.label + ', tercatat ' + g.tanpaPulang + ' hari Anda sudah absen Datang tetapi belum absen Pulang. ' +
      'Mohon tekan absen Pulang setiap selesai mengajar. Jika catatan ini keliru (mis. lupa menekan karena gangguan sinyal), mohon konfirmasi ke Admin agar dikoreksi.\n\nTerima kasih.';
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank');
    try { if (typeof addLog === 'function') addLog('kpi_ingatkan_wa_pulang', g.nama); } catch (e) {}
  }

  // Baris indikator untuk CSV & PDF (teks polos).
  function barisIndikator(t) {
    var out = ENTRI_INDIKATOR.map(function (e) {
      var v = t.cur[e.k], pv = t.prev ? t.prev[e.k] : null, d = t.prev ? selisih(v, pv) : null;
      return { nama: e.nama, nilai: v, target: KPI_TARGET[e.target], mode: e.mode, st: status(v, KPI_TARGET[e.target], e.mode), prev: pv, d: d,
        pembText: t.pemb ? teksPembanding(d, e.mode) : 'Tidak ada' };
    });
    if (t.ortu) out.push({ nama: 'Orang tua aktif (30 hari terakhir)', nilai: t.ortu.pct, target: KPI_TARGET.ortuAktif, mode: 'min', st: status(t.ortu.pct, KPI_TARGET.ortuAktif, 'min'), prev: null, d: null, pembText: 'Tidak ada' });
    return out;
  }
  function targetTeks(r) { return (r.mode === 'max' ? '<= ' : '>= ') + r.target; }
  function targetTeksPdf(r) { return (r.mode === 'max' ? 'maks. ' : 'min. ') + r.target + '%'; }
  function ptgl() { var p = hariIniStr().split('-'); return (+p[2]) + ' ' + NAMA_BULAN[+p[1] - 1] + ' ' + p[0]; }
  function unduh(blob, nama) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = nama;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function pesan(msg, err) { try { if (typeof toast === 'function') toast(msg, !!err, err ? 6000 : 3500); else alert(msg); } catch (e) {} }

  function unduhCsv() {
    var t = terakhir; if (!t) return;
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var n1 = function (v) { return v == null ? '' : v.toFixed(1).replace('.', ','); };
    var baris = [['KPI Madrasah', t.per.label], ['Pembanding', t.pemb ? t.pemb.label : 'Tidak ada'], [],
      ['Indikator', 'Nilai (%)', 'Target (%)', 'Pembanding (%)', 'Selisih (poin)', 'Keterangan']];
    barisIndikator(t).forEach(function (r) {
      baris.push([r.nama, n1(r.nilai), targetTeks(r), n1(r.prev), r.d == null ? '' : (r.d > 0 ? '+' : '-') + n1(Math.abs(r.d)), r.pembText]);
    });
    baris.push([], ['Kelas', 'Hadir siswa (%)', 'Alfa', 'Infaq lunas (%)']);
    KELAS_LIST.forEach(function (k) {
      var s = t.cur.sis.kelas[k], i = t.cur.inf && t.cur.inf.kelas[k];
      baris.push([k, s ? n1(pct(s.H, s.H + s.S + s.I + s.A)) : '', s ? s.A : '', i ? n1(pct(i.lunas, i.pembagi)) : '']);
    });
    if (t.rincian) {
      baris.push([], ['Bulan', 'Hadir siswa (%)', 'Infaq lunas (%)', 'Jurnal terisi (%)', 'Jurnal hari sama (%)', 'Hadir guru (%)', 'Guru terlambat (%)', 'Tidak absen pulang (%)']);
      t.rincian.forEach(function (r) { var m = r.m; baris.push([r.b.label, n1(m.pSiswa), n1(m.pInfaq), n1(m.pJur), n1(m.pJurHari), n1(m.pHadirGuru), n1(m.pTelat), n1(m.pTanpaPulang)]); });
    }
    var csv = '\ufeff' + baris.map(function (r) { return r.map(q).join(';'); }).join('\r\n');
    unduh(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'kpi-madrasah_' + String(t.per.kode).replace(':', '-') + '.csv');
  }

  // ---------- PDF ringkasan untuk Kepala Madrasah (A4, ringkas; font bawaan jsPDF: hindari simbol di luar Latin) ----------
  function muatLogo() {
    return new Promise(function (res) {
      var im = new Image(), selesai = false;
      function fin(v) { if (!selesai) { selesai = true; res(v); } }
      im.onload = function () {
        try { var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); fin({ data: c.toDataURL('image/png'), w: im.naturalWidth, h: im.naturalHeight }); } catch (e) { fin(null); }
      };
      im.onerror = function () { fin(null); };
      setTimeout(function () { fin(null); }, 4000);
      im.src = 'logo/logo-lembaga.png';
    });
  }
  function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }

  function unduhPdf() {
    var t = terakhir; if (!t) return;
    var btn = el('kpiPdf');
    t.nama = !!(el('kpiPdfNama') && el('kpiPdfNama').checked);   // nama guru di bagian Perlu Perhatian: default tidak dicetak
    function selesai() { if (btn) { btn.disabled = false; btn.textContent = 'Unduh PDF'; } }
    if (btn) { btn.disabled = true; btn.textContent = 'Menyiapkan PDF...'; }
    var lib = (typeof ensureLib === 'function') ? ensureLib('pdf') : Promise.reject(new Error('ensureLib tidak ditemukan'));
    Promise.all([lib, muatLogo()]).then(function (r) { buatPdf(t, r[1]); selesai(); })
      .catch(function (e) { selesai(); pesan('PDF gagal dibuat: ' + (e && e.message ? e.message : e) + '. Periksa koneksi internet lalu coba lagi.', true); try { console.error('[kpi pdf]', e); } catch (e2) {} });
  }

  function buatPdf(t, logo) {
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var L = 15, R = 195, W = R - L, mid = 105, y = 14;
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : {};
    var gelap = [30, 41, 59];

    // kop
    if (logo) { var tinggi = 18, lebar = logo.w && logo.h ? tinggi * logo.w / logo.h : 18; try { doc.addImage(logo.data, 'PNG', L, y - 4, Math.min(lebar, 26), tinggi); } catch (e) {} }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0);
    doc.text(String(M.nama || 'MADRASAH').toUpperCase(), mid, y, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    if (M.alamat) doc.text(String(M.alamat), mid, y + 5, { align: 'center', maxWidth: W - 30 });
    var kontak = [M.telp ? 'Telp: ' + M.telp : '', M.email ? 'Email: ' + M.email : ''].filter(Boolean).join('  |  ');
    if (kontak) doc.text(kontak, mid, y + 9.5, { align: 'center', maxWidth: W - 30 });
    y += 15;
    doc.setLineWidth(0.8); doc.line(L, y, R, y); doc.setLineWidth(0.2); doc.line(L, y + 1.2, R, y + 1.2);
    y += 7;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('LAPORAN INDIKATOR KINERJA UTAMA (KPI) MADRASAH', mid, y, { align: 'center' });
    y += 5.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text('Periode: ' + t.per.label + '  |  Tahun ajaran ' + (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '-'), mid, y, { align: 'center' });
    y += 4.5; doc.setFontSize(8.5); doc.setTextColor(90);
    doc.text('Pembanding: ' + (t.pemb ? t.pemb.label : 'tidak ada') + '  |  Hari sekolah: ' + t.cur.sis.hariSekolah.length + ' hari  |  Dicetak: ' + ptgl(), mid, y, { align: 'center' });
    doc.setTextColor(0); y += 4;

    var rows = barisIndikator(t);
    var f = function (v) { return v == null ? '-' : v.toFixed(1).replace('.', ',') + '%'; };
    doc.autoTable({
      startY: y, margin: { left: L, right: L }, theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.4, lineColor: [150, 150, 150], lineWidth: 0.15, textColor: 20 },
      headStyles: { fillColor: gelap, textColor: 255, halign: 'center' },
      columnStyles: { 0: { cellWidth: 52 }, 1: { halign: 'center', cellWidth: 20 }, 2: { halign: 'center', cellWidth: 22 }, 3: { halign: 'center', cellWidth: 30 }, 4: { cellWidth: 'auto' } },
      head: [['Indikator', 'Capaian', 'Target', 'Status', 'Dibanding ' + (t.pemb ? t.pemb.label : 'periode lalu')]],
      body: rows.map(function (r) { return [r.nama, f(r.nilai), targetTeksPdf(r), r.st.t, r.pembText + (r.d != null && Math.abs(r.d) >= 0.05 ? ' dari ' + f(r.prev) : '')]; }),
      didParseCell: function (d) {
        if (d.section !== 'body') return;
        var r = rows[d.row.index]; if (!r) return;
        if (d.column.index === 1 || d.column.index === 3) { d.cell.styles.textColor = rgb(r.st.w); d.cell.styles.fontStyle = 'bold'; }
        if (d.column.index === 4 && r.d != null && Math.abs(r.d) >= 0.05) { var baik = r.mode === 'max' ? r.d < 0 : r.d > 0; d.cell.styles.textColor = rgb(baik ? '#059669' : '#dc2626'); }
      }
    });
    y = doc.lastAutoTable.finalY + 5;

    // per kelas
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Capaian per Kelas', L, y); y += 1.5;
    doc.autoTable({
      startY: y, margin: { left: L, right: L }, theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.2, lineColor: [150, 150, 150], lineWidth: 0.15, textColor: 20 },
      headStyles: { fillColor: gelap, textColor: 255, halign: 'center' },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
      head: [['Kelas', 'Hadir siswa', 'Alfa (siswa-hari)', 'Infaq lunas']],
      body: KELAS_LIST.map(function (k) {
        var s = t.cur.sis.kelas[k], i = t.cur.inf && t.cur.inf.kelas[k];
        return [k, s ? f(pct(s.H, s.H + s.S + s.I + s.A)) : '-', s ? String(s.A) : '-', i ? f(pct(i.lunas, i.pembagi)) : '-'];
      })
    });
    y = doc.lastAutoTable.finalY + 5;

    // rincian per bulan (semester / tahun ajaran)
    if (t.rincian && t.rincian.length) {
      if (y > 215) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('Rincian per Bulan', L, y); y += 1.5;
      doc.autoTable({
        startY: y, margin: { left: L, right: L }, theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.1, lineColor: [150, 150, 150], lineWidth: 0.15, textColor: 20, halign: 'center' },
        headStyles: { fillColor: gelap, textColor: 255, halign: 'center' },
        columnStyles: { 0: { halign: 'left' } },
        head: [['Bulan', 'Hadir siswa', 'Infaq', 'Jurnal', 'Jurnal hari sama', 'Hadir guru', 'Telat', 'Tanpa absen pulang']],
        body: t.rincian.map(function (r) { var m = r.m; return [r.b.label, f(m.pSiswa), f(m.pInfaq), f(m.pJur), f(m.pJurHari), f(m.pHadirGuru), f(m.pTelat), f(m.pTanpaPulang)]; })
      });
      y = doc.lastAutoTable.finalY + 5;
    }

    // perlu perhatian (nama guru hanya bila kotak 'sertakan nama guru' dicentang)
    var perhatian = [];
    var jg = Object.keys(t.cur.jur.guru).map(function (k) { var g = t.cur.jur.guru[k]; return { nama: g.nama, exp: g.exp, p: pct(g.fill, g.exp) }; })
      .filter(function (g) { return g.exp > 0 && g.p != null && g.p < KPI_TARGET.jurnal; }).sort(function (a, c) { return a.p - c.p; });
    if (jg.length) perhatian.push(t.nama ? 'Jurnal terisi paling rendah: ' + jg.slice(0, 3).map(function (g) { return g.nama + ' (' + f(g.p) + ')'; }).join('; ') + (jg.length > 3 ? '; dan ' + (jg.length - 3) + ' guru lain' : '') + '.' :
      jg.length + ' guru memiliki jurnal terisi di bawah target (terendah ' + f(jg[0].p) + ').');
    var tpl = (t.cur.gr.baris || []).filter(function (b) { return b.tanpaPulang > 0; }).sort(function (a, c) { return c.tanpaPulang - a.tanpaPulang; });
    if (tpl.length) perhatian.push(t.nama ? 'Paling sering tidak absen pulang: ' + tpl.slice(0, 3).map(function (b) { return b.nama + ' (' + b.tanpaPulang + ' hari)'; }).join('; ') + (tpl.length > 3 ? '; dan ' + (tpl.length - 3) + ' guru lain' : '') + '.' :
      tpl.length + ' guru pernah tidak absen pulang (terbanyak ' + tpl[0].tanpaPulang + ' hari).');
    var kl = KELAS_LIST.map(function (k) { var s0 = t.cur.sis.kelas[k]; return { k: k, p: s0 ? pct(s0.H, s0.H + s0.S + s0.I + s0.A) : null }; })
      .filter(function (x) { return x.p != null && x.p < KPI_TARGET.hadirSiswa; }).sort(function (a, c) { return a.p - c.p; });
    if (kl.length) perhatian.push('Kehadiran siswa di bawah target: ' + kl.slice(0, 3).map(function (x) { return x.k + ' (' + f(x.p) + ')'; }).join('; ') + (kl.length > 3 ? '; dan ' + (kl.length - 3) + ' kelas lain' : '') + '.');
    var ki = KELAS_LIST.map(function (k) { var i0 = t.cur.inf && t.cur.inf.kelas[k]; return { k: k, p: i0 ? pct(i0.lunas, i0.pembagi) : null }; })
      .filter(function (x) { return x.p != null && x.p < KPI_TARGET.infaq; }).sort(function (a, c) { return a.p - c.p; });
    if (ki.length) perhatian.push('Infaq lunas di bawah target: ' + ki.slice(0, 3).map(function (x) { return x.k + ' (' + f(x.p) + ')'; }).join('; ') + (ki.length > 3 ? '; dan ' + (ki.length - 3) + ' kelas lain' : '') + '.');
    if (y > 225) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(0); doc.text('Perlu Perhatian', L, y); y += 4.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    (perhatian.length ? perhatian : ['Tidak ada kelas atau guru yang berada di bawah target.']).forEach(function (c) { var ls = doc.splitTextToSize('- ' + c, W); doc.text(ls, L, y); y += ls.length * 4 + 0.8; });
    y += 3;

    // catatan otomatis
    var belum = rows.filter(function (r) { return r.nilai != null && r.st.t === 'Belum tercapai'; }).map(function (r) { return r.nama + ' (' + f(r.nilai) + ', target ' + targetTeksPdf(r) + ')'; });
    var capai = rows.filter(function (r) { return r.st.t === 'Tercapai'; }).length, ada = rows.filter(function (r) { return r.nilai != null; }).length;
    var memburuk = rows.filter(function (r) { return r.d != null && Math.abs(r.d) >= 0.05 && (r.mode === 'max' ? r.d > 0 : r.d < 0); }).map(function (r) { return r.nama; });
    var cat = ['Indikator tercapai: ' + capai + ' dari ' + ada + ' indikator yang punya data.'];
    cat.push(belum.length ? 'Belum mencapai target: ' + belum.join('; ') + '.' : 'Tidak ada indikator yang berstatus belum tercapai.');
    if (t.pemb && memburuk.length) cat.push('Memburuk dibanding ' + t.pemb.label + ': ' + memburuk.join(', ') + '.');
    cat.push('Catatan: hari sekolah = tanggal yang punya absensi siswa; hari ini tidak dihitung pada indikator guru dan jurnal. Tidak absen pulang = hari hadir (ada catatan Datang) tanpa catatan Pulang. Selisih dalam poin persen.');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    if (y > 235) { doc.addPage(); y = 18; }
    doc.text('Catatan', L, y); y += 4.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    cat.forEach(function (c) { var ls = doc.splitTextToSize('- ' + c, W); doc.text(ls, L, y); y += ls.length * 4 + 0.8; });

    // tanda tangan
    if (y > 245) { doc.addPage(); y = 18; }
    y += 4; var xt = 140;
    doc.setFontSize(9.5); doc.text('Mengetahui,', xt, y, { align: 'center' }); doc.text('Kepala Madrasah', xt, y + 4.5, { align: 'center' });
    var yn = y + 24;
    doc.setFont('helvetica', 'bold'); doc.text(String(M.kepala_sekolah || '.........................'), xt, yn, { align: 'center' });
    var lebarNama = doc.getTextWidth(String(M.kepala_sekolah || '.........................')); doc.setLineWidth(0.2); doc.line(xt - lebarNama / 2, yn + 0.8, xt + lebarNama / 2, yn + 0.8);
    doc.setFont('helvetica', 'normal'); if (M.nip_kepala_sekolah) doc.text('NIP. ' + M.nip_kepala_sekolah, xt, yn + 5, { align: 'center' });

    // footer tiap halaman
    var n = doc.getNumberOfPages();
    for (var i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120); doc.text('Dihasilkan otomatis oleh SI MAMBA  |  Halaman ' + i + ' dari ' + n, mid, 290, { align: 'center' }); }
    doc.save('kpi-madrasah_' + String(t.per.kode).replace(':', '-') + '.pdf');
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
        guruMuat.coba = false; guruCadangan.coba = false; arsip.coba = false; arsip.gagalTulis = null;
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

  window.KPI = { hitungSiswa: hitungSiswa, hitungInfaq: hitungInfaq, hitungJurnal: hitungJurnal, hitungGuru: hitungGuru, hitungOrtu: hitungOrtu, selisih: selisih, teksPembanding: teksPembanding, target: KPI_TARGET };
})();
