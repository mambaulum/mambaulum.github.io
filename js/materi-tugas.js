// ============================================================
// materi-tugas.js -- MATERI BELAJAR & TUGAS (dipecah dari app.js)
// ============================================================
// Isi: halaman Materi Belajar (guru bagikan tautan materi per kelas) dan Tugas (buat tugas,
// lihat pengumpulan dari Portal Orang Tua). Dimuat SESUDAH js/app.js (index.html).
// Tidak ada kode yang jalan saat dimuat -- hanya deklarasi fungsi.
// ============================================================

    // ============================================================
    // MATERI BELAJAR
    // ============================================================
    function setupMateriPage() {
      if (!bukuCanAccess()) { document.getElementById('materiFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>'; return; }
      renderMateriForm();
    }
    function loadMateriKelas() { renderMateriForm(); renderMateriList(); }
    function renderMateriForm() {
      const kelas = document.getElementById('materiKelasFilter').value;
      const formArea = document.getElementById('materiFormArea');
      if (!kelas) { formArea.innerHTML = ''; document.getElementById('materiListArea').innerHTML = ''; return; }
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) { formArea.innerHTML = '<p style="color:#dc2626;">🔒 Anda hanya bisa membagikan materi untuk kelas yang Anda ampu.</p>'; renderMateriList(); return; }
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">➕ Materi Baru</p>
        <div style="margin-bottom:10px;"><label class="label">Judul</label><input id="materiJudul" class="field" placeholder="Contoh: Bab 3 - Pecahan"></div>
        <div style="margin-bottom:10px;"><label class="label">Isi / Ringkasan Materi</label><textarea id="materiIsi" class="field" rows="4" placeholder="Tulis ringkasan materi, penjelasan, atau instruksi belajar mandiri..."></textarea></div>
        <div style="margin-bottom:10px;"><label class="label">Link Tambahan (opsional)</label><input id="materiLink" class="field" placeholder="Link Google Drive/YouTube/dll (opsional)"></div>
        <button class="btn btn-success" id="btnSimpanMateri" onclick="simpanMateri('${escapeJs(kelas)}')">💾 Bagikan Materi</button>
      </div>`;
      renderMateriList();
    }
    function simpanMateri(kelas) {
      if (!bukuCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa membagikan materi untuk kelas yang Anda ampu!', true);
      if (isBusy('simpanMateri')) return toast('Sedang menyimpan...', false, 1500);
      const mapel = document.getElementById('materiMapelFilter').value;
      const judul = document.getElementById('materiJudul').value.trim();
      const isi = document.getElementById('materiIsi').value.trim();
      const link = document.getElementById('materiLink').value.trim();
      if (!judul || !isi) return toast('Judul & isi materi wajib diisi!', true);
      if (link && !/^https?:\/\//i.test(link)) return toast('Link harus diawali http:// atau https://', true);
      const btnSimpanMateri = document.getElementById('btnSimpanMateri');
      setBusy('simpanMateri', btnSimpanMateri);
      const ref = db.ref('materi_belajar').push();
      const data = { kelas, mapel, judul, isi, link: link || null, tanggal: tglLokal(), tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      ref.set(data, err => {
        clearBusy('simpanMateri', btnSimpanMateri);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Materi berhasil dibagikan!'); addLog('bagikan_materi', kelas + ' - ' + judul);
        allMateri.push({ key: ref.key, ...data });
        document.getElementById('materiJudul').value = ''; document.getElementById('materiIsi').value = ''; document.getElementById('materiLink').value = '';
        renderMateriList();
      });
    }
    function renderMateriList() {
      const box = document.getElementById('materiListArea'); if (!box) return;
      const kelas = document.getElementById('materiKelasFilter').value;
      if (!kelas) { box.innerHTML = ''; return; }
      const items = allMateri.filter(m => m.kelas === kelas).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada materi dibagikan untuk kelas ini.</p>'; return; }
      box.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Materi Dibagikan</p>` + items.map(m => `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <div>
            <div style="font-weight:600;font-size:13px;">${escapeHtml(m.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(m.mapel||'-')} — ${escapeHtml(m.tanggal||'-')}</span></div>
            <div class="text-muted" style="font-size:12px;margin-top:2px;">${escapeHtml(m.isi)}</div>
            ${m.link ? `<a href="${escapeHtml(m.link)}" target="_blank" rel="noopener" style="font-size:12px;color:#2563eb;">🔗 Buka Link</a>` : ''}
          </div>
          ${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;flex-shrink:0;" onclick="hapusMateri('${m.key}')">🗑️</button>` : ''}
        </div>`).join('');
    }
    function hapusMateri(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus materi ini?')) return;
      db.ref('materi_belajar/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Materi dihapus.'); addLog('hapus_materi', key);
        allMateri = allMateri.filter(m => m.key !== key);
        renderMateriList();
      });
    }

    // ============================================================
    // TUGAS SISWA
    // ============================================================
    function setupTugasPage() {
      if (!bukuCanAccess()) { document.getElementById('tugasFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>'; return; }
      renderTugasForm();
    }
    function loadTugasKelas() { renderTugasForm(); renderTugasList(); }
    function renderTugasForm() {
      const kelas = document.getElementById('tugasKelasFilter').value;
      const formArea = document.getElementById('tugasFormArea');
      document.getElementById('tugasDetailCard').style.display = 'none';
      if (!kelas) { formArea.innerHTML = ''; document.getElementById('tugasListArea').innerHTML = ''; return; }
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) { formArea.innerHTML = '<p style="color:#dc2626;">🔒 Anda hanya bisa membuat tugas untuk kelas yang Anda ampu.</p>'; renderTugasList(); return; }
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">➕ Tugas Baru</p>
        <div style="margin-bottom:10px;"><label class="label">Judul Tugas</label><input id="tugasJudul" class="field" placeholder="Contoh: Latihan Soal Bab 3"></div>
        <div style="margin-bottom:10px;"><label class="label">Deskripsi / Instruksi</label><textarea id="tugasDeskripsi" class="field" rows="4" placeholder="Jelaskan tugas yang harus dikerjakan siswa..."></textarea></div>
        <div style="margin-bottom:10px;"><label class="label">Batas Waktu Kumpul</label><input id="tugasDeadline" type="date" class="field"></div>
        <button class="btn btn-success" id="btnSimpanTugas" onclick="simpanTugas('${escapeJs(kelas)}')">💾 Buat Tugas</button>
      </div>`;
      renderTugasList();
    }
    function simpanTugas(kelas) {
      if (!bukuCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa membuat tugas untuk kelas yang Anda ampu!', true);
      if (isBusy('simpanTugas')) return toast('Sedang menyimpan...', false, 1500);
      const mapel = document.getElementById('tugasMapelFilter').value;
      const judul = document.getElementById('tugasJudul').value.trim();
      const deskripsi = document.getElementById('tugasDeskripsi').value.trim();
      const deadline = document.getElementById('tugasDeadline').value;
      if (!judul || !deskripsi) return toast('Judul & deskripsi tugas wajib diisi!', true);
      const btnSimpanTugas = document.getElementById('btnSimpanTugas');
      setBusy('simpanTugas', btnSimpanTugas);
      const ref = db.ref('tugas').push();
      const data = { kelas, mapel, judul, deskripsi, deadline: deadline || null, tanggal: tglLokal(), tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
      ref.set(data, err => {
        clearBusy('simpanTugas', btnSimpanTugas);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Tugas berhasil dibuat!'); addLog('buat_tugas', kelas + ' - ' + judul);
        allTugas.push({ key: ref.key, ...data });
        document.getElementById('tugasJudul').value = ''; document.getElementById('tugasDeskripsi').value = ''; document.getElementById('tugasDeadline').value = '';
        renderTugasList();
      });
    }
    function renderTugasList() {
      const box = document.getElementById('tugasListArea'); if (!box) return;
      const kelas = document.getElementById('tugasKelasFilter').value;
      if (!kelas) { box.innerHTML = ''; return; }
      const items = allTugas.filter(t => t.kelas === kelas).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada tugas dibuat untuk kelas ini.</p>'; return; }
      const jumlahSiswaKelas = allSiswa.filter(s => s.kelas === kelas).length;
      box.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Daftar Tugas</p>` + items.map(t => {
        const jumlahKumpul = allTugasSubmission.filter(sub => sub.tugasKey === t.key).length;
        return `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="cursor:pointer;flex:1;" onclick="lihatDetailTugas('${t.key}')">
            <div style="font-weight:600;font-size:13px;">${escapeHtml(t.judul)} <span class="text-muted" style="font-weight:400;font-size:11px;">— ${escapeHtml(t.mapel||'-')}</span></div>
            <div class="text-muted" style="font-size:12px;">Deadline: ${escapeHtml(t.deadline||'Tidak ditentukan')} — <span style="color:#2563eb;font-weight:600;">${jumlahKumpul} / ${jumlahSiswaKelas} siswa sudah kumpul</span></div>
          </div>
          ${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;flex-shrink:0;" onclick="event.stopPropagation();hapusTugas('${t.key}')">🗑️</button>` : ''}
        </div>`;
      }).join('');
    }
    function hapusTugas(key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus tugas ini? Semua jawaban siswa yang sudah kumpul untuk tugas ini juga akan hilang.')) return;
      db.ref('tugas/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Tugas dihapus.'); addLog('hapus_tugas', key);
        allTugas = allTugas.filter(t => t.key !== key);
        renderTugasList();
      });
    }
    // Detail tugas: fetch ULANG langsung dari Firebase (termasuk foto) khusus untuk 1 tugas ini
    // saja -- sama alasannya dengan galeri foto check-in Acara/Ujian, supaya foto tidak ikut
    // terbawa ke semua guru di setiap sesi buka aplikasi.
    function lihatDetailTugas(tugasKey) {
      const tugas = allTugas.find(t => t.key === tugasKey);
      if (!tugas) return;
      document.getElementById('tugasDetailCard').style.display = 'block';
      document.getElementById('tugasDetailTitle').textContent = '📝 ' + tugas.judul;
      const area = document.getElementById('tugasDetailArea');
      area.innerHTML = '<p class="text-muted" style="text-align:center;padding:12px;">⏳ Memuat jawaban siswa...</p>';
      const siswaKelas = allSiswa.filter(s => s.kelas === tugas.kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      db.ref('tugas_submission').orderByChild('tugasKey').equalTo(tugasKey).once('value', snap => {
        const submissions = {};
        const daftarSub = [];
        snap.forEach(child => { const s = child.val(); s.key = child.key; submissions[s.siswaKey] = s; daftarSub.push(s); });
        lampirkanFoto('tugas_submission', daftarSub).then(() => { area.innerHTML = `<p class="text-muted" style="font-size:13px;margin-bottom:10px;">${escapeHtml(tugas.deskripsi)}</p>` + siswaKelas.map(s => {
          const sub = submissions[s.key];
          if (!sub) return `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;">${escapeHtml(s.name)}</span><span class="text-muted" style="font-size:11px;">⏳ Belum kumpul</span></div>`;
          return `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:600;">${escapeHtml(s.name)}</span><span style="font-size:11px;color:#059669;font-weight:600;">✅ ${escapeHtml((sub.waktuKumpul||'').slice(0,16).replace('T',' '))}</span></div>
            ${sub.jawabanTeks ? `<div class="text-strong" style="font-size:13px;margin-top:4px;">${escapeHtml(sub.jawabanTeks)}</div>` : ''}
            ${sub.foto ? `<img src="${sub.foto}" alt="Foto jawaban" style="max-width:120px;border-radius:8px;margin-top:6px;cursor:pointer;" onclick="lihatFotoBesar(this.src)">` : ''}
          </div>`;
        }).join('');
        });
      }, err => { area.innerHTML = `<p style="color:#dc2626;">Gagal memuat: ${err.message}</p>`; });
    }
    function tutupDetailTugas() { document.getElementById('tugasDetailCard').style.display = 'none'; }

