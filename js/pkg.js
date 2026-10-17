/* ============================================================
   SI MAMBA - js/pkg.js
   Menu "PKG Guru" (Penilaian Kinerja Guru MI) -- mengikuti Juknis PKG Madrasah
   (Kepdirjen Pendis 1843/2021), instrumen Guru Kelas/Mata Pelajaran (Lampiran I).

   WAJIB dimuat SESUDAH: js/data-pkg-mi.js, js/app.js, js/menu-hub.js
   Halaman (#page-pkg) dan item menu dibuat sendiri oleh file ini.

   Dependensi dari app.js (global): db, currentUser, allGuru, toast, escapeHtml,
   doubleConfirm, isAdmin, isKepsek, navigateTo, MADRASAH, currentTahunAjaran,
   addLog, KEPSEK_USER_KEY.

   NODE FIREBASE (semua baru -- WAJIB ditambah di Firebase Rules, lihat catatan):
     pkg_v4_periode/{periodeId}            : {nama, jenis, mulai, selesai, dibuatOleh, dibuatAt}
     pkg_v4_tugas/{periodeId}/{guruKey}    : {penilaiKey, penilaiNama, jadwal}
     pkg_v4_nilai/{periodeId}/{guruKey}    : {skor:{"k_i":0|1|2}, catatan:{"k_i":".."},
                                              status, hasil:{...}, penilaiKey, penilaiNama,
                                              persetujuan:{...}, diperbarui, ...}
   Skor disimpan sebagai peta datar "komponen_indikator" (bukan array) agar aman dari
   perilaku Firebase yang membuang elemen kosong pada array. Pemisah HARUS garis bawah:
   Firebase RTDB menolak kunci yang mengandung titik (. $ # [ ] /). Label tampilan
   ("1.1") dibuat terpisah dari kunci data ("1_1").

   ALUR STATUS (Juknis Bab III): belum -> draft -> diajukan (menunggu persetujuan guru)
        -> disetujui | keberatan (kembali ke penilai) -> ditetapkan (Kepala Madrasah)

   HAK AKSES (dicek di sisi klien. CATATAN: semua pengguna login ANONIM yang sama, sehingga Firebase
     Rules tidak bisa membedakan peran -- cek ini hanya penghalang UI, bukan keamanan sungguhan):
     Admin / Kepala Madrasah : kelola periode & penugasan, lihat semua, cetak rekap
     Penilai (guru/Kepala)   : mengisi nilai untuk guru yang ditugaskan padanya
     Guru                    : hanya melihat hasil sendiri, menyetujui / mengajukan keberatan
     Penilai tidak boleh menilai dirinya sendiri; satu penilai maks. 10 guru (Juknis).
============================================================ */
(function () {
  'use strict';
  if (window.__pkgLoaded) return;
  window.__pkgLoaded = true;

  var P = window.PKG_MI;
  if (!P || !P.komponen || typeof P.hitungPKG !== 'function' || typeof P.totalIndikator !== 'function') { console.warn('[PKG] js/data-pkg-mi.js belum dimuat / tidak lengkap.'); return; }

  var N = { periode: 'pkg_v4_periode', tugas: 'pkg_v4_tugas', nilai: 'pkg_v4_nilai' };
  var MAKS_GURU_PER_PENILAI = 10;
  var STATUS_LABEL = {
    belum: 'Belum dinilai', draft: 'Sedang dinilai', diajukan: 'Menunggu persetujuan guru',
    disetujui: 'Disetujui guru', keberatan: 'Guru keberatan', ditetapkan: 'Ditetapkan'
  };
  var STATUS_WARNA = {
    belum: '#6b7280', draft: '#b45309', diajukan: '#1d4ed8', disetujui: '#15803d', keberatan: '#b91c1c', ditetapkan: '#166534'
  };

  var S = { periodeList: {}, periodeId: null, tugas: {}, nilai: {}, tab: 'ringkasan', view: 'list', gk: null, draft: null, memuat: false, reqId: 0, userKey: null, menyimpan: false };

  // ---------- util ----------
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function root() { return $('page-pkg'); }
  function me() { return (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null; }
  function adm() { return typeof isAdmin === 'function' && isAdmin(); }
  function kep() { return typeof isKepsek === 'function' && isKepsek(); }
  function pesan(m, err) { if (typeof toast === 'function') toast(m, !!err); else alert(m); }
  function nowIso() { return new Date().toISOString(); }
  function fmtTgl(s) {
    if (!s) return '-';
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
    return isNaN(d) ? esc(s) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function f1(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }

  function guruAktif() {
    return (typeof allGuru !== 'undefined' ? allGuru : []).filter(function (g) { return g.role === 'guru' || g.role === 'wali_kelas'; })
      .sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
  }
  function namaGuru(key) {
    if (key === 'kepsek' || key === (typeof KEPSEK_USER_KEY !== 'undefined' ? KEPSEK_USER_KEY : '__kepsek__')) return 'Kepala Madrasah';
    var g = guruAktif().filter(function (x) { return x.key === key; })[0];
    return g ? g.name : key;
  }

  // peta datar -> array per komponen (untuk P.hitungPKG)
  function skorKeArray(skorMap) {
    var o = {};
    P.komponen.forEach(function (k) {
      o[k.no] = k.indikator.map(function (_, i) { var v = skorMap && skorMap[k.no + '_' + (i + 1)]; return (v === 0 || v === 1 || v === 2) ? v : null; });
    });
    return o;
  }
  function hitung(skorMap) { return P.hitungPKG(skorKeArray(skorMap)); }
  function jumlahTerisi(skorMap) { var h = hitung(skorMap), t = 0; h.komponen.forEach(function (c) { t += c.terisi; }); return t; }

  function statusDari(n) {
    if (!n || !n.skor || Object.keys(n.skor).length === 0) return n && n.status && n.status !== 'draft' ? n.status : 'belum';
    return n.status || 'draft';
  }
  function selesai(st) { return st === 'disetujui' || st === 'ditetapkan'; }

  // ---------- hak akses ----------
  function tugasDari(gk) { return S.tugas[gk] || null; }
  function penilaiYa(gk) { var u = me(), t = tugasDari(gk); return !!(u && t && t.penilaiKey === u.key); }
  function bolehMenilai(gk) { var u = me(); if (!u || gk === u.key) return false; return kep() || penilaiYa(gk); }
  function bolehKelola() { return adm() || kep(); }
  function lihatSemua() { return bolehKelola(); }
  function guruTampil() {
    var u = me(), semua = guruAktif();
    if (lihatSemua()) return semua;
    return semua.filter(function (g) { return g.key === u.key || penilaiYa(g.key); });
  }

  // ---------- muat data ----------
  function muat(cb) {
    var u = me(); if (!u) return;
    var rid = ++S.reqId;                                   // hanya pemuatan TERBARU yang boleh mengubah state
    var basi = function () { return rid !== S.reqId; };
    S.memuat = true; render();
    db.ref(N.periode).once('value').then(function (s) {
      if (basi()) return null;
      var list = s.val() || {};
      S.periodeList = list;
      if (!S.periodeId || !list[S.periodeId]) {
        var ids = Object.keys(list).sort(function (a, b) { return (list[a].dibuatAt || '').localeCompare(list[b].dibuatAt || ''); });
        S.periodeId = ids.length ? ids[ids.length - 1] : null;
      }
      var pid = S.periodeId;
      if (!pid) { S.tugas = {}; S.nilai = {}; return null; }
      return db.ref(N.tugas + '/' + pid).once('value').then(function (ts) {
        if (basi()) return null;
        var tugas = ts.val() || {};
        // Hak baca per anak: guru biasa hanya membaca nilainya sendiri.
        if (lihatSemua()) {
          return db.ref(N.nilai + '/' + pid).once('value').then(function (ns) {
            if (basi()) return;
            S.tugas = tugas; S.nilai = ns.val() || {};
          });
        }
        var kunci = {}; kunci[u.key] = 1;
        Object.keys(tugas).forEach(function (gk) { if (tugas[gk] && tugas[gk].penilaiKey === u.key) kunci[gk] = 1; });
        var nilai = {};
        return Promise.all(Object.keys(kunci).map(function (gk) {
          return db.ref(N.nilai + '/' + pid + '/' + gk).once('value').then(function (x) { if (x.val()) nilai[gk] = x.val(); }).catch(function () { /* ditolak Rules: abaikan */ });
        })).then(function () {
          if (basi()) return;
          S.tugas = tugas; S.nilai = nilai;
        });
      });
    }).then(function () { if (basi()) return; S.memuat = false; render(); if (cb) cb(); })
      .catch(function (e) {
        if (basi()) return;
        S.memuat = false; render();
        pesan('PKG: gagal memuat data (' + ((e && e.message) || e) + '). Pastikan Firebase Rules untuk pkg_v4_* sudah ditambahkan.', true);
      });
  }

  // ---------- gaya ----------
  function suntikGaya() {
    if ($('pkgStyle')) return;
    var st = document.createElement('style'); st.id = 'pkgStyle';
    st.textContent =
      '#page-pkg .pkg-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}' +
      '#page-pkg .pkg-tab{padding:7px 14px;border-radius:999px;border:1px solid #d1d5db;background:#fff;cursor:pointer;font-size:13px;font-weight:600;color:#374151}' +
      '#page-pkg .pkg-tab.on{background:#15803d;border-color:#15803d;color:#fff}' +
      '#page-pkg .pkg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px}' +
      '#page-pkg .pkg-stat{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:12px}' +
      '#page-pkg .pkg-stat b{display:block;font-size:22px;color:#15803d}' +
      '#page-pkg .pkg-stat span{font-size:12px;color:#6b7280}' +
      '#page-pkg .pkg-chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;color:#fff}' +
      '#page-pkg .pkg-bar{height:10px;border-radius:6px;background:#e5e7eb;overflow:hidden}' +
      '#page-pkg .pkg-bar i{display:block;height:100%;background:#15803d}' +
      '#page-pkg .pkg-komp{border:1px solid #e5e7eb;border-radius:14px;margin-bottom:10px;background:#fff}' +
      '#page-pkg .pkg-komp>summary{cursor:pointer;padding:11px 14px;font-weight:700;font-size:14px;list-style:none;display:flex;justify-content:space-between;gap:8px;align-items:center}' +
      '#page-pkg .pkg-ind{padding:10px 14px;border-top:1px solid #f3f4f6}' +
      '#page-pkg .pkg-ind p{margin:0 0 6px;font-size:13px}' +
      '#page-pkg .pkg-bukti{font-size:11.5px;color:#6b7280;margin:0 0 8px;padding-left:16px}' +
      '#page-pkg .pkg-opt{display:inline-flex;align-items:center;gap:5px;margin-right:8px;padding:5px 10px;border:1px solid #d1d5db;border-radius:10px;font-size:12.5px;cursor:pointer}' +
      '#page-pkg .pkg-opt input{margin:0}' +
      '#page-pkg .pkg-cat{width:100%;margin-top:6px;font-size:12px}' +
      '#page-pkg .pkg-sticky{position:sticky;bottom:0;background:#fff;border-top:1px solid #e5e7eb;padding:10px 4px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;z-index:5}' +
      '#page-pkg table{width:100%}' +
      // Mode gelap (body.dark-mode, sama dengan bagian lain aplikasi)
      'body.dark-mode #page-pkg .pkg-tab,body.dark-mode #page-pkg .pkg-stat,body.dark-mode #page-pkg .pkg-komp,body.dark-mode #page-pkg .pkg-sticky{background:#1f2937;border-color:#374151;color:#e5e7eb}' +
      'body.dark-mode #page-pkg .pkg-tab.on{background:#15803d;border-color:#15803d;color:#fff}' +
      'body.dark-mode #page-pkg .pkg-opt{border-color:#4b5563}' +
      'body.dark-mode #page-pkg .pkg-ind{border-top-color:#374151}' +
      'body.dark-mode #page-pkg .pkg-bar{background:#374151}' +
      'body.dark-mode #page-pkg .pkg-stat b{color:#4ade80}' +
      'body.dark-mode #page-pkg .pkg-stat span,body.dark-mode #page-pkg .pkg-bukti{color:#9ca3af}';
    document.head.appendChild(st);
  }

  // ---------- render ----------
  function chip(st) { return '<span class="pkg-chip" style="background:' + (STATUS_WARNA[st] || '#6b7280') + '">' + esc(STATUS_LABEL[st] || st) + '</span>'; }
  function predChip(h) {
    var w = { 'Sangat Baik': '#15803d', 'Baik': '#2563eb', 'Cukup': '#b45309', 'Kurang': '#c2410c', 'Buruk': '#b91c1c' }[h.sebutan] || '#6b7280';
    return '<span class="pkg-chip" style="background:' + w + '">' + esc(h.sebutan) + '</span>';
  }

  function render() {
    var r = root(); if (!r) return;
    suntikGaya();
    var u = me();
    if (!u) { r.innerHTML = ''; return; }
    if (S.memuat) { r.innerHTML = '<div class="card"><p class="text-muted">Memuat data PKG…</p></div>'; return; }
    var h = '<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<div><h3 style="margin:0;font-size:17px">📋 Penilaian Kinerja Guru (PKG)</h3>' +
      '<div class="text-muted" style="font-size:12px">Instrumen Guru Kelas/Mata Pelajaran &bull; Juknis PKG Madrasah (Kepdirjen Pendis 1843/2021)</div></div>' +
      '<div>' + periodeSelectHtml() + '</div></div></div>';
    if (!S.periodeId) {
      h += '<div class="card"><p>Belum ada periode PKG.' + (bolehKelola() ? ' Buat periode baru di bawah ini.' : ' Hubungi Admin / Kepala Madrasah.') + '</p></div>';
      if (bolehKelola()) h += pengaturanHtml();
      r.innerHTML = h; return;
    }
    if (S.view === 'form') { r.innerHTML = h + formHtml(); recalc(); return; }
    if (S.view === 'hasil') { r.innerHTML = h + hasilHtml(S.gk); return; }
    h += tabsHtml();
    if (S.tab === 'pengaturan' && bolehKelola()) h += pengaturanHtml();
    else if (S.tab === 'daftar') h += daftarHtml();
    else h += ringkasanHtml();
    r.innerHTML = h;
  }

  function periodeSelectHtml() {
    var ids = Object.keys(S.periodeList);
    if (!ids.length) return '';
    return '<select class="field" data-act="ganti-periode" style="min-width:190px">' + ids.sort().map(function (id) {
      return '<option value="' + esc(id) + '"' + (id === S.periodeId ? ' selected' : '') + '>' + esc(S.periodeList[id].nama || id) + '</option>';
    }).join('') + '</select>';
  }
  function tabsHtml() {
    var t = [['ringkasan', '🏠 Ringkasan'], ['daftar', '👨‍🏫 Daftar Guru']];
    if (bolehKelola()) t.push(['pengaturan', '⚙️ Pengaturan']);
    return '<div class="pkg-tabs">' + t.map(function (x) { return '<button type="button" class="pkg-tab' + (S.tab === x[0] ? ' on' : '') + '" data-act="tab" data-tab="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }

  // ----- Ringkasan -----
  function barisGuru() {
    return guruTampil().map(function (g) {
      var n = S.nilai[g.key], st = statusDari(n), t = tugasDari(g.key);
      var hs = (n && n.skor && Object.keys(n.skor).length && hasilTerlihat(g.key, st)) ? hitung(n.skor) : null;   // guru tidak melihat draft sendiri
      return { g: g, n: n, t: t, st: st, h: hs };
    });
  }
  function ringkasanHtml() {
    var rows = barisGuru(), lengkap = rows.filter(function (x) { return x.h && x.h.lengkap; });
    var cnt = { belum: 0, proses: 0, selesai: 0 }, dist = { 'Sangat Baik': 0, 'Baik': 0, 'Cukup': 0, 'Kurang': 0, 'Buruk': 0 }, rata = 0;
    rows.forEach(function (x) {
      if (selesai(x.st)) cnt.selesai++; else if (x.st === 'belum') cnt.belum++; else cnt.proses++;
      if (x.h && x.h.lengkap) { dist[x.h.sebutan]++; rata += x.h.nilai100; }
    });
    var h = '<div class="pkg-grid">' +
      stat(rows.length, 'Jumlah guru') + stat(cnt.belum, 'PKG belum dilaksanakan') + stat(cnt.proses, 'Sedang dinilai / menunggu guru') + stat(cnt.selesai, 'Sudah selesai') +
      stat(lengkap.length ? f1(rata / lengkap.length) : '-', 'Nilai rata-rata') + '</div>';
    h += '<div class="card"><h4 style="margin:0 0 8px">Distribusi predikat</h4>' + ['Sangat Baik', 'Baik', 'Cukup', 'Kurang', 'Buruk'].map(function (p) {
      var pct = lengkap.length ? dist[p] / lengkap.length * 100 : 0;
      return '<div style="display:flex;gap:8px;align-items:center;margin:5px 0;font-size:13px"><span style="width:90px">' + p + '</span><div class="pkg-bar" style="flex:1"><i style="width:' + pct + '%"></i></div><b style="width:28px;text-align:right">' + dist[p] + '</b></div>';
    }).join('') + '<div class="text-muted" style="font-size:11px;margin-top:6px">Hanya guru dengan penilaian lengkap (semua indikator terisi) yang dihitung.</div></div>';
    // rata-rata nilai komponen (1-4)
    if (lengkap.length) {
      h += '<div class="card"><h4 style="margin:0 0 8px">Rata-rata nilai per komponen (skala 1–4)</h4>' + P.komponen.map(function (k, idx) {
        var s = 0; lengkap.forEach(function (x) { s += x.h.komponen[idx].nilai; });
        var avg = s / lengkap.length;
        return '<div style="display:flex;gap:8px;align-items:center;margin:5px 0;font-size:12px"><span style="flex:0 0 46%">' + k.no + '. ' + esc(k.nama) + '</span><div class="pkg-bar" style="flex:1"><i style="width:' + (avg / 4 * 100) + '%"></i></div><b style="width:32px;text-align:right">' + f1(avg) + '</b></div>';
      }).join('') + '</div>';
    }
    return h;
  }
  function stat(v, l) { return '<div class="pkg-stat"><b>' + esc(String(v)) + '</b><span>' + esc(String(l)) + '</span></div>'; }
  // Guru yang dinilai baru boleh melihat/mencetak hasilnya setelah diajukan penilai (bukan saat masih draft).
  function hasilTerlihat(gk, st) {
    var u = me();
    if (u && gk === u.key) return st !== 'belum' && st !== 'draft';
    return true;
  }

  // ----- Daftar guru -----
  function daftarHtml() {
    var rows = barisGuru(), u = me();
    if (!rows.length) return '<div class="card"><p class="text-muted">Tidak ada guru yang bisa ditampilkan untuk Anda pada periode ini.</p></div>';
    var h = '<div class="card" style="overflow-x:auto"><table><thead><tr><th>No</th><th>Nama Guru</th><th>Penilai</th><th>Jadwal</th><th>Status</th><th>Nilai</th><th>Predikat</th><th></th></tr></thead><tbody>';
    rows.forEach(function (x, i) {
      var gk = x.g.key, tombol = '';
      if (bolehMenilai(gk) && !selesai(x.st) && x.st !== 'diajukan') tombol += '<button class="btn btn-primary" style="padding:4px 10px;font-size:12px" data-act="nilai" data-gk="' + esc(gk) + '">' + (x.st === 'belum' ? 'Nilai' : 'Lanjut') + '</button> ';
      var boleh = hasilTerlihat(gk, x.st);
      if (x.h && boleh) tombol += '<button class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="hasil" data-gk="' + esc(gk) + '">Lihat</button> ';
      if (x.h && boleh && (gk === u.key || bolehMenilai(gk) || lihatSemua())) tombol += '<button class="btn btn-soft" style="padding:4px 10px;font-size:12px" data-act="cetak" data-gk="' + esc(gk) + '">🖨️</button>';
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.g.name) + '</td><td>' + (x.t ? esc(x.t.penilaiNama || namaGuru(x.t.penilaiKey)) : '<span class="text-muted">belum ditugaskan</span>') + '</td><td>' + (x.t && x.t.jadwal ? fmtTgl(x.t.jadwal) : '-') +
        '</td><td>' + chip(x.st) + '</td><td>' + (x.h && boleh ? (x.h.lengkap ? f1(x.h.nilai100) : '<span class="text-muted">' + jumlahTerisi(x.n.skor) + '/' + P.totalIndikator() + ' terisi</span>') : '-') +
        '</td><td>' + (x.h && boleh && x.h.lengkap ? predChip(x.h) : '-') + '</td><td style="white-space:nowrap">' + tombol + '</td></tr>';
    });
    h += '</tbody></table></div>';
    if (lihatSemua()) h += '<div style="margin-top:8px"><button class="btn btn-success" data-act="cetak-rekap">🖨️ Cetak Rekap Nilai (semua guru)</button></div>';
    return h;
  }

  // ----- Pengaturan (admin / kepala) -----
  function pengaturanHtml() {
    var h = '<div class="card"><h4 style="margin:0 0 8px">➕ Periode PKG baru</h4><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<div style="flex:2;min-width:170px"><label class="label">Nama periode</label><input id="pkgPerNama" class="field" placeholder="PKG ' + esc(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '') + '"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Jenis</label><select id="pkgPerJenis" class="field"><option value="PKG">PKG (tahunan)</option><option value="PKG Awal">PKG Awal (guru baru/mutasi)</option></select></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Mulai</label><input id="pkgPerMulai" type="date" class="field"></div>' +
      '<div style="flex:1;min-width:130px"><label class="label">Selesai</label><input id="pkgPerSelesai" type="date" class="field"></div></div>' +
      '<button class="btn btn-success" style="margin-top:8px" data-act="buat-periode">💾 Buat Periode</button>' +
      '<p class="text-muted" style="font-size:11.5px;margin:8px 0 0">Menurut Juknis, PKG dilaksanakan sepanjang tahun; penilaian akhir mulai 8 minggu sebelum akhir tahun anggaran dan laporan dianjurkan selesai pertengahan Desember.</p></div>';
    if (!S.periodeId) return h;
    var gurus = guruAktif(), opsi = [{ key: (typeof KEPSEK_USER_KEY !== 'undefined' ? KEPSEK_USER_KEY : '__kepsek__'), name: 'Kepala Madrasah' }].concat(gurus.map(function (g) { return { key: g.key, name: g.name }; }));
    h += '<div class="card" style="overflow-x:auto"><h4 style="margin:0 0 8px">👥 Penugasan Penilai &mdash; ' + esc(S.periodeList[S.periodeId].nama || '') + '</h4>' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px">Penilai tidak boleh menilai dirinya sendiri, dan satu penilai maksimal ' + MAKS_GURU_PER_PENILAI + ' guru (Juknis). Kepala Madrasah dapat menjadi penilai.</p>' +
      '<table><thead><tr><th>Guru</th><th>Penilai</th><th>Jadwal pengamatan</th></tr></thead><tbody>';
    gurus.forEach(function (g) {
      var t = S.tugas[g.key] || {};
      h += '<tr><td>' + esc(g.name) + '</td><td><select class="field" data-pen="' + esc(g.key) + '"><option value="">— belum ditugaskan —</option>' +
        opsi.filter(function (o) { return o.key !== g.key; }).map(function (o) { return '<option value="' + esc(o.key) + '"' + (t.penilaiKey === o.key ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('') +
        '</select></td><td><input type="date" class="field" data-jad="' + esc(g.key) + '" value="' + esc(t.jadwal || '') + '"></td></tr>';
    });
    h += '</tbody></table><button class="btn btn-success" style="margin-top:8px" data-act="simpan-tugas">💾 Simpan Penugasan</button></div>';
    return h;
  }

  // ----- Form penilaian -----
  function formHtml() {
    var gk = S.gk, g = guruAktif().filter(function (x) { return x.key === gk; })[0], d = S.draft;
    var h = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><h4 style="margin:0">Penilaian: ' + esc(g ? g.name : gk) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Skor: 0 = tidak ada bukti &bull; 1 = terpenuhi sebagian &bull; 2 = terpenuhi seluruhnya</div></div>' +
      '<button class="btn btn-soft" data-act="kembali">← Kembali</button></div></div>';
    P.komponen.forEach(function (k) {
      h += '<details class="pkg-komp"' + (k.no === 1 ? ' open' : '') + '><summary><span>' + k.no + '. ' + esc(k.nama) + ' <span class="text-muted" style="font-weight:400;font-size:11px">(' + esc(k.kompetensi) + ')</span></span><span id="pkgKomp' + k.no + '" class="pkg-chip" style="background:#6b7280">–</span></summary>';
      k.indikator.forEach(function (ind, i) {
        var key = k.no + '_' + (i + 1), label = k.no + '.' + (i + 1), v = d.skor[key];
        h += '<div class="pkg-ind"><p><b>' + label + '</b> ' + esc(ind.t) + '</p><ul class="pkg-bukti">' + ind.b.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
          [0, 1, 2].map(function (s) { return '<label class="pkg-opt"><input type="radio" name="sk_' + k.no + '_' + (i + 1) + '" data-k="' + k.no + '" data-i="' + (i + 1) + '" value="' + s + '"' + (v === s ? ' checked' : '') + '> ' + s + '</label>'; }).join('') +
          '<input class="field pkg-cat" data-cat="' + key + '" placeholder="Catatan fakta / bukti yang ditemukan (opsional)" value="' + esc(d.catatan[key] || '') + '"></div>';
      });
      h += '</details>';
    });
    h += '<div class="pkg-sticky"><div id="pkgTotal" style="font-size:13px"></div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-soft" data-act="simpan-draft">💾 Simpan Draft</button>' +
      '<button class="btn btn-success" data-act="ajukan">📨 Ajukan ke Guru</button></div></div>';
    return h;
  }

  function recalc() {
    if (S.view !== 'form' || !S.draft) return;
    var h = hitung(S.draft.skor);
    h.komponen.forEach(function (c, i) {
      var e = $('pkgKomp' + (i + 1)); if (!e) return;
      e.textContent = c.terisi === 0 ? '–' : (c.total + '/' + c.maks + ' → nilai ' + c.nilai);
      e.style.background = c.lengkap ? '#15803d' : '#6b7280';
    });
    var t = $('pkgTotal');
    if (t) t.innerHTML = '<b>' + jumlahTerisi(S.draft.skor) + '/' + P.totalIndikator() + '</b> indikator terisi' + (h.lengkap ? ' &bull; Jumlah <b>' + h.jumlah + '/' + h.tertinggi + '</b> &bull; Nilai <b>' + f1(h.nilai100) + '</b> (' + esc(h.sebutan) + ')' : '');
  }

  // ----- Hasil (guru / penilai / kepala) -----
  function hasilHtml(gk) {
    var n = S.nilai[gk], u = me();
    if (!u) return '';
    if (!n || !n.skor || !hasilTerlihat(gk, statusDari(n))) return '<div class="card"><p>Belum ada hasil.</p><button class="btn btn-soft" data-act="kembali">← Kembali</button></div>';
    var st = statusDari(n), h = hitung(n.skor);
    var lemah = h.komponen.map(function (c, i) { return { k: P.komponen[i], c: c }; }).filter(function (x) { return x.c.lengkap && x.c.nilai <= 2; });
    var o = '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><h4 style="margin:0">Hasil PKG: ' + esc(namaGuru(gk)) + '</h4>' +
      '<div class="text-muted" style="font-size:12px">Penilai: ' + esc(n.penilaiNama || namaGuru(n.penilaiKey)) + ' &bull; ' + chip(st) + '</div></div>' +
      '<button class="btn btn-soft" data-act="kembali">← Kembali</button></div>';
    if (h.lengkap) o += '<div class="pkg-grid" style="margin-top:10px">' + stat(h.jumlah + ' / ' + h.tertinggi, 'Jumlah nilai komponen') + stat(f1(h.nilai100), 'Nilai PKG (skala 100)') + '<div class="pkg-stat"><span>Predikat</span><br>' + predChip(h) + '</div>' + stat(h.npk + '%', 'NPK') + '</div>';
    else o += '<p class="text-muted">Penilaian belum lengkap (' + jumlahTerisi(n.skor) + '/' + P.totalIndikator() + ' indikator).</p>';
    o += '<table><thead><tr><th>No</th><th>Komponen</th><th>Skor</th><th>%</th><th>Nilai (1–4)</th></tr></thead><tbody>' + h.komponen.map(function (c, i) {
      var k = P.komponen[i];
      return '<tr><td>' + k.no + '</td><td>' + esc(k.nama) + ' <span class="text-muted" style="font-size:11px">(' + esc(k.kompetensi) + ')</span></td><td>' + c.total + '/' + c.maks + '</td><td>' + f1(c.persen) + '%</td><td><b>' + (c.terisi ? c.nilai : '-') + '</b></td></tr>';
    }).join('') + '</tbody></table>';
    if (lemah.length) o += '<div style="margin-top:10px;font-size:13px"><b>Komponen yang perlu diprioritaskan dalam PKB</b> (nilai 1–2): ' + lemah.map(function (x) { return x.k.no + '. ' + esc(x.k.nama); }).join('; ') + '.</div>';
    o += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">';
    if (gk === u.key && st === 'diajukan') o += '<button class="btn btn-success" data-act="setuju">✅ Saya Setuju</button><button class="btn btn-warning" data-act="keberatan">⚠️ Ajukan Keberatan</button>';
    if (kep() && st === 'disetujui') o += '<button class="btn btn-success" data-act="tetapkan" data-gk="' + esc(gk) + '">📌 Tetapkan (Kepala Madrasah)</button>';
    if (kep() && st === 'keberatan') o += '<button class="btn btn-soft" data-act="nilai" data-gk="' + esc(gk) + '">✏️ Buka untuk direvisi penilai</button>';
    o += '<button class="btn btn-soft" data-act="cetak" data-gk="' + esc(gk) + '">🖨️ Cetak Laporan</button></div>';
    if (st === 'keberatan' && n.persetujuan && n.persetujuan.alasan) o += '<div style="margin-top:10px;padding:10px;border-radius:10px;background:#fef2f2;font-size:13px"><b>Alasan keberatan guru:</b> ' + esc(n.persetujuan.alasan) + '<br><span class="text-muted">Juknis: difasilitasi internal oleh Kepala Madrasah; bila belum selesai, dilaporkan ke Kantor Kemenag untuk penilaian ulang.</span></div>';
    return o + '</div>';
  }

  // ---------- aksi ----------
  function bukaForm(gk) {
    if (!bolehMenilai(gk)) return pesan('Anda tidak ditugaskan sebagai penilai untuk guru ini.', true);
    var st0 = statusDari(S.nilai[gk]);
    if (selesai(st0) || st0 === 'diajukan') return pesan('Penilaian ini sudah diajukan / final dan tidak dapat diubah.', true);
    var n = S.nilai[gk] || {};
    S.gk = gk; S.view = 'form';
    S.draft = { skor: JSON.parse(JSON.stringify(n.skor || {})), catatan: JSON.parse(JSON.stringify(n.catatan || {})) };
    // Pulihkan draft lokal yang belum sempat tersimpan ke server (mis. halaman tertutup di tengah pengisian).
    var lok = null;
    try { lok = JSON.parse(localStorage.getItem(kunciLokal()) || 'null'); } catch (e) { lok = null; }
    if (lok && lok.d && lok.d.skor && Object.keys(lok.d.skor).length && (!n.diperbarui || lok.t > Date.parse(n.diperbarui))) {
      S.draft = { skor: lok.d.skor, catatan: lok.d.catatan || {} };
      pesan('Draft yang belum tersimpan dipulihkan dari perangkat ini.');
    }
    render();
  }
  // Simpan otomatis ke perangkat selama form terbuka; dihapus begitu berhasil disimpan ke server.
  function kunciLokal() { var u = me(); return 'pkg_draft_' + (S.periodeId || '') + '_' + (S.gk || '') + '_' + (u ? u.key : ''); }
  function simpanLokal() { try { if (S.view === 'form' && S.draft) localStorage.setItem(kunciLokal(), JSON.stringify({ t: Date.now(), d: S.draft })); } catch (e) { /* penyimpanan penuh/diblokir: abaikan */ } }
  function hapusLokal() { try { localStorage.removeItem(kunciLokal()); } catch (e) { } }
  // Draft lokal berisi catatan penilaian; hapus yang sudah > 14 hari supaya tidak menumpuk di perangkat bersama.
  function bersihkanDraftLama() {
    try {
      var batas = Date.now() - 14 * 24 * 3600 * 1000, hapus = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!k || k.indexOf('pkg_draft_') !== 0) continue;
        var v = null; try { v = JSON.parse(localStorage.getItem(k)); } catch (e) { v = null; }
        if (!v || !v.t || v.t < batas) hapus.push(k);
      }
      hapus.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { }
  }
  function rekamHasil(skor) { var h = hitung(skor); return { jumlah: h.jumlah, tertinggi: h.tertinggi, nilai100: Math.round(h.nilai100 * 100) / 100, sebutan: h.sebutan, npk: h.npk, lengkap: h.lengkap }; }

  // Batas waktu: set()/update() Firebase tidak pernah selesai saat offline -> tanpa batas, tombol macet.
  function denganBatas(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('Koneksi lambat atau terputus. Coba lagi.')); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  // Satu aksi tulis pada satu waktu (cegah klik ganda / simpan ganda).
  function kerjakan(buat, ok, awalan) {
    if (S.menyimpan) return;
    S.menyimpan = true;
    var p; try { p = denganBatas(Promise.resolve(buat()), 20000); } catch (e) { p = Promise.reject(e); }
    return p.then(function (v) { S.menyimpan = false; if (ok) ok(v); },
      function (e) { S.menyimpan = false; pesan((awalan || 'Gagal: ') + ((e && e.message) || e), true); });
  }
  // Baca ulang data terbaru, pastikan perubahan status MASIH diizinkan, baru tulis. Mencegah menimpa status
  // yang sudah berubah dari perangkat lain (mis. guru sudah menyetujui, penilai masih memegang form lama).
  // Ini best-effort di sisi klien, bukan pengganti Rules/auth per-user.
  function ubahNilai(uid, izin, perubahan) {
    var ref = db.ref(N.nilai + '/' + S.periodeId + '/' + uid);
    return ref.once('value').then(function (s) {
      var cur = s.val() || {};
      if (!izin(cur)) throw new Error('Status data sudah berubah (mungkin dari perangkat lain). Muat ulang halaman.');
      return ref.update(perubahan).then(function () { return Object.assign({}, cur, perubahan); });
    });
  }

  function simpanNilai(status, ok) {
    var gk = S.gk, u = me(), t = tugasDari(gk) || {};
    if (!u || !bolehMenilai(gk)) return pesan('Tidak berhak menilai guru ini.', true);
    var data = {
      skor: S.draft.skor, catatan: S.draft.catatan, status: status, hasil: rekamHasil(S.draft.skor),
      penilaiKey: t.penilaiKey || u.key, penilaiNama: t.penilaiNama || namaGuru(t.penilaiKey || u.key),
      diperbarui: nowIso(), diperbaruiOleh: u.name || u.key
    };
    if (status === 'diajukan') { data.persetujuan = null; data.diajukanAt = nowIso(); }
    kerjakan(function () {
      return ubahNilai(gk, function (cur) { var st = statusDari(cur); return !(selesai(st) || st === 'diajukan'); }, data);
    }, function (baru) {
      S.nilai[gk] = baru;
      hapusLokal();
      if (typeof addLog === 'function') addLog('PKG ' + status, namaGuru(gk));
      if (ok) ok();
    }, 'Gagal menyimpan: ');
  }

  function aksi(act, el) {
    var gk = el.getAttribute('data-gk') || S.gk, u = me();
    if (act === 'tab') { S.tab = el.getAttribute('data-tab'); S.view = 'list'; return render(); }
    if (act === 'kembali') { S.view = 'list'; return render(); }
    if (act === 'nilai') return bukaForm(gk);
    if (act === 'hasil') {
      if (!hasilTerlihat(gk, statusDari(S.nilai[gk]))) return pesan('Hasil belum diajukan oleh penilai.', true);
      S.gk = gk; S.view = 'hasil'; return render();
    }
    if (act === 'cetak') return cetakLaporan(gk);
    if (act === 'cetak-rekap') return cetakRekap();
    if (act === 'simpan-draft') return simpanNilai('draft', function () { pesan('Draft tersimpan.'); });
    if (act === 'ajukan') {
      var terisi = jumlahTerisi(S.draft.skor);
      if (terisi < P.totalIndikator()) return pesan('Masih ada ' + (P.totalIndikator() - terisi) + ' indikator yang belum diberi skor.', true);
      return simpanNilai('diajukan', function () { pesan('Hasil diajukan ke guru untuk persetujuan.'); S.view = 'hasil'; render(); });
    }
    if (act === 'setuju') {
      if (!u) return;
      var upd = { status: 'disetujui', persetujuan: { setuju: true, tanggal: nowIso(), oleh: u.name || u.key } };
      return kerjakan(function () { return ubahNilai(u.key, function (c) { return statusDari(c) === 'diajukan'; }, upd); },
        function (baru) { S.nilai[u.key] = baru; if (typeof addLog === 'function') addLog('PKG setuju', namaGuru(u.key)); pesan('Terima kasih, persetujuan tercatat.'); render(); });
    }
    if (act === 'keberatan') {
      if (!u) return;
      var alasan = prompt('Tuliskan alasan keberatan Anda atas hasil penilaian:');
      if (alasan === null) return;
      alasan = alasan.trim(); if (!alasan) return pesan('Alasan keberatan wajib diisi.', true);
      var upd2 = { status: 'keberatan', persetujuan: { setuju: false, alasan: alasan, tanggal: nowIso(), oleh: u.name || u.key } };
      return kerjakan(function () { return ubahNilai(u.key, function (c) { return statusDari(c) === 'diajukan'; }, upd2); },
        function (baru) { S.nilai[u.key] = baru; if (typeof addLog === 'function') addLog('PKG keberatan', namaGuru(u.key)); pesan('Keberatan tercatat dan diteruskan ke Kepala Madrasah.'); render(); });
    }
    if (act === 'tetapkan') {
      if (!u || !kep()) return;
      var upd3 = { status: 'ditetapkan', ditetapkanAt: nowIso(), ditetapkanOleh: u.name || u.key };
      return kerjakan(function () { return ubahNilai(gk, function (c) { return statusDari(c) === 'disetujui'; }, upd3); },
        function (baru) { S.nilai[gk] = baru; if (typeof addLog === 'function') addLog('PKG tetapkan', namaGuru(gk)); pesan('Hasil PKG ditetapkan.'); render(); });
    }
    if (act === 'buat-periode') return buatPeriode();
    if (act === 'simpan-tugas') return simpanTugas();
  }

  function buatPeriode() {
    if (!bolehKelola()) return;
    var eNama = $('pkgPerNama'), eJenis = $('pkgPerJenis'), eMulai = $('pkgPerMulai'), eSel = $('pkgPerSelesai');
    if (!eNama || !eJenis || !eMulai || !eSel) return;
    var nama = (eNama.value || '').trim() || ('PKG ' + (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : new Date().getFullYear()));
    var jenis = eJenis.value, mulai = eMulai.value, sel = eSel.value;
    if (mulai && sel && sel < mulai) return pesan('Tanggal selesai tidak boleh sebelum tanggal mulai.', true);
    var dobel = Object.keys(S.periodeList).some(function (id) { return String(S.periodeList[id].nama || '').toLowerCase() === nama.toLowerCase() && S.periodeList[id].jenis === jenis; });
    if (dobel && !confirm('Periode dengan nama dan jenis yang sama sudah ada. Tetap buat periode baru?')) return;
    var ref = db.ref(N.periode).push(), u = me();
    kerjakan(function () {
      return ref.set({ nama: nama, jenis: jenis, mulai: mulai || null, selesai: sel || null, dibuatOleh: u.name || u.key, dibuatAt: nowIso() });
    }, function () {
      S.periodeId = ref.key; if (typeof addLog === 'function') addLog('PKG buat periode', nama);
      pesan('Periode dibuat.'); muat();
    }, 'Gagal membuat periode: ');
  }

  function simpanTugas() {
    if (!bolehKelola() || !S.periodeId) return;
    var r = root(); if (!r) return;
    var jad = {}, upd = {}, hitungPen = {}, masalah = null, diganti = [];
    Array.prototype.forEach.call(r.querySelectorAll('input[data-jad]'), function (i) { jad[i.getAttribute('data-jad')] = i.value; });
    Array.prototype.forEach.call(r.querySelectorAll('select[data-pen]'), function (sel) {
      var gk = sel.getAttribute('data-pen'), pk = sel.value;   // dibaca dari atribut: aman untuk kunci berkarakter khusus
      if (!pk) { upd[gk] = null; return; }
      if (pk === gk) masalah = namaGuru(gk) + ' tidak boleh menilai dirinya sendiri.';
      hitungPen[pk] = (hitungPen[pk] || 0) + 1;
      var lama = S.tugas[gk], n = S.nilai[gk];
      if (lama && lama.penilaiKey !== pk && n && statusDari(n) !== 'belum') diganti.push(namaGuru(gk));
      upd[gk] = { penilaiKey: pk, penilaiNama: namaGuru(pk), jadwal: jad[gk] ? jad[gk] : null };
    });
    if (masalah) return pesan(masalah, true);
    var lebih = Object.keys(hitungPen).filter(function (k) { return hitungPen[k] > MAKS_GURU_PER_PENILAI; });
    if (lebih.length) return pesan(namaGuru(lebih[0]) + ' ditugaskan menilai ' + hitungPen[lebih[0]] + ' guru; batas Juknis maksimal ' + MAKS_GURU_PER_PENILAI + ' guru per penilai.', true);
    if (diganti.length && !confirm('Penilai untuk ' + diganti.join(', ') + ' diganti padahal penilaiannya sudah berjalan. Lanjutkan?')) return;
    var pid = S.periodeId;
    kerjakan(function () { return db.ref(N.tugas + '/' + pid).update(upd); }, function () {
      if (typeof addLog === 'function') addLog('PKG penugasan penilai', (S.periodeList[pid] || {}).nama || pid);
      pesan('Penugasan tersimpan.'); muat();
    }, 'Gagal menyimpan: ');
  }

  // ---------- cetak (F4) ----------
  function bukaCetak(judul, isi) {
    var w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return pesan('Popup diblokir browser.', true);
    var logo = ''; try { logo = new URL('logo/logo-lembaga.png', location.href).href; } catch (e) { }
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : { nama: 'MADRASAH', alamat: '' };
    var kop = '<div style="display:flex;gap:12px;align-items:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:12px">' +
      (logo ? '<img src="' + esc(logo) + '" style="width:64px;height:64px;object-fit:contain" onerror="this.style.display=\'none\'">' : '') +
      '<div style="text-align:center;flex:1"><div style="font-weight:700;font-size:15px">' + esc(M.nama) + '</div><div style="font-size:11px">' + esc(M.alamat || M.jalan || '') + '</div></div></div>';
    var dokAwal = ('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(judul) + '</title><style>@page{size:215mm 330mm;margin:14mm}body{font-family:Arial,sans-serif;font-size:12px;color:#000}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #000;padding:4px 6px;vertical-align:top}th{background:#eee}h3{text-align:center;margin:6px 0 10px;font-size:14px}.ttd{display:flex;justify-content:space-around;margin-top:28px;text-align:center}.ttd>div{width:30%}.noprint{margin-bottom:10px}@media print{.noprint{display:none}}</style></head><body><div class="noprint"><button onclick="window.print()">🖨️ Cetak</button></div>' + kop + isi + '</body></html>');
    // Tanda tangan QR (ttd-digital.js): penanda [[TTD:...]] diganti QR/gambar. Jendela sudah dibuka sinkron
    // di atas supaya tidak diblokir popup; isinya ditulis setelah QR selesai dibuat.
    var tanpaTtd = function (t) { return t.replace(/\[\[TTD:[a-z_]+:[^\]\s]+\]\]/g, ''); };
    w.document.write('<!doctype html><meta charset="utf-8"><title>' + esc(judul) + '</title><body style="font-family:Arial,sans-serif;padding:24px">Menyiapkan dokumen…</body>');
    w.document.close();
    var siap = (window.TTD && typeof window.TTD.isiHtml === 'function')
      ? window.TTD.isiHtml(dokAwal).catch(function () { return tanpaTtd(dokAwal); })
      : Promise.resolve(tanpaTtd(dokAwal));
    siap.then(function (dok) { w.document.open(); w.document.write(dok); w.document.close(); });
  }

  // Blok Kepala Madrasah pada cetakan. QR verifikasi hanya dibuat bila diminta DAN yang mencetak Admin/Kepsek
  // (opsi hanyaPimpinan); selain itu tersedia ruang kosong untuk tanda tangan basah.
  function blokKepalaCetak(denganQr, jenis, ket) {
    var M = (typeof MADRASAH !== 'undefined') ? MADRASAH : {};
    var nama = M.kepala_sekolah || '................................';
    var qr = (denganQr && window.TTD && typeof window.TTD.penanda === 'function')
      ? window.TTD.penanda('kepala', { jenis: jenis, ket: ket }, { hanyaPimpinan: true }) : '';
    return '<div>Kepala Madrasah/Atasan Langsung<div style="min-height:22mm;display:flex;align-items:flex-end;justify-content:center">' + qr + '</div>(' + esc(nama) + ')' +
      (M.nip_kepala_sekolah ? '<br>NIP. ' + esc(M.nip_kepala_sekolah) : '') + '</div>';
  }

  function cetakLaporan(gk) {
    var n = S.nilai[gk]; if (!n || !n.skor || !hasilTerlihat(gk, statusDari(n))) return pesan('Belum ada hasil untuk dicetak.', true);
    var per = S.periodeList[S.periodeId] || {}, h = hitung(n.skor), t = tugasDari(gk) || {};
    if (!h.lengkap) return pesan('Laporan belum bisa dicetak: penilaian belum lengkap (' + jumlahTerisi(n.skor) + '/' + P.totalIndikator() + ' indikator terisi).', true);
    var o = '<h3>LAPORAN DAN EVALUASI<br>PENILAIAN KINERJA GURU KELAS/MATA PELAJARAN</h3>' +
      '<table><tr><td style="width:30%">Nama Guru</td><td>' + esc(namaGuru(gk)) + '</td></tr><tr><td>Nama Madrasah</td><td>' + esc((typeof MADRASAH !== 'undefined' && MADRASAH.nama) || '') + '</td></tr>' +
      '<tr><td>Periode penilaian</td><td>' + esc(per.nama || '') + ' (' + esc(per.jenis || 'PKG') + ')' + (per.mulai ? ', ' + fmtTgl(per.mulai) + ' s.d. ' + fmtTgl(per.selesai) : '') + '</td></tr>' +
      '<tr><td>Penilai</td><td>' + esc(n.penilaiNama || namaGuru(n.penilaiKey)) + '</td></tr>' +
      (t.jadwal ? '<tr><td>Tanggal pengamatan</td><td>' + fmtTgl(t.jadwal) + '</td></tr>' : '') + '</table>';
    o += '<table><thead><tr><th>No</th><th>Indikator kinerja</th><th style="width:40px">Skor</th><th style="width:30%">Catatan</th></tr></thead><tbody>';
    P.komponen.forEach(function (k, ki) {
      var c = h.komponen[ki];
      o += '<tr><td colspan="4" style="background:#f5f5f5"><b>' + k.no + '. ' + esc(k.nama) + '</b> (' + esc(k.kompetensi) + ') &mdash; skor ' + c.total + '/' + c.maks + ' &bull; ' + f1(c.persen) + '% &bull; <b>nilai ' + c.nilai + '</b></td></tr>';
      k.indikator.forEach(function (ind, i) {
        var key = k.no + '_' + (i + 1), label = k.no + '.' + (i + 1), v = n.skor[key];
        o += '<tr><td>' + label + '</td><td>' + esc(ind.t) + '</td><td style="text-align:center">' + (v == null ? '-' : v) + '</td><td>' + esc((n.catatan && n.catatan[key]) || '') + '</td></tr>';
      });
    });
    o += '</tbody></table>';
    o += '<h3 style="page-break-before:always">REKAP HASIL PENILAIAN KINERJA GURU KELAS/MATA PELAJARAN</h3>' +
      '<table><thead><tr><th>No</th><th>Kompetensi / Komponen</th><th style="width:60px">Nilai (1–4)</th></tr></thead><tbody>';
    var last = '';
    P.komponen.forEach(function (k, ki) {
      if (k.kompetensi !== last) { o += '<tr><td colspan="3"><b>' + esc(k.kompetensi) + '</b></td></tr>'; last = k.kompetensi; }
      o += '<tr><td>' + k.no + '</td><td>' + esc(k.nama) + '</td><td style="text-align:center">' + h.komponen[ki].nilai + '</td></tr>';
    });
    o += '<tr><td colspan="2"><b>Jumlah (hasil penilaian kinerja guru)</b></td><td style="text-align:center"><b>' + h.jumlah + '</b></td></tr></tbody></table>' +
      '<p>Nilai PKG (skala 100) = ' + h.jumlah + ' / ' + h.tertinggi + ' &times; 100 = <b>' + f1(h.nilai100) + '</b> &mdash; Sebutan: <b>' + esc(h.sebutan) + '</b> (NPK ' + h.npk + '%)</p>';
    o += '<p style="font-size:11px">Persetujuan: ' + (n.persetujuan && n.persetujuan.setuju ? 'guru yang dinilai telah menyatakan setuju pada ' + fmtTgl(n.persetujuan.tanggal) + '.' : 'belum ada persetujuan guru.') + '</p>';
    o += '<div class="ttd"><div>Guru yang Dinilai<br><br><br><br>(' + esc(namaGuru(gk)) + ')</div><div>Penilai<br><br><br><br>(' + esc(n.penilaiNama || namaGuru(n.penilaiKey)) + ')</div>' + blokKepalaCetak(statusDari(n) === 'ditetapkan', 'Laporan PKG', 'PKG ' + namaGuru(gk) + ' | ' + (per.nama || '') + ' | Nilai ' + f1(h.nilai100) + ' (' + h.sebutan + ')') + '</div>';
    bukaCetak('Laporan PKG - ' + namaGuru(gk), o);
  }

  function cetakRekap() {
    if (!lihatSemua()) return;
    var per = S.periodeList[S.periodeId] || {}, rows = barisGuru();
    var o = '<h3>REKAP NILAI PENILAIAN KINERJA GURU<br>' + esc(per.nama || '') + '</h3><table><thead><tr><th>No</th><th>Nama Guru</th><th>Penilai</th>' +
      P.komponen.map(function (k) { return '<th>' + k.no + '</th>'; }).join('') + '<th>Jumlah</th><th>Nilai</th><th>Sebutan</th><th>Status</th></tr></thead><tbody>';
    rows.forEach(function (x, i) {
      var h = x.h;
      o += '<tr><td>' + (i + 1) + '</td><td>' + esc(x.g.name) + '</td><td>' + esc(x.t ? (x.t.penilaiNama || namaGuru(x.t.penilaiKey)) : '-') + '</td>' +
        P.komponen.map(function (k, ki) { return '<td style="text-align:center">' + (h && h.komponen[ki].terisi ? h.komponen[ki].nilai : '-') + '</td>'; }).join('') +
        '<td style="text-align:center">' + (h && h.lengkap ? h.jumlah : '-') + '</td><td style="text-align:center">' + (h && h.lengkap ? f1(h.nilai100) : '-') + '</td><td>' + (h && h.lengkap ? esc(h.sebutan) : '-') + '</td><td>' + esc(STATUS_LABEL[x.st] || x.st) + '</td></tr>';
    });
    o += '</tbody></table><p style="font-size:10px">Kolom 1–' + P.komponen.length + ' = nilai komponen (1–4). Nilai = jumlah / ' + (P.komponen.length * 4) + ' × 100. Sebutan: ≥91 Sangat Baik, 76–90 Baik, 61–75 Cukup, 51–60 Kurang, ≤50 Buruk.</p>' +
      '<div class="ttd"><div></div><div></div>' + blokKepalaCetak(true, 'Rekap Nilai PKG', 'Rekap ' + (per.nama || '') + ' | ' + rows.length + ' guru') + '</div>';
    bukaCetak('Rekap PKG', o);
  }

  // ---------- pemasangan ke aplikasi ----------
  function pasang() {
    bersihkanDraftLama();
    var dash = $('page-dashboard');
    if (dash && !root()) {
      var div = document.createElement('div'); div.id = 'page-pkg'; div.className = 'page-content hidden';
      dash.parentNode.appendChild(div);
      div.addEventListener('click', function (ev) {
        var el = ev.target.closest('[data-act]'); if (!el || !div.contains(el)) return;
        if (el.tagName === 'SELECT') return;
        aksi(el.getAttribute('data-act'), el);
      });
      div.addEventListener('change', function (ev) {
        var t = ev.target;
        if (t.getAttribute && t.getAttribute('data-act') === 'ganti-periode') { S.periodeId = t.value; S.view = 'list'; return muat(); }
        if (t.matches && t.matches('input[type=radio][data-k]') && S.draft) { S.draft.skor[t.getAttribute('data-k') + '_' + t.getAttribute('data-i')] = parseInt(t.value, 10); simpanLokal(); recalc(); }
      });
      div.addEventListener('input', function (ev) {
        var t = ev.target;
        if (t.getAttribute && t.getAttribute('data-cat') && S.draft) { S.draft.catatan[t.getAttribute('data-cat')] = t.value; simpanLokal(); }
      });
    }
    var grup = document.querySelector('.menu-group[data-group="operasional-v4"] .menu-group-items');
    if (grup && !grup.querySelector('[data-page="pkg"]')) {
      var item = document.createElement('div'); item.className = 'menu-item'; item.setAttribute('data-page', 'pkg');
      item.innerHTML = '<span class="icon">📋</span> PKG Guru';
      item.addEventListener('click', function () { if (typeof navigateTo === 'function') navigateTo('pkg'); });
      grup.appendChild(item);
    }
    aturMenu();
  }

  // app.js (menuRules) hanya menyembunyikan item bernilai false; 'pkg' tidak ada di sana sehingga tampil untuk semua peran.
  // Hanya Admin, Kepala Madrasah, dan guru (termasuk wali kelas) yang relevan.
  function bolehMenu() {
    var u = me(); if (!u) return true;
    return adm() || kep() || u.role === 'teacher' || u.role === 'wali_kelas';
  }
  function aturMenu() {
    var it = document.querySelector('#v4SidebarMenu .menu-item[data-page="pkg"]');
    if (it) it.classList.toggle('hidden-tab', !bolehMenu());
  }

  function bukaHalaman() {
    var t = $('pageTitle'); if (t) t.textContent = 'PKG Guru';
    var u = me();
    // Pengguna berganti (logout/login) di tab yang sama: jangan bawa data/draft pengguna sebelumnya.
    if (u && S.userKey !== u.key) { S.userKey = u.key; S.periodeList = {}; S.periodeId = null; S.tugas = {}; S.nilai = {}; S.draft = null; S.gk = null; S.tab = 'ringkasan'; }
    S.view = 'list';
    if (u && !bolehKelola() && S.tab === 'pengaturan') S.tab = 'ringkasan';
    muat();
  }

  var terakhirBuka = 0;
  var navAsli = window.navigateTo;
  if (typeof navAsli === 'function') {
    window.navigateTo = function (page) {
      var hasil = navAsli.apply(this, arguments);
      if (page === 'pkg') {
        // Cegah pemuatan ganda bila klik menu juga ditangani pendengar lain (app.js/menu-hub.js).
        var sekarang = Date.now();
        if (sekarang - terakhirBuka > 400) { terakhirBuka = sekarang; bukaHalaman(); }
      }
      return hasil;
    };
  }

  // v4ApplyMode (app.js) menghitung ulang kelas hidden-tab tiap login / ganti mode kerja -> terapkan lagi aturan PKG sesudahnya.
  var modeAsli = window.v4ApplyMode;
  if (typeof modeAsli === 'function') {
    window.v4ApplyMode = function () { var r = modeAsli.apply(this, arguments); try { aturMenu(); } catch (e) { } return r; };
  }

  window.pkgRender = render;
  window.pkgMuat = muat;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();
})();
