/* ============================================================
   PERSETUJUAN DATA SISWA di PORTAL ORANG TUA -- js/persetujuan-ortu.js
   Dimuat SESUDAH portal-ortu.js dan SEBELUM buku-induk.js (teks tujuan & masa simpan dipakai bersama lewat window.PersetujuanOrtuTeks).
   portal-ortu.js memanggil persetujuanOrtuMuat(siswa) setelah dashboard digambar dan menyediakan <div id="persetujuanOrtuSlot">.

   Data (Rules WAJIB, lihat RULES-persetujuan-ortu.txt):
     persetujuan_ortu/<siswaKey>                 = status terakhir { s, oleh, hub, b1..b4, ts, ver, via }
     persetujuan_ortu_riwayat/<siswaKey>/<id>    = jejak yang tidak bisa diubah (setiap setuju / tidak setuju / tarik)
   s: 'setuju' (minimal satu butir disetujui) | 'tidak' (semua butir tidak disetujui) | 'tarik' (persetujuan ditarik kembali)
   b1..b4: butir formulir (1 data induk, 2 hasil belajar, 3 nomor WA, 4 akses portal) -> true/false.
   ts = waktu SERVER. ver = versi teks di bawah; NAIKKAN VER bila teks diubah supaya persetujuan lama tetap tercatat dengan teks yang dulu.
   Hanya orang tua yang masuk dengan No. WA yang sama dengan siswa/<key>/noWaKey yang boleh menulis (Rules memeriksa ortu_sesi).
   Admin menyalin status ini ke Buku Induk lewat tab "Persetujuan" (js/buku-induk.js).
============================================================ */
(function () {
  'use strict';

  var VER = 'v1';
  var TUJUAN = 'pencatatan administrasi peserta didik pada Buku Induk Siswa madrasah';
  var MASA = 'sesuai ketentuan peraturan perundang-undangan tentang kearsipan dan penyelenggaraan pendidikan madrasah yang berlaku';
  var BUTIR = [
    ['Data induk peserta didik', 'Identitas, alamat, data orang tua/wali, riwayat penerimaan, riwayat kelas, serta keterangan keluar/lulus, untuk ' + TUJUAN + '.'],
    ['Hasil belajar peserta didik', 'Nilai, kehadiran, dan sikap, untuk pencatatan administrasi, penyusunan raport, dan laporan perkembangan belajar kepada orang tua/wali.'],
    ['Nomor HP / WhatsApp orang tua/wali', 'Dipakai untuk menghubungi Bapak/Ibu: informasi pembelajaran, pengingat infaq/iuran, edaran dan undangan madrasah, serta pemberitahuan lain tentang anak.'],
    ['Akses Portal Orang Tua', 'Nomor HP/WhatsApp dipakai sebagai kunci akses untuk melihat kehadiran, nilai, dan informasi anak di aplikasi madrasah.']
  ];
  var KETENTUAN = [
    'Data dijaga kerahasiaannya, hanya diakses petugas/guru yang berwenang, dan tidak diberikan kepada pihak lain kecuali diwajibkan peraturan perundang-undangan.',
    'Data disimpan ' + MASA + ', kemudian dihapus atau dimusnahkan.',
    'Butir yang tidak disetujui tidak diproses untuk tujuan butir tersebut, kecuali diwajibkan peraturan perundang-undangan.',
    'Bapak/Ibu berhak meminta akses dan salinan data, memperbaiki data yang keliru, meminta penghapusan atau penghentian pemrosesan, serta menarik kembali persetujuan sewaktu-waktu (tombol "Tarik persetujuan" di kartu ini atau melalui wali kelas/Kepala Madrasah), sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
    'Saat anak tidak lagi berstatus anak menurut peraturan yang berlaku, madrasah akan meminta persetujuan langsung dari yang bersangkutan.'
  ];
  window.PersetujuanOrtuTeks = { ver: VER, tujuan: TUJUAN, masa: MASA, butir: BUTIR, ketentuan: KETENTUAN };

  var HUB = ['Ayah', 'Ibu', 'Wali'];
  var sibuk = false;
  var blokirAktif = false;   // true selama layar hanya berisi kartu persetujuan (status 'tidak')

  function esc(s) {
    s = String(s == null ? '' : s);
    if (typeof escapeHtml === 'function') return escapeHtml(s);
    return s.replace(/[&<>"'`]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
  }
  function slot() { return document.getElementById('persetujuanOrtuSlot'); }
  function tglTs(ts) {
    var d = new Date((Number(ts) || Date.now()) + 7 * 3600 * 1000);   // WIB
    var b = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return d.getUTCDate() + ' ' + b[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }
  function daftarButir(rec) {
    var ok = [], no = [];
    for (var i = 1; i <= BUTIR.length; i++) (rec['b' + i] ? ok : no).push(i);
    return { ok: ok, no: no };
  }

  function formHtml(siswa, rec) {
    var nama = (rec && rec.oleh) || siswa.namaOrtu || '';
    var hub = (rec && rec.hub) || '';
    var butir = BUTIR.map(function (b, i) {
      var n = i + 1, nm = 'psb' + n;
      return '<div style="padding:8px 0;border-top:1px solid #f1f5f9;"><div style="font-size:13px;font-weight:700;">' + n + '. ' + esc(b[0]) + '</div>' +
        '<div class="text-muted" style="font-size:12px;margin:2px 0 6px;">' + esc(b[1]) + '</div>' +
        '<label style="margin-right:14px;font-size:13px;"><input type="radio" name="' + nm + '" value="1"> Setuju</label>' +
        '<label style="font-size:13px;"><input type="radio" name="' + nm + '" value="0"> Tidak setuju</label></div>';
    }).join('');
    return '<div class="text-muted" style="font-size:12px;margin-bottom:6px;">Pengendali data: ' + esc((typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) || 'Madrasah') + '. Pilih setuju atau tidak setuju untuk setiap butir.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">' +
      '<input id="psNama" class="field" maxlength="100" placeholder="Nama orang tua / wali" value="' + esc(nama) + '" style="flex:2;min-width:160px;">' +
      '<select id="psHub" class="field" style="flex:1;min-width:110px;"><option value="">Hubungan…</option>' + HUB.map(function (h) { return '<option' + (h === hub ? ' selected' : '') + '>' + h + '</option>'; }).join('') + '</select></div>' +
      butir +
      '<details style="margin:8px 0;"><summary style="cursor:pointer;font-size:12px;font-weight:700;">Ketentuan (baca dulu)</summary><ol style="font-size:12px;margin:6px 0 0 18px;padding:0;line-height:1.5;">' +
      KETENTUAN.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ol></details>' +
      '<label style="display:flex;gap:6px;align-items:flex-start;font-size:12px;margin:8px 0;"><input type="checkbox" id="psYakin" style="margin-top:2px;"> <span>Saya adalah orang tua/wali sah dari ananda <b>' + esc(siswa.name || '') + '</b> dan memberikan pernyataan ini dengan sebenarnya, tanpa paksaan.</span></label>' +
      '<button type="button" class="btn btn-success" data-ps="kirim" style="font-size:13px;padding:8px 16px;">✅ Kirim pernyataan</button>' +
      '<div id="psPesan" style="margin-top:8px;font-size:12px;"></div>';
  }

  function gambar(siswa, rec, blok) {
    var el = slot(); if (!el) return;
    var kotak = function (warna, isi) { return '<div class="card" style="margin-bottom:8px;border-left:4px solid ' + warna + ';">' + isi + '</div>'; };
    var judul = '<p style="font-weight:700;font-size:14px;margin:0 0 4px;">📝 Persetujuan Data Siswa</p>';
    var h;
    if (rec && rec.s === 'setuju') {
      var d = daftarButir(rec);
      h = kotak('#059669', judul + '<p style="font-size:13px;margin:0;">✅ Persetujuan sudah diberikan oleh <b>' + esc(rec.oleh || '-') + '</b> (' + esc(rec.hub || '-') + ') pada ' + esc(tglTs(rec.ts)) + '.</p>' +
        (d.no.length ? '<p class="text-muted" style="font-size:12px;margin:4px 0 0;">Butir yang tidak disetujui: ' + d.no.join(', ') + '.</p>' : '') +
        '<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:12px;">Ubah atau tarik persetujuan</summary><div style="margin-top:8px;">' +
        '<button type="button" class="btn btn-soft" data-ps="tarik" style="font-size:12px;padding:6px 12px;color:#dc2626;">Tarik persetujuan</button>' +
        '<p class="text-muted" style="font-size:11px;margin:8px 0 0;">Untuk mengubah pilihan butir, tarik persetujuan lalu isi kembali.</p></div></details>');
    } else {
      var ket = '';
      if (rec && rec.s === 'tidak' && blok) ket = '<p style="font-size:13px;color:#991b1b;font-weight:600;margin:0 0 4px;">🔒 Dashboard ananda <b>' + esc(siswa.name || '') + '</b> belum dapat dibuka.</p>' +
        '<p style="font-size:12px;color:#92400e;margin:0 0 8px;">Pada ' + esc(tglTs(rec.ts)) + ' Bapak/Ibu memilih <b>tidak setuju</b>, sehingga data ananda tidak ditampilkan di Portal Orang Tua. Bila berubah pikiran, isi kembali persetujuan di bawah ini dan dashboard akan terbuka.</p>';
      else if (rec && rec.s === 'tidak') ket = '<p style="font-size:12px;color:#92400e;margin:0 0 8px;">Pada ' + esc(tglTs(rec.ts)) + ' Bapak/Ibu memilih tidak setuju. Bila berubah pikiran, isi kembali di bawah ini.</p>';
      else if (rec && rec.s === 'tarik' && blok) ket = '<p style="font-size:13px;color:#991b1b;font-weight:600;margin:0 0 4px;">🔒 Dashboard ananda <b>' + esc(siswa.name || '') + '</b> belum dapat dibuka.</p>' +
        '<p style="font-size:12px;color:#92400e;margin:0 0 8px;">Persetujuan ditarik pada ' + esc(tglTs(rec.ts)) + '. Untuk membuka dashboard, mohon isi kembali persetujuan di bawah ini.</p>';
      else if (!rec && blok) ket = '<p style="font-size:13px;font-weight:600;margin:0 0 4px;">Sebelum membuka dashboard ananda <b>' + esc(siswa.name || '') + '</b>, mohon isi persetujuan data siswa terlebih dahulu.</p>' +
        '<p style="font-size:12px;color:#6b7280;margin:0 0 8px;">Madrasah memerlukan persetujuan Bapak/Ibu untuk mencatat data ananda (UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi). Dashboard terbuka setelah Bapak/Ibu memilih setuju.</p>';
      else if (rec && rec.s === 'tarik') ket = '<p style="font-size:12px;color:#6b7280;margin:0 0 8px;">Persetujuan ditarik pada ' + esc(tglTs(rec.ts)) + '. Bapak/Ibu dapat memberikannya kembali di bawah ini.</p>';
      else ket = '<p style="font-size:12px;margin:0 0 8px;">Madrasah memerlukan persetujuan Bapak/Ibu untuk mencatat data ananda <b>' + esc(siswa.name || '') + '</b> (UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi). Mohon diisi.</p>';
      h = kotak((blok && rec) ? '#dc2626' : (rec ? '#d97706' : '#2563eb'), judul + ket + '<details' + ((blok || !rec || rec.s === 'tidak') ? ' open' : '') + '><summary style="cursor:pointer;font-size:13px;font-weight:700;">Isi persetujuan</summary><div style="margin-top:8px;">' + formHtml(siswa, rec) + '</div></details>');
    }
    var pasang = function (node) {
      node.onclick = function (e) {
        var b = e.target.closest && e.target.closest('[data-ps]'); if (!b || !node.contains(b)) return;
        var a = b.getAttribute('data-ps');
        if (a === 'kirim') kirim(siswa, rec); else if (a === 'tarik') tarik(siswa, rec);
      };
    };
    // v8.431: setelah SETUJU kartu di atas dashboard dihilangkan (menu tidak ramai). Hak menarik/mengubah persetujuan
    // tetap ada lewat satu baris kecil di PALING BAWAH dashboard yang bisa dibuka.
    var bawah = document.getElementById('persetujuanOrtuBawah');
    if (rec && rec.s === 'setuju') {
      el.innerHTML = '';
      if (!bawah) {
        var content = document.getElementById('portalOrtuContent');
        if (content) { bawah = document.createElement('div'); bawah.id = 'persetujuanOrtuBawah'; content.appendChild(bawah); }
      }
      if (bawah) {
        bawah.innerHTML = '<details style="margin:14px 0 4px;"><summary style="cursor:pointer;font-size:11px;color:#6b7280;text-align:center;">📝 Persetujuan data siswa · ✅ sudah diberikan (lihat / ubah / tarik)</summary><div style="margin-top:8px;">' + h + '</div></details>';
        pasang(bawah);
      }
      return;
    }
    if (bawah) bawah.remove();
    el.innerHTML = h;
    pasang(el);
  }

  function pesanGalat(e) {
    var m = String((e && e.message) || e || '');
    if (/permission_denied/i.test(m)) return 'Belum bisa disimpan. Pastikan masuk dengan nomor WhatsApp yang terdaftar untuk ananda. Jika tetap gagal, hubungi madrasah.';
    return 'Gagal menyimpan: ' + m;
  }
  function simpan(siswa, rec, pesanEl) {
    if (sibuk) return;
    sibuk = true;
    var ref = db.ref().push(), id = ref.key;
    var ts = firebase.database.ServerValue.TIMESTAMP;
    var data = { s: rec.s, oleh: rec.oleh, hub: rec.hub, b1: rec.b1, b2: rec.b2, b3: rec.b3, b4: rec.b4, ts: ts, ver: VER, via: 'portal' };
    var upd = {};
    upd['persetujuan_ortu/' + siswa.key] = data;
    upd['persetujuan_ortu_riwayat/' + siswa.key + '/' + id] = data;
    return db.ref().update(upd).then(function () {
      var baru = Object.assign({}, data, { ts: Date.now() });
      try { toast(rec.s === 'tarik' ? 'Persetujuan ditarik.' : '✅ Terima kasih, pernyataan Bapak/Ibu sudah tersimpan.'); } catch (e) { }
      // v8.430/432: selain 'setuju' (tidak setuju / tarik) mengunci dashboard; dari layar terkunci, memilih setuju membukanya.
      // Keduanya cukup memuat ulang dashboard: gerbang membaca status terbaru dari server.
      if ((baru.s !== 'setuju' || blokirAktif) && typeof renderPortalOrtuDashboard === 'function') renderPortalOrtuDashboard(siswa);
      else gambar(siswa, baru);
    }).catch(function (e) {
      if (pesanEl) { pesanEl.style.color = '#dc2626'; pesanEl.textContent = '❌ ' + pesanGalat(e); }
    }).then(function () { sibuk = false; });
  }
  function kirim(siswa, lama) {
    var pesan = document.getElementById('psPesan');
    var err = function (t) { if (pesan) { pesan.style.color = '#dc2626'; pesan.textContent = '⚠️ ' + t; } };
    var nama = String((document.getElementById('psNama') || {}).value || '').trim();
    var hub = String((document.getElementById('psHub') || {}).value || '');
    if (!nama) return err('Isi nama orang tua / wali.');
    if (HUB.indexOf(hub) < 0) return err('Pilih hubungan dengan ananda.');
    var rec = { oleh: nama.slice(0, 100), hub: hub }, ada = false;
    for (var i = 1; i <= BUTIR.length; i++) {
      var r = document.querySelector('input[name="psb' + i + '"]:checked');
      if (!r) return err('Pilih setuju atau tidak setuju untuk butir ' + i + '.');
      rec['b' + i] = r.value === '1'; if (rec['b' + i]) ada = true;
    }
    if (!(document.getElementById('psYakin') || {}).checked) return err('Centang pernyataan di bagian bawah.');
    rec.s = ada ? 'setuju' : 'tidak';
    if (!confirm(ada ? 'Kirim pernyataan persetujuan ini?' : 'Semua butir TIDAK disetujui. Kirim pernyataan ini?')) return;
    if (pesan) { pesan.style.color = '#6b7280'; pesan.textContent = '⏳ Menyimpan…'; }
    simpan(siswa, rec, pesan);
  }
  function tarik(siswa, lama) {
    if (!lama || !confirm('Tarik kembali persetujuan? Data ananda tidak akan diproses untuk butir yang sebelumnya disetujui, kecuali diwajibkan peraturan perundang-undangan.\n\nDashboard ananda juga tidak bisa dibuka sampai Bapak/Ibu mengisi persetujuan kembali.')) return;
    simpan(siswa, { s: 'tarik', oleh: lama.oleh || '-', hub: lama.hub || '-', b1: false, b2: false, b3: false, b4: false }, null);
  }

  function setBlokir(v) {
    blokirAktif = !!v;
    window.persetujuanOrtuBlokir = blokirAktif;   // bisa dibaca modul lain (mis. portal-tab.js)
    try { document.body.classList.toggle('po-persetujuan-blok', blokirAktif); } catch (e) { }
  }
  // GERBANG (v8.430): dipanggil portal-ortu.js SEBELUM dashboard dimuat. Resolve true = diblokir (layar sudah berisi
  // kartu persetujuan saja, dashboard jangan dimuat); false = lanjut muat dashboard. Tidak pernah reject.
  // v8.432: WAJIB MENGISI DULU. Dashboard hanya terbuka bila status = 'setuju' (minimal satu butir disetujui).
  // Belum pernah mengisi, 'tidak', dan 'tarik' => layar hanya berisi kartu persetujuan.
  // Gagal baca (Rules belum dipasang, sinyal putus) => terbuka, supaya orang tua tidak terkunci karena masalah teknis.
  window.persetujuanOrtuGerbang = function (siswa) {
    if (!siswa || !siswa.key || typeof db === 'undefined') { setBlokir(false); return Promise.resolve(false); }
    return db.ref('persetujuan_ortu/' + siswa.key).once('value').then(function (sn) {
      var rec = sn.val() || null;
      var content = document.getElementById('portalOrtuContent');
      if ((rec && rec.s === 'setuju') || !content) { setBlokir(false); return false; }
      content.innerHTML = '<div id="persetujuanOrtuSlot"></div>';
      setBlokir(true);
      gambar(siswa, rec, true);
      return true;
    }).catch(function (e) {
      console.warn('[SI MAMBA] Gerbang persetujuan tidak bisa dibaca, dashboard dibuka:', (e && e.message) || e);
      setBlokir(false);
      return false;
    });
  };

  // Dipanggil portal-ortu.js setelah dashboard digambar.
  window.persetujuanOrtuMuat = function (siswa) {
    if (!siswa || !siswa.key || !slot() || typeof db === 'undefined') return;
    db.ref('persetujuan_ortu/' + siswa.key).once('value').then(function (sn) {
      if (!slot()) return;
      gambar(siswa, sn.val() || null);
    }).catch(function (e) {
      // Rules belum dipasang / tidak berwenang: kartu disembunyikan agar orang tua tidak bingung.
      console.warn('[SI MAMBA] Persetujuan (Portal Ortu) tidak dimuat:', (e && e.message) || e);
    });
  };
})();
