// ============================================================
// DOKUMEN KEPALA MADRASAH -- js/dokumen-kepala.js  (halaman "Dokumen Kepala", hanya Admin & Kepala Madrasah)
// Dimuat SESUDAH js/app.js, js/kpi.js, js/docx-mini.js dan js/dokumen-kepala-data.js. Tidak membungkus navigateTo (pola sama dengan kpi.js).
//
// Tiga tab:
//   1) Daftar Dokumen  -> daftar periksa dokumen wajib kepala madrasah: status (belum/draf/final/disahkan), tautan dokumen (Google Drive dsb., gratis),
//                         tanggal penyusunan, tanggal pengesahan, catatan, dan pengingat revisi (tiap tahun / 2 tahun / 4 tahun).
//   2) Pemantau RKT    -> program per bidang untuk satu tahun ajaran: status, progres, penanggung jawab, tenggat. Program bisa dihubungkan ke indikator
//                         KPI Madrasah; nilai KPI terbaru ditampilkan di samping program (nilai diambil dari window.KPI.snapshot() milik kpi.js).
//   3) Kerangka Dokumen -> RKJM, RKT, Laporan RKT sebagai berkas Word (.docx) untuk diisi. Identitas madrasah, tabel program, dan nilai KPI terisi otomatis.
//
// Penyimpanan: node Firebase dokumen_kepala_v1 (dibaca sekali per pembukaan halaman). Struktur:
//   dokumen/{idDokumen}        -> { status, tgl, tglSah, link, catatan, upd }
//   kustom/{pushId}            -> { nama, kel, siklus }          (dokumen tambahan buatan pengguna)
//   rkt/{TA 'YYYY-YYYY'}/{pushId} -> { bidang, program, indikator, target, pj, tenggat, status, progres, kpi, catatan, upd }
// Perlu blok Rules dokumen_kepala_v1 (lihat _catatan/rules-dokumen_kepala_v1.txt).
// ============================================================
(function () {
  'use strict';

  var DD = window.DOKKEP_DATA;
  if (!DD) { try { console.error('[dokumen-kepala] dokumen-kepala-data.js belum dimuat'); } catch (e) {} return; }
  var NODE = 'dokumen_kepala_v1';
  var NAMA_HAL = 'Dokumen Kepala Madrasah';
  var WARNA_DOK = { belum: '#6b7280', draf: '#d97706', final: '#2563eb', disahkan: '#059669' };
  var WARNA_RKT = { belum: '#6b7280', berjalan: '#2563eb', tercapai: '#059669', tidak: '#dc2626' };
  var KEL_LAIN = DD.KELOMPOK.length;   // indeks kelompok "Lainnya" (dokumen tambahan)

  var S = { tab: 'dokumen', filter: 'semua', ta: null, bidang: 'semua', D: null, galat: null, muat: false, coba: false, kerTa: {} };

  // ---------- util ----------
  function el(id) { return document.getElementById(id); }
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bolehLihat() {
    try { return !!(typeof currentUser !== 'undefined' && currentUser && (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.HEADMASTER)); } catch (e) { return false; }
  }
  function isAdminDk() { try { return !!(currentUser && currentUser.role === ROLES.ADMIN); } catch (e) { return false; } }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function hariIni() { try { return tglLokal(); } catch (e) { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); } }
  function parseTgl(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
  function tambahBulan(s, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if (!m) return null;
    var y = +m[1], mo = +m[2] - 1 + n, d = +m[3]; y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
    return y + '-' + p2(mo + 1) + '-' + p2(Math.min(d, new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()));
  }
  function selisihHari(a, b) { var x = parseTgl(a), y = parseTgl(b); return (x == null || y == null) ? null : Math.round((y - x) / 86400000); }
  function tglId(s) { return DD.tglId(s) || '-'; }
  function f1(v) { return v == null ? '-' : v.toFixed(1).replace('.', ',') + '%'; }
  function pesan(msg, err) { try { if (typeof toast === 'function') toast(msg, !!err, err ? 6000 : 3500); else alert(msg); } catch (e) {} }
  function unduh(blob, nama) {
    var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = nama;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function slug(s) { return String(s || 'madrasah').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'madrasah'; }
  function normLink(s) {   // hanya http(s); tanpa skema tapi berbentuk domain -> ditambah https://
    s = String(s || '').trim(); if (!s) return '';
    if (s.length > 500) return null;
    if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s)) return 'https://' + s;
    return null;
  }

  // ---------- tahun ajaran ----------
  function taAktif() {
    var m = /^(\d{4})\/(\d{4})$/.exec(typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '');
    if (m) return +m[1];
    var d = new Date(); return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;   // tahun ajaran mulai Juli
  }
  function taLabel(y) { return y + '/' + (y + 1); }
  function taKey(label) { return String(label).replace('/', '-'); }
  function daftarTa() { var y = taAktif(); return [taLabel(y - 1), taLabel(y), taLabel(y + 1)]; }
  function taTerpilih() { return S.ta || taLabel(taAktif()); }

  // ---------- Firebase ----------
  function tulis(path, data, cb) {
    var siap;
    try { siap = (isAdminDk() && typeof adminSesi === 'function') ? adminSesi() : Promise.resolve(true); } catch (e) { siap = Promise.reject(e); }
    Promise.resolve(siap).then(function () { return db.ref(NODE + '/' + path).set(data); })
      .then(function () { cerminkan(path, data); if (cb) cb(null); }, function (e) { if (cb) cb(e || new Error('gagal')); });
  }
  function tulisBanyak(path, objek, cb) {   // update beberapa anak sekaligus
    var siap;
    try { siap = (isAdminDk() && typeof adminSesi === 'function') ? adminSesi() : Promise.resolve(true); } catch (e) { siap = Promise.reject(e); }
    Promise.resolve(siap).then(function () { return db.ref(NODE + '/' + path).update(objek); })
      .then(function () { Object.keys(objek).forEach(function (k) { cerminkan(path + '/' + k, objek[k]); }); if (cb) cb(null); }, function (e) { if (cb) cb(e || new Error('gagal')); });
  }
  function cerminkan(path, val) {
    if (!S.D) S.D = {};
    var seg = path.split('/'), o = S.D, i;
    for (i = 0; i < seg.length - 1; i++) { if (!o[seg[i]] || typeof o[seg[i]] !== 'object') o[seg[i]] = {}; o = o[seg[i]]; }
    if (val == null) delete o[seg[seg.length - 1]]; else o[seg[seg.length - 1]] = val;
  }
  function galatTulis(e) { pesan('Gagal menyimpan: ' + ((e && e.message) || 'ditolak') + '. Pastikan Rules ' + NODE + ' sudah dipasang.', true); }
  function muat() {
    if (S.muat || S.coba || typeof db === 'undefined') return;
    S.muat = true;
    var selesai = false;
    function akhir(val, err) {
      if (selesai) return; selesai = true; S.muat = false; S.coba = true;
      if (err) { S.galat = err; S.D = null; } else { S.galat = null; S.D = val || {}; }
      var pg = el('page-dokumen-kepala'); if (pg && !pg.classList.contains('hidden')) { try { render(); } catch (e) {} }
    }
    try { db.ref(NODE).once('value').then(function (sn) { akhir(sn.val() || {}, null); }, function (e) { akhir(null, (e && e.message) || 'ditolak'); }); } catch (e) { akhir(null, 'gagal'); }
    setTimeout(function () { akhir(null, 'timeout'); }, 15000);
  }
  function dataDok() { return (S.D && S.D.dokumen) || {}; }
  function dataKustom() { return (S.D && S.D.kustom) || {}; }
  function dataRkt(label) { return (S.D && S.D.rkt && S.D.rkt[taKey(label)]) || {}; }
  function namaPengguna() { try { return String(currentUser.name || currentUser.username || '').slice(0, 60); } catch (e) { return ''; } }

  // ---------- daftar dokumen: model & pengingat ----------
  function semuaDefinisi() {
    var out = DD.DOKUMEN.map(function (d) { return { id: d.id, kel: d.kel, nama: d.nama, siklus: d.siklus, ket: d.ket, kustom: false }; });
    var k = dataKustom();
    Object.keys(k).sort().forEach(function (id) { var x = k[id] || {}; out.push({ id: 'k_' + id, kid: id, kel: (x.kel >= 0 && x.kel < KEL_LAIN) ? x.kel : KEL_LAIN, nama: String(x.nama || '(tanpa nama)'), siklus: +x.siklus || 0, ket: '', kustom: true }); });
    return out;
  }
  function rekam(def) { return dataDok()[def.id] || {}; }
  // Pengingat revisi. lv: lewat | segera | info | aman | null
  function pengingat(def, r) {
    var st = r.status || 'belum', today = hariIni();
    if (!def.siklus) return null;
    if (st === 'belum') {
      var bln = +today.slice(5, 7);
      if (def.siklus === 12 && bln >= 6 && bln <= 9) return { lv: 'segera', t: 'Saatnya disusun untuk tahun ajaran baru' };
      return null;
    }
    if (!r.tgl) return { lv: 'info', t: 'Isi tanggal penyusunan agar pengingat revisi aktif' };
    var due = tambahBulan(r.tgl, def.siklus), sisa = selisihHari(today, due);
    if (sisa == null) return null;
    if (sisa < 0) return { lv: 'lewat', t: 'Revisi terlambat ' + (-sisa) + ' hari (jatuh tempo ' + tglId(due) + ')', due: due };
    if (sisa <= 60) return { lv: 'segera', t: 'Revisi ' + sisa + ' hari lagi (' + tglId(due) + ')', due: due };
    return { lv: 'aman', t: 'Revisi berikutnya ' + tglId(due), due: due };
  }
  function perluRevisi(p) { return !!p && (p.lv === 'lewat' || p.lv === 'segera'); }

  // ---------- CSS ----------
  var CSS = '#page-dokumen-kepala{color-scheme:light dark;}' +
    '.hub-tabs.dk-tabs{position:sticky;top:var(--kg-stick-top,0px);z-index:5;box-shadow:0 2px 6px rgba(0,0,0,.12);margin:10px 0 12px;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}.hub-tabs.dk-tabs::-webkit-scrollbar{display:none;}.hub-tabs.dk-tabs .hub-tab{flex:0 0 auto;white-space:nowrap;}' +
    '.dk-sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0 12px;}@media (max-width:640px){.dk-sum{grid-template-columns:repeat(2,1fr);}}' +
    '.dk-box{border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:10px 12px;}.dk-box .n{font-size:22px;font-weight:800;line-height:1.1;}.dk-box .l{font-size:12px;opacity:.75;}' +
    '.dk-bar{height:8px;border-radius:6px;background:rgba(128,128,128,.25);overflow:hidden;margin:4px 0;}.dk-bar>i{display:block;height:100%;border-radius:6px;}' +
    '.dk-h{font-size:14px;font-weight:800;margin:16px 0 6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}.dk-h small{font-weight:400;opacity:.7;font-size:12px;}' +
    '.dk-row{border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:10px 12px;margin:0 0 8px;}.dk-top{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}.dk-top b{font-size:14px;}' +
    '.dk-ket{font-size:12px;opacity:.7;margin:2px 0 6px;}' +
    '.dk-chip{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;color:#fff;white-space:nowrap;}.dk-chip.s{background:rgba(128,128,128,.55);}' +
    '.dk-ctl{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-top:6px;}.dk-ctl label{display:flex;flex-direction:column;font-size:11px;opacity:.9;gap:2px;}' +
    '.dk-in{font:inherit;font-size:13px;padding:6px 8px;border:1px solid rgba(128,128,128,.45);border-radius:8px;background:transparent;color:inherit;max-width:100%;box-sizing:border-box;}' +
    '.dk-ctl .dk-link{flex:1 1 220px;}.dk-ctl .dk-link .dk-in{width:100%;}' +
    '.dk-rev{font-size:12px;margin-top:8px;padding:6px 10px;border-radius:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}' +
    '.dk-lv-lewat{background:rgba(220,38,38,.14);color:#dc2626;}.dk-lv-segera{background:rgba(217,119,6,.16);color:#d97706;}.dk-lv-info{background:rgba(128,128,128,.15);}.dk-lv-aman{opacity:.75;padding-left:0;}' +
    '.dk-row details{margin-top:6px;}.dk-row summary{cursor:pointer;font-size:12px;opacity:.8;}.dk-row textarea{width:100%;min-height:54px;margin-top:4px;}' +
    '.dk-fil{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}.dk-fil button{font:inherit;font-size:12px;padding:5px 11px;border-radius:999px;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;cursor:pointer;}.dk-fil button.on{background:#2563eb;border-color:#2563eb;color:#fff;}' +
    '.dk-bar-tool{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;padding:8px 10px;border:1px solid rgba(128,128,128,.25);border-radius:10px;background:rgba(128,128,128,.07);}.dk-bar-tool .sp{flex:1;}' +
    '.dk-warn{border:1px solid rgba(217,119,6,.5);background:rgba(217,119,6,.1);border-radius:10px;padding:8px 12px;font-size:13px;margin:8px 0;}.dk-warn ul{margin:4px 0 0 18px;padding:0;}' +
    '.dk-kpi{font-size:12px;margin-top:6px;padding:6px 10px;border-radius:8px;border:1px dashed rgba(128,128,128,.5);display:flex;gap:8px;align-items:center;flex-wrap:wrap;}' +
    '.dk-prog{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;}.dk-prog .dk-bar{flex:1;margin:0;}' +
    '.dk-ker{border:1px solid rgba(128,128,128,.35);border-radius:12px;padding:12px;margin:0 0 10px;}.dk-ker h3{margin:0 0 2px;font-size:15px;}.dk-ker ol{margin:6px 0 8px 20px;padding:0;font-size:12px;opacity:.85;columns:2;column-gap:20px;}@media (max-width:640px){.dk-ker ol{columns:1;}}' +
    '.dk-modal{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto;}.dk-modal>div{background:var(--card-bg,Canvas);color:inherit;color-scheme:light dark;border-radius:14px;padding:16px;width:100%;max-width:560px;box-shadow:0 10px 40px rgba(0,0,0,.35);margin:auto 0;}' +
    '.dk-modal h3{margin:0 0 10px;font-size:16px;}.dk-f{display:flex;flex-direction:column;gap:3px;font-size:12px;margin-bottom:10px;}.dk-f .dk-in{font-size:14px;}.dk-2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}@media (max-width:480px){.dk-2{grid-template-columns:1fr;}}' +
    '.dk-act{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px;}.dk-del{color:#dc2626;}';
  function pasangCss() { if (el('dokumenKepalaCss')) return; var s = document.createElement('style'); s.id = 'dokumenKepalaCss'; s.textContent = CSS; document.head.appendChild(s); }

  // ---------- snapshot KPI ----------
  var KUNCI_CACHE = 'dokkep_kpi_snap_v1';
  function kpiSnap() {
    try {
      if (window.KPI && typeof window.KPI.snapshot === 'function') {
        var s = window.KPI.snapshot();
        if (s && s.items) { try { localStorage.setItem(KUNCI_CACHE, JSON.stringify(s)); } catch (e) {} return s; }
      }
    } catch (e) {}
    try { var c = JSON.parse(localStorage.getItem(KUNCI_CACHE) || 'null'); if (c && c.items) return c; } catch (e2) {}
    return null;
  }
  function kpiProgres(it) {
    if (!it || it.nilai == null || !(it.target > 0)) return null;
    if (it.mode === 'max') return it.nilai <= it.target ? 100 : Math.max(0, Math.round(it.target / it.nilai * 100));
    return Math.min(100, Math.round(it.nilai / it.target * 100));
  }
  function targetTeks(it) { return (it.mode === 'max' ? '≤ ' : '≥ ') + it.target + '%'; }

  // ---------- render utama ----------
  var TABS = [['dokumen', 'Daftar Dokumen'], ['rkt', 'Pemantau RKT'], ['kerangka', 'Kerangka Dokumen']];
  function render() {
    var p = el('page-dokumen-kepala'); if (!p) return;
    pasangCss();
    if (!bolehLihat()) { p.innerHTML = '<div class="card"><p class="text-muted">Halaman ini hanya untuk Admin dan Kepala Madrasah.</p></div>'; return; }
    if (!S.coba) muat();
    var h = '<div class="card"><div id="dkTabs" class="hub-tabs show dk-tabs" role="tablist" aria-label="Bagian Dokumen Kepala Madrasah">' +
      TABS.map(function (t) { return '<button type="button" role="tab" aria-selected="' + (S.tab === t[0]) + '" class="hub-tab' + (S.tab === t[0] ? ' active' : '') + '" data-dtab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (S.muat && !S.D) h += '<p class="text-muted">Memuat data…</p>';
    else if (S.galat) h += '<div class="dk-warn">Data belum bisa dibaca (' + esc(S.galat) + '). Pastikan Rules <b>' + NODE + '</b> sudah dipasang di Firebase. Tab Kerangka Dokumen tetap bisa dipakai.</div>';
    if (S.tab === 'dokumen') h += S.D ? htmlDokumen() : '';
    else if (S.tab === 'rkt') h += S.D ? htmlRkt() : '';
    else h += htmlKerangka();
    p.innerHTML = h + '</div>';
  }

  // Render ulang ditunda satu ketukan: penangan 'change' bisa berjalan saat blur, dan mengganti innerHTML di saat itu menimbulkan galat DOM.
  function segar() { setTimeout(function () { try { render(); } catch (e) { try { console.error('[dokumen-kepala]', e); } catch (x) {} } }, 0); }

  // ---------- TAB 1: daftar dokumen ----------
  function htmlDokumen() {
    var defs = semuaDefinisi(), n = { belum: 0, draf: 0, final: 0, disahkan: 0 }, rev = [];
    defs.forEach(function (d) {
      var r = rekam(d), st = n[r.status] != null ? r.status : 'belum'; n[st]++;
      var pg = pengingat(d, r); if (perluRevisi(pg)) rev.push({ d: d, p: pg });
    });
    var tot = defs.length, pctSah = tot ? Math.round(n.disahkan / tot * 100) : 0, pctSiap = tot ? Math.round((n.disahkan + n.final) / tot * 100) : 0;
    var h = '<div class="dk-sum">' + [['Disahkan', n.disahkan, WARNA_DOK.disahkan], ['Final', n.final, WARNA_DOK.final], ['Draf', n.draf, WARNA_DOK.draf], ['Belum', n.belum, WARNA_DOK.belum]].map(function (x) {
      return '<div class="dk-box"><div class="n" style="color:' + x[2] + ';">' + x[1] + '</div><div class="l">' + x[0] + ' dari ' + tot + '</div></div>';
    }).join('') + '</div>' +
      '<div class="dk-box"><div style="font-size:12px;opacity:.8;">Kelengkapan: ' + pctSah + '% disahkan, ' + pctSiap + '% final atau disahkan</div><div class="dk-bar"><i style="width:' + pctSah + '%;background:' + WARNA_DOK.disahkan + ';"></i></div></div>';
    if (rev.length) {
      h += '<div class="dk-warn"><b>Pengingat revisi (' + rev.length + ' dokumen)</b><ul>' + rev.slice(0, 6).map(function (x) { return '<li>' + esc(x.d.nama) + ': ' + esc(x.p.t) + '</li>'; }).join('') + (rev.length > 6 ? '<li>dan ' + (rev.length - 6) + ' dokumen lain</li>' : '') + '</ul></div>';
    }
    var FIL = [['semua', 'Semua'], ['belum', 'Belum'], ['draf', 'Draf'], ['final', 'Final'], ['disahkan', 'Disahkan'], ['revisi', 'Perlu revisi']];
    h += '<div class="dk-bar-tool"><div class="dk-fil" style="margin:0;" id="dkFil">' + FIL.map(function (f) { return '<button type="button" data-fil="' + f[0] + '" class="' + (S.filter === f[0] ? 'on' : '') + '">' + f[1] + '</button>'; }).join('') + '</div><span class="sp"></span>' +
      '<button type="button" class="btn btn-soft" id="dkTambahDok">+ Dokumen</button><button type="button" class="btn btn-soft" id="dkCsv">Unduh CSV</button></div>';
    var adaTampil = false;
    DD.KELOMPOK.concat(['Lainnya']).forEach(function (nk, ki) {
      var list = defs.filter(function (d) { return d.kel === ki; });
      var tampil = list.filter(function (d) {
        var r = rekam(d), st = r.status || 'belum';
        if (S.filter === 'semua') return true;
        if (S.filter === 'revisi') return perluRevisi(pengingat(d, r));
        return st === S.filter;
      });
      if (!list.length || !tampil.length) return;
      adaTampil = true;
      var sah = list.filter(function (d) { return rekam(d).status === 'disahkan'; }).length;
      h += '<div class="dk-h">' + esc(nk) + ' <small>' + sah + ' dari ' + list.length + ' disahkan</small></div>' + tampil.map(htmlBarisDok).join('');
    });
    if (!adaTampil) h += '<p class="text-muted">Tidak ada dokumen pada filter ini.</p>';
    h += '<p class="text-muted" style="font-size:12px;margin-top:12px;">Tautan dokumen boleh berupa Google Drive atau tempat simpan gratis lain (pastikan akses berbagi diatur sesuai kebutuhan). Daftar ini usulan umum; tambahkan dokumen lain lewat tombol “+ Dokumen”.</p>';
    return h;
  }
  function htmlBarisDok(d) {
    var r = rekam(d), st = WARNA_DOK[r.status] ? r.status : 'belum', pg = pengingat(d, r), id = esc(d.id);
    var h = '<div class="dk-row" data-id="' + id + '"><div class="dk-top"><b>' + esc(d.nama) + '</b><span class="dk-chip" style="background:' + WARNA_DOK[st] + ';">' + esc((DD.STATUS_DOK.filter(function (x) { return x[0] === st; })[0] || [0, st])[1]) + '</span>' +
      '<span class="dk-chip s">' + esc(DD.SIKLUS_LABEL[d.siklus] || 'Sesuai kebutuhan') + '</span></div>' + (d.ket ? '<div class="dk-ket">' + esc(d.ket) + '</div>' : '') +
      '<div class="dk-ctl"><label>Status<select class="dk-in" data-f="status" data-id="' + id + '">' + DD.STATUS_DOK.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === st ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>Tgl. penyusunan<input type="date" class="dk-in" data-f="tgl" data-id="' + id + '" value="' + esc(r.tgl || '') + '"></label>' +
      (st === 'disahkan' ? '<label>Tgl. pengesahan<input type="date" class="dk-in" data-f="tglSah" data-id="' + id + '" value="' + esc(r.tglSah || '') + '"></label>' : '') +
      '<label class="dk-link">Tautan dokumen<input type="url" class="dk-in" data-f="link" data-id="' + id + '" value="' + esc(r.link || '') + '" placeholder="https://drive.google.com/..."></label>' +
      (r.link ? '<a class="btn btn-soft" href="' + esc(r.link) + '" target="_blank" rel="noopener noreferrer">Buka ↗</a>' : '') + '</div>';
    if (pg) {
      h += '<div class="dk-rev dk-lv-' + pg.lv + '">' + (pg.lv === 'lewat' ? '⚠ ' : pg.lv === 'segera' ? '⏰ ' : '') + esc(pg.t) +
        ((pg.lv === 'lewat' || pg.lv === 'segera') && st !== 'belum' ? ' <button type="button" class="btn btn-soft" data-revisi="' + id + '" title="Tanggal penyusunan menjadi hari ini dan status kembali ke Draf">Tandai direvisi hari ini</button>' : '') + '</div>';
    }
    h += '<details' + (r.catatan ? ' open' : '') + '><summary>Catatan' + (r.catatan ? ' (ada)' : '') + '</summary><textarea class="dk-in" data-f="catatan" data-id="' + id + '" maxlength="500" placeholder="Catatan singkat (mis. menunggu tanda tangan komite)">' + esc(r.catatan || '') + '</textarea></details>';
    if (d.kustom) h += '<div style="text-align:right;"><button type="button" class="btn btn-soft dk-del" data-hapusdok="' + esc(d.kid) + '">Hapus dokumen ini</button></div>';
    return h + '</div>';
  }
  function simpanDok(id, patch, cb) {
    var def = semuaDefinisi().filter(function (d) { return d.id === id; })[0]; if (!def) return;
    var r = {}, lama = rekam(def); Object.keys(lama).forEach(function (k) { r[k] = lama[k]; });
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
    var st = r.status || 'belum';
    if (st !== 'belum' && !r.tgl) r.tgl = hariIni();
    if (st === 'disahkan' && !r.tglSah) r.tglSah = hariIni();
    if (st !== 'disahkan') delete r.tglSah;
    r.status = st; r.upd = Date.now(); r.oleh = namaPengguna();
    Object.keys(r).forEach(function (k) { if (r[k] === '' || r[k] == null) delete r[k]; });
    tulis('dokumen/' + id, r, function (e) {
      if (e) { galatTulis(e); } else { try { if (typeof addLog === 'function') addLog('dokumen_kepala_ubah', def.nama + ' -> ' + st); } catch (x) {} }
      segar();
    });
  }
  function bukaTambahDok() {
    modal('<h3>Tambah dokumen</h3><div class="dk-f"><label for="dkNm">Nama dokumen</label><input id="dkNm" class="dk-in" maxlength="120" placeholder="mis. Pedoman penggunaan perpustakaan"></div>' +
      '<div class="dk-2"><div class="dk-f"><label for="dkKl">Kelompok</label><select id="dkKl" class="dk-in">' + DD.KELOMPOK.concat(['Lainnya']).map(function (k, i) { return '<option value="' + i + '"' + (i === KEL_LAIN ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></div>' +
      '<div class="dk-f"><label for="dkSk">Siklus revisi</label><select id="dkSk" class="dk-in"><option value="12">Tiap tahun</option><option value="24">Tiap 2 tahun</option><option value="48">Tiap 4 tahun</option><option value="0">Sesuai kebutuhan</option></select></div></div>' +
      '<div class="dk-act"><button type="button" class="btn btn-soft" data-tutup="1">Batal</button><button type="button" class="btn btn-primary" id="dkSimpanDok">Simpan</button></div>');
    el('dkSimpanDok').onclick = function () {
      var nama = el('dkNm').value.trim(); if (!nama) { pesan('Nama dokumen wajib diisi.', true); return; }
      var key = db.ref(NODE + '/kustom').push().key;
      tulis('kustom/' + key, { nama: nama.slice(0, 120), kel: +el('dkKl').value, siklus: +el('dkSk').value }, function (e) { if (e) galatTulis(e); else tutupModal(); segar(); });
    };
  }
  function unduhCsv() {
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var baris = [['Dokumen Kepala Madrasah', hariIni()], [], ['Kelompok', 'Dokumen', 'Status', 'Tgl. penyusunan', 'Tgl. pengesahan', 'Siklus revisi', 'Pengingat', 'Tautan', 'Catatan']];
    var namaStatus = {}; DD.STATUS_DOK.forEach(function (x) { namaStatus[x[0]] = x[1]; });
    semuaDefinisi().forEach(function (d) {
      var r = rekam(d), pg = pengingat(d, r);
      baris.push([DD.KELOMPOK.concat(['Lainnya'])[d.kel], d.nama, namaStatus[r.status || 'belum'], r.tgl || '', r.tglSah || '', DD.SIKLUS_LABEL[d.siklus] || '', pg ? pg.t : '', r.link || '', r.catatan || '']);
    });
    var csv = '﻿' + baris.map(function (b) { return b.map(q).join(','); }).join('\r\n');
    unduh(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'dokumen-kepala_' + hariIni() + '.csv');
  }

  // ---------- TAB 2: pemantau RKT ----------
  function daftarProgram(label) {
    var o = dataRkt(label), arr = Object.keys(o).map(function (k) { var p = o[k] || {}; p.id = k; return p; });
    var urut = {}; DD.BIDANG.forEach(function (b, i) { urut[b] = i; });
    return arr.sort(function (a, c) { var x = urut[a.bidang] != null ? urut[a.bidang] : 99, y = urut[c.bidang] != null ? urut[c.bidang] : 99; return x - y || String(a.tenggat || '9999').localeCompare(String(c.tenggat || '9999')) || String(a.program).localeCompare(String(c.program)); });
  }
  function terlambat(p) { var t = hariIni(); return !!p.tenggat && p.tenggat < t && (p.status === 'belum' || p.status === 'berjalan'); }
  function htmlRkt() {
    var label = taTerpilih(), prog = daftarProgram(label), snap = kpiSnap(), today = hariIni();
    var h = '<div class="dk-bar-tool"><label style="font-size:12px;">Tahun ajaran <select id="dkTa" class="dk-in">' + daftarTa().map(function (t) { return '<option value="' + t + '"' + (t === label ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
      '<label style="font-size:12px;">Bidang <select id="dkBid" class="dk-in"><option value="semua">Semua bidang</option>' + DD.BIDANG.map(function (b) { return '<option value="' + esc(b) + '"' + (S.bidang === b ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></label><span class="sp"></span>' +
      '<button type="button" class="btn btn-primary" id="dkTambahProg">+ Program</button></div>';
    if (!prog.length) {
      var lalu = daftarProgram(taLabel(+label.slice(0, 4) - 1));
      h += '<p class="text-muted">Belum ada program RKT untuk tahun ajaran ' + esc(label) + '.</p>' + (lalu.length ? '<button type="button" class="btn btn-soft" id="dkSalin">Salin ' + lalu.length + ' program dari ' + taLabel(+label.slice(0, 4) - 1) + '</button> <span class="text-muted" style="font-size:12px;">Status dan progres diatur ulang.</span>' : '');
      return h;
    }
    var n = { belum: 0, berjalan: 0, tercapai: 0, tidak: 0 }, jml = 0, telat = 0;
    prog.forEach(function (p) { n[WARNA_RKT[p.status] ? p.status : 'belum']++; jml += +p.progres || 0; if (terlambat(p)) telat++; });
    var rata = Math.round(jml / prog.length);
    h += '<div class="dk-sum">' + [['Tercapai', n.tercapai, WARNA_RKT.tercapai], ['Berjalan', n.berjalan, WARNA_RKT.berjalan], ['Belum mulai', n.belum, WARNA_RKT.belum], ['Lewat tenggat', telat, '#dc2626']].map(function (x) {
      return '<div class="dk-box"><div class="n" style="color:' + x[2] + ';">' + x[1] + '</div><div class="l">' + x[0] + ' dari ' + prog.length + ' program</div></div>';
    }).join('') + '</div><div class="dk-box"><div style="font-size:12px;opacity:.8;">Rata-rata progres seluruh program: ' + rata + '%</div><div class="dk-bar"><i style="width:' + rata + '%;background:' + WARNA_RKT.tercapai + ';"></i></div></div>';
    if (snap) h += '<p class="text-muted" style="font-size:12px;margin:6px 0 0;">Nilai KPI yang ditampilkan: periode <b>' + esc(snap.periode) + '</b>, dimuat ' + esc(snap.waktu ? new Date(snap.waktu).toLocaleString('id-ID') : '-') + '. Ganti periode di halaman KPI Madrasah untuk melihat periode lain.</p>';
    else if (prog.some(function (p) { return p.kpi; })) h += '<p class="text-muted" style="font-size:12px;margin:6px 0 0;">Nilai KPI belum dimuat. Buka halaman <a href="#" data-ke="kpi">KPI Madrasah</a> sekali, lalu kembali ke sini.</p>';
    DD.BIDANG.concat(['(Lainnya)']).forEach(function (b) {
      var isLain = b === '(Lainnya)';
      var daftar = prog.filter(function (p) { return isLain ? DD.BIDANG.indexOf(p.bidang) < 0 : p.bidang === b; });
      if (!daftar.length || (S.bidang !== 'semua' && S.bidang !== b)) return;
      var rb = Math.round(daftar.reduce(function (a, p) { return a + (+p.progres || 0); }, 0) / daftar.length), sel = daftar.filter(function (p) { return p.status === 'tercapai'; }).length;
      h += '<div class="dk-h">' + esc(b) + ' <small>' + sel + ' dari ' + daftar.length + ' tercapai, progres ' + rb + '%</small></div>' + daftar.map(function (p) { return htmlProgram(p, snap, today); }).join('');
    });
    return h;
  }
  function htmlProgram(p, snap, today) {
    var st = WARNA_RKT[p.status] ? p.status : 'belum', nm = (DD.STATUS_RKT.filter(function (x) { return x[0] === st; })[0] || [0, st])[1], pr = Math.max(0, Math.min(100, +p.progres || 0)), id = esc(p.id);
    var h = '<div class="dk-row"><div class="dk-top"><b>' + esc(p.program) + '</b><span class="dk-chip" style="background:' + WARNA_RKT[st] + ';">' + esc(nm) + '</span>' + (terlambat(p) ? '<span class="dk-chip" style="background:#dc2626;">Lewat tenggat</span>' : '') + '</div>';
    var meta = [];
    if (p.indikator) meta.push('Indikator: ' + p.indikator); if (p.target) meta.push('Target: ' + p.target);
    if (p.pj) meta.push('PJ: ' + p.pj); if (p.tenggat) meta.push('Tenggat: ' + tglId(p.tenggat));
    if (meta.length) h += '<div class="dk-ket">' + meta.map(esc).join(' &middot; ') + '</div>';
    h += '<div class="dk-prog"><span style="min-width:70px;">Progres ' + pr + '%</span><div class="dk-bar"><i style="width:' + pr + '%;background:' + WARNA_RKT[st] + ';"></i></div></div>';
    if (p.kpi) {
      var it = snap && snap.items && snap.items[p.kpi], nmK = (DD.KPI_LINK.filter(function (x) { return x[0] === p.kpi; })[0] || [0, p.kpi])[1];
      if (it && it.nilai != null) {
        var kp = kpiProgres(it);
        h += '<div class="dk-kpi"><span>KPI <b>' + esc(nmK) + '</b>: <b style="color:' + esc(it.warna || 'inherit') + ';">' + f1(it.nilai) + '</b> (target ' + targetTeks(it) + ') &middot; ' + esc(it.status || '') + (kp != null ? ' &middot; capaian ' + kp + '% dari target' : '') + '</span>' +
          (it.status === 'Tercapai' && st !== 'tercapai' ? ' <button type="button" class="btn btn-soft" data-tandai="' + id + '">KPI tercapai: tandai program tercapai</button>' : '') + '</div>';
      } else h += '<div class="dk-kpi"><span>KPI <b>' + esc(nmK) + '</b>: ' + (it ? 'belum ada data pada periode ini' : 'nilai belum dimuat') + '</span></div>';
    }
    if (p.catatan) h += '<div class="dk-ket" style="margin-top:6px;">Catatan: ' + esc(p.catatan) + '</div>';
    return h + '<div style="text-align:right;margin-top:6px;"><button type="button" class="btn btn-soft" data-ubahprog="' + id + '">Ubah</button></div></div>';
  }
  function bukaFormProgram(id) {
    var label = taTerpilih(), p = id ? (dataRkt(label)[id] || {}) : {}, st = WARNA_RKT[p.status] ? p.status : 'belum';
    modal('<h3>' + (id ? 'Ubah program' : 'Tambah program') + ' <small style="font-weight:400;opacity:.7;">TA ' + esc(label) + '</small></h3>' +
      '<div class="dk-2"><div class="dk-f"><label for="dkpB">Bidang</label><select id="dkpB" class="dk-in">' + DD.BIDANG.map(function (b) { return '<option' + (b === (p.bidang || S.bidang) ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></div>' +
      '<div class="dk-f"><label for="dkpS">Status</label><select id="dkpS" class="dk-in">' + DD.STATUS_RKT.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === st ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="dk-f"><label for="dkpP">Program / kegiatan</label><input id="dkpP" class="dk-in" maxlength="200" value="' + esc(p.program || '') + '"></div>' +
      '<div class="dk-2"><div class="dk-f"><label for="dkpI">Indikator capaian</label><input id="dkpI" class="dk-in" maxlength="200" value="' + esc(p.indikator || '') + '" placeholder="mis. 90% guru punya modul ajar"></div>' +
      '<div class="dk-f"><label for="dkpT">Target</label><input id="dkpT" class="dk-in" maxlength="100" value="' + esc(p.target || '') + '"></div></div>' +
      '<div class="dk-2"><div class="dk-f"><label for="dkpJ">Penanggung jawab</label><input id="dkpJ" class="dk-in" maxlength="100" value="' + esc(p.pj || '') + '"></div>' +
      '<div class="dk-f"><label for="dkpD">Tenggat</label><input id="dkpD" type="date" class="dk-in" value="' + esc(p.tenggat || '') + '"></div></div>' +
      '<div class="dk-2"><div class="dk-f"><label for="dkpR">Progres (0–100%)</label><input id="dkpR" type="number" min="0" max="100" step="5" class="dk-in" value="' + (p.progres == null ? 0 : (+p.progres || 0)) + '"></div>' +
      '<div class="dk-f"><label for="dkpK">Hubungkan ke KPI</label><select id="dkpK" class="dk-in"><option value="">Tidak dihubungkan</option>' + DD.KPI_LINK.map(function (x) { return '<option value="' + x[0] + '"' + (p.kpi === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="dk-f"><label for="dkpC">Catatan</label><textarea id="dkpC" class="dk-in" maxlength="500" style="min-height:54px;">' + esc(p.catatan || '') + '</textarea></div>' +
      '<div class="dk-act">' + (id ? '<button type="button" class="btn btn-soft dk-del" id="dkpDel" style="margin-right:auto;">Hapus</button>' : '') + '<button type="button" class="btn btn-soft" data-tutup="1">Batal</button><button type="button" class="btn btn-primary" id="dkpSimpan">Simpan</button></div>');
    el('dkpSimpan').onclick = function () {
      var prog = el('dkpP').value.trim(); if (!prog) { pesan('Nama program wajib diisi.', true); return; }
      var pr = Math.round(+el('dkpR').value); if (!(pr >= 0 && pr <= 100)) { pesan('Progres harus 0 sampai 100.', true); return; }
      var tg = el('dkpD').value; if (tg && parseTgl(tg) == null) { pesan('Tenggat tidak valid.', true); return; }
      var stt = el('dkpS').value; if (stt === 'tercapai') pr = 100;
      var rec = { bidang: el('dkpB').value, program: prog, indikator: el('dkpI').value.trim(), target: el('dkpT').value.trim(), pj: el('dkpJ').value.trim(), tenggat: tg, status: stt, progres: pr, kpi: el('dkpK').value, catatan: el('dkpC').value.trim(), upd: Date.now() };
      Object.keys(rec).forEach(function (k) { if (rec[k] === '') delete rec[k]; });
      var key = id || db.ref(NODE + '/rkt/' + taKey(label)).push().key;
      tulis('rkt/' + taKey(label) + '/' + key, rec, function (e) {
        if (e) { galatTulis(e); return; }
        try { if (typeof addLog === 'function') addLog('rkt_program_simpan', prog); } catch (x) {}
        tutupModal(); segar();
      });
    };
    if (id) el('dkpDel').onclick = function () {
      if (typeof confirm === 'function' && !confirm('Hapus program "' + (p.program || '') + '"?')) return;
      tulis('rkt/' + taKey(label) + '/' + id, null, function (e) { if (e) galatTulis(e); else { tutupModal(); segar(); } });
    };
  }
  function salinDariLalu() {
    var label = taTerpilih(), lalu = daftarProgram(taLabel(+label.slice(0, 4) - 1)), o = {}, base = Date.now();
    lalu.forEach(function (p) {
      var k = db.ref(NODE + '/rkt/' + taKey(label)).push().key, r = { bidang: p.bidang, program: p.program, status: 'belum', progres: 0, upd: base };
      ['indikator', 'target', 'pj', 'kpi'].forEach(function (f) { if (p[f]) r[f] = p[f]; });
      o[k] = r;
    });
    tulisBanyak('rkt/' + taKey(label), o, function (e) { if (e) galatTulis(e); else { pesan(lalu.length + ' program disalin.'); segar(); } });
  }
  function ubahProgramCepat(id, patch) {
    var label = taTerpilih(), p = dataRkt(label)[id]; if (!p) return;
    var r = {}; Object.keys(p).forEach(function (k) { r[k] = p[k]; }); delete r.id;
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); r.upd = Date.now();
    tulis('rkt/' + taKey(label) + '/' + id, r, function (e) { if (e) galatTulis(e); segar(); });
  }

  // ---------- TAB 3: kerangka dokumen ----------
  function htmlKerangka() {
    var snap = kpiSnap(), y = taAktif();
    var h = '<p class="text-muted" style="font-size:13px;margin:6px 0 10px;">Unduh kerangka sebagai berkas Word (.docx), lalu isi dan sesuaikan. Identitas madrasah dan kepala terisi dari data aplikasi' + (isAdminDk() || bolehLihat() ? '; tabel program RKT dan nilai KPI terisi dari tab Pemantau RKT dan halaman KPI.' : '.') + ' Teks abu-abu miring adalah petunjuk pengisian, hapus setelah diisi.</p>';
    ['rkjm', 'rkt', 'laporan_rkt'].forEach(function (kode) {
      var K = DD.KERANGKA[kode], isPeriode = K.jenisTa === 'periode';
      var pil = S.kerTa[kode] || taLabel(y);
      var bab = K.bangun(ctxDokumen(kode, pil, true)).filter(function (b) { return b.t === 'h1'; }).map(function (b) { return b.x; });
      var opsi = (isPeriode ? [y - 1, y, y + 1] : [y - 1, y, y + 1]).map(taLabel);
      h += '<div class="dk-ker"><h3>' + esc(K.judul) + '</h3><div class="text-muted" style="font-size:12px;">' + esc(K.ringkas) + '</div>' +
        '<ol>' + bab.map(function (b) { return '<li>' + esc(b.replace(/^BAB [IVX]+\s+/, '')) + '</li>'; }).join('') + '</ol>' +
        '<div class="dk-ctl"><label>' + (isPeriode ? 'Periode mulai tahun ajaran' : 'Tahun ajaran') + '<select class="dk-in" data-kerta="' + kode + '">' + opsi.map(function (t) { return '<option value="' + t + '"' + (t === pil ? ' selected' : '') + '>' + t + (isPeriode ? ' (4 tahun)' : '') + '</option>'; }).join('') + '</select></label>' +
        '<button type="button" class="btn btn-primary" data-unduhker="' + kode + '">Unduh Word (.docx)</button></div>' +
        (kode !== 'rkjm' ? '<div class="text-muted" style="font-size:12px;margin-top:6px;">Terisi otomatis: ' + (daftarProgram(pil).length ? daftarProgram(pil).length + ' program dari Pemantau RKT' : 'belum ada program RKT untuk TA ini (tabel dikosongkan)') + '; ' + (snap ? 'nilai KPI periode ' + esc(snap.periode) : 'nilai KPI belum dimuat (buka halaman KPI sekali)') + '.</div>' : '') + '</div>';
    });
    return h;
  }
  // Konteks isian dokumen. ringan = true: tanpa data berat (pratinjau daftar bab).
  function ctxDokumen(kode, taLbl, ringan) {
    var M = (typeof MADRASAH !== 'undefined' && MADRASAH) ? MADRASAH : {}, y = +String(taLbl).slice(0, 4) || taAktif();
    var thn = [0, 1, 2, 3].map(function (i) { return taLabel(y + i); });
    var snap = ringan ? null : kpiSnap(), kpi = [];
    if (snap && snap.items) DD.KPI_LINK.forEach(function (k) { var it = snap.items[k[0]]; if (it) kpi.push({ nama: k[1], nilai: it.nilai, targetTeks: targetTeks(it), statusTeks: it.status || '' }); });
    var prog = ringan ? [] : daftarProgram(taLbl).map(function (p) { return { bidang: p.bidang, program: p.program, indikator: p.indikator, target: p.target, pj: p.pj, tenggat: p.tenggat, status: WARNA_RKT[p.status] ? p.status : 'belum', progres: p.progres, catatan: p.catatan }; });
    return { nama: M.nama || '', alamat: M.alamat || '', npsn: M.npsn || '', nsm: M.nsm || '', kota: M.kota || M.kabupaten || '', kepala: M.kepala_sekolah || '', nip: M.nip_kepala_sekolah || '',
      ta: taLbl, tahun: kode === 'rkjm' ? (y + '–' + (y + 3)) : (y + '/' + (y + 1)), periode: { label: thn[0] + ' – ' + thn[3], thn: thn }, bidang: DD.BIDANG, program: prog, kpi: kpi, kpiPeriode: snap ? snap.periode : '', tglCetak: DD.tglId(hariIni()) };
  }
  function unduhKerangka(kode) {
    if (!window.DocxMini) { pesan('Pembuat Word (docx-mini.js) belum dimuat. Muat ulang halaman.', true); return; }
    var K = DD.KERANGKA[kode], pil = S.kerTa[kode] || taLabel(taAktif());
    try {
      var c = ctxDokumen(kode, pil, false), blk = K.bangun(c), y = +pil.slice(0, 4);
      var nama = { rkjm: 'RKJM', rkt: 'RKT', laporan_rkt: 'Laporan-RKT' }[kode] + '_' + slug(c.nama) + '_' + (kode === 'rkjm' ? y + '-' + (y + 3) : y + '-' + (y + 1)) + '.docx';
      unduh(window.DocxMini.blob(blk, { judul: K.judul + ' ' + (c.nama || '') }), nama);
      try { if (typeof addLog === 'function') addLog('dokumen_kepala_unduh', K.judul + ' ' + pil); } catch (x) {}
    } catch (e) { pesan('Gagal membuat berkas: ' + ((e && e.message) || e), true); try { console.error('[dokumen-kepala]', e); } catch (x) {} }
  }

  // ---------- modal ----------
  function modal(html) {
    tutupModal();
    var m = document.createElement('div'); m.id = 'dkModal'; m.className = 'dk-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div>' + html + '</div>';
    m.addEventListener('mousedown', function (ev) { if (ev.target === m) tutupModal(); });
    m.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('[data-tutup]')) tutupModal(); });
    document.body.appendChild(m);
    var f = m.querySelector('input,select,textarea'); if (f) try { f.focus(); } catch (e) {}
  }
  function tutupModal() { var m = el('dkModal'); if (m) m.remove(); }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') tutupModal(); });

  // ---------- penangan klik & ubah (satu kali pasang) ----------
  function pasangEvent(pg) {
    pg.addEventListener('click', function (ev) {
      var t = ev.target, b;
      if (!t || !t.closest) return;
      if ((b = t.closest('[data-dtab]'))) { S.tab = b.getAttribute('data-dtab'); segar(); return; }
      if ((b = t.closest('[data-fil]'))) { S.filter = b.getAttribute('data-fil'); segar(); return; }
      if (t.closest('#dkTambahDok')) { bukaTambahDok(); return; }
      if (t.closest('#dkCsv')) { unduhCsv(); return; }
      if ((b = t.closest('[data-revisi]'))) {
        if (typeof confirm === 'function' && !confirm('Tandai dokumen ini sudah direvisi? Tanggal penyusunan menjadi hari ini dan status kembali ke Draf.')) return;
        simpanDok(b.getAttribute('data-revisi'), { status: 'draf', tgl: hariIni(), tglSah: '' }); return;
      }
      if ((b = t.closest('[data-hapusdok]'))) {
        if (typeof confirm === 'function' && !confirm('Hapus dokumen tambahan ini beserta statusnya?')) return;
        var kid = b.getAttribute('data-hapusdok');
        tulis('kustom/' + kid, null, function (e) { if (e) { galatTulis(e); return; } tulis('dokumen/k_' + kid, null, function () { segar(); }); }); return;
      }
      if (t.closest('#dkTambahProg')) { bukaFormProgram(null); return; }
      if ((b = t.closest('[data-ubahprog]'))) { bukaFormProgram(b.getAttribute('data-ubahprog')); return; }
      if (t.closest('#dkSalin')) { salinDariLalu(); return; }
      if ((b = t.closest('[data-tandai]'))) { ubahProgramCepat(b.getAttribute('data-tandai'), { status: 'tercapai', progres: 100 }); return; }
      if ((b = t.closest('[data-unduhker]'))) { unduhKerangka(b.getAttribute('data-unduhker')); return; }
      if ((b = t.closest('[data-ke]'))) { ev.preventDefault(); try { navigateTo(b.getAttribute('data-ke')); } catch (e) {} return; }
    });
    pg.addEventListener('change', function (ev) {
      var t = ev.target; if (!t || !t.getAttribute) return;
      var f = t.getAttribute('data-f'), id = t.getAttribute('data-id');
      if (f && id) {
        var v = t.value;
        if (f === 'link') { var nl = normLink(v); if (nl === null) { pesan('Tautan harus berupa alamat web (http/https).', true); segar(); return; } v = nl; }
        else if (f === 'tgl' || f === 'tglSah') { if (v && parseTgl(v) == null) { pesan('Tanggal tidak valid.', true); segar(); return; } }
        var patch = {}; patch[f] = String(v).slice(0, 500); simpanDok(id, patch); return;
      }
      if (t.id === 'dkTa') { S.ta = t.value; segar(); return; }
      if (t.id === 'dkBid') { S.bidang = t.value; segar(); return; }
      var kt = t.getAttribute('data-kerta'); if (kt) { S.kerTa[kt] = t.value; segar(); }
    });
  }

  // ---------- sambungan ke menu & halaman ----------
  function aturMenu() {
    var ok = bolehLihat();
    Array.prototype.forEach.call(document.querySelectorAll('.menu-item[data-page="dokumen-kepala"]'), function (m) { m.classList.toggle('hidden-tab', !ok); });
  }
  function pasang() {
    var pg = el('page-dokumen-kepala'); if (!pg) return;
    pasangEvent(pg);
    var tampilSebelumnya = false;
    new MutationObserver(function () {
      var tampil = !pg.classList.contains('hidden');
      if (tampil && !tampilSebelumnya) {
        var t = el('pageTitle'); if (t) t.textContent = NAMA_HAL;
        S.coba = false; S.muat = false;   // baca ulang dari Firebase setiap halaman dibuka
        try { render(); } catch (e) { pg.innerHTML = '<div class="card"><p class="text-muted">Halaman gagal dimuat: ' + esc(e && e.message ? e.message : e) + '</p></div>'; try { console.error('[dokumen-kepala]', e); } catch (e2) {} }
      }
      if (!tampil) tutupModal();
      tampilSebelumnya = tampil;
    }).observe(pg, { attributes: true, attributeFilter: ['class'] });
    var judul = el('pageTitle');
    if (judul) new MutationObserver(function () {
      if (pg.classList.contains('hidden')) return;
      if (judul.textContent !== NAMA_HAL) judul.textContent = NAMA_HAL;
    }).observe(judul, { childList: true, characterData: true, subtree: true });
    aturMenu(); setInterval(aturMenu, 2000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang); else pasang();

  window.DokumenKepala = { pengingat: pengingat, tambahBulan: tambahBulan, kpiProgres: kpiProgres, ctxDokumen: ctxDokumen };
})();
