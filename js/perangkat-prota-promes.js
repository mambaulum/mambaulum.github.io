/* ============================================================
   SI MAMBA - js/perangkat-prota-promes.js
   Pembuat PROTA (Program Tahunan) dan PROMES (Program Semester) siap cetak.
   - Daftar materi (nama + alokasi JP) per semester diisi di sini, atau terisi otomatis dari menu 🎯 ATP/TP
     lewat tombol "Terapkan ke Prota/Promes" (data sama: perangkat_materi_v4).
   - Prota: seluruh materi Ganjil + Genap beserta jumlah JP per semester dan setahun.
   - Promes: materi disebar berurutan ke pekan-pekan efektif semester itu sesuai kapasitas JP per pekan
     (dari kalender efektif RPE: js/perangkat-rpe.js). Pekan tanpa hari efektif diarsir. Ada peringatan bila
     JP materi melebihi kapasitas dan keterangan sisa kapasitas (pengayaan/remedial/cadangan).
   Bergantung pada js/perangkat-rpe.js (window.rpeUtil). Diekspos: protaBuka(id, rec, sem, ta), protaUtil.

   Data Firebase (sama dengan yang ditulis modul ATP/TP):
   perangkat_materi_v4/<ta>_<semester>_<guru>_<mapel>_<kelas> = { guruKey, guruName, tahunAjaran, semester, mapel, kelas,
       materi: [ { n, jp } ], jpPerPekan, at, by }     (dihapus bila semester itu tidak punya materi)
   Membaca: perangkat_rpe_kaldik_v4/<ta>_<semester> (kalender efektif + kop).
============================================================ */
(function () {
  'use strict';

  const SEM = ['ganjil', 'genap'];
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };
  const MAX_ITEMS = 80;
  const R = () => window.rpeUtil;
  const esc = s => R().esc(s);

  // ---------- Pembantu murni ----------
  // Sebar materi (berurutan) ke deret kapasitas JP per pekan.
  // Hasil: res[k] = { indeksPekan: jp }, kurang = JP yang tidak tertampung, sisa = kapasitas tersisa.
  function alokasi(items, caps) {
    const res = items.map(() => ({}));
    let wi = 0, left = caps.length ? caps[0] : 0, kurang = 0;
    items.forEach((it, k) => {
      let need = Math.max(0, Math.round(+it.jp) || 0);
      while (need > 0 && wi < caps.length) {
        if (left <= 0) { wi++; left = wi < caps.length ? caps[wi] : 0; continue; }
        const t = Math.min(need, left); res[k][wi] = (res[k][wi] || 0) + t; need -= t; left -= t;
      }
      kurang += need;
    });
    let sisa = 0;
    if (wi < caps.length) { sisa = left; for (let i = wi + 1; i < caps.length; i++) sisa += caps[i]; }
    return { res: res, kurang: kurang, sisa: sisa };
  }
  // Susun Promes satu semester: pekan dari kalender RPE + alokasi materi.
  function susunPromes(cfg, jp, items) {
    const h = R().hitungPekan(cfg, jp), weeks = [];
    h.bulan.forEach((b, bi) => b.pekan.forEach((p, pi) => weeks.push({ bi: bi, pi: pi, cap: p.cap, ef: p.ef, hari: p.hari })));
    const al = alokasi(items, weeks.map(w => w.cap));
    return { h: h, weeks: weeks, res: al.res, kurang: al.kurang, sisa: al.sisa, kapasitas: weeks.reduce((s, w) => s + w.cap, 0) };
  }
  const jpInt = v => { const n = parseInt(v, 10); return n > 0 ? Math.min(n, 99) : 0; };
  function bacaItems(doc) {
    return R().daftar(doc && doc.materi).map(x => ({ n: String((x && x.n) || ''), jp: jpInt(x && x.jp) })).filter(x => x.n);
  }
  const jumlahJp = items => items.reduce((s, x) => s + (+x.jp || 0), 0);

  // ---------- Pembantu yang bergantung app.js ----------
  const myId = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : '';
  const myName = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';
  const say = (m, err, ms) => { if (typeof toast === 'function') toast(m, !!err, ms); };
  const audit = (aksi, id) => { try { if (typeof v4Audit === 'function') v4Audit(aksi, 'PERANGKAT', id, null, null); } catch (e) {} };

  // ---------- Status ----------
  const P = { rec: null, ta: '', sem: 'ganjil', data: { ganjil: [], genap: [] }, ada: { ganjil: false, genap: false }, cfg: { ganjil: null, genap: null },
              jp: '', nip: '', bulk: false, loading: false, err: null, busy: false, dirty: false, epoch: 0 };
  const muted = 'color:#6b7280;font-size:12px;';
  const btn = (a, t, kelas, extra) => `<button type="button" class="btn ${kelas || 'btn-soft'}" style="padding:6px 12px;font-size:12px;${extra || ''}" data-a="${a}">${t}</button>`;
  const jpNum = () => { const n = parseInt(P.jp, 10); return (n >= 1 && n <= 40) ? n : 0; };
  const idMateri = s => [R().slug(P.ta), s, R().slug(P.rec.guruKey || myId()), R().slug(P.rec.mapel), R().slug(P.rec.kelas)].join('_');
  const pemilik = () => !!P.rec && P.rec.guruKey === myId();

  // ---------- Dokumen cetak ----------
  function bungkus(judul, orient, isi) {
    const cfg = P.cfg.ganjil || P.cfg.genap || {}, titik = '........................................', madrasah = cfg.madrasah || 'MADRASAH';
    const rec = P.rec, guru = rec.guruName || myName(), jp = jpNum();
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${esc(judul)} ${esc(rec.mapel)} Kelas ${esc(rec.kelas)}</title>
<style>
@page{size:A4 ${orient};margin:${orient === 'landscape' ? '12mm 12mm' : '16mm 15mm'}}
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:${orient === 'landscape' ? '11pt' : '12pt'};color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kop{text-align:center;border-bottom:3px double #111;padding-bottom:8px;margin-bottom:12px}
.kop .m{font-size:16pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px}.kop .j{font-size:13pt;font-weight:700;margin-top:6px}.kop .s{font-size:11pt;margin-top:2px}
.info{margin:0 0 10px;font-size:11pt}.info td{padding:1px 8px 1px 0;vertical-align:top;border:0}
table.t{border-collapse:collapse;width:100%}table.t th,table.t td{border:1px solid #333;padding:3px 5px;vertical-align:top;font-size:${orient === 'landscape' ? '9.5pt' : '11pt'};color:#111}
table.t th{background:#e5e7eb;text-align:center;font-weight:700}table.t td.c{text-align:center}table.t tr.sm td{background:#f3f4f6;font-weight:700}
table.t td.on{background:#bbf7d0;font-weight:700;text-align:center}table.t td.non{background:#d1d5db;text-align:center}table.t tfoot td{font-weight:700;background:#f3f4f6;text-align:center}
.cat{font-size:10pt;margin-top:8px}.warn{font-size:10pt;margin-top:6px;color:#b91c1c}
.ttd{display:flex;justify-content:space-between;gap:20px;margin-top:22px;font-size:11pt;page-break-inside:avoid}.ttd>div{width:48%;text-align:left}.ttd .sp{height:62px}
</style></head><body>
<div class="kop"><div class="m">${esc(madrasah)}</div><div class="j">${esc(judul)}</div><div class="s">Tahun Pelajaran ${esc(P.ta)}${orient === 'landscape' ? ' · Semester ' + SEM_LABEL[P.sem] : ''}</div></div>
<table class="info"><tr><td>Mata Pelajaran</td><td>: ${esc(rec.mapel)}</td></tr><tr><td>Kelas</td><td>: ${esc(rec.kelas)}</td></tr><tr><td>Guru</td><td>: ${esc(guru)}</td></tr>${orient === 'landscape' && jp ? `<tr><td>Alokasi waktu</td><td>: ${jp} JP per pekan</td></tr>` : ''}</table>
${isi}
<div class="ttd"><div>Mengetahui,<br>Kepala ${esc(madrasah)}<div class="sp"></div><b><u>${esc(cfg.kepala || titik)}</u></b><br>NIP. ${esc(cfg.nipKepala || titik)}</div>
<div>${esc(cfg.kota || titik)}, ${R().fmtTgl(new Date())}<br>Guru Mata Pelajaran<div class="sp"></div><b><u>${esc(guru || titik)}</u></b><br>NIP. ${esc(P.nip || titik)}</div></div>
</body></html>`;
  }
  function htmlProta() {
    let no = 0, tot = 0, body = '';
    SEM.forEach(s => {
      const list = P.data[s]; if (!list.length) return;
      const sub = jumlahJp(list); tot += sub;
      body += `<tr class="sm"><td colspan="3">Semester ${SEM_LABEL[s]}</td></tr>` + list.map(x => `<tr><td class="c">${++no}</td><td>${esc(x.n)}</td><td class="c">${x.jp}</td></tr>`).join('') +
        `<tr class="sm"><td colspan="2">Jumlah JP Semester ${SEM_LABEL[s]}</td><td class="c">${sub}</td></tr>`;
    });
    if (!no) return null;
    const lengkap = SEM.every(s => P.data[s].length) ? '' : `<div class="cat"><b>Catatan:</b> materi semester ${P.data.ganjil.length ? 'Genap' : 'Ganjil'} belum diisi, jadi belum tampil.</div>`;
    return `<table class="t"><thead><tr><th style="width:36px">No</th><th>Materi / Bab</th><th style="width:110px">Alokasi Waktu (JP)</th></tr></thead><tbody>${body}<tr class="sm"><td colspan="2">Jumlah JP Setahun</td><td class="c">${tot}</td></tr></tbody></table>${lengkap}`;
  }
  function htmlPromes() {
    const cfg = P.cfg[P.sem], items = P.data[P.sem], jp = jpNum();
    if (!cfg) return say('Kalender efektif semester ini belum diisi Admin, jadi Promes belum bisa dibuat.', true), null;
    if (!jp) return say('Isi JP per pekan (1–40) dulu.', true), null;
    if (!items.length) return say('Isi daftar materi semester ini dulu.', true), null;
    const m = susunPromes(cfg, jp, items), B = R().BULAN;
    const h1 = m.h.bulan.map(b => `<th colspan="${b.pekan.length}">${B[b.bln]} ${b.tahun}</th>`).join('');
    const h2 = m.h.bulan.map(b => b.pekan.map((p, i) => `<th>${i + 1}</th>`).join('')).join('');
    const body = items.map((x, k) => `<tr><td class="c">${k + 1}</td><td>${esc(x.n)}</td><td class="c">${x.jp}</td>${m.weeks.map((w, i) => { const v = m.res[k][i]; return v ? `<td class="on">${v}</td>` : (w.cap === 0 ? '<td class="non"></td>' : '<td></td>'); }).join('')}</tr>`).join('');
    const kap = m.weeks.map(w => `<td${w.cap === 0 ? ' class="non"' : ''}>${w.cap || '-'}</td>`).join('');
    const tot = jumlahJp(items);
    const cat = `<div class="cat">Angka pada kolom pekan = JP materi yang dilaksanakan pada pekan itu. Kolom abu-abu = pekan tanpa hari efektif (libur/kegiatan). Total JP materi ${tot} dari kapasitas ${m.kapasitas} JP.</div>` +
      (m.kurang ? `<div class="warn"><b>Perhatian:</b> ${m.kurang} JP materi tidak tertampung pada pekan efektif. Kurangi JP materi atau tambah JP per pekan.</div>` : '') +
      (m.sisa ? `<div class="cat">Sisa kapasitas ${m.sisa} JP dapat dipakai untuk pengayaan, remedial, atau cadangan.</div>` : '');
    return `<table class="t"><thead><tr><th rowspan="2" style="width:30px">No</th><th rowspan="2">Materi / Bab</th><th rowspan="2" style="width:36px">JP</th>${h1}</tr><tr>${h2}</tr></thead>
<tbody>${body}</tbody><tfoot><tr><td></td><td style="text-align:left">Kapasitas JP per pekan</td><td>${m.kapasitas}</td>${kap}</tr></tfoot></table>${cat}`;
  }
  function cetak(jenis, mode) {
    R().nipSimpan(P.nip);
    const isi = jenis === 'prota' ? htmlProta() : htmlPromes();
    if (!isi) { if (jenis === 'prota') say('Isi daftar materi dulu.', true); return; }
    const html = jenis === 'prota' ? bungkus('PROGRAM TAHUNAN (PROTA)', 'portrait', isi) : bungkus('PROGRAM SEMESTER (PROMES)', 'landscape', isi);
    R().keluarkan(html, (jenis === 'prota' ? 'Prota_' : 'Promes_' + P.sem + '_') + P.rec.mapel + '_' + P.rec.kelas, mode);
  }

  // ---------- Tampilan ----------
  function ov() {
    let el = document.getElementById('protaOverlay'); if (el) return el;
    el = document.createElement('div'); el.id = 'protaOverlay';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;background:rgba(15,23,42,.5);overflow:auto;padding:12px;';
    el.addEventListener('click', klik); el.addEventListener('input', ketik);
    document.body.appendChild(el); return el;
  }
  function tutup(paksa) {
    if (!paksa && P.dirty && !confirm('Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?')) return;
    const el = document.getElementById('protaOverlay'); if (el) el.remove(); P.epoch++; P.rec = null; P.dirty = false;
  }
  function ringkas() {
    const items = P.data[P.sem], tot = jumlahJp(items), cfg = P.cfg[P.sem], jp = jpNum();
    let s = `Jumlah materi: <b>${items.length}</b> · total JP: <b>${tot}</b>`;
    if (!cfg) s += ` · <span style="color:#b45309;">kalender efektif semester ini belum diisi Admin (Promes belum bisa dibuat)</span>`;
    else if (!jp) s += ' · isi JP per pekan untuk melihat kapasitas semester';
    else {
      const kap = R().hitungPekan(cfg, jp).bulan.reduce((a, b) => a + b.pekan.reduce((c, p) => c + p.cap, 0), 0);
      s += ` · kapasitas semester: <b>${kap}</b> JP`;
      if (tot > kap) s += ` <span style="color:#b91c1c;">(kelebihan ${tot - kap} JP)</span>`; else if (tot < kap) s += ` <span style="color:#166534;">(sisa ${kap - tot} JP untuk pengayaan/cadangan)</span>`;
    }
    return s;
  }
  function gambar() {
    const el = document.getElementById('protaOverlay'); if (!el) return;
    let isi;
    if (P.loading) isi = `<div style="${muted}padding:12px;">⏳ Memuat daftar materi...</div>${btn('tutup', 'Tutup')}`;
    else if (P.err) isi = `<div style="padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;margin-bottom:8px;">⚠️ ${esc(P.err)}</div>${btn('tutup', 'Tutup')}`;
    else isi = panel();
    el.innerHTML = `<style>.pp-row{display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap}</style><div style="max-width:780px;margin:0 auto;background:#fff;color:#111;border-radius:12px;padding:16px;">${isi}</div>`;
  }
  function panel() {
    const rec = P.rec, own = pemilik(), items = P.data[P.sem];
    const tab = s => `<button type="button" class="btn ${P.sem === s ? 'btn-success' : 'btn-soft'}" style="padding:6px 12px;font-size:12px;" data-a="sem" data-s="${s}">Semester ${SEM_LABEL[s]} (${P.data[s].length})</button>`;
    const baris = items.map((x, i) => `<div class="pp-row"><b style="font-size:12px;width:22px;">${i + 1}.</b>
      <input class="field" maxlength="120" style="flex:1;min-width:180px;" data-i="${i}" data-f="n" value="${esc(x.n)}" placeholder="Materi / Bab" ${own ? '' : 'disabled'}>
      <input class="field" type="number" min="0" max="99" inputmode="numeric" style="width:70px;" data-i="${i}" data-f="jp" value="${x.jp}" aria-label="JP" ${own ? '' : 'disabled'}>
      ${own ? btn('naik', '↑', '', 'padding:4px 8px;').replace('data-a=', 'data-i="' + i + '" data-a=') + btn('turun', '↓', '', 'padding:4px 8px;').replace('data-a=', 'data-i="' + i + '" data-a=') + btn('hapus', '🗑', '', 'padding:4px 8px;').replace('data-a=', 'data-i="' + i + '" data-a=') : ''}</div>`).join('');
    const bulk = P.bulk ? `<div style="margin-top:8px;"><textarea id="protaBulk" class="field" rows="5" style="width:100%;" placeholder="Satu materi per baris: nama materi | JP&#10;Contoh:&#10;Rukun iman | 8&#10;Asmaul husna | 6"></textarea><div style="margin-top:4px;display:flex;gap:6px;">${btn('bulk-ok', 'Tambahkan', 'btn-success')}${btn('bulk', 'Batal')}</div></div>` : '';
    return `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <div><div style="font-size:17px;font-weight:700;">🗂 Prota / Promes · ${esc(rec.mapel)} · Kelas ${esc(rec.kelas)}</div>
      <div style="${muted}">Tahun ajaran ${esc(P.ta)}${own ? '' : ' · hanya lihat (bukan pemilik)'}</div></div>${btn('tutup', '✕')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
        <label style="font-size:12px;">JP per pekan<br><input class="field" type="number" min="1" max="40" inputmode="numeric" style="width:100px;" data-f="jp" value="${esc(P.jp)}" placeholder="mis. 4" ${own ? '' : 'disabled'}></label>
        <label style="font-size:12px;">NIP guru (untuk tanda tangan)<br><input class="field" maxlength="30" style="width:220px;" data-f="nip" value="${esc(P.nip)}" placeholder="boleh dikosongkan"></label></div>
      <div style="${muted}margin-top:4px;">Materi juga bisa terisi otomatis dari menu 🎯 ATP/TP (tombol Terapkan ke Prota/Promes).</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">${tab('ganjil')}${tab('genap')}</div>
      <div id="protaSum" style="margin:8px 0;font-size:13px;">${ringkas()}</div>
      ${baris || `<div style="${muted}">Belum ada materi semester ini.</div>`}
      ${own ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">${btn('tambah', '➕ Tambah Materi')}${btn('bulk', '📋 Tempel Banyak Baris')}${btn('simpan', '💾 Simpan' + (P.dirty ? ' ●' : ''), 'btn-success')}</div>${bulk}` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;border-top:1px solid #e5e7eb;padding-top:12px;">${btn('prota', '🖨 Cetak Prota', 'btn-success')}${btn('promes', '🖨 Cetak Promes ' + SEM_LABEL[P.sem], 'btn-success')}${btn('prota-word', '📄 Prota Word')}${btn('promes-word', '📄 Promes Word')}${btn('tutup', 'Tutup')}</div>`;
  }
  function ringkasLagi() { const e = document.getElementById('protaSum'); if (e) e.innerHTML = ringkas(); }

  // ---------- Simpan ----------
  function bersih(items) { return items.map(x => ({ n: String(x.n || '').trim().replace(/\s+/g, ' ').slice(0, 120), jp: jpInt(x.jp) })).filter(x => x.n); }
  function simpan() {
    if (!pemilik()) return say('Hanya pemilik perangkat yang bisa menyimpan.', true);
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (P.busy) return;
    if (P.jp !== '' && !jpNum()) return say('JP per pekan harus 1–40 (atau kosongkan).', true);
    const now = new Date().toISOString(), jp = jpNum() || null, rec = P.rec, isi = {};
    for (let i = 0; i < SEM.length; i++) {
      const s = SEM[i]; isi[s] = bersih(P.data[s]);
      if (isi[s].length > MAX_ITEMS) return say('Maksimal ' + MAX_ITEMS + ' materi per semester.', true);
    }
    P.busy = true;
    const tulis = SEM.map(s => () => {
      const ref = db.ref('perangkat_materi_v4/' + idMateri(s));
      if (!isi[s].length) return P.ada[s] ? ref.remove() : Promise.resolve();
      return ref.set({ guruKey: rec.guruKey, guruName: rec.guruName || myName(), tahunAjaran: P.ta, semester: s, mapel: rec.mapel, kelas: rec.kelas,
        materi: isi[s], jpPerPekan: jp, at: now, by: myName() });
    });
    R().siap().then(() => Promise.all(tulis.map(f => f()))).then(() => {
      P.busy = false; P.dirty = false; SEM.forEach(s => { P.data[s] = isi[s]; P.ada[s] = isi[s].length > 0; });
      audit('SAVE_PERANGKAT_MATERI', idMateri(P.sem)); say('✅ Materi tersimpan'); if (P.rec) gambar();
    }).catch(err => { P.busy = false; console.error('[SI MAMBA] prota/promes:', err); say('❌ Gagal menyimpan: ' + ((err && err.message) || err), true); });
  }

  // ---------- Event ----------
  function swap(a, i, j) { if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; }
  function klik(e) {
    const t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return;
    const a = t.getAttribute('data-a'), i = +t.getAttribute('data-i'), list = P.data[P.sem];
    switch (a) {
      case 'tutup': return tutup();
      case 'sem': P.sem = t.getAttribute('data-s') === 'genap' ? 'genap' : 'ganjil'; P.bulk = false; return gambar();
      case 'tambah': if (list.length >= MAX_ITEMS) return say('Maksimal ' + MAX_ITEMS + ' materi per semester.', true); list.push({ n: '', jp: 0 }); P.dirty = true; return gambar();
      case 'hapus': list.splice(i, 1); P.dirty = true; return gambar();
      case 'naik': swap(list, i, i - 1); P.dirty = true; return gambar();
      case 'turun': swap(list, i, i + 1); P.dirty = true; return gambar();
      case 'bulk': P.bulk = !P.bulk; return gambar();
      case 'bulk-ok': {
        const txt = (document.getElementById('protaBulk') || {}).value || '', add = [];
        txt.split(/\r?\n/).forEach(line => {
          const p = line.split(/\t|\|/).map(s => s.trim()); if (!p[0]) return;
          const last = p.length > 1 ? p[p.length - 1] : '';
          add.push({ n: p[0].slice(0, 120), jp: /^\d+$/.test(last) ? jpInt(last) : 0 });
        });
        if (!add.length) return say('Tidak ada baris yang bisa dibaca.', true);
        if (list.length + add.length > MAX_ITEMS) return say('Maksimal ' + MAX_ITEMS + ' materi per semester.', true);
        P.data[P.sem] = list.concat(add); P.bulk = false; P.dirty = true; say('✅ ' + add.length + ' materi ditambahkan. Jangan lupa Simpan.', false, 2500); return gambar();
      }
      case 'simpan': return simpan();
      case 'prota': return cetak('prota');
      case 'promes': return cetak('promes');
      case 'prota-word': return cetak('prota', 'word');
      case 'promes-word': return cetak('promes', 'word');
    }
  }
  function ketik(e) {
    const t = e.target, f = t && t.getAttribute ? t.getAttribute('data-f') : null; if (!f) return;
    if (f === 'jp' && !t.hasAttribute('data-i')) { P.jp = t.value; P.dirty = true; return ringkasLagi(); }
    if (f === 'nip') { P.nip = t.value; return; }
    const i = +t.getAttribute('data-i'), x = P.data[P.sem][i]; if (!x) return;
    if (f === 'n') x.n = t.value; else if (f === 'jp') x.jp = jpInt(t.value);
    P.dirty = true; ringkasLagi();
  }

  function muat() {
    const ep = ++P.epoch; P.loading = true; P.err = null; gambar();
    if (typeof db === 'undefined' || !db) { P.loading = false; P.err = 'Database belum siap.'; return gambar(); }
    const slug = R().slug(P.ta);
    Promise.all([db.ref('perangkat_materi_v4/' + idMateri('ganjil')).once('value'), db.ref('perangkat_materi_v4/' + idMateri('genap')).once('value'),
      db.ref('perangkat_rpe_kaldik_v4/' + slug + '_ganjil').once('value'), db.ref('perangkat_rpe_kaldik_v4/' + slug + '_genap').once('value')]).then(r => {
      if (ep !== P.epoch) return;
      const d = [r[0].val(), r[1].val()];
      SEM.forEach((s, n) => { P.data[s] = bacaItems(d[n]); P.ada[s] = !!d[n]; P.cfg[s] = R().bacaCfg(r[2 + n].val() || null); });
      const dj = (d[0] && d[0].jpPerPekan) || (d[1] && d[1].jpPerPekan) || P.rec.jpPerPekan || '';
      P.jp = dj ? String(dj) : ''; P.loading = false; gambar();
    }).catch(err => { if (ep !== P.epoch) return; P.loading = false; P.err = 'Gagal memuat: ' + ((err && err.message) || err); gambar(); });
  }

  // ---------- API publik ----------
  window.protaBuka = function (id, rec, sem, ta) {
    if (!rec) return;
    if (!window.rpeUtil) return say('Modul RPE belum dimuat (js/perangkat-rpe.js harus dimuat lebih dulu).', true);
    P.rec = rec; P.ta = String(ta || ''); P.sem = sem === 'genap' ? 'genap' : 'ganjil'; P.dirty = false; P.bulk = false;
    P.data = { ganjil: [], genap: [] }; P.ada = { ganjil: false, genap: false }; P.cfg = { ganjil: null, genap: null };
    try { P.nip = localStorage.getItem('rpe_nip_' + myId()) || ''; } catch (e) { P.nip = ''; }
    R().nipIsi(P, '#protaOverlay');
    ov(); muat();
  };
  window.protaUtil = { alokasi: alokasi, susunPromes: susunPromes, bacaItems: bacaItems, jumlahJp: jumlahJp, state: P };
})();
