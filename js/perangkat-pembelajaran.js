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
    // setuju: true = dokumen ini disahkan Kepala (tombol Setujui muncul; blok Kepala di cetakan berisi QR hanya setelah disetujui).
    //         false = blok Kepala di cetakan tetap kosong untuk tanda tangan basah. Ubah true/false di sini saja.
    { k: 'rpe',    n: 'RPE',               full: 'RPE (Rencana Pekan Efektif)', setuju: true },
    { k: 'prota',  n: 'Prota',             full: 'Prota (Program Tahunan)', setuju: true },
    { k: 'promes', n: 'Promes',            full: 'Promes (Program Semester)', setuju: true },
    { k: 'atp',    n: 'ATP',               full: 'ATP (Alur Tujuan Pembelajaran)', setuju: true },
    { k: 'tp',     n: 'TP',                full: 'TP (Tujuan Pembelajaran)', setuju: false },
    { k: 'kisi',   n: 'Kisi-kisi',         full: 'Kisi-kisi Asesmen', setuju: true },
    { k: 'kartu',  n: 'Kartu Soal',        full: 'Kartu Soal', setuju: false },
    { k: 'kunci',  n: 'Kunci & Penskoran', full: 'Kunci Jawaban dan Pedoman Penskoran', setuju: false }
  ];
  function tglPendek(iso) { try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  // Dokumen dihitung FINAL bila guru menandainya Final ATAU Kepala sudah menyetujuinya (persetujuan berarti dokumen sudah dianggap final).
  // Bila guru mengubah dokumen, persetujuan gugur dan status kembali mengikuti pilihan guru.
  function isFinal(x) { return !!x && (x.status === 'final' || !!x.setuju); }
  // Blok persetujuan di editor dokumen. Admin/Kepsek (bukan pemilik) boleh setuju/cabut; guru hanya melihat statusnya.
  function setujuHtml(id, rec, jk, j, x, boleh) {
    if (!j.setuju) return '';
    const st = x.setuju;
    if (st) return `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#ecfdf5;border:1px solid #6ee7b7;font-size:12px;color:#065f46;">✅ Disetujui ${st.peran === 'Admin' ? 'atas nama' : 'oleh'} ${esc(st.oleh || '-')}${st.peran === 'Admin' ? ' (diinput Admin)' : ''} · ${esc(tglPendek(st.at))}${boleh ? ` <button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:6px;" data-act="cabut-setuju" data-id="${esc(id)}" data-j="${jk}">Cabut</button>` : ''}</div>`;
    if (boleh) return (x.url || genAda(jk, id))
      ? `<div style="margin-bottom:8px;"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="setuju" data-id="${esc(id)}" data-j="${jk}">✅ Setujui dokumen ini</button><div style="${muted}margin-top:4px;">Setelah disetujui, cetakan guru memuat QR tanda tangan Kepala. Bila guru mengubah dokumen, persetujuan otomatis gugur.</div></div>`
      : `<div style="${muted}margin-bottom:8px;">Belum bisa disetujui: guru belum mengisi tautan atau membuat dokumen.</div>`;
    return `<div style="${muted}margin-bottom:8px;">Dokumen ini perlu persetujuan Kepala sebelum cetakannya memuat QR tanda tangan Kepala.</div>`;
  }
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };

  function semDefault() { const m = new Date().getMonth() + 1; return (m >= 7 && m <= 12) ? 'ganjil' : 'genap'; }

  const S = { sem: semDefault(), rows: {}, kaldik: null, jadwal: null, siap: false, err: null, epoch: 0, view: 'saya',
              edit: null, tambah: false, filterGuru: '', filterStatus: '', filterKelas: '', sortBy: '', waBuka: false, waSudah: {}, tenggatEdit: false, setujuBuka: false, busy: false, kaldikEdit: false };

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
      if (x && x.url) { if (isFinal(x)) fin++; else draf++; if (x.revisi) rev++; }
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
    return h + tenggatHtml(adm) + '</div>';
  }

  function sayaHtml() {
    const me = myId();
    const ids = Object.keys(S.rows).filter(id => S.rows[id] && S.rows[id].guruKey === me)
      .sort((a, b) => (S.rows[a].mapel + S.rows[a].kelas).localeCompare(S.rows[b].mapel + S.rows[b].kelas, 'id'));
    let h = ringkasanSaya(ids);
    if (!ids.length) h += `<div style="padding:12px;background:#f9fafb;border-radius:8px;${muted}">Belum ada mapel. Tambahkan mapel dan kelas yang Anda ajar di bawah, lalu isi tautan dokumennya.</div>`;
    ids.forEach(id => { h += rowCard(id, S.rows[id]); });
    h += S.tambah ? tambahForm() : `<button class="btn btn-success" style="margin-top:10px;" data-act="tambah">➕ Tambah Mapel / Kelas</button>`;
    return h;
  }

  // Ringkasan di atas halaman "Perangkat Saya": berapa dokumen sudah final dan apa yang masih perlu dikerjakan.
  function ringkasanSaya(ids) {
    if (!ids.length) return '';
    let fin = 0, tot = 0, rev = 0;
    const sisa = [];
    ids.forEach(id => {
      const r = S.rows[id], c = hitung(r, id), d = r.docs || {};
      fin += c.final; tot += c.total; rev += c.revisi;
      const kurang = JENIS.filter(j => { const x = d[j.k]; return !(x && x.url && isFinal(x)); }).map(j => j.n);
      if (kurang.length) sisa.push('<b>' + esc(r.mapel) + ' ' + esc(r.kelas) + '</b>: ' + kurang.map(esc).join(', '));
    });
    const pr = tot ? Math.round(fin * 100 / tot) : 0;
    return `<div class="border-muted" style="margin:10px 0;padding:12px;border-radius:10px;background:#f0fdf4;color:#1f2937;">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline;font-size:15px;"><b>${fin} dari ${tot} dokumen sudah final (${pr}%)</b>${rev ? `<span style="font-size:13px;color:#9a3412;">⚠️ ${rev} dokumen ada catatan revisi</span>` : ''}</div>
      <div style="height:8px;border-radius:99px;background:#e5e7eb;margin:8px 0;overflow:hidden;"><span style="display:block;height:100%;width:${pr}%;background:#16a34a;"></span></div>
      ${tenggatBaris()}
      ${sisa.length ? `<div style="font-size:13px;line-height:1.6;"><div style="${muted}margin-bottom:2px;font-size:13px;">Yang masih perlu dikerjakan:</div>${sisa.join('<br>')}</div>` : '<div style="font-size:13px;color:#166534;">✅ Semua perangkat sudah final. Terima kasih!</div>'}</div>`;
  }

  // Cek kesiapan data dasar untuk pembuatan otomatis (hanya membaca; tidak mengubah data).
  function siapCek(rec) {
    // PEG ID (dulu NIP) sengaja TIDAK dijadikan syarat: tidak semua guru punya,
    // dan dokumen cetak sudah menangani ini dengan baik (PEG ID kosong -> titik-titik, format baku
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
      const st = x && x.url ? (isFinal(x) ? ['#dcfce7', '#86efac', '#166534', '✅'] : ['#fef9c3', '#fde047', '#854d0e', '✏️']) : ['#f3f4f6', '#d1d5db', '#374151', '➕'];
      return `<button type="button" data-act="edit" data-id="${esc(id)}" data-j="${j.k}" style="text-align:left;min-height:46px;padding:6px 10px;border-radius:10px;border:${on ? 2 : 1.5}px solid ${on ? '#2563eb' : st[1]};background:${st[0]};color:${st[2]};cursor:pointer;font-size:13px;line-height:1.25;"><strong>${st[3]} ${esc(j.n)}</strong><br><span style="font-size:11px;">${x && x.url ? (isFinal(x) ? 'Final' : 'Draf') : 'Belum diisi'}${x && x.revisi ? ' · ⚠️ revisi' : ''}</span></button>`;
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
      ${setujuHtml(id, rec, jk, j, x, true)}
      ${x.url ? `<div style="font-size:13px;margin-bottom:8px;"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><b>Buka dokumen</b></a> · ${isFinal(x) ? 'Final' : 'Draf'}</div>
      <input id="ppRevisi" class="field" maxlength="200" placeholder="Catatan revisi untuk guru (kosongkan bila sudah sesuai)" value="${esc(x.revisi || '')}">
      <div style="margin-top:8px;display:flex;gap:6px;"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="simpan-revisi" data-id="${esc(id)}" data-j="${jk}">💾 Simpan catatan</button><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tutup">Tutup</button></div>`
      : `<div style="${muted}">Guru belum mengisi tautan dokumen ini.</div><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;margin-top:8px;" data-act="tutup">Tutup</button>`}</div>`;
    return `<div style="margin-top:10px;padding:10px;border-radius:8px;background:#f9fafb;">
      <div style="font-weight:700;margin-bottom:6px;">${esc(j.full)}</div>${rev}${setujuHtml(id, rec, jk, j, x, false)}
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
    return Object.keys(S.rows).filter(id => {
      const r = S.rows[id]; if (!r) return false;
      if (S.filterGuru && r.guruKey !== S.filterGuru) return false;
      if (S.filterKelas && String(r.kelas) !== S.filterKelas) return false;
      if (S.filterStatus) {
        const c = hitung(r, id);
        if (S.filterStatus === 'belum' && c.final + c.draf >= c.total) return false; // masih ada dokumen yang belum diisi
        if (S.filterStatus === 'draf' && !c.draf) return false;                      // ada dokumen draf
        if (S.filterStatus === 'final' && c.final < c.total) return false;           // semua dokumen final
        if (S.filterStatus === 'revisi' && !c.revisi) return false;                  // ada catatan revisi
      }
      return true;
    })
      .sort((a, b) => {
        const x = S.rows[a], y = S.rows[b];
        if (S.sortBy) {
          // Kelompok per guru tetap utuh: urutkan guru menurut jumlah dokumen final seluruh mapelnya.
          const fa = finalGuru(x.guruKey), fb = finalGuru(y.guruKey);
          if (fa !== fb) return S.sortBy === 'asc' ? fa - fb : fb - fa;
        }
        return (x.guruName + '|' + x.guruKey + '|' + x.mapel + x.kelas).localeCompare(y.guruName + '|' + y.guruKey + '|' + y.mapel + y.kelas, 'id');
      });
  }
  // Persentase dokumen final seluruh mapel milik satu guru (dipakai untuk pengurutan rekap).
  function finalGuru(gk) {
    let fin = 0, tot = 0;
    Object.keys(S.rows).forEach(id => { const r = S.rows[id]; if (r && r.guruKey === gk) { const c = hitung(r, id); fin += c.final; tot += c.total; } });
    return tot ? fin / tot : 0;
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
    const kelasSet = Array.from(new Set(Object.keys(S.rows).map(id => S.rows[id] && S.rows[id].kelas).filter(Boolean).map(String))).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const optKelas = `<option value="">Semua kelas</option>` + kelasSet.map(k => `<option value="${esc(k)}" ${S.filterKelas === k ? 'selected' : ''}>Kelas ${esc(k)}</option>`).join('');
    const stOpt = [['', 'Semua status'], ['belum', 'Ada yang belum diisi'], ['draf', 'Ada draf'], ['final', 'Semua final'], ['revisi', 'Ada catatan revisi']];
    const optStatus = stOpt.map(o => `<option value="${o[0]}" ${S.filterStatus === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('');
    const optUrut = [['', 'Urut: nama guru'], ['asc', 'Urut: paling belum lengkap'], ['desc', 'Urut: paling lengkap']].map(o => `<option value="${o[0]}" ${S.sortBy === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('');
    const adaFilter = !!(S.filterGuru || S.filterKelas || S.filterStatus);
    const th = JENIS.map(j => `<th class="pp-c">${esc(j.n)}</th>`).join('');
    const tiRekap = tenggatInfo(), telat = !!tiRekap && tiRekap.sisa < 0;
    let prevGuru = null;
    let body = ids.map(id => {
      const r = S.rows[id], c = hitung(r, id), d = r.docs || {};
      const awal = r.guruKey !== prevGuru; prevGuru = r.guruKey;
      const tds = JENIS.map(j => {
        const x = d[j.k], ada = !!(x && x.url), gen = !ada && genAda(j.k, id);
        let kls, ico, ttl;
        if (x && x.revisi) { kls = 'pp-rev'; ico = '⚠️'; ttl = 'Ada catatan revisi'; }
        else if (ada && isFinal(x)) { kls = 'pp-fin'; ico = '✓'; ttl = 'Final'; }
        else if (ada) { kls = 'pp-draf'; ico = '✎'; ttl = 'Draf'; }
        else if (gen) { kls = 'pp-gen'; ico = '🛠'; ttl = 'Dibuat di aplikasi'; }
        else { kls = 'pp-kosong'; ico = '·'; ttl = 'Belum diisi'; }
        const on = S.edit && S.edit.id === id && S.edit.j === j.k ? ' pp-on' : '';
        return `<td class="pp-c"><button type="button" class="pp-b ${kls}${on}" title="${esc(j.n)}: ${ttl}" aria-label="${esc(j.n)}: ${ttl}" data-act="edit" data-id="${esc(id)}" data-j="${j.k}">${ico}</button></td>`;
      }).join('');
      const panel = (S.edit && S.edit.id === id) ? `<tr><td colspan="${JENIS.length + 4}">${editorHtml(id, r, S.edit.j)}</td></tr>` : '';
      const pr = Math.round(c.final * 100 / c.total);
      return `<tr class="${awal ? 'pp-awal' : ''}"><td class="pp-guru">${awal ? esc(r.guruName) : ''}</td><td class="pp-mapel">${esc(r.mapel)}</td><td class="pp-kls">${esc(r.kelas)}</td>${tds}<td class="pp-fcell"><div class="pp-bar"><span style="width:${pr}%"></span></div><b>${c.final}/${c.total}</b>${telat && c.final < c.total ? '<div style="font-size:11px;color:#b91c1c;font-weight:700;">Terlambat</div>' : ''}</td></tr>${panel}`;
    }).join('');
    if (!ids.length) body = `<tr><td colspan="${JENIS.length + 4}" style="text-align:center;padding:16px;${muted}">${adaFilter ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada data perangkat pembelajaran untuk semester ini.'}</td></tr>`;
    const bl = belumIsi();
    const css = `<style>
.pp-rekap{font-size:14px}
.pp-wrap{overflow:auto;max-height:70vh;border:1px solid #d9e2de;border-radius:10px;background:#fff}
.pp-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:14px;color:#1f2937}
.pp-tbl thead th{position:sticky;top:0;z-index:3;background:#e8f1ed;color:#14532d;font-size:13px;font-weight:700;padding:12px 8px;text-align:left;border-bottom:2px solid #b7cfc4;white-space:nowrap}
.pp-tbl th.pp-c,.pp-tbl td.pp-c{text-align:center;padding:6px 4px}
.pp-tbl td{padding:8px 10px;border-bottom:1px solid #edf2f0;vertical-align:middle}
.pp-tbl tbody tr:not(.pp-awal-x):hover td{background:#f1f8f4}
.pp-tbl tr.pp-awal td{border-top:2px solid #cfe0d8}
.pp-guru{font-weight:700;white-space:nowrap;color:#111827;min-width:160px;max-width:160px;overflow:hidden;text-overflow:ellipsis;position:sticky;left:0;z-index:2;background:#fff}
.pp-mapel{min-width:180px;max-width:180px;position:sticky;left:160px;z-index:2;background:#fff;box-shadow:2px 0 0 #d9e2de}
.pp-tbl thead th:nth-child(1){position:sticky;left:0;z-index:5}
.pp-tbl thead th:nth-child(2){position:sticky;left:160px;z-index:5}
@media (max-width:700px){.pp-guru,.pp-mapel,.pp-tbl thead th:nth-child(1),.pp-tbl thead th:nth-child(2){position:static;box-shadow:none}.pp-tbl thead th{position:sticky}}
.pp-kls{white-space:nowrap;color:#374151}
.pp-b{border:0;cursor:pointer;width:36px;height:36px;border-radius:10px;font-size:16px;font-weight:700;line-height:1}
.pp-fin{background:#dcfce7;color:#166534}
.pp-draf{background:#fef3c7;color:#92400e}
.pp-gen{background:#dbeafe;color:#1e40af}
.pp-rev{background:#fed7aa;color:#9a3412}
.pp-kosong{background:transparent;color:#c3ccc8;font-size:22px}
.pp-kosong:hover{background:#f3f4f6}
.pp-on{outline:2px solid #2563eb}
.pp-fcell{min-width:90px;white-space:nowrap;font-size:13px}
.pp-bar{height:6px;border-radius:99px;background:#e5e7eb;margin-bottom:4px;overflow:hidden}
.pp-bar span{display:block;height:100%;background:#16a34a}
.pp-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#374151;margin:10px 0}
.pp-leg i{display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:6px;font-style:normal;font-weight:700;margin-right:5px;vertical-align:middle}
body.dark-mode .pp-wrap{background:#111827;border-color:#374151}body.dark-mode .pp-tbl{color:#e5e7eb}body.dark-mode .pp-tbl thead th{background:#1f3a2e;color:#d1fae5;border-color:#2f5846}body.dark-mode .pp-tbl td{border-color:#1f2937}body.dark-mode .pp-guru{color:#f9fafb;background:#111827}body.dark-mode .pp-mapel{background:#111827;box-shadow:2px 0 0 #374151}body.dark-mode .pp-leg{color:#d1d5db}body.dark-mode .pp-tbl tr.pp-awal td{border-top-color:#374151}body.dark-mode .pp-tbl tbody tr:hover td{background:#1c2b3a}body.dark-mode .pp-bar{background:#374151}
</style>`;
    return `${css}<div class="pp-rekap"><div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <select class="field" style="max-width:220px;font-size:14px;" data-act="filter-guru">${opt}</select>
      <select class="field" style="max-width:150px;font-size:14px;" data-act="filter-kelas">${optKelas}</select>
      <select class="field" style="max-width:200px;font-size:14px;" data-act="filter-status">${optStatus}</select>
      <select class="field" style="max-width:210px;font-size:14px;" data-act="urut">${optUrut}</select>
      ${adaFilter ? '<button class="btn btn-soft" style="padding:8px 14px;font-size:13px;" data-act="filter-reset">✖ Reset filter</button>' : ''}
      <span style="font-size:14px;">Kelengkapan final: <b>${pct}%</b> (${fin}/${tot})</span>
      <button class="btn ${S.setujuBuka ? 'btn-success' : 'btn-soft'}" style="padding:8px 14px;font-size:13px;" data-act="setuju-buka">✅ Setujui massal</button>
      <button class="btn ${S.waBuka ? 'btn-success' : 'btn-soft'}" style="padding:8px 14px;font-size:13px;" data-act="wa-buka">💬 Pengingat WA</button>
      <button class="btn btn-soft" style="padding:8px 14px;font-size:13px;" data-act="pengingat" title="Kirim notifikasi ke akun guru di dalam aplikasi">🔔 Notifikasi aplikasi</button>
      <button class="btn btn-soft" style="padding:8px 14px;font-size:13px;" data-act="xlsx">📊 Unduh Excel</button>
      <button class="btn btn-soft" style="padding:8px 14px;font-size:13px;" data-act="csv">⬇️ Unduh CSV</button></div>
      ${setujuPanel()}${waPanel()}
      <div class="pp-leg"><span><i class="pp-fin">✓</i>Final</span><span><i class="pp-draf">✎</i>Draf</span><span><i class="pp-gen">🛠</i>Dibuat di aplikasi</span><span><i class="pp-rev">⚠️</i>Ada catatan revisi</span><span><i class="pp-kosong" style="font-size:18px">·</i>Belum diisi</span></div>
      <div style="${muted}margin:0 0 8px;font-size:13px;">Klik kotak status untuk membuka tautan atau memberi catatan.</div>
      <div class="pp-wrap"><table class="pp-tbl"><thead><tr><th>Guru</th><th>Mapel</th><th>Kelas</th>${th}<th>Final</th></tr></thead><tbody>${body}</tbody></table></div></div>
      ${bl.length ? `<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">Belum ada data dari: ${bl.map(esc).join(', ')}</div>` : ''}`;
  }

  // ---------- Pengingat ke guru (lewat notifikasi aplikasi: v4Notify di app.js) ----------
  // Sasaran = guru pada daftar rekap yang sedang tampil (ikut filter) yang masih punya dokumen belum final,
  // ditambah guru yang belum menambahkan mapel sama sekali (hanya bila tidak ada filter aktif).
  function pengingatSasaran() {
    const m = {};
    lihatIds().forEach(id => {
      const r = S.rows[id], d = r.docs || {};
      const kurang = JENIS.filter(j => { const x = d[j.k]; return !(x && x.url && isFinal(x)); }).map(j => j.n);
      if (!kurang.length) return;
      if (!m[r.guruKey]) m[r.guruKey] = { nama: r.guruName || r.guruKey, baris: [] };
      m[r.guruKey].baris.push(r.mapel + ' ' + r.kelas + ' (' + kurang.join(', ') + ')');
    });
    const kosong = [];
    if (!S.filterGuru && !S.filterKelas && !S.filterStatus) {
      let arr = [];
      try { arr = (typeof allGuru !== 'undefined' && allGuru) ? (Array.isArray(allGuru) ? allGuru : Object.values(allGuru)) : []; } catch (e) { arr = []; }
      const ada = guruList();
      arr.forEach(g => { if (g && g.key && g.name && !ada[g.key] && !Object.values(ada).includes(g.name)) kosong.push({ key: g.key, nama: g.name }); });
    }
    return { isi: m, kosong: kosong };
  }
  // ---------- Persetujuan massal (Kepala/Admin) ----------
  // Hanya dokumen yang: jenisnya memang perlu persetujuan, tautannya sudah diisi guru, ditandai FINAL oleh guru, belum disetujui,
  // dan bukan milik penyetuju sendiri. Dokumen draf / tanpa tautan tidak pernah ikut disetujui.
  function setujuKandidat(gk) {
    const items = [];
    lihatIds().forEach(id => {
      const r = S.rows[id]; if (!r || r.guruKey !== gk || r.guruKey === myId()) return;
      JENIS.forEach(j => { const x = (r.docs || {})[j.k]; if (j.setuju && x && x.url && x.status === 'final' && !x.setuju) items.push({ id: id, jk: j.k, n: j.n, r: r }); });
    });
    return items;
  }
  function setujuPanel() {
    if (!S.setujuBuka || !isAdm()) return '';
    const g = {};
    lihatIds().forEach(id => { const r = S.rows[id]; if (r && r.guruKey && !g[r.guruKey]) g[r.guruKey] = r.guruName || r.guruKey; });
    const l = Object.keys(g).map(k => ({ key: k, nama: g[k], it: setujuKandidat(k) })).filter(o => o.it.length)
      .sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
    const box = 'margin:10px 0;padding:12px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;color:#1f2937;';
    if (!l.length) return `<div style="${box}font-size:14px;">Tidak ada dokumen yang menunggu persetujuan pada daftar ini. Yang bisa disetujui massal hanya dokumen berstatus <b>Final</b> dari guru yang tautannya sudah diisi.</div>`;
    const rows = l.map(o => {
      const per = {}; o.it.forEach(x => { per[x.n] = (per[x.n] || 0) + 1; });
      const ket = Object.keys(per).map(n => n + (per[n] > 1 ? ' ×' + per[n] : '')).join(', ');
      return `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid #dbeafe;"><div style="font-size:14px;"><b>${esc(o.nama)}</b><div style="${muted}font-size:13px;">${esc(ket)}</div></div><button class="btn btn-success" style="padding:8px 14px;font-size:13px;" data-act="setuju-guru" data-id="${esc(o.key)}">✅ Setujui ${o.it.length} dokumen</button></div>`;
    }).join('');
    return `<div style="${box}"><div style="font-size:14px;margin-bottom:4px;"><b>Persetujuan massal (${l.length} guru)</b></div><div style="${muted}font-size:13px;margin-bottom:6px;">Hanya dokumen berstatus Final dengan tautan terisi. Tiap tombol meminta konfirmasi dulu. Persetujuan membuat cetakan guru memuat QR tanda tangan Kepala.</div>${rows}</div>`;
  }
  function setujuMassal(gk) {
    if (!isAdm()) return;
    if (gk === myId()) return say('Persetujuan tidak boleh diberikan pada dokumen sendiri.', true);
    const items = setujuKandidat(gk);
    if (!items.length) return say('Tidak ada dokumen yang bisa disetujui.', true);
    const nama = items[0].r.guruName || gk;
    const ket = items.length + ' dokumen milik ' + nama + ':\n' + items.map(x => '- ' + x.n + ' ' + x.r.mapel + ' ' + x.r.kelas).join('\n');
    const kpNama = (typeof MADRASAH !== 'undefined' && MADRASAH.kepala_sekolah) || '';
    const kepsek = typeof v4IsHead === 'function' && v4IsHead();
    let atasNama = kpNama || myName();
    if (kepsek) { if (!confirm('Setujui ' + ket + '?')) return; }
    else {
      const jawab = prompt('Setujui ' + ket + '\n\nDisetujui atas nama siapa? (Admin tetap tercatat sebagai yang menginput.)', kpNama);
      if (jawab === null) return;
      atasNama = String(jawab).trim() || kpNama || myName();
    }
    const now = new Date().toISOString(), upd = {};
    items.forEach(x => { upd[x.id + '/docs/' + x.jk + '/setuju'] = { oleh: String(atasNama).slice(0, 100), peran: kepsek ? 'Kepala' : 'Admin', at: now }; });
    tulis('perangkat_v4', upd, () => {
      items.forEach(x => { const d = (S.rows[x.id].docs = S.rows[x.id].docs || {}); d[x.jk] = d[x.jk] || {}; d[x.jk].setuju = upd[x.id + '/docs/' + x.jk + '/setuju']; });
      say('✅ ' + items.length + ' dokumen disetujui');
    }, 'APPROVE_PERANGKAT_BULK', taSlug() + '_' + S.sem + '_' + gk);
  }

  // ---------- Pengingat lewat WhatsApp (wa.me, sama seperti Infaq: Admin tinggal menekan kirim di WhatsApp-nya) ----------
  function noWaGuru(key, nama) {
    let arr = [];
    try { arr = (typeof allGuru !== 'undefined' && allGuru) ? (Array.isArray(allGuru) ? allGuru : Object.values(allGuru)) : []; } catch (e) { arr = []; }
    const g = arr.find(x => x && x.key === key) || arr.find(x => x && x.name === nama);
    return g && g.noWa ? String(g.noWa) : '';
  }
  function waDaftar() {
    const s = pengingatSasaran(), out = [];
    Object.keys(s.isi).forEach(k => out.push({ key: k, nama: s.isi[k].nama, baris: s.isi[k].baris, kosong: false }));
    s.kosong.forEach(g => out.push({ key: g.key, nama: g.nama, baris: [], kosong: true }));
    out.forEach(o => { o.noWa = noWaGuru(o.key, o.nama); });
    return out.sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id'));
  }
  function pesanWa(o) {
    const sem = (SEM_LABEL[S.sem] || S.sem) + ' ' + taText();
    const isi = o.kosong
      ? 'Anda belum menambahkan mapel/kelas di menu Perangkat Pembelajaran semester ' + sem + '.'
      : 'Perangkat pembelajaran semester ' + sem + ' yang belum final:\n' + o.baris.map(b => '- ' + b).join('\n');
    const tt = tenggatTeks();
    return 'Assalamu\'alaikum Bapak/Ibu ' + o.nama + ',\n\nPengingat dari Admin SI MAMBA.\n' + isi + (tt ? '\n\n' + tt : '') + '\n\nMohon dilengkapi lewat menu Perangkat Pembelajaran. Jazakumullah khairan.';
  }
  function waPanel() {
    if (!S.waBuka) return '';
    const l = waDaftar();
    const box = 'margin:10px 0;padding:12px;border-radius:10px;background:#f0fdf4;border:1px solid #bbf7d0;color:#1f2937;';
    if (!l.length) return `<div style="${box}font-size:14px;">Tidak ada guru yang perlu diingatkan pada daftar ini.</div>`;
    const rows = l.map(o => {
      const ti = tenggatInfo();
      const ket = (o.kosong ? 'Belum menambahkan mapel' : o.baris.length + ' mapel belum lengkap') + (ti && ti.sisa < 0 ? ' · terlambat ' + (-ti.sisa) + ' hari' : '');
      const aksi = !o.noWa ? `<span style="font-size:13px;color:#b45309;">No. WA belum diisi (lengkapi di Data Guru)</span>`
        : `<button class="btn ${S.waSudah[o.key] ? 'btn-soft' : 'btn-success'}" style="padding:8px 14px;font-size:13px;" data-act="wa-guru" data-id="${esc(o.key)}">${S.waSudah[o.key] ? '✓ Sudah dibuka · kirim lagi' : '💬 Kirim WA'}</button>`;
      return `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid #d1fae5;"><div style="font-size:14px;"><b>${esc(o.nama)}</b><div style="${muted}font-size:13px;">${esc(ket)}</div></div>${aksi}</div>`;
    }).join('');
    return `<div style="${box}"><div style="font-size:14px;margin-bottom:4px;"><b>Pengingat lewat WhatsApp (${l.length} guru)</b></div><div style="${muted}font-size:13px;margin-bottom:6px;">Tekan tombol di tiap guru: WhatsApp terbuka dengan pesan sudah terisi, Anda tinggal menekan kirim.</div>${rows}</div>`;
  }
  function kirimWaGuru(key) {
    const o = waDaftar().find(x => x.key === key);
    if (!o) return say('Guru tidak ada lagi pada daftar.', true);
    if (typeof kirimWA !== 'function') return say('Fungsi WhatsApp belum tersedia.', true);
    kirimWA(o.noWa, pesanWa(o));
    S.waSudah[key] = true; render();
  }
  function kirimPengingat() {
    if (!isAdm()) return;
    if (typeof v4Notify !== 'function') return say('Fitur notifikasi belum tersedia.', true);
    if (!navigator.onLine) return say('Perlu koneksi internet untuk mengirim.', true);
    if (S.busy) return;
    const s = pengingatSasaran(), kunci = Object.keys(s.isi), n = kunci.length + s.kosong.length;
    if (!n) return say('Tidak ada guru yang perlu diingatkan pada daftar ini.');
    if (!confirm('Kirim pengingat perangkat pembelajaran (' + (SEM_LABEL[S.sem] || S.sem) + ') ke ' + n + ' guru?\n\nSetiap guru menerima notifikasi berisi dokumen yang belum final.')) return;
    S.busy = true;
    const judul = 'Pengingat Perangkat Pembelajaran', ref = taSlug() + '_' + S.sem, tugas = [];
    kunci.forEach(k => {
      let msg = 'Perangkat semester ' + (SEM_LABEL[S.sem] || S.sem) + ' yang belum final: ' + s.isi[k].baris.join('; ') + '. Mohon dilengkapi.' + (tenggatTeks() ? ' ' + tenggatTeks() : '');
      if (msg.length > 400) msg = msg.slice(0, 397) + '...';
      tugas.push(v4Notify(judul, msg, 'INFO', k, 'PERANGKAT', ref));
    });
    s.kosong.forEach(g => tugas.push(v4Notify(judul, 'Anda belum menambahkan mapel/kelas di menu Perangkat Pembelajaran semester ' + (SEM_LABEL[S.sem] || S.sem) + '. Mohon dilengkapi.', 'INFO', g.key, 'PERANGKAT', ref)));
    Promise.all(tugas).then(() => {
      S.busy = false; audit('SEND_PERANGKAT_REMINDER', ref, { jumlahGuru: n }); say('✅ Pengingat terkirim ke ' + n + ' guru');
    }).catch(e => { S.busy = false; console.error('[SI MAMBA] perangkat:', e); say('❌ Sebagian/semua pengingat gagal terkirim: ' + ((e && e.message) || e), true); });
  }

  // Excel (.xlsx) memakai SheetJS yang sudah dimuat aplikasi lewat ensureLib('xlsx'). Edisi ini tidak bisa mewarnai sel,
  // jadi status ditulis sebagai teks (Final / Draf / Dibuat di aplikasi / Belum) dan tabel diberi filter otomatis.
  function unduhXlsx() {
    if (typeof ensureLib !== 'function') return say('Fitur Excel belum tersedia di aplikasi ini.', true);
    const ids = lihatIds();
    if (!ids.length) return say('Tidak ada data untuk diunduh.', true);
    say('⏳ Menyiapkan Excel...', false, 1500);
    ensureLib('xlsx').then(() => {
      const sem = SEM_LABEL[S.sem] || S.sem;
      const head = ['Tahun Ajaran', 'Semester', 'Guru', 'Mapel', 'Kelas'].concat(JENIS.map(j => j.n), ['Jumlah Final', 'Total', 'Persen Final']);
      const data = [head];
      const perJenis = {}; JENIS.forEach(j => { perJenis[j.k] = { final: 0, draf: 0, belum: 0 }; });
      const perGuru = {};
      ids.forEach(id => {
        const r = S.rows[id], c = hitung(r, id), d = r.docs || {};
        const sel = JENIS.map(j => {
          const x = d[j.k]; let t;
          if (x && x.url) { t = isFinal(x) ? 'Final' : 'Draf'; if (x.revisi) t += ' (revisi)'; perJenis[j.k][isFinal(x) ? 'final' : 'draf']++; }
          else if (genAda(j.k, id)) { t = 'Dibuat di aplikasi'; perJenis[j.k].draf++; }
          else { t = 'Belum'; perJenis[j.k].belum++; }
          return t;
        });
        data.push([r.tahunAjaran || taText(), sem, r.guruName || '', r.mapel || '', r.kelas || ''].concat(sel, [c.final, c.total, c.total ? Math.round(c.final * 100 / c.total) / 100 : 0]));
        const g = perGuru[r.guruKey] = perGuru[r.guruKey] || { nama: r.guruName || r.guruKey, mapel: 0, fin: 0, tot: 0 };
        g.mapel++; g.fin += c.final; g.tot += c.total;
      });
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 30 }, { wch: 8 }].concat(JENIS.map(() => ({ wch: 16 })), [{ wch: 13 }, { wch: 8 }, { wch: 13 }]);
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: head.length - 1 } }) };
      for (let r = 1; r < data.length; r++) { const cell = ws[XLSX.utils.encode_cell({ r: r, c: head.length - 1 })]; if (cell) cell.z = '0%'; }
      const ti = tenggatInfo();
      const ring = [['Rekap Perangkat Pembelajaran'], ['Tahun ajaran', taText()], ['Semester', sem], ['Batas pengumpulan', ti ? ti.label + ' (' + ketTenggat(ti) + ')' : '-'], ['Dibuat pada', new Date().toLocaleString('id-ID')], [],
        ['Per jenis dokumen', 'Final', 'Draf / dibuat di aplikasi', 'Belum']]
        .concat(JENIS.map(j => [j.full, perJenis[j.k].final, perJenis[j.k].draf, perJenis[j.k].belum]), [[],
          ['Per guru', 'Jumlah mapel', 'Dokumen final', 'Total dokumen', 'Persen final']],
          Object.keys(perGuru).map(k => perGuru[k]).sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id')).map(g => [g.nama, g.mapel, g.fin, g.tot, g.tot ? Math.round(g.fin * 100 / g.tot) / 100 : 0]));
      const ws2 = XLSX.utils.aoa_to_sheet(ring);
      ws2['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 14 }];
      Object.keys(ws2).forEach(a => { if (a[0] !== '!' && ws2[a].t === 'n' && /^E\d+$/.test(a)) ws2[a].z = '0%'; });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
      XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan');
      XLSX.writeFile(wb, 'Rekap_Perangkat_' + taSlug() + '_' + S.sem + '.xlsx');
      say('✅ Excel diunduh');
    }).catch(e => { console.error('[SI MAMBA] perangkat:', e); say('❌ Gagal menyiapkan Excel: ' + ((e && e.message) || e), true); });
  }

  function unduhCsv() {
    const ids = lihatIds();
    const head = ['Tahun Ajaran', 'Semester', 'Guru', 'Mapel', 'Kelas'].concat(JENIS.map(j => j.full), ['Jumlah Final', 'Jumlah Draf']);
    const lines = [head.map(csvCell).join(',')];
    ids.forEach(id => {
      const r = S.rows[id], c = hitung(r, id), d = r.docs || {};
      const cells = [r.tahunAjaran, SEM_LABEL[r.semester] || r.semester, r.guruName, r.mapel, r.kelas]
        .concat(JENIS.map(j => { const x = d[j.k]; return x && x.url ? (isFinal(x) ? 'Final' : 'Draf') + (x.revisi ? ' (revisi)' : '') : (genAda(j.k, id) ? 'Dibuat di aplikasi' : 'Belum'); }), [c.final, c.draf]);
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
    upd[b + 'revisi'] = null; upd[b + 'revisiBy'] = null; upd[b + 'setuju'] = null; upd.updatedAt = now; // guru menyimpan ulang = catatan revisi dianggap ditindaklanjuti
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
  function setujuDoc(id, jk, cabut) {
    const rec = S.rows[id], j = JENIS.find(z => z.k === jk); if (!rec || !j || !j.setuju || !isAdm()) return;
    if (rec.guruKey === myId()) return say('Persetujuan tidak boleh diberikan pada dokumen sendiri.', true);
    const x = (rec.docs || {})[jk] || {};
    if (!cabut && !(x.url || genAda(jk, id))) return say('Dokumen belum ada.', true);
    const ket = j.n + ' ' + (rec.guruName || '') + ' · ' + rec.mapel + ' ' + rec.kelas;
    // Persetujuan SELALU atas nama Kepala. Kepsek menyetujui sendiri; bila Admin yang menekan, nama Kepala sudah terisi
    // (boleh diganti) dan peran "Admin" tetap tercatat di keterangan QR supaya jelas siapa yang menginput.
    const kpNama = (typeof MADRASAH !== 'undefined' && MADRASAH.kepala_sekolah) || '';
    const kepsek = typeof v4IsHead === 'function' && v4IsHead();
    let atasNama = kpNama || myName();
    if (cabut || kepsek) { if (!confirm((cabut ? 'Cabut persetujuan ' : 'Setujui ') + ket + '?')) return; }
    else {
      const jawab = prompt('Setujui ' + ket + '\n\nDisetujui atas nama siapa? (Admin tetap tercatat sebagai yang menginput.)', kpNama);
      if (jawab === null) return;
      atasNama = String(jawab).trim() || kpNama || myName();
    }
    const now = new Date().toISOString(), upd = {};
    upd['docs/' + jk + '/setuju'] = cabut ? null : { oleh: String(atasNama).slice(0, 100), peran: kepsek ? 'Kepala' : 'Admin', at: now };
    tulis('perangkat_v4/' + id, upd, () => {
      rec.docs = rec.docs || {}; rec.docs[jk] = rec.docs[jk] || {};
      if (cabut) delete rec.docs[jk].setuju; else rec.docs[jk].setuju = upd['docs/' + jk + '/setuju'];
      say(cabut ? 'Persetujuan dicabut' : '✅ Dokumen disetujui');
    }, cabut ? 'REVOKE_PERANGKAT_DOC' : 'APPROVE_PERANGKAT_DOC', id);
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
    // Ditulis per-field (bukan menimpa seluruh catatan) supaya tanggal tenggat yang tersimpan di catatan yang sama tidak ikut terhapus.
    tulis('perangkat_kaldik_v4/' + taSlug() + '_' + S.sem, rec, () => { S.kaldik = Object.assign({}, S.kaldik || {}, rec); S.kaldikEdit = false; say('✅ Kaldik tersimpan'); }, 'SAVE_PERANGKAT_KALDIK', taSlug() + '_' + S.sem);
  }
  function hapusKaldik() {
    if (!isAdm() || !confirm('Hapus tautan Kaldik semester ini?')) return;
    tulis('perangkat_kaldik_v4/' + taSlug() + '_' + S.sem, { judul: null, url: null, at: null, by: null }, () => { const t = S.kaldik && S.kaldik.tenggat; S.kaldik = t ? { tenggat: t } : null; S.kaldikEdit = false; say('Tautan Kaldik dihapus'); }, 'DELETE_PERANGKAT_KALDIK', taSlug() + '_' + S.sem);
  }

  // ---------- Batas waktu pengumpulan (satu tanggal per semester, tersimpan di catatan Kaldik: perangkat_kaldik_v4/<ta>_<sem>/tenggat) ----------
  function hariIni() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function tenggatInfo() {
    const t = S.kaldik && S.kaldik.tenggat;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t || '') || isNaN(Date.parse(t + 'T00:00:00Z'))) return null;
    const sisa = Math.round((Date.parse(t + 'T00:00:00Z') - Date.parse(hariIni() + 'T00:00:00Z')) / 864e5);
    return { tgl: t, sisa: sisa, label: tglPendek(t + 'T00:00:00') };
  }
  function ketTenggat(i) { return i.sisa > 0 ? i.sisa + ' hari lagi' : i.sisa === 0 ? 'hari ini' : 'terlambat ' + (-i.sisa) + ' hari'; }
  function tenggatTeks() { const i = tenggatInfo(); return i ? 'Batas pengumpulan: ' + i.label + ' (' + ketTenggat(i) + ').' : ''; }
  function tenggatBaris() {
    const i = tenggatInfo(); if (!i) return '';
    const w = i.sisa < 0 ? '#b91c1c' : i.sisa <= 7 ? '#b45309' : '#166534';
    return `<div style="font-size:13px;margin:4px 0 8px;">⏰ Batas pengumpulan: <b>${esc(i.label)}</b> <span style="color:${w};font-weight:700;">(${ketTenggat(i)})</span></div>`;
  }
  function tenggatHtml(adm) {
    const i = tenggatInfo();
    let h = `<div style="margin-top:8px;font-size:14px;">⏰ Batas pengumpulan perangkat: ` + (i
      ? `<b>${esc(i.label)}</b> <span style="color:${i.sisa < 0 ? '#b91c1c' : i.sisa <= 7 ? '#b45309' : '#166534'};font-weight:700;">(${ketTenggat(i)})</span>`
      : `<span style="${muted}font-size:13px;">belum ditetapkan</span>`);
    if (adm && !S.tenggatEdit) h += ` <button class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin-left:6px;" data-act="tenggat-edit">✏️ ${i ? 'Ubah' : 'Atur'} tanggal</button>`;
    h += '</div>';
    if (adm && S.tenggatEdit) h += `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;"><input id="ppTenggat" type="date" class="field" style="max-width:170px;" value="${esc(i ? i.tgl : '')}"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="tenggat-simpan">💾 Simpan</button>${i ? '<button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tenggat-hapus">🗑 Hapus</button>' : ''}<button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tenggat-batal">Batal</button></div>`;
    return h;
  }
  function simpanTenggat(hapus) {
    if (!isAdm()) return;
    const v = hapus ? null : ((document.getElementById('ppTenggat') || {}).value || '').trim();
    if (!hapus && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v + 'T00:00:00Z')))) return say('Pilih tanggal yang valid.', true);
    const key = taSlug() + '_' + S.sem;
    tulis('perangkat_kaldik_v4/' + key, { tenggat: v }, () => {
      S.kaldik = Object.assign({}, S.kaldik || {}); if (v) S.kaldik.tenggat = v; else delete S.kaldik.tenggat;
      S.tenggatEdit = false; say(v ? '✅ Tenggat tersimpan' : 'Tenggat dihapus');
    }, 'SAVE_PERANGKAT_TENGGAT', key);
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
      case 'setuju': return setujuDoc(id, j, false);
      case 'cabut-setuju': return setujuDoc(id, j, true);
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
      case 'filter-reset': S.filterGuru = ''; S.filterKelas = ''; S.filterStatus = ''; S.edit = null; return render();
      case 'tenggat-edit': S.tenggatEdit = true; return render();
      case 'tenggat-batal': S.tenggatEdit = false; return render();
      case 'tenggat-simpan': return simpanTenggat(false);
      case 'tenggat-hapus': return simpanTenggat(true);
      case 'setuju-buka': S.setujuBuka = !S.setujuBuka; S.edit = null; return render();
      case 'setuju-guru': return setujuMassal(id);
      case 'xlsx': return unduhXlsx();
      case 'wa-buka': S.waBuka = !S.waBuka; S.edit = null; return render();
      case 'wa-guru': return kirimWaGuru(id);
      case 'pengingat': return kirimPengingat();
      case 'csv': return unduhCsv();
    }
  }
  function ubah(e) {
    const t = e.target; if (!t || !t.getAttribute) return;
    const a = t.getAttribute('data-act');
    if (a === 'sem') { S.sem = t.value === 'genap' ? 'genap' : 'ganjil'; S.filterGuru = ''; S.waSudah = {}; muat(); }
    else if (a === 'filter-guru') { S.filterGuru = t.value; S.edit = null; render(); }
    else if (a === 'filter-kelas') { S.filterKelas = t.value; S.edit = null; render(); }
    else if (a === 'filter-status') { S.filterStatus = t.value; S.edit = null; render(); }
    else if (a === 'urut') { S.sortBy = t.value === 'asc' || t.value === 'desc' ? t.value : ''; S.edit = null; render(); }
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
    S.filterGuru = ''; S.filterKelas = ''; S.filterStatus = ''; S.sortBy = ''; S.waBuka = false; S.waSudah = {}; S.tenggatEdit = false; S.setujuBuka = false; S.busy = false; S.kaldikEdit = false; S.sem = semDefault();
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
