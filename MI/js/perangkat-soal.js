/* ============================================================
   SI MAMBA - js/perangkat-soal.js
   Pembuat KARTU SOAL, NASKAH SOAL, KUNCI & PENSKORAN, dan LEMBAR TELAAH siap cetak untuk Asesmen Sumatif Akhir Semester.
   Kertas cetak: F4 (215 x 330 mm) dengan margin tipis; Lembar Telaah F4 mendatar.
   - Slot soal dibuat otomatis dari kisi-kisi yang sudah DISIMPAN (📋 Kisi-kisi): jumlah PG/isian/uraian per TP,
     nomor soal mengikuti kisi-kisi (PG, lalu isian, lalu uraian).
   - "Isi dari bank soal": soal diambil dari bank draf (js/data-soal-semua.js: PAI, Bahasa Arab, dan mapel umum) menurut TP dan bentuk soal; opsi PG diacak
     dan kunci mengikuti. Soal dari bank berstatus DRAF sampai guru mencentang "Sudah saya periksa".
   - Soal tanpa bank (mis. soal bacaan/hafalan di luar bank, atau bila slot melebihi jumlah soal bank) diketik guru sendiri pada slot yang kosong.
   - Gambar soal otomatis: teks soal boleh memuat penanda [[g:tipe;param;...]] (jam, pecahan, diagram, bangun, ikon, wajah, dll.);
     gambar SVG dibuat kode saat soal ditampilkan atau dicetak (tanpa berkas gambar). Lihat blok "Gambar soal otomatis" di bawah.
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

  // ---------- Gambar soal otomatis (SVG dibuat kode, tanpa berkas gambar) ----------
  // Penanda di teks soal: [[g:tipe;param;param]] (tanpa tanda ] atau ; di dalam param). Contoh: [[g:jam;3;30]], [[g:pecahan;3;4]], [[g:ikon;apel;3]].
  // Tipe: jam, pecahan, diagram, piktogram, bangun, ubin, kubus, penggaris, petak, pola, timbangan, garisbil, mataangin, ikon, wajah, warna,
  // sudut, uang, termometer, rangkaian, magnet, daur, rantai, tumbuhan, ruang, jaring, bulan.
  // Gambar dihitung dari parameter yang sama dengan soalnya, jadi isi gambar dan kunci jawaban tidak bisa berbeda.
  const GBR_RE = /\[\[g:([a-z]+)((?:;[^\];]*)*)\]\]/g;
  const gx = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const gn = (v, d, a, b) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
  const GK = '#222';
  const GWARNA = { merah: '#e53935', kuning: '#fdd835', biru: '#1e88e5', hijau: '#43a047', jingga: '#fb8c00', ungu: '#8e24aa', cokelat: '#6d4c41', putih: '#ffffff', hitam: '#212121', abu: '#9e9e9e', merahmuda: '#f48fb1' };
  const gsvg = (w, h, isi) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="max-width:100%;height:auto" font-family="Arial,Helvetica,sans-serif" font-size="12" role="img" aria-label="Gambar soal">${isi}</svg>`;
  const gt = (x, y, s, o) => `<text x="${x}" y="${y}" text-anchor="${(o && o.a) || 'middle'}" font-size="${(o && o.s) || 12}"${o && o.b ? ' font-weight="700"' : ''}${o && o.f ? ` fill="${o.f}"` : ''}>${gx(s)}</text>`;
  const gp = (pts, fill, sw) => `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${fill || '#fff'}" stroke="${GK}" stroke-width="${sw || 2}" stroke-linejoin="round"/>`;
  const gl = (x1, y1, x2, y2, sw, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c || GK}" stroke-width="${sw || 1.5}" stroke-linecap="round"/>`;
  const gr = (x, y, w, h, fill, sw, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill || '#fff'}" stroke="${GK}" stroke-width="${sw || 1.5}"${ex || ''}/>`;
  const gc = (x, y, r, fill, sw) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill || '#fff'}" stroke="${GK}" stroke-width="${sw || 1.5}"/>`;
  const gbintang = (cx, cy, R, fill) => { const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.45 : R, a = i * Math.PI / 5; pts.push([cx + r * Math.sin(a), cy - r * Math.cos(a)]); } return gp(pts, fill || '#fdd835', 1.5); };
  const gpoli = (cx, cy, R, n, rot) => { const pts = []; for (let i = 0; i < n; i++) { const a = (rot || 0) + i * 2 * Math.PI / n; pts.push([cx + R * Math.sin(a), cy - R * Math.cos(a)]); } return pts; };
  const gsudut = (x, y, dx, dy) => `<path d="M${x + dx * 9},${y} L${x + dx * 9},${y + dy * 9} L${x},${y + dy * 9}" fill="none" stroke="${GK}" stroke-width="1.2"/>`;

  // Ikon sederhana (kotak 40x40) untuk kelas rendah.
  const GIKON = {
    apel: `${gc(20, 24, 12, '#e53935')}${gl(20, 12, 22, 6, 2)}<ellipse cx="27" cy="9" rx="5" ry="3" fill="#43a047" stroke="${GK}" stroke-width="1"/>`,
    jeruk: `${gc(20, 22, 13, '#fb8c00')}<ellipse cx="22" cy="8" rx="5" ry="3" fill="#43a047" stroke="${GK}" stroke-width="1"/>`,
    pisang: `<path d="M6,12 Q18,40 35,16 Q22,30 6,12 Z" fill="#fdd835" stroke="${GK}" stroke-width="1.5" stroke-linejoin="round"/>`,
    ikan: `<ellipse cx="17" cy="20" rx="13" ry="8" fill="#64b5f6" stroke="${GK}" stroke-width="1.5"/>${gp([[29, 20], [38, 11], [38, 29]], '#64b5f6', 1.5)}${gc(10, 18, 1.8, '#222', 1)}`,
    kucing: `${gp([[8, 14], [10, 3], [18, 10]], '#ffcc80', 1.5)}${gp([[32, 14], [30, 3], [22, 10]], '#ffcc80', 1.5)}${gc(20, 23, 13, '#ffcc80')}${gc(15, 21, 1.8, '#222', 1)}${gc(25, 21, 1.8, '#222', 1)}${gp([[18, 26], [22, 26], [20, 29]], '#f48fb1', 1)}`,
    ayam: `<ellipse cx="18" cy="26" rx="13" ry="10" fill="#fff59d" stroke="${GK}" stroke-width="1.5"/>${gc(28, 13, 7, '#fff59d')}${gp([[34, 13], [39, 15], [34, 17]], '#fb8c00', 1)}${gc(30, 11, 1.5, '#222', 1)}${gc(27, 6, 3, '#e53935', 1)}${gl(15, 36, 15, 40, 1.5)}${gl(22, 36, 22, 40, 1.5)}`,
    bunga: `${gl(20, 20, 20, 38, 2.5, '#43a047')}${[0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5; return gc(20 + 9 * Math.sin(a), 15 - 9 * Math.cos(a), 5.5, '#f48fb1', 1.2); }).join('')}${gc(20, 15, 5, '#fdd835', 1.2)}`,
    pohon: `${gr(17, 24, 6, 14, '#8d6e63', 1.5)}${gc(20, 16, 13, '#66bb6a')}`,
    rumah: `${gr(7, 18, 26, 20, '#fff3c4', 1.5)}${gp([[3, 19], [20, 4], [37, 19]], '#e57373', 1.5)}${gr(16, 26, 8, 12, '#8d6e63', 1.2)}`,
    bintang: gbintang(20, 21, 17, '#fdd835'),
    hati: `<path d="M20,35 C4,24 4,10 13,8 C17,7 20,10 20,13 C20,10 23,7 27,8 C36,10 36,24 20,35 Z" fill="#e53935" stroke="${GK}" stroke-width="1.5" stroke-linejoin="round"/>`,
    matahari: `${[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return gl((20 + 12 * Math.sin(a)).toFixed(1), (20 - 12 * Math.cos(a)).toFixed(1), (20 + 18 * Math.sin(a)).toFixed(1), (20 - 18 * Math.cos(a)).toFixed(1), 2, '#fb8c00'); }).join('')}${gc(20, 20, 9, '#fdd835')}`,
    bola: `${gc(20, 20, 16, '#fff')}${gp(gpoli(20, 20, 6, 5, 0), '#444', 1)}${[0, 1, 2, 3, 4].map(i => { const a = i * 2 * Math.PI / 5; return gl((20 + 6 * Math.sin(a)).toFixed(1), (20 - 6 * Math.cos(a)).toFixed(1), (20 + 15 * Math.sin(a)).toFixed(1), (20 - 15 * Math.cos(a)).toFixed(1), 1.2); }).join('')}`,
    buku: `${gr(6, 6, 28, 28, '#64b5f6', 1.5)}${gr(9, 9, 22, 22, '#fff', 1)}${gl(13, 15, 27, 15, 1)}${gl(13, 20, 27, 20, 1)}${gl(13, 25, 22, 25, 1)}`,
    pensil: `${gp([[6, 30], [10, 34], [4, 36]], '#ffcc80', 1)}${gp([[10, 34], [6, 30], [28, 8], [32, 12]], '#fdd835', 1.5)}${gp([[28, 8], [32, 12], [36, 8], [32, 4]], '#f48fb1', 1.2)}`,
    mobil: `${gp([[4, 24], [8, 14], [30, 14], [36, 24]], '#e57373', 1.5)}${gr(2, 22, 36, 9, '#e57373', 1.5)}${gc(11, 32, 4.5, '#444', 1.2)}${gc(29, 32, 4.5, '#444', 1.2)}${gr(11, 16, 7, 6, '#bbdefb', 1)}${gr(21, 16, 7, 6, '#bbdefb', 1)}`,
    perahu: `<path d="M3,26 L37,26 L30,36 L10,36 Z" fill="#8d6e63" stroke="${GK}" stroke-width="1.5" stroke-linejoin="round"/>${gl(20, 26, 20, 4, 2)}${gp([[21, 5], [21, 23], [34, 23]], '#fff', 1.5)}`,
    balon: `<ellipse cx="20" cy="15" rx="11" ry="13" fill="#e53935" stroke="${GK}" stroke-width="1.5"/>${gp([[17, 28], [23, 28], [20, 31]], '#e53935', 1)}${gl(20, 31, 20, 39, 1.2)}`,
    rumput: `<path d="M8,36 Q10,22 12,10 M16,36 Q18,20 22,6 M24,36 Q26,24 30,12 M31,36 Q32,28 35,18" fill="none" stroke="#2e7d32" stroke-width="3" stroke-linecap="round"/>${gl(4, 37, 37, 37, 2, '#8d6e63')}`,
    belalang: `<ellipse cx="18" cy="23" rx="12" ry="5" fill="#8bc34a" stroke="${GK}" stroke-width="1.5"/>${gc(31, 19, 4.5, '#8bc34a', 1.5)}${gc(32, 18, 1, '#222', 1)}<path d="M12,25 L6,12 L14,30 M18,25 L16,34 M24,25 L26,34" fill="none" stroke="${GK}" stroke-width="1.8" stroke-linecap="round"/>${gl(33, 15, 38, 8, 1.2)}`,
    katak: `<ellipse cx="20" cy="27" rx="14" ry="9" fill="#66bb6a" stroke="${GK}" stroke-width="1.5"/>${gc(12, 16, 5.5, '#fff', 1.5)}${gc(28, 16, 5.5, '#fff', 1.5)}${gc(12, 16, 2, '#222', 1)}${gc(28, 16, 2, '#222', 1)}<path d="M12,28 Q20,34 28,28" fill="none" stroke="${GK}" stroke-width="1.5"/>`,
    ular: `<path d="M5,30 Q12,8 20,22 T35,12" fill="none" stroke="#7cb342" stroke-width="7" stroke-linecap="round"/>${gc(35, 12, 5, '#7cb342', 1.5)}${gc(36, 10.5, 1, '#222', 1)}${gl(39, 12, 40, 12, 1.2, '#e53935')}`,
    elang: `${gp([[20, 17], [2, 8], [7, 24], [20, 25]], '#8d6e63', 1.5)}${gp([[20, 17], [38, 8], [33, 24], [20, 25]], '#8d6e63', 1.5)}<ellipse cx="20" cy="26" rx="6" ry="9" fill="#a1887f" stroke="${GK}" stroke-width="1.5"/>${gc(20, 14, 5, '#fff', 1.5)}${gp([[18, 15], [22, 15], [20, 20]], '#fdd835', 1)}${gc(18, 13, 1, '#222', 1)}${gc(22, 13, 1, '#222', 1)}`,
    tikus: `<ellipse cx="17" cy="26" rx="12" ry="8" fill="#bdbdbd" stroke="${GK}" stroke-width="1.5"/>${gc(30, 24, 6, '#bdbdbd', 1.5)}${gc(29, 17, 3, '#f48fb1', 1.2)}${gc(33, 17, 3, '#f48fb1', 1.2)}${gc(33, 24, 1, '#222', 1)}<path d="M5,28 Q-2,20 3,14" fill="none" stroke="${GK}" stroke-width="1.5"/>`,
    telurkupu: `<ellipse cx="20" cy="26" rx="17" ry="8" fill="#81c784" stroke="${GK}" stroke-width="1.5"/>${gc(12, 21, 3, '#fff', 1)}${gc(20, 19, 3, '#fff', 1)}${gc(28, 21, 3, '#fff', 1)}${gc(16, 25, 3, '#fff', 1)}${gc(25, 25, 3, '#fff', 1)}`,
    ulat: `${[8, 15, 22, 29].map(x => gc(x, 24, 5.5, '#9ccc65', 1.5)).join('')}${gc(35, 22, 5.5, '#fb8c00', 1.5)}${gc(36, 20.5, 1, '#222', 1)}${[8, 15, 22, 29].map(x => gl(x, 29, x, 33, 1.5)).join('')}`,
    kepompong: `${gl(20, 3, 20, 10, 1.5)}<ellipse cx="20" cy="24" rx="8" ry="14" fill="#a1887f" stroke="${GK}" stroke-width="1.5"/>${gl(13, 20, 27, 20, 1)}${gl(12, 27, 28, 27, 1)}`,
    kupu: `<ellipse cx="11" cy="14" rx="9" ry="8" fill="#ffb74d" stroke="${GK}" stroke-width="1.5"/><ellipse cx="29" cy="14" rx="9" ry="8" fill="#ffb74d" stroke="${GK}" stroke-width="1.5"/><ellipse cx="13" cy="27" rx="7" ry="6" fill="#ffd54f" stroke="${GK}" stroke-width="1.5"/><ellipse cx="27" cy="27" rx="7" ry="6" fill="#ffd54f" stroke="${GK}" stroke-width="1.5"/><rect x="18" y="8" width="4" height="26" rx="2" fill="#5d4037"/>${gl(19, 8, 15, 2, 1.2)}${gl(21, 8, 25, 2, 1.2)}`,
    telurkatak: `${[[12, 14], [24, 12], [30, 22], [18, 24], [10, 28], [26, 32]].map(z => gc(z[0], z[1], 6, 'rgba(200,230,201,0.8)', 1.2) + gc(z[0], z[1], 2, '#263238', 1)).join('')}`,
    berudu: `<ellipse cx="14" cy="20" rx="9" ry="7" fill="#37474f" stroke="${GK}" stroke-width="1.5"/><path d="M22,20 Q30,10 38,20 Q30,28 22,20 Z" fill="#78909c" stroke="${GK}" stroke-width="1.2"/>${gc(10, 18, 1.3, '#fff', 0.5)}`,
    katakmuda: `<ellipse cx="18" cy="22" rx="10" ry="7" fill="#66bb6a" stroke="${GK}" stroke-width="1.5"/>${gc(12, 15, 3, '#fff', 1.2)}${gc(22, 15, 3, '#fff', 1.2)}<path d="M26,24 Q34,24 36,30 M10,28 L4,34 M20,29 L22,35" fill="none" stroke="#2e7d32" stroke-width="2.5" stroke-linecap="round"/>`
  };
  const gikon = (nama, x, y, k) => GIKON[nama] ? `<g transform="translate(${x},${y}) scale(${k || 1})">${GIKON[nama]}</g>` : '';

  const GBR = {
    jam(p) {
      const h = gn(p[0], 12, 0, 23), m = gn(p[1], 0, 0, 59), cx = 80, cy = 80; let s = gc(cx, cy, 72, '#fff', 3);
      for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; s += gt((cx + 58 * Math.sin(a)).toFixed(1), (cy - 58 * Math.cos(a) + 4.5).toFixed(1), String(i), { s: 14, b: 1 }); }
      for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, r1 = i % 5 ? 67 : 64; s += gl((cx + r1 * Math.sin(a)).toFixed(1), (cy - r1 * Math.cos(a)).toFixed(1), (cx + 70 * Math.sin(a)).toFixed(1), (cy - 70 * Math.cos(a)).toFixed(1), i % 5 ? 0.8 : 1.6); }
      const ah = ((h % 12) * 30 + m * 0.5) * Math.PI / 180, am = m * 6 * Math.PI / 180;
      s += gl(cx, cy, (cx + 36 * Math.sin(ah)).toFixed(1), (cy - 36 * Math.cos(ah)).toFixed(1), 5) + gl(cx, cy, (cx + 54 * Math.sin(am)).toFixed(1), (cy - 54 * Math.cos(am)).toFixed(1), 3) + gc(cx, cy, 4, GK, 1);
      return gsvg(160, 160, s);
    },
    pecahan(p) {
      const d = Math.round(gn(p[1], 2, 1, 12)), n = Math.round(gn(p[0], 1, 0, d)), bt = p[2] === 'batang', W = 200;
      if (bt) { let s = ''; for (let i = 0; i < d; i++) s += gr(5 + i * (W / d), 10, W / d, 40, i < n ? '#90caf9' : '#fff', 2); return gsvg(W + 10, 60, s); }
      const cx = 70, cy = 70, r = 62; let s = '';
      if (d === 1) s = gc(cx, cy, r, n ? '#90caf9' : '#fff', 2);
      else for (let i = 0; i < d; i++) { const a1 = i * 2 * Math.PI / d, a2 = (i + 1) * 2 * Math.PI / d; s += `<path d="M${cx},${cy} L${(cx + r * Math.sin(a1)).toFixed(1)},${(cy - r * Math.cos(a1)).toFixed(1)} A${r},${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${(cx + r * Math.sin(a2)).toFixed(1)},${(cy - r * Math.cos(a2)).toFixed(1)} Z" fill="${i < n ? '#90caf9' : '#fff'}" stroke="${GK}" stroke-width="2" stroke-linejoin="round"/>`; }
      return gsvg(140, 140, s);
    },
    diagram(p) {
      const it = p.map(z => { const a = z.split(':'); return [a[0] || '', gn(a[1], 0, 0, 99)]; }).slice(0, 6); if (!it.length) return '';
      const mx = Math.max.apply(null, it.map(z => z[1])), st = mx <= 10 ? 1 : mx <= 20 ? 2 : mx <= 50 ? 5 : 10, top = Math.ceil(mx / st) * st || st, W = 50 + it.length * 48, H = 170, y0 = 135, ph = 110;
      let s = '';
      for (let v = 0; v <= top; v += st) { const y = y0 - v / top * ph; s += gl(36, y, W - 6, y, 0.7, '#bbb') + gt(30, y + 4, String(v), { a: 'end', s: 10 }); }
      s += gl(36, y0 - ph, 36, y0, 1.5) + gl(36, y0, W - 6, y0, 1.5);
      it.forEach((z, i) => { const h = z[1] / top * ph, x = 46 + i * 48; s += gr(x, y0 - h, 32, h, '#90caf9', 1.5) + gt(x + 16, y0 + 15, z[0].slice(0, 7), { s: 10 }); });
      return gsvg(W, H, s);
    },
    piktogram(p) {
      const ket = p.filter(z => z[0] === '='), it = p.filter(z => z[0] !== '=').slice(0, 6).map(z => { const a = z.split(':'); return [a[0] || '', Math.round(gn(a[1], 0, 0, 12))]; }); if (!it.length) return '';
      let s = '', y = 16;
      it.forEach(z => { s += gt(4, y + 5, z[0].slice(0, 8), { a: 'start', s: 12 }); for (let i = 0; i < z[1]; i++) s += gc(88 + i * 20, y, 8, '#ffe082', 1.2) + gc(85 + i * 20, y - 2, 1, GK, 1) + gc(91 + i * 20, y - 2, 1, GK, 1) + `<path d="M${84 + i * 20},${y + 2} Q${88 + i * 20},${y + 6} ${92 + i * 20},${y + 2}" fill="none" stroke="${GK}" stroke-width="1"/>`; y += 26; });
      if (ket.length) s += gc(8, y + 2, 7, '#ffe082', 1.2) + gt(20, y + 6, '= ' + ket[0].slice(1).trim(), { a: 'start', s: 11 });
      return gsvg(88 + 12 * 20 + 6, y + 14, s);
    },
    bangun(p) {
      const n = p[0], a = p[1], b = p[2], T = (x, y, s) => s ? gt(x, y, s, { s: 12, b: 1 }) : ''; let s;
      if (n === 'persegi') s = gr(35, 12, 90, 90, '#fff3c4', 2) + gsudut(35, 12, 1, 1) + gsudut(125, 12, -1, 1) + gsudut(35, 102, 1, -1) + gsudut(125, 102, -1, -1) + T(80, 118, a);
      else if (n === 'persegipanjang') s = gr(15, 14, 130, 80, '#fff3c4', 2) + gsudut(15, 14, 1, 1) + gsudut(145, 14, -1, 1) + gsudut(15, 94, 1, -1) + gsudut(145, 94, -1, -1) + T(80, 110, a) + (b ? `<text x="152" y="58" font-size="12" font-weight="700">${gx(b)}</text>` : '');
      else if (n === 'siku') s = gp([[25, 14], [25, 98], [140, 98]], '#fff3c4', 2) + gsudut(25, 98, 1, -1) + T(82, 113, a) + (b ? `<text x="6" y="60" font-size="12" font-weight="700">${gx(b)}</text>` : '');
      else if (n === 'segitiga') s = gp([[80, 12], [20, 98], [140, 98]], '#fff3c4', 2) + T(80, 113, a);
      else if (n === 'lingkaran') s = gc(80, 58, 46, '#fff3c4', 2) + (a ? gl(80, 58, 126, 58, 2) + gc(80, 58, 2.5, GK, 1) + T(103, 52, a) : '');
      else if (n === 'segilima') s = gp(gpoli(80, 60, 50, 5, 0), '#fff3c4', 2);
      else if (n === 'segienam') s = gp(gpoli(80, 58, 50, 6, Math.PI / 6), '#fff3c4', 2);
      else if (n === 'belahketupat') s = gp([[80, 8], [135, 58], [80, 108], [25, 58]], '#fff3c4', 2);
      else if (n === 'jajargenjang') s = gp([[45, 18], [150, 18], [115, 98], [10, 98]], '#fff3c4', 2);
      else if (n === 'trapesium') s = gp([[55, 18], [105, 18], [150, 98], [10, 98]], '#fff3c4', 2);
      else if (n === 'layang') s = gp([[80, 6], [120, 40], [80, 112], [40, 40]], '#fff3c4', 2);
      else return '';
      return gsvg(n === 'persegipanjang' ? 196 : 170, 126, s);
    },
    ubin(p) {
      const r = Math.round(gn(p[0], 3, 1, 10)), c = Math.round(gn(p[1], 4, 1, 12)), k = 24; let s = '';
      for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) s += gr(5 + j * k, 5 + i * k, k, k, '#bbdefb', 1.3);
      return gsvg(c * k + 10, r * k + 10, s);
    },
    kubus(p) {
      const a = Math.round(gn(p[0], 2, 1, 6)), l = Math.round(gn(p[1], 2, 1, 6)), t = Math.round(gn(p[2], 2, 1, 6)), sz = 22, ax = sz * 0.866, by = sz * 0.5, h = sz, cell = [];
      for (let k = 0; k < t; k++) for (let i = 0; i < a; i++) for (let j = 0; j < l; j++) cell.push([i, j, k]);
      cell.sort((u, v) => (u[0] + u[1]) - (v[0] + v[1]) || u[2] - v[2]);
      const px = c => (c[0] - c[1]) * ax, py = c => (c[0] + c[1]) * by - c[2] * h;
      const minX = -(l - 1) * ax - ax, maxX = (a - 1) * ax + ax, minY = -(t - 1) * h - h - 2 * by + 0, maxY = (a - 1 + l - 1) * by, ox = 6 - minX, oy = 6 - minY; let s = '';
      cell.forEach(c => { const X = px(c) + ox, Y = py(c) + oy;
        s += gp([[X, Y], [X + ax, Y - by], [X + ax, Y - by - h], [X, Y - h]], '#90caf9', 1.2) + gp([[X, Y], [X - ax, Y - by], [X - ax, Y - by - h], [X, Y - h]], '#64b5f6', 1.2) + gp([[X, Y - h], [X + ax, Y - by - h], [X, Y - 2 * by - h], [X - ax, Y - by - h]], '#bbdefb', 1.2); });
      return gsvg(Math.ceil(maxX - minX + 12), Math.ceil(maxY - minY + 12), s);
    },
    penggaris(p) {
      const len = gn(p[0], 5, 0.5, 15), k = 18, x0 = 22; let s = gr(8, 52, 15 * k + 28, 36, '#fff8e1', 1.5) + `<rect x="${x0}" y="14" width="${(len * k).toFixed(1)}" height="22" fill="#ffe082" stroke="${GK}" stroke-width="1.5"/>${gp([[x0 + len * k, 14], [x0 + len * k + 10, 25], [x0 + len * k, 36]], '#f8bbd0', 1.5)}`;
      for (let i = 0; i <= 30; i++) { const x = x0 + i * k / 2, big = i % 2 === 0; s += gl(x, 52, x, big ? 68 : 61, big ? 1.4 : 1); if (big && i / 2 <= 15) s += gt(x, 82, String(i / 2), { s: 10 }); }
      return gsvg(15 * k + 44, 96, s + gt(x0 + 15 * k + 14, 86, 'cm', { s: 9, a: 'end' }));
    },
    petak(p) {
      const kol = Math.round(gn(p[0], 4, 2, 8)), bar = Math.round(gn(p[1], 4, 2, 8)), k = 38; let s = '';
      for (let r = 0; r < bar; r++) for (let c = 0; c < kol; c++) s += gr(26 + c * k, 6 + r * k, k, k, '#fff', 1.2);
      for (let c = 0; c < kol; c++) s += gt(26 + c * k + k / 2, 6 + bar * k + 16, String.fromCharCode(65 + c), { s: 12, b: 1 });
      for (let r = 0; r < bar; r++) s += gt(14, 6 + (bar - 1 - r) * k + k / 2 + 4, String(r + 1), { s: 12, b: 1 });
      p.slice(2).forEach(z => { const m = /^([A-H])(\d+):(.*)$/.exec(z); if (!m) return; const c = m[1].charCodeAt(0) - 65, r = parseInt(m[2], 10) - 1; if (c >= kol || r < 0 || r >= bar) return; s += gr(26 + c * k + 2, 6 + (bar - 1 - r) * k + 2, k - 4, k - 4, '#ffe082', 1.2) + gt(26 + c * k + k / 2, 6 + (bar - 1 - r) * k + k / 2 + 4, m[3].slice(0, 6), { s: 9 }); });
      return gsvg(26 + kol * k + 8, 6 + bar * k + 24, s);
    },
    pola(p) {
      const it = p.slice(0, 10), k = 38; let s = '';
      it.forEach((z, i) => { const x = 4 + i * k, cx = x + k / 2 - 2, cy = 22;
        if (z === 'k') s += gr(cx - 12, cy - 12, 24, 24, '#ffcc80', 1.5);
        else if (z === 'o') s += gc(cx, cy, 13, '#90caf9', 1.5);
        else if (z === 't') s += gp([[cx, cy - 14], [cx - 14, cy + 11], [cx + 14, cy + 11]], '#a5d6a7', 1.5);
        else if (z === 'b') s += gbintang(cx, cy + 1, 15, '#fdd835');
        else if (z === 'h') s += gp([[cx, cy + 12], [cx - 14, cy - 2], [cx - 8, cy - 11], [cx, cy - 5], [cx + 8, cy - 11], [cx + 14, cy - 2]], '#ef9a9a', 1.5);
        else if (z === '?') s += gr(cx - 12, cy - 12, 24, 24, '#fff', 1.5, ' stroke-dasharray="4 3"') + gt(cx, cy + 6, '?', { s: 18, b: 1 }); });
      return gsvg(it.length * k + 8, 46, s);
    },
    timbangan(p) {
      const tr = p[2], y1 = tr === 'kiri' ? 56 : tr === 'kanan' ? 32 : 44, y2 = tr === 'kiri' ? 32 : tr === 'kanan' ? 56 : 44;
      let s = gp([[100, 150], [78, 150], [100, 52]], '#bbb', 1.5) + gp([[100, 150], [122, 150], [100, 52]], '#bbb', 1.5) + gl(100, 52, 100, 150, 3) + gl(25, y1, 175, y2, 4);
      [[25, y1, p[0]], [175, y2, p[1]]].forEach(z => { s += gl(z[0], z[1], z[0] - 22, z[1] + 38, 1.2) + gl(z[0], z[1], z[0] + 22, z[1] + 38, 1.2) + `<path d="M${z[0] - 30},${z[1] + 38} L${z[0] + 30},${z[1] + 38} Q${z[0]},${z[1] + 56} ${z[0] - 30},${z[1] + 38} Z" fill="#fff3c4" stroke="${GK}" stroke-width="1.5"/>` + gt(z[0], z[1] + 34, String(z[2] || '').slice(0, 9), { s: 11, b: 1 }); });
      return gsvg(200, 160, s + gc(100, 52, 5, GK, 1));
    },
    garisbil(p) {
      const a = Math.round(gn(p[0], 0, -50, 99)), b = Math.round(gn(p[1], 10, a + 1, a + 20)), t = p[2] === undefined || p[2] === '' ? null : Math.round(gn(p[2], a, a, b)), nm = p[3] || '', tampil = p[4] === 'tampil', k = Math.min(30, 300 / (b - a)), x0 = 20; let s = gl(x0 - 8, 50, x0 + (b - a) * k + 8, 50, 2) + gp([[x0 + (b - a) * k + 12, 50], [x0 + (b - a) * k + 4, 46], [x0 + (b - a) * k + 4, 54]], GK, 1);
      for (let v = a; v <= b; v++) { const x = x0 + (v - a) * k; s += gl(x, 44, x, 56, 1.5); if (!(t === v && !tampil)) s += gt(x, 72, String(v), { s: 12 }); }
      if (t !== null) { const x = x0 + (t - a) * k; s += gc(x, 50, 5, '#e53935', 1.2) + gl(x, 44, x, 26, 1.2, '#e53935') + gt(x, 20, nm || '?', { s: 14, b: 1, f: '#e53935' }); }
      return gsvg(Math.ceil(x0 + (b - a) * k + 30), 84, s);
    },
    mataangin(p) {
      const D = { U: 0, TL: 45, T: 90, TG: 135, S: 180, BD: 225, B: 270, BL: 315 }, ar = String(p[0] || '').toUpperCase(), cx = 90, cy = 90; let s = gc(cx, cy, 62, '#fff', 2);
      Object.keys(D).forEach(k => { const a = D[k] * Math.PI / 180, big = k.length === 1, R = big ? 76 : 70; s += gl((cx + 56 * Math.sin(a)).toFixed(1), (cy - 56 * Math.cos(a)).toFixed(1), (cx + 62 * Math.sin(a)).toFixed(1), (cy - 62 * Math.cos(a)).toFixed(1), big ? 2 : 1.2) + gt((cx + R * Math.sin(a)).toFixed(1), (cy - R * Math.cos(a) + 4).toFixed(1), k, { s: big ? 14 : 10, b: big }); });
      if (D[ar] !== undefined) { const a = D[ar] * Math.PI / 180, ex = cx + 46 * Math.sin(a), ey = cy - 46 * Math.cos(a); s += gl(cx, cy, ex.toFixed(1), ey.toFixed(1), 4, '#e53935') + gp([[ex + 10 * Math.sin(a), ey - 10 * Math.cos(a)], [ex + 5 * Math.cos(a), ey + 5 * Math.sin(a)], [ex - 5 * Math.cos(a), ey - 5 * Math.sin(a)]], '#e53935', 1); }
      return gsvg(180, 180, s + gc(cx, cy, 4, GK, 1));
    },
    ikon(p) {
      const it = []; for (let i = 0; i + 1 < p.length && it.length < 4; i += 2) if (GIKON[p[i]]) it.push([p[i], Math.round(gn(p[i + 1], 1, 1, 12))]); if (!it.length) return '';
      let s = '', y = 2; it.forEach(z => { for (let i = 0; i < z[1]; i++) s += gikon(z[0], 4 + i * 34, y, 0.8); y += 36; });
      return gsvg(4 + Math.max.apply(null, it.map(z => z[1])) * 34 + 4, y + 2, s);
    },
    wajah(p) {
      const e = p[0], br = '#222'; let s = gc(40, 40, 34, '#ffe082', 2.5), m = '', b = '';
      if (e === 'senang') { m = `<path d="M24,48 Q40,64 56,48" fill="none" stroke="${br}" stroke-width="3" stroke-linecap="round"/>`; }
      else if (e === 'sedih') { m = `<path d="M26,58 Q40,44 54,58" fill="none" stroke="${br}" stroke-width="3" stroke-linecap="round"/>`; b = `<path d="M25,26 L35,30 M55,26 L45,30" stroke="${br}" stroke-width="2.5" stroke-linecap="round"/>`; }
      else if (e === 'marah') { m = `<path d="M27,56 Q40,48 53,56" fill="none" stroke="${br}" stroke-width="3" stroke-linecap="round"/>`; b = `<path d="M22,24 L36,31 M58,24 L44,31" stroke="${br}" stroke-width="3.5" stroke-linecap="round"/>`; s = gc(40, 40, 34, '#ef9a9a', 2.5); }
      else if (e === 'takut') { m = `<ellipse cx="40" cy="55" rx="7" ry="5" fill="#fff" stroke="${br}" stroke-width="2.5"/>`; b = `<path d="M24,22 L35,26 M56,22 L45,26" stroke="${br}" stroke-width="2.5" stroke-linecap="round"/>`; }
      else if (e === 'terkejut') { m = `<ellipse cx="40" cy="56" rx="6" ry="8" fill="#fff" stroke="${br}" stroke-width="2.5"/>`; b = `<path d="M23,21 Q30,16 37,21 M43,21 Q50,16 57,21" fill="none" stroke="${br}" stroke-width="2.5" stroke-linecap="round"/>`; }
      else return '';
      const mata = e === 'terkejut' || e === 'takut' ? gc(30, 34, 4.5, '#fff', 2) + gc(50, 34, 4.5, '#fff', 2) + gc(30, 34, 2, br, 1) + gc(50, 34, 2, br, 1) : gc(30, 36, 3, br, 1) + gc(50, 36, 3, br, 1);
      return gsvg(80, 80, s + b + mata + m);
    },
    sudut(p) {
      const d = gn(p[0], 60, 5, 175), r = d * Math.PI / 180, L = 110, vy = 104, vx = 16 + (Math.cos(r) < 0 ? -L * Math.cos(r) : 0); let s = gl(vx, vy, vx + L, vy, 3) + gl(vx, vy, (vx + L * Math.cos(r)).toFixed(1), (vy - L * Math.sin(r)).toFixed(1), 3) + gc(vx, vy, 3, GK, 1);
      if (Math.round(d) === 90) s += gsudut(vx, vy, 1, -1);
      else s += `<path d="M${vx + 30},${vy} A30,30 0 0 0 ${(vx + 30 * Math.cos(r)).toFixed(1)},${(vy - 30 * Math.sin(r)).toFixed(1)}" fill="none" stroke="#e53935" stroke-width="2"/>`;
      if (p[1] === 'tampil') s += gt(vx + 48, vy - 8, Math.round(d) + '°', { s: 12, b: 1 });
      return gsvg(Math.ceil(vx + L + 12), 120, s);
    },
    uang(p) {
      const W = { 2000: '#bdbdbd', 5000: '#bcaaa4', 10000: '#b39ddb', 20000: '#a5d6a7', 50000: '#90caf9', 100000: '#ef9a9a' }, rp = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), it = p.slice(0, 8).map(z => Math.round(gn(z, 0, 0, 100000))).filter(v => v > 0); if (!it.length) return '';
      let s = '', x = 4; it.forEach(v => { if (v <= 1000) { s += gc(x + 18, 24, 18, v === 1000 ? '#e0e0e0' : '#ffd54f', 2) + gc(x + 18, 24, 13, 'none', 1) + gt(x + 18, 28, rp(v), { s: 11, b: 1 }); x += 42; } else { s += gr(x, 8, 70, 36, W[v] || '#eee', 2) + gr(x + 4, 12, 62, 28, 'none', 1) + gt(x + 35, 22, 'Rp', { s: 9 }) + gt(x + 35, 36, rp(v), { s: 13, b: 1 }); x += 76; } });
      return gsvg(x + 2, 52, s);
    },
    termometer(p) {
      const v = gn(p[0], 50, 0, 100); let s = gr(48, 10, 14, 150, '#fff', 2, ' rx="7"') + gc(55, 172, 15, '#e53935', 2) + `<rect x="51.5" y="${(160 - v * 1.4).toFixed(1)}" width="7" height="${(v * 1.4 + 12).toFixed(1)}" fill="#e53935"/>`;
      for (let t = 0; t <= 100; t += 10) { const y = 160 - t * 1.4; s += gl(64, y, t % 50 === 0 ? 76 : 71, y, 1.5) + gt(80, y + 4, String(t), { a: 'start', s: 10 }); }
      return gsvg(110, 196, s + gt(30, 14, '°C', { s: 11, b: 1 }));
    },
    rangkaian(p) {
      const tutup = p[0] !== 'buka'; let s = gl(30, 30, 80, 30, 2.5) + gl(120, 30, 170, 30, 2.5) + gl(170, 30, 170, 100, 2.5) + gl(170, 100, 125, 100, 2.5) + gl(75, 100, 30, 100, 2.5) + gl(30, 100, 30, 72, 2.5) + gl(30, 58, 30, 30, 2.5);
      s += gl(18, 72, 42, 72, 4) + gl(24, 58, 36, 58, 2.5) + gt(52, 70, '+', { s: 12, a: 'start', b: 1 }) + gt(52, 64, '', { s: 1 });
      s += gc(80, 30, 3, GK, 1) + gc(120, 30, 3, GK, 1) + (tutup ? gl(80, 30, 120, 30, 3) : gl(80, 30, 112, 12, 3));
      s += gc(100, 100, 18, tutup ? '#fff59d' : '#fff', 2) + gl(88, 88, 112, 112, 1.5) + gl(112, 88, 88, 112, 1.5);
      if (tutup) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; s += gl((100 + 23 * Math.sin(a)).toFixed(1), (100 - 23 * Math.cos(a)).toFixed(1), (100 + 31 * Math.sin(a)).toFixed(1), (100 - 31 * Math.cos(a)).toFixed(1), 1.8, '#fb8c00'); }
      return gsvg(200, 140, s + gt(100, 58, 'saklar', { s: 10 }) + gt(30, 112, 'baterai', { s: 10 }));
    },
    magnet(p) {
      const bar = (x, o) => { const a = o[0] === 'U' ? ['#ef5350', 'U', '#42a5f5', 'S'] : ['#42a5f5', 'S', '#ef5350', 'U']; return gr(x, 20, 36, 30, a[0], 2) + gr(x + 36, 20, 36, 30, a[2], 2) + gt(x + 18, 41, a[1], { s: 16, b: 1 }) + gt(x + 54, 41, a[3], { s: 16, b: 1 }); };
      return gsvg(200, 70, bar(6, String(p[0] || 'US')) + bar(122, String(p[1] || 'US')));
    },
    daur(p) {
      const D = { kupu: ['telurkupu', 'ulat', 'kepompong', 'kupu'], katak: ['telurkatak', 'berudu', 'katakmuda', 'katak'] }[p[0]]; if (!D) return ''; const h = Math.round(gn(p[1], 0, 0, 4)); let s = '';
      D.forEach((n, i) => { const x = 6 + i * 70; s += h === i + 1 ? gr(x + 4, 6, 40, 40, '#fff', 1.5, ' stroke-dasharray="4 3"') + gt(x + 24, 36, '?', { s: 24, b: 1 }) : gikon(n, x, 4, 1.15); if (i < 3) s += gl(x + 50, 26, x + 64, 26, 2) + gp([[x + 66, 26], [x + 59, 22], [x + 59, 30]], GK, 1); });
      return gsvg(290, 54, s);
    },
    rantai(p) {
      const it = p.slice(0, 5).filter(z => z === '?' || GIKON[z]); if (it.length < 2) return ''; let s = '';
      it.forEach((n, i) => { const x = 4 + i * 62; s += n === '?' ? gr(x + 2, 4, 40, 40, '#fff', 1.5, ' stroke-dasharray="4 3"') + gt(x + 22, 34, '?', { s: 24, b: 1 }) : gikon(n, x, 2, 1.15); if (i < it.length - 1) s += gl(x + 48, 25, x + 58, 25, 2) + gp([[x + 60, 25], [x + 54, 21], [x + 54, 29]], GK, 1); });
      return gsvg(4 + it.length * 62, 52, s);
    },
    tumbuhan(p) {
      const B = { akar: [60, 142], batang: [60, 90], daun: [74, 80], bunga: [60, 32] }, t = B[p[0]]; let s = gr(8, 112, 100, 36, '#d7ccc8', 1.5) + gl(8, 112, 108, 112, 3, '#6d4c41');
      s += `<path d="M60,114 Q50,130 40,142 M60,114 L60,146 M60,114 Q70,130 82,142" fill="none" stroke="#8d6e63" stroke-width="3" stroke-linecap="round"/>` + gr(56, 44, 8, 70, '#66bb6a', 1.5);
      s += `<ellipse cx="82" cy="80" rx="18" ry="8" transform="rotate(-25 82 80)" fill="#81c784" stroke="${GK}" stroke-width="1.5"/><ellipse cx="38" cy="92" rx="18" ry="8" transform="rotate(25 38 92)" fill="#81c784" stroke="${GK}" stroke-width="1.5"/>`;
      for (let i = 0; i < 5; i++) { const a = i * 2 * Math.PI / 5; s += gc((60 + 12 * Math.sin(a)).toFixed(1), (32 - 12 * Math.cos(a)).toFixed(1), 9, '#f48fb1', 1.2); } s += gc(60, 32, 7, '#fdd835', 1.2);
      if (t) s += gl(t[0] + (p[0] === 'daun' ? 18 : 0) + 22, t[1] - (p[0] === 'daun' ? 6 : 0), t[0] + (p[0] === 'daun' ? 18 : 0) + (p[0] === 'bunga' ? 24 : 6), t[1] - (p[0] === 'daun' ? 6 : 0), 1.5, '#e53935') + gc(t[0] + (p[0] === 'daun' ? 18 : 0) + (p[0] === 'bunga' ? 24 : 6), t[1] - (p[0] === 'daun' ? 6 : 0), 2.5, '#e53935', 1) + gt(t[0] + (p[0] === 'daun' ? 18 : 0) + 30, t[1] - (p[0] === 'daun' ? 2 : -4), 'A', { s: 16, b: 1, f: '#e53935' });
      return gsvg(150, 152, s);
    },
    ruang(p) {
      const n = p[0], f = '#bbdefb', g = '#90caf9', h = '#64b5f6'; let s;
      if (n === 'kubus') s = gp([[20, 40], [80, 40], [80, 100], [20, 100]], f) + gp([[20, 40], [45, 18], [105, 18], [80, 40]], '#e3f2fd') + gp([[80, 40], [105, 18], [105, 78], [80, 100]], g);
      else if (n === 'balok') s = gp([[10, 50], [110, 50], [110, 100], [10, 100]], f) + gp([[10, 50], [35, 28], [135, 28], [110, 50]], '#e3f2fd') + gp([[110, 50], [135, 28], [135, 78], [110, 100]], g);
      else if (n === 'tabung') s = `<path d="M30,28 L30,92 A30,12 0 0 0 90,92 L90,28" fill="${f}" stroke="${GK}" stroke-width="2"/><ellipse cx="60" cy="28" rx="30" ry="12" fill="#e3f2fd" stroke="${GK}" stroke-width="2"/>`;
      else if (n === 'kerucut') s = `<path d="M60,10 L25,92 A35,12 0 0 0 95,92 Z" fill="${f}" stroke="${GK}" stroke-width="2" stroke-linejoin="round"/>`;
      else if (n === 'bola') s = gc(60, 58, 44, f, 2) + `<ellipse cx="60" cy="58" rx="44" ry="12" fill="none" stroke="${GK}" stroke-width="1" stroke-dasharray="4 3"/>`;
      else if (n === 'limas') s = gp([[15, 90], [85, 90], [110, 70], [40, 70]], '#e3f2fd') + gp([[15, 90], [85, 90], [58, 12]], f) + gp([[85, 90], [110, 70], [58, 12]], g) + gl(15, 90, 40, 70, 1, '#999') + gl(40, 70, 110, 70, 1, '#999') + gl(40, 70, 58, 12, 1, '#999');
      else return '';
      return gsvg(150, 112, s);
    },
    jaring(p) {
      const c = String(p[0] || '').split(',').map(z => [parseInt(z[0], 10), parseInt(z[1], 10)]).filter(z => z[0] >= 0 && z[1] >= 0 && z[0] < 8 && z[1] < 8).slice(0, 12); if (!c.length) return ''; const k = 26;
      const mx = Math.max.apply(null, c.map(z => z[0])), my = Math.max.apply(null, c.map(z => z[1])); let s = '';
      c.forEach(z => { s += gr(6 + z[0] * k, 6 + z[1] * k, k, k, '#ffe0b2', 1.6); });
      return gsvg(12 + (mx + 1) * k, 12 + (my + 1) * k, s);
    },
    bulan(p) {
      const F = { baru: 0, sabit: 0.25, separuh: 0.5, cembung: 0.75, purnama: 1 }[p[0]]; if (F === undefined) return ''; const cx = 50, cy = 50, R = 40, rx = Math.abs(1 - 2 * F) * R; let lit = '';
      if (F >= 1) lit = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff9c4"/>`;
      else if (F > 0) lit = `<path d="M${cx},${cy - R} A${R},${R} 0 0 1 ${cx},${cy + R} A${rx.toFixed(1)},${R} 0 0 ${F < 0.5 ? 0 : 1} ${cx},${cy - R} Z" fill="#fff9c4"/>`;
      return gsvg(100, 100, `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#37474f"/>` + (p[1] === 'kiri' ? `<g transform="translate(${2 * cx},0) scale(-1,1)">${lit}</g>` : lit) + `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${GK}" stroke-width="2"/>`);
    },
    warna(p) {
      let s = '', x = 4; p.slice(0, 7).forEach(z => { const c = GWARNA[z];
        if (c) { s += gr(x, 6, 44, 44, c, 2); x += 52; }
        else if (z === '?') { s += gr(x, 6, 44, 44, '#fff', 2, ' stroke-dasharray="5 3"') + gt(x + 22, 38, '?', { s: 24, b: 1 }); x += 52; }
        else { s += gt(x + 8, 38, z.slice(0, 2), { s: 26, b: 1 }); x += 24; } });
      return gsvg(x + 2, 56, s);
    }
  };
  function gbrSvg(tipe, ps) { const f = GBR[tipe]; if (!f) return ''; try { return f(ps) || ''; } catch (e) { return ''; } }
  // Pisahkan penanda gambar dari teks soal: { teks, gambar } (gambar = deretan SVG, kosong bila tidak ada penanda yang sah).
  function gbrPisah(q) {
    let g = ''; const teks = String(q || '').replace(GBR_RE, (m, t, ps) => { const v = gbrSvg(t, ps ? ps.slice(1).split(';') : []); if (v) g += '<span style="display:inline-block;margin:3px 10px 3px 0;vertical-align:top">' + v + '</span>'; return ''; });
    return { teks: teks.replace(/^\s+|\s+$/g, ''), gambar: g };
  }
  const gbrKotak = (g, kecil) => g ? '<div class="gb" style="margin:3px 0 4px"' + (kecil ? ' data-kecil="1"' : '') + '>' + (kecil ? g.replace(/display:inline-block;margin:3px 10px 3px 0/g, 'display:inline-block;width:34mm;margin:2px 6px 2px 0').replace(/style="max-width:100%;height:auto"/g, 'style="width:100%;height:auto"') : g) + '</div>' : '';

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
  // Bank soal berkunci per FASE (A = kelas 1-2, B = 3-4, C = 5-6), jadi dua kelas dalam satu fase memakai daftar soal yang sama.
  // Agar kelas 1 dan 2 (3 dan 4, 5 dan 6) tidak mendapat soal yang sama persis, kelas ganjil memakai urutan indeks genap lebih dulu
  // dan kelas genap indeks ganjil lebih dulu. Bila soal di bank sedikit, sebagian soal tetap bisa sama (bank memang terbatas).
  function nomorKelas(kelas) {
    const t = String(kelas || '').trim().toUpperCase().replace(/^KELAS\s*/, ''); let m = /^(\d+)/.exec(t);
    if (m) return +m[1];
    m = /^(VI|IV|V|III|II|I)(?=[^IVX]|$)/.exec(t); return m ? { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }[m[1]] : 0;
  }
  // Rombel = huruf paralel di belakang angka/romawi ("1A" -> 0, "1B" -> 1, "IV-C" -> 2). Tanpa huruf tunggal (mis. "1", "VI") -> 0.
  function rombelKelas(kelas) {
    const t = String(kelas || '').trim().toUpperCase().replace(/^KELAS\s*/, '');
    const sisa = t.replace(/^(\d+|VI|IV|V|III|II|I(?=[^IVX]|$))/, '').replace(/[\s\-.\/]/g, '');
    return /^[A-Z]$/.test(sisa) ? sisa.charCodeAt(0) - 65 : 0;
  }
  function urutKelas(daftar, kelas) {
    const n = nomorKelas(kelas); if (!n || daftar.length < 2) return daftar;
    const awal = n % 2 === 0 ? 1 : 0;
    const d = daftar.filter((x, i) => i % 2 === awal).concat(daftar.filter((x, i) => i % 2 !== awal));
    const g = rombelKelas(kelas) % d.length; // geser urutan menurut rombel agar 1A dan 1B tidak sama persis
    return g ? d.slice(g).concat(d.slice(0, g)) : d;
  }
  function isiDariBank(slots, bank, kelas) {
    const pakai = new Set(slots.filter(s => s.q).map(s => s.q)); let n = 0;
    slots.forEach(s => {
      if (s.q || s.st) return;
      const it = urutKelas(((bank || {})[s.k] || []).filter(x => x[0] === s.b), kelas).find(x => !pakai.has(x[2])); if (!it) return;
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
  // Tanpa batas waktu, set() Firebase menggantung bila sinyal buruk: kunci "sedang menyimpan" tidak pernah lepas dan tombol Simpan tampak mati tanpa pesan.
  // Fungsi (bukan promise) dipakai supaya galat sinkron (mis. nilai undefined) juga tertangkap dan kunci dilepas.
  const dgBatas = (f, ms) => new Promise((ok, gagal) => {
    const t = setTimeout(() => gagal(new Error('Server belum menjawab (sinyal lambat). Perubahan akan tersimpan otomatis bila koneksi pulih; periksa sinyal lalu tekan Simpan lagi.')), ms || 15000);
    let p; try { p = f(); } catch (e) { clearTimeout(t); return gagal(e); }
    Promise.resolve(p).then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); gagal(e); });
  });
  const audit = (aksi, id) => { try { if (typeof v4Audit === 'function') v4Audit(aksi, 'PERANGKAT', id, null, null); } catch (e) {} };

  // ---------- Status ----------
  const S = { rec: null, ta: '', fase: '', sem: 'ganjil', slots: { ganjil: [], genap: [] }, judul: { ganjil: '', genap: '' },
              skor: { pg: '1', is: '2', ur: '5' }, cfg: { ganjil: null, genap: null }, nip: '', yatim: { ganjil: 0, genap: 0 },
              loading: false, err: null, busy: false, dirty: false, ro: false, epoch: 0 };
  const MUT = ['simpan', 'ganti', 'bank', 'skor100', 'gbr'];
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
  // Cari skor bulat per bentuk agar total skor maksimal = 100, dengan perbandingan sedekat mungkin ke skor yang sedang diisi (bawaan 1:2:5).
  // Mengembalikan null bila tidak ada kombinasi bulat yang tepat 100 untuk jumlah soal tersebut.
  function skor100(s) {
    const n = { pg: 0, is: 0, ur: 0 }; S.slots[s].forEach(x => { n[x.b]++; });
    const K = ['pg', 'is', 'ur'], ada = K.filter(k => n[k] > 0); if (!ada.length) return null;
    const p = {}; K.forEach(k => { p[k] = skorB(k) > 0 ? skorB(k) : 1; });
    const tot = ada.reduce((t, k) => t + p[k] * n[k], 0), ideal = {}; ada.forEach(k => { ideal[k] = p[k] * 100 / tot; });
    const R = k => n[k] > 0 ? [1, 99] : [0, 0];
    let best = null, bd = Infinity;
    for (let a = R('pg')[0]; a <= R('pg')[1]; a++) for (let b = R('is')[0]; b <= R('is')[1]; b++) {
      const sisa = 100 - a * n.pg - b * n.is;
      for (let c = R('ur')[0]; c <= R('ur')[1]; c++) {
        if (sisa - c * n.ur !== 0) continue;
        const x = { pg: a, is: b, ur: c }; let d = 0; ada.forEach(k => { d += Math.pow((x[k] - ideal[k]) / ideal[k], 2); });
        if (d < bd) { bd = d; best = x; }
      }
    }
    return best;
  }
  const judulAs = s => S.judul[s] || (s === 'genap' ? 'Asesmen Sumatif Akhir Tahun' : 'Asesmen Sumatif Akhir Semester');
  // Label di bawah kop: tambahkan kata "Semester" hanya bila judul belum memuatnya (hindari "Semester Semester").
  const labelAs = s => { const j = judulAs(s); return /semester/i.test(j) ? j + ' ' + SEM_LABEL[s] : j + ' Semester ' + SEM_LABEL[s]; };

  // ---------- Dokumen cetak ----------
  const CSS_DOK = `@page{size:215mm 330mm;margin:7mm 8mm}
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;font-size:11.5pt;color:#111;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.kop{text-align:center;border-bottom:3px double #111;padding-bottom:5px;margin-bottom:8px}
.kopt{width:100%}.kopt td{padding:0;vertical-align:middle;border:0}.kopt td.lg{width:20mm}.kopt td.tx{text-align:center}
.kopt img{width:17mm;height:17mm;object-fit:contain;display:block}
.wm{position:fixed;top:50%;left:50%;width:120mm;height:120mm;margin:-60mm 0 0 -60mm;opacity:.07;z-index:-1}.wm img{width:100%;height:100%;object-fit:contain}
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
.ttd>div{width:45%}.ttd .sp{min-height:52px}
.opg{display:grid;grid-template-columns:1fr 1fr;column-gap:6px}
.dua{column-count:2;column-gap:9mm;column-rule:1px solid #777;font-size:10.5pt;line-height:1.25}
.dua p{margin:0 0 6px;break-inside:avoid}.dua h4{margin:8px 0 4px;font-size:10.5pt;break-after:avoid}.dua .op{margin:1px 0 0 12px}`;
  // Logo madrasah: dimuat sekali di awal dan disimpan sebagai data URI supaya pasti ikut tercetak.
  let LOGO = '';
  (function () {
    try {
      const u = new URL('logo/logo-lembaga.png', document.baseURI).href; LOGO = u;
      fetch(u).then(r => r.ok ? r.blob() : null).then(b => { if (!b) return; const fr = new FileReader(); fr.onload = () => { LOGO = String(fr.result); }; fr.readAsDataURL(b); }).catch(() => {});
    } catch (e) { /* tanpa logo bila gagal */ }
  })();
  const wmHtml = () => LOGO ? `<div class="wm"><img src="${LOGO}" alt=""></div>` : '';
  function kopHtml(s, judul) {
    const lg = LOGO ? `<img src="${LOGO}" alt="" onerror="this.style.visibility='hidden'">` : '';
    return `<div class="kop"><table class="kopt"><tr><td class="lg">${lg}</td><td class="tx"><div class="m">${esc(kopCfg().madrasah || 'MADRASAH')}</div><div class="j">${judul}</div><div class="s">${esc(labelAs(s))} · Tahun Pelajaran ${esc(S.ta)}</div></td><td class="lg"></td></tr></table></div>`;
  }
  // Naskah soal: margin bawah lebih tipis, soal rapat dengan nomor menggantung, identitas dengan kotak mapel.
  const CSS_NASKAH = CSS_DOK.replace('@page{size:215mm 330mm;margin:7mm 8mm}', '@page{size:215mm 330mm;margin:6mm 8mm 12mm}') + `
body{font-size:11pt;line-height:1.25}
.nk{margin:0 0 6px;font-size:11pt}.nk td{padding:2px 3px;vertical-align:bottom;border:0}
.nk td.lb{width:27mm;white-space:nowrap}.nk td.cl{width:4mm;text-align:center}.nk td.sp{width:8mm}.nk td.dt{border-bottom:1px dotted #333}
.mpbox{display:inline-block;border:1.5px solid #111;padding:1px 10px;font-weight:700}
.q{margin:0 0 5px;break-inside:avoid;page-break-inside:avoid}.q:after{content:"";display:block;clear:both}
.q .n{float:left;width:6mm}.q .b{margin-left:6mm}
.q .op{margin:1px 0 0 0;padding-left:4.7mm;text-indent:-4.7mm}.q .opg{column-gap:4mm}
.dua{font-size:10.5pt;line-height:1.22;column-gap:8mm;column-rule:0 none}.dua .q{margin:0 0 4px}
.q .b{text-align:justify}.q .op{text-align:left}
.kopn{border-bottom:3px double #111;padding-bottom:4px;margin-bottom:4px}
.kopn .k1,.kopn .k2,.kopn .k3,.kopn .k4{font-weight:700;text-align:center;line-height:1.25}
.kopn .k1{font-size:11.5pt}.kopn .k2{font-size:14pt}.kopn .k3{font-size:11.5pt}.kopn .k4{font-size:11pt}
.idn{margin:0;font-size:11pt}.idn td{padding:2px 3px;vertical-align:bottom;border:0}
.idn td.lb{width:30mm;white-space:nowrap}.idn td.cl{width:4mm;text-align:center}.idn td.sp{width:10mm}.idn td.dt{border-bottom:1px dotted #333;width:36%}
.gar{border-top:1px solid #111;margin:3px 0 4px}
.pu{width:100%;font-size:10.5pt;line-height:1.25;border-collapse:collapse;border-top:1px solid #111;border-bottom:1px solid #111;margin:3px 0 4px}.pu td{border:0;padding:3px 0 3px;vertical-align:top}.pu td.lb{width:34mm;font-weight:700;white-space:nowrap}.pu td.cl{width:4mm}
.pu td.nb{width:34mm;border-left:1.5px solid #111;border-right:1.5px solid #111;text-align:center;font-weight:700;padding-top:3px}
.pk{font-weight:700;font-size:11pt;margin:2px 0 3px}
.jw{height:7mm;border-bottom:1px dotted #333}.jw:first-child{margin-top:0}
.rk{width:100%;border-collapse:collapse;margin-top:8px;font-size:10pt;break-inside:avoid;page-break-inside:avoid}.rk th,.rk td{border:1px solid #111;padding:2px 6px;vertical-align:middle}.rk th{text-align:center}.rk td.c{text-align:center}.rk td.pf{width:34mm;text-align:center;vertical-align:top;font-weight:700}
.pi{break-after:avoid;page-break-after:avoid;margin:0 0 4px}.pi .b{font-weight:700;text-align:justify}`;
  function ttdHtml(jenis, s, jk) {
    const c = kopCfg(), t = '........................................', nip = String(S.nip || '').trim();
    return `<div class="ttd"><div>Mengetahui,<br>Kepala ${esc(c.madrasah || 'Madrasah')}${R().ttdKepalaSp(jk, R().idSemester(S.id, s), { jenis: jenis, ket: S.rec.mapel + ' Kelas ' + S.rec.kelas + ' · Semester ' + SEM_LABEL[s] + ' · TP ' + S.ta + ' · Guru: ' + (S.rec.guruName || myName()), nama: c.kepala, jabatan: 'Kepala ' + (c.madrasah || 'Madrasah'), nip: c.nipKepala })}<b><u>${esc(c.kepala || t)}</u></b><br>PEG ID. ${esc(c.nipKepala || t)}</div>
<div>${esc(c.kota || t)}, ${R().fmtTgl(new Date())}<br>Guru Mata Pelajaran${R().ttdSp({ jenis: jenis, ket: S.rec.mapel + ' Kelas ' + S.rec.kelas + ' · Semester ' + SEM_LABEL[s] + ' · TP ' + S.ta, nama: S.rec.guruName || myName(), jabatan: 'Guru Mata Pelajaran', nip: nip })}<b><u>${esc(S.rec.guruName || myName() || t)}</u></b><br>PEG ID. ${esc(nip || t)}</div></div>`;
  }
  const html = (judul, isi, css) => `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${judul} ${esc(S.rec.mapel)} Kelas ${esc(S.rec.kelas)}</title><style>${css || CSS_DOK}</style></head><body>${isi}</body></html>`;
  const bentukNama = b => BENTUK.find(x => x[0] === b)[1];
  const bentukX = x => (x.b === 'pg' && x.st) ? SUB.find(z => z[0] === x.st)[1] : bentukNama(x.b);
  // Titik-titik isian ("yang ke ...") dilekatkan ke kata sebelumnya agar tidak jatuh sendirian di baris baru.
  const rapi = t => esc(t).replace(/\s+(\.{2,}|…)/g, '&nbsp;$1');
  // Pilihan jawaban boleh berupa gambar: teks pilihan memuat penanda [[g:...]] (gambar kecil di samping/bawah huruf pilihan).
  const opIsi = (o, fmt) => { const g = gbrPisah(o); return (fmt || rapi)(g.teks) + (g.gambar ? gbrKotak(g.gambar, true).replace('style="margin:3px 0 4px"', 'style="margin:2px 0;text-indent:0"') : ''); };
  const adaGbrOp = x => x.o && x.o.some(o => /\[\[g:/.test(String(o || '')));
  function soalHtml(x, rapat) {
    const gb = gbrPisah(x.q), q = rapi(gb.teks || (gb.gambar ? '' : '(belum diisi)')).replace(/\n/g, '<br>') + gbrKotak(gb.gambar);
    if (x.b !== 'pg') return q;
    if (x.st === 'jd') {
      const u = acak(4, x.key + '|jd');
      const baris = [0, 1, 2, 3].map(n => `<tr><td style="padding:2px 6px;width:50%;">${n + 1}. ${esc(pasang(x, n)[0])}</td><td style="padding:2px 6px;">${HURUF[n]}. ${esc(pasang(x, u[n])[1])}</td></tr>`).join('');
      return q + '<div style="font-size:10pt;"><i>Jodohkan pernyataan di kolom kiri dengan pasangan yang tepat di kolom kanan.</i></div><table style="width:100%;border-collapse:collapse;">' + baris + '</table>';
    }
    const ops = x.o.map((o, i) => `<div class="op">${HURUF[i]}. ${opIsi(o)}</div>`).join('');
    // rapat = batas panjang pilihan (karakter): bila semua pilihan sependek itu, tampil 2 per baris (A B / C D) untuk menghemat kertas.
    const pendek = adaGbrOp(x) || rapat && x.o.length > 2 && x.o.every(o => String(o || '').length <= rapat && String(o || '').indexOf('\n') < 0);
    return q + (x.st === 'pk' ? '<div style="font-size:10pt;"><i>(Pilih semua jawaban yang benar.)</i></div>' : '') + (pendek ? '<div class="opg">' + ops + '</div>' : ops);
  }
  function kunciTeks(x) {
    if (x.b !== 'pg') return esc(x.kt || '(belum diisi)').replace(/\n/g, '<br>');
    if (x.st === 'jd') { const u = acak(4, x.key + '|jd'); return [0, 1, 2, 3].map(n => (n + 1) + '-' + HURUF[u.indexOf(n)]).join(', '); }
    if (x.st === 'pk') { const k = ksList(x); return k.length ? k.map(i => HURUF[i] + (x.o[i] ? '. ' + opIsi(x.o[i], esc) : '')).join('; ') : '(belum diisi)'; }
    return HURUF[x.kp] + (x.o[x.kp] ? '. ' + opIsi(x.o[x.kp], esc) : '');
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
    return html('Kartu Soal', wmHtml() + kopHtml(s, 'KARTU SOAL') + S.slots[s].map(info).join('') + ttdHtml('Kartu Soal', s, 'kartu'));
  }
  // Kop naskah gaya lembar ujian madrasah: logo kiri, empat baris tengah, garis ganda di bawahnya.
  function kopNaskah(s) {
    const lg = LOGO ? `<img src="${LOGO}" alt="" onerror="this.style.visibility='hidden'">` : '';
    const up = t => esc(String(t).toUpperCase());
    return `<div class="kopn"><table class="kopt"><tr><td class="lg">${lg}</td><td class="tx"><div class="k1">KEMENTERIAN AGAMA REPUBLIK INDONESIA</div><div class="k2">${up(kopCfg().madrasah || 'MADRASAH')}</div><div class="k3">${up(labelAs(s))}</div><div class="k4">TAHUN PELAJARAN ${esc(S.ta)}</div></td><td class="lg"></td></tr></table></div>`;
  }
  const PETUNJUK = { pg: 'Pilihlah jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D!', is: 'Isilah titik-titik berikut dengan jawaban yang benar dan singkat!', ur: 'Jawablah pertanyaan-pertanyaan berikut dengan jelas dan benar!' };
  const ROMAWI = ['I', 'II', 'III'];
  const BARIS_JAWAB = { is: 1, ur: 2 }; // jumlah baris titik-titik tempat siswa menulis jawaban (isian, uraian)
  function dokNaskah(s, dua) {
    const kls = String(S.rec.kelas || '').replace(/^\s*kelas\s+/i, '');
    const dot = '<td class="dt">&nbsp;</td>';
    const baris = (l1, v1, l2) => `<tr><td class="lb">${l1}</td><td class="cl">:</td><td${v1 === null ? ' class="dt"' : ''}>${v1 === null ? '&nbsp;' : v1}</td><td class="sp"></td>${l2 ? `<td class="lb">${l2}</td><td class="cl">:</td>${dot}` : '<td colspan="3"></td>'}</tr>`;
    let h = wmHtml() + kopNaskah(s)
      + `<table class="idn">${baris('Mata Pelajaran', esc(S.rec.mapel), 'Hari/Tanggal')}${baris('Kelas', esc(kls), 'Waktu')}${baris('Nama', null, '')}</table>`
      + `<table class="pu"><tr><td class="lb">PETUNJUK UMUM</td><td class="cl">:</td><td class="tp">1. Berdoalah terlebih dahulu sebelum mengerjakan soal.<br>2. Tulislah nama dan kelas pada tempat yang tersedia.<br>3. Periksa kembali jawabanmu sebelum naskah dikumpulkan.</td><td class="nb">NILAI</td></tr></table>`
      + '<div class="pk">PETUNJUK KHUSUS :</div>';
    let n = 0, buka = false;
    BENTUK.forEach(b => {
      const l = S.slots[s].filter(x => x.b === b[0]); if (!l.length) return;
      const ins = `<div class="q pi"><div class="n">${ROMAWI[n++]}.</div><div class="b">${PETUNJUK[b[0]]}</div></div>`;
      if (dua && n > 1 && !buka) { h += '<div class="dua">'; buka = true; }
      h += ins;
      if (dua && !buka) { h += '<div class="dua">'; buka = true; }
      h += l.map(x => `<div class="q"><div class="n">${x.no}.</div><div class="b">${soalHtml(x, dua ? 18 : 30)}${'<div class="jw"></div>'.repeat(BARIS_JAWAB[x.b] || 0)}</div></div>`).join('');
    });
    if (buka) h += '</div>';
    // Rekap penilaian di akhir naskah (diisi guru): skor maksimal per bentuk soal, skor diperoleh, dan paraf korektor.
    const rk = BENTUK.map(b => { const j = S.slots[s].filter(x => x.b === b[0]).length; return j ? `<tr><td>${esc(b[1])} (${j} soal)</td><td class="c">${j * skorB(b[0])}</td><td>&nbsp;</td></tr>` : ''; }).filter(Boolean);
    h += `<table class="rk"><tr><th>REKAP PENILAIAN (diisi guru)</th><th style="width:26mm">Skor Maks</th><th style="width:30mm">Skor Diperoleh</th><td class="pf" rowspan="${rk.length + 2}">Paraf<br>Korektor</td></tr>${rk.join('')}<tr><td><b>Jumlah</b></td><td class="c"><b>${skorMaks(s)}</b></td><td>&nbsp;</td></tr></table>`;
    // Footer cetak: mapel dan kelas di kiri, nama madrasah di tengah, nomor halaman di kanan (margin box @page; tampil di Cetak/PDF browser berbasis Chrome).
    const cs = t => '"' + String(t).replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ') + '"';
    const ft = `@page{@bottom-left{content:${cs(S.rec.mapel + ' · Kelas ' + kls)};font:9pt serif;color:#333;vertical-align:top;padding-top:1.5mm;border-top:0.5pt solid #555}@bottom-center{content:${cs(kopCfg().madrasah || '')};font:bold 9pt serif;color:#333;vertical-align:top;padding-top:1.5mm;border-top:0.5pt solid #555}@bottom-right{content:"Halaman " counter(page) " dari " counter(pages);font:9pt serif;color:#333;vertical-align:top;padding-top:1.5mm;border-top:0.5pt solid #555}}`;
    return html('Naskah Soal', h, CSS_NASKAH + ft);
  }
  function dokKunci(s) {
    const rows = S.slots[s].map(x => `<tr><td class="c">${x.no}</td><td>${bentukX(x)}</td><td>${kunciTeks(x)}</td><td class="c">${skorB(x.b)}</td></tr>`).join('');
    const per = BENTUK.map(b => { const n = S.slots[s].filter(x => x.b === b[0]).length; return n ? `${b[1]}: ${n} soal × ${skorB(b[0])} = ${n * skorB(b[0])}` : ''; }).filter(Boolean).join('; ');
    return html('Kunci dan Penskoran', wmHtml() + kopHtml(s, 'KUNCI JAWABAN DAN PEDOMAN PENSKORAN') + `<table class="kn"><thead><tr><th style="width:36px">No</th><th style="width:110px">Bentuk</th><th>Kunci Jawaban / Pedoman Penskoran</th><th style="width:48px">Skor</th></tr></thead><tbody>${rows}
<tr><td colspan="3" class="c"><b>Skor maksimal</b></td><td class="c"><b>${skorMaks(s)}</b></td></tr></tbody></table>
<p style="font-size:10.5pt;margin-top:8px;">${esc(per)}.<br>${catatanSub(s)}Nilai akhir = (jumlah skor yang diperoleh ÷ skor maksimal ${skorMaks(s)}) × 100.</p>` + ttdHtml('Kunci Jawaban dan Penskoran', s, 'kunci'));
  }
  // Lembar telaah: dipakai guru/sejawat/KKG memeriksa soal (terutama soal draf dari bank) sebelum dipakai. F4 mendatar.
  const CSS_TEL = CSS_DOK.replace('@page{size:215mm 330mm;margin:7mm 8mm}', '@page{size:330mm 215mm;margin:7mm 8mm}') +
    `\n.tl{width:100%}.tl th,.tl td{border:1px solid #333;padding:3px 5px;font-size:10pt;vertical-align:top}.tl th{background:#e5e7eb;text-align:center}.tl td.c{text-align:center}.tl tr{page-break-inside:avoid}.tl thead{display:table-header-group}\n.sm{font-size:9pt;color:#222;margin-top:2px}.tp{font-size:8.5pt;color:#555;margin-top:2px;font-style:italic}.cb{white-space:nowrap;line-height:1.5}`;
  function soalRingkas(x) {
    const gb = gbrPisah(x.q), q = esc(gb.teks || (gb.gambar ? '' : '(belum diisi)')).replace(/\n/g, '<br>') + gbrKotak(gb.gambar, true);
    if (x.b !== 'pg') return q;
    if (x.st === 'jd') return q + '<div class="sm">Menjodohkan: ' + [0, 1, 2, 3].map(n => esc(pasang(x, n)[0]) + ' &rarr; ' + esc(pasang(x, n)[1])).join('; ') + '</div>';
    return q + '<div class="sm">' + x.o.map((o, i) => HURUF[i] + '. ' + opIsi(o, esc)).join(' &nbsp; ') + '</div>';
  }
  const sumberTeks = x => x.src === 'bank' ? (x.ok ? 'Bank, sudah diperiksa guru' : 'Bank (DRAF)') : 'Ditulis guru';
  function dokTelaah(s) {
    const c = kopCfg(), t = '..............................', sl = S.slots[s];
    const draf = sl.filter(x => x.src === 'bank' && !x.ok).length;
    const rows = sl.map(x => `<tr><td class="c">${x.no}</td><td class="c">${esc(bentukX(x))}<br>${esc(x.lv)}</td>
<td>${soalRingkas(x)}<div class="tp">TP: ${esc(x.t)}</div></td><td>${kunciTeks(x)}</td><td class="c">${sumberTeks(x)}</td>
<td class="cb">&#9744; Benar<br>&#9744; Perbaiki<br>&#9744; Hapus</td><td></td></tr>`).join('');
    const info = `<table style="margin-bottom:6px;font-size:10.5pt"><tr><td style="width:34%">Mata Pelajaran: ${esc(S.rec.mapel)}</td><td style="width:22%">Kelas: ${esc(S.rec.kelas)}</td><td>Jumlah soal: ${sl.length} (soal bank belum diperiksa: ${draf})</td></tr></table>`;
    const ttd = `<div class="ttd" style="gap:10px"><div style="width:32%">Penelaah (sejawat / KKG),<div class="sp"></div><b>${t}</b></div><div style="width:32%">Guru Mata Pelajaran,<div class="sp"></div><b><u>${esc(S.rec.guruName || myName() || t)}</u></b></div><div style="width:32%">${esc(c.kota || t)}, ${R().fmtTgl(new Date())}<br>Mengetahui, Kepala ${esc(c.madrasah || 'Madrasah')}<div class="sp"></div><b>${esc(c.kepala || t)}</b></div></div>`;
    return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Lembar Telaah Soal ${esc(S.rec.mapel)} Kelas ${esc(S.rec.kelas)}</title><style>${CSS_TEL}</style></head><body>` +
      wmHtml() + kopHtml(s, 'LEMBAR TELAAH SOAL') + info +
      `<table class="tl"><thead><tr><th style="width:26px">No</th><th style="width:62px">Bentuk / Level</th><th>Soal</th><th style="width:26%">Kunci / Pedoman</th><th style="width:70px">Sumber</th><th style="width:78px">Hasil Telaah</th><th style="width:15%">Catatan</th></tr></thead><tbody>${rows}</tbody></table>` + ttd + `</body></html>`;
  }
  function cekCetak(s) {
    const sl = S.slots[s];
    if (!sl.length) { say('Belum ada slot soal. Buka 📋 Kisi-kisi, isi jumlah soal, lalu simpan.', true); return false; }
    const kosong = sl.filter(x => !lengkap(x)).length, draf = sl.filter(x => lengkap(x) && x.src === 'bank' && !x.ok).length;
    const msg = (kosong ? kosong + ' soal masih kosong atau belum lengkap (PG butuh 4 opsi berbeda). ' : '') + (draf ? draf + ' soal dari bank belum ditandai "Sudah saya periksa". ' : '');
    return !msg || confirm(msg + '\nTetap cetak?');
  }
  function cetak(jenis, mode, dua) {
    sinkron(); const s = S.sem; if (!(jenis === 'telaah' && S.slots[s].length ? true : cekCetak(s))) return;
    R().nipSimpan(S.nip);
    R().keluarkan(jenis === 'kartu' ? dokKartu(s) : jenis === 'naskah' ? dokNaskah(s, dua) : jenis === 'telaah' ? dokTelaah(s) : dokKunci(s), (jenis === 'kartu' ? 'KartuSoal' : jenis === 'naskah' ? (dua ? 'NaskahSoal2Kolom' : 'NaskahSoal') : jenis === 'telaah' ? 'TelaahSoal' : 'Kunci') + '_' + S.rec.mapel + '_' + S.rec.kelas + '_' + s, mode);
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
    return `Soal: <b>${sl.length}</b> · lengkap <b>${sl.length - kosong}</b>${kosong ? ` · <span style="color:#b45309">belum lengkap ${kosong}</span>` : ''}${draf ? ` · <span style="color:#b45309">draf bank belum diperiksa ${draf}</span>` : ''} · Skor maksimal: <b style="color:${skorMaks(S.sem) === 100 ? '#15803d' : '#b45309'}">${skorMaks(S.sem)}</b>${skorMaks(S.sem) === 100 ? ' ✓' : ' (belum 100)'}`
      + (S.yatim[S.sem] ? `<div style="color:#b91c1c;margin-top:4px;">⚠️ ${S.yatim[S.sem]} soal tersimpan tidak punya slot lagi (jumlah soal di Kisi-kisi dikurangi). Soal itu akan terhapus bila Anda menekan Simpan.</div>` : '');
  }
  const gbrPrev = q => { const g = gbrPisah(q); return g.gambar ? `<div style="margin-top:4px;padding:6px;border:1px dashed #cbd5e1;border-radius:6px;"><div style="${muted}">Gambar otomatis (tampil di naskah soal). Jangan hapus penanda [[g:...]] di teks soal bila gambar ingin tetap ada.</div>${gbrKotak(g.gambar, true)}</div>` : ''; };
  function kartuHtml(x, i) {
    const lencana = x.src === 'bank' ? (x.ok ? '<span style="color:#15803d">✔ dari bank, sudah diperiksa</span>' : '<span style="color:#b45309">● draf dari bank, periksa dulu</span>') : '<span style="color:#6b7280">ditulis guru</span>';
    let h = `<div style="margin-top:8px;padding:8px;border:1px solid ${lengkap(x) ? '#e5e7eb' : '#fcd34d'};border-radius:8px;">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;"><b>No. ${x.no} · ${bentukX(x)} · ${esc(x.lv)}</b><span>${lencana}</span></div>
      <div style="${muted}margin:2px 0 6px;">${esc(x.e)} — ${esc(x.t)}</div>
      <textarea class="field" rows="${x.b === 'ur' ? 3 : 2}" maxlength="600" style="width:100%;" data-i="${i}" data-k="q" placeholder="Tulis soal..." aria-label="Soal ${x.no}">${esc(x.q)}</textarea><div style="margin-top:4px;">${btn('gbr" data-i="' + i + '" data-k="q', '🖼 Sisipkan gambar otomatis')}</div>${gbrPrev(x.q)}`;
    if (x.b === 'pg') {
      const res = ((window.BANK_KISI_RESMI_MI || {})[x.k] || []).map(z => z.bentuk).filter(v => /kompleks|menjodohkan/i.test(v)).filter((v, n, a) => a.indexOf(v) === n);
      h += `<div style="margin-top:6px;font-size:12px;">Jenis: <select class="field" data-i="${i}" data-k="st" aria-label="Jenis soal ${x.no}">${SUB.map(z => `<option value="${z[0]}" ${x.st === z[0] ? 'selected' : ''}>${z[1]}</option>`).join('')}</select>${res.length ? ` <span style="color:#1e40af;">📘 Kisi-kisi resmi untuk TP ini juga memuat: ${esc(res.join(', '))}</span>` : ''}</div>`;
      if (x.st === 'jd') {
        h += [0, 1, 2, 3].map(n => { const p = pasang(x, n); return `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;"><span style="width:16px;font-weight:700;">${n + 1}</span><input class="field" maxlength="70" style="flex:1;" data-i="${i}" data-k="ja${n}" value="${esc(p[0])}" placeholder="Pernyataan" aria-label="Pernyataan ${n + 1}"><span>↔</span><input class="field" maxlength="70" style="flex:1;" data-i="${i}" data-k="jb${n}" value="${esc(p[1])}" placeholder="Pasangan yang benar" aria-label="Pasangan ${n + 1}"></div>`; }).join('')
          + `<div style="${muted}margin-top:2px;">Tulis tiap pasangan yang benar sejajar. Kolom kanan diacak otomatis saat dicetak.</div>`;
      } else if (x.st === 'pk') {
        const kc = ksList(x);
        h += x.o.map((o, n) => `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;"><input type="checkbox" data-i="${i}" data-k="kc${n}" ${kc.indexOf(n) >= 0 ? 'checked' : ''} aria-label="Benar ${HURUF[n]}"><span style="width:16px;font-weight:700;">${HURUF[n]}</span><input class="field" maxlength="160" style="flex:1;" data-i="${i}" data-k="o${n}" value="${esc(o)}" aria-label="Opsi ${HURUF[n]}">${btn('gbr" data-i="' + i + '" data-k="o' + n, '🖼', 'btn-soft', 'padding:4px 8px;')}</div>`).join('')
          + `<div style="${muted}margin-top:2px;">Centang SEMUA jawaban yang benar (minimal 2).</div>`;
      } else {
        h += x.o.map((o, n) => `<div style="display:flex;gap:6px;align-items:center;margin-top:4px;"><input type="radio" name="kp${i}" value="${n}" data-i="${i}" data-k="kp" ${x.kp === n ? 'checked' : ''} aria-label="Kunci ${HURUF[n]}"><span style="width:16px;font-weight:700;">${HURUF[n]}</span><input class="field" maxlength="160" style="flex:1;" data-i="${i}" data-k="o${n}" value="${esc(o)}" aria-label="Opsi ${HURUF[n]}">${btn('gbr" data-i="' + i + '" data-k="o' + n, '🖼', 'btn-soft', 'padding:4px 8px;')}</div>`).join('')
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
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:10px;">${btn('bank', '⚡ Isi dari bank soal', 'btn-success')}${fld('pg', 'Skor per soal PG')}${fld('is', 'Skor per soal isian')}${fld('ur', 'Skor per soal uraian')}${btn('skor100', '🎯 Atur skor = 100', 'btn-soft')}</div>
      <div id="soalSum" style="margin:10px 0;font-size:13px;">${ringkasHtml()}</div>`;
    h += sl.map((x, i) => kartuHtml(x, i)).join('');
    return h + `<div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;">
      <label style="font-size:12px;">PEG ID guru (tanda tangan)<br><input class="field" maxlength="30" style="width:200px;" data-f="nip" value="${esc(S.nip)}" placeholder="boleh dikosongkan"></label>
      ${btn('simpan', '💾 Simpan', 'btn-success')}${btn('cetak-kartu', '🖨 Kartu Soal')}${btn('cetak-naskah2', ' Naskah 2 Kolom')}${btn('cetak-naskah', '🖨 Naskah Soal')}${btn('cetak-kunci', '🖨 Kunci &amp; Penskoran')}${btn('word-kartu', '📄 Kartu Word')}${btn('word-naskah', '📄 Naskah Word')}${btn('word-kunci', '📄 Kunci Word')}${btn('cetak-telaah', '🖨 Lembar Telaah')}${btn('word-telaah', '📄 Telaah Word')}</div>`;
  }
  function gambar() {
    if (S.quiet) return;   // mode Cetak Paket: tanpa jendela
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
  // Guru mengubah soal yang sudah Final/Disetujui -> Kartu Soal & Kunci kembali "menunggu persetujuan Kepala".
  // Hanya dokumen buatan aplikasi (tanpa tautan) yang sudah ada dan berstatus Final/Disetujui; yang belum pernah diajukan atau sudah menunggu dibiarkan.
  // Mengembalikan jumlah dokumen yang diajukan ulang. Best effort: kegagalan di sini tidak membatalkan penyimpanan soal.
  function ajukanUlang(sems) {
    if (typeof db === 'undefined' || !db) return Promise.resolve(0);
    const now = new Date().toISOString(), per = {}; let n = 0;
    const jobs = [];
    sems.forEach(s => { const id = R().idSemester(S.id, s); ['kartu', 'kunci'].forEach(jk => jobs.push(
      db.ref('perangkat_v4/' + id + '/docs/' + jk).once('value').then(sn => {
        const x = sn.val(); if (!x || x.url || x.app !== true) return;
        if (!x.setuju && x.status !== 'final') return;
        const u = per[id] = per[id] || {}, b = 'docs/' + jk + '/';
        u[b + 'status'] = 'draf'; u[b + 'diajukan'] = now; u[b + 'setuju'] = null; u[b + 'dilihat'] = null; u[b + 'at'] = now; u[b + 'by'] = myName(); u.updatedAt = now; n++;
      }))); });
    return Promise.all(jobs).then(() => Promise.all(Object.keys(per).map(id => db.ref('perangkat_v4/' + id).update(per[id])))).then(() => n);
  }
  function simpan() {
    sinkron(); const rec = S.rec, berubah = !!S.dirty;
    if (rec.guruKey !== myId()) return say('Hanya pemilik perangkat yang bisa menyimpan.', true);
    if (typeof db === 'undefined' || !db) return say('Database belum siap, muat ulang halaman lalu coba lagi.', true);
    if (!navigator.onLine) return say('Perlu koneksi internet untuk menyimpan.', true);
    if (S.busy) return say('⏳ Masih menyimpan, mohon tunggu sebentar...', false, 2000);
    const hilang = SEM.filter(s => S.slots[s].length).reduce((t, s) => t + (S.yatim[s] || 0), 0);
    if (hilang && !confirm(hilang + ' soal tersimpan tidak punya slot lagi di kisi-kisi dan akan DIHAPUS.\nLanjut menyimpan?')) return;
    S.busy = true; say('⏳ Menyimpan...', false, 1500);
    const cut = (s, n) => String(s || '').slice(0, n), now = new Date().toISOString();
    const tulis = () => SEM.filter(s => S.slots[s].length).map(s => db.ref('perangkat_soal_v4/' + idSem(s)).set({
      guruKey: rec.guruKey, guruName: rec.guruName || myName(), tahunAjaran: S.ta, semester: s, mapel: rec.mapel, kelas: rec.kelas,
      skor: { pg: angka(S.skor.pg), is: angka(S.skor.is), ur: angka(S.skor.ur) },
      soal: S.slots[s].map(x => ({ key: cut(x.key, 80), q: cut(x.q, 600), o: x.b === 'pg' ? x.o.map(o => cut(o, 160)) : [], kp: x.kp, st: x.st || '', ks: cut(x.ks, 7), kt: cut(x.kt, 600), src: x.src, ok: !!x.ok })), at: now, by: myName() }));
    dgBatas(() => Promise.all(tulis())).then(() => { S.busy = false; S.dirty = false; S.yatim = { ganjil: 0, genap: 0 }; audit('SAVE_PERANGKAT_SOAL', idSem(S.sem)); SEM.forEach(x => R().cabutSetuju(R().idSemester(S.id, x), ['kartu', 'kunci'])); say('✅ Soal tersimpan'); if (S.rec) gambar();
      if (berubah) ajukanUlang(SEM.filter(s => S.slots[s].length)).then(n => { if (n) { audit('AJUKAN_ULANG_PERANGKAT_SOAL', idSem(S.sem)); say('⏳ Kartu Soal & Kunci kembali menunggu persetujuan Kepala', false, 4500); } }).catch(err => console.error('[SI MAMBA] ajukan ulang soal:', err)); })
      .catch(err => { S.busy = false; console.error('[SI MAMBA] soal:', err); say('❌ Gagal menyimpan: ' + ((err && err.message) || err), true); });
  }
  // ---------- Dialog "Sisipkan gambar" di editor soal ----------
  // Guru memilih jenis gambar, mengisi isian, melihat pratinjau, lalu penanda [[g:...]] disisipkan ke teks soal atau pilihan jawaban.
  const GN = (id, l, a, b, d) => ({ id, l, k: 'n', a, b, d });
  const GS = (id, l, o, d) => ({ id, l, k: 's', o, d });
  const GT = (id, l, d, h, x) => ({ id, l, k: 't', d, h, x });
  const gdaftar = v => String(v).split(',').map(z => z.trim()).filter(Boolean);
  const GIK = Object.keys(GIKON).map(n => [n, n]);
  const GBENTUK = [['persegi', 'Persegi'], ['persegipanjang', 'Persegi panjang'], ['siku', 'Segitiga siku-siku'], ['segitiga', 'Segitiga'], ['lingkaran', 'Lingkaran'], ['segilima', 'Segi lima'], ['segienam', 'Segi enam'], ['belahketupat', 'Belah ketupat'], ['jajargenjang', 'Jajar genjang'], ['trapesium', 'Trapesium'], ['layang', 'Layang-layang']];
  const GARAH = [['U', 'Utara (U)'], ['TL', 'Timur laut (TL)'], ['T', 'Timur (T)'], ['TG', 'Tenggara (TG)'], ['S', 'Selatan (S)'], ['BD', 'Barat daya (BD)'], ['B', 'Barat (B)'], ['BL', 'Barat laut (BL)']];
  const GKAT = [
    { t: 'jam', n: 'Jam analog', f: [GN('h', 'Jam (1-12)', 1, 12, 3), GN('m', 'Menit (0-59)', 0, 59, 30)] },
    { t: 'pecahan', n: 'Pecahan (bagian berwarna)', f: [GN('n', 'Bagian berwarna', 0, 12, 3), GN('d', 'Jumlah bagian seluruhnya', 1, 12, 4), GS('b', 'Bentuk', [['lingkaran', 'Lingkaran'], ['batang', 'Batang']], 'lingkaran')] },
    { t: 'diagram', n: 'Diagram batang', h: 'Pisahkan dengan koma. Maksimal 6 batang.', f: [GT('i', 'Nama:nilai', 'Apel:5, Jeruk:8, Mangga:3', 'Apel:5, Jeruk:8', gdaftar)] },
    { t: 'piktogram', n: 'Piktogram (diagram gambar)', f: [GT('i', 'Nama:jumlah gambar', 'Bola:4, Voli:2, Basket:5', 'Bola:4, Voli:2', gdaftar), GT('k', 'Keterangan (boleh kosong)', '1 anak', 'mis. 1 anak', v => v ? ['=' + v] : [])] },
    { t: 'bangun', n: 'Bangun datar', f: [GS('b', 'Bentuk', GBENTUK, 'persegi'), GT('a', 'Label sisi/jari-jari (boleh kosong)', '5 cm', 'mis. 5 cm'), GT('c', 'Label sisi kedua (persegi panjang atau siku-siku, boleh kosong)', '', 'mis. 3 cm')] },
    { t: 'ubin', n: 'Kotak satuan (untuk luas)', f: [GN('r', 'Baris', 1, 10, 3), GN('c', 'Kolom', 1, 12, 4)] },
    { t: 'kubus', n: 'Susunan kubus satuan (untuk volume)', f: [GN('p', 'Panjang', 1, 6, 3), GN('l', 'Lebar', 1, 6, 2), GN('t', 'Tinggi', 1, 6, 2)] },
    { t: 'penggaris', n: 'Penggaris dan benda', f: [GN('p', 'Panjang benda (cm, maks 15)', 0.5, 15, 7)] },
    { t: 'petak', n: 'Peta berpetak', f: [GN('k', 'Kolom (A, B, C, ...)', 2, 8, 5), GN('b', 'Baris (1, 2, 3, ...)', 2, 8, 4), GT('m', 'Penanda (huruf+angka:nama)', 'B2:Toko, D3:Pasar', 'mis. B2:Toko', gdaftar)] },
    { t: 'pola', n: 'Pola gambar', h: 'k = kotak, o = bulat, t = segitiga, b = bintang, h = hati, ? = yang ditanyakan. Maksimal 10.', f: [GT('i', 'Urutan bentuk', 'k, o, o, k, o, o, k, ?', 'k, o, k, o, ?', gdaftar)] },
    { t: 'timbangan', n: 'Timbangan', f: [GT('a', 'Isi sisi kiri', 'Apel', 'mis. Apel'), GT('b', 'Isi sisi kanan', 'Jeruk', 'mis. Jeruk'), GS('t', 'Sisi yang turun (lebih berat)', [['kiri', 'Kiri'], ['kanan', 'Kanan'], ['seimbang', 'Seimbang']], 'kiri')] },
    { t: 'garisbil', n: 'Garis bilangan', f: [GN('a', 'Bilangan awal', -50, 99, 0), GN('b', 'Bilangan akhir', -49, 119, 10), GN('t', 'Letak titik', -50, 119, 7), GT('h', 'Nama titik', 'A', 'mis. A'), GS('s', 'Angka di titik', [['sembunyi', 'Disembunyikan (untuk ditanyakan)'], ['tampil', 'Ditampilkan']], 'sembunyi')] },
    { t: 'mataangin', n: 'Mata angin (arah panah)', f: [GS('a', 'Arah panah merah', GARAH, 'T')] },
    { t: 'ikon', n: 'Ikon sederhana (kelas rendah)', h: 'Boleh dua jenis ikon sekaligus, misalnya untuk soal penjumlahan.', f: [GS('n1', 'Ikon pertama', GIK, 'apel'), GN('j1', 'Jumlah (1-12)', 1, 12, 3), GS('n2', 'Ikon kedua (boleh kosong)', [['', '(tidak ada)']].concat(GIK), ''), GN('j2', 'Jumlah ikon kedua', 1, 12, 2)], b: v => v.n2 ? [v.n1, v.j1, v.n2, v.j2] : [v.n1, v.j1] },
    { t: 'wajah', n: 'Ekspresi wajah', f: [GS('e', 'Ekspresi', [['senang', 'Senang'], ['sedih', 'Sedih'], ['marah', 'Marah'], ['takut', 'Takut'], ['terkejut', 'Terkejut']], 'senang')] },
    { t: 'warna', n: 'Kotak warna / campuran warna', h: 'Warna: merah, kuning, biru, hijau, jingga, ungu, cokelat, putih, hitam, abu, merahmuda. Simbol: + = ?', f: [GT('i', 'Urutan', 'merah, +, kuning, =, ?', 'merah, +, kuning', gdaftar)] },
    { t: 'sudut', n: 'Sudut', f: [GN('d', 'Besar sudut (derajat)', 5, 175, 60), GS('s', 'Besar sudut ditulis?', [['', 'Tidak'], ['tampil', 'Ya']], '')] },
    { t: 'uang', n: 'Uang rupiah', h: 'Koin: 100, 200, 500, 1000. Lembaran: 2000, 5000, 10000, 20000, 50000, 100000.', f: [GT('i', 'Nominal', '5000, 2000, 500', 'mis. 5000, 2000', gdaftar)] },
    { t: 'termometer', n: 'Termometer', f: [GN('s', 'Suhu (0-100 derajat Celsius)', 0, 100, 60)] },
    { t: 'rangkaian', n: 'Rangkaian listrik', f: [GS('s', 'Saklar', [['tutup', 'Tertutup (lampu menyala)'], ['buka', 'Terbuka (lampu padam)']], 'tutup')] },
    { t: 'magnet', n: 'Dua magnet', h: 'US = kiri kutub utara, kanan kutub selatan; SU sebaliknya.', f: [GS('a', 'Magnet kiri', [['US', 'U - S'], ['SU', 'S - U']], 'US'), GS('b', 'Magnet kanan', [['US', 'U - S'], ['SU', 'S - U']], 'SU')] },
    { t: 'daur', n: 'Daur hidup', f: [GS('j', 'Hewan', [['kupu', 'Kupu-kupu'], ['katak', 'Katak']], 'kupu'), GN('h', 'Tahap yang ditanyakan (0 = tidak ada)', 0, 4, 3)] },
    { t: 'rantai', n: 'Rantai makanan', h: 'Nama ikon: rumput, padi, belalang, katak, ular, elang, tikus, ikan, ayam, kucing. Pakai ? untuk yang ditanyakan.', f: [GT('i', 'Urutan', 'rumput, belalang, ?, ular', 'rumput, belalang, katak', gdaftar)] },
    { t: 'tumbuhan', n: 'Bagian tumbuhan (penunjuk A)', f: [GS('b', 'Bagian yang ditunjuk huruf A', [['akar', 'Akar'], ['batang', 'Batang'], ['daun', 'Daun'], ['bunga', 'Bunga']], 'akar')] },
    { t: 'ruang', n: 'Bangun ruang', f: [GS('b', 'Bentuk', [['kubus', 'Kubus'], ['balok', 'Balok'], ['tabung', 'Tabung'], ['kerucut', 'Kerucut'], ['bola', 'Bola'], ['limas', 'Limas segi empat']], 'kubus')] },
    { t: 'jaring', n: 'Jaring-jaring (susunan persegi)', h: 'Tulis koordinat tiap persegi sebagai kolom lalu baris (mulai 0), dipisah koma. Contoh jaring silang kubus: 10,01,11,21,12,13', f: [GT('c', 'Koordinat', '10,01,11,21,12,13', '10,01,11,21,12,13', v => [String(v).replace(/\s+/g, '')])] },
    { t: 'bulan', n: 'Fase bulan', f: [GS('f', 'Fase', [['baru', 'Bulan baru'], ['sabit', 'Bulan sabit'], ['separuh', 'Separuh'], ['cembung', 'Cembung'], ['purnama', 'Purnama']], 'sabit'), GS('a', 'Sisi yang terang', [['', 'Kanan'], ['kiri', 'Kiri']], '')] }
  ];
  const gbrSih = v => String(v).replace(/[;\[\]]/g, '');
  function gbrParam(kat, ambil) {
    const v = {}; kat.f.forEach(f => { v[f.id] = ambil(f.id); });
    let p = kat.b ? kat.b(v) : [].concat.apply([], kat.f.map(f => f.k === 't' && f.x ? f.x(v[f.id]) : [v[f.id]]));
    p = p.map(gbrSih); while (p.length && p[p.length - 1] === '') p.pop(); return p;
  }
  function bukaGbr(i, k) {
    const sl = S.slots[S.sem], x = sl && sl[i]; if (!x) return;
    const tutupM = () => { const m = document.getElementById('gbrModal'); if (m) m.remove(); };
    tutupM();
    const m = document.createElement('div'); m.id = 'gbrModal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Sisipkan gambar otomatis');
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100001;display:flex;align-items:center;justify-content:center;padding:10px;';
    m.innerHTML = `<div style="background:#fff;color:#111;border-radius:12px;padding:14px;width:min(600px,96vw);max-height:92vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3);">
      <div style="font-weight:700;font-size:15px;margin-bottom:2px;">🖼 Sisipkan gambar otomatis</div>
      <div style="${muted}margin-bottom:8px;">Gambar dibuat dari isian di bawah dan disisipkan sebagai penanda <code>[[g:...]]</code> pada ${k === 'q' ? 'teks soal' : 'pilihan ' + HURUF[+k[1]]}. Jangan hapus penanda itu bila gambar ingin tetap ada.</div>
      <label style="font-size:12px;font-weight:600;">Jenis gambar</label>
      <select id="gbrTipe" class="field" style="width:100%;box-sizing:border-box;margin-bottom:8px;">${GKAT.map(z => `<option value="${z.t}">${esc(z.n)}</option>`).join('')}</select>
      <div id="gbrForm"></div>
      <div style="font-size:12px;font-weight:600;margin:8px 0 2px;">Pratinjau</div>
      <div id="gbrPrev" style="min-height:70px;padding:8px;border:1px dashed #cbd5e1;border-radius:8px;background:#fafafa;overflow:auto;"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;"><button type="button" class="btn btn-soft" id="gbrBatal" style="padding:6px 14px;font-size:13px;">Batal</button><button type="button" class="btn" id="gbrOk" style="padding:6px 14px;font-size:13px;">Sisipkan</button></div></div>`;
    document.body.appendChild(m);
    const tipe = m.querySelector('#gbrTipe'), form = m.querySelector('#gbrForm'), prev = m.querySelector('#gbrPrev');
    const kat = () => GKAT.filter(z => z.t === tipe.value)[0];
    const ambil = id => { const el = form.querySelector('[data-gf="' + id + '"]'); return el ? String(el.value).trim() : ''; };
    const hitung = () => { const kt = kat(); const p = gbrParam(kt, ambil); return { kt, p, tok: '[[g:' + [kt.t].concat(p).join(';') + ']]' }; };
    const segar = () => { const r = hitung(), s = gbrSvg(r.kt.t, r.p); prev.innerHTML = s ? '<span style="display:inline-block;max-width:100%;">' + s + '</span>' : '<span style="' + muted + '">Isian belum lengkap atau di luar batas.</span>'; m.querySelector('#gbrOk').disabled = !s; };
    const bentuk = () => { const kt = kat(); form.innerHTML = (kt.h ? `<div style="${muted}margin-bottom:6px;">${esc(kt.h)}</div>` : '') + kt.f.map(f => {
      const lab = `<label style="font-size:12px;display:block;margin-top:6px;">${esc(f.l)}</label>`;
      if (f.k === 's') return lab + `<select class="field" style="width:100%;box-sizing:border-box;" data-gf="${f.id}">${f.o.map(o => `<option value="${esc(o[0])}"${o[0] === f.d ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
      if (f.k === 'n') return lab + `<input class="field" type="number" step="any" min="${f.a}" max="${f.b}" value="${f.d}" style="width:100%;box-sizing:border-box;" data-gf="${f.id}">`;
      return lab + `<input class="field" maxlength="120" value="${esc(f.d || '')}" placeholder="${esc(f.h || '')}" style="width:100%;box-sizing:border-box;" data-gf="${f.id}">`; }).join(''); segar(); };
    tipe.addEventListener('change', bentuk); form.addEventListener('input', segar); form.addEventListener('change', segar);
    m.addEventListener('click', e => { if (e.target === m || e.target.id === 'gbrBatal') tutupM(); });
    m.addEventListener('keydown', e => { if (e.key === 'Escape') tutupM(); });
    m.querySelector('#gbrOk').addEventListener('click', () => {
      const r = hitung(); if (!gbrSvg(r.kt.t, r.p)) return;
      const el = document.querySelector('#soalOverlay [data-i="' + i + '"][data-k="' + k + '"]'); if (!el) return tutupM();
      const v = String(el.value), maks = +el.getAttribute('maxlength') || 600;
      if (v.length + r.tok.length > maks) { say('Teks sudah terlalu panjang untuk menampung gambar. Persingkat dulu teksnya.', true); return; }
      const pos = typeof el.selectionStart === 'number' && document.activeElement === el ? el.selectionStart : v.length;
      el.value = v.slice(0, pos) + r.tok + v.slice(pos); sinkron(); S.dirty = true; tutupM(); gambar();
    });
    bentuk(); tipe.focus();
  }

  function klik(e) {
    const t = e.target.closest ? e.target.closest('[data-a]') : null; if (!t) return;
    const a = t.getAttribute('data-a');
    if (a !== 'tutup') sinkron();
    if (S.ro && MUT.indexOf(a) >= 0) return say('Mode lihat saja: hanya pemilik yang bisa mengubah.', true);
    switch (a) {
      case 'tutup': return tutup();
      case 'sem': S.sem = t.getAttribute('data-s') === 'genap' ? 'genap' : 'ganjil'; return gambar();
      case 'bank': { const n = isiDariBank(S.slots[S.sem], window.BANK_SOAL_MI, S.rec && S.rec.kelas); if (n) S.dirty = true; say(n ? '✅ ' + n + ' soal diisi dari bank (draf, mohon diperiksa). Sisanya diketik guru.' : 'Tidak ada soal bank yang cocok untuk slot kosong. Ketik soal sendiri.', !n); return gambar(); }
      case 'ganti': ganti(+t.getAttribute('data-i')); return gambar();
      case 'gbr': return bukaGbr(+t.getAttribute('data-i'), t.getAttribute('data-k') || 'q');
      case 'skor100': {
        const h = skor100(S.sem);
        if (!h) { say('Tidak bisa tepat 100 dengan skor bulat untuk jumlah soal ini. Atur manual; nilai akhir tetap dikonversi ke skala 100 oleh rumus.', true, 4000); return gambar(); }
        S.skor = { pg: String(h.pg), is: String(h.is), ur: String(h.ur) }; S.dirty = true;
        say('✅ Skor diatur: PG ' + h.pg + ', isian ' + h.is + ', uraian ' + h.ur + ' (total 100)'); return gambar();
      }
      case 'simpan': return simpan();
      case 'cetak-kartu': return cetak('kartu');
      case 'cetak-naskah2': return cetak('naskah', undefined, true);
      case 'cetak-naskah': return cetak('naskah');
      case 'cetak-kunci': return cetak('kunci');
      case 'word-kartu': return cetak('kartu', 'word');
      case 'word-naskah': return cetak('naskah', 'word');
      case 'word-kunci': return cetak('kunci', 'word');
      case 'cetak-telaah': return cetak('telaah');
      case 'word-telaah': return cetak('telaah', 'word');
    }
  }

  function muat() {
    const ep = ++S.epoch; S.loading = true; S.err = null; gambar();
    if (typeof db === 'undefined' || !db) { S.loading = false; S.err = 'Database belum siap.'; return gambar(); }
    const baca = p => db.ref(p).once('value');
    return Promise.all([baca('perangkat_kisi_v4/' + idSem('ganjil')), baca('perangkat_kisi_v4/' + idSem('genap')),
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
    S.id = id; S.rec = rec; S.ro = rec.guruKey !== myId(); S.ta = String(ta || ''); S.fase = fase(rec.kelas); S.sem = sem === 'genap' ? 'genap' : 'ganjil'; S.dirty = false;
    S.slots = { ganjil: [], genap: [] }; S.skor = { pg: '1', is: '2', ur: '5' }; S.yatim = { ganjil: 0, genap: 0 };
    try { S.nip = localStorage.getItem('rpe_nip_' + myId()) || ''; } catch (e) { S.nip = ''; }
    R().nipIsi(S, '#soalOverlay');
    muat();
  };
  // Cetak Paket: bangun HTML Kartu / Naskah / Kunci / Telaah ('kartu' | 'naskah' | 'kunci' | 'telaah') tanpa jendela dan tanpa menyimpan
  // (dipakai js/perangkat-paket.js). opsi.tanya = tanyakan konfirmasi bila ada soal belum lengkap (seperti tombol cetak biasa).
  window.soalPaket = function (id, rec, sem, ta, bagian, opsi) {
    if (!rec) return Promise.reject(new Error('Data mapel tidak ditemukan.'));
    if (!window.rpeUtil) return Promise.reject(new Error('Modul RPE belum dimuat.'));
    if (document.getElementById('soalOverlay')) return Promise.reject(new Error('Tutup dulu jendela Soal yang sedang terbuka.'));
    S.quiet = true; S.id = id; S.rec = rec; S.ro = rec.guruKey !== myId(); S.ta = String(ta || ''); S.fase = fase(rec.kelas); S.sem = sem === 'genap' ? 'genap' : 'ganjil'; S.dirty = false;
    S.slots = { ganjil: [], genap: [] }; S.skor = { pg: '1', is: '2', ur: '5' }; S.yatim = { ganjil: 0, genap: 0 }; S.nip = '';
    const s = S.sem, lepas = () => { S.quiet = false; S.rec = null; S.epoch++; };
    return R().nipMuat().catch(() => '').then(n => { S.nip = n || ''; return muat(); }).then(() => {
      if (S.err) throw new Error(S.err);
      if (!S.slots[s].length) throw new Error('Belum ada slot soal (buka Kisi-kisi, isi jumlah soal, lalu Simpan).');
      if (bagian !== 'telaah' && (!opsi || opsi.tanya !== false)) { if (!cekCetak(s)) throw new Error('Dibatalkan: soal belum lengkap.'); }
      const html = bagian === 'kartu' ? dokKartu(s) : bagian === 'naskah' ? dokNaskah(s, false) : bagian === 'telaah' ? dokTelaah(s) : dokKunci(s);
      lepas(); return { html: html, nama: bagian === 'kartu' ? 'Kartu Soal' : bagian === 'naskah' ? 'Naskah Soal' : bagian === 'telaah' ? 'Lembar Telaah' : 'Kunci' };
    }).catch(e => { lepas(); throw e; });
  };
  window.soalUtil = { acak: acak, buatSlot: buatSlot, isiDariBank: isiDariBank, urutKelas: urutKelas, lengkap: lengkap, dokKartu: dokKartu, dokNaskah: dokNaskah, dokKunci: dokKunci, dokTelaah: dokTelaah, state: S };
})();
