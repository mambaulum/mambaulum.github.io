/* ============================================================
   SI MAMBA - js/perangkat-atp-tp.js
   Pemilih TP (Tujuan Pembelajaran) + pembuat dokumen TP dan ATP (Alur Tujuan Pembelajaran) siap cetak.
   - Bank TP PAI dan Bahasa Arab MI (js/data-tp-mi.js, disusun dari CP SK Dirjen Pendis 9941/2025): guru TINGGAL MEMILIH
     TP per semester; TP boleh disunting, diurutkan, dan ditambah sendiri (juga untuk mapel di luar bank).
   - JP bisa dibagi rata otomatis dari JP tersedia (kalender efektif RPE), disisakan sekian JP untuk penilaian.
   - "Terapkan ke Prota/Promes": materi pokok + JP langsung masuk ke daftar materi Prota/Promes (tanpa mengetik ulang).
   Bergantung pada js/perangkat-rpe.js dan js/data-tp-mi.js. Diekspos: atpBuka(id, rec, sem, ta), atpUtil.

   Data Firebase (baru):
   perangkat_tp_v4/<ta>_<guru>_<mapel>_<kelas> = { guruKey, guruName, tahunAjaran, mapel, kelas, fase, manual,
       items: [ { k, e, t, m, sem, jp } ], jpPerPekan, at, by }
   Menulis juga ke perangkat_materi_v4/<ta>_<semester>_<guru>_<mapel>_<kelas> (format modul Prota/Promes).
============================================================ */
(function () {
  'use strict';

  const SEM = ['ganjil', 'genap'];
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };
  const MAX_ITEMS = 80;

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
  // Nama mapel bebas -> kunci bank ('' bila tidak dikenal).
  function kunciMapel(nama) {
    const t = String(nama || '').toLowerCase().replace(/[^a-z]/g, '');
    if (t.includes('qur') && (t.includes('hadis') || t.includes('hadits'))) return 'aqh';
    if (t.includes('akidah') || t.includes('aqidah')) return 'aa';
    if (t.includes('fikih') || t.includes('fiqih') || t.includes('fiqh')) return 'fikih';
    if (t === 'ski' || t.includes('sejarah')) return 'ski';
    if (t.includes('arab')) return 'ba';
    return '';
  }
  // Bagi rata JP: sisa pembulatan diberikan ke TP paling awal.
  function bagiRata(n, total) {
    if (n < 1 || total < 1) return [];
    const dasar = Math.floor(total / n), sisa = total - dasar * n;
    return Array.from({ length: n }, (_, i) => dasar + (i < sisa ? 1 : 0));
  }

  // ---------- Pembantu yang bergantung app.js ----------
  const myId = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : '';
  const myName = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';
  const say = (m, err, ms) => { if (typeof toast === 'function') toast(m, !!err, ms); };
  const audit = (aksi, id) => { try { if (typeof v4Audit === 'function') v4Audit(aksi, 'PERANGKAT', id, null, null); } catch (e) {} };

  // ---------- Status ----------
  const A = { rec: null, ta: '', fase: '', kunci: '', bank: [], cp: [], items: [], manual: false, jp: '', nip: '', res: '0', tab: 'pilih',
              form: { e: '', t: '', m: '', sem: 'ganjil' }, cfg: { ganjil: null, genap: null },
              loading: false, err: null, busy: false, dirty: false, ro: false, epoch: 0 };
  const MUT = ['simpan', 'terapkan', 'dua', 'kosong', 'tambah', 'naik', 'turun', 'hapus', 'rata'];
  // Mode baca-saja untuk Admin/Kepsek yang membuka perangkat milik guru lain (simpan memang hanya untuk pemilik).
  function kunciRo(el, mut) {
    el.querySelectorAll('input:not([data-f="nip"]),select,textarea').forEach(i => { i.disabled = true; });
    el.querySelectorAll('button[data-a]').forEach(b => { if (mut.indexOf(b.getAttribute('data-a')) >= 0) b.disabled = true; });
    const kartu = el.querySelector('div');
    if (kartu) kartu.insertAdjacentHTML('afterbegin', '<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;font-size:12px;color:#1e40af;">👁 Mode lihat saja: ini perangkat milik guru lain. Perubahan hanya bisa disimpan oleh pemiliknya; Anda tetap bisa mencetak.</div>');
  }
  const muted = 'color:#6b7280;font-size:12px;';
  const btn = (a, t, kelas, extra) => `<button type="button" class="btn ${kelas || 'btn-soft'}" style="padding:6px 12px;font-size:12px;${extra || ''}" data-a="${a}">${t}</button>`;
  const jpNum = () => { const n = parseInt(A.jp, 10); return (n >= 1 && n <= 40) ? n : 0; };
  const idTp = () => [R().slug(A.ta), R().slug(A.rec.guruKey || myId()), R().slug(A.rec.mapel), R().slug(A.rec.kelas)].join('_');
  const idMateri = s => [R().slug(A.ta), s, R().slug(A.rec.guruKey || myId()), R().slug(A.rec.mapel), R().slug(A.rec.kelas)].join('_');
  const daSem = s => A.items.filter(x => x.sem === s);
  const jpItem = x => { const n = parseInt(x.jp, 10); return n >= 1 && n <= 99 ? n : 0; };
  const jpSem = s => daSem(s).reduce((t, x) => t + jpItem(x), 0);
  const tersedia = s => (A.cfg[s] && jpNum()) ? R().hitungRpe(A.cfg[s], jpNum()).total.jpEf : null;
  const kopCfg = () => A.cfg.ganjil || A.cfg.genap || {};
  const itemBank = (kunci, f) => {
    const B = window.BANK_TP_MI, mp = B && B.mapel[kunci], tp = mp && mp.tp[f] || [];
    return tp.map((x, i) => ({ k: kunci + '-' + f + '-' + (i + 1), e: x[0], t: x[1], m: x[2] }));
  };
  function urutkan() {
    if (A.manual) return;
    const pos = {}; A.bank.forEach((b, i) => { pos[b.k] = i; });
    const nilai = x => (x.k in pos) ? pos[x.k] : 1000 + A.items.indexOf(x);
    A.items = A.items.map((x, i) => ({ x: x, i: i })).sort((p, q) => (nilai(p.x) - nilai(q.x)) || (p.i - q.i)).map(p => p.x);
  }

  // ---------- Dokumen cetak ----------
  const CSS = `.tp-tbl{border-collapse:collapse;width:100%}
.tp-tbl th,.tp-tbl td{border:1px solid #333;padding:3px 6px;font-size:12px;color:#111;vertical-align:top}
.tp-tbl th{background:#e5e7eb;text-align:center;font-weight:700}
.tp-tbl td.c{text-align:center}
.tp-tbl tr.sem td{background:#f3f4f6;font-weight:700}
.tp-tbl tr.jml td{font-weight:700;background:#f9fafb}`;

  function kopHtml(judul, sub) { return `<div class="kop"><div class="m">${esc(kopCfg().madrasah || 'MADRASAH')}</div><div class="j">${judul}</div><div class="s">${sub}</div></div>`; }
  function infoHtml() {
    return `<table class="info"><tr><td>Mata Pelajaran</td><td>: ${esc(A.rec.mapel)}</td></tr><tr><td>Kelas${A.fase ? ' / Fase' : ''}</td><td>: ${esc(A.rec.kelas)}${A.fase ? ' / Fase ' + A.fase : ''}</td></tr><tr><td>Guru</td><td>: ${esc(A.rec.guruName || myName())}</td></tr></table>`;
  }
  function ttdHtml() {
    const c = kopCfg(), t = '........................................', nip = String(A.nip || '').trim();
    return `<div class="ttd"><div>Mengetahui,<br>Kepala ${esc(c.madrasah || 'Madrasah')}<div class="sp"></div><b><u>${esc(c.kepala || t)}</u></b><br>NIP. ${esc(c.nipKepala || t)}</div>
<div>${esc(c.kota || t)}, ${R().fmtTgl(new Date())}<br>Guru Mata Pelajaran<div class="sp"></div><b><u>${esc(A.rec.guruName || myName() || t)}</u></b><br>NIP. ${esc(nip || t)}</div></div>`;
  }
  function dokumen(judulTab, isi) {
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${judulTab} ${esc(A.rec.mapel)} Kelas ${esc(A.rec.kelas)}</title><style>
@page{size:A4 portrait;margin:16mm 15mm}
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kop{text-align:center;border-bottom:3px double #111;padding-bottom:8px;margin-bottom:10px}
.kop .m{font-size:15pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.kop .j{font-size:13pt;font-weight:700;margin-top:5px}.kop .s{font-size:11pt;margin-top:2px}
.info{margin:0 0 8px;font-size:11pt}.info td{padding:1px 8px 1px 0;vertical-align:top;border:0}
${CSS}
h4{margin:12px 0 4px;font-size:11.5pt}.cp{font-size:10.5pt;margin:2px 0}
.ttd{display:flex;justify-content:space-between;gap:20px;margin-top:18px;font-size:11pt;page-break-inside:avoid}
.ttd>div{width:48%}.ttd .sp{height:56px}
tr{page-break-inside:avoid}
</style></head><body>${isi}${ttdHtml()}</body></html>`;
  }
  function buka(html, nama, mode) { R().keluarkan(html, nama + '_' + A.rec.mapel + '_' + A.rec.kelas, mode); }
  function tabelAtp() {
    let h = `<table class="tp-tbl"><thead><tr><th style="width:30px">No</th><th style="width:105px">Elemen</th><th>Tujuan Pembelajaran</th><th style="width:150px">Materi Pokok</th><th style="width:42px">JP</th></tr></thead><tbody>`, semua = 0;
    SEM.forEach(s => {
      const l = daSem(s), t = jpSem(s); semua += t;
      h += `<tr class="sem"><td colspan="5">Semester ${SEM_LABEL[s]}</td></tr>`;
      h += l.length ? l.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${esc(x.e)}</td><td>${esc(x.t)}</td><td>${esc(x.m)}</td><td class="c">${jpItem(x) || ''}</td></tr>`).join('') : `<tr><td colspan="5" style="color:#6b7280;">Belum ada TP untuk semester ini.</td></tr>`;
      h += `<tr class="jml"><td colspan="4" class="c">Jumlah JP Semester ${SEM_LABEL[s]}</td><td class="c">${t}</td></tr>`;
    });
    return h + `<tr class="jml"><td colspan="4" class="c">Jumlah JP Satu Tahun</td><td class="c">${semua}</td></tr></tbody></table>`;
  }
  function cetakAtp(mode) {
    sinkron(); simpanNip();
    if (!A.items.length) return say('Pilih TP dulu.', true);
    buka(dokumen('ATP', kopHtml('ALUR TUJUAN PEMBELAJARAN (ATP)', 'Tahun Pelajaran ' + esc(A.ta)) + infoHtml() + tabelAtp()), 'ATP', mode);
  }
  function cetakTp(mode) {
    sinkron(); simpanNip();
    if (!A.items.length) return say('Pilih TP dulu.', true);
    const cp = A.cp.length ? `<h4>Capaian Pembelajaran (ringkasan)</h4>${A.cp.map(c => `<div class="cp">${esc(c)}</div>`).join('')}<div class="cp" style="color:#555;">Rujukan: SK Dirjen Pendis No. 9941 Tahun 2025.</div>` : '';
    const per = SEM.map(s => {
      const l = daSem(s); if (!l.length) return '';
      return `<h4>Semester ${SEM_LABEL[s]}</h4><table class="tp-tbl"><thead><tr><th style="width:30px">No</th><th style="width:120px">Elemen</th><th>Tujuan Pembelajaran</th></tr></thead><tbody>${l.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${esc(x.e)}</td><td>${esc(x.t)}</td></tr>`).join('')}</tbody></table>`;
    }).join('');
    buka(dokumen('TP', kopHtml('TUJUAN PEMBELAJARAN (TP)', 'Tahun Pelajaran ' + esc(A.ta)) + infoHtml() + cp + per), 'TP', mode);
  }
  function simpanNip() { R().nipSimpan(A.nip); }

  // ---------- Tampilan ----------
  function ov() {
    let el = document.getElementById('atpOverlay'); if (el) return el;
    el = document.createElement('div'); el.id = 'atpOverlay';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.className = 'pp-modal-overlay';
    el.addEventListener('click', klik); el.addEventListener('input', ketik);
    document.body.appendChild(el); return el;
  }
  function tutup() {
    if (A.dirty && !confirm('Ada perubahan yang belum disimpan. Tutup tanpa menyimpan?')) return;
    const el = document.getElementById('atpOverlay'); if (el) el.remove(); A.epoch++; A.rec = null; A.dirty = false;
  }
  function gambar() {
    const el = ov(); let isi;
    if (A.loading) isi = `<div style="${muted}padding:12px;">⏳ Memuat data TP...</div>${btn('tutup', 'Tutup')}`;
    else if (A.err) isi = `<div style="padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;margin-bottom:8px;">⚠️ Gagal memuat: ${esc(A.err)}</div>${btn('tutup', 'Tutup')}`;
    else {
      const tab = (k, t) => btn('tab" data-t="' + k, t, A.tab === k ? 'btn-success' : 'btn-soft');
      isi = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;">
        <div><div style="font-size:17px;font-weight:700;">🎯 ATP &amp; TP · ${esc(A.rec.mapel)} · Kelas ${esc(A.rec.kelas)}</div>
        <div style="${muted}">Tahun ajaran ${esc(A.ta)}${A.fase ? ' · Fase ' + A.fase : ''}${A.dirty ? ' · <span style="color:#b45309">● belum disimpan</span>' : ''}</div></div>${btn('tutup', '✕')}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">${tab('pilih', '1. Pilih TP')}${tab('atur', '2. Atur JP & Cetak')}</div>
        ${A.tab === 'atur' ? panelAtur() : panelPilih()}`;
    }
    el.innerHTML = `<style>${CSS}</style><div style="max-width:900px;margin:0 auto;background:#fff;color:#111;border-radius:12px;padding:16px;">${isi}</div>`;
    if (A.ro && A.rec) kunciRo(el, MUT);
  }
  const opsiSem = (v, kosong) => (kosong ? `<option value="" ${!v ? 'selected' : ''}>—</option>` : '') + SEM.map(s => `<option value="${s}" ${v === s ? 'selected' : ''}>${SEM_LABEL[s]}</option>`).join('');

  function panelPilih() {
    const pilih = {}; A.items.forEach(x => { pilih[x.k] = x.sem; });
    let h = '';
    if (!A.fase) h += `<div style="padding:10px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:13px;color:#92400e;margin-bottom:8px;">Fase tidak bisa dikenali dari nama kelas "${esc(A.rec.kelas)}". Bank TP hanya tampil bila kelas diawali angka atau angka Romawi 1-6 (mis. 4A atau IV-A). TP sendiri tetap bisa ditambahkan di bawah.</div>`;
    else if (!A.kunci) h += `<div style="padding:10px;background:#f0f9ff;border-radius:8px;font-size:13px;margin-bottom:8px;">Bank TP tersedia untuk Al-Qur'an Hadis, Akidah Akhlak, Fikih, SKI, dan Bahasa Arab. Untuk mapel "${esc(A.rec.mapel)}", tambahkan TP sendiri di bawah.</div>`;
    else if (!A.bank.length) h += `<div style="padding:10px;background:#f0f9ff;border-radius:8px;font-size:13px;margin-bottom:8px;">Mapel ini belum diajarkan pada Fase ${A.fase} (mis. SKI baru mulai Fase B). Tambahkan TP sendiri bila diperlukan.</div>`;
    if (A.bank.length) {
      h += `<div style="${muted}margin-bottom:6px;">Usulan TP dari CP SK Dirjen Pendis No. 9941 Tahun 2025. Pilih semesternya; rumusan boleh disunting di langkah 2. Mohon ditelaah bersama KKG.</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">${btn('dua', '⚡ Pilih semua & bagi dua semester', 'btn-success')}${btn('kosong', 'Kosongkan pilihan')}</div>`;
      let e = '';
      A.bank.forEach(b => {
        if (b.e !== e) { e = b.e; h += `<div style="margin-top:10px;font-weight:700;font-size:13px;">${esc(e)}</div>`; }
        h += `<div style="display:flex;gap:8px;align-items:flex-start;margin-top:5px;"><select class="field" style="width:96px;flex:none;" data-sel="${esc(b.k)}" aria-label="Semester untuk TP ini">${opsiSem(pilih[b.k] || '', true)}</select><div style="font-size:13px;line-height:1.35;">${esc(b.t)}<div style="${muted}">Materi: ${esc(b.m)}</div></div></div>`;
      });
    }
    const kust = A.items.filter(x => !A.bank.some(b => b.k === x.k));
    h += `<div style="margin-top:14px;padding:10px;background:#f9fafb;border-radius:8px;"><div style="font-weight:700;font-size:13px;margin-bottom:6px;">Tambah TP sendiri</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <input class="field" maxlength="60" style="width:150px;" data-form="e" value="${esc(A.form.e)}" placeholder="Elemen (mis. Bilangan)" aria-label="Elemen">
        <input class="field" maxlength="300" style="flex:1;min-width:220px;" data-form="t" value="${esc(A.form.t)}" placeholder="Tujuan pembelajaran" aria-label="Tujuan pembelajaran">
        <input class="field" maxlength="120" style="width:200px;" data-form="m" value="${esc(A.form.m)}" placeholder="Materi pokok (singkat)" aria-label="Materi pokok">
        <select class="field" style="width:96px;" data-form="sem" aria-label="Semester">${opsiSem(A.form.sem)}</select>
        ${btn('tambah', '➕ Tambah')}</div>${kust.length ? `<div style="${muted}margin-top:6px;">TP sendiri/ditambah: ${kust.length} (atur di langkah 2).</div>` : ''}</div>
      <div style="margin-top:12px;font-size:13px;">Terpilih: <b>${A.items.length}</b> TP (Ganjil ${daSem('ganjil').length}, Genap ${daSem('genap').length}) &nbsp; ${btn('ke-atur', 'Lanjut: atur JP & cetak ›', 'btn-success')}</div>`;
    return h;
  }

  function totalHtml() {
    return SEM.map(s => {
      const t = jpSem(s), av = tersedia(s);
      let h = `Semester ${SEM_LABEL[s]}: <b>${t}</b> JP`;
      if (av != null) h += ` dari ${av} tersedia` + (t > av ? ` <span style="color:#b91c1c">⚠️ kelebihan ${t - av}</span>` : t < av ? ` <span style="color:#6b7280">(sisa ${av - t})</span>` : ' ✅');
      return h;
    }).join(' · ') + (!jpNum() ? ` <span style="${muted}">· isi JP per pekan untuk membandingkan dengan JP tersedia</span>` : '');
  }
  function panelAtur() {
    let h = `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
      <label style="font-size:12px;">JP per pekan<br><input class="field" type="number" min="1" max="40" inputmode="numeric" style="width:100px;" data-f="jp" value="${esc(A.jp)}" placeholder="mis. 4"></label>
      <label style="font-size:12px;">Sisihkan JP penilaian<br><input class="field" type="number" min="0" max="60" inputmode="numeric" style="width:120px;" data-f="res" value="${esc(A.res)}" title="JP yang tidak dibagikan ke TP, untuk ulangan/asesmen"></label>
      <label style="font-size:12px;">NIP guru (tanda tangan)<br><input class="field" maxlength="30" style="width:200px;" data-f="nip" value="${esc(A.nip)}" placeholder="boleh dikosongkan"></label></div>
      <div id="atpTotal" style="margin:10px 0;font-size:13px;">${totalHtml()}</div>`;
    if (!A.items.length) return h + `<div style="${muted}">Belum ada TP terpilih. Kembali ke langkah 1.</div>${btn('tab" data-t="pilih', '‹ Pilih TP')}`;
    SEM.forEach(s => {
      const idx = A.items.map((x, i) => i).filter(i => A.items[i].sem === s);
      h += `<div style="margin-top:12px;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;"><div style="font-weight:700;">Semester ${SEM_LABEL[s]} (${idx.length} TP)</div>${idx.length ? btn('rata" data-s="' + s, '⚖️ Bagi rata JP') : ''}</div>`;
      if (!idx.length) h += `<div style="${muted}margin-top:4px;">Tidak ada TP di semester ini.</div>`;
      idx.forEach((i, n) => {
        const x = A.items[i];
        h += `<div style="margin-top:6px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><span style="${muted}width:20px;">${n + 1}</span><span style="${muted}flex:1;">${esc(x.e)}</span>
            <input class="field" type="number" min="0" max="99" inputmode="numeric" style="width:64px;" data-i="${i}" data-k="jp" value="${esc(x.jp)}" placeholder="JP" aria-label="JP TP ${n + 1}">
            <select class="field" style="width:96px;" data-i="${i}" data-k="sem" aria-label="Semester TP ${n + 1}">${opsiSem(x.sem)}</select>
            <button type="button" class="btn btn-soft" style="padding:4px 8px;font-size:12px;" data-a="naik" data-i="${i}" aria-label="Naikkan">↑</button>
            <button type="button" class="btn btn-soft" style="padding:4px 8px;font-size:12px;" data-a="turun" data-i="${i}" aria-label="Turunkan">↓</button>
            <button type="button" class="btn btn-soft" style="padding:4px 8px;font-size:12px;" data-a="hapus" data-i="${i}" aria-label="Hapus">🗑</button></div>
          <textarea class="field" rows="2" maxlength="300" style="width:100%;margin-top:6px;" data-i="${i}" data-k="t" aria-label="Tujuan pembelajaran ${n + 1}">${esc(x.t)}</textarea>
          <input class="field" maxlength="120" style="width:100%;margin-top:6px;" data-i="${i}" data-k="m" value="${esc(x.m)}" placeholder="Materi pokok" aria-label="Materi pokok ${n + 1}"></div>`;
      });
    });
    return h + `<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;">${btn('simpan', '💾 Simpan', 'btn-success')}${btn('cetak-tp', '🖨 Cetak TP')}${btn('word-tp', '📄 TP Word')}${btn('cetak-atp', '🖨 Cetak ATP')}${btn('word-atp', '📄 ATP Word')}${btn('terapkan', '🗂 Terapkan ke Prota/Promes')}</div>
      <div style="${muted}margin-top:6px;">"Terapkan" mengisi daftar materi Prota/Promes dari TP di atas (materi pokok dan JP). Isi lama pada semester yang sama akan diganti.</div>`;
  }

  // ---------- Event ----------
  function sinkron() {
    const el = document.getElementById('atpOverlay'); if (!el) return;
    el.querySelectorAll('[data-i]').forEach(i => { const x = A.items[+i.getAttribute('data-i')]; const k = i.getAttribute('data-k'); if (x && k && k !== 'sem') x[k] = i.value; });
    ['jp', 'res', 'nip'].forEach(f => { const i = el.querySelector('[data-f="' + f + '"]'); if (i) A[f] = i.value; });
  }
  function setSel(k, sem) {
    const ada = A.items.findIndex(x => x.k === k);
    if (!sem) { if (ada >= 0) A.items.splice(ada, 1); }
    else if (ada >= 0) A.items[ada].sem = sem;
    else { const b = A.bank.find(x => x.k === k); if (b && A.items.length < MAX_ITEMS) A.items.push({ k: b.k, e: b.e, t: b.t, m: b.m, sem: sem, jp: '' }); }
    urutkan(); A.dirty = true;
  }
  function ketik(e) {
    const t = e.target; if (!t || !t.getAttribute) return;
    const sel = t.getAttribute('data-sel'), form = t.getAttribute('data-form'), i = t.getAttribute('data-i'), f = t.getAttribute('data-f');
    if (sel) { setSel(sel, t.value === 'ganjil' || t.value === 'genap' ? t.value : ''); return gambar(); }
    if (form) { A.form[form] = t.value; return; }
    if (i !== null) {
      const x = A.items[+i], k = t.getAttribute('data-k'); if (!x) return;
      if (k === 'sem') { x.sem = t.value === 'genap' ? 'genap' : 'ganjil'; A.dirty = true; return gambar(); }
      x[k] = t.value; A.dirty = true;
    } else if (f) { A[f] = t.value; if (f === 'nip') return; }
    else return;
    const tot = document.getElementById('atpTotal'); if (tot) tot.innerHTML = totalHtml();
  }
  function geser(i, arah) {
    const s = A.items[i].sem; let j = i + arah;
    while (j >= 0 && j < A.items.length && A.items[j].sem !== s) j += arah;
    if (j < 0 || j >= A.items.length) return;
    const x = A.items[i]; A.items[i] = A.items[j]; A.items[j] = x; A.manual = true; A.dirty = true;
  }
  function rata(s) {
    const l = daSem(s), av = tersedia(s);
    if (!l.length) return;
    if (av == null) return say(jpNum() ? 'Kalender efektif semester ' + SEM_LABEL[s] + ' belum diisi Admin/Kepsek, JP tersedia belum diketahui.' : 'Isi JP per pekan lebih dulu.', true);
    const res = Math.max(0, parseInt(A.res, 10) || 0), total = av - res;
    if (total < l.length) return say('JP tersedia (' + av + ', dikurangi penilaian ' + res + ') kurang dari jumlah TP (' + l.length + ').', true);
    bagiRata(l.length, total).forEach((v, n) => { l[n].jp = String(v); });
    A.dirty = true; say('✅ ' + total + ' JP dibagi rata ke ' + l.length + ' TP');
  }
  function bersihItems() {
    const cut = (s, n) => String(s || '').trim().replace(/\s+/g, ' ').slice(0, n);
    return A.items.map(x => ({ k: String(x.k || '').slice(0, 40), e: cut(x.e, 60) || 'Umum', t: cut(x.t, 300), m: cut(x.m, 120), sem: x.sem === 'genap' ? 'genap' : 'ganjil', jp: jpItem(x) || '' })).filter(x => x.t);
  }
  function simpan(diam) {
    sinkron(); const rec = A.rec;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa menyimpan.', true);
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (A.busy) return; A.busy = true;
    const obj = { guruKey: rec.guruKey, guruName: rec.guruName || myName(), tahunAjaran: A.ta, mapel: rec.mapel, kelas: rec.kelas, fase: A.fase,
      manual: !!A.manual, items: bersihItems().map(x => ({ k: x.k, e: x.e, t: x.t, m: x.m, sem: x.sem, jp: x.jp === '' ? 0 : x.jp })), jpPerPekan: jpNum() || null,
      at: new Date().toISOString(), by: myName() };
    return db.ref('perangkat_tp_v4/' + idTp()).set(obj).then(() => {
      A.busy = false; A.dirty = false; audit('SAVE_PERANGKAT_TP', idTp()); if (!diam) say('✅ Tersimpan'); if (A.rec) gambar();
    }).catch(err => { A.busy = false; console.error('[SI MAMBA] atp:', err); say('❌ Gagal menyimpan: ' + ((err && err.message) || err), true); });
  }
  function terapkan() {
    sinkron(); const rec = A.rec;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa menerapkan.', true);
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    const per = {};
    SEM.forEach(s => { per[s] = bersihItems().filter(x => x.sem === s && x.jp !== '').map(x => ({ n: (x.m || x.t).slice(0, 120), jp: x.jp })); });
    const tanpaJp = bersihItems().filter(x => x.jp === '').length;
    if (!per.ganjil.length && !per.genap.length) return say('Isi JP pada TP dulu (atau gunakan Bagi rata JP).', true);
    if (!confirm('Isi daftar materi Prota/Promes dengan ' + per.ganjil.length + ' materi Ganjil dan ' + per.genap.length + ' materi Genap?' + (tanpaJp ? '\n' + tanpaJp + ' TP tanpa JP dilewati.' : '') + '\nIsi lama pada semester yang terisi akan diganti.')) return;
    if (A.busy) return; A.busy = true;
    const now = new Date().toISOString();
    const tulis = SEM.filter(s => per[s].length).map(s => db.ref('perangkat_materi_v4/' + idMateri(s)).set({ guruKey: rec.guruKey, guruName: rec.guruName || myName(), tahunAjaran: A.ta, semester: s,
      mapel: rec.mapel, kelas: rec.kelas, materi: per[s], jpPerPekan: jpNum() || null, at: now, by: myName() }));
    Promise.all(tulis).then(() => { A.busy = false; return simpan(true); }).then(() => { A.busy = false; audit('APPLY_PERANGKAT_TP', idTp()); say('✅ Materi Prota/Promes terisi. Buka 🗂 Prota/Promes untuk melihatnya.'); })
      .catch(err => { A.busy = false; console.error('[SI MAMBA] atp terapkan:', err); say('❌ Gagal menerapkan: ' + ((err && err.message) || err), true); });
  }
  function klik(e) {
    const t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return;
    const a = t.getAttribute('data-a'), i = +t.getAttribute('data-i');
    if (a !== 'tutup') sinkron();
    if (A.ro && MUT.indexOf(a) >= 0) return say('Mode lihat saja: hanya pemilik yang bisa mengubah.', true);
    switch (a) {
      case 'tutup': return tutup();
      case 'tab': A.tab = t.getAttribute('data-t') === 'atur' ? 'atur' : 'pilih'; return gambar();
      case 'ke-atur': A.tab = 'atur'; return gambar();
      case 'dua': {
        if (!A.bank.length) return;
        A.items = A.items.filter(x => !A.bank.some(b => b.k === x.k)).concat(A.bank.map((b, n) => ({ k: b.k, e: b.e, t: b.t, m: b.m, sem: n < Math.ceil(A.bank.length / 2) ? 'ganjil' : 'genap', jp: '' })));
        A.manual = false; urutkan(); A.dirty = true; return gambar();
      }
      case 'kosong': A.items = A.items.filter(x => !A.bank.some(b => b.k === x.k)); A.dirty = true; return gambar();
      case 'tambah': {
        const f = A.form, tt = f.t.trim();
        if (tt.length < 5) return say('Tulis tujuan pembelajaran (minimal 5 huruf).', true);
        if (A.items.length >= MAX_ITEMS) return say('Maksimal ' + MAX_ITEMS + ' TP.', true);
        A.items.push({ k: 'x' + Date.now().toString(36), e: f.e.trim() || 'Umum', t: tt, m: f.m.trim(), sem: f.sem === 'genap' ? 'genap' : 'ganjil', jp: '' });
        A.form = { e: f.e, t: '', m: '', sem: f.sem }; urutkan(); A.dirty = true; return gambar();
      }
      case 'naik': geser(i, -1); return gambar();
      case 'turun': geser(i, 1); return gambar();
      case 'hapus': A.items.splice(i, 1); A.dirty = true; return gambar();
      case 'rata': rata(t.getAttribute('data-s') === 'genap' ? 'genap' : 'ganjil'); return gambar();
      case 'simpan': return simpan();
      case 'cetak-tp': return cetakTp();
      case 'cetak-atp': return cetakAtp();
      case 'word-tp': return cetakTp('word');
      case 'word-atp': return cetakAtp('word');
      case 'terapkan': return terapkan();
    }
  }

  function muat() {
    const ep = ++A.epoch; A.loading = true; A.err = null; gambar();
    if (typeof db === 'undefined' || !db) { A.loading = false; A.err = 'Database belum siap.'; return gambar(); }
    Promise.all([db.ref('perangkat_tp_v4/' + idTp()).once('value'),
      db.ref('perangkat_rpe_kaldik_v4/' + R().slug(A.ta) + '_ganjil').once('value'), db.ref('perangkat_rpe_kaldik_v4/' + R().slug(A.ta) + '_genap').once('value')]).then(r => {
      if (ep !== A.epoch) return;
      const n = r[0].val();
      if (n) {
        A.items = R().daftar(n.items).map(x => ({ k: String((x && x.k) || ''), e: String((x && x.e) || 'Umum'), t: String((x && x.t) || ''), m: String((x && x.m) || ''),
          sem: x && x.sem === 'genap' ? 'genap' : 'ganjil', jp: x && x.jp ? String(x.jp) : '' })).filter(x => x.t);
        A.manual = !!n.manual; if (n.jpPerPekan && !A.jp) A.jp = String(n.jpPerPekan);
      }
      A.cfg.ganjil = R().bacaCfg(r[1].val() || null); A.cfg.genap = R().bacaCfg(r[2].val() || null);
      A.loading = false; gambar();
    }).catch(err => { if (ep !== A.epoch) return; A.loading = false; A.err = (err && err.message) || String(err); gambar(); });
  }

  // ---------- API publik ----------
  window.atpBuka = function (id, rec, sem, ta) {
    if (!rec) return;
    if (!window.rpeUtil) return say('Modul RPE belum dimuat (js/perangkat-rpe.js harus dimuat lebih dulu).', true);
    if (!window.BANK_TP_MI) return say('Bank TP belum dimuat (js/data-tp-mi.js).', true);
    A.rec = rec; A.ro = rec.guruKey !== myId(); A.ta = String(ta || ''); A.fase = fase(rec.kelas); A.kunci = kunciMapel(rec.mapel);
    A.bank = (A.fase && A.kunci) ? itemBank(A.kunci, A.fase) : [];
    const mp = window.BANK_TP_MI.mapel[A.kunci];
    A.cp = (A.fase && mp && mp.cp[A.fase]) ? mp.cp[A.fase] : [];
    A.items = []; A.manual = false; A.dirty = false; A.tab = 'pilih'; A.res = '0'; A.form = { e: '', t: '', m: '', sem: 'ganjil' };
    A.jp = rec.jpPerPekan ? String(rec.jpPerPekan) : '';
    try { A.nip = localStorage.getItem('rpe_nip_' + myId()) || ''; } catch (e) { A.nip = ''; }
    R().nipIsi(A, '#atpOverlay');
    muat();
  };
  window.atpUtil = { fase: fase, kunciMapel: kunciMapel, bagiRata: bagiRata, itemBank: itemBank, state: A, tabelAtp: tabelAtp, setSel: setSel };
})();
