/* ============================================================
   SI MAMBA - js/ijin-ortu.js (v1)
   Pengajuan Ijin/Sakit Anak lewat Portal Orang Tua, disetujui Wali Kelas (atau Admin).
   Bila disetujui:
     1) Absensi kelas (node attendance) anak pada tiap tanggal tercatat Ijin (I) / Sakit (S)
     2) Absensi Sholat Dhuha & Dzuhur (activity_attendance_v4) ikut tercatat I/S
        pada hari yang memang ada sholatnya (Dhuha Sen-Sab, Dzuhur Sen-Kam).
   Node: ijin_ortu/{id}, ijin_ortu_foto/{id} (foto surat dokter, opsional, base64 kecil)
   v7: batal setuju mengembalikan catatan sholat guru yang sempat tertimpa (statusAwal) & tidak menghapus bila status sudah diubah guru; batas ukuran foto 8 MB.
   v6: tombol Admin "Bersihkan foto lama" (hapus foto surat > 60 hari; data pengajuan tetap).
   v5: tab Lama (pengajuan basi), penanda belum diproses 07:30 WIB, penyetuju PENGGANTI per hari (node ijin_ortu_pengganti).
   Dimuat SESUDAH app.js & portal-ortu.js.
   ============================================================ */
(function () {
  'use strict';
  var NODE = 'ijin_ortu', NODE_FOTO = 'ijin_ortu_foto', MAKS_HARI = 7, MAKS_MUNDUR = 3, MAKS_MAJU = 30;
  var JENIS = { S: 'Sakit', I: 'Ijin' };
  var _daftarAdm = [];   // pengajuan yang sedang tampil di halaman Wali Kelas/Admin
  var _filterStatus = 'menunggu', _filterKelas = '';
  // v5: penyetuju PENGGANTI per hari (node ijin_ortu_pengganti), pengajuan basi -> tab Lama, penanda belum diproses.
  var NODE_PENG = 'ijin_ortu_pengganti', BASI_HARI = 3, BATAS_ESKALASI = '07:30', FOTO_SIMPAN_HARI = 60;
  var _pengKelas = [], _pengTs = 0, _pengTgl = '', _pengMuat = null, _pengPraKelas = '';   // kelas yang saya gantikan HARI INI

  function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function js(s) { return (typeof escapeJs === 'function') ? escapeJs(s) : String(s == null ? '' : s).replace(/[\\'"]/g, '\\$&'); }
  function hariIni() { return (typeof tglLokal === 'function') ? tglLokal() : new Date().toISOString().slice(0, 10); }
  function geser(tgl, n) { var d = new Date(tgl + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function hariKe(tgl) { return new Date(tgl + 'T00:00:00').getDay(); }   // 0 = Minggu
  function tglId(tgl) { var b = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], p = String(tgl || '').split('-'); return p.length === 3 ? (parseInt(p[2], 10) + ' ' + b[parseInt(p[1], 10) - 1] + ' ' + p[0]) : (tgl || '-'); }
  function rentangTxt(p) { return p.tglMulai === p.tglSelesai ? tglId(p.tglMulai) : (tglId(p.tglMulai) + ' – ' + tglId(p.tglSelesai)); }
  // Semua tanggal dalam rentang, tanpa hari Minggu (madrasah libur).
  function daftarTanggal(mulai, selesai) {
    var out = [], t = mulai, n = 0;
    while (t <= selesai && n < 40) { if (hariKe(t) !== 0) out.push(t); t = geser(t, 1); n++; }
    return out;
  }
  function badgeStatus(st) {
    if (st === 'disetujui') return '<span class="po-badge ok">✅ Disetujui</span>';
    if (st === 'ditolak') return '<span class="po-badge bad">❌ Ditolak</span>';
    return '<span class="po-badge warn">⏳ Menunggu</span>';
  }
  function kecilkanFoto(file, cb, gagal) {
    var rd = new FileReader();
    rd.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var sk = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * sk); c.height = Math.round(img.naturalHeight * sk);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = gagal; img.src = e.target.result;
    };
    rd.onerror = gagal; rd.readAsDataURL(file);
  }

  /* ============================================================
     BAGIAN A - PORTAL ORANG TUA
     ============================================================ */
  window.ijinOrtuRender = function (siswa) {
    var slot = document.getElementById('ijinOrtuSlot');
    if (!slot || !siswa) return;
    var t = hariIni(), min = geser(t, -MAKS_MUNDUR), max = geser(t, MAKS_MAJU);
    slot.innerHTML = '<details class="card po-acc" id="ijinOrtuBox"><summary><span>🤒 Ijin / Sakit Anak</span><span class="po-badge" id="ijinOrtuBadge">…</span></summary>' +
      '<div class="po-acc-body">' +
      '<p class="text-muted" style="font-size:12px;margin:0 0 8px;">Ananda tidak masuk? Ajukan di sini. Setelah disetujui Wali Kelas, absensi Ananda otomatis tercatat Ijin/Sakit.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<div><label class="label">Mulai tanggal</label><input type="date" id="ijinTglMulai" class="field" value="' + t + '" min="' + min + '" max="' + max + '"></div>' +
      '<div><label class="label">Sampai (boleh sama)</label><input type="date" id="ijinTglSelesai" class="field" value="' + t + '" min="' + min + '" max="' + max + '"></div></div>' +
      '<label class="label">Jenis</label><select id="ijinJenis" class="field" style="margin-bottom:8px;"><option value="S">🤒 Sakit</option><option value="I">📝 Ijin (keperluan keluarga/lainnya)</option></select>' +
      '<label class="label">Keterangan</label><textarea id="ijinKet" class="field" rows="3" maxlength="300" placeholder="Contoh: demam sejak semalam, dibawa ke dokter..." style="margin-bottom:8px;"></textarea>' +
      '<label class="label">Foto surat dokter (opsional)</label><input type="file" id="ijinFoto" accept="image/*" style="font-size:12px;margin-bottom:8px;">' +
      '<button class="btn btn-primary" id="btnKirimIjin" style="font-size:12px;padding:7px 14px;" onclick="ijinOrtuKirim(\'' + js(siswa.key) + '\',\'' + js(siswa.name) + '\',\'' + js(siswa.kelas) + '\')">📤 Kirim Pengajuan</button>' +
      '<div id="ijinStatus" style="margin-top:8px;font-size:12px;"></div>' +
      '<div id="ijinRiwayat" style="margin-top:10px;"></div></div></details>';
    ijinOrtuMuatRiwayat(siswa.key);
  };

  function ijinOrtuMuatRiwayat(siswaKey) {
    var box = document.getElementById('ijinRiwayat'), badge = document.getElementById('ijinOrtuBadge');
    if (!box) return;
    box.innerHTML = '<p class="text-muted" style="font-size:12px;">⏳ Memuat riwayat...</p>';
    db.ref(NODE).orderByChild('siswaKey').equalTo(siswaKey).limitToLast(10).once('value').then(function (snap) {
      var arr = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      arr.sort(function (a, b) { return String(b.waktuKirim || '').localeCompare(String(a.waktuKirim || '')); });
      window._ijinOrtuRiwayat = arr;
      var tunggu = arr.filter(function (x) { return x.status === 'menunggu'; }).length;
      if (badge) { badge.textContent = tunggu ? (tunggu + ' menunggu') : 'Ajukan'; badge.className = 'po-badge' + (tunggu ? ' warn' : ''); }
      if (!arr.length) { box.innerHTML = '<p class="text-muted" style="font-size:12px;">Belum ada pengajuan.</p>'; return; }
      box.innerHTML = '<p style="font-weight:700;font-size:12px;margin:0 0 4px;">Riwayat pengajuan</p>' + arr.map(function (p) {
        return '<div style="padding:8px 0;border-top:1px solid #f1f5f9;font-size:12px;">' +
          '<div style="display:flex;justify-content:space-between;gap:6px;align-items:center;"><strong>' + esc(JENIS[p.jenis] || p.jenis) + ' · ' + esc(rentangTxt(p)) + '</strong>' + badgeStatus(p.status) + '</div>' +
          '<div class="text-muted" style="margin-top:2px;">' + esc(p.keterangan || '') + '</div>' +
          (p.status === 'ditolak' && p.catatan ? '<div style="color:#b91c1c;margin-top:2px;">Alasan: ' + esc(p.catatan) + '</div>' : '') +
          (p.status === 'disetujui' ? '<div style="color:#047857;margin-top:2px;">Sudah dicatat di absensi' + (p.diprosesNama ? ' oleh ' + esc(p.diprosesNama) : '') + '.</div>' : '') +
          (p.status === 'menunggu' ? '<button class="btn btn-secondary" style="font-size:11px;padding:3px 10px;margin-top:4px;" onclick="ijinOrtuBatal(\'' + js(p.key) + '\',\'' + js(siswaKey) + '\')">Batalkan</button>' : '') +
          '</div>';
      }).join('');
    }).catch(function (e) { box.innerHTML = '<p style="color:#dc2626;font-size:12px;">❌ Gagal memuat riwayat: ' + esc(e && e.message) + '</p>'; });
  }

  window.ijinOrtuKirim = function (siswaKey, siswaNama, kelas) {
    var st = document.getElementById('ijinStatus'), btn = document.getElementById('btnKirimIjin');
    var warn = function (m) { if (st) st.innerHTML = '<span style="color:#dc2626;">' + m + '</span>'; };
    if (isBusy('ijinKirim')) return;
    var mulai = (document.getElementById('ijinTglMulai').value || ''), selesai = (document.getElementById('ijinTglSelesai').value || mulai);
    var jenis = document.getElementById('ijinJenis').value, ket = (document.getElementById('ijinKet').value || '').trim().slice(0, 300);
    var file = document.getElementById('ijinFoto').files && document.getElementById('ijinFoto').files[0];
    var t = hariIni();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai)) return warn('⚠️ Pilih tanggal mulai.');
    if (selesai < mulai) return warn('⚠️ Tanggal "sampai" tidak boleh sebelum tanggal mulai.');
    if (mulai < geser(t, -MAKS_MUNDUR)) return warn('⚠️ Pengajuan hanya bisa untuk ' + MAKS_MUNDUR + ' hari ke belakang. Hubungi Wali Kelas.');
    if (selesai > geser(t, MAKS_MAJU)) return warn('⚠️ Tanggal terlalu jauh ke depan.');
    if (daftarTanggal(mulai, selesai).length === 0) return warn('⚠️ Rentang yang dipilih hanya hari Minggu (libur).');
    if (daftarTanggal(mulai, selesai).length > MAKS_HARI) return warn('⚠️ Maksimal ' + MAKS_HARI + ' hari per pengajuan. Buat pengajuan lanjutan bila perlu.');
    if (!ket) return warn('⚠️ Isi keterangan singkat.');
    if (file && !/^image\//.test(file.type)) return warn('⚠️ File harus berupa gambar.');
    if (file && file.size > 8 * 1024 * 1024) return warn('⚠️ Ukuran foto maksimal 8 MB. Pilih foto yang lebih kecil.');
    var tumpang = (window._ijinOrtuRiwayat || []).some(function (p) { return p.status !== 'ditolak' && !(selesai < p.tglMulai || mulai > p.tglSelesai); });
    if (tumpang) return warn('⚠️ Sudah ada pengajuan (menunggu/disetujui) yang tanggalnya beririsan. Batalkan dulu bila ingin mengganti.');
    setBusy('ijinKirim', btn); setTimeout(function () { clearBusy('ijinKirim', btn); }, 30000);
    if (st) st.innerHTML = '<span class="text-muted">⏳ Mengirim...</span>';
    var simpan = function (foto) {
      var ref = db.ref(NODE).push();
      ref.set({ siswaKey: siswaKey, siswaNama: siswaNama, kelas: kelas, tahunAjaran: currentTahunAjaran, tglMulai: mulai, tglSelesai: selesai, jenis: jenis, keterangan: ket, hasFoto: !!foto, waktuKirim: new Date().toISOString(), status: 'menunggu' }, function (err) {
        clearBusy('ijinKirim', btn);
        if (err) return warn('❌ Gagal mengirim: ' + esc(err.message));
        if (foto) db.ref(NODE_FOTO + '/' + ref.key).set(foto).catch(function () { toast('⚠️ Pengajuan terkirim, tetapi foto gagal diunggah.', true); });
        if (st) st.innerHTML = '<span style="color:#059669;font-weight:600;">✅ Terkirim. Menunggu persetujuan Wali Kelas.</span>';
        document.getElementById('ijinKet').value = ''; document.getElementById('ijinFoto').value = '';
        ijinOrtuMuatRiwayat(siswaKey);
      });
    };
    if (!file) return simpan(null);
    kecilkanFoto(file, simpan, function () { clearBusy('ijinKirim', btn); warn('⚠️ Foto gagal diproses.'); });
  };

  window.ijinOrtuBatal = function (key, siswaKey) {
    if (!confirm('Batalkan pengajuan ini?')) return;
    // Hanya boleh dibatalkan selama masih menunggu (transaction: kalau sudah diproses Wali Kelas, tidak jadi dihapus).
    db.ref(NODE + '/' + key).transaction(function (cur) { return (cur && cur.status === 'menunggu') ? null : undefined; }).then(function (r) {
      if (r.committed) { db.ref(NODE_FOTO + '/' + key).remove().catch(function () {}); toast('Pengajuan dibatalkan.'); }
      else toast('Pengajuan sudah diproses, tidak bisa dibatalkan.', true);
      ijinOrtuMuatRiwayat(siswaKey);
    }).catch(function (e) { toast('❌ Gagal: ' + (e && e.message), true); });
  };

  /* ============================================================
     BAGIAN B - WALI KELAS / ADMIN
     ============================================================ */
  function bolehBuka() { return !!currentUser && (isAdmin() || isKepsek() || _pengKelas.length > 0 || (typeof isWaliKelasAssigned === 'function' && isWaliKelasAssigned())); }
  function bolehSetujui(p) { return !!currentUser && (isAdmin() || (currentUser.waliKelasOf && currentUser.waliKelasOf === p.kelas) || _pengKelas.indexOf(p.kelas) >= 0); }
  // Kelas yang boleh saya proses (Wali Kelas + penyetuju pengganti hari ini). Admin/Kepala -> null (semua kelas, untuk daftar).
  function kelasWewenang() { var a = []; if (currentUser && currentUser.waliKelasOf) a.push(currentUser.waliKelasOf); _pengKelas.forEach(function (k) { if (a.indexOf(k) < 0) a.push(k); }); return a; }
  function kelasSaya() { return (isAdmin() || isKepsek()) ? null : kelasWewenang(); }
  function tandaiBasi(p) { return p.status === 'menunggu' && String(p.tglSelesai || '') < geser(hariIni(), -BASI_HARI); }
  function menitWib() { var d = new Date(Date.now() + 7 * 3600 * 1000); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
  function menitBatas() { var q = BATAS_ESKALASI.split(':'); return (+q[0]) * 60 + (+q[1]); }
  // Belum diproses: pengajuan menunggu yang mencakup HARI INI dan sudah lewat 07:30 WIB.
  function perluEskalasi(p) { var t = hariIni(); return p.status === 'menunggu' && p.tglMulai <= t && p.tglSelesai >= t && menitWib() >= menitBatas(); }
  function pengKey(kelas, tgl) { return String(kelas).replace(/[.#$\[\]\/]/g, '_') + '_' + tgl; }
  function sayaGuru(refKey, refNama) { return !!currentUser && !!((refKey && currentUser.key && refKey === currentUser.key) || (refNama && refNama === currentUser.name)); }
  // Muat penunjukan pengganti HARI INI (kecil; TTL 5 menit). Bila kelas saya berubah: perbarui menu + listener.
  function muatPengganti(paksa) {
    if (typeof db === 'undefined' || !db || !currentUser || !navigator.onLine) return Promise.resolve(false);
    if (_pengMuat) return _pengMuat;
    var t = hariIni();
    if (!paksa && _pengTs && _pengTgl === t && Date.now() - _pengTs < 300000) return Promise.resolve(false);
    _pengMuat = db.ref(NODE_PENG).orderByChild('tanggal').equalTo(t).once('value').then(function (snap) {
      var baru = []; snap.forEach(function (c) { var v = c.val() || {}; if (v.tanggal === t && sayaGuru(v.guruKey, v.guruNama) && baru.indexOf(v.kelas) < 0) baru.push(v.kelas); });
      baru.sort(); var ubah = baru.join('|') !== _pengKelas.slice().sort().join('|');
      _pengKelas = baru; _pengTs = Date.now(); _pengTgl = t;
      if (ubah) { _lisKey = ''; try { if (typeof v4ApplyMode === 'function') v4ApplyMode(); } catch (e) {} }
      return ubah;
    }).catch(function () { _pengTs = Date.now() - 240000; _pengTgl = t; return false; }).then(function (x) { _pengMuat = null; return x; });
    return _pengMuat;
  }
  window.ijinOrtuBolehBuka = bolehBuka;

  function refsDaftar() {
    var r = db.ref(NODE), ks = kelasSaya();
    if (ks) return ks.map(function (k) { return r.orderByChild('kelas').equalTo(k).limitToLast(150); });
    if (_filterKelas) return [r.orderByChild('kelas').equalTo(_filterKelas).limitToLast(150)];
    if (_filterStatus === 'lama') return [r.orderByChild('status').equalTo('menunggu').limitToLast(150)];
    if (_filterStatus !== 'semua') return [r.orderByChild('status').equalTo(_filterStatus).limitToLast(150)];
    return [r.orderByChild('waktuKirim').limitToLast(150)];
  }

  var _tab = 'antrean';
  window.setupIjinOrtuPage = function () {
    var el = document.getElementById('ijinOrtuPageBody');
    if (!el) return;
    if (!bolehBuka()) { el.innerHTML = '<p class="text-muted">Menu ini untuk Wali Kelas, Kepala, dan Admin.</p>'; return; }
    el.innerHTML = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;" id="ijinTabBar"></div><div id="ijinOrtuTabIsi"></div>';
    ijinOrtuTab(_tab);
  };
  window.ijinOrtuTab = function (t) {
    _tab = t;
    var bar = document.getElementById('ijinTabBar'), isi = document.getElementById('ijinOrtuTabIsi');
    if (!bar || !isi) return;
    bar.innerHTML = [['antrean', '📥 Antrean'], ['rekap', '📊 Rekap Bulanan'], ['input', '➕ Input atas nama Ortu']].concat(isAdmin() ? [['pengganti', '🔁 Penyetuju Pengganti']] : []).map(function (x) {
      return '<button class="btn ' + (x[0] === t ? 'btn-primary' : 'btn-secondary') + '" style="font-size:12px;padding:6px 12px;" onclick="ijinOrtuTab(\'' + x[0] + '\')">' + x[1] + '</button>';
    }).join('');
    if (t === 'rekap') return ijinOrtuRekapUI(isi);
    if (t === 'input') return ijinOrtuInputUI(isi);
    if (t === 'pengganti' && isAdmin()) return ijinOrtuPengUI(isi);
    var sudahWali = !isAdmin() && !isKepsek(), kelasOpt = '';
    if (!sudahWali) {
      var ks = {}; (typeof allSiswa !== 'undefined' ? allSiswa : []).forEach(function (x) { if (x.kelas) ks[x.kelas] = 1; });
      kelasOpt = '<select id="ijinFilterKelas" class="field" style="max-width:160px;" onchange="ijinOrtuFilter()"><option value="">Semua kelas</option>' + Object.keys(ks).sort().map(function (k) { return '<option value="' + esc(k) + '"' + (k === _filterKelas ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select>';
    }
    isi.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center;">' +
      '<select id="ijinFilterStatus" class="field" style="max-width:170px;" onchange="ijinOrtuFilter()">' +
      ['menunggu:⏳ Menunggu', 'disetujui:✅ Disetujui', 'ditolak:❌ Ditolak', 'lama:🗂️ Lama (> ' + BASI_HARI + ' hari lewat)', 'semua:Semua'].map(function (o) { var a = o.split(':'); return '<option value="' + a[0] + '"' + (a[0] === _filterStatus ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('') + '</select>' + kelasOpt +
      '<button class="btn btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="ijinOrtuMuatDaftar()">🔄 Muat ulang</button>' +
      (isAdmin() ? '<button class="btn btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="ijinOrtuBersihFoto()" title="Hapus foto surat dari pengajuan yang sudah lebih dari ' + FOTO_SIMPAN_HARI + ' hari">🧹 Bersihkan foto lama</button>' : '') + '</div>' +
      '<div id="ijinOrtuDaftar"></div>';
    ijinOrtuMuatDaftar();
  };
  window.ijinOrtuFilter = function () {
    var s = document.getElementById('ijinFilterStatus'), k = document.getElementById('ijinFilterKelas');
    _filterStatus = s ? s.value : 'menunggu'; _filterKelas = k ? k.value : '';
    ijinOrtuMuatDaftar();
  };
  window.ijinOrtuMuatDaftar = function () {
    var box = document.getElementById('ijinOrtuDaftar');
    if (!box) return Promise.resolve();
    box.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">⏳ Memuat...</p>';
    return Promise.all(refsDaftar().map(function (q) { return q.once('value'); })).then(function (snaps) {
      var arr = [], ada = {};
      snaps.forEach(function (snap) { snap.forEach(function (c) { if (ada[c.key]) return; ada[c.key] = 1; var v = c.val() || {}; v.key = c.key; arr.push(v); }); });
      if (_filterStatus === 'lama') arr = arr.filter(tandaiBasi);
      else if (_filterStatus === 'menunggu') arr = arr.filter(function (p) { return p.status === 'menunggu' && !tandaiBasi(p); });
      else if (_filterStatus !== 'semua') arr = arr.filter(function (p) { return p.status === _filterStatus; });
      arr.sort(function (x, y) { return (perluEskalasi(y) ? 1 : 0) - (perluEskalasi(x) ? 1 : 0) || String(y.waktuKirim || '').localeCompare(String(x.waktuKirim || '')); });
      _daftarAdm = arr;
      ijinOrtuHitungBadge(arr);
      if (!arr.length) { box.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">' + (_filterStatus === 'lama' ? 'Tidak ada pengajuan lama.' : 'Tidak ada pengajuan.') + '</p>'; return; }
      var nEsk = arr.filter(perluEskalasi).length;
      var banner = nEsk ? '<div style="margin-bottom:8px;padding:8px 10px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;font-size:12px;">⚠️ ' + nEsk + ' pengajuan untuk HARI INI belum diproses (lewat ' + BATAS_ESKALASI + ' WIB).' + (isAdmin() ? ' Bila Wali Kelasnya tidak masuk, proses di sini atau tunjuk penyetuju pengganti.' : '') + '</div>' : '';
      var catLama = _filterStatus === 'lama' ? '<div class="text-muted" style="font-size:11px;margin-bottom:6px;">Pengajuan menunggu yang tanggalnya sudah lewat lebih dari ' + BASI_HARI + ' hari. Tidak ikut dihitung di lencana dan notifikasi. Boleh disetujui/ditolak bila masih perlu dirapikan.</div>' : '';
      box.innerHTML = banner + catLama + arr.map(kartuAdm).join('');
    }).catch(function (e) { box.innerHTML = '<p style="color:#dc2626;padding:12px;">❌ Gagal memuat: ' + esc(e && e.message) + '</p>'; });
  };
  function kartuAdm(p) {
    var bisa = bolehSetujui(p);
    return '<div class="card" id="ijinKartu_' + esc(p.key) + '" style="margin-bottom:8px;">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;"><div><strong>' + esc(p.siswaNama) + '</strong> <span class="text-muted" style="font-size:12px;">· ' + esc(p.kelas) + '</span>' +
      '<div style="font-size:13px;margin-top:2px;">' + (p.jenis === 'S' ? '🤒 Sakit' : '📝 Ijin') + ' · ' + esc(rentangTxt(p)) + '</div></div>' + badgeStatus(p.status) + '</div>' +
      (perluEskalasi(p) ? '<div style="color:#b91c1c;font-size:12px;font-weight:700;margin-top:4px;">⚠️ Belum diproses (lewat ' + BATAS_ESKALASI + ' WIB)</div>' : '') +
      '<div style="font-size:13px;margin:6px 0;">' + esc(p.keterangan) + '</div>' +
      '<div class="text-muted" style="font-size:11px;">Dikirim ' + (p.dikirimOleh ? '(oleh ' + esc(p.dikirimOleh) + ') ' : '') + esc(String(p.waktuKirim || '').slice(0, 16).replace('T', ' ')) + '</div>' +
      (p.status === 'ditolak' && p.catatan ? '<div style="color:#b91c1c;font-size:12px;margin-top:4px;">Alasan: ' + esc(p.catatan) + '</div>' : '') +
      (p.status === 'disetujui' ? '<div style="color:#047857;font-size:12px;margin-top:4px;">Dicatat ke absensi' + (p.dicatat ? ' (' + (p.dicatat.absensi || 0) + ' hari absensi, ' + (p.dicatat.sholat || 0) + ' catatan Dhuha/Dzuhur)' : '') + (p.diprosesNama ? ' oleh ' + esc(p.diprosesNama) : '') + '.</div>' : '') +
      '<div id="ijinFoto_' + esc(p.key) + '"></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' +
      (p.hasFoto ? '<button class="btn btn-secondary" style="font-size:12px;padding:5px 10px;" onclick="ijinOrtuLihatFoto(\'' + js(p.key) + '\')">🖼️ Lihat foto surat</button>' : '') +
      (p.status === 'menunggu' && bisa ? '<button class="btn btn-success" style="font-size:12px;padding:5px 12px;" onclick="ijinOrtuSetujui(\'' + js(p.key) + '\')">✅ Setujui</button><button class="btn btn-danger" style="font-size:12px;padding:5px 12px;" onclick="ijinOrtuTolak(\'' + js(p.key) + '\')">❌ Tolak</button>' : '') +
      (p.status !== 'menunggu' ? '<button class="btn btn-secondary" style="font-size:12px;padding:5px 10px;" onclick="ijinOrtuWa(\'' + js(p.key) + '\')">💬 Kabari Ortu (WA)</button>' : '') +
      (p.status === 'disetujui' && bisa ? '<button class="btn btn-secondary" style="font-size:12px;padding:5px 10px;" onclick="ijinOrtuBatalSetuju(\'' + js(p.key) + '\')">↩️ Batalkan persetujuan</button>' : '') +
      (p.status === 'menunggu' && isAdmin() ? '<button class="btn btn-secondary" style="font-size:12px;padding:5px 10px;" onclick="ijinOrtuTunjuk(\'' + js(p.kelas) + '\')">🔁 Tunjuk pengganti</button>' : '') +
      (p.status === 'menunggu' && !bisa ? '<span class="text-muted" style="font-size:12px;">Hanya Wali Kelas ' + esc(p.kelas) + ', penyetuju pengganti, atau Admin yang bisa memproses.</span>' : '') +
      '</div></div>';
  }
  window.ijinOrtuLihatFoto = function (key) {
    var el = document.getElementById('ijinFoto_' + key);
    if (!el) return;
    if (el.innerHTML) { el.innerHTML = ''; return; }
    el.innerHTML = '<p class="text-muted" style="font-size:12px;">⏳ Memuat foto...</p>';
    db.ref(NODE_FOTO + '/' + key).once('value').then(function (s) {
      var v = s.val();
      el.innerHTML = (typeof v === 'string' && /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(v)) ? '<img src="' + esc(v) + '" alt="Foto surat" style="max-width:100%;border-radius:8px;margin-top:8px;">' : '<p class="text-muted" style="font-size:12px;">Foto tidak ditemukan.</p>';
    }).catch(function () { el.innerHTML = '<p style="color:#dc2626;font-size:12px;">Gagal memuat foto.</p>'; });
  };

  // Menu sidebar: jumlah pengajuan menunggu (hanya dari data yang baru dimuat; tidak ada listener terus-menerus, hemat kuota Spark).
  function ijinOrtuHitungBadge(arr) {
    var n = arr.filter(function (p) { return p.status === 'menunggu' && !tandaiBasi(p) && bolehSetujui(p); }).length;
    var el = document.getElementById('ijinOrtuMenuBadge');
    if (el) { el.textContent = n || ''; el.style.display = n ? '' : 'none'; }
  }
  var _lisRef = null, _lisKey = '', _lastN = -1;
  var _lisData = [], _eskTgl = '', _eskN = -1;
  // Admin/Kepala: pengajuan HARI INI yang belum diproses lewat 07:30 WIB -> pemberitahuan (sekali per hari, atau bila jumlahnya bertambah).
  function eskalasiCek() {
    if (!currentUser || !(isAdmin() || isKepsek())) return;
    var n = _lisData.filter(perluEskalasi).length, t = hariIni();
    if (n && (_eskTgl !== t || n > _eskN)) {
      _eskTgl = t; _eskN = n;
      toast('⚠️ ' + n + ' pengajuan ijin/sakit hari ini belum diproses (lewat ' + BATAS_ESKALASI + ' WIB).', true, 8000);
      try { if (typeof v4Notify === 'function' && currentUser.key) v4Notify('Ijin/Sakit belum diproses', n + ' pengajuan untuk hari ini belum diproses.', 'INFO', currentUser.key, 'ijin_ortu', ''); } catch (e) {}
    }
  }
  window.ijinOrtuCekAntrean = function () {
    if (typeof db === 'undefined' || !db || !currentUser) return;
    muatPengganti(false).then(function () {
      if (!bolehBuka()) return;
      var ks = kelasSaya();
      var kunci = (currentUser.key || currentUser.name || '') + '|' + (ks ? ks.join(',') : '*');
      if (_lisRef && _lisKey === kunci) { eskalasiCek(); return; }
      if (_lisRef) { try { _lisRef.off('value'); } catch (e) {} }
      var r = db.ref(NODE);
      // Satu listener kecil (tanpa foto): lencana menu & pemberitahuan langsung saat ada pengajuan baru.
      _lisRef = (ks && ks.length === 1) ? r.orderByChild('kelas').equalTo(ks[0]).limitToLast(150) : r.orderByChild('status').equalTo('menunggu').limitToLast(150);
      _lisKey = kunci; _lastN = -1;
      _lisRef.on('value', function (snap) {
        var a = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; a.push(v); });
        _lisData = a.filter(function (x) { return x.status === 'menunggu' && !tandaiBasi(x); });
        ijinOrtuHitungBadge(a);
        var n = _lisData.filter(bolehSetujui).length;
        if (_lastN >= 0 && n > _lastN) {
          toast('📩 Ada pengajuan ijin/sakit baru dari orang tua (' + n + ' menunggu).', false, 7000);
          try { if (typeof v4Notify === 'function' && currentUser.key) v4Notify('Pengajuan Ijin/Sakit baru', n + ' pengajuan menunggu persetujuan Anda.', 'INFO', currentUser.key, 'ijin_ortu', ''); } catch (e) {}
          var pg = document.getElementById('page-ijin-ortu');
          if (pg && !pg.classList.contains('hidden') && _tab === 'antrean') ijinOrtuMuatDaftar();
        }
        _lastN = n;
        eskalasiCek();
      }, function () { _lisRef = null; });
    });
  };

  window.ijinOrtuTolak = function (key) {
    var p = _daftarAdm.filter(function (x) { return x.key === key; })[0];
    if (!p || !bolehSetujui(p) || isBusy('ijinProses_' + key)) return;
    var alasan = prompt('Alasan menolak (akan terlihat oleh orang tua):', '');
    if (alasan === null) return;
    setBusy('ijinProses_' + key, null);
    var ref = db.ref(NODE + '/' + key);
    ref.child('status').transaction(function (cur) { return cur === 'menunggu' ? 'ditolak' : undefined; }).then(function (r) {
      if (!r.committed) { toast('Pengajuan sudah diproses.', true); return; }
      return ref.update({ catatan: String(alasan).trim().slice(0, 200) || null, diprosesOleh: currentUser.key || 'admin', diprosesNama: String(currentUser.name || '').slice(0, 100), waktuProses: new Date().toISOString() })
        .then(function () { if (typeof addLog === 'function') addLog('ijin_ortu_tolak', p.siswaNama + ' ' + rentangTxt(p)); toast('Pengajuan ditolak.'); });
    }).catch(function (e) { toast('❌ Gagal: ' + (e && e.message), true); })
      .then(function () { clearBusy('ijinProses_' + key, null); ijinOrtuMuatDaftar(); });
  };

  // ---------- SETUJUI: tulis ke Absensi + Dhuha/Dzuhur ----------
  function cariAbsensi(tgl, kelas) {
    return db.ref('attendance').orderByChild('tanggal').equalTo(tgl).once('value').then(function (snap) {
      var hit = null; snap.forEach(function (c) { var v = c.val() || {}; if (v.kelas === kelas) hit = { key: c.key, val: v }; });
      return hit;
    });
  }
  function jenisSholat(nama) {
    try { var a = (typeof v4CariJenisKegiatanSholat === 'function') ? v4CariJenisKegiatanSholat(nama) : []; return a && a[0] ? a[0].key : null; } catch (e) { return null; }
  }
  function sholatPerTanggal(tgl) {
    var out = [];
    if (typeof v4HariDiizinkanSholat !== 'function') return out;
    if (v4HariDiizinkanSholat('sholat_dluha', tgl)) out.push({ nama: 'Dluha', id: jenisSholat('Dluha') });
    if (v4HariDiizinkanSholat('sholat_dzuhur', tgl)) out.push({ nama: 'Dzuhur', id: jenisSholat('Dzuhur') });
    return out;
  }
  function muatBulanSholat(tanggalList) {
    var bulan = {}; tanggalList.forEach(function (t) { bulan[t.slice(0, 7)] = 1; });
    return Promise.all(Object.keys(bulan).map(function (ym) { return (typeof v4ActMuatBulan === 'function') ? v4ActMuatBulan(ym).catch(function () {}) : Promise.resolve(); }));
  }

  window.ijinOrtuSetujui = function (key) {
    var p = _daftarAdm.filter(function (x) { return x.key === key; })[0];
    if (!p || !bolehSetujui(p)) return toast('Hanya Wali Kelas ' + (p ? p.kelas : '') + ' atau Admin yang bisa menyetujui.', true);
    if (isBusy('ijinProses_' + key)) return toast('⏳ Sedang diproses...', false, 1500);
    if (!navigator.onLine) return toast('📡 Persetujuan butuh koneksi internet.', true);
    var tanggal = daftarTanggal(p.tglMulai, p.tglSelesai), st = p.jenis;
    if (!tanggal.length) return toast('Rentang tanggal tidak valid.', true);
    setBusy('ijinProses_' + key, null);
    var selesai = function () { clearBusy('ijinProses_' + key, null); ijinOrtuMuatDaftar(); };
    var ref = db.ref(NODE + '/' + key), rencana = null;
    (isAdmin() && typeof adminSesiSiap === 'function' ? adminSesiSiap() : Promise.resolve(true))
      .then(function () { return Promise.all(tanggal.map(function (t) { return cariAbsensi(t, p.kelas); })); })
      .then(function (hasil) {
        rencana = hasil; var bentrok = [];
        hasil.forEach(function (h, i) { var cur = h && h.val && h.val.data ? h.val.data[p.siswaKey] : null; if (cur === 'H') bentrok.push(tglId(tanggal[i])); });
        if (bentrok.length && !confirm('Absensi ' + p.siswaNama + ' sudah tercatat HADIR pada: ' + bentrok.join(', ') + '.\n\nTimpa menjadi ' + JENIS[st] + '?')) throw { batal: true };
        return ref.child('status').transaction(function (cur) { return cur === 'menunggu' ? 'disetujui' : undefined; });
      })
      .then(function (r) {
        if (!r.committed) throw { tampil: 'Pengajuan sudah diproses oleh orang lain.' };
        var iso = new Date().toISOString(), tulis = [];
        // 1) Absensi kelas: hanya field data/<siswaKey> yang diubah, siswa lain tidak tersentuh.
        tanggal.forEach(function (t, i) {
          var h = rencana[i];
          if (h) { var up = { updatedAt: iso }; up['data/' + p.siswaKey] = st; tulis.push(db.ref('attendance/' + h.key).update(up)); }
          else { var d = {}; d[p.siswaKey] = st; tulis.push(db.ref('attendance').push().set({ tanggal: t, kelas: p.kelas, guru: currentUser.name, guruKey: currentUser.key || null, data: d, tahunAjaran: p.tahunAjaran || currentTahunAjaran, updatedAt: iso, sumber: 'ijin_ortu' })); }
        });
        return Promise.all(tulis).then(function () {
          // 2) Dhuha & Dzuhur: kunci SAMA dengan modul Amalan (<jenisKegiatan>_<tanggal>_<siswaKey>) supaya tidak dobel
          //    dan terbaca Portal Ortu. Record yang sudah ada dibaca dulu, field lain dipertahankan.
          var nSholat = 0, adaTanpaJenis = false, me = (typeof v4ActMyId === 'function' ? v4ActMyId() : null) || currentUser.key || null;
          var jobs = [];
          tanggal.forEach(function (t) {
            sholatPerTanggal(t).forEach(function (sh) {
              if (!sh.id) { adaTanpaJenis = true; return; }
              var kunci = sh.id + '_' + t + '_' + p.siswaKey, rf = db.ref('activity_attendance_v4/' + kunci);
              jobs.push(rf.once('value').then(function (sn) {
                var data = Object.assign({ activityTypeId: sh.id, studentId: p.siswaKey, studentName: p.siswaNama, kelas: p.kelas, tanggal: t, tahunAjaran: p.tahunAjaran || currentTahunAjaran }, sn.val() || {});
                var awal = sn.val();
                if (awal && !awal.ijinKey && awal.status) {   // catatan buatan guru: simpan dulu supaya bisa dikembalikan saat persetujuan dibatalkan
                  data.statusAwal = awal.status;
                  if (awal.recordedBy) data.awalOleh = awal.recordedBy;
                  if (awal.recordedAt) data.awalAt = awal.recordedAt;
                }
                data.status = st; data.recordedBy = currentUser.name || ''; data.guruKey = me; data.recordedAt = new Date().toISOString(); data.sumber = 'ijin_ortu'; data.ijinKey = key;
                return rf.set(data).then(function () {
                  nSholat++;
                  var rec = Object.assign({ key: kunci }, data), L = (V4.activityAttendance = V4.activityAttendance || []), ix = L.findIndex(function (a) { return a.key === kunci; });
                  if (ix >= 0) L[ix] = rec; else L.push(rec);
                });
              }));
            });
          });
          var siap = isAdmin() ? Promise.resolve(true) : ((typeof window.kredGuruSiap === 'function') ? Promise.resolve(window.kredGuruSiap()).catch(function () {}) : Promise.resolve(true));
          return siap.then(function () { return Promise.all(jobs); }).then(function () { return { nSholat: nSholat, adaTanpaJenis: adaTanpaJenis }; });
        });
      })
      .then(function (r2) {
        // 3) Jenis Sakit: tandai juga "hari sakit" di amalan rumah (bs_amalan_rumah), supaya orang tua tidak diingatkan
        //    mengisi amalan & rentetan hari tidak terputus. Sama bentuknya dengan tombol "hari sakit" orang tua; gagal = tidak fatal.
        if (st !== 'S') return r2;
        var gagal = 0, iso2 = new Date().toISOString();
        return Promise.all(tanggal.map(function (t) {
          return db.ref('bs_amalan_rumah/' + p.siswaKey + '_' + t).transaction(function (cur) {
            var r = (cur && typeof cur === 'object') ? cur : {};
            r.siswaKey = p.siswaKey; r.siswaNama = p.siswaNama || ''; r.kelas = p.kelas || ''; r.tanggal = t; r.tahunAjaran = r.tahunAjaran || p.tahunAjaran || currentTahunAjaran; r.updatedAt = iso2;
            if (!r.diisiOleh) r.diisiOleh = 'wali';
            r.sakit = true; r.sakitDariIjin = key;
            if (!r.items || typeof r.items !== 'object') r.items = { subuh: false };
            return r;
          }).catch(function () { gagal++; });
        })).then(function () { r2.sakitGagal = gagal; return r2; });
      })
      .then(function (r2) {
        return ref.update({ diprosesOleh: currentUser.key || 'admin', diprosesNama: String(currentUser.name || '').slice(0, 100), waktuProses: new Date().toISOString(), dicatat: { absensi: tanggal.length, sholat: r2.nSholat } }).then(function () {
          if (typeof addLog === 'function') addLog('ijin_ortu_setujui', p.siswaNama + ' ' + JENIS[st] + ' ' + rentangTxt(p));
          if (typeof reloadDataset === 'function') reloadDataset('attendance', function () { try { if (typeof loadAttendance === 'function') loadAttendance(); } catch (e) {} });
          toast('✅ Disetujui. Absensi' + (r2.nSholat ? ' + Dhuha/Dzuhur' : '') + ' ' + p.siswaNama + ' tercatat ' + JENIS[st] + '.' + (r2.adaTanpaJenis ? ' (Jenis kegiatan Dhuha/Dzuhur belum ada di Amalan Yaumiyah, bagian itu dilewati.)' : '') + (r2.sakitGagal ? ' (' + r2.sakitGagal + ' tanggal penanda hari sakit di amalan rumah gagal ditulis.)' : ''), false, 6000);
        });
      })
      .catch(function (e) {
        if (e && e.batal) { clearBusy('ijinProses_' + key, null); return; }
        // Gagal di tengah jalan: kembalikan ke "menunggu" supaya bisa diproses ulang (penulisan bersifat menimpa, aman diulang).
        if (!(e && e.tampil)) ref.child('status').transaction(function (cur) { return cur === 'disetujui' ? 'menunggu' : undefined; }).catch(function () {});
        toast((e && e.tampil) ? e.tampil : ('❌ Gagal menyetujui: ' + ((e && e.message) || e)), true, 6000);
      })
      .then(selesai);
  };

  /* ---------- 1) BATALKAN PERSETUJUAN ---------- */
  window.ijinOrtuBatalSetuju = function (key) {
    var p = _daftarAdm.filter(function (x) { return x.key === key; })[0];
    if (!p || p.status !== 'disetujui' || !bolehSetujui(p)) return;
    if (isBusy('ijinProses_' + key)) return toast('⏳ Sedang diproses...', false, 1500);
    if (!navigator.onLine) return toast('📡 Butuh koneksi internet.', true);
    if (!confirm('Batalkan persetujuan ' + p.siswaNama + ' (' + rentangTxt(p) + ')?\n\nCatatan absensi Ijin/Sakit, catatan Dhuha/Dzuhur, dan penanda hari sakit dari pengajuan ini dihapus. Pengajuan kembali berstatus Menunggu.')) return;
    setBusy('ijinProses_' + key, null);
    var tanggal = daftarTanggal(p.tglMulai, p.tglSelesai), ref = db.ref(NODE + '/' + key);
    var siap = isAdmin() ? ((typeof adminSesiSiap === 'function') ? adminSesiSiap() : Promise.resolve(true)) : ((typeof window.kredGuruSiap === 'function') ? Promise.resolve(window.kredGuruSiap()).catch(function () {}) : Promise.resolve(true));
    siap.then(function () {
      return Promise.all(tanggal.map(function (t) {
        return cariAbsensi(t, p.kelas).then(function (h) {
          if (!h) return; var d = (h.val && h.val.data) || {};
          if (d[p.siswaKey] !== p.jenis) return;   // sudah diubah guru ke status lain: jangan disentuh
          if (Object.keys(d).length === 1) return db.ref('attendance/' + h.key).remove();   // Rules mewajibkan 'data' tidak kosong
          var up = { updatedAt: new Date().toISOString() }; up['data/' + p.siswaKey] = null; return db.ref('attendance/' + h.key).update(up);
        });
      }));
    }).then(function () {
      var jobs = [];
      tanggal.forEach(function (t) {
        sholatPerTanggal(t).forEach(function (sh) {
          if (!sh.id) return;
          var kunci = sh.id + '_' + t + '_' + p.siswaKey, rf = db.ref('activity_attendance_v4/' + kunci);
          jobs.push(rf.once('value').then(function (sn) {
            var v = sn.val(); if (!v || v.ijinKey !== key) return;
            if (v.status !== p.jenis) return;   // sudah diubah guru ke status lain: jangan disentuh (sama seperti absensi kelas)
            if (v.statusAwal) {   // sebelum persetujuan sudah ada catatan guru: kembalikan, jangan hapus
              var pulih = { status: v.statusAwal, recordedBy: v.awalOleh || v.recordedBy || '', recordedAt: v.awalAt || new Date().toISOString(), guruKey: (typeof v4ActMyId === 'function' ? v4ActMyId() : null) || currentUser.key || v.guruKey || null, sumber: null, ijinKey: null, statusAwal: null, awalOleh: null, awalAt: null };
              return rf.update(pulih).then(function () {
                var L = (V4.activityAttendance = V4.activityAttendance || []), ix = L.findIndex(function (a) { return a.key === kunci; });
                if (ix >= 0) { var r = Object.assign({}, L[ix], pulih); ['sumber', 'ijinKey', 'statusAwal', 'awalOleh', 'awalAt'].forEach(function (f) { delete r[f]; }); L[ix] = r; }
              });
            }
            return rf.remove().then(function () { V4.activityAttendance = (V4.activityAttendance || []).filter(function (a) { return a.key !== kunci; }); });
          }));
        });
        if (p.jenis === 'S') jobs.push(db.ref('bs_amalan_rumah/' + p.siswaKey + '_' + t).transaction(function (cur) {
          if (!cur || cur.sakitDariIjin !== key) return undefined;
          var adaCentang = cur.items && Object.keys(cur.items).some(function (k) { return cur.items[k] === true; });
          if (!adaCentang && cur.diisiOleh === 'wali' && cur.berhalangan !== true) return null;   // catatan buatan sistem & kosong: hapus
          cur.sakit = false; delete cur.sakitDariIjin; cur.updatedAt = new Date().toISOString(); return cur;
        }));
      });
      return Promise.all(jobs);
    }).then(function () {
      return ref.child('status').transaction(function (cur) { return cur === 'disetujui' ? 'menunggu' : undefined; });
    }).then(function (r) {
      if (!r.committed) throw new Error('status sudah berubah');
      return ref.update({ diprosesOleh: null, diprosesNama: null, waktuProses: null, dicatat: null, catatan: null });
    }).then(function () {
      if (typeof addLog === 'function') addLog('ijin_ortu_batal', p.siswaNama + ' ' + rentangTxt(p));
      if (typeof reloadDataset === 'function') reloadDataset('attendance', function () { try { if (typeof loadAttendance === 'function') loadAttendance(); } catch (e) {} });
      toast('↩️ Persetujuan dibatalkan. Catatan terkait sudah dibersihkan.', false, 5000);
    }).catch(function (e) { toast('❌ Gagal membatalkan: ' + ((e && e.message) || e) + '. Coba lagi (aman diulang).', true, 6000); })
      .then(function () { clearBusy('ijinProses_' + key, null); ijinOrtuMuatDaftar(); });
  };

  /* ---------- 3) KABARI ORTU LEWAT WHATSAPP ---------- */
  window.ijinOrtuWa = function (key) {
    var p = _daftarAdm.filter(function (x) { return x.key === key; })[0];
    if (!p) return;
    var sw = (typeof allSiswa !== 'undefined' ? allSiswa : []).filter(function (x) { return x.key === p.siswaKey; })[0] || {};
    var no = String(sw.noWaKey || sw.noWaOrtu || '').replace(/\D/g, '');
    if (!no) return toast('Nomor WhatsApp orang tua belum tercatat di data siswa.', true);
    if (no.charAt(0) === '0') no = '62' + no.slice(1);
    var mdr = (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) ? MADRASAH.nama : 'Madrasah';
    var isi = p.status === 'disetujui' ? ('pengajuan ' + JENIS[p.jenis].toLowerCase() + ' untuk ananda ' + p.siswaNama + ' pada ' + rentangTxt(p) + ' telah DISETUJUI dan dicatat di absensi.')
      : ('pengajuan ' + JENIS[p.jenis].toLowerCase() + ' untuk ananda ' + p.siswaNama + ' pada ' + rentangTxt(p) + ' belum dapat disetujui' + (p.catatan ? ' (' + p.catatan + ')' : '') + '. Mohon hubungi Wali Kelas.');
    var teks = 'Assalamu\'alaikum Bapak/Ibu, ' + isi + (p.jenis === 'S' ? ' Semoga lekas sembuh.' : '') + '\n\n— Wali Kelas ' + p.kelas + ', ' + mdr;
    window.open('https://wa.me/' + no + '?text=' + encodeURIComponent(teks), '_blank');
  };

  /* ---------- 4) REKAP BULANAN ---------- */
  function ijinOrtuRekapUI(isi) {
    var bulan = hariIni().slice(0, 7);
    isi.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;"><input type="month" id="ijinRekapBulan" class="field" style="max-width:180px;" value="' + bulan + '" onchange="ijinOrtuRekapHitung()"><span class="text-muted" style="font-size:12px;">Hanya pengajuan yang disetujui. Hari Minggu tidak dihitung.</span></div><div id="ijinRekapIsi"></div>';
    ijinOrtuRekapHitung();
  }
  window.ijinOrtuRekapHitung = function () {
    var box = document.getElementById('ijinRekapIsi'), inp = document.getElementById('ijinRekapBulan');
    if (!box || !inp || !inp.value) return;
    var ym = inp.value, awal = ym + '-01', akhir = ym + '-31';
    box.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">⏳ Menghitung...</p>';
    var r = db.ref(NODE), ks = kelasSaya();
    var q = (ks && ks.length === 1) ? r.orderByChild('kelas').equalTo(ks[0]).limitToLast(500) : r.orderByChild('status').equalTo('disetujui').limitToLast(500);
    q.once('value').then(function (snap) {
      var per = {};
      snap.forEach(function (c) {
        var v = c.val() || {}; if (v.status !== 'disetujui' || v.tglSelesai < awal || v.tglMulai > akhir || (ks && ks.indexOf(v.kelas) < 0)) return;
        var o = per[v.siswaKey] || (per[v.siswaKey] = { nama: v.siswaNama, kelas: v.kelas, S: 0, I: 0, nS: 0 });
        daftarTanggal(v.tglMulai, v.tglSelesai).forEach(function (t) { if (t.slice(0, 7) === ym) o[v.jenis]++; });
        if (v.jenis === 'S') o.nS++;
      });
      var arr = Object.keys(per).map(function (k) { return per[k]; });
      arr.sort(function (a, b) { return (b.S + b.I) - (a.S + a.I) || String(a.nama).localeCompare(String(b.nama)); });
      if (!arr.length) { box.innerHTML = '<p class="text-muted" style="text-align:center;padding:14px;">Tidak ada ijin/sakit disetujui pada bulan ini.</p>'; return; }
      var tS = 0, tI = 0; arr.forEach(function (o) { tS += o.S; tI += o.I; });
      box.innerHTML = '<p style="font-size:13px;margin:0 0 8px;"><strong>' + arr.length + '</strong> anak · Sakit <strong>' + tS + '</strong> hari · Ijin <strong>' + tI + '</strong> hari</p>' +
        '<div style="overflow-x:auto;"><table class="table" style="width:100%;font-size:13px;"><thead><tr><th>Nama</th><th>Kelas</th><th>Sakit</th><th>Ijin</th><th>Total</th><th></th></tr></thead><tbody>' +
        arr.map(function (o) {
          var perhatian = (o.S >= 3 || o.S + o.I >= 5 || o.nS >= 2);
          return '<tr><td>' + esc(o.nama) + '</td><td>' + esc(o.kelas) + '</td><td>' + o.S + '</td><td>' + o.I + '</td><td><strong>' + (o.S + o.I) + '</strong></td><td>' + (perhatian ? '<span class="po-badge warn">⚠️ Perlu perhatian</span>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="text-muted" style="font-size:11px;margin-top:6px;">Penanda "perlu perhatian": sakit ≥ 3 hari, total ≥ 5 hari, atau sakit diajukan ≥ 2 kali dalam bulan itu. Silakan ditindaklanjuti lewat Buku Penghubung.</p>';
    }).catch(function (e) { box.innerHTML = '<p style="color:#dc2626;padding:12px;">❌ Gagal memuat: ' + esc(e && e.message) + '</p>'; });
  };

  /* ---------- 5) INPUT ATAS NAMA ORANG TUA ---------- */
  function siswaUntukInput(kelas) {
    return (typeof allSiswa !== 'undefined' ? allSiswa : []).filter(function (x) { return x.kelas === kelas && (typeof siswaAktif !== 'function' || siswaAktif(x)); }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }
  function ijinOrtuInputUI(isi) {
    var ks = {}; (typeof allSiswa !== 'undefined' ? allSiswa : []).forEach(function (x) { if (x.kelas) ks[x.kelas] = 1; });
    var daftarKelas = isAdmin() ? Object.keys(ks).sort() : kelasWewenang();
    if (!daftarKelas.length) { isi.innerHTML = '<p class="text-muted">Hanya Wali Kelas, penyetuju pengganti, dan Admin yang bisa menginput atas nama orang tua.</p>'; return; }
    var t = hariIni();
    isi.innerHTML = '<p class="text-muted" style="font-size:12px;margin:0 0 8px;">Untuk orang tua yang tidak memakai Portal (mis. memberi kabar lewat WhatsApp). Setelah disimpan, langsung diproses sebagai persetujuan.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<div><label class="label">Kelas</label><select id="ijinInKelas" class="field" onchange="ijinOrtuInputKelas()">' + daftarKelas.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="label">Siswa</label><select id="ijinInSiswa" class="field"></select></div>' +
      '<div><label class="label">Mulai tanggal</label><input type="date" id="ijinInMulai" class="field" value="' + t + '" min="' + geser(t, -30) + '" max="' + geser(t, MAKS_MAJU) + '"></div>' +
      '<div><label class="label">Sampai</label><input type="date" id="ijinInSelesai" class="field" value="' + t + '" min="' + geser(t, -30) + '" max="' + geser(t, MAKS_MAJU) + '"></div>' +
      '<div><label class="label">Jenis</label><select id="ijinInJenis" class="field"><option value="S">🤒 Sakit</option><option value="I">📝 Ijin</option></select></div></div>' +
      '<label class="label">Keterangan</label><textarea id="ijinInKet" class="field" rows="2" maxlength="300" placeholder="Mis. orang tua mengabari lewat WA, demam" style="margin-bottom:8px;"></textarea>' +
      '<button class="btn btn-primary" id="btnIjinInSimpan" style="font-size:12px;padding:7px 14px;" onclick="ijinOrtuInputSimpan()">💾 Simpan & Setujui</button><div id="ijinInStatus" style="margin-top:8px;font-size:12px;"></div>';
    ijinOrtuInputKelas();
  }
  window.ijinOrtuInputKelas = function () {
    var k = document.getElementById('ijinInKelas'), s = document.getElementById('ijinInSiswa'); if (!k || !s) return;
    s.innerHTML = siswaUntukInput(k.value).map(function (x) { return '<option value="' + esc(x.key) + '">' + esc(x.name) + '</option>'; }).join('') || '<option value="">(tidak ada siswa)</option>';
  };
  window.ijinOrtuInputSimpan = function () {
    var st = document.getElementById('ijinInStatus'), btn = document.getElementById('btnIjinInSimpan');
    var warn = function (m) { if (st) st.innerHTML = '<span style="color:#dc2626;">' + m + '</span>'; };
    if (isBusy('ijinInput')) return;
    var kelas = document.getElementById('ijinInKelas').value, sk = document.getElementById('ijinInSiswa').value;
    var sw = siswaUntukInput(kelas).filter(function (x) { return x.key === sk; })[0];
    var mulai = document.getElementById('ijinInMulai').value, selesai = document.getElementById('ijinInSelesai').value || mulai;
    var jenis = document.getElementById('ijinInJenis').value, ket = (document.getElementById('ijinInKet').value || '').trim().slice(0, 300), t = hariIni();
    if (!bolehSetujui({ kelas: kelas })) return warn('⚠️ Anda tidak berwenang untuk kelas ini.');
    if (!sw) return warn('⚠️ Pilih siswa.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai) || selesai < mulai) return warn('⚠️ Tanggal tidak valid.');
    if (mulai < geser(t, -30) || selesai > geser(t, MAKS_MAJU)) return warn('⚠️ Tanggal di luar rentang (30 hari ke belakang, ' + MAKS_MAJU + ' hari ke depan).');
    var n = daftarTanggal(mulai, selesai).length;
    if (!n) return warn('⚠️ Rentang hanya berisi hari Minggu.');
    if (n > MAKS_HARI) return warn('⚠️ Maksimal ' + MAKS_HARI + ' hari per pengajuan.');
    if (!ket) return warn('⚠️ Isi keterangan.');
    if (!navigator.onLine) return warn('📡 Butuh koneksi internet.');
    setBusy('ijinInput', btn);
    var ref = db.ref(NODE).push();
    ref.set({ siswaKey: sw.key, siswaNama: sw.name, kelas: kelas, tahunAjaran: currentTahunAjaran, tglMulai: mulai, tglSelesai: selesai, jenis: jenis, keterangan: ket, hasFoto: false, waktuKirim: new Date().toISOString(), status: 'menunggu', dikirimOleh: String(currentUser.name || '').slice(0, 100) }, function (err) {
      clearBusy('ijinInput', btn);
      if (err) return warn('❌ Gagal menyimpan: ' + esc(err.message));
      // Tanggal > BASI_HARI hari lalu masuk tab "Lama" (disaring dari antrean biasa): pilih tab itu supaya pengajuan yang baru dibuat ikut terdaftar dan bisa langsung disetujui.
      _filterStatus = (selesai < geser(t, -BASI_HARI)) ? 'lama' : 'menunggu'; _filterKelas = '';
      ijinOrtuTab('antrean');
      setTimeout(function () { ijinOrtuMuatDaftar().then(function () { ijinOrtuSetujui(ref.key); }); }, 50);
    });
  };

  /* ---------- 7) BERSIHKAN FOTO LAMA (Admin; hemat penyimpanan Firebase gratis) ---------- */
  // Menghapus HANYA foto surat (ijin_ortu_foto) dari pengajuan yang sudah diproses dan lebih dari FOTO_SIMPAN_HARI hari.
  // Data pengajuan (nama, tanggal, jenis, status) tetap; field hasFoto diubah false supaya tombol "Lihat foto surat" hilang.
  window.ijinOrtuBersihFoto = function () {
    if (!isAdmin() || isBusy('ijinBersih')) return;
    if (!navigator.onLine) { toast('📡 Butuh koneksi internet.', true); return; }
    var batas = geser(hariIni(), -FOTO_SIMPAN_HARI);
    setBusy('ijinBersih', null);
    db.ref(NODE).orderByChild('waktuKirim').endAt(batas).limitToLast(500).once('value').then(function (snap) {
      var keys = [];
      snap.forEach(function (c) { var v = c.val() || {}; if (v.hasFoto === true && v.status !== 'menunggu' && String(v.tglSelesai || '') < batas) keys.push(c.key); });
      if (!keys.length) { toast('Tidak ada foto lama yang perlu dibersihkan.'); return; }
      if (!confirm('Hapus ' + keys.length + ' foto surat dari pengajuan yang sudah lebih dari ' + FOTO_SIMPAN_HARI + ' hari?\n\nData pengajuan (nama, tanggal, jenis, status) tetap ada. Foto yang dihapus tidak bisa dikembalikan.')) return;
      var potong = []; for (var i = 0; i < keys.length; i += 50) potong.push(keys.slice(i, i + 50));
      return potong.reduce(function (rantai, grup) {
        return rantai.then(function () {
          var fotoNull = {}, tandai = {};
          grup.forEach(function (k) { fotoNull[k] = null; tandai[k + '/hasFoto'] = false; });
          return db.ref(NODE_FOTO).update(fotoNull).then(function () { return db.ref(NODE).update(tandai); });
        });
      }, Promise.resolve()).then(function () {
        if (typeof addLog === 'function') addLog('ijin_ortu_bersih_foto', keys.length + ' foto > ' + FOTO_SIMPAN_HARI + ' hari');
        toast('🧹 ' + keys.length + ' foto lama dihapus.');
        ijinOrtuMuatDaftar();
      });
    }).catch(function (e) { toast('❌ Gagal membersihkan: ' + (e && e.message), true); })
      .then(function () { clearBusy('ijinBersih', null); });
  };

  /* ---------- 6) PENYETUJU PENGGANTI PER HARI (Admin) ---------- */
  // Dipakai saat Wali Kelas tidak masuk: Admin menunjuk 1 guru (mis. guru pendamping atau Kepala) untuk kelas itu pada 1 tanggal.
  // Selama tanggal itu guru tersebut melihat menu "Ijin/Sakit Ortu" dan boleh Setujui/Tolak/Input untuk kelas itu saja.
  window.ijinOrtuTunjuk = function (kelas) { _pengPraKelas = kelas || ''; ijinOrtuTab('pengganti'); };
  function ijinOrtuPengUI(isi) {
    var ks = {}; (typeof allSiswa !== 'undefined' ? allSiswa : []).forEach(function (x) { if (x.kelas) ks[x.kelas] = 1; });
    var t = hariIni(), pra = _pengPraKelas; _pengPraKelas = '';
    var guru = (typeof allGuru !== 'undefined' ? allGuru : []).filter(function (g) { return g && g.name; }).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
    isi.innerHTML = '<p class="text-muted" style="font-size:12px;margin:0 0 8px;">Untuk hari ketika Wali Kelas tidak masuk. Guru yang ditunjuk bisa menyetujui/menolak ijin-sakit <strong>kelas itu saja</strong> pada tanggal yang dipilih. Menunya muncul di aplikasinya dalam beberapa menit (atau setelah masuk ulang).</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
      '<div><label class="label">Kelas</label><select id="pengKelas" class="field">' + Object.keys(ks).sort().map(function (k) { return '<option' + (k === pra ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="label">Tanggal</label><input type="date" id="pengTgl" class="field" value="' + t + '" min="' + t + '" max="' + geser(t, MAKS_MAJU) + '"></div>' +
      '<div style="grid-column:1/-1;"><label class="label">Guru penyetuju pengganti</label><select id="pengGuru" class="field"><option value="">— pilih guru —</option>' + guru.map(function (g) { return '<option value="' + esc(g.key || g.name) + '">' + esc(g.name) + '</option>'; }).join('') + '</select></div></div>' +
      '<button class="btn btn-primary" id="btnPengSimpan" onclick="ijinOrtuPengSimpan()">💾 Simpan Penunjukan</button> <span id="pengStatus" style="font-size:12px;margin-left:6px;"></span>' +
      '<h4 style="margin:14px 0 6px;font-size:13px;">Penunjukan hari ini dan yang akan datang</h4><div id="pengDaftar"><p class="text-muted" style="font-size:12px;">⏳ Memuat...</p></div>';
    ijinOrtuPengDaftar();
  }
  function ijinOrtuPengDaftar() {
    var box = document.getElementById('pengDaftar'); if (!box) return;
    db.ref(NODE_PENG).orderByChild('tanggal').startAt(hariIni()).limitToLast(60).once('value').then(function (snap) {
      var arr = []; snap.forEach(function (c) { var v = c.val() || {}; v.key = c.key; arr.push(v); });
      arr.sort(function (a, b) { return String(a.tanggal).localeCompare(String(b.tanggal)) || String(a.kelas).localeCompare(String(b.kelas)); });
      if (!arr.length) { box.innerHTML = '<p class="text-muted" style="font-size:12px;">Belum ada penunjukan.</p>'; return; }
      box.innerHTML = arr.map(function (v) {
        return '<div class="card" style="margin-bottom:6px;padding:8px 10px;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;"><div style="font-size:13px;"><strong>' + esc(tglId(v.tanggal)) + '</strong> · Kelas ' + esc(v.kelas) + ' → <strong>' + esc(v.guruNama) + '</strong><div class="text-muted" style="font-size:11px;">Ditunjuk oleh ' + esc(v.oleh) + '</div></div>' +
          '<button class="btn btn-secondary" style="font-size:12px;padding:4px 10px;" onclick="ijinOrtuPengHapus(\'' + js(v.key) + '\')">🗑️ Hapus</button></div>';
      }).join('');
    }).catch(function (e) { box.innerHTML = '<p style="color:#dc2626;font-size:12px;">❌ Gagal memuat: ' + esc(e && e.message) + '</p>'; });
  }
  window.ijinOrtuPengSimpan = function () {
    if (!isAdmin() || isBusy('pengSimpan')) return;
    var st = document.getElementById('pengStatus'), btn = document.getElementById('btnPengSimpan');
    var warn = function (m) { if (st) st.innerHTML = '<span style="color:#dc2626;">' + m + '</span>'; };
    var kelas = document.getElementById('pengKelas').value, tgl = document.getElementById('pengTgl').value, gk = document.getElementById('pengGuru').value, t = hariIni();
    var g = (typeof allGuru !== 'undefined' ? allGuru : []).filter(function (x) { return x && (x.key || x.name) === gk; })[0];
    if (!kelas) return warn('⚠️ Pilih kelas.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl) || tgl < t || tgl > geser(t, MAKS_MAJU)) return warn('⚠️ Tanggal tidak valid (hari ini sampai ' + MAKS_MAJU + ' hari ke depan).');
    if (!g) return warn('⚠️ Pilih guru penyetuju.');
    if (!navigator.onLine) return warn('📡 Butuh koneksi internet.');
    setBusy('pengSimpan', btn);
    db.ref(NODE_PENG + '/' + pengKey(kelas, tgl)).set({ kelas: kelas, tanggal: tgl, guruKey: String(g.key || g.name).slice(0, 120), guruNama: String(g.name).slice(0, 100), oleh: String(currentUser.name || 'Admin').slice(0, 100), waktu: new Date().toISOString() }).then(function () {
      if (typeof addLog === 'function') addLog('ijin_ortu_pengganti', g.name + ' · Kelas ' + kelas + ' · ' + tgl);
      try { if (typeof v4Notify === 'function' && g.key) v4Notify('Anda ditunjuk menyetujui Ijin/Sakit', 'Kelas ' + kelas + ' pada ' + tglId(tgl) + ' (menu Ijin/Sakit Ortu).', 'INFO', g.key, 'ijin_ortu', ''); } catch (e) {}
      toast('✅ ' + g.name + ' ditunjuk untuk kelas ' + kelas + ' (' + tglId(tgl) + ').');
      if (st) st.innerHTML = '';
      return muatPengganti(true);
    }).catch(function (e) { warn('❌ Gagal menyimpan: ' + esc(e && e.message)); })
      .then(function () { clearBusy('pengSimpan', btn); ijinOrtuPengDaftar(); });
  };
  window.ijinOrtuPengHapus = function (key) {
    if (!isAdmin() || !confirm('Hapus penunjukan pengganti ini?')) return;
    db.ref(NODE_PENG + '/' + key).remove().then(function () {
      if (typeof addLog === 'function') addLog('ijin_ortu_pengganti_hapus', key);
      toast('Penunjukan dihapus.'); return muatPengganti(true);
    }).catch(function (e) { toast('❌ Gagal: ' + (e && e.message), true); }).then(ijinOrtuPengDaftar);
  };

  // Cek antrean sekali setelah login (ditunda supaya tidak ikut memperlambat boot).
  var _coba = 0, _timer = setInterval(function () {
    _coba++;
    if (typeof currentUser !== 'undefined' && currentUser && typeof db !== 'undefined' && db) { clearInterval(_timer); setTimeout(window.ijinOrtuCekAntrean, 4000); setInterval(window.ijinOrtuCekAntrean, 60000); }
    else if (_coba > 60) clearInterval(_timer);
  }, 2000);
})();
