/* ============================================================
   SI MAMBA - js/perangkat-kisi.js
   Pembuat KISI-KISI Asesmen Sumatif Akhir Semester (Ganjil/Genap) siap cetak, langsung dari TP yang sudah
   dipilih lewat menu 🎯 ATP/TP (js/perangkat-atp-tp.js).
   - Tiap TP otomatis menjadi baris kisi-kisi: indikator soal (usulan dari TP, boleh disunting), level kognitif
     L1/L2/L3 (usulan dari kata kerja TP), jumlah soal PG / isian / uraian.
   - "Bagi otomatis": total soal per bentuk dibagi ke TP sebanding bobot JP-nya. Nomor soal dihitung otomatis
     (PG dulu, lalu isian, lalu uraian). Ringkasan komposisi level dan peringatan TP yang belum punya soal.
   Bergantung pada js/perangkat-rpe.js. Diekspos: kisiBuka(id, rec, sem, ta), kisiUtil.

   Data Firebase (baru):
   perangkat_kisi_v4/<ta>_<semester>_<guru>_<mapel>_<kelas> = { guruKey, guruName, tahunAjaran, semester, mapel, kelas,
       judul, waktu, tot: { pg, is, ur }, items: [ { k, e, t, m, jp, i, lv, pg, is, ur } ], at, by }
   Membaca: perangkat_tp_v4/<ta>_<guru>_<mapel>_<kelas> (daftar TP) dan perangkat_rpe_kaldik_v4 (untuk kop).
============================================================ */
(function () {
  'use strict';

  const SEM = ['ganjil', 'genap'];
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };
  const BENTUK = [['pg', 'Pilihan Ganda'], ['is', 'Isian Singkat'], ['ur', 'Uraian']];
  const MAX_SOAL = 200;
  const R = () => window.rpeUtil;
  const esc = s => R().esc(s);

  // ---------- Pembantu murni ----------
  function fase(kelas) {
    const t = String(kelas || '').trim().toUpperCase().replace(/^KELAS\s*/, '');
    let n = 0, m = /^(\d+)/.exec(t);
    if (m) n = +m[1];
    else if ((m = /^(VI|IV|V|III|II|I)(?=[^IVX]|$)/.exec(t))) n = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }[m[1]];
    return n >= 1 && n <= 2 ? 'A' : n >= 3 && n <= 4 ? 'B' : n >= 5 && n <= 6 ? 'C' : '';
  }
  // Usulan level kognitif dari kata kerja pertama TP: L1 mengingat/mengenali, L2 memahami/menerapkan, L3 menalar.
  function levelDari(t) {
    const w = String(t || '').toLowerCase().trim().replace(/^murid\s+mampu\s+/, '');
    if (/^(menganalisis|merefleksikan|membandingkan|mengevaluasi|menyimpulkan)/.test(w)) return 'L3';
    if (/^(menghafal|menyebutkan|mengenali|mengenal|mengidentifikasi|meniru|menemukan)/.test(w)) return 'L1';
    return 'L2';
  }
  // Butir kisi-kisi resmi (js/data-kisi-resmi-mi.js) untuk satu TP; [] bila tidak ada.
  const resmi = k => { const B = window.BANK_KISI_RESMI_MI; return (B && B[k]) || []; };
  const indikator = t => { const s = String(t || '').trim(); return /^Murid mampu /i.test(s) ? s.replace(/^Murid mampu /i, 'Murid dapat ') : s; };
  // Bagi total ke n bobot (pecahan terbesar dulu; seri ke indeks awal). Jumlah hasil = total.
  function bagiBobot(bobot, total) {
    const n = bobot.length; if (!n || total < 1) return bobot.map(() => 0);
    const sum = bobot.reduce((a, b) => a + b, 0), raw = bobot.map(b => (sum > 0 ? b / sum : 1 / n) * total);
    const out = raw.map(x => Math.floor(x + 1e-9));
    let sisa = total - out.reduce((a, b) => a + b, 0);
    raw.map((x, i) => ({ i: i, f: x - Math.floor(x + 1e-9) })).sort((p, q) => (q.f - p.f) || (p.i - q.i)).forEach(x => { if (sisa > 0) { out[x.i]++; sisa--; } });
    return out;
  }
  const angka = v => { const n = parseInt(v, 10); return n >= 0 && n <= 99 ? n : 0; };
  const menit = v => { const n = parseInt(v, 10); return n >= 0 && n <= 600 ? n : 0; }; // waktu asesmen boleh 100+ menit
  // Nomor soal berurutan: seluruh PG, lalu isian, lalu uraian. Hasil per baris: { pg:'1–3', is:'', ur:'41' }.
  function nomori(rows) {
    const out = rows.map(() => ({ pg: '', is: '', ur: '' })); let mulai = 1;
    BENTUK.forEach(b => rows.forEach((r, i) => {
      const n = angka(r[b[0]]); if (!n) return;
      out[i][b[0]] = n === 1 ? String(mulai) : mulai + '–' + (mulai + n - 1); mulai += n;
    }));
    return out;
  }

  // ---------- Pembantu yang bergantung app.js ----------
  const myId = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : '';
  const myName = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';
  const say = (m, err, ms) => { if (typeof toast === 'function') toast(m, !!err, ms); };
  const audit = (aksi, id) => { try { if (typeof v4Audit === 'function') v4Audit(aksi, 'PERANGKAT', id, null, null); } catch (e) {} };

  // ---------- Status ----------
  const mkSet = () => ({ judul: 'Asesmen Sumatif Akhir Semester', waktu: '90', pg: '20', is: '5', ur: '5' });
  const K = { rec: null, ta: '', fase: '', sem: 'ganjil', rows: { ganjil: [], genap: [] }, set: { ganjil: mkSet(), genap: mkSet() },
              cfg: { ganjil: null, genap: null }, nip: '', loading: false, err: null, busy: false, dirty: false, ro: false, epoch: 0 };
  const MUT = ['bagi', 'simpan'];
  // Mode baca-saja untuk Admin/Kepsek yang membuka perangkat milik guru lain (simpan memang hanya untuk pemilik).
  function kunciRo(el, mut) {
    el.querySelectorAll('input:not([data-f="nip"]),select,textarea').forEach(i => { i.disabled = true; });
    el.querySelectorAll('button[data-a]').forEach(b => { if (mut.indexOf(b.getAttribute('data-a')) >= 0) b.disabled = true; });
    const kartu = el.querySelector('div');
    if (kartu) kartu.insertAdjacentHTML('afterbegin', '<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;color:#1e40af;">👁 Mode lihat saja: ini perangkat milik guru lain. Perubahan hanya bisa disimpan oleh pemiliknya; Anda tetap bisa mencetak.</div>');
  }
  const muted = 'color:#6b7280;font-size:12px;';
  const btn = (a, t, kelas, extra) => `<button type="button" class="btn ${kelas || 'btn-soft'}" style="padding:6px 12px;font-size:12px;${extra || ''}" data-a="${a}">${t}</button>`;
  const slug = s => R().slug(s);
  const idTp = () => [slug(K.ta), slug(K.rec.guruKey || myId()), slug(K.rec.mapel), slug(K.rec.kelas)].join('_');
  const idKisi = s => [slug(K.ta), s, slug(K.rec.guruKey || myId()), slug(K.rec.mapel), slug(K.rec.kelas)].join('_');
  const kopCfg = () => K.cfg.ganjil || K.cfg.genap || {};
  const jmlBentuk = (s, b) => K.rows[s].reduce((t, r) => t + angka(r[b]), 0);
  const jmlSoal = s => BENTUK.reduce((t, b) => t + jmlBentuk(s, b[0]), 0);

  // ---------- Dokumen cetak ----------
  const CSS = `.ks-tbl{border-collapse:collapse;width:100%}
.ks-tbl th,.ks-tbl td{border:1px solid #333;padding:3px 5px;font-size:11px;color:#111;vertical-align:top}
.ks-tbl th{background:#e5e7eb;text-align:center;font-weight:700}
.ks-tbl td.c{text-align:center}
.ks-tbl tr.jml td{font-weight:700;background:#f3f4f6}`;
  function tabelKisi(s, kecil) {
    const rows = K.rows[s], no = nomori(rows);
    const body = rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.e)}</td><td>${esc(r.t)}</td><td>${esc(r.m)}</td><td>${esc(r.i)}</td><td class="c">${esc(r.lv)}</td><td class="c">${no[i].pg}</td><td class="c">${no[i].is}</td><td class="c">${no[i].ur}</td><td class="c">${angka(r.pg) + angka(r.is) + angka(r.ur) || ''}</td></tr>`).join('');
    return `<table class="ks-tbl"><thead><tr><th rowspan="2" style="width:26px">No</th><th rowspan="2" style="width:80px">Elemen</th><th rowspan="2">Tujuan Pembelajaran</th><th rowspan="2" style="width:100px">Materi Pokok</th><th rowspan="2">Indikator Soal</th><th rowspan="2" style="width:36px">Level</th><th colspan="3">Nomor Soal</th><th rowspan="2" style="width:36px">Jml</th></tr>
