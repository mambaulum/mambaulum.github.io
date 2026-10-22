/* ============================================================
   SI MAMBA - js/ttd-digital.js  (v4: penanda [[TTD:...]] bernonce per muat halaman, penanda tanpa nonce yang sah (mis. diketik pengguna di kolom isian) dibuang, bukan dijadikan QR; v3: TANDA TANGAN QR + gambar, PDF dan cetak HTML)
   Satu pintu untuk tanda tangan di SEMUA cetak PDF.

   Dimuat SETELAH js/app.js:
     <script src="js/ttd-digital.js?v=3"></script>

   Cara kerja tanda tangan QR:
   - Tiap kali PDF dicetak, dibuat kode unik (mis. SM-7K3FQ-9XDMA) dan satu catatan
     di Firebase `ttd_qr/{kode}`: jenis dokumen, keterangan, nama & jabatan penandatangan,
     tanggal cetak, pencetak.
   - QR di PDF berisi alamat  <alamat-aplikasi>/?verifikasi=KODE . Siapa pun yang memindai
     (tanpa login) melihat halaman verifikasi berisi catatan tersebut untuk dicocokkan
     dengan isi kertas.
   - Mode (Admin, Profil Sekolah): 'qr' | 'gambar' | 'keduanya'.

   API (window.TTD):
     TTD.tandai(doc, role, xTengah, yAtas, {lebar, tinggiMaks, meta:{jenis, ket}})
         -> tempel QR / gambar sesuai mode; mengembalikan tinggi yang terpakai (mm), 0 bila tak ada.
     TTD.blokPdf(doc, {role, x, y, atas, jabatan, nama, nip, labelNip, meta})  -> y akhir
     TTD.tambahAkhir(doc, {role, posisi, atas, meta})  -> blok Kepala di halaman terakhir
     TTD.penanda(role, meta, opsi) -> teks penanda untuk dokumen HTML cetak (sinkron)
     TTD.isiHtml(html)     -> Promise<html>: penanda diganti QR/gambar, catatan verifikasi dibuat
     TTD.htmlBlok(role, meta, opsi) -> Promise<html> satu blok TTD (QR/gambar sesuai mode)
     TTD.img(role, style)  -> <img> gambar TTD untuk pratinjau HTML
     TTD.muat(role)        -> Promise<dataURL|null>
   role: 'kepala' | 'bendahara' | 'umum'. 'umum' = penandatangan lain tanpa gambar (hanya QR);
         isi meta.nama dan meta.jabatan. meta boleh menimpa nama/jabatan/nip untuk semua role.
   Tambah jabatan lain = tambah entri ROLES.
============================================================ */
(function () {
  'use strict';

  var ROLES = {
    kepala: {
      label: 'Kepala Madrasah', node: 'school_assets/ttdKepala',
      nama: function () { return MADRASAH.kepala_sekolah || ''; },
      nip: function () { return MADRASAH.nip_kepala_sekolah || ''; },
      jabatan: function () { return 'Kepala ' + (MADRASAH.nama || 'Madrasah'); },
      labelNip: 'NIP.'
    },
    bendahara: {
      label: 'Bendahara', node: 'school_assets/ttdBendahara',
      nama: function () { return MADRASAH.bendahara || ''; },
      nip: function () { return MADRASAH.nip_bendahara || ''; },
      jabatan: function () { return 'Bendahara'; },
      labelNip: 'NIP/NUPTK.'
    }
  };

  ROLES.umum = {
    label: 'Penandatangan lain', node: null,
    nama: function () { return ''; }, nip: function () { return ''; },
    jabatan: function () { return 'Penandatangan'; }, labelNip: 'NIP.'
  };

  var NODE_CFG = 'school_settings/ttdQr';      // {mode, baseUrl}
  var NODE_REKAM = 'ttd_qr';                   // ttd_qr/{kode}
  var QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  var MAKS_UPLOAD = 1024 * 1024, MAKS_PX_SIMPAN = 400, MAKS_PX_PDF = 360;
  var MODE_BAWAAN = 'qr';

  var rawCache = {}, pdfCache = {}, cfgPromise = null, qrCache = {};

  function adaRole(r) { return !!ROLES[r]; }
  function pesanErr(e) { return e && e.message ? e.message : String(e); }

  // ================= GAMBAR TTD =================
  function muatMentah(role) {
    if (!adaRole(role) || !ROLES[role].node) return Promise.resolve('');
    if (role === 'kepala' && typeof ensureTtdKepala === 'function') return ensureTtdKepala().then(function (v) { return v || ''; });
    if (rawCache[role] !== undefined) return Promise.resolve(rawCache[role]);
    return db.ref(ROLES[role].node).once('value').then(function (snap) {
      var v = snap.val(); rawCache[role] = (v && v.base64) ? v.base64 : ''; return rawCache[role];
    }).catch(function (e) { console.warn('[SI MAMBA] Gagal memuat TTD ' + role + ':', pesanErr(e)); return ''; });
  }
  function perkecil(dataUrl, maxPx) {
    return new Promise(function (resolve) {
      if (!dataUrl) return resolve(null);
      var im = new Image();
      im.onload = function () {
        try {
          var r = Math.min(1, maxPx / Math.max(im.naturalWidth, im.naturalHeight));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * r)); c.height = Math.max(1, Math.round(im.naturalHeight * r));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(dataUrl); }
      };
      im.onerror = function () { resolve(null); };
      im.src = dataUrl;
    });
  }
  function muat(role) {
    return muatMentah(role).then(function (src) {
      if (!src) return null;
      var c = pdfCache[role];
      if (c && c.src === src) return c.out;
      return perkecil(src, MAKS_PX_PDF).then(function (out) { pdfCache[role] = { src: src, out: out }; return out; });
    });
  }
  function img(role, style) {
    var src = role === 'kepala' ? (MADRASAH.ttdKepalaBase64 || '') : (rawCache[role] || '');
    if (!src) return '';
    return '<img src="' + src + '" alt="Tanda tangan ' + ROLES[role].label + '" style="' + (style || 'max-height:45px;display:block;margin:6px auto;') + '">';
  }

  // ================= PENGATURAN (mode & alamat aplikasi) =================
  function alamatBawaan() { return location.origin + location.pathname.replace(/index\.html$/i, ''); }
  function config(paksa) {
    if (!cfgPromise || paksa) {
      cfgPromise = db.ref(NODE_CFG).once('value').then(function (snap) {
        var v = snap.val() || {};
        return {
          mode: (v.mode === 'gambar' || v.mode === 'keduanya' || v.mode === 'qr') ? v.mode : MODE_BAWAAN,
          baseUrl: (v.baseUrl || '').trim() || alamatBawaan()
        };
      }).catch(function () { cfgPromise = null; return { mode: MODE_BAWAAN, baseUrl: alamatBawaan() }; });
    }
    return cfgPromise;
  }

  // ================= QR =================
  function ensureQr() {
    if (typeof QRCode !== 'undefined') return Promise.resolve();
    var muatScript = (typeof _loadScriptOnce === 'function') ? _loadScriptOnce : function (src) {
      return new Promise(function (ok, gagal) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { gagal(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); });
    };
    return muatScript(QR_LIB).then(function () { if (typeof QRCode === 'undefined') throw new Error('Pustaka QR belum siap'); });
  }
  // Teks -> dataURL PNG QR dengan zona tenang putih (wajib agar mudah terbaca kamera).
  function qrGambar(teks) {
    return ensureQr().then(function () {
      return new Promise(function (resolve, reject) {
        var tmp = document.createElement('div');
        tmp.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(tmp);
        try { new QRCode(tmp, { text: teks, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M }); }
        catch (e) { document.body.removeChild(tmp); return reject(e); }
        var coba = 0;
        (function ambil() {
          var cv = tmp.querySelector('canvas'), im = tmp.querySelector('img');
          if (cv) {
            var pad = 24, out = document.createElement('canvas');
            out.width = out.height = cv.width + pad * 2;
            var cx = out.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, out.width, out.height); cx.drawImage(cv, pad, pad);
            document.body.removeChild(tmp); return resolve(out.toDataURL('image/png'));
          }
          if (im && im.src) { var d = im.src; document.body.removeChild(tmp); return resolve(d); }
          if (++coba > 20) { document.body.removeChild(tmp); return reject(new Error('QR tidak terbentuk')); }
          setTimeout(ambil, 50);
        })();
      });
    });
  }
  var ABJAD = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // tanpa 0/O/1/I/L agar mudah dibaca manual
  function kodeBaru() {
    var b = new Uint8Array(10);
    (window.crypto || window.msCrypto).getRandomValues(b);
    var s = ''; for (var i = 0; i < b.length; i++) s += ABJAD.charAt(b[i] % ABJAD.length);
    return 'SM-' + s.slice(0, 5) + '-' + s.slice(5);
  }
  // Nama pencetak untuk halaman verifikasi: akun Kepala = nama orangnya (Pengaturan Madrasah), bukan jabatan.
  function namaPencetak() {
    var u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
    var kep = typeof isKepsek === 'function' && isKepsek(), adm = typeof isAdmin === 'function' && isAdmin();
    var nk = String((typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.kepala_sekolah) || '').trim();
    return (kep && !adm && nk) ? nk : ((u && u.name) || '');
  }
  // Membuat kode + catatan verifikasi untuk satu penandatangan pada satu dokumen. Satu dokumen+role = satu kode.
  function buatQr(doc, role, meta) {
    doc.__ttdKode = doc.__ttdKode || {};
    if (doc.__ttdKode[role]) return doc.__ttdKode[role];
    var p = config().then(function (cfg) {
      var kode = kodeBaru(), r = ROLES[role];
      var rekam = {
        jenis: String(meta.jenis || doc.__ttdJudul || 'Dokumen').slice(0, 120),
        ket: String(meta.ket || doc.__ttdInfo || '').slice(0, 240),
        penandatangan: String(meta.nama != null ? meta.nama : r.nama()).slice(0, 120),
        jabatan: String(meta.jabatan || r.jabatan()).slice(0, 120),
        nip: String(meta.nip != null ? meta.nip : (r.nip() || '')).slice(0, 40),
        madrasah: String(MADRASAH.nama || '').slice(0, 150),
        tanggal: new Date().toISOString(),
        dicetakOleh: String(namaPencetak()).slice(0, 100)
      };
      if (/^[0-9A-F]{64}$/.test(meta.sidik || '')) rekam.sidik = meta.sidik;
      // Tidak ditunggu: saat offline Firebase menyimpan antrean dan mengirim begitu online (QR baru valid setelah tersinkron).
      db.ref(NODE_REKAM + '/' + kode).set(rekam).catch(function (e) {
        console.error('[SI MAMBA] Gagal menyimpan catatan tanda tangan QR:', pesanErr(e));
        toast('⚠️ Catatan verifikasi QR gagal tersimpan (' + pesanErr(e) + '). QR pada PDF ini belum bisa diverifikasi.', true, 6000);
      });
      var url = cfg.baseUrl.replace(/[?#].*$/, '').replace(/index\.html$/i, '').replace(/\/?$/, '/') + '?verifikasi=' + encodeURIComponent(kode);
      return qrGambar(url).then(function (data) { return { kode: kode, data: data }; });
    });
    doc.__ttdKode[role] = p;
    // Bila gagal, jangan simpan kegagalannya: cetak ulang pada dokumen yang sama boleh mencoba lagi.
    p.catch(function () { if (doc.__ttdKode && doc.__ttdKode[role] === p) delete doc.__ttdKode[role]; });
    return p;
  }

  // ================= TEMPEL KE PDF =================
  function tempelGambar(doc, data, cx, y, lebar, tinggiMaks) {
    var p = doc.getImageProperties(data);
    var h = Math.min(tinggiMaks, lebar * (p.height / p.width));
    var w = Math.min(lebar, h * (p.width / p.height));
    doc.addImage(data, 'PNG', cx - w / 2, y, w, h, undefined, 'FAST');
    return { w: w, h: h };
  }
  // Simpan/pulihkan gaya teks supaya pemanggil tidak perlu mengatur ulang font setelah menempel QR.
  function simpanGaya(doc) {
    var g = {};
    try { g.ukuran = doc.getFontSize(); } catch (e) {}
    try { g.warna = doc.getTextColor(); } catch (e) {}
    try { var f = doc.getFont(); g.nama = f.fontName; g.gaya = f.fontStyle; } catch (e) {}
    return g;
  }
  function pulihGaya(doc, g) {
    try { if (g.nama) doc.setFont(g.nama, g.gaya || 'normal'); } catch (e) {}
    try { if (g.ukuran) doc.setFontSize(g.ukuran); } catch (e) {}
    try { if (g.warna != null) doc.setTextColor(g.warna); else doc.setTextColor(0); } catch (e) {}
  }
  // Mengembalikan tinggi terpakai (mm).
  async function tandai(doc, role, xTengah, yAtas, opsi) {
    var gaya = simpanGaya(doc);
    try { return await tandaiInti(doc, role, xTengah, yAtas, opsi); }
    finally { pulihGaya(doc, gaya); }
  }
  // Admin atau Kepsek yang sedang login. Dipakai opsi.hanyaPimpinan: dokumen yang dicetak guru/petugas lain tidak memuat QR Kepala.
  function bolehPimpinan() {
    try { return (typeof isAdmin === 'function' && !!isAdmin()) || (typeof isKepsek === 'function' && !!isKepsek()); } catch (e) { return false; }
  }
  async function tandaiInti(doc, role, xTengah, yAtas, opsi) {
    opsi = opsi || {};
    if (!adaRole(role)) return 0;
    if (opsi.hanyaPimpinan && !bolehPimpinan()) return 0;
    var lebar = opsi.lebar || 32, maksH = opsi.tinggiMaks || 18;
    var cfg = await config();
    var mauQr = cfg.mode === 'qr' || cfg.mode === 'keduanya';
    var mauGambar = cfg.mode === 'gambar' || cfg.mode === 'keduanya';

    var qr = null;
    if (mauQr) {
      try { qr = await buatQr(doc, role, opsi.meta || {}); }
      catch (e) { console.error('[SI MAMBA] Gagal membuat QR tanda tangan:', e); toast('⚠️ QR tanda tangan gagal dibuat (' + pesanErr(e) + '). Memakai gambar tanda tangan bila ada.', true, 5000); }
    }
    var ttd = null;
    if (mauGambar || (mauQr && !qr)) ttd = await muat(role);      // QR gagal -> cadangkan ke gambar

    var s = Math.max(10, Math.min(maksH - 4, 16));                 // sisi QR (mm); sisakan 4 mm untuk baris kode
    var terpakai = 0;
    try {
      if (qr && ttd) {                                             // keduanya: gambar kiri, QR kanan
        var p = doc.getImageProperties(ttd);
        var h = Math.min(maksH, (lebar * 0.75) * (p.height / p.width));
        var w = Math.min(lebar * 0.75, h * (p.width / p.height));
        var total = w + 3 + s, x0 = xTengah - total / 2;
        doc.addImage(ttd, 'PNG', x0, yAtas, w, h, undefined, 'FAST');
        doc.addImage(qr.data, 'PNG', x0 + w + 3, yAtas, s, s, undefined, 'FAST');
        poinKode(doc, qr.kode, x0 + w + 3 + s / 2, yAtas + s + 2.6);
        terpakai = Math.max(h, s + 3.2);
      } else if (qr) {
        doc.addImage(qr.data, 'PNG', xTengah - s / 2, yAtas, s, s, undefined, 'FAST');
        poinKode(doc, qr.kode, xTengah, yAtas + s + 2.6);
        terpakai = s + 3.2;
      } else if (ttd) {
        terpakai = tempelGambar(doc, ttd, xTengah, yAtas, lebar, maksH).h;
      }
    } catch (e) { console.error('[SI MAMBA] Gagal menempel tanda tangan (' + role + ') ke PDF:', e); }
    return terpakai;
  }
  function poinKode(doc, kode, x, y) {
    doc.setFont(undefined, 'normal'); doc.setFontSize(5.5); doc.setTextColor(90);
    doc.text(kode, x, y, { align: 'center' });
  }

  async function blokPdf(doc, opsi) {
    var role = opsi.role || 'kepala', r = ROLES[role] || ROLES.kepala;
    var x = opsi.x, y = opsi.y, fs = opsi.fontSize || 10;
    var nama = opsi.nama != null ? opsi.nama : r.nama();
    var nip = opsi.nip != null ? opsi.nip : r.nip();
    var jabatan = opsi.jabatan != null ? opsi.jabatan : r.jabatan();
    var labelNip = opsi.labelNip || r.labelNip;
    doc.setFontSize(fs); doc.setFont(undefined, 'normal'); doc.setTextColor(0);
    if (opsi.atas) { doc.text(opsi.atas, x, y, { align: 'center' }); y += 5; }
    doc.text(jabatan, x, y, { align: 'center' });
    var metaBlok = Object.assign({ nama: nama, jabatan: jabatan, nip: nip }, opsi.meta || {});
    var h = await tandai(doc, role, x, y + 3, { lebar: opsi.lebar || 32, tinggiMaks: opsi.tinggiMaks || 22, meta: metaBlok });
    var yNama = y + 3 + Math.max(h, 16) + 4;
    doc.setFontSize(fs); doc.setFont(undefined, 'bold'); doc.setTextColor(0);
    doc.text(nama || '(.............................)', x, yNama, { align: 'center' });
    doc.setFont(undefined, 'normal');
    var nipOk = nip && String(nip).trim() !== '' && String(nip).trim() !== '-';
    if (nipOk) { doc.text(labelNip + ' ' + nip, x, yNama + 5, { align: 'center' }); return yNama + 5; }
    return yNama;
  }
  async function tambahAkhir(doc, opsi) {
    opsi = opsi || {};
    var pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    var y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 60) + 12;
    if (y + 50 > ph - 12) { doc.addPage(); y = 25; }
    var x = opsi.posisi === 'tengah' ? pw / 2 : pw - 55;
    await blokPdf(doc, { role: opsi.role || 'kepala', x: x, y: y, atas: opsi.atas, meta: opsi.meta });
    doc.setTextColor(0);
  }


  // ================= SIDIK ISI (SHA-256 teks dokumen) =================
  // Teks tampak dokumen dinormalkan (tanpa tag/gaya, tanpa kode QR & sidik yang dicetak, semua spasi dibuang) lalu di-hash.
  // Fungsi yang sama dipakai saat mencetak dan saat mencocokkan berkas di halaman verifikasi, jadi hasilnya harus identik.
  function normTeks(html) {
    var d = new DOMParser().parseFromString(String(html == null ? '' : html).replace(/\ufeff/g, ''), 'text/html');
    Array.prototype.forEach.call(d.querySelectorAll('style,script,title,head'), function (n) { n.remove(); });
    return (d.body ? d.body.textContent : '')
      .replace(/SM-[A-Z0-9]{5}-[A-Z0-9]{5}/g, '').replace(/Sidik\s*[0-9A-F]{8}/g, '')
      .replace(/[\s\u00a0]+/g, '');   // semua spasi dibuang: tag yang diganti blok QR tidak boleh mengubah hasil
  }
  function sidikDari(html) {
    try {
      if (!(window.crypto && window.crypto.subtle && window.TextEncoder)) return Promise.resolve('');
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normTeks(html))).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').toUpperCase();
      }).catch(function () { return ''; });
    } catch (e) { return Promise.resolve(''); }
  }

  // ================= CETAK HTML (jendela cetak: ujian, rapat, modul ajar, dst.) =================
  // Alur: builder HTML menaruh penanda lewat TTD.penanda(...); sebelum ditulis ke jendela cetak, panggil
  // TTD.isiHtml(html) agar penanda diganti QR/gambar. Buka jendela (window.open) LEBIH DULU secara sinkron
  // supaya tidak diblokir popup, lalu tulis isinya setelah isiHtml selesai.
  // Nonce acak per muat halaman: hanya penanda buatan penanda() yang diganti QR/gambar. Teks pengguna yang kebetulan berbentuk
  // [[TTD:...]] tidak punya nonce ini, jadi tidak bisa memalsukan blok tanda tangan Kepala. '~' tidak di-encode encodeURIComponent.
  var NONCE = (function () { var b = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(b); return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); })();
  function penanda(role, meta, opsi) {
    // encodeURIComponent membiarkan ! ' ( ) * apa adanya (mis. "Ma'ruf", "(S.Pd)"); ubah ke %XX agar penanda tetap utuh.
    var kode = encodeURIComponent(JSON.stringify({ m: meta || {}, o: opsi || {} }))
      .replace(/[!'()*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); });
    return '[[TTD:' + role + ':' + kode + '~' + NONCE + ']]';
  }
  async function htmlBlok(role, meta, opsi) {
    meta = meta || {}; opsi = opsi || {};
    if (!adaRole(role)) return '';
    if (opsi.hanyaPimpinan && !bolehPimpinan()) return '';
    // opsi.syarat = path RTDB berisi {oleh, at}: tanpa catatan itu (belum disetujui) blok dibiarkan kosong.
    if (opsi.syarat) {
      var set = null;
      var galat = '';
      try { set = (await db.ref(opsi.syarat).once('value')).val(); } catch (e) { set = null; galat = pesanErr(e); }
      if (!set || !set.oleh) {
        // Diagnosa: blok Kepala kosong karena belum ada catatan persetujuan di path ini, atau path gagal dibaca (Rules).
        console.warn('[SI MAMBA] QR Kepala tidak terbit. Path: ' + opsi.syarat + ' | ' + (galat ? 'GAGAL DIBACA: ' + galat : 'catatan persetujuan tidak ada'));
        if (!htmlBlok.__sudahToast) { htmlBlok.__sudahToast = true; toast(galat ? '⚠️ QR Kepala tidak terbit: gagal membaca persetujuan (' + galat + ').' : 'ℹ️ QR Kepala tidak terbit: dokumen ini belum disetujui Kepala/Admin (cek semester dan dokumen yang dicetak).', true, 6000); setTimeout(function () { htmlBlok.__sudahToast = false; }, 8000); }
        return '';
      }
      meta = Object.assign({}, meta, { ket: ('Disetujui ' + (set.peran === 'Admin' ? 'atas nama ' + set.oleh + ' (diinput Admin)' : 'oleh ' + set.oleh) + ' (' + tglId(set.at) + ')' + (meta.ket ? ' | ' + meta.ket : '')) });
    }
    if (opsi.sidik) meta = Object.assign({}, meta, { sidik: opsi.sidik });
    var mm = opsi.mm || 18;
    var cfg = await config();
    var mauQr = cfg.mode === 'qr' || cfg.mode === 'keduanya';
    var mauGambar = cfg.mode === 'gambar' || cfg.mode === 'keduanya';
    var qr = null;
    if (mauQr) {
      try { qr = await buatQr({}, role, meta); }
      catch (e) { console.error('[SI MAMBA] Gagal membuat QR tanda tangan:', e); toast('⚠️ QR tanda tangan gagal dibuat (' + pesanErr(e) + ').', true, 5000); }
    }
    var g = null;
    if (mauGambar || (mauQr && !qr)) g = await muat(role);
    var bagian = [];
    if (g) bagian.push('<img src="' + g + '" alt="" style="height:' + mm + 'mm;max-width:' + Math.round(mm * 2.4) + 'mm;object-fit:contain;">');
    if (qr) bagian.push('<span style="display:inline-block;text-align:center;line-height:1.1;"><img src="' + qr.data + '" alt="QR verifikasi" style="width:' + mm + 'mm;height:' + mm + 'mm;display:block;"><span style="font-size:6.5pt;color:#555;letter-spacing:.2px;">' + qr.kode + (meta.sidik ? '<br>Sidik ' + meta.sidik.slice(0, 8) : '') + '</span></span>');
    if (!bagian.length) return '';
    return '<div style="display:inline-flex;align-items:flex-end;justify-content:center;gap:3mm;">' + bagian.join('') + '</div>';
  }
  async function isiHtml(html) {
    var re = /\[\[TTD:([a-z_]+):([^\]\s]+)\]\]/g, daftar = [], m;
    while ((m = re.exec(html))) daftar.push({ teks: m[0], role: m[1], data: m[2] });
    if (!daftar.length) return html;
    var sidik = await sidikDari(html.replace(/\[\[TTD:[a-z_]+:[^\]\s]+\]\]/g, ''));
    var hasil = await Promise.all(daftar.map(function (d) {
      var i = d.data.lastIndexOf('~');
      if (i < 1 || d.data.slice(i + 1) !== NONCE) return Promise.resolve('');     // bukan buatan penanda(): dibuang
      var p; try { p = JSON.parse(decodeURIComponent(d.data.slice(0, i))); } catch (e) { return Promise.resolve(''); }
      return htmlBlok(d.role, p.m, Object.assign({}, p.o, { sidik: sidik })).catch(function () { return ''; });
    }));
    daftar.forEach(function (d, i) { html = html.split(d.teks).join(hasil[i]); });
    return html;
  }

  // ================= UNGGAH / HAPUS GAMBAR (Admin) =================
  function olahFile(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\/(png|jpe?g)$/.test(file.type)) return reject(new Error('File harus berupa gambar PNG/JPG.'));
      if (file.size > MAKS_UPLOAD) return reject(new Error('Ukuran file maksimal 1MB.'));
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Gagal membaca file.')); };
      fr.onload = function (e) {
        var im = new Image();
        im.onerror = function () { reject(new Error('Gagal membaca gambar.')); };
        im.onload = function () {
          try {
            var s = Math.min(1, MAKS_PX_SIMPAN / im.naturalWidth), c = document.createElement('canvas');
            c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); resolve(c.toDataURL('image/png'));
          } catch (err) { reject(err); }
        };
        im.src = e.target.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function upload(role, event) {
    if (!isAdmin()) return toast('Hanya Admin!', true);
    var input = event.target, file = input.files && input.files[0];
    if (!file) return;
    if (role === 'kepala' && typeof uploadTandaTanganKepala === 'function') return uploadTandaTanganKepala(event);
    input.disabled = true; toast('⏳ Memproses tanda tangan...', false, 2000);
    olahFile(file).then(function (b64) {
      return db.ref(ROLES[role].node).set({ base64: b64, updatedBy: currentUser.name, updatedAt: new Date().toISOString() })
        .then(function () { rawCache[role] = b64; delete pdfCache[role]; });
    }).then(function () {
      toast('✅ Tanda tangan ' + ROLES[role].label + ' berhasil disimpan!'); addLog('upload_ttd_' + role, ROLES[role].nama());
    }).catch(function (e) { toast('Gagal: ' + pesanErr(e), true); })
      .then(function () { input.disabled = false; input.value = ''; render(); });
  }
  function hapus(role) {
    if (!isAdmin()) return toast('Hanya Admin!', true);
    if (role === 'kepala' && typeof hapusTandaTanganKepala === 'function') return hapusTandaTanganKepala();
    if (!doubleConfirm('Hapus gambar tanda tangan ' + ROLES[role].label + '?')) return;
    db.ref(ROLES[role].node).remove().then(function () {
      rawCache[role] = ''; delete pdfCache[role]; toast('✅ Gambar tanda tangan dihapus.'); addLog('hapus_ttd_' + role, ''); render();
    }).catch(function (e) { toast('Gagal: ' + pesanErr(e), true); });
  }
  function simpanPengaturan() {
    if (!isAdmin()) return toast('Hanya Admin!', true);
    var rb = document.querySelector('input[name="ttdMode"]:checked');
    var mode = rb ? rb.value : MODE_BAWAAN;
    var url = (document.getElementById('ttdBaseUrl').value || '').trim();
    if (url && !/^https?:\/\/[^\s]+$/i.test(url)) return toast('⚠️ Alamat aplikasi harus diawali http:// atau https://', true);
    db.ref(NODE_CFG).set({ mode: mode, baseUrl: url, updatedBy: currentUser.name, updatedAt: new Date().toISOString() }).then(function () {
      config(true); toast('✅ Pengaturan tanda tangan disimpan.'); addLog('simpan_ttd_qr', mode);
    }).catch(function (e) { toast('Gagal: ' + pesanErr(e), true); });
  }

  // ================= KARTU PENGATURAN (Profil Sekolah) =================
  function kartuRole(role) {
    var r = ROLES[role], src = role === 'kepala' ? (MADRASAH.ttdKepalaBase64 || '') : (rawCache[role] || ''), nama = r.nama();
    var pr = src ? '<img src="' + src + '" alt="TTD ' + r.label + '" style="max-height:50px;max-width:160px;display:block;margin-bottom:6px;background:white;border-radius:4px;padding:4px;">'
                 : '<p class="text-muted" style="font-size:12px;margin-bottom:6px;">Belum ada gambar (opsional bila memakai QR saja).</p>';
    return '<div style="padding:8px 0;border-top:1px solid #d1fae5;"><p style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:4px;">Gambar TTD ' + r.label + (nama ? ' — ' + escapeHtml(nama) : '') + '</p>' + pr +
      '<input type="file" accept="image/png,image/jpeg" onchange="TTD.upload(\'' + role + '\', event)" style="font-size:12px;">' +
      (src ? ' <button class="btn btn-danger" style="padding:2px 10px;font-size:11px;margin-left:8px;" onclick="TTD.hapus(\'' + role + '\')">🗑️ Hapus</button>' : '') + '</div>';
  }
  function render() {
    var box = document.getElementById('ttdDigitalBox');
    if (!box) {
      var anchor = document.getElementById('profilStrukturRingkasan');
      if (!anchor || !anchor.parentNode) return;
      var lama = document.getElementById('ttdKepalaBox'); if (lama && lama.parentNode) lama.parentNode.removeChild(lama);
      box = document.createElement('div'); box.id = 'ttdDigitalBox';
      box.style.cssText = 'margin-top:14px;padding:12px;border:1px dashed #a7f3d0;border-radius:10px;background:#f0fdf4;';
      anchor.parentNode.insertBefore(box, anchor.nextSibling);
    }
    config().then(function (cfg) {
      var rad = function (v, t, d) { return '<label style="display:block;font-size:12px;margin:3px 0;"><input type="radio" name="ttdMode" value="' + v + '"' + (cfg.mode === v ? ' checked' : '') + '> <strong>' + t + '</strong> <span class="text-muted">' + d + '</span></label>'; };
      box.innerHTML = '<p style="font-size:13px;font-weight:700;color:#065f46;margin-bottom:6px;">✍️ Tanda Tangan Digital pada PDF</p>' +
        rad('qr', 'QR verifikasi', '— QR + kode unik, dipindai untuk mengecek keaslian') +
        rad('keduanya', 'QR + gambar tanda tangan', '') + rad('gambar', 'Gambar tanda tangan saja', '') +
        '<label style="display:block;font-size:12px;margin-top:8px;">Alamat aplikasi (isi QR) <input type="text" id="ttdBaseUrl" value="' + escapeHtml(cfg.baseUrl) + '" placeholder="https://alamat-aplikasi-anda/" style="width:100%;max-width:420px;font-size:12px;"></label>' +
        '<p class="text-muted" style="font-size:11px;margin:2px 0 6px;">Harus alamat yang bisa dibuka dari HP orang lain (bukan localhost).</p>' +
        '<button class="btn btn-primary" style="padding:3px 12px;font-size:12px;" onclick="TTD.simpanPengaturan()">💾 Simpan pengaturan</button>' +
        Object.keys(ROLES).filter(function (k) { return ROLES[k].node; }).map(kartuRole).join('') +
        '<p class="text-muted" style="font-size:11px;margin-top:6px;">Berlaku untuk semua PDF: surat, laporan, honor, rekap absensi/jurnal/nilai, jadwal.</p>';
    });
  }
  function segarkanKartu() { render(); Promise.all(Object.keys(ROLES).map(muatMentah)).then(render); }

  // ================= HALAMAN VERIFIKASI (dibuka dari QR, tanpa login) =================
  function tglId(iso) { try { return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso || '-'; } }
  function berkasHtml(sidik) {
    return '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:13px;">' +
      '<p style="margin:0 0 4px;font-weight:600;">Cocokkan dengan berkas dokumen</p>' +
      '<p style="margin:0 0 6px;color:#64748b;font-size:12px;">Sidik isi: <strong style="font-family:monospace;">' + sidik.slice(0, 8) + '-' + sidik.slice(8, 16) + '…</strong>. Pilih berkas HTML/.doc yang diunduh dari aplikasi untuk memastikan isinya sama dengan yang dicetak. Berkas PDF atau kertas tidak bisa dicocokkan otomatis.</p>' +
      '<input type="file" id="ttdVerifBerkas" accept=".html,.htm,.doc,.txt" style="font-size:12px;">' +
      '<p id="ttdVerifHasil" style="margin:8px 0 0;font-size:13px;"></p></div>';
  }
  function pasangBerkas(sidik) {
    var inp = document.getElementById('ttdVerifBerkas'), out = document.getElementById('ttdVerifHasil');
    if (!inp || !out) return;
    inp.onchange = function () {
      var fl = inp.files && inp.files[0]; if (!fl) return;
      if (fl.size > 5 * 1024 * 1024) { out.textContent = '⚠️ Berkas terlalu besar (maks. 5 MB).'; return; }
      var fr = new FileReader();
      fr.onerror = function () { out.textContent = '⚠️ Gagal membaca berkas.'; };
      fr.onload = function () {
        sidikDari(String(fr.result)).then(function (h) {
          if (!h) out.textContent = '⚠️ Peramban ini tidak mendukung pencocokan (perlu HTTPS).';
          else if (h === sidik) out.innerHTML = '✅ <strong>Isi berkas identik</strong> dengan dokumen yang dicetak.';
          else out.innerHTML = '❌ <strong>Isi berkas BERBEDA</strong> dari dokumen yang dicetak. Dokumen patut diragukan.';
        });
      };
      fr.readAsText(fl);
    };
  }
  function tampilVerifikasi(kode) {
    var ov = document.createElement('div');
    ov.id = 'ttdVerifOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#f1f5f9;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;font-family:system-ui,Arial,sans-serif;color:#0f172a;';
    ov.innerHTML = '<div style="background:#fff;max-width:480px;width:100%;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.12);padding:22px;"><p style="font-size:12px;color:#64748b;margin:0 0 4px;">Verifikasi Tanda Tangan QR</p><p id="ttdVerifIsi" style="margin:0;font-size:14px;">⏳ Memeriksa kode <strong></strong>…</p></div>';
    document.body.appendChild(ov);
    ov.querySelector('strong').textContent = kode;
    var isi = document.getElementById('ttdVerifIsi');
    var baris = function (a, b) { return '<tr><td style="padding:5px 10px 5px 0;color:#64748b;vertical-align:top;white-space:nowrap;">' + a + '</td><td style="padding:5px 0;font-weight:600;">' + escapeHtml(b || '-') + '</td></tr>'; };
    var tutup = '<p style="margin:16px 0 0;"><button id="ttdVerifTutup" style="padding:8px 14px;border:0;border-radius:8px;background:#0f766e;color:#fff;font-size:13px;cursor:pointer;">Tutup & buka aplikasi</button></p>';
    var pasangTutup = function () { var t = document.getElementById('ttdVerifTutup'); if (t) t.onclick = function () { ov.remove(); try { history.replaceState(null, '', location.pathname); } catch (e) {} }; };
    if (!/^SM-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(kode)) { isi.innerHTML = '❌ <strong>Kode tidak valid.</strong>' + tutup; return pasangTutup(); }
    var batas = setTimeout(function () { isi.innerHTML = '⚠️ Pemeriksaan terlalu lama. Periksa koneksi internet lalu muat ulang halaman ini.' + tutup; pasangTutup(); }, 15000);
    db.ref(NODE_REKAM + '/' + kode).once('value').then(function (snap) {
      clearTimeout(batas);
      var v = snap.val();
      if (!v) { isi.innerHTML = '❌ <strong>Kode tidak ditemukan.</strong><br><span style="color:#64748b;font-size:13px;">Dokumen ini tidak tercatat di sistem. Jika baru dicetak dalam keadaan offline, coba lagi beberapa saat kemudian.</span>' + tutup; return pasangTutup(); }
      if (v.dicabut) { isi.innerHTML = '⛔ <strong>Tanda tangan ini sudah DICABUT.</strong><br><span style="color:#64748b;font-size:13px;">' + escapeHtml(v.alasanDicabut || '') + '</span>' + tutup; return pasangTutup(); }
      isi.innerHTML = '✅ <strong style="font-size:16px;">Tercatat di sistem SI MAMBA</strong>' +
        '<p style="font-size:12px;color:#64748b;margin:6px 0 10px;">Cocokkan data di bawah dengan isi dokumen kertas. Bila berbeda, dokumen patut diragukan.</p>' +
        '<table style="font-size:13px;border-collapse:collapse;">' + baris('Kode', kode) + baris('Dokumen', v.jenis) + baris('Keterangan', v.ket) +
        baris('Ditandatangani', v.penandatangan) + baris('Jabatan', v.jabatan) + baris('NIP', v.nip) + baris('Lembaga', v.madrasah) + baris('Dicetak pada', tglId(v.tanggal)) + baris('Dicetak oleh', v.dicetakOleh) + '</table>' + (/^[0-9A-F]{64}$/.test(v.sidik || '') ? berkasHtml(v.sidik) : '') + tutup;
      pasangTutup();
      if (/^[0-9A-F]{64}$/.test(v.sidik || '')) pasangBerkas(v.sidik);
    }).catch(function (e) { clearTimeout(batas); isi.innerHTML = '⚠️ Gagal memeriksa: ' + escapeHtml(pesanErr(e)) + tutup; pasangTutup(); });
  }
  function cekUrl() {
    try {
      var kode = new URLSearchParams(location.search).get('verifikasi');
      if (kode) tampilVerifikasi(kode.trim().toUpperCase());
    } catch (e) { /* abaikan */ }
  }

  // ================= SAMBUNGAN KE KODE LAMA =================
  window.renderTtdKepalaPreview = segarkanKartu;

  // Judul/keterangan rekap ikut tercatat di verifikasi (rekapGambarKop dipanggil sebelum rekapGambarTtd).
  var kopAsli = window.rekapGambarKop;
  if (typeof kopAsli === 'function') {
    window.rekapGambarKop = function (doc, logoData, judul, barisInfo) {
      doc.__ttdJudul = judul; doc.__ttdInfo = (barisInfo || []).join(' | ');
      return kopAsli.apply(this, arguments);
    };
  }
  window.rekapGambarTtd = async function (doc) {
    var pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    var y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 60) + 12;
    if (y + 55 > ph - 10) { doc.addPage(); y = 25; }
    doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(0);
    doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), 15, y);
    await blokPdf(doc, { role: 'kepala', x: pw - 55, y: y, lebar: 35, tinggiMaks: 22 });
  };
  var iuranAsli = window.iuranTtdBendahara;
  if (typeof iuranAsli === 'function') {
    window.iuranTtdBendahara = function () {
      if (!MADRASAH.bendahara) return iuranAsli();
      var g = img('bendahara', 'max-height:48px;display:block;margin:4px auto;');
      return '<div style="margin-top:18px;display:flex;justify-content:flex-end;"><div style="text-align:center;font-size:12px;min-width:220px;">' +
        '<p>Mengetahui,</p><p style="margin-bottom:' + (g ? '0' : '56px') + ';">Bendahara Madrasah</p>' + g +
        '<p style="font-weight:700;text-decoration:underline;">' + escapeHtml(MADRASAH.bendahara) + '</p>' +
        (MADRASAH.nip_bendahara ? '<p>NIP/NUPTK. ' + escapeHtml(MADRASAH.nip_bendahara) + '</p>' : '') + '</div></div>';
    };
  }

  window.TTD = {
    ROLES: ROLES, muat: muat, img: img, config: config,
    tandai: tandai, gambarPdf: function (d, r, x, y, o) { return tandai(d, r, x, y, o).then(function (h) { return h > 0; }); },
    sidik: sidikDari, normTeks: normTeks, blokPdf: blokPdf, tambahAkhir: tambahAkhir, penanda: penanda, isiHtml: isiHtml, htmlBlok: htmlBlok,
    upload: upload, hapus: hapus, simpanPengaturan: simpanPengaturan, render: segarkanKartu, verifikasi: tampilVerifikasi
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cekUrl); else cekUrl();
})();
