/* =====================================================================
   Tambahan: BERITA ACARA PER RUANG (kelas-kelas satu ruang & jam digabung)
   Dimuat SESUDAH administrasi-ujian.js. Tidak mengubah data tersimpan dan tidak mengubah
   Berita Acara per sesi yang sudah ada; hanya menambah dua tombol di tab Berita Acara:
     1. "Berita Acara per Ruang"            -> ruang + jam sesi yang sedang dibuka
     2. "BA per Ruang (semua ruang hari ini)" -> semua ruang pada tanggal sesi yang sedang dibuka
   Angka: peserta seharusnya, hadir, tidak hadir (S/I/A) = JUMLAH semua kelas di ruang itu.
   Naskah & lembar jawaban = jumlah isian tiap kelas (diisi di tab BA masing-masing kelas).
   Catatan = gabungan catatan tiap kelas (yang sama ditulis sekali).
   Juga: DAFTAR HADIR PER RUANG di tab Daftar Hadir (pengawas satu kali, peserta semua kelas satu tabel
   dengan kolom Kelas): "Daftar Hadir per Ruang", "per Ruang Kosongan", dan "semua ruang tanggal ini".
   ===================================================================== */
(function () {
  'use strict';
  if (typeof aujHtmlBA !== 'function' || typeof aujGrupRuang !== 'function' || typeof aujCetakHtml !== 'function') {
    console.warn('ba-per-ruang.js: administrasi-ujian.js belum termuat, tambahan dilewati.');
    return;
  }

  const unik = (arr) => arr.filter((v, i) => v && arr.indexOf(v) === i);
  const angka = (v) => { const n = parseInt(v, 10); return isFinite(n) && String(v).trim() !== '' ? n : null; };

  // Gabungkan rekap hadir semua kelas dalam satu ruang.
  function rekapRuang(grup) {
    const t = { total: 0, h: 0, s: 0, i: 0, a: 0, belum: 0, tidakHadir: [] };
    grup.forEach(r => {
      const rk = aujRekapHadir(r), kls = String(r.kelas || '').replace(/^kelas\s*/i, '');
      t.total += rk.total; t.h += rk.h; t.s += rk.s; t.i += rk.i; t.a += rk.a; t.belum += rk.belum;
      rk.tidakHadir.forEach(x => t.tidakHadir.push({ nama: x.nama, ket: x.ket, kls }));
    });
    return t;
  }

  function jumlahIsian(grup, field) {
    const ada = grup.map(r => angka(r[field])).filter(v => v !== null);
    return ada.length ? ada.reduce((a, b) => a + b, 0) : null;
  }

  function baRuangHtml(grup, kosong) {
    const rec = grup[0], rk = rekapRuang(grup);
    const p = aujBagianTgl(rec.tanggal) || { hari: '...', d: '...', bulan: '...', y: '...' };
    const tanpaIsi = !!kosong || (rk.belum === rk.total && rk.total > 0);
    const orang = n => tanpaIsi ? '.......... orang' : `${n} orang`;
    const titik = v => (v == null || v === '') ? '..........' : escapeHtml(String(v));
    const mulaiSemua = grup.map(r => r.baMulai || r.jamMulai).filter(Boolean).sort();
    const selesaiSemua = grup.map(r => r.baSelesai || r.jamSelesai).filter(Boolean).sort();
    const mulai = kosong ? '' : (mulaiSemua[0] || ''), selesai = kosong ? '' : (selesaiSemua[selesaiSemua.length - 1] || '');
    const mapel = unik(grup.map(r => r.mapel)).join(' / ');
    const kelas = grup.map(r => r.kelas || '').filter(Boolean).join(' + ');
    const pengawas = unik(grup.reduce((a, r) => a.concat([r.pengawas1, r.pengawas2]), []));
    const catatan = kosong ? '' : unik(grup.map(r => String(r.baCatatan || '').trim())).join('\n');
    const naskah = kosong ? null : jumlahIsian(grup, 'baNaskah'), ljk = kosong ? null : jumlahIsian(grup, 'baLjk');
    const tempat = aujTempat();
    const kolTdk = '<th style="width:34px;">No</th><th>Nama Peserta</th><th style="width:16%;">Kelas</th><th style="width:20%;">Keterangan</th>';
    const tdkHadir = rk.tidakHadir.length
      ? `<table class="data" style="margin-top:4px;"><thead><tr>${kolTdk}</tr></thead><tbody>${rk.tidakHadir.map((x, i) => `<tr><td style="text-align:center;">${i + 1}</td><td>${escapeHtml(x.nama)}</td><td style="text-align:center;">${escapeHtml(x.kls)}</td><td style="text-align:center;">${x.ket}</td></tr>`).join('')}</tbody></table>`
      : (kosong
        ? `<table class="data" style="margin-top:4px;"><thead><tr>${kolTdk}</tr></thead><tbody>${[1, 2, 3, 4, 5].map(n => `<tr><td style="text-align:center;height:24px;">${n}</td><td></td><td></td><td></td></tr>`).join('')}</tbody></table>`
        : `<span>${tanpaIsi ? '' : '– (nihil)'}</span>`);
    return `<div class="halaman">${aujKopHtml()}
    <h1>Berita Acara Pelaksanaan ${escapeHtml(aujJudulAsesmen(rec.nama))}</h1>
    <div class="sub">${escapeHtml(rec.nama || '')}<br>Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    <p style="text-align:justify;line-height:1.5;">Pada hari ini <strong>${escapeHtml(p.hari)}</strong> tanggal <strong>${escapeHtml(String(p.d))}</strong> bulan <strong>${escapeHtml(p.bulan)}</strong> tahun <strong>${escapeHtml(String(p.y))}</strong>, telah dilaksanakan <strong>${escapeHtml(rec.nama || '')}</strong>${mapel ? ' mata pelajaran <strong>' + escapeHtml(mapel) + '</strong>' : ''} untuk <strong>${escapeHtml(kelas)}</strong> di ${escapeHtml(MADRASAH.nama || 'madrasah')}, ruang <strong>${escapeHtml(rec.ruang || '')}</strong>, mulai pukul <strong>${escapeHtml(mulai || '.....')}</strong> sampai dengan pukul <strong>${escapeHtml(selesai || '.....')}</strong> WIB, dengan keterangan sebagai berikut:</p>
    <table class="info" style="margin-left:6px;">
      <tr><td style="width:24px;">1.</td><td style="width:250px;">Jumlah peserta seharusnya</td><td>: ${rk.total} orang${grup.length > 1 ? ' (' + grup.map(r => escapeHtml(String(r.kelas || '').replace(/^kelas\s*/i, '')) + ': ' + aujRekapHadir(r).total).join(', ') + ')' : ''}</td></tr>
      <tr><td>2.</td><td>Jumlah peserta hadir</td><td>: ${orang(rk.h)}</td></tr>
      <tr><td>3.</td><td>Jumlah peserta tidak hadir</td><td>: ${tanpaIsi ? '.......... orang' : `${rk.s + rk.i + rk.a} orang (sakit ${rk.s}, izin ${rk.i}, alpa ${rk.a})`}</td></tr>
      <tr><td>4.</td><td>Jumlah naskah soal yang diterima</td><td>: ${titik(naskah)} eksemplar</td></tr>
      <tr><td>5.</td><td>Jumlah lembar jawaban dikumpulkan</td><td>: ${titik(ljk)} lembar</td></tr>
    </table>
    <div class="blok" style="margin-top:8px;padding-left:6px;"><div style="margin-bottom:2px;">Peserta yang tidak hadir:</div>${tdkHadir}</div>
    <div class="blok" style="margin-top:10px;padding-left:6px;"><div>Catatan selama pelaksanaan ASAS/ASAT:</div>
      <div style="border:1px solid #000;min-height:${kosong ? 110 : 80}px;padding:6px 8px;margin-top:3px;white-space:pre-wrap;font-size:11.5pt;">${escapeHtml(catatan)}</div></div>
    <p style="margin-top:12px;">Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
    <div style="text-align:right;margin-top:6px;">${tempat ? escapeHtml(tempat) + ', ' : ''}${escapeHtml(aujTglIndo(rec.tanggal))}</div>
    <table class="ttd"><tr>${aujTtdPengawasHtml(pengawas[0], 1, '50%')}${aujTtdPengawasHtml(pengawas[1], 2, '50%')}</tr></table>
  </div>`;
  }

  function konfirmasiBelum(grups) {
    let belum = 0, total = 0;
    grups.forEach(g => { const rk = rekapRuang(g); if (rk.belum > 0 && rk.belum < rk.total) { belum += rk.belum; total += rk.total; } });
    if (!belum) return true;
    return confirm(belum + ' peserta (di ruang yang sebagian statusnya sudah diisi) belum diisi di Daftar Hadir.\n\nAngka hadir dan tidak hadir di Berita Acara tidak akan menjumlah ke total peserta. Tetap cetak?');
  }

  window.aujCetakBARuang = function () {
    const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
    const grup = aujGrupRuang(rec);
    if (!konfirmasiBelum([grup])) return;
    aujCetakHtml(baRuangHtml(grup), `Berita Acara per Ruang - ${rec.ruang || ''} ${rec.tanggal || ''}`);
  };

  function grupHariIni(rec) {
    const hariIni = allAdmUjian.filter(r => r.nama === rec.nama && r.tanggal === rec.tanggal)
      .sort((a, b) => String(a.jamMulai || '').localeCompare(String(b.jamMulai || '')) || aujKunciRuang(a.ruang) - aujKunciRuang(b.ruang) || String(a.kelas || '').localeCompare(String(b.kelas || ''), 'id', { numeric: true }));
    const sudah = new Set(), grups = [];
    hariIni.forEach(r => {
      if (sudah.has(r.key)) return;
      const g = aujGrupRuang(r); g.forEach(x => sudah.add(x.key)); grups.push(g);
    });
    return grups;
  }

  window.aujCetakBARuangHari = function () {
    const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
    if (!rec.tanggal) return toast('Sesi ini belum punya tanggal.', true);
    const grups = grupHariIni(rec);
    if (!grups.length) return toast('Tidak ada sesi pada tanggal ini.', true);
    if (!confirm('Cetak Berita Acara per ruang untuk ' + grups.length + ' ruang/jam pada ' + aujTglIndo(rec.tanggal) + '?\n\nKira-kira ' + grups.length + ' lembar F4.')) return;
    if (!konfirmasiBelum(grups)) return;
    aujCetakHtml(grups.map(g => baRuangHtml(g)).join(''), `Berita Acara per Ruang - ${aujTglIndo(rec.tanggal)}`);
  };

  // Pasang dua tombol di tab Berita Acara (di bawah isi tab yang sudah ada).
  const aujHtmlBAAsli = aujHtmlBA;
  window.aujHtmlBA = aujHtmlBA = function (rec) {
    const grup = aujGrupRuang(rec), rk = rekapRuang(grup);
    const info = grup.length > 1
      ? `Ruang ini dipakai ${grup.length} kelas (${escapeHtml(grup.map(r => r.kelas).join(' + '))}): peserta seharusnya <strong>${rk.total}</strong> · hadir <strong>${rk.h}</strong> · tidak hadir <strong>${rk.s + rk.i + rk.a}</strong>.`
      : 'Ruang ini hanya dipakai satu kelas, hasilnya sama dengan Berita Acara biasa.';
    return aujHtmlBAAsli(rec) + `
    <div style="margin-top:14px;padding:10px 12px;border:1px dashed #94a3b8;border-radius:10px;font-size:13px;">
      <strong>Berita Acara per Ruang</strong> (satu lembar, angka semua kelas di ruang itu dijumlahkan)
      <div style="margin:4px 0 8px;color:#475569;">${info}</div>
      <button class="btn btn-primary" onclick="aujCetakBARuang()">🖨️ BA per Ruang (ruang ini)</button>
      <button class="btn btn-soft" onclick="aujCetakBARuangHari()">📚 BA per Ruang (semua ruang tanggal ini)</button>
      <button class="btn btn-soft" onclick="aujCetakPaketRuang(false, false)" title="Daftar Hadir + Berita Acara satu ruang, berurutan">🗂️ Hadir + BA per Ruang</button>
      <button class="btn btn-soft" onclick="aujCetakPaketRuang(true, true)" title="Daftar Hadir + Berita Acara kosongan, semua ruang pada tanggal sesi ini">📚 Hadir + BA Kosongan per Ruang (tanggal ini)</button>
    </div>`;
  };
  // ---------------- DAFTAR HADIR PER RUANG ----------------
  function hadirRuangHtml(grup, kosong) {
    const rec = grup[0];
    const mapel = unik(grup.map(r => r.mapel)).join(' / ') || '-';
    const kelas = grup.map(r => r.kelas || '').filter(Boolean).join(' + ');
    const info = [['Asesmen', rec.nama], ['Mata Pelajaran', mapel], ['Kelas', kelas], ['Ruang', rec.ruang],
      ['Hari / Tanggal', aujTglIndo(rec.tanggal, true)], ['Waktu', aujWaktu(rec)]];
    const infoHtml = `<table class="info">${info.map(b => `<tr><td style="width:120px;">${b[0]}</td><td style="width:10px;">:</td><td>${escapeHtml(b[1] || '-')}</td></tr>`).join('')}</table>`;
    // Pengawas: nama unik dari semua kelas di ruang itu; Hadir bila tercentang / check-in di salah satu sesi.
    const pw = [];
    grup.forEach(r => {
      const hd = aujPwHadirEfektif(r);
      [[r.pengawas1, 'p1'], [r.pengawas2, 'p2']].forEach(x => {
        if (!x[0]) return;
        const ada = pw.find(q => aujNormNama(q.nama) === aujNormNama(x[0]));
        if (ada) { if (hd[x[1]]) ada.hadir = true; } else pw.push({ nama: x[0], hadir: !!hd[x[1]] });
      });
    });
    if (!pw.length) pw.push({ nama: '' }, { nama: '' });
    const bPw = pw.map((x, i) => `<tr><td style="text-align:center;width:34px;">${i + 1}</td><td>${escapeHtml(x.nama)}</td><td style="width:34%;height:30px;"></td><td style="width:16%;text-align:center;">${!kosong && x.nama && x.hadir ? 'Hadir' : ''}</td></tr>`).join('');
    let n = 0;
    const baris = grup.map(r => {
      const st = r.hadirPeserta || {}, kls = escapeHtml(String(r.kelas || '').replace(/^kelas\s*/i, ''));
      return aujPeserta(r.kelas, r).map(pp => {
        const v = st[pp.key]; n++;
        return `<tr><td style="text-align:center;width:42px;">${pp.nomor}</td><td>${escapeHtml(pp.nama)}</td><td style="width:9%;text-align:center;">${kls}</td><td style="width:28%;height:26px;"></td><td style="width:14%;text-align:center;">${!kosong && v ? AUJ_STATUS[v] : ''}</td></tr>`;
      }).join('');
    }).join('') || '<tr><td colspan="5" style="text-align:center;">Belum ada data siswa.</td></tr>';
    return `<div class="halaman">${aujKopHtml()}
    <h1>Daftar Hadir Peserta dan Pengawas ${escapeHtml(aujJudulAsesmen(rec.nama))}</h1>
    <div class="sub">Tahun Pelajaran ${escapeHtml(currentTahunAjaran || '')}${currentSemesterAktif ? ' — Semester ' + escapeHtml(currentSemesterAktif) : ''}</div>
    ${infoHtml}
    <h2>A. Daftar Hadir Pengawas</h2>
    <table class="data"><thead><tr><th>No</th><th>Nama Pengawas</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead><tbody>${bPw}</tbody></table>
    <h2>B. Daftar Hadir Peserta (${n} orang)</h2>
    <table class="data"><thead><tr><th>No</th><th>Nama Peserta</th><th>Kelas</th><th>Tanda Tangan</th><th>Keterangan</th></tr></thead><tbody>${baris}</tbody></table>
    ${kosong ? '<p class="muted" style="margin-top:4px;">Kolom Keterangan diisi tangan oleh pengawas: Hadir / Sakit / Izin / Alpa.</p>' : ''}
  </div>`;
  }

  window.aujCetakHadirRuang = function (kosong) {
    const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
    const grup = aujGrupRuang(rec);
    aujCetakHtml(hadirRuangHtml(grup, !!kosong), `Daftar Hadir per Ruang${kosong ? ' Kosongan' : ''} - ${rec.ruang || ''} ${rec.tanggal || ''}`);
  };

  window.aujCetakHadirRuangHari = function (kosong) {
    const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
    if (!rec.tanggal) return toast('Sesi ini belum punya tanggal.', true);
    const grups = grupHariIni(rec);
    if (!grups.length) return toast('Tidak ada sesi pada tanggal ini.', true);
    if (!confirm('Cetak Daftar Hadir per ruang' + (kosong ? ' KOSONGAN' : '') + ' untuk ' + grups.length + ' ruang/jam pada ' + aujTglIndo(rec.tanggal) + '?\n\nMinimal ' + grups.length + ' lembar F4 (ruang gabungan bisa lebih dari satu lembar).')) return;
    aujCetakHtml(grups.map(g => hadirRuangHtml(g, !!kosong)).join(''), `Daftar Hadir per Ruang${kosong ? ' Kosongan' : ''} - ${aujTglIndo(rec.tanggal)}`);
  };

  // ---------------- PAKET: DAFTAR HADIR + BERITA ACARA PER RUANG ----------------
  // Per ruang: lembar Daftar Hadir lalu lembar Berita Acara. kosong=true -> keduanya kosongan (hasil dikosongkan, jadwal tetap).
  // hari=true -> semua ruang pada tanggal sesi yang dibuka, urut jam lalu ruang.
  window.aujCetakPaketRuang = function (kosong, hari) {
    const rec = aujRec(); if (!rec) return toast('Pilih sesi ASAS/ASAT dulu.', true);
    let grups;
    if (hari) {
      if (!rec.tanggal) return toast('Sesi ini belum punya tanggal.', true);
      grups = grupHariIni(rec);
      if (!grups.length) return toast('Tidak ada sesi pada tanggal ini.', true);
      if (!confirm('Cetak Daftar Hadir + Berita Acara per ruang' + (kosong ? ' KOSONGAN' : '') + ' untuk ' + grups.length + ' ruang/jam pada ' + aujTglIndo(rec.tanggal) + '?\n\nMinimal ' + (grups.length * 2) + ' lembar F4 (ruang gabungan bisa lebih).')) return;
    } else grups = [aujGrupRuang(rec)];
    if (!kosong && !konfirmasiBelum(grups)) return;
    aujCetakHtml(grups.map(g => hadirRuangHtml(g, !!kosong) + baRuangHtml(g, !!kosong)).join(''),
      `Hadir + Berita Acara per Ruang${kosong ? ' Kosongan' : ''} - ${hari ? aujTglIndo(rec.tanggal) : (rec.ruang || '') + ' ' + (rec.tanggal || '')}`);
  };

  // ---------------- CETAK BANYAK HARI (rentang tanggal) PER RUANG ----------------
  // Memakai kolom Dari / Sampai di baris "Cetak banyak hari". Urut: tanggal, jam, ruang.
  window.aujCetakPaketRuangRentang = function (kosong) {
    const x = aujAmbilRentang(); if (!x) return;
    const sudah = new Set(), grups = [];
    x.daftar.forEach(r => {
      if (sudah.has(r.key)) return;
      const g = aujGrupRuang(r); g.forEach(q => sudah.add(q.key)); grups.push(g);
    });
    const hari = new Set(x.daftar.map(r => r.tanggal)).size;
    if (!confirm('Cetak Daftar Hadir + Berita Acara per ruang' + (kosong ? ' KOSONGAN' : '') + ' untuk ' + grups.length + ' ruang/jam pada ' + hari + ' hari (' + aujTglIndo(x.dari) + ' s.d. ' + aujTglIndo(x.sampai) + ')?\n\nMinimal ' + (grups.length * 2) + ' lembar F4 (ruang gabungan bisa lebih). Pastikan kertas cukup.')) return;
    if (!kosong && !konfirmasiBelum(grups)) return;
    aujCetakHtml(grups.map(g => hadirRuangHtml(g, !!kosong) + baRuangHtml(g, !!kosong)).join(''),
      `Hadir + Berita Acara per Ruang${kosong ? ' Kosongan' : ''} - ${aujTglIndo(x.dari)} s.d. ${aujTglIndo(x.sampai)}`);
  };

  if (typeof aujBarKosongan === 'function' && typeof aujAmbilRentang === 'function') {
    const aujBarKosonganAsli = aujBarKosongan;
    window.aujBarKosongan = aujBarKosongan = function (rec) {
      const html = aujBarKosonganAsli(rec), akhir = html.lastIndexOf('</div>');
      const tmb = `
    <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujCetakPaketRuangRentang(true)" title="Daftar Hadir + Berita Acara kosongan, satu paket per RUANG (kelas satu ruang digabung), pada rentang tanggal ini">🗂️ Hadir + BA Kosongan per Ruang</button>
    <button class="btn btn-soft" style="font-size:12px;padding:3px 10px;" onclick="aujCetakPaketRuangRentang(false)" title="Daftar Hadir + Berita Acara per RUANG dengan data yang sudah terisi, pada rentang tanggal ini">🗂️ Hadir + BA per Ruang (terisi)</button>`;
      return akhir < 0 ? html + tmb : html.slice(0, akhir) + tmb + html.slice(akhir);
    };
  }

  if (typeof aujHtmlHadir === 'function') {
    const aujHtmlHadirAsli = aujHtmlHadir;
    window.aujHtmlHadir = aujHtmlHadir = function (rec) {
      const grup = aujGrupRuang(rec);
      const info = grup.length > 1
        ? `Ruang ini dipakai ${grup.length} kelas (${escapeHtml(grup.map(r => r.kelas).join(' + '))}), ${grup.reduce((a, r) => a + aujPeserta(r.kelas, r).length, 0)} peserta: semua dalam satu lembar.`
        : 'Ruang ini hanya dipakai satu kelas, hasilnya sama dengan Daftar Hadir biasa.';
      return aujHtmlHadirAsli(rec) + `
    <div style="margin-top:14px;padding:10px 12px;border:1px dashed #94a3b8;border-radius:10px;font-size:13px;">
      <strong>Daftar Hadir per Ruang</strong> (satu lembar, pengawas satu kali, peserta semua kelas)
      <div style="margin:4px 0 8px;color:#475569;">${info}</div>
      <button class="btn btn-primary" onclick="aujCetakHadirRuang(false)">🖨️ Daftar Hadir per Ruang</button>
      <button class="btn btn-soft" onclick="aujCetakHadirRuang(true)" title="Tanpa status, untuk diisi tangan pengawas">📝 per Ruang Kosongan</button>
      <button class="btn btn-soft" onclick="aujCetakHadirRuangHari(true)" title="Kosongan, semua ruang pada tanggal sesi ini">📚 Kosongan per Ruang (tanggal ini)</button>
      <button class="btn btn-soft" onclick="aujCetakPaketRuang(false, false)" title="Daftar Hadir + Berita Acara satu ruang, berurutan">🗂️ Hadir + BA per Ruang</button>
      <button class="btn btn-soft" onclick="aujCetakPaketRuang(true, true)" title="Daftar Hadir + Berita Acara kosongan, semua ruang pada tanggal sesi ini">📚 Hadir + BA Kosongan per Ruang (tanggal ini)</button>
    </div>`;
    };
  }
})();