<tr><th style="width:48px">PG</th><th style="width:48px">Isian</th><th style="width:48px">Uraian</th></tr></thead>
<tbody>${body}<tr class="jml"><td colspan="6" class="c">Jumlah soal</td><td class="c">${jmlBentuk(s, 'pg') || ''}</td><td class="c">${jmlBentuk(s, 'is') || ''}</td><td class="c">${jmlBentuk(s, 'ur') || ''}</td><td class="c">${jmlSoal(s)}</td></tr></tbody></table>`;
  }
  function dokumen(s) {
    const c = kopCfg(), t = '........................................', st = K.set[s], nip = String(K.nip || '').trim();
    const bentuk = BENTUK.map(b => jmlBentuk(s, b[0]) ? b[1] + ' ' + jmlBentuk(s, b[0]) : '').filter(Boolean).join(', ') || '-';
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Kisi-kisi ${esc(K.rec.mapel)} Kelas ${esc(K.rec.kelas)} Semester ${SEM_LABEL[s]}</title><style>
@page{size:A4 landscape;margin:11mm 10mm}
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:11pt;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kop{text-align:center;border-bottom:3px double #111;padding-bottom:6px;margin-bottom:8px}
.kop .m{font-size:15pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.kop .j{font-size:13pt;font-weight:700;margin-top:4px}.kop .s{font-size:11pt;margin-top:2px}
.info{margin:0 0 8px;font-size:10.5pt;width:100%}.info td{padding:1px 8px 1px 0;vertical-align:top;border:0}
${CSS}
.ttd{display:flex;justify-content:space-between;gap:20px;margin-top:16px;font-size:11pt;page-break-inside:avoid}
.ttd>div{width:40%}.ttd .sp{height:52px}
tr{page-break-inside:avoid}
</style></head><body>
<div class="kop"><div class="m">${esc(c.madrasah || 'MADRASAH')}</div><div class="j">KISI-KISI ${esc(String(st.judul || 'Asesmen Sumatif Akhir Semester').toUpperCase())}</div><div class="s">Semester ${SEM_LABEL[s]} · Tahun Pelajaran ${esc(K.ta)}</div></div>
<table class="info"><tr><td style="width:120px">Mata Pelajaran</td><td style="width:34%">: ${esc(K.rec.mapel)}</td><td style="width:120px">Jumlah Soal</td><td>: ${jmlSoal(s)} (${esc(bentuk)})</td></tr>
<tr><td>Kelas${K.fase ? ' / Fase' : ''}</td><td>: ${esc(K.rec.kelas)}${K.fase ? ' / Fase ' + K.fase : ''}</td><td>Alokasi Waktu</td><td>: ${esc(st.waktu || '-')} menit</td></tr>
<tr><td>Kurikulum</td><td>: Kurikulum Merdeka</td><td>Penyusun</td><td>: ${esc(K.rec.guruName || myName())}</td></tr></table>
${tabelKisi(s)}
<div class="ttd"><div>Mengetahui,<br>Kepala ${esc(c.madrasah || 'Madrasah')}<div class="sp"></div><b><u>${esc(c.kepala || t)}</u></b><br>NIP. ${esc(c.nipKepala || t)}</div>
<div>${esc(c.kota || t)}, ${R().fmtTgl(new Date())}<br>Guru Mata Pelajaran<div class="sp"></div><b><u>${esc(K.rec.guruName || myName() || t)}</u></b><br>NIP. ${esc(nip || t)}</div></div></body></html>`;
  }
  function cetak(mode) {
    sinkron(); const s = K.sem;
    if (!K.rows[s].length) return say('Belum ada TP di semester ini.', true);
    if (!jmlSoal(s)) return say('Isi jumlah soal dulu (atau tekan Bagi otomatis).', true);
    R().nipSimpan(K.nip);
    R().keluarkan(dokumen(s), 'Kisi_' + K.rec.mapel + '_' + K.rec.kelas + '_' + s, mode);
  }

  // ---------- Tampilan ----------
  function ov() {
    let el = document.getElementById('kisiOverlay'); if (el) return el;
    el = document.createElement('div'); el.id = 'kisiOverlay';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.className = 'pp-modal-overlay';
    el.addEventListener('click', klik); el.addEventListener('input', ketik);
    document.body.appendChild(el); return el;
  }
  function tutup() {
    if (K.dirty && !confirm('Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?')) return;
    const el = document.getElementById('kisiOverlay'); if (el) el.remove(); K.epoch++; K.rec = null; K.dirty = false;
  }
  function ringkasHtml() {
    const s = K.sem, rows = K.rows[s], st = K.set[s];
    const lv = { L1: 0, L2: 0, L3: 0 }; rows.forEach(r => { lv[r.lv] = (lv[r.lv] || 0) + angka(r.pg) + angka(r.is) + angka(r.ur); });
    const tot = jmlSoal(s), pct = k => tot ? Math.round(lv[k] * 100 / tot) : 0;
    const tanpa = rows.filter(r => !(angka(r.pg) + angka(r.is) + angka(r.ur))).length;
    const selisih = BENTUK.map(b => { const t = angka(st[b[0]]), a = jmlBentuk(s, b[0]); return a === t ? '' : `<span style="color:#b45309">${b[1]}: ${a} dari target ${t}</span>`; }).filter(Boolean);
    return `Total soal: <b>${tot}</b> (PG ${jmlBentuk(s, 'pg')}, Isian ${jmlBentuk(s, 'is')}, Uraian ${jmlBentuk(s, 'ur')}) · Level: L1 ${pct('L1')}% · L2 ${pct('L2')}% · L3 ${pct('L3')}%`
      + (tot > MAX_SOAL ? ` <span style="color:#b91c1c">⚠️ melebihi ${MAX_SOAL} soal</span>` : '')
      + (tanpa ? `<div style="color:#b45309;margin-top:4px;">⚠️ ${tanpa} TP belum punya soal.</div>` : '')
      + (selisih.length ? `<div style="margin-top:4px;">${selisih.join(' · ')}</div>` : '');
  }
  function panel() {
    const s = K.sem, rows = K.rows[s], st = K.set[s], no = nomori(rows);
    const tab = x => btn('sem" data-s="' + x, 'Semester ' + SEM_LABEL[x] + ' (' + K.rows[x].length + ' TP)', K.sem === x ? 'btn-success' : 'btn-soft');
    let h = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <div><div style="font-size:17px;font-weight:700;">📋 Kisi-kisi · ${esc(K.rec.mapel)} · Kelas ${esc(K.rec.kelas)}</div>
      <div style="${muted}">Tahun ajaran ${esc(K.ta)}${K.fase ? ' · Fase ' + K.fase : ''}${K.dirty ? ' · <span style="color:#b45309">● belum disimpan</span>' : ''}</div></div>${btn('tutup', '✕')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">${SEM.map(tab).join('')}</div>`;
    if (!rows.length) return h + `<div style="padding:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:13px;color:#92400e;">Belum ada TP untuk semester ${SEM_LABEL[s]}. Pilih TP lebih dulu lewat tombol 🎯 ATP/TP, lalu buka kisi-kisi lagi.</div>`;
    const fld = (k, label, w, tipe) => `<label style="font-size:12px;">${label}<br><input class="field" ${tipe === 'n' ? 'type="number" min="0" max="99" inputmode="numeric"' : tipe === 'w' ? 'type="number" min="0" max="600" inputmode="numeric"' : 'maxlength="80"'} style="width:${w}px;" data-set="${k}" value="${esc(st[k])}"></label>`;
    h += `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">${fld('judul', 'Judul asesmen', 260)}${fld('waktu', 'Waktu (menit)', 90, 'w')}${fld('pg', 'Target PG', 80, 'n')}${fld('is', 'Target isian', 80, 'n')}${fld('ur', 'Target uraian', 80, 'n')}${btn('bagi', '⚡ Bagi otomatis ke TP', 'btn-success')}</div>
      <div style="${muted}margin-top:4px;">Pembagian sebanding bobot JP tiap TP (sama rata bila JP belum diisi). Jumlah per TP bisa diubah manual.</div>
      <div id="kisiSum" style="margin:10px 0;font-size:13px;">${ringkasHtml()}</div>`;
    rows.forEach((r, i) => {
      const num = (k, lab) => `<label style="font-size:11px;">${lab}<br><input class="field" type="number" min="0" max="99" inputmode="numeric" style="width:58px;" data-i="${i}" data-k="${k}" value="${esc(r[k])}"></label>`;
      h += `<div style="margin-top:8px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="display:flex;gap:8px;"><span style="${muted}width:20px;">${i + 1}</span><div style="flex:1;font-size:13px;line-height:1.35;"><span style="${muted}">${esc(r.e)}</span><br>${esc(r.t)}</div></div>
        <textarea class="field" rows="2" maxlength="300" style="width:100%;margin-top:6px;" data-i="${i}" data-k="i" aria-label="Indikator soal ${i + 1}">${esc(r.i)}</textarea>
        ${r.res && r.res.length ? `<div style="margin-top:4px;font-size:11px;color:#1e40af;background:#eff6ff;border-radius:6px;padding:4px 8px;">📘 Kisi-kisi resmi (AM ${esc(r.res[0].mp || '')} MI): ${r.res.map(x => 'butir ' + x.no + ' · kelas ' + esc(x.kelas) + ' · ' + esc(x.bentuk)).join(' | ')}${r.res.length > 1 ? '<br>' + r.res.map(x => '• ' + esc(x.i)).join('<br>') : ''}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:6px;">
          <label style="font-size:11px;">Level<br><select class="field" style="width:70px;" data-i="${i}" data-k="lv">${['L1', 'L2', 'L3'].map(l => `<option ${r.lv === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          ${num('pg', 'PG')}${num('is', 'Isian')}${num('ur', 'Uraian')}
          <span id="kisiNo${i}" style="${muted}">No: ${[no[i].pg && 'PG ' + no[i].pg, no[i].is && 'Isian ' + no[i].is, no[i].ur && 'Uraian ' + no[i].ur].filter(Boolean).join(' · ') || '-'}</span></div></div>`;
    });
    h += `<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;">
      <label style="font-size:12px;">NIP guru (tanda tangan)<br><input class="field" maxlength="30" style="width:200px;" data-f="nip" value="${esc(K.nip)}" placeholder="boleh dikosongkan"></label>
      ${btn('simpan', '💾 Simpan', 'btn-success')}${btn('cetak', '🖨 Cetak Kisi-kisi')}${btn('word', '📄 Kisi-kisi Word')}</div>
      <div style="${muted}margin-top:6px;">Indikator dan level di atas adalah usulan dari TP; sesuaikan dengan soal yang akan dibuat.</div>`;
    return h;
  }
  function gambar() {
    const el = ov(); let isi;
    if (K.loading) isi = `<div style="${muted}padding:12px;">⏳ Memuat TP dan kisi-kisi...</div>${btn('tutup', 'Tutup')}`;
    else if (K.err) isi = `<div style="padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;margin-bottom:8px;">⚠️ ${esc(K.err)}</div>${btn('tutup', 'Tutup')}`;
    else isi = panel();
    el.innerHTML = `<style>${CSS}</style><div style="max-width:900px;margin:0 auto;background:#fff;color:#111;border-radius:12px;padding:16px;">${isi}</div>`;
    if (K.ro && K.rec) kunciRo(el, MUT);
  }
  function segarkan() {
    const sum = document.getElementById('kisiSum'); if (sum) sum.innerHTML = ringkasHtml();
    const no = nomori(K.rows[K.sem]);
    no.forEach((n, i) => { const e = document.getElementById('kisiNo' + i); if (e) e.textContent = 'No: ' + ([n.pg && 'PG ' + n.pg, n.is && 'Isian ' + n.is, n.ur && 'Uraian ' + n.ur].filter(Boolean).join(' · ') || '-'); });
  }

  // ---------- Event ----------
  function sinkron() {
    const el = document.getElementById('kisiOverlay'); if (!el) return;
    el.querySelectorAll('[data-i]').forEach(i => { const r = K.rows[K.sem][+i.getAttribute('data-i')]; if (r && i.hasAttribute('data-k')) r[i.getAttribute('data-k')] = i.value; });
    el.querySelectorAll('[data-set]').forEach(i => { K.set[K.sem][i.getAttribute('data-set')] = i.value; });
    const n = el.querySelector('[data-f="nip"]'); if (n) K.nip = n.value;
  }
  function ketik(e) {
    const t = e.target; if (!t || !t.getAttribute) return;
    const i = t.getAttribute('data-i'), st = t.getAttribute('data-set'), f = t.getAttribute('data-f');
    if (i !== null) { const r = K.rows[K.sem][+i]; if (r) { r[t.getAttribute('data-k')] = t.value; K.dirty = true; } }
    else if (st) { K.set[K.sem][st] = t.value; K.dirty = true; }
    else if (f === 'nip') { K.nip = t.value; return; }
    else return;
    segarkan();
  }
  function bagi() {
    const s = K.sem, rows = K.rows[s], st = K.set[s]; if (!rows.length) return;
    const total = BENTUK.reduce((t, b) => t + angka(st[b[0]]), 0);
    if (!total) return say('Isi target PG/isian/uraian dulu.', true);
    if (total > MAX_SOAL) return say('Maksimal ' + MAX_SOAL + ' soal.', true);
    const bobot = rows.map(r => Math.max(0, parseInt(r.jp, 10) || 0)), pakai = bobot.some(b => b > 0) ? bobot : rows.map(() => 1);
    BENTUK.forEach(b => { bagiBobot(pakai, angka(st[b[0]])).forEach((v, i) => { rows[i][b[0]] = String(v); }); });
    K.dirty = true; say('✅ ' + total + ' soal dibagi ke ' + rows.length + ' TP');
  }
  function simpan() {
    sinkron(); const rec = K.rec;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa menyimpan.', true);
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (K.busy) return; K.busy = true;
    const cut = (s, n) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, n), now = new Date().toISOString();
    const tulis = SEM.filter(s => K.rows[s].length).map(s => db.ref('perangkat_kisi_v4/' + idKisi(s)).set({
      guruKey: rec.guruKey, guruName: rec.guruName || myName(), tahunAjaran: K.ta, semester: s, mapel: rec.mapel, kelas: rec.kelas,
      judul: cut(K.set[s].judul, 80) || 'Asesmen Sumatif Akhir Semester', waktu: menit(K.set[s].waktu),
      tot: { pg: angka(K.set[s].pg), is: angka(K.set[s].is), ur: angka(K.set[s].ur) },
      items: K.rows[s].map(r => ({ k: String(r.k || '').slice(0, 40), e: cut(r.e, 60), t: cut(r.t, 300), m: cut(r.m, 120), jp: Math.max(0, parseInt(r.jp, 10) || 0),
        i: cut(r.i, 300), lv: ['L1', 'L2', 'L3'].includes(r.lv) ? r.lv : 'L2', pg: angka(r.pg), is: angka(r.is), ur: angka(r.ur) })), at: now, by: myName() }));
    Promise.all(tulis).then(() => { K.busy = false; K.dirty = false; audit('SAVE_PERANGKAT_KISI', idKisi(K.sem)); say('✅ Kisi-kisi tersimpan'); if (K.rec) gambar(); })
      .catch(err => { K.busy = false; console.error('[SI MAMBA] kisi:', err); say('❌ Gagal menyimpan: ' + ((err && err.message) || err), true); });
  }
  function klik(e) {
    const t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return;
    const a = t.getAttribute('data-a');
    if (a !== 'tutup') sinkron();
    if (K.ro && MUT.indexOf(a) >= 0) return say('Mode lihat saja: hanya pemilik yang bisa mengubah.', true);
    switch (a) {
      case 'tutup': return tutup();
      case 'sem': K.sem = t.getAttribute('data-s') === 'genap' ? 'genap' : 'ganjil'; return gambar();
      case 'bagi': bagi(); return gambar();
      case 'simpan': return simpan();
      case 'cetak': return cetak();
      case 'word': return cetak('word');
    }
  }

  function muat() {
    const ep = ++K.epoch; K.loading = true; K.err = null; gambar();
    if (typeof db === 'undefined' || !db) { K.loading = false; K.err = 'Database belum siap.'; return gambar(); }
    Promise.all([db.ref('perangkat_tp_v4/' + idTp()).once('value'),
      db.ref('perangkat_kisi_v4/' + idKisi('ganjil')).once('value'), db.ref('perangkat_kisi_v4/' + idKisi('genap')).once('value'),
      db.ref('perangkat_rpe_kaldik_v4/' + slug(K.ta) + '_ganjil').once('value'), db.ref('perangkat_rpe_kaldik_v4/' + slug(K.ta) + '_genap').once('value')]).then(r => {
      if (ep !== K.epoch) return;
      const tp = r[0].val(); if (!tp) { K.loading = false; K.err = 'Belum ada TP untuk mapel ini. Pilih TP dulu lewat tombol 🎯 ATP/TP, simpan, lalu buka kisi-kisi lagi.'; return gambar(); }
      const items = R().daftar(tp.items);
      SEM.forEach((s, n) => {
        const saved = r[1 + n].val() || {}, byK = {}; R().daftar(saved.items).forEach(x => { if (x && x.k) byK[x.k] = x; });
        K.set[s] = Object.assign(mkSet(), saved.judul ? { judul: String(saved.judul) } : {}, saved.waktu ? { waktu: String(saved.waktu) } : {},
          saved.tot ? { pg: String(saved.tot.pg || 0), is: String(saved.tot.is || 0), ur: String(saved.tot.ur || 0) } : {});
        K.rows[s] = items.filter(x => x && x.sem === s && x.t).map(x => {
          const o = byK[x.k] || {};
          return { k: String(x.k || ''), e: String(x.e || 'Umum'), t: String(x.t), m: String(x.m || ''), jp: String(x.jp || 0),
            res: resmi(x.k), i: o.i ? String(o.i) : (resmi(x.k)[0] ? String(resmi(x.k)[0].i).slice(0, 300) : indikator(x.t)), lv: ['L1', 'L2', 'L3'].includes(o.lv) ? o.lv : levelDari(x.t),
            pg: String(o.pg || 0), is: String(o.is || 0), ur: String(o.ur || 0) };
        });
      });
      K.cfg.ganjil = R().bacaCfg(r[3].val() || null); K.cfg.genap = R().bacaCfg(r[4].val() || null);
      K.loading = false; gambar();
    }).catch(err => { if (ep !== K.epoch) return; K.loading = false; K.err = 'Gagal memuat: ' + ((err && err.message) || err); gambar(); });
  }

  // ---------- API publik ----------
  window.kisiBuka = function (id, rec, sem, ta) {
    if (!rec) return;
    if (!window.rpeUtil) return say('Modul RPE belum dimuat (js/perangkat-rpe.js harus dimuat lebih dulu).', true);
    K.rec = rec; K.ro = rec.guruKey !== myId(); K.ta = String(ta || ''); K.fase = fase(rec.kelas); K.sem = sem === 'genap' ? 'genap' : 'ganjil'; K.dirty = false;
    K.rows = { ganjil: [], genap: [] }; K.set = { ganjil: mkSet(), genap: mkSet() };
    try { K.nip = localStorage.getItem('rpe_nip_' + myId()) || ''; } catch (e) { K.nip = ''; }
    R().nipIsi(K, '#kisiOverlay');
    muat();
  };
  window.kisiUtil = { levelDari: levelDari, indikator: indikator, bagiBobot: bagiBobot, nomori: nomori, tabelKisi: tabelKisi, dokumen: dokumen, state: K };
})();
