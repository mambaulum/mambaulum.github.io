/* ============================================================
   SI MAMBA - js/portal-tab.js (v2)
   Tab di Portal Orang Tua (khusus layar HP < 760px): Beranda | Amalan | Belajar | Lainnya.
   Tidak mengubah isi/kartu: setiap anak langsung #portalOrtuContent diberi data-ptab, lalu CSS menyembunyikan yang bukan tab aktif.
   Kartu yang disisipkan belakangan oleh modul lain (Bacaan Sholat, Sholat Dhuha & Dzuhur, angket) ikut terklasifikasi otomatis lewat
   MutationObserver; anak yang tidak dikenal masuk "Lainnya". Di tablet/laptop (>= 760px) tab disembunyikan dan semua kartu tampil seperti biasa.
   Dimuat SESUDAH js/portal-ortu.js. Fungsi global: ptTampilkanDi(el) dipanggil poBukaBagian() agar kotak Ringkasan membuka tab yang tepat.
============================================================ */
(function () {
  'use strict';
  var TABS = [['home', '🏠', 'Beranda'], ['amalan', '🕌', 'Amalan'], ['belajar', '📚', 'Belajar'], ['lain', '⋯', 'Lainnya']];
  var KUNCI = 'mamba_po_tab';
  var aktif = 'home';
  try { var s = sessionStorage.getItem(KUNCI); if (s && TABS.some(function (t) { return t[0] === s; })) aktif = s; } catch (e) { /* storage tidak ada */ }

  function el(id) { return document.getElementById(id); }
  function tabUntuk(c) {
    var id = c.id || '';
    if (id === 'poKopKehadiran' || id === 'poRingkas' || id === 'poPengingatBeranda') return 'home';
    if (id === 'bsOrtuBox' || id === 'portalOrtuSholatCard') return 'amalan';
    if (id === 'poAccNilai') return 'belajar';
    if (c.tagName === 'DETAILS') {
      var sm = c.querySelector('summary'), t = sm ? (sm.textContent || '').slice(0, 60) : '';
      if (/Tugas|Agenda|Infaq/.test(t)) return 'home';
      if (/Sikap/.test(t)) return 'amalan';
      if (/Nilai|Hasil Belajar|Materi|Buku Penghubung/.test(t)) return 'belajar';
    }
    return 'lain';
  }
  function bar() {
    var b = el('poTabBar');
    if (b) return b;
    var content = el('portalOrtuContent'); if (!content || !content.parentNode) return null;
    b = document.createElement('div'); b.id = 'poTabBar'; b.setAttribute('role', 'tablist');
    b.innerHTML = TABS.map(function (t) {
      return '<button type="button" role="tab" data-tab="' + t[0] + '" onclick="ptPilih(\'' + t[0] + '\')"><span class="pt-i">' + t[1] + '</span><span class="pt-l">' + t[2] + '</span><i class="pt-dot" hidden></i></button>';
    }).join('');
    content.parentNode.insertBefore(b, content);
    return b;
  }
  // Salinan ringkas pengingat "Amalan di rumah belum diisi" di Beranda (aslinya ada di dalam kotak Amalan). Tombolnya meneruskan klik ke tombol asli.
  function sinkronPengingat(content) {
    var asli = el('bsOrtuPengingat'), m = el('poPengingatBeranda');
    if (!asli) { if (m) m.remove(); return; }
    var ps = asli.querySelectorAll('p'), teks = ps[1] ? ps[1].textContent : '';
    var tombol = asli.querySelector('button.btn-primary'), labelIsi = tombol ? tombol.textContent : 'Isi sekarang';
    var kunci = teks + '|' + labelIsi;
    if (m && m.getAttribute('data-k') === kunci) return;
    if (!m) {
      m = document.createElement('div'); m.id = 'poPengingatBeranda'; m.className = 'card'; m.setAttribute('data-ptab', 'home');
      m.style.cssText = 'margin-bottom:8px;padding:8px 12px;border:1px solid #fcd34d;background:#fffbeb;';
      var acuan = el('poRingkas') || el('poKopKehadiran');
      if (acuan && acuan.nextSibling) content.insertBefore(m, acuan.nextSibling); else content.appendChild(m);
    }
    m.setAttribute('data-k', kunci); m.textContent = '';
    var j = document.createElement('p'); j.style.cssText = 'font-weight:700;font-size:13px;'; j.textContent = '🔔 Amalan di rumah belum diisi'; m.appendChild(j);
    var t = document.createElement('p'); t.style.cssText = 'font-size:12px;margin:2px 0 6px;'; t.textContent = teks; m.appendChild(t);
    var baris = document.createElement('div'); baris.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'btn btn-primary'; b1.style.cssText = 'padding:3px 12px;font-size:12px;min-height:32px;'; b1.textContent = labelIsi;
    b1.onclick = function () { window.ptPilih('amalan'); var a = el('bsOrtuPengingat'), x = a && a.querySelector('button.btn-primary'); if (x) x.click(); };
    var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn btn-soft'; b2.style.cssText = 'padding:3px 12px;font-size:12px;min-height:32px;'; b2.textContent = 'Nanti';
    b2.onclick = function () { var a = el('bsOrtuPengingat'), x = a && a.querySelector('button.btn-soft'); if (x) x.click(); };
    baris.appendChild(b1); baris.appendChild(b2); m.appendChild(baris);
  }
  function terapkan() {
    var content = el('portalOrtuContent'); if (!content) return;
    var b = bar(); if (!b) return;
    var siap = !!content.querySelector('#poKopKehadiran');           // dashboard sudah digambar (bukan "Memuat data...")
    b.style.display = siap ? '' : 'none';
    if (!siap) { content.removeAttribute('data-pt'); return; }
    sinkronPengingat(content);
    Array.prototype.forEach.call(content.children, function (c) {
      var t = tabUntuk(c); if (c.getAttribute('data-ptab') !== t) c.setAttribute('data-ptab', t);
    });
    content.setAttribute('data-pt', aktif);
    Array.prototype.forEach.call(b.querySelectorAll('button'), function (x) {
      var on = x.getAttribute('data-tab') === aktif; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // Titik merah di tab Amalan bila ada pengingat "Amalan di rumah belum diisi" (kartu itu ada di dalam kotak Amalan).
    var dot = b.querySelector('button[data-tab="amalan"] .pt-dot'); if (dot) dot.hidden = !el('bsOrtuPengingat');
  }
  window.ptPilih = function (k) {
    aktif = k; try { sessionStorage.setItem(KUNCI, k); } catch (e) { /* abaikan */ }
    terapkan();
    var b = el('poTabBar'); if (b && b.scrollIntoView && b.getBoundingClientRect().top < 0) { try { b.scrollIntoView({ block: 'start' }); } catch (e) { /* abaikan */ } }
  };
  // Buka tab tempat elemen berada (dipakai kotak Ringkasan sebelum menggulir ke rincian).
  window.ptTampilkanDi = function (node) {
    var content = el('portalOrtuContent'); if (!content || !node) return;
    var c = node; while (c && c.parentNode !== content) c = c.parentNode;
    if (c && c.getAttribute('data-ptab') && c.getAttribute('data-ptab') !== aktif) { aktif = c.getAttribute('data-ptab'); terapkan(); }
  };
  function pasang() {
    var content = el('portalOrtuContent'); if (!content) return false;
    new MutationObserver(function () { try { terapkan(); } catch (e) { console.warn('[SI MAMBA] Tab Portal Ortu:', e); } }).observe(content, { childList: true, subtree: true });
    terapkan(); return true;
  }
  var css = document.createElement('style');
  css.textContent = '#poTabBar{display:none}@media(min-width:760px){#poPengingatBeranda{display:none}}'
    + '@media(max-width:759px){'
    + '#poTabBar{display:flex!important;gap:4px;position:sticky;top:0;z-index:20;background:#fff;padding:6px 0;margin:0 0 8px;border-bottom:1px solid #e5e7eb}'
    + '#poTabBar[style*="display: none"]{display:none!important}'
    + '#poTabBar button{flex:1;min-width:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 2px;border:0;border-radius:10px;background:transparent;color:#475569;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '#poTabBar .pt-i{font-size:17px;line-height:1.1}#poTabBar .pt-l{font-size:11px;font-weight:600}'
    + '#poTabBar button.on{background:#d1fae5;color:#00543f}#poTabBar button.on .pt-l{font-weight:800}'
    + '#poTabBar .pt-dot{position:absolute;top:3px;right:22%;width:8px;height:8px;border-radius:50%;background:#dc2626}#poTabBar .pt-dot[hidden]{display:none}'
    + '#portalOrtuContent[data-pt="home"]>:not([data-ptab="home"]):not(style),#portalOrtuContent[data-pt="amalan"]>:not([data-ptab="amalan"]):not(style),#portalOrtuContent[data-pt="belajar"]>:not([data-ptab="belajar"]):not(style),#portalOrtuContent[data-pt="lain"]>:not([data-ptab="lain"]):not(style){display:none!important}'
    + '}';
  document.head.appendChild(css);
  if (!pasang()) document.addEventListener('DOMContentLoaded', pasang);
})();
