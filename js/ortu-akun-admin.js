// ============================================================
// ortu-akun-admin.js -- AKUN PORTAL ORANG TUA SISI ADMIN (dipecah dari app.js, tahap 6)
// ============================================================
// Isi: daftar akun portal + Reset PIN (Admin), dan cek/reset PIN orang tua dari form Edit Siswa.
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat.
// TETAP di app.js: ortuEl(), ortuWaKey() (dipakai juga oleh form edit siswa dan portal-ortu.js).
// ============================================================

    // ---------- Admin: daftar akun portal + Reset PIN ----------
    let ortuAkunCache = [];
    function renderOrtuAkunAdmin() {
      const card = ortuEl('ortuAkunCard'); if (!card) return;
      card.style.display = isAdmin() ? 'block' : 'none';
      if (!isAdmin()) return;
      const list = ortuEl('ortuAkunList');
      list.innerHTML = '<p class="text-muted" style="font-size:13px;">Memuat akun...</p>';
      db.ref('ortu_akun').once('value').then(snap => {
        ortuAkunCache = []; snap.forEach(c => { ortuAkunCache.push({ wa: c.key, ...(c.val() || {}) }); });
        renderOrtuAkunList();
      }).catch(err => { list.innerHTML = `<p style="color:#dc2626;font-size:13px;">Gagal memuat: ${escapeHtml(err.message)}</p>`; });
    }
    function renderOrtuAkunList() {
      const list = ortuEl('ortuAkunList'); if (!list) return;
      const q = (ortuEl('ortuAkunCari').value || '').trim().toLowerCase();
      const qDigit = q.replace(/[^0-9]/g, '');
      const fmtTgl = iso => iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
      const rows = ortuAkunCache.map(a => ({ ...a, anak: (allSiswa || []).filter(x => x.noWaOrtu && formatNomorWa(x.noWaOrtu) === a.wa) }))
        .filter(a => !q || a.anak.some(x => (x.name || '').toLowerCase().includes(q)) || (qDigit && (a.wa.includes(qDigit) || a.wa.includes('62' + qDigit.replace(/^0/, '')))))
        .sort((x, y) => COLLATOR_ID.compare((x.anak[0] ? x.anak[0].name : 'zzz'), y.anak[0] ? y.anak[0].name : 'zzz'));
      if (!rows.length) { list.innerHTML = `<p class="text-muted" style="font-size:13px;">${ortuAkunCache.length ? 'Tidak ada yang cocok.' : 'Belum ada orang tua yang membuat PIN.'}</p>`; return; }
      list.innerHTML = rows.map(a => {
        const nama = a.anak.length ? a.anak.map(x => x.name).join(', ') : '(nama siswa tidak ditemukan)';
        const terkunci = a.kunciSampai && a.kunciSampai > Date.now() ? ' • <span style="color:#dc2626;font-weight:600;">🔒 terkunci</span>' : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;flex-wrap:wrap;">
          <div style="min-width:0;"><div style="font-weight:600;font-size:14px;">${escapeHtml(nama)}</div>
          <div class="text-muted" style="font-size:12px;">📱 0${escapeHtml(a.wa.slice(2))} • PIN dibuat ${escapeHtml(fmtTgl(a.dibuat))} • login terakhir ${escapeHtml(fmtTgl(a.terakhirLogin))}${terkunci}</div></div>
          <button class="btn btn-warning" style="padding:6px 12px;font-size:12px;" data-wa="${escapeHtml(a.wa)}" onclick="resetPinOrtu(this.dataset.wa)">🔄 Reset PIN</button></div>`;
      }).join('');
    }
    function resetPinOrtu(waKey, onDone) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!/^62[0-9]{8,13}$/.test(waKey || '')) return toast('Nomor tidak valid!', true);
      const tampil = '0' + waKey.slice(2);
      if (!confirm(`Reset PIN Portal Orang Tua untuk nomor ${tampil}?\n\nPIN lama dihapus. Orang tua harus membuat PIN baru lewat "Belum punya PIN? Buat PIN" di Portal Orang Tua.`)) return;
      db.ref('ortu_akun/' + waKey).remove().then(() => {
        toast('✅ PIN direset. Minta orang tua membuat PIN baru.');
        addLog('reset_pin_ortu', tampil);
        if (typeof onDone === 'function') onDone(); else renderOrtuAkunAdmin();
      }).catch(err => toast('Gagal reset: ' + err.message, true));
    }
    // ---------- Edit Siswa: status & Reset PIN portal orang tua ----------
    let editSiswaPinWaKey = null, editSiswaPinToken = 0;
    function editSiswaCekPinOrtu(siswa) {
      const box = ortuEl('editSiswaPinBox'); if (!box) return;
      editSiswaPinWaKey = null;
      const btn = ortuEl('editSiswaPinResetBtn'), st = ortuEl('editSiswaPinStatus');
      box.style.display = isAdmin() ? 'block' : 'none';
      btn.style.display = 'none';
      if (!isAdmin()) return;
      const waKey = siswa && siswa.noWaOrtu ? ortuWaKey(siswa.noWaOrtu) : null;
      if (!waKey) { st.textContent = 'Belum ada nomor WA yang valid tersimpan. Isi nomor WA lalu simpan; orang tua baru bisa membuat PIN setelah itu.'; return; }
      const token = ++editSiswaPinToken;
      st.textContent = 'Memeriksa...';
      db.ref('ortu_akun/' + waKey).once('value').then(snap => {
        if (token !== editSiswaPinToken) return;
        const akun = snap.val();
        const sekawan = (allSiswa || []).filter(x => x.noWaOrtu && formatNomorWa(x.noWaOrtu) === waKey);
        const info = sekawan.length > 1 ? ` Nomor ini dipakai ${sekawan.length} anak (${sekawan.map(x => x.name).join(', ')}); reset berlaku untuk semuanya.` : '';
        if (akun && akun.pin) {
          editSiswaPinWaKey = waKey; btn.style.display = 'inline-block';
          const tgl = akun.dibuat ? new Date(akun.dibuat).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
          st.textContent = `✅ Sudah dibuat (${tgl}).${akun.kunciSampai && akun.kunciSampai > Date.now() ? ' 🔒 Sedang terkunci.' : ''}${info} Status berdasarkan nomor yang tersimpan.`;
        } else {
          st.textContent = `Belum dibuat. Orang tua membuatnya sendiri lewat "Belum punya PIN? Buat PIN" di Portal Orang Tua.${info}`;
        }
      }).catch(err => { if (token === editSiswaPinToken) st.textContent = 'Gagal memeriksa: ' + err.message; });
    }
    function resetPinOrtuDariEditSiswa() {
      if (!editSiswaPinWaKey) return;
      const siswa = allSiswa.find(x => x.key === editingSiswaKey);
      resetPinOrtu(editSiswaPinWaKey, () => editSiswaCekPinOrtu(siswa));
    }

