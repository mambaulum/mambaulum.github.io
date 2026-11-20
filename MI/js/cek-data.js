/* ============================================================
   SI MAMBA - js/cek-data.js  (v4)
   Menu Admin "Cek Data": mendeteksi dan memperbaiki data guru/jadwal yang tidak konsisten.
   - Guru ganda (nama sama, key berbeda)
   - Baris Jadwal tanpa guruKey (data lama) dan guruKey yatim (guru sudah tidak ada)
   v2: bagian "Dampak ke honor" -- memeriksa data yang dibaca rekap Honor (jurnal, lembur/rapat, ujian, PIC ekskul)
   untuk satu bulan: baris honor terbelah/hantu, jurnal pending yang ikut terhitung, jurnal ganda, jam_ke tak dikenal.
   v3: panel "Diagnosa Input Nilai" -- pilih guru + kelas, lihat baris Jadwal yang dihitung/tidak dihitung untuk daftar mapel di Input Nilai
   (mis. kenapa Seni dan Budaya tidak muncul). Hanya membaca, tidak menulis apa pun.
   v4: tampilan dibagi tab bergaya hub-tabs (Guru & Jadwal | Honor | Diagnosa Nilai) dengan penanda jumlah temuan; logika analisis & perbaikan tidak berubah.
   Perbaikan hanya menulis field guruKey (node jadwal, journal, event_attendance, ujian_attendance, ekskul_pic_honor_v4).
   Data guru TIDAK dihapus; hapus manual setelah yakin. Setiap perbaikan: unduh cadangan JSON dulu, minta konfirmasi, catat ke log.
   v5: bagian Honor memeriksa honor ujian/lembur/rapat yang jamnya bertumpuk (honorCariBentrok di honor-guru.js) dan kecocokan jadwal ujian - Daftar Hadir - check-in - susulan (window.cekDataHonorUjian, administrasi-ujian.js). Hanya membaca.
   Dimuat SESUDAH app.js dan jadwal.js. Halaman: page-cek-data (navigateTo memanggil setupCekDataPage).
   ============================================================ */
