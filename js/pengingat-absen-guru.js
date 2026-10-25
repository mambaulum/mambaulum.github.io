// ============================================================
// pengingat-absen-guru.js -- ABSEN GURU HARI INI (Admin) & PENGINGAT BELUM ABSEN (dipecah dari app.js, tahap 4)
// ============================================================
// Isi: tabel absen guru untuk Admin (renderAdminTeacherAttendance), pengingat otomatis & massal,
// daftar Belum Absen, kirimIngatkan, dan pemantau pengingat milik guru (watchMyReminders).
// Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat.
// TETAP di app.js: sudahAbsenTipeIni(), getJamAbsenWindow(), autoMarkAlphaGuru(), verifyAndAbsen(), renderTeacherAttendance().
// ============================================================

    function renderAdminTeacherAttendance() {
      const list = document.getElementById('adminTeacherAttendanceList');
      const summary = document.getElementById('adminTeacherAttendanceSummary');
      if (!list) return;
      if (!isAdmin() && !isKepsek()) return;
      const today = tglLokal();
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      if (guruAktif.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada data guru.</p>'; return; }

      let html = '';
      let sudahHadir = 0, belumHadir = 0;

      guruAktif.forEach(g => {
        const absenHariIni = allTeacherAttendance.find(a => a.tanggal === today && (a.guruKey ? a.guruKey === g.key : a.guru === g.name));
        if (absenHariIni) {
          sudahHadir++;
          const type = absenHariIni.type || 'Datang';
          const waktu = absenHariIni.waktu ? new Date(absenHariIni.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          const metode = absenHariIni.metode === 'qr_lokasi' ? '📍 QR+Lokasi' : (absenHariIni.metode === 'kamera_validasi' ? '📸 Kamera' : (absenHariIni.metode === 'otomatis_sistem' ? '🤖 Otomatis' : '📝 Manual'));
          const telat = absenHariIni.keterangan ? ` <span style="color:#dc2626;">⚠️ ${escapeHtml(absenHariIni.keterangan)}</span>` : '';
          const bg = type === 'Izin' || type === 'Sakit' ? '#fef3c7' : (absenHariIni.keterangan ? '#fee2e2' : '#f0fdf4');
          const border = type === 'Izin' || type === 'Sakit' ? '#d97706' : (absenHariIni.keterangan ? '#dc2626' : '#059669');
          const icon = type === 'Izin' ? '📝' : (type === 'Sakit' ? '🤒' : (absenHariIni.keterangan ? '⚠️' : '✅'));
          html += `<div style="padding:8px 12px;background:${bg};border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid ${border};"><span>${icon} ${escapeHtml(g.name)}</span><span style="color:#065f46;font-weight:600;">${escapeHtml(type)} ${escapeHtml(waktu)} ${escapeHtml(metode)}${telat}</span></div>`;
        } else {
          belumHadir++;
          html += `<div style="padding:8px 12px;background:#fee2f2;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid #dc2626;"><span>👤 ${escapeHtml(g.name)}</span><span style="color:#991b1b;font-weight:600;">❌ Belum Absen</span></div>`;
        }
      });

      list.innerHTML = html;
      if (summary) {
        summary.innerHTML = `
          <span style="background:#f0fdf4;padding:4px 12px;border-radius:20px;color:#065f46;font-weight:600;">✅ Hadir: ${sudahHadir}</span>
          <span style="background:#fee2f2;padding:4px 12px;border-radius:20px;color:#991b1b;font-weight:600;">❌ Belum: ${belumHadir}</span>
          <span class="text-strong" style="background:#f3f4f6;padding:4px 12px;border-radius:20px;font-weight:600;">📊 Total: ${guruAktif.length}</span>
        `;
      }
    }

    // ============================================================
    // PENGINGAT OTOMATIS DARI SISTEM (dipicu oleh sesi siapa pun yang
    // sedang membuka aplikasi setelah jendela Datang/Pulang tutup).
    // Pakai Firebase transaction supaya hanya terkirim SEKALI per hari
    // per jenis, meski ada beberapa orang buka app di jam yang sama.
    // ============================================================
    const SISTEM_OTOMATIS_LABEL = '🤖 Sistem Otomatis';
    function cekDanKirimPengingatOtomatis() {
      if (!currentUser) return;
      const now = new Date(), sekarangMenit = now.getHours() * 60 + now.getMinutes();
      const today = tglLokal(now);
      ['Datang', 'Pulang'].forEach(jenis => {
        const window_ = getJamAbsenWindow(jenis);
        const selesai = window_.selesai.split(':');
        const bufferMenit = parseInt(selesai[0]) * 60 + parseInt(selesai[1]) + 5;
        if (sekarangMenit < bufferMenit) return;
        const markerRef = db.ref('auto_reminder_sent/' + today + '/' + jenis);
        markerRef.transaction(current => {
          if (current) return; // batalkan, sudah pernah dikirim hari ini
          return { sentAt: new Date().toISOString(), sentBy: currentUser.name };
        }, (err, committed) => {
          if (err || !committed) return; // gagal, atau kalah cepat dari sesi lain
          kirimPengingatMassal(jenis);
        });
      });
    }
    function kirimPengingatMassal(jenis) {
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      const today = tglLokal();
      guruAktif.forEach(g => {
        const recs = allTeacherAttendanceToday.filter(a => (a.guruKey ? a.guruKey === g.key : a.guru === g.name));
        if (recs.find(a => a.type === 'Izin' || a.type === 'Sakit')) return;
        if (recs.find(a => a.type === jenis)) return;
        const ref = db.ref('reminders/' + today).push();
        ref.set({ to: g.name, toKey: g.key || null, from: SISTEM_OTOMATIS_LABEL, jenis: jenis, otomatis: true, createdAt: new Date().toISOString() });
      });
    }
    function renderBelumAbsen() {
      const section = document.getElementById('belumAbsenSection'), list = document.getElementById('belumAbsenList');
      if (!section || !list || !currentUser) return;
      // Info level-sekolah (semua guru) -- disembunyikan total untuk guru biasa, pola yang sama
      // dengan cek role di renderLogs().
      if (!isAdmin() && !isKepsek()) { section.style.display = 'none'; return; }
      const guruAktif = (allGuru || []).filter(g => g.role === 'guru' || g.role === 'wali_kelas');
      if (guruAktif.length === 0) { section.style.display = 'none'; return; }

      section.style.display = 'block';
      const now = new Date(), sekarangMenit = now.getHours() * 60 + now.getMinutes();
      const winPulang = getJamAbsenWindow('Pulang');
      const pulangMulai = winPulang.mulai.split(':'), pulangMulaiMenit = parseInt(pulangMulai[0]) * 60 + parseInt(pulangMulai[1]);
      const sudahMasukJamPulang = sekarangMenit >= pulangMulaiMenit;

      let html = '';
      let selesai = 0, prosesBelumPulang = 0, belumDatang = 0;

      guruAktif.forEach(g => {
        const recs = allTeacherAttendanceToday.filter(a => (a.guruKey ? a.guruKey === g.key : a.guru === g.name));
        const izinSakit = recs.find(a => a.type === 'Izin' || a.type === 'Sakit');
        if (izinSakit) {
          selesai++;
          const waktu = izinSakit.waktu ? new Date(izinSakit.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          const icon = izinSakit.type === 'Izin' ? '📝' : '🤒';
          html += `<div style="padding:8px 12px;background:#fef3c7;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid #d97706;"><span>${icon} ${escapeHtml(g.name)}</span><span style="color:#92400e;font-weight:600;">${escapeHtml(izinSakit.type)} ${escapeHtml(waktu)}</span></div>`;
          return;
        }
        const datangRec = recs.find(a => a.type === 'Datang');
        const pulangRec = recs.find(a => a.type === 'Pulang');
        const isSelf = g.key === currentUser.key;
        let statusDatang, statusPulang;
        if (datangRec) {
          const waktu = datangRec.waktu ? new Date(datangRec.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          statusDatang = `<span style="color:#065f46;">✅ Datang ${escapeHtml(waktu)}</span>`;
        } else {
          const tombol = isSelf ? '' : ` <button class="btn btn-soft" style="padding:1px 8px;font-size:11px;" onclick="kirimIngatkan('${escapeJs(g.name)}','${escapeJs(g.key||'')}','Datang')">🔔</button>`;
          statusDatang = `<span style="color:#991b1b;">❌ Datang</span>${tombol}`;
        }
        if (pulangRec) {
          const waktu = pulangRec.waktu ? new Date(pulangRec.waktu).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : '-';
          statusPulang = `<span style="color:#065f46;">✅ Pulang ${escapeHtml(waktu)}</span>`;
        } else if (sudahMasukJamPulang) {
          const tombol = isSelf ? '' : ` <button class="btn btn-soft" style="padding:1px 8px;font-size:11px;" onclick="kirimIngatkan('${escapeJs(g.name)}','${escapeJs(g.key||'')}','Pulang')">🔔</button>`;
          statusPulang = `<span style="color:#991b1b;">❌ Pulang</span>${tombol}`;
        } else {
          statusPulang = `<span class="text-muted">⏳ Pulang</span>`;
        }
        const lengkap = datangRec && pulangRec;
        if (lengkap) selesai++; else if (datangRec) prosesBelumPulang++; else belumDatang++;
        const bg = lengkap ? '#f0fdf4' : '#fee2f2';
        const border = lengkap ? '#059669' : '#dc2626';
        html += `<div style="padding:8px 12px;background:${bg};border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;border-left:4px solid ${border};flex-wrap:wrap;gap:4px;"><span>👤 ${escapeHtml(g.name)}</span><span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">${statusDatang}${statusPulang}</span></div>`;
      });

      const ringkasan = `<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;font-size:12px;">
        <span style="background:#f0fdf4;padding:4px 12px;border-radius:20px;color:#065f46;font-weight:600;">✅ Selesai: ${selesai}</span>
        <span style="background:#fef3c7;padding:4px 12px;border-radius:20px;color:#92400e;font-weight:600;">🕒 Blm Pulang: ${prosesBelumPulang}</span>
        <span style="background:#fee2f2;padding:4px 12px;border-radius:20px;color:#991b1b;font-weight:600;">❌ Blm Datang: ${belumDatang}</span>
        <span class="text-strong" style="background:#f3f4f6;padding:4px 12px;border-radius:20px;font-weight:600;">📊 Total: ${guruAktif.length}</span>
      </div>`;

      list.innerHTML = ringkasan + html;
    }
    function kirimIngatkan(namaGuru, guruKeyTarget, jenis) {
      if (!currentUser) return;
      // Cek "diri sendiri" pakai key kalau tersedia (nama bisa duplikat/berubah) -- fallback nama untuk data lama.
      const isTargetSelf = guruKeyTarget ? guruKeyTarget === currentUser.key : namaGuru === currentUser.name;
      if (isTargetSelf) return;
      jenis = jenis === 'Pulang' ? 'Pulang' : 'Datang';
      const today = tglLokal();
      const ref = db.ref('reminders/' + today).push();
      ref.set({ to: namaGuru, toKey: guruKeyTarget || null, from: currentUser.name, guruKey: currentUser.key || null, jenis: jenis, createdAt: new Date().toISOString() }, err => {
        if (err) toast('❌ Gagal mengirim pengingat: ' + err.message, true);
        else { toast(`🔔 Pengingat absen ${jenis} terkirim ke ${namaGuru}!`); addLog('kirim_pengingat_absen', namaGuru + ' - ' + jenis); }
      });
    }
    let remindersWatchAttached = false;
    let remindersListenerRef = null;
    // Tanggal (WIB) saat listener reminders terakhir dipasang -- lihat refreshRemindersWatchIfDayChanged().
    let remindersWatchDate = null;
    function watchMyReminders() {
      if (remindersWatchAttached || !currentUser) return;
      remindersWatchAttached = true;
      const today = tglLokal();
      remindersWatchDate = today;
      const remindersQuery = (currentUser.key && currentUser.key !== ADMIN_USER_KEY && currentUser.key !== KEPSEK_USER_KEY) ? db.ref('reminders/' + today).orderByChild('toKey').equalTo(currentUser.key) : db.ref('reminders/' + today).orderByChild('to').equalTo(currentUser.name);
      remindersListenerRef = remindersQuery;
      remindersQuery.on('child_added', snap => {
        const val = snap.val();
        if (!val || !val.from) return;
        const jenis = val.jenis || 'Datang';
        const msg = val.otomatis ? `🔔 Sistem mengingatkan: Anda belum absen ${jenis} hari ini!` : `🔔 ${val.from} mengingatkan Anda untuk segera absen ${jenis} hari ini!`;
        toast(msg, false, 6000);
      });
    }
    // FIX: watchMyReminders() cuma dipanggil SEKALI saat login (query-nya terikat ke tanggal
    // hari itu, mis. reminders/2026-09-28). Kalau sesi dibiarkan terbuka melewati tengah malam,
    // listener lama diam-diam terus memantau node tanggal KEMARIN -- pengingat baru yang ditulis
    // ke node hari ini tidak akan pernah memicu toast, tanpa ada error yang terlihat. Dipanggil
    // dari startReminderScheduler() (sudah jalan tiap 2 menit) supaya begitu tanggal WIB berganti,
    // listener lama di-off() lalu dipasang ulang untuk tanggal baru.
    function refreshRemindersWatchIfDayChanged() {
      if (!currentUser || !remindersWatchAttached) return;
      const today = tglLokal();
      if (remindersWatchDate === today) return;
      if (remindersListenerRef) { remindersListenerRef.off(); remindersListenerRef = null; }
      remindersWatchAttached = false;
      watchMyReminders();
    }

