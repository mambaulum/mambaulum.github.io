/* ============================================================
   SI MAMBA - js/pkg-sumber.js  (v2 - disesuaikan dengan struktur asli app.js)
   Pembaca data SI MAMBA yang dijadikan BUKTI OTOMATIS untuk menu "PKG Guru" (js/pkg.js):
     1) absensi guru    -> kehadiran, keterlambatan, izin/sakit/alpa
     2) jurnal mengajar -> jumlah jurnal dan hari berjurnal dibanding hari hadir
     3) nilai siswa     -> kelengkapan input, rata-rata nilai rapor, ketuntasan

   WAJIB dimuat SEBELUM js/pkg.js (bila file ini tidak dimuat, isian bukti manual tetap jalan,
   hanya tombol "Tarik bukti otomatis" yang nonaktif).

   STRUKTUR DATA (dibaca dari app.js):
     teacher_attendance/{tanggal}_{guruKey}_{type}
         { tanggal:'YYYY-MM-DD', guru, guruKey, type:'Datang'|'Pulang'|'Izin'|'Sakit'|'Alpha',
           keterangan ('Telat N menit' bila terlambat), waktu, tahunAjaran, metode }
         Alpha ditandai otomatis sistem untuk hari kerja (Senin-Sabtu) tanpa catatan.
     journal/{pushId}
         { tanggal, jam_ke, subject, activity, kelas, guru, guruKey, type:'Reguler'|'Non-Reguler',
           mewakili, mewakiliKey, tahunAjaran, status:'approved'|'pending'|'ditolak' }
     grades/{pushId}
         { siswaKey, siswaName, kelas, subject, semester, guru, guruKey, tahunAjaran,
           data:{h1,h2,h3,mid,pas}  <- berupa TEKS, version, updatedAt }
         Nilai rapor = 40% rata-rata (h1,h2,h3) + 30% mid + 30% pas (sama dengan calculateRapor di app.js)
     kalender_akademik/{pushId}
         { jenis:'libur'|'ujian'|'acara'|'akademik', judul, tanggalMulai, tanggalSelesai }

   Kunci guru = guru.key (sama dengan guruKey di PKG). Catatan lama tanpa guruKey dicocokkan lewat nama.

   Hasil tiap sumber (dikembalikan ke pkg.js):
     { ok:true,  ringkas:'teks 1 kalimat', rincian:['baris', ...], angka:{...}, saran:0|1|2|null, dasar:'rumus saran', path:'...' }
     { ok:false, alasan:'kenapa tidak bisa dibaca' }
   "saran" hanyalah USULAN skor 0/1/2 -- penilai yang memutuskan (tombol "Pakai saran").
============================================================ */
(function () {
  'use strict';
  if (window.PKG_SUMBER) return;

  var CFG = {
    path: { absensi: 'teacher_attendance', jurnal: 'journal', nilai: 'grades', kalender: 'kalender_akademik' },
    hariLiburMingguan: [0],            // 0 = Minggu (sama dengan penanda Alpha otomatis di app.js: Senin-Sabtu)
    fieldNilai: ['h1', 'h2', 'h3', 'mid', 'pas'],
    // Ambang usulan skor (persen). Penilai tetap memutuskan.
    ambang: { hadirBaik: 90, hadirCukup: 75, jurnalBaik: 85, jurnalCukup: 60, nilaiLengkap: 80, kkm: 70 },
    maksBaca: 5000                     // batas baca node nilai bila tahun ajaran tidak diketahui
  };

  // ---------- util ----------
  function pct(a, b) { return b > 0 ? Math.round(a / b * 1000) / 10 : 0; }
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }
  function obj(x) { return x && typeof x === 'object'; }
  function iso(d) { var m = d.getMonth() + 1, t = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (t < 10 ? '0' : '') + t; }
  function hariIni() { return iso(new Date()); }
  function normNama(x) { return String(x || '').toLowerCase().replace(/[\s.,]+/g, ''); }
  function milikGuru(rec, ctx) {
    if (!obj(rec)) return false;
    if (rec.guruKey) return rec.guruKey === ctx.guruKey;
    var a = normNama(rec.guru), b = normNama(ctx.guruNama);
    return !!a && a === b;
  }
  function kunci(e) { return (e && (e.code || e.message)) || 'gagal dibaca'; }
  // daftar tanggal dari..sampai (inklusif) yang BUKAN hari libur mingguan dan BUKAN libur kalender
  function hariEfektif(dari, sampai, libur) {
    var out = [], a = new Date(dari + 'T00:00:00'), b = new Date(sampai + 'T00:00:00');
    if (isNaN(a) || isNaN(b)) return out;
    for (var d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      if (CFG.hariLiburMingguan.indexOf(d.getDay()) > -1) continue;
      var t = iso(d); if (libur && libur[t]) continue;
      out.push(t);
    }
    return out;
  }
  function parseAngka(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v !== 'string') return null;
    var s = v.trim().replace(',', '.'); if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
    return parseFloat(s);
  }

  // ---------- kalender libur ----------
  // Mengembalikan { libur:{tgl:1}, diketahui:boolean, catatan:'' }. diketahui=false bila node kosong/tidak terbaca
  // (hari efektif lalu hanya perkiraan -> tidak ada usulan skor kehadiran).
  function bacaLibur(db, dari, sampai) {
    return db.ref(CFG.path.kalender).once('value').then(function (s) {
      var libur = {}, ada = 0;
      if (s.exists()) s.forEach(function (c) {
        var k = c.val(); if (!obj(k)) return; ada++;
        if (k.jenis !== 'libur' || !k.tanggalMulai) return;
        var mulai = k.tanggalMulai, akhir = k.tanggalSelesai || k.tanggalMulai;
        if (akhir < dari || mulai > sampai) return;
        var a = new Date(mulai + 'T00:00:00'), b = new Date(akhir + 'T00:00:00');
        if (isNaN(a) || isNaN(b)) return;
        for (var d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) libur[iso(d)] = 1;
      });
      return { libur: libur, diketahui: ada > 0, catatan: ada > 0 ? '' : 'kalender akademik kosong' };
    }).catch(function (e) { return { libur: {}, diketahui: false, catatan: 'kalender akademik tidak terbaca (' + kunci(e) + ')' }; });
  }

  // baca node berindeks tanggal pada rentang; kembalikan array rekaman
  function bacaRentang(db, path, dari, sampai) {
    return db.ref(path).orderByChild('tanggal').startAt(dari).endAt(sampai).once('value').then(function (s) {
      var arr = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v)) { v.__key = c.key; arr.push(v); } });
      return arr;
    });
  }

  // ---------- 1) absensi guru ----------
  function ambilAbsensi(ctx) {
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai;
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Absensi guru: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai (hari ini ' + hariIni() + ').' });
    return Promise.all([bacaRentang(ctx.db, CFG.path.absensi, ctx.dari, batas), bacaLibur(ctx.db, ctx.dari, batas)]).then(function (h) {
      var semua = h[0], kal = h[1];
      if (!semua.length) return { ok: false, alasan: 'Absensi guru: node ' + CFG.path.absensi + ' tidak punya catatan pada rentang ' + ctx.dari + ' s.d. ' + batas + ' (belum ada yang absen, atau rentang di luar tahun ajaran).' };
      var milik = semua.filter(function (r) { return milikGuru(r, ctx); });
      if (!milik.length) return { ok: false, alasan: 'Absensi guru: ada ' + semua.length + ' catatan pada rentang ini, tetapi tidak satu pun atas nama guru ini (kunci ' + ctx.guruKey + (ctx.guruNama ? ', nama ' + ctx.guruNama : '') + '). Periksa apakah guru ini memang memakai absensi QR.' };
      var efektif = hariEfektif(ctx.dari, batas, kal.libur), ef = {}, perTgl = {}, diabaikan = 0;
      efektif.forEach(function (t) { ef[t] = 1; });
      milik.forEach(function (r) { if (!r.tanggal || !ef[r.tanggal]) { diabaikan++; return; } (perTgl[r.tanggal] = perTgl[r.tanggal] || []).push(r); });
      var today = hariIni();
      // hari ini yang belum punya catatan belum bisa dihitung (hari belum selesai; Alpha ditandai sistem untuk hari lampau)
      if (ef[today] && !perTgl[today]) { delete ef[today]; efektif = efektif.filter(function (t) { return t !== today; }); }
      var c = { hadir: 0, izin: 0, sakit: 0, alpa: 0, terlambat: 0, tanpaPulang: 0, tanpaCatatan: 0 }, tglHadir = [];
      efektif.forEach(function (t) {
        var rs = perTgl[t] || [], tipe = {}, telat = false;
        rs.forEach(function (r) { tipe[r.type] = r; if (r.type === 'Datang' && /^\s*(telat|terlambat)/i.test(String(r.keterangan || ''))) telat = true; });
        if (tipe.Datang) { c.hadir++; tglHadir.push(t); if (telat) c.terlambat++; if (!tipe.Pulang) c.tanpaPulang++; }
        else if (tipe.Sakit) c.sakit++;
        else if (tipe.Izin) c.izin++;
        else if (tipe.Alpha) c.alpa++;
        else c.tanpaCatatan++;
      });
      var n = efektif.length, p = pct(c.hadir, n), A = CFG.ambang, perkiraan = !kal.diketahui;
      var saran = (perkiraan || n === 0) ? null : (p >= A.hadirBaik ? 2 : (p >= A.hadirCukup ? 1 : 0));
      ctx.hari = { efektif: n, hadir: c.hadir, tanggalHadir: tglHadir, perkiraan: perkiraan };
      var rincian = ['Rentang: ' + ctx.dari + ' s.d. ' + batas + (batas !== ctx.sampai ? ' (dipotong sampai hari ini)' : ''), 'Sumber data: ' + CFG.path.absensi + '; hari efektif = Senin-Sabtu dikurangi libur di kalender akademik'];
      if (c.tanpaPulang) rincian.push('Hari hadir tanpa absen Pulang: ' + c.tanpaPulang);
      if (c.tanpaCatatan) rincian.push('Hari efektif tanpa catatan apa pun (belum ditandai Alpha oleh sistem): ' + c.tanpaCatatan);
      if (diabaikan) rincian.push('Catatan di hari libur/Minggu tidak dihitung: ' + diabaikan);
      if (perkiraan) rincian.push('Peringatan: ' + kal.catatan + ', jadi libur tidak diketahui dan hari efektif hanya perkiraan.');
      return {
        ok: true, path: CFG.path.absensi, saran: saran,
        dasar: perkiraan ? 'Tidak ada usulan skor: ' + kal.catatan + ', sehingga hari efektif tidak bisa dipastikan.' : (n === 0 ? 'Tidak ada hari efektif pada rentang ini.' : 'Kehadiran ≥' + A.hadirBaik + '% → 2; ' + A.hadirCukup + '–' + (A.hadirBaik - 0.1) + '% → 1; di bawahnya → 0'),
        ringkas: 'Hadir ' + c.hadir + ' dari ' + n + ' hari efektif' + (perkiraan ? ' (perkiraan)' : '') + ' = ' + f1(p) + '%; terlambat ' + c.terlambat + 'x; izin ' + c.izin + ', sakit ' + c.sakit + ', alpa ' + c.alpa,
        rincian: rincian,
        angka: { hadir: c.hadir, izin: c.izin, sakit: c.sakit, alpa: c.alpa, terlambat: c.terlambat, efektif: n, persen: p }
      };
    });
  }

  // ---------- 2) jurnal mengajar ----------
  function ambilJurnal(ctx) {
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai;
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Jurnal mengajar: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai.' });
    return bacaRentang(ctx.db, CFG.path.jurnal, ctx.dari, batas).then(function (semua) {
      if (!semua.length) return { ok: false, alasan: 'Jurnal mengajar: node ' + CFG.path.jurnal + ' tidak punya jurnal pada rentang ' + ctx.dari + ' s.d. ' + batas + '.' };
      var milik = semua.filter(function (r) { return milikGuru(r, ctx); });
      if (!milik.length) return { ok: false, alasan: 'Jurnal mengajar: ada ' + semua.length + ' jurnal pada rentang ini, tetapi tidak satu pun atas nama guru ini (kunci ' + ctx.guruKey + (ctx.guruNama ? ', nama ' + ctx.guruNama : '') + ').' };
      var sah = milik.filter(function (r) { return !r.status || r.status === 'approved'; });
      var menunggu = milik.filter(function (r) { return r.status === 'pending'; }).length, ditolak = milik.filter(function (r) { return r.status === 'ditolak'; }).length;
      if (!sah.length) return { ok: false, alasan: 'Jurnal mengajar: ' + milik.length + ' jurnal milik guru ini belum ada yang berstatus disetujui (menunggu ' + menunggu + ', ditolak ' + ditolak + ').' };
      var h = ctx.hari, hari = {}, mapel = {}, jenis = {};
      sah.forEach(function (r) {
        hari[r.tanggal] = 1;
        var m = r.subject; if (m) mapel[String(m)] = (mapel[String(m)] || 0) + 1;
        var j = r.type || 'Reguler'; jenis[j] = (jenis[j] || 0) + 1;
      });
      var nHari = Object.keys(hari).length;
      var punyaPenyebut = !!(h && h.hadir > 0 && !h.perkiraan);
      var penyebut = punyaPenyebut ? h.hadir : (h && h.efektif ? h.efektif : 0), ket = punyaPenyebut ? 'hari hadir' : 'hari efektif';
      var p = penyebut > 0 ? Math.min(100, pct(nHari, penyebut)) : 0, A = CFG.ambang;
      var andal = !!(h && !h.perkiraan && penyebut > 0);
      var saran = andal ? (p >= A.jurnalBaik ? 2 : (p >= A.jurnalCukup ? 1 : 0)) : null;
      var top = Object.keys(mapel).sort(function (a, b) { return mapel[b] - mapel[a]; }).slice(0, 5).map(function (m) { return m + ' (' + mapel[m] + ')'; });
      var rincian = ['Rentang: ' + ctx.dari + ' s.d. ' + batas, 'Sumber data: ' + CFG.path.jurnal + ' (hanya jurnal berstatus disetujui)',
        'Jenis: ' + Object.keys(jenis).map(function (j) { return j + ' ' + jenis[j]; }).join(', ')];
      if (menunggu || ditolak) rincian.push('Tidak dihitung: menunggu persetujuan ' + menunggu + ', ditolak ' + ditolak);
      if (top.length) rincian.push('Mata pelajaran: ' + top.join(', '));
      if (!andal) rincian.push('Peringatan: hari hadir/efektif tidak dapat dipastikan (absensi tidak terbaca atau kalender libur kosong), jadi tidak ada usulan skor.');
      return {
        ok: true, path: CFG.path.jurnal, saran: saran,
        dasar: andal ? 'Hari berjurnal ÷ ' + ket + ' ≥' + A.jurnalBaik + '% → 2; ' + A.jurnalCukup + '–' + (A.jurnalBaik - 0.1) + '% → 1; di bawahnya → 0' : 'Tidak ada usulan skor: pembagi (hari hadir/efektif) tidak dapat dipastikan.',
        ringkas: sah.length + ' jurnal pada ' + nHari + ' hari' + (penyebut > 0 ? ' (' + f1(p) + '% dari ' + penyebut + ' ' + ket + (andal ? '' : ', perkiraan') + ')' : ''),
        rincian: rincian,
        angka: { jurnal: sah.length, hari: nHari, penyebut: penyebut, persen: p }
      };
    });
  }

  // ---------- 3) nilai siswa ----------
  // Tidak memakai rentang tanggal: nilai dibaca untuk seluruh tahun ajaran berjalan (currentTahunAjaran di app.js).
  function ambilNilai(ctx) {
    var ta = (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) ? currentTahunAjaran : null;
    var ref = ta ? ctx.db.ref(CFG.path.nilai).orderByChild('tahunAjaran').equalTo(ta) : ctx.db.ref(CFG.path.nilai).limitToLast(CFG.maksBaca);
    return ref.once('value').then(function (s) {
      var semua = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v)) semua.push(v); });
      if (!semua.length) return { ok: false, alasan: 'Nilai siswa: node ' + CFG.path.nilai + ' tidak punya nilai' + (ta ? ' untuk tahun ajaran ' + ta : '') + '.' };
      var milik = semua.filter(function (r) { return milikGuru(r, ctx); });
      if (!milik.length) return { ok: false, alasan: 'Nilai siswa: ada ' + semua.length + ' rekaman nilai' + (ta ? ' (TA ' + ta + ')' : '') + ', tetapi tidak satu pun diinput oleh guru ini (kunci ' + ctx.guruKey + (ctx.guruNama ? ', nama ' + ctx.guruNama : '') + ').' };
      var F = CFG.fieldNilai, terisi = 0, lengkap = [], siswa = {}, mapel = {}, kelas = {}, sem = {};
      milik.forEach(function (r) {
        var d = obj(r.data) ? r.data : {}, n = {}, adaSemua = true;
        F.forEach(function (f) { var v = parseAngka(d[f]); if (v == null) adaSemua = false; else { terisi++; n[f] = v; } });
        if (r.siswaKey) siswa[r.siswaKey] = 1;
        if (r.subject) mapel[r.subject] = (mapel[r.subject] || 0) + 1;
        if (r.kelas) kelas[r.kelas] = 1;
        if (r.semester) sem[r.semester] = 1;
        if (adaSemua) lengkap.push(Math.round(((n.h1 + n.h2 + n.h3) / 3) * 0.4 + n.mid * 0.3 + n.pas * 0.3));   // = calculateRapor di app.js
      });
      var kapasitas = milik.length * F.length, kelengkapan = pct(terisi, kapasitas), A = CFG.ambang;
      var rata = lengkap.length ? lengkap.reduce(function (a, b) { return a + b; }, 0) / lengkap.length : null;
      var tuntas = lengkap.filter(function (x) { return x >= A.kkm; }).length;
      var saran = kelengkapan >= A.nilaiLengkap ? 1 : 0;
      var rincian = ['Sumber data: ' + CFG.path.nilai + (ta ? ' (tahun ajaran ' + ta + ', tanpa batas tanggal)' : ' (semua tahun ajaran, tanpa batas tanggal)'),
        'Komponen dinilai: h1, h2, h3, mid, pas; nilai rapor = 40% rata-rata harian + 30% mid + 30% pas',
        'Mata pelajaran: ' + Object.keys(mapel).map(function (m) { return m + ' (' + mapel[m] + ')'; }).slice(0, 6).join(', '),
        'Kelas: ' + Object.keys(kelas).sort().join(', ') + '; semester: ' + (Object.keys(sem).join(', ') || '-')];
      if (lengkap.length) rincian.push('Rapor lengkap dihitung: ' + lengkap.length + ' dari ' + milik.length + ' rekaman; KKM acuan ' + A.kkm + ' (belum ada pengaturan KKM di aplikasi, ubah CFG.ambang.kkm bila perlu)');
      else rincian.push('Belum ada rekaman dengan kelima komponen terisi, jadi rata-rata rapor belum dihitung.');
      return {
        ok: true, path: CFG.path.nilai, saran: saran,
        dasar: 'Kelengkapan input ≥' + A.nilaiLengkap + '% → 1; di bawahnya → 0. Skor 2 menunggu penilai memastikan analisis hasil penilaian/remedial dari dokumen (tidak ada di data aplikasi).',
        ringkas: milik.length + ' rekaman nilai (' + Object.keys(siswa).length + ' siswa, ' + Object.keys(mapel).length + ' mapel); kelengkapan input ' + f1(kelengkapan) + '%' + (rata != null ? '; rata-rata rapor ' + f1(rata) + '; tuntas (≥' + A.kkm + ') ' + tuntas + ' dari ' + lengkap.length + ' (' + f1(pct(tuntas, lengkap.length)) + '%)' : ''),
        rincian: rincian,
        angka: { rekaman: milik.length, siswa: Object.keys(siswa).length, kelengkapan: kelengkapan, rata: rata != null ? Math.round(rata * 10) / 10 : null, tuntas: tuntas, persenTuntas: pct(tuntas, lengkap.length) }
      };
    });
  }

  // ---------- registrasi sumber ----------
  // cocok: pola yang dicari pada teks BUKTI tiap indikator instrumen -> indikator itu dianggap bisa dibuktikan sumber ini.
  var DAFTAR = {
    absensi: { label: 'Absensi guru', ikon: '🕘', cocok: /daftar hadir guru|rekap.{0,20}hadir|kehadiran guru|piket/i, ambil: ambilAbsensi },
    jurnal: { label: 'Jurnal mengajar', ikon: '📓', cocok: /jurnal/i, ambil: ambilJurnal },
    nilai: { label: 'Nilai siswa', ikon: '📊', cocok: /daftar nilai|buku nilai|leger|penilaian harian|analisis (hasil )?penilaian|daya serap/i, ambil: ambilNilai }
  };
  var URUT = ['absensi', 'jurnal', 'nilai'];        // absensi dulu: hasilnya dipakai sebagai pembagi jurnal

  function jalankan(ctx) {
    var hasil = {};
    return URUT.reduce(function (p, id) {
      return p.then(function () {
        return Promise.resolve().then(function () { return DAFTAR[id].ambil(ctx); })
          .then(function (h) { hasil[id] = h || { ok: false, alasan: 'Tidak ada hasil.' }; })
          .catch(function (e) { hasil[id] = { ok: false, alasan: DAFTAR[id].label + ': ' + kunci(e) }; });
      });
    }, Promise.resolve()).then(function () { return hasil; });
  }

  window.PKG_SUMBER = { versi: 2, cfg: CFG, daftar: DAFTAR, urut: URUT, jalankan: jalankan };
})();
