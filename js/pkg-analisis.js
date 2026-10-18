/* ============================================================
   SI MAMBA - js/pkg-analisis.js  (v1)
   Tab "📊 Analisis" pada menu PKG Guru (hanya Admin / Kepala Madrasah):
     1. Dasbor sekolah  : progres penilaian, progres per penilai, rata-rata per kompetensi, indikator terlemah
     2. Rencana Tindak Lanjut (RTL) : daftar indikator skor 0/1 per guru, bisa dicetak (satu guru / semua guru)
     3. Perbandingan antar periode  : naik/turun nilai tiap guru dan tiap komponen
     4. Ekspor Excel   : Rekap, Indikator, Indikator Terlemah, Perbandingan (bila sudah dimuat)

   WAJIB dimuat SESUDAH js/pkg.js (memakai window.__pkgCtx dan window.pkgRender dari pkg.js v10).
   TIDAK ada node Firebase baru dan TIDAK memakai Cloud Storage. Satu-satunya bacaan tambahan:
   pkg_v4_nilai/{periodePembanding} (sekali, saat tombol "Bandingkan" ditekan).
   Catatan: hitungan hanya memakai guru dengan penilaian LENGKAP (semua indikator terisi).
   Teks tindak lanjut pada RTL adalah kerangka dari skor; penilai/Kepala tetap melengkapinya secara manual.
============================================================ */
(function () {
  'use strict';
  if (window.PKG_ANALISIS) return;

  var A = { bandingPilih: '', banding: null, bandingKe: '', rtlGuru: '', memuat: false };
  var WARNA = { s0: '#b91c1c', s1: '#d97706', s2: '#15803d' };
  var URUT_STATUS = ['belum', 'draft', 'diajukan', 'disetujui', 'keberatan', 'ditetapkan'];

  function C() { return typeof window.__pkgCtx === 'function' ? window.__pkgCtx() : null; }
  function potong(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function r1(x) { return Math.round(x * 10) / 10; }

  // ---------- data ----------
  function barisDari(c, nilaiMap, tugasMap) {
    return c.guruAktif().map(function (g) {
      var n = nilaiMap ? nilaiMap[g.key] : null, skor = (n && n.skor) || {};
      var h = Object.keys(skor).length ? c.hitung(skor) : null;
      return { g: g, n: n, st: c.statusDari(n), t: tugasMap ? tugasMap[g.key] : null, h: h, lengkap: !!(h && h.lengkap), skor: skor };
    });
  }
  function agregat(c, rows) {
    var P = c.P, lk = rows.filter(function (r) { return r.lengkap; }), ind = [], komp = [];
    P.komponen.forEach(function (k, ki) {
      var jum = 0; lk.forEach(function (r) { jum += r.h.komponen[ki].persen; });
      komp.push({ k: k, ki: ki, persen: lk.length ? jum / lk.length : null });
      k.indikator.forEach(function (x, i) {
        var key = k.no + '_' + (i + 1), cnt = [0, 0, 0];
        lk.forEach(function (r) { var v = r.skor[key]; if (v === 0 || v === 1 || v === 2) cnt[v]++; });
        var n = cnt[0] + cnt[1] + cnt[2];
        ind.push({ key: key, label: k.no + '.' + (i + 1), t: x.t, k: k, cnt: cnt, n: n, pct: n ? (cnt[1] + 2 * cnt[2]) / (2 * n) * 100 : null });
      });
    });
    return { lk: lk, ind: ind, komp: komp };
  }
  function terlemah(ag, n) {
    return ag.ind.filter(function (x) { return x.n > 0 && (x.cnt[0] + x.cnt[1]) > 0; }).sort(function (a, b) {
      return (a.pct - b.pct) || ((b.cnt[0] + b.cnt[1]) - (a.cnt[0] + a.cnt[1]));
    }).slice(0, n);
  }
  function dataSaatIni(c) { return barisDari(c, c.S.nilai, c.S.tugas); }

  // ---------- tampilan ----------
  function bar(pct, warna) {
    return '<div style="height:10px;border-radius:6px;background:#e5e7eb;overflow:hidden"><span style="display:block;height:100%;width:' + Math.max(0, Math.min(100, pct || 0)) + '%;background:' + warna + '"></span></div>';
  }
  function barTiga(cnt, n) {
    if (!n) return '';
    return '<div style="display:flex;height:10px;border-radius:6px;overflow:hidden;background:#e5e7eb">' +
      [0, 1, 2].map(function (s) { return '<span style="display:block;height:100%;width:' + (cnt[s] / n * 100) + '%;background:' + WARNA['s' + s] + '"></span>'; }).join('') + '</div>';
  }
  function kartu(judul, isi, catatan) {
    return '<div class="card" style="margin-bottom:12px"><h4 style="margin:0 0 8px">' + judul + '</h4>' + isi +
      (catatan ? '<div class="text-muted" style="font-size:11px;margin-top:6px">' + catatan + '</div>' : '') + '</div>';
  }

  function htmlDasbor(c, rows, ag) {
    var esc = c.esc, f1 = c.f1, total = rows.length, h = '';
    var cnt = {}; URUT_STATUS.forEach(function (s) { cnt[s] = 0; });
    rows.forEach(function (r) { cnt[r.st] = (cnt[r.st] || 0) + 1; });
    var final = cnt.disetujui + cnt.ditetapkan;
    h += '<div class="pkg-grid">' + c.stat(total, 'Jumlah guru') + c.stat(final + ' / ' + total, 'Sudah disetujui / ditetapkan') +
      c.stat(ag.lk.length, 'Penilaian lengkap') + c.stat(cnt.keberatan, 'Guru keberatan') + '</div>';

    h += kartu('Progres penilaian', URUT_STATUS.map(function (s) {
      var pct = total ? cnt[s] / total * 100 : 0;
      return '<div style="display:flex;gap:8px;align-items:center;margin:5px 0;font-size:13px"><span style="width:150px">' + esc(c.STATUS_LABEL[s] || s) + '</span><div style="flex:1">' + bar(pct, c.STATUS_WARNA[s] || '#6b7280') + '</div><b style="width:28px;text-align:right">' + cnt[s] + '</b></div>';
    }).join(''));

    var per = {};
    rows.forEach(function (r) {
      var kunci = r.t ? r.t.penilaiKey : '_none';
      var p = per[kunci] || (per[kunci] = { nama: r.t ? (r.t.penilaiNama || c.namaGuru(r.t.penilaiKey)) : 'Belum ditugaskan', tot: 0, sel: 0, belum: 0 });
      p.tot++; if (r.st === 'belum') p.belum++; if (r.st === 'disetujui' || r.st === 'ditetapkan') p.sel++;
    });
    var pk = Object.keys(per).sort(function (a, b) { return per[a].nama.localeCompare(per[b].nama); });
    h += kartu('Progres per penilai', '<div style="overflow-x:auto"><table class="table" style="width:100%;font-size:13px"><thead><tr><th style="text-align:left">Penilai</th><th>Guru dinilai</th><th>Belum mulai</th><th>Selesai</th></tr></thead><tbody>' +
      pk.map(function (k) { var p = per[k]; return '<tr><td>' + esc(p.nama) + '</td><td style="text-align:center">' + p.tot + '</td><td style="text-align:center">' + p.belum + '</td><td style="text-align:center">' + p.sel + '</td></tr>'; }).join('') + '</tbody></table></div>');

    if (!ag.lk.length) return h + kartu('Nilai per komponen & indikator terlemah', '<p class="text-muted">Belum ada guru dengan penilaian lengkap.</p>');

    h += kartu('Rata-rata pencapaian per komponen', ag.komp.map(function (x) {
      var warna = x.persen >= 75 ? '#15803d' : (x.persen >= 50 ? '#d97706' : '#b91c1c');
      return '<div style="display:flex;gap:8px;align-items:center;margin:5px 0;font-size:12px"><span style="flex:0 0 46%">' + x.k.no + '. ' + esc(x.k.nama) + '</span><div style="flex:1">' + bar(x.persen, warna) + '</div><b style="width:46px;text-align:right">' + f1(x.persen) + '%</b></div>';
    }).join(''), 'Persen = jumlah skor indikator / skor maksimal komponen, dirata-rata dari ' + ag.lk.length + ' guru berpenilaian lengkap.');

    var lemah10 = terlemah(ag, 10);
    h += kartu('Indikator terlemah se-madrasah (maks. 10)', (lemah10.length ? '' : '<p class="text-muted">Semua indikator bernilai 2 pada guru yang sudah dinilai lengkap.</p>') + lemah10.map(function (x) {
      return '<div style="margin:8px 0;font-size:13px"><div><b>' + x.label + '</b> ' + esc(potong(x.t, 150)) + '</div>' + barTiga(x.cnt, x.n) +
        '<div class="text-muted" style="font-size:11px">Skor 0: ' + x.cnt[0] + ' · skor 1: ' + x.cnt[1] + ' · skor 2: ' + x.cnt[2] + ' guru (rata-rata ' + f1(x.pct) + '%)</div></div>';
    }).join('') + '<div class="text-muted" style="font-size:11px">Merah = skor 0, kuning = skor 1, hijau = skor 2. Cocok jadi bahan tema pelatihan / KKG internal.</div>');
    return h;
  }

  // ---------- RTL ----------
  function itemRtl(c, r) {
    var out = [];
    c.P.komponen.forEach(function (k) {
      k.indikator.forEach(function (x, i) {
        var key = k.no + '_' + (i + 1), v = r.skor[key];
        if (v !== 0 && v !== 1) return;
        out.push({ k: k, label: k.no + '.' + (i + 1), t: x.t, v: v, cat: (r.n && r.n.catatan && r.n.catatan[key]) || '', b: (x.b || []).slice(0, 2) });
      });
    });
    return out;
  }
  function tindak(it) {
    var b = it.b.length ? ' Contoh bukti: ' + it.b.join('; ') + '.' : '';
    return it.v === 0 ? 'Belum terpenuhi. Prioritas utama: pendampingan penilai/sejawat dan penyusunan bukti.' + b
      : 'Terpenuhi sebagian. Lengkapi bagian yang masih kurang.' + b;
  }
  function htmlRtl(c, rows) {
    var esc = c.esc, lk = rows.filter(function (r) { return r.lengkap; });
    if (!lk.length) return kartu('Rencana Tindak Lanjut (RTL)', '<p class="text-muted">Belum ada guru dengan penilaian lengkap.</p>');
    if (!A.rtlGuru || !lk.some(function (r) { return r.g.key === A.rtlGuru; })) A.rtlGuru = lk[0].g.key;
    var sel = '<select class="field" data-pa-sel="rtl" style="min-width:220px">' + lk.map(function (r) {
      return '<option value="' + esc(r.g.key) + '"' + (r.g.key === A.rtlGuru ? ' selected' : '') + '>' + esc(r.g.name) + '</option>';
    }).join('') + '</select>';
    var cur = lk.filter(function (r) { return r.g.key === A.rtlGuru; })[0], its = itemRtl(c, cur);
    var pre = its.length ? '<div style="font-size:13px;margin-top:8px"><b>' + its.length + ' indikator</b> perlu tindak lanjut (' + its.filter(function (x) { return x.v === 0; }).length + ' skor 0, ' + its.filter(function (x) { return x.v === 1; }).length + ' skor 1):' +
      '<ul style="margin:4px 0 0 18px">' + its.slice(0, 6).map(function (x) { return '<li><b>' + x.label + '</b> ' + esc(potong(x.t, 110)) + ' <i>(skor ' + x.v + ')</i></li>'; }).join('') + (its.length > 6 ? '<li class="text-muted">… dan ' + (its.length - 6) + ' lainnya (lihat cetakan)</li>' : '') + '</ul></div>'
      : '<p style="font-size:13px;margin-top:8px">Seluruh indikator guru ini bernilai 2. Tidak ada tindak lanjut.</p>';
    return kartu('Rencana Tindak Lanjut (RTL)', '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + sel +
      '<button type="button" class="btn btn-success" data-pa="rtl-cetak">🖨️ Cetak RTL guru ini</button>' +
      '<button type="button" class="btn btn-soft" data-pa="rtl-semua">🖨️ Cetak RTL semua guru</button></div>' + pre,
      'RTL disusun dari skor 0 dan 1 serta catatan penilai. Kolom target, waktu, dan penanggung jawab diisi bersama pada cetakan.');
  }
  function rtlDokumen(c, r, per) {
    var esc = c.esc, its = itemRtl(c, r), h = r.h;
    var o = '<h3>RENCANA TINDAK LANJUT<br>PENILAIAN KINERJA GURU<br>' + esc(per.nama || '') + '</h3>' +
      '<table><tr><td style="width:22%">Nama Guru</td><td>' + esc(r.g.name) + '</td></tr><tr><td>Penilai</td><td>' + esc(r.t ? (r.t.penilaiNama || c.namaGuru(r.t.penilaiKey)) : '-') + '</td></tr>' +
      '<tr><td>Hasil PKG</td><td>Jumlah ' + h.jumlah + ' / ' + h.tertinggi + ' · Nilai ' + c.f1(h.nilai100) + ' · ' + esc(h.sebutan) + '</td></tr></table>';
    if (!its.length) return o + '<p>Seluruh indikator bernilai 2. Tidak ada indikator yang memerlukan tindak lanjut.</p>';
    o += '<table><thead><tr><th style="width:5%">No</th><th style="width:30%">Indikator</th><th style="width:5%">Skor</th><th style="width:25%">Catatan penilai &amp; tindak lanjut</th><th style="width:12%">Target</th><th style="width:12%">Waktu</th><th>PJ</th></tr></thead><tbody>';
    its.forEach(function (x, i) {
      o += '<tr style="page-break-inside:avoid"><td style="text-align:center">' + (i + 1) + '</td><td><b>' + x.label + '</b> ' + esc(x.t) + '</td><td style="text-align:center">' + x.v + '</td><td>' +
        (x.cat ? '<i>' + esc(x.cat) + '</i><br>' : '') + esc(tindak(x)) + '</td><td></td><td></td><td></td></tr>';
    });
    return o + '</tbody></table>';
  }
  function cetakRtl(semua) {
    var c = C(); if (!c || !c.bolehKelola()) return;
    var rows = dataSaatIni(c).filter(function (r) { return r.lengkap; }), per = c.S.periodeList[c.S.periodeId] || {};
    if (!semua && rows.length && !rows.some(function (r) { return r.g.key === A.rtlGuru; })) A.rtlGuru = rows[0].g.key;
    var pilih = semua ? rows : rows.filter(function (r) { return r.g.key === A.rtlGuru; });
    if (!pilih.length) return c.pesan('Tidak ada guru berpenilaian lengkap.', true);
    var isi = pilih.map(function (r, i) {
      return '<div' + (i < pilih.length - 1 ? ' style="page-break-after:always"' : '') + '>' + rtlDokumen(c, r, per) +
        '<div class="ttd"><div>Guru yang dinilai<div style="min-height:20mm"></div>(' + c.esc(r.g.name) + ')</div><div>Penilai<div style="min-height:20mm"></div>(' + c.esc(r.t ? (r.t.penilaiNama || c.namaGuru(r.t.penilaiKey)) : '................') + ')</div>' +
        c.blokKepalaCetak(true, 'RTL PKG', 'RTL ' + (per.nama || '') + ' | ' + r.g.name) + '</div></div>';
    }).join('');
    c.bukaCetak(semua ? 'RTL PKG - semua guru' : 'RTL PKG - ' + pilih[0].g.name, isi);
  }


  // ---------- cetak dasbor & perbandingan ----------
  function cetakDasbor() {
    var c = C(); if (!c || !c.bolehKelola()) return;
    var esc = c.esc, f1 = c.f1, rows = dataSaatIni(c), ag = agregat(c, rows), per = c.S.periodeList[c.S.periodeId] || {}, total = rows.length;
    var cnt = {}; URUT_STATUS.forEach(function (s) { cnt[s] = 0; }); rows.forEach(function (r) { cnt[r.st] = (cnt[r.st] || 0) + 1; });
    var o = '<h3 style="text-align:center;margin:0 0 6px">REKAP ANALISIS PKG GURU</h3><p style="text-align:center;margin:0 0 10px">Periode: ' + esc(per.nama || '') + '</p>';
    o += '<h4 style="margin:10px 0 2px">1. Progres penilaian (' + total + ' guru)</h4><table><thead><tr><th>Status</th><th style="width:70px">Jumlah</th></tr></thead><tbody>' +
      URUT_STATUS.map(function (s) { return '<tr><td>' + esc(c.STATUS_LABEL[s] || s) + '</td><td style="text-align:center">' + cnt[s] + '</td></tr>'; }).join('') + '</tbody></table>';
    var pr = {}; rows.forEach(function (r) {
      var k = r.t ? r.t.penilaiKey : '_none', p = pr[k] || (pr[k] = { nama: r.t ? (r.t.penilaiNama || c.namaGuru(r.t.penilaiKey)) : 'Belum ditugaskan', tot: 0, sel: 0, belum: 0 });
      p.tot++; if (r.st === 'belum') p.belum++; if (r.st === 'disetujui' || r.st === 'ditetapkan') p.sel++;
    });
    o += '<h4 style="margin:12px 0 2px">2. Progres per penilai</h4><table><thead><tr><th>Penilai</th><th>Guru dinilai</th><th>Belum mulai</th><th>Selesai</th></tr></thead><tbody>' +
      Object.keys(pr).sort(function (a, b) { return pr[a].nama.localeCompare(pr[b].nama); }).map(function (k) { var p = pr[k]; return '<tr><td>' + esc(p.nama) + '</td><td style="text-align:center">' + p.tot + '</td><td style="text-align:center">' + p.belum + '</td><td style="text-align:center">' + p.sel + '</td></tr>'; }).join('') + '</tbody></table>';
    if (ag.lk.length) {
      o += '<h4 style="margin:12px 0 2px">3. Rata-rata pencapaian per komponen (' + ag.lk.length + ' guru berpenilaian lengkap)</h4><table><thead><tr><th>Komponen</th><th style="width:80px">Rata-rata</th></tr></thead><tbody>' +
        ag.komp.map(function (x) { return '<tr><td>' + x.k.no + '. ' + esc(x.k.nama) + '</td><td style="text-align:center">' + f1(x.persen) + '%</td></tr>'; }).join('') + '</tbody></table>';
      o += '<h4 style="margin:12px 0 2px">4. Indikator terlemah se-madrasah</h4><table><thead><tr><th style="width:44px">No</th><th>Indikator</th><th style="width:36px">Skor 0</th><th style="width:36px">Skor 1</th><th style="width:36px">Skor 2</th><th style="width:52px">Rata-rata</th></tr></thead><tbody>' +
        terlemah(ag, 10).map(function (x) { return '<tr style="page-break-inside:avoid"><td>' + x.label + '</td><td>' + esc(x.t) + '</td><td style="text-align:center">' + x.cnt[0] + '</td><td style="text-align:center">' + x.cnt[1] + '</td><td style="text-align:center">' + x.cnt[2] + '</td><td style="text-align:center">' + f1(x.pct) + '%</td></tr>'; }).join('') + '</tbody></table>';
    } else o += '<p>Belum ada guru dengan penilaian lengkap.</p>';
    o += '<div class="ttd"><div></div><div></div>' + c.blokKepalaCetak(true, 'Analisis PKG', 'Analisis ' + (per.nama || '')) + '</div>';
    c.bukaCetak('Analisis PKG - ' + (per.nama || ''), o);
  }
  function cetakBanding() {
    var c = C(); if (!c || !c.bolehKelola()) return;
    if (!A.banding) return c.pesan('Tekan Bandingkan dulu agar data periode pembanding dimuat.', true);
    var esc = c.esc, f1 = c.f1, rows = dataSaatIni(c), lama = barisDari(c, A.banding.nilai, null), agL = agregat(c, lama), agB = agregat(c, rows);
    var per = c.S.periodeList[c.S.periodeId] || {}, namaLama = (c.S.periodeList[A.banding.id] || {}).nama || A.banding.id, mp = {};
    lama.forEach(function (r) { mp[r.g.key] = r; });
    var tr = '';
    rows.forEach(function (r) {
      var ol = mp[r.g.key], a = (ol && ol.lengkap) ? ol.h.nilai100 : null, b = r.lengkap ? r.h.nilai100 : null;
      if (a == null && b == null) return;
      var d = (a != null && b != null) ? r1(b - a) : null;
      tr += '<tr><td>' + esc(r.g.name) + '</td><td style="text-align:center">' + (a != null ? f1(a) : '-') + '</td><td style="text-align:center">' + (b != null ? f1(b) : '-') + '</td><td style="text-align:center">' + (d == null ? '-' : (d > 0 ? '+' : '') + f1(d)) + '</td></tr>';
    });
    var o = '<h3 style="text-align:center;margin:0 0 6px">PERBANDINGAN PKG ANTAR PERIODE</h3><p style="text-align:center;margin:0 0 10px">' + esc(namaLama) + ' &rarr; ' + esc(per.nama || '') + '</p>' +
      '<h4 style="margin:10px 0 2px">Nilai PKG per guru (skala 100)</h4><table><thead><tr><th>Guru</th><th style="width:90px">' + esc(potong(namaLama, 18)) + '</th><th style="width:90px">Periode ini</th><th style="width:70px">Selisih</th></tr></thead><tbody>' + (tr || '<tr><td colspan="4">Tidak ada guru berpenilaian lengkap di kedua periode.</td></tr>') + '</tbody></table>' +
      '<h4 style="margin:12px 0 2px">Rata-rata pencapaian per komponen</h4><table><thead><tr><th>Komponen</th><th style="width:80px">Sebelum</th><th style="width:80px">Sekarang</th><th style="width:70px">Selisih</th></tr></thead><tbody>' +
      agB.komp.map(function (x, i) { var a = agL.komp[i].persen, b = x.persen, d = (a != null && b != null) ? r1(b - a) : null; return '<tr><td>' + x.k.no + '. ' + esc(x.k.nama) + '</td><td style="text-align:center">' + (a != null ? f1(a) + '%' : '-') + '</td><td style="text-align:center">' + (b != null ? f1(b) + '%' : '-') + '</td><td style="text-align:center">' + (d == null ? '-' : (d > 0 ? '+' : '') + f1(d)) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p style="font-size:11px">Hanya guru berpenilaian lengkap di periode bersangkutan yang dihitung. Selisih = periode ini dikurangi periode pembanding.</p>' +
      '<div class="ttd"><div></div><div></div>' + c.blokKepalaCetak(true, 'Perbandingan PKG', 'Banding ' + namaLama + ' ke ' + (per.nama || '')) + '</div>';
    c.bukaCetak('Perbandingan PKG', o);
  }

  // ---------- perbandingan periode ----------
  function htmlBanding(c, rows) {
    var esc = c.esc, f1 = c.f1, ids = Object.keys(c.S.periodeList).filter(function (id) { return id !== c.S.periodeId; }).sort();
    if (A.bandingKe !== c.S.periodeId) { A.banding = null; A.bandingKe = c.S.periodeId; }
    if (!ids.length) return kartu('Perbandingan antar periode', '<p class="text-muted">Belum ada periode lain untuk dibandingkan. Buat periode baru di tab Pengaturan.</p>');
    if (!A.bandingPilih || ids.indexOf(A.bandingPilih) < 0) A.bandingPilih = ids[ids.length - 1];
    var h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span style="font-size:13px">Bandingkan periode ini dengan:</span><select class="field" data-pa-sel="banding" style="min-width:200px">' +
      ids.map(function (id) { return '<option value="' + esc(id) + '"' + (id === A.bandingPilih ? ' selected' : '') + '>' + esc(c.S.periodeList[id].nama || id) + '</option>'; }).join('') +
      '</select><button type="button" class="btn btn-success" data-pa="banding-muat"' + (A.memuat ? ' disabled' : '') + '>' + (A.memuat ? 'Memuat…' : '🔄 Bandingkan') + '</button></div>';
    if (!A.banding) return kartu('Perbandingan antar periode', h + '<p class="text-muted" style="margin-top:8px">Pilih periode lalu tekan Bandingkan. Data periode itu dibaca sekali saja.</p>');
    var lama = barisDari(c, A.banding.nilai, null), agL = agregat(c, lama), agB = agregat(c, rows);
    var namaLama = (c.S.periodeList[A.banding.id] || {}).nama || A.banding.id;
    var mapLama = {}; lama.forEach(function (r) { mapLama[r.g.key] = r; });
    var naik = 0, turun = 0, tetap = 0, tr = '';
    rows.forEach(function (r) {
      var o = mapLama[r.g.key], a = (o && o.lengkap) ? o.h.nilai100 : null, b = r.lengkap ? r.h.nilai100 : null;
      if (a == null && b == null) return;
      var d = (a != null && b != null) ? r1(b - a) : null;
      if (d != null) { if (d > 0) naik++; else if (d < 0) turun++; else tetap++; }
      tr += '<tr><td>' + esc(r.g.name) + '</td><td style="text-align:center">' + (a != null ? f1(a) : '-') + '</td><td style="text-align:center">' + (b != null ? f1(b) : '-') + '</td><td style="text-align:center;font-weight:700;color:' + (d == null ? '#6b7280' : (d > 0 ? '#15803d' : (d < 0 ? '#b91c1c' : '#6b7280'))) + '">' + (d == null ? '-' : (d > 0 ? '▲ +' : (d < 0 ? '▼ ' : '= ')) + f1(d)) + '</td></tr>';
    });
    h += '<div style="margin-top:8px"><button type="button" class="btn btn-soft" data-pa="banding-cetak">🖨️ Cetak perbandingan</button></div>';
    h += '<div class="pkg-grid" style="margin-top:10px">' + c.stat(naik, 'Guru naik') + c.stat(turun, 'Guru turun') + c.stat(tetap, 'Tetap') + '</div>';
    h += '<div style="overflow-x:auto"><table class="table" style="width:100%;font-size:13px"><thead><tr><th style="text-align:left">Guru</th><th>' + esc(potong(namaLama, 24)) + '</th><th>Periode ini</th><th>Selisih</th></tr></thead><tbody>' + (tr || '<tr><td colspan="4" class="text-muted">Tidak ada guru berpenilaian lengkap di kedua periode.</td></tr>') + '</tbody></table></div>';
    h += '<h5 style="margin:12px 0 6px">Per komponen (rata-rata pencapaian)</h5>' + agB.komp.map(function (x, i) {
      var a = agL.komp[i].persen, b = x.persen, d = (a != null && b != null) ? r1(b - a) : null;
      return '<div style="display:flex;gap:8px;align-items:center;margin:4px 0;font-size:12px"><span style="flex:0 0 46%">' + x.k.no + '. ' + esc(x.k.nama) + '</span><span style="flex:1;text-align:right">' + (a != null ? f1(a) + '%' : '-') + ' → ' + (b != null ? f1(b) + '%' : '-') + '</span><b style="width:70px;text-align:right;color:' + (d == null ? '#6b7280' : (d > 0 ? '#15803d' : (d < 0 ? '#b91c1c' : '#6b7280'))) + '">' + (d == null ? '' : (d > 0 ? '▲ +' : (d < 0 ? '▼ ' : '= ')) + f1(d)) + '</b></div>';
    }).join('');
    return kartu('Perbandingan antar periode', h, 'Hanya guru berpenilaian lengkap di periode bersangkutan yang dihitung. Selisih = nilai periode ini − periode pembanding.');
  }
  function muatBanding() {
    var c = C(); if (!c || !c.bolehKelola() || A.memuat) return;
    var id = A.bandingPilih; if (!id) return;
    A.memuat = true; c.render();
    var batal = setTimeout(function () { if (A.memuat) { A.memuat = false; c.render(); c.pesan('Koneksi lambat. Coba lagi.', true); } }, 20000);
    (c.siapSesi ? c.siapSesi() : Promise.resolve()).then(function () { return c.db.ref(c.N.nilai + '/' + id).once('value'); }).then(function (s) {
      clearTimeout(batal);
      if (!A.memuat) return;
      A.banding = { id: id, nilai: s.val() || {} }; A.bandingKe = c.S.periodeId; A.memuat = false; c.render();
    }).catch(function (e) { clearTimeout(batal); A.memuat = false; c.render(); c.pesan('Gagal memuat periode pembanding: ' + ((e && e.message) || e), true); });
  }

  // ---------- Excel ----------
  function susunSheet(c) {
    var P = c.P, rows = dataSaatIni(c), ag = agregat(c, rows), f1n = function (x) { return r1(x); };
    var head = ['No', 'Nama Guru', 'Penilai', 'Status'].concat(P.komponen.map(function (k) { return 'K' + k.no; }), ['Jumlah', 'Nilai', 'Sebutan']);
    var rekap = [head];
    rows.forEach(function (r, i) {
      var h = r.h;
      rekap.push([i + 1, r.g.name, r.t ? (r.t.penilaiNama || c.namaGuru(r.t.penilaiKey)) : '-', c.STATUS_LABEL[r.st] || r.st]
        .concat(P.komponen.map(function (k, ki) { return h && h.komponen[ki].terisi ? h.komponen[ki].nilai : ''; }),
          [h && h.lengkap ? h.jumlah : '', h && h.lengkap ? f1n(h.nilai100) : '', h && h.lengkap ? h.sebutan : '']));
    });
    var labels = []; P.komponen.forEach(function (k) { k.indikator.forEach(function (_, i) { labels.push({ key: k.no + '_' + (i + 1), label: k.no + '.' + (i + 1) }); }); });
    var indik = [['Nama Guru'].concat(labels.map(function (l) { return l.label; }))];
    rows.forEach(function (r) { if (!Object.keys(r.skor).length) return; indik.push([r.g.name].concat(labels.map(function (l) { var v = r.skor[l.key]; return (v === 0 || v === 1 || v === 2) ? v : ''; }))); });
    var lemah = [['Peringkat', 'Indikator', 'Uraian', 'Skor 0', 'Skor 1', 'Skor 2', 'Pencapaian %']];
    terlemah(ag, 20).forEach(function (x, i) { lemah.push([i + 1, x.label, x.t, x.cnt[0], x.cnt[1], x.cnt[2], f1n(x.pct)]); });
    var sheets = [['Rekap', rekap], ['Indikator', indik], ['Indikator Terlemah', lemah]];
    if (A.banding && A.bandingKe === c.S.periodeId) {
      var lama = barisDari(c, A.banding.nilai, null), mp = {}; lama.forEach(function (r) { mp[r.g.key] = r; });
      var namaLama = (c.S.periodeList[A.banding.id] || {}).nama || A.banding.id;
      var bd = [['Nama Guru', namaLama, 'Periode ini', 'Selisih']];
      rows.forEach(function (r) {
        var o = mp[r.g.key], a = (o && o.lengkap) ? f1n(o.h.nilai100) : '', b = r.lengkap ? f1n(r.h.nilai100) : '';
        if (a === '' && b === '') return; bd.push([r.g.name, a, b, (a !== '' && b !== '') ? f1n(b - a) : '']);
      });
      sheets.push(['Perbandingan', bd]);
    }
    return sheets;
  }
  function namaBerkas(c, ext) {
    var per = (c.S.periodeList[c.S.periodeId] || {}).nama || 'periode';
    return 'PKG_' + String(per).replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) + '.' + ext;
  }
  function unduhCsv(c, sheets) {
    var rekap = sheets[0][1], teks = rekap.map(function (b) { return b.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    var blob = new Blob(['\ufeff' + teks], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = namaBerkas(c, 'csv'); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    c.pesan('Library Excel tidak termuat, rekap diunduh sebagai CSV.', false);
  }
  function pastikanXlsx(cb) {
    if (window.XLSX && window.XLSX.utils) return cb(true);
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = function () { cb(!!(window.XLSX && window.XLSX.utils)); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  function unduhExcel() {
    var c = C(); if (!c || !c.bolehKelola()) return;
    if (!c.S.periodeId) return c.pesan('Belum ada periode PKG.', true);
    var sheets = susunSheet(c);
    pastikanXlsx(function (ok) {
      if (!ok) return unduhCsv(c, sheets);
      try {
        var wb = window.XLSX.utils.book_new();
        sheets.forEach(function (s) { window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(s[1]), s[0].slice(0, 31)); });
        window.XLSX.writeFile(wb, namaBerkas(c, 'xlsx'));
        if (typeof window.addLog === 'function') window.addLog('PKG ekspor Excel', (c.S.periodeList[c.S.periodeId] || {}).nama || '');
        c.pesan('Excel diunduh.');
      } catch (e) { c.pesan('Gagal membuat Excel: ' + ((e && e.message) || e), true); }
    });
  }

  // ---------- titik masuk dari pkg.js ----------
  function html() {
    var c = C(); if (!c) return '';
    if (!c.P || !c.S.periodeId) return '<div class="card"><p class="text-muted">Pilih / buat periode PKG terlebih dahulu.</p></div>';
    var rows = dataSaatIni(c), ag = agregat(c, rows);
    return '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><div class="text-muted" style="font-size:12px">Analisis periode: <b>' + c.esc((c.S.periodeList[c.S.periodeId] || {}).nama || '') + '</b></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn btn-soft" data-pa="dasbor-cetak">🖨️ Cetak dasbor</button><button type="button" class="btn btn-soft" data-pa="excel">⬇️ Unduh Excel</button></div></div>' +
      htmlDasbor(c, rows, ag) + htmlRtl(c, rows) + htmlBanding(c, rows);
  }

  document.addEventListener('change', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-pa-sel]') : null; if (!t || !t.closest('#page-pkg')) return;
    var j = t.getAttribute('data-pa-sel');
    if (j === 'rtl') A.rtlGuru = t.value; else if (j === 'banding') A.bandingPilih = t.value;
  });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-pa]') : null; if (!t || !t.closest('#page-pkg')) return;
    var a = t.getAttribute('data-pa');
    if (a === 'rtl-cetak') cetakRtl(false);
    else if (a === 'rtl-semua') cetakRtl(true);
    else if (a === 'dasbor-cetak') cetakDasbor();
    else if (a === 'banding-cetak') cetakBanding();
    else if (a === 'banding-muat') muatBanding();
    else if (a === 'excel') unduhExcel();
  });

  window.PKG_ANALISIS = { versi: 2, html: html };
})();
