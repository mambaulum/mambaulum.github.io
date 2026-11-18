/* ============================================================
   SI MAMBA - js/cek-data.js  (v1)
   Menu Admin "Cek Data": mendeteksi dan memperbaiki data guru/jadwal yang tidak konsisten.
   - Guru ganda (nama sama, key berbeda)
   - Baris Jadwal tanpa guruKey (data lama) dan guruKey yatim (guru sudah tidak ada)
   Perbaikan HANYA menulis ke node 'jadwal' (field guruKey). Data guru TIDAK dihapus; hapus manual
   setelah yakin. Setiap perbaikan: unduh cadangan JSON dulu, minta konfirmasi, catat ke log.
   Dimuat SESUDAH app.js dan jadwal.js. Halaman: page-cek-data (navigateTo memanggil setupCekDataPage).
   ============================================================ */
(function () {
  'use strict';

  var _hasil = null; // hasil analisis terakhir (dipakai tombol aksi)

  function norm(x) { return String(x || '').toLowerCase().replace(/[\s.,]+/g, ''); }

  // ---------- Analisis murni (tanpa DOM/Firebase) ----------
  // guruList: [{key,name,role,kelas,...}]  jadwalList: [{key,guru,guruKey,...}]
  // jurnalList (opsional): [{guru,guruKey}] -- hanya yang sedang dimuat di memori.
  function cekDataAnalisis(guruList, jadwalList, jurnalList) {
    guruList = guruList || []; jadwalList = jadwalList || []; jurnalList = jurnalList || [];
    var guruByKey = {}; guruList.forEach(function (g) { if (g.key) guruByKey[g.key] = g; });

    var groups = {};
    guruList.forEach(function (g) { var n = norm(g.name); if (!n) return; (groups[n] = groups[n] || []).push(g); });

    var kembar = [];
    Object.keys(groups).forEach(function (n) {
      var arr = groups[n]; if (arr.length < 2) return;
      var tanpaKey = jadwalList.filter(function (j) { return !j.guruKey && norm(j.guru) === n; });
      kembar.push({
        nama: arr[0].name,
        tanpaKeyJumlah: tanpaKey.length,
        anggota: arr.map(function (g) {
          return {
            key: g.key, name: g.name, role: g.role || '-', kelas: g.kelas || '',
            jadwal: jadwalList.filter(function (j) { return j.guruKey === g.key; }).length,
            jurnal: jurnalList.filter(function (j) { return j.guruKey === g.key; }).length
          };
        })
      });
    });

    var unik = [], nol = [], ambigu = [];
    jadwalList.forEach(function (j) {
      if (j.guruKey || !j.guru) return;
      var cand = groups[norm(j.guru)] || [];
      if (cand.length === 1) unik.push({ jadwalKey: j.key, guru: j.guru, kelas: j.kelas, hari: j.hari, jam: j.jam, guruKey: cand[0].key });
      else if (cand.length === 0) nol.push({ jadwalKey: j.key, guru: j.guru, kelas: j.kelas, hari: j.hari, jam: j.jam });
      else ambigu.push({ jadwalKey: j.key, guru: j.guru, kelas: j.kelas, hari: j.hari, jam: j.jam });
    });

    var yatim = jadwalList.filter(function (j) { return j.guruKey && !guruByKey[j.guruKey]; })
      .map(function (j) { return { jadwalKey: j.key, guru: j.guru, kelas: j.kelas, hari: j.hari, jam: j.jam, guruKey: j.guruKey }; });

    return { kembar: kembar, unik: unik, nol: nol, ambigu: ambigu, yatim: yatim,
      total: { guru: guruList.length, jadwal: jadwalList.length } };
  }
  window.cekDataAnalisis = cekDataAnalisis;

  // ---------- Pembantu ----------
  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function bacaNode(path) {
    return new Promise(function (resolve, reject) {
      db.ref(path).once('value', function (snap) {
        var arr = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); }); resolve(arr);
      }, reject);
    });
  }
  function unduhCadangan(guru, jadwal) {
    var data = { dibuat: new Date().toISOString(), catatan: 'Cadangan sebelum perbaikan Cek Data', guru: guru, jadwal: jadwal };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cadangan-guru-jadwal-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function tabel(kepala, baris) {
    if (!baris.length) return '';
    return '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f3f4f6;">' +
      kepala.map(function (h) { return '<th style="padding:6px 8px;text-align:left;">' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + baris.map(function (r) { return '<tr>' + r.map(function (c) { return '<td style="padding:6px 8px;border-top:1px solid #e5e7eb;">' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  }
  function bagian(judul, ok, isi) {
    return '<div style="margin-top:14px;"><div style="font-weight:700;margin-bottom:6px;">' + (ok ? '✅ ' : '⚠️ ') + judul + '</div>' + isi + '</div>';
  }

  // ---------- Tampilan ----------
  function render() {
    var h = _hasil, box = el('cekDataHasil'); if (!box) return;
    var out = '';

    // 1. Guru ganda
    if (!h.kembar.length) out += bagian('Guru ganda', true, '<p class="text-muted">Tidak ada nama guru yang kembar.</p>');
    else {
      var isi = '<p class="text-muted" style="font-size:12px;">Pilih guru yang dipertahankan. Semua jadwal guru lainnya (dan jadwal lama tanpa key bernama sama) dialihkan ke guru itu. Data guru tidak dihapus.</p>';
      h.kembar.forEach(function (g, gi) {
        isi += '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-bottom:10px;"><div style="font-weight:600;">' + esc(g.nama) + ' <span class="text-muted" style="font-weight:400;">· ' + g.anggota.length + ' akun · ' + g.tanpaKeyJumlah + ' jadwal lama tanpa key</span></div>' +
          tabel(['ID', 'Peran', 'Kelas', 'Jadwal', 'Jurnal*', 'Aksi'], g.anggota.map(function (a) {
            return [esc('…' + String(a.key).slice(-6)), esc(a.role), esc(a.kelas || '-'), a.jadwal, a.jurnal,
              '<button class="btn btn-warning" data-aksi="alihkan" data-g="' + gi + '" data-target="' + esc(a.key) + '">Pertahankan ini</button>'];
          })) + '</div>';
      });
      isi += '<p class="text-muted" style="font-size:11px;">*Jurnal dihitung dari data yang sedang dimuat di aplikasi (tahun ajaran aktif), bukan seluruh riwayat.</p>';
      out += bagian('Guru ganda (' + h.kembar.length + ' nama)', false, isi);
    }

    // 2. Jadwal tanpa guruKey
    var tot = h.unik.length + h.nol.length + h.ambigu.length;
    if (!tot) out += bagian('Jadwal tanpa guruKey', true, '<p class="text-muted">Semua baris jadwal sudah punya guruKey.</p>');
    else {
      var isi2 = '<p>' + h.unik.length + ' baris bisa dipetakan otomatis · ' + h.ambigu.length + ' ambigu (nama kembar) · ' + h.nol.length + ' tanpa guru yang cocok.</p>';
      if (h.unik.length) isi2 += '<button class="btn btn-success" data-aksi="isikey">Isi guruKey otomatis (' + h.unik.length + ' baris)</button>';
      var sisa = h.ambigu.map(function (r) { return ['ambigu', r]; }).concat(h.nol.map(function (r) { return ['tanpa guru', r]; }));
      if (sisa.length) isi2 += '<div style="margin-top:8px;">' + tabel(['Status', 'Guru', 'Kelas', 'Hari', 'Jam'], sisa.slice(0, 50).map(function (x) { return [x[0], esc(x[1].guru), esc(x[1].kelas), esc(x[1].hari), esc(x[1].jam)]; })) + (sisa.length > 50 ? '<p class="text-muted">…dan ' + (sisa.length - 50) + ' lainnya.</p>' : '') + '</div>';
      out += bagian('Jadwal tanpa guruKey (' + tot + ' baris)', false, isi2);
    }

    // 3. guruKey yatim
    if (!h.yatim.length) out += bagian('guruKey yatim', true, '<p class="text-muted">Semua guruKey di jadwal masih ada di data guru.</p>');
    else out += bagian('guruKey yatim (' + h.yatim.length + ' baris)', false,
      '<p class="text-muted" style="font-size:12px;">Jadwal ini menunjuk guru yang sudah tidak ada. Ubah gurunya lewat menu Jadwal (tidak diperbaiki otomatis).</p>' +
      tabel(['Guru', 'Kelas', 'Hari', 'Jam'], h.yatim.slice(0, 50).map(function (r) { return [esc(r.guru), esc(r.kelas), esc(r.hari), esc(r.jam)]; })));

    box.innerHTML = '<p class="text-muted" style="font-size:12px;">Diperiksa: ' + h.total.guru + ' guru, ' + h.total.jadwal + ' baris jadwal.</p>' + out;
  }

  // ---------- Pemeriksaan ----------
  function jalankan(btn) {
    if (typeof isAdmin === 'function' && !isAdmin()) return toast('Hanya Admin!', true);
    var box = el('cekDataHasil'); if (box) box.innerHTML = '<p class="text-muted">Membaca data terbaru…</p>';
    Promise.all([bacaNode('guru'), bacaNode('jadwal')]).then(function (r) {
      _hasil = cekDataAnalisis(r[0], r[1], (typeof allJournals !== 'undefined') ? allJournals : []);
      _hasil._guru = r[0]; _hasil._jadwal = r[1];
      render();
    }).catch(function (e) { if (box) box.innerHTML = '<p style="color:#b91c1c;">Gagal membaca data: ' + esc((e && e.message) || e) + '</p>'; });
  }

  // ---------- Perbaikan ----------
  function terapkan(btn, updates, ringkas) {
    var n = Object.keys(updates).length;
    if (!n) return toast('Tidak ada yang perlu diubah.');
    if (!confirm(ringkas + '\n\nSebuah file cadangan JSON akan diunduh dulu. Lanjutkan?')) return;
    if (typeof isBusy === 'function' && isBusy('cekDataTulis')) return toast('Sedang menyimpan…', false, 1500);
    setBusy('cekDataTulis', btn);
    var lepas = function () { clearBusy('cekDataTulis', btn); };
    tulisAdmin('cekDataTulis', btn, function () {
      try { unduhCadangan(_hasil._guru, _hasil._jadwal); } catch (e) { lepas(); return toast('Gagal membuat cadangan, perbaikan dibatalkan.', true); }
      var keys = Object.keys(updates), bagianPaket = [];
      for (var i = 0; i < keys.length; i += 400) { var p = {}; keys.slice(i, i + 400).forEach(function (k) { p[k] = updates[k]; }); bagianPaket.push(p); }
      bagianPaket.reduce(function (pr, p) { return pr.then(function () { return db.ref().update(p); }); }, Promise.resolve())
        .then(function () {
          try { addLog('Cek Data', ringkas.split('\n')[0] + ' (' + n + ' baris)'); } catch (e) {}
          toast('✅ ' + n + ' baris jadwal diperbarui');
          if (typeof loadJadwal === 'function') { try { loadJadwal(); } catch (e) {} }
          lepas(); jalankan();
        })
        .catch(function (e) { lepas(); toast('Gagal menyimpan: ' + ((e && e.message) || e), true); });
    }, lepas);
  }

  function aksiIsiKey(btn) {
    var u = {}; _hasil.unik.forEach(function (r) { u['jadwal/' + r.jadwalKey + '/guruKey'] = r.guruKey; });
    terapkan(btn, u, 'Isi guruKey otomatis untuk ' + _hasil.unik.length + ' baris jadwal lama.');
  }
  function aksiAlihkan(btn, gi, target) {
    var g = _hasil.kembar[gi]; if (!g) return;
    var lain = g.anggota.map(function (a) { return a.key; }).filter(function (k) { return k !== target; });
    var n = norm(g.nama), u = {};
    _hasil._jadwal.forEach(function (j) {
      if ((j.guruKey && lain.indexOf(j.guruKey) >= 0) || (!j.guruKey && norm(j.guru) === n)) {
        if (j.guruKey !== target) u['jadwal/' + j.key + '/guruKey'] = target;
      }
    });
    var t = g.anggota.filter(function (a) { return a.key === target; })[0];
    terapkan(btn, u, 'Alihkan jadwal "' + g.nama + '" ke akun …' + String(target).slice(-6) + (t && t.kelas ? ' (kelas ' + t.kelas + ')' : '') + '.');
  }

  // ---------- Halaman ----------
  window.setupCekDataPage = function () {
    var body = el('cekDataBody'); if (!body) return;
    if (typeof isAdmin === 'function' && !isAdmin()) { body.innerHTML = '<p class="text-muted">Hanya Admin.</p>'; return; }
    if (!body.dataset.siap) {
      body.dataset.siap = '1';
      body.innerHTML = '<button class="btn btn-primary" data-aksi="periksa">🔍 Periksa data</button><div id="cekDataHasil" style="margin-top:8px;"></div>';
      body.addEventListener('click', function (ev) {
        var b = ev.target.closest('button[data-aksi]'); if (!b) return;
        var a = b.dataset.aksi;
        if (a === 'periksa') jalankan(b);
        else if (!_hasil) toast('Jalankan pemeriksaan dulu.', true);
        else if (a === 'isikey') aksiIsiKey(b);
        else if (a === 'alihkan') aksiAlihkan(b, parseInt(b.dataset.g, 10), b.dataset.target);
      });
    }
    jalankan();
  };
})();
