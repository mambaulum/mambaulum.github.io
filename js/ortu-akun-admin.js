// ============================================================
// ortu-akun-admin.js -- AKUN PORTAL ORANG TUA SISI ADMIN (dipecah dari app.js, tahap 6)
// ============================================================
// Isi: daftar akun portal + Reset PIN (Admin), dan cek/reset PIN orang tua dari form Edit Siswa.
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat.
// TETAP di app.js: ortuEl(), ortuWaKey() (dipakai juga oleh form edit siswa dan portal-ortu.js).
// ============================================================

    // ---------- Sesi Admin (Rules Tahap B) ----------
    // ortu_akun hanya terbaca/terhapus oleh Admin yang membawa sesi_admin. kredAdminSiap() (kredensial.js) meminta Kunci Admin
    // sekali per perangkat. diam=true untuk proses OTOMATIS saat halaman dibuka: tidak memunculkan prompt bila Kunci belum
    // tersimpan (daftar lalu menampilkan tombol "Masukkan Kunci Admin"). Aksi yang diketuk Admin (Reset PIN) memakai diam=false.
    function ortuAdminSiap(diam) {
      try {
        if (typeof window.kredAdminSiap !== 'function') return Promise.resolve(true);
        if (diam && !(typeof adminKunciTersimpan === 'function' && adminKunciTersimpan())) return Promise.resolve(true);
        return window.kredAdminSiap();
      } catch (e) { return Promise.resolve(true); }
    }
    function ortuDitolakRules(err) { return !!err && (err.code === 'PERMISSION_DENIED' || /permission_denied/i.test(String(err.message || err))); }
    function ortuAkunIsiKunci() {
      if (typeof window.kredAdminSiap !== 'function') return;
      window.kredAdminSiap(true).then(() => renderOrtuAkunAdmin()).catch(e => toast('❌ ' + ((e && e.message) || 'Kunci Admin gagal'), true));
    }
    // ---------- Admin: daftar akun portal + Reset PIN ----------
    let ortuAkunCache = [], ortuAkunMuatToken = 0;
    function renderOrtuAkunAdmin() {
      const card = ortuEl('ortuAkunCard'); if (!card) return;
      card.style.display = isAdmin() ? 'block' : 'none';
      if (!isAdmin()) return;
      const list = ortuEl('ortuAkunList');
      list.innerHTML = '<p class="text-muted" style="font-size:13px;">Memuat akun...</p>';
      // Rules melarang membaca seluruh /ortu_akun (".read": false, melindungi PIN), hanya per nomor. Jadi daftar dibangun dari
      // nomor WA orang tua pada data siswa, lalu tiap nomor dibaca satu per satu (25 sekaligus).
      const keys = Array.from(new Set((allSiswa || []).map(x => x.noWaOrtu ? ortuWaKey(x.noWaOrtu) : null).filter(Boolean)));
      const hasil = [];
      let i = 0;
      const token = ++ortuAkunMuatToken;   // pemuatan yang lebih baru membatalkan yang lama (mis. setelah Reset PIN)
      const batch = () => {
        if (token !== ortuAkunMuatToken || i >= keys.length) return Promise.resolve();
        const potong = keys.slice(i, i + 25); i += 25;
        list.innerHTML = '<p class="text-muted" style="font-size:13px;">Memuat akun... (' + Math.min(i, keys.length) + '/' + keys.length + ')</p>';
        return Promise.all(potong.map(k => db.ref('ortu_akun/' + k).once('value').then(sn => { const v = sn.val(); if (v) hasil.push({ ...v, wa: k }); }))).then(batch);
      };
      ortuAdminSiap(true).then(batch).then(() => {
        if (token !== ortuAkunMuatToken) return;
        ortuAkunCache = hasil;
        renderOrtuAkunList();
      }).catch(err => {
        if (token !== ortuAkunMuatToken) return;
        list.innerHTML = ortuDitolakRules(err)
          ? `<p style="font-size:13px;">🔑 Daftar akun hanya bisa dibuka Admin yang membawa Kunci Admin di perangkat ini. <button class="btn btn-soft" type="button" style="padding:6px 12px;font-size:12px;" onclick="ortuAkunIsiKunci()">Masukkan Kunci Admin</button></p>`
          : `<p style="color:#dc2626;font-size:13px;">Gagal memuat: ${escapeHtml(err.message)}</p>`;
      });
    }
    function renderOrtuAkunList() {
      const list = ortuEl('ortuAkunList'); if (!list) return;
      const q = ((ortuEl('ortuAkunCari') || {}).value || '').trim().toLowerCase();
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
      ortuAdminSiap(false).then(() => db.ref('ortu_akun/' + waKey).remove()).then(() => {
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
      if (!btn || !st) return;
      box.style.display = isAdmin() ? 'block' : 'none';
      btn.style.display = 'none';
      if (!isAdmin()) return;
      const waKey = siswa && siswa.noWaOrtu ? ortuWaKey(siswa.noWaOrtu) : null;
      if (!waKey) { st.textContent = 'Belum ada nomor WA yang valid tersimpan. Isi nomor WA lalu simpan; orang tua baru bisa membuat PIN setelah itu.'; return; }
      const token = ++editSiswaPinToken;
      st.textContent = 'Memeriksa...';
      ortuAdminSiap(true).then(() => db.ref('ortu_akun/' + waKey).once('value')).then(snap => {
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
      }).catch(err => { if (token === editSiswaPinToken) st.textContent = ortuDitolakRules(err) ? 'Status PIN tidak bisa dibaca: Kunci Admin belum diisi di perangkat ini. Isi lewat kartu Akun Portal Orang Tua di halaman Admin (tombol Masukkan Kunci Admin).' : 'Gagal memeriksa: ' + err.message; });
    }
    function resetPinOrtuDariEditSiswa() {
      if (!editSiswaPinWaKey) return;
      const siswa = allSiswa.find(x => x.key === editingSiswaKey);
      resetPinOrtu(editSiswaPinWaKey, () => editSiswaCekPinOrtu(siswa));
    }

