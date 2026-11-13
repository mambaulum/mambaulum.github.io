/* ============================================================
   SI MAMBA - js/lengkapi-siswa.js (v=1)
   "Lengkapi data siswa dari Excel": mengisi NISN, (NIS), tempat lahir, dan tanggal lahir
   untuk siswa yang SUDAH ADA di menu Siswa. Tidak menambah siswa baru.
   - Hanya Admin. Pratinjau dulu, baru Simpan (1 update multi-path, semua atau tidak sama sekali).
   - Pencocokan: nama (tanpa beda huruf besar/kecil & spasi ganda) + kelas. Kelas dibaca dari kolom
     "Tingkat - Rombel" / "Kelas" (mis. "Kelas 6 - VI" -> Kelas 6).
   - Isian yang sudah ada TIDAK ditimpa, kecuali kotak "Timpa" dicentang.
   - Tidak ada perubahan Firebase Rules: hanya field nisn, nis, tempatLahir, tglLahir di node siswa
     (field yang sama dengan yang dibaca Buku Induk dari menu Siswa).
   - NIK/alamat/orang tua SENGAJA tidak dibawa (itu data Buku Induk, ada impor CSV sendiri).
   Bergantung pada: fitur-pelengkap.js (plgNormKelas, PLG_MAKS_UKURAN_FILE, plgLibExcelGagal) & app.js.
   Semua nama berawalan lks/LKS_ supaya tidak bentrok.
============================================================ */
(function () {
  'use strict';
  var lksBaris = null;       // baris mentah hasil baca file
  var lksJumlahOk = 0;       // jumlah baris "akan diperbarui" saat pratinjau terakhir

  function $(id) { return document.getElementById(id); }
  function norm(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); }
  function namaKunci(v) { return String(v == null ? '' : v).toUpperCase().replace(/[^A-Z\u00C0-\u024F ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  var SCI = /^\d+(\.\d+)?e[+-]?\d+$/i;

  /* ---------- pembersih nilai ---------- */
  // NISN: 10 angka. Excel sering membuang 0 di depan (9 angka) -> dilengkapi dan diberi catatan.
  function bersihNisn(v) {
    var s = String(v == null ? '' : v).trim().replace(/^'/, '');
    if (!s) return { val: '' };
    if (SCI.test(s)) return { err: 'NISN terbaca angka ilmiah (format kolom sebagai Teks)' };
    var d = s.replace(/\D/g, '');
    if (!d) return { err: 'NISN tidak berisi angka' };
    if (d.length === 9) return { val: '0' + d, cat: 'NISN 9 angka, ditambah 0 di depan' };
    if (d.length !== 10) return { err: 'NISN harus 10 angka (terbaca ' + d.length + ')' };
    return { val: d };
  }
  function bersihNis(v) {
    var s = String(v == null ? '' : v).trim().replace(/^'/, '');
    if (!s) return { val: '' };
    if (SCI.test(s)) return { err: 'NIS terbaca angka ilmiah' };
    var d = s.replace(/[^0-9A-Za-z./-]/g, '');
    if (!d || d.length > 20) return { err: 'NIS tidak valid' };
    return { val: d };
  }
  function bersihTempat(v) {
    var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    if (!s) return { val: '' };
    if (s.length > 60) return { err: 'Tempat lahir terlalu panjang' };
    return { val: s };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // Tanggal: yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy, atau nomor seri Excel. Hasil selalu yyyy-mm-dd.
  function bersihTanggal(v) {
    if (v == null || String(v).trim() === '') return { val: '' };
    var y, m, d, s = String(v).trim();
    if (typeof v === 'number' && isFinite(v)) {
      var dt = new Date(Math.round((v - 25569) * 86400000));   // seri Excel -> UTC
      y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
    } else if (v instanceof Date && !isNaN(v.getTime())) {
      y = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate();
    } else {
      var a = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s), b = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
      if (a) { y = +a[1]; m = +a[2]; d = +a[3]; } else if (b) { d = +b[1]; m = +b[2]; y = +b[3]; } else return { err: 'Format tanggal tidak dikenal ("' + s.slice(0, 20) + '")' };
    }
    var uji = new Date(y, m - 1, d);
    if (uji.getFullYear() !== y || uji.getMonth() !== m - 1 || uji.getDate() !== d) return { err: 'Tanggal tidak ada di kalender' };
    var thn = new Date().getFullYear();
    if (y < thn - 25 || y > thn - 3) return { err: 'Tahun lahir ' + y + ' tidak masuk akal untuk siswa MI' };
    return { val: y + '-' + pad(m) + '-' + pad(d) };
  }

  /* ---------- baca sheet ---------- */
  function uraiSheet(aoa) {
    var mulai = -1, c = {};
    for (var i = 0; i < Math.min(aoa.length, 10); i++) {
      var r = (aoa[i] || []).map(norm);
      var iN = r.findIndex(function (x) { return x === 'nama' || x === 'nama siswa' || x === 'nama lengkap' || x === 'nama peserta didik'; });
      var iB = r.findIndex(function (x) { return x === 'nisn'; });
      if (iN !== -1 && iB !== -1) {
        mulai = i + 1; c.nama = iN; c.nisn = iB;
        c.nis = r.findIndex(function (x) { return x === 'nis' || x === 'nomor induk siswa'; });
        c.tempat = r.findIndex(function (x) { return x === 'tempat lahir' || x === 'tempat'; });
        c.tgl = r.findIndex(function (x) { return x === 'tanggal lahir' || x === 'tgl lahir'; });
        c.kelas = r.findIndex(function (x) { return x === 'kelas' || x.indexOf('tingkat') === 0 || x === 'rombel' || x === 'rombongan belajar'; });
        break;
      }
    }
    if (mulai < 0) return { fatal: 'Judul kolom tidak ditemukan. File harus punya kolom "Nama Lengkap" (atau "Nama") dan "NISN".' };
    if (c.tempat < 0 && c.tgl < 0 && c.nis < 0) return { fatal: 'Tidak ada kolom Tempat Lahir, Tanggal Lahir, atau NIS. Tidak ada yang bisa dilengkapi selain NISN.' , c: c };
    var baris = [];
    for (var j = mulai; j < aoa.length; j++) {
      var row = aoa[j] || [];
      var ambil = function (k) { return k >= 0 && row[k] != null ? row[k] : ''; };
      var nama = String(ambil(c.nama)).trim();
      if (!nama && String(ambil(c.nisn)).trim() === '') continue;
      baris.push({ baris: j + 1, nama: nama, nisn: ambil(c.nisn), nis: ambil(c.nis), tempat: ambil(c.tempat), tgl: ambil(c.tgl), kelasRaw: String(ambil(c.kelas)).trim(), adaNis: c.nis >= 0, adaTempat: c.tempat >= 0, adaTgl: c.tgl >= 0 });
    }
    return { baris: baris, c: c };
  }

  // "Kelas 6 - VI", "6", "VI A" -> "Kelas 6" (lewat plgNormKelas milik fitur-pelengkap.js)
  function kelasDariRaw(raw) {
    if (!raw) return null;
    var k = plgNormKelas(raw);
    if (k) return k;
    var m = /kelas\s*(\d+)/i.exec(raw) || /^(\d+)\b/.exec(raw);
    return m ? plgNormKelas(m[1]) : null;
  }

  /* ---------- validasi terhadap data siswa SAAT INI ---------- */
  function validasi(rows, timpa) {
    var byNamaKelas = Object.create(null), byNama = Object.create(null), nisnDipakai = Object.create(null), dalamFile = Object.create(null);
    allSiswa.forEach(function (s) {
      var n = namaKunci(s.name), kk = n + '|' + s.kelas;
      (byNamaKelas[kk] = byNamaKelas[kk] || []).push(s);
      (byNama[n] = byNama[n] || []).push(s);
      if (s.nisn) (nisnDipakai[String(s.nisn)] = nisnDipakai[String(s.nisn)] || []).push(s.key);
    });
    return rows.map(function (r) {
      var it = { baris: r.baris, nama: r.nama, kelas: '', s: null, set: {}, ubah: [], sama: 0, catatan: [], ok: false, alasan: '' };
      if (!r.nama) { it.alasan = 'Nama kosong'; return it; }
      var kelas = kelasDariRaw(r.kelasRaw); it.kelas = kelas || r.kelasRaw || '';
      var n = namaKunci(r.nama), cocok;
      if (kelas) {
        cocok = byNamaKelas[n + '|' + kelas] || [];
        if (cocok.length === 0) {
          var lain = byNama[n] || [];
          it.alasan = lain.length ? 'Nama ada di ' + lain.map(function (x) { return x.kelas; }).join(', ') + ', bukan ' + kelas + ' (samakan kelas di menu Siswa)' : 'Tidak ditemukan di menu Siswa (' + kelas + ')';
          return it;
        }
      } else {
        cocok = byNama[n] || [];
        if (cocok.length === 0) { it.alasan = 'Tidak ditemukan di menu Siswa'; return it; }
        it.catatan.push('Kolom kelas tidak terbaca, dicocokkan lewat nama saja');
      }
      if (cocok.length > 1) { it.alasan = 'Ada ' + cocok.length + ' siswa bernama sama di kelas ini, isi manual'; return it; }
      var s = cocok[0]; it.s = s; it.kelas = s.kelas;
      if (dalamFile[s.key]) { it.alasan = 'Siswa ini muncul dua kali di file'; return it; }
      var nisn = bersihNisn(r.nisn), nis = r.adaNis ? bersihNis(r.nis) : { val: '' }, tmp = r.adaTempat ? bersihTempat(r.tempat) : { val: '' }, tg = r.adaTgl ? bersihTanggal(r.tgl) : { val: '' };
      var galat = [nisn, nis, tmp, tg].filter(function (x) { return x.err; }).map(function (x) { return x.err; });
      if (galat.length) { it.alasan = galat.join('; '); return it; }
      [nisn, nis, tmp, tg].forEach(function (x) { if (x.cat) it.catatan.push(x.cat); });
      if (nisn.val) { var pakai = (nisnDipakai[nisn.val] || []).filter(function (k) { return k !== s.key; }); if (pakai.length) { it.alasan = 'NISN ' + nisn.val + ' sudah dipakai siswa lain'; return it; } }
      var kand = [['nisn', 'NISN', nisn.val], ['nis', 'NIS', nis.val], ['tempatLahir', 'Tempat lahir', tmp.val], ['tglLahir', 'Tgl lahir', tg.val]];
      kand.forEach(function (k) {
        if (!k[2]) return;
        var lama = s[k[0]] != null ? String(s[k[0]]).trim() : '';
        if (lama === k[2]) { it.sama++; return; }
        if (lama && !timpa) { it.catatan.push(k[1] + ' sudah terisi "' + lama + '", tidak ditimpa'); return; }
        it.set[k[0]] = k[2]; it.ubah.push(k[1] + (lama ? ' (menimpa "' + lama + '")' : ''));
      });
      if (nisn.val) dalamFile[s.key] = true;
      if (it.ubah.length === 0) { it.alasan = it.sama ? 'Isian sama dengan data yang ada' : 'Tidak ada isian baru'; return it; }
      it.ok = true; return it;
    });
  }

  /* ---------- tampilan ---------- */
  function render(items) {
    var box = $('siswaLengkapiPreview'); if (!box) return;
    if (!items || !items.length) { lksJumlahOk = 0; box.innerHTML = ''; return; }
    var ok = items.filter(function (i) { return i.ok; }).length, lewat = items.length - ok; lksJumlahOk = ok;
    var rows = items.map(function (i) {
      var st = i.ok ? '<span style="color:#059669;font-weight:600;">✅ Diisi: ' + escapeHtml(i.ubah.join(', ')) + '</span>' : '<span style="color:#dc2626;">⏭️ Dilewati: ' + escapeHtml(i.alasan) + '</span>';
      if (i.catatan.length) st += '<div style="font-size:11px;color:#d97706;">⚠️ ' + escapeHtml(i.catatan.join('; ')) + '</div>';
      return '<tr><td>' + i.baris + '</td><td>' + escapeHtml(i.nama || '-') + '</td><td>' + escapeHtml(i.kelas || '-') + '</td><td>' + st + '</td></tr>';
    }).join('');
    box.innerHTML = '<p style="font-size:13px;font-weight:600;margin-bottom:6px;">Pratinjau: <span style="color:#059669;">' + ok + ' siswa akan dilengkapi</span>' + (lewat ? ', <span style="color:#dc2626;">' + lewat + ' baris dilewati</span>' : '') + ' (dari ' + items.length + ' baris)</p>' +
      '<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-bottom:8px;"><input type="checkbox" id="siswaLengkapiTimpa"' + (lksTimpa ? ' checked' : '') + ' onchange="lengkapiSiswaTimpaUbah(this.checked)"> Timpa isian yang sudah ada (biasanya jangan dicentang)</label>' +
      '<div style="overflow:auto;max-height:340px;"><table><thead><tr><th>Baris</th><th>Nama</th><th>Kelas</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;"><button id="btnSimpanLengkapi" class="btn btn-success" onclick="simpanLengkapiSiswa()"' + (ok === 0 ? ' disabled' : '') + '>💾 Lengkapi ' + ok + ' Siswa</button><button class="btn btn-soft" onclick="batalLengkapiSiswa()">✖️ Batal</button></div>';
  }
  var lksTimpa = false;
  window.lengkapiSiswaTimpaUbah = function (v) { lksTimpa = !!v; if (lksBaris) render(validasi(lksBaris, lksTimpa)); };

  window.batalLengkapiSiswa = function () {
    lksBaris = null; lksTimpa = false; render(null);
    var f = $('siswaLengkapiFile'); if (f) f.value = '';
  };

  window.lengkapiSiswaDipilih = function (input) {
    var file = input && input.files && input.files[0]; if (!file) return;
    if (!isAdmin()) { input.value = ''; return toast('🔒 Hanya Admin!', true); }
    if (file.size > PLG_MAKS_UKURAN_FILE) { input.value = ''; return toast('File terlalu besar (maks 2 MB).', true); }
    var csv = /\.csv$/i.test(file.name);
    toast('⏳ Membaca file...', false, 1500);
    ensureLib('xlsx').then(function () {
      return new Promise(function (res, rej) {
        var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(new Error('Gagal membaca file')); };
        if (csv) fr.readAsText(file, 'UTF-8'); else fr.readAsArrayBuffer(file);
      });
    }).then(function (isi) {
      var wb = XLSX.read(isi, { type: csv ? 'string' : 'array' });
      var nm = wb.SheetNames.filter(function (n) { return n !== 'Petunjuk'; });
      var semua = [];
      for (var k = 0; k < nm.length; k++) {   // semua sheet (mis. satu sheet per kelas)
        var aoa = XLSX.utils.sheet_to_json(wb.Sheets[nm[k]], { header: 1, defval: '', raw: true });
        var u = uraiSheet(aoa);
        if (u.fatal) { if (nm.length === 1) { lksBaris = null; render(null); return toast(u.fatal, true); } continue; }
        semua = semua.concat(u.baris);
      }
      if (!semua.length) { lksBaris = null; render(null); return toast('File tidak berisi data siswa yang bisa dibaca (butuh kolom Nama dan NISN).', true); }
      if (semua.length > PLG_MAKS_BARIS_IMPOR) { lksBaris = null; render(null); return toast('Terlalu banyak baris (' + semua.length + '). Maksimal ' + PLG_MAKS_BARIS_IMPOR + '.', true); }
      lksBaris = semua; lksTimpa = false; render(validasi(semua, false));
    }).catch(function (err) {
      console.warn('[SI MAMBA] Lengkapi siswa gagal baca:', err);
      if (typeof XLSX === 'undefined') plgLibExcelGagal(err); else toast('⚠️ File tidak bisa dibaca. Pastikan formatnya .xlsx, .xls, atau .csv yang valid.', true);
    }).then(function () { input.value = ''; });
  };

  window.simpanLengkapiSiswa = function () {
    if (!isAdmin()) return toast('🔒 Hanya Admin!', true);
    if (!lksBaris) return toast('Pilih file Excel dulu.', true);
    if (isBusy('simpanLengkapiSiswa')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
    if (!isReallyOnline()) return toast('⚠️ Sedang offline. Butuh koneksi internet.', true);
    var items = validasi(lksBaris, lksTimpa), diterima = items.filter(function (i) { return i.ok; });
    if (!diterima.length) { render(items); return toast('Tidak ada siswa yang bisa disimpan.', true); }
    if (lksJumlahOk !== diterima.length) { render(items); return toast('Data siswa berubah sejak pratinjau. Periksa pratinjau terbaru lalu tekan Simpan lagi.', true); }
    var btn = $('btnSimpanLengkapi'); setBusy('simpanLengkapiSiswa', btn);
    var upd = {};
    diterima.forEach(function (i) { Object.keys(i.set).forEach(function (f) { upd[i.s.key + '/' + f] = i.set[f]; }); });
    db.ref('siswa').update(upd, function (err) {
      clearBusy('simpanLengkapiSiswa', btn);
      if (err) return toast('Gagal menyimpan: ' + err.message, true);
      toast('✅ ' + diterima.length + ' siswa dilengkapi.');
      addLog('lengkapi_siswa_excel', diterima.length + ' siswa (NISN/NIS/tempat-tgl lahir)');
      batalLengkapiSiswa();
      reloadDataset('siswa', function () { try { populateClassFilterDropdowns(); } catch (e) {} });
    });
  };
})();
