// ============================================================
// CATATAN NILAI HARIAN -- js/nilai-harian.js
// Dimuat SESUDAH js/app.js. Tidak mengubah app.js dan tidak mengubah cara nilai disimpan/dikunci.
//
// Alur: di halaman Nilai (kelas + mapel + semester terpilih), tombol "Catatan Nilai Harian" membuka panel.
// Guru mencatat beberapa penilaian harian (tugas, kuis, observasi, dst.) per siswa untuk NH1 / NH2 / NH3.
// Tombol "Terapkan rata-rata" mengisi kotak NH di tabel nilai dengan rata-ratanya (2 desimal), lalu guru menekan
// "Simpan Nilai" seperti biasa. Catatan mentah tersimpan di Firebase node grades_harian sebagai bukti.
//
// Halaman "Catatan Nilai Harian" (menu khusus Admin & Kepala): daftar semua catatan yang sudah dibuat guru + membuka/mengubahnya
// (Admin: boleh mengubah, tiap simpan dicatat di log; Kepala: lihat saja). Menu "Nilai" bawaan hanya untuk Guru/Wali Kelas.
//
// Firebase: grades_harian/{tahunAjaran}/{kelas}/{mapel}/{semester}/{h1|h2|h3}
//   = { kolom:[{id,judul}], nilai:{siswaKey:{idKolom:angka}}, versi, updatedBy, updatedAt }
// (karakter . # $ [ ] / pada nama diganti _ ; tahun ajaran 2026/2027 -> 2026-2027)
// ============================================================
(function () {
  'use strict';

  var MAKS_KOLOM = 8;
  var NH = [['h1', 'NH1'], ['h2', 'NH2'], ['h3', 'NH3']];
  var st = null;   // keadaan panel yang sedang terbuka

  function el(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aman(s) { var t = String(s == null ? '' : s).replace(/\//g, '-').replace(/[.#$\[\]]/g, '_').trim(); return t || '_'; }
  function labelNh(kode) { for (var i = 0; i < NH.length; i++) if (NH[i][0] === kode) return NH[i][1]; return kode; }
  function jalur(c) { return 'grades_harian/' + aman(c.ta) + '/' + aman(c.kelas) + '/' + aman(c.mapel) + '/' + aman(c.sem) + '/' + c.nh; }
  function angka(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fmt(n) { return n == null ? '-' : String(n).replace('.', ','); }
  function toastX(m, err, ms) { try { toast(m, !!err, ms); } catch (e) { alert(m); } }

  // Rata-rata nilai satu siswa dari kolom yang terisi; null bila belum ada nilai. Dibulatkan 2 desimal.
  function rata(nilaiSiswa, kolom) {
    var v = [];
    (kolom || []).forEach(function (k) { var x = nilaiSiswa && nilaiSiswa[k.id]; if (typeof x === 'number' && isFinite(x)) v.push(x); });
    return v.length ? Math.round(v.reduce(function (t, x) { return t + x; }, 0) / v.length * 100) / 100 : null;
  }

  var CSS = '.nh-wrap{border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:12px;margin:14px 0 96px;}' +
    '.nh-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;}' +
    '.nh-scroll{overflow:auto;max-height:68vh;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;}' +
    '.nh-tbl{border-collapse:separate;border-spacing:0;font-size:13px;border-top:1px solid rgba(128,128,128,.3);border-left:1px solid rgba(128,128,128,.3);}' +
    '.nh-tbl th,.nh-tbl td{border-right:1px solid rgba(128,128,128,.3);border-bottom:1px solid rgba(128,128,128,.3);padding:4px 6px;text-align:left;white-space:nowrap;background:#fff;}' +
    '.nh-tbl thead th{position:sticky;top:0;z-index:2;background:#f3f4f6;}' +
    '.nh-tbl th:first-child,.nh-tbl td:first-child{white-space:normal;word-break:break-word;min-width:104px;max-width:128px;position:sticky;left:0;z-index:1;}' +
    '.nh-tbl thead th:first-child{z-index:3;}' +
    'body.dark-mode .nh-tbl th,body.dark-mode .nh-tbl td{background:#1e293b;}body.dark-mode .nh-tbl thead th{background:#334155;}' +
    '.nh-tbl .nh-in{width:72px;min-height:44px !important;font-size:16px !important;text-align:center;padding:4px 6px;-moz-appearance:textfield;appearance:textfield;}' +
    '.nh-tbl .nh-in::-webkit-outer-spin-button,.nh-tbl .nh-in::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}' +
    '.nh-tbl .nh-jdl{width:76px;min-height:40px !important;font-size:14px !important;padding:4px 6px;}' +
    '.nh-tbl th .nh-x{display:block;width:100%;min-width:0;min-height:32px;margin-top:4px;padding:0;}' +
    '.nh-bad{border-color:#dc2626 !important;background:#fef2f2 !important;}.nh-cat{font-size:11px;opacity:.75;line-height:1.5;margin:6px 0;}' +
    '.nh-rata{font-weight:700;text-align:center !important;min-width:56px;}' +
    '.nh-stat{font-size:12px;font-weight:600;margin-left:auto;}.nh-stat.ok{color:#059669;}.nh-stat.err{color:#b91c1c;}.nh-stat.wait{opacity:.7;}' +
    '@media(max-width:600px){.nh-bar .btn{flex:1 1 140px;min-height:44px;}.nh-bar #nhTutup{flex:0 0 auto;padding-left:14px;padding-right:14px;}}';
  function pasangCss() {
    if (el('nhCss')) return;
    var s = document.createElement('style'); s.id = 'nhCss'; s.textContent = CSS; document.head.appendChild(s);
  }

  function konteks() {
    var kelas = el('gradesClassFilter') && el('gradesClassFilter').value;
    var mapel = el('gradeSubject') && el('gradeSubject').value;
    var sem = el('gradeSemester') && el('gradeSemester').value;
    if (!kelas || !mapel || !sem) return null;
    return { ta: currentTahunAjaran, kelas: kelas, mapel: mapel, sem: sem };
  }
  function daftarSiswaDiTabel() {
    var out = [], cont = el('gradesContainer'); if (!cont) return out;
    Array.prototype.forEach.call(cont.querySelectorAll('tbody tr'), function (tr) {
      var inp = tr.querySelector('.grade-input'); if (!inp) return;
      var td = tr.firstElementChild, nama = td && td.firstChild ? String(td.firstChild.textContent || '').trim() : inp.dataset.siswa;
      out.push({ key: inp.dataset.siswa, name: nama });
    });
    return out;
  }
  function bolehPakai(c) {
    try { return canEdit() && !isKepsek() && kelasDiizinkanNilai(c.kelas) && mapelDiizinkanNilai(c.kelas, c.mapel); } catch (e) { return false; }
  }

  // ---------- muat & simpan ----------
  function normKolom(k) {
    var arr = Array.isArray(k) ? k : Object.keys(k || {}).map(function (x) { return k[x]; });
    return arr.filter(function (x) { return x && x.id; }).map(function (x) { return { id: String(x.id), judul: String(x.judul || '') }; });
  }
  function kolomBawaan() { return [{ id: 'c1', judul: 'Penilaian 1' }, { id: 'c2', judul: 'Penilaian 2' }]; }

  function muat(c) {
    return db.ref(jalur(c)).once('value').then(function (sn) {
      var v = sn.val() || {};
      var kol = normKolom(v.kolom);
      return { kolom: kol.length ? kol : kolomBawaan(), nilai: v.nilai || {}, versi: v.versi || 0, meta: v.updatedAt ? { updatedBy: v.updatedBy, updatedAt: v.updatedAt } : null };
    });
  }

  function bersihNilai(st) {
    var out = {}, idOk = {};
    st.kolom.forEach(function (k) { idOk[k.id] = true; });
    st.siswa.forEach(function (s) {
      var n = st.nilai[s.key], baris = {}, ada = false;
      Object.keys(n || {}).forEach(function (cid) { if (idOk[cid] && typeof n[cid] === 'number' && isFinite(n[cid])) { baris[cid] = n[cid]; ada = true; } });
      if (ada) out[s.key] = baris;
    });
    return out;
  }

  // ---------- simpan otomatis ----------
  var JEDA = 1500, tunda = null, rantai = Promise.resolve(), daring = true;
  function offline() { return daring === false || (typeof navigator !== 'undefined' && navigator.onLine === false); }
  var TXT_OFFLINE = '📴 Offline: nilai aman di HP, dikirim otomatis saat online';
  function kunciDraf(c) { return 'nhDraf:' + jalur(c); }
  function simpanDraf() { try { if (st) localStorage.setItem(kunciDraf(st.c), JSON.stringify({ versi: st.versi, kolom: st.kolom, nilai: st.nilai, t: Date.now() })); } catch (e) {} }
  function hapusDraf(c) { try { localStorage.removeItem(kunciDraf(c)); } catch (e) {} }
  function terapkanDraf(c, d) {
    try {
      var dr = JSON.parse(localStorage.getItem(kunciDraf(c)) || 'null');
      if (dr && dr.versi === d.versi && dr.nilai && typeof dr.nilai === 'object') {
        var kol = normKolom(dr.kolom);
        return { kolom: kol.length ? kol : d.kolom, nilai: dr.nilai, versi: d.versi, meta: d.meta, draf: true };
      }
    } catch (e) {}
    return d;
  }
  function jam() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function statusS(S, txt, kls) {
    S.stat = [txt, kls];
    var x = el('nhStatus'); if (x && S.wadah && S.wadah.contains(x)) { x.textContent = txt; x.className = 'nh-stat ' + kls; }
  }
  function tandai() {
    st.dirty = true; st.rev = (st.rev || 0) + 1; simpanDraf();
    statusS(st, offline() ? TXT_OFFLINE : '● Belum tersimpan…', 'wait'); jadwal();
  }
  function jadwal() { clearTimeout(tunda); if (!st || st.mode === 'lihat' || st.konflik) return; tunda = setTimeout(autoSimpan, JEDA); }
  function simpanAman(diam, S) { var p = rantai.then(function () { return simpan(diam, S); }); rantai = p.catch(function () {}); return p; }
  function autoSimpan() {
    clearTimeout(tunda);
    var S = st; if (!S || !S.dirty || S.konflik || S.mode === 'lihat') return Promise.resolve(false);
    if (offline()) { statusS(S, TXT_OFFLINE, 'wait'); return Promise.resolve(false); }   // jangan antre transaksi yang menggantung; dikirim saat online lagi
    statusS(S, 'Menyimpan…', 'wait');
    return simpanAman(true, S).then(function (ok) { if (st === S && S.dirty && !S.konflik && !offline()) jadwal(); return ok; });
  }
  // Simpan dulu bila ada perubahan; tanya hanya jika gagal.
  function amankan(pesan, lanjut, batal) {
    if (!st || !st.dirty) return lanjut();
    autoSimpan().then(function (ok) {
      if (ok && !(st && st.dirty)) return lanjut();
      if (window.confirm(pesan)) lanjut(); else if (batal) batal();
    });
  }

  // diam = true untuk simpan otomatis (tanpa toast); S = keadaan panel yang disimpan
  function simpan(diam, S) {
    S = S || st;
    return new Promise(function (resolve) {
      if (!S) return resolve(false);
      if (S.wadah && S.wadah.querySelector('.nh-bad')) {
        if (diam) statusS(S, '⚠ Ada nilai tidak valid (0-100), belum tersimpan', 'err');
        else toastX('Ada nilai yang tidak valid (harus angka 0-100). Periksa kotak berwarna merah.', true, 5000);
        return resolve(false);
      }
      var c = S.c, ref = db.ref(jalur(c)), base = S.versi, rev0 = S.rev || 0;
      function gagal(m) {
        if (diam) { statusS(S, '⚠ Gagal menyimpan, mencoba lagi…', 'err'); setTimeout(function () { if (st === S && S.dirty && !S.konflik) autoSimpan(); }, 8000); }
        else toastX('Gagal menyimpan: ' + m, true);
        resolve(false);
      }
      function selesai(versi, meta) {
        S.versi = versi; S.meta = meta || S.meta; S.dirty = (S.rev || 0) !== rev0;
        if (!S.dirty) hapusDraf(c);
        statusS(S, S.dirty ? '● Belum tersimpan…' : '✓ Tersimpan ' + jam(), S.dirty ? 'wait' : 'ok');
        // Admin: tiap simpan manual dicatat di log; simpan otomatis dicatat sekali per pembukaan panel agar log tidak penuh.
        if (S.mode === 'admin' && (!diam || !S.sudahLog)) { S.sudahLog = true; try { addLog('ubah_catatan_nilai_harian', c.mapel + ' - ' + c.kelas + ' - ' + c.sem + ' - ' + labelNh(c.nh)); } catch (e) {} }
        resolve(true);
      }
      if (!S.kolom.length) {
        ref.remove(function (err) { if (err) gagal(err.message); else selesai(0, null); });
        return;
      }
      var doc = {
        kolom: S.kolom.map(function (k) { return { id: k.id, judul: (k.judul || 'Penilaian').slice(0, 40) }; }),
        nilai: bersihNilai(S), versi: 0,
        updatedBy: String((currentUser && currentUser.name) || '').slice(0, 100), updatedAt: new Date().toISOString()
      };
      ref.transaction(function (cur) {
        if (cur !== null && cur !== undefined) {
          var v = cur.versi ? cur.versi : 0;
          if (v !== base) return;          // diubah pengguna lain sejak dimuat -> batalkan
          doc.versi = v + 1;
        } else {
          doc.versi = base + 1;            // cache lokal kosong: Firebase menjalankan ulang dengan data server bila berbeda
        }
        return doc;
      }, function (err, committed) {
        if (err) return gagal(err.message);
        if (!committed) {
          S.konflik = true; statusS(S, '⚠ Diubah pengguna lain. Tutup panel lalu buka lagi.', 'err');
          toastX('Catatan ini sudah diubah pengguna lain. Tutup panel dan buka lagi untuk memuat versi terbaru.', true, 6000);
          return resolve(false);
        }
        selesai(doc.versi, { updatedBy: doc.updatedBy, updatedAt: doc.updatedAt });
      }, false);
    });
  }

  // ---------- panel ----------
  function htmlPanel() {
    var s = st, lihat = s.mode === 'lihat', guru = s.mode === 'guru', dis = lihat ? ' disabled' : '';
    var h = '<div class="nh-bar"><b>📝 Catatan Nilai Harian</b> untuk ' +
      '<select id="nhPilih" class="field" style="width:auto;">' + NH.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === s.c.nh ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
      (guru ? '<button type="button" class="btn btn-soft" id="nhTutup">Tutup</button>' : '') +
      (lihat ? '' : '<span id="nhStatus" class="nh-stat ' + esc(s.stat ? s.stat[1] : 'ok') + '">' + esc(s.stat ? s.stat[0] : 'Simpan otomatis aktif') + '</span>') + '</div>' +
      '<div class="nh-cat">' + esc(s.c.mapel) + ' · ' + esc(s.c.kelas) + ' · ' + esc(s.c.sem) +
      (s.meta && s.meta.updatedAt ? '. Terakhir disimpan oleh <b>' + esc(s.meta.updatedBy || '-') + '</b> pada ' + esc(String(s.meta.updatedAt).replace('T', ' ').slice(0, 16)) : '. Belum ada catatan tersimpan') + '.' +
      (guru ? ' Catat nilai tiap penilaian (kosongkan bila belum ada); perubahan tersimpan otomatis. Rata-rata hanya memakai kolom yang terisi. Yang masuk rapor tetap kotak NH di tabel nilai.' :
        lihat ? ' Tampilan lihat saja.' : ' Anda mengubah catatan milik guru; setiap penyimpanan dicatat di log. Nilai NH di rapor tidak ikut berubah.') + '</div>' +
      '<div class="nh-scroll"><table class="nh-tbl"><thead><tr><th>Nama</th>' +
      s.kolom.map(function (k) { return '<th><input class="field nh-jdl" data-jdl="' + esc(k.id) + '" maxlength="40" value="' + esc(k.judul) + '"' + dis + '>' + (lihat ? '' : '<button type="button" class="btn btn-soft nh-x" data-hapus="' + esc(k.id) + '" title="Hapus kolom">×</button>') + '</th>'; }).join('') +
      '<th>Rata-rata</th></tr></thead><tbody>' +
      s.siswa.map(function (x) {
        return '<tr data-baris="' + esc(x.key) + '"><td style="font-weight:600;">' + esc(x.name) + '</td>' +
          s.kolom.map(function (k) { var v = s.nilai[x.key] && s.nilai[x.key][k.id]; return '<td><input class="field nh-in" type="number" min="0" max="100" step="any" inputmode="decimal" enterkeyhint="next" data-s="' + esc(x.key) + '" data-c="' + esc(k.id) + '" value="' + (typeof v === 'number' ? v : '') + '"' + dis + '></td>'; }).join('') +
          '<td class="nh-rata" data-rata="' + esc(x.key) + '">' + fmt(rata(s.nilai[x.key], s.kolom)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    if (!lihat) {
      h += '<div class="nh-bar"><button type="button" class="btn" id="nhTambah"' + (s.kolom.length >= MAKS_KOLOM ? ' disabled' : '') + '>+ Tambah penilaian</button>' +
        (guru ? '<button type="button" class="btn btn-soft" id="nhAmbil">⬆ Ambil NH lama</button>' : '') +
        '<button type="button" class="btn btn-success" id="nhSimpan">💾 Simpan Catatan</button>' +
        (guru ? '<button type="button" class="btn btn-success" id="nhTerap">⬇ Terapkan rata-rata ke ' + labelNh(s.c.nh) + '</button>' : '') + '</div>';
    }
    if (guru) h += '<div class="nh-cat"><b>Ambil NH lama</b>: menyalin nilai ' + labelNh(s.c.nh) + ' yang sudah ada di tabel nilai ke kolom "NH lama" untuk siswa yang belum punya catatan (rincian per penilaian sebelumnya tidak tercatat). Nilai di tabel tidak berubah.</div>';
    if (guru) h += '<div class="nh-cat">Setelah diterapkan, tekan <b>Simpan Nilai</b> di tabel nilai agar ' + labelNh(s.c.nh) + ' tersimpan. Kotak yang sudah terkunci tidak diubah.</div>';
    return h;
  }

  function gambar() { if (st && st.wadah) st.wadah.innerHTML = htmlPanel(); }

  function hitungUlangBaris(key) {
    var cell = st.wadah && st.wadah.querySelector('[data-rata="' + key.replace(/"/g, '\\"') + '"]');
    if (cell) cell.textContent = fmt(rata(st.nilai[key], st.kolom));
  }

  function onInput(e) {
    var t = e.target; if (!st) return;
    if (t.classList.contains('nh-in')) {
      var s = t.dataset.s, c = t.dataset.c, raw = String(t.value || '').trim();
      if (!st.nilai[s]) st.nilai[s] = {};
      if (raw === '') { delete st.nilai[s][c]; t.classList.remove('nh-bad'); }
      else {
        var n = angka(raw);
        if (n === null || n < 0 || n > 100 || (t.validity && t.validity.badInput)) { t.classList.add('nh-bad'); delete st.nilai[s][c]; }
        else { t.classList.remove('nh-bad'); st.nilai[s][c] = n; }
      }
      tandai(); hitungUlangBaris(s);
    } else if (t.dataset && t.dataset.jdl) {
      st.kolom.forEach(function (k) { if (k.id === t.dataset.jdl) k.judul = t.value; });
      tandai();
    }
  }

  function tambahKolom() {
    if (st.kolom.length >= MAKS_KOLOM) return;
    var maks = 0; st.kolom.forEach(function (k) { var n = parseInt(String(k.id).replace(/\D/g, ''), 10) || 0; if (n > maks) maks = n; });
    st.kolom.push({ id: 'c' + (maks + 1), judul: 'Penilaian ' + (st.kolom.length + 1) });
    tandai(); gambar();
  }
  function hapusKolom(id) {
    var ada = st.siswa.some(function (s) { return st.nilai[s.key] && typeof st.nilai[s.key][id] === 'number'; });
    if (ada && !window.confirm('Kolom ini berisi nilai. Hapus kolom beserta nilainya?')) return;
    st.kolom = st.kolom.filter(function (k) { return k.id !== id; });
    st.siswa.forEach(function (s) { if (st.nilai[s.key]) delete st.nilai[s.key][id]; });
    tandai(); gambar();
  }

  // Salin nilai NH yang sudah ada di tabel nilai (diisi sebelum fitur catatan ada) ke kolom "NH lama"; tidak menimpa catatan yang sudah ada.
  function ambilNhLama() {
    var peta = {}, n = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.grade-input'), function (inp) {
      if (inp.dataset.key !== st.c.nh) return;
      var raw = String(inp.value || '').trim(), v = raw === '' ? null : angka(raw);
      if (v !== null && v >= 0 && v <= 100) peta[inp.dataset.siswa] = v;
    });
    if (!Object.keys(peta).length) return toastX('Belum ada nilai ' + labelNh(st.c.nh) + ' di tabel nilai.', true);
    var calon = st.siswa.filter(function (x) { return peta[x.key] !== undefined && rata(st.nilai[x.key], st.kolom) === null; });
    if (!calon.length) return toastX('Semua siswa yang punya nilai ' + labelNh(st.c.nh) + ' sudah ada catatannya.');
    var kol = null; st.kolom.forEach(function (k) { if (k.judul === 'NH lama') kol = k; });
    if (!kol) {
      if (st.kolom.length >= MAKS_KOLOM) return toastX('Kolom penuh. Hapus satu kolom kosong dulu.', true);
      var maks = 0; st.kolom.forEach(function (k) { var m = parseInt(String(k.id).replace(/\D/g, ''), 10) || 0; if (m > maks) maks = m; });
      kol = { id: 'c' + (maks + 1), judul: 'NH lama' }; st.kolom.unshift(kol);
    }
    calon.forEach(function (x) { if (!st.nilai[x.key]) st.nilai[x.key] = {}; st.nilai[x.key][kol.id] = peta[x.key]; n++; });
    tandai(); gambar();
    toastX(n + ' nilai ' + labelNh(st.c.nh) + ' lama disalin ke kolom "NH lama" dan disimpan otomatis.', false, 6000);
  }

  function terapkan() {
    simpanAman(false, st).then(function (ok) {
      if (!ok || !st) return;
      var peta = {};
      Array.prototype.forEach.call(document.querySelectorAll('.grade-input'), function (inp) { if (inp.dataset.key === st.c.nh) peta[inp.dataset.siswa] = inp; });
      var terisi = 0, terkunci = 0, kosong = 0, beda = [];
      st.siswa.forEach(function (s) {
        var a = rata(st.nilai[s.key], st.kolom);
        if (a === null) { kosong++; return; }
        var inp = peta[s.key];
        if (!inp || inp.disabled) { terkunci++; return; }
        var lama = String(inp.value || '').trim();
        if (lama !== '' && Math.abs(angka(lama) - a) > 1e-9) { beda.push({ inp: inp, a: a, nama: s.name }); return; }
        inp.value = a; terisi++;
      });
      if (beda.length && window.confirm(beda.length + ' siswa sudah punya ' + labelNh(st.c.nh) + ' yang berbeda dari rata-rata catatan (contoh: ' + beda[0].nama + '). Timpa dengan rata-rata catatan?')) {
        beda.forEach(function (b) { b.inp.value = b.a; terisi++; });
      }
      toastX(terisi + ' nilai ' + labelNh(st.c.nh) + ' diisi' + (terkunci ? ', ' + terkunci + ' terkunci dilewati' : '') + (kosong ? ', ' + kosong + ' belum ada catatan' : '') + '. Tekan Simpan Nilai untuk menyimpan.', false, 7000);
    });
  }

  function buka(nh) {
    var c = konteks(); if (!c) return toastX('Pilih kelas, mata pelajaran, dan semester dulu.', true);
    if (!bolehPakai(c)) return toastX('Anda tidak punya akses mencatat nilai kelas/mapel ini.', true);
    c.nh = nh || 'h1';
    var siswa = daftarSiswaDiTabel(); if (!siswa.length) return toastX('Tidak ada siswa di tabel nilai.', true);
    muat(c).then(function (d0) {
      var d = terapkanDraf(c, d0), w = el('nhPanel');
      if (!w) { w = document.createElement('div'); w.id = 'nhPanel'; w.className = 'nh-wrap'; el('gradesContainer').insertAdjacentElement('afterend', w); }
      st = { c: c, siswa: siswa, kolom: d.kolom, nilai: d.nilai, versi: d.versi, dirty: false, mode: 'guru', wadah: w, meta: d.meta };
      w.style.display = ''; pulihkanDraf(d); gambar();
    }, function (err) { toastX('Catatan tidak bisa dibaca: ' + (err && err.message ? err.message : err), true, 6000); });
  }
  function pulihkanDraf(d) {
    if (!d || !d.draf || !st) return;
    st.dirty = true; st.rev = 1;
    statusS(st, '● Draf dipulihkan, menyimpan…', 'wait');
    toastX('Draf yang belum sempat tersimpan dipulihkan dan akan disimpan otomatis.', false, 5000);
    jadwal();
  }
  function tutup() {
    amankan('Perubahan catatan belum tersimpan. Tutup tanpa menyimpan?', function () {
      clearTimeout(tunda); st = null; var w = el('nhPanel'); if (w) { w.style.display = 'none'; w.innerHTML = ''; }
    });
  }

  function onKlik(e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t || !st) return;
    if (t.id === 'nhTutup') tutup();
    else if (t.id === 'nhTambah') tambahKolom();
    else if (t.id === 'nhSimpan') simpanAman(false, st).then(function (ok) { if (ok) toastX('✅ Catatan nilai harian tersimpan.'); });
    else if (t.id === 'nhTerap') terapkan();
    else if (t.id === 'nhAmbil') ambilNhLama();
    else if (t.dataset && t.dataset.hapus) hapusKolom(t.dataset.hapus);
  }
  function onUbah(e) {
    if (e.target.id !== 'nhPilih' || !st) return;
    var baru = e.target.value, sel = e.target, nhLama = st.c.nh;
    amankan('Perubahan catatan belum tersimpan. Pindah ke ' + labelNh(baru) + ' tanpa menyimpan?', function () {
      clearTimeout(tunda);
      if (st.mode === 'guru') { st = null; buka(baru); }
      else { var c2 = { ta: st.c.ta, kelas: st.c.kelas, mapel: st.c.mapel, sem: st.c.sem, nh: baru }, md = st.mode; st = null; bukaAdmin(c2, md === 'lihat'); }
    }, function () { sel.value = nhLama; });
  }

  // ---------- pemasangan tombol (tabel nilai dirender ulang oleh app.js, jadi dipantau) ----------
  function pasangTombol() {
    var cont = el('gradesContainer'); if (!cont) return;
    if (cont.querySelector('#nhBtn')) return;                 // tombol masih ada: bukan render baru
    if (st && st.mode === 'guru') { if (st.dirty) autoSimpan(); clearTimeout(tunda); st = null; var w = el('nhPanel'); if (w) { w.style.display = 'none'; w.innerHTML = ''; } }   // render baru: panel lama kedaluwarsa
    if (!cont.querySelector('.grade-input') || !cont.querySelector('#btnSaveGrades')) return;
    var c = konteks(); if (!c || !bolehPakai(c)) return;
    var b = document.createElement('button');
    b.id = 'nhBtn'; b.type = 'button'; b.className = 'btn'; b.style.cssText = 'margin-top:12px;margin-left:8px;'; b.textContent = '📝 Catatan Nilai Harian';
    b.addEventListener('click', function () { buka('h1'); });
    cont.appendChild(b);
  }
  function mulai() {
    var cont = el('gradesContainer'); if (!cont) return;
    pasangCss();
    new MutationObserver(function () { pasangTombol(); }).observe(cont, { childList: true });
    document.addEventListener('input', function (e) { if (e.target && e.target.closest && e.target.closest('#nhPanel, #nhPanelAdmin')) onInput(e); });
    document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#nhPanel, #nhPanelAdmin')) onKlik(e); });
    document.addEventListener('change', function (e) { if (e.target && e.target.closest && e.target.closest('#nhPanel, #nhPanelAdmin')) onUbah(e); });
    document.addEventListener('focusin', function (e) {
      var t = e.target; if (!t || !t.classList || !t.classList.contains('nh-in') || !t.closest('#nhPanel, #nhPanelAdmin')) return;
      try { t.select(); } catch (x) {}
      setTimeout(function () { try { t.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (x) {} }, 350);   // tunggu keyboard muncul
    });
    document.addEventListener('keydown', function (e) {   // Enter -> kotak di bawahnya (kolom yang sama)
      var t = e.target; if (e.key !== 'Enter' || !st || !t || !t.classList || !t.classList.contains('nh-in') || !t.closest('#nhPanel, #nhPanelAdmin')) return;
      e.preventDefault();
      var all = Array.prototype.slice.call(st.wadah.querySelectorAll('.nh-in[data-c="' + t.dataset.c + '"]')), n = all[all.indexOf(t) + 1];
      if (n) n.focus(); else t.blur();
    });
    function kembaliOnline() {
      if (!st || st.mode === 'lihat' || st.konflik) return;
      if (st.dirty) autoSimpan(); else if (st.stat && st.stat[0] === TXT_OFFLINE) statusS(st, '✓ Online kembali', 'ok');
    }
    function jadiOffline() { if (st && st.dirty && st.mode !== 'lihat') statusS(st, TXT_OFFLINE, 'wait'); }
    window.addEventListener('online', function () { daring = true; kembaliOnline(); });
    window.addEventListener('offline', jadiOffline);
    try {   // status koneksi Firebase (menangkap kasus sinyal ada tapi server tak terjangkau)
      db.ref('.info/connected').on('value', function (sn) {
        var on = sn.val() === true; if (on === daring) return;
        daring = on; if (on) kembaliOnline(); else jadiOffline();
      });
    } catch (x) {}
    function lepas() { if (st && st.dirty && !st.konflik) autoSimpan(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) lepas(); });
    window.addEventListener('pagehide', lepas);
    window.addEventListener('beforeunload', function (e) { if (st && st.dirty && !st.konflik) { lepas(); e.preventDefault(); e.returnValue = ''; } });
    pasangTombol();
  }

  // ============================================================
  // HALAMAN ADMIN & KEPALA  (#page-catatan-nilai)
  // ============================================================
  function adminAtauKepala() { try { return isAdmin() || isKepsek(); } catch (e) { return false; } }
  function opsiMapel() {
    var html = '';
    try { if (typeof daftarMapelNilaiAsli === 'function') html = daftarMapelNilaiAsli(); } catch (e) {}
    if (html) return html;
    var set = {}; (allJadwal || []).forEach(function (j) { if (j && j.mapel) set[j.mapel] = true; });
    return Object.keys(set).sort().map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('');
  }
  function opsiSemester() { var e = el('gradeSemester'); return e && e.innerHTML ? e.innerHTML : '<option value="Ganjil">Ganjil</option><option value="Genap">Genap</option>'; }

  function bukaAdmin(c, bacaSaja) {
    if (!adminAtauKepala()) return;
    var wadah = el('nhPanelAdmin'); if (!wadah) return;
    var siswa = (allSiswa || []).filter(function (x) { return x.kelas === c.kelas; })
      .sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'id'); })
      .map(function (x) { return { key: x.key, name: x.name || x.key }; });
    if (!siswa.length) { wadah.style.display = 'none'; return toastX('Tidak ada siswa di ' + c.kelas + '.', true); }
    var lama = el('nhPanel'); if (lama) { lama.innerHTML = ''; lama.style.display = 'none'; }
    muat(c).then(function (d0) {
      var d = bacaSaja ? d0 : terapkanDraf(c, d0);
      st = { c: c, siswa: siswa, kolom: d.kolom, nilai: d.nilai, versi: d.versi, dirty: false, mode: bacaSaja ? 'lihat' : 'admin', wadah: wadah, meta: d.meta };
      wadah.style.display = ''; pulihkanDraf(d); gambar();
      try { wadah.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    }, function (err) { toastX('Catatan tidak bisa dibaca: ' + (err && err.message ? err.message : err), true, 6000); });
  }

  function cocokOpsi(selectHtml, kunciAman, bawaan) {
    var tmp = document.createElement('select'); tmp.innerHTML = selectHtml;
    var hasil = bawaan;
    Array.prototype.forEach.call(tmp.querySelectorAll('option'), function (o) { if (hasil === bawaan && aman(o.value) === kunciAman) hasil = o.value; });
    return hasil;
  }

  function muatDaftar() {
    var w = el('ncDaftar'); if (!w) return;
    w.innerHTML = '<div class="nh-cat">Memuat daftar catatan...</div>';
    db.ref('grades_harian/' + aman(currentTahunAjaran)).once('value').then(function (sn) {
      var v = sn.val() || {}, rows = [];
      Object.keys(v).forEach(function (k) { Object.keys(v[k] || {}).forEach(function (m) { Object.keys(v[k][m] || {}).forEach(function (sm) { Object.keys(v[k][m][sm] || {}).forEach(function (nh) {
        var d = v[k][m][sm][nh]; if (!d) return;
        rows.push({ kelas: k, mapel: m, sem: sm, nh: nh, kol: normKolom(d.kolom).length, siswa: Object.keys(d.nilai || {}).length, oleh: d.updatedBy || '-', waktu: d.updatedAt || '' });
      }); }); }); });
      rows.sort(function (a, b) { return (a.kelas + a.mapel + a.sem + a.nh).localeCompare(b.kelas + b.mapel + b.sem + b.nh, 'id'); });
      if (!rows.length) { w.innerHTML = '<div class="nh-cat">Belum ada guru yang menyimpan catatan nilai harian pada tahun ajaran ini.</div>'; return; }
      w.innerHTML = '<div class="nh-cat">' + rows.length + ' catatan tersimpan. Ketuk <b>Buka</b> untuk melihat' + (isAdmin() ? ' atau mengubah' : '') + '.</div><div class="nh-scroll"><table class="nh-tbl"><thead><tr><th>Kelas</th><th>Mapel</th><th>Smt</th><th>NH</th><th>Penilaian</th><th>Siswa terisi</th><th>Terakhir oleh</th><th></th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><td>' + esc(r.kelas) + '</td><td>' + esc(r.mapel) + '</td><td>' + esc(r.sem) + '</td><td>' + esc(labelNh(r.nh)) + '</td><td>' + r.kol + '</td><td>' + r.siswa + '</td><td>' + esc(r.oleh) + (r.waktu ? '<br><span style="opacity:.7;">' + esc(String(r.waktu).slice(0, 10)) + '</span>' : '') + '</td>' +
            '<td><button type="button" class="btn btn-soft" data-nc-kelas="' + esc(r.kelas) + '" data-nc-mapel="' + esc(r.mapel) + '" data-nc-sem="' + esc(r.sem) + '" data-nc-nh="' + esc(r.nh) + '">Buka</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    }, function () { w.innerHTML = '<div class="nh-cat" style="color:#b91c1c;">Daftar catatan tidak bisa dibaca (izin akses). Pastikan Rules node grades_harian sudah dipasang.</div>'; });
  }

  function renderHalaman() {
    var pg = el('page-catatan-nilai'); if (!pg) return;
    pasangCss();
    if (!adminAtauKepala()) { pg.innerHTML = '<div class="card"><p class="text-muted">Halaman ini hanya untuk Admin dan Kepala Madrasah.</p></div>'; return; }
    var sem = el('ncSem') && el('ncSem').value;
    pg.innerHTML = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📝 Catatan Nilai Harian</h3>' +
      '<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Catatan penilaian harian yang dibuat guru sebelum menjadi NH1/NH2/NH3. Tahun ajaran ' + esc(currentTahunAjaran) + '. ' + (isAdmin() ? 'Admin dapat mengubah catatan.' : 'Tampilan lihat saja.') + '</p>' +
      '<div class="nh-bar"><select id="ncKelas" class="field" style="width:auto;">' + (KELAS_LIST || []).map(function (k) { return '<option value="' + esc(k) + '">' + esc(k) + '</option>'; }).join('') + '</select>' +
      '<select id="ncMapel" class="field" style="width:auto;max-width:100%;">' + opsiMapel() + '</select>' +
      '<select id="ncSem" class="field" style="width:auto;">' + opsiSemester() + '</select>' +
      '<select id="ncNh" class="field" style="width:auto;">' + NH.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="btn btn-success" id="ncBuka">Buka</button> <button type="button" class="btn btn-soft" id="ncMuat">🔄 Muat ulang daftar</button></div>' +
      '<div id="nhPanelAdmin" class="nh-wrap" style="display:none;"></div>' +
      '<div class="kpi-h" style="font-size:14px;font-weight:700;margin:16px 0 6px;">Daftar Catatan Tersimpan</div><div id="ncDaftar"></div></div>';
    if (sem && el('ncSem')) el('ncSem').value = sem;
    muatDaftar();
  }

  function pasangHalaman() {
    var pg = el('page-catatan-nilai'); if (!pg) return;
    var tampilSebelumnya = false;
    new MutationObserver(function () {
      var tampil = !pg.classList.contains('hidden');
      if (tampil && !tampilSebelumnya) { try { renderHalaman(); } catch (e) { pg.innerHTML = '<div class="card"><p class="text-muted">Halaman gagal dimuat: ' + esc(e && e.message ? e.message : e) + '</p></div>'; } }
      if (!tampil) { if (st && st.mode !== 'guru') st = null; }
      tampilSebelumnya = tampil;
    }).observe(pg, { attributes: true, attributeFilter: ['class'] });
    var judul = el('pageTitle');   // menu terdaftar ganda di app.js -> navigateTo bisa menimpa judul; kembalikan
    if (judul) new MutationObserver(function () {
      if (pg.classList.contains('hidden')) return;
      if (judul.textContent !== 'Catatan Nilai Harian') judul.textContent = 'Catatan Nilai Harian';
    }).observe(judul, { childList: true, characterData: true, subtree: true });
    pg.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
      if (t.id === 'ncMuat') return muatDaftar();
      if (t.id === 'ncBuka') {
        var c = { ta: currentTahunAjaran, kelas: el('ncKelas').value, mapel: el('ncMapel').value, sem: el('ncSem').value, nh: el('ncNh').value };
        if (!c.kelas || !c.mapel) return toastX('Pilih kelas dan mata pelajaran.', true);
        return bukaAdmin(c, !isAdmin());
      }
      if (t.dataset && t.dataset.ncKelas) {
        var mp = cocokOpsi(opsiMapel(), aman(t.dataset.ncMapel), t.dataset.ncMapel);
        var sm = cocokOpsi(opsiSemester(), aman(t.dataset.ncSem), t.dataset.ncSem);
        var kl = (KELAS_LIST || []).filter(function (k) { return aman(k) === t.dataset.ncKelas; })[0] || t.dataset.ncKelas;
        if (el('ncKelas')) el('ncKelas').value = kl; if (el('ncMapel')) el('ncMapel').value = mp; if (el('ncSem')) el('ncSem').value = sm; if (el('ncNh')) el('ncNh').value = t.dataset.ncNh;
        bukaAdmin({ ta: currentTahunAjaran, kelas: kl, mapel: mp, sem: sm, nh: t.dataset.ncNh }, !isAdmin());
      }
    });
    function aturMenu() { Array.prototype.forEach.call(document.querySelectorAll('.menu-item[data-page="catatan-nilai"]'), function (m) { m.classList.toggle('hidden-tab', !adminAtauKepala()); }); }
    aturMenu(); setInterval(aturMenu, 2000);
  }
  function awal() { mulai(); pasangHalaman(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', awal); else awal();

  window.NilaiHarian = { rata: rata, aman: aman, jalur: jalur };
})();
