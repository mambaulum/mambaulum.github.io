// ============================================================
// infaq.js -- INFAQ / IURAN MINGGUAN MADRASAH (dipecah dari app.js)
// ============================================================
// Isi: petugas pencatat per kelas, input lunas per minggu, rekap & tagihan bulanan,
// nominal iuran & nominal khusus siswa, daftar belum lunas, TTD bendahara, titik notifikasi.
// Dimuat SESUDAH js/app.js (dan js/portal-ortu.js), SEBELUM skrip lain (index.html). Satu-satunya
// kode yang jalan saat dimuat: window._iqMode = ... (tanpa ketergantungan).
// TETAP di app.js (dipakai guru/menu/portal juga, jadi tidak boleh ikut hilang kalau berkas ini
// gagal dimuat): infaqMyKelasList(), infaqCanAccess(), iuranAngka(), iuranNominalStandar(),
// iuranNominalSiswa(), iuranRp(), iuranGratis().
// ============================================================

    // ============================================================
    // INFAQ MADRASAH (per siswa, mingguan) — Admin kelola semua kelas;
    // Wali Kelas hanya jadi petugas pencatat: input & lihat rekap kelasnya sendiri.
    // ============================================================
    // INFAQ MADRASAH (per siswa, mingguan) — Admin kelola semua kelas & MENENTUKAN sendiri
    // siapa petugas pencatat per kelas (bukan otomatis wali kelas -- karena tidak semua wali
    // kelas kebagian pegang infaq). Petugas yang ditunjuk bisa guru siapa saja, dan satu guru
    // bisa ditunjuk untuk lebih dari satu kelas.
    // ============================================================
    // Badge notifikasi "belum lunas" di menu Infaq Mingguan -- menyala kalau ada siswa yang
    // relevan (kelas yang ditugaskan ke user ini, atau semua kelas untuk Admin/Kepsek) belum
    // tercatat lunas untuk minggu berjalan. Dipanggil ulang setiap kali data direfresh (lihat
    // pemanggilnya di renderAllCore), jadi otomatis update tanpa perlu reload halaman.
    function updateInfaqNotifDot() {
      const dot = document.getElementById('infaqNotifDot');
      if (!dot) return;
      if (!currentUser || (!isAdmin() && !isKepsek() && !infaqCanAccess())) { dot.classList.remove('show'); return; }
      const kelasRelevan = isAdmin() || isKepsek() ? KELAS_LIST : infaqMyKelasList();
      const mingguIni = isoMingguKey();
      const sudahLunasKey = new Set(
        allInfaqSiswa.filter(it => it.minggu === mingguIni).map(it => it.siswaKey)
      );
      const adaBelumLunas = allSiswa.some(s => kelasRelevan.includes(s.kelas) && !iuranGratis(s) && !sudahLunasKey.has(s.key));
      dot.classList.toggle('show', adaBelumLunas);
    }
    function infaqPetugasNama(kelas) { const p = allInfaqPetugas && allInfaqPetugas[kelas]; return p ? p.name : null; }
    function renderInfaqPetugasAdmin() {
      const box = document.getElementById('infaqPetugasArea'); if (!box) return;
      if (!isAdmin()) { box.innerHTML = ''; return; }
      const rows = KELAS_LIST.map(k => {
        const p = (allInfaqPetugas && allInfaqPetugas[k]) || {};
        const options = (allGuru||[]).map(g => `<option value="${escapeHtml(g.key||g.name)}" ${(g.key||g.name)===p.key?'selected':''}>${escapeHtml(g.name)}</option>`).join('');
        return `<tr><td style="font-weight:600;white-space:nowrap;">${escapeHtml(k)}</td><td><select class="field" style="font-size:12px;padding:5px;" onchange="simpanInfaqPetugas('${k}', this.value)"><option value="">-- Belum Ditentukan --</option>${options}</select></td></tr>`;
      }).join('');
      box.innerHTML = `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin-bottom:14px;">
        <h4 style="font-weight:700;font-size:14px;margin-bottom:4px;color:#1e40af;">👤 Petugas Pencatat Infaq per Kelas</h4>
        <p style="font-size:12px;color:#3b5f8a;margin-bottom:10px;">Admin menentukan sendiri siapa petugas pencatat infaq tiap kelas — tidak harus wali kelas.</p>
        <div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Petugas</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    }
    function simpanInfaqPetugas(kelas, guruValue) {
      if (!isAdmin()) return toast('Hanya Admin yang bisa menentukan petugas!', true);
      if (!guruValue) {
        db.ref('infaq_petugas_v4/'+kelas).remove().then(() => { toast('Petugas infaq '+kelas+' dihapus'); delete allInfaqPetugas[kelas]; renderInfaqPetugasAdmin(); setupInfaqPage(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
        return;
      }
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return;
      const data = { kelas, key: guru.key||guru.name, name: guru.name, updatedBy: currentUser.name, updatedAt: new Date().toISOString() };
      db.ref('infaq_petugas_v4/'+kelas).set(data).then(() => {
        toast('✅ Petugas infaq '+kelas+' ditentukan: '+guru.name);
        addLog('tentukan_petugas_infaq', kelas+' - '+guru.name);
        allInfaqPetugas[kelas] = data;
        renderInfaqPetugasAdmin();
        setupInfaqPage();
      }).catch(err => toast('Gagal: '+err.message, true));
    }
    // ============================================================
    // IURAN MINGGUAN (dulu "Infaq" mingguan nominal-bebas per siswa -> sempat diubah jadi
    // iuran TETAP BULANAN -> sekarang dikembalikan ke periode MINGGUAN lagi tapi tetap nominal
    // TETAP + status Lunas/Belum (bukan nominal bebas seperti Infaq yang paling awal). Klik
    // centang = langsung tersimpan (tidak ada tombol "Simpan" batch lagi, lihat
    // toggleLunasSatuSiswa()), dan status yang sudah >24 jam terkunci untuk non-Admin (lihat
    // iuranTerkunci()). Struktur petugas pencatat per kelas (ditunjuk Admin) TIDAK berubah --
    // lihat infaqMyKelasList/infaqCanAccess/infaqPetugasNama/renderInfaqPetugasAdmin/
    // simpanInfaqPetugas di atas, masih dipakai apa adanya.
    // ============================================================
    // Nominal iuran mingguan bersifat TETAP (bukan bebas per-minggu) -- Admin bisa mengubahnya
    // sewaktu-waktu, tapi pembayaran yang SUDAH tercatat lunas tetap menyimpan nominal saat itu
    // dibayar (snapshot per record), jadi riwayat lama tidak ikut berubah kalau nominal
    // dinaikkan/diturunkan di kemudian hari.
    function renderIuranNominalArea() {
      const box = document.getElementById('infaqTargetArea'); if (!box) return;
      // FIX: nominal 0 dulu jatuh ke '' (input) dan ke pesan "belum diatur" (non-admin) karena
      // dicek pakai truthiness. Sekarang yang dianggap "belum diatur" hanya null/undefined.
      const nominalRaw = MADRASAH.iuranMingguanNominal;
      const sudahDiatur = nominalRaw !== null && nominalRaw !== undefined;
      const nominal = sudahDiatur ? nominalRaw : 0;
      if (isAdmin()) {
        box.innerHTML = `<div class="mp-iq-nominal mp-iq-nominal-admin">
          <span class="mp-iq-nominal-lbl">💵 Nominal standar / siswa / minggu</span>
          <div class="mp-iq-nominal-row">
            <input id="infaqTargetInput" type="number" class="field" min="0" step="500" value="${sudahDiatur ? nominal : ''}" placeholder="Belum diatur" inputmode="numeric" aria-label="Nominal infaq mingguan">
            ${typeof infaqRiwayatBerlakuSelectHtml === 'function' ? infaqRiwayatBerlakuSelectHtml() : ''}
            <button class="btn btn-success" onclick="simpanIuranNominal()">💾 Simpan</button>
          </div>
          <details class="mp-iq-help"><summary>ℹ️ Penjelasan</summary>Berlaku untuk semua siswa mulai minggu yang dipilih (minggu sebelumnya tetap memakai nominal lama di perkiraan tunggakan). Pembayaran yang sudah tercatat lunas tidak ikut berubah. Untuk siswa dengan nominal beda (mis. keringanan siswa bersaudara), atur lewat tombol ✏️ Edit di halaman Data Siswa — ditandai ✨ di daftar.</details>
        </div>`;
      } else {
        box.innerHTML = sudahDiatur
          ? `<div class="mp-iq-nominal">💵 <strong>Rp ${nominal.toLocaleString('id-ID')}</strong> / siswa / minggu <span class="mp-iq-nominal-note">· ✨ = nominal berbeda</span></div>`
          : `<div class="mp-iq-nominal mp-iq-nominal-warn">⚠️ Admin belum mengatur nominal infaq mingguan.</div>`;
      }
    }
    function simpanIuranNominal() {
      if (!isAdmin()) return toast('Hanya Admin yang bisa mengubah nominal!', true);
      const rawNominal = document.getElementById('infaqTargetInput').value.trim();
      const nominal = parseInt(rawNominal, 10);
      // Kosong ditolak (bukan diam-diam jadi 0) supaya "belum diatur" dan "0" tidak tercampur.
      if (rawNominal === '' || isNaN(nominal) || nominal < 0) return toast('Isi nominal yang valid (0 atau lebih)!', true);
      const nominalLamaRiwayat = MADRASAH.iuranMingguanNominal;
      tulisSettingsAdmin('school_settings', { iuranMingguanNominal: nominal, iuranNominalUpdatedBy: currentUser.name, iuranNominalUpdatedAt: new Date().toISOString() }, err => {
        if (err) return toast('Gagal: ' + err.message, true);
        toast('✅ Nominal infaq mingguan disimpan!');
        addLog('simpan_nominal_iuran', 'Rp' + nominal);
        MADRASAH.iuranMingguanNominal = nominal;
        try { if (typeof infaqRiwayatCatat === 'function') infaqRiwayatCatat(nominal, nominalLamaRiwayat); } catch (e) { console.warn('[SI MAMBA] infaqRiwayatCatat gagal:', e); }
        renderIuranNominalArea();
      });
    }
    // Batas kunci: petugas/Wali Kelas TIDAK BISA lagi mengubah status lunas yang sudah tercatat
    // lebih dari 24 jam (dihitung dari inputAt) -- supaya rekap tidak diarmak-armik lama setelah
    // dicatat. Admin dikecualikan, tetap bebas ubah kapan pun (lihat cekKuncI24Jam() dipakai di
    // render checkbox & toggleLunasSatuSiswa()).
    const KUNCI_IURAN_MS = 24 * 60 * 60 * 1000;
    function iuranTerkunci(record) {
      if (!record || !record.inputAt) return false;
      if (isAdmin()) return false;
      return (Date.now() - new Date(record.inputAt).getTime()) > KUNCI_IURAN_MS;
    }
    // Kepala Madrasah: lihat saja -- Tagihan Bulanan semua kelas + unduh PDF/Excel (tanpa bisa mencentang).
    function setupInfaqKepsek() {
      const kelasSelect = document.getElementById('infaqKelas'), intro = document.getElementById('infaqIntroText');
      const sw = document.getElementById('infaqModeSwitch'); if (sw) sw.style.display = 'none';
      window._iqMode = 'bulan';
      if (intro) intro.innerHTML = '👁️ Mode lihat saja untuk Kepala Madrasah. Pilih <strong>Semua Kelas</strong> atau satu kelas, lalu unduh PDF/Excel bila perlu. Pencatatan dilakukan petugas/Admin.';
      const prev = kelasSelect.value;
      kelasSelect.innerHTML = '<option value="ALL">Semua Kelas</option>' + KELAS_LIST.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
      kelasSelect.value = (prev && (prev === 'ALL' || KELAS_LIST.includes(prev))) ? prev : 'ALL';
      kelasSelect.disabled = false;
      populateBulanSelect();
      infaqTerapkanModeUI();
      renderIuranNominalArea();
      loadIuranInput();
    }
    function setupInfaqPage() {
      renderInfaqPetugasAdmin();
      const swTombol = document.getElementById('infaqModeSwitch'); if (swTombol) swTombol.style.display = '';
      if (!infaqCanAccess() && isKepsek()) { setupInfaqKepsek(); return; }
      if (!infaqCanAccess()) {
        const wrap = document.getElementById('infaqInputArea');
        if (wrap) wrap.innerHTML = isKepsek()
          ? '<p class="text-muted" style="font-size:13px;">👁️ Mode lihat saja untuk Kepala Madrasah. Pencatatan infaq dilakukan oleh petugas/Admin; rekap tunggakan dan unduhannya ada di bawah.</p>'
          : '<p style="color:#dc2626;">🔒 Anda belum ditunjuk sebagai petugas pencatat infaq kelas manapun — hubungi Admin.</p>';
        const belumSetorArea = document.getElementById('infaqBelumSetorArea'); if (belumSetorArea) belumSetorArea.innerHTML = '';
        const targetArea = document.getElementById('infaqTargetArea'); if (targetArea) targetArea.innerHTML = '';
        document.getElementById('infaqKelas').innerHTML = '<option value="">-</option>';
        document.getElementById('infaqKelas').disabled = true;
        renderIuranRekap();
        return;
      }
      const kelasSelect = document.getElementById('infaqKelas'), intro = document.getElementById('infaqIntroText');
      const mingguInput = document.getElementById('infaqRekapMinggu');
      populateMingguSelect();
      populateBulanSelect();
      infaqTerapkanModeUI();
      if (mingguInput && !mingguInput.value) mingguInput.value = isoMingguKey();
      if (isAdmin()) {
        intro.innerHTML = 'Pilih kelas untuk mencatat infaq, atau <strong>Semua Kelas</strong> untuk rekap gabungan.' +
          '<details class="mp-iq-help"><summary>ℹ️ Petunjuk</summary>Setiap siswa wajib bayar infaq tiap minggu dengan nominal yang sama. Klik centang langsung tersimpan. Untuk siswa dengan nominal berbeda, atur lewat Edit di halaman Data Siswa.</details>';
        kelasSelect.innerHTML = '<option value="ALL">Semua Kelas (rekap saja)</option>' + KELAS_LIST.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
        kelasSelect.disabled = false;
      } else {
        const myKelasList = infaqMyKelasList();
        intro.innerHTML = `Petugas infaq: <strong>${escapeHtml(myKelasList.join(', '))}</strong>. Centang saat siswa bayar — langsung tersimpan.` +
          `<details class="mp-iq-help"><summary>ℹ️ Petunjuk</summary>Status yang sudah tercatat lebih dari 24 jam tidak bisa diubah lagi — hubungi Admin untuk koreksi. Untuk mengubah nominal atau penugasan petugas, hubungi Admin juga.</details>`;
        kelasSelect.innerHTML = myKelasList.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
        kelasSelect.disabled = myKelasList.length <= 1;
      }
      renderIuranNominalArea();
      loadIuranInput();
    }
    function loadIuranInput() {
      const area = document.getElementById('infaqInputArea');
      const belumLunasArea = document.getElementById('infaqBelumSetorArea');
      const kelas = document.getElementById('infaqKelas').value;
      const mingguInput = document.getElementById('infaqRekapMinggu');
      const mingguKey = (mingguInput && mingguInput.value) || isoMingguKey();
      renderIuranNominalArea();
      const kepsekLihat = !infaqCanAccess() && isKepsek();   // Kepala Madrasah: hanya tampilan bulanan, tanpa mencatat
      if (kepsekLihat) window._iqMode = 'bulan';
      if ((!infaqCanAccess() && !kepsekLihat) || !kelas || !mingguKey) { area.innerHTML = ''; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return; }
      if (!isAdmin() && !kepsekLihat && !infaqMyKelasList().includes(kelas)) { area.innerHTML = '<p style="color:#dc2626;">🔒 Anda hanya bisa mencatat infaq kelas yang ditugaskan Admin ke Anda.</p>'; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return; }
      if (kelas === 'ALL') {
        if (window._iqMode === 'bulan') { renderInfaqBulanSemua(area, belumLunasArea); renderIuranRekap(); return; }
        area.innerHTML = '<p class="text-muted" style="font-size:13px;">Pilih satu kelas tertentu di atas untuk mencatat status lunas per siswa.</p>'; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return;
      }
      const siswaKelas = allSiswa.filter(s => s.kelas === kelas).sort((a,b) => COLLATOR_ID.compare(a.name, b.name));
      if (siswaKelas.length === 0) { area.innerHTML = '<p class="text-muted" style="font-size:13px;">Belum ada data siswa di kelas ini.</p>'; if(belumLunasArea) belumLunasArea.innerHTML=''; renderIuranRekap(); return; }
      if (window._iqMode === 'bulan') { renderInfaqBulan(kelas, area, belumLunasArea); renderIuranRekap(); return; }
      const existingMap = new Map(allInfaqSiswa.filter(it => it.kelas === kelas && it.minggu === mingguKey).map(it => [it.siswaKey, it]));
      let adaKunci = false;
      const barisSiswa = (s) => {
        const rec = existingMap.get(s.key);
        const lunas = !!rec;
        const terkunci = iuranTerkunci(rec);
        if (terkunci) adaKunci = true;
        // Nominal khusus (mis. keringanan siswa bersaudara) diatur per siswa lewat Edit Siswa di
        // halaman Data Siswa -- kalau diisi, dipakai menggantikan nominal standar KHUSUS untuk
        // siswa ini saja saat disimpan (lihat toggleLunasSatuSiswa), dan ditampilkan di sini
        // supaya petugas tidak bingung kenapa nominalnya beda dari siswa lain.
        const punyaNominalKhusus = iuranAngka(s.nominalIuranKhusus) !== null; // 0 (gratis) juga "khusus"
        const nominalDipakai = iuranNominalSiswa(s); // null = nominal standar belum diatur
        const gratis = nominalDipakai === 0;          // dibebaskan: tampil "Gratis", bukan "Belum Lunas"
        const status = lunas ? 'lunas' : (gratis ? 'gratis' : 'belum');
        // Badge ✨ hanya untuk nominal berbeda yang masih ditagih; siswa gratis cukup berlabel Gratis (tidak ganda dengan "Rp 0").
        const badgeKhusus = (punyaNominalKhusus && nominalDipakai !== 0) ? `<span class="mp-iq-khusus" title="Nominal khusus siswa ini">✨ ${iuranRp(nominalDipakai)}</span>` : '';
        const labelKunci = terkunci ? ` <span title="Sudah lebih dari 24 jam sejak dicatat, hanya Admin yang bisa mengubah">🔒</span>` : '';
        const nama = `<span class="mp-iq-name">${escapeHtml(s.name)}${badgeKhusus}</span>`;
        if (gratis && !lunas) return `<div class="mp-iq-row mp-iq-gratis-row">${nama}</div>`;
        return `<label class="mp-iq-row mp-iq-${status}${terkunci ? ' mp-iq-locked' : ''}">${nama}
          <span class="mp-iq-state">${lunas ? '✅ Lunas' : '⏳ Belum'}${labelKunci}
          <input type="checkbox" class="infaq-lunas-checkbox" data-siswa-key="${s.key}" data-siswa-nama="${escapeHtml(s.name)}" data-nominal="${nominalDipakai === null ? '' : nominalDipakai}" ${lunas?'checked':''} ${terkunci?'disabled':''} onchange="toggleLunasSatuSiswa(this,'${escapeJs(kelas)}','${mingguKey}')" aria-label="Lunas: ${escapeHtml(s.name)}"></span>
        </label>`;
      };
      const adaRec = (s) => existingMap.has(s.key);
      const gratisTanpaCatatan = siswaKelas.filter(s => iuranGratis(s) && !adaRec(s));
      const utama = siswaKelas.filter(s => !(iuranGratis(s) && !adaRec(s)));
      const rowsUtama = utama.map(barisSiswa).join('');
      const jmlLunas = siswaKelas.filter(adaRec).length;
      const jmlBelum = siswaKelas.filter(s => !adaRec(s) && !iuranGratis(s)).length;
      const gratisHtml = gratisTanpaCatatan.length
        ? `<details class="mp-iq-gratis"${window._iqGratisOpen ? ' open' : ''} ontoggle="window._iqGratisOpen=this.open"><summary>🆓 ${gratisTanpaCatatan.length} siswa gratis — tidak perlu dicatat</summary><div class="mp-iq-list">${gratisTanpaCatatan.map(barisSiswa).join('')}</div></details>`
        : '';
      const petugasInfo = isAdmin() ? (infaqPetugasNama(kelas) ? ` · Petugas: <strong>${escapeHtml(infaqPetugasNama(kelas))}</strong>` : ' · <span class="mp-iq-warn">⚠️ belum ada petugas ditunjuk</span>') : '';
      area.innerHTML = `<div class="mp-iq">
        <div class="mp-iq-head">
          <div class="mp-iq-title">${escapeHtml(mingguLabel(mingguKey))} · ${escapeHtml(kelas)}</div>
          <div class="mp-iq-sum"><span class="mp-iq-chip mp-iq-chip-ok">✅ ${jmlLunas} lunas</span><span class="mp-iq-chip mp-iq-chip-no">⏳ ${jmlBelum} belum</span>${gratisTanpaCatatan.length ? `<span class="mp-iq-chip mp-iq-chip-fr">🆓 ${gratisTanpaCatatan.length} gratis</span>` : ''}</div>
          ${petugasInfo ? `<div class="mp-iq-petugas">${petugasInfo.replace(/^ · /, '')}</div>` : ''}
        </div>
        <p class="mp-iq-tip">💡 Centang saat siswa bayar — langsung tersimpan.${adaKunci ? ' 🔒 = sudah lebih dari 24 jam, hanya Admin yang bisa mengubah.' : ''}</p>
        <div class="mp-iq-list">${rowsUtama || '<p class="text-muted" style="font-size:13px;margin:8px 0;">Semua siswa di kelas ini gratis, tidak ada yang perlu dicatat.</p>'}</div>
        ${gratisHtml}
      </div>`;
      renderIuranBelumLunas(kelas, siswaKelas, existingMap, mingguKey);
      renderIuranRekap();
    }
    // Klik centang = langsung tersimpan (tidak ada lagi tombol "Simpan" terpisah). Kunci
    // KUNCI_IURAN_MS (24 jam) dicek DUA kali: (1) di render checkbox di atas (disabled kalau
    // sudah lewat 24 jam), (2) di sini lagi sebagai jaga-jaga kalau ada yang lolos lewat cara
    // lain -- pola yang sama dengan guard-guard lain di file ini (mis. isBusy).
    function toggleLunasSatuSiswa(checkbox, kelas, mingguKey) {
      if (!infaqCanAccess()) { checkbox.checked = !checkbox.checked; return toast('Tidak diizinkan!', true); }
      if (!isAdmin() && !infaqMyKelasList().includes(kelas)) { checkbox.checked = !checkbox.checked; return toast('Hanya bisa mencatat infaq kelas yang ditugaskan Admin ke Anda!', true); }
      const siswaKey = checkbox.dataset.siswaKey, siswaNama = checkbox.dataset.siswaNama;
      // '' = nominal belum diatur -> null (field nominal tidak ikut tersimpan); '0' = gratis -> 0.
      const nominal = iuranAngka(checkbox.dataset.nominal);
      const checked = checkbox.checked;
      const existing = allInfaqSiswa.find(it => it.kelas === kelas && it.minggu === mingguKey && it.siswaKey === siswaKey);
      if (!checked && iuranTerkunci(existing)) { checkbox.checked = true; return toast('🔒 Sudah lebih dari 24 jam sejak dicatat, tidak bisa diubah lagi. Hubungi Admin.', true); }
      const path = `iuran_siswa/${mingguKey}_${siswaKey}`;
      checkbox.disabled = true;
      if (checked) {
        db.ref(path).set({ siswaKey, siswaNama, kelas, minggu: mingguKey, status: 'lunas', nominal, tahunAjaran: currentTahunAjaran, inputBy: currentUser.name, inputAt: new Date().toISOString() }, err => {
          if (err) { checkbox.checked = false; checkbox.disabled = false; return toast('Gagal: '+err.message, true); }
          toast(`✅ ${siswaNama} ditandai lunas.`); addLog('simpan_iuran', `${kelas} - ${mingguKey} - ${siswaNama} lunas`);
          reloadDataset('infaqSiswa', () => { loadIuranInput(); if (typeof updateInfaqNotifDot === 'function') updateInfaqNotifDot(); });
        });
      } else {
        db.ref(path).remove(err => {
          if (err) { checkbox.checked = true; checkbox.disabled = false; return toast('Gagal: '+err.message, true); }
          toast(`↩️ Status lunas ${siswaNama} dibatalkan.`); addLog('batal_iuran', `${kelas} - ${mingguKey} - ${siswaNama}`);
          reloadDataset('infaqSiswa', () => { loadIuranInput(); if (typeof updateInfaqNotifDot === 'function') updateInfaqNotifDot(); });
        });
      }
    }
    // ============================================================
    // TAGIHAN INFAQ PER BULAN + CEKLIS PER MINGGU
    // Satu bulan = beberapa minggu ISO yang hari Kamisnya jatuh di bulan itu (pola yang sama dengan
    // isoMingguKey), jadi tiap minggu hanya masuk ke SATU bulan. Data tetap di iuran_siswa/{minggu}_{siswa}
    // -- tidak ada struktur data baru; centang chip minggu memakai toggleLunasSatuSiswa() yang sama.
    // ============================================================
    window._iqMode = window._iqMode || 'bulan';
    const NAMA_BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const NAMA_BULAN_PENDEK_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
    function infaqMingguPendek(mingguKey) {
      const { senin, minggu } = mingguKeTanggal(mingguKey);
      return senin.getMonth() === minggu.getMonth()
        ? `${senin.getDate()}–${minggu.getDate()}`
        : `${senin.getDate()} ${NAMA_BULAN_PENDEK_ID[senin.getMonth()]}–${minggu.getDate()} ${NAMA_BULAN_PENDEK_ID[minggu.getMonth()]}`;
    }
    function infaqMingguBulan(y, m) { // m: 0-11 -> daftar kunci minggu "YYYY-Www" milik bulan itu
      const keys = [];
      const d = new Date(y, m, 1);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // mundur ke Senin
      for (let i = 0; i < 7; i++) {
        const kamis = new Date(d); kamis.setDate(d.getDate() + 3);
        if (kamis.getFullYear() === y && kamis.getMonth() === m) keys.push(isoMingguKey(d));
        d.setDate(d.getDate() + 7);
      }
      return keys;
    }
    function infaqBulanDipilih() { // -> { y, m, label, weeks }
      const sel = document.getElementById('infaqBulan');
      const now = new Date();
      let val = (sel && sel.value) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const p = val.split('-'); const y = parseInt(p[0], 10), m = parseInt(p[1], 10) - 1;
      return { y, m, label: `${NAMA_BULAN_ID[m]} ${y}`, weeks: infaqMingguBulan(y, m) };
    }
    function populateBulanSelect() {
      const sel = document.getElementById('infaqBulan'); if (!sel || sel.tagName !== 'SELECT') return;
      const prev = sel.value;
      const thn = parseInt(String(currentTahunAjaran).split('/')[0], 10) || new Date().getFullYear();
      const sekarang = new Date();
      const awal = new Date(thn, 6, 1), batasAkhir = new Date(thn + 1, 5, 1);
      let akhir = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1); // sampai 1 bulan ke depan
      if (akhir > batasAkhir) akhir = batasAkhir;
      if (akhir < awal) akhir = awal;
      const opts = [];
      for (let d = new Date(awal); d <= akhir; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      opts.reverse(); // terbaru di atas
      const kini = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, '0')}`;
      sel.innerHTML = opts.map(v => { const [yy, mm] = v.split('-'); return `<option value="${v}">${NAMA_BULAN_ID[parseInt(mm, 10) - 1]} ${yy}${v === kini ? ' (bulan ini)' : ''}</option>`; }).join('');
      sel.value = (prev && opts.includes(prev)) ? prev : (opts.includes(kini) ? kini : opts[0]);
    }
    function infaqTerapkanModeUI() {
      const bulan = window._iqMode === 'bulan';
      const wM = document.getElementById('infaqMingguWrap'), wB = document.getElementById('infaqBulanWrap');
      if (wM) wM.style.display = bulan ? 'none' : '';
      if (wB) wB.style.display = bulan ? '' : 'none';
      document.querySelectorAll('#infaqModeSwitch button').forEach(b => {
        const on = b.dataset.mode === window._iqMode;
        b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function setInfaqMode(mode) {
      window._iqMode = mode === 'minggu' ? 'minggu' : 'bulan';
      infaqTerapkanModeUI();
      loadIuranInput();
    }
    function infaqBukaKelas(kelas) { // dari kartu "Semua Kelas" -> buka kelas itu
      const sel = document.getElementById('infaqKelas'); if (!sel) return;
      sel.value = kelas; loadIuranInput();
      try { sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
    // Hitung tagihan per siswa untuk satu kelas pada satu bulan.
    // tagihan = yang sudah dibayar (nominal saat dibayar) + sisa minggu x nominal siswa saat ini.
    function infaqHitungBulan(kelas, weeks) {
      const wk = new Set(weeks), recMap = new Map();
      allInfaqSiswa.forEach(it => { if (it.kelas === kelas && wk.has(it.minggu)) recMap.set(it.minggu + '|' + it.siswaKey, it); });
      const siswa = allSiswa.filter(s => s.kelas === kelas).sort((a, b) => COLLATOR_ID.compare(a.name, b.name));
      const gratis = siswa.filter(s => iuranGratis(s) && !weeks.some(w => recMap.has(w + '|' + s.key)));
      const rows = siswa.filter(s => !gratis.includes(s)).map(s => {
        const nom = iuranNominalSiswa(s);
        let terbayar = 0; const belum = [], lunasMg = {};
        weeks.forEach(w => {
          const r = recMap.get(w + '|' + s.key);
          if (r) { lunasMg[w] = r; const rn = iuranAngka(r.nominal); terbayar += rn !== null ? rn : (nom || 0); }
          else belum.push(w);
        });
        const kurang = nom === null ? null : belum.length * nom;
        return { s, nom, terbayar, belum, lunasMg, kurang, tagihan: kurang === null ? null : terbayar + kurang, penuh: belum.length === 0 };
      });
      const tot = rows.reduce((a, r) => { a.tagihan += r.tagihan || 0; a.terbayar += r.terbayar; a.kurang += r.kurang || 0; if (r.penuh) a.penuh++; return a; }, { tagihan: 0, terbayar: 0, kurang: 0, penuh: 0 });
      return { rows, gratis, tot };
    }
    function infaqBarHtml(terbayar, tagihan) {
      const pct = tagihan > 0 ? Math.min(100, Math.round(terbayar / tagihan * 100)) : 0;
      return `<div class="mp-iqb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Terkumpul ${pct} persen"><span style="width:${pct}%"></span></div>`;
    }
    function infaqRp(n) { return 'Rp ' + (n || 0).toLocaleString('id-ID'); }
    function renderInfaqBulan(kelas, area, tagihArea) {
      const b = infaqBulanDipilih();
      if (b.weeks.length === 0) { area.innerHTML = '<p class="text-muted" style="font-size:13px;">Tidak ada minggu pada bulan ini.</p>'; if (tagihArea) tagihArea.innerHTML = ''; return; }
      const { rows, gratis, tot } = infaqHitungBulan(kelas, b.weeks);
      const mingguIni = isoMingguKey();
      const nominalBelum = iuranNominalStandar() === null;
      const bolehCatat = infaqCanAccess();   // Kepala Madrasah: lihat saja
      const kartu = rows.map(r => {
        const chips = b.weeks.map((w, i) => {
          const rec = r.lunasMg[w], lunas = !!rec, terkunci = iuranTerkunci(rec);
          const ro = !bolehCatat;
          return `<label class="mp-iqb-wk${lunas ? ' on' : ''}${w === mingguIni ? ' now' : ''}${terkunci || ro ? ' lock' : ''}">
            <input type="checkbox" class="infaq-lunas-checkbox" data-siswa-key="${r.s.key}" data-siswa-nama="${escapeHtml(r.s.name)}" data-nominal="${r.nom === null ? '' : r.nom}" ${lunas ? 'checked' : ''} ${terkunci || ro ? 'disabled' : ''} onchange="toggleLunasSatuSiswa(this,'${escapeJs(kelas)}','${w}')" aria-label="${escapeHtml(r.s.name)} minggu ${i + 1} (${infaqMingguPendek(w)}${/[A-Za-z]/.test(infaqMingguPendek(w)) ? '' : ' ' + NAMA_BULAN_PENDEK_ID[b.m]})">
            <span class="mp-iqb-wk-n">Mg ${i + 1}${w === mingguIni ? ' •' : ''}</span>
            <span class="mp-iqb-wk-d">${infaqMingguPendek(w)}</span>
            <span class="mp-iqb-wk-s">${lunas ? '✓' : (terkunci && !ro ? '🔒' : '○')}</span>
          </label>`;
        }).join('');
        const badgeKhusus = (iuranAngka(r.s.nominalIuranKhusus) !== null && r.nom !== 0) ? `<span class="mp-iq-khusus" title="Nominal khusus siswa ini">✨ ${iuranRp(r.nom)}</span>` : '';
        const status = r.penuh ? '<span class="mp-iqb-st ok">✅ Lunas</span>'
          : (r.kurang === null ? `<span class="mp-iqb-st no">⏳ ${r.belum.length} mg belum</span>` : `<span class="mp-iqb-st no">Kurang ${infaqRp(r.kurang)}</span>`);
        return `<div class="mp-iqb-card${r.penuh ? ' is-ok' : ''}">
          <div class="mp-iqb-top"><span class="mp-iqb-name">${escapeHtml(r.s.name)}${badgeKhusus}</span>${status}</div>
          <div class="mp-iqb-weeks" style="grid-template-columns:repeat(${b.weeks.length},minmax(0,1fr));">${chips}</div>
          <div class="mp-iqb-foot"><span>Tagihan <strong>${r.tagihan === null ? '—' : infaqRp(r.tagihan)}</strong></span><span>Terbayar <strong>${infaqRp(r.terbayar)}</strong></span></div>
        </div>`;
      }).join('');
      const gratisHtml = gratis.length
        ? `<details class="mp-iq-gratis"${window._iqGratisOpen ? ' open' : ''} ontoggle="window._iqGratisOpen=this.open"><summary>🆓 ${gratis.length} siswa gratis — tidak ditagih</summary><div class="mp-iq-list">${gratis.map(s => `<div class="mp-iq-row mp-iq-gratis-row"><span class="mp-iq-name">${escapeHtml(s.name)}</span></div>`).join('')}</div></details>` : '';
      area.innerHTML = `<div class="mp-iq mp-iqb">
        <div class="mp-iqb-head">
          <div class="mp-iq-title">Tagihan ${escapeHtml(b.label)} · ${escapeHtml(kelas)}</div>
          <div class="mp-iqb-sub">${b.weeks.length} minggu${nominalBelum ? ' · ⚠️ nominal standar belum diatur Admin' : ''}</div>
          <div class="mp-iqb-stats">
            <div><span>Tagihan</span><strong>${infaqRp(tot.tagihan)}</strong></div>
            <div class="ok"><span>Terkumpul</span><strong>${infaqRp(tot.terbayar)}</strong></div>
            <div class="no"><span>Kurang</span><strong>${infaqRp(tot.kurang)}</strong></div>
          </div>
          ${infaqBarHtml(tot.terbayar, tot.tagihan)}
          <div class="mp-iq-sum"><span class="mp-iq-chip mp-iq-chip-ok">✅ ${tot.penuh} lunas penuh</span><span class="mp-iq-chip mp-iq-chip-no">⏳ ${rows.length - tot.penuh} masih kurang</span></div>
          <div class="mp-iqb-actions"><button type="button" class="btn btn-soft" onclick="tagihanBulanExportPDF()">📄 Unduh PDF</button><button type="button" class="btn btn-soft" onclick="tagihanBulanExportExcel()">📊 Unduh Excel</button></div>
        </div>
        <p class="mp-iq-tip">${bolehCatat ? '💡 Ketuk kotak minggu saat siswa bayar — langsung tersimpan. Ketuk lagi untuk membatalkan. • = minggu ini. 🔒 = sudah lebih dari 24 jam, hanya Admin yang bisa mengubah.' : '👁️ Lihat saja. ✓ = lunas, ○ = belum. • = minggu ini.'}</p>
        ${rows.length ? `<div class="mp-iqb-list">${kartu}</div>` : '<p class="text-muted" style="font-size:13px;margin:8px 0;">Semua siswa di kelas ini gratis, tidak ada yang ditagih.</p>'}
        ${gratisHtml}
      </div>`;
      renderInfaqBulanTagih(kelas, rows, b, tagihArea);
    }
    function renderInfaqBulanTagih(kelas, rows, b, box) {
      if (!box) return;
      const perlu = rows.filter(r => !r.penuh);
      if (perlu.length === 0) { box.innerHTML = `<div class="mp-iq-allok">🎉 Semua siswa ${escapeHtml(kelas)} sudah lunas penuh untuk ${escapeHtml(b.label)}!</div>`; return; }
      const labelMg = (w) => 'Mg ' + (b.weeks.indexOf(w) + 1);
      box.innerHTML = `<details class="mp-iq-tagih"${window._iqTagihOpen ? ' open' : ''} ontoggle="window._iqTagihOpen=this.open">
        <summary>⏳ Perlu ditagih: <strong>${perlu.length} siswa</strong> <span class="mp-iq-tagih-hint">· ketuk untuk daftar &amp; kirim WA</span></summary>
        <div class="mp-iq-tagih-list">${perlu.map(r => {
          const s = r.s, mg = r.belum.map(labelMg).join(', ');
          const pesan = `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${s.name}* (${s.kelas}).\n\nKami informasikan bahwa infaq bulan *${b.label}* masih ada yang belum tercatat lunas: ${mg}${r.kurang ? ' (total ' + infaqRp(r.kurang) + ')' : ''}. Mohon kesediaannya untuk melunasi secepatnya. Terima kasih.\n\n- ${MADRASAH.nama}`;
          return `<div class="mp-iq-tagih-row">
            <span class="mp-iq-tagih-name">${escapeHtml(s.name)}<span class="mp-iqb-tagih-det">${escapeHtml(mg)}${r.kurang ? ' · ' + infaqRp(r.kurang) : ''}</span></span>
            ${s.noWaOrtu ? `<button class="btn mp-iq-wa" onclick="kirimWaSiswaKey('${s.key}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : `<span class="mp-iq-nowa" title="Nomor WA wali belum diisi di Data Siswa">no. WA kosong</span>`}
          </div>`;
        }).join('')}</div>
      </details>`;
    }
    // Admin: "Semua Kelas" pada mode bulan -> ringkasan tagihan per kelas (ketuk untuk membuka kelas).
    function renderInfaqBulanSemua(area, tagihArea) {
      const b = infaqBulanDipilih();
      if (tagihArea) tagihArea.innerHTML = '';
      let gT = 0, gB = 0, gK = 0;
      const kartu = KELAS_LIST.map(k => {
        const { rows, tot } = infaqHitungBulan(k, b.weeks);
        gT += tot.tagihan; gB += tot.terbayar; gK += tot.kurang;
        const petugas = infaqPetugasNama(k);
        return `<button type="button" class="mp-iqb-kelas" onclick="infaqBukaKelas('${escapeJs(k)}')">
          <span class="mp-iqb-kelas-top"><strong>${escapeHtml(k)}</strong><span class="mp-iqb-st ${rows.length && tot.penuh === rows.length ? 'ok' : 'no'}">${tot.penuh}/${rows.length} lunas penuh</span></span>
          ${infaqBarHtml(tot.terbayar, tot.tagihan)}
          <span class="mp-iqb-foot"><span>Terkumpul <strong>${infaqRp(tot.terbayar)}</strong></span><span>Kurang <strong>${infaqRp(tot.kurang)}</strong></span></span>
          ${petugas ? '' : '<span class="mp-iq-warn" style="font-size:11px;">⚠️ belum ada petugas</span>'}
        </button>`;
      }).join('');
      area.innerHTML = `<div class="mp-iq mp-iqb">
        <div class="mp-iqb-head">
          <div class="mp-iq-title">Tagihan ${escapeHtml(b.label)} · Semua Kelas</div>
          <div class="mp-iqb-stats">
            <div><span>Tagihan</span><strong>${infaqRp(gT)}</strong></div>
            <div class="ok"><span>Terkumpul</span><strong>${infaqRp(gB)}</strong></div>
            <div class="no"><span>Kurang</span><strong>${infaqRp(gK)}</strong></div>
          </div>
          ${infaqBarHtml(gB, gT)}
          <div class="mp-iqb-actions"><button type="button" class="btn btn-soft" onclick="tagihanBulanExportPDF()">📄 Unduh PDF</button><button type="button" class="btn btn-soft" onclick="tagihanBulanExportExcel()">📊 Unduh Excel</button></div>
        </div>
        <p class="mp-iq-tip">💡 Ketuk salah satu kelas untuk membuka ceklis mingguan siswa.</p>
        <div class="mp-iqb-kelas-grid">${kartu}</div>
      </div>`;
    }
    // Daftar siswa yang BELUM lunas minggu ini -- supaya petugas/admin langsung tahu siapa yang
    // perlu ditagih, bukan cuma melihat angka "X dari Y siswa".
    function renderIuranBelumLunas(kelas, siswaKelas, existingMap, mingguKey) {
      const box = document.getElementById('infaqBelumSetorArea'); if (!box) return;
      const belum = siswaKelas.filter(s => !existingMap.has(s.key) && !iuranGratis(s));
      if (belum.length === 0) { box.innerHTML = `<div class="mp-iq-allok">🎉 Semua siswa ${escapeHtml(kelas)} sudah lunas minggu ini!</div>`; return; }
      const namaMinggu = mingguLabel(mingguKey);
      box.innerHTML = `<details class="mp-iq-tagih"${window._iqTagihOpen ? ' open' : ''} ontoggle="window._iqTagihOpen=this.open">
        <summary>⏳ Perlu ditagih: <strong>${belum.length} siswa</strong> <span class="mp-iq-tagih-hint">· ketuk untuk daftar &amp; kirim WA</span></summary>
        <div class="mp-iq-tagih-list">${belum.map(s => {
          const pesan = `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${s.name}* (${s.kelas}).\n\nKami informasikan bahwa infaq mingguan untuk minggu *${namaMinggu}* belum tercatat lunas. Mohon kesediaannya untuk melunasi secepatnya. Terima kasih.\n\n- ${MADRASAH.nama}`;
          return `<div class="mp-iq-tagih-row">
            <span class="mp-iq-tagih-name">${escapeHtml(s.name)}</span>
            ${s.noWaOrtu ? `<button class="btn mp-iq-wa" onclick="kirimWaSiswaKey('${s.key}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : `<span class="mp-iq-nowa" title="Nomor WA wali belum diisi di Data Siswa">no. WA kosong</span>`}
          </div>`;
        }).join('')}</div>
      </details>`;
    }
    // Satu tampilan rekap saja (menggantikan renderInfaqRekap + renderInfaqRekapBulanan yang
    // dulu terpisah). renderInfaqRekapBulanan() masih ada di bawah sebagai alias kompatibilitas
    // nama fungsi lama saja -- isinya sudah sama-sama pakai periode mingguan sekarang.
    // Daftar siswa dengan nominal khusus (mis. keringanan siswa bersaudara) -- ditampilkan di
    // rekap supaya Admin/Kepsek bisa lihat sekilas siapa saja yang dikecualikan, tanpa perlu
    // buka satu-satu di Data Siswa. Ikut kelasList yang sedang dilihat (ALL = seluruh madrasah).
    function daftarNominalKhususHtml(kelasList) {
      const nominalStandar = iuranNominalStandar(); // null = belum diatur
      const siswaKhusus = allSiswa.filter(s => (kelasList.length === 0 || kelasList.includes(s.kelas)) && iuranAngka(s.nominalIuranKhusus) !== null).sort((a,b) => COLLATOR_ID.compare(a.kelas, b.kelas) || COLLATOR_ID.compare(a.name, b.name));
      if (siswaKhusus.length === 0) return '';
      const rows = siswaKhusus.map(s => {
        const k = iuranAngka(s.nominalIuranKhusus);
        const selisih = nominalStandar === null ? '<span title="Nominal standar belum diatur">—</span>' : (k < nominalStandar ? '−Rp '+(nominalStandar - k).toLocaleString('id-ID') : (k > nominalStandar ? '+Rp '+(k - nominalStandar).toLocaleString('id-ID') : '-'));
        return `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.kelas)}</td><td style="text-align:right;">${iuranRp(k)}</td><td class="text-muted" style="text-align:right;">${selisih}</td></tr>`;
      }).join('');
      return `<div style="margin-top:18px;">
        <p style="font-size:13px;font-weight:700;color:#6d28d9;margin-bottom:6px;">✨ Siswa dengan Nominal Infaq Khusus (${siswaKhusus.length})</p>
        ${siswaKhusus.some(s => iuranAngka(s.nominalIuranKhusus) === 0) ? '<p class="text-muted" style="font-size:11px;margin-bottom:6px;">Siswa bernominal Rp 0 (gratis) tidak dihitung dalam "siswa lunas", daftar belum lunas, dan pengingat WA.</p>' : ''}
        <div style="overflow-x:auto;"><table><thead><tr><th>Nama</th><th>Kelas</th><th>Nominal</th><th>Selisih dari standar</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    }
    // Daftar siswa belum lunas MINGGU YANG SEDANG DILIHAT DI REKAP, lengkap dengan tombol WA --
    // supaya Admin/Kepsek bisa langsung kirim pengingat dari tampilan Rekap (termasuk saat lihat
    // "Semua Kelas" sekaligus), tidak perlu masuk mode "isi per kelas" satu-satu dulu seperti
    // sebelumnya (WA di situ cuma muncul kalau sedang pilih 1 kelas spesifik untuk input).
    function daftarBelumLunasRekapHtml(kelasList, mingguKey) {
      const daftarKelas = kelasList.length ? kelasList : KELAS_LIST;
      const namaMinggu = mingguLabel(mingguKey);
      let rows = '';
      daftarKelas.forEach(kelas => {
        const siswaKelas = allSiswa.filter(s => s.kelas === kelas);
        const sudahLunasSet = new Set(allInfaqSiswa.filter(it => it.kelas === kelas && it.minggu === mingguKey).map(it => it.siswaKey));
        const belum = siswaKelas.filter(s => !sudahLunasSet.has(s.key) && !iuranGratis(s));
        belum.forEach(s => {
          const pesan = `Assalamu'alaikum, Bapak/Ibu wali dari ananda *${s.name}* (${s.kelas}).\n\nKami informasikan bahwa infaq mingguan untuk minggu *${namaMinggu}* belum tercatat lunas. Mohon kesediaannya untuk melunasi secepatnya. Terima kasih.\n\n- ${MADRASAH.nama}`;
          rows += `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
            <span>${escapeHtml(s.name)} <span class="text-muted" style="font-size:11px;">(${escapeHtml(s.kelas)})</span></span>
            ${s.noWaOrtu ? `<button class="btn" style="padding:2px 8px;font-size:11px;background:#25D366;color:white;flex-shrink:0;" onclick="kirimWaSiswaKey('${s.key}','${escapeJsMultiline(pesan)}')">📲 WA</button>` : `<span class="text-muted" style="font-size:10px;" title="Nomor WA wali belum diisi">📵</span>`}
          </div>`;
        });
      });
      if (!rows) return `<div style="margin-top:18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:12px;color:#065f46;">🎉 Semua siswa sudah lunas untuk minggu ${escapeHtml(namaMinggu)}!</div>`;
      return `<div style="margin-top:18px;">
        <p style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:6px;">📲 Kirim Pengingat WA — Belum Lunas Minggu ${escapeHtml(namaMinggu)}</p>
        <div style="max-height:280px;overflow-y:auto;">${rows}</div>
      </div>`;
    }
    function renderIuranRekap() {
      try { if (typeof tunggakanRender === 'function') tunggakanRender(); } catch (e) { console.error('[SI MAMBA] tunggakanRender gagal:', e); }
      const area = document.getElementById('infaqRekapArea');
      const areaBulananLama = document.getElementById('infaqRekapBulananArea'); // elemen lama (kalau masih ada di index.html) ikut diisi supaya tidak kosong menggantung
      const tombolRekap = '<div class="mp-iqb-actions" style="margin-bottom:10px;"><button type="button" class="btn btn-soft" onclick="rekapMingguExportPDF()">📄 Unduh PDF</button><button type="button" class="btn btn-soft" onclick="rekapMingguExportExcel()">📊 Unduh Excel</button></div>';
      const setHtml = (html, denganTombol) => { const h = denganTombol ? tombolRekap + html : html; if (area) area.innerHTML = h; if (areaBulananLama) areaBulananLama.innerHTML = h; };
      const kepsekSaja = !infaqCanAccess() && isKepsek();   // Kepala Madrasah: lihat + unduh, tanpa tombol WA
      if (!infaqCanAccess() && !kepsekSaja) { setHtml(''); return; }
      const mingguInput = document.getElementById('infaqRekapMinggu');
      const mingguKey = (mingguInput && mingguInput.value) || isoMingguKey();
      const nominal = iuranNominalStandar(); // null = belum diatur, 0 = gratis
      const nominalInfo = nominal !== null ? `<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Nominal infaq per siswa/minggu: <strong>Rp ${nominal.toLocaleString('id-ID')}</strong>${nominal === 0 ? ' (gratis)' : ''}</p>` : `<p style="font-size:12px;color:#92400e;margin-bottom:8px;">⚠️ Nominal infaq belum diatur Admin.</p>`;
      const kelasPilih = document.getElementById('infaqKelas').value;
      if ((isAdmin() || kepsekSaja) && kelasPilih === 'ALL') {
        let totalMadrasah = 0, totalLunasMadrasah = 0, totalSiswaMadrasah = 0;
        let rows = KELAS_LIST.map(k => {
          const items = allInfaqSiswa.filter(it => it.kelas === k && it.minggu === mingguKey);
          const total = items.reduce((s,it) => s + (it.nominal||0), 0);
          const wajibKeys = new Set(allSiswa.filter(s => s.kelas === k && !iuranGratis(s)).map(s => s.key));   // siswa gratis tidak dihitung
          const jumlahSiswaKelas = wajibKeys.size;
          const jumlahLunas = items.filter(it => wajibKeys.has(it.siswaKey)).length;
          totalMadrasah += total; totalLunasMadrasah += jumlahLunas; totalSiswaMadrasah += jumlahSiswaKelas;
          const kurang = jumlahSiswaKelas > 0 && jumlahLunas < jumlahSiswaKelas;
          return `<tr ${kurang?'style="background:#fffbeb;"':''}><td>${escapeHtml(k)}</td><td>${jumlahLunas} / ${jumlahSiswaKelas} siswa lunas</td><td style="text-align:right;">Rp ${total.toLocaleString('id-ID')}</td></tr>`;
        }).join('');
        setHtml(`${nominalInfo}<p class="text-muted" style="font-size:12px;margin-bottom:8px;">Rekap minggu: <strong>${escapeHtml(mingguLabel(mingguKey))}</strong> — Kepatuhan madrasah: <strong>${totalSiswaMadrasah>0?Math.round((totalLunasMadrasah/totalSiswaMadrasah)*100):0}%</strong></p><div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Status Lunas</th><th>Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th style="text-align:left;">TOTAL MADRASAH</th><th style="text-align:left;">${totalLunasMadrasah} / ${totalSiswaMadrasah} siswa lunas</th><th style="text-align:right;color:#059669;">Rp ${totalMadrasah.toLocaleString('id-ID')}</th></tr></tfoot></table></div>${daftarNominalKhususHtml([])}${kepsekSaja ? '' : daftarBelumLunasRekapHtml([], mingguKey)}${iuranTtdBendahara()}`, true);
        return;
      }
      const kelasList = (isAdmin() || kepsekSaja) ? (kelasPilih && kelasPilih!=='ALL' ? [kelasPilih] : []) : infaqMyKelasList();
      if (kelasList.length === 0) { setHtml(nominalInfo); return; }
      // Riwayat per minggu untuk kelas ini (beberapa minggu terakhir yang ada datanya), supaya
      // kelihatan siswa mana yang menunggak berminggu-minggu -- bukan cuma status minggu berjalan.
      let totalKeseluruhan = 0, totalLunasSemua = 0, totalSlotSemua = 0, rowsGabungan = '';
      kelasList.forEach(kelas => {
        const wajibKeys = new Set(allSiswa.filter(s => s.kelas === kelas && !iuranGratis(s)).map(s => s.key));   // siswa gratis tidak dihitung
        const jumlahSiswaKelas = wajibKeys.size;
        const byMinggu = {};
        allInfaqSiswa.filter(it => it.kelas === kelas).forEach(it => { if (!byMinggu[it.minggu]) byMinggu[it.minggu] = { total: 0, jumlah: 0 }; byMinggu[it.minggu].total += (it.nominal||0); if (wajibKeys.has(it.siswaKey)) byMinggu[it.minggu].jumlah += 1; });
        const mingguList = Object.keys(byMinggu).sort().reverse();
        if (mingguList.length === 0) { rowsGabungan += `<tr><td colspan="4" class="text-muted">Belum ada riwayat infaq untuk kelas ${escapeHtml(kelas)}.</td></tr>`; return; }
        mingguList.forEach(mg => {
          const kurang = byMinggu[mg].jumlah < jumlahSiswaKelas;
          totalKeseluruhan += byMinggu[mg].total; totalLunasSemua += byMinggu[mg].jumlah; totalSlotSemua += jumlahSiswaKelas;
          rowsGabungan += `<tr ${kurang?'style="background:#fffbeb;"':''}><td>${escapeHtml(kelas)}</td><td>${escapeHtml(mingguLabel(mg))}</td><td>${byMinggu[mg].jumlah} / ${jumlahSiswaKelas} siswa lunas</td><td style="text-align:right;">Rp ${byMinggu[mg].total.toLocaleString('id-ID')}</td></tr>`;
        });
      });
      setHtml(`${nominalInfo}<div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Minggu</th><th>Status Lunas</th><th>Total</th></tr></thead><tbody>${rowsGabungan}</tbody><tfoot><tr style="background:#f3f4f6;font-weight:700;"><th colspan="2" style="text-align:left;">TOTAL KESELURUHAN</th><th style="text-align:left;">${totalLunasSemua} / ${totalSlotSemua} siswa lunas</th><th style="text-align:right;color:#059669;">Rp ${totalKeseluruhan.toLocaleString('id-ID')}</th></tr></tfoot></table></div>${daftarNominalKhususHtml(kelasList)}${kepsekSaja ? '' : daftarBelumLunasRekapHtml(kelasList, mingguKey)}${iuranTtdBendahara()}`, true);
    }
    // Blok tanda tangan Bendahara -- menghubungkan data "Struktur Pengurus" (diisi Admin di
    // halaman Profil Sekolah) ke rekap keuangan iuran secara nyata, bukan sekadar tersimpan.
    function iuranTtdBendahara() {
      return MADRASAH.bendahara ? `<div style="margin-top:18px;display:flex;justify-content:flex-end;">
        <div style="text-align:center;font-size:12px;min-width:220px;">
          <p>Mengetahui,</p><p style="margin-bottom:56px;">Bendahara Madrasah</p>
          <p style="font-weight:700;text-decoration:underline;">${escapeHtml(MADRASAH.bendahara)}</p>
          ${MADRASAH.nip_bendahara ? `<p>NIP/NUPTK. ${escapeHtml(MADRASAH.nip_bendahara)}</p>` : ''}
        </div>
      </div>` : `<p class="text-muted" style="margin-top:14px;font-size:11px;">💡 Isi nama Bendahara di halaman Profil Sekolah supaya rekap ini otomatis punya blok tanda tangan.</p>`;
    }
    // Alias kompatibilitas: berjaga-jaga kalau index.html (yang tidak ikut diunggah di sesi ini)
    // masih punya atribut onchange/onclick statis yang memanggil nama fungsi LAMA sebelum modul
    // Infaq diubah jadi Iuran Mingguan -- supaya tidak tiba-tiba error "function is not defined"
    // kalau ternyata masih ada rujukan lama di HTML yang tidak saya lihat.
    function loadInfaqInput() { return loadIuranInput(); }
    function renderInfaqRekapBulanan() { return renderIuranRekap(); }

