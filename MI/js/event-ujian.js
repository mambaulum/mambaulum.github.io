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
    // Jendela waktu check-in (acara & ujian). Ubah dua angka ini sesuai kebijakan madrasah.
    const CHECKIN_SEBELUM_MENIT = 30;   // boleh check-in mulai N menit sebelum jam mulai
    const CHECKIN_SESUDAH_MENIT = 0;    // dan sampai N menit setelah jam selesai
    // Catatan: ini memakai jam perangkat, jadi hanya pagar untuk pemakaian normal. Pagar sungguhan harus
    // di Firebase Rules (validasi waktu & honor) -- lihat catatan audit.
    function cekJendelaCheckin(item) {
      if (!item) return { ok: true };
      if (item.tanggal && item.tanggal !== tglLokal()) return { ok: false, pesan: 'Check-in hanya bisa pada hari pelaksanaan (' + item.tanggal + ').' };
      const hm = x => { const m = /^(\d{1,2}):(\d{2})/.exec(x || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
      const a = hm(item.jamMulai), b = hm(item.jamSelesai);
      if (a == null || b == null) return { ok: true };
      const n = (typeof menitWIB === 'function') ? menitWIB() : (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })();   // WIB, sama seperti tglLokal()
      if (n < a - CHECKIN_SEBELUM_MENIT) return { ok: false, pesan: 'Check-in baru dibuka ' + CHECKIN_SEBELUM_MENIT + ' menit sebelum jam mulai (' + item.jamMulai + ').' };
      if (n > b + CHECKIN_SESUDAH_MENIT) return { ok: false, pesan: 'Waktu check-in sudah lewat (selesai ' + item.jamSelesai + ').' };
      return { ok: true };
    }
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
      if (jamMulai >= jamSelesai) return toast('Jam selesai harus setelah jam mulai!', true);
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
        { const ek = document.getElementById('eventEditKey'); if (ek && ek.value === key) ek.value = ''; }
        toast('🗑️ Acara dihapus.'); addLog('hapus_event', key); reloadDataset('events');
      });
    }
    // Galeri peserta check-in (Acara/Ujian) berikut foto buktinya -- sebelumnya foto tersimpan
    // tapi tidak pernah ditampilkan di mana pun, cuma dihitung jumlahnya. Read-only, jadi
    // dibuka untuk Admin & Kepsek (sama seperti akses rekap lain), bukan cuma Admin.
    function tampilkanPesertaCheckin(daftar, judul) {
      if (!isAdmin() && !isKepsek()) return toast('Hanya Admin & Kepsek!', true);
      const lama = document.getElementById('pesertaCheckinOverlay'); if (lama) lama.remove();
      const overlay = document.createElement('div');
      overlay.id = 'pesertaCheckinOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px;';
      const sorted = [...daftar].sort((a,b) => waktuMs(a.waktu) - waktuMs(b.waktu));
      const rows = sorted.length
        ? sorted.map(a => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e5e7eb;">
            ${a.foto ? `<img src="${escapeHtml(a.foto)}" alt="Foto" style="width:44px;height:44px;object-fit:cover;border-radius:8px;cursor:pointer;" onclick="lihatFotoBesar(this.src)">` : `<div style="width:44px;height:44px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;">👤</div>`}
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
          <div class="text-muted" style="margin-top:2px;">${escapeHtml(ev.tanggal)} | ${escapeHtml(ev.jamMulai)}-${escapeHtml(ev.jamSelesai)} | Rp ${(ev.honor||0).toLocaleString('id-ID')} | ${(isAdmin()||isKepsek()) ? `<span style="color:#2563eb;cursor:pointer;text-decoration:underline;" onclick="lihatPesertaEvent('${ev.key}')">👥 ${jumlahHadir} hadir</span>` : `👥 ${jumlahHadir} hadir`}</div>
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
          <span><strong>${icon} ${escapeHtml(ev.nama)}</strong><br><span class="text-muted" style="font-size:12px;">${escapeHtml(ev.jamMulai)}-${escapeHtml(ev.jamSelesai)} · Rp ${(ev.honor||0).toLocaleString('id-ID')}</span></span>
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
      if (eventCameraStream) stopEventCamera();
      const video = document.getElementById('eventVideo'), container = document.getElementById('eventVideoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
        .then(stream => {
          eventCameraStream = stream; video.srcObject = stream; container.style.display = 'block'; video.style.display = 'block'; { const pp = video.play(); if (pp && pp.catch) pp.catch(() => {}); }
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
      const jw = cekJendelaCheckin(ev); if (!jw.ok) return toast('⏰ ' + jw.pesan, true);
      const sudahCheckin = allEventAttendance.find(a => a.eventKey === activeEventKey && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      if (sudahCheckin) return toast('Anda sudah check-in acara ini!', true);
      if (!eventCameraStream) return toast('⚠️ Aktifkan kamera terlebih dahulu!', true);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Check-in butuh koneksi internet — coba lagi setelah online.', true);
      const vSiap = document.getElementById('eventVideo');
      if (!vSiap || vSiap.readyState < 2 || !vSiap.videoWidth) return toast('⏳ Kamera belum siap, tunggu sebentar lalu coba lagi.', true);
      const btn = document.getElementById('btnEventCheckin');
      btn.disabled = true; btn.textContent = '⏳ Memproses...';
      const video = document.getElementById('eventVideo'), canvas = document.getElementById('eventSnapshotCanvas');
      let fotoDataUrl = null;
      try {
        // Foto diperkecil dulu (maks 480px sisi terpanjang) lalu dikirim sebagai data URL ke
        // simpanFotoTerpisah() (bukan diunggah ke Storage, yang butuh plan Blaze -- project ini di plan gratis Spark).
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
      const dataBaru = { eventKey: activeEventKey, eventNama: ev.nama, jenis: ev.jenis, guru: currentUser.name, guruKey: currentUser.key || null, tanggal: today, waktu: firebase.database.ServerValue.TIMESTAMP, honor: ev.honor, tahunAjaran: currentTahunAjaran, hasFoto: !!fotoDataUrl }; // foto disimpan terpisah (lihat simpanFotoTerpisah)
      guruSesiSiap().then(() => dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        btn.disabled = false; btn.textContent = '✅ Ambil Foto & Check-in';
        if (err) return toast('Gagal: ' + err.message, true);
        if (!committed) { toast('⚠️ Anda sudah check-in acara ini (tercatat dari sesi lain).', true); reloadDataset(['events','eventAttendance'], () => { renderEventsToday(); renderEventList(); }); return; }
        toast('✅ Check-in berhasil!'); addLog('checkin_event', ev.nama);
        simpanFotoTerpisah('event_attendance', snapshot.key, fotoDataUrl);
        allEventAttendance.push({ ...dataBaru, waktu: (snapshot.val() && snapshot.val().waktu) || Date.now(), key: snapshot.key });
        renderEventsToday(); renderEventList();
        cancelEventCheckin();
      }));
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
      if (jamMulai >= jamSelesai) return toast('Jam selesai harus setelah jam mulai!', true);
      if (editKey && editKey.indexOf('adm_') === 0) return toast('Sesi ini dibuat dari Jadwal Ujian. Ubah pengawas/jam lewat menu Administrasi Ujian.', true);
      const data = { nama, jenis, tanggal, jamMulai, jamSelesai, honor, terbuka: true, tahunAjaran: currentTahunAjaran, updatedAt: new Date().toISOString() };   // sesi manual = terbuka untuk semua guru yang login (Koreksi / Pembuat Soal)
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
      if (String(key).indexOf('adm_') === 0) return toast('Sesi ini dibuat dari Jadwal Ujian. Ubah pengawas/jam lewat menu Administrasi Ujian.', true);
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
        { const ek = document.getElementById('ujianEditKey'); if (ek && ek.value === key) ek.value = ''; }
        toast('🗑️ Sesi ujian dihapus.'); addLog('hapus_ujian', key); reloadDataset('ujian');
      });
    }
    // --- Nama pengawas + filter hari/kelas pada Daftar Sesi Ujian (hanya tampilan; tidak ada data baru yang ditulis) ---
    const UJ_HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    function ujHariDari(tgl) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl || ''); return m ? UJ_HARI[new Date(+m[1], +m[2]-1, +m[3]).getDay()] : ''; }
    // Kelas dibaca dari nama sesi honor buatan jadwal: "Pengawas <mapel> · 4A + 4B · Ruang II". Sesi manual (tanpa " · ") -> tanpa kelas.
    function ujKelasDari(u) {
      const p = String(u.nama || '').split(' · ');
      if (p.length < 3) return [];
      return p[p.length - 2].split('+').map(s => s.trim()).filter(s => s && s !== '-');
    }
    function ujRuangDari(u) { const p = String(u.nama || '').split(' · '); return p.length >= 3 ? p[p.length - 1].trim() : ''; }
    // Daftar pengawas sebuah sesi: [{nama, hadir}]. Nama dari Data Guru; bila tidak ada, dari catatan check-in; terakhir "?".
    function ujPengawasDari(u) {
      const guruList = (typeof allGuru !== 'undefined' && allGuru) || [];
      const hadirMap = {}, namaAtt = {};
      (allUjianAttendance || []).forEach(a => { if (a.ujianKey !== u.key) return; const k = a.guruKey || ('n:' + a.guru); hadirMap[k] = true; if (a.guruKey) namaAtt[a.guruKey] = a.guru; });
      return Object.keys(u.pengawas || {}).filter(k => u.pengawas[k] === true).map(k => {
        const g = guruList.find(x => x.key === k);
        return { nama: (g && g.name) || namaAtt[k] || 'Guru (tidak dikenal)', hadir: !!hadirMap[k] };
      }).sort((a, b) => COLLATOR_ID.compare(a.nama, b.nama));
    }
    function ujPengawasHtml(u) {
      const pw = ujPengawasDari(u);
      if (!pw.length) return '';
      return `<div style="margin-top:4px;font-size:12px;color:#4c1d95;">👤 <strong>Pengawas:</strong> ` +
        pw.map(p => `<span style="white-space:nowrap;">${escapeHtml(p.nama)}${p.hadir ? ' <span title="Sudah check-in" style="color:#065f46;">✅</span>' : ''}</span>`).join(', ') + `</div>`;
    }
    // Isi pilihan filter dari data yang ada; pilihan yang sedang dipakai dipertahankan saat daftar digambar ulang.
    function ujSiapkanFilter() {
      const selHari = document.getElementById('ujFilterHari'), selKelas = document.getElementById('ujFilterKelas');
      if (!selHari || !selKelas) return;
      const hariAda = new Set(), kelasAda = new Set();
      allUjian.forEach(u => { const h = ujHariDari(u.tanggal); if (h) hariAda.add(h); ujKelasDari(u).forEach(k => kelasAda.add(k)); });
      const urutHari = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].filter(h => hariAda.has(h));
      const kelasUrut = [...kelasAda].sort((a, b) => COLLATOR_ID.compare(a, b));
      const isi = (sel, daftar, semua) => {
        const sekarang = sel.value, sig = daftar.join('|');
        if (sel.dataset.sig === sig) return;
        sel.innerHTML = `<option value="">${semua}</option>` + daftar.map(x => `<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join('');
        sel.value = daftar.indexOf(sekarang) >= 0 ? sekarang : '';
        sel.dataset.sig = sig;
      };
      isi(selHari, urutHari, 'Semua hari'); isi(selKelas, kelasUrut, 'Semua kelas');
    }
    let ujHanyaHariIni = false;
    function ujToggleHariIni() { ujHanyaHariIni = !ujHanyaHariIni; renderUjianList(); }
    function ujResetFilter() {
      ['ujFilterHari', 'ujFilterKelas', 'ujFilterCari', 'ujFilterStatus'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      ujHanyaHariIni = false;
      renderUjianList();
    }
    function renderUjianList() {
      const list = document.getElementById('ujianList');
      if (!list) return;
      ujSiapkanFilter();
      const fHari = (document.getElementById('ujFilterHari') || {}).value || '', fKelas = (document.getElementById('ujFilterKelas') || {}).value || '';
      const semua = [...allUjian].sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (semua.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada sesi ujian.</p>'; return; }
      const fCari = (((document.getElementById('ujFilterCari') || {}).value) || '').trim().toLowerCase(), fStatus = (document.getElementById('ujFilterStatus') || {}).value || '';
      const hariIni = ujHanyaHariIni ? tglLokal() : '';
      const btnHariIni = document.getElementById('ujBtnHariIni');
      if (btnHariIni) { btnHariIni.setAttribute('aria-pressed', ujHanyaHariIni ? 'true' : 'false'); btnHariIni.style.background = ujHanyaHariIni ? '#7c3aed' : ''; btnHariIni.style.color = ujHanyaHariIni ? '#fff' : ''; }
      const sorted = semua.filter(u => {
        if (fHari && ujHariDari(u.tanggal) !== fHari) return false;
        if (fKelas && ujKelasDari(u).indexOf(fKelas) < 0) return false;
        if (hariIni && u.tanggal !== hariIni) return false;
        if (fCari || fStatus) {
          const pw = ujPengawasDari(u);
          if (fCari && !pw.some(p => p.nama.toLowerCase().indexOf(fCari) >= 0)) return false;
          if (fStatus === 'belum' && !pw.some(p => !p.hadir)) return false;
          if (fStatus === 'lengkap' && !(pw.length && pw.every(p => p.hadir))) return false;
        }
        return true;
      });
      const info = document.getElementById('ujFilterInfo');
      if (info) info.textContent = (fHari || fKelas || fCari || fStatus || hariIni) ? `${sorted.length} dari ${semua.length} sesi` : `${semua.length} sesi`;
      if (sorted.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada sesi yang cocok dengan filter.</p>'; return; }
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
          <div class="text-muted" style="margin-top:2px;">${escapeHtml(ujHariDari(u.tanggal))} ${escapeHtml(u.tanggal)} | ${escapeHtml(u.jamMulai)}-${escapeHtml(u.jamSelesai)} | Rp ${(u.honor||0).toLocaleString('id-ID')} | ${(isAdmin()||isKepsek()) ? `<span style="color:#7c3aed;cursor:pointer;text-decoration:underline;" onclick="lihatPesertaUjian('${u.key}')">👥 ${jumlahHadir} hadir</span>` : `👥 ${jumlahHadir} hadir`}</div>
          ${ujPengawasHtml(u)}
        </div>`;
      });
      list.innerHTML = html;
    }
    // Siapa boleh check-in: guru yang tercantum di `pengawas` sesi (sesi dari Jadwal Ujian), atau sesi `terbuka` (dibuat manual
    // oleh Admin, mis. Koreksi / Pembuat Soal). Aturan yang sama dipasang di Firebase Rules (ujian_attendance).
    function ujianBolehCheckin(u) {
      if (!u || !currentUser) return false;
      if (u.terbuka === true) return true;
      return !!(u.pengawas && currentUser.key && u.pengawas[currentUser.key] === true);
    }
    function renderUjianToday() {
      const list = document.getElementById('ujianTodayList');
      if (!list || !currentUser) return;
      muatUjianSusulan();   // kartu susulan dimuat/digambar sendiri (tidak mengganggu daftar di bawah)
      ujPasangOnline(); ujAntreKirim();   // kirim check-in offline yang tertunda (bila ada & sudah online)
      const today = tglLokal();
      const ujianToday = allUjian.filter(u => u.tanggal === today && (isAdmin() || ujianBolehCheckin(u)));
      if (ujianToday.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada sesi ujian hari ini.</p>'; return; }
      let html = '';
      ujianToday.forEach(u => {
        const sudahCheckin = allUjianAttendance.find(a => a.ujianKey === u.key && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
        const icon = u.jenis === 'Koreksi' ? '✏️' : u.jenis === 'Pembuat Soal' ? '📄' : '👁️';
        const antre = ujAntreSaya().find(x => x.ujianKey === u.key);
        const tombol = sudahCheckin
          ? `<span style="color:#065f46;font-weight:600;">✅ Sudah Check-in ${sudahCheckin.waktu ? new Date(sudahCheckin.waktu).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : ''}</span>`
          : antre
          ? `<span style="color:#92400e;font-weight:600;">⏳ Tersimpan offline ${new Date(antre.dicatatMs).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})} — terkirim otomatis saat online</span> <button class="btn btn-soft" style="padding:3px 10px;font-size:11px;" onclick="ujAntreKirim(true)">Kirim sekarang</button>`
          : `<button class="btn btn-success" style="padding:4px 14px;font-size:12px;" onclick="openUjianCheckin('${u.key}')">📸 Check-in</button>`;
        html += `<div style="padding:10px 12px;background:#f3e8ff;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <span><strong>${icon} ${escapeHtml(u.nama)}</strong> <span style="font-size:11px;color:#7c3aed;">(${escapeHtml(u.jenis)})</span><br><span class="text-muted" style="font-size:12px;">${escapeHtml(u.jamMulai)}-${escapeHtml(u.jamSelesai)} · Rp ${(u.honor||0).toLocaleString('id-ID')}</span>${ujPengawasHtml(u)}</span>
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
      if (ujianCameraStream) stopUjianCamera();
      const video = document.getElementById('ujianVideo'), container = document.getElementById('ujianVideoContainer');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('⚠️ Browser tidak support kamera!', true);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
        .then(stream => {
          ujianCameraStream = stream; video.srcObject = stream; container.style.display = 'block'; video.style.display = 'block'; { const pp = video.play(); if (pp && pp.catch) pp.catch(() => {}); }
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
      if (!ujianBolehCheckin(u)) return toast('⛔ Anda tidak tercantum sebagai pengawas sesi ini. Hubungi Admin bila seharusnya iya.', true);
      const jw = cekJendelaCheckin(u); if (!jw.ok) return toast('⏰ ' + jw.pesan, true);
      const sudahCheckin = allUjianAttendance.find(a => a.ujianKey === activeUjianKey && (a.guruKey ? a.guruKey === currentUser.key : a.guru === currentUser.name));
      if (sudahCheckin) return toast('Anda sudah check-in sesi ujian ini!', true);
      if (!ujianCameraStream) return toast('⚠️ Aktifkan kamera terlebih dahulu!', true);
      const offline = !isReallyOnline();   // offline: check-in disimpan di perangkat lalu dikirim otomatis saat online (lihat ujAntre*)
      if (offline && !(currentUser && currentUser.key)) return toast('Akun ini belum punya kunci guru, check-in offline tidak bisa disimpan.', true);
      if (offline && ujAntreSaya().some(x => x.ujianKey === activeUjianKey)) return toast('Check-in sesi ini sudah tersimpan di perangkat dan menunggu terkirim.', true);
      const vSiap = document.getElementById('ujianVideo');
      if (!vSiap || vSiap.readyState < 2 || !vSiap.videoWidth) return toast('⏳ Kamera belum siap, tunggu sebentar lalu coba lagi.', true);
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
      if (offline) {   // simpan di perangkat; terkirim otomatis begitu online (lihat ujAntreKirim)
        btn.disabled = false; btn.textContent = '✅ Ambil Foto & Check-in';
        if (!ujAntreSimpan(u, fotoDataUrl)) return toast('⚠️ Gagal menyimpan check-in offline (penyimpanan perangkat penuh/diblokir).', true);
        toast('📥 Check-in tersimpan di perangkat. Akan terkirim otomatis saat internet kembali; jangan hapus data browser.', false, 8000);
        addLog('checkin_ujian_offline', u.nama);
        cancelUjianCheckin(); renderUjianToday();
        return;
      }
      const today = tglLokal();
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const dbRef = db.ref(`ujian_attendance/${activeUjianKey}_${guruKeyAman}`);
      const dataBaru = { ujianKey: activeUjianKey, ujianNama: u.nama, jenis: u.jenis, guru: currentUser.name, guruKey: currentUser.key || null, tanggal: today, waktu: firebase.database.ServerValue.TIMESTAMP, honor: u.honor, tahunAjaran: currentTahunAjaran, hasFoto: !!fotoDataUrl }; // foto disimpan terpisah (lihat simpanFotoTerpisah)
      guruSesiSiap().then(() => dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        btn.disabled = false; btn.textContent = '✅ Ambil Foto & Check-in';
        if (err) return toast('Gagal: ' + err.message, true);
        if (!committed) { toast('⚠️ Anda sudah check-in sesi ujian ini (tercatat dari sesi lain).', true); reloadDataset(['ujian','ujianAttendance'], () => { renderUjianToday(); renderUjianList(); }); return; }
        toast('✅ Check-in berhasil!'); addLog('checkin_ujian', u.nama);
        simpanFotoTerpisah('ujian_attendance', snapshot.key, fotoDataUrl);
        allUjianAttendance.push({ ...dataBaru, waktu: (snapshot.val() && snapshot.val().waktu) || Date.now(), key: snapshot.key });
        renderUjianToday(); renderUjianList();
        cancelUjianCheckin();
      }));
    }

    // ============================================================
    // CHECK-IN UJIAN OFFLINE -- antrean di perangkat guru, dikirim otomatis saat online
    // ============================================================
    // Saat listrik/internet mati, check-in (foto kamera + jam perangkat) disimpan di localStorage. Begitu online:
    //  - masih di dalam jendela check-in sesi -> dikirim sebagai check-in biasa (Rules memeriksa jendela waktu dengan jam SERVER);
    //  - jendela sudah lewat, atau Rules menolak -> dikirim otomatis sebagai pengajuan susulan (status menunggu), Admin yang memutuskan.
    // Jam perangkat bisa diubah-ubah, karena itu check-in offline yang terlambat TIDAK pernah langsung jadi honor tanpa persetujuan Admin.
    const UJ_ANTRE_KEY = 'si_mamba_ujian_checkin_antre_v1';
    let _ujFlushJalan = false, _ujFlushTs = 0, _ujOnlineTerpasang = false;
    function ujAntreBaca() { try { const a = JSON.parse(localStorage.getItem(UJ_ANTRE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function ujAntreTulis(a) { try { localStorage.setItem(UJ_ANTRE_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
    function ujAntreSaya() { const me = currentUser && currentUser.key; return me ? ujAntreBaca().filter(x => x.guruKey === me) : []; }
    function ujAntreHapus(it) { ujAntreTulis(ujAntreBaca().filter(x => !(x.guruKey === it.guruKey && x.ujianKey === it.ujianKey))); }
    function ujAntreSimpan(u, foto) {
      const me = currentUser && currentUser.key; if (!me) return false;
      const a = ujAntreBaca().filter(x => !(x.guruKey === me && x.ujianKey === u.key));
      a.push({ ujianKey: u.key, guruKey: me, guruNama: currentUser.name, tanggal: u.tanggal, dicatatMs: Date.now(), foto: foto || null });
      if (ujAntreTulis(a)) return true;
      a[a.length - 1].foto = null;   // penyimpanan sempit: simpan tanpa foto daripada kehilangan catatan
      return ujAntreTulis(a);
    }
    function ujPasangOnline() {
      if (_ujOnlineTerpasang) return; _ujOnlineTerpasang = true;
      window.addEventListener('online', () => setTimeout(() => ujAntreKirim(true), 2500));
    }
    function ujKirimCheckin(u, foto, selesai) {
      const guruKeyAman = currentUser.key || currentUser.name.replace(/[^a-zA-Z0-9]/g,'_');
      const dbRef = db.ref(`ujian_attendance/${u.key}_${guruKeyAman}`);
      const dataBaru = { ujianKey: u.key, ujianNama: u.nama, jenis: u.jenis, guru: currentUser.name, guruKey: currentUser.key || null, tanggal: tglLokal(), waktu: firebase.database.ServerValue.TIMESTAMP, honor: u.honor, tahunAjaran: currentTahunAjaran, hasFoto: !!foto };
      guruSesiSiap().then(() => dbRef.transaction(existing => existing !== null ? undefined : dataBaru, (err, committed, snapshot) => {
        if (err) return selesai(/permission/i.test(String(err.code || '') + ' ' + String(err.message || '')) ? 'ditolak' : 'gagal');
        if (!committed) return selesai('ada');
        if (foto) simpanFotoTerpisah('ujian_attendance', snapshot.key, foto);
        allUjianAttendance.push({ ...dataBaru, waktu: (snapshot.val() && snapshot.val().waktu) || Date.now(), key: snapshot.key });
        selesai('ok');
      }));
    }
    function ujKirimSusulanOtomatis(u, it, selesai) {
      const jam = new Date(it.dicatatMs).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const id = u.key + '_' + currentUser.key;
      const data = { ujianKey: u.key, ujianNama: u.nama, jenis: u.jenis, guru: currentUser.name, guruKey: currentUser.key, tanggal: u.tanggal, honor: u.honor, tahunAjaran: currentTahunAjaran,
        alasan: ('Check-in dilakukan offline (listrik/internet mati) pukul ' + jam + ' menurut jam perangkat; terkirim otomatis setelah online.').slice(0, 300), status: 'menunggu', diajukanAt: firebase.database.ServerValue.TIMESTAMP };
      guruSesiSiap().then(() => db.ref('ujian_susulan/' + id).set(data, err => {
        if (err) return selesai('gagal', err);
        allUjianSusulan.push(Object.assign({}, data, { key: id, diajukanAt: Date.now() })); renderUjianSusulan();
        selesai('ok');
      }));
    }
    // paksa = true dari event 'online'; tanpa paksa dibatasi sekali per 20 detik supaya render tidak memicu pengiriman berulang.
    function ujAntreKirim(paksa) {
      if (_ujFlushJalan || !currentUser || !currentUser.key || typeof db === 'undefined' || !db) return;
      if (!paksa && Date.now() - _ujFlushTs < 20000) return;
      const antre = ujAntreSaya(); if (!antre.length || !isReallyOnline()) return;
      _ujFlushJalan = true; _ujFlushTs = Date.now();
      const muat = [typeof reloadDataset === 'function' ? reloadDataset(['ujian', 'ujianAttendance']) : null, typeof muatUjianSusulan === 'function' ? muatUjianSusulan(true) : null].filter(Boolean);
      Promise.all(muat.map(x => Promise.resolve(x))).catch(() => {}).then(() => {
        const proses = i => {
          if (i >= antre.length) { _ujFlushJalan = false; renderUjianToday(); if (typeof renderUjianList === 'function') renderUjianList(); return; }
          const it = antre[i], lanjut = hapus => { if (hapus) ujAntreHapus(it); proses(i + 1); };
          const u = allUjian.find(e => e.key === it.ujianKey);
          if (!u) return lanjut(allUjian.length > 0);   // sesi sudah dihapus Admin -> buang; data belum termuat -> simpan dulu
          if (!ujianBolehCheckin(u)) return lanjut(true);   // sudah tidak ditugaskan lagi
          if (allUjianAttendance.some(a => a.ujianKey === u.key && a.guruKey === it.guruKey)) return lanjut(true);   // sudah tercatat
          const susulan = () => {
            if (allUjianSusulan.some(s => s.ujianKey === u.key && s.guruKey === it.guruKey)) return lanjut(true);   // sudah ada pengajuan
            ujKirimSusulanOtomatis(u, it, (h, err) => {
              if (h === 'ok') toast('📨 Check-in offline "' + u.nama + '" dikirim sebagai pengajuan susulan, menunggu persetujuan Admin.', false, 7000);
              else toast('⚠️ Check-in offline "' + u.nama + '" belum terkirim (' + ((err && err.message) || 'gagal') + '). Akan dicoba lagi.', true, 7000);
              lanjut(h === 'ok');
            });
          };
          if (cekJendelaCheckin(u).ok) ujKirimCheckin(u, it.foto, h => {
            if (h === 'ok') { toast('✅ Check-in offline terkirim: ' + u.nama); addLog('checkin_ujian', u.nama + ' (dari antrean offline)'); lanjut(true); }
            else if (h === 'ada') lanjut(true);
            else if (h === 'ditolak') susulan();   // jam server di luar jendela (jam perangkat salah/terlambat) -> jalur susulan
            else lanjut(false);
          });
          else susulan();
        };
        proses(0);
      });
    }

    // ============================================================
    // SUSULAN CHECK-IN PENGAWAS -- guru mengajukan, Admin menyetujui/menolak
    // ============================================================
    // Pengajuan disimpan di node `ujian_susulan/<ujianKey>_<guruKey>` (satu pengajuan per guru per sesi). Saat Admin menyetujui,
    // check-in resmi dibuat di `ujian_attendance` dengan tanda susulan:true, sehingga honor otomatis ikut terhitung seperti check-in biasa.
    // Rules: guru hanya boleh MEMBUAT pengajuan (status 'menunggu') untuk sesi yang menugaskannya, sesudah sesi dimulai dan selama belum ada check-in.
    let allUjianSusulan = [], _ujSusTs = 0;
    function muatUjianSusulan(paksa) {
      if (!db || !currentUser) return Promise.resolve();
      if (!paksa && Date.now() - _ujSusTs < 15000) { renderUjianSusulan(); return Promise.resolve(); }
      return new Promise(res => {
        db.ref('ujian_susulan').orderByChild('tahunAjaran').equalTo(currentTahunAjaran).once('value', snap => {
          _ujSusTs = Date.now(); allUjianSusulan = [];
          snap.forEach(c => { const v = c.val(); v.key = c.key; allUjianSusulan.push(v); });
          renderUjianSusulan(); res();
        }, err => { console.warn('[SI MAMBA] ujian_susulan gagal dimuat (Rules belum dipasang?):', err && err.message ? err.message : err); res(); });
      });
    }
    function _ujSusBadge(s) {
      const w = { menunggu: ['#b45309', '#fef3c7', '⏳ Menunggu persetujuan'], disetujui: ['#065f46', '#d1fae5', '✅ Disetujui'], ditolak: ['#991b1b', '#fee2e2', '❌ Ditolak'] }[s.status] || ['#374151', '#f3f4f6', escapeHtml(s.status || '')];
      return `<span style="font-size:11px;font-weight:600;color:${w[0]};background:${w[1]};padding:2px 8px;border-radius:10px;">${w[2]}</span>`;
    }
    function renderUjianSusulan() {
      const card = document.getElementById('ujianSusulanCard'), box = document.getElementById('ujianSusulanList');
      if (!card || !box || !currentUser) return;
      const baris = (judul, sub, kanan) => `<div style="padding:10px 12px;background:#fff7ed;border-radius:8px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;"><span>${judul}<br><span class="text-muted" style="font-size:12px;">${sub}</span></span><span style="display:flex;gap:6px;flex-wrap:wrap;">${kanan}</span></div>`;
      let html = '';
      if (isAdmin()) {
        const menunggu = allUjianSusulan.filter(s => s.status === 'menunggu').sort((a, b) => (a.diajukanAt || 0) - (b.diajukanAt || 0));
        html = menunggu.map(s => baris(`<strong>${escapeHtml(s.guru || '-')}</strong> — ${escapeHtml(s.ujianNama || '-')}`,
          `${escapeHtml(s.tanggal || '')} · Rp ${(s.honor || 0).toLocaleString('id-ID')} · Alasan: ${escapeHtml(s.alasan || '-')}`,
          `<button class="btn btn-success" style="padding:3px 12px;font-size:12px;" onclick="putusUjianSusulan('${escapeJs(s.key)}', true)">✅ Setujui</button><button class="btn btn-danger" style="padding:3px 12px;font-size:12px;" onclick="putusUjianSusulan('${escapeJs(s.key)}', false)">❌ Tolak</button>`)).join('');
        if (html) html = `<p style="font-size:12px;color:#92400e;margin-bottom:8px;">${menunggu.length} pengajuan menunggu keputusan Anda.</p>` + html;
      } else if (currentUser.key && !isKepsek()) {
        const me = currentUser.key;
        const kandidat = (allUjian || []).filter(u => u.pengawas && u.pengawas[me] === true && u.selesaiMs && Date.now() > u.selesaiMs
          && !(allUjianAttendance || []).some(a => a.ujianKey === u.key && a.guruKey === me)
          && !ujAntreSaya().some(x => x.ujianKey === u.key)
          && !allUjianSusulan.some(s => s.ujianKey === u.key && s.guruKey === me)).sort((a, b) => b.selesaiMs - a.selesaiMs).slice(0, 15);
        html += kandidat.map(u => baris(`<strong>${escapeHtml(u.nama)}</strong>`, `${escapeHtml(u.tanggal)} · ${escapeHtml(u.jamMulai)}-${escapeHtml(u.jamSelesai)} · belum check-in`,
          `<button class="btn btn-soft" style="padding:3px 12px;font-size:12px;" onclick="ajukanSusulanUjian('${escapeJs(u.key)}')">📝 Ajukan Susulan</button>`)).join('');
        const saya = allUjianSusulan.filter(s => s.guruKey === me).sort((a, b) => (b.diajukanAt || 0) - (a.diajukanAt || 0)).slice(0, 10);
        html += saya.map(s => baris(`<strong>${escapeHtml(s.ujianNama || '-')}</strong> ${_ujSusBadge(s)}`,
          `${escapeHtml(s.tanggal || '')}${s.status === 'ditolak' && s.catatanAdmin ? ' · Catatan Admin: ' + escapeHtml(s.catatanAdmin) : ''}`, '')).join('');
      }
      card.style.display = html ? 'block' : 'none'; box.innerHTML = html;
    }
    function ajukanSusulanUjian(ujianKey) {
      const u = allUjian.find(e => e.key === ujianKey);
      if (!u || !currentUser || !currentUser.key || !u.pengawas || u.pengawas[currentUser.key] !== true) return toast('⛔ Anda tidak tercantum sebagai pengawas sesi ini.', true);
      if ((allUjianAttendance || []).some(a => a.ujianKey === ujianKey && a.guruKey === currentUser.key)) return toast('Anda sudah check-in sesi ini.', true);
      if (isBusy('ujSusulan')) return toast('Sedang menyimpan...', false, 1500);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Pengajuan butuh koneksi internet.', true);
      const masuk = prompt(`Susulan check-in: ${u.nama} (${u.tanggal})\n\nTulis alasan lupa check-in (minimal 5 huruf):`, '');
      if (masuk === null) return;
      const alasan = masuk.trim();
      if (alasan.length < 5) return toast('Alasan terlalu singkat (minimal 5 huruf).', true);
      const id = u.key + '_' + currentUser.key;
      const data = { ujianKey: u.key, ujianNama: u.nama, jenis: u.jenis, guru: currentUser.name, guruKey: currentUser.key, tanggal: u.tanggal, honor: u.honor,
        tahunAjaran: currentTahunAjaran, alasan: alasan.slice(0, 300), status: 'menunggu', diajukanAt: firebase.database.ServerValue.TIMESTAMP };
      setBusy('ujSusulan');
      guruSesiSiap().then(() => db.ref('ujian_susulan/' + id).set(data, err => {
        clearBusy('ujSusulan');
        if (err) return toast('Gagal mengajukan: ' + (err.message || err), true);
        toast('✅ Pengajuan dikirim. Menunggu persetujuan Admin.'); addLog('ajukan_susulan_ujian', u.nama);
        allUjianSusulan.push(Object.assign({}, data, { key: id, diajukanAt: Date.now() })); renderUjianSusulan();
      }));
    }
    function putusUjianSusulan(key, setuju) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const s = allUjianSusulan.find(x => x.key === key); if (!s || s.status !== 'menunggu') return toast('Pengajuan tidak ditemukan / sudah diproses.', true);
      if (isBusy('ujPutus')) return toast('Sedang menyimpan...', false, 1500);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Coba lagi setelah online.', true);
      if (setuju && (allUjianAttendance || []).some(a => a.ujianKey === s.ujianKey && a.guruKey === s.guruKey)) return toast('Guru ini sudah punya check-in untuk sesi tersebut; pengajuan tidak perlu disetujui.', true);
      const masuk = prompt(setuju ? `Setujui susulan ${s.guru} — ${s.ujianNama}?\n\nAlasan guru: ${s.alasan}\n\nCatatan (boleh dikosongkan):` : `Tolak susulan ${s.guru} — ${s.ujianNama}?\n\nAlasan guru: ${s.alasan}\n\nTulis alasan penolakan:`, '');
      if (masuk === null) return;
      const catatan = masuk.trim();
      if (!setuju && catatan.length < 3) return toast('Isi alasan penolakan.', true);
      const base = 'ujian_susulan/' + key + '/', up = {};
      up[base + 'status'] = setuju ? 'disetujui' : 'ditolak';
      up[base + 'diputuskanOleh'] = currentUser.name; up[base + 'diputuskanAt'] = firebase.database.ServerValue.TIMESTAMP;
      if (catatan) up[base + 'catatanAdmin'] = catatan.slice(0, 200);
      if (setuju) up['ujian_attendance/' + key] = { ujianKey: s.ujianKey, ujianNama: s.ujianNama, jenis: s.jenis, guru: s.guru, guruKey: s.guruKey, tanggal: s.tanggal,
        waktu: firebase.database.ServerValue.TIMESTAMP, honor: s.honor, tahunAjaran: s.tahunAjaran, hasFoto: false, susulan: true, disetujuiOleh: currentUser.name };
      setBusy('ujPutus');
      db.ref().update(up, err => {   // satu tulisan atomik: status + check-in resmi masuk bersamaan
        clearBusy('ujPutus');
        if (err) return toast('Gagal: ' + (err.message || err), true);
        s.status = setuju ? 'disetujui' : 'ditolak'; if (catatan) s.catatanAdmin = catatan;
        if (setuju) allUjianAttendance.push({ ujianKey: s.ujianKey, ujianNama: s.ujianNama, jenis: s.jenis, guru: s.guru, guruKey: s.guruKey, tanggal: s.tanggal, waktu: Date.now(), honor: s.honor, tahunAjaran: s.tahunAjaran, susulan: true, key });
        toast(setuju ? '✅ Susulan disetujui; honor ikut terhitung.' : '❌ Pengajuan ditolak.'); addLog(setuju ? 'setujui_susulan_ujian' : 'tolak_susulan_ujian', s.guru + ' — ' + s.ujianNama);
        renderUjianSusulan(); if (typeof renderUjianList === 'function') renderUjianList();
      });
    }
