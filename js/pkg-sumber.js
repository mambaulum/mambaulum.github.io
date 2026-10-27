/* ============================================================
   SI MAMBA - js/pkg-sumber.js  (v14: Alpha di hari libur/tanpa jadwal tidak dihitung, Izin/Sakit di hari tanpa jadwal juga dibuang; v13: hari efektif absensi hanya hari berjadwal guru; v2 - disesuaikan dengan struktur asli app.js; v8: absensi menampilkan hari tanpa catatan dan tidak mengusulkan skor bila hadir 0 tetapi ada hari tanpa catatan; v9: sumber baru tugasadm untuk indikator 10.5; v10: sumber baru rapat untuk indikator 12.2; v11: RPE ikut dihitung pada indikator 13.2; v12: tugasadm menyertakan penunjukan sebagai PJ kegiatan Amalan Yaumiyah; v13: absensi mengembalikan perInd (10.1 tepat waktu, 10.3 kehadiran, 10.4 izin/sakit vs alpa dipisah), jurnal dipotong dengan tanggalHadir dan 7.4 dikeluarkan dari indikator jurnal)
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
    path: { absensi: 'teacher_attendance', jurnal: 'journal', nilai: 'grades', kalender: 'kalender_akademik', buku: 'buku_penghubung', materi: 'materi_belajar', tugas: 'tugas', event: 'event_attendance', ujian: 'ujian_attendance', checkin: 'activity_checkin_v4', jenisKegiatan: 'activity_types_v4', rapat: 'rapat', rapatHadir: 'rapat_hadir' },
    hariLiburMingguan: [0],            // 0 = Minggu (sama dengan penanda Alpha otomatis di app.js: Senin-Sabtu)
    fieldNilai: ['h1', 'h2', 'h3', 'mid', 'pas'],
    // Ambang usulan skor (persen). Penilai tetap memutuskan.
    ambang: { hadirBaik: 90, hadirCukup: 75, tepatBaik: 90, tepatCukup: 75, izinBaik: 90, izinCukup: 75, jurnalBaik: 85, jurnalCukup: 60, nilaiLengkap: 80, kkm: 70, bukuBaik: 4, bukuCukup: 1, kegiatanBaik: 3, tikCukup: 1, refleksiMin: 30 },   // buku*: catatan per bulan; kegiatanBaik: jumlah kegiatan berbeda
    petugasMulai: '2026-10-15',        // check-in petugas shalat via QR berlaku sejak tanggal ini (sama dengan HONOR_SHOLAT_MULAI_CHECKIN di app.js; data sebelumnya tidak ada)
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
  // v13: hari mengajar guru dari jadwal (allJadwal di app.js). Hari tanpa jadwal tidak dihitung sebagai hari efektif guru itu,
  // sehingga Alpha otomatis / "tanpa catatan" di hari tanpa jadwal tidak menurunkan kehadiran. null = jadwal tidak terbaca (pakai cara lama).
  var NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function hariJadwalGuru(ctx) {
    var all = (typeof allJadwal !== 'undefined' && Array.isArray(allJadwal)) ? allJadwal : [];
    if (!all.length) return null;
    var b = normNama(ctx.guruNama), set = {}, n = 0;
    all.forEach(function (j) {
      if (!obj(j) || !j.hari) return;
      var milik = j.guruKey ? j.guruKey === ctx.guruKey : (!!b && normNama(j.guru) === b);
      if (milik) { set[j.hari] = 1; n++; }
    });
    return n ? set : null;
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
    // v13: hasil kueri guruKey SELALU digabung dengan catatan lama tanpa guruKey (dicocokkan lewat nama, titik/spasi diabaikan),
    // supaya catatan lama tidak hilang begitu ada satu catatan baru ber-guruKey. Rentang tanggal terindeks (tanggal) dan dibatasi periode.
    var b = normNama(ctx.guruNama);
    var perKunci = db.ref(path).orderByChild('guruKey').equalTo(ctx.guruKey).once('value').then(function (s) {
      var arr = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v) && v.tanggal >= dari && v.tanggal <= sampai) { v.__key = c.key; arr.push(v); } });
      return arr;
    }, function () { return null; });
    var perRentang = b ? bacaRentang(db, path, dari, sampai).catch(function () { return []; }) : Promise.resolve([]);
    return Promise.all([perKunci, perRentang]).then(function (h) {
      var kunci = h[0], lama = h[1].filter(function (v) { return !v.guruKey && normNama(v.guru) === b; });
      if (kunci === null) return bacaRentang(db, path, dari, sampai);   // kueri guruKey ditolak (indeks belum ada): cara lama
      var ada = {}; kunci.forEach(function (v) { ada[v.__key] = 1; });
      return kunci.concat(lama.filter(function (v) { return !ada[v.__key]; }));
    });
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
      var efektif = hariEfektif(ctx.dari, batas, kal.libur), ef = {}, perTgl = {}, diabaikan = 0, tanpaJadwal = 0, alphaDibuang = 0;
      // v13/v14: hanya hari berjadwal yang dihitung. Hari tanpa jadwal tetap dihitung bila guru tercatat Datang (mis. mewakili);
      // Izin, Sakit, Alpha, atau "tanpa catatan" di hari tanpa jadwal dibuang. Alpha di hari libur (mingguan/kalender) juga dibuang.
      var hj = hariJadwalGuru(ctx);
      if (hj) {
        var adaHadirTgl = {};
        milik.forEach(function (r) { if (r.tanggal && r.type === 'Datang') adaHadirTgl[r.tanggal] = 1; });   // v14: hanya Datang (mis. mewakili) yang mempertahankan hari tanpa jadwal; Izin/Sakit/Alpha di hari itu dibuang
        efektif = efektif.filter(function (t) {
          var h = NAMA_HARI[new Date(t + 'T00:00:00').getDay()];
          if (hj[h] || adaHadirTgl[t]) return true;
          tanpaJadwal++; return false;
        });
      }
      efektif.forEach(function (t) { ef[t] = 1; });
      milik.forEach(function (r) { if (!r.tanggal || !ef[r.tanggal]) { if (r.tanggal && r.type === 'Alpha') alphaDibuang++; else diabaikan++; return; } (perTgl[r.tanggal] = perTgl[r.tanggal] || []).push(r); });
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
      var saran103 = (perkiraan || n === 0) ? null : (p >= A.hadirBaik ? 2 : (p >= A.hadirCukup ? 1 : 0));
      // v8: tidak ada satu pun catatan Datang. Bila masih ada hari tanpa catatan apa pun, kemungkinan data absensi tidak terbaca atas nama guru ini
      // (kunci/nama berbeda, atau guru tidak memakai absensi QR), sehingga skor 0 dari persen kehadiran bisa merugikan guru: usulan dikosongkan.
      var hadirNol = n > 0 && c.hadir === 0, tanpaUsulan = hadirNol && c.tanpaCatatan > 0;
      if (tanpaUsulan) saran103 = null;
      // v13: usulan dipisah per indikator (hasil.perInd), karena tiga indikator ini mengukur hal berbeda:
      //   10.1 tepat waktu    -> hari hadir tanpa catatan terlambat / hari hadir
      //   10.3 memenuhi jam   -> hari hadir / hari efektif (rumus lama)
      //   10.4 izin & kabar   -> izin+sakit tercatat / (izin+sakit+alpa); tanpa ketidakhadiran sama sekali = 2
      var tepat = c.hadir - c.terlambat, pTepat = pct(tepat, c.hadir);
      var tidakHadir = c.izin + c.sakit + c.alpa, pIzin = pct(c.izin + c.sakit, tidakHadir);
      var pakai = !(perkiraan || n === 0 || tanpaUsulan);
      var saran101 = (pakai && c.hadir > 0) ? (pTepat >= A.tepatBaik ? 2 : (pTepat >= A.tepatCukup ? 1 : 0)) : null;
      var saran104 = null;
      if (pakai) { if (tidakHadir > 0) saran104 = pIzin >= A.izinBaik ? 2 : (pIzin >= A.izinCukup ? 1 : 0); else if (c.tanpaCatatan === 0) saran104 = 2; }
      var perInd = { '10_1': saran101, '10_3': saran103, '10_4': saran104 };
      ctx.hari = { efektif: n, hadir: c.hadir, tanggalHadir: tglHadir, perkiraan: perkiraan };
      var rincian = ['Rentang: ' + ctx.dari + ' s.d. ' + batas + (batas !== ctx.sampai ? ' (dipotong sampai hari ini)' : ''), 'Sumber data: ' + CFG.path.absensi + '; hari efektif = hari berjadwal guru (Senin-Sabtu) dikurangi libur di kalender akademik'];
      if (pakai) {
        var tt = function (s) { return s == null ? 'tanpa usulan' : 'usulan ' + s; };
        rincian.unshift(
          '10.1 Tepat waktu → ' + tt(saran101) + ': ' + (c.hadir ? tepat + ' dari ' + c.hadir + ' hari hadir tanpa terlambat = ' + f1(pTepat) + '% (≥' + A.tepatBaik + '% → 2; ' + A.tepatCukup + '–' + (A.tepatBaik - 0.1) + '% → 1)' : 'tidak ada hari hadir'),
          '10.3 Memenuhi jam mengajar → ' + tt(saran103) + ': hadir ' + c.hadir + ' dari ' + n + ' hari efektif = ' + f1(p) + '%',
          '10.4 Izin & pemberitahuan → ' + tt(saran104) + ': ' + (tidakHadir ? 'izin/sakit tercatat ' + (c.izin + c.sakit) + ', alpa ' + c.alpa + ' = ' + f1(pIzin) + '% ber-izin; kebenaran alasan/surat dinilai penilai' : (saran104 == null ? 'tidak ada izin/sakit/alpa, tetapi ' + c.tanpaCatatan + ' hari tanpa catatan' : 'tidak ada hari tidak hadir'))
        );
      }
      if (c.tanpaPulang) rincian.push('Hari hadir tanpa absen Pulang: ' + c.tanpaPulang);
      if (c.tanpaCatatan) rincian.push('Hari efektif tanpa catatan apa pun (belum ditandai Alpha oleh sistem): ' + c.tanpaCatatan);
      if (hadirNol) rincian.push('Peringatan: tidak ada satu pun catatan Datang atas nama guru ini pada rentang ini. Periksa apakah guru ini memakai absensi QR dan apakah kunci guru (' + ctx.guruKey + ') sama dengan yang tercatat di ' + CFG.path.absensi + ' sebelum memakai angka ini sebagai bukti.');
      if (alphaDibuang) rincian.push('Alpha di hari libur atau hari tanpa jadwal mengajar tidak dihitung: ' + alphaDibuang + ' catatan');
      if (diabaikan) rincian.push('Catatan di hari libur/Minggu tidak dihitung: ' + diabaikan);
      if (hj && tanpaJadwal) rincian.push('Hari tanpa jadwal mengajar guru ini tidak dihitung sebagai hari efektif (Alpha di hari tersebut diabaikan): ' + tanpaJadwal + ' hari');
      if (!hj) rincian.push('Peringatan: jadwal mengajar guru ini tidak terbaca (allJadwal kosong / belum dimuat), jadi semua hari Senin-Sabtu dihitung efektif.');
      if (perkiraan) rincian.push('Peringatan: ' + kal.catatan + ', jadi libur tidak diketahui dan hari efektif hanya perkiraan.');
      return {
        ok: true, path: CFG.path.absensi, saran: null, perInd: perInd,   // saran tunggal dikosongkan: usulan per indikator ada di perInd (pkg.js memakai perInd lebih dulu)
        dasar: perkiraan ? 'Tidak ada usulan skor: ' + kal.catatan + ', sehingga hari efektif tidak bisa dipastikan.' : (tanpaUsulan ? 'Tidak ada usulan skor: tidak ada catatan Datang sama sekali dan ' + c.tanpaCatatan + ' hari efektif tanpa catatan, sehingga data absensi perlu diperiksa dulu (penilai menetapkan skor).' : n === 0 ? 'Tidak ada hari efektif pada rentang ini.' : 'Usulan per indikator: 10.1 hadir tanpa telat ÷ hari hadir; 10.3 hadir ÷ hari efektif; 10.4 izin+sakit ÷ (izin+sakit+alpa). Ambang ≥90% → 2; 75–89,9% → 1; di bawahnya → 0'),
        ringkas: 'Hadir ' + c.hadir + ' dari ' + n + ' hari efektif' + (perkiraan ? ' (perkiraan)' : '') + ' = ' + f1(p) + '%; terlambat ' + c.terlambat + 'x; izin ' + c.izin + ', sakit ' + c.sakit + ', alpa ' + c.alpa + (c.tanpaCatatan ? ', tanpa catatan ' + c.tanpaCatatan : ''),
        rincian: rincian,
        angka: { hadir: c.hadir, izin: c.izin, sakit: c.sakit, alpa: c.alpa, terlambat: c.terlambat, efektif: n, persen: p, persenTepat: c.hadir ? pTepat : null, persenIzin: tidakHadir ? pIzin : null }
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
      ctx.admin = ctx.admin || {}; ctx.admin.jurnal = { sah: sah.length, menunggu: menunggu, ditolak: ditolak };   // v9: dipakai sumber tugasadm (10.5)
      if (!sah.length) return { ok: false, alasan: 'Jurnal mengajar: ' + milik.length + ' jurnal milik guru ini belum ada yang berstatus disetujui (menunggu ' + menunggu + ', ditolak ' + ditolak + ').' };
      var h = ctx.hari, hari = {}, mapel = {}, jenis = {};
      sah.forEach(function (r) {
        hari[r.tanggal] = 1;
        var m = r.subject; if (m) mapel[String(m)] = (mapel[String(m)] || 0) + 1;
        var j = r.type || 'Reguler'; jenis[j] = (jenis[j] || 0) + 1;
      });
      var nHariAll = Object.keys(hari).length, nHari = nHariAll, hariLuar = 0;
      var punyaPenyebut = !!(h && h.hadir > 0 && !h.perkiraan && Array.isArray(h.tanggalHadir));
      // v13: hanya hari berjurnal yang jatuh pada hari hadir (tanggalHadir dari absensi) yang dihitung, supaya pembilang dan penyebut
      // memakai himpunan hari yang sama (jurnal di hari tak hadir, mis. mewakili/sakit, tidak menaikkan persen).
      if (punyaPenyebut) {
        var hdr = {}; h.tanggalHadir.forEach(function (t) { hdr[t] = 1; });
        nHari = Object.keys(hari).filter(function (t) { return hdr[t]; }).length;
        hariLuar = nHariAll - nHari;
      }
      var penyebut = punyaPenyebut ? h.hadir : (h && h.efektif ? h.efektif : 0), ket = punyaPenyebut ? 'hari hadir' : 'hari efektif';
      var p = penyebut > 0 ? Math.min(100, pct(nHari, penyebut)) : 0, A = CFG.ambang;
      var andal = !!(h && !h.perkiraan && penyebut > 0);
      var saran = andal ? (p >= A.jurnalBaik ? 2 : (p >= A.jurnalCukup ? 1 : 0)) : null;
      var top = Object.keys(mapel).sort(function (a, b) { return mapel[b] - mapel[a]; }).slice(0, 5).map(function (m) { return m + ' (' + mapel[m] + ')'; });
      var rincian = ['Rentang: ' + ctx.dari + ' s.d. ' + batas, 'Sumber data: ' + CFG.path.jurnal + ' (hanya jurnal berstatus disetujui)',
        'Jenis: ' + Object.keys(jenis).map(function (j) { return j + ' ' + jenis[j]; }).join(', ')];
      if (menunggu || ditolak) rincian.push('Tidak dihitung: menunggu persetujuan ' + menunggu + ', ditolak ' + ditolak);
      if (hariLuar) rincian.push('Hari berjurnal di luar hari hadir tidak dihitung: ' + hariLuar + ' dari ' + nHariAll + ' hari berjurnal');
      if (top.length) rincian.push('Mata pelajaran: ' + top.join(', '));
      if (!andal) rincian.push('Peringatan: hari hadir/efektif tidak dapat dipastikan (absensi tidak terbaca atau kalender libur kosong), jadi tidak ada usulan skor.');
      return {
        ok: true, path: CFG.path.jurnal, saran: saran,
        dasar: andal ? 'Hari berjurnal ÷ ' + ket + ' ≥' + A.jurnalBaik + '% → 2; ' + A.jurnalCukup + '–' + (A.jurnalBaik - 0.1) + '% → 1; di bawahnya → 0' : 'Tidak ada usulan skor: pembagi (hari hadir/efektif) tidak dapat dipastikan.',
        ringkas: sah.length + ' jurnal pada ' + nHariAll + ' hari' + (hariLuar ? ', ' + nHari + ' di antaranya hari hadir' : '') + (penyebut > 0 ? ' (' + f1(p) + '% dari ' + penyebut + ' ' + ket + (andal ? '' : ', perkiraan') + ')' : ''),
        rincian: rincian,
        angka: { jurnal: sah.length, hari: nHari, hariBerjurnal: nHariAll, penyebut: penyebut, persen: p }
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
      ctx.admin = ctx.admin || {}; ctx.admin.nilai = { rekaman: milik.length, kelengkapan: kelengkapan };   // v9: dipakai sumber tugasadm (10.5)
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
  // RPE (v11): dihitung dari tautan perangkat_v4.docs.rpe atau dari jpPerPekan tersimpan + kalender efektif perangkat_rpe_kaldik_v4 (dituntut hanya bila kalender semester itu sudah diisi).
  var PERANGKAT_IND = {
    '3_1': 'Silabus/ATP-TP sesuai kurikulum', '3_2': 'Rencana pembelajaran (modul ajar) sesuai ATP/TP', '3_3': 'Materi untuk mencapai tujuan (modul ajar, Prota/Promes)',
    '3_4': 'Urutan materi (Prota/Promes)', '7_1': 'Alat penilaian (kisi-kisi, kartu soal)', '13_2': 'Pemetaan CP/TP dan alokasi waktu (ATP/TP, Promes, RPE)'
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
      bacaAwalan(ctx.db, 'perangkat_soal_v4', awSem, ctx), bacaModul(ctx.db, ctx),
      Promise.all(sems.map(function (sm) { return ctx.db.ref('perangkat_rpe_kaldik_v4/' + tas + '_' + sm).once('value').then(function (x) { return { sm: sm, v: x.val() }; }, function () { return { sm: sm, v: null }; }); }))]).then(function (r) {
      var G = { v4: r[0], tp: r[1], materi: r[2], kisi: r[3], soal: r[4], modul: r[5] }, galat = [];
      Object.keys(G).forEach(function (k) { if (G[k].e) galat.push(G[k].e); });
      var ok = function () { for (var i = 0; i < arguments.length; i++) if (G[arguments[i]].e) return false; return true; };
      if (G.v4.e) return { ok: false, alasan: 'Perangkat pembelajaran tidak terbaca (' + galat.join('; ') + '). Biasanya Rules membatasi baca perangkat_v4 untuk penilai; lihat catatan paket.' };
      var kald = {}; (r[6] || []).forEach(function (x) { if (obj(x.v) && x.v.mulai && x.v.selesai) kald[x.sm] = x.v; });   // v11: kalender efektif RPE (diisi Admin/Kepala per semester)
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
        else if (jk === 'rpe') gen = !!(row && +row.jpPerPekan > 0 && kald[p.sem]);   // RPE dibuat di aplikasi: JP per pekan tersimpan + kalender efektif semester tersedia
        return { ada: !!(ln && ln.url) || gen, setuju: !!(ln && ln.setuju) };
      };
      var rpeSiap = function (key) { return !!kald[pairs[key].sem]; };   // RPE hanya dituntut bila kalender efektif semester itu sudah diisi (tanpa itu guru tidak bisa membuatnya)
      var modulDi = function (key) { var l = modul.filter(function (m) { return m.__key === key; }); return { ada: l.length, setuju: l.filter(function (m) { return m.persetujuan === 'disetujui'; }), semua: l }; };
      var lvl = function (semua, ada1, setuju) { return semua ? (setuju ? 2 : 1) : (ada1 ? 1 : 0); };
      var HIT = {
        '3_1': { perlu: ['v4', 'tp'], f: function (k) { var a = ada('atp', k), t = ada('tp', k); return lvl(a.ada && t.ada, a.ada || t.ada, a.setuju); } },
        '3_2': { perlu: ['v4', 'tp', 'modul'], f: function (k) { var m = modulDi(k), t = ada('tp', k); return m.setuju.length && t.ada ? 2 : (m.ada ? 1 : 0); } },
        '3_3': { perlu: ['v4', 'materi', 'modul'], f: function (k) { var m = modulDi(k), p = ada('prota', k); return m.setuju.some(function (x) { return String(x.materiIsi || '').trim(); }) ? 2 : ((m.ada || p.ada) ? 1 : 0); } },
        '3_4': { perlu: ['v4', 'materi'], f: function (k) { var a = ada('prota', k), b = ada('promes', k); return lvl(a.ada && b.ada, a.ada || b.ada, a.setuju && b.setuju); } },
        '7_1': { perlu: ['v4', 'kisi', 'soal'], f: function (k) { var a = ada('kisi', k), b = ada('kartu', k); return lvl(a.ada && b.ada, a.ada || b.ada, a.setuju); } },
        '13_2': { perlu: ['v4', 'tp', 'materi'], f: function (k) { var t = ada('tp', k), a = ada('atp', k), p = ada('promes', k), r = ada('rpe', k), perlu = rpeSiap(k); return lvl(t.ada && a.ada && p.ada && (!perlu || r.ada), t.ada || p.ada || r.ada, a.setuju && (!perlu || r.setuju)); } }
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
      var nRpe = keys.filter(function (k) { return rpeSiap(k); }).length;
      var cat = [nRpe ? 'RPE dihitung dari tautan atau dari JP per pekan tersimpan + kalender efektif semester (perangkat_rpe_kaldik_v4); dituntut pada ' + nRpe + ' dari ' + keys.length + ' satuan.' : 'RPE belum dituntut: kalender efektif semester belum diisi Admin/Kepala (perangkat_rpe_kaldik_v4).'];
      if (galat.length) cat.push('Tidak terbaca: ' + galat.join('; ') + (tanpa.length ? ' (indikator ' + tanpa.join(', ') + ' tanpa usulan)' : ''));
      rincian.unshift('Satuan (mapel kelas semester): ' + keys.map(function (k) { return label[k]; }).slice(0, 8).join(', ') + (keys.length > 8 ? ', …' : ''));
      rincian.push(cat.join(' '));
      var nm = modul.length, nms = modul.filter(function (m) { return m.persetujuan === 'disetujui'; }).length;
      angka.modul = nm; angka.modulSetuju = nms;
      var cnt = function (jk) { return keys.filter(function (k) { return ada(jk, k).ada; }).length; };
      return {
        ok: true, path: 'perangkat_v4 + modul_ajar', saran: null, perInd: perInd,
        dasar: 'Per indikator: 2 bila semua satuan ada dan disetujui Kepala; 1 bila ada sebagian atau belum disetujui; 0 bila belum ada.',
        ringkas: keys.length + ' satuan (semester ' + sems.join('/') + '): ATP/TP ' + cnt('atp') + ', Prota/Promes ' + cnt('promes') + ', RPE ' + cnt('rpe') + ', kisi-kisi ' + cnt('kisi') + ', kartu soal ' + cnt('kartu') + '; modul ajar ' + nm + ' (disetujui ' + nms + ')',
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

  // ---------- 7) materi belajar & tugas daring -> indikator 14.6 (pemanfaatan TIK) ----------
  // materi_belajar/{id} dan tugas/{id} = { kelas, mapel, judul, tanggal, tahunAjaran, inputBy (NAMA penulis), inputAt }.
  // Usulan dibatasi maksimal 1: indikator 14.6 juga menyangkut TIK untuk PKB (tidak ada di data aplikasi).
  function ambilTik(ctx) {
    var ta = (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) ? currentTahunAjaran : null;
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai;
    if (!ta) return Promise.resolve({ ok: false, alasan: 'Materi & tugas daring: tahun ajaran berjalan tidak diketahui.' });
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Materi & tugas daring: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai.' });
    var nm = normNama(ctx.guruNama);
    var baca = function (path) {
      return ctx.db.ref(path).orderByChild('tahunAjaran').equalTo(ta).once('value').then(function (s) {
        var a = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v) && v.tanggal >= ctx.dari && v.tanggal <= batas && !!nm && normNama(v.inputBy) === nm) a.push(v); });
        return a;
      }, function () { return []; });
    };
    return Promise.all([baca(CFG.path.materi), baca(CFG.path.tugas)]).then(function (h) {
      var m = h[0], t = h[1], n = m.length + t.length;
      if (!n) return { ok: false, alasan: 'Materi & tugas daring: tidak ada materi belajar atau tugas atas nama guru ini pada rentang ' + ctx.dari + ' s.d. ' + batas + ' (pencocokan lewat nama penulis).' };
      var kelas = {}, mapel = {};
      m.concat(t).forEach(function (r) { if (r.kelas) kelas[r.kelas] = 1; if (r.mapel) mapel[r.mapel] = 1; });
      var A = CFG.ambang;
      return {
        ok: true, path: CFG.path.materi + ' + ' + CFG.path.tugas, saran: n >= A.tikCukup ? 1 : 0,
        dasar: 'Ada materi/tugas daring → 1. Skor 2 menunggu penilai memastikan pemanfaatan TIK untuk komunikasi dan PKB (jejak digital, bukti PKB) yang tidak ada di data aplikasi.',
        ringkas: m.length + ' materi belajar dan ' + t.length + ' tugas diunggah (' + Object.keys(mapel).length + ' mapel, ' + Object.keys(kelas).length + ' kelas)',
        rincian: ['Rentang: ' + ctx.dari + ' s.d. ' + batas, 'Sumber data: ' + CFG.path.materi + ' dan ' + CFG.path.tugas + ' (dicocokkan lewat nama penulis)', 'Mapel: ' + (Object.keys(mapel).slice(0, 6).join(', ') || '-')],
        angka: { materi: m.length, tugas: t.length }
      };
    });
  }

  // ---------- 8) penilaian diri guru (refleksi) -> indikator 14.1 ----------
  // Dibaca dari data PKG yang sudah dimuat aplikasi (ctx.diri = { r: {kode: teks}, kunciRefleksi: [kode...], butir: n, terjawab: n }).
  // Hanya mengukur kelengkapan; kualitas (spesifik, ada contoh pengalaman) tetap dinilai penilai, jadi usulan dibatasi maksimal 1.
  function ambilDiri(ctx) {
    var d = ctx.diri;
    if (!d || !d.kunciRefleksi || !d.kunciRefleksi.length) return Promise.resolve({ ok: false, alasan: 'Penilaian diri: modul angket/penilaian diri belum termuat.' });
    var r = d.r || {}, min = CFG.ambang.refleksiMin, terisi = 0, panjang = 0;
    d.kunciRefleksi.forEach(function (k) { var t = String(r[k] || '').trim(); if (t.length >= min) terisi++; panjang += t.length; });
    if (!d.terjawab && !panjang) return Promise.resolve({ ok: false, alasan: 'Penilaian diri: guru ini belum mengisi penilaian diri pada periode ini.' });
    var lengkap = terisi === d.kunciRefleksi.length && d.terjawab >= d.butir;
    return Promise.resolve({
      ok: true, path: 'pkg_v4_bukti (penilaian diri)', saran: lengkap ? 1 : 0,
      dasar: 'Semua butir terjawab dan semua refleksi terisi (≥' + min + ' karakter) → 1; selain itu 0. Skor 2 menunggu penilai memastikan evaluasi diri spesifik dan didukung contoh pengalaman.',
      ringkas: d.terjawab + ' dari ' + d.butir + ' butir terjawab; refleksi terisi ' + terisi + ' dari ' + d.kunciRefleksi.length,
      rincian: ['Sumber data: penilaian diri guru pada periode PKG ini'],
      angka: { butir: d.terjawab, refleksi: terisi }
    });
  }


  // ---------- 9) tugas administratif dan tugas tambahan -> indikator 10.5 (v9) ----------
  // Mengumpulkan jejak tugas non-pembelajaran yang sudah ada di aplikasi: (a) jurnal yang menunggu/ditolak (dari sumber jurnal),
  // (b) kelengkapan input nilai (dari sumber nilai), (c) check-in petugas shalat berjamaah via QR: activity_checkin_v4/{tanggal}_{typeKey} =
  // { typeId, tanggal, guruKey, guruName, peran, klaim, via, jarak, telatMenit, at }, dan (d) bila modul honor sholat termuat, hari petugas
  // yang lolos (check-in dalam jendela jam + absensi siswa lengkap). Tidak ada rumus skor: ini bukti pendamping untuk penilai.
  function bacaPetugas(ctx, dari, batas) {
    return ctx.db.ref(CFG.path.checkin).orderByKey().startAt(dari).endAt(batas + '\uf8ff').once('value').then(function (s) {
      var a = []; if (s.exists()) s.forEach(function (c) {
        var v = c.val(); if (!obj(v)) return;
        var ya = v.guruKey ? v.guruKey === ctx.guruKey : (!!normNama(v.guruName) && normNama(v.guruName) === normNama(ctx.guruNama));
        if (ya && v.tanggal >= dari && v.tanggal <= batas) a.push(v);
      });
      return a;
    });
  }
  function bacaHonor(ctx, dari, batas) {   // opsional: hanya bila modul honor sholat di app.js termuat; gagal/lama -> null (dilewati)
    if (typeof honorSholatDapat !== 'function') return Promise.resolve(null);
    var bln = [], a = new Date(dari.slice(0, 7) + '-01T00:00:00'), z = new Date(batas.slice(0, 7) + '-01T00:00:00');
    for (var d = new Date(a); d <= z; d.setMonth(d.getMonth() + 1)) bln.push([d.getFullYear(), d.getMonth() + 1]);
    var gk = ctx.guruKey; try { if (typeof honorSholatResolve === 'function') gk = honorSholatResolve(ctx.guruKey, ctx.guruNama); } catch (e) { }
    var satu = function (y, m) {
      return new Promise(function (res) {
        var selesai = false, fin = function (hs) { if (selesai) return; selesai = true; res(hs && hs.siap && hs.hasil ? (hs.hasil.entri || {}) : null); };
        try { var hs = honorSholatDapat(y, m, function () { fin(honorSholatDapat(y, m)); }); if (hs && (hs.siap || hs.gagal)) fin(hs); } catch (e) { fin(null); }
        setTimeout(function () { fin(null); }, 12000);
      });
    };
    return Promise.all(bln.map(function (b) { return satu(b[0], b[1]); })).then(function (daftar) {
      var tot = 0, ok = 0, alasan = {};
      daftar.forEach(function (entri) {
        if (!entri) return;
        Object.keys(entri).forEach(function (k) {
          var x = entri[k]; if (!x || x.gk !== gk || x.tgl < dari || x.tgl > batas) return;
          tot++; if (x.lolos) ok++; else (x.alasanSistem || []).forEach(function (t) { alasan[t] = (alasan[t] || 0) + 1; });
        });
      });
      return tot ? { tot: tot, ok: ok, alasan: alasan } : null;
    }).catch(function () { return null; });
  }
  function ambilTugasAdm(ctx) {
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai, ad = ctx.admin || {}, ringkas = [], rincian = [], angka = {};
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Tugas administratif: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai.' });
    if (ad.jurnal) {
      var j = ad.jurnal; ringkas.push('jurnal ' + j.sah + ' disetujui, ' + j.menunggu + ' menunggu, ' + j.ditolak + ' ditolak');
      rincian.push('Jurnal mengajar: ' + j.sah + ' disetujui, ' + j.menunggu + ' menunggu persetujuan, ' + j.ditolak + ' ditolak (dari sumber jurnal)');
      angka.jurnalMenunggu = j.menunggu; angka.jurnalDitolak = j.ditolak;
    }
    if (ad.nilai) {
      ringkas.push('input nilai ' + f1(ad.nilai.kelengkapan) + '% lengkap');
      rincian.push('Input nilai: ' + ad.nilai.rekaman + ' rekaman, kelengkapan ' + f1(ad.nilai.kelengkapan) + '% (dari sumber nilai)');
      angka.nilaiLengkap = Math.round(ad.nilai.kelengkapan * 10) / 10;
    }
    var dari2 = ctx.dari > CFG.petugasMulai ? ctx.dari : CFG.petugasMulai;
    var tugas = dari2 > batas ? Promise.resolve(null) : bacaPetugas(ctx, dari2, batas).catch(function () { return null; });
    // v12: kegiatan Amalan Yaumiyah yang guru ini ditunjuk sebagai penanggung jawab (PJ) oleh Admin: activity_types_v4/{key} = { name, picKey, picName }
    var pj = ctx.db.ref(CFG.path.jenisKegiatan).once('value').then(function (s) {
      var a = [], nm = normNama(ctx.guruNama); if (s.exists()) s.forEach(function (c) {
        var v = c.val(); if (!obj(v) || !v.name) return;
        var rk = (v.picKey && v.picKey !== '-') ? String(v.picKey) : '';
        if (rk ? rk === ctx.guruKey : (!!nm && normNama(v.picName) === nm)) a.push(String(v.name));
      });
      return a;
    }).catch(function () { return []; });
    return Promise.all([tugas, pj]).then(function (x) {
      var rs = x[0], pjList = x[1];
      return (rs && rs.length ? bacaHonor(ctx, dari2, batas) : Promise.resolve(null)).then(function (hn) { return [rs, hn, pjList]; });
    }).then(function (h) {
      var rs = h[0], hn = h[1], pjList = h[2] || [];
      if (pjList.length) { ringkas.push('PJ kegiatan: ' + pjList.slice(0, 3).join(', ') + (pjList.length > 3 ? ', dst' : '')); rincian.push('Ditunjuk Admin sebagai penanggung jawab (PJ) kegiatan Amalan Yaumiyah: ' + pjList.join(', ') + ' (saat ini; penunjukan tidak menyimpan riwayat tanggal)'); angka.pjKegiatan = pjList.length; }
      if (rs && rs.length) {
        var hari = {}, telat = 0, pengganti = 0, ukur = 0;
        rs.forEach(function (r) { hari[r.tanggal] = 1; if (r.klaim) pengganti++; if (typeof r.telatMenit === 'number') { ukur++; if (r.telatMenit > 0) telat++; } });
        var nh = Object.keys(hari).length;
        ringkas.push('petugas shalat ' + nh + ' hari (terlambat ' + telat + 'x)');
        rincian.push('Petugas shalat (check-in QR, sejak ' + dari2 + '): ' + rs.length + ' check-in pada ' + nh + ' hari; terlambat ' + telat + ' dari ' + ukur + ' yang tercatat jamnya; sebagai pengganti ' + pengganti);
        angka.petugasHari = nh; angka.petugasTelat = telat;
        if (hn) {
          var al = Object.keys(hn.alasan).sort(function (x, y) { return hn.alasan[y] - hn.alasan[x]; }).slice(0, 2).map(function (t) { return t + ' (' + hn.alasan[t] + 'x)'; });
          ringkas.push('lolos standar honor ' + hn.ok + ' dari ' + hn.tot);
          rincian.push('Hari petugas yang lolos standar (check-in dalam jam + absensi siswa lengkap): ' + hn.ok + ' dari ' + hn.tot + (al.length ? '; yang belum lolos: ' + al.join('; ') : ''));
          angka.petugasLolos = hn.ok; angka.petugasTotal = hn.tot;
        }
      } else if (dari2 <= batas) rincian.push('Petugas shalat: tidak ada check-in atas nama guru ini sejak ' + dari2 + ' (bisa jadi guru ini tidak bertugas sebagai PJ; check-in QR baru berlaku mulai ' + CFG.petugasMulai + ').');
      if (!ringkas.length) return { ok: false, alasan: 'Tugas administratif: tidak ada jejak yang bisa dibaca (jurnal, nilai, atau check-in petugas shalat). Indikator ini dinilai dari dokumen dan wawancara.' };
      rincian.unshift('Rentang: ' + ctx.dari + ' s.d. ' + batas);
      return {
        ok: true, path: 'journal + grades + ' + CFG.path.checkin, saran: null,
        dasar: 'Tanpa usulan skor: ketepatan waktu tugas administratif (laporan, dokumen, administrasi kelas) tidak tercatat di aplikasi. Angka ini pendamping untuk penilai.',
        ringkas: ringkas.join('; '), rincian: rincian, angka: angka
      };
    });
  }

  // ---------- 10) kehadiran rapat -> indikator 12.2 (v10) ----------
  // Dibaca langsung dari modul Rapat (js/rapat.js): rapat/{id} = { judul, tanggal, pimpinanId, pimpinan, status: 'terjadwal'|'selesai', honor }
  // dan rapat_hadir/{id}/{kunciGuru} = { status: hadir|daring|izin|sakit|dl|alpha, nama, ts, oleh, ket }. Hanya rapat berstatus 'selesai' yang
  // dihitung: saat ditutup, guru yang belum diisi otomatis Alpha, jadi datanya final. Rapat tanpa honor tidak tercatat di event_attendance,
  // sehingga sumber kegiatan tidak melihatnya; sumber ini menutup celah itu. Dinas Luar = berhalangan sah, tidak masuk pembagi.
  function ambilRapat(ctx) {
    var batas = ctx.sampai > hariIni() ? hariIni() : ctx.sampai;
    if (ctx.dari > batas) return Promise.resolve({ ok: false, alasan: 'Rapat: rentang ' + ctx.dari + ' s.d. ' + ctx.sampai + ' belum dimulai.' });
    return ctx.db.ref(CFG.path.rapat).orderByChild('tanggal').startAt(ctx.dari).endAt(batas).once('value').then(function (s) {
      var rp = []; if (s.exists()) s.forEach(function (c) { var v = c.val(); if (obj(v)) { v.__key = c.key; rp.push(v); } });
      if (!rp.length) return { ok: false, alasan: 'Rapat: node ' + CFG.path.rapat + ' tidak punya rapat pada rentang ' + ctx.dari + ' s.d. ' + batas + '.' };
      var selesai = rp.filter(function (r) { return r.status === 'selesai'; }), belum = rp.length - selesai.length;
      if (!selesai.length) return { ok: false, alasan: 'Rapat: ada ' + rp.length + ' rapat pada rentang ini, tetapi belum ada yang ditutup (kehadiran final baru ada setelah rapat ditutup Admin).' };
      var nm = normNama(ctx.guruNama), kk = ctx.guruKey;
      var cari = function (h) {
        if (!obj(h)) return null; var ks = Object.keys(h), i;
        for (i = 0; i < ks.length; i++) if (ks[i] === kk && obj(h[ks[i]])) return h[ks[i]];
        for (i = 0; i < ks.length; i++) if (obj(h[ks[i]]) && !!nm && normNama(h[ks[i]].nama) === nm) return h[ks[i]];
        return null;
      };
      return Promise.all(selesai.map(function (r) {
        return ctx.db.ref(CFG.path.rapatHadir + '/' + r.__key).once('value').then(function (h) { return { r: r, h: h.val() || {}, gagal: false }; }, function () { return { r: r, h: null, gagal: true }; });
      })).then(function (hs) {
        var gagal = hs.filter(function (x) { return x.gagal; }).length;
        if (gagal === hs.length) return { ok: false, alasan: 'Rapat: data kehadiran (' + CFG.path.rapatHadir + ') tidak dapat dibaca. Periksa izin baca di Firebase Rules.' };
        var c = { hadir: 0, daring: 0, izin: 0, sakit: 0, dl: 0, alpha: 0 }, tanpa = 0, pimpin = 0, absen = [];
        hs.forEach(function (x) {
          if (x.gagal) return;
          var r = x.r, rec = cari(x.h);
          if ((r.pimpinanId && r.pimpinanId === kk) || (!!nm && normNama(r.pimpinan) === nm)) pimpin++;
          if (!rec || !(rec.status in c)) { tanpa++; return; }
          c[rec.status]++;
          if (rec.status !== 'hadir' && rec.status !== 'daring') absen.push(r.tanggal + ' ' + String(r.judul || 'Rapat').slice(0, 40) + ' (' + rec.status + ')');
        });
        var ikut = c.hadir + c.daring, pembagi = ikut + c.izin + c.sakit + c.alpha, p = pct(ikut, pembagi), A = CFG.ambang;
        var tercatat = ikut + c.izin + c.sakit + c.dl + c.alpha;
        if (!tercatat) return { ok: false, alasan: 'Rapat: ' + selesai.length + ' rapat sudah ditutup pada rentang ini, tetapi tidak ada catatan kehadiran atas nama guru ini (kunci ' + kk + (ctx.guruNama ? ', nama ' + ctx.guruNama : '') + ').' };
        var saran = pembagi >= 3 ? (p >= A.hadirBaik ? 2 : (p >= A.hadirCukup ? 1 : 0)) : null;
        var rincian = ['Rentang: ' + ctx.dari + ' s.d. ' + batas, 'Sumber data: ' + CFG.path.rapat + ' + ' + CFG.path.rapatHadir + ' (hanya rapat berstatus selesai)',
          'Rapat ditutup: ' + selesai.length + (belum ? '; belum ditutup (tidak dihitung): ' + belum : '') + '; tanpa catatan atas nama guru ini: ' + tanpa,
          'Hadir ' + c.hadir + ', hadir daring ' + c.daring + ', izin ' + c.izin + ', sakit ' + c.sakit + ', dinas luar ' + c.dl + ', alpa ' + c.alpha];
        if (pimpin) rincian.push('Memimpin rapat: ' + pimpin + ' kali');
        if (absen.length) rincian.push('Berhalangan: ' + absen.slice(0, 4).join('; ') + (absen.length > 4 ? '; dst' : ''));
        if (gagal) rincian.push('Peringatan: ' + gagal + ' rapat gagal dibaca dan tidak dihitung.');
        if (saran == null) rincian.push('Belum ada usulan skor: rapat yang dihitung kurang dari 3, terlalu sedikit untuk persentase.');
        return {
          ok: true, path: CFG.path.rapat + ' + ' + CFG.path.rapatHadir, saran: saran,
          dasar: 'Kehadiran rapat (dinas luar tidak dihitung) ≥' + A.hadirBaik + '% → 2; ' + A.hadirCukup + '–' + (A.hadirBaik - 0.1) + '% → 1; di bawahnya → 0; minimal 3 rapat. Kehadiran tidak menilai kualitas peran dan sumbangan pikiran di rapat (penilai).',
          ringkas: selesai.length + ' rapat ditutup: hadir ' + ikut + (c.daring ? ' (daring ' + c.daring + ')' : '') + ', izin ' + c.izin + ', sakit ' + c.sakit + ', dinas luar ' + c.dl + ', alpa ' + c.alpha + (pembagi ? ' (' + f1(p) + '% kehadiran)' : '') + (pimpin ? '; memimpin ' + pimpin : ''),
          rincian: rincian, angka: { rapat: selesai.length, hadir: ikut, izin: c.izin, sakit: c.sakit, dl: c.dl, alpa: c.alpha, persen: p, memimpin: pimpin }
        };
      });
    });
  }

  // ---------- registrasi sumber ----------
  // indikator: daftar EKSPLISIT indikator ("komponen_urut") yang benar-benar bisa dibuktikan sumber ini. Sebelum v20 dicocokkan lewat
  // regex pada teks bukti instrumen, sehingga mis. "daftar hadir guru" (bukti pendamping 9.1-9.5) ikut memberi usulan skor untuk
  // perilaku santun/teladan, dan kelengkapan input nilai memberi usulan untuk 11.1 (adil). Indikator di luar daftar = tanpa usulan.
  var DAFTAR = {
    absensi: { label: 'Absensi guru', ikon: '🕘', indikator: ['10_1', '10_3', '10_4'], ambil: ambilAbsensi },
    jurnal: { label: 'Jurnal mengajar', ikon: '📓', indikator: ['14_2'], ambil: ambilJurnal },
    nilai: { label: 'Nilai siswa', ikon: '📊', indikator: ['5_1', '7_1', '7_2', '7_3'], ambil: ambilNilai },
    perangkat: { label: 'Perangkat pembelajaran & modul ajar', ikon: '📚', indikator: ['3_1', '3_2', '3_3', '3_4', '7_1', '13_2'], ambil: ambilPerangkat },
    buku: { label: 'Buku Penghubung (komunikasi dengan orang tua)', ikon: '💬', indikator: ['12_1'], ambil: ambilBuku },
    kegiatan: { label: 'Kegiatan madrasah (rapat, lembur, ujian)', ikon: '🗓️', indikator: ['12_2'], ambil: ambilKegiatan },
    rapat: { label: 'Kehadiran rapat madrasah', ikon: '📋', indikator: ['12_2'], ambil: ambilRapat },
    tik: { label: 'Materi belajar & tugas daring (pemanfaatan TIK)', ikon: '💻', indikator: ['14_6'], ambil: ambilTik },
    tugasadm: { label: 'Tugas administratif & tugas tambahan (jurnal, nilai, petugas shalat)', ikon: '🗂️', indikator: ['10_5'], ambil: ambilTugasAdm },
    diri: { label: 'Penilaian diri guru', ikon: '📝', indikator: ['14_1'], ambil: ambilDiri }
  };
  var URUT = ['absensi', 'jurnal', 'nilai', 'perangkat', 'buku', 'kegiatan', 'rapat', 'tik', 'tugasadm', 'diri'];        // absensi dulu: hasilnya dipakai sebagai pembagi jurnal

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

  window.PKG_SUMBER = { versi: 13, cfg: CFG, daftar: DAFTAR, urut: URUT, jalankan: jalankan };
})();
