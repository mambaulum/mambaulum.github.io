// ============================================================
// event-ujian.js -- EVENT/KEGIATAN & UJIAN: admin form, daftar, check-in kamera (dipecah dari app.js, tahap 4)
// ============================================================
// Isi: Event (buat/ubah/hapus, daftar, daftar hadir, check-in guru) dan Ujian/Assesmen (buat/ubah/hapus,
// daftar, check-in pengawas). Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat.
// TETAP di app.js: scanner QR absen guru (startCamera, v4TickQrScan, v4HandleQrDetected, stopCamera),
// releaseCameraResources(), verifyAndAbsen(), autoMarkAlphaGuru().
// ============================================================

    // ============================================================
    // LEMBUR & RAPAT (acara di luar jam pelajaran, ada honornya)
    // ============================================================
    function renderEventAdminForm() {
      const card = document.getElementById('eventAdminFormCard');
      if (!card) return;
      card.style.display = isAdmin() ? 'block' : 'none';
      // Isi otomatis default "Honor Kegiatan/sesi" dari ⚙️ Tarif Honor Terpusat, kalau field masih kosong & bukan mode edit.
      const honorInput = document.getElementById('eventHonor'), editKeyInput = document.getElementById('eventEditKey');
      if (isAdmin() && honorInput && editKeyInput && !editKeyInput.value && !honorInput.value && V4.rates && V4.rates.activity) honorInput.value = V4.rates.activity;
    }
    function submitEvent() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('submitEvent')) return toast('Sedang menyimpan...', false, 1500);
      const nama = document.getElementById('eventNama').value.trim();
      const jenis = document.getElementById('eventJenis').value;
      const tanggal = document.getElementById('eventTanggal').value;
      const jamMulai = document.getElementById('eventJamMulai').value;
      const jamSelesai = document.getElementById('eventJamSelesai').value;
      const honor = parseInt(document.getElementById('eventHonor').value) || 0;
      const editKey = document.getElementById('eventEditKey').value;
      if (!nama || !tanggal || !jamMulai || !jamSelesai) return toast('Lengkapi semua data!', true);
      if (honor <= 0) return toast('Honor harus lebih dari 0!', true);
      const data = { nama, jenis, tanggal, jamMulai, jamSelesai, honor, tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() };
      const ref = editKey ? db.ref('events/' + editKey) : db.ref('events').push();
      if (!editKey) { data.createdBy = currentUser.name; data.guruKey = currentUser.key || null; data.createdAt = new Date().toISOString(); }
      const btnSubmitEvent = document.getElementById('btnSubmitEvent');
      setBusy('submitEvent', btnSubmitEvent);
      ref.update(data, err => {
        clearBusy('submitEvent', btnSubmitEvent);
        if (err) return toast('Gagal: ' + err.message, true);
        toast(editKey ? '✅ Acara diperbarui!' : '✅ Acara dibuat!');
        addLog(editKey ? 'edit_event' : 'buat_event', nama);
        document.getElementById('eventNama').value = ''; document.getElementById('eventTanggal').value = ''; document.getElementById('eventJamMulai').value = ''; document.getElementById('eventJamSelesai').value = ''; document.getElementById('eventHonor').value = (V4.rates && V4.rates.activity) || ''; document.getElementById('eventEditKey').value = '';
        reloadDataset('events');
      });
    }
    function editEvent(key) {
      const ev = allEvents.find(e => e.key === key);
      if (!ev) return;
      document.getElementById('eventNama').value = ev.nama; document.getElementById('eventJenis').value = ev.jenis; document.getElementById('eventTanggal').value = ev.tanggal; document.getElementById('eventJamMulai').value = ev.jamMulai; document.getElementById('eventJamSelesai').value = ev.jamSelesai; document.getElementById('eventHonor').value = ev.honor; document.getElementById('eventEditKey').value = key;
      toast('✏️ Mode edit acara — ubah data lalu klik Simpan.');
    }
    function deleteEvent(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!confirm('Hapus acara ini? Catatan check-in yang sudah ada tidak akan terhapus.')) return;
      db.ref('events/' + key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('🗑️ Acara dihapus.'); addLog('hapus_event', key); reloadDataset('events');
      });
    }
    // Galeri peserta check-in (Acara/Ujian) berikut foto buktinya -- sebelumnya foto tersimpan
    // tapi tidak pernah ditampilkan di mana pun, cuma dihitung jumlahnya. Read-only, jadi
    // dibuka untuk Admin & Kepsek (sama seperti akses rekap lain), bukan cuma Admin.
    function tampilkanPesertaCheckin(daftar, judul) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const overlay = document.createElement('div');
      overlay.id = 'pesertaCheckinOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;';
      const sorted = [...daftar].sort((a,b) => waktuMs(a.waktu) - waktuMs(b.waktu));
      const rows = sorted.length
        ? sorted.map(a => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e5e7eb;">
            ${a.foto ? `<img src="${a.foto}" alt="Foto" style="width:44px;height:44px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="lihatFotoBesar(this.src)">` : `<div style="width:44px;height:44px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;">${escapeHtml(a.guru || '-')}</div>
              <div class="text-muted" style="font-size:12px;">${a.waktu ? new Date(a.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '-'}</div>
            </div>
          </div>`).join('')
        : `<p class="text-muted" style="text-align:center;padding:20px 0;">Belum ada yang check-in.</p>`;
      overlay.innerHTML = `<div style="background:white;border-radius:12px;padding:16px;max-width:400px;width:100%;max-height:80vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;">
            <p style="font-weight:700;font-size:14px;">👥 Peserta: ${escapeHtml(judul)}</p>
            <button class="btn" style="padding:2px 10px;font-size:12px;flex-shrink:0;" onclick="document.getElementById('pesertaCheckinOverlay').remove()">✕ Tutup</button>
          </div>
          ${rows}
        </div>`;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
    }
    function lihatPesertaEvent(eventKey) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const ev = allEvents.find(e => e.key === eventKey);
      toast('⏳ Memuat foto...', false, 1500);
      // Ambil ULANG langsung dari Firebase (bukan dari allEventAttendance yang sudah dibuang
      // foto-nya, lihat catatan di v4LoadCore) -- supaya foto cuma diunduh saat benar-benar
      // dibutuhkan, bukan oleh semua orang di setiap pembukaan aplikasi. (Opsional: tambahkan
      // rule .indexOn:["eventKey"] pada path event_attendance di Firebase Rules kalau data
      // sudah sangat banyak, supaya query ini lebih cepat di sisi server.)
      db.ref('event_attendance').orderByChild('eventKey').equalTo(eventKey).once('value', snap => {
        const daftar = [];
        snap.forEach(child => { const ea = child.val(); ea.key = child.key; daftar.push(ea); });
        lampirkanFoto('event_attendance', daftar).then(() => tampilkanPesertaCheckin(daftar, ev ? ev.nama : 'Acara'));
      }, err => toast('Gagal memuat: ' + err.message, true));
    }
    function lihatPesertaUjian(ujianKey) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const u = allUjian.find(e => e.key === ujianKey);
      toast('⏳ Memuat foto...', false, 1500);
      db.ref('ujian_attendance').orderByChild('ujianKey').equalTo(ujianKey).once('value', snap => {
        const daftar = [];
        snap.forEach(child => { const ua = child.val(); ua.key = child.key; daftar.push(ua); });
        lampirkanFoto('ujian_attendance', daftar).then(() => tampilkanPesertaCheckin(daftar, u ? u.nama : 'Ujian'));
      }, err => toast('Gagal memuat: ' + err.message, true));
    }
    function renderEventList() {
      const list = document.getElementById('eventList');
      if (!list) return;
      const sorted = [...allEvents].sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (sorted.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada acara.</p>'; return; }
      let html = '';
      sorted.forEach(ev => {
        const jumlahHadir = allEventAttendance.filter(a => a.eventKey === ev.key).length;
        const icon = ev.jenis === 'Lembur' ? '⏰' : '🗓️';
        const tombolAdmin = isAdmin() ? `<button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="editEvent('${ev.key}')">✏️</button> <button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="deleteEvent('${ev.key}')">🗑️</button>` : '';
        html += `<div style="padding:10px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <span><strong>${icon} ${escapeHtml(ev.nama)}</strong></span>
            <span>${tombolAdmin}</span>
          </div>
          <div class="text-muted" style="margin-top:2px;">${escapeHtml(ev.tanggal)} | ${escapeHtml(ev.jamMulai)}-${escapeHtml(ev.jamSelesai)} | Rp ${(ev.honor||0).toLocaleString()} | ${(isAdmin()||isKepsek()) ? `<span style="color:#2563eb;cursor:pointer;text-decoration:underline;" onclick="lihatPesertaEvent('${ev.key}')">👥 ${jumlahHadir} hadir</span>` : `👥 ${jumlahHadir} hadir`}</div>
        </div>`;
      });
      list.innerHTML = html;
    }
    function renderEventsToday() {
      const list = document.getElementById('eventTodayList');
      if (!list || !currentUser) return;
      const today = tglLokal();
      const eventsToday = allEvents.filter(e => e.tanggal === today);
      if (eventsToday.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada acara hari ini.</p>'; return; }
      let html = '';
      eventsToday.forEach(ev => {
        const sudahCheckin = allEventAttendance.find(a => a.eventKey === ev.key && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
        const icon = ev.jenis === 'Lembur' ? '⏰' : '🗓️';
        const tombol = sudahCheckin
          ? `<span style="color:#065f46;font-weight:600;">✅ Sudah Check-in ${sudahCheckin.waktu ? new Date(sudahCheckin.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : ''}</span>`
          : `<button class="btn btn-success" style="padding:4px 14px;font-size:12px;" onclick="openEventCheckin('${ev.key}')">📸 Check-in</button>`;
        html += `<div style="padding:10px 12px;background:#eff6ff;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span><strong>${icon} ${escapeHtml(ev.nama)}</strong><br><span class="text-muted" style="font-size:12px;">${escapeHtml(ev.jamMulai)}-${escapeHtml(ev.jamSelesai)} · Rp ${(ev.honor||0).toLocaleString()}</span></span>
          ${tombol}
        </div>`;
      });
      list.innerHTML = html;
    }
    let eventCameraStream = null, activeEventKey = null;
    function openEventCheckin(eventKey) {
      activeEventKey = eventKey;
      const ev = allEvents.find(e => e.key === eventKey);
      document.getElementById('eventCameraCard').style.display = 'block';
      document.getElementById('eventCameraTitle').textContent = `📸 Check-in: ${ev ? ev.nama : ''}`;
      document.getElementById('eventCameraCard').scrollIntoView({ behavior: 'smooth' });
    }
    function cancelEventCheckin() {
      stopEventCamera();
      activeEventKey = null;
      document.getElementById('eventCameraCard').style.display = 'none';
    }
    function startEventCamera() {
      const video = document.getElementById('eventVideo'), container = document.getElementById('eventVideoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
        .then(stream => {
          eventCameraStream = stream; video.srcObject = stream; container.style.display = 'block'; video.style.display = 'block'; video.play();
          document.getElementById('eventFaceStatus').innerHTML = '✅ Kamera aktif. Klik "Ambil Foto & Check-in"';
          document.getElementById('eventFaceStatus').style.background = '#dcfce7'; document.getElementById('eventFaceStatus').style.color = '#065f46';
        })
        .catch(err => { console.error(err); toast('❌ Gagal akses kamera.', true); });
    }
    function stopEventCamera() {
      if (eventCameraStream) { eventCameraStream.getTracks().forEach(t => t.stop()); eventCameraStream = null; }
      const video = document.getElementById('eventVideo'), container = document.getElementById('eventVideoContainer');
      if (video) { video.srcObject = null; video.style.display = 'none'; }
      if (container) container.style.display = 'none';
    }
    function checkinEvent() {
      if (!activeEventKey) return;
      const ev = allEvents.find(e => e.key === activeEventKey);
      if (!ev) return toast('Acara tidak ditemukan.', true);
      const sudahCheckin = allEventAttendance.find(a => a.eventKey === activeEventKey && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      if (sudahCheckin) return toast('Anda sudah check-in acara ini!', true);
      if (!eventCameraStream) return toast('⚠️ Aktifkan kamera terlebih dahulu!', true);
      const btn = document.getElementById('btnEventCheckin');
      btn.disabled = true; btn.textContent = '⏳ Memproses...';
      const video = document.getElementById('eventVideo'), canvas = document.getElementById('eventSnapshotCanvas');
      let fotoDataUrl = null;
      try {
        // Foto diperkecil dulu (maks 480px sisi terpanjang) lalu disimpan LANGSUNG sebagai data URL
        // di field `foto` pada record event_attendance (bukan diunggah ke Storage, yang butuh plan
        // berbayar Blaze -- project ini di plan gratis Spark).
        const maxSisi = 480;
        const skala = Math.min(1, maxSisi / Math.max(video.videoWidth || 320, video.videoHeight || 240));
        canvas.width = Math.round((video.videoWidth || 320) * skala);
        canvas.height = Math.round((video.videoHeight || 240) * skala);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        fotoDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      } catch (e) { console.error('Gagal ambil snapshot:', e); }
      const today = tglLokal();
      // KEY TETAP (eventKey+guru) + transaction() -- sama seperti perbaikan absen Datang/Pulang,
      // supaya "sudah check-in atau belum" dijamin atomik di server, bukan cuma dicek di memori
      // browser (yang bisa race kalau dibuka di 2 device/tab hampir bersamaan).
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const dbRef = db.ref(`event_attendance/${activeEventKey}_${guruKeyAman}`);
      const dataBaru = { eventKey: activeEventKey, eventNama: ev.nama, jenis: ev.jenis, guru: currentUser.name, guruKey: currentUser.key, tanggal: today, waktu: new Date().toISOString(), honor: ev.honor, tahunAjaran: currentTahunAjaran, hasFoto: !!fotoDataUrl }; // foto disimpan terpisah (lihat simpanFotoTerpisah)
      dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        btn.disabled = false; btn.textContent = '✅ Ambil Foto & Check-in';
        if (err) return toast('Gagal: ' + err.message, true);
        if (!committed) { toast('⚠️ Anda sudah check-in acara ini (tercatat dari sesi lain).', true); reloadDataset(['events','eventAttendance'], () => { renderEventsToday(); renderEventList(); }); return; }
        toast('✅ Check-in berhasil!'); addLog('checkin_event', ev.nama);
        simpanFotoTerpisah('event_attendance', snapshot.key, fotoDataUrl);
        allEventAttendance.push({ ...dataBaru, key: snapshot.key });
        renderEventsToday(); renderEventList();
        cancelEventCheckin();
      });
    }

    // ============================================================
    // HONOR UJIAN (sistem terpisah dari Lembur & Rapat)
    // ============================================================
    function renderUjianAdminForm() {
      const card = document.getElementById('ujianAdminFormCard');
      if (!card) return;
      card.style.display = isAdmin() ? 'block' : 'none';
      // Isi otomatis default "Honor Kegiatan/sesi" dari ⚙️ Tarif Honor Terpusat, kalau field masih kosong & bukan mode edit.
      const honorInput = document.getElementById('ujianHonor'), editKeyInput = document.getElementById('ujianEditKey');
      if (isAdmin() && honorInput && editKeyInput && !editKeyInput.value && !honorInput.value && V4.rates && V4.rates.activity) honorInput.value = V4.rates.activity;
    }
    function submitUjian() {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('submitUjian')) return toast('Sedang menyimpan...', false, 1500);
      const nama = document.getElementById('ujianNama').value.trim();
      const jenis = document.getElementById('ujianJenis').value;
      const tanggal = document.getElementById('ujianTanggal').value;
      const jamMulai = document.getElementById('ujianJamMulai').value;
      const jamSelesai = document.getElementById('ujianJamSelesai').value;
      const honor = parseInt(document.getElementById('ujianHonor').value) || 0;
      const editKey = document.getElementById('ujianEditKey').value;
      if (!nama || !tanggal || !jamMulai || !jamSelesai) return toast('Lengkapi semua data!', true);
      if (honor <= 0) return toast('Honor harus lebih dari 0!', true);
      const data = { nama, jenis, tanggal, jamMulai, jamSelesai, honor, tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() };
      const ref = editKey ? db.ref('ujian/' + editKey) : db.ref('ujian').push();
      if (!editKey) { data.createdBy = currentUser.name; data.guruKey = currentUser.key || null; data.createdAt = new Date().toISOString(); }
      const btnSubmitUjian = document.getElementById('btnSubmitUjian');
      setBusy('submitUjian', btnSubmitUjian);
      ref.update(data, err => {
        clearBusy('submitUjian', btnSubmitUjian);
        if (err) return toast('Gagal: ' + err.message, true);
        toast(editKey ? '✅ Sesi ujian diperbarui!' : '✅ Sesi ujian dibuat!');
        addLog(editKey ? 'edit_ujian' : 'buat_ujian', nama);
        document.getElementById('ujianNama').value = ''; document.getElementById('ujianTanggal').value = ''; document.getElementById('ujianJamMulai').value = ''; document.getElementById('ujianJamSelesai').value = ''; document.getElementById('ujianHonor').value = (V4.rates && V4.rates.activity) || ''; document.getElementById('ujianEditKey').value = '';
        reloadDataset('ujian');
      });
    }
    function editUjian(key) {
      const u = allUjian.find(e => e.key === key);
      if (!u) return;
      document.getElementById('ujianNama').value = u.nama; document.getElementById('ujianJenis').value = u.jenis; document.getElementById('ujianTanggal').value = u.tanggal; document.getElementById('ujianJamMulai').value = u.jamMulai; document.getElementById('ujianJamSelesai').value = u.jamSelesai; document.getElementById('ujianHonor').value = u.honor; document.getElementById('ujianEditKey').value = key;
      toast('✏️ Mode edit sesi ujian — ubah data lalu klik Simpan.');
    }
    function deleteUjian(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!confirm('Hapus sesi ujian ini? Catatan check-in yang sudah ada tidak akan terhapus.')) return;
      db.ref('ujian/' + key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('🗑️ Sesi ujian dihapus.'); addLog('hapus_ujian', key); reloadDataset('ujian');
      });
    }
    function renderUjianList() {
      const list = document.getElementById('ujianList');
      if (!list) return;
      const sorted = [...allUjian].sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (sorted.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada sesi ujian.</p>'; return; }
      let html = '';
      sorted.forEach(u => {
        const jumlahHadir = allUjianAttendance.filter(a => a.ujianKey === u.key).length;
        const icon = u.jenis === 'Koreksi' ? '✏️' : u.jenis === 'Pembuat Soal' ? '📄' : '👁️';
        const tombolAdmin = isAdmin() ? `<button class="btn btn-edit" style="padding:2px 10px;font-size:11px;" onclick="editUjian('${u.key}')">✏️</button> <button class="btn btn-danger" style="padding:2px 10px;font-size:11px;" onclick="deleteUjian('${u.key}')">🗑️</button>` : '';
        html += `<div style="padding:10px 12px;background:#f8fafc;border-radius:8px;margin-bottom:6px;font-size:13px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <span><strong>${icon} ${escapeHtml(u.nama)}</strong> <span style="font-size:11px;color:#7c3aed;">(${escapeHtml(u.jenis)})</span></span>
            <span>${tombolAdmin}</span>
          </div>
          <div class="text-muted" style="margin-top:2px;">${escapeHtml(u.tanggal)} | ${escapeHtml(u.jamMulai)}-${escapeHtml(u.jamSelesai)} | Rp ${(u.honor||0).toLocaleString()} | ${(isAdmin()||isKepsek()) ? `<span style="color:#7c3aed;cursor:pointer;text-decoration:underline;" onclick="lihatPesertaUjian('${u.key}')">👥 ${jumlahHadir} hadir</span>` : `👥 ${jumlahHadir} hadir`}</div>
        </div>`;
      });
      list.innerHTML = html;
    }
    function renderUjianToday() {
      const list = document.getElementById('ujianTodayList');
      if (!list || !currentUser) return;
      const today = tglLokal();
      const ujianToday = allUjian.filter(u => u.tanggal === today);
      if (ujianToday.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada sesi ujian hari ini.</p>'; return; }
      let html = '';
      ujianToday.forEach(u => {
        const sudahCheckin = allUjianAttendance.find(a => a.ujianKey === u.key && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
        const icon = u.jenis === 'Koreksi' ? '✏️' : u.jenis === 'Pembuat Soal' ? '📄' : '👁️';
        const tombol = sudahCheckin
          ? `<span style="color:#065f46;font-weight:600;">✅ Sudah Check-in ${sudahCheckin.waktu ? new Date(sudahCheckin.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : ''}</span>`
          : `<button class="btn btn-success" style="padding:4px 14px;font-size:12px;" onclick="openUjianCheckin('${u.key}')">📸 Check-in</button>`;
        html += `<div style="padding:10px 12px;background:#f3e8ff;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span><strong>${icon} ${escapeHtml(u.nama)}</strong> <span style="font-size:11px;color:#7c3aed;">(${escapeHtml(u.jenis)})</span><br><span class="text-muted" style="font-size:12px;">${escapeHtml(u.jamMulai)}-${escapeHtml(u.jamSelesai)} · Rp ${(u.honor||0).toLocaleString()}</span></span>
          ${tombol}
        </div>`;
      });
      list.innerHTML = html;
    }
    let ujianCameraStream = null, activeUjianKey = null;
    function openUjianCheckin(ujianKey) {
      activeUjianKey = ujianKey;
      const u = allUjian.find(e => e.key === ujianKey);
      document.getElementById('ujianCameraCard').style.display = 'block';
      document.getElementById('ujianCameraTitle').textContent = `📸 Check-in: ${u ? u.nama : ''}`;
      document.getElementById('ujianCameraCard').scrollIntoView({ behavior: 'smooth' });
    }
    function cancelUjianCheckin() {
      stopUjianCamera();
      activeUjianKey = null;
      document.getElementById('ujianCameraCard').style.display = 'none';
    }
    function startUjianCamera() {
      const video = document.getElementById('ujianVideo'), container = document.getElementById('ujianVideoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
        .then(stream => {
          ujianCameraStream = stream; video.srcObject = stream; container.style.display = 'block'; video.style.display = 'block'; video.play();
          document.getElementById('ujianFaceStatus').innerHTML = '✅ Kamera aktif. Klik "Ambil Foto & Check-in"';
          document.getElementById('ujianFaceStatus').style.background = '#dcfce7'; document.getElementById('ujianFaceStatus').style.color = '#065f46';
        })
        .catch(err => { console.error(err); toast('❌ Gagal akses kamera.', true); });
    }
    function stopUjianCamera() {
      if (ujianCameraStream) { ujianCameraStream.getTracks().forEach(t => t.stop()); ujianCameraStream = null; }
      const video = document.getElementById('ujianVideo'), container = document.getElementById('ujianVideoContainer');
      if (video) { video.srcObject = null; video.style.display = 'none'; }
      if (container) container.style.display = 'none';
    }
    function checkinUjian() {
      if (!activeUjianKey) return;
      const u = allUjian.find(e => e.key === activeUjianKey);
      if (!u) return toast('Sesi ujian tidak ditemukan.', true);
      const sudahCheckin = allUjianAttendance.find(a => a.ujianKey === activeUjianKey && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      if (sudahCheckin) return toast('Anda sudah check-in sesi ujian ini!', true);
      if (!ujianCameraStream) return toast('⚠️ Aktifkan kamera terlebih dahulu!', true);
      const btn = document.getElementById('btnUjianCheckin');
      btn.disabled = true; btn.textContent = '⏳ Memproses...';
      const video = document.getElementById('ujianVideo'), canvas = document.getElementById('ujianSnapshotCanvas');
      let fotoDataUrl = null;
      try {
        // Sama seperti checkinEvent(): foto tidak lagi lewat Firebase Storage (butuh Blaze),
        // langsung disimpan sebagai data URL yang diperkecil (maks 480px sisi terpanjang).
        const maxSisi = 480;
        const skala = Math.min(1, maxSisi / Math.max(video.videoWidth || 320, video.videoHeight || 240));
        canvas.width = Math.round((video.videoWidth || 320) * skala);
        canvas.height = Math.round((video.videoHeight || 240) * skala);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        fotoDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      } catch (e) { console.error('Gagal ambil snapshot:', e); }
      const today = tglLokal();
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const dbRef = db.ref(`ujian_attendance/${activeUjianKey}_${guruKeyAman}`);
      const dataBaru = { ujianKey: activeUjianKey, ujianNama: u.nama, jenis: u.jenis, guru: currentUser.name, guruKey: currentUser.key, tanggal: today, waktu: new Date().toISOString(), honor: u.honor, tahunAjaran: currentTahunAjaran, hasFoto: !!fotoDataUrl }; // foto disimpan terpisah (lihat simpanFotoTerpisah)
      dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        btn.disabled = false; btn.textContent = '✅ Ambil Foto & Check-in';
        if (err) return toast('Gagal: ' + err.message, true);
        if (!committed) { toast('⚠️ Anda sudah check-in sesi ujian ini (tercatat dari sesi lain).', true); reloadDataset(['ujian','ujianAttendance'], () => { renderUjianToday(); renderUjianList(); }); return; }
        toast('✅ Check-in berhasil!'); addLog('checkin_ujian', u.nama);
        simpanFotoTerpisah('ujian_attendance', snapshot.key, fotoDataUrl);
        allUjianAttendance.push({ ...dataBaru, key: snapshot.key });
        renderUjianToday(); renderUjianList();
        cancelUjianCheckin();
      });
    }

