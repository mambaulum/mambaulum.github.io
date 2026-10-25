// ============================================================
// sikap-buku.js -- SIKAP & KEDISIPLINAN, BUKU PENGHUBUNG, INFO KE ORTU (dipecah dari app.js)
// ============================================================
// Isi: poin pelanggaran & prestasi per siswa (kategori bawaan + kelola kategori Admin), rekap dan
// riwayat sikap, buku penghubung guru-orang tua, dan daftar siap-kirim WA "Info ke Ortu" beserta
// titik notifikasinya.
// Dimuat SESUDAH js/app.js (urutan: app.js, portal-ortu.js, infaq.js, sikap-buku.js), SEBELUM skrip
// lain. Tidak ada kode yang berjalan saat dimuat selain deklarasi konstanta daftar kategori bawaan.
// TETAP di app.js (dipakai peta akses menu & blok lain): sikapCanAccess(), bukuCanAccess().
// ============================================================

    // ============================================================
    // SIKAP & KEDISIPLINAN SISWA
    // ============================================================
    // Poin pelanggaran & prestasi per siswa, terakumulasi per tahun ajaran, ikut tampil di
    // Raport. Kategori & poin sekarang bisa diatur Admin lewat kartu "Kelola Kategori" di
    // halaman ini (tersimpan di kedisiplinan_kategori/) -- daftar di bawah ini HANYA dipakai
    // sebagai fallback bawaan kalau Admin belum pernah mengatur apa-apa (lihat kategoriSikapList()).
    const KATEGORI_PELANGGARAN_DEFAULT = [
      { label: 'Terlambat masuk sekolah', poin: 5 },
      { label: 'Tidak mengerjakan PR/tugas', poin: 5 },
      { label: 'Tidak berseragam lengkap', poin: 5 },
      { label: 'Tidak mengikuti sholat berjamaah', poin: 10 },
      { label: 'Berkata tidak sopan', poin: 10 },
      { label: 'Membolos / tidak masuk tanpa keterangan', poin: 15 },
      { label: 'Berkelahi dengan teman', poin: 25 },
      { label: 'Merusak fasilitas sekolah', poin: 25 },
      { label: 'Lainnya', poin: 5 }
    ];
    const KATEGORI_PRESTASI_DEFAULT = [
      { label: 'Membantu teman / guru', poin: 5 },
      { label: 'Aktif dalam kegiatan sekolah', poin: 10 },
      { label: 'Hafalan tambahan / tahfidz', poin: 10 },
      { label: 'Juara lomba tingkat sekolah', poin: 15 },
      { label: 'Juara lomba tingkat kecamatan/kabupaten ke atas', poin: 25 },
      { label: 'Lainnya', poin: 5 }
    ];
    // Sumber kategori yang SEBENARNYA dipakai di seluruh aplikasi (form input, dropdown, dst) --
    // pakai daftar dari Firebase kalau Admin sudah mengisi, kalau masih kosong fallback ke
    // daftar bawaan di atas supaya fitur tetap bisa langsung dipakai sebelum Admin sempat atur.
    function kategoriSikapList(jenis) {
      const dariFirebase = allKedisiplinanKategori[jenis];
      return (dariFirebase && dariFirebase.length) ? dariFirebase : (jenis === 'prestasi' ? KATEGORI_PRESTASI_DEFAULT : KATEGORI_PELANGGARAN_DEFAULT);
    }
    function setupSikapPage() {
      if (!sikapCanAccess()) {
        document.getElementById('sikapFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>';
        document.getElementById('sikapRiwayatArea').innerHTML = ''; document.getElementById('sikapTotalBadge').textContent = '';
        renderSikapRekap();
        return;
      }
      const kategoriCard = document.getElementById('sikapKategoriAdminCard');
      if (kategoriCard) kategoriCard.style.display = isAdmin() ? '' : 'none';
      if (isAdmin()) renderSikapKategoriAdmin();
      renderSikapRekap();
    }
    function loadSikapKelas() {
      const kelas = document.getElementById('sikapKelasFilter').value;
      const siswaSelect = document.getElementById('sikapSiswaFilter');
      document.getElementById('sikapFormArea').innerHTML = ''; document.getElementById('sikapRiwayatArea').innerHTML = ''; document.getElementById('sikapTotalBadge').textContent = '';
      if (!kelas) { siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>'; return; }
      const siswaKelas = allSiswa.filter(s => s.kelas === kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>' + siswaKelas.map(s => `<option value="${s.key}">${escapeHtml(s.name)}</option>`).join('');
      renderSikapRekap();
    }
    function onSikapKategoriChange() {
      const jenis = document.getElementById('sikapJenis').value;
      const kategoriSelect = document.getElementById('sikapKategori');
      const found = kategoriSikapList(jenis).find(k => k.label === kategoriSelect.value);
      if (found) document.getElementById('sikapPoin').value = found.poin;
    }
    function onSikapJenisChange() {
      const jenis = document.getElementById('sikapJenis').value;
      document.getElementById('sikapKategori').innerHTML = kategoriSikapList(jenis).map(k => `<option value="${escapeHtml(k.label)}">${escapeHtml(k.label)}</option>`).join('');
      onSikapKategoriChange();
    }
    function loadSikapSiswa() {
      const kelas = document.getElementById('sikapKelasFilter').value;
      const siswaKey = document.getElementById('sikapSiswaFilter').value;
      const formArea = document.getElementById('sikapFormArea'), riwayatArea = document.getElementById('sikapRiwayatArea'), badge = document.getElementById('sikapTotalBadge');
      if (!siswaKey) { formArea.innerHTML = ''; riwayatArea.innerHTML = ''; badge.textContent = ''; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) return;
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">➕ Catat untuk ${escapeHtml(siswa.name)}</p>
        <div class="grid-3" style="margin-bottom:10px;">
          <div><label class="label">Jenis</label><select id="sikapJenis" class="field" onchange="onSikapJenisChange()"><option value="pelanggaran">⚠️ Pelanggaran</option><option value="prestasi">🌟 Prestasi</option></select></div>
          <div><label class="label">Kategori</label><select id="sikapKategori" class="field" onchange="onSikapKategoriChange()"></select></div>
          <div><label class="label">Poin</label><input id="sikapPoin" type="number" class="field" min="1" value="5"></div>
        </div>
        <div style="margin-bottom:10px;"><label class="label">Keterangan (opsional)</label><input id="sikapKeterangan" class="field" placeholder="Detail kejadian..."></div>
        <div style="margin-bottom:10px;"><label class="label">Tanggal</label><input id="sikapTanggal" type="date" class="field" value="${tglLokal()}"></div>
        <button class="btn btn-success" id="btnSimpanSikap" onclick="simpanSikap('${siswa.key}','${escapeJs(siswa.name)}','${kelas}')">💾 Simpan Catatan</button>
      </div>`;
      onSikapJenisChange();
      renderSikapRiwayat(siswaKey);
    }
    function renderSikapRiwayat(siswaKey) {
      const riwayatArea = document.getElementById('sikapRiwayatArea'), badge = document.getElementById('sikapTotalBadge');
      const items = allKedisiplinan.filter(d => d.siswaKey === siswaKey).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      const totalPelanggaran = items.filter(d => d.jenis === 'pelanggaran').reduce((s,d) => s+(d.poin||0), 0);
      const totalPrestasi = items.filter(d => d.jenis === 'prestasi').reduce((s,d) => s+(d.poin||0), 0);
      const net = totalPrestasi - totalPelanggaran;
      badge.innerHTML = `<span style="color:${net>=0?'#059669':'#dc2626'};">Net Poin: ${net >= 0 ? '+' : ''}${net}</span> <span class="text-muted" style="font-weight:400;">(⚠️ ${totalPelanggaran} / 🌟 ${totalPrestasi})</span>`;
      if (items.length === 0) { riwayatArea.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada catatan sikap.</p>'; return; }
      riwayatArea.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Riwayat</p>` + items.map(d => {
        const siswa = allSiswa.find(s => s.key === siswaKey);
        const pesan = d.jenis === 'prestasi'
          ? `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${d.siswaNama}*.\n\nDengan bangga kami sampaikan bahwa ananda mendapat catatan prestasi: *${d.kategori}* (+${d.poin} poin) pada ${d.tanggal}.${d.keterangan ? '\nKeterangan: ' + d.keterangan : ''}\n\nTerima kasih atas kerja samanya.\n\n- ${MADRASAH.nama}`
          : `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${d.siswaNama}*.\n\nKami informasikan bahwa ananda mendapat catatan pelanggaran: *${d.kategori}* (${d.poin} poin) pada ${d.tanggal}.${d.keterangan ? '\nKeterangan: ' + d.keterangan : ''}\n\nMohon kerja samanya untuk membimbing ananda. Terima kasih.\n\n- ${MADRASAH.nama}`;
        const tombolWa = siswa && siswa.noWaOrtu ? `<button class="btn" style="padding:2px 8px;font-size:11px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaSiswaKey('${siswaKey}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
          <div>
            <span style="font-weight:600;color:${d.jenis==='prestasi'?'#059669':'#dc2626'};">${d.jenis==='prestasi'?'🌟':'⚠️'} ${escapeHtml(d.kategori||'-')}</span>
            <span class="text-muted"> (${d.poin||0} poin) — ${escapeHtml(d.tanggal||'-')}</span>
            ${d.keterangan ? `<div class="text-muted" style="font-size:12px;">${escapeHtml(d.keterangan)}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">${tombolWa}${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusSikap('${d.key}','${siswaKey}')">🗑️</button>` : ''}</div>
        </div>`;
      }).join('');
    }
    function simpanSikap(siswaKey, siswaNama, kelas) {
      if (!sikapCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa mencatat sikap siswa di kelas yang Anda ampu!', true);
      if (isBusy('simpanSikap')) return toast('Sedang menyimpan...', false, 1500);
      const jenis = document.getElementById('sikapJenis').value;
      const kategori = document.getElementById('sikapKategori').value;
      const poin = parseInt(document.getElementById('sikapPoin').value) || 0;
      const keterangan = document.getElementById('sikapKeterangan').value.trim();
      const tanggal = document.getElementById('sikapTanggal').value || tglLokal();
      if (poin <= 0) return toast('Poin harus lebih dari 0!', true);
      const btnSimpanSikap = document.getElementById('btnSimpanSikap');
      setBusy('simpanSikap', btnSimpanSikap);
      const ref = db.ref('kedisiplinan_siswa').push();
      ref.set({ siswaKey, siswaNama, kelas, jenis, kategori, poin, keterangan, tanggal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() }, err => {
        clearBusy('simpanSikap', btnSimpanSikap);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan sikap tersimpan!'); addLog('catat_sikap', `${siswaNama} - ${kategori}`);
        const data = { key: ref.key, siswaKey, siswaNama, kelas, jenis, kategori, poin, keterangan, tanggal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() };
        allKedisiplinan.push(data);
        document.getElementById('sikapKeterangan').value = '';
        renderSikapRiwayat(siswaKey);
        renderSikapRekap();
      });
    }
    function hapusSikap(key, siswaKey) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa menghapus catatan sikap!', true);
      if (!doubleConfirm('Hapus catatan sikap ini?')) return;
      db.ref('kedisiplinan_siswa/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan dihapus.'); addLog('hapus_sikap', key);
        allKedisiplinan = allKedisiplinan.filter(d => d.key !== key);
        renderSikapRiwayat(siswaKey);
        renderSikapRekap();
      });
    }
    function renderSikapRekap() {
      const area = document.getElementById('sikapRekapArea'); if (!area) return;
      const kelasList = (isAdmin() || isKepsek()) ? KELAS_LIST : loaderScopeKelas();
      let rows = '';
      kelasList.forEach(kelas => {
        const siswaKelas = allSiswa.filter(s => s.kelas === kelas);
        const perSiswa = siswaKelas.map(s => {
          const items = allKedisiplinan.filter(d => d.siswaKey === s.key);
          const pel = items.filter(d => d.jenis === 'pelanggaran').reduce((sum,d) => sum+(d.poin||0), 0);
          const pres = items.filter(d => d.jenis === 'prestasi').reduce((sum,d) => sum+(d.poin||0), 0);
          return { nama: s.name, pel, pres, net: pres - pel };
        }).filter(x => x.pel > 0 || x.pres > 0).sort((a,b) => a.net - b.net);
        if (perSiswa.length === 0) return;
        rows += `<h4 style="font-size:13px;margin:12px 0 6px;">${escapeHtml(kelas)}</h4><div style="overflow-x:auto;"><table><thead><tr><th>Siswa</th><th>⚠️ Pelanggaran</th><th>🌟 Prestasi</th><th>Net Poin</th></tr></thead><tbody>${perSiswa.map(x => `<tr ${x.net<-20?'style="background:#fef2f2;"':''}><td>${escapeHtml(x.nama)}</td><td>${x.pel}</td><td>${x.pres}</td><td style="font-weight:700;color:${x.net>=0?'#059669':'#dc2626'};">${x.net>=0?'+':''}${x.net}</td></tr>`).join('')}</tbody></table></div>`;
      });
      area.innerHTML = rows || '<p class="text-muted" style="font-size:13px;">Belum ada catatan sikap tahun ajaran ini.</p>';
    }
    // ---- Kelola Kategori (Admin) ----
    function renderSikapKategoriAdmin() {
      const area = document.getElementById('sikapKategoriAdminArea'); if (!area) return;
      const buatBagian = (jenis, judul, warna) => {
        const list = allKedisiplinanKategori[jenis] || [];
        const pakaiDefault = list.length === 0;
        const daftarTampil = pakaiDefault ? (jenis === 'prestasi' ? KATEGORI_PRESTASI_DEFAULT : KATEGORI_PELANGGARAN_DEFAULT) : list;
        const rows = daftarTampil.map(k => `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
            <span style="flex:1;">${escapeHtml(k.label)}</span>
            ${pakaiDefault
              ? `<span class="text-muted" style="font-size:12px;">${k.poin} poin (bawaan)</span>`
              : `<input type="number" class="field" style="width:80px;padding:4px 6px;" value="${k.poin}" min="1" onchange="ubahPoinKategoriSikap('${jenis}','${k.key}',this.value)">
                 <button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusKategoriSikap('${jenis}','${k.key}')">🗑️</button>`}
          </div>`).join('');
        return `<div style="margin-bottom:16px;">
          <p style="font-weight:700;font-size:13px;color:${warna};margin-bottom:6px;">${judul}</p>
          ${pakaiDefault ? `<p style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:8px;padding:8px;margin-bottom:8px;">⚠️ Masih pakai daftar bawaan (belum diatur). Klik "Muat sebagai awal" untuk mulai mengeditnya, atau langsung tambah kategori baru di bawah.</p>` : ''}
          ${rows}
          ${pakaiDefault ? `<button class="btn btn-soft" style="margin-top:8px;font-size:12px;" onclick="muatKategoriBawaan('${jenis}')">📥 Muat sebagai awal (bisa diedit)</button>` : ''}
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
            <input id="sikapKategoriBaru_${jenis}" class="field" style="flex:1;min-width:160px;" placeholder="Nama kategori baru...">
            <input id="sikapPoinBaru_${jenis}" type="number" class="field" style="width:90px;" min="1" value="5" placeholder="Poin">
            <button class="btn btn-success" id="btnTambahKategoriSikap_${jenis}" style="font-size:12px;" onclick="tambahKategoriSikap('${jenis}')">➕ Tambah</button>
          </div>
        </div>`;
      };
      area.innerHTML = buatBagian('pelanggaran', '⚠️ Kategori Pelanggaran', '#dc2626') + buatBagian('prestasi', '🌟 Kategori Prestasi', '#059669');
    }
    function muatKategoriBawaan(jenis) {
      if (!isAdmin()) return;
      const defaultList = jenis === 'prestasi' ? KATEGORI_PRESTASI_DEFAULT : KATEGORI_PELANGGARAN_DEFAULT;
      const obj = {};
      defaultList.forEach(k => { const key = db.ref('kedisiplinan_kategori/'+jenis).push().key; obj[key] = { label: k.label, poin: k.poin }; });
      db.ref('kedisiplinan_kategori/'+jenis).update(obj, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Kategori bawaan dimuat, sekarang bisa diedit!');
        allKedisiplinanKategori[jenis] = Object.entries(obj).map(([k,v]) => ({ key: k, ...v }));
        renderSikapKategoriAdmin();
      });
    }
    function tambahKategoriSikap(jenis) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (isBusy('tambahKategoriSikap_'+jenis)) return toast('Sedang menyimpan...', false, 1500);
      const labelInput = document.getElementById('sikapKategoriBaru_'+jenis), poinInput = document.getElementById('sikapPoinBaru_'+jenis);
      const label = labelInput.value.trim(), poin = parseInt(poinInput.value) || 0;
      if (!label) return toast('Nama kategori tidak boleh kosong!', true);
      if (poin <= 0) return toast('Poin harus lebih dari 0!', true);
      const btnTambahKategori = document.getElementById('btnTambahKategoriSikap_'+jenis);
      setBusy('tambahKategoriSikap_'+jenis, btnTambahKategori);
      const ref = db.ref('kedisiplinan_kategori/'+jenis).push();
      ref.set({ label, poin }, err => {
        clearBusy('tambahKategoriSikap_'+jenis, btnTambahKategori);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Kategori ditambahkan!'); addLog('tambah_kategori_sikap', jenis+' - '+label);
        allKedisiplinanKategori[jenis].push({ key: ref.key, label, poin });
        labelInput.value = ''; poinInput.value = '5';
        renderSikapKategoriAdmin();
      });
    }
    function ubahPoinKategoriSikap(jenis, key, poinBaru) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      const poin = parseInt(poinBaru) || 0;
      if (poin <= 0) return toast('Poin harus lebih dari 0!', true);
      db.ref(`kedisiplinan_kategori/${jenis}/${key}`).update({ poin }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        const item = allKedisiplinanKategori[jenis].find(k => k.key === key); if (item) item.poin = poin;
        toast('✅ Poin diperbarui.');
      });
    }
    function hapusKategoriSikap(jenis, key) {
      if (!isAdmin()) return toast('Hanya Admin!', true);
      if (!doubleConfirm('Hapus kategori ini? Catatan sikap yang sudah tercatat dengan kategori ini tidak ikut terhapus.')) return;
      db.ref(`kedisiplinan_kategori/${jenis}/${key}`).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Kategori dihapus.'); addLog('hapus_kategori_sikap', jenis+' - '+key);
        allKedisiplinanKategori[jenis] = allKedisiplinanKategori[jenis].filter(k => k.key !== key);
        renderSikapKategoriAdmin();
      });
    }
    // ============================================================
    // BUKU PENGHUBUNG
    // ============================================================
    // ============================================================
    // INFO KE ORTU -- daftar siap-kirim (buku penghubung + pelanggaran) yang belum dikirim ke
    // WA orang tua. Semi-otomatis: bukan benar-benar auto-kirim (itu butuh Cloud Functions +
    // WA gateway berbayar, di luar cakupan static hosting gratis ini), tapi begitu Wali
    // Kelas/Admin membuka halaman ini, daftar yang perlu dikirim langsung tersaji tanpa perlu
    // dicari manual ke menu Sikap Siswa/Buku Penghubung satu per satu seperti sebelumnya.
    // Status "sudah dikirim" ditandai lewat field notifSent di record itu sendiri (mirip pola
    // status lunas di Infaq Mingguan) -- begitu diklik "Kirim WA", item itu hilang dari daftar.
    function infoOrtuKelasRelevan() {
      if (!currentUser) return [];
      return (isAdmin() || isKepsek()) ? KELAS_LIST : loaderScopeKelas();
    }
    function infoOrtuItemsBelumKirim() {
      const kelasRelevan = infoOrtuKelasRelevan();
      if (!kelasRelevan.length) return [];
      const buku = (allBukuPenghubung || []).filter(b => kelasRelevan.includes(b.kelas) && !b.notifSent).map(b => ({ ...b, _tipe: 'buku' }));
      const pelanggaran = (allKedisiplinan || []).filter(d => d.jenis === 'pelanggaran' && kelasRelevan.includes(d.kelas) && !d.notifSent).map(d => ({ ...d, _tipe: 'sikap' }));
      return [...buku, ...pelanggaran].sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
    }
    function updateInfoOrtuNotifDot() {
      const dot = document.getElementById('infoOrtuNotifDot');
      if (!dot) return;
      dot.classList.toggle('show', infoOrtuItemsBelumKirim().length > 0);
    }
    function infoOrtuPesanWa(item) {
      if (item._tipe === 'buku') {
        return `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${item.siswaNama}*.\n\nCatatan buku penghubung tanggal ${item.tanggal}:\n${item.catatan}\n\n- ${MADRASAH.nama}`;
      }
      return `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${item.siswaNama}*.\n\nKami informasikan bahwa ananda mendapat catatan pelanggaran: *${item.kategori}* (${item.poin} poin) pada ${item.tanggal}.${item.keterangan ? '\nKeterangan: ' + item.keterangan : ''}\n\nMohon kerja samanya untuk membimbing ananda. Terima kasih.\n\n- ${MADRASAH.nama}`;
    }
    function kirimWaInfoOrtu(tipe, key, siswaKey) {
      const arr = tipe === 'buku' ? allBukuPenghubung : allKedisiplinan;
      const item = arr.find(x => x.key === key);
      if (!item) return toast('Data tidak ditemukan!', true);
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) return toast('Data siswa tidak ditemukan!', true);
      kirimWA(siswa.noWaOrtu, infoOrtuPesanWa({ ...item, _tipe: tipe }));
      const node = tipe === 'buku' ? 'buku_penghubung' : 'kedisiplinan_siswa';
      db.ref(node + '/' + key).update({ notifSent: true, notifSentAt: new Date().toISOString(), notifSentBy: currentUser.name }, err => {
        if (err) return toast('Terkirim ke WA, tapi gagal menandai status di sistem: ' + err.message, true);
        item.notifSent = true;
        renderInfoOrtuPage();
        updateInfoOrtuNotifDot();
      });
    }
    function renderInfoOrtuPage() {
      const box = document.getElementById('infoOrtuListArea');
      if (!box) return;
      if (!sikapCanAccess()) { box.innerHTML = '<p style="color:#dc2626;">🔒 Hanya Admin, Kepsek, atau Wali Kelas.</p>'; return; }
      const items = infoOrtuItemsBelumKirim();
      if (items.length === 0) { box.innerHTML = '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;font-size:13px;color:#065f46;">🎉 Tidak ada catatan yang perlu dikirim. Semua sudah beres.</div>'; return; }
      box.innerHTML = items.map(item => {
        const siswa = allSiswa.find(s => s.key === item.siswaKey);
        const tombolWa = siswa && siswa.noWaOrtu
          ? `<button class="btn" style="padding:6px 12px;font-size:12px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaInfoOrtu('${item._tipe}','${item.key}','${item.siswaKey}')">📲 Kirim WA</button>`
          : `<span class="text-muted" style="font-size:11px;">Nomor WA belum diisi</span>`;
        const label = item._tipe === 'buku'
          ? `<span style="color:#2563eb;font-weight:600;">📖 Buku Penghubung</span>`
          : `<span style="color:#dc2626;font-weight:600;">⚠️ Pelanggaran: ${escapeHtml(item.kategori||'-')} (${item.poin||0} poin)</span>`;
        const isi = item._tipe === 'buku' ? item.catatan : item.keterangan;
        return `<div style="display:flex;justify-content:space-between;align-items:start;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div>
              <div class="text-muted" style="font-size:12px;margin-bottom:2px;">${escapeHtml(item.siswaNama||'-')} — Kelas ${escapeHtml(item.kelas||'-')} — ${escapeHtml(item.tanggal||'-')}</div>
              <div style="font-size:13px;">${label}</div>
              ${isi ? `<div class="text-strong" style="font-size:12px;margin-top:2px;">${escapeHtml(isi)}</div>` : ''}
            </div>
            <div style="flex-shrink:0;">${tombolWa}</div>
          </div>`;
      }).join('');
    }
    function setupBukuPenghubungPage() {
      if (!bukuCanAccess()) {
        document.getElementById('bukuFormArea').innerHTML = '<p style="color:#dc2626;">🔒 Anda belum ditugaskan ke kelas manapun.</p>';
        document.getElementById('bukuRiwayatArea').innerHTML = '';
      }
    }
    function loadBukuKelas() {
      const kelas = document.getElementById('bukuKelasFilter').value;
      const siswaSelect = document.getElementById('bukuSiswaFilter');
      document.getElementById('bukuFormArea').innerHTML = ''; document.getElementById('bukuRiwayatArea').innerHTML = '';
      if (!kelas) { siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>'; return; }
      const siswaKelas = allSiswa.filter(s => s.kelas === kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      siswaSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>' + siswaKelas.map(s => `<option value="${s.key}">${escapeHtml(s.name)}</option>`).join('');
    }
    function loadBukuSiswa() {
      const kelas = document.getElementById('bukuKelasFilter').value;
      const siswaKey = document.getElementById('bukuSiswaFilter').value;
      const formArea = document.getElementById('bukuFormArea');
      if (!siswaKey) { formArea.innerHTML = ''; document.getElementById('bukuRiwayatArea').innerHTML = ''; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      if (!siswa) return;
      formArea.innerHTML = `<div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:4px;">
        <p style="font-size:13px;font-weight:600;margin-bottom:8px;">✍️ Catatan Baru untuk ${escapeHtml(siswa.name)}</p>
        <div style="margin-bottom:10px;"><label class="label">Tanggal</label><input id="bukuTanggal" type="date" class="field" value="${tglLokal()}"></div>
        <div style="margin-bottom:10px;"><label class="label">Catatan</label><textarea id="bukuCatatan" class="field" rows="3" placeholder="Contoh: PR Matematika halaman 12, bawa alat gambar besok, ananda aktif bertanya hari ini..."></textarea></div>
        <button class="btn btn-success" id="btnSimpanBukuPenghubung" onclick="simpanBukuPenghubung('${siswa.key}','${escapeJs(siswa.name)}','${kelas}')">💾 Simpan Catatan</button>
      </div>`;
      renderBukuRiwayat(siswaKey);
    }
    function simpanBukuPenghubung(siswaKey, siswaNama, kelas) {
      if (!bukuCanAccess()) return toast('Tidak diizinkan!', true);
      if (!isAdmin() && !isKepsek() && !loaderScopeKelas().includes(kelas)) return toast('Anda hanya bisa menulis untuk siswa di kelas yang Anda ampu!', true);
      if (isBusy('simpanBukuPenghubung')) return toast('Sedang menyimpan...', false, 1500);
      const catatan = document.getElementById('bukuCatatan').value.trim();
      const tanggal = document.getElementById('bukuTanggal').value || tglLokal();
      if (!catatan) return toast('Catatan tidak boleh kosong!', true);
      const btnSimpanBuku = document.getElementById('btnSimpanBukuPenghubung');
      setBusy('simpanBukuPenghubung', btnSimpanBuku);
      const ref = db.ref('buku_penghubung').push();
      ref.set({ siswaKey, siswaNama, kelas, tanggal, catatan, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() }, err => {
        clearBusy('simpanBukuPenghubung', btnSimpanBuku);
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan tersimpan!'); addLog('catat_buku_penghubung', siswaNama);
        allBukuPenghubung.push({ key: ref.key, siswaKey, siswaNama, kelas, tanggal, catatan, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() });
        document.getElementById('bukuCatatan').value = '';
        renderBukuRiwayat(siswaKey);
      });
    }
    function renderBukuRiwayat(siswaKey) {
      const box = document.getElementById('bukuRiwayatArea'); if (!box) return;
      const items = allBukuPenghubung.filter(b => b.siswaKey === siswaKey).sort((a,b) => COLLATOR_ID.compare((b.tanggal||''), a.tanggal||''));
      if (items.length === 0) { box.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada catatan buku penghubung.</p>'; return; }
      const siswa = allSiswa.find(s => s.key === siswaKey);
      box.innerHTML = `<p style="font-size:13px;font-weight:600;margin-bottom:6px;">📜 Riwayat Catatan</p>` + items.map(b => {
        const pesan = `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${b.siswaNama}*.\n\nCatatan buku penghubung tanggal ${b.tanggal}:\n${b.catatan}\n\n- ${MADRASAH.nama}`;
        const tombolWa = siswa && siswa.noWaOrtu ? `<button class="btn" style="padding:2px 8px;font-size:11px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaSiswaKey('${siswaKey}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : '';
        return `<div style="display:flex;justify-content:space-between;align-items:start;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
            <div><div class="text-muted" style="font-size:12px;margin-bottom:2px;">${escapeHtml(b.tanggal||'-')} — ${escapeHtml(b.inputBy||'-')}</div><div>${escapeHtml(b.catatan||'-')}</div></div>
            <div style="display:flex;gap:6px;flex-shrink:0;">${tombolWa}${isAdmin() ? `<button class="btn btn-danger" style="padding:2px 8px;font-size:11px;" onclick="hapusBukuPenghubung('${b.key}','${siswaKey}')">🗑️</button>` : ''}</div>
          </div>`;
      }).join('');
    }
    function hapusBukuPenghubung(key, siswaKey) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa menghapus catatan!', true);
      if (!doubleConfirm('Hapus catatan buku penghubung ini?')) return;
      db.ref('buku_penghubung/'+key).remove(err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Catatan dihapus.'); addLog('hapus_buku_penghubung', key);
        allBukuPenghubung = allBukuPenghubung.filter(b => b.key !== key);
        renderBukuRiwayat(siswaKey);
      });
    }
