/* ============================================================
   MODUL PEMBELAJARAN (modul ajar) -- js/modul-ajar.js
   Dimuat SETELAH app.js & menu-hub.js. Modul mandiri seperti kas.js: halaman dibuat sendiri
   lewat JS, data dimuat sendiri (db.ref('modul_ajar')), tidak menyentuh loadAllData().
   Hubungan: Guru -> Mata Pelajaran -> Kelas -> Peserta Didik (jumlah siswa diambil dari allSiswa),
   dengan tombol pintas ke Absensi & Nilai kelas yang sama.
   Akses: Guru/Wali Kelas/Admin membuat & mengelola modul sendiri; Admin mengelola semua; Kepsek hanya melihat.
============================================================ */
(function () {
  'use strict';

  var PAGE = 'modul-ajar';
  var SECTIONS = [
    { k: 'cp',        t: 'Capaian Pembelajaran (CP)', ph: 'Terisi otomatis dari Referensi Kurikulum sesuai mapel & fase; bisa diedit…' },
    { k: 'tujuan',    t: 'Tujuan Pembelajaran (TP)', ph: 'Tuliskan tujuan pembelajaran (satu per baris)…', req: true },
    { k: 'pemantik',  t: 'Pertanyaan Pemantik',    ph: 'Pertanyaan pembuka untuk memancing rasa ingin tahu peserta didik…' },
    { k: 'materiIsi', t: 'Materi Pembelajaran',    ph: 'Ringkasan materi, konsep utama, contoh…' },
    { k: 'aktivitas', t: 'Aktivitas Pembelajaran', ph: 'Kegiatan pendahuluan, inti, dan penutup…' },
    { k: 'kokurikuler', t: 'Kegiatan Kokurikuler', ph: 'Tema/projek kokurikuler yang terkait (jika ada)…' },
    { k: 'lkpd',      t: 'LKPD',                   ph: 'Lembar Kerja Peserta Didik: petunjuk dan soal/kegiatan…' },
    { k: 'media',     t: 'Media Pembelajaran',     ph: 'Alat peraga, gambar, video, slide, benda nyata…' },
    { k: 'asesmen',   t: 'Asesmen',                ph: 'Asesmen diagnostik, formatif, sumatif; teknik & instrumen…' },
    { k: 'tugas',     t: 'Tugas',                  ph: 'Tugas individu/kelompok, tugas rumah…' },
    { k: 'refleksi',  t: 'Refleksi',               ph: 'Refleksi guru dan peserta didik setelah pembelajaran…' },
    { k: 'pengayaan', t: 'Pengayaan',              ph: 'Kegiatan untuk peserta didik yang sudah mencapai tujuan…' },
    { k: 'remedial',  t: 'Remedial',               ph: 'Kegiatan untuk peserta didik yang belum mencapai tujuan…' },
    { k: 'sumber',    t: 'Sumber Belajar',         ph: 'Buku, tautan, lingkungan sekitar, narasumber…' }
  ];
  var KOMPONEN = ['materiIsi', 'lkpd', 'media', 'asesmen', 'tugas', 'refleksi'];
  var TABS = [
    { id: 'daftar',   t: '📚 Daftar Modul' },
    { id: 'buat',     t: '➕ Buat Modul' },
    { id: 'komponen', t: '🧩 Komponen' },
    { id: 'favorit',  t: '⭐ Favorit' },
    { id: 'arsip',    t: '🗄️ Arsip' },
    { id: 'referensi', t: '🧭 Referensi' }
  ];

  // Delapan Dimensi Profil Lulusan & Panca Cinta (KBC) -- daftar nama baku, bukan isi CP/TP.
  var DPL = ['Keimanan dan Ketakwaan terhadap Tuhan YME', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi'];
  var PANCA = ['Cinta kepada Allah dan Rasul-Nya', 'Cinta ilmu', 'Cinta lingkungan', 'Cinta diri dan sesama', 'Cinta tanah air'];

  var REF_MIN = 20; // panjang minimum CP/TP (bila diisi) pada referensi kurikulum
  var data = [], loaded = false, loading = false, loadErr = '';
  var refs = [], refLoaded = false, refLoading = false, refErr = '';
  var refMode = 'list', refEditKey = null, refParsed = null, refPaste = '';
  var formRef = null, lastFill = { cp: '', tp: '' };
  var tab = 'daftar', editingKey = null, komp = 'materiIsi';
  var filt = { q: '', mapel: '', kelas: '', semester: '', pers: '' };
  var root = null;
  var gen = 0; // naik tiap resetState(); callback load yang datang terlambat (milik sesi lama) diabaikan

  /* ---------- util ---------- */
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function sec(k) { return SECTIONS.filter(function (s) { return s.k === k; })[0]; }
  function canCreate() { return !!currentUser && (isAdmin() || isTeacher() || (typeof isWaliKelas === 'function' && isWaliKelas())); }
  function canView() { return canCreate() || isKepsek(); }
  function isOwner(m) { return !!currentUser && m.ownerName === currentUser.name && (m.ownerKey || '') === (currentUser.key || ''); }
  function canEdit(m) { return isAdmin() || (canCreate() && isOwner(m)); }

  /* ---------- persetujuan kepala madrasah ----------
     Field terpisah dari status (aktif/arsip): persetujuan = draf | diajukan | disetujui | ditolak.
     Modul lama tanpa field ini dianggap 'draf'. Saat 'diajukan' isi modul dikunci sampai ditinjau;
     mengubah modul 'disetujui' mengembalikannya ke 'draf'. Ini hanya penjaga sisi klien (seperti fitur lain). */
  var PERS = {
    draf:      { t: '📝 Draf',                 bg: '#f3f4f6', fg: '#374151' },
    diajukan:  { t: '⏳ Menunggu persetujuan', bg: '#fef3c7', fg: '#92400e' },
    disetujui: { t: '✅ Disetujui',            bg: '#d1fae5', fg: '#065f46' },
    ditolak:   { t: '❌ Ditolak',              bg: '#fee2e2', fg: '#991b1b' }
  };
  function pers(m) { return (m && PERS[m.persetujuan]) ? m.persetujuan : 'draf'; }
  function canApprove() { return !!currentUser && (isAdmin() || isKepsek()); }
  function persBadge(m) {
    var p = PERS[pers(m)];
    return '<span class="mp-meta" style="background:' + p.bg + ';color:' + p.fg + ';font-weight:600;">' + p.t + '</span>';
  }
  function persInfoHtml(m) {
    var st = pers(m), out = '';
    if (st === 'disetujui') out += 'Disetujui oleh <b>' + esc(m.persetujuanOleh || '-') + '</b>' + (m.persetujuanRole ? ' (' + esc(m.persetujuanRole) + ')' : '') + ' · ' + tglIso(m.persetujuanAt);
    if (st === 'diajukan') out += 'Diajukan ' + tglIso(m.diajukanAt) + '. Modul dikunci sampai ditinjau Kepala Madrasah.';
    if (st === 'ditolak') out += 'Ditolak oleh <b>' + esc(m.persetujuanOleh || '-') + '</b> · ' + tglIso(m.persetujuanAt) + '. Perbaiki lalu ajukan ulang.';
    if (m.catatanKepsek && (st === 'ditolak' || st === 'disetujui')) out += '<br>💬 Catatan: ' + nl2br(m.catatanKepsek);
    return out ? '<div class="mp-rel" style="margin-top:6px;">' + out + '</div>' : '';
  }
  // Ubah status persetujuan dengan transaction pada node modul: hanya lolos bila status saat ini masih salah satu dari `dari`
  // (mencegah dua orang bertindak bersamaan / data basi di layar). patch = field yang ikut ditulis.
  function transisi(key, dari, ke, patch, okMsg, logAksi, btn) {
    var m = byKey(key); if (!m) return;
    if (!isReallyOnline()) return toast('Perlu koneksi internet.', true);
    if (isBusy('persModul')) return toast('Sedang memproses…', false, 1500);
    setBusy('persModul', btn);
    db.ref('modul_ajar/' + key).transaction(function (cur) {
      if (cur === null) return cur;   // cache lokal belum ada: biarkan server mengulang dengan data asli
      var st = PERS[cur.persetujuan] ? cur.persetujuan : 'draf';
      if (dari.indexOf(st) === -1) return;   // status sudah berubah: batalkan
      return Object.assign({}, cur, patch, { persetujuan: ke });
    }, function (err, committed, snap) {
      clearBusy('persModul', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      if (!committed) { toast('Status modul sudah berubah. Memuat ulang…', true, 4000); return load(true, function () { renderBody(); }); }
      var v = snap.val() || {}; v.key = key; Object.assign(m, v);
      addLog(logAksi, judulModul(m)); toast(okMsg); kirimNotif(ke, m);
      if (tab === 'buat') { editingKey = null; tab = 'daftar'; render(); } else renderBody();
    }, false);
  }
  // Notifikasi in-app (notifications_v4). Kepsek/Admin memang melihat semua notifikasi, jadi target 'Kepala Madrasah'
  // (akun Kepsek tidak punya key). Guru dicocokkan lewat key atau nama, sama seperti v4LoadNotifications.
  function kirimNotif(ke, m) {
    try {
      if (typeof v4Notify !== 'function') return;
      var judul = judulModul(m) + ' (' + (m.kelas || '-') + ')', pemilik = m.ownerKey || m.ownerName;
      if (ke === 'diajukan') v4Notify('Modul ajar diajukan', (m.guru || m.ownerName || 'Guru') + ' mengajukan modul: ' + judul + '.', 'ACTION', 'Kepala Madrasah', 'MODUL_AJAR', m.key);
      else if (ke === 'disetujui') v4Notify('Modul ajar disetujui', judul + ' disetujui oleh ' + (m.persetujuanOleh || '-') + '.', 'SUCCESS', pemilik, 'MODUL_AJAR', m.key);
      else if (ke === 'ditolak') v4Notify('Modul ajar perlu diperbaiki', judul + ' dikembalikan. Catatan: ' + (m.catatanKepsek || '-'), 'ALERT', pemilik, 'MODUL_AJAR', m.key);
    } catch (e) { console.warn('[modul-ajar] notifikasi gagal', e); }
  }
  function aksiPersetujuan(act, key, btn) {
    var m = byKey(key); if (!m) return;
    var now = new Date().toISOString();
    if (act === 'ajukan') {
      if (!canEdit(m)) return toast('Hanya pemilik modul yang bisa mengajukan.', true);
      if (!m.materi || !m.tujuan) return toast('Lengkapi materi dan tujuan pembelajaran sebelum mengajukan.', true);
      if (!confirm('Ajukan modul ini ke Kepala Madrasah?\nSetelah diajukan, modul dikunci sampai ditinjau.')) return;
      return transisi(key, ['draf', 'ditolak'], 'diajukan', { diajukanAt: now, catatanKepsek: null, persetujuanOleh: null, persetujuanRole: null, persetujuanAt: null },
        '📨 Modul diajukan ke Kepala Madrasah', 'ajukan_modul_ajar', btn);
    }
    if (!canApprove()) return toast('Hanya Kepala Madrasah atau Admin yang bisa menilai modul.', true);
    var role = isKepsek() ? 'Kepala Madrasah' : 'Admin';
    if (act === 'setujui') {
      var cat = prompt('Catatan untuk guru (boleh dikosongkan):', '');
      if (cat === null) return;
      return transisi(key, ['diajukan'], 'disetujui', { persetujuanOleh: currentUser.name, persetujuanRole: role, persetujuanAt: now, catatanKepsek: cat.trim() || null },
        '✅ Modul disetujui', 'setujui_modul_ajar', btn);
    }
    if (act === 'tolak') {
      var alasan = prompt('Alasan penolakan / bagian yang perlu diperbaiki (wajib):', '');
      if (alasan === null) return;
      if (!alasan.trim()) return toast('Alasan penolakan wajib diisi agar guru tahu apa yang diperbaiki.', true);
      return transisi(key, ['diajukan'], 'ditolak', { persetujuanOleh: currentUser.name, persetujuanRole: role, persetujuanAt: now, catatanKepsek: alasan.trim() },
        '❌ Modul dikembalikan ke guru', 'tolak_modul_ajar', btn);
    }
  }
  function kelasBoleh() { return (isAdmin() || isKepsek()) ? KELAS_LIST.slice() : loaderScopeKelas(); }
  function faseDari(kelas) {
    var n = parseInt(String(kelas || '').replace(/\D/g, ''), 10);
    if (n >= 1 && n <= 2) return 'A';
    if (n >= 3 && n <= 4) return 'B';
    if (n >= 5 && n <= 6) return 'C';
    return '';
  }
  function jumlahSiswa(kelas) {
    try { return (allSiswa || []).filter(function (s) { return s.kelas === kelas; }).length; } catch (e) { return 0; }
  }
  /* ---------- isian otomatis dari jadwal (allJadwal: kelas, hari, jam, mapel, guru, guruKey) ---------- */
  // Jadwal milik guru yang dipilih di form. Guru biasa: cocokkan guruKey (fallback nama utk baris lama tanpa guruKey).
  // Admin yang menyusun modul atas nama guru lain: cocokkan nama guru pada isian Nama Guru.
  // Satu hari mengajar = satu pertemuan; jumlah jam (JP) pada hari itu = panjang pertemuan.
  var MENIT_JP = 35;
  function jadwalOpsi() {
    var list = (typeof allJadwal !== 'undefined' && allJadwal) ? allJadwal : [];
    var nama = val('mpf-guru') || (currentUser && currentUser.name) || '';
    var sendiri = !!currentUser && nama === currentUser.name && !!currentUser.key;
    var boleh = kelasBoleh(), grup = {};
    list.forEach(function (j) {
      var cocok = sendiri ? (j.guruKey ? j.guruKey === currentUser.key : j.guru === nama) : j.guru === nama;
      if (!cocok || !j.kelas || !j.mapel || boleh.indexOf(j.kelas) === -1) return;
      var k = j.kelas + '||' + j.mapel;
      var g = grup[k] = grup[k] || { kelas: j.kelas, mapel: j.mapel, jp: 0, hari: {} };
      g.jp++; g.hari[j.hari || '-'] = (g.hari[j.hari || '-'] || 0) + 1;
    });
    return Object.keys(grup).map(function (k) {
      var g = grup[k], hs = Object.keys(g.hari);
      g.nHari = hs.length; g.jpMax = Math.max.apply(null, hs.map(function (h) { return g.hari[h]; }));
      return g;
    }).sort(function (a, b) { return (a.kelas + a.mapel).localeCompare(b.kelas + b.mapel); });
  }
  function saranPertemuan(nHari) { return nHari ? Math.min(8, Math.max(3, nHari * 2)) : PERT_DEFAULT; }   // hari mengajar/minggu × 2 minggu
  function jadwalBarHtml() {
    var ops = jadwalOpsi();
    return '<div class="mp-refbar" style="margin-top:6px;"><select id="mpfJadwal" class="field" style="max-width:360px;">' +
      '<option value="">🗓️ Isi dari jadwal mengajar…</option>' +
      ops.map(function (o) { return '<option value="' + esc(o.kelas + '||' + o.mapel) + '" data-hari="' + o.nHari + '" data-jp="' + o.jpMax + '">' + esc(o.kelas + ' — ' + o.mapel + ' (' + o.nHari + ' hari · ' + o.jp + ' JP/minggu)') + '</option>'; }).join('') + '</select>' +
      '<div class="mp-rel" id="mpfJadwalInfo" style="margin:0;flex:1;">' + (ops.length ? 'Pilih untuk mengisi Kelas, Mapel, Fase, Alokasi Waktu, dan saran jumlah pertemuan.' : 'Belum ada jadwal untuk guru ini. Minta Admin mengisi menu Jadwal.') + '</div></div>';
  }
  function refreshJadwalOpsi() {
    var sel = $('mpfJadwal'); if (!sel) return;
    var b = document.createElement('div'); b.innerHTML = jadwalBarHtml();
    sel.parentNode.parentNode.replaceChild(b.firstChild, sel.parentNode);
  }
  function isiDariJadwal(v) {
    if (!v) return;
    var p = v.split('||'), kelas = p[0], mapel = p[1], opt = $('mpfJadwal').selectedOptions[0];
    var nHari = opt ? parseInt(opt.getAttribute('data-hari'), 10) || 0 : 0, jp = opt ? parseInt(opt.getAttribute('data-jp'), 10) || 0 : 0;
    var k = $('mpf-kelas'), mp = $('mpf-mapel'); if (!k || !mp) return;
    if (!Array.prototype.some.call(k.options, function (o) { return o.value === kelas; })) return toast('Kelas ' + kelas + ' tidak termasuk kelas yang Anda ampu.', true);
    if (!Array.prototype.some.call(mp.options, function (o) { return o.value === mapel; })) {
      var o = document.createElement('option'); o.value = mapel; o.textContent = mapel; mp.appendChild(o);
    }
    k.value = kelas; k.dispatchEvent(new Event('change'));   // memperbarui Fase, hubungan kelas, dan CP/TP dari referensi
    mp.value = mapel; mp.dispatchEvent(new Event('change'));
    var al = $('mpf-alokasi'); if (al && !al.value.trim() && jp) al.value = jp + ' × ' + MENIT_JP + ' menit';
    pertSaran = saranPertemuan(nHari); pertInfoRefresh();
    var rows = pertCollectRaw();   // baris yang belum disentuh disesuaikan dengan saran & alokasi baru
    if (rows.every(pertKosong)) { pertRender(pertSesuaikan(rows, pertSaran)); }
    refreshAcc();
    toast('🗓️ Terisi dari jadwal: ' + kelas + ' — ' + mapel + '. Saran ' + pertSaran + ' pertemuan.');
  }

  /* ---------- daftar pertemuan ----------
     modul.pertemuan = [{ topik, tanggal, alokasi, tujuan, aktivitas, asesmen }]. Bagian yang sama untuk semua pertemuan
     (CP, TP, materi, media, LKPD, dst.) tetap di level modul. Field lama `aktivitas` & `asesmen` di level modul TETAP ditulis
     (gabungan teks semua pertemuan) supaya tab Komponen, pencarian, dan modul lama yang belum punya pertemuan tetap terbaca. */
  var PERT_DEFAULT = 4, PERT_MAX = 10, pertSaran = 4;
  function fixPert(p) {
    p = p || {};
    return { topik: String(p.topik || ''), tanggal: String(p.tanggal || ''), alokasi: String(p.alokasi || ''),
             tujuan: String(p.tujuan || ''), aktivitas: String(p.aktivitas || ''), asesmen: String(p.asesmen || '') };
  }
  function pertKosong(p) { return !(p.topik.trim() || p.tanggal || p.tujuan.trim() || p.aktivitas.trim() || p.asesmen.trim()); }
  function pertSaved(m) {   // hanya pertemuan yang benar-benar tersimpan
    var a = m && m.pertemuan; if (!a) return [];
    if (!Array.isArray(a)) a = Object.keys(a).map(function (k) { return a[k]; });
    return a.map(fixPert);
  }
  function getPert(m) {   // tersimpan, atau 1 pertemuan dari aktivitas/asesmen modul lama
    var l = pertSaved(m);
    if (l.length) return l;
    return (m && (m.aktivitas || m.asesmen)) ? [fixPert({ aktivitas: m.aktivitas, asesmen: m.asesmen })] : [];
  }
  function normPert(list) {
    return (list || []).map(function (p) { return [p.topik, p.tanggal, p.alokasi, p.tujuan, p.aktivitas, p.asesmen].join('¦'); }).join('§');
  }
  function pertJudul(p, i) { return 'Pertemuan ' + (i + 1) + (p.topik ? ' — ' + p.topik : ''); }
  function pertRowHtml(p, i, open) {
    var fld = function (label, cls, html) { return '<div><label class="label">' + label + '</label>' + html + '</div>'; };
    var ta = function (cls, v, rows, ph) { return '<textarea class="field ' + cls + '" rows="' + rows + '" placeholder="' + esc(ph) + '">' + esc(v) + '</textarea>'; };
    return '<details class="mp-pert" data-i="' + i + '"' + (open ? ' open' : '') + ' style="border:1px solid #e5e7eb;border-radius:8px;margin:6px 0;padding:0 10px;background:#fafafa;">' +
      '<summary style="cursor:pointer;padding:8px 0;font-weight:600;font-size:13px;display:flex;justify-content:space-between;gap:8px;">' +
      '<span class="mp-pert-t">' + esc(pertJudul(p, i)) + '</span><span class="text-muted mp-pert-b" style="font-size:12px;font-weight:500;">' + (pertKosong(p) ? 'kosong' : '✓ terisi') + '</span></summary>' +
      '<div style="padding-bottom:10px;"><div class="grid-3">' +
        fld('Topik / sub-materi', '', '<input class="field mpp-topik" value="' + esc(p.topik) + '" placeholder="Contoh: Pengenalan alam sekitar">') +
        fld('Tanggal (opsional)', '', '<input type="date" class="field mpp-tanggal" value="' + esc(p.tanggal) + '">') +
        fld('Alokasi waktu', '', '<input class="field mpp-alokasi" value="' + esc(p.alokasi) + '" placeholder="Contoh: 2 × 35 menit">') +
      '</div>' +
      '<label class="label" style="margin-top:6px;">Tujuan pertemuan ini</label>' + ta('mpp-tujuan', p.tujuan, 2, 'Bagian dari Tujuan Pembelajaran yang dicapai pada pertemuan ini…') +
      '<label class="label" style="margin-top:6px;">Aktivitas pembelajaran</label>' + ta('mpp-aktivitas', p.aktivitas, 5, 'Pendahuluan, inti, dan penutup pertemuan ini…') +
      '<label class="label" style="margin-top:6px;">Asesmen</label>' + ta('mpp-asesmen', p.asesmen, 3, 'Asesmen diagnostik / formatif / sumatif untuk pertemuan ini…') +
      '<div class="mp-actions" style="margin-top:8px;"><button type="button" class="btn btn-soft mp-btn" data-mp="pertdup" data-i="' + i + '">Salin pertemuan</button>' +
      '<button type="button" class="btn btn-danger mp-btn" data-mp="pertdel" data-i="' + i + '">Hapus</button></div></div></details>';
  }
  function pertSectionHtml(list) {
    return '<div class="mp-rel" style="margin-bottom:6px;">Satu modul bisa berisi beberapa pertemuan. Saran: <b id="mpfPertSaran">' + pertSaran + '</b> pertemuan ' +
      '(hari mengajar per minggu × 2 minggu, min. 3 dan maks. 8; jika belum memilih jadwal, ' + PERT_DEFAULT + '). Tambah atau hapus sesuai kebutuhan.</div>' +
      '<div id="mpfPert">' + list.map(function (p, i) { return pertRowHtml(p, i, i === 0); }).join('') + '</div>' +
      '<div class="mp-actions"><button type="button" class="btn btn-primary mp-btn" data-mp="pertadd">＋ Tambah pertemuan</button>' +
      '<button type="button" class="btn btn-soft mp-btn" data-mp="pertsaran">Atur ke saran</button></div>';
  }
  function pertInfoRefresh() { var e = $('mpfPertSaran'); if (e) e.textContent = pertSaran; }
  function pertCollectRaw() {   // semua baris di layar (termasuk yang kosong), mengikuti urutan tampilan
    if (!root) return [];
    return Array.prototype.map.call(root.querySelectorAll('#mpfPert .mp-pert'), function (d) {
      var g = function (c) { var el = d.querySelector('.' + c); return el ? String(el.value || '').trim() : ''; };
      return fixPert({ topik: g('mpp-topik'), tanggal: g('mpp-tanggal'), alokasi: g('mpp-alokasi'), tujuan: g('mpp-tujuan'), aktivitas: g('mpp-aktivitas'), asesmen: g('mpp-asesmen') });
    });
  }
  function pertCollect() { return pertCollectRaw().filter(function (p) { return !pertKosong(p); }); }
  function pertRender(list, bukaIdx) {
    var box = $('mpfPert'); if (!box) return;
    if (!list.length) list = [fixPert({ alokasi: val('mpf-alokasi') })];
    box.innerHTML = list.map(function (p, i) { return pertRowHtml(p, i, i === (bukaIdx == null ? 0 : bukaIdx)); }).join('');
    refreshAcc();
  }
  function pertSesuaikan(list, n) {   // tambah baris kosong / buang baris kosong di ujung sampai berjumlah n
    var out = list.slice(), al = val('mpf-alokasi');
    while (out.length < n && out.length < PERT_MAX) out.push(fixPert({ alokasi: al }));
    while (out.length > n && pertKosong(out[out.length - 1])) out.pop();
    out.forEach(function (p) { if (!p.alokasi && pertKosong(p)) p.alokasi = al; });
    return out;
  }
  function ratakan(list, key) {   // gabungan teks aktivitas/asesmen semua pertemuan (untuk kompatibilitas)
    var rows = list.filter(function (p) { return p[key]; });
    if (!rows.length) return '';
    if (list.length === 1) return rows[0][key];
    return list.map(function (p, i) { return p[key] ? 'Pertemuan ' + (i + 1) + (p.topik ? ' — ' + p.topik : '') + ':\n' + p[key] : ''; }).filter(Boolean).join('\n\n');
  }
  function pertDocHtml(m, no) {
    var l = pertSaved(m);
    return '<h3>' + no + '. Rencana Pertemuan (' + l.length + ' pertemuan)</h3>' + l.map(function (p, i) {
      var meta = [p.tanggal ? 'Tanggal: ' + p.tanggal : '', p.alokasi ? 'Alokasi: ' + p.alokasi : ''].filter(Boolean).join(' · ');
      var bag = function (t, v) { return v ? '<div style="margin-top:6px;"><b>' + t + '</b><br>' + nl2br(v) + '</div>' : ''; };
      return '<div class="b" style="margin-bottom:8px;page-break-inside:avoid;"><b>Pertemuan ' + (i + 1) + (p.topik ? ' — ' + esc(p.topik) : '') + '</b>' +
        (meta ? '<div style="color:#555;font-size:12px;">' + esc(meta) + '</div>' : '') +
        bag('Tujuan', p.tujuan) + bag('Aktivitas Pembelajaran', p.aktivitas) + bag('Asesmen', p.asesmen) + '</div>';
    }).join('');
  }

  function menuVisible(page) {
    var el = document.querySelector('#v4SidebarMenu .menu-item[data-page="' + page + '"]');
    return !!el && !el.classList.contains('hidden-tab');
  }
  function judulModul(m) { return (m.mapel || '-') + ' — ' + (m.materi || '(tanpa materi)'); }
  function relasi(m, guru) {
    return esc(guru || m.guru || '-') + ' → ' + esc(m.mapel || '-') + ' → ' + esc(m.kelas || '-') +
      ' → ' + jumlahSiswa(m.kelas) + ' peserta didik';
  }

  /* ---------- data ---------- */
  function load(force, cb) {
    if (loading) return;
    if (loaded && !force) { if (cb) cb(); return; }
    if (typeof db === 'undefined' || !isReallyOnline()) {
      loadErr = loaded ? '' : 'Perlu koneksi internet untuk memuat modul.';
      if (cb) cb(); return;
    }
    loading = true; loadErr = '';
    var g = gen;
    render();
    db.ref('modul_ajar').once('value', function (snap) {
      if (g !== gen) return;
      var arr = [];
      snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      data = arr.filter(function (m) { return isAdmin() || isKepsek() || isOwner(m); });
      sortData();
      loaded = true; loading = false; render(); if (cb) cb();
    }, function (err) {
      if (g !== gen) return;
      loading = false; loadErr = 'Gagal memuat modul: ' + (err && err.message || err);
      render(); if (cb) cb();
    });
  }
  function sortData() { data.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')); }); }
  function byKey(key) { return data.filter(function (m) { return m.key === key; })[0]; }
  function write(key, payload, okMsg, cb) {
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    db.ref('modul_ajar/' + key).update(payload, function (err) {
      if (err) return toast('Gagal: ' + err.message, true);
      var m = byKey(key); if (m) Object.keys(payload).forEach(function (k) { m[k] = payload[k]; });
      if (payload.updatedAt) sortData();
      if (okMsg) toast(okMsg);
      if (cb) cb();
    });
  }

  /* ---------- referensi kurikulum (kurikulum_ref) ---------- */
  function mapelList() {
    var src = $('materiMapelFilter'), out = [];
    if (src) Array.prototype.forEach.call(src.querySelectorAll('option'), function (o) { if (o.value && out.indexOf(o.value) === -1) out.push(o.value); });
    return out.length ? out : ['Matematika', 'Bahasa Indonesia'];
  }
  function tglIso(iso) { return iso ? String(iso).slice(0, 10) : '-'; }
  function refByKey(key) { return refs.filter(function (r) { return r.key === key; })[0]; }
  // Nama kepala madrasah untuk baris tanda tangan cetak Modul Ajar. Dibuat terpisah dari alur
  // persetujuan digital (m.persetujuanOleh): banyak madrasah masih tanda tangan basah di kertas
  // dan tidak pernah memakai tombol Setuju/Tolak di aplikasi, sehingga tanpa ini baris tanda tangan
  // kepala madrasah akan selalu kosong. Disimpan di Firebase (bukan localStorage) karena nilainya
  // satu untuk seluruh madrasah, bukan per guru.
  var kepalaNama = '';
  // Disimpan di school_settings/namaKepala: node ini sudah ada di Firebase Rules (baca/tulis untuk user login,
  // anak tambahan diizinkan lewat $other), jadi tidak perlu mengubah Rules. Jalur lama 'pengaturan_cetak' dan
  // 'perangkat_setting_v4' TIDAK ada di Rules sehingga selalu ditolak. Salinan localStorage tetap dibuat supaya
  // cetak di perangkat ini terisi walau sedang offline.
  var KEPALA_PATHS = ['school_settings/namaKepala'];
  var KEPALA_LS = 'mp_nama_kepala';
  function kepalaLokal() { try { return localStorage.getItem(KEPALA_LS) || ''; } catch (e) { return ''; } }
  function kepalaSegarkan() { if (tab !== 'buat') renderBody(); } // jangan timpa form yang sedang diisi
  function kepalaOnline() { return typeof isReallyOnline === 'function' ? isReallyOnline() : navigator.onLine; }
  function loadKepalaNama() {
    kepalaNama = kepalaLokal();
    if (typeof db === 'undefined' || !db || !kepalaOnline()) { kepalaSegarkan(); return; }
    (function coba(i) {
      if (i >= KEPALA_PATHS.length) { kepalaSegarkan(); return; }
      db.ref(KEPALA_PATHS[i]).once('value', function (snap) {
        var v = snap.val();
        if (typeof v === 'string' && v.trim()) { kepalaNama = v.trim(); kepalaSegarkan(); } else coba(i + 1);
      }, function () { coba(i + 1); }); // dibaca ditolak -> coba jalur berikutnya, bukan diam saja
    })(0);
  }
  function simpanKepalaServer(v, cb) { // cb(errTerakhir | null)
    var selesai = false, timer = setTimeout(function () { if (!selesai) { selesai = true; cb({ message: 'server tidak merespons' }); } }, 12000);
    function akhir(err) { if (selesai) return; selesai = true; clearTimeout(timer); cb(err); }
    (function coba(i, lastErr) {
      if (selesai) return;
      if (i >= KEPALA_PATHS.length) return akhir(lastErr || { message: 'gagal' });
      try {
        db.ref(KEPALA_PATHS[i]).set(v, function (err) { if (err) coba(i + 1, err); else akhir(null); });
      } catch (e) { coba(i + 1, e); }
    })(0, null);
  }
  function aturKepalaNama() {
    if (!isAdmin()) return toast('Hanya Admin yang bisa mengubah nama Kepala Madrasah.', true);
    var v = prompt('Nama Kepala Madrasah (dicetak di baris tanda tangan Modul Ajar bila belum disetujui lewat aplikasi):', kepalaNama || '');
    if (v === null) return;
    v = v.trim().slice(0, 80);
    try { localStorage.setItem(KEPALA_LS, v); } catch (e) {}
    kepalaNama = v; kepalaSegarkan();
    if (typeof db === 'undefined' || !db || !kepalaOnline()) {
      return toast('⚠️ Offline: nama tersimpan di perangkat ini saja. Simpan ulang saat online agar berlaku di semua perangkat.', true);
    }
    simpanKepalaServer(v, function (err) {
      if (err) return toast('⚠️ Tersimpan di perangkat ini saja. Server menolak: ' + (err.message || err) + '. Coba lagi saat online dan sudah login.', true);
      toast('✅ Nama Kepala Madrasah disimpan');
    });
  }
  function refFor(mapel, fase) { return refs.filter(function (r) { return r.mapel === mapel && r.fase === fase; })[0]; }
  function refStale(m) {
    var r = m.kurikulumRefKey ? refByKey(m.kurikulumRefKey) : null;
    return !!(r && m.kurikulumAt && String(r.updatedAt || '') > String(m.kurikulumAt));
  }
  function loadRef(force, cb) {
    if (refLoading) return;
    if (refLoaded && !force) { if (cb) cb(); return; }
    if (typeof db === 'undefined' || !isReallyOnline()) { if (cb) cb(); return; }
    refLoading = true; refErr = '';
    var g = gen;
    db.ref('kurikulum_ref').once('value', function (snap) {
      if (g !== gen) return;
      var arr = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      refs = arr.sort(function (a, b) { return (a.mapel + a.fase).localeCompare(b.mapel + b.fase); });
      refLoaded = true; refLoading = false;
      if (tab === 'referensi') renderBody();
      else if (tab === 'buat') { if (!editingKey) applyRef(true); refreshRefInfo(); }
      if (cb) cb();
    }, function (err) {
      if (g !== gen) return;
      refLoading = false; refErr = 'Gagal memuat referensi kurikulum: ' + (err && err.message || err);
      if (tab === 'referensi') renderBody(); if (cb) cb();
    });
  }
  function refInfoHtml() {
    if (!formRef) return '🧭 Belum terhubung ke referensi kurikulum. Pilih mapel & kelas, lalu klik “Isi dari kurikulum”.';
    var r = refByKey(formRef.key), stale = r && formRef.at && String(r.updatedAt || '') > String(formRef.at);
    return '🧭 Terisi dari: <b>' + esc(formRef.versi || 'referensi') + '</b> · ' + esc(tglIso(formRef.at)) +
      (stale ? ' · <span style="color:#b45309;font-weight:600;">⚠ Referensi sudah diperbarui — klik “Isi dari kurikulum” untuk memuat ulang</span>' : '');
  }
  function refreshRefInfo() { var el = $('mpfRef'); if (el) el.innerHTML = refInfoHtml(); }
  // auto=true: isi diam-diam hanya kolom yang kosong/belum diubah guru. auto=false: tombol manual.
  // Pecah CP yang berupa satu paragraf panjang menjadi baris per elemen bernomor ("1.1. ", "2.3. ", dst),
  // sesuai pola penomoran di SK Dirjen Pendis 9941/2025 dan KepKa BSKAP 046/2025. Hanya format tampilan;
  // kata-katanya tidak diubah. CP yang tidak memakai pola ini (mis. ringkasan lama) tidak terpengaruh.
  function formatCP(s) {
    s = String(s || '');
    return s.replace(/\s*(?=\d+\.\d+\.\s)/g, '\n').trim();
  }
  function applyRef(auto) {
    var mapel = val('mpf-mapel'), fase = val('mpf-fase'), cpEl = $('mpf-cp'), tpEl = $('mpf-tujuan');
    if (!cpEl || !tpEl) return;
    var bebas = function (el, k) { var v = el.value.trim(); return !v || v === lastFill[k]; };
    if (!mapel || !fase) { return; }
    var r = refFor(mapel, fase);
    if (!r) {
      if (bebas(cpEl, 'cp') && lastFill.cp) cpEl.value = '';
      if (bebas(tpEl, 'tp') && lastFill.tp) tpEl.value = '';
      lastFill = { cp: '', tp: '' }; formRef = null; refreshRefInfo();
      if (!auto) toast('Referensi kurikulum untuk ' + mapel + ' Fase ' + fase + ' belum tersedia.' + (isAdmin() ? ' Tambahkan di tab Referensi.' : ' Minta admin mengisinya di tab Referensi.'), true, 5000);
      return;
    }
    var cp = String(r.cp || ''), tp = String(r.tp || '');
    var cpOk = bebas(cpEl, 'cp'), tpOk = bebas(tpEl, 'tp');
    if (!auto && (!cpOk || !tpOk) && !confirm('CP/TP sudah Anda ubah. Timpa dengan referensi kurikulum?')) return;
    // lastFill dibaca balik dari elemen (bukan dari teks sumber) supaya cocok dengan normalisasi baris baru textarea.
    var isi = function (el, k, teks) { el.value = teks; lastFill[k] = el.value.trim(); };
    // Urutan tetap: CP dulu, lalu TP.
    if (cp && (cpOk || !auto)) isi(cpEl, 'cp', formatCP(cp));
    if (tp && (tpOk || !auto)) isi(tpEl, 'tp', tp);
    formRef = { key: r.key, versi: r.versi || '', at: r.updatedAt || '' };
    refreshRefInfo(); refreshAcc();
    if (!auto) toast('✅ CP & TP diisi dari ' + (r.versi || 'referensi kurikulum'));
  }
  function refTabHtml() {
    var admin = isAdmin();
    if (refMode === 'form') return refFormHtml();
    if (refMode === 'impor') return refImporHtml();
    var head = '<p class="text-muted" style="font-size:13px;margin-bottom:10px;">Sumber CP &amp; TP untuk tombol “Isi dari kurikulum” di formulir modul. ' +
      (admin ? 'Anda (admin) yang mengelola isinya — salin dari dokumen resmi Kemenag.' : 'Hanya admin yang dapat mengubah.') + '</p>';
    var acts = admin ? '<div class="mp-actions" style="margin:0 0 12px;"><button class="btn btn-success" data-mp="refbaru">+ TAMBAH REFERENSI</button><button class="btn btn-soft" data-mp="refimpor">📥 IMPOR TEMPEL</button><button class="btn btn-soft" data-mp="kepalanama">👤 NAMA KEPALA MADRASAH</button></div>' : '';
    if (refErr) return head + '<p style="color:#dc2626;">' + esc(refErr) + '</p><button class="btn btn-soft" data-mp="refreload">🔄 Coba lagi</button>';
    if (refLoading) return head + '<p class="text-muted">⏳ Memuat referensi…</p>';
    if (!refs.length) return head + acts + '<p class="text-muted">Belum ada referensi kurikulum.' + (admin ? ' Mulai dengan “+ TAMBAH REFERENSI” atau “IMPOR TEMPEL”.' : ' Minta admin mengisinya.') + '</p>';
    return head + acts + refs.map(refCard).join('');
  }
  function refCard(r) {
    var admin = isAdmin(), tpN = String(r.tp || '').split('\n').filter(function (x) { return x.trim(); }).length;
    return '<details class="mp-card mp-ref"><summary><span class="mp-title">' + esc(r.mapel) + ' — Fase ' + esc(r.fase) + '</span> ' +
      '<span class="mp-meta">' + esc(r.versi || '-') + '</span> <span class="mp-meta">' + tpN + ' TP</span> <span class="mp-meta">diperbarui ' + esc(tglIso(r.updatedAt)) + '</span></summary>' +
      (r.cp ? '<div class="mp-sec-t">Capaian Pembelajaran</div><div class="mp-snip">' + nl2br(r.cp) + '</div>' : '') +
      (r.tp ? '<div class="mp-sec-t">Tujuan Pembelajaran</div><div class="mp-snip">' + nl2br(r.tp) + '</div>' : '') +
      (admin ? '<div class="mp-actions"><button class="btn btn-primary mp-btn" data-mp="refedit" data-key="' + esc(r.key) + '">EDIT</button>' +
        '<button class="btn btn-danger mp-btn" data-mp="refhapus" data-key="' + esc(r.key) + '">🗑️ Hapus</button></div>' : '') + '</details>';
  }
  function refFormHtml() {
    var r = refEditKey ? refByKey(refEditKey) : null; r = r || {};
    var faseOpt = ['A', 'B', 'C', 'D', 'E', 'F'].map(function (f) { return '<option' + (f === (r.fase || 'A') ? ' selected' : '') + '>' + f + '</option>'; }).join('');
    var mapelOpt = '<option value="">-- Pilih Mata Pelajaran --</option>' + mapelList().map(function (m) { return '<option value="' + esc(m) + '"' + (m === r.mapel ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
    return '<div class="mp-form"><div class="mp-fh">' + (refEditKey ? 'Ubah' : 'Tambah') + ' Referensi Kurikulum</div><div class="grid-3">' +
      '<div><label class="label">Mata Pelajaran *</label><select id="mpr-mapel" class="field">' + mapelOpt + '</select></div>' +
      '<div><label class="label">Fase *</label><select id="mpr-fase" class="field">' + faseOpt + '</select></div>' +
      '<div><label class="label">Sumber / Versi *</label><input id="mpr-versi" class="field" value="' + esc(r.versi || '') + '" placeholder="Contoh: KMA 1503 Tahun 2025"></div></div>' +
      '<div class="mp-fsec"><label class="label">Capaian Pembelajaran (CP)</label><textarea id="mpr-cp" class="field" rows="6">' + esc(r.cp || '') + '</textarea></div>' +
      '<div class="mp-fsec"><label class="label">Tujuan Pembelajaran / Alur TP (satu per baris)</label><textarea id="mpr-tp" class="field" rows="8">' + esc(r.tp || '') + '</textarea></div>' +
      '<div class="mp-actions"><button class="btn btn-success" data-mp="refsimpan">💾 SIMPAN</button><button class="btn btn-soft" data-mp="refbatal">Batal</button></div></div>';
  }
  function refImporHtml() {
    var info = '';
    if (refParsed) {
      info = '<div class="mp-rel" style="margin-top:10px;">✅ Siap disimpan: <b>' + refParsed.ok.length + '</b> baris · dilewati: <b>' + refParsed.skip.length + '</b>' +
        (refParsed.skip.length ? '<ul style="margin:6px 0 0 18px;">' + refParsed.skip.slice(0, 10).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + (refParsed.skip.length > 10 ? '<li>…</li>' : '') + '</ul>' : '') + '</div>' +
        (refParsed.ok.length ? '<div class="mp-actions"><button class="btn btn-success" data-mp="refimporsimpan">💾 SIMPAN ' + refParsed.ok.length + ' REFERENSI</button></div>' : '');
    }
    return '<div class="mp-form"><div class="mp-fh">Impor Tempel Referensi Kurikulum</div>' +
      '<p class="text-muted" style="font-size:12.5px;margin-bottom:8px;">Salin dari Excel/Google Sheets, satu baris per data, dengan kolom (dipisah tab): <b>Mata Pelajaran · Fase · Sumber/Versi · CP · TP</b>. ' +
      'Beberapa TP dalam satu sel dipisahkan dengan <code>||</code>. Baris judul boleh disertakan. Data mapel+fase yang sudah ada akan diganti.</p>' +
      '<textarea id="mpr-paste" class="field" rows="10" placeholder="Matematika&#9;A&#9;KMA 1503 Tahun 2025&#9;CP…&#9;TP 1||TP 2">' + esc(refPaste) + '</textarea>' +
      '<div class="mp-actions"><button class="btn btn-primary" data-mp="refimporcek">🔍 PERIKSA</button><button class="btn btn-soft" data-mp="refbatal">Batal</button></div>' + info + '</div>';
  }
  function parseImpor(text) {
    var mapels = mapelList(), byLower = {}, out = {}, skip = [];
    mapels.forEach(function (m) { byLower[m.toLowerCase()] = m; });
    text.split(/\r?\n/).forEach(function (line, i) {
      if (!line.trim()) return;
      var c = line.split('\t').map(function (x) { return x.trim(); });
      if (i === 0 && /^mata\s*pelajaran$|^mapel$/i.test(c[0])) return;
      if (c.length < 4) return skip.push('Baris ' + (i + 1) + ': kolom kurang (butuh minimal Mapel, Fase, Versi, CP)');
      var mapel = byLower[c[0].toLowerCase()], fase = (c[1] || '').toUpperCase();
      if (!mapel) return skip.push('Baris ' + (i + 1) + ': mata pelajaran “' + c[0] + '” tidak dikenal');
      if (!/^[A-F]$/.test(fase)) return skip.push('Baris ' + (i + 1) + ': fase harus A–F');
      if (!c[2]) return skip.push('Baris ' + (i + 1) + ': sumber/versi kosong');
      var cp = c[3] || '', tp = (c[4] || '').split('||').map(function (x) { return x.trim(); }).filter(Boolean).join('\n');
      if (!cp && !tp) return skip.push('Baris ' + (i + 1) + ': CP dan TP kosong');
      out[mapel + '|' + fase] = { mapel: mapel, fase: fase, versi: c[2], cp: cp, tp: tp };
    });
    return { ok: Object.keys(out).map(function (k) { return out[k]; }), skip: skip };
  }
  function refSimpan(btn) {
    if (!isAdmin()) return toast('Hanya Admin!', true);
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    if (isBusy('simpanRef')) return;
    var mapel = val('mpr-mapel'), fase = val('mpr-fase'), versi = val('mpr-versi'), cp = val('mpr-cp'), tp = val('mpr-tp');
    if (!mapel || !fase || !versi || (!cp && !tp)) return toast('Mata pelajaran, fase, sumber/versi, dan minimal CP atau TP wajib diisi!', true);
    if ((cp && cp.length < REF_MIN) || (tp && tp.length < REF_MIN)) return toast('CP/TP yang diisi minimal ' + REF_MIN + ' karakter.', true);
    var dup = refFor(mapel, fase);
    if (dup && refEditKey && dup.key !== refEditKey) return toast('Referensi untuk mapel & fase ini sudah ada. Ubah yang sudah ada.', true);
    if (dup && !refEditKey && !confirm('Referensi ' + mapel + ' Fase ' + fase + ' sudah ada. Ganti dengan isian ini?')) return;
    var key = refEditKey || (dup && dup.key) || db.ref('kurikulum_ref').push().key;
    var obj = { mapel: mapel, fase: fase, versi: versi, cp: cp, tp: tp, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
    setBusy('simpanRef', btn);
    db.ref('kurikulum_ref/' + key).set(obj, function (err) {
      clearBusy('simpanRef', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      obj.key = key; var ex = refByKey(key);
      if (ex) Object.assign(ex, obj); else refs.push(obj);
      refs.sort(function (a, b) { return (a.mapel + a.fase).localeCompare(b.mapel + b.fase); });
      addLog('simpan_referensi_kurikulum', mapel + ' Fase ' + fase + ' - ' + versi);
      toast('✅ Referensi disimpan'); refMode = 'list'; refEditKey = null; renderBody();
    });
  }
  function refImporSimpan(btn) {
    if (!isAdmin() || !refParsed || !refParsed.ok.length) return;
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    if (isBusy('imporRef')) return;
    var now = new Date().toISOString(), upd = {};
    refParsed.ok.forEach(function (r) {
      var ex = refFor(r.mapel, r.fase), k = ex ? ex.key : db.ref('kurikulum_ref').push().key;
      upd[k] = Object.assign({}, r, { updatedAt: now, updatedBy: currentUser.name });
    });
    setBusy('imporRef', btn);
    db.ref('kurikulum_ref').update(upd, function (err) {
      clearBusy('imporRef', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      addLog('impor_referensi_kurikulum', refParsed.ok.length + ' baris');
      toast('✅ ' + refParsed.ok.length + ' referensi disimpan');
      refMode = 'list'; refParsed = null; refPaste = ''; refLoaded = false; loadRef(true);
    });
  }

  /* ---------- shell ---------- */
  function ensurePage() {
    if ($('page-' + PAGE)) return;
    var host = $('mainContent'); if (!host) return;
    var div = document.createElement('div');
    div.id = 'page-' + PAGE; div.className = 'page-content hidden';
    var anchor = $('page-tugas-siswa');
    if (anchor && anchor.parentNode === host) anchor.insertAdjacentElement('afterend', div); else host.appendChild(div);
    root = div;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
  }

  function render() {
    if (!root) return;
    if (!canView()) {
      root.innerHTML = '<div class="card"><p style="color:#dc2626;">🔒 Menu ini hanya untuk guru, admin, dan kepala madrasah.</p></div>';
      return;
    }
    var tabsHtml = TABS.map(function (t) {
      var label = (t.id === 'buat' && editingKey) ? '✏️ Edit Modul' : t.t;
      if (t.id === 'buat' && !canCreate()) return '';
      var on = tab === t.id;
      return '<button type="button" id="mp-tab-' + t.id + '" role="tab" aria-selected="' + on + '" aria-controls="mpBody" class="mp-tab' + (on ? ' active' : '') + '" data-mp="tab" data-tab="' + t.id + '">' + label + '</button>';
    }).join('');
    root.innerHTML = '<div class="card">' +
      '<h3 style="font-size:16px;font-weight:700;margin-bottom:4px;">📚 Modul Pembelajaran</h3>' +
      '<p style="font-size:13px;color:#6b7280;margin-bottom:12px;">Susun modul ajar, hubungkan dengan kelas, lalu pakai untuk absensi dan penilaian kelas yang sama.</p>' +
      '<div class="mp-tabs" role="tablist">' + tabsHtml + '</div>' +
      '<div id="mpBody" role="tabpanel" aria-labelledby="mp-tab-' + tab + '"></div></div>';
    renderBody();
  }
  function renderBody() {
    var b = $('mpBody'); if (!b) return;
    if (tab === 'referensi') { b.innerHTML = refTabHtml(); return; }
    if (loading) { b.innerHTML = '<p class="text-muted" style="padding:12px 0;">⏳ Memuat modul…</p>'; return; }
    if (tab === 'buat') { b.innerHTML = formHtml(editingKey ? byKey(editingKey) : null); bindForm(); return; }
    if (loadErr) { b.innerHTML = '<p style="color:#dc2626;padding:8px 0;">' + esc(loadErr) + '</p><button class="btn btn-soft" data-mp="reload">🔄 Coba lagi</button>'; return; }
    if (tab === 'komponen') { b.innerHTML = komponenHtml(); renderList(); return; }
    b.innerHTML = toolbarHtml() + '<div id="mpList"></div>';
    renderList();
  }

  /* ---------- daftar / favorit / arsip / komponen ---------- */
  function toolbarHtml() {
    var mapelOpt = uniq(data.map(function (m) { return m.mapel; })), kelasOpt = uniq(data.map(function (m) { return m.kelas; }));
    function opts(list, cur, all) {
      return '<option value="">' + all + '</option>' + list.map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    }
    var antre = data.filter(function (m) { return pers(m) === 'diajukan' && m.status !== 'arsip'; }).length;
    var banner = (canApprove() && tab === 'daftar' && antre)
      ? '<div class="mp-rel" style="margin-bottom:8px;background:#fef3c7;">🔔 <b>' + antre + '</b> modul menunggu persetujuan. <button type="button" class="btn btn-soft mp-btn" data-mp="antrean">Tampilkan</button></div>' : '';
    var persOpt = '<option value="">Semua status persetujuan</option>' + Object.keys(PERS).map(function (k) {
      return '<option value="' + k + '"' + (filt.pers === k ? ' selected' : '') + '>' + esc(PERS[k].t) + '</option>';
    }).join('');
    return banner + '<div class="mp-toolbar">' +
      '<input id="mpQ" class="field" placeholder="🔍 Cari materi / mapel / guru…" value="' + esc(filt.q) + '">' +
      '<select id="mpFPers" class="field">' + persOpt + '</select>' +
      '<select id="mpFMapel" class="field">' + opts(mapelOpt, filt.mapel, 'Semua mapel') + '</select>' +
      '<select id="mpFKelas" class="field">' + opts(kelasOpt, filt.kelas, 'Semua kelas') + '</select>' +
      '<select id="mpFSem" class="field">' + opts(['Ganjil', 'Genap'], filt.semester, 'Semua semester') + '</select>' +
      (canCreate() && tab === 'daftar' ? '<button class="btn btn-success" data-mp="baru">+ MODUL BARU</button>' : '') + '</div>';
  }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }).sort(); }
  function komponenHtml() {
    var chips = KOMPONEN.map(function (k) {
      return '<button type="button" class="mp-chip' + (komp === k ? ' active' : '') + '" data-mp="komp" data-k="' + k + '">' + esc(sec(k).t) + '</button>';
    }).join('');
    return '<div class="mp-chips">' + chips + '</div>' + toolbarHtml().replace(/<button class="btn btn-success"[^>]*>.*?<\/button>/, '') + '<div id="mpList"></div>';
  }
  function filtered() {
    var q = filt.q.toLowerCase();
    return data.filter(function (m) {
      var arsip = m.status === 'arsip';
      if (tab === 'arsip' ? !arsip : arsip) return false;
      if (tab === 'favorit' && !m.favorit) return false;
      if (filt.mapel && m.mapel !== filt.mapel) return false;
      if (filt.kelas && m.kelas !== filt.kelas) return false;
      if (filt.semester && m.semester !== filt.semester) return false;
      if (filt.pers && pers(m) !== filt.pers) return false;
      if (q && (m.materi + ' ' + m.mapel + ' ' + m.guru + ' ' + m.kelas).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }
  function renderList() {
    var box = $('mpList'); if (!box) return;
    var items = filtered();
    if (!items.length) {
      var msg = { daftar: 'Belum ada modul. Klik “+ MODUL BARU” untuk membuat.', favorit: 'Belum ada modul favorit. Tandai ⭐ pada modul di Daftar Modul.', arsip: 'Arsip kosong.', komponen: 'Belum ada modul untuk ditampilkan.' }[tab];
      box.innerHTML = '<p class="text-muted" style="padding:12px 0;font-size:13px;">' + msg + '</p>'; return;
    }
    box.innerHTML = items.map(tab === 'komponen' ? komponenCard : card).join('');
  }
  function chip(t) { return '<span class="mp-meta">' + esc(t) + '</span>'; }
  function card(m) {
    var st = pers(m), edit = canEdit(m), arsip = m.status === 'arsip', kunci = st === 'diajukan';
    var btn = function (act, label, cls) { return '<button class="btn ' + (cls || 'btn-soft') + ' mp-btn" data-mp="' + act + '" data-key="' + esc(m.key) + '">' + label + '</button>'; };
    var acts = '';
    if (edit && !arsip && !kunci) acts += btn('edit', 'EDIT', 'btn-primary');
    if (edit && !arsip && (st === 'draf' || st === 'ditolak')) acts += btn('ajukan', '📨 AJUKAN', 'btn-success');
    if (canApprove() && !arsip && st === 'diajukan') acts += btn('setujui', '✅ SETUJUI', 'btn-success') + btn('tolak', '❌ TOLAK', 'btn-danger');
    if (canCreate()) acts += btn('dup', 'DUPLIKAT');
    if (edit && !arsip) acts += btn('fav', m.favorit ? '⭐ Favorit' : '☆ Favorit');
    acts += btn('cetak', 'CETAK') + btn('pdf', 'PDF');
    if (edit && !arsip) acts += btn('arsip', 'ARSIPKAN', 'btn-warning');
    if (edit && arsip) acts += btn('pulih', '♻️ Pulihkan') + btn('hapus', '🗑️ Hapus', 'btn-danger');
    var go = '';
    if (menuVisible('attendance')) go += btn('goabsen', '📋 Absensi ' + esc(m.kelas));
    if (menuVisible('grades')) go += btn('gonilai', '📝 Nilai ' + esc(m.kelas));
    return '<div class="mp-card">' +
      '<div class="mp-card-h"><div class="mp-title">' + esc(judulModul(m)) + (m.favorit ? ' ⭐' : '') + '</div>' +
      '<div class="mp-metas">' + persBadge(m) + chip(m.kelas) + (m.fase ? chip('Fase ' + m.fase) : '') + chip('Sem. ' + (m.semester || '-')) + chip(m.tahunAjaran || '-') + (m.alokasi ? chip('⏱ ' + m.alokasi) : '') + (pertSaved(m).length ? chip('🗓️ ' + pertSaved(m).length + ' pertemuan') : '') + (m.kurikulumVersi ? chip('🧭 ' + m.kurikulumVersi) : '') + (refStale(m) ? '<span class="mp-meta mp-warn">⚠ Kurikulum diperbarui</span>' : '') + '</div></div>' +
      '<div class="mp-rel">' + relasi(m) + '</div>' + persInfoHtml(m) +
      (m.tujuan ? '<div class="mp-snip">' + nl2br(String(m.tujuan).slice(0, 160)) + (String(m.tujuan).length > 160 ? '…' : '') + '</div>' : '') +
      '<div class="mp-actions">' + acts + '</div>' +
      (go ? '<div class="mp-actions mp-go">' + go + '</div>' : '') + '</div>';
  }
  function komponenCard(m) {
    var s = sec(komp), txt = m[komp];
    return '<div class="mp-card"><div class="mp-card-h"><div class="mp-title">' + esc(judulModul(m)) + '</div>' +
      '<div class="mp-metas">' + chip(m.kelas) + chip('Sem. ' + (m.semester || '-')) + '</div></div>' +
      '<div class="mp-sec-t">' + esc(s.t) + '</div>' +
      '<div class="mp-snip">' + (txt ? nl2br(txt) : '<span class="text-muted">— belum diisi —</span>') + '</div>' +
      '<div class="mp-actions">' + (canEdit(m) ? '<button class="btn btn-primary mp-btn" data-mp="edit" data-key="' + esc(m.key) + '">EDIT</button>' : '') +
      '<button class="btn btn-soft mp-btn" data-mp="cetak" data-key="' + esc(m.key) + '">CETAK</button></div></div>';
  }

  /* ---------- form ---------- */
  function mapelOptions(cur) {
    // Opsi kosong bawaan filter (mis. "Semua mapel") dilewati lewat mapelList(); placeholder hanya satu.
    return '<option value="">-- Pilih Mata Pelajaran --</option>' + mapelList().map(function (m) {
      return '<option value="' + esc(m) + '"' + (m === cur ? ' selected' : '') + '>' + esc(m) + '</option>';
    }).join('');
  }
  function checks(cls, list, sel) {
    return '<div class="mp-checks">' + list.map(function (x) {
      return '<label class="mp-check"><input type="checkbox" class="' + cls + '" value="' + esc(x) + '"' + (sel.indexOf(x) !== -1 ? ' checked' : '') + '> <span>' + esc(x) + '</span></label>';
    }).join('') + '</div>';
  }
  function formHtml(m) {
    m = m || {};
    var kelasList = kelasBoleh(), kelas = m.kelas || (kelasList[0] || '');
    if (!canCreate()) return '<p style="color:#dc2626;">🔒 Anda tidak punya izin membuat modul.</p>';
    if (!kelasList.length) return '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>';
    var guru = m.guru || currentUser.name, fase = m.fase || faseDari(kelas);
    var kelasOpt = kelasList.map(function (k) { return '<option' + (k === kelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    var semOpt = ['Ganjil', 'Genap'].map(function (s) { return '<option' + (s === (m.semester || currentSemesterAktif) ? ' selected' : '') + '>' + s + '</option>'; }).join('');
    var faseOpt = ['A', 'B', 'C', 'D', 'E', 'F'].map(function (f) { return '<option' + (f === fase ? ' selected' : '') + '>' + f + '</option>'; }).join('');
    var fld = function (id, label, html) { return '<div><label class="label">' + label + '</label>' + html + '</div>'; };
    var inp = function (id, v, ph, list) { return '<input id="' + id + '" class="field" value="' + esc(v) + '" placeholder="' + esc(ph || '') + '"' + (list ? ' list="' + list + '"' : '') + '>'; };
    // Bagian panjang dilipat (akordeon) supaya formulir ringkas; hanya Tujuan Pembelajaran (wajib) terbuka.
    var acc = function (id, judul, isi, open, badgeId) {
      return '<details class="mp-acc" id="' + id + '"' + (open ? ' open' : '') + ' style="border:1px solid #e5e7eb;border-radius:10px;margin:6px 0;padding:0 12px;">' +
        '<summary style="cursor:pointer;padding:10px 0;font-weight:600;font-size:14px;display:flex;justify-content:space-between;gap:8px;align-items:center;">' +
        '<span>' + judul + '</span><span id="' + badgeId + '" class="text-muted" style="font-size:12px;font-weight:500;"></span></summary>' +
        '<div style="padding-bottom:10px;">' + isi + '</div></details>';
    };
    var nomor = 2, secs = SECTIONS.map(function (s) {
      if (s.k === 'asesmen') return '';   // asesmen diisi per pertemuan
      var no = nomor++;
      if (s.k === 'aktivitas') {
        var pl = getPert(m);
        if (!editingKey && !pl.length) pl = pertSesuaikan([], pertSaran);
        if (!pl.length) pl = [fixPert({})];
        return acc('mpacc-aktivitas', no + '. Daftar Pertemuan (aktivitas & asesmen per pertemuan)', pertSectionHtml(pl), true, 'mpbadge-aktivitas');
      }
      return acc('mpacc-' + s.k, no + '. ' + esc(s.t) + (s.req ? ' *' : ''),
        '<textarea id="mpf-' + s.k + '" class="field" rows="3" placeholder="' + esc(s.ph) + '">' + esc(m[s.k] || '') + '</textarea>',
        !!s.req, 'mpbadge-' + s.k);
    }).join('');
    var infoPers = '';
    if (editingKey && pers(m) === 'disetujui') infoPers = '<div class="mp-rel" style="background:#fef3c7;margin-bottom:8px;">⚠️ Modul ini sudah disetujui. Jika Anda mengubah isinya, status kembali ke <b>Draf</b> dan perlu diajukan ulang.' + persInfoHtml(m) + '</div>';
    else if (editingKey && pers(m) === 'ditolak') infoPers = '<div class="mp-rel" style="background:#fee2e2;margin-bottom:8px;">❌ Modul dikembalikan oleh Kepala Madrasah. Perbaiki lalu ajukan ulang dari Daftar Modul.' + persInfoHtml(m) + '</div>';
    return '<div class="mp-form">' + infoPers +
      '<div class="mp-fh">1. Identitas Modul</div>' +
      '<div class="grid-3">' +
        fld('', 'Mata Pelajaran *', '<select id="mpf-mapel" class="field">' + mapelOptions(m.mapel) + '</select>') +
        fld('', 'Kelas *', '<select id="mpf-kelas" class="field">' + kelasOpt + '</select>') +
        fld('', 'Semester', '<select id="mpf-semester" class="field">' + semOpt + '</select>') +
        fld('', 'Materi *', inp('mpf-materi', m.materi, 'Contoh: Alam sekitar', 'mpDlMateri')) +
        fld('', 'Alokasi Waktu', inp('mpf-alokasi', m.alokasi, 'Contoh: 2 × 35 menit')) +
        fld('', 'Model Pembelajaran', inp('mpf-model', m.model, 'Contoh: Project Based Learning', 'mpDlModel')) +
      '</div>' +
      acc('mpacc-detail', 'Detail identitas (sekolah, fase, tahun, guru, metode, pendekatan)',
        '<div class="grid-3">' +
          fld('', 'Nama Sekolah', '<input id="mpf-sekolah" class="field" value="' + esc(m.sekolah || MADRASAH.nama) + '" readonly>') +
          fld('', 'Fase', '<select id="mpf-fase" class="field">' + faseOpt + '</select>') +
          fld('', 'Tahun Pelajaran', inp('mpf-ta', m.tahunAjaran || currentTahunAjaran, '2026/2027')) +
          fld('', 'Nama Guru', '<input id="mpf-guru" class="field" value="' + esc(guru) + '"' + (isAdmin() ? '' : ' readonly') + '>') +
          fld('', 'Metode', inp('mpf-metode', m.metode, 'Contoh: Diskusi, Demonstrasi', 'mpDlMetode')) +
          fld('', 'Pendekatan', inp('mpf-pendekatan', m.pendekatan, 'Contoh: Saintifik', 'mpDlPend')) +
        '</div>', false, 'mpbadge-detail') +
      '<datalist id="mpDlModel"><option value="Problem Based Learning"><option value="Project Based Learning"><option value="Discovery Learning"><option value="Inquiry Learning"><option value="Cooperative Learning"></datalist>' +
      '<datalist id="mpDlMetode"><option value="Ceramah"><option value="Diskusi"><option value="Demonstrasi"><option value="Tanya jawab"><option value="Penugasan"><option value="Praktik"></datalist>' +
      '<datalist id="mpDlMateri"></datalist>' +
      '<datalist id="mpDlPend"><option value="Saintifik"><option value="Kontekstual"><option value="Pembelajaran berdiferensiasi"><option value="Tematik"></datalist>' +
      (editingKey ? '' : jadwalBarHtml()) +
      '<div class="mp-rel" id="mpfRel" style="margin:10px 0 8px;"></div>' +
      '<div class="mp-refbar"><button type="button" class="btn btn-primary" data-mp="isiref">🧭 Isi dari kurikulum</button>' +
      '<div class="mp-rel" id="mpfRef" style="margin:0;flex:1;">' + refInfoHtml() + '</div></div>' +
      '<div class="mp-refbar" style="margin-top:6px;"><button type="button" class="btn btn-primary" data-mp="drafauto">✨ Buat draf otomatis</button>' +
      '<div class="mp-rel" style="margin:0;flex:1;">Mengisi bagian yang masih kosong (Pertanyaan Pemantik s.d. Sumber Belajar) dari materi, model, metode, dan TP di atas. Bagian yang sudah Anda isi tidak ditimpa.</div></div>' +
      acc('mpacc-profil', 'Dimensi Profil Lulusan & Panca Cinta',
        '<label class="label">Dimensi Profil Lulusan</label>' + checks('mpf-dpl', DPL, m.dpl || []) +
        '<label class="label" style="margin-top:8px;">Panca Cinta (Kurikulum Berbasis Cinta)</label>' + checks('mpf-panca', PANCA, m.pancaCinta || []),
        false, 'mpbadge-profil') +
      '<div style="text-align:right;margin:6px 0 2px;"><button type="button" class="btn btn-soft mp-btn" data-mp="accall">↕ Buka / tutup semua bagian</button></div>' +
      secs +
      '<div class="mp-actions mp-sticky">' +
        '<button class="btn btn-success" id="mpBtnSimpan" data-mp="simpan">💾 SIMPAN</button>' +
        (editingKey ? '<button class="btn btn-soft" data-mp="dup" data-key="' + esc(editingKey) + '">DUPLIKAT</button>' : '') +
        '<button class="btn btn-soft" data-mp="cetakform">CETAK</button><button class="btn btn-soft" data-mp="pdfform">PDF</button>' +
        (editingKey ? '<button class="btn btn-warning" data-mp="arsip" data-key="' + esc(editingKey) + '">ARSIPKAN</button>' : '') +
        '<button class="btn btn-soft" data-mp="batal">Batal</button></div></div>';
  }
  // Lencana status tiap bagian akordeon ("✓ terisi" / "n dipilih"); dipanggil ulang setiap isi form berubah.
  function refreshAcc() {
    if (!root) return;
    SECTIONS.forEach(function (s) {
      var el = $('mpf-' + s.k), b = $('mpbadge-' + s.k); if (!el || !b) return;
      b.textContent = el.value.trim() ? '✓ terisi' : (s.req ? 'wajib diisi' : 'kosong');
      b.style.color = el.value.trim() ? '#059669' : (s.req ? '#dc2626' : '');
    });
    var bpt = $('mpbadge-aktivitas');
    if (bpt) { var raw = pertCollectRaw(), isi = raw.filter(function (p) { return !pertKosong(p); }).length; bpt.textContent = raw.length + ' pertemuan · ' + isi + ' terisi'; bpt.style.color = isi ? '#059669' : ''; }
    Array.prototype.forEach.call(root.querySelectorAll('#mpfPert .mp-pert'), function (d, i) {
      var raw2 = pertCollectRaw()[i], b = d.querySelector('.mp-pert-b'), t = d.querySelector('.mp-pert-t');
      if (raw2 && b) { b.textContent = pertKosong(raw2) ? 'kosong' : '✓ terisi'; if (t) t.textContent = pertJudul(raw2, i); }
    });
    var n = root.querySelectorAll('.mpf-dpl:checked, .mpf-panca:checked').length, bp = $('mpbadge-profil');
    if (bp) bp.textContent = n ? n + ' dipilih' : 'kosong';
  }
  // Saran materi: label materi dari bank TP (semua mapel) lalu dari bank kisi-kisi resmi (AQH & BA).
  // Hanya saran; guru tetap bebas mengetik.
  function refreshMateriSaran() {
    var dl = $('mpDlMateri'); if (!dl) return;
    var mapel = val('mpf-mapel'), seen = {}, out = [];
    var tambah = function (m) { var t = String(m || '').trim(); if (t && !seen[t]) { seen[t] = 1; out.push(t); } };
    var tp = window.BANK_TP_MI, kr = window.BANK_KISI_RESMI_MI;
    if (tp && tp.mapel) Object.keys(tp.mapel).forEach(function (k) {
      var mp = tp.mapel[k]; if (!mp || mp.nama !== mapel) return;
      Object.keys(mp.tp || {}).forEach(function (f) { (mp.tp[f] || []).forEach(function (t) { tambah(t && t[2]); }); });
    });
    if (kr) Object.keys(kr).forEach(function (k) {
      (kr[k] || []).forEach(function (e) { if (e.mp === mapel) tambah(e.materi); });
    });
    dl.innerHTML = out.map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
  }
  function bindForm() {
    var k = $('mpf-kelas'); if (!k) return;
    var upd = function () {
      var rel = $('mpfRel'); if (!rel) return;
      rel.innerHTML = '<b>Hubungan kelas:</b> ' + relasi({ mapel: val('mpf-mapel') || '(mapel)', kelas: val('mpf-kelas') }, val('mpf-guru'));
    };
    var auto = function () { if (!editingKey) applyRef(true); };
    k.addEventListener('change', function () { var f = faseDari(k.value); if (f && $('mpf-fase')) $('mpf-fase').value = f; upd(); auto(); });
    var mp = $('mpf-mapel'); if (mp) mp.addEventListener('change', function () { upd(); auto(); refreshMateriSaran(); });
    refreshMateriSaran();
    var fs = $('mpf-fase'); if (fs) fs.addEventListener('change', auto);
    upd(); refreshRefInfo();
    // Modul baru: langsung isi dari entri jadwal pertama (guru bisa mengganti pilihannya).
    if (!editingKey) {
      var jo = $('mpfJadwal');
      if (jo && jo.options.length > 1 && !jo.value) { jo.value = jo.options[1].value; isiDariJadwal(jo.value); }
    }
    if (refLoaded && !editingKey) applyRef(true);
    refreshAcc();
  }
  function collect() {
    var o = {
      sekolah: val('mpf-sekolah'), mapel: val('mpf-mapel'), kelas: val('mpf-kelas'), fase: val('mpf-fase'),
      semester: val('mpf-semester'), tahunAjaran: val('mpf-ta'), guru: val('mpf-guru'), materi: val('mpf-materi'),
      alokasi: val('mpf-alokasi'), model: val('mpf-model'), metode: val('mpf-metode'), pendekatan: val('mpf-pendekatan')
    };
    SECTIONS.forEach(function (s) { o[s.k] = val('mpf-' + s.k); });
    var pilih = function (cls) { return Array.prototype.map.call(root.querySelectorAll('.' + cls + ':checked'), function (el) { return el.value; }); };
    o.dpl = pilih('mpf-dpl'); o.pancaCinta = pilih('mpf-panca');
    o.pertemuan = pertCollect();
    o.aktivitas = ratakan(o.pertemuan, 'aktivitas'); o.asesmen = ratakan(o.pertemuan, 'asesmen');
    o.kurikulumVersi = formRef ? (formRef.versi || null) : null;
    o.kurikulumRefKey = formRef ? formRef.key : null;
    o.kurikulumAt = formRef ? (formRef.at || null) : null;
    return o;
  }

  /* ---------- draf otomatis (berbasis template, tanpa AI/server) ----------
     Mengisi bagian yang KOSONG (pemantik s.d. sumber belajar) dari materi, model, metode, alokasi, dan TP.
     Bagian yang sudah diisi/diubah guru TIDAK ditimpa. Bagian hasil draf sebelumnya (lastDraft) boleh diperbarui
     bila tombol ditekan lagi (mis. setelah materi atau model diganti). CP & TP tetap dari Referensi Kurikulum. */
  var lastDraft = {};
  var SINTAKS = [
    { re: /problem|masalah/i, langkah: [
      'Orientasi pada masalah: guru menyajikan masalah kontekstual tentang {materi}.',
      'Mengorganisasikan peserta didik: membentuk kelompok dan membagi tugas penyelidikan.',
      'Membimbing penyelidikan: kelompok mengumpulkan informasi dan mencoba memecahkan masalah.',
      'Mengembangkan dan menyajikan hasil: kelompok mempresentasikan penyelesaiannya.',
      'Menganalisis dan mengevaluasi proses pemecahan masalah bersama guru.'] },
    { re: /project|proyek/i, langkah: [
      'Penentuan pertanyaan mendasar: guru mengajukan pertanyaan yang mengarahkan proyek tentang {materi}.',
      'Mendesain perencanaan proyek: peserta didik menyusun rencana dan membagi peran dalam kelompok.',
      'Menyusun jadwal: kelompok menentukan langkah kerja dan waktu penyelesaian.',
      'Memonitor pelaksanaan: guru mendampingi dan memantau kemajuan proyek.',
      'Menguji hasil dan mempresentasikan produk proyek.',
      'Evaluasi pengalaman: guru dan peserta didik merefleksikan proses serta hasil proyek.'] },
    { re: /discovery|penemuan/i, langkah: [
      'Stimulasi: guru menampilkan contoh atau situasi yang memancing rasa ingin tahu tentang {materi}.',
      'Identifikasi masalah: peserta didik merumuskan hal yang ingin ditemukan.',
      'Pengumpulan data: peserta didik mengamati, membaca, atau mencoba untuk mengumpulkan informasi.',
      'Pengolahan data: peserta didik menganalisis dan menafsirkan data yang diperoleh.',
      'Pembuktian: peserta didik memeriksa kebenaran temuannya bersama teman dan guru.',
      'Generalisasi: peserta didik menarik kesimpulan dari hasil temuan.'] },
    { re: /inquiry|inkuiri/i, langkah: [
      'Orientasi: guru menyiapkan suasana belajar dan menyampaikan topik {materi}.',
      'Merumuskan masalah: peserta didik menyusun pertanyaan yang akan diselidiki.',
      'Mengajukan hipotesis: peserta didik membuat dugaan sementara.',
      'Mengumpulkan data untuk menguji dugaan tersebut.',
      'Menguji hipotesis: peserta didik membandingkan data dengan dugaan awal.',
      'Merumuskan kesimpulan bersama.'] },
    { re: /cooperative|kooperatif/i, langkah: [
      'Guru menyampaikan tujuan pembelajaran dan memotivasi peserta didik.',
      'Guru menyajikan informasi pokok tentang {materi}.',
      'Peserta didik dibagi ke dalam kelompok belajar yang heterogen.',
      'Guru membimbing kelompok saat bekerja dan belajar bersama.',
      'Kelompok mempresentasikan hasil kerja dan guru memberi penguatan.',
      'Guru memberi penghargaan atas hasil belajar individu dan kelompok.'] }
  ];
  var SINTAKS_UMUM = [
    'Mengamati: peserta didik mengamati gambar, benda, atau contoh yang berkaitan dengan {materi}.',
    'Menanya: peserta didik mengajukan pertanyaan tentang hal yang diamati.',
    'Mengumpulkan informasi: peserta didik mencoba, membaca, atau berdiskusi untuk menjawab pertanyaan.',
    'Menalar: peserta didik mengolah informasi dan menghubungkannya dengan pengetahuan sebelumnya.',
    'Mengomunikasikan: peserta didik menyampaikan hasil secara lisan atau tertulis, guru memberi penguatan.'
  ];
  // "2 × 35 menit" -> 70 ; "70 menit" -> 70 ; selain itu 0 (waktu per tahap dilewati).
  function menitTotal(alokasi) {
    var s = String(alokasi || ''), m = s.match(/(\d+)\s*[x×*]\s*(\d+)/i);
    if (m) return parseInt(m[1], 10) * parseInt(m[2], 10);
    m = s.match(/(\d+)\s*menit/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  function daftarBaris(t) {
    return String(t || '').split('\n').map(function (x) { return x.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
  }
  function bernomor(arr) { return arr.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'); }
  function bullets(arr) { return arr.map(function (x) { return '- ' + x; }).join('\n'); }

  function susunDraf(c) {
    var M = c.materi, tp = c.tp || [], out = {};
    var mnt = menitTotal(c.alokasi), pen = 0, tut = 0, inti = 0;
    if (mnt >= 20) { pen = Math.max(5, Math.round(mnt * 0.15 / 5) * 5); tut = pen; inti = mnt - pen - tut; }
    var wkt = function (n) { return n > 0 ? ' (' + n + ' menit)' : ''; };
    var sx = null;
    SINTAKS.forEach(function (s) { if (!sx && s.re.test(c.model || '')) sx = s; });
    var langkah = (sx ? sx.langkah : SINTAKS_UMUM).map(function (x) { return x.replace(/\{materi\}/g, M); });

    out.pemantik = bernomor([
      'Pernahkah kamu melihat atau mengalami hal yang berkaitan dengan ' + M + '? Ceritakan!',
      'Menurutmu, mengapa ' + M + ' penting untuk dipelajari?',
      'Apa yang ingin kamu ketahui lebih dalam tentang ' + M + '?'
    ]);

    out.materiIsi = 'Materi pokok: ' + M + ' (' + c.mapel + ', Kelas ' + c.kelas + (c.fase ? ', Fase ' + c.fase : '') + ').\n\n' +
      (tp.length ? 'Uraian materi diarahkan agar peserta didik mencapai:\n' + bullets(tp) + '\n\n' : '') +
      'Cakupan (lengkapi dari buku pegangan):\n' +
      bullets(['Pengertian dan konsep utama ' + M, 'Contoh dalam kehidupan sehari-hari', 'Hal penting yang perlu diingat peserta didik']);

    var info = [];
    if (c.alokasi) info.push('Alokasi waktu: ' + c.alokasi);
    if (c.model) info.push('Model: ' + c.model);
    if (c.metode) info.push('Metode: ' + c.metode);
    if (c.pendekatan) info.push('Pendekatan: ' + c.pendekatan);
    out.aktivitas = (info.length ? info.join(' | ') + '\n\n' : '') +
      'A. Pendahuluan' + wkt(pen) + '\n' + bernomor([
        'Guru membuka pembelajaran dengan salam, doa bersama, dan mengecek kehadiran serta kesiapan peserta didik.',
        'Guru menyampaikan tujuan pembelajaran dan manfaat mempelajari ' + M + '.',
        'Guru mengajukan pertanyaan pemantik dan mengaitkannya dengan pengalaman peserta didik.'
      ]) + '\n\n' +
      'B. Kegiatan Inti' + wkt(inti) + '\n' + bernomor(langkah) + '\n\n' +
      'C. Penutup' + wkt(tut) + '\n' + bernomor([
        'Peserta didik bersama guru menyimpulkan materi ' + M + '.',
        'Guru dan peserta didik melakukan refleksi pembelajaran.',
        'Guru menyampaikan tindak lanjut dan rencana pembelajaran berikutnya.',
        'Pembelajaran ditutup dengan doa dan salam.'
      ]);

    out.kokurikuler = 'Penguatan karakter yang dikaitkan dengan ' + M + ':\n' +
      bullets([
        'Dimensi Profil Lulusan: ' + (c.dpl.length ? c.dpl.join(', ') : '(pilih pada bagian Dimensi Profil Lulusan)'),
        'Panca Cinta: ' + (c.panca.length ? c.panca.join(', ') : '(pilih pada bagian Panca Cinta)'),
        'Pembiasaan: berdoa bersama, bekerja sama dalam kelompok, saling menghargai pendapat, dan menjaga kebersihan kelas'
      ]);

    out.lkpd = 'LKPD: ' + M + '\nNama: ____________  Kelas: ' + c.kelas + '  Kelompok: ______\n\n' +
      'Petunjuk:\n' + bernomor(['Berdoalah sebelum mengerjakan.', 'Bacalah setiap kegiatan dengan teliti.', 'Kerjakan bersama kelompokmu dan tanyakan kepada guru jika ada yang belum jelas.']) + '\n\n' +
      'Kegiatan 1: Amati/kerjakan tugas yang diberikan guru tentang ' + M + ', lalu tuliskan hasilnya.\n' +
      'Kegiatan 2: Jawablah pertanyaan berikut.\n' +
      (tp.length ? tp.map(function (x, i) { return 'Soal ' + (i + 1) + ': (buat pertanyaan untuk tujuan: ' + x + ')'; }).join('\n')
                 : 'Soal 1: (tuliskan pertanyaan sesuai tujuan pembelajaran)');

    out.media = bullets(['Papan tulis dan spidol', 'Gambar, poster, atau slide tentang ' + M, 'Video pendek atau benda nyata yang berkaitan (jika tersedia)', 'Lembar Kerja Peserta Didik (LKPD)', 'Buku pegangan ' + c.mapel + ' Kelas ' + c.kelas]);

    out.asesmen = '1. Asesmen diagnostik: tanya jawab lisan di awal untuk memetakan pengetahuan awal peserta didik.\n' +
      '2. Asesmen formatif: observasi keaktifan dan kerja sama, penilaian LKPD, dan tanya jawab selama pembelajaran.\n' +
      '3. Asesmen sumatif: tes tertulis/lisan atau unjuk kerja pada akhir materi.\n\n' +
      'Indikator ketercapaian:\n' + (tp.length ? bullets(tp) : '- Sesuaikan dengan tujuan pembelajaran') + '\n\n' +
      'Rubrik (contoh):\n' +
      '4 - Sangat baik: memenuhi seluruh indikator dengan tepat dan mandiri\n' +
      '3 - Baik: memenuhi sebagian besar indikator dengan sedikit bantuan\n' +
      '2 - Cukup: memenuhi sebagian indikator dengan bimbingan\n' +
      '1 - Perlu bimbingan: belum memenuhi indikator';

    out.tugas = 'Tugas individu: merangkum pokok-pokok ' + M + ' dengan kata-kata sendiri.\n' +
      'Tugas rumah: mencari contoh ' + M + ' di lingkungan sekitar dan menceritakannya pada pertemuan berikutnya.';

    out.refleksi = 'Refleksi guru:\n' +
      bullets(['Apakah tujuan pembelajaran tercapai?', 'Bagian mana yang berjalan baik dan bagian mana yang perlu diperbaiki?', 'Peserta didik mana yang perlu pendampingan lebih?']) + '\n\n' +
      'Refleksi peserta didik:\n' +
      bullets(['Hal baru yang kupelajari hari ini adalah ...', 'Bagian yang masih sulit bagiku adalah ...', 'Aku ingin belajar lebih lanjut tentang ...']);

    out.pengayaan = 'Untuk peserta didik yang sudah mencapai tujuan pembelajaran:\n' +
      bullets(['Mengerjakan soal atau tugas tingkat lanjut tentang ' + M, 'Menjadi tutor sebaya bagi teman yang membutuhkan', 'Membuat karya sederhana (poster/cerita/ringkasan) tentang ' + M]);

    out.remedial = 'Untuk peserta didik yang belum mencapai tujuan pembelajaran:\n' +
      bullets(['Penjelasan ulang dengan media atau contoh yang lebih sederhana', 'Bimbingan dalam kelompok kecil atau tutor sebaya', 'Latihan tambahan yang bertahap', 'Asesmen ulang setelah pendampingan']);

    out.sumber = bullets(['Buku teks ' + c.mapel + ' Kelas ' + c.kelas + ' yang digunakan madrasah', 'Lingkungan sekitar madrasah dan pengalaman peserta didik', 'Sumber daring yang sesuai usia (tulis tautannya di sini)']);
    return out;
  }

  // Draf per pertemuan: langkah inti sintaks model dibagi rata ke semua pertemuan, TP dibagi sebagai tujuan tiap pertemuan.
  function susunPertemuan(c, n) {
    var M = c.materi, tp = c.tp || [], mnt = menitTotal(c.alokasi), pen = 0, tut = 0, inti = 0;
    if (mnt >= 20) { pen = Math.max(5, Math.round(mnt * 0.15 / 5) * 5); tut = pen; inti = mnt - pen - tut; }
    var wkt = function (x) { return x > 0 ? ' (' + x + ' menit)' : ''; };
    var sx = null;
    SINTAKS.forEach(function (s) { if (!sx && s.re.test(c.model || '')) sx = s; });
    var langkah = (sx ? sx.langkah : SINTAKS_UMUM).map(function (x) { return x.replace(/\{materi\}/g, M); });
    var L = langkah.length, res = [];
    var info = [];
    if (c.model) info.push('Model: ' + c.model);
    if (c.metode) info.push('Metode: ' + c.metode);
    if (c.pendekatan) info.push('Pendekatan: ' + c.pendekatan);
    for (var i = 0; i < n; i++) {
      var awal = Math.floor(i * L / n), akhir = Math.floor((i + 1) * L / n), pertama = i === 0, terakhir = i === n - 1;
      var langkahI = langkah.slice(awal, akhir);
      if (!langkahI.length) langkahI = ['Peserta didik melanjutkan dan mendalami kegiatan tentang ' + M + ' dengan bimbingan guru.'];
      var a = Math.floor(i * tp.length / n), b = Math.floor((i + 1) * tp.length / n), tpI = tp.slice(a, b);
      if (!tpI.length && tp.length) tpI = [tp[Math.min(i, tp.length - 1)]];
      var judul = n === 1 ? M : (pertama ? 'Pengenalan ' : (terakhir ? 'Penerapan dan penilaian ' : 'Pendalaman ')) + M;
      var buka = ['Guru membuka pembelajaran dengan salam, doa bersama, dan mengecek kehadiran serta kesiapan peserta didik.',
        pertama ? 'Guru menyampaikan tujuan pembelajaran dan manfaat mempelajari ' + M + '.' : 'Guru mengulas materi pertemuan sebelumnya dan menyampaikan tujuan pertemuan hari ini.',
        'Guru mengajukan pertanyaan pemantik dan mengaitkannya dengan pengalaman peserta didik.'];
      var tutup = [terakhir ? 'Peserta didik bersama guru menyimpulkan seluruh materi ' + M + '.' : 'Peserta didik bersama guru menyimpulkan kegiatan hari ini.',
        'Guru dan peserta didik melakukan refleksi pembelajaran.',
        terakhir ? 'Guru menyampaikan tindak lanjut pembelajaran.' : 'Guru menyampaikan rencana pembelajaran pertemuan berikutnya.',
        'Pembelajaran ditutup dengan doa dan salam.'];
      var ases = [];
      if (pertama) ases.push('Asesmen diagnostik: tanya jawab lisan di awal untuk memetakan pengetahuan awal peserta didik.');
      ases.push('Asesmen formatif: observasi keaktifan dan kerja sama, penilaian LKPD, dan tanya jawab selama pembelajaran.');
      var asesTeks = bernomor(ases);
      if (terakhir) asesTeks += '\n' + (ases.length + 1) + '. Asesmen sumatif: tes tertulis/lisan atau unjuk kerja pada akhir materi.\n\n' +
        'Indikator ketercapaian:\n' + (tp.length ? bullets(tp) : '- Sesuaikan dengan tujuan pembelajaran') + '\n\n' +
        'Rubrik (contoh):\n4 - Sangat baik: memenuhi seluruh indikator dengan tepat dan mandiri\n3 - Baik: memenuhi sebagian besar indikator dengan sedikit bantuan\n' +
        '2 - Cukup: memenuhi sebagian indikator dengan bimbingan\n1 - Perlu bimbingan: belum memenuhi indikator';
      res.push({
        topik: judul, tujuan: tpI.length ? bullets(tpI) : '',
        aktivitas: (pertama && info.length ? info.join(' | ') + '\n\n' : '') + 'A. Pendahuluan' + wkt(pen) + '\n' + bernomor(buka) + '\n\n' +
          'B. Kegiatan Inti' + wkt(inti) + '\n' + bernomor(langkahI) + '\n\nC. Penutup' + wkt(tut) + '\n' + bernomor(tutup),
        asesmen: asesTeks
      });
    }
    return res;
  }
  function buatDraf() {
    if (!canCreate()) return toast('Tidak diizinkan!', true);
    var pilih = function (cls) { return Array.prototype.map.call(root.querySelectorAll('.' + cls + ':checked'), function (el) { return el.value; }); };
    var c = {
      mapel: val('mpf-mapel'), kelas: val('mpf-kelas'), fase: val('mpf-fase'), materi: val('mpf-materi'),
      alokasi: val('mpf-alokasi'), model: val('mpf-model'), metode: val('mpf-metode'), pendekatan: val('mpf-pendekatan'),
      tp: daftarBaris(val('mpf-tujuan')), dpl: pilih('mpf-dpl'), panca: pilih('mpf-panca')
    };
    if (!c.mapel || !c.materi) return toast('Isi Mata Pelajaran dan Materi terlebih dahulu.', true);
    var out = susunDraf(c), isi = 0, lewat = 0;
    SECTIONS.forEach(function (s) {
      var el = $('mpf-' + s.k), teks = out[s.k] && out[s.k].trim();
      if (!el || !teks) return;   // cp & tujuan tidak dibuat di sini (dari Referensi Kurikulum / guru)
      var cur = el.value.trim();
      if (cur && cur !== lastDraft[s.k]) { lewat++; return; }
      el.value = teks; lastDraft[s.k] = teks;
      el.rows = Math.min(14, Math.max(3, teks.split('\n').length + 1));
      isi++;
    });
    refreshAcc();
    // Daftar pertemuan: isi topik, tujuan, aktivitas, dan asesmen tiap pertemuan yang masih kosong (atau hasil draf sebelumnya).
    var rows = pertCollectRaw(), dp = susunPertemuan(c, rows.length), pIsi = 0;
    rows.forEach(function (r, i) {
      ['topik', 'tujuan', 'aktivitas', 'asesmen'].forEach(function (f) {
        var lk = 'p' + i + f, cur = r[f].trim(), t = dp[i][f]; if (!t) return;
        if (cur && cur !== lastDraft[lk]) { lewat++; return; }
        r[f] = t; lastDraft[lk] = t; pIsi++;
      });
      if (!r.alokasi && c.alokasi) r.alokasi = c.alokasi;
    });
    if (pIsi) { var buka = 0; Array.prototype.forEach.call(root.querySelectorAll('#mpfPert .mp-pert'), function (d, i) { if (d.open) buka = i; }); pertRender(rows, buka); }
    isi += pIsi ? 1 : 0;
    if (!isi) return toast('Semua bagian sudah Anda isi, jadi draf tidak mengubah apa pun.', false, 4000);
    toast('✨ Draf dibuat: ' + isi + ' bagian terisi' + (lewat ? ', ' + lewat + ' bagian yang sudah Anda isi tidak diubah' : '') +
      '.' + (c.tp.length ? '' : ' Tujuan Pembelajaran masih kosong, isi dahulu agar draf lebih sesuai.') + ' Periksa dan sesuaikan.', false, 6000);
  }

  /* ---------- aksi ---------- */
  function openForm(key) {
    editingKey = key || null;
    var m = key ? byKey(key) : null;
    formRef = (m && m.kurikulumRefKey) ? { key: m.kurikulumRefKey, versi: m.kurikulumVersi, at: m.kurikulumAt } : null;
    lastFill = { cp: '', tp: '' }; lastDraft = {}; pertSaran = PERT_DEFAULT;
    tab = 'buat'; render(); loadRef(false); window.scrollTo(0, 0);
  }
  function showTab(id) {
    if (id === 'buat' && tab !== 'buat') { editingKey = null; formRef = null; lastFill = { cp: '', tp: '' }; lastDraft = {}; pertSaran = PERT_DEFAULT; }
    if (id !== 'referensi') { refMode = 'list'; refEditKey = null; refParsed = null; }
    tab = id; render();
    if (id === 'buat' || id === 'referensi') loadRef(false);
  }
  function simpan() {
    if (!canCreate()) return toast('Tidak diizinkan!', true);
    if (isBusy('simpanModul')) return toast('Sedang menyimpan…', false, 1500);
    if (!isReallyOnline()) return toast('Perlu koneksi internet untuk menyimpan.', true);
    var o = collect(), lama = editingKey ? byKey(editingKey) : null;
    if (lama && !canEdit(lama)) return toast('Anda tidak bisa mengubah modul milik guru lain.', true);
    if (lama && pers(lama) === 'diajukan') return toast('Modul sedang menunggu persetujuan dan dikunci. Tunggu hasil tinjauan.', true);
    if (!o.mapel || !o.kelas || !o.materi || !o.tujuan) return toast('Mata pelajaran, kelas, materi, dan tujuan pembelajaran wajib diisi!', true);
    if (kelasBoleh().indexOf(o.kelas) === -1) return toast('Anda hanya bisa membuat modul untuk kelas yang Anda ampu!', true);
    var now = new Date().toISOString(), btn = $('mpBtnSimpan');
    var ref = lama ? db.ref('modul_ajar/' + lama.key) : db.ref('modul_ajar').push();
    var norm = function (v) { return Array.isArray(v) ? v.join('|') : String(v == null ? '' : v); };
    var berubah = !!lama && Object.keys(o).some(function (k) {
      return k === 'pertemuan' ? normPert(o.pertemuan) !== normPert(getPert(lama)) : norm(o[k]) !== norm(lama[k]);
    });
    var kembaliDraf = !!lama && pers(lama) === 'disetujui' && berubah;
    var full = Object.assign({}, lama || {}, o, kembaliDraf ? { persetujuanOleh: null, persetujuanRole: null, persetujuanAt: null, catatanKepsek: null } : {}, {
      persetujuan: kembaliDraf ? 'draf' : (lama ? pers(lama) : 'draf'),
      status: lama ? (lama.status || 'aktif') : 'aktif', favorit: lama ? !!lama.favorit : false,
      ownerName: lama ? lama.ownerName : currentUser.name, ownerKey: lama ? (lama.ownerKey || '') : (currentUser.key || ''),
      createdAt: lama ? (lama.createdAt || now) : now, updatedAt: now
    });
    delete full.key;
    setBusy('simpanModul', btn);
    var selesaiSimpan = function (err) {
      clearBusy('simpanModul', btn);
      if (err) return toast('Gagal: ' + err.message, true);
      full.key = ref.key;
      if (lama) Object.assign(lama, full); else data.unshift(full);
      sortData();
      toast(kembaliDraf ? '✅ Modul disimpan. Status kembali ke Draf, ajukan ulang untuk persetujuan.' : '✅ Modul disimpan!', false, kembaliDraf ? 5000 : undefined); addLog(lama ? 'ubah_modul_ajar' : 'buat_modul_ajar', judulModul(full));
      editingKey = null; tab = 'daftar'; render();
    };
    if (!lama) { ref.set(full, selesaiSimpan); return; }
    // Edit: ref.set() menimpa SELURUH node memakai salinan lokal yang bisa basi. Contoh: modul sudah diajukan/disetujui
    // dari perangkat lain, lalu perangkat ini (cache lama: masih "draf") menyimpan -> status persetujuan ikut kembali ke
    // "draf" tanpa sepengetahuan Kepala Madrasah. Transaction membatalkan simpan kalau status di server sudah berbeda.
    var statusLokal = pers(lama);
    ref.transaction(function (cur) {
      if (cur === null) return full;   // belum ada cache lokal: server akan mengulang dengan data aslinya
      var st = PERS[cur.persetujuan] ? cur.persetujuan : 'draf';
      if (st !== statusLokal) return;  // status sudah berubah di server: batalkan
      return full;
    }, function (err, committed) {
      if (!err && !committed) {
        clearBusy('simpanModul', btn);
        toast('⚠️ Status modul sudah berubah di server (mis. sudah diajukan/dinilai), perubahan Anda belum disimpan. Memuat ulang…', true, 6000);
        return load(true, function () { editingKey = null; tab = 'daftar'; render(); });
      }
      selesaiSimpan(err);
    }, false);
  }
  function duplikat(key) {
    var m = byKey(key); if (!m || !canCreate()) return;
    if (!isReallyOnline()) return toast('Perlu koneksi internet.', true);
    if (isBusy('dupModul')) return toast('Sedang menduplikat…', false, 1500);
    setBusy('dupModul');
    var now = new Date().toISOString(), ref = db.ref('modul_ajar').push();
    var salin = Object.assign({}, m, { materi: (m.materi || '') + ' (Salinan)', status: 'aktif', favorit: false,
      persetujuan: 'draf', persetujuanOleh: null, persetujuanRole: null, persetujuanAt: null, diajukanAt: null, catatanKepsek: null,
      pertemuan: pertSaved(m).map(function (p) { return Object.assign({}, p, { tanggal: '' }); }),
      ownerName: currentUser.name, ownerKey: currentUser.key || '', createdAt: now, updatedAt: now });
    delete salin.key;
    ref.set(salin, function (err) {
      clearBusy('dupModul');
      if (err) return toast('Gagal: ' + err.message, true);
      salin.key = ref.key; data.unshift(salin);
      toast('📄 Modul diduplikat. Silakan sesuaikan isinya.'); addLog('duplikat_modul_ajar', judulModul(m));
      openForm(ref.key);
    });
  }
  function goto(page, selId, kelas) {
    var sel = $(selId);
    if (sel && Array.prototype.some.call(sel.options, function (o) { return o.value === kelas; })) sel.value = kelas;
    navigateTo(page);
  }

  /* ---------- cetak / PDF ---------- */
  // Blok pengesahan: hanya terisi bila modul berstatus disetujui (nama penyetuju + tanggal, tanda tangan digital bila ada).
  function ttdHtml(m) {
    if (pers(m) !== 'disetujui') return '<br><br><br><b>' + esc(kepalaNama || '………………………') + '</b>';
    var img = '';
    try { var b64 = (typeof MADRASAH !== 'undefined') ? (MADRASAH.ttdKepalaBase64 || '') : ''; if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(b64)) img = '<img src="' + b64 + '" alt="" style="height:56px;max-width:160px;object-fit:contain;">'; } catch (e) {}
    return '<div style="font-size:11px;color:#065f46;">Disetujui ' + esc(tglIso(m.persetujuanAt)) + '</div>' + (img || '<br><br><br>') + '<b>' + esc(m.persetujuanOleh || '') + '</b>';
  }
  function docHtml(m) {
    var dpl = m.dpl || [], pc = m.pancaCinta || [];
    var rows = [['Nama Sekolah', m.sekolah || MADRASAH.nama], ['Mata Pelajaran', m.mapel], ['Kelas / Fase', (m.kelas || '-') + (m.fase ? ' / Fase ' + m.fase : '')],
      ['Semester', m.semester], ['Tahun Pelajaran', m.tahunAjaran], ['Nama Guru', m.guru], ['Materi', m.materi], ['Alokasi Waktu', m.alokasi],
      ['Model Pembelajaran', m.model], ['Metode', m.metode], ['Pendekatan', m.pendekatan], ['Kurikulum', m.kurikulumVersi], ['Peserta Didik', jumlahSiswa(m.kelas) + ' siswa']]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return '<tr><td class="k">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('');
    var adaPert = pertSaved(m).length > 0;
    var body = SECTIONS.filter(function (s) { return adaPert ? (s.k === 'aktivitas' || (s.k !== 'asesmen' && m[s.k])) : m[s.k]; }).map(function (s, i) {
      if (adaPert && s.k === 'aktivitas') return pertDocHtml(m, i + 2);
      return '<h3>' + (i + 2) + '. ' + esc(s.t) + '</h3><div class="b">' + nl2br(m[s.k]) + '</div>';
    }).join('');
    return '<div class="kop"><img src="logo/logo-lembaga.png" alt="" onerror="this.style.display=\'none\'"><div><div class="n">' + esc(MADRASAH.nama) + '</div>' +
      '<div class="a">' + esc(MADRASAH.alamat || '') + '</div></div></div><h2>MODUL PEMBELAJARAN</h2>' +
      '<h3>1. Identitas</h3><table>' + rows + '</table>' +
      (dpl.length ? '<h3>Dimensi Profil Lulusan</h3><div class="b">' + esc(dpl.join(', ')) + '</div>' : '') +
      (pc.length ? '<h3>Panca Cinta</h3><div class="b">' + esc(pc.join(', ')) + '</div>' : '') + body +
      '<div class="ttd"><div>Mengetahui,<br>Kepala Madrasah<br>' + ttdHtml(m) + '</div><div>Guru Mata Pelajaran<br><br><br><br><b>' + esc(m.guru || '') + '</b></div></div>';
  }
  function cetak(m, pdf) {
    var w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return toast('Popup diblokir browser.', true);
    var css = 'body{font-family:Arial,sans-serif;padding:30px;color:#111;line-height:1.5;font-size:13px}h2{text-align:center;margin:14px 0}h3{margin:16px 0 4px;font-size:14px}' +
      'table{width:100%;border-collapse:collapse}td{border:1px solid #999;padding:5px 8px;vertical-align:top}td.k{width:32%;background:#f3f4f6;font-weight:600}' +
      '.kop{display:flex;align-items:center;gap:14px;border-bottom:3px double #333;padding-bottom:10px}.kop img{width:64px;height:64px;object-fit:contain}.kop .n{font-weight:700;font-size:16px}.kop .a{font-size:12px}' +
      '.b{border:1px solid #ddd;border-radius:6px;padding:8px 10px;white-space:normal}.ttd{display:flex;justify-content:space-between;margin-top:36px;text-align:center}' +
      '.tip{background:#fef3c7;border:1px solid #f59e0b;padding:8px 12px;border-radius:8px;margin-bottom:12px}@media print{.tip{display:none}}';
    var tip = pdf ? '<div class="tip">Untuk menyimpan sebagai PDF: pada dialog cetak, pilih tujuan <b>Simpan sebagai PDF</b>.</div>' : '';
    w.document.write('<html><head><base href="' + esc(document.baseURI) + '"><title>Modul ' + esc(judulModul(m)) + '</title><style>' + css + '</style></head><body>' + tip + docHtml(m) + '</body></html>');
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 400);
  }

  /* ---------- event ---------- */
  var Q_DELAY = 200, qTimer = null;
  function onInput(e) {
    var id = e.target && e.target.id;
    if (id === 'mpfJadwal') { isiDariJadwal(e.target.value); return; }
    if (e.target && e.target.classList && Array.prototype.some.call(e.target.classList, function (c) { return c.indexOf('mpp-') === 0; })) { refreshAcc(); return; }
    if (id === 'mpf-guru') { refreshJadwalOpsi(); }
    if (id && id.indexOf('mpf-') === 0) { refreshAcc(); return; }
    if (e.target && e.target.classList && (e.target.classList.contains('mpf-dpl') || e.target.classList.contains('mpf-panca'))) { refreshAcc(); return; }
    if (id === 'mpQ') {
      // filt.q langsung diperbarui; hanya render daftar yang ditunda agar tidak berat saat mengetik.
      filt.q = e.target.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { qTimer = null; renderList(); }, Q_DELAY);
      return;
    }
    if (id === 'mpFPers') filt.pers = e.target.value;
    else if (id === 'mpFMapel') filt.mapel = e.target.value;
    else if (id === 'mpFKelas') filt.kelas = e.target.value;
    else if (id === 'mpFSem') filt.semester = e.target.value;
    else return;
    clearTimeout(qTimer); qTimer = null;
    renderList();
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-mp]'); if (!b || !root.contains(b)) return;
    var act = b.getAttribute('data-mp'), key = b.getAttribute('data-key'), m = key ? byKey(key) : null;
    switch (act) {
      case 'tab': showTab(b.dataset.tab); break;
      case 'komp': komp = b.dataset.k; renderBody(); break;
      case 'reload': load(true); break;
      case 'baru': openForm(null); break;
      case 'edit':
        if (m && pers(m) === 'diajukan') { toast('Modul sedang menunggu persetujuan dan dikunci.', true); break; }
        if (m && canEdit(m)) openForm(key); break;
      case 'ajukan': case 'setujui': case 'tolak': aksiPersetujuan(act, key, b); break;
      case 'pertadd': {
        var rA = pertCollectRaw(); if (rA.length >= PERT_MAX) { toast('Maksimal ' + PERT_MAX + ' pertemuan per modul.', true); break; }
        rA.push(fixPert({ alokasi: val('mpf-alokasi') })); pertRender(rA, rA.length - 1); break;
      }
      case 'pertdup': {
        var rD = pertCollectRaw(), iD = parseInt(b.dataset.i, 10); if (!rD[iD]) break;
        if (rD.length >= PERT_MAX) { toast('Maksimal ' + PERT_MAX + ' pertemuan per modul.', true); break; }
        rD.splice(iD + 1, 0, fixPert(Object.assign({}, rD[iD], { tanggal: '' }))); pertRender(rD, iD + 1); break;
      }
      case 'pertdel': {
        var rX = pertCollectRaw(), iX = parseInt(b.dataset.i, 10);
        if (!rX[iX]) break;
        if (!pertKosong(rX[iX]) && !confirm('Hapus Pertemuan ' + (iX + 1) + ' beserta isinya?')) break;
        rX.splice(iX, 1); pertRender(rX, Math.max(0, iX - 1)); break;
      }
      case 'pertsaran': {
        var rS = pertCollectRaw(), hasil = pertSesuaikan(rS, pertSaran);
        if (hasil.length > pertSaran) toast('Pertemuan yang sudah berisi tidak dihapus otomatis; hapus manual bila perlu.', false, 4000);
        pertRender(hasil); break;
      }
      case 'antrean': filt.pers = 'diajukan'; renderBody(); break;
      case 'dup': duplikat(key); break;
      case 'simpan': simpan(); break;
      case 'batal': editingKey = null; tab = 'daftar'; render(); break;
      case 'fav': if (m && canEdit(m)) write(key, { favorit: !m.favorit, updatedAt: new Date().toISOString() }, m.favorit ? 'Dihapus dari favorit' : '⭐ Ditambahkan ke favorit', renderList); break;
      case 'arsip': if (m && canEdit(m)) write(key, { status: 'arsip', updatedAt: new Date().toISOString() }, '🗄️ Modul diarsipkan', function () { editingKey = null; if (tab === 'buat') tab = 'daftar'; render(); }); break;
      case 'pulih': if (m && canEdit(m)) write(key, { status: 'aktif', updatedAt: new Date().toISOString() }, '♻️ Modul dipulihkan', renderList); break;
      case 'hapus':
        if (m && canEdit(m)) {
          if (!isReallyOnline()) { toast('Perlu koneksi internet untuk menghapus.', true); break; }
          if (isBusy('hapusModul')) break;
          if (!doubleConfirm('Hapus modul ini secara permanen?')) break;
          setBusy('hapusModul');
          db.ref('modul_ajar/' + key).remove(function (err) {
            clearBusy('hapusModul');
            if (err) return toast('Gagal: ' + err.message, true);
            data = data.filter(function (x) { return x.key !== key; }); addLog('hapus_modul_ajar', judulModul(m)); toast('Modul dihapus'); renderList();
          });
        } break;
      case 'cetak': if (m) cetak(m, false); break;
      case 'pdf': if (m) cetak(m, true); break;
      case 'cetakform': case 'pdfform':
        var o = collect(); if (!o.mapel && !o.materi) return toast('Isi modul terlebih dahulu.', true);
        cetak(o, act === 'pdfform'); break;
      case 'accall':
        var accs = root.querySelectorAll('details.mp-acc'), adaTutup = Array.prototype.some.call(accs, function (d) { return !d.open; });
        Array.prototype.forEach.call(accs, function (d) { d.open = adaTutup; }); break;
      case 'isiref': applyRef(false); break;
      case 'drafauto': buatDraf(); break;
      case 'refbaru': refMode = 'form'; refEditKey = null; renderBody(); break;
      case 'kepalanama': aturKepalaNama(); break;
      case 'refedit': if (isAdmin() && refByKey(key)) { refMode = 'form'; refEditKey = key; renderBody(); } break;
      case 'refsimpan': refSimpan(b); break;
      case 'refbatal': refMode = 'list'; refEditKey = null; refParsed = null; refPaste = ''; renderBody(); break;
      case 'refreload': refLoaded = false; loadRef(true); renderBody(); break;
      case 'refimpor': refMode = 'impor'; refParsed = null; refPaste = ''; renderBody(); break;
      case 'refimporcek': refPaste = ($('mpr-paste') || {}).value || ''; refParsed = parseImpor(refPaste); renderBody(); break;
      case 'refimporsimpan': refImporSimpan(b); break;
      case 'refhapus':
        if (isAdmin() && refByKey(key)) {
          if (!isReallyOnline()) { toast('Perlu koneksi internet untuk menghapus.', true); break; }
          if (isBusy('hapusRefKur')) break;
          if (!doubleConfirm('Hapus referensi kurikulum ini?')) break;
          setBusy('hapusRefKur');
          db.ref('kurikulum_ref/' + key).remove(function (err) {
            clearBusy('hapusRefKur');
            if (err) return toast('Gagal: ' + err.message, true);
            refs = refs.filter(function (x) { return x.key !== key; }); addLog('hapus_referensi_kurikulum', key); toast('Referensi dihapus'); renderBody();
          });
        } break;
      case 'goabsen': if (m) goto('attendance', 'attendanceClassFilter', m.kelas); break;
      case 'gonilai': if (m) goto('grades', 'gradesClassFilter', m.kelas); break;
    }
  }

  /* ---------- pasang ke navigasi ---------- */
  // Dipanggil app.js saat logout / ganti pengguna: kosongkan semua state modul (data, referensi, draf form, filter,
  // tab) supaya pengguna berikutnya tidak melihat data milik sesi sebelumnya. Aman dipanggil berulang kali.
  function resetState() {
    gen++; // batalkan load yang masih berjalan
    clearTimeout(qTimer); qTimer = null;
    data = []; loaded = false; loading = false; loadErr = '';
    refs = []; refLoaded = false; refLoading = false; refErr = '';
    refMode = 'list'; refEditKey = null; refParsed = null; refPaste = '';
    formRef = null; lastFill = { cp: '', tp: '' }; lastDraft = {}; pertSaran = PERT_DEFAULT;
    tab = 'daftar'; editingKey = null; komp = 'materiIsi';
    filt = { q: '', mapel: '', kelas: '', semester: '', pers: '' };
    if (root) root.innerHTML = '';
  }
  window.modulAjarResetState = resetState;

  var initTries = 0, hooked = false, logoutBound = false;
  function bindLogout() {
    if (logoutBound) return; logoutBound = true;
    // Data milik sesi sebelumnya dibuang saat ganti pengguna (state modul ini di luar kasResetState/logout app.js).
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.logout-btn')) resetState();
    }, true);
  }
  function init() {
    if (hooked) return;
    // DOM belum siap (skrip dimuat di <head>): tunggu dulu.
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init, { once: true }); return; }
    ensurePage();
    bindLogout();
    // navigateTo belum tersedia (app.js belum selesai): coba lagi tiap 250 ms, maksimal ~10 detik.
    if (typeof window.navigateTo !== 'function') {
      if (++initTries <= 40) setTimeout(init, 250);
      else console.warn('[modul-ajar] window.navigateTo tidak ditemukan; menu Modul Pembelajaran tidak terpasang.');
      return;
    }
    hooked = true;
    loadKepalaNama();
    var orig = window.navigateTo;
    window.navigateTo = function (page) {
      var r = orig.apply(this, arguments);
      if (page === PAGE) {
        try {
          if (!root) ensurePage();
          var t = $('pageTitle'); if (t) t.textContent = 'Modul Pembelajaran';
          if (tab === 'buat' && !editingKey) tab = 'daftar';
          render(); load(false); loadRef(false); loadKepalaNama();
        } catch (e) { console.error('[modul-ajar]', e); }
      }
      return r;
    };
  }
  init();
})();
