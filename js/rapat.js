/* ============================================================
   RAPAT -- js/rapat.js
   Dimuat SETELAH app.js & menu-hub.js (lihat index.html), pola sama dengan buku-tamu.js: modul mandiri,
   halaman dibuat sendiri lewat JS, data dimuat sendiri dari db.ref('rapat') & db.ref('rapat_hadir/<id>'),
   tidak menyentuh loadAllData().
   Admin   = buat/hapus rapat, ubah pimpinan, ubah status siapa pun (termasuk Kepala -> Dinas Luar), notulen, tutup rapat.
   Semua guru (termasuk Kepala, yang ditambahkan sebagai peserta sintetis 'kepsek') = melihat rapat & mengisi kehadiran dirinya sendiri pada hari rapat.
   Status: Hadir, Hadir Daring, Izin, Sakit, Dinas Luar, Alpha. Dinas Luar = berhalangan yang sah (bukan Alpha).
   Bila Kepala berhalangan, rapat tetap jalan dan dipimpin pengganti yang dipilih Admin.
   HONOR (opsional): Admin mengisi nominal per kehadiran (0 = tanpa honor). Saat rapat DITUTUP, guru berstatus Hadir / Hadir Daring
   dicatatkan ke event_attendance (key tetap 'rpt_<rapatId>_<guruId>', eventKey 'rapat_<rapatId>', jenis 'Rapat') -- tabel yang SAMA
   dengan Lembur & Rapat di Kegiatan Tambahan, sehingga rekap Honor, slip, dan laporan yang sudah ada langsung menghitungnya tanpa
   perubahan. Buka kembali / hapus rapat menarik honornya lagi. Kepala Madrasah tidak ikut honor rapat per kehadiran (tidak ada di data guru).
   DINAS LUAR KEPALA: Admin mencatat tiap dinas luar Kepala + nominal honor (berbeda tiap kegiatan) di tombol "Dinas Luar Kepala".
   Disimpan di event_attendance (key 'dlk_<id>', guruKey 'kepsek', sumber 'dinas-luar-kepala'); rekap Honor (app.js) menjumlahkannya
   ke baris tetap "Kepala Madrasah" pada bulan tanggal kegiatan.
   REVISI AUDIT: guard klik ganda (dinas luar, tutup, buka lagi, hapus), tutup rapat = SATU update atomik, kunci rapat_hadir aman,
   isian form tidak hilang saat render ulang, reset data saat pergantian akun, esc() mandiri (aman utk atribut), parsing angka ketat,
   Alpha otomatis 'sistem' ikut dibersihkan saat rapat dibuka kembali, pagination daftar rapat, daftar guru nonaktif/duplikat disaring.
============================================================ */
(function () {
  'use strict';

  var PAGE = 'rapat';
  var ST = { hadir: 'Hadir', daring: 'Hadir Daring', izin: 'Izin', sakit: 'Sakit', dl: 'Dinas Luar', alpha: 'Alpha' };
  var BERHALANGAN = { izin: 1, sakit: 1, dl: 1, alpha: 1 };
  var HONOR_STATUS = { hadir: 1, daring: 1 };            // status yang mendapat honor (ubah di sini bila kebijakan berbeda)
  var HONOR_MAKS = 10000000;   // pengaman salah ketik per kehadiran/kegiatan; naikkan bila kebijakan honor lebih besar
  var WAJIB_ROLE = false;     // true = akun tanpa role BUKAN peserta rapat (aktifkan bila semua data guru sudah punya field role)
  var ALPHA_KEPALA = false;   // true = Kepala yang belum diisi ikut otomatis Alpha saat rapat ditutup
  var COL = new Intl.Collator('id');

  var root = null, rapat = [], loaded = false, loadErr = '';
  var view = 'list', cur = null, hadir = {}, hadirLoaded = false, gurus = null;
  var hadirErr = false, loadSeq = 0, notulenDraft = null, limitN = 60, guruErr = false, guruWait = null, lastView = '', lastSession = null;
  var dlList = null, dlErr = '', dlPrefill = null;   // Dinas Luar Kepala

  /* ---------- util ---------- */
  function esc(s) {   // mandiri: meng-escape & < > " ' sehingga aman dipakai di dalam atribut HTML
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function canManage() { return !!currentUser && typeof isAdmin === 'function' && isAdmin(); }
  function pad(n) { return ('0' + n).slice(-2); }
  function today() { if (typeof tglLokal === 'function') return tglLokal(); var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function tgl(s) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(s || ''); if (!m) return s || '-';
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }
  function rupiah(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function aman(k) { return String(k).replace(/[.#$\[\]\/]/g, '_'); }

  function hk(id) { return aman(id); }   // kunci aman utk path rapat_hadir (ID dengan . # $ [ ] / tidak lagi membuat Firebase melempar error)
  function say(m, err) { if (typeof toast === 'function') toast(m, err); else console[err ? 'error' : 'log']('[rapat]', m); }
  function log(a, b) { try { if (typeof addLog === 'function') addLog(a, b); } catch (e) { /* gagal mencatat log tidak boleh membuat operasi yang sudah sukses tampak gagal */ } }
  function online() { return typeof isReallyOnline === 'function' ? isReallyOnline() : navigator.onLine; }
  var busyMap = {};
  var bz = {   // memakai isBusy/setBusy/clearBusy milik app.js bila ada; bila tidak ada, pakai cadangan lokal
    is: function (k) { return typeof isBusy === 'function' ? isBusy(k) : !!busyMap[k]; },
    set: function (k, b) { if (typeof setBusy === 'function') setBusy(k, b); else { busyMap[k] = 1; if (b) b.disabled = true; } },
    clear: function (k, b) { if (typeof clearBusy === 'function') clearBusy(k, b); else { delete busyMap[k]; if (b) b.disabled = false; } }
  };
  function angka(x) { x = String(x == null ? '' : x).trim(); return /^\d{1,15}$/.test(x) ? Number(x) : NaN; }   // hanya bilangan bulat >= 0 ('1e6' / '1.5' ditolak, bukan dipotong jadi 1)
  function autoAlpha(g) { return ALPHA_KEPALA || !g.kepala; }
  function nonaktif(u) {
    var st = String(u.status || u.statusKepegawaian || '').toLowerCase();
    return u.aktif === false || u.active === false || u.nonaktif === true || /^(nonaktif|non-aktif|tidak aktif|keluar|pindah|resign|pensiun|alumni)/.test(st);
  }
  function keyHonor(rapatId, gid) { return 'rpt_' + rapatId + '_' + aman(gid); }
  function reloadHonorData() { try { if (typeof reloadDataset === 'function') reloadDataset(['eventAttendance']); } catch (e) { /* data honor dimuat ulang saat login berikutnya */ } }
  function madInfo() { return (typeof MADRASAH !== 'undefined' && MADRASAH) || {}; }
  function rapatById(id) { return rapat.filter(function (x) { return x.id === id; })[0]; }
  function guruById(id) { return (gurus || []).filter(function (g) { return g.id === id; })[0]; }
  function kepala() { return (gurus || []).filter(function (g) { return g.kepala; })[0]; }
  /* Rekaman kehadiran hanya dipercaya bila status-nya salah satu kunci ST (cegah XSS & tampilan "undefined"). */
  function cleanRec(rec) {
    return rec && typeof rec === 'object' && Object.prototype.hasOwnProperty.call(ST, rec.status) ? rec : null;
  }
  /* Kepala Madrasah TIDAK ada di data guru (login 'kepsek' hardcoded di app.js, tanpa key) -> ditambahkan sebagai peserta sintetis. */
  function withKepala(list) {
    var nm = String(madInfo().kepala_sekolah || 'Kepala Madrasah');
    list = list.filter(function (g) { return !g.kepala && g.id !== 'kepsek'; });
    list.unshift({ id: 'kepsek', nama: nm, role: 'kepsek', kepala: true });
    return list;
  }
  function injectCss() {
    if ($('rpStyle')) return;
    var st = document.createElement('style'); st.id = 'rpStyle';
    st.textContent = '.rp-item{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;background:#fff;cursor:pointer}' +
      '.rp-h{display:flex;justify-content:space-between;gap:8px;align-items:center}.rp-m{font-size:12.5px;color:#6b7280;margin-top:2px}' +
      '.rp-badge{font-size:11.5px;border-radius:999px;padding:2px 8px;background:#fef3c7;color:#92400e;white-space:nowrap}.rp-badge.selesai{background:#e5e7eb;color:#374151}' +
      '.rp-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.rp-bar .field{flex:1;min-width:130px}' +
      '.rp-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.rp-form .full{grid-column:1/-1}' +
      '.rp-tbl{width:100%;border-collapse:collapse;font-size:13px}.rp-tbl td,.rp-tbl th{border:1px solid #e5e7eb;padding:5px 8px;text-align:left;vertical-align:middle}' +
      '.rp-warn{background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:8px;padding:8px 12px;font-size:13px;margin:10px 0}' +
      '.rp-st{font-weight:600}.rp-st.hadir,.rp-st.daring{color:#059669}.rp-st.dl,.rp-st.izin,.rp-st.sakit{color:#b45309}.rp-st.alpha{color:#dc2626}';
    document.head.appendChild(st);
  }

  /* ---------- daftar guru ----------
     ADAPTER: sesuaikan bila nama variabel/jalur data guru di app.js berbeda. Urutan: variabel global app.js,
     lalu baca langsung dari database. Kepala = role yang mengandung "kepsek"/"kepala" (bukan "wakil"). */
  var SUMBER = [
    function () { return typeof allTeachers !== 'undefined' ? allTeachers : null; },
    function () { return typeof allUsers !== 'undefined' ? allUsers : null; },
    function () { return typeof teachers !== 'undefined' ? teachers : null; },
    function () { return typeof users !== 'undefined' ? users : null; },
    function () { return typeof allGuru !== 'undefined' ? allGuru : null; }
  ];
  var DB_PATHS = ['teachers', 'users', 'guru'];
  function norm(src) {
    var arr = [];
    if (Array.isArray(src)) arr = src.slice();
    else if (src && typeof src === 'object') Object.keys(src).forEach(function (k) {
      var v = src[k]; if (v && typeof v === 'object') arr.push(v.id == null ? Object.assign({}, v, { id: k }) : v);
    });
    var seen = {};
    return arr.map(function (u) {
      var role = String(u.role || u.baseRole || u.jabatan || '');
      return { id: String(u.id != null ? u.id : (u.key || u.uid || u.nama || u.name || '')), nama: String(u.nama || u.name || u.username || ''), role: role, off: nonaktif(u) };
    }).filter(function (g) {
      if (!g.nama || g.off || /^admin$/i.test(g.role)) return false;
      if (!(g.role ? /guru|wali|kepsek|kepala|wakil/i.test(g.role) : !WAJIB_ROLE)) return false;
      var kid = g.id || g.nama; if (seen[kid]) return false; seen[kid] = 1; return true;   // buang duplikat ID
    }).map(function (g) {
      g.kepala = /\bkepsek\b|^kepala$|kepala\s+(madrasah|sekolah)/i.test(g.role) && !/wakil/i.test(g.role); return g;   // "Kepala Perpustakaan" dst. bukan Kepala Madrasah
    }).sort(function (a, b) { return (b.kepala - a.kepala) || COL.compare(a.nama, b.nama); });
  }
  function loadGuru(cb) {
    if (gurus && gurus.length) return cb();
    if (guruWait) { guruWait.push(cb); return; }          // pemuatan sedang berjalan: cukup antre
    for (var i = 0; i < SUMBER.length; i++) {
      var s = null; try { s = SUMBER[i](); } catch (e) { s = null; }
      var g = norm(s); if (g.length) { gurus = withKepala(g); return cb(); }
    }
    guruWait = [cb]; guruErr = false;
    function selesai() {
      var w = guruWait || []; guruWait = null;
      w.forEach(function (f) { try { f(); } catch (e) { console.error('[rapat]', e); } });
    }
    var idx = 0, gagal = false;
    (function next() {
      if (idx >= DB_PATHS.length) { gurus = []; guruErr = gagal; return selesai(); }
      Promise.resolve(withTimeout(db.ref(DB_PATHS[idx++]).once('value'), 'guru')).then(function (sn) {
        if (!sn) { gagal = true; return []; }
        return norm(sn.val());
      }, function () { gagal = true; return []; }).then(function (arr) {
        if (arr.length) { gurus = withKepala(arr); selesai(); } else next();   // error di callback tidak lagi memicu next()
      });
    })();
  }
  function me() {
    if (!currentUser || !gurus) return null;
    if (typeof isKepsek === 'function' && isKepsek()) return guruById('kepsek') || null;
    var id = String(currentUser.id != null ? currentUser.id : (currentUser.key || currentUser.uid || ''));
    var nm = String(currentUser.nama || currentUser.name || '');
    var byId = id ? gurus.filter(function (g) { return g.id === id; })[0] : null;
    if (byId) return byId;
    var byNm = nm ? gurus.filter(function (g) { return g.nama === nm; }) : [];
    return byNm.length === 1 ? byNm[0] : null;   // nama kembar = ambigu, jangan menebak
  }

  /* ---------- data ---------- */
  function withTimeout(q, label) {
    return typeof fbTimeout === 'function' ? fbTimeout(q, 8000, label) : q;   // fbTimeout (app.js) resolve undefined bila timeout/gagal
  }
  function loadRapat() {
    if (!online()) { if (!loaded) loadErr = 'Perlu koneksi internet untuk memuat rapat.'; return render(); }
    loadErr = '';
    var seq = ++loadSeq;
    withTimeout(db.ref('rapat').orderByChild('tanggal').limitToLast(limitN).once('value'), 'rapat').then(function (sn) {
      if (seq !== loadSeq) return;                       // ada pemuatan yang lebih baru
      if (!sn) { if (!loaded) loadErr = 'Gagal memuat rapat (koneksi lambat). Tekan Muat ulang.'; return; }
      var a = []; sn.forEach(function (c) { var v = c.val() || {}; v.id = c.key; a.push(v); });
      a.reverse(); rapat = a; loaded = true;
    }).catch(function (e) { if (seq === loadSeq) loadErr = 'Gagal memuat rapat: ' + (e && e.message || e); }).then(render);
  }
  function buka(id) {
    cur = id; view = 'detail'; hadir = {}; hadirLoaded = false; hadirErr = false;
    if (!notulenDraft || notulenDraft.id !== id) notulenDraft = null;
    render();
    loadGuru(function () {
      if (cur !== id) return;
      withTimeout(db.ref('rapat_hadir/' + id).once('value'), 'rapat_hadir').then(function (sn) {
        if (cur !== id) return;                          // pengguna sudah pindah rapat: jangan timpa data
        if (!sn) hadirErr = true; else { hadir = sn.val() || {}; hadirLoaded = true; }
      }).catch(function (e) {
        if (cur === id) { hadirErr = true; say('Gagal memuat kehadiran: ' + (e && e.message || e), true); }
      }).then(function () { if (cur === id) render(); });
    });
  }
  function ubahRapat(field, v, msg) {
    var r = rapatById(cur); if (!r || !canManage()) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    db.ref('rapat/' + cur + '/' + field).set(v).then(function () { r[field] = v; if (msg) say(msg); render(); })
      .catch(function (e) { say('Gagal: ' + (e && e.message || e), true); });
  }
  function setStatus(gid, st, ket, oleh) {
    var r = rapatById(cur), g = guruById(gid); if (!r || !g) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    var id = cur, k = hk(gid);
    var rec = { status: st, nama: g.nama, ts: firebase.database.ServerValue.TIMESTAMP, oleh: oleh };
    if (ket) rec.ket = String(ket).slice(0, 150);
    // Jangan menulis ke rapat yang sudah ditutup (mis. halaman lama masih terbuka) -- kehadiran & honor bisa tidak sinkron.
    db.ref('rapat/' + id + '/status').once('value').then(function (sn) {
      if (sn.val() === 'selesai') { r.status = 'selesai'; throw new Error('Rapat sudah ditutup. Buka kembali rapat untuk mengubah kehadiran.'); }
      return db.ref('rapat_hadir/' + id + '/' + k).set(rec);
    }).then(function () {
      rec.ts = Date.now(); if (cur === id) hadir[k] = rec; say('Status diperbarui'); render();
    }).catch(function (e) { say('Gagal: ' + (e && e.message || e), true); render(); });
  }
  function tanyaKet(st) {
    if (st === 'hadir' || st === 'daring') return '';
    var def = st === 'dl' ? 'Tugas dinas luar' : '';
    var k = prompt('Keterangan (opsional, maks. 150 karakter):', def);
    return k === null ? null : k.trim();
  }

  /* ---------- tampilan ---------- */
  function ensurePage() {
    var div = $('page-' + PAGE);
    if (div && root === div) return;
    if (!div) {
      var host = $('mainContent'); if (!host) { console.warn('[rapat] elemen #mainContent tidak ditemukan -- halaman Rapat tidak bisa dipasang.'); return; }
      div = document.createElement('div'); div.id = 'page-' + PAGE; div.className = 'page-content hidden'; host.appendChild(div);
    }
    root = div; root.addEventListener('click', onClick); root.addEventListener('change', onChange);
  }
  var DRAFT_RE = /^(rpf-|rpdl-|rpHonor$|rpSelf$)/;
  function snapDraft() {   // simpan isian form yang sedang diketik supaya tidak hilang saat render ulang
    var d = {}, els = root.querySelectorAll('input[id],select[id],textarea[id]');
    for (var i = 0; i < els.length; i++) if (DRAFT_RE.test(els[i].id)) d[els[i].id] = els[i].value;
    return d;
  }
  function sessionKey() {
    if (typeof currentUser === 'undefined' || !currentUser) return '';
    return String(currentUser.id != null ? currentUser.id : (currentUser.key || currentUser.uid || currentUser.username || currentUser.name || currentUser.nama || ''));
  }
  function checkSession() {   // logout lewat jalur mana pun / ganti akun => data modul ini dibuang
    var k = sessionKey();
    if (lastSession !== null && k !== lastSession) resetState();
    lastSession = k;
  }
  function render() {
    if (!root || root.classList.contains('hidden')) return;
    checkSession();
    if (!currentUser) { root.innerHTML = ''; lastView = ''; return; }
    var nt = $('rpNotulen'); if (nt && view === 'detail') notulenDraft = { id: cur, v: nt.value };
    var vk = view + ':' + cur, draft = vk === lastView ? snapDraft() : {};
    var body = view === 'detail' ? detailHtml() : (view === 'buat' || view === 'ubah') ? buatHtml() : view === 'dl' ? dlHtml() : listHtml();
    root.innerHTML = '<div class="card"><h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">🗓️ Rapat</h3>' + body + '</div>';
    Object.keys(draft).forEach(function (id) { var el = $(id); if (el) el.value = draft[id]; });
    lastView = vk;
    var nt2 = $('rpNotulen'); if (nt2 && notulenDraft && notulenDraft.id === cur) nt2.value = notulenDraft.v;
  }
  function listHtml() {
    var bar = '<div class="rp-bar"><button class="btn btn-soft" data-rp="reload">🔄 Muat ulang</button>' +
      (canManage() ? '<button class="btn btn-success" data-rp="buat">➕ Buat Rapat</button><button class="btn btn-soft" data-rp="dl">🚗 Dinas Luar Kepala</button>' : '') + '</div>';
    if (loadErr) return bar + '<p style="color:#dc2626;">' + esc(loadErr) + '</p>';
    if (!loaded) return bar + '<p class="text-muted" style="padding:12px 0;">⏳ Memuat…</p>';
    if (!rapat.length) return bar + '<p class="text-muted" style="padding:12px 0;">Belum ada rapat.</p>';
    var more = rapat.length >= limitN ? '<div class="rp-bar"><button class="btn btn-soft" data-rp="more">⬇️ Muat rapat lebih lama</button></div>' : '';
    return bar + rapat.map(function (r) {
      var sel = r.status === 'selesai';
      return '<div class="rp-item" data-rp="buka" data-id="' + esc(r.id) + '"><div class="rp-h"><b>' + esc(r.judul) + '</b><span class="rp-badge' + (sel ? ' selesai' : '') + '">' + (sel ? 'Selesai' : 'Terjadwal') + '</span></div>' +
        '<div class="rp-m">' + esc(tgl(r.tanggal)) + (r.jam ? ' · ' + esc(r.jam) : '') + (r.tempat ? ' · ' + esc(r.tempat) : '') + '</div>' +
        '<div class="rp-m">Pimpinan: ' + esc(r.pimpinan || '-') + (r.honor > 0 ? ' · Honor ' + esc(rupiah(r.honor)) : '') + '</div></div>';
    }).join('') + more;
  }
  function pimOptions(selId) {
    return '<option value="">-- Pilih pimpinan --</option>' + (gurus || []).map(function (g) {
      return '<option value="' + esc(g.id) + '"' + (g.id === selId ? ' selected' : '') + '>' + esc(g.nama) + (g.kepala ? ' (Kepala)' : '') + '</option>';
    }).join('');
  }
  function buatHtml() {
    if (!canManage()) return '<p style="color:#dc2626;">🔒 Hanya admin yang dapat membuat / mengubah rapat.</p>';
    var ed = view === 'ubah' ? rapatById(cur) : null;
    if (view === 'ubah' && (!ed || ed.status === 'selesai')) return '<div class="rp-bar"><button class="btn btn-soft" data-rp="kembali">← Kembali</button></div><p class="text-muted">Rapat tidak ditemukan atau sudah selesai (buka kembali dulu untuk mengubah).</p>';
    if (!gurus || guruWait) return '<p class="text-muted">⏳ Memuat daftar guru…</p>';   // pemuatan dipicu dari onClick('buat'), bukan di dalam render
    if (!gurus.length) return '<div class="rp-bar"><button class="btn btn-soft" data-rp="kembali">← Kembali</button></div><p style="color:#dc2626;">' + (guruErr ? 'Gagal memuat daftar guru (koneksi lambat). Kembali lalu coba lagi.' : 'Daftar guru tidak ditemukan. Sesuaikan blok ADAPTER di rapat.js.') + '</p>';
    var k = kepala();
    return '<div class="rp-bar"><button class="btn btn-soft" data-rp="' + (ed ? 'kembali-detail' : 'kembali') + '">← Kembali</button></div>' +
      (ed ? '<h4 style="font-size:15px;font-weight:700;margin:6px 0;">✏️ Ubah data rapat</h4>' : '') + '<div class="rp-form">' +
      '<div class="full"><label class="label">Judul / Acara Rapat *</label><input id="rpf-judul" class="field" maxlength="120" placeholder="Rapat dewan guru" value="' + esc(ed ? ed.judul : '') + '"></div>' +
      '<div><label class="label">Tanggal *</label><input id="rpf-tgl" type="date" class="field" value="' + esc(ed ? ed.tanggal : today()) + '"></div>' +
      '<div><label class="label">Jam</label><input id="rpf-jam" type="time" class="field" value="' + esc(ed ? ed.jam || '' : '') + '"></div>' +
      '<div><label class="label">Tempat</label><input id="rpf-tempat" class="field" maxlength="80" placeholder="Ruang guru" value="' + esc(ed ? ed.tempat || '' : '') + '"></div>' +
      '<div><label class="label">Pimpinan Rapat</label><select id="rpf-pim" class="field">' + pimOptions(ed ? ed.pimpinanId : k && k.id) + '</select></div>' +
      '<div><label class="label">Honor per kehadiran (Rp)</label><input id="rpf-honor" type="number" min="0" step="1000" class="field" placeholder="0 = tanpa honor" value="' + esc(ed && ed.honor > 0 ? ed.honor : '') + '"></div></div>' +
      '<p class="text-muted" style="font-size:12.5px;margin-top:8px;">Peserta: semua guru. Bila Kepala berhalangan, pimpinan bisa diganti di halaman rincian rapat. Honor (bila diisi) dibayarkan ke guru yang Hadir / Hadir Daring saat rapat ditutup, dan otomatis masuk rekap Honor. Jangan buat lagi di Kegiatan Tambahan agar tidak dobel.</p>' +
      '<div class="rp-bar" style="margin-top:10px;"><button class="btn btn-success" id="rpBtnSimpan" data-rp="' + (ed ? 'simpan-ubah' : 'simpan') + '">💾 ' + (ed ? 'SIMPAN PERUBAHAN' : 'SIMPAN') + '</button></div>';
  }
  function statusSel(id, cur2, cls) {
    return '<select class="field ' + (cls || '') + '" ' + id + '><option value="">-- Pilih --</option>' + Object.keys(ST).map(function (k) {
      return '<option value="' + k + '"' + (k === cur2 ? ' selected' : '') + '>' + ST[k] + '</option>';
    }).join('') + '</select>';
  }
  /* ---------- Dinas Luar Kepala (honor tambahan, nominal beda tiap kegiatan; diisi Admin) ---------- */
  function loadDl() {
    if (!online()) { dlErr = 'Perlu koneksi internet untuk memuat daftar.'; render(); return; }
    dlErr = ''; dlList = null; render();
    db.ref('event_attendance').orderByChild('guruKey').equalTo('kepsek').once('value').then(function (sn) {
      var a = []; sn.forEach(function (c) { var v = c.val() || {}; if (v.sumber === 'dinas-luar-kepala') a.push({ id: c.key, tanggal: v.tanggal || '', nama: v.eventNama || '', honor: +v.honor || 0 }); });
      a.sort(function (x, y) { return x.tanggal < y.tanggal ? 1 : x.tanggal > y.tanggal ? -1 : 0; });
      dlList = a; render();
    }).catch(function (e) { dlErr = 'Gagal memuat: ' + (e && e.message || e); render(); });
  }
  function dlHtml() {
    var pf = dlPrefill || {}, h = '<div class="rp-bar"><button class="btn btn-soft" data-rp="kembali">← Kembali</button><button class="btn btn-soft" data-rp="dl-reload">🔄 Muat ulang</button></div>' +
      '<h4 style="font-size:15px;font-weight:700;margin:6px 0;">🚗 Dinas Luar Kepala Madrasah</h4>' +
      '<p class="text-muted" style="font-size:12.5px;margin-bottom:8px;">Honor <b>tambahan</b> untuk Kepala saat dinas luar; nominalnya berbeda tiap kegiatan dan diisi Admin. Otomatis ditambahkan ke baris "Kepala Madrasah" di rekap Honor pada bulan tanggal kegiatan, di atas honor tetap bulanan.</p>' +
      '<div class="rp-form"><div><label class="label">Tanggal *</label><input id="rpdl-tgl" type="date" class="field" value="' + esc(pf.tgl || today()) + '" max="' + esc(today()) + '"></div>' +
      '<div><label class="label">Kegiatan *</label><input id="rpdl-nama" class="field" maxlength="120" placeholder="mis. Rapat dinas KKM di Kemenag" value="' + esc(pf.nama || '') + '"></div>' +
      '<div><label class="label">Honor (Rp) *</label><input id="rpdl-honor" type="number" min="1" step="1000" class="field" placeholder="mis. 150000"></div></div>' +
      '<div class="rp-bar" style="margin-top:8px;"><button class="btn btn-success" data-rp="dl-simpan">💾 Catat Dinas Luar</button></div>';
    if (dlErr) return h + '<p style="color:#dc2626;">' + esc(dlErr) + '</p>';
    if (!dlList) return h + '<p class="text-muted">⏳ Memuat…</p>';
    if (!dlList.length) return h + '<p class="text-muted" style="padding:8px 0;">Belum ada dinas luar yang dicatat.</p>';
    var perBulan = {}; dlList.forEach(function (d) { var b = d.tanggal.slice(0, 7); perBulan[b] = perBulan[b] || { n: 0, sum: 0 }; perBulan[b].n++; perBulan[b].sum += d.honor; });
    var ringkas = Object.keys(perBulan).sort().reverse().slice(0, 6).map(function (b) {
      var p = b.split('-'); return '<span class="rp-badge" style="margin-right:6px;">' + esc((+p[1] ? ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'][+p[1] - 1] : b) + ' ' + p[0]) + ': ' + perBulan[b].n + ' kegiatan · ' + esc(rupiah(perBulan[b].sum)) + '</span>';
    }).join('');
    return h + '<div style="margin:10px 0 6px;">' + ringkas + '</div>' + dlList.map(function (d) {
      return '<div class="rp-item"><div class="rp-h"><b>' + esc(d.nama || '(tanpa nama)') + '</b><span class="rp-badge">' + esc(rupiah(d.honor)) + '</span></div>' +
        '<div class="rp-m">' + esc(tgl(d.tanggal)) + '</div>' +
        '<div class="rp-bar" style="margin-top:6px;"><button class="btn btn-soft" data-rp="dl-ubah" data-id="' + esc(d.id) + '">✏️ Ubah honor</button><button class="btn btn-danger" data-rp="dl-hapus" data-id="' + esc(d.id) + '">🗑️ Hapus</button></div></div>';
    }).join('');
  }
  function dlSimpan(btn) {
    if (!canManage()) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    var tg = val('rpdl-tgl'), nama = val('rpdl-nama'), hn = angka(val('rpdl-honor'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tg)) return say('Isi tanggal dinas luar!', true);
    if (tg > today()) return say('Tanggal tidak boleh di masa depan.', true);
    if (nama.length < 3) return say('Isi nama kegiatan (min. 3 huruf)!', true);
    if (isNaN(hn) || hn < 1 || hn > HONOR_MAKS) return say('Honor harus lebih dari 0 (maks. ' + rupiah(HONOR_MAKS) + ').', true);
    if (bz.is('dlSimpan')) return; bz.set('dlSimpan', btn);   // cegah klik ganda = catatan/honor dobel
    var key = 'dlk_' + db.ref('event_attendance').push().key;
    var ta = (typeof tahunAjaranDariTanggal === 'function' && tahunAjaranDariTanggal(tg)) || (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '');
    var rec = { eventKey: key, eventNama: nama, jenis: 'Dinas Luar', sumber: 'dinas-luar-kepala', guru: 'Kepala Madrasah', guruKey: 'kepsek',
      tanggal: tg, waktu: new Date().toISOString(), honor: hn, tahunAjaran: ta, dibuatOleh: currentUser.name || '' };
    db.ref('event_attendance/' + key).set(rec).then(function () {
      log('dinas_luar_kepala_tambah', nama + ' ' + hn); say('Dinas luar dicatat, masuk rekap Honor Kepala');
      dlPrefill = null; lastView = ''; reloadHonorData(); loadDl();
    }).catch(function (e) { say('Gagal menyimpan: ' + (e && e.message || e), true); })
      .then(function () { bz.clear('dlSimpan', btn); });
  }
  function dlUbah(id) {
    var d = (dlList || []).filter(function (x) { return x.id === id; })[0]; if (!d || !canManage()) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    var v = prompt('Honor baru untuk "' + d.nama + '" (Rp):', String(d.honor)); if (v === null) return;
    var vs = String(v).trim();
    if (/[.,]\d{1,2}$/.test(vs)) return say('Masukkan nominal bulat tanpa desimal.', true);
    var n = angka(vs.replace(/[\s.,]/g, ''));
    if (isNaN(n) || n < 1 || n > HONOR_MAKS) return say('Honor harus lebih dari 0 (maks. ' + rupiah(HONOR_MAKS) + ').', true);
    db.ref('event_attendance/' + id + '/honor').set(n).then(function () {
      d.honor = n; log('dinas_luar_kepala_ubah', d.nama + ' ' + n); say('Honor diperbarui'); reloadHonorData(); render();
    }).catch(function (e) { say('Gagal: ' + (e && e.message || e), true); });
  }
  function dlHapus(id) {
    var d = (dlList || []).filter(function (x) { return x.id === id; })[0]; if (!d || !canManage()) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    if (!confirm('Hapus catatan dinas luar "' + d.nama + '" (' + rupiah(d.honor) + ')? Honor ini ikut hilang dari rekap Honor.')) return;
    db.ref('event_attendance/' + id).remove().then(function () {
      dlList = dlList.filter(function (x) { return x.id !== id; }); log('dinas_luar_kepala_hapus', d.nama); say('Dihapus'); reloadHonorData(); render();
    }).catch(function (e) { say('Gagal: ' + (e && e.message || e), true); });
  }

  /* ---------- honor ---------- */
  function jumlahBerhonor() {   // guru (bukan Kepala) berstatus Hadir / Hadir Daring menurut data yang sedang tampil
    return (gurus || []).filter(function (g) { var rec = cleanRec(hadir[hk(g.id)]); return !g.kepala && rec && HONOR_STATUS[rec.status]; }).length;
  }
  function honorHtml(r, m, selesai) {
    var n = r.honor || 0;
    if (m && !selesai) {
      return '<div class="rp-bar" style="margin-top:8px;align-items:center;"><span style="font-size:13px;">Honor per kehadiran (Rp):</span>' +
        '<input id="rpHonor" type="number" min="0" step="1000" class="field" style="max-width:150px;flex:0 1 150px;" value="' + esc(n) + '">' +
        '<button class="btn btn-soft" data-rp="honor">💾 Simpan honor</button></div>' +
        '<p class="text-muted" style="font-size:12.5px;margin:0 0 4px;">0 = tanpa honor. Dibayarkan ke guru yang Hadir / Hadir Daring saat rapat ditutup, lalu otomatis masuk rekap Honor. Jangan buat lagi di Kegiatan Tambahan.' +
        (n > 0 ? ' Perkiraan saat ini: <b>' + jumlahBerhonor() + '</b> guru × ' + esc(rupiah(n)) + ' = <b>' + esc(rupiah(jumlahBerhonor() * n)) + '</b>.' : '') + '</p>';
    }
    if (n > 0) return '<div class="rp-m" style="margin-top:4px;">Honor: <b>' + esc(rupiah(n)) + '</b> per kehadiran (Hadir / Hadir Daring)' +
      (selesai ? ' · sudah masuk rekap Honor untuk <b>' + jumlahBerhonor() + '</b> guru.' : ' · dibayarkan saat rapat ditutup.') + '</div>';
    return '';
  }
  /* Susun update event_attendance untuk rapat r. hd = data kehadiran final (isi => tulis honor); hd null => hanya MENARIK honor.
     Kunci lama dibersihkan lewat query eventKey, jadi honor guru yang statusnya berubah / sudah dihapus dari daftar ikut hilang. */
  function honorSusun(r, hd) {
    return db.ref('event_attendance').orderByChild('eventKey').equalTo('rapat_' + r.id).once('value').then(function (sn) {
      var upd = {}, nominal = +r.honor || 0, now = new Date().toISOString();
      var ta = (typeof tahunAjaranDariTanggal === 'function' && tahunAjaranDariTanggal(r.tanggal)) || (typeof currentTahunAjaran !== 'undefined' ? currentTahunAjaran : '');
      sn.forEach(function (c) { upd['event_attendance/' + c.key] = null; });
      if (hd && nominal > 0) (gurus || []).forEach(function (g) {
        var rec = cleanRec(hd[hk(g.id)]);
        if (g.kepala || g.id === 'kepsek' || !rec || !HONOR_STATUS[rec.status]) return;
        upd['event_attendance/' + keyHonor(r.id, g.id)] = { eventKey: 'rapat_' + r.id, eventNama: r.judul, jenis: 'Rapat', sumber: 'rapat', guru: g.nama, guruKey: g.id,
          tanggal: r.tanggal, waktu: now, honor: nominal, status: rec.status, tahunAjaran: ta };
      });
      return upd;
    });
  }
  function detailHtml() {
    var r = rapatById(cur);
    if (!r) return '<div class="rp-bar"><button class="btn btn-soft" data-rp="kembali">← Kembali</button></div><p class="text-muted">Rapat tidak ditemukan.</p>';
    var kp = kepala(), kpRec = kp && cleanRec(hadir[hk(kp.id)]), m = canManage(), selesai = r.status === 'selesai';
    var h = '<div class="rp-bar"><button class="btn btn-soft" data-rp="kembali">← Kembali</button><button class="btn btn-soft" data-rp="cetak">🖨️ Cetak daftar hadir</button>' + (canManage() && r.status !== 'selesai' ? '<button class="btn btn-soft" data-rp="ubah">✏️ Ubah data</button>' : '') + '</div>' +
      '<div class="rp-h"><b style="font-size:15px;">' + esc(r.judul) + '</b><span class="rp-badge' + (selesai ? ' selesai' : '') + '">' + (selesai ? 'Selesai' : 'Terjadwal') + '</span></div>' +
      '<div class="rp-m">' + esc(tgl(r.tanggal)) + (r.jam ? ' · ' + esc(r.jam) : '') + (r.tempat ? ' · ' + esc(r.tempat) : '') + '</div>';
    if (hadirErr) return h + '<p style="color:#dc2626;padding:12px 0 4px;">Gagal memuat kehadiran (koneksi lambat).</p><div class="rp-bar"><button class="btn btn-soft" data-rp="retry">🔄 Coba lagi</button></div>';
    if (!hadirLoaded || !gurus) return h + '<p class="text-muted" style="padding:12px 0;">⏳ Memuat kehadiran…</p>';
    if (!gurus.length) return h + (guruErr ? '<p style="color:#dc2626;">Gagal memuat daftar guru (koneksi lambat).</p><div class="rp-bar"><button class="btn btn-soft" data-rp="retry">🔄 Coba lagi</button></div>' : '<p style="color:#dc2626;">Daftar guru tidak ditemukan. Sesuaikan blok ADAPTER di rapat.js dengan data guru di app.js.</p>');
    h += '<p style="margin-top:6px;font-size:13.5px;">Pimpinan rapat: <b>' + esc(r.pimpinan || '-') + '</b>' + (m && !selesai ? ' <select id="rpPim" class="field" style="display:inline-block;width:auto;" data-rp-sel="pim">' + pimOptions(r.pimpinanId) + '</select>' : '') + '</p>';
    h += honorHtml(r, m, selesai);
    if (m && kp && kpRec && kpRec.status === 'dl') h += '<div class="rp-bar" style="margin-top:6px;"><button class="btn btn-soft" data-rp="dl-dari-rapat">🚗 Catat honor dinas luar Kepala</button></div>';
    if (kp && kpRec && BERHALANGAN[kpRec.status] && r.pimpinanId === kp.id) {
      h += '<div class="rp-warn">⚠️ Kepala berstatus <b>' + ST[kpRec.status] + '</b>' + (kpRec.ket ? ' (' + esc(kpRec.ket) + ')' : '') + ', tetapi pimpinan rapat masih Kepala. ' +
        (m ? 'Pilih pimpinan pengganti di atas. Rapat tetap bisa berjalan.' : 'Admin perlu memilih pimpinan pengganti.') + '</div>';
    }
    var mine = me();
    if (mine && !selesai && r.tanggal === today()) {
      var mr = cleanRec(hadir[hk(mine.id)]);
      h += '<div class="rp-bar" style="margin-top:10px;align-items:center;"><span style="font-size:13px;">Kehadiran Anda:</span>' + statusSel('id="rpSelf"', mr && mr.status) +
        '<button class="btn btn-success" data-rp="self">💾 Simpan</button></div>';
    }
    var cnt = {}, belum = 0;
    var rows = gurus.map(function (g, i) {
      var rec = cleanRec(hadir[hk(g.id)]), s = rec && rec.status;
      if (s) cnt[s] = (cnt[s] || 0) + 1; else belum++;
      var cell = m && !selesai ? statusSel('data-rp-sel="status" data-gid="' + esc(g.id) + '"', s) : (s ? '<span class="rp-st ' + s + '">' + ST[s] + '</span>' : '<span class="text-muted">Belum diisi</span>');
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(g.nama) + (g.kepala ? ' <small>(Kepala)</small>' : '') + '</td><td>' + cell + '</td><td>' + esc(rec && rec.ket || '') + '</td></tr>';
    }).join('');
    h += '<div style="overflow-x:auto;margin-top:10px;"><table class="rp-tbl"><tr><th>No</th><th>Nama</th><th>Status</th><th>Keterangan</th></tr>' + rows + '</table></div>';
    h += '<p class="rp-m" style="margin-top:8px;">' + Object.keys(ST).map(function (k) { return ST[k] + ': <b>' + (cnt[k] || 0) + '</b>'; }).join(' · ') + ' · Belum diisi: <b>' + belum + '</b></p>';
    h += '<h4 style="margin:14px 0 4px;font-size:14px;">📝 Notulen</h4>' + (m ? '<textarea id="rpNotulen" class="field" rows="5" maxlength="3000" placeholder="Hasil rapat…">' + esc(r.notulen || '') + '</textarea>' +
      '<div class="rp-bar" style="margin-top:6px;"><button class="btn btn-soft" data-rp="notulen">💾 Simpan notulen</button></div>'
      : (r.notulen ? '<div style="white-space:pre-wrap;font-size:13.5px;">' + esc(r.notulen) + '</div>' : '<p class="text-muted">Belum ada notulen.</p>'));
    if (m) h += '<div class="rp-bar" style="margin-top:14px;">' + (selesai ? '<button class="btn btn-soft" data-rp="buka-lagi">♻️ Buka kembali rapat</button>'
      : '<button class="btn btn-soft" data-rp="tutup">✅ Tutup rapat</button>') + '<button class="btn btn-soft" style="color:#dc2626;" data-rp="hapus">🗑️ Hapus rapat</button></div>' +
      (selesai ? '' : '<p class="text-muted" style="font-size:12.5px;">Menutup rapat menandai guru yang belum diisi sebagai Alpha' + (ALPHA_KEPALA ? '' : ' (Kepala tidak otomatis Alpha; isi manual bila perlu)') + '. Dinas Luar, Izin, dan Sakit tidak dihitung Alpha.</p>');
    return h;
  }

  /* ---------- cetak (F4 portrait) ---------- */
  function cetak() {
    var r = rapatById(cur); if (!r || !gurus) return;
    if (!hadirLoaded) return say('Data kehadiran belum selesai dimuat.', true);
    var w = window.open('', '_blank', 'width=900,height=1000'); if (!w) return say('Popup diblokir browser.', true);
    var kp = kepala(), kpRec = kp && cleanRec(hadir[hk(kp.id)]), pengganti = kp && kpRec && BERHALANGAN[kpRec.status] && r.pimpinanId !== kp.id;
    var rows = gurus.map(function (g, i) {
      var rec = cleanRec(hadir[hk(g.id)]), s = rec && rec.status;
      return '<tr><td style="width:28px;">' + (i + 1) + '</td><td>' + esc(g.nama) + '</td><td>' + (s ? ST[s] : '-') + '</td><td>' + esc(rec && rec.ket || '') + '</td><td style="width:110px;height:26px;">&nbsp;</td></tr>';
    }).join('');
    var css = '@page{size:215mm 330mm;margin:14mm}body{font-family:Arial,sans-serif;color:#111;font-size:12.5px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:middle}th{background:#f3f4f6}' +
      '.kop{text-align:center;border-bottom:3px double #333;padding-bottom:8px;margin-bottom:12px}.kop b{font-size:16px}.ttd{margin-top:28px;display:flex;justify-content:space-between}.ttd div{width:46%;text-align:center}';
    w.document.write('<html><head><title>Daftar Hadir Rapat</title><style>' + css + '</style></head><body><div class="kop"><b>' + esc(madInfo().nama || 'Madrasah') + '</b><br>' + esc(madInfo().alamat || '') + '</div>' +
      '<h3 style="text-align:center;margin:0 0 10px;">DAFTAR HADIR RAPAT</h3><p>Acara: <b>' + esc(r.judul) + '</b><br>Hari/Tanggal: ' + esc(tgl(r.tanggal)) + (r.jam ? '<br>Waktu: ' + esc(r.jam) : '') +
      (r.tempat ? '<br>Tempat: ' + esc(r.tempat) : '') + '<br>Pimpinan rapat: ' + esc(r.pimpinan || '-') + '</p>' +
      (pengganti ? '<p><i>Kepala Madrasah berhalangan (' + ST[kpRec.status] + (kpRec.ket ? ': ' + esc(kpRec.ket) : '') + '); rapat dipimpin oleh ' + esc(r.pimpinan || '-') + '.</i></p>' : '') +
      '<table><tr><th>No</th><th>Nama</th><th>Status</th><th>Keterangan</th><th>Tanda Tangan</th></tr>' + rows + '</table>' +
      (r.notulen ? '<h4 style="margin:14px 0 4px;">Notulen</h4><div style="white-space:pre-wrap;">' + esc(r.notulen) + '</div>' : '') +
      '<div class="ttd"><div>Pimpinan Rapat' + (pengganti ? '<br>a.n. Kepala Madrasah' : '') + '<br><br><br><br><b><u>' + esc(r.pimpinan || '................') + '</u></b></div><div>Notulis<br><br><br><br><b>................................</b></div></div></body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 400);
  }

  /* ---------- event ---------- */
  function onChange(e) {
    var t = e.target, kind = t && t.getAttribute && t.getAttribute('data-rp-sel'); if (!kind || !canManage()) return;
    if (kind === 'pim') {
      var g = guruById(t.value), r = rapatById(cur); if (!g || !r) return;
      if (!online()) return say('Perlu koneksi internet.', true);
      db.ref('rapat/' + cur).update({ pimpinanId: g.id, pimpinan: g.nama }).then(function () {
        r.pimpinanId = g.id; r.pimpinan = g.nama; say('Pimpinan rapat diperbarui'); render();
      }).catch(function (er) { say('Gagal: ' + (er && er.message || er), true); });
    } else if (kind === 'status') {
      if (!t.value) return render();
      var ket = tanyaKet(t.value); if (ket === null) return render();
      setStatus(t.getAttribute('data-gid'), t.value, ket, 'admin');
    }
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-rp]'); if (!b || !root.contains(b)) return;
    var act = b.getAttribute('data-rp'), r = rapatById(cur);
    switch (act) {
      case 'reload': loadRapat(); break;
      case 'more': limitN += 60; loadRapat(); break;
      case 'buat': view = 'buat'; if (gurus && !gurus.length) gurus = null; loadGuru(render); render(); break;
      case 'ubah': if (!canManage() || !r) return; if (r.status === 'selesai') return say('Buka kembali rapat dulu untuk mengubah data.', true); view = 'ubah'; render(); break;
      case 'kembali-detail': view = 'detail'; render(); break;
      case 'simpan-ubah': simpanUbah(b); break;
      case 'kembali': view = 'list'; cur = null; notulenDraft = null; dlPrefill = null; render(); break;
      case 'dl': if (!canManage()) return; view = 'dl'; dlPrefill = null; loadDl(); break;
      case 'dl-reload': loadDl(); break;
      case 'dl-simpan': dlSimpan(b); break;
      case 'dl-ubah': dlUbah(b.getAttribute('data-id')); break;
      case 'dl-hapus': dlHapus(b.getAttribute('data-id')); break;
      case 'dl-dari-rapat':
        if (!canManage() || !r) return;
        var kpr = kepala(), kr = kpr && cleanRec(hadir[hk(kpr.id)]);
        dlPrefill = { tgl: r.tanggal > today() ? today() : r.tanggal, nama: (kr && kr.ket && kr.ket !== 'Tugas dinas luar') ? kr.ket : '' };
        view = 'dl'; loadDl(); break;
      case 'retry': buka(cur); break;
      case 'buka': buka(b.getAttribute('data-id')); break;
      case 'cetak': cetak(); break;
      case 'simpan': simpan(b); break;
      case 'self':
        var mine = me(), st = val('rpSelf');
        if (!mine) return say('Akun Anda tidak ditemukan di daftar guru.', true);
        if (!st) return say('Pilih status kehadiran dulu.', true);
        if (!r || r.status === 'selesai' || r.tanggal !== today()) return say('Kehadiran hanya bisa diisi pada hari rapat.', true);
        var ket = tanyaKet(st); if (ket === null) break;
        setStatus(mine.id, st, ket, 'sendiri'); break;
      case 'notulen': ubahRapat('notulen', val('rpNotulen').slice(0, 3000), 'Notulen disimpan'); break;
      case 'tutup': tutup(b); break;
      case 'honor':
        var hn = angka(val('rpHonor'));
        if (isNaN(hn) || hn < 0 || hn > HONOR_MAKS) return say('Honor harus angka 0 atau lebih (maks. ' + rupiah(HONOR_MAKS) + ').', true);
        ubahRapat('honor', hn, hn > 0 ? 'Honor diperbarui' : 'Honor dihapus (rapat tanpa honor)'); break;
      case 'buka-lagi': bukaLagi(b); break;
      case 'hapus': hapus(b); break;
    }
  }
  function simpan(btn) {
    if (!canManage()) return say('Tidak diizinkan!', true);
    if (!online()) return say('Perlu koneksi internet untuk menyimpan.', true);
    var judul = val('rpf-judul'), tg = val('rpf-tgl'), g = guruById(val('rpf-pim')), hnRaw = val('rpf-honor'), hn = hnRaw === '' ? 0 : angka(hnRaw);
    if (judul.length < 3 || !/^\d{4}-\d\d-\d\d$/.test(tg)) return say('Judul dan tanggal wajib diisi!', true);
    if (!g) return say('Pilih pimpinan rapat!', true);
    if (isNaN(hn) || hn < 0 || hn > HONOR_MAKS) return say('Honor harus angka bulat 0 atau lebih (maks. ' + rupiah(HONOR_MAKS) + ').', true);
    if (bz.is('simpanRapat')) return; bz.set('simpanRapat', btn);
    db.ref('rapat').push({
      judul: judul, tanggal: tg, jam: val('rpf-jam'), tempat: val('rpf-tempat'), pimpinanId: g ? g.id : '', pimpinan: g ? g.nama : '',
      status: 'terjadwal', honor: hn, dibuat: String(currentUser.name || currentUser.nama || ''), ts: firebase.database.ServerValue.TIMESTAMP
    }).then(function () {
      say('✅ Rapat dibuat'); log('rapat_buat', judul); view = 'list'; render(); loadRapat();
    }).catch(function (e) { say('Gagal: ' + (e && e.message || e), true); })
      .then(function () { bz.clear('simpanRapat', btn); });
  }
  function simpanUbah(btn) {
    var r = rapatById(cur); if (!r || !canManage()) return say('Tidak diizinkan!', true);
    if (!online()) return say('Perlu koneksi internet untuk menyimpan.', true);
    var judul = val('rpf-judul'), tg = val('rpf-tgl'), g = guruById(val('rpf-pim')), hnRaw = val('rpf-honor'), hn = hnRaw === '' ? 0 : angka(hnRaw);
    if (judul.length < 3 || !/^\d{4}-\d\d-\d\d$/.test(tg)) return say('Judul dan tanggal wajib diisi!', true);
    if (!g) return say('Pilih pimpinan rapat!', true);
    if (isNaN(hn) || hn < 0 || hn > HONOR_MAKS) return say('Honor harus angka bulat 0 atau lebih (maks. ' + rupiah(HONOR_MAKS) + ').', true);
    if (bz.is('ubahRapat')) return; bz.set('ubahRapat', btn);
    var id = cur;
    var upd = { judul: judul, tanggal: tg, jam: val('rpf-jam'), tempat: val('rpf-tempat').slice(0, 80), pimpinanId: g.id, pimpinan: g.nama, honor: hn };
    // Hanya rapat yang belum ditutup: honor baru dihitung saat tutup, jadi mengubah tanggal / nominal di sini aman.
    db.ref('rapat/' + id + '/status').once('value').then(function (sn) {
      if (sn.val() === 'selesai') { r.status = 'selesai'; throw new Error('Rapat sudah ditutup. Buka kembali dulu untuk mengubah.'); }
      return db.ref('rapat/' + id).update(upd);
    }).then(function () {
      Object.keys(upd).forEach(function (f) { r[f] = upd[f]; });
      log('rapat_ubah', judul); say('Data rapat diperbarui');
      lastView = ''; if (cur === id) view = 'detail'; render();
    }).catch(function (e) { say('Gagal: ' + (e && e.message || e), true); render(); })
      .then(function () { bz.clear('ubahRapat', btn); });
  }
  function tutup(btn) {
    var r = rapatById(cur); if (!r || !canManage() || !gurus) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    if (bz.is('tutupRapat')) return;
    var id = cur;
    var perkiraan = gurus.filter(function (g) { return autoAlpha(g) && !cleanRec(hadir[hk(g.id)]); }).length;
    var infoHonor = r.honor > 0 ? '\nHonor ' + rupiah(r.honor) + ' akan dibayarkan ke ' + jumlahBerhonor() + ' guru yang Hadir / Hadir Daring dan masuk rekap Honor.' : '';
    if (!confirm('Tutup rapat ini?' + (perkiraan ? '\n' + perkiraan + ' guru yang belum diisi akan ditandai Alpha.' : '') + infoHonor)) return;
    bz.set('tutupRapat', btn);
    // Baca ulang dari server SETELAH konfirmasi, lalu tulis Alpha + honor + status 'selesai' dalam SATU update atomik:
    // gagal = tidak ada yang berubah (tidak ada honor "menggantung" pada rapat yang masih terbuka).
    db.ref('rapat_hadir/' + id).once('value').then(function (sn) {
      var latest = sn.val() || {}, upd = {}, hasilAkhir = {}, ts = firebase.database.ServerValue.TIMESTAMP;
      Object.keys(latest).forEach(function (k) { hasilAkhir[k] = latest[k]; });
      gurus.forEach(function (g) {
        var k = hk(g.id);
        if (!autoAlpha(g) || cleanRec(latest[k])) return;
        var rec = { status: 'alpha', nama: g.nama, ts: ts, oleh: 'sistem' };
        upd['rapat_hadir/' + id + '/' + k] = rec; hasilAkhir[k] = rec;
      });
      return honorSusun(r, hasilAkhir).then(function (honorUpd) {
        Object.keys(honorUpd).forEach(function (pth) { upd[pth] = honorUpd[pth]; });
        upd['rapat/' + id + '/status'] = 'selesai';
        return db.ref().update(upd);
      });
    }).then(function () {
      r.status = 'selesai'; log('rapat_tutup', r.judul); say(r.honor > 0 ? 'Rapat ditutup, honor masuk rekap Honor' : 'Rapat ditutup'); reloadHonorData(); if (cur === id) buka(id);
    }).catch(function (e) { say('Gagal: ' + (e && e.message || e), true); })
      .then(function () { bz.clear('tutupRapat', btn); });
  }
  function bukaLagi(btn) {
    var r = rapatById(cur); if (!r || !canManage()) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    if (!confirm('Membuka kembali rapat akan' + (r.honor > 0 ? ' MENARIK honor rapat ini dari rekap Honor (dihitung ulang saat ditutup lagi) dan' : '') + ' menghapus Alpha otomatis dari sistem agar kehadiran bisa diisi / diperiksa ulang. Lanjutkan?')) return;
    if (bz.is('bukaLagi')) return;
    var id = cur; bz.set('bukaLagi', btn);
    Promise.all([honorSusun(r, null), db.ref('rapat_hadir/' + id).once('value')]).then(function (res) {
      var upd = res[0], h = res[1].val() || {};
      Object.keys(h).forEach(function (k) { var x = h[k]; if (x && x.oleh === 'sistem' && x.status === 'alpha') upd['rapat_hadir/' + id + '/' + k] = null; });
      upd['rapat/' + id + '/status'] = 'terjadwal';
      return db.ref().update(upd);
    }).then(function () { r.status = 'terjadwal'; say('Rapat dibuka kembali'); reloadHonorData(); if (cur === id) buka(id); })
      .catch(function (e) { say('Gagal: ' + (e && e.message || e), true); })
      .then(function () { bz.clear('bukaLagi', btn); });
  }
  function hapus(btn) {
    var r = rapatById(cur); if (!r || !canManage()) return;
    if (!online()) return say('Perlu koneksi internet.', true);
    var c = prompt('Menghapus PERMANEN rapat "' + r.judul + '" beserta data kehadirannya.\nKetik HAPUS untuk melanjutkan:');
    if (c === null || c.trim() !== 'HAPUS') return say('Penghapusan dibatalkan.');
    if (bz.is('hapusRapat')) return;
    var id = cur; bz.set('hapusRapat', btn);
    honorSusun(r, null).then(function (upd) {   // honor rapat ini ikut ditarik; semuanya satu operasi atomik
      upd['rapat_hadir/' + id] = null; upd['rapat/' + id] = null;
      return db.ref().update(upd);
    }).then(function () {
      log('rapat_hapus', r.judul); say('🗑️ Rapat dihapus'); reloadHonorData(); view = 'list'; cur = null; notulenDraft = null; render(); loadRapat();
    }).catch(function (e) { say('Gagal menghapus: ' + (e && e.message || e), true); })
      .then(function () { bz.clear('hapusRapat', btn); });
  }

  /* ---------- reset state (dipanggil saat logout) ---------- */
  function resetState() {
    if (root) root.innerHTML = '';
    rapat = []; loaded = false; loadErr = ''; view = 'list'; cur = null; hadir = {}; hadirLoaded = false; hadirErr = false; notulenDraft = null; loadSeq++; gurus = null; dlList = null; dlErr = ''; dlPrefill = null; limitN = 60; guruErr = false; lastView = '';
  }
  window.rapatResetState = resetState;

  /* ---------- pasang ke navigasi ---------- */
  function init() {
    injectCss(); ensurePage();
    var orig = window.navigateTo;
    if (typeof orig !== 'function') { console.warn('[rapat] navigateTo belum tersedia -- pastikan rapat.js dimuat SETELAH app.js.'); return; }
    window.navigateTo = function (page) {
      var r = orig.apply(this, arguments);
      if (page === PAGE) {
        try {
          var t = $('pageTitle'); if (t) t.textContent = 'Rapat';
          if (!root) { ensurePage(); if (root) root.classList.remove('hidden'); }
          checkSession(); view = 'list'; cur = null; render(); loadRapat();
        } catch (e) { console.error('[rapat]', e); }
      }
      return r;
    };
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.logout-btn')) resetState();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
