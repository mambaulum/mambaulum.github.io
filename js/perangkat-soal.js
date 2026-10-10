/* ============================================================
   SI MAMBA - js/perangkat-soal.js
   Pembuat KARTU SOAL, NASKAH SOAL, dan KUNCI & PENSKORAN siap cetak untuk Asesmen Sumatif Akhir Semester.
   - Slot soal dibuat otomatis dari kisi-kisi yang sudah DISIMPAN (📋 Kisi-kisi): jumlah PG/isian/uraian per TP,
     nomor soal mengikuti kisi-kisi (PG, lalu isian, lalu uraian).
   - "Isi dari bank soal": soal diambil dari bank draf (js/data-soal-mi.js) menurut TP dan bentuk soal; opsi PG diacak
     dan kunci mengikuti. Soal dari bank berstatus DRAF sampai guru mencentang "Sudah saya periksa".
   - Soal tanpa bank (mis. hafalan surah/hadis, Bahasa Arab, mapel umum) diketik guru sendiri pada slot yang kosong.
   Bergantung pada js/perangkat-rpe.js; membaca data dari js/perangkat-kisi.js. Diekspos: soalBuka(id, rec, sem, ta), soalUtil.

   Data Firebase (baru):
   perangkat_soal_v4/<ta>_<semester>_<guru>_<mapel>_<kelas> = { guruKey, guruName, tahunAjaran, semester, mapel, kelas,
       skor: { pg, is, ur }, soal: [ { key, q, o:[4], kp, kt, src, ok } ], at, by }
   Membaca: perangkat_kisi_v4/<id sama> dan perangkat_rpe_kaldik_v4 (untuk kop).
============================================================ */
(function () {
  'use strict';

  const SEM = ['ganjil', 'genap'];
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };
  const BENTUK = [['pg', 'Pilihan Ganda'], ['is', 'Isian Singkat'], ['ur', 'Uraian']];
  const HURUF = ['A', 'B', 'C', 'D'];
  const R = () => window.rpeUtil;
  const esc = s => R().esc(s);

  // ---------- Pembantu murni ----------
  const angka = v => { const n = parseInt(v, 10); return n >= 0 && n <= 99 ? n : 0; };
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // Permutasi deterministik 0..n-1 (xorshift32 + Fisher-Yates): hasil sama untuk benih yang sama.
  function acak(n, seed) {
    const a = Array.from({ length: n }, (_, i) => i); let x = hash(seed) || 1;
    const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // Jenis di dalam kelompok PG: '' = PG biasa, 'pk' = PG Kompleks (>1 jawaban benar, disimpan di ks "0,2"),
  // 'jd' = Menjodohkan (4 pasangan; o[n] = "pernyataan|pasangan benar"). Skor mengikuti skor PG.
  const SUB = [['', 'Pilihan Ganda'], ['pk', 'Pilihan Ganda Kompleks'], ['jd', 'Menjodohkan']];
  const pasang = (x, n) => { const t = String((x.o && x.o[n]) || ''), p = t.indexOf('|'); return p < 0 ? [t, ''] : [t.slice(0, p), t.slice(p + 1)]; };
  const setPasang = (x, n, a, b) => { const p = pasang(x, n); x.o[n] = (a === null ? p[0] : a) + '|' + (b === null ? p[1] : b); };
  const ksList = x => String(x.ks || '').split(',').filter(v => /^[0-3]$/.test(v)).map(Number);
  function toggleKs(x, n, on) { const k = new Set(ksList(x)); if (on) k.add(n); else k.delete(n); x.ks = Array.from(k).sort().join(','); }
  // Slot soal dari baris kisi-kisi; nomor: seluruh PG, lalu isian, lalu uraian (sama dengan kisi-kisi).
  function buatSlot(rows, saved) {
    const peta = {}; (saved || []).forEach(x => { if (x && x.key) peta[x.key] = x; });
    const out = []; let no = 1;
    BENTUK.forEach(b => rows.forEach(r => {
      const n = angka(r[b[0]]);
      for (let j = 0; j < n; j++) {
        const key = r.k + '|' + b[0] + '|' + j, sv = peta[key] || {};
        out.push({ key: key, no: no++, b: b[0], k: r.k, e: r.e, t: r.t, m: r.m, i: r.i, lv: r.lv,
          q: String(sv.q || ''), o: b[0] === 'pg' ? [0, 1, 2, 3].map(x => String((sv.o && sv.o[x]) || '')) : null,
          st: b[0] === 'pg' && (sv.st === 'pk' || sv.st === 'jd') ? sv.st : '', ks: String(sv.ks || '').slice(0, 7),
          kp: sv.kp >= 0 && sv.kp <= 3 ? +sv.kp : 0, kt: String(sv.kt || ''), src: sv.src === 'bank' ? 'bank' : '', ok: !!sv.ok });
      }
    }));
    return out;
  }
  function lengkap(s) {
    if (!String(s.q).trim()) return false;
    if (s.b === 'pg') {
      if (s.st === 'jd') {
        const p = [0, 1, 2, 3].map(n => pasang(s, n));
        return p.every(z => z[0].trim() && z[1].trim()) && new Set(p.map(z => z[0].trim().toLowerCase())).size === 4 && new Set(p.map(z => z[1].trim().toLowerCase())).size === 4;
      }
      const ok = s.o.every(x => String(x).trim()) && new Set(s.o.map(x => String(x).trim().toLowerCase())).size === 4;
      return s.st === 'pk' ? ok && ksList(s).length >= 2 : ok;
    }
    return !!String(s.kt).trim();
  }
  // Jumlah soal tersimpan yang berisi tetapi slotnya sudah tidak ada di kisi-kisi (akan terhapus saat Simpan).
  function yatimDari(slots, saved) {
    const ada = new Set(slots.map(x => x.key));
    return (saved || []).filter(x => x && x.key && !ada.has(x.key) && (String(x.q || '').trim() || String(x.kt || '').trim())).length;
  }
  // Isi slot kosong dari bank menurut TP dan bentuk; soal yang sudah dipakai tidak diulang. Mengembalikan jumlah terisi.
  function isiDariBank(slots, bank) {
    const pakai = new Set(slots.filter(s => s.q).map(s => s.q)); let n = 0;
    slots.forEach(s => {
      if (s.q || s.st) return;
      const it = ((bank || {})[s.k] || []).find(x => x[0] === s.b && !pakai.has(x[2])); if (!it) return;
      pakai.add(it[2]); s.q = it[2]; s.src = 'bank'; s.ok = false;
      if (s.b === 'pg') { const urut = acak(it[3].length, s.key + '|' + it[2]); s.o = urut.map(i => it[3][i]); s.kp = urut.indexOf(0); }
      else s.kt = it[3];
      n++;
    });
    return n;
  }

  // ---------- Pembantu yang bergantung app.js ----------
  const myId = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : '';
  const myName = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';
  const say = (m, err, ms) => { if (typeof toast === 'function') toast(m, !!err, ms); };
  const audit = (aksi, id) => { try { if (typeof v4Audit === 'function') v4Audit(aksi, 'PERANGKAT', id, null, null); } catch (e) {} };

  // ---------- Status ----------
  const S = { rec: null, ta: '', fase: '', sem: 'ganjil', slots: { ganjil: [], genap: [] }, judul: { ganjil: '', genap: '' },
              skor: { pg: '1', is: '2', ur: '5' }, cfg: { ganjil: null, genap: null }, nip: '', yatim: { ganjil: 0, genap: 0 },
              loading: false, err: null, busy: false, dirty: false, ro: false, epoch: 0 };
  const MUT = ['simpan', 'ganti', 'bank'];
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
  const idSem = s => [slug(S.ta), s, slug(S.rec.guruKey || myId()), slug(S.rec.mapel), slug(S.rec.kelas)].join('_');
  const kopCfg = () => S.cfg.ganjil || S.cfg.genap || {};
  const skorB = b => angka(S.skor[b]);
  const skorMaks = s => S.slots[s].reduce((t, x) => t + skorB(x.b), 0);
  const judulAs = s => S.judul[s] || 'Asesmen Sumatif Akhir Semester';

  // ---------- Dokumen cetak ----------
  const CSS_DOK = `@page{size:A4 portrait;margin:15mm 14mm}
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:11.5pt;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kop{text-align:center;border-bottom:3px double #111;padding-bottom:6px;margin-bottom:10px}
.kop .m{font-size:15pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.kop .j{font-size:13pt;font-weight:700;margin-top:4px}.kop .s{font-size:11pt;margin-top:2px}
table{border-collapse:collapse;width:100%}
.kt{margin-bottom:10px;page-break-inside:avoid}
.kt td,.kt th{border:1px solid #333;padding:3px 6px;font-size:10.5pt;vertical-align:top}
.kt th{background:#e5e7eb;text-align:center}
.kt td.l{width:120px;font-weight:700;background:#f9fafb}
.op{margin:2px 0 0 14px}
.kn{width:100%}.kn th,.kn td{border:1px solid #333;padding:3px 6px;font-size:10.5pt;vertical-align:top}
.kn th{background:#e5e7eb;text-align:center}.kn td.c{text-align:center}.kn tr{page-break-inside:avoid}
.nk{margin:0 0 6px;font-size:11pt}.nk p{margin:0 0 8px;page-break-inside:avoid}
h4{margin:12px 0 6px;font-size:11.5pt}
.ttd{display:flex;justify-content:space-between;gap:20px;margin-top:16px;font-size:11pt;page-break-inside:avoid}
.ttd>div{width:45%}.ttd .sp{height:52px}`;
  function kopHtml(s, judul) { return `<div class="kop"><div class="m">${esc(kopCfg().madrasah || 'MADRASAH')}</div><div class="j">${judul}</div><div class="s">${esc(judulAs(s))} Semester ${SEM_LABEL[s]} · Tahun Pelajaran ${esc(S.ta)}</div></div>`; }
  function ttdHtml() {
    const c = kopCfg(), t = '........................................', nip = String(S.nip || '').trim();
    return `<div class="ttd"><div>Mengetahui,<br>Kepala ${esc(c.madrasah || 'Madrasah')}<div class="sp"></div><b><u>${esc(c.kepala || t)}</u></b><br>NIP. ${esc(c.nipKepala || t)}</div>
<div>${esc(c.kota || t)}, ${R().fmtTgl(new Date())}<br>Guru Mata Pelajaran<div class="sp"></div><b><u>${esc(S.rec.guruName || myName() || t)}</u></b><br>NIP. ${esc(nip || t)}</div></div>`;
  }
  const html = (judul, isi) => `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${judul} ${esc(S.rec.mapel)} Kelas ${esc(S.rec.kelas)}</title><style>${CSS_DOK}</style></head><body>${isi}</body></html>`;
  const bentukNama = b => BENTUK.find(x => x[0] === b)[1];
  const bentukX = x => (x.b === 'pg' && x.st) ? SUB.find(z => z[0] === x.st)[1] : bentukNama(x.b);
  function soalHtml(x) {
    const q = esc(x.q || '(belum diisi)').replace(/\n/g, '<br>');
    if (x.b !== 'pg') return q;
    if (x.st === 'jd') {
      const u = acak(4, x.key + '|jd');
      const baris = [0, 1, 2, 3].map(n => `<tr><td style="padding:2px 6px;width:50%;">${n + 1}. ${esc(pasang(x, n)[0])}</td><td style="padding:2px 6px;">${HURUF[n]}. ${esc(pasang(x, u[n])[1])}</td></tr>`).join('');
      return q + '<div style="font-size:10pt;"><i>Jodohkan pernyataan di kolom kiri dengan pasangan yang tepat di kolom kanan.</i></div><table style="width:100%;border-collapse:collapse;">' + baris + '</table>';
    }
    return q + (x.st === 'pk' ? '<div style="font-size:10pt;"><i>(Pilih semua jawaban yang benar.)</i></div>' : '') + x.o.map((o, i) => `<div class="op">${HURUF[i]}. ${esc(o)}</div>`).join('');
  }
  function kunciTeks(x) {
    if (x.b !== 'pg') return esc(x.kt || '(belum diisi)').replace(/\n/g, '<br>');
    if (x.st === 'jd') { const u = acak(4, x.key + '|jd'); return [0, 1, 2, 3].map(n => (n + 1) + '-' + HURUF[u.indexOf(n)]).join(', '); }
    if (x.st === 'pk') { const k = ksList(x); return k.length ? k.map(i => HURUF[i] + (x.o[i] ? '. ' + esc(x.o[i]) : '')).join('; ') : '(belum diisi)'; }
    return HURUF[x.kp] + (x.o[x.kp] ? '. ' + esc(x.o[x.kp]) : '');
  }
  const catatanSub = s => S.slots[s].some(x => x.st) ? 'PG Kompleks dan Menjodohkan: skor penuh hanya bila seluruh jawaban/pasangan benar.<br>' : '';

  function dokKartu(s) {
    const info = x => `<table class="kt"><tr><th colspan="4">KARTU SOAL No. ${x.no}</th></tr>
<tr><td class="l">Mata Pelajaran</td><td>${esc(S.rec.mapel)}</td><td class="l">Bentuk Soal</td><td>${bentukX(x)}</td></tr>
<tr><td class="l">Kelas${S.fase ? ' / Fase' : ''}</td><td>${esc(S.rec.kelas)}${S.fase ? ' / Fase ' + S.fase : ''}</td><td class="l">Level Kognitif</td><td>${esc(x.lv)}</td></tr>
<tr><td class="l">Elemen</td><td colspan="3">${esc(x.e)}</td></tr>
<tr><td class="l">Tujuan Pembelajaran</td><td colspan="3">${esc(x.t)}</td></tr>
<tr><td class="l">Indikator Soal</td><td colspan="3">${esc(x.i)}</td></tr>
<tr><td colspan="4"><b>Soal:</b><br>${soalHtml(x)}</td></tr>
<tr><td class="l">Kunci / Pedoman</td><td colspan="2">${kunciTeks(x)}</td><td><b>Skor:</b> ${skorB(x.b)}</td></tr></table>`;
    return html('Kartu Soal', kopHtml(s, 'KARTU SOAL') + S.slots[s].map(info).join('') + ttdHtml());
  }
  function dokNaskah(s) {
    let h = kopHtml(s, 'NASKAH SOAL') + `<table class="nk"><tr><td style="width:50%">Mata Pelajaran: ${esc(S.rec.mapel)}</td><td>Hari/Tanggal: ....................</td></tr><tr><td>Kelas: ${esc(S.rec.kelas)}</td><td>Nama: ....................</td></tr></table>`;
    BENTUK.forEach((b, bi) => {
      const l = S.slots[s].filter(x => x.b === b[0]); if (!l.length) return;
      h += `<h4>${String.fromCharCode(65 + bi)}. ${b[1]}</h4>` + l.map(x => `<p>${x.no}. ${soalHtml(x)}</p>`).join('');
    });
    return html('Naskah Soal', h);
  }
  function dokKunci(s) {
    const rows = S.slots[s].map(x => `<tr><td class="c">${x.no}</td><td>${bentukX(x)}</td><td>${kunciTeks(x)}</td><td class="c">${skorB(x.b)}</td></tr>`).join('');
    const per = BENTUK.map(b => { const n = S.slots[s].filter(x => x.b === b[0]).length; return n ? `${b[1]}: ${n} soal × ${skorB(b[0])} = ${n * skorB(b[0])}` : ''; }).filter(Boolean).join('; ');
    return html('Kunci dan Penskoran', kopHtml(s, 'KUNCI JAWABAN DAN PEDOMAN PENSKORAN') + `<table class="kn"><thead><tr><th style="width:36px">No</th><th style="width:110px">Bentuk</th><th>Kunci Jawaban / Pedoman Penskoran</th><th style="width:48px">Skor</th></tr></thead><tbody>${rows}
<tr><td colspan="3" class="c"><b>Skor maksimal</b></td><td class="c"><b>${skorMaks(s)}</b></td></tr></tbody></table>
<p style="font-size:10.5pt;margin-top:8px;">${esc(per)}.<br>${catatanSub(s)}Nilai akhir = (jumlah skor yang diperoleh ÷ skor maksimal ${skorMaks(s)}) × 100.</p>` + ttdHtml());
  }
  function cekCetak(s) {
    const sl = S.slots[s];
    if (!sl.length) { say('Belum ada slot soal. Buka 📋 Kisi-kisi, isi jumlah soal, lalu simpan.', true); return false; }
    const kosong = sl.filter(x => !lengkap(x)).length, draf = sl.filter(x => lengkap(x) && x.src === 'bank' && !x.ok).length;
    const msg = (kosong ? kosong + ' soal masih kosong atau belum lengkap (PG butuh 4 opsi berbeda). ' : '') + (draf ? draf + ' soal dari bank belum ditandai "Sudah saya periksa". ' : '');
    return !msg || confirm(msg + '\nTetap cetak?');
  }
  function cetak(jenis, mode) {
    sinkron(); const s = S.sem; if (!cekCetak(s)) return;
    R().nipSimpan(S.nip);
    R().keluarkan(jenis === 'kartu' ? dokKartu(s) : jenis === 'naskah' ? dokNaskah(s) : dokKunci(s), (jenis === 'kartu' ? 'KartuSoal' : jenis === 'naskah' ? 'NaskahSoal' : 'Kunci') + '_' + S.rec.mapel + '_' + S.rec.kelas + '_' + s, mode);
  }

  // ---------- Tampilan ----------
  function ov() {
    let el = document.getElementById('soalOverlay'); if (el) return el;
    el = document.createElement('div'); el.id = 'soalOverlay';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.className = 'pp-modal-overlay';
    el.addEventListener('click', klik); el.addEventListener('input', ketik);
    document.body.appendChild(el); return el;
  }
  function tutup() {
    if (S.dirty && !confirm('Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?')) return;
    const el = document.getElementById('soalOverlay'); if (el) el.remove(); S.epoch++; S.rec = null; S.dirty = false;
  }
  function ringkasHtml() {
    const sl = S.slots[S.sem], kosong = sl.filter(x => !lengkap(x)).length, draf = sl.filter(x => lengkap(x) && x.src === 'bank' && !x.ok).length;
    return `Soal: <b>${sl.length}</b> · lengkap <b>${sl.length - kosong}</b>${kosong ? ` · <span style="color:#b45309">belum lengkap ${kosong}</span>` : ''}${draf ? ` · <span style="color:#b45309">draf bank belum diperiksa ${draf}</span>` : ''} · Skor maksimal: <b>${skorMaks(S.sem)}</b>`
      + (S.yatim[S.sem] ? `<div style="color:#b91c1c;margin-top:4px;">⚠️ ${S.yatim[S.sem]} soal tersimpan tidak punya slot lagi (jumlah soal di Kisi-kisi dikurangi). Soal itu akan terhapus bila Anda menekan Simpan.</div>` : '');
  }
  function kartuHtml(x, i) {
    const lencana = x.src === 'bank' ? (x.ok ? '<span style="color:#15803d">✔ dari bank, sudah diperiksa</span>' : '<span style="color:#b45309">● draf dari bank, periksa dulu</span>') : '<span style="color:#6b7280">ditulis guru</span>';
    let h = `<div style="margin-top:8px;padding:8px;border:1px solid ${lengkap(x) ? '#e5e7eb' : '#fcd34d'};border-radius:8px;">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;"><b>No. ${x.no} · ${bentukX(x)} · ${esc(x.lv)}</b><span>${lencana}</span></div>
      <div style="${muted}margin:2px 0 6px;">${esc(x.e)} — ${esc(x.t)}</div>
      <textarea class="field" rows="${x.b === 'ur' ? 3 : 2}" maxlength="600" style="width:100%;" data-i="${i}" data-k="q" placeholder="Tulis soal..." aria-label="Soal ${x.no}">${esc(x.q)}</textarea>`;
    if (x.b === 'pg') {
      const res = ((window.BANK_KISI_RESMI_MI || {})[x.k] || []).map(z => z.bentuk).filter(v => /kompleks|menjodohkan/i.test(v)).filter((v, n, a) => a.indexOf(v) === n);
      h += `<div style="margin-top:6px;font-size:12px;">Jenis: <select class="field" data-i="${i}" data-k="st" aria-label="Jenis soal ${x.no}">${SUB.map(z => `<option value="${z[0]}" ${x.st === z[0] ? 'selected' : ''}>${z[1]}</option>`).join('')}</select>${res.length ? ` <span style="color:#1e40af;">📘 Kisi-kisi resmi untuk TP ini juga memuat: ${esc(res.join(', '))}</span>` : ''}</div>`;
      if (x.st === 'jd') {
        h += [0, 1, 2, 3].map(n => { const p = pasang(x, n); return `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;"><span style="width:16px;font-weight:700;">${n + 1}</span><input class="field" maxlength="70" style="flex:1;" data-i="${i}" data-k="ja${n}" value="${esc(p[0])}" placeholder="Pernyataan" aria-label="Pernyataan ${n + 1}"><span>↔</span><input class="field" maxlength="70" style="flex:1;" data-i="${i}" data-k="jb${n}" value="${esc(p[1])}" placeholder="Pasangan yang benar" aria-label="Pasangan ${n + 1}"></div>`; }).join('')
          + `<div style="${muted}margin-top:2px;">Tulis tiap pasangan yang benar sejajar. Kolom kanan diacak otomatis saat dicetak.</div>`;
      } else if (x.st === 'pk') {
        const kc = ksList(x);
        h += x.o.map((o, n) => `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;"><input type="checkbox" data-i="${i}" data-k="kc${n}" ${kc.indexOf(n) >= 0 ? 'checked' : ''} aria-label="Benar ${HURUF[n]}"><span style="width:16px;font-weight:700;">${HURUF[n]}</span><input class="field" maxlength="160" style="flex:1;" data-i="${i}" data-k="o${n}" value="${esc(o)}" aria-label="Opsi ${HURUF[n]}"></div>`).join('')
          + `<div style="${muted}margin-top:2px;">Centang SEMUA jawaban yang benar (minimal 2).</div>`;
      } else {
        h += x.o.map((o, n) => `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;"><input type="radio" name="kp${i}" value="${n}" data-i="${i}" data-k="kp" ${x.kp === n ? 'checked' : ''} aria-label="Kunci ${HURUF[n]}"><span style="width:16px;font-weight:700;">${HURUF[n]}</span><input class="field" maxlength="160" style="flex:1;" data-i="${i}" data-k="o${n}" value="${esc(o)}" aria-label="Opsi ${HURUF[n]}"></div>`).join('')
          + `<div style="${muted}margin-top:2px;">Pilih bulatan di kiri sebagai kunci jawaban.</div>`;
      }
    } else {
      h += `<textarea class="field" rows="${x.b === 'ur' ? 3 : 1}" maxlength="600" style="width:100%;margin-top:6px;" data-i="${i}" data-k="kt" placeholder="${x.b === 'ur' ? 'Pedoman penskoran / kunci jawaban' : 'Kunci jawaban'}" aria-label="Kunci soal ${x.no}">${esc(x.kt)}</textarea>`;
    }
    h += `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px;">${x.src === 'bank' ? `<label style="font-size:12px;"><input type="checkbox" data-i="${i}" data-k="ok" ${x.ok ? 'checked' : ''}> Sudah saya periksa isi dan kuncinya</label>` : ''}${btn('ganti" data-i="' + i, '🔄 Soal lain dari bank')}</div></div>`;
    return h;
  }
  function panel() {
    const s = S.sem, sl = S.slots[s];
    const tab = x => btn('sem" data-s="' + x, 'Semester ' + SEM_LABEL[x] + ' (' + S.slots[x].length + ' soal)', S.sem === x ? 'btn-success' : 'btn-soft');
    let h = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <div><div style="font-size:17px;font-weight:700;">📝 Kartu soal &amp; kunci · ${esc(S.rec.mapel)} · Kelas ${esc(S.rec.kelas)}</div>
      <div style="${muted}">Tahun ajaran ${esc(S.ta)}${S.fase ? ' · Fase ' + S.fase : ''}${S.dirty ? ' · <span style="color:#b45309">● belum disimpan</span>' : ''}</div></div>${btn('tutup', '✕')}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">${SEM.map(tab).join('')}</div>`;
    if (!sl.length) return h + `<div style="padding:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:13px;color:#92400e;">Belum ada slot soal untuk semester ${SEM_LABEL[s]}. Buka 📋 Kisi-kisi, isi jumlah soal tiap TP (atau Bagi otomatis), tekan Simpan, lalu buka menu ini lagi.</div>`;
    const fld = (k, label) => `<label style="font-size:12px;">${label}<br><input class="field" type="number" min="0" max="99" inputmode="numeric" style="width:90px;" data-skor="${k}" value="${esc(S.skor[k])}"></label>`;
    h += `<div style="padding:8px 10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:12px;color:#92400e;">Soal dari bank adalah <b>draf</b>. Periksa kebenaran isi, kunci, dan kesesuaiannya dengan buku ajar madrasah sebelum dipakai, lalu centang "Sudah saya periksa".</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:10px;">${btn('bank', '⚡ Isi dari bank soal', 'btn-success')}${fld('pg', 'Skor per soal PG')}${fld('is', 'Skor per soal isian')}${fld('ur', 'Skor per soal uraian')}</div>
      <div id="soalSum" style="margin:10px 0;font-size:13px;">${ringkasHtml()}</div>`;
    h += sl.map((x, i) => kartuHtml(x, i)).join('');
    return h + `<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;">
      <label style="font-size:12px;">NIP guru (tanda tangan)<br><input class="field" maxlength="30" style="width:200px;" data-f="nip" value="${esc(S.nip)}" placeholder="boleh dikosongkan"></label>
      ${btn('simpan', '💾 Simpan', 'btn-success')}${btn('cetak-kartu', '🖨 Kartu Soal')}${btn('cetak-naskah', '🖨 Naskah Soal')}${btn('cetak-kunci', '🖨 Kunci &amp; Penskoran')}${btn('word-kartu', '📄 Kartu Word')}${btn('word-naskah', '📄 Naskah Word')}${btn('word-kunci', '📄 Kunci Word')}</div>`;
  }
  function gambar() {
    const el = ov(); let isi;
    if (S.loading) isi = `<div style="${muted}padding:12px;">⏳ Memuat kisi-kisi dan soal...</div>${btn('tutup', 'Tutup')}`;
    else if (S.err) isi = `<div style="padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;margin-bottom:8px;">⚠️ ${esc(S.err)}</div>${btn('tutup', 'Tutup')}`;
    else isi = panel();
    el.innerHTML = `<div style="max-width:900px;margin:0 auto;background:#fff;color:#111;border-radius:12px;padding:16px;">${isi}</div>`;
    if (S.ro && S.rec) kunciRo(el, MUT);
  }

  // ---------- Event ----------
  function sinkron() {
    const el = document.getElementById('soalOverlay'); if (!el) return; const sl = S.slots[S.sem];
    el.querySelectorAll('[data-i]').forEach(i => {
      const x = sl[+i.getAttribute('data-i')], k = i.getAttribute('data-k'); if (!x) return;
      if (k === 'q' || k === 'kt') x[k] = i.value;
      else if (/^o[0-3]$/.test(k) && x.o) x.o[+k[1]] = i.value;
      else if (k === 'kp' && i.checked) x.kp = +i.value;
      else if (k === 'st') x.st = (i.value === 'pk' || i.value === 'jd') ? i.value : '';
      else if (/^j[ab][0-3]$/.test(k) && x.o) setPasang(x, +k[2], k[1] === 'a' ? i.value : null, k[1] === 'b' ? i.value : null);
      else if (/^kc[0-3]$/.test(k)) toggleKs(x, +k[2], i.checked);
      else if (k === 'ok') x.ok = i.checked;
    });
    el.querySelectorAll('[data-skor]').forEach(i => { S.skor[i.getAttribute('data-skor')] = i.value; });
    const n = el.querySelector('[data-f="nip"]'); if (n) S.nip = n.value;
  }
  function ketik(e) {
    const t = e.target; if (!t || !t.getAttribute) return;
    const i = t.getAttribute('data-i'), k = t.getAttribute('data-k'), sk = t.getAttribute('data-skor'), f = t.getAttribute('data-f');
    if (f === 'nip') { S.nip = t.value; return; }
    if (sk) S.skor[sk] = t.value;
    else if (i !== null) {
      const x = S.slots[S.sem][+i]; if (!x) return;
      if (k === 'q' || k === 'kt') x[k] = t.value;
      else if (/^o[0-3]$/.test(k) && x.o) x.o[+k[1]] = t.value;
      else if (k === 'kp') x.kp = +t.value;
      else if (k === 'st') {
        const lama = x.st; x.st = (t.value === 'pk' || t.value === 'jd') ? t.value : '';
        if (lama === 'jd' || x.st === 'jd') { x.o = ['', '', '', '']; x.kp = 0; }
        x.ks = ''; if (x.src === 'bank') { x.src = ''; x.ok = false; }
        S.dirty = true; return gambar();
      }
      else if (/^j[ab][0-3]$/.test(k) && x.o) setPasang(x, +k[2], k[1] === 'a' ? t.value : null, k[1] === 'b' ? t.value : null);
      else if (/^kc[0-3]$/.test(k)) { toggleKs(x, +k[2], t.checked); S.dirty = true; return gambar(); }
      else if (k === 'ok') { x.ok = t.checked; S.dirty = true; return gambar(); }
    } else return;
    S.dirty = true; const r = document.getElementById('soalSum'); if (r) r.innerHTML = ringkasHtml();
  }
  function ganti(i) {
    const sl = S.slots[S.sem], x = sl[i], bank = (window.BANK_SOAL_MI || {})[x.k] || [];
    if (x.st) return say('Soal bank hanya tersedia untuk PG biasa. Ketik soal sendiri.', true);
    const pakai = new Set(sl.filter((y, j) => j !== i && y.q).map(y => y.q));
    const urut = bank.filter(b => b[0] === x.b), sekarang = urut.findIndex(b => b[2] === x.q);
    const kandidat = urut.slice(sekarang + 1).concat(urut.slice(0, Math.max(0, sekarang))).find(b => !pakai.has(b[2]) && b[2] !== x.q);
    if (!kandidat) return say('Tidak ada soal lain di bank untuk TP dan bentuk soal ini. Ketik soal sendiri.', true);
    x.q = kandidat[2]; x.src = 'bank'; x.ok = false;
    if (x.b === 'pg') { const u = acak(kandidat[3].length, x.key + '|' + kandidat[2]); x.o = u.map(n => kandidat[3][n]); x.kp = u.indexOf(0); } else x.kt = kandidat[3];
    S.dirty = true;
  }
  function simpan() {
    sinkron(); const rec = S.rec;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa menyimpan.', true);
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (S.busy) return;
    const hilang = SEM.filter(s => S.slots[s].length).reduce((t, s) => t + (S.yatim[s] || 0), 0);
    if (hilang && !confirm(hilang + ' soal tersimpan tidak punya slot lagi di kisi-kisi dan akan DIHAPUS.\nLanjut menyimpan?')) return;
    S.busy = true;
    const cut = (s, n) => String(s || '').slice(0, n), now = new Date().toISOString();
    const tulis = SEM.filter(s => S.slots[s].length).map(s => db.ref('perangkat_soal_v4/' + idSem(s)).set({
      guruKey: rec.guruKey, guruName: rec.guruName || myName(), tahunAjaran: S.ta, semester: s, mapel: rec.mapel, kelas: rec.kelas,
      skor: { pg: angka(S.skor.pg), is: angka(S.skor.is), ur: angka(S.skor.ur) },
      soal: S.slots[s].map(x => ({ key: cut(x.key, 80), q: cut(x.q, 600), o: x.b === 'pg' ? x.o.map(o => cut(o, 160)) : [], kp: x.kp, st: x.st || '', ks: cut(x.ks, 7), kt: cut(x.kt, 600), src: x.src, ok: !!x.ok })), at: now, by: myName() }));
    Promise.all(tulis).then(() => { S.busy = false; S.dirty = false; S.yatim = { ganjil: 0, genap: 0 }; audit('SAVE_PERANGKAT_SOAL', idSem(S.sem)); say('✅ Soal tersimpan'); if (S.rec) gambar(); })
      .catch(err => { S.busy = false; console.error('[SI MAMBA] soal:', err); say('❌ Gagal menyimpan: ' + ((err && err.message) || err), true); });
  }
  function klik(e) {
    const t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return;
    const a = t.getAttribute('data-a');
    if (a !== 'tutup') sinkron();
    if (S.ro && MUT.indexOf(a) >= 0) return say('Mode lihat saja: hanya pemilik yang bisa mengubah.', true);
    switch (a) {
      case 'tutup': return tutup();
      case 'sem': S.sem = t.getAttribute('data-s') === 'genap' ? 'genap' : 'ganjil'; return gambar();
      case 'bank': { const n = isiDariBank(S.slots[S.sem], window.BANK_SOAL_MI); if (n) S.dirty = true; say(n ? '✅ ' + n + ' soal diisi dari bank (draf, mohon diperiksa). Sisanya diketik guru.' : 'Tidak ada soal bank yang cocok untuk slot kosong. Ketik soal sendiri.', !n); return gambar(); }
      case 'ganti': ganti(+t.getAttribute('data-i')); return gambar();
      case 'simpan': return simpan();
      case 'cetak-kartu': return cetak('kartu');
      case 'cetak-naskah': return cetak('naskah');
      case 'cetak-kunci': return cetak('kunci');
      case 'word-kartu': return cetak('kartu', 'word');
      case 'word-naskah': return cetak('naskah', 'word');
      case 'word-kunci': return cetak('kunci', 'word');
    }
  }

  function muat() {
    const ep = ++S.epoch; S.loading = true; S.err = null; gambar();
    if (typeof db === 'undefined' || !db) { S.loading = false; S.err = 'Database belum siap.'; return gambar(); }
    const baca = p => db.ref(p).once('value');
    Promise.all([baca('perangkat_kisi_v4/' + idSem('ganjil')), baca('perangkat_kisi_v4/' + idSem('genap')),
      baca('perangkat_soal_v4/' + idSem('ganjil')), baca('perangkat_soal_v4/' + idSem('genap')),
      baca('perangkat_rpe_kaldik_v4/' + slug(S.ta) + '_ganjil'), baca('perangkat_rpe_kaldik_v4/' + slug(S.ta) + '_genap')]).then(r => {
      if (ep !== S.epoch) return;
      const kisi = [r[0].val(), r[1].val()];
      if (!kisi[0] && !kisi[1]) { S.loading = false; S.err = 'Kisi-kisi belum disimpan. Buka 📋 Kisi-kisi, isi jumlah soal tiap TP, tekan Simpan, lalu buka menu ini lagi.'; return gambar(); }
      let skorDimuat = false;
      SEM.forEach((s, n) => {
        const kn = kisi[n], sv = r[2 + n].val();
        S.judul[s] = kn && kn.judul ? String(kn.judul) : '';
        S.slots[s] = kn ? buatSlot(R().daftar(kn.items), sv && R().daftar(sv.soal)) : [];
        S.yatim[s] = S.slots[s].length ? yatimDari(S.slots[s], sv && R().daftar(sv.soal)) : 0;
        if (sv && sv.skor && !skorDimuat) { skorDimuat = true; S.skor = { pg: String(sv.skor.pg || 0), is: String(sv.skor.is || 0), ur: String(sv.skor.ur || 0) }; }
      });
      S.cfg.ganjil = R().bacaCfg(r[4].val() || null); S.cfg.genap = R().bacaCfg(r[5].val() || null);
      S.loading = false; gambar();
    }).catch(err => { if (ep !== S.epoch) return; S.loading = false; S.err = 'Gagal memuat: ' + ((err && err.message) || err); gambar(); });
  }

  // ---------- API publik ----------
  function fase(kelas) {
    const t = String(kelas || '').trim().toUpperCase().replace(/^KELAS\s*/, '');
    let n = 0, m = /^(\d+)/.exec(t);
    if (m) n = +m[1]; else if ((m = /^(VI|IV|V|III|II|I)(?=[^IVX]|$)/.exec(t))) n = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }[m[1]];
    return n >= 1 && n <= 2 ? 'A' : n >= 3 && n <= 4 ? 'B' : n >= 5 && n <= 6 ? 'C' : '';
  }
  window.soalBuka = function (id, rec, sem, ta) {
    if (!rec) return;
    if (!window.rpeUtil) return say('Modul RPE belum dimuat (js/perangkat-rpe.js harus dimuat lebih dulu).', true);
    S.rec = rec; S.ro = rec.guruKey !== myId(); S.ta = String(ta || ''); S.fase = fase(rec.kelas); S.sem = sem === 'genap' ? 'genap' : 'ganjil'; S.dirty = false;
    S.slots = { ganjil: [], genap: [] }; S.skor = { pg: '1', is: '2', ur: '5' }; S.yatim = { ganjil: 0, genap: 0 };
    try { S.nip = localStorage.getItem('rpe_nip_' + myId()) || ''; } catch (e) { S.nip = ''; }
    R().nipIsi(S, '#soalOverlay');
    muat();
  };
  window.soalUtil = { acak: acak, buatSlot: buatSlot, isiDariBank: isiDariBank, lengkap: lengkap, dokKartu: dokKartu, dokNaskah: dokNaskah, dokKunci: dokKunci, state: S };
})();
