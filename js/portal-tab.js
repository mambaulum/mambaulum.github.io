/* ============================================================
   SI MAMBA - js/portal-tab.js (v12)
   Tab di Portal Orang Tua (khusus layar HP < 760px): Beranda | Amalan | Belajar | Angket | Lainnya.
   Tidak mengubah isi/kartu: setiap anak langsung #portalOrtuContent diberi data-ptab, lalu CSS menyembunyikan yang bukan tab aktif.
   Tab Angket menampung tiga angket (Kurikulum, Profil Lulusan, Keunggulan); titik merah muncul bila ada angket yang dibuka dan belum diisi.
   Kartu yang disisipkan belakangan oleh modul lain (Bacaan Sholat, Sholat Dhuha & Dzuhur, angket) ikut terklasifikasi otomatis lewat
   MutationObserver; anak yang tidak dikenal masuk "Lainnya". Di tablet/laptop (>= 760px) tab disembunyikan dan semua kartu tampil seperti biasa.
   Dimuat SESUDAH js/portal-ortu.js. Fungsi global: ptTampilkanDi(el) dipanggil poBukaBagian() agar kotak Ringkasan membuka tab yang tepat.
============================================================ */
(function () {
  'use strict';
  var TABS = [['home', 'home', 'Beranda'], ['amalan', 'moon', 'Amalan'], ['belajar', 'buku', 'Belajar'], ['angket', 'angket', 'Angket'], ['lain', 'lain', 'Lainnya']];
  var KUNCI = 'mamba_po_tab';
  var aktif = 'home';
  try { var s = sessionStorage.getItem(KUNCI); if (s && TABS.some(function (t) { return t[0] === s; })) aktif = s; } catch (e) { /* storage tidak ada */ }

  // ---------- Ikon garis (outline) modern, menggantikan emoji di Portal Orang Tua ----------
  var IKON = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    buku: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    angket: '<path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M8 11h8M8 15h5"/>',
    lain: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    kehadiran: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M9 15l2 2 4-4"/>',
    agenda: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7.5 16v-4M12 16V8M16.5 16v-6"/>',
    nilai: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    tugas: '<path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 14l2 2 4-4"/>',
    infaq: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.3C14.3 8.5 13.3 8 12 8c-1.7 0-3 .9-3 2.1 0 2.9 6 1.4 6 4.2 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.4M12 6v2M12 16v2"/>',
    cek: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16 9.5"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    pensil: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    materi: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    bintang: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3L5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    pesan: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    daun: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.2-4.1 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 5-7"/>',
    termo: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
    api: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sunrise: '<path d="M12 2v6M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M16 18a4 4 0 0 0-8 0M8 6l4-4 4 4"/>',
    sunset: '<path d="M12 10V2M4.9 10.9l1.4 1.4M2 18h2M20 18h2M19.1 10.9l-1.4 1.4M22 22H2M16 18a4 4 0 0 0-8 0M16 5l-4 4-4-4"/>',
    awan: '<path d="M12 2v2M4.9 4.9l1.4 1.4M2 12h2M20 12h2M19.1 4.9l-1.4 1.4M16 12a4 4 0 0 0-8 0"/><path d="M6 20h10a3.5 3.5 0 0 0 .5-6.9"/><path d="M6 20a3 3 0 0 1 0-6h1"/>',
    hati: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3"/>',
    aktif: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    apel: '<path d="M12 20.9c1.5 0 2.7 1 4 1 3 0 6-8 6-12.2A4.9 4.9 0 0 0 17 5c-2.2 0-4 1.4-5 2-1-.6-2.8-2-5-2a4.9 4.9 0 0 0-5 4.8C2 14 5 22 8 22c1.3 0 2.5-1.1 4-1.1z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    kasur: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
    tunas: '<path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    medali: '<circle cx="12" cy="9" r="6"/><path d="M8.2 14 7 22l5-3 5 3-1.2-8"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    kilau: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/>',
    petir: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    sinyal: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01"/>',
    awas: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    silang: '<path d="M18 6 6 18M6 6l12 12"/>',
    segar: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    kotak: '<path d="m9 11 3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    batal: '<path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    naik: '<path d="m22 7-8.5 8.5-5-5L2 17M16 7h6v6"/>',
    bulat: '<circle cx="12" cy="12" r="9"/>',
    sekolah: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-5h6v5M12 4V2"/>',
    titik: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
    kirim: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    kunci: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M16 7l3 3M14 9l2 2"/>',
    pin: '<path d="M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    tautan: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    pasir: '<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>'
  };
  window.poIkon = function (nama, px) {
    var d = IKON[nama]; if (!d) return '';
    var u = px || 18;
    return '<svg class="po-ik" viewBox="0 0 24 24" width="' + u + '" height="' + u + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  // Ganti emoji di AWAL judul dengan ikon garis; teks lain tidak disentuh. Dipakai kartu lipat & kotak Ringkasan.
  var PETA = [[/^📊 /, 'chart'], [/^📅 Kehadiran/, 'kehadiran'], [/^📝 Nilai/, 'nilai'], [/^📝 /, 'tugas'], [/^🧒 /, 'user'], [/^💵 /, 'infaq'], [/^🏡 /, 'cek'],
    [/^📿 /, 'bookmark'], [/^📆 /, 'agenda'], [/^📘 /, 'pensil'], [/^📚 /, 'materi'], [/^🌟 /, 'bintang'], [/^📖 /, 'pesan'], [/^💬 /, 'pesan'], [/^🕌 /, 'moon']];
  window.poIkonDepan = function (html) {
    var t = String(html == null ? '' : html);
    for (var i = 0; i < PETA.length; i++) if (PETA[i][0].test(t)) return window.poIkon(PETA[i][1], 17) + ' ' + t.replace(/^\S+ /, '');
    return t;
  };


  // ---------- Emoji -> ikon garis di seluruh isi Portal Ortu (termasuk kotak Bacaan Sholat & Amalan) ----------
  // Hanya emoji yang dikenal yang diganti; sisanya dibiarkan. Berjalan lagi tiap isi berubah, jadi ikut menangkap tampilan yang digambar ulang.
  var EMO = {
    '🌅': ['sunrise'], '🌞': ['sun'], '🌤': ['awan'], '🌇': ['sunset'], '🌙': ['moon'], '📖': ['buku'], '☀': ['sun'], '🤝': ['hati'],
    '⏰': ['alarm'], '🏃': ['aktif'], '🥗': ['apel'], '📚': ['materi'], '🛌': ['kasur'], '🕌': ['moon'], '🌱': ['tunas'], '🌟': ['bintang'], '⭐': ['bintang'],
    '🌠': ['bintang'], '🏅': ['medali'], '🎯': ['target'], '🎉': ['kilau', '#d97706'], '💪': ['petir'], '🔥': ['api', '#ea580c'], '📡': ['sinyal'],
    '⚠': ['awas', '#d97706'], '❌': ['silang', '#dc2626'], '🔄': ['segar'], '🔁': ['segar'], '⏳': ['pasir'], '✅': ['cek', '#059669'], '⬜': ['bulat', '#9ca3af'],
    '☑': ['kotak'], '↩': ['batal'], '🌿': ['daun'], '🤒': ['termo'], '💬': ['pesan'], '📈': ['naik'], '📋': ['tugas'], '🏡': ['home'], '👧': ['user'], '🧒': ['user'],
    '🏫': ['sekolah'], '📤': ['kirim'], '🔑': ['kunci'], '📜': ['nilai'], '📌': ['pin'], '🔗': ['tautan'], '🔴': ['titik', '#dc2626'], '🟣': ['titik', '#7c3aed'], '🟠': ['titik', '#ea580c'], '🟢': ['titik', '#16a34a']
  };
  var EMO_RE = new RegExp('(' + Object.keys(EMO).sort(function (a, b) { return b.length - a.length; }).join('|') + ')[\\uFE0F]?', 'g');
  function ikonkan(akar) {
    if (!akar || !document.createTreeWalker) return;
    var w = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT, null), n, daftar = [];
    while ((n = w.nextNode())) {
      var pr = n.parentNode && n.parentNode.nodeName;
      if (pr === 'SCRIPT' || pr === 'STYLE' || pr === 'TEXTAREA' || pr === 'OPTION') continue;
      EMO_RE.lastIndex = 0; if (EMO_RE.test(n.nodeValue)) daftar.push(n);
    }
    daftar.forEach(function (t) {
      var teks = t.nodeValue, frag = document.createDocumentFragment(), akhir = 0, m;
      EMO_RE.lastIndex = 0;
      while ((m = EMO_RE.exec(teks))) {
        if (m.index > akhir) frag.appendChild(document.createTextNode(teks.slice(akhir, m.index)));
        var d = EMO[m[1]], sp = document.createElement('span'); sp.className = 'po-eik'; sp.innerHTML = window.poIkon(d[0], 16);
        if (d[1]) sp.style.color = d[1]; frag.appendChild(sp); akhir = m.index + m[0].length;
      }
      if (akhir < teks.length) frag.appendChild(document.createTextNode(teks.slice(akhir)));
      t.parentNode.replaceChild(frag, t);
    });
  }

  function el(id) { return document.getElementById(id); }
  // Tiga angket di Portal Ortu: Kurikulum (ortu & siswa), Profil Lulusan, Keunggulan (ortu & siswa). Slot kosong = angket ditutup.
  // Urutan di sini = urutan tampil di tab Angket (diatur lewat CSS order di bawah): Kurikulum, Keunggulan, lalu Profil Lulusan.
  var ID_ANGKET = ['angketOrtuSlot', 'angketSiswaSlot', 'angketKeunggulanOrtuSlot', 'angketKeunggulanSiswaSlot', 'p8OrtuBox'];
  function tabUntuk(c) {
    var id = c.id || '';
    if (id === 'poKopKehadiran' || id === 'poRingkas' || id === 'poPengingatBeranda') return 'home';
    if (id === 'bsOrtuBox' || id === 'portalOrtuSholatCard') return 'amalan';
    if (id === 'poAccNilai') return 'belajar';
    if (id === 'poAngketKosong' || ID_ANGKET.indexOf(id) >= 0) return 'angket';
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
      return '<button type="button" role="tab" data-tab="' + t[0] + '" onclick="ptPilih(\'' + t[0] + '\')"><span class="pt-i">' + window.poIkon(t[1], 21) + '</span><span class="pt-l">' + t[2] + '</span><i class="pt-dot" hidden></i></button>';
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
    var j = document.createElement('p'); j.style.cssText = 'font-weight:700;font-size:13px;'; j.innerHTML = window.poIkon('bell', 16) + ' Amalan di rumah belum diisi'; m.appendChild(j);
    var t = document.createElement('p'); t.style.cssText = 'font-size:12px;margin:2px 0 6px;'; t.textContent = teks; m.appendChild(t);
    var baris = document.createElement('div'); baris.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    var b1 = document.createElement('button'); b1.type = 'button'; b1.className = 'btn btn-primary'; b1.style.cssText = 'padding:3px 12px;font-size:12px;min-height:32px;'; b1.textContent = labelIsi;
    b1.onclick = function () { window.ptPilih('amalan'); var a = el('bsOrtuPengingat'), x = a && a.querySelector('button.btn-primary'); if (x) x.click(); };
    var b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'btn btn-soft'; b2.style.cssText = 'padding:3px 12px;font-size:12px;min-height:32px;'; b2.textContent = 'Nanti';
    b2.onclick = function () { var a = el('bsOrtuPengingat'), x = a && a.querySelector('button.btn-soft'); if (x) x.click(); };
    baris.appendChild(b1); baris.appendChild(b2); m.appendChild(baris);
  }
  // Kartu angket Kurikulum/Keunggulan tidak mengubah lencananya sesudah dikirim (formnya menampilkan "Anda sudah mengisi angket ini").
  // Di sini lencananya disamakan, supaya titik merah ikut hilang begitu angket terkirim tanpa memuat ulang halaman.
  function samakanLencana(content) {
    Array.prototype.forEach.call(content.querySelectorAll('#angketOrtuSlot,#angketSiswaSlot,#angketKeunggulanOrtuSlot,#angketKeunggulanSiswaSlot'), function (slot) {
      var bd = slot.querySelector('summary .po-badge.warn');
      if (bd && /Anda sudah mengisi angket ini/.test(slot.textContent || '')) { bd.textContent = 'Sudah diisi'; bd.className = 'po-badge ok'; }
    });
  }
  function kartuAngketBelum(content) {
    return ID_ANGKET.map(el).filter(function (k) { return k && k.parentNode === content && k.querySelector('summary .po-badge.warn'); });
  }
  function adaAngketBelumDiisi(content) { return kartuAngketBelum(content).length > 0; }
  // Ketuk kotak "Angket" di Ringkasan: buka tab Angket (HP), buka kartu angket pertama yang belum diisi, lalu gulir ke sana.
  window.ptBukaAngket = function () {
    var content = el('portalOrtuContent'); if (!content) return;
    var k = kartuAngketBelum(content)[0]; if (!k) return;
    if (window.innerWidth < 760) window.ptPilih('angket');
    var d = k.tagName === 'DETAILS' ? k : k.querySelector('details'); if (d) d.open = true;
    try { k.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { k.scrollIntoView(); }
  };
  // Kotak tambahan di Ringkasan Beranda: "Angket · N belum diisi". Hanya ada selama ada angket yang belum diisi.
  function sinkronUbinAngket(content) {
    var grid = content.querySelector('#poRingkas .po-rk-grid'), u = el('poRingkasAngket');
    var n = kartuAngketBelum(content).length;
    if (!grid || !n) { if (u) u.remove(); return; }
    if (u && u.getAttribute('data-n') === String(n) && u.parentNode === grid) return;
    if (u) u.remove();
    u = document.createElement('button'); u.type = 'button'; u.id = 'poRingkasAngket'; u.className = 'po-ub po-ub-penuh'; u.setAttribute('data-n', String(n));
    u.onclick = function () { window.ptBukaAngket(); };
    u.innerHTML = '<span class="po-ub-j">' + window.poIkon('angket', 17) + ' Angket</span><span class="po-ub-u" style="color:#dc2626">' + n + ' belum diisi</span><span class="po-ub-s">Ketuk untuk mengisi</span>';
    grid.appendChild(u);
  }
  // Isi kosong di tab Angket (semua angket ditutup / belum termuat): tampilkan keterangan singkat supaya tab tidak terlihat rusak.
  function sinkronAngketKosong(content) {
    var ada = ID_ANGKET.some(function (id) { var k = el(id); return k && k.parentNode === content && (k.textContent || '').replace(/\s+/g, '') !== ''; });
    var m = el('poAngketKosong');
    if (ada) { if (m) m.remove(); return; }
    if (m) return;
    m = document.createElement('div'); m.id = 'poAngketKosong'; m.className = 'card'; m.setAttribute('data-ptab', 'angket');
    m.style.cssText = 'padding:14px;text-align:center;font-size:13px;color:#475569;';
    m.textContent = 'Belum ada angket yang perlu diisi. Bila madrasah membuka angket, kartunya akan muncul di sini.';
    content.appendChild(m);
  }
  function terapkan() {
    var content = el('portalOrtuContent'); if (!content) return;
    var b = bar(); if (!b) return;
    var siap = !!content.querySelector('#poKopKehadiran');           // dashboard sudah digambar (bukan "Memuat data...")
    b.style.display = siap ? '' : 'none';
    if (!siap) { content.removeAttribute('data-pt'); return; }
    sinkronPengingat(content);
    samakanLencana(content); sinkronAngketKosong(content); sinkronUbinAngket(content);
    try { ikonkan(content); } catch (e) { console.warn('[SI MAMBA] Ikon Portal Ortu:', e); }
    Array.prototype.forEach.call(content.children, function (c) {
      var t = tabUntuk(c); if (c.getAttribute('data-ptab') !== t) c.setAttribute('data-ptab', t);
    });
    content.setAttribute('data-pt', aktif);
    Array.prototype.forEach.call(b.querySelectorAll('button'), function (x) {
      var on = x.getAttribute('data-tab') === aktif; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // Titik merah di tab Amalan bila ada pengingat "Amalan di rumah belum diisi" (kartu itu ada di dalam kotak Amalan).
    var dot = b.querySelector('button[data-tab="amalan"] .pt-dot'); if (dot) dot.hidden = !el('bsOrtuPengingat');
    // Titik merah di tab Angket bila ada angket yang sedang dibuka dan belum diisi (lencana kartu "Mohon diisi" / "Belum diisi" / "Belum selesai").
    var dotA = b.querySelector('button[data-tab="angket"] .pt-dot'); if (dotA) dotA.hidden = !adaAngketBelumDiisi(content);
  }
  window.ptPilih = function (k) {
    var arah = TABS.map(function (t) { return t[0]; }).indexOf(k) - TABS.map(function (t) { return t[0]; }).indexOf(aktif);
    var cc = el('portalOrtuContent');
    if (cc && arah !== 0) { cc.style.setProperty('--pt-dx', (arah > 0 ? '18px' : '-18px')); cc.setAttribute('data-anim', '1'); setTimeout(function () { cc.removeAttribute('data-anim'); }, 320); }
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


  // ---------- Tombol Update di header Portal Ortu ----------
  // Memeriksa pembaruan Service Worker; bila ada versi baru langsung dipasang lalu halaman dimuat ulang. Bila tidak ada: tampil pesan "Sudah versi terbaru".
  function toast(teks) {
    var t = document.getElementById('poToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'poToast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
      t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);max-width:88vw;padding:9px 16px;border-radius:999px;background:#0f172a;color:#fff;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.25);text-align:center;';
      document.body.appendChild(t);
    }
    t.textContent = teks; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = 'none'; }, 3200);
  }
  function versiAktif(reg, cb) {
    var selesai = false, fin = function (v) { if (!selesai) { selesai = true; cb(v); } };
    try {
      var w = reg.active; if (!w) return fin('');
      var mc = new MessageChannel(); mc.port1.onmessage = function (e) { fin(e.data && e.data.version ? e.data.version : ''); };
      w.postMessage({ type: 'GET_VERSION' }, [mc.port2]); setTimeout(function () { fin(''); }, 1500);
    } catch (e) { fin(''); }
  }
  window.ptPerbarui = function (btn) {
    if (!btn || btn.disabled) return;
    var ik = btn.querySelector('svg'), mulaiPutar = function () { btn.disabled = true; if (ik) ik.style.animation = 'ptPutar .9s linear infinite'; },
        selesai = function (pesan) { btn.disabled = false; if (ik) ik.style.animation = ''; if (pesan) toast(pesan); },
        muat = function () { toast('Memuat ulang...'); setTimeout(function () { location.reload(); }, 400); };
    mulaiPutar();
    if (navigator.onLine === false) return selesai('Tidak ada koneksi internet. Coba lagi saat online.');
    if (!('serviceWorker' in navigator)) return muat();
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return muat();
      var pasangBaru = function (menunggu) {
        var sudah = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () { if (!sudah) { sudah = true; location.reload(); } });
        toast('Memasang pembaruan...'); menunggu.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(function () { if (!sudah) { sudah = true; location.reload(); } }, 4000);
      };
      return reg.update().then(function () {
        if (reg.waiting) return pasangBaru(reg.waiting);
        var inst = reg.installing;
        if (inst) {
          toast('Mengunduh pembaruan...');
          var cek = function () { if (inst.state === 'installed' && reg.waiting) pasangBaru(reg.waiting); else if (inst.state === 'redundant') selesai('Pembaruan gagal diunduh. Coba lagi.'); };
          inst.addEventListener('statechange', cek); cek(); return;
        }
        versiAktif(reg, function (v) { selesai('Sudah versi terbaru' + (v ? ' (' + v + ')' : '') + '.'); });
      });
    }).catch(function () { selesai('Gagal memeriksa pembaruan. Coba lagi.'); });
  };

  // ---------- Geser layar kiri/kanan untuk pindah tab (hanya HP) ----------
  function bolehGeser(node) {
    for (var x = node; x && x.nodeType === 1; x = x.parentNode) {
      var tg = x.nodeName;
      if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || x.isContentEditable) return false;
      if (x.id === 'portalOrtuContent') break;
      if (x.scrollWidth > x.clientWidth + 2) { var ov = getComputedStyle(x).overflowX; if (ov === 'auto' || ov === 'scroll') return false; }   // tabel/area yang bisa digeser sendiri
    }
    return true;
  }
  function pasangGeser(content) {
    var x0 = 0, y0 = 0, t0 = 0, ok = false;
    content.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; ok = e.touches.length === 1 && window.innerWidth < 760 && t.clientX > 28 && t.clientX < window.innerWidth - 28 && bolehGeser(e.target);   // tepi layar dibiarkan untuk gestur back
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
    }, { passive: true });
    content.addEventListener('touchend', function (e) {
      if (!ok) return; ok = false;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || Date.now() - t0 > 700) return;
      var urut = TABS.map(function (a) { return a[0]; }), i = urut.indexOf(aktif), j = dx < 0 ? i + 1 : i - 1;
      if (j >= 0 && j < urut.length) window.ptPilih(urut[j]);
    }, { passive: true });
  }

  function pasang() {
    var content = el('portalOrtuContent'); if (!content) return false;
    new MutationObserver(function () { try { terapkan(); } catch (e) { console.warn('[SI MAMBA] Tab Portal Ortu:', e); } }).observe(content, { childList: true, subtree: true });
    pasangGeser(content); terapkan(); return true;
  }
  var css = document.createElement('style');
  css.textContent = '.po-ik{flex:none;vertical-align:-3px}.po-eik{display:inline-flex;vertical-align:middle;line-height:1}.po-eik .po-ik{width:1.1em;height:1.1em;vertical-align:0;color:inherit}#bsOrtuBox .po-eik{color:#0f766e}.po-ub-j{display:flex;align-items:center;gap:4px}.po-ub-j .po-ik,.po-acc>summary .po-ik,#poRingkas>p .po-ik,#poKopKehadiran .po-ik,#poTabBar .po-ik{color:#0f766e}#poTabBar button.on .po-ik{color:#00543f}#bsOrtuPengingat .po-ik,#poPengingatBeranda .po-ik{color:#b45309}.po-acc>summary>span:first-child .po-ik{margin-right:4px}#poTabBar{display:none}@media(min-width:760px){#poPengingatBeranda{display:none}}'
    + '@media(max-width:759px){#portalOrtuContent .btn,#poPengingatBeranda .btn,#portalOrtuDashboard .btn{min-height:30px!important;padding:2px 10px!important;font-size:12px!important;border-radius:9px!important}'
    + '#bsOrtuBox button[style*="min-height:48px"],#bsOrtuBox div[style*="min-height:48px"]{min-height:36px!important;padding:3px 8px!important;font-size:12.5px!important;border-width:1.5px!important;border-radius:10px!important;gap:5px!important}'
    + '#bsOrtuBox button[style*="min-height:44px"]{min-height:34px!important;padding:3px 8px!important;font-size:12.5px!important;border-width:1.5px!important;border-radius:10px!important;margin-top:6px!important}'
    + '#bsOrtuBox [style*="font-size:20px"]{font-size:16px!important}#bsOrtuBox [style*="font-size:16px"]{font-size:14px!important}'
    + '#portalOrtuDashboard>div>div:first-child .btn{min-height:28px!important;padding:2px 9px!important;font-size:11px!important}}'
    + '@keyframes ptPutar{to{transform:rotate(360deg)}}'
    + '@keyframes ptMasuk{from{opacity:0;transform:translateX(var(--pt-dx,18px))}to{opacity:1;transform:none}}'
    + '@media(max-width:759px) and (prefers-reduced-motion:no-preference){#portalOrtuContent[data-anim="1"]>[data-ptab]{animation:ptMasuk .22s ease-out}}'
    + '@media(max-width:759px){#portalOrtuDashboard .po-bt{display:none}#portalOrtuDashboard .po-bt-ikon{padding:2px 8px!important;min-width:34px}}'
    + '@media(max-width:759px){.po-rk-grid{gap:5px!important}.po-ub{padding:6px 8px!important;gap:0!important}.po-ub-u{font-size:16px!important}.po-ub-s{line-height:1.25!important}'
    + '#poTabBar{display:flex!important;gap:2px;position:sticky;top:0;z-index:20;background:#fff;padding:6px 0;margin:0 0 8px;border-bottom:1px solid #e5e7eb}'
    + '#poTabBar[style*="display: none"]{display:none!important}'
    + '#poTabBar button{flex:1;min-width:0;position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 1px;border:0;border-radius:10px;background:transparent;color:#475569;font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '#poTabBar .pt-i{display:flex;line-height:1}#poTabBar .pt-l{font-size:10.5px;font-weight:600;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-.1px}'
    + '#poTabBar button.on{background:#d1fae5;color:#00543f}#poTabBar button.on .pt-l{font-weight:800}'
    + '#poTabBar .pt-dot{position:absolute;top:2px;left:calc(50% + 6px);width:8px;height:8px;border-radius:50%;background:#dc2626}#poTabBar .pt-dot[hidden]{display:none}'
    + '#portalOrtuContent[data-pt="home"]>:not([data-ptab="home"]):not(style),#portalOrtuContent[data-pt="amalan"]>:not([data-ptab="amalan"]):not(style),#portalOrtuContent[data-pt="belajar"]>:not([data-ptab="belajar"]):not(style),#portalOrtuContent[data-pt="angket"]>:not([data-ptab="angket"]):not(style),#portalOrtuContent[data-pt="lain"]>:not([data-ptab="lain"]):not(style){display:none!important}'
    + '#portalOrtuContent[data-pt="angket"]{display:flex;flex-direction:column}#angketOrtuSlot{order:1}#angketSiswaSlot{order:2}#angketKeunggulanOrtuSlot{order:3}#angketKeunggulanSiswaSlot{order:4}#p8OrtuBox{order:5}#poAngketKosong{order:0}'
    + '}';
  // Tema hijau (v10): pita header hijau, latar halaman hijau muda, tab aktif hijau penuh. Warna utama ada di satu tempat (--po-hijau) supaya mudah diganti.
  // Juga memperbaiki ikon yang tadinya turun ke baris sendiri (styles.css membuat svg display:block).
  css.textContent += '#portalOrtuDashboard{--po-hijau:#0b6b4f;--po-hijau-tua:#08523d;--po-hijau-muda:#e8f3ec;background:var(--po-hijau-muda)!important}'
    + '.po-ik,.po-eik .po-ik{display:inline-block!important}'
    + '#portalOrtuDashboard>div>div:first-child{background:linear-gradient(135deg,var(--po-hijau),var(--po-hijau-tua));color:#fff;border-radius:14px;padding:8px 10px;box-shadow:0 2px 8px rgba(8,82,61,.25)}'
    + '#portalOrtuDashboard>div>div:first-child h2{color:#fff;display:flex;align-items:center;gap:6px}#portalOrtuDashboard>div>div:first-child h2 .po-ik{color:#fff!important}'
    + '#portalOrtuDashboard>div>div:first-child .btn{background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.35)!important;box-shadow:none!important}'
    + '#portalOrtuDashboard>div>div:first-child .btn .po-ik{color:#fff!important}'
    + '#poTabBar{background:#fff!important;border:1px solid #d5e6dc;border-radius:14px;padding:4px!important;box-shadow:0 2px 8px rgba(8,82,61,.10)}'
    + '#poTabBar button.on{background:var(--po-hijau)!important;color:#fff!important}#poTabBar button.on .po-ik{color:#fff!important}#poTabBar button.on .pt-l{color:#fff}'
    + '.po-ub-j .po-ik,.po-acc>summary .po-ik,#poRingkas>p .po-ik,#poKopKehadiran .po-ik,#bsOrtuBox .po-eik{color:var(--po-hijau)!important}'
    + '#portalOrtuContent .card{border-color:#d5e6dc!important}'
    + '#portalOrtuContent .po-acc:has(>summary .po-badge.bad){box-shadow:inset 4px 0 0 #dc2626,0 1px 3px rgba(0,0,0,.06)!important}'
    + '#portalOrtuContent .po-acc:has(>summary .po-badge.warn){box-shadow:inset 4px 0 0 #f59e0b,0 1px 3px rgba(0,0,0,.06)!important}'
    + '#poPengingatBeranda,#bsOrtuPengingat{box-shadow:inset 4px 0 0 #f59e0b,0 1px 3px rgba(0,0,0,.06)!important}'
    + '@media(max-width:759px){.po-ub-j{font-size:10.5px!important}}';
  document.head.appendChild(css);
  if (!pasang()) document.addEventListener('DOMContentLoaded', pasang);
})();
