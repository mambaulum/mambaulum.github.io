/* ============================================================
   SI MAMBA - js/undangan-rapat.js  (v1)
   Tab "✉️ Undangan Rapat" di menu Surat & Ijin.
   - Data rapat dibaca dari node `rapat` (judul, tanggal, jam, tempat, pimpinan). rapat.js TIDAK diubah.
   - Nomor surat: window.SIMambaNomor.kunci('surat-keluar', ...) (transaction, seri Surat Keluar).
   - Tercatat di Agenda Surat (Surat Keluar) lewat window.SIMambaAgenda.catatKeluar (agenda-surat.js v4).
   - Isi surat DIBEKUKAN (snapshot) di rekaman agenda: perubahan jadwal rapat tidak mengubah undangan lama.
     Bila jadwal berubah: "Terbitkan revisi" = nomor baru, surat lama tetap ada.
   - PDF A4 (margin kiri 3 cm, kanan 2 cm) bertanda tangan QR Kepala (ttdKepalaPdf), seperti surat guru.
   - Bagikan via WhatsApp: teks ringkas undangan (wa.me, pilih penerima di WhatsApp).
   WAJIB dimuat sesudah surat-guru.js dan agenda-surat.js.
   Field tambahan pada agenda_surat/<id>: unik, jenisSurat, rapatId, isi (periksa Rules bila ada .validate ketat).
============================================================ */
(function () {
  'use strict';
  var U = { rapat: [], loaded: false, ada: [], panel: null, busy: false };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function v(id) { var e = $('ur_' + id); return e ? String(e.value || '').trim() : ''; }
  function set(id, x) { var e = $('ur_' + id); if (e) e.value = x == null ? '' : x; }
  function boleh() { try { return !!(isAdmin() || isKepsek()); } catch (e) { return false; } }
  function say(m, err) { if (typeof toast === 'function') toast(m, err); else console[err ? 'error' : 'log'](m); }
  function fmtTgl(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function hariTgl(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  function jamTxt(j) { return j ? String(j).replace(':', '.') + ' WIB s.d. selesai' : 'Menyesuaikan'; }
  function titleCase(x) { return String(x || '').toLowerCase().replace(/(^|[\s(\/-])([a-z])/g, function (m0, a0, b0) { return a0 + b0.toUpperCase(); }); }
  function tanpaGelar(n) {
    var x = String(n || '').split(',')[0].trim();
    x = x.replace(/^((prof|dr|drs|dra|ir)\.?\s+)+/i, '');
    var t = x.split(/\s+/);
    while (t.length > 1 && /^(s|m|d)\.[a-z.]+$/i.test(t[t.length - 1])) t.pop();
    return t.join(' ');
  }
  function tempatSurat() { return (typeof MADRASAH !== 'undefined' && MADRASAH.desa) ? MADRASAH.desa : 'Mambaul Ulum'; }
  function lines(s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function rapatById(id) { return U.rapat.filter(function (r) { return r.id === id; })[0]; }
  function unikDasar(id) { return 'undangan-rapat:' + id; }

  /* ---------- data ---------- */
  function muatRapat() {
    return db.ref('rapat').orderByChild('tanggal').limitToLast(60).once('value').then(function (sn) {
      var a = []; sn.forEach(function (c) { var x = c.val() || {}; x.id = c.key; a.push(x); });
      a.sort(function (p, q) { return String(q.tanggal || '').localeCompare(String(p.tanggal || '')); });
      U.rapat = a; U.loaded = true;
    });
  }
  function muatAda() {
    var id = v('rapat'); U.ada = [];
    if (!id || !window.SIMambaAgenda) return Promise.resolve();
    return window.SIMambaAgenda.cariAwalan(unikDasar(id)).then(function (a) { U.ada = a.filter(function (x) { return x.isi; }); });
  }

  /* ---------- UI ---------- */
  function buat(panel) {
    U.panel = panel;
    panel.innerHTML =
      '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
      '<div style="flex:2 1 260px;"><label class="label" for="ur_rapat">Pilih Rapat (dari menu Rapat)</label><select id="ur_rapat" class="field"></select></div>' +
      '<div style="flex:1 1 140px;"><label class="label" for="ur_tglsurat">Tanggal Surat</label><input id="ur_tglsurat" type="date" class="field"></div>' +
      '<div style="flex:1 1 160px;"><label class="label" for="ur_klas">Klasifikasi</label><select id="ur_klas" class="field"></select></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
      '<div style="flex:1 1 150px;"><label class="label" for="ur_tglrapat">Tanggal Rapat</label><input id="ur_tglrapat" type="date" class="field"></div>' +
      '<div style="flex:1 1 110px;"><label class="label" for="ur_jam">Jam</label><input id="ur_jam" type="time" class="field"></div>' +
      '<div style="flex:2 1 200px;"><label class="label" for="ur_tempat">Tempat</label><input id="ur_tempat" class="field" maxlength="80" placeholder="Ruang guru"></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
      '<div style="flex:1 1 120px;"><label class="label" for="ur_sifat">Sifat</label><select id="ur_sifat" class="field"><option>Penting</option><option>Segera</option><option>Biasa</option></select></div>' +
      '<div style="flex:1 1 100px;"><label class="label" for="ur_lampiran">Lampiran</label><input id="ur_lampiran" class="field" value="-" maxlength="40"></div>' +
      '<div style="flex:2 1 220px;"><label class="label" for="ur_perihal">Perihal</label><input id="ur_perihal" class="field" value="Undangan Rapat" maxlength="120"></div></div>' +
      '<div style="margin-bottom:12px;"><label class="label" for="ur_kepada">Kepada Yth.</label><input id="ur_kepada" class="field" value="Bapak/Ibu Guru dan Tenaga Kependidikan" maxlength="150"></div>' +
      '<div style="margin-bottom:12px;"><label class="label" for="ur_agenda">Agenda — satu baris per butir</label><textarea id="ur_agenda" class="field" rows="4" maxlength="1500" placeholder="Evaluasi pembelajaran&#10;Persiapan asesmen"></textarea></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
      '<div style="flex:1 1 240px;"><label class="label" for="ur_catatan">Catatan (opsional)</label><textarea id="ur_catatan" class="field" rows="2" maxlength="600" placeholder="Mohon membawa laptop"></textarea></div>' +
      '<div style="flex:1 1 240px;"><label class="label" for="ur_tembusan">Tembusan (opsional) — satu baris per butir</label><textarea id="ur_tembusan" class="field" rows="2" maxlength="500"></textarea></div></div>' +
      '<div id="ur_info" style="font-size:13px;margin-bottom:10px;"></div>' +
      '<div id="ur_revwrap" style="display:none;margin-bottom:10px;"><label style="display:flex;gap:6px;align-items:center;font-size:13px;"><input type="checkbox" id="ur_rev"> Terbitkan sebagai <b>revisi</b> (nomor baru; surat lama tetap tercatat)</label></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
      '<button type="button" class="btn btn-soft" id="ur_btnPrev">👁️ Pratinjau</button>' +
      '<button type="button" class="btn btn-success" id="ur_btnTerbit">🧾 Terbitkan, Catat & Unduh PDF</button></div>' +
      '<div id="ur_ada"></div><div id="ur_preview" style="background:#fff;color:#111;border:1px solid #ddd;border-radius:8px;padding:16px;font-size:13px;"></div>';
    var kl = $('ur_klas'), daftar = window.SIMambaNomor ? window.SIMambaNomor.klasPilihan() : [{ kode: 'UM.01', label: 'Umum' }];
    kl.innerHTML = daftar.map(function (k) { return '<option value="' + esc(k.kode) + '">' + esc(k.kode + ' — ' + k.label) + '</option>'; }).join('');
    $('ur_rapat').addEventListener('change', saatRapat);
    ['tglsurat', 'klas', 'tglrapat', 'jam', 'tempat', 'sifat', 'lampiran', 'perihal', 'kepada', 'agenda', 'catatan', 'tembusan'].forEach(function (k) {
      var e = $('ur_' + k); if (e) e.addEventListener('input', pratinjau);
    });
    $('ur_btnPrev').addEventListener('click', pratinjau);
    $('ur_btnTerbit').addEventListener('click', terbitkan);
    $('ur_ada').addEventListener('click', aksiAda);
    $('ur_rev').addEventListener('change', infoNomor);
    set('tglsurat', typeof tglLokal === 'function' ? tglLokal() : new Date().toISOString().slice(0, 10));
  }
  function buka() {
    if (!U.panel) return;
    var wrap = $('ur_info'); if (wrap) wrap.textContent = '⏳ Memuat daftar rapat…';
    muatRapat().then(function () {
      var sel = $('ur_rapat'), cur = sel.value;
      sel.innerHTML = '<option value="">— pilih rapat —</option>' + U.rapat.map(function (r) {
        return '<option value="' + esc(r.id) + '">' + esc((r.tanggal || '') + ' · ' + (r.judul || '(tanpa judul)') + (r.status === 'selesai' ? ' (selesai)' : '')) + '</option>';
      }).join('');
      if (cur && rapatById(cur)) sel.value = cur;
      saatRapat();
    }).catch(function (e) { if (wrap) wrap.innerHTML = '<span style="color:#dc2626;">Gagal memuat rapat: ' + esc(e && e.message || e) + '</span>'; });
  }
  function saatRapat() {
    var r = rapatById(v('rapat'));
    if (r) { set('tglrapat', r.tanggal || ''); set('jam', r.jam || ''); set('tempat', r.tempat || ''); set('perihal', 'Undangan Rapat'); }
    muatAda().then(function () { tampilAda(); infoNomor(); pratinjau(); }).catch(function (e) { say('Gagal memeriksa surat yang sudah terbit: ' + (e && e.message || e), true); });
  }
  function infoNomor() {
    var box = $('ur_info'); if (!box) return;
    var rw = $('ur_revwrap'); if (rw) rw.style.display = U.ada.length ? 'block' : 'none';
    if (!v('rapat')) { box.textContent = 'Pilih rapat terlebih dahulu.'; return; }
    if (U.ada.length && !($('ur_rev') && $('ur_rev').checked)) { box.innerHTML = '✅ Undangan untuk rapat ini <b>sudah terbit</b> (lihat daftar di bawah). Centang "revisi" bila perlu menerbitkan yang baru.'; return; }
    if (!window.SIMambaNomor) { box.textContent = 'Modul penomoran belum dimuat.'; return; }
    window.SIMambaNomor.intip('surat-keluar', v('tglsurat'), v('klas')).then(function (n) { box.innerHTML = 'Nomor berikutnya (perkiraan): <b>' + esc(n) + '</b>'; })
      .catch(function () { box.textContent = 'Nomor akan dikunci saat surat diterbitkan.'; });
  }
  function tampilAda() {
    var box = $('ur_ada'); if (!box) return;
    if (!U.ada.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;"><b>Surat yang sudah terbit</b>' +
      U.ada.map(function (x, i) {
        return '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;"><span style="flex:1 1 220px;">No. <b>' + esc(x.nomor) + '</b> · ' + esc(fmtTgl(x.tanggal)) + ' · Agenda ' + esc(x.noAgenda) + '</span>' +
          '<button type="button" class="btn btn-soft" data-ur="cetak" data-i="' + i + '">🖨️ Cetak ulang</button>' +
          '<button type="button" class="btn btn-soft" data-ur="wa" data-i="' + i + '">📲 Bagikan WA</button></div>';
      }).join('') + '</div>';
  }
  function aksiAda(e) {
    var b = e.target.closest ? e.target.closest('[data-ur]') : null; if (!b) return;
    var x = U.ada[Number(b.getAttribute('data-i'))]; if (!x || !x.isi) return;
    if (b.getAttribute('data-ur') === 'wa') return bagikanWA(x);
    if (b.getAttribute('data-ur') === 'cetak') {
      b.disabled = true;
      buatPDF(x.isi, x.nomor).then(function (doc) { doc.save('Undangan_Rapat_' + String(x.nomor).replace(/[^\w]+/g, '_') + '.pdf'); })
        .catch(function (er) { say('Gagal membuat PDF: ' + (er && er.message || er), true); }).then(function () { b.disabled = false; });
    }
  }

  /* ---------- isi surat ---------- */
  function ambil() {
    var r = rapatById(v('rapat')) || {};
    return { rapatId: r.id || '', judul: r.judul || '', pimpinan: r.pimpinan || '', tanggalSurat: v('tglsurat'), tanggalRapat: v('tglrapat'), jam: v('jam'), tempat: v('tempat'),
      sifat: v('sifat'), lampiran: v('lampiran') || '-', perihal: v('perihal') || 'Undangan Rapat', kepada: v('kepada'), agenda: v('agenda'), catatan: v('catatan'), tembusan: v('tembusan') };
  }
  function paragrafBuka(d) {
    return 'Sehubungan dengan pelaksanaan kegiatan ' + (typeof MADRASAH !== 'undefined' ? titleCase(MADRASAH.nama) : 'madrasah') + ', kami mengundang Bapak/Ibu untuk menghadiri rapat ' + (d.judul || '') + ' yang akan dilaksanakan pada:';
  }
  function pratinjau() {
    var box = $('ur_preview'); if (!box) return;
    var d = ambil(); if (!d.rapatId) { box.innerHTML = '<p class="text-muted" style="text-align:center;">Pilih rapat untuk melihat pratinjau.</p>'; return; }
    var kop = (typeof generateKopSuratHTML === 'function') ? generateKopSuratHTML() : '';
    var ag = lines(d.agenda), tb = lines(d.tembusan);
    box.innerHTML = kop +
      '<p style="text-align:right;margin:10px 0;">' + esc(tempatSurat()) + ', ' + esc(fmtTgl(d.tanggalSurat)) + '</p>' +
      '<table style="border:0;font-size:13px;"><tr><td>Nomor</td><td>: <i>(dikunci saat diterbitkan)</i></td></tr><tr><td>Sifat</td><td>: ' + esc(d.sifat) + '</td></tr><tr><td>Lampiran</td><td>: ' + esc(d.lampiran) + '</td></tr><tr><td>Perihal</td><td>: <b>' + esc(d.perihal) + '</b></td></tr></table>' +
      '<p style="margin:12px 0 0;">Kepada Yth.<br><b>' + esc(d.kepada) + '</b><br>di Tempat</p>' +
      '<p>Assalamu’alaikum Wr. Wb.</p><p>' + esc(paragrafBuka(d)) + '</p>' +
      '<table style="border:0;font-size:13px;"><tr><td>Hari/Tanggal</td><td>: ' + esc(hariTgl(d.tanggalRapat)) + '</td></tr><tr><td>Waktu</td><td>: ' + esc(jamTxt(d.jam)) + '</td></tr><tr><td>Tempat</td><td>: ' + esc(d.tempat || '-') + '</td></tr></table>' +
      (ag.length ? '<p style="margin:8px 0 2px;">Dengan agenda:</p><ol style="margin:0 0 0 20px;">' + ag.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>' : '') +
      (d.catatan ? '<p>' + esc(d.catatan) + '</p>' : '') +
      '<p>Demikian undangan ini kami sampaikan. Atas kehadiran Bapak/Ibu, kami ucapkan terima kasih.</p><p>Wassalamu’alaikum Wr. Wb.</p>' +
      '<p style="text-align:right;">Kepala ' + esc(typeof MADRASAH !== 'undefined' ? titleCase(MADRASAH.nama) : '') + ',<br><br><i>(QR Kepala pada PDF)</i><br><b>' + esc(typeof MADRASAH !== 'undefined' ? tanpaGelar(MADRASAH.kepala_sekolah) : '') + '</b></p>' +
      (tb.length ? '<p style="font-size:12px;">Tembusan:<br>' + tb.map(function (t, i) { return (i + 1) + '. ' + esc(t); }).join('<br>') + '</p>' : '');
  }

  /* ---------- PDF ---------- */
  async function buatPDF(d, nomor) {
    if (typeof ensureLib !== 'function') throw new Error('modul PDF belum tersedia');
    await ensureLib('pdf');
    var doc = new window.jspdf.jsPDF('p', 'mm', 'a4'), pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    var mk = 30, mr = 20, lebar = pw - mk - mr, LH = 6.3, y, logo = await v4LoadLogoForPdf();
    var off = MADRASAH.nsm ? 5 : 0;
    v4TambahLogoKeKopPdf(doc, logo, off);
    doc.setFontSize(16); doc.text(MADRASAH.nama, pw / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    if (MADRASAH.nsm) { doc.setFont(undefined, 'bold'); doc.text('NSM: ' + MADRASAH.nsm, pw / 2, 25, { align: 'center' }); doc.setFont(undefined, 'normal'); }
    doc.text(MADRASAH.alamat, pw / 2, 27 + off, { align: 'center' });
    doc.text('Telp: ' + MADRASAH.telp + '  |  Email: ' + MADRASAH.email + '  |  Web: ' + MADRASAH.website, pw / 2, 33 + off, { align: 'center' });
    doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(20, 38 + off, pw - 20, 38 + off); doc.line(20, 40 + off, pw - 20, 40 + off);
    y = 52 + off; doc.setFontSize(12);
    var perlu = function (h) { if (y + h > ph - 25) { doc.addPage(); y = 25; } };
    var tulis = function (txt, x, w, bold) { doc.setFont(undefined, bold ? 'bold' : 'normal'); doc.splitTextToSize(String(txt), w).forEach(function (r) { perlu(7); doc.text(r, x, y); y += LH; }); doc.setFont(undefined, 'normal'); };
    doc.text(tempatSurat() + ', ' + fmtTgl(d.tanggalSurat), pw - mr, y, { align: 'right' }); y += 9;
    [['Nomor', nomor, false], ['Sifat', d.sifat, false], ['Lampiran', d.lampiran, false], ['Perihal', d.perihal, true]].forEach(function (h) {
      doc.text(h[0], mk, y); doc.text(':', mk + 24, y); var yy = y; doc.setFont(undefined, h[2] ? 'bold' : 'normal');
      doc.splitTextToSize(String(h[1]), lebar - 28).forEach(function (r) { doc.text(r, mk + 28, yy); yy += LH; }); doc.setFont(undefined, 'normal'); y = yy;
    });
    y += 3; tulis('Kepada Yth.', mk, lebar); tulis(d.kepada, mk, lebar, true); tulis('di Tempat', mk, lebar); y += 3;
    tulis('Assalamu’alaikum Wr. Wb.', mk, lebar); y += 1; tulis(paragrafBuka(d), mk, lebar); y += 1;
    [['Hari/Tanggal', hariTgl(d.tanggalRapat)], ['Waktu', jamTxt(d.jam)], ['Tempat', d.tempat || '-']].forEach(function (h) {
      perlu(7); doc.text(h[0], mk + 6, y); doc.text(':', mk + 36, y); var yy = y;
      doc.splitTextToSize(String(h[1]), lebar - 42).forEach(function (r) { doc.text(r, mk + 40, yy); yy += LH; }); y = yy;
    });
    var ag = lines(d.agenda);
    if (ag.length) { y += 2; tulis('Dengan agenda:', mk, lebar); ag.forEach(function (a, i) { doc.splitTextToSize(a, lebar - 12).forEach(function (r, k) { perlu(7); if (k === 0) doc.text((i + 1) + '.', mk + 4, y); doc.text(r, mk + 12, y); y += LH; }); }); }
    if (d.catatan) { y += 2; tulis(d.catatan, mk, lebar); }
    y += 2; tulis('Demikian undangan ini kami sampaikan. Atas kehadiran Bapak/Ibu, kami ucapkan terima kasih.', mk, lebar);
    y += 1; tulis('Wassalamu’alaikum Wr. Wb.', mk, lebar);
    var cx = pw - 30 - 40; perlu(70); y += 6;
    doc.splitTextToSize('Kepala ' + titleCase(MADRASAH.nama) + ',', 70).forEach(function (r) { doc.text(r, cx, y, { align: 'center' }); y += LH; });
    var tq = await ttdKepalaPdf(doc, cx, y + 3, { lebar: 35, tinggiMaks: 20, meta: { jenis: 'Surat Undangan Rapat', ket: [d.judul, d.tanggalRapat].filter(Boolean).join(' | ') } });
    y += (tq && tq.dipakai) ? Math.max(22, tq.tinggi + 5) : 20;
    doc.setFont(undefined, 'bold'); doc.text(tanpaGelar(MADRASAH.kepala_sekolah), cx, y, { align: 'center' }); doc.setFont(undefined, 'normal');
    var tb = lines(d.tembusan);
    if (tb.length) { y += 14; perlu(10 + tb.length * 5.5); doc.setFontSize(10); doc.text('Tembusan:', mk, y); y += 5; tb.forEach(function (t, i) { perlu(6); doc.text((i + 1) + '. ' + t, mk, y); y += 5; }); }
    for (var pg = 2; pg <= doc.getNumberOfPages(); pg++) { doc.setPage(pg); doc.setFontSize(10); doc.text('- ' + pg + ' -', pw / 2, 12, { align: 'center' }); }
    return doc;
  }

  /* ---------- terbit ---------- */
  function validasi(d) {
    if (!d.rapatId) return 'Pilih rapat terlebih dahulu.';
    if (!/^\d{4}-\d\d-\d\d$/.test(d.tanggalSurat) || !/^\d{4}-\d\d-\d\d$/.test(d.tanggalRapat)) return 'Tanggal surat dan tanggal rapat wajib diisi.';
    if (!d.tempat) return 'Tempat rapat wajib diisi.';
    if (!d.kepada) return 'Kolom "Kepada Yth." wajib diisi.';
    if (!lines(d.agenda).length) return 'Isi minimal satu butir agenda.';
    return '';
  }
  async function terbitkan() {
    if (!boleh()) return say('Hanya Admin & Kepala Madrasah!', true);
    if (!window.SIMambaNomor || !window.SIMambaAgenda) return say('Modul penomoran/agenda belum dimuat. Muat ulang halaman.', true);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return say('Perlu koneksi internet untuk menerbitkan surat bernomor.', true);
    if (U.busy) return;
    var d = ambil(), err = validasi(d); if (err) return say(err, true);
    var revisi = !!($('ur_rev') && $('ur_rev').checked);
    if (U.ada.length && !revisi) return say('Undangan rapat ini sudah terbit. Gunakan "Cetak ulang", atau centang revisi.', true);
    U.busy = true; var b = $('ur_btnTerbit'); if (b) b.disabled = true;
    var nomor = '';
    try {
      await muatAda();
      if (U.ada.length && !revisi) throw new Error('Undangan rapat ini sudah terbit (data terbaru).');
      var unik = unikDasar(d.rapatId) + (U.ada.length ? ':r' + U.ada.length : '');
      if (U.ada.length) d.perihal = d.perihal.replace(/\s*\(Revisi[^)]*\)\s*$/i, '') + ' (Revisi ' + U.ada.length + ')';
      nomor = await window.SIMambaNomor.kunci('surat-keluar', d.tanggalSurat, v('klas'));
      var hasil = await window.SIMambaAgenda.catatKeluar({ tanggal: d.tanggalSurat, nomor: nomor, pihak: d.kepada, perihal: (d.perihal + ': ' + d.judul).slice(0, 200),
        ket: 'Rapat ' + fmtTgl(d.tanggalRapat) + (U.ada.length ? ' | revisi dari No. ' + U.ada[0].nomor : ''), unik: unik, jenisSurat: 'undangan-rapat', rapatId: d.rapatId, isi: d });
      try { if (typeof addLog === 'function') addLog('undangan_rapat_terbit', nomor + ' - ' + d.judul); } catch (e) { /* log tidak boleh menggagalkan */ }
      say('✅ Undangan No. ' + nomor + ' diterbitkan & tercatat di Agenda Surat (No. Agenda ' + hasil.noAgenda + ').');
      try { var doc = await buatPDF(d, nomor); doc.save('Undangan_Rapat_' + String(nomor).replace(/[^\w]+/g, '_') + '.pdf'); }
      catch (e2) { say('Surat sudah tercatat, tetapi PDF gagal dibuat: ' + (e2 && e2.message || e2) + '. Gunakan "Cetak ulang".', true); }
      var rv = $('ur_rev'); if (rv) rv.checked = false;
      await muatAda(); tampilAda(); infoNomor();
    } catch (e) {
      say('❌ Gagal menerbitkan: ' + (e && e.message || e) + (nomor ? ' — nomor ' + nomor + ' sudah terkunci; catat manual di Agenda Surat Keluar bila perlu.' : ''), true);
    } finally { U.busy = false; if (b) b.disabled = false; }
  }

  /* ---------- WhatsApp ---------- */
  function bagikanWA(x) {
    var d = x.isi, ag = lines(d.agenda);
    var t = '*' + d.perihal + '*\nNo. ' + x.nomor + '\n\nAssalamu’alaikum Wr. Wb.\nKepada ' + d.kepada + ',\nMohon kehadiran Bapak/Ibu pada rapat *' + d.judul + '*:\n' +
      '• Hari/Tanggal: ' + hariTgl(d.tanggalRapat) + '\n• Waktu: ' + jamTxt(d.jam) + '\n• Tempat: ' + (d.tempat || '-') +
      (ag.length ? '\n\nAgenda:\n' + ag.map(function (a, i) { return (i + 1) + '. ' + a; }).join('\n') : '') + (d.catatan ? '\n\n' + d.catatan : '') +
      '\n\nTerima kasih.\n' + (typeof MADRASAH !== 'undefined' ? MADRASAH.nama : '');
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
  }

  if (window.SIMambaSuratTab) window.SIMambaSuratTab.daftar({ id: 'undangan-rapat', label: '✉️ Undangan Rapat', boleh: boleh, buat: buat, buka: buka });
  else console.warn('[SI MAMBA] undangan-rapat.js: js/surat-guru.js (v2+) belum dimuat; tab Undangan Rapat tidak muncul.');
})();
