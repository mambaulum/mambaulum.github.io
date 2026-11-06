// ============================================================
// CATATAN NILAI HARIAN -- js/nilai-harian.js
// Dimuat SESUDAH js/app.js. Tidak mengubah app.js dan tidak mengubah cara nilai disimpan/dikunci.
//
// Alur: di halaman Nilai (kelas + mapel + semester terpilih), tombol "Catatan Nilai Harian" membuka panel.
// Guru mencatat beberapa penilaian harian (tugas, kuis, observasi, dst.) per siswa untuk NH1 / NH2 / NH3.
// Tombol "Terapkan rata-rata" mengisi kotak NH di tabel nilai dengan rata-ratanya (2 desimal), lalu guru menekan
// "Simpan Nilai" seperti biasa. Catatan mentah tersimpan di Firebase node grades_harian sebagai bukti.
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

  var CSS = '.nh-wrap{border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:12px;margin-top:14px;}' +
    '.nh-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;}' +
    '.nh-scroll{overflow-x:auto;}.nh-tbl{border-collapse:collapse;font-size:12px;}' +
    '.nh-tbl th,.nh-tbl td{border:1px solid rgba(128,128,128,.3);padding:4px 6px;text-align:left;white-space:nowrap;}' +
    '.nh-in{width:62px;padding:4px 6px;}.nh-jdl{width:110px;padding:4px 6px;}' +
    '.nh-bad{border-color:#dc2626 !important;}.nh-cat{font-size:11px;opacity:.75;line-height:1.5;margin:6px 0;}' +
    '.nh-rata{font-weight:700;}';
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
      return { kolom: kol.length ? kol : kolomBawaan(), nilai: v.nilai || {}, versi: v.versi || 0 };
    });
  }

  function bersihNilai() {
    var out = {}, idOk = {};
    st.kolom.forEach(function (k) { idOk[k.id] = true; });
    st.siswa.forEach(function (s) {
      var n = st.nilai[s.key], baris = {}, ada = false;
      Object.keys(n || {}).forEach(function (cid) { if (idOk[cid] && typeof n[cid] === 'number' && isFinite(n[cid])) { baris[cid] = n[cid]; ada = true; } });
      if (ada) out[s.key] = baris;
    });
    return out;
  }

  function simpan() {
    return new Promise(function (resolve) {
      if (!st) return resolve(false);
      if (el('nhPanel') && el('nhPanel').querySelector('.nh-bad')) { toastX('Ada nilai yang tidak valid (harus angka 0-100). Periksa kotak berwarna merah.', true, 5000); return resolve(false); }
      var c = st.c, ref = db.ref(jalur(c)), base = st.versi;
      if (!st.kolom.length) { ref.remove(function (err) { if (err) { toastX('Gagal menyimpan: ' + err.message, true); resolve(false); } else { st.versi = 0; st.dirty = false; resolve(true); } }); return; }
      var doc = {
        kolom: st.kolom.map(function (k) { return { id: k.id, judul: (k.judul || 'Penilaian').slice(0, 40) }; }),
        nilai: bersihNilai(), versi: 0,
        updatedBy: String((currentUser && currentUser.name) || '').slice(0, 100), updatedAt: new Date().toISOString()
      };
      ref.transaction(function (cur) {
        var v = cur && cur.versi ? cur.versi : 0;
        if (v !== base) return;            // diubah pengguna lain sejak dimuat -> batalkan
        doc.versi = v + 1; return doc;
      }, function (err, committed) {
        if (err) { toastX('Gagal menyimpan: ' + err.message, true); return resolve(false); }
        if (!committed) { toastX('Catatan ini sudah diubah pengguna lain. Tutup panel dan buka lagi untuk memuat versi terbaru.', true, 6000); return resolve(false); }
        st.versi = doc.versi; st.dirty = false; resolve(true);
      });
    });
  }

  // ---------- panel ----------
  function htmlPanel() {
    var s = st, h = '<div class="nh-bar"><b>📝 Catatan Nilai Harian</b> untuk ' +
      '<select id="nhPilih" class="field" style="width:auto;">' + NH.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === s.c.nh ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="btn btn-soft" id="nhTutup">Tutup</button></div>' +
      '<div class="nh-cat">' + esc(s.c.mapel) + ' · ' + esc(s.c.kelas) + ' · ' + esc(s.c.sem) + '. Catat nilai tiap penilaian (kosongkan bila belum ada). Rata-rata hanya memakai kolom yang terisi. Yang masuk rapor tetap kotak NH di tabel nilai.</div>' +
      '<div class="nh-scroll"><table class="nh-tbl"><thead><tr><th>Nama</th>' +
      s.kolom.map(function (k) { return '<th><input class="field nh-jdl" data-jdl="' + esc(k.id) + '" maxlength="40" value="' + esc(k.judul) + '"> <button type="button" class="btn btn-soft" data-hapus="' + esc(k.id) + '" title="Hapus kolom">×</button></th>'; }).join('') +
      '<th>Rata-rata → ' + labelNh(s.c.nh) + '</th></tr></thead><tbody>' +
      s.siswa.map(function (x) {
        return '<tr data-baris="' + esc(x.key) + '"><td style="font-weight:600;">' + esc(x.name) + '</td>' +
          s.kolom.map(function (k) { var v = s.nilai[x.key] && s.nilai[x.key][k.id]; return '<td><input class="field nh-in" type="number" min="0" max="100" step="any" inputmode="decimal" data-s="' + esc(x.key) + '" data-c="' + esc(k.id) + '" value="' + (typeof v === 'number' ? v : '') + '"></td>'; }).join('') +
          '<td class="nh-rata" data-rata="' + esc(x.key) + '">' + fmt(rata(s.nilai[x.key], s.kolom)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="nh-bar"><button type="button" class="btn" id="nhTambah"' + (s.kolom.length >= MAKS_KOLOM ? ' disabled' : '') + '>+ Tambah penilaian</button>' +
      '<button type="button" class="btn btn-success" id="nhSimpan">💾 Simpan Catatan</button>' +
      '<button type="button" class="btn btn-success" id="nhTerap">⬇ Terapkan rata-rata ke ' + labelNh(s.c.nh) + '</button></div>' +
      '<div class="nh-cat">Setelah diterapkan, tekan <b>Simpan Nilai</b> di tabel nilai agar ' + labelNh(s.c.nh) + ' tersimpan. Kotak yang sudah terkunci tidak diubah.</div>';
    return h;
  }

  function gambar() { var w = el('nhPanel'); if (w && st) w.innerHTML = htmlPanel(); }

  function hitungUlangBaris(key) {
    var cell = el('nhPanel') && el('nhPanel').querySelector('[data-rata="' + key.replace(/"/g, '\\"') + '"]');
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
      st.dirty = true; hitungUlangBaris(s);
    } else if (t.dataset && t.dataset.jdl) {
      st.kolom.forEach(function (k) { if (k.id === t.dataset.jdl) k.judul = t.value; });
      st.dirty = true;
    }
  }

  function tambahKolom() {
    if (st.kolom.length >= MAKS_KOLOM) return;
    var maks = 0; st.kolom.forEach(function (k) { var n = parseInt(String(k.id).replace(/\D/g, ''), 10) || 0; if (n > maks) maks = n; });
    st.kolom.push({ id: 'c' + (maks + 1), judul: 'Penilaian ' + (st.kolom.length + 1) });
    st.dirty = true; gambar();
  }
  function hapusKolom(id) {
    var ada = st.siswa.some(function (s) { return st.nilai[s.key] && typeof st.nilai[s.key][id] === 'number'; });
    if (ada && !window.confirm('Kolom ini berisi nilai. Hapus kolom beserta nilainya?')) return;
    st.kolom = st.kolom.filter(function (k) { return k.id !== id; });
    st.siswa.forEach(function (s) { if (st.nilai[s.key]) delete st.nilai[s.key][id]; });
    st.dirty = true; gambar();
  }

  function terapkan() {
    simpan().then(function (ok) {
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
    muat(c).then(function (d) {
      st = { c: c, siswa: siswa, kolom: d.kolom, nilai: d.nilai, versi: d.versi, dirty: false };
      var w = el('nhPanel');
      if (!w) { w = document.createElement('div'); w.id = 'nhPanel'; w.className = 'nh-wrap'; el('gradesContainer').insertAdjacentElement('afterend', w); }
      w.style.display = ''; gambar();
    }, function (err) { toastX('Catatan tidak bisa dibaca: ' + (err && err.message ? err.message : err), true, 6000); });
  }
  function tutup() {
    if (st && st.dirty && !window.confirm('Ada perubahan catatan yang belum disimpan. Tutup tanpa menyimpan?')) return;
    st = null; var w = el('nhPanel'); if (w) { w.style.display = 'none'; w.innerHTML = ''; }
  }

  function onKlik(e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t || !st) return;
    if (t.id === 'nhTutup') tutup();
    else if (t.id === 'nhTambah') tambahKolom();
    else if (t.id === 'nhSimpan') simpan().then(function (ok) { if (ok) toastX('✅ Catatan nilai harian tersimpan.'); });
    else if (t.id === 'nhTerap') terapkan();
    else if (t.dataset && t.dataset.hapus) hapusKolom(t.dataset.hapus);
  }
  function onUbah(e) {
    if (e.target.id !== 'nhPilih' || !st) return;
    var baru = e.target.value;
    if (st.dirty && !window.confirm('Ada perubahan catatan yang belum disimpan. Pindah ke ' + labelNh(baru) + ' tanpa menyimpan?')) { e.target.value = st.c.nh; return; }
    st = null; buka(baru);
  }

  // ---------- pemasangan tombol (tabel nilai dirender ulang oleh app.js, jadi dipantau) ----------
  function pasangTombol() {
    var cont = el('gradesContainer'); if (!cont) return;
    if (cont.querySelector('#nhBtn')) return;                 // tombol masih ada: bukan render baru
    if (st) { st = null; var w = el('nhPanel'); if (w) { w.style.display = 'none'; w.innerHTML = ''; } }   // render baru: panel lama kedaluwarsa
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
    document.addEventListener('input', function (e) { if (e.target && e.target.closest && e.target.closest('#nhPanel')) onInput(e); });
    document.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#nhPanel')) onKlik(e); });
    document.addEventListener('change', function (e) { if (e.target && e.target.closest && e.target.closest('#nhPanel')) onUbah(e); });
    pasangTombol();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();

  window.NilaiHarian = { rata: rata, aman: aman, jalur: jalur };
})();
