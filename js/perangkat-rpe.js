/* ============================================================
   SI MAMBA - js/perangkat-rpe.js
   Mesin pembuat RPE (Rencana Pekan Efektif) siap cetak.
   - Admin/Kepsek mengisi SEKALI per semester: tanggal mulai-selesai, hari belajar per pekan (5/6),
     daftar hari tidak efektif (libur, ujian, kegiatan madrasah), nama madrasah & kepala madrasah.
   - Guru memilih mapel/kelas di menu Perangkat Pembelajaran, mengisi JP per pekan, lalu menekan Cetak.
     Jumlah pekan dihitung otomatis per bulan; hasil dicetak A4 atau disimpan sebagai PDF lewat dialog cetak.
   - Rumus: pekan efektif = (hari belajar - hari tidak efektif) / hari belajar per pekan.
     JP efektif per bulan = pembulatan(pekan efektif x JP per pekan).

   Dimuat SETELAH js/perangkat-pembelajaran.js. Memakai global: db, currentUser, currentTahunAjaran,
   toast, v4IsAdmin, v4IsHead, v4Audit. Diekspos: rpeBuka(id, rec, sem, ta), rpeKaldikBuka(sem, ta), rpeUtil.

   Data Firebase (baru):
   perangkat_rpe_kaldik_v4/<ta>_<semester> = { mulai, selesai, hariPerPekan, libur: [ { a, b, ket } ],
       madrasah, kepala, nipKepala, kota, at, by }
   perangkat_v4/<id>/jpPerPekan = angka (disimpan guru pemilik baris, opsional)
============================================================ */
(function () {
  'use strict';

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };
  const MAX_SPAN_HARI = 240, MAX_LIBUR = 80;

  // ---------- Pembantu murni ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x';
  }
  const pad = n => (n < 10 ? '0' : '') + n;
  function parseTgl(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim()); if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return (d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]) ? d : null;
  }
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fmtTgl = d => d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
  function fmtRentang(a, b) {
    if (a.getTime() === b.getTime()) return a.getDate() + ' ' + BULAN[a.getMonth()];
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return a.getDate() + '–' + b.getDate() + ' ' + BULAN[b.getMonth()];
    return a.getDate() + ' ' + BULAN[a.getMonth()] + ' – ' + b.getDate() + ' ' + BULAN[b.getMonth()];
  }
  const nomor = x => String(Math.round(x * 10) / 10).replace('.', ',');
  const daftar = x => Array.isArray(x) ? x : (x && typeof x === 'object' ? Object.values(x) : []);

  // Ubah data mentah Firebase menjadi konfigurasi bertanggal; null bila tidak sah.
  function bacaCfg(raw) {
    if (!raw) return null;
    const mulai = parseTgl(raw.mulai), selesai = parseTgl(raw.selesai);
    if (!mulai || !selesai || selesai < mulai) return null;
    const libur = daftar(raw.libur).map(x => {
      const a = parseTgl(x && x.a);
      return { a: a, b: a ? (parseTgl(x.b) || a) : null, ket: String((x && x.ket) || '').trim().slice(0, 80) };
    }).filter(x => x.a && x.b >= x.a);
    return {
      mulai: mulai, selesai: selesai, hariPerPekan: +raw.hariPerPekan === 5 ? 5 : 6, libur: libur,
      madrasah: String(raw.madrasah || '').trim(), kepala: String(raw.kepala || '').trim(),
      nipKepala: String(raw.nipKepala || '').trim(), kota: String(raw.kota || '').trim()
    };
  }

  // Inti perhitungan: telusuri tiap hari, hitung hari belajar & hari tidak efektif per bulan.
  function hitungRpe(cfg, jp) {
    const hp = cfg.hariPerPekan, bulan = [], idx = {};
    const d = new Date(cfg.mulai.getTime());
    let guard = 0;
    while (d <= cfg.selesai && guard++ < 400) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= hp) {
        const k = d.getFullYear() * 100 + d.getMonth();
        let b = idx[k];
        if (!b) { b = idx[k] = { tahun: d.getFullYear(), bln: d.getMonth(), hari: 0, tidak: 0, kejadian: {} }; bulan.push(b); }
        b.hari++;
        const hit = cfg.libur.findIndex(x => d >= x.a && d <= x.b);
        if (hit >= 0) {
          b.tidak++;
          const e = b.kejadian[hit] || (b.kejadian[hit] = { n: 0, a: new Date(d.getTime()), b: null, ket: cfg.libur[hit].ket });
          e.n++; e.b = new Date(d.getTime());
        }
      }
      d.setDate(d.getDate() + 1);
    }
    let tHari = 0, tTidak = 0, tJp = 0;
    bulan.forEach(b => {
      b.efHari = b.hari - b.tidak;
      b.pekan = b.hari / hp; b.tidakP = b.tidak / hp; b.efP = b.efHari / hp;
      b.jpEf = jp > 0 ? Math.round(b.efP * jp) : 0;
      b.ket = Object.keys(b.kejadian).map(k => b.kejadian[k]).sort((x, y) => x.a - y.a)
        .map(e => (e.ket || 'Tidak efektif') + ' (' + fmtRentang(e.a, e.b) + ', ' + e.n + ' hari)');
      tHari += b.hari; tTidak += b.tidak; tJp += b.jpEf;
    });
    return { bulan: bulan, hp: hp, jp: jp > 0 ? jp : 0,
      total: { hari: tHari, tidak: tTidak, efHari: tHari - tTidak, pekan: tHari / hp, tidakP: tTidak / hp, efP: (tHari - tTidak) / hp, jpEf: tJp } };
  }

  // Pecah tiap bulan menjadi blok "pekan" (tiap hp hari belajar berurutan) beserta kapasitas JP bulat.
  // Jumlah kapasitas per bulan sama dengan JP efektif di tabel RPE (pembagian sisa pembulatan: pecahan terbesar dulu).
  function hitungPekan(cfg, jp) {
    const hp = cfg.hariPerPekan, bulan = [], idx = {};
    const d = new Date(cfg.mulai.getTime());
    let guard = 0;
    while (d <= cfg.selesai && guard++ < 400) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= hp) {
        const k = d.getFullYear() * 100 + d.getMonth();
        let b = idx[k];
        if (!b) { b = idx[k] = { tahun: d.getFullYear(), bln: d.getMonth(), hariList: [] }; bulan.push(b); }
        b.hariList.push(cfg.libur.some(x => d >= x.a && d <= x.b));
      }
      d.setDate(d.getDate() + 1);
    }
    bulan.forEach(b => {
      b.pekan = [];
      for (let i = 0; i < b.hariList.length; i += hp) {
        const blok = b.hariList.slice(i, i + hp), ef = blok.filter(x => !x).length;
        b.pekan.push({ hari: blok.length, ef: ef, raw: jp > 0 ? ef / hp * jp : 0, cap: 0 });
      }
      const target = Math.round(b.pekan.reduce((t, p) => t + p.raw, 0) + 1e-9);
      b.pekan.forEach(p => { p.cap = Math.floor(p.raw + 1e-9); });
      let sisa = target - b.pekan.reduce((t, p) => t + p.cap, 0);
      b.pekan.map((p, i) => ({ i: i, f: p.raw - Math.floor(p.raw + 1e-9), raw: p.raw })).filter(x => x.raw > 0)
        .sort((x, y) => (y.f - x.f) || (x.i - y.i))
        .forEach(x => { if (sisa > 0) { b.pekan[x.i].cap++; sisa--; } });
      delete b.hariList;
    });
    return { bulan: bulan, hp: hp, jp: jp > 0 ? jp : 0 };
  }

  // ---------- Tabel & dokumen cetak ----------
  const CSS_TABEL = `.rpe-tbl{border-collapse:collapse;width:100%}
.rpe-tbl th,.rpe-tbl td{border:1px solid #333;padding:4px 6px;vertical-align:top;font-size:12px;color:#111}
.rpe-tbl th{background:#e5e7eb;text-align:center;font-weight:700}
.rpe-tbl td.c{text-align:center}
.rpe-tbl tfoot td{font-weight:700;background:#f3f4f6}
.rpe-tbl ul{margin:0;padding-left:16px}`;

  function tabelHtml(h) {
    const ada = h.jp > 0;
    const baris = h.bulan.map((b, i) => `<tr><td class="c">${i + 1}</td><td>${BULAN[b.bln]} ${b.tahun}</td><td class="c">${nomor(b.pekan)}</td><td class="c">${nomor(b.tidakP)}</td><td class="c"><b>${nomor(b.efP)}</b></td>${ada ? `<td class="c">${b.jpEf}</td>` : ''}<td>${b.ket.length ? '<ul>' + b.ket.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>' : '-'}</td></tr>`).join('');
    const t = h.total;
    return `<table class="rpe-tbl"><thead><tr><th style="width:30px">No</th><th>Bulan</th><th>Jumlah Pekan</th><th>Pekan Tidak Efektif</th><th>Pekan Efektif</th>${ada ? '<th>JP Efektif</th>' : ''}<th>Keterangan</th></tr></thead>
<tbody>${baris}</tbody>
<tfoot><tr><td colspan="2" class="c">Jumlah</td><td class="c">${nomor(t.pekan)}</td><td class="c">${nomor(t.tidakP)}</td><td class="c">${nomor(t.efP)}</td>${ada ? `<td class="c">${t.jpEf}</td>` : ''}<td>${t.efHari} hari efektif dari ${t.hari} hari belajar</td></tr></tfoot></table>`;
  }

  function dokumen(cfg, h, info) {
    const titik = '........................................';
    const madrasah = cfg.madrasah || 'MADRASAH';
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>RPE ${esc(info.mapel)} Kelas ${esc(info.kelas)}</title>
<style>
@page{size:A4 portrait;margin:16mm 15mm}
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:12pt;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kop{text-align:center;border-bottom:3px double #111;padding-bottom:8px;margin-bottom:12px}
.kop .m{font-size:16pt;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.kop .j{font-size:13pt;font-weight:700;margin-top:6px}
.kop .s{font-size:11pt;margin-top:2px}
.info{margin:0 0 10px;font-size:11.5pt}
.info td{padding:1px 8px 1px 0;vertical-align:top;border:0}
${CSS_TABEL}
.cat{font-size:10pt;margin-top:8px}
.ttd{display:flex;justify-content:space-between;gap:20px;margin-top:22px;font-size:11.5pt;page-break-inside:avoid}
.ttd>div{width:48%;text-align:left}
.ttd .sp{height:62px}
</style></head><body>
<div class="kop"><div class="m">${esc(madrasah)}</div><div class="j">RENCANA PEKAN EFEKTIF (RPE)</div><div class="s">Tahun Pelajaran ${esc(info.ta)} · Semester ${esc(info.sem)}</div></div>
<table class="info"><tr><td>Mata Pelajaran</td><td>: ${esc(info.mapel)}</td></tr><tr><td>Kelas</td><td>: ${esc(info.kelas)}</td></tr><tr><td>Guru</td><td>: ${esc(info.guru)}</td></tr>${h.jp ? `<tr><td>Alokasi waktu</td><td>: ${h.jp} JP per pekan</td></tr>` : ''}<tr><td>Hari belajar</td><td>: ${h.hp} hari per pekan (${fmtTgl(cfg.mulai)} s.d. ${fmtTgl(cfg.selesai)})</td></tr></table>
${tabelHtml(h)}
<div class="cat">Pekan efektif = (hari belajar − hari tidak efektif) ÷ ${h.hp} hari belajar per pekan.${h.jp ? ' JP efektif = pekan efektif × ' + h.jp + ' JP per pekan, dibulatkan per bulan.' : ''}</div>
<div class="ttd"><div>Mengetahui,<br>Kepala ${esc(madrasah)}<div class="sp"></div><b><u>${esc(cfg.kepala || titik)}</u></b><br>NIP. ${esc(cfg.nipKepala || titik)}</div>
<div>${esc(cfg.kota || titik)}, ${fmtTgl(new Date())}<br>Guru Mata Pelajaran<div class="sp"></div><b><u>${esc(info.guru || titik)}</u></b><br>NIP. ${esc(info.nip || titik)}</div></div>
</body></html>`;
  }

  // ---------- Pembantu yang bergantung app.js ----------
  const isAdm = () => (typeof v4IsAdmin === 'function' && v4IsAdmin()) || (typeof v4IsHead === 'function' && v4IsHead());
  const myId = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : '';
  const myName = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.name || '') : '';
  const say = (m, err, ms) => { if (typeof toast === 'function') toast(m, !!err, ms); };
  const audit = (aksi, id) => { try { if (typeof v4Audit === 'function') v4Audit(aksi, 'PERANGKAT', id, null, null); } catch (e) {} };

  // ---------- Status modul ----------
  const M = { mode: null, id: null, rec: null, sem: 'ganjil', ta: '', raw: null, cfg: null, jp: '', nip: '', edit: null,
              loading: false, err: null, busy: false, epoch: 0 };
  const muted = 'color:#6b7280;font-size:12px;';
  const btn = (a, t, kelas, extra) => `<button type="button" class="btn ${kelas || 'btn-soft'}" style="padding:6px 12px;font-size:12px;${extra || ''}" data-a="${a}">${t}</button>`;
  const jpNum = () => { const n = parseInt(M.jp, 10); return (n >= 1 && n <= 40) ? n : 0; };
  const path = () => 'perangkat_rpe_kaldik_v4/' + slug(M.ta) + '_' + M.sem;

  function ov() {
    let el = document.getElementById('rpeOverlay'); if (el) return el;
    el = document.createElement('div'); el.id = 'rpeOverlay';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;background:rgba(15,23,42,.5);overflow:auto;padding:12px;';
    el.addEventListener('click', klik); el.addEventListener('input', ketik);
    document.body.appendChild(el); return el;
  }
  function tutup() { const el = document.getElementById('rpeOverlay'); if (el) el.remove(); M.epoch++; M.hariJ = null; M.edit = null; M.cfg = null; M.raw = null; M.rec = null; M.mode = null; }

  function gambar() {
    const el = ov();
    const isi = M.loading ? `<div style="${muted}padding:12px;">⏳ Memuat kalender efektif...</div>${btn('tutup', 'Tutup')}`
      : M.err ? `<div style="padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:13px;margin-bottom:8px;">⚠️ Gagal memuat: ${esc(M.err)}</div>${btn('tutup', 'Tutup')}`
      : (M.mode === 'atur' ? panelAtur() : panelCetak());
    el.innerHTML = `<style>${CSS_TABEL}</style><div style="max-width:780px;margin:0 auto;background:#fff;color:#111;border-radius:12px;padding:16px;">${isi}</div>`;
  }

  // ---------- Panel guru: pratinjau + cetak ----------
  function pratinjau() {
    const h = hitungRpe(M.cfg, jpNum()), t = h.total;
    return `<div style="font-size:13px;margin:10px 0 6px;">Pekan efektif: <b>${nomor(t.efP)}</b> dari ${nomor(t.pekan)} pekan (${t.efHari} hari efektif)${h.jp ? ` · JP efektif: <b>${t.jpEf}</b>` : ''}</div>
      <div style="overflow-x:auto;">${tabelHtml(h)}</div>`;
  }
  function panelCetak() {
    const rec = M.rec || {};
    let h = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <div><div style="font-size:17px;font-weight:700;">🖨 RPE · ${esc(rec.mapel)} · Kelas ${esc(rec.kelas)}</div>
      <div style="${muted}">Tahun ajaran ${esc(M.ta)} · Semester ${SEM_LABEL[M.sem]}</div></div>${btn('tutup', '✕')}</div>`;
    if (!M.cfg) {
      return h + `<div style="padding:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:13px;color:#92400e;">Kalender efektif semester ini belum diisi. ${isAdm() ? 'Isi dulu agar RPE bisa dihitung.' : 'Minta Admin atau Kepala Madrasah mengisinya terlebih dulu.'}</div>
        <div style="margin-top:10px;display:flex;gap:6px;">${isAdm() ? btn('atur', '🗓 Isi kalender efektif', 'btn-success') : ''}${btn('tutup', 'Tutup')}</div>`;
    }
    h += `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
      <label style="font-size:12px;">JP per pekan<br><input class="field" type="number" min="1" max="40" inputmode="numeric" style="width:100px;" data-f="jp" value="${esc(M.jp)}" placeholder="mis. 4"></label>
      <label style="font-size:12px;">NIP guru (untuk tanda tangan)<br><input class="field" maxlength="30" style="width:220px;" data-f="nip" value="${esc(M.nip)}" placeholder="boleh dikosongkan"></label></div>
      <div style="${muted}margin-top:4px;">Kolom JP efektif hanya muncul bila JP per pekan diisi.</div>
      <div id="rpePrev">${pratinjau()}</div>
      <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">${btn('cetak', '🖨 Cetak / Simpan PDF', 'btn-success')}${btn('word', '📄 Unduh Word')}${isAdm() ? btn('atur', '🗓 Ubah kalender efektif') : ''}${btn('tutup', 'Tutup')}</div>`;
    return h;
  }

  // ---------- Saran hari efektif dari jadwal pelajaran (node 'jadwal', field 'hari') ----------
  const HARI_J = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  function muatHariJadwal() {
    if (M.hariJ || typeof db === 'undefined' || !db) return;
    const epoch = M.epoch;
    try {
      db.ref('jadwal').limitToFirst(3000).once('value').then(sn => {
        const ada = {}; sn.forEach(c => { const h = String((c.val() || {}).hari || '').toLowerCase().replace(/[^a-z]/g, ''); if (HARI_J.indexOf(h) >= 0) ada[h] = 1; });
        const nama = HARI_J.filter(h => ada[h]);
        M.hariJ = { nama: nama, saran: nama.length ? (ada.sabtu ? 6 : 5) : 0 };
        const el = document.getElementById('rpeHariJadwal'); if (el && epoch === M.epoch) el.innerHTML = hintHari();
      }).catch(() => {});
    } catch (e) {}
  }
  function hintHari() {
    const j = M.hariJ; if (!j) return '';
    if (!j.saran) return '📅 Hari pada data jadwal tidak dikenali; atur manual.';
    const nm = j.nama.map(h => h.charAt(0).toUpperCase() + h.slice(1)).join(', ');
    const sesuai = M.edit && M.edit.hari === j.saran;
    return '📅 Jadwal pelajaran memakai ' + j.nama.length + ' hari (' + nm + '). Disarankan: ' + j.saran + ' hari. ' +
      (sesuai ? '✓ sudah sesuai' : '<button type="button" class="btn btn-soft" style="padding:2px 8px;font-size:11px;" data-a="pakai-hari" data-v="' + j.saran + '">Pakai ' + j.saran + ' hari</button>');
  }

  // ---------- Panel Admin: atur kalender efektif ----------
  function siapEdit() {
    const r = M.raw || {};
    M.edit = { mulai: r.mulai || '', selesai: r.selesai || '', hari: +r.hariPerPekan === 5 ? 5 : 6,
      madrasah: r.madrasah || 'MI Mambaul Ulum', kepala: r.kepala || '', nipKepala: r.nipKepala || '', kota: r.kota || '',
      libur: daftar(r.libur).map(x => ({ a: (x && x.a) || '', b: (x && x.b) || '', ket: (x && x.ket) || '' })) };
    if (!M.edit.libur.length) M.edit.libur.push({ a: '', b: '', ket: '' });
  }
  function sinkron() {
    const el = document.getElementById('rpeOverlay'); if (!el || !M.edit) return;
    el.querySelectorAll('[data-f]').forEach(i => { const k = i.getAttribute('data-f'); if (k === 'hari') M.edit.hari = i.value === '5' ? 5 : 6; else M.edit[k] = i.value; });
    el.querySelectorAll('[data-r]').forEach(i => { const r = M.edit.libur[+i.getAttribute('data-r')]; if (r) r[i.getAttribute('data-k')] = i.value; });
  }
  function panelAtur() {
    const e = M.edit || {}, fld = (k, label, ph, w) => `<label style="font-size:12px;">${label}<br><input class="field" maxlength="80" style="width:${w || 220}px;" data-f="${k}" value="${esc(e[k])}" placeholder="${ph || ''}"></label>`;
    const baris = (e.libur || []).map((r, i) => `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;">
      <input class="field" type="date" style="width:150px;" data-r="${i}" data-k="a" value="${esc(r.a)}" aria-label="Tanggal mulai">
      <input class="field" type="date" style="width:150px;" data-r="${i}" data-k="b" value="${esc(r.b)}" aria-label="Tanggal selesai (kosongkan bila sehari)">
      <input class="field" maxlength="80" style="flex:1;min-width:160px;" data-r="${i}" data-k="ket" value="${esc(r.ket)}" placeholder="Keterangan, mis. Libur semester / PAS / HUT RI" aria-label="Keterangan">
      <button type="button" class="btn btn-soft" style="padding:4px 10px;font-size:12px;" data-a="atur-hapus" data-i="${i}" aria-label="Hapus baris">🗑</button></div>`).join('');
    return `<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-bottom:8px;">
      <div><div style="font-size:17px;font-weight:700;">🗓 Kalender efektif untuk RPE</div>
      <div style="${muted}">Tahun ajaran ${esc(M.ta)} · Semester ${SEM_LABEL[M.sem]} · diisi sekali, dipakai semua guru.</div></div>${btn('tutup', '✕')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <label style="font-size:12px;">Semester mulai<br><input class="field" type="date" style="width:160px;" data-f="mulai" value="${esc(e.mulai)}"></label>
        <label style="font-size:12px;">Semester selesai<br><input class="field" type="date" style="width:160px;" data-f="selesai" value="${esc(e.selesai)}"></label>
        <label style="font-size:12px;">Hari belajar per pekan<br><select class="field" style="width:160px;" data-f="hari"><option value="6" ${e.hari !== 5 ? 'selected' : ''}>6 hari (Senin–Sabtu)</option><option value="5" ${e.hari === 5 ? 'selected' : ''}>5 hari (Senin–Jumat)</option></select></label></div>
      <div id="rpeHariJadwal" style="${muted}margin-top:6px;">${hintHari()}</div>
      <div style="margin-top:12px;font-weight:700;font-size:13px;">Hari tidak efektif</div>
      <div style="${muted}">Libur nasional, cuti bersama, libur semester, ujian, dan kegiatan yang meniadakan KBM. Isi tanggal selesai bila lebih dari sehari. Hari Minggu otomatis tidak dihitung.</div>
      ${baris}
      <div style="margin-top:8px;">${btn('atur-tambah', '➕ Tambah baris')}</div>
      <div style="margin-top:12px;font-weight:700;font-size:13px;">Kop dan tanda tangan</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;">${fld('madrasah', 'Nama madrasah', '', 260)}${fld('kota', 'Kota (untuk tanggal cetak)', 'mis. Surabaya', 180)}${fld('kepala', 'Nama Kepala Madrasah', '', 260)}${fld('nipKepala', 'NIP Kepala Madrasah', 'boleh dikosongkan', 200)}</div>
      <div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;">${btn('atur-simpan', '💾 Simpan kalender', 'btn-success')}${btn(M.rec ? 'batal-atur' : 'tutup', 'Batal')}</div>`;
  }
  function simpanAtur() {
    sinkron(); const e = M.edit; if (!e || !isAdm()) return;
    const a = parseTgl(e.mulai), b = parseTgl(e.selesai);
    if (!a || !b) return say('Isi tanggal mulai dan selesai semester.', true);
    if (b <= a) return say('Tanggal selesai harus setelah tanggal mulai.', true);
    if ((b - a) / 864e5 > MAX_SPAN_HARI) return say('Rentang semester maksimal ' + MAX_SPAN_HARI + ' hari.', true);
    const libur = [];
    for (let i = 0; i < e.libur.length; i++) {
      const r = e.libur[i]; if (!r.a && !r.b && !String(r.ket).trim()) continue;
      const x = parseTgl(r.a); if (!x) return say('Baris ' + (i + 1) + ': isi tanggal mulai.', true);
      const y = r.b ? parseTgl(r.b) : x; if (!y || y < x) return say('Baris ' + (i + 1) + ': tanggal selesai tidak boleh sebelum tanggal mulai.', true);
      const k = String(r.ket).trim().replace(/\s+/g, ' ').slice(0, 80); if (!k) return say('Baris ' + (i + 1) + ': isi keterangan.', true);
      libur.push({ a: iso(x), b: iso(y), ket: k });
    }
    if (libur.length > MAX_LIBUR) return say('Maksimal ' + MAX_LIBUR + ' baris hari tidak efektif.', true);
    const cut = (s, n) => String(s || '').trim().slice(0, n);
    const obj = { mulai: iso(a), selesai: iso(b), hariPerPekan: e.hari === 5 ? 5 : 6, libur: libur,
      madrasah: cut(e.madrasah, 80), kepala: cut(e.kepala, 80), nipKepala: cut(e.nipKepala, 30), kota: cut(e.kota, 40),
      at: new Date().toISOString(), by: myName() };
    if (typeof db === 'undefined' || !db) return;
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (M.busy) return; M.busy = true;
    siap().then(() => db.ref(path()).set(obj)).then(() => {
      M.busy = false; M.raw = obj; M.cfg = bacaCfg(obj); audit('SAVE_RPE_KALDIK', slug(M.ta) + '_' + M.sem); say('✅ Kalender efektif tersimpan');
      if (M.rec) { M.mode = 'cetak'; M.edit = null; gambar(); } else tutup();
    }).catch(err => { M.busy = false; console.error('[SI MAMBA] rpe:', err); say('❌ Gagal menyimpan: ' + ((err && err.message) || err), true); });
  }

  // ---------- Cetak ----------
  function cetak(mode) {
    if (!M.cfg || !M.rec) return;
    const jp = jpNum(), h = hitungRpe(M.cfg, jp), nip = String(M.nip || '').trim().slice(0, 30);
    nipSimpan(nip);
    // Simpan JP per pekan pada baris mapel (hanya pemilik). Gagal simpan tidak menghalangi cetak.
    if (jp && M.rec.guruKey === myId() && M.rec.jpPerPekan !== jp && typeof db !== 'undefined' && db && navigator.onLine) {
      siap().then(() => db.ref('perangkat_v4/' + M.id + '/jpPerPekan').set(jp)).then(() => { M.rec.jpPerPekan = jp; }).catch(e => console.warn('[SI MAMBA] rpe jp:', e));
    }
    const html = dokumen(M.cfg, h, { guru: M.rec.guruName || myName(), nip: nip, mapel: M.rec.mapel, kelas: M.rec.kelas, ta: M.ta, sem: SEM_LABEL[M.sem] });
    keluarkan(html, 'RPE_' + M.rec.mapel + '_' + M.rec.kelas + '_' + SEM_LABEL[M.sem], mode);
  }

  // ---------- Event ----------
  function klik(e) {
    const t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return;
    const a = t.getAttribute('data-a');
    switch (a) {
      case 'tutup': return tutup();
      case 'cetak': return cetak();
      case 'word': return cetak('word');
      case 'atur': M.mode = 'atur'; siapEdit(); muatHariJadwal(); return gambar();
      case 'pakai-hari': sinkron(); M.edit.hari = +t.getAttribute('data-v') === 5 ? 5 : 6; return gambar();
      case 'batal-atur': M.mode = 'cetak'; M.edit = null; return gambar();
      case 'atur-tambah': sinkron(); M.edit.libur.push({ a: '', b: '', ket: '' }); return gambar();
      case 'atur-hapus': sinkron(); M.edit.libur.splice(+t.getAttribute('data-i'), 1); if (!M.edit.libur.length) M.edit.libur.push({ a: '', b: '', ket: '' }); return gambar();
      case 'atur-simpan': return simpanAtur();
    }
  }
  function ketik(e) {
    const t = e.target, f = t && t.getAttribute ? t.getAttribute('data-f') : null; if (M.mode !== 'cetak' || !f) return;
    if (f === 'jp') { M.jp = t.value; const p = document.getElementById('rpePrev'); if (p && M.cfg) p.innerHTML = pratinjau(); }
    else if (f === 'nip') M.nip = t.value;
  }

  function muatCfg(lalu) {
    const ep = ++M.epoch; M.loading = true; M.err = null; gambar();
    if (typeof db === 'undefined' || !db) { M.loading = false; M.err = 'Database belum siap.'; return gambar(); }
    db.ref(path()).once('value').then(s => {
      if (ep !== M.epoch) return;
      M.raw = s.val() || null; M.cfg = bacaCfg(M.raw); M.loading = false; if (lalu) lalu(); gambar();
    }).catch(err => { if (ep !== M.epoch) return; M.loading = false; M.err = (err && err.message) || String(err); gambar(); });
  }

  // ---------- Keluaran bersama: cetak / unduh Word, dan NIP guru tersimpan di server ----------
  // Indeks akhir (setelah </div>) dari <div> yang dibuka pada indeks 'awal'; -1 bila tidak seimbang.
  function blokSeimbang(h, awal) {
    const re = /<div\b|<\/div>/g; re.lastIndex = awal; let d = 0, m;
    while ((m = re.exec(h))) { if (m[0] === '</div>') { d--; if (!d) return re.lastIndex; } else d++; }
    return -1;
  }
  // Ubah HTML siap-cetak menjadi HTML yang dibuka Word (.doc): ukuran/orientasi halaman, blok tanda tangan jadi tabel.
  function wordDari(html) {
    let h = String(html), orient = 'portrait', mg = '16mm 15mm 16mm 15mm';
    const pg = /@page\s*\{([^}]*)\}/.exec(h);
    if (pg) {
      if (/landscape/i.test(pg[1])) orient = 'landscape';
      const mm = /margin:\s*([^;}]+)/.exec(pg[1]);
      if (mm) { const p = mm[1].trim().split(/\s+/); mg = (p.length === 1 ? [p[0], p[0], p[0], p[0]] : p.length === 2 ? [p[0], p[1], p[0], p[1]] : p.length === 3 ? [p[0], p[1], p[2], p[1]] : p.slice(0, 4)).join(' '); }
      h = h.replace(pg[0], '');
    }
    const t0 = h.indexOf('<div class="ttd">');
    if (t0 >= 0) {
      const t1 = blokSeimbang(h, t0);
      if (t1 > 0) {
        const dalam = h.slice(t0 + '<div class="ttd">'.length, t1 - '</div>'.length), a0 = dalam.indexOf('<div');
        const a1 = a0 >= 0 ? blokSeimbang(dalam, a0) : -1, b0 = a1 > 0 ? dalam.indexOf('<div', a1) : -1, b1 = b0 >= 0 ? blokSeimbang(dalam, b0) : -1;
        if (a1 > 0 && b1 > 0) {
          const isi = c => c.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '').replace(/<div class="sp"><\/div>/g, '<br><br><br><br>');
          h = h.slice(0, t0) + '<table style="width:100%;border:0;margin-top:20px"><tr><td style="width:50%;border:0;vertical-align:top;font-size:11pt">' + isi(dalam.slice(a0, a1)) +
            '</td><td style="width:50%;border:0;vertical-align:top;font-size:11pt">' + isi(dalam.slice(b0, b1)) + '</td></tr></table>' + h.slice(t1);
        }
      }
    }
    // Atribut HTML murni (border/bgcolor) agar garis tabel tetap muncul walau Word/WPS/LibreOffice mengabaikan sebagian CSS.
    h = h.replace(/<table\b([^>]*)>/gi, (m, at) => /class="info"|border:\s*0/.test(at) ? m : '<table' + at + ' border="1" cellspacing="0" cellpadding="3">')
      .replace(/<th\b(?![^>]*bgcolor)([^>]*)>/gi, '<th bgcolor="#e5e7eb"$1>')
      .replace(/<td class="on">/g, '<td class="on" bgcolor="#bbf7d0">').replace(/<td class="non"([^>]*)>/g, '<td class="non" bgcolor="#d1d5db"$1>');
    const w = orient === 'landscape' ? '29.7cm 21cm' : '21cm 29.7cm';
    h = h.replace(/<html[^>]*>/i, '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">')
      .replace(/<head>/i, '<head><meta name="ProgId" content="Word.Document">')
      .replace(/<\/head>/i, '<style>@page Section1{size:' + w + ';mso-page-orientation:' + orient + ';margin:' + mg + '}div.Section1{page:Section1}</style></head>')
      .replace(/<body[^>]*>/i, '<body><div class="Section1">').replace(/<\/body>/i, '</div></body>');
    return h;
  }
  // mode 'word' => unduh .doc; selain itu buka jendela cetak.
  function keluarkan(html, nama, mode) {
    if (mode === 'word') {
      const blob = new Blob(['\ufeff' + wordDari(html)], { type: 'application/msword' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = String(nama || 'dokumen').replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 80) + '.doc';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return true;
    }
    const w = window.open('', '_blank');
    if (!w) { say('Pop-up diblokir. Izinkan pop-up untuk situs ini, lalu coba lagi.', true); return false; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 500);
    return true;
  }
  const nipKunci = () => 'rpe_nip_' + myId();
  let nipServer = null; // nilai terakhir yang diketahui ada di server
  function nipLokal() { try { return localStorage.getItem(nipKunci()) || ''; } catch (e) { return ''; } }
  // NIP: server diutamakan (ikut ke HP lain), localStorage sebagai cadangan/offline.
  function nipMuat() {
    const lokal = nipLokal();
    if (typeof db === 'undefined' || !db || !navigator.onLine || !myId()) return Promise.resolve(lokal);
    return db.ref('perangkat_setting_v4/nip/' + slug(myId())).once('value').then(sn => {
      const v = sn.val(); nipServer = (typeof v === 'string') ? v : '';
      if (nipServer) { try { localStorage.setItem(nipKunci(), nipServer); } catch (e) {} return nipServer; }
      return lokal;
    }).catch(() => lokal);
  }
  function nipSimpan(v) {
    v = String(v || '').trim().slice(0, 30);
    try { localStorage.setItem(nipKunci(), v); } catch (e) {}
    if (typeof db === 'undefined' || !db || !navigator.onLine || !myId() || v === nipServer) return Promise.resolve();
    const ref = db.ref('perangkat_setting_v4/nip/' + slug(myId()));
    return siap().then(() => (v ? ref.set(v) : ref.remove())).then(() => { nipServer = v; }).catch(e => console.warn('[SI MAMBA] nip:', e));
  }
  // Isi kolom NIP dari server bila pengguna belum mengetik apa pun sejak panel dibuka.
  function nipIsi(state, selektor) {
    const awal = state.nip;
    nipMuat().then(v => {
      if (v && v !== awal && state.nip === awal) { state.nip = v; const i = document.querySelector(selektor + ' [data-f="nip"]'); if (i) i.value = v; }
    });
  }


  // ---------- API publik ----------
  window.rpeBuka = function (id, rec, sem, ta) {
    if (!rec) return;
    M.mode = 'cetak'; M.id = id; M.rec = rec; M.sem = sem === 'genap' ? 'genap' : 'ganjil'; M.ta = String(ta || '');
    M.jp = rec.jpPerPekan ? String(rec.jpPerPekan) : ''; M.edit = null;
    M.nip = nipLokal(); nipIsi(M, '#rpeOverlay');
    muatCfg();
  };
  window.rpeKaldikBuka = function (sem, ta) {
    if (!isAdm()) return;
    M.mode = 'atur'; M.id = null; M.rec = null; M.sem = sem === 'genap' ? 'genap' : 'ganjil'; M.ta = String(ta || '');
    muatCfg(function () { siapEdit(); muatHariJadwal(); });
  };
  // Sesi tulis untuk Rules: Admin -> sesi_admin (kredAdminSiap, Kunci Admin tersimpan di perangkat); Guru -> sesi_guru (kredGuruSiap).
  function siap() {
    try {
      if (typeof v4IsAdmin === 'function' && v4IsAdmin()) return typeof window.kredAdminSiap === 'function' ? Promise.resolve(window.kredAdminSiap()) : Promise.resolve(true);
      if (typeof window.kredGuruSiap === 'function') return Promise.resolve(window.kredGuruSiap());
    } catch (e) { return Promise.reject(e); }
    return Promise.resolve(true);
  }
  window.rpeUtil = { siap: siap, parseTgl: parseTgl, bacaCfg: bacaCfg, hitungRpe: hitungRpe, hitungPekan: hitungPekan, dokumen: dokumen, nomor: nomor,
    esc: esc, slug: slug, fmtTgl: fmtTgl, fmtRentang: fmtRentang, daftar: daftar, BULAN: BULAN,
    keluarkan: keluarkan, wordDari: wordDari, nipMuat: nipMuat, nipSimpan: nipSimpan, nipIsi: nipIsi };
})();
