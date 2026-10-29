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
       mapel, kelas, updatedAt, folderUrl (opsional: tautan folder Drive mapel/kelas ini), docs: { rpe|prota|promes|atp|tp|kisi|kartu|kunci: { url, status, at, by, revisi, revisiBy } } }
   perangkat_kaldik_v4/<ta>_<semester> = { judul, url, at, by }
============================================================ */
(function () {
  'use strict';

  const JENIS = [
    // setuju: true = dokumen ini disahkan Kepala (tombol Setujui muncul; blok Kepala di cetakan berisi QR hanya setelah disetujui).
    //         false = blok Kepala di cetakan tetap kosong untuk tanda tangan basah. Ubah true/false di sini saja.
    { k: 'rpe',    n: 'RPE',               full: 'RPE (Rencana Pekan Efektif)', setuju: true },
    { k: 'atp',    n: 'ATP',               full: 'ATP (Alur Tujuan Pembelajaran)', setuju: true },
    { k: 'tp',     n: 'TP',                full: 'TP (Tujuan Pembelajaran)', setuju: false },
    { k: 'prota',  n: 'Prota',             full: 'Prota (Program Tahunan)', setuju: true },
    { k: 'promes', n: 'Promes',            full: 'Promes (Program Semester)', setuju: true },
    { k: 'kisi',   n: 'Kisi-kisi',         full: 'Kisi-kisi Asesmen', setuju: true },
    { k: 'kartu',  n: 'Kartu Soal',        full: 'Kartu Soal', setuju: true },
    { k: 'kunci',  n: 'Kunci & Penskoran', full: 'Kunci Jawaban dan Pedoman Penskoran', setuju: true }
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
    if (boleh) return (x.url || genAda(jk, id) || viaFolder(x, id))
      ? `<div style="margin-bottom:8px;"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="setuju" data-id="${esc(id)}" data-j="${jk}">✅ Setujui dokumen ini</button><div style="${muted}margin-top:4px;">Setelah disetujui, cetakan guru memuat QR tanda tangan Kepala. Bila guru mengubah dokumen, persetujuan otomatis gugur.</div></div>`
      : `<div style="${muted}margin-bottom:8px;">Belum bisa disetujui: guru belum mengisi tautan atau membuat dokumen.</div>`;
    return `<div style="${muted}margin-bottom:8px;">Dokumen ini perlu persetujuan Kepala sebelum cetakannya memuat QR tanda tangan Kepala.</div>`;
  }
  // ---------- Penanda "sudah dilihat" (Kepala & Admin) ----------
  // Disimpan di docs/<jenis>/dilihat/<kepala|admin> = { oleh, peran, at }. Hilang otomatis bila guru menyimpan ulang tautannya.
  const peranKey = () => (typeof v4IsHead === 'function' && v4IsHead()) ? 'kepala' : 'admin';
  const dilihatAda = x => !!(x && x.dilihat && (x.dilihat.kepala || x.dilihat.admin));
  function dilihatHtml(id, rec, jk, x) {
    if (!(x.url || genAda(jk, id) || viaFolder(x, id))) return '';
    const dl = x.dilihat || {}, pk = peranKey();
    const info = ['kepala', 'admin'].filter(k => dl[k]).map(k => (k === 'kepala' ? 'Kepala' : 'Admin') + ' (' + esc(dl[k].oleh || '-') + ', ' + esc(tglPendek(dl[k].at)) + ')').join(' · ');
    const sudah = !!dl[pk];
    return `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;color:#1e3a8a;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span>👁 ${info ? 'Sudah dilihat: ' + info : 'Belum dilihat Kepala/Admin'}</span>
      <button class="btn ${sudah ? 'btn-soft' : 'btn-success'}" style="padding:4px 10px;font-size:11px;" data-act="${sudah ? 'batal-dilihat' : 'dilihat'}" data-id="${esc(id)}" data-j="${jk}">${sudah ? 'Batalkan tanda saya' : '👁 Tandai sudah saya lihat'}</button></div>`;
  }
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };

  function semDefault() { const m = new Date().getMonth() + 1; return (m >= 7 && m <= 12) ? 'ganjil' : 'genap'; }

  const S = { sem: semDefault(), rows: {}, kaldik: null, rpeKaldik: null, jadwalSemua: null, jadwal: null, siap: false, err: null, epoch: 0, view: 'saya',
              edit: null, tambah: false, filterGuru: '', filterStatus: '', filterKelas: '', sortBy: '', waBuka: false, waSudah: {}, tenggatEdit: false, setujuBuka: false, busy: false, kaldikEdit: false, buka: {}, bukaNow: {}, semuaBuka: false };

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
  // Tautan dari database dicek lagi saat ditampilkan: hanya https yang menjadi href (cegah javascript:/data: bila data ditulis langsung ke RTDB).
  const amanUrl = u => urlOk(u) ? String(u).trim() : '#';
  // Kunci data per dokumen yang dibuat di aplikasi (format id sama dengan modul masing-masing).
  function genKeys(node, bersemester) {
    const pre = taSlug() + '_' + (bersemester ? S.sem + '_' : '') + (isAdm() ? '' : slug(myId()) + '_');
    return db.ref(node).orderByKey().startAt(pre).endAt(pre + '\uf8ff').once('value')
      .then(sn => { const o = {}; sn.forEach(c => { o[c.key] = 1; }); return o; })
      .catch(() => ({}));
  }
  // id baris = ta_sem_guru_mapel_kelas. TP tidak bersemester, jadi kuncinya ta_guru_mapel_kelas.
  function genAda(jk, id) {
    // RPE tidak disimpan sebagai dokumen; ia dihitung dari kalender efektif semester + JP per pekan.
    // Dianggap ada (dan otomatis final) bila keduanya diketahui.
    if (jk === 'rpe') { const r = S.rows && S.rows[id]; return !!(S.rpeKaldik && r && rpeJp(r) >= 1); }
    const g = S.gen || {}, p = String(id || '').split('_');
    if (p.length !== 5) return false;
    if (jk === 'atp' || jk === 'tp') return !!(g.tp && g.tp[[p[0], p[2], p[3], p[4]].join('_')]);
    if (jk === 'kisi') return !!(g.kisi && g.kisi[id]);
    if (jk === 'kartu' || jk === 'kunci') return !!(g.soal && g.soal[id]);
    if (jk === 'prota' || jk === 'promes') return !!(g.materi && g.materi[id]);
    return false;
  }
  // Dokumen buatan aplikasi yang ditandai FINAL oleh guru tanpa tautan Google Drive (docs/<jenis>/app = true).
  // Hanya sah selama datanya masih ada di aplikasi (genAda).
  // Tautan folder Drive per mapel/kelas (perangkat_v4/<id>/folderUrl). Dokumen berstatus Final tanpa tautan sendiri
  // dan tanpa data aplikasi dianggap final "lewat folder" selama folder itu masih tersimpan.
  const folderRow = id => { const r = S.rows && S.rows[id]; return (r && urlOk(r.folderUrl)) ? String(r.folderUrl).trim() : ''; };
  function viaFolder(x, id) { return !!(x && !x.url && x.app !== true && x.status === 'final' && folderRow(id)); }
  function appFinal(x, jk, id) {
    if (jk === 'rpe') return !(x && x.url) && genAda('rpe', id);
    // Dokumen aplikasi (tanpa tautan) yang sudah DISETUJUI Kepala/Admin juga dihitung final, sama seperti dokumen bertautan
    // (lihat isFinal). Tanpa ini, kotak tabel tetap biru dan hitungan final tidak naik walau persetujuan sudah tersimpan.
    return !!(x && !x.url && x.app === true && x.status === 'final' && genAda(jk, id)) || viaFolder(x, id) || !!(x && !x.url && x.setuju && genAda(jk, id));
  }
  // Dokumen aplikasi yang DIAJUKAN guru dan belum disetujui Kepala/Admin (hanya jenis yang memang perlu persetujuan; lihat JENIS.setuju).
  function menunggu(x, jk, id) { return !!(x && !x.url && x.app === true && x.diajukan && !x.setuju && x.status !== 'final' && genAda(jk, id)); }
  const perluSetuju = jk => !!(JENIS.find(z => z.k === jk) || {}).setuju;
  const folderLink = (f, t) => `<a href="${esc(f)}" target="_blank" rel="noopener noreferrer"><b>${t || 'Buka folder'}</b></a>`;
  function folderHint(id) { const f = folderRow(id); return f ? `<div style="font-size:12px;margin-bottom:6px;">📁 Folder Drive guru: ${folderLink(f, 'Buka')}</div>` : ''; }
  function folderHtml(id, rec) {
    const f = folderRow(id), own = rec.guruKey === myId();
    if (!f && !own) return '';
    return `<div style="margin-top:6px;font-size:12px;">📁 Folder Drive: ${f ? folderLink(f, 'Buka') : '<span style="color:#6b7280;">belum diisi (opsional)</span>'}${own ? ` <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:6px;" data-act="folder-ubah" data-id="${esc(id)}">${f ? 'Ubah' : 'Tambah tautan folder'}</button>` : ''}</div>`;
  }
  function selesai(x, jk, id) { return !!(x && x.url && isFinal(x)) || appFinal(x, jk, id); }
  const APP_ACT = { rpe: 'rpe', atp: 'atp', tp: 'atp', kisi: 'kisi', kartu: 'soal', kunci: 'soal', prota: 'prota', promes: 'prota' };
  // ---------- Urutan pengisian ----------
  // Tahap berikutnya TERTUTUP (tombol bergembok) sampai semua dokumen tahap sebelumnya selesai (final/disetujui, atau sudah DIAJUKAN ke Kepala; RPE otomatis).
  // Berlaku hanya untuk pemilik perangkat. Tahap yang SUDAH ada isinya tetap terbuka supaya pekerjaan lama tidak terkunci.
  const TAHAP = [
    { a: 'rpe',   n: 'RPE',          jk: ['rpe'] },
    { a: 'atp',   n: 'ATP/TP',       jk: ['atp', 'tp'] },
    { a: 'prota', n: 'Prota/Promes', jk: ['prota', 'promes'] },
    { a: 'kisi',  n: 'Kisi-kisi',    jk: ['kisi'] },
    { a: 'soal',  n: 'Soal',         jk: ['kartu', 'kunci'] }
  ];
  function kunciTahap(a, id) {
    const rec = S.rows && S.rows[id]; if (!rec || rec.guruKey !== myId()) return '';
    const i = TAHAP.findIndex(t => t.a === a); if (i < 1) return '';
    const d = rec.docs || {};
    if (TAHAP[i].jk.some(k => d[k] || genAda(k, id))) return '';
    for (let n = 0; n < i; n++) {
      const kurang = TAHAP[n].jk.filter(k => !(selesai(d[k], k, id) || menunggu(d[k], k, id)));
      if (!kurang.length) continue;
      const nama = kurang.map(k => (JENIS.find(z => z.k === k) || {}).n || k).join(', ');
      return '🔒 Selesaikan dulu tahap ' + (n + 1) + ' (' + TAHAP[n].n + '). ' + (n === 0
        ? 'RPE selesai otomatis bila Admin sudah mengisi kalender efektif dan JP per pekan diketahui.'
        : 'Belum diajukan/final: ' + nama + '. Buka dokumennya di kartu, lalu tekan tombol ajukan atau tandai final.');
    }
    return '';
  }
  function tombolTahap(a, label, id) {
    const k = kunciTahap(a, id);
    return `<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;${k ? 'opacity:.55;' : ''}" data-act="${a}" data-id="${esc(id)}"${k ? ` title="${esc(k)}" aria-disabled="true"` : ''}>${k ? '🔒 ' : ''}${label}</button>`;
  }
  function appBukaBtn(id, jk) {
    const a = APP_ACT[jk]; if (!a) return '';
    return ` <button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:6px;" data-act="${a}" data-id="${esc(id)}">Buka di aplikasi</button>`;
  }
  function hitung(rec, id) {
    const d = (rec && rec.docs) || {};
    let fin = 0, draf = 0, rev = 0;
    JENIS.forEach(j => {
      const x = d[j.k];
      if (x && x.url) { if (isFinal(x)) fin++; else draf++; if (x.revisi) rev++; }
      else if (appFinal(x, j.k, id)) { fin++; if (x && x.revisi) rev++; }
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
  // Tanpa batas waktu, update()/set() Firebase menggantung bila sinyal buruk: kunci "sedang menyimpan" tidak pernah lepas dan tombol Simpan tampak mati.
  // Fungsi (bukan promise) dipakai supaya galat sinkron juga tertangkap dan kunci dilepas.
  const dgBatas = (f, ms) => new Promise((ok, gagal) => {
    const t = setTimeout(() => gagal(new Error('Server belum menjawab (sinyal lambat). Perubahan akan tersimpan otomatis bila koneksi pulih; periksa sinyal lalu coba lagi.')), ms || 15000);
    let p; try { p = f(); } catch (e) { clearTimeout(t); return gagal(e); }
    Promise.resolve(p).then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); gagal(e); });
  });
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
  // Admin/Kepsek: jadwal semua guru, dikelompokkan per guru (kunci guruKey, atau 'n:<nama>' bila slot tak punya guruKey).
  function jadwalSemuaGuru() {
    if (!isAdm() || typeof db === 'undefined' || !db) return Promise.resolve(null);
    try {
      return db.ref('jadwal').limitToFirst(3000).once('value').then(sn => {
        const per = {};
        sn.forEach(c => {
          const x = c.val(); if (!x) return;
          const k = x.guruKey ? String(x.guruKey) : 'n:' + normM(x.guru);
          (per[k] = per[k] || {})[c.key] = x;
        });
        const out = {}; Object.keys(per).forEach(k => { out[k] = kelompokJadwal(per[k]); });
        return out;
      }).catch(() => null);
    } catch (e) { return Promise.resolve(null); }
  }
  const jpJadwal = rec => {
    if (!rec) return 0;
    let g = null;
    if (rec.guruKey === myId()) g = S.jadwal ? S.jadwal[kunciJ(rec.mapel, rec.kelas)] : null;
    else if (S.jadwalSemua) { const per = S.jadwalSemua[rec.guruKey] || S.jadwalSemua['n:' + normM(rec.guruName)]; g = per ? per[kunciJ(rec.mapel, rec.kelas)] : null; }
    return g ? g.jp : 0;
  };
  // JP per pekan untuk RPE: angka tersimpan guru, bila belum ada pakai jadwal.
  const rpeJp = rec => { const t = parseInt(rec && rec.jpPerPekan, 10); return (t >= 1 && t <= 40) ? t : jpJadwal(rec); };
  const rpeKaldikSah = r => !!(r && /^\d{4}-\d{2}-\d{2}$/.test(String(r.mulai || '')) && /^\d{4}-\d{2}-\d{2}$/.test(String(r.selesai || '')) && String(r.selesai) > String(r.mulai));
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
      jadwalGuru(),
      db.ref('perangkat_rpe_kaldik_v4/' + taSlug() + '_' + S.sem).once('value').then(sn => sn.val() || null).catch(() => null),
      jadwalSemuaGuru()
    ]).then(r => {
      if (epoch !== S.epoch) return; // sesi/semester sudah berganti
      S.rows = r[0].val() || {}; S.kaldik = r[1].val() || null; S.jadwal = r[2];
      S.rpeKaldik = rpeKaldikSah(r[3]) ? r[3] : null; S.jadwalSemua = r[4];
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
    // Simpan posisi gulir sebelum isi diganti: tanpa ini tabel kembali ke baris teratas setiap kali tombol ditekan,
    // sehingga yang terbuka/terubah terasa "meleset" dari kotak yang diklik.
    const host = el.closest ? (el.closest('#mainContent') || null) : null;
    const wrapLama = el.querySelector('.pp-wrap');
    const pos = S.posOk ? { w: window.pageYOffset || 0, h: host ? host.scrollTop : 0, t: wrapLama ? wrapLama.scrollTop : 0, l: wrapLama ? wrapLama.scrollLeft : 0 } : null;
    el.innerHTML = h;
    if (pos) {
      const wrapBaru = el.querySelector('.pp-wrap');
      if (wrapBaru) { wrapBaru.scrollTop = pos.t; wrapBaru.scrollLeft = pos.l; }
      if (host) host.scrollTop = pos.h;
      if (pos.w) window.scrollTo(0, pos.w);
    }
    if (S.fokusEditor) {
      S.fokusEditor = false;
      const ed = el.querySelector('.pp-edrow, #ppUrl, #ppRevisi');
      if (ed && ed.scrollIntoView) { try { ed.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { ed.scrollIntoView(); } }
    }
    S.posOk = !!(S.siap && !S.err); // hanya pulihkan posisi bila render sebelumnya sudah menampilkan data penuh
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
    if (k && k.url) h += `<div style="margin-top:4px;font-size:13px;">${esc(k.judul || 'Kaldik')} · <a href="${esc(amanUrl(k.url))}" target="_blank" rel="noopener noreferrer"><b>Buka dokumen</b></a></div>`;
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
      const kurang = JENIS.filter(j => { const x = d[j.k]; return !selesai(x, j.k, id); }).map(j => j.n);
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
    const c = hitung(rec, id), d = rec.docs || {};
    const chips = JENIS.map(j => {
      const x = d[j.k], on = S.edit && S.edit.id === id && S.edit.j === j.k;
      const af = appFinal(x, j.k, id), mn = menunggu(x, j.k, id), gn = !(x && x.url) && !af && !mn && genAda(j.k, id);
      const st = x && x.url ? (isFinal(x) ? ['#dcfce7', '#86efac', '#166534', '✅'] : ['#fef9c3', '#fde047', '#854d0e', '✏️']) : af ? ['#dcfce7', '#86efac', '#166534', '✅'] : mn ? ['#fef9c3', '#fde047', '#854d0e', '⏳'] : gn ? ['#dbeafe', '#93c5fd', '#1e40af', '🛠'] : ['#f3f4f6', '#d1d5db', '#374151', '➕'];
      const lbl = x && x.url ? (isFinal(x) ? 'Final' : 'Draf') : af ? (viaFolder(x, id) ? 'Final · folder Drive' : 'Final · dari aplikasi') : mn ? 'Menunggu persetujuan' : gn ? 'Dibuat di aplikasi' : 'Belum diisi';
      return `<button type="button" data-act="edit" data-id="${esc(id)}" data-j="${j.k}" style="text-align:left;min-height:46px;padding:6px 10px;border-radius:10px;border:${on ? 2 : 1.5}px solid ${on ? '#2563eb' : st[1]};background:${st[0]};color:${st[2]};cursor:pointer;font-size:13px;line-height:1.25;"><strong>${st[3]} ${esc(j.n)}</strong><br><span style="font-size:11px;">${lbl}${x && x.revisi ? ' · ⚠️ revisi' : ''}</span></button>`;
    }).join('');
    const panel = (S.edit && S.edit.id === id) ? editorHtml(id, rec, S.edit.j) : '';
    const sk = siapCek(rec);
    const siapHtml = sk.length
      ? `<div style="margin-top:6px;padding:6px 8px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">Belum siap dibuat otomatis: ${sk.map(esc).join('; ')}.</div>`
      : `<div style="margin-top:6px;font-size:12px;color:#166534;">✅ Data dasar lengkap untuk pembuatan otomatis.</div>`;
    return `<div class="border-muted" style="margin-top:10px;padding:10px;border-radius:10px;">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">
        <div style="font-weight:700;">${esc(rec.mapel)} · Kelas ${esc(rec.kelas)}${(() => { const jj = jpJadwal(rec); return jj ? `<div style="${muted}font-weight:400;">📅 Jadwal: ${jj} JP/pekan${rec.jpPerPekan && rec.jpPerPekan !== jj ? ` · di dokumen tersimpan ${esc(rec.jpPerPekan)} (beda dari jadwal, cek kembali)` : ''}</div>` : ''; })()}</div>
        <div style="font-size:12px;">${c.final}/${c.total} final${c.draf ? ` · ${c.draf} draf` : ''} ${tombolTahap('rpe', '🖨 Buat RPE', id)}${tombolTahap('atp', '🎯 ATP/TP', id)}${tombolTahap('prota', '🗂 Prota/Promes', id)}${tombolTahap('kisi', '📋 Kisi-kisi', id)}${tombolTahap('soal', '📝 Soal', id)}<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="paket" data-id="${esc(id)}">📦 Cetak Paket</button><button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-left:4px;" data-act="hapus-baris" data-id="${esc(id)}">🗑</button></div></div>
      <div style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;">${chips}</div>${folderHtml(id, rec)}${siapHtml}${panel}</div>`;
  }

  function appBlok(id, rec, jk, x) {
    if (jk === 'rpe') {
      const kotak = (bg, bd, wr, isi) => `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:${bg};border:1px solid ${bd};font-size:12px;color:${wr};">${isi}</div>`;
      if (genAda('rpe', id)) return kotak('#ecfdf5', '#6ee7b7', '#065f46', '✅ RPE dihitung otomatis dari kalender efektif dan JP per pekan, jadi otomatis dianggap final tanpa tautan' + (x.url ? ' (tautan di bawah dipakai sebagai gantinya selama masih tersimpan)' : '') + '. Tekan <b>🖨 Buat RPE</b> untuk mencetak.');
      const k = []; if (!S.rpeKaldik) k.push('Admin belum mengisi kalender efektif semester ini'); if (!rpeJp(rec)) k.push('JP per pekan belum diketahui (tambahkan mapel dari Jadwal atau isi JP saat membuat RPE)');
      return kotak('#fffbeb', '#fcd34d', '#92400e', 'RPE belum otomatis final: ' + k.map(esc).join('; ') + '.');
    }
    if (rec.guruKey !== myId() || !genAda(jk, id)) return '';
    const aktif = appFinal(x, jk, id), tunggu = menunggu(x, jk, id), ajuan = perluSetuju(jk);
    const batalBtn = t => ' <button class="btn btn-soft" style="padding:4px 10px;font-size:11px;margin-left:6px;" data-act="app-batal" data-id="' + esc(id) + '" data-j="' + jk + '">' + t + '</button>';
    return `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;color:#1e3a8a;">🛠 Dokumen ini sudah dibuat di aplikasi — ${x.url ? 'tautan di bawah tetap berlaku sebagai lampiran' : 'tidak wajib diunggah ke Google Drive'}.
      <div style="margin-top:6px;">${aktif
        ? '<b>✅ ' + (x.setuju && !(x.app === true && x.status === 'final') ? 'Sudah disetujui Kepala (dokumen aplikasi dianggap final).' : 'Ditandai final (memakai dokumen aplikasi).') + '</b>' + batalBtn('Batalkan')
        : tunggu
        ? '<b>⏳ Diajukan' + (x.diajukan ? ' ' + esc(tglPendek(x.diajukan)) : '') + ', menunggu persetujuan Kepala.</b>' + batalBtn('Batalkan pengajuan')
        : '<button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="app-final" data-id="' + esc(id) + '" data-j="' + jk + '">' + (ajuan ? '✅ Ajukan pakai dokumen dari aplikasi' : '✅ Tandai final, pakai dokumen dari aplikasi') + '</button>' + (ajuan ? '<div style="' + muted + 'margin-top:4px;">Dokumen berstatus final setelah disetujui Kepala.</div>' : '')}</div></div>`;
  }
  function editorHtml(id, rec, jk) {
    const j = JENIS.find(x => x.k === jk); if (!j) return '';
    const x = (rec.docs || {})[jk] || {}, adm = isAdm() && rec.guruKey !== myId();
    const rev = x.revisi ? `<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">⚠️ Catatan revisi${x.revisiBy ? ' dari ' + esc(x.revisiBy) : ''}: ${esc(x.revisi)}</div>` : '';
    if (adm) return `<div style="margin-top:10px;padding:10px;border-radius:8px;background:#f9fafb;">
      <div style="font-weight:700;margin-bottom:6px;">${esc(j.full)} · ${esc(rec.guruName || '')}</div>${folderHint(id)}
      ${dilihatHtml(id, rec, jk, x)}${setujuHtml(id, rec, jk, j, x, true)}
      ${(x.url || appFinal(x, jk, id) || menunggu(x, jk, id)) ? `<div style="font-size:13px;margin-bottom:8px;">${x.url ? `<a href="${esc(amanUrl(x.url))}" target="_blank" rel="noopener noreferrer"><b>Buka dokumen</b></a>` : viaFolder(x, id) ? `📁 Ada di folder Drive guru (tanpa tautan sendiri) · ${folderLink(folderRow(id))}` : `🛠 ${jk === 'rpe' ? 'RPE dihitung otomatis (tanpa tautan)' : 'Dokumen dibuat di aplikasi (tanpa tautan)'}${appBukaBtn(id, jk)}`} · ${(isFinal(x) || appFinal(x, jk, id)) ? 'Final' : menunggu(x, jk, id) ? 'Menunggu persetujuan' : 'Draf'}</div>
      <input id="ppRevisi" class="field" maxlength="200" placeholder="Catatan revisi untuk guru (kosongkan bila sudah sesuai)" value="${esc(x.revisi || '')}">
      <div style="margin-top:8px;display:flex;gap:6px;"><button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="simpan-revisi" data-id="${esc(id)}" data-j="${jk}">💾 Simpan catatan</button><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="tutup">Tutup</button></div>`
      : `<div style="${muted}">${genAda(jk, id) ? '🛠 Dibuat di aplikasi, belum diajukan atau ditandai final oleh guru.' + appBukaBtn(id, jk) : (jk === 'rpe' ? 'RPE belum siap: kalender efektif belum diisi atau JP per pekan belum diketahui.' : 'Guru belum mengisi tautan dokumen ini.')}</div><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;margin-top:8px;" data-act="tutup">Tutup</button>`}</div>`;
    return `<div style="margin-top:10px;padding:10px;border-radius:8px;background:#f9fafb;">
      <div style="font-weight:700;margin-bottom:6px;">${esc(j.full)}</div>${rev}${setujuHtml(id, rec, jk, j, x, false)}${appBlok(id, rec, jk, x)}
      <input id="ppUrl" class="field" maxlength="500" placeholder="https://drive.google.com/..." value="${esc(x.url || '')}">
      <div style="${muted}margin:4px 0 8px;">Pastikan akses tautan bisa dilihat oleh Kepala Madrasah/Admin. Hanya tautan https yang diterima. ${folderRow(id) ? 'Dokumen ada di folder Drive mapel ini? Kosongkan tautan, pilih Final, lalu Simpan.' : 'Tautan tidak wajib untuk draf. Untuk final tanpa tautan sendiri, simpan dulu tautan folder Drive di kartu mapel (📁).'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <select id="ppStatus" class="field" style="max-width:120px;"><option value="draf" ${x.status !== 'final' ? 'selected' : ''}>Draf</option><option value="final" ${x.status === 'final' ? 'selected' : ''}>Final</option></select>
        <button class="btn btn-success" style="padding:6px 12px;font-size:12px;" data-act="simpan-doc" data-id="${esc(id)}" data-j="${jk}">💾 Simpan</button>
        ${viaFolder(x, id) ? folderLink(folderRow(id)).replace('<a ', '<a class="btn btn-soft" style="padding:6px 12px;font-size:12px;" ') : ''}${x.url ? `<a class="btn btn-soft" style="padding:6px 12px;font-size:12px;" href="${esc(amanUrl(x.url))}" target="_blank" rel="noopener noreferrer">Buka</a><button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" data-act="hapus-doc" data-id="${esc(id)}" data-j="${jk}">Hapus tautan</button>` : ''}
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
    const th = JENIS.map(j => `<th class="pp-c" title="${esc(j.full || j.n)}">${esc(j.k === 'kunci' ? 'Kunci' : j.n)}</th>`).join('');
    const cols = `<colgroup><col class="pp-cg"><col class="pp-cm"><col class="pp-ck">${JENIS.map(() => '<col class="pp-cd">').join('')}<col class="pp-cf"></colgroup>`;
    const tiRekap = tenggatInfo(), telat = !!tiRekap && tiRekap.sisa < 0;
    const barisHtml = (id, awal) => {
      const r = S.rows[id], c = hitung(r, id), d = r.docs || {};
      const tds = JENIS.map(j => {
        const x = d[j.k], ada = !!(x && x.url), gen = !ada && genAda(j.k, id);
        let kls, ico, ttl;
        if (x && x.revisi) { kls = 'pp-rev'; ico = '⚠️'; ttl = 'Ada catatan revisi'; }
        else if (ada && isFinal(x)) { kls = 'pp-fin'; ico = '✓'; ttl = 'Final'; }
        else if (appFinal(x, j.k, id)) { kls = 'pp-fin'; ico = '✓'; ttl = viaFolder(x, id) ? 'Final (di folder Drive guru, tanpa tautan sendiri)' : 'Final (dibuat di aplikasi, tanpa tautan)'; }
        else if (menunggu(x, j.k, id)) { kls = 'pp-draf'; ico = '⏳'; ttl = 'Menunggu persetujuan Kepala'; }
        else if (ada) { kls = 'pp-draf'; ico = '✎'; ttl = 'Draf'; }
        else if (gen) { kls = 'pp-gen'; ico = '🛠'; ttl = 'Dibuat di aplikasi'; }
        else { kls = 'pp-kosong'; ico = '·'; ttl = 'Belum diisi'; }
        const on = (S.edit && S.edit.id === id && S.edit.j === j.k ? ' pp-on' : '') + (isAdm() && dilihatAda(x) ? ' pp-dl' : '');
        if (isAdm() && dilihatAda(x)) ttl += ' · sudah dilihat';
        return `<td class="pp-c"><button type="button" class="pp-b ${kls}${on}" title="${esc(j.n)}: ${ttl}" aria-label="${esc(j.n)}: ${ttl}" data-act="edit" data-id="${esc(id)}" data-j="${j.k}">${ico}</button></td>`;
      }).join('');
      const panel = (S.edit && S.edit.id === id) ? `<tr class="pp-edrow"><td colspan="${JENIS.length + 4}" class="pp-edcell"><div class="pp-edin">${editorHtml(id, r, S.edit.j)}</div></td></tr>` : '';
      const pr = Math.round(c.final * 100 / c.total);
      return `<tr class="${awal ? 'pp-awal' : 'pp-anak'}"><td class="pp-guru" title="${esc(r.guruName || '')}">${awal ? esc(r.guruName) : ''}</td><td class="pp-mapel" title="${esc(r.mapel)}">${esc(r.mapel)}</td><td class="pp-kls">${esc(r.kelas)}</td>${tds}<td class="pp-fcell"><div class="pp-bar"><span style="width:${pr}%"></span></div><b>${c.final}/${c.total}</b>${telat && c.final < c.total ? '<div style="font-size:11px;color:#b91c1c;font-weight:700;">Terlambat</div>' : ''}</td></tr>${panel}`;
    };
    // ---- Satu baris ringkas per guru (bawaan tertutup); klik untuk membuka rincian per mapel/kelas ----
    const grup = [], idx = {};
    ids.forEach(id => {
      const k = S.rows[id].guruKey;
      if (!(k in idx)) { idx[k] = grup.length; grup.push({ k: k, nama: S.rows[id].guruName || k, ids: [], f: 0, t: 0 }); }
      const gp = grup[idx[k]]; gp.ids.push(id);
      const c = hitung(S.rows[id], id); gp.f += c.final; gp.t += c.total;
    });
    if (S.sortBy) grup.sort((a, b) => { const x = a.t ? a.f / a.t : 0, y = b.t ? b.f / b.t : 0; return S.sortBy === 'asc' ? x - y : y - x; });
    const satuGuru = grup.length === 1;
    S.bukaNow = {};
    let body = grup.map(gp => {
      const dis = S.buka[gp.k];
      const buka = (S.edit && gp.ids.indexOf(S.edit.id) >= 0) || (dis !== undefined ? !!dis : (!!S.filterGuru || satuGuru));
      S.bukaNow[gp.k] = buka;
      const n = gp.ids.length;
      const sel = JENIS.map(j => {
        let fin = 0, ada = 0, rev = 0, gen = 0, tgu = 0;
        gp.ids.forEach(id => { const x = (S.rows[id].docs || {})[j.k]; if (x && x.url) { ada++; if (isFinal(x)) fin++; if (x.revisi) rev++; } else if (appFinal(x, j.k, id)) { ada++; fin++; if (x && x.revisi) rev++; } else if (menunggu(x, j.k, id)) tgu++; else if (genAda(j.k, id)) gen++; });
        let kls, ico;
        if (rev) { kls = 'pp-rev'; ico = '⚠️'; } else if (fin === n) { kls = 'pp-fin'; ico = '✓'; } else if (tgu) { kls = 'pp-draf'; ico = '⏳'; } else if (ada) { kls = 'pp-draf'; ico = '✎'; } else if (gen) { kls = 'pp-gen'; ico = '🛠'; } else { kls = 'pp-kosong'; ico = '·'; }
        const ttl = j.n + ': ' + fin + '/' + n + ' final' + (rev ? ', ' + rev + ' ada revisi' : '') + (tgu ? ', ' + tgu + ' menunggu persetujuan' : '') + (gen ? ', ' + gen + ' dibuat di aplikasi' : '') + ' (klik untuk ' + (buka ? 'menutup' : 'membuka') + ' rincian)';
        return `<td class="pp-c"><button type="button" class="pp-b pp-sm ${kls}" title="${esc(ttl)}" aria-label="${esc(ttl)}" data-act="grp" data-id="${esc(gp.k)}">${ico}${n > 1 ? `<small>${fin}/${n}</small>` : ''}</button></td>`;
      }).join('');
      const pr = gp.t ? Math.round(gp.f * 100 / gp.t) : 0;
      const head = `<tr class="pp-awal pp-grp"><td class="pp-guru" title="${esc(gp.nama)}"><button type="button" class="pp-tg" data-act="grp" data-id="${esc(gp.k)}" aria-expanded="${buka}">${buka ? '▾' : '▸'} ${esc(gp.nama)}</button></td><td class="pp-mapel">${n} mapel/kelas</td><td class="pp-kls"></td>${sel}<td class="pp-fcell"><div class="pp-bar"><span style="width:${pr}%"></span></div><b>${gp.f}/${gp.t}</b></td></tr>`;
      return head + (buka ? gp.ids.map(id => barisHtml(id, false)).join('') : '');
    }).join('');
    S.semuaBuka = grup.length > 0 && grup.every(gp => S.bukaNow[gp.k]);
    if (!ids.length) body = `<tr><td colspan="${JENIS.length + 4}" style="text-align:center;padding:16px;${muted}">${adaFilter ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada data perangkat pembelajaran untuk semester ini.'}</td></tr>`;
    const bl = belumIsi();
    const css = `<style>
.pp-rekap{font-size:14px}
.pp-wrap{overflow:auto;max-height:70vh;border:1px solid #d9e2de;border-radius:10px;background:#fff}
.pp-cg{width:140px}.pp-cm{width:170px}.pp-ck{width:64px}.pp-cd{width:72px}.pp-cf{width:104px}
.pp-tbl{width:100%;min-width:1054px;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:14px;color:#1f2937}
.pp-tbl thead th{position:sticky;top:0;z-index:3;background:#e8f1ed;color:#14532d;font-size:13px;font-weight:700;padding:10px 6px;text-align:left;border-bottom:2px solid #b7cfc4;line-height:1.2}
.pp-tbl thead th.pp-c{text-align:center}
.pp-tbl th.pp-c,.pp-tbl td.pp-c{text-align:center;padding:6px 4px}
.pp-tbl td{padding:8px 10px;border-bottom:1px solid #edf2f0;vertical-align:middle}
.pp-tbl tbody tr:not(.pp-awal-x):hover td{background:#f1f8f4}
.pp-tbl tr.pp-awal td{border-top:2px solid #cfe0d8}
.pp-guru{font-weight:700;white-space:nowrap;color:#111827;overflow:hidden;text-overflow:ellipsis;position:sticky;left:0;z-index:2;background:#fff}
.pp-mapel{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:sticky;left:140px;z-index:2;background:#fff;box-shadow:2px 0 0 #d9e2de}
.pp-tbl thead th:nth-child(1){position:sticky;left:0;z-index:5}
.pp-tbl thead th:nth-child(2){position:sticky;left:140px;z-index:5}
@media (max-width:700px){
.pp-cg{width:92px}.pp-cm{width:84px}.pp-ck{width:36px}.pp-cd{width:44px}.pp-cf{width:62px}
.pp-tbl{min-width:612px;font-size:12px}
.pp-tbl thead th{font-size:11px;padding:8px 3px}
.pp-tbl td{padding:5px 5px}
.pp-tbl th.pp-c,.pp-tbl td.pp-c{padding:3px 1px}
.pp-tbl td.pp-c{height:40px}
.pp-guru{position:sticky;left:0;z-index:2;white-space:normal;line-height:1.2;font-size:12px;box-shadow:2px 0 0 #d9e2de;overflow:hidden;text-overflow:clip;word-break:break-word}
.pp-tbl thead th:nth-child(1){position:sticky;left:0;top:0;z-index:5}
.pp-tbl thead th:nth-child(2){position:sticky;left:auto;top:0;z-index:3}
.pp-mapel{position:static;box-shadow:none;white-space:normal;line-height:1.2;font-size:12px}
.pp-anak td.pp-mapel{padding-left:5px}
.pp-grp td.pp-mapel{font-size:11px}
.pp-kls{font-size:12px}
.pp-tg{white-space:normal;line-height:1.2;font-size:12px;padding:3px 0;text-overflow:clip}
.pp-b{width:34px;height:34px;border-radius:8px;font-size:14px}
.pp-kosong{font-size:18px}
.pp-b small{font-size:8px}
.pp-fcell{min-width:0;font-size:11px}
body.dark-mode .pp-guru{box-shadow:2px 0 0 #374151}
.pp-bar{height:5px;margin-bottom:3px}
.pp-tools{gap:6px}
.pp-filters{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.pp-filters .field{width:100%;max-width:none;min-width:0;font-size:13px;padding:7px 8px}
.pp-filters .btn{grid-column:1/-1}
.pp-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.pp-sum{grid-column:1/-1;margin-right:0;font-size:13px}
.pp-actions .btn{width:100%;padding:8px 6px;font-size:12px;text-align:center;justify-content:center;white-space:normal;line-height:1.2}
.pp-leg{gap:5px 10px;font-size:11.5px;margin:8px 0 3px}
.pp-leg i{width:18px;height:18px;line-height:18px;font-size:11px;margin-right:3px}
}
.pp-kls{white-space:nowrap;color:#374151}
.pp-b{border:0;cursor:pointer;width:38px;height:38px;border-radius:10px;font-size:16px;font-weight:700;line-height:1;display:inline-flex;align-items:center;justify-content:center;padding:0;vertical-align:middle;touch-action:manipulation}
.pp-b:focus-visible{outline:2px solid #2563eb;outline-offset:1px}
.pp-tbl td.pp-c{height:46px}
.pp-sm{flex-direction:column;gap:1px}.pp-b small{display:block;font-size:9px;font-weight:700;line-height:1}
.pp-tg{border:0;background:transparent;cursor:pointer;font:inherit;font-weight:700;color:inherit;text-align:left;width:100%;padding:6px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pp-grp td,.pp-grp td.pp-guru,.pp-grp td.pp-mapel{background:#f4f9f6}.pp-anak td.pp-mapel{padding-left:24px}.pp-grp td.pp-mapel{color:#4b5563;font-size:13px}
.pp-edcell{padding:0!important;background:#f9fafb}.pp-edin{position:sticky;left:0;width:min(760px,calc(100vw - 64px));padding:6px 10px 10px;box-sizing:border-box}
.pp-tools{margin-top:10px;display:flex;flex-direction:column;gap:8px}.pp-filters,.pp-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pp-filters .field{width:auto;flex:0 1 auto;min-width:130px;max-width:220px;font-size:14px}
.pp-actions .btn{padding:8px 14px;font-size:13px}.pp-sum{font-size:14px;margin-right:auto}
.pp-fin{background:#dcfce7;color:#166534}
.pp-draf{background:#fef3c7;color:#92400e}
.pp-gen{background:#dbeafe;color:#1e40af}
.pp-rev{background:#fed7aa;color:#9a3412}
.pp-kosong{background:transparent;color:#c3ccc8;font-size:22px}
.pp-kosong:hover{background:#f3f4f6}
.pp-on{outline:2px solid #2563eb}
.pp-dl{position:relative}.pp-dl::after{content:'👁';position:absolute;top:-5px;right:-3px;font-size:10px;line-height:1}
.pp-fcell{min-width:90px;white-space:nowrap;font-size:13px}
.pp-bar{height:6px;border-radius:99px;background:#e5e7eb;margin-bottom:4px;overflow:hidden}
.pp-bar span{display:block;height:100%;background:#16a34a}
.pp-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#374151;margin:10px 0 4px}
.pp-leg i{display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:6px;font-style:normal;font-weight:700;margin-right:5px;vertical-align:middle}
body.dark-mode .pp-wrap{background:#111827;border-color:#374151}body.dark-mode .pp-tbl{color:#e5e7eb}body.dark-mode .pp-tbl thead th{background:#1f3a2e;color:#d1fae5;border-color:#2f5846}body.dark-mode .pp-tbl td{border-color:#1f2937}body.dark-mode .pp-guru{color:#f9fafb;background:#111827}body.dark-mode .pp-mapel{background:#111827;box-shadow:2px 0 0 #374151}body.dark-mode .pp-leg{color:#d1d5db}body.dark-mode .pp-grp td,body.dark-mode .pp-grp td.pp-guru,body.dark-mode .pp-grp td.pp-mapel{background:#16231d}body.dark-mode .pp-grp td.pp-mapel{color:#9ca3af}body.dark-mode .pp-edcell{background:#0f172a}body.dark-mode .pp-tbl tr.pp-awal td{border-top-color:#374151}body.dark-mode .pp-tbl tbody tr:hover td{background:#1c2b3a}body.dark-mode .pp-bar{background:#374151}
</style>`;
    return `${css}<div class="pp-rekap"><div class="pp-tools">
      <div class="pp-filters">
        <select class="field" data-act="filter-guru">${opt}</select>
        <select class="field" data-act="filter-kelas">${optKelas}</select>
        <select class="field" data-act="filter-status">${optStatus}</select>
        <select class="field" data-act="urut">${optUrut}</select>
        ${adaFilter ? '<button class="btn btn-soft" style="padding:8px 14px;font-size:13px;" data-act="filter-reset">✖ Reset filter</button>' : ''}
        ${grup.length > 1 ? `<button class="btn btn-soft" style="padding:8px 14px;font-size:13px;" data-act="grp-semua">${S.semuaBuka ? '▾ Tutup semua rincian' : '▸ Buka semua rincian'}</button>` : ''}
      </div>
      <div class="pp-actions">
        <span class="pp-sum">Kelengkapan final: <b>${pct}%</b> (${fin}/${tot})</span>
        <button class="btn ${S.setujuBuka ? 'btn-success' : 'btn-soft'}" data-act="setuju-buka">✅ Setujui massal</button>
        <button class="btn ${S.waBuka ? 'btn-success' : 'btn-soft'}" data-act="wa-buka">💬 Pengingat WA</button>
        <button class="btn btn-soft" data-act="pengingat" title="Kirim notifikasi ke akun guru di dalam aplikasi">🔔 Notifikasi aplikasi</button>
        <button class="btn btn-soft" data-act="xlsx">📊 Unduh Excel</button>
        <button class="btn btn-soft" data-act="csv">⬇️ Unduh CSV</button>
      </div></div>
      ${setujuPanel()}${waPanel()}
      <div class="pp-leg"><span><i class="pp-fin">✓</i>Final</span><span><i class="pp-draf">✎</i>Draf</span><span><i class="pp-draf">⏳</i>Menunggu persetujuan</span><span><i class="pp-gen">🛠</i>Dibuat di aplikasi</span><span><i class="pp-rev">⚠️</i>Ada catatan revisi</span><span><i class="pp-kosong" style="font-size:18px">·</i>Belum diisi</span></div>
      <div style="${muted}margin:0 0 8px;font-size:13px;">Klik kotak status untuk membuka tautan atau memberi catatan.</div>
      <div class="pp-wrap"><table class="pp-tbl">${cols}<thead><tr><th>Guru</th><th>Mapel</th><th>Kelas</th>${th}<th>Final</th></tr></thead><tbody>${body}</tbody></table></div></div>
      ${bl.length ? `<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#fffbeb;border:1px solid #fcd34d;font-size:12px;color:#92400e;">Belum ada data dari: ${bl.map(esc).join(', ')}</div>` : ''}`;
  }

  // ---------- Pengingat ke guru (lewat notifikasi aplikasi: v4Notify di app.js) ----------
  // Sasaran = guru pada daftar rekap yang sedang tampil (ikut filter) yang masih punya dokumen belum final,
  // ditambah guru yang belum menambahkan mapel sama sekali (hanya bila tidak ada filter aktif).
  function pengingatSasaran() {
    const m = {};
    lihatIds().forEach(id => {
      const r = S.rows[id], d = r.docs || {};
      const kurang = JENIS.filter(j => { const x = d[j.k]; return !selesai(x, j.k, id); }).map(j => j.n);
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
      JENIS.forEach(j => {
        const x = (r.docs || {})[j.k] || {};
        if (!j.setuju || x.setuju) return;
        // Dokumen bertautan berstatus Final, atau dokumen buatan aplikasi yang DITANDAI FINAL oleh guru (tanpa tautan).
        // Dokumen buatan aplikasi yang belum ditandai final oleh guru tidak ikut.
        if ((x.url && x.status === 'final') || appFinal(x, j.k, id) || menunggu(x, j.k, id)) items.push({ id: id, jk: j.k, n: j.n, r: r, dil: dilihatAda(x) });
      });
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
    if (!l.length) return `<div style="${box}font-size:14px;">Tidak ada dokumen yang menunggu persetujuan pada daftar ini. Yang bisa disetujui massal hanya dokumen berstatus <b>Final</b> dari guru: yang bertautan, atau dokumen aplikasi yang sudah ditandai final atau diajukan oleh guru.</div>`;
    let total = 0, dilihat = 0;
    l.forEach(o => { total += o.it.length; dilihat += o.it.filter(x => x.dil).length; });
    const rows = l.map(o => {
      const per = {}; o.it.forEach(x => { per[x.n] = (per[x.n] || 0) + 1; });
      const ket = Object.keys(per).map(n => n + (per[n] > 1 ? ' ×' + per[n] : '')).join(', ');
      const dl = o.it.filter(x => x.dil).length;
      return `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid #dbeafe;"><div style="font-size:14px;"><b>${esc(o.nama)}</b><div style="${muted}font-size:13px;">${esc(ket)} · 👁 ${dl}/${o.it.length} sudah dilihat</div></div><button class="btn btn-success" style="padding:8px 14px;font-size:13px;" data-act="setuju-guru" data-id="${esc(o.key)}">✅ Setujui ${o.it.length} dokumen</button></div>`;
    }).join('');
    const semua = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 8px;">
      <button class="btn btn-success" style="padding:8px 14px;font-size:13px;" data-act="setuju-dilihat" ${dilihat ? '' : 'disabled'}>👁 Setujui yang sudah dilihat (${dilihat})</button>
      <button class="btn btn-soft" style="padding:8px 14px;font-size:13px;" data-act="setuju-semua">✅ Setujui semua (${total})</button></div>`;
    return `<div style="${box}"><div style="font-size:14px;margin-bottom:4px;"><b>Persetujuan massal (${l.length} guru, ${total} dokumen)</b></div><div style="${muted}font-size:13px;margin-bottom:6px;">Tiap tombol meminta konfirmasi dulu. Tandai dokumen "sudah dilihat" lewat kotak status di tabel. Persetujuan membuat cetakan guru memuat QR tanda tangan Kepala.</div>${semua}${rows}</div>`;
  }
  // gk = kunci guru, atau '*' untuk semua guru pada daftar yang tampil; hanyaDilihat = hanya dokumen yang sudah ditandai dilihat
  function setujuMassal(gk, hanyaDilihat) {
    if (!isAdm()) return;
    if (gk !== '*' && gk === myId()) return say('Persetujuan tidak boleh diberikan pada dokumen sendiri.', true);
    let items = [];
    if (gk === '*') { const seen = {}; lihatIds().forEach(id => { const k = S.rows[id] && S.rows[id].guruKey; if (k && !seen[k]) { seen[k] = 1; items = items.concat(setujuKandidat(k)); } }); }
    else items = setujuKandidat(gk);
    if (hanyaDilihat) items = items.filter(x => x.dil);
    if (!items.length) return say('Tidak ada dokumen yang bisa disetujui.', true);
    const nGuru = new Set(items.map(x => x.r.guruKey)).size;
    const daftar = items.slice(0, 15).map(x => '- ' + x.n + ' ' + x.r.mapel + ' ' + x.r.kelas + (gk === '*' ? ' (' + (x.r.guruName || x.r.guruKey) + ')' : '')).join('\n') + (items.length > 15 ? '\n...dan ' + (items.length - 15) + ' dokumen lain' : '');
    const ket = items.length + ' dokumen' + (gk === '*' ? ' dari ' + nGuru + ' guru' : ' milik ' + (items[0].r.guruName || gk)) + (hanyaDilihat ? ' (hanya yang sudah dilihat)' : '') + ':\n' + daftar;
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
    const mulai = () => tulis('perangkat_v4', upd, () => {
      items.forEach(x => { const d = (S.rows[x.id].docs = S.rows[x.id].docs || {}); d[x.jk] = d[x.jk] || {}; d[x.jk].setuju = upd[x.id + '/docs/' + x.jk + '/setuju']; });
      say('✅ ' + items.length + ' dokumen disetujui');
    }, 'APPROVE_PERANGKAT_BULK', taSlug() + '_' + S.sem + '_' + (gk === '*' ? 'semua' : gk));
    mulai();
  }
  function tandaiDilihat(id, jk, batal) {
    const rec = S.rows[id]; if (!rec || !isAdm()) return;
    const x = (rec.docs || {})[jk] || {};
    if (!batal && !(x.url || genAda(jk, id) || viaFolder(x, id))) return say('Dokumen belum ada.', true);
    const pk = peranKey(), now = new Date().toISOString();
    const nilai = batal ? null : { oleh: String(myName() || (pk === 'kepala' ? 'Kepala' : 'Admin')).slice(0, 100), at: now };
    const upd = {}; upd['docs/' + jk + '/dilihat/' + pk] = nilai;
    tulis('perangkat_v4/' + id, upd, () => {
      rec.docs = rec.docs || {}; const d = (rec.docs[jk] = rec.docs[jk] || {}); d.dilihat = Object.assign({}, d.dilihat || {});
      if (batal) delete d.dilihat[pk]; else d.dilihat[pk] = nilai;
      if (!Object.keys(d.dilihat).length) delete d.dilihat;
      say(batal ? 'Tanda dilihat dibatalkan' : '👁 Ditandai sudah dilihat');
    }, batal ? 'UNSEEN_PERANGKAT_DOC' : 'SEEN_PERANGKAT_DOC', id);
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
          else if (appFinal(x, j.k, id)) { t = viaFolder(x, id) ? 'Final (folder Drive)' : 'Final (aplikasi)'; perJenis[j.k].final++; }
          else if (menunggu(x, j.k, id)) { t = 'Menunggu persetujuan'; perJenis[j.k].draf++; }
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
        .concat(JENIS.map(j => { const x = d[j.k]; return x && x.url ? (isFinal(x) ? 'Final' : 'Draf') + (x.revisi ? ' (revisi)' : '') : (appFinal(x, j.k, id) ? (viaFolder(x, id) ? 'Final (folder Drive)' : 'Final (aplikasi)') : (menunggu(x, j.k, id) ? 'Menunggu persetujuan' : genAda(j.k, id) ? 'Dibuat di aplikasi' : 'Belum')); }), [c.final, c.draf]);
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
    if (typeof db === 'undefined' || !db) return say('Database belum siap, muat ulang halaman lalu coba lagi.', true);
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (S.busy) return say('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
    S.busy = true;
    dgBatas(() => siap().then(() => db.ref(path).update(upd))).then(() => {
      S.busy = false; sukses(); audit(aksi, idAudit); render();
    }).catch(e => { S.busy = false; console.error('[SI MAMBA] perangkat:', e); say('❌ Gagal menyimpan: ' + ((e && e.message) || e), true); });
  }
  function simpanDoc(id, jk) {
    const rec = S.rows[id]; if (!rec) return;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa mengubah tautan.', true);
    const url = (document.getElementById('ppUrl') || {}).value || '', st = (document.getElementById('ppStatus') || {}).value === 'final' ? 'final' : 'draf';
    const kosong = !String(url).trim();
    // Dokumen buatan aplikasi (tanpa tautan): kolom tautan kosong + Simpan dulu menghapus seluruh data dokumen (pengajuan/final/persetujuan)
    // atau ditolak karena butuh folder Drive. Kini ditahan dengan pesan jelas; membatalkan lewat tombol "Batalkan" di kotak biru.
    const dx = (rec.docs || {})[jk];
    if (kosong && dx && !dx.url && dx.app === true) return say('Dokumen ini memakai versi dari aplikasi. Isi tautan bila ingin melampirkan, atau tekan tombol Batalkan di kotak biru untuk membatalkan pengajuan/final.', true, 6000);
    if (kosong) {
      // Tautan per dokumen opsional. Draf tidak butuh tautan; Final tanpa tautan sendiri butuh tautan folder Drive mapel ini.
      if (st !== 'final') return (rec.docs || {})[jk] ? hapusDoc(id, jk) : say('Draf tidak wajib tautan. Isi tautan hanya bila ingin melampirkannya.');
      if (!folderRow(id)) return say('Final tanpa tautan sendiri butuh tautan folder Drive. Simpan dulu tautan folder di kartu mapel (📁).', true);
    } else if (!urlOk(url)) return say('Isi tautan yang valid, diawali https://', true);
    const now = new Date().toISOString(), u = kosong ? null : url.trim(), b = 'docs/' + jk + '/';
    const upd = {}; upd[b + 'url'] = u; upd[b + 'status'] = st; upd[b + 'at'] = now; upd[b + 'by'] = myName();
    upd[b + 'app'] = null; upd[b + 'diajukan'] = null; upd[b + 'revisi'] = null; upd[b + 'revisiBy'] = null; upd[b + 'setuju'] = null; upd[b + 'dilihat'] = null; upd.updatedAt = now; // guru menyimpan ulang = catatan revisi dianggap ditindaklanjuti
    tulis('perangkat_v4/' + id, upd, () => {
      rec.docs = rec.docs || {}; rec.docs[jk] = u ? { url: u, status: st, at: now, by: myName() } : { status: st, at: now, by: myName() }; rec.updatedAt = now; S.edit = null; say('✅ Tersimpan');
    }, 'SAVE_PERANGKAT_DOC', id);
  }
  function appFinalSet(id, jk, batal) {
    const rec = S.rows[id]; if (!rec) return;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa menandai final.', true);
    if (!batal && !genAda(jk, id)) return say('Dokumen belum dibuat di aplikasi.', true);
    const x = (rec.docs || {})[jk] || {};
    if (!batal && x.url && !confirm('Tautan yang tersimpan akan dihapus dan dokumen buatan aplikasi dipakai sebagai final. Lanjutkan?')) return;
    if (batal && !confirm((menunggu(x, jk, id) ? 'Batalkan pengajuan dokumen ini?' : 'Batalkan status final dokumen aplikasi ini?') + (x.setuju ? '\n\nPersetujuan Kepala untuk dokumen ini juga akan terhapus.' : ''))) return;
    const now = new Date().toISOString(), b = 'docs/' + jk + '/', upd = {};
    if (batal) upd['docs/' + jk] = null;
    else { const ajuan = perluSetuju(jk); upd[b + 'url'] = null; upd[b + 'app'] = true; upd[b + 'status'] = ajuan ? 'draf' : 'final'; upd[b + 'diajukan'] = ajuan ? now : null; upd[b + 'at'] = now; upd[b + 'by'] = myName(); upd[b + 'revisi'] = null; upd[b + 'revisiBy'] = null; upd[b + 'setuju'] = null; upd[b + 'dilihat'] = null; }
    upd.updatedAt = now;
    tulis('perangkat_v4/' + id, upd, () => {
      rec.docs = rec.docs || {};
      if (batal) delete rec.docs[jk]; else rec.docs[jk] = perluSetuju(jk) ? { app: true, status: 'draf', diajukan: now, at: now, by: myName() } : { app: true, status: 'final', at: now, by: myName() };
      rec.updatedAt = now; S.edit = null; say(batal ? (menunggu(x, jk, id) ? 'Pengajuan dibatalkan' : 'Status final dibatalkan') : (perluSetuju(jk) ? '✅ Diajukan, menunggu persetujuan Kepala' : '✅ Ditandai final (dokumen aplikasi)'));
    }, batal ? 'UNFINAL_PERANGKAT_APP' : 'FINAL_PERANGKAT_APP', id);
  }
  function ubahFolder(id) {
    const rec = S.rows[id]; if (!rec) return;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa mengubah tautan folder.', true);
    const lama = folderRow(id);
    const jawab = prompt('Tempel tautan folder Google Drive berisi perangkat ' + rec.mapel + ' kelas ' + rec.kelas + ' (diawali https://).\nKosongkan untuk menghapus tautan folder.', lama);
    if (jawab === null) return;
    const u = String(jawab).trim();
    if (u && !urlOk(u)) return say('Tautan tidak valid, harus diawali https://', true);
    if (u === lama) return;
    const via = JENIS.filter(j => viaFolder((rec.docs || {})[j.k], id));
    if (!u && via.length && !confirm('Ada ' + via.length + ' dokumen berstatus Final lewat folder ini (' + via.map(j => j.n).join(', ') + '). Bila folder dihapus, status final dan persetujuannya ikut dihapus. Lanjutkan?')) return;
    const upd = {}, now = new Date().toISOString();
    via.forEach(j => { if (!u) upd['docs/' + j.k] = null; else { upd['docs/' + j.k + '/setuju'] = null; upd['docs/' + j.k + '/dilihat'] = null; } }); // folder dihapus/berganti: isi dokumen tak lagi terjamin sama
    upd.folderUrl = u || null; upd.updatedAt = now;
    tulis('perangkat_v4/' + id, upd, () => {
      if (u) rec.folderUrl = u; else delete rec.folderUrl;
      via.forEach(j => { if (!rec.docs || !rec.docs[j.k]) return; if (!u) delete rec.docs[j.k]; else { delete rec.docs[j.k].setuju; delete rec.docs[j.k].dilihat; } });
      rec.updatedAt = now; say(u ? '✅ Tautan folder tersimpan' : 'Tautan folder dihapus');
    }, 'SAVE_PERANGKAT_FOLDER', id);
  }
  function hapusDoc(id, jk) {
    const rec = S.rows[id]; if (!rec || rec.guruKey !== myId()) return;
    if (!confirm('Hapus tautan ' + jk.toUpperCase() + ' ini?')) return;
    const upd = {}; upd['docs/' + jk] = null; upd.updatedAt = new Date().toISOString();
    tulis('perangkat_v4/' + id, upd, () => { if (rec.docs) delete rec.docs[jk]; S.edit = null; say('Tautan dihapus'); }, 'DELETE_PERANGKAT_DOC', id);
  }
  function simpanRevisi(id, jk) {
    const rec = S.rows[id]; if (!rec || !isAdm()) return;
    let x = (rec.docs || {})[jk]; if (!((x && x.url) || appFinal(x, jk, id) || menunggu(x, jk, id))) return say('Dokumen belum diisi guru.', true);
    if (!x) { rec.docs = rec.docs || {}; x = rec.docs[jk] = {}; } // RPE otomatis: belum ada simpul data
    const t = ((document.getElementById('ppRevisi') || {}).value || '').trim().slice(0, 200), b = 'docs/' + jk + '/';
    const upd = {}; upd[b + 'revisi'] = t || null; upd[b + 'revisiBy'] = t ? myName() : null;
    tulis('perangkat_v4/' + id, upd, () => { if (t) { x.revisi = t; x.revisiBy = myName(); } else { delete x.revisi; delete x.revisiBy; } S.edit = null; say('✅ Catatan tersimpan'); }, 'REVIEW_PERANGKAT_DOC', id);
  }
  function setujuDoc(id, jk, cabut) {
    const rec = S.rows[id], j = JENIS.find(z => z.k === jk); if (!rec || !j || !j.setuju || !isAdm()) return;
    if (rec.guruKey === myId()) return say('Persetujuan tidak boleh diberikan pada dokumen sendiri.', true);
    const x = (rec.docs || {})[jk] || {};
    if (!cabut && !(x.url || genAda(jk, id) || viaFolder(x, id))) return say('Dokumen belum ada.', true);
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
    if (a === 'rpe' || a === 'atp' || a === 'prota' || a === 'kisi' || a === 'soal') { const kunci = kunciTahap(a, id); if (kunci) return say(kunci, true, 6000); }
    switch (a) {
      case 'muat': return muat();
      case 'view': S.view = t.getAttribute('data-v') === 'rekap' ? 'rekap' : 'saya'; S.edit = null; return render();
      case 'edit': S.edit = (S.edit && S.edit.id === id && S.edit.j === j) ? null : { id: id, j: j }; S.fokusEditor = !!S.edit; return render();
      case 'tutup': S.edit = null; return render();
      case 'tambah': S.tambah = true; return render();
      case 'tambah-batal': S.tambah = false; return render();
      case 'tambah-simpan': return tambahBaris();
      case 'tambah-jadwal': return tambahJadwal(false);
      case 'tambah-jadwal-semua': return tambahJadwal(true);
      case 'simpan-doc': return simpanDoc(id, j);
      case 'hapus-doc': return hapusDoc(id, j);
      case 'simpan-revisi': return simpanRevisi(id, j);
      case 'app-final': return appFinalSet(id, j, false);
      case 'app-batal': return appFinalSet(id, j, true);
      case 'setuju': return setujuDoc(id, j, false);
      case 'cabut-setuju': return setujuDoc(id, j, true);
      case 'hapus-baris': return hapusBaris(id);
      case 'kaldik-edit': S.kaldikEdit = true; return render();
      case 'kaldik-batal': S.kaldikEdit = false; return render();
      case 'kaldik-simpan': return simpanKaldik();
      case 'kaldik-hapus': return hapusKaldik();
      case 'folder-ubah': return ubahFolder(id);
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
      case 'paket': if (typeof window.paketBuka !== 'function') return say('Modul Paket belum dimuat (js/perangkat-paket.js).', true);
                  return window.paketBuka(id, S.rows[id], S.sem, taText(), { genAda: genAda, appFinal: appFinal, menunggu: menunggu, perluSetuju: perluSetuju });
      case 'rpe-kaldik': if (typeof window.rpeKaldikBuka !== 'function') return say('Modul RPE belum dimuat (js/perangkat-rpe.js).', true);
                  return window.rpeKaldikBuka(S.sem, taText());
      case 'filter-reset': S.filterGuru = ''; S.filterKelas = ''; S.filterStatus = ''; S.buka = {}; S.edit = null; return render();
      case 'tenggat-edit': S.tenggatEdit = true; return render();
      case 'tenggat-batal': S.tenggatEdit = false; return render();
      case 'tenggat-simpan': return simpanTenggat(false);
      case 'tenggat-hapus': return simpanTenggat(true);
      case 'grp': S.buka[id] = !S.bukaNow[id]; S.edit = null; return render();
      case 'grp-semua': { const ke = !S.semuaBuka; Object.keys(S.bukaNow).forEach(k => { S.buka[k] = ke; }); S.edit = null; return render(); }
      case 'setuju-buka': S.setujuBuka = !S.setujuBuka; S.edit = null; return render();
      case 'setuju-guru': return setujuMassal(id, false);
      case 'setuju-semua': return setujuMassal('*', false);
      case 'setuju-dilihat': return setujuMassal('*', true);
      case 'dilihat': return tandaiDilihat(id, j, false);
      case 'batal-dilihat': return tandaiDilihat(id, j, true);
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
    else if (a === 'filter-guru') { S.filterGuru = t.value; S.buka = {}; S.edit = null; render(); }
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
    S.epoch++; S.posOk = false; S.gen = null; S.buka = {}; S.bukaNow = {}; S.rows = {}; S.kaldik = null; S.rpeKaldik = null; S.jadwalSemua = null; S.jadwal = null; S.siap = false; S.err = null; S.view = 'saya'; S.edit = null; S.tambah = false;
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
