/* ============================================================
   SI MAMBA - js/pkg-sumber.js  (v2 - disesuaikan dengan struktur asli app.js)
   Pembaca data SI MAMBA yang dijadikan BUKTI OTOMATIS untuk menu "PKG Guru" (js/pkg.js):
     1) absensi guru    -> kehadiran, keterlambatan, izin/sakit/alpa
     2) jurnal mengajar -> jumlah jurnal dan hari berjurnal dibanding hari hadir
     3) nilai siswa     -> kelengkapan input, rata-rata nilai rapor, ketuntasan
     4) perangkat pembelajaran + modul ajar -> ATP/TP, Prota/Promes, kisi-kisi, kartu soal, modul ajar, persetujuan Kepala (v5)
     5) buku penghubung -> komunikasi dengan orang tua (indikator 12.1; v6)
     6) kegiatan madrasah -> kehadiran rapat/lembur/ujian (indikator 12.2; v6)

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
    path: { absensi: 'teacher_attendance', jurnal: 'journal', nilai: 'grades', kalender: 'kalender_akademik', buku: 'buku_penghubung', event: 'event_attendance', ujian: 'ujian_attendance' },
    hariLiburMingguan: [0],            // 0 = Minggu (sama dengan penanda Alpha otomatis di app.js: Senin-Sabtu)
    fieldNilai: ['h1', 'h2', 'h3', 'mid', 'pas'],
    // Ambang usulan skor (persen). Penilai tetap memutuskan.
    ambang: { hadirBaik: 90, hadirCukup: 75, jurnalBaik: 85, jurnalCukup: 60, nilaiLengkap: 80, kkm: 70, bukuBaik: 4, bukuCukup: 1, kegiatanBaik: 3 },   // buku*: catatan per bulan; kegiatanBaik: jumlah kegiatan berbeda
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

  // Utamakan kueri per guru (guruKey): hanya rekaman guru ini yang diunduh. Bila tidak ada hasil (catatan lama tanpa
  // guruKey, atau indeks belum dipasang lalu kueri ditolak), jatuh ke cara lama: unduh rentang tanggal lalu saring.
  function bacaGuru(db, path, ctx, dari, sampai) {
    return db.ref(path).orderByChild('guruKey').equalTo(ctx.guruKey).once('value').then(function (s) {
      var arr = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v) && v.tanggal >= dari && v.tanggal <= sampai) { v.__key = c.key; arr.push(v); } });
      return arr;
    }).then(function (arr) { return arr.length ? arr : bacaRentang(db, path, dari, sampai); },
            function () { return bacaRentang(db, path, dari, sampai); });
  }

  // ---------- 1) absensi guru ----------
  function ambilAbsensi(ctx) {
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai;
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Absensi guru: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai (hari ini ' + hariIni() + ').' });
    return Promise.all([bacaGuru(ctx.db, CFG.path.absensi, ctx, ctx.dari, batas), bacaLibur(ctx.db, ctx.dari, batas)]).then(function (h) {
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
    return bacaGuru(ctx.db, CFG.path.jurnal, ctx, ctx.dari, batas).then(function (semua) {
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


  // ---------- 4) perangkat pembelajaran dan modul ajar ----------
  // Membaca node yang ditulis js/perangkat-pembelajaran.js, perangkat-atp-tp.js, perangkat-prota-promes.js, perangkat-kisi.js,
  // perangkat-soal.js (perangkat_v4, perangkat_tp_v4, perangkat_materi_v4, perangkat_kisi_v4, perangkat_soal_v4) dan js/modul-ajar.js
  // (modul_ajar). Usulan skor DIHITUNG PER INDIKATOR (hasil.perInd), bukan satu skor untuk semua indikator sumber ini.
  // Satuan penilaian = (mapel + kelas + semester) yang masuk rentang tanggal. Tingkat per satuan: 2 = ada DAN disetujui Kepala,
  // 1 = ada tetapi belum disetujui / hanya sebagian, 0 = belum ada. Usulan indikator: semua satuan 2 -> 2; ada yang >= 1 -> 1; selain itu 0.
  // RPE tidak disimpan sebagai data (hanya dicetak), jadi tidak dipakai kecuali ada tautannya.
  var PERANGKAT_IND = {
    '3_1': 'Silabus/ATP-TP sesuai kurikulum', '3_2': 'Rencana pembelajaran (modul ajar) sesuai ATP/TP', '3_3': 'Materi untuk mencapai tujuan (modul ajar, Prota/Promes)',
    '3_4': 'Urutan materi (Prota/Promes)', '7_1': 'Alat penilaian (kisi-kisi, kartu soal)', '13_2': 'Pemetaan CP/TP dan alokasi waktu (ATP/TP, Promes)'
  };
  function slugKey(x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x'; }   // sama dengan slug() di perangkat-pembelajaran.js
  function normMapel(x) { return String(x || '').toLowerCase().replace(/[’'`´ʻʼ]/g, '').replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim(); }
  function normKelas(x) { return String(x || '').toLowerCase().replace(/\s+/g, '').replace(/^kelas/, ''); }
  function kunciUnit(m, k) { return normMapel(m) + '|' + normKelas(k); }
  function arr(x) { return Array.isArray(x) ? x : (obj(x) ? Object.keys(x).map(function (k) { return x[k]; }) : []); }
  function semNama(x) { var t = String(x || '').toLowerCase(); return t === 'genap' ? 'genap' : (t === 'ganjil' ? 'ganjil' : ''); }
  // Semester yang beririsan dengan rentang tanggal: Juli-Desember = ganjil, Januari-Juni = genap.
  function semDalamRentang(dari, sampai) {
    var a = new Date(dari + 'T00:00:00'), b = new Date(sampai + 'T00:00:00'), ada = {}, n = 0;
    if (isNaN(a) || isNaN(b)) return [];
    for (var d = new Date(a.getFullYear(), a.getMonth(), 1); d <= b && n < 36; d.setMonth(d.getMonth() + 1), n++) ada[d.getMonth() >= 6 ? 'ganjil' : 'genap'] = 1;
    return ['ganjil', 'genap'].filter(function (x) { return ada[x]; });
  }
  // Baca node berkunci "<awalan>..." lalu saring rekaman milik guru ini. Mengembalikan { d: [rekaman], e: pesan galat atau null }.
  function bacaAwalan(db, node, awalan, ctx) {
    return Promise.all(awalan.map(function (aw) {
      return db.ref(node).orderByKey().startAt(aw).endAt(aw + '').once('value').then(function (s) {
        var o = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v) && v.guruKey === ctx.guruKey) o.push(v); });
        return o;
      });
    })).then(function (h) { return { d: [].concat.apply([], h), e: null }; }, function (e) { return { d: [], e: node + ': ' + kunci(e) }; });
  }
  function bacaModul(db, ctx) {
    var milik = function (v) { return obj(v) && (v.ownerKey ? v.ownerKey === ctx.guruKey : (normNama(v.ownerName) === normNama(ctx.guruNama) && !!normNama(ctx.guruNama))); };
    var saring = function (s) { var o = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (milik(v)) o.push(v); }); return o; };
    return db.ref('modul_ajar').orderByChild('ownerKey').equalTo(ctx.guruKey).once('value').then(saring)
      .then(function (o) { return o.length ? o : db.ref('modul_ajar').once('value').then(saring); },      // modul lama tanpa ownerKey, atau .indexOn belum dipasang
            function () { return db.ref('modul_ajar').once('value').then(saring); })
      .then(function (o) { return { d: o, e: null }; }, function (e) { return { d: [], e: 'modul_ajar: ' + kunci(e) }; });
  }
  function ambilPerangkat(ctx) {
    var ta = (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) ? String(currentTahunAjaran) : '';
    if (!ta) return Promise.resolve({ ok: false, alasan: 'Perangkat pembelajaran: tahun ajaran aktif tidak diketahui (currentTahunAjaran kosong).' });
    var sems = semDalamRentang(ctx.dari, ctx.sampai);
    if (!sems.length) return Promise.resolve({ ok: false, alasan: 'Perangkat pembelajaran: rentang tanggal tidak sah.' });
    var tas = slugKey(ta), gs = slugKey(ctx.guruKey);
    var awSem = sems.map(function (x) { return tas + '_' + x + '_' + gs + '_'; });
    return Promise.all([bacaAwalan(ctx.db, 'perangkat_v4', awSem, ctx), bacaAwalan(ctx.db, 'perangkat_tp_v4', [tas + '_' + gs + '_'], ctx),
      bacaAwalan(ctx.db, 'perangkat_materi_v4', awSem, ctx), bacaAwalan(ctx.db, 'perangkat_kisi_v4', awSem, ctx),
      bacaAwalan(ctx.db, 'perangkat_soal_v4', awSem, ctx), bacaModul(ctx.db, ctx)]).then(function (r) {
      var G = { v4: r[0], tp: r[1], materi: r[2], kisi: r[3], soal: r[4], modul: r[5] }, galat = [];
      Object.keys(G).forEach(function (k) { if (G[k].e) galat.push(G[k].e); });
      var ok = function () { for (var i = 0; i < arguments.length; i++) if (G[arguments[i]].e) return false; return true; };
      if (G.v4.e) return { ok: false, alasan: 'Perangkat pembelajaran tidak terbaca (' + galat.join('; ') + '). Biasanya Rules membatasi baca perangkat_v4 untuk penilai; lihat catatan paket.' };
      var ta0 = normMapel(ta).replace(/\s+/g, '');
      var modul = G.modul.d.filter(function (m) {
        return m.status !== 'arsip' && semNama(m.semester) && sems.indexOf(semNama(m.semester)) > -1 && (!m.tahunAjaran || normMapel(m.tahunAjaran).replace(/\s+/g, '') === ta0);
      });
      var pairs = {}, label = {}, rows = {}, tp = {}, materi = {}, kisi = {}, soal = {};
      var tambah = function (m, k, sm) { if (!m || !k || sems.indexOf(sm) < 0) return ''; var u = kunciUnit(m, k), key = u + '#' + sm; pairs[key] = { u: u, sem: sm }; if (!label[key]) label[key] = String(m) + ' ' + String(k) + ' ' + sm; return key; };
      G.v4.d.forEach(function (v) { var key = tambah(v.mapel, v.kelas, semNama(v.semester)); if (key) rows[key] = v; });
      G.materi.d.forEach(function (v) { var key = tambah(v.mapel, v.kelas, semNama(v.semester)); if (key) materi[key] = v; });
      G.kisi.d.forEach(function (v) { var key = tambah(v.mapel, v.kelas, semNama(v.semester)); if (key) kisi[key] = v; });
      G.soal.d.forEach(function (v) { var key = tambah(v.mapel, v.kelas, semNama(v.semester)); if (key) soal[key] = v; });
      G.tp.d.forEach(function (v) { tp[kunciUnit(v.mapel, v.kelas)] = v; arr(v.items).forEach(function (it) { if (it && semNama(it.sem)) tambah(v.mapel, v.kelas, semNama(it.sem)); }); });
      modul.forEach(function (m) { m.__key = tambah(m.mapel, m.kelas, semNama(m.semester)); });
      var keys = Object.keys(pairs);
      if (!keys.length) return { ok: false, alasan: 'Perangkat pembelajaran: belum ada perangkat (menu Perangkat Pembelajaran) maupun modul ajar milik guru ini untuk semester ' + sems.join('/') + ' tahun ajaran ' + ta + '.' };
      // keberadaan dokumen: tautan (perangkat_v4.docs) ATAU dibuat di aplikasi
      var ada = function (jk, key) {
        var p = pairs[key], row = rows[key], ln = row && row.docs && row.docs[jk], gen = false;
        if (jk === 'atp' || jk === 'tp') { var t = tp[p.u], its = t ? arr(t.items) : []; gen = its.some(function (it) { return it && (semNama(it.sem) === p.sem || !semNama(it.sem)); }); }
        else if (jk === 'prota' || jk === 'promes') gen = !!(materi[key] && arr(materi[key].materi).length);
        else if (jk === 'kisi') gen = !!(kisi[key] && arr(kisi[key].items).some(function (it) { return it && ((+it.pg || 0) + (+it.is || 0) + (+it.ur || 0)) > 0; }));
        else if (jk === 'kartu' || jk === 'kunci') gen = !!(soal[key] && arr(soal[key].soal).some(function (x) { return x && String(x.q || '').trim(); }));
        return { ada: !!(ln && ln.url) || gen, setuju: !!(ln && ln.setuju) };
      };
      var modulDi = function (key) { var l = modul.filter(function (m) { return m.__key === key; }); return { ada: l.length, setuju: l.filter(function (m) { return m.persetujuan === 'disetujui'; }), semua: l }; };
      var lvl = function (semua, ada1, setuju) { return semua ? (setuju ? 2 : 1) : (ada1 ? 1 : 0); };
      var HIT = {
        '3_1': { perlu: ['v4', 'tp'], f: function (k) { var a = ada('atp', k), t = ada('tp', k); return lvl(a.ada && t.ada, a.ada || t.ada, a.setuju); } },
        '3_2': { perlu: ['v4', 'tp', 'modul'], f: function (k) { var m = modulDi(k), t = ada('tp', k); return m.setuju.length && t.ada ? 2 : (m.ada ? 1 : 0); } },
        '3_3': { perlu: ['v4', 'materi', 'modul'], f: function (k) { var m = modulDi(k), p = ada('prota', k); return m.setuju.some(function (x) { return String(x.materiIsi || '').trim(); }) ? 2 : ((m.ada || p.ada) ? 1 : 0); } },
        '3_4': { perlu: ['v4', 'materi'], f: function (k) { var a = ada('prota', k), b = ada('promes', k); return lvl(a.ada && b.ada, a.ada || b.ada, a.setuju && b.setuju); } },
        '7_1': { perlu: ['v4', 'kisi', 'soal'], f: function (k) { var a = ada('kisi', k), b = ada('kartu', k); return lvl(a.ada && b.ada, a.ada || b.ada, a.setuju); } },
        '13_2': { perlu: ['v4', 'tp', 'materi'], f: function (k) { var t = ada('tp', k), a = ada('atp', k), p = ada('promes', k); return lvl(t.ada && a.ada && p.ada, t.ada || p.ada, a.setuju); } }
      };
      var perInd = {}, rincian = [], angka = { satuan: keys.length }, tanpa = [];
      Object.keys(HIT).forEach(function (id) {
        var h = HIT[id], bisa = ok.apply(null, h.perlu);
        if (!bisa) { tanpa.push(id.replace('_', '.')); return; }
        var n = [0, 0, 0]; keys.forEach(function (k) { n[h.f(k)]++; });
        var sr = n[0] === 0 && n[1] === 0 ? 2 : (n[1] + n[2] > 0 ? 1 : 0);
        perInd[id] = sr; angka['i' + id] = sr;
        rincian.push(id.replace('_', '.') + ' ' + PERANGKAT_IND[id] + ' → usulan ' + sr + ' (lengkap ' + n[2] + ', sebagian ' + n[1] + ', belum ' + n[0] + ' dari ' + keys.length + ' satuan)');
      });
      if (!Object.keys(perInd).length) return { ok: false, alasan: 'Perangkat pembelajaran: node yang dibutuhkan tidak terbaca (' + galat.join('; ') + ').' };
      var cat = ['RPE tidak disimpan sebagai data (hanya dicetak), sehingga tidak dihitung.'];
      if (galat.length) cat.push('Tidak terbaca: ' + galat.join('; ') + (tanpa.length ? ' (indikator ' + tanpa.join(', ') + ' tanpa usulan)' : ''));
      rincian.unshift('Satuan (mapel kelas semester): ' + keys.map(function (k) { return label[k]; }).slice(0, 8).join(', ') + (keys.length > 8 ? ', …' : ''));
      rincian.push(cat.join(' '));
      var nm = modul.length, nms = modul.filter(function (m) { return m.persetujuan === 'disetujui'; }).length;
      angka.modul = nm; angka.modulSetuju = nms;
      var cnt = function (jk) { return keys.filter(function (k) { return ada(jk, k).ada; }).length; };
      return {
        ok: true, path: 'perangkat_v4 + modul_ajar', saran: null, perInd: perInd,
        dasar: 'Per indikator: 2 bila semua satuan ada dan disetujui Kepala; 1 bila ada sebagian atau belum disetujui; 0 bila belum ada.',
        ringkas: keys.length + ' satuan (semester ' + sems.join('/') + '): ATP/TP ' + cnt('atp') + ', Prota/Promes ' + cnt('promes') + ', kisi-kisi ' + cnt('kisi') + ', kartu soal ' + cnt('kartu') + '; modul ajar ' + nm + ' (disetujui ' + nms + ')',
        rincian: rincian, angka: angka
      };
    }).catch(function (e) { return { ok: false, alasan: 'Perangkat pembelajaran: ' + kunci(e) }; });
  }

  // ---------- 5) buku penghubung (komunikasi guru dengan orang tua) -> indikator 12.1 ----------
  // buku_penghubung/{pushId} = { siswaKey, siswaNama, kelas, tanggal, catatan, tahunAjaran, inputBy (NAMA penulis, bukan kunci), inputAt }.
  // Karena tidak ada guruKey, pencocokan memakai nama (normNama: abaikan spasi, titik, koma, huruf besar/kecil).
  function ambilBuku(ctx) {
    var ta = (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) ? currentTahunAjaran : null;
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai;
    if (!ta) return Promise.resolve({ ok: false, alasan: 'Buku Penghubung: tahun ajaran berjalan tidak diketahui.' });
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Buku Penghubung: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai.' });
    return ctx.db.ref(CFG.path.buku).orderByChild('tahunAjaran').equalTo(ta).once('value').then(function (s) {
      var semua = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v) && v.tanggal >= ctx.dari && v.tanggal <= batas) semua.push(v); });
      if (!semua.length) return { ok: false, alasan: 'Buku Penghubung: tidak ada catatan pada rentang ' + ctx.dari + ' s.d. ' + batas + ' (tahun ajaran ' + ta + ').' };
      var nm = normNama(ctx.guruNama);
      var milik = semua.filter(function (r) { return !!nm && normNama(r.inputBy) === nm; });
      if (!milik.length) return { ok: false, alasan: 'Buku Penghubung: ada ' + semua.length + ' catatan pada rentang ini, tetapi tidak satu pun ditulis atas nama guru ini (' + (ctx.guruNama || '-') + ').' };
      var siswa = {}, hari = {}, kelas = {};
      milik.forEach(function (r) { if (r.siswaKey) siswa[r.siswaKey] = 1; if (r.tanggal) hari[r.tanggal] = 1; if (r.kelas) kelas[r.kelas] = 1; });
      var a = new Date(ctx.dari + 'T00:00:00'), b = new Date(batas + 'T00:00:00');
      var bulan = Math.max(1, Math.round(((b - a) / 86400000 + 1) / 30)), per = milik.length / bulan, A = CFG.ambang;
      var saran = per >= A.bukuBaik ? 2 : (per >= A.bukuCukup ? 1 : 0);
      return {
        ok: true, path: CFG.path.buku, saran: saran,
        dasar: 'Rata-rata catatan per bulan ≥' + A.bukuBaik + ' → 2; ≥' + A.bukuCukup + ' → 1; di bawahnya → 0. Hanya mengukur catatan di Buku Penghubung (bukan telepon/pertemuan langsung); isi catatan tidak dinilai.',
        ringkas: milik.length + ' catatan untuk ' + Object.keys(siswa).length + ' siswa pada ' + Object.keys(hari).length + ' hari (±' + f1(per) + ' per bulan, ' + bulan + ' bulan)',
        rincian: ['Rentang: ' + ctx.dari + ' s.d. ' + batas, 'Sumber data: ' + CFG.path.buku + ' (dicocokkan lewat nama penulis)', 'Kelas: ' + (Object.keys(kelas).sort().join(', ') || '-')],
        angka: { catatan: milik.length, siswa: Object.keys(siswa).length, hari: Object.keys(hari).length, perBulan: Math.round(per * 10) / 10 }
      };
    });
  }

  // ---------- 6) kegiatan madrasah di luar pembelajaran -> indikator 12.2 ----------
  // event_attendance/{pushId} = { eventKey, eventNama, jenis ('Rapat'|'Lembur'|...), guruKey, tanggal, ... }
  // ujian_attendance/{pushId} = { ujianKey, ujianNama, jenis, guruKey, tanggal, ... }. Dihitung kegiatan BERBEDA yang dihadiri.
  function ambilKegiatan(ctx) {
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai;
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Kegiatan madrasah: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai.' });
    var baca = function (path) { return bacaGuru(ctx.db, path, ctx, ctx.dari, batas).then(function (a) { return a.filter(function (r) { return milikGuru(r, ctx); }); }, function () { return []; }); };
    return Promise.all([baca(CFG.path.event), baca(CFG.path.ujian)]).then(function (h) {
      var ada = {}, perJenis = {}, n = 0;
      h[0].forEach(function (r) { var k = 'e:' + (r.eventKey || r.__key); if (ada[k]) return; ada[k] = 1; n++; var j = r.jenis || 'Kegiatan'; perJenis[j] = (perJenis[j] || 0) + 1; });
      h[1].forEach(function (r) { var k = 'u:' + (r.ujianKey || r.__key); if (ada[k]) return; ada[k] = 1; n++; var j = r.jenis || 'Ujian'; perJenis[j] = (perJenis[j] || 0) + 1; });
      if (!n) return { ok: false, alasan: 'Kegiatan madrasah: tidak ada catatan kehadiran rapat/lembur/ujian atas nama guru ini pada rentang ' + ctx.dari + ' s.d. ' + batas + '.' };
      var A = CFG.ambang, saran = n >= A.kegiatanBaik ? 2 : 1;
      return {
        ok: true, path: CFG.path.event + ' + ' + CFG.path.ujian, saran: saran,
        dasar: 'Menghadiri ≥' + A.kegiatanBaik + ' kegiatan berbeda → 2; 1–' + (A.kegiatanBaik - 1) + ' kegiatan → 1. Tidak ada catatan = tanpa usulan (bisa jadi memang belum ada kegiatan). Peran dan kualitas keterlibatan dinilai penilai.',
        ringkas: n + ' kegiatan berbeda dihadiri (' + Object.keys(perJenis).map(function (j) { return j + ' ' + perJenis[j]; }).join(', ') + ')',
        rincian: ['Rentang: ' + ctx.dari + ' s.d. ' + batas, 'Sumber data: ' + CFG.path.event + ' (Rapat/Lembur) dan ' + CFG.path.ujian],
        angka: { kegiatan: n }
      };
    });
  }

  // ---------- registrasi sumber ----------
  // indikator: daftar EKSPLISIT indikator ("komponen_urut") yang benar-benar bisa dibuktikan sumber ini. Sebelum v20 dicocokkan lewat
  // regex pada teks bukti instrumen, sehingga mis. "daftar hadir guru" (bukti pendamping 9.1-9.5) ikut memberi usulan skor untuk
  // perilaku santun/teladan, dan kelengkapan input nilai memberi usulan untuk 11.1 (adil). Indikator di luar daftar = tanpa usulan.
  var DAFTAR = {
    absensi: { label: 'Absensi guru', ikon: '🕘', indikator: ['10_1', '10_3', '10_4'], ambil: ambilAbsensi },
    jurnal: { label: 'Jurnal mengajar', ikon: '📓', indikator: ['7_4', '14_2'], ambil: ambilJurnal },
    nilai: { label: 'Nilai siswa', ikon: '📊', indikator: ['5_1', '7_1', '7_2', '7_3'], ambil: ambilNilai },
    perangkat: { label: 'Perangkat pembelajaran & modul ajar', ikon: '📚', indikator: ['3_1', '3_2', '3_3', '3_4', '7_1', '13_2'], ambil: ambilPerangkat },
    buku: { label: 'Buku Penghubung (komunikasi dengan orang tua)', ikon: '💬', indikator: ['12_1'], ambil: ambilBuku },
    kegiatan: { label: 'Kegiatan madrasah (rapat, lembur, ujian)', ikon: '🗓️', indikator: ['12_2'], ambil: ambilKegiatan }
  };
  var URUT = ['absensi', 'jurnal', 'nilai', 'perangkat', 'buku', 'kegiatan'];        // absensi dulu: hasilnya dipakai sebagai pembagi jurnal

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

  window.PKG_SUMBER = { versi: 6, cfg: CFG, daftar: DAFTAR, urut: URUT, jalankan: jalankan };
})();
