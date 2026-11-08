/* ============================================================
   SI MAMBA - js/rujukan.js (v3)
   Catatan kecil "📚 Rujukan: ..." (dasar regulasi: KMA / Kepdirjen Pendis / PMA / UU) di setiap menu, serta di
   setiap tab & jenis surat pada halaman Surat & Ijin.
   - Hanya teks informasi; tidak mengubah data / perilaku fitur.
   - UBAH DI SINI bila ada regulasi baru / nomor berubah: edit konstanta di bawah dan peta HAL (per menu),
     TAB_SURAT (per tab Surat & Ijin) dan JENIS_GURU (per jenis surat guru). Isi '' / hapus entri = tidak tampil.
   - Nomor regulasi dirangkum dari salinan dokumen yang tersedia saat dibuat; verifikasi ke naskah resmi
     Kemenag (JDIH Kemenag / Ditjen Pendis) sebelum dijadikan dasar keputusan.
   Dimuat SESUDAH app.js, menu-hub.js, perangkat-pembelajaran.js (membungkus navigateTo).
============================================================ */
(function () {
  'use strict';

  // ---- Daftar rujukan (edit di sini) ----
  // Status verifikasi (dicek 25 Okt 2026):
  //   TERVERIFIKASI situs resmi : PMA 12/2026 (JDIH BPK: ditetapkan 13 Juli 2026, berlaku); KMA 347/2022 (naskah di sikurma.hdmadrasah.id);
  //                               Kepdirjen 944/2026 (nomor disebut Kemenag Aceh Selatan; mencabut Kepdirjen 2067/2025 dan perubahannya)
  //   HANYA SUMBER SEKUNDER     : Kepdirjen 4860/2026 (kaldik; blog), Kepdirjen 1843/2021 (PKG; blog/penjual buku)
  //   TIDAK DITEMUKAN           : KMA 3607/2016 (izin madrasah; cocokkan dengan dokumen izin madrasah sendiri)
  //   UU/PP (57/2021, 74/2008, 55/2007, UU 27/2022, UU 12/2010): peraturan baku, tidak dicari ulang
  var PMA12  = 'PMA No. 12 Tahun 2026 tentang Tata Naskah Dinas pada Kementerian Agama';
  var KALDIK = 'Kepdirjen Pendis No. 4860 Tahun 2026 tentang Pedoman Kalender Pendidikan Madrasah TA 2026/2027';
  var BOS    = 'Kepdirjen Pendis No. 944 Tahun 2026 tentang Juknis Pengelolaan BOP RA dan BOS Madrasah';
  var KUR    = 'KMA No. 347 Tahun 2022 tentang Pedoman Implementasi Kurikulum Merdeka pada Madrasah';
  var SNP    = 'PP No. 57 Tahun 2021 tentang Standar Nasional Pendidikan (Standar Penilaian)';
  var GURU   = 'PP No. 74 Tahun 2008 tentang Guru (beban kerja guru)';
  var AGAMA  = 'PP No. 55 Tahun 2007 tentang Pendidikan Agama dan Pendidikan Keagamaan';
  var PDP    = 'UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi';
  var PRAMUKA = 'UU No. 12 Tahun 2010 tentang Gerakan Pramuka';
  var IZIN   = 'KMA No. 3607 Tahun 2016 (izin pendirian/operasional MI Mambaul Ulum)';

  // Per menu (kunci = data-page di sidebar)
  var HAL = {
    'profile-v4': [PDP],
    'profil-sekolah': [IZIN, PMA12 + ' (kop & Kode Jabatan)'],
    'kalender-akademik': [KALDIK],
    'jadwal': [KUR, GURU],
    'rekap-jurnal': [GURU, KUR],
    'journal': [GURU, KUR],
    'attendance': [PDP],
    'perangkat-v4': [KUR],
    'modul-ajar': [KUR],
    'materi-belajar': [KUR],
    'tugas-siswa': [KUR],
    'students': [PDP, KUR],
    'promotion': [KUR, SNP],
    'buku-penghubung': [PDP],
    'info-ortu': [PDP],
    'grades': [SNP, KUR],
    'rekap-nilai': [SNP, KUR],
    'sikap-siswa': [KUR],
    'raport-v4': [SNP, KUR],
    'administrasi-ujian': [SNP, PMA12 + ' (berita acara: Lampiran Tata Penomoran huruf f)'],
    'laporan': [PMA12 + ' (laporan = naskah dinas khusus)'],
    'activities-v4': [AGAMA],
    'religi': [AGAMA],
    'tahfidz-v4': [AGAMA],
    'bacaan-shalat': [AGAMA],
    'ekskul-v4': [KUR],
    'pramuka-v4': [PRAMUKA],
    'teacher-attendance': [GURU],
    'kelola-absen-guru': [GURU],
    'events': [GURU],
    'rapat': [PMA12 + ' (undangan, notula)'],
    // 'surat': dicatat per tab/jenis surat (lihat TAB_SURAT & JENIS_GURU)
    'buku-tamu': [PDP],
    'kas-umum': [BOS + ' (bila mencatat dana BOS)'],
    'admin': [PDP],
    'user-management': [PDP]
  };

  // Per tab pada halaman Surat & Ijin (kunci = id tab)
  var TAB_SURAT = {
    siswa: PMA12 + ' — surat keterangan: Lampiran Tata Penomoran huruf g (nomor/Kode Jabatan/Klasifikasi Arsip/SKet/bulan/tahun)',
    agenda: PMA12 + ' — pengendalian naskah masuk & keluar (Pasal 12 & 14); surat dinas eksternal diawali kategori keamanan, mis. B/ (Lampiran huruf e)',
    'undangan-rapat': PMA12 + ' — surat undangan internal; penomoran korespondensi internal: Lampiran Tata Penomoran huruf d',
    edaran: PMA12 + ' — surat edaran (jenis naskah dinas pengaturan/korespondensi; periksa Lampiran Bab II)'
  };
  // Per jenis surat pada tab Surat Guru (kunci = nilai #sg_jenis)
  var PEN = PMA12 + ' — naskah penetapan (SK): penomoran mengikuti peraturan perundang-undangan (Lampiran Tata Penomoran huruf a); huruf Bookman Old Style 12; margin kiri ≥3 cm, kanan ≥2 cm, bawah ≥2,5 cm';
  var KET = PMA12 + ' — surat keterangan: Lampiran Tata Penomoran huruf g (nomor/Kode Jabatan/Klasifikasi Arsip/SKet/bulan/tahun)';
  var JENIS_GURU = {
    'sk-pengangkatan': PEN,
    'sk-jadwal': PEN,
    'ket-tmt': KET,
    'ket-aktif': KET,
    'skmt': KET,
    'surat-tugas': PMA12 + ' — naskah penugasan: Lampiran Tata Penomoran huruf c (nomor/Kode Jabatan/Klasifikasi Arsip/bulan/tahun)'
  };

  // ---- Mesin tampilan ----
  var CSS = 'font-size:11px;line-height:1.4;color:#6b7280;margin:0 0 6px;padding:0;';
  // Satu baris (dipotong …); ketuk untuk membuka teks lengkap / menutup lagi.
  (function () { if (document.getElementById('rujukanCss')) return; var st = document.createElement('style'); st.id = 'rujukanCss';
    st.textContent = '.rujukan-kecil{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;max-width:100%;}.rujukan-kecil.open{white-space:normal;overflow:visible;}';
    document.head.appendChild(st); })();
  function $(id) { return document.getElementById(id); }
  function pasang(parent, id, teks, sebelum) {
    var e = $(id);
    if (!teks) { if (e && e.parentNode) e.parentNode.removeChild(e); return; }
    if (!e) { e = document.createElement('div'); e.id = id; e.className = 'rujukan-kecil'; e.style.cssText = CSS; e.addEventListener('click', function () { e.classList.toggle('open'); }); }
    e.textContent = '📚 Rujukan: ' + teks;
    e.title = 'Ketuk untuk membuka/menutup. Rujukan regulasi (informasi): verifikasi ke naskah resmi Kemenag.';
    if (sebelum) parent.insertBefore(e, sebelum); else if (e.parentNode !== parent) parent.insertBefore(e, parent.firstChild);
  }
  function tampilHalaman(page) {
    var cont = $('page-' + page); if (!cont) return;
    var arr = HAL[page] || [];
    pasang(cont, 'rujukan-hal-' + page, arr.join(' · '));
  }
  function tabSuratAktif() {
    var g = $('suratGuruPanel');
    if (g && g.style.display === 'block') return 'guru';
    var el = document.querySelectorAll('[id^="suratEkstra_"]');
    for (var i = 0; i < el.length; i++) if (el[i].style.display === 'block') return el[i].id.replace('suratEkstra_', '');
    return 'siswa';
  }
  function teksTabSurat() {
    var t = tabSuratAktif();
    if (t === 'guru') { var j = $('sg_jenis'); return (j && JENIS_GURU[j.value]) || ''; }
    if (TAB_SURAT[t]) return TAB_SURAT[t];
    for (var k in TAB_SURAT) if (t.indexOf(k) >= 0) return TAB_SURAT[k];
    return '';
  }
  function tampilTabSurat() {
    var tab = $('suratTab'), page = $('page-surat'); if (!page) return;
    var teks = teksTabSurat();
    var ref = tab && tab.parentNode ? tab.nextSibling : null;
    if (tab && tab.parentNode) pasang(tab.parentNode, 'rujukan-tab-surat', teks, ref);
    else pasang(page, 'rujukan-tab-surat', teks);
  }
  function segarSurat() { setTimeout(tampilTabSurat, 80); setTimeout(tampilTabSurat, 500); }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('#suratTab button') : null;
    if (t) segarSurat();
  }, true);
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'sg_jenis') segarSurat(); }, true);

  // Kalimat petunjuk di HP: 1 baris, ketuk untuk membuka/menutup (CSS di index.html #compactMobileCss).
  document.addEventListener('click', function (e) {
    if (window.innerWidth > 768 || !e.target || !e.target.closest) return;
    var t = e.target.closest('.page-content > .card > h3:first-child + p, #page-attendance .attendance-warning');
    if (!t || t.querySelector('button, a, input, select')) return;
    t.classList.toggle('petunjuk-open');
  });

  var lama = window.navigateTo;
  if (typeof lama === 'function' && !lama.__rujukan) {
    var baru = function (page) {
      var r = lama.apply(this, arguments);
      try {
        tampilHalaman(page);
        setTimeout(function () { tampilHalaman(page); }, 400);          // halaman yang dirender ulang oleh modulnya
        if (page === 'surat') segarSurat();
      } catch (e) { console.error('[SI MAMBA] rujukan:', e); }
      return r;
    };
    baru.__rujukan = true;
    window.navigateTo = baru;
  }
  window.SIMambaRujukan = { halaman: HAL, tabSurat: TAB_SURAT, jenisGuru: JENIS_GURU };
})();
