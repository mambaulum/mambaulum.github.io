/* ============================================================
   SI MAMBA - js/dashboard-sikap.js (v2)
   Kartu "Sikap & Kedisiplinan" di Dashboard (Home), lengkap dengan grafik donat.

   - Hanya MEMBACA data yang sudah dimuat app.js (allKedisiplinan, allSiswa). Tidak ada query Firebase baru,
     jadi tidak menambah kuota unduhan paket Spark. Cakupan data sudah mengikuti peran (Admin/Kepsek: semua kelas,
     guru/wali: kelasnya) karena allKedisiplinan dimuat lewat loaderScopeKelas().
   - Grafik donat digambar dengan SVG murni (tanpa Chart.js), jadi Home tidak ikut mengunduh library grafik.
   - Tidak mengubah js/app.js: membungkus updateDashboard() (pola sama seperti angket-keunggulan.js).
   - v2: (a) peringatan "perlu pembinaan" bila total poin pelanggaran siswa (tahun ajaran ini) mencapai ambang yang diatur Admin
         (school_settings/sikapAmbang; 0 = nonaktif), (b) perbandingan antar kelas (ketuk baris = saring kelas), (c) tren 6 bulan
         dengan pembanding ▲▼ bulan lalu. Ambang dibaca lewat listener anak school_settings (data sudah ada di cache listener
         school_settings milik app.js, jadi tidak mengunduh ulang).
   - Halaman Sikap Siswa (js/sikap-buku.js) tetap ada untuk input dan riwayat lengkap; kartu ini hanya ringkasannya.
   - Dimuat SESUDAH app.js. Butuh: allKedisiplinan, allSiswa, loaderScopeKelas, sikapCanAccess, tglLokal,
     currentTahunAjaran, escapeHtml, navigateTo, db, isAdmin, tulisSettingsAdmin, toast (semuanya dari app.js).
============================================================ */
(function () {
  'use strict';

  var PERIODE = [
    { k: '7h', t: '7 hari' },
    { k: 'bulan', t: 'Bulan ini' },
    { k: 'ta', t: 'Tahun ajaran' }
  ];
  var WARNA = { prestasi: '#10b981', pelanggaran: '#ef4444' };
  var state = { periode: 'ta', kelas: '' };
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var ambang = 0, ambangPasang = false;   // ambang poin pelanggaran untuk pembinaan (0 = nonaktif)

  function esc(s) {
    s = String(s == null ? '' : s);
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  function geserHari(tgl, n) {
    var p = String(tgl).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function tglPendek(t) {
    t = String(t || '');
    return t.length >= 10 ? t.slice(8, 10) + '/' + t.slice(5, 7) : (t || '-');
  }
  function poin(d) { return Number(d && d.poin) || 0; }
  // Nama kelas di aplikasi sudah memuat kata "Kelas" (mis. "Kelas 3"); jangan digandakan.
  function labelKelas(k) { k = String(k == null ? '' : k); return /^kelas\b/i.test(k) ? k : 'Kelas ' + k; }

  function bolehTampil() {
    try {
      return typeof currentUser !== 'undefined' && !!currentUser &&
        typeof sikapCanAccess === 'function' && sikapCanAccess();
    } catch (e) { return false; }
  }

  // ---------- Data ----------
  function dataDasar(abaikanKelas) {
    var semua = (typeof allKedisiplinan !== 'undefined' && Array.isArray(allKedisiplinan)) ? allKedisiplinan : [];
    var scope = (typeof loaderScopeKelas === 'function') ? loaderScopeKelas() : [];
    var ta = (typeof currentTahunAjaran !== 'undefined') ? currentTahunAjaran : '';
    return semua.filter(function (d) {
      return d && (d.jenis === 'prestasi' || d.jenis === 'pelanggaran') &&
        scope.indexOf(d.kelas) >= 0 &&
        (abaikanKelas || !state.kelas || d.kelas === state.kelas) &&
        (!ta || !d.tahunAjaran || d.tahunAjaran === ta);
    });
  }
  function batasPeriode() {
    var today = tglLokal();
    if (state.periode === '7h') return geserHari(today, -6);
    if (state.periode === 'bulan') return today.slice(0, 7) + '-01';
    return '';
  }


  // ---------- Ambang pembinaan (school_settings/sikapAmbang) ----------
  function pasangAmbang() {
    if (ambangPasang) return;
    if (typeof db === 'undefined' || !db) return;
    ambangPasang = true;
    try {
      db.ref('school_settings/sikapAmbang').on('value', function (snap) {
        var v = Number(snap.val());
        ambang = (isFinite(v) && v > 0) ? Math.floor(v) : 0;
        try { render(); } catch (e) { console.warn('[SI MAMBA] dashboard-sikap:', e); }
      }, function () { ambangPasang = false; });
    } catch (e) { ambangPasang = false; }
  }
  function aturAmbang() {
    if (!(typeof isAdmin === 'function' && isAdmin())) return;
    var v = prompt('Batas total poin pelanggaran per siswa (tahun ajaran ini) untuk ditandai "perlu pembinaan".\nIsi 0 untuk menonaktifkan.', String(ambang));
    if (v === null) return;
    var n = parseInt(String(v).trim(), 10);
    if (!isFinite(n) || n < 0 || n > 1000) { if (typeof toast === 'function') toast('Isi angka 0 sampai 1000', true); return; }
    if (typeof tulisSettingsAdmin !== 'function') return;
    tulisSettingsAdmin('school_settings', { sikapAmbang: n }, function (err) {
      if (typeof toast !== 'function') return;
      if (err) toast('Gagal menyimpan ambang: ' + (err.message || err), true);
      else toast(n > 0 ? 'Ambang pembinaan disimpan: ' + n + ' poin' : 'Peringatan pembinaan dinonaktifkan');
    });
  }

  // ---------- Tren 6 bulan (SVG) ----------
  function kunciBulan(tgl, geser) {
    var p = String(tgl).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1 + geser, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function deltaChip(cur, prev, bagus) {   // bagus: 'turun' (pelanggaran) atau 'naik' (prestasi)
    if (cur === prev) return '<span class="dsk-dl">sama dengan bulan lalu</span>';
    var naik = cur > prev, baik = (bagus === 'naik') ? naik : !naik;
    return '<span class="dsk-dl ' + (baik ? 'ok' : 'bad') + '">' + (naik ? '▲' : '▼') + ' ' + Math.abs(cur - prev) + ' dari bulan lalu</span>';
  }
  function tren(dasar) {
    var today = tglLokal(), kunci = [], nama = [];
    for (var i = 5; i >= 0; i--) { var k = kunciBulan(today, -i); kunci.push(k); nama.push(BLN[Number(k.slice(5, 7)) - 1]); }
    var pl = kunci.map(function () { return 0; }), pr = pl.slice();
    dasar.forEach(function (d) {
      var ix = kunci.indexOf(String(d.tanggal || '').slice(0, 7));
      if (ix < 0) return;
      if (d.jenis === 'pelanggaran') pl[ix]++; else pr[ix]++;
    });
    var maks = Math.max.apply(null, pl.concat(pr).concat([2]));
    if (maks % 2) maks++;
    var W = 300, H = 124, kiri = 24, kanan = 10, atas = 10, bawah = 24, lebar = W - kiri - kanan, tinggi = H - atas - bawah;
    var X = function (i) { return kiri + i * lebar / 5; }, Y = function (v) { return atas + (1 - v / maks) * tinggi; };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dsk-tren" role="img" aria-label="Tren catatan sikap 6 bulan terakhir">';
    [0, maks / 2, maks].forEach(function (g) {
      svg += '<line class="dsk-gl" x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + Y(g).toFixed(1) + '" y2="' + Y(g).toFixed(1) + '"/>' +
        '<text class="dsk-tx" x="' + (kiri - 5) + '" y="' + (Y(g) + 3).toFixed(1) + '" text-anchor="end">' + g + '</text>';
    });
    nama.forEach(function (n, i) { svg += '<text class="dsk-tx" x="' + X(i).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + n + '</text>'; });
    function garis(arr, warna, judul) {
      var pts = arr.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
      var o = '<polyline fill="none" stroke="' + warna + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/>';
      arr.forEach(function (v, i) {
        o += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (i === 5 ? 4 : 3) + '" fill="' + warna + '"><title>' + judul + ' ' + nama[i] + ': ' + v + '</title></circle>';
      });
      return o;
    }
    svg += garis(pr, WARNA.prestasi, 'Prestasi') + garis(pl, WARNA.pelanggaran, 'Pelanggaran') + '</svg>';
    return { svg: svg, pl: pl, pr: pr, total: pl.concat(pr).reduce(function (a, b) { return a + b; }, 0) };
  }

  // ---------- Perbandingan antar kelas ----------
  function urutKelas(a, b) { return String(a).localeCompare(String(b), 'id', { numeric: true }); }
  function bandingKelas(scope, semua) {
    var batas = batasPeriode(), per = {};
    scope.forEach(function (k) { per[k] = { pr: 0, pl: 0 }; });
    semua.forEach(function (d) {
      if (batas && String(d.tanggal || '') < batas) return;
      if (!per[d.kelas]) return;
      if (d.jenis === 'prestasi') per[d.kelas].pr++; else per[d.kelas].pl++;
    });
    var daftar = scope.slice().sort(urutKelas), maks = 1;
    daftar.forEach(function (k) { maks = Math.max(maks, per[k].pr + per[k].pl); });
    var ada = daftar.some(function (k) { return per[k].pr + per[k].pl > 0; });
    if (!ada) return '<p class="dsk-empty">Belum ada catatan pada periode ini.</p>';
    return daftar.map(function (k) {
      var x = per[k], lbl = String(k).replace(/^kelas\s*/i, '');
      return '<button type="button" class="dsk-kr' + (k === state.kelas ? ' on' : '') + '" data-dsk-kls="' + esc(k) + '" title="Ketuk untuk menyaring kelas ' + esc(lbl) + '">' +
        '<span class="dsk-kl">' + esc(lbl) + '</span>' +
        '<span class="dsk-kb"><i class="dsk-g" style="width:' + (x.pr / maks * 100).toFixed(1) + '%"></i><i class="dsk-r" style="width:' + (x.pl / maks * 100).toFixed(1) + '%"></i></span>' +
        '<span class="dsk-kn"><b class="dsk-g">' + x.pr + '</b> / <b class="dsk-r">' + x.pl + '</b></span></button>';
    }).join('') + '<p class="dsk-note"><b class="dsk-g">hijau</b> = prestasi, <b class="dsk-r">merah</b> = pelanggaran. Ketuk baris untuk menyaring.</p>';
  }

  // ---------- Grafik donat (SVG) ----------
  function segmen(warna, panjang, keliling, mulai, judul) {
    return '<circle cx="60" cy="60" r="44" fill="none" stroke="' + warna + '" stroke-width="14"' +
      ' stroke-dasharray="' + panjang.toFixed(2) + ' ' + (keliling - panjang).toFixed(2) + '"' +
      ' stroke-dashoffset="' + (-mulai).toFixed(2) + '" transform="rotate(-90 60 60)"><title>' + esc(judul) + '</title></circle>';
  }
  function donat(nPrestasi, nPelanggaran) {
    var C = 2 * Math.PI * 44, tot = nPrestasi + nPelanggaran;
    var s = '<svg viewBox="0 0 120 120" class="dsk-donut" role="img" aria-label="Komposisi catatan: ' +
      nPrestasi + ' prestasi, ' + nPelanggaran + ' pelanggaran">' +
      '<circle class="dsk-ring-bg" cx="60" cy="60" r="44" fill="none" stroke-width="14"/>';
    if (tot > 0) {
      var celah = (nPrestasi > 0 && nPelanggaran > 0) ? 3 : 0;
      var lp = nPrestasi / tot * C, ll = nPelanggaran / tot * C;
      if (nPrestasi > 0) s += segmen(WARNA.prestasi, Math.max(lp - celah, 0.1), C, 0, 'Prestasi: ' + nPrestasi);
      if (nPelanggaran > 0) s += segmen(WARNA.pelanggaran, Math.max(ll - celah, 0.1), C, lp, 'Pelanggaran: ' + nPelanggaran);
    }
    return s + '</svg>';
  }

  // ---------- CSS ----------
  function pasangCss() {
    if (document.getElementById('dskStyle')) return;
    var st = document.createElement('style');
    st.id = 'dskStyle';
    st.textContent =
      '.dsk-card{margin-top:16px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 10px rgba(15,23,42,.06);overflow:hidden;color:#0f172a;}' +
      '.dsk-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:14px 16px;background:linear-gradient(135deg,#ecfdf5 0%,#f0fdfa 100%);border-bottom:1px solid #d1fae5;}' +
      '.dsk-ico{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;background:linear-gradient(135deg,#0d9488,#10b981);box-shadow:0 2px 6px rgba(13,148,136,.35);flex:none;}' +
      '.dsk-title{flex:1;min-width:150px;}' +
      '.dsk-title b{display:block;font-size:15px;line-height:1.2;}' +
      '.dsk-title span{font-size:12px;color:#64748b;}' +
      '.dsk-baru{font-size:11px;font-weight:700;color:#b91c1c;background:#fee2e2;border-radius:999px;padding:3px 9px;white-space:nowrap;}' +
      '.dsk-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:10px 16px 0;}' +
      '.dsk-chip{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;min-height:34px;font-family:inherit;}' +
      '.dsk-chip[aria-pressed="true"]{background:#0d9488;border-color:#0d9488;color:#fff;}' +
      '.dsk-sel{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:600;min-height:34px;font-family:inherit;margin-left:auto;}' +
      '.dsk-main{display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:14px 16px;}' +
      '.dsk-donutbox{position:relative;width:132px;height:132px;flex:none;margin:0 auto;}' +
      '.dsk-donut{width:100%;height:100%;display:block;}' +
      '.dsk-ring-bg{stroke:#e5e7eb;}' +
      '.dsk-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;}' +
      '.dsk-center b{font-size:26px;line-height:1;}' +
      '.dsk-center span{font-size:11px;color:#64748b;margin-top:2px;}' +
      '.dsk-tiles{flex:1;min-width:210px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}' +
      '.dsk-tile{border-radius:12px;padding:9px 10px;}' +
      '.dsk-tile small{display:block;font-size:11px;color:#475569;margin-bottom:2px;}' +
      '.dsk-tile b{font-size:18px;line-height:1.1;}' +
      '.dsk-tile em{display:block;font-style:normal;font-size:11px;margin-top:1px;}' +
      '.dsk-t-ok{background:#ecfdf5;}.dsk-t-ok b,.dsk-t-ok em{color:#047857;}' +
      '.dsk-t-bad{background:#fef2f2;}.dsk-t-bad b,.dsk-t-bad em{color:#b91c1c;}' +
      '.dsk-t-net{background:#f1f5f9;}' +
      '.dsk-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;padding:0 16px 14px;}' +
      '.dsk-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;}' +
      '.dsk-box h4{margin:0 0 8px;font-size:12px;font-weight:700;color:#475569;letter-spacing:.2px;}' +
      '.dsk-row{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;border-bottom:1px dashed #e2e8f0;}' +
      '.dsk-row:last-child{border-bottom:0;}' +
      '.dsk-row .dsk-nm{flex:1;min-width:0;}' +
      '.dsk-row .dsk-nm b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.dsk-row .dsk-nm small{color:#64748b;font-size:11px;}' +
      '.dsk-pt{font-size:12px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap;}' +
      '.dsk-pt.ok{background:#d1fae5;color:#047857;}.dsk-pt.bad{background:#fee2e2;color:#b91c1c;}' +
      '.dsk-bar{height:7px;border-radius:99px;background:#fee2e2;overflow:hidden;margin-top:3px;}' +
      '.dsk-bar i{display:block;height:100%;border-radius:99px;background:#ef4444;}' +
      '.dsk-empty{font-size:12px;color:#64748b;margin:0;}' +
      '.dsk-foot{display:flex;justify-content:flex-end;padding:0 16px 14px;}' +
      '.dsk-btn{border:0;background:#00543f;color:#fff;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;min-height:40px;font-family:inherit;}' +
      '.dsk-load{padding:18px 16px;font-size:13px;color:#64748b;}' +
      'body.dark-mode .dsk-card{background:#1e293b;border-color:#334155;color:#e2e8f0;box-shadow:none;}' +
      'body.dark-mode .dsk-head{background:linear-gradient(135deg,#0f2f2a,#12332e);border-color:#134e4a;}' +
      'body.dark-mode .dsk-title span,body.dark-mode .dsk-center span,body.dark-mode .dsk-row .dsk-nm small,body.dark-mode .dsk-empty,body.dark-mode .dsk-load{color:#94a3b8;}' +
      'body.dark-mode .dsk-chip,body.dark-mode .dsk-sel{background:#0f172a;border-color:#475569;color:#cbd5e1;}' +
      'body.dark-mode .dsk-chip[aria-pressed="true"]{background:#0d9488;border-color:#0d9488;color:#fff;}' +
      'body.dark-mode .dsk-ring-bg{stroke:#334155;}' +
      'body.dark-mode .dsk-t-ok{background:#064e3b;}body.dark-mode .dsk-t-ok b,body.dark-mode .dsk-t-ok em{color:#6ee7b7;}' +
      'body.dark-mode .dsk-t-bad{background:#450a0a;}body.dark-mode .dsk-t-bad b,body.dark-mode .dsk-t-bad em{color:#fca5a5;}' +
      'body.dark-mode .dsk-t-net{background:#0f172a;}body.dark-mode .dsk-tile small{color:#94a3b8;}' +
      'body.dark-mode .dsk-box{background:#0f172a;border-color:#334155;}body.dark-mode .dsk-box h4{color:#94a3b8;}' +
      'body.dark-mode .dsk-row{border-color:#334155;}' +
      'body.dark-mode .dsk-pt.ok{background:#064e3b;color:#6ee7b7;}body.dark-mode .dsk-pt.bad{background:#450a0a;color:#fca5a5;}' +
      'body.dark-mode .dsk-bar{background:#450a0a;}body.dark-mode .dsk-baru{background:#450a0a;color:#fca5a5;}' +
      '.dsk-alert{margin:0 16px 12px;border-radius:12px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;}' +
      '.dsk-alert h4{margin:0 0 6px;font-size:12px;font-weight:700;color:#9a3412;letter-spacing:.2px;}' +
      '.dsk-pb{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;border-bottom:1px dashed #fed7aa;}.dsk-pb:last-of-type{border-bottom:0;}' +
      '.dsk-pb .dsk-nm{flex:1;min-width:0;}.dsk-pb .dsk-nm b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.dsk-pb .dsk-nm small{color:#64748b;font-size:11px;}' +
      '.dsk-prog{height:6px;border-radius:99px;background:#fde7d2;overflow:hidden;margin-top:4px;}.dsk-prog i{display:block;height:100%;border-radius:99px;background:#f59e0b;}.dsk-prog i.full{background:#dc2626;}' +
      '.dsk-st{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;white-space:nowrap;}.dsk-st.full{background:#fee2e2;color:#b91c1c;}.dsk-st.near{background:#fef3c7;color:#92400e;}' +
      '.dsk-pj{font-size:12px;font-weight:700;white-space:nowrap;color:#475569;}' +
      '.dsk-wide{grid-column:1/-1;}' +
      '.dsk-tren{width:100%;height:auto;display:block;max-height:150px;}.dsk-gl{stroke:#e2e8f0;stroke-width:1;}.dsk-tx{fill:#64748b;font-size:9px;}' +
      '.dsk-dls{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:11px;}.dsk-dls>span{display:inline-flex;align-items:center;gap:5px;}.dsk-dls em{width:8px;height:8px;border-radius:50%;display:inline-block;}' +
      '.dsk-dl{font-weight:700;color:#64748b;}.dsk-dl.ok{color:#047857;}.dsk-dl.bad{color:#b91c1c;}' +
      '.dsk-kr{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;padding:5px 6px;border-radius:8px;font:inherit;color:inherit;cursor:pointer;text-align:left;}.dsk-kr.on{background:#e0f2f1;}' +
      '.dsk-kl{width:34px;font-size:12px;font-weight:700;flex:none;}.dsk-kb{flex:1;display:flex;height:9px;border-radius:99px;background:#e5e7eb;overflow:hidden;}.dsk-kb i{display:block;height:100%;}.dsk-kb i.dsk-g{background:#10b981;}.dsk-kb i.dsk-r{background:#ef4444;}' +
      '.dsk-kn{font-size:12px;min-width:44px;text-align:right;flex:none;}.dsk-g{color:#047857;}.dsk-r{color:#b91c1c;}' +
      '.dsk-note{margin:6px 0 0;font-size:10.5px;color:#64748b;}' +
      '.dsk-foot{justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;}.dsk-btn2{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer;min-height:38px;font-family:inherit;}' +
      '.dsk-pembinaan{font-size:11px;font-weight:700;color:#9a3412;background:#ffedd5;border-radius:999px;padding:3px 9px;white-space:nowrap;}' +
      'body.dark-mode .dsk-alert{background:#431407;border-color:#7c2d12;}body.dark-mode .dsk-alert h4{color:#fdba74;}body.dark-mode .dsk-pb{border-color:#7c2d12;}body.dark-mode .dsk-prog{background:#7c2d12;}' +
      'body.dark-mode .dsk-st.full{background:#450a0a;color:#fca5a5;}body.dark-mode .dsk-st.near{background:#422006;color:#fcd34d;}body.dark-mode .dsk-pj{color:#cbd5e1;}' +
      'body.dark-mode .dsk-gl{stroke:#334155;}body.dark-mode .dsk-tx{fill:#94a3b8;}body.dark-mode .dsk-dl.ok,body.dark-mode .dsk-g{color:#6ee7b7;}body.dark-mode .dsk-dl.bad,body.dark-mode .dsk-r{color:#fca5a5;}' +
      'body.dark-mode .dsk-kr.on{background:#134e4a;}body.dark-mode .dsk-kb{background:#334155;}body.dark-mode .dsk-btn2{background:#0f172a;border-color:#475569;color:#cbd5e1;}body.dark-mode .dsk-pembinaan{background:#431407;color:#fdba74;}' +
      '@media (max-width:480px){.dsk-tiles{grid-template-columns:repeat(3,1fr);}.dsk-tile b{font-size:16px;}.dsk-sel{margin-left:0;}}';
    document.head.appendChild(st);
  }

  // ---------- Wadah & render ----------
  function wadah() {
    var el = document.getElementById('dashSikapCard');
    if (el) return el;
    var patokan = document.getElementById('btnToggleDashDetail');
    if (!patokan || !patokan.parentNode) return null;
    el = document.createElement('div');
    el.id = 'dashSikapCard';
    patokan.parentNode.insertBefore(el, patokan);
    el.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-dsk-periode],[data-dsk-buka],[data-dsk-kls],[data-dsk-ambang]') : null;
      if (!t) return;
      if (t.hasAttribute('data-dsk-periode')) { state.periode = t.getAttribute('data-dsk-periode'); render(); }
      else if (t.hasAttribute('data-dsk-kls')) { var k = t.getAttribute('data-dsk-kls'); state.kelas = (state.kelas === k) ? '' : k; render(); }
      else if (t.hasAttribute('data-dsk-ambang')) aturAmbang();
      else if (typeof navigateTo === 'function') navigateTo('sikap-siswa');
    });
    el.addEventListener('change', function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-dsk-kelas')) { state.kelas = e.target.value; render(); }
    });
    return el;
  }

  function render() {
    var el = wadah();
    if (!el) return;
    if (!bolehTampil()) { el.style.display = 'none'; el.innerHTML = ''; return; }
    pasangCss();
    pasangAmbang();
    el.style.display = '';

    var dasar = dataDasar();
    var dasarSemuaKelas = dataDasar(true);
    var scope = (typeof loaderScopeKelas === 'function') ? loaderScopeKelas().slice().sort() : [];
    if (state.kelas && scope.indexOf(state.kelas) < 0) state.kelas = '';

    var memuat = (typeof dataLoaded !== 'undefined' && !dataLoaded && dasar.length === 0);
    var head = '<div class="dsk-head"><div class="dsk-ico" aria-hidden="true">🌟</div>' +
      '<div class="dsk-title"><b>Sikap &amp; Kedisiplinan</b><span>' + (state.kelas ? esc(labelKelas(state.kelas)) : (scope.length > 1 ? 'Semua kelas' : (scope[0] ? esc(labelKelas(scope[0])) : ''))) + '</span></div>';

    // pelanggaran baru 7 hari terakhir (tidak ikut filter periode)
    var batas7 = geserHari(tglLokal(), -6);
    var baru = dasar.filter(function (d) { return d.jenis === 'pelanggaran' && String(d.tanggal || '') >= batas7; }).length;
    if (baru > 0) head += '<span class="dsk-baru">⚠️ ' + baru + ' pelanggaran baru (7 hari)</span>';
    head += '@@PEMBINAAN_CHIP@@</div>';

    if (memuat) { el.innerHTML = '<div class="dsk-card">' + head.replace('@@PEMBINAAN_CHIP@@', '') + '<div class="dsk-load">Memuat data sikap…</div></div>'; return; }

    var tools = '<div class="dsk-tools">' + PERIODE.map(function (p) {
      return '<button type="button" class="dsk-chip" data-dsk-periode="' + p.k + '" aria-pressed="' + (state.periode === p.k) + '">' + p.t + '</button>';
    }).join('');
    if (scope.length > 1) {
      tools += '<select class="dsk-sel" data-dsk-kelas aria-label="Pilih kelas"><option value="">Semua kelas</option>' +
        scope.map(function (k) { return '<option value="' + esc(k) + '"' + (k === state.kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>';
    }
    tools += '</div>';

    var batas = batasPeriode();
    var data = batas ? dasar.filter(function (d) { return String(d.tanggal || '') >= batas; }) : dasar;

    var nPr = 0, nPl = 0, pPr = 0, pPl = 0, kat = {}, sis = {};
    data.forEach(function (d) {
      if (d.jenis === 'prestasi') { nPr++; pPr += poin(d); }
      else {
        nPl++; pPl += poin(d);
        var k = d.kategori || 'Lainnya'; kat[k] = (kat[k] || 0) + 1;
        var sk = d.siswaKey || ('?' + (d.siswaNama || ''));
        if (!sis[sk]) sis[sk] = { key: d.siswaKey, nama: d.siswaNama || '', kelas: d.kelas, n: 0, p: 0 };
        sis[sk].n++; sis[sk].p += poin(d);
      }
    });
    var net = pPr - pPl, total = nPr + nPl;

    var mapSiswa = {};
    ((typeof allSiswa !== 'undefined' && Array.isArray(allSiswa)) ? allSiswa : []).forEach(function (s) { mapSiswa[s.key] = s; });
    function namaSiswa(d) { var s = mapSiswa[d.siswaKey]; return (s && s.name) || d.siswaNama || '-'; }

    var utama = '<div class="dsk-main"><div class="dsk-donutbox">' + donat(nPr, nPl) +
      '<div class="dsk-center"><b>' + total + '</b><span>catatan</span></div></div>' +
      '<div class="dsk-tiles">' +
      '<div class="dsk-tile dsk-t-ok"><small>🌟 Prestasi</small><b>' + nPr + '</b><em>+' + pPr + ' poin</em></div>' +
      '<div class="dsk-tile dsk-t-bad"><small>⚠️ Pelanggaran</small><b>' + nPl + '</b><em>−' + pPl + ' poin</em></div>' +
      '<div class="dsk-tile dsk-t-net"><small>Net poin</small><b style="color:' + (net < 0 ? '#dc2626' : '#059669') + ';">' + (net >= 0 ? '+' : '') + net + '</b><em style="color:#64748b;">prestasi − pelanggaran</em></div>' +
      '</div></div>';

    // Kategori pelanggaran terbanyak
    var katArr = Object.keys(kat).map(function (k) { return { k: k, n: kat[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 3);
    var maks = katArr.length ? katArr[0].n : 1;
    var boxKat = '<div class="dsk-box"><h4>PELANGGARAN TERBANYAK</h4>' + (katArr.length
      ? katArr.map(function (x) {
          return '<div style="padding:4px 0;font-size:13px;"><div style="display:flex;justify-content:space-between;gap:8px;"><span>' + esc(x.k) + '</span><b>' + x.n + '×</b></div>' +
            '<div class="dsk-bar"><i style="width:' + Math.round(x.n / maks * 100) + '%;"></i></div></div>';
        }).join('')
      : '<p class="dsk-empty">' + (total ? '👏 Tidak ada pelanggaran pada periode ini.' : 'Belum ada catatan pada periode ini.') + '</p>') + '</div>';

    // Siswa perlu perhatian
    var sisArr = Object.keys(sis).map(function (k) { return sis[k]; }).sort(function (a, b) { return b.p - a.p || b.n - a.n; }).slice(0, 3);
    var boxSis = '<div class="dsk-box"><h4>PERLU PERHATIAN</h4>' + (sisArr.length
      ? sisArr.map(function (x) {
          var s = mapSiswa[x.key];
          return '<div class="dsk-row"><div class="dsk-nm"><b>' + esc((s && s.name) || x.nama || '-') + '</b><small>' + esc(x.kelas || '') + ' · ' + x.n + ' catatan</small></div><span class="dsk-pt bad">−' + x.p + '</span></div>';
        }).join('')
      : '<p class="dsk-empty">Belum ada siswa dengan catatan pelanggaran.</p>') + '</div>';

    // Catatan terbaru
    var terbaru = data.slice().sort(function (a, b) {
      var ta = String(a.tanggal || ''), tb = String(b.tanggal || '');
      return ta < tb ? 1 : ta > tb ? -1 : (String(b.key || '') < String(a.key || '') ? -1 : 1);
    }).slice(0, 4);
    var boxBaru = '<div class="dsk-box"><h4>CATATAN TERBARU</h4>' + (terbaru.length
      ? terbaru.map(function (d) {
          var pr = d.jenis === 'prestasi';
          return '<div class="dsk-row"><div class="dsk-nm"><b>' + (pr ? '🌟 ' : '⚠️ ') + esc(d.kategori || '-') + '</b><small>' + esc(namaSiswa(d)) + ' · ' + esc(d.kelas || '') + ' · ' + tglPendek(d.tanggal) + '</small></div>' +
            '<span class="dsk-pt ' + (pr ? 'ok' : 'bad') + '">' + (pr ? '+' : '−') + poin(d) + '</span></div>';
        }).join('')
      : '<p class="dsk-empty">Belum ada catatan pada periode ini.</p>') + '</div>';

    // ---- Perlu pembinaan: total poin pelanggaran siswa pada tahun ajaran ini (tidak ikut filter periode) ----
    var alertHtml = '', nPembinaan = 0;
    if (ambang > 0) {
      var tot = {};
      dasar.forEach(function (d) {
        if (d.jenis !== 'pelanggaran') return;
        var sk = d.siswaKey || ('?' + (d.siswaNama || ''));
        if (!tot[sk]) tot[sk] = { key: d.siswaKey, nama: d.siswaNama || '', kelas: d.kelas, p: 0 };
        tot[sk].p += poin(d);
      });
      var dekat = Math.ceil(ambang * 0.8);
      var calon = Object.keys(tot).map(function (k) { return tot[k]; }).filter(function (x) { return x.p >= dekat; })
        .sort(function (a, b) { return b.p - a.p; });
      nPembinaan = calon.filter(function (x) { return x.p >= ambang; }).length;
      if (calon.length) {
        alertHtml = '<div class="dsk-alert"><h4>PERLU PEMBINAAN · ambang ' + ambang + ' poin pelanggaran (tahun ajaran ini)</h4>' +
          calon.slice(0, 5).map(function (x) {
            var s = mapSiswa[x.key], penuh = x.p >= ambang;
            return '<div class="dsk-pb"><div class="dsk-nm"><b>' + esc((s && s.name) || x.nama || '-') + '</b><small>' + esc(x.kelas || '') + '</small>' +
              '<div class="dsk-prog"><i class="' + (penuh ? 'full' : '') + '" style="width:' + Math.min(100, Math.round(x.p / ambang * 100)) + '%"></i></div></div>' +
              '<span class="dsk-pj">' + x.p + '/' + ambang + '</span><span class="dsk-st ' + (penuh ? 'full' : 'near') + '">' + (penuh ? 'Pembinaan' : 'Mendekati') + '</span></div>';
          }).join('') +
          (calon.length > 5 ? '<p class="dsk-note">+ ' + (calon.length - 5) + ' siswa lain. Lihat selengkapnya di halaman Sikap Siswa.</p>' : '') + '</div>';
      }
    }
    head = head.replace('@@PEMBINAAN_CHIP@@', nPembinaan > 0 ? '<span class="dsk-pembinaan">🚨 ' + nPembinaan + ' siswa perlu pembinaan</span>' : '');

    // ---- Tren 6 bulan ----
    var tr = tren(dasar);
    var boxTren = '<div class="dsk-box"><h4>TREN 6 BULAN</h4>' + (tr.total
      ? tr.svg + '<div class="dsk-dls"><span><em style="background:#ef4444"></em>Pelanggaran bulan ini: <b>' + tr.pl[5] + '</b> ' + deltaChip(tr.pl[5], tr.pl[4], 'turun') + '</span>' +
        '<span><em style="background:#10b981"></em>Prestasi bulan ini: <b>' + tr.pr[5] + '</b> ' + deltaChip(tr.pr[5], tr.pr[4], 'naik') + '</span></div>'
      : '<p class="dsk-empty">Belum ada catatan dalam 6 bulan terakhir.</p>') + '</div>';

    // ---- Perbandingan antar kelas (hanya bila cakupan lebih dari satu kelas) ----
    var boxBanding = scope.length > 1
      ? '<div class="dsk-box"><h4>PERBANDINGAN ANTAR KELAS</h4>' + bandingKelas(scope, dasarSemuaKelas) + '</div>' : '';

    var foot = '<div class="dsk-foot">' +
      ((typeof isAdmin === 'function' && isAdmin()) ? '<button type="button" class="dsk-btn2" data-dsk-ambang>⚙️ ' + (ambang > 0 ? 'Ambang pembinaan: ' + ambang + ' poin' : 'Atur ambang pembinaan') + '</button>' : '<span></span>') +
      '<button type="button" class="dsk-btn" data-dsk-buka>Buka Sikap Siswa →</button></div>';

    el.innerHTML = '<div class="dsk-card">' + head + tools + utama + alertHtml +
      '<div class="dsk-cols">' + boxTren + boxBanding + '</div>' +
      '<div class="dsk-cols">' + boxKat + boxSis + boxBaru + '</div>' + foot + '</div>';
  }

  // ---------- Pasang ----------
  function pasang() {
    var asli = window.updateDashboard;
    if (typeof asli === 'function' && !asli._dsk) {
      var baru = function () {
        var r = asli.apply(this, arguments);
        try { render(); } catch (e) { console.warn('[SI MAMBA] dashboard-sikap gagal:', e); }
        return r;
      };
      baru._dsk = true;
      window.updateDashboard = baru;
    }
    window.renderDashboardSikap = render;
  }
  pasang();
})();
