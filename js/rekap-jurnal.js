/* ============================================================
   REKAP JURNAL MENGAJAR (menu Pembelajaran, khusus Admin & Kepsek)
   Halaman #page-rekap-jurnal ada di index.html. Modul ini hanya mengisi filter, menampilkan
   pratinjau rekap, dan memanggil downloadRekapJurnal() milik app.js untuk unduh PDF-nya
   (satu sumber kode PDF, hasilnya sama dengan tombol "Jurnal (PDF)" di Rekap Sekolah).
   Dimuat SETELAH app.js & menu-hub.js (lihat index.html).
============================================================ */
(function () {
  'use strict';

  var MAX_BARIS = 300; // batas baris pratinjau; PDF tetap memuat semua baris

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value : ''; }
  function bolehAkses() { return (typeof isAdmin === 'function' && isAdmin()) || (typeof isKepsek === 'function' && isKepsek()); }

  // Sama dengan rekapPeriode() di app.js, tapi membaca filter halaman ini.
  function periode() {
    var tgl = val('rjTanggal') || tglLokal();
    if (val('rjPeriode') !== 'bulanan') {
      return { bulanan: false, tgl: tgl, tag: tgl, label: 'Tanggal: ' + rekapTglIndonesia(tgl), cocok: function (t) { return t === tgl; } };
    }
    var pre = tgl.slice(0, 7), m = parseInt(tgl.slice(5, 7), 10);
    return { bulanan: true, tgl: tgl, tag: pre, label: 'Bulan: ' + REKAP_BULAN_ID[m - 1] + ' ' + tgl.slice(0, 4), cocok: function (t) { return (t || '').indexOf(pre) === 0; } };
  }

  function dataTersaring() {
    var P = periode(), g = val('rjGuru'), k = val('rjKelas');
    // Jurnal yang ditolak tidak ikut direkap (sama dengan PDF).
    var data = allJournals.filter(function (j) { return P.cocok(j.tanggal) && j.status !== 'ditolak'; });
    if (g) data = data.filter(function (j) { return (j.guruKey || j.guru) === g; });
    if (k) data = data.filter(function (j) { return j.kelas === k; });
    return data.slice().sort(function (a, b) {
      return (a.tanggal || '').localeCompare(b.tanggal || '') ||
        COLLATOR_ID.compare(a.guru || '', b.guru || '') ||
        ((parseInt(a.jam_ke, 10) || 0) - (parseInt(b.jam_ke, 10) || 0));
    });
  }

  function isiGuru() {
    var sel = el('rjGuru'); if (!sel) return;
    var cur = sel.value;
    var opts = ['<option value="">Semua Guru</option>'];
    (allGuru || []).slice().sort(function (a, b) { return COLLATOR_ID.compare(a.name || '', b.name || ''); }).forEach(function (g) {
      var v = g.key || g.name;
      opts.push('<option value="' + escapeHtml(v) + '">' + escapeHtml(g.name || v) + '</option>');
    });
    sel.innerHTML = opts.join('');
    sel.value = cur;
  }

  function isiKelas() {
    var sel = el('rjKelas'); if (!sel) return;
    var cur = sel.value;
    if (typeof populateKelasSelect === 'function') populateKelasSelect(sel, { extraFirst: 'Semua Kelas', extraFirstValue: '' });
    else sel.innerHTML = '<option value="">Semua Kelas</option>' + KELAS_LIST.map(function (k) { return '<option>' + escapeHtml(k) + '</option>'; }).join('');
    sel.value = cur;
  }

  function render() {
    var list = el('rjList'); if (!list) return;
    if (!bolehAkses()) { list.innerHTML = '<p class="text-muted">Hanya Admin & Kepsek yang bisa membuka rekap jurnal.</p>'; return; }
    var data = dataTersaring();
    var guruSet = {}; data.forEach(function (j) { guruSet[j.guruKey || j.guru || '-'] = 1; });
    el('rjTotalJurnal').textContent = data.length;
    el('rjTotalGuru').textContent = Object.keys(guruSet).length;
    el('rjLabelPeriode').textContent = periode().label;
    if (!data.length) { list.innerHTML = '<p class="text-muted" style="text-align:center;padding:16px;">Tidak ada jurnal pada filter ini.</p>'; return; }
    var jenis = function (j) { return j.type || (typeof isJamEkstra === 'function' && isJamEkstra(j.jam_ke) ? 'Ekstra' : 'Reguler'); };
    var th = 'style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;font-size:12px;white-space:nowrap;"';
    var td = 'style="padding:8px;border-bottom:1px solid #f1f5f9;font-size:13px;vertical-align:top;"';
    var rows = data.slice(0, MAX_BARIS).map(function (j, i) {
      return '<tr><td ' + td + '>' + (i + 1) + '</td><td ' + td + ' nowrap>' + escapeHtml(rekapTglPendek(j.tanggal)) + '</td><td ' + td + '>' + escapeHtml(j.guru || '-') +
        '</td><td ' + td + '>' + escapeHtml(j.kelas || '-') + '</td><td ' + td + '>' + escapeHtml(j.subject || '-') +
        '</td><td ' + td + '>' + escapeHtml(j.activity || '-') + '</td><td ' + td + '>' + escapeHtml(String(j.jam_ke || '-')) +
        '</td><td ' + td + '>' + escapeHtml(jenis(j)) + '</td></tr>';
    }).join('');
    list.innerHTML = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:640px;"><thead><tr>' +
      ['No', 'Tanggal', 'Guru', 'Kelas', 'Mapel', 'Kegiatan', 'Jam', 'Jenis'].map(function (h) { return '<th ' + th + '>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (data.length > MAX_BARIS ? '<p class="text-muted" style="font-size:12px;margin-top:8px;">Menampilkan ' + MAX_BARIS + ' dari ' + data.length + ' jurnal. File PDF memuat semuanya.</p>' : '');
  }

  function unduhPdf() {
    if (!bolehAkses()) return toast('Hanya Admin & Kepsek!', true);
    return window.downloadRekapJurnal({ P: periode(), filterGuru: val('rjGuru'), filterKelas: val('rjKelas') });
  }

  function setup() {
    if (!el('page-rekap-jurnal')) return;
    if (!el('rjTanggal').value) el('rjTanggal').value = tglLokal();
    isiGuru(); isiKelas(); render();
    // Muat ulang data jurnal terbaru dari server, lalu gambar ulang.
    if (typeof reloadDataset === 'function') { try { reloadDataset(['journal'], render); } catch (e) { console.error('[rekap-jurnal]', e); } }
  }

  window.rjRender = render;
  window.rjUnduhPdf = unduhPdf;

  var origNav = window.navigateTo;
  if (typeof origNav === 'function') {
    window.navigateTo = function (page) {
      var r = origNav.apply(this, arguments);
      if (page === 'rekap-jurnal') {
        try {
          var t = el('pageTitle'); if (t) t.textContent = 'Rekap Jurnal Mengajar';
          setup();
        } catch (e) { console.error('[rekap-jurnal]', e); }
      }
      return r;
    };
  }
})();
