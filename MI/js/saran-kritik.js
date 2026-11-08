// ============================================================
// saran-kritik.js -- SARAN & KRITIK dari Portal Orang Tua (Admin/Kepsek) (dipecah dari app.js, tahap 6)
// ============================================================
// Isi: daftar saran/kritik, tandai dibaca, hapus, titik notifikasi menu.
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat.
// ============================================================

    // ============================================================
    // SARAN & KRITIK (dari Portal Orang Tua) -- khusus Admin/Kepsek
    // ============================================================
    function saranKritikCanAccess() { return isAdmin() || isKepsek(); }
    function setupSaranKritikPage() {
      if (!saranKritikCanAccess()) { document.getElementById('saranKritikListArea').innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin & Kepsek.</p>'; return; }
      renderSaranKritikList();
    }
    function updateSaranKritikNotifDot() {
      const dot = document.getElementById('saranKritikNotifDot');
      if (!dot) return;
      const adaBaru = allSaranKritik.some(s => s.status === 'baru');
      dot.classList.toggle('show', adaBaru);
    }
    function renderSaranKritikList() {
      const box = document.getElementById('saranKritikListArea'); if (!box) return;
      const items = [...allSaranKritik].sort((a,b) => COLLATOR_ID.compare((b.waktuKirim||''), a.waktuKirim||''));
      updateSaranKritikNotifDot();
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada saran/kritik masuk.</p>'; return; }
      box.innerHTML = items.map(s => `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;${s.status==='baru'?'background:#fffbeb;':''}">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
            <div>
              <span style="font-size:13px;font-weight:600;">${s.anonim ? '🕶️ Anonim' : escapeHtml(s.siswaNama||'-') + ' (Kelas ' + escapeHtml(s.kelas||'-') + ')'}</span>
              ${s.status==='baru' ? '<span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;margin-left:6px;">BARU</span>' : ''}
              <div class="text-muted" style="font-size:11px;">${escapeHtml((s.waktuKirim||'').slice(0,16).replace('T',' '))}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              ${s.status==='baru' ? `<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;" onclick="tandaDibacaSaranKritik('${s.key}')">✓ Tandai dibaca</button>` : ''}
              ${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusSaranKritik('${s.key}')">🗑️</button>` : ''}
            </div>
          </div>
          <div style="font-size:13px;margin-top:6px;">${escapeHtml(s.pesan)}</div>
        </div>`).join('');
    }
    function tandaDibacaSaranKritik(key) {
      if (!saranKritikCanAccess()) return;
      db.ref('saran_kritik/'+key).update({ status: 'dibaca' }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        const item = allSaranKritik.find(s => s.key === key); if (item) item.status = 'dibaca';
        renderSaranKritikList();
      });
    }
    function hapusSaranKritik(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus saran/kritik ini?')) return;
      db.ref('saran_kritik/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Dihapus.'); addLog('hapus_saran_kritik', key);
        allSaranKritik = allSaranKritik.filter(s => s.key !== key);
        renderSaranKritikList();
      });
    }

