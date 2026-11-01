// ============================================================
// MODE WALI MURID (PWA khusus orang tua)
// Aktif bila halaman dibuka lewat  https://<domain>/?app=ortu  (start_url manifest-ortu.json).
// Penanda mode dipasang lebih awal oleh skrip kecil di <head> index.html (window.SIMAMBA_MODE_ORTU + kelas
// html.mode-ortu). Tampilan SAMA dengan aplikasi guru (beranda pilihan login -> form); yang beda hanya pilihan loginnya:
// tombol "Guru / Staff" & form login staf disembunyikan (CSS di index.html). Aplikasi selalu dibuka di beranda dengan
// satu pilihan: Orang Tua. Bila perangkat menyimpan login wali ("Ingat saya"), ketuk pilihan itu -> form masuk otomatis.
// Di luar mode ini (web biasa) file ini hanya menambah tautan "Pasang aplikasi Wali Murid" di form portal.
// Juga: kartu "Bagikan tautan Wali Murid" (halaman Info ke Ortu, untuk Admin/wali kelas) dan petunjuk "buka di Chrome"
// bila halaman terbuka di dalam WhatsApp/aplikasi lain.
// CATATAN: ini penyederhanaan tampilan, bukan pengamanan -- login staf tetap dilindungi PIN & Rules Firebase.
// ============================================================
(function () {
  'use strict';
  var ORTU = !!window.SIMAMBA_MODE_ORTU;
  function el(id) { return document.getElementById(id); }
  function standalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  var UA = navigator.userAgent || '';
  var iOS = /iphone|ipad|ipod/i.test(UA) && !window.MSStream;
  // Browser di dalam aplikasi lain (WhatsApp/Facebook/Instagram/Line): tidak bisa memasang PWA. Android WebView ditandai "; wv)",
  // WebView iOS tidak punya token "Safari/". Tautan yang dikirim lewat WhatsApp sering terbuka di sini.
  var dalamAplikasi = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|; wv\)|WhatsApp/i.test(UA) || (iOS && !/Safari\//.test(UA));
  var iOSBukanSafari = iOS && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(UA);
  function petunjukBrowser() {
    if (dalamAplikasi) {
      return '<div style="margin-bottom:8px;padding:8px;border-radius:8px;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-size:12px;">' +
        '⚠️ Halaman ini terbuka di dalam aplikasi lain (mis. WhatsApp), jadi belum bisa dipasang. ' +
        (iOS ? 'Ketuk ikon <strong>Safari</strong>/menu Bagikan lalu pilih <em>Buka di Safari</em>.' : 'Ketuk <strong>⋮</strong> di pojok atas lalu pilih <em>Buka di Chrome</em> (atau <em>Buka di browser</em>).') + '</div>';
    }
    if (iOSBukanSafari) return '<div style="margin-bottom:8px;font-size:11px;color:#92400e;">💡 Di iPhone, buka lewat <strong>Safari</strong> agar bisa dipasang.</div>';
    if (!iOS && !/Chrome\//.test(UA)) return '<div style="margin-bottom:8px;font-size:11px;color:#92400e;">💡 Gunakan <strong>Chrome</strong> agar bisa dipasang.</div>';
    return '';
  }
  function adaPrompt() { return !!window.__simambaBIP || (typeof deferredPrompt !== 'undefined' && !!deferredPrompt); }

  // ---- Mode wali: beranda sama seperti guru; tombol pilihan Orang Tua jadi tombol utama ----
  function rapikanBeranda() {
    if (!ORTU) return;
    var b = document.querySelector('#loginChooser .auth-choice button[onclick="pilihLoginOrtu()"]');
    if (b && b.classList.contains('btn-soft')) { b.classList.remove('btn-soft'); b.classList.add('btn-primary'); }
  }
  // ---- Kotak "Pasang aplikasi": di form masuk Portal Orang Tua, dan (mode wali) di beranda pilihan login ----
  function buatKotak(selKartu, id, awal) {
    var kartu = document.querySelector(selKartu);
    if (!kartu || kartu.querySelector('.po-pasang') || standalone()) return;
    var box = document.createElement('div');
    box.className = 'po-pasang'; if (id) box.id = id;
    box.style.cssText = 'margin-top:14px;padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;font-size:12px;color:#065f46;text-align:center;';
    if (awal) kartu.insertBefore(box, kartu.lastElementChild); else kartu.appendChild(box);
  }
  function kotakPasang() {
    buatKotak('#portalOrtuLogin .auth-card', 'poPasangBox', true);
    if (ORTU) buatKotak('#loginChooser .auth-card', null, false);
    isiKotak();
  }
  function isiKotak() {
    var kotak = document.querySelectorAll('.po-pasang'); if (!kotak.length) return;
    var isi;
    if (!ORTU) {
      isi = '📲 <a href="?app=ortu" style="color:#047857;font-weight:700;">Pasang aplikasi khusus Wali Murid</a><br><span style="font-size:11px;">Satu ketukan dari layar utama, tanpa menu guru.</span>';
    } else if (adaPrompt()) {
      isi = '<button type="button" class="btn btn-primary" style="width:100%;font-size:13px;" onclick="installApp()">📲 Pasang Aplikasi di HP</button>';
    } else if (iOS) {
      isi = '📲 <strong>Pasang di iPhone/iPad:</strong> buka lewat Safari, ketuk tombol Bagikan (⬆️), lalu pilih <em>Tambahkan ke Layar Utama</em>.';
    } else {
      isi = '📲 <strong>Pasang di HP:</strong> ketuk menu ⋮ pada browser, lalu pilih <em>Instal aplikasi</em> atau <em>Tambahkan ke layar utama</em>.';
    }
    var html = (adaPrompt() && ORTU ? '' : petunjukBrowser()) + isi;
    for (var i = 0; i < kotak.length; i++) {
      if (kotak[i].__html !== html) { kotak[i].__html = html; kotak[i].innerHTML = html; }   // jangan gambar ulang bila sama (cek berkala tiap detik)
    }
  }
  window.addEventListener('beforeinstallprompt', function () { setTimeout(isiKotak, 0); });
  window.addEventListener('appinstalled', function () { document.querySelectorAll('.po-pasang').forEach(function (b) { b.remove(); }); });


  // ---- Bagikan tautan aplikasi Wali Murid (kartu di halaman "Info ke Ortu") ----
  function tautanOrtu() { return new URL('./?app=ortu', location.href).href; }
  function pesanTautanOrtu() {
    var nama = '';
    try { nama = (typeof MADRASAH !== 'undefined' && MADRASAH && MADRASAH.nama) || ''; } catch (e) {}
    return 'Assalamu\'alaikum Bapak/Ibu Wali Murid' + (nama ? ' ' + nama : '') + '.\n\n' +
      'Kini ada aplikasi *SI MAMBA Wali Murid* untuk memantau kehadiran, nilai, tugas, dan infaq ananda.\n\n' +
      'Cara memasang:\n' +
      '1. Salin tautan di bawah, lalu buka di *Chrome* (iPhone: *Safari*). Jangan dibuka langsung dari dalam WhatsApp. Atau ketuk ⋮ lalu pilih _Buka di Chrome_.\n' +
      '2. Ketuk tombol *Pasang Aplikasi di HP*. Jika tidak ada: menu ⋮ lalu _Instal aplikasi_ (iPhone: Bagikan lalu _Tambahkan ke Layar Utama_).\n' +
      '3. Masuk memakai nomor WhatsApp yang terdaftar di madrasah. Belum punya PIN? Ketuk _Masuk pertama kali (tanpa PIN)_.\n\n' +
      tautanOrtu() + '\n\nJazakumullahu khairan.';
  }
  window.ortuTautanTampil = function () { var e = el('ortuTautanTeks'); if (e) e.textContent = tautanOrtu(); };
  window.ortuBagikanWA = function () {
    // Tanpa nomor: WhatsApp membuka pilihan kontak/grup (mis. grup wali murid satu kelas).
    window.open('https://wa.me/?text=' + encodeURIComponent(pesanTautanOrtu()), '_blank');
  };
  window.ortuSalinTautan = function (pesanLengkap) {
    var teks = pesanLengkap ? pesanTautanOrtu() : tautanOrtu();
    function ok() { if (typeof toast === 'function') toast(pesanLengkap ? '📋 Pesan disalin' : '📋 Tautan disalin'); }
    function cadangan() {
      var t = document.createElement('textarea'); t.value = teks; t.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { if (typeof toast === 'function') toast('Gagal menyalin. Salin manual: ' + teks, true, 6000); }
      t.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teks).then(ok, cadangan); else cadangan();
  };
  document.addEventListener('DOMContentLoaded', window.ortuTautanTampil);

  function mulai() { rapikanBeranda(); kotakPasang(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.addEventListener('load', function () { rapikanBeranda(); kotakPasang(); });
  // Cadangan: event kadang datang agak lambat setelah halaman siap; cek ulang beberapa detik pertama.
  var cek = 0, tmr = setInterval(function () { cek++; kotakPasang(); if (cek >= 10 || standalone()) clearInterval(tmr); }, 1000);
})();
