/* ============================================================
   SI MAMBA - js/perangkat-pembelajaran.js
   Menu "Perangkat Pembelajaran" (halaman perangkat-v4).
   - Kaldik: satu tautan per tahun ajaran + semester (diatur Admin/Kepsek).
   - Per guru, per mapel, per kelas, per semester, 8 dokumen:
     RPE (Rencana Pekan Efektif), Prota, Promes, ATP, TP,
     Kisi-kisi, Kartu Soal, Kunci & Penskoran.
   - File TIDAK diunggah: yang disimpan hanya TAUTAN (Google Drive dsb.) di Firebase RTDB,
     jadi gratis (tanpa Firebase Storage) dan tidak membebani database.
   - Guru mengisi tautan + status (Draf/Final). Admin/Kepsek melihat matriks kelengkapan,
     memberi catatan revisi, dan mengunduh rekap CSV.

   Halaman: #page-perangkat-v4 (dibuat otomatis di #mainContent); menu-item index.html: data-page="perangkat-v4".
   Dimuat SETELAH js/app.js. Memakai global dari app.js:
   db, currentUser, allGuru, KELAS_LIST, currentTahunAjaran, toast, v4IsAdmin, v4IsHead, v4Audit.
   Semua kode dibungkus IIFE (tidak menabrak nama global). Yang diekspos:
   perangkatRender(), perangkatResetState() (panggil dari logout), perangkatUtil (pembantu uji).

   Data Firebase:
   perangkat_v4/<ta>_<semester>_<guru>_<mapel>_<kelas> = { tahunAjaran, semester, guruKey, guruName,
       mapel, kelas, updatedAt, docs: { rpe|prota|promes|atp|tp|kisi|kartu|kunci: { url, status, at, by, revisi, revisiBy } } }
   perangkat_kaldik_v4/<ta>_<semester> = { judul, url, at, by }
============================================================ */
(function () {
  'use strict';

  const JENIS = [
    { k: 'rpe',    n: 'RPE',               full: 'RPE (Rencana Pekan Efektif)' },
    { k: 'prota',  n: 'Prota',             full: 'Prota (Program Tahunan)' },
    { k: 'promes', n: 'Promes',            full: 'Promes (Program Semester)' },
    { k: 'atp',    n: 'ATP',               full: 'ATP (Alur Tujuan Pembelajaran)' },
    { k: 'tp',     n: 'TP',                full: 'TP (Tujuan Pembelajaran)' },
    { k: 'kisi',   n: 'Kisi-kisi',         full: 'Kisi-kisi Asesmen' },
    { k: 'kartu',  n: 'Kartu Soal',        full: 'Kartu Soal' },
    { k: 'kunci',  n: 'Kunci & Penskoran', full: 'Kunci Jawaban dan Pedoman Penskoran' }
  ];
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };

  function semDefault() { const m = new Date().getMonth() + 1; return (m >= 7 && m <= 12) ? 'ganjil' : 'genap'; }

  const S = { sem: semDefault(), rows: {}, kaldik: null, jadwal: null, siap: false, err: null, epoch: 0, view: 'saya',
              edit: null, tambah: false, filterGuru: '', busy: false, kaldikEdit: false };

  // ---------- Pembantu murni ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  // Kunci Firebase tidak boleh memuat . $ # [ ] / -> hanya a-z0-9 dan '-' (pemisah antarbagian kunci = '_').
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
  }
  function urlOk(u) {
    const t = String(u || '').trim();
    if (!t || t.length > 500) return false;
    try { return new URL(t).protocol === 'https:'; } catch (e) { return false; }
  }
  // Kunci data per dokumen yang dibuat di aplikasi (format id sama dengan modul masing-masing).
  function genKeys(node, bersemester) {
    const pre = taSlug() + '_' + (bersemester ? S.sem + '_' : '') + (isAdm() ? '' : slug(myId()) + '_');
    return db.ref(node).orderByKey().startAt(pre).endAt(pre + '\uf8ff').once('value')
      .then(sn => { const o = {}; sn.forEach(c => { o[c.key] = 1; }); return o; })
      .catch(() => ({}));
  }
  // id baris = ta_sem_guru_mapel_kelas. TP tidak bersemester, jadi kuncinya ta_guru_mapel_kelas.
  function genAda(jk, id) {
    const g = S.gen || {}, p = String(id || '').split('_');
    if (p.length !== 5) return false;
    if (jk === 'atp' || jk === 'tp') return !!(g.tp && g.tp[[p[0], p[2], p[3], p[4]].join('_')]);
    if (jk === 'kisi') return !!(g.kisi && g.kisi[id]);
    if (jk === 'kartu' || jk === 'kunci') return !!(g.soal && g.soal[id]);
    if (jk === 'prota' || jk === 'promes') return !!(g.materi && g.materi[id]);
    return false;
  }
  function hitung(rec, id) {
    const d = (rec && rec.docs) || {};
    let fin = 0, draf = 0, rev = 0;
    JENIS.forEach(j => {
      const x = d[j.k];
      if (x && x.url) { if (x.status === 'final') fin++; else draf++; if (x.revisi) rev++; }
      else if (genAda(j.k, id)) draf++;
    });
    return { final: fin, draf: draf, revisi: rev, total: JENIS.length };
  }
  function csvCell(v) {
    let t = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // cegah formula injection saat dibuka di Excel
    return '"' + t.replace(/"/g, '""') + '"';
  }

  // ---------- Pembantu yang bergantung app.js ----------
  const isAdm = () => (typeof v4IsAdmin === 'function' && v4IsAdmin()) || (typeof v4IsHead === 'function' && v4IsHead());
  const myId = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : '';
  const myName = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';
  const taText = () => (typeof currentTahunAjaran !== 'undefined' && currentTahunAjaran) ? String(currentTahunAjaran) : '';
  const taSlug = () => slug(taText());
  const say = (m, err, ms) => { if (typeof toast === 'function') toast(m, !!err, ms); };
  const kelasList = () => (typeof KELAS_LIST !== 'undefined' && Array.isArray(KELAS_LIST)) ? KELAS_LIST : [];
  // ---------- Jadwal pelajaran (node 'jadwal': satu data = satu slot {kelas, hari, jam, mapel, guru, guruKey}) ----------
  // Pola seperti Jurnal: pilihan mapel/kelas diambil dari jadwal guru; JP per pekan = jumlah slot unik (hari+jam).
  const normM = s => String(s || '').toLowerCase().replace(/[\u2019'`\u00b4\u02bb\u02bc]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim();
  const normK = s => String(s || '').toLowerCase().replace(/\s+/g, '').replace(/^kelas/, '');
  const kelasResmi = k => { const n = normK(k); return kelasList().find(x => normK(x) === n) || ''; };
  const kunciJ = (mapel, kelas) => normM(mapel) + '|' + normK(kelas);
  function kelompokJadwal(v) {
    const g = {};
    Object.keys(v || {}).forEach(id => {
      const x = v[id]; if (!x || !x.mapel || !x.kelas) return;
      const k = kunciJ(x.mapel, x.kelas);
      if (!g[k]) g[k] = { mapel: String(x.mapel).trim().replace(/\s+/g, ' ').slice(0, 40), kelas: String(x.kelas), kelasRes: kelasResmi(x.kelas), slot: {} };
      g[k].slot[String(x.hari) + '|' + String(x.jam)] = 1;
    });
    Object.keys(g).forEach(k => { g[k].jp = Math.min(40, Object.keys(g[k].slot).length); delete g[k].slot; });
    return g;
  }
  // Gagal/terblokir tidak boleh menggagalkan pemuatan utama: kembalikan null.
  function jadwalGuru() {
    if (typeof db === 'undefined' || !db) return Promise.resolve(null);
    const baca = (anak, nilai) => db.ref('jadwal').orderByChild(anak).equalTo(nilai).once('value').then(sn => sn.val() || {});
    try { return baca('guruKey', myId()).then(v => Object.keys(v).length ? v : baca('guru', myName())).then(kelompokJadwal).catch(() => null); }
    catch (e) { return Promise.resolve(null); }
  }
  const jpJadwal = rec => { const g = S.jadwal && rec && rec.guruKey === myId() ? S.jadwal[kunciJ(rec.mapel, rec.kelas)] : null; return g ? g.jp : 0; };
  const idBaris = (mapel, kelas) => [taSlug(), S.sem, slug(myId()), slug(mapel), slug(kelas)].join('_');
  const audit = (aksi, id, data) => { try { if (typeof v4Audit === 'function') v4Audit(aksi, 'PERANGKAT', id, null, data || null); } catch (e) {} };

  function box() {
    // Konvensi app: wadah halaman bernama "page-<nama>" di dalam #mainContent (sama dengan rapat.js).
    let el = document.getElementById('page-perangkat-v4');
    if (el) return el;
    const host = document.getElementById('mainContent');
    if (!host) return null;
    el = document.createElement('div');
    el.id = 'page-perangkat-v4';
    el.className = 'page-content hidden';
    host.appendChild(el);
    return el;
  }

  // ---------- Muat data ----------
  function prefix() {
    // Admin/Kepsek: seluruh guru semester ini. Guru biasa: hanya kuncinya sendiri (lebih sedikit data terunduh).
    return taSlug() + '_' + S.sem + '_' + (isAdm() ? '' : slug(myId()) + '_');
  }
  function muat() {
    if (typeof db === 'undefined' || !db) return;
    const epoch = ++S.epoch;
    S.siap = false; S.err = null; S.edit = null; render();
    const pre = prefix();
    Promise.all([
      db.ref('perangkat_v4').orderByKey().startAt(pre).endAt(pre + '\uf8ff').once('value'),
      db.ref('perangkat_kaldik_v4/' + taSlug() + '_' + S.sem).once('value'),
      jadwalGuru()
    ]).then(r => {
      if (epoch !== S.epoch) return; // sesi/semester sudah berganti
      S.rows = r[0].val() || {}; S.kaldik = r[1].val() || null; S.jadwal = r[2];
      // Dokumen yang sudah dibuat di aplikasi (kisi, soal, materi, TP): cukup tahu datanya ada.
      // Gagal baca tidak menggagalkan halaman.
      return Promise.all([
        genKeys('perangkat_kisi_v4', true), genKeys('perangkat_soal_v4', true),
        genKeys('perangkat_materi_v4', true), genKeys('perangkat_tp_v4', false)
      ]).then(g => {
        if (epoch !== S.epoch) return;
        S.gen = { kisi: g[0], soal: g[1], materi: g[2], tp: g[3] };
        render();
      });
    }).then(() => {
      if (epoch !== S.epoch) return;
      // Nilai awal JP per pekan dari jadwal (hanya di memori; tidak menimpa angka yang sudah tersimpan guru).
      Object.keys(S.rows).forEach(id => { const x = S.rows[id], jp = jpJadwal(x); if (x && jp && !x.jpPerPekan) x.jpPerPekan = jp; });
      S.siap = true; render();
    }).catch(e => {
      if (epoch !== S.epoch) return;
      S.err = (e && e.message) || String(e); render();
    });
  }

  // ---------- Tampilan ----------
  const chip = (txt, bg, fg) => `<span style="display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;background:${bg};color:${fg};">${txt}</span>`;
  const muted = 'color:#6b7280;font-size:12px;';

  function render() {
    const el = box(); if (!el) return;
    if (S.view === 'rekap' && !isAdm()) S.view = 'saya';
    let h = `<div style="padding:4px 0 12px;">${headHtml()}</div>`;
    if (S.err) h += `<div style="padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;">⚠️ Gagal memuat: ${esc(S.err)} <button class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin-left:6px;" data-act="muat">🔄 Coba lagi</button></div>`;
    else if (!S.siap) h += `<div style="padding:12px;background:#f9fafb;border-radius:8px;${muted}">⏳ Memuat data perangkat pembelajaran...</div>`;
    else h += kaldikHtml() + (S.view === 'rekap' ? rekapHtml() : sayaHtml());
    el.innerHTML = h;
  }

  function headHtml() {
    const tabBtn = (v, t) => `<button class="btn ${S.view === v ? 'btn-success' : 'btn-soft'}" style="padding:6px 12px;font-size:12px;" data-act="view" data-v="${v}">${t}</button>`;
    return `<h2 style="margin:0 0 4px;">📚 Perangkat Pembelajaran</h2>
    <div style="${muted}margin-bottom:8px;">Simpan tautan dokumen (Google Drive dsb.) untuk Kaldik, RPE, Prota, Promes, ATP, TP, dan perangkat asesmen. RPE, ATP/TP, Prota, Promes, Kisi-kisi, dan Soal (kartu soal, naskah, kunci) bisa dibuat otomatis dan dicetak lewat tombol di kartu mapel.</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span style="font-size:13px;">Tahun ajaran <b>${esc(taText() || '-')}</b></span>
      <select class="field" style="max-width:130px;" data-act="sem">${Object.keys(SEM_LABEL).map(k => `<option value="${k}" ${S.sem === k ? 'selected' : ''}>Semester ${SEM_LABEL[k]}</option>`).join('')}</select>
      ${tabBtn('saya', '🙋 Perangkat Saya')}${isAdm() ? tabBtn('rekap', '📊 Rekap Semua Guru') : ''}
      <button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="muat">🔄 Segarkan</button>
    </div>`;
  }

  function kaldikHtml() {
    const k = S.kaldik, adm = isAdm();
    let h = `<div class="border-muted" style="margin:10px 0;padding:10px;border-radius:8px;background:#f0f9ff;">
      <div style="font-weight:700;">📅 Kalender Pendidikan (Kaldik) Semester ${SEM_LABEL[S.sem]}</div>`;
    if (k && k.url) h += `<div style="margin-top:4px;font-size:13px;">${esc(k.judul || 'Kaldik')} · <a href="${esc(k.url)}" target="_blank" rel="noopener noreferrer"><b>Buka dokumen</b></a></div>`;
    else h += `<div style="${muted}margin-top:4px;">Belum ada tautan Kaldik untuk semester ini.</div>`;
    if (adm && !S.kaldikEdit) h += `<button class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin-top:6px;" data-act="kaldik-edit">✏️ ${k && k.url ? 'Ubah' : 'Isi'} tautan Kaldik</button> <button class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin-top:6px;" data-act="rpe-kaldik">🗓 Atur kalender efektif (untuk RPE)</button>`;
    if (adm && S.kaldikEdit) h += `<div style="margin-top:8px;display:grid;gap:6px;max-width:420px;">
      <input id="ppKJudul" class="field" maxlength="100" placeholder="Judul (mis. Kaldik 2025/2026 Ganjil)" value="${esc((k && k.judul) || '')}">
      <input id="ppKUrl" class="field" maxlength="500" placeholder="https://drive.google.com/..." value="${esc((k && k.url) || '')}">
      <div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="kaldik-simpan">💾 Simpan</button>${k && k.url ? '<button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="kaldik-hapus">🗑 Hapus</button>' : ''}<button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="kaldik-batal">Batal</button></div></div>`;
    return h + '</div>';
  }

  function sayaHtml() {
    const me = myId();
    const ids = Object.keys(S.rows).filter(id => S.rows[id] && S.rows[id].guruKey === me)
      .sort((a, b) => (S.rows[a].mapel + S.rows[a].kelas).localeCompare(S.rows[b].mapel + S.rows[b].kelas, 'id'));
    let h = '';
    if (!ids.length) h += `<div style="padding:12px;background:#f9fafb;border-radius:8px;${muted}">Belum ada mapel. Tambahkan mapel dan kelas yang Anda ajar di bawah, lalu isi tautan dokumennya.</div>`;
    ids.forEach(id => { h += rowCard(id, S.rows[id]); });
    h += S.tambah ? tambahForm() : `<button class="btn btn-success" style="margin-top:10px;" data-act="tambah">➕ Tambah Mapel / Kelas</button>`;
    return h;
  }

  // Cek kesiapan data dasar untuk pembuatan otomatis (hanya membaca; tidak mengubah data).
  function siapCek(rec) {
    // NIP sengaja TIDAK dijadikan syarat: guru honorer/non-ASN memang tidak punya NIP,
    // dan dokumen cetak sudah menangani ini dengan baik (NIP kosong -> titik-titik, format baku
    // untuk non-PNS). Menjadikannya syarat wajib akan membuat peringatan ini tidak pernah hilang
    // bagi guru honorer walau tidak ada yang perlu diperbaiki.
    const k = [];
    if (!jpJadwal(rec) && !rec.jpPerPekan) k.push('jam pelajaran per pekan (tambahkan mapel dari Jadwal)');
    if (!(S.kaldik && S.kaldik.url)) k.push('tautan Kaldik semester ini (diatur admin)');
    return k;
  }
  function rowCard(id, rec) {
    const c = hitung(rec), d = rec.docs || {};
    const chips = JENIS.map(j => {
      const x = d[j.k], on = S.edit && S.edit.id === id && S.edit.j === j.k;
      const st = x && x.url ? (x.status === 'final' ? ['#dcfce7', '#86efac', '#166534', '✅'] : ['#fef9c3', '#fde047', '#854d0e', '✏️']) : ['#f3f4f6', '#d1d5db', '#374151', '➕'];
      return `<button type="button" data-act="edit" data-id="${esc(id)}" data-j="${j.k}" style="text-align:left;min-height:46px;padding:6px 10px;border-radius:10px;border:${on ? 2 : 1.5}px solid ${on ? '#2563eb' : st[1]};background:${st[0]};color:${st[2]};cursor:pointer;font-size:13px;line-height:1.25;"><strong>${st[3]} ${esc(j.n)}</strong><br><span style="font-size:11px;">${x && x.url ? (x.status === 'final' ? 'Final' : 'Draf') : 'Belum diisi'}${x && x.revisi ? ' · ⚠️ revisi' : ''}</span></button>`;
    }).join('');
    const panel = (S.edit && S.edit.id === id) ? editorHtml(id, rec, S.edit.j) : '';
    const sk = siapCek(rec);
    const siapHtml = sk.length
      ? `<div style="margin-top:6px;padding:6px 8px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">Belum siap dibuat otomatis: ${sk.map(esc).join('; ')}.</div>`
      : `<div style="margin-top:6px;font-size:12px;color:#166534;">✅ Data dasar lengkap untuk pembuatan otomatis.</div>`;
    return `<div class="border-muted" style="margin-top:10px;padding:10px;border-radius:10px;">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">
        <div style="font-weight:700;">${esc(rec.mapel)} · Kelas ${esc(rec.kelas)}${(() => { const jj = jpJadwal(rec); return jj ? `<div style="${muted}font-weight:400;">📅 Jadwal: ${jj} JP/pekan${rec.jpPerPekan && rec.jpPerPekan !== jj ? ` · di dokumen tersimpan ${esc(rec.jpPerPekan)} (beda dari jadwal, cek kembali)` : ''}</div>` : ''; })()}</div>
        <div style="font-size:12px;">${c.final}/${c.total} final${c.draf ? ` · ${c.draf} draf` : ''} <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="rpe" data-id="${esc(id)}">🖨 Buat RPE</button><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="prota" data-id="${esc(id)}">🗂 Prota/Promes</button><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="atp" data-id="${esc(id)}">🎯 ATP/TP</button><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="kisi" data-id="${esc(id)}">📋 Kisi-kisi</button><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="soal" data-id="${esc(id)}">📝 Soal</button><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="hapus-baris" data-id="${esc(id)}">🗑</button></div></div>
      <div style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;">${chips}</div>${siapHtml}${panel}</div>`;
  }

  function editorHtml(id, rec, jk) {
    const j = JENIS.find(x => x.k === jk); if (!j) return '';
    const x = (rec.docs || {})[jk] || {}, adm = isAdm() && rec.guruKey !== myId();
    const rev = x.revisi ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">⚠️ Catatan revisi${x.revisiBy ? ' dari ' + esc(x.revisiBy) : ''}: ${esc(x.revisi)}</div>` : '';
    if (adm) return `<div style="margin-top:10px;padding:10px;border-radius:8px;background:#f9fafb;">
      <div style="font-weight:700;margin-bottom:6px;">${esc(j.full)} · ${esc(rec.guruName || '')}</div>
      ${x.url ? `<div style="font-size:13px;margin-bottom:8px;"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><b>Buka dokumen</b></a> · ${x.status === 'final' ? 'Final' : 'Draf'}</div>
      <input id="ppRevisi" class="field" maxlength="200" placeholder="Catatan revisi untuk guru (kosongkan bila sudah sesuai)" value="${esc(x.revisi || '')}">
      <div style="margin-top:8px;display:flex;gap:6px;"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="simpan-revisi" data-id="${esc(id)}" data-j="${jk}">💾 Simpan catatan</button><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tutup">Tutup</button></div>`
      : `<div style="${muted}">Guru belum mengisi tautan dokumen ini.</div><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;margin-top:8px;" data-act="tutup">Tutup</button>`}</div>`;
    return `<div style="margin-top:10px;padding:10px;border-radius:8px;background:#f9fafb;">
      <div style="font-weight:700;margin-bottom:6px;">${esc(j.full)}</div>${rev}
      <input id="ppUrl" class="field" maxlength="500" placeholder="https://drive.google.com/..." value="${esc(x.url || '')}">
      <div style="${muted}margin:4px 0 8px;">Pastikan akses tautan bisa dilihat oleh Kepala Madrasah/Admin. Hanya tautan https yang diterima.</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <select id="ppStatus" class="field" style="max-width:120px;"><option value="draf" ${x.status !== 'final' ? 'selected' : ''}>Draf</option><option value="final" ${x.status === 'final' ? 'selected' : ''}>Final</option></select>
        <button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="simpan-doc" data-id="${esc(id)}" data-j="${jk}">💾 Simpan</button>
        ${x.url ? `<a class="btn btn-soft" style="padding:6px 12px;font-size:12px;" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Buka</a><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="hapus-doc" data-id="${esc(id)}" data-j="${jk}">Hapus tautan</button>` : ''}
        <button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tutup">Tutup</button></div></div>`;
  }

  function jadwalOpsi() {
    return Object.keys(S.jadwal || {}).map(k => S.jadwal[k]).filter(g => g.kelasRes && !S.rows[idBaris(g.mapel, g.kelasRes)])
      .sort((a, b) => (a.mapel + a.kelasRes).localeCompare(b.mapel + b.kelasRes, 'id'));
  }
  function jadwalBlok() {
    if (S.jadwal === null) return '';
    const o = jadwalOpsi();
    if (!Object.keys(S.jadwal).length) return `<div style="${muted}margin-bottom:8px;">Jadwal mengajar Anda belum ditemukan di data Jadwal. Ketik mapel dan kelas secara manual di bawah.</div>`;
    if (!o.length) return `<div style="${muted}margin-bottom:8px;">Semua mapel di jadwal Anda sudah ada di daftar. Untuk mapel lain, ketik manual di bawah.</div>`;
    return `<div style="margin-bottom:10px;padding:8px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;">
      <div style="font-size:12px;color:#1e40af;margin-bottom:6px;">📅 Dari jadwal pelajaran Anda</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <select id="ppJadwal" class="field" style="max-width:280px;">${o.map(g => `<option value="${esc(kunciJ(g.mapel, g.kelas))}">${esc(g.mapel)} · Kelas ${esc(g.kelasRes)} (${g.jp} JP/pekan)</option>`).join('')}</select>
        <button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="tambah-jadwal">Tambah</button>
        ${o.length > 1 ? `<button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tambah-jadwal-semua">Tambah semua (${o.length})</button>` : ''}
      </div>
      <div style="${muted}margin-top:6px;">atau ketik manual untuk mapel yang tidak ada di jadwal:</div></div>`;
  }
  function tambahForm() {
    const mapelSudah = Array.from(new Set(Object.keys(S.rows).map(id => S.rows[id].mapel))).sort();
    return `<div class="border-muted" style="margin-top:10px;padding:10px;border-radius:10px;background:#f9fafb;">
      <div style="font-weight:700;margin-bottom:6px;">Tambah mapel yang Anda ajar</div>
      ${jadwalBlok()}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input id="ppMapel" class="field" style="max-width:220px;" maxlength="40" list="ppMapelList" placeholder="Nama mapel (mis. Matematika)">
        <datalist id="ppMapelList">${mapelSudah.map(m => `<option value="${esc(m)}">`).join('')}</datalist>
        <select id="ppKelas" class="field" style="max-width:130px;"><option value="">-- Kelas --</option>${kelasList().map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select>
        <button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="tambah-simpan">Tambah</button>
        <button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tambah-batal">Batal</button></div></div>`;
  }

  // ---------- Rekap (Admin/Kepsek) ----------
  function lihatIds() {
    return Object.keys(S.rows).filter(id => S.rows[id] && (!S.filterGuru || S.rows[id].guruKey === S.filterGuru))
      .sort((a, b) => { const x = S.rows[a], y = S.rows[b]; return (x.guruName + x.mapel + x.kelas).localeCompare(y.guruName + y.mapel + y.kelas, 'id'); });
  }
  function guruList() {
    const m = {};
    Object.keys(S.rows).forEach(id => { const r = S.rows[id]; if (r && r.guruKey) m[r.guruKey] = r.guruName || r.guruKey; });
    return m;
  }
  function belumIsi() {
    let arr = [];
    try { arr = (typeof allGuru !== 'undefined' && allGuru) ? (Array.isArray(allGuru) ? allGuru : Object.values(allGuru)) : []; } catch (e) { arr = []; }
    const ada = guruList();
    return arr.filter(g => g && g.name && !ada[g.key || g.name] && !Object.values(ada).includes(g.name)).map(g => g.name);
  }
  function rekapHtml() {
    const ids = lihatIds(), gl = guruList();
    let tot = 0, fin = 0;
    ids.forEach(id => { const c = hitung(S.rows[id], id); tot += c.total; fin += c.final; });
    const pct = tot ? Math.round(fin * 100 / tot) : 0;
    const opt = `<option value="">Semua guru</option>` + Object.keys(gl).sort((a, b) => gl[a].localeCompare(gl[b], 'id')).map(k => `<option value="${esc(k)}" ${S.filterGuru === k ? 'selected' : ''}>${esc(gl[k])}</option>`).join('');
    const th = JENIS.map(j => `<th style="padding:6px 4px;font-size:11px;text-align:center;">${esc(j.n)}</th>`).join('');
    let body = ids.map(id => {
      const r = S.rows[id], c = hitung(r, id), d = r.docs || {};
      const tds = JENIS.map(j => {
        const x = d[j.k], gen = !(x && x.url) && genAda(j.k, id), g = x && x.url ? (x.status === 'final' ? '✅' : '✏️') : gen ? '🛠' : '—';
        return `<td style="text-align:center;padding:4px;"><button type="button" data-act="edit" data-id="${esc(id)}" data-j="${j.k}" style="border:0;background:${S.edit && S.edit.id === id && S.edit.j === j.k ? '#dbeafe' : 'transparent'};cursor:pointer;font-size:15px;min-height:32px;min-width:32px;">${x && x.revisi ? '⚠️' : g}</button></td>`;
      }).join('');
      const panel = (S.edit && S.edit.id === id) ? `<tr><td colspan="${JENIS.length + 4}">${editorHtml(id, r, S.edit.j)}</td></tr>` : '';
      return `<tr><td style="padding:4px 6px;white-space:nowrap;font-weight:600;">${esc(r.guruName)}</td><td style="padding:4px 6px;white-space:nowrap;">${esc(r.mapel)}</td><td style="padding:4px 6px;">${esc(r.kelas)}</td>${tds}<td style="padding:4px 6px;text-align:center;font-size:12px;">${c.final}/${c.total}</td></tr>${panel}`;
    }).join('');
    if (!ids.length) body = `<tr><td colspan="${JENIS.length + 4}" style="text-align:center;padding:12px;${muted}">Belum ada data perangkat pembelajaran untuk semester ini.</td></tr>`;
    const bl = belumIsi();
    return `<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <select class="field" style="max-width:200px;" data-act="filter-guru">${opt}</select>
      <span style="font-size:13px;">Kelengkapan final: <b>${pct}%</b> (${fin}/${tot})</span>
      <button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="csv">⬇️ Unduh CSV</button></div>
      <div style="${muted}margin:6px 0;">✅ final · ✏️ draf · 🛠 dibuat di aplikasi (data sudah tersimpan) · — belum · ⚠️ ada catatan revisi. Ketuk sel untuk membuka tautan/memberi catatan.</div>
      <div style="overflow-x:auto;"><table><thead><tr><th style="text-align:left;padding:6px;">Guru</th><th style="text-align:left;padding:6px;">Mapel</th><th style="text-align:left;padding:6px;">Kelas</th>${th}<th style="padding:6px 4px;font-size:11px;">Final</th></tr></thead><tbody>${body}</tbody></table></div>
      ${bl.length ? `<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">Belum ada data dari: ${bl.map(esc).join(', ')}</div>` : ''}`;
  }

  function unduhCsv() {
    const ids = lihatIds();
    const head = ['Tahun Ajaran', 'Semester', 'Guru', 'Mapel', 'Kelas'].concat(JENIS.map(j => j.full), ['Jumlah Final', 'Jumlah Draf']);
    const lines = [head.map(csvCell).join(',')];
    ids.forEach(id => {
      const r = S.rows[id], c = hitung(r, id), d = r.docs || {};
      const cells = [r.tahunAjaran, SEM_LABEL[r.semester] || r.semester, r.guruName, r.mapel, r.kelas]
        .concat(JENIS.map(j => { const x = d[j.k]; return x && x.url ? (x.status === 'final' ? 'Final' : 'Draf') + (x.revisi ? ' (revisi)' : '') : (genAda(j.k, id) ? 'Dibuat di aplikasi' : 'Belum'); }), [c.final, c.draf]);
      lines.push(cells.map(csvCell).join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Rekap_Perangkat_' + taSlug() + '_' + S.sem + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- Simpan ----------
  const siap = () => (window.rpeUtil && window.rpeUtil.siap) ? window.rpeUtil.siap() : Promise.resolve(true);
  function tulis(path, upd, sukses, aksi, idAudit) {
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (S.busy) return say('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
    S.busy = true;
    siap().then(() => db.ref(path).update(upd)).then(() => {
      S.busy = false; sukses(); audit(aksi, idAudit); render();
    }).catch(e => { S.busy = false; console.error('[SI MAMBA] perangkat:', e); say('❌ Gagal menyimpan: ' + ((e && e.message) || e), true); });
  }
  function simpanDoc(id, jk) {
    const rec = S.rows[id]; if (!rec) return;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa mengubah tautan.', true);
    const url = (document.getElementById('ppUrl') || {}).value || '', st = (document.getElementById('ppStatus') || {}).value === 'final' ? 'final' : 'draf';
    if (!urlOk(url)) return say('Isi tautan yang valid, diawali https://', true);
    const now = new Date().toISOString(), u = url.trim(), b = 'docs/' + jk + '/';
    const upd = {}; upd[b + 'url'] = u; upd[b + 'status'] = st; upd[b + 'at'] = now; upd[b + 'by'] = myName();
    upd[b + 'revisi'] = null; upd[b + 'revisiBy'] = null; upd.updatedAt = now; // guru menyimpan ulang = catatan revisi dianggap ditindaklanjuti
    tulis('perangkat_v4/' + id, upd, () => {
      rec.docs = rec.docs || {}; rec.docs[jk] = { url: u, status: st, at: now, by: myName() }; rec.updatedAt = now; S.edit = null; say('✅ Tersimpan');
    }, 'SAVE_PERANGKAT_DOC', id);
  }
  function hapusDoc(id, jk) {
    const rec = S.rows[id]; if (!rec || rec.guruKey !== myId()) return;
    if (!confirm('Hapus tautan ' + jk.toUpperCase() + ' ini?')) return;
    const upd = {}; upd['docs/' + jk] = null; upd.updatedAt = new Date().toISOString();
    tulis('perangkat_v4/' + id, upd, () => { if (rec.docs) delete rec.docs[jk]; S.edit = null; say('Tautan dihapus'); }, 'DELETE_PERANGKAT_DOC', id);
  }
  function simpanRevisi(id, jk) {
    const rec = S.rows[id]; if (!rec || !isAdm()) return;
    const x = (rec.docs || {})[jk]; if (!x || !x.url) return say('Dokumen belum diisi guru.', true);
    const t = ((document.getElementById('ppRevisi') || {}).value || '').trim().slice(0, 200), b = 'docs/' + jk + '/';
    const upd = {}; upd[b + 'revisi'] = t || null; upd[b + 'revisiBy'] = t ? myName() : null;
    tulis('perangkat_v4/' + id, upd, () => { if (t) { x.revisi = t; x.revisiBy = myName(); } else { delete x.revisi; delete x.revisiBy; } S.edit = null; say('✅ Catatan tersimpan'); }, 'REVIEW_PERANGKAT_DOC', id);
  }
  function recBaru(mapel, kelas, jp) {
    const rec = { tahunAjaran: taText(), semester: S.sem, guruKey: myId(), guruName: myName(), mapel: mapel, kelas: kelas, updatedAt: new Date().toISOString() };
    if (jp >= 1 && jp <= 40) rec.jpPerPekan = jp;
    return rec;
  }
  function tambahBaris() {
    const mapel = ((document.getElementById('ppMapel') || {}).value || '').trim().replace(/\s+/g, ' '), kelas = (document.getElementById('ppKelas') || {}).value || '';
    if (mapel.length < 2 || mapel.length > 40) return say('Nama mapel 2-40 huruf.', true);
    if (!kelasList().includes(kelas)) return say('Pilih kelas.', true);
    if (S.rows[idBaris(mapel, kelas)]) return say('Mapel dan kelas itu sudah ada.', true);
    const g = S.jadwal && S.jadwal[kunciJ(mapel, kelas)];
    simpanBaris([recBaru(mapel, kelas, g ? g.jp : 0)]);
  }
  function tambahJadwal(semua) {
    const o = jadwalOpsi(); if (!o.length) return say('Tidak ada mapel dari jadwal yang bisa ditambahkan.', true);
    let pilih = o;
    if (!semua) { const v = (document.getElementById('ppJadwal') || {}).value; pilih = o.filter(g => kunciJ(g.mapel, g.kelas) === v); }
    if (!pilih.length) return say('Pilih mapel dari jadwal.', true);
    simpanBaris(pilih.map(g => recBaru(g.mapel, g.kelasRes, g.jp)));
  }
  function simpanBaris(recs) {
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (S.busy) return;
    S.busy = true;
    const upd = {}; recs.forEach(r => { upd[idBaris(r.mapel, r.kelas)] = r; });
    siap().then(() => db.ref('perangkat_v4').update(upd)).then(() => {
      S.busy = false; Object.keys(upd).forEach(id => { S.rows[id] = upd[id]; audit('ADD_PERANGKAT_ROW', id); });
      S.tambah = false; say(recs.length > 1 ? '✅ ' + recs.length + ' mapel ditambahkan' : '✅ Mapel ditambahkan'); render();
    }).catch(e => { S.busy = false; say('❌ Gagal menambah: ' + ((e && e.message) || e), true); });
  }
  function hapusBaris(id) {
    const rec = S.rows[id]; if (!rec || rec.guruKey !== myId()) return;
    if (!confirm('Hapus ' + rec.mapel + ' kelas ' + rec.kelas + ' beserta semua tautannya?')) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    siap().then(() => db.ref('perangkat_v4/' + id).remove()).then(() => { delete S.rows[id]; S.edit = null; audit('DELETE_PERANGKAT_ROW', id); say('Dihapus'); render(); })
      .catch(e => say('❌ Gagal menghapus: ' + ((e && e.message) || e), true));
  }
  function simpanKaldik() {
    if (!isAdm()) return;
    const url = (document.getElementById('ppKUrl') || {}).value || '', judul = ((document.getElementById('ppKJudul') || {}).value || '').trim().slice(0, 100);
    if (!urlOk(url)) return say('Isi tautan yang valid, diawali https://', true);
    const rec = { judul: judul || 'Kaldik', url: url.trim(), at: new Date().toISOString(), by: myName() };
    tulis('perangkat_kaldik_v4', (function () { const o = {}; o[taSlug() + '_' + S.sem] = rec; return o; })(), () => { S.kaldik = rec; S.kaldikEdit = false; say('✅ Kaldik tersimpan'); }, 'SAVE_PERANGKAT_KALDIK', taSlug() + '_' + S.sem);
  }
  function hapusKaldik() {
    if (!isAdm() || !confirm('Hapus tautan Kaldik semester ini?')) return;
    const o = {}; o[taSlug() + '_' + S.sem] = null;
    tulis('perangkat_kaldik_v4', o, () => { S.kaldik = null; S.kaldikEdit = false; say('Tautan Kaldik dihapus'); }, 'DELETE_PERANGKAT_KALDIK', taSlug() + '_' + S.sem);
  }

  // ---------- Event (delegasi, tanpa onclick inline) ----------
  function aksi(e) {
    const t = e.target.closest ? e.target.closest('[data-act]') : null; if (!t) return;
    const a = t.getAttribute('data-act'), id = t.getAttribute('data-id'), j = t.getAttribute('data-j');
    if (t.tagName === 'SELECT' && e.type === 'click') return; // select ditangani lewat 'change'
    switch (a) {
      case 'muat': return muat();
      case 'view': S.view = t.getAttribute('data-v') === 'rekap' ? 'rekap' : 'saya'; S.edit = null; return render();
      case 'edit': S.edit = (S.edit && S.edit.id === id && S.edit.j === j) ? null : { id: id, j: j }; return render();
      case 'tutup': S.edit = null; return render();
      case 'tambah': S.tambah = true; return render();
      case 'tambah-batal': S.tambah = false; return render();
      case 'tambah-simpan': return tambahBaris();
      case 'tambah-jadwal': return tambahJadwal(false);
      case 'tambah-jadwal-semua': return tambahJadwal(true);
      case 'simpan-doc': return simpanDoc(id, j);
      case 'hapus-doc': return hapusDoc(id, j);
      case 'simpan-revisi': return simpanRevisi(id, j);
      case 'hapus-baris': return hapusBaris(id);
      case 'kaldik-edit': S.kaldikEdit = true; return render();
      case 'kaldik-batal': S.kaldikEdit = false; return render();
      case 'kaldik-simpan': return simpanKaldik();
      case 'kaldik-hapus': return hapusKaldik();
      case 'rpe': if (typeof window.rpeBuka !== 'function') return say('Modul RPE belum dimuat (js/perangkat-rpe.js).', true);
                  return window.rpeBuka(id, S.rows[id], S.sem, taText());
      case 'prota': if (typeof window.protaBuka !== 'function') return say('Modul Prota/Promes belum dimuat (js/perangkat-prota-promes.js).', true);
                  return window.protaBuka(id, S.rows[id], S.sem, taText());
      case 'atp': if (typeof window.atpBuka !== 'function') return say('Modul ATP/TP belum dimuat (js/perangkat-atp-tp.js dan js/data-tp-mi.js).', true);
                  return window.atpBuka(id, S.rows[id], S.sem, taText());
      case 'kisi': if (typeof window.kisiBuka !== 'function') return say('Modul Kisi-kisi belum dimuat (js/perangkat-kisi.js).', true);
                  return window.kisiBuka(id, S.rows[id], S.sem, taText());
      case 'soal': if (typeof window.soalBuka !== 'function') return say('Modul Soal belum dimuat (js/perangkat-soal.js).', true);
                  return window.soalBuka(id, S.rows[id], S.sem, taText());
      case 'rpe-kaldik': if (typeof window.rpeKaldikBuka !== 'function') return say('Modul RPE belum dimuat (js/perangkat-rpe.js).', true);
                  return window.rpeKaldikBuka(S.sem, taText());
      case 'csv': return unduhCsv();
    }
  }
  function ubah(e) {
    const t = e.target; if (!t || !t.getAttribute) return;
    const a = t.getAttribute('data-act');
    if (a === 'sem') { S.sem = t.value === 'genap' ? 'genap' : 'ganjil'; S.filterGuru = ''; muat(); }
    else if (a === 'filter-guru') { S.filterGuru = t.value; S.edit = null; render(); }
  }
  let terpasang = false;
  function pasang() {
    const el = box(); if (!el || terpasang === el) return el;
    el.addEventListener('click', aksi); el.addEventListener('change', ubah); terpasang = el; return el;
  }

  // ---------- API publik ----------
  window.perangkatRender = function () {
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (!pasang()) return;
    muat();
  };
  window.perangkatResetState = function () {
    S.epoch++; S.rows = {}; S.kaldik = null; S.siap = false; S.err = null; S.view = 'saya'; S.edit = null; S.tambah = false;
    S.filterGuru = ''; S.busy = false; S.kaldikEdit = false; S.sem = semDefault();
    const el = (typeof document !== 'undefined') ? document.getElementById('page-perangkat-v4') : null; if (el) el.innerHTML = '';
  };
  window.perangkatUtil = { slug: slug, urlOk: urlOk, hitung: hitung, csvCell: csvCell, JENIS: JENIS };

  // Kaitkan ke navigateTo: buka halaman 'perangkat-v4' => render. Wadah dibuat lebih dulu supaya
  // navigateTo asli bisa menampilkannya (menyalakan/mematikan kelas 'hidden' pada #page-<nama>).
  function pasangNav() {
    box();
    if (typeof window.navigateTo === 'function' && !window.navigateTo.__perangkat) {
      const asli = window.navigateTo;
      const bungkus = function (page) {
        const r = asli.apply(this, arguments);
        if (page === 'perangkat-v4') {
          try {
            const t = document.getElementById('pageTitle'); if (t) t.textContent = 'Perangkat Pembelajaran';
            window.perangkatRender();
          } catch (e) { console.error('[SI MAMBA] perangkat:', e); }
        }
        return r;
      };
      bungkus.__perangkat = true;
      window.navigateTo = bungkus;
    } else if (typeof window.navigateTo !== 'function') {
      console.warn('[SI MAMBA] perangkat: navigateTo belum tersedia -- pastikan file ini dimuat SETELAH app.js.');
    }
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.logout-btn')) { try { window.perangkatResetState(); } catch (x) {} }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasangNav); else pasangNav();
})();
