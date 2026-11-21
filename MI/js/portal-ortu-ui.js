/* Portal Orang Tua - tampilan ramah pengguna (v8.550).
   SATU lembar gaya: menggantikan blok tema "v10" & "v13" dan aturan pemadat (tombol 30px, huruf 10.5px) yang dulu ada di portal-tab.js.
   Prinsip: huruf cukup besar untuk orang tua, target sentuh >= 44px, satu palet hijau, satu elemen "bintang" (kartu anak),
   dark mode untuk semua bagian. Dimuat SESUDAH portal-tab.js. Semua selektor di bawah #portalOrtuContent supaya menang atas <style> kartu
   yang digambar ulang di dalam konten. Warna ganti di satu tempat: blok variabel --po-* di bawah. */
(function () {
  'use strict';
  if (document.getElementById('poUiTema')) return;
  var css = `
#portalOrtuDashboard,#portalOrtuLogin{--po-g:#0b6b4f;--po-h1:#0b6b4f;--po-h2:#08523d;--po-bg:#eef6f1;--po-card:#fff;--po-ink:#16261f;--po-mut:#46594f;--po-line:#d3e4da;--po-ok-bg:#d6f0e3;--po-warn:#92400e;--po-warn-bg:#fef3c7;--po-bad:#b91c1c;--po-bad-bg:#fee2e2;--po-fokus:#2563eb;--po-sh:0 1px 3px rgba(8,82,61,.10)}
body.dark-mode #portalOrtuDashboard,body.dark-mode #portalOrtuLogin{--po-g:#4cc79c;--po-h1:#0d5a43;--po-h2:#0a3f30;--po-bg:#0e1814;--po-card:#16231e;--po-ink:#e8f1ec;--po-mut:#a9bbb1;--po-line:#2b3f35;--po-ok-bg:#12382b;--po-warn:#fcd34d;--po-warn-bg:#3b2a07;--po-bad:#fca5a5;--po-bad-bg:#451a1a;--po-fokus:#93c5fd;--po-sh:none}

#portalOrtuDashboard{background:var(--po-bg)!important;color:var(--po-ink);font-size:15px;line-height:1.5}
.po-ik,.po-eik .po-ik{display:inline-block!important}
#portalOrtuDashboard :is(button,summary,a,select,input,textarea):focus-visible{outline:3px solid var(--po-fokus);outline-offset:2px}

/* Bilah atas: judul + 3 tombol ikon */
#poBar{margin-bottom:10px!important}
#poBar h2{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:800;color:var(--po-g)}
#poBar h2 .po-ik{color:var(--po-g)!important}
#poBar .btn{min-height:44px;min-width:44px;padding:0 12px;border-radius:12px;background:var(--po-card);color:var(--po-g);border:1px solid var(--po-line);box-shadow:none}
#poBar .btn .po-ik{color:var(--po-g)}
#portalOrtuAnakWrap .label{font-size:14px!important;font-weight:700;color:var(--po-ink)}
#portalOrtuAnakSelect,#portalOrtuGantiPin .field{min-height:48px!important;font-size:16px}

/* Kartu dan isi */
#portalOrtuContent .card{background:var(--po-card);color:var(--po-ink);border:1px solid var(--po-line);border-radius:16px!important;box-shadow:var(--po-sh);padding:12px!important}
#portalOrtuContent .text-muted{color:var(--po-mut)}
#portalOrtuContent .btn{min-height:40px;font-size:14px!important;border-radius:12px!important}
#portalOrtuContent .po-acc:has(>summary .po-badge.bad){box-shadow:inset 4px 0 0 var(--po-bad),var(--po-sh)}
#portalOrtuContent .po-acc:has(>summary .po-badge.warn){box-shadow:inset 4px 0 0 #f59e0b,var(--po-sh)}
#poPengingatBeranda,#bsOrtuPengingat{box-shadow:inset 4px 0 0 #f59e0b,var(--po-sh)}
#portalOrtuContent .po-acc>summary{min-height:48px;font-size:15px;padding:2px 0}
#portalOrtuContent .po-acc>summary::after{font-size:18px;color:var(--po-mut)}
#portalOrtuContent .po-acc-body{margin-top:10px}
#portalOrtuContent .po-badge{font-size:13px;font-weight:700;padding:3px 10px;background:var(--po-ok-bg);color:var(--po-ink)}
#portalOrtuContent .po-badge.ok{background:var(--po-ok-bg);color:var(--po-g)}
#portalOrtuContent .po-badge.warn{background:var(--po-warn-bg);color:var(--po-warn)}
#portalOrtuContent .po-badge.bad{background:var(--po-bad-bg);color:var(--po-bad)}
#portalOrtuContent .po-nilai th,#portalOrtuContent .po-nilai td{font-size:14px;padding:8px 4px}
#portalOrtuDashboard .po-ub-j .po-ik,#portalOrtuDashboard .po-acc>summary .po-ik,#portalOrtuDashboard #poRingkas>p .po-ik,#portalOrtuDashboard #bsOrtuBox .po-eik{color:var(--po-g)}

/* Ringkasan: ubin besar dan terbaca */
#portalOrtuContent .po-rk-grid{gap:8px}
#portalOrtuContent .po-ub{min-height:64px;padding:6px 12px;gap:0;line-height:1.15;border:1px solid var(--po-line);border-radius:14px;background:var(--po-card);color:var(--po-ink)}
#portalOrtuContent .po-ub:active{background:var(--po-ok-bg)}
#portalOrtuContent .po-ub-j{font-size:13px;font-weight:700;color:var(--po-mut)}
#portalOrtuContent .po-ub-u{font-size:20px}
#portalOrtuContent .po-ub-s{font-size:13px;color:var(--po-mut)}

/* Kartu anak = elemen bintang di Beranda */
#portalOrtuContent .po-hero{background:linear-gradient(150deg,var(--po-h1),var(--po-h2));color:#fff;border:0;border-radius:20px!important;box-shadow:0 6px 18px rgba(8,82,61,.22);margin-bottom:12px;padding:16px!important}
#portalOrtuContent .po-hero .po-ik{color:#fff}
.po-hero-sapa{font-size:14px;font-weight:600;margin:0 0 12px;color:#d6f0e3}
.po-hero-sapa span{font-weight:400;opacity:.9}
.po-hero-id{display:flex;align-items:center;gap:12px}
.po-hero-logo{width:40px;height:40px;flex:none;border-radius:14px;background:#fff;padding:4px;object-fit:contain}
.po-hero-mad{margin:0;font-size:13px;opacity:.85}
.po-hero-nama{margin:0;font-size:20px;font-weight:800;line-height:1.2}
.po-hero-kelas{margin:2px 0 0;font-size:14px;opacity:.92}
.po-hero-hadir{margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.24)}
.po-hero-jdl{margin:0 0 8px;font-size:14px;font-weight:700}
.po-hero-jdl span{font-weight:400;opacity:.9}
.po-hd{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.po-hd-i{padding:8px 2px 7px;border-radius:14px;background:rgba(255,255,255,.14);text-align:center;line-height:1.15}
.po-hd-i b{display:block;font-size:20px;font-weight:800}
.po-hd-i span{display:inline-flex;align-items:center;gap:5px;font-size:13px}
.po-hd-i span::before{content:"";width:8px;height:8px;border-radius:50%;background:#6ee7b7}
.po-hd-i[data-k="s"] span::before{background:#fcd34d}
.po-hd-i[data-k="i"] span::before{background:#93c5fd}
.po-hd-i[data-k="a"] span::before{background:#fca5a5}
.po-hd-warn{background:#fff;color:#991b1b}
.po-hd-warn span::before{background:#dc2626}
.po-hero-cat{margin:10px 0 0;font-size:13px;font-style:italic;text-align:center;opacity:.92}

body.dark-mode #portalOrtuContent .card{background:var(--po-card)!important;border-color:var(--po-line)!important}
body.dark-mode #portalOrtuContent .po-hero{background:linear-gradient(150deg,var(--po-h1),var(--po-h2))!important;border:0!important}

/* Jadwal Pelajaran: baris lebih rapat; nama guru sejajar dengan mapel bila muat, turun ke bawahnya bila tidak */
#portalOrtuContent .po-jd-chip{min-height:40px;padding:6px 14px}
#portalOrtuContent .po-jd-judul{margin:8px 0 2px}
#portalOrtuContent .po-jd-row{padding:7px 6px;gap:10px}
#portalOrtuContent .po-jd-jam{min-width:0}
#portalOrtuContent .po-jd-jam b{line-height:1.25}
#portalOrtuContent .po-jd-wkt{font-size:13px;line-height:1.25}
#portalOrtuContent .po-jd-row:not(.po-jd-uj) .po-jd-isi{flex-direction:row;flex-wrap:wrap;align-items:center;gap:3px 8px}
#portalOrtuContent .po-jd-mp{line-height:1.3;max-width:100%}
#portalOrtuContent .po-jd-guru{font-size:13px;line-height:1.3}
#portalOrtuContent .po-jd-stamp{margin-top:6px}
#portalOrtuContent :is(.po-jd-tag,.po-jd-pill,.po-jd-stamp,.po-jd-cat){font-size:13px}

/* Layar masuk */
#portalOrtuLogin .label{font-size:14px!important;font-weight:700;color:var(--po-ink)}
#portalOrtuLogin .field{min-height:52px!important;font-size:17px!important;border-radius:12px}
#portalOrtuLogin .btn-primary{min-height:52px!important;font-size:16px!important;font-weight:700;border-radius:14px}
#portalOrtuLogin .btn-soft{min-height:48px!important;font-size:15px!important;border-radius:12px}
#portalOrtuLogin input[type=checkbox]{width:20px;height:20px;accent-color:var(--po-g);flex:none}

/* HP: tab bawah (menggantikan v13), kotak Amalan tetap ringkas tapi >= 44px */
@media(max-width:759px){
#portalOrtuDashboard{padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}
#portalOrtuDashboard #poTabBar{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:var(--z-bottom-nav-mobile,100000);gap:0;margin:0;padding:0;background:var(--po-card);border:0;border-top:1px solid var(--po-line);border-radius:20px 20px 0 0;box-shadow:0 -6px 24px rgba(8,82,61,.12);height:calc(64px + env(safe-area-inset-bottom,0px))}
#portalOrtuDashboard #poTabBar button{flex:1;min-width:0;height:100%;justify-content:flex-end;gap:3px;padding:0 2px calc(8px + env(safe-area-inset-bottom,0px));border-radius:0;background:none;color:var(--po-mut);touch-action:manipulation}
#portalOrtuDashboard #poTabBar .pt-i .po-ik{width:26px;height:26px}
#portalOrtuDashboard #poTabBar .pt-l{font-size:13px;line-height:14px;font-weight:600;letter-spacing:0}
#portalOrtuDashboard #poTabBar button .po-ik{color:var(--po-mut)}
#portalOrtuDashboard #poTabBar button.on,#portalOrtuDashboard #poTabBar button.on .pt-l,#portalOrtuDashboard #poTabBar button.on .po-ik{color:var(--po-g);background:none}
#portalOrtuDashboard #poTabBar button.on .pt-l{font-weight:800}
#portalOrtuDashboard #poTabBar button.on::before{content:"";position:absolute;top:0;left:50%;width:30px;height:3px;transform:translateX(-50%);border-radius:0 0 3px 3px;background:var(--po-g)}
#portalOrtuDashboard #poTabBar button:active .po-ik{transform:scale(.9)}
#portalOrtuDashboard #poTabBar .pt-dot{top:8px;left:calc(50% + 9px);background:var(--po-bad)}
#bsOrtuBox [style*="min-height:48px"],#bsOrtuBox [style*="min-height:44px"]{min-height:44px!important;font-size:14px!important;border-radius:12px!important}
#bsOrtuBox [style*="font-size:20px"]{font-size:18px!important}
}
@media(max-width:480px){.po-hero-sapa{margin-bottom:10px}.po-hero-sapa span{display:none}}
/* Beranda HP: Ijin/Sakit Anak dan Tugas berdampingan selama keduanya tertutup. Bila salah satu dibuka, keduanya kembali selebar layar.
   Tanpa dukungan :has() aturan ini diabaikan dan kartu tetap bertumpuk seperti biasa. */
@media(max-width:759px){
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open])){display:grid;grid-template-columns:1fr 1fr;column-gap:8px}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open]))>*{grid-column:1/-1}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open]))>:is(#ijinOrtuSlot,#poAccTugas){grid-column:auto}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open]))>#ijinOrtuSlot{display:flex;flex-direction:column}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open])) :is(#ijinOrtuSlot>details,#poAccTugas){flex:1;margin-bottom:12px!important;min-width:0}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open])) :is(#ijinOrtuSlot>details,#poAccTugas)>summary{flex-wrap:wrap;align-content:center;gap:4px 6px;min-height:44px;font-size:14px}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open])) :is(#ijinOrtuSlot>details,#poAccTugas)>summary>span:first-child{order:1;flex:1 1 calc(100% - 26px)}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open])) :is(#ijinOrtuSlot>details,#poAccTugas)>summary::after{order:2}
#portalOrtuContent[data-pt="home"]:has(#ijinOrtuSlot>details:not([open])):has(#poAccTugas:not([open])) :is(#ijinOrtuSlot>details,#poAccTugas)>summary>.po-badge{order:3;flex:none}
}

/* Beranda HP: baris ringkas jadwal (kartu lengkapnya ada di tab Jadwal) */
#portalOrtuContent #poJadwalRingkas{padding:2px 12px!important}
.po-jr{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:6px 0;border:0;background:none;color:var(--po-ink);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.po-jr+.po-jr{border-top:1px solid var(--po-line)}
.po-jr-i{flex:none;display:flex;color:var(--po-g)}
.po-jr-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
.po-jr-t b{font-size:15px}
.po-jr-t span{font-size:13px;color:var(--po-mut)}
.po-jr-t span.warn{color:var(--po-warn);font-weight:700}
.po-jr-go{flex:none;font-size:22px;line-height:1;color:var(--po-mut)}
@media(min-width:760px){#portalOrtuContent #poJadwalRingkas{display:none!important}}

/* Versi aplikasi di paling bawah dashboard */
#poVersi{margin:6px 0 4px;text-align:center;font-size:13px;color:var(--po-mut);opacity:.85}

@media(prefers-reduced-motion:reduce){#portalOrtuDashboard *{animation:none!important;transition:none!important}}
`;
  var st = document.createElement('style');
  st.id = 'poUiTema';
  st.textContent = css;
  document.head.appendChild(st);

  /* Versi aplikasi (dari service worker yang sedang aktif) di paling bawah dashboard, semua tab. */
  function pasangVersi() {
    var d = document.getElementById('portalOrtuDashboard');
    if (!d) return;
    var p = document.getElementById('poVersi');
    if (!p) { p = document.createElement('p'); p.id = 'poVersi'; p.textContent = 'SI MAMBA'; d.appendChild(p); }
    try {
      var sw = navigator.serviceWorker;
      if (sw && sw.controller) {
        var ch = new MessageChannel();
        ch.port1.onmessage = function (e) { if (e.data && e.data.version) p.textContent = 'SI MAMBA \u00b7 ' + e.data.version; };
        sw.controller.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
      }
    } catch (e) { /* tanpa service worker: cukup tulisan SI MAMBA */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasangVersi); else pasangVersi();
})();
