// ============================================================
// DOCX MINI -- js/docx-mini.js  (pembuat berkas Word .docx tanpa pustaka luar; jalan offline)
// Dipakai js/dokumen-kepala.js untuk kerangka RKJM / RKT / Laporan RKT. Berdiri sendiri (tidak butuh app.js).
//
// Blok yang dikenali (array objek):
//   {t:'judul', x}  judul besar rata tengah     {t:'sub', x}   baris tengah (mis. nama madrasah)
//   {t:'h1', x} {t:'h2', x}  judul bab / subbab {t:'p', x, b, c} paragraf (b = tebal, c = rata tengah)
//   {t:'petunjuk', x}  teks miring abu-abu (arahan pengisian; hapus setelah diisi)
//   {t:'daftar', items:[...]}  butir  {t:'tabel', head:[...], rows:[[...]], lebar:[...], kosong:n}
//   {t:'ttd', kolom:[{jabatan, nama, nip}]}  blok tanda tangan sejajar   {t:'br'} halaman baru   {t:'spasi', n}
// Keluaran: DocxMini.bytes(blocks, opsi) -> Uint8Array;  DocxMini.blob(blocks, opsi) -> Blob.
// ZIP ditulis tanpa kompresi (metode "stored"), cukup untuk Word & LibreOffice.
// ============================================================
(function () {
  'use strict';

  function x(s) {   // escape XML + buang karakter kontrol yang dilarang XML
    return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function run(teks, o) {
    o = o || {};
    var rpr = (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + (o.warna ? '<w:color w:val="' + o.warna + '"/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : '');
    var bagian = String(teks == null ? '' : teks).split('\n'), out = '';
    bagian.forEach(function (b, i) {
      if (i) out += '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '<w:br/></w:r>';
      out += '<w:r>' + (rpr ? '<w:rPr>' + rpr + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + x(b) + '</w:t></w:r>';
    });
    return out;
  }
  function para(teks, o) {
    o = o || {};
    var ppr = (o.style ? '<w:pStyle w:val="' + o.style + '"/>' : '') + (o.keep ? '<w:keepNext/>' : '') +
      (o.ind ? '<w:ind w:left="' + o.ind + '" w:hanging="' + (o.hang || 0) + '"/>' : '') +
      (o.spasi != null ? '<w:spacing w:before="' + o.spasi + '" w:after="0"/>' : '') + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : '');
    return '<w:p>' + (ppr ? '<w:pPr>' + ppr + '</w:pPr>' : '') + run(teks, o) + '</w:p>';
  }
  var BORDER = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="808080"/>'; }).join('') + '</w:tblBorders>';
  var NOBORDER = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="nil"/>'; }).join('') + '</w:tblBorders>';
  function sel(teks, w, o) {
    o = o || {};
    return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/>' + (o.shade ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>' : '') + '</w:tcPr>' +
      para(teks, { b: o.b, jc: o.jc, spasi: 0, sz: o.sz || 22 }) + '</w:tc>';
  }
  var LEBAR_TOTAL = 8789;   // lebar area tulis (dxa): A4 11906 - kiri 1701 - kanan 1416
  function tabel(blk) {
    var head = blk.head || [], n = head.length || ((blk.rows && blk.rows[0]) || []).length || 1;
    var lb = blk.lebar && blk.lebar.length === n ? blk.lebar : head.map(function () { return 100 / n; });
    var tot = lb.reduce(function (a, b) { return a + b; }, 0), w = lb.map(function (p) { return Math.round(p / tot * LEBAR_TOTAL); });
    var out = '<w:tbl><w:tblPr><w:tblW w:w="' + LEBAR_TOTAL + '" w:type="dxa"/>' + BORDER + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
      '<w:tblGrid>' + w.map(function (v) { return '<w:gridCol w:w="' + v + '"/>'; }).join('') + '</w:tblGrid>';
    if (head.length) out += '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + head.map(function (h, i) { return sel(h, w[i], { b: true, shade: 'E7E6E6', jc: 'center' }); }).join('') + '</w:tr>';
    var rows = (blk.rows || []).slice();
    for (var k = 0; k < (blk.kosong || 0); k++) rows.push(head.map(function () { return ''; }));
    rows.forEach(function (r) { out += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + w.map(function (v, i) { return sel(r[i] == null ? '' : r[i], v); }).join('') + '</w:tr>'; });
    return out + '</w:tbl>' + para('', { spasi: 0 });
  }
  function ttd(blk) {
    var kol = blk.kolom || [], n = kol.length || 1, w = Math.floor(LEBAR_TOTAL / n);
    var out = '<w:tbl><w:tblPr><w:tblW w:w="' + LEBAR_TOTAL + '" w:type="dxa"/>' + NOBORDER + '<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' + kol.map(function () { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>';
    kol.forEach(function (k) {
      out += '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' +
        (k.atas ? para(k.atas, { jc: 'center', spasi: 0 }) : para('', { spasi: 0 })) +
        para(k.jabatan || '', { jc: 'center', spasi: 0 }) + para('', { spasi: 0 }) + para('', { spasi: 0 }) + para('', { spasi: 0 }) + para('', { spasi: 0 }) +
        para(k.nama || '............................', { jc: 'center', b: true, spasi: 0 }) +
        (k.nip !== undefined ? para('NIP. ' + (k.nip || '............................'), { jc: 'center', spasi: 0 }) : '') + '</w:tc>';
    });
    return out + '</w:tr></w:tbl>' + para('', { spasi: 0 });
  }
  function isiBody(blocks) {
    var o = '';
    (blocks || []).forEach(function (b) {
      switch (b.t) {
        case 'judul': o += para(b.x, { style: 'Judul' }); break;
        case 'sub': o += para(b.x, { jc: 'center', b: !!b.b, sz: b.sz }); break;
        case 'h1': o += para(b.x, { style: 'Heading1' }); break;
        case 'h2': o += para(b.x, { style: 'Heading2' }); break;
        case 'p': o += para(b.x, { b: b.b, jc: b.c ? 'center' : 'both' }); break;
        case 'petunjuk': o += para(b.x, { style: 'Petunjuk' }); break;
        case 'daftar': (b.items || []).forEach(function (it, i) { o += para((b.nomor ? (i + 1) + '.\t' : '•\t') + it, { ind: 567, hang: 283 }); }); break;
        case 'tabel': o += tabel(b); break;
        case 'ttd': o += ttd(b); break;
        case 'br': o += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; break;
        case 'spasi': for (var i = 0; i < (b.n || 1); i++) o += para('', { spasi: 0 }); break;
      }
    });
    return o;
  }

  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  var HDR = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  function fileDokumen(blocks) {
    return HDR + '<w:document ' + NS + '><w:body>' + isiBody(blocks) +
      '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1416" w:bottom="1418" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>';
  }
  var STYLES = HDR + '<w:styles ' + NS + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Judul"><w:name w:val="Judul"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="240" w:after="240"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Petunjuk"><w:name w:val="Petunjuk Pengisian"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:i/><w:color w:val="7F7F7F"/></w:rPr></w:style></w:styles>';
  var FOOTER = HDR + '<w:ftr ' + NS + '><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
  var CT = HDR + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
  var RELS = HDR + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
  var DOCRELS = HDR + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
  function core(judul) {
    return HDR + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + x(judul || 'Dokumen') + '</dc:title><dc:creator>SI MAMBA</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</dcterms:created></cp:coreProperties>';
  }

  // ---------- ZIP (stored) ----------
  var CRC_T = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var e = unescape(encodeURIComponent(s)), o = new Uint8Array(e.length); for (var i = 0; i < e.length; i++) o[i] = e.charCodeAt(i); return o;
  }
  function zip(files) {
    var parts = [], central = [], offset = 0, DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
    files.forEach(function (f) {
      var nm = utf8(f.nama), d = utf8(f.isi), crc = crc32(d);
      var lh = new Uint8Array(30 + nm.length), v = new DataView(lh.buffer);
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true); v.setUint16(10, 0, true); v.setUint16(12, DATE, true);
      v.setUint32(14, crc, true); v.setUint32(18, d.length, true); v.setUint32(22, d.length, true); v.setUint16(26, nm.length, true); v.setUint16(28, 0, true); lh.set(nm, 30);
      var ch = new Uint8Array(46 + nm.length), c = new DataView(ch.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, DATE, true);
      c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, offset, true); ch.set(nm, 46);
      parts.push(lh, d); central.push(ch); offset += lh.length + d.length;
    });
    var csize = central.reduce(function (a, b) { return a + b.length; }, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    var all = parts.concat(central, [end]), tot = all.reduce(function (a, b) { return a + b.length; }, 0), out = new Uint8Array(tot), p = 0;
    all.forEach(function (b) { out.set(b, p); p += b.length; });
    return out;
  }

  function bytes(blocks, opsi) {
    opsi = opsi || {};
    return zip([
      { nama: '[Content_Types].xml', isi: CT }, { nama: '_rels/.rels', isi: RELS }, { nama: 'docProps/core.xml', isi: core(opsi.judul) },
      { nama: 'word/document.xml', isi: fileDokumen(blocks) }, { nama: 'word/styles.xml', isi: STYLES },
      { nama: 'word/footer1.xml', isi: FOOTER }, { nama: 'word/_rels/document.xml.rels', isi: DOCRELS }
    ]);
  }
  function blob(blocks, opsi) { return new Blob([bytes(blocks, opsi)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); }

  window.DocxMini = { bytes: bytes, blob: blob, _xml: fileDokumen };
})();
