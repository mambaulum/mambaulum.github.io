/* SI MAMBA — Cetak Paket Perangkat (js/perangkat-paket.js)
 * Satu tombol di hub Perangkat Pembelajaran: guru mencentang bagian (RPE, ATP, TP, Prota, Promes, Kisi-kisi,
 * Kartu/Naskah/Kunci/Telaah Soal), mengurutkan, lalu semuanya digabung menjadi SATU dokumen cetak dengan sampul,
 * daftar isi, dan halaman pemisah tiap bagian.
 *
 * Syarat muat: js/perangkat-rpe.js (rpeUtil) dan modul pembuat dokumen dimuat lebih dulu.
 * Kontrak tiap pembuat bagian: window.xxxPaket(id, rec, sem, ta[, jenis]) -> Promise<{html, nama}>
 *   rpePaket, atpPaket(..,'atp'|'tp'), protaPaket(..,'prota'|'promes'), kisiPaket, soalPaket(..,'kartu'|'naskah'|'kunci'|'telaah').
 *   html = dokumen lengkap (<style> + <body>, @page-nya sendiri). Menolak dengan Error(alasan) bila belum bisa dibuat.
 *   modulPaket(id, rec, sem, ta) -> semua Modul Ajar (RPM) mapel+kelas+semester itu (modul-ajar.js). Bagian 'mandiri': datanya dari modul_ajar, bukan dari dokumen hub,
 *   jadi ketersediaannya TIDAK ditanyakan ke hub (genAda/perluSetuju); modulPaketInfo() memberi ringkasan setelah daftar modul termuat.
 * Penanda tanda tangan [[TTD:...]] dibiarkan; semuanya diproses sekali oleh rpeUtil.keluarkan() saat dicetak.
 * Cetak paket hanya lewat jendela cetak/PDF (bukan Word): satu berkas Word tidak bisa memuat ukuran halaman berbeda.
 */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = (m, err, ms) => { if (typeof toast === 'function') toast(m, !!err, ms); };
  const myId = () => (typeof currentUser !== 'undefined' && currentUser) ? (currentUser.key || currentUser.name || '') : '';
  const SEM_LABEL = { ganjil: 'Ganjil', genap: 'Genap' };
  const muted = 'color:#6b7280;font-size:12px;';

  // Urutan bawaan mengikuti tahap kerja guru. 'jk' = jenis di hub (untuk cek ketersediaan dan status).
  const BAGIAN = [
    { k: 'rpe', n: 'RPE (Rencana Pekan Efektif)', jk: 'rpe', fn: 'rpePaket', a: [] },
    { k: 'atp', n: 'ATP (Alur Tujuan Pembelajaran)', jk: 'atp', fn: 'atpPaket', a: ['atp'] },
    { k: 'tp', n: 'TP (Tujuan Pembelajaran)', jk: 'tp', fn: 'atpPaket', a: ['tp'] },
    { k: 'prota', n: 'Prota (Program Tahunan)', jk: 'prota', fn: 'protaPaket', a: ['prota'] },
    { k: 'promes', n: 'Promes (Program Semester)', jk: 'promes', fn: 'protaPaket', a: ['promes'] },
    { k: 'modul', n: 'Modul Ajar (RPM)', jk: 'modul', fn: 'modulPaket', a: [], mandiri: true },
    { k: 'kisi', n: 'Kisi-kisi Soal', jk: 'kisi', fn: 'kisiPaket', a: [] },
    { k: 'kartu', n: 'Kartu Soal', jk: 'kartu', fn: 'soalPaket', a: ['kartu'] },
    { k: 'naskah', n: 'Naskah Soal', jk: 'kartu', fn: 'soalPaket', a: ['naskah'] },
    { k: 'kunci', n: 'Kunci & Penskoran', jk: 'kunci', fn: 'soalPaket', a: ['kunci'], rahasia: true },
    { k: 'telaah', n: 'Lembar Telaah Soal', jk: 'kartu', fn: 'soalPaket', a: ['telaah'] }
  ];
  const BY = {}; BAGIAN.forEach(b => { BY[b.k] = b; });
  const KUNCI_SIMPAN = () => 'paket_perangkat_v1_' + myId();

  const Pk = { id: '', rec: null, sem: 'ganjil', ta: '', h: null, urut: [], cek: {}, opsi: { sampul: true, pemisah: true, pisah: false },
    fase: 'pilih', info: '', hasil: [], gagal: [], grup: [] };

  // ---------- Dokumen: ekstrak, lingkupkan CSS, gabungkan ----------
  // Ambil semua blok @page (termasuk margin box bersarang seperti @bottom-left{...}) dengan menghitung kurung kurawal.
  function ambilPage(css) {
    const isi = []; let sisa = '', i = 0; css = String(css);
    while (i < css.length) {
      const m = /@page\b[^{]*\{/g; m.lastIndex = i; const f = m.exec(css);
      if (!f) { sisa += css.slice(i); break; }
      sisa += css.slice(i, f.index);
      let d = 1, j = f.index + f[0].length;
      while (j < css.length && d > 0) { const c = css.charAt(j++); if (c === '{') d++; else if (c === '}') d--; }
      isi.push(css.slice(f.index + f[0].length, j - 1)); i = j;
    }
    return { sisa: sisa, isi: isi };
  }
  function ekstrak(html) {
    const css = []; String(html).replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, c) => { css.push(c); return m; });
    const b = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html), t = /<title>([\s\S]*?)<\/title>/i.exec(html);
    const pgs = ambilPage(css.join('\n').replace(/\/\*[\s\S]*?\*\//g, '')).isi, sz = pgs.length ? /size\s*:\s*([^;}]+)/i.exec(pgs.join(';')) : null;
    const ukuran = sz ? sz[1].trim().replace(/\s+/g, ' ').toLowerCase() : 'a4 portrait';
    const mad = /class="m">([^<]*)</.exec(html);
    return { css: css.join('\n'), body: b ? b[1] : String(html), judul: t ? t[1] : '', ukuran: ukuran, lanskap: /landscape/.test(ukuran), madrasah: mad ? mad[1] : '' };
  }
  // Awali tiap selektor dengan .kelas supaya gaya satu dokumen tidak menimpa dokumen lain; @page jadi halaman bernama.
  function scopeCss(css, kelas, halaman, fixedAman) {
    const ap = ambilPage(String(css).replace(/\/\*[\s\S]*?\*\//g, ''));
    const pg = ap.isi.length ? '@page ' + halaman + '{' + ap.isi.join(';') + '}\n' : '';
    css = ap.sisa;
    const awali = sel => sel.split(',').map(x => {
      x = x.trim(); if (!x) return '';
      if (x === '*') return '.' + kelas + ',.' + kelas + ' *';
      if (x === 'html' || x === 'body') return '.' + kelas;
      return '.' + kelas + ' ' + x.replace(/^(html|body)\s+/, '');
    }).filter(Boolean).join(',');
    // position:fixed (watermark logo) akan muncul di SEMUA halaman paket; jadikan absolute kecuali paket hanya berisi dokumen soal.
    const isi = css.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, d) => sel.trim().charAt(0) === '@' ? m : awali(sel) + '{' + (fixedAman ? d : d.replace(/position\s*:\s*fixed/gi, 'position:absolute')) + '}');
    return pg + isi;
  }
  const CSS_DASAR = `*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:"Times New Roman",Times,serif;color:#111}
.pk-pemisah{text-align:center;padding-top:55mm;break-after:page;page-break-after:always}
.pk-pemisah.lk{padding-top:40mm}
.pk-pemisah .no{font-size:14pt;letter-spacing:3px;color:#555}
.pk-pemisah .jd{font-size:30pt;font-weight:700;margin:10px 0}
.pk-pemisah .ket{font-size:13pt;color:#333}
.pk-sampul{text-align:center;font-size:12pt}
.pk-sampul .kop{border-bottom:3px double #111;padding-bottom:8px;margin-bottom:28px}
.pk-sampul .m{font-size:16pt;font-weight:700;text-transform:uppercase}
.pk-sampul h1{font-size:22pt;margin:34px 0 6px}
.pk-sampul table{margin:24px auto 0;text-align:left;font-size:12pt}
.pk-sampul td{padding:2px 10px 2px 0;vertical-align:top}
.pk-sampul h3{margin:34px 0 8px;font-size:13pt;text-align:left}
.pk-sampul ol{text-align:left;font-size:12pt;margin:0;padding-left:22px}
.pk-sampul li{margin:2px 0}
.pk-sampul .tgl{margin-top:30px;font-size:10.5pt;color:#555}`;

  function judulDok() {
    const r = Pk.rec || {};
    return 'Paket Perangkat ' + (r.mapel || '') + ' Kelas ' + (r.kelas || '') + ' Semester ' + SEM_LABEL[Pk.sem] + ' ' + Pk.ta;
  }
  function susun(daftar, denganSampul, semuaDaftar) {
    const r = Pk.rec || {}, tgl = (R().fmtTgl ? R().fmtTgl(new Date()) : new Date().toLocaleDateString('id-ID'));
    const ex = daftar.map(x => Object.assign({ b: x }, ekstrak(x.html)));
    const madrasah = (ex.find(e => e.madrasah) || {}).madrasah || (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) || 'MADRASAH';
    const semuaSoal = ex.every(e => /^(kartu|naskah|kunci|telaah)$/.test(e.b.k));
    let css = CSS_DASAR + '\n@page psampul{size:A4 portrait;margin:20mm}\n', isi = '';
    if (denganSampul) {
      const toc = (semuaDaftar || daftar).map(x => '<li>' + esc(x.n) + '</li>').join('');
      isi += `<section style="page:psampul"><div class="pk-sampul"><div class="kop"><div class="m">${esc(madrasah)}</div></div>
<h1>PAKET PERANGKAT PEMBELAJARAN</h1><div>Tahun Pelajaran ${esc(Pk.ta)} · Semester ${SEM_LABEL[Pk.sem]}</div>
<table><tr><td>Mata Pelajaran</td><td>: ${esc(r.mapel)}</td></tr><tr><td>Kelas</td><td>: ${esc(r.kelas)}</td></tr><tr><td>Guru</td><td>: ${esc(r.guruName || '')}</td></tr></table>
<h3>Daftar Isi</h3><ol>${toc}</ol><div class="tgl">Dicetak ${esc(tgl)}</div></div></section>\n`;
    }
    ex.forEach((e, i) => {
      const kl = 'pks' + i, hal = 'phal' + i;
      css += scopeCss(e.css, kl, hal, semuaSoal) + '\n';
      const nomor = (semuaDaftar || daftar).indexOf(e.b) + 1;
      const pem = Pk.opsi.pemisah ? `<div class="pk-pemisah${e.lanskap ? ' lk' : ''}"><div class="no">BAGIAN ${nomor || i + 1}</div><div class="jd">${esc(e.b.n)}</div><div class="ket">${esc(r.mapel)} · Kelas ${esc(r.kelas)}<br>Semester ${SEM_LABEL[Pk.sem]} · TP ${esc(Pk.ta)}</div></div>` : '';
      isi += `<section class="${kl}" style="page:${hal}">${pem}${e.body}</section>\n`;
    });
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${esc(judulDok())}</title><style>\n${css}</style></head><body>\n${isi}</body></html>`;
  }
  function kelompok(hasil) {
    const g = [];
    hasil.forEach(x => {
      const u = ekstrak(x.html).ukuran; let k = g.find(z => z.ukuran === u);
      if (!k) { k = { ukuran: u, item: [] }; g.push(k); }
      k.item.push(x);
    });
    return g;
  }
  const labelUkuran = u => u.replace(/^a4\b/, 'A4').replace(/^f4\b/, 'F4').replace('portrait', 'potret').replace('landscape', 'lanskap');

  // ---------- Ketersediaan, status, simpanan ----------
  const R = () => window.rpeUtil;
  const infoMandiri = () => (typeof window.modulPaketInfo === 'function' ? window.modulPaketInfo(Pk.id, Pk.rec, Pk.sem, Pk.ta) : null);
  function alasanTidak(b) {
    if (b.mandiri) {   // tidak lewat hub; daftar modul dimuat sendiri oleh modul-ajar.js
      if (typeof window[b.fn] !== 'function') return 'Modul Ajar belum dimuat';
      const inf = infoMandiri();
      return inf && inf.n === 0 ? 'Belum ada modul ajar untuk mapel, kelas, dan semester ini' : '';
    }
    if (!Pk.h.genAda(b.jk, Pk.id)) {
      const x = ((Pk.rec && Pk.rec.docs) || {})[b.jk];
      if (b.jk === 'rpe') return 'Kalender efektif atau JP per pekan belum lengkap';
      return x && x.url ? 'Hanya tautan Drive, belum dibuat di aplikasi' : 'Belum dibuat di aplikasi';
    }
    if (typeof window[b.fn] !== 'function') return b.fn === 'soalPaket' ? 'Modul Soal belum mendukung cetak paket' : 'Modul belum dimuat';
    return '';
  }
  function statusBagian(b) {
    if (b.mandiri) {
      const inf = infoMandiri(); if (!inf) return '';
      const sisa = inf.n - inf.disetujui;
      return inf.n + ' modul · ' + (sisa ? '<span style="color:#b45309;">' + inf.disetujui + ' disetujui Kepala, ' + sisa + ' belum (blok Kepala kosong, tanda tangan basah)</span>' : '<span style="color:#15803d;">✅ semuanya disetujui Kepala (QR tercetak)</span>');
    }
    if (b.jk === 'rpe' || !Pk.h.perluSetuju(b.jk)) return '';
    const x = ((Pk.rec && Pk.rec.docs) || {})[b.jk];
    if (x && x.setuju) return '<span style="color:#15803d;">✅ Disetujui Kepala (QR tercetak)</span>';
    if (Pk.h.menunggu(x, b.jk, Pk.id)) return '<span style="color:#b45309;">⏳ Menunggu persetujuan Kepala</span>';
    return '<span style="color:#b45309;">✍ Belum disetujui · blok Kepala kosong (tanda tangan basah)</span>';
  }
  function muatSimpan() {
    Pk.urut = BAGIAN.map(b => b.k); Pk.cek = {}; BAGIAN.forEach(b => { Pk.cek[b.k] = !b.rahasia; });
    try {
      const o = JSON.parse(localStorage.getItem(KUNCI_SIMPAN()) || 'null'); if (!o) return;
      if (Array.isArray(o.urut)) { const ok = o.urut.filter(k => BY[k]); BAGIAN.forEach((b, i) => { if (ok.indexOf(b.k) < 0) ok.splice((i ? ok.indexOf(BAGIAN[i - 1].k) : -1) + 1, 0, b.k); }); Pk.urut = ok; }
      if (o.cek) Object.keys(o.cek).forEach(k => { if (BY[k]) Pk.cek[k] = !!o.cek[k]; });
      if (o.opsi) ['sampul', 'pemisah', 'pisah'].forEach(k => { if (typeof o.opsi[k] === 'boolean') Pk.opsi[k] = o.opsi[k]; });
    } catch (e) { /* abaikan simpanan rusak */ }
  }
  function simpan() { try { localStorage.setItem(KUNCI_SIMPAN(), JSON.stringify({ urut: Pk.urut, cek: Pk.cek, opsi: Pk.opsi })); } catch (e) { /* penyimpanan penuh/dimatikan */ } }

  // ---------- Tampilan ----------
  function ov() {
    let el = document.getElementById('paketOverlay'); if (el) return el;
    el = document.createElement('div'); el.id = 'paketOverlay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.className = 'pp-modal-overlay'; el.addEventListener('click', klik); el.addEventListener('change', ubah);
    document.body.appendChild(el); return el;
  }
  const btn = (a, t, kelas, extra, k) => `<button type="button" class="btn ${kelas || 'btn-soft'}" style="padding:6px 12px;font-size:12px;${extra || ''}" data-a="${a}"${k ? ' data-k="' + k + '"' : ''}>${t}</button>`;
  function barisPilih(k, i) {
    const b = BY[k], alasan = alasanTidak(b), mati = !!alasan, st = mati ? '' : statusBagian(b);
    const cat = mati ? `<div style="${muted}">${esc(alasan)}</div>` : (b.rahasia ? `<div style="${muted}color:#b45309;">Berisi jawaban. Jangan dicetak untuk dibagikan ke siswa.</div>` : '') + (st ? `<div style="${muted}">${st}</div>` : '');
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;${mati ? 'opacity:.55;' : ''}">
<input type="checkbox" data-f="cek" data-k="${k}" ${Pk.cek[k] && !mati ? 'checked' : ''} ${mati ? 'disabled' : ''} style="margin-top:3px;">
<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:13px;">${esc(b.n)}</div>${cat}</div>
<div style="display:flex;gap:4px;">${btn('naik', '▲', 'btn-soft', 'padding:3px 9px;' + (i === 0 ? 'visibility:hidden;' : ''), k)}${btn('turun', '▼', 'btn-soft', 'padding:3px 9px;' + (i === Pk.urut.length - 1 ? 'visibility:hidden;' : ''), k)}</div></div>`;
  }
  function panelPilih() {
    const jml = Pk.urut.filter(k => Pk.cek[k] && !alasanTidak(BY[k])).length, r = Pk.rec;
    const opsi = (f, t) => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-top:6px;"><input type="checkbox" data-f="${f}" ${Pk.opsi[f] ? 'checked' : ''}> ${t}</label>`;
    return `<div style="font-weight:700;font-size:16px;">📦 Cetak Paket Perangkat</div>
<div style="${muted}margin:2px 0 8px;">${esc(r.mapel)} · Kelas ${esc(r.kelas)} · Semester ${SEM_LABEL[Pk.sem]} · TP ${esc(Pk.ta)}</div>
<div style="font-size:12px;margin-bottom:6px;">Centang bagian yang ikut dicetak, atur urutannya dengan tombol ▲▼. Bagian yang belum bisa dibuat tidak bisa dicentang.</div>
${Pk.urut.map(barisPilih).join('')}
<div style="margin-top:10px;">${opsi('sampul', 'Sampul dan daftar isi di halaman pertama')}${opsi('pemisah', 'Halaman pemisah sebelum tiap bagian')}${opsi('pisah', 'Pisahkan cetakan menurut ukuran/orientasi kertas (pakai bila hasil satu dokumen tidak sesuai)')}</div>
<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">${btn('siapkan', 'Siapkan paket (' + jml + ' bagian)', 'btn-primary', jml ? '' : 'opacity:.5;pointer-events:none;')}${btn('tutup', 'Tutup')}</div>`;
  }
  function panelBangun() {
    return `<div style="font-weight:700;font-size:16px;">📦 Menyiapkan paket...</div><div style="${muted}padding:12px 0;">⏳ ${esc(Pk.info)}</div>`;
  }
  function panelSiap() {
    const gagal = Pk.gagal.length ? `<div style="padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;margin:8px 0;"><b>Bagian ini belum bisa disertakan:</b><ul style="margin:4px 0 0;padding-left:18px;">${Pk.gagal.map(g => `<li><b>${esc(g.n)}</b>: ${esc(g.pesan)}</li>`).join('')}</ul></div>` : '';
    const ringkas = Pk.hasil.map((x, i) => `<li>${esc(x.n)} <span style="${muted}">(${esc(labelUkuran(ekstrak(x.html).ukuran))})</span></li>`).join('');
    const campur = Pk.grup.length > 1;
    const cetak = Pk.opsi.pisah && campur
      ? Pk.grup.map((g, i) => btn('cetak-grup', '🖨 Cetak ' + esc(labelUkuran(g.ukuran)) + ' (' + g.item.length + ' bagian)', 'btn-primary', '', String(i))).join('')
      : btn('cetak', '🖨 Cetak sekarang', 'btn-primary');
    const catatan = campur && !Pk.opsi.pisah ? `<div style="${muted}margin-top:6px;">Paket memuat ukuran/orientasi kertas berbeda. Di Chrome terbaru tiap bagian mengikuti ukurannya sendiri. Bila hasil cetak tidak sesuai, kembali dan centang "Pisahkan cetakan menurut ukuran/orientasi kertas".</div>` : '';
    return `<div style="font-weight:700;font-size:16px;">📦 Paket siap dicetak</div>${gagal}
<ol style="font-size:13px;padding-left:20px;margin:8px 0;">${ringkas || '<li>(tidak ada bagian)</li>'}</ol>${catatan}
<div style="${muted}margin-top:6px;">Di jendela cetak, pilih "Simpan sebagai PDF" bila ingin berkas PDF.</div>
<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">${Pk.hasil.length ? cetak : ''}${btn('kembali', '← Ubah pilihan')}${btn('tutup', 'Tutup')}</div>`;
  }
  function gambar() {
    const el = ov(); const isi = Pk.fase === 'bangun' ? panelBangun() : Pk.fase === 'siap' ? panelSiap() : panelPilih();
    el.innerHTML = `<div style="max-width:640px;margin:0 auto;background:#fff;color:#111;border-radius:12px;padding:16px;">${isi}</div>`;
  }
  function tutup() { const el = document.getElementById('paketOverlay'); if (el) el.remove(); Pk.fase = 'pilih'; Pk.hasil = []; }

  // ---------- Aksi ----------
  function geser(k, d) {
    const i = Pk.urut.indexOf(k), j = i + d; if (i < 0 || j < 0 || j >= Pk.urut.length) return;
    Pk.urut.splice(i, 1); Pk.urut.splice(j, 0, k); simpan(); gambar();
  }
  function siapkan() {
    const pilih = Pk.urut.filter(k => Pk.cek[k] && !alasanTidak(BY[k]));
    if (!pilih.length) return say('Centang minimal satu bagian.', true);
    simpan(); Pk.fase = 'bangun'; Pk.hasil = []; Pk.gagal = []; Pk.info = 'Memulai...'; gambar();
    const sem = Pk.sem, rec = Pk.rec, id = Pk.id, ta = Pk.ta;
    // Berurutan (bukan paralel): tiap modul memakai satu state bersama, jadi harus selesai satu per satu.
    let sudahTanya = false, soalDitolak = '';
    pilih.reduce((p, k) => p.then(() => {
      const b = BY[k]; Pk.info = 'Menyiapkan ' + b.n + '...'; if (Pk.fase === 'bangun') gambar();
      const args = [id, rec, sem, ta].concat(b.a);
      if (b.fn === 'soalPaket') {
        const telaah = b.a[0] === 'telaah';   // telaah tidak menanyakan kelengkapan soal (sama seperti tombol cetak biasa)
        if (soalDitolak && !telaah) { Pk.gagal.push({ n: b.n, pesan: soalDitolak }); return null; }
        args.push({ tanya: !telaah && !sudahTanya }); if (!telaah) sudahTanya = true;   // konfirmasi soal belum lengkap cukup sekali
      }
      return window[b.fn].apply(null, args).then(r => {
        if (!r || !r.html) throw new Error('Dokumen kosong.');
        Pk.hasil.push({ k: k, n: b.n, html: r.html, nama: r.nama || b.n });
      }).catch(e => { const ps = (e && e.message) || String(e); if (b.fn === 'soalPaket' && /^Dibatalkan/.test(ps)) soalDitolak = ps; Pk.gagal.push({ n: b.n, pesan: ps }); });
    }), Promise.resolve()).then(() => {
      if (!document.getElementById('paketOverlay')) return;   // jendela sudah ditutup
      Pk.grup = kelompok(Pk.hasil); Pk.fase = 'siap'; gambar();
    });
  }
  // Jendela cetak dibuka dari klik terbaru (bukan dari rantai async) supaya tidak diblokir pop-up.
  function cetak(daftar, denganSampul) {
    if (!R() || typeof R().keluarkan !== 'function') return say('Modul RPE belum dimuat.', true);
    const html = susun(daftar, denganSampul, Pk.hasil);
    R().keluarkan(html, judulDok(), 'cetak');
  }
  function klik(e) {
    const t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return;
    const a = t.getAttribute('data-a'), k = t.getAttribute('data-k');
    switch (a) {
      case 'tutup': return tutup();
      case 'naik': return geser(k, -1);
      case 'turun': return geser(k, 1);
      case 'siapkan': return siapkan();
      case 'kembali': Pk.fase = 'pilih'; return gambar();
      case 'cetak': return cetak(Pk.hasil, Pk.opsi.sampul);
      case 'cetak-grup': { const g = Pk.grup[+k]; if (g) cetak(g.item, Pk.opsi.sampul && +k === 0); return; }
    }
  }
  function ubah(e) {
    const t = e.target, f = t && t.getAttribute ? t.getAttribute('data-f') : null; if (!f) return;
    if (f === 'cek') Pk.cek[t.getAttribute('data-k')] = !!t.checked; else Pk.opsi[f] = !!t.checked;
    simpan(); gambar();
  }

  // ---------- API publik ----------
  // h = { genAda, appFinal, menunggu, perluSetuju } dari hub.
  window.paketBuka = function (id, rec, sem, ta, h) {
    if (!rec) return say('Data mapel tidak ditemukan.', true);
    if (!window.rpeUtil) return say('Modul RPE belum dimuat (js/perangkat-rpe.js harus dimuat lebih dulu).', true);
    if (!h || typeof h.genAda !== 'function') return say('Hub belum menyediakan data ketersediaan dokumen.', true);
    Pk.id = id; Pk.rec = rec; Pk.sem = sem === 'genap' ? 'genap' : 'ganjil'; Pk.ta = String(ta || ''); Pk.h = h;
    Pk.fase = 'pilih'; Pk.hasil = []; Pk.gagal = []; Pk.grup = []; Pk.opsi = { sampul: true, pemisah: true, pisah: false };
    muatSimpan(); gambar();
    // Muat daftar Modul Ajar di latar belakang supaya panel bisa menampilkan jumlah/status; gagal = tetap bisa dicoba saat Siapkan.
    if (typeof window.modulPaketMuat === 'function') {
      const sesi = Pk.id + '|' + Pk.sem + '|' + Pk.ta;
      window.modulPaketMuat().then(() => { if (document.getElementById('paketOverlay') && Pk.fase === 'pilih' && sesi === Pk.id + '|' + Pk.sem + '|' + Pk.ta) gambar(); }).catch(() => { /* diam */ });
    }
  };
  window.paketUtil = { ekstrak: ekstrak, scopeCss: scopeCss, BAGIAN: BAGIAN };
})();
