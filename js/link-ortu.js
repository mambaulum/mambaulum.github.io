// ============================================================
// link-ortu.js -- LINK MASUK PORTAL ORANG TUA LEWAT WHATSAPP (tanpa PIN)
// ============================================================
// Dua tugas:
//  1) Sisi orang tua: kalau URL berisi #masuk=<noWA>.<token>, buka Portal Orang Tua otomatis. Verifikasi token
//     dan "ingat perangkat" dikerjakan portal-ortu.js (ortuMasukLink).
//  2) Sisi Admin: panel "Link Masuk WA" (tombol di kartu Akun Portal Orang Tua) untuk membuat link per nomor WA
//     dan mengirimkannya lewat WhatsApp. Di server hanya disimpan HASH token: ortu_link/<noWA>/<sha256(token)>.
// Dimuat SESUDAH js/app.js dan js/portal-ortu.js. Tidak menyentuh node ortu_akun (PIN tetap berjalan sendiri).
// ============================================================
(function () {
  'use strict';

  // ---------- 1) Sisi orang tua: buka portal otomatis dari link ----------
  if (/[#&]masuk=62[0-9]{8,13}\.[0-9a-f]{32}/.test(location.hash || '')) {
    // Rules butuh auth != null: tunggu login anonim app.js (authReady, maks. 5 dtk) sebelum membaca ortu_link.
    const tunggu = (typeof authReady !== 'undefined' && authReady && typeof authReady.then === 'function') ? authReady : Promise.resolve();
    tunggu.then(() => {
      let n = 0;
      const t = setInterval(() => {
        n++;
        const siap = typeof db !== 'undefined' && typeof bukaPortalOrtuForm === 'function' && typeof CryptoJS !== 'undefined' && document.getElementById('portalOrtuLogin');
        if (siap) {
          clearInterval(t);
          const dash = document.getElementById('portalOrtuDashboard');
          if (dash && dash.style.display !== 'none') return;   // sudah masuk
          bukaPortalOrtuForm();                                // -> ortuMasukOtomatis() membaca #masuk=
        } else if (n > 75) clearInterval(t);                   // menyerah setelah ~15 detik
      }, 200);
    });
  }

  // ---------- 2) Sisi Admin ----------
  let lmData = [];          // [{ wa, anak:[{nama,kelas}], jumlahLink, terakhir, punyaPin }]
  let lmSibuk = false;

  const esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const hashToken = tok => CryptoJS.SHA256(String(tok)).toString(CryptoJS.enc.Hex);
  const tokenBaru = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); };
  const tampilNomor = wa => '0' + String(wa).slice(2);
  const alamatDasar = () => location.origin + location.pathname.replace(/index\.html$/, '');
  const buatUrl = (wa, tok) => alamatDasar() + '?app=ortu#masuk=' + wa + '.' + tok;
  const buatPesan = (anak, url) => {
    const nama = anak.map(a => a.nama).filter(Boolean).join(' & ') || 'putra/putri Anda';
    return `Assalamu'alaikum Bapak/Ibu wali dari ${nama}.\n\nIni link masuk Portal Orang Tua SI MAMBA MI Mambaul Ulum. Cukup ketuk link di bawah, tanpa PIN:\n\n${url}\n\nSimpan pesan ini. Jika suatu saat keluar sendiri, ketuk link ini lagi. Mohon jangan dibagikan ke orang lain.\n\nTerima kasih.`;
  };
  function salin(teks) {
    const cadangan = () => { try { const ta = document.createElement('textarea'); ta.value = teks; ta.style.cssText = 'position:fixed;opacity:0;'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; } };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(teks).then(() => true).catch(() => cadangan());
    return Promise.resolve(cadangan());
  }

  // Rules ortu_akun & ortu_link TIDAK mengizinkan baca seluruh node (".read": false di atasnya), jadi dibaca per nomor WA
  // (hanya anak 'pin' dari ortu_akun, dan ortu_link/<wa>). Jumlah baca = 2 x jumlah nomor wali, semuanya kecil.
  async function lmMuat() {
    const sSiswa = await db.ref('siswa').once('value');
    const peta = {};
    sSiswa.forEach(c => {
      const x = c.val() || {};
      if (x.aktif === false) return;   // siswa nonaktif tidak perlu link
      const wa = x.noWaKey || (x.noWaOrtu && typeof ortuWaKey === 'function' ? ortuWaKey(x.noWaOrtu) : null);
      if (!wa) return;
      (peta[wa] = peta[wa] || { wa, anak: [], jumlahLink: 0, terakhir: null, punyaPin: false }).anak.push({ nama: x.name || '-', kelas: x.kelas || '' });
    });
    const nomor = Object.keys(peta);
    const info = document.getElementById('lmInfo');
    if (info) info.textContent = `⏳ Memeriksa ${nomor.length} nomor...`;
    const hasil = await Promise.all(nomor.map(wa => Promise.all([db.ref('ortu_link/' + wa).once('value'), db.ref('ortu_akun/' + wa + '/pin').once('value')])));
    nomor.forEach((wa, i) => {
      const v = hasil[i][0].val() ? Object.values(hasil[i][0].val()) : [];
      peta[wa].jumlahLink = v.length;
      peta[wa].terakhir = v.map(it => it && it.dibuat).filter(Boolean).sort().pop() || null;
      peta[wa].punyaPin = !!hasil[i][1].val();   // hanya cek ada/tidaknya PIN, isinya (hash) tidak dipakai
    });
    lmData = Object.values(peta).sort((a, b) => (a.anak[0].kelas || '').localeCompare(b.anak[0].kelas || '', 'id') || (a.anak[0].nama || '').localeCompare(b.anak[0].nama || '', 'id'));
  }

  function lmRender() {
    const box = document.getElementById('lmList'); if (!box) return;
    const q = (document.getElementById('lmCari').value || '').trim().toLowerCase();
    const kelas = document.getElementById('lmKelas').value, stPin = document.getElementById('lmPin').value;
    const rows = lmData.filter(r => (!kelas || r.anak.some(a => a.kelas === kelas)) && (!stPin || (stPin === 'ada') === !!r.punyaPin) &&
      (!q || r.wa.includes(q.replace(/^0/, '62')) || tampilNomor(r.wa).includes(q) || r.anak.some(a => (a.nama || '').toLowerCase().includes(q))));
    document.getElementById('lmInfo').textContent = `${rows.length} nomor · ${rows.filter(r => r.jumlahLink).length} sudah punya link · ${rows.filter(r => r.punyaPin).length} sudah punya PIN`;
    if (!rows.length) { box.innerHTML = '<p style="font-size:13px;color:#6b7280;padding:8px;">Tidak ada data.</p>'; return; }
    box.innerHTML = rows.map(r => {
      const nama = r.anak.map(a => `${esc(a.nama)} <span style="color:#6b7280;">(${esc(a.kelas || '-')})</span>`).join('<br>');
      const lencana = r.jumlahLink
        ? `<span class="po-badge ok" style="font-size:11px;padding:2px 8px;border-radius:999px;background:#d1fae5;color:#047857;">✔ ada link${r.jumlahLink > 1 ? ' (' + r.jumlahLink + ')' : ''}</span>`
        : '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#f1f5f9;color:#475569;">belum</span>';
      const lencanaPin = r.punyaPin
        ? '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#dbeafe;color:#1d4ed8;">🔑 sudah punya PIN</span>'
        : '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#fef3c7;color:#b45309;">belum ada PIN</span>';
      return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin-bottom:8px;background:#fff;">
        <div style="font-size:13px;font-weight:600;line-height:1.4;">${nama}</div>
        <div style="font-size:12px;color:#6b7280;margin:2px 0 8px;">${esc(tampilNomor(r.wa))} &nbsp;${lencanaPin} ${lencana}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <button class="btn btn-primary" style="padding:6px 12px;font-size:12px;" onclick="lmKirim('${r.wa}')">📲 Kirim lewat WA</button>
          <button class="btn btn-soft" style="padding:6px 12px;font-size:12px;" onclick="lmSalin('${r.wa}')">📋 Salin pesan</button>
          ${r.jumlahLink ? `<button class="btn btn-soft" style="padding:6px 12px;font-size:12px;color:#b91c1c;" onclick="lmCabut('${r.wa}')">🚫 Cabut</button>` : ''}
        </div></div>`;
    }).join('');
  }

  // Buat token baru (link lama TETAP berlaku, jadi mengirim ulang tidak mengeluarkan orang tua yang sudah masuk).
  async function lmBuat(wa) {
    const tok = tokenBaru();
    await db.ref('ortu_link/' + wa + '/' + hashToken(tok)).set({ dibuat: new Date().toISOString() });
    const r = lmData.find(x => x.wa === wa);
    if (r) { r.jumlahLink++; r.terakhir = new Date().toISOString(); }
    return { url: buatUrl(wa, tok), anak: r ? r.anak : [] };
  }

  window.lmKirim = async function (wa) {
    if (lmSibuk) return; lmSibuk = true;
    const w = window.open('', '_blank');   // dibuka dulu (sinkron) supaya tidak diblokir popup-blocker
    try {
      const { url, anak } = await lmBuat(wa);
      const pesan = buatPesan(anak, url);
      const tujuan = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(pesan);
      if (w) w.location.href = tujuan; else { await salin(pesan); toast('Popup diblokir. Pesan sudah disalin, tempel manual di WhatsApp.'); }
      lmRender();
    } catch (e) { if (w) w.close(); toast('❌ Gagal membuat link: ' + ((e && e.message) || e), true); }
    finally { lmSibuk = false; }
  };
  window.lmSalin = async function (wa) {
    if (lmSibuk) return; lmSibuk = true;
    try {
      const { url, anak } = await lmBuat(wa);
      const ok = await salin(buatPesan(anak, url));
      toast(ok ? '✅ Pesan + link disalin. Tempel di WhatsApp.' : '⚠️ Gagal menyalin otomatis.', !ok);
      lmRender();
    } catch (e) { toast('❌ Gagal membuat link: ' + ((e && e.message) || e), true); }
    finally { lmSibuk = false; }
  };
  window.lmCabut = async function (wa) {
    if (!confirm('Cabut SEMUA link untuk nomor ' + tampilNomor(wa) + '?\n\nHP orang tua yang masuk lewat link akan keluar sendiri saat portal dibuka lagi. Mereka bisa diberi link baru.')) return;
    try {
      await db.ref('ortu_link/' + wa).remove();
      const r = lmData.find(x => x.wa === wa); if (r) { r.jumlahLink = 0; r.terakhir = null; }
      toast('✅ Link dicabut.'); lmRender();
    } catch (e) { toast('❌ Gagal mencabut: ' + ((e && e.message) || e), true); }
  };

  window.tutupLinkMasukOrtu = function () { const m = document.getElementById('linkOrtuModal'); if (m) m.remove(); };

  window.bukaLinkMasukOrtu = async function () {
    if (typeof isAdmin === 'function' && !isAdmin()) { toast('Hanya Admin!', true); return; }
    if (!navigator.onLine) { toast('📡 Butuh koneksi internet.', true); return; }
    tutupLinkMasukOrtu();
    const m = document.createElement('div');
    m.id = 'linkOrtuModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = `<div style="background:#f9fafb;width:100%;max-width:620px;max-height:92vh;border-radius:18px 18px 0 0;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:14px 16px 8px;display:flex;align-items:center;gap:8px;">
        <h3 style="flex:1;font-size:16px;font-weight:800;margin:0;">🔗 Link Masuk Portal Orang Tua</h3>
        <button class="btn btn-soft" style="padding:4px 12px;" onclick="tutupLinkMasukOrtu()">✕</button>
      </div>
      <p style="font-size:12px;color:#6b7280;margin:0 16px 10px;line-height:1.5;">Kirim link pribadi lewat WhatsApp. Orang tua cukup mengetuk link: langsung masuk, tanpa PIN, dan HP-nya mengingat. Tombol <b>Kirim lewat WA</b> membuka WhatsApp dengan pesan siap kirim; Anda tinggal menekan kirim.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 8px;">
        <input id="lmCari" class="field" style="flex:1;min-width:150px;" placeholder="Cari nama anak / nomor..." oninput="window.lmRenderUlang()">
        <select id="lmKelas" class="field" style="width:auto;" onchange="window.lmRenderUlang()"><option value="">Semua kelas</option></select>
        <select id="lmPin" class="field" style="width:auto;" onchange="window.lmRenderUlang()"><option value="">Semua status</option><option value="belum">Belum ada PIN</option><option value="ada">Sudah punya PIN</option></select>
      </div>
      <div id="lmInfo" style="font-size:12px;color:#6b7280;padding:0 16px 6px;">⏳ Memuat data...</div>
      <div id="lmList" style="padding:0 16px 16px;overflow-y:auto;flex:1;"></div></div>`;
    m.addEventListener('click', e => { if (e.target === m) tutupLinkMasukOrtu(); });
    document.body.appendChild(m);
    try {
      await lmMuat();
      const kls = Array.from(new Set(lmData.flatMap(r => r.anak.map(a => a.kelas)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
      document.getElementById('lmKelas').innerHTML = '<option value="">Semua kelas</option>' + kls.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join('');
      lmRender();
    } catch (e) {
      document.getElementById('lmInfo').textContent = '❌ Gagal memuat: ' + ((e && e.message) || e);
    }
  };
  window.lmRenderUlang = lmRender;
})();
