// ============================================================
// v4-tahfidz-pramuka-ekskul.js -- PANEL SISWA, TAHFIDZ, PRAMUKA, EKSKUL (lapisan V4; dipecah dari app.js, tahap 5)
// ============================================================
// Isi: pengambil siswa per kelas untuk panel V4 (v4FetchSiswaByKelas, cache bersama Activities & Tahfidz),
// Tahfidz (PIC per kelas, input per siswa), Pramuka (SKU/SKK, checklist, PIC), Ekskul (daftar, PIC pengganti,
// modal, absensi ekskul). Dimuat SESUDAH js/app.js (index.html). Tidak ada kode yang jalan saat dimuat.
// TETAP di app.js: v4LoadList(), pemuat/cache inti V4 (v4LoadCore, v4CoreFresh, v4InvalidateLoads), v4IsAdmin() dan
// pembantu peran lain, v4Date(), v4Audit(), v4Notify().
// ============================================================

    // -------- Activity / Amalan (jenis kegiatan TETAP, absensi siswa saja, PJ ditentukan Admin) --------
    let v4PanelSiswaCache = {};   // kelas -> siswa[] (dipakai bersama Activities & Tahfidz)
    let v4PanelSiswaGagal = {};   // kelas -> pesan error, diisi kalau query siswa gagal/timeout (dihapus saat coba lagi)
    const V4_PANEL_SISWA_TIMEOUT_MS = 10000;

    // FIX: query ini dulu TANPA callback error dan TANPA timeout. Kalau Firebase menolak query-nya
    // (permission denied / koneksi putus) atau tidak pernah membalas, cache tidak pernah terisi
    // dan callback tidak pernah jalan -> panel Kegiatan/Tahfidz/Pramuka nyangkut di
    // "⏳ Memuat daftar siswa..." SELAMANYA tanpa jalan keluar. Sekarang gagal/timeout dicatat di
    // v4PanelSiswaGagal, lalu `onError` (default: cb) dipanggil supaya panel dirender ulang dan
    // menampilkan pesan gagal + tombol "Coba lagi". Hasil yang datang terlambat (setelah timeout)
    // tetap diterima -- tampilan memperbaiki dirinya sendiri tanpa perlu klik apa pun.
    function v4FetchSiswaByKelas(kelas, cb, onError){
      if (v4PanelSiswaCache[kelas]) { cb(v4PanelSiswaCache[kelas]); return; }
      delete v4PanelSiswaGagal[kelas];
      let gagalDicatat = false, timer = null;
      const gagal = (pesan) => {
        if (gagalDicatat || v4PanelSiswaCache[kelas]) return; gagalDicatat = true;
        clearTimeout(timer);
        v4PanelSiswaGagal[kelas] = pesan || 'tidak diketahui';
        console.warn('[SI MAMBA] Gagal memuat siswa kelas', kelas, '-', pesan);
        try { (typeof onError === 'function' ? onError : cb)(); } catch (e) { console.warn('[SI MAMBA] render setelah gagal muat siswa:', e); }
      };
      timer = setTimeout(() => gagal('waktu tunggu habis'), V4_PANEL_SISWA_TIMEOUT_MS);
      // Query siswa LANGSUNG per-kelas dari Firebase (bukan dari allSiswa yang sudah dibatasi
      // ke kelas guru login) - supaya PJ kegiatan sekolah-wide (mis. Shalat Dhuha bersama)
      // tetap bisa melihat & mengisi siswa dari kelas manapun, bukan cuma kelas yang dia ampu.
      try {
        db.ref('siswa').orderByChild('kelas').equalTo(kelas).once('value', snap => {
          clearTimeout(timer);
          // Siswa NONAKTIF (aktif === false) tidak ikut: panel Dhuha/Dzuhur, Tahfidz, Pramuka, dst. memakai cache ini.
          const arr = []; snap.forEach(child => { const s = child.val(); if (s && s.aktif === false) return; s.key = child.key; arr.push(s); });
          v4PanelSiswaCache[kelas] = arr;
          delete v4PanelSiswaGagal[kelas];
          cb(arr);
        }, err => gagal(err && err.message ? err.message : String(err)));
      } catch (e) { gagal(e && e.message ? e.message : String(e)); }
    }
    // Isi panel saat daftar siswa belum ada di cache: "Memuat..." kalau masih jalan, atau pesan
    // gagal + tombol coba lagi kalau query-nya sudah gagal/timeout. `retryJs` = potongan JS untuk onclick.
    function v4PanelSiswaMemuatHtml(kelas, retryJs, style){
      const st = style || 'padding:10px;background:#f9fafb;border-radius:8px;';
      if (v4PanelSiswaGagal[kelas]) return `<div style="${st}">⚠️ Gagal memuat daftar siswa ${v4Safe(kelas)} (${v4Safe(v4PanelSiswaGagal[kelas])}). <button class="btn btn-soft" style="padding:4px 10px;font-size:12px;margin-left:6px;" onclick="${retryJs}">🔄 Coba lagi</button></div>`;
      return `<div style="${st}">⏳ Memuat daftar siswa ${v4Safe(kelas)}...</div>`;
    }
    // (Menu Amalan Yaumiyah dipindah ke js/amalan-kegiatan.js -- dimuat setelah app.js)

    // -------- Tahfidz (nama siswa per kelas, PJ per kelas ditentukan Admin) --------
    let v4TfKelasSel = '';
    function v4TfMyKelas(){
      if (v4IsAdmin() || v4IsHead()) return KELAS_LIST.slice();
      return KELAS_LIST.filter(k => { const pic = V4.tahfidzPic && V4.tahfidzPic[k]; return pic && currentUser && (pic.key===currentUser.key || pic.name===currentUser.name); });
    }
    function v4RenderTahfidzPicAdmin(){
      const box=document.getElementById('v4TahfidzPicAdmin'); if(!box) return;
      if (!v4IsAdmin()) { box.innerHTML=''; return; }
      const rows = KELAS_LIST.map(k => {
        const pic = (V4.tahfidzPic && V4.tahfidzPic[k]) || {};
        const options = (allGuru||[]).map(g => `<option value="${v4Safe(g.key||g.name)}" ${(g.key||g.name)===pic.key?'selected':''}>${v4Safe(g.name)}</option>`).join('');
        return `<tr><td style="font-weight:600;white-space:nowrap;">${k}</td><td><select class="field" style="font-size:12px;padding:5px;" onchange="v4SetTahfidzPic('${k}', this.value)"><option value="">-- Belum Ditentukan --</option>${options}</select></td></tr>`;
      }).join('');
      box.innerHTML = `<div class="v4-card"><h4>👤 Penanggung Jawab Tahfidz per Kelas</h4><div class="v4-muted" style="margin-bottom:8px;">Admin menentukan satu guru penanggung jawab tahfidz untuk tiap kelas.</div><div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Penanggung Jawab</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    function v4SetTahfidzPic(kelas, guruValue){
      if (!v4IsAdmin()) return toast('Hanya Admin!', true);
      if (!guruValue) { db.ref('tahfidz_pic_v4/'+kelas).remove().then(()=>{ toast('Penanggung jawab dihapus'); v4LoadCore(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); }); return; }
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return;
      db.ref('tahfidz_pic_v4/'+kelas).set({ kelas, key: guru.key||guru.name, name: guru.name, updatedAt: new Date().toISOString(), updatedBy: currentUser.name }).then(() => {
        toastTersimpan('Penanggung jawab tahfidz'); v4LoadCore();
      }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }
    function v4RenderTahfidz(){
      v4RenderTahfidzPicAdmin();
      const sel=document.getElementById('v4TahfidzKelas'); if(!sel) return;
      const myKelas = v4TfMyKelas();
      if (v4TfKelasSel && !myKelas.includes(v4TfKelasSel)) v4TfKelasSel = '';
      sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + myKelas.map(k => `<option value="${k}" ${v4TfKelasSel===k?'selected':''}>${k}</option>`).join('');
      v4RenderTahfidzKelasPanel();
      const list=document.getElementById('v4TahfidzList');
      if (list) {
        const hist = (V4.tahfidz||[]).filter(x => !v4TfKelasSel || x.kelas===v4TfKelasSel).slice().reverse().slice(0,30);
        list.innerHTML = hist.map(x=>`<div class="v4-task"><div class="v4-task-main"><div class="v4-task-title">📖 ${v4Safe(x.studentName)} · ${v4Safe(x.surah)} ${v4Safe(x.ayat)}</div><div class="v4-task-meta">${v4Safe(x.type)} · ${v4Safe(x.tanggal)} · ${v4Safe(x.note||'-')}</div></div><span class="v4-chip blue">${v4Safe(x.kelas||'')}</span></div>`).join('')||'<p class="v4-muted">Belum ada catatan tahfidz.</p>';
      }
      try { if (typeof thfGrafikRender === 'function') thfGrafikRender(); } catch (e) { console.error('[SI MAMBA] thfGrafikRender gagal:', e); }
      try { if (typeof petugasMonitorRender === 'function') petugasMonitorRender(); } catch (e) { console.warn('[SI MAMBA] petugasMonitorRender gagal:', e); }
    }
    function v4SetTahfidzKelas(kelas){
      v4TfKelasSel = kelas;
      if (!kelas) { v4RenderTahfidz(); return; }
      v4FetchSiswaByKelas(kelas, () => v4RenderTahfidz());
      v4RenderTahfidz();
    }
    function v4RenderTahfidzKelasPanel(){
      const box=document.getElementById('v4TahfidzKelasPanel'); if(!box) return;
      if (!v4TfKelasSel) { box.innerHTML = '<p class="v4-muted">Pilih kelas untuk mulai mencatat tahfidz siswa.</p>'; return; }
      if (!v4PanelSiswaCache[v4TfKelasSel]) { box.innerHTML = v4PanelSiswaMemuatHtml(v4TfKelasSel, `v4SetTahfidzKelas('${escapeJs(v4TfKelasSel)}')`); return; }
      const siswa = v4PanelSiswaCache[v4TfKelasSel].slice().sort((a,b)=>COLLATOR_ID.compare(a.name, b.name));
      if (siswa.length === 0) { box.innerHTML = '<p class="v4-muted">Belum ada siswa di kelas ini.</p>'; return; }
      const rows = siswa.map(s => {
        const last = (V4.tahfidz||[]).filter(x => x.studentId===s.key).slice().sort((a,b)=>COLLATOR_ID.compare((a.tanggal||''), b.tanggal||'')).pop();
        const lastInfo = last ? `<div class="v4-muted" style="margin-top:2px;font-weight:normal;">Terakhir: ${v4Safe(last.surah)} ${v4Safe(last.ayat)} · ${v4Safe(last.tanggal)}</div>` : '';
        return `<tr>
          <td style="font-weight:600;white-space:nowrap;vertical-align:top;">${v4Safe(s.name)}${lastInfo}</td>
          <td><input id="v4TfSurah_${s.key}" class="field" style="min-width:100px;" placeholder="Surah"></td>
          <td><input id="v4TfAyat_${s.key}" class="field" style="min-width:70px;" placeholder="Ayat"></td>
          <td><select id="v4TfType_${s.key}" class="field" style="min-width:100px;"><option value="setoran">Setoran</option><option value="murojaah">Murojaah</option></select></td>
          <td><input id="v4TfNote_${s.key}" class="field" style="min-width:110px;" placeholder="Catatan"></td>
          <td><button class="btn btn-success" id="btnV4Tahfidz_${s.key}" style="padding:6px 12px;font-size:11px;" onclick="v4SaveTahfidzRow('${s.key}')">💾</button></td>
        </tr>`;
      }).join('');
      box.innerHTML = `<div style="overflow-x:auto;"><table><thead><tr><th>Nama Siswa</th><th>Surah</th><th>Ayat</th><th>Jenis</th><th>Catatan</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    function v4SaveTahfidzRow(studentKey){
      if (!v4CanClass()) return toast('Tidak memiliki akses!', true);
      const pic = V4.tahfidzPic && V4.tahfidzPic[v4TfKelasSel];
      const isPic = pic && currentUser && (pic.key===currentUser.key || pic.name===currentUser.name);
      if (!v4IsAdmin() && !v4IsHead() && !isPic) return toast('Hanya penanggung jawab tahfidz kelas ini yang bisa mencatat!', true);
      if (isBusy('v4SaveTahfidzRow_'+studentKey)) return toast('Sedang menyimpan...', false, 1500);
      const student = (v4PanelSiswaCache[v4TfKelasSel]||[]).find(s => s.key===studentKey); if (!student) return;
      const surah = (document.getElementById('v4TfSurah_'+studentKey).value||'').trim();
      if (!surah) return toast('Surah wajib diisi!', true);
      const data = { studentId: studentKey, studentName: student.name, kelas: student.kelas, surah, ayat: (document.getElementById('v4TfAyat_'+studentKey).value||'').trim(), type: document.getElementById('v4TfType_'+studentKey).value, note: (document.getElementById('v4TfNote_'+studentKey).value||'').trim(), guru: currentUser.name, guruKey: currentUser.key || null, tanggal: v4Date(), tahunAjaran: currentTahunAjaran };
      const btnTahfidz = document.getElementById('btnV4Tahfidz_'+studentKey);
      try {
        setBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz);
        db.ref('tahfidz_v4').push().set(data).then(() => { clearBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz); toastTersimpan('Capaian tahfidz'); v4LoadCore(); }).catch(err => { clearBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz); console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
      } catch (e) {
        clearBusy('v4SaveTahfidzRow_'+studentKey, btnTahfidz);
        console.error('[SI MAMBA] Gagal simpan:', e);
        toast('❌ Gagal menyimpan: ' + (e && e.message || e), true);
      }
    }


    // -------- Ekstrakurikuler: Pramuka (SKU per kelas) --------
    // CATATAN: daftar poin SKU (Syarat Kecakapan Umum) di bawah adalah kerangka RINGKAS &
    // REPRESENTATIF mengikuti struktur umum SKU Pramuka SD/MI (Siaga utk Kelas 1-3, Penggalang
    // utk Kelas 4-6), dikelompokkan per bidang. Ini BUKAN salinan resmi kwartir/gudep tertentu --
    // kalau madrasah punya kisi-kisi SKU resmi sendiri yang berbeda, poin di bawah bisa
    // disesuaikan (tinggal ubah array PRAMUKA_SKU ini).
    const PRAMUKA_SKU = {
      siaga: { label: 'Siaga (Kelas 1-3)', groups: [
        { name: 'Keagamaan', items: [
          { id:'s_agama1', label:'Dapat berdoa menurut agamanya masing-masing' },
          { id:'s_agama2', label:'Rajin beribadah sesuai agama & kepercayaannya' },
        ]},
        { name: 'Kepribadian & Sosial', items: [
          { id:'s_pri1', label:'Dapat mengucapkan Dwisatya dan Dwidarma serta memahami artinya' },
          { id:'s_pri2', label:'Hafal dan dapat menyebutkan isi Pancasila' },
          { id:'s_pri3', label:'Terbiasa menjaga kebersihan diri & lingkungan' },
        ]},
        { name: 'Kesehatan & Jasmani', items: [
          { id:'s_jas1', label:'Dapat mengikuti baris-berbaris sederhana' },
          { id:'s_jas2', label:'Mengetahui & membiasakan kesehatan pribadi (mandi, gosok gigi, dll)' },
        ]},
        { name: 'Kecakapan Kepramukaan', items: [
          { id:'s_pram1', label:'Dapat menyanyikan lagu Indonesia Raya' },
          { id:'s_pram2', label:'Dapat menyebutkan tanda pengenal Pramuka Siaga' },
          { id:'s_pram3', label:'Dapat membuat salah satu hasil karya (kerajinan tangan)' },
        ]},
      ]},
      penggalang: { label: 'Penggalang (Kelas 4-6)', groups: [
        { name: 'Keagamaan', items: [
          { id:'p_agama1', label:'Dapat menjelaskan dan menjalankan ibadah sesuai agamanya' },
        ]},
        { name: 'Kepribadian & Sosial', items: [
          { id:'p_pri1', label:'Dapat mengucapkan Trisatya dan Dasadarma serta memahami artinya' },
          { id:'p_pri2', label:'Dapat menjelaskan lambang gerakan Pramuka (tunas kelapa)' },
          { id:'p_pri3', label:'Aktif bergotong royong di lingkungan sekolah/rumah' },
        ]},
        { name: 'Kesehatan & Jasmani', items: [
          { id:'p_jas1', label:'Dapat melakukan salah satu cabang olahraga' },
          { id:'p_jas2', label:'Dapat memberikan pertolongan pertama (P3K) sederhana' },
        ]},
        { name: 'Kecakapan Kepramukaan', items: [
          { id:'p_pram1', label:'Dapat baris-berbaris' },
          { id:'p_pram2', label:'Dapat menggunakan kompas untuk menentukan arah mata angin' },
          { id:'p_pram3', label:'Dapat membuat simpul & ikatan tali-temali dasar' },
          { id:'p_pram4', label:'Dapat menyanyikan lagu wajib nasional & salah satu lagu daerah' },
        ]},
      ]},
    };
    function pramukaTingkatForKelas(kelas) { const num = parseInt(String(kelas).replace(/\D/g,''),10) || 0; return num <= 3 ? 'siaga' : 'penggalang'; }
    function v4PramukaMyKelas() {
      if (v4IsAdmin() || v4IsHead()) return KELAS_LIST.slice();
      return KELAS_LIST.filter(k => { const p = V4.pramukaPic && V4.pramukaPic[k]; return p && currentUser && (p.key===currentUser.key || p.name===currentUser.name); });
    }
    function v4RenderPramukaPicAdmin(){
      const box=document.getElementById('v4PramukaPicAdmin'); if(!box) return;
      if (!v4IsAdmin()) { box.innerHTML=''; return; }
      const rows = KELAS_LIST.map(k => {
        const pic = (V4.pramukaPic && V4.pramukaPic[k]) || {};
        const options=(allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}" ${(g.key||g.name)===pic.key?'selected':''}>${v4Safe(g.name)}</option>`).join('');
        return `<tr><td style="font-weight:600;white-space:nowrap;">${k} <span class="v4-muted" style="font-weight:normal;">(${pramukaTingkatForKelas(k)==='siaga'?'Siaga':'Penggalang'})</span></td><td><select class="field" style="font-size:12px;padding:5px;" onchange="v4SetPramukaPic('${k}', this.value)"><option value="">-- Belum Ditentukan --</option>${options}</select></td></tr>`;
      }).join('');
      box.innerHTML = `<div class="v4-card"><h4>👤 Pembina Pramuka per Kelas</h4><div class="v4-muted" style="margin-bottom:8px;">Admin menentukan satu guru pembina Pramuka untuk tiap kelas (tidak harus wali kelas).</div><div style="overflow-x:auto;"><table><thead><tr><th>Kelas</th><th>Pembina</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    function v4SetPramukaPic(kelas, guruValue){
      if (!v4IsAdmin()) return toast('Hanya Admin!', true);
      if (!guruValue) { db.ref('pramuka_pic_v4/'+kelas).remove().then(() => { toast('Pembina Pramuka '+kelas+' dihapus'); delete V4.pramukaPic[kelas]; v4RenderPramuka(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); }); return; }
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return;
      const data = { kelas, key: guru.key||guru.name, name: guru.name, updatedAt: new Date().toISOString(), updatedBy: currentUser.name };
      db.ref('pramuka_pic_v4/'+kelas).set(data).then(() => { toastTersimpan('Pembina Pramuka '+kelas+': '+guru.name); addLog('tentukan_pembina_pramuka', kelas+' - '+guru.name); V4.pramukaPic[kelas]=data; v4RenderPramuka(); }).catch(err=>toast('Gagal: '+err.message,true));
    }
    let v4PramukaKelasSel = '';
    let v4PramukaOpenStudent = null;
    function v4PramukaProgress(studentKey, tingkat){
      const rec = (V4.pramukaSku||[]).find(x=>x.studentId===studentKey);
      const items = (rec && rec.items) || {};
      const totalItems = PRAMUKA_SKU[tingkat].groups.reduce((s,g)=>s+g.items.length,0);
      const done = Object.values(items).filter(Boolean).length;
      return { done, totalItems, pct: totalItems ? Math.round(done/totalItems*100) : 0, items };
    }
    function v4RenderPramuka(){
      v4RenderPramukaPicAdmin();
      const sel=document.getElementById('v4PramukaKelas'); if(!sel) return;
      const myKelas = v4PramukaMyKelas();
      if (v4PramukaKelasSel && !myKelas.includes(v4PramukaKelasSel)) v4PramukaKelasSel = '';
      sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + myKelas.map(k => `<option value="${k}" ${v4PramukaKelasSel===k?'selected':''}>${k} (${pramukaTingkatForKelas(k)==='siaga'?'Siaga':'Penggalang'})</option>`).join('');
      v4RenderPramukaKelasPanel();
    }
    function v4SetPramukaKelas(kelas){
      v4PramukaKelasSel = kelas; v4PramukaOpenStudent = null;
      if (!kelas) { v4RenderPramuka(); return; }
      v4FetchSiswaByKelas(kelas, () => v4RenderPramuka());
      v4RenderPramuka();
    }
    function v4RenderPramukaKelasPanel(){
      const box=document.getElementById('v4PramukaKelasPanel'); if(!box) return;
      if (!v4PramukaKelasSel) { box.innerHTML = '<p class="v4-muted">Pilih kelas untuk mulai menilai SKU Pramuka siswa.</p>'; return; }
      if (!v4PanelSiswaCache[v4PramukaKelasSel]) { box.innerHTML = v4PanelSiswaMemuatHtml(v4PramukaKelasSel, `v4SetPramukaKelas('${escapeJs(v4PramukaKelasSel)}')`); return; }
      const tingkat = pramukaTingkatForKelas(v4PramukaKelasSel);
      const siswa = v4PanelSiswaCache[v4PramukaKelasSel].slice().sort((a,b)=>COLLATOR_ID.compare(a.name, b.name));
      if (siswa.length === 0) { box.innerHTML = '<p class="v4-muted">Belum ada siswa di kelas ini.</p>'; return; }
      const rows = siswa.map(s => {
        const prog = v4PramukaProgress(s.key, tingkat);
        const isOpen = v4PramukaOpenStudent === s.key;
        let checklistHtml = '';
        if (isOpen) {
          checklistHtml = PRAMUKA_SKU[tingkat].groups.map(g => `
            <div style="margin-top:8px;">
              <div style="font-weight:700;font-size:12px;color:#0f3b2c;margin-bottom:4px;">${v4Safe(g.name)}</div>
              ${g.items.map(it => `<label style="display:flex;align-items:center;gap:6px;font-weight:normal;font-size:12px;padding:3px 0;"><input type="checkbox" id="v4Sku_${s.key}_${it.id}" ${prog.items[it.id]?'checked':''} style="width:auto;"> ${v4Safe(it.label)}</label>`).join('')}
            </div>`).join('') + `<button class="btn btn-success" style="margin-top:10px;padding:6px 14px;font-size:11px;" onclick="v4SavePramukaChecklist('${s.key}','${tingkat}')">💾 Simpan Checklist</button>`;
        }
        return `<div class="v4-task" style="flex-direction:column;align-items:stretch;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <div class="v4-task-main"><div class="v4-task-title">🏕️ ${v4Safe(s.name)}</div><div class="v4-task-meta">SKU ${prog.done}/${prog.totalItems} poin (${prog.pct}%)</div></div>
            <button class="btn btn-soft" style="padding:4px 10px;font-size:11px;" onclick="v4TogglePramukaStudent('${s.key}')">${isOpen?'✖️ Tutup':'📋 Isi SKU'}</button>
          </div>
          ${checklistHtml}
        </div>`;
      }).join('');
      box.innerHTML = `<p class="v4-muted" style="margin-bottom:8px;">Tingkat: <strong>${PRAMUKA_SKU[tingkat].label}</strong></p>${rows}`;
    }
    function v4TogglePramukaStudent(studentKey){ v4PramukaOpenStudent = (v4PramukaOpenStudent===studentKey) ? null : studentKey; v4RenderPramukaKelasPanel(); }
    function v4SavePramukaChecklist(studentKey, tingkat){
      const pic = V4.pramukaPic && V4.pramukaPic[v4PramukaKelasSel];
      const isPic = pic && currentUser && (pic.key===currentUser.key || pic.name===currentUser.name);
      if (!v4IsAdmin() && !v4IsHead() && !isPic) return toast('Hanya pembina Pramuka kelas ini yang bisa menilai!', true);
      const student = (v4PanelSiswaCache[v4PramukaKelasSel]||[]).find(s=>s.key===studentKey); if (!student) return;
      const items = {};
      PRAMUKA_SKU[tingkat].groups.forEach(g => g.items.forEach(it => { const el = document.getElementById('v4Sku_'+studentKey+'_'+it.id); items[it.id] = !!(el && el.checked); }));
      const data = { studentId: studentKey, studentName: student.name, kelas: student.kelas, tingkat, items, updatedBy: currentUser.name, guruKey: currentUser.key || null, updatedAt: new Date().toISOString() };
      try {
        db.ref('pramuka_sku_v4/'+studentKey).set(data).then(() => {
          toastTersimpan('Checklist SKU '+student.name);
          const idx = (V4.pramukaSku||[]).findIndex(x=>x.studentId===studentKey);
          if (idx>=0) V4.pramukaSku[idx] = {...data, key:studentKey}; else V4.pramukaSku.push({...data, key:studentKey});
          v4RenderPramukaKelasPanel();
        }).catch(err => toast('Gagal: '+err.message, true));
      } catch (e) {
        toast('Gagal: '+(e && e.message || e), true);
      }
    }

    // -------- Ekstrakurikuler --------
    // Setiap ekskul (Pramuka, Drumband, dll) punya 2 tingkat -- rendah (Kelas 1-3) & tinggi
    // (Kelas 4-6) -- masing-masing dengan deskripsi kegiatan sendiri & PIC (pembina) sendiri.
    // Pola PIC-per-tingkat ini sengaja dibuat mirip pramuka_pic_v4 (lihat v4SetPramukaPic di atas)
    // supaya konsisten, tapi generik untuk semua ekskul, bukan cuma Pramuka.
    function v4EkskulTierForKelas(kelas) { const num = parseInt(String(kelas).replace(/\D/g,''),10) || 0; return num <= 3 ? 'rendah' : 'tinggi'; }
    function v4EkskulDefaultTiers() { return { rendah: { label:'Kelas 1-3', desc:'', picKey:'', picName:'' }, tinggi: { label:'Kelas 4-6', desc:'', picKey:'', picName:'' } }; }
    // -------- PIC "tidak hadir hari ini": pengganti harian (generik) --------
    // Pola yang sama dipakai PIC Kegiatan (activity_substitute_v4, lihat v4ToggleAppointSubstitute
    // dkk di atas): Admin/Kepsek bisa menunjuk pengganti, guru lain boleh mencalonkan diri sendiri
    // (aman dari race condition lewat transaction, hanya kalau belum ada pengganti lain hari itu),
    // dan bisa dibatalkan oleh Admin/Kepsek atau si pengganti sendiri. PIC tetapnya TIDAK berubah,
    // cuma untuk HARI INI (v4Date()) saja yang digantikan. Ditulis generik (parameter node &
    // scopeKey) supaya PIC Ekskul per-tingkat tidak perlu menduplikasi logika ini dari nol.
    function v4SubToday(store, scopeKey){ return store && store[scopeKey+'_'+v4Date()]; }
    function v4IsPicWithSub(picKey, picName, store, scopeKey){
      if (!currentUser) return false;
      if ((picKey && picKey===currentUser.key) || (picName && picName===currentUser.name)) return true;
      const sub = v4SubToday(store, scopeKey);
      return !!(sub && (sub.guruKey===currentUser.key || (currentUser.name && sub.guruName===currentUser.name)));
    }
    function v4AppointSub(node, scopeKey, guruValue, onDone){
      if (!v4IsAdmin() && !v4IsHead()) return toast('Hanya Admin/Kepala Madrasah yang bisa menunjuk pengganti untuk guru lain! Kalau Anda sendiri ingin menggantikan, pakai opsi "Saya Gantikan Hari Ini".', true);
      const guru = (allGuru||[]).find(g => (g.key||g.name)===guruValue); if (!guru) return toast('Pilih guru pengganti dulu!', true);
      const tgl = v4Date();
      db.ref(node+'/'+scopeKey+'_'+tgl).set({ scopeKey, tanggal: tgl, guruKey: guru.key||guru.name, guruName: guru.name, appointedBy: currentUser.name, appointedAt: new Date().toISOString() }).then(() => { toastTersimpan(guru.name+' ditunjuk sebagai pengganti hari ini'); onDone && onDone(); }).catch(err => toast('Gagal: '+err.message, true));
    }
    function v4VolunteerSub(node, scopeKey, onDone){
      const tgl = v4Date();
      db.ref(node+'/'+scopeKey+'_'+tgl).transaction(cur => { if (cur) return; return { scopeKey, tanggal: tgl, guruKey: currentUser.key||currentUser.name, guruName: currentUser.name, appointedBy: currentUser.name, appointedAt: new Date().toISOString(), volunteer: true }; }).then(result => { if (!result.committed) return toast('Sudah ada guru lain yang lebih dulu menjadi pengganti hari ini.', true); toastTersimpan('Anda tercatat sebagai pengganti hari ini'); onDone && onDone(); }).catch(err => toast('Gagal: '+(err.message||err), true));
    }
    function v4RemoveSub(node, scopeKey, store, onDone){
      const tgl = v4Date();
      const sub = v4SubToday(store, scopeKey);
      const sayaPengganti = sub && (sub.guruKey===currentUser?.key || sub.guruName===currentUser?.name);
      if (!v4IsAdmin() && !v4IsHead() && !sayaPengganti) return toast('Hanya Admin/Kepala Madrasah atau guru yang bersangkutan yang bisa membatalkan!', true);
      db.ref(node+'/'+scopeKey+'_'+tgl).remove().then(() => { toast('Penunjukan pengganti dibatalkan'); onDone && onDone(); }).catch(err => toast('❌ Gagal: '+(err.message||err), true));
    }
    let v4EkskulSubFormOpenFor = null;
    function v4EkskulScopeKey(ekskulKey, tierKey){ return ekskulKey+'_'+tierKey; }
    function v4ToggleEkskulSubForm(ekskulKey, tierKey){ const k=v4EkskulScopeKey(ekskulKey,tierKey); v4EkskulSubFormOpenFor = (v4EkskulSubFormOpenFor===k)?null:k; v4RenderEkskul(); }
    function v4AppointEkskulSub(ekskulKey, tierKey){ const scopeKey=v4EkskulScopeKey(ekskulKey,tierKey); const sel=document.getElementById('v4EkskulSubPick_'+scopeKey); v4AppointSub('ekskul_pic_substitute_v4', scopeKey, sel?sel.value:'', ()=>{ V4.ekskulSubstitutes[scopeKey+'_'+v4Date()]={}; v4EkskulSubFormOpenFor=null; v4LoadCore(); }); }
    function v4VolunteerEkskulSub(ekskulKey, tierKey){ const ekskul=(V4.ekskuls||[]).find(x=>x.key===ekskulKey); if (ekskul && v4IsEkskulPic(ekskul, tierKey==='rendah'?'Kelas 1':'Kelas 4')) return toast('Anda sudah PIC tingkat ini.', true); v4VolunteerSub('ekskul_pic_substitute_v4', v4EkskulScopeKey(ekskulKey,tierKey), ()=>v4LoadCore()); }
    function v4RemoveEkskulSub(ekskulKey, tierKey){ v4RemoveSub('ekskul_pic_substitute_v4', v4EkskulScopeKey(ekskulKey,tierKey), V4.ekskulSubstitutes, ()=>v4LoadCore()); }
    // PIC ekskul untuk tingkat yang sesuai kelas siswa (atau Admin/Kepsek, yang selalu boleh),
    // TERMASUK pengganti hari ini kalau PIC tetapnya berhalangan (lihat blok pengganti di atas).
    function v4IsEkskulPic(ekskul, kelas) {
      if (v4IsAdmin() || v4IsHead()) return true;
      if (!ekskul || !ekskul.tiers) return false;
      const tierKey = v4EkskulTierForKelas(kelas), tier = ekskul.tiers[tierKey];
      if (!tier) return false;
      return v4IsPicWithSub(tier.picKey, tier.picName, V4.ekskulSubstitutes, v4EkskulScopeKey(ekskul.key, tierKey));
    }
    let v4EkskulEditKey = null;
    function v4RenderEkskul(){
      const box=document.getElementById('v4EkskulConfig'); if(!box)return;
      box.innerHTML=V4.ekskuls.length?V4.ekskuls.map(x=>{
        const t = x.tiers || v4EkskulDefaultTiers();
        const tierHtml = ['rendah','tinggi'].map(k => {
          const scopeKey = v4EkskulScopeKey(x.key, k);
          const sub = v4SubToday(V4.ekskulSubstitutes, scopeKey);
          const formOpen = v4EkskulSubFormOpenFor === scopeKey;
          const sayaPengganti = sub && (sub.guruKey===currentUser?.key || sub.guruName===currentUser?.name);
          let subControl = '';
          if (sub && sub.guruName) {
            subControl = `<div class="v4-chip orange" style="margin-top:4px;">🔁 Pengganti hari ini: ${v4Safe(sub.guruName)} ${(v4IsAdmin()||v4IsHead()||sayaPengganti)?`<span style="cursor:pointer;font-weight:700;" onclick="v4RemoveEkskulSub('${x.key}','${k}')"> ✕</span>`:''}</div>`;
          } else if (v4IsAdmin() || v4IsHead()) {
            subControl = formOpen
              ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;"><select id="v4EkskulSubPick_${scopeKey}" class="field" style="flex:1;min-width:140px;"><option value="">-- Pilih guru pengganti --</option>${(allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}">${v4Safe(g.name)}</option>`).join('')}</select><button class="btn btn-warning" style="padding:3px 10px;font-size:11px;" onclick="v4AppointEkskulSub('${x.key}','${k}')">Tunjuk</button><button class="btn btn-soft" style="padding:3px 10px;font-size:11px;" onclick="v4ToggleEkskulSubForm('${x.key}','${k}')">Batal</button></div>`
              : `<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-top:4px;" onclick="v4ToggleEkskulSubForm('${x.key}','${k}')">PIC tidak hadir? Tunjuk pengganti</button>`;
          } else if (!v4IsEkskulPic(x, k==='rendah'?'Kelas 1':'Kelas 4')) {
            subControl = `<button class="btn btn-soft" style="padding:2px 8px;font-size:11px;margin-top:4px;" onclick="v4VolunteerEkskulSub('${x.key}','${k}')">PIC tidak hadir? Saya gantikan hari ini</button>`;
          }
          return `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #e5e7eb;"><div style="font-weight:600;font-size:12px;">${v4Safe(t[k].label||(k==='rendah'?'Kelas 1-3':'Kelas 4-6'))}</div><div class="v4-muted" style="font-size:12px;">PIC: ${v4Safe(t[k].picName||'-- Belum ditentukan --')}</div>${t[k].desc?`<div class="v4-muted" style="font-size:12px;margin-top:2px;">${v4Safe(t[k].desc)}</div>`:''}${subControl}</div>`;
        }).join('');
        return `<div class="v4-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;"><h4>🎯 ${v4Safe(x.name)}</h4>${v4IsAdmin()?`<button class="btn btn-soft" style="padding:3px 10px;font-size:11px;white-space:nowrap;" onclick="v4EditEkskul('${x.key}')">✏️ Edit</button>`:''}</div><span class="v4-chip ${x.honorEnabled?'orange':''}" style="margin-top:4px;">${x.honorEnabled?'💰 Honor aktif':'Honor opsional'}</span>${tierHtml}</div>`;
      }).join(''):'<div class="v4-card"><h4>Belum ada ekskul</h4><div class="v4-muted">Admin dapat menambahkan ekstrakurikuler.</div></div>';
      const s=document.getElementById('v4EkskulSelect'); if(s)s.innerHTML=V4.ekskuls.map(x=>`<option value="${v4Safe(x.key)}">${v4Safe(x.name)}</option>`).join('');
      const st=document.getElementById('v4EkskulStudent'); if(st)st.innerHTML=(allSiswa||[]).map(x=>`<option value="${v4Safe(x.key)}">${v4Safe(x.name)} — ${v4Safe(x.kelas)}</option>`).join('');
      const list=document.getElementById('v4EkskulList'); if(list)list.innerHTML=(V4.ekskuls.length?'<p class="v4-muted">Gunakan form di atas untuk mencatat kehadiran.</p>':'');
    }
    function v4AddEkskul(){ if(!v4CanAdmin())return toast('Hanya Admin!',true); v4EkskulEditKey=null; v4OpenEkskulModal(null); }
    function v4EditEkskul(key){ if(!v4CanAdmin())return toast('Hanya Admin!',true); v4EkskulEditKey=key; v4OpenEkskulModal((V4.ekskuls||[]).find(x=>x.key===key)); }
    function v4OpenEkskulModal(ekskul){
      const t = (ekskul && ekskul.tiers) || v4EkskulDefaultTiers();
      document.getElementById('ekskulModalTitle').textContent = ekskul ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler';
      document.getElementById('ekskulName').value = (ekskul && ekskul.name) || '';
      document.getElementById('ekskulHonor').checked = !!(ekskul && ekskul.honorEnabled);
      const picOptions = '<option value="">-- Belum ditentukan --</option>' + (allGuru||[]).map(g=>`<option value="${v4Safe(g.key||g.name)}">${v4Safe(g.name)}</option>`).join('');
      document.getElementById('ekskulRendahDesc').value = t.rendah.desc || '';
      document.getElementById('ekskulTinggiDesc').value = t.tinggi.desc || '';
      const selR = document.getElementById('ekskulRendahPic'); selR.innerHTML = picOptions; selR.value = t.rendah.picKey || '';
      const selT = document.getElementById('ekskulTinggiPic'); selT.innerHTML = picOptions; selT.value = t.tinggi.picKey || '';
      document.getElementById('ekskulModal').classList.add('show');
    }
    function closeEkskulModal(){ document.getElementById('ekskulModal').classList.remove('show'); }
    function v4SaveEkskulModal(){
      if (!v4CanAdmin()) return toast('Hanya Admin!', true);
      const name = document.getElementById('ekskulName').value.trim();
      if (!name) return toast('Nama ekskul wajib diisi!', true);
      if (!isReallyOnline()) return toast('📡 Sedang offline. Simpan ekskul butuh koneksi internet, coba lagi saat online.', true);
      if (isBusy('v4SaveEkskulModal')) return toast('⏳ Sedang menyimpan, mohon tunggu...', false, 1500);
      const honorEnabled = document.getElementById('ekskulHonor').checked;
      const mkTier = (label, descId, picId) => { const picKey = document.getElementById(picId).value; const guru = (allGuru||[]).find(g=>(g.key||g.name)===picKey); return { label, desc: document.getElementById(descId).value.trim(), picKey: picKey||'', picName: guru?guru.name:'' }; };
      const tiers = { rendah: mkTier('Kelas 1-3', 'ekskulRendahDesc', 'ekskulRendahPic'), tinggi: mkTier('Kelas 4-6', 'ekskulTinggiDesc', 'ekskulTinggiPic') };
      // FIX: tombol Simpan dikunci selama menyimpan. Dulu ketukan ganda pada "Tambah Ekskul" membuat ekskul tercatat dobel (push() = key baru tiap kali).
      const lepas = kunciSimpanModal('v4SaveEkskulModal', 'ekskulModal', 'v4SaveEkskulModal');
      if (v4EkskulEditKey) {
        db.ref('extracurriculars_v4/'+v4EkskulEditKey).update({ name, honorEnabled, tiers }).then(()=>{ toastTersimpan(); closeEkskulModal(); v4LoadCore(); }).catch(err=>toast('Gagal: '+err.message, true)).finally(lepas);
      } else {
        db.ref('extracurriculars_v4').push().set({ name, honorEnabled, active:true, tiers, createdAt:new Date().toISOString() }).then(()=>{ toastTersimpan(); closeEkskulModal(); v4LoadCore(); }).catch(err => { console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); }).finally(lepas);
      }
    }
    function v4SaveEkskulAttendance(){
      const ex=V4.ekskuls.find(x=>x.key===document.getElementById('v4EkskulSelect').value),st=(allSiswa||[]).find(x=>x.key===document.getElementById('v4EkskulStudent').value);
      if(!ex||!st)return toast('Pilih ekskul dan siswa!',true);
      if(!v4IsEkskulPic(ex, st.kelas)) return toast('Hanya PIC ekskul tingkat ini (atau Admin/Kepsek) yang bisa mencatat!', true);
      if (isBusy('v4SaveEkskulAttendance')) return toast('Sedang menyimpan...', false, 1500);
      const btnSaveEkskulAtt = document.getElementById('btnSaveEkskulAttendance');
      setBusy('v4SaveEkskulAttendance', btnSaveEkskulAtt);
      const tglSesi = v4Date(); // dihitung sekali supaya record & key honor tidak beda hari kalau kebetulan lewat tengah malam
      const attRef = db.ref('extracurricular_attendance_v4').push();
      const attRec = {ekskulId:ex.key,ekskulName:ex.name,studentId:st.key,studentName:st.name,kelas:st.kelas,status:document.getElementById('v4EkskulStatus').value,tanggal:tglSesi,recordedBy:currentUser.name,tahunAjaran:currentTahunAjaran};
      attRef.set(attRec).then(()=>{
        clearBusy('v4SaveEkskulAttendance', btnSaveEkskulAtt);
        toastTersimpan();
        // FIX: state lokal tidak ikut diperbarui -- V4.ekskulAttendance cuma diisi ulang oleh
        // v4LoadCore(), jadi ringkasan Ekskul di Preview Raport (v4HitungEkskulSiswa) baru memuat
        // absensi yang baru dicatat setelah reload halaman/data. Sekarang record baru langsung
        // dimasukkan (key dari push() yang sama, jadi tidak dobel kalau nanti dimuat ulang).
        try {
          if (!Array.isArray(V4.ekskulAttendance)) V4.ekskulAttendance = [];
          if (!V4.ekskulAttendance.some(r => r.key === attRef.key)) V4.ekskulAttendance.push(Object.assign({ key: attRef.key }, attRec));
          v4RenderReportPreview();
        } catch (e) { console.warn('[SI MAMBA] Gagal memperbarui state lokal absensi ekskul:', e); }
        // Kredit honor otomatis utk siapa pun yang benar mencatat sesi ini hari ini (PIC tetap
        // ATAU pengganti hari itu, sudah dipastikan lolos v4IsEkskulPic di atas) -- supaya PIC/
        // pengganti tidak perlu lagi mengisi Jurnal Mengajar terpisah demi dapat honor Ekstra.
        // Key deterministik (bukan push()) per ekskul+tingkat+tanggal, sengaja BUKAN per siswa,
        // supaya mencatat banyak siswa dalam 1 sesi yang sama tidak melipatgandakan honor.
        if (ex.honorEnabled) {
          const tierKey = v4EkskulTierForKelas(st.kelas), scopeKey = v4EkskulScopeKey(ex.key, tierKey);
          const tierLabel = (ex.tiers && ex.tiers[tierKey] && ex.tiers[tierKey].label) || (tierKey==='rendah'?'Kelas 1-3':'Kelas 4-6');
          const honorKey = scopeKey+'_'+tglSesi;
          const honorRec = { ekskulId: ex.key, ekskulName: ex.name, tierKey, tierLabel, tanggal: tglSesi, guru: currentUser.name, guruKey: currentUser.key||currentUser.name, honor: getEkstraRate(ex.name), tahunAjaran: currentTahunAjaran, recordedAt: new Date().toISOString() };
          db.ref('ekskul_pic_honor_v4/'+honorKey).set(honorRec).then(() => {
            // FIX: sama seperti di atas -- allEkskulPicHonor (sumber halaman Honor, Slip Honor &
            // Laporan Honor) sebelumnya baru berisi honor sesi ini setelah reload data. Key-nya
            // deterministik, jadi cukup upsert per key (bukan push) supaya tidak dobel.
            try {
              const rec = Object.assign({ key: honorKey }, honorRec);
              const idx = allEkskulPicHonor.findIndex(x => x.key === honorKey);
              if (idx >= 0) allEkskulPicHonor[idx] = rec; else allEkskulPicHonor.push(rec);
            } catch (e) { console.warn('[SI MAMBA] Gagal memperbarui state lokal honor PIC ekskul:', e); }
          }).catch(err => console.error('[SI MAMBA] Gagal simpan honor PIC ekskul:', err));
        }
      }).catch(err => { clearBusy('v4SaveEkskulAttendance', btnSaveEkskulAtt); console.error('[SI MAMBA] Gagal simpan:', err); toast('❌ Gagal menyimpan: ' + (err && err.message || err), true); });
    }

