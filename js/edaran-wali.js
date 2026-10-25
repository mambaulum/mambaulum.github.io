/* ============================================================
   SI MAMBA - js/edaran-wali.js  (v2)
   Tab "📣 Surat Edaran Wali" di menu Surat & Ijin: surat pemberitahuan/edaran untuk orang tua/wali murid.
   - Nomor: window.SIMambaNomor.kunci('surat-keluar', ...) (seri Surat Keluar, transaction).
   - Tercatat di Agenda Surat (Surat Keluar) lewat window.SIMambaAgenda.catatKeluar (agenda-surat.js v4+).
   - Isi surat DIBEKUKAN (snapshot) di rekaman agenda; perubahan = "revisi" (nomor baru).
   - PDF A4 bertanda tangan QR Kepala (ttdKepalaPdf), margin kiri 3 cm / kanan 2 cm.
   - Kirim WA per wali: memakai kirimWA() milik app.js (wa.me, nomor dari Data Siswa -> noWaOrtu), seperti pengingat tunggakan infaq.
     TIDAK ada tautan publik / node baru; Rules tidak perlu diubah.
   - Opsional (Admin): tayangkan ringkasan di beranda orang tua lewat pengumuman target 'ortu' (node pengumuman_publik yang sudah ada).
     PERHATIAN: pengumuman_publik dibaca SEBELUM login, jadi hanya perihal + ringkasan isi, tanpa nama siswa.
   v2: pilihan TEMPLATE (Biaya Kelulusan Kelas 6, Iuran Kegiatan, Seragam/Buku, Pertemuan Wali, Libur) + RINCIAN BIAYA per siswa
       (tabel + total otomatis di surat, PDF, dan teks WA). Teks [dalam kurung siku] wajib diganti sebelum surat bisa diterbitkan.
   WAJIB dimuat sesudah surat-guru.js dan agenda-surat.js.
============================================================ */
(function () {
  'use strict';
  var U = { panel: null, ada: [], busy: false, draft: '', terkirim: {}, aktif: null, rows: [], sudah: false };
  var MAKS_WA = 1900;   // batas panjang teks yang sudah di-encode untuk tautan wa.me

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function v(id) { var e = $('ew_' + id); return e ? String(e.value || '').trim() : ''; }
  function set(id, x) { var e = $('ew_' + id); if (e) e.value = x == null ? '' : x; }
  function boleh() { try { return !!(isAdmin() || isKepsek()); } catch (e) { return false; } }
  function say(m, err) { if (typeof toast === 'function') toast(m, err); else console[err ? 'error' : 'log'](m); }
  function fmtTgl(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function hariTgl(iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
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
  function paragraf(s) { return String(s || '').split(/\n\s*\n/).map(function (x) { return x.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean); }
  function jamTxt(j) { return j ? String(j).replace(':', '.') + ' WIB' : ''; }
  function draftBaru() { U.draft = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
  function kelasList() { try { return (typeof KELAS_LIST !== 'undefined' && KELAS_LIST.length) ? KELAS_LIST.slice() : []; } catch (e) { return []; } }
  function kepadaTxt(kelas) { return 'Bapak/Ibu Orang Tua/Wali Murid' + (kelas && kelas !== 'Semua' ? ' ' + kelas : '') + ' ' + (typeof MADRASAH !== 'undefined' ? titleCase(MADRASAH.nama) : ''); }

  function rp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function nominalAngka(x) { var t = String(x == null ? '' : x).replace(/[.\s]/g, ''); return /^\d{1,9}$/.test(t) ? Number(t) : NaN; }
  function bersihRows() {   // -> { list: [{uraian, nominal}], salah: 'pesan' | '' }
    var list = [], salah = '';
    U.rows.forEach(function (r, i) {
      var u = String(r.u || '').trim(), n = String(r.n || '').trim();
      if (!u && !n) return;
      if (!u) { salah = salah || 'Baris biaya ke-' + (i + 1) + ': uraian belum diisi.'; return; }
      if (!n) { salah = salah || 'Baris biaya "' + u + '": nominal belum diisi.'; return; }
      var a = nominalAngka(n);
      if (isNaN(a)) { salah = salah || 'Baris biaya "' + u + '": nominal harus angka bulat (tanpa huruf/koma).'; return; }
      list.push({ uraian: u.slice(0, 80), nominal: a });
    });
    return { list: list, salah: salah };
  }
  var TEMPLATE = {
    'biaya-kelulusan': { label: 'Biaya Kelulusan & Perpisahan Kelas 6', kelas: 'Kelas 6', sifat: 'Penting',
      perihal: 'Pemberitahuan Biaya Kegiatan Kelulusan Kelas 6',
      isi: 'Sehubungan dengan akan dilaksanakannya kegiatan kelulusan dan perpisahan siswa Kelas 6 Tahun Pelajaran [tahun pelajaran], kami sampaikan rincian biaya kegiatan yang telah dimusyawarahkan bersama [komite/wali murid] pada tanggal [tanggal musyawarah], sebagaimana tercantum di bawah ini.\n\nBagi Bapak/Ibu yang mengalami kesulitan dalam pembayaran, dipersilakan menghubungi wali kelas atau Kepala Madrasah untuk mendapatkan kebijakan keringanan.',
      rows: ['Acara perpisahan/wisuda', 'Foto kelulusan dan album kenangan', 'Konsumsi', 'Dokumentasi dan dekorasi', 'Piagam dan perlengkapan kelulusan'] },
    'iuran-kegiatan': { label: 'Iuran Kegiatan (study tour/outing/lomba)', kelas: 'Semua', sifat: 'Penting',
      perihal: 'Pemberitahuan Biaya Kegiatan [nama kegiatan]',
      isi: 'Sehubungan dengan akan dilaksanakannya kegiatan [nama kegiatan] bagi siswa [kelas yang mengikuti], kami sampaikan jadwal dan rincian biaya per siswa yang telah disepakati sebagaimana tercantum di bawah ini.\n\nKeikutsertaan putra-putri Bapak/Ibu memerlukan persetujuan wali murid. Mohon konfirmasi kepada wali kelas paling lambat tanggal [batas konfirmasi].',
      rows: ['Transportasi', 'Konsumsi', 'Tiket masuk/akomodasi', 'Asuransi'] },
    'seragam-buku': { label: 'Pembayaran Seragam / Buku / LKS', kelas: 'Semua', sifat: 'Biasa',
      perihal: 'Pemberitahuan Pengadaan [seragam/buku/LKS] Tahun Pelajaran [tahun pelajaran]',
      isi: 'Diberitahukan kepada Bapak/Ibu bahwa pengadaan [seragam/buku/LKS] bagi siswa Tahun Pelajaran [tahun pelajaran] dapat dilakukan melalui madrasah dengan rincian biaya per siswa sebagaimana tercantum di bawah ini.\n\nPengadaan melalui madrasah bersifat pilihan; Bapak/Ibu diperkenankan mengadakan sendiri sesuai ketentuan yang berlaku di madrasah.',
      rows: ['[nama barang]'] },
    'pertemuan-wali': { label: 'Undangan Pertemuan Wali Murid', kelas: 'Semua', sifat: 'Penting',
      perihal: 'Undangan Pertemuan Wali Murid',
      isi: 'Dalam rangka [tujuan pertemuan], kami mengundang Bapak/Ibu wali murid untuk menghadiri pertemuan yang akan dilaksanakan pada waktu dan tempat yang tertera di bawah ini. Kehadiran Bapak/Ibu sangat kami harapkan.',
      rows: [] },
    'libur': { label: 'Pemberitahuan Libur Madrasah', kelas: 'Semua', sifat: 'Penting',
      perihal: 'Pemberitahuan Libur Madrasah',
      isi: 'Diberitahukan kepada Bapak/Ibu bahwa kegiatan belajar mengajar di madrasah diliburkan pada [tanggal libur] dalam rangka [alasan libur]. Kegiatan belajar mengajar kembali berlangsung seperti biasa pada [tanggal masuk kembali].\n\nMohon Bapak/Ibu mengingatkan putra-putrinya untuk mempersiapkan diri.',
      rows: [] }
  };
  function terapkanTemplate() {
    var k = v('tpl'), t = TEMPLATE[k]; if (!t) return;
    if ((v('isi') || v('perihal')) && !window.confirm('Isi surat dan rincian biaya yang sedang diketik akan diganti dengan template "' + t.label + '". Lanjutkan?')) { set('tpl', ''); return; }
    set('perihal', t.perihal); set('isi', t.isi); set('sifat', t.sifat); set('kelas', t.kelas);
    var opt = $('ew_kelas'); if (opt && !Array.prototype.some.call(opt.options, function (o) { return o.value === t.kelas; })) set('kelas', 'Semua');
    U.rows = t.rows.map(function (u) { return { u: u, n: '' }; });
    set('batas', ''); set('cara', ''); set('tglkeg', ''); set('jam', ''); set('tempat', '');
    renderRows(); U.sudah = false; pratinjau();
    say('Template dipasang. Ganti semua teks [dalam kurung siku] dan isi nominal sebelum menerbitkan.');
  }
  function renderRows() {
    var box = $('ew_rows'); if (!box) return;
    box.innerHTML = U.rows.length ? U.rows.map(function (r, i) {
      return '<div style="display:flex;gap:6px;margin-bottom:6px;"><input class="field" data-ew-r="u" data-i="' + i + '" maxlength="80" placeholder="Uraian biaya" value="' + esc(r.u) + '" style="flex:1 1 180px;">' +
        '<input class="field" data-ew-r="n" data-i="' + i + '" inputmode="numeric" placeholder="Nominal (Rp)" value="' + esc(r.n) + '" style="flex:0 0 140px;">' +
        '<button type="button" class="btn btn-soft" data-ew-del="' + i + '" title="Hapus baris">✕</button></div>';
    }).join('') : '<p class="text-muted" style="font-size:12.5px;margin:0;">Belum ada rincian biaya.</p>';
    hitungTotal();
  }
  function hitungTotal() {
    var el = $('ew_total'); if (!el) return;
    var b = bersihRows(), t = b.list.reduce(function (a, r) { return a + r.nominal; }, 0);
    el.textContent = b.list.length ? 'Total per siswa: ' + rp(t) : '';
  }
  function aksiRows(e) {
    var t = e.target; if (!t || !t.getAttribute) return;
    var del = t.getAttribute('data-ew-del');
    if (e.type === 'click' && del != null) { U.rows.splice(Number(del), 1); renderRows(); U.sudah = false; return pratinjau(); }
    var f = t.getAttribute('data-ew-r'); if (e.type !== 'input' || !f) return;
    var r = U.rows[Number(t.getAttribute('data-i'))]; if (!r) return;
    r[f] = t.value; U.sudah = false; hitungTotal(); pratinjau();
  }

  /* ---------- UI ---------- */
  function buat(panel) {
    U.panel = panel; draftBaru();
    panel.innerHTML =
      '<div style="margin-bottom:12px;"><label class="label" for="ew_tpl">Template (opsional)</label><select id="ew_tpl" class="field"><option value="">— tulis sendiri —</option>' +
      Object.keys(TEMPLATE).map(function (k) { return '<option value="' + k + '">' + esc(TEMPLATE[k].label) + '</option>'; }).join('') + '</select></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
      '<div style="flex:1 1 150px;"><label class="label" for="ew_tglsurat">Tanggal Surat</label><input id="ew_tglsurat" type="date" class="field"></div>' +
      '<div style="flex:1 1 170px;"><label class="label" for="ew_klas">Klasifikasi</label><select id="ew_klas" class="field"></select></div>' +
      '<div style="flex:1 1 150px;"><label class="label" for="ew_kelas">Ditujukan ke</label><select id="ew_kelas" class="field"></select></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
      '<div style="flex:1 1 120px;"><label class="label" for="ew_sifat">Sifat</label><select id="ew_sifat" class="field"><option>Penting</option><option>Segera</option><option>Biasa</option></select></div>' +
      '<div style="flex:1 1 100px;"><label class="label" for="ew_lampiran">Lampiran</label><input id="ew_lampiran" class="field" value="-" maxlength="40"></div>' +
      '<div style="flex:3 1 260px;"><label class="label" for="ew_perihal">Perihal</label><input id="ew_perihal" class="field" maxlength="120" placeholder="Pemberitahuan Libur Awal Ramadan"></div></div>' +
      '<div style="margin-bottom:12px;"><label class="label" for="ew_isi">Isi surat — pisahkan paragraf dengan baris kosong</label><textarea id="ew_isi" class="field" rows="6" maxlength="1500" placeholder="Diberitahukan kepada Bapak/Ibu bahwa …"></textarea></div>' +
      '<div style="border:1px dashed #cbd5e1;border-radius:8px;padding:10px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;margin-bottom:6px;">Rincian Biaya per Siswa (opsional — kosongkan bila bukan surat biaya)</div>' +
      '<div id="ew_rows"></div><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;"><button type="button" class="btn btn-soft" id="ew_btnRow">➕ Tambah baris</button><b id="ew_total" style="font-size:13px;"></b></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;"><div style="flex:1 1 160px;"><label class="label" for="ew_batas">Batas Pembayaran</label><input id="ew_batas" type="date" class="field"></div>' +
      '<div style="flex:3 1 260px;"><label class="label" for="ew_cara">Cara Pembayaran</label><input id="ew_cara" class="field" maxlength="160" placeholder="Disetorkan kepada wali kelas pada jam kerja madrasah"></div></div></div>' +
      '<div style="border:1px dashed #cbd5e1;border-radius:8px;padding:10px;margin-bottom:12px;"><div style="font-size:13px;font-weight:600;margin-bottom:6px;">Kegiatan (opsional — kosongkan bila tidak ada)</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:12px;"><div style="flex:1 1 150px;"><label class="label" for="ew_tglkeg">Hari/Tanggal</label><input id="ew_tglkeg" type="date" class="field"></div>' +
      '<div style="flex:1 1 110px;"><label class="label" for="ew_jam">Jam</label><input id="ew_jam" type="time" class="field"></div>' +
      '<div style="flex:2 1 200px;"><label class="label" for="ew_tempat">Tempat</label><input id="ew_tempat" class="field" maxlength="80"></div></div></div>' +
      '<div style="margin-bottom:12px;"><label class="label" for="ew_tembusan">Tembusan (opsional) — satu baris per butir</label><textarea id="ew_tembusan" class="field" rows="2" maxlength="500"></textarea></div>' +
      '<div id="ew_info" style="font-size:13px;margin-bottom:10px;"></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
      '<button type="button" class="btn btn-soft" id="ew_btnPrev">👁️ Pratinjau</button>' +
      '<button type="button" class="btn btn-success" id="ew_btnTerbit">🧾 Terbitkan, Catat & Unduh PDF</button></div>' +
      '<div id="ew_ada"></div><div id="ew_wa"></div>' +
      '<div id="ew_preview" style="background:#fff;color:#111;border:1px solid #ddd;border-radius:8px;padding:16px;font-size:13px;"></div>';
    var kl = $('ew_klas'), daftar = window.SIMambaNomor ? window.SIMambaNomor.klasPilihan() : [{ kode: 'UM.01', label: 'Umum' }];
    kl.innerHTML = daftar.map(function (k) { return '<option value="' + esc(k.kode) + '">' + esc(k.kode + ' — ' + k.label) + '</option>'; }).join('');
    $('ew_kelas').innerHTML = '<option value="Semua">Semua kelas</option>' + kelasList().map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('');
    ['tglsurat', 'klas', 'kelas', 'sifat', 'lampiran', 'perihal', 'isi', 'tglkeg', 'jam', 'tempat', 'tembusan', 'batas', 'cara'].forEach(function (k) { var e = $('ew_' + k); if (e) e.addEventListener('input', function () { U.sudah = false; pratinjau(); }); });
    $('ew_tpl').addEventListener('change', terapkanTemplate);
    $('ew_btnRow').addEventListener('click', function () { U.rows.push({ u: '', n: '' }); renderRows(); });
    $('ew_rows').addEventListener('input', aksiRows); $('ew_rows').addEventListener('click', aksiRows);
    renderRows();
    ['tglsurat', 'klas'].forEach(function (k) { var e = $('ew_' + k); if (e) e.addEventListener('change', infoNomor); });
    $('ew_btnPrev').addEventListener('click', pratinjau);
    $('ew_btnTerbit').addEventListener('click', terbitkan);
    $('ew_ada').addEventListener('click', aksiAda);
    $('ew_wa').addEventListener('click', aksiWA);
    set('tglsurat', typeof tglLokal === 'function' ? tglLokal() : new Date().toISOString().slice(0, 10));
  }
  function buka() { muatAda(); infoNomor(); pratinjau(); }
  function infoNomor() {
    var box = $('ew_info'); if (!box || !window.SIMambaNomor) return;
    window.SIMambaNomor.intip('surat-keluar', v('tglsurat'), v('klas')).then(function (n) { box.innerHTML = 'Nomor berikutnya (perkiraan): <b>' + esc(n) + '</b>'; })
      .catch(function () { box.textContent = 'Nomor akan dikunci saat surat diterbitkan.'; });
  }
  function muatAda() {
    if (!window.SIMambaAgenda) return Promise.resolve();
    return window.SIMambaAgenda.cariAwalan('edaran-wali:').then(function (a) {
      U.ada = a.filter(function (x) { return x.isi; }).reverse().slice(0, 10); tampilAda();
    }).catch(function (e) { say('Gagal memuat daftar surat edaran: ' + (e && e.message || e), true); });
  }
  function tampilAda() {
    var box = $('ew_ada'); if (!box) return;
    if (!U.ada.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;"><b>Surat edaran yang sudah terbit (10 terbaru)</b>' +
      U.ada.map(function (x, i) {
        return '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;"><span style="flex:1 1 240px;">No. <b>' + esc(x.nomor) + '</b> · ' + esc(x.isi.perihal) + ' · ' + esc(x.isi.kelas === 'Semua' ? 'Semua kelas' : x.isi.kelas) + '</span>' +
          '<button type="button" class="btn btn-soft" data-ew="cetak" data-i="' + i + '">🖨️ Cetak ulang</button>' +
          '<button type="button" class="btn btn-soft" data-ew="wa" data-i="' + i + '">📲 Kirim ke wali</button>' +
          (isAdmin() ? '<button type="button" class="btn btn-soft" data-ew="umum" data-i="' + i + '">📌 Tayang di beranda ortu</button>' : '') + '</div>';
      }).join('') + '</div>';
  }
  function aksiAda(e) {
    var b = e.target.closest ? e.target.closest('[data-ew]') : null; if (!b) return;
    var x = U.ada[Number(b.getAttribute('data-i'))]; if (!x || !x.isi) return;
    var aksi = b.getAttribute('data-ew');
    if (aksi === 'wa') { U.aktif = x; return daftarWA(); }
    if (aksi === 'umum') return umumkan(x, b);
    if (aksi === 'cetak') {
      b.disabled = true;
      buatPDF(x.isi, x.nomor).then(function (doc) { doc.save('Surat_Edaran_' + String(x.nomor).replace(/[^\w]+/g, '_') + '.pdf'); })
        .catch(function (er) { say('Gagal membuat PDF: ' + (er && er.message || er), true); }).then(function () { b.disabled = false; });
    }
  }

  /* ---------- isi surat ---------- */
  function ambil() {
    var b = bersihRows(), total = b.list.reduce(function (a, r) { return a + r.nominal; }, 0);
    var d = { tanggalSurat: v('tglsurat'), kelas: v('kelas') || 'Semua', sifat: v('sifat'), lampiran: v('lampiran') || '-', perihal: v('perihal'), isi: v('isi'),
      tglKegiatan: v('tglkeg'), jam: v('jam'), tempat: v('tempat'), tembusan: v('tembusan'), batas: v('batas'), caraBayar: v('cara'), total: total, template: v('tpl') };
    if (b.list.length) d.rincian = b.list;   // tidak ada field kosong/undefined (Firebase menolak undefined)
    return d;
  }
  function barisKegiatan(d) {
    var r = [];
    if (d.tglKegiatan) r.push(['Hari/Tanggal', hariTgl(d.tglKegiatan)]);
    if (d.jam) r.push(['Waktu', jamTxt(d.jam)]);
    if (d.tempat) r.push(['Tempat', d.tempat]);
    if (d.rincian && d.rincian.length) {
      if (d.batas) r.push(['Batas Bayar', fmtTgl(d.batas)]);
      if (d.caraBayar) r.push(['Cara Bayar', d.caraBayar]);
    }
    return r;
  }
  var PENUTUP = 'Demikian pemberitahuan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.';
  function pratinjau() {
    var box = $('ew_preview'); if (!box) return;
    var d = ambil(), kop = (typeof generateKopSuratHTML === 'function') ? generateKopSuratHTML() : '', tb = lines(d.tembusan), kg = barisKegiatan(d);
    if (!d.perihal && !d.isi) { box.innerHTML = kop + '<p class="text-muted" style="text-align:center;">Isi perihal dan isi surat untuk melihat pratinjau.</p>'; return; }
    box.innerHTML = kop +
      '<p style="text-align:right;margin:10px 0;">' + esc(tempatSurat()) + ', ' + esc(fmtTgl(d.tanggalSurat)) + '</p>' +
      '<table style="border:0;font-size:13px;"><tr><td>Nomor</td><td>: <i>(dikunci saat diterbitkan)</i></td></tr><tr><td>Sifat</td><td>: ' + esc(d.sifat) + '</td></tr><tr><td>Lampiran</td><td>: ' + esc(d.lampiran) + '</td></tr><tr><td>Perihal</td><td>: <b>' + esc(d.perihal) + '</b></td></tr></table>' +
      '<p style="margin:12px 0 0;">Kepada Yth.<br><b>' + esc(kepadaTxt(d.kelas)) + '</b><br>di Tempat</p>' +
      '<p>Assalamu’alaikum Wr. Wb.</p><p>Dengan hormat,</p>' + paragraf(d.isi).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      (d.rincian && d.rincian.length ? '<table style="border-collapse:collapse;font-size:13px;margin:6px 0;"><tr><th style="border:1px solid #999;padding:3px 8px;">No</th><th style="border:1px solid #999;padding:3px 8px;">Uraian</th><th style="border:1px solid #999;padding:3px 8px;">Biaya</th></tr>' +
        d.rincian.map(function (r, i) { return '<tr><td style="border:1px solid #999;padding:3px 8px;">' + (i + 1) + '</td><td style="border:1px solid #999;padding:3px 8px;">' + esc(r.uraian) + '</td><td style="border:1px solid #999;padding:3px 8px;text-align:right;">' + esc(rp(r.nominal)) + '</td></tr>'; }).join('') +
        '<tr><td colspan="2" style="border:1px solid #999;padding:3px 8px;text-align:right;"><b>Total per siswa</b></td><td style="border:1px solid #999;padding:3px 8px;text-align:right;"><b>' + esc(rp(d.total)) + '</b></td></tr></table>' : '') +
      (kg.length ? '<table style="border:0;font-size:13px;">' + kg.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>: ' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' : '') +
      '<p>' + esc(PENUTUP) + '</p><p>Wassalamu’alaikum Wr. Wb.</p>' +
      '<p style="text-align:right;">Kepala ' + esc(typeof MADRASAH !== 'undefined' ? titleCase(MADRASAH.nama) : '') + ',<br><br><i>(QR Kepala pada PDF)</i><br><b>' + esc(typeof MADRASAH !== 'undefined' ? tanpaGelar(MADRASAH.kepala_sekolah) : '') + '</b></p>' +
      (tb.length ? '<p style="font-size:12px;">Tembusan:<br>' + tb.map(function (t, i) { return (i + 1) + '. ' + esc(t); }).join('<br>') + '</p>' : '');
  }

  /* ---------- PDF ---------- */
  async function buatPDF(d, nomor) {
    if (typeof ensureLib !== 'function') throw new Error('modul PDF belum tersedia');
    await ensureLib('pdf');
    var doc = new window.jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true }), pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    var mk = 30, mr = 20, lebar = pw - mk - mr, LH = 6.3, y, logo = await v4LoadLogoForPdf();
    var off = Math.max(0, v4KopMadrasahPdf(doc, pw, logo, 20) - 40);   // kop tanpa tumpang tindih logo (app.js)
    y = 52 + off; doc.setFontSize(12);
    var perlu = function (h) { if (y + h > ph - 25) { doc.addPage(); y = 20; } };
    var tulis = function (txt, x, w, bold) { doc.setFont(undefined, bold ? 'bold' : 'normal'); doc.splitTextToSize(String(txt), w).forEach(function (r) { perlu(7); doc.text(r, x, y); y += LH; }); doc.setFont(undefined, 'normal'); };
    doc.text(tempatSurat() + ', ' + fmtTgl(d.tanggalSurat), pw - mr, y, { align: 'right' }); y += 9;
    [['Nomor', nomor, false], ['Sifat', d.sifat, false], ['Lampiran', d.lampiran, false], ['Perihal', d.perihal, true]].forEach(function (h) {
      doc.text(h[0], mk, y); doc.text(':', mk + 24, y); var yy = y; doc.setFont(undefined, h[2] ? 'bold' : 'normal');
      doc.splitTextToSize(String(h[1]), lebar - 28).forEach(function (r) { doc.text(r, mk + 28, yy); yy += LH; }); doc.setFont(undefined, 'normal'); y = yy;
    });
    y += 3; tulis('Kepada Yth.', mk, lebar); tulis(kepadaTxt(d.kelas), mk, lebar, true); tulis('di Tempat', mk, lebar); y += 3;
    tulis('Assalamu’alaikum Wr. Wb.', mk, lebar); y += 1; tulis('Dengan hormat,', mk, lebar); y += 1;
    paragraf(d.isi).forEach(function (p) { tulis(p, mk, lebar); y += 1.5; });
    if (d.rincian && d.rincian.length) {
      perlu(30);
      var body = d.rincian.map(function (r, i) { return [String(i + 1), r.uraian, rp(r.nominal)]; });
      body.push([{ content: 'Total per siswa', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }, { content: rp(d.total), styles: { fontStyle: 'bold', halign: 'right' } }]);
      doc.autoTable({ startY: y, head: [['No', 'Uraian', 'Biaya']], body: body, margin: { left: mk, right: mr }, theme: 'grid',
        styles: { fontSize: 10, cellPadding: 1.8, textColor: 0, lineColor: 0, lineWidth: 0.2 }, headStyles: { fillColor: [235, 235, 235], textColor: 0, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', cellWidth: 40 } } });
      y = doc.lastAutoTable.finalY + 6;
    }
    barisKegiatan(d).forEach(function (h) {
      perlu(7); doc.text(h[0], mk + 6, y); doc.text(':', mk + 36, y); var yy = y;
      doc.splitTextToSize(String(h[1]), lebar - 42).forEach(function (r) { doc.text(r, mk + 40, yy); yy += LH; }); y = yy;
    });
    y += 2; tulis(PENUTUP, mk, lebar); y += 1; tulis('Wassalamu’alaikum Wr. Wb.', mk, lebar);
    var cx = pw - 30 - 40; perlu(70); y += 6;
    doc.splitTextToSize('Kepala ' + titleCase(MADRASAH.nama) + ',', 70).forEach(function (r) { doc.text(r, cx, y, { align: 'center' }); y += LH; });
    var tq = await ttdKepalaPdf(doc, cx, y + 3, { lebar: 35, tinggiMaks: 20, meta: { jenis: 'Surat Edaran Wali Murid', ket: [d.perihal, d.tanggalSurat].filter(Boolean).join(' | ') } });
    y += (tq && tq.dipakai) ? Math.max(24, tq.tinggi + 8) : 22;   // ruang QR/gambar, tidak menimpa nama
    doc.setFont(undefined, 'bold'); doc.text(tanpaGelar(MADRASAH.kepala_sekolah), cx, y, { align: 'center' }); doc.setFont(undefined, 'normal');
    var tb = lines(d.tembusan);
    if (tb.length) { y += 14; perlu(10 + tb.length * 5.5); doc.setFontSize(10); doc.text('Tembusan:', mk, y); y += 5; tb.forEach(function (t, i) { perlu(6); doc.text((i + 1) + '. ' + t, mk, y); y += 5; }); }
    for (var pg = 2; pg <= doc.getNumberOfPages(); pg++) { doc.setPage(pg); doc.setFontSize(10); doc.text('- ' + pg + ' -', pw / 2, 12, { align: 'center' }); }
    return doc;
  }

  /* ---------- terbit ---------- */
  function validasi(d) {
    if (d.perihal.length < 5) return 'Perihal wajib diisi (minimal 5 karakter).';
    if (d.isi.length < 20) return 'Isi surat terlalu pendek.';
    if (!/^\d{4}-\d\d-\d\d$/.test(d.tanggalSurat)) return 'Tanggal surat wajib diisi.';
    if (d.tglKegiatan && !/^\d{4}-\d\d-\d\d$/.test(d.tglKegiatan)) return 'Tanggal kegiatan tidak valid.';
    var b = bersihRows(); if (b.salah) return b.salah;
    if (d.rincian && d.rincian.length) {
      if (d.total <= 0) return 'Total biaya masih Rp 0. Isi nominal tiap baris.';
      if (!/^\d{4}-\d\d-\d\d$/.test(d.batas)) return 'Batas pembayaran wajib diisi pada surat biaya.';
      if (!d.caraBayar) return 'Cara pembayaran wajib diisi pada surat biaya.';
    }
    var sisa = [d.perihal, d.isi, d.tempat, d.caraBayar, (d.rincian || []).map(function (r) { return r.uraian; }).join(' ')].join(' ').match(/\[[^\]]+\]/);
    if (sisa) return 'Masih ada teks template yang belum diganti: ' + sisa[0] + '. Ganti dulu sebelum menerbitkan.';
    return '';
  }
  async function terbitkan() {
    if (!boleh()) return say('Hanya Admin & Kepala Madrasah!', true);
    if (!window.SIMambaNomor || !window.SIMambaAgenda) return say('Modul penomoran/agenda belum dimuat. Muat ulang halaman.', true);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return say('Perlu koneksi internet untuk menerbitkan surat bernomor.', true);
    if (U.busy) return;
    if (U.sudah) return say('Surat ini baru saja diterbitkan. Ubah isinya (atau pilih template) bila ingin menerbitkan surat baru; tombol "Cetak ulang" di daftar untuk mencetak lagi.', true);
    var d = ambil(), err = validasi(d); if (err) return say(err, true);
    U.busy = true; var b = $('ew_btnTerbit'); if (b) b.disabled = true;
    var nomor = '';
    try {
      nomor = await window.SIMambaNomor.kunci('surat-keluar', d.tanggalSurat, v('klas'));
      var hasil = await window.SIMambaAgenda.catatKeluar({ tanggal: d.tanggalSurat, nomor: nomor, pihak: kepadaTxt(d.kelas).replace(/\s+Madrasah.*$/i, ''), perihal: d.perihal,
        ket: 'Surat edaran wali murid', unik: 'edaran-wali:' + U.draft, jenisSurat: 'edaran-wali', rapatId: '', isi: d });
      draftBaru(); U.sudah = true;
      try { if (typeof addLog === 'function') addLog('edaran_wali_terbit', nomor + ' - ' + d.perihal); } catch (e) { /* log tidak boleh menggagalkan */ }
      say('✅ Surat edaran No. ' + nomor + ' diterbitkan & tercatat di Agenda Surat (No. Agenda ' + hasil.noAgenda + ').');
      try { var doc = await buatPDF(d, nomor); doc.save('Surat_Edaran_' + String(nomor).replace(/[^\w]+/g, '_') + '.pdf'); }
      catch (e2) { say('Surat sudah tercatat, tetapi PDF gagal dibuat: ' + (e2 && e2.message || e2) + '. Gunakan "Cetak ulang".', true); }
      await muatAda(); infoNomor();
    } catch (e) {
      say('❌ Gagal menerbitkan: ' + (e && e.message || e) + (nomor ? ' — nomor ' + nomor + ' sudah terkunci; catat manual di Agenda Surat Keluar bila perlu.' : ''), true);
    } finally { U.busy = false; if (b) b.disabled = false; }
  }

  /* ---------- WhatsApp per wali ---------- */
  function siswaTujuan(x) {
    var semua = []; try { semua = allSiswa || []; } catch (e) { semua = []; }
    return semua.filter(function (s) { return x.isi.kelas === 'Semua' || s.kelas === x.isi.kelas; })
      .sort(function (a, b) { return (a.kelas === b.kelas ? 0 : String(a.kelas).localeCompare(String(b.kelas), 'id', { numeric: true })) || String(a.name).localeCompare(String(b.name), 'id'); });
  }
  function pesanWA(x, s) {
    var d = x.isi, kg = barisKegiatan(d);
    return 'Assalamu’alaikum Wr. Wb.\nYth. Bapak/Ibu wali murid dari *' + s.name + '* (' + s.kelas + '),\n\n*' + d.perihal + '*\nNo. ' + x.nomor + '\n\n' + paragraf(d.isi).join('\n\n') +
      (d.rincian && d.rincian.length ? '\n\n*Rincian biaya per siswa:*\n' + d.rincian.map(function (r) { return '• ' + r.uraian + ': ' + rp(r.nominal); }).join('\n') + '\n*Total: ' + rp(d.total) + '*' : '') +
      (kg.length ? '\n\n' + kg.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') : '') +
      '\n\nTerima kasih.\n' + (typeof MADRASAH !== 'undefined' ? MADRASAH.nama : '');
  }
  function daftarWA() {
    var box = $('ew_wa'), x = U.aktif; if (!box || !x) return;
    var list = siswaTujuan(x), tanpa = list.filter(function (s) { return !s.noWaOrtu; }).length;
    var contoh = list.length ? pesanWA(x, list[0]) : '';
    var panjang = encodeURIComponent(contoh).length;
    box.innerHTML = '<div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;">' +
      '<b>Kirim WA — No. ' + esc(x.nomor) + '</b> · ' + list.length + ' siswa' + (tanpa ? ' · <span style="color:#b45309;">' + tanpa + ' belum punya nomor WA wali</span>' : '') +
      (panjang > MAKS_WA ? '<div style="color:#dc2626;margin-top:6px;">⚠️ Teks terlalu panjang untuk tautan WhatsApp (' + panjang + ' > ' + MAKS_WA + '). Ringkas isi surat dan terbitkan revisi, atau kirim PDF secara manual.</div>' : '') +
      '<div style="max-height:320px;overflow:auto;margin-top:8px;">' +
      (list.length ? list.map(function (s) {
        var ok = !!U.terkirim[x.key + '|' + s.key];
        return '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #dbeafe;"><span>' + esc(s.name) + ' <small>(' + esc(s.kelas) + ')</small></span>' +
          (s.noWaOrtu ? '<button type="button" class="btn btn-soft" data-ew-wa="' + esc(s.key) + '">' + (ok ? '✅ Terkirim' : '📲 Kirim') + '</button>' : '<small style="color:#b45309;">tanpa nomor</small>') + '</div>';
      }).join('') : '<p class="text-muted">Tidak ada siswa untuk tujuan ini.</p>') + '</div>' +
      '<div style="margin-top:8px;"><button type="button" class="btn btn-soft" data-ew-tutup="1">Tutup</button></div></div>';
  }
  function aksiWA(e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    if (t.getAttribute('data-ew-tutup')) { U.aktif = null; $('ew_wa').innerHTML = ''; return; }
    var key = t.getAttribute('data-ew-wa'), x = U.aktif; if (!key || !x) return;
    var s = (typeof allSiswa !== 'undefined' ? allSiswa : []).filter(function (q) { return q.key === key; })[0]; if (!s) return say('Data siswa tidak ditemukan!', true);
    var teks = pesanWA(x, s);
    if (encodeURIComponent(teks).length > MAKS_WA) return say('Teks terlalu panjang untuk tautan WhatsApp. Ringkas isi surat atau kirim PDF manual.', true);
    if (typeof kirimWA !== 'function') return say('Fungsi kirim WA belum tersedia.', true);
    kirimWA(s.noWaOrtu, teks); U.terkirim[x.key + '|' + s.key] = 1; t.textContent = '✅ Terkirim';
  }

  /* ---------- tayang di beranda orang tua (Admin) ---------- */
  function umumkan(x, btn) {
    if (!isAdmin()) return say('Hanya Admin!', true);
    var d = x.isi, ringkas = paragraf(d.isi).join(' ').slice(0, 300);
    var teks = ('📄 Surat Edaran No. ' + x.nomor + ' — ' + d.perihal + '. ' + ringkas).slice(0, 500);
    var ok = (typeof doubleConfirm === 'function') ? doubleConfirm('Tayangkan ringkasan surat ini di BERANDA ORANG TUA?\n\nPengumuman ini terbaca publik sebelum login. Pastikan tidak berisi data pribadi.\n\n' + teks) : window.confirm(teks);
    if (!ok) return;
    if (U.busy) return; U.busy = true; if (btn) btn.disabled = true;
    var adm = (typeof window.kredAdminSiap === 'function') ? window.kredAdminSiap() : Promise.resolve(true);
    adm.then(function () {
      var key = db.ref('pengumuman').push().key, now = new Date().toISOString();
      var data = { teks: teks, prioritas: d.sifat === 'Biasa' ? 'info' : 'penting', target: 'ortu', aktif: true, dibuatOleh: currentUser.name, guruKey: currentUser.key || null, tanggal: now };
      var upd = {}; upd['pengumuman/' + key] = data;
      upd['pengumuman_publik/' + key] = (typeof pengumumanPublikData === 'function') ? pengumumanPublikData(data) : { teks: teks, prioritas: data.prioritas, aktif: true, tanggal: now };
      return db.ref().update(upd);
    }).then(function () {
      say('✅ Tayang di beranda orang tua.'); try { if (typeof addLog === 'function') addLog('edaran_wali_umumkan', x.nomor); } catch (e) { /* abaikan */ }
      try { if (typeof loadPengumuman === 'function') loadPengumuman(); } catch (e) { /* abaikan */ }
    }).catch(function (e) { say('Gagal menayangkan: ' + (e && e.message || e), true); })
      .then(function () { U.busy = false; if (btn) btn.disabled = false; });
  }

  if (window.SIMambaSuratTab) window.SIMambaSuratTab.daftar({ id: 'edaran-wali', label: '📣 Surat Edaran Wali', boleh: boleh, buat: buat, buka: buka });
  else console.warn('[SI MAMBA] edaran-wali.js: js/surat-guru.js (v2+) belum dimuat; tab Surat Edaran Wali tidak muncul.');
})();
