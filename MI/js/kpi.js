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
// v8.393: halaman dibagi tab Ringkasan/Per Bulan/Kelas/Jurnal/Guru; PDF mengikuti tab aktif; Tindak Lanjut punya draf otomatis.
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
    var target = {}, tanpaWaList = [];
    (siswa || []).forEach(function (s) {
      var nm = s.nama || s.name || '-', k = s.noWaKey || norm(s.noWaOrtu);
      if (k) { (target[k] = target[k] || { wa: k, noWa: s.noWaOrtu || k, anak: [] }).anak.push({ nama: nm, kelas: s.kelas || '' }); }
      else tanpaWaList.push({ nama: nm, kelas: s.kelas || '' });
    });
    var batas = sekarang - ORTU_AKTIF_HARI * 86400000, aktifSet = {};
    (logs || []).forEach(function (l) {
      if (!l || l.hasil !== 'berhasil' || !l.wa) return;
      var t = Date.parse(l.waktu); if (isNaN(t) || t < batas) return;
      aktifSet[String(l.wa)] = true;
    });
    var aktifList = [], belumList = [];
    Object.keys(target).forEach(function (k) { (aktifSet[k] ? aktifList : belumList).push(target[k]); });
    var byKelas = function (x, y) { return (x.anak ? x.anak[0].kelas : x.kelas).localeCompare(y.anak ? y.anak[0].kelas : y.kelas) || (x.anak ? x.anak[0].nama : x.nama).localeCompare(y.anak ? y.anak[0].nama : y.nama); };
    tanpaWaList.sort(byKelas); belumList.sort(byKelas); aktifList.sort(byKelas);
    var total = aktifList.length + belumList.length;
    return { total: total, aktif: aktifList.length, belum: belumList.length, tanpaWa: tanpaWaList.length, pct: pct(aktifList.length, total),
      tanpaWaList: tanpaWaList, belumList: belumList, aktifList: aktifList };
  }

  // Tiga kelompok orang tua (hanya layar Admin/Kepala; nama anak TIDAK masuk CSV/PDF).
  function htmlKelompokOrtu(r) {
    var anakTeks = function (e) { return e.anak.map(function (a) { return esc(a.nama) + ' (' + esc(a.kelas) + ')'; }).join(', '); };
    var grup = function (judul, warnaX, n, isi, buka) {
      return '<details' + (buka ? ' open' : '') + ' style="margin-top:6px;"><summary style="cursor:pointer;font-size:12px;"><b style="color:' + warnaX + ';">' + judul + ': ' + n + '</b></summary>' +
        '<div class="kpi-scroll" style="margin-top:4px;font-size:12px;line-height:1.6;max-height:260px;overflow:auto;">' + (isi || '<i>Tidak ada.</i>') + '</div></details>';
    };
    var l1 = r.tanpaWaList.map(function (e) { return '<div>' + esc(e.nama) + ' (' + esc(e.kelas) + ')</div>'; }).join('');
    var l2 = r.belumList.map(function (e, i) { return '<div>' + anakTeks(e) + ' <button type="button" class="btn btn-soft" data-owa="' + i + '" title="Ingatkan lewat WhatsApp">WA</button></div>'; }).join('');
    var l3 = r.aktifList.map(function (e) { return '<div>' + anakTeks(e) + '</div>'; }).join('');
    return '<div class="kpi-card" style="grid-column:1/-1;"><div class="kpi-nama">Orang tua menurut keaktifan (30 hari terakhir)</div>' +
      '<div class="kpi-sub">Selalu 30 hari terakhir, tidak mengikuti periode. Satu baris = satu nomor WA (saudara kandung digabung). Penyebut persen hanya nomor yang ada.</div>' +
      grup('Belum punya nomor WA wali', '#dc2626', r.tanpaWa + ' siswa', l1, false) +
      grup('Punya nomor, belum pernah masuk', '#d97706', r.belum + ' nomor', l2, r.belum > 0 && r.belum <= 15) +
      grup('Sudah aktif', '#059669', r.aktif + ' nomor', l3, false) + '</div>';
  }

  function ingatkanOrtu(ix) {
    var r = terakhir && terakhir.ortu, e = r && r.belumList && r.belumList[ix]; if (!e) return;
    var n = (typeof formatNomorWa === 'function') ? formatNomorWa(e.noWa) : String(e.noWa).replace(/\D/g, '');
    if (String(n).length < 10) { pesan('Nomor WhatsApp wali ' + e.anak[0].nama + ' tidak valid. Perbaiki di Data Siswa.', true); return; }
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : {};
    var msg = 'Assalamu\'alaikum Bapak/Ibu wali dari ' + e.anak.map(function (a) { return a.nama; }).join(' & ') + ', ini pesan dari ' + (M.nama || 'madrasah') + '.\n\nPortal Orang Tua madrasah sudah bisa dibuka untuk melihat kehadiran, nilai, dan kabar anak. Silakan masuk dengan nomor WhatsApp ini. Jika ada kendala, kabari kami.\n\nTerima kasih.';
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank');
    try { if (typeof addLog === 'function') addLog('kpi_ingatkan_wa_ortu', e.anak[0].nama); } catch (x) {}
  }

  // ---------- status warna ----------
  function status(v, target, mode) {
    if (v == null) return { w: '#6b7280', t: 'Belum ada data' };
    if (mode === 'max') return v <= target ? { w: '#059669', t: 'Tercapai' } : v <= target * 2 ? { w: '#d97706', t: 'Mendekati' } : { w: '#dc2626', t: 'Belum tercapai' };
    return v >= target ? { w: '#059669', t: 'Tercapai' } : v >= target - 10 ? { w: '#d97706', t: 'Mendekati' } : { w: '#dc2626', t: 'Belum tercapai' };
  }

  // ---------- tampilan ----------
  var CSS = '.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0 16px;}' +
    '@media (max-width:640px){.kpi-grid{grid-template-columns:repeat(2,1fr);}.kpi-grid>.kpi-card:last-child:nth-child(odd){grid-column:1/-1;}}' +
    '#kpiOrtu .kpi-card{margin-bottom:10px;}' +
    '.kpi-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px;}.kpi-tabs .btn{padding:6px 12px;font-size:13px;flex:1 1 auto;min-height:36px !important;white-space:nowrap;}' +
    '.kpi-card{border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:12px;display:flex;flex-direction:column;}' +
    '.kpi-nama{font-size:12px;opacity:.75;margin-bottom:4px;}' +
    '.kpi-val{font-size:26px;font-weight:800;line-height:1.1;}' +
    '.kpi-sub{font-size:11px;opacity:.75;margin-top:4px;line-height:1.4;}' +
    '#kpiPeriode{padding:8px 36px 8px 12px;min-height:40px;max-width:100%;}' +
    '.kpi-bd{font-size:11px;margin-top:auto;padding-top:6px;line-height:1.4;}.kpi-bd b{font-weight:800;}' +
    '.kpi-badge{display:inline-block;align-self:flex-start;font-size:11px;font-weight:700;color:#fff;border-radius:999px;padding:2px 8px;margin-top:6px;}' +
    '.kpi-h{font-size:14px;font-weight:700;margin:16px 0 6px;}' +
    '.kpi-tbl{width:100%;border-collapse:collapse;font-size:12px;}' +
    '.kpi-tbl th,.kpi-tbl td{border:1px solid rgba(128,128,128,.3);padding:6px 8px;text-align:left;}' +
    '@media (max-width:480px){.kpi-tbl{font-size:11px;}.kpi-tbl th,.kpi-tbl td{padding:5px 4px;}.kpi-tbl td:first-child{word-break:break-word;}}' + +
    '.kpi-scroll{overflow-x:auto;}.kpi-cat{font-size:11px;opacity:.7;margin:6px 0;line-height:1.5;}' +
    /* v8.395: rapikan toolbar, keterangan, dan formulir Tindak Lanjut */
    '.kpi-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 10px;}' +
    '.kpi-bar .kpi-per{flex:1 1 100%;display:flex;align-items:center;gap:8px;font-size:12px;}.kpi-bar .kpi-per select{flex:1;min-width:0;font-size:14px;min-height:40px;padding:6px 10px;border:1px solid rgba(128,128,128,.4);border-radius:10px;}' +
    '.kpi-bar .btn{flex:1 1 0;min-width:0;padding:8px 10px;font-size:13px;white-space:normal;line-height:1.25;}' +
    '.kpi-bar .kpi-chk{flex:1 1 100%;font-size:12px;display:flex;align-items:center;gap:6px;}.kpi-bar .kpi-chk input{width:18px;height:18px;margin:0;}' +
    '.kpi-info{margin:4px 0 8px;border:1px solid rgba(128,128,128,.25);border-radius:10px;padding:0 10px;}.kpi-info>summary{cursor:pointer;font-size:12px;font-weight:600;padding:8px 0;list-style:none;}.kpi-info>summary::-webkit-details-marker{display:none;}.kpi-info>summary::before{content:"ⓘ ";}.kpi-info[open]>summary{border-bottom:1px solid rgba(128,128,128,.2);margin-bottom:4px;}' +
    '.kpi-tl{margin-bottom:10px;}.kpi-tl-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:14px;line-height:1.35;}.kpi-tl-head .kpi-badge{margin-top:0;}.kpi-tl-head .kpi-tl-val{opacity:.8;font-size:12px;flex:1 1 100%;}' +
    '.kpi-tl-form{display:grid;gap:10px;margin-top:10px;}.kpi-tl-form label{display:block;font-size:12px;font-weight:600;}.kpi-tl-form .field{display:block;width:100%;box-sizing:border-box;margin-top:4px;font-size:14px;font-weight:400;line-height:1.4;}' +
    '.kpi-tl-form textarea.field{min-height:64px;resize:vertical;overflow:hidden;}' +
    '.kpi-tl-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}@media (max-width:340px){.kpi-tl-row{grid-template-columns:1fr;}}' +
    '.kpi-tl-act{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}.kpi-tl-act .btn{padding:8px 16px;font-size:13px;}' +
    '.kpi-tl-draf{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin:8px 0 12px;}.kpi-tl-draf .btn{padding:8px 14px;font-size:13px;}' +
    '.kpi-tabn{display:inline-block;min-width:18px;box-sizing:border-box;margin-left:5px;padding:0 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center;}' +
    '.card .btn.kpi-tl-mini{padding:4px 12px !important;min-height:32px !important;font-size:12px !important;margin-top:6px;}';
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

  var kpiTab = 'ringkasan';   // tab aktif halaman KPI: 'ringkasan' | 'bulan' | 'kelas' | 'jurnal' | 'guru' (bertahan saat render ulang)
  var TAB_KPI = [['ringkasan', 'Ringkasan'], ['tindak', 'Tindak Lanjut'], ['bulan', 'Per Bulan'], ['kelas', 'Kelas'], ['jurnal', 'Jurnal'], ['guru', 'Guru'], ['target', 'Target']];
  var NAMA_TAB = { ringkasan: 'Ringkasan', tindak: 'Tindak Lanjut', bulan: 'Per Bulan', kelas: 'Kelas', jurnal: 'Jurnal', guru: 'Guru', target: 'Target' };
  function tabPdf() { return (kpiTab === 'tindak' || kpiTab === 'target') ? 'ringkasan' : kpiTab; }   // tab Tindak Lanjut/Target: PDF = laporan lengkap (sudah memuat Tindak Lanjut)
  function labelPdf() { return 'Unduh PDF · ' + (NAMA_TAB[tabPdf()] || 'Ringkasan'); }
  function pane(k, isi) { return '<div id="kpiTab_' + k + '" data-kpane="' + k + '"' + (kpiTab === k ? '' : ' style="display:none;"') + '>' + isi + '</div>'; }
  function pilihTab(k) {   // pindah tab tanpa render ulang (data tidak dimuat ulang); tombol PDF ikut berubah
    if (!NAMA_TAB[k] || !el('kpiTab_' + k)) return;
    kpiTab = k;
    Array.prototype.forEach.call(document.querySelectorAll('#page-kpi [data-kpane]'), function (d) { d.style.display = d.getAttribute('data-kpane') === kpiTab ? '' : 'none'; });
    Array.prototype.forEach.call(document.querySelectorAll('#kpiTabs [data-ktab]'), function (b) { b.className = 'btn ' + (b.getAttribute('data-ktab') === kpiTab ? 'btn-primary' : 'btn-soft'); });
    var bp = el('kpiPdf'); if (bp && !bp.disabled) bp.textContent = labelPdf();
    if (k === 'tindak') autoTinggi(el('kpiTindak'));
  }
  function render() {
    var p = el('page-kpi'); if (!p) return;
    pasangCss();
    if (!bolehLihat()) { p.innerHTML = '<div class="card"><p class="text-muted">Halaman ini hanya untuk Admin dan Kepala Madrasah.</p></div>'; return; }
    var dp = daftarPeriode();
    if (!dp.bulanList.length) { p.innerHTML = '<div class="card"><p class="text-muted">Belum ada bulan berjalan pada tahun ajaran ini.</p></div>'; return; }
    var pilih = (el('kpiPeriode') && el('kpiPeriode').value) || dp.bulanList[0].kode;
    var per = dp.peta[pilih] || dp.bulanList[0];
    var adaBulan = per.jenis !== 'bulan';
    if (kpiTab === 'rincian' || (kpiTab === 'bulan' && !adaBulan) || !NAMA_TAB[kpiTab]) kpiTab = 'ringkasan';
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
      '<div class="text-muted" style="font-size:12px;margin-bottom:4px;">Dihitung otomatis dari data aplikasi.</div>' +
      '<div class="kpi-bar"><label class="kpi-per">Periode <select id="kpiPeriode">' +
      '<optgroup label="Per bulan">' + dp.bulanList.map(function (x) { return '<option value="' + x.kode + '"' + (x.kode === per.kode ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</optgroup>' +
      (dp.lain.length ? '<optgroup label="Semester dan tahun ajaran">' + dp.lain.map(function (x) { return '<option value="' + x.kode + '"' + (x.kode === per.kode ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</optgroup>' : '') +
      '</select></label>' +
      '<button type="button" class="btn btn-soft" id="kpiPdf" title="PDF mengikuti tab yang sedang dibuka. Tab Ringkasan = laporan lengkap untuk Kepala Madrasah">' + labelPdf() + '</button>' +
      '<button type="button" class="btn btn-soft" id="kpiCsv" title="CSV = Comma-Separated Values">Unduh CSV</button>' +
      '<label class="kpi-chk"><input type="checkbox" id="kpiPdfNama"> Sertakan nama guru di PDF</label></div>' +
      '<details class="kpi-info"><summary>Keterangan singkatan, hari sekolah, dan panah</summary>' +
      '<div class="kpi-cat">Singkatan: <b>KPI</b> (nama di menu) = Key Performance Indicator, yaitu Indikator Kinerja Utama; <b>CSV</b> = Comma-Separated Values (berkas tabel yang bisa dibuka di Excel); <b>PDF</b> = Portable Document Format; <b>WA</b> = WhatsApp.</div>' +
      '<div class="kpi-cat">Hari sekolah pada periode ini (ada absensi siswa): <b>' + sis.hariSekolah.length + '</b> hari. Siswa non aktif tidak dihitung.</div>' +
      '<div class="kpi-cat">' + (pemb ? 'Panah ▲▼ = selisih dalam poin persen terhadap <b>' + esc(pemb.label) + '</b>. Hijau = membaik, merah = memburuk (untuk indikator yang makin kecil makin baik, turun berarti membaik). Periode berjalan dibandingkan dengan periode pembanding yang sudah penuh.' : esc(pbr.alasan || 'Pembanding tidak tersedia untuk periode ini.')) + '</div></details>' +
      (dataSiap ? '' : '<div class="kpi-cat" style="color:#b45309;">Data belum termuat sepenuhnya. Tunggu sebentar atau muat ulang aplikasi.</div>') +
      (arsip.galat ? '<div class="kpi-cat" style="color:#b45309;">Target tersimpan dan arsip KPI belum bisa dibaca (' + esc(arsip.galat) + '). Tambahkan blok Rules kpi_v4 (lihat catatan deploy); sementara dipakai target bawaan dan tanpa pembanding lintas tahun.</div>' : '') +
      (arsip.gagalTulis ? '<div class="kpi-cat" style="color:#b45309;">Arsip bulanan gagal disimpan (' + esc(arsip.gagalTulis) + '). Periksa Rules kpi_v4 dan sesi Admin.</div>' : '') +
      '<div id="kpiTabs" class="kpi-tabs">' + TAB_KPI.filter(function (x) { return x[0] !== 'bulan' || adaBulan; }).map(function (x) { return '<button type="button" class="btn ' + (kpiTab === x[0] ? 'btn-primary' : 'btn-soft') + '" data-ktab="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div id="kpiTab_ringkasan" data-kpane="ringkasan"' + (kpiTab === 'ringkasan' ? '' : ' style="display:none;"') + '>' +
      '<div class="kpi-grid">' +
      kartu('Kehadiran siswa', cur.pSiswa, KPI_TARGET.hadirSiswa, 'min', 'Alfa: ' + sis.total.A + ' siswa-hari', pb('pSiswa')) +
      kartu('Infaq lunas', cur.pInfaq, KPI_TARGET.infaq, 'min', inf ? inf.minggu + ' minggu dihitung' + (cur.infaqBerjalan ? ' (termasuk minggu berjalan, belum selesai)' : '') : 'Data infaq belum termuat', pb('pInfaq')) +
      kartu('Jurnal terisi', cur.pJur, KPI_TARGET.jurnal, 'min', jur.total.fill + ' dari ' + jur.total.exp + ' jam terjadwal' + (jur.total.menunggu ? ' · ' + jur.total.menunggu + ' jam menunggu persetujuan (belum dihitung)' : '') + (jur.total.kecuali ? ' · ' + jur.total.kecuali + ' jam dikecualikan (guru izin/sakit)' : ''), pb('pJur')) +
      kartu('Jurnal di hari yang sama', cur.pJurHari, KPI_TARGET.jurnalHariSama, 'min', 'dari jurnal yang tercatat waktu buatnya', pb('pJurHari')) +
      kartu('Kehadiran guru', cur.pHadirGuru, KPI_TARGET.hadirGuru, 'min', ketGuru || (guruList.length + ' guru, ' + gr.hari + ' hari tanpa hari ini'), pb('pHadirGuru')) +
      kartu('Guru datang terlambat', cur.pTelat, KPI_TARGET.telatGuru, 'max', ketGuru || 'dari semua catatan Datang', pb('pTelat')) +
      kartu('Guru tidak absen pulang', cur.pTanpaPulang, KPI_TARGET.tanpaPulang, 'max', ketGuru || (gr.tanpaPulang + ' dari ' + gr.hadirTotal + ' hari hadir tanpa catatan Pulang'), pb('pTanpaPulang')) +
      '<div class="kpi-card" id="kpiOrtuKartu"><div class="kpi-nama">Orang tua aktif</div><div class="kpi-sub">Memuat...</div></div>' +
      '</div>' +
      '<div id="kpiOrtu"></div></div>' + pane('tindak', '<div id="kpiTindak"></div>');
    var hBulan = '';

    // rincian per bulan (semester / tahun ajaran)
    var rincian = null;
    if (per.jenis !== 'bulan') {
      rincian = per.bulan.map(function (b) { return { b: b, m: hitungPeriode([b], today, nonaktif, guruList) }; });
      var sel = function (v, tk, mode) { return '<td style="color:' + warna(v, KPI_TARGET[tk], mode) + ';font-weight:700;">' + f1(v) + '</td>'; };
      hBulan += '<div class="kpi-h">Rincian per Bulan</div><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Bulan</th><th>Hadir siswa</th><th>Infaq</th><th>Jurnal</th><th>Jurnal hari sama</th><th>Hadir guru</th><th>Telat</th><th>Tanpa absen pulang</th></tr>' +
        rincian.map(function (r) {
          var m = r.m;
          return '<tr><td>' + esc(r.b.label) + '</td>' + sel(m.pSiswa, 'hadirSiswa', 'min') + sel(m.pInfaq, 'infaq', 'min') + sel(m.pJur, 'jurnal', 'min') + sel(m.pJurHari, 'jurnalHariSama', 'min') +
            sel(m.pHadirGuru, 'hadirGuru', 'min') + sel(m.pTelat, 'telatGuru', 'max') + sel(m.pTanpaPulang, 'tanpaPulang', 'max') + '</tr>';
        }).join('') + '</table></div>' +
        '<div class="kpi-cat">Angka di baris Semester/Tahun ajaran (kartu di atas) dihitung dari seluruh hari dan minggu pada periode itu, bukan rata-rata angka bulanan.</div>';
    }

    // per kelas
    var hKelas = '<div class="kpi-h">Per Kelas</div><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Kelas</th><th>Hadir siswa</th><th>Alfa</th><th>Hari absensi</th><th>Infaq lunas</th></tr>' +
      KELAS_LIST.map(function (k) {
        var s = sis.kelas[k], i = inf && inf.kelas[k];
        var ps = s ? pct(s.H, s.H + s.S + s.I + s.A) : null, pi = i ? pct(i.lunas, i.pembagi) : null;
        return '<tr><td>' + esc(k) + '</td><td style="color:' + warna(ps, KPI_TARGET.hadirSiswa, 'min') + ';font-weight:700;">' + f1(ps) + '</td><td>' + (s ? s.A : '-') + '</td><td>' + (s ? Object.keys(s.hari).length : 0) + '</td><td style="color:' + warna(pi, KPI_TARGET.infaq, 'min') + ';font-weight:700;">' + f1(pi) + (i ? ' <span style="opacity:.7;font-weight:400;">(' + i.siswa + ' siswa)</span>' : '') + '</td></tr>';
      }).join('') + '</table></div>';

    // jurnal per guru (terendah dulu)
    var jg = Object.keys(jur.guru).map(function (k) { var g = jur.guru[k]; return { nama: g.nama, exp: g.exp, fill: g.fill, menunggu: g.menunggu || 0, p: pct(g.fill, g.exp) }; })
      .sort(function (a, c) { return (a.p == null ? 101 : a.p) - (c.p == null ? 101 : c.p); });
    var hJurnal = '<div class="kpi-h">Jurnal per Guru</div><details open><summary style="cursor:pointer;font-size:12px;">' + jg.length + ' guru terjadwal (terendah di atas)</summary><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Guru</th><th>Terisi</th><th>Menunggu</th><th>Terjadwal</th><th>%</th></tr>' +
      jg.map(function (g) { return '<tr><td>' + esc(g.nama) + '</td><td>' + g.fill + '</td><td>' + (g.menunggu || 0) + '</td><td>' + g.exp + '</td><td style="color:' + warna(g.p, KPI_TARGET.jurnal, 'min') + ';font-weight:700;">' + f1(g.p) + '</td></tr>'; }).join('') + '</table></div></details>' +
      '<div class="kpi-cat">Jam terjadwal dihitung untuk hari sekolah yang sudah lewat. Jurnal dianggap terisi bila ada jurnal berstatus disetujui untuk kelas, tanggal, dan jam ke yang sama. Jam saat guru tercatat Izin/Sakit dikecualikan dari hitungan. Kolom Menunggu = jurnal sudah diisi guru tetapi belum disetujui (belum dihitung terisi; akan naik begitu disetujui).</div>';

    // guru
    var gb = gr.baris.slice().sort(function (a, c) { return (pct(a.hadir, a.hari) == null ? 101 : pct(a.hadir, a.hari)) - (pct(c.hadir, c.hari) == null ? 101 : pct(c.hadir, c.hari)); });
    var hGuru = '<div class="kpi-h">Kehadiran Guru</div><div id="kpiGuruBar" class="kpi-cat"></div><details open><summary style="cursor:pointer;font-size:12px;">' + gb.length + ' guru (terendah di atas)</summary><div class="kpi-scroll"><table class="kpi-tbl"><tr><th>Guru</th><th>Hadir</th><th>Telat</th><th>Tanpa absen pulang</th><th>Izin</th><th>Sakit</th><th>Alpha</th><th>Pengingat</th></tr>' +
      gb.map(function (g, ix) { var pg = pct(g.hadir, g.hari); return '<tr><td>' + esc(g.nama) + '</td><td style="color:' + warna(pg, KPI_TARGET.hadirGuru, 'min') + ';font-weight:700;">' + g.hadir + '/' + g.hari + ' (' + f1(pg) + ')</td><td>' + g.telat + '</td><td>' + g.tanpaPulang + '</td><td>' + g.izin + '</td><td>' + g.sakit + '</td><td>' + g.alpha + '</td><td>' + (g.tanpaPulang > 0 ? '<button type="button" class="btn btn-soft" data-wa="' + ix + '" title="Kirim pengingat lewat WhatsApp">WA</button>' : '-') + '</td></tr>'; }).join('') + '</table></div></details>' +
      '<div class="kpi-cat">Kehadiran guru dihitung dari catatan Datang dibanding hari wajib hadir guru (hari sekolah yang sudah lewat; guru berjadwal hanya dihitung di hari jadwalnya; Minggu/tanggal merah tidak dihitung; hari ini belum dihitung). Tidak absen pulang = hari hadir (ada catatan Datang) tanpa catatan Pulang. Izin, sakit, dan alpha ditampilkan terpisah.</div>';
    h += (adaBulan ? pane('bulan', hBulan) : '') + pane('kelas', hKelas) + pane('jurnal', hJurnal) + pane('guru', hGuru);
    h += pane('target', htmlPengaturan(tg));
    h += '</div>';
    p.innerHTML = h;
    el('kpiPeriode').addEventListener('change', render);
    terakhir = { per: per, pemb: pemb, cur: cur, prev: prev, rincian: rincian, ortu: null, gb: gb, jg: jg };
    try { tandaiTabTindak(); } catch (eT) {}
    el('page-kpi').onclick = function (ev) {   // satu penangan klik untuk tombol WA di tabel guru
      var b = ev.target && ev.target.closest ? ev.target.closest('[data-wa]') : null;
      if (b) { ingatkanWa(+b.getAttribute('data-wa')); return; }
      var o = ev.target && ev.target.closest ? ev.target.closest('[data-owa]') : null;
      if (o) ingatkanOrtu(+o.getAttribute('data-owa'));
      var tb = ev.target && ev.target.closest ? ev.target.closest('[data-ktab]') : null;
      if (tb) pilihTab(tb.getAttribute('data-ktab'));
      if (ev.target && ev.target.closest) {
        if (ev.target.closest('[data-gnext]')) ingatkanBerikutnya();
        else if (ev.target.closest('[data-greset]')) resetIngatGuru();
      }
    };
    pasangPengaturan(tg, dp, today, nonaktif, guruList);
    el('kpiCsv').addEventListener('click', unduhCsv);
    el('kpiPdf').addEventListener('click', unduhPdf);
    renderTindak();
    segarIngatGuru();
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
    var bs = window.__ortuLog30, segar = bs && Date.now() - bs.t < 120000 && bs.daftar;
    var akunP = (segar ? Promise.resolve(hitungOrtu(bs.daftar, allSiswa, Date.now(), (typeof ortuWaKey === 'function') ? ortuWaKey : null)) : db.ref('ortu_login_log').orderByKey().startAt(kunciDariWaktu(Date.now() - (ORTU_AKTIF_HARI + 1) * 86400000)).limitToLast(20000).once('value').then(function (sn) {
      var logs = []; sn.forEach(function (c) { logs.push(c.val()); });
      window.__ortuLog30 = { t: Date.now(), daftar: logs.filter(Boolean), terpotong: logs.length >= 20000 };   // dipakai juga kartu Keaktifan di Riwayat Login (2 menit)
      return hitungOrtu(logs, allSiswa, Date.now(), (typeof ortuWaKey === 'function') ? ortuWaKey : null);
    }, function () { return null; }));
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
    var w = el('kpiOrtuKartu'), w2 = el('kpiOrtu'); if (!w || !w2 || typeof db === 'undefined') return;
    var pr = (ortuCache && Date.now() - ortuCache.t < 120000) ? Promise.resolve(ortuCache.r) : ambilOrtu().then(function (r) { ortuCache = { t: Date.now(), r: r }; return r; });
    pr.then(function (r) {
      if (el('kpiOrtuKartu') !== w) return;
      if (terakhir) terakhir.ortu = r[0];
      renderTindak();
      if (r[0]) simpanOrtuSnap(r[0]);
      // pembanding: nilai terakhir yang tersimpan di arsip untuk bulan lalu (dibandingkan dengan angka 30 hari terakhir sekarang)
      var ymL = ymSebelum(hariIniStr().slice(0, 7)), sn0 = arsipOrtu(ymL);
      var pbO = (arsip.data != null && !arsip.galat) ? { ada: true, label: 'akhir ' + labelYm(ymL), prev: sn0 ? sn0.pct : null } : null;
      var h = r[0] ? kartu('Orang tua aktif', r[0].pct, KPI_TARGET.ortuAktif, 'min', r[0].aktif + ' dari ' + r[0].total + ' nomor WA login ≤ ' + ORTU_AKTIF_HARI + ' hari' + (r[0].tanpaWa ? ' · ' + r[0].tanpaWa + ' siswa belum punya nomor WA' : ''), pbO) :
        '<div class="kpi-card"><div class="kpi-nama">Orang tua aktif</div><div class="kpi-sub">Riwayat login orang tua tidak bisa dibaca (izin akses).</div></div>';
      var tmp = document.createElement('div'); tmp.innerHTML = h; w.innerHTML = tmp.firstChild ? tmp.firstChild.innerHTML : '';   // isi kartu masuk ke sel grid yang sudah ada
      var h2 = r[0] ? htmlKelompokOrtu(r[0]) : '';
      var a = r[1];
      h2 += a ? '<div class="kpi-card"><div class="kpi-nama">Angket Keunggulan</div><div class="kpi-sub" style="font-size:12px;margin-top:0;"><b>' + (a.guru + a.kepala + a.ortu + a.siswa) + '</b> responden · Guru ' + a.guru + ' · Kepala ' + a.kepala + ' · Orang tua ' + a.ortu + ' · Siswa ' + a.siswa + '</div></div>' :
        '<div class="kpi-card"><div class="kpi-nama">Angket Keunggulan</div><div class="kpi-sub">Belum ada data atau tidak bisa dibaca.</div></div>';
      w2.innerHTML = h2;
    });
  }

  // ---------- pengaturan target (Admin) & arsip ----------
  function htmlPengaturan(tg) {
    var admin = isAdminKpi();
    var h = '<div class="kpi-h">Target KPI dan Arsip</div><div class="kpi-cat">Target yang dipakai pada periode ini: <b>' + (tg.ada ? 'disesuaikan' : 'bawaan') + '</b> (berlaku untuk ' + (tg.kode === 'umum' ? 'seluruh periode' : 'Semester ' + tg.kode.slice(1)) + ').</div>';
    if (!admin) return h + '<div class="kpi-cat">Target hanya dapat diubah oleh Admin.</div>';
    h += '<details open><summary style="cursor:pointer;font-size:12px;">⚙️ Atur target dan arsip (Admin)</summary><div style="margin-top:8px;">' +
      '<div class="kpi-cat">Kosongkan kolom untuk memakai nilai bawaan / nilai "Semua periode". Target Semester 1 atau 2 menimpa target "Semua periode".</div>' +
      '<label style="font-size:12px;display:block;margin:8px 0;font-weight:600;">Berlaku untuk<select id="kpiTScope" class="field" style="display:block;width:100%;margin-top:4px;font-size:14px;font-weight:400;"><option value="umum">Semua periode</option><option value="s1">Semester 1 (Jul-Des)</option><option value="s2">Semester 2 (Jan-Jun)</option></select></label>' +
      '<div class="kpi-grid">' + LABEL_TARGET.map(function (x) { return '<label style="font-size:12px;display:block;font-weight:600;">' + esc(x[1]) + '<input type="number" min="0" max="100" step="0.5" inputmode="decimal" id="kpiT_' + x[0] + '" class="field" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;font-size:14px;font-weight:400;"></label>'; }).join('') + '</div>' +
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

  // ---------- Catatan tindak lanjut (indikator belum tercapai) ----------
  // Disimpan di kpi_v4/tindak/{kodePeriode}/{kunciIndikator} = { penyebab, tindakan, pj, batas:'YYYY-MM-DD', status:'rencana|jalan|selesai', ts, oleh }.
  // Hanya Admin yang menulis (Rules kpi_v4 yang sama, tanpa Rules baru); Kepala Madrasah membaca. Draf yang sedang diketik dijaga di tDraft
  // supaya render ulang halaman (data baru masuk) tidak menghapus isian.
  var STATUS_TL = { rencana: 'Direncanakan', jalan: 'Sedang dijalankan', selesai: 'Selesai' };
  var tDraft = {};
  function tindakPeriode(kode) { var d = arsip.data; return (d && d.tindak && d.tindak[kode]) || {}; }
  function tglId(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? (+p[2]) + ' ' + NAMA_BULAN[+p[1] - 1] + ' ' + p[0] : ''; }
  var PJ_TL = { pSiswa: 'Wali kelas', pInfaq: 'Wali kelas' };   // peran (bukan nama orang, karena ikut tercetak di PDF); selain ini = Admin. Bisa diubah di formulir.
  // Jumlah indikator merah yang belum punya catatan tersimpan (penanda di tab Tindak Lanjut).
  function jumlahPerluTindak() {
    if (!terakhir || arsip.galat || arsip.data == null) return 0;
    var notes = tindakPeriode(terakhir.per.kode);
    var hari = hariIniStr();
    return barisTindak(terakhir).filter(function (b) {
      var n = notes[b.key];
      if (n) return n.status !== 'selesai' && n.batas && n.batas < hari;   // catatan lewat batas waktu
      return b.v != null && status(b.v, b.target, b.mode).t === 'Belum tercapai';   // belum ada catatan
    }).length;
  }
  function autoTinggi(root) {   // kotak teks menyesuaikan isi (hanya bila sedang tampil; tersembunyi = tinggi 0)
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('textarea.field'), function (t) { t.style.height = 'auto'; if (t.scrollHeight > 10) t.style.height = (t.scrollHeight + 2) + 'px'; });
  }
  function tandaiTabTindak() {
    var b = document.querySelector('#kpiTabs [data-ktab="tindak"]'); if (!b) return;
    var n = jumlahPerluTindak(); b.innerHTML = 'Tindak Lanjut' + (n ? '<span class="kpi-tabn" title="' + n + ' indikator perlu ditindaklanjuti (belum ada catatan atau lewat batas waktu)">' + n + '</span>' : '');
  }
  function barisTindak(t) {
    var out = ENTRI_INDIKATOR.map(function (e) { return { key: e.k, nama: e.nama, v: t.cur[e.k], target: KPI_TARGET[e.target], mode: e.mode }; });
    if (t.ortu) out.push({ key: 'ortu', nama: 'Orang tua aktif (30 hari terakhir)', v: t.ortu.pct, target: KPI_TARGET.ortuAktif, mode: 'min' });
    return out;
  }
  function bacaBaris(rowEl) {
    var g = function (c) { var x = rowEl.querySelector('.' + c); return x ? String(x.value || '').trim() : ''; };
    return { penyebab: g('tPenyebab').slice(0, 300), tindakan: g('tTindakan').slice(0, 300), pj: g('tPj').slice(0, 80), batas: g('tBatas'), status: STATUS_TL[g('tStatus')] ? g('tStatus') : 'rencana' };
  }
  // ---- Otomatisasi tindak lanjut (hanya menyiapkan DRAF di layar; tidak menyimpan apa pun sampai Admin menekan Simpan) ----
  function tambahHari(iso, n) { var p = String(iso).split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  function kelasRendah(t, jenis) {
    return KELAS_LIST.map(function (k) {
      var s0 = t.cur.sis.kelas[k], i0 = t.cur.inf && t.cur.inf.kelas[k];
      return { k: k, p: jenis === 'infaq' ? (i0 ? pct(i0.lunas, i0.pembagi) : null) : (s0 ? pct(s0.H, s0.H + s0.S + s0.I + s0.A) : null) };
    }).filter(function (x) { return x.p != null && x.p < KPI_TARGET[jenis === 'infaq' ? 'infaq' : 'hadirSiswa']; }).sort(function (a, c) { return a.p - c.p; });
  }
  // Penyebab = fakta dari data (tanpa nama guru, karena teks ini ikut tercetak di PDF); tindakan = langkah baku yang bisa diubah Admin.
  function saranTindak(key) {
    var t = terakhir, c = t.cur, bar = (c.gr && c.gr.baris) || [];
    var daftar = function (arr) { return arr.slice(0, 3).map(function (x) { return x.k + ' (' + f1(x.p) + ')'; }).join(', ') + (arr.length > 3 ? ', dan ' + (arr.length - 3) + ' kelas lain' : ''); };
    var kl, jr, n1, n2, n3;
    switch (key) {
      case 'pSiswa': kl = kelasRendah(t, 'hadir');
        return { penyebab: (kl.length ? 'Kelas di bawah target: ' + daftar(kl) + '. ' : '') + 'Alfa ' + c.sis.total.A + ' siswa-hari.', tindakan: 'Wali kelas menghubungi wali siswa yang alfa atau sering tidak hadir, mencatat alasannya, dan melapor ke Admin tiap pekan.' };
      case 'pInfaq': kl = kelasRendah(t, 'infaq');
        return { penyebab: kl.length ? 'Infaq lunas di bawah target pada kelas: ' + daftar(kl) + '.' : 'Infaq lunas di bawah target secara keseluruhan.', tindakan: 'Wali kelas mengirim pengingat infaq ke wali siswa yang belum lunas; rekap diperiksa setiap akhir pekan.' };
      case 'pJur': jr = (t.jg || []).filter(function (g) { return g.exp > 0 && g.p != null && g.p < KPI_TARGET.jurnal; }); n1 = (c.jur.total && c.jur.total.menunggu) || 0;
        return { penyebab: (jr.length ? jr.length + ' guru memiliki jurnal terisi di bawah target (terendah ' + f1(jr[0].p) + '). ' : '') + (n1 ? n1 + ' jam jurnal masih menunggu persetujuan (belum dihitung).' : ''), tindakan: 'Ingatkan guru mengisi jurnal setiap selesai mengajar; jurnal yang menunggu disetujui tiap hari.' };
      case 'pJurHari':
        return { penyebab: 'Sebagian jurnal diisi setelah hari pelaksanaan (capaian ' + f1(c.pJurHari) + ', target ' + KPI_TARGET.jurnalHariSama + '%).', tindakan: 'Ingatkan guru mengisi jurnal pada hari yang sama, paling lambat sebelum pulang.' };
      case 'pHadirGuru': n1 = 0; n2 = 0; n3 = 0; bar.forEach(function (b) { n1 += b.izin || 0; n2 += b.sakit || 0; n3 += b.alpha || 0; });
        return { penyebab: 'Dari hari wajib hadir tercatat izin ' + n1 + ', sakit ' + n2 + ', alpha ' + n3 + ' hari (jumlah seluruh guru).', tindakan: 'Admin memeriksa catatan alpha dan izin, mengoreksi absensi yang keliru, lalu menindaklanjuti guru dengan kehadiran terendah.' };
      case 'pTelat': n1 = bar.filter(function (b) { return b.telat > 0; }).length;
        return { penyebab: n1 + ' dari ' + bar.length + ' guru tercatat datang terlambat pada periode ini.', tindakan: 'Sampaikan pengingat jam datang; Kepala Madrasah membahas penyebab keterlambatan dengan guru terkait.' };
      case 'pTanpaPulang': n1 = bar.filter(function (b) { return b.tanpaPulang > 0; }).length;
        return { penyebab: n1 + ' guru tidak absen pulang, total ' + (c.gr.tanpaPulang || 0) + ' hari.', tindakan: 'Kirim pengingat lewat tombol WA di tab Guru; ingatkan menekan absen Pulang setiap selesai mengajar.' };
      case 'ortu': if (!t.ortu) return null;
        return { penyebab: t.ortu.tanpaWa + ' siswa belum punya nomor WA wali dan ' + t.ortu.belum + ' nomor belum login dalam 30 hari.', tindakan: 'Lengkapi nomor WA di Data Siswa, lalu kirim pengingat portal lewat tombol WA pada kartu Orang tua aktif.' };
    }
    return null;
  }
  function barisTampilTindak() {
    var t = terakhir, notes = tindakPeriode(t.per.kode);
    return barisTindak(t).filter(function (b) { return notes[b.key] || (b.v != null && status(b.v, b.target, b.mode).t === 'Belum tercapai'); });
  }

  function renderTindak() {
    var w = el('kpiTindak'); if (!w || !terakhir) return;
    try { tandaiTabTindak(); } catch (eT) {}
    if (arsip.galat || arsip.data == null) { w.innerHTML = ''; return; }
    var per = terakhir.per, admin = isAdminKpi(), notes = tindakPeriode(per.kode);
    var prevKode = per.jenis === 'bulan' ? 'b:' + ymSebelum(per.bulan[0].ym) : null, prevNotes = prevKode ? tindakPeriode(prevKode) : {};
    var baris = barisTindak(terakhir).filter(function (b) { return notes[b.key] || (b.v != null && status(b.v, b.target, b.mode).t === 'Belum tercapai'); });
    if (!baris.length) { w.innerHTML = '<div class="kpi-h">Tindak Lanjut</div><div class="kpi-cat">Tidak ada indikator yang berstatus belum tercapai pada periode ini.</div>'; return; }
    if (admin) baris.forEach(function (b) {   // isi otomatis (hanya di layar; BELUM tersimpan sebelum Admin menekan Simpan)
      var kk = per.kode + '|' + b.key; if (notes[b.key] || tDraft[kk]) return;
      var sg = saranTindak(b.key); if (!sg) return;
      var pv0 = prevNotes[b.key], lanjut0 = pv0 && pv0.status !== 'selesai' && (pv0.tindakan || pv0.penyebab);
      tDraft[kk] = { penyebab: sg.penyebab.slice(0, 300), tindakan: ((lanjut0 && pv0.tindakan) || sg.tindakan).slice(0, 300), pj: ((lanjut0 && pv0.pj) || PJ_TL[b.key] || 'Admin').slice(0, 80), batas: tambahHari(hariIniStr(), 14), status: lanjut0 ? 'jalan' : 'rencana' };
    });
    var nBelum = baris.filter(function (b) { return !notes[b.key]; }).length;
    var h = '<div class="kpi-h">Tindak Lanjut Indikator Belum Tercapai</div><div class="kpi-cat">Catat penyebab, tindakan, penanggung jawab, dan batas waktu. ' +
      (admin ? 'Isian tersimpan per periode dan ikut tercetak di bagian "Tindak Lanjut" PDF.' : 'Hanya Admin yang dapat mengisi; Kepala Madrasah dapat membaca.') + '</div>' +
      (admin && nBelum ? '<div class="kpi-tl-draf"><span class="kpi-sub">✨ Terisi otomatis dari data (penyebab tanpa nama guru, tindakan baku, penanggung jawab berupa peran, batas 14 hari; catatan bulan lalu yang belum selesai diteruskan). Belum tersimpan: periksa dan ubah bila perlu.</span>' +
        '<div class="kpi-tl-act"><button type="button" class="btn btn-primary" data-tsemua="1">Simpan semua draf (' + nBelum + ')</button><button type="button" class="btn btn-soft" data-tdraf="1">Isi ulang yang kosong</button></div></div>' : '');
    baris.forEach(function (b) {
      var st = status(b.v, b.target, b.mode), n = notes[b.key] || {}, d = tDraft[per.kode + '|' + b.key] || n, pv = prevNotes[b.key];
      var telat = n.batas && n.status !== 'selesai' && n.batas < hariIniStr(), sudahOk = notes[b.key] && st.t === 'Tercapai' && n.status !== 'selesai';
      var lanjut = admin && !notes[b.key] && !tDraft[per.kode + '|' + b.key] && pv && pv.status !== 'selesai' && (pv.tindakan || pv.penyebab);
      var ekstra = (sudahOk ? '<div class="kpi-sub" style="color:#059669;">Indikator ini sudah tercapai. ' + (admin ? '<button type="button" class="btn btn-soft kpi-tl-mini" data-tselesai="' + esc(b.key) + '">Tandai selesai</button>' : '') + '</div>' : '') +
        (lanjut ? '<div><button type="button" class="btn btn-soft kpi-tl-mini" data-tlanjut="' + esc(b.key) + '">Lanjutkan dari periode sebelumnya</button></div>' : '');
      var pvTeks = pv && (pv.tindakan || pv.penyebab) ? '<div class="kpi-sub">Periode sebelumnya: ' + esc(pv.tindakan || pv.penyebab) + ' (' + esc(STATUS_TL[pv.status] || '-') + ')</div>' : '';
      h += '<div class="kpi-card kpi-tl" data-row="' + esc(b.key) + '"><div class="kpi-tl-head"><b>' + esc(b.nama) + '</b>' +
        '<span class="kpi-badge" style="background:' + st.w + ';">' + st.t + '</span>' + (telat ? '<span class="kpi-badge" style="background:#dc2626;">Lewat batas waktu</span>' : '') + (admin && !notes[b.key] ? '<span class="kpi-badge" style="background:#6b7280;">Draf belum disimpan</span>' : '') +
        '<span class="kpi-tl-val">Capaian <b>' + f1(b.v) + '</b> · target ' + (b.mode === 'max' ? 'maks. ' : 'min. ') + b.target + '%</span></div>' + pvTeks + ekstra;
      if (admin) {
        h += '<div class="kpi-tl-form">' +
          '<label>Penyebab<textarea class="field tPenyebab" rows="2" maxlength="300">' + esc(d.penyebab || '') + '</textarea></label>' +
          '<label>Tindakan<textarea class="field tTindakan" rows="2" maxlength="300">' + esc(d.tindakan || '') + '</textarea></label>' +
          '<div class="kpi-tl-row">' +
          '<label>Penanggung jawab<input class="field tPj" maxlength="80" value="' + esc(d.pj || '') + '"></label>' +
          '<label>Batas waktu<input type="date" class="field tBatas" value="' + esc(d.batas || '') + '"></label>' +
          '</div><label>Status<select class="field tStatus">' + Object.keys(STATUS_TL).map(function (s) { return '<option value="' + s + '"' + ((d.status || 'rencana') === s ? ' selected' : '') + '>' + STATUS_TL[s] + '</option>'; }).join('') + '</select></label>' +
          '<div class="kpi-tl-act"><button type="button" class="btn btn-primary" data-tsimpan="' + esc(b.key) + '">Simpan</button>' +
          (notes[b.key] ? '<button type="button" class="btn btn-soft" data-thapus="' + esc(b.key) + '">Hapus catatan</button><span class="kpi-sub" style="margin:0;">Tersimpan ' + esc(tglId(String(n.ts || '').slice(0, 10))) + '</span>' : '') + '</div></div>';
      } else if (notes[b.key]) {
        h += '<div class="kpi-sub" style="margin-top:6px;">Penyebab: ' + esc(n.penyebab || '-') + '<br>Tindakan: ' + esc(n.tindakan || '-') + '<br>Penanggung jawab: ' + esc(n.pj || '-') + ' · Batas: ' + esc(tglId(n.batas) || '-') + ' · ' + esc(STATUS_TL[n.status] || '-') + '</div>';
      } else h += '<div class="kpi-sub" style="margin-top:6px;">Belum ada catatan tindak lanjut.</div>';
      h += '</div>';
    });
    w.innerHTML = h; autoTinggi(w);
    var kode = per.kode;
    var simpanDraf = function (ev) { var r = ev.target && ev.target.closest ? ev.target.closest('[data-row]') : null; if (r) tDraft[kode + '|' + r.getAttribute('data-row')] = bacaBaris(r); };
    if (w.__tl) return;   // renderTindak dipanggil beberapa kali pada elemen yang sama: pasang penangan sekali saja (cegah simpan ganda)
    w.__tl = true;
    w.addEventListener('input', simpanDraf); w.addEventListener('change', simpanDraf);
    w.addEventListener('input', function (ev) { if (ev.target && ev.target.tagName === 'TEXTAREA') autoTinggi(ev.target.parentNode); });
    w.addEventListener('click', function (ev) {
      var cl = function (a) { return ev.target && ev.target.closest ? ev.target.closest('[' + a + ']') : null; };
      var ba = cl('data-tsemua');
      if (ba) {   // simpan semua draf yang belum tersimpan, berurutan
        if (!isAdminKpi()) return pesan('Hanya Admin yang dapat mengubah catatan.', true);
        var nt0 = tindakPeriode(kode), todo = [];
        Array.prototype.forEach.call(w.querySelectorAll('[data-row]'), function (r) { var k = r.getAttribute('data-row'); if (nt0[k]) return; var dd = bacaBaris(r); if (dd.penyebab || dd.tindakan) todo.push({ k: k, d: dd }); });
        if (!todo.length) return pesan('Tidak ada draf yang bisa disimpan.', true);
        ba.disabled = true;
        var ok = 0, gagal = '', ts = new Date().toISOString(), oleh = '';
        try { oleh = String((currentUser && (currentUser.name || currentUser.username)) || '').slice(0, 60); } catch (e5) {}
        var lanjutSimpan = function (i) {
          if (i >= todo.length || gagal) {
            pesan(gagal ? ok + ' catatan tersimpan, lalu gagal: ' + gagal + '. Periksa Rules kpi_v4.' : ok + ' catatan tersimpan.', !!gagal);
            try { if (ok && typeof addLog === 'function') addLog('kpi_tindak_lanjut', 'simpan semua (' + ok + ') ' + kode); } catch (e6) {}
            renderTindak(); return;
          }
          var x = todo[i]; x.d.ts = ts; x.d.oleh = oleh;
          tulisKpi('kpi_v4/tindak/' + kode + '/' + x.k, x.d, function (err) {
            if (err) gagal = (err && err.message) || String(err); else { ok++; delete tDraft[kode + '|' + x.k]; }
            lanjutSimpan(i + 1);
          });
        };
        lanjutSimpan(0); return;
      }
      var bd = cl('data-tdraf'), bl = cl('data-tlanjut'), bt = cl('data-tselesai');
      if (bd || bl || bt) {
        if (!isAdminKpi()) return pesan('Hanya Admin yang dapat mengubah catatan.', true);
        var nts = tindakPeriode(kode);
        if (bd) {   // isi draf otomatis: hanya indikator yang belum punya catatan dan belum diketik
          var jml = 0;
          barisTampilTindak().forEach(function (b) {
            if (nts[b.key]) return;
            var kk = kode + '|' + b.key, dd = tDraft[kk] || {}; if (dd.penyebab || dd.tindakan) return;
            var sg = saranTindak(b.key); if (!sg) return;
            tDraft[kk] = { penyebab: sg.penyebab.slice(0, 300), tindakan: sg.tindakan.slice(0, 300), pj: dd.pj || '', batas: dd.batas || tambahHari(hariIniStr(), 14), status: 'rencana' }; jml++;
          });
          pesan(jml ? jml + ' draf diisi. Periksa lalu tekan Simpan di tiap indikator.' : 'Tidak ada kolom kosong yang perlu diisi.'); renderTindak();
        } else if (bl) {   // lanjutkan catatan bulan lalu yang belum selesai
          var k1 = bl.getAttribute('data-tlanjut'), pk = terakhir.per.jenis === 'bulan' ? 'b:' + ymSebelum(terakhir.per.bulan[0].ym) : null, pv0 = pk && tindakPeriode(pk)[k1];
          if (!pv0) return;
          tDraft[kode + '|' + k1] = { penyebab: pv0.penyebab || '', tindakan: pv0.tindakan || '', pj: pv0.pj || '', batas: '', status: 'jalan' }; renderTindak();
        } else {   // indikator sudah tercapai: tandai catatan selesai
          var k2 = bt.getAttribute('data-tselesai'), c0 = nts[k2]; if (!c0) return;
          var d2 = { penyebab: c0.penyebab || '', tindakan: c0.tindakan || '', pj: c0.pj || '', batas: c0.batas || '', status: 'selesai', ts: new Date().toISOString() };
          try { d2.oleh = String((currentUser && (currentUser.name || currentUser.username)) || '').slice(0, 60); } catch (e3) { d2.oleh = ''; }
          tulisKpi('kpi_v4/tindak/' + kode + '/' + k2, d2, function (err) {
            if (err) return pesan('Gagal menandai selesai: ' + ((err && err.message) || err), true);
            pesan('Catatan ditandai selesai.'); renderTindak();
            try { if (typeof addLog === 'function') addLog('kpi_tindak_lanjut', k2 + ' ' + kode + ' selesai'); } catch (e4) {}
          });
        }
        return;
      }
      var bs = cl('data-tsimpan'), bh = cl('data-thapus');
      if (!bs && !bh) return;
      if (!isAdminKpi()) return pesan('Hanya Admin yang dapat mengubah catatan.', true);
      var key = (bs || bh).getAttribute(bs ? 'data-tsimpan' : 'data-thapus'), path = 'kpi_v4/tindak/' + kode + '/' + key, rowEl = (bs || bh).closest('[data-row]');
      if (bh) {
        if (!confirm('Hapus catatan tindak lanjut ini?')) return;
        tulisKpi(path, null, function (err) { if (err) return pesan('Gagal menghapus: ' + ((err && err.message) || err), true); delete tDraft[kode + '|' + key]; pesan('Catatan dihapus.'); renderTindak(); });
        return;
      }
      var d = bacaBaris(rowEl);
      if (!d.penyebab && !d.tindakan) return pesan('Isi minimal penyebab atau tindakan.', true);
      d.ts = new Date().toISOString(); try { d.oleh = String((currentUser && (currentUser.name || currentUser.username)) || '').slice(0, 60); } catch (e) { d.oleh = ''; }
      tulisKpi(path, d, function (err) {
        if (err) return pesan('Gagal menyimpan: ' + ((err && err.message) || err) + '. Periksa Rules kpi_v4.', true);
        delete tDraft[kode + '|' + key]; pesan('Catatan tersimpan.'); renderTindak();
        try { if (typeof addLog === 'function') addLog('kpi_tindak_lanjut', key + ' ' + kode); } catch (e2) {}
      });
    });
  }

  // ---------- pengingat WhatsApp ke guru (buka wa.me; pesan terkirim dari WhatsApp Admin/Kepala sendiri) ----------
  // Tanda "sudah diingatkan" per periode dan per guru, disimpan di perangkat ini saja (localStorage); WhatsApp tidak terkirim otomatis.
  function kunciIngat(g) { return 'kpiIngatGuru:' + terakhir.per.kode + ':' + (g.key || g.nama); }
  function sudahIngat(g) { try { return !!localStorage.getItem(kunciIngat(g)); } catch (e) { return false; } }
  function tandaiIngat(g) { try { localStorage.setItem(kunciIngat(g), String(Date.now())); } catch (e) {} }
  function nomorGuru(g) { if (!g.noWa) return ''; var n = (typeof formatNomorWa === 'function') ? formatNomorWa(g.noWa) : String(g.noWa).replace(/\D/g, ''); return String(n).length >= 10 ? n : ''; }
  function segarIngatGuru() {
    var t = terakhir; if (!t || !t.gb) return;
    Array.prototype.forEach.call(document.querySelectorAll('#kpiTab_guru [data-wa]'), function (b) {
      var g = t.gb[+b.getAttribute('data-wa')]; if (g) b.textContent = sudahIngat(g) ? 'WA ✓' : 'WA';
    });
    var bar = el('kpiGuruBar'); if (!bar) return;
    var perlu = t.gb.filter(function (g) { return g.tanpaPulang > 0; });
    if (!perlu.length) { bar.innerHTML = 'Tidak ada guru yang perlu diingatkan pada periode ini.'; return; }
    var kirim = perlu.filter(function (g) { return nomorGuru(g); }), sisa = kirim.filter(function (g) { return !sudahIngat(g); }), tanpaNo = perlu.length - kirim.length;
    bar.innerHTML = '<button type="button" class="btn btn-primary" data-gnext="1" style="padding:6px 12px;font-size:12px;"' + (sisa.length ? '' : ' disabled') + '>▶ Ingatkan berikutnya (' + sisa.length + ' belum)</button> ' +
      '<button type="button" class="btn btn-soft" data-greset="1" style="padding:6px 12px;font-size:12px;">Hapus tanda diingatkan</button><br>' +
      'Membuka satu WhatsApp per ketukan untuk guru yang pernah tidak absen pulang; tekan Kirim di WhatsApp lalu kembali ke sini. Tanda ✓ = sudah dibuka pada periode ini (tersimpan di perangkat ini).' +
      (tanpaNo ? ' ' + tanpaNo + ' guru dilewati karena nomor WhatsApp belum diisi atau tidak valid (isi lewat Edit Guru).' : '');
  }
  function ingatkanBerikutnya() {
    var t = terakhir; if (!t || !t.gb) return;
    for (var i = 0; i < t.gb.length; i++) {
      var g = t.gb[i];
      if (g.tanpaPulang > 0 && nomorGuru(g) && !sudahIngat(g)) { ingatkanWa(i); return; }
    }
    pesan('Semua guru yang bisa dihubungi sudah diingatkan pada periode ini.');
  }
  function resetIngatGuru() {
    var t = terakhir; if (!t || !t.gb) return;
    if (typeof confirm === 'function' && !confirm('Hapus semua tanda "sudah diingatkan" untuk periode ini?')) return;
    t.gb.forEach(function (g) { try { localStorage.removeItem(kunciIngat(g)); } catch (e) {} });
    segarIngatGuru();
  }
  function ingatkanWa(ix) {
    var t = terakhir, g = t && t.gb && t.gb[ix]; if (!g) return;
    if (!g.noWa) { pesan('Nomor WhatsApp ' + g.nama + ' belum diisi. Isi lewat Edit Guru.', true); return; }
    var n = (typeof formatNomorWa === 'function') ? formatNomorWa(g.noWa) : String(g.noWa).replace(/\D/g, '');
    if (String(n).length < 10) { pesan('Nomor WhatsApp ' + g.nama + ' tidak valid.', true); return; }
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : {};
    var msg = 'Assalamu\'alaikum Bapak/Ibu ' + g.nama + ', ini pengingat dari ' + (M.nama || 'madrasah') + '.\n\nPada periode ' + t.per.label + ', tercatat ' + g.tanpaPulang + ' hari Anda sudah absen Datang tetapi belum absen Pulang. ' +
      'Mohon tekan absen Pulang setiap selesai mengajar. Jika catatan ini keliru (mis. lupa menekan karena gangguan sinyal), mohon konfirmasi ke Admin agar dikoreksi.\n\nTerima kasih.';
    window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(msg), '_blank');
    tandaiIngat(g); segarIngatGuru();
    try { if (typeof addLog === 'function') addLog('kpi_ingatkan_wa_pulang', g.nama); } catch (e) {}
  }

  // Baris indikator untuk CSV & PDF (teks polos).
  function barisIndikator(t) {
    var out = ENTRI_INDIKATOR.map(function (e) {
      var v = t.cur[e.k], pv = t.prev ? t.prev[e.k] : null, d = t.prev ? selisih(v, pv) : null;
      return { key: e.k, nama: e.nama, nilai: v, target: KPI_TARGET[e.target], mode: e.mode, st: status(v, KPI_TARGET[e.target], e.mode), prev: pv, d: d,
        pembText: t.pemb ? teksPembanding(d, e.mode) : 'Tidak ada' };
    });
    if (t.ortu) out.push({ key: 'ortu', nama: 'Orang tua aktif (30 hari terakhir)', nilai: t.ortu.pct, target: KPI_TARGET.ortuAktif, mode: 'min', st: status(t.ortu.pct, KPI_TARGET.ortuAktif, 'min'), prev: null, d: null, pembText: 'Tidak ada' });
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
    t.tab = tabPdf();   // PDF mengikuti tab yang sedang dibuka
    t.nama = !!(el('kpiPdfNama') && el('kpiPdfNama').checked);   // nama guru di bagian Perlu Perhatian: default tidak dicetak
    function selesai() { if (btn) { btn.disabled = false; btn.textContent = labelPdf(); } }
    if (btn) { btn.disabled = true; btn.textContent = 'Menyiapkan PDF...'; }
    var lib = (typeof ensureLib === 'function') ? ensureLib('pdf') : Promise.reject(new Error('ensureLib tidak ditemukan'));
    Promise.all([lib, muatLogo()]).then(function (r) { buatPdf(t, r[1]); selesai(); })
      .catch(function (e) { selesai(); pesan('PDF gagal dibuat: ' + (e && e.message ? e.message : e) + '. Periksa koneksi internet lalu coba lagi.', true); try { console.error('[kpi pdf]', e); } catch (e2) {} });
  }

  // Isi PDF untuk tab selain Ringkasan: satu bagian saja (tabel + catatan singkat). Nama guru hanya dicetak bila kotak 'sertakan nama guru' dicentang.
  function pdfTab(doc, t, tab, y, L, W, gelap, f) {
    var gaya = { fontSize: 8.5, cellPadding: 1.3, lineColor: [150, 150, 150], lineWidth: 0.15, textColor: 20 }, kepala = { fillColor: gelap, textColor: 255, halign: 'center' };
    function judul(tx) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(0); doc.text(tx, L, y); y += 1.5; }
    function warnaKolom(d, kolom, v, tk, mode) { if (d.section === 'body' && d.column.index === kolom && v != null) { d.cell.styles.textColor = rgb(warna(v, KPI_TARGET[tk], mode)); d.cell.styles.fontStyle = 'bold'; } }
    function catat(arr) {
      y = doc.lastAutoTable.finalY + 4; doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
      arr.forEach(function (c) { var ls = doc.splitTextToSize(c, W); doc.text(ls, L, y); y += ls.length * 3.6 + 0.8; });
      doc.setTextColor(0); y += 3;
    }
    var catNama = t.nama ? [] : ['Nama guru tidak dicetak. Centang "sertakan nama guru di PDF" bila nama perlu dicantumkan.'];
    if (tab === 'bulan' && t.rincian && t.rincian.length) {
      judul('Rincian per Bulan');
      doc.autoTable({ startY: y, margin: { left: L, right: L }, theme: 'grid', styles: Object.assign({}, gaya, { halign: 'center', fontSize: 8 }), headStyles: kepala, columnStyles: { 0: { halign: 'left' } },
        head: [['Bulan', 'Hadir siswa', 'Infaq', 'Jurnal', 'Jurnal hari sama', 'Hadir guru', 'Telat', 'Tanpa absen pulang']],
        body: t.rincian.map(function (r) { var m = r.m; return [r.b.label, f(m.pSiswa), f(m.pInfaq), f(m.pJur), f(m.pJurHari), f(m.pHadirGuru), f(m.pTelat), f(m.pTanpaPulang)]; }),
        didParseCell: function (d) {
          var m = t.rincian[d.row.index] && t.rincian[d.row.index].m; if (!m) return;
          var peta = { 1: ['pSiswa', 'hadirSiswa', 'min'], 2: ['pInfaq', 'infaq', 'min'], 3: ['pJur', 'jurnal', 'min'], 4: ['pJurHari', 'jurnalHariSama', 'min'], 5: ['pHadirGuru', 'hadirGuru', 'min'], 6: ['pTelat', 'telatGuru', 'max'], 7: ['pTanpaPulang', 'tanpaPulang', 'max'] }[d.column.index];
          if (peta) warnaKolom(d, d.column.index, m[peta[0]], peta[1], peta[2]);
        } });
      catat(['Merah = belum tercapai terhadap target. Angka semester/tahun ajaran di tab Ringkasan dihitung dari seluruh hari dan minggu, bukan rata-rata angka bulanan.']);
    } else if (tab === 'kelas') {
      var rk = KELAS_LIST.map(function (k) { var s0 = t.cur.sis.kelas[k], i0 = t.cur.inf && t.cur.inf.kelas[k]; return { k: k, ps: s0 ? pct(s0.H, s0.H + s0.S + s0.I + s0.A) : null, a: s0 ? s0.A : null, hr: s0 ? Object.keys(s0.hari).length : 0, pi: i0 ? pct(i0.lunas, i0.pembagi) : null, n: i0 ? i0.siswa : null }; });
      judul('Capaian per Kelas');
      doc.autoTable({ startY: y, margin: { left: L, right: L }, theme: 'grid', styles: Object.assign({}, gaya, { halign: 'center' }), headStyles: kepala, columnStyles: { 0: { halign: 'left' } },
        head: [['Kelas', 'Hadir siswa', 'Alfa (siswa-hari)', 'Hari absensi', 'Infaq lunas', 'Siswa wajib infaq']],
        body: rk.map(function (r) { return [r.k, f(r.ps), r.a == null ? '-' : String(r.a), String(r.hr), f(r.pi), r.n == null ? '-' : String(r.n)]; }),
        didParseCell: function (d) { var r = rk[d.row.index]; if (!r) return; warnaKolom(d, 1, r.ps, 'hadirSiswa', 'min'); warnaKolom(d, 4, r.pi, 'infaq', 'min'); } });
      catat(['Target: kehadiran siswa minimal ' + KPI_TARGET.hadirSiswa + '%, infaq lunas minimal ' + KPI_TARGET.infaq + '%. Merah = belum tercapai. Siswa non aktif tidak dihitung.']);
    } else if (tab === 'jurnal') {
      var jg = t.jg || [];
      judul('Jurnal Terisi per Guru (terendah di atas)');
      if (!jg.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('Belum ada data jurnal pada periode ini.', L, y + 4); y += 10; }
      else {
        doc.autoTable({ startY: y, margin: { left: L, right: L }, theme: 'grid', styles: Object.assign({}, gaya, { halign: 'center' }), headStyles: kepala, columnStyles: { 0: { cellWidth: 12 }, 1: { halign: 'left' } },
          head: [['No', 'Guru', 'Terisi', 'Menunggu', 'Terjadwal', 'Persen']],
          body: jg.map(function (g, i) { return [String(i + 1), t.nama ? g.nama : 'Guru ' + (i + 1), String(g.fill), String(g.menunggu || 0), String(g.exp), f(g.p)]; }),
          didParseCell: function (d) { var g = jg[d.row.index]; if (g) warnaKolom(d, 5, g.p, 'jurnal', 'min'); } });
        catat(['Target jurnal terisi minimal ' + KPI_TARGET.jurnal + '%. Menunggu = jurnal sudah diisi guru tetapi belum disetujui (belum dihitung terisi). Jam saat guru tercatat Izin/Sakit dikecualikan.'].concat(catNama));
      }
    } else if (tab === 'guru') {
      var gb = t.gb || [];
      judul('Kehadiran Guru (terendah di atas)');
      if (!gb.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('Belum ada data kehadiran guru pada periode ini.', L, y + 4); y += 10; }
      else {
        doc.autoTable({ startY: y, margin: { left: L, right: L }, theme: 'grid', styles: Object.assign({}, gaya, { halign: 'center', fontSize: 8 }), headStyles: kepala, columnStyles: { 0: { cellWidth: 10 }, 1: { halign: 'left' } },
          head: [['No', 'Guru', 'Hadir', 'Telat', 'Tanpa absen pulang', 'Izin', 'Sakit', 'Alpha']],
          body: gb.map(function (g, i) { return [String(i + 1), t.nama ? g.nama : 'Guru ' + (i + 1), g.hadir + '/' + g.hari + ' (' + f(pct(g.hadir, g.hari)) + ')', String(g.telat), String(g.tanpaPulang), String(g.izin), String(g.sakit), String(g.alpha)]; }),
          didParseCell: function (d) { var g = gb[d.row.index]; if (g) warnaKolom(d, 2, pct(g.hadir, g.hari), 'hadirGuru', 'min'); } });
        catat(['Target kehadiran guru minimal ' + KPI_TARGET.hadirGuru + '%. Hari ini belum dihitung. Tidak absen pulang = hari hadir (ada catatan Datang) tanpa catatan Pulang.'].concat(catNama));
      }
    }
    return y;
  }

  function buatPdf(t, logo) {
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var L = 15, R = 195, W = R - L, mid = 105, y = 14;
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : {};
    var gelap = [30, 41, 59];
    var tab = t.tab || 'ringkasan';

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
    doc.text('Periode: ' + t.per.label + (tab !== 'ringkasan' ? '  |  Bagian: ' + (NAMA_TAB[tab] || tab) : '') + '  |  Tahun ajaran ' + (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '-'), mid, y, { align: 'center' });
    y += 4.5; doc.setFontSize(8.5); doc.setTextColor(90);
    doc.text('Pembanding: ' + (t.pemb ? t.pemb.label : 'tidak ada') + '  |  Hari sekolah: ' + t.cur.sis.hariSekolah.length + ' hari  |  Dicetak: ' + ptgl(), mid, y, { align: 'center' });
    doc.setTextColor(0); y += 4;

    var f = function (v) { return v == null ? '-' : v.toFixed(1).replace('.', ',') + '%'; };
    if (tab !== 'ringkasan') y = pdfTab(doc, t, tab, y, L, W, gelap, f);
    else {   // tab Ringkasan = laporan lengkap (indikator, kelas, rincian bulan, perlu perhatian, tindak lanjut, catatan)
    var rows = barisIndikator(t);
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

    // tindak lanjut (dari catatan Admin; nama penanggung jawab hanya bila kotak 'sertakan nama guru' dicentang)
    var tlNote = tindakPeriode(t.per.kode), tlBaris = rows.filter(function (r) { var n = r.key && tlNote[r.key]; return n && (n.tindakan || n.penyebab); });
    if (tlBaris.length) {
      if (y > 225) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(0); doc.text('Tindak Lanjut', L, y); y += 4.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      tlBaris.forEach(function (r) {
        var n = tlNote[r.key];
        var tx = r.nama + ': ' + (n.penyebab ? 'penyebab ' + n.penyebab + '; ' : '') + (n.tindakan ? 'tindakan ' + n.tindakan + '; ' : '') + (n.pj && t.nama ? 'penanggung jawab ' + n.pj + '; ' : '') + (n.batas ? 'batas ' + tglId(n.batas) + '; ' : '') + 'status ' + (STATUS_TL[n.status] || '-').toLowerCase() + '.';
        var ls = doc.splitTextToSize('- ' + tx, W); doc.text(ls, L, y); y += ls.length * 4 + 0.8;
      });
      y += 3;
    }

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

    }   // akhir laporan tab Ringkasan

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
    doc.save('kpi-madrasah_' + String(t.per.kode).replace(':', '-') + (tab === 'ringkasan' ? '' : '_' + tab) + '.pdf');
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