(function () {
  'use strict';

  var _hasil = null; // hasil analisis terakhir (dipakai tombol aksi)
  var _tab = 'guru'; // tab aktif Cek Data
  var _honor = null; // hasil analisis honor terakhir (+ _sumber: rekaman yang dianalisis)

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

  // ---------- Analisis honor (murni, tanpa DOM/Firebase) ----------
  // o = { ym:'YYYY-MM', guru:[...], jurnal:[...], event:[...], ujian:[...], ekskul:[...], jamSettings:{}, nilai:function(jurnal)->Rp }
  // Semua rekaman SUDAH disaring bulan & tahun ajaran (sama dengan renderHonor). Meniru honorBuatResolver():
  // guruKey bila ada -> nama persis di daftar guru (yang pertama) -> nama mentah (jadi baris "hantu" sendiri).
  function cekHonorAnalisis(o) {
    var guruList = o.guru || [], nilai = o.nilai || function () { return 0; };
    var SUMBER = [
      { id: 'jurnal', label: 'Jurnal', path: 'journal', arr: o.jurnal || [] },
      { id: 'event', label: 'Lembur/Rapat', path: 'event_attendance', arr: (o.event || []).filter(function (e) { return e && e.guruKey !== 'kepsek'; }) },
      { id: 'ujian', label: 'Ujian', path: 'ujian_attendance', arr: o.ujian || [] },
      { id: 'ekskul', label: 'PIC Ekskul', path: 'ekskul_pic_honor_v4', arr: o.ekskul || [] }
    ];
    var byKey = {}, byNama = Object.create(null), byNorm = Object.create(null);
    guruList.forEach(function (g) {
      if (!g || !g.key) return;
      byKey[g.key] = g;
      if (g.name && byNama[g.name] === undefined) byNama[g.name] = g;
      var n = norm(g.name); if (n) (byNorm[n] = byNorm[n] || []).push(g);
    });
    function akun(r) { if (r.guruKey) return byKey[r.guruKey] ? r.guruKey : null; var g = byNama[r.guru]; return g ? g.key : null; }

    var T = { namaBeda: [], hantu: [], yatim: [], namaKembar: [], pending: [], ganda: [], jamAsing: [], tipeKosong: [], kembar: [], tunjanganGanda: [] };
    var hitung = {}; // key akun -> {sumberId: n}
    var total = { jurnal: 0, event: 0, ujian: 0, ekskul: 0 };
    SUMBER.forEach(function (sm) {
      sm.arr.forEach(function (r) {
        if (!r) return; total[sm.id]++;
        var info = { sumber: sm.label, path: sm.path, key: r.key, guru: r.guru || '', tanggal: r.tanggal || '', guruKey: r.guruKey || '' };
        var a = akun(r); if (a) { (hitung[a] = hitung[a] || {})[sm.id] = ((hitung[a] || {})[sm.id] || 0) + 1; }
        if (r.guruKey) { if (!byKey[r.guruKey]) T.yatim.push(info); return; }
        if (byNama[r.guru]) { if ((byNorm[norm(r.guru)] || []).length > 1) T.namaKembar.push(info); return; }
        var cand = byNorm[norm(r.guru)] || [];
        if (cand.length === 1) { info.guruKeyBaru = cand[0].key; info.guruResmi = cand[0].name; T.namaBeda.push(info); }
        else T.hantu.push(info); // tidak ada guru bernama itu, atau beberapa kandidat (ambigu)
      });
    });

    // Akun ganda: kelompok nama (dinormalisasi) dengan >1 akun
    Object.keys(byNorm).forEach(function (n) {
      var arr = byNorm[n]; if (arr.length < 2) return;
      var anggota = arr.map(function (g) {
        var h = hitung[g.key] || {};
        var jml = (h.jurnal || 0) + (h.event || 0) + (h.ujian || 0) + (h.ekskul || 0);
        var tunj = (g.role === 'guru' || g.role === 'wali_kelas') && (((g.tunjanganMasaKerja || 0) > 0) || ((g.bantuanTransportasi || 0) > 0));
        return { key: g.key, role: g.role || '-', kelas: g.kelas || '', jurnal: h.jurnal || 0, lain: (h.event || 0) + (h.ujian || 0) + (h.ekskul || 0), total: jml, tunjangan: tunj };
      });
      var lainNoKey = T.namaKembar.filter(function (x) { return norm(x.guru) === n; }).length + T.namaBeda.filter(function (x) { return norm(x.guru) === n; }).length;
      var adaData = anggota.some(function (x) { return x.total > 0; }) || lainNoKey > 0;
      var nTunj = anggota.filter(function (x) { return x.tunjangan; }).length;
      if (nTunj > 1) T.tunjanganGanda.push({ nama: arr[0].name, jumlah: nTunj });
      if (adaData || nTunj > 1) T.kembar.push({ nama: arr[0].name, norm: n, anggota: anggota, tanpaKey: lainNoKey });
    });

    // Jurnal: pending ikut terhitung, ganda, jam_ke tak dikenal, tipe kosong
    var peta = {}, jamPunya = o.jamSettings && Object.keys(o.jamSettings).length > 0, tipeAda = { 'Reguler': 1, 'Non-Reguler': 1 };
    var pendingRp = 0, gandaRp = 0, kosongStatus = 0;
    (o.jurnal || []).forEach(function (j) {
      if (!j) return;
      var rp = nilai(j), nm = j.guru || '';
      if (j.status === 'pending') { T.pending.push({ key: j.key, guru: nm, tanggal: j.tanggal, jam: j.jam_ke, kelas: j.kelas, rp: rp, diajukan: j.requestedAt || j.dibuat || '' }); pendingRp += rp; }
      if (!j.status) kosongStatus++;
      var id = (j.guruKey || ('n:' + norm(nm))) + '|' + j.tanggal + '|' + j.jam_ke + '|' + norm(j.kelas);
      (peta[id] = peta[id] || []).push({ j: j, rp: rp });
      if (jamPunya && j.jam_ke != null && !o.jamSettings[j.jam_ke]) T.jamAsing.push({ key: j.key, guru: nm, tanggal: j.tanggal, jam: j.jam_ke, kelas: j.kelas });
      if (!tipeAda[j.type]) T.tipeKosong.push({ key: j.key, guru: nm, tanggal: j.tanggal, jam: j.jam_ke, tipe: j.type || '(kosong)' });
    });
    Object.keys(peta).forEach(function (id) {
      var a = peta[id]; if (a.length < 2) return;
      var j0 = a[0].j;
      var ekstra = a.slice(1).reduce(function (t, x) { return t + x.rp; }, 0); gandaRp += ekstra;
      // Salinan yang disimpan = yang paling layak: bukan pending, kegiatan paling lengkap, lalu yang tersimpan paling awal (kunci push berurutan waktu).
      var skor = function (j) { return (j.status === 'pending' ? -500 : 0) + String(j.activity || '').length; };
      var urut = a.slice().sort(function (p, q) { return skor(q.j) - skor(p.j) || String(p.j.key).localeCompare(String(q.j.key)); });
      T.ganda.push({ guru: j0.guru || '', tanggal: j0.tanggal, jam: j0.jam_ke, kelas: j0.kelas, jumlah: a.length, rpLebih: ekstra, keys: a.map(function (x) { return x.j.key; }),
        anggota: urut.map(function (x) { return { key: x.j.key, mapel: x.j.subject || '', kegiatan: x.j.activity || '', status: x.j.status || '', data: x.j }; }) });
    });
    T.pending.sort(function (a, b) { return String(a.tanggal).localeCompare(b.tanggal); });
    T.ganda.sort(function (a, b) { return String(a.tanggal).localeCompare(b.tanggal); });
    return { ym: o.ym, total: total, T: T, pendingRp: pendingRp, gandaRp: gandaRp, kosongStatus: kosongStatus, jamPunya: !!jamPunya };
  }
  window.cekHonorAnalisis = cekHonorAnalisis;

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
  function unduhCadanganUmum(catatan, data) {
    var isi = Object.assign({ dibuat: new Date().toISOString(), catatan: catatan }, data);
    var blob = new Blob([JSON.stringify(isi, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cadangan-cek-data-honor-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function rp(n) { return 'Rp ' + (Math.round(n || 0)).toLocaleString('id-ID'); }
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

    box.innerHTML = out;
    var info = el('cdInfo'); if (info) info.textContent = 'Diperiksa: ' + h.total.guru + ' guru, ' + h.total.jadwal + ' baris jadwal.';
    var ph = el('cdHonorIsi'); if (ph) ph.innerHTML = renderDampakHonor();
    var pn = el('cdPanNilai'); if (pn) pn.innerHTML = renderDiagnosaNilai();
    var T = _honor && _honor.T, nG = h.kembar.length + h.unik.length + h.nol.length + h.ambigu.length + h.yatim.length;
    var nH = T ? T.pending.length + T.namaBeda.length + T.hantu.length + T.yatim.length + T.namaKembar.length + T.kembar.length + T.ganda.length + T.jamAsing.length + T.tipeKosong.length + ((_honor && _honor.bentrok) ? _honor.bentrok.total : 0) : 0;
    badge('guru', nG); badge('honor', nH);
  }
  function badge(tab, n) {
    var b = document.querySelector('[data-cdtab="' + tab + '"] .cd-bdg'); if (!b) return;
    b.textContent = n > 0 ? String(n) : '✓';
    b.style.cssText = 'display:inline-block;margin-left:6px;min-width:18px;padding:0 6px;border-radius:999px;font-size:11px;font-weight:700;line-height:18px;text-align:center;' +
      (n > 0 ? 'background:#fee2e2;color:#b91c1c;' : 'background:#d1fae5;color:#047857;');
  }
  function pilihTab(t) {
    _tab = t;
    ['guru', 'honor', 'nilai'].forEach(function (k) {
      var pan = k === 'guru' ? el('cekDataHasil') : el(k === 'honor' ? 'cdPanHonor' : 'cdPanNilai');
      if (pan) pan.hidden = (k !== t);
      var bt = document.querySelector('[data-cdtab="' + k + '"]');
      if (bt) { bt.classList.toggle('active', k === t); bt.setAttribute('aria-selected', k === t ? 'true' : 'false'); }
    });
  }

  // ---------- Tampilan: Dampak ke honor ----------
  function renderDampakHonor() {
    var d = _honor; if (!d) return '';
    var T = d.T, tot = d.total, n = tot.jurnal + tot.event + tot.ujian + tot.ekskul, out = '';
    out += '<div style=""><div style="font-weight:800;font-size:15px;">💰 Dampak ke honor — ' + esc(d.ym) + '</div>' +
      '<p class="text-muted" style="font-size:12px;">Dibaca dari data yang dimuat di aplikasi (tahun ajaran aktif), sama dengan rekap Honor: ' + tot.jurnal + ' jurnal, ' + tot.event + ' lembur/rapat, ' + tot.ujian + ' ujian, ' + tot.ekskul + ' PIC ekskul. Nominal hanya perkiraan dari tarif saat ini.</p></div>';
    if (!n) return out + '<p class="text-muted">Tidak ada data honor di bulan ini (atau data belum termuat — buka halaman Jurnal/Honor dulu lalu periksa lagi).</p>';

    // 1. Jurnal pending ikut terhitung
    if (!T.pending.length) out += bagian('Jurnal Susulan pending', true, '<p class="text-muted">Tidak ada jurnal pending di bulan ini.</p>');
    else out += bagian('Jurnal pending ikut terhitung honor (' + T.pending.length + ' jurnal, ± ' + rp(d.pendingRp) + ')', false,
      '<p class="text-muted" style="font-size:12px;">Rekap Honor hanya membuang status “ditolak”, jadi Jurnal Susulan yang belum disetujui Admin sudah ikut dibayar. Setujui atau tolak lewat menu Approval; atau minta honor-guru.js diubah agar pending tidak dihitung.</p>' +
      tabel(['Guru', 'Tanggal', 'Jam', 'Kelas', 'Perkiraan'], T.pending.slice(0, 30).map(function (r) { return [esc(r.guru), esc(r.tanggal), esc(r.jam), esc(r.kelas), rp(r.rp)]; })) +
      (T.pending.length > 30 ? '<p class="text-muted">…dan ' + (T.pending.length - 30) + ' lainnya.</p>' : ''));

    // 2. Nama tulisan beda -> baris honor terpisah
    if (!T.namaBeda.length) out += bagian('Baris honor terpisah karena tulisan nama', true, '<p class="text-muted">Tidak ada rekaman tanpa guruKey yang namanya hanya beda titik/spasi.</p>');
    else out += bagian('Baris honor terpisah karena tulisan nama (' + T.namaBeda.length + ' rekaman)', false,
      '<p class="text-muted" style="font-size:12px;">Rekaman tanpa guruKey ini namanya beda sedikit dari data guru (mis. “S.Pd.” vs “S.Pd”), jadi rekap Honor menjadikannya baris sendiri. Isi guruKey otomatis akan menyatukannya ke guru yang cocok.</p>' +
      '<button class="btn btn-success" data-aksi="honor-isikey">Isi guruKey otomatis (' + T.namaBeda.length + ' rekaman)</button>' +
      '<div style="margin-top:8px;">' + tabel(['Sumber', 'Tertulis', 'Guru resmi', 'Tanggal'], T.namaBeda.slice(0, 30).map(function (r) { return [esc(r.sumber), esc(r.guru), esc(r.guruResmi), esc(r.tanggal)]; })) + (T.namaBeda.length > 30 ? '<p class="text-muted">…dan ' + (T.namaBeda.length - 30) + ' lainnya.</p>' : '') + '</div>');

    // 3. Nama tidak dikenal
    if (!T.hantu.length) out += bagian('Nama tidak dikenal', true, '<p class="text-muted">Semua rekaman tanpa guruKey cocok dengan satu guru.</p>');
    else out += bagian('Nama tidak dikenal / ambigu (' + T.hantu.length + ' rekaman)', false,
      '<p class="text-muted" style="font-size:12px;">Tidak ada guru yang cocok (atau cocok dengan lebih dari satu akun), sehingga muncul sebagai baris honor sendiri tanpa tunjangan. Perbaiki manual atau lewat “Pertahankan ini” pada akun ganda.</p>' +
      tabel(['Sumber', 'Nama tertulis', 'Tanggal'], T.hantu.slice(0, 30).map(function (r) { return [esc(r.sumber), esc(r.guru || '(kosong)'), esc(r.tanggal)]; })) + (T.hantu.length > 30 ? '<p class="text-muted">…dan ' + (T.hantu.length - 30) + ' lainnya.</p>' : ''));

    // 4. guruKey yatim
    if (!T.yatim.length) out += bagian('guruKey yatim di data honor', true, '<p class="text-muted">Semua guruKey di rekaman honor masih ada di data guru.</p>');
    else out += bagian('guruKey yatim di data honor (' + T.yatim.length + ' rekaman)', false,
      '<p class="text-muted" style="font-size:12px;">Akun gurunya sudah tidak ada: baris honor tampil dengan nama tertulis dan tanpa tunjangan/transport.</p>' +
      tabel(['Sumber', 'Nama tertulis', 'Tanggal'], T.yatim.slice(0, 30).map(function (r) { return [esc(r.sumber), esc(r.guru), esc(r.tanggal)]; })));

    // 5. Nama kembar tanpa key
    if (T.namaKembar.length) out += bagian('Nama kembar tanpa guruKey (' + T.namaKembar.length + ' rekaman)', false,
      '<p class="text-muted" style="font-size:12px;">Dua akun bernama sama; rekaman tanpa guruKey dihitung ke akun yang pertama di daftar guru, belum tentu yang benar. Selesaikan lewat “Pertahankan ini” di bawah.</p>');

    // 6. Akun ganda
    if (!T.kembar.length) out += bagian('Akun ganda yang punya data honor', true, '<p class="text-muted">Tidak ada akun ganda dengan data honor di bulan ini.</p>');
    else {
      var isi6 = '<p class="text-muted" style="font-size:12px;">Honor satu orang terbelah di dua baris. Pilih akun yang dipertahankan: semua rekaman honor bulan ini milik akun lain (dan yang bernama sama tanpa guruKey) dialihkan ke akun itu. Data guru tidak dihapus. Bulan lain perlu diperiksa terpisah.</p>';
      T.kembar.forEach(function (g, gi) {
        isi6 += '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-bottom:10px;"><div style="font-weight:600;">' + esc(g.nama) + ' <span class="text-muted" style="font-weight:400;">· ' + g.anggota.length + ' akun · ' + g.tanpaKey + ' rekaman tanpa guruKey</span></div>' +
          tabel(['ID', 'Peran', 'Kelas', 'Jurnal', 'Lain-lain', 'Tunjangan', 'Aksi'], g.anggota.map(function (a) {
            return [esc('…' + String(a.key).slice(-6)), esc(a.role), esc(a.kelas || '-'), a.jurnal, a.lain, a.tunjangan ? 'ya' : '-',
              '<button class="btn btn-warning" data-aksi="honor-alihkan" data-g="' + gi + '" data-target="' + esc(a.key) + '">Pertahankan ini</button>'];
          })) + '</div>';
      });
      if (T.tunjanganGanda.length) isi6 += '<p style="color:#b91c1c;font-size:13px;">⚠️ Tunjangan/transport ganda: ' + T.tunjanganGanda.map(function (x) { return esc(x.nama) + ' (' + x.jumlah + ' akun bertunjangan)'; }).join(', ') + '. Rekap Honor memberi tunjangan ke tiap akun yang mengisinya; kosongkan di akun yang tidak dipakai (menu Manajemen User).</p>';
      out += bagian('Akun ganda dengan data honor (' + T.kembar.length + ' nama)', false, isi6);
    }

    // 7. Jurnal ganda
    if (!T.ganda.length) out += bagian('Jurnal ganda', true, '<p class="text-muted">Tidak ada jurnal ganda (guru + tanggal + jam + kelas sama).</p>');
    else out += bagian('Jurnal ganda (' + T.ganda.length + ' kelompok, kelebihan ± ' + rp(d.gandaRp) + ')', false,
      '<p class="text-muted" style="font-size:12px;">Guru, tanggal, jam ke, dan kelas sama tetapi tersimpan lebih dari sekali; tiap salinan dihitung honor. Salinan bertanda ✅ disimpan (yang paling lengkap), bertanda 🗑️ akan dihapus. Periksa isinya dulu; cadangan JSON diunduh sebelum penghapusan.</p>' +
      '<div style="margin:6px 0;"><button class="btn btn-danger" data-aksi="hapus-ganda" data-gi="semua">🗑️ Hapus semua salinan berlebih (' + T.ganda.reduce(function (t, r) { return t + r.jumlah - 1; }, 0) + ' jurnal)</button></div>' +
      tabel(['Guru', 'Tanggal', 'Jam', 'Kelas', 'Isi salinan', 'Kelebihan', 'Aksi'], T.ganda.slice(0, 30).map(function (r, gi) {
        var isi = (r.anggota || []).map(function (m, k) { var tx = (m.mapel ? m.mapel + ': ' : '') + String(m.kegiatan).slice(0, 90) + (m.status ? ' [' + m.status + ']' : ''); return (k === 0 ? '✅ ' : '🗑️ ') + esc(tx); }).join('<br>');
        return [esc(r.guru), esc(r.tanggal), esc(r.jam), esc(r.kelas), isi, rp(r.rpLebih), '<button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" data-aksi="hapus-ganda" data-gi="' + gi + '">Hapus ' + (r.jumlah - 1) + ' salinan</button>'];
      })) + (T.ganda.length > 30 ? '<p class="text-muted">…dan ' + (T.ganda.length - 30) + ' lainnya (tombol “Hapus semua” ikut menghapusnya; atau hapus 30 pertama dulu, lalu periksa ulang).</p>' : ''));

    // 8. jam tak dikenal & tipe kosong
    if (!d.jamPunya) out += bagian('Jam pelajaran', true, '<p class="text-muted">Pengaturan jam belum termuat, pemeriksaan jam dilewati.</p>');
    else if (!T.jamAsing.length) out += bagian('Jam ke- tidak dikenal', true, '<p class="text-muted">Semua jam_ke ada di Setting Jam.</p>');
    else out += bagian('Jam ke- tidak ada di Setting Jam (' + T.jamAsing.length + ' jurnal)', false,
      '<p class="text-muted" style="font-size:12px;">Jam ini tidak bisa dikenali sebagai jam ekstra, sehingga dihitung reguler/non-reguler biasa.</p>' +
      tabel(['Guru', 'Tanggal', 'Jam', 'Kelas'], T.jamAsing.slice(0, 30).map(function (r) { return [esc(r.guru), esc(r.tanggal), esc(r.jam), esc(r.kelas)]; })));
    if (T.tipeKosong.length) out += bagian('Jurnal tanpa tipe Reguler/Non-Reguler (' + T.tipeKosong.length + ')', false,
      '<p class="text-muted" style="font-size:12px;">Dihitung sebagai Reguler. Periksa apakah seharusnya Non-Reguler (mewakili).</p>' +
      tabel(['Guru', 'Tanggal', 'Jam', 'Tipe'], T.tipeKosong.slice(0, 20).map(function (r) { return [esc(r.guru), esc(r.tanggal), esc(r.jam), esc(r.tipe)]; })));
    // 9. Honor bertumpuk jam (ujian x ujian, ujian x lembur/rapat)
    var B = d.bentrok;
    if (!B) out += bagian('Honor bertumpuk jam', true, '<p class="text-muted">Pemeriksaan jam bertumpuk tidak tersedia (honor-guru.js belum termuat).</p>');
    else if (!B.total) out += bagian('Honor bertumpuk jam', true, '<p class="text-muted">Tidak ada guru dengan honor ujian/lembur/rapat yang jamnya bertumpuk di bulan ini.</p>');
    else out += bagian('Honor bertumpuk jam (' + B.total + ' pasangan)', false,
      '<p class="text-muted" style="font-size:12px;">Dua kegiatan ber-honor milik satu guru pada hari yang sama jamnya beririsan, sehingga bisa terbayar dua kali. Rekap Honor hanya menandai (⚠️) dan tidak mengubah angka: putuskan mana yang berhak, lalu hapus check-in yang tidak berhak di halaman Honor Ujian atau Lembur &amp; Rapat.</p>' +
      tabel(['Guru', 'Tanggal', 'Kegiatan 1', 'Kegiatan 2', 'Honor'], B.daftar.slice(0, 30).map(function (p) { return [esc(p.nama), esc(p.tanggal), esc(p.a.label + ' ' + p.a.jamMulai + '–' + p.a.jamSelesai), esc(p.b.label + ' ' + p.b.jamMulai + '–' + p.b.jamSelesai), rp(p.a.honor) + ' + ' + rp(p.b.honor)]; })) +
      (B.total > 30 ? '<p class="text-muted">…dan ' + (B.total - 30) + ' lainnya.</p>' : ''));
    // 10. Honor pengawas ujian: jadwal - Daftar Hadir - check-in - susulan (seluruh tahun ajaran aktif; dari administrasi-ujian.js)
    if (typeof window.cekDataHonorUjian === 'function') {
      if (typeof allAdmUjian === 'undefined' || !allAdmUjian.length) out += bagian('Honor pengawas ujian (jadwal ↔ check-in)', true, '<p class="text-muted">Data jadwal ujian belum dimuat. Buka menu Administrasi Ujian sekali, lalu periksa lagi di sini.</p>');
      else {
        var U = []; try { U = window.cekDataHonorUjian().filter(function (x) { return x.jenis !== 'bentrok'; }); } catch (e) { U = []; }
        var uPenting = U.filter(function (x) { return x.tingkat !== 'info'; });
        if (!uPenting.length) out += bagian('Honor pengawas ujian (jadwal ↔ check-in)', true, '<p class="text-muted">Jadwal, Daftar Hadir, check-in, dan susulan cocok' + (U.length ? ' (' + U.length + ' catatan info, lihat 🔎 Periksa Honor di Administrasi Ujian)' : '') + '.</p>');
        else out += bagian('Honor pengawas ujian: tidak cocok (' + uPenting.length + ')', false,
          '<p class="text-muted" style="font-size:12px;">Seluruh tahun ajaran aktif. Tidak ada yang diubah otomatis; perbaiki di Administrasi Ujian atau Honor Ujian.</p>' +
          tabel(['Tingkat', 'Temuan'], uPenting.slice(0, 30).map(function (x) { return [x.tingkat === 'salah' ? '⛔ Perbaiki' : '⚠️ Cek', esc(x.teks)]; })) +
          (uPenting.length > 30 ? '<p class="text-muted">…dan ' + (uPenting.length - 30) + ' lainnya.</p>' : ''));
      }
    }
    if (d.kosongStatus) out += '<p class="text-muted" style="font-size:12px;margin-top:10px;">ℹ️ ' + d.kosongStatus + ' jurnal tanpa status (data lama) tetap dihitung honor.</p>';
    return out;
  }

  // ---------- Diagnosa Input Nilai (hanya baca) ----------
  // Meniru mapelGuruUntukKelas()/terapkanMapelGuru() di app.js: mapel di Input Nilai = baris Jadwal milik guru di kelas itu
  // (guruKey sama, atau tanpa guruKey tapi namanya cocok) yang namanya cocok dengan satu opsi daftar mapel Input Nilai.
  function renderDiagnosaNilai() {
    var h = _hasil; if (!h) return '';
    var gl = (h._guru || []).filter(function (g) { return g && g.key; }).slice().sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    var kls = {}; (h._jadwal || []).forEach(function (j) { if (j && j.kelas) kls[j.kelas] = 1; });
    var kl = Object.keys(kls).sort();
    var optG = gl.map(function (g) { return '<option value="' + esc(g.key) + '">' + esc(g.name || g.key) + '</option>'; }).join('');
    var optK = kl.map(function (k) { return '<option value="' + esc(k) + '"' + (k === 'Kelas 3' ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('');
    return '<div style=""><div style="font-weight:800;font-size:15px;">🔎 Diagnosa Input Nilai</div>' +
      '<p class="text-muted" style="font-size:12px;">Pilih guru dan kelas untuk melihat mapel apa yang akan muncul di halaman Nilai, dan alasannya bila ada mapel yang tidak muncul.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><select id="cdDiagGuru" class="field" style="max-width:260px;">' + optG + '</select>' +
      '<select id="cdDiagKelas" class="field" style="max-width:140px;">' + optK + '</select>' +
      '<button class="btn btn-primary" data-aksi="diagnosa-nilai">Periksa</button></div><div id="cdDiagHasil" style="margin-top:10px;"></div></div>';
  }
  function aksiDiagnosaNilai() {
    var box = el('cdDiagHasil'), h = _hasil; if (!box || !h) return;
    var gk = (el('cdDiagGuru') || {}).value, kelas = (el('cdDiagKelas') || {}).value;
    var g = (h._guru || []).filter(function (x) { return x && x.key === gk; })[0];
    if (!g || !kelas) { box.innerHTML = '<p class="text-muted">Pilih guru dan kelas.</p>'; return; }
    var nm = (typeof normMapel === 'function') ? normMapel : norm;
    var same = (typeof samaNamaGuru === 'function') ? samaNamaGuru : function (a, b) { return norm(a) === norm(b); };
    var opsi = [];
    try { var tmp = document.createElement('select'); tmp.innerHTML = (typeof daftarMapelNilaiAsli === 'function') ? daftarMapelNilaiAsli() : ''; opsi = Array.prototype.map.call(tmp.options, function (o) { return { v: o.value, n: nm(o.value) }; }); } catch (e) { opsi = []; }
    var wali = (g.waliKelasOf === kelas) && (g.role === 'wali_kelas' || g.role === 'guru' || !g.role);
    var baris = (h._jadwal || []).filter(function (j) { return j && j.kelas === kelas && j.mapel; });
    var tampil = {}, rows = [];
    baris.forEach(function (j) {
      var milik = j.guruKey ? (j.guruKey === g.key) : same(j.guru, g.name);
      var op = opsi.filter(function (o) { return o.n === nm(j.mapel); })[0];
      var alasan;
      if (!milik) alasan = j.guruKey ? 'Jadwal ini terhubung ke akun lain (guruKey berbeda)' : 'Tanpa guruKey dan nama “' + (j.guru || '(kosong)') + '” tidak cocok dengan guru ini';
      else if (!op) alasan = 'Nama mapel “' + j.mapel + '” tidak ada di daftar mapel Input Nilai';
      else { alasan = ''; tampil[op.v] = 1; }
      rows.push({ j: j, milik: milik, ok: !alasan, alasan: alasan, seni: /seni/i.test(j.mapel) });
    });
    rows.sort(function (a, b) { return (b.seni - a.seni) || (b.ok - a.ok) || String(a.j.mapel).localeCompare(String(b.j.mapel)); });
    var daftar = Object.keys(tampil);
    var out = '<p style="font-size:13px;"><b>' + esc(g.name || g.key) + '</b> · ' + esc(kelas) + ' · peran ' + esc(g.role || '-') + (g.waliKelasOf ? ' · wali ' + esc(g.waliKelasOf) : '') + '</p>';
    if (wali) out += '<p style="color:#059669;font-size:13px;">✅ Wali Kelas ' + esc(kelas) + ': semua mapel tampil di Input Nilai (tidak disaring Jadwal).</p>';
    else out += '<p style="font-size:13px;">Mapel yang akan tampil: ' + (daftar.length ? '<b>' + daftar.map(esc).join(', ') + '</b>' : '<b style="color:#b91c1c;">tidak ada</b>') + '</p>';
    if (!baris.length) out += '<p class="text-muted">Tidak ada baris Jadwal untuk ' + esc(kelas) + '.</p>';
    else out += tabel(['Mapel di Jadwal', 'Guru di Jadwal', 'Hari/Jam', 'Hasil'], rows.slice(0, 60).map(function (r) {
      return [(r.seni ? '⭐ ' : '') + esc(r.j.mapel), esc(r.j.guru || '(kosong)') + (r.j.guruKey ? '' : ' <span class="text-muted">(tanpa guruKey)</span>'), esc((r.j.hari || '') + ' ' + (r.j.jam || '')), r.ok ? '✅ tampil' : '❌ ' + esc(r.alasan)];
    }));
    if (!rows.some(function (r) { return r.seni; })) out += '<p style="color:#b45309;font-size:13px;">⚠️ Tidak ada baris Jadwal bermapel “seni” di ' + esc(kelas) + ' sama sekali. Mapel tidak bisa muncul di Input Nilai kalau belum ada di Jadwal kelas ini.</p>';
    box.innerHTML = out;
  }

  // ---------- Pemeriksaan ----------
  function jalankan(btn) {
    if (typeof isAdmin === 'function' && !isAdmin()) return toast('Hanya Admin!', true);
    var box = el('cekDataHasil'), inf = el('cdInfo'); if (inf) inf.textContent = 'Membaca data terbaru…';
    Promise.all([bacaNode('guru'), bacaNode('jadwal')]).then(function (r) {
      _hasil = cekDataAnalisis(r[0], r[1], (typeof allJournals !== 'undefined') ? allJournals : []);
      _hasil._guru = r[0]; _hasil._jadwal = r[1];
      try { _honor = hitungHonor(r[0], bulanDipilih()); } catch (e) { _honor = null; console.warn('[Cek Data] analisis honor gagal:', e); }
      render();
    }).catch(function (e) { if (box) box.innerHTML = '<p style="color:#b91c1c;">Gagal membaca data: ' + esc((e && e.message) || e) + '</p>'; });
  }

  function bulanDipilih() {
    var inp = el('cekDataBulan'), v = inp && inp.value;
    if (/^\d{4}-\d{2}$/.test(v || '')) return v;
    var t = (typeof tglLokal === 'function') ? tglLokal() : new Date().toISOString().slice(0, 10);
    return String(t).slice(0, 7);
  }
  function hitungHonor(guru, ym) {
    var A = {
      jurnal: (typeof allJournals !== 'undefined') ? allJournals : [],
      event: (typeof allEventAttendance !== 'undefined') ? allEventAttendance : [],
      ujian: (typeof allUjianAttendance !== 'undefined') ? allUjianAttendance : [],
      ekskul: (typeof allEkskulPicHonor !== 'undefined') ? allEkskulPicHonor : []
    };
    function ambil(arr) {
      return (arr || []).filter(function (x) {
        return x && !x.pendingSync && x.tanggal && String(x.tanggal).slice(0, 7) === ym &&
          (typeof sesuaiTahunAjaranTermasukDataLama !== 'function' || sesuaiTahunAjaranTermasukDataLama(x));
      });
    }
    var jur = ambil(A.jurnal).filter(function (j) { return j.status !== 'ditolak'; });
    var o = { ym: ym, guru: guru, jurnal: jur, event: ambil(A.event), ujian: ambil(A.ujian), ekskul: ambil(A.ekskul),
      jamSettings: (typeof jamSettings !== 'undefined') ? jamSettings : {},
      nilai: function (j) {
        try {
          var r = v4GetHonorRates();
          if (typeof isJamEkstra === 'function' && isJamEkstra(j.jam_ke)) return getEkstraRate(j.subject);
          return j.type === 'Non-Reguler' ? r.nonReguler : r.reguler;
        } catch (e) { return 0; }
      } };
    var h = cekHonorAnalisis(o);
    try { h.bentrok = (typeof honorCariBentrok === 'function') ? honorCariBentrok(o.ujian, o.event) : null; } catch (e) { h.bentrok = null; console.warn('[Cek Data] cek bentrok honor gagal:', e); }
    h._sumber = [{ path: 'journal', arr: o.jurnal }, { path: 'event_attendance', arr: o.event.filter(function (e) { return e.guruKey !== 'kepsek'; }) },
      { path: 'ujian_attendance', arr: o.ujian }, { path: 'ekskul_pic_honor_v4', arr: o.ekskul }];
    return h;
  }

  // ---------- Perbaikan ----------
  // opsi (opsional): { cadangan: {catatan, ...data}, honor: true } -- honor:true = rekaman honor (bukan jadwal)
  function terapkan(btn, updates, ringkas, opsi) {
    opsi = opsi || {};
    var n = Object.keys(updates).length;
    if (!n) return toast('Tidak ada yang perlu diubah.');
    if (!confirm(ringkas + '\n\nSebuah file cadangan JSON akan diunduh dulu. Lanjutkan?')) return;
    if (typeof isBusy === 'function' && isBusy('cekDataTulis')) return toast('Sedang menyimpan…', false, 1500);
    setBusy('cekDataTulis', btn);
    var lepas = function () { clearBusy('cekDataTulis', btn); };
    tulisAdmin('cekDataTulis', btn, function () {
      try {
        if (opsi.cadangan) unduhCadanganUmum(opsi.cadangan.catatan || 'Cadangan sebelum perbaikan Cek Data', opsi.cadangan);
        else unduhCadangan(_hasil._guru, _hasil._jadwal);
      } catch (e) { lepas(); return toast('Gagal membuat cadangan, perbaikan dibatalkan.', true); }
      var keys = Object.keys(updates), bagianPaket = [];
      for (var i = 0; i < keys.length; i += 400) { var p = {}; keys.slice(i, i + 400).forEach(function (k) { p[k] = updates[k]; }); bagianPaket.push(p); }
      bagianPaket.reduce(function (pr, p) { return pr.then(function () { return db.ref().update(p); }); }, Promise.resolve())
        .then(function () {
          try { addLog('Cek Data', ringkas.split('\n')[0] + ' (' + n + (opsi.honor ? ' rekaman)' : ' baris)')); } catch (e) {}
          toast('✅ ' + n + (opsi.honor ? ' rekaman honor diperbarui' : ' baris jadwal diperbarui'));
          if (opsi.honor) terapkanKeMemori(updates);
          else if (typeof loadJadwal === 'function') { try { loadJadwal(); } catch (e) {} }
          lepas(); jalankan();
        })
        .catch(function (e) { lepas(); toast('Gagal menyimpan: ' + ((e && e.message) || e), true); });
    }, lepas);
  }
  // Samakan salinan di memori (allJournals dll.) dengan yang baru ditulis, supaya rekap Honor langsung benar.
  function terapkanKeMemori(updates) {
    var daftar = { 'journal': (typeof allJournals !== 'undefined') ? allJournals : [], 'event_attendance': (typeof allEventAttendance !== 'undefined') ? allEventAttendance : [],
      'ujian_attendance': (typeof allUjianAttendance !== 'undefined') ? allUjianAttendance : [], 'ekskul_pic_honor_v4': (typeof allEkskulPicHonor !== 'undefined') ? allEkskulPicHonor : [] };
    Object.keys(updates).forEach(function (k) {
      var b = k.split('/'); if (b.length !== 3 || b[2] !== 'guruKey') return;
      var arr = daftar[b[0]] || [];
      for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].key === b[1]) { arr[i].guruKey = updates[k]; break; }
    });
    try { if (typeof bumpJournalRev === 'function') bumpJournalRev(); } catch (e) {}
    try { if (typeof honorSholatInvalidate === 'function') honorSholatInvalidate(); } catch (e) {}
  }

  // Hapus salinan jurnal ganda: simpan salinan pertama (paling layak) tiap kelompok, hapus sisanya. gi = indeks kelompok atau 'semua'.
  function aksiHapusGanda(btn, gi) {
    var T = _honor && _honor.T; if (!T) return toast('Jalankan pemeriksaan dulu.', true);
    var grup = (gi === 'semua') ? T.ganda.slice(0, 30).concat(T.ganda.slice(30)) : [T.ganda[parseInt(gi, 10)]];
    var hapus = [];
    grup.forEach(function (g) { if (g && g.anggota) g.anggota.slice(1).forEach(function (m) { if (m.key) hapus.push(m); }); });
    if (!hapus.length) return toast('Tidak ada salinan yang perlu dihapus.');
    if (!confirm('Hapus ' + hapus.length + ' salinan jurnal ganda?\n\nDi tiap kelompok, salinan yang paling lengkap tetap disimpan. Sebuah file cadangan JSON akan diunduh dulu. Lanjutkan?')) return;
    if (typeof isBusy === 'function' && isBusy('cekDataTulis')) return toast('Sedang menyimpan…', false, 1500);
    setBusy('cekDataTulis', btn);
    var lepas = function () { clearBusy('cekDataTulis', btn); };
    tulisAdmin('cekDataTulis', btn, function () {
      try { unduhCadanganUmum('Cadangan jurnal ganda sebelum dihapus (Cek Data)', { journal: hapus.map(function (m) { return m.data; }) }); }
      catch (e) { lepas(); return toast('Gagal membuat cadangan, penghapusan dibatalkan.', true); }
      var u = {}; hapus.forEach(function (m) { u['journal/' + m.key] = null; });
      var keys = Object.keys(u), paket = [];
      for (var i = 0; i < keys.length; i += 400) { var p = {}; keys.slice(i, i + 400).forEach(function (k) { p[k] = null; }); paket.push(p); }
      paket.reduce(function (pr, p) { return pr.then(function () { return db.ref().update(p); }); }, Promise.resolve())
        .then(function () {
          var set = {}; hapus.forEach(function (m) { set[m.key] = true; });
          try { if (typeof allJournals !== 'undefined') { for (var i = allJournals.length - 1; i >= 0; i--) if (allJournals[i] && set[allJournals[i].key]) allJournals.splice(i, 1); } } catch (e) {}
          try { if (typeof bumpJournalRev === 'function') bumpJournalRev(); } catch (e) {}
          try { if (typeof honorSholatInvalidate === 'function') honorSholatInvalidate(); } catch (e) {}
          try { addLog('Cek Data', 'Hapus ' + hapus.length + ' salinan jurnal ganda'); } catch (e) {}
          toast('✅ ' + hapus.length + ' salinan jurnal ganda dihapus.');
          lepas(); jalankan();
        })
        .catch(function (e) { lepas(); toast('Gagal menghapus: ' + ((e && e.message) || e), true); });
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

  function aksiHonorIsiKey(btn) {
    var h = _honor; if (!h) return;
    var u = {}, cad = [];
    h.T.namaBeda.forEach(function (r) {
      u[r.path + '/' + r.key + '/guruKey'] = r.guruKeyBaru;
      cad.push({ path: r.path, key: r.key, guruTertulis: r.guru, guruKeyLama: r.guruKey || null, guruKeyBaru: r.guruKeyBaru });
    });
    terapkan(btn, u, 'Isi guruKey otomatis untuk ' + cad.length + ' rekaman honor bulan ' + h.ym + '.', { honor: true, cadangan: { catatan: 'Cadangan sebelum isi guruKey rekaman honor ' + h.ym, rekaman: cad } });
  }
  function aksiHonorAlihkan(btn, gi, target) {
    var h = _honor, g = h && h.T.kembar[gi]; if (!g) return;
    var lain = g.anggota.map(function (a) { return a.key; }).filter(function (k) { return k !== target; });
    var u = {}, cad = [];
    h._sumber.forEach(function (sm) {
      sm.arr.forEach(function (r) {
        if (!r || !r.key) return;
        var punyaLain = (r.guruKey && lain.indexOf(r.guruKey) >= 0) || (!r.guruKey && norm(r.guru) === g.norm);
        if (punyaLain && r.guruKey !== target) {
          u[sm.path + '/' + r.key + '/guruKey'] = target;
          cad.push({ path: sm.path, key: r.key, guruTertulis: r.guru || '', guruKeyLama: r.guruKey || null, guruKeyBaru: target });
        }
      });
    });
    var t = g.anggota.filter(function (a) { return a.key === target; })[0];
    terapkan(btn, u, 'Alihkan rekaman honor ' + h.ym + ' “' + g.nama + '” ke akun …' + String(target).slice(-6) + (t && t.kelas ? ' (kelas ' + t.kelas + ')' : '') + '.',
      { honor: true, cadangan: { catatan: 'Cadangan sebelum alihkan rekaman honor ' + h.ym, rekaman: cad } });
  }

  // ---------- Halaman ----------
  window.setupCekDataPage = function () {
    var body = el('cekDataBody'); if (!body) return;
    if (typeof isAdmin === 'function' && !isAdmin()) { body.innerHTML = '<p class="text-muted">Hanya Admin.</p>'; return; }
    if (!body.dataset.siap) {
      body.dataset.siap = '1';
      var tgl = (typeof tglLokal === 'function') ? tglLokal() : new Date().toISOString().slice(0, 10);
      body.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><button class="btn btn-primary" data-aksi="periksa">🔍 Periksa data</button><span id="cdInfo" class="text-muted" style="font-size:12px;"></span></div>' +
        '<div class="hub-tabs show kg-top" role="tablist" aria-label="Bagian Cek Data" style="margin-top:12px;">' +
        '<button type="button" role="tab" class="hub-tab" data-cdtab="guru">👩‍🏫 Guru &amp; Jadwal<span class="cd-bdg"></span></button>' +
        '<button type="button" role="tab" class="hub-tab" data-cdtab="honor">💰 Honor<span class="cd-bdg"></span></button>' +
        '<button type="button" role="tab" class="hub-tab" data-cdtab="nilai">🔎 Diagnosa Nilai</button></div>' +
        '<div id="cekDataHasil" style="margin-top:4px;"></div>' +
        '<div id="cdPanHonor" hidden><div style="margin-top:12px;"><label style="font-size:13px;">Bulan honor: <input type="month" id="cekDataBulan" value="' + String(tgl).slice(0, 7) + '" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:8px;"></label></div><div id="cdHonorIsi"></div></div>' +
        '<div id="cdPanNilai" hidden></div>';
      pilihTab(_tab);
      body.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'cekDataBulan') jalankan(); });
      body.addEventListener('click', function (ev) {
        var tb = ev.target.closest('button[data-cdtab]'); if (tb) { pilihTab(tb.dataset.cdtab); return; }
        var b = ev.target.closest('button[data-aksi]'); if (!b) return;
        var a = b.dataset.aksi;
        if (a === 'periksa') jalankan(b);
        else if (!_hasil) toast('Jalankan pemeriksaan dulu.', true);
        else if (a === 'isikey') aksiIsiKey(b);
        else if (a === 'alihkan') aksiAlihkan(b, parseInt(b.dataset.g, 10), b.dataset.target);
        else if (a === 'diagnosa-nilai') aksiDiagnosaNilai();
        else if (a === 'honor-isikey') aksiHonorIsiKey(b);
        else if (a === 'hapus-ganda') aksiHapusGanda(b, b.dataset.gi);
        else if (a === 'honor-alihkan') aksiHonorAlihkan(b, parseInt(b.dataset.g, 10), b.dataset.target);
      });
    }
    jalankan();
  };
})();
