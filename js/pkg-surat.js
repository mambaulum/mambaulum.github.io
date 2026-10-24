/* ============================================================
   SI MAMBA - js/pkg-surat.js  (v3: + Surat Pernyataan Guru indikator 8.1, tanda tangan guru; v2: + Berita Acara Mediasi Keberatan III.F.1.m)
   Cetak surat PKG, ditandatangani Kepala Madrasah dengan QR (ttd-digital.js):
     1. Surat Tugas Penilai            (per penilai; memakai SK penilai di pkg_v4_skpen)
     2. Surat Pemberitahuan Jadwal Pengamatan (per guru; memakai jadwal di pkg_v4_tugas)
     3. Berita Acara Pertemuan Pertama / Kedua (per guru; Juknis III.F.1.a dan g)
     4. Berita Acara Mediasi Keberatan (per guru; Juknis III.F.1.m)
     5. Surat Pernyataan Guru (per guru; indikator 8.1; ditandatangani guru, tanpa QR)
   Tidak ada data baru di Firebase dan tidak ada Rules baru: hanya membaca data PKG yang sudah dimuat
   dan mencetak. Hanya Admin / Kepala Madrasah (QR hanya terbit bila yang mencetak pimpinan).

   Dimuat SESUDAH js/pkg.js dan js/ttd-digital.js. pkg.js memanggil:
     PKG_SURAT.html()        -> kartu "Surat PKG" di tab Pengaturan
     PKG_SURAT.aksi(act, el) -> tombol dengan data-act berawalan "surat-"
   Konteks dari pkg.js lewat window.__pkgCtx().
============================================================ */
(function () {
  'use strict';

  function C() { return (typeof window.__pkgCtx === 'function') ? window.__pkgCtx() : null; }
  var titik = '................';

  function nilai(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function M() { return (typeof MADRASAH !== 'undefined' && MADRASAH) ? MADRASAH : {}; }

  function dataSurat(c) {
    var tg = nilai('pkgSrTgl') || c.skHariIni();
    return { nomor: nilai('pkgSrNomor'), tgl: tg, tempat: nilai('pkgSrTempat') || c.skTempatProfil(), jam: nilai('pkgSrJam'), ruang: nilai('pkgSrRuang') };
  }

  // Blok Kepala + QR. Penanda diganti QR oleh bukaCetak (TTD.isiHtml) bila yang mencetak Admin/Kepala.
  function blokKepala(c, d, jenis, ket, kiri) {
    var m = M(), nama = c.namaKepala() || titik;
    var qr = (window.TTD && typeof window.TTD.penanda === 'function') ? window.TTD.penanda('kepala', { jenis: jenis, ket: ket }, { hanyaPimpinan: true }) : '';
    return '<div style="' + (kiri ? '' : 'margin-left:52%;') + 'text-align:center;margin-top:18px;page-break-inside:avoid">' +
      (d.tempat ? c.esc(d.tempat) : titik) + ', ' + c.fmtTgl(d.tgl) + '<br>Kepala ' + c.esc(m.nama || 'Madrasah') + ',' +
      '<div style="min-height:24mm;display:flex;align-items:flex-end;justify-content:center">' + qr + '</div><b>' + c.esc(nama) + '</b>' +
      (m.nip_kepala_sekolah ? '<br>NIP. ' + c.esc(m.nip_kepala_sekolah) : '') + '</div>';
  }
  function guruInfo(c, key) {
    var g = c.guruAktif().filter(function (x) { return x.key === key; })[0];
    return { nama: c.tampil(c.namaGuru(key)), nip: g && g.nip ? g.nip : '' };
  }
  function periodeNama(c) { var p = c.S.periodeList[c.S.periodeId] || {}; return p.nama || ''; }
  function baris(c, a, b) {
    return '<tr><td style="border:0;padding:2px 4px;width:120px;vertical-align:top">' + a + '</td><td style="border:0;padding:2px 4px;width:10px;vertical-align:top">:</td><td style="border:0;padding:2px 4px">' + b + '</td></tr>';
  }
  function judul(t, nomor, c) {
    return '<div style="text-align:center;font-weight:700;font-size:14px;text-decoration:underline">' + t + '</div>' +
      '<div style="text-align:center;margin-bottom:12px">Nomor: ' + (nomor ? c.esc(nomor) : titik) + '</div>';
  }

  // ---------- 1. Surat Tugas Penilai ----------
  function suratTugas(c, pk) {
    var d = dataSurat(c), m = M(), pen = guruInfo(c, pk), sk = c.skPen(pk), gurus = [];
    Object.keys(c.S.tugas).forEach(function (gk) { var t = c.S.tugas[gk]; if (t && t.penilaiKey === pk) gurus.push(gk); });
    if (!gurus.length) return c.pesan('Penilai ini belum punya guru yang dinilai pada periode terpilih.', true);
    if ((!sk || !sk.nomor) && !confirm('SK penugasan penilai belum dicatat (kartu SK Penugasan Penilai). Nomor SK akan dicetak titik-titik. Tetap cetak?')) return;
    var mulai = ((c.S.periodeList[c.S.periodeId] || {}).mulai) || '', selesai = ((c.S.periodeList[c.S.periodeId] || {}).selesai) || '';
    var tabelKepala = '<table style="border:0">' + baris(c, 'Nama', c.esc(c.namaKepala() || titik)) + baris(c, 'NIP', c.esc(m.nip_kepala_sekolah || '-')) + baris(c, 'Jabatan', 'Kepala ' + c.esc(m.nama || 'Madrasah')) + '</table>';
    var tabelPenilai = '<table style="border:0">' + baris(c, 'Nama', c.esc(pen.nama)) + baris(c, 'NIP', c.esc(pen.nip || '-')) + baris(c, 'Jabatan', 'Penilai Kinerja Guru') + '</table>';
    var skTeks = sk && sk.nomor ? 'Nomor ' + c.esc(sk.nomor) + (sk.tanggal ? ' tanggal ' + c.fmtTgl(sk.tanggal) : '') + (sk.akhir ? ' (berlaku sampai dengan ' + c.fmtTgl(sk.akhir) + ')' : '') : 'Nomor ' + titik + ' tanggal ' + titik;
    var isi = judul('SURAT TUGAS', d.nomor, c) +
      '<p>Yang bertanda tangan di bawah ini:</p>' + tabelKepala +
      '<p style="text-align:justify">berdasarkan Surat Keputusan Kepala Kantor Kementerian Agama tentang Penetapan Penilai Kinerja Guru ' + skTeks + ', dengan ini menugaskan:</p>' + tabelPenilai +
      '<p>untuk melaksanakan Penilaian Kinerja Guru ' + c.esc(periodeNama(c)) + ' terhadap guru berikut:</p>' +
      '<table><thead><tr><th style="width:34px">No</th><th>Nama Guru</th><th>NIP</th><th>Jadwal Pengamatan</th></tr></thead><tbody>' +
      gurus.map(function (gk, i) { var g = guruInfo(c, gk), t = c.S.tugas[gk] || {}; return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + c.esc(g.nama) + '</td><td>' + c.esc(g.nip || '-') + '</td><td>' + (t.jadwal ? c.fmtTgl(t.jadwal) : '-') + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p style="text-align:justify">Penilaian meliputi pertemuan pertama, pengamatan pembelajaran, penilaian dokumen, wawancara, dan pertemuan kedua' + (mulai && selesai ? ', pada periode ' + c.fmtTgl(mulai) + ' sampai dengan ' + c.fmtTgl(selesai) : '') + '.</p>' +
      '<p>Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>' +
      blokKepala(c, d, 'Surat Tugas Penilai PKG', 'Surat Tugas Penilai PKG | ' + pen.nama + ' | ' + periodeNama(c) + ' | Nomor ' + (d.nomor || '-') + ' | ' + gurus.length + ' guru', false);
    c.bukaCetak('Surat Tugas Penilai - ' + pen.nama, isi);
  }

  // ---------- 2. Pemberitahuan Jadwal Pengamatan ----------
  function suratJadwal(c, gk) {
    var d = dataSurat(c), t = c.tugasDari(gk);
    if (!t || !t.penilaiKey) return c.pesan('Guru ini belum punya penilai. Atur di Penugasan Penilai.', true);
    if (!t.jadwal) return c.pesan('Jadwal pengamatan guru ini belum diisi di Penugasan Penilai.', true);
    var g = guruInfo(c, gk), pen = guruInfo(c, t.penilaiKey), hari = '';
    try { hari = new Date(t.jadwal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' }); } catch (e) { }
    var isi = '<table style="border:0">' + baris(c, 'Nomor', d.nomor ? c.esc(d.nomor) : titik) + baris(c, 'Lampiran', '-') + baris(c, 'Perihal', '<b>Pemberitahuan Jadwal Pengamatan Pembelajaran PKG</b>') + '</table>' +
      '<p style="margin-top:12px">Yth. Bapak/Ibu ' + c.esc(g.nama) + '<br>di tempat</p>' +
      '<p><i>Assalamu&rsquo;alaikum warahmatullahi wabarakatuh</i></p>' +
      '<p style="text-align:justify">Sehubungan dengan pelaksanaan Penilaian Kinerja Guru ' + c.esc(periodeNama(c)) + ', kami memberitahukan bahwa pengamatan pembelajaran Bapak/Ibu akan dilaksanakan oleh ' + c.esc(pen.nama) + ' pada:</p>' +
      '<table style="border:0">' + baris(c, 'Hari/tanggal', (hari ? c.esc(hari) + ', ' : '') + c.fmtTgl(t.jadwal)) + baris(c, 'Waktu', d.jam ? c.esc(d.jam) : titik) + baris(c, 'Kelas/mata pelajaran', titik) + baris(c, 'Tempat', d.ruang ? c.esc(d.ruang) : 'Ruang kelas yang bersangkutan') + '</table>' +
      '<p style="text-align:justify">Mohon Bapak/Ibu menyiapkan perangkat pembelajaran (modul ajar/RPP, silabus, dan bahan ajar) serta dokumen pendukung PKG lainnya. Apabila berhalangan pada jadwal tersebut, mohon disampaikan kepada penilai sebelum hari pelaksanaan.</p>' +
      '<p>Demikian pemberitahuan ini, atas perhatian dan kerja samanya kami ucapkan terima kasih.</p>' +
      '<p><i>Wassalamu&rsquo;alaikum warahmatullahi wabarakatuh</i></p>' +
      blokKepala(c, d, 'Pemberitahuan Jadwal Pengamatan PKG', 'Pemberitahuan Jadwal Pengamatan PKG | ' + g.nama + ' | ' + c.fmtTgl(t.jadwal) + ' | Nomor ' + (d.nomor || '-'), false) +
      '<p class="ket" style="margin-top:14px">Tembusan: ' + c.esc(pen.nama) + '; arsip.</p>';
    c.bukaCetak('Pemberitahuan Jadwal Pengamatan - ' + g.nama, isi);
  }

  // ---------- 3. Berita Acara Pertemuan Pertama / Kedua ----------
  function beritaAcara(c, gk, n) {
    var d = dataSurat(c), t = c.tugasDari(gk) || {};
    if (!t.penilaiKey) return c.pesan('Guru ini belum punya penilai. Atur di Penugasan Penilai.', true);
    var g = guruInfo(c, gk), pen = guruInfo(c, t.penilaiKey), m = M(), kali = n === 2 ? 'KEDUA' : 'PERTAMA';
    var hari = ''; try { hari = new Date(d.tgl + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' }); } catch (e) { }
    var kot = '&#9744; ';
    var agenda = n === 2 ?
      [kot + 'Penilai menyampaikan hasil penilaian dan umpan balik kepada guru', kot + 'Guru menyampaikan tanggapan dan refleksi: ' + titik + titik, kot + 'Disepakati rencana tindak lanjut dan pengembangan keprofesian berkelanjutan: ' + titik + titik, kot + 'Guru menyetujui hasil penilaian', kot + 'Guru mengajukan keberatan (dilanjutkan dengan mediasi dan dibuatkan berita acara tersendiri)'] :
      [kot + 'Penilai menjelaskan tujuan, instrumen, dan tahapan PKG', kot + 'Disepakati jadwal pengamatan pembelajaran: ' + titik, kot + 'Guru menyerahkan perangkat pembelajaran dan dokumen pendukung', kot + 'Catatan lain: ' + titik + titik];
    var isi = judul('BERITA ACARA PERTEMUAN ' + kali + '<br>PENILAIAN KINERJA GURU', d.nomor, c).replace('margin-bottom:12px', 'margin-bottom:12px;margin-top:2px') +
      '<p style="text-align:justify">Pada hari ini ' + (hari ? c.esc(hari) : titik) + ' tanggal ' + c.fmtTgl(d.tgl) + ', bertempat di ' + (d.ruang ? c.esc(d.ruang) : c.esc(m.nama || 'madrasah')) + ', telah dilaksanakan pertemuan ' + kali.toLowerCase() + ' Penilaian Kinerja Guru ' + c.esc(periodeNama(c)) + ' antara:</p>' +
      '<table style="border:0">' + baris(c, 'Penilai', c.esc(pen.nama)) + baris(c, 'Guru yang dinilai', c.esc(g.nama)) + baris(c, 'NIP guru', c.esc(g.nip || '-')) + (t.jadwal ? baris(c, 'Jadwal pengamatan', c.fmtTgl(t.jadwal)) : '') + '</table>' +
      '<p>Hal-hal yang dibahas dan disepakati:</p><div style="line-height:1.9;margin-left:8px">' + agenda.join('<br>') + '</div>' +
      '<p style="margin-top:12px">Demikian berita acara ini dibuat dengan sebenarnya.</p>' +
      '<div class="ttd" style="margin-top:20px"><div>Guru yang dinilai,<div style="min-height:22mm"></div><b>' + c.esc(g.nama) + '</b></div><div>Penilai,<div style="min-height:22mm"></div><b>' + c.esc(pen.nama) + '</b></div></div>' +
      '<div style="text-align:center;margin-top:14px;page-break-inside:avoid">Mengetahui,<br>Kepala ' + c.esc(m.nama || 'Madrasah') + ',' +
      '<div style="min-height:24mm;display:flex;align-items:flex-end;justify-content:center">' +
      ((window.TTD && typeof window.TTD.penanda === 'function') ? window.TTD.penanda('kepala', { jenis: 'Berita Acara Pertemuan ' + (n === 2 ? 'Kedua' : 'Pertama') + ' PKG', ket: 'Berita Acara Pertemuan ' + (n === 2 ? 'Kedua' : 'Pertama') + ' PKG | ' + g.nama + ' | ' + c.fmtTgl(d.tgl) + ' | Nomor ' + (d.nomor || '-') }, { hanyaPimpinan: true }) : '') +
      '</div><b>' + c.esc(c.namaKepala() || titik) + '</b>' + (m.nip_kepala_sekolah ? '<br>NIP. ' + c.esc(m.nip_kepala_sekolah) : '') + '</div>';
    c.bukaCetak('Berita Acara Pertemuan ' + kali + ' - ' + g.nama, isi);
  }

  // ---------- 4. Berita Acara Mediasi Keberatan (Juknis III.F.1.m) ----------
  function beritaMediasi(c, gk) {
    var d = dataSurat(c), t = c.tugasDari(gk) || {};
    if (!t.penilaiKey) return c.pesan('Guru ini belum punya penilai. Atur di Penugasan Penilai.', true);
    var g = guruInfo(c, gk), pen = guruInfo(c, t.penilaiKey), m = M(), kot = '&#9744; ', hari = '';
    try { hari = new Date(d.tgl + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' }); } catch (e) { }
    var kep = c.namaKepala() || titik;
    var qr = (window.TTD && typeof window.TTD.penanda === 'function') ? window.TTD.penanda('kepala', { jenis: 'Berita Acara Mediasi PKG', ket: 'Berita Acara Mediasi PKG | ' + g.nama + ' | ' + c.fmtTgl(d.tgl) + ' | Nomor ' + (d.nomor || '-') }, { hanyaPimpinan: true }) : '';
    var isi = judul('BERITA ACARA MEDIASI<br>KEBERATAN HASIL PENILAIAN KINERJA GURU', d.nomor, c) +
      '<p style="text-align:justify">Pada hari ini ' + (hari ? c.esc(hari) : titik) + ' tanggal ' + c.fmtTgl(d.tgl) + ', bertempat di ' + (d.ruang ? c.esc(d.ruang) : c.esc(m.nama || 'madrasah')) + ', telah dilaksanakan mediasi atas keberatan terhadap hasil Penilaian Kinerja Guru ' + c.esc(periodeNama(c)) + ' antara:</p>' +
      '<table style="border:0">' + baris(c, 'Guru yang dinilai', c.esc(g.nama) + (g.nip ? ' (NIP ' + c.esc(g.nip) + ')' : '')) + baris(c, 'Penilai', c.esc(pen.nama)) + baris(c, 'Mediator', 'Kepala ' + c.esc(m.nama || 'Madrasah') + ' (' + c.esc(kep) + ')') + '</table>' +
      '<p><b>Pokok keberatan guru:</b></p><div style="min-height:52px;border-bottom:1px dotted #777;line-height:2">&nbsp;</div><div style="border-bottom:1px dotted #777;line-height:2">&nbsp;</div>' +
      '<p><b>Tanggapan penilai:</b></p><div style="min-height:52px;border-bottom:1px dotted #777;line-height:2">&nbsp;</div><div style="border-bottom:1px dotted #777;line-height:2">&nbsp;</div>' +
      '<p><b>Hasil mediasi:</b></p><div style="line-height:1.9;margin-left:8px">' +
      kot + 'Hasil penilaian tetap, guru dapat menerima<br>' + kot + 'Hasil penilaian diperbaiki pada indikator: ' + titik + titik + '<br>' + kot + 'Keberatan belum dapat diselesaikan dan diteruskan kepada: ' + titik + titik + '</div>' +
      '<p style="margin-top:12px">Demikian berita acara ini dibuat dengan sebenarnya.</p>' +
      '<div class="ttd" style="margin-top:20px"><div>Guru yang dinilai,<div style="min-height:22mm"></div><b>' + c.esc(g.nama) + '</b></div><div>Penilai,<div style="min-height:22mm"></div><b>' + c.esc(pen.nama) + '</b></div></div>' +
      '<div style="text-align:center;margin-top:14px;page-break-inside:avoid">Mediator,<br>Kepala ' + c.esc(m.nama || 'Madrasah') + ',<div style="min-height:24mm;display:flex;align-items:flex-end;justify-content:center">' + qr + '</div><b>' + c.esc(kep) + '</b>' + (m.nip_kepala_sekolah ? '<br>NIP. ' + c.esc(m.nip_kepala_sekolah) : '') + '</div>';
    c.bukaCetak('Berita Acara Mediasi - ' + g.nama, isi);
  }

  // ---------- 5. Surat Pernyataan Guru (indikator 8.1) ----------
  // Ditandatangani guru sendiri (tanda tangan basah, bermeterai bila diminta); tanpa QR Kepala.
  function suratPernyataan(c, gk) {
    var d = dataSurat(c), g = guruInfo(c, gk), m = M();
    var isi = judul('SURAT PERNYATAAN', d.nomor, c) +
      '<p>Yang bertanda tangan di bawah ini:</p>' +
      '<table style="border:0">' + baris(c, 'Nama', c.esc(g.nama)) + baris(c, 'NIP/NIY', c.esc(g.nip || titik)) + baris(c, 'Jabatan', 'Guru') + baris(c, 'Unit kerja', c.esc(m.nama || 'Madrasah')) + '</table>' +
      '<p style="text-align:justify">dengan ini menyatakan dengan sesungguhnya bahwa saya tidak terlibat, baik sebagai anggota maupun pengurus, dalam organisasi terlarang atau organisasi yang bertentangan dengan Pancasila, Undang-Undang Dasar Negara Republik Indonesia Tahun 1945, dan peraturan perundang-undangan yang berlaku.</p>' +
      '<p style="text-align:justify">Pernyataan ini saya buat dengan sebenarnya sebagai kelengkapan bukti Penilaian Kinerja Guru ' + c.esc(periodeNama(c)) + '. Apabila di kemudian hari pernyataan ini tidak benar, saya bersedia menerima sanksi sesuai ketentuan yang berlaku.</p>' +
      '<div style="margin-left:52%;text-align:center;margin-top:18px;page-break-inside:avoid">' + (d.tempat ? c.esc(d.tempat) : titik) + ', ' + c.fmtTgl(d.tgl) + '<br>Yang membuat pernyataan,' +
      '<div style="min-height:26mm;display:flex;align-items:center;justify-content:center;color:#999;font-size:11px">Meterai bila diperlukan</div><b>' + c.esc(g.nama) + '</b>' + (g.nip ? '<br>NIP/NIY. ' + c.esc(g.nip) : '') + '</div>';
    c.bukaCetak('Surat Pernyataan - ' + g.nama, isi);
  }

  // ---------- kartu di tab Pengaturan ----------
  function html() {
    var c = C(); if (!c || !c.bolehKelola() || !c.S.periodeId) return '';
    var gurus = c.guruAktif().filter(function (g) { return c.tugasDari(g.key) && c.tugasDari(g.key).penilaiKey; });
    var pens = {}; gurus.forEach(function (g) { var t = c.tugasDari(g.key); pens[t.penilaiKey] = (pens[t.penilaiKey] || 0) + 1; });
    var o = '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 8px">✉️ Surat PKG (tanda tangan QR Kepala)</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Mencetak surat tugas penilai, pemberitahuan jadwal pengamatan, dan berita acara pertemuan. Nama, penilai, jadwal, dan nomor SK terisi dari data PKG; QR Kepala terbit saat Admin atau Kepala yang mencetak. Nomor surat diisi manual (boleh kosong, ditulis tangan). Pertemuan pertama/kedua tetap dicentang di tab Pengendalian.</p>' +
      '<p style="font-size:11px;line-height:1.5;color:#6b7280;margin:0 0 8px">📚 Rujukan: Kepdirjen Pendis No. 1843 Tahun 2021 (Juknis PKG Madrasah; BA pertemuan III.F.1.a &amp; g, mediasi III.F.1.m) · PMA No. 12 Tahun 2026 (Tata Naskah Dinas). ' +
      '<b>Format nomor menurut PMA 12/2026:</b> Surat Tugas = nomor/Kode Jabatan/Klasifikasi Arsip/bulan/tahun · Berita Acara &amp; Mediasi = nomor/Kode Jabatan/Klasifikasi Arsip/<b>BA</b>/bulan/tahun · Surat Pernyataan = &hellip;/<b>SPer</b>/bulan/tahun · Pemberitahuan Jadwal (surat ke guru, internal) = tanpa awalan <i>B/</i>. Kode Jabatan &amp; klasifikasi mengikuti pengaturan madrasah.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><div style="flex:2;min-width:150px"><label class="label">Nomor surat</label><input id="pkgSrNomor" class="field" maxlength="100" placeholder="mis. 001/MI-MU/KP.01/10/2026"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Tanggal surat / pertemuan</label><input id="pkgSrTgl" type="date" class="field" value="' + c.esc(c.skHariIni()) + '"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Tempat surat</label><input id="pkgSrTempat" class="field" maxlength="60" value="' + c.esc(c.skTempatProfil()) + '"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Jam pengamatan</label><input id="pkgSrJam" class="field" maxlength="40" placeholder="07.30 - 09.00 WIB"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Ruang / tempat</label><input id="pkgSrRuang" class="field" maxlength="60" placeholder="Ruang kelas"></div></div>';
    var ids = Object.keys(pens);
    if (!ids.length) return o + '<p class="text-muted" style="margin:10px 0 0">Belum ada penugasan penilai. Simpan Penugasan Penilai lebih dulu.</p></div>';
    o += '<h4 style="margin:12px 0 6px;font-size:13px">Surat tugas penilai</h4><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      ids.map(function (k) { return '<button type="button" class="btn btn-soft" data-act="surat-tugas" data-pk="' + c.esc(k) + '">🖨️ ' + c.esc(c.tampil(c.namaGuru(k))) + ' (' + pens[k] + ' guru)</button>'; }).join('') + '</div>';
    o += '<h4 style="margin:12px 0 6px;font-size:13px">Per guru</h4><table><thead><tr><th>Guru</th><th>Penilai</th><th>Jadwal</th><th>Cetak</th></tr></thead><tbody>' +
      gurus.map(function (g) {
        var t = c.tugasDari(g.key), a = ' data-gk="' + c.esc(g.key) + '"';
        return '<tr><td>' + c.esc(g.name) + '</td><td>' + c.esc(c.tampil(c.namaGuru(t.penilaiKey))) + '</td><td>' + (t.jadwal ? c.fmtTgl(t.jadwal) : '-') + '</td><td style="white-space:nowrap">' +
          '<button type="button" class="btn btn-soft" style="padding:3px 8px;font-size:11.5px" data-act="surat-jadwal"' + a + '>Jadwal</button> ' +
          '<button type="button" class="btn btn-soft" style="padding:3px 8px;font-size:11.5px" data-act="surat-ba1"' + a + '>BA 1</button> ' +
          '<button type="button" class="btn btn-soft" style="padding:3px 8px;font-size:11.5px" data-act="surat-ba2"' + a + '>BA 2</button> ' +
          '<button type="button" class="btn btn-soft" style="padding:3px 8px;font-size:11.5px" data-act="surat-mediasi"' + a + '>Mediasi</button> ' +
          '<button type="button" class="btn btn-soft" style="padding:3px 8px;font-size:11.5px" data-act="surat-pernyataan"' + a + '>Pernyataan</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    return o;
  }

  function aksi(act, el) {
    var c = C(); if (!c) return;
    if (!c.bolehKelola()) return c.pesan('Surat PKG hanya dicetak oleh Admin atau Kepala Madrasah.', true);
    var gk = el.getAttribute('data-gk');
    if (act === 'surat-tugas') return suratTugas(c, el.getAttribute('data-pk'));
    if (act === 'surat-jadwal') return suratJadwal(c, gk);
    if (act === 'surat-ba1') return beritaAcara(c, gk, 1);
    if (act === 'surat-ba2') return beritaAcara(c, gk, 2);
    if (act === 'surat-mediasi') return beritaMediasi(c, gk);
    if (act === 'surat-pernyataan') return suratPernyataan(c, gk);
  }

  window.PKG_SURAT = { html: html, aksi: aksi };
})();
